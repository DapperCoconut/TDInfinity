import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Vehicle kit: what the mechanical summons (jeeps, Humvees, APCs, tanks, mechs...) are built from.
//
// A detailed vehicle is hundreds of small pieces. Drawing each as its own mesh would cost a draw
// call apiece, so the pieces are *batched*: a kit collects them, bakes each one's colour into its
// vertices and merges everything that moves together into one mesh. A whole tank is then about
// eight draw calls (hull, turret, wheels, treads, a glow or two) however much detail it carries.
//
//   const k = kit(u, parent, 'tank:hull');   // `u` is a makeThing() model, `parent` a group on it
//   k.box(...); k.cyl(...); k.prism(...);     // colour = a hex (baked) or a Material (glow parts)
//   k.done();                                 // adds the merged mesh(es) to `parent`
//
// The merged geometry is cached under the key, so the second tank of a kind costs nothing to
// build (the kit's shape calls do nothing once its key is cached) and nothing is left behind on
// the GPU when units die: views only dispose a model's materials. A key must therefore name
// everything that changes the shape or its colours (model name + which part).
//
// Vehicles face +Z; y is up; x is the vehicle's left/right. Sizes are in model units (a soldier
// is ~5.2 tall before the unit scale).

const _c = new THREE.Color();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const PI = Math.PI;

/** `hex` made darker (f < 1) or lighter (f > 1). */
export function tone(hex, f) {
  _c.setHex(hex).multiplyScalar(f);
  _c.r = Math.min(1, _c.r);
  _c.g = Math.min(1, _c.g);
  _c.b = Math.min(1, _c.b);
  return _c.getHex();
}

function paint(g, hex) {
  _c.setHex(hex);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a[i * 3] = _c.r;
    a[i * 3 + 1] = _c.g;
    a[i * 3 + 2] = _c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
}

/** Turns a fresh geometry into a batch piece: unindexed, coloured, moved into place. */
function bake(geo, col, x, y, z, o) {
  let g = geo;
  if (geo.index) {
    g = geo.toNonIndexed();
    geo.dispose();
  }
  g.deleteAttribute('uv');
  if (o?.flat) g.computeVertexNormals();
  _q.setFromEuler(_e.set(o?.rx || 0, o?.ry || 0, o?.rz || 0));
  g.applyMatrix4(_m.compose(_p.set(x, y, z), _q, _s.set(o?.sx ?? 1, o?.sy ?? 1, o?.sz ?? 1)));
  if (col != null) paint(g, col);
  return g;
}

/** Collects pieces and merges them. With `skip` (the result is already cached) every shape call does nothing. */
class Batch {
  constructor(skip = false) {
    this.skip = skip;
    this.vc = []; // pieces drawn with baked vertex colours
    this.byMat = new Map(); // Material -> pieces drawn with that material (glow parts)
    this.mats = []; // materials in the order they were first used
  }

  /** Notes a material; true when the batch is cached and the piece can be skipped. */
  _slot(col) {
    if (col?.isMaterial && !this.mats.includes(col)) this.mats.push(col);
    return this.skip;
  }

  _add(geo, col, x = 0, y = 0, z = 0, o) {
    if (col?.isMaterial) {
      let list = this.byMat.get(col);
      if (!list) this.byMat.set(col, (list = []));
      list.push(bake(geo, 0xffffff, x, y, z, o));
    } else this.vc.push(bake(geo, col, x, y, z, o));
    return this;
  }

