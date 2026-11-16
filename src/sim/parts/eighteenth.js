// Wave 18 towers (eighteenthtowers.js): Hoplite spears and Challenge, Great Cannon balls that go
// through a row, Crossbowman bolts, Arcantech half-magic bullets, Cygor boulders, Astrapomancer
// zaps and Conduit, Oathsworn Revenant spells, and Helloc (Defender's Fall, Annihilation, Lava
// Waves, the Spawn of Helloc).
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { TOWERS, canHit, rootType } from '../../config.js';
import { r2 } from './shared.js';

const ALL = { hidden: true, flying: true, lead: true };
const near = (a, b, r) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2 <= r * r;

export class SimEighteenth {

  // ---------------------------------------------------------------- every tick

  /** Spear marks, Challenge, Conduit stacks and Souldrains wearing off. */
  x18Tick(dt) {
    for (const e of this.enemies.values()) {
      if (e.spearT > 0) e.spearT -= dt;
      if (e.chalT > 0) e.chalT -= dt;
    }
    for (const t of this.towers.values()) {
      if (!t.cond?.length) continue;
      for (let i = 0; i < t.cond.length; i++) t.cond[i] -= dt;
      t.cond = t.cond.filter((x) => x > 0);
    }
    if (this.drains18?.length) this.tickDrains(dt);
  }

  /** Haste from Conduit: +`condH` for each stack still on (0 = none). */
  haste18(t) {
    return t.cond?.length ? t.cond.length * t.condH : 0;
  }

  /** Oathsworn Souldrain: a share of the zombie's max health every second, up to a cap. */
  tickDrains(dt) {
    this.dot = true;
    try {
      for (const d of this.drains18) {
        d.left -= dt;
        const e = this.enemies.get(d.e);
        if (!e) {
          d.left = 0;
          continue;
        }
        this.damage(this.towers.get(d.tower) ?? null, e, Math.min(d.cap, e.maxHp * d.pct) * dt, true);
      }
    } finally {
      this.dot = false;
    }
    this.drains18 = this.drains18.filter((d) => d.left > 0);
  }

  // ---------------------------------------------------------------- basic attacks

  /** A wave 18 tower's own basic attack at `target` (s.hit18). */
  fire18(t, def, s, target) {
    const det = this.detects(t, s);
    switch (s.hit18) {
      case 'spear': {
        // Hoplite: don't throw at a zombie another Hoplite just threw at, if there's another one.
        if (target.spearT > 0 && target.spearBy !== t.id) {
          const min = def.minRange || 0;
          let best = null;
          for (const e of this.enemies.values()) {
            if (e.spearT > 0 || !canHit(det, e) || !near(e, t, s.range) || (min && near(e, t, min))) continue;
            if (!best || e.dist > best.dist) best = e;
          }
          if (best) target = best;
        }
        target.spearT = 0.6;
        target.spearBy = t.id;
        let dmg = s.damage;
        if (s.air && target.flying) dmg *= s.air;
        if (s.challenged && target.chalT > 0) dmg *= 1 + s.challenged;
        this.shoot(t, target, dmg);
        if (s.bleed && this.enemies.has(target.id)) this.ignite(target, t.id, s.bleed.dps, s.bleed.time, 0);
        return;
      }
      case 'cannon': {
        // Great Cannon: the ball goes through `pierce` zombies in a line.
        const hits = [target, ...this.lineBehind(t, s, target, det).slice(0, s.pierce - 1)];
        this.events.push({ k: 'bounce', t: t.id, es: hits.map((e) => e.id) });
        for (const e of hits) {
          if (!this.enemies.has(e.id)) continue;
          this.damage(t, e, s.damage);
          if (s.bleed && this.enemies.has(e.id)) this.ignite(e, t.id, s.bleed.dps, s.bleed.time, 0);
        }
        return;
      }
      case 'xbow': {
        let dmg = s.damage;
        if (s.crit && Math.random() < s.crit.chance) {
          dmg *= s.crit.mult;
          this.events.push({ k: 'chaos', x: r2(target.x), z: r2(target.z), text: 'Crit!', color: '#fff59d' });
        }
        this.events.push({ k: 'shot', t: t.id, e: target.id });
        this.damage(t, target, dmg, !!s.armorPierce);
        if (s.slow && this.enemies.has(target.id)) this.applySlime(target, { slow: s.slow.amt, time: s.slow.time, boss: 0.5 });
        return;
      }
      case 'hybrid': {
        // Arcantech: half bullet damage, half magic (no bullet resistance).
        this.shoot(t, target, s.damage / 2);
        if (this.enemies.has(target.id)) this.magicHit(t, target, s.damage / 2);
        return;
      }
      case 'boulder': {
        // Cygor: a boulder that explodes where it lands.
        const time = def.lob;
        this.shells.push({ tower: t.id, x: target.x, z: target.z, time, damage: s.damage, radius: s.radius, det, main: target.id });
        this.events.push({ k: 'lob', t: t.id, x: r2(target.x), z: r2(target.z), d: time });
        return;
      }
      case 'zap': {
        this.events.push({ k: 'fx17', f: 'beam', t: t.id, x: r2(target.x), z: r2(target.z), c: 0x80d8ff });
        this.damage(t, target, s.damage);
        if (s.stun && this.enemies.has(target.id)) this.stop({}, target, s.stun, 'stun');
        return;
      }
      case 'helloc': {
        // Helloc: a sword swing that hits every zombie near the one it hits.
        this.events.push({ k: 'fx17', f: 'pulse', x: r2(target.x), z: r2(target.z), r: s.radius, c: 0xff1744 });
        for (const e of [...this.enemies.values()]) {
          if (!canHit(det, e) || !near(e, target, s.radius)) continue;
          this.hellocHit(t, s, e, s.damage);
        }
        return;
      }
    }
  }

