// Visual representations of sim objects. Views never change game state; they mirror
// whatever the session (local sim or network snapshots) says and play effects for events.
import * as THREE from 'three';
import { ENEMIES } from './config.js';
import { TOWER_MODELS, makeEnemy, makeGrave, makeHologram, makeHumanoid, makeSentry, makeUnit, setEmissive, setOpacity } from './models.js';
import { path } from './sim/path.js';
import { heightAt } from './sim/map.js';
import { TOWERS, TRACKS } from './config.js';
import { lerpAngle } from './utils.js';
import { FLY_HEIGHT, ST_BURNING, ST_CHILLED, ST_DANCE, ST_FROZEN, ST_HACKED, ST_SLIMED, ST_STUNNED } from './sim/sim.js';

const tmp = new THREE.Vector3();
const tmpPt = {};

// ------------------------------------------------------------------ helpers

function labelTexture(text, color) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const g = c.getContext('2d');
  g.font = '900 52px "Arial Black", Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 10;
  g.strokeStyle = '#111';
  g.strokeText(text, 256, 50);
  g.fillStyle = color;
  g.fillText(text, 256, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeNameTag(text, colorHex) {
  const color = '#' + new THREE.Color(colorHex).offsetHSL(0, 0, 0.15).getHexString();
  const mat = new THREE.SpriteMaterial({ map: labelTexture(text, color), transparent: true, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.scale.set(8, 1.5, 1);
  s.renderOrder = 15;
  return s;
}

function disposeSprite(s) {
  s.material.map.dispose();
  s.material.dispose();
}

// ------------------------------------------------------------------ towers

const padGeo = new THREE.CylinderGeometry(1.9, 2.1, 0.4, 20);
const ringGeo = new THREE.CylinderGeometry(2.35, 2.45, 0.16, 24);
export const PAD_COLORS = [0x9e9e9e, 0x7cb342, 0x29b6f6, 0xab47bc, 0xffb300, 0xe53935, 0x212121]; // one per level (Lv 6 red, Lv 7 black)
const beamGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5); // grows from its origin along +Z
const tmpB = new THREE.Vector3();

export class TowerView {
  constructor(scene, t, ownerColor) {
    this.scene = scene;
    this.id = t.id;
    this.type = t.type;
    this.level = -1;
    this.shots = 0;
    this.yaw = t.yaw;
    this.recoil = 0;
    this.breath = Math.random() * 10;
    this.spinSpeed = 0;
    this.ang = null; // Aviator plane angle (smoothed)
    this.beam = null;
    this.holo = t.holo > 0; // a Hacker's hologram clone: see-through and glowing cyan
    this.group = new THREE.Group();
    this.group.position.set(t.x, heightAt(t.x, t.z), t.z);
    this.padMat = new THREE.MeshLambertMaterial({ color: PAD_COLORS[0] });
    this.pad = new THREE.Mesh(padGeo, this.padMat);
    this.pad.position.y = 0.2;
    this.pad.castShadow = this.pad.receiveShadow = true;
    this.ringMat = new THREE.MeshLambertMaterial({ color: ownerColor });
    const ring = new THREE.Mesh(ringGeo, this.ringMat);
    ring.position.y = 0.08;
    this.group.add(this.pad, ring);
    scene.add(this.group);
    this.sync(t, 0);
  }

  get x() {
    return this.group.position.x;
  }
  get z() {
    return this.group.position.z;
  }

  build(level) {
    if (this.model) {
      this.group.remove(this.model.root);
      if (this.model.plane) this.group.remove(this.model.plane);
      for (const m of this.model.mats) m.dispose();
    }
    this.level = level;
    this.trackShown = -1; // DJ Booth: track color the new model still needs
    this.model = TOWER_MODELS[this.type](level);
    this.model.root.position.y = 0.4;
    this.group.add(this.model.root);
    if (this.model.plane) this.group.add(this.model.plane);
    this.padMat.color.setHex(this.holo ? 0x00bcd4 : PAD_COLORS[level]);
    if (this.holo) {
      for (const m of this.model.mats) {
        m.userData.glow = 0x006064;
        m.emissive?.setHex(0x006064);
      }
      setOpacity(this.model, 0.5);
      this.padMat.transparent = true;
      this.padMat.opacity = 0.5;
    }
    this.group.traverse((o) => (o.userData.towerId = this.id));
  }

  sync(t, dt) {
    if (t.type !== this.type) {
      // Upgrade paths: a Pursuit that takes the Bottom path becomes another tower type.
      this.type = t.type;
      this.build(t.level);
    } else if (t.level !== this.level) this.build(t.level);
    this.yaw = lerpAngle(this.yaw, t.yaw, Math.min(1, dt * 15));
    const m = this.model;
    // A hologram flickers in its last few seconds.
    if (this.holo) m.root.visible = t.holo > 3 || Math.sin(performance.now() / 45) > -0.3;
    m.root.rotation.y = this.yaw;
    this.recoil = Math.max(0, this.recoil - dt * (m.swing ? 4 : 10)); // swings recover slower than gun kick
    if (m.static) {
      // Buildings (Farm, Patrol, Barracks, Zed) have no arms to animate.
    } else if (m.swing) {
      // Melee swing / grenade throw: the arm snaps forward-down, then eases back up.
      m.rightArm.rotation.x = m.pose.right + this.recoil * m.swing;
      m.leftArm.rotation.x = m.pose.left;
    } else if (!m.plane) {
      // With two guns, each shot kicks only the arm that fired.
      const dual = m.muzzles.length > 1;
      const leftFired = dual && this.shots % 2 === 0;
      const kick = this.recoil * (m.recoilScale ?? 1);
      m.rightArm.rotation.x = m.pose.right - (leftFired ? 0 : kick * 0.35);
      m.leftArm.rotation.x = m.pose.left - (dual && !leftFired ? 0 : kick * m.pose.leftRecoil);
    }
    this.breath += dt;
    m.body.position.y = (m.lift || 0) + Math.sin(this.breath * 2) * (m.bob ?? (m.lift ? 0.15 : 0.04));
    if (m.spin) {
      // Minigun barrels spin up while firing (or revving up, fx bit 8) and wind down after.
      if (t.fx & 8) this.spinSpeed = Math.min(30, this.spinSpeed + dt * 40);
      this.spinSpeed = Math.max(m.idleSpin ?? 0, this.spinSpeed - dt * 25); // Skull Centrifuge skulls never stop
      for (const b of m.spin) b.rotation.y += this.spinSpeed * dt;
    }
    if (m.twirl) {
      // Cowboy: the revolvers spin twice around the trigger finger after a cash shot.
      this.twirlT = Math.max(0, (this.twirlT || 0) - dt);
      const a = this.twirlT > 0 ? (1 - this.twirlT / this.twirlDur) * Math.PI * 4 : 0;
      for (const g of m.twirl) g.rotation.x = a;
    }
    if (m.trackMats && (t.track || 0) !== this.trackShown) {
      // DJ Booth: lights in the color of the track playing.
      this.trackShown = t.track || 0;
      const c = TRACKS[this.trackShown].color;
      for (const mat of m.trackMats) {
        mat.color.setHex(c);
        mat.emissive.setHex(c);
        mat.userData.glow = c;
      }
    }
    if (m.heli) this.hover(t, dt);
    else if (m.plane) this.fly(t, dt);
    if (t.fx || this.fx) this.syncFx(t.fx || 0, dt);
  }

  /** Cowboy cash shot: twirl the revolvers for `secs` seconds. */
  twirl(secs) {
    this.twirlDur = Math.max(0.3, secs);
    this.twirlT = this.twirlDur;
  }

  /** Versus debuffs: spinning stars while stunned (fx bit 2), a grey haze while smoked (bit 1). */
  syncFx(fx, dt) {
    if (!this.fx) {
      this.fx = new THREE.Group();
      this.fxStars = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const st = new THREE.Mesh(starGeo, starMat);
        st.position.set(Math.cos(a) * 1.3, 0, Math.sin(a) * 1.3);
        this.fxStars.add(st);
      }
      this.fxStars.position.y = 7.2;
      this.fxHaze = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const h = new THREE.Mesh(hazeGeo, hazeMat);
        h.position.set(Math.cos(a) * 1.6, 2 + (i % 2) * 1.6, Math.sin(a) * 1.6);
        h.scale.setScalar(1.4 + (i % 3) * 0.4);
        this.fxHaze.add(h);
      }
      this.fx.add(this.fxStars, this.fxHaze);
      this.group.add(this.fx);
    }
    this.fxStars.visible = !!(fx & 2);
    this.fxHaze.visible = !!(fx & 1);
    this.fxStars.rotation.y += dt * 5;
    this.fxHaze.rotation.y += dt * 0.6;
  }

  /** Aviator: the plane circles the tower at the sim's angle (smoothed for network play). */
  fly(t, dt) {
    const def = TOWERS[this.type];
    const lap = def.levels[t.level].lap ?? def.lap;
    const dir = t.dir || 1; // Ace Pilot can fly the other way round
    const target = t.ang ?? 0;
    if (this.ang == null) this.ang = target;
    this.ang += (dir * dt * Math.PI * 2) / lap;
    this.ang = lerpAngle(this.ang, target, Math.min(1, dt * 4));
    const p = this.model.plane;
    const R = def.orbit;
    p.position.set(Math.cos(this.ang) * R, this.model.flyHeight, Math.sin(this.ang) * R);
    p.rotation.y = Math.atan2(-Math.sin(this.ang), Math.cos(this.ang)) + (dir < 0 ? Math.PI : 0); // along the flight direction
    const { bank, prop } = p.userData;
    bank.rotation.z = 0.35 * dir; // lean into the turn
    bank.position.y = Math.sin(this.breath * 1.3) * 0.4;
    if (prop) prop.rotation.z += dt * 40;
  }

  /** Pursuit: the helicopter hovers wherever the sim says it is, tilting as it flies. */
  hover(t, dt) {
    const p = this.model.plane;
    const tx = (t.hx ?? this.x) - this.x;
    const tz = (t.hz ?? this.z) - this.z;
    if (!this.heliPos) this.heliPos = { x: tx, z: tz };
    const hp = this.heliPos;
    const k = Math.min(1, dt * 8);
    const vx = (tx - hp.x) * k;
    const vz = (tz - hp.z) * k;
    hp.x += vx;
    hp.z += vz;
    p.position.set(hp.x, this.model.flyHeight + Math.sin(this.breath * 1.6) * 0.3, hp.z);
    p.rotation.y = lerpAngle(p.rotation.y, t.hyaw ?? 0, Math.min(1, dt * 6));
    const { bank, prop, tail } = p.userData;
    // Nose dips while it's moving.
    const speed = dt > 0 ? Math.hypot(vx, vz) / dt : 0;
    bank.rotation.x = lerpAngle(bank.rotation.x, Math.min(0.3, speed * 0.025), Math.min(1, dt * 4));
    if (prop) prop.rotation.y += dt * 28;
    if (tail) tail.rotation.x += dt * 36;
  }

  /** Phaser: draw the beam to the locked enemy, thicker as it charges. */
  updateBeam(t, enemyViews) {
    const m = this.model;
    if (!m.beam) return;
    const ev = t.lock ? enemyViews.get(t.lock) : null;
    if (!ev) {
      if (this.beam) this.beam.visible = false;
      return;
    }
    if (!this.beam) {
      this.beamMat = new THREE.MeshBasicMaterial({ color: m.beam, transparent: true, opacity: 0.85, depthWrite: false });
      this.beam = new THREE.Mesh(beamGeo, this.beamMat);
      this.beam.renderOrder = 6;
      this.scene.add(this.beam);
    }
    this.beamMat.color.setHex(m.beam);
    const from = m.muzzles[0].getWorldPosition(tmpB);
    const to = ev.aimPoint(tmp);
    const w = (0.12 + 0.5 * (t.charge || 0)) * (0.85 + Math.random() * 0.3);
    this.beam.position.copy(from);
    this.beam.lookAt(to);
    this.beam.scale.set(w, w, from.distanceTo(to));
    this.beamMat.opacity = 0.6 + 0.35 * (t.charge || 0);
    this.beam.visible = true;
  }

  /**
   * Medic: a medi beam to every tower it shields (`targets`: TowerViews). Beams pulse brighter
   * during Ubercharge.
   */
  updateLinks(targets, uber) {
    const m = this.model;
    if (!m.medi) return;
    this.links ??= [];
    while (this.links.length < targets.length) {
      const mat = new THREE.MeshBasicMaterial({ color: m.medi, transparent: true, opacity: 0.55, depthWrite: false });
      const mesh = new THREE.Mesh(beamGeo, mat);
      mesh.renderOrder = 6;
      this.scene.add(mesh);
      this.links.push(mesh);
    }
    if (targets.length) {
      this.yaw = Math.atan2(targets[0].x - this.x, targets[0].z - this.z);
      m.root.rotation.y = this.yaw;
      m.root.updateMatrixWorld(true);
    }
    const from = m.muzzles[0].getWorldPosition(tmpB);
    this.links.forEach((mesh, i) => {
      const v = targets[i];
      mesh.visible = !!v;
      if (!v) return;
      tmp.set(v.x, v.group.position.y + 3, v.z);
      const w = (uber ? 0.4 : 0.18) * (0.85 + Math.random() * 0.3);
      mesh.position.copy(from);
      mesh.lookAt(tmp);
      mesh.scale.set(w, w, from.distanceTo(tmp));
      mesh.material.color.setHex(uber ? 0xff5252 : m.medi);
      mesh.material.opacity = uber ? 0.8 : 0.5;
    });
  }

  /** World position of the plane's bomb bay (Aviator), for bomb drop effects. */
  bayPosition(out) {
    return this.model.plane ? this.model.plane.userData.bay.getWorldPosition(out) : out.set(this.x, 5, this.z);
  }

  /** World position of a missile pod (alternating), falling back to the bay. */
  podPosition(i, out) {
    const pods = this.model.plane?.userData.missiles;
    return pods?.length ? pods[i % pods.length].getWorldPosition(out) : this.bayPosition(out);
  }

  /**
   * Turns toward (x, z), kicks the gun (or throws), and returns the world position of the
   * next muzzle. Used for grenades, shells, rockets and flames.
   */
  fireFrom(x, z, out) {
    const m = this.model;
    if (x != null) {
      this.yaw = Math.atan2(x - this.x, z - this.z);
      m.root.rotation.y = this.yaw;
    }
    this.recoil = 1;
    m.root.updateMatrixWorld(true);
    return m.muzzles[this.shots++ % m.muzzles.length].getWorldPosition(out);
  }

  /** Visual-only shot at an enemy view. */
  shoot(enemyView, effects, audio) {
    const m = this.model;
    if (m.beam) {
      // Phaser ticks: the beam itself is drawn continuously in updateBeam.
      enemyView?.hit();
      audio.shot(this.level, this.type);
      return;
    }
    this.recoil = 1;
    if (m.spin) this.spinSpeed = 30;
    if (!m.plane) {
      if (enemyView) this.yaw = Math.atan2(enemyView.pos.x - this.x, enemyView.pos.z - this.z);
      m.root.rotation.y = this.yaw;
    }
    if (m.melee) {
      // Bonk: no bullet, just a hit spark on the zombie.
      if (enemyView) {
        enemyView.hit();
        effects.flash(enemyView.aimPoint(new THREE.Vector3()), m.tracer ?? 0xffffff, 0.9);
      }
      audio.shot(this.level, this.type);
      return;
    }
    const muzzles = m.muzzles;
    const from = muzzles[this.shots++ % muzzles.length].getWorldPosition(new THREE.Vector3());
    if (enemyView) {
      effects.tracer(from, enemyView.aimPoint(tmp), m.tracer ?? 0xffe066, m.tracerWidth);
      enemyView.hit();
    }
    effects.flash(from, m.tracerWidth ? m.tracer : 0xfff3b0, m.tracerWidth ? 1.4 : 0.7);
    audio.shot(this.level, this.type);
  }

  setSelected(on) {
    this.padMat.emissive.setHex(on ? 0x444444 : 0x000000);
  }

  dispose() {
    this.scene.remove(this.group);
    for (const m of this.model.mats) m.dispose();
    if (this.beam) {
      this.scene.remove(this.beam);
      this.beamMat.dispose();
    }
    for (const l of this.links ?? []) {
      this.scene.remove(l);
      l.material.dispose();
    }
    this.padMat.dispose();
    this.ringMat.dispose();
  }
}

