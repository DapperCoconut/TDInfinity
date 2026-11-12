// What Christmas Night 3's enemies do (src/christmas3.js): robots and Officers shooting towers,
// Lifeworkers healing, Officers handing out shields, Medi and Kritz Bots, the Crusader Lord's
// shield, Portals, Star Seers, Ornate's downgrade and the Arbiter's fight. (Sword Slam is the plain
// `slam`, Sword Summon the Night 3 `skulls`, Mortar Strike `fatigue`, DJ Bots `bell` + `healPulse`.)
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { ENEMIES } from '../../config.js';
import { HERO_TOWERS } from '../../herotowers.js';
import { buffOf, r2 } from './shared.js';

/** Enemies that use spiresMoves (sim.js checks this set every tick). */
export const XS_FX = new Set(Object.keys(ENEMIES).filter((k) => {
  const d = ENEMIES[k];
  return d.zap || d.calmHeal || d.giveShield || d.medic || d.lord || d.portalLife || d.touch || d.downgrade || d.unitShot || d.arbiter
    || d.slip || d.rangeAura || d.dmgAura || d.thrusters || d.archangel;
}));
const isHero = (t) => !!HERO_TOWERS[t.type];
/** How much further an enemy reaches (Scout Bot aura) and how hard it hits (Commander, Kritz). */
const reach = (e) => (e.rangeUpT > 0 ? 1 + e.rangeUp : 1);
export const dmgMult = (e) => (e.dmgUpT > 0 ? 1 + e.dmgUp : 1);

export class SimSpires {

  /** The working tower nearest to (x, z) within `r` (or null). */
  nearestTower(x, z, r) {
    let best = null;
    let bd = r * r;
    for (const t of this.towers.values()) {
      const d = (t.x - x) ** 2 + (t.z - z) ** 2;
      if (d <= bd && t.hp > 0 && !this.stealthy(t)) {
        bd = d;
        best = t;
      }
    }
    return best;
  }

