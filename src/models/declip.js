// Declip: nudges flat faces that sit on top of each other so they stop flickering.
// Run once over every finished model.

import * as THREE from 'three';

// ---------------------------------------------------------------- de-clipping
// Many models stack parts whose faces lie in (or very near) the same plane: a stripe flush with a
// body, a visor on a helmet, a badge on a plate. Those faces z-fight: from a normal camera distance
// the depth buffer can't tell them apart, so they flicker and poke through each other.
// declip() finds every pair of same-facing faces that overlap and are closer than CLIP_GAP, and
// moves the smaller part's face so it ends CLIP_PUSH in front of the bigger one (or, if it was
// meant to sit just behind it, CLIP_PUSH behind). Only that face moves: the part's own geometry is
// edited (never its scale), so it works for turned parts and parts with things hanging off them.
// Runs once when a tower model is built; edited geometries are cached, so rebuilding is cheap.
const CLIP_GAP = 0.02; // faces nearer than this (model units) fight at a distance
const CLIP_PUSH = 0.025; // how far apart they end up: enough for the depth buffer from far away
const CLIP_BEHIND = 0.004; // a face more than this behind the other was meant to be hidden behind it
const CLIP_PASSES = 16; // moving one face can line it up with another: repeat until clean
const clipGeoCache = new Map();
const _v = new THREE.Vector3();
const _e1 = new THREE.Vector3();
const _e2 = new THREE.Vector3();

/** Every visible mesh under `root`, with its model-space matrix and size. */
function clipMeshes(root) {
  const meshes = [];
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  root.traverse((m) => {
    if (!m.isMesh || !m.geometry?.attributes.position) return;
    for (let o = m; o && o !== root; o = o.parent) if (!o.visible) return;
    const toModel = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
    const g = m.geometry;
    // Sized once, before any face moves, so two equal parts can't keep swapping which is on top.
    g.computeBoundingBox();
    const size = g.boundingBox.getSize(new THREE.Vector3()).multiply(new THREE.Vector3().setFromMatrixScale(toModel));
    meshes.push({ m, toModel, vol: Math.max(size.x, 1e-3) * Math.max(size.y, 1e-3) * Math.max(size.z, 1e-3), push: new Map() });
  });
  return meshes;
}

/** Every triangle of mesh number `mi`, in model space. */
function meshFaces(meshes, mi, out = []) {
  const { m, toModel } = meshes[mi];
  const pos = m.geometry.attributes.position;
  const idx = m.geometry.index;
  const n = idx ? idx.count : pos.count;
  for (let i = 0; i + 2 < n; i += 3) {
    const p = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(pos, idx ? idx.getX(i + k) : i + k).applyMatrix4(toModel));
    const nr = _e1.subVectors(p[1], p[0]).cross(_e2.subVectors(p[2], p[0]));
    const len = nr.length();
    if (len < 1e-6) continue;
    const normal = nr.clone().divideScalar(len);
    const [a, b, c] = p;
    out.push({ mi, ti: i, n: normal, d: normal.dot(a), p,
      x0: Math.min(a.x, b.x, c.x), x1: Math.max(a.x, b.x, c.x), y0: Math.min(a.y, b.y, c.y), y1: Math.max(a.y, b.y, c.y), z0: Math.min(a.z, b.z, c.z), z1: Math.max(a.z, b.z, c.z) });
  }
  return out;
}

/** How deep two triangles in the same plane overlap (0 if they only touch or are apart). */
function triOverlap(a, b, n) {
  let pen = Infinity;
  for (const T of [a, b]) {
    for (let i = 0; i < 3; i++) {
      const ax = _v.subVectors(T[(i + 1) % 3], T[i]).cross(n);
      const l = ax.length();
      if (l < 1e-9) continue;
      ax.divideScalar(l);
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (const q of a) { const s = q.dot(ax); a0 = Math.min(a0, s); a1 = Math.max(a1, s); }
      for (const q of b) { const s = q.dot(ax); b0 = Math.min(b0, s); b1 = Math.max(b1, s); }
      const o = Math.min(a1, b1) - Math.max(a0, b0);
      if (o <= 0.005) return 0;
      pen = Math.min(pen, o);
    }
  }
  return pen;
}

