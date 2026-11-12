import * as THREE from 'three';
import { bladePos } from './sim/sim.js';
import { MODEL_SCALE as K } from './scale.js';
import { heightAt } from './sim/map.js';
import { BEAM, BULLET, CubePool, StreakPool, TRAIL } from './particles.js';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
// Rings and glows are eight-sided: blocky, like everything else.
const ringGeo = new THREE.RingGeometry(0.78, 1, 8, 1, Math.PI / 8);
const discGeo = new THREE.CircleGeometry(1, 8, Math.PI / 8);
const puddleGeo = new THREE.CircleGeometry(1, 24);
const textCache = new Map();
const heliMat = new THREE.MeshLambertMaterial({ color: 0x263238 });
const rotorMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

function textTexture(str, color) {
  const key = str + color;
  if (textCache.has(key)) return textCache.get(key);
  // The canvas is as wide as the text (at least the old 256), so long names aren't cut off.
  const font = '900 64px "Arial Black", Arial, sans-serif';
  const c = document.createElement('canvas');
  const m = c.getContext('2d');
  m.font = font;
  c.width = Math.max(256, Math.ceil(m.measureText(str).width) + 24);
  c.height = 96;
  const g = c.getContext('2d'); // resizing the canvas resets its drawing state
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 10;
  g.strokeStyle = '#1b1b1b';
  g.strokeText(str, c.width / 2, 50);
  g.fillStyle = color;
  g.fillText(str, c.width / 2, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData.aspect = c.width / c.height;
  textCache.set(key, t);
  return t;
}

// ---------------------------------------------------------------- particle helpers
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[(Math.random() * list.length) | 0];
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();
const _e = new THREE.Vector3();
const _f = new THREE.Vector3();

/** A lighter (f > 1, towards white) or darker (f < 1) shade of a hex color. */
export function shade(hex, f) {
  let r = (hex >> 16) & 255;
  let g = (hex >> 8) & 255;
  let b = hex & 255;
  if (f <= 1) {
    r *= f; g *= f; b *= f;
  } else {
    const k = Math.min(1, (f - 1) / 1.2);
    r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k;
  }
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

// Shared particle settings (see DEF in particles.js).
const HALO = { out: 0, mid: 0.3 }; // light: fades by going dark, never shrinks
const CORE = { out: 0.3, mid: 0.4 }; // the white-hot block at the heart of a flash
const MUZZLE = { out: 0.5, mid: 0.45, spin: 0 };
const TRAIL_FIRE = { drag: 2, spin: 6, out: 0.8 };
const TRAIL_SMOKE = { drag: 1.5, grav: -1.2, spin: 1.5, in: 0.15, out: 0.55, grow: 2 };
const STATUS_UP = { drag: 1, spin: 5, out: 0.5, mid: 0.3 };
const STATUS_DRIFT = { drag: 1, spin: 4, out: 0.6 };
const STATUS_BUBBLE = { drag: 1.2, spin: null, in: 0.2, out: 0.15 };
const STATUS_DRIP = { grav: 22, spin: 2, out: 0.5 };
const FIRE = [0xfff59d, 0xff9100, 0x7f1d0a];
const SOOT = [0x8a827b, 0x5c5550];
const FIRES = [[0xfffde7, 0xffc400, 0x8a2a0a], [0xfff59d, 0xff9100, 0x7f1d0a], [0xffe082, 0xff5a1f, 0x5a1408], [0xffcc80, 0xf4511e, 0x3e2723]];
const SMOKE = [0xbdbdbd, 0x9e9e9e, 0x8a8a8a];
const DEBRIS = [0x4e342e, 0x3e3a36, 0x6d5d52];
const ICE = [0xb3e5fc, 0x81d4fa, 0xe1f5fe];
const PAINT = [0xff1744, 0x2979ff, 0xffea00, 0x00e676, 0xd500f9, 0xff9100];
const RAINBOW = [0xff1744, 0xffea00, 0x00e5ff, 0x76ff03, 0xff4081];

// Projectile bodies share their materials (one per color, kept for good).
const litMats = new Map();
const glowMats = new Map();
function litMat(color) {
  let m = litMats.get(color);
  if (!m) litMats.set(color, (m = new THREE.MeshLambertMaterial({ color })));
  return m;
}
function glowMat(color) {
  let m = glowMats.get(color);
  if (!m) glowMats.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}
function block(parent, mat, sx, sy, sz, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(unitBox, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/** The game's effects, so views can reach them without being handed them (status particles). */
export let FX = null;

/** Short-lived visual effects: tracers, muzzle flashes, explosions, debris, floating text. */
export class Effects {
  /** scene: where effects go (the scaled map group); sky: the THREE.Scene whose sky and fog tint. */
  constructor(scene, sky = scene) {
    this.scene = scene;
    this.sky = sky;
    this.items = [];
    this.emberK = 0; // 0..1: how strongly the Molten Warlord's embers fill the world
    this.emberOn = false;
    this.armadaK = 0; // 0..1: how much the Overlord's starships cover the sky
    this.armadaOn = false;
    // Blocky particles (particles.js): shaded solids, full-bright cubes, light, and streaks.
    this.lit = new CubePool(scene, 'lit', 3500);
    this.glow = new CubePool(scene, 'glow', 3500);
    this.halo = new CubePool(scene, 'add', 500);
    this.streaks = new StreakPool(scene, 'glow', 900);
    this.streakHalo = new StreakPool(scene, 'add', 900);
    this.timers = [];
    this.frame = 0;
    this.onShake = null; // (time, amount): set by the game to shake the camera
    this._lt = new THREE.Vector3(); // where the last tracer left from, its direction and frame
    this._ld = new THREE.Vector3(0, 0, 1);
    this._lf = -1;
    FX = this;
  }

  /** The Overlord's armada: starships drift across the sky and the world grows dark. */
  setArmada(on) {
    this.armadaOn = on;
    if (!on || this.armada) return;
    const g = new THREE.Group();
    const hullMat = new THREE.MeshLambertMaterial({ color: 0x37474f, transparent: true, opacity: 0 });
    const trimMat = new THREE.MeshLambertMaterial({ color: 0xcfd8dc, transparent: true, opacity: 0 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff4081, transparent: true, opacity: 0 });
    const box = (parent, mat, w, h, d, x, y, z) => {
      const m = new THREE.Mesh(unitBox, mat);
      m.scale.set(w, h, d);
      m.position.set(x, y, z);
      parent.add(m);
    };
    this.ships = [];
    for (let i = 0; i < 9; i++) {
      const ship = new THREE.Group();
      const big = i % 3 === 0;
      const s = big ? 2.2 : 1 + Math.random() * 0.5;
      box(ship, hullMat, 4, 1.4, 16, 0, 0, 0); // hull
      box(ship, hullMat, 14, 0.5, 5, 0, 0, -2); // wings
      box(ship, trimMat, 3, 1.2, 4, 0, 1, 2); // bridge
      box(ship, trimMat, 1, 0.6, 10, 0, 0.9, -3);
      for (const x of [-5, 0, 5]) box(ship, glowMat, 1.6, 0.8, 0.6, x, 0, -8.3); // engines
      for (const x of [-6.5, 6.5]) box(ship, glowMat, 0.6, 0.3, 4, x, 0.2, -2);
      ship.scale.setScalar(s);
      ship.position.set(-160 + Math.random() * 320, 45 + Math.random() * 25, -100 + Math.random() * 200);
      ship.rotation.y = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      ship.userData.speed = (big ? 2 : 3.5) + Math.random() * 2;
      g.add(ship);
      this.ships.push(ship);
    }
    this.armada = g;
    this.armadaMats = [hullMat, trimMat, glowMat];
    this.scene.add(g);
    this.armadaSky = this.sky.background?.clone?.() ?? null;
    this.armadaFog = this.sky.fog?.color.clone() ?? null;
    this.armadaLights = [];
    this.sky.traverse((o) => {
      if (o.isLight) this.armadaLights.push([o, o.intensity]);
    });
  }

  updateArmada(dt) {
    if (!this.armada) return;
    this.armadaK = Math.max(0, Math.min(1, this.armadaK + (this.armadaOn ? dt / 3 : -dt / 3)));
    const k = this.armadaK;
    const night = new THREE.Color(0x0b0f24);
    if (this.armadaSky) this.sky.background.copy(this.armadaSky).lerp(night, k * 0.85);
    if (this.armadaFog) this.sky.fog.color.copy(this.armadaFog).lerp(night, k * 0.85);
    for (const [light, base] of this.armadaLights) light.intensity = base * (1 - 0.55 * k);
    for (const m of this.armadaMats) m.opacity = k;
    if (k <= 0) {
      this.scene.remove(this.armada);
      for (const m of this.armadaMats) m.dispose();
      for (const [light, base] of this.armadaLights) light.intensity = base;
      this.armada = null;
      return;
    }
    for (const ship of this.ships) {
      ship.position.x += ship.userData.speed * dt;
      if (ship.position.x > 170) ship.position.x = -170;
    }
  }

  /** The Beholder: violet sky and slowly falling gold and violet clock dust while it's alive. */
  setChrono(on) {
    this.chronoOn = on;
    if (on) this.makeChrono();
  }

  /** The time dimension: an even darker violet sky (and the clock dust) for as long as it lasts. */
  setChronoWorld(on) {
    this.chronoWorld = on;
    if (on) this.makeChrono();
  }

  makeChrono() {
    if (this.chronoPts) return;
    const N = 700;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const gold = new THREE.Color(0xffd740);
    const violet = new THREE.Color(0xb388ff);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = -130 + Math.random() * 260;
      pos[i * 3 + 1] = Math.random() * 40;
      pos[i * 3 + 2] = -90 + Math.random() * 180;
      (i % 3 ? violet : gold).toArray(col, i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.chronoMat = new THREE.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    this.chronoPts = new THREE.Points(geo, this.chronoMat);
    this.chronoPts.frustumCulled = false;
    this.scene.add(this.chronoPts);
    this.chronoK = 0;
    this.chronoSky = this.sky.background?.clone?.() ?? null;
    this.chronoFog = this.sky.fog?.color.clone() ?? null;
  }

  updateChrono(dt) {
    if (!this.chronoPts) return;
    const on = this.chronoOn || this.chronoWorld;
    this.chronoK = Math.max(0, Math.min(1, this.chronoK + (on ? dt / 2 : -dt / 2)));
    const k = this.chronoK;
    this.chronoMat.opacity = 0.85 * k;
    const tint = new THREE.Color(this.chronoWorld ? 0x140a2b : 0x4a2a7a);
    const mix = this.chronoWorld ? 0.95 : 0.7;
    if (this.chronoSky) this.sky.background.copy(this.chronoSky).lerp(tint, k * mix);
    if (this.chronoFog) this.sky.fog.color.copy(this.chronoFog).lerp(tint, k * mix);
    if (k <= 0) {
      this.scene.remove(this.chronoPts);
      this.chronoPts.geometry.dispose();
      this.chronoMat.dispose();
      this.chronoPts = null;
      return;
    }
    // Clock dust falls slowly and drifts in little circles.
    const a = this.chronoPts.geometry.attributes.position;
    const p = a.array;
    const t = performance.now() / 1000;
    for (let i = 0; i < p.length / 3; i++) {
      p[i * 3 + 1] -= dt * (0.6 + (i % 5) * 0.2);
      p[i * 3] += Math.cos(t * 0.7 + i) * dt * 0.8;
      p[i * 3 + 2] += Math.sin(t * 0.7 + i) * dt * 0.8;
      if (p[i * 3 + 1] < 0) p[i * 3 + 1] = 40;
    }
    a.needsUpdate = true;
  }

  /**
   * VOID: the world turns dark purple while he's alive (level 1), even darker for his spirit form
   * (level 2). Void motes rise from the ground everywhere and the lights dim.
   */
  setVoid(level) {
    this.voidLevel = level;
    if (level && !this.voidPts) {
      const N = 900;
      const pos = new Float32Array(N * 3);
      const col = new Float32Array(N * 3);
      const pink = new THREE.Color(0xff1744);
      const violet = new THREE.Color(0xd500f9);
      const deep = new THREE.Color(0x651fff);
      for (let i = 0; i < N; i++) {
        pos[i * 3] = -130 + Math.random() * 260;
        pos[i * 3 + 1] = Math.random() * 35;
        pos[i * 3 + 2] = -90 + Math.random() * 180;
        (i % 3 === 0 ? pink : i % 3 === 1 ? violet : deep).toArray(col, i * 3);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      this.voidMat = new THREE.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      this.voidPts = new THREE.Points(geo, this.voidMat);
      this.voidPts.frustumCulled = false;
      this.scene.add(this.voidPts);
      this.voidK = 0;
      this.voidSky = this.sky.background?.clone?.() ?? null;
      this.voidFog = this.sky.fog?.color.clone() ?? null;
      this.voidLights = [];
      this.sky.traverse((o) => {
        if (o.isLight) this.voidLights.push([o, o.intensity]);
      });
    }
  }

  updateVoid(dt) {
    if (!this.voidPts) return;
    // voidK eases toward the level (0, 1 or 2) over a couple of seconds.
    const goal = this.voidLevel || 0;
    this.voidK += Math.sign(goal - this.voidK) * Math.min(Math.abs(goal - this.voidK), dt / 2.5);
    const k = this.voidK;
    this.voidMat.opacity = Math.min(1, k) * 0.9;
    const tint = new THREE.Color(k > 1 ? 0x07020c : 0x1e0730);
    const mix = Math.min(1, k) * 0.92 + Math.max(0, k - 1) * 0.08;
    if (this.voidSky) this.sky.background.copy(this.voidSky).lerp(tint, mix);
    if (this.voidFog) this.sky.fog.color.copy(this.voidFog).lerp(tint, mix);
    for (const [light, base] of this.voidLights) light.intensity = base * (1 - 0.45 * Math.min(1, k) - 0.25 * Math.max(0, k - 1));
    if (k <= 0) {
      this.scene.remove(this.voidPts);
      this.voidPts.geometry.dispose();
      this.voidMat.dispose();
      this.voidPts = null;
      for (const [light, base] of this.voidLights) light.intensity = base;
      if (this.voidSky) this.sky.background.copy(this.voidSky);
      if (this.voidFog) this.sky.fog.color.copy(this.voidFog);
      return;
    }
    // Void motes rise from the ground and wobble.
    const a = this.voidPts.geometry.attributes.position;
    const p = a.array;
    const t = performance.now() / 1000;
    for (let i = 0; i < p.length / 3; i++) {
      p[i * 3 + 1] += dt * (0.8 + (i % 7) * 0.25) * (k > 1 ? 1.6 : 1);
      p[i * 3] += Math.sin(t * 1.3 + i) * dt * 0.6;
      if (p[i * 3 + 1] > 35) p[i * 3 + 1] = 0;
    }
    a.needsUpdate = true;
  }

  /** VOID's sky laser: a huge beam that sweeps along every point of the track. */
  skyLaser(points, time = 1.6) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xff1744, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
    const core = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false });
    const g = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 120, 12, 1, true), mat);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 120, 8, 1, true), core);
    beam.position.y = inner.position.y = 60;
    g.add(beam, inner);
    let last = 0;
    this.add(g, time + 0.3, mat, (it, f) => {
      const u = Math.min(1, (1 - f) * ((time + 0.3) / time));
      const i = Math.min(points.length - 1, Math.floor(u * (points.length - 1)));
      g.position.copy(points[i]);
      mat.opacity = 0.85 * Math.min(1, f * 4);
      core.opacity = 0.9 * Math.min(1, f * 4);
      if (i !== last && i % 3 === 0) this.pulse(points[i].clone().setY(0.3), 4, 0.4, 0xff1744);
      last = i;
    });
    this.items[this.items.length - 1].extra = [core, beam.geometry, inner.geometry];
  }

  /** The Molten Warlord's embers: orange sparks drifting up everywhere, and an orange sky. */
  setEmbers(on) {
    this.emberOn = on;
    if (!on || this.emberPts) return;
    const N = 900;
    const pos = new Float32Array(N * 3);
    this.emberVel = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = -130 + Math.random() * 260;
      pos[i * 3 + 1] = Math.random() * 40;
      pos[i * 3 + 2] = -90 + Math.random() * 180;
      this.emberVel[i * 2] = 1.5 + Math.random() * 3; // rise speed
      this.emberVel[i * 2 + 1] = Math.random() * Math.PI * 2; // sway phase
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.emberMat = new THREE.PointsMaterial({ color: 0xff8a1e, size: 0.55, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    this.emberPts = new THREE.Points(geo, this.emberMat);
    this.emberPts.frustumCulled = false;
    this.scene.add(this.emberPts);
    this.skyBase = this.sky.background?.clone?.() ?? null;
    this.fogBase = this.sky.fog?.color.clone() ?? null;
  }

  updateEmbers(dt) {
    if (!this.emberPts) return;
    this.emberK = Math.max(0, Math.min(1, this.emberK + (this.emberOn ? dt / 2 : -dt / 3)));
    const k = this.emberK;
    this.emberMat.opacity = 0.9 * k;
    const sky = new THREE.Color(0x8a3a12);
    if (this.skyBase) this.sky.background.copy(this.skyBase).lerp(sky, k * 0.75);
    if (this.fogBase) this.sky.fog.color.copy(this.fogBase).lerp(sky, k * 0.75);
    if (k <= 0) {
      this.scene.remove(this.emberPts);
      this.emberPts.geometry.dispose();
      this.emberMat.dispose();
      this.emberPts = null;
      return;
    }
    const a = this.emberPts.geometry.attributes.position;
    const p = a.array;
    const v = this.emberVel;
    const t = performance.now() / 1000;
    for (let i = 0; i < v.length / 2; i++) {
      p[i * 3 + 1] += v[i * 2] * dt;
      p[i * 3] += Math.sin(t + v[i * 2 + 1]) * dt * 1.2;
      if (p[i * 3 + 1] > 40) p[i * 3 + 1] = 0;
    }
    a.needsUpdate = true;
  }

  /** The Molten Warlord's battleaxe, spinning end over end from `from` to `to`. */
  axe(from, to, time) {
    const g = new THREE.Group();
    const handleMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 });
    const bladeMat = new THREE.MeshLambertMaterial({ color: 0x455a64, emissive: 0xff3d00, emissiveIntensity: 0.6 });
    const handle = new THREE.Mesh(unitBox, handleMat);
    handle.scale.set(0.5, 7, 0.5);
    const blade = new THREE.Mesh(unitBox, bladeMat);
    blade.scale.set(3.2, 2.6, 0.35);
    blade.position.set(1.4, 2.6, 0);
    g.add(handle, blade);
    g.scale.setScalar(K);
    const start = from.clone();
    const yaw = Math.atan2(to.x - from.x, to.z - from.z);
    this.add(g, time, null, (it, k) => {
      const f = 1 - k;
      g.position.lerpVectors(start, to, f);
      g.position.y += Math.sin(f * Math.PI) * 10;
      g.rotation.set(f * Math.PI * 6, yaw, 0, 'YXZ');
    });
    // `add` disposes one material; free the other when the axe lands.
    const it = this.items[this.items.length - 1];
    it.extra = [handleMat, bladeMat];
  }

  add(obj, life, mat, update) {
    this.scene.add(obj);
    this.items.push({ obj, life, max: life, mat, update });
  }


  // ================================================================ blocky effects (Visuals 2.0 part 3)
  // Everything below is built from the cube and streak pools in particles.js: one draw call per
  // pool, nothing see-through except light (the `halo` pools), and cubes that shrink instead of fading.

  /** How many particles to really use when an effect wants `count`: fewer while the pools are busy. */
  n(count) {
    const l = Math.max(this.lit.load, this.glow.load);
    return Math.max(1, Math.round(count * (l < 0.35 ? 1 : l < 0.65 ? 0.6 : 0.3)));
  }

  /** Runs `fn` after `delay` seconds (staged effects: a boss blowing up bit by bit). */
  later(delay, fn) {
    this.timers.push({ t: delay, fn });
  }

  /** Asks the game to shake the camera (GameClient sets `onShake`). */
  shake(time, amount) {
    this.onShake?.(time, amount);
  }

  /** Glowing shards flying out of `pos`. dir: their main direction (spread 0..1 around it). */
  sparks(pos, color = 0xffd54f, count = 6, power = 12, dir = null, spread = 1, delay = 0) {
    count = this.n(count);
    const hot = shade(color, 1.7);
    const o = { grav: 26, drag: 1.5, spin: 12, floor: heightAt(pos.x, pos.z), out: 0.6, mid: 0.3, az: 2.4, delay };
    for (let i = 0; i < count; i++) {
      let vx = rnd(-1, 1);
      let vy = rnd(-0.2, 1);
      let vz = rnd(-1, 1);
      if (dir) {
        vx = dir.x + vx * spread;
        vy = dir.y + vy * spread + 0.25;
        vz = dir.z + vz * spread;
      }
      const sp = power * rnd(0.45, 1.2);
      this.glow.spawn(pos.x, pos.y, pos.z, vx * sp, vy * sp, vz * sp, rnd(0.18, 0.42), rnd(0.1, 0.2) * K, 0.05 * K, 0xffffff, hot, color, o);
    }
  }

  /** A flat blocky ring racing outwards along the ground (shockwaves, pulses). */
  shock(pos, radius, color = 0xffcc80, time = 0.4, y = null, opacity = 0.8) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.rotation.z = Math.random() * 0.8;
    ring.position.copy(pos).setY(y ?? heightAt(pos.x, pos.z) + 0.35);
    ring.scale.setScalar(0.01);
    this.add(ring, time, mat, (it, k) => {
      const f = 1 - k * k; // fast at first, slowing down
      ring.scale.setScalar(Math.max(0.05, radius * f));
      mat.opacity = opacity * Math.min(1, k * 1.6);
    });
  }

  /** Light thrown on the ground by a blast: a flat glowing patch that dies away. */
  groundGlow(pos, radius, color = 0xffa726, time = 0.35) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending });
    const m = new THREE.Mesh(discGeo, mat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = Math.random() * 0.8;
    m.position.copy(pos).setY(heightAt(pos.x, pos.z) + 0.22);
    m.scale.setScalar(radius);
    this.add(m, time, mat, (it, k) => {
      mat.opacity = 0.32 * k * k;
      m.scale.setScalar(radius * (1.15 - k * 0.15));
    });
  }

  /** Dust kicked up in a ring: cubes sliding out along the ground to `radius`. */
  dustRing(pos, radius, color = 0xa1958a, count = 12) {
    count = this.n(count);
    const floor = heightAt(pos.x, pos.z);
    const dark = shade(color, 0.75);
    const o = { drag: 3.6, grav: 3, spin: 2, floor, in: 0.1, out: 0.6, grow: 2 };
    const a0 = Math.random() * 6.28;
    for (let i = 0; i < count; i++) {
      const a = a0 + (i / count) * 6.28 + rnd(-0.2, 0.2);
      const v = radius * 3.6 * rnd(0.75, 1.1);
      const s = Math.min(1.4, 0.3 + radius * 0.07) * rnd(0.7, 1.3) * K;
      this.lit.spawn(pos.x + Math.cos(a) * 0.4, floor + 0.3, pos.z + Math.sin(a) * 0.4, Math.cos(a) * v, rnd(0.5, 2.2), Math.sin(a) * v, rnd(0.45, 0.8), s * 0.5, s * 1.5, color, color, dark, o);
    }
  }

  /** A burn mark (or goo, frost, paint) left on the ground for `life` seconds: a few flat slabs. */
  scorch(pos, radius, color = 0x4a4038, life = 6) {
    if (this.lit.load > 0.6) return;
    const floor = heightAt(pos.x, pos.z);
    if (floor < -2) return; // out over the sea or the void
    for (let i = 0; i < 3; i++) {
      const s = radius * (i ? rnd(0.45, 0.8) : 1.1);
      const d = i ? radius * 0.55 : 0;
      const a = Math.random() * 6.28;
      this.lit.spawn(pos.x + Math.cos(a) * d, floor + 0.06 + i * 0.02 + Math.random() * 0.02, pos.z + Math.sin(a) * d, 0, 0, 0, life * rnd(0.8, 1.1), s, s, color, color, color,
        { yaw: Math.random() * 1.57, ay: 0.05 / s, in: 0.012, out: 0.3 });
    }
  }

  /** A short blink of light: a white-hot block inside a soft glow, throwing a few shards. */
  flash(pos, color = 0xfff3b0, size = 0.7) {
    // Right after a tracer from the same spot it's a gun firing: a muzzle flash along the shot.
    if (this._lf === this.frame && pos.distanceToSquared(this._lt) < 1e-4) return this.muzzle(pos, this._ld, color, size);
    const s = size * K;
    const hot = shade(color, 1.7);
    this.halo.spawn(pos.x, pos.y, pos.z, 0, 0, 0, 0.13, s * 2, s * 1.2, color, shade(color, 0.7), 0x000000, HALO);
    this.glow.spawn(pos.x, pos.y, pos.z, 0, 0, 0, 0.09, s * 1.1, s * 0.5, 0xffffff, hot, color, CORE);
    const o = { drag: 3, spin: 10, out: 0.7, az: 2 };
    for (let i = this.n(Math.min(6, 2 + Math.round(size * 1.5))); i > 0; i--) {
      const v = (4 + size * 5) * rnd(0.6, 1.2);
      _a.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize();
      this.glow.spawn(pos.x, pos.y, pos.z, _a.x * v, _a.y * v, _a.z * v, rnd(0.12, 0.24), s * 0.3, s * 0.08, hot, color, color, o);
    }
  }

  /** Muzzle flash: a blocky star of fire along `dir`, sparks and a wisp of gun smoke. */
  muzzle(pos, dir, color = 0xfff3b0, size = 0.7) {
    const s = size * K;
    const hot = 0xfffde7;
    // Pale "bullet" colors burn as fire; a colored shot (laser, plasma, frost) keeps its own color.
    const r = color >> 16;
    const g = (color >> 8) & 255;
    const b = color & 255;
    const warm = r > 200 && g > 150 && b < 215;
    const mid = warm ? 0xffd740 : shade(color, 1.25);
    const deep = warm ? 0xff8f00 : shade(color, 0.8);
    // The flame out of the barrel: three blocks, each smaller and redder than the last.
    for (let i = 0; i < 3; i++) {
      const d = s * (0.35 + i * 0.75);
      const w = s * (0.85 - i * 0.24) * rnd(0.85, 1.15);
      this.glow.spawn(pos.x + dir.x * d, pos.y + dir.y * d, pos.z + dir.z * d, dir.x * 6, dir.y * 6, dir.z * 6, 0.075 + i * 0.012, w, w * 0.45, i ? mid : 0xffffff, i ? mid : hot, deep, MUZZLE);
    }
    this.streaks.spawn(pos, _a.copy(pos).addScaledVector(dir, s * 3.3), BEAM, s * 0.38, hot, mid, { fade: 0.07 });
    // Four short spikes across it.
    _b.set(dir.z, 0, -dir.x);
    if (_b.lengthSq() < 1e-4) _b.set(1, 0, 0);
    _b.normalize();
    _c.crossVectors(dir, _b);
    for (let i = 0; i < 4; i++) {
      const v = i < 2 ? _b : _c;
      const len = s * (i < 2 ? 1.3 : 1.05) * (i % 2 ? -1 : 1);
      _d.copy(pos).addScaledVector(dir, s * 0.3);
      this.streaks.spawn(_d, _a.copy(_d).addScaledVector(v, len).addScaledVector(dir, s * 0.55), BEAM, s * 0.3, mid, deep, { fade: 0.065 });
    }
    this.halo.spawn(pos.x + dir.x * s * 0.6, pos.y + dir.y * s * 0.6, pos.z + dir.z * s * 0.6, 0, 0, 0, 0.09, s * 1.9, s * 1.1, deep, deep, 0x000000, HALO);
    this.sparks(pos, warm ? 0xffc400 : color, size > 1 ? 4 : 2, 14 + size * 6, dir, 0.35);
    if (Math.random() < 0.55 && this.lit.load < 0.5) {
      const c = pick(SMOKE);
      this.lit.spawn(pos.x + dir.x * s * 0.6, pos.y + dir.y * s * 0.6, pos.z + dir.z * s * 0.6, dir.x * 2.5, dir.y * 2.5 + 1.4, dir.z * 2.5, rnd(0.45, 0.8), s * 0.4, s * (0.9 + size * 0.3), c, c, shade(c, 0.8),
        { drag: 2.6, grav: -1.6, spin: 1.5, in: 0.15, out: 0.6 });
    }
  }

  /** A spent brass shell flipping out of a gun at `pos`, thrown to the side (`yaw` = where the gun points). */
  casing(pos, yaw, size = 1) {
    if (this.lit.load > 0.5) return;
    const side = yaw - Math.PI / 2 + rnd(-0.4, 0.4);
    const v = rnd(3.5, 6);
    this.lit.spawn(pos.x, pos.y, pos.z, Math.sin(side) * v, rnd(5, 8), Math.cos(side) * v, rnd(0.9, 1.3), 0.13 * size * K, 0.13 * size * K, 0xffca28, 0xd4a017, 0x8d6e1f,
      { grav: 30, spin: 18, floor: heightAt(pos.x, pos.z), bounce: 0.45, out: 0.2, az: 2.3 });
  }

  /** A bullet (thin) or a rail / laser shot (width over 0.2) from `from` to `to`. */
  tracer(from, to, color = 0xffe066, width = 0.14) {
    width *= K;
    const dist = from.distanceTo(to);
    this._ld.subVectors(to, from);
    if (dist > 1e-5) this._ld.divideScalar(dist);
    this._lt.copy(from);
    this._lf = this.frame;
    const hot = shade(color, 1.6);
    if (width > 0.2 * K) {
      // A beam: a white-hot core in a wide glow that thins out, with motes drifting off it.
      this.streaks.spawn(from, to, BEAM, width * 0.9, 0xffffff, hot, { fade: 0.3 });
      this.streakHalo.spawn(from, to, BEAM, width * 3.4, color, 0x000000, { fade: 0.42 });
      const n = this.n(Math.min(14, Math.round(dist / 2.2)));
      const o = { drag: 2, spin: 6, out: 0.8 };
      for (let i = 0; i < n; i++) {
        _a.lerpVectors(from, to, (i + Math.random()) / n);
        this.glow.spawn(_a.x, _a.y, _a.z, rnd(-1.5, 1.5), rnd(-0.5, 2), rnd(-1.5, 1.5), rnd(0.25, 0.5), width * rnd(0.6, 1.1), 0.02, hot, color, color, o);
      }
      this.halo.spawn(to.x, to.y, to.z, 0, 0, 0, 0.16, width * 9, width * 4, color, color, 0x000000, HALO);
      this.sparks(to, color, 7, 12, _b.copy(this._ld).negate(), 0.9);
      return;
    }
    // A bullet: a bright slug crossing in a blink, a thin line of light behind it, sparks where it lands.
    const travel = Math.min(0.1, Math.max(0.03, dist / 320));
    this.streaks.spawn(from, to, BULLET, width * 1.5, hot, hot, { travel, len: Math.min(dist, 3.6) });
    this.streakHalo.spawn(from, to, TRAIL, width * 1.7, color, 0x000000, { travel, fade: 0.17 });
    if (this.glow.load < 0.6) this.sparks(to, color, 3, 9, _b.copy(this._ld).negate(), 0.8, travel);
  }

  /** Blocky debris burst. */
  puff(pos, color, count = 8, size = 0.5, power = 8) {
    size *= K;
    count = this.n(count);
    const floor = heightAt(pos.x, pos.z);
    const dark = shade(color, 0.7);
    const o = { grav: 30, spin: 8, floor, bounce: 0.3, out: 0.5 };
    for (let i = 0; i < count; i++) {
      const s = size * rnd(0.6, 1.4);
      const c = i % 3 === 0 ? shade(color, 1.18) : i % 3 === 1 ? color : dark;
      this.lit.spawn(pos.x, pos.y, pos.z, rnd(-0.5, 0.5) * power, power * rnd(0.5, 1.5), rnd(-0.5, 0.5) * power, rnd(0.5, 0.9), s, s, c, c, c, o);
    }
    // Finer grit around the big pieces.
    for (let i = this.n(Math.ceil(count / 2)); i > 0; i--) {
      const s = size * rnd(0.25, 0.45);
      this.lit.spawn(pos.x, pos.y, pos.z, rnd(-0.7, 0.7) * power, power * rnd(0.3, 1.2), rnd(-0.7, 0.7) * power, rnd(0.35, 0.7), s, s, color, color, dark, o);
    }
  }

  /** A ball of fire cubes boiling outwards: the heart of every explosion. */
  fireball(pos, radius, count, colors = FIRE, delay = 0) {
    count = this.n(count);
    const o = { drag: 4.2, grav: -3.5, spin: 3, in: 0.12, out: 0.55, mid: 0.35, grow: 3, delay };
    for (let i = 0; i < count; i++) {
      _a.set(rnd(-1, 1), rnd(-0.35, 1), rnd(-1, 1)).normalize();
      const v = radius * rnd(2, 5.5);
      const s = radius * rnd(0.28, 0.62);
      const d = radius * 0.3 * Math.random();
      const c = colors === FIRE ? FIRES[i & 3] : colors;
      this.glow.spawn(pos.x + _a.x * d, pos.y + _a.y * d, pos.z + _a.z * d, _a.x * v, _a.y * v, _a.z * v, rnd(0.34, 0.72), s * 0.6, s * 1.4, c[0], c[1], c[2], o);
    }
  }

  /** Dark smoke rolling up out of `pos`. */
  smokePuff(pos, radius, count, delay = 0.1, colors = SOOT) {
    if (this.lit.load > 0.55) return;
    count = this.n(count);
    const o = { drag: 2.2, grav: -3.2, spin: 1.2, in: 0.2, out: 0.5, grow: 2, delay };
    for (let i = 0; i < count; i++) {
      const a = Math.random() * 6.28;
      const v = radius * rnd(0.4, 1.6);
      const s = radius * rnd(0.3, 0.55);
      o.delay = delay + Math.random() * 0.15;
      this.lit.spawn(pos.x, pos.y + radius * 0.2, pos.z, Math.cos(a) * v, radius * rnd(0.8, 2.2), Math.sin(a) * v, rnd(0.8, 1.5), s * 0.6, s * 1.5, colors[0], colors[1], colors[1], o);
    }
  }

  /** White flash, fireball, shockwave, flying debris, sparks, smoke and a burn mark. */
  explosion(pos, radius) {
    const floor = heightAt(pos.x, pos.z);
    const p = _e.copy(pos);
    if (p.y < floor + 0.3) p.y = floor + 0.3;
    const low = p.y - floor < 3.5; // close enough to the ground to mark it
    const cy = p.y + radius * 0.25;
    // The first frame: a white-hot block and a wash of light.
    this.glow.spawn(p.x, cy, p.z, 0, 0, 0, 0.1, radius * 0.9, radius * 1.3, 0xffffff, 0xfff59d, 0xffb300, CORE);
    this.halo.spawn(p.x, cy, p.z, 0, 0, 0, 0.16, radius * 1.7, radius * 2.3, 0xa86a2a, 0x7a3c08, 0x000000, HALO);
    _f.set(p.x, cy, p.z);
    this.fireball(_f, radius, Math.min(30, 9 + radius * 3.2));
    this.smokePuff(_f, radius, Math.min(14, 5 + radius * 1.6));
    this.sparks(_f, 0xffb300, Math.min(14, 5 + radius * 1.5), 9 + radius * 2.2);
    // Chunks thrown high that bounce where they land; a few are still glowing.
    const chunks = this.n(Math.min(12, 3 + radius * 1.6));
    const o = { grav: 32, spin: 10, floor, bounce: 0.35, out: 0.3 };
    for (let i = 0; i < chunks; i++) {
      const a = Math.random() * 6.28;
      const v = radius * rnd(1.2, 3.2) + 2;
      const s = Math.min(0.9, 0.22 + radius * 0.06) * rnd(0.6, 1.3) * K;
      if (i % 3 === 0) this.glow.spawn(p.x, cy, p.z, Math.cos(a) * v, rnd(8, 15) + radius, Math.sin(a) * v, rnd(0.7, 1.1), s, s * 0.6, 0xfff59d, 0xff6d00, 0x4e1a06, o);
      else this.lit.spawn(p.x, cy, p.z, Math.cos(a) * v, rnd(7, 14) + radius, Math.sin(a) * v, rnd(0.8, 1.3), s, s, DEBRIS[i % 3], DEBRIS[i % 3], DEBRIS[i % 3], o);
    }
    if (low) {
      this.shock(p, radius * 1.25, 0xffcc80, 0.42);
      this.groundGlow(p, radius * 1.35, 0xff9100, 0.3);
      this.dustRing(p, radius * 1.1, 0xa1958a, Math.min(16, 6 + radius * 2));
      this.scorch(p, radius * 0.75);
    }
    if (radius >= 5) this.shake(0.3, Math.min(0.9, radius * 0.07));
  }

  /** City Buster: a blinding flash, twin shockwaves and a mushroom cloud of fire cubes. */
  nuke(pos, radius) {
    this.explosion(pos, radius * 1.3);
    const floor = heightAt(pos.x, pos.z);
    const y = Math.max(pos.y, floor + 0.3);
    this.halo.spawn(pos.x, y + radius * 0.5, pos.z, 0, 0, 0, 0.3, radius * 2, radius * 3.2, 0xa07a40, 0x7a4a10, 0x000000, HALO);
    this.glow.spawn(pos.x, y + radius * 0.4, pos.z, 0, 0, 0, 0.18, radius * 1.6, radius * 2.6, 0xffffff, 0xfffde7, 0xffd54f, CORE);
    _f.set(pos.x, y, pos.z);
    this.shock(_f, radius * 2.4, 0xffe0b2, 0.7);
    this.later(0.15, () => this.shock(new THREE.Vector3(pos.x, y, pos.z), radius * 3.2, 0xffab40, 0.9, null, 0.5));
    // The stem: fire climbing fast and slowing at the top.
    const stem = { drag: 1.5, grav: 0, spin: 2, in: 0.1, out: 0.45, mid: 0.3, grow: 2, delay: 0 };
    for (let i = this.n(26); i > 0; i--) {
      stem.delay = Math.random() * 0.5;
      const s = radius * rnd(0.28, 0.45);
      this.glow.spawn(pos.x + rnd(-0.2, 0.2) * radius, y + radius * 0.3, pos.z + rnd(-0.2, 0.2) * radius, rnd(-0.3, 0.3) * radius, radius * rnd(1.6, 2.9), rnd(-0.3, 0.3) * radius,
        rnd(1.3, 2), s, s * 1.4, 0xfff59d, 0xff6d00, 0x3e2723, stem);
    }
    // The cap: a ring of fire rolling outwards high up.
    const cap = { drag: 1.9, grav: -0.6, spin: 1.5, in: 0.15, out: 0.45, mid: 0.3, grow: 2, delay: 0 };
    for (let i = this.n(30); i > 0; i--) {
      const a = Math.random() * 6.28;
      const v = radius * rnd(0.6, 1.7);
      cap.delay = 0.3 + Math.random() * 0.35;
      const s = radius * rnd(0.4, 0.7);
      this.glow.spawn(pos.x, y + radius * rnd(1.5, 1.9), pos.z, Math.cos(a) * v, radius * rnd(0, 0.5), Math.sin(a) * v, rnd(1.4, 2.2), s, s * 1.5, 0xffe082, 0xf4511e, 0x4e342e, cap);
    }
    this.smokePuff(_f.setY(y + radius), radius * 1.6, 14, 0.9);
    this.scorch(pos, radius * 1.1, 0x3d342d, 10);
    this.shake(0.9, 1.6);
  }

  /** Smoke and fire left behind by something flying: call every frame with where it is now. */
  trail(st, p, dt, { smoke = true, fire = 0xff9100, size = 1, every = 0.022 } = {}) {
    st.acc = (st.acc ?? 0) + dt;
    if (st.acc < every) return;
    st.acc = 0;
    const s = size * K;
    if (fire != null && this.glow.load < 0.8) {
      this.glow.spawn(p.x + rnd(-0.1, 0.1) * s, p.y + rnd(-0.1, 0.1) * s, p.z + rnd(-0.1, 0.1) * s, rnd(-0.6, 0.6), rnd(-0.3, 0.9), rnd(-0.6, 0.6), rnd(0.18, 0.32), s * 0.55, s * 0.1, 0xfff59d, fire, shade(fire, 0.5), TRAIL_FIRE);
    }
    if (smoke && this.lit.load < 0.5 && (st.flip = !st.flip)) {
      const g = pick(SMOKE);
      this.lit.spawn(p.x, p.y, p.z, rnd(-0.5, 0.5), rnd(0.3, 1.3), rnd(-0.5, 0.5), rnd(0.5, 0.9), s * 0.4, s * 1.1, g, g, shade(g, 0.8), TRAIL_SMOKE);
    }
  }

  /** A bomb falling from `from` to `to` over `time` seconds. */
  bomb(from, to, time) {
    const g = new THREE.Group();
    block(g, litMat(0x263238), 0.5, 0.5, 0.9);
    block(g, litMat(0x37474f), 0.38, 0.38, 0.25, 0, 0, 0.55);
    block(g, litMat(0xe53935), 0.52, 0.52, 0.14, 0, 0, 0.2);
    block(g, litMat(0x455a64), 0.9, 0.08, 0.32, 0, 0, -0.5);
    block(g, litMat(0x455a64), 0.08, 0.9, 0.32, 0, 0, -0.5);
    g.scale.setScalar(K);
    const start = from.clone();
    const prev = new THREE.Vector3();
    const st = {};
    this.add(g, time, null, (it, k, dt) => {
      const f = 1 - k;
      prev.copy(g.position);
      g.position.lerpVectors(start, to, f).setY(start.y + (to.y - start.y) * f * f);
      if (g.position.distanceToSquared(prev) > 1e-5) g.lookAt(prev.lerp(g.position, 2));
      this.trail(st, g.position, dt, { fire: null, size: 0.7, every: 0.03 });
    });
  }

  /** A homing missile from `from` to wherever `target()` is, arriving after `time`. */
  missile(from, target, time, color = 0xff6d00, size = 1) {
    const g = new THREE.Group();
    block(g, litMat(0xcfd8dc), 0.34, 0.34, 1.1);
    block(g, litMat(color), 0.36, 0.36, 0.16, 0, 0, 0.2);
    block(g, litMat(color), 0.26, 0.26, 0.26, 0, 0, 0.66);
    block(g, litMat(color), 0.14, 0.14, 0.16, 0, 0, 0.86);
    block(g, litMat(0x455a64), 0.86, 0.07, 0.34, 0, 0, -0.42);
    block(g, litMat(0x455a64), 0.07, 0.86, 0.34, 0, 0, -0.42);
    block(g, litMat(0x263238), 0.26, 0.26, 0.12, 0, 0, -0.6);
    const flame = block(g, glowMat(0xffe082), 0.24, 0.24, 0.5, 0, 0, -0.9);
    g.scale.setScalar(size * K);
    g.position.copy(from);
    const start = from.clone();
    const end = new THREE.Vector3();
    const prev = new THREE.Vector3();
    const back = new THREE.Vector3();
    const st = {};
    // Launch: a kick of smoke where it leaves.
    this.smokePuff(from, 0.7 * size, 3, 0, SMOKE);
    this.add(g, time, null, (it, k, dt) => {
      const f = 1 - k;
      target(end);
      prev.copy(g.position);
      g.position.lerpVectors(start, end, f);
      g.position.y += Math.sin(f * Math.PI) * 3; // little arc
      back.subVectors(prev, g.position);
      if (back.lengthSq() > 1e-4) {
        g.lookAt(prev.lerp(g.position, 2));
        back.normalize().multiplyScalar(0.9 * size * K).add(g.position);
      } else back.copy(g.position);
      flame.scale.z = 0.35 + Math.random() * 0.45;
      this.trail(st, back, dt, { fire: color, size });
    });
  }

  /**
   * A projectile (slime glob, harpoon, rebar, thrown grenade) flying in a shallow arc from `from`
   * to wherever `target()` is, arriving after `time`. `long`: a spear shape pointing where it flies;
   * `blob`: a round glob that wobbles.
   */
  toss(from, target, time, { color = 0x9e9e9e, size = 0.5, arc = 1, glowing = false, long = false, blob = false } = {}) {
    size *= K;
    const mat = glowing ? glowMat(color) : litMat(color);
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    if (long) {
      block(body, mat, 0.16, 0.16, 1.5);
      block(body, glowing ? mat : litMat(shade(color, 1.35)), 0.26, 0.26, 0.34, 0, 0, 0.72); // the head
      block(body, glowing ? mat : litMat(shade(color, 0.7)), 0.3, 0.05, 0.3, 0, 0, -0.66); // the flights
      block(body, glowing ? mat : litMat(shade(color, 0.7)), 0.05, 0.3, 0.3, 0, 0, -0.66);
    } else if (blob) {
      block(body, mat, 1, 1, 1);
      block(body, glowing ? mat : litMat(shade(color, 1.3)), 0.5, 0.5, 0.5, 0.3, 0.32, 0.3);
    } else {
      block(body, mat, 1, 1, 1);
      block(body, glowing ? glowMat(0xffffff) : litMat(shade(color, 0.6)), 1.06, 0.3, 1.06);
      block(body, glowing ? mat : litMat(shade(color, 1.4)), 0.4, 0.3, 0.4, 0, 0.6, 0);
    }
    g.scale.setScalar(size);
    g.position.copy(from);
    const start = from.clone();
    const end = new THREE.Vector3();
    const prev = new THREE.Vector3();
    const total = Math.max(time, 1e-3);
    const st = {};
    const drop = { grav: 22, spin: 6, out: 0.7, floor: heightAt(from.x, from.z) };
    const spinX = rnd(8, 14);
    this.add(g, time, null, (it, k, dt) => {
      const f = 1 - k;
      target(end);
      prev.copy(g.position);
      g.position.lerpVectors(start, end, f);
      g.position.y += Math.sin(f * Math.PI) * arc * Math.min(1, total * 2); // quick shots fly flatter
      if (blob) {
        const w = 1 + Math.sin(f * total * 40) * 0.18;
        body.scale.set(w, 1 / w, w);
        // Drips fall off a flying glob.
        st.acc = (st.acc ?? 0) + dt;
        if (st.acc > 0.05 && this.lit.load < 0.5) {
          st.acc = 0;
          (glowing ? this.glow : this.lit).spawn(g.position.x, g.position.y, g.position.z, rnd(-1, 1), rnd(-1, 1), rnd(-1, 1), rnd(0.3, 0.5), size * 0.35, size * 0.1, color, color, shade(color, 0.7), drop);
        }
        return;
      }
      if (g.position.distanceToSquared(prev) > 1e-6) g.lookAt(prev.lerp(g.position, 2));
      if (!long) body.rotation.x += spinX * dt; // grenades tumble end over end
      if (glowing) this.trail(st, g.position, dt, { smoke: false, fire: color, size: size * 1.3, every: 0.02 });
      else if (long && this.streakHalo.n < 300 && (st.flip = !st.flip)) this.halo.spawn(g.position.x, g.position.y, g.position.z, 0, 0, 0, 0.12, size * 0.5, 0.02, 0xffffff, 0x9e9e9e, 0x000000, HALO);
    });
  }

  /** A thrown grenade or mortar shell flying in an arc from `from` to `to` over `time` seconds. */
  lob(from, to, time, { color = 0x33691e, size = 0.5, arc = 4, glowing = false } = {}) {
    size *= K;
    const mat = glowing ? glowMat(color) : litMat(color);
    const g = new THREE.Group();
    block(g, mat, 1, 1, 1.4);
    block(g, glowing ? glowMat(0xffffff) : litMat(shade(color, 1.4)), 0.7, 0.7, 0.4, 0, 0, 0.85); // the nose
    block(g, glowing ? mat : litMat(shade(color, 0.6)), 1.06, 1.06, 0.22, 0, 0, 0.15); // a band
    block(g, glowing ? mat : litMat(shade(color, 0.55)), 1.5, 0.14, 0.5, 0, 0, -0.8); // tail fins
    block(g, glowing ? mat : litMat(shade(color, 0.55)), 0.14, 1.5, 0.5, 0, 0, -0.8);
    g.scale.setScalar(size);
    g.position.copy(from);
    const start = from.clone();
    const prev = new THREE.Vector3();
    const st = {};
    this.add(g, time, null, (it, k, dt) => {
      const f = 1 - k;
      prev.copy(g.position);
      g.position.lerpVectors(start, to, f);
      g.position.y += Math.sin(f * Math.PI) * arc;
      if (g.position.distanceToSquared(prev) > 1e-4) g.lookAt(prev.lerp(g.position, 2));
      g.rotation.z += dt * 9; // spinning like a rifled shell
      this.trail(st, g.position, dt, glowing ? { smoke: false, fire: color, size: size * 1.4 } : { fire: null, size: size * 1.5, every: 0.03 });
    });
  }

  /** A blast of fire sprayed from `from` along `yaw`, spreading over a cone of half-angle `cone`. */
  flames(from, yaw, range, cone) {
    const n = this.n(11);
    const floor = heightAt(from.x, from.z);
    const o = { drag: 1.6, grav: -5, spin: 5, in: 0.08, out: 0.5, mid: 0.4, grow: 2, floor };
    for (let i = 0; i < n; i++) {
      const a = yaw + rnd(-1, 1) * cone * 0.9;
      const life = rnd(0.3, 0.46);
      const v = (range * rnd(0.85, 1.25)) / life;
      const drop = (1.2 - from.y) / life * 0.6;
      this.glow.spawn(from.x, from.y, from.z, Math.sin(a) * v, drop + rnd(-1, 2.5), Math.cos(a) * v, life, 0.35 * K, rnd(1.3, 2.1) * K, 0xfff9c4, i % 4 === 0 ? 0xffca28 : 0xff9100, 0xb71c1c, o);
    }
    // Soot where the fire dies, and embers that keep flying.
    const tip = _a.set(from.x + Math.sin(yaw) * range * 0.8, Math.max(floor + 1, from.y * 0.5), from.z + Math.cos(yaw) * range * 0.8);
    if (Math.random() < 0.5) this.smokePuff(tip, 1.1, 2, 0.28);
    this.sparks(from, 0xff9100, 2, range * 1.6, _b.set(Math.sin(yaw), 0.1, Math.cos(yaw)), cone);
    this.halo.spawn(from.x, from.y, from.z, 0, 0, 0, 0.12, 1.6 * K, 0.8 * K, 0xffb300, 0xff6d00, 0x000000, HALO);
  }

  /** Icy burst: a pale flash, a frost ring, ice shards and frost left on the ground. */
  iceBlast(pos, radius) {
    const floor = heightAt(pos.x, pos.z);
    const y = Math.max(pos.y, floor) + 1;
    this.halo.spawn(pos.x, y, pos.z, 0, 0, 0, 0.24, radius * 1.1, radius * 1.9, 0xb3e5fc, 0x4fa8d8, 0x000000, HALO);
    this.glow.spawn(pos.x, y, pos.z, 0, 0, 0, 0.12, Math.max(1, radius * 0.5), Math.max(1.4, radius * 0.9), 0xffffff, 0xe1f5fe, 0xb3e5fc, CORE);
    this.shock(pos, radius, 0x81d4fa, 0.5);
    // Shards of ice shooting out and sticking up out of the ground for a moment.
    const n = this.n(Math.min(16, 6 + Math.round(radius * 1.6)));
    const o = { grav: 24, spin: 7, floor, bounce: 0.2, out: 0.35, ay: 2.6 };
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + rnd(-0.3, 0.3);
      const v = radius * rnd(1.4, 3);
      const s = rnd(0.2, 0.4) * K;
      this.lit.spawn(pos.x, y, pos.z, Math.cos(a) * v, rnd(4, 10), Math.sin(a) * v, rnd(0.6, 1), s, s, ICE[i % 3], ICE[i % 3], 0xe1f5fe, o);
    }
    // Snow hanging in the air.
    const snow = { drag: 3, grav: 2, spin: 2, out: 0.7 };
    for (let i = this.n(Math.min(14, 4 + radius * 2)); i > 0; i--) {
      const a = Math.random() * 6.28;
      const v = radius * rnd(1, 3.2);
      this.glow.spawn(pos.x, y + rnd(-0.5, 1), pos.z, Math.cos(a) * v, rnd(0.5, 4), Math.sin(a) * v, rnd(0.5, 1.1), 0.22 * K, 0.1 * K, 0xffffff, 0xe1f5fe, 0xb3e5fc, snow);
    }
    this.scorch(pos, radius * 0.7, 0xd6f1fb, 2.5);
  }


  /**
   * A boomerang (loop) or thrown knife (straight) along the same path the sim uses.
   * b: { loop, ox, oz, tx, tz, side }, `y` the flight height.
   */
  blade(b, time, y, { color = 0x8d6e63, size = 1, knife = false } = {}) {
    size *= K;
    const mat = new THREE.MeshLambertMaterial({ color });
    const g = new THREE.Group();
    if (knife) {
      const m = new THREE.Mesh(unitBox, mat);
      m.scale.set(0.15 * size, 0.08 * size, 1.1 * size);
      g.add(m);
    } else {
      // Two flat arms in a V.
      for (const a of [0.6, -0.6]) {
        const arm = new THREE.Mesh(unitBox, mat);
        arm.scale.set(0.35 * size, 0.12 * size, 1.3 * size);
        arm.position.set(Math.sin(a) * 0.45 * size, 0, Math.cos(a) * 0.45 * size);
        arm.rotation.y = a;
        g.add(arm);
      }
    }
    const p = {};
    const yaw = Math.atan2(b.tx - b.ox, b.tz - b.oz);
    this.add(g, time, mat, (it, k) => {
      bladePos(b, 1 - k, p);
      g.position.set(p.x, y, p.z);
      if (knife) g.rotation.y = yaw;
      else g.rotation.y += 0.45;
    });
  }


  /** Lava Golem magma: a glowing puddle on the ground that cools and fades over `life` seconds. */
  puddle(pos, radius, life, color = 0xff6d00) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false });
    const m = new THREE.Mesh(puddleGeo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.copy(pos).setY(0.15);
    m.scale.setScalar(radius);
    this.add(m, life, mat, (it, k) => {
      mat.opacity = 0.85 * Math.min(1, k * 4) * (0.8 + Math.sin((it.max - it.life) * 6) * 0.2);
    });
  }

  /**
   * Sweeper: two lasers on opposite sides of `pos` spin around it (one turn every `spin` s,
   * starting at angle `a`) for `time` seconds. Each reaches to the edge of `bounds`.
   */
  sweep(pos, bounds, a, time, spin, color = 0x40c4ff) {
    // Distance from pos along (dx, dz) to the edge of the map.
    const reach = (dx, dz) => {
      let t = Infinity;
      if (dx > 1e-6) t = Math.min(t, (bounds.maxX - pos.x) / dx);
      if (dx < -1e-6) t = Math.min(t, (bounds.minX - pos.x) / dx);
      if (dz > 1e-6) t = Math.min(t, (bounds.maxZ - pos.z) / dz);
      if (dz < -1e-6) t = Math.min(t, (bounds.minZ - pos.z) / dz);
      return Math.max(0.5, t);
    };
    for (const side of [0, Math.PI]) {
      // A wide soft glow plus a thin white-hot core.
      for (const [thick, h, op, c] of [[1.4, 1.6, 0.4, color], [0.35, 0.5, 0.95, 0xffffff]]) {
        const mat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false });
        const m = new THREE.Mesh(unitBox, mat);
        this.add(m, time, mat, (it) => {
          const ang = a + side + ((it.max - it.life) / spin) * Math.PI * 2;
          const dx = Math.sin(ang);
          const dz = Math.cos(ang);
          const len = reach(dx, dz);
          m.scale.set(thick, h, len);
          m.position.set(pos.x + (dx * len) / 2, 2.2, pos.z + (dz * len) / 2);
          m.rotation.set(0, ang, 0);
          mat.opacity = op * Math.min(1, it.life * 3);
        });
      }
    }
  }


  /** Versus: an Anarchist's helicopter sweeps over (x, z) at 14 high. */
  heli(at) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(unitBox, heliMat);
    body.scale.set(2.2, 1.6, 4.2);
    const tail = new THREE.Mesh(unitBox, heliMat);
    tail.scale.set(0.5, 0.5, 3.5);
    tail.position.z = -3.6;
    const rotor = new THREE.Mesh(unitBox, rotorMat);
    rotor.scale.set(9, 0.12, 0.5);
    rotor.position.y = 1.1;
    g.add(body, tail, rotor);
    g.scale.setScalar(K);
    const from = new THREE.Vector3(at.x - 60, 14, at.z - 20);
    const to = new THREE.Vector3(at.x + 60, 14, at.z + 20);
    this.add(g, 3, null, (it, k, dt) => {
      g.position.lerpVectors(from, to, 1 - k);
      g.lookAt(to);
      rotor.rotation.y += dt * 30;
    });
  }

  /**
   * Airdrop Farm: a cargo plane roars over (x, z) and drops a cash crate that floats down on a
   * parachute onto the helipad. `onLand` runs when the crate touches down.
   */
  airdrop(at, onLand) {
    const mats = [0x78909c, 0x8d6e63, 0xfafafa, 0x43a047].map((color) => new THREE.MeshLambertMaterial({ color }));
    const [hullM, crateM, chuteM, cashM] = mats;
    const plane = new THREE.Group();
    const box = (m, sx, sy, sz, x = 0, y = 0, z = 0) => {
      const b = new THREE.Mesh(unitBox, m);
      b.scale.set(sx, sy, sz);
      b.position.set(x, y, z);
      return b;
    };
    plane.add(
      box(hullM, 2.6, 2.4, 9), // fuselage
      box(hullM, 14, 0.3, 2.2, 0, 0.9, 0.5), // wings
      box(hullM, 5, 0.25, 1.4, 0, 0.6, -4.2), // tailplane
      box(hullM, 0.3, 2.2, 1.6, 0, 2, -4.2), // fin
    );
    for (const x of [-3.2, -5.6, 3.2, 5.6]) plane.add(box(rotorMat, 0.6, 0.6, 1.4, x, 0.5, 1.4)); // engines
    plane.scale.setScalar(K);
    const from = new THREE.Vector3(at.x - 70, 22, at.z - 25);
    const to = new THREE.Vector3(at.x + 70, 22, at.z + 25);
    const fly = 3.2;
    this.add(plane, fly, null, (it, k) => {
      plane.position.lerpVectors(from, to, 1 - k);
      plane.lookAt(to);
    });
    // The crate falls out as the plane passes overhead, then drifts down on its parachute.
    const crate = new THREE.Group();
    crate.add(box(crateM, 1.6, 1.2, 1.6), box(cashM, 1.65, 0.25, 0.4, 0, 0.1, 0));
    const chute = box(chuteM, 3.6, 0.3, 3.6, 0, 4.2, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const cord = box(rotorMat, 0.06, 3.6, 0.06, sx * 0.9, 2.3, sz * 0.9);
      cord.rotation.set(sz * 0.25, 0, -sx * 0.25);
      crate.add(cord);
    }
    crate.add(chute);
    crate.scale.setScalar(K);
    crate.visible = false;
    const fall = 2.6;
    const top = 21;
    const ground = 1.6;
    let landed = false;
    this.add(crate, fly / 2 + fall + 0.6, null, (it, k) => {
      const tt = it.max * (1 - k) - fly / 2; // seconds since the crate dropped
      crate.visible = tt >= 0;
      if (tt < 0) return;
      const f = Math.min(1, tt / fall);
      crate.position.set(at.x, top + (ground - top) * (1 - (1 - f) ** 2), at.z);
      crate.rotation.y = f * 2;
      if (f >= 1 && !landed) {
        landed = true;
        chute.visible = false;
        this.puff(new THREE.Vector3(at.x, 1, at.z), 0xd7ccc8, 8, 0.4, 6);
        onLand?.();
      }
    });
    const it = this.items[this.items.length - 1];
    it.extra = mats;
  }

  /** Smoke bomb: a grey cloud of radius r that hangs around for `time` seconds. */
  smoke(at, r, time, colors = [0xbdbdbd, 0x9e9e9e], count = 14) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshLambertMaterial({ color: colors[i % colors.length], transparent: true, opacity: 0, depthWrite: false });
      const m = new THREE.Mesh(unitBox, mat);
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * r;
      const base = new THREE.Vector3(at.x + Math.cos(a) * d, 1 + Math.random() * 3.5, at.z + Math.sin(a) * d);
      const size = 2.5 + Math.random() * 2.5;
      const spin = Math.random() - 0.5;
      const phase = Math.random() * 6;
      this.add(m, time, mat, (it, k) => {
        const age = (1 - k) * time;
        m.position.copy(base).setY(base.y + Math.sin(age * 0.8 + phase) * 0.4);
        m.scale.setScalar(size * Math.min(1, age * 2));
        m.rotation.y = age * spin;
        mat.opacity = 0.55 * Math.min(1, age * 2, k * time * 0.8);
      });
    }
  }

  text(pos, str, color = '#ffd54f', size = 3) {
    size *= K;
    const map = textTexture(str, color);
    const mat = new THREE.SpriteMaterial({ map, transparent: true, depthTest: false });
    const sp = new THREE.Sprite(mat);
    sp.position.copy(pos);
    sp.scale.set(size * map.userData.aspect, size, 1); // same letter size, wider sprite for long text
    sp.renderOrder = 20;
    this.add(sp, 1.0, mat, (it, k, dt) => {
      sp.position.y += 4 * dt;
      mat.opacity = Math.min(1, k * 2.5);
    });
  }

  /** Whirlwind Slash: a fast spinning silver ring around the tower, throwing off slivers of light. */
  whirl(pos, radius) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xcfd8dc, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos).setY(pos.y + 2);
    this.add(ring, 0.3, mat, (it, k) => {
      ring.scale.setScalar(radius * (1.1 - k * 0.5));
      ring.rotation.z += 0.6;
      mat.opacity = 0.8 * k;
    });
    const n = this.n(10);
    const a0 = Math.random() * 6.28;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * 6.28;
      _a.set(pos.x + Math.cos(a) * radius * 0.55, pos.y + 2, pos.z + Math.sin(a) * radius * 0.55);
      _b.set(pos.x + Math.cos(a + 0.9) * radius, pos.y + 2, pos.z + Math.sin(a + 0.9) * radius);
      this.streaks.spawn(_a, _b, BEAM, 0.16 * K, 0xffffff, 0xcfd8dc, { fade: 0.16, delay: i * 0.012 });
    }
  }

  /** Goo, paint or anything wet: a splat on the ground and drops flying out. */
  splat(pos, radius, color, life = 3) {
    const floor = heightAt(pos.x, pos.z);
    const light = shade(color, 1.3);
    const dark = shade(color, 0.7);
    this.scorch(pos, radius * 0.8, color, life);
    const n = this.n(Math.min(16, 5 + Math.round(radius * 2)));
    const o = { grav: 26, spin: 5, floor, bounce: 0.05, out: 0.5 };
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28;
      const v = radius * rnd(1, 3.2);
      const s = rnd(0.25, 0.5) * K;
      this.lit.spawn(pos.x, floor + 0.6, pos.z, Math.cos(a) * v, rnd(4, 10), Math.sin(a) * v, rnd(0.5, 0.9), s, s * 0.7, i % 2 ? light : color, color, dark, o);
    }
    // The splash itself: a low crown of goo jumping up and falling flat.
    const crown = { grav: 30, spin: null, floor, bounce: 0, out: 0.4, ay: 1.8 };
    for (let i = this.n(8); i > 0; i--) {
      const a = (i / 8) * 6.28;
      const d = radius * 0.45;
      this.lit.spawn(pos.x + Math.cos(a) * d, floor + 0.3, pos.z + Math.sin(a) * d, Math.cos(a) * radius, rnd(5, 8), Math.sin(a) * radius, 0.45, 0.5 * K, 0.4 * K, light, color, dark, crown);
    }
  }

  /** Exploding slime: a green splat and goo drops. */
  slimeSplash(pos, radius) {
    this.splat(pos, radius, 0x64dd17, 3);
    this.halo.spawn(pos.x, pos.y + 0.8, pos.z, 0, 0, 0, 0.18, radius * 1.2, radius * 2, 0x76ff03, 0x64dd17, 0x000000, HALO);
  }

  /** Paintball burst: a flat splat in a random bright color plus colorful drops. */
  paintSplat(pos, radius) {
    this.splat(pos, radius, pick(PAINT), 4);
  }

  /** Electroshocker: a jagged lightning bolt through `points` (world positions, in order). */
  lightning(points, color = 0x80d8ff) {
    const hot = shade(color, 1.8);
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const len = a.distanceTo(b);
      const n = Math.max(3, Math.min(8, Math.round(len / 2.2)));
      const kink = Math.min(1.1, 0.35 + len * 0.06);
      // Two strikes down slightly different paths, a blink apart: the bolt flickers.
      for (let strike = 0; strike < 2; strike++) {
        const delay = strike * 0.07;
        let prev = _a.copy(a);
        for (let k = 1; k <= n; k++) {
          const next = _b.copy(a).lerp(b, k / n);
          if (k < n) next.add(_c.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(kink));
          this.streaks.spawn(prev, next, BEAM, (strike ? 0.13 : 0.2) * K, 0xffffff, hot, { fade: 0.16, delay });
          this.streakHalo.spawn(prev, next, BEAM, 0.75 * K, color, 0x000000, { fade: 0.24, delay });
          // A side fork now and then.
          if (!strike && k < n && Math.random() < 0.3) {
            _d.copy(next).add(_c.set(rnd(-1, 1), rnd(-0.3, 1), rnd(-1, 1)).multiplyScalar(kink * 2));
            this.streaks.spawn(next, _d, BEAM, 0.11 * K, hot, color, { fade: 0.12, delay });
          }
          prev = _a.copy(next);
        }
      }
      this.halo.spawn(b.x, b.y, b.z, 0, 0, 0, 0.18, 2.4 * K, 1.2 * K, color, color, 0x000000, HALO);
      this.glow.spawn(b.x, b.y, b.z, 0, 0, 0, 0.09, 0.8 * K, 0.3 * K, 0xffffff, hot, color, CORE);
      this.sparks(b, color, 5, 11);
    }
  }

  /** Pulse Trooper: a glowing ring that grows from the tower out to `radius` in `time` seconds. */
  pulse(pos, radius, time, color = 0x40c4ff) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos).setY(pos.y + 1.2);
    // A second, fainter ring follows the first.
    const mat2 = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    const ring2 = new THREE.Mesh(ringGeo, mat2);
    ring2.rotation.x = -Math.PI / 2;
    ring2.rotation.z = Math.PI / 8;
    ring.add(ring2);
    const fade = 0.12; // the ring lingers a moment at full size
    this.add(ring, time + fade, mat, (it) => {
      const age = it.max - it.life;
      const f = Math.min(1, age / time);
      ring.scale.setScalar(Math.max(0.3, radius * f));
      ring2.scale.setScalar(0.5 + 0.35 * f);
      mat.opacity = age < time ? 0.85 : 0.85 * (it.life / fade);
      mat2.opacity = mat.opacity * 0.5;
    });
    this.items[this.items.length - 1].extra = [mat2];
    // Bright blocks ride the ring outwards.
    if (radius < 1.5) return;
    const n = this.n(Math.min(16, 6 + Math.round(radius * 0.8)));
    const hot = shade(color, 1.6);
    const o = { spin: 6, out: 0.5, in: 0.15 };
    const a0 = Math.random() * 6.28;
    const v = radius / Math.max(0.05, time);
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * 6.28;
      this.glow.spawn(pos.x, pos.y + 1.2, pos.z, Math.cos(a) * v, 0, Math.sin(a) * v, time + fade, 0.3 * K, 0.45 * K, hot, color, color, o);
    }
  }

  /** Apocalypse Rave: rainbow rings pulse out across the dance floor, with confetti. */
  rave(pos, radius) {
    RAINBOW.forEach((color, i) => {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, mat);
      ring.rotation.x = -Math.PI / 2;
      ring.rotation.z = i * 0.2;
      ring.position.copy(pos).setY(pos.y + i * 0.02);
      const life = 0.9 + i * 0.25;
      this.add(ring, life, mat, (it, k) => {
        ring.scale.setScalar(radius * (1 - k) + 0.5);
        mat.opacity = 0.8 * Math.min(1, k * 3);
      });
      this.confetti(_a.set(pos.x, pos.y + 3, pos.z), 6, 14, [color]);
    });
  }

  /** Flat paper squares fluttering down. */
  confetti(pos, count = 12, power = 10, colors = RAINBOW) {
    count = this.n(count);
    const o = { grav: 9, drag: 2.2, spin: 12, out: 0.3, ay: 0.12, floor: heightAt(pos.x, pos.z), bounce: 0 };
    for (let i = 0; i < count; i++) {
      const c = colors[i % colors.length];
      this.glow.spawn(pos.x, pos.y, pos.z, rnd(-1, 1) * power, rnd(0.4, 1.3) * power, rnd(-1, 1) * power, rnd(0.9, 1.6), 0.36 * K, 0.36 * K, c, c, c, o);
    }
  }

  /** One firework shell bursting at `p`: a ball of sparks that droop, twinkle and burn out. */
  starburst(p, color, size = 1, delay = 0) {
    const n = this.n(Math.round(26 * size));
    const o = { grav: 7, drag: 2.4, spin: 6, out: 0.6, mid: 0.2, delay };
    for (let i = 0; i < n; i++) {
      _a.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize();
      const v = 15 * size * rnd(0.75, 1.1);
      this.glow.spawn(p.x, p.y, p.z, _a.x * v, _a.y * v, _a.z * v, rnd(0.7, 1.2), 0.34 * K, 0.1 * K, 0xffffff, color, shade(color, 0.6), o);
    }
    this.halo.spawn(p.x, p.y, p.z, 0, 0, 0, 0.3, 2 * size, 7 * size, color, color, 0x000000, { out: 0, mid: 0.3, delay });
    this.glow.spawn(p.x, p.y, p.z, 0, 0, 0, 0.1, 1.2 * size, 0.4, 0xffffff, 0xffffff, color, { out: 0.3, delay });
  }

  /** Pyrotechnics: colourful firework bursts over (x, z), plus a stun ring of radius r. */
  fireworks(at, r) {
    const floor = heightAt(at.x, at.z);
    for (let i = 0; i < 5; i++) {
      const c = RAINBOW[i];
      const p = new THREE.Vector3(at.x + (Math.random() - 0.5) * r * 1.6, floor + 6 + Math.random() * 5, at.z + (Math.random() - 0.5) * r * 1.6);
      const delay = i * 0.09;
      // The shell whistles up from the ground, then bursts.
      this.streaks.spawn(_a.set(p.x, floor + 0.5, p.z), p, BULLET, 0.2 * K, 0xfff59d, 0xfff59d, { travel: 0.16, len: 2.5, delay: Math.max(0, delay - 0.16) });
      this.starburst(p, c, 1, delay);
    }
    this.shock(_a.set(at.x, floor, at.z), r, 0xffeb3b, 0.6);
  }

  /**
   * A model breaking into its blocks. parts: [{ x, y, z, s, c }] (where each block is, how big, its
   * color); `center`: where they fly away from; power: how hard; up: extra lift.
   */
  shatter(parts, center, { power = 7, up = 1, life = 1, glow = false, push = null } = {}) {
    const floor = heightAt(center.x, center.z);
    const o = { grav: 30, spin: 9, floor, bounce: 0.38, out: 0.35 };
    const pool = glow ? this.glow : this.lit;
    if (pool.load > 0.85) return;
    for (const p of parts) {
      _a.set(p.x - center.x, p.y - center.y, p.z - center.z);
      const d = _a.length() || 1;
      _a.multiplyScalar(1 / d).add(_b.set(rnd(-0.5, 0.5), rnd(-0.2, 0.6), rnd(-0.5, 0.5)));
      const v = power * rnd(0.45, 1.15);
      let vx = _a.x * v;
      let vz = _a.z * v;
      if (push) {
        vx += push.x;
        vz += push.z;
      }
      pool.spawn(p.x, Math.max(p.y, floor + p.s / 2), p.z, vx, _a.y * v + power * up * rnd(0.5, 1.1), vz, life * rnd(0.7, 1.25), p.s, p.s * 0.85, p.c, p.c, shade(p.c, 0.65), o);
    }
  }

  /** A model coming apart into motes that drift up and wink out (ghosts, void things, holograms). */
  dissolve(parts, color = null) {
    const o = { grav: -7, drag: 1.8, spin: 3, out: 0.8, mid: 0.3, delay: 0 };
    if (this.glow.load > 0.85) return;
    for (const p of parts) {
      o.delay = Math.random() * 0.25;
      const c = color ?? p.c;
      this.glow.spawn(p.x, p.y, p.z, rnd(-1.5, 1.5), rnd(0.5, 3), rnd(-1.5, 1.5), rnd(0.6, 1.1), p.s * 0.8, p.s * 0.2, shade(c, 1.5), c, shade(c, 0.5), o);
    }
  }

  /** Gold coins fountaining up out of `pos` (selling a tower, cash shots). */
  coins(pos, count = 8) {
    count = this.n(count);
    const o = { grav: 28, spin: 14, floor: heightAt(pos.x, pos.z), bounce: 0.5, out: 0.25, az: 0.25 };
    for (let i = 0; i < count; i++) {
      const a = Math.random() * 6.28;
      const v = rnd(1.5, 4.5);
      this.glow.spawn(pos.x, pos.y, pos.z, Math.cos(a) * v, rnd(9, 15), Math.sin(a) * v, rnd(0.8, 1.2), 0.42 * K, 0.42 * K, 0xfff59d, 0xffd54f, 0xffa000, o);
    }
  }

  /** A tower set down: it lands with a thump of dust and a ring. */
  placeFx(pos, color = 0xcfd8dc) {
    const floor = heightAt(pos.x, pos.z);
    _f.set(pos.x, floor, pos.z);
    this.dustRing(_f, 3.2, 0xb0a698, 12);
    this.shock(_f, 3.4, color, 0.35, floor + 0.25, 0.6);
    // Pebbles hopping up.
    const o = { grav: 30, spin: 9, floor, bounce: 0.3, out: 0.4 };
    for (let i = this.n(6); i > 0; i--) {
      const a = Math.random() * 6.28;
      const s = rnd(0.16, 0.3) * K;
      this.lit.spawn(pos.x + Math.cos(a) * 1.6, floor + 0.2, pos.z + Math.sin(a) * 1.6, Math.cos(a) * rnd(1, 4), rnd(4, 8), Math.sin(a) * rnd(1, 4), rnd(0.5, 0.8), s, s, 0x8d8171, 0x8d8171, 0x6d6257, o);
    }
  }

  /** An upgrade: light climbs the tower in a spiral, a ring bursts out and sparkles rain down. */
  levelUp(pos, color = 0xffd54f, height = 6) {
    const floor = heightAt(pos.x, pos.z);
    const hot = shade(color, 1.6);
    _f.set(pos.x, floor, pos.z);
    this.shock(_f, 3.6, color, 0.5, floor + 0.3);
    this.groundGlow(_f, 3, color, 0.5);
    // Two strands winding up around the tower.
    const o = { spin: 5, in: 0.1, out: 0.6, drag: 0.6, delay: 0 };
    const n = this.n(22);
    const a0 = Math.random() * 6.28;
    for (let i = 0; i < n; i++) {
      const f = i / n;
      const a = a0 + f * 7.5 + (i % 2) * Math.PI;
      o.delay = f * 0.4;
      this.glow.spawn(pos.x + Math.cos(a) * 2.1, floor + 0.3 + f * height * K, pos.z + Math.sin(a) * 2.1, -Math.sin(a) * 2.5, 2.2, Math.cos(a) * 2.5, rnd(0.45, 0.7), 0.36 * K, 0.1 * K, 0xffffff, hot, color, o);
    }
    // A pillar of light.
    this.halo.spawn(pos.x, floor + height * 0.5 * K, pos.z, 0, 3, 0, 0.45, 2.6 * K, 0.6 * K, color, color, 0x000000, { out: 0, mid: 0.3, spin: null, ay: height * 0.42 });
    // A pop of stars at the top.
    this.later(0.35, () => this.sparks(_f.set(pos.x, floor + (height + 0.5) * K, pos.z), color, 10, 9));
  }

  /** A tower sold: it pops into a puff of dust and a fountain of coins. */
  sellFx(pos) {
    const floor = heightAt(pos.x, pos.z);
    _f.set(pos.x, floor + 2, pos.z);
    this.coins(_f, 10);
    this.smokePuff(_f.setY(floor + 1), 1.6, 6, 0, SMOKE);
    this.dustRing(_f.setY(floor), 2.6, 0xb0a698, 8);
    this.halo.spawn(pos.x, floor + 2.5, pos.z, 0, 0, 0, 0.2, 2.5, 5, 0xffd54f, 0xffb300, 0x000000, HALO);
  }

  /** The base takes a hit: red sparks, flying stones and a ring of warning light. */
  baseHit(pos) {
    const floor = heightAt(pos.x, pos.z);
    _f.set(pos.x, floor + 3, pos.z);
    this.halo.spawn(pos.x, floor + 3, pos.z, 0, 0, 0, 0.25, 3, 5.5, 0xff1744, 0xe53935, 0x000000, HALO);
    this.sparks(_f, 0xff5252, 8, 12);
    this.puff(_f, 0x8d8d8d, 6, 0.45, 8);
    this.shock(_f.setY(floor), 5, 0xff1744, 0.45);
    this.shake(0.25, 0.5);
  }

  /** A boss goes up: a huge blast, shock rings one after another, smaller blasts around it and smoke. */
  bossBoom(pos, radius) {
    const p = pos.clone();
    const floor = heightAt(p.x, p.z);
    const ground = new THREE.Vector3(p.x, floor, p.z);
    this.explosion(p, radius);
    this.halo.spawn(p.x, p.y, p.z, 0, 0, 0, 0.28, radius * 1.8, radius * 3, 0xa07a40, 0x7a4a10, 0x000000, HALO);
    this.sparks(p, 0xfff59d, 26, 20 + radius * 2);
    [0xffffff, 0xffcc80, 0xff7043].forEach((c, i) => {
      this.later(i * 0.13, () => this.shock(ground, radius * (1.7 + i * 0.9), c, 0.55 + i * 0.15, null, 0.8 - i * 0.15));
    });
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * 6.28;
      const q = new THREE.Vector3(p.x + Math.cos(a) * radius * 0.8, p.y + rnd(-0.3, 0.6) * radius, p.z + Math.sin(a) * radius * 0.8);
      this.later(0.08 + i * 0.09, () => this.explosion(q, radius * 0.45));
    }
    this.smokePuff(p, radius * 1.3, 12, 0.35);
    this.scorch(ground, radius * 0.9, 0x3d342d, 10);
    this.shake(0.7, Math.min(1.5, 0.5 + radius * 0.1));
  }

  /** Embers drifting up off something burnt. */
  embers(pos, count = 6, spread = 1) {
    count = this.n(count);
    const o = { grav: -5, drag: 1.2, spin: 6, out: 0.7, mid: 0.3, delay: 0 };
    for (let i = 0; i < count; i++) {
      o.delay = Math.random() * 0.3;
      this.glow.spawn(pos.x + rnd(-1, 1) * spread, pos.y + rnd(-0.5, 0.5) * spread, pos.z + rnd(-1, 1) * spread, rnd(-1, 1), rnd(1, 4), rnd(-1, 1), rnd(0.5, 1), 0.2 * K, 0.05 * K, 0xfff59d, 0xff9100, 0xb71c1c, o);
    }
  }

  /**
   * Small particles for an enemy's condition, called a few times a second while it lasts.
   * kind: 'burn', 'frost', 'shock', 'poison', 'slime', 'dust'. (x, y, z): its middle; s: its size.
   */
  statusFx(kind, x, y, z, s = 1) {
    if (this.glow.load > 0.5 || this.lit.load > 0.5) return;
    const r = 0.8 * s;
    const px = x + rnd(-r, r);
    const pz = z + rnd(-r, r);
    switch (kind) {
      case 'burn':
        for (let i = 0; i < 2; i++) {
          this.glow.spawn(x + rnd(-r, r), y + rnd(-1.6, 1.8) * s, z + rnd(-r, r), rnd(-0.6, 0.6), rnd(3.5, 7), rnd(-0.6, 0.6), rnd(0.4, 0.7), rnd(0.8, 1.2) * s * K, 0.45 * s * K, 0xfff59d, i ? 0xff9100 : 0xff5a1f, 0x8a1c0a, STATUS_UP);
        }
        if (Math.random() < 0.3) this.lit.spawn(px, y + 2.4 * s, pz, 0, 2.8, 0, 0.8, 0.35 * s * K, 0.9 * s * K, SOOT[0], SOOT[1], SOOT[1], TRAIL_SMOKE);
        break;
      case 'frost':
        this.glow.spawn(px, y + rnd(-0.5, 2.4) * s, pz, rnd(-0.8, 0.8), rnd(-3, -1), rnd(-0.8, 0.8), rnd(0.55, 0.9), 0.6 * K, 0.3 * K, 0xffffff, 0xe1f5fe, 0x81d4fa, STATUS_DRIFT);
        if (Math.random() < 0.4) this.glow.spawn(x + rnd(-r, r), y + rnd(-1.5, 2.4) * s, z + rnd(-r, r), 0, -0.6, 0, 0.5, 0.45 * K, 0.45 * K, 0xffffff, 0xb3e5fc, 0x81d4fa, STATUS_BUBBLE);
        break;
      case 'shock': {
        _a.set(px, y + rnd(-1.5, 2.2) * s, pz);
        _b.copy(_a).add(_c.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(1.7 * s));
        this.streaks.spawn(_a, _b, BEAM, 0.2 * K, 0xffffff, 0xfff176, { fade: 0.12 });
        _a.copy(_b).add(_c.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(1.2 * s));
        this.streaks.spawn(_b, _a, BEAM, 0.15 * K, 0xffffff, 0xfff176, { fade: 0.12 });
        this.glow.spawn(_a.x, _a.y, _a.z, rnd(-3, 3), rnd(0, 4), rnd(-3, 3), 0.25, 0.25 * K, 0.06 * K, 0xffffff, 0xfff176, 0xffd600, STATUS_DRIFT);
        break;
      }
      case 'poison':
        this.glow.spawn(px, y + rnd(0, 2.2) * s, pz, rnd(-0.5, 0.5), rnd(1.8, 3.4), rnd(-0.5, 0.5), rnd(0.55, 0.95), 0.35 * K, 0.8 * s * K, 0xb2ff59, 0x76ff03, 0x33691e, STATUS_BUBBLE);
        break;
      case 'slime':
        this.lit.spawn(px, y + rnd(-0.5, 1.2) * s, pz, 0, -1, 0, rnd(0.45, 0.7), 0.6 * K, 0.3 * K, 0x76ff03, 0x64dd17, 0x33691e, STATUS_DRIP);
        break;
      case 'glitch': {
        // Inhuman contract: black specks, now and then a cyan glitch line.
        this.lit.spawn(px, y + rnd(-1.2, 2.2) * s, pz, rnd(-1.2, 1.2), rnd(0.4, 2.2), rnd(-1.2, 1.2), rnd(0.35, 0.7), rnd(0.35, 0.6) * s * K, 0.1 * s * K, 0x000000, 0x0a0a0a, 0x1a0026, STATUS_DRIFT);
        if (Math.random() < 0.18) {
          _a.set(px, y + rnd(-1, 2) * s, pz);
          _b.copy(_a).add(_c.set(rnd(-1, 1), 0, rnd(-1, 1)).multiplyScalar(1.6 * s));
          this.streaks.spawn(_a, _b, BEAM, 0.12 * K, 0xffffff, 0x00e5ff, { fade: 0.08 });
        }
        break;
      }
      case 'dust':
        this.lit.spawn(px, y, pz, rnd(-1.5, 1.5), rnd(1, 2.5), rnd(-1.5, 1.5), rnd(0.4, 0.7), 0.3 * s * K, 0.75 * s * K, 0xb0a698, 0xa1958a, 0x8d8171, TRAIL_SMOKE);
        break;
    }
  }

  update(dt) {
    this.frame++;
    this.updateEmbers(dt);
    this.updateArmada(dt);
    this.updateChrono(dt);
    this.updateVoid(dt);
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const t = this.timers[i];
      if ((t.t -= dt) > 0) continue;
      this.timers.splice(i, 1);
      t.fn();
    }
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      if (it.life <= 0) {
        this.scene.remove(it.obj);
        it.mat?.dispose();
        if (it.extra) for (const m of it.extra) m.dispose();
        this.items.splice(i, 1);
        continue;
      }
      it.update?.(it, it.life / it.max, dt);
    }
    this.lit.update(dt);
    this.glow.update(dt);
    this.halo.update(dt);
    this.streaks.update(dt);
    this.streakHalo.update(dt);
  }
}
