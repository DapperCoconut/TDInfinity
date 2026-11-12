// Shattered Court: the map renderer (shared pieces come from worldkit.js).

import * as THREE from 'three';
import { boxGeo, part } from './models.js';
import { mulberry32 } from './utils.js';
import { CASTLE, mapInfo } from './sim/map.js';
import { COURT_CARDS, COURT_CELL, COURT_CRYSTALS, COURT_GRID, courtCell, courtLight, courtTile } from './sim/maps.js';
import { TREES, lambert } from './worldkit.js';

/** Black starfield with faint red-magenta nebula clouds, mostly upper left and right. */
function courtSky() {
  const W = 1024;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#050508';
  g.fillRect(0, 0, W, H);
  const rand = mulberry32(4141);
  for (const cx of [W * 0.18, W * 0.68]) {
    for (let i = 0; i < 26; i++) {
      const x = cx + (rand() - 0.5) * W * 0.3;
      const y = H * (0.12 + rand() * 0.3);
      const r = 30 + rand() * 90;
      const cg = g.createRadialGradient(x, y, 0, x, y, r);
      cg.addColorStop(0, `rgba(90,16,48,${0.18 + rand() * 0.2})`);
      cg.addColorStop(1, 'rgba(90,16,48,0)');
      g.fillStyle = cg;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = `rgba(255,255,255,${0.3 + rand() * 0.7})`;
    const sz = rand() < 0.06 ? 2 : 1;
    g.fillRect(rand() * W, rand() * H, sz, sz);
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

/** A face-up playing card's texture: white with a few red or black pips. */
function cardFace(red) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 90;
  const g = c.getContext('2d');
  g.fillStyle = '#f2f2f2';
  g.fillRect(0, 0, 64, 90);
  g.fillStyle = red ? '#c83c3c' : '#1a1a1a';
  for (const [x, y] of [[16, 18], [48, 72], [32, 45]]) {
    g.beginPath();
    g.moveTo(x, y - 8);
    g.lineTo(x + 7, y);
    g.lineTo(x, y + 8);
    g.lineTo(x - 7, y);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let courtMats = null;
function courtMaterials() {
  if (courtMats) return courtMats;
  courtMats = {
    top: new THREE.MeshLambertMaterial({ color: 0xffffff }),
    slab: lambert(0x3a3a3a),
    violet: new THREE.MeshLambertMaterial({ color: 0xb040ff, emissive: 0xb040ff, emissiveIntensity: 0.8, flatShading: true }),
    ring: new THREE.MeshBasicMaterial({ color: 0xf0e8ff }),
    ringGlow: new THREE.MeshBasicMaterial({ color: 0xf0e8ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
    wall: lambert(0xd8d4d0),
    red: lambert(0x8c1c1c),
    grass: lambert(0x3c4a30, { flatShading: true }),
    rock: lambert(0x5a3e2a, { flatShading: true }),
    stone: lambert(0x8a8a8a, { flatShading: true }),
    cardBack: lambert(0xc83c3c),
    cardEdge: lambert(0xf2f2f2),
    faceRed: new THREE.MeshLambertMaterial({ map: cardFace(true) }),
    faceBlack: new THREE.MeshLambertMaterial({ map: cardFace(false) }),
    chip: lambert(0xb02a2a),
    arrow: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }),
  };
  return courtMats;
}

/** A grass-topped rock island floating with its top at height y. */
function courtIsland(parent, m, x, y, z, r) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  const top = part(g, new THREE.CylinderGeometry(r, r * 0.92, 1, 9), m.grass, 0, -0.5, 0);
  top.rotation.y = x * 0.1;
  const rock = part(g, new THREE.ConeGeometry(r * 0.92, r * 1.4, 9), m.rock, 0, -1 - r * 0.7, 0);
  rock.rotation.set(Math.PI, z * 0.1, 0);
  return g;
}

/** A round white tower with a red cone roof (cone) or red crenellations. */
function courtTower(parent, m, x, y, z, r, h, cone = true) {
  part(parent, new THREE.CylinderGeometry(r, r * 1.05, h, 12), m.wall, x, y + h / 2, z);
  // Arched red-framed windows.
  for (let k = 0; k < 2; k++) {
    const a = k * Math.PI + 0.6;
    const w = part(parent, boxGeo(0.5, 1.1, 0.2), m.red, x + Math.sin(a) * r, y + h * 0.65, z + Math.cos(a) * r);
    w.rotation.y = a;
  }
  if (cone) part(parent, new THREE.ConeGeometry(r * 1.3, r * 2.4, 12), m.red, x, y + h + r * 1.2, z);
  else {
    part(parent, new THREE.CylinderGeometry(r * 1.12, r * 1.12, 0.6, 12), m.red, x, y + h + 0.3, z);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      part(parent, boxGeo(0.5, 0.7, 0.5), m.red, x + Math.sin(a) * r, y + h + 0.95, z + Math.cos(a) * r);
    }
  }
}

/** A few dead trees on an island group. */
function courtTrees(g, m, spots) {
  for (const [x, z, s] of spots) TREES.dead(g, { x, z, s, rot: x * 1.7 + z }, m);
}

/**
 * Shattered Court, built from the spec grid (COURT_GRID): 550 checker tiles floating in a starry
 * void, this game's random route painted gold over them, the crystal portal in the north, the
 * castle on its own island in the south, a floating island in the big central hole, crystals and
 * card stacks on the tiles, outer islands and crumbling debris drifting around the edges.
 * When it is built the gold sweeps along the route from the portal to the castle (one tile every
 * 0.04 s), pulses twice, and the portal flashes: 3 seconds in all.
 */
export function buildCourt(parent, { oz = 0, versus = false } = {}) {
  const scene = new THREE.Group();
  scene.position.z = oz;
  parent.add(scene);
  const m = courtMaterials();
  const animated = [];
  const C = COURT_CELL;
  const G = COURT_GRID;
  if (!versus) scene.add(courtSky());

  // --- Tiles: a dark 1-unit slab under every tile and a coloured top face per tile.
  const tiles = [];
  G.forEach((line, i) => [...line].forEach((_, c) => courtTile(c, i) && tiles.push([c, i])));
  const slabs = new THREE.InstancedMesh(boxGeo(C, 0.9, C), m.slab, tiles.length);
  const tops = new THREE.InstancedMesh(boxGeo(C, 0.1, C), m.top, tiles.length);
  tops.receiveShadow = true;
  slabs.receiveShadow = true;
  const o = new THREE.Object3D();
  const LIGHT = new THREE.Color(0x9c9c9c);
  const DARK = new THREE.Color(0x4a4a4a);
  const GOLD = new THREE.Color(0xe8b04a);
  const BRIGHT = new THREE.Color(0xffd27a);
  const slot = new Map();
  tiles.forEach(([c, i], k) => {
    const [x, z] = courtCell(c, i + 1);
    o.position.set(x, -0.55, z);
    o.updateMatrix();
    slabs.setMatrixAt(k, o.matrix);
    o.position.set(x, -0.05, z);
    o.updateMatrix();
    tops.setMatrixAt(k, o.matrix);
    tops.setColorAt(k, courtLight(c, i) ? LIGHT : DARK);
    slot.set(`${c},${i}`, k);
  });
  scene.add(slabs, tops);
  // The neck cells beyond the grid's ends (the portal's T1 and the castle's T41): stone steps.
  for (const row of [1, 41]) {
    const [x, z] = courtCell(19, row);
    part(scene, boxGeo(C, 1, C), m.stone, x, -0.5, z).receiveShadow = true;
  }

  // --- This game's route: gold tops, a white arrow on every 4th tile.
  const route = mapInfo.tiles ?? [];
  const routeSlots = route.map(([c, i]) => slot.get(`${c},${i}`));
  const checker = route.map(([c, i]) => (courtLight(c, i) ? LIGHT : DARK));
  const arrows = [];
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 1.3).lineTo(1, 0.1).lineTo(0.4, 0.1).lineTo(0.4, -1.1).lineTo(-0.4, -1.1).lineTo(-0.4, 0.1).lineTo(-1, 0.1).lineTo(0, 1.3);
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  route.forEach(([c, i], k) => {
    if (k % 4 !== 3 || k + 1 >= route.length) return;
    const [nc, ni] = route[k + 1];
    const [x, z] = courtCell(c, i + 1);
    const a = new THREE.Mesh(arrowGeo, m.arrow);
    a.rotation.x = -Math.PI / 2;
    a.rotation.z = Math.atan2(-(nc - c), -(ni - i)); // shape +y points along the walk
    a.position.set(x, 0.03, z);
    a.visible = false;
    scene.add(a);
    arrows.push({ k, mesh: a });
  });

  // --- Spawn portal (north of T1): a white-glowing ring among magenta-violet crystals.
  const [px, pz] = courtCell(19, 1);
  const portal = new THREE.Group();
  portal.position.set(px, 0, pz - 2.5);
  scene.add(portal);
  courtIsland(portal, m, 0, -1, -1.5, 5);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.35, 10, 40), m.ring);
  ring.position.y = 4;
  portal.add(ring);
  const veil = new THREE.Mesh(new THREE.CircleGeometry(3, 32), m.ringGlow);
  veil.position.y = 4;
  portal.add(veil);
  const rand = mulberry32(777);
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2;
    const r = 3.6 + rand() * 1.6;
    const h = 1.5 + rand() * 3.5;
    const cr = part(portal, new THREE.OctahedronGeometry(0.7, 0), m.violet, Math.cos(a) * r, h / 2 - 0.4, Math.sin(a) * r * 0.6 - 1);
    cr.scale.set(1, h / 1.4, 1);
    cr.rotation.set(rand() * 0.5 - 0.25, rand() * 3, rand() * 0.5 - 0.25);
  }
  const portalLight = new THREE.PointLight(0xb040ff, 40, 30, 1.6);
  portalLight.position.set(0, 4, 1);
  portal.add(portalLight);

  // --- Castle (south of T41) on its own grass island: white walls with red trim, a gated front
  // with steps facing the path, and 8 round towers with red cone roofs.
  const castle = courtIsland(scene, m, CASTLE.x, 0, CASTLE.z, 15);
  const [, gz] = courtCell(19, 41);
  for (let k = 0; k < 3; k++) part(castle, boxGeo(5, 0.4, 1.2), m.wall, 0, 0.2 + k * 0.4, gz + 2.4 + k * 1.2 - CASTLE.z); // steps up from T41
  const WX = 9;
  const WZ = 8;
  part(castle, boxGeo(WX * 2, 6, 1), m.wall, 0, 3, -WZ).castShadow = true; // front wall
  part(castle, boxGeo(WX * 2, 6, 1), m.wall, 0, 3, WZ);
  part(castle, boxGeo(1, 6, WZ * 2), m.wall, -WX, 3, 0);
  part(castle, boxGeo(1, 6, WZ * 2), m.wall, WX, 3, 0);
  part(castle, boxGeo(WX * 2 + 0.2, 0.5, 1.2), m.red, 0, 6.2, -WZ); // red trim
  part(castle, boxGeo(4, 4.5, 0.4), m.red, 0, 2.25, -WZ - 0.6); // the gate
  part(castle, boxGeo(3.2, 3.8, 0.3), lambert(0x3e2a1c), 0, 1.9, -WZ - 0.8);
  part(castle, boxGeo(10, 9, 8), m.wall, 0, 4.5, 1); // the keep
  part(castle, boxGeo(10.2, 0.5, 8.2), m.red, 0, 9.2, 1);
  for (const [tx, tz, r, h] of [[-WX, -WZ, 1.6, 11], [WX, -WZ, 1.6, 11], [-WX, WZ, 1.6, 10], [WX, WZ, 1.6, 10], [-3.5, -WZ, 1.2, 8.5], [3.5, -WZ, 1.2, 8.5], [-2.5, 2, 1.8, 17], [3, 3, 1.4, 14]]) {
    courtTower(castle, m, tx, 0, tz, r, h, true);
  }

  // --- Central island in the big hole (R13-X19), a little below the tiles.
  const [hx] = courtCell(20, 16);
  const [, hz] = courtCell(20, 16);
  const mid = courtIsland(scene, m, hx, -2.5, hz, 9.5);
  courtTower(mid, m, 0, 0, 0, 2, 5, false);
  courtTrees(mid, m, [[-5, -4, 0.8], [5, 3, 0.7], [-3, 5, 0.6]]);

  // --- Violet crystal clusters standing on tiles.
  for (const [c, i] of COURT_CRYSTALS) {
    const [x, z] = courtCell(c, i + 1);
    for (let k = 0; k < 4; k++) {
      const h = (k === 0 ? 4.5 : 2 + rand() * 1.8);
      const cr = part(scene, new THREE.OctahedronGeometry(0.6, 0), m.violet, x + (k ? (rand() - 0.5) * 2.2 : 0), h / 2, z + (k ? (rand() - 0.5) * 2.2 : 0));
      cr.scale.set(1, h / 1.2, 1);
      cr.rotation.set((rand() - 0.5) * 0.5, rand() * 3, (rand() - 0.5) * 0.5);
    }
  }

  // --- Card stacks: leaning towers of red-backed cards, with loose face-up cards around them.
  const cardGeo = boxGeo(1.3, 0.06, 1.85);
  for (const [c, i] of COURT_CARDS) {
    const [x, z] = courtCell(c, i + 1);
    const stack = new THREE.Group();
    stack.position.set(x, 0, z);
    stack.rotation.y = rand() * Math.PI;
    scene.add(stack);
    const levels = 3 + Math.floor(rand() * 3); // up to ~6 units tall
    for (let l = 0; l < levels; l++) {
      const y = l * 1.25;
      const lean = l * 0.12;
      for (const side of [-1, 1]) {
        const card = part(stack, cardGeo, m.cardBack, side * 0.42 + lean, y + 0.85, 0);
        card.rotation.set(Math.PI / 2, 0, side * 0.32);
      }
      part(stack, cardGeo, m.cardEdge, lean, y + 1.75, 0); // the flat card on top of each floor
    }
  }
  // Loose cards lying flat: around the east stacks and the north-west one.
  for (const [cx, ci, n] of [[30, 18, 9], [13, 5, 4]]) {
    for (let k = 0; k < n; k++) {
      const c = cx + Math.round((rand() - 0.5) * 4);
      const i = ci + Math.round((rand() - 0.5) * 4);
      if (!courtTile(c, i)) continue;
      const [x, z] = courtCell(c, i + 1);
      const card = part(scene, new THREE.PlaneGeometry(1.3, 1.85), rand() < 0.5 ? m.faceRed : m.faceBlack, x + (rand() - 0.5) * 2, 0.02 + k * 0.002, z + (rand() - 0.5) * 2);
      card.rotation.set(-Math.PI / 2, 0, rand() * Math.PI);
      card.castShadow = false;
    }
  }

  // --- Outer floating islands, each with a small white tower and dead trees.
  [[-92, -52, 8, true], [-98, 22, 9, false], [-64, 78, 7, true], [70, 66, 8, false], [100, -6, 9, true], [76, -64, 7, true]].forEach(([x, z, r, cone], k) => {
    const isl = courtIsland(scene, m, x, -3 - (k % 3) * 2.5, z, r);
    courtTower(isl, m, 0, 0, 0, 1.4, 5 + (k % 2) * 2, cone);
    courtTrees(isl, m, [[r * 0.5, r * 0.3, 0.6], [-r * 0.45, -r * 0.4, 0.5]]);
    animated.push((t) => (isl.position.y = -3 - (k % 3) * 2.5 + Math.sin(t * 0.4 + k) * 0.5));
  });

  // --- Floating debris along the floor edge: loose grey cubes, as if the floor were crumbling.
  const debris = [];
  G.forEach((line, i) => [...line].forEach((_, c) => {
    if (courtTile(c, i)) return;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, di]) => courtTile(c + dc, i + di));
    if (!edge || rand() > 0.13 || i === 0 || i === 40) return;
    const [x, z] = courtCell(c, i + 1);
    const sz = 0.8 + rand() * 2.6;
    const cube = part(scene, boxGeo(sz, sz, sz), m.stone, x + (rand() - 0.5) * 2, -1 - rand() * 4, z + (rand() - 0.5) * 2);
    cube.rotation.set(rand(), rand(), rand());
    debris.push({ cube, y: cube.position.y, p: rand() * 6 });
  }));
  // A white pillar piece to the north-west; red poker chips and cones drifting west and north-east.
  const pillar = part(scene, new THREE.CylinderGeometry(1.6, 1.6, 9, 14), m.wall, -70, -2, -66);
  pillar.rotation.set(0.5, 0, 0.35);
  debris.push({ cube: pillar, y: -2, p: 1 });
  for (const [bx, bz] of [[-92, -10], [-90, 40], [84, -52], [94, -32]]) {
    for (let k = 0; k < 4; k++) {
      const chip = rand() < 0.6;
      const mesh = part(scene, chip ? new THREE.CylinderGeometry(1.1, 1.1, 0.3, 18) : new THREE.ConeGeometry(0.9, 2, 12), chip ? m.chip : m.red, bx + (rand() - 0.5) * 14, -1 - rand() * 5, bz + (rand() - 0.5) * 14);
      mesh.rotation.set(rand() * 2, rand() * 3, rand() * 2);
      debris.push({ cube: mesh, y: mesh.position.y, p: rand() * 6 });
    }
  }
  animated.push((t) => {
    for (const d of debris) {
      d.cube.position.y = d.y + Math.sin(t * 0.6 + d.p) * 0.35;
      d.cube.rotation.y += 0.002;
    }
  });

  // --- Telegraph: the gold sweeps from T2 to T40, the whole route pulses twice, the portal flashes.
  let t0 = null;
  const STEP = 0.04;
  const TOTAL = 3;
  const sweepEnd = route.length * STEP;
  const tmp = new THREE.Color();
  let done = false;
  animated.push((t) => {
    t0 ??= t;
    const e = t - t0;
    veil.material.opacity = 0.3 + Math.sin(t * 2) * 0.08;
    ring.rotation.z = t * 0.3;
    if (done) return;
    const lit = Math.min(route.length, Math.floor(e / STEP) + 1);
    const pulseT = Math.max(0, e - sweepEnd);
    const pulseLen = Math.max(0.01, TOTAL - sweepEnd - 0.05);
    const pulse = e > sweepEnd ? Math.abs(Math.sin(Math.min(1, pulseT / pulseLen) * Math.PI * 2)) : 0; // two bright humps
    tmp.copy(GOLD).lerp(BRIGHT, pulse);
    routeSlots.forEach((k, n) => k != null && tops.setColorAt(k, n < lit ? tmp : checker[n]));
    tops.instanceColor.needsUpdate = true;
    for (const a of arrows) a.mesh.visible = a.k < lit;
    const flash = e > TOTAL - 0.5 && e < TOTAL;
    portalLight.intensity = flash ? 140 : 40;
    m.ring.color.set(flash ? 0xffffff : 0xf0e8ff);
    veil.material.opacity = flash ? 0.85 : veil.material.opacity;
    if (e >= TOTAL) {
      done = true;
      portalLight.intensity = 40;
      routeSlots.forEach((k) => k != null && tops.setColorAt(k, GOLD));
      tops.instanceColor.needsUpdate = true;
    }
  });
  scene.userData.tick = (t) => animated.forEach((f) => f(t));
  // Last Laugh contract: the board is open and the route changes (ids: col + row index * 40).
  scene.userData.setRoute = (ids) => {
    done = true;
    tiles.forEach(([c, i], k) => tops.setColorAt(k, courtLight(c, i) ? LIGHT : DARK));
    for (const id of ids) {
      const k = slot.get(`${id % 40},${Math.floor(id / 40)}`);
      if (k != null) tops.setColorAt(k, GOLD);
    }
    tops.instanceColor.needsUpdate = true;
    for (const a of arrows) a.mesh.visible = false;
  };
  return scene;
}
