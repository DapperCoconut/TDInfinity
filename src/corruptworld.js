// Corporate Corruption's decorations: a grey downtown eaten by the void. Kerbs, road lines and
// crosswalks along the streets, office towers whose windows turn purple and whose roofs break
// apart the closer they stand to a void mass, the black void masses with waving tentacles and
// glowing cracks, lone tentacles in the pavement, street lamps (flickering purple near the void),
// wrecked cars, and a void sky with stars, rifts and drifting motes. The map data is ccFixed()
// in src/sim/maps.js; world.js calls these through CC_PROPS[kind].
import * as THREE from 'three';
import { boxGeo, part } from './models.js';
import { lambert, placed } from './worldkit.js';
import { PATH_WIDTH, path } from './sim/path.js';
import { CC_MASSES } from './sim/maps.js';

const basic = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
const hash = (a, b) => Math.abs((Math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1);

const kerbMat = lambert(0x8a8694);
const lineMat = lambert(0xd8c060);
const zebraMat = lambert(0xd8d4e0);
const wallMats = [0x7d8492, 0x8e8a86, 0x6c7280, 0x9a948c].map((c) => lambert(c));
const trimMat = lambert(0x4a4e58);
const roofMat = lambert(0x3e3c46);
const acMat = lambert(0x9aa0a8);
const winLit = basic(0xffe0a0);
const winDark = lambert(0x1c2230);
const winVoid = basic(0xb050ff);
const voidMat = lambert(0x0a0610, { flatShading: true, emissive: 0x12051e });
const voidSkin = lambert(0x1a0c28, { flatShading: true, emissive: 0x1a0830 });
const glow = basic(0xc060ff);
const glowHot = basic(0xf0b0ff);
const veinMat = basic(0x7a20c8);
const puddleMat = lambert(0x07040c);
const poleMat = lambert(0x3a3e46);
const lampWarm = basic(0xffe6a0);
const lampVoid = basic(0xc060ff);
const tyreMat = lambert(0x1a1a1e);
const hubMat = lambert(0xb0b4bc);
const glassMat = lambert(0x2a3448, { emissive: 0x080c18 });
const headMat = basic(0xfff2c0);
const tailMat = basic(0xff3030);
const carMats = [0xb83a3a, 0x3a6ab8, 0xd8d8dc, 0x2e2e34, 0xd8a83a].map((c) => lambert(c));

/** How eaten by the void a spot is: 1 right next to a mass, 0 far away. */
function corruption(x, z) {
  let c = 0;
  for (const [mx, mz, r] of CC_MASSES) c = Math.max(c, 1 - (Math.hypot(x - mx, z - mz) - r) / (22 + r * 3));
  return Math.max(0, Math.min(1, c));
}

/** Many copies of one box: `list` holds [x, y, z, sx, sy, sz, rotY?]. */
function boxes(parent, mat, list, shadow = true) {
  if (!list.length) return null;
  const m = new THREE.InstancedMesh(boxGeo(1, 1, 1), mat, list.length);
  const o = new THREE.Object3D();
  list.forEach(([x, y, z, sx, sy, sz, ry = 0], i) => {
    o.position.set(x, y, z);
    o.rotation.set(0, ry, 0);
    o.scale.set(sx, sy, sz);
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
  });
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/**
 * A tentacle growing up out of `parent`: a chain of tapering joints that bend in a slow wave,
 * with glowing suckers on its inner side. Pushes its sway into `animated`.
 */
function tentacle(parent, animated, { len, thick, seed, lean = 0, yaw = 0 }) {
  const n = 9;
  const step = len / n;
  const root = new THREE.Group();
  root.rotation.set(0, yaw, lean);
  parent.add(root);
  const joints = [];
  let at = root;
  for (let i = 0; i < n; i++) {
    const j = new THREE.Group();
    if (i) j.position.y = step;
    at.add(j);
    const r0 = thick * (1 - i / n) + 0.08;
    const r1 = thick * (1 - (i + 1) / n) + 0.05;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, step * 1.08, 7), i % 2 ? voidMat : voidSkin);
    seg.position.y = step / 2;
    seg.castShadow = true;
    j.add(seg);
    if (i > 0 && i < n - 1) {
      const s = r0 * 0.45;
      const dot = part(j, boxGeo(s, s, s), i % 2 ? glow : glowHot, r0 * 0.85, step / 2, 0);
      dot.castShadow = false;
    }
    joints.push(j);
    at = j;
  }
  const phase = seed * 6.28;
  const speed = 0.7 + (seed % 0.3);
  animated.push((t) => {
    joints.forEach((j, i) => {
      const k = i / n;
      j.rotation.z = Math.sin(t * speed + phase - i * 0.55) * (0.1 + k * 0.22);
      j.rotation.x = Math.cos(t * speed * 0.7 + phase - i * 0.4) * (0.06 + k * 0.12);
    });
  });
  return root;
}

