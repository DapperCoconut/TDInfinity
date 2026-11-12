// All gameplay tuning starts here so balance changes don't require touching game logic.
// This file holds the global numbers (GAME, VERSUS, MP), joins the tower groups into TOWERS, runs
// the load-time passes over them (RANGE_BOOST, TOWER_TUNE) and lists the modes (DIFFICULTIES).
// The big tables live in their own files, and everything is still exported from here:
//   towers/*.js   the tower groups (towers/shared.js has the units and abilities they share)
//   enemies.js    ENEMIES
//   waves.js      the waves of each mode

import { CROSS_TOWERS } from './crosstowers.js';
import { HERO_TOWERS } from './herotowers.js';
import { TENTH_TOWERS } from './tenthtowers.js';
import { GOLD_TOWERS } from './goldtowers.js';
import { HARDCORE_WAVES } from './hardcore.js';
import { HALLOWEEN_TIMERS, HALLOWEEN_WAVES } from './halloween.js';
import { HALLOWEEN2_TIMERS, HALLOWEEN2_WAVES } from './halloween2.js';
import { HALLOWEEN3_TIMERS, HALLOWEEN3_WAVES } from './halloween3.js';
import { buildRemix } from './halloweenremix.js';
export { BOSS_KNOCK, KNOCK_STUDS, abilityCost, arrowModes, arrowName, timedAbility } from './towers/shared.js';
import { TOWERS_GUNNERS } from './towers/gunners.js';
import { TOWERS_HEAVY } from './towers/heavy.js';
import { TOWERS_SPREAD } from './towers/spread.js';
import { TOWERS_MELEE } from './towers/melee.js';
import { TOWERS_SPAWNERS } from './towers/spawners.js';
import { TOWERS_SUPPORT } from './towers/support.js';
import { TOWERS_PATHS } from './towers/paths.js';
import { TOWERS_GOLDEN } from './towers/golden.js';
import { TOWERS_EVENT_1 } from './towers/event1.js';
import { TOWERS_FORMS_4 } from './towers/forms4.js';
import { TOWERS_EVENT_2 } from './towers/event2.js';
import { TOWERS_EVOLVED } from './towers/evolved.js';
import { TOWERS_WAVE_6 } from './towers/wave6.js';
import { TOWERS_GOLDEN_6 } from './towers/golden6.js';
import { TOWERS_WAVE_7A } from './towers/wave7a.js';
import { TOWERS_WAVE_7B } from './towers/wave7b.js';
export { ENEMIES } from './enemies.js';
import { EASY_WAVES, EXPERT_WAVES, HARD_WAVES, INSANE_WAVES, MEDIUM_WAVES, VOID_WAVES, WAVES } from './waves.js';
export { EASY_WAVES, EXPERT_WAVES, HARD_WAVES, INSANE_WAVES, MEDIUM_WAVES, VOID_WAVES, WAVES };

/** Game speed multipliers the host can pick from. */
export const SPEEDS = [1, 2, 3, 5, 10];

export const GAME = {
  startCash: 500,
  baseHp: 150,
  firstIntermission: 20, // seconds to place towers before wave 1
  intermission: 8, // seconds between waves
  earnMult: 2, // multiplies cash from kills (enemy `reward`, Versus only) and end-of-wave bonuses
  // Cash for damage, like Tower Battles and TDS: every point of health damage your side deals pays
  // each player this much (DIFFICULTIES[mode].dmgCash sets a mode's own rate), so a wave pays for
  // the defense it takes. Tune it with tools/balance/table.mjs. Versus pays for kills instead.
  dmgCash: 0.5,
  waveBonus: (wave) => GAME.earnMult * (100 + 40 * wave + 3 * wave * wave), // wave is 1-based; ramps up quadratically
  hpScalePerWave: 0.06, // enemy HP multiplier grows by this much each wave
  sellRatio: 0.5,
  corruptSell: 0.2, // Void mode: towers VOID corrupted sell for this much more
  // Tower health: a level's `hp`, or `towerHp` + `towerHpPerLevel` per level. Close-range towers
  // are tougher: up to `towerHpShort` more at range `towerHpShortRange[0]` or less, fading to
  // nothing at `towerHpShortRange[1]`. A tower at 0 health is knocked out (stops working) until a
  // Medic or Health Pack heals it.
  towerHp: 100,
  towerHpPerLevel: 30,
  towerHpShort: 0.5,
  towerHpShortRange: [10.6, 40], // was [8, 30] before the 33% range pass (see RANGE_BOOST)
  // Stealth (a level's `stealth`, or a Ghost Grenade): enemies can't target the tower (the Molten
  // Warlord won't throw axes at it or slam for it), and splash from their attacks can't hurt or
  // stun it. A level's stealth slowly drains: it lasts `stealthTime` s (the level's, or this),
  // then the tower is revealed for `restealth` s (the level's, or this) before it refills.
  // Ghost Grenade stealth doesn't drain; it just lasts its duration.
  stealthTime: 20,
  restealth: 5,
  loadoutSize: 6, // towers a player can bring into a game
  // Credits earned at the end of a game (spent in the Loadout & Shop on new towers).
  credits: (wavesCleared, win) => wavesCleared * 40 + (win ? 600 : 0),
  mpHpScale: 0.5, // in multiplayer, enemy HP is multiplied by 1 + this * (players - 1)
  // Hard mode wave modifiers (guessed): Bloated = this much more health, Nimble = this much faster,
  // Health Regen = heals this share of max health per second (2% every 2 s).
  bloated: 1.5,
  nimble: 1.3,
  healthRegen: 0.01,
  unitContact: 0.4, // zombies touching a Soldier squad hurt it by (their base damage * this) per second
  starBattery: 0.1, // Star Cannon: a battery adds this share of a full charge
  danceBossScale: 0.5, // bosses dance only this fraction of Apocalypse Rave's duration
  // Dimension Shards: a rare purple currency for alternate tower forms. Only winning pays them.
  shards: (win) => (win ? 1 : 0),
  // Gems: Hardcore's currency (only Hardcore pays them). Necromancer and Hacker are bought with them.
  gems: (wavesCleared, win) => wavesCleared * 100 + (win ? 5000 : 0),
};

