// The in-game client: renders the world, handles input, and mirrors a session's state.
// Works identically for solo (LocalSession) and multiplayer (NetSession).
import * as THREE from 'three';
import { ENEMIES, GAME, TOWERS, TRACKS, VERSUS, WAVES, cloneCost, difficulty, rootType, towerCost } from './config.js';
import { profile } from './profile.js';
import { buildVersusLinks, buildWorld, versusWalkable } from './world.js';
import { Player } from './player.js';
import { EnemyView, RemotePlayerView, TowerView, TrapView, UnitView, makeNameTag } from './views.js';
import { Effects } from './effects.js';
import { audio } from './audio.js';
import { ABILITY_BAR_KEYS, UI } from './ui.js';
import { TOWER_MODELS, setEmissive, setOpacity } from './models.js';
import { clamp } from './utils.js';
import { BOUNDS, PLAYER_SPAWN, path } from './sim/path.js';
import { CASTLE, CLIFFS, MAP, canPlace, heightAt, laneOf, laneOz } from './sim/map.js';
import { FPS_BACK, borrowsHidden, buffOf, computeBuffs, medicShields, spyCircles, upgradeCost } from './sim/sim.js';

/**
 * Radius of a tower's ring: the flight ring for Aviators, the boost range for support towers,
 * nothing for spawners and Farms, otherwise its (boosted) range.
 */
function ringRadius(type, level, buff) {
  const def = TOWERS[type];
  const s = def.levels[level];
  if (def.orbit) return def.orbit;
  if (def.heli) return s.patrol; // Pursuit: its patrol zone
  if (s.aura) return s.aura;
  if (def.kind) return 0;
  return s.range * (buff?.range ?? 1);
}
/** Engineer: its yellow build ring and red deadzone, drawn inside the range ring. */
function innerRings(type, level) {
  const def = TOWERS[type];
  const s = def.levels[level];
  if (!s.buildRange) return null;
  return [{ r: s.buildRange, color: 0xffd600 }, { r: def.minRange || 0, color: 0xff1744 }];
}
const ABILITY_KEYS = { KeyF: 0, KeyG: 1, KeyH: 2 };
const EMPTY = new Map();
const CLIFF_COLLIDERS = CLIFFS.map((c) => ({ x: c.x, z: c.z, r: c.r, h: c.h }));
const LANE_COLLIDERS = MAP.obstacles.concat(CLIFF_COLLIDERS);
const ORDINAL = ['', '1st', '2nd', '3rd', '4th'];

const SKY = 0x8fd3ff;
const FPS_SEND_INTERVAL = 1 / 15; // Gatling FPS Mode: how often the aim goes to the sim
const FPS_LOOK = 0.0025; // mouse look speed (radians per pixel)
const POS_SEND_INTERVAL = 1 / 15;

