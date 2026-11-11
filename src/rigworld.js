// Rig Point's renderer: an offshore oil rig, built from RIG_GRID (src/sim/maps.js) and the
// structures the sim lays in MAP.props, so the picture matches placement and colliders.
import * as THREE from 'three';
import { boxGeo, part } from './models.js';
import { mulberry32 } from './utils.js';
import { path } from './sim/path.js';
import { LANE_SPACING, MAP } from './sim/map.js';
import { RIG_CELL, RIG_GRID, RIG_SEA, rigCell, rigCh } from './sim/maps.js';

const C = RIG_CELL;
const ROWS = RIG_GRID.length;
const COLS = RIG_GRID[0].length;
const W = COLS * C;
const D = ROWS * C;
/** World x of the west edge of column c, z of the north edge of row index i. */
const X0 = (c) => (c - COLS / 2) * C;
const Z0 = (i) => (i - ROWS / 2) * C;
const at = (c, r) => rigCell(c, r); // centre of column c, 1-based row r
const WALK = '#SBg'; // painted green walkway (the path and the unused strips)
/** Bridges over open water are their own meshes: the spawn bridge (U6-U8) and the helipad footbridge (J28). */
const overWater = (c, i) => rigCh(c, i) === '=' && (c < 10 || i < 8);
// The main deck K9-AJ33 (rounded corners) and the octagonal helipad A24-I33.
const DECK = { x0: X0(10), x1: X0(36), z0: Z0(8), z1: Z0(33), r: 6 };
const PAD = { x0: X0(0), x1: X0(9), z0: Z0(23), z1: Z0(33), cut: 2 * C };
const DECK_T = 2.6; // deck slab thickness

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });

let mats = null;
function materials() {
  if (mats) return mats;
  mats = {
    wall: lambert(0x4a4d50),
    roof: lambert(0x3e4144),
    roofDetail: lambert(0x55585c),
    window: lambert(0x22262c),
    door: new THREE.MeshBasicMaterial({ color: 0x0c0d10 }),
    slab: lambert(0x6e7072),
    slabDark: lambert(0x55575a),
    rim: lambert(0x7a2a28),
    rail: lambert(0xd0262a),
    leg: lambert(0xc83030),
    steel: lambert(0x3a3d42),
    steelLight: lambert(0x6a6d72),
    tank: lambert(0x505456),
    tankBand: lambert(0x3e4244),
    white: lambert(0xe0e0e0),
    crane: lambert(0xc0282c),
    craneDark: lambert(0x8a1c20),
    latticeRed: lambert(0xd0262a),
    latticeWhite: lambert(0xf2f2f2),
    flare: new THREE.MeshBasicMaterial({ color: 0xffa020, transparent: true, opacity: 0.92 }),
    flareCore: new THREE.MeshBasicMaterial({ color: 0xfff0a0 }),
    panel: lambert(0x2e3a4a),
    heli: lambert(0x2a2c30),
    heliGlass: lambert(0x1a2a3a, { emissive: 0x0a1420 }),
    black: lambert(0x1c1d20),
    wood: lambert(0x9a7448),
    woodDark: lambert(0x7a5a36),
    crate: lambert(0x8a6038),
    barrier: lambert(0xe6e6e2),
    drum: lambert(0x1e1f22),
    pipe: lambert(0x8c9094),
    yellow: lambert(0xe8c020),
    sea: lambert(0xffffff, { map: seaTexture(), emissive: 0x0e2a3c }),
  };
  for (const [k, color] of [['red', 0xa04838], ['blue', 0x4a5e8c], ['green', 0x4f7f4a]]) {
    mats[`cont_${color}`] = lambert(color, { map: corrugation() });
    mats[k] = mats[`cont_${color}`];
  }
  return mats;
}

