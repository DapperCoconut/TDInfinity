// Every map you can play. Plain data only (shared by the sim, the server and the renderer).
//
//   path     [[x, z], ...] from the spawn portal to the base. The last leg must head east (+x):
//            the castle stands 7 units past the end. Keep end x <= 90 so the castle fits.
//   spawn    where players appear (off the path).
//   cliffs   raised plateaus for cliff towers: { x, z, r, h }.
//   pools    water for water towers: { x, z, r }.
//   trees    how many scattered trees, and `tree` their kind: round | pine | dead | cactus | palm | crystal.
//   rocks    how many scattered rocks.
//   border   what lines the edge of the map (decor only): a tree kind or 'building'.
//   props    extra scattered decorations: { kind, n, s: [min, max] } (kinds: see world.js).
//   fixed    hand-placed decorations: { kind, x, z, s, ... } (walls, the volcano, the plaza...).
//   theme    colors: ground / path tile colors, sky, cliff side and top, rocks, leaves, water.
//
// Bounds are x -104..104, z -66..66 (see path.js).
import { backroomsLayout } from './backrooms.js';

/** Sunny Meadow's path: a smooth wave (two full swings) that flattens out before the castle. */
function wave() {
  const pts = [];
  for (let x = -100; x <= 70; x += 5) pts.push([x, Math.round(-42 * Math.sin((2 * Math.PI * (x + 100)) / 85) * 10) / 10 || 0]);
  pts.push([88, 0]);
  return pts;
}

/**
 * Sunken Canyon's wall: a ring of overlapping flat-topped rock mesas around the basin, with gaps
 * for the spawn (west) and the castle (east). Deterministic, so every client builds the same ring.
 */
function canyonRing() {
  const out = [];
  const n = 34;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.round(Math.cos(a) * 112);
    const z = Math.round(Math.sin(a) * 74);
    if (Math.abs(z) < 26 && Math.abs(x) > 90) continue; // the road's way in and out
    const v = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const k = Math.abs(v);
    out.push({ kind: 'mesa', x, z, r: 11 + Math.round(k * 6), h: 11 + Math.round(((k * 7) % 1) * 6) });
    // A smaller mesa half in front of every other one, so the wall reads as a cluster.
    if (i % 2 === 0) out.push({ kind: 'mesa', x: Math.round(x * 0.9 + k * 6 - 3), z: Math.round(z * 0.88), r: 6 + Math.round(k * 3), h: 7 + Math.round(k * 4) });
  }
  // Rock walls that swallow the road at both ends.
  for (const sz of [-1, 1]) {
    out.push({ kind: 'mesa', x: -104, z: sz * 17, r: 11, h: 14 });
    out.push({ kind: 'mesa', x: 102, z: sz * 20, r: 12, h: 15 });
  }
  return out;
}

/**
 * Twilight Nexus: the top-down grid from the spec, one character per cell (columns A-AD, rows
 * 1-20, north = top). S portal, = glowing bridge, # dark path ring and spine (upper deck),
 * P raised central platform, E platform cell with an exit on the lower floor under it,
 * o placement slab (upper deck), _ open deck edge (the lower floor shows through), O corner
 * pillar, ~ void.
 */
export const NEXUS_GRID = [
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~O~~~~~~~~~~~~~~~~O~~~~~~',
  '~~~~~~~_______##_______~~~~~~~',
  '~~~~~~~___oooo##oooo___~~~~~~~',
  '~~~~~~~__ooooo##ooooo__~~~~~~~',
  '~~~~~~~_oooooo##oooooo_~~~~~~~',
  '~~~~~~~_ooo########ooo_~~~~~~~',
  '~~~~~~~_ooo#PPPPPP#ooo_~~~~~~~',
  '~~~~~~~_ooo#PPPPPP#ooo_~~~~~~~',
  '~S=========#PEPPEP#=========S~',
  '~S=========#PEPPEP#=========S~',
  '~~~~~~~_ooo#PPPPPP#ooo_~~~~~~~',
  '~~~~~~~_ooo########ooo_~~~~~~~',
  '~~~~~~~_oooooo##oooooo_~~~~~~~',
  '~~~~~~~_oooooo##oooooo_~~~~~~~',
  '~~~~~~~__ooooo##ooooo__~~~~~~~',
  '~~~~~~~___oooo##oooo___~~~~~~~',
  '~~~~~~~_______##_______~~~~~~~',
  '~~~~~~O~~~~~~~~~~~~~~~~O~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
];
/** Size of one grid cell in map units (a lane is one cell wide). */
export const NEXUS_CELL = 6;
/** Heights: the upper deck, the raised central platform (the lower floor is 0). */
export const NEXUS_DECK = 10;
export const NEXUS_PLATFORM = 12;
/** Center of grid cell (col 0 = A, row 1 = top). */
export const nexusCell = (col, row) => [(col - 14.5) * NEXUS_CELL, (row - 10.5) * NEXUS_CELL];
/** The grid character at map point (x, z) ('~' off the grid). */
export function nexusAt(x, z) {
  const col = Math.floor(x / NEXUS_CELL + 15);
  const row = Math.floor(z / NEXUS_CELL + 10); // 0-based row index
  return NEXUS_GRID[row]?.[col] ?? '~';
}

/**
 * Twilight Nexus's four lanes. Lane 1 (row 10) and lane 2 (row 11) leave the west portal over the
 * bridge; at the ring lane 1 goes round the north side and up the spine (column O), lane 2 round
 * the south side and down it. Each drops down a ramp along the open deck edge onto the lower
 * floor, runs back along column H and then under its own bridge to the exits under the central
 * platform (N10 / N11). Lanes 3 and 4 are the mirror image from the east portal (column P, W,
 * exits Q10 / Q11). All four are the same length.
 */
function nexusRoutes() {
  const D = NEXUS_DECK;
  const c = (col, row, y) => [...nexusCell(col, row), y];
  const west = (r, ringRow, edgeRow) => [
    c(1, r, D), // portal B
    c(11, r, D), // onto the ring (column L)
    c(11, ringRow, D), // round the ring's west side
    c(14, ringRow, D), // along its north / south side to the spine (column O)
    c(14, edgeRow, D), // out along the spine to the deck edge
    c(13, edgeRow, D), // the ramp starts where the deck opens up
    c(8, edgeRow, 0), // ...and lands on the lower floor
    c(7, edgeRow, 0), // column H
    c(7, r, 0), // back along the open edge
    c(13, r, 0), // under the bridge and the ring to the exit (column N)
  ];
  const mirror = (pts) => pts.map(([x, z, y]) => [-x, z, y]);
  const l1 = west(10, 7, 3);
  const l2 = west(11, 13, 18);
  return [l1, l2, mirror(l1), mirror(l2)];
}

const NEXUS_ROUTES = nexusRoutes();

/**
 * Sunset Crossing: the top-down grid from the spec, one character per cell (columns A-AN, rows
 * 1-23, north = top). S spawn cave, B base cave, # road, + central crossing tile, = bridge over the
 * crater, - unused / blocked road stub, | yellow barrier, W brick wall, * crater, , grass,
 * y yellow hill, r rock dome, f flagstone plateau, d orange dirt terraces, b dark brown ground,
 * C castle, ^ cliff / high rock, o white boulders, T tree, t dead tree, L candle tower, M statue,
 * P grey spawn-point pad, X wooden crate, G blue glass tower, H wooden trestle.
 */
export const CROSS_GRID = [
  '^^^^^,,,M,,,,,,,,,,^dddddddddddddddddddd',
  '^^^^^yyyyyyyyyyyyy,Bddddtddtdddddddddddd',
  '^^^^^yyyyyyyyPrryy,#ffffffddMddtddddLddd',
  ',,,,,yyyyyXyyWrryy,#ffffffdddddddddddddd',
  ',,,,,yyyyyyyyrrryyW#WWWfffdddddddddddddd',
  ',,,,,yyyyyyyyrrryyT#ffffffdddd^^^^^^^^^^',
  ',,,,,yyyyyyyWrXryy,#ffffffdddd^^^^^^^^^^',
  ',,,,,yyyyyyyyrrryyT#ffffXfdddd^^^^^^^^^^',
  ',,,,,yyyyyyyyyyyyy,#fffLffdddt^^^^^^^^^^',
  ',,,,oyyyyyyyyyyyyyT#ffffXfPddd^^^^^^^^^^',
  ',,T,oyyyyyyyyyyyyy,#ffffffdddd^^^^^^^^^^',
  ',,,,oooo,,,T,,,****#ffffffdddd^^^^^^^^^^',
  ',,,Toooo,---|##===#+##########S^^^^^^^^^',
  ',,,,oooo,,,,,#,****#bbbbbbbbbb^^^^^^^^^^',
  ',,,,,,,,,T,P,#,****#bbCCCCCCCC^^^^^^^^^^',
  ',,,,oooo,,,,,#,,,,T#bbCCCCCCCC^^^^^^^^^^',
  ',,,,oooo,,,,,###,,,#bbCCCCCCCC^^^^^^^^^^',
  ',,,,,,,,T,GGGGG#,,T#bbCCCCCCCC^^^^^^^^^^',
  ',,,,oooo,,GGGGG#####bbCCCCCCCCCCbbbbbbbb',
  ',,,,oooo,,GGGGG,,,TWbbCCCCCCCCCCbbbbHHHH',
  ',,,,,,,,,,GGGGG,T,,-bbCCCCCCPCCCbbbbHHHH',
  ',,,,oooo,TGGGGG,,,,-bbCCCCCCCCCCbbbbHHHH',
  ',,,,oooo,,,,,,,,,,,-bbCCCCCCCCCCbbbbHHHH',
];
/** Size of one grid cell in map units (the road is one cell wide; 1 cell = about 8.75 studs). */
export const CROSS_CELL = 5;
/** Center of grid cell (col 0 = A, row 1 = top). */
export const crossCell = (col, row) => [(col - 19.5) * CROSS_CELL, (row - 12) * CROSS_CELL];
/** Grid indices (col, row index 0 = row 1) of map point (x, z). */
export const crossIdx = (x, z) => [Math.floor(x / CROSS_CELL + 20), Math.floor(z / CROSS_CELL + 11.5)];
/** The grid character at (col, row index), ' ' off the plateau. */
export const crossCh = (c, i) => CROSS_GRID[i]?.[c] ?? ' ';

// Decorations standing on a cell (the ground under them is their lowest neighbour's) and the
// road characters.
const CROSS_PROPS = 'TtLMPXW';
export const CROSS_ROAD = '#+=-|SB';
/** Height of the orange dirt terraces: jagged steps rising to the east. */
const terraceH = (c, i) => (c < 31 - (i % 3 === 0 ? 1 : 0) ? 4 : c < 35 + (i % 2) ? 6.5 : 9);
/** Height of the high rock: the brown NW ledges, the north cliff over the base and the grey east cliff. */
const rockH = (c) => (c < 5 ? 8 : c < 25 ? 12 : 14);
function rawH(k, c, i) {
  if (k === 'y') return 6;
  if (k === 'r') return 9;
  if (k === 'f') return 1.5;
  if (k === 'd') return terraceH(c, i);
  if (k === '^') return rockH(c);
  if (k === '*' || k === 'C' || k === '=') return -1; // the crater (under the bridge too) and the sunken castle
  return 0;
}
/** The terrain under cell (c, i): its own character, or for a decoration the lowest neighbouring terrain. */
export function crossGround(c, i) {
  const k = crossCh(c, i);
  if (!CROSS_PROPS.includes(k)) return k;
  let best = null;
  let bh = Infinity;
  for (const [dc, di] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const n = crossCh(c + dc, i + di);
    if (n === ' ' || CROSS_PROPS.includes(n)) continue;
    const h = rawH(n, c + dc, i + di);
    if (h < bh) {
      bh = h;
      best = CROSS_ROAD.includes(n) ? '#' : n;
    }
  }
  return best ?? ',';
}
/** Ground height of cell (c, i). */
export const crossH = (c, i) => rawH(crossGround(c, i), c, i);
/**
 * What may be built on cell (c, i): 'ground' (grass, dark ground, flagstone, pads), 'cliff' (the
 * hills, domes, terraces and high rock) or null (road, crater, castle, boulders, props).
 */
