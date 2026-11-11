// Lantern Hill Cemetery's decorations (Halloween): chapel, lantern posts, jack-o'-lanterns,
// gravestones, boulders, dark trees, the cathedral and bell tower outside the fence, the iron
// fence itself and the storm clouds. world.js calls these through GRAVE_PROPS[kind].
import * as THREE from 'three';
import { boxGeo, part } from './models.js';
import { mulberry32 } from './utils.js';
import { PATH_WIDTH, BOUNDS, path } from './sim/path.js';
import { CASTLE } from './sim/map.js';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const wallMat = lambert(0xc9b98e);
const wallDarkMat = lambert(0xa8976c);
const roofMat = lambert(0x3a3430);
const doorMat = lambert(0x8a7a52);
const doorDarkMat = lambert(0x1a1612);
const woodMat = lambert(0x4a3020);
const ironMat = lambert(0x1c1c20);
const glassMat = lambert(0xfff23a, { emissive: 0xfff23a, emissiveIntensity: 1 });
const pumpkinMat = lambert(0xd9771f, { emissive: 0x6a2a00, emissiveIntensity: 0.6 });
const stemMat = lambert(0x3e5a22);
const faceMat = new THREE.MeshBasicMaterial({ color: 0xffb030 });
const stoneMat = lambert(0x8a8a8a);
const stoneDarkMat = lambert(0x6e6e6e);
const boulderMat = lambert(0x6e5a40, { flatShading: true });
const boulderDarkMat = lambert(0x5a4934, { flatShading: true });
const trunkMat = lambert(0x2a2018);
const leafMats = [lambert(0x1e2216), lambert(0x242a1a), lambert(0x1a1e12)];
const windowMat = lambert(0xcfe4ff, { emissive: 0xa8c8ff, emissiveIntensity: 0.9 });
const louvreMat = lambert(0x2a2622);
const blueMat = new THREE.MeshBasicMaterial({ color: 0x4a8fd9 });
const cloudMats = [0x3a3a3e, 0x2e2e32, 0x444448].map((c) => new THREE.MeshBasicMaterial({ color: c, fog: false, transparent: true, opacity: 0.92 }));

/** A group at (x, z) turned by `rot` and scaled by `s`, added to `scene`. */
function placed(scene, { x, z, s = 1, rot = 0 }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  g.scale.setScalar(s);
  scene.add(g);
  return g;
}

/** A warm point light that flickers a little. */
function flicker(g, color, intensity, dist, x, y, z, animated, seed) {
  const l = new THREE.PointLight(color, intensity, dist, 1.6);
  l.position.set(x, y, z);
  g.add(l);
  animated.push((t) => {
    l.intensity = intensity * (0.86 + 0.08 * Math.sin(t * 9 + seed) + 0.06 * Math.sin(t * 23 + seed * 3));
  });
  return l;
}

/** A pitched roof along z: two slabs meeting at the ridge. */
function roof(g, w, d, y, rise, mat) {
  const half = w / 2 + 0.4;
  const slope = Math.atan2(rise, half);
  const len = Math.hypot(half, rise);
  for (const s of [-1, 1]) {
    const slab = part(g, boxGeo(len, 0.4, d + 0.8), mat, (s * half) / 2, y + rise / 2, 0);
    slab.rotation.z = -s * slope;
  }
}

/** A pointed (Gothic) arch window or door: a tall box with a small diamond on top. */
function arch(g, w, h, x, y, z, mat, ry = 0) {
  const a = new THREE.Group();
  a.position.set(x, y, z);
  a.rotation.y = ry;
  g.add(a);
  part(a, boxGeo(w, h, 0.2), mat, 0, h / 2, 0).castShadow = false;
  const tip = part(a, boxGeo(w * 0.72, w * 0.72, 0.2), mat, 0, h, 0);
  tip.rotation.z = Math.PI / 4;
  tip.castShadow = false;
  return a;
}

