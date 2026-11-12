// What Halloween Night 2's enemies do (src/halloween2.js): the Ringmaster's Spotlight, the
// Predator's Screech and Charge, the Judge's bell, Nail Head shields, the Heretic's Smite,
// Prowlers charging, Jack O' Lanterns exploding, and towers bleeding from Psycho knives.
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { ENEMIES, TOWERS } from '../../config.js';
import { HERO_TOWERS } from '../../herotowers.js';
import { buffOf, r2 } from './shared.js';

/** Enemies that use carnivalMoves (sim.js checks this set every tick). */
export const H2_FX = new Set(Object.keys(ENEMIES).filter((k) => {
  const d = ENEMIES[k];
  return d.chargeAt || d.bell || d.shieldPulse || d.spotlight || d.screech || d.burst || d.smite;
}));

export class SimCarnival {

  /** One enemy's carnival moves for this tick (before it walks). */
  carnivalMoves(e, def, dt) {
    this.h2On = true;
    const T = (e.h2T ??= {});
    // Prowler: charges once it drops below 65% health.
    const ch = def.chargeAt;
    if (ch && !e.h2Charged && e.hp <= e.maxHp * ch.hp) {
      e.h2Charged = true;
      e.baseSpeed = ch.speed;
      this.events.push({ k: 'enrage', e: e.id });
    }
    // Predator Charge: a short burst of speed every so often.
    const bu = def.burst;
    if (bu) {
      T.burst ??= bu.every;
      if (T.burstOn > 0) {
        T.burstOn -= dt;
        if (!e.stop) e.speed *= bu.speed;
      } else if ((T.burst -= dt) <= 0 && !e.stop) {
        T.burst = bu.every;
        T.burstOn = bu.time;
        this.events.push({ k: 'dash', e: e.id });
      }
    }
    if (e.stop) return; // stunned or frozen: no attacks
    // Judge, The Bell Tolls: the enemies around him are faster for a while.
    const bl = def.bell;
    if (bl && ((T.bell ??= bl.every * 0.5), (T.bell -= dt) <= 0)) {
      T.bell = bl.every;
      for (const o of this.enemies.values()) {
        if (o.remains || o === e || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > bl.radius * bl.radius) continue;
        o.empT = Math.max(o.empT || 0, bl.time);
        o.empHaste = Math.max(o.empHaste || 0, bl.speed);
      }
      this.events.push({ k: 'eBlast', x: r2(e.x), z: r2(e.z), r: bl.radius, c: 0xffd54f });
      this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: '🔔 The Bell Tolls!', color: '#ffd54f' });
    }
    // Nail Head: shields itself and the enemies around it.
    const sp = def.shieldPulse;
    if (sp && ((T.shield ??= sp.every), (T.shield -= dt) <= 0)) {
      T.shield = sp.every;
      for (const o of this.enemies.values()) {
        if (o.remains || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > sp.radius * sp.radius) continue;
        const amt = Math.round(sp.flat + o.maxHp * sp.pct);
        o.osh = Math.max(o.osh || 0, amt); // refreshes the shield, it doesn't pile up
        o.oshMax = Math.max(o.oshMax || 0, o.osh);
      }
      this.events.push({ k: 'eBlast', x: r2(e.x), z: r2(e.z), r: sp.radius, c: 0x90a4ae });
    }
    // Predator Screech: stuns the towers around it.
    const sc = def.screech;
    if (sc && ((T.screech ??= sc.every * 0.5), (T.screech -= dt) <= 0)) {
      if (this.enemyTargets(e, sc.radius).length) {
        T.screech = sc.every;
        const n = this.hexTowers(e.x, e.z, sc.radius, 'stun', sc.stun, true);
        this.events.push({ k: 'slam', e: e.id, x: r2(e.x), z: r2(e.z), r: sc.radius, n, name: 'Screech', c: 0xaa00ff });
      } else T.screech = 0.5;
    }
    // Heretic Smite: strikes the most expensive tower anywhere.
    const sm = def.smite;
    if (sm && ((T.smite ??= sm.every * 0.5), (T.smite -= dt) <= 0)) {
      let best = null;
      for (const t of this.towers.values()) if (t.hp > 0 && !this.stealthy(t) && (!best || (t.spent ?? 0) > (best.spent ?? 0))) best = t;
      if (!best) T.smite = 1;
      else {
        T.smite = sm.every;
        this.hurtTower(best, sm.dmg, true);
        if (sm.stun) this.hexTowers(best.x, best.z, 0.5, 'stun', sm.stun, true, (o) => o === best);
        this.events.push({ k: 'eShot', e: e.id, kind: 'laser', fx: r2(e.x), fz: r2(e.z), x: r2(best.x), z: r2(best.z), d: 0 });
        this.events.push({ k: 'chaos', x: r2(best.x), z: r2(best.z), text: '⚡ Smite!', color: '#f48fb1' });
      }
    }
    // Ringmaster Spotlight: one tower is powered up, every other tower is stunned.
    const sl = def.spotlight;
    if (sl && ((T.spot ??= sl.every * 0.4), (T.spot -= dt) <= 0)) {
      const list = [...this.towers.values()].filter((t) => t.hp > 0 && !this.stealthy(t));
      if (!list.length) T.spot = 1;
      else {
        T.spot = sl.every;
        const star = list[Math.floor(Math.random() * list.length)];
        star.spotT = sl.time;
        star.spotBy = e.type;
        const n = this.hexTowers(e.x, e.z, Infinity, 'stun', sl.stun, true, (o) => o !== star);
        this.events.push({ k: 'chaos', x: r2(star.x), z: r2(star.z), text: '🔦 SPOTLIGHT! 2x damage', color: '#fff59d' });
        this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: `🎪 Spotlight! ${n} towers stunned`, color: '#ff5252' });
      }
    }
  }

  /** Jack O' Lanterns: when one dies it explodes, stunning towers (and hurting units) close by. */
  carnivalBlast(e, b) {
    const n = this.hexTowers(e.x, e.z, b.radius, 'stun', b.stun, true, b.heroes ? (t) => !!HERO_TOWERS[t.type] : null); // heroes: hero towers only (Night 3 Bomb Barrel Boy)
    if (b.unitDmg) this.hurtUnitsNear(e.x, e.z, b.radius, b.unitDmg);
    this.events.push({ k: 'eBlast', x: r2(e.x), z: r2(e.z), r: b.radius, c: 0xff6d00 });
    if (n) this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: `🎃 BOOM! ${n} stunned`, color: '#ff9100' });
  }

  /** Every tick, after the boosts are worked out: Spotlight boosts and knife bleeds on towers. */
  carnivalTowers(dt) {
    if (!this.h2On) return;
    for (const t of this.towers.values()) {
      if (t.spotT > 0) {
        t.spotT -= dt;
        const sl = ENEMIES[t.spotBy]?.spotlight;
        if (sl && !TOWERS[t.type].noDmgBuff) {
          const b = buffOf(this.buffs, t.id);
          this.buffs.set(t.id, { ...b, dmg: b.dmg * sl.dmg, range: TOWERS[t.type].noRangeBuff ? b.range : b.range * sl.range });
        }
      }
      if (t.cutT > 0) {
        // Psycho knife: the tower keeps bleeding for a while.
        t.cutT -= dt;
        this.hurtTower(t, t.cutDps * dt, true);
      }
    }
  }

  /** A Psycho's knife landed on tower `t`: it bleeds. */
  cutTower(t, bleed) {
    if (this.stealthy(t) || buffOf(this.buffs, t.id).invuln || t.invulnT > 0) return;
    t.cutDps = Math.max(t.cutT > 0 ? t.cutDps || 0 : 0, bleed.dps);
    t.cutT = Math.max(t.cutT || 0, bleed.time);
  }
}
