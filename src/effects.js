import * as THREE from 'three';
import { bladePos } from './sim/sim.js';
import { MODEL_SCALE as K } from './scale.js';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const ringGeo = new THREE.RingGeometry(0.8, 1, 32);
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

/** Short-lived visual effects: tracers, muzzle flashes, debris, floating text. */
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

  tracer(from, to, color = 0xffe066, width = 0.14) {
    width *= K;
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const m = new THREE.Mesh(unitBox, mat);
    m.scale.set(width, width, from.distanceTo(to));
    m.position.copy(from).lerp(to, 0.5);
    m.lookAt(to);
    // Thick (rail) shots linger and shrink; thin bullets just blink.
    const thick = width > 0.2 * K;
    const life = thick ? 0.35 : 0.08;
    this.add(m, life, mat, (it, k) => {
      mat.opacity = 0.95 * k;
      if (thick) m.scale.set(width * k, width * k, m.scale.z);
    });
  }

  flash(pos, color = 0xfff3b0, size = 0.7) {
    size *= K;
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
    const m = new THREE.Mesh(unitBox, mat);
    m.position.copy(pos);
    m.scale.setScalar(size);
    m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    this.add(m, 0.06, mat, (it, k) => m.scale.setScalar(size * k + 0.2));
  }

  /** A bomb falling from `from` to `to` over `time` seconds. */
  bomb(from, to, time) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x263238 });
    const m = new THREE.Mesh(unitBox, mat);
    m.scale.set(0.5 * K, 0.5 * K, 1.0 * K);
    const start = from.clone();
    this.add(m, time, mat, (it, k) => {
      const f = 1 - k;
      m.position.lerpVectors(start, to, f).setY(start.y + (to.y - start.y) * f * f);
      m.rotation.x = f * 1.2;
    });
  }

  /** A homing missile from `from` to wherever `target()` is, arriving after `time`. */
  missile(from, target, time, color = 0xff6d00, size = 1) {
    size *= K;
    const mat = new THREE.MeshBasicMaterial({ color });
    const m = new THREE.Mesh(unitBox, mat);
    m.scale.set(0.35 * size, 0.35 * size, 1.3 * size);
    const start = from.clone();
    const end = new THREE.Vector3();
    const prev = new THREE.Vector3();
    this.add(m, time, mat, (it, k) => {
      const f = 1 - k;
      target(end);
      prev.copy(m.position);
      m.position.lerpVectors(start, end, f);
      m.position.y += Math.sin(f * Math.PI) * 3; // little arc
      if (m.position.distanceToSquared(prev) > 1e-4) m.lookAt(prev.lerp(m.position, 2));
    });
  }

  /**
   * A projectile (slime glob, harpoon, rebar, thrown grenade) flying in a shallow arc from `from`
   * to wherever `target()` is, arriving after `time`. `long`: a spear shape pointing where it flies;
   * `blob`: a round glob that wobbles.
   */
  toss(from, target, time, { color = 0x9e9e9e, size = 0.5, arc = 1, glowing = false, long = false, blob = false } = {}) {
    size *= K;
    const mat = glowing ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color });
    const m = new THREE.Mesh(unitBox, mat);
    if (long) m.scale.set(0.16 * size, 0.16 * size, 1.5 * size);
    else m.scale.setScalar(size);
    const start = from.clone();
    const end = new THREE.Vector3();
    const prev = new THREE.Vector3();
    const total = Math.max(time, 1e-3);
    this.add(m, time, mat, (it, k) => {
      const f = 1 - k;
      target(end);
      prev.copy(m.position);
      m.position.lerpVectors(start, end, f);
      m.position.y += Math.sin(f * Math.PI) * arc * Math.min(1, total * 2); // quick shots fly flatter
      if (blob) {
        const w = 1 + Math.sin(f * total * 40) * 0.18;
        m.scale.set(size * w, size / w, size * w);
      } else if (m.position.distanceToSquared(prev) > 1e-6) m.lookAt(prev.lerp(m.position, 2));
    });
  }

  /** A thrown grenade or mortar shell flying in an arc from `from` to `to` over `time` seconds. */
  lob(from, to, time, { color = 0x33691e, size = 0.5, arc = 4, glowing = false } = {}) {
    size *= K;
    const mat = glowing ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color });
    const m = new THREE.Mesh(unitBox, mat);
    m.scale.set(size, size, size * 1.4);
    const start = from.clone();
    const prev = new THREE.Vector3();
    this.add(m, time, mat, (it, k) => {
      const f = 1 - k;
      prev.copy(m.position);
      m.position.lerpVectors(start, to, f);
      m.position.y += Math.sin(f * Math.PI) * arc;
      if (m.position.distanceToSquared(prev) > 1e-4) m.lookAt(prev.lerp(m.position, 2));
    });
  }

  /** A puff of fire sprayed from `from` along `yaw`, spreading over a cone of half-angle `cone`. */
  flames(from, yaw, range, cone) {
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffb300, transparent: true, opacity: 0.9, depthWrite: false });
      const m = new THREE.Mesh(unitBox, mat);
      const a = yaw + (Math.random() * 2 - 1) * cone * 0.9;
      const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      const reach = range * (0.75 + Math.random() * 0.3);
      const start = from.clone();
      const spin = Math.random() * 6;
      const life = 0.32 + Math.random() * 0.12;
      this.add(m, life, mat, (it, k) => {
        const f = 1 - k;
        m.position.copy(start).addScaledVector(dir, reach * f);
        m.position.y = start.y * (1 - f) + 1.2 * f + Math.sin(f * 3) * 0.6;
        m.scale.setScalar(0.4 + f * 1.8);
        m.rotation.set(spin * f, spin * f * 0.7, 0);
        mat.color.setHex(f < 0.3 ? 0xffe082 : f < 0.65 ? 0xff9100 : 0xd84315);
        mat.opacity = 0.9 * Math.min(1, k * 2);
      });
    }
  }

  /** Icy burst: pale-blue flash, frost ring and ice chips. */
  iceBlast(pos, radius) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xe1f5fe, transparent: true, opacity: 0.8, depthWrite: false });
    const ball = new THREE.Mesh(unitBox, mat);
    ball.position.copy(pos).setY(pos.y + 1);
    ball.rotation.set(Math.random(), Math.random(), Math.random());
    this.add(ball, 0.3, mat, (it, k) => {
      ball.scale.setScalar(Math.max(1.2, radius) * (0.5 + (1 - k)));
      mat.opacity = 0.8 * k;
    });
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x81d4fa, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos).setY(0.35);
    this.add(ring, 0.5, ringMat, (it, k) => {
      ring.scale.setScalar(radius * (1.1 - k * 0.8));
      ringMat.opacity = 0.8 * k;
    });
    this.puff(pos.clone().setY(pos.y + 1), 0xb3e5fc, Math.min(14, 5 + Math.round(radius * 1.5)), 0.35, 5 + radius);
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

  /** Whirlwind Slash: a fast spinning silver ring around the tower. */
  whirl(pos, radius) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xcfd8dc, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos).setY(2);
    this.add(ring, 0.3, mat, (it, k) => {
      ring.scale.setScalar(radius * (1.1 - k * 0.5));
      ring.rotation.z += 0.6;
      mat.opacity = 0.8 * k;
    });
  }

  /** Exploding slime: a green splat and goo drops. */
  slimeSplash(pos, radius) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x76ff03, transparent: true, opacity: 0.75, depthWrite: false });
    const blob = new THREE.Mesh(unitBox, mat);
    blob.position.copy(pos).setY(0.6);
    this.add(blob, 0.35, mat, (it, k) => {
      blob.scale.set(radius * (1.6 - k), 0.5, radius * (1.6 - k));
      mat.opacity = 0.75 * k;
    });
    this.puff(pos.clone().setY(1), 0x64dd17, Math.min(12, 4 + Math.round(radius * 1.5)), 0.4, 5 + radius);
  }

  /** Paintball burst: a flat splat in a random bright color plus colorful drops. */
  paintSplat(pos, radius) {
    const colors = [0xff1744, 0x2979ff, 0xffea00, 0x00e676, 0xd500f9, 0xff9100];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false });
    const blob = new THREE.Mesh(unitBox, mat);
    blob.position.copy(pos).setY(0.4);
    blob.rotation.y = Math.random() * Math.PI;
    this.add(blob, 0.4, mat, (it, k) => {
      blob.scale.set(radius * (1.6 - k * 0.6), 0.15, radius * (1.6 - k * 0.6));
      mat.opacity = 0.8 * k;
    });
    this.puff(pos.clone().setY(1), color, Math.min(10, 3 + Math.round(radius)), 0.35, 4 + radius);
  }

  /** Fireball + shock ring + debris. */
  explosion(pos, radius) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffa726, transparent: true, opacity: 0.85, depthWrite: false });
    const ball = new THREE.Mesh(unitBox, mat);
    ball.position.copy(pos).setY(pos.y + radius * 0.3);
    ball.rotation.set(Math.random(), Math.random(), Math.random());
    this.add(ball, 0.35, mat, (it, k) => {
      const f = 1 - k;
      ball.scale.setScalar(radius * (0.6 + f * 1.2));
      mat.opacity = 0.85 * k;
      mat.color.setHex(f < 0.4 ? 0xffe082 : 0xff7043);
    });
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffcc80, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos).setY(0.35);
    this.add(ring, 0.4, ringMat, (it, k) => {
      ring.scale.setScalar(radius * (1.15 - k * 0.9));
      ringMat.opacity = 0.7 * k;
    });
    this.puff(pos.clone().setY(pos.y + 0.5), 0x5d4037, Math.min(14, 4 + Math.round(radius)), 0.45, 6 + radius);
  }

  /** City Buster: a bright flash and a small mushroom cloud rising out of a big explosion. */
  nuke(pos, radius) {
    this.explosion(pos, radius * 1.3);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xfffde7, transparent: true, opacity: 0.9, depthWrite: false });
    const flash = new THREE.Mesh(unitBox, flashMat);
    flash.position.copy(pos).setY(pos.y + 1);
    this.add(flash, 0.25, flashMat, (it, k) => {
      flash.scale.setScalar(radius * (2.2 - k));
      flashMat.opacity = 0.9 * k;
    });
    const mat = new THREE.MeshBasicMaterial({ color: 0xff8f00, transparent: true, opacity: 0.8, depthWrite: false });
    const stem = new THREE.Mesh(unitBox, mat);
    const cap = new THREE.Mesh(unitBox, mat);
    this.add(stem, 1.4, null, (it, k) => {
      const f = 1 - k;
      stem.position.copy(pos).setY(pos.y + f * radius * 0.7);
      stem.scale.set(radius * 0.35, radius * 1.4 * f + 0.1, radius * 0.35);
    });
    this.add(cap, 1.4, mat, (it, k) => {
      const f = 1 - k;
      cap.position.copy(pos).setY(pos.y + f * radius * 1.5);
      cap.scale.set(radius * (0.6 + f * 0.9), radius * (0.4 + f * 0.3), radius * (0.6 + f * 0.9));
      mat.opacity = 0.8 * Math.min(1, k * 2);
      mat.color.setHex(f < 0.3 ? 0xffd54f : 0x8d6e63);
    });
  }

  /** Electroshocker: a jagged lightning bolt through `points` (world positions, in order). */
  lightning(points, color = 0x80d8ff) {
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      // Each hop is split into a few kinked segments.
      const n = 4;
      let prev = a.clone();
      for (let k = 1; k <= n; k++) {
        const next = a.clone().lerp(b, k / n);
        if (k < n) next.add(new THREE.Vector3((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2));
        const w = 0.22;
        const mat = new THREE.MeshBasicMaterial({ color: k % 2 ? color : 0xffffff, transparent: true, opacity: 1, depthWrite: false });
        const m = new THREE.Mesh(unitBox, mat);
        m.scale.set(w, w, prev.distanceTo(next));
        m.position.copy(prev).lerp(next, 0.5);
        m.lookAt(next);
        this.add(m, 0.18, mat, (it, f) => {
          mat.opacity = f;
          m.scale.set(w * f, w * f, m.scale.z);
        });
        prev = next;
      }
      this.flash(b, color, 1.1);
    }
  }

  /** Pulse Trooper: a glowing ring that grows from the tower out to `radius` in `time` seconds. */
  pulse(pos, radius, time, color = 0x40c4ff) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos).setY(1.2);
    const fade = 0.12; // the ring lingers a moment at full size
    this.add(ring, time + fade, mat, (it) => {
      const age = it.max - it.life;
      ring.scale.setScalar(Math.max(0.3, radius * Math.min(1, age / time)));
      mat.opacity = age < time ? 0.85 : 0.85 * (it.life / fade);
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

  /** Apocalypse Rave: rainbow rings pulse out across the dance floor, with confetti. */
  rave(pos, radius) {
    const colors = [0xff1744, 0xffea00, 0x76ff03, 0x00e5ff, 0xd500f9];
    colors.forEach((color, i) => {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(pos).setY(0.4 + i * 0.02);
      const life = 0.9 + i * 0.25;
      this.add(ring, life, mat, (it, k) => {
        ring.scale.setScalar(radius * (1 - k) + 0.5);
        mat.opacity = 0.8 * Math.min(1, k * 3);
      });
      this.puff(pos.clone().setY(3), color, 6, 0.35, 14);
    });
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

  /** Pyrotechnics: colourful firework bursts over (x, z), plus a stun ring of radius r. */
  fireworks(at, r) {
    const colors = [0xff1744, 0xffea00, 0x00e5ff, 0x76ff03, 0xff4081];
    for (let i = 0; i < 5; i++) {
      const c = colors[i];
      const p = new THREE.Vector3(at.x + (Math.random() - 0.5) * r * 1.6, 6 + Math.random() * 5, at.z + (Math.random() - 0.5) * r * 1.6);
      this.puff(p, c, 10, 0.35, 16);
      this.flash(p, c, 2.2);
    }
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(at.x, 0.4, at.z);
    this.add(ring, 0.8, ringMat, (it, k) => {
      ring.scale.setScalar(r * (1.2 - k * 0.9));
      ringMat.opacity = 0.8 * k;
    });
  }

  /** Blocky debris burst. */
  puff(pos, color, count = 8, size = 0.5, power = 8) {
    size *= K;
    const mat = new THREE.MeshLambertMaterial({ color });
    const lives = Array.from({ length: count }, () => 0.5 + Math.random() * 0.4);
    const owner = lives.indexOf(Math.max(...lives));
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(unitBox, mat);
      m.position.copy(pos);
      const s = size * (0.6 + Math.random() * 0.8);
      m.scale.setScalar(s);
      const vel = new THREE.Vector3((Math.random() - 0.5) * power, power * (0.5 + Math.random()), (Math.random() - 0.5) * power);
      const spin = new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8);
      // Only the longest-lived cube owns the shared material so it is disposed once, last.
      this.add(m, lives[i], i === owner ? mat : null, (it, k, dt) => {
        vel.y -= 30 * dt;
        m.position.addScaledVector(vel, dt);
        if (m.position.y < s / 2) {
          m.position.y = s / 2;
          vel.multiplyScalar(0.5);
          vel.y = Math.abs(vel.y) * 0.3;
        }
        m.rotation.x += spin.x * dt;
        m.rotation.y += spin.y * dt;
        m.scale.setScalar(s * Math.min(1, k * 2));
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

  update(dt) {
    this.updateEmbers(dt);
    this.updateArmada(dt);
    this.updateChrono(dt);
    this.updateVoid(dt);
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
  }
}
