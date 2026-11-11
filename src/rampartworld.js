// Midnight Rampart's renderer: everything is built from RAMPART_GRID (src/sim/maps.js) and the
// prop spots the sim lays in MAP.props, so the picture matches placement and colliders.
import * as THREE from 'three';
import { boxGeo, part } from './models.js';
import { mulberry32 } from './utils.js';
import { PATH_WIDTH, path } from './sim/path.js';
import { LANE_SPACING, MAP } from './sim/map.js';
import { RAMPART_CELL, RAMPART_GRID, RAMPART_HILL, RAMPART_WALL, rampartCell, rampartCh, rampartH, rampartHollow } from './sim/maps.js';

const C = RAMPART_CELL;
const ROWS = RAMPART_GRID.length;
const COLS = RAMPART_GRID[0].length;
const W = COLS * C;
const D = ROWS * C;
/** World x of the west edge of column c, z of the north edge of row index i. */
const X0 = (c) => (c - COLS / 2) * C;
const Z0 = (i) => (i - ROWS / 2) * C;
const at = (c, r) => rampartCell(c, r); // centre of column c, 1-based row r
/** Road cells: the road itself, and the gate cells it passes through (I22-J22). */
const isRoad = (c, i) => '#=SB'.includes(rampartCh(c, i)) || (rampartCh(c, i) === 'G' && i === 21);

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const basic = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });

let mats = null;
function materials() {
  if (mats) return mats;
  mats = {
    block: lambert(0xffffff, { flatShading: true }), // tinted per cell
    rock: lambert(0x3e3b3b, { flatShading: true }),
    rockDark: lambert(0x2a2727, { flatShading: true }),
    concrete: lambert(0x8c8c8c),
    concreteDark: lambert(0x6e6e70),
    rib: lambert(0x7a7a7c),
    wallLight: basic(0xf4f0e0),
    water: lambert(0x8fb5c9, { emissive: 0x1a2a34, transparent: true, opacity: 0.88 }),
    sewerWater: lambert(0x7d9fb0, { emissive: 0x101a20 }),
    falls: null, // set below (animated texture)
    pipe: lambert(0x7a3424),
    arch: lambert(0xc8cbd0, { transparent: true, opacity: 0.82, side: THREE.DoubleSide }),
    rail: lambert(0xb0b0b4),
    yellow: lambert(0xd9a521),
    sand: lambert(0xc49a55, { flatShading: true }),
    hollow: basic(0x0e0c0c),
    wood: lambert(0x6d4a2e),
    woodDark: lambert(0x4e3420),
    iron: lambert(0x1e1e22),
    red: lambert(0xa02a20),
    black: lambert(0x141416),
    floor: lambert(0xd0682a),
    plaster: lambert(0xe6e1d6),
    glass: lambert(0xbfd8e8, { transparent: true, opacity: 0.18, depthWrite: false }),
    roof: lambert(0x151a24),
    base: lambert(0xb8b8bc),
    blue: lambert(0x2b3da6),
    blueDark: lambert(0x1e2c7a),
    white: lambert(0xf0f0ee),
    green: lambert(0x2a5a32),
    hatch: lambert(0x1f4a2a),
    brown: lambert(0x6a4226),
    lampPole: lambert(0xe8e8e8),
    lampHead: basic(0xfff4dc),
    glow: basic(0x3ce03c),
    cone: lambert(0xe86a1a),
    orangeSpot: basic(0xd8742a),
    flame: basic(0xffa030, { transparent: true, opacity: 0.9 }),
    domeLit: basic(0xffb060),
    hull: lambert(0x5a5a62, { flatShading: true }),
  };
  return mats;
}

