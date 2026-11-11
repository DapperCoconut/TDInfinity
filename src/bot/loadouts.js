// Which towers a bot brings into a game, by mode and role (see bot.js for how it plays them).
// Easier modes get cheap towers; harder modes get dearer ones and more event, golden and evolved
// forms. Hardcore bots bring the strongest things in the game. Plain data, no three.js, no DOM.
import { TOWERS, towerCost } from '../config.js';
import { levelPower } from './value.js';

/** Towers a bot may bring: base towers plus their alternate, golden and evolved forms (not upgrade branches). */
const POOL = Object.keys(TOWERS).filter((k) => {
  const d = TOWERS[k];
  if (d.branchOf) return false;
  if (d.cost == null || !d.levels?.length || towerCost(d) > 25000) return false;
  if (k === 'anarchist' || k === 'relic' || k === 'hacker') return false; // Versus-only, a joke tower, a cloner: not for bots
  return true;
});

/** The best damage per second per dollar any level of tower `k` reaches (what early and mid picks are judged by). */
const quality = (k) => {
  const d = TOWERS[k];
  let best = 0;
  let total = towerCost(d);
  for (let i = 0; i < d.levels.length; i++) {
    if (i) total += d.levels[i].cost || 0;
    best = Math.max(best, levelPower(d, d.levels[i]) / Math.max(1, total));
  }
  return best;
};
/** The damage per second of tower `k`'s top level (what late picks are judged by: raw power). */
const topPower = (k) => {
  const d = TOWERS[k];
  return Math.max(...d.levels.map((l) => levelPower(d, l)));
};

const isEvent = (k) => !!TOWERS[k].event;
const isSpecial = (k) => !!(TOWERS[k].goldOf || TOWERS[k].evolved || TOWERS[k].altOf);
const kindOf = (k) => TOWERS[k].kind ?? 'attack';
const SUPPORTS = ['commander', 'dj', 'shieldTower', 'balloonPal', 'fireworkTech'];
const FARMS = ['farm', 'oilDerrick'];

// What each mode's bots may buy: the dearest base price they'll bring, whether event / golden /
// evolved forms show up, and how many of their picks come from the top of the pool.
const MODE_RULES = {
  easy: { maxCost: 1000, event: 0, special: 0, top: 0 },
  medium: { maxCost: 2500, event: 1, special: 0, top: 0 },
  hard: { maxCost: 5000, event: 1, special: 1, top: 0 },
  expert: { maxCost: 8000, event: 2, special: 1, top: 1 },
  insane: { maxCost: Infinity, event: 2, special: 2, top: 1 },
  void: { maxCost: Infinity, event: 2, special: 2, top: 2 },
  hardcore: { maxCost: Infinity, event: 3, special: 3, top: 3 },
  halloween: { maxCost: Infinity, event: 3, special: 1, top: 1 },
  zombies: { maxCost: 3000, event: 1, special: 1, top: 0 }, // Versus
};

/** What tier of tower goes in each loadout slot, by role. e = early, m = mid, l = late, s = support, f = farm. */
const ROLE_SLOTS = {
  generalist: 'eemmls',
  farmer: 'femmls',
  dps: 'emllls',
  support: 'emlsss',
};

/** Bot roles for `n` bots in `mode`: with three or more, one always farms early. */
export function botRoles(n, mode) {
  const hc = mode === 'hardcore';
  const base = hc ? ['dps', 'dps', 'generalist', 'support', 'dps', 'generalist'] : ['generalist', 'dps', 'generalist', 'support', 'dps', 'generalist'];
  const roles = base.slice(0, n);
  if (n >= 3) roles[hc ? 2 : 0] = 'farmer';
  return roles;
}

/** A random pick from `list`, weighted toward the front (the better towers), using `rnd` (0..1). */
function pickFrom(list, rnd, used) {
  const open = list.filter((k) => !used.has(k));
  if (!open.length) return null;
  const i = Math.min(open.length - 1, Math.floor(open.length * rnd() ** 1.6));
  return open[i];
}

