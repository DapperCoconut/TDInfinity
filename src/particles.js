import * as THREE from 'three';

/**
 * Blocky particles (Visuals 2.0 part 3): every particle is a cube in one InstancedMesh, so
 * thousands cost a single draw call. Nothing fades by transparency: cubes shrink away and their
 * color runs through up to three stops, which keeps the chunky look of the rest of the game.
 *
 * CubePool: free-flying cubes (fire, sparks, debris, smoke, decals).
 * StreakPool: stretched boxes between two points (bullets, bullet trails, beams, lightning).
 */

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const streakGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5); // grows from its origin along +Z

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const _z = new THREE.Vector3(0, 0, 1);
const _d = new THREE.Vector3();

// Cube layout (floats per particle).
const N = 36;
const PX = 0, PY = 1, PZ = 2, VX = 3, VY = 4, VZ = 5, AGE = 6, LIFE = 7, S0 = 8, S1 = 9, GRAV = 10, DRAG = 11;
const RX = 12, RY = 13, RZ = 14, WX = 15, WY = 16, WZ = 17, C0 = 18, C1 = 21, C2 = 24, AX = 27, AY = 28, AZ = 29;
const FLOOR = 30, IN = 31, OUT = 32, MID = 33, BOUNCE = 34, GROW = 35;

/** Default options for CubePool.spawn (also documents them). */
const DEF = {
  grav: 0, // downward pull (negative: rises)
  drag: 0, // speed lost per second (x of itself)
  spin: 0, // tumbling speed (radians/s, random axis); null keeps it axis-aligned and still
  floor: null, // y of the ground it bounces on (null: falls through)
  bounce: 0.35, // how much speed a bounce keeps
  in: 0, // share of its life spent popping up to full size
  out: 0.5, // share of its life spent shrinking away
  mid: 0.4, // where the middle color sits (0..1)
  grow: 1, // size curve: 1 = straight line from s0 to s1, 3 = swells fast then holds
  ax: 1, ay: 1, az: 1, // box proportions (shards, flat decals)
  delay: 0, // seconds before it appears
  yaw: null, // fixed facing (with spin 0): turn around Y
};

function makeMesh(material, max, parent, order) {
  const mesh = new THREE.InstancedMesh(material.userData.geo ?? boxGeo, material, max);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.count = 0;
  mesh.renderOrder = order;
  mesh.matrixAutoUpdate = false;
  parent.add(mesh);
  return mesh;
}

const MATS = {
  lit: () => new THREE.MeshLambertMaterial({ color: 0xffffff }),
  glow: () => new THREE.MeshBasicMaterial({ color: 0xffffff }),
  add: () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }),
};

export class CubePool {
  /** kind: 'lit' (shaded solids), 'glow' (unlit, full bright) or 'add' (see-through light). */
  constructor(parent, kind, max) {
    this.max = max;
    this.n = 0;
    this.data = new Float32Array(max * N);
    this.material = MATS[kind]();
    this.mesh = makeMesh(this.material, max, parent, kind === 'add' ? 12 : 0);
  }

  /** How full the pool is (0..1). */
  get load() {
    return this.n / this.max;
  }

  /**
   * One cube at (x, y, z) moving at (vx, vy, vz), living `life` seconds, `s0` wide at first and
   * `s1` at the end, colored c0 -> c1 -> c2 (hex; leave c1 / c2 out to keep the color).
   */
  spawn(x, y, z, vx, vy, vz, life, s0, s1, c0, c1, c2, o = DEF) {
    if (this.n >= this.max) return;
    const d = this.data;
    const i = this.n++ * N;
    d[i + PX] = x; d[i + PY] = y; d[i + PZ] = z;
    d[i + VX] = vx; d[i + VY] = vy; d[i + VZ] = vz;
    d[i + AGE] = -(o.delay ?? 0);
    d[i + LIFE] = life;
    d[i + S0] = s0; d[i + S1] = s1;
    d[i + GRAV] = o.grav ?? 0;
    d[i + DRAG] = o.drag ?? 0;
    const spin = o.spin ?? 0;
    if (o.yaw != null) {
      d[i + RX] = 0; d[i + RY] = o.yaw; d[i + RZ] = 0;
    } else if (o.spin === null) {
      d[i + RX] = d[i + RY] = d[i + RZ] = 0;
    } else {
      d[i + RX] = Math.random() * 6.28; d[i + RY] = Math.random() * 6.28; d[i + RZ] = Math.random() * 6.28;
    }
    d[i + WX] = (Math.random() - 0.5) * 2 * spin; d[i + WY] = (Math.random() - 0.5) * 2 * spin; d[i + WZ] = (Math.random() - 0.5) * 2 * spin;
    _c.setHex(c0);
    d[i + C0] = _c.r; d[i + C0 + 1] = _c.g; d[i + C0 + 2] = _c.b;
    if (c1 != null) _c.setHex(c1);
    d[i + C1] = _c.r; d[i + C1 + 1] = _c.g; d[i + C1 + 2] = _c.b;
    if (c2 != null) _c.setHex(c2);
    d[i + C2] = _c.r; d[i + C2 + 1] = _c.g; d[i + C2 + 2] = _c.b;
    d[i + AX] = o.ax ?? 1; d[i + AY] = o.ay ?? 1; d[i + AZ] = o.az ?? 1;
    d[i + FLOOR] = o.floor ?? -1e9;
    d[i + IN] = o.in ?? 0;
    d[i + OUT] = o.out ?? 0.5;
    d[i + MID] = o.mid ?? 0.4;
    d[i + BOUNCE] = o.bounce ?? 0.35;
    d[i + GROW] = o.grow ?? 1;
  }

