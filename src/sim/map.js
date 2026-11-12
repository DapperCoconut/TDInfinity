// Shared map layout: deterministic decoration placement + tower placement rules.
// Both the server (validation) and client (rendering) use this, so they always agree.
import { mulberry32 } from '../utils.js';
import { BOUNDS, PATH_WIDTH, PLAYER_SPAWN, path, setMapPath } from './path.js';
import { CROSS_CELL, CROSS_GRID, crossCell, crossCh, crossH, crossIdx, crossKind } from './maps.js';
import { DEFAULT_MAP, NEXUS_CELL, NEXUS_DECK, NEXUS_GRID, NEXUS_PLATFORM, baseKey, mapDef, mapKeyOf, nexusAt, seedOf, seededDef } from './maps.js';
import { COURT_CARDS, COURT_CRYSTALS, COURT_NOBUILD, courtCell, courtIdx, courtTile } from './maps.js';
import { EMBER_CELL, EMBER_GRID, EMBER_POOLS, EMBER_VOLCANO, emberCell, emberCh, emberIdx } from './maps.js';
import { RAMPART_CELL, RAMPART_GRID, RAMPART_WALL, rampartCell, rampartCh, rampartH, rampartIdx, rampartKind } from './maps.js';
import { RIG_CELL, RIG_GRID, rigCell, rigCh, rigH, rigIdx, rigKind } from './maps.js';
import { BROOK_BOULDER, BROOK_CELL, BROOK_GRID, BROOK_PILLAR, BROOK_ROCKS, brookCell, brookCh, brookH, brookIdx, brookKind, brookRock } from './maps.js';

// Everything below describes the current map and is swapped in place by setMap (so modules that
// imported these objects keep seeing the current map).
export const CASTLE = { x: 0, z: 0 };

// Versus: each player's map is a copy of this one, LANE_SPACING further along +Z.
// Lanes are joined by bridges at x = BRIDGE_X running across the gap between them.
export const LANE_SPACING = 200;
export const BRIDGE_X = 8;
export const BRIDGE_WIDTH = 7;
export const laneOz = (lane) => lane * LANE_SPACING;
/** Which lane a world z is on (always 0 outside Versus). */
export const laneOf = (z) => Math.round(z / LANE_SPACING);
/** A world z folded back onto lane 0's map. */
export const foldZ = (z) => z - laneOf(z) * LANE_SPACING;

// Raised rocky plateaus. Cliff towers (Railgunner) can only go on top of these;
// ground towers can't. Hand-placed per map in open spots with a good view of the path.
export const CLIFFS = [];
// Water pools right next to the track. Water towers (Patrol Boat) can only go in these;
// nothing else can, and no trees or rocks grow in them.
export const POOLS = [];
const POOL_INSET = 1.5; // a boat's center must be this far inside the shoreline

/** The water pool at (x, z), if any (map-local coordinates). */
export function poolAt(x, z) {
  if (path.time) return null;
  return POOLS.find((p) => Math.hypot(x - p.x, z - p.z) < p.r) ?? null;
}

/** Why a tower with this placement can't go somewhere (for error toasts). */
export function placeFail(def, article = '') {
  const name = article ? `${article} ${def.name}` : def.name;
  if (def.placement === 'cliff') return `${name} can only go on top of a cliff!`;
  if (def.placement === 'water') return `${name} can only go in water!`;
  return "Can't place there!";
}

// Towers are drawn TOWER_SIZE x their model size (see src/scale.js), so their footprint grows too.
const TOWER_SIZE = 1; // keep equal to MODEL_SCALE
const CLIFF_INSET = 2.1 * TOWER_SIZE; // a tower's center must be this far inside the cliff edge

// Raised flat tops (mesas, roofs, rock blocks, the Night 3 hill): colliders marked `top` in
// MAP.colliders. They work like cliffs: cliff towers go on them, ground towers can't.
const TOP_INSET = 1.4; // a tower's center must be this far inside a top's edge

/** Is (x, z) inside collider o's footprint, `pad` in from its edge? */
function inside(o, x, z, pad = 0) {
  if (o.hx !== undefined) return Math.abs(x - o.x) <= o.hx - pad && Math.abs(z - o.z) <= o.hz - pad;
  return Math.hypot(x - o.x, z - o.z) <= o.r - pad;
}

/** The highest raised top at (x, z), if any (map-local coordinates). */
export function topAt(x, z) {
  if (path.time || !MAP.tops) return null;
  let best = null;
  for (const t of MAP.tops) if (t.h > (best?.h ?? -Infinity) && inside(t, x, z)) best = t;
  return best;
}

/** May a cliff tower stand at (x, z) on top `t`? Whole footprint on it, nothing taller standing there. */
function topFits(t, x, z) {
  if (!inside(t, x, z, TOP_INSET)) return false;
  if (x < BOUNDS.minX + 2 || x > BOUNDS.maxX - 2 || z < BOUNDS.minZ + 2 || z > BOUNDS.maxZ - 2) return false;
  const r = 1.6 * TOWER_SIZE;
  return !MAP.colliders.some((o) => !o.top && o.h > t.h + 0.5 && (o.hx !== undefined
    ? Math.hypot(Math.max(0, Math.abs(x - o.x) - o.hx), Math.max(0, Math.abs(z - o.z) - o.hz)) < r
    : Math.hypot(x - o.x, z - o.z) < o.r + r));
}

/** Twilight Nexus: the raised central platform (P and E cells) is a cliff top. */
const nexusTop = (ch) => ch === 'P' || ch === 'E';

/** The cliff at (x, z), if any (map-local coordinates). */
export function cliffAt(x, z) {
  if (path.time) return null; // the time dimension is flat
  const top = topAt(x, z);
  if (top) return top;
  if (mapInfo?.nexus) return nexusTop(nexusAt(x, z)) ? { x, z, r: NEXUS_CELL, h: NEXUS_PLATFORM } : null;
  if (mapInfo?.brook) {
    const rock = brookRock(x, z);
    if (rock) return { x, z, r: BROOK_CELL, h: rock.h };
  }
  if (mapInfo?.brook) {
    const [c, i] = brookIdx(x, z);
    return brookKind(c, i) === 'cliff' ? { x, z, r: BROOK_CELL, h: brookH(c, i) } : null;
  }
  if (mapInfo?.rampart) {
    const [c, i] = rampartIdx(x, z);
    return rampartKind(c, i) === 'cliff' ? { x, z, r: RAMPART_CELL, h: rampartH(c, i) } : null;
  }
  if (mapInfo?.grid) {
    const [c, i] = crossIdx(x, z);
    return crossKind(c, i) === 'cliff' ? { x, z, r: CROSS_CELL, h: crossH(c, i) } : null;
  }
  return CLIFFS.find((c) => Math.hypot(x - c.x, z - c.z) < c.r) ?? null;
}

/** Floor height of a Twilight Nexus grid character: upper deck, central platform or lower floor. */
const NEXUS_H = { o: NEXUS_DECK, '#': NEXUS_DECK, '=': NEXUS_DECK, S: NEXUS_DECK, P: NEXUS_PLATFORM, E: NEXUS_PLATFORM };
const nexusH = (ch) => NEXUS_H[ch] ?? 0;

