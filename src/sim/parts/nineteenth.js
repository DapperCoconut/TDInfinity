// Wave 19 towers (nineteenthtowers.js): troop swings (Berserker Lifesteal and specials, Knight
// Multi-Attack, Dreamknight magic, Golem Supercharge), the Siphoner's growing siphon, the
// Dreamknight's Eldritch Blast and the TimeBender's abilities.
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { TOWERS, canHit, rootType } from '../../config.js';
import { r2 } from './shared.js';

const NEAR = { hidden: true, flying: false, lead: true }; // area swings: every zombie on the ground
const near = (a, b, r) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2 <= r * r;

export class SimNineteenth {

  // ---------------------------------------------------------------- every tick

  /** Soulrot poison, Malefice stacks wearing off, Berserker ability timers, troop Supercharge health. */
  x19Tick(dt) {
    let rot = false;
    for (const e of this.enemies.values()) {
      if (e.malT > 0) e.malT -= dt;
      if (e.rotT > 0) rot = true;
    }
    if (rot) this.tickRot(dt);
    const wave = this.wave.state === 'wave';
    for (const u of this.units.values()) {
      const d = u.def;
      if (!d.x19) continue;
      if (wave) for (const k of ['savT', 'leapT', 'whirlT']) if (u[k] > 0) u[k] -= dt;
      // Supercharge unitHp: more max health for the troops of a supercharged barracks.
      const t = this.towers.get(u.tower);
      const add = (TOWERS[t?.type]?.supercharge?.unitHp || 0) * (t?.sc || 0);
      if (add !== (u.scHp || 0)) {
        const diff = add - (u.scHp || 0);
        u.maxHp += diff;
        u.hp = Math.max(1, u.hp + diff);
        u.scHp = add;
      }
    }
  }

  /** Siphoner Soulrot: poison that grows with every siphon. */
  tickRot(dt) {
    this.dot = true;
    try {
      for (const e of [...this.enemies.values()]) {
        if (!(e.rotT > 0)) continue;
        e.rotT -= dt;
        this.damage(this.towers.get(e.rotBy) ?? null, e, e.rotDps * dt);
      }
    } finally {
      this.dot = false;
    }
  }

  // ---------------------------------------------------------------- troop swings

  /**
   * A wave 19 troop's swing at `e` (u.def.x19): Golem Supercharge damage, Berserker Savage Strike /
   * Ferocious Leap / Whirlwind, Knight Multi-Attack, Dreamknight magic, Berserker Lifesteal.
   */
  swing19(u, tower, e, dmg, kind) {
    const d = u.def;
    const sc = tower ? TOWERS[tower.type]?.supercharge : null;
    if (sc?.unitDmg && tower.sc) dmg += sc.unitDmg * tower.sc; // Golem Supercharge
    let dealt = 0;
    const hit = (o, amt) => {
      if (!this.enemies.has(o.id)) return;
      const before = o.hp;
      if (d.magic) this.magicHit(tower, o, amt);
      else this.damage(tower, o, amt, false, kind);
      dealt += Math.max(0, Math.min(amt, before));
    };
    const around = (x, z, r) => [...this.enemies.values()].filter((o) => canHit(NEAR, o) && !o.flying && near(o, { x, z }, r));
    const fx = (text, color) => this.events.push({ k: 'chaos', x: r2(u.x), z: r2(u.z), text, color });
    let amt = dmg;
    if (d.savage && !(u.savT > 0)) {
      // Savage Strike: this swing hits much harder.
      u.savT = d.savage.every;
      amt = dmg * d.savage.mult;
      fx('🪓 Savage Strike!', '#ff5252');
    }
    hit(e, amt);
    if (d.multi19 && Math.random() < d.multi19) {
      // Knight Multi-Attack: hits twice, then sweeps the zombies near it.
      hit(e, dmg);
      for (const o of around(e.x, e.z, 3)) hit(o, dmg);
      this.events.push({ k: 'fx17', f: 'pulse', x: r2(e.x), z: r2(e.z), r: 3, c: 0xe3f2fd });
    }
    if (d.leap && !(u.leapT > 0)) {
      // Ferocious Leap: crushes every zombie near its target.
      u.leapT = d.leap.every;
      for (const o of around(e.x, e.z, d.leap.radius)) hit(o, dmg * d.leap.mult);
      this.events.push({ k: 'fx17', f: 'pulse', x: r2(e.x), z: r2(e.z), r: d.leap.radius, c: 0xb71c1c });
      fx('Ferocious Leap!', '#ff1744');
    }
    if (d.whirl && !(u.whirlT > 0)) {
      // Whirlwind: half damage to every zombie near him.
      u.whirlT = d.whirl.every;
      for (const o of around(u.x, u.z, d.whirl.radius)) hit(o, dmg * d.whirl.mult);
      this.events.push({ k: 'fx17', f: 'pulse', x: r2(u.x), z: r2(u.z), r: d.whirl.radius, c: 0xd50000 });
      fx('🌀 Whirlwind!', '#ff8a80');
    }
    if (d.lifesteal && dealt > 0) u.hp = Math.min(u.maxHp, u.hp + dealt * d.lifesteal);
  }