export function crossKind(c, i) {
  const k = crossCh(c, i);
  if (k !== 'P' && CROSS_PROPS.includes(k)) return null;
  const g = crossGround(c, i);
  if (',bf'.includes(g)) return 'ground';
  if ('yrd^'.includes(g)) return 'cliff';
  return null;
}
/** Every floor height a tower can stand on (highest first), for mouse picking. */
export const CROSS_FLOORS = [14, 12, 9, 8, 6.5, 6, 4, 1.5];

/**
 * Sunset Crossing's road from the spawn cave (AE13) to the base cave (T2): west through the
 * crossing and over the bridge, the zig-zag loop in the south-west, then north up column T through
 * the crossing a second time.
 */
const CROSS_ROUTE = [[30, 13], [13, 13], [13, 17], [15, 17], [15, 19], [19, 19], [19, 2.4]].map(([c, r]) => crossCell(c, r));

/**
 * Shattered Court: the top-down grid from the spec, one character per cell (columns A-AN, rows
 * 1-41, north = top). S spawn portal, B castle base, # the default route, o light tile, x dark
 * tile, . void. A tile is light when column number + row number is odd (A = 1).
 */
export const COURT_GRID = [
  '...................S....................',
  '...................#o...................',
  '...............oxo.#x...................',
  '.............xoxox.#o.ox................',
  '.............oxoxo.#x.xoxo..............',
  '.............xoxoxo#oxox.xoxo...........',
  '..........xoxoxox###x.xoxoxox...........',
  '..........oxoxoxo#...xoxoxoxo...........',
  '........x.xo...o.#xoxo..x.xox..ox.......',
  '........o.ox...xo#oxoxoxoxoxoxoxo.......',
  '......xo.ox...xox#xoxoxoxoxox..ox.......',
  '......oxoxo...oxo#oxoxoxoxoxox.xox......',
  '....xox..ox...xo##x.....xoxoxoxoxoxox...',
  '.xoxoxoxoxoxoxox#......xoxo.oxoxox..ox..',
  '.oxoxoxoxoxoxoxo#......oxoxoxoxoxoxoxox.',
  '.xo.oxox..oxox.x#......xoxox...xoxoxoxo.',
  '.oxoxoxo..xoxoxo#......ox.xoxoxox.xoxox.',
  '..oxoxo....xoxox#......xo.oxoxox.xoxo...',
  '..xoxoxox.xo..xo#......oxoxoxoxo.oxox.x.',
  '.......xoxox..ox#x....oxo....xo..xoxoxo.',
  '......xoxoxoxoxo#.xoxoxox....oxoxo....x.',
  '........oxoxox.x#xoxoxoxox....oxox...x..',
  '..........xox..o#oxox.xoxo....xo........',
  '..........oxo..x#xoxo.oxoxoxoxo.........',
  '..........xoxoxo#oxox.xoxoxoxox.........',
  '...........xoxox#...oxoxoxoxox..........',
  '............xoxo#ox.xoxoxo..............',
  '.............xox#xo.oxoxox..............',
  '................##xoxoxox...............',
  '.................##xoxox................',
  '..................#oxox.................',
  '.................x#xox..................',
  '.................o#oxo..................',
  '.................x#xox..................',
  '..................#ox...................',
  '..................#xo...................',
  '..................##x...................',
  '...................#....................',
  '...................#....................',
  '...................#....................',
  '...................B....................',
];
/** Size of one checker tile in map units (enemies walk one tile wide). */
export const COURT_CELL = 4;
/** Center of grid cell (col 0 = A, row 1 = top). Column T is x = 0, row 21 is z = 0. */
export const courtCell = (col, row) => [(col - 19) * COURT_CELL, (row - 21) * COURT_CELL];
/** Grid indices (col, row index 0 = row 1) of map point (x, z). */
export const courtIdx = (x, z) => [Math.floor(x / COURT_CELL + 19.5), Math.floor(z / COURT_CELL + 20.5)];
/** Is cell (c, i) a floor tile? */
export const courtTile = (c, i) => 'ox#'.includes(COURT_GRID[i]?.[c] ?? '.');
/** Is tile (c, i) a light one? */
export const courtLight = (c, i) => (c + 1 + i + 1) % 2 === 1;
/** Tiles with a prop standing on them ([col, row index]): violet crystals and card stacks. */
export const COURT_CRYSTALS = [[13, 9], [5, 15], [9, 20], [25, 10], [27, 13]]; // N10 F16 J21 Z11 AB14
export const COURT_CARDS = [[13, 5], [29, 17], [30, 18], [31, 19]]; // N6, AD18-AF20
/** Tiles that never hold a tower: the entry neck (T2, U2) and the exit neck (T38-T40). */
export const COURT_NOBUILD = [[19, 1], [20, 1], [19, 37], [19, 38], [19, 39]];

const COURT_START = [19, 1]; // T2
const COURT_END = [19, 39]; // T40
const COURT_MIN = 36; // 80% of the 45-tile default route
const COURT_MAX = 68; // 150% of it, rounded up
const COURT_RUN = 6; // most steps in one direction before the walk must turn
const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];

/** The default route (the '#' tiles), in order from T2 to T40. */
function courtDefault() {
  const out = [COURT_START];
  const seen = new Set([COURT_START.join()]);
  for (;;) {
    const [c, i] = out[out.length - 1];
    const next = DIRS.map(([dc, di]) => [c + dc, i + di]).find(([c2, i2]) => COURT_GRID[i2]?.[c2] === '#' && !seen.has(`${c2},${i2}`));
    if (!next) return out;
    seen.add(next.join());
    out.push(next);
  }
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One game's random route on the Shattered Court checkerboard (the spec's randomized depth-first
 * search with backtracking): a self-avoiding walk of orthogonal steps from T2 to T40, 36-68 tiles
 * long, never more than 6 steps straight, over floor tiles only (not the prop tiles).
 *
 * Each of up to 50 attempts picks 0-2 random waypoints the walk must pass through in order (so
 * routes swing out to the wings instead of all hugging the middle), draws a target length T, then
 * walks with freshly shuffled neighbours, skipping any that can't still finish within T tiles
 * (BFS distances to the next waypoint plus the legs after it), and backtracks at dead ends. An
 * attempt gives up after 50,000 steps; if every attempt fails it uses the default route.
 * Deterministic for a seed, so every player builds the same route. Returns [[col, row index], ...].
 */
export function courtTiles(seed) {
  const W = 40;
  const H = COURT_GRID.length;
  const id = (c, i) => i * W + c;
  const blocked = new Set([...COURT_CRYSTALS, ...COURT_CARDS].map(([c, i]) => id(c, i)));
  const open = (c, i) => c >= 0 && c < W && i >= 0 && i < H && courtTile(c, i) && !blocked.has(id(c, i));
  const openTiles = [];
  for (let i = 0; i < H; i++) for (let c = 0; c < W; c++) if (open(c, i)) openTiles.push([c, i]);
  /** Steps from every open tile to `to` (-1 = can't get there). */
  const bfs = (to) => {
    const dist = new Int16Array(W * H).fill(-1);
    const q = [to];
    dist[id(...to)] = 0;
    for (let k = 0; k < q.length; k++) {
      const [c, i] = q[k];
      for (const [dc, di] of DIRS) {
        const c2 = c + dc;
        const i2 = i + di;
        if (open(c2, i2) && dist[id(c2, i2)] < 0) {
          dist[id(c2, i2)] = dist[id(c, i)] + 1;
          q.push([c2, i2]);
        }
      }
    }
    return dist;
  };
  const toEnd = bfs(COURT_END);
  if (toEnd[id(...COURT_START)] < 0) return courtDefault();
  const fromStart = bfs(COURT_START);
  const pick = rng(seed);
  for (let attempt = 0; attempt < 50; attempt++) {
    // Waypoints: none, one, or two (the first in the upper half, the second lower down), only
    // where the route can still fit, favouring tiles out towards the wings so it swings wide.
    const roll = pick();
    const n = roll < 0.12 ? 0 : roll < 0.45 ? 1 : 2;
    const goals = [];
    const weight = ([c]) => (Math.abs(c - 19) + 1) ** 1.5;
    const choose = (list) => {
      let r = pick() * list.reduce((t, b) => t + weight(b), 0);
      return list.find((b) => (r -= weight(b)) <= 0) ?? list[list.length - 1];
    };
    if (n === 1) {
      const band = openTiles.filter(([c, i]) => i >= 6 && i <= 30 && fromStart[id(c, i)] + toEnd[id(c, i)] <= COURT_MAX - 6);
      goals.push(choose(band));
    } else if (n === 2) {
      const band = openTiles.filter(([c, i]) => i >= 4 && i <= 17 && fromStart[id(c, i)] + toEnd[id(c, i)] <= COURT_MAX - 14);
      const w1 = choose(band);
      const d1 = bfs(w1);
      const base = fromStart[id(...w1)];
      const band2 = openTiles.filter(([c, i]) => i >= 14 && i <= 31 && d1[id(c, i)] > 4 && base + d1[id(c, i)] + toEnd[id(c, i)] <= COURT_MAX - 6);
      goals.push(w1);
      if (band2.length) goals.push(choose(band2));
    }
    goals.push(COURT_END);
    const dists = goals.map((g) => (g === COURT_END ? toEnd : bfs(g)));
    // after[k]: shortest steps from goal k to the end through the goals after it.
    const after = goals.map(() => 0);
    for (let k = goals.length - 2; k >= 0; k--) after[k] = after[k + 1] + dists[k + 1][id(...goals[k])];
    const shortest = 1 + dists[0][id(...COURT_START)] + after[0];
    if (shortest > COURT_MAX) continue;
    const lo = Math.max(COURT_MIN, shortest);
    const T = lo + Math.floor(pick() * (COURT_MAX - lo + 1));
    const shuffled = () => {
      const o = [0, 1, 2, 3];
      for (let k = 3; k > 0; k--) {
        const j = Math.floor(pick() * (k + 1));
        [o[k], o[j]] = [o[j], o[k]];
      }
      return o;
    };
    // The walk: each frame is a tile, the direction it was entered by, its straight run so far,
    // which goal it is heading for, and its shuffled neighbour order with how many were tried.
    const on = new Uint8Array(W * H);
    const walk = [{ c: COURT_START[0], i: COURT_START[1], dir: 0, run: 1, g: 0, order: shuffled(), k: 0 }]; // entered heading south from the portal
    on[id(...COURT_START)] = 1;
    let steps = 0;
    while (walk.length && steps < 50000) {
      const top = walk[walk.length - 1];
      if (top.g === goals.length) {
        if (walk.length >= COURT_MIN) return walk.map((f) => [f.c, f.i]);
        on[id(top.c, top.i)] = 0;
        walk.pop();
        continue;
      }
      if (top.k >= 4) {
        on[id(top.c, top.i)] = 0; // dead end: back up one tile
        walk.pop();
        continue;
      }
      const d = top.order[top.k++];
      const c2 = top.c + DIRS[d][0];
      const i2 = top.i + DIRS[d][1];
      if (!open(c2, i2) || on[id(c2, i2)]) continue;
      const run = d === top.dir ? top.run + 1 : 1;
      if (run > COURT_RUN) continue;
      const left = dists[top.g][id(c2, i2)];
      if (left < 0 || walk.length + 1 + left + after[top.g] > T) continue;
      // T40 is only the finish: never pass through it early.
      const g = left === 0 ? top.g + 1 : top.g;
      if (c2 === COURT_END[0] && i2 === COURT_END[1] && g !== goals.length) continue;
      steps++;
      on[id(c2, i2)] = 1;
      walk.push({ c: c2, i: i2, dir: d, run, g, order: shuffled(), k: 0 });
    }
  }
  return courtDefault();
}