/** Ground height at world (x, z): cliff tops are raised (and Twilight Nexus's decks). Works on every Versus lane. */
export function heightAt(x, z) {
  z = foldZ(z);
  const top = topAt(x, z);
  if (top) return top.h;
  if (mapInfo?.nexus && !path.time) return nexusH(nexusAt(x, z));
  if (mapInfo?.grid && !path.time) return Math.max(0, crossH(...crossIdx(x, z)));
  if (mapInfo?.rampart && !path.time) return Math.max(0, rampartH(...rampartIdx(x, z)));
  if (mapInfo?.rig && !path.time) return rigH(...rigIdx(x, z)); // the sea is far below the deck
  if (mapInfo?.brook && !path.time) return brookRock(x, z)?.h ?? Math.max(0, brookH(...brookIdx(x, z)));
  return cliffAt(x, z)?.h ?? 0;
}

/** A level's stats where a tower stands: on a cliff top its `cliff` fields replace the rest (Penetrator). */
export function levelAt(s, x, z) {
  return s.cliff && cliffAt(x, foldZ(z)) ? { ...s, ...s.cliff } : s;
}

/**
 * Twilight Nexus: may a ground tower stand at (x, z)? Only on placement slabs (upper deck 'o', or
 * the open lower floor '_'), with its whole footprint on that one floor.
 */
function nexusPlaceable(x, z) {
  const ch = nexusAt(x, z);
  if (ch !== 'o' && ch !== '_') return false;
  const r = 1.5 * TOWER_SIZE;
  for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r]]) {
    if (nexusAt(x + dx * 0.8, z + dz * 0.8) !== ch) return false;
  }
  return true;
}

/**
 * Twilight Nexus's solid floors for players: one box per run of same-height cells in a grid row
 * (players walk on the upper deck, the bridges and the central platform).
 */
function nexusColliders() {
  const out = [];
  NEXUS_GRID.forEach((line, row) => {
    let c = 0;
    while (c < line.length) {
      const h = nexusH(line[c]);
      let e = c;
      while (e + 1 < line.length && nexusH(line[e + 1]) === h) e++;
      if (h > 0) {
        const x0 = (c - 15) * NEXUS_CELL;
        const x1 = (e + 1 - 15) * NEXUS_CELL;
        out.push({ x: (x0 + x1) / 2, z: (row - 10 + 0.5) * NEXUS_CELL, hx: (x1 - x0) / 2, hz: NEXUS_CELL / 2, h, terrain: true });
      }
      c = e + 1;
    }
  });
  return out;
}

/** Twilight Nexus: may a cliff tower stand at (x, z)? Its whole footprint on the central platform. */
function nexusTopFits(x, z) {
  const r = 1.5 * TOWER_SIZE;
  for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r]]) {
    if (!nexusTop(nexusAt(x + dx * 0.8, z + dz * 0.8))) return false;
  }
  return true;
}

/** Twilight Nexus: where players may walk (the deck, bridges and platform; not the open edges or the void). */
export function nexusWalkable(x, z) {
  return nexusH(nexusAt(x, foldZ(z))) > 0;
}

/**
 * Sunset Crossing: what may stand at (x, z) ('ground' / 'cliff' / null), and its floor height. A
 * tower's whole footprint must be on cells of the same kind and height.
 */
function gridSpot(x, z) {
  const [c, i] = crossIdx(x, z);
  const kind = crossKind(c, i);
  if (!kind) return null;
  const h = crossH(c, i);
  const r = 1.6 * TOWER_SIZE;
  for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r]]) {
    const [c2, i2] = crossIdx(x + dx * 0.8, z + dz * 0.8);
    if (crossKind(c2, i2) !== kind || crossH(c2, i2) !== h) return null;
  }
  return kind;
}

/** Sunset Crossing: may players walk at (x, z)? Anywhere on the plateau (not off its cliff edges). */
export function gridWalkable(x, z) {
  return crossCh(...crossIdx(x, foldZ(z))) !== ' ';
}

/**
 * Sunset Crossing's obstacles and colliders, all built from the grid: the raised terrain (one box
 * per run of same-height cells in a row) and every decoration that stands on a cell.
 */
function gridGenerate() {
  const C = CROSS_CELL;
  const obstacles = [];
  const colliders = [];
  CROSS_GRID.forEach((line, i) => {
    let c = 0;
    while (c < line.length) {
      const h = crossH(c, i);
      let e = c;
      while (e + 1 < line.length && crossH(e + 1, i) === h) e++;
      if (h > 0) {
        const x0 = (c - 20) * C;
        const x1 = (e + 1 - 20) * C;
        colliders.push({ x: (x0 + x1) / 2, z: crossCell(0, i + 1)[1], hx: (x1 - x0) / 2, hz: C / 2, h, terrain: true });
      }
      c = e + 1;
    }
    for (let c2 = 0; c2 < line.length; c2++) {
      const k = line[c2];
      const [x, z] = crossCell(c2, i + 1);
      const h = Math.max(0, crossH(c2, i));
      if (k === 'T' || k === 't') colliders.push({ x, z, r: 0.9, h: Infinity });
      else if (k === 'o') colliders.push({ x, z, r: 2.2, h: 2.6 });
      else if (k === 'L' || k === 'M') colliders.push({ x, z, r: 1.6, h: Infinity });
      else if (k === 'X') colliders.push({ x, z, hx: 1.2, hz: 1.2, h: h + 2.4 });
      else if (k === 'W') colliders.push({ x, z, hx: 2.4, hz: 2.4, h: h + 2 });
      else if (k === '|') colliders.push({ x, z, hx: 0.5, hz: 2.4, h: 1.6 });
      else if (k === 'C') {
        // The castle's outer wall (the courtyard is sunken, inside it).
        const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, di]) => crossCh(c2 + dc, i + di) !== 'C');
        if (edge) colliders.push({ x, z, hx: C / 2, hz: C / 2, h: 3.5 });
      }
    }
  });
  // The glass tower's corner columns.
  for (const x of [-49.5, -25.5]) for (const z of [28, 52]) colliders.push({ x, z, hx: 0.5, hz: 0.5, h: Infinity });
  // Statues that stand off the grid's marked cells (south-west plains, by the castle).
  obstacles.push({ x: crossCell(24, 14)[0], z: crossCell(24, 14)[1], r: 2.4 }); // the bone stack by the castle
  for (const [c, r] of [[1, 20], [20, 16]]) {
    const [x, z] = crossCell(c, r);
    obstacles.push({ x, z, r: 2 });
    colliders.push({ x, z, r: 1.6, h: Infinity });
  }
  return { obstacles, colliders, trees: [], rocks: [], border: [], props: [] };
}

/**
 * Shattered Court: may a tower stand at (x, z)? Its whole footprint must be on floor tiles, off
 * this game's path, the neck tiles and the prop tiles.
 */
function courtPlaceable(x, z) {
  const r = 1.6 * TOWER_SIZE * 0.8;
  for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r]]) {
    const [c, i] = courtIdx(x + dx, z + dz);
    if (!courtTile(c, i) || COURT_FENCES.has(i * 40 + c)) return false;
  }
  const [c, i] = courtIdx(x, z);
  return !COURT_NOBUILD.some(([nc, ni]) => nc === c && ni === i);
}

/** Last Laugh contract: open court tiles with a fence on them (tile id col + row index * 40). The sim fills it; clients copy it from the snapshot. */
export const COURT_FENCES = new Set();

