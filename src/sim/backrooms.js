// The Backrooms (Liminal contract, see lastlaugh.js): a map built from a seed. Endless yellow
// rooms on a grid of cells: the path is a walk of corridors from the left side to the right,
// with walls and pillars dropped around it. Three styles of layout, picked by the seed. The
// Liminal mode asks for a new seed every 25 waves, so the rooms shift.
// Plain math only: the sim, the server and the renderer all build the same layout from the seed.
import { mulberry32 } from '../utils.js';

export const BR_CELL = 12; // one room cell
export const BR_COLS = 16; // cells across (x)
export const BR_ROWS = 11; // cells down (z)
export const BR_WALL_H = 7; // how tall the walls are
/** Middle of cell (col, row). */
export const brCell = (c, r) => [-96 + c * BR_CELL, -60 + r * BR_CELL];

// The layout styles. turn: how likely the walk turns each step; run: how far it goes up or down
// before it may turn again; walls: how many cell edges get a wall; pillars: rows of square pillars.
const STYLES = [
  { name: 'Hallways', turn: 0.25, run: [1, 2], walls: 0.3, pillars: false },
  { name: 'Pillar Hall', turn: 0.45, run: [2, 4], walls: 0.12, pillars: true },
  { name: 'Maze', turn: 0.7, run: [1, 3], walls: 0.5, pillars: false },
];

/**
 * The walk: cells from column 0 to the last column, never touching itself (so corridors don't
 * merge). Mostly heads right, turning up or down now and then.
 */
function walk(rand, st) {
  for (let tries = 0; tries < 60; tries++) {
    const r0 = 2 + Math.floor(rand() * (BR_ROWS - 4));
    const cells = [[0, r0]];
    const used = new Set([`0,${r0}`]);
    const ok = (c, r, from) => {
      if (c < 0 || c >= BR_COLS || r < 1 || r > BR_ROWS - 2 || used.has(`${c},${r}`)) return false;
      // Not next to any earlier cell except the one it came from.
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = `${c + dc},${r + dr}`;
        if (used.has(k) && k !== from) return false;
      }
      return true;
    };
    let [c, r] = cells[0];
    let stuck = false;
    while (c < BR_COLS - 1) {
      const from = `${c},${r}`;
      if (c > 0 && rand() < st.turn) {
        // Up or down for a little run (the other way if that one is blocked).
        const dir = rand() < 0.5 ? -1 : 1;
        const len = st.run[0] + Math.floor(rand() * (st.run[1] - st.run[0] + 1));
        for (const d of [dir, -dir]) {
          let n = 0;
          let rr = r;
          let f = from;
          while (n < len && ok(c, rr + d, f)) {
            f = `${c},${rr}`;
            rr += d;
            cells.push([c, rr]);
            used.add(`${c},${rr}`);
            n++;
          }
          if (n) {
            r = rr;
            break;
          }
        }
      }
      // Then one step right.
      if (!ok(c + 1, r, `${c},${r}`)) {
        stuck = true;
        break;
      }
      c++;
      cells.push([c, r]);
      used.add(`${c},${r}`);
    }
    if (!stuck) return cells;
  }
  const r = Math.floor(BR_ROWS / 2);
  return Array.from({ length: BR_COLS }, (_, c) => [c, r]);
}

/** The corner points of a walk over cells (the path goes in from the left edge). */
function corners(cells) {
  const pts = [];
  for (let i = 0; i < cells.length; i++) {
    const p = cells[i];
    const a = cells[i - 1];
    const b = cells[i + 1];
    if (a && b && (a[0] === p[0]) === (p[0] === b[0]) && (a[1] === p[1]) === (p[1] === b[1])) continue; // straight on
    pts.push(brCell(...p));
  }
  pts[0] = [-104, pts[0][1]];
  return pts;
}

/**
 * The layout for `seed`: { path, spawn, fixed, style }. `fixed` holds the walls (brWall), pillars
 * (brPillar) and lights (brLight) that map.js turns into obstacles and world.js draws.
 */
