// Brook Hollow's renderer: everything is built from BROOK_GRID (src/sim/maps.js) and the prop
// spots the sim lays in MAP.props, so the picture matches placement and colliders.
import * as THREE from 'three';
import { boxGeo, part } from './models.js';
import { mulberry32 } from './utils.js';
import { PATH_WIDTH, path } from './sim/path.js';
import { LANE_SPACING, MAP } from './sim/map.js';
import { BROOK_BOULDER, BROOK_CELL, BROOK_GRID, BROOK_PILLAR, BROOK_ROAD, BROOK_ROCKS, BROOK_STREAM, brookCell, brookCh, brookH } from './sim/maps.js';

const C = BROOK_CELL;
const ROWS = BROOK_GRID.length;
const COLS = BROOK_GRID[0].length;
const W = COLS * C;
const D = ROWS * C;
/** World x of the west edge of column c, z of the north edge of row index i. */
const X0 = (c) => (c - COLS / 2) * C;
const Z0 = (i) => (i - ROWS / 2) * C;
const at = (c, r) => brookCell(c, r); // centre of column c, 1-based row r
const isRoad = (c, i) => BROOK_ROAD.includes(brookCh(c, i));
const isStream = (c, i) => BROOK_STREAM.includes(brookCh(c, i));
const SEA = -6; // the sea beyond the cliffs; every cliff column stands in it

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const basic = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });

let mats = null;
function materials() {
  if (mats) return mats;
  mats = {
    block: lambert(0xffffff, { flatShading: true }), // tinted per instance
    rock: lambert(0x2e3542, { flatShading: true }),
    rockDark: lambert(0x232935, { flatShading: true }),
    moss: lambert(0x8fd56a, { flatShading: true }),
    mossDark: lambert(0x6fbf52, { flatShading: true }),
    channel: lambert(0x48a83a),
    bank: lambert(0x3a8a30),
    bed: lambert(0x23407a),
    waterTex: waterTexture(),
    sea: lambert(0x6fa0d8),
    plank: lambert(0x857766),
    plankDark: lambert(0x6a5e50),
    grate: lambert(0xa0a0a0),
    tuft: lambert(0x2fcf7a, { flatShading: true }),
    cave: basic(0x0a0a0a),
  };
  return mats;
}

/** Route chevrons shade from yellow at the spawn through orange to red at the base. */
const chevronColor = (f) => (f < 0.34 ? '#ffd21a' : f < 0.68 ? '#ff8a1a' : '#ff2a2a');

