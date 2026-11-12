// What Halloween Night 3's enemies do (src/halloween3.js): the Curse Vine's wrap, Blight Walker
// puddles, Corrupted Titus's fatigue, the Harvest Witch's Blood Ritual, the Conserver's skulls,
// the Unknowns' fatigue when they die, and the Primordial Drakobloxxer's whole fight.
// "Fatigue" here is the game's tower slow: towers fire slower for a while (slowTowers).
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { ENEMIES } from '../../config.js';
import { BEELINE, path } from '../path.js';
import { r2 } from './shared.js';

/** Enemies that use nightmareMoves (sim.js checks this set every tick). */
export const N3_FX = new Set(Object.keys(ENEMIES).filter((k) => {
  const d = ENEMIES[k];
  return d.wrap || d.puddle || d.fatigue || d.ritual || d.skulls || d.drako;
}));

/** Squared distance from (x, z) to the line through (ax, az) going along the unit (dx, dz). */
const lineD2 = (x, z, ax, az, dx, dz) => {
  const t = (x - ax) * dx + (z - az) * dz;
  return (x - ax - dx * t) ** 2 + (z - az - dz * t) ** 2;
};

export class SimNightmare {

  /** One enemy's Night 3 moves for this tick (before it walks). */
  nightmareMoves(e, def, dt) {
    const T = (e.n3T ??= {});
    if (def.drako) this.drakoFight(e, def, def.drako, T, dt);
    if (e.stop) return; // stunned or frozen: no attacks
    // Curse Vine Wrap: the tower nearest to it is stunned.
    const w = def.wrap;
    if (w && ((T.wrap ??= w.every * 0.5), (T.wrap -= dt) <= 0)) {
      let best = null;
      let bd = w.range * w.range;
      for (const t of this.towers.values()) {
        const d = (t.x - e.x) ** 2 + (t.z - e.z) ** 2;
        if (d <= bd && !this.stealthy(t)) {
          bd = d;
          best = t;
        }
      }
      if (!best) T.wrap = 0.5;
      else {
        T.wrap = w.every;
        this.hexTowers(best.x, best.z, 0.5, 'stun', w.stun, true, (o) => o === best);
        this.events.push({ k: 'eShot', e: e.id, kind: 'laser', fx: r2(e.x), fz: r2(e.z), x: r2(best.x), z: r2(best.z), d: 0, c: 0x43a047 });
        this.events.push({ k: 'chaos', x: r2(best.x), z: r2(best.z), text: '🌿 Wrapped!', color: '#76ff03' });
      }
    }
    // Blight Walker: a healing puddle on the path.
    const pd = def.puddle;
    if (pd && ((T.puddle ??= pd.every * 0.5), (T.puddle -= dt) <= 0)) {
      T.puddle = pd.every;
      this.goos.push({ x: e.x, z: e.z, r: pd.radius, left: pd.life, heal: 0, pct: pd.heal, every: 1, t: 1 });
      this.events.push({ k: 'goo', x: r2(e.x), z: r2(e.z), r: pd.radius, life: pd.life });
    }
    // Corrupted Titus: towers around him fire slower.
    const fa = def.fatigue;
    if (fa && ((T.fatigue ??= fa.every * 0.5), (T.fatigue -= dt) <= 0)) {
      T.fatigue = fa.every;
      const n = this.slowTowers(e.x, e.z, fa.radius, fa.amt, fa.time, true);
      this.events.push({ k: 'eBlast', x: r2(e.x), z: r2(e.z), r: fa.radius, c: 0x7c4dff });
      if (n) this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: `😩 Fatigue! ${n} towers slowed`, color: '#b388ff' });
    }
    // Harvest Witch Blood Ritual: every enemy gets a shield and a burst of speed.
    const ri = def.ritual;
    if (ri && ((T.ritual ??= ri.every * 0.5), (T.ritual -= dt) <= 0)) {
      T.ritual = ri.every;
      for (const o of this.enemies.values()) {
        if (o.remains) continue;
        const amt = Math.round(o.maxHp * ri.shield);
        o.osh = Math.max(o.osh || 0, amt);
        o.oshMax = Math.max(o.oshMax || 0, o.osh);
        o.empT = Math.max(o.empT || 0, ri.time);
        o.empHaste = Math.max(o.empHaste || 0, ri.speed);
      }
      this.events.push({ k: 'eBlast', x: r2(e.x), z: r2(e.z), r: 30, c: 0xd50000 });
      this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: '🩸 BLOOD RITUAL! Every enemy is shielded and faster', color: '#ff1744' });
    }
    // Conserver skulls: a few towers in range are stunned.
    const sk = def.skulls;
    if (sk && ((T.skulls ??= sk.every * 0.5), (T.skulls -= dt) <= 0)) {
      const list = [...this.towers.values()].filter((t) => !this.stealthy(t) && (t.x - e.x) ** 2 + (t.z - e.z) ** 2 <= sk.range * sk.range);
      if (!list.length) T.skulls = 1;
      else {
        T.skulls = sk.every;
        for (let i = 0; i < sk.n && list.length; i++) {
          const t = list.splice(Math.floor(Math.random() * list.length), 1)[0];
          this.hexTowers(t.x, t.z, 0.5, 'stun', sk.stun, true, (o) => o === t);
          this.events.push({ k: 'eShot', e: e.id, kind: 'laser', fx: r2(e.x), fz: r2(e.z), x: r2(t.x), z: r2(t.z), d: 0, c: 0x76ff03 });
        }
        this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: '💀 Skulls!', color: '#76ff03' });
      }
    }
  }

  /** Unknowns: when one dies, the towers nearby fire slower (and units get hurt). */
  nightmareDeath(e, df) {
    this.slowTowers(e.x, e.z, df.radius, df.amt, df.time, true);
    if (df.units) this.hurtUnitsNear(e.x, e.z, df.radius, df.units);
    this.events.push({ k: 'eBlast', x: r2(e.x), z: r2(e.z), r: df.radius, c: 0x4a148c });
  }

  /** Puts `n` enemies of `type` on the path next to the Drakobloxxer (it walks off the path itself). */
  drakoSummon(e, type, n, mods = null) {
    const dist = path.project(e.x, e.z);
    const route = path.lastRoute;
    for (let i = 0; i < n; i++) this.reborn.push({ route, type, dist: Math.max(0, dist - i * 1.5), lateral: (i % 3 - 1) * 2, hpScale: 1, owner: e.id, noCash: true, ...(mods ? { mods } : {}) });
    this.events.push({ k: 'summon', e: e.id, type });
  }

  /**
   * Primordial Drakobloxxer. Phase 1: Nightmare Blast (a death beam across the middle of the map),
   * Enemy Summon, Nightmare Storm (fatigue around it). At half health The Metamorphosis: faster,
   * and phase 2 adds the Super Dupa Laser and the Nightmare Tear. (Enforced Departure is left out:
   * the map has no laser orbs.) Stuns and summons can't stop it (stun immune).
   */
  drakoFight(e, def, k, T, dt) {
    if (e.route !== BEELINE) e.route = BEELINE;
    T.blast ??= k.blast.every * 0.5;
    T.summon ??= k.summon.every * 0.5;
    T.storm ??= k.storm.every * 0.75;
    if (!T.morphed && e.hp <= e.maxHp * k.morph.at) {
      T.morphed = true;
      e.baseSpeed = k.morph.speed;
      T.laser = k.laser.every * 0.3;
      T.tear = k.tear.every * 0.6;
      this.events.push({ k: 'enrage', e: e.id });
      this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: '🐉 THE METAMORPHOSIS! Phase 2', color: '#e040fb' });
    }
    // Nightmare Blast: a beam through the middle of the map, aimed from the boss.
    if ((T.blast -= dt) <= 0) {
      T.blast = k.blast.every;
      this.drakoBeam(e, 0, 0, k.blast, '☄️ NIGHTMARE BLAST!');
    }
    if ((T.summon -= dt) <= 0) {
      T.summon = k.summon.every;
      this.drakoSummon(e, 'n3UnknownBoss', k.summon.boss);
      this.drakoSummon(e, 'n3PumpkinSpider', k.summon.spiders);
    }
    if ((T.storm -= dt) <= 0) {
      T.storm = k.storm.every;
      const n = this.slowTowers(e.x, e.z, k.storm.radius, k.storm.amt, k.storm.time, true);
      this.events.push({ k: 'eBlast', x: r2(e.x), z: r2(e.z), r: k.storm.radius, c: 0x6a1b9a });
      this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: `🌪️ Nightmare Storm! ${n} towers fatigued`, color: '#ce93d8' });
    }
    if (!T.morphed) return;
    // Super Dupa Laser: a beam at the most expensive tower.
    if ((T.laser -= dt) <= 0) {
      let best = null;
      for (const t of this.towers.values()) if (!this.stealthy(t) && (!best || (t.spent ?? 0) > (best.spent ?? 0))) best = t;
      if (!best) T.laser = 1;
      else {
        T.laser = k.laser.every;
        this.drakoBeam(e, best.x, best.z, k.laser, '⚡ SUPER DUPA LASER!');
      }
    }
    if ((T.tear -= dt) <= 0) {
      T.tear = k.tear.every;
      this.drakoSummon(e, 'n3UnknownSmall', k.tear.n);
      this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: '🌀 Nightmare Tear!', color: '#b388ff' });
    }
  }

  /** A beam from the boss through (x, z) and on across the map: towers in it are stunned, units in it hurt. */
  drakoBeam(e, x, z, b, text) {
    let dx = x - e.x;
    let dz = z - e.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const w2 = (b.width / 2) ** 2;
    const inBeam = (o) => (o.x - e.x) * dx + (o.z - e.z) * dz > 0 && lineD2(o.x, o.z, e.x, e.z, dx, dz) <= w2;
    const n = this.hexTowers(e.x, e.z, Infinity, 'stun', b.stun, true, inBeam);
    this.hurtUnitsNear(e.x, e.z, 1e4, b.units, inBeam);
    const far = 400;
    this.events.push({ k: 'eShot', e: e.id, kind: 'laser', fx: r2(e.x), fz: r2(e.z), x: r2(e.x + dx * far), z: r2(e.z + dz * far), d: 0, c: 0xd500f9, w: b.width });
    this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: `${text} ${n} towers stunned`, color: '#ea80fc' });
  }
}