/** The corner points of a walk over court tiles, from the portal (T1) to the castle gate (T41). */
export function courtPoints(tiles) {
  const cells = [[19, 0], ...tiles, [19, 40]];
  const pts = [];
  cells.forEach(([c, i], k) => {
    const prev = cells[k - 1];
    const next = cells[k + 1];
    // Keep the ends and every corner.
    if (!prev || !next || (prev[0] === c) !== (next[0] === c)) pts.push(courtCell(c, i + 1));
  });
  return pts;
}

/** A court tile's number (col + row index * 40). */
export const courtId = (c, i) => i * 40 + c;

/**
 * The Last Laugh contract's open court: the shortest walk from T2 to T40 over floor tiles that
 * aren't props or in `blocked` (a Set of courtId numbers), or null if the base is walled off.
 * Ties go to the walk with the fewest turns, so the route doesn't zigzag. `dist` (optional,
 * filled in) gets every tile's steps to T40.
 */
export function courtShortest(blocked, dist = null) {
  const W = 40;
  const H = COURT_GRID.length;
  const props = new Set([...COURT_CRYSTALS, ...COURT_CARDS].map(([c, i]) => courtId(c, i)));
  const open = (c, i) => c >= 0 && c < W && i >= 0 && i < H && courtTile(c, i) && !props.has(courtId(c, i)) && !blocked.has(courtId(c, i));
  if (!open(...COURT_START) || !open(...COURT_END)) return null;
  const d = dist ?? new Int16Array(W * H);
  d.fill(-1);
  const q = [COURT_END];
  d[courtId(...COURT_END)] = 0;
  for (let k = 0; k < q.length; k++) {
    const [c, i] = q[k];
    for (const [dc, di] of DIRS) {
      const c2 = c + dc;
      const i2 = i + di;
      if (open(c2, i2) && d[courtId(c2, i2)] < 0) {
        d[courtId(c2, i2)] = d[courtId(c, i)] + 1;
        q.push([c2, i2]);
      }
    }
  }
  if (d[courtId(...COURT_START)] < 0) return null;
  const out = [COURT_START];
  let dir = 0; // heading south from the portal
  for (;;) {
    const [c, i] = out[out.length - 1];
    const left = d[courtId(c, i)];
    if (left === 0) return out;
    const order = [dir, 0, 1, 2, 3];
    const k = order.find((n) => {
      const c2 = c + DIRS[n][0];
      const i2 = i + DIRS[n][1];
      return open(c2, i2) && d[courtId(c2, i2)] === left - 1;
    });
    dir = k;
    out.push([c + DIRS[k][0], i + DIRS[k][1]]);
  }
}

const courtCache = new Map();
/**
 * Shattered Court's route for one game: from the portal (T1) over the tiles to the castle gate
 * (T41), as corner points. `tiles` is the walked tiles in order (for the gold path and arrows).
 */
export function courtRoute(seed) {
  if (courtCache.has(seed)) return courtCache.get(seed);
  const tiles = courtTiles(seed);
  const cells = [[19, 0], ...tiles, [19, 40]];
  const out = { tiles, path: courtPoints(tiles) };
  if (courtCache.size > 32) courtCache.clear();
  courtCache.set(seed, out);
  return out;
}


/**
 * Ember Keep: the top-down grid from the spec, one character per cell (columns A-AD, rows 1-22,
 * north = top). S spawn (the keep's gate), B base, # path, = drawbridge, V volcano cone,
 * C the dark keep on its rock mass, . stone or rock ground, ~ lava.
 */
export const EMBER_GRID = [
  '~~~~~~~~~~~~~~~~~~~~....~~~~~~',
  '~~~~~~~~~~~~~~~~~~.......~~~~~',
  '~~~~~~~~~~~~~~~~~....##...~~~~',
  '~~~~~~~~~.....~~~..#####..~~~~',
  '~~~~~~~~.......~...#...#..~~~~',
  'CCCC......###.....##..##..~~~~',
  'CCCC.~~~~##.##...##..##...~~~~',
  'CCCCS====#.V.#..##.###...~~~~~',
  'CCCC.~~~~#...####..#....~~~~~~',
  'CCCC.....##.##.....#...~~~~~~~',
  'CCCC~~~...##.......#..~~~~~~~~',
  '~~~~~~~~....####...#...~~~~~~~',
  '~~~~~~~~~..##..#...##..~~~~~~~',
  '~~~~~~~~...#...#....#..~~~~~~~',
  '~~~~~~~~..#....##...#..~~~~~~~',
  '~~~~~~~~..#.....#####..~~~~~~~',
  '~~~~~~~~..#..~.........~~~~~~~',
  '~~~~~~~~..#..~~.......~~~~~~~~',
  '~~~~~~~~..#..~~~~~~~~~~~~~~~~~',
  '~~~~~~~~..#..~~~~~~~~~~~~~~~~~',
  '~~~~~~~~..B..~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~...~~~~~~~~~~~~~~~~~~',
];
/** Size of one grid cell in map units (the path is one cell wide; 1 cell = about 4 studs). */
export const EMBER_CELL = 5;
/** Center of grid cell (col 0 = A, row 1 = top); fractional cells are fine. */
export const emberCell = (col, row) => [(col - 14.5) * EMBER_CELL, (row - 11.5) * EMBER_CELL];
/** Grid indices (col, row index 0 = row 1) of map point (x, z). */
export const emberIdx = (x, z) => [Math.floor(x / EMBER_CELL + 15), Math.floor(z / EMBER_CELL + 11)];
/** The grid character at (col, row index), '~' (lava) off the grid. */
export const emberCh = (c, i) => EMBER_GRID[i]?.[c] ?? '~';
/** Centre of the volcano cone, in the middle of the octagon ring (cells J6-N11). */
export const EMBER_VOLCANO = emberCell(11, 8.5);
/** Small round lava pits in stone rims on the platforms ([col, row], radius in units). */
export const EMBER_POOLS = [[21, 5.2, 2], [8.6, 15, 1.6], [8.4, 20.6, 1.8]];

/**
 * Ember Keep's two routes, the same except around the volcano: from the keep's gate (E8) over
 * the drawbridge into the octagon ring at J, round its north half (route 0) or south half (route
 * 1), out at N and east along row 9, up the 45-degree bends into the north-east loop (clockwise),
 * back across its neck and down column T, round the south loop, over the S-bend and straight
 * south down column K to the base gate (K21). Traced from the grid's '#' cells.
 */
function emberRoutes() {
  const before = [[4, 8], [8, 8], [9, 8.5]];
  const north = [[9, 7.5], [10, 6], [12, 6], [13, 7.5]];
  const south = north.map(([c, r]) => [c, 17 - r]); // mirrored across row 8.5
  const after = [
    [13, 8.5], [14, 9], [16, 9], // east along row 9
    [19, 6], [19, 4.5], [20.5, 3], [22.5, 3], [23.5, 4.5], [23.5, 5.5], // round the north-east loop
    [22, 7], [20, 8], [19, 9], [19, 12.5], [20, 13.5], [20, 16], // across the neck, down column T
    [16.5, 16], [15.5, 15], [15.5, 12.5], [14.5, 12], [12.5, 12], // the south loop and the S-bend
    [11, 13.5], [11, 14], [10, 15], [10, 21], // down column K to the base
  ];
  return [north, south].map((ring) => [...before, ...ring, ...after].map(([c, r]) => emberCell(c, r)));
}
const EMBER_ROUTES = emberRoutes();

/**
 * Midnight Rampart: the top-down grid from the spec, one character per cell (columns A-AB, rows
 * 1-28, north = top). S spawn cave, B base tunnel, # road, = road on the bridge, _ sewer channel,
 * W border wall, G gate opening, . orange ground, ^ dark rock cliff or outcrop, ~ pond, K crane,
 * M mineshaft hill, m mine scaffold and cart, R rocks or ruins, : dirt strip, s sand pile,
 * b billboard, H house, D dark-roofed building, P gas station apron, V military vehicles,
 * - side road, t storage tank.
 */
export const RAMPART_GRID = [
  '^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
  '^^^^^^^^WW^^^^^KKKKKK^^^^^^^',
  '^^^^^^^^WW.....KKKKKK^^^^^^^',
  '^^^^^^^.WW.....KKKKKK...^^^^',
  '^^^^^^^.WW.....KKKKKK...^^^^',
  '^^^^^^^.WW..............sss^',
  '^^^^^^^.WW#=======######sss^',
  '^^^^~~~~WW#_______.MMMM#sss^',
  '^^^^~~~~WW#...RR...MMMM#sss^',
  '^^^^~~~~WW#........MMMM#sss^',
  '^^^^~~~~WW#..######MMMM#sss^',
  '^^^^^^^.WW#..#....#mmmm#...^',
  '^^^^^^^.WW#..#....#mmmm#...^',
  '^^....R.WW#..#::R.#....#...^',
  '^^......WW#..#::R.#....#bbb^',
  'S#######WW#..#::R.#....#...^',
  '^^.....#WW####::R.#....#HHH^',
  '^^.....#WW.RRR:::.#....#HHH^',
  '^^.....#WW.RRR:::.#....#HHH^',
  '^^.....#WW.RRR:::.#....#...^',
  '^^.....#GG........#....#DDD.',
  '^^.....#GG#########....#DDD.',
  '^^^^^^^^WWRR...........#DDD.',
  '^^^^^^^^WWRR....PPPPPPP#---.',
  '^^^^^^^^WWRR....PPPPVVV#.t..',
  '^^^^^^^^WW......PPPPVVV#.t..',
  '^^^^^^^^WW^^^^^^PPPPVVV#^^^^',
  '^^^^^^^^WW^^^^^^^^^^^^^B^^^^',
];
/** Size of one grid cell in map units (the road is one cell wide; 1 cell = 3 studs). */
export const RAMPART_CELL = 4;
/** Center of grid cell (col 0 = A, row 1 = top); fractional cells are fine. */
export const rampartCell = (col, row) => [(col - 13.5) * RAMPART_CELL, (row - 14.5) * RAMPART_CELL];
/** Grid indices (col, row index 0 = row 1) of map point (x, z). */
export const rampartIdx = (x, z) => [Math.floor(x / RAMPART_CELL + 14), Math.floor(z / RAMPART_CELL + 14)];
/** The grid character at (col, row index), '^' (rock) off the grid. */
export const rampartCh = (c, i) => RAMPART_GRID[i]?.[c] ?? '^';
export const RAMPART_ROAD = '#=SB';
export const RAMPART_WALL = 14; // the border wall's walkable top (spec: 12-15 studs)
export const RAMPART_HILL = 8; // the mineshaft hill (spec: 6-10 studs)
export const RAMPART_CLIFF = 12; // rock cells at the bowl's edge (the buildable ledges)
export const RAMPART_SAND = 2.5; // the sand pile's flattened top
/** The mineshaft hill's dark hollow (U9-V10). */
export const rampartHollow = (c, i) => (c === 20 || c === 21) && (i === 8 || i === 9);
/** Rock cell touching the bowl (a buildable ledge), not deep in the cliff. */
const rampartEdge = (c, i) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, di]) => {
  const n = RAMPART_GRID[i + di]?.[c + dc];
  return n != null && n !== '^';
});
/** Deep rock rises in jagged steps (decor heights, nothing builds there). */
const rampartJag = (c, i) => 14 + Math.round(Math.abs(Math.sin(c * 12.9898 + i * 78.233) * 43758.5453 % 1) * 3) * 2;
/** Ground height of cell (c, i): 0 for the bowl floor, raised for the wall / hill / rock / sand, sunken for water. */
export function rampartH(c, i) {
  const k = rampartCh(c, i);
  if (k === 'W') return RAMPART_WALL;
  if (k === 'M') return RAMPART_HILL;
  if (k === 's') return RAMPART_SAND;
  if (k === '^') return rampartEdge(c, i) ? RAMPART_CLIFF : rampartJag(c, i);
  if (k === '_') return -2.5;
  if (k === '~') return -0.6;
  return 0;
}
/**
 * What may be built on cell (c, i): 'ground' (orange ground, dirt, apron, sand pile), 'cliff'
 * (wall top, mineshaft hill, rock ledges), 'water' (the pond) or null (road, props, deep rock).
 */
