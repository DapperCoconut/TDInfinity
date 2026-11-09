// Renders the static map (ground, path, portal, castle, decorations) from shared map data.
import * as THREE from 'three';
import { boxGeo, part } from './models.js';
import { mulberry32 } from './utils.js';
import { PATH_WIDTH, path } from './sim/path.js';
import { BOUNDS } from './sim/path.js';
import { BRIDGE_WIDTH, BRIDGE_X, CASTLE, CLIFFS, LANE_SPACING, MAP, POOLS, laneOz } from './sim/map.js';

function tileTexture(base, variants, lines, size = 128, cells = 8) {
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

const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6d4c2f });
const leafMats = [0x2e7d32, 0x388e3c, 0x43a047].map((c) => new THREE.MeshLambertMaterial({ color: c }));
const rockMat = new THREE.MeshLambertMaterial({ color: 0x8d8d8d });

/**
 * Builds one copy of the map into a new group (added to `scene`) and returns it.
 * opts.oz: z offset (Versus lanes). opts.versus: leave gaps in the border trees for the
 * bridges and give the ground a dirt bank so it reads as an island above the water.
 */
export function buildWorld(parent, { oz = 0, versus = false } = {}) {
  const scene = new THREE.Group();
  scene.position.z = oz;
  parent.add(scene);
  // --- Ground ---
  const grassTex = tileTexture('#5fae4a', ['#58a344', '#66b851', '#539c40'], 'rgba(0,0,0,0.08)');
  grassTex.repeat.set(260 / 16, 180 / 16);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 180), new THREE.MeshLambertMaterial({ map: grassTex }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  if (versus) {
    const bank = new THREE.Mesh(boxGeo(260, 4, 180), bankMat);
    bank.position.y = -2.02;
    bank.receiveShadow = true;
    scene.add(bank);
  }

  // --- Path (one box per segment, extended to cover the corners) ---
  const dirtTex = tileTexture('#c9a46b', ['#bf9a60', '#d1ad75', '#b8925a'], null, 64, 4);
  path.segs.forEach((s, i) => {
    const len = s.len + PATH_WIDTH;
    const tex = dirtTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1, len / PATH_WIDTH);
    const mesh = new THREE.Mesh(boxGeo(PATH_WIDTH, 0.2, len), new THREE.MeshLambertMaterial({ map: tex }));
    // Stagger heights slightly so overlapping corner pieces don't z-fight.
    mesh.position.set((s.a.x + s.b.x) / 2, 0.1 + i * 0.004, (s.a.z + s.b.z) / 2);
    mesh.rotation.y = Math.atan2(s.dx, s.dz);
    mesh.receiveShadow = true;
    scene.add(mesh);
  });

  buildPortal(scene, path.start);
  buildCastle(scene, CASTLE);
  for (const t of MAP.trees) makeTree(scene, t);
  for (const t of MAP.border) {
    if (versus && Math.abs(t.x - BRIDGE_X) < BRIDGE_WIDTH + 3 && Math.abs(t.z) > BOUNDS.maxZ - 2) continue; // bridge landing
    makeTree(scene, t);
  }
  for (const c of CLIFFS) buildCliff(scene, c);
  for (const p of POOLS) buildPool(scene, p);
  for (const r of MAP.rocks) {
    const rock = part(scene, boxGeo(2 * r.s, 1.4 * r.s, 1.7 * r.s), rockMat, r.x, 0.6 * r.s, r.z);
    rock.rotation.set(r.rx, r.ry, r.rz);
  }
  return scene;
}

const bankMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
const waterMat = new THREE.MeshLambertMaterial({ color: 0x2f8fd8 });
const plankMat = new THREE.MeshLambertMaterial({ color: 0x9c6b3c });
const plankDarkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
const ropeMat = new THREE.MeshLambertMaterial({ color: 0xd7ccc8 });

/**
 * Versus extras for `lanes` maps: water under everything and a wooden bridge across each gap.
 * Returns the group (added to `parent`).
 */