  /** A box. o.r rounds its edges (keep that for big pieces: it costs triangles). */
  box(w, h, d, col, x, y, z, o) {
    if (this._slot(col)) return this;
    const r = o?.r ? Math.min(o.r, Math.min(w, h, d) / 2 - 0.005) : 0;
    return this._add(r > 0.01 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d), col, x, y, z, o);
  }

  /**
   * A box whose top and bottom faces differ: the top is scaled by (tw, td) and shifted by
   * (tx, tz), the bottom by (bw, bd) and (bx, bz). Sloped armour, wedges, V-hulls, cab roofs.
   */
  slab(w, h, d, col, x, y, z, o = {}) {
    if (this._slot(col)) return this;
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const top = p.getY(i) > 0;
      p.setX(i, p.getX(i) * (top ? o.tw ?? 1 : o.bw ?? 1) + (top ? o.tx ?? 0 : o.bx ?? 0));
      p.setZ(i, p.getZ(i) * (top ? o.td ?? 1 : o.bd ?? 1) + (top ? o.tz ?? 0 : o.bz ?? 0));
    }
    return this._add(g, col, x, y, z, { ...o, flat: true });
  }

  /** A cylinder / cone along o.axis ('y' default, 'x', 'z'), centred on (x, y, z). r at the low end, o.r2 at the high end. */
  cyl(r, len, col, x, y, z, o) {
    if (this._slot(col)) return this;
    const g = new THREE.CylinderGeometry(o?.r2 ?? r, r, len, o?.seg ?? 12, 1, !!o?.open);
    if (o?.axis === 'z') g.rotateX(PI / 2);
    else if (o?.axis === 'x') g.rotateZ(-PI / 2);
    return this._add(g, col, x, y, z, o);
  }

  ball(r, col, x, y, z, o) {
    if (this._slot(col)) return this;
    return this._add(new THREE.SphereGeometry(r, o?.seg ?? 10, o?.rows ?? 7), col, x, y, z, o);
  }

  /** A ring (its hole along z unless rotated). */
  torus(R, r, col, x, y, z, o) {
    if (this._slot(col)) return this;
    return this._add(new THREE.TorusGeometry(R, r, 6, o?.seg ?? 14, o?.arc ?? PI * 2), col, x, y, z, o);
  }

  /**
   * A side profile [[z, y], ...] extruded across the vehicle (`width` along x, centred on x).
   * o.holes: profiles cut out of it; o.bevel chamfers the two side edges.
   */
  prism(pts, width, col, x, y, z, o) {
    if (this._slot(col)) return this;
    const sh = new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(a, b)));
    for (const h of o?.holes ?? []) sh.holes.push(new THREE.Path(h.map(([a, b]) => new THREE.Vector2(a, b))));
    const bv = Math.min(o?.bevel ?? 0, width / 2 - 0.01);
    const depth = width - 2 * bv;
    const g = new THREE.ExtrudeGeometry(sh, bv > 0 ? { depth, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelOffset: -bv, bevelSegments: 1 } : { depth, bevelEnabled: false });
    g.rotateY(-PI / 2).translate(depth / 2, 0, 0);
    return this._add(g, col, x, y, z, o);
  }

  /**
   * A top-down outline [[x, z], ...] extruded upward by `h` from y. o.bevel slopes the top and
   * bottom edges in (faceted turrets, hatches, stars).
   */
  plan(pts, h, col, x, y, z, o) {
    if (this._slot(col)) return this;
    const sh = new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(a, -b)));
    const bv = Math.min(o?.bevel ?? 0, h / 2 - 0.005);
    const depth = h - 2 * bv;
    const size = o?.inset ?? bv;
    const g = new THREE.ExtrudeGeometry(sh, bv > 0 ? { depth, bevelEnabled: true, bevelThickness: bv, bevelSize: size, bevelOffset: -size, bevelSegments: 1 } : { depth, bevelEnabled: false });
    g.rotateX(-PI / 2).translate(0, bv, 0);
    return this._add(g, col, x, y, z, o);
  }

  /** A round pipe through 3D points [[x, y, z], ...] (roll bars, cables, hoses, rails). */
  tube(pts, r, col, o) {
    if (this._slot(col)) return this;
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])), false, 'catmullrom', o?.tension ?? 0.15);
    return this._add(new THREE.TubeGeometry(curve, o?.seg ?? pts.length * 4, r, o?.sides ?? 6, false), col, 0, 0, 0, o);
  }

  /** A ready-made geometry (already vertex-coloured, e.g. a spare wheel), placed like any other piece. */
  geo(g, x, y, z, o) {
    if (this.skip) return this;
    const c = g.clone();
    _q.setFromEuler(_e.set(o?.rx || 0, o?.ry || 0, o?.rz || 0));
    c.applyMatrix4(_m.compose(_p.set(x, y, z), _q, _s.set(o?.sx ?? 1, o?.sy ?? 1, o?.sz ?? 1)));
    this.vc.push(c);
    return this;
  }

  /** Merges the pieces: [{ geo, mi }] (mi = index into `mats`, -1 = vertex colours). */
  build() {
    const out = [];
    const merge = (list, mi) => {
      if (!list.length) return;
      const geo = mergeGeometries(list);
      for (const g of list) g.dispose();
      geo.userData.vc = mi < 0;
      out.push({ geo, mi });
    };
    merge(this.vc, -1);
    for (const [mat, list] of this.byMat) merge(list, this.mats.indexOf(mat));
    return out;
  }
}