/** Shattered Court: may players walk at (x, z)? On the tiles, the portal cell and the castle's gate cell. */
export function courtWalkable(x, z) {
  const [c, i] = courtIdx(x, foldZ(z));
  return courtTile(c, i) || (c === 19 && (i === 0 || i === 40));
}

/** Shattered Court's obstacles and colliders: the crystals and card stacks standing on tiles. */
function courtGenerate() {
  const obstacles = [];
  const colliders = [];
  for (const [c, i] of COURT_CRYSTALS) {
    const [x, z] = courtCell(c, i + 1);
    obstacles.push({ x, z, r: 1.8 });
    colliders.push({ x, z, r: 1.2, h: Infinity });
  }
  for (const [c, i] of COURT_CARDS) {
    const [x, z] = courtCell(c, i + 1);
    obstacles.push({ x, z, r: 1.8 });
    colliders.push({ x, z, hx: 1, hz: 1, h: Infinity });
  }
  return { obstacles, colliders, trees: [], rocks: [], border: [], props: [] };
}

/** Ember Keep: is cell (c, i) island ground a tower can stand on? (not lava, the keep, the bridge or the base) */
const emberGround = (c, i) => '.#V'.includes(emberCh(c, i));

/**
 * Ember Keep: may a tower stand at (x, z)? Its whole footprint must be on island ground, off
 * the path, the volcano, the lava pits and the decorations.
 */
function emberPlaceable(x, z) {
  const r = 1.6 * TOWER_SIZE * 0.8;
  for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r]]) {
    if (!emberGround(...emberIdx(x + dx, z + dz))) return false;
  }
  return true;
}

/** Ember Keep: may players walk at (x, z)? On the island, the drawbridge, the gate, the base and the keep's rock (not lava). */
export function emberWalkable(x, z) {
  return '.#V=SBC'.includes(emberCh(...emberIdx(x, foldZ(z))));
}

/**
 * Ember Keep's obstacles and colliders: the volcano cone, the stone posts round the octagon, the
 * lava pits, the base gate and the boulders along the shore. Decor spots go in `props` for the
 * renderer, so the sim and the picture agree.
 */
function emberGenerate() {
  const obstacles = [];
  const colliders = [];
  const props = [];
  const rand = mulberry32(6061);
  const [vx, vz] = EMBER_VOLCANO;
  obstacles.push({ x: vx, z: vz, r: 5.5 });
  colliders.push({ x: vx, z: vz, r: 4.6, h: Infinity });
  // Six square stone posts on the plaza rim, just outside the ring.
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    const x = vx + Math.cos(a) * 15.5;
    const z = vz + Math.sin(a) * 17;
    if (!emberGround(...emberIdx(x, z)) || path.distanceTo(x, z) < PATH_WIDTH / 2 + 1.6) continue;
    props.push({ kind: 'post', x, z });
    obstacles.push({ x, z, r: 1.6 });
    colliders.push({ x, z, hx: 1, hz: 1, h: 4 });
  }
  // The dark keep (emberworld.js): its flat roof between the five towers is a cliff top, out of reach of players.
  {
    const kx = emberCell(3, 8)[0] + EMBER_CELL / 2; // the keep's east face
    const [, kz] = emberCell(0, 8.5);
    colliders.push({ x: kx - 24, z: kz, hx: 24, hz: 18, h: 1.75, terrain: true }); // the rock mass it stands on
    colliders.push({ x: kx - 8, z: kz, hx: 8, hz: 13, h: 23.75, top: true });
    for (const [tx, tz, w, h] of [[-4, -13, 6, 30], [-4, 13, 6, 30], [-14, -8, 7, 36], [-14, 8, 7, 36], [-10, 0, 8, 42]]) {
      colliders.push({ x: kx + tx, z: kz + tz, hx: w / 2, hz: w / 2, h: 1.75 + h });
    }
  }
  for (const [c, r, pr] of EMBER_POOLS) {
    const [x, z] = emberCell(c, r);
    props.push({ kind: 'pit', x, z, r: pr });
    obstacles.push({ x, z, r: pr + 0.6 });
  }
  // The base gate: a low brick wall across the path end with a post either side.
  const [bx, bz] = emberCell(10, 21);
  for (const s of [-1, 1]) {
    colliders.push({ x: bx + s * 3.2, z: bz, hx: 1.2, hz: 0.7, h: Infinity });
    obstacles.push({ x: bx + s * 3.2, z: bz, r: 1.8 });
  }
  // Boulders on the shore: island cells next to lava, about one in four.
  EMBER_GRID.forEach((line, i) => [...line].forEach((ch, c) => {
    if (ch !== '.') return;
    const shore = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dc, di]) => emberCh(c + dc, i + di) === '~');
    if (!shore || rand() > 0.28) return;
    const [cx, cz] = emberCell(c, i + 1);
    const x = cx + shore[0] * EMBER_CELL * 0.35 + (rand() - 0.5);
    const z = cz + shore[1] * EMBER_CELL * 0.35 + (rand() - 0.5);
    if (path.distanceTo(x, z) < PATH_WIDTH / 2 + 2.5) return;
    const s = 0.7 + rand() * 0.8;
    props.push({ kind: 'boulder', x, z, s, rot: rand() * Math.PI, v: rand() });
    obstacles.push({ x, z, r: 1.4 * s, h: 1.6 * s });
    colliders.push({ x, z, r: 1.2 * s, h: 1.6 * s });
  }));
  return { obstacles, colliders, trees: [], rocks: [], border: [], props };
}

/**
 * Midnight Rampart: what may stand at (x, z) ('ground' / 'cliff' / 'water' / null). A tower's
 * whole footprint must be on cells of the same kind and height.
 */
function rampartSpot(x, z) {
  const [c, i] = rampartIdx(x, z);
  const kind = rampartKind(c, i);
  if (!kind) return null;
  const h = rampartH(c, i);
  const r = 1.6 * TOWER_SIZE * 0.8;
  for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r]]) {
    const [c2, i2] = rampartIdx(x + dx, z + dz);
    if (rampartKind(c2, i2) !== kind || rampartH(c2, i2) !== h) return null;
  }
  return kind;
}

/** Midnight Rampart: may players walk at (x, z)? Anywhere in the bowl except the pond and the sewer channel (raised ground is a collider). */
export function rampartWalkable(x, z) {
  const [c, i] = rampartIdx(x, foldZ(z));
  if (c < 0 || i < 0 || i >= RAMPART_GRID.length || c >= RAMPART_GRID[0].length) return c < 0 && i === 15; // just inside the spawn cave
  return !'_~'.includes(rampartCh(c, i));
}

/**
 * Midnight Rampart's obstacles and colliders, all from the grid: the raised terrain (one box per
 * run of same-height cells in a row), the street lamps along the road and every prop. Prop spots
 * go in `props` so the sim and the renderer agree.
 */
