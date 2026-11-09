// Visual representations of sim objects. Views never change game state; they mirror
// whatever the session (local sim or network snapshots) says and play effects for events.
import * as THREE from 'three';
import { ENEMIES } from './config.js';
import { TOWER_MODELS, makeEnemy, makeGrave, makeHologram, makeHumanoid, makeSentry, makeUnit, setEmissive, setOpacity } from './models.js';
import { path } from './sim/path.js';
import { heightAt } from './sim/map.js';
import { TOWERS, TRACKS } from './config.js';
import { lerpAngle } from './utils.js';
import { MODEL_SCALE as K, PLAYER_SCALE, WORLD_SCALE } from './scale.js';
import { orbitOf, FLY_HEIGHT, ST_VOIDAURA, ST_CHARGING, ST_ARMORED, ST_GLITCHED, ST_HASTED, ST_SMOKED, ST_AIRBORNE, ST_ENRAGED, ST_SHROOM, ST_BURNING, ST_CHILLED, ST_CONFUSED, ST_DANCE, ST_FLOAT, ST_FROZEN, ST_GASSED, ST_HACKED, ST_SLIMED, ST_STUNNED, ST_SHOCKED, ST_BIOHAZARD, ST_CLOAKED, ST_VOIDARMOR } from './sim/sim.js';

const tmp = new THREE.Vector3();
const tmpPt = {};

/**
 * Position of `obj` in sim units. Views live inside the scaled map group (at the origin, scaled
 * by WORLD_SCALE), so a world position just needs that scale taken back out.
 */
function simPos(obj, out) {
  return obj.getWorldPosition(out).multiplyScalar(1 / WORLD_SCALE);
}

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
export const PAD_COLORS = [0x9e9e9e, 0x7cb342, 0x29b6f6, 0xab47bc, 0xffb300, 0xe53935, 0x212121, 0xeceff1]; // one per level (Lv 6 red, Lv 7 black, crosspath 5-2 white)
const beamGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5); // grows from its origin along +Z
// Spotlight Tech: a cone of light from the lamp (z = 0, narrow) to the ground (z = 1, radius 1).
const spotConeGeo = new THREE.CylinderGeometry(1, 0.12, 1, 20, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
const spotDiscGeo = new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2);
const tmpB = new THREE.Vector3();