export class GameClient {
  /** hooks: { onLeave, onEndPrimary, onEndSecondary, onChat(text) } */
  constructor(canvas, hooks) {
    this.hooks = hooks;
    this.canvas = canvas;
    this.session = null;
    this.player = null;
    this.towerViews = new Map();
    this.enemyViews = new Map();
    this.unitViews = new Map();
    this.trapViews = new Map();
    this.remoteViews = new Map();
    this.dying = [];
    this.placing = null;
    this.aiming = null; // { id, key, radius } while picking an Airstrike spot; Hologram Tower also { ab, src, type, cost, ghost }
    this.fps = null; // Gatling Gun FPS Mode: { id, yaw, pitch, fire, sendT, age }
    this.ghost = null;
    this.selectedId = null;
    this.ended = false;
    this.posTimer = 0;
    this.uiTimer = 0;

    // ---- renderer / scene
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SKY);
    scene.fog = new THREE.Fog(SKY, 160, 340);
    this.scene = scene;
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 700);

    scene.add(new THREE.HemisphereLight(0xdff3ff, 0x4a6b3a, 1.6));
    const sun = new THREE.DirectionalLight(0xfff4e0, 2.6);
    sun.position.set(60, 120, 45);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, { left: -130, right: 130, top: 100, bottom: -100, near: 10, far: 350 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    scene.add(sun, sun.target);
    this.sun = sun; // follows the camera so every Versus map gets shadows

    this.baseWorld = buildWorld(scene);
    this.laneWorlds = []; // Versus maps, built on first use and kept for later games
    this.links = new Map(); // lane count -> water + bridges group
    this.laneTags = [];
    this.staticColliders = LANE_COLLIDERS;
    this.effects = new Effects(scene);
    this.buildRing();

    this.cam = { yaw: 0.6, pitch: 0.6, dist: 110, target: new THREE.Vector3(0, 4, 0) };
    this.keys = new Set();
    this.mouse = new THREE.Vector2(9, 9);
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.groundHit = new THREE.Vector3();
    this.hasGround = false;
    this.shiftHeld = false;

    this.ui = new UI({
      onSkip: () => this.session?.send({ a: 'skip' }),
      onSpeed: () => this.session?.send({ a: 'speed' }),
      onMute: () => this.ui.setMuted(audio.toggleMute()),
      onSlot: (type) => (this.placing === type ? this.cancelPlace() : this.beginPlace(type)),
      onPanel: (action) => {
        if (action === 'close') this.deselect();
        else if (action === 'upgrade') this.towerAction('upgrade');
        else if (action === 'upgrade:bottom') this.towerAction('upgrade', 'bottom');
        else if (action === 'sell') this.towerAction('sell');
        else if (action === 'target') this.towerAction('target');
        else if (action.startsWith('ability:')) this.useAbility(action.slice(8));
      },
      onAbilityBar: (i) => this.useAbilityGroup(i),
      onSend: (type) => this.session?.send({ a: 'send', type }),
      onTarget: (dir) => this.cycleTarget(dir),
      onLeave: () => {
        this.payLeaveCredits();
        hooks.onLeave();
      },
      onEndPrimary: () => hooks.onEndPrimary(),
      onEndSecondary: () => hooks.onEndSecondary(),
      onChat: (text) => hooks.onChat(text),
    });
    /** type -> data URL of the tower's portrait (also used by the menus). */
    this.icons = Object.fromEntries(Object.entries(TOWER_MODELS).map(([type, make]) => [type, this.renderIcon(make(0))]));
    this.loadout = [];
    this.ui.setMuted(false);
    this.ui.show(false);

    this.bindInput();
    this.clock = new THREE.Clock();
    renderer.setAnimationLoop(() => this.frame());
  }

  get state() {
    return this.session?.state;
  }
  get me() {
    return this.state?.players.get(this.session.myId);
  }
  get myCash() {
    return this.me?.cash ?? 0;
  }
  /** Versus: every player defends their own map (lane). */
  get versus() {
    return !!this.state?.versus;
  }
  get myLane() {
    return this.me?.lane ?? 0;
  }
  costOf(type) {
    return towerCost(TOWERS[type], this.versus);
  }

  // ------------------------------------------------------------------ lifecycle

  start(session) {
    this.stop();
    this.session = session;
    this.ended = false;
    this.spectating = false;
    this.elimWave = 0;
    this.elimPlace = 0;
    this.loadout = profile.battleLoadout();
    this.ui.buildHotbar(this.icons, this.loadout, (type) => this.costOf(type));
    session.onError = (msg) => this.fail(msg);
    const ids = [...session.state.players.keys()];
    const idx = this.versus ? 0 : Math.max(0, ids.indexOf(session.myId));
    const spawn = { x: PLAYER_SPAWN.x + (idx % 2) * 5 - 2.5, y: 0, z: PLAYER_SPAWN.z + Math.floor(idx / 2) * 5 + laneOz(this.myLane) };
    if (this.versus) this.setupVersus(session.state.lanes);
    this.player = new Player(this.scene, spawn, this.me?.color);
    if (this.versus) this.player.area = (x, z) => versusWalkable(x, z, session.state.lanes);
    this.cam.yaw = 0;
    this.cam.pitch = 0.55;
    this.cam.dist = 34;
    this.cam.target.set(spawn.x, 4, spawn.z);
    this.ui.show(true, session.mp, this.versus);
    const keys = `1-${this.loadout.length}`;
    this.ui.toast(
      this.versus ? 'VERSUS! Defend your own map and outlast everyone. Buy zombies (left panel) to send to your target!'
      : session.mp ? `Work together! Press ${keys} to place towers, Enter to chat.` : `Place towers (press ${keys}), then start the wave!`,
      this.versus ? 5000 : 3500,
    );
  }

  /** Shows one map per player (joined by bridges) and labels each castle with its owner. */
  setupVersus(lanes) {
    this.baseWorld.visible = false;
    for (let i = 0; i < lanes; i++) {
      this.laneWorlds[i] ??= buildWorld(this.scene, { oz: laneOz(i), versus: true });
      this.laneWorlds[i].visible = true;
    }
    if (!this.links.has(lanes)) this.links.set(lanes, buildVersusLinks(this.scene, lanes));
    this.links.get(lanes).visible = true;
    this.staticColliders = [];
    for (let i = 0; i < lanes; i++) {
      const oz = laneOz(i);
      for (const o of LANE_COLLIDERS) this.staticColliders.push({ ...o, z: o.z + oz });
    }
    for (const p of this.state.players.values()) {
      const tag = makeNameTag(p.id === this.session.myId ? `${p.name} (you)` : p.name, p.color);
      tag.scale.set(20, 3.75, 1);
      tag.position.set(CASTLE.x, 23, CASTLE.z + laneOz(p.lane));
      this.scene.add(tag);
      this.laneTags.push(tag);
    }
  }

  teardownVersus() {
    this.baseWorld.visible = true;
    for (const w of this.laneWorlds) w.visible = false;
    for (const g of this.links.values()) g.visible = false;
    for (const t of this.laneTags) {
      this.scene.remove(t);
      t.material.map.dispose();
      t.material.dispose();
    }
    this.laneTags = [];
    this.staticColliders = LANE_COLLIDERS;
  }

  /** Versus: switch who your sent zombies (and Anarchist tricks) go to. */
  cycleTarget(dir) {
    const st = this.state;
    if (!st?.versus || this.ended) return;
    const others = [...st.players.values()].filter((p) => p.id !== this.session.myId && !p.place).sort((a, b) => a.lane - b.lane);
    if (!others.length) return;
    const i = others.findIndex((p) => p.id === this.me?.target);
    const next = others[(((i < 0 ? 0 : i + dir) % others.length) + others.length) % others.length];
    this.session.send({ a: 'vtarget', id: next.id });
  }

  /**
   * Leaving mid-game still pays credits for the waves cleared so far, like losing on this wave.
   * (No win bonus, no shards.) Nothing extra if the game already ended and paid out.
   */
  payLeaveCredits() {
    const st = this.session?.state;
    if (!st || this.ended) return;
    this.ended = true; // only once
    const credits = this.versus
      ? VERSUS.credits(this.spectating ? this.elimWave : st.wave.index, this.spectating ? this.elimPlace : 0)
      : Math.round(GAME.credits(st.wave.index, false) * difficulty(st.mode).credits);
    if (!credits) return;
    profile.addCredits(credits);
    this.leaveCredits = credits;
  }

  stop() {
    if (!this.session) return;
    this.exitFps(false);
    this.cancelPlace();
    this.deselect();
    for (const v of this.towerViews.values()) v.dispose();
    for (const v of this.enemyViews.values()) v.dispose();
    for (const v of this.unitViews.values()) v.dispose();
    for (const v of this.trapViews.values()) v.dispose();
    for (const v of this.remoteViews.values()) v.dispose();
    for (const v of this.dying) v.dispose();
    this.towerViews.clear();
    this.enemyViews.clear();
    this.unitViews.clear();
    this.trapViews.clear();
    this.remoteViews.clear();
    this.dying = [];
    this.player?.dispose();
    this.player = null;
    if (this.versus) this.teardownVersus();
    this.session.dispose();
    this.session = null;
    this.keys.clear();
    this.ui.show(false);
    this.ui.setBoss(null);
    this.cam.dist = 110;
    this.cam.pitch = 0.6;
  }

  addChat(m) {
    if (this.session?.mp) this.ui.addChat(m);
  }

  // ------------------------------------------------------------------ main loop

  frame() {
    const realDt = Math.min(this.clock.getDelta(), 0.05);
    const s = this.session;
    if (s) {
      const st = s.state;
      const gdt = st.over ? 0 : realDt * st.speed;
      if (this.fps) this.updateFps(realDt);
      if (!this.ended && !this.fps) {
        const colliders = this.staticColliders.concat([...st.towers.values()].map((t) => ({ x: t.x, z: t.z, r: 1.7 })));
        this.player.update(realDt, this.ui.chatOpen ? new Set() : this.keys, this.cam.yaw, colliders);
      }
      if (s.mp) {
        this.posTimer -= realDt;
        if (this.posTimer <= 0) {
          this.posTimer = POS_SEND_INTERVAL;
          const p = this.player;
          s.sendPos({ x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw, m: p.moving, g: p.grounded });
        }
      }
      this.handleEvents(s.update(realDt));
      if (this.session) this.reconcile(realDt, gdt); // an event may have ended the session
      const fv = this.fps && this.towerViews.get(this.fps.id);
      if (fv) {
        // FPS Mode: turn our own gun right away instead of waiting for the sim to catch up.
        fv.yaw = this.fps.yaw;
        fv.model.root.rotation.y = this.fps.yaw;
        fv.group.visible = false; // hide our own gun so it doesn't block the view (tracers still fire from its muzzle)
      }
    } else {
      this.cam.yaw += realDt * 0.05; // slow orbit behind the menus
    }

    this.updateCamera(realDt);
    const ct = this.cam.target;
    this.sun.position.set(ct.x + 60, 120, ct.z + 45);
    this.sun.target.position.set(ct.x, 0, ct.z);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    this.pickGround();
    this.effects.update(realDt);
    this.updateGhost();
    if (this.session) this.updateHud(realDt);
    this.renderer.render(this.scene, this.camera);
  }

  handleEvents(evs) {
    const st = this.state;
    const myId = this.session.myId;
    for (const ev of evs) {
      switch (ev.k) {
        case 'shot': {
          const e = this.enemyViews.get(ev.e);
          this.towerViews.get(ev.t)?.shoot(e, this.effects, audio);
          if (ev.c && e) this.effects.text(e.aimPoint(new THREE.Vector3()).add(new THREE.Vector3(0, 2.5, 0)), 'CRIT!', '#ff7043', 2); // Warden critical hit
          break;
        }
        case 'block':
          this.effects.text(new THREE.Vector3(ev.x, 8, ev.z), 'Blocked!', '#90caf9', 2.4); // Warden riot shield
          break;
        case 'fpsShot': {
          // Gatling Gun FPS Mode: a straight bullet that pierces the zombies it hits.
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const from = v.fireFrom(null, null, new THREE.Vector3());
          const to = new THREE.Vector3(ev.x, ev.y, ev.z);
          this.effects.tracer(from, to, v.model.tracer ?? 0xffe066, v.model.tracerWidth);
          this.effects.flash(from, 0xfff3b0, 0.8);
          for (const id of ev.es) this.enemyViews.get(id)?.hit();
          if (v.model.spin) v.spinSpeed = 30;
          audio.shot(v.level, v.type);
          break;
        }
        case 'reload': {
          const t = st.towers.get(ev.t);
          if (t?.owner === myId && ev.d >= 2) this.effects.text(new THREE.Vector3(t.x, 7, t.z), 'Reloading!', '#ffe082', 1.6);
          break;
        }
        case 'pellets': {
          // Pump Shotgunner: a tracer to every zombie hit, plus a few stray pellets.
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const from = v.fireFrom(null, null, new THREE.Vector3());
          for (const id of ev.es) {
            const e = this.enemyViews.get(id);
            if (!e) continue;
            this.effects.tracer(from, e.aimPoint(new THREE.Vector3()), v.model.tracer ?? 0xffab40);
            e.hit();
          }
          for (let i = 0; i < 3; i++) {
            const a = ev.a + (Math.random() * 2 - 1) * ev.c;
            const to = from.clone().add(new THREE.Vector3(Math.sin(a) * ev.r, -from.y + 1, Math.cos(a) * ev.r));
            this.effects.tracer(from, to, v.model.tracer ?? 0xffab40, 0.08);
          }
          this.effects.flash(from, 0xfff3b0, 1.1);
          audio.shot(v.level, v.type);
          break;
        }
        case 'zap': {
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const first = this.enemyViews.get(ev.es[0]);
          const pts = [v.fireFrom(first?.pos.x ?? null, first?.pos.z ?? null, new THREE.Vector3())];
          for (const id of ev.es) {
            const e = this.enemyViews.get(id);
            if (!e) continue;
            pts.push(e.aimPoint(new THREE.Vector3()));
            e.hit();
          }
          this.effects.lightning(pts, v.model.tracer ?? 0x80d8ff);
          audio.shot(v.level, v.type);
          break;
        }
        case 'trapThrow': {
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const from = v.fireFrom(ev.x, ev.z, new THREE.Vector3());
          this.effects.lob(from, new THREE.Vector3(ev.x, 0.3, ev.z), ev.d, v.model.projectile);
          audio.lob(v.type);
          break;
        }
        case 'trapGone':
          if (ev.kind === 'grave') {
            // Raise the Dead: the gravestone bursts and a skeleton climbs out.
            this.effects.puff(new THREE.Vector3(ev.x, 1, ev.z), 0x9e9e9e, 10, 0.5, 7);
            this.effects.puff(new THREE.Vector3(ev.x, 1.5, ev.z), 0x76ff03, 6, 0.3, 4);
          } else if (ev.kind === 'sentry') {
            this.effects.puff(new THREE.Vector3(ev.x, 1.5, ev.z), 0x616161, 10, 0.45, 7);
            audio.kill();
          } else if (ev.kind !== 'mine') this.effects.puff(new THREE.Vector3(ev.x, 0.4, ev.z), 0x8d6e63, 6, 0.35, 5);
          break;
        case 'bolt': {
          // Necromancer: a piercing bolt through every zombie it hits, out to the edge of its range.
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const from = v.fireFrom(ev.x, ev.z, new THREE.Vector3());
          const color = v.model.tracer ?? 0xb388ff;
          const to = new THREE.Vector3(ev.x, from.y, ev.z);
          const last = ev.es.length ? this.enemyViews.get(ev.es[ev.es.length - 1]) : null;
          if (last) to.copy(last.aimPoint(new THREE.Vector3()));
          this.effects.tracer(from, to, color, (v.model.tracerWidth ?? 0.25) * (ev.m ? Math.min(2, ev.m) : 1));
          for (const id of ev.es) this.enemyViews.get(id)?.hit();
          this.effects.flash(from, color, 0.9);
          audio.shot(v.level, v.type);
          break;
        }
        case 'building': {
          const t = st.towers.get(ev.t);
          if (t?.owner === myId) this.effects.text(new THREE.Vector3(t.x, 7, t.z), TOWERS[t.type].levels[t.level].souls ? 'Raising a grave…' : 'Building…', '#ffe082', 1.6);
          break;
        }
        case 'grave':
          this.effects.puff(new THREE.Vector3(ev.x, 0.6, ev.z), 0x5d4037, 10, 0.45, 6);
          this.effects.puff(new THREE.Vector3(ev.x, 1.2, ev.z), 0xb388ff, 5, 0.3, 3);
          break;
        case 'graveUp':
          this.effects.puff(new THREE.Vector3(ev.x, 1.5, ev.z), ev.lvl >= 3 ? 0xff1744 : 0x76ff03, 8, 0.35, 4);
          this.effects.text(new THREE.Vector3(ev.x, 5, ev.z), `Grave Lv ${ev.lvl}`, ev.lvl >= 3 ? '#ff5252' : '#b2ff59', 1.8);
          break;
        case 'sentry':
          this.effects.puff(new THREE.Vector3(ev.x, 0.6, ev.z), 0x9e9e9e, 10, 0.45, 6);
          audio.place();
          break;
        case 'sshot':
          this.trapViews.get(ev.s)?.shoot(this.enemyViews.get(ev.e), this.effects, audio, ev.c);
          break;
        case 'overcharge': {
          const t = st.towers.get(ev.t);
          if (t) this.effects.puff(new THREE.Vector3(t.x, 4, t.z), 0xb0bec5, 8, 0.4, 4); // vents steam while it cools
          break;
        }
        case 'goons':
          this.effects.text(new THREE.Vector3(ev.x, 8, ev.z), ev.n > 1 ? 'Goons!' : 'Goon!', '#ffca28', 2.4);
          break;
        case 'heal':
          this.effects.text(new THREE.Vector3(ev.x, 8, ev.z), `+${ev.v} HP`, '#69f0ae', 2.4);
          break;
        case 'ushot':
          this.unitViews.get(ev.u)?.shoot(this.enemyViews.get(ev.e), this.effects, audio, ev.i, ev.c);
          break;
        case 'udie': {
          const v = this.unitViews.get(ev.u);
          if (v) {
            v.dispose();
            this.unitViews.delete(ev.u);
          }
          const at = new THREE.Vector3(ev.x, 1, ev.z);
          if (ev.boom) {
            this.effects.explosion(at, 5);
            audio.boom(5);
          } else {
            this.effects.puff(at, 0x616161, 10, 0.5, 8);
            audio.kill();
          }
          break;
        }
        case 'strike': {
          // Airstrike: a bomb whistles down from high above.
          const to = new THREE.Vector3(ev.x, 0.3, ev.z);
          this.effects.bomb(new THREE.Vector3(ev.x - 25, 45, ev.z), to, ev.d);
          if (!ev.n) audio.jet(); // one jet per plane, even when it drops several bombs
          break;
        }
        case 'rave': {
          this.effects.rave(new THREE.Vector3(ev.x, 0.4, ev.z), ev.r);
          audio.rave();
          break;
        }
        case 'ability':
          if (ev.owner === myId) audio.upgrade();
          this.effects.text(new THREE.Vector3(ev.x, 8, ev.z), ev.name, '#e1bee7', 2.6);
          break;
        case 'drop': {
          const v = this.towerViews.get(ev.t);
          if (v) this.effects.bomb(v.bayPosition(new THREE.Vector3()), new THREE.Vector3(ev.x, 0.3, ev.z), ev.d);
          break;
        }
        case 'missile': {
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const last = new THREE.Vector3();
          const target = (out) => {
            const ev2 = this.enemyViews.get(ev.e);
            if (ev2) ev2.aimPoint(last);
            return out.copy(last);
          };
          target(last);
          this.effects.missile(v.podPosition(ev.i, new THREE.Vector3()), target, ev.d);
          audio.missile();
          break;
        }
        case 'ulob': {
          // Mercenary Grenadier: a grenade arcing from the unit to where the zombie will be.
          const v = this.unitViews.get(ev.u);
          if (!v) break;
          this.effects.lob(v.muzzlePosition(new THREE.Vector3()), new THREE.Vector3(ev.x, 0.3, ev.z), ev.d, v.m.projectile);
          audio.lob('grenadier');
          break;
        }
        case 'cluster':
          // Classic Mortar cluster bombs bouncing out of the blast.
          this.effects.lob(new THREE.Vector3(ev.x + ev.fx, 0.5, ev.z + ev.fz), new THREE.Vector3(ev.x, 0.3, ev.z), ev.d, { color: 0x3e2723, size: 0.4, arc: 5 });
          break;
        case 'airdrop':
          this.effects.puff(new THREE.Vector3(ev.x, 1, ev.z), 0xbcaaa4, 14, 0.6, 10);
          this.effects.text(new THREE.Vector3(ev.x, 8, ev.z), 'Air-Drop!', '#ffca28', 2.6);
          audio.jet();
          break;
        case 'boom': {
          const at = new THREE.Vector3(ev.x, 0.3, ev.z);
          if (ev.nuke) {
            this.effects.nuke(at, ev.r);
            for (const v of this.enemyViews.values()) if (Math.hypot(v.pos.x - ev.x, v.pos.z - ev.z) <= ev.r) v.hit();
            audio.boom(ev.r * 2);
            break;
          }
          if (ev.ice) {
            this.effects.iceBlast(at, ev.r);
            audio.ice();
            break;
          }
          if (ev.slime) {
            this.effects.slimeSplash(at, ev.r);
            for (const v of this.enemyViews.values()) if (Math.hypot(v.pos.x - ev.x, v.pos.z - ev.z) <= ev.r) v.hit();
            audio.lob('slime');
            break;
          }
          this.effects.explosion(at, ev.r);
          for (const v of this.enemyViews.values()) if (Math.hypot(v.pos.x - ev.x, v.pos.z - ev.z) <= ev.r) v.hit();
          audio.boom(ev.r);
          break;
        }
        case 'rang':
        case 'knife': {
          // Boomerangs and knives follow the sim's own flight path (bladePos).
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const from = v.fireFrom(ev.x, ev.z, new THREE.Vector3());
          const knife = ev.k === 'knife';
          const b = { loop: !knife, ox: v.x, oz: v.z, tx: ev.x, tz: ev.z, side: ev.s };
          this.effects.blade(b, ev.d, from.y, knife ? { color: 0xb0bec5, size: 1, knife } : v.model.projectile);
          audio.lob(v.type);
          break;
        }
        case 'slice':
          this.enemyViews.get(ev.e)?.hit();
          break;
        case 'pulse': {
          // Pulse Trooper: a ring grows out to its range (hits arrive as 'slice' events).
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          v.fireFrom(null, null, new THREE.Vector3());
          this.effects.pulse(new THREE.Vector3(v.x, 0, v.z), ev.r, ev.d, v.model.tracer);
          audio.shot(v.level, v.type);
          break;
        }
        case 'sweep': {
          // Sweeper: two lasers spin around the tower, reaching to the edge of its map (Versus lane).
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const oz = laneOz(laneOf(v.z));
          const bounds = { minX: BOUNDS.minX, maxX: BOUNDS.maxX, minZ: BOUNDS.minZ + oz, maxZ: BOUNDS.maxZ + oz };
          this.effects.sweep(new THREE.Vector3(v.x, 0, v.z), bounds, ev.a, ev.d, ev.s, v.model.tracer);
          audio.sweep(ev.d);
          break;
        }
        case 'whirl': {
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          v.fireFrom(null, null, new THREE.Vector3());
          this.effects.whirl(new THREE.Vector3(v.x, 0, v.z), ev.r);
          for (const e of this.enemyViews.values()) if (Math.hypot(e.pos.x - v.x, e.pos.z - v.z) <= ev.r) e.hit();
          audio.shot(v.level, v.type);
          break;
        }
        case 'lob': {
          // Grenade or mortar shell arcing to where the zombie will be.
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const from = v.fireFrom(ev.x, ev.z, new THREE.Vector3());
          const to = new THREE.Vector3(ev.x, 0.3, ev.z);
          this.effects.lob(from, to, ev.d, v.model.projectile);
          audio.lob(v.type);
          break;
        }
        case 'rocket': {
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const last = new THREE.Vector3();
          const target = (out) => {
            this.enemyViews.get(ev.e)?.aimPoint(last);
            return out.copy(last);
          };
          target(last);
          const p = v.model.projectile ?? {};
          this.effects.missile(v.fireFrom(last.x, last.z, new THREE.Vector3()), target, ev.d, p.color, p.size);
          audio.rocket(v.level);
          break;
        }
        case 'flame': {
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const from = v.fireFrom(null, null, new THREE.Vector3());
          this.effects.flames(from, v.yaw, ev.r, ev.c);
          if (v.model.muzzles.length > 1) this.effects.flames(v.fireFrom(null, null, new THREE.Vector3()), v.yaw, ev.r, ev.c);
          audio.flame();
          break;
        }
        case 'kill': {
          const v = this.enemyViews.get(ev.e);
          if (v) {
            v.die(ev.r, this.effects, audio);
            this.enemyViews.delete(ev.e);
            this.dying.push(v);
          }
          break;
        }
        case 'decay': {
          // A corpse crumbles away on its own (no reward).
          const v = this.enemyViews.get(ev.e);
          if (v) {
            v.die(0, this.effects, audio, true);
            this.enemyViews.delete(ev.e);
            this.dying.push(v);
          }
          break;
        }
        case 'slam': {
          // Molten Warlord smashes the ground: a lava shockwave that stuns nearby towers.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.enemyViews.get(ev.e)?.attack();
          this.effects.pulse(at, ev.r, 0.6, 0xff6d00);
          this.effects.puff(at.clone().setY(1), 0xff3d00, 20, 0.6, 12);
          audio.boom(5);
          if (ev.n) this.ui.toast(`💥 The Warlord's slam stunned ${ev.n} tower${ev.n > 1 ? 's' : ''}!`, 1400);
          break;
        }
        case 'axe': {
          const oz = laneOz(ev.L ?? 0);
          this.enemyViews.get(ev.e)?.attack();
          this.effects.axe(new THREE.Vector3(ev.fx, 9, ev.fz + oz), new THREE.Vector3(ev.x, 1.5, ev.z + oz), ev.d);
          audio.rocket(1);
          break;
        }
        case 'axeHit': {
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.effects.pulse(at, ev.r, 0.5, 0xff9100);
          this.effects.puff(at.clone().setY(1), 0xff6d00, 14, 0.5, 10);
          audio.boom(3);
          break;
        }
        case 'leak': {
          const v = this.enemyViews.get(ev.e);
          if (v) {
            v.dispose();
            this.enemyViews.delete(ev.e);
          }
          if (!this.versus || ev.L === this.myLane) audio.baseHit();
          this.effects.puff(new THREE.Vector3(path.end.x, 3, path.end.z + laneOz(ev.L ?? 0)), 0xe53935, 10, 0.5, 8);
          break;
        }
        case 'waveStart': {
          if (this.versus) {
            audio.waveStart();
            const scripted = WAVES[ev.i]?.note;
            this.ui.toast(`Wave ${ev.i + 1}${ev.bonus ? ` · +$${ev.bonus}` : ''}${scripted && !scripted.startsWith('Final') ? ` — ${scripted}` : ''}`, scripted ? 3000 : 1600);
            break;
          }
          const note = difficulty(st.mode).waves[ev.i]?.note;
          audio.waveStart();
          this.ui.toast(note ? `Wave ${ev.i + 1}: ${note}` : `Wave ${ev.i + 1}`, note ? 3200 : 1500);
          break;
        }
        case 'waveClear':
          audio.cash();
          this.ui.toast(`Wave ${ev.i + 1} ${ev.skip ? 'skipped' : 'cleared'}! +$${ev.bonus}`);
          break;
        case 'place':
          if (ev.owner === myId) audio.place();
          this.effects.puff(new THREE.Vector3(ev.x, 0.5, ev.z), ev.holo ? 0x18ffff : 0xbdbdbd, ev.holo ? 16 : 8, 0.4, 6);
          break;
        case 'holoEnd': // a Hacker clone fades away
          this.effects.puff(new THREE.Vector3(ev.x, 3, ev.z), 0x18ffff, 16, 0.5, 8);
          break;
        case 'convert': // a hacked zombie comes back as a hologram
          this.effects.puff(new THREE.Vector3(ev.x, 2, ev.z), 0x18ffff, 10, 0.4, 6);
          break;
        case 'upgrade':
          if (ev.owner === myId) audio.upgrade();
          this.effects.puff(new THREE.Vector3(ev.x, 3, ev.z), 0xffd54f, 12, 0.35, 10);
          this.effects.text(new THREE.Vector3(ev.x, 7.5, ev.z), ev.name, '#ffd54f', 2.6);
          break;
        case 'konami':
          if (ev.owner === myId) {
            audio.upgrade();
            this.ui.toast('Konami code! ∞ money this game', 2500);
          }
          break;
        case 'income':
          if (ev.owner === myId) this.effects.text(new THREE.Vector3(ev.x, 7, ev.z), `+$${ev.v}`, '#a5f36b');
          break;
        case 'cash': {
          // Cowboy cash shot: a gold coin pops out and the revolver twirls.
          this.towerViews.get(ev.id)?.twirl(ev.spin);
          if (ev.owner === myId) {
            this.effects.text(new THREE.Vector3(ev.x, 7, ev.z), `+$${ev.v}`, '#ffd54f', 2.4);
            audio.cash();
          }
          this.effects.puff(new THREE.Vector3(ev.x, 5, ev.z), 0xffd54f, 5, 0.3, 6);
          break;
        }
        case 'beat': {
          // DJ Booth Drop the Beat: a ring in the track's color (Red sends one per pulse).
          const at = new THREE.Vector3(ev.x, 0, ev.z);
          this.effects.pulse(at, ev.r, 0.5, TRACKS[ev.c].color);
          if (ev.c === 2) {
            for (const v of this.enemyViews.values()) if (Math.hypot(v.pos.x - ev.x, v.pos.z - ev.z) <= ev.r) v.hit();
            audio.shot(4, 'djBooth');
          } else {
            this.effects.rave(at.setY(0.4), ev.r);
            audio.rave();
          }
          break;
        }
        case 'sell':
          if (ev.owner === myId) {
            audio.sell();
            this.effects.text(new THREE.Vector3(ev.x, 5, ev.z), `+$${ev.value}`, '#a5f36b');
          }
          break;
        case 'reborn': {
          // A cage broke open, or a boss came back for its second phase.
          const e = st.enemies.get(ev.e);
          const def = ENEMIES[ev.type];
          if (e) {
            const at = path.at(e.dist, {});
            const color = def.fire ? 0xff6d00 : ENEMIES[ev.from].cage ? 0x9e9e9e : def.skin;
            this.effects.puff(new THREE.Vector3(at.x, 2, at.z + laneOz(e.lane ?? 0)), color, def.boss ? 24 : 10, 0.5, def.boss ? 12 : 6);
          }
          if (ENEMIES[ev.from].phase2) {
            audio.waveStart();
            this.ui.toast(`🔥 The ${ENEMIES[ev.from].name} bursts into flames! ${def.name}: immune to fire and faster!`, 3500);
          }
          break;
        }
        case 'sent': {
          const from = st.players.get(ev.from)?.name ?? 'Someone';
          const to = st.players.get(ev.to)?.name ?? 'someone';
          const what = `${ev.n > 1 ? `${ev.n} ` : 'a '}${ENEMIES[ev.type].name}${ev.n > 1 ? 's' : ''}`;
          if (ev.to === myId) {
            audio.error();
            this.ui.toast(`${from} sent you ${what}!`, 2200);
          } else if (ev.from === myId) this.ui.toast(`Sent ${what} to ${to}`, 1400);
          break;
        }
        case 'chip':
          if (ev.to === myId) {
            audio.baseHit();
            this.ui.toast(`No Mercy! ${st.players.get(ev.from)?.name ?? 'Someone'} chipped ${ev.d} base health`, 1600);
          }
          this.effects.text(new THREE.Vector3(CASTLE.x, 18, CASTLE.z + laneOz(ev.L)), `-${ev.d}`, '#ef5350', 3);
          break;
        case 'smoke':
        case 'pyro': {
          const at = new THREE.Vector3(ev.x, 0.3, ev.z);
          this.effects.heli(at);
          audio.jet();
          if (ev.k === 'smoke') this.effects.smoke(at, ev.r, ev.d);
          else {
            this.effects.fireworks(at, ev.r);
            audio.boom(6);
          }
          const name = ev.k === 'smoke' ? 'Smokes' : 'Pyrotechnics';
          if (ev.to === myId) this.ui.toast(`${st.players.get(ev.from)?.name ?? 'Someone'} hit your towers with ${name}! (${ev.n} affected)`, 2400);
          else if (ev.from === myId) this.ui.toast(`${name} hit ${ev.n} of ${st.players.get(ev.to)?.name ?? 'their'}'s towers`, 1800);
          break;
        }
        case 'elim': {
          const name = st.players.get(ev.id)?.name ?? 'A player';
          if (ev.id === myId) {
            this.spectating = true;
            this.elimWave = ev.wave - 1;
            this.elimPlace = ev.place;
            this.cancelPlace();
            this.deselect();
            audio.defeat();
            this.ui.toast(`Your base fell on wave ${ev.wave}! You finished ${ORDINAL[ev.place] ?? `#${ev.place}`}. Watch the rest of the battle…`, 4500);
          } else this.ui.toast(`${name}'s base has fallen! (${ORDINAL[ev.place] ?? `#${ev.place}`} place)`, 2600);
          break;
        }
        case 'end': {
          this.ended = true;
          if (ev.versus) {
            this.cancelPlace();
            this.deselect();
            const win = ev.winner === myId;
            if (win) audio.victory();
            const place = ev.places[myId] ?? st.lanes;
            const waves = win ? ev.wave : this.elimWave;
            const credits = VERSUS.credits(waves, place);
            const shards = VERSUS.shards(place);
            profile.addCredits(credits);
            profile.addShards(shards);
            this.ui.showVersusEnd(place, st.players.get(ev.winner)?.name ?? '?', win ? ev.wave : this.elimWave + 1, credits, shards);
            break;
          }
          this.cancelPlace();
          this.deselect();
          ev.win ? audio.victory() : audio.defeat();
          const diff = difficulty(st.mode);
          const credits = Math.round(GAME.credits(ev.win ? st.wave.total : st.wave.index, ev.win) * diff.credits);
          const shards = GAME.shards(ev.win) * diff.shards;
          profile.addCredits(credits);
          profile.addShards(shards);
          this.ui.showEnd(ev.win, st.wave.index + 1, this.session.mp, credits, shards, st.wave.total, st.mode);
          break;
        }
      }
    }
  }

  /** Create/update/remove views so they match the session state. */
  reconcile(realDt, gdt) {
    const st = this.state;
    for (const t of st.towers.values()) {
      let v = this.towerViews.get(t.id);
      if (!v) {
        v = new TowerView(this.scene, t, st.players.get(t.owner)?.color ?? 0x888888);
        this.towerViews.set(t.id, v);
        if (t.id === this.selectedId) v.setSelected(true);
      }
      v.sync(t, gdt);
    }
    for (const [id, v] of this.towerViews) {
      if (st.towers.has(id)) continue;
      if (id === this.selectedId) this.deselect();
      v.dispose();
      this.towerViews.delete(id);
    }

    let embers = false; // the Molten Warlord fills the sky with embers
    for (const e of st.enemies.values()) {
      let v = this.enemyViews.get(e.id);
      if (!v) {
        v = new EnemyView(this.scene, e);
        this.enemyViews.set(e.id, v);
        if (v.def.embers) {
          audio.waveStart();
          this.ui.toast(`🔥 ${v.def.name} has arrived! The world burns…`, 3500);
        }
      }
      if (v.def.embers) embers = true;
      v.sync(e, gdt, this.camera);
    }
    this.effects.setEmbers(embers);
    for (const t of st.towers.values()) this.towerViews.get(t.id)?.updateBeam(t, this.enemyViews);
    for (const u of st.units.values()) {
      let v = this.unitViews.get(u.id);
      if (!v) {
        v = new UnitView(this.scene, u);
        this.unitViews.set(u.id, v);
      }
      v.sync(u, gdt, this.camera);
    }
    for (const [id, v] of this.unitViews) {
      if (st.units.has(id)) continue;
      v.dispose();
      this.unitViews.delete(id);
    }
    const traps = st.traps ?? EMPTY;
    for (const tr of traps.values()) {
      let v = this.trapViews.get(tr.id);
      if (!v) {
        v = new TrapView(this.scene, tr);
        this.trapViews.set(tr.id, v);
      }
      v.sync(tr, realDt);
    }
    for (const [id, v] of this.trapViews) {
      if (traps.has(id)) continue;
      v.dispose();
      this.trapViews.delete(id);
    }
    // Medics: medi beams to the towers they shield.
    const shields = medicShields(st.towers.values());
    const byMedic = new Map();
    for (const [id, m] of shields) {
      const tv = this.towerViews.get(id);
      if (!tv) continue;
      if (!byMedic.has(m.id)) byMedic.set(m.id, []);
      byMedic.get(m.id).push(tv);
    }
    for (const t of st.towers.values()) {
      if (!TOWERS[t.type].levels[t.level].shields) continue;
      this.towerViews.get(t.id)?.updateLinks(byMedic.get(t.id) ?? [], t.active > 0);
    }
    for (const [id, v] of this.enemyViews) {
      if (st.enemies.has(id)) continue;
      v.dispose();
      this.enemyViews.delete(id);
    }
    for (let i = this.dying.length - 1; i >= 0; i--) {
      const v = this.dying[i];
      v.updateDying(gdt || realDt);
      if (v.done) {
        v.dispose();
        this.dying.splice(i, 1);
      }
    }

    for (const p of st.players.values()) {
      if (p.id === this.session.myId) continue;
      let v = this.remoteViews.get(p.id);
      if (!v) {
        v = new RemotePlayerView(this.scene, p);
        this.remoteViews.set(p.id, v);
      }
      v.update(realDt, this.session.remotePos.get(p.id));
    }
    for (const [id, v] of this.remoteViews) {
      if (st.players.has(id)) continue;
      v.dispose();
      this.remoteViews.delete(id);
    }
  }

  updateHud(realDt) {
    this.uiTimer -= realDt;
    if (this.uiTimer > 0) return;
    this.uiTimer = 0.1;
    const s = this.session;
    const st = s.state;
    this.ui.setCash(this.myCash);
    this.ui.setBase(this.versus ? (this.me?.baseHp ?? 0) : st.baseHp);
    this.ui.setWave(st, s.mp, this.spectating);
    this.ui.setSpeed(st.speed, s.isHost);
    if (st.versus) {
      this.ui.setVersusBoard(st.players, s.myId);
      this.ui.updateSend(this.myCash, st.wave, st.players.get(this.me?.target)?.name, this.spectating || this.ended);
    } else if (s.mp) this.ui.setScoreboard(st.players, s.myId);
    let boss = null;
    for (const e of st.enemies.values()) if (ENEMIES[e.type].boss && (e.lane ?? 0) === this.myLane) boss = { ...e, def: ENEMIES[e.type] };
    this.ui.setBoss(boss);
    const counts = {};
    for (const t of st.towers.values()) if (t.owner === s.myId) counts[rootType(t.type)] = (counts[rootType(t.type)] || 0) + 1;
    this.ui.updateHotbar(this.myCash, counts, this.placing, this.spectating);
    this.ui.updateAbilityBar(this.abilityGroups(), this.myCash, this.spectating || this.ended);
    const sel = st.towers.get(this.selectedId);
    if (sel) {
      const borrowed = borrowsHidden(sel, spyCircles(st.towers.values()));
      const buff = buffOf(computeBuffs(st.towers.values()), sel.id);
      const def = TOWERS[sel.type];
      const next = def.levels[sel.level + 1];
      const upCost = next ? upgradeCost(next, buff) : 0;
      // Upgrade paths: what the Bottom path costs at the fork.
      const fork = def.branch && sel.level + 1 === def.branchAt ? TOWERS[def.branch].levels[sel.level + 1] : null;
      const upCostB = fork ? upgradeCost(fork, buff) : 0;
      const aura = TOWERS[sel.type].levels[sel.level].aura ?? 0;
      let boosting = 0;
      if (TOWERS[sel.type].levels[sel.level].shields) {
        for (const m of medicShields(st.towers.values()).values()) if (m.id === sel.id) boosting++;
      } else for (const o of st.towers.values()) if (o.type !== sel.type && (o.x - sel.x) ** 2 + (o.z - sel.z) ** 2 <= aura * aura) boosting++;
      this.ui.updatePanel(sel, { myId: s.myId, cash: this.myCash, mp: s.mp, versus: this.versus, borrowed, buff, upCost, upCostB, boosting, ownerName: st.players.get(sel.owner)?.name ?? 'a player who left' });
      const smoked = sel.fx & 1 && !TOWERS[sel.type].kind && !TOWERS[sel.type].orbit;
      const r = ringRadius(sel.type, sel.level, buff) * (smoked ? VERSUS.smokeRange : 1);
      if (this.aiming) {
        // the aim ring is drawn by updateGhost
      } else if (def.fps) this.showCone(sel.x, sel.z, r, sel.face ?? sel.yaw, def.levels[sel.level].cone, 0xffffff);
      else if (r > 0) this.showRing(def.heli ? sel.cx ?? sel.x : sel.x, def.heli ? sel.cz ?? sel.z : sel.z, r, 0xffffff, innerRings(sel.type, sel.level));
      else this.ring.visible = this.cone.visible = false;
    } else if (!this.placing) this.cone.visible = false;
    if (this.fps) this.updateFpsHud();
  }

  // ------------------------------------------------------------------ camera

  updateCamera(dt) {
    if (this.fps && this.fpsCamera()) return;
    const cam = this.cam;
    const k = this.keys;
    if (this.session && !this.ui.chatOpen) {
      if (k.has('ArrowLeft')) cam.yaw += dt * 2.2;
      if (k.has('ArrowRight')) cam.yaw -= dt * 2.2;
      if (k.has('ArrowUp')) cam.pitch = clamp(cam.pitch + dt * 1.2, 0.08, 1.4);
      if (k.has('ArrowDown')) cam.pitch = clamp(cam.pitch - dt * 1.2, 0.08, 1.4);
    }
    if (this.player) {
      const p = this.player.pos;
      cam.target.lerp({ x: p.x, y: p.y + 4, z: p.z }, Math.min(1, dt * 12));
    }
    const cp = Math.cos(cam.pitch);
    this.camera.position.set(
      cam.target.x + Math.sin(cam.yaw) * cp * cam.dist,
      Math.max(1, cam.target.y + Math.sin(cam.pitch) * cam.dist),
      cam.target.z + Math.cos(cam.yaw) * cp * cam.dist,
    );
    this.camera.lookAt(cam.target);
  }

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
        return;
      }
      this.keys.add(e.code);
      if (e.repeat || this.ended) return;
      const slot = /^Digit([1-9])$/.exec(e.code);
      const type = slot && this.loadout[Number(slot[1]) - 1];
      if (type) this.placing === type ? this.cancelPlace() : this.beginPlace(type);
      if (e.code === 'Escape' || e.code === 'KeyQ') {
        if (this.aiming) {
          this.stopAim(); // just stop aiming, keep the tower selected
          return;
        }
        this.cancelPlace();
        this.deselect();
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
    canvas.addEventListener('mousedown', (e) => {
      if (this.fps) {
        if (e.button === 0) this.setFpsFire(true);
        return;
      }
      if (e.button === 2) rotating = true;
      if (e.button === 0) leftDown = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', (e) => {
      if (this.fps && e.button === 0) {
        this.setFpsFire(false);
        leftDown = null;
        return;
      }
      if (e.button === 2) rotating = false;
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
        this.cam.pitch = clamp(this.cam.pitch + e.movementY * 0.005, 0.08, 1.4);
      }
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (this.session && !this.fps) this.cam.dist = clamp(this.cam.dist * (e.deltaY > 0 ? 1.1 : 1 / 1.1), 8, 90);
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

  handleClick() {
    if (!this.session || this.ended || this.fps) return;
    if (this.placing) return this.tryPlace();
    if (this.aiming) return this.tryAim();
    const id = this.pickTower();
    if (id != null) this.select(id);
    else this.deselect();
  }

  /** The tower under the mouse (id), if any. */
  pickTower() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const groups = [...this.towerViews.values()].map((v) => v.group);
    return this.raycaster.intersectObjects(groups, true)[0]?.object.userData.towerId;
  }

  /** Mouse point on the ground, or on a cliff top when the cursor is over one. */
  pickGround() {
    const ray = this.raycaster.ray;
    const hit = new THREE.Vector3();
    let best = Infinity;
    this.hasGround = false;
    const lanes = this.versus ? this.state.lanes : 1;
    for (let i = 0; i < lanes * CLIFFS.length; i++) {
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
    if (this.myTowerCount(type) >= def.limit) return this.fail(`Placement limit reached (${def.limit})`);
    this.cancelPlace();
    this.deselect();
    this.placing = type;
    this.ghost = TOWER_MODELS[type](0);
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
    const a = this.aiming;
    if (a?.key === 'clone') {
      // Hologram Tower: nothing to show until a tower is picked, then a see-through cyan copy.
      if (a.ghost) this.moveGhost(a.ghost, a.type, a.level, 0x006064);
      else this.ring.visible = this.cone.visible = false;
      return;
    }
    if (a) {
      if (this.hasGround) this.showRing(this.groundHit.x, this.groundHit.z, a.radius, 0xff5722);
      else this.ring.visible = false;
    }
    if (this.ghost) this.moveGhost(this.ghost, this.placing, 0, 0x000000);
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
    g.root.position.set(x, heightAt(x, z) + 0.4, z);
    // Face the camera; the Gatling Gun faces away from it (its cone points where you look).
    g.root.rotation.y = this.cam.yaw + (def.fps ? Math.PI : 0);
    setEmissive(g, g.valid ? tint : 0xaa0000);
    const color = g.valid ? 0x4caf50 : 0xf44336;
    if (def.fps) this.showCone(x, z, ringRadius(type, level), g.root.rotation.y, def.levels[level].cone, color);
    else this.showRing(x, z, ringRadius(type, level), color, innerRings(type, level));
  }

  tryPlace() {
    const def = TOWERS[this.placing];
    if (this.versus && this.hasGround && laneOf(this.groundHit.z) !== this.myLane) return this.fail('You can only build on your own map!');
    if (!this.hasGround || !this.ghost?.valid) {
      return this.fail(def.placement === 'cliff' ? `${def.name} can only go on top of a cliff!` : "Can't place there!");
    }
    const cost = this.costOf(this.placing);
    if (this.myCash < cost) return this.fail('Not enough cash!');
    const type = this.placing;
    this.session.send({ a: 'place', type, x: this.groundHit.x, z: this.groundHit.z, yaw: this.cam.yaw });
    this.cancelPlace();
    // Hold Shift to keep placing the same tower.
    if (this.shiftHeld && this.myCash >= cost * 2) this.beginPlace(type);
  }

  // ------------------------------------------------------------------ selection

  select(id) {
    this.deselect();
    this.selectedId = id;
    this.towerViews.get(id)?.setSelected(true);
    this.uiTimer = 0; // refresh panel now
  }

  deselect() {
    this.stopAim();
    if (this.selectedId != null) this.towerViews.get(this.selectedId)?.setSelected(false);
    this.selectedId = null;
    this.ui.hidePanel();
    if (!this.placing) {
      this.ring.visible = false;
      this.cone.visible = false;
    }
  }

  /** Upgrade / sell / target. `path`: 'bottom' to take the Bottom upgrade path at a fork. */
  towerAction(a, path = null) {
    const t = this.state?.towers.get(this.selectedId);
    if (!t || this.ended) return;
    if (t.owner !== this.session.myId) return this.fail("That's not your tower!");
    if (a === 'upgrade') {
      const def = TOWERS[t.type];
      const branch = path === 'bottom' && def.branch && t.level + 1 === def.branchAt;
      const next = TOWERS[branch ? def.branch : t.type].levels[t.level + 1];
      if (!next) return this.fail('Already max level!');
      const cost = upgradeCost(next, buffOf(computeBuffs(this.state.towers.values()), t.id));
      if (this.myCash < cost) return this.fail(`Need $${cost} to upgrade`);
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
      g.active = Math.max(0, ...g.towers.map((t) => ((g.ab.key === 'cta' || g.ab.key === 'uber') && t.active) || 0));
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
    if (ab.aim) {
      this.aiming = { id: t.id, key, radius: ab.radius };
      this.ui.toast(key === 'patrol' ? 'Click where the helicopter should patrol (Esc to cancel)' : key === 'airdrop' ? 'Click where the mercenaries should land (Esc to cancel)' : `Click where the ${ab.name} should hit (Esc to cancel)`, 2500);
      return;
    }
    this.session.send({ a: 'ability', id: t.id, key });
  }

  tryAim() {
    if (this.aiming.key === 'clone') return this.tryClone(this.aiming);
    if (!this.hasGround) return this.fail('Pick a spot on the ground');
    const { id, key } = this.aiming;
    this.aiming = null;
    this.session.send({ a: 'ability', id, key, x: this.groundHit.x, z: this.groundHit.z });
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
      setOpacity(a.ghost, 0.45);
      a.ghost.root.visible = false;
      this.scene.add(a.ghost.root);
      this.ui.toast(`Click where the hologram ${def.name} should go ($${cost.toLocaleString()}, Esc to cancel)`, 2500);
      return;
    }
    if (this.versus && this.hasGround && laneOf(this.groundHit.z) !== this.myLane) return this.fail('You can only build on your own map!');
    if (!this.hasGround || !a.ghost.valid) return this.fail(TOWERS[a.type].placement === 'cliff' ? 'That tower can only go on top of a cliff!' : "Can't place there!");
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
    this.fps = { id: t.id, yaw: t.yaw, pitch: -0.08, fire: false, sendT: 0, age: 0, locked: false };
    // Lock the mouse for aiming (if the browser refuses, the cursor's spot on the map aims instead).
    Promise.resolve(this.canvas.requestPointerLock?.()).catch(() => {});
    if (!this.fpsHud) {
      this.fpsHud = document.createElement('div');
      this.fpsHud.id = 'fps-hud';
      this.fpsHud.innerHTML = '<div class="cross"></div><div class="fps-info"></div>';
      document.body.appendChild(this.fpsHud);
    }
    this.fpsHud.classList.remove('hidden');
    this.ui.toast('FPS Mode! Move the mouse to aim, hold left click to fire. F or Esc to stop.', 3500);
  }

  /** Leaves FPS Mode. `toggle`: also tell the sim to hand the gun back to its autopilot. */
  exitFps(toggle) {
    const f = this.fps;
    if (!f) return;
    this.fps = null;
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
    if (!f.locked && this.hasGround) {
      // No pointer lock (some browsers): aim at whatever the cursor points at instead.
      f.yaw = Math.atan2(this.groundHit.x - t.x, this.groundHit.z - t.z);
    }
    f.sendT -= dt;
    if (f.sendT > 0) return;
    f.sendT = FPS_SEND_INTERVAL;
    const v = this.towerViews.get(t.id);
    const h = v ? this.fpsEyeHeight(v) : 4;
    const k = (n) => Math.round(n * 1000) / 1000;
    this.session.send({ a: 'aim', id: t.id, yaw: k(f.yaw), pitch: k(f.pitch), h: k(h), fire: f.fire ? 1 : 0 });
  }

  /** First-person camera just behind and above the gun. False if the gun is gone. */
  fpsCamera() {
    const f = this.fps;
    const t = this.state?.towers.get(f.id);
    const v = t && this.towerViews.get(t.id);
    if (!v) return false;
    const fx = Math.sin(f.yaw);
    const fz = Math.cos(f.yaw);
    const y = v.group.position.y + this.fpsEyeHeight(v);
    this.camera.position.set(t.x - fx * FPS_BACK, y, t.z - fz * FPS_BACK);
    const cp = Math.cos(f.pitch);
    this.camera.lookAt(t.x + fx * cp * 30, y + Math.sin(f.pitch) * 30, t.z + fz * cp * 30);
    this.cam.target.set(t.x, 4, t.z); // so shadows follow
    return true;
  }

  /** FPS camera height above the gun's ground (bullets start from the camera, at the crosshair). */
  fpsEyeHeight(v) {
    return (v.model.fpsHeight ?? 3) + 1.6;
  }

  updateFpsHud() {
    const t = this.state?.towers.get(this.fps.id);
    if (!t) return;
    const s = TOWERS[t.type].levels[t.level];
    const ammo = t.reloadT > 0 ? `Reloading… ${Math.ceil(t.reloadT)}s` : `Ammo ${t.ammo ?? s.ammo} / ${s.ammo}`;
    const text = `${ammo} · Hold click to fire · F / Esc to stop`;
    const el = this.fpsHud.querySelector('.fps-info');
    if (el.textContent !== text) el.textContent = text;
  }

  fail(msg) {
    audio.error();
    this.ui.toast(msg);
  }

  // ------------------------------------------------------------------ misc

  renderIcon(model) {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setSize(128, 128);
    const s = new THREE.Scene();
    s.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2.2));
    const d = new THREE.DirectionalLight(0xffffff, 2);
    d.position.set(3, 5, 6);
    s.add(d);
    model.root.rotation.y = 0.6;
    s.add(model.root);
    if (model.plane) {
      // Aviator: show its plane flying overhead in the portrait.
      model.plane.position.set(-0.4, 5.6, -2.5);
      model.plane.rotation.set(0.25, 1.9, 0);
      model.plane.scale.setScalar(0.55);
      s.add(model.plane);
    }
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    cam.position.set(1.5, 4.2, 11);
    cam.lookAt(0, 3.1, 0);
    r.render(s, cam);
    const url = r.domElement.toDataURL();
    r.dispose();
    r.forceContextLoss();
    return url;
  }
}