// Versus (PVP): every player defends their own map; the maps are joined by bridges.
// Waves run on one shared clock and never stop; the last base standing wins.
export const VERSUS = {
  minPlayers: 2,
  firstIntermission: 30, // seconds to build before wave 1
  waveBreak: 14, // seconds after a wave's last spawn before the next wave starts
  minWaveGap: 26, // ...but never less than this between wave starts
  // Endless waves get tougher fast after the scripted ones run out, so matches end.
  hpMult: (index) => (1 + index * 0.07) * 1.07 ** Math.max(0, index - 11),
  // Credits: per wave survived, plus a bonus by finishing place (1st, 2nd, 3rd, 4th).
  credits: (waves, place) => waves * 40 + ([0, 800, 300, 120, 0][place] ?? 0),
  shards: (place) => (place === 1 ? 1 : 0), // Dimension Shards for winning the battle
  // Zombies you can buy and send to an opponent's map. n per purchase, `gap` seconds apart.
  // minWave: the first wave (1-based) this send unlocks on.
  sends: {
    normal: { n: 5, cost: 75, gap: 0.6, minWave: 1 },
    fast: { n: 5, cost: 110, gap: 0.45, minWave: 1 },
    slow: { n: 2, cost: 220, gap: 1.2, minWave: 3 },
    flying: { n: 4, cost: 180, gap: 0.7, minWave: 4 },
    lead: { n: 3, cost: 240, gap: 1.0, minWave: 5 },
    hidden: { n: 3, cost: 320, gap: 0.8, minWave: 5 },
    android: { n: 1, cost: 260, gap: 0, minWave: 4 },
    boss: { n: 1, cost: 2200, gap: 0, minWave: 8 },
  },
  smokeRange: 0.5, // smoked towers keep this fraction of their range
};

/** What placing `def` costs: some towers are cheaper outside Versus. */
export const towerCost = (def, versus) => (!versus && def.survivalCost != null ? def.survivalCost : def.cost);

export const MP = {
  maxRoomPlayers: 4,
  maxPartySize: 4,
  hardcorePlayers: 6, // Hardcore co-op rooms hold up to this many (DIFFICULTIES[mode].maxPlayers)
  tickRate: 20, // server simulation steps per second
  snapshotEvery: 2, // send a full state snapshot every N ticks
};

// Shirt colors given to players in join order.
export const PLAYER_COLORS = [0x1e88e5, 0xe53935, 0xfdd835, 0x8e24aa, 0xfb8c00, 0x00acc1];

export const TARGET_MODES = ['First', 'Last', 'Strongest', 'Closest'];

// Every tower in the game. The order here is the order towers are listed in (the shop too), so
// keep it. How a tower entry is written is explained at the top of towers/shared.js.
export const TOWERS = {
  ...TOWERS_GUNNERS,
  ...TOWERS_HEAVY,
  ...TOWERS_SPREAD,
  ...TOWERS_MELEE,
  ...TOWERS_SPAWNERS,
  ...TOWERS_SUPPORT,
  ...TOWERS_PATHS,
  ...TOWERS_GOLDEN,
  ...TOWERS_EVENT_1,
  ...TOWERS_FORMS_4,
  ...TOWERS_EVENT_2,
  ...TOWERS_EVOLVED,
  ...TOWERS_WAVE_6,
  ...TOWERS_GOLDEN_6,
  ...TOWERS_WAVE_7A,
  ...TOWERS_WAVE_7B,
  // Wave 8: crosspath alternate forms (Slinger, Crossbower, ... Surveyor) and the Cyberblade. See crosstowers.js.
  ...CROSS_TOWERS,
  // Wave 9: hero towers (Wizard, Chef, ... Balloon Pal, Buzzer, Nuki Launcher, Hayes). See herotowers.js.
  ...HERO_TOWERS,
  // Wave 10: Scarecrow / Knifer / Barracks reworks and new parents (Paralyzer, Helicopter, Slugger,
  // Doctor, Engineer, Void Traitor) plus new towers. See tenthtowers.js.
  ...TENTH_TOWERS,
  // Good as gold: golden Samurai, Mercenary, Focus, Outlaw, Buccaneer, Enforcement Base, Submerge,
  // Commando and Orbit, plus the Gold Commander. See goldtowers.js.
  ...GOLD_TOWERS,
};

/**
 * Range pass (2026-11-10): the whole cast reaches 33% farther than the numbers written in the
 * tables above. Every distance a tower (or anything it sends out: units, sentries, drones,
 * medics, abilities) reaches with is scaled here, once, so the tables keep their original values:
 * `range`, `aura` (support towers), `buildRange` (Engineer), `beamRange` (Doctor), `patrol`
 * (helicopters) and `orbit` (planes). Left alone: blast `radius`, `minRange` dead zones,
 * `meleeRange` / `closeRange` / `coolRange` (inner zones), and anything under 2, which is a
 * range *multiplier* (ability `range: 1.2`, DJ `tracks.range: 0.15`), not a distance. Zombies
 * (ENEMIES) keep their own ranges.
 */
export const RANGE_BOOST = 1.33;
const REACH_KEYS = new Set(['range', 'aura', 'buildRange', 'beamRange', 'patrol', 'orbit']);
(function boostReach(o, seen) {
  if (!o || typeof o !== 'object' || seen.has(o)) return; // shared objects (units, sentries) are scaled once
  seen.add(o);
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (typeof v === 'number') {
      if (REACH_KEYS.has(k) && Number.isFinite(v) && v >= 2) o[k] = Math.round(v * RANGE_BOOST * 10) / 10;
    } else boostReach(v, seen);
  }
})(TOWERS, new Set());

/**
 * Balance pass (2026-11-10): towers that were far stronger or weaker than their cost says, measured
 * by benching every tower at every level and by letting each one play Hard alone. Like the range
 * pass above it is applied here, once, on top of the tables, so the tables keep the numbers they
 * were written with. Keyed by tower; an entry also covers that tower's other upgrade paths unless
 * a path has its own entry (`johnBottom`).
 *   dmg:  every damage number of the tower and of what it sends out (shots, burns, blasts, unit
 *         and sentry guns, damaging abilities) is multiplied by this. An array is per level.
 *   hp:   health of what it sends out (units, sentries) is multiplied by this.
 *   cost: placing it and every upgrade cost this much more / less.
 *   from: only levels from this one on, and only this path (1 = the levels a path has to itself).
 * Left alone on purpose: a Mako's stored charged hit, the damage a Spiritual Advocate needs per
 * soul, heals, the Slinger's team boost, and what abilities cost to use.
 * Upgrade descriptions and blurbs that quote a number were rewritten by hand to say the number
 * the game ends up with, so change them along with an entry. Ability descriptions follow on
 * their own: the pass swaps the numbers it changes into the ability's text.
 */