  /** One enemy's Night 3 moves for this tick (before it walks). Returns 'gone' if it left the game. */
  spiresMoves(e, def, dt) {
    const T = (e.xsT ??= {});
    const k = e.curve ?? 1; // heals and shields shrink with the mode's health curve
    // Portal: its shield fades, and after a while it closes.
    const pl = def.portalLife;
    if (pl) {
      if (e.osh > 0) e.osh = Math.max(0, e.osh - pl.fade * k * dt);
      if ((T.age = (T.age ?? 0) + dt) >= pl.life) {
        this.enemies.delete(e.id);
        this.events.push({ k: 'decay', e: e.id });
        return 'gone';
      }
    }
    // Lifeworker: heals itself when nothing has hit it for a moment.
    const ch = def.calmHeal;
    if (ch) {
      if (e.hp < (T.lastHp ?? e.hp)) T.calm = 0;
      T.calm = (T.calm ?? 0) + dt;
      if (T.calm >= ch.calm && e.hp < e.maxHp && ((T.heal = (T.heal ?? 0) - dt) <= 0)) {
        T.heal = ch.every;
        e.hp = Math.min(e.maxHp, e.hp + ch.hp * k);
      }
      T.lastHp = e.hp;
    }
    // Crusader Lord: once the shield is gone, less defense, faster, and he heals.
    const lo = def.lord;
    if (lo && e.osh <= 0) {
      if (!T.lord) {
        T.lord = true;
        e.defense = lo.defense;
        e.baseSpeed *= lo.speed / def.speed;
        this.events.push({ k: 'enrage', e: e.id });
        this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: '⚔️ The Crusader Lord rages and heals!', color: '#ffd54f' });
      }
      e.hp = Math.min(e.maxHp, e.hp + lo.heal * k * dt);
    }
    if (def.arbiter) this.arbiterFight(e, def.arbiter, T, dt);
    // Tanuki: now and then it slips past (can't be hit, runs faster). A stun resets the timer.
    const sl = def.slip;
    if (sl) {
      if (T.slipOn > 0) {
        T.slipOn -= dt;
        e.speed *= sl.speed;
        if (T.slipOn <= 0) e.noTarget = false;
      } else if (e.stop) T.slip = sl.every;
      else if ((T.slip = (T.slip ?? sl.every) - dt) <= 0) {
        T.slip = sl.every;
        T.slipOn = sl.time;
        e.noTarget = true;
        this.events.push({ k: 'dash', e: e.id });
        this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: '🦝 Slipped past!', color: '#bcaaa4' });
      }
    }
    // Councilman: Thruster Wings (speed bursts while his shield holds) and Archangel (shield back).
    const th = def.thrusters;
    if (th) {
      if (T.wingsOn > 0) {
        T.wingsOn -= dt;
        if (e.osh > 0 && !e.stop) e.speed *= th.speed;
      } else if ((T.wings = (T.wings ?? th.every) - dt) <= 0 && e.osh > 0 && !e.stop) {
        T.wings = th.every;
        T.wingsOn = th.time;
        this.events.push({ k: 'dash', e: e.id });
      }
    }
    const aa = def.archangel;
    if (aa && e.oshMax > 0 && ((T.angel = (T.angel ?? aa.every) - dt) <= 0)) {
      T.angel = aa.every;
      e.osh = Math.min(e.oshMax, (e.osh || 0) + e.oshMax * aa.pct);
      this.events.push({ k: 'eBlast', x: r2(e.x), z: r2(e.z), r: 4, c: 0xfff59d });
    }
    // Scout Bot and Commander Bot auras: longer reach / more damage for the enemies around it.
    for (const [au, key] of [[def.rangeAura, 'rangeUp'], [def.dmgAura, 'dmgUp']]) {
      if (!au) continue;
      for (const o of this.enemies.values()) {
        if (o === e || o.remains || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > au.radius * au.radius) continue;
        o[key] = Math.max(o[`${key}T`] > 0 ? o[key] : 0, au.amt);
        o[`${key}T`] = Math.max(o[`${key}T`] || 0, 0.5);
      }
    }
    if (e.stop) return; // stunned or frozen: no attacks
    // Shoots the nearest tower: damage, stun, slower firing or weaker damage.
    const z = def.zap;
    if (z && ((T.zap ??= z.every * 0.5), (T.zap -= dt) <= 0)) {
      const t = this.nearestTower(e.x, e.z, z.range * reach(e));
      if (!t) T.zap = 0.5;
      else {
        T.zap = z.every;
        const r = z.radius ?? 0.5;
        const only = z.radius ? null : (o) => o === t;
        if (z.dmg) {
          if (z.radius) this.hurtTowers(t.x, t.z, r, z.dmg * dmgMult(e), true);
          else this.hurtTower(t, z.dmg * dmgMult(e), true);
        }
        if (z.stun) this.hexTowers(t.x, t.z, r, 'stun', z.stun, true, only);
        if (z.slow) this.slowTowers(t.x, t.z, r, z.slow, z.time, true);
        if (z.weak) {
          for (const o of this.towers.values()) {
            if ((only && !only(o)) || (o.x - t.x) ** 2 + (o.z - t.z) ** 2 > r * r || this.stealthy(o)) continue;
            if (buffOf(this.buffs, o.id).invuln || o.invulnT > 0) continue;
            this.weakTower(o, z.weak, z.time);
          }
        }
        this.events.push({ k: 'eShot', e: e.id, kind: 'laser', fx: r2(e.x), fz: r2(e.z), x: r2(t.x), z: r2(t.z), d: 0, c: z.c });
        if (z.radius) this.events.push({ k: 'eBlast', x: r2(t.x), z: r2(t.z), r, c: z.c });
        if (z.text) this.events.push({ k: 'chaos', x: r2(t.x), z: r2(t.z), text: z.text, color: '#ffffff' });
      }
    }
    // Ranger Bot: shoots the units near it.
    const us = def.unitShot;
    if (us && ((T.unit ??= us.every), (T.unit -= dt) <= 0)) {
      T.unit = us.every;
      this.hurtUnitsNear(e.x, e.z, us.range * reach(e), us.dmg * dmgMult(e));
    }
    // Officer: puts a shield on the nearest ally that has none.
    const gs = def.giveShield;
    if (gs && ((T.give ??= gs.every * 0.5), (T.give -= dt) <= 0)) {
      let best = null;
      let bd = gs.radius * gs.radius;
      for (const o of this.enemies.values()) {
        if (o === e || o.remains || o.osh > 0) continue;
        const d = (o.x - e.x) ** 2 + (o.z - e.z) ** 2;
        if (d <= bd) {
          bd = d;
          best = o;
        }
      }
      T.give = best ? gs.every : 1;
      if (best) {
        best.osh = Math.round(gs.amt * k);
        best.oshMax = Math.max(best.oshMax || 0, best.osh);
        this.events.push({ k: 'eBlast', x: r2(best.x), z: r2(best.z), r: 2, c: 0x90caf9 });
      }
    }
    // Medi / Kritz Bot: heals the strongest enemy near it (Medi: Ubercharge now and then).
    const md = def.medic;
    if (md) {
      let best = null;
      for (const o of this.enemies.values()) {
        if (o === e || o.remains || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > md.range * md.range) continue;
        if (!best || o.maxHp > best.maxHp) best = o;
      }
      if (best) {
        best.hp = Math.min(best.maxHp, best.hp + md.heal * k * dt);
        if (md.uber && ((T.uber ??= md.uber.every * 0.5), (T.uber -= dt) <= 0)) {
          T.uber = md.uber.every;
          best.invulnT = Math.max(best.invulnT || 0, md.uber.time);
          this.events.push({ k: 'chaos', x: r2(best.x), z: r2(best.z), text: '⛑️ UBERCHARGE! Invulnerable', color: '#ff5252' });
        }
        // Kritz Bot: the strongest enemy does much more damage for a while.
        const kz = md.kritz;
        if (kz && ((T.kritz ??= kz.every * 0.5), (T.kritz -= dt) <= 0)) {
          T.kritz = kz.every;
          best.dmgUp = Math.max(best.dmgUpT > 0 ? best.dmgUp : 0, kz.amt);
          best.dmgUpT = Math.max(best.dmgUpT || 0, kz.time);
          this.events.push({ k: 'chaos', x: r2(best.x), z: r2(best.z), text: '💥 KRITZKRIEG! +200% damage', color: '#40c4ff' });
        }
      }
    }
    // Star Seer: stuns each hero tower it flies past (once).
    const to = def.touch;
    if (to) {
      T.hit ??= new Set();
      for (const t of this.towers.values()) {
        if (!isHero(t) || T.hit.has(t.id) || (t.x - e.x) ** 2 + (t.z - e.z) ** 2 > to.radius * to.radius || this.stealthy(t)) continue;
        T.hit.add(t.id);
        this.hexTowers(t.x, t.z, 0.5, 'stun', to.stun, true, (o) => o === t);
        this.events.push({ k: 'chaos', x: r2(t.x), z: r2(t.z), text: '⭐ Stunned!', color: '#fff176' });
      }
    }
    // Ornate, phase 2: hero towers around it drop a level.
    const dg = def.downgrade;
    if (dg && ((T.down ??= dg.every), (T.down -= dt) <= 0)) {
      T.down = dg.every;
      const n = this.downgradeTowers(e.x, e.z, dg.radius, isHero);
      this.events.push({ k: 'eBlast', x: r2(e.x), z: r2(e.z), r: dg.radius, c: 0xab47bc });
      if (n) this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: `👑 ${n} hero towers downgraded!`, color: '#ce93d8' });
    }
  }

  /**
   * The Arbiter. Speed of Light: stuns up to 4 towers and heals for each. Avarian Defense: once his
   * shield is gone, no hit does more than 400 and he walks slower. Divine Ascension: low on health
   * he flies (only air detection hits him) and loses any shield. Slam and swords are `slam`/`skulls`.
   */
  arbiterFight(e, a, T, dt) {
    if (!T.defense && e.osh <= 0) {
      T.defense = true;
      e.maxHit = a.defense.maxHit;
      e.baseSpeed *= a.defense.speed;
      this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: `🛡️ AVARIAN DEFENSE! No hit does more than ${a.defense.maxHit}`, color: '#ffe082' });
    }
    if (!T.ascend && e.hp <= e.maxHp * (a.ascend.hp / ENEMIES[e.type].hp)) {
      T.ascend = true;
      e.flying = true;
      e.osh = 0;
      this.events.push({ k: 'enrage', e: e.id });
      this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: '🪽 DIVINE ASCENSION! He flies: only air detection can hit him', color: '#fffde7' });
    }
    if (e.stop) return;
    const l = a.light;
    if ((T.light ??= l.every * 0.5, T.light -= dt) <= 0) {
      const lr = l.range * reach(e);
      const list = [...this.towers.values()].filter((t) => t.hp > 0 && !this.stealthy(t) && (t.x - e.x) ** 2 + (t.z - e.z) ** 2 <= lr * lr)
        .sort((p, q) => ((p.x - e.x) ** 2 + (p.z - e.z) ** 2) - ((q.x - e.x) ** 2 + (q.z - e.z) ** 2)).slice(0, l.n);
      if (!list.length) T.light = 1;
      else {
        T.light = l.every;
        this.events.push({ k: 'warp', x: r2(e.x), z: r2(e.z) });
        for (const t of list) {
          // He flashes to each tower, strikes it, and is back on the path in a blink.
          this.events.push({ k: 'warp', x: r2(t.x), z: r2(t.z) });
          this.hexTowers(t.x, t.z, 0.5, 'stun', l.stun, true, (o) => o === t);
          this.events.push({ k: 'eShot', e: e.id, kind: 'laser', fx: r2(e.x), fz: r2(e.z), x: r2(t.x), z: r2(t.z), d: 0, c: 0xfff59d });
        }
        e.hp = Math.min(e.maxHp, e.hp + l.heal * list.length * (e.curve ?? 1));
        this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: `✨ SPEED OF LIGHT! ${list.length} towers stunned`, color: '#fff59d' });
      }
    }
  }
}