export function rampartKind(c, i) {
  const k = rampartCh(c, i);
  if ('.:Ps'.includes(k)) return 'ground';
  if (k === 'W') return 'cliff';
  if (k === 'M') return rampartHollow(c, i) ? null : 'cliff';
  if (k === '^') return RAMPART_GRID[i]?.[c] != null && rampartEdge(c, i) ? 'cliff' : null;
  if (k === '~') return 'water';
  return null;
}
/** Every floor height a tower can stand on (highest first), for mouse picking. */
export const RAMPART_FLOORS = [RAMPART_WALL, RAMPART_CLIFF, RAMPART_HILL, RAMPART_SAND];

/**
 * Midnight Rampart's road: out of the spawn cave (A16) east to H16, down H beside the wall,
 * east through the gate on row 22, the nested S-bend (up S, west on 11, down N, west on 17),
 * up K beside the wall, east over the bridge on row 7 and down X to the base tunnel (X28).
 */
const RAMPART_ROUTE = [[-1.5, 16], [7, 16], [7, 22], [18, 22], [18, 11], [13, 11], [13, 17], [10, 17], [10, 7], [23, 7], [23, 29.5]].map(([c, r]) => rampartCell(c, r));

/**
 * Brook Hollow: the top-down grid from the spec, one character per cell (columns A-X, rows 1-18,
 * north = top). S spawn cave, B base cave, # stone path, b wooden plank bridge, g metal grate
 * bridge, . grass, = dry grassy stream channel, ~ water, ^ cliff, X rock block, * grass tufts.
 */
export const BROOK_GRID = [
  '^^^^^^^^^^^^^^^^SS^^^^^^',
  '^^^...############....^^',
  '^^^...############*...^^',
  '^^^...##*...XXX.......^^',
  '^^.XXX##..=##########.^^',
  '^^.XXX##==.##########.^^',
  '^^....bb.XX##.XX...##..^',
  '^^...=##.XX##.XX...##..^',
  '^....=##...##......##..^',
  '^...=.#######..*...##.*^',
  '^...=.#######......##..^',
  '^...~....*......*..##..^',
  '^..~......*...*....##..^',
  '^..~*......*.......##..^',
  'B##g#################..^',
  'B##g#################..^',
  '^~~~...................^',
  '^^^~^^^^^^^^^^^^^^^^^^^^',
];
/** Size of one grid cell in map units (spec: 4 studs; the path is 2 cells wide). */
export const BROOK_CELL = 4;
/** Center of grid cell (col 0 = A, row 1 = top); fractional cells are fine. */
export const brookCell = (col, row) => [(col - 11.5) * BROOK_CELL, (row - 9.5) * BROOK_CELL];
/** Grid indices (col, row index 0 = row 1) of map point (x, z). */
export const brookIdx = (x, z) => [Math.floor(x / BROOK_CELL + 12), Math.floor(z / BROOK_CELL + 9)];
/** The grid character at (col, row index), '^' (cliff) off the grid. */
export const brookCh = (c, i) => BROOK_GRID[i]?.[c] ?? '^';
export const BROOK_ROAD = '#bgSB';
/** The stream: the dry channel, the water and the two bridges laid over it. */
export const BROOK_STREAM = '=~bg';
/**
 * The free-standing rock blocks (the X cells), in cell units: centre (c, r), size (w, d), height.
 * The pair west of the first south run, the long slab, the central rock and the tall rock.
 */
export const BROOK_ROCKS = [
  { c: 3.75, r: 5.5, w: 1.5, d: 1.55, h: 8 },
  { c: 5.2, r: 5.55, w: 1.4, d: 1.45, h: 7 },
  { c: 13, r: 4, w: 3, d: 1, h: 5 },
  { c: 9.5, r: 7.5, w: 1.5, d: 1.5, h: 6 },
  { c: 14.5, r: 7.5, w: 1.75, d: 1.75, h: 10 },
];
/** The small pillar in front of the north cliff (U1) and the large mossy boulder by the base cave (A14). */
export const BROOK_PILLAR = brookCell(20, 1.25);
export const BROOK_BOULDER = brookCell(0.45, 14);
/** The rock block over map point (x, z), if any. */
export function brookRock(x, z) {
  return BROOK_ROCKS.find((k) => {
    const [cx, cz] = brookCell(k.c, k.r);
    return Math.abs(x - cx) <= (k.w * BROOK_CELL) / 2 && Math.abs(z - cz) <= (k.d * BROOK_CELL) / 2;
  });
}
/** Cliff cell touching the bowl (a buildable ledge), not deep in the cliff. */
const brookEdge = (c, i) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, di]) => {
  const n = BROOK_GRID[i + di]?.[c + dc];
  return n != null && n !== '^';
});
const brookHash = (c, i) => Math.abs((Math.sin(c * 12.9898 + i * 78.233) * 43758.5453) % 1);
/** The west shelf and the south slabs are lower than the north and east cliffs. */
const brookLow = (c, i) => c <= 1 || i >= 16;
/** Ledge heights (buildable), so the cliffs read as separate columns. */
const BROOK_LOW = [10, 12];
const BROOK_HIGH = [18, 20, 22];
export function brookH(c, i) {
  const k = brookCh(c, i);
  if (k === '^') {
    const set = brookLow(c, i) ? BROOK_LOW : BROOK_HIGH;
    const h = set[Math.floor(brookHash(c, i) * set.length)];
    return BROOK_GRID[i]?.[c] != null && brookEdge(c, i) ? h : h + 6 + Math.round(brookHash(i, c) * 3) * 2; // deep rock towers higher
  }
  if (k === '=') return -1.2;
  if (k === '~') return -1.8;
  return 0;
}
/** What may be built on cell (c, i): 'ground' (grass), 'cliff' (cliff ledges), 'water' or null. */
export function brookKind(c, i) {
  const k = brookCh(c, i);
  if (k === '.' || k === '*') return 'ground';
  if (k === '~') return 'water';
  if (k === '^') return BROOK_GRID[i]?.[c] != null && brookEdge(c, i) ? 'cliff' : null;
  return null;
}
/** Every floor height a tower can stand on (highest first), for mouse picking. */
export const BROOK_FLOORS = [...new Set([...BROOK_HIGH, ...BROOK_LOW, ...BROOK_ROCKS.map((k) => k.h)])].sort((a, b) => b - a);

/**
 * Brook Hollow's path (centre line of the 2-cell path): out of the north cave (Q1-R1), west on
 * rows 2-3, south down G-H over the plank bridge, east on rows 10-11, north up L-M round the
 * central rock, east on rows 5-6, south down T-U, then west on rows 15-16 over the grate bridge
 * into the base cave (A15-A16).
 */
const BROOK_ROUTE = [[16.5, 0], [16.5, 2.5], [6.5, 2.5], [6.5, 10.5], [11.5, 10.5], [11.5, 5.5], [19.5, 5.5], [19.5, 15.5], [-0.5, 15.5]].map(([c, r]) => brookCell(c, r));


/**
 * Rig Point (offshore oil rig): the top-down grid from the spec, one character per cell
 * (columns A-AJ, rows 1-33, north = top; 1 cell = 5 studs). S spawn door, B base (helicopter),
 * # path, = steel bridge, g unused green walkway, . grey deck, ~ ocean, X building, D derrick,
 * F flare, C containers, o white tanks, O dark round tanks, K crane base, M machinery, h helipad.
 */
export const RIG_GRID = [
  '~~~~~~~~~~~~~~~~~XXXXXXX~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~XXXXXXX~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~XXXXXXX~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~XXXXXXX~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~...S...~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~...=...~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~...=...~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~...=...~~~~~~~~~~~~',
  '~~~~~~~~~~K.........#...............',
  '~~~~~~~~~~.K........#.......ooooo...',
  '~~~~~~~~~~.......####...#######.....',
  '~~~~~~~~~~.......#......#.....#.....',
  '~~~~~~~~~~XX.....#......#CCCCC#.....',
  '~~~~~~~~~~XX..ogg#......#CCCCC#.OO..',
  '~~~~~~~~~~XX..oo.########CCCCC#.OO..',
  '~~~~~~~~~~XX..oo...g.....CCCCC#.OO..',
  '~~~~~~~~~~XX.......gDDDDDDDCCC#.OO..',
  '~~~~~~~~~~.....CC.CgDDDDDDDCCC#.....',
  '~~~~~~~~~~.........gDDDDFDD####.....',
  '~~~~~~~~~~....ggggggDDDDDDD#.....KK.',
  '~~~~~~~~~~....gCC...DDDDDDD#.CC..K..',
  '~~~~~~~~~~....gCC...DDDDDDD#.CC.....',
  '~~~~~~~~~oo.###............#.CXXXX..',
  'hhhhhhhhhoo.#.#....XXXXXXX.#..XXXXM.',
  'hhhhhhhhhoo.#.#....XXXXXXX.#..XXXXM.',
  'hhhhhhhhh~..#.#....XXXXXXX.#..XXXXM.',
  'hhhhhhhhh~..#.########.XX..###XXXX..',
  'hhhhB####==##XXXXOOOO#.XXCCCC#XXXX..',
  'hhhhhhhhh~...XXXXOOOO#.XXCCCC#XXXX..',
  'hhhhhhhhh~...XXXXXXXX#########......',
  'hhhhhhhhh~...XXXXXXXX..........XXXX.',
  'hhhhhhhhh~...XXXXXXXX..........XXXX.',
  'hhhhhhhhh~...XXXXXXXX...............',
];
export const RIG_CELL = 5;
/** Center of grid cell (col 0 = A, row 1 = top); fractional cells are fine. */
export const rigCell = (col, row) => [(col - 17.5) * RIG_CELL, (row - 17) * RIG_CELL];
/** Grid indices (col, row index 0 = row 1) of map point (x, z). */
export const rigIdx = (x, z) => [Math.floor(x / RIG_CELL + 18), Math.floor(z / RIG_CELL + 16.5)];
/**
 * The grid character at (col, row index), '~' (ocean) off the grid. The spec has the spawn bridge
 * (U6-U8) cross open water, so the '.' cells beside it on rows 6-8 count as ocean.
 */
export const rigCh = (c, i) => {
  const k = RIG_GRID[i]?.[c] ?? '~';
  return k === '.' && i >= 5 && i <= 7 ? '~' : k;
};
export const RIG_ROAD = '#=SB';
/** The sea, this far under the deck (spec: 15-20 studs). Water towers float on it. */
export const RIG_SEA = -15;
/** Ground height of cell (c, i): the deck, helipad and spawn platform are 0, the ocean is the sea. */
export const rigH = (c, i) => (rigCh(c, i) === '~' ? RIG_SEA : 0);
/** What may be built on cell (c, i): 'ground' (open deck and helipad), 'water' (the ocean) or null. */
export function rigKind(c, i) {
  const k = rigCh(c, i);
  if (k === '.' || k === 'h') return 'ground';
  if (k === '~') return 'water';
  return null;
}
/** Every floor height a tower can stand on (highest first), for mouse picking. */
export const RIG_FLOORS = [0, RIG_SEA];

