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

/** Every triangle of every visible mesh under `root`, in model space. */
function clipFaces(root, meshes) {
  const out = [];
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  root.traverse((m) => {
    if (!m.isMesh || !m.geometry?.attributes.position) return;
    for (let o = m; o && o !== root; o = o.parent) if (!o.visible) return;
    const mi = meshes.length;
    const toModel = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
    const g = m.geometry;
    // Sized once, before any face moves, so two equal parts can't keep swapping which is on top.
    if (m.userData.clipVol == null) {
      g.computeBoundingBox();
      const size = g.boundingBox.getSize(new THREE.Vector3()).multiply(new THREE.Vector3().setFromMatrixScale(toModel));
      m.userData.clipVol = Math.max(size.x, 1e-3) * Math.max(size.y, 1e-3) * Math.max(size.z, 1e-3);
    }
    meshes.push({ m, toModel, vol: m.userData.clipVol, push: new Map() });
    const pos = g.attributes.position;
    const idx = g.index;
    const n = idx ? idx.count : pos.count;
    for (let i = 0; i + 2 < n; i += 3) {
      const p = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(pos, idx ? idx.getX(i + k) : i + k).applyMatrix4(toModel));
      const nr = _e1.subVectors(p[1], p[0]).cross(_e2.subVectors(p[2], p[0]));
      const len = nr.length();
      if (len < 1e-6) continue;
      const normal = nr.clone().divideScalar(len);
      out.push({ mi, n: normal, d: normal.dot(p[0]), p });
    }
  });
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

/** One de-clipping pass over `root`. Returns how many faces it had to move. */
function declipPass(root) {
  const meshes = [];
  declipGroup(clipFaces(root, meshes).sort((a, b) => a.d - b.d), meshes);
  let moved = 0;
  for (const mesh of meshes) {
    for (const f of mesh.push.values()) {
      if (Math.abs(f.dist) < 1e-5) continue;
      moveFace(mesh, f.n, f.d, f.dist);
      moved++;
    }
  }
  return moved;
}

/** Finds the fighting pairs among `faces` (sorted by depth) and plans how far each face moves. */
function declipGroup(faces, meshes) {
  for (let i = 0; i < faces.length; i++) {
    const a = faces[i];
    for (let j = i + 1; j < faces.length && faces[j].d - a.d < CLIP_GAP; j++) {
      const b = faces[j];
      if (a.mi === b.mi || a.n.dot(b.n) < 0.9995) continue;
      // The smaller part is the detail that should show; on a tie, the one added later.
      const [top, under] = meshes[a.mi].vol < meshes[b.mi].vol || (meshes[a.mi].vol === meshes[b.mi].vol && a.mi > b.mi) ? [a, b] : [b, a];
      if (!triOverlap(a.p, b.p, a.n)) continue;
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
  }
}

/** De-clips `root` (see above) and swaps edited geometries for cached copies. */
export function declip(root) {
  for (let pass = 0; pass < CLIP_PASSES && declipPass(root); pass++);
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
  root.traverse((m) => delete m.userData.clipVol);
}
