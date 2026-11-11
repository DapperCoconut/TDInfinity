// Twilight Nexus: the map renderer (shared pieces come from worldkit.js).

import * as THREE from 'three';
import { boxGeo, part } from './models.js';
import { mulberry32 } from './utils.js';
import { PATH_WIDTH, path } from './sim/path.js';
import { MAP } from './sim/map.js';
import { NEXUS_CELL, NEXUS_DECK, NEXUS_GRID, NEXUS_PLATFORM } from './sim/maps.js';
import { canvasTex, floorPlane, instanced, lambert } from './worldkit.js';

let nexusMats = null;
/** Twilight Nexus materials (one texture repeat = one grid cell), made once. */
function nexusMaterials() {
  if (nexusMats) return nexusMats;
  // Deck floor plates: dark blue-grey metal panels with fine seams.
  const plate = canvasTex(128, (g, s) => {
    g.fillStyle = '#2c3a55';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#212c43';
    g.lineWidth = 2;
    g.strokeRect(1, 1, s - 2, s - 2);
    g.beginPath();
    g.moveTo(s / 2, 0);
    g.lineTo(s / 2, s);
    g.stroke();
    g.fillStyle = '#3a4868';
    for (const [x, y] of [[6, 6], [s - 6, 6], [6, s - 6], [s - 6, s - 6]]) g.fillRect(x - 1.5, y - 1.5, 3, 3);
  });
  // Placement slabs: lighter grey-blue with a raised stud / rivet pattern.
  const stud = canvasTex(128, (g, s) => {
    g.fillStyle = '#4a5a78';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#3c4a66';
    g.lineWidth = 2;
    g.strokeRect(1, 1, s - 2, s - 2);
    const n = 4;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = (i + 0.5) * (s / n);
        const y = (j + 0.5) * (s / n);
        g.fillStyle = '#36435d';
        g.beginPath();
        g.arc(x + 1.5, y + 1.5, 6, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#62739a';
        g.beginPath();
        g.arc(x, y, 6, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#7686ab';
        g.beginPath();
        g.arc(x - 1.5, y - 1.5, 2.5, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
  // Path ring and spine: smooth dark navy.
  const road = canvasTex(64, (g, s) => {
    g.fillStyle = '#1c2740';
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#202c48';
    g.fillRect(0, 0, s, 2);
  });
  // Central platform: near-black blue tiles in a grid with small glowing dots at the corners.
  const tiles = canvasTex(128, (g, s) => {
    g.fillStyle = '#121a2e';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#1e2a46';
    g.lineWidth = 2;
    for (let k = 0; k <= 2; k++) {
      g.beginPath();
      g.moveTo((k * s) / 2, 0);
      g.lineTo((k * s) / 2, s);
      g.moveTo(0, (k * s) / 2);
      g.lineTo(s, (k * s) / 2);
      g.stroke();
    }
    g.fillStyle = '#8fb4ff';
    for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) {
      g.beginPath();
      g.arc((i * s) / 2, (j * s) / 2, 3, 0, Math.PI * 2);
      g.fill();
    }
  });
  // Lower floor: darker plates with cross-braced metal truss panels.
  const truss = canvasTex(128, (g, s) => {
    g.fillStyle = '#262d3d';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#3a4152';
    g.lineWidth = 7;
    g.strokeRect(6, 6, s - 12, s - 12);
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(10, 10);
    g.lineTo(s - 10, s - 10);
    g.moveTo(s - 10, 10);
    g.lineTo(10, s - 10);
    g.stroke();
    g.fillStyle = '#4b5468';
    for (const [x, y] of [[8, 8], [s - 8, 8], [8, s - 8], [s - 8, s - 8], [s / 2, s / 2]]) g.fillRect(x - 3, y - 3, 6, 6);
  });
  const lambertMap = (map, extra) => new THREE.MeshLambertMaterial({ map, ...extra });
  const basic = (color, extra) => new THREE.MeshBasicMaterial({ color, ...extra });
  nexusMats = {
    plate: lambertMap(plate),
    stud: lambertMap(stud),
    road: lambertMap(road),
    tiles: lambertMap(tiles, { emissive: 0x070b16 }),
    truss: lambertMap(truss),
    side: lambert(0x222c42),
    under: lambert(0x161d2e),
    lowerSide: lambert(0x2a3040),
    bridge: new THREE.MeshLambertMaterial({ color: 0x6a86ff, emissive: 0x4a64e0, transparent: true, opacity: 0.55, depthWrite: false }),
    neon: basic(0x6a86ff),
    cyan: basic(0x5fe6ff),
    blade: basic(0xbfefff, { side: THREE.DoubleSide }),
    pillar: lambert(0x2a2d38),
    pillarBand: lambert(0x1c1e27),
    stripW: basic(0xf0f4ff),
    stripB: basic(0x5a6cff),
    violet: basic(0x9a6cff),
    lamp: basic(0xffffff),
    beam: basic(0xa8c8ff, { transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    dot: basic(0x8fb4ff),
    box: lambert(0x5a6070),
    boxDark: lambert(0x3c414e),
    water: new THREE.MeshLambertMaterial({ color: 0x050a1e, emissive: 0x02040c }),
    exit: basic(0x5fe6ff, { transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }),
  };
  return nexusMats;
}

/** Night sky: deep purple-navy with stars and purple clouds, brightest towards the west horizon. */
function nexusSky() {
  const W = 1024;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#07061a');
  grad.addColorStop(0.3, '#121032');
  grad.addColorStop(0.47, '#2a2650');
  grad.addColorStop(0.5, '#4b5378');
  grad.addColorStop(0.56, '#1a1838');
  grad.addColorStop(1, '#050a1e');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // A pale blue-grey glow along one stretch of the horizon.
  const glow = g.createRadialGradient(W * 0.75, H * 0.5, 10, W * 0.75, H * 0.5, W * 0.3);
  glow.addColorStop(0, 'rgba(142,157,184,0.85)');
  glow.addColorStop(1, 'rgba(142,157,184,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  const rand = mulberry32(9090);
  // Purple clouds.
  for (let i = 0; i < 70; i++) {
    const x = rand() * W;
    const y = H * (0.18 + rand() * 0.28);
    const r = 30 + rand() * 90;
    const cg = g.createRadialGradient(x, y, 0, x, y, r);
    cg.addColorStop(0, `rgba(${110 + rand() * 50},${60 + rand() * 30},${170 + rand() * 50},${0.12 + rand() * 0.14})`);
    cg.addColorStop(1, 'rgba(90,50,150,0)');
    g.fillStyle = cg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Stars.
  for (let i = 0; i < 700; i++) {
    const y = rand() * H * 0.47;
    g.fillStyle = `rgba(255,255,255,${0.35 + rand() * 0.65})`;
    const s = rand() < 0.08 ? 2 : 1;
    g.fillRect(rand() * W, y, s, s);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1500, 48, 24),
    new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  dome.renderOrder = -10;
  return dome;
}

/** The swirling portal: a glowing cyan core in a ring of curved white-blue spiral blades. Faces +x. */
function nexusPortal(parent, m, x, y, z, animated) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = Math.PI / 2; // the disc stands across the bridge
  parent.add(g);
  const core = new THREE.Mesh(new THREE.CircleGeometry(3.4, 32), m.cyan);
  g.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.35, 8, 40), m.blade);
  g.add(ring);
  const blades = new THREE.Group();
  g.add(blades);
  for (let i = 0; i < 10; i++) {
    // A curved blade: a thin arc of torus, swept from the core out to the ring.
    const b = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.18, 4, 12, Math.PI * 0.8), m.blade);
    const a = (i / 10) * Math.PI * 2;
    b.position.set(Math.cos(a) * 2.6, Math.sin(a) * 2.6, 0.05);
    b.rotation.z = a + Math.PI * 0.6;
    blades.add(b);
  }
  const light = new THREE.PointLight(0x5fe6ff, 60, 30, 1.2);
  g.add(light);
  animated.push((t) => {
    blades.rotation.z = t * 1.4;
    core.scale.setScalar(1 + Math.sin(t * 3) * 0.05);
  });
}

/** A corner pillar: a tall dark square tower in stacked segments with columns of light strips and a violet-ringed cap. */
function nexusPillar(parent, m, x, z, toward) {
  const base = -36;
  const top = 44;
  const seg = 8;
  const white = [];
  const blue = [];
  for (let y = base; y < top; y += seg) {
    part(parent, boxGeo(4, seg - 0.5, 4), m.pillar, x, y + seg / 2, z);
    part(parent, boxGeo(4.3, 0.5, 4.3), m.pillarBand, x, y + seg - 0.25, z);
    for (let k = 0; k < 6; k++) {
      const sy = y + 1 + k * 1.15;
      for (const [dx, dz, ry] of [[2.02, 0, Math.PI / 2], [-2.02, 0, Math.PI / 2], [0, 2.02, 0], [0, -2.02, 0]]) {
        for (const side of [-0.9, 0.9]) {
          const ox = dz ? side : 0;
          const oz = dx ? side : 0;
          ((k + (side > 0 ? 1 : 0)) % 2 ? blue : white).push([x + dx + ox, sy, z + dz + oz, ry]);
        }
      }
    }
  }
  const stripGeo = boxGeo(1.1, 0.22, 0.08);
  instanced(parent, stripGeo, m.stripW, white);
  instanced(parent, stripGeo, m.stripB, blue);
  // Flared cap with a violet neon ring, and the octagonal ring outline on top.
  const cap = part(parent, new THREE.CylinderGeometry(4.4, 2.9, 3, 4, 1), m.pillar, x, top + 1.5, z);
  cap.rotation.y = Math.PI / 4;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.22, 4, 4), m.violet);
  ring.rotation.set(Math.PI / 2, 0, Math.PI / 4);
  ring.position.set(x, top + 0.4, z);
  parent.add(ring);
  const oct = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.2, 4, 8), m.violet);
  oct.rotation.x = Math.PI / 2;
  oct.position.set(x, top + 3.1, z);
  parent.add(oct);
  // A thin strut from the pillar to the deck corner.
  const [tx, tz] = toward;
  const dx = tx - x;
  const dz = tz - z;
  const dy = NEXUS_DECK - (top - 4);
  const len = Math.hypot(dx, dy, dz);
  const strut = new THREE.Mesh(boxGeo(0.35, 0.35, len), m.pillarBand);
  strut.position.set(x + dx / 2, top - 4 + dy / 2, z + dz / 2);
  strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(dx, dy, dz).normalize());
  parent.add(strut);
  const light = new THREE.PointLight(0x9a6cff, 40, 26, 1.2);
  light.position.set(x, top + 2, z);
  parent.add(light);
}

