// Wave 17 towers (seventeenthtowers.js): Stardaughter arrows, spells on their own timers (Magei,
// Sunwalker, Aquamancer, Augur Solis), Time Warp / Inspire / Purge By Fire, John Roblox's boosts
// and the Augur Solis beam.
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { ENEMIES, TOWERS, canHit } from '../../config.js';
import { r2 } from './shared.js';

const ALL = { hidden: true, flying: true, lead: true };
const GROUND = { hidden: true, flying: false, lead: true };
const near = (a, b, r) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2 <= r * r;
const pick = (list, n) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
};

export class SimSeventeenth {

  // ---------------------------------------------------------------- every tick

  /** Timed boosts (Time Warp, Inspire), John Roblox's GO, GO, GO!, zones (Firestorm, Sacred Flame). */
  x17Tick(dt) {
    const johns = [];
    for (const t of this.towers.values()) {
      if (t.warpT > 0) t.warpT -= dt;
      if (t.inspT > 0) t.inspT -= dt;
      t.goLeth = 0;
      t.goRange = 0;
      const s = TOWERS[t.type].levels[t.level];
      if (s.go && t.hp > 0 && !t.corrupt) johns.push(t);
    }
    for (const j of johns) {
      const s = TOWERS[j.type].levels[j.level];
      for (const o of this.towers.values()) {
        if (o === j || !near(o, j, s.range)) continue;
        o.goLeth = Math.max(o.goLeth, s.go.leth);
        o.goRange = Math.max(o.goRange, s.go.range);
      }
    }
    if (this.zones17?.length) this.tickZones17(dt);
  }

  /** Haste from Time Warp, Inspire and Ebb and Flow (1 = none). */
  haste17(t) {
    return 1 + (t.warpT > 0 ? t.warp : 0) + (t.inspT > 0 ? t.inspH : 0);
  }

  /** Lethality from wave 17: the level's own, John's GO, GO, GO!, Inspire. */
  leth17(t) {
    let l = TOWERS[t.type].levels[t.level]?.leth || 0;
    if (t.goLeth) l += t.goLeth;
    if (t.inspT > 0) l += t.inspL;
    return l;
  }

  tickZones17(dt) {
    this.dot = true;
    try {
      for (const z of this.zones17) {
        z.left -= dt;
        const t = this.towers.get(z.tower) ?? null;
        for (const e of [...this.enemies.values()]) {
          if (!canHit(ALL, e) || !near(e, z, z.r)) continue;
          if (z.dps) this.damage(t, e, z.dps * dt);
          if (z.hpDmg && this.enemies.has(e.id)) this.damage(t, e, e.maxHp * z.hpDmg * dt, true); // through armor
          if (z.burn && this.enemies.has(e.id)) this.ignite(e, z.tower, z.burn, z.burnTime, 0);
        }
        if (z.heal) for (const u of this.units.values()) if (u.hp > 0 && u.def.guard && near(u, z, z.r)) u.hp = Math.min(u.maxHp, u.hp + (z.heal + u.maxHp * z.pct) * dt);
      }
    } finally {
      this.dot = false;
    }
    this.zones17 = this.zones17.filter((z) => z.left > 0);
  }

  // ---------------------------------------------------------------- basic attacks

