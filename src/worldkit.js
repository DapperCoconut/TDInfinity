// Pieces the map renderers share: simple materials, tile and canvas textures, the tree kinds
// (TREES), and helpers for flat floors and many copies of one shape.

import * as THREE from 'three';
import { boxGeo, part } from './models.js';
import { mulberry32 } from './utils.js';
import { mapInfo } from './sim/map.js';
import { NEXUS_CELL } from './sim/maps.js';

export function tileTexture(base, variants, lines, size = 128, cells = 8) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const rand = mulberry32(base.length * 977 + cells);
  const cs = size / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      g.fillStyle = rand() < 0.65 ? base : variants[Math.floor(rand() * variants.length)];
      g.fillRect(x * cs, y * cs, cs, cs);
    }
  }
  if (lines) {
    g.strokeStyle = lines;
    g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, size - 1, size - 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  t.anisotropy = 8;
  return t;
}

export const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const trunkMat = lambert(0x6d4c2f);
// Per-map materials (leaves, rocks, cliffs, water), made once per map by themeMats().
let mats = null;
let matsFor = null;
export function themeMats() {
  if (matsFor === mapInfo) return mats;
  matsFor = mapInfo;
  const t = mapInfo.theme;
  const crystal = mapInfo.tree === 'crystal';
  mats = {
    leaves: t.leaves.map((c) => lambert(c, crystal ? { emissive: c, emissiveIntensity: 0.35, flatShading: true } : {})),
    rock: lambert(t.rock),
    cliff: lambert(t.cliff[0], { flatShading: true }),
    cliffDark: lambert(t.cliff[1], { flatShading: true }),
    cliffTop: lambert(t.cliff[2], { flatShading: true }),
    pool: lambert(t.water[0], { emissive: 0x0b2f55 }),
    poolDeep: lambert(t.water[1], { emissive: 0x08223f }),
  };
  return mats;
}

/** A group at (x, z) turned by `rot` and scaled by `s`, added to `scene`. */
export function placed(scene, { x, z, s = 1, rot = 0 }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  g.scale.setScalar(s);
  scene.add(g);
  return g;
}

const darkTrunkMat = lambert(0x3e2a1c);
const palmTrunkMat = lambert(0x9c7a4f);
const cactusMat = lambert(0x4f8f3a);
const cactusDarkMat = lambert(0x3f7a2e);
export const snowMat = lambert(0xf5f9fc);

// Trees by kind: (scene, { x, z, s, rot, leaf }, mats).
export const TREES = {
  round(scene, t, m) {
    const g = placed(scene, t);
    part(g, boxGeo(1.2, 4, 1.2), trunkMat, 0, 2, 0);
    part(g, boxGeo(4.6, 3.4, 4.6), m.leaves[t.leaf], 0, 5.2, 0);
    part(g, boxGeo(3, 2, 3), m.leaves[t.leaf], 0, 7.6, 0);
  },
  pine(scene, t, m) {
    const g = placed(scene, t);
    part(g, boxGeo(1, 3, 1), trunkMat, 0, 1.5, 0);
    [[4.8, 2.5], [3.6, 4.6], [2.4, 6.6], [1.2, 8.3]].forEach(([w, y], i) => {
      part(g, boxGeo(w, 2, w), m.leaves[t.leaf], 0, y, 0);
      if (!mapInfo.theme.snow) return;
      part(g, boxGeo(w * 0.8, 0.35, w * 0.8), snowMat, 0, y + 1.1, 0).castShadow = i === 3; // snowy tops
    });
  },
  dead(scene, t, m) {
    const g = placed(scene, t);
    part(g, boxGeo(0.9, 6, 0.9), darkTrunkMat, 0, 3, 0);
    for (const [y, a, len] of [[3.8, 0.6, 2.6], [4.8, -0.7, 2.2], [5.6, 0.5, 1.6]]) {
      const b = part(g, boxGeo(0.45, len, 0.45), darkTrunkMat, Math.sin(a) * len * 0.45, y, 0);
      b.rotation.z = -a;
    }
  },
  cactus(scene, t) {
    const g = placed(scene, t);
    part(g, boxGeo(1.3, 5, 1.3), cactusMat, 0, 2.5, 0);
    for (const side of [-1, 1]) {
      const y = side < 0 ? 2.2 : 3.1;
      part(g, boxGeo(1.4, 0.8, 0.8), cactusDarkMat, side * 1.1, y, 0);
      part(g, boxGeo(0.8, 1.8, 0.8), cactusMat, side * 1.6, y + 1.1, 0);
    }
  },
  palm(scene, t, m) {
    const g = placed(scene, t);
    for (let i = 0; i < 6; i++) part(g, boxGeo(0.8, 1.3, 0.8), palmTrunkMat, i * 0.18, 0.65 + i * 1.2, 0).rotation.z = -0.08;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const leaf = part(g, boxGeo(3.4, 0.25, 1), m.leaves[t.leaf], 1 + Math.cos(a) * 1.6, 7.2, Math.sin(a) * 1.6);
      leaf.rotation.set(0, -a, -0.35);
    }
  },
  crystal(scene, t, m) {
    const g = placed(scene, t);
    const mat = m.leaves[t.leaf];
    part(g, new THREE.OctahedronGeometry(1.6, 0), mat, 0, 3.4, 0).scale.set(1, 2.4, 1);
    for (const [dx, dz, k] of [[1.6, 0.6, 0.6], [-1.3, 1, 0.5], [0.2, -1.5, 0.45]]) {
      const c = part(g, new THREE.OctahedronGeometry(1.6 * k, 0), mat, dx, 1.8 * k, dz);
      c.scale.set(1, 2, 1);
      c.rotation.z = dx * 0.15;
    }
  },
};

/** A canvas texture `size` px square, drawn by `draw(g, size)`, repeating. */
export function canvasTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** A flat textured rectangle (w x d) lying at height y, its texture repeating once per grid cell. */
export function floorPlane(parent, w, d, mat, x, y, z) {
  const geo = new THREE.PlaneGeometry(w, d);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / NEXUS_CELL, (uv.getY(i) * d) / NEXUS_CELL);
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** Instanced copies of one small mesh at `spots` ([x, y, z] or [x, y, z, rotY]). */
export function instanced(parent, geo, mat, spots) {
  if (!spots.length) return null;
  const im = new THREE.InstancedMesh(geo, mat, spots.length);
  const o = new THREE.Object3D();
  spots.forEach(([x, y, z, ry = 0], i) => {
    o.position.set(x, y, z);
    o.rotation.set(0, ry, 0);
    o.updateMatrix();
    im.setMatrixAt(i, o.matrix);
  });
  parent.add(im);
  return im;
}