/** Clear medium blue with gentle wave streaks and white sparkles (tiled, scrolled every frame). */
function seaTexture() {
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#4a86a8';
  g.fillRect(0, 0, 128, 128);
  const rand = mulberry32(808);
  for (let k = 0; k < 60; k++) {
    g.fillStyle = rand() < 0.5 ? 'rgba(90,150,185,0.6)' : 'rgba(60,115,150,0.6)';
    const x = rand() * 128;
    const y = rand() * 128;
    const w = 10 + rand() * 26;
    for (const [ox, oy] of [[0, 0], [-128, 0], [0, -128], [-128, -128]]) g.fillRect(x + ox, y + oy, w, 2);
  }
  for (let k = 0; k < 22; k++) {
    g.fillStyle = 'rgba(255,255,255,0.85)';
    const x = rand() * 128;
    const y = rand() * 128;
    g.fillRect(x, y, 2 + rand() * 4, 1.2);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Vertical corrugation stripes for the containers (tinted by the material colour). */
function corrugation() {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 8;
  const g = cv.getContext('2d');
  for (let x = 0; x < 64; x += 4) {
    g.fillStyle = x % 8 ? '#ffffff' : '#c8c8c8';
    g.fillRect(x, 0, 4, 8);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  return t;
}

/** A rounded rectangle path (for the deck's outline). */
function roundedRect(x0, z0, x1, z1, r) {
  const s = new THREE.Shape();
  s.moveTo(x0 + r, z0);
  s.lineTo(x1 - r, z0);
  s.quadraticCurveTo(x1, z0, x1, z0 + r);
  s.lineTo(x1, z1 - r);
  s.quadraticCurveTo(x1, z1, x1 - r, z1);
  s.lineTo(x0 + r, z1);
  s.quadraticCurveTo(x0, z1, x0, z1 - r);
  s.lineTo(x0, z0 + r);
  s.quadraticCurveTo(x0, z0, x0 + r, z0);
  return s;
}

/** The helipad's octagon corners (x, z). */
function padOctagon() {
  const { x0, x1, z0, z1, cut } = PAD;
  return [[x0 + cut, z0], [x1 - cut, z0], [x1, z0 + cut], [x1, z1 - cut], [x1 - cut, z1], [x0 + cut, z1], [x0, z1 - cut], [x0, z0 + cut]];
}

/** Salmon chevrons pointing the way. */
const CHEVRON = '#f06050';

/**
 * Every walkable surface, painted per cell on one canvas: the grey deck with stains, hatches and
 * skid marks, the green walkway with its yellow-orange edge lines, chevrons and EXIT stencils, the
 * helipad. Ocean cells (and bridges over water) stay transparent.
 */
function groundTexture() {
  const P = 32; // pixels per cell
  const cv = document.createElement('canvas');
  cv.width = COLS * P;
  cv.height = ROWS * P;
  const g = cv.getContext('2d');
  const rand = mulberry32(6060);
  const px = (x) => (x / C + COLS / 2) * P;
  const pz = (z) => (z / C + ROWS / 2) * P;
  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1), 16);
    const k = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    return `rgb(${k(n >> 16)},${k((n >> 8) & 255)},${k(n & 255)})`;
  };
  // The helipad first: dark panels in the cut corners, the green octagon, white edge, yellow circle, the H.
  g.fillStyle = '#2e3a4a';
  g.fillRect(px(PAD.x0), pz(PAD.z0), px(PAD.x1) - px(PAD.x0), pz(PAD.z1) - pz(PAD.z0));
  g.beginPath();
  padOctagon().forEach(([x, z], k) => (k ? g.lineTo(px(x), pz(z)) : g.moveTo(px(x), pz(z))));
  g.closePath();
  g.fillStyle = '#5e9e6a';
  g.fill();
  g.lineWidth = 7;
  g.strokeStyle = '#f2f2f2';
  g.stroke();
  const [hx, hz] = at(4, 28.5);
  g.beginPath();
  g.arc(px(hx), pz(hz), 3.6 * P, 0, Math.PI * 2);
  g.lineWidth = 12;
  g.strokeStyle = '#e8c840';
  g.stroke();
  g.fillStyle = '#f2f2f2';
  g.fillRect(px(hx) - 1.6 * P, pz(hz) - 2.2 * P, 0.7 * P, 4.4 * P);
  g.fillRect(px(hx) + 0.9 * P, pz(hz) - 2.2 * P, 0.7 * P, 4.4 * P);
  g.fillRect(px(hx) - 1.6 * P, pz(hz) - 0.35 * P, 3.2 * P, 0.7 * P);
  // Cells.
  for (let i = 0; i < ROWS; i++) {
    for (let c = 0; c < COLS; c++) {
      const k = rigCh(c, i);
      if (k === '~' || k === 'h' || overWater(c, i)) continue;
      const walk = WALK.includes(k);
      const steel = k === '=';
      if (walk && c < 9) {
        // The walkway across the helipad: just the green strip.
        g.fillStyle = '#6fa878';
        g.fillRect(c * P, i * P + 4, P, P - 8);
        continue;
      }
      const base = walk ? '#6fa878' : steel ? '#4a4d52' : '#8a8c8e';
      for (let y = 0; y < P; y += 4) {
        for (let x = 0; x < P; x += 4) {
          g.fillStyle = shade(base, walk ? 0.97 + rand() * 0.06 : 0.93 + rand() * 0.12);
          g.fillRect(c * P + x, i * P + y, 4, 4);
        }
      }
      if (walk || steel) {
        // Thin yellow-orange edge lines where the walkway meets the deck.
        g.fillStyle = '#d8a040';
        for (const [dc, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = rigCh(c + dc, i + di);
          if (WALK.includes(n) || n === '=') continue;
          g.fillRect(c * P + (dc === 1 ? P - 4 : dc === -1 ? 1 : 0), i * P + (di === 1 ? P - 4 : di === -1 ? 1 : 0), dc ? 3 : P, di ? 3 : P);
        }
      }
    }
  }
  // Deck wear: darker stains, small floor hatches and tyre skid marks (off the walkway).
  const deckAt = (x, z) => rigCh(Math.floor(x / C + COLS / 2), Math.floor(z / C + ROWS / 2)) === '.';
  for (let k = 0; k < 70; k++) {
    const x = DECK.x0 + rand() * (DECK.x1 - DECK.x0);
    const z = DECK.z0 + rand() * (DECK.z1 - DECK.z0);
    if (!deckAt(x, z)) continue;
    g.fillStyle = `rgba(80,82,84,${0.25 + rand() * 0.25})`;
    g.beginPath();
    g.ellipse(px(x), pz(z), 6 + rand() * 22, 4 + rand() * 14, rand() * 3, 0, Math.PI * 2);
    g.fill();
  }
  for (let k = 0; k < 26; k++) {
    const x = DECK.x0 + rand() * (DECK.x1 - DECK.x0);
    const z = DECK.z0 + rand() * (DECK.z1 - DECK.z0);
    if (!deckAt(x, z) || !deckAt(x + 1.5, z + 1.5)) continue;
    g.fillStyle = '#6e7072';
    g.fillRect(px(x), pz(z), 14, 14);
    g.strokeStyle = '#5a5c5e';
    g.lineWidth = 2;
    g.strokeRect(px(x) + 2, pz(z) + 2, 10, 10);
  }
  g.strokeStyle = 'rgba(40,40,42,0.35)';
  g.lineWidth = 3;
  for (let k = 0; k < 10; k++) {
    const x = DECK.x0 + rand() * (DECK.x1 - DECK.x0);
    const z = DECK.z0 + rand() * (DECK.z1 - DECK.z0);
    if (!deckAt(x, z)) continue;
    const a = rand() * Math.PI * 2;
    for (const o of [-5, 5]) {
      g.beginPath();
      g.arc(px(x) + Math.cos(a) * o, pz(z) + Math.sin(a) * o, 30 + rand() * 30, a, a + 0.8 + rand());
      g.stroke();
    }
  }
  // Double/triple chevrons every ~30 units, small white EXIT stencils between them.
  const chevron = (x, z, dx, dz) => {
    const cx = px(x);
    const cz = pz(z);
    const s = P * 0.4;
    const t = P * 0.2;
    g.fillStyle = CHEVRON;
    g.beginPath();
    g.moveTo(cx + dx * s * 0.5, cz + dz * s * 0.5);
    g.lineTo(cx - dx * s * 0.5 - dz * s, cz - dz * s * 0.5 + dx * s);
    g.lineTo(cx - dx * (s * 0.5 + t) - dz * s, cz - dz * (s * 0.5 + t) + dx * s);
    g.lineTo(cx + dx * (s * 0.5 - t), cz + dz * (s * 0.5 - t));
    g.lineTo(cx - dx * (s * 0.5 + t) + dz * s, cz - dz * (s * 0.5 + t) - dx * s);
    g.lineTo(cx - dx * s * 0.5 + dz * s, cz - dz * s * 0.5 - dx * s);
    g.closePath();
    g.fill();
  };
  const onDeckWalk = (x, z) => {
    const c = Math.floor(x / C + COLS / 2);
    const i = Math.floor(z / C + ROWS / 2);
    return WALK.includes(rigCh(c, i)) && i >= 8;
  };
  let run = 0;
  let next = 10;
  let stencil = 0;
  const pts = path.points;
  for (let k = 0; k + 1 < pts.length; k++) {
    const a = pts[k];
    const b = pts[k + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const dx = (b.x - a.x) / len;
    const dz = (b.z - a.z) / len;
    for (let d = Math.max(2.5, next - run); d < len - 2; d += 30) {
      const x = a.x + dx * d;
      const z = a.z + dz * d;
      if (onDeckWalk(x, z)) {
        const n = stencil % 3 === 1 ? 3 : 2;
        for (let j = 0; j < n; j++) chevron(x + dx * j * 1.2, z + dz * j * 1.2, dx, dz);
        // An EXIT stencil a bit further on, every other mark.
        const sx = x + dx * 8;
        const sz = z + dz * 8;
        if (stencil++ % 2 === 0 && d + 10 < len && onDeckWalk(sx, sz)) {
          g.save();
          g.translate(px(sx), pz(sz));
          g.rotate(Math.atan2(dz, dx));
          g.fillStyle = 'rgba(245,245,245,0.9)';
          g.font = `bold ${Math.round(P * 0.32)}px sans-serif`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText('EXIT', 0, 0);
          g.restore();
        }
      }
      next = run + d + 30;
    }
    run += len;
  }
  // Round off the deck's outer corners (the slab underneath is rounded too).
  g.globalCompositeOperation = 'destination-in';
  g.beginPath();
  g.rect(0, 0, cv.width, pz(DECK.z0)); // everything north of the deck (the spawn platform)
  g.rect(0, 0, px(DECK.x0), cv.height); // everything west of the deck (helipad, capsule tanks)
  const r = DECK.r;
  g.roundRect(px(DECK.x0), pz(DECK.z0), px(DECK.x1) - px(DECK.x0), pz(DECK.z1) - pz(DECK.z0), (r / C) * P);
  g.fill();
  g.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const Z_AXIS = new THREE.Vector3(0, 0, 1);
/** A thin box between two points (lattice members, rails, cables). */
function beam(parent, mat, a, b, t) {
  const v = new THREE.Vector3().subVectors(b, a);
  const len = v.length();
  const m = part(parent, boxGeo(t, t, 1), mat, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  m.scale.z = len;
  m.quaternion.setFromUnitVectors(Z_AXIS, v.divideScalar(len || 1)); // in the parent's own space
  return m;
}

/** A tapered square lattice tower: four corner legs and braces, in alternating red and white bands. */
function latticeTower(parent, m, x, z, base, top, h, y0 = 0) {
  const g = new THREE.Group();
  g.position.set(x, y0, z);
  parent.add(g);
  const bands = 8;
  const half = (y) => base / 2 + ((top - base) / 2) * (y / h);
  const V = (sx, y, sz) => new THREE.Vector3(sx * half(y), y, sz * half(y));
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let b = 0; b < bands; b++) {
    const ya = (b / bands) * h;
    const yb = ((b + 1) / bands) * h;
    const mat = b % 2 ? m.latticeWhite : m.latticeRed;
    for (let k = 0; k < 4; k++) {
      const [sx, sz] = corners[k];
      const [nx, nz] = corners[(k + 1) % 4];
      beam(g, mat, V(sx, ya, sz), V(sx, yb, sz), 0.55); // leg
      beam(g, mat, V(sx, yb, sz), V(nx, yb, nz), 0.3); // ring
      beam(g, mat, V(sx, ya, sz), V(nx, yb, nz), 0.22); // brace
    }
  }
  return g;
}

/**
 * Rig Point: a crowded grey deck on legs in the open ocean, a spawn hut on its own red-legged
 * platform to the north, an octagonal helipad off the south-west corner, a burning derrick in the
 * middle, red cranes, tanks and stacks of containers.
 */
export function buildRig(parent, { oz = 0, versus = false } = {}) {
  const scene = new THREE.Group();
  scene.position.z = oz;
  parent.add(scene);
  const m = materials();
  const animated = [];
  const rand = mulberry32(5511);

  // --- The ocean all round (a strip per lane in Versus), scrolling gently.
  const sea = new THREE.Mesh(versus ? new THREE.PlaneGeometry(300, LANE_SPACING) : new THREE.PlaneGeometry(900, 900), m.sea);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = RIG_SEA;
  sea.receiveShadow = true;
  scene.add(sea);
  {
    const tex = m.sea.map;
    tex.repeat.set(versus ? 12 : 36, versus ? 8 : 36);
    animated.push((t) => tex.offset.set((t * 0.012) % 1, (t * 0.02) % 1));
  }

  // --- Slabs: the deck (rounded corners), the spawn platform, the capsule-tank ledge and the helipad.
  {
    const shape = roundedRect(DECK.x0, DECK.z0, DECK.x1, DECK.z1, DECK.r);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: DECK_T, bevelEnabled: false });
    geo.rotateX(Math.PI / 2); // shape (x, y) -> (x, z); extruded downward from y = 0
    const slab = new THREE.Mesh(geo, m.slab);
    slab.position.y = -0.04;
    slab.receiveShadow = true;
    scene.add(slab);
    // The dark red rim just under the edge.
    const rimGeo = new THREE.ExtrudeGeometry(roundedRect(DECK.x0 - 0.3, DECK.z0 - 0.3, DECK.x1 + 0.3, DECK.z1 + 0.3, DECK.r + 0.3), { depth: 0.9, bevelEnabled: false });
    rimGeo.rotateX(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, m.rim);
    rim.position.y = -0.25;
    scene.add(rim);
  }
  // Spawn platform (R1-X5 under the building and its porch).
  const [pcx] = at(20, 1);
  const pz0 = Z0(0);
  const pz1 = Z0(5);
  part(scene, boxGeo(7 * C, DECK_T, pz1 - pz0), m.slab, pcx, -DECK_T / 2 - 0.04, (pz0 + pz1) / 2);
  part(scene, boxGeo(7 * C + 0.5, 0.9, pz1 - pz0 + 0.5), m.rim, pcx, -0.7, (pz0 + pz1) / 2).castShadow = false;
  // Its thick red cylindrical legs.
  for (const [dx, z] of [[-14, pz0 + 3], [14, pz0 + 3], [-14, pz1 - 3], [14, pz1 - 3], [0, pz1 - 3]]) {
    part(scene, new THREE.CylinderGeometry(1.5, 1.5, -RIG_SEA - DECK_T, 12), m.leg, pcx + dx, (RIG_SEA - DECK_T) / 2, z);
  }
  // The ledge carrying the two capsule tanks (J23-J25).
  part(scene, boxGeo(C, DECK_T, 3 * C), m.slab, X0(9) + C / 2, -DECK_T / 2 - 0.04, (Z0(22) + Z0(25)) / 2);
  // The helipad: an octagonal slab, a touch of dark skirt panels round it.
  {
    const s = new THREE.Shape();
    padOctagon().forEach(([x, z], k) => (k ? s.lineTo(x, z) : s.moveTo(x, z)));
    const geo = new THREE.ExtrudeGeometry(s, { depth: 1.6, bevelEnabled: false });
    geo.rotateX(Math.PI / 2);
    const pad = new THREE.Mesh(geo, m.slabDark);
    pad.position.y = -0.04;
    scene.add(pad);
    // The cut corners (painted panels on top) get a slab too, so nothing floats.
    for (const [x, z] of [[PAD.x0, PAD.z0], [PAD.x1, PAD.z0], [PAD.x0, PAD.z1], [PAD.x1, PAD.z1]]) {
      const sx = Math.sign((PAD.x0 + PAD.x1) / 2 - x);
      const sz = Math.sign((PAD.z0 + PAD.z1) / 2 - z);
      part(scene, boxGeo(PAD.cut, 1.2, PAD.cut), m.panel, x + (sx * PAD.cut) / 2, -0.65, z + (sz * PAD.cut) / 2).castShadow = false;
    }
    // Skirt panels round the outside, tilted down and out like a collar.
    const oct = padOctagon();
    const [cx, cz] = [(PAD.x0 + PAD.x1) / 2, (PAD.z0 + PAD.z1) / 2];
    oct.forEach(([ax, az], k) => {
      const [bx, bz] = oct[(k + 1) % 8];
      const mx = (ax + bx) / 2;
      const mz = (az + bz) / 2;
      const len = Math.hypot(bx - ax, bz - az);
      const nx = mx - cx;
      const nz = mz - cz;
      const nl = Math.hypot(nx, nz);
      const p = part(scene, boxGeo(len, 0.25, 3.2), m.panel, mx + (nx / nl) * 1.5, -0.6, mz + (nz / nl) * 1.5);
      p.rotation.order = 'YXZ';
      p.rotation.y = -Math.atan2(bz - az, bx - ax);
      p.rotation.x = 0.35;
      p.castShadow = false;
    });
    // Legs under the pad.
    for (const [dx, dz] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) {
      part(scene, new THREE.CylinderGeometry(1.2, 1.2, -RIG_SEA, 10), m.slabDark, cx + dx, RIG_SEA / 2 - 0.8, cz + dz);
    }
  }
  // The deck's substructure: big legs to the sea and girders between them.
  {
    const legs = [];
    for (const fx of [0.1, 0.5, 0.9]) for (const fz of [0.1, 0.5, 0.9]) legs.push([DECK.x0 + fx * (DECK.x1 - DECK.x0), DECK.z0 + fz * (DECK.z1 - DECK.z0)]);
    const h = -RIG_SEA - DECK_T;
    for (const [x, z] of legs) {
      part(scene, new THREE.CylinderGeometry(2.4, 2.8, h + 1, 14), m.slabDark, x, RIG_SEA + h / 2, z);
      part(scene, new THREE.CylinderGeometry(3.2, 3.2, 1.2, 14), m.leg, x, RIG_SEA + 1.2, z).castShadow = false; // splash-zone band
    }
    const y = RIG_SEA + h * 0.55;
    for (let k = 0; k < legs.length; k++) {
      const [x, z] = legs[k];
      for (const j of [k + 1, k + 3]) {
        if (!legs[j] || (j === k + 1 && j % 3 === 0)) continue;
        beam(scene, m.slabDark, new THREE.Vector3(x, y, z), new THREE.Vector3(legs[j][0], y, legs[j][1]), 0.9);
      }
    }
  }

  // --- The painted surface over everything walkable.
  {
    const tex = groundTexture();
    const top = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.08 }));
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.03;
    top.receiveShadow = true;
    scene.add(top);
  }

  // --- The two narrow dark steel bridges over open water: the spawn bridge (U6-U8) and the helipad footbridge (J28).
  const bridge = (x, z, w, d, alongZ) => {
    part(scene, boxGeo(w, 0.6, d), m.steel, x, -0.28, z);
    for (const s of [-1, 1]) {
      const ox = alongZ ? s * (w / 2 - 0.15) : 0;
      const ozz = alongZ ? 0 : s * (d / 2 - 0.15);
      const len = alongZ ? d : w;
      part(scene, boxGeo(alongZ ? 0.12 : len, 0.12, alongZ ? len : 0.12), m.yellow, x + ox, 1.1, z + ozz);
      for (let k = 0; k <= Math.round(len / 2.5); k++) {
        const t = -len / 2 + (k * len) / Math.round(len / 2.5);
        part(scene, boxGeo(0.12, 1.1, 0.12), m.yellow, x + ox + (alongZ ? 0 : t), 0.55, z + ozz + (alongZ ? t : 0));
      }
    }
    // Bracing underneath.
    const len = alongZ ? d : w;
    for (let k = 0; k < 3; k++) {
      const t = -len / 2 + ((k + 0.5) * len) / 3;
      part(scene, boxGeo(alongZ ? w : 0.3, 1.2, alongZ ? 0.3 : d), m.steelLight, x + (alongZ ? 0 : t), -1, z + (alongZ ? t : 0)).castShadow = false;
    }
  };
  {
    const [bx] = at(20, 7);
    bridge(bx, (Z0(5) + Z0(8)) / 2, C, Z0(8) - Z0(5), true);
    const [, bz] = at(9, 28);
    bridge(X0(9) + C / 2, bz, C, C, false);
  }

  // --- Red railings round the deck edge (gaps for the two bridges and the capsule-tank ledge).
  {
    const outline = roundedRect(DECK.x0 + 0.4, DECK.z0 + 0.4, DECK.x1 - 0.4, DECK.z1 - 0.4, DECK.r - 0.4).getSpacedPoints(220);
    const [sbx] = at(20, 9);
    const [, fbz] = at(10, 28);
    const gap = (x, z) =>
      (Math.abs(z - DECK.z0) < 1 && Math.abs(x - sbx) < C / 2 + 0.3) ||
      (Math.abs(x - DECK.x0) < 1 && Math.abs(z - fbz) < C / 2 + 0.3) ||
      (Math.abs(x - DECK.x0) < 1 && z > Z0(22) - 0.3 && z < Z0(25) + 0.3);
    const posts = [];
    const rails = [];
    for (let k = 0; k + 1 < outline.length; k++) {
      const a = outline[k];
      const b = outline[k + 1];
      if (gap(a.x, a.y) || gap(b.x, b.y)) continue;
      rails.push([a, b]);
      if (k % 2 === 0) posts.push(a);
    }
    const o = new THREE.Object3D();
    const pm = new THREE.InstancedMesh(boxGeo(0.18, 1.1, 0.18), m.rail, posts.length);
    posts.forEach((p, n) => {
      o.position.set(p.x, 0.55, p.y);
      o.rotation.set(0, 0, 0);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      pm.setMatrixAt(n, o.matrix);
    });
    const rm = new THREE.InstancedMesh(boxGeo(1, 0.14, 0.14), m.rail, rails.length * 2);
    rails.forEach(([a, b], n) => {
      for (const [j, y] of [[0, 1.1], [1, 0.6]]) {
        o.position.set((a.x + b.x) / 2, y, (a.y + b.y) / 2);
        o.rotation.set(0, -Math.atan2(b.y - a.y, b.x - a.x), 0);
        o.scale.set(Math.hypot(b.x - a.x, b.y - a.y) + 0.05, 1, 1);
        o.updateMatrix();
        rm.setMatrixAt(n * 2 + j, o.matrix);
      }
    });
    scene.add(pm, rm);
  }

  // --- Structures, from the sim's props.
  for (const p of MAP.props) {
    if (p.kind === 'rigBox') buildingBox(scene, m, p, rand);
    else if (p.kind === 'rigDerrick') animated.push(derrick(scene, m, p));
    else if (p.kind === 'rigTank') {
      const t = part(scene, new THREE.CylinderGeometry(p.r, p.r, p.h, p.sides), m.tank, p.x, p.h / 2, p.z);
      t.rotation.y = Math.PI / p.sides;
      for (const y of [p.h * 0.33, p.h * 0.66]) part(scene, new THREE.CylinderGeometry(p.r + 0.08, p.r + 0.08, 0.3, p.sides), m.tankBand, p.x, y, p.z).rotation.y = Math.PI / p.sides;
      part(scene, new THREE.CylinderGeometry(p.r * 0.3, p.r, 0.9, p.sides), m.tankBand, p.x, p.h + 0.45, p.z).rotation.y = Math.PI / p.sides;
      // A yellow ladder up the side.
      part(scene, boxGeo(0.7, p.h, 0.1), m.yellow, p.x, p.h / 2, p.z + p.r + 0.08).castShadow = false;
    } else if (p.kind === 'rigCyl') {
      const mat = p.color === 0xe0e0e0 ? m.white : lambert(p.color);
      const len = p.capsule ? p.len - p.r * 2 : p.len;
      const y = p.y + p.r;
      part(scene, new THREE.CylinderGeometry(p.r, p.r, len, 18), mat, p.x, y, p.z).rotation.x = Math.PI / 2;
      for (const s of [-1, 1]) {
        if (p.capsule) part(scene, new THREE.SphereGeometry(p.r, 18, 10), mat, p.x, y, p.z + s * (len / 2));
        else part(scene, new THREE.CylinderGeometry(p.r * 1.02, p.r * 1.02, 0.25, 18), m.steelLight, p.x, y, p.z + s * (len / 2 - 0.4)).rotation.x = Math.PI / 2;
        if (p.y === 0) part(scene, boxGeo(p.r * 1.6, p.r * 0.7, 0.5), m.steel, p.x, p.r * 0.35, p.z + s * (len / 3)); // saddles
      }
    } else if (p.kind === 'rigContainer') container(scene, m, p);
    else if (p.kind === 'rigCrane') crane(scene, m, p);
    else if (p.kind === 'rigHeli') animated.push(helicopter(scene, m, p));
    else if (p.kind === 'rigClutter') clutter(scene, m, p);
  }

  scene.userData.tick = (t) => animated.forEach((f) => f(t));
  return scene;
}

