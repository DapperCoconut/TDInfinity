import * as THREE from 'three';
import { bladePos } from './sim/sim.js';

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const ringGeo = new THREE.RingGeometry(0.8, 1, 32);
const textCache = new Map();
const heliMat = new THREE.MeshLambertMaterial({ color: 0x263238 });
const rotorMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

function textTexture(str, color) {
  const key = str + color;
  if (textCache.has(key)) return textCache.get(key);
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const g = c.getContext('2d');
  g.font = '900 64px "Arial Black", Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 10;
  g.strokeStyle = '#1b1b1b';
  g.strokeText(str, 128, 50);
  g.fillStyle = color;
  g.fillText(str, 128, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  textCache.set(key, t);
  return t;
}

/** Short-lived visual effects: tracers, muzzle flashes, debris, floating text. */
export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.emberK = 0; // 0..1: how strongly the Molten Warlord's embers fill the world
    this.emberOn = false;
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
    this.skyBase = this.scene.background?.clone?.() ?? null;
    this.fogBase = this.scene.fog?.color.clone() ?? null;
  }

  updateEmbers(dt) {
    if (!this.emberPts) return;
    this.emberK = Math.max(0, Math.min(1, this.emberK + (this.emberOn ? dt / 2 : -dt / 3)));
    const k = this.emberK;
    this.emberMat.opacity = 0.9 * k;
    const sky = new THREE.Color(0x8a3a12);
    if (this.skyBase) this.scene.background.copy(this.skyBase).lerp(sky, k * 0.75);
    if (this.fogBase) this.scene.fog.color.copy(this.fogBase).lerp(sky, k * 0.75);
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
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const m = new THREE.Mesh(unitBox, mat);
    m.scale.set(width, width, from.distanceTo(to));
    m.position.copy(from).lerp(to, 0.5);
    m.lookAt(to);
    // Thick (rail) shots linger and shrink; thin bullets just blink.
    const life = width > 0.2 ? 0.35 : 0.08;
    this.add(m, life, mat, (it, k) => {
      mat.opacity = 0.95 * k;
      if (width > 0.2) m.scale.set(width * k, width * k, m.scale.z);
    });
  }

  flash(pos, color = 0xfff3b0, size = 0.7) {
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
    m.scale.set(0.5, 0.5, 1.0);
    const start = from.clone();
    this.add(m, time, mat, (it, k) => {
      const f = 1 - k;
      m.position.lerpVectors(start, to, f).setY(start.y + (to.y - start.y) * f * f);
      m.rotation.x = f * 1.2;
    });
  }

  /** A homing missile from `from` to wherever `target()` is, arriving after `time`. */
  missile(from, target, time, color = 0xff6d00, size = 1) {
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

  /** A thrown grenade or mortar shell flying in an arc from `from` to `to` over `time` seconds. */
  lob(from, to, time, { color = 0x33691e, size = 0.5, arc = 4, glowing = false } = {}) {
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
    const from = new THREE.Vector3(at.x - 60, 14, at.z - 20);
    const to = new THREE.Vector3(at.x + 60, 14, at.z + 20);
    this.add(g, 3, null, (it, k, dt) => {
      g.position.lerpVectors(from, to, 1 - k);
      g.lookAt(to);
      rotor.rotation.y += dt * 30;
    });
  }

  /** Smoke bomb: a grey cloud of radius r that hangs around for `time` seconds. */
  smoke(at, r, time) {
    for (let i = 0; i < 14; i++) {
      const mat = new THREE.MeshLambertMaterial({ color: i % 2 ? 0xbdbdbd : 0x9e9e9e, transparent: true, opacity: 0, depthWrite: false });
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
    const mat = new THREE.SpriteMaterial({ map: textTexture(str, color), transparent: true, depthTest: false });
    const sp = new THREE.Sprite(mat);
    sp.position.copy(pos);
    sp.scale.set(size * 2.67, size, 1);
    sp.renderOrder = 20;
    this.add(sp, 1.0, mat, (it, k, dt) => {
      sp.position.y += 4 * dt;
      mat.opacity = Math.min(1, k * 2.5);
    });
  }

  update(dt) {
    this.updateEmbers(dt);
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