// Names on some of the stones (made up).
const NAMES = ['R.I.P.', 'M. GRAVES', 'OLD TOM', 'E. HOLLOW', 'B. BONES', 'A. CROW', 'J. MOSS', 'RIP'];
const nameMats = new Map();
function nameMat(name) {
  let m = nameMats.get(name);
  if (m) return m;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = '#2e2e2e';
  ctx.font = 'bold 22px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 64, 32, 120);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  m = new THREE.MeshLambertMaterial({ map: tex });
  nameMats.set(name, m);
  return m;
}

/** One gravestone at (x, z) in group g: rounded top, cross or slab, some with a name. */
function stone(g, x, z, rand) {
  const kind = rand();
  const tilt = (rand() - 0.5) * 0.25;
  const s = new THREE.Group();
  s.position.set(x, 0, z);
  s.rotation.set(tilt * 0.5, (rand() - 0.5) * 0.4, tilt);
  g.add(s);
  if (kind < 0.25) {
    // A stone cross.
    part(s, boxGeo(0.35, 1.9, 0.35), stoneMat, 0, 0.95, 0);
    part(s, boxGeo(1.2, 0.35, 0.35), stoneMat, 0, 1.35, 0);
  } else {
    const h = 1.1 + rand() * 0.5;
    part(s, boxGeo(1.2, h, 0.32), kind < 0.6 ? stoneMat : stoneDarkMat, 0, h / 2, 0);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.32, 12, 1, false, -Math.PI / 2, Math.PI), kind < 0.6 ? stoneMat : stoneDarkMat);
    top.rotation.x = -Math.PI / 2; // the half-disc stands upright on top of the slab
    top.position.y = h;
    top.castShadow = true;
    s.add(top);
    if (rand() < 0.6) {
      const plate = part(s, new THREE.PlaneGeometry(1, 0.5), nameMat(NAMES[Math.floor(rand() * NAMES.length)]), 0, h * 0.6, 0.17);
      plate.castShadow = false;
    }
  }
  // A low mound of earth in front.
  part(s, boxGeo(1.1, 0.18, 1.8), boulderDarkMat, 0, 0.09, 1.2).castShadow = false;
}

