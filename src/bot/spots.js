// Where a bot puts things: spots that see the most track (attack towers), spots that cover the
// most towers (support), spots far from the track (farms and summons that don't need it), and
// where a bot may walk. Works on the current map (setMap) in map-local coordinates.
import { TOWERS } from '../config.js';
import { BOUNDS, path } from '../sim/path.js';
import { brookWalkable, canPlace, courtWalkable, emberWalkable, gridWalkable, mapInfo, nexusWalkable, rampartWalkable, rigWalkable } from '../sim/map.js';

const STEP = 3; // grid step between candidate spots
const SAMPLE = 2; // path sample spacing

// Caches are per map; the first call after a map change empties them.
let cacheMap = null;
let samples = null;
const coverCache = new Map(); // "placement:rangeBucket" -> [{ x, z, cover }] best first

function freshen() {
  const key = `${path.points[0]?.x},${path.points[0]?.z},${path.length},${path.routes.length},${path.time}`;
  if (cacheMap === key) return;
  cacheMap = key;
  samples = [];
  path.routes.forEach((r, ri) => {
    for (let d = 0; d <= r.length; d += SAMPLE) samples.push(path.at(d, { d }, ri));
  });
  coverCache.clear();
  quietCache.clear();
  coverMemo.clear();
}

const coverMemo = new Map(); // "x,z,range" -> samples in reach (towers don't move, so this is asked again and again)
/** How many path samples (SAMPLE apart) lie within `range` of (x, z): about the studs of track in reach / 2. */
export function cover(x, z, range) {
  freshen();
  const key = `${x},${z},${Math.round(range * 2)}`;
  let n = coverMemo.get(key);
  if (n != null) return n;
  n = 0;
  const r2 = range * range;
  for (const s of samples) if ((s.x - x) ** 2 + (s.z - z) ** 2 <= r2) n++;
  if (coverMemo.size > 20000) coverMemo.clear();
  coverMemo.set(key, n);
  return n;
}

/** Distance from (x, z) to the nearest path sample. */
export function pathDist(x, z) {
  freshen();
  let best = Infinity;
  for (const s of samples) best = Math.min(best, (s.x - x) ** 2 + (s.z - z) ** 2);
  return Math.sqrt(best);
}

/** Every free grid spot where a tower with `placement` may go (no tower check; see freeSpots). */
function gridSpots(placement) {
  const out = [];
  for (let x = BOUNDS.minX + 2; x <= BOUNDS.maxX - 2; x += STEP) {
    for (let z = BOUNDS.minZ + 2; z <= BOUNDS.maxZ - 2; z += STEP) if (canPlace(x, z, [], placement)) out.push({ x, z });
  }
  return out;
}

/**
 * Spots for a tower with `placement` that sees the most track from `range` away, best first
 * (cached per map; the list ignores towers, so check canPlace against them when using one).
 */
export function coverSpots(placement = 'ground', range = 12) {
  freshen();
  const bucket = Math.round(range / 3);
  const key = `${placement}:${bucket}`;
  if (!coverCache.has(key)) {
    const r = bucket * 3;
    const list = gridSpots(placement).map((s) => ({ ...s, cover: cover(s.x, s.z, r) })).filter((s) => s.cover > 0);
    list.sort((a, b) => b.cover - a.cover);
    coverCache.set(key, list);
  }
  return coverCache.get(key);
}

/** Does the map have anywhere at all for a tower with `placement`? */
export function hasSpots(placement) {
  return gridSpots(placement).length > 0;
}

const free = (s, towers, placement) => canPlace(s.x, s.z, towers, placement);

/**
 * The best free spot for an attack tower of `type` at `level`: the most track in its range.
 * `near` ({ x, z }, optional) favors spots within 16 studs of a point (a player said "build here").
 */
export function attackSpot(type, level, towers, near = null) {
  const def = TOWERS[type];
  const range = Math.max(6, def.levels[Math.min(level, def.levels.length - 1)].range ?? def.levels[0].range ?? 12);
  const list = coverSpots(def.placement ?? 'ground', range);
  let best = null;
  let bestScore = -1;
  let tried = 0;
  for (const s of list) {
    if (tried > 60 && !near) break; // the list is sorted: the top is plenty
    let score = s.cover;
    if (near) {
      const d = Math.hypot(s.x - near.x, s.z - near.z);
      if (d > 22) continue;
      score += (22 - d) * 2;
    }
    if (score <= bestScore) continue;
    if (!free(s, towers, def.placement)) continue;
    tried++;
    best = s;
    bestScore = score;
  }
  return best;
}