/** A dark charcoal building (or the derrick's base, or the black machinery), with its trims and roof details. */
function buildingBox(scene, m, p, rand) {
  const machine = p.role === 'machine';
  const body = part(scene, boxGeo(p.w - 0.3, p.h, p.d - 0.3), machine ? m.black : m.wall, p.x, p.h / 2, p.z);
  body.castShadow = true;
  part(scene, boxGeo(p.w - 0.1, 0.4, p.d - 0.1), machine ? m.black : m.roof, p.x, p.h + 0.2, p.z);
  if (machine) {
    // Ribs and pipes.
    for (let k = 0; k < 5; k++) part(scene, boxGeo(p.w - 0.1, 0.3, 0.3), m.steel, p.x, 1 + k * 0.6, p.z - p.d / 2 + 2 + k * ((p.d - 4) / 4));
    for (const s of [-1, 1]) part(scene, new THREE.CylinderGeometry(0.35, 0.35, p.d - 1, 8), m.steelLight, p.x + s * 1.2, p.h + 0.6, p.z).rotation.x = Math.PI / 2;
    return;
  }
  if (p.trim) {
    const tm = lambert(p.trim);
    if (p.trimSide === 'w') part(scene, boxGeo(0.2, 0.9, p.d - 0.3), tm, p.x - p.w / 2 + 0.05, p.h - 1, p.z).castShadow = false;
    else part(scene, boxGeo(p.w - 0.1, 0.9, p.d - 0.1), tm, p.x, p.h - 0.8, p.z).castShadow = false;
  }
  if (p.role === 'derrick') return;
  // Rooftop vents and AC boxes.
  for (let k = 0; k < Math.max(1, Math.round((p.w * p.d) / 120)); k++) {
    const bx = p.x + (rand() - 0.5) * (p.w - 4);
    const bz = p.z + (rand() - 0.5) * (p.d - 4);
    part(scene, boxGeo(1.4 + rand() * 1.6, 0.8 + rand() * 0.8, 1.4 + rand() * 1.6), m.roofDetail, bx, p.h + 0.8, bz);
  }
  // A row of dark windows on the long faces.
  const floors = p.role === 'spawn' ? 2 : 1;
  for (let f = 0; f < floors; f++) {
    const y = p.role === 'spawn' ? 4 + f * 6 : p.h * 0.6;
    for (const s of [-1, 1]) {
      for (let x = -p.w / 2 + 3; x <= p.w / 2 - 3; x += 4.5) part(scene, boxGeo(2, 1.2, 0.1), m.window, p.x + x, y, p.z + s * (p.d / 2 - 0.12)).castShadow = false;
    }
  }
  if (p.role === 'spawn') {
    // A band between the two storeys.
    part(scene, boxGeo(p.w - 0.1, 0.35, p.d - 0.1), m.roof, p.x, 7, p.z).castShadow = false;
    // The dark open doorway on the south face (U5).
    const [dx] = at(20, 4);
    part(scene, boxGeo(3.6, 4.6, 0.3), m.door, dx, 2.3, p.z + p.d / 2 - 0.1).castShadow = false;
    // The dark exhaust stack on the roof.
    part(scene, new THREE.CylinderGeometry(0.9, 1.1, 9, 12), m.black, p.x - 6, p.h + 4.5, p.z - 3);
    // White upright gas cylinders and grey horizontal tanks along its east side (on the roof edge).
    for (let k = 0; k < 5; k++) part(scene, new THREE.CylinderGeometry(0.45, 0.45, 2.6, 10), m.white, p.x + p.w / 2 - 1.3, p.h + 1.5, p.z - 6 + k * 1.1);
    for (const z of [3, 6]) part(scene, new THREE.CylinderGeometry(0.9, 0.9, 4, 12), m.tank, p.x + p.w / 2 - 4, p.h + 1.3, p.z + z).rotation.z = Math.PI / 2;
  }
}