export function backroomsLayout(seed) {
  const rand = mulberry32((seed | 0) + 7777);
  const st = STYLES[Math.abs(seed | 0) % STYLES.length];
  const cells = walk(rand, st);
  const onPath = new Set(cells.map(([c, r]) => `${c},${r}`));
  // The player starts in a free cell next to the middle of the path.
  const mid = cells[Math.floor(cells.length / 2)];
  let spawnCell = null;
  for (let k = 0; k < cells.length && !spawnCell; k++) {
    const [c, r] = cells[(Math.floor(cells.length / 2) + k) % cells.length];
    for (const [dc, dr] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const cc = c + dc;
      const rr = r + dr;
      if (cc > 0 && cc < BR_COLS - 1 && rr >= 0 && rr < BR_ROWS && !onPath.has(`${cc},${rr}`)) {
        spawnCell = [cc, rr];
        break;
      }
    }
  }
  spawnCell ??= [mid[0], mid[1] > 5 ? mid[1] - 1 : mid[1] + 1];
  const [sx, sz] = brCell(...spawnCell);
  const fixed = [];
  const isSpawn = (c, r) => c === spawnCell[0] && r === spawnCell[1];
  const end = cells[cells.length - 1];
  const nearBase = (c, r) => Math.abs(c - end[0]) <= 1 && Math.abs(r - end[1]) <= 1;
  // Walls on the edges between cells. Never across the path, never round the spawn or the base.
  for (let c = 0; c < BR_COLS; c++) {
    for (let r = 0; r < BR_ROWS; r++) {
      for (const [dc, dr] of [[1, 0], [0, 1]]) {
        const c2 = c + dc;
        const r2 = r + dr;
        if (c2 >= BR_COLS || r2 >= BR_ROWS) continue;
        const pa = onPath.has(`${c},${r}`);
        const pb = onPath.has(`${c2},${r2}`);
        if (pa && pb) continue; // the path walks through here
        if (isSpawn(c, r) || isSpawn(c2, r2) || nearBase(c, r) || nearBase(c2, r2) || c === 0 || c2 === 0) continue;
        if (rand() > (pa || pb ? st.walls * 0.6 : st.walls)) continue;
        const [x1, z1] = brCell(c, r);
        const [x2, z2] = brCell(c2, r2);
        // Some walls have a doorway: only half of the edge is walled.
        const half = rand() < 0.35 ? (rand() < 0.5 ? -1 : 1) : 0;
        const len = half ? BR_CELL / 2 : BR_CELL;
        const off = half * (BR_CELL / 4);
        if (dc) fixed.push({ kind: 'brWall', x: (x1 + x2) / 2, z: z1 + off, len, rot: 1 });
        else fixed.push({ kind: 'brWall', x: x1 + off, z: (z1 + z2) / 2, len, rot: 0 });
      }
    }
  }
  // Pillar Hall: square pillars on the cell corners away from the path.
  if (st.pillars) {
    for (let c = 1; c < BR_COLS; c++) {
      for (let r = 1; r < BR_ROWS; r++) {
        const touches = [[c - 1, r - 1], [c, r - 1], [c - 1, r], [c, r]].some(([a, b]) => onPath.has(`${a},${b}`) || isSpawn(a, b) || nearBase(a, b));
        if (touches || rand() < 0.3) continue;
        const [x, z] = brCell(c, r);
        fixed.push({ kind: 'brPillar', x: x - BR_CELL / 2, z: z - BR_CELL / 2, block: 1.8, box: [1.1, 1.1, Infinity] });
      }
    }
  }
  // Ceiling lights: buzzing panels over some of the rooms (drawn high up, decor only).
  for (let c = 0; c < BR_COLS; c++) for (let r = 0; r < BR_ROWS; r++) if (rand() < 0.22) fixed.push({ kind: 'brLight', x: brCell(c, r)[0], z: brCell(c, r)[1], on: rand() < 0.85 });
  return { path: corners(cells), spawn: { x: sx, z: sz }, fixed, style: st.name };
}