/**
 * The best free spot for a support tower with an aura of `aura`: the spot whose aura covers the most
 * attack towers (by cash spent on them). Returns { x, z, covered } or null when fewer than `min`
 * towers would be covered.
 */
export function supportSpot(type, towers, min = 3, near = null) {
  const def = TOWERS[type];
  const aura = def.levels[0].aura ?? def.levels[0].range ?? 10;
  const targets = towers.filter((t) => (TOWERS[t.type].kind ?? 'attack') !== 'income' && (TOWERS[t.type].kind ?? 'attack') !== 'support' && !t.holo);
  if (targets.length < min) return null;
  const list = coverSpots(def.placement ?? 'ground', aura); // spots near the track, where the towers are
  let best = null;
  let bestScore = 0;
  let tried = 0;
  for (const s of list) {
    if (tried > 80) break;
    tried++;
    let covered = 0;
    let worth = 0;
    for (const t of targets) {
      if ((t.x - s.x) ** 2 + (t.z - s.z) ** 2 > aura * aura) continue;
      covered++;
      worth += t.spent || 1;
    }
    if (covered < min) continue;
    let score = worth + covered * 100;
    if (near) score -= Math.hypot(s.x - near.x, s.z - near.z) * 10;
    if (score <= bestScore || !free(s, towers, def.placement)) continue;
    best = { x: s.x, z: s.z, covered };
    bestScore = score;
  }
  return best;
}

/** How many attack towers a support tower at (x, z) with aura `aura` would cover. */
export function coveredBy(x, z, aura, towers) {
  let n = 0;
  for (const t of towers) {
    const k = TOWERS[t.type].kind ?? 'attack';
    if (k === 'income' || k === 'support' || t.holo) continue;
    if ((t.x - x) ** 2 + (t.z - z) ** 2 <= aura * aura) n++;
  }
  return n;
}

/**
 * A free spot well away from the track for a farm or a summoner: the farthest from the path
 * (but not off in a corner: within 60 studs of the base), spread out so farms don't bunch up.
 */
export function quietSpot(type, towers, near = null) {
  const def = TOWERS[type];
  const placement = def.placement ?? 'ground';
  const list = quietSpots(placement);
  let best = null;
  let bestScore = -Infinity;
  let tried = 0;
  for (const s of list) {
    if (tried > 40 && !near) break;
    let score = s.score;
    if (near) score -= Math.hypot(s.x - near.x, s.z - near.z) * 0.3;
    // Spread out: a little away from other towers, so the farm field doesn't block itself.
    for (const t of towers) if ((t.x - s.x) ** 2 + (t.z - s.z) ** 2 < 36) score -= 3;
    if (score <= bestScore) continue;
    if (!canPlace(s.x, s.z, towers, placement)) continue;
    tried++;
    best = { x: s.x, z: s.z };
    bestScore = score;
  }
  return best;
}

const quietCache = new Map(); // placement -> [{ x, z, score }] best first (per map, see freshen)
/** Spots away from the track (9+ studs) but not far from the base, best first (cached per map). */
function quietSpots(placement) {
  freshen();
  if (!quietCache.has(placement)) {
    const end = path.points[path.points.length - 1];
    const list = [];
    for (let x = BOUNDS.minX + 4; x <= BOUNDS.maxX - 4; x += STEP) {
      for (let z = BOUNDS.minZ + 4; z <= BOUNDS.maxZ - 4; z += STEP) {
        if (!canPlace(x, z, [], placement)) continue;
        const d = pathDist(x, z);
        if (d < 9) continue;
        list.push({ x, z, score: Math.min(d, 24) - Math.max(0, Math.hypot(x - end.x, z - end.z) - 60) * 0.5 });
      }
    }
    list.sort((a, b) => b.score - a.score);
    quietCache.set(placement, list);
  }
  return quietCache.get(placement);
}

/** May a player stand at (x, z) on this map? (The void around Twilight Nexus, lava, the sea...) */
export function walkable(x, z) {
  if (path.time) return true;
  if (mapInfo.nexus) return nexusWalkable(x, z);
  if (mapInfo.grid) return gridWalkable(x, z);
  if (mapInfo.court) return courtWalkable(x, z);
  if (mapInfo.ember) return emberWalkable(x, z);
  if (mapInfo.rampart) return rampartWalkable(x, z);
  if (mapInfo.brook) return brookWalkable(x, z);
  if (mapInfo.rig) return rigWalkable(x, z);
  return x >= BOUNDS.minX && x <= BOUNDS.maxX && z >= BOUNDS.minZ && z <= BOUNDS.maxZ;
}