export const TOWER_TUNE = {
  // --- Too strong for their cost ---
  sentryEngineer: { dmg: [0.18, 0.1, 0.1, 0.2, 0.27] },
  toxicnatorMaitake: { dmg: 0.25 },
  gooGunner: { dmg: 0.38 },
  frostBlaster: { dmg: 0.4, from: 1 }, // top path (Cryo Blaster)
  voidKing: { dmg: 0.33 },
  sledger: { dmg: 0.4 },
  sledgerIce: { dmg: 0.33 },
  executioner: { dmg: 0.4 },
  traitor: { dmg: 0.38 },
  voidTraitor: { dmg: 0.5 },
  spiritAdvocate: { dmg: 0.55 },
  biologist: { dmg: 0.42 },
  jester: { dmg: 0.45 },
  goldPyromancer: { dmg: 0.42 },
  flamethrowerPyro: { dmg: 0.55 },
  flamethrowerDumpster: { dmg: 0.5 },
  flameTrooper: { dmg: 0.75 },
  enforcerSlammer: { dmg: 0.5 },
  kniferYasuke: { dmg: 0.6 },
  gladiator: { dmg: 0.55 },
  brawler: { dmg: 0.5 },
  brawlerMako: { dmg: 0.6 },
  goldMako: { dmg: 0.52 },
  johnBottom: { dmg: 0.55, from: 1 },
  grenadierSoda: { dmg: 0.75 },
  slugger: { dmg: 0.4 },
  nukiLauncher: { dmg: 0.4, hp: 0.5 },
  cryomancer: { dmg: 0.6 },
  turretXwmBottom: { dmg: 0.6, from: 1 },
  barracksOddport: { dmg: 0.3, hp: 0.35 },
  elfCamp: { dmg: 0.4, hp: 0.4 },
  zedKart: { dmg: 0.45, hp: 0.45 },
  plasmaPulse: { dmg: 0.6 },
  // --- Too weak for their cost ---
  sniper: { dmg: 1.5 },
  tweeter: { dmg: 1.8 },
  sniperPenetrator: { dmg: 1.5 },
  hiredGun: { dmg: 1.8 },
  goldHiredGun: { dmg: 1.4 },
  scoutSlinger: { dmg: 3 },
  mercLaser: { dmg: 1.8, from: 1 }, // top path
  focus: { dmg: 1.4 },
  railgunnerElectricizer: { dmg: 1.4 },
  shotgunner: { dmg: 1.4 },
  shotgunnerPump: { dmg: 1.9 },
  splash: { dmg: 3 },
  trapperGoblino: { dmg: 3 },
  swarmer: { dmg: 1.4 },
  grenadier: { dmg: 1.7 },
  grenadierAssaultBottom: { dmg: 1.8, from: 1 },
  rocketeer: { dmg: 2 },
  archer: { dmg: 1.6 },
  elf: { dmg: 1.8 },
  snowballer: { dmg: 3 },
  aviator: { dmg: 2 },
  mineLayer: { dmg: 2.5, from: 1 }, // top path
  frostRangerBottom: { dmg: 1.8, from: 1 },
  necromancer: { dmg: 1.4 },
  raider: { dmg: 1.8 },
  submerge: { dmg: 1.8 },
  goldSubmerge: { dmg: 1.8 },
  goldOrbit: { dmg: 1.8 },
  goldMobsterBottom: { dmg: 1.4, from: 1 },
  enforcementBase: { dmg: 1.3, hp: 1.2 },
  voidPort: { dmg: 1.4, hp: 1.3 },
  barracks: { dmg: 2.5, hp: 2.5 },
  valkyr: { dmg: 2, hp: 1.8 },
  duckyNest: { dmg: 3, hp: 2.5 },
  punkbuster: { dmg: 3, hp: 3, cost: 0.7 },
  mercenary: { dmg: 3, hp: 2.5 },
  zedRecon: { dmg: 3, hp: 3, cost: 0.5 },
  // --- Cost more than any game pays ---
  goldWarship: { cost: 0.3, dmg: 0.4 },
  goldWarshipBottom: { cost: 0.2, dmg: 0.12, from: 1 },
};
const TUNE_DMG_KEYS = new Set(['damage', 'dps', 'burn', 'chillDps', 'dDmg', 'maxDamage', 'nearDmg', 'pulseDamage', 'unitDamage', 'bump', 'dmgMin']);
const tuneNum = (v, m) => {
  const x = v * m;
  if (x >= 1000) return Number(x.toPrecision(3));
  if (x >= 100) return Math.round(x / 5) * 5;
  return x >= 10 ? Math.round(x) : Math.round(x * 10) / 10;
};
const tuneCost = (v, m) => {
  const x = v * m;
  const step = x >= 100000 ? 5000 : x >= 10000 ? 500 : x >= 1000 ? 50 : 5;
  return Math.round(x / step) * step;
};
(function tuneTowers() {
  // Which entry covers a level: a path's own entry from its `from` level on; below that (and on
  // paths without an entry) the tower's whole-tower entry, if it has one.
  const entryOf = (type, i) => {
    const own = TOWER_TUNE[type];
    if (own && i >= (own.from ?? 0)) return own;
    const root = TOWER_TUNE[TOWERS[type].branchOf ?? type];
    return root && root.from == null ? root : null;
  };
  // Anything two entries (or a tuned and an untuned tower) both use is left alone, so tuning one
  // tower never moves another: e.g. the goons both Golden Mobster paths call in.
  const user = new Map();
  const shared = new Set();
  const claim = (o, tn, seen) => {
    if (!o || typeof o !== 'object' || seen.has(o)) return;
    seen.add(o);
    if (!user.has(o)) user.set(o, tn);
    else if (user.get(o) !== tn) shared.add(o);
    for (const v of Object.values(o)) claim(v, tn, seen);
  };
  for (const [type, def] of Object.entries(TOWERS)) def.levels.forEach((s, i) => claim(s, entryOf(type, i), new Set()));
  const seen = new Set(); // things a tower uses at several levels are scaled once
  // `in_`: the key `o` sits under. Three keys are damage only in some places: an axe's `ramp` is
  // damage per bounce (elsewhere it's a time), `splash` is the damage to the zombies around the one
  // hit (on a unit's gun it's a radius), and a `damages` list is all damage numbers.
  // `said`: the ability (or other described thing inside a level) `o` belongs to. Its description is
  // often built from its numbers when the table is made, so the numbers that change here are noted
  // and swapped in its text afterwards. (A level's own description is written by hand, to match.)
  const told = new Map(); // described thing -> Map(old number -> new number, or null if two disagree)
  const scale = (o, dmg, hp, deep, in_ = '', said = null) => {
    if (!o || typeof o !== 'object' || seen.has(o) || shared.has(o)) return;
    seen.add(o);
    if (deep && typeof o.desc === 'string') said = o;
    const set = (k, n) => {
      if (said && n !== o[k]) {
        const m = told.get(said) ?? told.set(said, new Map()).get(said);
        m.set(o[k], m.has(o[k]) && m.get(o[k]) !== n ? null : n);
      }
      o[k] = n;
    };
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v !== 'number') scale(v, dmg, hp, true, Array.isArray(o) ? in_ : k, said);
      else if (!(v > 0) || !Number.isFinite(v)) continue;
      else if ((TUNE_DMG_KEYS.has(k) || (k === 'ramp' && in_ === 'axe') || (k === 'splash' && in_ !== 'gun') || (in_ === 'damages' && Array.isArray(o))) && dmg !== 1) set(k, tuneNum(v, dmg));
      else if (k === 'hp' && deep && hp !== 1) set(k, tuneNum(v, hp));
    }
  };
  for (const [type, def] of Object.entries(TOWERS)) {
    const root = TOWER_TUNE[def.branchOf ?? type];
    if (root?.cost && def.cost) def.cost = tuneCost(def.cost, root.cost);
    def.levels.forEach((s, i) => {
      const tn = entryOf(type, i);
      if (!tn || seen.has(s) || shared.has(s)) return;
      if (tn.cost && s.cost) s.cost = tuneCost(s.cost, tn.cost);
      scale(s, Array.isArray(tn.dmg) ? tn.dmg[i] ?? 1 : tn.dmg ?? 1, tn.hp ?? 1, false);
    });
    // A crosspath tower's upgrade buttons hold their own copy of the level they lead to, and it is
    // that copy's price the game charges.
    for (const [to, next] of [[def.cross?.up, def.cross?.upNext], [def.cross?.down, def.cross?.downNext]]) {
      const i = next ? TOWERS[to].levels.length - 1 : 0;
      const tn = next && entryOf(to, i);
      if (!tn) continue;
      if (tn.cost && next.cost) next.cost = tuneCost(next.cost, tn.cost);
      scale(next, Array.isArray(tn.dmg) ? tn.dmg[i] ?? 1 : tn.dmg ?? 1, tn.hp ?? 1, false);
    }
  }
  for (const [o, nums] of told) {
    o.desc = o.desc.replace(/\d[\d,]*(?:\.\d+)?/g, (txt) => {
      const n = nums.get(Number(txt.replace(/,/g, '')));
      return n == null ? txt : n >= 1000 ? n.toLocaleString('en-US') : String(n);
    });
  }
})();