/** Moves every vertex of `mesh` that lies on model-space plane (n, d) by `dist` along n. */
function moveFace(mesh, n, d, dist) {
  const { m, toModel } = mesh;
  if (!m.userData.clipOwn) {
    m.userData.clipSrc = m.geometry;
    m.geometry = m.geometry.clone();
    m.userData.clipOwn = true;
  }
  const pos = m.geometry.attributes.position;
  // The same step in the part's own space (the linear part of model -> local).
  const local = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().copy(toModel).invert());
  const step = n.clone().multiplyScalar(dist).applyMatrix3(local);
  for (let i = 0; i < pos.count; i++) {
    _v.fromBufferAttribute(pos, i).applyMatrix4(toModel);
    if (Math.abs(n.dot(_v) - d) > 1e-4) continue;
    pos.setXYZ(i, pos.getX(i) + step.x, pos.getY(i) + step.y, pos.getZ(i) + step.z);
  }
  pos.needsUpdate = true;
}

/**
 * One de-clipping pass. `active`: the parts that moved last pass (null on the first pass): a pair
 * where neither part moved was already settled, so only pairs touching one of them are checked.
 * Returns the faces it moved and the parts they belong to.
 */
function declipPass(meshes, buckets, active) {
  for (const mesh of meshes) mesh.push.clear();
  declipGroup(buckets, meshes, active);
  const moved = [];
  const parts = new Set();
  meshes.forEach((mesh, mi) => {
    for (const f of mesh.push.values()) {
      if (Math.abs(f.dist) < 1e-5) continue;
      moveFace(mesh, f.n, f.d, f.dist);
      moved.push({ id: mesh.m.id, n: f.n, from: f.d, to: f.d + f.dist });
      parts.add(mi);
    }
  });
  return { moved, parts };
}

/** Did pass `b` put back exactly what pass `a` moved (every face back where it was)? */
function undoes(b, a) {
  if (!a || a.length !== b.length) return false;
  const key = (id, n, x, y) => `${id}|${n.x.toFixed(4)},${n.y.toFixed(4)},${n.z.toFixed(4)}|${x.toFixed(4)}>${y.toFixed(4)}`;
  const want = new Set(a.map((f) => key(f.id, f.n, f.to, f.from)));
  return b.every((f) => want.delete(key(f.id, f.n, f.from, f.to))) && want.size === 0;
}

// Faces are sorted into buckets by which way they face (each part of the normal rounded to
// NORMAL_STEP). Two faces that can fight (normals within 0.9995) always land in the same or a
// next-door bucket, so only those are compared: far fewer pairs than every face at that depth.
const NORMAL_STEP = 0.05;

/** A bucket number for normal step indexes (each from -20 to 20). */
const bucketKey = (ix, iy, iz) => (ix + 32) * 4096 + (iy + 32) * 64 + (iz + 32);

/** Puts `faces` into their buckets (by which way they face). Returns the buckets it touched. */
function addToBuckets(buckets, faces) {
  const touched = new Set();
  for (const f of faces) {
    const ix = Math.round(f.n.x / NORMAL_STEP), iy = Math.round(f.n.y / NORMAL_STEP), iz = Math.round(f.n.z / NORMAL_STEP);
    f.bk = bucketKey(ix, iy, iz);
    let b = buckets.get(f.bk);
    if (!b) buckets.set(f.bk, (b = { ix, iy, iz, key: f.bk, list: [] }));
    b.list.push(f);
    touched.add(b);
  }
  return touched;
}

/** First face in `list` (sorted by depth) deeper than `d`. */
function firstAfter(list, d) {
  let lo = 0, hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].d <= d) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Finds the fighting pairs among the faces in `buckets` and plans how far each face moves. With `active` (the
 * parts that moved last pass), only pairs with a face of one of those parts are looked at.
 */