/** Jagged glowing cracks running out across the ground from (0, 0) of `g`. */
function cracks(g, count, reach, seed) {
  const list = [];
  for (let i = 0; i < count; i++) {
    let a = (i / count) * Math.PI * 2 + hash(seed, i) * 0.6;
    let x = 0;
    let z = 0;
    const steps = 4 + Math.floor(hash(i, seed) * 3);
    for (let k = 0; k < steps; k++) {
      const l = (reach / steps) * (0.8 + hash(seed + k, i) * 0.5);
      const nx = x + Math.cos(a) * l;
      const nz = z + Math.sin(a) * l;
      list.push([(x + nx) / 2, 0.04, (z + nz) / 2, 0.22 * (1 - k / steps) + 0.08, 0.03, l + 0.2, Math.atan2(nx - x, nz - z)]);
      x = nx;
      z = nz;
      a += (hash(k, i + seed) - 0.5) * 1.1;
    }
  }
  boxes(g, glow, list, false);
}

export const CC_PROPS = {
  ccStreets(scene) {
    // Kerbs along both sides of every street (left out wherever another street crosses), a dashed
    // centre line, and zebra crossings at each corner.
    const kerbs = [];
    const dashes = [];
    const zebra = [];
    const half = PATH_WIDTH / 2;
    path.segs.forEach((s) => {
      const len = s.len;
      const ux = (s.b.x - s.a.x) / len;
      const uz = (s.b.z - s.a.z) / len;
      const ry = Math.atan2(ux, uz);
      for (let t = -half; t < len + half; t += 2) {
        const cx = s.a.x + ux * (t + 1);
        const cz = s.a.z + uz * (t + 1);
        for (const side of [-1, 1]) {
          const x = cx - uz * side * (half + 0.35);
          const z = cz + ux * side * (half + 0.35);
          if (path.distanceTo(x, z) < half + 0.2) continue;
          kerbs.push([x, 0.18, z, 0.7, 0.36, 2.02, ry]);
        }
      }
      for (let t = 5; t < len - 5; t += 4) dashes.push([s.a.x + ux * t, 0.215, s.a.z + uz * t, 0.22, 0.02, 1.8, ry]);
      // Zebra stripes across the street, a little way in from its start.
      for (let k = -1.6; k <= 1.6; k += 0.8) {
        const t = 5;
        if (len < 14) break;
        zebra.push([s.a.x + ux * t - uz * k, 0.22, s.a.z + uz * t + ux * k, 0.45, 0.02, 2.4, ry + Math.PI / 2]);
      }
    });
    boxes(scene, kerbMat, kerbs);
    boxes(scene, lineMat, dashes, false);
    boxes(scene, zebraMat, zebra, false);
  },

  ccTower(scene, p, m, animated) {
    // An office tower. Near the void its windows glow purple, black veins climb its walls and
    // the top of its roof breaks off and floats.
    const g = placed(scene, { x: p.x, z: p.z });
    const c = corruption(p.x, p.z);
    const { w, d, h } = p;
    const seed = p.x * 0.13 + p.z * 0.07;
    part(g, boxGeo(w, h, d), wallMats[Math.floor(hash(p.x, p.z) * 4)], 0, h / 2, 0);
    part(g, boxGeo(w + 0.6, 1.2, d + 0.6), trimMat, 0, 0.6, 0); // the ground floor band
    part(g, boxGeo(w + 0.4, 0.8, d + 0.4), trimMat, 0, h + 0.4, 0); // the roof edge
    // Windows on all four faces.
    const lit = [];
    const dark = [];
    const purple = [];
    const faces = [[0, 1, w, d], [0, -1, w, d], [1, 0, d, w], [-1, 0, d, w]];
    for (const [fx, fz, across, deep] of faces) {
      for (let y = 3; y < h - 1.2; y += 2.6) {
        for (let a = -across / 2 + 1.4; a <= across / 2 - 1.2; a += 2) {
          const x = fx ? (fx * deep) / 2 + fx * 0.05 : a;
          const z = fz ? (fz * deep) / 2 + fz * 0.05 : a;
          const r = hash(a + y * 3.1 + fx * 7, seed + fz * 5);
          const list = r < c * 0.75 ? purple : r < 0.55 ? dark : lit;
          list.push([x, y, z, fx ? 0.12 : 1.2, 1.5, fz ? 0.12 : 1.2]);
        }
      }
    }
    boxes(g, winLit, lit, false);
    boxes(g, winDark, dark, false);
    boxes(g, winVoid, purple, false);
    // Roof stuff: air-con boxes and an antenna or a water tank.
    part(g, boxGeo(w * 0.3, 1.2, d * 0.25), acMat, -w * 0.2, h + 1.4, d * 0.15);
    part(g, boxGeo(w * 0.2, 0.9, d * 0.2), acMat, w * 0.25, h + 1.25, -d * 0.2);
    if (hash(seed, 3) > 0.5) {
      part(g, boxGeo(0.3, 6, 0.3), poleMat, w * 0.3, h + 3.8, d * 0.3);
      part(g, boxGeo(0.5, 0.5, 0.5), lampVoid, w * 0.3, h + 6.9, d * 0.3).castShadow = false;
    } else {
      part(g, new THREE.CylinderGeometry(1.2, 1.2, 2.2, 10), roofMat, -w * 0.25, h + 2.6, -d * 0.25);
      for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(g, boxGeo(0.2, 1.2, 0.2), poleMat, -w * 0.25 + lx * 0.8, h + 1, -d * 0.25 + lz * 0.8);
    }
    if (c < 0.25) return;
    // Black veins up the walls (on the sides that face the void the most).
    const veins = [];
    const nv = Math.round(2 + c * 6);
    for (let i = 0; i < nv; i++) {
      const [fx, fz, across, deep] = faces[i % 4];
      const a = (hash(i, seed) - 0.5) * (across - 1);
      const vh = h * (0.3 + c * 0.6) * (0.5 + hash(seed, i) * 0.5);
      const x = fx ? (fx * deep) / 2 + fx * 0.12 : a;
      const z = fz ? (fz * deep) / 2 + fz * 0.12 : a;
      veins.push([x, vh / 2, z, fx ? 0.15 : 0.5, vh, fz ? 0.15 : 0.5]);
      veins.push([x + (fz ? 0.6 : 0), vh * 0.35, z + (fx ? 0.6 : 0), fx ? 0.15 : 0.3, vh * 0.5, fz ? 0.15 : 0.3]);
    }
    boxes(g, veinMat, veins, false);
    if (c < 0.5) return;
    // A broken chunk of the top floating above the roof, and a tentacle climbing out.
    const chunk = new THREE.Group();
    chunk.position.set(w * 0.15, h + 5, -d * 0.1);
    g.add(chunk);
    part(chunk, boxGeo(w * 0.45, 2.4, d * 0.4), wallMats[1], 0, 0, 0);
    part(chunk, boxGeo(w * 0.47, 0.3, d * 0.42), glow, 0, -1.25, 0).castShadow = false;
    for (let i = 0; i < 3; i++) part(g, boxGeo(1, 1, 1), voidSkin, (hash(i, seed) - 0.5) * w * 0.6, h + 3 + i * 1.8, (hash(seed, i) - 0.5) * d * 0.6).rotation.set(i, i * 2, 0);
    const hold = new THREE.Group();
    hold.position.set(-w * 0.3, h + 0.8, d * 0.3);
    g.add(hold);
    tentacle(hold, animated, { len: 7 + c * 5, thick: 0.8, seed: hash(seed, 9), lean: -0.3 });
    animated.push((t) => {
      chunk.position.y = h + 5 + Math.sin(t * 0.8 + seed) * 0.8;
      chunk.rotation.set(Math.sin(t * 0.5 + seed) * 0.12, t * 0.15, Math.cos(t * 0.6) * 0.1);
    });
  },

  ccMass(scene, p, m, animated) {
    // A huge lumpy blob of void: a black puddle with glowing cracks, a pulsing core with purple
    // fissures, tentacles all round it, and bits of rubble orbiting above.
    const g = placed(scene, { x: p.x, z: p.z });
    const r = p.r;
    const seed = p.x * 0.31 + p.z * 0.17;
    const puddle = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.45, r * 1.5, 0.06, 20), puddleMat);
    puddle.position.y = 0.03;
    g.add(puddle);
    cracks(g, 7 + Math.round(r), r * 3.2, Math.round(seed * 100));
    const body = new THREE.Group();
    g.add(body);
    const core = part(body, new THREE.IcosahedronGeometry(r, 1), voidMat, 0, r * 0.55, 0);
    core.scale.set(1, 0.85, 1);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + hash(i, seed);
      const s = r * (0.35 + hash(seed, i) * 0.25);
      part(body, new THREE.IcosahedronGeometry(s, 0), voidSkin, Math.cos(a) * r * 0.85, s * 0.6, Math.sin(a) * r * 0.85).rotation.set(i, i * 1.7, 0);
    }
    // Glowing fissures: thin bright slabs poking out of the surface, and one big eye-like glow on top.
    for (let i = 0; i < 12; i++) {
      const a = hash(i, seed + 1) * Math.PI * 2;
      const up = 0.2 + hash(seed + 2, i) * 0.9;
      const dir = new THREE.Vector3(Math.cos(a) * Math.cos(up), Math.sin(up) * 0.85, Math.sin(a) * Math.cos(up));
      const f = part(body, boxGeo(0.25, r * 0.5, 0.25), i % 3 ? glow : glowHot, dir.x * r * 0.98, r * 0.55 + dir.y * r, dir.z * r * 0.98);
      f.lookAt(new THREE.Vector3(0, r * 0.55, 0));
      f.rotateX(Math.PI / 2 + (hash(i, 7) - 0.5));
      f.castShadow = false;
    }
    const eye = part(body, new THREE.SphereGeometry(r * 0.22, 12, 8), glowHot, 0, r * 1.35, r * 0.15);
    eye.castShadow = false;
    // Tentacles round the edge, leaning outwards.
    const nt = 4 + Math.round(r * 0.8);
    for (let i = 0; i < nt; i++) {
      const a = (i / nt) * Math.PI * 2 + hash(seed, i + 4) * 0.5;
      const hold = new THREE.Group();
      hold.position.set(Math.cos(a) * r * 0.95, 0.3, Math.sin(a) * r * 0.95);
      hold.rotation.y = -a;
      g.add(hold);
      tentacle(hold, animated, { len: r * (1.6 + hash(i, seed) * 1.1), thick: r * 0.16 + 0.25, seed: hash(i, seed + 3), lean: -0.45 });
    }
    // Rubble orbiting above.
    const orbit = new THREE.Group();
    g.add(orbit);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const s = 0.6 + hash(i, seed + 5) * 0.9;
      part(orbit, boxGeo(s, s * 0.7, s), i % 2 ? wallMats[0] : voidSkin, Math.cos(a) * r * 1.3, r * 1.8 + hash(seed, i + 5) * r, Math.sin(a) * r * 1.3).rotation.set(i, i * 0.7, 0);
    }
    animated.push((t) => {
      const k = 1 + Math.sin(t * 1.6 + seed) * 0.045;
      body.scale.set(k, 2 - k, k);
      eye.scale.setScalar(0.8 + Math.abs(Math.sin(t * 0.9 + seed)) * 0.4);
      orbit.rotation.y = t * 0.25 + seed;
      orbit.position.y = Math.sin(t * 0.7 + seed) * 0.6;
    });
  },

  ccTentacle(scene, p, m, animated) {
    // One tentacle out of a cracked hole in the pavement.
    const g = placed(scene, { x: p.x, z: p.z });
    const s = p.s ?? 1;
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(1.2 * s, 1.3 * s, 0.06, 10), puddleMat);
    hole.position.y = 0.04;
    g.add(hole);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15 * s, 0.1, 4, 14), glow);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    g.add(ring);
    cracks(g, 4, 3.5 * s, Math.round(p.x * 10 + p.z));
    tentacle(g, animated, { len: 6 * s + 2, thick: 0.6 * s, seed: hash(p.x, p.z), yaw: p.x });
  },

  ccLamp(scene, p, m, animated) {
    // A street lamp leaning its head over the road. Near the void its light turns purple and flickers.
    const g = placed(scene, { x: p.x, z: p.z, rot: p.face });
    const c = corruption(p.x, p.z);
    const bad = c > 0.4;
    part(g, boxGeo(0.6, 0.4, 0.6), poleMat, 0, 0.2, 0);
    part(g, new THREE.CylinderGeometry(0.14, 0.2, 6, 8), poleMat, 0, 3, 0);
    part(g, boxGeo(0.18, 0.18, 2), poleMat, 0, 5.9, 0.9);
    part(g, boxGeo(0.7, 0.3, 1), poleMat, 0, 5.8, 1.8);
    const bulb = part(g, boxGeo(0.5, 0.12, 0.8), bad ? lampVoid : lampWarm, 0, 5.6, 1.8);
    bulb.castShadow = false;
    if (bad) {
      g.rotation.z = (p.v - 0.5) * 0.25; // bent a little
      animated.push((t) => (bulb.visible = Math.sin(t * 13 + p.v * 40) + Math.sin(t * 5.3 + p.v * 9) > -0.6));
    }
  },

  ccCar(scene, p) {
    // An abandoned car parked by the kerb. Near the void it is tipped and has void goo on it.
    const g = placed(scene, { x: p.x, z: p.z, rot: p.rot });
    const c = corruption(p.x, p.z);
    const paint = carMats[Math.floor(p.v * carMats.length)];
    const body = new THREE.Group();
    body.position.y = 0.55;
    g.add(body);
    part(body, boxGeo(1.9, 0.75, 4.2), paint, 0, 0.35, 0);
    part(body, boxGeo(1.7, 0.7, 2.1), paint, 0, 1.05, -0.2);
    part(body, boxGeo(1.72, 0.5, 1.9), glassMat, 0, 1.05, -0.2);
    part(body, boxGeo(1.6, 0.45, 0.08), glassMat, 0, 1.0, 0.88).rotation.x = -0.35; // windscreen
    for (const sx of [-0.65, 0.65]) {
      part(body, boxGeo(0.35, 0.2, 0.06), headMat, sx, 0.45, 2.11).castShadow = false;
      part(body, boxGeo(0.35, 0.2, 0.06), tailMat, sx, 0.45, -2.11).castShadow = false;
    }
    part(body, boxGeo(2, 0.18, 0.2), trimMat, 0, 0.05, 2.15); // bumpers
    part(body, boxGeo(2, 0.18, 0.2), trimMat, 0, 0.05, -2.15);
    const wheel = new THREE.CylinderGeometry(0.45, 0.45, 0.35, 14).rotateZ(Math.PI / 2);
    const hub = new THREE.CylinderGeometry(0.2, 0.2, 0.37, 8).rotateZ(Math.PI / 2);
    for (const [wx, wz] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]) {
      part(g, wheel, tyreMat, wx, 0.45, wz);
      part(g, hub, hubMat, wx, 0.45, wz);
    }
    if (c > 0.35) {
      body.rotation.z = 0.18;
      g.position.y = 0.15;
      part(body, new THREE.IcosahedronGeometry(0.7, 0), voidSkin, 0.3, 1.5, 0.6).scale.set(1.3, 0.5, 1.6);
      part(body, boxGeo(0.12, 0.6, 0.12), glow, 0.5, 1.6, 0.9).castShadow = false;
    }
  },

  ccSky(scene, p, m, animated) {
    // The void sky: stars, two glowing rifts, far-off floating city chunks, and purple motes
    // drifting up from the streets.
    const far = (color, extra) => basic(color, { fog: false, ...extra });
    const starGeo = new THREE.BufferGeometry();
    const pts = [];
    for (let i = 0; i < 500; i++) {
      const a = hash(i, 1) * Math.PI * 2;
      const up = 0.15 + hash(i, 2) * 1.3;
      const r = 420;
      pts.push(Math.cos(a) * Math.cos(up) * r, Math.sin(up) * r, Math.sin(a) * Math.cos(up) * r);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xe0c8ff, size: 2, sizeAttenuation: false, fog: false })));

    const rifts = [];
    for (const [x, y, z, s] of [[-40, 150, -300, 1], [230, 110, 120, 0.6]]) {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.lookAt(0, 0, 0);
      g.scale.setScalar(s);
      scene.add(g);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(60, 40), far(0x05010a));
      disc.scale.set(1, 0.45, 1);
      g.add(disc);
      const glowRing = new THREE.Mesh(new THREE.RingGeometry(58, 70, 48), far(0x8a30e0, { transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
      glowRing.scale.set(1, 0.45, 1);
      glowRing.position.z = 0.5;
      g.add(glowRing);
      const outer = new THREE.Mesh(new THREE.RingGeometry(70, 92, 48), far(0x4a1080, { transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
      outer.scale.set(1, 0.45, 1);
      outer.position.z = 0.4;
      g.add(outer);
      rifts.push(glowRing, outer);
    }
    // Far-off floating chunks of street and building.
    const chunks = new THREE.Group();
    scene.add(chunks);
    const chunkMat = far(0x2a1a3a);
    const chunkEdge = far(0x9040e0);
    for (let i = 0; i < 18; i++) {
      const a = hash(i, 11) * Math.PI * 2;
      const r = 170 + hash(i, 12) * 90;
      const s = 6 + hash(i, 13) * 12;
      const c = new THREE.Group();
      c.position.set(Math.cos(a) * r, 50 + hash(i, 14) * 90, Math.sin(a) * r);
      c.rotation.set(hash(i, 15), hash(i, 16) * 3, hash(i, 17) * 0.5);
      part(c, boxGeo(s, s * 0.35, s * 0.8), chunkMat, 0, 0, 0).castShadow = false;
      part(c, boxGeo(s * 0.3, s * (0.6 + hash(i, 18)), s * 0.3), chunkMat, s * 0.2, s * 0.4, 0).castShadow = false;
      part(c, boxGeo(s * 1.02, 0.4, s * 0.82), chunkEdge, 0, -s * 0.18, 0).castShadow = false;
      chunks.add(c);
    }
    // Motes rising from the ground and wrapping back down.
    const moteGeo = new THREE.BufferGeometry();
    const motes = [];
    for (let i = 0; i < 160; i++) motes.push(-104 + hash(i, 21) * 208, hash(i, 22) * 40, -66 + hash(i, 23) * 132);
    moteGeo.setAttribute('position', new THREE.Float32BufferAttribute(motes, 3));
    const moteMat = new THREE.PointsMaterial({ color: 0xc070ff, size: 0.22, transparent: true, opacity: 0.7 });
    const moteCloud = new THREE.Points(moteGeo, moteMat);
    scene.add(moteCloud);
    const pos = moteGeo.attributes.position;
    let last = 0;
    animated.push((t) => {
      const dt = Math.min(0.1, t - last);
      last = t;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + dt * (1 + (i % 5) * 0.4);
        if (y > 40) y -= 40;
        pos.setY(i, y);
        pos.setX(i, pos.getX(i) + Math.sin(t + i) * dt * 0.3);
      }
      pos.needsUpdate = true;
      chunks.rotation.y = t * 0.01;
      const k = 0.7 + Math.sin(t * 0.8) * 0.2;
      rifts.forEach((r, i) => (r.material.opacity = i % 2 ? k * 0.5 : k));
    });
  },
};