const batchCache = new Map();

/** The one vertex-coloured material every batched piece of model `u` is drawn with. */
export function vcMat(u) {
  if (!u.vc) {
    u.vc = new THREE.MeshLambertMaterial({ vertexColors: true });
    u.vc.userData.vc = true;
    u.mats.push(u.vc);
  }
  return u.vc;
}

/** A glowing material on model `u` (give it to kit shapes instead of a colour). */
export function glowMat(u, color, intensity = 0.8) {
  const m = new THREE.MeshLambertMaterial({ color });
  m.userData.glow = color;
  m.emissive.setHex(color);
  m.emissiveIntensity = intensity;
  u.mats.push(m);
  return m;
}

/** A batch that ends up as merged meshes on `parent` (see the notes at the top of this file). */
export function kit(u, parent, key) {
  const cached = batchCache.get(key);
  const b = new Batch(!!cached);
  b.done = () => {
    let list = cached;
    if (!list) batchCache.set(key, (list = b.build()));
    const out = [];
    for (const { geo, mi } of list) {
      const mesh = new THREE.Mesh(geo, mi < 0 ? vcMat(u) : b.mats[mi]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      out.push(mesh);
    }
    return out;
  };
  return b;
}

function addMesh(u, parent, geo, x, y, z) {
  const mesh = new THREE.Mesh(geo, vcMat(u));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** A group on `parent` that units turn toward their target (u.turret). */
export function turretAt(u, parent, y, z = 0, x = 0) {
  const t = new THREE.Group();
  t.position.set(x, y, z);
  parent.add(t);
  u.turret = t;
  return t;
}

/** A gun muzzle (where tracers start). `cannon`: the unit's big gun (u.cannon) instead of its machine guns. */
export function muzzleAt(u, parent, x, y, z, cannon = false) {
  const m = new THREE.Object3D();
  m.position.set(x, y, z);
  parent.add(m);
  if (cannon) u.cannon = m;
  else u.muzzles.push(m);
  return m;
}

// ------------------------------------------------------------------ wheels

const TYRE = 0x15171a;
const TREAD = 0x25282c;
const RIM = 0x8a9096;
const geoCache = new Map();
function cachedGeo(key, make) {
  let g = geoCache.get(key);
  if (!g) geoCache.set(key, (g = make()));
  return g;
}

/**
 * One round wheel, its axle along x and its hub face toward +x (side 1) or -x (side -1): a
 * rounded tyre with tread lugs, a dished rim, a hub cap and wheel nuts, all in one geometry.
 * o: tyre, rim (colours), lugs (false = slick), nuts.
 */
export function wheelGeo(r, w, side = 1, o = {}) {
  const tyre = o.tyre ?? TYRE;
  const rim = o.rim ?? RIM;
  return cachedGeo(`w|${r}|${w}|${side}|${tyre}|${rim}|${o.lugs ?? 1}|${o.nuts ?? 5}`, () => {
    const b = new Batch();
    const P = (rad, ax) => new THREE.Vector2(rad * r, ax * w);
    // The whole cross-section, from the middle of the inner face round the tyre to the hub cap.
    const prof = [P(0.001, -0.38), P(0.6, -0.38), P(0.64, -0.5), P(0.88, -0.5), P(0.97, -0.4), P(1, -0.26), P(1, 0.26), P(0.97, 0.4), P(0.88, 0.5), P(0.64, 0.5), P(0.6, 0.44), P(0.52, 0.44), P(0.44, 0.2), P(0.2, 0.2), P(0.17, 0.4), P(0.001, 0.42)];
    const lathe = new THREE.LatheGeometry(prof, o.seg ?? 16).toNonIndexed();
    lathe.deleteAttribute('uv');
    const p = lathe.attributes.position;
    const col = new Float32Array(p.count * 3);
    const cT = new THREE.Color(tyre);
    const cR = new THREE.Color(rim);
    const cD = new THREE.Color(tone(rim, 0.55));
    for (let i = 0; i < p.count; i++) {
      const rad = Math.hypot(p.getX(i), p.getZ(i)) / r;
      const ax = p.getY(i) / w;
      const c = rad > 0.62 ? cT : ax < 0 || (rad > 0.19 && rad < 0.5) ? cD : cR;
      col.set([c.r, c.g, c.b], i * 3);
    }
    lathe.setAttribute('color', new THREE.BufferAttribute(col, 3));
    lathe.rotateZ(side > 0 ? -PI / 2 : PI / 2);
    b.vc.push(lathe);
    if (o.lugs !== false) {
      const n = Math.max(10, Math.min(18, Math.round((2 * PI * r) / 0.4)));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * PI * 2;
        b.box(w * 0.46, 0.05 + r * 0.05, (PI * r) / n, tyre === TYRE ? TREAD : tone(tyre, 1.35), (i % 2 ? 1 : -1) * w * 0.24, Math.cos(a) * r, Math.sin(a) * r, { rx: a });
      }
    }
    const nuts = o.nuts ?? 5;
    for (let i = 0; i < nuts; i++) {
      const a = (i / nuts) * PI * 2;
      b.cyl(r * 0.055, w * 0.14, tone(rim, 1.25), side * w * 0.24, Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32, { axis: 'x', seg: 6 });
    }
    return b.build()[0].geo;
  });
}

/** Both wheels of one axle (`half` = distance from the centre line to each wheel) with the axle between them. */
function axleGeo(r, w, half, o = {}) {
  return cachedGeo(`a|${r}|${w}|${half}|${o.tyre ?? TYRE}|${o.rim ?? RIM}|${o.lugs ?? 1}|${o.nuts ?? 5}`, () => {
    const b = new Batch();
    b.geo(wheelGeo(r, w, 1, o), half, 0, 0);
    b.geo(wheelGeo(r, w, -1, o), -half, 0, 0);
    b.cyl(r * 0.13, half * 2, 0x2a2d31, 0, 0, 0, { axis: 'x', seg: 8 });
    b.ball(r * 0.3, 0x2a2d31, 0, 0, 0, { seg: 8, rows: 5 }); // differential
    return b.build()[0].geo;
  });
}

/** Adds a spinning axle with two round wheels to model `u` (u.wheels). */
export function axle(u, parent, half, y, z, r, w = r * 0.8, o) {
  const mesh = addMesh(u, parent, axleGeo(r, w, half, o), 0, y, z);
  mesh.userData.r = r * (parent.scale?.x ?? 1);
  (u.wheels ??= []).push(mesh);
  return mesh;
}

/** Adds one spinning round wheel at x (hub facing outward). */
export function wheel(u, parent, x, y, z, r, w = r * 0.8, o) {
  const mesh = addMesh(u, parent, wheelGeo(r, w, x < 0 ? -1 : 1, o), x, y, z);
  mesh.userData.r = r * (parent.scale?.x ?? 1);
  (u.wheels ??= []).push(mesh);
  return mesh;
}

// ------------------------------------------------------------------ tracks

/** The outline of a track [[z, y], ...], `t` inside the outer face: sprocket, road run, idler, top run. */
function trackLoop(len, h, t = 0) {
  const R = h * 0.4 - t;
  const zc = len / 2 - h * 0.4;
  const yc = h * 0.6;
  const zb = len / 2 - h * 0.95 - t * 0.3;
  const pts = [];
  for (let a = 90; a <= 235; a += 14.5) pts.push([-zc + R * Math.cos((a * PI) / 180), yc + R * Math.sin((a * PI) / 180)]);
  pts.push([-zb, t], [zb, t]);
  for (let a = 305; a <= 450; a += 14.5) pts.push([zc + R * Math.cos((a * PI) / 180), yc + R * Math.sin((a * PI) / 180)]);
  return pts;
}

function sprocketGeo(R, w, half, hub, teeth) {
  return cachedGeo(`s|${R}|${w}|${half}|${hub}|${teeth}`, () => {
    const b = new Batch();
    for (const s of [-1, 1]) {
      b.cyl(R * 0.78, w * 0.62, 0x2b2e31, s * half, 0, 0, { axis: 'x', seg: 12 });
      b.cyl(R * 0.6, w * 0.78, hub, s * half, 0, 0, { axis: 'x', seg: 12 });
      b.cyl(R * 0.22, w * 0.9, tone(hub, 0.6), s * half, 0, 0, { axis: 'x', seg: 8 });
      for (let i = 0; i < 5; i++) b.cyl(R * 0.07, w * 0.84, tone(hub, 1.3), s * half, Math.cos(i * 1.2566) * R * 0.4, Math.sin(i * 1.2566) * R * 0.4, { axis: 'x', seg: 5 });
      if (teeth) for (let i = 0; i < 10; i++) b.box(w * 0.66, R * 0.3, R * 0.22, 0x3a3d40, s * half, Math.cos(i * 0.6283) * R * 0.86, Math.sin(i * 0.6283) * R * 0.86, { rx: i * 0.6283 });
    }
    b.cyl(R * 0.14, half * 2, 0x232528, 0, 0, 0, { axis: 'x', seg: 6 });
    return b.build()[0].geo;
  });
}

/**
 * A pair of tank tracks on model `u`. The belts, road wheels, return rollers and the cleats on
 * the ground go into kit `k` (static); the drive sprockets and idlers spin (u.wheels) and the
 * cleats along the top run crawl forward (u.treads), so a moving tank's tracks visibly turn.
 * o: x (centre line to track centre), len, h, w, n (road wheels), y (bottom), z, hub (wheel colour).
 */
export function tracks(u, k, parent, o) {
  const { x, len, h, w, n = 5, y = 0, z = 0, hub = 0x4a4f45, belt = 0x1b1c1f } = o;
  const thk = h * 0.085;
  const sc = parent.scale?.x ?? 1;
  const loop = trackLoop(len, h);
  const zc = len / 2 - h * 0.4;
  const zb = len / 2 - h * 0.95;
  const pitch = Math.max(0.26, h * 0.24);
  const cleat = tone(belt, 1.75);
  if (!k.skip) {
    const inner = trackLoop(len, h, thk);
    for (const s of [-1, 1]) {
      k.prism(loop, w, belt, s * x, y, z, { holes: [inner] });
      // road wheels: rubber tyre, painted dish, hub
      const rw = Math.min(h * 0.3, ((zb * 2) / n) * 0.52);
      for (let i = 0; i < n; i++) {
        const wz = z + (n === 1 ? 0 : -zb + rw * 0.75 + ((zb * 2 - rw * 1.5) * i) / (n - 1));
        k.cyl(rw, w * 0.7, 0x1d1f22, s * x, y + thk + rw, wz, { axis: 'x', seg: 12 });
        k.cyl(rw * 0.74, w * 0.76, hub, s * x, y + thk + rw, wz, { axis: 'x', seg: 12 });
        k.cyl(rw * 0.28, w * 0.86, tone(hub, 0.6), s * x, y + thk + rw, wz, { axis: 'x', seg: 8 });
      }
      // return rollers under the top run
      const rr = h * 0.1;
      for (const f of [-0.45, 0, 0.45]) k.cyl(rr, w * 0.72, tone(hub, 0.75), s * x, y + h - thk - rr, z + f * zc * 1.5, { axis: 'x', seg: 8 });
      // cleats everywhere but the top run (those move)
      let carry = 0;
      for (let i = 0; i < loop.length - 1; i++) {
        const [z0, y0] = loop[i];
        const [z1, y1] = loop[i + 1];
        const seg = Math.hypot(z1 - z0, y1 - y0);
        const rx = Math.atan2(-(y1 - y0), z1 - z0);
        let d = carry;
        for (; d < seg; d += pitch) {
          const f = d / seg;
          k.box(w * 1.04, thk * 0.9, pitch * 0.5, cleat, s * x, y + y0 + (y1 - y0) * f, z + z0 + (z1 - z0) * f, { rx });
        }
        carry = d - seg;
      }
    }
  }
  // drive sprocket (front) and idler (rear): they spin
  const R = h * 0.4 - thk * 1.15;
  for (const [f, teeth] of [[1, true], [-1, false]]) {
    const m = addMesh(u, parent, sprocketGeo(R, w, x, hub, teeth), 0, y + h * 0.6, z + f * zc);
    m.userData.r = R * sc;
    (u.wheels ??= []).push(m);
  }
  // crawling top run
  const count = Math.max(1, Math.floor((zc * 2) / pitch));
  const top = cachedGeo(`t|${x}|${len}|${h}|${w}|${belt}`, () => {
    const b = new Batch();
    for (const s of [-1, 1]) for (let i = 0; i < count; i++) b.box(w * 1.04, thk * 0.9, pitch * 0.5, cleat, s * x, 0, -zc + i * pitch);
    return b.build()[0].geo;
  });
  const mesh = addMesh(u, parent, top, 0, y + h, z);
  (u.treads ??= []).push({ mesh, pitch, z0: z, sc, phase: 0 });
}

// ------------------------------------------------------------------ detail parts

const GLASS = 0x9fd3f2;
const STEEL = 0x8f969c;
const GUN = 0x1d1f22;
const DARK = 0x23262a;

/** Side profile for prism(): `top` runs from the rear-bottom corner along the roofline to the front-bottom corner; wheel arches [[z, R], ...] are cut into the underside round axle height `ya`. */
export function profile(top, arches = [], ya = 0.6) {
  const pts = top.map((p) => [p[0], p[1]]);
  const yb = top[top.length - 1][1];
  for (const [zc, R] of [...arches].sort((a, b) => b[0] - a[0])) {
    const a0 = Math.asin(Math.min(1, Math.max(0, (yb - ya) / R)));
    for (let i = 0; i <= 7; i++) {
      const a = a0 + ((PI - 2 * a0) * i) / 7;
      pts.push([zc + R * Math.cos(a), ya + R * Math.sin(a)]);
    }
  }
  return pts;
}

/** A round lamp facing +z (headlight) or -z (dir -1): housing and lens. */
export function lamp(k, x, y, z, r, lens = 0xfff3b0, dir = 1, housing = DARK) {
  k.cyl(r * 1.25, 0.14, housing, x, y, z, { axis: 'z', seg: 10 });
  k.cyl(r, 0.06, lens, x, y, z + dir * 0.08, { axis: 'z', seg: 10 });
}

/** A grille facing +z: a dark panel with `n` slats (vertical unless o.h). */
export function grille(k, x, y, z, w, h, n, col, o) {
  k.box(w, h, 0.06, 0x16181a, x, y, z);
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0 : i / (n - 1) - 0.5;
    if (o?.h) k.box(w, (h / n) * 0.45, 0.05, col, x, y + f * (h - h / n), z + 0.04);
    else k.box((w / n) * 0.45, h, 0.05, col, x + f * (w - w / n), y, z + 0.04);
  }
}