// ------------------------------------------------------------------ traps

const trapMats = {
  plate: new THREE.MeshLambertMaterial({ color: 0x5d4037 }),
  spike: new THREE.MeshLambertMaterial({ color: 0xb0bec5 }),
  mine: new THREE.MeshLambertMaterial({ color: 0x33402a }),
  light: new THREE.MeshBasicMaterial({ color: 0xff1744 }),
  jaw: new THREE.MeshLambertMaterial({ color: 0x78909c }),
};
const trapGeo = {
  plate: new THREE.BoxGeometry(2.2, 0.15, 2.2),
  spike: new THREE.ConeGeometry(0.16, 0.6, 5),
  mine: new THREE.CylinderGeometry(0.75, 0.85, 0.3, 12),
  light: new THREE.BoxGeometry(0.22, 0.12, 0.22),
  jaw: new THREE.BoxGeometry(1.5, 0.35, 0.18),
  ring: new THREE.TorusGeometry(0.8, 0.1, 6, 14),
};

/**
 * A Trapper trap lying on the path: spike plate, landmine or bear trap. Hidden while in the air.
 * Also Necromancer gravestones and Engineer sentries (their own models, rebuilt when they level up).
 */
export class TrapView {
  constructor(scene, tr) {
    this.scene = scene;
    this.kind = tr.kind;
    this.group = new THREE.Group();
    if (tr.kind === 'grave' || tr.kind === 'sentry') {
      this.group.position.set(tr.x, 0, tr.z);
      this.lvl = -1;
      this.yaw = tr.yaw ?? 0;
      scene.add(this.group);
      this.sync(tr, 0);
      return;
    }
    const add = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      this.group.add(m);
      return m;
    };
    if (tr.kind === 'spike') {
      add(trapGeo.plate, trapMats.plate, 0, 0.08, 0);
      for (const x of [-0.6, 0, 0.6]) for (const z of [-0.6, 0, 0.6]) add(trapGeo.spike, trapMats.spike, x, 0.45, z);
    } else if (tr.kind === 'mine') {
      add(trapGeo.mine, trapMats.mine, 0, 0.15, 0);
      this.light = add(trapGeo.light, trapMats.light, 0, 0.36, 0);
    } else {
      const ring = add(trapGeo.ring, trapMats.jaw, 0, 0.12, 0);
      ring.rotation.x = Math.PI / 2;
      for (const z of [-0.45, 0.45]) add(trapGeo.jaw, trapMats.jaw, 0, 0.3, z).rotation.x = z > 0 ? 0.5 : -0.5;
    }
    this.group.position.set(tr.x, 0, tr.z);
    this.group.rotation.y = Math.random() * Math.PI;
    this.t = Math.random() * 5;
    scene.add(this.group);
  }

  sync(tr, dt) {
    if (this.kind === 'grave' || this.kind === 'sentry') return this.syncBuild(tr, dt);
    this.group.visible = !(tr.land > 0);
    this.t += dt;
    if (this.light) this.light.visible = Math.sin(this.t * 6) > 0; // blinking landmine light
  }

  /** Gravestone / sentry: swap the model when its level changes; sentries aim and fade as they wear out. */
  syncBuild(tr, dt) {
    const lvl = tr.lvl ?? 0;
    if (lvl !== this.lvl) {
      if (this.m) {
        this.group.remove(this.m.root);
        for (const mat of this.m.mats) mat.dispose();
      }
      this.lvl = lvl;
      this.m = this.kind === 'grave' ? makeGrave(lvl) : makeSentry(lvl);
      this.group.add(this.m.root);
      if (this.kind === 'grave') {
        this.m.root.rotation.y = tr.yaw ?? 0;
        this.rise = 0.5; // pops up out of the ground
      }
    }
    if (this.rise > 0) {
      this.rise = Math.max(0, this.rise - dt);
      this.m.root.position.y = -this.rise * 4;
    }
    if (this.kind === 'sentry') {
      this.yaw = lerpAngle(this.yaw, tr.yaw ?? 0, Math.min(1, dt * 12));
      this.m.turret.rotation.y = this.yaw;
      // Sparks fly from a sentry that is nearly worn out or stunned.
      // (Solo play reads the sim's own sentry, with real HP; multiplayer gets the share left.)
      const left = tr.maxHp ? tr.hp / tr.maxHp : tr.hp ?? 1;
      const stunned = tr.stunT > 0 || tr.stun;
      this.m.body.position.y = stunned ? Math.sin(performance.now() / 40) * 0.05 : 0;
      for (const mat of this.m.mats) mat.emissive?.setHex(left < 0.2 && Math.sin(performance.now() / 120) > 0 ? 0x552200 : mat.userData.glow || 0);
    }
  }

  /** Sentry shot (or rocket with `rocket`) at an enemy view. */
  shoot(enemyView, effects, audio, rocket) {
    const m = this.m;
    const muzzle = rocket ? m?.cannon : m?.muzzles[0];
    if (!muzzle) return;
    this.group.updateMatrixWorld(true);
    const from = muzzle.getWorldPosition(new THREE.Vector3());
    if (enemyView) {
      effects.tracer(from, enemyView.aimPoint(new THREE.Vector3()), rocket ? 0xff6d00 : m.tracer, rocket ? 0.3 : 0.1);
      enemyView.hit();
    }
    effects.flash(from, rocket ? 0xffab40 : 0xfff3b0, rocket ? 1.2 : 0.5);
    if (rocket) audio.boom(2);
    else audio.shot(0, 'sentry');
  }

  dispose() {
    this.scene.remove(this.group); // trap geometries and materials are shared
    if (this.m) for (const mat of this.m.mats) mat.dispose();
  }
}

