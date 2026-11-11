// Sunset Crossing: the map renderer (shared pieces come from worldkit.js).

import * as THREE from 'three';
import { boxGeo, part } from './models.js';
import { mulberry32 } from './utils.js';
import { path } from './sim/path.js';
import { CROSS_CELL, CROSS_GRID, CROSS_ROAD, crossCh, crossGround, crossH } from './sim/maps.js';
import { TREES, canvasTex, instanced, themeMats, tileTexture } from './worldkit.js';

const CX0 = (c) => (c - 20) * CROSS_CELL; // west edge of column c (0 = A)
const RZ0 = (i) => (i - 11.5) * CROSS_CELL; // north edge of row index i (0 = row 1)
const cellXZ = (c, i) => [CX0(c) + CROSS_CELL / 2, RZ0(i) + CROSS_CELL / 2];

/** A flat rectangle (w x d) at height y, its texture repeating every half cell. */
function crossPlane(parent, w, d, mat, x, y, z) {
  const geo = new THREE.PlaneGeometry(w, d);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / (CROSS_CELL / 2), (uv.getY(i) * d) / (CROSS_CELL / 2));
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

let crossMats = null;
/** Sunset Crossing materials, made once. */
function crossMaterials() {
  if (crossMats) return crossMats;
  const tex = (base, vars, lines) => new THREE.MeshLambertMaterial({ map: tileTexture(base, vars, lines, 64, 4) });
  const col = (c, extra) => new THREE.MeshLambertMaterial({ color: c, ...extra });
  crossMats = {
    // Terrain tops (by terrain key) and sides.
    top: {
      grass: tex('#5c9a3e', ['#58943b', '#619f42', '#549038']),
      b: tex('#6e4a3c', ['#684538', '#744f40', '#634234']),
      f: tex('#a88e78', ['#9e8470', '#b09680', '#a08872'], 'rgba(60,40,30,0.35)'),
      y: tex('#e6d45a', ['#dccb52', '#ecda66', '#d8c64e']),
      r: tex('#b98068', ['#b07860', '#c08870', '#a87260']),
      d: tex('#d08a3c', ['#c88236', '#d69244', '#c47e34']),
      east: tex('#b5aca4', ['#aca39b', '#bcb3ab', '#a69d95']),
      north: tex('#9a8a7a', ['#928272', '#a29282', '#8a7a6a']),
      nw: tex('#8a6a4a', ['#826244', '#927250', '#7a5c40']),
      crater: tex('#3a2a22', ['#33251e', '#40302a', '#2e211b']),
      court: tex('#7a3a2e', ['#723629', '#823f33', '#6c3328']),
      road: tex('#9e9a96', ['#99958f', '#a39f9b', '#96928e'], 'rgba(0,0,0,0.06)'),
    },
    side: {
      grass: col(0x6e5236), b: col(0x5a3c30), f: col(0x8a735f), y: col(0xc9b84a), r: col(0xa06c56),
      d: col(0x6e4428), east: col(0xa39a92, { flatShading: true }), north: col(0x857565), nw: col(0x6e4428),
      crater: col(0x2a1e18), court: col(0x4a3a34), road: col(0x7e7a76),
    },
    plateau: col(0x6e4428, { flatShading: true }),
    lowland: col(0xa8765a),
    roadEdge: col(0x7e7a76),
    chevron: { green: col(0x7ed88a), orange: col(0xf08a30), yellow: col(0xf0e07a), red: col(0xf08070) },
    chevronLine: col(0x4a4644),
    bridge: col(0xe8601c),
    bridgeDark: col(0xc44e14),
    yellow: col(0xf2c030),
    slab: col(0xd2d2d0),
    brick: { red: col(0xd02a2a), blue: col(0x2a4ac8), green: col(0x3e9a3a) },
    deadTrunk: col(0x4a3626),
    boulder: col(0xdadad6, { flatShading: true }),
    candle: col(0x9a9a9e),
    candleRing: col(0x7a7a80),
    salmon: col(0xf08a7a),
    white: col(0xf6f2ec),
    wick: col(0x222222),
    flame: new THREE.MeshBasicMaterial({ color: 0xffb040 }),
    metal: col(0x8a8a9a),
    pedestal: col(0x9a9a9a),
    pad: null, // set below (sunburst texture)
    crate: col(0x9c6b3c),
    crateDark: col(0x6d4a2a),
    barrel: col(0xe07a20),
    glass: new THREE.MeshLambertMaterial({ color: 0xa8d4e6, transparent: true, opacity: 0.45, depthWrite: false }),
    black: col(0x222222),
    trim: col(0xf2d040),
    castle: col(0x4a3a34),
    castleStep: col(0x8a4636),
    grate: col(0x55585c),
    bone: col(0xe8d9a0),
    roof: col(0x3a2c28),
    wood: col(0x8a5a32),
    woodDark: col(0x6a4426),
    cave: new THREE.MeshBasicMaterial({ color: 0x0a0806 }),
    caveGlow: new THREE.MeshBasicMaterial({ color: 0x5a2a6a, transparent: true, opacity: 0.35 }),
    halo: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
  };
  // Grey spawn-point pad: light grey square with a dark sunburst.
  crossMats.pad = new THREE.MeshLambertMaterial({
    map: canvasTex(64, (g, s) => {
      g.fillStyle = '#c8c8c6';
      g.fillRect(0, 0, s, s);
      g.strokeStyle = '#8a8a88';
      g.lineWidth = 3;
      g.strokeRect(2, 2, s - 4, s - 4);
      g.fillStyle = '#3a3a3a';
      g.beginPath();
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const r = k % 2 ? s * 0.16 : s * 0.36;
        g.lineTo(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r);
      }
      g.fill();
    }),
  });
  // Central crossing slab: light grey with a dark emblem.
  crossMats.cross = new THREE.MeshLambertMaterial({
    map: canvasTex(64, (g, s) => {
      g.fillStyle = '#cfcfcc';
      g.fillRect(0, 0, s, s);
      g.fillStyle = '#2e2e30';
      g.beginPath();
      g.arc(s / 2, s / 2, s * 0.26, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#cfcfcc';
      g.fillRect(s * 0.46, s * 0.2, s * 0.08, s * 0.6);
      g.fillRect(s * 0.2, s * 0.46, s * 0.6, s * 0.08);
    }),
  });
  return crossMats;
}