/**
 * Crosspath towers (see crosstowers.js): what the next upgrade on `path` ('top' / 'bottom') of
 * a tower of `type` would be: { type, next } (`next` is the new level, with the upgrade's own
 * name, desc, cost, tier, path and stack), or null if that path is maxed or blocked.
 */
export function crossNext(type, path) {
  const c = TOWERS[type]?.cross;
  if (!c) return null;
  const bottom = path === 'bottom';
  const to = bottom ? c.down : c.up;
  return to ? { type: to, next: bottom ? c.downNext : c.upNext } : null;
}

/**
 * Upgrades with `stack` (most tier-5 upgrades, Businessman X-3 / X-4) cost `stack` more for
 * every tower in the match (any player's) of the same tower that already has that tier on that path.
 */
export function crossStackMult(towers, t, nx) {
  const st = nx?.next?.stack;
  if (!st) return 1;
  const root = rootType(t.type);
  const top = nx.next.path === 'Top';
  let n = 0;
  for (const o of towers) {
    if (o === t || o.holo || rootType(o.type) !== root) continue;
    const c = TOWERS[o.type].cross;
    if (c && (top ? c.a : c.b) >= nx.next.tier) n++;
  }
  return 1 + st * n;
}

/** What Hologram Tower ability `ab` costs to clone tower `src` (a share of its total cost). */
export const cloneCost = (ab, src) => Math.round(ab.clone * src.spent);

/** A spawner level's extra units on their own timers: [{ n, unit, every }] for unit2, unit3, unit4. */
export const spawnExtras = (s) => [2, 3, 4, 5, 6].filter((n) => s[`unit${n}`]).map((n) => ({ n, unit: s[`unit${n}`], every: s[`spawnEvery${n}`] }));

/** Placement limit of `def` with `players` on the team (`teamLimit` lowers it in bigger teams). */
export const towerLimit = (def, players = 1) =>
  def.teamLimit ? def.teamLimit[Math.max(0, Math.min(players, def.teamLimit.length) - 1)] : def.limit;

/** The tower a branch (upgrade path) belongs to, e.g. 'pursuitBottom' -> 'pursuit'. */
export const rootType = (type) => TOWERS[type]?.branchOf ?? type;

/**
 * What tower `type` at `level` can hit: { hidden, flying, lead } (Aviator spy rings that lend
 * hidden detection are added by the sim). Spawners report what their unit can hit.
 */
export function detection(type, level) {
  const def = typeof type === 'string' ? TOWERS[type] : type; // a type key or the def itself
  const s = def.levels[level];
  if (def.kind === 'spawner') {
    if (!s.roster && !s.unit2 && !s.plants && !s.drawings) return unitDetection(s.unit);
    // Mercenary Base / Armored Factory / Field Barracks: everything any of its units can hit.
    const d = { hidden: false, flying: false, lead: false };
    const units = s.roster ? s.roster.map((r) => r.unit) : s.plants ? s.plants.map((p) => p.unit) : s.drawings ? s.drawings : [s.unit, ...spawnExtras(s).map((x) => x.unit)];
    for (const u of units) for (const [k, v] of Object.entries(unitDetection(u))) d[k] ||= v;
    return d;
  }
  const lead = s.lead ?? (typeof def.lead === 'number' ? level >= def.lead : !!def.lead);
  // ground: false = it only hits flying zombies (AA Turret).
  return { hidden: !!s.hidden, flying: s.flying ?? def.flying ?? true, lead, ground: s.ground ?? def.ground ?? true };
}