export const LEAP_TIME = 0.45; // seconds a Brawler's Reposition leap takes

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
    this.group.scale.setScalar(K);
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

  /** Brawler Reposition: hop in an arc from (fx, fz) to (x, z). */
  leap(fx, fz, x, z) {
    this.hop = { fx, fz, x, z, t: 0 };
  }

  /** Follows the tower's spot (it only moves when a Brawler leaps). */
  syncPos(t, dt) {
    const p = this.group.position;
    if (this.hop) {
      const h = this.hop;
      h.t += dt;
      const k = Math.min(1, h.t / LEAP_TIME);
      const x = h.fx + (h.x - h.fx) * k;
      const z = h.fz + (h.z - h.fz) * k;
      p.set(x, heightAt(x, z) + Math.sin(k * Math.PI) * 4 * K, z);
      if (k >= 1) this.hop = null;
    } else if (p.x !== t.x || p.z !== t.z) p.set(t.x, heightAt(t.x, t.z), t.z);
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
    // How tall the model stands (sim units), so players can jump on top of it.
    this.model.root.updateMatrixWorld(true);
    // (Orbit: its satellite floats high above, so it doesn't count toward the height you can stand on.)
    const sat = this.model.satellite;
    const satParent = sat?.parent;
    satParent?.remove(sat);
    this.top = Math.max(0.6, new THREE.Box3().setFromObject(this.model.root).max.y) * K;
    satParent?.add(sat);
    this.group.add(this.model.root);
    if (this.model.plane) this.group.add(this.model.plane);
    this.padMat.color.setHex(this.holo ? 0x00bcd4 : PAD_COLORS[level]);
    this.stealthShown = false; // a fresh model is solid until sync() says it's stealthy
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
    // Clicking the Aviator plane / Pursuit helicopter selects it on its own (see Game.pickAny).
    if (this.model.plane) this.model.plane.traverse((o) => (o.userData.sub = 'plane'));
  }

  /** Where the plane / helicopter is right now, in sim units (or the tower, if it has none). */
  planePos(out) {
    return this.model.plane ? simPos(this.model.plane, out) : out.set(this.x, 0, this.z);
  }

  sync(t, dt) {
    if (t.type !== this.type) {
      // Upgrade paths: a Pursuit that takes the Bottom path becomes another tower type.
      this.type = t.type;
      this.build(t.level);
    } else if (t.level !== this.level) this.build(t.level);
    this.yaw = lerpAngle(this.yaw, t.yaw, Math.min(1, dt * 15));
    this.syncPos(t, dt);
    const m = this.model;
    // A hologram flickers in its last few seconds.
    if (this.holo) m.root.visible = t.holo > 3 || Math.sin(performance.now() / 45) > -0.3;
    m.root.rotation.y = this.yaw;
    this.recoil = Math.max(0, this.recoil - dt * (m.swing ? 4 : 10)); // swings recover slower than gun kick
    if (m.static) {
      // Buildings (Farm, Patrol, Barracks, Zed) have no arms to animate.
    } else if (m.punch) {
      // Brawler: left and right fists take turns jabbing forward, then pull back to guard.
      const left = this.shots % 2 === 0;
      m.rightArm.rotation.x = m.pose.right + (left ? 0 : this.recoil * m.swing);
      m.leftArm.rotation.x = m.pose.left + (left ? this.recoil * m.swing : 0);
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
    if (m.goldFx) {
      // Golden perks: the mist slowly turns and the stars bob and spin.
      m.goldFx.rotation.y += dt * 0.4;
      for (const st of m.goldFx.userData.stars) {
        st.position.y = st.userData.y + Math.sin(this.breath * 1.5 + st.userData.p) * 0.4;
        st.rotation.y += dt * 3;
      }
    }
    if (m.goldSword) {
      // Gold Commander: the broadsword is out during Call to Battle (always at max level).
      const out = this.level >= 4 || t.active > 0;
      m.goldSword.visible = out;
      m.pose.right = out ? m.swordUp : m.swordRest;
    }
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
    // Stealthy towers (enemies can't target them) are drawn see-through.
    const stealth = !!(t.fx & 16);
    if (stealth !== this.stealthShown) {
      this.stealthShown = stealth;
      setOpacity(m, this.holo ? 0.5 : stealth ? 0.4 : 1);
    }
    if (m.drone) {
      // Ghost C7 Drone: circles over her head while the ability is on.
      m.drone.visible = t.active > 0;
      if (m.drone.visible) {
        const a = this.breath * 1.8;
        m.drone.position.set(Math.cos(a) * 2.2, 7.5 + Math.sin(this.breath * 3) * 0.3, Math.sin(a) * 2.2);
        for (const r of m.drone.userData.rotors) r.rotation.y += dt * 40;
      }
    }
    if (m.heli) this.hover(t, dt);
    else if (m.plane) this.fly(t, dt);
    if (m.spot) this.syncSpot(t, dt);
    if (m.modeTracer) {
      // Elementalist: its gauntlet and shots glow in the color of its element.
      const c = m.modeTracer[t.choice?.[0] === 'frost' ? 'frost' : 'fire'];
      if (m.tracer !== c) {
        m.tracer = c;
        for (const g of m.modeGlow) {
          g.material.color.setHex(c);
          g.material.emissive.setHex(c);
          g.material.userData.glow = c;
        }
      }
    }
    if (t.fx || this.fx) this.syncFx(t.fx || 0, dt);
  }

  /** Spotlight Tech: a cone of light from its lamp down to where the light is, and a bright disc on the ground. */
  syncSpot(t, dt) {
    const m = this.model;
    const sp = TOWERS[t.type].levels[t.level].spot;
    if (!sp || t.lx == null) return;
    if (!this.spotCone) {
      this.spotMat = new THREE.MeshBasicMaterial({ color: m.spot, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
      this.spotDiscMat = new THREE.MeshBasicMaterial({ color: m.spot, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending });
      this.spotCone = new THREE.Mesh(spotConeGeo, this.spotMat);
      this.spotDisc = new THREE.Mesh(spotDiscGeo, this.spotDiscMat);
      this.spotCone.renderOrder = this.spotDisc.renderOrder = 5;
      this.scene.add(this.spotCone, this.spotDisc);
      this.spotAt = { x: t.lx, z: t.lz };
    }
    this.spotMat.color.setHex(m.spot);
    this.spotDiscMat.color.setHex(m.spot);
    const k = Math.min(1, dt * 10);
    this.spotAt.x += (t.lx - this.spotAt.x) * k;
    this.spotAt.z += (t.lz - this.spotAt.z) * k;
    const to = tmp.set(this.spotAt.x, 0.15, this.spotAt.z);
    this.spotDisc.position.copy(to);
    this.spotDisc.scale.setScalar(sp.radius);
    // Tilt the lamp down toward the light.
    m.root.updateMatrixWorld(true);
    const from = simPos(m.muzzles[0], tmpB);
    if (m.lamp) m.lamp.rotation.x = Math.atan2(from.y - to.y, Math.hypot(to.x - from.x, to.z - from.z) || 1);
    this.spotCone.position.copy(from);
    this.spotCone.lookAt(to);
    this.spotCone.scale.set(sp.radius, sp.radius, from.distanceTo(to));
    const flicker = 0.9 + Math.random() * 0.1;
    this.spotMat.opacity = 0.16 * flicker;
    this.spotDiscMat.opacity = 0.42 * flicker;
  }

  /** Gold Commander: a big broadsword swing. */
  swingSword() {
    this.recoil = 1;
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
      // Insane mode: a violet clock ring while it's slowed (bit 32) or nerfed for good by the Beholder (bit 64).
      this.fxClock = new THREE.Group();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const m = new THREE.Mesh(starGeo, i % 3 ? clockTickMat : clockMarkMat);
        m.position.set(Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2);
        m.scale.set(i % 3 ? 0.6 : 1, 0.6, i % 3 ? 0.6 : 1.4);
        m.rotation.y = -a;
        this.fxClock.add(m);
      }
      this.fxClock.position.y = 0.6;
      // Void mode: red drops falling around a bleeding tower (bit 512), a purple ring and haze around a corrupted one (bit 1024).
      this.fxBleed = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const d = new THREE.Mesh(starGeo, bleedMat);
        d.position.set(Math.cos(a) * 1.4, 2 + (i % 3) * 1.2, Math.sin(a) * 1.4);
        d.scale.set(0.6, 1.2, 0.6);
        this.fxBleed.add(d);
      }
      this.fxCorrupt = new THREE.Group();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const m = new THREE.Mesh(starGeo, corruptMat);
        m.position.set(Math.cos(a) * 2.6, 0.3, Math.sin(a) * 2.6);
        m.rotation.y = -a;
        m.scale.set(1.6, 0.4, 0.5);
        this.fxCorrupt.add(m);
      }
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const h = new THREE.Mesh(hazeGeo, corruptHazeMat);
        h.position.set(Math.cos(a) * 1.3, 1.5 + (i % 2) * 2, Math.sin(a) * 1.3);
        h.scale.setScalar(1.6);
        this.fxCorrupt.add(h);
      }
      this.fx.add(this.fxStars, this.fxHaze, this.fxClock, this.fxBleed, this.fxCorrupt);
      this.group.add(this.fx);
    }
    this.fxBleed.visible = !!(fx & 512);
    this.fxCorrupt.visible = !!(fx & 1024);
    if (fx & 512) {
      for (const d of this.fxBleed.children) {
        d.position.y -= dt * 3;
        if (d.position.y < 0.3) d.position.y = 5;
      }
    }
    this.fxCorrupt.rotation.y += dt * 0.8;
    this.fxStars.visible = !!(fx & 2);
    this.fxHaze.visible = !!(fx & 1);
    this.fxClock.visible = !!(fx & 96);
    this.fxClock.rotation.y -= dt * (fx & 32 ? 0.6 : 0.15);
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
    const R = orbitOf({ ...t, type: this.type }); // Stormwing Expanded Scope widens the ring
    p.position.set((Math.cos(this.ang) * R) / K, this.model.flyHeight, (Math.sin(this.ang) * R) / K); // the group is scaled by K
    p.rotation.y = Math.atan2(-Math.sin(this.ang), Math.cos(this.ang)) + (dir < 0 ? Math.PI : 0); // along the flight direction
    const { bank, prop } = p.userData;
    const ground = this.model.flyHeight < 1; // Beebo rides on the ground: a light lean, no bobbing
    bank.rotation.z = (ground ? 0.12 : 0.35) * dir; // lean into the turn
    bank.position.y = ground ? 0 : Math.sin(this.breath * 1.3) * 0.4;
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
    p.position.set(hp.x / K, this.model.flyHeight + Math.sin(this.breath * 1.6) * 0.3, hp.z / K); // the group is scaled by K
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
    const from = simPos(m.muzzles[0], tmpB);
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
   * during Ubercharge. The Medigun Medic has one beam, to the tower it heals.
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
    if (targets.length && !m.mediFrom) {
      this.yaw = Math.atan2(targets[0].x - this.x, targets[0].z - this.z);
      m.root.rotation.y = this.yaw;
    }
    m.root.updateMatrixWorld(true);
    // Doctor: the beam comes from its medigun nozzle, and it keeps aiming its pistol.
    const from = simPos(m.mediFrom ?? m.muzzles[0], tmpB);
    this.links.forEach((mesh, i) => {
      const v = targets[i];
      mesh.visible = !!v;
      if (!v) return;
      tmp.set(v.x, v.group.position.y + 3 * K, v.z);
      const w = (uber ? 0.4 : 0.18) * (0.85 + Math.random() * 0.3);
      mesh.position.copy(from);
      mesh.lookAt(tmp);
      mesh.scale.set(w, w, from.distanceTo(tmp));
      // Medigun Medic: `uber` is 'uber' (blue) or 'kritz' (red) while its charge is on.
      mesh.material.color.setHex(uber === 'uber' ? 0x448aff : uber ? 0xff5252 : m.medi);
      mesh.material.opacity = uber ? 0.8 : 0.5;
    });
  }

  /** World position of the plane's bomb bay (Aviator), for bomb drop effects. */
  bayPosition(out) {
    return this.model.plane ? simPos(this.model.plane.userData.bay, out) : out.set(this.x, this.group.position.y + 5 * K, this.z);
  }

  /** World position of a missile pod (alternating), falling back to the bay. */
  podPosition(i, out) {
    const pods = this.model.plane?.userData.missiles;
    return pods?.length ? simPos(pods[i % pods.length], out) : this.bayPosition(out);
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
    return simPos(m.muzzles[this.shots++ % m.muzzles.length], out);
  }

  /** Ghost C7 Drone shot: a tracer from the drone (not the tower's gun). */
  droneShoot(enemyView, effects, audio) {
    const d = this.model.drone;
    if (!d) return this.shoot(enemyView, effects, audio);
    const from = simPos(d, new THREE.Vector3());
    if (enemyView) {
      effects.tracer(from, enemyView.aimPoint(tmp), 0x76ff03, 0.18);
      enemyView.hit();
    }
    effects.flash(from, 0x76ff03, 0.6);
    audio.shot(this.level, this.type);
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
      if (m.punch) this.shots++; // Brawler: the other fist punches next
      // Bonk: no bullet, just a hit spark on the zombie.
      if (enemyView) {
        enemyView.hit();
        effects.flash(enemyView.aimPoint(new THREE.Vector3()), m.tracer ?? 0xffffff, 0.9);
      }
      audio.shot(this.level, this.type);
      return;
    }
    const muzzles = m.muzzles;
    const from = simPos(muzzles[this.shots++ % muzzles.length], new THREE.Vector3());
    if (enemyView) {
      effects.tracer(from, enemyView.aimPoint(tmp), m.tracer ?? 0xffe066, m.tracerWidth);
      enemyView.hit();
    }
    effects.flash(from, m.tracerWidth ? m.tracer : 0xfff3b0, m.tracerWidth ? 1.4 : 0.7);
    audio.shot(this.level, this.type);
  }

  /** Health bar over damaged towers (hidden at full health); knocked-out towers slump over. */
  syncHp(t, camera) {
    const r = t.maxHp ? Math.max(0, t.hp / t.maxHp) : 1;
    const show = r < 1;
    if (show && !this.hpBar) {
      this.hpBar = new THREE.Group();
      const bg = new THREE.Mesh(barBgGeo, barBgMat);
      bg.scale.set(3.2, 0.45, 1);
      bg.renderOrder = 10;
      this.hpMat = new THREE.MeshBasicMaterial({ color: 0x66bb6a, transparent: true, depthWrite: false });
      this.hpFg = new THREE.Mesh(barFgGeo, this.hpMat);
      this.hpFg.position.set(-1.5, 0, 0.01);
      this.hpFg.scale.set(3, 0.28, 1);
      this.hpFg.renderOrder = 11;
      this.hpBar.add(bg, this.hpFg);
      this.hpBar.position.y = 8.2;
      this.group.add(this.hpBar);
    }
    if (this.hpBar) {
      this.hpBar.visible = show;
      if (show) {
        this.hpBar.quaternion.copy(camera.quaternion);
        this.hpFg.scale.x = Math.max(0.001, 3 * r);
        this.hpMat.color.setHex(r > 0.5 ? 0x66bb6a : r > 0.25 ? 0xffca28 : 0xef5350);
      }
    }
    // Knocked out: the tower slumps over until it's healed.
    this.model.root.rotation.x = r <= 0 ? -0.6 : 0;
  }

  setSelected(on) {
    this.padMat.emissive.setHex(on ? 0x444444 : 0x000000);
  }

  dispose() {
    this.scene.remove(this.group);
    for (const m of this.model.mats) m.dispose();
    this.hpMat?.dispose();
    if (this.beam) {
      this.scene.remove(this.beam);
      this.beamMat.dispose();
    }
    if (this.spotCone) {
      this.scene.remove(this.spotCone, this.spotDisc);
      this.spotMat.dispose();
      this.spotDiscMat.dispose();
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
  thermite: new THREE.MeshBasicMaterial({ color: 0xff6d00, transparent: true, opacity: 0.55, depthWrite: false }),
  ember: new THREE.MeshBasicMaterial({ color: 0xffd180 }),
  gas: new THREE.MeshBasicMaterial({ color: 0x9ccc3c, transparent: true, opacity: 0.32, depthWrite: false }),
  gasPuff: new THREE.MeshBasicMaterial({ color: 0xb2ff59, transparent: true, opacity: 0.28, depthWrite: false }),
  thorns: new THREE.MeshBasicMaterial({ color: 0x33691e, transparent: true, opacity: 0.5, depthWrite: false }),
  thorn: new THREE.MeshLambertMaterial({ color: 0x5d4037 }),
  goo: new THREE.MeshBasicMaterial({ color: 0x76ff03, transparent: true, opacity: 0.55, depthWrite: false }),
  gooBlob: new THREE.MeshLambertMaterial({ color: 0x64dd17, emissive: 0x2e7d32, emissiveIntensity: 0.5 }),
};
const trapGeo = {
  plate: new THREE.BoxGeometry(2.2, 0.15, 2.2),
  spike: new THREE.ConeGeometry(0.16, 0.6, 5),
  mine: new THREE.CylinderGeometry(0.75, 0.85, 0.3, 12),
  light: new THREE.BoxGeometry(0.22, 0.12, 0.22),
  jaw: new THREE.BoxGeometry(1.5, 0.35, 0.18),
  ring: new THREE.TorusGeometry(0.8, 0.1, 6, 14),
  patch: new THREE.CircleGeometry(1, 20),
  ember: new THREE.BoxGeometry(0.25, 0.25, 0.25),
  gasPuff: new THREE.SphereGeometry(1, 8, 6),
};

/**
 * A Trapper trap lying on the path: spike plate, landmine or bear trap. Hidden while in the air.
 * Also Mine Layer thermite patches (a glowing disc of `radius` with flickering embers).
 * Also Necromancer gravestones and Engineer sentries (their own models, rebuilt when they level up).
 */
export class TrapView {
  constructor(scene, tr) {
    this.scene = scene;
    this.id = tr.id;
    this.kind = tr.kind;
    this.group = new THREE.Group();
    // Drawn K bigger like towers; thermite / gas patches keep their sim radius.
    if (tr.kind !== 'thermite' && tr.kind !== 'gas' && tr.kind !== 'thorns' && tr.kind !== 'goo') this.group.scale.setScalar(K);
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
    } else if (tr.kind === 'thermite') {
      const r = tr.radius || 3;
      const disc = new THREE.Mesh(trapGeo.patch, trapMats.thermite);
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 0.06;
      disc.scale.setScalar(r);
      disc.renderOrder = 2;
      this.group.add(disc);
      this.embers = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const m = add(trapGeo.ember, trapMats.ember, Math.cos(a) * r * 0.55, 0.3, Math.sin(a) * r * 0.55);
        m.castShadow = false;
        m.userData.ph = i * 1.3;
        this.embers.push(m);
      }
    } else if (tr.kind === 'thorns') {
      // Harvester thorns: a dark green patch bristling with brown thorns.
      const r = tr.radius || 3;
      const disc = new THREE.Mesh(trapGeo.patch, trapMats.thorns);
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 0.06;
      disc.scale.setScalar(r);
      disc.renderOrder = 2;
      this.group.add(disc);
      const n = Math.round(6 + r * 3);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.sqrt(Math.random()) * r * 0.9;
        const m = add(trapGeo.spike, trapMats.thorn, Math.cos(a) * d, 0.5, Math.sin(a) * d);
        m.scale.set(1.6, 2.2, 1.6);
        m.rotation.z = (Math.random() - 0.5) * 0.6;
        m.castShadow = false;
      }
    } else if (tr.kind === 'goo') {
      // Goo Gunner Spawn Puddle: a bright green splat with bubbling goo blobs.
      const r = tr.radius || 2.5;
      const disc = new THREE.Mesh(trapGeo.patch, trapMats.goo);
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 0.06;
      disc.scale.setScalar(r);
      disc.renderOrder = 2;
      this.group.add(disc);
      this.bubbles = [];
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const m = new THREE.Mesh(trapGeo.gasPuff, trapMats.gooBlob);
        m.position.set(Math.cos(a) * r * 0.5, 0.15, Math.sin(a) * r * 0.5);
        m.scale.setScalar(r * 0.18);
        m.userData.ph = i * 1.3;
        this.group.add(m);
        this.bubbles.push(m);
      }
    } else if (tr.kind === 'gas') {
      // Toxicnator gas cloud: a green haze with slowly churning puffs.
      const r = tr.radius || 3;
      const disc = new THREE.Mesh(trapGeo.patch, trapMats.gas);
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 0.07;
      disc.scale.setScalar(r);
      disc.renderOrder = 2;
      this.group.add(disc);
      this.puffs = [];
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const m = new THREE.Mesh(trapGeo.gasPuff, trapMats.gasPuff);
        m.position.set(Math.cos(a) * r * 0.5, 0.8, Math.sin(a) * r * 0.5);
        m.scale.setScalar(r * 0.45);
        m.renderOrder = 3;
        m.userData.ph = i * 1.7;
        this.group.add(m);
        this.puffs.push(m);
      }
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
    if (this.embers) for (const m of this.embers) m.position.y = 0.3 + Math.abs(Math.sin(this.t * 5 + m.userData.ph)) * 0.6; // thermite embers
    if (this.puffs) for (const m of this.puffs) m.position.y = 0.8 + Math.sin(this.t * 1.5 + m.userData.ph) * 0.4; // gas puffs
    if (this.puffs) this.group.rotation.y += dt * 0.3;
    if (this.bubbles) for (const m of this.bubbles) m.position.y = 0.1 + Math.abs(Math.sin(this.t * 2.5 + m.userData.ph)) * 0.35; // bubbling goo
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
      this.group.traverse((o) => (o.userData.trapId = this.id)); // clickable: Game.pickAny
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
    const from = simPos(muzzle, new THREE.Vector3());
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
const clockTickMat = new THREE.MeshBasicMaterial({ color: 0xb388ff });
const clockMarkMat = new THREE.MeshBasicMaterial({ color: 0xffd740 });
const bubbleGeo = new THREE.SphereGeometry(1, 14, 10);
const bubbleMat = new THREE.MeshBasicMaterial({ color: 0x81d4fa, transparent: true, opacity: 0.3, depthWrite: false });
const hazeGeo = new THREE.BoxGeometry(1, 1, 1);
const hazeMat = new THREE.MeshBasicMaterial({ color: 0x9e9e9e, transparent: true, opacity: 0.45, depthWrite: false });
// Void mode: bleeding towers (Guardian axe) drip red; towers VOID corrupted get a purple ring.
const bleedMat = new THREE.MeshBasicMaterial({ color: 0xd50000 });
const corruptMat = new THREE.MeshBasicMaterial({ color: 0xd500f9 });
const corruptHazeMat = new THREE.MeshBasicMaterial({ color: 0x6a1b9a, transparent: true, opacity: 0.4, depthWrite: false });
// Void armor: a see-through purple shell, dark tendrils, and a purple shield bar.
const vArmorMat = new THREE.MeshBasicMaterial({ color: 0xaa00ff, transparent: true, opacity: 0.22, depthWrite: false });
const vTendrilMat = new THREE.MeshBasicMaterial({ color: 0x2a0040 });
const vTendrilTipMat = new THREE.MeshBasicMaterial({ color: 0xea80fc });
const vTendrilGeo = new THREE.BoxGeometry(0.22, 1, 0.22);