function rampartGenerate() {
  const C = RAMPART_CELL;
  const obstacles = [];
  const colliders = [];
  const props = [];
  const at = (c, r) => rampartCell(c, r);
  RAMPART_GRID.forEach((line, i) => {
    let c = 0;
    while (c < line.length) {
      const h = rampartH(c, i);
      let e = c;
      while (e + 1 < line.length && rampartH(e + 1, i) === h) e++;
      if (h > 0) {
        const x0 = (c - 14) * C;
        const x1 = (e + 1 - 14) * C;
        colliders.push({ x: (x0 + x1) / 2, z: at(0, i + 1)[1], hx: (x1 - x0) / 2, hz: C / 2, h, terrain: true });
      }
      c = e + 1;
    }
    for (let c2 = 0; c2 < line.length; c2++) {
      const k = line[c2];
      const [x, z] = at(c2, i + 1);
      if (k === 'R') {
        const spire = c2 === 16; // the tall dark rock inside the inner loop (Q14-Q17)
        obstacles.push({ x, z, r: 2.2 });
        colliders.push({ x, z, r: 1.7, h: spire ? Infinity : 2.6 });
      }
    }
  });
  const box = (c0, r0, c1, r1, h, pad = 0.6) => {
    const [x0, z0] = at(c0 - 0.5, r0 - 0.5);
    const [x1, z1] = at(c1 + 0.5, r1 + 0.5);
    const b = { x: (x0 + x1) / 2, z: (z0 + z1) / 2, hx: (x1 - x0) / 2 - pad, hz: (z1 - z0) / 2 - pad, h };
    colliders.push(b);
    return b;
  };
  // The crane's mast (P2-U5); the jib is high overhead.
  const [mx, mz] = at(17.5, 3.5);
  colliders.push({ x: mx, z: mz, hx: 1.4, hz: 1.4, h: Infinity });
  // The mine scaffold and cart on the hill's south foot (T-W 12-13).
  box(19, 12, 22, 13, 3.2, 0.4);
  // The billboard's post (Y15-AA15).
  const [bx, bz] = at(25, 15);
  colliders.push({ x: bx, z: bz, r: 0.5, h: Infinity });
  // The roofless house (Y17-AA19): four low walls with a door facing the road (west).
  {
    const [x0, z0] = at(23.5, 16.5);
    const [x1, z1] = at(26.5, 19.5);
    const t = 0.3;
    const wh = 3.6;
    const cz = (z0 + z1) / 2;
    colliders.push({ x: (x0 + x1) / 2, z: z0 + t, hx: (x1 - x0) / 2 - 0.4, hz: t, h: wh });
    colliders.push({ x: (x0 + x1) / 2, z: z1 - t, hx: (x1 - x0) / 2 - 0.4, hz: t, h: wh });
    colliders.push({ x: x1 - 0.4 - t, z: cz, hx: t, hz: (z1 - z0) / 2 - 0.4, h: wh });
    for (const s of [-1, 1]) colliders.push({ x: x0 + 0.4 + t, z: cz + s * 3.5, hx: t, hz: 2.1, h: wh }); // the west wall either side of the door
  }
  // The dark L-shaped building (Y21-AA23): its north-east corner is cut away.
  box(24, 22, 26, 23, 5.1).top = true; // its flat roof is a cliff top
  box(24, 21, 25, 21, 5.1);
  // The two blue armoured vehicles (U-W 25-27).
  box(20, 25, 22, 25.9, 3.2, 0.5);
  box(20, 26.6, 22, 27, 3.2, 0.5);
  // The white storage tank (Z25-Z26).
  const [tx, tz] = at(25, 25.5);
  colliders.push({ x: tx, z: tz, r: 2.6, h: 6.5 });
  // The gas station: four fuel pumps (S24-T24), a canopy on four posts (S-T 25-26) and green crates.
  for (let k = 0; k < 4; k++) {
    const [x, z] = at(18.1 + k * 0.55, 24.2);
    props.push({ kind: 'pump', x, z });
    obstacles.push({ x, z, r: 0.9 });
    colliders.push({ x, z, hx: 0.4, hz: 0.3, h: 2.2 });
  }
  for (const [c, r] of [[17.6, 24.6], [19.4, 24.6], [17.6, 26.4], [19.4, 26.4]]) {
    const [x, z] = at(c, r);
    obstacles.push({ x, z, r: 0.8 });
    colliders.push({ x, z, r: 0.2, h: Infinity });
  }
  for (const [c, r, rot] of [[16.3, 24.4, 0.2], [16.4, 27.2, 0.7], [19.4, 27.3, -0.3], [17.2, 25.2, 1.1]]) {
    const [x, z] = at(c, r);
    props.push({ kind: 'crate', x, z, rot });
    obstacles.push({ x, z, r: 1.1, h: 1.2 });
    colliders.push({ x, z, hx: 0.6, hz: 0.6, h: 1.2 });
  }
  // A square guard tower at each end of both wall segments (rows 2, 20, 23 and 28).
  for (const r of [2, 20, 23, 28]) {
    const [x, z] = at(8.5, r);
    props.push({ kind: 'guard', x, z });
    obstacles.push({ x, z, r: 2.6 });
    colliders.push({ x, z, hx: 1.8, hz: 1.8, h: RAMPART_WALL + 5 });
  }
  // Street lamps along the outer edges of the road, about every 16 units, on open ground.
  const lamps = [];
  const side = PATH_WIDTH / 2 + 1.1;
  for (const r of path.routes) {
    for (const sg of r.segs) {
      for (let d = 6; d < sg.len - 4; d += 16) {
        for (const s of lamps.length % 2 ? [1, -1] : [-1, 1]) {
          const x = sg.a.x + sg.dx * d - sg.dz * side * s;
          const z = sg.a.z + sg.dz * d + sg.dx * side * s;
          const k = rampartCh(...rampartIdx(x, z));
          if (!'.:P-G'.includes(k) || path.distanceTo(x, z) < side - 0.2) continue;
          if (lamps.some((l) => Math.hypot(l.x - x, l.z - z) < 12)) continue;
          if (obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 1.5)) continue;
          lamps.push({ x, z, rot: Math.atan2(sg.dx * s, sg.dz * s) }); // the arm reaches over the road
          break;
        }
      }
    }
  }
  for (const l of lamps.slice(0, 16)) {
    props.push({ kind: 'lamp', ...l });
    obstacles.push({ x: l.x, z: l.z, r: 0.9 });
    colliders.push({ x: l.x, z: l.z, r: 0.3, h: Infinity });
  }
  return { obstacles, colliders, trees: [], rocks: [], border: [], props };
}

/**
 * Brook Hollow: what may stand at (x, z) ('ground' / 'cliff' / 'water' / null). A tower's whole
 * footprint must be on cells of the same kind and height.
 */
function brookSpot(x, z) {
  const rock = brookRock(x, z);
  if (rock) {
    const r = 1.6 * TOWER_SIZE * 0.8;
    const all = [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r]].every(([dx, dz]) => brookRock(x + dx, z + dz) === rock);
    return all ? 'cliff' : null;
  }
  const [c, i] = brookIdx(x, z);
  const kind = brookKind(c, i);
  if (!kind) return null;
  const h = brookH(c, i);
  const r = 1.6 * TOWER_SIZE * 0.8;
  for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r]]) {
    const [c2, i2] = brookIdx(x + dx, z + dz);
    if (brookKind(c2, i2) !== kind || brookH(c2, i2) !== h) return null;
  }
  return kind;
}

/** Brook Hollow: may players walk at (x, z)? Anywhere in the bowl except the water (cliffs and rocks are colliders). */
export function brookWalkable(x, z) {
  const [c, i] = brookIdx(x, foldZ(z));
  if (c < 0 || i < 0 || i >= BROOK_GRID.length || c >= BROOK_GRID[0].length) return c < 0 && (i === 14 || i === 15); // just inside the base cave
  return brookCh(c, i) !== '~';
}

/**
 * Brook Hollow's colliders, all from the grid: the cliffs (one box per run of same-height cells
 * in a row) and the rock blocks. Grass tuft spots go in `props` so every client draws the same.
 */