  /** A wave 17 tower's own basic attack at `target` (s.hit17). */
  fire17(t, def, s, target) {
    if (s.hit17 === 'fireball') {
      // Sunwalker: a fireball that bursts and burns.
      const time = def.lob;
      this.shells.push({ tower: t.id, x: target.x, z: target.z, time, damage: s.damage, radius: s.radius, det: this.detects(t, s), main: target.id, burn: s.burn, burnTime: s.burnTime, burnSlow: 0, fireproof: s.fireproof });
      this.events.push({ k: 'lob', t: t.id, x: r2(target.x), z: r2(target.z), d: time });
      return;
    }
    let dmg = s.damage;
    if (s.hit17 === 'john' && s.sin) {
      // Strength in Numbers: more damage for each other tower in his range.
      let n = 0;
      for (const o of this.towers.values()) if (o !== t && o.hp > 0 && near(o, t, s.range)) n++;
      dmg *= 1 + s.sin * n;
    }
    if (s.crit && Math.random() < s.crit.chance) {
      dmg *= s.crit.mult;
      this.events.push({ k: 'chaos', x: r2(target.x), z: r2(target.z), text: 'Crit!', color: '#fff59d' });
    }
    if (s.air && target.flying) dmg *= s.air;
    this.shoot(t, target, dmg);
    if (s.unity && this.enemies.has(target.id)) {
      // Umaani's Unity: each Stardaughter on the map adds true damage to this hit.
      let n = 0;
      for (const o of this.towers.values()) if (o.type === t.type && o.hp > 0) n++;
      const share = Math.min(s.unityCap, s.unity * n);
      this.trueHit = true;
      try {
        this.damage(t, target, dmg * share);
      } finally {
        this.trueHit = false;
      }
    }
  }

  // ---------------------------------------------------------------- spells

  /** Spells (s.spells): each on its own timer. `dt` is already sped up by haste. */
  updateSpells(t, s, dt) {
    if (!this.enemies.size) return;
    const sp = (t.sp ??= {});
    for (const c of s.spells) {
      sp[c.key] = (sp[c.key] ?? c.every * 0.5) - dt;
      if (sp[c.key] > 0) continue;
      if (this.cast17(t, s, c) === false) sp[c.key] = 0; // nothing to hit yet: try again next tick
      else sp[c.key] = c.every;
    }
    if (t.beamT > 0) this.tickSunbeams(t, s, dt);
  }

  /** In range and seen by tower `t` (its blind spot left out). */
  inRange17(t, s, det = this.detects(t, s), ground = false) {
    const min = TOWERS[t.type].minRange || 0;
    return [...this.enemies.values()].filter((e) => canHit(det, e) && !(ground && e.flying) && near(e, t, s.range) && !(min && near(e, t, min)));
  }