/** Louvres on a deck (flat, facing up): slats across x. */
export function louvres(k, x, y, z, w, d, n, col = 0x16181a) {
  for (let i = 0; i < n; i++) k.box(w, 0.05, (d / n) * 0.55, col, x, y, z - d / 2 + ((i + 0.5) * d) / n, { rx: 0.35 });
}

/** A round hatch on a roof: lid, hinge and handle. */
export function hatch(k, x, y, z, r, col) {
  k.cyl(r, 0.1, col, x, y + 0.05, z, { seg: 12 });
  k.cyl(r * 0.8, 0.05, tone(col, 0.82), x, y + 0.11, z, { seg: 12 });
  k.box(r * 0.7, 0.08, 0.14, tone(col, 0.6), x, y + 0.1, z - r * 0.95);
  k.box(0.3, 0.07, 0.06, DARK, x, y + 0.17, z + r * 0.3);
}

/** A whip aerial with its spring base. */
export function antenna(k, x, y, z, h, lean = 0.06) {
  k.cyl(0.07, 0.22, DARK, x, y + 0.11, z, { seg: 6 });
  k.cyl(0.045, 0.16, 0x3a3d40, x, y + 0.3, z, { seg: 6 });
  k.cyl(0.018, h, 0x121314, x, y + 0.38 + h / 2, z - (Math.sin(lean) * h) / 2, { seg: 4, rx: -lean });
  k.ball(0.045, 0x121314, x, y + 0.38 + h, z - Math.sin(lean) * h, { seg: 5, rows: 4 });
}

