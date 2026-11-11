// Balance lab helpers: runs the real Sim headless (no browser) to measure towers and play games.
import { Sim } from '../../src/sim/sim.js';
import { TOWERS, towerCost } from '../../src/config.js';
import { BOUNDS, path } from '../../src/sim/path.js';
import { canPlace } from '../../src/sim/map.js';

/** Points every `step` units along every route of the current map. */
export function pathSamples(step = 2) {
  const pts = [];
  path.routes.forEach((r, ri) => {
    for (let d = 0; d <= path.length; d += step) pts.push(path.at(d, { d }, ri));
  });
  return pts;
}

/** Free spots for a tower with this `placement`, best first: the ones whose `range` covers the most path. */
export function spots(sim, placement, range, step = 2) {
  const samples = pathSamples();
  const out = [];
  const towers = [...sim.towers.values()];
  for (let x = BOUNDS.minX + 2; x <= BOUNDS.maxX - 2; x += step) {
    for (let z = BOUNDS.minZ + 2; z <= BOUNDS.maxZ - 2; z += step) {
      if (!canPlace(x, z, towers, placement)) continue;
      let cover = 0;
      for (const s of samples) if ((s.x - x) ** 2 + (s.z - z) ** 2 <= range * range) cover++;
      if (cover) out.push({ x, z, cover });
    }
  }
  return out.sort((a, b) => b.cover - a.cover);
}

/** Upgrades tower `t` one level (top path first). Returns false at max level. */
export function upgrade(sim, pid, t) {
  return sim.action(pid, { a: 'upgrade', id: t.id, path: 'top' }) === null || sim.action(pid, { a: 'upgrade', id: t.id, path: 'bottom' }) === null;
}

/**
 * Measured damage per second of tower `type` at each level, against a steady stream of
 * unkillable zombies walking past the best spot on Sunny Meadow. Returns [{ level, cost (total
 * so far), dps, range }], or null for towers the lab can't place or that deal no direct damage.
 */
export function benchTower(type, secs = 40) {
  const def = TOWERS[type];
  const sim = new Sim([{ id: 'b', name: 'bench' }], { mode: 'easy', map: 'meadow' });
  const me = sim.players.get('b');
  me.cash = 1e12;
  sim.wave.countdown = 1e9; // no waves: the lab spawns its own zombies
  const range = def.levels[0].range ?? 12;
  const spot = spots(sim, def.placement, range)[0];
  if (!spot || sim.action('b', { a: 'place', type, x: spot.x, z: spot.z }) !== null) return null;
  const t = [...sim.towers.values()][0];
  const out = [];
  let spawnT = 0;
  const run = (time) => {
    for (let s = 0; s < time; s += 0.05) {
      if ((spawnT -= 0.05) <= 0) {
        spawnT = 2;
        sim.spawn('normal', { hp: 1e9 });
      }
      sim.baseHp = 1e9;
      me.cash = 1e12;
      sim.step(0.05);
      sim.events.length = 0;
    }
  };
  run(70); // fill the path
  for (;;) {
    run(5);
    const before = t.damageDealt;
    run(secs);
    out.push({ level: t.level, cost: t.spent, dps: (t.damageDealt - before) / secs, range: TOWERS[t.type].levels[t.level].range ?? 0, type: t.type });
    if (!upgrade(sim, 'b', t)) break;
  }
  return out;
}

// ---------------------------------------------------------------- matchups

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { DIFFICULTIES, ENEMIES, detection, rootType, towerLimit, waveGroups } from '../../src/config.js';

const benchCache = new Map();
const benchOf = (type) => {
  if (!benchCache.has(type)) benchCache.set(type, benchTower(type));
  return benchCache.get(type);
};