/** The derrick: a red-and-white lattice tower on the base's roof, a flare burning on top, two spherical tanks on the east side. */
function derrick(scene, m, p) {
  const roof = 8.4;
  const h = 38;
  latticeTower(scene, m, p.x, p.z, 9, 2.4, h, roof);
  part(scene, boxGeo(3.4, 0.5, 3.4), m.steel, p.x, roof + h, p.z); // crown
  // The flare stack (Y19): a pipe up from the crown with a big flickering fire on it.
  const [fx, fz] = p.flare;
  const tipY = roof + h + 6;
  part(scene, new THREE.CylinderGeometry(0.4, 0.4, 6, 8), m.steel, (p.x + fx) / 2, roof + h + 3, (p.z + fz) / 2);
  const fire = new THREE.Group();
  fire.position.set((p.x + fx) / 2, tipY, (p.z + fz) / 2);
  scene.add(fire);
  const outer = new THREE.Mesh(new THREE.ConeGeometry(1.6, 6, 10), m.flare);
  outer.position.y = 3;
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.4, 8), m.flareCore);
  inner.position.y = 1.8;
  fire.add(outer, inner);
  const light = new THREE.PointLight(0xffa040, 50, 45, 1.2);
  light.position.y = 3;
  fire.add(light);
  // Two dark grey spherical tanks on its east side (Z20-AA22), on the base's roof.
  for (const r of [20.3, 21.7]) {
    const [sx, sz] = at(25.5, r);
    part(scene, new THREE.SphereGeometry(3, 16, 12), m.tank, sx, roof + 3, sz);
  }
  return (t) => {
    const f = 1 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.06;
    outer.scale.set(1 / f, f * (1 + Math.sin(t * 3.1) * 0.1), 1 / f);
    outer.rotation.z = Math.sin(t * 2.3) * 0.12; // leaning in the wind
    light.intensity = 45 + Math.sin(t * 17) * 8;
  };
}