/** Warm sunset sky: dusty pink overhead fading to peach at the horizon, with thin streaky clouds. */
function sunsetSky() {
  const W = 1024;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#b97a7c');
  grad.addColorStop(0.25, '#c9877f');
  grad.addColorStop(0.46, '#e9a577');
  grad.addColorStop(0.52, '#d9a08a');
  grad.addColorStop(1, '#b8846e');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // The low sun's glow (the sun sits low in the west).
  const glow = g.createRadialGradient(W * 0.5, H * 0.47, 6, W * 0.5, H * 0.47, W * 0.28);
  glow.addColorStop(0, 'rgba(255,214,150,0.9)');
  glow.addColorStop(0.15, 'rgba(255,190,120,0.45)');
  glow.addColorStop(1, 'rgba(255,170,110,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  const rand = mulberry32(5150);
  // Thin streaky clouds.
  for (let i = 0; i < 90; i++) {
    const x = rand() * W;
    const y = H * (0.08 + rand() * 0.36);
    const w = 60 + rand() * 220;
    const h = 1.5 + rand() * 4;
    g.fillStyle = `rgba(${245 + rand() * 10},${200 + rand() * 40},${190 + rand() * 40},${0.12 + rand() * 0.25})`;
    g.beginPath();
    g.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1500, 48, 24),
    new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  dome.rotation.y = Math.PI; // the bright patch faces west (-x), where the sun is
  dome.renderOrder = -10;
  return dome;
}

/** Terrain key of a ground character (decides the top texture and side color). */
function crossTerrainKey(k, c) {
  if (k === ',' || k === 'o' || k === 'G') return 'grass';
  if (k === 'H') return 'b';
  if (k === '^') return c < 5 ? 'nw' : c < 25 ? 'north' : 'east';
  if (k === '*' || k === '=') return 'crater';
  if (k === 'C') return 'court';
  if (CROSS_ROAD.includes(k)) return 'road';
  return k; // b f y r d
}

/** A chunky Lego-style brick wall filling one cell along `axis`, bricks colored from `colors`. */
function brickWall(parent, m, x, y, z, axis, colors) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (axis === 'z') g.rotation.y = Math.PI / 2;
  parent.add(g);
  const H = 1.15;
  const courses = [[[-1.25, 2.4], [1.25, 2.4]], [[-2, 0.9], [0, 2.4], [2, 0.9]]];
  let n = 0;
  courses.forEach((bricks, k) => {
    for (const [bx, len] of bricks) {
      const mat = m.brick[colors[n++ % colors.length]];
      part(g, boxGeo(len - 0.06, H - 0.04, 1), mat, bx, H / 2 + k * H, 0);
      if (k === 1) for (let sx = bx - len / 2 + 0.4; sx < bx + len / 2; sx += 0.8) part(g, new THREE.CylinderGeometry(0.22, 0.22, 0.2, 10), mat, sx, 2 * H + 0.1, 0);
    }
  });
}