  update(dt) {
    const d = this.data;
    const mat = this.mesh.instanceMatrix.array;
    const col = this.mesh.instanceColor.array;
    let n = this.n;
    for (let k = 0; k < n; k++) {
      let i = k * N;
      let age = d[i + AGE] + dt;
      while (age >= d[i + LIFE] && n > 0) {
        // Dead: the last live cube takes its place.
        n--;
        if (k >= n) break;
        d.copyWithin(i, n * N, n * N + N);
        age = d[i + AGE] + dt;
      }
      if (k >= n) break;
      d[i + AGE] = age;
      const o = k * 16;
      if (age < 0) {
        // Not out yet: a zero-size cube draws nothing.
        mat.fill(0, o, o + 16);
        continue;
      }
      const life = d[i + LIFE];
      const t = age / life;
      const drag = Math.max(0, 1 - d[i + DRAG] * dt);
      d[i + VX] *= drag; d[i + VZ] *= drag;
      d[i + VY] = d[i + VY] * drag - d[i + GRAV] * dt;
      d[i + PX] += d[i + VX] * dt; d[i + PY] += d[i + VY] * dt; d[i + PZ] += d[i + VZ] * dt;
      const g = d[i + GROW];
      const e = g === 1 ? t : 1 - (1 - t) ** g;
      let size = d[i + S0] + (d[i + S1] - d[i + S0]) * e;
      const fin = d[i + IN];
      const fout = d[i + OUT];
      if (fin > 0 && t < fin) size *= t / fin;
      if (fout > 0 && 1 - t < fout) size *= (1 - t) / fout;
      const sy = size * d[i + AY];
      const floor = d[i + FLOOR];
      if (d[i + PY] - sy / 2 < floor) {
        d[i + PY] = floor + sy / 2;
        const b = d[i + BOUNCE];
        d[i + VY] = Math.abs(d[i + VY]) * b;
        d[i + VX] *= 0.6; d[i + VZ] *= 0.6;
        d[i + WX] *= 0.5; d[i + WY] *= 0.5; d[i + WZ] *= 0.5;
      }
      d[i + RX] += d[i + WX] * dt; d[i + RY] += d[i + WY] * dt; d[i + RZ] += d[i + WZ] * dt;
      _e.set(d[i + RX], d[i + RY], d[i + RZ]);
      _q.setFromEuler(_e);
      _p.set(d[i + PX], d[i + PY], d[i + PZ]);
      _s.set(size * d[i + AX], sy, size * d[i + AZ]);
      _m.compose(_p, _q, _s);
      _m.toArray(mat, o);
      const mid = d[i + MID];
      const c = k * 3;
      if (t < mid) {
        const f = t / mid;
        col[c] = d[i + C0] + (d[i + C1] - d[i + C0]) * f;
        col[c + 1] = d[i + C0 + 1] + (d[i + C1 + 1] - d[i + C0 + 1]) * f;
        col[c + 2] = d[i + C0 + 2] + (d[i + C1 + 2] - d[i + C0 + 2]) * f;
      } else {
        const f = (t - mid) / (1 - mid);
        col[c] = d[i + C1] + (d[i + C2] - d[i + C1]) * f;
        col[c + 1] = d[i + C1 + 1] + (d[i + C2 + 1] - d[i + C1 + 1]) * f;
        col[c + 2] = d[i + C1 + 2] + (d[i + C2 + 2] - d[i + C1 + 2]) * f;
      }
    }
    this.n = n;
    this.mesh.count = n;
    if (n || this.dirty) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.mesh.instanceColor.needsUpdate = true;
    }
    this.dirty = n > 0;
  }

  clear() {
    this.n = 0;
    this.mesh.count = 0;
  }

  dispose() {
    this.mesh.removeFromParent();
    this.mesh.dispose();
    this.material.dispose();
  }
}

// Streak layout.
const M = 24;
const OX = 0, OY = 1, OZ = 2, DX = 3, DY = 4, DZ = 5, QX = 6, DIST = 10, SAGE = 11, TRAVEL = 12, LEN = 13, W = 14, FADE = 15, MODE = 16;
const SC0 = 17, SC1 = 20, SROLL = 23;
export const BULLET = 0; // a short slug flying from a to b
export const TRAIL = 1; // a line drawn behind a slug, thinning out once it lands
export const BEAM = 2; // the whole line at once, thinning out