/**
 * A gun barrel along +z from z0. o: r2 (muzzle radius), brake (muzzle brake), sleeve (thermal
 * jacket), evac (bore evacuator at this fraction of the length), col.
 */
export function barrel(k, x, y, z0, len, r, col, o = {}) {
  k.cyl(r, len, col, x, y, z0 + len / 2, { axis: 'z', r2: o.r2 ?? r * 0.88, seg: o.seg ?? 10 });
  if (o.sleeve) for (const f of [0.18, 0.42]) k.cyl(r * 1.14, len * 0.2, tone(col, 0.86), x, y, z0 + len * f, { axis: 'z', seg: 10 });
  if (o.evac) k.cyl(r * 1.5, len * 0.14, tone(col, 0.9), x, y, z0 + len * o.evac, { axis: 'z', seg: 10 });
  if (o.brake) {
    k.cyl(r * 1.45, r * 2.6, tone(col, 0.7), x, y, z0 + len - r * 1.5, { axis: 'z', seg: 10 });
    k.box(r * 3.1, r * 0.7, r * 0.9, 0x0e0f10, x, y, z0 + len - r * 1.5);
  }
  k.cyl(r * 0.6, 0.04, 0x050505, x, y, z0 + len + 0.005, { axis: 'z', seg: 8 }); // bore
}