export function buildVersusLinks(parent, lanes) {
  const g = new THREE.Group();
  parent.add(g);
  const span = laneOz(lanes - 1);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(700, span + 700), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -1.6, span / 2);
  water.receiveShadow = true;
  g.add(water);
  for (let i = 0; i < lanes - 1; i++) {
    const z0 = laneOz(i) + BOUNDS.maxZ + 8;
    const z1 = laneOz(i + 1) - BOUNDS.maxZ - 8;
    const len = z1 - z0;
    const mid = (z0 + z1) / 2;
    const w = BRIDGE_WIDTH;
    // Beams underneath, then planks across.
    for (const side of [-1, 1]) part(g, boxGeo(0.6, 0.8, len), plankDarkMat, BRIDGE_X + side * (w / 2 - 0.6), -0.3, mid);
    for (let z = z0 + 0.6; z < z1; z += 1.25) {
      const p = part(g, boxGeo(w, 0.25, 1.05), z % 2.5 < 1.25 ? plankMat : plankDarkMat, BRIDGE_X, 0.02, z);
      p.rotation.y = ((z * 7.3) % 1 - 0.5) * 0.04;
    }
    // Posts and rope rails.
    for (const side of [-1, 1]) {
      const x = BRIDGE_X + side * (w / 2 + 0.2);
      for (let z = z0; z <= z1 + 0.01; z += len / 6) part(g, boxGeo(0.45, 2.6, 0.45), plankDarkMat, x, 0.9, z);
      part(g, boxGeo(0.15, 0.15, len), ropeMat, x, 1.9, mid);
      part(g, boxGeo(0.12, 0.12, len), ropeMat, x, 1.1, mid);
    }
    // Support pillars standing in the water.
    for (const z of [z0 + len * 0.3, z0 + len * 0.7]) {
      for (const side of [-1, 1]) part(g, boxGeo(0.9, 3, 0.9), plankDarkMat, BRIDGE_X + side * (w / 2 - 0.6), -1.8, z);
    }
  }
  return g;
}

/** Can a player stand at world (x, z) in a Versus game with `lanes` maps? (land or a bridge) */
export function versusWalkable(x, z, lanes) {
  if (x < BOUNDS.minX || x > BOUNDS.maxX) return false;
  const lane = Math.round(z / LANE_SPACING);
  if (lane < 0 || lane >= lanes) return false;
  const local = z - laneOz(lane);
  if (local >= BOUNDS.minZ && local <= BOUNDS.maxZ) return true;
  // Between maps: only on the bridge (not past the first or last map).
  if (Math.abs(x - BRIDGE_X) > BRIDGE_WIDTH / 2 - 0.9) return false;
  return local > 0 ? lane < lanes - 1 : lane > 0;
}

const cliffMat = new THREE.MeshLambertMaterial({ color: 0x8a7a66, flatShading: true });
const cliffDarkMat = new THREE.MeshLambertMaterial({ color: 0x6f6152, flatShading: true });
const cliffTopMat = new THREE.MeshLambertMaterial({ color: 0x6aa84f, flatShading: true });

const sandMat = new THREE.MeshLambertMaterial({ color: 0xd8c38e });
const poolMat = new THREE.MeshLambertMaterial({ color: 0x2f8fd8, emissive: 0x0b2f55 });
const poolDeepMat = new THREE.MeshLambertMaterial({ color: 0x1f6fb5, emissive: 0x08223f });
const reedMat = new THREE.MeshLambertMaterial({ color: 0x4f8f3a });
const lilyMat = new THREE.MeshLambertMaterial({ color: 0x6fbf4a });

/** A round pond with a sandy shore. Water towers (Patrol Boat) float in it. */
function buildPool(scene, { x, z, r }) {
  const rand = mulberry32(Math.round(x * 13 + z * 29 + 4242));
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const disc = (radius, y, mat) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.04, 28), mat);
    m.position.y = y;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  disc(r + 1, 0.03, sandMat); // shore
  disc(r, 0.06, poolMat); // water
  disc(r * 0.55, 0.07, poolDeepMat); // deeper middle
  // Reeds around the shore and a few lily pads near the edge.
  for (let i = 0; i < 10; i++) {
    const a = rand() * Math.PI * 2;
    const d = r + 0.3 + rand() * 0.5;
    const tall = 0.8 + rand() * 0.9;
    part(g, boxGeo(0.12, tall, 0.12), reedMat, Math.cos(a) * d, tall / 2, Math.sin(a) * d).rotation.z = (rand() - 0.5) * 0.4;
  }
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2;
    const d = r - 0.8 - rand() * 0.6;
    const lily = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.03, 8), lilyMat);
    lily.position.set(Math.cos(a) * d, 0.09, Math.sin(a) * d);
    g.add(lily);
  }
  scene.add(g);
}

