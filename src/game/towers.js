// The selected tower: selecting, upgrading, abilities, aiming, and first-person mode.
// These are methods of GameClient: game.js puts them on the class, so "this" is the game client.

import { PERKS, TOWERS, cloneCost, rootType, timedAbility, xpKey } from '../config.js';
import { profile } from '../profile.js';
import { audio } from '../audio.js';
import { TOWER_MODELS, setOpacity } from '../models.js';
import { clamp } from '../utils.js';
import { MODEL_SCALE, WORLD_SCALE } from '../scale.js';
import { BOUNDS } from '../sim/path.js';
import { heightAt, laneOf, laneOz, placeFail } from '../sim/map.js';
import { FPS_BACK, computeBuffs, nextUpgrade } from '../sim/sim.js';
import { FPS_SEND_INTERVAL, XP_PER_WAVE_CAP } from './shared.js';

export class GameTowers {

  // ------------------------------------------------------------------ selection

  select(id) {
    this.deselect();
    this.selectedId = id;
    this.towerViews.get(id)?.setSelected(true);
    this.uiTimer = 0; // refresh panel now
  }

  /** Selects a plane, sentry, gravestone or unit: its own stats panel, and a ring that follows it. */
  selectSub(sub) {
    this.deselect();
    this.selectedSub = sub;
    this.uiTimer = 0; // refresh panel now
  }

  /** From a sub's panel: select the tower it belongs to. */
  selectParent() {
    const st = this.state;
    const sub = this.selectedSub;
    if (!sub || !st) return;
    const id = sub.kind === 'plane' ? sub.id : sub.kind === 'trap' ? st.traps?.get(sub.id)?.tower : st.units.get(sub.id)?.tower;
    if (id != null && st.towers.has(id)) this.select(id);
  }

  /** Every frame: keep the selected sub's range ring under it as it moves. */
  updateSubRing() {
    const sub = this.selectedSub;
    if (!sub || this.placing || this.aiming || !this.subRing) return;
    const p = this.subPos;
    if (sub.kind === 'plane') this.towerViews.get(sub.id)?.planePos(p);
    else if (sub.kind === 'unit') {
      const v = this.unitViews.get(sub.id);
      if (v) p.copy(v.pos);
    } else {
      const tr = this.state.traps?.get(sub.id);
      if (tr) p.set(tr.x, 0, tr.z);
    }
    if (this.subRing.range > 0) this.showRing(p.x, p.z, this.subRing.range, 0x80deea);
    else this.ring.visible = this.cone.visible = false;
  }

  deselect() {
    this.stopAim();
    if (this.selectedId != null) this.towerViews.get(this.selectedId)?.setSelected(false);
    this.selectedId = null;
    this.selectedSub = null;
    this.subRing = null;
    this.ui.hidePanel();
    if (!this.placing) {
      this.ring.visible = false;
      this.cone.visible = false;
    }
  }

  /** The evolution level upgrade level `next` of my tower `type` still needs, or 0 if I have it. */
  evoNeed(type, next) {
    if (!next?.evo) return 0;
    return profile.levelOf(rootType(type)).level >= next.evo ? 0 : next.evo;
  }

  /** Why I can't buy upgrade level `next` yet (evolution level or a mode win perk), or null. */
  upgradeLock(type, next) {
    if (next?.perk && !profile.hasPerk(next.perk)) return `${PERKS[next.perk]} to unlock`;
    const need = this.evoNeed(type, next);
    return need ? `Needs evolution Lv ${need}` : null;
  }

  /**
   * Tower XP: every time a wave starts, each tower type I have out earns XP, more for more
   * towers and higher levels (capped per type, so one wave can't give too much).
   */
  earnXp() {
    const st = this.state;
    const me = this.session?.myId;
    if (!st || this.spectating || this.ended) return;
    const gains = {};
    for (const t of st.towers.values()) {
      if (t.owner !== me || t.holo) continue;
      const k = xpKey(t.type);
      gains[k] = Math.min(XP_PER_WAVE_CAP, (gains[k] || 0) + 1 + t.level);
    }
    profile.addXp(gains);
  }