// Measurements are kept on disk until the game's numbers change (config.js or sim.js is saved).
const stamp = ['config.js', 'sim/sim.js', 'halloween.js', 'hardcore.js'].map((f) => Math.round(statSync(fileURLToPath(new URL(`../../src/${f}`, import.meta.url))).mtimeMs)).join('-');
const cacheFile = `${tmpdir()}/tdinfinity-balance/matchups-${stamp}.json`;
let disk = null;
const diskCache = () => (disk ??= existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : {});
const saveDisk = () => {
  mkdirSync(`${tmpdir()}/tdinfinity-balance`, { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(disk));
};

const spotMemo = new Map();
/** Damage per second of a level-`level` `type` tower against a stream of `enemy` zombies in `mode`. */
function probe(mode, type, level, enemy) {
  const sim = new Sim([{ id: 'b', name: 'bench' }], { mode, map: 'meadow' });
  const me = sim.players.get('b');
  me.cash = 1e12;
  sim.wave.countdown = 1e9;
  const def = TOWERS[type];
  const range = def.levels[0].range ?? 12;
  const key = `${sim.map}:${def.placement ?? 'ground'}:${range}`;
  if (!spotMemo.has(key)) {
    const spot = spots(sim, def.placement, range)[0] ?? null;
    if (spot) {
      // where the path comes closest to the tower: zombies start a little before that
      let best = Infinity;
      for (let d = 0; d <= path.length; d += 1) {
        const p = path.at(d, { d }, 0);
        const far = (p.x - spot.x) ** 2 + (p.z - spot.z) ** 2;
        if (far < best) [best, spot.dist] = [far, d];
      }
    }
    spotMemo.set(key, spot);
  }
  const spot = spotMemo.get(key);
  if (!spot || sim.action('b', { a: 'place', type, x: spot.x, z: spot.z }) !== null) return 0;
  const t = [...sim.towers.values()][0];
  while (t.level < level) if (!upgrade(sim, 'b', t)) return 0;
  const from = Math.max(0, spot.dist - range * 0.7);
  let spawnT = 0;
  let before = 0;
  for (let s = 0; s < 11; s += 0.05) {
    if ((spawnT -= 0.05) <= 0) {
      spawnT = 1.5;
      sim.spawn(enemy, { hp: 1e9, dist: from, route: 0 });
    }
    sim.baseHp = 1e9;
    me.cash = 1e12;
    if (Math.abs(s - 3) < 0.02) before = t.damageDealt; // the first 3 seconds are warm-up
    sim.step(0.05);
    sim.events.length = 0;
  }
  return (t.damageDealt - before) / 8;
}

/**
 * How hard each level of tower `type` hits each kind of zombie `mode` sends: resistances, armor,
 * hidden and flying all show up here. Returns the bench levels with `vs: { enemyType: dps }` added.
 */
export function matchup(mode, type) {
  const key = `${mode}:${type}`;
  const cache = diskCache();
  if (!cache[key]) {
    const levels = benchOf(type);
    if (!levels) return null;
    const kinds = [...new Set(DIFFICULTIES[mode].waves.flatMap((w) => w.groups.map((g) => g[0])))];
    cache[key] = levels.map((l) => {
      const vs = {};
      for (const enemy of kinds) {
        try {
          vs[enemy] = Math.round(probe(mode, type, l.level, enemy) * 10) / 10;
        } catch {
          vs[enemy] = l.dps;
        }
      }
      return { ...l, vs };
    });
    saveDisk();
  }
  return cache[key];
}

// ---------------------------------------------------------------- the bot

/** The health waves `from`..`from + n - 1` send, by kind of zombie: [{ type, hp, hidden }]. */
function threats(sim, from, n = 3) {
  const out = [];
  for (let i = from; i < Math.min(sim.waves.length, from + n); i++) {
    for (const [type, count, , , x] of waveGroups(i, sim.waves)) out.push({ type, hp: (typeof x === 'number' ? x : ENEMIES[type].hp) * count, hidden: !!x?.hidden });
  }
  const total = out.reduce((s, o) => s + o.hp, 0) || 1;
  for (const o of out) o.hp /= total;
  return out;
}

/**
 * Plays one solo game of `mode` with a simple greedy bot and returns how it went.
 * The bot only knows towers that deal direct damage: it buys whatever adds the most measured
 * damage per dollar (counting what the next waves need: hidden, flying, lead), saves up when
 * the best buy is too dear, and panics into the best thing it can afford when zombies get close.
 * It never uses abilities and never sells, so a decent player does better than it does.
 * opts: { map, loadout: [types], farms: n (how many Farms it may run, 0 = none), log: fn }
 */
export function play(mode, opts = {}) {
  const random = Math.random;
  let seed = (opts.seed ?? 1) * 2654435761;
  Math.random = () => {
    // mulberry32: the same seed plays the same game
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try {
    return playGame(mode, opts);
  } finally {
    Math.random = random;
  }
}

function playGame(mode, opts) {
  const loadout = opts.loadout;
  // Measured first: a bench run loads its own map, which would swap the map under this game.
  const table = {};
  for (const type of loadout) table[type] = TOWERS[type].levels[0].income != null ? null : matchup(mode, type);
  const sim = new Sim([{ id: 'bot', name: 'bot' }], { mode, map: opts.map ?? 'meadow' });
  const me = sim.players.get('bot');
  const waves = [];
  const spotCache = new Map();
  let earned = me.cash;
  let lastCash = me.cash;
  let leakedThisWave = false;
  let maxedAt = null; // the wave on which the bot ran out of things to buy

  // What a level of a tower is worth at spot `at`: its measured damage per second x how much path
  // it reaches from there (a zombie only takes damage while it is in range). The damage is what
  // it does to the zombies of the coming waves (see matchup), so it buys what those waves call for.
  const samples = pathSamples(2);
  const coverMemo = new Map();
  const cover = (at, range) => {
    const key = `${at.x},${at.z},${range}`;
    if (!coverMemo.has(key)) {
      let n = 0;
      for (const p of samples) if ((p.x - at.x) ** 2 + (p.z - at.z) ** 2 <= range * range) n++;
      coverMemo.set(key, n);
    }
    return coverMemo.get(key);
  };
  const value = (type, level, th, at) => {
    const l = table[type]?.[level];
    if (!l) return 0;
    const sees = detection(l.type, level).hidden;
    let dps = 0;
    for (const o of th) dps += o.hp * (o.hidden && !sees ? 0 : (l.vs[o.type] ?? l.dps));
    return Math.max(dps, l.dps * 0.02) * cover(at, l.range);
  };
  // The best deal on tower `type` from `level` (-1 = not built yet): the later level that adds the
  // most value per dollar on the way there. Looking past the next step is what makes the bot buy
  // through a dull upgrade to reach hidden detection. Returns { cost of the next step, ratio }.
  const plan = (type, level, th, at) => {
    const b = table[type];
    if (!b?.[level + 1] || !at) return null;
    const have = level < 0 ? 0 : value(type, level, th, at);
    const paid = level < 0 ? 0 : b[level].cost;
    let ratio = 0;
    for (let k = level + 1; k < b.length; k++) ratio = Math.max(ratio, (value(type, k, th, at) - have) / (b[k].cost - paid));
    return { cost: b[level + 1].cost - paid, ratio };
  };
  // An enemy that stands still (a Viorb) out of everyone's reach: the next tower goes next to it.
  const camper = () => {
    for (const e of sim.enemies.values()) {
      if (ENEMIES[e.type].speed !== 0 || e.noCash) continue;
      const reached = [...sim.towers.values()].some((t) => (t.x - e.x) ** 2 + (t.z - e.z) ** 2 <= ((TOWERS[t.type].levels[t.level].range ?? 0) * 0.9) ** 2);
      if (!reached) return e;
    }
    return null;
  };
  const placeAt = (type) => {
    const def = TOWERS[type];
    const range = Math.max(8, def.levels[0].range ?? 12);
    const c = camper();
    if (c) {
      const towers = [...sim.towers.values()];
      let best = null;
      for (let x = c.x - range; x <= c.x + range; x += 1.5) {
        for (let z = c.z - range; z <= c.z + range; z += 1.5) {
          const d = Math.hypot(x - c.x, z - c.z);
          if (d <= range * 0.8 && (!best || d < best.d) && canPlace(x, z, towers, def.placement)) best = { x, z, d };
        }
      }
      if (best) return best;
    }
    const key = `${def.placement ?? 'ground'}:${Math.round(range / 4)}`;
    if (!spotCache.has(key)) spotCache.set(key, spots(sim, def.placement, range, 3));
    const list = spotCache.get(key);
    const towers = [...sim.towers.values()];
    while (list.length && !canPlace(list[0].x, list[0].z, towers, def.placement)) list.shift();
    return list[0] ?? null;
  };
  const spend = (o) => {
    const before = me.cash;
    if (o.t) {
      if (!upgrade(sim, 'bot', o.t)) return false;
    } else {
      const s = placeAt(o.type);
      if (!s || sim.action('bot', { a: 'place', type: o.type, x: s.x, z: s.z }) !== null) return false;
    }
    lastCash -= before - me.cash;
    return true;
  };

  const think = () => {
    const th = threats(sim, sim.wave.index);
    const danger = leakedThisWave || [...sim.enemies.values()].some((e) => e.dist > path.length * 0.55);
    for (let n = 0; n < 30; n++) {
      const options = [];
      const owned = {};
      for (const t of sim.towers.values()) {
        const root = rootType(t.type);
        owned[root] = (owned[root] ?? 0) + 1;
        if (TOWERS[t.type].levels[t.level].income != null) {
          // A Farm upgrade is worth it while it pays for itself well before the game ends.
          const s = TOWERS[t.type].levels[t.level + 1];
          const left = sim.waves.length - sim.wave.index - 1;
          if (s && !danger && (s.income - TOWERS[t.type].levels[t.level].income) * left > s.cost * 2) options.push({ t, cost: s.cost, ratio: 1e3 / s.cost });
          continue;
        }
        const pl = t.failed ? null : plan(root, t.level, th, t);
        if (pl) options.push({ t, ...pl });
      }
      for (const type of loadout) {
        const def = TOWERS[type];
        if ((owned[type] ?? 0) >= towerLimit(def, 1)) continue;
        if (def.levels[0].income != null) {
          const left = sim.waves.length - sim.wave.index - 1;
          if ((owned[type] ?? 0) < (opts.farms ?? 0) && !danger && def.levels[0].income * left > def.cost * 2) options.push({ type, cost: def.cost, ratio: 1e3 / def.cost });
          continue;
        }
        const pl = plan(type, -1, th, placeAt(type));
        if (pl) options.push({ type, ...pl });
      }
      options.sort((a, b) => b.ratio - a.ratio);
      let pick = options[0];
      if (!options.length && sim.towers.size && maxedAt == null) maxedAt = sim.wave.index + 1;
      if (camper()) pick = options.filter((o) => o.type).sort((a, b) => a.cost - b.cost)[0] ?? pick; // the cheapest new tower will do
      if (!pick || pick.ratio <= 0) return;
      if (pick.cost > me.cash) {
        if (!danger) return; // save up for it
        pick = options.find((o) => o.cost <= me.cash && o.ratio > 0);
        if (!pick) return;
      }
      if (!spend(pick)) {
        if (pick.t) pick.t.failed = true;
        else return;
      }
    }
  };

  let simT = 0;
  let nextThink = 0;
  const mark = () => {
    let spent = 0;
    for (const t of sim.towers.values()) spent += t.spent;
    waves.push({ wave: sim.wave.index + 1, t: Math.round(simT), cash: me.cash, spent, earned: Math.round(earned), base: Math.round(sim.baseHp), towers: sim.towers.size });
  };
  while (!sim.over && simT < 4 * 3600) {
    sim.step(0.05);
    simT += 0.05;
    earned += Math.max(0, me.cash - lastCash); // everything that came in (the bot's own spending is taken out in spend)
    lastCash = me.cash;
    for (const ev of sim.events) {
      if (ev.k === 'waveStart') {
        mark();
        leakedThisWave = false;
      } else if (ev.k === 'leak') leakedThisWave = true;
    }
    sim.events.length = 0;
    if (simT >= nextThink) {
      think();
      nextThink = simT + 0.5;
    }
  }
  mark();
  return { mode, win: sim.over === 1, wave: sim.wave.index + 1, of: sim.waves.length, time: Math.round(simT), earned: Math.round(earned), base: Math.round(sim.baseHp), maxedAt, waves, sim };
}

/** Runs `fn` with DIFFICULTIES[mode] patched by `patch`, then puts it back. */
export function withMode(mode, patch, fn) {
  const d = DIFFICULTIES[mode];
  const old = {};
  for (const k of Object.keys(patch)) {
    old[k] = Object.getOwnPropertyDescriptor(d, k);
    d[k] = patch[k];
  }
  try {
    return fn();
  } finally {
    for (const k of Object.keys(patch)) {
      if (old[k]) Object.defineProperty(d, k, old[k]);
      else delete d[k];
    }
  }
}