/** The bowl floor, painted per cell: orange ground, road with its white stripe, dirt, apron, side road. */
function groundTexture() {
  const P = 32; // pixels per cell
  const cv = document.createElement('canvas');
  cv.width = COLS * P;
  cv.height = ROWS * P;
  const g = cv.getContext('2d');
  const rand = mulberry32(2828);
  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1), 16);
    const k = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    return `rgb(${k(n >> 16)},${k((n >> 8) & 255)},${k(n & 255)})`;
  };
  const COLOR = { '.': '#b8702a', ':': '#7a5230', P: '#8e8e94', V: '#8e8e94', '-': '#3a3a40', H: '#b8702a', D: '#b8702a', G: '#b8702a' };
  const ROAD = '#6f6d7c';
  for (let i = 0; i < ROWS; i++) {
    for (let c = 0; c < COLS; c++) {
      const k = RAMPART_GRID[i][c];
      if (k === '~' || k === '_') continue; // holes (alpha 0): the pond and the sewer channel
      const road = isRoad(c, i);
      const base = road ? ROAD : COLOR[k] ?? '#b8702a';
      // Speckled grass / concrete: small squares of slightly lighter and darker tone.
      for (let y = 0; y < P; y += 4) {
        for (let x = 0; x < P; x += 4) {
          g.fillStyle = shade(base, road ? 0.95 + rand() * 0.1 : 0.85 + rand() * 0.3);
          g.fillRect(c * P + x, i * P + y, 4, 4);
        }
      }
      if (road) {
        // Slightly darker edges where the road meets something else.
        g.fillStyle = 'rgba(30,30,40,0.35)';
        for (const [dc, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (isRoad(c + dc, i + di)) continue;
          g.fillRect(c * P + (dc === 1 ? P - 3 : 0), i * P + (di === 1 ? P - 3 : 0), dc ? 3 : P, di ? 3 : P);
        }
      }
    }
  }
  // The single white stripe along the road's centre line.
  g.strokeStyle = '#f2f2f2';
  g.lineWidth = Math.max(2, (0.4 / C) * P);
  g.lineJoin = 'miter';
  g.beginPath();
  path.points.forEach((p, k) => {
    const x = (p.x / C + COLS / 2) * P;
    const y = (p.z / C + ROWS / 2) * P;
    if (k === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  });
  g.stroke();
  // Zebra crosswalks either side of the X24 crossing (on W24 and Y24), striped across the side road.
  g.fillStyle = '#f2f2f2';
  for (const c of [22, 24]) {
    for (let s = 0; s < 5; s++) g.fillRect(c * P + 4, 23 * P + 3 + s * 6, P - 8, 3);
  }
  // The side road's centre dashes.
  for (let c = 25; c < 27; c++) g.fillRect(c * P + 4, 23 * P + P / 2 - 1, P / 2 - 6, 2);
  // Dark green round hatch on the apron (Q26).
  g.fillStyle = '#1f4a2a';
  g.beginPath();
  g.arc(16.5 * P, 25.5 * P, P * 0.36, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#2f6a3a';
  g.lineWidth = 2;
  g.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.magFilter = THREE.NearestFilter;
  return t;
}

/** Falling-water streaks (tiles vertically; scrolled every frame). */
function fallsTexture() {
  const cv = document.createElement('canvas');
  cv.width = 32;
  cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = 'rgba(170,205,222,0.7)';
  g.fillRect(0, 0, 32, 128);
  const rand = mulberry32(77);
  for (let k = 0; k < 40; k++) {
    g.fillStyle = rand() < 0.5 ? 'rgba(240,250,255,0.8)' : 'rgba(120,160,185,0.6)';
    const x = rand() * 32;
    const y = rand() * 128;
    g.fillRect(x, y, 1 + rand() * 2, 10 + rand() * 30);
    g.fillRect(x, y - 128, 1 + rand() * 2, 10 + rand() * 30);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** The billboard's ad: an orange-to-yellow panel with a pointed stone and a slogan. */
function adTexture() {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 128;
  const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 256, 128);
  grad.addColorStop(0, '#e8701a');
  grad.addColorStop(1, '#f4c430');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#5a4a3a';
  g.beginPath();
  g.moveTo(34, 110);
  g.lineTo(64, 14);
  g.lineTo(96, 110);
  g.closePath();
  g.fill();
  g.fillStyle = '#2a1a10';
  g.font = 'bold 30px sans-serif';
  g.fillText('STAY', 118, 56);
  g.fillText('SHARP.', 118, 92);
  g.font = '12px monospace';
  g.fillStyle = 'rgba(40,20,10,0.7)';
  g.fillText('the wall remembers', 118, 114);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const boulderGeo = new THREE.DodecahedronGeometry(1, 0);
function boulder(parent, m, x, y, z, sx, sy, sz, rot, dark) {
  const b = part(parent, boulderGeo, dark ? m.rockDark : m.rock, x, y, z);
  b.scale.set(sx, sy, sz);
  b.rotation.set(rot * 0.3, rot, rot * 0.2);
  return b;
}

/** A yellow lattice: four corner posts with zig-zag braces, `h` tall, `w` wide, standing at (x, y, z). */
function lattice(parent, m, w, h, step) {
  const g = new THREE.Group();
  parent.add(g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, boxGeo(0.22, h, 0.22), m.yellow, (sx * w) / 2, h / 2, (sz * w) / 2);
  const diag = Math.hypot(w, step);
  const ang = Math.atan2(step, w);
  for (let y = 0, k = 0; y < h - 0.01; y += step, k++) {
    for (const [face, rotY] of [[0, 0], [1, Math.PI / 2], [2, Math.PI], [3, -Math.PI / 2]]) {
      const b = part(g, boxGeo(diag, 0.12, 0.12), m.yellow, 0, y + step / 2, 0);
      b.rotation.set(0, rotY, (k + face) % 2 ? ang : -ang);
      b.position.x = Math.sin(rotY) * (w / 2);
      b.position.z = Math.cos(rotY) * (w / 2);
      b.castShadow = false;
    }
  }
  return g;
}

/**
 * Midnight Rampart, built from the spec grid: an orange bowl at night inside a dark rocky crater.
 * The great concrete border wall splits it north-south with a single gate; a nested S-bend in the
 * middle, the sewer bridge under the crane, the mineshaft hill, and the town strip and gas station
 * along the final straight. Street lamps light the road.
 */
export function buildRampart(parent, { oz = 0, versus = false } = {}) {
  const scene = new THREE.Group();
  scene.position.z = oz;
  parent.add(scene);
  const m = materials();
  const animated = [];
  const rand = mulberry32(9191);
  const BASE = -3;

  // --- The crater floor beyond the bowl (lost in the haze).
  const floor = new THREE.Mesh(versus ? new THREE.PlaneGeometry(260, LANE_SPACING) : new THREE.PlaneGeometry(700, 700), lambert(0x2a2626));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.05;
  floor.receiveShadow = true;
  scene.add(floor);

  // --- The bowl floor: one painted plane, with holes for the pond and the sewer channel.
  const tex = groundTexture();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, transparent: false, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.12 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.02;
  ground.receiveShadow = true;
  scene.add(ground);

  // --- Raised cells: rock, the wall, the mineshaft hill and the sand pile (one instanced box each).
  const raised = [];
  for (let i = 0; i < ROWS; i++) for (let c = 0; c < COLS; c++) if (rampartH(c, i) > 0) raised.push([c, i]);
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), m.block, raised.length);
  blocks.castShadow = true;
  blocks.receiveShadow = true;
  const o = new THREE.Object3D();
  const TINT = { '^': 0x3e3b3b, W: 0x8c8c8c, M: 0x67625e, s: 0xc49a55 };
  const tmp = new THREE.Color();
  raised.forEach(([c, i], k) => {
    const h = rampartH(c, i);
    const [x, z] = at(c, i + 1);
    o.position.set(x, (h + BASE) / 2, z);
    o.scale.set(C, h - BASE, C);
    o.updateMatrix();
    blocks.setMatrixAt(k, o.matrix);
    const ch = rampartCh(c, i);
    tmp.set(TINT[ch]).offsetHSL(0, 0, (rand() - 0.5) * (ch === 'W' ? 0.02 : 0.06));
    blocks.setColorAt(k, tmp);
  });
  scene.add(blocks);
  // Jagged boulders along the cliff foot, so the rock edge isn't a clean grid of boxes.
  for (let i = 0; i < ROWS; i++) {
    for (let c = 0; c < COLS; c++) {
      if (rampartCh(c, i) !== '^') continue;
      const [x, z] = at(c, i + 1);
      for (const [dc, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = RAMPART_GRID[i + di]?.[c + dc];
        if (n == null || n === '^' || n === 'W' || n === 'S' || n === 'B') continue;
        if (rand() < 0.45) continue;
        const bx = x + dc * C * 0.3;
        const bz = z + di * C * 0.3;
        if (path.distanceTo(bx, bz) < PATH_WIDTH / 2 + 0.8) continue;
        boulder(scene, m, bx, 1.5 + rand() * 4, bz, 1.2 + rand() * 0.8, 2 + rand() * 2, 1.2 + rand() * 0.8, rand() * 6, rand() < 0.5);
      }
    }
  }

  // --- The pond (E8-H11) under the overhanging rock, fed by a waterfall and a sewer outflow.
  {
    const [x0, z0] = [X0(4), Z0(7)];
    const [x1, z1] = [X0(8), Z0(11)];
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    part(scene, boxGeo(x1 - x0, 0.4, z1 - z0), m.rockDark, cx, -1.6, cz).castShadow = false;
    for (const [w, d, x, z] of [[x1 - x0, 0.3, cx, z1 - 0.15], [x1 - x0, 0.3, cx, z0 + 0.15], [0.3, z1 - z0, x0 + 0.15, cz], [0.3, z1 - z0, x1 - 0.15, cz]]) {
      part(scene, boxGeo(w, 1.6, d), m.rockDark, x, -0.8, z).castShadow = false;
    }
    const water = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), m.water);
    water.rotation.x = -Math.PI / 2;
    water.position.set(cx, -0.35, cz);
    scene.add(water);
    // The rock lip leaning out over the pond's north side.
    const lip = part(scene, boxGeo(C * 3.4, 1.6, 3), m.rock, X0(4) + C * 1.6, RAMPART_WALL - 2.8, z0 + 1.2);
    lip.rotation.x = 0.12;
    if (!versus) {
      const ft = fallsTexture();
      m.falls = new THREE.MeshBasicMaterial({ map: ft, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
      const falls = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 10.6), m.falls);
      falls.position.set(X0(5) + 1.6, 5, z0 + 0.15);
      scene.add(falls);
      animated.push((t) => ft.offset.set(0, (t * 0.8) % 1));
      // Foam where it lands.
      const foam = new THREE.Mesh(new THREE.CircleGeometry(1.5, 14), basic(0xe8f4fa, { transparent: true, opacity: 0.6 }));
      foam.rotation.x = -Math.PI / 2;
      foam.position.set(X0(5) + 1.6, -0.3, z0 + 1.2);
      scene.add(foam);
    }
    // The rusty sewer outflow pipe from the west rocks.
    const pipe = part(scene, new THREE.CylinderGeometry(0.7, 0.7, 3, 12), m.pipe, x0 - 0.2, 1.2, at(0, 10)[1]);
    pipe.rotation.z = Math.PI / 2;
    const trickle = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.5), m.water);
    trickle.position.set(x0 + 1.4, 0.4, at(0, 10)[1]);
    trickle.rotation.y = Math.PI / 2;
    scene.add(trickle);
  }

  // --- The sewer channel (L7-R8): a dark trench with pipes and water, under the bridge and pale arches.
  {
    const x0 = X0(11);
    const x1 = X0(18);
    const z0 = Z0(6);
    const z1 = Z0(8);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    part(scene, boxGeo(x1 - x0, 0.4, z1 - z0), m.concreteDark, cx, -2.8, cz).castShadow = false;
    for (const [w, d, x, z] of [[x1 - x0, 0.4, cx, z1 - 0.2], [x1 - x0, 0.4, cx, z0 + 0.2], [0.4, z1 - z0, x0 + 0.2, cz], [0.4, z1 - z0, x1 - 0.2, cz]]) {
      part(scene, boxGeo(w, 2.6, d), m.concreteDark, x, -1.3, z).castShadow = false;
    }
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), m.sewerWater);
    sw.rotation.x = -Math.PI / 2;
    sw.position.set(cx, -2.2, cz);
    scene.add(sw);
    for (const z of [z0 + 0.9, z1 - 0.9]) {
      const p = part(scene, new THREE.CylinderGeometry(0.35, 0.35, x1 - x0 - 0.8, 10), m.pipe, cx, -1.5, z);
      p.rotation.z = Math.PI / 2;
    }
    for (let x = x0 + 2; x < x1 - 1; x += 5) part(scene, new THREE.CylinderGeometry(0.25, 0.25, 2.2, 8), m.pipe, x, -1.4, z1 - 0.6);
    // The bridge deck (row 7) and its low rails.
    part(scene, boxGeo(x1 - x0, 0.45, C), m.concrete, cx, -0.22, Z0(6) + C / 2).castShadow = false;
    for (const z of [Z0(6) + 0.15, Z0(7) - 0.15]) part(scene, boxGeo(x1 - x0, 0.7, 0.18), m.rail, cx, 0.35, z);
    // Pale half-pipe arches over the open channel (row 8).
    const archGeo = new THREE.CylinderGeometry(C / 2 - 0.2, C / 2 - 0.2, 4.2, 18, 1, true, 0, Math.PI);
    for (let k = 0; k < 4; k++) {
      const a = new THREE.Mesh(archGeo, m.arch);
      a.rotation.z = Math.PI / 2;
      a.position.set(x0 + 3.2 + k * 7.2, -0.1, Z0(7) + C / 2);
      scene.add(a);
    }
  }

  // --- The border wall: buttress ribs on the east face, small lights along the top, guard towers.
  {
    const ex = X0(10);
    const wx = X0(8);
    const cx = (wx + ex) / 2;
    for (const [r0, r1] of [[1, 20], [22, 28]]) {
      for (let z = Z0(r0) + 1.5; z < Z0(r1) - 0.5; z += 3) {
        part(scene, boxGeo(0.7, RAMPART_WALL - 0.4, 0.9), m.rib, ex + 0.35, (RAMPART_WALL - 0.4) / 2, z);
        const l = part(scene, boxGeo(0.25, 0.25, 0.25), m.wallLight, cx, RAMPART_WALL + 0.15, z);
        l.castShadow = false;
      }
      // A thin capping lip along both top edges.
      for (const x of [wx + 0.2, ex - 0.2]) part(scene, boxGeo(0.4, 0.5, Z0(r1) - Z0(r0)), m.concreteDark, x, RAMPART_WALL + 0.25, (Z0(r0) + Z0(r1)) / 2);
    }
  }

  // --- The yellow tower crane (P2-U5): lattice mast, cab, a long jib reaching north-east, counter-jib.
  {
    const [mx, mz] = at(17.5, 3.5);
    const crane = new THREE.Group();
    crane.position.set(mx, 0, mz);
    scene.add(crane);
    part(crane, boxGeo(3.6, 0.8, 3.6), m.concreteDark, 0, 0.4, 0);
    const mast = lattice(crane, m, 2, 28, 2);
    mast.position.y = 0.8;
    part(crane, boxGeo(2.4, 2, 2.4), m.yellow, 0, 29.8, 0);
    part(crane, boxGeo(1.6, 1.4, 1.2), lambert(0x2a2a30), 0.6, 30, 1.3); // the cab's window side
    const top = new THREE.Group();
    top.position.set(0, 31, 0);
    top.rotation.y = Math.PI / 4; // the jib points north-east
    crane.add(top);
    const jib = lattice(top, m, 1.2, 30, 2.4);
    jib.rotation.z = -Math.PI / 2 + 0.18; // lying along +x, raised a little
    jib.position.set(0, 0.6, 0);
    const counter = part(top, boxGeo(10, 0.8, 1.6), m.yellow, -5.5, 0.4, 0);
    counter.castShadow = true;
    part(top, boxGeo(2.4, 2.2, 2), m.concreteDark, -9.6, -0.8, 0); // counterweight
    part(top, boxGeo(0.4, 5, 0.4), m.yellow, 0, 3, 0); // the apex
    for (const [x, y] of [[14, 3.2], [-9, 0.8]]) {
      const len = Math.hypot(x, 5.5 - y);
      const tie = part(top, boxGeo(len, 0.08, 0.08), m.iron, x / 2, (5.5 + y) / 2, 0);
      tie.rotation.z = Math.atan2(5.5 - y, -x) + Math.PI;
      tie.castShadow = false;
    }
    // The hook on its cable, about two-thirds out.
    const hx = 20 * Math.cos(0.18);
    const hy = 20 * Math.sin(0.18) + 0.6;
    part(top, boxGeo(0.06, hy + 18, 0.06), m.iron, hx, (hy - 18) / 2, 0).castShadow = false;
    part(top, boxGeo(0.6, 0.8, 0.6), m.iron, hx, -18, 0);
  }

  // --- The mineshaft hill: a dark hollow in its top, a timber headframe, scaffold and a cart on its south foot.
  {
    const [hx, hz] = at(20.5, 9.5);
    const pit = new THREE.Mesh(new THREE.PlaneGeometry(C * 2 - 0.6, C * 2 - 0.6), m.hollow);
    pit.rotation.x = -Math.PI / 2;
    pit.position.set(hx, RAMPART_HILL + 0.03, hz);
    scene.add(pit);
    for (const s of [-1, 1]) {
      part(scene, boxGeo(0.4, 5, 0.4), m.woodDark, hx + s * 3.2, RAMPART_HILL + 2.5, hz);
    }
    part(scene, boxGeo(7, 0.45, 0.5), m.woodDark, hx, RAMPART_HILL + 5, hz);
    part(scene, new THREE.CylinderGeometry(0.7, 0.7, 0.3, 12), m.iron, hx, RAMPART_HILL + 5.4, hz).rotation.x = Math.PI / 2;
    for (let k = 0; k < 10; k++) {
      const a = rand() * Math.PI * 2;
      const bx = hx + Math.cos(a) * 7.6;
      const bz = hz + Math.sin(a) * 7.6;
      if (path.distanceTo(bx, bz) < PATH_WIDTH / 2 + 2.6) continue;
      boulder(scene, m, bx, 1.5 + rand() * 2, bz, 1.4 + rand(), 1.5 + rand(), 1.4 + rand(), rand() * 6, true);
    }
    // Scaffold (T-W 12): posts and planks leaning on the hill's south face.
    const z = Z0(11) + 1.4;
    for (let x = X0(19) + 1; x < X0(23); x += 3.5) {
      for (const y of [1.6, 3.2]) part(scene, boxGeo(0.25, 0.25, 2.6), m.wood, x, y, z);
      part(scene, boxGeo(0.3, 3.4, 0.3), m.wood, x, 1.7, z + 1.2);
    }
    part(scene, boxGeo(X0(23) - X0(19) - 1, 0.2, 2.6), m.woodDark, (X0(19) + X0(23)) / 2, 3.3, z);
    // Rails and the black mine cart (row 13).
    const rz = Z0(12) + C / 2;
    for (const s of [-0.6, 0.6]) part(scene, boxGeo(X0(23) - X0(19) - 1, 0.12, 0.12), m.iron, (X0(19) + X0(23)) / 2, 0.1, rz + s).castShadow = false;
    const [cx] = at(21, 13);
    part(scene, boxGeo(2.4, 1.3, 1.6), m.black, cx, 1, rz);
    for (const s of [-0.8, 0.8]) for (const t of [-0.75, 0.75]) part(scene, new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10), m.iron, cx + s, 0.3, rz + t).rotation.x = Math.PI / 2;
    boulder(scene, m, cx, 1.8, rz, 0.6, 0.4, 0.5, 1, true); // ore in the cart
  }

  // --- The sand pile (Y6-AA11): soft mounds along its edges.
  for (let k = 0; k < 14; k++) {
    const side = k % 2;
    const [, z] = at(0, 5.6 + rand() * 5.8);
    const mound = part(scene, new THREE.SphereGeometry(1, 10, 7), m.sand, side ? X0(27) - 0.4 : X0(24) + 0.4, 1, z);
    mound.scale.set(1.2 + rand() * 0.6, 1.6, 1.6 + rand());
  }

  // --- Rocks and ruins.
  {
    const [x, z] = at(14.5, 9);
    boulder(scene, m, x, 1.4, z, 3.6, 2, 2.2, 0.7, true); // O9-P9
    const [gx, gz] = at(6, 14);
    boulder(scene, m, gx, 1, gz, 1.6, 1.3, 1.5, 2.1, false); // G14
    // The tall upright dark rock (Q14-Q17).
    const [sx, sz] = at(16, 15.5);
    boulder(scene, m, sx, 5, sz, 1.9, 6, 2.4, 0.4, true);
    boulder(scene, m, sx + 0.4, 1.4, sz + 4.6, 1.6, 1.6, 1.8, 1.7, true);
    boulder(scene, m, sx - 0.3, 1.2, sz - 5.2, 1.5, 1.4, 1.6, 2.6, false);
    // A ring of rocks round a dark pit (L18-N20).
    const [px, pz] = at(12, 19);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(2.6, 18), m.hollow);
    hole.rotation.x = -Math.PI / 2;
    hole.position.set(px, 0.06, pz);
    scene.add(hole);
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      boulder(scene, m, px + Math.cos(a) * 4.4, 1, pz + Math.sin(a) * 4.4, 1.4 + rand() * 0.6, 1.2 + rand() * 0.8, 1.4 + rand() * 0.6, rand() * 6, k % 2 === 0);
    }
    // The ruins (K23-L25): rubble with a broken concrete arch and a window frame.
    const [rx, rz] = at(10.5, 24);
    for (let k = 0; k < 7; k++) boulder(scene, m, rx + (rand() - 0.5) * 6, 0.8, rz + (rand() - 0.5) * 9, 1.4 + rand(), 0.9 + rand() * 0.6, 1.4 + rand(), rand() * 6, true);
    for (const s of [-1, 1]) part(scene, boxGeo(1.1, s < 0 ? 6 : 3.6, 1.1), m.concrete, rx + s * 2.2, s < 0 ? 3 : 1.8, rz - 2.5);
    const lintel = part(scene, boxGeo(3.4, 0.9, 1.1), m.concrete, rx - 1.4, 6.1, rz - 2.5);
    lintel.rotation.z = -0.12;
    const frame = new THREE.Group();
    frame.position.set(rx + 0.4, 0, rz + 2.5);
    frame.rotation.set(0, 0.5, 0.18);
    scene.add(frame);
    for (const [w, h, x, y] of [[0.5, 4, -1.2, 2], [0.5, 4, 1.2, 2], [2.9, 0.5, 0, 4], [2.9, 0.5, 0, 0.9]]) part(frame, boxGeo(w, h, 0.5), m.concreteDark, x, y, 0);
  }

  // --- Debris: a leaning plank (M13-M15), a fallen pole (M23) and orange markers.
  {
    const [px, pz] = at(12, 14);
    const plank = part(scene, boxGeo(0.8, 0.15, 10), m.wood, px, 1.3, pz);
    plank.rotation.set(0.25, 0.1, 0.15);
    const [fx, fz] = at(12.6, 23);
    const pole = part(scene, new THREE.CylinderGeometry(0.2, 0.2, 7, 8), m.concreteDark, fx, 0.25, fz);
    pole.rotation.set(0, 0.4, Math.PI / 2);
    const coneGeo = new THREE.ConeGeometry(0.35, 0.9, 8);
    for (let k = 0, n = 0; k < 60 && n < 12; k++) {
      const c = Math.floor(rand() * COLS);
      const i = Math.floor(rand() * ROWS);
      if (!'.:'.includes(RAMPART_GRID[i][c])) continue;
      const [x, z] = at(c + (rand() - 0.5) * 0.6, i + 1 + (rand() - 0.5) * 0.6);
      if (path.distanceTo(x, z) < PATH_WIDTH / 2 + 0.8) continue;
      part(scene, coneGeo, m.cone, x, 0.45, z).castShadow = false;
      n++;
    }
  }

  // --- The town strip: billboard, house, dark building, storage tank.
  {
    // Billboard (Y15-AA15): a tall sign on a red post, its ad facing the road (west).
    const [bx, bz] = at(25, 15);
    part(scene, new THREE.CylinderGeometry(0.35, 0.4, 7, 10), m.red, bx, 3.5, bz);
    part(scene, boxGeo(0.4, 5.6, 11), m.black, bx, 9.6, bz);
    const adTex = adTexture();
    const ad = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 5), new THREE.MeshLambertMaterial({ map: adTex, emissive: 0xffffff, emissiveMap: adTex, emissiveIntensity: 0.35 }));
    ad.position.set(bx - 0.22, 9.6, bz);
    ad.rotation.y = -Math.PI / 2;
    scene.add(ad);
    const spot = new THREE.PointLight(0xffd8a0, 18, 12, 1.6);
    spot.position.set(bx - 3, 13, bz);
    scene.add(spot);

    // The roofless house (Y17-AA19): orange floor, pale walls, a door to the road, a faint glass roof.
    const x0 = X0(24) + 0.4;
    const x1 = X0(27) - 0.4;
    const z0 = Z0(16) + 0.4;
    const z1 = Z0(19) - 0.4;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const wh = 3.6;
    part(scene, boxGeo(x1 - x0, 0.2, z1 - z0), m.floor, cx, 0.1, cz).castShadow = false;
    part(scene, boxGeo(x1 - x0, wh, 0.6), m.plaster, cx, wh / 2, z0 + 0.3);
    part(scene, boxGeo(x1 - x0, wh, 0.6), m.plaster, cx, wh / 2, z1 - 0.3);
    part(scene, boxGeo(0.6, wh, z1 - z0), m.plaster, x1 - 0.3, wh / 2, cz);
    for (const s of [-1, 1]) part(scene, boxGeo(0.6, wh, 4.2), m.plaster, x0 + 0.3, wh / 2, cz + s * 3.5);
    part(scene, boxGeo(0.6, 0.9, 2.8), m.plaster, x0 + 0.3, wh - 0.45, cz); // over the door
    const glass = part(scene, boxGeo(x1 - x0, 0.08, z1 - z0), m.glass, cx, wh + 0.05, cz);
    glass.castShadow = false;
    const roomLight = new THREE.PointLight(0xffc890, 12, 9, 1.6);
    roomLight.position.set(cx, 2.6, cz);
    scene.add(roomLight);

    // The dark L-shaped building (Y21-AA23): pale-grey base, near-black roof.
    const L = [[24, 22, 26, 23], [24, 21, 25, 21]];
    for (const [c0, r0, c1, r1] of L) {
      const bx0 = X0(c0) + 0.6;
      const bx1 = X0(c1 + 1) - 0.6;
      const bz0 = Z0(r0 - 1) + 0.6;
      const bz1 = Z0(r1) - 0.6;
      part(scene, boxGeo(bx1 - bx0, 1, bz1 - bz0), m.base, (bx0 + bx1) / 2, 0.5, (bz0 + bz1) / 2);
      part(scene, boxGeo(bx1 - bx0 - 0.4, 3.4, bz1 - bz0 - 0.4), m.plaster, (bx0 + bx1) / 2, 2.7, (bz0 + bz1) / 2);
      part(scene, boxGeo(bx1 - bx0 + 0.4, 0.7, bz1 - bz0 + 0.4), m.roof, (bx0 + bx1) / 2, 4.75, (bz0 + bz1) / 2);
    }
    for (const z of [Z0(21) + 1.6, Z0(22) + 2.2]) part(scene, boxGeo(0.1, 1.2, 1.4), basic(0xffd890), X0(24) + 0.75, 2.8, z).castShadow = false; // lit windows facing the road

    // White storage tank with a green band (Z25-Z26).
    const [tx, tz] = at(25, 25.5);
    part(scene, new THREE.CylinderGeometry(2.6, 2.6, 5.6, 20), m.white, tx, 2.8, tz);
    part(scene, new THREE.CylinderGeometry(2.65, 2.65, 0.9, 20), m.green, tx, 3.6, tz);
    part(scene, new THREE.SphereGeometry(2.6, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.white, tx, 5.6, tz).scale.y = 0.35;
  }

  // --- The gas station and military outpost (Q24-W27).
  {
    // Raised apron edge.
    part(scene, boxGeo(X0(23) - X0(16), 0.12, Z0(27) - Z0(23)), m.concreteDark, (X0(16) + X0(23)) / 2, 0.03, (Z0(23) + Z0(27)) / 2).castShadow = false;
    // Canopy: two brown roof panels over S-T 25-26 on four posts.
    const [c0x, c0z] = at(17.6, 24.6);
    const [c1x, c1z] = at(19.4, 26.4);
    for (const [x, z] of [[c0x, c0z], [c1x, c0z], [c0x, c1z], [c1x, c1z]]) part(scene, boxGeo(0.35, 4.4, 0.35), m.white, x, 2.2, z);
    for (const s of [-1, 1]) {
      const p = part(scene, boxGeo((c1x - c0x) / 2 + 1, 0.3, c1z - c0z + 1.4), m.brown, (c0x + c1x) / 2 + (s * (c1x - c0x)) / 4 + s * 0.25, 4.55, (c0z + c1z) / 2);
      p.rotation.z = s * 0.06;
    }
    const canopyLight = new THREE.PointLight(0xfff0d8, 14, 10, 1.6);
    canopyLight.position.set((c0x + c1x) / 2, 4, (c0z + c1z) / 2);
    scene.add(canopyLight);
    // Two blue armoured vehicles (U-W 25-27).
    for (const r of [25.4, 26.8]) {
      const [vx, vz] = at(21, r);
      const v = new THREE.Group();
      v.position.set(vx, 0, vz);
      v.rotation.y = r < 26 ? 0.08 : -0.05;
      scene.add(v);
      for (const s of [-1, 1]) part(v, boxGeo(9.6, 1.1, 0.9), m.black, 0, 0.55, s * 1.75);
      part(v, boxGeo(9, 1.6, 3.2), m.blue, 0, 1.6, 0);
      part(v, boxGeo(4, 1.2, 2.6), m.blueDark, -0.8, 2.95, 0);
      const gun = part(v, new THREE.CylinderGeometry(0.2, 0.25, 5.2, 8), m.blueDark, 2.6, 3, 0);
      gun.rotation.z = -Math.PI / 2 + 0.05;
    }
  }

  // --- Decor from the shared map data: guard towers, fuel pumps, crates, street lamps.
  const lampGeo = new THREE.SphereGeometry(0.35, 10, 8);
  let lit = 0;
  for (const p of MAP.props) {
    if (p.kind === 'guard') {
      part(scene, boxGeo(3.6, 5, 3.6), m.concrete, p.x, RAMPART_WALL + 2.5, p.z);
      part(scene, boxGeo(4.2, 0.5, 4.2), m.concreteDark, p.x, RAMPART_WALL + 5.25, p.z);
      for (const [dx, dz] of [[1.81, 0], [-1.81, 0], [0, 1.81], [0, -1.81]]) {
        part(scene, boxGeo(dx ? 0.05 : 1.6, 0.9, dz ? 0.05 : 1.6), basic(0xfff0c0), p.x + dx, RAMPART_WALL + 3.6, p.z + dz).castShadow = false;
      }
    } else if (p.kind === 'pump') {
      part(scene, boxGeo(0.7, 1.9, 0.5), m.white, p.x, 0.95, p.z);
      part(scene, boxGeo(0.5, 0.4, 0.05), basic(0x2a3a2a), p.x, 1.5, p.z - 0.27).castShadow = false;
    } else if (p.kind === 'crate') {
      part(scene, boxGeo(1.2, 1.2, 1.2), m.green, p.x, 0.6, p.z).rotation.y = p.rot;
    } else if (p.kind === 'lamp') {
      const g = new THREE.Group();
      g.position.set(p.x, 0, p.z);
      g.rotation.y = p.rot;
      scene.add(g);
      part(g, new THREE.CylinderGeometry(0.12, 0.16, 6, 8), m.lampPole, 0, 3, 0);
      part(g, boxGeo(1.4, 0.12, 0.12), m.lampPole, 0.65, 5.95, 0);
      const head = part(g, lampGeo, m.lampHead, 1.3, 5.75, 0);
      head.castShadow = false;
      // Real lights on every other lamp (16 point lights would cost too much).
      if (lit++ % 2 === 0) {
        const l = new THREE.PointLight(0xfff4dc, 26, 15, 1.5);
        l.position.set(1.3, 5.4, 0);
        g.add(l);
      }
    }
  }

  // --- The spawn cave in the west cliff (A16), glowing green inside.
  {
    const [, sz] = at(0, 16);
    const x0 = X0(0);
    const mass = (w, h, d, x, y, z) => part(scene, boxGeo(w, h, d), m.rock, x, y, z);
    mass(14, 16, 8, x0 - 7, 8 - 1.5, sz - C / 2 - 4); // north cheek
    mass(14, 16, 8, x0 - 7, 8 - 1.5, sz + C / 2 + 4); // south cheek
    mass(14, 10, C + 0.2, x0 - 7, 11, sz); // over the mouth
    part(scene, boxGeo(10, 0.3, C), m.rockDark, x0 - 5, 0, sz).castShadow = false;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(C, 6), m.glow);
    back.position.set(x0 - 9.8, 3, sz);
    back.rotation.y = Math.PI / 2;
    scene.add(back);
    const glow = new THREE.PointLight(0x3ce03c, 40, 22, 1.4);
    glow.position.set(x0 - 2, 3, sz);
    scene.add(glow);
    animated.push((t) => (glow.intensity = 40 + Math.sin(t * 2.2) * 8));
  }

  // --- The base tunnel at the south edge (X28): a concrete portal with a dark bore.
  {
    const [tx] = at(23, 28);
    const z = Z0(27);
    for (const s of [-1, 1]) part(scene, boxGeo(1.2, 6.5, 1.6), m.concrete, tx + s * 2.7, 3.25, z);
    part(scene, boxGeo(6.6, 1.4, 1.6), m.concrete, tx, 7.2, z);
    part(scene, boxGeo(4.2, 6.5, 12), m.black, tx, 3.25, z + 6.8).castShadow = false;
    const l = new THREE.PointLight(0xffd8a0, 16, 10, 1.6);
    l.position.set(tx, 6, z - 1.6);
    scene.add(l);
  }

  if (!versus) {
    // --- The outer crater: a ring of jagged dark mountains, with faint orange spots.
    for (let k = 0; k < 44; k++) {
      const a = (k / 44) * Math.PI * 2 + rand() * 0.08;
      const r = 92 + rand() * 40;
      const h = 22 + rand() * 30;
      const mtn = part(scene, new THREE.ConeGeometry(14 + rand() * 12, h, 6 + Math.floor(rand() * 3)), rand() < 0.5 ? m.rock : m.rockDark, Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r);
      mtn.rotation.y = rand() * 6;
      mtn.castShadow = false;
      if (rand() < 0.35) {
        const spot = part(scene, new THREE.SphereGeometry(0.8 + rand(), 6, 5), m.orangeSpot, Math.cos(a) * (r - 8), 2 + rand() * h * 0.4, Math.sin(a) * (r - 8));
        spot.castShadow = false;
      }
    }
    // A crashed spaceship to the north-west, its engine still burning.
    {
      const ship = new THREE.Group();
      ship.position.set(-86, 2, -82);
      ship.rotation.set(0.12, 0.7, 0.2);
      scene.add(ship);
      const hull = part(ship, new THREE.SphereGeometry(1, 14, 10), m.hull, 0, 3, 0);
      hull.scale.set(14, 4, 6);
      const wing = part(ship, boxGeo(10, 0.6, 18), m.hull, 3, 2.6, 0);
      wing.rotation.z = 0.15;
      part(ship, new THREE.CylinderGeometry(2.2, 2.6, 5, 12), m.iron, 13, 3, 0).rotation.z = Math.PI / 2;
      const fl = new THREE.Mesh(new THREE.ConeGeometry(2, 6, 10), m.flame);
      fl.position.set(17.5, 3, 0);
      fl.rotation.z = -Math.PI / 2;
      ship.add(fl);
      const shipLight = new THREE.PointLight(0xff8a30, 60, 40, 1.4);
      shipLight.position.set(16, 6, 0);
      ship.add(shipLight);
      animated.push((t) => {
        fl.scale.set(1, 0.85 + Math.sin(t * 11) * 0.12 + Math.sin(t * 27) * 0.05, 1);
        shipLight.intensity = 55 + Math.sin(t * 13) * 10;
      });
    }
    // Domed buildings to the north-east and south-west, lit orange and white.
    for (const [x, z] of [[92, -78], [-90, 84]]) {
      part(scene, new THREE.SphereGeometry(13, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m.base, x, 0, z);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        part(scene, boxGeo(1.6, 1, 1.6), k % 3 ? m.domeLit : basic(0xffffff), x + Math.cos(a) * 12.4, 2.4, z + Math.sin(a) * 12.4).castShadow = false;
      }
      part(scene, new THREE.SphereGeometry(1.2, 10, 8), m.domeLit, x, 13.2, z);
    }
  }

  scene.userData.tick = (t) => animated.forEach((f) => f(t));
  return scene;
}