  /** Upgrade / sell / target. `path`: 'bottom' to take the Bottom upgrade path at a fork. */
  /** Trapper traps / Mercenary Base units: switch one on or off. */
  towerPick(key) {
    const t = this.state?.towers.get(this.selectedId);
    if (!t || this.ended) return;
    if (t.owner !== this.session.myId) return this.fail("That's not your tower!");
    this.session.send({ a: 'pick', id: t.id, key });
    this.uiTimer = 0;
  }

  /** Jester bombs / Biologist plant queues: pick what slot `slot` uses. */
  towerChoose(slot, key) {
    const t = this.state?.towers.get(this.selectedId);
    if (!t || this.ended) return;
    if (t.owner !== this.session.myId) return this.fail("That's not your tower!");
    this.session.send({ a: 'choose', id: t.id, slot: Number(slot), key });
    this.uiTimer = 0;
  }

  towerAction(a, path = null) {
    const t = this.state?.towers.get(this.selectedId);
    if (!t || this.ended) return;
    if (t.owner !== this.session.myId) return this.fail("That's not your tower!");
    if (a === 'upgrade') {
      const def = TOWERS[t.type];
      // E (no path) on a crosspath tower upgrades the Top path, or the Bottom one if Top can't go on.
      let up = nextUpgrade(t, path === 'bottom' ? 'bottom' : 'top', this.state.towers.values(), computeBuffs(this.state.towers.values()));
      if (!up && def.cross && !path) {
        up = nextUpgrade(t, 'bottom', this.state.towers.values(), computeBuffs(this.state.towers.values()));
        if (up) path = 'bottom';
      }
      if (!up) return this.fail(def.cross && def.cross.a + def.cross.b > 0 ? "That path can't go any higher" : 'Already max level!');
      const next = up.next;
      if (next?.perk && !profile.hasPerk(next.perk)) return this.fail(`${PERKS[next.perk]} to unlock this upgrade`);
      const need = this.evoNeed(t.type, next);
      if (need) return this.fail(`Needs evolution level ${need} (earn XP by using the ${def.name})`);
      if (this.myCash < up.cost) return this.fail(`Need $${up.cost} to upgrade`);
    }
    this.session.send(path ? { a, id: t.id, path } : { a, id: t.id });
    if (a === 'sell') this.deselect();
    this.uiTimer = 0;
  }

  /**
   * Every ability on my towers, grouped by tower type + ability (e.g. all my Commanders'
   * Call to Arms). Ordered by the oldest tower in each group so bar slots stay put.
   * Each: { id, type, ab, towers: [tower...], ready, cd (soonest recharge), active }.
   */
  abilityGroups() {
    const st = this.state;
    const myId = this.session?.myId;
    if (!st || !myId) return [];
    const groups = new Map();
    for (const t of st.towers.values()) {
      if (t.owner !== myId) continue;
      for (const ab of TOWERS[t.type].levels[t.level].abilities || []) {
        if (ab.versus && !this.versus) continue; // can't be used outside Versus
        const id = `${t.type}|${ab.key}`;
        let g = groups.get(id);
        if (!g) groups.set(id, (g = { id, type: t.type, ab, towers: [], first: t.id }));
        g.towers.push(t);
        g.first = Math.min(g.first, t.id);
      }
    }
    const list = [...groups.values()].sort((a, b) => a.first - b.first);
    for (const g of list) {
      g.towers.sort((a, b) => (a.cd?.[g.ab.key] || 0) - (b.cd?.[g.ab.key] || 0) || a.id - b.id);
      g.ready = g.towers.filter((t) => !(t.cd?.[g.ab.key] > 0)).length;
      g.cd = g.towers[0].cd?.[g.ab.key] || 0;
      g.active = Math.max(0, ...g.towers.map((t) => (timedAbility(g.ab) && t.active) || 0));
    }
    return list;
  }

  /** Ability bar slot `i`: fires the ability on the next ready tower of that group. */
  useAbilityGroup(i) {
    const g = this.abilityGroups()[i];
    if (!g || this.ended || this.spectating) return;
    this.useAbility(g.ab.key, g.towers[0].id); // towers are sorted readiest first
    this.uiTimer = 0;
  }