/** A stack of corrugated containers, each level its own colour. */
function container(scene, m, p) {
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  g.rotation.y = p.rot;
  scene.add(g);
  const COL = { 0xa04838: m.red, 0x4a5e8c: m.blue, 0x4f7f4a: m.green };
  p.colors.forEach((c, k) => {
    const box = part(g, boxGeo(p.w, p.h - 0.08, p.len), COL[c] ?? m.blue, k === 2 ? 0.25 : 0, k * p.h + p.h / 2, k === 1 ? 0.4 : 0);
    box.rotation.y = k === 1 ? 0.03 : 0;
    // Door end frame.
    part(g, boxGeo(p.w + 0.06, p.h - 0.1, 0.12), m.steel, box.position.x, box.position.y, p.len / 2 + (k === 1 ? 0.4 : 0)).castShadow = false;
  });
}

/** A bright red crane: pedestal, cab, a lattice boom angled up over the sea and a hook (with a crate on the north-west one). */
function crane(scene, m, p) {
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  g.rotation.y = -p.yaw; // boom along local +x
  scene.add(g);
  part(g, new THREE.CylinderGeometry(2.2, 2.8, 7, 12), m.crane, 0, 3.5, 0);
  part(g, boxGeo(5, 3.6, 4), m.crane, -0.5, 8.8, 0);
  part(g, boxGeo(1.6, 1.6, 4.1), m.heliGlass, 1.6, 9.4, 0).castShadow = false;
  part(g, boxGeo(3, 2, 3.6), m.craneDark, -3.6, 8.4, 0); // counterweight
  // The boom: two bottom chords and a top chord with zig-zag braces, about 60 long, rising 25 degrees.
  const L = 60;
  const ang = 0.44;
  const base = new THREE.Vector3(1.5, 10.5, 0);
  const dir = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0);
  const up = new THREE.Vector3(-Math.sin(ang), Math.cos(ang), 0);
  const pt = (s, side, top) => base.clone().addScaledVector(dir, s).addScaledVector(up, top ? 1.6 * (1 - s / L * 0.6) : 0).add(new THREE.Vector3(0, 0, top ? 0 : side * 1.1 * (1 - s / L * 0.6)));
  const N = 14;
  for (let k = 0; k < N; k++) {
    const s0 = (k / N) * L;
    const s1 = ((k + 1) / N) * L;
    for (const side of [-1, 1]) {
      beam(g, m.crane, pt(s0, side, false), pt(s1, side, false), 0.35);
      beam(g, m.crane, pt(s0, side, false), pt(s1, 0, true), 0.2);
    }
    beam(g, m.crane, pt(s0, 0, true), pt(s1, 0, true), 0.35);
    beam(g, m.crane, pt(s1, -1, false), pt(s1, 1, false), 0.2);
  }
  // Hoist cable from the tip and the hook (with a hanging crate on the north-west crane).
  const tip = pt(L, 0, false);
  const hang = p.x < 0 ? 14 : 9;
  beam(g, m.black, tip, tip.clone().add(new THREE.Vector3(0, -hang, 0)), 0.1);
  part(g, boxGeo(0.8, 1, 0.8), m.yellow, tip.x, tip.y - hang - 0.5, 0);
  if (p.x < 0) part(g, boxGeo(3.5, 3, 3.5), m.crate, tip.x, tip.y - hang - 2.6, 0);
}