function declipGroup(buckets, meshes, active) {
  pending.length = 0;
  findPairs(buckets, meshes, active);
  pending.sort(beforeOrder);
  for (const [a, b] of pending) clipPairNow(a, b, meshes);
  pending.length = 0;
}

function findPairs(buckets, meshes, active) {
  if (active) {
    for (const mi of active) for (const a of meshes[mi].faces) {
      const A = buckets.get(a.bk);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const B = buckets.get(bucketKey(A.ix + dx, A.iy + dy, A.iz + dz));
        if (!B) continue;
        const fb = B.list;
        for (let j = firstAfter(fb, a.d - CLIP_GAP); j < fb.length && fb[j].d - a.d < CLIP_GAP; j++) {
          const b = fb[j];
          // Both parts moved: the pair is found from both sides, so take it once.
          if (active.has(b.mi) && (b.mi < a.mi || (b.mi === a.mi))) continue;
          if (a.d <= b.d) clipPair(a, b, meshes);
          else clipPair(b, a, meshes);
        }
      }
    }
    return;
  }
  for (const A of buckets.values()) {
    const fa = A.list;
    for (let i = 0; i < fa.length; i++) for (let j = i + 1; j < fa.length && fa[j].d - fa[i].d < CLIP_GAP; j++) clipPair(fa[i], fa[j], meshes);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const B = buckets.get(bucketKey(A.ix + dx, A.iy + dy, A.iz + dz));
      if (!B || B.key <= A.key) continue; // each pair of buckets once
      const fb = B.list;
      let lo = 0;
      for (const a of fa) {
        while (lo < fb.length && fb[lo].d <= a.d - CLIP_GAP) lo++;
        for (let j = lo; j < fb.length && fb[j].d - a.d < CLIP_GAP; j++) {
          const b = fb[j];
          if (a.d <= b.d) clipPair(a, b, meshes);
          else clipPair(b, a, meshes);
        }
      }
    }
  }
}

/** Two faces `a`, `b` (a not deeper than b): if they fight, plan which one moves and how far. */
function clipPair(a, b, meshes) {
  if (a.mi === b.mi) return;
  // Quick test first: triangles whose boxes are apart along a direction that lies (nearly) flat
  // in their plane can't overlap. (Not along a direction they face: big tilted faces still can.)
  const e = CLIP_GAP + 0.01;
  const n = a.n;
  if ((Math.abs(n.x) < 0.3 && (a.x1 < b.x0 - e || b.x1 < a.x0 - e)) || (Math.abs(n.y) < 0.3 && (a.y1 < b.y0 - e || b.y1 < a.y0 - e)) || (Math.abs(n.z) < 0.3 && (a.z1 < b.z0 - e || b.z1 < a.z0 - e))) return;
  if (a.n.dot(b.n) < 0.9995) return;
  pending.push(earlier(a, b) < 0 ? [a, b] : [b, a]);
}

// Pairs found in a pass are handled in the order the faces sort by depth (ties: by part, then by
// triangle), so the result never depends on how the faces were bucketed.
const earlier = (a, b) => a.d - b.d || a.mi - b.mi || a.ti - b.ti;
const pending = [];
const beforeOrder = (p, q) => earlier(p[0], q[0]) || earlier(p[1], q[1]);

function clipPairNow(a, b, meshes) {
  // The smaller part is the detail that should show; on a tie, the one added later.
  const [top, under] = meshes[a.mi].vol < meshes[b.mi].vol || (meshes[a.mi].vol === meshes[b.mi].vol && a.mi > b.mi) ? [a, b] : [b, a];
  if (!triOverlap(a.p, b.p, a.n)) return;
  const gap = top.d - under.d; // > 0: the detail is in front
  const behind = gap < -CLIP_BEHIND;
  const want = behind ? -CLIP_PUSH - gap : CLIP_PUSH - gap;
  const key = `${top.n.x.toFixed(4)},${top.n.y.toFixed(4)},${top.n.z.toFixed(4)},${top.d.toFixed(4)}`;
  const push = meshes[top.mi].push;
  const prev = push.get(key);
  if (!prev) push.set(key, { n: top.n, d: top.d, dist: want });
  // Pushed out by one part and in by another: out wins (a detail should show, not hide).
  else if (want > 0 ? prev.dist < 0 || want > prev.dist : prev.dist < 0 && want < prev.dist) prev.dist = want;
}