/** What a spawner / goon unit can hit with its guns. Soldiers on foot can shoot flyers; vehicles can't. */
export const unitDetection = (u) => ({ hidden: !!u.hidden, flying: u.flying ?? !!u.soldiers, lead: !!u.lead });

/** Can something with detection `d` hit zombie `e`? */
export const canHit = (d, e) => !(e.noTarget || (e.hidden && !d.hidden && !(e.revealT > 0)) || (e.flying && !d.flying) || (!e.flying && d.ground === false) || (e.lead && !d.lead));

/** Does this tower only shoot inside a cone facing where it was placed (Gatling Gun, Sentry)? */
export const facesCone = (def) => !!(def.fps || def.facing);

/** Base towers (not alternate forms or event towers), in shop/loadout order. */
export const BASE_TOWERS = Object.keys(TOWERS).filter((t) => !TOWERS[t].altOf && !TOWERS[t].branchOf && !TOWERS[t].goldOf && !TOWERS[t].event);

/** Event towers: only unlocked with the Konami code, shown in their own Loadout section. */
export const EVENT_TOWERS = Object.keys(TOWERS).filter((t) => TOWERS[t].event);

/** Towers every player owns without buying them. */
export const STARTER_TOWERS = BASE_TOWERS.filter((t) => !TOWERS[t].price && !TOWERS[t].shards && !TOWERS[t].gems);

/** Evolved towers (type keys). */
export const EVOLVED_TOWERS = Object.keys(TOWERS).filter((t) => TOWERS[t].evolved);

/**
 * Tower levels: towers earn XP while you use them. XP to go from tower level `lv` to `lv + 1`;
 * levels stop at `TOWER_MAX_LEVEL`. Evolved towers use the same curve for their evolution level.
 */
export const TOWER_MAX_LEVEL = 20;
export const xpToNext = (lv) => 20 + 10 * lv;

/** Which XP a tower type earns / uses: golden perks and Bottom paths count for the tower they belong to. */
export const xpKey = (type) => {
  const def = TOWERS[type];
  if (def?.goldOf) return xpKey(def.goldOf);
  return def?.branchOf ?? type;
};

/** Alternate forms of a base tower (type keys). */
export const formsOf = (base) => Object.keys(TOWERS).filter((t) => TOWERS[t].altOf === base);

/** The golden perk tower of a tower or form (type key), or null. */
export const goldOf = (type) => Object.keys(TOWERS).find((t) => TOWERS[t].goldOf === type) ?? null;

/** The tower family a type belongs to: its base tower (through forms, paths and golden versions). */
export const familyOf = (type) => {
  const def = TOWERS[type];
  if (def?.goldOf) return familyOf(def.goldOf);
  return def?.altOf ?? rootType(type);
};

/** DJ Booth tracks, by tower `track` index: which `tracks` boost each one plays. */
export const TRACKS = [
  { key: 'range', name: 'Purple', color: 0xb388ff, css: '#b388ff' },
  { key: 'discount', name: 'Green', color: 0x69f0ae, css: '#69f0ae' },
  { key: 'dmg', name: 'Red', color: 0xff5252, css: '#ff5252' },
];

/** The track a DJ Booth plays after `track` at level data `s` (Red needs `tracks.dmg`). */
export const nextTrack = (track, s) => {
  let n = ((track || 0) + 1) % TRACKS.length;
  while (!s.tracks?.[TRACKS[n].key]) n = (n + 1) % TRACKS.length;
  return n;
};

/** How much of track `key` a DJ Booth at level data `s`, playing `track`, gives right now. */
export const trackBoost = (s, track, key) => {
  const i = TRACKS.findIndex((k) => k.key === key);
  return (s.tracks?.[key] || 0) * ((track || 0) === i ? 1 : s.offTrack || 0);
};

/**
 * What kind of damage tower `type` at `level` deals with its own attacks: 'bullet', 'laser',
 * 'golden' or null (melee, explosives, fire, ice, electricity...). Explosions, burns and other
 * damage over time never count as bullets or lasers. Bullet and laser resistance use this.
 */
const BULLET_TOWERS = new Set([
  'scout', 'scoutClassic', 'tweeter', 'cowboy', 'john', 'soldier', 'soldierClassic', 'soldierRanger', 'soldierQuarterer', 'operator',
  'marksman', 'marksmanHunter', 'merc', 'mercMilitant', 'commando', 'commandoMinigunner', 'commandoJuggernaut', 'aviator', 'aviatorAce',
  'railgunner', 'railgunnerRanger', 'sniper', 'sniperClassic', 'sniperTactical', 'sniperPenetrator', 'shotgunner', 'shotgunnerPump',
  'shotgunnerCombat', 'crookBoss', 'mobster', 'ghost', 'anarchist', 'pursuit', 'pursuitHeli', 'gatling', 'gatlingMachine', 'turret',
  'turretXwm', 'sentry', 'patrolBoat', 'goldMinigunner', 'goldCrookBoss', 'goldScout', 'goldCowboy', 'goldSoldier', 'goldScoutBase',
  'goldCommando', 'huntsman', 'frostRanger', 'toxicGunner', 'combatMedic', 'scoutHeli', 'jetTrooper', 'combatDrone', 'evoOperator',
  'evoBreacher', 'evoKingpin', 'evoTitan', 'eventCommandoPsycho', 'helicopter', 'hunter', 'doctor', 'sentryEngineer',
  'hiredGun', 'outlaw', 'liberator', 'ruptor', 'raider', 'plunder', 'spectre', 'planeswalker', 'stormwing',
  'shotgunnerGunslinger', 'sniperX', 'marksmanSharpshooter', 'commandoVulcan', 'cowboyBusinessman',
]);
const LASER_TOWERS = new Set(['phaser', 'phaserAccel']);
const kindCache = new Map();
export function damageKind(type, level) {
  const key = `${type}|${level}`;
  if (kindCache.has(key)) return kindCache.get(key);
  const def = TOWERS[type];
  const s = def?.levels[level] ?? {};
  const root = rootType(type);
  const kind = (s.laser ?? def?.laser) || LASER_TOWERS.has(root) ? 'laser'
    : (s.damageType ?? def?.damageType) === 'golden' ? 'golden'
      : BULLET_TOWERS.has(root) ? 'bullet' : null;
  kindCache.set(key, kind);
  return kind;
}