// ------------------------------------------------------------------ enemies

const barBgGeo = new THREE.PlaneGeometry(1, 1);
const barFgGeo = new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0); // origin at left edge
const barBgMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.75, depthWrite: false });
const DEATH_TIME = 0.7;
const starGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
const starMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
const hazeGeo = new THREE.BoxGeometry(1, 1, 1);
const hazeMat = new THREE.MeshBasicMaterial({ color: 0x9e9e9e, transparent: true, opacity: 0.45, depthWrite: false });

export class EnemyView {
  constructor(scene, e) {
    this.scene = scene;
    this.id = e.id;
    this.def = ENEMIES[e.type];
    this.pos = new THREE.Vector3();
    this.off = new THREE.Vector3();
    this.phase = Math.random() * 10;
    this.flash = 0;
    this.flashOn = 0; // emissive color currently applied
    this.dying = 0;
    this.done = false;

    this.model = makeEnemy(this.def);
    this.root = this.model.root;
    this.root.scale.setScalar(this.def.scale);
    this.lift = this.def.flying ? FLY_HEIGHT : 0;
    path.at(e.dist, tmpPt);
    this.off.set(-tmpPt.dz, 0, tmpPt.dx).multiplyScalar(e.lateral);
    this.pos.set(tmpPt.x, this.lift, tmpPt.z + (e.oz || 0)).add(this.off);
    this.root.position.copy(this.pos);
    this.root.rotation.y = Math.atan2(tmpPt.dx, tmpPt.dz);
    scene.add(this.root);

    const w = this.def.boss ? 5 : 2.4;
    this.barW = w;
    this.bar = new THREE.Group();
    const bg = new THREE.Mesh(barBgGeo, barBgMat);
    bg.scale.set(w + 0.2, 0.5, 1);
    bg.renderOrder = 10;
    this.fgMat = new THREE.MeshBasicMaterial({ color: 0x66bb6a, transparent: true, depthWrite: false, opacity: this.def.hidden ? 0.5 : 1 });
    this.fg = new THREE.Mesh(barFgGeo, this.fgMat);
    this.fg.position.set(-w / 2, 0, 0.01);
    this.fg.scale.set(w, 0.32, 1);
    this.fg.renderOrder = 11;
    this.bar.add(bg, this.fg);
    scene.add(this.bar);
  }