  /** Magic damage: no bullet resistance stops it. */
  magicHit(t, e, dmg) {
    const k = this.hitKind;
    this.hitKind = 'none';
    try {
      this.damage(t, e, dmg);
    } finally {
      this.hitKind = k;
    }
  }

  /** Helloc's damage: with Defender's Fall a third bullet, a third magic, a third true damage. */
  hellocHit(t, s, e, dmg) {
    if (!s.split) return this.damage(t, e, dmg);
    this.damage(t, e, dmg / 3);
    if (this.enemies.has(e.id)) this.magicHit(t, e, dmg / 3);
    if (!this.enemies.has(e.id)) return;
    this.trueHit = true;
    try {
      this.damage(t, e, dmg / 3);
    } finally {
      this.trueHit = false;
    }
  }

  // ---------------------------------------------------------------- spells

  /** Wave 18 spells (called from cast17). false = nothing to hit yet, try again soon. */
  cast18(t, s, c) {
    const det = this.detects(t, s);
    const fx = (o) => this.events.push({ k: 'fx17', ...o });
    switch (c.key) {
      case 'challenge': {
        // Hoplite Challenge: more damage from Hoplites and a slow, for `time` s (it adds up).
        const e = this.findTarget(t, s, t.x, t.z, s.range);
        if (!e) return false;
        e.chalT = Math.max(0, e.chalT || 0) + c.time;
        this.applySlime(e, { slow: c.slow, time: e.chalT, boss: 0.5 });
        fx({ f: 'pulse', x: r2(e.x), z: r2(e.z), r: 1.5, c: 0xffb300 });
        this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: '⚔ Challenged!', color: '#ffb300' });
        return true;
      }
      case 'thunderclap': {
        const e = this.findTarget(t, s, t.x, t.z, s.range);
        if (!e) return false;
        fx({ f: 'bolt', x: r2(e.x), z: r2(e.z), c: 0x80d8ff });
        fx({ f: 'pulse', x: r2(e.x), z: r2(e.z), r: c.radius, c: 0x80d8ff });
        for (const o of [...this.enemies.values()]) {
          if (!canHit(det, o) || !near(o, e, c.radius)) continue;
          this.damage(t, o, c.damage);
          if (this.enemies.has(o.id)) this.stop({}, o, c.stun, 'stun');
        }
        return true;
      }
      case 'conduit': {
        // Astrapomancer Conduit: it and the Astrapomancers / Magei near it get a stack of haste.
        for (const o of this.towers.values()) {
          if (o.hp <= 0 || !near(o, t, c.radius) || !c.kinds.includes(rootType(o.type))) continue;
          (o.cond ??= []).push(c.time);
          o.condH = c.haste;
        }
        fx({ f: 'pulse', x: r2(t.x), z: r2(t.z), r: c.radius, c: 0x40c4ff });
        return true;
      }
      case 'skull': {
        // Oathsworn Sepulchral Cacophony: a ghost skull that blasts every zombie near the target.
        const e = this.findTarget(t, s, t.x, t.z, s.range);
        if (!e) return false;
        fx({ f: 'meteor', x: r2(e.x), z: r2(e.z), r: c.radius, d: 0.6, ball: 1 });
        this.shells.push({ tower: t.id, x: e.x, z: e.z, time: 0.6, damage: s.damage, radius: c.radius, det, main: e.id });
        return true;
      }
      case 'souldrain': {
        const e = this.findTarget(t, s, t.x, t.z, s.range);
        if (!e) return false;
        (this.drains18 ??= []).push({ e: e.id, tower: t.id, left: c.time, pct: c.pct, cap: c.cap });
        fx({ f: 'beam', t: t.id, x: r2(e.x), z: r2(e.z), c: 0x76ff03, d: c.time });
        return true;
      }
      case 'veil': {
        const list = this.inRange17(t, s, det);
        if (!list.length) return false;
        for (const e of list) this.applySlime(e, { slow: c.slow, time: c.time, boss: 0.5 });
        fx({ f: 'pulse', x: r2(t.x), z: r2(t.z), r: s.range, c: 0xb2ff59 });
        return true;
      }
      case 'damnation': {
        // Oathsworn Damnation: a rift around it; zombies inside lose a share of max health.
        if (!this.inRange17(t, s, det).length) return false;
        (this.zones17 ??= []).push({ tower: t.id, x: t.x, z: t.z, r: c.radius, left: c.time, hpDmg: c.pct, hpCap: c.cap });
        fx({ f: 'zone', x: r2(t.x), z: r2(t.z), r: c.radius, d: c.time, c: 0x64dd17 });
        return true;
      }
      case 'annihilate': {
        // Helloc Annihilation: every zombie in range under `below` of its max health is wiped out (not bosses).
        const list = this.inRange17(t, s, det).filter((e) => !e.boss && e.hp <= e.maxHp * c.below);
        if (!list.length) return false;
        this.trueHit = true;
        try {
          for (const e of list) {
            fx({ f: 'pulse', x: r2(e.x), z: r2(e.z), r: 1.5, c: 0xff3d00 });
            this.damage(t, e, e.hp + (e.vShield || 0) + (e.osh || 0) + 1, true);
          }
        } finally {
          this.trueHit = false;
        }
        return true;
      }
      case 'lava': {
        // Helloc Lava Waves: from the base back to the start; zombies farther back take more.
        const list = [...this.enemies.values()].filter((e) => canHit(ALL, e));
        if (!list.length) return false;
        const far = Math.max(1, ...list.map((e) => e.dist));
        fx({ f: 'wave', x: r2(t.x), z: r2(t.z), c: 0xff6d00 });
        for (const e of list) {
          if (!this.enemies.has(e.id)) continue;
          this.hellocHit(t, s, e, s.damage * (c.min + (1 - c.min) * (1 - e.dist / far)));
        }
        return true;
      }
    }
    return true;
  }

  // ---------------------------------------------------------------- Helloc's Spawn

  /** Helloc tier 4: keeps its Spawn on the path (Supercharge adds room: every full 1 is one more). */
  updateGuard18(t, def, s, dt) {
    const room = Math.floor((s.maxUnits || 1) + (def.supercharge?.units || 0) * (t.sc || 0));
    this.updateGuards(t, def, { ...s, maxUnits: room }, dt);
  }
}

/** How many `type` towers (any player, any branch) stand on the map. */
export function onMap(towers, type) {
  let n = 0;
  for (const t of towers) if (rootType(t.type) === type && !t.holo) n++;
  return n;
}

/** Wave 18 placement check: the map-wide limit (`mapLimit`). Returns an error or null. */
export function mapLimitWhy(towers, type) {
  const def = TOWERS[type];
  if (!def?.mapLimit) return null;
  return onMap(towers, type) >= def.mapLimit ? `Only ${def.mapLimit} ${def.name} on the whole map` : null;
}
