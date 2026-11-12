// The in-game client: renders the world, handles input, and mirrors a session's state.
// Works identically for solo (LocalSession) and multiplayer (NetSession).
//
// The GameClient class is too big for one file, so most of its methods live in game/:
//   events.js   handleEvents: shows what just happened in the sim (one case per event)
//   view.js     reconcile, the HUD and the camera
//   input.js    mouse and keys, picking, range rings, placing a tower
//   towers.js   the selected tower: upgrades, abilities, aiming, first-person mode
//   shared.js   small numbers and helpers those files use
// This file keeps starting and stopping a game, lighting and sky, Versus lanes, map pictures and
// the frame loop. The bottom of the file puts the parts' methods on GameClient.
import * as THREE from 'three';
import { GAME, TOWERS, VERSUS, difficulty, towerCost, towerLimit } from './config.js';
import { profile } from './profile.js';
import { buildTimeWorld, buildVersusLinks, buildWorld, versusWalkable } from './world.js';
import { Player, fitColliders } from './player.js';
import { makeNameTag } from './views.js';
import { Effects } from './effects.js';
import { audio } from './audio.js';
import { UI } from './ui.js';
import { towerIcon } from './icons.js';
import { WORLD_SCALE } from './scale.js';
import { BOUNDS, PLAYER_SPAWN, path, setTimeWorld } from './sim/path.js';
import {
  CASTLE, CLIFFS, MAP, brookWalkable, courtWalkable, emberWalkable, gridWalkable, laneOz, mapInfo, mapKey,
  mapVersion, nexusWalkable, rampartWalkable, rigWalkable, setMap,
} from './sim/map.js';
import { baseKey } from './sim/maps.js';
import { FR_STATE } from './frostworld.js';
import { GameEvents } from './game/events.js';
import { GameWheel } from './game/wheel.js';
import { GameContract } from './game/contract.js';
import { GameLiminal } from './game/liminal.js';
import { GamePhone } from './game/phone.js';
import { GameView } from './game/view.js';
import { GameInput } from './game/input.js';
import { GameTowers } from './game/towers.js';