  get height() {
    return (this.def.h ?? 5.2) * this.def.scale;
  }

  aimPoint(out) {
    return out.set(this.pos.x, this.lift + this.height * 0.62, this.pos.z);
  }

  hit() {
    this.flash = 0.1;
  }

  /** Molten Warlord: raise both axes overhead and bring them down (slam / throw). */
  attack() {
    this.swing = 0.7;
  }

  /** Mirror sim state `e` (type, hp, maxHp, dist, lateral). */
  sync(e, dt, camera) {
    const m = this.model;
    path.at(e.dist, tmpPt);
    // Smoothly-applied sideways offset so a crowd doesn't walk in single file.
    tmp.set(-tmpPt.dz, 0, tmpPt.dx).multiplyScalar(e.lateral);
    this.off.lerp(tmp, Math.min(1, dt * 4));
    this.pos.set(tmpPt.x, this.lift, tmpPt.z + (e.oz || 0)).add(this.off);
    this.root.position.copy(this.pos);
    this.root.rotation.y = lerpAngle(this.root.rotation.y, Math.atan2(tmpPt.dx, tmpPt.dz), Math.min(1, dt * 8));

    this.phase += (dt * (e.speed ?? this.def.speed) * 1.1) / this.def.scale;
    if (m.anim) {
      // Easy mode creatures pose themselves; the Apocalypse Rave just wiggles them.
      const t = performance.now() / 1000;
      m.anim(this.phase, t);
      if (e.st & ST_DANCE) {
        m.body.rotation.y = Math.sin(t * 6 + this.phase) * 0.7;
        m.body.position.y = Math.abs(Math.sin(t * 8 + this.phase)) * 0.6;
      } else m.body.rotation.y = 0;
      this.afterPose(e, dt, camera);
      return;
    }
    const sw = Math.sin(this.phase) * 0.6;
    m.leftLeg.rotation.x = sw;
    m.rightLeg.rotation.x = -sw;
    m.leftArm.rotation.x = -Math.PI / 2 + sw * 0.15;
    m.rightArm.rotation.x = -Math.PI / 2 - sw * 0.15;
    if (this.swing > 0) {
      // Arms go up over the head, then chop down.
      this.swing = Math.max(0, this.swing - dt);
      const f = 1 - this.swing / 0.7;
      const a = f < 0.6 ? -Math.PI * 0.95 * (f / 0.6) : -Math.PI * 0.95 + (Math.PI * 0.6 * (f - 0.6)) / 0.4;
      m.leftArm.rotation.x = m.rightArm.rotation.x = a;
    }
    m.body.position.y = Math.abs(Math.cos(this.phase)) * 0.12;
    m.body.rotation.z = Math.sin(this.phase * 0.5) * 0.06;
    if (e.st & ST_DANCE) {
      // Apocalypse Rave: wiggle, bounce and wave both arms in the air.
      const t = performance.now() / 1000 + this.phase;
      m.body.rotation.y = Math.sin(t * 6) * 0.7;
      m.body.position.y = Math.abs(Math.sin(t * 8)) * 0.6;
      m.leftArm.rotation.x = -Math.PI + Math.sin(t * 8) * 0.5;
      m.rightArm.rotation.x = -Math.PI - Math.sin(t * 8) * 0.5;
    } else m.body.rotation.y = 0;
    if (m.wings) {
      // Flyers: legs dangle, wings flap, and the body bobs up and down in the air.
      const t = performance.now() / 1000 + this.phase;
      const flap = Math.sin(t * 12) * 0.6;
      m.wings[0].rotation.y = flap;
      m.wings[1].rotation.y = -flap;
      m.leftLeg.rotation.x = m.rightLeg.rotation.x = 0.3;
      m.body.position.y = Math.sin(t * 3) * 0.4;
    }
    this.afterPose(e, dt, camera);
  }