/** A Mercenary Base / Barracks / vehicle unit's gun: lasers (Rail Trooper, Laser Behemoths), otherwise bullets. */
// Units with ignoreBulletResist (Agent 3s) shoot bullets that resistance can't touch.
export const unitGunKind = (d, g) => (d.laser || g.laser || g.rail ? 'laser' : d.ignoreBulletResist || g.ignoreBulletResist ? 'none' : 'bullet');

/**
 * Difficulty modes for Solo and Co-op. Versus always uses the zombie waves.
 * `waves`: the scripted waves; winning means clearing the last one.
 * Each step up in difficulty has 5 more waves than the one before (Hard 40, Insane 50, ...); Easy (25), Medium (32) and Expert (30) follow the user's specs.
 * `unlock`: a tower winning it gives you (Void: the Void Traitor).
 * Versus always plays the original zombie WAVES (it isn't a difficulty you can pick).
 * `color` and `boss`: the mode's card in the menus is a square of that color with a picture of
 * that enemy (its final boss).
 */
// Harder modes pay more: `cash` multiplies starting cash and wave bonuses, `credits` the credits
// earned at the end, and `shards` is the Dimension Shards for winning.
// Upgrade perks won by beating a mode (DIFFICULTIES[mode].perk): an upgrade level with `perk: key`
// can't be bought until you have it. The text says how to get it.
export const PERKS = { bliss: 'Beat Insane mode' };
// Modes you have to beat before Hardcore unlocks (DIFFICULTIES[mode].needs).
export const HARDCORE_NEEDS = ['easy', 'medium', 'hard', 'expert', 'insane', 'void'];
export const PERK_NAMES = { bliss: "Recon Base's Bliss of Finality upgrade" };