/** The bowl floor, painted per cell: speckled grass, the stone path with its darker trim, the chevrons. */
function groundTexture() {
  const P = 32; // pixels per cell
  const cv = document.createElement('canvas');
  cv.width = COLS * P;
  cv.height = ROWS * P;
  const g = cv.getContext('2d');
  const rand = mulberry32(5150);
  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1), 16);
    const k = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    return `rgb(${k(n >> 16)},${k((n >> 8) & 255)},${k(n & 255)})`;
  };
  for (let i = 0; i < ROWS; i++) {
    for (let c = 0; c < COLS; c++) {
      if (isStream(c, i)) continue; // holes (alpha 0): the stream channel shows through, under both bridges too
      const road = isRoad(c, i);
      const base = road ? '#6e6670' : '#6fd24f';
      for (let y = 0; y < P; y += 4) {
        for (let x = 0; x < P; x += 4) {
          g.fillStyle = shade(base, road ? 0.95 + rand() * 0.1 : 0.9 + rand() * 0.2);
          g.fillRect(c * P + x, i * P + y, 4, 4);
        }
      }
      if (road) {
        // The darker stone trim (about 1 stud) where the path meets grass.
        g.fillStyle = '#554e58';
        for (const [dc, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (isRoad(c + dc, i + di) || isStream(c + dc, i + di) || brookCh(c + dc, i + di) === '^') continue;
          g.fillRect(c * P + (dc === 1 ? P - 5 : 0), i * P + (di === 1 ? P - 5 : 0), dc ? 5 : P, di ? 5 : P);
        }
      }
    }
  }
  // Chevrons pointing the way enemies walk: 2-3 just after every turn, and more along the long runs.
  const pts = path.points;
  const total = path.length;
  let run = 0;
  const chevron = (x, z, dx, dz, f) => {
    const px = (x / C + COLS / 2) * P;
    const py = (z / C + ROWS / 2) * P;
    const s = P * 0.55;
    const t = P * 0.32; // arm thickness along the walking direction
    g.fillStyle = chevronColor(f);
    g.beginPath();
    g.moveTo(px + dx * s * 0.5, py + dz * s * 0.5); // the tip
    g.lineTo(px - dx * s * 0.5 - dz * s, py - dz * s * 0.5 + dx * s);
    g.lineTo(px - dx * (s * 0.5 + t) - dz * s, py - dz * (s * 0.5 + t) + dx * s);
    g.lineTo(px + dx * (s * 0.5 - t), py + dz * (s * 0.5 - t));
    g.lineTo(px - dx * (s * 0.5 + t) + dz * s, py - dz * (s * 0.5 + t) - dx * s);
    g.lineTo(px - dx * s * 0.5 + dz * s, py - dz * s * 0.5 - dx * s);
    g.closePath();
    g.fill();
  };
  for (let k = 0; k + 1 < pts.length; k++) {
    const a = pts[k];
    const b = pts[k + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const dx = (b.x - a.x) / len;
    const dz = (b.z - a.z) / len;
    const marks = [];
    if (k > 0) for (const d of [6, 10, 14]) if (d < len - 4) marks.push(d); // after the turn (clear of the corner)
    for (let d = 34; d < len - 8; d += 24) marks.push(d); // along the long straights
    if (k === 1) marks.unshift(2); // the first stretch out of the cave
    for (const d of marks) {
      const x = a.x + dx * d;
      const z = a.z + dz * d;
      if (isStream(...[Math.floor(x / C + COLS / 2), Math.floor(z / C + ROWS / 2)])) continue; // not on a bridge
      chevron(x, z, dx, dz, (run + d) / total);
    }
    run += len;
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.magFilter = THREE.NearestFilter;
  return t;
}

/** Blue water with white foam streaks (tiles; scrolled every frame so the stream flows south-west). */
function waterTexture() {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = '#3a6fd0';
  g.fillRect(0, 0, 64, 64);
  const rand = mulberry32(31);
  for (let k = 0; k < 26; k++) {
    g.fillStyle = rand() < 0.6 ? 'rgba(255,255,255,0.75)' : 'rgba(120,170,240,0.7)';
    const x = rand() * 64;
    const y = rand() * 64;
    const w = 6 + rand() * 14;
    for (const [ox, oy] of [[0, 0], [-64, 0], [0, -64], [-64, -64]]) g.fillRect(x + ox, y + oy, w, 1.5 + rand() * 1.5);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const boulderGeo = new THREE.DodecahedronGeometry(1, 0);
function boulder(parent, mat, x, y, z, sx, sy, sz, rot) {
  const b = part(parent, boulderGeo, mat, x, y, z);
  b.scale.set(sx, sy, sz);
  b.rotation.set(rot * 0.3, rot, rot * 0.2);
  return b;
}

/** One blocky slate column (`w` x `d`, from `y0` up to `top`) with a blotchy mossy cap. */
function column(list, x, z, w, d, y0, top) {
  list.push({ x, z, w, d, y0, top });
}

/**
 * Brook Hollow, built from the spec grid: a bright grass bowl ringed by tall separate slate
 * columns with grassy tops, the sea beyond. The stone path zig-zags from the north cave to the
 * west cave; a little stream cuts diagonally under a plank bridge (dry) and a grate (wet).
 */
export function buildBrook(parent, { oz = 0, versus = false } = {}) {
  const scene = new THREE.Group();
  scene.position.z = oz;
  parent.add(scene);
  const m = materials();
  const animated = [];
  const rand = mulberry32(7373);

  // --- The sea all round (a strip per lane in Versus).
  const sea = new THREE.Mesh(versus ? new THREE.PlaneGeometry(260, LANE_SPACING) : new THREE.PlaneGeometry(700, 700), m.sea);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = SEA;
  sea.receiveShadow = true;
  scene.add(sea);

  // --- The bowl floor: one painted plane with holes along the stream.
  const tex = groundTexture();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.02;
  ground.receiveShadow = true;
  scene.add(ground);
  // Solid earth under the floor so nothing shows through from below.
  part(scene, boxGeo(W, -SEA - 2.2, D), m.bank, 0, (SEA - 2.2) / 2 - 0.0, 0).castShadow = false;

  // --- The stream: a sunken grassy ditch (dry in the north), blue water with foam from row 12 south.
  {
    m.water ??= lambert(0xffffff, { map: m.waterTex, transparent: true, opacity: 0.88, emissive: 0x102040 });
    animated.push((t) => m.waterTex.offset.set((t * 0.25) % 1, (-t * 0.25) % 1)); // flowing south-west
    const waterGeo = new THREE.PlaneGeometry(C, C);
    for (let i = 0; i < ROWS; i++) {
      for (let c = 0; c < COLS; c++) {
        if (!isStream(c, i)) continue;
        const k = brookCh(c, i);
        const [x, z] = at(c, i + 1);
        // Under a bridge the bed matches its side: dry under the planks, wet under the grate.
        const wet = k === '~' || k === 'g';
        const bed = wet ? -1.8 : -1.2;
        part(scene, boxGeo(C, 0.4, C), wet ? m.bed : m.channel, x, bed - 0.2, z).castShadow = false;
        if (wet) {
          const w = new THREE.Mesh(waterGeo, m.water);
          w.rotation.x = -Math.PI / 2;
          w.position.set(x, -0.55, z);
          scene.add(w);
        }
        // Grass banks where the ditch meets the floor.
        for (const [dc, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = BROOK_GRID[i + di]?.[c + dc];
          if (n == null || n === '^' || isStream(c + dc, i + di)) continue;
          const bank = part(scene, boxGeo(dc ? 0.3 : C, -bed, di ? 0.3 : C), m.bank, x + dc * (C / 2 - 0.15), bed / 2, z + di * (C / 2 - 0.15));
          bank.castShadow = false;
        }
      }
    }
  }

  // --- The wooden plank bridge (G-H 7) over the dry ditch: planks across the path, flush with it.
  {
    const [x0] = at(6, 7);
    const [x1, z] = at(7, 7);
    const cx = (x0 + x1) / 2;
    const w = x1 - x0 + C;
    for (const sx of [-1, 1]) part(scene, boxGeo(0.5, 0.5, C + 1), m.plankDark, cx + sx * (w / 2 - 0.6), -0.3, z).castShadow = false;
    for (let k = 0; k < 8; k++) {
      const p = part(scene, boxGeo(w, 0.18, C / 8 - 0.06), k % 3 ? m.plank : m.plankDark, cx, -0.06, z - C / 2 + (k + 0.5) * (C / 8));
      p.castShadow = false;
    }
  }

  // --- The metal grate bridge (D15-D16) over open water: a light grey frame, five bars along the path.
  {
    const [x, z0] = at(3, 15);
    const [, z1] = at(3, 16);
    const cz = (z0 + z1) / 2;
    const d = z1 - z0 + C;
    for (const sz of [-1, 1]) part(scene, boxGeo(C, 0.35, 0.4), m.grate, x, -0.15, cz + sz * (d / 2 - 0.2)).castShadow = false;
    for (const sx of [-1, 1]) part(scene, boxGeo(0.4, 0.35, d), m.grate, x + sx * (C / 2 - 0.2), -0.15, cz).castShadow = false;
    for (let k = 0; k < 5; k++) part(scene, boxGeo(C, 0.22, 0.32), m.grate, x, -0.1, cz - d / 2 + 0.4 + ((k + 0.5) * (d - 0.8)) / 5).castShadow = false;
    for (const ox of [-C / 4, C / 4]) part(scene, boxGeo(0.2, 0.16, d - 0.8), m.grate, x + ox, -0.2, cz).castShadow = false; // cross ties under the bars
  }

  // --- The cliffs: tall separate slate columns with grassy tops, in the grid and in a ring beyond it.
  const cols = [];
  for (let i = 0; i < ROWS; i++) {
    for (let c = 0; c < COLS; c++) {
      if (brookCh(c, i) !== '^') continue;
      const [x, z] = at(c, i + 1);
      column(cols, x, z, C - 0.12, C - 0.12, SEA, brookH(c, i));
    }
  }
  if (!versus) {
    // Outer ring: 3 cells of columns beyond the grid, tallest in the north-east; in the north-west
    // they break up into low sea stacks so the open sea shows.
    for (let i = -3; i < ROWS + 3; i++) {
      for (let c = -3; c < COLS + 3; c++) {
        if (i >= 0 && i < ROWS && c >= 0 && c < COLS) continue;
        const [x, z] = at(c, i + 1);
        const nw = c < 9 && i < 5;
        if (nw) {
          if (rand() < 0.55) continue;
          column(cols, x + (rand() - 0.5) * 1.5, z + (rand() - 0.5) * 1.5, C * (0.5 + rand() * 0.4), C * (0.5 + rand() * 0.4), SEA, -2 + rand() * 7);
          continue;
        }
        const ne = (c > 14 ? 1 : 0) + (i < 6 ? 1 : 0);
        const low = c < 2 || i > ROWS - 2;
        const top = (low ? 14 : 24) + ne * 3 + rand() * 7;
        column(cols, x, z, C - 0.12, C - 0.12, SEA, top);
      }
    }
  }
  {
    const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), m.block, cols.length);
    const caps = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), m.block, cols.length);
    for (const mesh of [blocks, caps]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
    const o = new THREE.Object3D();
    const tmp = new THREE.Color();
    cols.forEach((k, n) => {
      o.position.set(k.x, (k.y0 + k.top - 0.5) / 2, k.z);
      o.scale.set(k.w, k.top - 0.5 - k.y0, k.d);
      o.updateMatrix();
      blocks.setMatrixAt(n, o.matrix);
      blocks.setColorAt(n, tmp.set(rand() < 0.5 ? 0x2e3542 : 0x2a303c).offsetHSL(0, 0, (rand() - 0.5) * 0.05));
      o.position.set(k.x, k.top - 0.3, k.z);
      o.scale.set(k.w + 0.25, 0.6, k.d + 0.25);
      o.updateMatrix();
      caps.setMatrixAt(n, o.matrix);
      caps.setColorAt(n, tmp.set(rand() < 0.4 ? 0x7fc85c : 0x8fd56a).offsetHSL(0, 0, (rand() - 0.5) * 0.06));
    });
    scene.add(blocks, caps);
  }
  // Faceted boulders along the cliff foot, so the edge isn't a clean grid of boxes.
  for (let i = 0; i < ROWS; i++) {
    for (let c = 0; c < COLS; c++) {
      if (brookCh(c, i) !== '^') continue;
      const [x, z] = at(c, i + 1);
      for (const [dc, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = BROOK_GRID[i + di]?.[c + dc];
        if (n == null || n === '^' || isStream(c + dc, i + di) || isRoad(c + dc, i + di)) continue;
        if (rand() < 0.55) continue;
        const bx = x + dc * C * 0.4;
        const bz = z + di * C * 0.4;
        if (path.distanceTo(bx, bz) < PATH_WIDTH / 2 + 3) continue;
        boulder(scene, rand() < 0.5 ? m.rock : m.rockDark, bx, 0.6 + rand() * 1.4, bz, 1 + rand() * 0.6, 1.4 + rand() * 1.6, 1 + rand() * 0.6, rand() * 6);
      }
    }
  }

  // --- The small grass-topped pillar standing out in front of the north cliff (U1).
  {
    const [x, z] = BROOK_PILLAR;
    part(scene, new THREE.CylinderGeometry(1.5, 1.8, 24 - SEA, 6), m.rock, x, (24 + SEA) / 2, z);
    part(scene, new THREE.CylinderGeometry(1.75, 1.6, 0.7, 6), m.moss, x, 24.2, z);
  }

  // --- The rock blocks: dark faceted slate with flat green tops.
  for (const k of BROOK_ROCKS) {
    const [x, z] = brookCell(k.c, k.r);
    const w = k.w * C - 0.4;
    const d = k.d * C - 0.4;
    const slab = k.d === 1; // the long low slab has rounded ends
    const body = part(scene, boxGeo(w, k.h - 0.5, d), m.rock, x, (k.h - 0.5) / 2, z);
    body.rotation.y = (rand() - 0.5) * 0.08;
    part(scene, boxGeo(w + 0.2, 0.55, d + 0.2), m.moss, x, k.h - 0.27, z).rotation.y = body.rotation.y;
    if (slab) {
      for (const s of [-1, 1]) {
        const end = part(scene, new THREE.CylinderGeometry(d / 2, d / 2, k.h - 0.5, 10), m.rock, x + s * (w / 2), (k.h - 0.5) / 2, z);
        end.scale.set(0.7, 1, 1);
        part(scene, new THREE.CylinderGeometry(d / 2 + 0.1, d / 2 + 0.1, 0.55, 10), m.moss, x + s * (w / 2), k.h - 0.27, z).scale.set(0.7, 1, 1);
      }
    } else {
      // Facets: chipped chunks on the corners.
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        if (rand() < 0.35) continue;
        boulder(scene, m.rockDark, x + sx * (w / 2 - 0.5), 0.8 + rand() * (k.h - 2), z + sz * (d / 2 - 0.5), 0.9, 1.1 + rand(), 0.9, rand() * 6);
      }
    }
  }

  // --- Grass tufts: spiky teal clumps (one instanced mesh of thin cones).
  {
    const tufts = MAP.props.filter((p) => p.kind === 'tuft');
    const blades = 6;
    const mesh = new THREE.InstancedMesh(new THREE.ConeGeometry(0.22, 1, 4), m.tuft, tufts.length * blades);
    mesh.castShadow = true;
    const o = new THREE.Object3D();
    let n = 0;
    for (const p of tufts) {
      for (let b = 0; b < blades; b++) {
        const a = p.rot + (b / blades) * Math.PI * 2;
        const r = b === 0 ? 0 : 0.35 + rand() * 0.3;
        const h = (1.6 + rand() * 1.6) * p.s;
        o.position.set(p.x + Math.cos(a) * r, h / 2, p.z + Math.sin(a) * r);
        o.rotation.set(Math.sin(a) * 0.35 * (r > 0 ? 1 : 0), 0, -Math.cos(a) * 0.35 * (r > 0 ? 1 : 0));
        o.scale.set(p.s, h, p.s);
        o.updateMatrix();
        mesh.setMatrixAt(n++, o.matrix);
      }
    }
    mesh.count = n;
    scene.add(mesh);
  }

  // --- The spawn cave in the north cliff (Q1-R1): a dark rounded opening in a rock block.
  {
    const [x0] = at(16, 1);
    const [x1] = at(17, 1);
    const cx = (x0 + x1) / 2;
    const zf = Z0(1); // the cliff face
    part(scene, boxGeo(2 * C, 20 - 4.4, C), m.rock, cx, 4.4 + (20 - 4.4) / 2, zf - C / 2); // the rock block over the mouth
    part(scene, boxGeo(2 * C + 0.25, 0.6, C + 0.25), m.moss, cx, 20.2, zf - C / 2);
    const arch = part(scene, new THREE.CylinderGeometry(3.6, 3.6, 0.1, 18, 1, false, -Math.PI / 2, Math.PI), m.cave, cx, 4.4, zf + 0.05);
    arch.rotation.x = -Math.PI / 2; // the half disc stands up, rounding the opening's top
    arch.castShadow = false;
    part(scene, boxGeo(2 * C - 0.3, 4.4, C - 0.2), m.cave, cx, 2.2, zf - C / 2).castShadow = false; // the dark bore
  }

  // --- The base cave in the west cliff (A15-A16), beside a large mossy boulder.
  {
    const [, z0] = at(0, 15);
    const [, z1] = at(0, 16);
    const cz = (z0 + z1) / 2;
    const xf = X0(1); // the cliff face (east edge of column A)
    part(scene, boxGeo(C, 11 - 4.4, 2 * C), m.rock, X0(0) + C / 2, 4.4 + (11 - 4.4) / 2, cz); // over the mouth
    part(scene, boxGeo(C + 0.25, 0.6, 2 * C + 0.25), m.moss, X0(0) + C / 2, 11.2, cz);
    const arch = part(scene, new THREE.CylinderGeometry(3.6, 3.6, 0.1, 18, 1, false, Math.PI, Math.PI), m.cave, xf + 0.05, 4.4, cz);
    arch.rotation.z = -Math.PI / 2; // facing east, the half disc standing up
    arch.castShadow = false;
    part(scene, boxGeo(C - 0.2, 4.4, 2 * C - 0.3), m.cave, X0(0) + C / 2, 2.2, cz).castShadow = false; // the dark bore
    const [bx, bz] = BROOK_BOULDER;
    boulder(scene, m.mossDark, bx, 2.2, bz, 2.4, 2.8, 2.2, 0.7);
    boulder(scene, m.rock, bx - 0.8, 1.1, bz - 0.8, 2.4, 2, 2.2, 2.1);
  }

  scene.userData.tick = (t) => animated.forEach((f) => f(t));
  return scene;
}