  /** Status visuals and the health bar, after the model is posed. */
  afterPose(e, dt, camera) {
    this.status = e.st || 0;
    this.updateStars(dt);
    this.updateFlash(dt);
    this.bar.position.set(this.pos.x, this.lift + this.height + 0.9, this.pos.z);
    this.bar.quaternion.copy(camera.quaternion);
    const r = Math.max(0, e.hp / e.maxHp);
    this.fg.scale.x = Math.max(0.001, this.barW * r);
    this.fgMat.color.setHex(r > 0.5 ? 0x66bb6a : r > 0.25 ? 0xffca28 : 0xef5350);
  }

  /** Tint: red hit flash, then ice blue, flickering fire orange, slime green, chill blue. */
  updateFlash(dt) {
    if (this.flash > 0) this.flash -= dt;
    const st = this.status || 0;
    const burning = st & ST_BURNING && !this.dying;
    const color =
      this.flash > 0 ? 0x992222 : this.dying ? 0x000000 : st & ST_FROZEN ? 0x1e5a99
        : burning ? (Math.sin(this.phase * 9 + performance.now() / 60) > 0 ? 0x993300 : 0x662200)
          : st & ST_SLIMED ? 0x2e6b10 : st & ST_CHILLED ? 0x16405e
            : st & ST_HACKED ? (Math.sin(this.phase * 5 + performance.now() / 90) > 0.6 ? 0x00838f : 0x003a40) : 0x000000;
    if (color !== this.flashOn) {
      setEmissive(this.model, color);
      this.flashOn = color;
    }
  }