/** A machine gun along +z from z: receiver, jacketed barrel, grips and an ammo box. `len` is its whole length. */
export function mgun(k, x, y, z, len, o = {}) {
  const s = o.s ?? 1;
  k.box(0.22 * s, 0.26 * s, len * 0.36, GUN, x, y, z + len * 0.18);
  k.cyl(0.085 * s, len * 0.3, 0x2c2f33, x, y + 0.02 * s, z + len * 0.5, { axis: 'z', seg: 8 });
  k.cyl(0.05 * s, len * 0.36, GUN, x, y + 0.02 * s, z + len * 0.82, { axis: 'z', seg: 6 });
  k.cyl(0.075 * s, 0.14 * s, 0x0e0f10, x, y + 0.02 * s, z + len - 0.07 * s, { axis: 'z', seg: 6 });
  for (const sx of [-1, 1]) k.box(0.05 * s, 0.2 * s, 0.05, 0x3b2a1c, x + sx * 0.08 * s, y, z - 0.06); // spade grips
  if (o.ammo !== false) {
    k.box(0.3 * s, 0.32 * s, 0.4 * s, o.ammoCol ?? 0x4b5a2a, x - 0.3 * s, y - 0.08 * s, z + len * 0.2, { r: 0.03 });
    k.box(0.1 * s, 0.05, 0.2 * s, 0xc8a24a, x - 0.13 * s, y + 0.06 * s, z + len * 0.22); // belt
  }
  if (o.sight !== false) k.box(0.05, 0.12 * s, 0.05, GUN, x, y + 0.2 * s, z + len * 0.3);
}