/** One lane piece off the deck: a strip of floor under the lane (sloped for ramps) with neon edges. */
function nexusLaneStrip(parent, m, a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const dy = b.y - a.y;
  const flat = Math.hypot(dx, dz);
  const sloped = Math.abs(dy) > 0.01;
  const len = Math.hypot(flat, dy) + (sloped ? 0 : PATH_WIDTH);
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';
  g.rotation.y = Math.atan2(dx, dz);
  g.rotation.x = Math.atan2(-dy, flat);
  g.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  parent.add(g);
  const w = PATH_WIDTH + 0.8;
  if (a.y > 0.5 || b.y > 0.5) {
    // A ramp or landing: a solid deck under the lane.
    part(g, boxGeo(w + 0.6, 0.8, len), m.side, 0, -0.42, 0);
  }
  part(g, boxGeo(w, 0.1, len), m.road, 0, 0.03, 0).castShadow = false;
  for (const side of [-1, 1]) part(g, boxGeo(0.18, 0.16, len), m.neon, side * (w / 2), 0.08, 0).castShadow = false;
  if (sloped) {
    // Legs down to the lower floor along its low half.
    for (const f of [-0.3, 0, 0.3]) {
      const h = (a.y + b.y) / 2 + f * dy;
      if (h < 1.5) continue;
      for (const side of [-1, 1]) {
        part(parent, boxGeo(0.6, h - 0.8, 0.6), m.pillarBand, (a.x + b.x) / 2 + (dx / flat) * f * flat + side * (-dz / flat) * (w / 2 - 0.4), (h - 0.8) / 2, (a.z + b.z) / 2 + (dz / flat) * f * flat + side * (dx / flat) * (w / 2 - 0.4));
      }
    }
  }
}