/**
 * Rig Point's path: out of the spawn door (U5) south over the bridge, the loops round the deck's
 * north half, down the east side, back west along the south, up and round the small hook, then
 * west over the footbridge onto the helipad to the helicopter (E28).
 */
const RIG_ROUTE = [[20, 4.6], [20, 11], [17, 11], [17, 15], [24, 15], [24, 11], [30, 11], [30, 19], [27, 19], [27, 27], [29, 27], [29, 30], [21, 30], [21, 27], [14, 27], [14, 23], [12, 23], [12, 28], [4, 28]].map(([c, r]) => rigCell(c, r));


/**
 * Lantern Hill Cemetery (Halloween): a dark graveyard inside an iron fence, from a schematic
 * 20 x 16 grid (columns A-T, rows 1-16, north = top), 1 cell = 4 units. Column index c is 0 for
 * A; row r is the row number. Spawn T2 (north-east), base T13 (south-east).
 *
 *     ABCDEFGHIJKLMNOPQRST
 *  1  ....................
 *  2  .###########+######S
 *  3  .#.........#+#......
 *  4  .#.........###..^...
 *  5  .#########..........
 *  6  ......XXL#.++....^^.
 *  7  ...++.XX.#.++.......
 *  8  ...++..o.#..........
 *  9  ..^......#######....
 * 10  ...............#....
 * 11  ...++.......####....
 * 12  ...++.......#.......
 * 13  ............#######B
 * 14  ....................
 * 15  ^^................^^
 * 16  ^^................^^
 */
export const GRAVE_CELL = 4;
/** World [x, z] of grid cell (c, r) (fractions allowed). */
export const graveCell = (c, r) => [(c - 9.5) * GRAVE_CELL, (r - 8.5) * GRAVE_CELL];
const gc = (c, r) => graveCell(c, r);
const gxz = (c, r) => {
  const [x, z] = graveCell(c, r);
  return { x, z };
};
// T2 west, the C-curve round the grave (N2-N4-L4-L2), the long run west, the U-turn down column B,
// east along row 5, south down J, east along row 9, the double C-curve (P9-P11-M11-M13), east to T13.
const GRAVE_ROUTE = [[20.6, 2], [13, 2], [13, 4], [11, 4], [11, 2], [1, 2], [1, 5], [9, 5], [9, 9], [15, 9], [15, 11], [12, 11], [12, 13], [19.6, 13]].map(([c, r]) => gc(c, r));

/** The raised rock spots (cliff towers): the grid's '^' cells plus a few more where the grass is wide. */
const GRAVE_CLIFFS = [
  [16, 4, 3.4, 5], [17.5, 6, 4, 5.5], [2, 9, 3.4, 4.5], [0.5, 15.5, 4.5, 6], [18.5, 15.5, 4.5, 6],
  [5.5, 3.5, 3, 4], [7, 15, 3.4, 5], [17.5, 10.5, 3, 4.5], [5, 9.6, 3, 4], [8, 12.4, 3, 4.5],
].map(([c, r, rad, h]) => ({ ...gxz(c, r), r: rad, h }));

/** The hand-placed props: chapel, lanterns, pumpkins, graves, boulders, trees, the buildings and hills outside the fence. */
function graveFixed() {
  const out = [];
  // The chapel in the inside corner of the bend (G6-H7), door facing the row-5 path to the north.
  out.push({ kind: 'chapel', ...gxz(6.5, 6.6), rot: Math.PI, block: 5.4, box: [4.5, 3.5, 9] });
  out.push({ kind: 'gallows', ...gxz(7.6, 5.9), rot: 0, block: 0.7 }); // the tall lantern post at the path edge
  out.push({ kind: 'pumpkins', ...gxz(7.9, 7.2), rot: 0.4, block: 1.4, bh: 1.6 });
  // Gravestone clusters ('+' cells), and a few more along the south.
  for (const [c, r, w, d] of [[12, 2.5, 1, 2], [11.5, 6.5, 2, 2], [3.5, 7.5, 2, 2], [3.5, 11.5, 2, 2], [13, 15.3, 3, 1], [3.5, 14.5, 2, 1], [16.5, 1.1, 3, 1]]) {
    out.push({ kind: 'graves', ...gxz(c, r), w, d, seed: Math.round(c * 7 + r * 13), block: Math.hypot(w - 1, d - 1) * 1.25 + 1, bh: 1.7, box: [(w - 1) * 1.2 + 0.8, (d - 1) * 1.2 + 0.5, 1.7] });
  }
  // Small lanterns at head height along the paths (every other one is lit).
  [[4, 1.35], [9, 1.35], [17.5, 2.75], [0.3, 3.5], [4.5, 5.75], [13.8, 8.3], [10.4, 10.2], [16.2, 12.3], [6, 13.7]]
    .forEach(([c, r], i) => out.push({ kind: 'lantern', ...gxz(c, r), lit: i % 2 === 0, block: 0.6 }));
  // Tan boulders.
  [[8, 3.4, 1.4], [19, 9.6, 1.7], [0.8, 13.4, 1.5], [16.6, 15.7, 1.3], [14.3, 6.3, 1.2], [0.6, 10.4, 1.2]]
    .forEach(([c, r, s], i) => out.push({ kind: 'boulder', ...gxz(c, r), s, rot: i * 1.3, block: 1.3 * s, bh: 1.4 * s }));
  // Dark trees: a few inside the fence, a ring outside it.
  [[0.4, 7.2], [19.3, 7.6], [10.5, 15.6], [19.4, 4.8]].forEach(([c, r], i) => out.push({ kind: 'spooktree', ...gxz(c, r), s: 0.9 + (i % 3) * 0.12, rot: i * 2.1, v: i % 3, block: 0.8 }));
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + 0.07;
    const k = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1);
    const x = Math.round(Math.cos(a) * (54 + k * 12));
    const z = Math.round(Math.sin(a) * (44 + k * 8));
    if (x < -50 && Math.abs(z) < 26) continue; // the cathedral
    if (x > 44 && (Math.abs(z + 26) < 9 || Math.abs(z - 18) < 14 || Math.abs(z + 4) < 8)) continue; // spawn road, castle, bell tower
    out.push({ kind: 'spooktree', x, z, s: 1 + k * 0.5, rot: k * 6, v: i % 3 });
  }
  // The buildings outside the fence: the cathedral west, the bell tower east.
  out.push({ kind: 'cathedral', x: -64, z: -2, rot: 0 });
  out.push({ kind: 'belltower', x: 60, z: -5, rot: 0 });
  // A ring of low tan rock hills on the horizon.
  const n = 30;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = Math.abs((Math.sin(i * 78.233) * 43758.5453) % 1);
    out.push({ kind: 'mesa', x: Math.round(Math.cos(a) * 102), z: Math.round(Math.sin(a) * 82), r: 12 + Math.round(k * 7), h: 15 + Math.round(k * 10) });
  }
  out.push({ kind: 'clouds' }, { kind: 'fence' });
  return out;
}

/**
 * Halloween Night 2 (Halloween Event): a carnival at night, from the user's 28 x 20 grid
 * (columns A-AB, rows 1-20, north = top), 1 cell = 4 units. Column index c is 0 for A; row r is
 * the row number. Spawn B10 (the big tent's door), base Z9 (a blue car). One path with smooth
 * bends and a clockwise loop that crosses its own start at I10-J10 (flat, no bridge).
 *
 *    ABCDEFGHIJKLMNOPQRSTUVWXYZAB
 *  1 TT.........................T
 *  2 ............................
 *  3 PPPP.............L......T...
 *  4 PPPP.........#####..........
 *  5 PPPP........##...##.........
 *  6 PPPP.......##.....##..D.....
 *  7 ........s.##....s..#........
 *  8 XXX.......#........##.......
 *  9 XXX......##..L......#####BC.
 * 10 XS#########...........L.....
 * 11 XXX.s..##.##...k...k........
 * 12 XXX....#...###..............
 * 13 .....L##.....#......T.......
 * 14 ......#...T..#..............
 * 15 ..OOO.##.h.h.#..............
 * 16 ..OOO..#....##..............
 * 17 ..OOO..###.##...............
 * 18 ....WW...###................
 * 19 ....WW.....L..............TT
 * 20 T.........................TT
 */
export const CARN_CELL = 4;
/** World [x, z] of grid cell (c, r) (fractions allowed). */
export const carnCell = (c, r) => [(c - 13.5) * CARN_CELL, (r - 10.5) * CARN_CELL];
const cxz = (c, r) => {
  const [x, z] = carnCell(c, r);
  return { x, z };
};
/** Control points (cells) of the route; carnRoute() rounds them into smooth bends. */
const CARN_POINTS = [
  [0.6, 10], [4, 10], [7, 10], [9.2, 10], // out of the tent, east along row 10
  [10.4, 10.5], [11.4, 11.3], [12.3, 12.1], [13, 13], // bend south-east
  [13.2, 14.2], [13.2, 15.4], [12.8, 16.4], [12, 17.2], [11, 17.8], [10, 18], // down column N, round the bottom
  [9, 17.8], [8, 17.2], [7.2, 16.3], [6.6, 15.2], [6.4, 14], [6.7, 12.8], [7.4, 11.8], [8.2, 10.9], // up column G/H
  [8.9, 10], [9.6, 9], [10.1, 8], [10.6, 7], [11.4, 6], [12.4, 5], [13.5, 4.2], // over the start, north-east
  [14.6, 4], [16, 4], [17.2, 4.3], [18.2, 5.2], [19, 6.3], [19.5, 7.4], [20.2, 8.4], [21.2, 9], // the crest, bend south-east
  [23, 9], [24.7, 9], // east along row 9 to the car
];
/** Catmull-Rom through CARN_POINTS, cut into short straight pieces about 2 units long. */
function carnRoute() {
  const P = CARN_POINTS.map(([c, r]) => carnCell(c, r));
  const out = [P[0]];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[Math.min(P.length - 1, i + 2)];
    const n = Math.max(1, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 2));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}
const CARN_ROUTE = carnRoute();
/** Where the path crosses itself (I10-J10): the dirt rims leave a gap here. */
export const CARN_CROSS = carnCell(8.95, 10);