  /** Little yellow stars spinning over a stunned zombie's head. */
  updateStars(dt) {
    const on = !!(this.status & ST_STUNNED);
    if (on && !this.stars) {
      this.stars = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const star = new THREE.Mesh(starGeo, starMat);
        star.position.set(Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9);
        this.stars.add(star);
      }
      this.stars.position.y = (this.def.h ?? 5.2) + 0.4;
      this.root.add(this.stars);
    }
    if (this.stars) {
      this.stars.visible = on;
      this.stars.rotation.y += dt * 6;
    }
  }

  die(reward, effects, audio, quiet = false) {
    this.dying = DEATH_TIME;
    this.status = 0;
    if (this.stars) this.stars.visible = false;
    this.bar.visible = false;
    this.flash = 0.1;
    const p = this.aimPoint(new THREE.Vector3());
    effects.puff(p.clone(), this.def.skin, this.def.boss ? 18 : 7, 0.45 * this.def.scale);
    if (reward) effects.text(p.add(new THREE.Vector3(0, 1.5, 0)), `+$${reward}`, '#ffd54f', this.def.boss ? 5 : 2.6);
    if (!quiet) audio.kill();
  }

  /** Fall over backwards, then shrink away. */
  updateDying(dt) {
    this.dying -= dt;
    this.updateFlash(dt);
    const k = Math.max(0, this.dying / DEATH_TIME);
    const fall = Math.min(1, (1 - k) * 2.5);
    this.model.body.rotation.x = -fall * fall * (Math.PI / 2);
    if (this.lift) this.root.position.y = this.lift * (1 - fall); // shot-down Flyers drop out of the sky
    if (k < 0.35) this.root.scale.setScalar(this.def.scale * (k / 0.35));
    if (this.dying <= 0) this.done = true;
  }

  dispose() {
    this.scene.remove(this.root, this.bar);
    for (const mat of this.model.mats) mat.dispose();
    this.fgMat.dispose();
  }
}