function brookGenerate() {
  const C = BROOK_CELL;
  const obstacles = [];
  const colliders = [];
  const props = [];
  BROOK_GRID.forEach((line, i) => {
    let c = 0;
    while (c < line.length) {
      const h = brookH(c, i);
      let e = c;
      while (e + 1 < line.length && brookH(e + 1, i) === h) e++;
      if (h > 0) {
        const x0 = (c - 12) * C;
        const x1 = (e + 1 - 12) * C;
        colliders.push({ x: (x0 + x1) / 2, z: brookCell(0, i + 1)[1], hx: (x1 - x0) / 2, hz: C / 2, h, terrain: true });
      }
      c = e + 1;
    }
  });
  for (const k of BROOK_ROCKS) {
    const [x, z] = brookCell(k.c, k.r);
    colliders.push({ x, z, hx: (k.w * C) / 2 - 0.2, hz: (k.d * C) / 2 - 0.2, h: k.h });
  }
  // The pillar in front of the north cliff and the mossy boulder by the base cave poke out onto the grass.
  for (const [[x, z], r] of [[BROOK_PILLAR, 1.8], [BROOK_BOULDER, 2.4]]) {
    obstacles.push({ x, z, r });
    colliders.push({ x, z, r: r - 0.3, h: Infinity });
  }
  // Grass tufts: a clump on every * cell, and a few along the cliff foot.
  const rand = mulberry32(4242);
  BROOK_GRID.forEach((line, i) => [...line].forEach((k, c) => {
    const [cx, cz] = brookCell(c, i + 1);
    if (k === '*') {
      for (let n = 0; n < 3; n++) props.push({ kind: 'tuft', x: cx + (rand() - 0.5) * C * 0.7, z: cz + (rand() - 0.5) * C * 0.7, s: 0.8 + rand() * 0.6, rot: rand() * 6 });
      return;
    }
    if (k !== '.') return;
    const foot = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dc, di]) => brookCh(c + dc, i + di) === '^');
    if (!foot || rand() > 0.35) return;
    const x = cx + foot[0] * C * 0.32 + (rand() - 0.5);
    const z = cz + foot[1] * C * 0.32 + (rand() - 0.5);
    if (path.distanceTo(x, z) < 5) return;
    props.push({ kind: 'tuft', x, z, s: 0.7 + rand() * 0.5, rot: rand() * 6 });
  }));
  return { obstacles, colliders, trees: [], rocks: [], border: [], props };
}

/**
 * Rig Point: what may stand at (x, z) ('ground' / 'water' / null). A tower's whole footprint must
 * be on cells of the same kind.
 */
function rigSpot(x, z) {
  const [c, i] = rigIdx(x, z);
  const kind = rigKind(c, i);
  if (!kind) return null;
  const r = 1.6 * TOWER_SIZE * 0.8;
  for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r]]) {
    if (rigKind(...rigIdx(x + dx, z + dz)) !== kind) return null;
  }
  return kind;
}

/** Rig Point: may players walk at (x, z)? On the deck, the spawn platform, the bridges and the helipad (not the sea). */
export function rigWalkable(x, z) {
  return rigCh(...rigIdx(x, foldZ(z))) !== '~';
}

/**
 * Rig Point's structures, colliders and clutter, all laid from the grid. Every structure goes in
 * `props` with its full shape (cells, height, colour), so the renderer draws exactly what the
 * players bump into. Cells: col 0 = A, row 1 = top; boxes span c0..c1 / r0..r1 inclusive.
 */