/**
 * Twilight Nexus, built from the spec grid (NEXUS_GRID): a two-floor deck over a dark sea at night.
 * The upper deck (o slabs, # path) stands 10 high, the central platform 12, the lower floor 0.
 */
export function buildNexus(parent, { oz = 0, versus = false } = {}) {
  const scene = new THREE.Group();
  scene.position.z = oz;
  parent.add(scene);
  const m = nexusMaterials();
  const animated = [];
  const C = NEXUS_CELL;
  const D = NEXUS_DECK;
  const P = NEXUS_PLATFORM;
  const G = NEXUS_GRID;
  const cx0 = (c) => (c - 15) * C; // west edge of column c (0 = A)
  const rz0 = (i) => (i - 10) * C; // north edge of row index i (0 = row 1)
  const ch = (c, i) => G[i]?.[c] ?? '~';
  const isUpper = (k) => 'o#=SPE'.includes(k);
  const isPlat = (k) => k === 'P' || k === 'E';

  if (!versus) scene.add(nexusSky());
  // Very dark water far below, fading into the fog.
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1000), m.water);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -40;
  scene.add(water);

  // --- Lower floor: the deck's whole footprint (H-W, rows 3-18), cross-braced truss panels.
  const lx0 = cx0(7);
  const lx1 = cx0(23);
  const lz0 = rz0(2);
  const lz1 = rz0(18);
  floorPlane(scene, lx1 - lx0, lz1 - lz0, m.truss, (lx0 + lx1) / 2, 0, (lz0 + lz1) / 2);
  part(scene, boxGeo(lx1 - lx0, 3, lz1 - lz0), m.lowerSide, (lx0 + lx1) / 2, -1.52, (lz0 + lz1) / 2);

  // --- Upper deck, one box per run of same-kind cells in a row.
  const supports = [];
  const rimDots = [];
  G.forEach((line, i) => {
    let c = 0;
    while (c < line.length) {
      const k = line[c];
      const kind = isPlat(k) ? 'P' : k;
      let e = c;
      while (e + 1 < line.length && (isPlat(line[e + 1]) ? 'P' : line[e + 1]) === kind) e++;
      const x0 = cx0(c);
      const x1 = cx0(e + 1);
      const w = x1 - x0;
      const x = (x0 + x1) / 2;
      const z = rz0(i) + C / 2;
      if (kind === 'o') {
        part(scene, boxGeo(w, 1, C), m.side, x, D - 0.5, z);
        floorPlane(scene, w, C, m.plate, x, D + 0.005, z);
        floorPlane(scene, w - 0.8, C - 0.8, m.stud, x, D + 0.12, z); // the raised stud slab
      } else if (kind === '#') {
        part(scene, boxGeo(w, 1, C), m.side, x, D - 0.6, z);
        floorPlane(scene, w, C, m.road, x, D - 0.1, z); // slightly sunken
      } else if (kind === 'P') {
        part(scene, boxGeo(w, P - D + 1.2, C), m.under, x, (P + D - 1.2) / 2, z);
        floorPlane(scene, w, C, m.tiles, x, P + 0.005, z);
      } else if (kind === '=' || kind === 'S') {
        // Glowing see-through bridge (and the pad under each portal).
        const mesh = part(scene, boxGeo(w, 0.6, C), m.bridge, x, D - 0.3, z);
        mesh.castShadow = false;
        mesh.renderOrder = 2;
      }
      // Supports under the upper deck where the lower floor is (not under the bridges).
      if (kind === 'o' || kind === '#') for (let cc = c; cc <= e + 1; cc++) {
        const sx = cx0(cc);
        if (sx > lx0 && sx < lx1 && rz0(i) > lz0 && (cc === c || cc === e + 1 || (cc - c) % 2 === 0)) supports.push([sx, (D - 1) / 2, rz0(i)]);
      }
      c = e + 1;
    }
  });
  instanced(scene, boxGeo(0.7, D - 1, 0.7), m.pillarBand, supports);

  // Neon rims and marker lights along every upper-deck edge that drops away (to the void or the
  // open lower floor), and the glowing bridge rails.
  const rimMat = m.neon;
  G.forEach((line, i) => {
    for (let c = 0; c < line.length; c++) {
      const k = line[c];
      if (!isUpper(k)) continue;
      const top = isPlat(k) ? P : D;
      for (const [dc, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = ch(c + dc, i + di);
        if (isUpper(n)) continue;
        const ex = cx0(c) + C / 2 + (dc * C) / 2;
        const ez = rz0(i) + C / 2 + (di * C) / 2;
        if (path.distanceTo(ex, ez) < 2.5) continue; // a lane runs off the deck here (onto a ramp)
        const along = di !== 0; // the edge runs along x
        const bridge = k === '=' || k === 'S';
        const rail = part(scene, boxGeo(along ? C : 0.2, bridge ? 0.5 : 0.18, along ? 0.2 : C), rimMat, ex, top + (bridge ? 0.25 : 0.02), ez);
        rail.castShadow = false;
        if (!bridge) for (const f of [-0.5, 0]) rimDots.push([ex + (along ? f * C : 0), top + 0.2, ez + (along ? 0 : f * C)]);
      }
    }
  });
  instanced(scene, new THREE.SphereGeometry(0.22, 8, 6), m.dot, rimDots);

  // --- Lanes off the upper deck: the lower floor, the open deck edges and the ramps down.
  const upperAt = (x, z) => isUpper(ch(Math.floor(x / C + 15), Math.floor(z / C + 10)));
  for (const r of path.routes) {
    for (const s of r.segs) {
      const onDeck = s.a.y >= D - 0.01 && s.b.y >= D - 0.01 && [0, 0.25, 0.5, 0.75, 1].every((f) => upperAt(s.a.x + (s.b.x - s.a.x) * f, s.a.z + (s.b.z - s.a.z) * f));
      if (!onDeck) nexusLaneStrip(scene, m, s.a, s.b);
    }
  }

  // --- Exits: glowing gates on the lower floor under the central platform, and their hatches on top.
  const exits = new Map();
  for (const r of path.routes) {
    const e = r.points[r.points.length - 1];
    const prev = r.points[r.points.length - 2];
    const dir = Math.sign(e.x - prev.x);
    const key = `${e.x}`;
    if (!exits.has(key)) exits.set(key, { x: e.x + dir * 2.6, zs: [], dir });
    exits.get(key).zs.push(e.z);
  }
  for (const ex of exits.values()) {
    const z = ex.zs.reduce((a, b) => a + b, 0) / ex.zs.length;
    const span = Math.max(...ex.zs) - Math.min(...ex.zs) + C;
    const gate = new THREE.Mesh(new THREE.PlaneGeometry(span, D - 1.5), m.exit);
    gate.rotation.y = Math.PI / 2;
    gate.position.set(ex.x, (D - 1.5) / 2, z);
    scene.add(gate);
    for (const side of [-1, 1]) part(scene, boxGeo(0.5, D - 1, 0.5), m.cyan, ex.x, (D - 1) / 2, z + (side * span) / 2).castShadow = false;
    part(scene, boxGeo(0.5, 0.5, span), m.cyan, ex.x, D - 1.25, z).castShadow = false;
    for (const ez of ex.zs) {
      // The exit cell's hatch on the platform top.
      const hatch = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.1, 4), m.cyan);
      hatch.rotation.set(-Math.PI / 2, 0, Math.PI / 4);
      hatch.position.set(ex.x - ex.dir * 2.6, P + 0.03, ez);
      scene.add(hatch);
    }
    const light = new THREE.PointLight(0x5fe6ff, 50, 24, 1.2);
    light.position.set(ex.x, 4, z);
    scene.add(light);
  }

  // --- Portals at the outer end of each bridge.
  G.forEach((line, i) => {
    for (let c = 0; c < line.length; c++) {
      if (line[c] !== 'S' || G[i - 1]?.[c] === 'S') continue;
      let n = 1;
      while (G[i + n]?.[c] === 'S') n++;
      nexusPortal(scene, m, cx0(c) + C / 2, D + 5.6, rz0(i) + (n * C) / 2, animated);
    }
  });

  // --- Corner pillars, each linked by a strut to its nearest deck corner.
  G.forEach((line, i) => {
    for (let c = 0; c < line.length; c++) {
      if (line[c] !== 'O') continue;
      const x = cx0(c) + C / 2;
      const z = rz0(i) + C / 2;
      nexusPillar(scene, m, x, z, [x < 0 ? lx0 : lx1, z < 0 ? lz0 : lz1]);
    }
  });

  // --- Floor lamps: small round white lamps where slabs meet the path or the deck edge, each
  // throwing a short upward cone of pale blue light.
  const lamps = [];
  G.forEach((line, i) => {
    for (let c = 0; c < line.length; c++) {
      if (line[c] !== 'o') continue;
      for (const [dc, di] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = ch(c + dc, i + di);
        if (n !== '#' && n !== '_') continue;
        if ((c + i) % 2) continue; // every other cell along the edge
        lamps.push([cx0(c) + C / 2 + dc * (C / 2 - 0.7) + di * (C / 2 - 0.7), D + 0.12, rz0(i) + C / 2 + di * (C / 2 - 0.7) + dc * (C / 2 - 0.7)]);
        break;
      }
    }
  });
  instanced(scene, new THREE.CylinderGeometry(0.35, 0.4, 0.2, 12), m.lamp, lamps.map(([x, y, z]) => [x, y + 0.1, z]));
  instanced(scene, new THREE.CylinderGeometry(0.9, 0.3, 3, 14, 1, true), m.beam, lamps.map(([x, y, z]) => [x, y + 1.7, z]));

  // --- Small machinery on the deck, and cyan light posts on the lower floor near the centre.
  for (const p of MAP.props) {
    if (p.kind === 'nxBox') {
      part(scene, boxGeo(2, 2, 2), m.box, p.x, D + 1.12, p.z);
      part(scene, boxGeo(2.1, 0.3, 2.1), m.boxDark, p.x, D + 1.6, p.z);
      part(scene, boxGeo(0.6, 0.2, 0.08), m.cyan, p.x, D + 1.3, p.z + 1.02).castShadow = false;
    } else if (p.kind === 'nxPost') {
      part(scene, boxGeo(1, 6, 1), m.cyan, p.x, 3, p.z).castShadow = false;
    }
  }

  // Soft blue glow over each bridge.
  for (const sx of [-1, 1]) {
    const l = new THREE.PointLight(0x6a86ff, 40, 30, 1.2);
    l.position.set(sx * 54, D + 4, 0);
    scene.add(l);
  }
  if (animated.length) scene.userData.tick = (t) => animated.forEach((f) => f(t));
  return scene;
}