// ------------------------------------------------------------------ units (Jeeps, Tanks, squads...)

const unitBarMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.75, depthWrite: false });

export class UnitView {
  constructor(scene, u) {
    this.scene = scene;
    this.id = u.id;
    this.kind = u.model;
    this.m = u.model.startsWith('holo:') ? makeHologram(ENEMIES[u.model.slice(5)]) : makeUnit(u.model, u.alive);
    this.root = this.m.root;
    this.pos = new THREE.Vector3();
    this.off = new THREE.Vector3();
    this.phase = 0;
    this.shots = 0;
    path.at(u.dist, tmpPt);
    this.off.set(-tmpPt.dz, 0, tmpPt.dx).multiplyScalar(u.lateral);
    this.pos.set(tmpPt.x, 0, tmpPt.z + (u.oz || 0)).add(this.off);
    this.root.position.copy(this.pos);
    this.root.rotation.y = Math.atan2(-tmpPt.dx, -tmpPt.dz);
    scene.add(this.root);

    const w = this.m.soldiers ? 2.4 : 3.2;
    this.barW = w;
    this.bar = new THREE.Group();
    const bg = new THREE.Mesh(barBgGeo, unitBarMat);
    bg.scale.set(w + 0.2, 0.45, 1);
    bg.renderOrder = 10;
    this.fgMat = new THREE.MeshBasicMaterial({ color: 0x42a5f5, transparent: true, depthWrite: false });
    this.fg = new THREE.Mesh(barFgGeo, this.fgMat);
    this.fg.position.set(-w / 2, 0, 0.01);
    this.fg.scale.set(w, 0.28, 1);
    this.fg.renderOrder = 11;
    this.bar.add(bg, this.fg);
    scene.add(this.bar);
  }