function carnFixed() {
  const out = [];
  // `block` keeps towers off (radius), `box` = [hx, hz, h] what players bump into.
  const solid = (c, r, block, box) => out.push({ kind: 'carnBlock', ...cxz(c, r), block, ...(box ? { box } : {}) });
  // The big red/white tent (A8-C12), its glowing door facing the path to the east.
  out.push({ kind: 'carnBigTent', ...cxz(1, 10) });
  for (const r of [8.3, 10, 11.7]) solid(1, r, 7, [6.4, 3.6, 20]);
  // The purple/black tent (A3-D6).
  out.push({ kind: 'carnPurpleTent', ...cxz(1.5, 4.5) });
  solid(1.5, 4.5, 8.5, [7.5, 7.5, 14]);
  // Rides: the Ferris wheel (C15-E17), the chair swing (E18-F19), the drop tower (W6).
  out.push({ kind: 'carnFerris', ...cxz(3, 16), block: 6.2, box: [5.5, 2.5, 22] });
  out.push({ kind: 'carnSwing', ...cxz(4.6, 18.6), block: 5, box: [1, 1, 12] });
  out.push({ kind: 'carnDrop', ...cxz(22, 6), block: 3.4, box: [2, 2, 32] });
  // Game stalls with balloons (E11, I7, Q7).
  [[4, 11.3, Math.PI / 2], [8, 7, 0], [16, 7, Math.PI]].forEach(([c, r, rot], i) => out.push({ kind: 'carnStall', ...cxz(c, r), rot, v: i, block: 2.4, box: [1.7, 1.7, 4] }));
  // Black lamp posts with warm lanterns along the path (every other one sheds real light).
  [[5, 13], [13, 9], [17, 3], [22, 10], [11, 19], [6, 8.8], [2.6, 7.2], [14.8, 6.2], [20.5, 4.6], [24.4, 10.8], [15.2, 15.5], [9.8, 3.6]]
    .forEach(([c, r], i) => out.push({ kind: 'carnLamp', ...cxz(c, r), lit: i % 2 === 0, block: 0.7 }));
  // Pennant strings on short posts: [c1, r1, c2, r2]. Some cross the path, high enough to walk under.
  [[3.2, 9.15, 7.6, 9.15], [21.9, 8.2, 21.9, 9.8], [14.3, 3.2, 17.2, 3.2], [11.3, 13.4, 14.9, 13.4], [5.6, 11, 5.6, 13]].forEach(([c1, r1, c2, r2]) => {
    const [x1, z1] = carnCell(c1, r1);
    const [x2, z2] = carnCell(c2, r2);
    out.push({ kind: 'carnPennants', x: x1, z: z1, x2, z2 });
    out.push({ kind: 'carnBlock', x: x1, z: z1, block: 0.6 }, { kind: 'carnBlock', x: x2, z: z2, block: 0.6 });
  });
  // Hay bales with pumpkins: the loop centre (J15, L15) and along the east run (P11, T11).
  [[9, 15.2, 0], [11.1, 15.4, 1], [15, 11.2, 2], [19, 11.1, 3], [7.6, 3.4, 4]].forEach(([c, r, v]) => out.push({ kind: 'carnHay', ...cxz(c, r), v, rot: v * 1.7, block: 1.8, bh: 1.6 }));
  // Low fences at the path edges near the loop: [c, r, rot (0 = along x), length].
  [[5.4, 14.2, Math.PI / 2, 8], [8.6, 19.15, 0, 7], [14.3, 15, Math.PI / 2, 8]].forEach(([c, r, rot, len], i) => {
    const { x, z } = cxz(c, r);
    out.push({ kind: 'carnFence', x, z, rot, len, metal: i === 1 });
    const along = rot ? [0, 1] : [1, 0];
    for (let d = -len / 2 + 1; d <= len / 2 - 1; d += 2) out.push({ kind: 'carnBlock', x: x + along[0] * d, z: z + along[1] * d, block: 0.7, box: [rot ? 0.2 : 1.1, rot ? 1.1 : 0.2, 1.2] });
  });
  // Trees on the playfield: the pine in the loop (K14) and the ones round the edges.
  [[10, 13.8, 'pine'], [0, 1, 'pine'], [1, 1, 'autumn'], [27, 1, 'pine'], [24, 3, 'autumn'], [20, 13, 'pine'], [26, 19, 'autumn'], [27, 19, 'pine'], [26, 20, 'pine'], [27, 20, 'autumn'], [0, 20, 'pine']]
    .forEach(([c, r, kind], i) => out.push({ kind: 'carnTree', ...cxz(c, r), pine: kind === 'pine', s: 0.9 + (i % 3) * 0.15, rot: i * 2.3, block: 1.6 }));
  // Dark woods beyond the edges, then purple-grey mountains on the horizon.
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const k = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1);
    out.push({ kind: 'carnTree', x: Math.round(Math.cos(a) * (64 + k * 14)), z: Math.round(Math.sin(a) * (50 + k * 12)), pine: i % 3 !== 1, s: 1.1 + k * 0.6, rot: k * 6 });
  }
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + 0.1;
    const k = Math.abs((Math.sin(i * 78.233) * 43758.5453) % 1);
    out.push({ kind: 'carnMountain', x: Math.round(Math.cos(a) * 150), z: Math.round(Math.sin(a) * 120), r: 26 + Math.round(k * 16), h: 26 + Math.round(k * 22) });
  }
  // The base: the blue car at the path end (Z9).
  out.push({ kind: 'carnCar', ...cxz(25.7, 9), rot: 0 });
  out.push({ kind: 'carnRims' });
  return out;
}

/**
 * Halloween Night 3 (Halloween Event): a sandy crater at dusk, from the user's 54 x 32 grid
 * (columns A-BB, rows 1-32, north = top), 1 cell = 4 units. Column index c is 0 for A, 26 for AA;
 * row r is the row number. Enemies leave the Nightmare Realm portal (A12-F22) at F16, the path
 * splits at J16 into a north branch and a south branch, they merge again at AJ15/AK15 and run
 * east to the corrupted supercomputer (the base, AX15-BB19). Four flat crossings: U16, X8, Y23,
 * AB23. All corners square.
 *
 *                              AAAAAAAAAAAAAAAAAAAAAAAAAABB
 *    ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZAB
 *  1 ...............ooooooo................................
 *  2 ...............o.....o....T.........%%%%..............
 *  3 ...............o.....o........###...%%%%..............
 *  4 ...............o.....o........#.#...%%%%..............
 *  5 ...............o.....o.####...#.##..%%%%..............
 *  6 ...............ooooooo.#..#...#..#..%%%%..............
 *  7 ...........r...........#..#...#..##...................
 *  8 ..............%%%%%%#######...#...#...................
 *  9 ..............%%%%%%#..#....###...#.....r.............
 * 10 ..............%%%%%%#..#....#.....###.................
 * 11 .........#####%%%%%%#..#.####.......#.................
 * 12 PPPPPP...#...#%%%%%%#..#.#..........#.................
 * 13 PPPPPP...#...#......#..#.#..........#.................
 * 14 PPPPPP...#...####...#..###..^^^^^...#.r...............
 * 15 PPPPPP...#......#...#......^^^^^^^.#############BCCCCC
 * 16 PPPPPS####......#########..^^^^^^^.#.............CCCCC
 * 17 PPPPPP...#..........#...#..^^^^^^^.#.............CCCCC
 * 18 PPPPPP...#.....####.#...#..r^^^^^..#.............CCCCC
 * 19 PPPPPP...#.....#..#.#...#..........#.%%%......r..CCCCC
 * 20 PPPPPP...#.....#..#.#...#..####....#.%%%..............
 * 21 PPPPPP...#######..#.#..r#..#..#....#.%%%..............
 * 22 PPPPPP............#.#...#..#..#....#.%%%..............
 * 23 ..................###.#########...##.%%%..............
 * 24 ...........r..........#.#..#......#..%%%..............
 * 25 ..................r...#.#..#......#..%%%..............
 * 26 ............ooooooooo.###..#####..#..%%%..............
 * 27 ............o.......o..........####..%%%..............
 * 28 ............o.......o................%%%..............
 * 29 ............o.......o................%%%..............
 * 30 ............o.......o................%%%..............
 * 31 ............o.......o................%%%..............
 * 32 ............ooooooooo.................................
 */
export const NM_CELL = 4;
/** World [x, z] of grid cell (c, r) (fractions allowed). */
export const nmCell = (c, r) => [(c - 26.5) * NM_CELL, (r - 16.5) * NM_CELL];
const nxz = (c, r) => {
  const [x, z] = nmCell(c, r);
  return { x, z };
};
// The two routes as corner cells. Both start in the portal mouth and share the run to the split
// (J16) and the run from AK15 to the computer, so those pieces are drawn once.
const NM_NORTH = [
  [4.5, 16], [9, 16], [9, 11], [13, 11], [13, 14], [16, 14], [16, 16], [24, 16], [24, 26], [22, 26], [22, 23],
  [30, 23], [30, 20], [27, 20], [27, 26], [31, 26], [31, 27], [34, 27], [34, 23], [35, 23], [35, 15], [36, 15], [48.5, 15],
];
const NM_SOUTH = [
  [4.5, 16], [9, 16], [9, 21], [15, 21], [15, 18], [18, 18], [18, 23], [20, 23], [20, 8], [26, 8], [26, 5], [23, 5],
  [23, 14], [25, 14], [25, 11], [28, 11], [28, 9], [30, 9], [30, 3], [32, 3], [32, 5], [33, 5], [33, 7], [34, 7],
  [34, 10], [36, 10], [36, 15], [48.5, 15],
];
const NM_ROUTES = [NM_NORTH, NM_SOUTH].map((r) => r.map(([c, row]) => nmCell(c, row)));

function nmFixed() {
  const out = [];
  // `block` keeps towers off (radius), `bh` = height players can stand on, `box` = [hx, hz, h].
  const solid = (c, r, block, extra) => out.push({ kind: 'nmBlock', ...nxz(c, r), block, ...extra });
  // The Nightmare Realm portal (A12-F22), its mouth facing east at F16.
  out.push({ kind: 'nmPortal', ...nxz(2.6, 16) });
  for (const r of [12.6, 15.2, 16.8, 19.4]) solid(2.6, r, 4.6, { box: [3.6, 2.6, 16] });
  // The corrupted supercomputer (AX15-BB19): the base.
  out.push({ kind: 'nmComputer', ...nxz(51, 16) });
  out.push({ kind: 'nmBlock', ...nxz(51, 16), box: [4.2, 7.2, 15] });
  // The hexagonal hill (AB14-AH18): about 3 high, players can walk on it; its flat top is a cliff top.
  const hill = nxz(30, 16);
  out.push({ kind: 'nmHill', ...hill, top: [6.5, 6, 3] });
  for (let dx = -12; dx <= 12; dx += 3) {
    for (let dz = -9; dz <= 9; dz += 3) {
      if (Math.abs(dz) / 9 + Math.abs(dx) / 24 > 1.05) continue;
      out.push({ kind: 'nmBlock', x: hill.x + dx, z: hill.z + dz, block: 2.4, bh: 3 });
    }
  }
  // Two shallow ring craters: rims of low rock (no towers on the rim, the middle is open).
  [[18, 3.5, 14], [16, 29, 18]].forEach(([c, r, rad], v) => {
    const { x, z } = nxz(c, r);
    out.push({ kind: 'nmRing', x, z, r: rad, v });
    const n = Math.round((Math.PI * 2 * rad) / 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      out.push({ kind: 'nmBlock', x: x + Math.cos(a) * rad, z: z + Math.sin(a) * rad, block: 1.6, bh: 1.6 });
    }
  });
  // Pale gravel patches (flat, towers allowed): [c1, r1, c2, r2].
  [[14, 8, 19, 12], [36, 2, 39, 6], [37, 19, 39, 31]].forEach(([c1, r1, c2, r2], v) => {
    const [x1, z1] = nmCell(c1 - 0.5, r1 - 0.5);
    const [x2, z2] = nmCell(c2 + 0.5, r2 + 0.5);
    out.push({ kind: 'nmGravel', x: (x1 + x2) / 2, z: (z1 + z2) / 2, w: x2 - x1, d: z2 - z1, v });
  });
  // Boulders on the floor (2-6 across).
  [[11, 7, 2.2], [40, 9, 2.6], [38, 14, 1.8], [46, 19, 2.4], [27, 18, 1.4], [23, 21, 1.6], [11, 24, 2], [18, 25, 1.5],
    [44, 3, 2.8], [50, 6, 3], [52, 10, 2.4], [49, 25, 3], [52, 29, 2.6], [45, 30, 2], [6, 4, 2.4], [3, 28, 2.6]]
    .forEach(([c, r, s], i) => out.push({ kind: 'nmRock', ...nxz(c, r), s, rot: i * 1.9, v: i, block: s + 0.4, bh: s * 1.1 }));
  // The dead forked tree at AA2.
  out.push({ kind: 'nmTree', ...nxz(26, 2), rot: 0.6, block: 1.2 });
  // Loose planks and boards on the floor.
  [[7, 9], [12, 18], [29, 28], [42, 12], [33, 1.5], [43, 23], [6, 26], [47, 1.5], [26, 31]]
    .forEach(([c, r], i) => out.push({ kind: 'nmPlanks', ...nxz(c, r), rot: i * 2.1, v: i, block: 1.4, bh: 0.5 }));
  // Small orange lamps on debris: the north-west top edge and east of the computer.
  [[4, 1.2], [9, 0.8], [53, 22]].forEach(([c, r], i) => out.push({ kind: 'nmLamp', ...nxz(c, r), lit: i !== 1, block: 1.2, bh: 1 }));
  // Off the grid, on the crater floor round it: burned houses, broken tracks, a truss, bones, a gate.
  [[-96, -76, 0.3, 1], [-74, -82, -0.2, 0.9], [-112, -60, 1.3, 0.8], [82, -78, 0.1, 1], [104, -70, -0.5, 0.85], [8, -104, 0, 1.6]]
    .forEach(([x, z, rot, s], v) => out.push({ kind: 'nmHouse', x, z, rot, s, v }));
  out.push({ kind: 'nmTrack', x: -98, z: 74, rot: 0.4 });
  out.push({ kind: 'nmTruss', x: -34, z: -94, rot: 0.15 });
  for (let i = 0; i < 7; i++) out.push({ kind: 'nmBones', x: 34 + i * 5.5, z: 69 + (i % 3) * 2.5, rot: i * 1.3, v: i });
  out.push({ kind: 'nmGate', x: -54, z: 71, rot: 0.3 });
  // The crater wall: stacked sandstone slabs all round, higher further out, plus a rock spire
  // with a dead tree on top to the north-east. The east floor rises in stacked plates past AN.
  for (let i = 0; i < 56; i++) {
    const a = (i / 56) * Math.PI * 2;
    const k = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1);
    out.push({ kind: 'nmCliff', x: Math.round(Math.cos(a) * (136 + k * 10)), z: Math.round(Math.sin(a) * (92 + k * 8)), h: 30 + Math.round(k * 10), w: 22 + k * 10, rot: a + Math.PI / 2, v: i });
  }
  for (let i = 0; i < 14; i++) {
    const k = Math.abs((Math.sin(i * 78.233) * 43758.5453) % 1);
    const z = -60 + i * 9.2;
    if (Math.abs(z + 6) < 14) continue; // keep clear of the computer
    out.push({ kind: 'nmCliff', x: 112 + k * 6, z, h: 4 + k * 6, w: 10 + k * 6, rot: Math.PI / 2 + k, v: i + 60 });
  }
  out.push({ kind: 'nmSpire', x: 122, z: -84 });
  return out;
}