  /** Ability button / key. Airstrike first asks for a spot on the map. */
  useAbility(key, towerId = this.selectedId) {
    const t = this.state?.towers.get(towerId);
    if (!t || this.ended) return;
    if (t.owner !== this.session.myId) return this.fail("That's not your tower!");
    const ab = TOWERS[t.type].levels[t.level].abilities?.find((a) => a.key === key);
    if (!ab) return;
    if (key === 'fps' && this.fps) return this.exitFps(true);
    if (ab.versus && !this.versus) return this.fail(`${ab.name} only works in Versus`);
    if (t.cd?.[key] > 0) return this.fail(`${ab.name} is recharging (${Math.ceil(t.cd[key])}s)`);
    if (ab.cost && this.myCash < ab.cost) return this.fail(`Need $${ab.cost} for ${ab.name}`);
    if (key === 'follow') {
      this.following.add(t.id);
      this.ui.toast('It follows you now (Set Location to stop)', 2000);
    }
    if (key === 'fps') {
      if (!t.manual) this.session.send({ a: 'ability', id: t.id, key });
      return this.enterFps(t);
    }
    if (key === 'clone') {
      this.stopAim();
      this.aiming = { id: t.id, key, ab, src: null, ghost: null };
      this.ui.toast('Click a tower to clone it (Esc to cancel)', 2500);
      return;
    }
    if (ab.mode && (t.choice?.[0] === 'frost' ? 'frost' : 'fire') !== ab.mode) return this.fail(`${ab.name} only works in ${ab.mode === 'fire' ? 'Fire' : 'Frost'} mode`); // Elementalist
    if (ab.aim) {
      // Thorns reach as far as the Harvester's range.
      const reach = ab.reach ?? (key === 'thorns' || key === 'targetSelect' ? TOWERS[t.type].levels[t.level].range : undefined);
      this.aiming = { id: t.id, key, radius: ab.radius || 2, reach }; // Teleport: no blast, just show a small ring
      this.ui.toast(key === 'patrol' ? 'Click where the helicopter should patrol (Esc to cancel)' : key === 'airdrop' ? 'Click where the mercenaries should land (Esc to cancel)' : key === 'summon' ? 'Click the path where the Relic units should appear (Esc to cancel)' : key === 'redeploy' ? 'Click where it should face (Esc to cancel)' : key === 'reposition' || key === 'jump' ? `Click where it should leap (within ${ab.reach} studs, Esc to cancel)` : key === 'teleport' ? `Click where it should teleport (within ${ab.reach} studs, Esc to cancel)` : key === 'carpetBomb' ? 'Click the path where the B-52 should bomb (Esc to cancel)' : key === 'iceTurret' || key === 'iceShard' ? `Click the path where the ${ab.name} should go (Esc to cancel)` : key === 'targetSelect' ? `Click where it should fire (within ${reach} studs, Esc to cancel)` : key === 'thorns' ? 'Click the path where the thorns should grow (Esc to cancel)' : key === 'unitCommand' ? 'Click the zombie its towers should attack (Esc to cancel)' : key === 'immolation' ? 'Click the zombie to Immolate (Esc to cancel)' : key === 'directedPower' ? 'Click one of your towers to power up (Esc to cancel)' : key === 'radarMove' ? 'Click where the Radar Drone should hover (Esc to cancel)' : key === 'orbital' ? 'Click where the Orbital Airstrike should start (Esc to cancel)' : `Click where the ${ab.name} should hit (Esc to cancel)`, 2500);
      return;
    }
    this.session.send({ a: 'ability', id: t.id, key });
  }

  tryAim() {
    if (this.aiming.key === 'clone') return this.tryClone(this.aiming);
    if (!this.hasGround) return this.fail('Pick a spot on the ground');
    const { id, key } = this.aiming;
    this.aiming = null;
    if (key === 'patrol') this.following.delete(id); // Cryo Helicopter: Set Location stops following
    this.session.send({ a: 'ability', id, key, x: this.groundHit.x, z: this.groundHit.z });
    if (key === 'orbital') {
      this.lasering = { id, timer: 0.2, start: performance.now() };
      this.ui.toast('☀ Move your mouse to steer the beam!', 2500);
    }
  }