const shroomStemGeo = new THREE.BoxGeometry(0.35, 0.7, 0.35);
const shroomCapGeo = new THREE.BoxGeometry(1.1, 0.45, 1.1);
const shroomStemMat = new THREE.MeshLambertMaterial({ color: 0xf5f0e1 });
const shroomCapMat = new THREE.MeshLambertMaterial({ color: 0xc62828, emissive: 0x3a0000 });

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
    this.root.scale.setScalar(this.def.scale * K);
    this.lift = this.def.flying ? FLY_HEIGHT * K : 0;
    path.at(e.dist, tmpPt);
    this.off.set(-tmpPt.dz, 0, tmpPt.dx).multiplyScalar(e.lateral);
    this.pos.set(tmpPt.x, this.lift, tmpPt.z + (e.oz || 0)).add(this.off);
    this.root.position.copy(this.pos);
    this.root.rotation.y = Math.atan2(tmpPt.dx, tmpPt.dz);
    scene.add(this.root);

    const w = (this.def.boss ? 5 : 2.4) * K;
    this.barW = w;
    this.bar = new THREE.Group();
    const bg = new THREE.Mesh(barBgGeo, barBgMat);
    bg.scale.set(w + 0.2 * K, 0.5 * K, 1);
    bg.renderOrder = 10;
    this.fgMat = new THREE.MeshBasicMaterial({ color: 0x66bb6a, transparent: true, depthWrite: false, opacity: this.def.hidden ? 0.5 : 1 });
    this.fg = new THREE.Mesh(barFgGeo, this.fgMat);
    this.fg.position.set(-w / 2, 0, 0.01);
    this.fg.scale.set(w, 0.32 * K, 1);
    this.fg.renderOrder = 11;
    this.bar.add(bg, this.fg);
    scene.add(this.bar);
    this.vBar = null; // Void armor shield bar (made when first needed)
    this.vArmor = null;
  }

  get height() {
    return (this.def.h ?? 5.2) * this.def.scale * K;
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
    // Bubble Blower: a floating zombie drifts up inside a bubble.
    this.floatY = (this.floatY || 0) + ((e.st & ST_FLOAT ? 2.5 * K : 0) - (this.floatY || 0)) * Math.min(1, dt * 6);
    // Eradicator: rises into the air while it flies, and comes back down after.
    const lift = this.def.flying ? FLY_HEIGHT * K : e.st & ST_AIRBORNE ? FLY_HEIGHT * 2 * K : 0;
    this.lift += (lift - this.lift) * Math.min(1, dt * 3);
    this.pos.set(tmpPt.x, this.lift + this.floatY, tmpPt.z + (e.oz || 0)).add(this.off);
    this.root.position.copy(this.pos);
    const back = e.st & ST_CONFUSED ? Math.PI : 0; // confused zombies turn around and walk back
    this.root.rotation.y = lerpAngle(this.root.rotation.y, Math.atan2(tmpPt.dx, tmpPt.dz) + back, Math.min(1, dt * 8));

    this.phase += (dt * (e.speed ?? this.def.speed) * 1.1) / (this.def.scale * K);
    if (m.anim) {
      // Easy mode creatures pose themselves; the Apocalypse Rave just wiggles them.
      const t = performance.now() / 1000;
      m.anim(this.phase, t);
      if (m.swingArms && this.swing > 0) {
        // VOID (Spirit): both arms come down on an attack.
        this.swing = Math.max(0, this.swing - dt);
        m.swingArms(1 - this.swing / 0.7);
      }
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
    // Insane mode: see-through inside Smoker smoke; Time Titans show their armor while it's up.
    const smoked = !!(this.status & (ST_SMOKED | ST_CLOAKED)) && !this.def.hidden; // Hard: turned hidden mid-game
    if (smoked !== !!this.smoked) {
      this.smoked = smoked;
      setOpacity(this.model, smoked ? 0.35 : 1);
    }
    this.model.setArmored?.(!!(this.status & ST_ARMORED));
    this.model.setEnraged?.(!!(this.status & ST_ENRAGED)); // Medium Eradicator: Electronic Rage eye
    this.updateStars(dt);
    this.updateBubble();
    this.updateShroom();
    this.updateFlash(dt);
    this.bar.position.set(this.pos.x, this.lift + this.height + 0.9 * K, this.pos.z);
    this.bar.quaternion.copy(camera.quaternion);
    const r = Math.min(1, Math.max(0, e.hp / e.maxHp)); // (Mothership heals can overheal)
    this.fg.scale.x = Math.max(0.001, this.barW * r);
    this.fgMat.color.setHex(r > 0.5 ? 0x66bb6a : r > 0.25 ? 0xffca28 : 0xef5350);
    this.updateVoidArmor(e, dt);
  }

  /** Void armor: a purple shell with tendrils waving around the enemy, and a purple shield bar over its health bar. */
  updateVoidArmor(e, dt) {
    const on = !!(this.status & ST_VOIDARMOR) && !this.dying;
    if (on && !this.vArmor) {
      const g = new THREE.Group();
      const h = this.def.h ?? 5.2;
      const shell = new THREE.Mesh(bubbleGeo, vArmorMat);
      shell.scale.set(h * 0.42, h * 0.6, h * 0.42);
      shell.position.y = h * 0.5;
      g.add(shell);
      g.userData.tendrils = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const piv = new THREE.Group();
        piv.position.set(Math.cos(a) * h * 0.2, h * (0.45 + (i % 2) * 0.15), Math.sin(a) * h * 0.2);
        piv.rotation.y = -a;
        const len = h * 0.45;
        const seg = new THREE.Mesh(vTendrilGeo, vTendrilMat);
        seg.scale.y = len;
        seg.position.set(0, len / 2, 0);
        const tip = new THREE.Mesh(starGeo, vTendrilTipMat);
        tip.position.set(0, len, 0);
        piv.add(seg, tip);
        piv.userData.a = a;
        g.add(piv);
        g.userData.tendrils.push(piv);
      }
      this.root.add(g);
      this.vArmor = g;
      const w = this.barW;
      this.vBarMat = new THREE.MeshBasicMaterial({ color: 0xd500f9, transparent: true, depthWrite: false });
      this.vBar = new THREE.Mesh(barFgGeo, this.vBarMat);
      this.vBar.position.set(-w / 2, 0.45 * K, 0.02);
      this.vBar.scale.set(w, 0.22 * K, 1);
      this.vBar.renderOrder = 12;
      this.bar.add(this.vBar);
    }
    if (!this.vArmor) return;
    this.vArmor.visible = this.vBar.visible = on;
    if (!on) return;
    const t = performance.now() / 1000 + this.phase;
    for (const p of this.vArmor.userData.tendrils) {
      // The tendrils sway out from the body; they lash out when the enemy strikes (see lash).
      const out = 0.9 + Math.sin(t * 3 + p.userData.a * 2) * 0.35 + (this.lashT > 0 ? 0.6 : 0);
      p.rotation.z = -out;
      p.rotation.x = Math.sin(t * 2.3 + p.userData.a) * 0.3;
    }
    if (this.lashT > 0) this.lashT -= dt;
    this.vBar.scale.x = Math.max(0.001, this.barW * Math.min(1, e.vShield ?? 1));
  }

  /** Void armor tendrils lash out at towers. */
  lash() {
    this.lashT = 0.35;
  }

  /** Tint: red hit flash, then ice blue, flickering fire orange, slime green, chill blue. */
  updateFlash(dt) {
    if (this.flash > 0) this.flash -= dt;
    const st = this.status || 0;
    const burning = st & ST_BURNING && !this.dying;
    const color =
      this.flash > 0 ? 0x992222 : this.dying ? 0x000000 : st & ST_FROZEN ? 0x1e5a99
        : burning ? (Math.sin(this.phase * 9 + performance.now() / 60) > 0 ? 0x993300 : 0x662200)
          : st & ST_SHOCKED ? (Math.sin(performance.now() / 45 + this.phase) > 0.2 ? 0x8a7a00 : 0x2a2400) // Byte
          : st & ST_SLIMED ? 0x2e6b10 : st & ST_CHILLED ? 0x16405e : st & ST_GASSED ? 0x3d5a00
            : st & ST_BIOHAZARD ? 0x4a0a5e // Dumpster Child
            : st & ST_HACKED ? (Math.sin(this.phase * 5 + performance.now() / 90) > 0.6 ? 0x00838f : 0x003a40)
              : st & ST_CONFUSED ? (Math.sin(performance.now() / 120) > 0 ? 0x4a148c : 0x1a0033)
                : st & ST_ENRAGED ? (Math.sin(performance.now() / 70) > 0 ? 0x8a1500 : 0x3a0000)
                  : st & ST_GLITCHED ? (Math.sin(performance.now() / 50) > 0.3 ? 0x00626e : 0x000000)
                    : st & ST_CHARGING ? (Math.sin(performance.now() / 60) > 0 ? 0x7c00b8 : 0x26003a)
                      : st & ST_VOIDAURA ? (Math.sin(performance.now() / 300 + this.phase) > 0 ? 0x3d0057 : 0x1a0026)
                        : st & ST_HASTED ? 0x2a0045 : 0x000000;
    if (color !== this.flashOn) {
      setEmissive(this.model, color);
      this.flashOn = color;
    }
  }

  /** Bubble Blower: a see-through bubble around a floating zombie. */
  updateBubble() {
    const on = !!(this.status & ST_FLOAT) && !this.dying;
    if (on && !this.bubble) {
      this.bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
      const h = this.def.h ?? 5.2;
      this.bubble.scale.setScalar(h * 0.65);
      this.bubble.position.y = h * 0.5;
      this.root.add(this.bubble);
    }
    if (this.bubble) this.bubble.visible = on;
  }

  /** Pestilence mushrooms: a red-capped mushroom sprouting from an infected enemy's head. */
  updateShroom() {
    const on = !!(this.status & ST_SHROOM) && !this.dying;
    if (on && !this.shroom) {
      this.shroom = new THREE.Group();
      const stem = new THREE.Mesh(shroomStemGeo, shroomStemMat);
      stem.position.y = 0.35;
      const cap = new THREE.Mesh(shroomCapGeo, shroomCapMat);
      cap.position.y = 0.8;
      this.shroom.add(stem, cap);
      this.shroom.position.set(0.3, (this.def.h ?? 5.2) + 0.1, 0);
      this.root.add(this.shroom);
    }
    if (this.shroom) this.shroom.visible = on;
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
    if (this.bubble) this.bubble.visible = false;
    if (this.shroom) this.shroom.visible = false;
    this.bar.visible = false;
    this.flash = 0.1;
    const p = this.aimPoint(new THREE.Vector3());
    effects.puff(p.clone(), this.def.skin, this.def.boss ? 18 : 7, 0.45 * this.def.scale);
    if (reward) effects.text(p.add(new THREE.Vector3(0, 1.5 * K, 0)), `+$${reward}`, '#ffd54f', this.def.boss ? 5 : 2.6);
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
    if (k < 0.35) this.root.scale.setScalar(this.def.scale * K * (k / 0.35));
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
    if (u.fx != null) this.pos.set(u.fx, (this.m.fly || 0) * K, u.fz + (u.oz || 0)); // crows, bees, Volt Points
    this.root.position.copy(this.pos);
    this.root.rotation.y = u.fx != null ? u.yaw ?? 0 : Math.atan2(-tmpPt.dx, -tmpPt.dz);
    this.root.scale.multiplyScalar(K);
    this.root.traverse((o) => (o.userData.unitId = u.id)); // clickable: Game.pickAny
    scene.add(this.root);

    const w = (this.m.soldiers ? 2.4 : 3.2) * K;
    this.barW = w;
    this.bar = new THREE.Group();
    const bg = new THREE.Mesh(barBgGeo, unitBarMat);
    bg.scale.set(w + 0.2 * K, 0.45 * K, 1);
    bg.renderOrder = 10;
    this.fgMat = new THREE.MeshBasicMaterial({ color: 0x42a5f5, transparent: true, depthWrite: false });
    this.fg = new THREE.Mesh(barFgGeo, this.fgMat);
    this.fg.position.set(-w / 2, 0, 0.01);
    this.fg.scale.set(w, 0.28 * K, 1);
    this.fg.renderOrder = 11;
    this.bar.add(bg, this.fg);
    this.bar.visible = u.maxHp > 1; // crows, bees and Volt Points have no health to show
    scene.add(this.bar);
  }

  /** Mirror sim unit `u` (dist, lateral, speed, yaw, hp, maxHp, alive). Units drive toward the entrance. */
  sync(u, dt, camera) {
    const m = this.m;
    if (m.wings) {
      // Crows and bees flap (wings stick out along ±X; bees much faster).
      this.flap = (this.flap || 0) + dt * (m.fly && m.fly < 4 ? 40 : 12);
      const a = Math.sin(this.flap) * 0.6;
      m.wings[0].rotation.z = a;
      m.wings[1].rotation.z = -a;
    }
    if (u.fx != null) {
      // Free flyers: straight to the sim's position, facing where they fly.
      tmp.set(u.fx, (m.fly || 0) * K + Math.sin((this.flap || 0) * 0.15) * 0.2 * K, u.fz + (u.oz || 0));
      this.pos.lerp(tmp, Math.min(1, dt * 12));
      this.root.position.copy(this.pos);
      this.root.rotation.y = lerpAngle(this.root.rotation.y, u.yaw ?? 0, Math.min(1, dt * 8));
      this.bar.position.set(this.pos.x, (m.height + (m.fly || 0) + 0.8) * K, this.pos.z);
      this.bar.quaternion.copy(camera.quaternion);
      return;
    }
    if (m.bounce) m.bounce.position.y = Math.abs(Math.sin(this.phase * 1.5)) * 1.2; // Chaos Ball
    path.at(u.dist, tmpPt);
    tmp.set(-tmpPt.dz, 0, tmpPt.dx).multiplyScalar(u.lateral);
    this.off.lerp(tmp, Math.min(1, dt * 4));
    this.pos.set(tmpPt.x, (m.fly || 0) * K, tmpPt.z + (u.oz || 0)).add(this.off); // Gift Bombers fly
    this.root.position.copy(this.pos);
    this.root.rotation.y = lerpAngle(this.root.rotation.y, Math.atan2(-tmpPt.dx, -tmpPt.dz), Math.min(1, dt * 6));
    const local = (u.yaw ?? 0) - this.root.rotation.y; // aim direction relative to the body
    const speed = u.speed ?? 0;
    this.phase += (dt * speed * 1.4) / K;
    if (m.turret) m.turret.rotation.y = lerpAngle(m.turret.rotation.y, local, Math.min(1, dt * 10));
    for (const w of m.wheels) w.rotation.x += (dt * speed * 1.8) / K;
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
    this.bar.position.set(this.pos.x, (m.height + (m.fly || 0) + 0.8) * K, this.pos.z);
    this.bar.quaternion.copy(camera.quaternion);
    const r = Math.max(0, u.hp / u.maxHp);
    this.fg.scale.x = Math.max(0.001, this.barW * r);
  }

  /** World position of the unit's (first) muzzle. */
  muzzlePosition(out) {
    this.root.updateMatrixWorld(true);
    return simPos(this.m.muzzles[0] ?? this.root, out);
  }

  /** Visual-only shot (or cannon blast with `cannon`) at an enemy view. */
  shoot(enemyView, effects, audio, i, cannon, rail) {
    const m = this.m;
    const muzzle = cannon ? m.cannon : m.muzzles[(i ?? this.shots++) % m.muzzles.length];
    if (!muzzle) return;
    this.root.updateMatrixWorld(true);
    const from = simPos(muzzle, new THREE.Vector3());
    if (enemyView) {
      // Laser Behemoth railguns: a thick glowing beam right across the map.
      effects.tracer(from, enemyView.aimPoint(tmp), cannon ? 0xff9100 : m.tracer, cannon ? 0.3 : rail ? 0.5 : undefined);
      enemyView.hit();
    }
    effects.flash(from, cannon ? 0xffab40 : rail ? m.tracer ?? 0xfff3b0 : 0xfff3b0, cannon ? 1.5 : rail ? 1.6 : 0.6);
    if (cannon || rail) audio.boom(3);
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
    this.h.root.scale.setScalar(PLAYER_SCALE);
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

// ------------------------------------------------------------------ Beholder time bombs

const bombGeo = new THREE.SphereGeometry(1.1, 16, 12);
const bombMat = new THREE.MeshLambertMaterial({ color: 0x212121, emissive: 0x1a0033 });
const bombRingGeo = new THREE.TorusGeometry(1.5, 0.14, 6, 24);
const bombRingMat = new THREE.MeshBasicMaterial({ color: 0xffd740 });
const bombLightGeo = new THREE.SphereGeometry(0.38, 10, 8);

/**
 * A Beholder time bomb stuck to a tower: a black bomb wrapped in a spinning gold clock ring, with a
 * red light that blinks faster as it runs out and a countdown over it. Click it to defuse it
 * (every mesh carries userData.bombId).
 */
export class BombView {
  constructor(scene, b) {
    this.scene = scene;
    this.id = b.id;
    this.group = new THREE.Group();
    this.group.position.set(b.x, 7, b.z);
    const body = new THREE.Mesh(bombGeo, bombMat);
    this.ring = new THREE.Mesh(bombRingGeo, bombRingMat);
    this.lightMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
    this.light = new THREE.Mesh(bombLightGeo, this.lightMat);
    this.light.position.y = 1.15;
    // A bigger see-through ball around it so it's easy to click.
    this.hit = new THREE.Mesh(bombGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    this.hit.scale.setScalar(2.2);
    this.group.add(body, this.ring, this.light, this.hit);
    this.group.traverse((o) => (o.userData.bombId = b.id));
    this.shown = -1;
    this.label = null;
    this.t = 0;
    scene.add(this.group);
  }

  sync(b, dt) {
    this.t += dt;
    this.group.position.set(b.x, 7 + Math.sin(this.t * 3) * 0.3, b.z);
    this.ring.rotation.x = this.t * 2;
    this.ring.rotation.y = this.t * 1.3;
    const rate = b.left < 4 ? 10 : b.left < 8 ? 5 : 2.5;
    this.lightMat.color.setHex(Math.sin(this.t * rate * Math.PI) > 0 ? 0xff1744 : 0x3a0000);
    const secs = Math.max(0, Math.ceil(b.left));
    if (secs !== this.shown) {
      this.shown = secs;
      if (this.label) {
        this.group.remove(this.label);
        this.label.material.map.dispose();
        this.label.material.dispose();
      }
      this.label = makeNameTag(`⏰ ${secs}`, secs <= 5 ? 0xff1744 : 0xffd740);
      this.label.scale.set(6, 1.1, 1);
      this.label.position.y = 2.6;
      this.label.userData.bombId = b.id;
      this.group.add(this.label);
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.lightMat.dispose();
    this.hit.material.dispose();
    if (this.label) {
      this.label.material.map.dispose();
      this.label.material.dispose();
    }
  }
}

// ---------------------------------------------------------------- Void mode

const markMat = new THREE.MeshBasicMaterial({ color: 0xd500f9, transparent: true, opacity: 0.9, depthWrite: false });
const markBarGeo = new THREE.BoxGeometry(5, 0.7, 0.7);
const markRingGeo = new THREE.TorusGeometry(3.2, 0.18, 6, 32);

/** VOID's mark: a big spinning purple X over a tower, with a countdown, then it's destroyed. */
export class MarkView {
  constructor(scene, k) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.x = new THREE.Group();
    for (const s of [-1, 1]) {
      const bar = new THREE.Mesh(markBarGeo, markMat);
      bar.rotation.z = (s * Math.PI) / 4;
      this.x.add(bar);
    }
    this.ring = new THREE.Mesh(markRingGeo, markMat);
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = -8.5;
    this.group.add(this.x, this.ring);
    this.t = 0;
    this.shown = -1;
    this.label = null;
    scene.add(this.group);
    this.sync(k, 0);
  }

  sync(k, dt) {
    this.t += dt;
    this.group.position.set(k.x, 10 + Math.sin(this.t * 4) * 0.3, k.z);
    this.x.rotation.y = this.t * 2.5;
    const s = 1 + Math.max(0, 0.25 * Math.sin(this.t * (k.left < 2 ? 22 : 10)));
    this.x.scale.setScalar(s);
    this.ring.scale.setScalar(1 + (1 - (k.left % 1)) * 0.3);
    const secs = Math.max(0, Math.ceil(k.left));
    if (secs !== this.shown) {
      this.shown = secs;
      this.dropLabel();
      this.label = makeNameTag(`✖ ${secs}`, 0xff1744);
      this.label.scale.set(6, 1.1, 1);
      this.label.position.y = 3;
      this.group.add(this.label);
    }
  }

  dropLabel() {
    if (!this.label) return;
    this.group.remove(this.label);
    this.label.material.map.dispose();
    this.label.material.dispose();
  }

  dispose() {
    this.scene.remove(this.group);
    this.dropLabel();
  }
}

const orbGeo = new THREE.SphereGeometry(1.4, 16, 12);
const orbCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const orbGlowMat = new THREE.MeshBasicMaterial({ color: 0xd500f9, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending });
const orbRingGeo = new THREE.TorusGeometry(2.2, 0.12, 6, 24);
const orbRingMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });

