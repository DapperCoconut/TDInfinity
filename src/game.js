// The in-game client: renders the world, handles input, and mirrors a session's state.
// Works identically for solo (LocalSession) and multiplayer (NetSession).
import * as THREE from 'three';
import { DIFFICULTIES, ENEMIES, GAME, PERKS, PERK_NAMES, TOWERS, TRACKS, VERSUS, WAVES, cloneCost, difficulty, facesCone, rootType, timedAbility, towerCost, towerLimit, xpKey } from './config.js';

// Tower XP: the most XP one tower type can earn each wave (see earnXp).
const XP_PER_WAVE_CAP = 40;
import { profile } from './profile.js';
import { buildTimeWorld, buildVersusLinks, buildWorld, versusWalkable } from './world.js';
import { Player } from './player.js';
import { BeamView, BombView, MarkView, OrbView, EnemyView, LEAP_TIME, RemotePlayerView, TowerView, TrapView, UnitView, makeNameTag } from './views.js';
import { Effects } from './effects.js';
import { audio } from './audio.js';
import { ABILITY_BAR_KEYS, UI } from './ui.js';
import { subInfo } from './substats.js';
import { TOWER_MODELS, setEmissive, setOpacity } from './models.js';
import { towerIcon } from './icons.js';
import { clamp } from './utils.js';
import { MODEL_SCALE, WORLD_SCALE } from './scale.js';
import { BOUNDS, PLAYER_SPAWN, path, setTimeWorld } from './sim/path.js';
import { CASTLE, CLIFFS, MAP, canPlace, heightAt, laneOf, laneOz, levelAt, mapInfo, mapKey, mapVersion, setMap, nexusWalkable, gridWalkable, courtWalkable, emberWalkable, rampartWalkable, brookWalkable, rigWalkable, placeFail } from './sim/map.js';
import { baseKey } from './sim/maps.js';
import { FPS_BACK, borrowsHidden, buffOf, computeBuffs, mediCharge, medicShields, nextUpgrade, spyCircles, upgradeCost } from './sim/sim.js';

const CAM_PITCH_MIN = -0.35; // below 0 the camera sits lower than the player and looks up
const CAM_GROUND_GAP = 0.3; // how close (world units) the camera may get to the ground
/**
 * Radius of a tower's ring: the flight ring for Aviators, the boost range for support towers,
 * nothing for spawners and Farms, otherwise its (boosted) range.
 */
function ringRadius(type, level, buff, x = 0, z = 0) {
  const def = TOWERS[type];
  const s = levelAt(def.levels[level], x, z); // Penetrator: more range on a cliff
  if (def.orbit) return def.orbit;
  if (def.heli) return s.patrol; // Pursuit: its patrol zone
  if (s.aura) return s.aura;
  if (def.kind === 'spawner' && s.range) return s.range; // Mercenary Base: where its units roll out
  if (def.kind) return 0;
  return s.range * (buff?.range ?? 1);
}
/** Engineer: its yellow build ring and red deadzone, drawn inside the range ring. */
function innerRings(type, level) {
  const def = TOWERS[type];
  const s = def.levels[level];
  if (!s.buildRange) return s.minRange ? [{ r: s.minRange, color: 0xff1744 }] : null; // XWM Missile Pods blind spot
  return [{ r: s.buildRange, color: 0xffd600 }, { r: def.minRange || 0, color: 0xff1744 }];
}
const ABILITY_KEYS = { KeyF: 0, KeyG: 1, KeyH: 2 };
const EMPTY = new Map();
// What the player bumps into and can stand on, shaped like the models drawn in world.js
// (MAP.obstacles is coarser: it's for tower placement and decoration spacing). Rebuilt for each map.
let CASTLE_COLLIDERS = [];
let LANE_COLLIDERS = [];
function buildColliders() {
  CASTLE_COLLIDERS = mapInfo.nexus || mapInfo.base === 'cave' || mapInfo.court || mapInfo.ember || mapInfo.rampart || mapInfo.brook || mapInfo.rig ? [] : [ // Twilight Nexus has no castle; Sunset Crossing has a cave; Shattered Court's castle is off the tiles
    { x: CASTLE.x, z: CASTLE.z, hx: 5, hz: 7, h: 10 }, // keep
    ...[-3, -1, 1, 3].flatMap((i) => [-4.4, 4.4].map((dx) => ({ x: CASTLE.x + dx, z: CASTLE.z + i * 2, hx: 0.6, hz: 0.8, h: 11.4 }))), // battlements
    ...[[-5, -7], [-5, 7], [5, -7], [5, 7]].flatMap(([dx, dz]) => [
      { x: CASTLE.x + dx, z: CASTLE.z + dz, hx: 1.7, hz: 1.7, h: 14 }, // corner towers
      { x: CASTLE.x + dx, z: CASTLE.z + dz, hx: 2, hz: 2, h: 16.4 }, // their roofs
    ]),
  ];
  const round = mapInfo.tree === 'round';
  LANE_COLLIDERS = [
    ...MAP.trees.flatMap(({ x, z, s }) =>
      round
        ? [
          { x, z, r: 2.3 * s, h: 6.9 * s }, // leaves (the player is taller than the trunk under them)
          { x, z, r: 1.5 * s, h: 8.6 * s }, // top tuft
        ]
        : [{ x, z, r: 0.9 * s, h: Infinity }], // pines, cacti, palms, crystals: bump into the trunk
    ),
    ...MAP.rocks.map(({ x, z, s }) => ({ x, z, r: 0.9 * s, h: 1.3 * s })),
    ...MAP.colliders,
    ...CASTLE_COLLIDERS,
    ...CLIFFS.map((c) => ({ x: c.x, z: c.z, r: c.r, h: c.h })),
  ];
}
buildColliders();
const ORDINAL = ['', '1st', '2nd', '3rd', '4th'];