  /** Hologram Tower: the first click picks the tower to clone, the second places the clone. */
  tryClone(a) {
    if (a.src == null) {
      const src = this.state.towers.get(this.pickTower());
      if (!src) return this.fail('Click a tower to clone it');
      const def = TOWERS[src.type];
      if (rootType(src.type) === 'hacker') return this.fail("Hackers can't clone Hackers");
      if (def.kind === 'income') return this.fail("Income towers can't be cloned");
      if (src.holo) return this.fail("Holograms can't be cloned");
      const cost = cloneCost(a.ab, src);
      if (this.myCash < cost) return this.fail(`Need $${cost.toLocaleString()} to clone the ${def.name}`);
      Object.assign(a, { src: src.id, type: src.type, level: src.level, cost });
      a.ghost = TOWER_MODELS[src.type](src.level);
      a.ghost.root.scale.setScalar(MODEL_SCALE);
      setOpacity(a.ghost, 0.45);
      a.ghost.root.visible = false;
      this.scene.add(a.ghost.root);
      this.ui.toast(`Click where the hologram ${def.name} should go ($${cost.toLocaleString()}, Esc to cancel)`, 2500);
      return;
    }
    if (this.versus && this.hasGround && laneOf(this.groundHit.z) !== this.myLane) return this.fail('You can only build on your own map!');
    if (!this.hasGround || !a.ghost.valid) return this.fail(placeFail(TOWERS[a.type], 'That'));
    this.session.send({ a: 'ability', id: a.id, key: a.key, src: a.src, x: this.groundHit.x, z: this.groundHit.z, yaw: this.cam.yaw });
    this.stopAim();
  }

  /** Stops picking an ability spot (and removes the Hologram Tower ghost). */
  stopAim() {
    const g = this.aiming?.ghost;
    if (g) {
      this.scene.remove(g.root);
      g.mats.forEach((m) => m.dispose());
    }
    this.aiming = null;
    if (this.selectedId == null && !this.placing) this.ring.visible = this.cone.visible = false;
  }

  // ------------------------------------------------------------------ Gatling Gun FPS Mode

  enterFps(t) {
    this.cancelPlace();
    this.deselect();
    this.keys.clear();
    // x, z: the Combat Drone's spot while you fly it (it starts wherever it is now).
    const heli = !!TOWERS[t.type].heli;
    this.fps = { id: t.id, yaw: t.yaw, pitch: -0.08, fire: false, sendT: 0, age: 0, locked: false,
      heli, x: heli ? (t.hx ?? t.x) : t.x, z: heli ? (t.hz ?? t.z) : t.z };
    // Lock the mouse for aiming (if the browser refuses, the cursor's spot on the map aims instead).
    Promise.resolve(this.canvas.requestPointerLock?.()).catch(() => {});
    if (!this.fpsHud) {
      this.fpsHud = document.createElement('div');
      this.fpsHud.id = 'fps-hud';
      this.fpsHud.innerHTML = '<div class="cross"></div><div class="fps-info"></div>';
      document.body.appendChild(this.fpsHud);
    }
    this.fpsHud.classList.remove('hidden');
    this.ui.toast(heli
      ? 'Direct Control! WASD to fly, move the mouse to aim, hold left click to fire. F or Esc to stop.'
      : 'FPS Mode! Move the mouse to aim, hold left click to fire. F or Esc to stop.', 3500);
  }

  /** Leaves FPS Mode. `toggle`: also tell the sim to hand the gun back to its autopilot. */
  exitFps(toggle) {
    const f = this.fps;
    if (!f) return;
    this.fps = null;
    this.keys.clear();
    const v = this.towerViews.get(f.id);
    if (v) v.group.visible = true;
    const t = this.state?.towers.get(f.id);
    if (toggle && t?.manual && this.session && !this.ended) this.session.send({ a: 'ability', id: f.id, key: 'fps' });
    if (document.pointerLockElement) document.exitPointerLock();
    this.fpsHud?.classList.add('hidden');
  }

  setFpsFire(on) {
    if (!this.fps || this.fps.fire === on) return;
    this.fps.fire = on;
    this.fps.sendT = 0; // send right away
  }