  /** Mirror sim unit `u` (dist, lateral, speed, yaw, hp, maxHp, alive). Units drive toward the entrance. */
  sync(u, dt, camera) {
    const m = this.m;
    path.at(u.dist, tmpPt);
    tmp.set(-tmpPt.dz, 0, tmpPt.dx).multiplyScalar(u.lateral);
    this.off.lerp(tmp, Math.min(1, dt * 4));
    this.pos.set(tmpPt.x, 0, tmpPt.z + (u.oz || 0)).add(this.off);
    this.root.position.copy(this.pos);
    this.root.rotation.y = lerpAngle(this.root.rotation.y, Math.atan2(-tmpPt.dx, -tmpPt.dz), Math.min(1, dt * 6));
    const local = (u.yaw ?? 0) - this.root.rotation.y; // aim direction relative to the body
    const speed = u.speed ?? 0;
    this.phase += dt * speed * 1.4;
    if (m.turret) m.turret.rotation.y = lerpAngle(m.turret.rotation.y, local, Math.min(1, dt * 10));
    for (const w of m.wheels) w.rotation.x += dt * speed * 1.8;
    if (m.walk) {
      // Hacker holograms shamble along like the zombies they were.
      const sw = Math.sin(this.phase * 2) * 0.6;
      m.walk[0].rotation.x = sw;
      m.walk[1].rotation.x = -sw;
    }
    if (m.legs) {
      // Mech stomp.
      m.legs[0].rotation.x = Math.sin(this.phase) * 0.45;
      m.legs[1].rotation.x = -Math.sin(this.phase) * 0.45;
      m.body.position.y = Math.abs(Math.cos(this.phase)) * 0.25;
    }
    if (m.soldiers) {
      m.soldiers.forEach((h, i) => {
        h.root.visible = i < u.alive;
        const sw = Math.sin(this.phase * 2 + i) * 0.6 * (speed > 0 ? 1 : 0);
        h.leftLeg.rotation.x = sw;
        h.rightLeg.rotation.x = -sw;
        // Walking: rifles forward; stopped: turn to face the target.
        h.root.rotation.y = lerpAngle(h.root.rotation.y, speed > 0 ? 0 : local, Math.min(1, dt * 10));
      });
    }
    this.bar.position.set(this.pos.x, m.height + 0.8, this.pos.z);
    this.bar.quaternion.copy(camera.quaternion);
    const r = Math.max(0, u.hp / u.maxHp);
    this.fg.scale.x = Math.max(0.001, this.barW * r);
  }

  /** World position of the unit's (first) muzzle. */
  muzzlePosition(out) {
    this.root.updateMatrixWorld(true);
    return (this.m.muzzles[0] ?? this.root).getWorldPosition(out);
  }

  /** Visual-only shot (or cannon blast with `cannon`) at an enemy view. */
  shoot(enemyView, effects, audio, i, cannon) {
    const m = this.m;
    const muzzle = cannon ? m.cannon : m.muzzles[(i ?? this.shots++) % m.muzzles.length];
    if (!muzzle) return;
    this.root.updateMatrixWorld(true);
    const from = muzzle.getWorldPosition(new THREE.Vector3());
    if (enemyView) {
      effects.tracer(from, enemyView.aimPoint(tmp), cannon ? 0xff9100 : m.tracer, cannon ? 0.3 : undefined);
      enemyView.hit();
    }
    effects.flash(from, cannon ? 0xffab40 : 0xfff3b0, cannon ? 1.5 : 0.6);
    if (cannon) audio.boom(3);
    else audio.shot(m.soldiers ? 0 : 1, 'unit');
  }

  dispose() {
    this.scene.remove(this.root, this.bar);
    for (const mat of this.m.mats) mat.dispose();
    this.fgMat.dispose();
  }
}

// ------------------------------------------------------------------ other players

export class RemotePlayerView {
  constructor(scene, p) {
    this.scene = scene;
    this.id = p.id;
    this.h = makeHumanoid({ skin: 0xf5cd30, shirt: p.color, pants: 0x43a047, face: 'smile' });
    this.tag = makeNameTag(p.name, p.color);
    this.tag.position.y = 7;
    this.h.root.add(this.tag);
    this.pos = new THREE.Vector3(1e4, 0, 1e4); // hidden until the first position arrives
    this.target = null;
    this.yaw = 0;
    this.phase = 0;
    this.swing = 0;
    this.h.root.visible = false;
    scene.add(this.h.root);
  }

  update(dt, net) {
    if (!net) return;
    if (!this.target) {
      this.pos.set(net.x, net.y, net.z);
      this.h.root.visible = true;
    }
    this.target = net;
    this.pos.x += (net.x - this.pos.x) * Math.min(1, dt * 12);
    this.pos.y += (net.y - this.pos.y) * Math.min(1, dt * 12);
    this.pos.z += (net.z - this.pos.z) * Math.min(1, dt * 12);
    this.yaw = lerpAngle(this.yaw, net.yaw, Math.min(1, dt * 12));

    const h = this.h;
    const grounded = !!net.g;
    this.swing += ((net.m && grounded ? 1 : 0) - this.swing) * Math.min(1, dt * 10);
    this.phase += dt * 11 * (net.m ? 1 : 0);
    const sw = Math.sin(this.phase) * 0.9 * this.swing;
    if (grounded) {
      h.leftLeg.rotation.x = sw;
      h.rightLeg.rotation.x = -sw;
      h.leftArm.rotation.x = -sw;
      h.rightArm.rotation.x = sw;
      h.leftArm.rotation.z = h.rightArm.rotation.z = 0;
    } else {
      h.leftArm.rotation.x = h.rightArm.rotation.x = -Math.PI * 0.9;
      h.leftArm.rotation.z = -0.2;
      h.rightArm.rotation.z = 0.2;
    }
    h.root.position.copy(this.pos);
    h.root.rotation.y = this.yaw;
  }

  dispose() {
    this.scene.remove(this.h.root);
    for (const m of this.h.mats) m.dispose();
    disposeSprite(this.tag);
  }
}