/** The dark helicopter on the helipad (the base): body, cockpit glass, skids, tail boom, a slowly idling main rotor (no tail rotor). */
function helicopter(scene, m, p) {
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  g.rotation.y = Math.PI / 2; // nose east, toward the walkway
  scene.add(g);
  const body = part(g, new THREE.SphereGeometry(2, 16, 12), m.heli, 0, 2.6, 0.5);
  body.scale.set(1, 0.9, 1.6);
  const glass = part(g, new THREE.SphereGeometry(1.5, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), m.heliGlass, 0, 2.7, 2.1);
  glass.rotation.x = Math.PI / 2.4;
  part(g, boxGeo(0.7, 0.7, 6), m.heli, 0, 3.1, -4.5); // tail boom
  part(g, boxGeo(0.2, 2, 1.4), m.heli, 0, 3.9, -7.3); // tail fin
  for (const s of [-1, 1]) {
    part(g, boxGeo(0.2, 0.2, 5.6), m.black, s * 1.6, 0.2, 0.5);
    for (const z of [-0.8, 1.8]) part(g, boxGeo(0.15, 1, 0.15), m.black, s * 1.3, 0.7, z);
  }
  part(g, new THREE.CylinderGeometry(0.25, 0.25, 1, 8), m.black, 0, 4.7, 0.5);
  const rotor = new THREE.Group();
  rotor.position.set(0, 5.25, 0.5);
  g.add(rotor);
  for (let k = 0; k < 4; k++) {
    const b = part(rotor, boxGeo(0.45, 0.08, 6.8), m.black, 0, 0, 0);
    b.rotation.y = (k * Math.PI) / 2;
    b.position.set(Math.sin(b.rotation.y) * 3.4, 0, Math.cos(b.rotation.y) * 3.4);
  }
  return (t) => (rotor.rotation.y = t * 0.6);
}