// How hard a map is (MAPS[key].rating): its card in the menus is that color. Judged by eye from
// the path (long and winding is easy; short, split or random is hard) and how much room there is to build.
export const MAP_RATINGS = {
  easy: { name: 'Easy', color: '#43a047', rank: 0 },
  medium: { name: 'Medium', color: '#fb8c00', rank: 1 },
  hard: { name: 'Hard', color: '#e53935', rank: 2 },
  expert: { name: 'Expert', color: '#8e24aa', rank: 3 },
};
export const mapRating = (key) => MAP_RATINGS[mapDef(key).rating] ?? MAP_RATINGS.medium;

export const MAPS = {
  meadow: {
    name: 'Sunny Meadow',
    rating: 'easy',
    icon: '🌼',
    desc: 'A bright, easygoing meadow with a gently curving path. A good first map.',
    path: wave(),
    spawn: { x: 0, z: 22 },
    cliffs: [
      { x: -78, z: -15, r: 7, h: 5 },
      { x: -36, z: 15, r: 7, h: 5 },
      { x: 6, z: -15, r: 7, h: 4.5 },
      { x: 49, z: 15, r: 7, h: 5 },
      { x: 80, z: -30, r: 7, h: 5 },
    ],
    pools: [
      { x: -78, z: -53, r: 6 },
      { x: 49, z: 53, r: 6 },
    ],
    trees: 45, tree: 'round', rocks: 14, border: 'round',
    props: [{ kind: 'flower', n: 70, s: [0.7, 1.2] }],
    theme: {
      ground: ['#79c95a', '#72c053', '#82d263', '#6bb84d'], path: ['#e2c88e', '#d8bd82', '#e9d29a', '#d1b479'],
      sky: 0x9fdcff, leaves: [0x3fa13a, 0x4caf50, 0x66bb6a], rock: 0x9a9a9a,
      cliff: [0x9a8a72, 0x7e705c, 0x74c05a], water: [0x38a3e8, 0x2585d0],
    },
  },

  canyon: {
    name: 'Sunken Canyon',
    rating: 'hard',
    icon: '🏜',
    desc: 'A sunbaked basin ringed by red mesas. One straight road crosses a bottomless crater on a steel bridge.',
    path: [[-100, 0], [88, 0]],
    spawn: { x: -62, z: 20 },
    // The few flat mesa tops low enough to build on.
    cliffs: [
      { x: -58, z: -42, r: 7, h: 6 },
      { x: -24, z: 46, r: 7, h: 6 },
      { x: 22, z: -48, r: 7, h: 6.5 },
      { x: 62, z: 40, r: 7, h: 6 },
      { x: 76, z: -30, r: 6.5, h: 6 },
    ],
    pools: [],
    trees: 6, tree: 'cactus', rocks: 3, border: 'none',
    fixed: [
      { kind: 'crater', x: -6, z: 2, rx: 24, rz: 18 },
      { kind: 'pit', x: 32, z: -13, rx: 3.5, rz: 3 },
      { kind: 'ditch', x: -50, z: 30, r: 7, rot: 0.3 },
      { kind: 'ditch', x: 40, z: 30, r: 10, rot: 1.1 },
      { kind: 'sign', x: -84, z: 7, rot: 0 },
      { kind: 'sign', x: 52, z: -8, rot: Math.PI },
      { kind: 'roadlines' },
      ...canyonRing(),
    ],
    theme: {
      ground: ['#d9c49a', '#d2bc90', '#e0cca4', '#ccb486'], path: ['#3a3a3f', '#36363b', '#3f3f44', '#333338'],
      sky: 0xbfd8ec, leaves: [0x3e8e3a, 0x357d32, 0x4a9a44], rock: 0xc0703f,
      cliff: [0xc0703f, 0xa65e33, 0xd38b5c], water: [0x38a3e8, 0x2585d0],
    },
  },
  nexus: {
    name: 'Twilight Nexus',
    rating: 'expert',
    icon: '🌌',
    desc: 'A neon deck floating over a dark sea at night. Four lanes from two portals cross over and under each other on two floors.',
    routes: NEXUS_ROUTES,
    path: NEXUS_ROUTES[0],
    spawn: { x: nexusCell(10, 5)[0], z: nexusCell(10, 5)[1], y: NEXUS_DECK },
    nexus: true, // grid-built two-floor map (see NEXUS_GRID): no castle, no scattered decor
    fixed: [
      // Low machinery units on the upper deck near the pillars and slab edges.
      ...[[10, 4], [19, 4], [10, 17], [19, 17], [8, 7], [21, 13]].map(([c, r]) => {
        const [x, z] = nexusCell(c, r);
        return { kind: 'nxBox', x: x + Math.sign(x) * 1.4, z: z + Math.sign(z) * 1.4 };
      }),
      // Thin cyan light posts on the lower floor near the centre, between the lanes under the bridges.
      ...[-39, -27, 27, 39].map((x) => ({ kind: 'nxPost', x, z: 0 })),
    ],
    cliffs: [],
    pools: [],
    trees: 0, tree: 'round', rocks: 0, border: 'none',
    theme: {
      ground: ['#2c3a55', '#2a3752', '#2f3d59', '#283450'], path: ['#1c2740', '#1a253d', '#1e2a44', '#19233a'],
      sky: 0x1a1838, fog: 0x8e9db8, fogNear: 22, fogFar: 105, night: true,
      leaves: [0x3fa13a, 0x4caf50, 0x66bb6a], rock: 0x4a5a78,
      cliff: [0x4a5a78, 0x3a4152, 0x4a5a78], water: [0x050a1e, 0x050a1e],
    },
  },
  court: {
    name: 'Shattered Court',
    rating: 'hard',
    icon: '🃏',
    desc: 'A crumbling checkerboard floating in a starry void. The path is different every game: you never know what you will get.',
    path: courtRoute(0).path, // replaced by each game's random route (see seededDef)
    random: true,
    court: true, // grid-built tile map (see COURT_GRID)
    spawn: { x: courtCell(22, 4)[0], z: courtCell(22, 4)[1] },
    bounds: { minX: -76, maxX: 80, minZ: -82, maxZ: 82 },
    cliffs: [],
    pools: [],
    trees: 0, tree: 'dead', rocks: 0, border: 'none',
    theme: {
      ground: ['#9c9c9c', '#4a4a4a', '#9c9c9c', '#4a4a4a'], path: ['#e8b04a', '#e8b04a', '#e8b04a', '#e8b04a'],
      sky: 0x050508, fog: 0x0a0610, fogNear: 140, fogFar: 320, night: true,
      leaves: [0x3c4a30, 0x3c4a30, 0x3c4a30], rock: 0x5a3e2a,
      cliff: [0x5a3e2a, 0x3a3a3a, 0x3c4a30], water: [0x050508, 0x050508],
    },
  },
  ember: {
    name: 'Ember Keep',
    rating: 'hard',
    icon: '🌋',
    desc: 'A rocky island in a sea of lava, under a red sky. The path leaves a dark keep over a drawbridge, splits around an erupting volcano and winds south to the gate.',
    routes: EMBER_ROUTES,
    path: EMBER_ROUTES[0],
    spawn: { x: emberCell(17.5, 14)[0], z: emberCell(17.5, 14)[1] },
    ember: true, // grid-built island map (see EMBER_GRID)
    bounds: { minX: -80, maxX: 80, minZ: -58, maxZ: 58 },
    cliffs: [],
    pools: [],
    trees: 0, tree: 'dead', rocks: 0, border: 'none',
    theme: {
      ground: ['#8a4a50', '#84464c', '#8e4e54', '#7e4248'], path: ['#6a2a2e', '#66282c', '#6e2c30', '#62262a'],
      sky: 0x5a0505, fog: 0x7a1010, fogNear: 70, fogFar: 190, lava: true,
      leaves: [0x3a2a20, 0x3a2a20, 0x3a2a20], rock: 0x5a1e1e,
      cliff: [0x5a1e1e, 0x4a1818, 0x8a4a50], water: [0xff8a10, 0xff8a10],
    },
  },
  rampart: {
    name: 'Midnight Rampart',
    rating: 'medium',
    icon: '🧱',
    desc: 'A night-time quarry bowl split by a huge concrete wall. The road slips through the gate, twists through a nested S-bend, crosses the sewer bridge and runs past a sleepy town to the tunnel.',
    path: RAMPART_ROUTE,
    spawn: { x: rampartCell(12, 9)[0], z: rampartCell(12, 9)[1] },
    rampart: true, // grid-built map (see RAMPART_GRID): heights, placement, props and colliders come from the grid
    floors: RAMPART_FLOORS,
    bounds: { minX: -60, maxX: 60, minZ: -60, maxZ: 60 },
    cliffs: [],
    pools: [],
    trees: 0, tree: 'dead', rocks: 0, border: 'none',
    theme: {
      ground: ['#b8702a', '#b06a28', '#c0762e', '#a86426'], path: ['#6f6d7c', '#6a6877', '#74727f', '#666472'],
      sky: 0x1f1c24, fog: 0x2a2a2e, fogNear: 70, fogFar: 175, night: true, lamps: true,
      leaves: [0x4a4030, 0x4a4030, 0x4a4030], rock: 0x3e3b3b,
      cliff: [0x3e3b3b, 0x2e2b2b, 0x8c8c8c], water: [0x8fb5c9, 0x6f95a9],
    },
  },
  brook: {
    name: 'Brook Hollow',
    rating: 'easy',
    icon: '🏞',
    desc: 'A sunny grass bowl ringed by tall slate cliffs above the sea. The stone path zig-zags out of a cave, crosses a little stream twice and runs into a cave in the west cliff.',
    path: BROOK_ROUTE,
    spawn: { x: brookCell(15.5, 13)[0], z: brookCell(15.5, 13)[1] },
    brook: true, // grid-built map (see BROOK_GRID): heights, placement, props and colliders come from the grid
    floors: BROOK_FLOORS,
    bounds: { minX: -52, maxX: 52, minZ: -42, maxZ: 40 },
    cliffs: [],
    pools: [],
    trees: 0, tree: 'round', rocks: 0, border: 'none',
    theme: {
      ground: ['#6fd24f', '#69c94a', '#76d955', '#64c146'], path: ['#6e6670', '#696270', '#736b75', '#655e68'],
      sky: 0xe2eaf2, fog: 0xe2eaf2, fogNear: 110, fogFar: 260,
      sunOff: [80, 85, -30], // sun from the east-north-east: the tall east cliffs shade the east and south-east of the bowl
      leaves: [0x2fcf7a, 0x2fcf7a, 0x2fcf7a], rock: 0x2e3542,
      cliff: [0x2e3542, 0x232935, 0x8fd56a], water: [0x3a6fd0, 0x2a5ab8],
    },
  },
  crossing: {
    name: 'Sunset Crossing',
    rating: 'medium',
    icon: '🌅',
    desc: 'A crossroads plateau at sunset. The road crosses itself in the middle, then zig-zags back and runs north to a cave.',
    path: CROSS_ROUTE,
    spawn: { x: crossCell(10, 14)[0], z: crossCell(10, 14)[1] },
    grid: true, // grid-built map (see CROSS_GRID): terrain heights, placement and decor come from the grid
    base: 'cave', // the base is a cave in the north cliff, not the castle
    floors: CROSS_FLOORS,
    cliffs: [],
    pools: [],
    trees: 0, tree: 'round', rocks: 0, border: 'none',
    theme: {
      ground: ['#5c9a3e', '#58943b', '#619f42', '#549038'], path: ['#9e9a96', '#99958f', '#a39f9b', '#96928e'],
      sky: 0xe9a577, fog: 0xd9a08a, fogNear: 75, fogFar: 190, sunset: true,
      leaves: [0x3e8a3a, 0x3e8a3a, 0x3e8a3a], rock: 0xdadad6,
      cliff: [0xb5aca4, 0x6e4428, 0xd08a3c], water: [0x38a3e8, 0x2585d0],
    },
  },
  cemetery: {
    name: 'Lantern Hill Cemetery',
    event: 'halloween', // the Halloween Event's own map: only that event plays it (see pickableMap)
    unlockable: true, // the Halloween Battle Pass can open it for every mode
    rating: 'medium',
    icon: '🎃',
    desc: 'Halloween night in a fenced graveyard. One long winding path past gravestones, a lantern-lit chapel and a pile of jack-o\'-lanterns.',
    path: GRAVE_ROUTE,
    spawn: { x: graveCell(6, 11)[0], z: graveCell(6, 11)[1] },
    bounds: { minX: -42, maxX: 42, minZ: -34, maxZ: 34 },
    cliffs: GRAVE_CLIFFS,
    pools: [],
    trees: 0, tree: 'dead', rocks: 0, border: 'none',
    fixed: graveFixed(),
    theme: {
      ground: ['#2a2418', '#262014', '#2e281b', '#231e14'], path: ['#7a6146', '#4a3826', '#7a6146', '#6e573e'],
      sky: 0x0a0a0c, fog: 0x1a1814, fogNear: 70, fogFar: 190, night: true, lamps: true,
      leaves: [0x1e2216, 0x242a1a, 0x1a1e12], rock: 0x6e5a40,
      cliff: [0x6e5a40, 0x5a4934, 0x7a6650], water: [0x38a3e8, 0x2585d0],
    },
  },
  carnival: {
    name: 'Halloween Night 2',
    event: 'halloween', // the Halloween Event's second map (see DIFFICULTIES.halloween.maps)
    unlockable: true, // the Halloween Battle Pass can open it for every mode
    rating: 'medium',
    icon: '🎡',
    desc: 'A spooky carnival at night. Enemies come out of the big circus tent, loop round past the Ferris wheel, cross their own path and run to a blue car.',
    path: CARN_ROUTE,
    spawn: { x: carnCell(17, 12.5)[0], z: carnCell(17, 12.5)[1] },
    base: 'car', // no castle: the blue car at the path end is the base (drawn by carnCar)
    portal: false, // no portal: enemies come out of the big tent's door
    bounds: { minX: -56, maxX: 56, minZ: -40, maxZ: 40 },
    cliffs: [],
    pools: [],
    trees: 0, tree: 'round', rocks: 0, border: 'none',
    fixed: carnFixed(),
    theme: {
      ground: ['#3e4a2e', '#3a462b', '#424e31', '#37432a'], path: ['#5a3530', '#55322d', '#5e3833', '#52302b'],
      sky: 0x14101c, fog: 0x3a2e4a, fogNear: 80, fogFar: 200, night: true, purple: true,
      leaves: [0x2f3e2a, 0x2f3e2a, 0x2f3e2a], rock: 0x4a3f5e,
      cliff: [0x4a3f5e, 0x3a2a24, 0x4a3f5e], water: [0x38a3e8, 0x2585d0],
    },
  },
  nightmare: {
    name: 'Halloween Night 3',
    event: 'halloween', // the Halloween Event's third map (see DIFFICULTIES.halloween.maps)
    unlockable: true, // the Halloween Battle Pass can open it for every mode
    rating: 'hard',
    icon: '🌀',
    desc: 'A sandy crater at dusk. Enemies pour out of the Nightmare Realm portal, split into two twisting paths that cross each other four times, and meet again before the corrupted supercomputer.',
    path: NM_ROUTES[0],
    routes: NM_ROUTES, // north branch, south branch (the south one is longer: its enemies walk a bit faster)
    spawn: { x: nmCell(44, 24)[0], z: nmCell(44, 24)[1] },
    base: 'computer', // no castle: the supercomputer (nmComputer) is the base
    baseAt: nmCell(51, 16),
    baseR: 8,
    portal: false, // the Nightmare Realm portal is a prop (nmPortal)
    bounds: { minX: -108, maxX: 108, minZ: -64, maxZ: 64 },
    cliffs: [],
    pools: [],
    trees: 0, tree: 'round', rocks: 0, border: 'none',
    fixed: nmFixed(),
    theme: {
      ground: ['#c47a44', '#a85e32', '#c8804a', '#bc7340'], path: ['#5e4636', '#584132', '#634a3a', '#55402f'],
      sky: 0xc88a3a, fog: 0xb07a40, fogNear: 100, fogFar: 250, dusk: true,
      leaves: [0x6a4a2a, 0x6a4a2a, 0x6a4a2a], rock: 0xb8643a,
      cliff: [0xb87848, 0x9a6038, 0xc88a58], water: [0x38a3e8, 0x2585d0],
    },
  },
  rig: {
    name: 'Rig Point',
    rating: 'medium',
    icon: '🛢',
    desc: 'A crowded offshore oil rig in the open sea. The walkway leaves a spawn hut on stilts, loops round a burning derrick and stacks of containers, and ends at a helicopter on the helipad.',
    path: RIG_ROUTE,
    spawn: { x: rigCell(13, 10)[0], z: rigCell(13, 10)[1] },
    rig: true, // grid-built map (see RIG_GRID): placement, props and colliders come from the grid
    floors: RIG_FLOORS,
    bounds: { minX: -90, maxX: 90, minZ: -83, maxZ: 83 },
    cliffs: [],
    pools: [],
    trees: 0, tree: 'round', rocks: 0, border: 'none',
    theme: {
      ground: ['#8a8c8e', '#86888a', '#8e9092', '#828486'], path: ['#6fa878', '#6ba474', '#73ac7c', '#67a070'],
      sky: 0x9cc4e4, fog: 0xdde6ee, fogNear: 170, fogFar: 380,
      leaves: [0x4f7f4a, 0x4f7f4a, 0x4f7f4a], rock: 0x4a4d50,
      cliff: [0x4a4d50, 0x3a3d40, 0x8a8c8e], water: [0x4a86a8, 0x3a7698],
    },
  },
  // The Backrooms (Liminal contract, see lastlaugh.js): only the Liminal mode plays it. Its rooms
  // come from the seed in the key (sim/backrooms.js), and the mode asks for a new seed every 25 waves.
  backrooms: {
    name: 'The Backrooms',
    event: 'liminal', // not on the map list: you get here by walking into Sunken Canyon's glitchy pit
    unlockable: true, // the Halloween Battle Pass can open it for every mode
    rating: 'hard',
    icon: '🟨',
    desc: 'Endless yellow rooms that hum. The rooms shift every 25 waves.',
    backrooms: true,
    random: true,
    ...backroomsLayout(0), // replaced by each game's own rooms (see seededDef)
    cliffs: [],
    pools: [],
    trees: 0, tree: 'round', rocks: 0, border: 'none',
    theme: {
      ground: ['#c9b46a', '#c3ad62', '#cebb73', '#bfa95f'], path: ['#8f7d47', '#8a7843', '#94824c', '#857340'],
      sky: 0x9a8a4a, fog: 0xcfc184, fogNear: 70, fogFar: 230,
      leaves: [0x8a7a40, 0x8a7a40, 0x8a7a40], rock: 0xb8a462,
      cliff: [0xd8c47a, 0xc8b46a, 0xe8d48a], water: [0x9aa060, 0x8a9050],
    },
  },
};