/** A grey-violet metal statue on a pedestal. pose: ball | dab | stand | shuriken. */
function crossStatue(parent, m, x, y, z, pose) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = Math.atan2(-x, -z); // face the middle of the map
  parent.add(g);
  part(g, boxGeo(2.6, 1.6, 2.6), m.pedestal, 0, 0.8, 0);
  const s = m.metal;
  for (const side of [-1, 1]) part(g, boxGeo(0.6, 2, 0.7), s, side * 0.4, 2.6, 0);
  part(g, boxGeo(1.6, 2, 0.9), s, 0, 4.6, 0);
  part(g, boxGeo(1, 1, 1), s, 0, 6.1, 0);
  const arm = (side, rx, rz) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 1.05, 5.4, 0);
    pivot.rotation.set(rx, 0, rz);
    g.add(pivot);
    part(pivot, boxGeo(0.5, 1.8, 0.5), s, 0, -0.8, 0);
    return pivot;
  };
  if (pose === 'ball') {
    arm(-1, 0, 0);
    const a = arm(1, -1.4, 0);
    part(a, new THREE.SphereGeometry(0.6, 12, 8), s, 0, -1.9, 0);
  } else if (pose === 'dab') {
    part(g, boxGeo(1, 1, 1), s, 0, 6.1, 0).rotation.z = 0.4;
    arm(-1, 0, -2.3);
    arm(1, -0.9, 2.2);
  } else if (pose === 'shuriken') {
    for (const side of [-1, 1]) {
      const a = arm(side, -0.6, side * 0.9);
      const star = part(a, boxGeo(0.9, 0.1, 0.25), s, 0, -1.9, 0);
      part(star, boxGeo(0.25, 0.1, 0.9), s, 0, 0, 0);
      star.rotation.y = 0.4;
    }
  } else {
    arm(-1, 0, 0.1);
    arm(1, 0, -0.1);
  }
}

/** A tall grey segmented candle tower with salmon-pink and white caps and a small wick. */
function candleTower(parent, m, x, y, z, height) {
  const segs = Math.round(height / 2.6);
  const sh = height / segs;
  for (let k = 0; k < segs; k++) {
    const r = 1.15 - k * 0.02;
    part(parent, new THREE.CylinderGeometry(r, r + 0.04, sh - 0.25, 16), m.candle, x, y + k * sh + sh / 2, z);
    part(parent, new THREE.CylinderGeometry(r + 0.12, r + 0.12, 0.25, 16), m.candleRing, x, y + (k + 1) * sh - 0.12, z);
  }
  const top = y + height;
  part(parent, new THREE.CylinderGeometry(1.35, 1.35, 1.1, 16), m.salmon, x, top + 0.55, z);
  part(parent, new THREE.CylinderGeometry(1.0, 1.15, 0.7, 16), m.white, x, top + 1.45, z);
  part(parent, boxGeo(0.15, 0.8, 0.15), m.wick, x, top + 2.2, z);
  part(parent, new THREE.SphereGeometry(0.22, 8, 6), m.flame, x, top + 2.75, z).scale.y = 1.6;
}

/**
 * Sunset Crossing, built from the spec grid (CROSS_GRID): a plateau of four quadrants with their
 * own ground, a self-crossing grey road with colored chevrons, the bridge over the crater, the
 * castle, the glass tower, the candle towers and both caves.
 */