  // ---------------------------------------------------------------- tower attacks

  /** A wave 19 tower's own attack at `target` (s.hit19). */
  fire19(t, def, s, target) {
    if (s.hit19 === 'eldritch') {
      // Dreamknight Eldritch Blast: one magic blast, flyers too.
      this.events.push({ k: 'fx17', f: 'beam', t: t.id, x: r2(target.x), z: r2(target.z), c: 0x7c4dff });
      this.magicHit(t, target, s.damage);
      return;
    }
    // Siphoner: a magic siphon that grows stronger every time.
    const dmg = s.damage + (t.thirst || 0);
    this.events.push({ k: 'fx17', f: 'beam', t: t.id, x: r2(target.x), z: r2(target.z), c: 0xd50000 });
    this.magicHit(t, target, dmg);
    if (s.thirst) {
      const th = s.thirst;
      const max = th.max + (def.supercharge?.thirstMax || 0) * (t.sc || 0);
      t.thirst = (t.thirst || 0) + Math.min(max, Math.max(th.min, dmg * th.pct));
    }
    if (s.leech) {
      // Leech: troops near it heal a share of the damage.
      const heal = Math.min(s.leech.max, Math.max(s.leech.min, dmg * s.leech.pct));
      for (const u of this.units.values()) if (u.hp > 0 && u.def.guard && near(u, t, s.range)) u.hp = Math.min(u.maxHp, u.hp + heal);
    }
    if (!this.enemies.has(target.id)) return this.danse(s);
    if (s.rot) {
      // Soulrot: poison; a new siphon on a poisoned zombie makes it stronger and longer.
      if (target.rotT > 0) {
        target.rotDps += s.rot.add;
        target.rotT += s.rot.addT;
      } else {
        target.rotDps = s.rot.dps;
        target.rotT = s.rot.time;
      }
      target.rotBy = t.id;
    }
    if (s.malefice) {
      // Malefice Animus: a slow that grows by 1% with each siphon.
      const m = s.malefice;
      target.malN = target.malT > 0 ? (target.malN || 0) + 1 : 0;
      target.malT = m.time;
      this.applySlime(target, { slow: Math.min(m.max, m.slow + m.add * target.malN), time: m.time, boss: 0.5 });
    }
    this.danse(s);
  }

  /** Siphoner Danse Macabre: by chance, a fallen troop of some barracks on the map comes back. */
  danse(s) {
    if (!s.danse || Math.random() >= s.danse) return;
    const list = [];
    for (const o of this.towers.values()) {
      const lv = TOWERS[o.type].levels[o.level];
      if (!lv.unit?.guard || o.hp <= 0) continue;
      if (this.unitsOf(o.id).length < (lv.maxUnits || 1)) list.push([o, lv]);
    }
    if (!list.length) return;
    const [o, lv] = list[Math.floor(Math.random() * list.length)];
    const u = this.spawnGuard(o, lv.unit);
    this.events.push({ k: 'chaos', x: r2(u.x), z: r2(u.z), text: '💀 Danse Macabre!', color: '#ff5252' });
  }

  // ---------------------------------------------------------------- TimeBender