/** A jerrycan. */
export function jerry(k, x, y, z, col = 0x4b5a2a, o) {
  k.box(0.26, 0.62, 0.48, col, x, y, z, { r: 0.06, ...o });
  k.cyl(0.05, 0.1, DARK, x, y + 0.34, z + 0.14, { seg: 6 });
  k.box(0.06, 0.06, 0.24, tone(col, 0.7), x, y + 0.36, z - 0.05);
}

/** A stowage box with a lid and two latches, lying along z. */
export function crate(k, x, y, z, w, h, d, col) {
  k.box(w, h, d, col, x, y, z, { r: 0.03 });
  k.box(w * 1.04, h * 0.14, d * 1.03, tone(col, 0.8), x, y + h * 0.36, z);
  for (const f of [-0.28, 0.28]) k.box(0.06, h * 0.3, 0.06, DARK, x + (w / 2 + 0.02) * Math.sign(x || 1), y + h * 0.18, z + f * d);
}

/** A rolled tarp / bedroll across x with two straps. */
export function bedroll(k, x, y, z, len, r, col = 0x7a6f4f) {
  k.cyl(r, len, col, x, y, z, { axis: 'x', seg: 8 });
  for (const f of [-0.3, 0.3]) k.cyl(r * 1.08, 0.07, 0x3b2a1c, x + f * len, y, z, { axis: 'x', seg: 8 });
}