/** VOID's magic missile: a pulsing orb of void floating down the path. Walk into it to pop it! */
export class OrbView {
  constructor(scene, o) {
    this.scene = scene;
    this.group = new THREE.Group();
    const core = new THREE.Mesh(orbGeo, orbCoreMat);
    core.scale.setScalar(0.45);
    this.glow = new THREE.Mesh(orbGeo, orbGlowMat);
    this.rings = [0, 1].map((i) => {
      const r = new THREE.Mesh(orbRingGeo, orbRingMat);
      r.rotation.x = i * Math.PI / 2;
      this.group.add(r);
      return r;
    });
    this.group.add(core, this.glow);
    this.label = makeNameTag('🔮 Touch to pop!', 0xea80fc);
    this.label.scale.set(7, 1.1, 1);
    this.label.position.y = 3.4;
    this.group.add(this.label);
    this.t = Math.random() * 10;
    this.group.position.set(o.x, 3, o.z);
    scene.add(this.group);
  }

  sync(o, dt) {
    this.t += dt;
    const p = this.group.position;
    p.x += (o.x - p.x) * Math.min(1, dt * 8);
    p.z += (o.z - p.z) * Math.min(1, dt * 8);
    p.y = 3 + Math.sin(this.t * 3) * 0.4;
    this.glow.scale.setScalar(1.3 + Math.sin(this.t * 8) * 0.25);
    this.rings[0].rotation.y = this.t * 3;
    this.rings[1].rotation.z = this.t * 2.2;
  }