  use19(t, s, ab) {
    const fx = (text, x = t.x, z = t.z) => this.events.push({ k: 'chaos', x: r2(x), z: r2(z), text, color: '#b388ff' });
    const retry = () => {
      t.cd[ab.key] = 1; // nothing to use it on: try again soon
    };
    const det = this.detects(t, s);
    // Zombies in range it may bend (no bosses), closest to the base first.
    const lesser = (o = {}) => [...this.enemies.values()]
      .filter((e) => !e.boss && canHit(det, e) && near(e, t, s.range) && !(o.free && e.holdT > 0))
      .sort((a, b) => b.dist - a.dist);
    switch (ab.key) {
      case 'fabricate': {
        // Fabricate Epochs: the tower in range that would gain the most.
        const ult = TOWERS[t.type].ult ?? Infinity;
        let best = null;
        let bestScore = 0;
        for (const o of this.towers.values()) {
          if (o === t || o.hp <= 0 || rootType(o.type) === 'timeBender' || !near(o, t, s.range)) continue;
          const od = TOWERS[o.type];
          const lv = od.levels[o.level];
          let score = 0;
          if (od.kind === 'spawner' || lv.guard18) {
            const guards = lv.unit?.guard;
            if (!guards || this.unitsOf(o.id).length < (lv.maxUnits || 1)) score = (o.spawnT || 0) - 1;
          } else for (const a of lv.abilities ?? []) if (a.cooldown < ult) score += o.cd[a.key] || 0;
          if (score > bestScore) {
            best = o;
            bestScore = score;
          }
        }
        if (!best) return retry();
        const od = TOWERS[best.type];
        const lv = od.levels[best.level];
        if (od.kind === 'spawner' || lv.guard18) best.spawnT = Math.min(best.spawnT, 1);
        else for (const a of lv.abilities ?? []) if (a.cooldown < ult) best.cd[a.key] = 0;
        this.events.push({ k: 'fx17', f: 'beam', t: t.id, x: r2(best.x), z: r2(best.z), c: 0xb388ff });
        fx('⌛ Fabricate Epochs!', best.x, best.z);
        return;
      }
      case 'reverse': {
        // Reverse Timeline: back to a random spot between it and the start (Supercharge: more zombies).
        const sc = TOWERS[t.type].supercharge;
        const n = 1 + Math.min(sc?.reverseMax ?? 0, Math.floor((sc?.reverse || 0) * (t.sc || 0)));
        const list = lesser({ free: true }).slice(0, n);
        if (!list.length) return retry();
        for (const e of list) {
          this.events.push({ k: 'fx17', f: 'pulse', x: r2(e.x), z: r2(e.z), r: 1.5, c: 0xb388ff });
          e.dist = Math.random() * e.dist;
          e.ud = e.dist;
        }
        fx('⏪ Reverse Timeline!');
        return;
      }
      case 'stopTime': {
        // Stop Time: a 20s stun, or 20s more on a stun it already has.
        const e = lesser()[0];
        if (!e) return retry();
        this.stop({}, e, (e.stop > 0 && e.stopKind ? e.stop : 0) + ab.time, 'stun');
        this.events.push({ k: 'fx17', f: 'pulse', x: r2(e.x), z: r2(e.z), r: 2, c: 0xe1bee7 });
        fx('⏸ Stop Time!', e.x, e.z);
        return;
      }
      case 'greaterWarp': {
        // Greater Time Warp: every tower but TimeBenders much faster; Mass Reversal sends zombies to the start.
        for (const o of this.towers.values()) {
          if (rootType(o.type) === 'timeBender') continue;
          o.warp = Math.max(o.warpT > 0 ? o.warp : 0, ab.haste);
          o.warpT = Math.max(o.warpT || 0, ab.duration);
        }
        const all = [...this.enemies.values()].filter((e) => !e.boss).sort((a, b) => b.dist - a.dist);
        const n = Math.min(all.length, ab.max, Math.max(ab.min, Math.round(all.length * ab.share)));
        for (const e of all.slice(0, n)) {
          e.dist = 0;
          e.ud = 0;
        }
        this.events.push({ k: 'fx17', f: 'pulse', x: r2(t.x), z: r2(t.z), r: s.range, c: 0xb388ff });
        fx('⌛ Greater Time Warp!');
        return;
      }
    }
  }
}