function rigGenerate() {
  const C = RIG_CELL;
  const obstacles = [];
  const colliders = [];
  const props = [];
  const at = (c, r) => rigCell(c, r);
  /** A solid box over cells c0..c1, r0..r1, `h` tall. */
  const box = (c0, r0, c1, r1, h, extra = {}) => {
    const [x0, z0] = at(c0 - 0.5, r0 - 0.5);
    const [x1, z1] = at(c1 + 0.5, r1 + 0.5);
    props.push({ kind: 'rigBox', x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0, h, ...extra });
    // A building's flat roof (its rim stands 0.4 above h) is a cliff top; the derrick base and machinery aren't.
    const roof = !extra.role || extra.role === 'spawn';
    colliders.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, hx: (x1 - x0) / 2, hz: (z1 - z0) / 2, h: roof ? h + 0.4 : h, ...(roof ? { top: true } : {}) });
  };
  // Buildings (dark charcoal; trims per the spec).
  box(17, 1, 23, 4, 14, { role: 'spawn' }); // the two-storey spawn building (R1-X4)
  box(10, 13, 11, 17, 10, { trim: 0x3e5e8a }); // west L-building (K13-L17), blue trim
  box(13, 30, 20, 33, 15); // the big south building (N28-U33), T-shaped: its wide south half...
  box(13, 28, 16, 29, 15); // ...and the stem west of its roof tanks
  box(19, 24, 25, 26, 12); // south-centre L-building (T24-Z26)...
  box(23, 27, 24, 29, 12); // ...and its stem (X27-Y29)
  box(30, 23, 33, 29, 13, { trim: 0x4f7f4a, trimSide: 'w' }); // south-east block (AE23-AH29), green trim on the west wall
  box(31, 31, 34, 32, 6, { trim: 0x3e5e8a }); // the small dark building (AF31-AI32), blue trim
  box(34, 24, 34, 26, 4, { role: 'machine' }); // black boxy machinery (AI24-AI26)
  // The central derrick (U17-AA22): a square base 8 tall, the lattice tower and flare on top.
  box(20, 17, 26, 22, 8, { role: 'derrick' });
  {
    const [x, z] = at(23, 19.5);
    props.push({ kind: 'rigDerrick', x, z, flare: at(24, 19) });
    colliders.push({ x, z, r: 4, h: Infinity });
  }
  // Round tanks: four dark grey ones on the south building's north side (R28-U29), two dark grey
  // octagonal ones on the east edge (AG14-AH17).
  for (const c of [17, 18, 19, 20]) {
    const [x, z] = at(c, 28.5);
    props.push({ kind: 'rigTank', x, z, r: 2.3, h: 11, sides: 16 });
    colliders.push({ x, z, r: 2.3, h: 11 });
  }
  for (const r of [14.5, 16.5]) {
    const [x, z] = at(32.5, r);
    props.push({ kind: 'rigTank', x, z, r: 4.6, h: 9, sides: 8 });
    colliders.push({ x, z, r: 4.6, h: 9 });
    colliders.push({ x, z, r: 4.2, h: 9.9, top: true }); // the flat lid: a cliff top
  }
  // White tanks lying on their sides (axis along z): three at O14-P16 (one stacked on the other
  // two), two capsules by the helipad bridge (J23-K25), five silver ones on the north edge (AC10-AG10).
  const cyl = (c, r0, r1, rad, y = 0, color = 0xe0e0e0, capsule = false) => {
    const [x, z0] = at(c, r0 - 0.5);
    const [, z1] = at(c, r1 + 0.5);
    props.push({ kind: 'rigCyl', x, z: (z0 + z1) / 2, len: z1 - z0 - 0.4, r: rad, y, color, capsule });
    colliders.push({ x, z: (z0 + z1) / 2, hx: rad, hz: (z1 - z0) / 2 - 0.2, h: y + rad * 2 });
  };
  cyl(14, 14, 16, 2.1);
  cyl(15, 15, 16, 2.1);
  cyl(14.5, 15, 16, 1.9, 3.6);
  cyl(9, 23, 25, 2.2, 0, 0xe8e8e8, true);
  cyl(10, 23, 25, 2.2, 0, 0xe8e8e8, true);
  for (let c = 28; c <= 32; c++) cyl(c, 10, 10, 1.9, 0, 0xc8ccd0);
  // Shipping containers (4 x 4 x 12): x, z in cells, along 'x' or 'z', stack height, colours.
  const RED = 0xa04838;
  const BLUE = 0x4a5e8c;
  const GREEN = 0x4f7f4a;
  const CONT = [];
  const cont = (c, r, rot, stack, colors, len = 2.4) => CONT.push({ c, r, rot, stack, colors, len });
  // The big north-east cluster (Z13-AD19): a row of north-south boxes, some rotated, stacked 1-3.
  cont(25, 14.5, 0.32, 2, [GREEN, BLUE]);
  cont(26, 14.6, 0, 3, [BLUE, RED, GREEN]);
  cont(27, 14.5, 0, 1, [RED]);
  cont(28, 14.4, -0.18, 2, [GREEN, RED]);
  cont(29, 14.5, 0, 3, [RED, BLUE, BLUE]);
  cont(26.2, 15.9, Math.PI / 2 - 0.5, 1, [RED], 2.2); // knocked diagonally across the gap
  cont(28, 17, Math.PI / 2, 2, [BLUE, GREEN]);
  cont(28, 18, Math.PI / 2, 1, [GREEN]);
  // Small groups on the west deck: P18-Q18 and S18, and a red one at P21-Q22.
  cont(15.5, 18, Math.PI / 2, 1, [BLUE], 2);
  cont(18, 18, 0, 1, [GREEN], 1.2);
  cont(15.5, 21.5, Math.PI / 4, 1, [RED], 2.6);
  // A rotated blue one at AD21-AE22 (spilling onto AD23), and the red/blue/green stack at Z28-AC29.
  cont(29.6, 22.1, 0.6, 1, [BLUE], 2.4);
  cont(26.5, 28, Math.PI / 2, 2, [RED, GREEN]);
  cont(26.5, 29, Math.PI / 2, 1, [BLUE]);
  for (const k of CONT) {
    const [x, z] = at(k.c, k.r);
    const len = k.len * C;
    props.push({ kind: 'rigContainer', x, z, rot: k.rot, len, w: 4, h: 4, colors: k.colors });
    // Colliders: a row of circles down its length (it may be turned).
    const n = Math.max(1, Math.round(len / 4));
    for (let j = 0; j < n; j++) {
      const t = (j + 0.5) / n - 0.5;
      colliders.push({ x: x + Math.sin(k.rot) * t * len, z: z + Math.cos(k.rot) * t * len, r: 2.1, h: k.stack * 4 });
    }
    obstacles.push({ x, z, r: len / 2 });
  }
  // The two red cranes: north-west (K9-L10, boom out over the sea to the north-west) and east (AH20-AI21, boom east-north-east).
  for (const [c, r, yaw] of [[10.5, 9.5, Math.atan2(-1, -1)], [33.5, 20.5, Math.atan2(-0.4, 1)]]) {
    const [x, z] = at(c, r);
    props.push({ kind: 'rigCrane', x, z, yaw });
    colliders.push({ x, z, r: 3, h: Infinity });
  }
  // The helicopter on the helipad (E28): the base.
  {
    const [x, z] = at(4, 28);
    props.push({ kind: 'rigHeli', x, z });
    obstacles.push({ x, z, r: 7 });
    colliders.push({ x, z, hx: 2, hz: 4.5, h: 4 });
  }
  // Small clutter on the open deck: pallets, crates, jersey barriers, oil drums, pipe bundles and
  // yellow handrails. Same spots for everyone (seeded).
  const rand = mulberry32(9191);
  const KINDS = ['pallet', 'crate', 'barrier', 'drums', 'pipes', 'rail'];
  const SIZE = { pallet: [1.4, 0.5], crate: [1.1, 1.3], barrier: [1.7, 1.1], drums: [1.2, 1.3], pipes: [1.9, 0.9], rail: [1.8, 1.1] };
  let made = 0;
  for (let tries = 0; tries < 900 && made < 34; tries++) {
    const c = 10 + Math.floor(rand() * 26);
    const r = 9 + Math.floor(rand() * 25);
    const [cx, cz] = at(c, r);
    const x = cx + (rand() - 0.5) * C * 0.6;
    const z = cz + (rand() - 0.5) * C * 0.6;
    const kind = KINDS[Math.floor(rand() * KINDS.length)];
    const [rad, h] = SIZE[kind];
    const ok = [[0, 0], [rad, 0], [-rad, 0], [0, rad], [0, -rad]].every(([dx, dz]) => rigCh(...rigIdx(x + dx, z + dz)) === '.');
    if (!ok || path.distanceTo(x, z) < PATH_WIDTH / 2 + rad + 1) continue;
    if (obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + rad + 2.5)) continue;
    if (Math.hypot(x - PLAYER_SPAWN.x, z - PLAYER_SPAWN.z) < 6) continue;
    const rot = Math.floor(rand() * 4) * (Math.PI / 2) + (rand() - 0.5) * 0.5;
    props.push({ kind: 'rigClutter', type: kind, x, z, rot, v: rand() });
    obstacles.push({ x, z, r: rad, h });
    colliders.push({ x, z, r: rad * 0.8, h });
    made++;
  }
  return { obstacles, colliders, trees: [], rocks: [], border: [], props };
}

// Footprints of scattered props: [blocking radius, player collider height (Infinity = too tall
// to stand on), 0 = decor only (no obstacle)]. Scaled by the prop's size.
const PROP_SIZE = {
  flower: [0, 0], bush: [1.2, 1.4], lamp: [0.6, Infinity], crate: [1.3, 1.6], barrel: [0.9, 1.6],
  building: [6, Infinity], container: [3.4, 3], lava: [3.5, 0], vent: [1.6, 1.2], snowman: [1.4, Infinity],
  ice: [1.2, Infinity], pillar: [1.5, Infinity], rubble: [1.6, 1.2],
};

/** A wall of short sections along z = `z` across the map, with gates where the path crosses. */
function wallSections(z, blocked) {
  const out = [];
  for (let x = BOUNDS.minX + 2; x <= BOUNDS.maxX - 2; x += 3) {
    if (path.distanceTo(x, z) < PATH_WIDTH / 2 + 3.5 || blocked(x, z)) continue;
    out.push({ x, z });
  }
  return out;
}