  cast17(t, s, c) {
    const det = this.detects(t, s);
    const fx = (o) => this.events.push({ k: 'fx17', ...o });
    switch (c.key) {
      case 'spikes': {
        // Magei Glacier Spikes: ice spikes on zombies in range (Freezeshatter: each one makes the next stronger).
        const list = pick(this.inRange17(t, s, det), c.count);
        if (!list.length) return false;
        for (const e of list) {
          let dmg = c.damage;
          if (c.shatter && e.shatT > 0) dmg *= 1 + c.shatter.add * e.shatN;
          fx({ f: 'spike', x: r2(e.x), z: r2(e.z) });
          this.damage(t, e, dmg);
          if (!this.enemies.has(e.id)) continue;
          this.applySlime(e, { slow: c.slow, time: c.time, boss: 0.5 });
          if (c.shatter) {
            e.shatN = e.shatT > 0 ? Math.min(c.shatter.max, e.shatN + 1) : 1;
            e.shatT = c.shatter.time;
          }
        }
        return true;
      }
      case 'arcane': {
        // Magei Arcane Explosion: one zombie, and a quarter of the blast on the ones near it.
        const e = this.findTarget(t, s, t.x, t.z, s.range);
        if (!e) return false;
        fx({ f: 'beam', t: t.id, x: r2(e.x), z: r2(e.z), c: 0xea80fc });
        this.explode(t, e.x, e.z, { damage: c.damage, splash: c.damage * c.splash, main: e.id, radius: c.radius, det });
        return true;
      }
      case 'firestorm': {
        // Magei Firestorm: a fire zone on the target for `time` s.
        const e = this.findTarget(t, s, t.x, t.z, s.range);
        if (!e) return false;
        (this.zones17 ??= []).push({ tower: t.id, x: e.x, z: e.z, r: c.radius, left: c.time, dps: c.dps, burn: c.burn, burnTime: 2 });
        fx({ f: 'zone', x: r2(e.x), z: r2(e.z), r: c.radius, d: c.time, c: 0xff6d00 });
        return true;
      }
      case 'sunbeam':
      case 'solarion': {
        // Sunwalker: Sunbeam burns every zombie in range, Solarion the ones in front of it, for `time` s.
        if (!this.inRange17(t, s, det).length) return false;
        (t.beams ??= []).push({ ...c, left: c.time });
        t.beamT = Math.max(t.beamT || 0, c.time);
        if (c.key === 'sunbeam') fx({ f: 'zone', x: r2(t.x), z: r2(t.z), r: s.range, d: c.time, c: 0xffd54f });
        else fx({ f: 'beam', t: t.id, x: r2(t.x + Math.sin(t.yaw) * s.range), z: r2(t.z + Math.cos(t.yaw) * s.range), c: 0xffab00, d: c.time });
        return true;
      }
      case 'combust': {
        // Sunwalker Combustion: puts out every burn in range for 10x what was left of it, at once.
        const list = this.inRange17(t, s, det).filter((e) => e.burn > 0 && e.burnDps > 0);
        if (!list.length) return false;
        for (const e of list) {
          const left = e.burnDps * e.burn;
          e.burn = 0;
          e.burnDps = 0;
          fx({ f: 'pulse', x: r2(e.x), z: r2(e.z), r: 3, c: 0xff3d00 });
          this.damage(t, e, left * c.mult);
        }
        return true;
      }
      case 'meteor': {
        const e = this.findTarget(t, s, t.x, t.z, s.range);
        if (!e) return false;
        fx({ f: 'meteor', x: r2(e.x), z: r2(e.z), r: c.radius, d: 0.8 });
        this.shells.push({ tower: t.id, x: e.x, z: e.z, time: 0.8, damage: c.damage, radius: c.radius, det });
        return true;
      }
      case 'wave': {
        // Aquamancer Raging Wave: every zombie on the ground, anywhere on the track.
        const list = [...this.enemies.values()].filter((e) => canHit(GROUND, e) && !e.flying);
        if (!list.length) return false;
        fx({ f: 'wave', x: r2(t.x), z: r2(t.z) });
        for (const e of list) this.damage(t, e, s.damage);
        return true;
      }
      case 'ebb': {
        // Aquamancer Ebb and Flow: a random speed boost for a random time.
        t.dpT = c.tmin + Math.random() * (c.tmax - c.tmin);
        t.dpBoost = c.min + Math.random() * (c.max - c.min);
        this.events.push({ k: 'chaos', x: r2(t.x), z: r2(t.z), text: `🌊 +${Math.round(t.dpBoost * 100)}% speed`, color: '#4fc3f7' });
        return true;
      }
      case 'anchor': {
        const e = this.findTarget(t, s, t.x, t.z, s.range);
        if (!e) return false;
        fx({ f: 'pulse', x: r2(e.x), z: r2(e.z), r: c.radius, c: 0x0288d1 });
        for (const o of this.enemies.values()) if (!o.flying && near(o, e, c.radius)) this.applySlime(o, { slow: c.slow, time: c.time, boss: 0.5 });
        return true;
      }
      case 'galleon': {
        // Aquamancer Queen's Galleon: shots at the toughest zombies on the ground.
        const list = [...this.enemies.values()].filter((e) => canHit(GROUND, e) && !e.flying).sort((a, b) => b.hp - a.hp);
        if (!list.length) return false;
        for (let i = 0; i < c.shots; i++) {
          const e = list[i % list.length];
          fx({ f: 'meteor', x: r2(e.x), z: r2(e.z), r: 2, d: 0.5 + i * 0.12, ball: 1 });
          this.shells.push({ tower: t.id, x: e.x, z: e.z, time: 0.5 + i * 0.12, damage: c.damage, radius: 1, det: GROUND, main: e.id });
        }
        return true;
      }
      case 'tempest': {
        // Aquamancer Tempest: lightning on random zombies anywhere, with a stun.
        const list = pick([...this.enemies.values()].filter((e) => canHit(ALL, e)), c.targets);
        if (!list.length) return false;
        for (const e of list) {
          fx({ f: 'bolt', x: r2(e.x), z: r2(e.z), c: 0x40c4ff });
          this.damage(t, e, c.damage);
          if (this.enemies.has(e.id)) this.stop({}, e, c.stun, 'stun');
        }
        return true;
      }
      case 'sacred': {
        // Augur Solis Sacred Flame: a holy zone around the troop its beam is on.
        const u = this.units.get(t.lock17);
        if (!u) return false;
        (this.zones17 ??= []).push({ tower: t.id, x: u.x, z: u.z, r: c.radius, left: c.time, heal: c.heal, pct: c.pct, hpDmg: c.hpDmg, burn: c.burn ? c.burn : 0, burnTime: c.burnTime });
        fx({ f: 'zone', x: r2(u.x), z: r2(u.z), r: c.radius, d: c.time, c: 0xffe082 });
        return true;
      }
    }
    return true;
  }