/**
 * Six towers for a bot with `role` in `mode`. `rnd` is a random source (0..1) so bots in one game
 * differ. `spotsFor(placement)` says whether the map has any spot for cliff / water towers (none:
 * those towers aren't brought). Returns { towers, phase: { type: 0 early | 1 mid | 2 late } }.
 */
export function botLoadout(mode, role, rnd = Math.random, spotsFor = () => true) {
  const rules = MODE_RULES[mode] ?? MODE_RULES.easy;
  const allowed = POOL.filter((k) => {
    const d = TOWERS[k];
    if (towerCost(d) > rules.maxCost) return false;
    if (d.ground === false) return false; // air-only (AA Turret): most waves walk
    if (!rules.event && isEvent(k)) return false;
    if (!rules.special && isSpecial(k)) return false;
    if (d.placement && d.placement !== 'ground' && d.placement !== 'any' && !spotsFor(d.placement)) return false;
    return true;
  });
  const attack = allowed.filter((k) => kindOf(k) === 'attack' || kindOf(k) === 'spawner');
  // Tiers by price: the cheapest third is early game, the dearest third late game.
  const byCost = [...attack].sort((a, b) => towerCost(TOWERS[a]) - towerCost(TOWERS[b]));
  const n = byCost.length;
  const tier = (from, to) => byCost.slice(Math.floor(n * from), Math.max(Math.floor(n * from) + 1, Math.ceil(n * to)));
  const byQuality = (list) => [...list].sort((a, b) => quality(b) - quality(a));
  const byPower = (list) => [...list].sort((a, b) => topPower(b) - topPower(a));
  const tiers = {
    e: byQuality(tier(0, 0.34)),
    m: byQuality(tier(0.3, 0.68)),
    l: byPower(tier(0.62, 1)),
    s: SUPPORTS.filter((k) => allowed.includes(k)),
    f: FARMS.filter((k) => allowed.includes(k) && (k !== 'oilDerrick' || rules.top > 0)),
  };
  // Hardcore and the top modes: late picks come straight from the strongest towers in the game.
  if (rules.top >= 2) tiers.l = byPower(byCost.slice(Math.floor(n * 0.5)));
  const used = new Set();
  const towers = [];
  const phase = {};
  let events = 0;
  let specials = 0;
  for (const slot of ROLE_SLOTS[role] ?? ROLE_SLOTS.generalist) {
    let list = tiers[slot] ?? tiers.m;
    // Only so many event / special forms per loadout, and never the same tower family twice.
    list = list.filter((k) => (events < rules.event || !isEvent(k)) && (specials < rules.special || !isSpecial(k)) && !sameFamily(k, used));
    const k = pickFrom(list, slot === 'f' || slot === 's' ? () => 0 : rnd, used) ?? pickFrom(tiers.m, rnd, used) ?? pickFrom(attack, rnd, used);
    if (!k) continue;
    used.add(k);
    towers.push(k);
    phase[k] = slot === 'e' || slot === 'f' ? 0 : slot === 'm' || slot === 's' ? 1 : 2;
    if (isEvent(k)) events++;
    if (isSpecial(k)) specials++;
  }
  return { towers, phase };
}

/** Is `k` another form of a tower already in `used` (its gold, evolved or alternate form)? */
function sameFamily(k, used) {
  const d = TOWERS[k];
  const root = d.goldOf ?? d.altOf ?? d.evoFrom ?? k;
  for (const u of used) {
    const o = TOWERS[u];
    if ((o.goldOf ?? o.altOf ?? o.evoFrom ?? u) === root) return true;
  }
  return false;
}

export const BOT_NAMES = ['Max', 'Ruby', 'Leo', 'Zoe', 'Kai', 'Mia', 'Finn', 'Ivy', 'Theo', 'Nora', 'Eli', 'Lily'];