// Maps with `random` draw a new route every game: their key carries that game's seed
// ('court:12345'), so the server and every client lay the same route.
export const DEFAULT_MAP = 'meadow';
/** The map key without its seed. */
export const baseKey = (key) => (typeof key === 'string' ? key.split(':')[0] : key);
/** The seed in a random map's key (null when it has none). */
export const seedOf = (key) => {
  const s = typeof key === 'string' ? key.split(':')[1] : undefined;
  return s != null && /^\d+$/.test(s) ? +s : null;
};
export const mapDef = (key) => MAPS[baseKey(key)] ?? MAPS[DEFAULT_MAP];
export const mapKeyOf = (key) => {
  const b = baseKey(key);
  if (!MAPS[b]) return DEFAULT_MAP;
  return MAPS[b].random && seedOf(key) != null ? `${b}:${seedOf(key)}` : b;
};
/** `key` as a map any mode can play: an event's own map (MAPS[key].event) becomes the default map. */
// `unlockable`: an event map the Halloween Battle Pass can open for every mode (the menus only offer it once it's unlocked).
export const pickableMap = (key) => (mapDef(key).event && !mapDef(key).unlockable ? DEFAULT_MAP : mapKeyOf(key));
/** Map `key`'s definition for its seed (random maps get that game's route). */
export function seededDef(key) {
  const def = mapDef(key);
  const seed = seedOf(key);
  if (!def.random || seed == null) return def;
  if (def.backrooms) return { ...def, ...backroomsLayout(seed), seed }; // Liminal contract: rooms from the seed
  const r = courtRoute(seed);
  return { ...def, path: r.path, tiles: r.tiles, seed };
}
