// Mouse and keys: clicking and picking things, range rings, and placing a tower.
// These are methods of GameClient: game.js puts them on the class, so "this" is the game client.

import * as THREE from 'three';
import { TOWERS, facesCone, rootType } from '../config.js';
import { ABILITY_BAR_KEYS } from '../ui.js';
import { TOWER_MODELS, setEmissive, setOpacity } from '../models.js';
import { clamp } from '../utils.js';
import { MODEL_SCALE, WORLD_SCALE } from '../scale.js';
import { path } from '../sim/path.js';
import { CLIFFS, canPlace, heightAt, laneOf, laneOz, mapInfo, placeFail } from '../sim/map.js';
import { ABILITY_KEYS, CAM_PITCH_MIN, FPS_LOOK, innerRings, ringRadius } from './shared.js';

export class GameInput {

  // ------------------------------------------------------------------ input

  bindInput() {
    const canvas = this.canvas;
    let rotating = false;
    let leftDown = null;
    const typing = (e) => /^(INPUT|TEXTAREA)$/.test(e.target?.tagName);

    window.addEventListener('keydown', (e) => {
      this.shiftHeld = e.shiftKey;
      if (!this.session || typing(e)) return;
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (e.code === 'Enter' && this.session.mp) {
        e.preventDefault();
        this.keys.clear();
        this.ui.openChat();
        return;
      }
      if (this.fps) {
        // FPS Mode: F, Q or Escape hands the Gatling Gun back to its autopilot.
        if (!e.repeat && (e.code === 'KeyF' || e.code === 'KeyQ' || e.code === 'Escape')) this.exitFps(true);
        else this.keys.add(e.code); // Combat Drone Direct Control: WASD flies it
        return;
      }
      this.keys.add(e.code);
      if (e.repeat || this.ended) return;
      const slot = /^Digit([1-9])$/.exec(e.code);
      const type = slot && this.loadout[Number(slot[1]) - 1];
      if (type) this.placing === type ? this.cancelPlace() : this.beginPlace(type);
      if (e.code === 'Escape' || e.code === 'KeyQ') {
        this.ui.hideWheel();
        if (this.ordering) {
          this.ordering = null;
          this.ring.visible = false;
          return;
        }
        if (this.aiming) {
          this.stopAim(); // just stop aiming, keep the tower selected
          return;
        }
        this.cancelPlace();
        this.deselect();
      }
      // While placing, R turns the tower a quarter turn instead of using its ability bar slot.
      if (e.code === 'KeyR' && this.placing) {
        this.placeRot = (this.placeRot + Math.PI / 2) % (Math.PI * 2);
        return;
      }
      const barSlot = ABILITY_BAR_KEYS.indexOf(e.code);
      if (barSlot >= 0) this.useAbilityGroup(barSlot);
      if (e.code in ABILITY_KEYS) {
        const t = this.state?.towers.get(this.selectedId);
        const ab = t && TOWERS[t.type].levels[t.level].abilities?.[ABILITY_KEYS[e.code]];
        if (ab) this.useAbility(ab.key);
      }
      if (e.code === 'KeyE') this.towerAction('upgrade');
      if (e.code === 'KeyX') this.towerAction('sell');
      if (e.code === 'KeyT') this.towerAction('target');
    });
    window.addEventListener('keyup', (e) => {
      this.shiftHeld = e.shiftKey;
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    let rightDown = null;
    canvas.addEventListener('mousedown', (e) => {
      if (this.fps) {
        if (e.button === 0) this.setFpsFire(true);
        return;
      }
      if (e.button === 2) {
        rotating = true;
        rightDown = { x: e.clientX, y: e.clientY };
      }
      if (e.button === 0) leftDown = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', (e) => {
      if (this.fps && e.button === 0) {
        this.setFpsFire(false);
        leftDown = null;
        return;
      }
      if (e.button === 2) {
        rotating = false;
        // A right-click without dragging (dragging turns the camera) opens the order wheel.
        if (rightDown && Math.hypot(e.clientX - rightDown.x, e.clientY - rightDown.y) < 6) this.openWheel(e.clientX, e.clientY);
        rightDown = null;
      }
      if (e.button === 0 && leftDown) {
        const moved = Math.hypot(e.clientX - leftDown.x, e.clientY - leftDown.y);
        leftDown = null;
        if (moved < 6) this.handleClick();
      }
    });
    window.addEventListener('mousemove', (e) => {
      this.mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      if (this.fps) {
        if (document.pointerLockElement === canvas) {
          this.fps.yaw -= e.movementX * FPS_LOOK;
          this.fps.pitch = clamp(this.fps.pitch - e.movementY * FPS_LOOK, -0.7, 0.6);
        }
        return;
      }
      if (rotating && this.session) {
        this.cam.yaw -= e.movementX * 0.006;
        this.cam.pitch = clamp(this.cam.pitch + e.movementY * 0.005, CAM_PITCH_MIN, 1.4);
      }
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (this.session && !this.fps) this.cam.dist = clamp(this.cam.dist * (e.deltaY > 0 ? 1.1 : 1 / 1.1), 3, 90);
      },
      { passive: false },
    );
    document.addEventListener('pointerlockchange', () => {
      if (!this.fps) return;
      // Pressing Escape releases the mouse: that also leaves FPS Mode.
      if (document.pointerLockElement === canvas) this.fps.locked = true;
      else if (this.fps.locked) this.exitFps(true);
    });
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  /** Keeps a map of simple views (VOID's marks, orbs) in step with a list of { id, ... } items. */
  syncList(views, items, make, dt) {
    for (const it of items) {
      let v = views.get(it.id);
      if (!v) views.set(it.id, (v = make(it)));
      v.sync(it, dt);
    }
    if (views.size === items.length) return;
    for (const [id, v] of views) {
      if (items.some((it) => it.id === id)) continue;
      v.dispose();
      views.delete(id);
    }
  }

  /** Shakes the camera for `time` s, `amount` studs at first. */
  shake(time, amount) {
    if (this.shakeT > 0 && this.shakeAmt * (this.shakeT / this.shakeMax) > amount) return;
    this.shakeT = this.shakeMax = time;
    this.shakeAmt = amount;
  }

  handleClick() {
    if (!this.session || this.ended || this.fps) return;
    // Beholder time bombs: clicking one defuses it (even while placing or aiming).
    const bomb = this.pickBomb();
    if (bomb != null) return this.session.send({ a: 'defuse', id: bomb });
    if (this.ordering) return this.tryOrder();
    if (this.placing) return this.tryPlace();
    if (this.aiming) return this.tryAim();
    const hit = this.pickAny();
    if (hit?.kind === 'tower') this.select(hit.id);
    else if (hit) this.selectSub(hit);
    else this.deselect();
  }

  /**
   * What's under the mouse: a tower ({ kind: 'tower', id }), or something a tower put out: its
   * plane / helicopter ('plane', the tower's id), a sentry or gravestone ('trap') or a unit ('unit').
   */
  pickAny() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const objs = [...this.towerViews.values()].map((v) => v.group);
    for (const v of this.trapViews.values()) if (v.kind === 'sentry' || v.kind === 'grave') objs.push(v.group);
    for (const v of this.unitViews.values()) objs.push(v.root);
    let near = null; // a unit whose click box (bigger than the unit) is under the mouse
    for (const { object: o } of this.raycaster.intersectObjects(objs, true)) {
      const d = o.userData;
      if (d.pad) {
        near ??= { kind: 'unit', id: d.unitId };
        continue;
      }
      if (d.sub === 'plane' && d.towerId != null) return { kind: 'plane', id: d.towerId };
      if (d.towerId != null) return { kind: 'tower', id: d.towerId };
      if (d.trapId != null) return { kind: 'trap', id: d.trapId };
      if (d.unitId != null) return { kind: 'unit', id: d.unitId };
    }
    return near;
  }

  /** The Beholder time bomb under the mouse (id), if any. */
  pickBomb() {
    if (!this.bombViews?.size) return null;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hit = this.raycaster.intersectObjects([...this.bombViews.values()].map((v) => v.group), true)[0];
    return hit?.object.userData.bombId ?? null;
  }

  /** The tower under the mouse (id), if any. */
  pickTower() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const groups = [...this.towerViews.values()].map((v) => v.group);
    return this.raycaster.intersectObjects(groups, true)[0]?.object.userData.towerId;
  }

  /** Mouse point on the ground, or on a cliff top when the cursor is over one. */
  pickGround() {
    // The map group is scaled, so move the ray into sim units (uniform scale: only the origin changes).
    this.simRay ??= new THREE.Ray();
    const ray = this.simRay.copy(this.raycaster.ray);
    ray.origin.multiplyScalar(1 / WORLD_SCALE);
    const hit = new THREE.Vector3();
    let best = Infinity;
    this.hasGround = false;
    const lanes = this.versus ? this.state.lanes : 1;
    for (let i = 0; i < (path.time ? 0 : lanes * CLIFFS.length); i++) {
      const c = CLIFFS[i % CLIFFS.length];
      const cz = c.z + laneOz(Math.floor(i / CLIFFS.length));
      this.cliffPlane ??= new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      this.cliffPlane.constant = -c.h;
      if (!ray.intersectPlane(this.cliffPlane, hit) || Math.hypot(hit.x - c.x, hit.z - cz) >= c.r) continue;
      const d = hit.distanceToSquared(ray.origin);
      if (d < best) {
        best = d;
        this.groundHit.copy(hit);
        this.hasGround = true;
      }
    }
    if (!this.hasGround && (mapInfo.nexus || mapInfo.floors) && !path.time) {
      // Twilight Nexus: the platform, the upper deck, then the lower floor (Sunset Crossing: its
      // terrain heights); the first floor the ray meets that really is at that height.
      this.floorPlane ??= new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      for (const h of mapInfo.floors ?? [12, 10]) {
        this.floorPlane.constant = -h;
        if (ray.intersectPlane(this.floorPlane, hit) && heightAt(hit.x, hit.z) === h) {
          this.groundHit.copy(hit);
          this.hasGround = true;
          break;
        }
      }
    }
    if (!this.hasGround) this.hasGround = !!ray.intersectPlane(this.groundPlane, this.groundHit);
  }

  // ------------------------------------------------------------------ range ring

  buildRing() {
    this.ring = new THREE.Group();
    this.ringEdgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false });
    this.ringFillMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, depthWrite: false });
    const edge = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 96), this.ringEdgeMat);
    const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 96), this.ringFillMat);
    for (const m of [edge, fill]) {
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = 5;
      this.ring.add(m);
    }
    // Extra rings inside it (Engineer build ring and deadzone), scaled as a share of the range.
    this.innerRings = [0, 1].map(() => {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false });
      const m = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 96), mat);
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = 5;
      m.visible = false;
      this.ring.add(m);
      return m;
    });
    this.ring.visible = false;
    this.scene.add(this.ring);
    // Gatling Gun: a pie-slice for its cone (rebuilt when the cone's width changes).
    this.cone = new THREE.Group();
    this.coneMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
    this.coneMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.coneMat);
    this.coneMesh.rotation.x = -Math.PI / 2;
    this.coneMesh.renderOrder = 5;
    this.cone.add(this.coneMesh);
    this.cone.visible = false;
    this.coneWidth = -1;
    this.scene.add(this.cone);
  }

  /** Shows a cone of half-angle `cone` and length `r` from (x, z), pointing along `yaw`. */
  showCone(x, z, r, yaw, cone, color) {
    if (cone !== this.coneWidth) {
      this.coneWidth = cone;
      this.coneMesh.geometry.dispose();
      // In the group's frame the cone points along +Z (circle angle -90° once laid flat).
      this.coneMesh.geometry = new THREE.CircleGeometry(1, 40, -Math.PI / 2 - cone, cone * 2);
    }
    this.cone.position.set(x, heightAt(x, z) + 0.34, z);
    this.cone.rotation.y = yaw;
    this.cone.scale.set(r, 1, r);
    this.coneMat.color.setHex(color);
    this.cone.visible = true;
    this.ring.visible = false;
  }

  showRing(x, z, r, color, inner = null) {
    this.cone.visible = false;
    this.ring.position.set(x, 0.32, z);
    this.ring.scale.set(r, 1, r);
    this.innerRings.forEach((m, i) => {
      const ir = inner?.[i];
      m.visible = !!ir && ir.r > 0;
      if (!m.visible) return;
      const k = ir.r / r;
      m.scale.set(k, k, 1); // the mesh is laid flat, so its own x/y are the ground plane
      m.material.color.setHex(ir.color);
    });
    this.ringEdgeMat.color.setHex(color);
    this.ringFillMat.color.setHex(color);
    this.ring.visible = true;
  }

  // ------------------------------------------------------------------ placement

  myTowerCount(type) {
    let n = 0;
    for (const t of this.state.towers.values()) if (t.owner === this.session.myId && !t.holo && rootType(t.type) === type) n++;
    return n;
  }

  beginPlace(type) {
    if (!this.session || this.ended) return;
    const def = TOWERS[type];
    if (this.spectating) return this.fail("You're out! Watch the others battle it out.");
    if (!this.loadout.includes(type)) return this.fail(`${def.name} isn't in your loadout`);
    const cost = this.costOf(type);
    if (this.myCash < cost) return this.fail(`Not enough cash! ${def.name} costs $${cost}`);
    const limit = this.limitOf(type);
    if (this.myTowerCount(type) >= limit) return this.fail(`Placement limit reached (${limit})`);
    this.cancelPlace();
    this.deselect();
    this.placing = type;
    this.ghost = TOWER_MODELS[type](0);
    this.ghost.root.scale.setScalar(MODEL_SCALE);
    setOpacity(this.ghost, 0.55);
    this.ghost.root.visible = false;
    this.scene.add(this.ghost.root);
  }

  cancelPlace() {
    if (this.ghost) {
      this.scene.remove(this.ghost.root);
      this.ghost.mats.forEach((m) => m.dispose());
    }
    this.ghost = null;
    this.placing = null;
    if (this.selectedId == null) this.ring.visible = false;
    if (this.cone) this.cone.visible = false;
  }

  updateGhost() {
    if (this.ordering) {
      // "Move it…": a blue ring follows the mouse until the spot is clicked.
      this.pickGround();
      if (this.hasGround) this.showRing(this.groundHit.x, this.groundHit.z, 4, 0x29b6f6);
      else this.ring.visible = false;
      return;
    }
    const a = this.aiming;
    if (a?.key === 'clone') {
      // Hologram Tower: nothing to show until a tower is picked, then a see-through cyan copy.
      if (a.ghost) this.moveGhost(a.ghost, a.type, a.level, 0x006064);
      else this.ring.visible = this.cone.visible = false;
      return;
    }
    if (a) {
      if (this.hasGround) this.showRing(this.groundHit.x, this.groundHit.z, a.radius, a.reach && !this.leapOk(a) ? 0x9e9e9e : 0xff5722);
      else this.ring.visible = false;
    }
    if (this.ghost) this.moveGhost(this.ghost, this.placing, 0, 0x000000);
  }

  /** Brawler Reposition: can the tower being aimed land where the mouse is? */
  leapOk(a) {
    const t = this.state?.towers.get(a.id);
    if (!t) return false;
    const { x, z } = this.groundHit;
    if (Math.hypot(x - t.x, z - t.z) > a.reach) return false;
    if (a.key !== 'reposition' && a.key !== 'teleport' && a.key !== 'jump') return true; // Thorns / Target Select only need to be in reach
    return canPlace(x, z, [...this.state.towers.values()].filter((o) => o !== t), TOWERS[t.type].placement);
  }

  /** Puts a placement ghost under the mouse, red where `type` can't go, with its range ring. */
  moveGhost(g, type, level, tint) {
    g.root.visible = this.hasGround;
    if (!this.hasGround) {
      this.ring.visible = this.cone.visible = false;
      return;
    }
    const { x, z } = this.groundHit;
    const def = TOWERS[type];
    if (this.versus) {
      // Versus: you can only build on your own map; check against its local layout.
      const oz = laneOz(this.myLane);
      const mine = [...this.state.towers.values()].filter((t) => laneOf(t.z) === this.myLane).map((t) => ({ x: t.x, z: t.z - oz }));
      g.valid = laneOf(z) === this.myLane && canPlace(x, z - oz, mine, def.placement);
    } else g.valid = canPlace(x, z, this.state.towers.values(), def.placement);
    g.root.position.set(x, heightAt(x, z) + 0.4 * MODEL_SCALE, z);
    // Face the camera; the Gatling Gun faces away from it (its cone points where you look).
    g.root.rotation.y = this.cam.yaw + (this.ghost === g ? this.placeRot : 0) + (facesCone(def) ? Math.PI : 0);
    setEmissive(g, g.valid ? tint : 0xaa0000);
    const color = g.valid ? 0x4caf50 : 0xf44336;
    if (facesCone(def)) this.showCone(x, z, ringRadius(type, level, null, x, z), g.root.rotation.y, def.levels[level].cone, color);
    else this.showRing(x, z, ringRadius(type, level, null, x, z), color, innerRings(type, level));
  }

  tryPlace() {
    const def = TOWERS[this.placing];
    if (this.versus && this.hasGround && laneOf(this.groundHit.z) !== this.myLane) return this.fail('You can only build on your own map!');
    if (!this.hasGround || !this.ghost?.valid) {
      return this.fail(placeFail(def));
    }
    const cost = this.costOf(this.placing);
    if (this.myCash < cost) return this.fail('Not enough cash!');
    const type = this.placing;
    this.session.send({ a: 'place', type, x: this.groundHit.x, z: this.groundHit.z, yaw: this.cam.yaw + this.placeRot });
    this.cancelPlace();
    // Hold Shift to keep placing the same tower.
    if (this.shiftHeld && this.myCash >= cost * 2) this.beginPlace(type);
  }
}