export const GRAVE_PROPS = {
  chapel(scene, p) {
    // About 10 wide x 8 deep x 9 tall: cream walls, steep roof with raised gables, a pointed door.
    const g = placed(scene, p);
    const W = 8, D = 6.4, H = 5;
    part(g, boxGeo(W, H, D), wallMat, 0, H / 2, 0);
    part(g, boxGeo(W + 0.3, 0.4, D + 0.3), wallDarkMat, 0, 0.2, 0);
    // Roof ridge runs along x here, so build it in a group turned 90 degrees.
    const r = new THREE.Group();
    r.rotation.y = Math.PI / 2;
    g.add(r);
    roof(r, D, W, H, 4, roofMat);
    // Gable ends (stepped triangles) standing a little above the roof.
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const w = D - i * 1.55;
        part(g, boxGeo(0.5, 1, w), wallMat, sx * (W / 2 + 0.05), H + 0.5 + i, 0);
      }
      part(g, boxGeo(0.5, 0.9, 0.5), wallMat, sx * (W / 2 + 0.05), H + 4.4, 0);
    }
    // The pointed doorway, recessed, on the front (+z of the group).
    part(g, boxGeo(2.4, 3.6, 0.3), doorMat, 0, 1.8, D / 2 + 0.05);
    arch(g, 1.7, 2.8, 0, 0, D / 2 + 0.22, doorDarkMat);
    // Narrow arched windows on the long sides.
    for (const x of [-2.4, 2.4]) arch(g, 0.8, 1.6, x, 1.8, D / 2 + 0.12, windowMat);
    for (const x of [-2.4, 0, 2.4]) arch(g, 0.8, 1.6, x, 1.8, -D / 2 - 0.12, windowMat);
    // A small cross on the ridge.
    part(g, boxGeo(0.3, 1.6, 0.3), ironMat, 0, H + 4.8, 0);
    part(g, boxGeo(1, 0.3, 0.3), ironMat, 0, H + 5.1, 0);
  },

  gallows(scene, p, m, animated) {
    // The tall lantern post: a dark wooden post (about 10 tall), a short arm, a hanging square lantern.
    const g = placed(scene, p);
    part(g, boxGeo(0.6, 10, 0.6), woodMat, 0, 5, 0);
    part(g, boxGeo(2.6, 0.4, 0.4), woodMat, 1.1, 9.6, 0);
    const brace = part(g, boxGeo(0.25, 1.6, 0.25), woodMat, 0.6, 8.9, 0);
    brace.rotation.z = -0.8;
    part(g, boxGeo(0.06, 0.8, 0.06), ironMat, 2, 9.1, 0);
    part(g, boxGeo(1.1, 0.2, 1.1), ironMat, 2, 8.6, 0);
    part(g, boxGeo(0.9, 1.2, 0.9), glassMat, 2, 7.9, 0).castShadow = false;
    part(g, boxGeo(1.1, 0.2, 1.1), ironMat, 2, 7.2, 0);
    for (const [dx, dz] of [[-0.48, -0.48], [0.48, -0.48], [-0.48, 0.48], [0.48, 0.48]]) part(g, boxGeo(0.12, 1.3, 0.12), ironMat, 2 + dx, 7.9, dz);
    flicker(g, 0xffe070, 30, 18, 2, 7.6, 0, animated, p.x);
  },

  pumpkins(scene, p, m, animated) {
    // Three carved jack-o'-lanterns, 2 at the bottom + 1 on top, faces lit.
    const g = placed(scene, p);
    const one = (x, y, z, r, ry) => {
      const k = new THREE.Group();
      k.position.set(x, y, z);
      k.rotation.y = ry;
      g.add(k);
      const body = part(k, new THREE.SphereGeometry(r, 12, 9), pumpkinMat, 0, r * 0.8, 0);
      body.scale.y = 0.8;
      part(k, boxGeo(0.14, 0.35, 0.14), stemMat, 0, r * 1.55, 0);
      // Face: two triangle eyes and a jagged mouth (thin glowing boxes just outside the skin).
      for (const sx of [-1, 1]) {
        const eye = part(k, boxGeo(r * 0.28, r * 0.28, 0.05), faceMat, sx * r * 0.32, r * 1.0, r * 0.9);
        eye.rotation.z = Math.PI / 4;
        eye.castShadow = false;
      }
      part(k, boxGeo(r * 0.8, r * 0.16, 0.05), faceMat, 0, r * 0.6, r * 0.93).castShadow = false;
      for (const dx of [-0.25, 0.25]) part(k, boxGeo(r * 0.14, r * 0.14, 0.05), faceMat, dx * r, r * 0.7, r * 0.93).castShadow = false;
    };
    one(-0.6, 0, 0, 0.75, 0.2);
    one(0.65, 0, 0.1, 0.7, -0.15);
    one(0.05, 1.05, 0.05, 0.6, 0.05);
    flicker(g, 0xff8a20, 14, 9, 0, 1.2, 1.2, animated, p.z);
  },

  graves(scene, p) {
    // A cluster of w x d gravestones, about 2.4 apart.
    const g = placed(scene, p);
    const rand = mulberry32(p.seed * 977 + 31);
    for (let i = 0; i < p.w; i++) {
      for (let j = 0; j < p.d; j++) {
        const x = (i - (p.w - 1) / 2) * 2.4 + (rand() - 0.5) * 0.4;
        const z = (j - (p.d - 1) / 2) * 2.4 + (rand() - 0.5) * 0.3 - 0.5;
        stone(g, x, z, rand);
      }
    }
  },

  lantern(scene, p, m, animated) {
    // A small post lantern at head height.
    const g = placed(scene, p);
    part(g, boxGeo(0.25, 3, 0.25), ironMat, 0, 1.5, 0);
    part(g, boxGeo(0.7, 0.15, 0.7), ironMat, 0, 3.05, 0);
    part(g, boxGeo(0.5, 0.6, 0.5), glassMat, 0, 3.45, 0).castShadow = false;
    const cap = part(g, boxGeo(0.6, 0.6, 0.6), ironMat, 0, 3.85, 0);
    cap.scale.y = 0.4;
    cap.rotation.y = Math.PI / 4;
    if (p.lit) flicker(g, 0xffe070, 10, 10, 0, 3.4, 0, animated, p.x + p.z);
  },

  boulder(scene, p) {
    const g = placed(scene, p);
    part(g, boxGeo(2, 1.3, 1.7), boulderMat, 0, 0.6, 0).rotation.set(0.1, 0.3, 0.08);
    part(g, boxGeo(1.2, 0.9, 1.1), boulderDarkMat, 0.7, 0.4, 0.5).rotation.set(0.2, 0.9, 0);
  },

  spooktree(scene, p) {
    // A dark bare trunk with a flat, blocky olive-black crown (or a palm-like tuft).
    const g = placed(scene, p);
    const leaf = leafMats[p.v ?? 0];
    const h = 6;
    part(g, boxGeo(0.8, h, 0.8), trunkMat, 0, h / 2, 0);
    const lean = part(g, boxGeo(0.4, 2.2, 0.4), trunkMat, 0.7, h * 0.6, 0);
    lean.rotation.z = -0.7;
    if ((p.v ?? 0) === 1) {
      // Palm-like tufts: flat drooping blades round the top.
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const b = new THREE.Group();
        b.position.set(0, h, 0);
        b.rotation.y = a;
        g.add(b);
        const blade = part(b, boxGeo(3.4, 0.25, 1), leaf, 1.6, -0.35, 0);
        blade.rotation.z = -0.3;
      }
    } else {
      part(g, boxGeo(5.2, 1.2, 4.6), leaf, 0, h + 0.4, 0);
      part(g, boxGeo(3.4, 1, 3.2), leaf, 0.3, h + 1.4, -0.2);
    }
  },

  cathedral(scene, p) {
    // The long cathedral west of the fence: cream walls, rows of tall lit arched windows, pitched roof.
    const g = placed(scene, p);
    const W = 16, D = 40, H = 14;
    part(g, boxGeo(W, H, D), wallMat, 0, H / 2, 0);
    roof(g, W, D, H, 9, roofMat);
    // Gable walls at both ends.
    for (const sz of [-1, 1]) {
      for (let i = 0; i < 6; i++) part(g, boxGeo(W - i * 2.8, 1.5, 0.6), wallMat, 0, H + 0.75 + i * 1.5, sz * (D / 2 + 0.1));
      arch(g, 3, 6, 0, H - 9, sz * (D / 2 + 0.45), windowMat);
    }
    // Two rows of narrow arched windows on the long sides, and buttresses between them.
    for (const sx of [-1, 1]) {
      for (let z = -D / 2 + 3; z <= D / 2 - 3; z += 4) {
        for (const y of [2, 8]) arch(g, 1.2, 3.6, sx * (W / 2 + 0.12), y, z, windowMat, Math.PI / 2);
        if (z + 2 < D / 2 - 1) part(g, boxGeo(1.2, H - 2, 1), wallDarkMat, sx * (W / 2 + 0.5), (H - 2) / 2, z + 2);
      }
    }
    // A short spire at the east end.
    part(g, boxGeo(4, 8, 4), wallMat, 0, H + 8, D / 2 - 4);
    const spire = part(g, new THREE.ConeGeometry(3.2, 9, 4), roofMat, 0, H + 16.5, D / 2 - 4);
    spire.rotation.y = Math.PI / 4;
  },

  belltower(scene, p) {
    // A square beige tower east of the fence, paired arched louvre windows near the top.
    const g = placed(scene, p);
    const W = 8, H = 26;
    part(g, boxGeo(W, H, W), wallMat, 0, H / 2, 0);
    part(g, boxGeo(W + 0.8, 0.8, W + 0.8), wallDarkMat, 0, H * 0.4, 0);
    part(g, boxGeo(W + 0.8, 0.8, W + 0.8), wallDarkMat, 0, H - 0.4, 0);
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      for (const dx of [-1.3, 1.3]) {
        const x = Math.cos(a) * dx;
        const z = -Math.sin(a) * dx;
        const ox = Math.sin(a) * (W / 2 + 0.12);
        const oz = Math.cos(a) * (W / 2 + 0.12);
        arch(g, 1.6, 4, ox + x, H - 7, oz + z, louvreMat, a);
      }
    }
    const cap = part(g, new THREE.ConeGeometry(W * 0.75, 7, 4), roofMat, 0, H + 3.5, 0);
    cap.rotation.y = Math.PI / 4;
  },

  fence(scene) {
    // The cemetery's iron fence round the play area, open where the path comes in and goes out.
    const g = new THREE.Group();
    scene.add(g);
    const posts = [];
    const bars = [];
    const lights = [];
    const { minX, maxX, minZ, maxZ } = BOUNDS;
    const gap = (x, z) => path.distanceTo(x, z) < PATH_WIDTH / 2 + 1.2 || Math.hypot(x - CASTLE.x, z - CASTLE.z) < 9;
    const side = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.round(len / 2.5);
      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n;
        const z = z0 + ((z1 - z0) * i) / n;
        if (gap(x, z)) continue;
        if (i % 4 === 0) {
          posts.push([x, 1.4, z]);
          if (i % 8 === 0) lights.push([x, 3.2, z]);
        } else bars.push([x, 1.1, z]);
        // Rails to the next spot, if that's fence too.
        if (i < n) {
          const nx = x0 + ((x1 - x0) * (i + 1)) / n;
          const nz = z0 + ((z1 - z0) * (i + 1)) / n;
          if (!gap(nx, nz)) {
            for (const y of [0.5, 1.9]) {
              const rail = part(g, boxGeo(0.12, 0.12, Math.hypot(nx - x, nz - z)), ironMat, (x + nx) / 2, y, (z + nz) / 2);
              rail.rotation.y = Math.atan2(nx - x, nz - z);
              rail.castShadow = false;
            }
          }
        }
      }
    };
    side(minX, minZ, maxX, minZ);
    side(maxX, minZ, maxX, maxZ);
    side(maxX, maxZ, minX, maxZ);
    side(minX, maxZ, minX, minZ);
    const inst = (geo, mat, spots) => {
      const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
      const m4 = new THREE.Matrix4();
      spots.forEach(([x, y, z], i) => mesh.setMatrixAt(i, m4.makeTranslation(x, y, z)));
      mesh.castShadow = true;
      g.add(mesh);
    };
    // Spear-topped bars between stone-capped posts, and small blue lights on every other post.
    inst(boxGeo(0.14, 2.2, 0.14), ironMat, bars);
    inst(new THREE.ConeGeometry(0.16, 0.45, 4), ironMat, bars.map(([x, , z]) => [x, 2.4, z]));
    inst(boxGeo(0.5, 2.8, 0.5), stoneDarkMat, posts);
    inst(boxGeo(0.7, 0.3, 0.7), stoneMat, posts.map(([x, , z]) => [x, 2.95, z]));
    inst(new THREE.SphereGeometry(0.22, 8, 6), blueMat, lights);
  },

  clouds(scene) {
    // Heavy dark-grey storm clouds high over the map (they ignore fog so they show against the black sky).
    const rand = mulberry32(4242);
    for (let i = 0; i < 26; i++) {
      const a = rand() * Math.PI * 2;
      const d = 40 + rand() * 120;
      const c = new THREE.Group();
      c.position.set(Math.cos(a) * d, 70 + rand() * 25, Math.sin(a) * d * 0.8);
      c.userData.sky = true; // left out of the menu's picture of the map, which looks down from above
      scene.add(c);
      for (let k = 0; k < 4; k++) {
        const w = 18 + rand() * 22;
        const puff = new THREE.Mesh(boxGeo(w, 4 + rand() * 4, w * (0.5 + rand() * 0.4)), cloudMats[Math.floor(rand() * 3)]);
        puff.position.set((rand() - 0.5) * 24, (rand() - 0.5) * 3, (rand() - 0.5) * 14);
        c.add(puff);
      }
    }
  },
};
