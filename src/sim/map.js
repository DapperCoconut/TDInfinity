// Shared map layout: deterministic decoration placement + tower placement rules.
// Both the server (validation) and client (rendering) use this, so they always agree.
import { mulberry32 } from '../utils.js';
import { BOUNDS, PATH_WIDTH, PLAYER_SPAWN, path } from './path.js';

export const CASTLE = { x: path.end.x + 7, z: path.end.z };

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
// ground towers can't. Hand-placed in open spots with a good view of the path.
export const CLIFFS = [
  { x: -27, z: 0, r: 7.5, h: 5 },
  { x: 40, z: 2, r: 7.5, h: 5 },
  { x: -72, z: -14, r: 7, h: 4.5 },
  { x: 8, z: 52, r: 7, h: 5.5 },
  { x: 76, z: 22, r: 7, h: 4.5 },
  { x: 8, z: -54, r: 7, h: 5 },
];
const CLIFF_INSET = 2.6; // a tower's center must be this far inside the cliff edge

/** The cliff at (x, z), if any (map-local coordinates). */
export function cliffAt(x, z) {
  return CLIFFS.find((c) => Math.hypot(x - c.x, z - c.z) < c.r) ?? null;
}

/** Ground height at world (x, z): cliff tops are raised. Works on every Versus lane. */
export function heightAt(x, z) {
  return cliffAt(x, foldZ(z))?.h ?? 0;
}

function generate() {
  const rand = mulberry32(1337);
  const obstacles = [{ x: CASTLE.x, z: CASTLE.z, r: 9 }]; // circles blocking towers & players
  const trees = [];
  const rocks = [];
  const border = [];

  const blocked = (x, z, pad) =>
    path.distanceTo(x, z) < PATH_WIDTH / 2 + pad ||
    Math.hypot(x - PLAYER_SPAWN.x, z - PLAYER_SPAWN.z) < 12 ||
    obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + pad) ||
    CLIFFS.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + pad) ||
    (x < -88 && Math.abs(z - path.start.z) < 14);

  for (let i = 0; i < 800 && trees.length < 55; i++) {
    const x = -100 + rand() * 200;
    const z = -62 + rand() * 124;
    if (blocked(x, z, 5)) continue;
    const s = 0.8 + rand() * 0.6;
    trees.push({ x, z, s, rot: rand() * Math.PI, leaf: Math.floor(rand() * 3) });
    obstacles.push({ x, z, r: 1.8 * s });
  }
  for (let i = 0; i < 400 && rocks.length < 22; i++) {
    const x = -100 + rand() * 200;
    const z = -62 + rand() * 124;
    if (blocked(x, z, 3)) continue;
    const s = 1 + rand() * 1.5;
    rocks.push({ x, z, s, rx: rand() * 0.3, ry: rand() * Math.PI, rz: rand() * 0.3 });
    obstacles.push({ x, z, r: 1.3 * s });
  }
  // Tree line beyond the playable area (decor only, not obstacles).
  for (let i = 0; i < 90; i++) {
    const side = i % 4;
    const t = rand();
    const off = 6 + rand() * 14;
    const x = side < 2 ? -125 + t * 250 : side === 2 ? BOUNDS.minX - off : BOUNDS.maxX + off;
    const z = side === 0 ? BOUNDS.minZ - off : side === 1 ? BOUNDS.maxZ + off : -80 + t * 160;
    const s = 1 + rand() * 0.8;
    const rot = rand() * Math.PI;
    const leaf = Math.floor(rand() * 3);
    if (Math.abs(x - path.start.x) < 12 && Math.abs(z - path.start.z) < 12) continue;
    border.push({ x, z, s, rot, leaf });
  }
  return { obstacles, trees, rocks, border };
}

export const MAP = generate();

/**
 * Can a tower go at (x, z)? `towers` is any iterable of objects with x and z.
 * placement: 'ground' (default), 'cliff' (cliff tops only) or 'any'.
 */
export function canPlace(x, z, towers, placement = 'ground') {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  for (const t of towers) if (Math.hypot(t.x - x, t.z - z) < 4) return false;
  const cliff = cliffAt(x, z);
  if (cliff) return placement !== 'ground' && Math.hypot(x - cliff.x, z - cliff.z) <= cliff.r - CLIFF_INSET;
  if (placement === 'cliff') return false;
  if (x < BOUNDS.minX + 2 || x > BOUNDS.maxX - 2 || z < BOUNDS.minZ + 2 || z > BOUNDS.maxZ - 2) return false;
  if (path.distanceTo(x, z) < PATH_WIDTH / 2 + 1.6) return false;
  if (CLIFFS.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 1.6)) return false;
  return !MAP.obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + 1.6);
}