/** A blocky rock plateau; cliff towers stand on its grassy top. */
function buildCliff(scene, { x, z, r, h }) {
  const rand = mulberry32(Math.round(x * 31 + z * 17 + 999));
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const rock = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.8, h, 10), cliffMat);
  rock.position.y = h / 2;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.05, r + 0.05, 0.3, 10), cliffTopMat);
  top.position.y = h + 0.05;
  for (const m of [rock, top]) {
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  // Boulders and ledges around the base so it reads as rock, not a pillar.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rand() * 0.4;
    const s = 1 + rand() * 1.4;
    const b = part(g, boxGeo(2 * s, 1.4 * s, 1.8 * s), rand() < 0.5 ? cliffMat : cliffDarkMat, Math.cos(a) * (r + 0.6), 0.5 * s, Math.sin(a) * (r + 0.6));
    b.rotation.set(rand() * 0.3, -a, rand() * 0.3);
  }
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2;
    const ledge = part(g, boxGeo(2.5, 0.8, 1.5), cliffDarkMat, Math.cos(a) * (r + 0.3), h * (0.35 + rand() * 0.4), Math.sin(a) * (r + 0.3));
    ledge.rotation.y = -a;
  }
  scene.add(g);
}

function makeTree(scene, { x, z, s, rot, leaf }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  g.scale.setScalar(s);
  part(g, boxGeo(1.2, 4, 1.2), trunkMat, 0, 2, 0);
  part(g, boxGeo(4.6, 3.4, 4.6), leafMats[leaf], 0, 5.2, 0);
  part(g, boxGeo(3, 2, 3), leafMats[leaf], 0, 7.6, 0);
  scene.add(g);
}