const ICE_NADE = { color: 0x4fc3f7, size: 0.5, arc: 3.5, glowing: true }; // Frost / Cryo Grenade
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
    this.placeRot = 0; // extra turn (R key) on the tower being placed, added to the camera's facing
    this.fps = null; // Gatling Gun FPS Mode: { id, yaw, pitch, fire, sendT, age }
    this.ghost = null;
    this.selectedId = null; // the selected tower
    this.selectedSub = null; // or a selected { kind: 'plane' | 'trap' | 'unit', id } (plane: its tower's id)
    this.subRing = null; // { range } of the selected sub, refreshed with the HUD
    this.subPos = new THREE.Vector3();
    this.ended = false;
    this.posTimer = 0;
    this.following = new Set(); // Cryo Helicopters flying along with us (Follow Player)
    this.followTimer = 0;
    this.uiTimer = 0;

    // ---- renderer / scene
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = renderer;

    const root = new THREE.Scene();
    root.background = new THREE.Color(mapInfo.theme.sky);
    root.fog = new THREE.Fog(mapInfo.theme.sky, 90, 200);
    this.root = root;
    // Everything on the map lives in this group, in sim units; the group draws it WORLD_SCALE big.
    const scene = new THREE.Group();
    scene.scale.setScalar(WORLD_SCALE);
    root.add(scene);
    this.scene = scene;
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 700);

    this.hemi = new THREE.HemisphereLight(0xdff3ff, 0x4a6b3a, 1.6);
    root.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xfff4e0, 2.6);
    sun.position.set(60 * WORLD_SCALE, 120 * WORLD_SCALE, 45 * WORLD_SCALE);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    const W = WORLD_SCALE;
    Object.assign(sun.shadow.camera, { left: -130 * W, right: 130 * W, top: 100 * W, bottom: -100 * W, near: 10 * W, far: 350 * W });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04 * W;
    root.add(sun, sun.target);
    this.sun = sun; // follows the camera so every Versus map gets shadows

    this.baseWorld = buildWorld(scene);
    this.mapVersion = mapVersion; // which map baseWorld shows
    this.applyLighting();
    this.laneWorlds = []; // Versus maps, built on first use and kept for later games
    this.links = new Map(); // lane count -> water + bridges group
    this.laneTags = [];
    this.staticColliders = LANE_COLLIDERS;
    this.effects = new Effects(scene, root);
    this.effects.onShake = (time, amount) => this.shake(time, amount); // big blasts shake the camera
    this.buildRing();

    // cam.target and cam.dist are in drawn (world) units, not sim units.
    this.cam = { yaw: 0.6, pitch: 0.6, dist: 110 * WORLD_SCALE, target: new THREE.Vector3(0, 4 * WORLD_SCALE, 0) };
    this.keys = new Set();
    this.mouse = new THREE.Vector2(9, 9);
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.groundHit = new THREE.Vector3();
    this.hasGround = false;
    this.shiftHeld = false;

    this.ui = new UI({
      onSkip: () => this.session?.send({ a: 'skip' }),
      onSpeed: (v) => this.session?.send({ a: 'speed', v }),
      onMute: () => this.ui.setMuted(audio.toggleMute()),
      onMusic: () => this.ui.setMusic(audio.toggleMusic()),
      onSlot: (type) => (this.placing === type ? this.cancelPlace() : this.beginPlace(type)),
      onPanel: (action) => {
        if (action === 'close') this.deselect();
        else if (action === 'parent') this.selectParent();
        else if (action === 'upgrade') this.towerAction('upgrade');
        else if (action === 'upgrade:bottom') this.towerAction('upgrade', 'bottom');
        else if (action === 'sell') this.towerAction('sell');
        else if (action === 'target') this.towerAction('target');
        else if (action.startsWith('pick:')) this.towerPick(action.slice(5));
        else if (action.startsWith('choose:')) this.towerChoose(...action.slice(7).split(':'));
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
    // (Crosspath combos share their tower's icon: see ui.js.)
    this.icons = new Proxy({}, { get: (_, type) => (typeof type === 'string' ? towerIcon(type, 0) : undefined) }); // drawn on first use (icons.js)
    this.loadout = [];
    this.ui.setMuted(false);
    this.ui.setMusic(audio.musicLevel);
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

  /** Placement limit of `type` (Field Barracks: lower in bigger teams; each Versus player is on their own). */
  limitOf(type) {
    return towerLimit(TOWERS[type], this.versus ? 1 : (this.state?.players.size ?? 1));
  }

  // ------------------------------------------------------------------ lifecycle

  start(session) {
    this.stop();
    this.session = session;
    this.syncMap();
    this.showTimeWorld(false);
    this.ended = false;
    this.spectating = false;
    this.following.clear();
    this.elimWave = 0;
    this.elimPlace = 0;
    this.loadout = profile.battleLoadout();
    this.ui.buildHotbar(this.icons, this.loadout, (type) => this.costOf(type), (type) => this.limitOf(type));
    session.onError = (msg) => this.fail(msg);
    const ids = [...session.state.players.keys()];
    const idx = this.versus ? 0 : Math.max(0, ids.indexOf(session.myId));
    const spawn = { x: PLAYER_SPAWN.x + (idx % 2) * 5 - 2.5, y: PLAYER_SPAWN.y, z: PLAYER_SPAWN.z + Math.floor(idx / 2) * 5 + laneOz(this.myLane) };
    if (this.versus) this.setupVersus(session.state.lanes);
    this.player = new Player(this.scene, spawn, this.me?.color);
    if (this.versus) this.player.area = (x, z) => versusWalkable(x, z, session.state.lanes) && (!mapInfo.nexus || nexusWalkable(x, z)) && (!mapInfo.court || courtWalkable(x, z)) && (!mapInfo.ember || emberWalkable(x, z)) && (!mapInfo.rampart || rampartWalkable(x, z)) && (!mapInfo.brook || brookWalkable(x, z)) && (!mapInfo.rig || rigWalkable(x, z));
    else if (mapInfo.nexus) this.player.area = (x, z) => path.time || nexusWalkable(x, z); // the deck floats over the void
    else if (mapInfo.grid) this.player.area = (x, z) => path.time || gridWalkable(x, z); // the plateau's cliff edges
    else if (mapInfo.court) this.player.area = (x, z) => path.time || courtWalkable(x, z); // the tiles float over the void
    else if (mapInfo.ember) this.player.area = (x, z) => path.time || emberWalkable(x, z); // the island is ringed by lava
    else if (mapInfo.rampart) this.player.area = (x, z) => path.time || rampartWalkable(x, z); // the bowl, not the pond or the sewer
    else if (mapInfo.brook) this.player.area = (x, z) => path.time || brookWalkable(x, z); // the bowl, not the stream's water
    else if (mapInfo.rig) this.player.area = (x, z) => path.time || rigWalkable(x, z); // the deck, bridges and helipad, not the sea
    this.cam.yaw = 0;
    this.cam.pitch = 0.55;
    this.cam.dist = 34;
    this.cam.target.set(spawn.x * WORLD_SCALE, 4, spawn.z * WORLD_SCALE);
    this.ui.show(true, session.mp, this.versus);
    const keys = `1-${this.loadout.length}`;
    this.ui.toast(
      this.versus ? 'VERSUS! Defend your own map and outlast everyone. Buy zombies (left panel) to send to your target!'
      : session.mp ? `Work together! Press ${keys} to place towers, Enter to chat.` : `Place towers (press ${keys}), then start the wave!`,
      this.versus ? 5000 : 3500,
    );
  }

  /** Rebuilds the scenery, colliders and sky if the session is on a different map than last game. */
  syncMap() {
    if (this.mapVersion === mapVersion) return;
    this.mapVersion = mapVersion;
    buildColliders();
    this.scene.remove(this.baseWorld);
    this.baseWorld = buildWorld(this.scene);
    for (const w of this.laneWorlds) this.scene.remove(w);
    this.laneWorlds = [];
    if (this.timeWorld) this.scene.remove(this.timeWorld); // its path ends where this map's does
    this.timeWorld = null;
    this.timeShown = false;
    this.staticColliders = LANE_COLLIDERS;
    this.setSky(mapInfo.theme.sky);
    this.applyLighting();
  }

  /**
   * Menu pictures of maps. Asks for a picture of every map in `keys`: one is made per frame while
   * no game is on (the world is rebuilt as that map and drawn from above into an off-screen
   * buffer; the screen keeps its last frame meanwhile, so nothing flickers behind the menu).
   * `each(key, url)` gets every picture as it's ready; `done()` runs after the last one and must
   * put the menu's own map back.
   */
  requestMapThumbs(keys, each, done) {
    this.thumbJob = { keys: [...keys], each, done };
  }

  /** One step of requestMapThumbs. */
  stepThumbs() {
    const job = this.thumbJob;
    const key = job.keys.shift();
    if (key == null) {
      this.thumbJob = null;
      job.done?.();
      return;
    }
    let url = '';
    try {
      setMap(key);
      this.syncMap();
      url = this.drawMapThumb();
    } catch (err) {
      console.warn('map picture failed', key, err);
    }
    job.each(key, url);
  }

  /** Draws the map that's showing as a square picture, seen from high up in the south. Returns a data URL. */
  drawMapThumb(size = 320) {
    const W = WORLD_SCALE;
    const r = this.renderer;
    let t = this.thumb;
    if (!t) {
      // Lit colors are drawn into a half-float buffer and turned into screen colors by a second
      // pass (an 8-bit buffer would band the dark night maps).
      const float = r.extensions.has('EXT_color_buffer_float') || r.extensions.has('EXT_color_buffer_half_float');
      const lit = new THREE.WebGLRenderTarget(size, size, { type: float ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: 4 });
      const out = new THREE.WebGLRenderTarget(size, size, { depthBuffer: false });
      const quad = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.ShaderMaterial({
          uniforms: { map: { value: lit.texture } },
          vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
          fragmentShader: `uniform sampler2D map; varying vec2 vUv;
            void main() {
              vec3 c = clamp(texture2D(map, vUv).rgb, 0.0, 1.0);
              vec3 lo = c * 12.92, hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
              gl_FragColor = vec4(mix(lo, hi, step(vec3(0.0031308), c)), 1.0);
            }`,
          depthTest: false,
          depthWrite: false,
        }),
      );
      quad.frustumCulled = false;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      t = this.thumb = { lit, out, quad, cam: new THREE.PerspectiveCamera(30, 1, 1, 900), flat: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), canvas, ctx: canvas.getContext('2d'), buf: new Uint8Array(size * size * 4) };
    }
    // Fit the play area (wider than deep on most maps) into the square.
    const cx = ((BOUNDS.minX + BOUNDS.maxX) / 2) * W;
    const cz = ((BOUNDS.minZ + BOUNDS.maxZ) / 2) * W;
    const half = (Math.max(BOUNDS.maxX - BOUNDS.minX, (BOUNDS.maxZ - BOUNDS.minZ) * 1.2) / 2) * W;
    const dist = (half / Math.tan((t.cam.fov * Math.PI) / 360)) * 0.9;
    const yaw = 0.42;
    const pitch = 0.9;
    t.cam.position.set(cx + Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, cz + Math.cos(yaw) * Math.cos(pitch) * dist);
    t.cam.lookAt(cx, 0, cz);
    const so = this.sunOff ?? [60, 120, 45];
    this.sun.position.set(cx + so[0] * W, so[1] * W, cz + so[2] * W);
    this.sun.target.position.set(cx, 0, cz);
    this.sun.target.updateMatrixWorld();
    // The map's fog is set up for a camera on the ground: from up here it would hide everything.
    const fog = this.root.fog;
    const { near, far } = fog;
    fog.near = dist * 0.85;
    fog.far = dist * 2.4;
    this.baseWorld.userData.tick?.(3);
    // Clouds and the like (userData.sky) would cover the map from up here.
    const hidden = [];
    this.baseWorld.traverse((o) => o.userData.sky && o.visible && hidden.push(o));
    for (const o of hidden) o.visible = false;
    r.setRenderTarget(t.lit);
    r.render(this.root, t.cam);
    for (const o of hidden) o.visible = true;
    r.setRenderTarget(t.out);
    r.render(t.quad, t.flat);
    r.readRenderTargetPixels(t.out, 0, 0, size, size, t.buf);
    r.setRenderTarget(null);
    fog.near = near;
    fog.far = far;
    // The buffer's rows run bottom to top.
    const img = t.ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) img.data.set(t.buf.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
    t.ctx.putImageData(img, 0, 0);
    return t.canvas.toDataURL('image/jpeg', 0.84);
  }

  /** Day maps: bright sun and sky light. Night maps (Twilight Nexus): dim, lit mostly by neon, thick haze. */
  applyLighting() {
    const t = mapInfo.theme;
    const night = !!t.night;
    this.hemi.color.set(night ? 0x6a7cc8 : 0xdff3ff);
    this.hemi.groundColor.set(night ? 0x141a33 : 0x4a6b3a);
    this.hemi.intensity = night ? 1.2 : 1.6;
    this.sun.color.set(night ? 0x9fb4ff : 0xfff4e0);
    this.sun.intensity = night ? 0.8 : 2.6;
    // Sunset maps: a warm orange sun low in the west, soft and peachy all round.
    this.sunOff = t.sunset ? [-120, 55, 40] : [60, 120, 45];
    if (t.sunset) {
      this.sun.color.set(0xffb070);
      this.sun.intensity = 2.3;
      this.hemi.color.set(0xffd2b0);
      this.hemi.groundColor.set(0x6a4a3a);
      this.hemi.intensity = 1.5;
    }
    // Lava maps (Ember Keep): no sun, a warm red-orange glow from everywhere, strongest from below.
    if (t.lava) {
      this.sunOff = [30, 120, 20];
      this.sun.color.set(0xff7a40);
      this.sun.intensity = 0.9;
      this.hemi.color.set(0xff8a60);
      this.hemi.groundColor.set(0xff6a10);
      this.hemi.intensity = 1.9;
    }
    // Lamp-lit night maps (Midnight Rampart): a faint cold moon, warm low ambient light bouncing off orange ground.
    if (t.lamps) {
      this.sunOff = [-40, 120, -60];
      this.sun.color.set(0xb8b4d8);
      this.sun.intensity = 0.55;
      this.hemi.color.set(0x8a8098);
      this.hemi.groundColor.set(0x4a2a14);
      this.hemi.intensity = 1.05;
    }
    if (t.sunOff) this.sunOff = t.sunOff; // a map's own sun direction (Brook Hollow: from the east)
    this.root.fog.near = t.fogNear ?? 90; // drawn units
    this.root.fog.far = t.fogFar ?? 200;
    if (t.fog != null) this.root.fog.color.set(t.fog);
  }

  setSky(color) {
    this.root.background.set(color);
    this.root.fog.color.set(mapInfo.theme.fog != null && color === mapInfo.theme.sky ? mapInfo.theme.fog : color);
    // The effects that tint the sky go back to these colors when they end.
    if (this.effects.skyBase) this.effects.skyBase.set(color);
    if (this.effects.fogBase) this.effects.fogBase.set(color);
  }

  /**
   * Insane mode: swap between the normal map and the Beholder's time dimension (one long straight
   * path, no trees or cliffs). Also re-lays the shared path for clients that don't run the sim.
   */
  showTimeWorld(on) {
    on = !!on;
    setTimeWorld(on);
    if (on === !!this.timeShown) return;
    this.timeShown = on;
    if (on) this.timeWorld ??= buildTimeWorld(this.scene);
    if (this.timeWorld) this.timeWorld.visible = on;
    if (!this.versus) this.baseWorld.visible = !on;
    if (!this.versus) this.staticColliders = on ? CASTLE_COLLIDERS : LANE_COLLIDERS;
    this.effects.setChronoWorld(on);
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
    for (const v of this.bombViews?.values() ?? []) v.dispose();
    this.bombViews?.clear();
    for (const v of this.markViews?.values() ?? []) v.dispose();
    this.markViews?.clear();
    for (const v of this.orbViews?.values() ?? []) v.dispose();
    this.orbViews?.clear();
    for (const v of this.beamViews?.values() ?? []) v.dispose();
    this.beamViews?.clear();
    this.lasering = null;
    this.effects.setVoid(0);
    this.ui.bossBar(null);
    if (this.versus) this.teardownVersus();
    this.showTimeWorld(false);
    this.session.dispose();
    this.session = null;
    this.keys.clear();
    this.ui.show(false);
    this.ui.setBoss(null);
    this.cam.dist = 110 * WORLD_SCALE;
    this.cam.pitch = 0.6;
  }

  addChat(m) {
    if (this.session?.mp) this.ui.addChat(m);
  }

  // ------------------------------------------------------------------ main loop

  frame() {
    const realDt = Math.min(this.clock.getDelta(), 0.05);
    const s = this.session;
    // Music: the menu tracks, or in a game the map's track (a boss's own while it's alive).
    if (!s || this.ended || s.state.over) audio.musicMenu(s ? 2 : 0);
    else audio.musicGame(baseKey(mapKey), s.state.enemies.values());
    if (s) {
      const st = s.state;
      const gdt = st.over ? 0 : realDt * st.speed;
      if (this.fps) this.updateFps(realDt);
      if (!this.ended && !this.fps) {
        const colliders = this.staticColliders.concat(
          [...st.towers.values()].map((t) => ({ x: t.x, z: t.z, r: 1.7 * MODEL_SCALE, h: heightAt(t.x, t.z) + (this.towerViews.get(t.id)?.top ?? 3 * MODEL_SCALE) })),
        );
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
      if (this.lasering) {
        // Gold Commander Orbital Airstrike: the beam follows our cursor.
        const l = this.lasering;
        l.timer -= realDt;
        if (!st.towers.get(l.id) || !(st.beams ?? []).some((b) => b.id === l.id) && performance.now() > l.start + 2000) this.lasering = null;
        else if (l.timer <= 0 && this.hasGround) {
          l.timer = 0.1;
          s.send({ a: 'laser', id: l.id, x: this.groundHit.x, z: this.groundHit.z });
        }
      }
      if (this.following.size) {
        // Cryo Helicopter Follow Player: keep telling the sim where we are.
        this.followTimer -= realDt;
        if (this.followTimer <= 0) {
          this.followTimer = 0.25;
          const p = this.player.pos;
          for (const id of this.following) {
            if (!st.towers.has(id)) this.following.delete(id);
            else s.send({ a: 'follow', id, x: p.x, z: p.z });
          }
        }
      }
      if (st.orbs?.length && this.player) {
        // VOID's magic missiles: walking into one pops it.
        const p = this.player.pos;
        this.popped ??= new Set();
        for (const o of st.orbs) {
          if (this.popped.has(o.id) || Math.hypot(o.x - p.x, o.z - p.z) > 4 || p.y > 8) continue;
          this.popped.add(o.id);
          s.send({ a: 'pop', id: o.id });
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
      // Menu map pictures: one per frame, once the menu's own backdrop has been drawn a few times.
      if (this.thumbJob && (this.menuFrames = (this.menuFrames ?? 0) + 1) > 3) {
        this.stepThumbs();
        return;
      }
    }

    this.updateCamera(realDt);
    const ct = this.cam.target;
    const so = this.sunOff ?? [60, 120, 45];
    this.sun.position.set(ct.x + so[0] * WORLD_SCALE, so[1] * WORLD_SCALE, ct.z + so[2] * WORLD_SCALE);
    this.sun.target.position.set(ct.x, 0, ct.z);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    this.pickGround();
    this.effects.update(realDt);
    if (this.timeShown) this.timeWorld.userData.tick(performance.now() / 1000);
    // Animated scenery (lava, smoke...) on whichever maps are showing.
    const now = performance.now() / 1000;
    if (this.baseWorld.visible) this.baseWorld.userData.tick?.(now);
    for (const w of this.laneWorlds) if (w.visible) w.userData.tick?.(now);
    this.updateGhost();
    if (this.session) this.updateHud(realDt);
    if (this.session) this.updateSubRing();
    this.renderer.render(this.root, this.camera);
  }

  handleEvents(evs) {
    const st = this.state;
    const myId = this.session.myId;
    for (const ev of evs) {
      switch (ev.k) {
        case 'shot': {
          const e = this.enemyViews.get(ev.e);
          if (ev.dr) this.towerViews.get(ev.t)?.droneShoot(e, this.effects, audio); // Ghost C7 Drone
          else this.towerViews.get(ev.t)?.shoot(e, this.effects, audio);
          if (ev.c && e) this.effects.text(e.aimPoint(new THREE.Vector3()).add(new THREE.Vector3(0, 2.5, 0)), ev.c === 2 ? 'POW!' : 'CRIT!', ev.c === 2 ? '#ffd740' : '#ff7043', 2); // Brawler combo finisher / Warden critical hit
          break;
        }
        case 'cloak': {
          // Ghost Grenade: a purple smoke burst; towers inside turn stealthy.
          const v = this.towerViews.get(ev.id);
          if (!v) break;
          const at = new THREE.Vector3(v.x, 0.3, v.z);
          this.effects.pulse(at, ev.r, 0.6, 0x7e57c2);
          this.effects.puff(at.clone().setY(1.5), 0x9575cd, 16, 0.7, 6);
          audio.lob('gas');
          break;
        }
        case 'exposed': {
          const v = this.towerViews.get(ev.id);
          if (v) this.effects.text(new THREE.Vector3(v.x, 8 * MODEL_SCALE, v.z), 'Revealed!', '#b39ddb', 1.8);
          break;
        }
        case 'block':
          this.effects.text(new THREE.Vector3(ev.x, 8 * MODEL_SCALE, ev.z), ev.p ? 'Parried!' : 'Blocked!', '#90caf9', 2.4); // Gladiator parry / Warden riot shield
          break;
        case 'bounce': {
          // Executioner axe / Archer (Bowmaster) arrow: hits its target, then bounces from zombie to zombie.
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const first = this.enemyViews.get(ev.es[0]);
          const from = v.fireFrom(first?.pos.x ?? null, first?.pos.z ?? null, new THREE.Vector3());
          const color = ev.m === 'flame' ? 0xff7043 : ev.m === 'explosive' ? 0xffab40 : ev.m === 'shock' ? 0x80d8ff : v.model.tracer ?? 0xd7ccc8;
          let prev = from;
          for (const id of ev.es) {
            const e = this.enemyViews.get(id);
            if (!e) continue;
            const p = e.aimPoint(new THREE.Vector3());
            this.effects.tracer(prev, p, color, ev.axe ? 0.3 : 0.16);
            e.hit();
            prev = p;
          }
          if (ev.axe && first) this.effects.axe(from, first.aimPoint(new THREE.Vector3()), 0.25);
          if (ev.m === 'shock') this.effects.lightning([from, prev], 0x80d8ff);
          audio.shot(v.level, v.type);
          break;
        }
        case 'bleedBurst': {
          // Slasher: maxed-out Bleed bursts.
          const e = this.enemyViews.get(ev.e);
          if (!e) break;
          const at = e.aimPoint(new THREE.Vector3());
          this.effects.puff(at, 0xb71c1c, 18, 0.6, 8);
          this.effects.text(at.clone().add(new THREE.Vector3(0, 2.5, 0)), 'BLEED!', '#ff1744', 2.4);
          break;
        }
        case 'quake': {
          // Sledger Aftershock: an icy shockwave around the tower.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.effects.pulse(at, ev.r, 0.4, 0x80d8ff);
          this.effects.puff(at.clone().setY(1), 0xb3e5fc, 12, 0.5, 8);
          audio.boom(2);
          break;
        }
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
          if (t?.owner === myId && ev.d >= 2) this.effects.text(new THREE.Vector3(t.x, 7 * MODEL_SCALE, t.z), 'Reloading!', '#ffe082', 1.6);
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
          } else if (ev.kind === 'gas') {
            this.effects.puff(new THREE.Vector3(ev.x, 0.8, ev.z), 0x9ccc3c, 5, 0.4, 3); // the cloud thins out
          } else if (ev.kind === 'thermite') {
            this.effects.puff(new THREE.Vector3(ev.x, 0.6, ev.z), 0x424242, 8, 0.4, 5); // burns out in smoke
          } else if (ev.kind === 'thorns') {
            this.effects.puff(new THREE.Vector3(ev.x, 0.6, ev.z), 0x558b2f, 6, 0.4, 4); // thorns wither away
          } else if (ev.kind === 'goo') {
            this.effects.puff(new THREE.Vector3(ev.x, 0.5, ev.z), 0x76ff03, 8, 0.4, 4); // the puddle dries up
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
          if (t?.owner === myId) this.effects.text(new THREE.Vector3(t.x, 7 * MODEL_SCALE, t.z), TOWERS[t.type].levels[t.level].souls ? 'Raising a grave…' : 'Building…', '#ffe082', 1.6);
          break;
        }
        case 'grave':
          this.effects.puff(new THREE.Vector3(ev.x, 0.6, ev.z), 0x5d4037, 10, 0.45, 6);
          this.effects.puff(new THREE.Vector3(ev.x, 1.2, ev.z), 0xb388ff, 5, 0.3, 3);
          break;
        case 'graveUp':
          this.effects.puff(new THREE.Vector3(ev.x, 1.5, ev.z), ev.lvl >= 3 ? 0xff1744 : 0x76ff03, 8, 0.35, 4);
          this.effects.text(new THREE.Vector3(ev.x, 5 * MODEL_SCALE, ev.z), `Grave Lv ${ev.lvl}`, ev.lvl >= 3 ? '#ff5252' : '#b2ff59', 1.8);
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
          this.effects.text(new THREE.Vector3(ev.x, 8 * MODEL_SCALE, ev.z), ev.n > 1 ? 'Goons!' : 'Goon!', '#ffca28', 2.4);
          break;
        case 'heal':
          this.effects.text(new THREE.Vector3(ev.x, 8 * MODEL_SCALE, ev.z), `+${ev.v} HP`, '#69f0ae', 2.4);
          break;
        case 'ushot':
          this.unitViews.get(ev.u)?.shoot(this.enemyViews.get(ev.e), this.effects, audio, ev.i, ev.c, ev.rail);
          break;
        case 'udie': {
          const v = this.unitViews.get(ev.u);
          if (v) {
            v.dispose();
            this.unitViews.delete(ev.u);
          }
          const at = new THREE.Vector3(ev.x, 1, ev.z);
          if (ev.wilt) {
            this.effects.puff(at, 0x8bc34a, 6, 0.35, 4); // a plant wilts / an Ice Turret melts
          } else if (ev.boom) {
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
          const v = ev.t != null ? this.towerViews.get(ev.t) : null;
          if (v) {
            // Commando Concussive Missiles: they arc up from the tower and come down on the spot.
            this.effects.bomb(new THREE.Vector3((v.x + ev.x) / 2, 45, (v.z + ev.z) / 2), to, ev.d);
            if (!ev.n) audio.missile();
            break;
          }
          this.effects.bomb(new THREE.Vector3(ev.x - 25, 45, ev.z), to, ev.d);
          if (!ev.n) audio.jet(); // one jet per plane, even when it drops several bombs
          break;
        }
        case 'pshot': {
          // Psycho Slayer: a mace Slam on the strongest zombie nearby, or a railgun shot.
          const v = this.towerViews.get(ev.t);
          const e = this.enemyViews.get(ev.e);
          if (!v || !e) break;
          const to = e.aimPoint(new THREE.Vector3());
          if (ev.fx === 'slam') {
            v.recoil = 1; // the mace arm swings
            setTimeout(() => {
              this.effects.whirl(new THREE.Vector3(to.x, 0, to.z), Math.max(2, ev.r));
              this.effects.flash(to, 0xffab40, 1.2);
              this.effects.text(to.clone().add(new THREE.Vector3(0, 2.5, 0)), 'SLAM!', '#ffab40', 2);
              e.hit();
              audio.boom(4);
            }, ev.d * 1000);
          } else {
            setTimeout(() => {
              if (!this.towerViews.has(ev.t)) return;
              const at = e.aimPoint(new THREE.Vector3());
              const from = v.fireFrom(at.x, at.z, new THREE.Vector3());
              this.effects.tracer(from, at, 0xff1744, 0.45);
              this.effects.flash(at, 0xff8a80, 1);
              audio.shot(v.level, v.type);
            }, ev.d * 1000);
          }
          break;
        }
        case 'b52': {
          // MLRS Carpet Bomb: the B-52 is on its way (its bombs come as 'strike' events).
          this.effects.text(new THREE.Vector3(ev.x, 8 * MODEL_SCALE, ev.z), 'Carpet Bomb!', '#ffca28', 3);
          break;
        }
        case 'rave': {
          this.effects.rave(new THREE.Vector3(ev.x, 0.4, ev.z), ev.r);
          audio.rave();
          break;
        }
        case 'ability':
          if (ev.owner === myId) audio.upgrade();
          this.effects.text(new THREE.Vector3(ev.x, 8 * MODEL_SCALE, ev.z), ev.name, '#e1bee7', 2.6);
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
        case 'uflame': {
          // Field Barracks Flamethrower: a spray of fire toward its target.
          const v = this.unitViews.get(ev.u);
          if (!v) break;
          v.aimAt(ev.y);
          this.effects.flames(v.muzzlePosition(new THREE.Vector3()), ev.y, ev.r, 0.5);
          audio.flame();
          break;
        }
        case 'ulob': {
          // Mercenary Grenadier: a grenade arcing from the unit to where the zombie will be.
          const v = this.unitViews.get(ev.u);
          if (!v) break;
          v.aimAt(ev.x, ev.z);
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
          this.effects.text(new THREE.Vector3(ev.x, 8 * MODEL_SCALE, ev.z), ev.relic ? 'Relic Summon!' : 'Air-Drop!', ev.relic ? '#ffe082' : '#ffca28', 2.6);
          if (!ev.relic) audio.jet();
          break;
        case 'smite': {
          // Tesla Smite: a thunderbolt from the sky and a crackling blast where it lands.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z);
          const pts = [at.clone().setY(45)];
          for (let i = 1; i < 6; i++) pts.push(new THREE.Vector3(ev.x + (Math.random() - 0.5) * 3, 45 - i * 7.5, ev.z + (Math.random() - 0.5) * 3));
          pts.push(at);
          this.effects.lightning(pts, 0xb3e5fc);
          this.effects.pulse(at, ev.r, 0.45, 0x80d8ff);
          this.effects.flash(at.clone().setY(1.5), 0xe1f5fe, ev.r * 0.8);
          for (const v of this.enemyViews.values()) if (Math.hypot(v.pos.x - ev.x, v.pos.z - ev.z) <= ev.r) v.hit();
          audio.boom(ev.r * 2);
          break;
        }
        case 'sprout': {
          // Biologist plant / Elementalist Ice Turret popping up.
          const at = new THREE.Vector3(ev.x, 0.8, ev.z);
          this.effects.puff(at, ev.ice || ev.bubble ? 0xb3e5fc : ev.paint ? 0xce93d8 : ev.volt ? 0xffee58 : 0x66bb6a, 8, 0.4, 4); // Stella paint, Volt Point
          break;
        }
        case 'gsword': {
          // Gold Commander: a huge golden broadsword sweep all around him.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z);
          this.effects.whirl(at, ev.r);
          this.effects.pulse(at, ev.r, 0.35, 0xffd740);
          this.effects.puff(at.clone().setY(2), 0xffe082, 10, 0.4, ev.r);
          this.towerViews.get(ev.id)?.swingSword();
          audio.lob('grenadierAssaultBottom');
          break;
        }
        case 'chaos':
          // Chaos Jester outcomes, Oddport revives, Kart Kid stars.
          this.effects.text(new THREE.Vector3(ev.x, 8 * MODEL_SCALE, ev.z), ev.text, ev.color, 2.6);
          break;
        case 'battery': {
          // Star Cannon: a kill dropped a battery.
          this.effects.text(new THREE.Vector3(ev.x, 6 * MODEL_SCALE, ev.z), '🔋 +charge', '#ffd740', 1.6);
          break;
        }
        case 'confuse': {
          // Spotlight Tech: everything in the light is confused.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z);
          this.effects.pulse(at, ev.r, 0.5, 0xd500f9);
          this.effects.text(at.clone().setY(7), 'Confused!', '#ea80fc', 2);
          break;
        }
        case 'boom': {
          const at = new THREE.Vector3(ev.x, 0.3, ev.z);
          if (ev.bomb) {
            // Jester: the bomb's colors show which bombs it carries.
            const colors = { fire: 0xff6d00, ice: 0x80d8ff, poison: 0x76ff03, confuse: 0xd500f9 };
            const keys = ev.bomb.split(',');
            for (const k of keys) this.effects.puff(at.clone().setY(1), colors[k] ?? 0xffffff, 8, 0.45, 3 + ev.r);
            if (keys.includes('fire') || keys.includes('poison')) this.effects.explosion(at, Math.min(ev.r, 3));
            if (keys.includes('ice')) this.effects.iceBlast(at, ev.r);
            if (keys.includes('confuse')) this.effects.pulse(at, ev.r, 0.4, 0xd500f9);
            for (const v of this.enemyViews.values()) if (Math.hypot(v.pos.x - ev.x, v.pos.z - ev.z) <= ev.r) v.hit();
            audio.boom(ev.r);
            break;
          }
          if (ev.fw) {
            // Firework Technician: a burst of colored sparks.
            const c = [0xff1744, 0xffea00, 0x2979ff, 0x00e676, 0xd500f9][Math.floor(Math.random() * 5)];
            this.effects.puff(at.clone().setY(2), c, 10, 0.5, 5 + ev.r * 2);
            this.effects.flash(at.clone().setY(2), c, ev.r + 1);
            audio.boom(1.5);
            break;
          }
          if (ev.heat) {
            // Elementalist Heatwave: a ring of fire around the tower.
            this.effects.pulse(at, ev.r, 0.6, 0xff6d00);
            this.effects.puff(at.clone().setY(1), 0xff9100, 14, 0.6, ev.r);
            audio.boom(ev.r);
            break;
          }
          if (ev.neuro) {
            // Saboteur Aggressive Toxins: a pink-purple burst; zombies inside are Neuralyzed.
            this.effects.puff(at.clone().setY(1), 0xea80fc, 12, 0.6, 5);
            this.effects.pulse(at, ev.r, 0.5, 0xe040fb);
            this.effects.text(at.clone().setY(7), 'Neuralyzed!', '#ea80fc', 2.2);
            audio.lob('gas');
            break;
          }
          if (ev.nuke) {
            this.effects.nuke(at, ev.r);
            for (const v of this.enemyViews.values()) if (Math.hypot(v.pos.x - ev.x, v.pos.z - ev.z) <= ev.r) v.hit();
            audio.boom(ev.r * 2);
            break;
          }
          if (ev.flash) {
            // Breacher Flashbang: a white flash; zombies inside are stunned.
            this.effects.flash(at.clone().setY(1.5), 0xffffff, ev.r);
            this.effects.pulse(at, ev.r, 0.4, 0xfffde7);
            audio.boom(ev.r);
            break;
          }
          if (ev.ice) {
            this.effects.iceBlast(at, ev.r);
            audio.ice();
            break;
          }
          if (ev.gas) {
            // Toxicnator grenade: a burst of green gas.
            this.effects.puff(at.clone().setY(1), 0x9ccc3c, Math.min(14, 5 + Math.round(ev.r * 1.5)), 0.6, 4 + ev.r);
            audio.lob('gas');
            break;
          }
          if (ev.paint) {
            this.effects.paintSplat(at, ev.r);
            for (const v of this.enemyViews.values()) if (Math.hypot(v.pos.x - ev.x, v.pos.z - ev.z) <= ev.r) v.hit();
            audio.lob('paint');
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
          this.effects.blade(b, ev.d, from.y, knife ? { color: 0xb0bec5, size: 1, ...v.model.blade, knife } : v.model.projectile); // Archer arrows bring their own look
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
        case 'leap': {
          // Brawler Reposition: it hops from its old spot and smashes down where it lands.
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          if (ev.tp) {
            // Psycho Slayer Teleport: vanishes in a flash and appears at the new spot.
            this.effects.puff(new THREE.Vector3(ev.fx, 2, ev.fz), 0xb388ff, 14, 0.5, 6);
            this.effects.puff(new THREE.Vector3(ev.x, 2, ev.z), 0xb388ff, 14, 0.5, 6);
            this.effects.flash(new THREE.Vector3(ev.x, 2, ev.z), 0xe1bee7, 2);
            break;
          }
          v.leap(ev.fx, ev.fz, ev.x, ev.z);
          setTimeout(() => {
            if (!this.towerViews.has(ev.t)) return;
            this.effects.whirl(new THREE.Vector3(ev.x, 0, ev.z), ev.r);
            this.effects.puff(new THREE.Vector3(ev.x, 1, ev.z), 0xbcaaa4, 14, 0.5, 6);
            for (const e of this.enemyViews.values()) if (Math.hypot(e.pos.x - ev.x, e.pos.z - ev.z) <= ev.r) e.hit();
            audio.shot(v.level, v.type);
          }, LEAP_TIME * 1000);
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
          this.effects.lob(from, to, ev.d, ev.nade === 'ice' ? ICE_NADE : v.model.projectile);
          audio.lob(ev.nade ? 'grenadier' : v.type);
          break;
        }
        case 'fly': {
          // A physical projectile (slime glob, harpoon, rebar, thrown grenade) homing in on a zombie.
          const v = this.towerViews.get(ev.t);
          if (!v) break;
          const last = new THREE.Vector3();
          const target = (out) => {
            this.enemyViews.get(ev.e)?.aimPoint(last);
            return out.copy(last);
          };
          target(last);
          const from = v.fireFrom(last.x, last.z, new THREE.Vector3());
          const nade = ev.nade === 'ice';
          const p = nade ? ICE_NADE : v.model.flight ?? { color: v.model.tracer ?? 0x9e9e9e, size: 0.5 };
          this.effects.toss(from, target, ev.d, nade ? { ...p, arc: 3 } : p);
          if (!nade) this.effects.flash(from, p.color, 0.5);
          if (nade) audio.lob('grenadier');
          else audio.shot(v.level, v.type);
          break;
        }
        case 'impact': {
          // The projectile reached its zombie.
          const e = this.enemyViews.get(ev.e);
          if (!e) break;
          e.hit();
          const at = e.aimPoint(new THREE.Vector3());
          if (ev.ice) {
            this.effects.iceBlast(at, 1.5);
            break;
          }
          const v = this.towerViews.get(ev.t);
          const color = v?.model.flight?.color ?? v?.model.tracer ?? 0xffffff;
          this.effects.flash(at, color, 0.9);
          if (v?.model.flight?.blob) this.effects.puff(at, color, 5, 0.3, 4);
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
          audio.rocket(v.level, v.type);
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
          if (v?.def.headRoll) {
            // Halloween Jack: falls on his back, his head rolls off, and a whisper.
            audio.whisper();
            this.ui.banner('JACK HAS FALLEN', 'Happy Halloween!', 4000);
          }
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
          this.effects.pulse(at, ev.r, 0.6, ev.c ?? 0xff6d00);
          this.effects.puff(at.clone().setY(1), ev.c ?? 0xff3d00, 20, 0.6, 12);
          audio.boom(5);
          if (ev.spin) this.effects.whirl(at, ev.r);
          if (ev.n) this.ui.toast(`💥 ${ev.name ?? 'The slam'} stunned ${ev.n} tower${ev.n > 1 ? 's' : ''}!`, 1400);
          break;
        }
        // ---------------------------------------------------------------- Medium mode enemies
        case 'jam': {
          // Eradicator Sword Shock: an orange shockwave that makes towers reload much slower.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.enemyViews.get(ev.e)?.attack();
          this.effects.pulse(at, ev.r, 0.6, 0xff9100);
          this.effects.pulse(at, ev.r * 0.6, 0.45, 0xffd180);
          audio.boom(3);
          if (ev.n) this.ui.toast(`🗡️ Sword Shock jammed ${ev.n} tower${ev.n > 1 ? 's' : ''}: they reload much slower!`, 1800);
          break;
        }
        case 'eFlame': {
          // Eradicator Pyrotechnics: a flamethrower in its mouth.
          const v = this.enemyViews.get(ev.e);
          const from = v ? v.aimPoint(new THREE.Vector3()) : new THREE.Vector3(ev.x, 4 * MODEL_SCALE, ev.z + laneOz(ev.L ?? 0));
          this.effects.flames(from, ev.yaw, ev.r, (ev.arc / 2) * (Math.PI / 180));
          break;
        }
        case 'mRage': {
          const v = this.enemyViews.get(ev.e);
          if (v) this.effects.puff(v.pos.clone().setY(4), 0xff1744, 24, 0.8, 12);
          audio.waveStart();
          this.shake?.(0.5, 1.2);
          this.ui.toast(ENEMIES[st.enemies.get(ev.e)?.type]?.rage?.intro ?? '😡 Electronic Rage!', 3500);
          break;
        }
        // ---------------------------------------------------------------- Hard mode (Fallen) enemies
        case 'gift': {
          // Fallen Jester: a gift bursts, buffing the enemies around it.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.enemyViews.get(ev.e)?.attack();
          this.effects.pulse(at, ev.r, 0.5, 0x2979ff);
          this.effects.puff(at.clone().setY(2), 0x82b1ff, 12, 0.5, 8);
          break;
        }
        case 'goo': // Necrotic Skeleton: a puddle of goo that heals enemies
          this.effects.puddle(new THREE.Vector3(ev.x, 0, ev.z + laneOz(ev.L ?? 0)), ev.r, ev.life, 0x00e5ff);
          break;
        case 'cloak': {
          const v = this.enemyViews.get(ev.e);
          if (v) this.effects.puff(v.pos.clone().setY(3), 0x263238, 16, 0.6, 8);
          this.ui.toast(`👻 The ${v?.def.name ?? 'enemy'} turned hidden!`, 2000);
          break;
        }
        case 'kingHorde': {
          const v = this.enemyViews.get(ev.e);
          v?.attack();
          if (v) this.effects.pulse(v.pos.clone().setY(0.3), 14, 0.8, 0x18ffff);
          audio.waveStart();
          this.shake?.(0.5, 1.2);
          this.ui.toast(`👑 The Fallen King raised his sword and summoned ${ev.n} Fallen!`, 3000);
          break;
        }
        case 'kingSwing': {
          // Fallen King Sword Swing: three slashes, the last a full circle.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.enemyViews.get(ev.e)?.attack();
          if (ev.arc >= 360) this.effects.whirl(at, ev.r);
          this.effects.pulse(at, ev.r * (0.6 + 0.2 * ev.i), 0.45, 0x18ffff);
          audio.boom(4);
          if (ev.n) this.ui.toast(`⚔️ Sword Swing stunned ${ev.n} tower${ev.n > 1 ? 's' : ''}!`, 1200);
          break;
        }
        case 'comet': {
          // Fallen Comet: purple spikes rain down on the whole map.
          const v = this.enemyViews.get(ev.e);
          v?.attack();
          if (v) {
            for (let i = 0; i < 24; i++) {
              const p = v.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 120, 3, (Math.random() - 0.5) * 120));
              this.effects.puff(p, 0xd500f9, 4, 0.5, 4);
            }
          }
          audio.boom(6);
          this.shake?.(0.6, 1.4);
          this.ui.toast(`☄️ FALLEN COMET! ${ev.n} tower${ev.n === 1 ? ' is' : 's are'} stunned for 5s!`, 2500);
          break;
        }
        case 'boneArmor': {
          const v = this.enemyViews.get(ev.e);
          if (v) this.effects.puff(v.pos.clone().setY(4), 0xe0e0e0, 14, 0.6, 8);
          this.ui.toast(`🦴 Bone Armor! The Fallen King now has ${ev.a}% defense.`, 2000);
          break;
        }
        case 'cashDrop':
          this.effects.text(new THREE.Vector3(ev.x, 8, ev.z + laneOz(ev.L ?? 0)), `+$${ev.v.toLocaleString()}`, '#ffd740', 3.5);
          audio.cash?.();
          break;
        case 'waveTimer':
          this.ui.toast('⏱️ Time\'s up: the next wave is here!', 1600);
          break;
        case 'axe': {
          const oz = laneOz(ev.L ?? 0);
          this.enemyViews.get(ev.e)?.attack();
          this.effects.axe(new THREE.Vector3(ev.fx, 9 * MODEL_SCALE, ev.fz + oz), new THREE.Vector3(ev.x, 1.5, ev.z + oz), ev.d);
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
        // ---------------------------------------------------------------- Hard mode enemies
        case 'eShot': {
          // An enemy attacks a tower: fireballs, boulders, magma, crossbow bolts, lasers, turrets, missiles.
          const oz = laneOz(ev.L ?? 0);
          const v = this.enemyViews.get(ev.e);
          const from = v ? v.aimPoint(new THREE.Vector3()) : new THREE.Vector3(ev.fx, 4 * MODEL_SCALE, ev.fz + oz);
          const to = new THREE.Vector3(ev.x, 1.5, ev.z + oz);
          const aim = (out) => out.copy(to);
          if (ev.kind === 'turret' || ev.kind === 'missile') from.y += (v?.height ?? 0) * 0.25;
          else v?.attack();
          switch (ev.kind) {
            case 'laser':
              this.effects.tracer(from, to, 0xff1744, 0.35);
              this.effects.flash(to, 0xff5252, 1);
              audio.shot(0, 'phaser');
              break;
            case 'turret':
              this.effects.tracer(from, to, 0xffd600, 0.12);
              break;
            case 'fireball':
              this.effects.toss(from, aim, ev.d, { color: 0xff6d00, size: 1.3, arc: 3, glowing: true });
              audio.lob();
              break;
            case 'boulder':
              this.effects.lob(from, to, ev.d, { color: 0x4e342e, size: 1.8, arc: 12 });
              audio.lob('mortar');
              break;
            case 'magma':
              this.effects.lob(from, to, ev.d, { color: 0xff6d00, size: 1.2, arc: 9, glowing: true });
              audio.lob('paint');
              break;
            case 'bolt':
              this.effects.toss(from, aim, ev.d, { color: 0x5d4037, size: 0.9, arc: 0.3, long: true });
              audio.lob('paintballer');
              break;
            case 'missile':
              this.effects.missile(from, aim, ev.d, 0xff6d00, 1.2);
              audio.missile();
              break;
            case 'rocket': // Expert Doomelist: a giant rocket
              this.effects.missile(from, aim, ev.d, 0xff1744, 2.4);
              audio.missile();
              this.ui.toast('🚀 A Doomelist fired a giant rocket!', 1400);
              break;
            case 'vioOrb': // Expert Vio Gunner
              this.effects.toss(from, aim, ev.d, { color: 0xd500f9, size: 0.9, arc: 1.5, glowing: true });
              if (Math.random() < 0.4) audio.lob('paint');
              break;
            case 'goo': // Bio Gunner
              this.effects.lob(from, to, ev.d, { color: 0xaa00ff, size: 1.1, arc: 6, glowing: true });
              audio.lob('paint');
              break;
            case 'timeLaser': // Time Parasite
              this.effects.tracer(from, to, 0x7c4dff, 0.4);
              this.effects.flash(to, 0xb388ff, 1.2);
              audio.shot(0, 'phaser');
              break;
            case 'shuriken': // Void Ninja / Shadow Master
              this.effects.toss(from, aim, ev.d, { color: 0xff4081, size: 0.7, arc: 0.4, glowing: true });
              if (Math.random() < 0.4) audio.lob('paintballer');
              break;
            case 'magmaShot': // Magma Void corpse
              this.effects.toss(from, aim, ev.d, { color: 0xff3d00, size: 0.8, arc: 2, glowing: true });
              break;
            case 'poisonCloud': // Void Lich
              this.effects.lob(from, to, ev.d, { color: 0x76ff03, size: 1.4, arc: 10, glowing: true });
              audio.lob('paint');
              break;
            case 'revolver': // Medium Predator Triple Shot
              this.effects.tracer(from, to, 0xffab40, 0.2);
              this.effects.flash(to, 0xffd180, 0.8);
              audio.shot(0, 'cowboy');
              break;
            case 'grenade': // Medium Grenadiers
              this.effects.lob(from, to, ev.d, { color: v?.def.mlook === 'eliteGrenadier' ? 0xff9100 : 0x40c4ff, size: 0.7, arc: 6, glowing: true });
              audio.lob();
              break;
            case 'shell': // Hardcore TDX shooters
              this.effects.missile(from, aim, ev.d, 0xff6d00, 0.9);
              if (Math.random() < 0.4) audio.missile();
              break;
            case 'pumpkin': // Hardcore Expired Jack
              this.effects.lob(from, to, ev.d, { color: 0xff6d00, size: 1.6, arc: 10, glowing: true });
              audio.lob('mortar');
              this.ui.toast(`🎃 ${v?.def.name ?? 'Jack'} threw a flaming pumpkin! Towers it hits burn and can't fight for 42 seconds.`, 1800);
              break;
            case 'sword': // Beholder (time dimension): throws its sword
              this.effects.axe(from, to, ev.d);
              audio.rocket(1);
              this.ui.toast('🗡️ The Beholder threw its sword!', 1200);
              break;
          }
          break;
        }
        case 'eHit': {
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          if (ev.kind === 'magma') {
            this.effects.puddle(at, ev.r, ev.life ?? 6);
            this.effects.puff(at.clone().setY(1), 0xff6d00, 10, 0.5, 8);
          } else if (ev.kind === 'pumpkin') {
            this.effects.pulse(at, ev.r, 0.5, 0xff6d00);
            this.effects.puff(at.clone().setY(1), 0xff3d00, 16, 0.7, 8);
            audio.boom(3);
          } else if (ev.kind === 'voidRock') {
            this.effects.pulse(at, ev.r * 1.5, 0.4, 0xd500f9);
            this.effects.puff(at.clone().setY(1), 0x4a0072, 10, 0.6, 8);
            audio.boom(3);
          } else if (ev.kind === 'boulder') {
            this.effects.pulse(at, ev.r, 0.4, 0x8d6e63);
            this.effects.puff(at.clone().setY(1), 0x4e342e, 14, 0.7, 10);
            audio.boom(4);
          } else if (ev.kind === 'goo') {
            this.effects.puddle(at, ev.r, ev.life ?? 6, 0x9c27b0);
            this.effects.puff(at.clone().setY(1), 0xd500f9, 10, 0.5, 8);
          } else if (ev.kind === 'poisonCloud') {
            this.effects.smoke(at.clone().setY(0.3), ev.r, ev.life ?? 8, [0x33691e, 0x4a148c], 10);
            this.ui.toast('☠️ Poison cloud! Towers inside deal less damage and can\'t use abilities until it fades.', 2200);
          } else if (ev.kind === 'magmaShot') {
            this.effects.puff(at.clone().setY(1), 0xff3d00, 6, 0.4, 6);
          } else if (ev.kind === 'sword') {
            this.effects.pulse(at, ev.r, 0.4, 0xeceff1);
            this.effects.puff(at.clone().setY(1), 0xb388ff, 14, 0.6, 10);
            audio.boom(4);
          } else if (ev.kind === 'grenade') {
            this.effects.pulse(at, ev.r, 0.35, 0x40c4ff);
            this.effects.puff(at.clone().setY(1), 0x9e9e9e, 12, 0.6, 9);
            audio.boom(2);
          } else if (ev.kind === 'rocket') {
            this.effects.explosion(at.clone().setY(0.5), ev.r);
            this.effects.pulse(at, ev.r, 0.5, 0xff1744);
            audio.boom(7);
            this.shake?.(0.4, 0.8);
          } else if (ev.kind === 'vioOrb') {
            this.effects.pulse(at, ev.r, 0.35, 0xd500f9);
            this.effects.puff(at.clone().setY(1), 0xea80fc, 8, 0.4, 6);
          } else if (ev.kind === 'bloodOrb') {
            this.effects.pulse(at, ev.r, 0.4, 0xb71c1c);
            this.effects.puff(at.clone().setY(1), 0xd50000, 12, 0.5, 8);
            audio.boom(2);
          } else if (ev.kind === 'tearOrb') {
            this.effects.pulse(at, ev.r, 0.4, 0xeceff1);
            this.effects.puff(at.clone().setY(1), 0xb388ff, 10, 0.5, 8);
            audio.boom(2);
          } else if (ev.kind === 'swordThrow' || ev.kind === 'crystalThrow') {
            // Insane: a Vengeful Champion's sword / a Ravager's crystal lands on a tower.
            const c = ev.kind === 'swordThrow' ? 0x7c4dff : 0x40c4ff;
            this.effects.pulse(at, Math.max(ev.r, 1.5), 0.4, c);
            this.effects.puff(at.clone().setY(1.5), c, 12, 0.5, 8);
            audio.boom(3);
          } else if (ev.kind === 'eyeLaser') {
            // The Corrupted's eye laser: everything around the target is stunned.
            this.effects.pulse(at, ev.r, 0.6, 0xd500f9);
            this.effects.pulse(at, ev.r * 0.5, 0.4, 0xffffff);
            this.effects.puff(at.clone().setY(1.5), 0xaa00ff, 20, 0.7, 12);
            audio.boom(6);
            this.shake?.(0.4, 0.8);
          } else if (ev.kind === 'fireball' || ev.kind === 'missile') {
            this.effects.pulse(at, Math.max(ev.r, 1.5), 0.35, 0xff9100);
            this.effects.puff(at.clone().setY(1), 0xff6d00, 8, 0.5, 8);
            if (ev.kind === 'fireball') audio.boom(2);
          }
          break;
        }
        case 'slash': {
          // Knight / Eradicator sword sweep around it.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.enemyViews.get(ev.e)?.attack();
          this.effects.pulse(at, ev.r, 0.25, 0xeceff1);
          audio.lob('grenadierAssaultBottom');
          if (ev.spin) {
            // Beholder spin slash: a whirl of violet blades all around it.
            this.effects.whirl(at, ev.r);
            this.effects.pulse(at, ev.r * 0.7, 0.4, 0xb388ff);
            this.ui.toast('🌀 SPIN SLASH!', 1200);
          }
          break;
        }
        case 'dash': {
          const v = this.enemyViews.get(ev.e);
          if (v) this.effects.puff(v.pos.clone().setY(1), 0xbcaaa4, 8, 0.5, 6);
          break;
        }
        case 'infect': {
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.effects.pulse(at, ev.r, 0.6, 0x8e24aa);
          this.effects.puff(at.clone().setY(3), 0xc62828, 10, 0.4, 6);
          break;
        }
        case 'burst': {
          const v = this.enemyViews.get(ev.e) ?? this.dying.find((d) => d.id === ev.e);
          if (v) this.effects.puff(v.pos.clone().setY(2), ev.kind === 'multiply' ? 0x18ffff : 0xff1744, 16, 0.6, 10);
          if (ev.kind === 'berserk') this.ui.toast(`💀 The ${v?.def.name ?? 'Berserker'} burst into ${ev.n} enemies!`, 2000);
          break;
        }
        case 'takeoff':
        case 'land': {
          const v = this.enemyViews.get(ev.e);
          if (v) this.effects.puff(v.pos.clone().setY(1), 0xff9100, 16, 0.7, 10);
          audio.jet();
          if (ev.k === 'takeoff') this.ui.toast(`🚀 The ${v?.def.name ?? 'Eradicator'} takes flight! Only towers that hit flyers can reach it, and missiles rain down!`, 2500);
          break;
        }
        // ---------------------------------------------------------------- Expert mode enemies
        case 'smog': {
          // Taint: a cloud of dark poison smog that hurts towers inside it.
          this.effects.smoke(new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0)), ev.r, ev.life, [0x4a148c, 0x212121], 5);
          break;
        }
        case 'dHeal': {
          // Devotee: heals the enemies around it as it dies.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.effects.pulse(at, ev.r, 0.5, 0x69f0ae);
          this.effects.puff(at.clone().setY(2), 0x69f0ae, 8, 0.35, 6);
          break;
        }
        case 'warp': {
          // An enemy comes out of an Engineer's teleporter.
          this.effects.puff(new THREE.Vector3(ev.x, 2, ev.z + laneOz(ev.L ?? 0)), 0xb388ff, 6, 0.35, 5);
          break;
        }
        case 'summon': {
          if (ev.type === 'amplifier') {
            this.ui.toast('🔊 The Overlord summoned an Amplifier! It speeds up and heals the Overlord: destroy it fast!', 2500);
            audio.waveStart();
          } else if (ev.type === 'teleporter') this.ui.toast('🌀 The Engineer built a teleporter! New enemies come out of it.', 2200);
          else if (ev.type === 'voidHurt') {
            const v = this.enemyViews.get(ev.e);
            if (v) this.effects.puff(v.pos.clone().setY(3), 0xd500f9, 16, 0.6, 10);
          }
          break;
        }
        case 'stomp': {
          // Overlord: a crushing stomp that hurts every tower nearby.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.enemyViews.get(ev.e)?.attack();
          this.effects.pulse(at, ev.r, 0.5, 0xff80ab);
          this.effects.pulse(at, ev.r * 0.6, 0.35, 0xffffff);
          this.effects.puff(at.clone().setY(1), 0xeceff1, 20, 0.7, 12);
          audio.boom(6);
          if (ENEMIES[st.enemies.get(ev.e)?.type]?.voidWorld) this.shake(0.6, 1.5); // VOID's leg slam
          break;
        }
        case 'oBeam': {
          // Overlord: its scepter fires a beam that strikes every tower on the map.
          const oz = laneOz(ev.L ?? 0);
          const v = this.enemyViews.get(ev.e);
          v?.attack();
          const from = v ? v.aimPoint(new THREE.Vector3()) : null;
          if (from) from.y += v.height * 0.6;
          for (const [x, z] of ev.h) {
            const to = new THREE.Vector3(x, 1.5, z + oz);
            this.effects.tracer(from ?? to.clone().setY(60), to, 0xff80ab, 0.6);
            this.effects.flash(to, 0xff4081, 1.4);
          }
          audio.shot(0, 'phaser');
          this.ui.toast('💥 The Overlord\'s scepter beam strikes every tower!', 1600);
          break;
        }
        case 'barrage': {
          // Overlord: missiles rain down from the starships on towers all over the map (once).
          const oz = laneOz(ev.L ?? 0);
          for (const [x, z, d] of ev.h) {
            const to = new THREE.Vector3(x, 0.3, z + oz);
            const from = new THREE.Vector3(x + (Math.random() - 0.5) * 40, 70, z + oz + (Math.random() - 0.5) * 40);
            this.effects.pulse(to, ev.r, d, 0xff1744);
            this.effects.missile(from, (out) => out.copy(to), d, 0xff4081, 2);
          }
          audio.missile();
          audio.waveStart();
          this.ui.toast('🚀 MISSILE BARRAGE! Missiles are raining down on your towers!', 3500);
          break;
        }
        // ---------------------------------------------------------------- Insane mode enemies
        case 'trail': // Crawler / King: a purple patch that speeds up enemies
          this.effects.puddle(new THREE.Vector3(ev.x, 0, ev.z + laneOz(ev.L ?? 0)), ev.r, ev.life, ev.c ?? 0x7b1fa2); // Honor Guard: teal goo
          break;
        case 'smoke2': // Smoker: smoke that hides enemies
          this.effects.smoke(new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0)), ev.r, ev.life, [0x616161, 0x424242], 4);
          break;
        case 'arc': {
          // Battery: lightning from it to a tower, jumping on to the towers next to it.
          const oz = laneOz(ev.L ?? 0);
          const v = this.enemyViews.get(ev.e);
          v?.attack();
          const pts = [v ? v.aimPoint(new THREE.Vector3()) : new THREE.Vector3(ev.h[0][0], 8, ev.h[0][1] + oz)];
          for (const [x, z] of ev.h) pts.push(new THREE.Vector3(x, 2, z + oz));
          this.effects.lightning(pts, 0x40c4ff);
          audio.shot(0, 'electro');
          break;
        }
        case 'emp': {
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.effects.pulse(at, ev.r, 0.5, 0x40c4ff);
          this.effects.pulse(at, ev.r * 0.6, 0.35, 0xffffff);
          audio.boom(3);
          if (ev.n) this.ui.toast(`⚡ The Battery's EMP stunned ${ev.n} tower${ev.n > 1 ? 's' : ''} and sped up the enemies around it!`, 1600);
          break;
        }
        case 'stab': {
          // King: a spear thrust at one tower.
          const oz = laneOz(ev.L ?? 0);
          const v = this.enemyViews.get(ev.e);
          v?.attack();
          const to = new THREE.Vector3(ev.x, 1.5, ev.z + oz);
          if (v) this.effects.tracer(v.aimPoint(new THREE.Vector3()), to, 0xd500f9, 0.5);
          this.effects.puff(to, 0xd500f9, 10, 0.5, 8);
          audio.lob('grenadierAssaultBottom');
          break;
        }
        case 'eBlast': {
          // Radiator: a green nuclear blast when it dies.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.effects.pulse(at, ev.r, 0.45, ev.c ?? 0x76ff03); // Medium Shocker: blue
          this.effects.puff(at.clone().setY(1.5), ev.c ?? 0x76ff03, 18, 0.6, 12);
          audio.boom(4);
          break;
        }
        case 'lurch': {
          // Glitch: jumps forward in a burst of static.
          const v = this.enemyViews.get(ev.e);
          if (v) this.effects.puff(v.pos.clone().setY(2), 0x00e5ff, 6, 0.4, 6);
          break;
        }
        case 'armorSwap': {
          const v = this.enemyViews.get(ev.e);
          if (v) this.effects.puff(v.pos.clone().setY(3), ev.on ? 0xffc400 : 0x18ffff, 12, 0.6, 8);
          break;
        }
        case 'rewind': {
          // Rewind: scratches the base, then zips back to the start.
          if (!this.versus || ev.L === this.myLane) audio.baseHit();
          this.effects.puff(new THREE.Vector3(path.end.x, 3, path.end.z + laneOz(ev.L ?? 0)), 0x18ffff, 10, 0.5, 8);
          this.ui.toast('⏪ A Rewind hit your base and rewound to the start!', 1400);
          break;
        }
        case 'timeWave': {
          // Beholder: a wave of slowed time rolls out over your towers.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.enemyViews.get(ev.e)?.attack();
          this.effects.pulse(at, ev.r, 1.2, 0x7c4dff);
          this.effects.pulse(at, ev.r * 0.6, 0.9, 0xffd740);
          audio.waveStart();
          if (ev.n) this.ui.toast(`⏳ The Beholder slowed time! ${ev.n} tower${ev.n > 1 ? 's are' : ' is'} working slower for a while.`, 2200);
          break;
        }
        case 'tBomb': {
          this.enemyViews.get(ev.e)?.attack();
          this.effects.flash(new THREE.Vector3(ev.x, 7, ev.z + laneOz(ev.L ?? 0)), 0xffd740, 2);
          audio.lob('mortar');
          this.ui.toast(`💣 TIME BOMB! Click it to defuse it before it blows (${ev.fuse}s)!`, 2600);
          break;
        }
        case 'tbBoom': {
          const at = new THREE.Vector3(ev.x, 0.5, ev.z + laneOz(ev.L ?? 0));
          this.effects.explosion(at, ev.r);
          this.effects.pulse(at, ev.r, 0.5, 0xffd740);
          audio.boom(6);
          this.ui.toast('💥 A time bomb went off!', 1500);
          break;
        }
        case 'defused': {
          if (ev.quiet) break;
          this.effects.puff(new THREE.Vector3(ev.x, 7, ev.z + laneOz(ev.L ?? 0)), 0xffd740, 12, 0.5, 8);
          audio.upgrade();
          const who = ev.by === this.session.myId ? 'You' : this.state.players.get(ev.by)?.name ?? 'Someone';
          this.ui.toast(`✅ ${who} defused a time bomb!`, 1400);
          break;
        }
        case 'swipe': {
          // Beholder: a sword swipe that hurts nearby towers and slows them down for good.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.enemyViews.get(ev.e)?.attack();
          this.effects.pulse(at, ev.r, 0.3, 0xeceff1);
          this.effects.whirl(at, ev.r * 0.8);
          audio.lob('grenadierAssaultBottom');
          if (ev.n) this.ui.toast(`🗡️ The Beholder's sword hit ${ev.n} tower${ev.n > 1 ? 's' : ''}. They'll fire a little slower for good!`, 1800);
          break;
        }
        case 'timeShift': {
          audio.waveStart();
          this.ui.toast(ENEMIES[ev.into]?.shiftIntro ?? '🌌 The Beholder pulled you into the TIME DIMENSION! Your towers were sold. Rebuild fast, it starts moving in 8 seconds!', 6000);
          break;
        }
        // ---------------------------------------------------------------- Expert mode enemies (2026-11-09)
        case 'xSacrifice': {
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.effects.puddle(at, 4, 60, 0xb71c1c);
          this.effects.puff(at.clone().setY(2), 0xd50000, 24, 0.8, 12);
          audio.waveStart();
          this.ui.toast('🩸 BLOOD SACRIFICE! The Rebirther sits in its blood bowl: 99.9% damage resistance. SELL towers to hurt it (Enforcement Base and Buccaneer crashes work too)!', 6000);
          break;
        }
        case 'xSellHit': {
          const at = new THREE.Vector3(ev.x, 7, ev.z + laneOz(ev.L ?? 0));
          this.effects.text(at, `🩸 -${ev.d.toLocaleString()}`, '#ff5252', 2.4);
          this.effects.puff(at, 0xd50000, 10, 0.5, 6);
          break;
        }
        case 'xUnsheathe': {
          const v = this.enemyViews.get(ev.e);
          v?.attack();
          if (v) this.effects.puff(v.pos.clone().setY(6), 0xb71c1c, 24, 0.8, 12);
          audio.waveStart();
          this.ui.toast('🪽 The Death Angel drew its staff! Now it attacks.', 2600);
          break;
        }
        case 'xMove': {
          const oz = laneOz(ev.L ?? 0);
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + oz);
          const v = this.enemyViews.get(ev.e);
          v?.attack();
          const plural = (n) => `${n} tower${n === 1 ? '' : 's'}`;
          switch (ev.key) {
            case 'violetCall':
              this.effects.puff(at.clone().setY(3), 0xaa00ff, 20, 0.7, 10);
              this.ui.toast(`🟣 Violet Call! The Rebirther summoned ${ev.n} Scarlets.`, 2000);
              break;
            case 'bloodRain':
              for (const [x, z] of ev.h) this.effects.puff(new THREE.Vector3(x, 4, z + oz), 0xd50000, 5, 0.4, 3);
              audio.boom(2);
              this.ui.toast(`🩸 Blood Rain! ${plural(ev.n)} stunned.`, 1800);
              break;
            case 'ritual':
              this.effects.pulse(new THREE.Vector3(ev.tx, 0.3, ev.tz + oz), 3, 0.8, 0xd50000);
              this.effects.puff(new THREE.Vector3(ev.tx, 3, ev.tz + oz), 0x4a148c, 20, 0.8, 8);
              audio.boom(5);
              this.ui.toast('☠️ RITUAL! The Rebirther killed one of your towers.', 2500);
              break;
            case 'twirl':
              this.effects.whirl(at, ev.r);
              this.effects.pulse(at, ev.r, 0.5, 0xb71c1c);
              audio.boom(4);
              if (ev.n) this.ui.toast(`🌀 Twirl stunned ${plural(ev.n)}!`, 1400);
              break;
            case 'bloodAssembly':
            case 'realityTear':
              for (const [x, z, d] of ev.h) {
                const to = new THREE.Vector3(x, 0.3, z + oz);
                this.effects.pulse(to, ev.r, d, ev.key === 'bloodAssembly' ? 0xd50000 : 0xb388ff);
                const from = v ? v.aimPoint(new THREE.Vector3()) : to.clone().setY(30);
                this.effects.lob(from, to, d, { color: ev.key === 'bloodAssembly' ? 0xb71c1c : 0xeceff1, size: 1, arc: 10, glowing: true });
              }
              this.ui.toast(ev.key === 'bloodAssembly' ? '🩸 Blood Assembly! Blood orbs are falling on your towers.' : '🌌 Reality Tear! Orbs of time are raining down.', 1800);
              break;
            case 'purePain':
              this.effects.pulse(at, ev.r, 0.4, 0xff1744);
              this.effects.pulse(at, ev.r * 0.6, 0.3, 0xffffff);
              audio.boom(7);
              this.shake?.(0.5, 1);
              this.ui.toast(`💢 PURE PAIN! The Death Angel's staff hit ${plural(ev.n)} (shields can't block it).`, 2400);
              break;
            case 'timeSnap':
              this.effects.pulse(at, ev.r, 0.5, 0xeceff1);
              this.effects.pulse(at, ev.r * 0.6, 0.35, 0x7c4dff);
              audio.boom(4);
              if (ev.n) this.ui.toast(`🫰 Time Snap stunned ${plural(ev.n)}!`, 1400);
              break;
            // ------------------------------------------------ Insane mode moves
            case 'hammerSmash':
              this.effects.pulse(new THREE.Vector3(ev.tx, 0.3, ev.tz + oz), 3, 0.6, 0x40c4ff);
              this.effects.puff(new THREE.Vector3(ev.tx, 2, ev.tz + oz), 0x9e9e9e, 16, 0.6, 10);
              audio.boom(5);
              this.ui.toast(`🔨 HAMMER SMASH! A tower is stunned for ${ev.stun} seconds.`, 2200);
              break;
            case 'boltSlam':
              this.effects.pulse(at, ev.r, 0.6, 0xaa00ff);
              this.effects.pulse(at, ev.inner, 0.45, 0xea80fc);
              audio.shot(0, 'electro');
              audio.boom(4);
              this.ui.toast(`⚡ BOLT SLAM! Towers around the Boltmaster fire slower${ev.n ? `, and ${plural(ev.n)} got stunned` : ''}.`, 1800);
              break;
            case 'callUnits':
              this.effects.puff(at.clone().setY(3), 0xb388ff, 20, 0.7, 10);
              this.ui.toast(`📣 ${ev.name ?? 'Summon'}! ${ev.n} more enemies appeared.`, 1800);
              break;
            case 'rocketBombard':
            case 'telekinesis':
              for (const [x, z, d] of ev.h) {
                const to = new THREE.Vector3(x, 0.3, z + oz);
                this.effects.pulse(to, ev.r, d, ev.key === 'telekinesis' ? 0xff1744 : 0xff9100);
                const from = v ? v.aimPoint(new THREE.Vector3()) : to.clone().setY(30);
                if (ev.key === 'telekinesis') this.effects.lob(from, to, d, { color: 0x6d4c41, size: 2.2, arc: 14 });
                else this.effects.missile(from, (out) => out.copy(to), d, 0xff6d00, 1.2);
              }
              audio.missile();
              this.ui.toast(ev.key === 'telekinesis' ? '🪨 TELEKINESIS! The Overlord hurls boulders at your towers.' : '🚀 ROCKET BOMBARDMENT! Rockets are flying at your towers.', 2000);
              break;
            case 'minigun':
            case 'thunderstorm': {
              const from = v ? v.aimPoint(new THREE.Vector3()) : null;
              for (const [x, z] of ev.h) {
                const to = new THREE.Vector3(x, 1.5, z + oz);
                if (ev.key === 'minigun') this.effects.tracer(from ?? to.clone().setY(20), to, 0xffd740, 0.2);
                else this.effects.lightning([to.clone().setY(60), to], 0xb388ff);
                this.effects.flash(to, ev.key === 'minigun' ? 0xffd740 : 0xb388ff, 1.2);
              }
              audio.shot(0, ev.key === 'minigun' ? 'minigun' : 'electro');
              this.ui.toast(ev.key === 'minigun' ? `🔫 MINIGUN MAYHEM! ${plural(ev.n)} stunned.` : `🌩️ THUNDERSTORM! ${plural(ev.n)} stunned.`, 1800);
              break;
            }
            case 'swordThrow':
            case 'crystalThrow':
            case 'eyeLaser': {
              const to = new THREE.Vector3(ev.tx, 1.5, ev.tz + oz);
              const from = v ? v.aimPoint(new THREE.Vector3()) : to.clone().setY(20);
              if (ev.key === 'eyeLaser') {
                this.effects.pulse(to.clone().setY(0.3), ev.r, ev.d, 0xd500f9); // where it will hit
                this.effects.tracer(from, to, 0xd500f9, 0.5);
                this.ui.toast('👁️ The Corrupted is charging its eye at your towers!', 2000);
              } else this.effects.lob(from, to, ev.d, { color: ev.key === 'swordThrow' ? 0x7c4dff : 0x40c4ff, size: 1, arc: 4, glowing: true });
              break;
            }
            case 'vengefulSlash':
            case 'hammerSpin':
            case 'concLightning':
              if (ev.key === 'hammerSpin') this.effects.whirl(at, ev.r);
              this.effects.pulse(at, ev.r, 0.5, ev.key === 'concLightning' ? 0xb388ff : ev.key === 'hammerSpin' ? 0x00e676 : 0x7c4dff);
              if (ev.key === 'concLightning') this.effects.pulse(at, ev.r * 0.6, 0.4, 0xffffff);
              audio.boom(4);
              if (ev.n) this.ui.toast(`${ev.key === 'vengefulSlash' ? '⚔️ Vengeful Slash' : ev.key === 'hammerSpin' ? '🔨 Hammer Spin' : '⚡ Concentrated Lightning'} stunned ${plural(ev.n)}!`, 1500);
              break;
            case 'hammerLine': {
              // A shockwave rolling straight ahead along the path.
              for (let i = 1; i <= 6; i++) {
                const p = new THREE.Vector3(ev.x + ev.dx * (ev.len * i) / 6, 0.3, ev.z + ev.dz * (ev.len * i) / 6 + oz);
                this.effects.pulse(p, 3, 0.25 + i * 0.06, 0x00e676);
              }
              audio.boom(5);
              if (ev.n) this.ui.toast(`🔨 Hammer Smash stunned ${plural(ev.n)}!`, 1500);
              break;
            }
            case 'axeSlash':
              this.effects.whirl(at, ev.r);
              this.effects.pulse(at, ev.r, 0.4, 0x80d8ff);
              audio.lob('grenadierAssaultBottom');
              if (ev.n) this.ui.toast(`🪓 Axe Slash! ${plural(ev.n)} fire slower for a while.`, 1500);
              break;
            case 'staffSlam':
              this.effects.pulse(at, ev.r, 0.35, 0x40c4ff);
              break;
            // ------------------------------------------------ Hardcore moves
            case 'gaze': {
              for (const [x, z] of ev.h) {
                const to = new THREE.Vector3(x, 1.5, z + oz);
                this.effects.tracer(v ? v.aimPoint(new THREE.Vector3()) : to.clone().setY(20), to, 0xaa00ff, 0.3);
                this.effects.flash(to, 0xd500f9, 1);
              }
              break;
            }
            case 'dSword':
            case 'dSpikes':
              if (ev.key === 'dSword') this.effects.whirl(at, ev.r);
              this.effects.pulse(at, ev.r, 0.5, ev.key === 'dSword' ? 0x9e9e9e : 0xaa00ff);
              audio.boom(ev.key === 'dSword' ? 4 : 6);
              if (ev.n) this.ui.toast(`${ev.key === 'dSword' ? '🗡️ Demise swung its sword' : '🪨 Spikes burst from the ground'}: ${plural(ev.n)} stunned!`, 1600);
              break;
            case 'dMist':
              this.effects.smoke(at.clone().setY(0.5), ev.r, 3, [0xff80ab, 0xf48fb1], 14);
              audio.boom(3);
              this.ui.toast(ev.n ? `🌸 PINK MIST! Demise downgraded ${plural(ev.n)} by one level.` : '🌸 Demise breathes a pink mist…', 2400);
              break;
            case 'crystalLaser':
              this.effects.pulse(at, ev.r, 0.6, 0xd500f9);
              this.effects.pulse(at, ev.r * 0.5, 0.4, 0xffffff);
              audio.shot(0, 'phaser');
              this.ui.toast(`💎 The Crystalian fires its laser${ev.n ? `: ${plural(ev.n)} deal less damage` : ''}. It can be hurt for ${ev.open}s: HIT IT!`, 2000);
              break;
            case 'hammerBounce': {
              let prev = v ? v.aimPoint(new THREE.Vector3()) : null;
              for (const [x, z] of ev.h) {
                const to = new THREE.Vector3(x, 1.5, z + oz);
                if (prev) this.effects.tracer(prev, to, 0xb388ff, 0.4);
                this.effects.flash(to, 0xb388ff, 1);
                prev = to;
              }
              audio.boom(4);
              this.ui.toast(`🔨 The Vindicator's hammer scared ${plural(ev.h.length)}: they can't attack for a while!`, 2000);
              break;
            }
            case 'spear':
              for (let i = 1; i <= 6; i++) this.effects.pulse(new THREE.Vector3(ev.x + (ev.dx * ev.len * i) / 6, 0.3, ev.z + (ev.dz * ev.len * i) / 6 + oz), 2.5, 0.25 + i * 0.05, 0x80d8ff);
              audio.boom(5);
              if (ev.n) this.ui.toast(`🔱 The Void Guardian's spear froze ${plural(ev.n)} for 10 seconds!`, 1800);
              break;
            case 'timeParadox':
              this.effects.pulse(at, 10, 0.6, 0xffffff);
              for (const [x, z] of ev.h) this.effects.puff(new THREE.Vector3(x, 3, z + oz), 0xeceff1, 18, 0.7, 8);
              audio.boom(6);
              this.shake?.(0.5, 1);
              this.ui.toast(ev.n ? `⌛ TIME PARADOX! ${plural(ev.n)} turned into different towers at level 1!` : '⌛ Time Paradox! Luckily nothing changed.', 2800);
              break;
          }
          break;
        }
        // ---------------------------------------------------------------- Insane mode (2026-11-09 spec)
        case 'iBuild':
          this.effects.puff(new THREE.Vector3(ev.x, 2, ev.z + laneOz(ev.L ?? 0)), 0x2979ff, 14, 0.5, 8);
          this.ui.toast('🔧 The Engineer built an MK11-Device! It waits there until the device is destroyed.', 2400);
          break;
        case 'iBackup':
          audio.waveStart();
          this.ui.toast('🔊 BACKUP! The Overlord called in his Amplifiers. They heal him: destroy them!', 3000);
          break;
        case 'iDespair': {
          const v = this.enemyViews.get(ev.e);
          if (v) this.effects.puff(v.pos.clone().setY(4), 0xff1744, 30, 0.9, 14);
          audio.waveStart();
          this.ui.screenFlash?.('#ff1744', 500);
          this.ui.toast('😡 DESPAIR! The Overlord is much faster and tougher now, and Vengeful Champions are coming out of the entrance!', 3500);
          break;
        }
        case 'iThrow': {
          const at = new THREE.Vector3(ev.x, 2, ev.z + laneOz(ev.L ?? 0));
          this.effects.puff(at, 0x00e676, 16, 0.6, 10);
          this.ui.toast('🏃 The Vanguard threw its hammer away! It runs much faster, but has no more attacks.', 2600);
          break;
        }
        // ---------------------------------------------------------------- Void mode enemies
        case 'vTendril': {
          // Void armor tendrils lash the towers next to the enemy.
          const v = this.enemyViews.get(ev.e);
          if (!v) break;
          v.lash();
          const from = v.aimPoint(new THREE.Vector3());
          const oz = laneOz(ev.L ?? 0);
          for (const [x, z] of ev.h) {
            const to = new THREE.Vector3(x, 2, z + oz);
            this.effects.tracer(from, to, 0xaa00ff, 0.5);
            this.effects.puff(to, 0x4a0072, 5, 0.4, 4);
          }
          break;
        }
        case 'vArmorBreak': {
          // The void armor shatters: no more shield, armor, slow or tendrils.
          const at = new THREE.Vector3(ev.x, 2.5, ev.z + laneOz(ev.L ?? 0));
          this.effects.puff(at, 0xd500f9, ev.big ? 30 : 10, ev.big ? 0.8 : 0.5, ev.big ? 16 : 8);
          if (ev.big) {
            this.effects.pulse(at.clone().setY(0.3), 8, 0.6, 0xea80fc);
            audio.boom(5);
            this.ui.toast(`💥 The ${ENEMIES[ev.type]?.name ?? 'boss'}'s void armor shattered!`, 2400);
          }
          break;
        }
        case 'vMove': {
          // Guardian, False Void and VOID moves (see Sim.voidMove).
          const oz = laneOz(ev.L ?? 0);
          const v = this.enemyViews.get(ev.e);
          v?.attack();
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + oz);
          const plural = (n, w = 'tower') => `${n} ${w}${n === 1 ? '' : 's'}`;
          switch (ev.key) {
            case 'slash': {
              const to = new THREE.Vector3(ev.tx, 2, ev.tz + oz);
              this.effects.pulse(to.clone().setY(0.3), 3, 0.4, 0xb71c1c);
              this.effects.puff(to, 0xd50000, 14, 0.5, 8);
              audio.boom(3);
              const name = TOWERS[st.towers.get(ev.tower)?.type]?.name ?? 'tower';
              this.ui.toast(`🪓 A Guardian's axe hit your ${name}! It bleeds for ${ev.time}s: no attacks, abilities or upgrades.`, 2600);
              break;
            }
            case 'shockwave':
            case 'stomp': {
              this.effects.pulse(at, ev.r, ev.key === 'shockwave' ? 1.4 : 0.6, 0xd500f9);
              this.effects.puff(at.clone().setY(2), 0x4a0072, ev.key === 'shockwave' ? 40 : 18, 1, 14);
              audio.boom(ev.key === 'shockwave' ? 8 : 6);
              this.shake(ev.key === 'shockwave' ? 2 : 1, 1);
              if (ev.key === 'shockwave') this.ui.screenFlash('#4a0072', 800);
              this.ui.toast(ev.key === 'shockwave'
                ? `😱 The False Void SCREAMS! ${plural(ev.n, 'ground tower')} stunned for ${ev.stun}s, and units are crushed.`
                : `🦶 The False Void stomps! ${plural(ev.n, 'ground tower')} stunned for ${ev.stun}s.`, 2600);
              break;
            }
            case 'summon':
              if (v) this.effects.puff(v.pos.clone().setY(4), 0x7b1fa2, 20, 0.7, 10);
              this.ui.toast(`🟣 The False Void pulled ${ev.n} Spawns out of its body!`, 2000);
              break;
            case 'abyss':
              this.effects.pulse(at, 80, 1.6, 0xd500f9);
              this.effects.pulse(at, 40, 1.0, 0x000000);
              audio.boom(9);
              this.shake(3, 2);
              this.ui.screenFlash('#1a0026', 1500);
              this.ui.toast(`😱 FROM THE ABYSS! VOID's scream stunned EVERY tower for ${ev.stun}s${ev.u ? ` and wiped out ${plural(ev.u, 'unit')}` : ''}.`, 3500);
              break;
            case 'corruption':
              if (v) this.effects.pulse(v.pos.clone().setY(0.3), 30, 1.4, 0x9c27b0);
              for (const id of ev.ids) {
                const tw = st.towers.get(id);
                if (tw) this.effects.puff(new THREE.Vector3(tw.x, 3, tw.z + oz), 0xaa00ff, 20, 0.8, 10);
              }
              audio.waveStart();
              this.ui.screenFlash('#6a1b9a', 700);
              this.ui.toast(`🟪 CORRUPTION! VOID turned ${plural(ev.ids.length)} to his side${ev.u ? ` and took ${plural(ev.u, 'unit')}` : ''}. Corrupted towers sell for 20% more!`, 3500);
              break;
            case 'devastation':
              this.effects.pulse(at, ev.r, 0.6, 0xff1744);
              this.effects.puff(at.clone().setY(1), 0x4a0072, 22, 0.8, 12);
              audio.boom(7);
              this.shake(1.2, 0.8);
              break;
            case 'army':
              audio.waveStart();
              this.ui.toast(`👥 UNFORESEEN ARMY! ${ev.n} enemies appeared all along the path!`, 3000);
              break;
            case 'meteors':
              for (const [x, z, d, r] of ev.h) {
                const to = new THREE.Vector3(x, 0.3, z + oz);
                this.effects.pulse(to, r, d, 0xd500f9);
                this.effects.lob(new THREE.Vector3(x + 6, 70, z + oz - 6), to, d, { color: 0x7b1fa2, size: 1 + r * 0.4, arc: 0, glowing: true });
              }
              this.ui.toast('☄️ ABYSSAL STRIKEDOWN! Purple meteors are falling on your towers!', 2600);
              break;
            case 'telekinesis':
              for (const [x, z] of ev.h) {
                const to = new THREE.Vector3(x, 1, z + oz);
                this.effects.tracer(to.clone().setY(30), to, 0xd500f9, 1);
                this.effects.explosion(to, 4);
              }
              audio.boom(6);
              this.ui.toast(`🌀 TELEKINESIS! VOID crushed ${plural(ev.h.length, 'Warship')}, and every tower works ${Math.round(ev.slow * 100)}% slower for ${ev.time}s.`, 3200);
              break;
          }
          break;
        }
        case 'shellBreak': {
          // Voidkin / Guardian: the void armor shatters.
          const at = new THREE.Vector3(ev.x, 2.5, ev.z + laneOz(ev.L ?? 0));
          this.effects.puff(at, 0xd500f9, 26, 0.7, 14);
          this.effects.pulse(at.clone().setY(0.3), 6, 0.5, 0xea80fc);
          audio.boom(4);
          const name = ENEMIES[ev.type]?.name ?? 'enemy';
          this.ui.toast(ev.type === 'voidGuardian' ? `⚔️ The ${name}'s armor shattered! It draws its swords and charges!` : `💥 The ${name}'s void armor broke! No more lead or explosion resistance.`, 2600);
          break;
        }
        case 'acid': // Acid Void: a puddle of acid
          this.effects.puddle(new THREE.Vector3(ev.x, 0, ev.z + laneOz(ev.L ?? 0)), ev.r, ev.life, 0x64dd17);
          this.effects.puff(new THREE.Vector3(ev.x, 1, ev.z + laneOz(ev.L ?? 0)), 0x76ff03, 10, 0.5, 6);
          break;
        case 'drain': {
          // Golden Void: cash floats off toward it.
          const v = this.enemyViews.get(ev.e);
          if (v && Math.random() < 0.5) this.effects.text(v.pos.clone().setY(v.height + 2), `-$${ev.v}`, '#ffd740', 2.5);
          break;
        }
        case 'punch': {
          // VOID punches a tower clean out of position.
          const oz = laneOz(ev.L ?? 0);
          const v = this.enemyViews.get(ev.e);
          v?.attack();
          const to = new THREE.Vector3(ev.x, 2, ev.z + oz);
          if (v) this.effects.tracer(v.aimPoint(new THREE.Vector3()), to, 0xff1744, 1.2);
          this.effects.flash(to, 0xff1744, 3);
          this.effects.puff(to, 0xd500f9, 18, 0.7, 12);
          audio.boom(6);
          this.shake(0.4, 0.8);
          break;
        }
        case 'vMark': {
          this.enemyViews.get(ev.e)?.attack();
          audio.waveStart();
          this.ui.screenFlash('#aa00ff', 500);
          const name = TOWERS[st.towers.get(ev.tower)?.type]?.name ?? 'tower';
          this.ui.toast(`✖ VOID MARKED your ${name}! It will be destroyed in ${ev.fuse} seconds!`, 3500);
          break;
        }
        case 'vMarkHit': {
          const at = new THREE.Vector3(ev.x, 0.5, ev.z + laneOz(ev.L ?? 0));
          this.effects.explosion(at, 5);
          this.effects.pulse(at, 7, 0.6, 0xd500f9);
          this.effects.tracer(at.clone().setY(60), at, 0xd500f9, 1.6);
          audio.boom(7);
          this.shake(0.5, 1);
          break;
        }
        case 'vOrb': {
          this.enemyViews.get(ev.e)?.attack();
          audio.lob('paint');
          this.ui.toast('🔮 VOID launched a magic missile at your base! Run into it to pop it!', 3200);
          break;
        }
        case 'orbPop': {
          this.popped?.delete(ev.id);
          const at = new THREE.Vector3(ev.x, 3, ev.z + laneOz(ev.L ?? 0));
          this.effects.puff(at, 0xea80fc, 20, 0.6, 10);
          this.effects.pulse(at.clone().setY(0.3), 4, 0.4, 0xd500f9);
          audio.upgrade();
          const who = ev.by === this.session.myId ? 'You' : st.players.get(ev.by)?.name ?? 'Someone';
          this.ui.toast(`✨ ${who} popped VOID's magic missile!`, 1600);
          break;
        }
        case 'orbHit': {
          this.popped?.delete(ev.id);
          audio.baseHit();
          this.effects.puff(new THREE.Vector3(path.end.x, 3, path.end.z + laneOz(ev.L ?? 0)), 0xd500f9, 24, 0.7, 12);
          this.shake(0.5, 1);
          this.ui.toast(`💥 VOID's magic missile hit your base for ${ev.d}!`, 2200);
          break;
        }
        case 'vLaserWarn': {
          this.enemyViews.get(ev.e)?.attack();
          audio.waveStart();
          this.ui.toast('🔴 VOID is calling down a laser from the sky! Every unit on the track will be burned away!', 2400);
          break;
        }
        case 'vLaser': {
          const oz = laneOz(ev.L ?? 0);
          const pts = [];
          for (let r = 0; r < path.routes.length; r++) for (let d = 0; d <= path.length; d += 3) {
            const at = path.at(d, {}, r);
            pts.push(new THREE.Vector3(at.x, at.y, at.z + oz));
          }
          this.effects.skyLaser(pts, 1.6);
          this.ui.screenFlash('#ff1744', 700);
          audio.shot(0, 'phaser');
          audio.boom(5);
          this.shake(1.6, 0.6);
          if (ev.n) this.ui.toast(`🔴 The sky laser wiped out ${ev.n} unit${ev.n > 1 ? 's' : ''}!`, 2000);
          break;
        }
        case 'vRise': {
          // Phase two: VOID becomes a ghost with a void heart, and three Guardians appear.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          this.effects.pulse(at, 30, 1.5, 0xd500f9);
          this.effects.pulse(at, 18, 1.0, 0xffffff);
          this.effects.puff(at.clone().setY(6), 0x7c4dff, 40, 1.2, 20);
          audio.boom(8);
          audio.waveStart();
          this.shake(2.5, 3);
          this.ui.screenFlash('#1a0026', 2000);
          this.ui.banner('VOID RISES', 'His body is gone. Only the void heart remains…', 5000);
          this.ui.toast('👻 VOID has become a spirit! He is faster, withers every tower, and three Guardians stand at his side!', 6000);
          break;
        }
        case 'vCharge': {
          const v = this.enemyViews.get(ev.e);
          if (v) this.effects.pulse(v.pos.clone().setY(0.3), 10, 2, 0x7c4dff);
          this.ui.toast('👻 VOID is charging up… he\'s about to vanish into the sky!', 2000);
          break;
        }
        case 'vDown': {
          // VOID is finally defeated.
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + laneOz(ev.L ?? 0));
          for (let i = 0; i < 4; i++) {
            setTimeout(() => {
              if (!this.session) return;
              this.effects.pulse(at, 12 + i * 10, 1.2, i % 2 ? 0xffffff : 0xd500f9);
              this.effects.puff(at.clone().setY(4 + i * 2), i % 2 ? 0xffffff : 0xea80fc, 30, 1, 18);
              audio.boom(6 + i);
            }, i * 450);
          }
          this.shake(3.5, 3);
          this.ui.screenFlash('#ffffff', 2500);
          this.ui.banner('VOID HAS FALLEN', 'Light returns to the world. It is finally over.', 5000, 'light');
          break;
        }
        case 'enrage': {
          const v = this.enemyViews.get(ev.e);
          audio.waveStart();
          this.ui.toast(`😡 The ${v?.def.name ?? 'Eradicator'} is enraged and sprinting for your base! Finish it!`, 3500);
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
          if (!this.versus || ev.L === this.myLane) this.effects.baseHit(new THREE.Vector3(path.end.x, 0, path.end.z + laneOz(ev.L ?? 0)));
          break;
        }
        case 'waveStart': {
          this.earnXp();
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
          if (ev.holo) this.effects.puff(new THREE.Vector3(ev.x, 0.5, ev.z), 0x18ffff, 16, 0.4, 6);
          this.effects.placeFx(new THREE.Vector3(ev.x, 0, ev.z), ev.holo ? 0x18ffff : 0xcfd8dc);
          break;
        case 'towerDown': // a tower ran out of health: knocked out until healed
          this.effects.puff(new THREE.Vector3(ev.x, 2, ev.z), 0x616161, 14, 0.6, 8);
          this.effects.sparks(new THREE.Vector3(ev.x, 3, ev.z), 0xffd54f, 10, 13);
          this.effects.smokePuff(new THREE.Vector3(ev.x, 3, ev.z), 1.6, 6);
          if (ev.owner === myId) this.ui.toast('💫 One of your towers was knocked out! Heal it with a Medic or Health Pack', 2200);
          break;
        case 'bounty': {
          // Mobster Place Bounty: a gold tag over the marked zombie.
          const v = this.enemyViews.get(ev.e);
          if (v) this.effects.text(v.aimPoint(new THREE.Vector3()).setY(8 * MODEL_SCALE), `Bounty $${ev.v.toLocaleString()}`, '#ffd740', 2.6);
          break;
        }
        case 'bountyPaid':
          if (ev.owner === myId) {
            this.effects.text(new THREE.Vector3(ev.x, 9 * MODEL_SCALE, ev.z), `+$${ev.v.toLocaleString()}${ev.run ? '' : ' bounty!'}`, '#ffd740', 3.2);
            audio.cash();
          }
          break;
        case 'cashback': // Mobster Life Insurance
          if (ev.owner === myId) this.effects.text(new THREE.Vector3(ev.x, 8 * MODEL_SCALE, ev.z), `+$${ev.v.toLocaleString()} cash back`, '#69f0ae', 2.6);
          break;
        case 'towerUp': // healed back up
          this.effects.puff(new THREE.Vector3(ev.x, 2, ev.z), 0x69f0ae, 12, 0.5, 6);
          break;
        case 'paradox': // Expert Beholder Time Paradox: this tower became another one
          this.effects.puff(new THREE.Vector3(ev.x, 3, ev.z), 0xeceff1, 16, 0.6, 8);
          break;
        case 'holoEnd': // a Hacker clone fades away
          this.effects.puff(new THREE.Vector3(ev.x, 3, ev.z), 0x18ffff, 16, 0.5, 8);
          break;
        case 'convert': // a hacked zombie comes back as a hologram
          this.effects.puff(new THREE.Vector3(ev.x, 2, ev.z), 0x18ffff, 10, 0.4, 6);
          break;
        case 'upgrade':
          if (ev.owner === myId) audio.upgrade();
          this.effects.levelUp(new THREE.Vector3(ev.x, 0, ev.z), 0xffd54f, 6);
          this.effects.text(new THREE.Vector3(ev.x, 7.5 * MODEL_SCALE, ev.z), ev.name, '#ffd54f', 2.6);
          break;
        case 'konami':
          if (ev.owner === myId) {
            audio.upgrade();
            this.ui.toast('Konami code! ∞ money this game', 2500);
          }
          break;
        case 'income':
          if (ev.owner === myId) this.effects.text(new THREE.Vector3(ev.x, 7 * MODEL_SCALE, ev.z), `+$${ev.v}`, '#a5f36b');
          break;
        case 'revive':
          // Combat Medic Revive Pack: the tower gets back up in a few seconds.
          this.effects.text(new THREE.Vector3(ev.x, 7 * MODEL_SCALE, ev.z), `✚ Reviving (${ev.d}s)`, '#ff8a80');
          break;
        case 'shieldUp':
          this.effects.text(new THREE.Vector3(ev.x, 7 * MODEL_SCALE, ev.z), '🛡 Shields up', '#80d8ff');
          break;
        case 'medDrone':
          this.effects.text(new THREE.Vector3(ev.x, 7 * MODEL_SCALE, ev.z), `✚ Medic Drone (${ev.d}s)`, '#ff8a80', 2.6);
          break;
        case 'crate':
          if (rootType(st.towers.get(ev.id)?.type ?? '') === 'farmMarket') {
            // Market: its cash bundles just pop out (or go into its bank).
            if (ev.owner === myId) {
              this.effects.text(new THREE.Vector3(ev.x, 7 * MODEL_SCALE, ev.z), ev.v ? `+$${ev.v}` : '🏦 Banked', '#a5f36b', 2.2);
              if (ev.v) audio.cash();
            }
            break;
          }
          // Airdrop Farm: a cargo plane drops a cash crate on the helipad.
          this.effects.airdrop({ x: ev.x, z: ev.z }, () => {
            if (ev.owner !== myId) return;
            this.effects.text(new THREE.Vector3(ev.x, 7 * MODEL_SCALE, ev.z), `+$${ev.v}`, '#a5f36b', 2.6);
            audio.cash();
          });
          break;
        case 'cash': {
          // Cowboy cash shot: a gold coin pops out and the revolver twirls.
          this.towerViews.get(ev.id)?.twirl(ev.spin);
          if (ev.owner === myId) {
            this.effects.text(new THREE.Vector3(ev.x, 7 * MODEL_SCALE, ev.z), `+$${ev.v}`, '#ffd54f', 2.4);
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
          if (ev.x != null) this.effects.sellFx(new THREE.Vector3(ev.x, 0, ev.z));
          if (ev.owner === myId) {
            audio.sell();
            this.effects.text(new THREE.Vector3(ev.x, 5 * MODEL_SCALE, ev.z), `+$${ev.value}`, '#a5f36b');
          }
          break;
        // ---------------------------------------------------------------- Hardcore mode (2026-11-09)
        case 'hcMove': {
          // Soul Stealer, Void Reaver, Void Caster and Emperor moves (see Sim.hcMove).
          const oz = laneOz(ev.L ?? 0);
          const v = this.enemyViews.get(ev.e);
          v?.attack();
          const at = new THREE.Vector3(ev.x, 0.3, ev.z + oz);
          const from = v ? v.aimPoint(new THREE.Vector3()) : at.clone().setY(8);
          const plural = (n, w = 'tower') => `${n} ${w}${n === 1 ? '' : 's'}`;
          const marks = (h, color) => {
            for (const [x, z] of h ?? []) {
              const to = new THREE.Vector3(x, 1.5, z + oz);
              this.effects.tracer(from, to, color, 0.4);
              this.effects.pulse(to.clone().setY(0.3), 2.5, 0.5, color);
            }
          };
          switch (ev.key) {
            case 'curseTower': {
              const to = new THREE.Vector3(ev.tx, 1.5, ev.tz + oz);
              this.effects.tracer(from, to, 0xffc400, 0.5);
              this.effects.puff(to, 0xffc400, 12, 0.6, 6);
              this.ui.toast('🔒 The Soul Stealer CURSED a tower! It can\'t do anything until the Soul Stealer dies.', 2200);
              break;
            }
            case 'soulSummon':
              this.effects.puff(at.clone().setY(3), 0xeeeeee, 24, 0.8, 10);
              this.ui.toast(`👻 The Soul Stealer summoned ${ev.n} Souls and a Void Eye, and vanished for a while!`, 2200);
              break;
            case 'cursedBlade':
            case 'spearLine':
              for (let i = 1; i <= 7; i++) this.effects.pulse(new THREE.Vector3(ev.x + (ev.dx * ev.len * i) / 7, 0.3, ev.z + (ev.dz * ev.len * i) / 7 + oz), 3, 0.25 + i * 0.05, 0xaa00ff);
              audio.boom(5);
              this.ui.toast(`🗡️ CURSED BLADE! ${ev.n ? `${plural(ev.n)} deal less damage and lose range` : 'A wave of void cuts down the path'}, and Blessed Souls appear.`, 2000);
              break;
            case 'judgement':
              for (const [x, z] of ev.h) this.effects.lightning([new THREE.Vector3(x, 60, z + oz), new THREE.Vector3(x, 1, z + oz)], 0xd500f9);
              audio.boom(6);
              this.ui.toast(`⚖️ VOID JUDGEMENT! ${plural(ev.h.length)} can't attack until the Void Reaver hits 0 health.`, 2800);
              break;
            case 'unnervingGaze':
              this.effects.pulse(at, 8, 0.6, 0xaa00ff);
              this.ui.toast('👁️ Unnerving Gaze! Portals opened: Void Eyes will stun your towers. Destroy them!', 2200);
              break;
            case 'rupture':
              this.effects.whirl(at, ev.r);
              this.effects.pulse(at, ev.r, 0.5, 0xd500f9);
              audio.boom(6);
              this.ui.banner('VOID RUPTURE', `Deal ${ev.cancel.toLocaleString()} damage in ${ev.charge}s to stop the slash!`, ev.charge * 1000);
              break;
            case 'ruptureSlash':
              this.effects.pulse(at, 80, 1, 0xd500f9);
              this.effects.pulse(at, 50, 0.8, 0xffffff);
              audio.boom(9);
              this.shake(1.4, 2);
              this.ui.screenFlash('#4a0072', 900);
              this.ui.toast(`💥 VOID RUPTURE! Every tower is stunned for ${ev.stun}s.`, 3000);
              break;
            case 'ruptureCancel':
              this.effects.puff(at.clone().setY(4), 0xffffff, 30, 0.8, 12);
              this.ui.toast('✋ You interrupted the Void Rupture!', 2500);
              break;
            case 'casterShield': {
              const to = new THREE.Vector3(ev.tx, 3, ev.tz + oz);
              this.effects.tracer(from, to, 0xd500f9, 0.6);
              this.effects.puff(to, 0xea80fc, 20, 0.7, 8);
              this.ui.toast('🛡️ The Void Caster shielded the Void Reaver!', 1800);
              break;
            }
            case 'casterPortal':
              this.effects.pulse(at, 5, ev.time, 0xaa00ff);
              this.effects.puff(at.clone().setY(3), 0xaa00ff, 30, 1, 10);
              this.ui.toast(`🌀 The Void Caster opened a portal: ${ev.n} enemies are pouring out!`, 2500);
              break;
            case 'finalEradication':
              this.effects.pulse(at, 60, 0.9, 0xff1744);
              this.effects.pulse(at, 30, 0.6, 0xffffff);
              audio.boom(9);
              this.shake(1.2, 2);
              this.ui.toast(`🔨 FINAL ERADICATION! Every unit destroyed${ev.n ? ` and ${plural(ev.n)} stunned` : ''}.`, 2800);
              break;
            case 'chronoStasis':
              this.ui.screenFlash('#ffffff', 700);
              this.effects.pulse(at, 40, ev.time, 0xeceff1);
              audio.boom(6);
              this.ui.toast(`⏱️ CHRONO STASIS! Time crawls (your towers barely move), and an orb hit your base for ${ev.d}.`, 3000);
              break;
            case 'encore':
              this.effects.puff(at.clone().setY(4), 0xff1744, 30, 0.9, 12);
              this.ui.toast(`🤖 ERADICATORS' ENCORE! The Emperor called in ${ev.n} drones and clones.`, 2600);
              break;
            case 'divineProtection':
              this.effects.pulse(at, ev.r, 0.6, 0xffd740);
              this.effects.puff(at.clone().setY(4), 0xffe57f, 24, 0.8, 8);
              this.ui.toast('✨ Divine Protection! The Emperor raised a huge shield.', 2000);
              break;
            case 'meteoricSwarm':
              for (const [x, z, d] of ev.h) {
                const to = new THREE.Vector3(x, 0.3, z + oz);
                this.effects.pulse(to, ev.r, d, 0xff1744);
                this.effects.missile(to.clone().setY(60), (out) => out.copy(to), d, 0xff6d00, 1.4);
              }
              audio.missile();
              this.ui.toast('☄️ METEORIC SWARM! Drones are raining down on your towers.', 2200);
              break;
            case 'corruptingBlast':
              marks(ev.h, 0xff1744);
              this.ui.toast(`🟥 CORRUPTING BLAST! ${plural(ev.h.length)} can't fight for ${ev.time}s.`, 2400);
              break;
            case 'harvest':
              marks(ev.h, 0xff5252);
              audio.shot(0, 'phaser');
              this.ui.toast(`🩸 EMPEROR'S HARVEST! Beams drain ${plural(ev.h.length)} while he heals.`, 2400);
              break;
            case 'execution': {
              const to = new THREE.Vector3(ev.tx, 1.5, ev.tz + oz);
              this.effects.pulse(to.clone().setY(0.3), 3, 0.5, 0xffffff);
              this.effects.puff(to, 0xff1744, 20, 0.7, 10);
              audio.boom(7);
              this.ui.toast('👋 PERSONAL EXECUTION! The Emperor slapped down your priciest tower nearby.', 2600);
              break;
            }
            case 'overdrive':
              this.effects.puff(at.clone().setY(3), 0xff1744, 16, 0.6, 10);
              break;
          }
          break;
        }
        case 'hcWrath': {
          const v = this.enemyViews.get(ev.e);
          audio.boom(8);
          this.shake(1.2, 2);
          this.ui.screenFlash('#4a0072', 1200);
          this.ui.banner("VOID'S WRATH", 'The Void Reaver rips off its mask… and the Void Caster answers.', 4000);
          if (v) this.effects.puff(v.aimPoint(new THREE.Vector3()), 0xd500f9, 40, 1, 14);
          break;
        }
        case 'hcDown':
          audio.waveStart();
          this.ui.toast(`💀 The Void Reaver is down! The Void Caster is reviving him in ${ev.t}s. HIT HER NOW!`, 4000);
          break;
        case 'hcRevive':
          this.ui.toast('🔮 The Void Caster revived the Void Reaver!', 2500);
          break;
        case 'hcDeathwish':
          audio.boom(8);
          this.ui.banner('VOID DEATHWISH', 'The Caster is gone. The Reaver runs for your base!', 3500);
          break;
        case 'hcRage':
          this.ui.toast('😡 The Void Caster is ENRAGED!', 2000);
          break;
        case 'hcRecede':
          audio.waveStart();
          this.ui.toast(ev.left ? `🌀 TAUNTING RECESSION! The Emperor warped back to the start (${ev.left} more time${ev.left === 1 ? '' : 's'}).` : '🌀 The Emperor warped back to the start. Next time he WILL enter your base!', 3500);
          break;
        case 'hcDowngrade': {
          const at = new THREE.Vector3(ev.x, 2, ev.z + laneOz(ev.L ?? 0));
          this.effects.puff(at, 0xff80ab, 14, 0.6, 6);
          break;
        }
        case 'oshBreak': {
          const at = new THREE.Vector3(ev.x, 2.5, ev.z + laneOz(ev.L ?? 0));
          this.effects.puff(at, 0x80deea, ev.big ? 24 : 8, 0.4, ev.big ? 10 : 5);
          if (ev.big) {
            audio.boom(4);
            this.ui.toast(`💥 ${ENEMIES[st.enemies.get(ev.e)?.type]?.name ?? 'The boss'}'s shield broke!`, 1600);
          }
          break;
        }
        case 'timeShiftEnd':
          audio.waveStart();
          this.ui.screenFlash('#ffffff', 900);
          this.ui.toast('🌍 The Beholder is beaten! You\'re back on the real map, and every tower was refunded. You have extra time to rebuild!', 6000);
          break;
        case 'reborn': {
          // A cage broke open, or a boss came back for its second phase.
          const e = st.enemies.get(ev.e);
          const def = ENEMIES[ev.type];
          if (e) {
            const at = path.at(e.dist, {}, e.route);
            const color = def.fire ? 0xff6d00 : ENEMIES[ev.from].cage ? 0x9e9e9e : def.skin;
            this.effects.puff(new THREE.Vector3(at.x, 2, at.z + laneOz(e.lane ?? 0)), color, def.boss ? 24 : 10, 0.5, def.boss ? 12 : 6);
          }
          if (ev.type === 'devotee' && ENEMIES[ev.from].name !== 'Devotee' && e) {
            // Reviver: a fallen enemy rises again as a Devotee.
            const at = path.at(e.dist, {}, e.route);
            this.effects.pulse(new THREE.Vector3(at.x, at.y + 0.3, at.z + laneOz(e.lane ?? 0)), 3, 0.4, 0x69f0ae);
          } else if (ENEMIES[ev.from].shield) {
            // Shielders: the crystal shield shatters.
            audio.boom(1);
          } else if (ENEMIES[ev.from].phase2) {
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
          this.effects.text(new THREE.Vector3(CASTLE.x, 18 * MODEL_SCALE, CASTLE.z + laneOz(ev.L)), `-${ev.d}`, '#ef5350', 3);
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
            const derrick = (win && ev.bonus?.[myId]) || 0; // Oil Derrick US Military Budget
            const credits = VERSUS.credits(waves, place) + derrick;
            const shards = VERSUS.shards(place);
            profile.addCredits(credits);
            profile.addShards(shards);
            this.ui.showVersusEnd(place, st.players.get(ev.winner)?.name ?? '?', win ? ev.wave : this.elimWave + 1, credits, shards, derrick);
            break;
          }
          this.cancelPlace();
          this.deselect();
          ev.win ? audio.victory() : audio.defeat();
          const diff = difficulty(st.mode);
          const derrick = (ev.win && ev.bonus?.[myId]) || 0; // Oil Derrick US Military Budget: a flat bonus for a win
          const credits = Math.round(GAME.credits(ev.win ? st.wave.total : st.wave.index, ev.win) * diff.credits) + derrick;
          const shards = GAME.shards(ev.win) * diff.shards;
          const gems = diff.gems ? GAME.gems(ev.win ? st.wave.total : st.wave.index, ev.win) : 0; // Hardcore
          profile.addCredits(credits);
          profile.addShards(shards);
          profile.addGems(gems);
          const opened = ev.win && profile.markBeaten(st.mode) && Object.keys(DIFFICULTIES).find((k) => DIFFICULTIES[k].needs?.includes(st.mode) && profile.modeOpen(k));
          // Win rewards: a tower or variant (Easy, Medium, Hard, Void) or an upgrade perk (Insane).
          let unlocked = ev.win && diff.unlock && profile.grant(diff.unlock) ? (TOWERS[diff.unlock].altOf ? `${TOWERS[diff.unlock].name} (${TOWERS[TOWERS[diff.unlock].altOf].name} variant)` : TOWERS[diff.unlock].name) : null;
          if (ev.win && diff.perk && profile.grantPerk(diff.perk)) unlocked = PERK_NAMES[diff.perk];
          if (opened && !unlocked) unlocked = `${DIFFICULTIES[opened].icon} ${DIFFICULTIES[opened].name} mode`; // every mode beaten: Hardcore is open
          else if (opened) unlocked += ` and ${DIFFICULTIES[opened].icon} ${DIFFICULTIES[opened].name} mode`;
          this.ui.showEnd(ev.win, st.wave.index + 1, this.session.mp, credits, shards, st.wave.total, st.mode, unlocked, gems, derrick);
          break;
        }
      }
    }
  }

  /** Create/update/remove views so they match the session state. */
  reconcile(realDt, gdt) {
    const st = this.state;
    if (!!st.timeWorld !== !!this.timeShown) this.showTimeWorld(st.timeWorld);
    // Beholder time bombs stuck to towers.
    this.bombViews ??= new Map();
    const bombs = st.bombs ?? [];
    for (const b of bombs) {
      let v = this.bombViews.get(b.id);
      if (!v) this.bombViews.set(b.id, (v = new BombView(this.scene, b)));
      v.sync(b, realDt);
    }
    for (const [id, v] of this.bombViews) {
      if (bombs.some((b) => b.id === id)) continue;
      v.dispose();
      this.bombViews.delete(id);
    }
    // Void mode: VOID's marks over towers and his magic missiles on the path.
    this.markViews ??= new Map();
    this.orbViews ??= new Map();
    this.syncList(this.markViews, st.marks ?? [], (k) => new MarkView(this.scene, k), realDt);
    this.syncList(this.orbViews, st.orbs ?? [], (o) => new OrbView(this.scene, o), realDt);
    // Gold Commander Orbital Airstrike beams.
    this.beamViews ??= new Map();
    this.syncList(this.beamViews, st.beams ?? [], (b) => new BeamView(this.scene, b), realDt);
    this.effects.setVoid(st.voidLevel ?? 0);
    for (const t of st.towers.values()) {
      let v = this.towerViews.get(t.id);
      if (!v) {
        v = new TowerView(this.scene, t, st.players.get(t.owner)?.color ?? 0x888888);
        this.towerViews.set(t.id, v);
        if (t.id === this.selectedId) v.setSelected(true);
      }
      v.sync(t, gdt);
      v.syncHp(t, this.camera);
    }
    for (const [id, v] of this.towerViews) {
      if (st.towers.has(id)) continue;
      if (id === this.selectedId) this.deselect();
      v.dispose();
      this.towerViews.delete(id);
    }

    let embers = false; // the Molten Warlord fills the sky with embers
    let armada = false; // the Overlord's starships darken the sky
    let chrono = false; // the Beholder turns the sky violet and fills it with clock dust
    let boss = null; // VOID, for the big health bar
    for (const e of st.enemies.values()) {
      let v = this.enemyViews.get(e.id);
      if (!v) {
        v = new EnemyView(this.scene, e);
        this.enemyViews.set(e.id, v);
        if (v.def.embers) {
          audio.waveStart();
          this.ui.toast(`🔥 ${v.def.name} has arrived! The world burns…`, 3500);
        } else if (v.def.jack) {
          // Halloween Jack laughs (his theme plays while he's alive, like every boss's: audio.musicGame).
          audio.laugh();
          this.shake(1, 2);
          this.ui.screenFlash('#ff6d00', 900);
          this.ui.banner('JACK', 'The Pumpkin King of Lantern Hill', 5000);
          this.ui.toast(v.def.intro, 6000);
        } else if (v.def.arrive) {
          // The False Void / VOID arrives: the world goes dark purple.
          const a = v.def.arrive;
          audio.waveStart();
          audio.boom(8);
          this.shake(1.6, 3);
          this.ui.screenFlash('#4a0072', 1500);
          this.ui.banner(a.title, a.sub, 5500);
          this.ui.toast(a.toast, 6000);
        } else if (v.def.intro && !this.introduced?.has(e.type)) {
          // Hard mode bosses announce themselves the first time they show up.
          (this.introduced ??= new Set()).add(e.type);
          audio.waveStart();
          this.ui.toast(v.def.intro, 3500);
        }
      }
      if (v.def.embers) embers = true;
      if (v.def.armada) armada = true;
      if (v.def.chrono) chrono = true;
      if (v.def.voidWorld && (!boss || v.def.voidWorld > (ENEMIES[boss.type].voidWorld ?? 0))) boss = e;
      else if (v.def.bar && (!boss || (!ENEMIES[boss.type].voidWorld && e.maxHp > boss.maxHp))) boss = e; // Hardcore bosses (the biggest one)
      v.sync(e, gdt, this.camera);
    }
    // VOID's health bar across the top of the screen.
    this.ui.bossBar(boss && !st.over ? {
      name: ENEMIES[boss.type].barName ?? ENEMIES[boss.type].name,
      sub: (ENEMIES[boss.type].barSub ?? '') + (boss.noTarget ? ' · can\'t be hurt right now' : ''),
      frac: boss.hp / boss.maxHp,
      // Void armor (wave 45 False Void), Hardcore shields (the local sim has raw amounts, snapshots shares).
      shield: (boss.vShieldMax ? boss.vShield / boss.vShieldMax : boss.vShield) || (boss.oshMax ? boss.osh / boss.oshMax : boss.osh) || 0,
      phase2: ENEMIES[boss.type].voidWorld > 1,
    } : null);
    this.effects.setEmbers(embers);
    this.effects.setArmada(armada);
    this.effects.setChrono(chrono);
    for (const t of st.towers.values()) this.towerViews.get(t.id)?.updateBeam(t, this.enemyViews);
    for (const u of st.units.values()) {
      let v = this.unitViews.get(u.id);
      if (v && v.kind !== u.model) {
        // A Gold Commander cyber tank turned into its ghost: rebuild it with the new look.
        v.dispose();
        v = null;
      }
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
      const lv = TOWERS[t.type].levels[t.level];
      if (lv.beamHeal) {
        // Medigun Medic: one beam to its patient (blue during Uber, red during Kritz).
        const pv = t.lock ? this.towerViews.get(t.lock) : null;
        const charge = t.active > 0 ? mediCharge(lv)?.key : null;
        this.towerViews.get(t.id)?.updateLinks(pv ? [pv] : [], charge === 'uberBeam' ? 'uber' : charge ? 'kritz' : false);
        continue;
      }
      if (!lv.shields) continue;
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
    this.ui.setBase(this.versus ? (this.me?.baseHp ?? 0) : st.baseHp, this.versus ? GAME.baseHp : difficulty(st.mode).baseHp ?? GAME.baseHp);
    this.ui.setWave(st, s.mp, this.spectating);
    this.ui.setSpeed(st.speed, s.isHost);
    if (st.versus) {
      this.ui.setVersusBoard(st.players, s.myId);
      this.ui.updateSend(this.myCash, st.wave, st.players.get(this.me?.target)?.name, this.spectating || this.ended);
    } else if (s.mp) this.ui.setScoreboard(st.players, s.myId);
    let boss = null;
    // The toughest boss gets the bar (the Beholder, not the Time Titans it summons).
    for (const e of st.enemies.values()) if (ENEMIES[e.type].boss && (e.lane ?? 0) === this.myLane && !(boss?.maxHp > e.maxHp)) boss = { ...e, def: ENEMIES[e.type] };
    this.ui.setBoss(boss);
    const counts = {};
    for (const t of st.towers.values()) if (t.owner === s.myId) counts[rootType(t.type)] = (counts[rootType(t.type)] || 0) + 1;
    this.ui.updateHotbar(this.myCash, counts, this.placing, this.spectating);
    this.ui.updateAbilityBar(this.abilityGroups(), this.myCash, this.spectating || this.ended);
    const sel = st.towers.get(this.selectedId);
    if (sel) {
      const borrowed = borrowsHidden(sel, spyCircles(st.towers.values()));
      const buffs = computeBuffs(st.towers.values());
      const buff = buffOf(buffs, sel.id);
      const def = TOWERS[sel.type];
      // Upgrade paths: what the next Top / Bottom upgrade costs (crosspath towers can have both).
      const upTop = nextUpgrade(sel, 'top', st.towers.values(), buffs);
      const upBot = nextUpgrade(sel, 'bottom', st.towers.values(), buffs);
      const upCost = upTop?.cost ?? (def.cross ? 0 : 0);
      const upCostB = upBot?.cost ?? 0;
      const aura = TOWERS[sel.type].levels[sel.level].aura ?? 0;
      let boosting = 0;
      if (TOWERS[sel.type].levels[sel.level].beamHeal) boosting = sel.lock ? 1 : 0;
      else if (TOWERS[sel.type].levels[sel.level].shields) {
        for (const m of medicShields(st.towers.values()).values()) if (m.id === sel.id) boosting++;
      } else for (const o of st.towers.values()) if (o.type !== sel.type && (o.x - sel.x) ** 2 + (o.z - sel.z) ** 2 <= aura * aura) boosting++;
      this.ui.updatePanel(sel, { myId: s.myId, cash: this.myCash, mp: s.mp, versus: this.versus, borrowed, buff, upCost, upCostB, upTop, upBot, boosting, upgradeLock: (type, next) => this.upgradeLock(type, next), ownerName: st.players.get(sel.owner)?.name ?? 'a player who left' });
      const smoked = sel.fx & 1 && !TOWERS[sel.type].kind && !TOWERS[sel.type].orbit;
      const r = ringRadius(sel.type, sel.level, buff, sel.x, sel.z) * (smoked ? VERSUS.smokeRange : 1);
      if (this.aiming) {
        // the aim ring is drawn by updateGhost
      } else if (facesCone(def)) this.showCone(sel.x, sel.z, r, sel.face ?? sel.yaw, def.levels[sel.level].cone, 0xffffff);
      else if (r > 0) this.showRing(def.heli ? sel.cx ?? sel.x : sel.x, def.heli ? sel.cz ?? sel.z : sel.z, r, 0xffffff, innerRings(sel.type, sel.level));
      else this.ring.visible = this.cone.visible = false;
    } else if (this.selectedSub) {
      const sub = this.selectedSub;
      const towerId = sub.kind === 'plane' ? sub.id : sub.kind === 'trap' ? st.traps?.get(sub.id)?.tower : st.units.get(sub.id)?.tower;
      const buff = towerId != null ? buffOf(computeBuffs(st.towers.values()), towerId) : null;
      const info = subInfo(st, sub, buff);
      if (!info) return this.deselect(); // it broke, died or was sold
      this.subRing = { range: info.range };
      this.ui.updateSubPanel(info, { myId: s.myId, mp: s.mp, ownerName: st.players.get(info.owner)?.name ?? 'a player who left' });
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
      if (k.has('ArrowUp')) cam.pitch = clamp(cam.pitch + dt * 1.2, CAM_PITCH_MIN, 1.4);
      if (k.has('ArrowDown')) cam.pitch = clamp(cam.pitch - dt * 1.2, CAM_PITCH_MIN, 1.4);
    }
    if (this.player) {
      const p = this.player.pos;
      cam.target.lerp({ x: p.x * WORLD_SCALE, y: p.y * WORLD_SCALE + 4, z: p.z * WORLD_SCALE }, Math.min(1, dt * 12));
    }
    const cp = Math.cos(cam.pitch);
    const cx = cam.target.x + Math.sin(cam.yaw) * cp * cam.dist;
    const cz = cam.target.z + Math.cos(cam.yaw) * cp * cam.dist;
    // The camera can swing all the way down to the ground (and look up a little), but never under it.
    const ground = heightAt(cx / WORLD_SCALE, cz / WORLD_SCALE) * WORLD_SCALE + CAM_GROUND_GAP;
    this.camera.position.set(cx, Math.max(ground, cam.target.y + Math.sin(cam.pitch) * cam.dist), cz);
    this.camera.lookAt(cam.target);
    if (this.shakeT > 0) {
      // VOID's slams, punches and arrival shake the camera.
      this.shakeT = Math.max(0, this.shakeT - dt);
      const a = this.shakeAmt * (this.shakeT / this.shakeMax);
      this.camera.position.x += (Math.random() - 0.5) * a;
      this.camera.position.y += (Math.random() - 0.5) * a;
      this.camera.position.z += (Math.random() - 0.5) * a;
    }
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
        else this.keys.add(e.code); // Combat Drone Direct Control: WASD flies it
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

