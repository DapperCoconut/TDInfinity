// How a bot judges towers and zombies: rough damage per second of a tower level, what the next
// waves bring, and how much of that a tower can hit. Plain math, no three.js, no DOM.
import { ENEMIES, GAME, TOWERS, canHit, detection, hpCurve, waveGroups } from '../config.js';
import { dpsValue, spawnerUnits, unitDps } from '../stats.js';

const num = (v) => (Number.isFinite(v) && v > 0 ? v : 0);

/** Rough damage per second of level `l` of tower `def` (0 for farms and support towers). */
export function levelPower(def, l) {
  const kind = def.kind ?? 'attack';
  if (kind === 'income' || kind === 'support') return 0;
  try {
    if (kind === 'spawner') {
      if (l.roster) return l.roster.reduce((s, r) => s + num(unitDps(r.unit, r.every ?? l.spawnEvery ?? def.spawnEvery ?? 20)), 0);
      return spawnerUnits(l, def).reduce((s, { unit, every }) => s + num(unitDps(unit, every || def.spawnEvery || 20)), 0);
    }
    let dps = num(dpsValue(l));
    if (!dps && l.sentry) dps = num(l.sentries * (l.sentry.gun.damage / l.sentry.gun.cooldown));
    if (l.splash || l.radius) dps *= 1.6; // hits a crowd
    if (l.pierce || l.pass) dps *= 1.3;
    return dps;
  } catch {
    return 0;
  }
}

/** The total cost of tower `type` up to and including level `level`. */
export function costUpTo(type, level) {
  const d = TOWERS[type];
  let c = d.survivalCost ?? d.cost;
  for (let i = 1; i <= level && i < d.levels.length; i++) c += d.levels[i].cost || 0;
  return c;
}

/**
 * What the waves `from`..`from + n - 1` of `sim` send, as shares of their total health:
 * [{ type, w (share), hidden, flying, lead, boss, defense }]. `hp` is the wave's total health.
 */
export function threats(sim, from, n = 3) {
  const out = [];
  let total = 0;
  const last = Math.min(sim.waves.length + 40, from + n); // Versus is endless
  for (let i = from; i < last; i++) {
    for (const [type, count, , , x] of waveGroups(i, sim.waves)) {
      const def = ENEMIES[type];
      if (!def) continue;
      const hp = (typeof x === 'number' ? x : x?.hp ?? def.hp) * count * (i === from ? 1 : 0.5);
      total += hp;
      out.push({ type, w: hp, hidden: !!(def.hidden || x?.hidden), flying: !!def.flying, lead: !!def.lead, boss: !!def.boss, defense: def.defense || 0 });
    }
  }
  for (const o of out) o.w /= total || 1;
  return out;
}

/** Health one wave sends, counting the per-wave and multiplayer health scaling the sim applies. */
export function waveLoad(sim, index) {
  let hp = 0;
  for (const [type, count, , , x] of waveGroups(index, sim.waves)) {
    const def = ENEMIES[type];
    if (def) hp += (typeof x === 'number' ? x : x?.hp ?? def.hp) * count * hpCurve(sim.dm, index, def.boss || x?.boss);
  }
  const players = Math.max(1, sim.players.size);
  const mp = sim.mpHp ? 1 + (sim.mpHp[players - 2] ?? sim.mpHp[sim.mpHp.length - 1] ?? 0) : 1 + GAME.mpHpScale * (players - 1);
  return hp * (sim.flatHp ? 1 : 1 + index * GAME.hpScalePerWave) * (players > 1 ? mp : 1);
}

/** Seconds a wave takes to spawn, plus how long its slowest zombie walks the path. */
export function waveTime(sim, index, pathLength) {
  let last = 0;
  let slow = 6;
  for (const [type, count, gap, delay] of waveGroups(index, sim.waves)) {
    last = Math.max(last, (delay || 0) + Math.max(0, count - 1) * (gap || 0));
    const sp = ENEMIES[type]?.speed;
    if (sp > 0) slow = Math.min(slow, sp);
  }
  return last + pathLength / slow;
}

/** The share of the threats' health that level `level` of `def` can hit at all (hidden / flying / lead, and Insane's defense). */
export function hitShare(def, level, th) {
  const d = detection(def, level);
  const l = def.levels[level];
  let share = 0;
  for (const o of th) {
    if (!canHit(d, o)) continue;
    let f = 1;
    if (o.defense && !l.defPierce && l.damage) f = Math.max(0.15, 1 - o.defense / l.damage);
    share += o.w * f;
  }
  return share;
}