function buildPortal(scene, p) {
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  const stone = new THREE.MeshLambertMaterial({ color: 0x3a3a46 });
  const glow = new THREE.MeshBasicMaterial({ color: 0x9c27b0, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
  part(g, boxGeo(2, 12, 2), stone, 0, 6, -5);
  part(g, boxGeo(2, 12, 2), stone, 0, 6, 5);
  part(g, boxGeo(2.4, 2, 12.4), stone, 0, 12.5, 0);
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(8, 11.5), glow);
  portal.rotation.y = Math.PI / 2;
  portal.position.y = 5.8;
  g.add(portal);
  scene.add(g);
}

function buildCastle(scene, p) {
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  const wall = new THREE.MeshLambertMaterial({ color: 0xbdbdbd });
  const darkWall = new THREE.MeshLambertMaterial({ color: 0x9e9e9e });
  const roof = new THREE.MeshLambertMaterial({ color: 0x1565c0 });
  part(g, boxGeo(10, 10, 14), wall, 0, 5, 0);
  for (let i = -3; i <= 3; i++) {
    if (i % 2 === 0) continue;
    part(g, boxGeo(1.2, 1.4, 1.6), darkWall, -4.4, 10.7, i * 2);
    part(g, boxGeo(1.2, 1.4, 1.6), darkWall, 4.4, 10.7, i * 2);
  }
  for (const [tx, tz] of [[-5, -7], [-5, 7], [5, -7], [5, 7]]) {
    part(g, boxGeo(3.4, 14, 3.4), darkWall, tx, 7, tz);
    part(g, boxGeo(4, 2.4, 4), roof, tx, 15.2, tz);
  }
  part(g, boxGeo(0.4, 5.5, 5), new THREE.MeshLambertMaterial({ color: 0x4e342e }), -5.1, 2.75, 0); // gate
  part(g, boxGeo(0.3, 8, 0.3), darkWall, 0, 14, 0); // flag pole
  part(g, boxGeo(0.1, 2, 3), new THREE.MeshLambertMaterial({ color: 0xe53935 }), 0, 17, 1.6);
  scene.add(g);
}

/**
 * Insane mode: the Beholder's time dimension. A dark violet plain with one long straight path of
 * glowing stone, huge clock faces and floating gears all around. Built on first use (the shared
 * `path` must already be the time dimension's). Returns the group (added to `parent`); call
 * `group.userData.tick(t)` every frame to turn the clock hands and gears.
 */
export function buildTimeWorld(parent) {
  const scene = new THREE.Group();
  parent.add(scene);
  const floorTex = tileTexture('#241640', ['#2a1a4a', '#1e1236', '#2f1d55'], 'rgba(179,136,255,0.18)');
  floorTex.repeat.set(260 / 16, 180 / 16);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 180), new THREE.MeshLambertMaterial({ map: floorTex }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // The path: pale stone with glowing gold edges and clock-tick marks along it.
  const stone = new THREE.MeshLambertMaterial({ color: 0x9e8fc4 });
  const gold = new THREE.MeshBasicMaterial({ color: 0xffd740 });
  const violet = new THREE.MeshBasicMaterial({ color: 0xb388ff });
  for (const s of path.segs) {
    const len = s.len + PATH_WIDTH;
    const yaw = Math.atan2(s.dx, s.dz);
    const g = new THREE.Group();
    g.position.set((s.a.x + s.b.x) / 2, 0, (s.a.z + s.b.z) / 2);
    g.rotation.y = yaw;
    scene.add(g);
    part(g, boxGeo(PATH_WIDTH, 0.2, len), stone, 0, 0.1, 0).receiveShadow = true;
    for (const side of [-1, 1]) part(g, boxGeo(0.25, 0.3, len), gold, side * (PATH_WIDTH / 2 + 0.1), 0.15, 0);
    for (let z = -len / 2 + 3; z < len / 2; z += 6) part(g, boxGeo(PATH_WIDTH * 0.6, 0.06, 0.3), violet, 0, 0.23, z);
  }
  buildPortal(scene, path.start);
  buildCastle(scene, CASTLE);

  // Giant clock faces standing on both sides of the path, and gears floating overhead.
  const rimMat = new THREE.MeshLambertMaterial({ color: 0xffc400, emissive: 0x3a2a00 });
  const faceMat = new THREE.MeshLambertMaterial({ color: 0xede7f6, emissive: 0x2a1f40 });
  const handMat = new THREE.MeshBasicMaterial({ color: 0x1a1033 });
  const gearMat = new THREE.MeshLambertMaterial({ color: 0x7e57c2, emissive: 0x1a0f33 });
  const hands = [];
  const gears = [];
  const rand = mulberry32(4242);
  const clock = (x, z, size, yaw) => {
    const g = new THREE.Group();
    g.position.set(x, size + 1, z);
    g.rotation.y = yaw;
    scene.add(g);
    part(g, new THREE.CylinderGeometry(size, size, 0.6, 32).rotateX(Math.PI / 2), faceMat, 0, 0, 0);
    part(g, new THREE.TorusGeometry(size, size * 0.08, 6, 32), rimMat, 0, 0, 0);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      part(g, boxGeo(size * 0.06, size * (i % 3 ? 0.1 : 0.18), 0.2), handMat, Math.sin(a) * size * 0.85, Math.cos(a) * size * 0.85, 0.35).rotation.z = -a;
    }
    const hour = new THREE.Group();
    const minute = new THREE.Group();
    hour.position.z = minute.position.z = 0.45;
    part(hour, boxGeo(size * 0.08, size * 0.5, 0.1), handMat, 0, size * 0.25, 0);
    part(minute, boxGeo(size * 0.05, size * 0.8, 0.1), handMat, 0, size * 0.4, 0);
    g.add(hour, minute);
    part(g, boxGeo(size * 0.2, size + 1, size * 0.2), rimMat, 0, -size / 2 - 0.5, -0.4); // stand
    hands.push({ hour, minute, speed: (rand() < 0.5 ? -1 : 1) * (0.3 + rand() * 1.5) });
  };
  for (const [x, z, size] of [[-80, 30, 7], [-35, 45, 9], [10, 32, 6], [55, 48, 10], [-60, -45, 8], [-5, -48, 7], [40, -42, 9], [80, 25, 6]]) {
    clock(x, z, size, z > 0 ? Math.PI : 0);
  }
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group();
    const r = 3 + rand() * 6;
    g.position.set(-110 + rand() * 220, 18 + rand() * 25, -70 + rand() * 140);
    g.rotation.x = Math.PI / 2 + (rand() - 0.5) * 0.8;
    part(g, new THREE.CylinderGeometry(r, r, 0.8, 20), gearMat, 0, 0, 0);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      part(g, boxGeo(r * 0.3, 0.8, r * 0.3), gearMat, Math.cos(a) * r, 0, Math.sin(a) * r).rotation.y = -a;
    }
    scene.add(g);
    gears.push({ g, speed: (rand() - 0.5) * 1.2 });
  }
  scene.userData.tick = (t) => {
    for (const h of hands) {
      h.minute.rotation.z = -t * h.speed;
      h.hour.rotation.z = (-t * h.speed) / 12;
    }
    for (const { g, speed } of gears) g.rotation.y = t * speed;
  };
  return scene;
}