export const DIFFICULTIES = {
  easy: { name: 'Easy', icon: '🟢', color: '#43a047', boss: 'kingSlime', desc: '25 waves. Beat the King Slime to unlock Slime King Patrol.', unlock: 'patrolSlime', waves: EASY_WAVES,
    cash: 1, dmgCash: 1, credits: 1, shards: 1,
    hpCurve: [[1, 1.6], [12, 1.6], [18, 1.2], [21, 1]], bossHp: 0.6 },
  // cash: multiplies the end-of-wave bonus. dmgCash: cash for each point of damage (GAME.dmgCash);
  // the tougher the mode's zombies, the lower its rate, so it's never more than you need.
  // baseHp / startCash: this mode's base health and starting cash (instead of GAME's). groupBonus:
  // extra starting cash for each player in a group (2+ players). flatHp: enemy health never grows
  // per wave (still more in multiplayer). firstIntermission: seconds before wave 1. timers[i]: once
  // wave i+1 has run that many seconds (and finished spawning), the next wave starts anyway, as if
  // skipped (null: wait until it's cleared).
  medium: { name: 'Medium', icon: '🟠', color: '#fb8c00', boss: 'mEradicator', desc: '32 waves. Beat the Eradicator to unlock John. 2x credits.',
    unlock: 'john', waves: MEDIUM_WAVES, cash: 1.3, dmgCash: 0.6, credits: 2, shards: 2, baseHp: 300, startCash: 725, groupBonus: 125, flatHp: true, firstIntermission: 14,
    timers: [...Array(18).fill(59), ...Array(10).fill(null), 449, 59, 59, null],
    hpCurve: [[1, 0.7], [5, 0.7], [8, 1.1], [20, 1.1], [24, 0.75], [27, 0.6]], bossHp: 0.2 },
  // mpHp[n-1]: enemy health bonus with n extra players (instead of GAME.mpHpScale).
  hard: { name: 'Hard', icon: '🔴', color: '#e53935', boss: 'fKing', desc: '40 waves. Beat the Fallen King to unlock the laser Commando. 3x credits.',
    unlock: 'eventCommando', waves: HARD_WAVES, cash: 1.6, dmgCash: 0.4, credits: 3, shards: 3, baseHp: 200, startCash: 500, groupBonus: 100, flatHp: true, mpHp: [0.15, 0.25, 0.4],
    hpCurve: [[1, 1.4], [6, 1.4], [10, 1], [12, 0.5], [20, 0.55], [28, 0.5]], bossHp: 0.25 },
  // mpPerEnemy: each enemy's own mpTop / mpPow sets its multiplayer health (none: no bonus).
  expert: { name: 'Expert', icon: '💎', color: '#00acc1', boss: 'xBeholder', desc: '30 waves. Beat the Beholder to unlock the Planeswalker. 4x credits.',
    unlock: 'planeswalker', waves: EXPERT_WAVES, cash: 1.9, dmgCash: 0.6, credits: 4, shards: 4, baseHp: 200, startCash: 600, groupBonus: 100, flatHp: true, mpPerEnemy: true,
    hpCurve: [[1, 1.2], [5, 1], [8, 0.7], [16, 0.6], [24, 0.5]], bossHp: 0.2 },
  insane: { name: 'Insane', icon: '⏳', color: '#ec407a', boss: 'iOverlord', desc: '50 waves. Beat the Overlord to unlock Bliss of Finality. 5x credits.',
    perk: 'bliss', waves: INSANE_WAVES, cash: 2.2, dmgCash: 0.25, credits: 5, shards: 5, baseHp: 200, startCash: 600, groupBonus: 100, flatHp: true, mpHp: [0.4, 0.8, 1.2],
    hpCurve: [[1, 1.5], [5, 2.6], [30, 2.6], [34, 1.1], [38, 0.6], [46, 0.5], [49, 0.35]], bossHp: 0.22 },
  // voidArmor: the Void mutation (see Sim.armorUp). shield: extra shield = that share of max health;
  // armor: extra armor while it's up; slow: walks that much slower; tendril: { range, every, n, mult,
  // min, max } lashes up to n towers in range for mult x sqrt(max health) (kept between min and max).
  void: { name: 'Void', icon: '🟣', color: '#7e57c2', boss: 'vVoid', desc: '50 waves. Beat VOID to unlock the Void Traitor. 6x credits.',
    waves: VOID_WAVES, cash: 2.5, dmgCash: 0.4, credits: 6, shards: 6, unlock: 'traitor', baseHp: 200, startCash: 650, flatHp: true, mpHp: [0.4, 0.8, 1.2],
    hpCurve: [[1, 1.5], [5, 2.6], [28, 2.6], [33, 1.1], [36, 0.75], [50, 0.65]], bossHp: 0.35,
    voidArmor: { shield: 0.5, armor: 0.3, slow: 0.25, tendril: { range: 9, every: 2.5, n: 2, mult: 0.6, min: 4, max: 200 } } },
  // Hardcore (2026-11-09 spec, see hardcore.js): locked until every mode in `needs` is beaten. Pays
  // Gems (GAME.gems) on top of credits. maxPlayers: co-op rooms hold up to this many. mpHp has an
  // entry for each extra player (up to 5); enemies with their own mpTop / mpPow use those instead.
  // mimic: each wave from `from` on has a `chance` of a rare golden `type` (Wicky).
  hardcore: { name: 'Hardcore', icon: '💀', color: '#37474f', boss: 'txEmperor', desc: '50 brutal waves from seven games, ending with all six final bosses. Pays Gems. Up to 6 players. 7x credits.',
    waves: HARDCORE_WAVES, cash: 3.5, dmgCash: 0.2, credits: 7, shards: 7, gems: true, needs: HARDCORE_NEEDS, maxPlayers: 6,
    baseHp: 600, startCash: 700, groupBonus: 100, flatHp: true, mpPerEnemy: true, mpHp: [0.15, 0.25, 0.4, 0.55, 0.7],
    hpCurve: [[1, 0.4], [10, 0.45], [25, 0.5]], bossHp: 0.3,
    mimic: { type: 'thWicky', chance: 1 / 1700, from: 10 } },
  // Halloween Event (2026-11-10 spec, see halloween.js). `event`: not one of the mode cards, it has
  // its own button in the top right of the menus. `maps`: the event's own maps (the player picks one
  // on the event banner; `map` is the one picked first). No other mode can play them (the maps say
  // so too: MAPS[map].event).
  // Open to everyone. Each wave pays its own `bonus` (instead of GAME.waveBonus). mpHp all 0: enemy
  // health doesn't grow with more players (the spec's numbers are for a full server). pot: so the
  // cash is a full server's too, shared between whoever plays: startCash and each wave's bonus are
  // what one of `pot` players gets (solo: 4x, two players: 2x each), and damage cash is split.
  halloween: { name: 'Halloween Event', icon: '🎃', color: '#ef6c00', boss: 'hwJack', desc: '10 spooky waves on Lantern Hill Cemetery against JACK, the Pumpkin King, or 25 waves of Halloween Night 2 at the carnival against the RINGMASTER and JACK O\' BOT. Or 35 waves of Halloween Night 3 in the crater against the PRIMORDIAL DRAKOBLOXXER. A full server\'s cash is shared between the players: $22,000 to start solo, $5,500 each with four. 100 base health. 3x credits.',
    waves: HALLOWEEN_WAVES, event: true, map: 'cemetery', maps: ['cemetery', 'carnival', 'nightmare'], cash: 1, dmgCash: 1.5, pot: 4, credits: 3, shards: 3, baseHp: 100, startCash: 5500, groupBonus: 0, flatHp: true,
    mpHp: [0, 0, 0, 0, 0], timers: HALLOWEEN_TIMERS,
    hpCurve: [[1, 1.3], [4, 1.3], [6, 0.9]], bossHp: 0.5,
    // mapModes: a map of the event that plays its own waves. These fields replace the mode's own
    // there (modeFor). Halloween Night 2 (see halloween2.js).
    mapModes: { carnival: { waves: HALLOWEEN2_WAVES, timers: HALLOWEEN2_TIMERS, boss: 'h2Ringmaster', hpCurve: [[1, 1], [6, 1], [8, 0.7], [14, 0.7], [18, 0.4]], bossHp: 0.6 },
      // Halloween Night 3 (see halloween3.js).
      nightmare: { waves: HALLOWEEN3_WAVES, timers: HALLOWEEN3_TIMERS, boss: 'n3Drako', hpCurve: [[1, 1], [5, 0.9], [8, 0.7], [14, 0.55], [20, 0.45], [28, 0.4]], bossHp: 0.7 } } },
  // Liminal contract (2026-11-11 spec, see lastlaugh.js): the endless mode in the Backrooms. Not on
  // the mode cards or an event button (`hidden`): you get here by walking into Sunken Canyon's
  // glitchy pit. `endless`: its waves are made up as you go (sim/parts/liminal.js), so `waves` is
  // empty. Every number here is a guess.
  liminal: { name: 'Liminal', icon: '🟨', color: '#c9b046', desc: 'Endless waves of random enemies in the Backrooms. Survive 30 waves to finish the contract.',
    waves: [], endless: true, hidden: true, map: 'backrooms', maps: ['backrooms'], cash: 2.5, dmgCash: 1, credits: 3, shards: 3, baseHp: 200, startCash: 900, groupBonus: 100, flatHp: true }, // (2026-11-11: cash 1.6, dmgCash 0.4, start 600 was too hard)
  // Halloween Remix (the Battle Pass's last reward, see halloweenremix.js): 50 waves mixing the three
  // nights, on one of their maps picked at random. Hidden like Liminal: its Play button is on the
  // pass. The rest is the Halloween Event's. waves: filled in below, once modeFor works.
  remix: { name: 'Halloween Remix', icon: '🎃', color: '#ef6c00', boss: 'n3Drako', desc: '50 waves with every Halloween enemy. JACK on wave 30, the RINGMASTER on 40, the DRAKOBLOXXER on 50.',
    waves: [], hidden: true, map: 'cemetery', maps: ['cemetery', 'carnival', 'nightmare'], cash: 1, dmgCash: 1.5, pot: 4, credits: 3, shards: 3, baseHp: 100, startCash: 5500, groupBonus: 0, flatHp: true,
    mpHp: [0, 0, 0, 0, 0] },
};
export const DEFAULT_DIFFICULTY = 'easy';
/** The modes on the mode cards, and the special events (each has its own button and its own map). */
export const MODE_KEYS = Object.keys(DIFFICULTIES).filter((k) => !DIFFICULTIES[k].event && !DIFFICULTIES[k].hidden);
export const EVENT_KEYS = Object.keys(DIFFICULTIES).filter((k) => DIFFICULTIES[k].event && !DIFFICULTIES[k].hidden);
/** The map mode `key` plays when `map` is picked: an event plays one of its own maps (its first when `map` isn't one), other modes get null (they play the picked map). */
export function eventMap(key, map) {
  const d = DIFFICULTIES[key];
  if (!d?.map) return null;
  const base = typeof map === 'string' ? map.split(':')[0] : map;
  return (d.maps ?? [d.map]).includes(base) ? base : d.map;
}
export const difficulty = (key) => DIFFICULTIES[key] ?? DIFFICULTIES[DEFAULT_DIFFICULTY];
/** Mode `key` as it plays on `map`: an event map with its own waves (`mapModes`) swaps them in. */
export function modeFor(key, map) {
  const d = difficulty(key);
  const m = d.mapModes?.[eventMap(key, map)];
  return m ? { ...d, ...m } : d;
}
/**
 * The balance curve: how much a mode's enemy health is multiplied by on wave `index` (0 = wave 1).
 * `hpCurve` is a list of [wave, multiplier] points; between two points it slides evenly, before
 * the first and after the last it stays flat. No curve: x1. It makes easy stretches tougher and
 * walls softer without rewriting the waves. `bossHp` multiplies bosses' health on top (`boss`:
 * the enemy is one).
 */