// What the player bumps into and can stand on, shaped like the models drawn in world.js
// (MAP.obstacles is coarser: it's for tower placement and decoration spacing). Rebuilt for each map.
let CASTLE_COLLIDERS = [];
let LANE_COLLIDERS = [];
let PROP_COLLIDERS = []; // trees, rocks and the map's colliders: fitted to the drawn map by fitLane
function buildColliders() {
  CASTLE_COLLIDERS = mapInfo.nexus || mapInfo.base || mapInfo.court || mapInfo.ember || mapInfo.rampart || mapInfo.brook || mapInfo.rig ? [] : [ // Twilight Nexus has no castle; a map with its own `base` (cave, car, computer) has none; Shattered Court's castle is off the tiles
    { x: CASTLE.x, z: CASTLE.z, hx: 5, hz: 7, h: 10 }, // keep
    ...[-3, -1, 1, 3].flatMap((i) => [-4.4, 4.4].map((dx) => ({ x: CASTLE.x + dx, z: CASTLE.z + i * 2, hx: 0.6, hz: 0.8, h: 11.4 }))), // battlements
    ...[[-5, -7], [-5, 7], [5, -7], [5, 7]].flatMap(([dx, dz]) => [
      { x: CASTLE.x + dx, z: CASTLE.z + dz, hx: 1.7, hz: 1.7, h: 14 }, // corner towers
      { x: CASTLE.x + dx, z: CASTLE.z + dz, hx: 2, hz: 2, h: 16.4 }, // their roofs
    ]),
  ];
  const round = mapInfo.tree === 'round';
  PROP_COLLIDERS = [
    ...MAP.trees.flatMap(({ x, z, s }) =>
      round
        ? [
          { x, z, r: 2.3 * s, h: 6.9 * s, fixed: true }, // leaves (the player is taller than the trunk under them)
          { x, z, r: 1.5 * s, h: 8.6 * s, fixed: true }, // top tuft
        ]
        : [{ x, z, r: 0.9 * s, h: Infinity }], // pines, cacti, palms, crystals: their real height comes from fitLane
    ),
    ...MAP.rocks.map(({ x, z, s }) => ({ x, z, r: 0.9 * s, h: 1.3 * s })),
    ...MAP.colliders.map((c) => ({ ...c })),
  ];
  setLaneColliders();
}
/** LANE_COLLIDERS from the prop colliders, the castle and the cliffs. */
function setLaneColliders() {
  LANE_COLLIDERS = [
    ...PROP_COLLIDERS,
    ...CASTLE_COLLIDERS,
    ...CLIFFS.map((c) => ({ x: c.x, z: c.z, r: c.r, h: c.h })),
  ];
}
buildColliders();
/** Gives the prop colliders the heights of the map as drawn (`world`, from buildWorld). */
function fitLane(world) {
  PROP_COLLIDERS = fitColliders(PROP_COLLIDERS, world);
  setLaneColliders();
}
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
    this.ordering = null; // { cmd, id } while an order from the wheel waits for a spot on the ground (see wheel.js)
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
    fitLane(this.baseWorld);
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
    return Math.round(towerCost(TOWERS[type], this.versus) * (this.lmMod(type)?.cost ?? 1)); // (Liminal: a picked tower's blessing or curse)
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
    if (FR_STATE.spring) this.mapVersion = -1; // Frostwatch Basin turned to spring last game: rebuild it in winter
    if (this.mapVersion === mapVersion) return;
    this.mapVersion = mapVersion;
    buildColliders();
    this.scene.remove(this.baseWorld);
    this.baseWorld = buildWorld(this.scene);
    fitLane(this.baseWorld);
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
    // Purple night maps (Halloween Night 2): a very dark purple glow everywhere, lamps do the rest.
    if (t.purple) {
      this.sunOff = [-40, 120, -60];
      this.sun.color.set(0xa898d8);
      this.sun.intensity = 0.4;
      this.hemi.color.set(0x7a5aa8);
      this.hemi.groundColor.set(0x24162e);
      this.hemi.intensity = 0.95;
    }
    // Sandstorm dusk (Halloween Night 3): a low warm sun through orange haze, orange light everywhere.
    if (t.dusk) {
      this.sunOff = [-110, 55, 30];
      this.sun.color.set(0xffa860);
      this.sun.intensity = 0.75;
      this.hemi.color.set(0xd89050);
      this.hemi.groundColor.set(0x6a3a1a);
      this.hemi.intensity = 1.1;
    }
    // Frostwatch Basin: a dim cold night in winter, bright grey-teal overcast once spring comes.
    if (t.frost) {
      this.sunOff = [-50, 110, 40];
      const spring = FR_STATE.spring;
      this.sun.color.set(spring ? 0xf4f2e8 : 0xa8c0d8);
      this.sun.intensity = spring ? 1.9 : 0.7;
      this.hemi.color.set(spring ? 0xdfe8ea : 0x7a90a8);
      this.hemi.groundColor.set(spring ? 0x4e6a3e : 0x5a6470);
      this.hemi.intensity = spring ? 1.6 : 1.15;
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
    this.clearContract(); // Last Laugh: the jester, fences, the wheel window
    this.clearLiminal(); // Liminal: the pit, the tower pick window
    this.clearPhone(); // Mysterious Call: the ringing phone
    this.ihShown = false; // Inhuman: its warning shows again next game
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
    if (this.call) return this.call.frame(); // Mysterious Call: the haunted mansion has the screen (call/game.js)
    const s = this.session;
    // Music: the menu tracks, or in a game the map's track (a boss's own while it's alive).
    if (!s || this.ended || s.state.over) audio.musicMenu(s ? 2 : 0);
    else audio.musicGame(baseKey(mapKey), s.state.enemies.values());
    if (s) {
      const st = s.state;
      const gdt = st.over ? 0 : realDt * st.speed;
      if (this.fps) this.updateFps(realDt);
      if (!this.ended && !this.fps) {
        // Towers don't block players: you walk straight through them.
        this.player.update(realDt, this.ui.chatOpen ? new Set() : this.keys, this.cam.yaw, this.staticColliders);
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
}

// GameClient's methods are kept in several files (see the list at the top). This puts them all on
// GameClient, just as if they were written inside the class.
for (const part of [GameEvents, GameView, GameInput, GameTowers, GameWheel, GameContract, GameLiminal, GamePhone]) {
  const props = Object.getOwnPropertyDescriptors(part.prototype);
  delete props.constructor;
  Object.defineProperties(GameClient.prototype, props);
}