function generate(def) {
  if (def.grid) return gridGenerate();
  if (def.court) return courtGenerate();
  if (def.ember) return emberGenerate();
  if (def.rampart) return rampartGenerate();
  if (def.brook) return brookGenerate();
  if (def.rig) return rigGenerate();
  const rand = mulberry32(1337 + def.path.length * 101 + Math.round(def.path[0][1]));
  const obstacles = def.nexus ? [] : [{ x: CASTLE.x, z: CASTLE.z, r: def.baseR ?? (def.base === 'car' ? 4.5 : 9) }]; // circles blocking towers & players (no h = too tall to stand on)
  const colliders = []; // what players bump into (and can stand on, with h), beyond trees and rocks
  const trees = [];
  const rocks = [];
  const border = [];
  const props = [];
  const start = path.start;

  const blocked = (x, z, pad) =>
    path.distanceTo(x, z) < PATH_WIDTH / 2 + pad ||
    Math.hypot(x - PLAYER_SPAWN.x, z - PLAYER_SPAWN.z) < 12 ||
    obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + pad) ||
    CLIFFS.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + pad) ||
    POOLS.some((p) => Math.hypot(x - p.x, z - p.z) < p.r + pad) ||
    Math.hypot(x - start.x, z - start.z) < 14;

  // Hand-placed pieces first, so the scattered ones keep clear of them.
  for (const f of def.fixed ?? []) {
    if (f.kind === 'wall') {
      const sections = wallSections(f.z, (x, z) => Math.hypot(x - start.x, z - start.z) < 14 || Math.hypot(x - PLAYER_SPAWN.x, z - PLAYER_SPAWN.z) < 6 || CLIFFS.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + 2) || POOLS.some((p) => Math.hypot(x - p.x, z - p.z) < p.r + 2));
      props.push({ kind: 'wall', sections });
      for (const w of sections) {
        obstacles.push({ x: w.x, z: w.z, r: 1.8 });
        colliders.push({ x: w.x, z: w.z, hx: 1.5, hz: 0.6, h: 4 });
      }
    } else if (f.kind === 'brWall') {
      // The Backrooms (Liminal contract): a straight wall along x (rot 0) or z (rot 1).
      props.push({ ...f });
      const h = f.len / 2;
      for (let d = -h + 1.5; d <= h - 1.5 + 0.01; d += 3) obstacles.push({ x: f.x + (f.rot ? 0 : d), z: f.z + (f.rot ? d : 0), r: 1.7 });
      colliders.push({ x: f.x, z: f.z, hx: f.rot ? 0.5 : h, hz: f.rot ? h : 0.5, h: Infinity });
    } else if (f.kind === 'volcano') {
      props.push({ ...f });
      obstacles.push({ x: f.x, z: f.z, r: 15 });
      colliders.push({ x: f.x, z: f.z, r: 13, h: Infinity });
    } else if (f.kind === 'mesa') {
      props.push({ ...f });
      obstacles.push({ x: f.x, z: f.z, r: f.r + 0.5 });
      // Layered steps like the model (world.js); the flat top is a cliff top.
      colliders.push({ x: f.x, z: f.z, r: f.r, h: f.h / 3, fixed: true });
      colliders.push({ x: f.x, z: f.z, r: f.r * 0.91, h: (f.h * 2) / 3, fixed: true });
      colliders.push({ x: f.x, z: f.z, r: f.r * 0.82 - 0.4, h: f.h + 0.25, top: true });
    } else if (f.kind === 'crater' || f.kind === 'pit') {
      // A hole in the ground: nothing can be built in it, and players can't walk into it
      // (except along the road, which crosses on a bridge).
      props.push({ ...f });
      for (let dx = -f.rx; dx <= f.rx; dx += 3) {
        for (let dz = -f.rz; dz <= f.rz; dz += 3) {
          if ((dx / f.rx) ** 2 + (dz / f.rz) ** 2 > 1) continue;
          const x = f.x + dx;
          const z = f.z + dz;
          obstacles.push({ x, z, r: 2.4 });
          if (path.distanceTo(x, z) > PATH_WIDTH / 2 + 2.6) colliders.push({ x, z, r: 2.2, h: Infinity, hole: true }); // the hole's edge: nothing to stand on
        }
      }
      if (f.rx < 3 || f.rz < 3) obstacles.push({ x: f.x, z: f.z, r: Math.max(f.rx, f.rz) });
    } else {
      props.push({ ...f }); // flat decor (the plaza, ditches, signs, road markings)
      // Solid decor (Lantern Hill Cemetery): `block` = radius kept clear of towers, `bh` = height
      // players can stand on (none = too tall), `box` = [hx, hz, h] collider instead of a circle.
      if (f.block) {
        obstacles.push({ x: f.x, z: f.z, r: f.block, ...(f.bh != null ? { h: f.bh } : {}) });
        if (f.box) colliders.push({ x: f.x, z: f.z, hx: f.box[0], hz: f.box[1], h: f.box[2] });
        else colliders.push({ x: f.x, z: f.z, r: f.block * 0.85, h: f.bh ?? Infinity });
      }
      if (f.top) colliders.push({ x: f.x, z: f.z, hx: f.top[0], hz: f.top[1], h: f.top[2], top: true }); // a flat raised top (cliff towers)
      if (f.kind === 'sign') obstacles.push({ x: f.x, z: f.z, r: 1.6 });
      if (f.kind === 'nxBox') {
        obstacles.push({ x: f.x, z: f.z, r: 1.8 });
        colliders.push({ x: f.x, z: f.z, hx: 1, hz: 1, h: NEXUS_DECK + 2 });
      }
    }
  }
  if (def.nexus) colliders.push(...nexusColliders());

  const scatter = (n, tries, pad, place) => {
    let made = 0;
    for (let i = 0; i < tries && made < n; i++) {
      const x = -100 + rand() * 200;
      const z = -62 + rand() * 124;
      if (blocked(x, z, pad)) continue;
      place(x, z);
      made++;
    }
  };
  for (const p of def.props ?? []) {
    const [r, h] = PROP_SIZE[p.kind] ?? [1, Infinity];
    scatter(p.n, p.n * 30, r ? r + 2 : 1.5, (x, z) => {
      const s = p.s[0] + rand() * (p.s[1] - p.s[0]);
      props.push({ kind: p.kind, x, z, s, rot: rand() * Math.PI, v: rand() });
      if (!r) return;
      obstacles.push({ x, z, r: r * s, ...(h !== Infinity && h ? { h: h * s } : {}) });
      if (h) colliders.push({ x, z, r: r * s * 0.85, h: h * s });
    });
  }
  scatter(def.trees ?? 0, 800, 5, (x, z) => {
    const s = 0.8 + rand() * 0.6;
    trees.push({ x, z, s, rot: rand() * Math.PI, leaf: Math.floor(rand() * 3) });
    obstacles.push({ x, z, r: 1.8 * s });
  });
  scatter(def.rocks ?? 0, 400, 3, (x, z) => {
    const s = 1 + rand() * 1.5;
    rocks.push({ x, z, s, rx: rand() * 0.3, ry: rand() * Math.PI, rz: rand() * 0.3 });
    obstacles.push({ x, z, r: 1.3 * s, h: 1.3 * s }); // h: top height, so players can jump on it
  });
  // Tree line beyond the playable area (decor only, not obstacles). border: 'none' leaves it bare.
  for (let i = 0; i < (def.border === 'none' ? 0 : 90); i++) {
    const side = i % 4;
    const t = rand();
    const off = 6 + rand() * 14;
    const x = side < 2 ? -125 + t * 250 : side === 2 ? BOUNDS.minX - off : BOUNDS.maxX + off;
    const z = side === 0 ? BOUNDS.minZ - off : side === 1 ? BOUNDS.maxZ + off : -80 + t * 160;
    const s = 1 + rand() * 0.8;
    const rot = rand() * Math.PI;
    const leaf = Math.floor(rand() * 3);
    if (Math.hypot(x - start.x, z - start.z) < 16) continue;
    border.push({ x, z, s, rot, leaf });
  }
  return { obstacles, colliders, trees, rocks, border, props };
}