export class StreakPool {
  constructor(parent, kind, max) {
    this.max = max;
    this.n = 0;
    this.data = new Float32Array(max * M);
    this.material = MATS[kind]();
    this.material.userData.geo = streakGeo;
    this.mesh = makeMesh(this.material, max, parent, kind === 'add' ? 12 : 0);
  }

  /**
   * A streak from a to b. mode BULLET: a slug `len` long takes `travel` s to fly there. TRAIL: a
   * line follows the slug, then thins out over `fade` s. BEAM: the whole line, thinning over `fade`.
   * Colors run c0 -> c1 over its life. delay: seconds before it shows.
   */
  spawn(a, b, mode, w, c0, c1, { travel = 0.06, len = 3, fade = 0.15, delay = 0 } = {}) {
    if (this.n >= this.max) return;
    const d = this.data;
    const i = this.n++ * M;
    _d.subVectors(b, a);
    const dist = _d.length();
    if (dist > 1e-6) _d.divideScalar(dist);
    else _d.set(0, 0, 1);
    _q.setFromUnitVectors(_z, _d);
    d[i + OX] = a.x; d[i + OY] = a.y; d[i + OZ] = a.z;
    d[i + DX] = _d.x; d[i + DY] = _d.y; d[i + DZ] = _d.z;
    d[i + QX] = _q.x; d[i + QX + 1] = _q.y; d[i + QX + 2] = _q.z; d[i + QX + 3] = _q.w;
    d[i + DIST] = dist;
    d[i + SAGE] = -delay;
    d[i + TRAVEL] = mode === BEAM ? 0 : travel;
    d[i + LEN] = len;
    d[i + W] = w;
    d[i + FADE] = fade;
    d[i + MODE] = mode;
    _c.setHex(c0);
    d[i + SC0] = _c.r; d[i + SC0 + 1] = _c.g; d[i + SC0 + 2] = _c.b;
    if (c1 != null) _c.setHex(c1);
    d[i + SC1] = _c.r; d[i + SC1 + 1] = _c.g; d[i + SC1 + 2] = _c.b;
    d[i + SROLL] = Math.random() < 0.5 ? 0 : Math.PI / 4;
  }

  update(dt) {
    const d = this.data;
    const mat = this.mesh.instanceMatrix.array;
    const col = this.mesh.instanceColor.array;
    let n = this.n;
    for (let k = 0; k < n; k++) {
      const i = k * M;
      let age = d[i + SAGE] + dt;
      while (age >= d[i + TRAVEL] + (d[i + MODE] === BULLET ? 0 : d[i + FADE]) && n > 0) {
        n--;
        if (k >= n) break;
        d.copyWithin(i, n * M, n * M + M);
        age = d[i + SAGE] + dt;
      }
      if (k >= n) break;
      d[i + SAGE] = age;
      const o = k * 16;
      if (age < 0) {
        mat.fill(0, o, o + 16);
        continue;
      }
      const mode = d[i + MODE];
      const dist = d[i + DIST];
      const travel = d[i + TRAVEL];
      const head = travel > 0 ? dist * Math.min(1, age / travel) : dist;
      let tail = 0;
      let w = d[i + W];
      let f = 0; // 0..1 through the fade
      if (mode === BULLET) tail = Math.max(0, head - d[i + LEN]);
      else if (age > travel) {
        f = (age - travel) / d[i + FADE];
        w *= 1 - f;
        if (mode === TRAIL) tail = dist * Math.min(1, f * 1.4); // the smoke line is eaten up from the gun's end
      }
      _p.set(d[i + OX] + d[i + DX] * tail, d[i + OY] + d[i + DY] * tail, d[i + OZ] + d[i + DZ] * tail);
      _q.set(d[i + QX], d[i + QX + 1], d[i + QX + 2], d[i + QX + 3]);
      _s.set(w, w, Math.max(0.001, head - tail));
      _m.compose(_p, _q, _s);
      _m.toArray(mat, o);
      const c = k * 3;
      col[c] = d[i + SC0] + (d[i + SC1] - d[i + SC0]) * f;
      col[c + 1] = d[i + SC0 + 1] + (d[i + SC1 + 1] - d[i + SC0 + 1]) * f;
      col[c + 2] = d[i + SC0 + 2] + (d[i + SC1 + 2] - d[i + SC0 + 2]) * f;
    }
    this.n = n;
    this.mesh.count = n;
    if (n || this.dirty) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.mesh.instanceColor.needsUpdate = true;
    }
    this.dirty = n > 0;
  }

  clear() {
    this.n = 0;
    this.mesh.count = 0;
  }

  dispose() {
    this.mesh.removeFromParent();
    this.mesh.dispose();
    this.material.dispose();
  }
}
