// Liminal contract (see lastlaugh.js): the endless mode in the Backrooms. Waves made up as you go
// from random enemies of every mode, mutated enemies, the rooms shifting every 25 waves, and the
// towers picked every 10 waves with their blessings and curses.
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { DIFFICULTIES, ENEMIES, TOWERS } from '../../config.js';
import { CONTRACTS } from '../../lastlaugh.js';
import { canPlace, mapKey, setMap } from '../map.js';
import { path } from '../path.js';

const LM = CONTRACTS.liminal;
const STATS = ['dmg', 'rate', 'range', 'cost'];

// Every enemy that walks in some mode's waves (not bosses), from weakest to toughest.
let POOL = null;
function pool() {
  if (POOL) return POOL;
  const all = new Set();
  for (const d of Object.values(DIFFICULTIES)) {
    for (const ws of [d.waves, ...Object.values(d.mapModes ?? {}).map((m) => m.waves)]) {
      for (const w of ws ?? []) for (const [t, , , , x] of w.groups) if (!(x && typeof x === 'object' && x.boss)) all.add(t);
    }
  }
  POOL = [...all].filter((t) => {
    const d = ENEMIES[t];
    return d && !d.boss && d.hp > 0 && !d.remains && !d.pod && !d.beeline;
  }).sort((a, b) => ENEMIES[a].hp - ENEMIES[b].hp);
  return POOL;
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export class SimLiminal {

  /** Sets up the endless waves (called by the constructor when the mode is `endless`). */
  initLiminal() {
    this.waves = []; // made up as the game goes (lmFill)
    this.lm = { done: false };
    this.lmFill(6);
    this.wave.total = 0; // endless
  }

  /** Makes up waves until there are `n`. */
  lmFill(n) {
    while (this.waves.length < n) this.waves.push({ groups: this.lmWave(this.waves.length) });
  }

  /** Wave `i`'s groups: 1-3 random kinds whose health fits the wave, sharing its health budget. */
  lmWave(i) {
    const w = i + 1;
    const B = LM.budget;
    const budget = B.base * B.grow ** Math.min(w, B.lateFrom) * B.late ** Math.max(0, w - B.lateFrom);
    const target = budget / LM.perEnemy;
    const all = pool();
    let fit = all.filter((t) => ENEMIES[t].hp >= target / 4 && ENEMIES[t].hp <= target * 2);
    if (fit.length < 3) fit = [...all].sort((a, b) => Math.abs(Math.log(ENEMIES[a].hp / target)) - Math.abs(Math.log(ENEMIES[b].hp / target))).slice(0, 6);
    const n = LM.groups[0] + Math.floor(Math.random() * (LM.groups[1] - LM.groups[0] + 1));
    const share = budget / n;
    const groups = [];
    for (let k = 0; k < n; k++) {
      const type = pick(fit);
      const hp0 = ENEMIES[type].hp;
      const count = Math.max(1, Math.min(LM.maxCount, Math.round(share / hp0)));
      const hp = Math.max(hp0, Math.round(share / count));
      groups.push([type, count, Math.max(0.35, Math.min(1.5, 14 / count)), k * 5, hp]);
    }
    return groups;
  }

  /** Before wave `index` starts: more waves made up, and every 25 waves the rooms shift. */
  lmBeforeWave(index) {
    this.lmFill(index + 6);
    if (index > 0 && index % LM.shiftEvery === 0 && index !== this.lm.shifted) {
      this.lm.shifted = index;
      this.lmShift();
    }
  }

  /** The rooms shift: a new layout. Enemies keep how far along they are; towers in the way are refunded. */
  lmShift() {
    const oldLen = path.length;
    const along = [...this.enemies.values(), ...this.units.values()].filter((o) => o.dist != null).map((o) => [o, o.dist / oldLen]);
    setMap(`backrooms:${1 + Math.floor(Math.random() * 2147483646)}`);
    this.map = mapKey;
    for (const [o, f] of along) {
      o.dist = Math.max(0, Math.min(path.length, f * path.length));
      path.at(o.dist, o, o.route || 0);
    }
    this.traps.clear(); // traps lay on the old path
    let refunds = 0;
    for (const t of [...this.towers.values()]) {
      const others = [...this.towers.values()].filter((o) => o !== t);
      if (canPlace(t.x, t.z, others, TOWERS[t.type].placement)) continue;
      const p = this.players.get(t.owner);
      if (p) p.cash += t.spent;
      refunds += t.spent;
      this.removeTower(t, 'sell', { value: t.spent });
    }
    this.events.push({ k: 'lmShift', mk: mapKey, refunds });
  }

  /** A wave was cleared or skipped: maybe a tower pick, maybe the contract is done. */
  lmWaveDone(index) {
    const w = index + 1;
    if (w % LM.pickEvery === 0) {
      for (const p of this.players.values()) p.lmPicks = (p.lmPicks ?? 0) + 1;
      this.events.push({ k: 'lmOffer', n: w / LM.pickEvery, wave: w });
    }
    if (w >= LM.goal && !this.lm.done) {
      this.lm.done = true;
      this.events.push({ k: 'contractDone', key: 'liminal', endless: 1 });
    }
  }

  /** How likely a wave enemy is to come mutated on the current wave. */
  get lmMutChance() {
    const m = LM.mutant;
    return Math.min(m.max, m.chance + m.grow * this.wave.index);
  }

  /** A mutated enemy: twisted shape (views.js) and more health. Works on any enemy. */
  mutate(e) {
    e.mut = true;
    e.maxHp = Math.round(e.maxHp * LM.mutant.hp);
    e.hp = Math.round(e.hp * LM.mutant.hp);
  }

  /**
   * A player picks a tower (or nothing: type null) from their offer. `bless` and `curse` are
   * [stat, amount]; the amounts are kept inside the contract's ranges. Returns an error, or null.
   */
  lmPick(p, m) {
    if (!this.lm) return 'Not in the Backrooms';
    if (!(p.lmPicks > 0)) return 'No tower to pick right now';
    p.lmPicks--;
    if (m.type == null) return null;
    if (!TOWERS[m.type]) return 'Unknown tower';
    const mods = { dmg: 1, rate: 1, range: 1, cost: 1 };
    const one = (pair, table, good) => {
      if (!Array.isArray(pair) || !STATS.includes(pair[0])) return;
      const [lo, hi] = table[pair[0]];
      const a = Math.max(lo, Math.min(hi, Number(pair[1]) || lo));
      // A blessing makes damage, speed and range bigger and the price smaller; a curse the other way.
      mods[pair[0]] *= pair[0] === 'cost' ? (good ? 1 - a : 1 + a) : good ? 1 + a : 1 - a;
    };
    one(m.bless, LM.bless, true);
    one(m.curse, LM.curse, false);
    (p.lmMods ??= {})[m.type] = mods;
    this.events.push({ k: 'lmPicked', by: p.id, type: m.type });
    return null;
  }
}