/** Decorations and obstacles of the current map: { obstacles, colliders, trees, rocks, border, props }. */
export const MAP = {};
/** Key (in maps.js) and definition of the current map. */
export let mapKey = null;
export let mapInfo = null;
/** Bumped every time the map changes (renderers rebuild when it moves). */
export let mapVersion = 0;

/**
 * Switches every shared map structure (path, cliffs, pools, castle, decorations) to map `key`.
 * The sim, the server and the renderer all call this with the same key, so they agree.
 * A random map's key without a seed gets a new one when `reroll` is set (a new game) or when
 * another map is showing; otherwise it keeps the route already laid (the menu preview).
 */
export function setMap(key, reroll = false) {
  key = mapKeyOf(key);
  if (mapDef(key).random && seedOf(key) == null) {
    if (!reroll && mapKey && baseKey(mapKey) === key) return;
    key = `${key}:${Math.floor(Math.random() * 2147483647)}`;
  }
  if (key === mapKey) return;
  COURT_FENCES.clear();
  const def = seededDef(key);
  mapKey = key;
  mapInfo = def;
  mapVersion++;
  setMapPath(def);
  // Twilight Nexus has no castle: the exits sit under its central platform.
  // Sunset Crossing's base is a cave in the north cliff (grid cell B).
  if (def.base === 'cave') {
    const i = CROSS_GRID.findIndex((l) => l.includes('B'));
    const [x, z] = crossCell(CROSS_GRID[i].indexOf('B'), i + 1);
    Object.assign(CASTLE, { x, z });
  } else if (def.baseAt) Object.assign(CASTLE, { x: def.baseAt[0], z: def.baseAt[1] }); // Halloween Night 3's supercomputer
  else if (def.base === 'car') Object.assign(CASTLE, { x: path.end.x + 4, z: path.end.z }); // Halloween Night 2's blue car
  else if (def.court) Object.assign(CASTLE, { x: 0, z: courtCell(19, 41)[1] + 14 }); // on its own island south of T41
  else if (def.ember || def.rampart || def.brook || def.rig) Object.assign(CASTLE, { x: path.end.x, z: path.end.z }); // Ember Keep's base gate at K21, Midnight Rampart's tunnel at X28
  else Object.assign(CASTLE, def.nexus ? { x: 0, z: 0 } : { x: path.end.x + 7, z: path.end.z });
  CLIFFS.length = 0;
  CLIFFS.push(...def.cliffs.map((c) => ({ ...c })));
  POOLS.length = 0;
  POOLS.push(...def.pools.map((p) => ({ ...p })));
  Object.assign(MAP, generate(def));
  MAP.tops = MAP.colliders.filter((c) => c.top);
}
setMap(DEFAULT_MAP);

/**
 * Can a tower go at (x, z)? `towers` is any iterable of objects with x and z.
 * placement: 'ground' (default), 'cliff' (cliff tops only), 'water' (pools only) or 'any'
 * (ground or cliff, not water).
 */
export function canPlace(x, z, towers, placement = 'ground') {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  for (const t of towers) if (Math.hypot(t.x - x, t.z - z) < 4 * TOWER_SIZE) return false;
  const top = topAt(x, z);
  if (top) return (placement === 'cliff' || placement === 'any') && topFits(top, x, z);
  if (mapInfo.nexus && !path.time && nexusTop(nexusAt(x, z))) return (placement === 'cliff' || placement === 'any') && nexusTopFits(x, z);
  const pool = poolAt(x, z);
  if (mapInfo.court && !path.time) {
    if (placement !== 'ground' && placement !== 'any') return false; // no cliffs or water here
    if (!courtPlaceable(x, z)) return false;
    if (path.distanceTo(x, z) < PATH_WIDTH / 2 + 1.6 * TOWER_SIZE) return false;
    return !MAP.obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 1.6 * TOWER_SIZE);
  }
  if (mapInfo.ember && !path.time) {
    if (placement !== 'ground' && placement !== 'any') return false; // no cliffs or water (lava isn't water)
    if (!emberPlaceable(x, z)) return false;
    if (path.distanceTo(x, z) < PATH_WIDTH / 2 + 1.6 * TOWER_SIZE) return false;
    return !MAP.obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 1.6 * TOWER_SIZE);
  }
  if (mapInfo.rig && !path.time) {
    if (placement === 'cliff') return false; // no cliffs on the rig
    const kind = rigSpot(x, z);
    if (!kind || (kind === 'water') !== (placement === 'water')) return false;
    if (path.distanceTo(x, z) < PATH_WIDTH / 2 + 1.6 * TOWER_SIZE) return false;
    return !MAP.obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 1.6 * TOWER_SIZE);
  }
  if (mapInfo.brook && !path.time) {
    const kind = brookSpot(x, z);
    if (!kind) return false;
    if (kind === 'water' ? placement !== 'water' : placement === 'water' || (kind === 'cliff' ? placement === 'ground' : placement === 'cliff')) return false;
    if (kind === 'ground' && path.distanceTo(x, z) < PATH_WIDTH / 2 + 1.6 * TOWER_SIZE) return false;
    return !MAP.obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 1.6 * TOWER_SIZE);
  }
  if (mapInfo.rampart && !path.time) {
    const kind = rampartSpot(x, z);
    if (!kind) return false;
    if (kind === 'water' ? placement !== 'water' : placement === 'water' || (kind === 'cliff' ? placement === 'ground' : placement === 'cliff')) return false;
    if (kind === 'ground' && path.distanceTo(x, z) < PATH_WIDTH / 2 + 1.6 * TOWER_SIZE) return false;
    return !MAP.obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 1.6 * TOWER_SIZE);
  }
  if (mapInfo.grid && !path.time) {
    if (placement === 'water') return false;
    if (x < BOUNDS.minX + 2 || x > BOUNDS.maxX - 2) return false;
    const kind = gridSpot(x, z);
    if (!kind || (kind === 'cliff' ? placement === 'ground' : placement === 'cliff')) return false;
    if (kind === 'ground' && path.distanceTo(x, z) < PATH_WIDTH / 2 + 1.6 * TOWER_SIZE) return false;
    return !MAP.obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 1.6 * TOWER_SIZE);
  }
  if (placement === 'water') return !!pool && Math.hypot(x - pool.x, z - pool.z) <= pool.r - POOL_INSET;
  if (pool) return false;
  const cliff = cliffAt(x, z);
  if (cliff) return placement !== 'ground' && Math.hypot(x - cliff.x, z - cliff.z) <= cliff.r - CLIFF_INSET;
  if (placement === 'cliff') return false;
  if (mapInfo.nexus && !path.time && !nexusPlaceable(x, z)) return false;
  if (x < BOUNDS.minX + 2 || x > BOUNDS.maxX - 2 || z < BOUNDS.minZ + 2 || z > BOUNDS.maxZ - 2) return false;
  const pad = 1.6 * TOWER_SIZE;
  if (!mapInfo.pathTowers && path.distanceTo(x, z) < PATH_WIDTH / 2 + pad) return false; // Frostgate Citadel: towers may stand on the lanes
  // The time dimension has no trees, rocks or cliffs: only the castle is in the way.
  if (path.time) return Math.hypot(CASTLE.x - x, CASTLE.z - z) >= 9 + pad;
  if (CLIFFS.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + pad)) return false;
  return !MAP.obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + pad);
}