export function buildCrossing(parent, { oz = 0, versus = false } = {}) {
  const scene = new THREE.Group();
  scene.position.z = oz;
  parent.add(scene);
  const m = crossMaterials();
  const tm = themeMats();
  const C = CROSS_CELL;
  const G = CROSS_GRID;
  const rows = G.length;
  const cols = G[0].length;
  const ch = (c, i) => crossCh(c, i);
  const isRoad = (c, i) => {
    const k = ch(c, i);
    return CROSS_ROAD.includes(k) && k !== '=' ? true : k === 'W' && crossGround(c, i) === '#';
  };
  const rand = mulberry32(8813);
  const BASE = -3; // bottom of the terrain boxes (the plateau slab is below)

  if (!versus) {
    scene.add(sunsetSky());
    // Lowland far below the plateau, lost in the haze.
    const low = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1000), m.lowland);
    low.rotation.x = -Math.PI / 2;
    low.position.y = -30;
    scene.add(low);
  }
  // --- The plateau: cliff drops on all four sides, with jagged rock along the edges.
  const PW = cols * C;
  const PD = rows * C;
  part(scene, boxGeo(PW, 27, PD), m.plateau, 0, BASE - 13.5, 0).castShadow = false;
  for (let k = 0; k < 60; k++) {
    const side = k % 4;
    const t = rand();
    const w = 4 + rand() * 6;
    const h = 8 + rand() * 14;
    const x = side < 2 ? -PW / 2 + t * PW : (side === 2 ? -1 : 1) * (PW / 2 + 0.6);
    const z = side >= 2 ? -PD / 2 + t * PD : (side === 0 ? -1 : 1) * (PD / 2 + 0.6);
    part(scene, boxGeo(side < 2 ? w : 2.5, h, side < 2 ? 2.5 : w), m.plateau, x, BASE - 2 - h / 2 - rand() * 8, z).castShadow = false;
  }

  // --- Terrain: one box per run of same-terrain, same-height cells in a row.
  for (let i = 0; i < rows; i++) {
    let c = 0;
    while (c < cols) {
      const key = crossTerrainKey(crossGround(c, i), c);
      const h = crossH(c, i);
      let e = c;
      while (e + 1 < cols && crossTerrainKey(crossGround(e + 1, i), e + 1) === key && crossH(e + 1, i) === h) e++;
      const x0 = CX0(c);
      const x1 = CX0(e + 1);
      const z = RZ0(i) + C / 2;
      const top = key === 'road' ? 0.12 : h;
      const box = part(scene, boxGeo(x1 - x0, top - BASE, C), m.side[key], (x0 + x1) / 2, (top + BASE) / 2, z);
      box.castShadow = top > 1;
      crossPlane(scene, x1 - x0, C, m.top[key], (x0 + x1) / 2, top + 0.01, z);
      c = e + 1;
    }
  }

  // Rounded blocks along the yellow hills' and rock domes' edges (stacked-sponge look).
  const bumpGeo = new THREE.SphereGeometry(1, 10, 7);
  for (let i = 0; i < rows; i++) {
    for (let c = 0; c < cols; c++) {
      const k = crossGround(c, i);
      if (k !== 'y' && k !== 'r') continue;
      const h = crossH(c, i);
      const [x, z] = cellXZ(c, i);
      for (const [dc, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (crossH(c + dc, i + di) >= h) continue;
        for (const f of [-0.28, 0.28]) {
          const b = part(scene, bumpGeo, k === 'y' ? m.side.y : m.side.r, x + dc * C * 0.42 + (di ? f * C : 0), h - 1.3 - rand() * 1.2, z + di * C * 0.42 + (dc ? f * C : 0));
          b.scale.set(1.7 + rand() * 0.6, 1.3 + rand() * 0.5, 1.7 + rand() * 0.6);
        }
      }
    }
  }

  // --- Road edges (darker grey) wherever the road meets something else.
  for (let i = 0; i < rows; i++) {
    for (let c = 0; c < cols; c++) {
      if (!isRoad(c, i)) continue;
      const [x, z] = cellXZ(c, i);
      for (const [dc, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = ch(c + dc, i + di);
        if (isRoad(c + dc, i + di) || n === '=' || n === ' ') continue;
        const strip = part(scene, boxGeo(di ? C : 0.5, 0.06, di ? 0.5 : C), m.roadEdge, x + dc * (C / 2 - 0.25), 0.15, z + di * (C / 2 - 0.25));
        strip.castShadow = false;
      }
    }
  }
  // The central crossing slab (T13).
  {
    const i = G.findIndex((l) => l.includes('+'));
    const [x, z] = cellXZ(G[i].indexOf('+'), i);
    part(scene, boxGeo(3.6, 0.14, 3.6), m.cross, x, 0.19, z).castShadow = false;
  }

  // --- The bridge over the crater: orange-red planks, slightly arched, with yellow rails.
  const bridgeCells = [];
  G.forEach((l, i) => [...l].forEach((k, c) => k === '=' && bridgeCells.push([c, i])));
  const bx0 = Math.min(...bridgeCells.map(([c]) => CX0(c)));
  const bx1 = Math.max(...bridgeCells.map(([c]) => CX0(c + 1)));
  const bz = cellXZ(0, bridgeCells[0][1])[1];
  const arch = (x) => 0.12 + 0.35 * Math.sin(Math.PI * Math.min(1, Math.max(0, (x - bx0) / (bx1 - bx0))));
  for (let x = bx0 + 0.45; x < bx1; x += 0.9) {
    const p = part(scene, boxGeo(0.84, 0.25, C - 0.4), Math.round(x / 0.9) % 2 ? m.bridge : m.bridgeDark, x, arch(x), bz);
    p.rotation.y = (rand() - 0.5) * 0.03;
  }
  for (const side of [-1, 1]) {
    const rz = bz + side * (C / 2 - 0.2);
    for (let x = bx0; x <= bx1 + 0.01; x += (bx1 - bx0) / 6) part(scene, boxGeo(0.3, 1.4, 0.3), m.yellow, x, arch(x) + 0.7, rz);
    for (let x = bx0; x < bx1 - 0.01; x += (bx1 - bx0) / 6) {
      const x2 = x + (bx1 - bx0) / 6;
      const rail = part(scene, boxGeo(Math.hypot(x2 - x, arch(x2) - arch(x)), 0.22, 0.22), m.yellow, (x + x2) / 2, (arch(x) + arch(x2)) / 2 + 1.35, rz);
      rail.rotation.z = Math.atan2(arch(x2) - arch(x), x2 - x);
    }
    for (const x of [bx0 + 0.6, bx1 - 0.6]) part(scene, boxGeo(0.6, 1.4, 0.6), m.bridgeDark, x, -0.6, rz);
  }
  // The scorched halo round the crater.
  {
    const cells = [];
    G.forEach((l, i) => [...l].forEach((k, c) => (k === '*' || k === '=') && cells.push(cellXZ(c, i))));
    const cx = cells.reduce((a, p) => a + p[0], 0) / cells.length;
    const cz = cells.reduce((a, p) => a + p[1], 0) / cells.length;
    const halo = new THREE.Mesh(new THREE.RingGeometry(10, 15, 40), m.halo);
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(cx, 0.05, cz);
    scene.add(halo);
  }

  // --- Chevrons along the road, every ~30 studs, colored by section, pointing the way.
  const route = path.routes[0];
  const cross = cellXZ(19, 12);
  const sectionOf = (segIdx, p) => {
    if (segIdx === 0) return p.x > cross[0] - C / 2 ? 'green' : 'orange';
    if (segIdx < route.segs.length - 1) return 'yellow';
    return p.z > cross[1] ? 'yellow' : 'red';
  };
  const vGeo = boxGeo(0.38, 0.05, 1.7);
  const vLine = boxGeo(0.62, 0.04, 1.95);
  const tmp = {};
  for (let d = 7; d < path.length - 4; d += 17) {
    path.at(d, tmp, 0);
    if (Math.hypot(tmp.x - cross[0], tmp.z - cross[1]) < 4) continue; // not on the crossing slab
    const segIdx = route.segs.findIndex((s) => d <= s.start + s.len);
    const g = new THREE.Group();
    const onBridge = Math.abs(tmp.z - bz) < 1 && tmp.x > bx0 && tmp.x < bx1;
    g.position.set(tmp.x, (onBridge ? arch(tmp.x) + 0.13 : 0.2), tmp.z);
    g.rotation.y = Math.atan2(tmp.dx, tmp.dz);
    scene.add(g);
    const mat = m.chevron[sectionOf(segIdx, tmp)];
    for (let k = 0; k < 3; k++) {
      for (const side of [-1, 1]) {
        const zOff = (k - 1) * 0.95;
        const outline = part(g, vLine, m.chevronLine, side * 0.55, 0, zOff);
        outline.rotation.y = side * 0.8;
        outline.castShadow = false;
        const arm = part(g, vGeo, mat, side * 0.55, 0.02, zOff);
        arm.rotation.y = side * 0.8;
        arm.castShadow = false;
      }
    }
  }

  // --- Cell decorations.
  const WALL_COLORS = { '18,4': ['red', 'blue'], '13,3': ['red'], '12,6': ['blue'], '19,19': ['red'] };
  const STATUE_POSES = { '8,0': 'ball', '28,2': 'dab' };
  const boulders = [];
  for (let i = 0; i < rows; i++) {
    for (let c = 0; c < cols; c++) {
      const k = ch(c, i);
      const [x, z] = cellXZ(c, i);
      const y = Math.max(0, crossH(c, i));
      const hold = new THREE.Group(); // stands decorations on their cell's ground
      hold.position.y = y;
      if (k === 'T') {
        scene.add(hold);
        TREES.round(hold, { x, z, s: 0.75 + rand() * 0.2, rot: rand() * Math.PI, leaf: 0 }, tm);
      } else if (k === 't') {
        scene.add(hold);
        TREES.dead(hold, { x, z, s: 0.8 + rand() * 0.3, rot: rand() * Math.PI }, tm);
      } else if (k === 'o') {
        for (let n = 0; n < 3; n++) boulders.push([x + (rand() - 0.5) * 2.6, 0.7, z + (rand() - 0.5) * 2.6, rand() * Math.PI, 1.1 + rand() * 0.9]);
      } else if (k === 'L') {
        candleTower(scene, m, x, y, z, c >= 30 ? 26 : 20);
      } else if (k === 'M') {
        crossStatue(scene, m, x, y, z, STATUE_POSES[`${c},${i}`] ?? 'stand');
        if (c > 20) { // a crate and orange barrels by the NE statue
          part(scene, boxGeo(1.8, 1.8, 1.8), m.crate, x + 2.6, y + 0.9, z + 0.6);
          part(scene, new THREE.CylinderGeometry(0.6, 0.6, 1.5, 12), m.barrel, x + 2.4, y + 0.75, z - 1.6);
          part(scene, new THREE.CylinderGeometry(0.6, 0.6, 1.5, 12), m.barrel, x + 1.2, y + 0.75, z - 2.1);
        }
      } else if (k === 'P') {
        part(scene, boxGeo(4, 0.12, 4), m.pad, x, crossH(c, i) + 0.06, z).castShadow = false;
      } else if (k === 'X') {
        const crate = part(scene, boxGeo(2.4, 2.4, 2.4), m.crate, x, y + 1.2, z);
        crate.rotation.y = rand() * 0.6;
        for (const dy of [0.15, 2.25]) part(crate, boxGeo(2.5, 0.25, 2.5), m.crateDark, 0, dy - 1.2, 0);
        part(scene, new THREE.CylinderGeometry(0.6, 0.6, 1.5, 12), m.barrel, x + 1.9, y + 0.75, z + 1.2);
      } else if (k === 'W') {
        const horiz = ch(c - 1, i) === 'W' || ch(c + 1, i) === 'W';
        const byRoad = isRoad(c - 1, i) || isRoad(c + 1, i);
        brickWall(scene, m, x, y, z, !horiz && byRoad ? 'z' : 'x', WALL_COLORS[`${c},${i}`] ?? ['green']);
      } else if (k === '|') {
        // Short yellow post-and-rail barrier closing the west stub.
        for (const dz of [-1.9, 0, 1.9]) part(scene, boxGeo(0.4, 1.6, 0.4), m.yellow, x, 0.8, z + dz);
        for (const dy of [0.7, 1.4]) part(scene, boxGeo(0.25, 0.25, 4.4), m.yellow, x, dy, z);
      }
    }
  }
  for (const [x, z, pose] of [[...cellXZ(1, 19), 'stand'], [...cellXZ(20, 15), 'shuriken']]) crossStatue(scene, m, x, 0, z, pose);
  // White boulder clusters.
  for (const [x, y, z, ry, s] of boulders) {
    const b = part(scene, new THREE.DodecahedronGeometry(s, 0), m.boulder, x, y * s, z);
    b.rotation.set(rand(), ry, rand());
    b.scale.y = 0.8;
  }

  // --- Blue glass tower (K-O, rows 18-22): three floors of glass slabs, black corner columns,
  // yellow stairs and trims.
  {
    const gc = [];
    G.forEach((l, i) => [...l].forEach((k, c) => k === 'G' && gc.push([c, i])));
    const x0 = CX0(Math.min(...gc.map(([c]) => c))) + 0.5;
    const x1 = CX0(Math.max(...gc.map(([c]) => c)) + 1) - 0.5;
    const z0 = RZ0(Math.min(...gc.map(([, i]) => i))) + 0.5;
    const z1 = RZ0(Math.max(...gc.map(([, i]) => i)) + 1) - 0.5;
    const w = x1 - x0;
    const d = z1 - z0;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const FH = 5.7;
    for (let f = 0; f <= 3; f++) {
      const y = f * FH + 0.2;
      const slab = part(scene, boxGeo(w, 0.35, d), m.glass, cx, y, cz);
      slab.castShadow = false;
      slab.renderOrder = 2;
      for (const side of [-1, 1]) {
        part(scene, boxGeo(w, 0.3, 0.3), m.trim, cx, y + 0.2, cz + (side * d) / 2);
        part(scene, boxGeo(0.3, 0.3, d), m.trim, cx + (side * w) / 2, y + 0.2, cz);
      }
      if (f > 0 && f < 3) {
        // Low glass railings round the open floors.
        for (const side of [-1, 1]) {
          const r1 = part(scene, boxGeo(w, 1.1, 0.12), m.glass, cx, y + 0.75, cz + (side * d) / 2);
          const r2 = part(scene, boxGeo(0.12, 1.1, d), m.glass, cx + (side * w) / 2, y + 0.75, cz);
          r1.castShadow = r2.castShadow = false;
        }
      }
    }
    for (const x of [x0, x1]) for (const z of [z0, z1]) part(scene, boxGeo(1, 3 * FH + 0.6, 1), m.black, x, (3 * FH + 0.6) / 2, z);
    // Stair flights, alternating sides, from each floor up to the next.
    for (let f = 0; f < 3; f++) {
      const steps = 9;
      const sz = f % 2 ? z1 - 2.2 : z0 + 2.2;
      for (let s = 0; s < steps; s++) {
        const t = (s + 0.5) / steps;
        const sx = f % 2 ? x1 - 3 - t * (w * 0.55) : x0 + 3 + t * (w * 0.55);
        part(scene, boxGeo(w * 0.55 / steps, 0.3, 2.6), m.trim, sx, f * FH + 0.2 + t * FH, sz);
      }
    }
  }

  // --- The sunken castle (SE): crenellated outer walls round a stepped red-brown courtyard.
  {
    const isC = (c, i) => ch(c, i) === 'C' || (ch(c, i) === 'P' && crossGround(c, i) === 'C');
    const merlons = [];
    for (let i = 0; i < rows; i++) {
      for (let c = 0; c < cols; c++) {
        if (!isC(c, i)) continue;
        const [x, z] = cellXZ(c, i);
        const out = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dc, di]) => !isC(c + dc, i + di));
        if (out.length) {
          part(scene, boxGeo(C, 4.5, C), m.castle, x, -1 + 2.25, z);
          for (const [dc, di] of out) {
            for (const f of [-0.3, 0.3]) merlons.push([x + dc * (C / 2 - 0.5) + (di ? f * C : 0), 3.95, z + di * (C / 2 - 0.5) + (dc ? f * C : 0)]);
          }
        } else {
          // Inner ring: a step down from the walls into the courtyard.
          const ring1 = [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, di]) => {
            const [c2, i2] = [c + dc, i + di];
            return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !isC(c2 + a, i2 + b));
          });
          if (ring1) part(scene, boxGeo(C, 0.6, C), m.castleStep, x, -0.7, z).castShadow = false;
        }
      }
    }
    instanced(scene, boxGeo(1.1, 1.1, 1.1), m.castle, merlons);
    // Metal floor grate (Z19).
    const [gx, gz] = cellXZ(25, 18);
    part(scene, boxGeo(3.2, 0.1, 3.2), m.grate, gx, -0.95, gz).castShadow = false;
    for (let k = -1.2; k <= 1.21; k += 0.6) part(scene, boxGeo(0.15, 0.12, 3.2), m.black, gx + k, -0.88, gz).castShadow = false;
    // Round turret with a cone roof at the castle's east corner (near AF18).
    const [tx, tz] = cellXZ(29, 17);
    part(scene, new THREE.CylinderGeometry(2.3, 2.5, 8, 16), m.castle, tx, 3, tz);
    part(scene, new THREE.ConeGeometry(3, 4, 16), m.roof, tx, 9, tz);
    // Ivory bone spikes jutting from the ground all round the castle's rim.
    const spikeGeo = new THREE.ConeGeometry(0.35, 1, 6);
    for (let i = 0; i < rows; i++) {
      for (let c = 0; c < cols; c++) {
        if (ch(c, i) !== 'b') continue;
        for (const [dc, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (!isC(c + dc, i + di)) continue;
          const [x, z] = cellXZ(c, i);
          for (const f of [-0.25, 0.2]) {
            const len = 1.2 + rand() * 2.4;
            const sp = part(scene, spikeGeo, m.bone, x + dc * (C / 2 - 0.8) + (di ? f * C : 0), len * 0.4, z + di * (C / 2 - 0.8) + (dc ? f * C : 0));
            sp.scale.set(1, len, 1);
            sp.rotation.set(-di * 0.5, 0, dc * 0.5); // lean away from the castle
          }
        }
      }
    }
    // A stack of cylindrical bones near Y15.
    const [sx, sz] = cellXZ(24, 13);
    [[0, 0.5, -0.6], [0, 0.5, 0.6], [0, 1.4, 0]].forEach(([dx, y, dz]) => {
      const b = part(scene, new THREE.CylinderGeometry(0.5, 0.5, 3.2, 10), m.bone, sx + dx, y, sz + dz);
      b.rotation.z = Math.PI / 2;
    });
  }

  // --- Wooden trestle: in the SE corner (H cells) and on along the outer south and west cliffs.
  {
    const TY = 6;
    const pts = [[90, 38], [90, PD / 2 + 4], [-PW / 2 - 4, PD / 2 + 4], [-PW / 2 - 4, -45]];
    const posts = [];
    const braces = [];
    for (let s = 0; s < pts.length - 1; s++) {
      const [ax, az] = pts[s];
      const [bx, bz2] = pts[s + 1];
      const len = Math.hypot(bx - ax, bz2 - az);
      const dx = (bx - ax) / len;
      const dz = (bz2 - az) / len;
      const yaw = Math.atan2(dx, dz);
      // Rails and ties along the top.
      for (const side of [-1, 1]) {
        const rail = part(scene, boxGeo(0.3, 0.3, len), m.woodDark, (ax + bx) / 2 + dz * side * 1.1, TY + 0.45, (az + bz2) / 2 - dx * side * 1.1);
        rail.rotation.y = yaw;
      }
      for (let t = 0; t < len; t += 5) {
        const x = ax + dx * t;
        const z = az + dz * t;
        const onPlateau = Math.abs(x) < PW / 2 && Math.abs(z) < PD / 2;
        const foot = onPlateau ? 0 : -26;
        for (const side of [-1, 1]) posts.push([x + dz * side * 1.5, foot, z - dx * side * 1.5, TY - foot]);
        braces.push([x, z, yaw, foot]);
      }
    }
    for (const [x, y0, z, h] of posts) part(scene, boxGeo(0.4, h, 0.4), m.wood, x, y0 + h / 2, z).castShadow = h < 10;
    for (const [x, z, yaw, foot] of braces) {
      for (let y = foot + 2; y < TY; y += 4) {
        const b = part(scene, boxGeo(3.4, 0.25, 0.25), m.woodDark, x, y, z);
        b.rotation.y = yaw + Math.PI / 2;
        b.castShadow = false;
      }
      const tie = part(scene, boxGeo(3.4, 0.3, 0.6), m.wood, x, TY + 0.15, z);
      tie.rotation.y = yaw + Math.PI / 2;
    }
  }

  // --- Spawn cave (AE13) in the grey east cliff, and the base cave (T2) in the north cliff.
  const caveAt = (k) => {
    const i = G.findIndex((l) => l.includes(k));
    return [G[i].indexOf(k), i];
  };
  {
    const [c, i] = caveAt('S');
    const [x, z] = cellXZ(c, i);
    const h = crossH(c + 1, i);
    part(scene, boxGeo(C, h - 7, C), m.side.east, x, 7 + (h - 7) / 2, z); // the rock over the mouth
    crossPlane(scene, C, C, m.top.east, x, h + 0.01, z);
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(C, 7), m.cave);
    mouth.rotation.y = -Math.PI / 2;
    mouth.position.set(CX0(c + 1) - 0.02, 3.5, z);
    scene.add(mouth);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(C * 0.7, 5), m.caveGlow);
    glow.rotation.y = -Math.PI / 2;
    glow.position.set(CX0(c + 1) - 0.05, 2.6, z);
    scene.add(glow);
    for (const side of [-1, 1]) part(scene, boxGeo(1.2, 7, 0.8), m.side.east, x + 1.5, 3.5, z + side * (C / 2 - 0.4));
  }
  {
    const [c, i] = caveAt('B');
    const [x, z] = cellXZ(c, i);
    const h = crossH(c, i - 1);
    part(scene, boxGeo(C, h - 6.5, C), m.side.north, x, 6.5 + (h - 6.5) / 2, z);
    crossPlane(scene, C, C, m.top.north, x, h + 0.01, z);
    for (const side of [-1, 1]) part(scene, boxGeo(0.9, 6.5, C), m.side.north, x + side * (C / 2 - 0.45), 3.25, z);
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(C - 1.8, 6.5), m.cave);
    mouth.position.set(x, 3.25, RZ0(i) + 0.02);
    scene.add(mouth);
    // The north cliff the cave is cut into, rising beyond the plateau's edge.
    for (let k = -6; k <= 6; k++) {
      const hh = 12 + rand() * 6 - Math.abs(k) * 0.6;
      part(scene, boxGeo(5.5, hh + 30, 6 + rand() * 4), m.side.north, x + k * 5, (hh - 30) / 2, -PD / 2 - 3.5 - rand() * 2).castShadow = false;
    }
  }
  // Blocky grey facets of the east cliff beyond the plateau's edge.
  for (let k = 0; k < 14; k++) {
    const z = RZ0(5) + k * 5 + rand() * 2;
    const hh = 15 + rand() * 9;
    part(scene, boxGeo(6 + rand() * 4, hh + 30, 5.5), m.side.east, PW / 2 + 3 + rand() * 3, (hh - 30) / 2, z).castShadow = false;
  }
  return scene;
}