  dispose() {
    this.scene.remove(this.group);
    this.label.material.map.dispose();
    this.label.material.dispose();
  }
}

/**
 * Gold Commander Orbital Airstrike: a giant yellow beam of light from the sky down to a glowing
 * disc on the ground, with a bright core. It glides after the sim's position and fades out at the end.
 */
const beamColGeo = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true).translate(0, 0.5, 0);
const beamDiscGeo = new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2);
export class BeamView {
  constructor(scene, b) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.outerMat = new THREE.MeshBasicMaterial({ color: 0xffd600, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    this.coreMat = new THREE.MeshBasicMaterial({ color: 0xfffde7, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
    this.discMat = new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    const h = 120;
    this.outer = new THREE.Mesh(beamColGeo, this.outerMat);
    this.outer.scale.set(b.r, h, b.r);
    this.core = new THREE.Mesh(beamColGeo, this.coreMat);
    this.core.scale.set(b.r * 0.4, h, b.r * 0.4);
    this.disc = new THREE.Mesh(beamDiscGeo, this.discMat);
    this.disc.position.y = 0.2;
    this.disc.scale.setScalar(b.r * 1.3);
    for (const o of [this.outer, this.core, this.disc]) o.renderOrder = 6;
    this.group.add(this.outer, this.core, this.disc);
    this.group.position.set(b.x, 0, b.z);
    this.t = 0;
    this.r = b.r;
    scene.add(this.group);
  }

  sync(b, dt) {
    this.t += dt;
    const p = this.group.position;
    const k = Math.min(1, dt * 12);
    p.x += (b.x - p.x) * k;
    p.z += (b.z - p.z) * k;
    const fade = Math.min(1, b.left / 0.6); // fades out in its last moments
    const flick = 0.85 + Math.sin(this.t * 30) * 0.1 + Math.random() * 0.05;
    this.outerMat.opacity = 0.35 * fade * flick;
    this.coreMat.opacity = 0.8 * fade * flick;
    this.discMat.opacity = 0.55 * fade;
    this.disc.scale.setScalar(this.r * (1.2 + Math.sin(this.t * 12) * 0.15));
    this.outer.rotation.y += dt * 4;
  }

  dispose() {
    this.scene.remove(this.group);
    this.outerMat.dispose();
    this.coreMat.dispose();
    this.discMat.dispose();
  }
}