export function hpCurve(dm, index, boss = false) {
  const b = boss ? dm?.bossHp ?? 1 : 1;
  const c = dm?.hpCurve;
  if (!c?.length) return b;
  const w = index + 1;
  if (w <= c[0][0]) return c[0][1] * b;
  for (let i = 1; i < c.length; i++) {
    const [w1, m1] = c[i];
    if (w <= w1) {
      const [w0, m0] = c[i - 1];
      return (m0 + ((m1 - m0) * (w - w0)) / (w1 - w0)) * b;
    }
  }
  return c[c.length - 1][1] * b;
}
// Halloween Remix's waves (see DIFFICULTIES.remix), made from the three Halloween nights.
DIFFICULTIES.remix.waves = buildRemix(['cemetery', 'carnival', 'nightmare'].map((m) => modeFor('halloween', m)), hpCurve);

/**
 * Spawn groups for wave `index` (0-based) of `waves`. Past the scripted waves (Versus is endless) it
 * cycles through the last few waves with more and more zombies; enemy HP keeps growing too.
 */
export function waveGroups(index, waves = WAVES) {
  if (index < waves.length) return waves[index].groups;
  const k = index - waves.length;
  const base = waves[waves.length - 4 + (k % 4)].groups;
  const more = 1 + 0.25 * (Math.floor(k / 4) + 1);
  const groups = base.map(([type, count, gap, delay]) => [type, Math.ceil(count * more), gap / Math.min(2, more), delay]);
  if (k % 2 === 1) groups.push(['boss', 1 + Math.floor(k / 6), 5, 6]);
  return groups;
}

/** A tower's max health at level `level` (see GAME.towerHp): more for higher levels and close range. */
export function towerMaxHp(type, level) {
  const s = TOWERS[type].levels[level];
  const base = s.hp ?? GAME.towerHp + GAME.towerHpPerLevel * level;
  const [near, far] = GAME.towerHpShortRange;
  // Judged on the tower's starting range, so upgrades that add range never cost health.
  const r = TOWERS[type].levels[0].range;
  const short = r ? Math.min(1, Math.max(0, (far - r) / (far - near))) : 0;
  return Math.round(base * (1 + GAME.towerHpShort * short));
}

/**
 * Towers where the player picks one option per slot in the tower panel (tower field `choice`):
 * Jester bombs, Biologist plant queues and the Elementalist element. Returns { title, slots,
 * options: [{ key, name }], free } or null. `free`: picking is free and instant (the Elementalist
 * switches with its ability instead, so its panel only shows the element).
 */
const BOMB_NAMES = { fire: 'Fire', ice: 'Ice', poison: 'Poison', confuse: 'Confusion' };
const PLANT_NAMES = { sun: 'Sunflower', ivy: 'Ivy', night: 'Nightshade' };
export function choiceOptions(def, s) {
  if (s.bombs) return { title: 'Bombs', slot: 'Slot', slots: s.slots || 1, options: Object.keys(s.bombs).map((k) => ({ key: k, name: BOMB_NAMES[k] ?? k })), free: true, distinct: true };
  if (s.plants) return { title: 'Plants', slot: 'Queue', slots: s.queues || 1, options: s.plants.map((p) => ({ key: p.key, name: PLANT_NAMES[p.key] ?? p.unit.name })), free: true };
  if (def.choices) return { title: 'Element', slot: '', slots: 1, options: Object.entries(def.choices).map(([key, name]) => ({ key, name })), free: false };
  return null;
}

/** Tower `t`'s pick for every slot (filling empty or no-longer-valid slots with sensible defaults). */
export function choicesOf(def, s, choice) {
  const c = choiceOptions(def, s);
  if (!c) return [];
  const keys = c.options.map((o) => o.key);
  const out = [];
  for (let i = 0; i < c.slots; i++) {
    let k = choice?.[i];
    if (!keys.includes(k) || (c.distinct && out.includes(k))) k = keys.find((x) => !(c.distinct && out.includes(x))) ?? keys[0];
    out.push(k);
  }
  return out;
}

const PICK_TRAP_NAMES = { spike: 'Spikes', mine: 'Landmines', bear: 'Bear Traps' };
/**
 * Towers with several things to choose between: Trapper traps and Mercenary Base units.
 * Each can be switched on or off in the tower panel (`t.off` holds the keys switched off).
 * Returns [{ key, name }], or null when the tower (at this level) has nothing to pick.
 */
export function pickOptions(s) {
  if (s.roster?.length > 1) return s.roster.map((r, i) => ({ key: String(i), name: r.unit.name }));
  const kinds = s.order ? [...new Set(s.order)] : [];
  if (kinds.length > 1) return kinds.map((k) => ({ key: k, name: PICK_TRAP_NAMES[k] ?? k }));
  return null;
}