  /** Sunwalker Sunbeam / Solarion: damage every tick while they last. */
  tickSunbeams(t, s, dt) {
    t.beamT -= dt;
    const det = this.detects(t, s);
    this.dot = true;
    try {
      for (const b of t.beams) {
        b.left -= dt;
        for (const e of this.inRange17(t, s, det)) {
          if (b.cone) {
            const a = Math.atan2(e.x - t.x, e.z - t.z) - t.yaw;
            if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) > b.cone) continue;
          }
          this.damage(t, e, b.dps * dt);
          if (b.burn && this.enemies.has(e.id)) this.ignite(e, t.id, b.burn, b.burnTime, 0);
        }
      }
    } finally {
      this.dot = false;
    }
    t.beams = t.beams.filter((b) => b.left > 0);
  }

  // ---------------------------------------------------------------- abilities

  use17(t, s, ab) {
    switch (ab.key) {
      case 'timeWarp':
        for (const o of this.towers.values()) {
          o.warp = Math.max(o.warpT > 0 ? o.warp : 0, ab.haste);
          o.warpT = ab.duration;
        }
        this.events.push({ k: 'chaos', x: r2(t.x), z: r2(t.z), text: '⌛ Time Warp!', color: '#b388ff' });
        break;
      case 'inspire':
        for (const o of this.towers.values()) {
          o.inspL = Math.max(o.inspT > 0 ? o.inspL : 0, ab.leth);
          o.inspH = Math.max(o.inspT > 0 ? o.inspH : 0, ab.haste);
          o.inspT = ab.duration;
        }
        this.events.push({ k: 'chaos', x: r2(t.x), z: r2(t.z), text: '★ Inspire!', color: '#ffd740' });
        break;
      case 'purge':
        t.purgeT = ab.duration;
        t.purge = ab;
        this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r: s.range });
        break;
    }
  }

  // ---------------------------------------------------------------- Augur Solis

  /**
   * Augur Solis: its beam locks onto one of its owner's barracks troops in range (not in the blind
   * spot) and heals it until it is full or gone; zombies near that troop take true damage.
   */
  updateAugur(t, s, dt, rate) {
    const a = s.augur;
    const min = TOWERS[t.type].minRange || 0;
    const ok = (u) => u && u.hp > 0 && u.def.guard && this.towers.get(u.tower)?.owner === t.owner && near(u, t, s.range) && !near(u, t, min);
    if (t.purgeT > 0) {
      // Purge By Fire: every troop of its owner heals, zombies in range burn.
      t.purgeT -= dt;
      const p = t.purge;
      for (const u of this.units.values()) if (u.hp > 0 && u.def.guard && this.towers.get(u.tower)?.owner === t.owner) u.hp = Math.min(u.maxHp, u.hp + (p.heal + u.maxHp * p.pct) * dt);
      for (const e of this.enemies.values()) if (canHit(ALL, e) && near(e, t, s.range)) this.ignite(e, t.id, p.burn, p.burnTime, 0);
    }
    let u = this.units.get(t.lock17);
    if (!ok(u) || (u.hp >= u.maxHp && this.hurtTroop(t, ok))) {
      // A new troop: the most hurt one, else the one with the most zombies near it.
      u = this.hurtTroop(t, ok);
      if (!u) {
        let best = 0;
        for (const o of this.units.values()) {
          if (!ok(o)) continue;
          let n = 0;
          for (const e of this.enemies.values()) if (near(e, o, a.radius)) n++;
          if (n > best || !u) {
            u = o;
            best = n;
          }
        }
      }
      t.lock17 = u ? u.id : 0;
    }
    if (!u) return;
    u.hp = Math.min(u.maxHp, u.hp + (a.heal + u.maxHp * a.pct) * dt * rate);
    t.yaw = Math.atan2(u.x - t.x, u.z - t.z);
    t.cooldown -= dt * rate;
    if (t.cooldown > 0 || !this.enemies.size) return;
    t.cooldown = a.every;
    this.events.push({ k: 'fx17', f: 'beam', t: t.id, x: r2(u.x), z: r2(u.z), c: 0xfff176, d: a.every });
    this.trueHit = true;
    try {
      for (const e of [...this.enemies.values()]) {
        if (!canHit(this.detects(t, s), e) || !near(e, u, a.radius)) continue;
        this.damage(t, e, a.damage);
        if (a.burn && this.enemies.has(e.id)) this.ignite(e, t.id, a.burn, a.burnTime, 0);
      }
    } finally {
      this.trueHit = false;
    }
  }

  hurtTroop(t, ok) {
    let best = null;
    for (const u of this.units.values()) if (ok(u) && u.hp < u.maxHp && (!best || u.hp / u.maxHp < best.hp / best.maxHp)) best = u;
    return best;
  }

  /**
   * Tax Collector, after each wave's tower income (`paid`: what each player's towers earned).
   * Only each player's highest-tier Tax Collector counts. Tax: every player gives up the highest
   * tax rate among the other players' collectors, split evenly between those collectors. Then each
   * collector's owner gets the pension, and last, cash under the gold minimum is topped up.
   */
  payTaxes(paid) {
    const best = new Map();
    for (const t of this.towers.values()) {
      const x = !t.holo && TOWERS[t.type].levels[t.level].taxman;
      if (x && !(best.get(t.owner)?.t.level >= t.level)) best.set(t.owner, { t, x });
    }
    if (!best.size) return;
    const got = new Map();
    for (const [pid, inc] of paid) {
      const p = this.players.get(pid);
      const takers = [...best.entries()].filter(([id, b]) => id !== pid && b.x.tax && this.players.has(id));
      if (!p || inc <= 0 || !takers.length) continue;
      const take = Math.min(p.cash, Math.round(inc * Math.max(...takers.map(([, b]) => b.x.tax))));
      p.cash -= take;
      for (const [id] of takers) got.set(id, (got.get(id) || 0) + take / takers.length);
    }
    for (const [pid, { t, x }] of best) {
      const p = this.players.get(pid);
      if (!p) continue;
      let v = Math.round(got.get(pid) || 0);
      v += Math.round(Math.min(Math.max(0, p.cash + v), x.cap) * x.pension);
      if (p.cash + v < x.min) v = x.min - p.cash;
      if (v <= 0) continue;
      p.cash += v;
      this.events.push({ k: 'income', id: t.id, owner: pid, v, x: t.x, z: t.z });
    }
  }
}