  /** Keeps FPS Mode in sync: aim updates to the sim, and leaving when the gun is gone. */
  updateFps(dt) {
    const f = this.fps;
    const t = this.state.towers.get(f.id);
    f.age += dt;
    // Gone (sold), game over, or the sim switched it back to automatic.
    if (!t || this.ended || (!t.manual && f.age > 1.5)) return this.exitFps(false);
    if (f.heli && !this.ui.chatOpen) this.flyDrone(t, dt);
    if (!f.locked && this.hasGround) {
      // No pointer lock (some browsers): aim at whatever the cursor points at instead.
      f.yaw = Math.atan2(this.groundHit.x - f.x, this.groundHit.z - f.z);
    }
    f.sendT -= dt;
    if (f.sendT > 0) return;
    f.sendT = FPS_SEND_INTERVAL;
    const v = this.towerViews.get(t.id);
    const h = v ? this.fpsEyeHeight(v) : 4;
    const k = (n) => Math.round(n * 1000) / 1000;
    const msg = { a: 'aim', id: t.id, yaw: k(f.yaw), pitch: k(f.pitch), h: k(h), fire: f.fire ? 1 : 0 };
    if (f.heli) Object.assign(msg, { x: k(f.x), z: k(f.z) });
    this.session.send(msg);
  }

  /** Combat Drone Direct Control: WASD / arrows fly it around its map, relative to where you look. */
  flyDrone(t, dt) {
    const f = this.fps;
    const keys = this.keys;
    const fwd = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const side = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    if (!fwd && !side) return;
    const len = Math.hypot(fwd, side);
    const def = TOWERS[t.type];
    const speed = (def.levels[t.level].heliSpeed ?? def.heli.speed) * dt / len;
    const sx = Math.sin(f.yaw);
    const sz = Math.cos(f.yaw);
    // Forward is (sin yaw, cos yaw); right is that turned a quarter turn clockwise: (-cos, sin).
    f.x += (sx * fwd - sz * side) * speed;
    f.z += (sz * fwd + sx * side) * speed;
    const oz = laneOz(laneOf(t.z));
    f.x = clamp(f.x, BOUNDS.minX, BOUNDS.maxX);
    f.z = clamp(f.z, BOUNDS.minZ + oz, BOUNDS.maxZ + oz);
  }

  /** First-person camera just behind and above the gun. False if the gun is gone. */
  fpsCamera() {
    const f = this.fps;
    const t = this.state?.towers.get(f.id);
    const v = t && this.towerViews.get(t.id);
    if (!v) return false;
    const fx = Math.sin(f.yaw);
    const fz = Math.cos(f.yaw);
    // The Combat Drone's camera rides along wherever you fly it.
    const px = f.heli ? f.x : t.x;
    const pz = f.heli ? f.z : t.z;
    const y = (f.heli ? heightAt(px, pz) : v.group.position.y) + this.fpsEyeHeight(v);
    const W = WORLD_SCALE;
    this.camera.position.set((px - fx * FPS_BACK) * W, y * W, (pz - fz * FPS_BACK) * W);
    const cp = Math.cos(f.pitch);
    this.camera.lookAt((px + fx * cp * 30) * W, (y + Math.sin(f.pitch) * 30) * W, (pz + fz * cp * 30) * W);
    this.cam.target.set(px * W, 4 * W, pz * W); // so shadows follow
    return true;
  }

  /** FPS camera height above the gun's ground (bullets start from the camera, at the crosshair). */
  fpsEyeHeight(v) {
    return ((v.model.fpsHeight ?? 3) + 1.6) * MODEL_SCALE;
  }

  updateFpsHud() {
    const t = this.state?.towers.get(this.fps.id);
    if (!t) return;
    const s = TOWERS[t.type].levels[t.level];
    const ammo = !s.ammo ? 'Direct Control' : t.reloadT > 0 ? `Reloading… ${Math.ceil(t.reloadT)}s` : `Ammo ${t.ammo ?? s.ammo} / ${s.ammo}`; // Combat Drone: no magazine
    const text = `${ammo} · ${this.fps.heli ? 'WASD to fly · ' : ''}Hold click to fire · F / Esc to stop`;
    const el = this.fpsHud.querySelector('.fps-info');
    if (el.textContent !== text) el.textContent = text;
  }

  fail(msg) {
    audio.error();
    this.ui.toast(msg);
  }
}