/** Small deck clutter: pallets, crates, jersey barriers, oil drums, pipe bundles, yellow handrails. */
function clutter(scene, m, p) {
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  g.rotation.y = p.rot;
  scene.add(g);
  switch (p.type) {
    case 'pallet':
      for (let k = 0; k < 5; k++) part(g, boxGeo(2.2, 0.12, 0.34), m.wood, 0, 0.44, -0.9 + k * 0.45);
      for (const x of [-0.9, 0, 0.9]) part(g, boxGeo(0.3, 0.38, 2.2), m.woodDark, x, 0.19, 0);
      if (p.v < 0.5) part(g, boxGeo(1.6, 0.9, 1.6), m.crate, 0, 0.95, 0);
      break;
    case 'crate':
      part(g, boxGeo(1.6, 1.3, 1.6), m.crate, 0, 0.65, 0);
      if (p.v < 0.6) part(g, boxGeo(1.1, 0.9, 1.1), m.crate, 0.2, 1.75, -0.1).rotation.y = 0.4;
      break;
    case 'barrier':
      for (const z of [-1.1, 1.1]) {
        part(g, boxGeo(0.9, 0.5, 2), m.barrier, 0, 0.25, z);
        part(g, boxGeo(0.4, 0.6, 2), m.barrier, 0, 0.8, z);
      }
      break;
    case 'drums':
      for (const [x, z] of [[-0.6, -0.4], [0.6, -0.4], [0, 0.6]].slice(0, p.v < 0.4 ? 2 : 3)) part(g, new THREE.CylinderGeometry(0.55, 0.55, 1.3, 12), m.drum, x, 0.65, z);
      break;
    case 'pipes':
      for (const [x, y] of [[-0.6, 0.35], [0, 0.35], [0.6, 0.35], [-0.3, 0.9], [0.3, 0.9]]) part(g, new THREE.CylinderGeometry(0.32, 0.32, 3.6, 10), m.pipe, x, y, 0).rotation.x = Math.PI / 2;
      break;
    case 'rail':
      for (const z of [-1.5, 0, 1.5]) part(g, boxGeo(0.12, 1.1, 0.12), m.yellow, 0, 0.55, z);
      for (const y of [0.6, 1.1]) part(g, boxGeo(0.12, 0.12, 3.2), m.yellow, 0, y, 0);
      break;
  }
}