// What declip did to each tower model it has seen, by `key` (tower type and level): the
// geometry of every part before, and the parts whose geometry it swapped. Building the same
// model again gives the same parts, so the swaps are copied over instead of worked out again.
const modelMemo = new Map();

/** Every mesh under `root`, in traverse order. */
function allMeshes(root) {
  const out = [];
  root.traverse((m) => {
    if (m.isMesh) out.push(m);
  });
  return out;
}

/**
 * De-clips `root` (see above) and swaps edited geometries for cached copies. With `key`, a model
 * built the same way as an earlier one with that key reuses its result (much faster).
 */
export function declip(root, key) {
  const parts = key != null ? allMeshes(root) : null;
  const memo = key != null ? modelMemo.get(key) : null;
  if (memo && memo.before.length === parts.length && parts.every((m, i) => m.geometry === memo.before[i])) {
    for (const [i, g] of memo.swaps) parts[i].geometry = g;
    return;
  }
  const before = parts?.map((m) => m.geometry);
  declipRun(root);
  if (parts) modelMemo.set(key, { before, swaps: parts.flatMap((m, i) => (m.geometry !== before[i] ? [[i, m.geometry]] : [])) });
}

function declipRun(root) {
  // Some faces never settle: two parts push the same face out and back, every pass. Once a pass
  // just undoes the one before, the rest would only flip it back and forth, so skip to where the
  // last pass would leave it (one more flip if an odd number of passes is left).
  const meshes = clipMeshes(root);
  const buckets = new Map();
  meshes.forEach((mesh, mi) => {
    mesh.faces = meshFaces(meshes, mi);
    addToBuckets(buckets, mesh.faces);
  });
  for (const b of buckets.values()) b.list.sort((p, q) => p.d - q.d);
  let prev = null;
  let active = null;
  // After a pass, only the parts that moved need their faces read again.
  const refresh = (parts) => {
    const touched = new Set();
    for (const mi of parts) for (const f of meshes[mi].faces) touched.add(buckets.get(f.bk));
    for (const b of touched) b.list = b.list.filter((f) => !parts.has(f.mi));
    for (const mi of parts) {
      meshes[mi].faces = meshFaces(meshes, mi);
      for (const b of addToBuckets(buckets, meshes[mi].faces)) touched.add(b);
    }
    for (const b of touched) b.list.sort((p, q) => p.d - q.d);
  };
  for (let pass = 0; pass < CLIP_PASSES; pass++) {
    const { moved, parts } = declipPass(meshes, buckets, active);
    if (!moved.length) {
      if (!active) break;
      active = null; // nothing left near the parts that moved: one full pass to be sure
      continue;
    }
    refresh(parts);
    if (undoes(moved, prev)) {
      if ((CLIP_PASSES - 1 - pass) % 2) declipPass(meshes, buckets, null);
      break;
    }
    prev = moved;
    active = parts;
  }
  root.traverse((m) => {
    if (!m.userData.clipOwn) return;
    const g = m.geometry;
    g.computeBoundingBox();
    g.computeBoundingSphere();
    const a = g.attributes.position.array;
    let key = m.userData.clipSrc.uuid;
    for (let i = 0; i < a.length; i++) key += ',' + Math.round(a[i] * 1e4);
    const hit = clipGeoCache.get(key);
    if (hit) {
      g.dispose();
      m.geometry = hit;
    } else clipGeoCache.set(key, g);
    delete m.userData.clipOwn;
    delete m.userData.clipSrc;
  });
}