/** A five-pointed star lying flat (US Army style marking). */
export function star(k, x, y, z, r, col = 0xf2f2f2, o) {
  const pts = [];
  for (let i = 0; i < 10; i++) pts.push([Math.sin((i * PI) / 5) * (i % 2 ? r * 0.4 : r), Math.cos((i * PI) / 5) * (i % 2 ? r * 0.4 : r)]);
  k.plan(pts, 0.025, col, x, y, z, o);
}

/** A cluster of smoke grenade launchers angled outward on side `s`. */
export function smoke(k, x, y, z, s, n = 3, col = 0x3a3d40) {
  k.box(0.16, 0.34, 0.2 * n + 0.1, tone(col, 0.8), x, y, z);
  for (let i = 0; i < n; i++) k.cyl(0.085, 0.42, col, x + s * 0.16, y + 0.1, z + (i - (n - 1) / 2) * 0.21 + 0.1, { axis: 'z', seg: 6, ry: s * 0.6, rx: -0.5 });
}

/** A periscope block looking along +z (or turned by ry). */
export function periscope(k, x, y, z, col, ry = 0) {
  k.box(0.34, 0.2, 0.2, col, x, y + 0.1, z, { ry });
  k.box(0.26, 0.1, 0.03, 0x6fb7e6, x + Math.sin(ry) * 0.1, y + 0.12, z + Math.cos(ry) * 0.1, { ry });
}

/** A row of bolt heads between two points. */
export function bolts(k, a, b, n, col, r = 0.045) {
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0.5 : i / (n - 1);
    k.box(r * 2, r * 2, r * 2, col, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
  }
}

/** A wing mirror on a stalk, side s. */
export function mirror(k, x, y, z, s, col = DARK) {
  k.cyl(0.03, 0.5, col, x + s * 0.2, y, z, { axis: 'x', seg: 5 });
  k.box(0.06, 0.34, 0.24, col, x + s * 0.46, y + 0.05, z, { r: 0.02 });
  k.box(0.02, 0.26, 0.18, 0xb9d8ea, x + s * 0.46, y + 0.05, z - 0.03);
}

/** A tow shackle on a bumper, facing dir (+1 front, -1 rear). */
export function shackle(k, x, y, z, dir = 1, col = STEEL) {
  k.box(0.14, 0.2, 0.12, tone(col, 0.6), x, y, z);
  k.torus(0.1, 0.035, col, x, y - 0.02, z + dir * 0.1, { ry: PI / 2, seg: 8 });
}

export const PARTS = { GLASS, STEEL, GUN, DARK, TYRE };

/** An empty unit model (same fields as makeThing in models.js) for the builders in vehicleunits.js. */
export function unitBase() {
  const mats = [];
  const M = (color) => {
    const m = new THREE.MeshLambertMaterial({ color });
    mats.push(m);
    return m;
  };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  return { root, body, mats, M, muzzles: [], wheels: [], static: true };
}

