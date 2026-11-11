// What enemies and bosses do, part 2: Hardcore and Expert attacks, and how bosses move (bossMove).
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { ENEMIES, GAME, TOWERS, rootType, towerCost } from '../../config.js';
import { canPlace } from '../map.js';
import { path, setTimeWorld } from '../path.js';
import { buffOf, r2 } from './shared.js';

export class SimEnemyMoves2 {

  // ---------------------------------------------------------------- Hardcore mode (2026-11-09 spec)

  /**
   * Hardcore abilities that run every tick (see hardcore.js): Drop Pods opening, Jammers, Dispensers,
   * Void Cultist beacons, the Crystalian's tank shell, the Grand Eye relaxing its defense, Soul
   * Stealer hiding, and the Void Reaver / Void Caster pair. Runs before the enemy moves this tick.
   * Returns 'gone' if the enemy left the map (a pod burst open).
   */
  hcAttacks(e, def, dt) {
    e.ageT = (e.ageT || 0) + dt;
    const pd = def.pod;
    if (pd && (e.podT -= dt) <= 0) {
      // A Drop Pod bursts open: out come its enemies, and the pod blows up.
      this.enemies.delete(e.id);
      let j = 0;
      for (const [type, n] of pd.list) for (let i = 0; i < n; i++, j++) this.reborn.push({ route: e.route, type, dist: Math.max(0, e.dist - j * 0.7), lateral: ((j % 3) - 1) * 1.2, hpScale: 1, from: e.type });
      this.events.push({ k: 'decay', e: e.id });
      this.events.push({ k: 'eBlast', x: r2(e.x), z: r2(e.z), r: 4, c: 0xd500f9 });
      return 'gone';
    }
    if (def.jam) this.weakenTowers(e.x, e.z, def.jam.radius, 0, 0.4); // Jammer: no abilities near it
    const dp = def.dispense;
    if (dp && !e.stop && (e.dispT = (e.dispT ?? dp.every) - dt) <= 0) {
      // Dispenser: the enemies around it get extra shield (never more than their max health).
      e.dispT = dp.every;
      for (const o of this.enemies.values()) {
        if (o === e || o.remains || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > dp.radius * dp.radius) continue;
        o.osh = Math.min(o.maxHp, (o.osh || 0) + dp.shield + o.maxHp * dp.pct);
        o.oshMax = Math.max(o.oshMax || 0, o.osh);
      }
      this.events.push({ k: 'dHeal', x: r2(e.x), z: r2(e.z), r: dp.radius });
    }
    const bc = def.beacon;
    if (bc && !e.stop && (e.beaconT = (e.beaconT ?? bc.every * 0.5) - dt) <= 0) {
      // Void Cultist: a Healing Beacon on the ground heals the enemies standing in it.
      e.beaconT = bc.every;
      this.zones.push({ kind: 'heal', x: e.x, z: e.z, r: bc.radius, left: bc.life, speed: 0, heal: bc.heal, by: e.id });
      this.events.push({ k: 'trail', x: r2(e.x), z: r2(e.z), r: bc.radius, life: bc.life, c: bc.color });
    }
    if (def.tank) {
      // Crystalian: every hit does 1 damage, except while it's attacking (crystalLaser opens it up).
      if (e.openT > 0) e.openT = Math.max(0, e.openT - dt);
      e.pure = !(e.openT > 0);
    }
    if (def.relax && e.ageT >= def.relax.after && !e.relaxed) {
      e.relaxed = true;
      e.defense = def.relax.defense; // Grand Eye: 40 defense when it spawns, then 15
    }
    if (e.hideT > 0 && (e.hideT -= dt) <= 0) {
      e.cloak = false; // Soul Stealer: visible again
      e.hidden = !!def.hidden;
    }
    if (e.harvestT > 0) {
      e.harvestT -= dt; // Emperor's Harvest: heals while the beams are in
      e.hp = Math.min(e.maxHp, e.hp + e.harvestHeal * dt);
    }
    if (e.ruptT > 0 && (e.ruptT -= dt) <= 0) {
      // Void Rupture: the giant circular slash, unless enough damage stopped the charge.
      const m = def.vb.rupture;
      const taken = e.ruptHp - (e.hp + (e.osh || 0));
      if (taken >= m.cancel) this.events.push({ k: 'hcMove', e: e.id, key: 'ruptureCancel', x: r2(e.x), z: r2(e.z) });
      else {
        const n = this.hexTowers(e.x, e.z, 1e5, 'stun', m.bigStun, true);
        this.hurtUnits(m.unitDmg);
        this.events.push({ k: 'hcMove', e: e.id, key: 'ruptureSlash', x: r2(e.x), z: r2(e.z), n, stun: m.bigStun });
      }
    }
    if (def.pair || def.rageAt) this.hcPair(e, def, dt);
  }

  /**
   * The Void Reaver and Void Caster. The Reaver below `wrathAt` health: Void's Wrath (a short stop,
   * faster, Void Rupture unlocked, and the Caster appears). The Caster can't be targeted or hurt
   * while the Reaver stands. When the Reaver falls she revives him (`reviveTime` s, at `reviveHp`),
   * and she can be hit meanwhile. When she dies, he comes back at `deathwishHp` in Deathwish: very
   * fast, no abilities. He only dies for good once she's gone.
   */
  hcPair(e, def, dt) {
    if (def.rageAt && !e.raging && e.hp <= e.maxHp * def.rageAt) {
      e.raging = true; // Void Caster Rage: hood up, horns out, slower
      e.baseSpeed *= def.rageSpeed;
      this.events.push({ k: 'hcRage', e: e.id });
    }
    if (def.rageAt) {
      // The Caster: protected while her Reaver stands.
      const rv = this.enemies.get(e.owner);
      e.noTarget = !!(rv && !(rv.downT > 0) && !rv.deathwish);
      return;
    }
    const pr = def.pair;
    if (!e.wrath && e.hp <= e.maxHp * pr.wrathAt) this.reaverWrath(e, pr);
    if (e.downT > 0) {
      e.speed = 0;
      if ((e.downT -= dt) <= 0) {
        // Revived by the Caster.
        e.downT = 0;
        e.noTarget = false;
        e.hp = Math.min(e.maxHp, pr.reviveHp);
        this.events.push({ k: 'hcRevive', e: e.id });
      }
    }
    if (e.deathwish && !e.stop) e.speed = pr.deathwishSpeed; // Deathwish: runs for the base
  }

  /** Void Reaver Void's Wrath: stops for a moment, rips off its mask, gets faster and calls the Void Caster. */
  reaverWrath(e, pr) {
    e.wrath = true;
    e.shutT = Math.max(e.shutT || 0, 2);
    e.baseSpeed *= pr.wrathSpeed;
    if (!this.casterOf(e)) this.reborn.push({ route: e.route, type: pr.caster, dist: Math.max(0, e.dist - 4), lateral: 3, hpScale: 1, owner: e.id, from: e.type });
    this.events.push({ k: 'hcWrath', e: e.id });
  }

  /** The Void Caster protecting Void Reaver `e` (alive, or about to spawn), or null. */
  casterOf(e) {
    const type = ENEMIES[e.type].pair.caster;
    for (const o of this.enemies.values()) if (o.owner === e.id && o.type === type) return o;
    return this.reborn.find((r) => r.owner === e.id && r.type === type) ?? null;
  }

  /**
   * Called when a Hardcore pair boss runs out of health. Returns true if it doesn't die (the
   * Reaver is downed for the Caster to revive, or comes back in Deathwish when she falls).
   */
  pairDeath(e, def) {
    if (def.pair && !e.deathwish) {
      if (!e.wrath) this.reaverWrath(e, def.pair); // killed in one go: she still comes
      e.hp = 1;
      if (e.downT > 0) return true;
      e.downT = def.pair.reviveTime;
      e.noTarget = true;
      for (const t of this.towers.values()) if (t.curseBy === e.id) t.curseBy = 0; // Void Judgement ends at 0 health
      this.events.push({ k: 'hcDown', e: e.id, t: def.pair.reviveTime });
      return true;
    }
    if (def.rageAt) {
      // The Caster falls: her Reaver instantly comes back in Deathwish.
      const rv = this.enemies.get(e.owner);
      if (rv && ENEMIES[rv.type].pair) {
        const pr = ENEMIES[rv.type].pair;
        rv.downT = 0;
        rv.noTarget = false;
        rv.deathwish = true;
        rv.hp = Math.min(rv.maxHp, pr.deathwishHp);
        this.events.push({ k: 'hcDeathwish', e: rv.id });
      }
    }
    return false;
  }

  /** Demise's pink mist: towers within `r` of (x, z) drop one level (no refund). Returns how many. */
  downgradeTowers(x, z, r) {
    let n = 0;
    for (const t of this.towers.values()) {
      if (t.level <= 0 || t.holo || (t.x - x) ** 2 + (t.z - z) ** 2 > r * r || this.stealthy(t)) continue;
      if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) continue;
      const def = TOWERS[t.type];
      if (def.cross || !def.levels[t.level - 1]) continue; // crosspath towers keep their levels
      t.spent = Math.max(0, t.spent - (def.levels[t.level].cost ?? 0));
      t.level--;
      this.setTowerLevelHp(t);
      this.events.push({ k: 'hcDowngrade', id: t.id, x: r2(t.x), z: r2(t.z) });
      n++;
    }
    return n;
  }

  /** Puts `n` enemies of `type` next to enemy `e` (summons: no cash). */
  summonNear(e, type, n, spread = 1.5, extra = {}) {
    for (let i = 0; i < n; i++) this.reborn.push({ route: e.route, type, dist: Math.max(0, e.dist - 1.5 - i * spread), lateral: (i % 3 - 1) * 2, hpScale: 1, owner: e.id, noCash: true, ...extra });
  }

  /** Every working tower in a straight line ahead of `e` (see towersInLine) gets `fn(t)`. Returns how many. */
  lineHit(e, length, width, fn) {
    const list = this.towersInLine(e, length, width).filter((t) => !(buffOf(this.buffs, t.id).invuln || t.invulnT > 0));
    for (const t of list) fn(t);
    return list.length;
  }

  /** Towers deal `amt` less damage for `secs` s (the strongest weakness counts). */
  weakTower(t, amt, secs) {
    t.weakAmt = t.weakT > 0 ? Math.max(t.weakAmt, amt) : amt;
    t.weakT = Math.max(t.weakT || 0, secs);
  }

  /** Hardcore boss moves on their own timers (def.vb, see voidBoss). Returns false if it had nothing to do. */
  hcMove(e, k, m) {
    const ev = (extra) => this.events.push({ k: 'hcMove', e: e.id, key: k, x: r2(e.x), z: r2(e.z), ...extra });
    if (e.downT > 0 || e.deathwish || e.shutT > 0) return false; // downed, Deathwish or Void's Wrath: no abilities
    switch (k) {
      // ------------------------------------------------ Soul Stealer
      case 'curseTower': {
        const cursed = [...this.towers.values()].filter((t) => t.curseBy === e.id).length;
        if (cursed >= m.max) return false;
        const list = this.enemyTargets(e, m.range).filter((t) => !t.curseBy && !t.holo);
        if (!list.length) return false;
        const t = list[Math.floor(Math.random() * list.length)];
        t.curseBy = e.id;
        this.summonNear(e, m.soul, 1);
        ev({ tx: r2(t.x), tz: r2(t.z) });
        return true;
      }
      case 'soulSummon': {
        this.summonNear(e, m.souls, m.n);
        this.summonNear(e, m.eye, 1, 1, { lateral: 4 });
        e.hidden = e.cloak = true;
        e.hideT = m.hide;
        ev({ n: m.n });
        return true;
      }
      // ------------------------------------------------ Void Reaver
      case 'cursedBlade': {
        // A straight shockwave: towers it crosses deal less damage and lose range for a while.
        const n = this.lineHit(e, m.length, m.width, (t) => {
          this.weakTower(t, m.weak, m.time);
          t.smoke = Math.max(t.smoke, m.time);
        });
        this.summonNear(e, m.soul, m.souls, 1);
        ev({ len: m.length, dx: r2(e.dx), dz: r2(e.dz), n });
        return true;
      }
      case 'judgement': {
        // Six towers are cursed: they can't attack until the Reaver hits 0 health.
        const list = this.openTowers().filter((t) => !t.curseBy && !t.holo);
        if (!list.length) return false;
        const h = [];
        for (let i = 0; i < m.n && list.length; i++) {
          const t = list.splice(Math.floor(Math.random() * list.length), 1)[0];
          t.curseBy = e.id;
          h.push([r2(t.x), r2(t.z)]);
        }
        ev({ h });
        return true;
      }
      case 'unnervingGaze': {
        // Stabs the ground: three portals, a Void Eye from each.
        for (let i = 0; i < m.n; i++) this.reborn.push({ route: e.route, type: m.eye, dist: Math.max(0, e.dist - 2 - i * 3), lateral: (i - 1) * 4, hpScale: 1, owner: e.id, noCash: true });
        ev({ n: m.n });
        return true;
      }
      case 'rupture': {
        // Void Rupture (after Void's Wrath): three slashes stun towers near it, then it charges a
        // giant circular slash. Dealing `cancel` damage while it charges stops it.
        if (m.wrath && !e.wrath) return false;
        const n = this.hexTowers(e.x, e.z, m.range, 'stun', m.stun, true);
        e.ruptT = m.charge;
        e.ruptHp = e.hp + (e.osh || 0);
        e.shutT = Math.max(e.shutT || 0, m.charge);
        ev({ r: m.range, n, charge: m.charge, cancel: m.cancel });
        return true;
      }
      // ------------------------------------------------ Void Caster
      case 'casterShield': {
        const rv = this.enemies.get(e.owner);
        if (!rv || rv.downT > 0) return false;
        rv.osh = Math.max(rv.osh || 0, m.shield);
        rv.oshMax = Math.max(rv.oshMax || 0, rv.osh);
        rv.hp = Math.min(rv.maxHp, rv.hp + rv.maxHp * m.heal);
        ev({ tx: r2(rv.x), tz: r2(rv.z) });
        return true;
      }
      case 'casterPortal': {
        // A portal next to her spits out `n` enemies over `time` s.
        for (let i = 0; i < m.n; i++) {
          const type = m.list[Math.floor(Math.random() * m.list.length)];
          this.queue.push({ t: this.wave.t + 0.5 + (i * m.time) / m.n, type, dist: Math.max(0, e.dist - 2), noCash: true });
        }
        this.queue.sort((a, b) => a.t - b.t);
        this.wave.left = this.queue.length;
        ev({ n: m.n, time: m.time });
        return true;
      }
      // ------------------------------------------------ Emperor
      case 'finalEradication': {
        // Poleaxe slam: every unit is destroyed and every tower stunned.
        const n = this.hexTowers(e.x, e.z, 1e5, 'stun', m.stun, true);
        const u = this.units.size;
        for (const x of [...this.units.values()]) this.destroyUnit(x, this.towers.get(x.tower) ?? null);
        ev({ n, u });
        return true;
      }
      case 'chronoStasis': {
        // Time slows to a crawl (towers nearly stop), an orb hits the base, and he leaps ahead untouchable.
        this.slowTowers(e.x, e.z, 1e5, m.slow, m.time, false);
        e.invulnT = Math.max(e.invulnT || 0, m.time);
        e.dist = Math.min(path.length - 3, e.dist + m.leap);
        this.baseHp = Math.max(1, this.baseHp - m.baseDmg); // (it can't end the game on its own)
        ev({ time: m.time, d: m.baseDmg });
        return true;
      }
      case 'encore': {
        let j = 0;
        for (const [type, n] of m.list) for (let i = 0; i < n; i++, j++) this.reborn.push({ route: e.route, type, dist: Math.max(0, e.dist - 3 - j * 1.2), lateral: ((j % 3) - 1) * 3, hpScale: 1, owner: e.id, noCash: true, from: e.type });
        ev({ n: j });
        return true;
      }
      case 'divineProtection': {
        e.osh = Math.min(m.max, (e.osh || 0) + m.shield);
        e.oshMax = Math.max(e.oshMax || 0, e.osh);
        for (const x of [...this.units.values()]) if ((x.x - e.x) ** 2 + (x.z - e.z) ** 2 <= m.units * m.units) this.destroyUnit(x, this.towers.get(x.tower) ?? null);
        const n = this.slowTowers(e.x, e.z, m.range, m.slow, m.time);
        ev({ r: m.range, n });
        return true;
      }
      case 'meteoricSwarm': {
        const list = this.openTowers();
        if (!list.length) return false;
        const h = [];
        for (let i = 0; i < m.n; i++) {
          const t = list[Math.floor(Math.random() * list.length)];
          const x = t.x + (Math.random() - 0.5) * 3;
          const z = t.z + (Math.random() - 0.5) * 3;
          const d = 1.2 + Math.random() * 1.5;
          this.axes.push({ x, z, left: d, r: m.radius, stun: m.stun, dmg: m.dmg, kind: 'missile' });
          h.push([r2(x), r2(z), r2(d)]);
        }
        ev({ h, r: m.radius });
        return true;
      }
      case 'corruptingBlast': {
        // Takes over towers for a while (they can't fight) and destroys a few units.
        const list = this.openTowers().filter((t) => !t.holo && TOWERS[t.type].kind !== 'income');
        if (!list.length) return false;
        const h = [];
        for (let i = 0; i < m.n && list.length; i++) {
          const t = list.splice(Math.floor(Math.random() * list.length), 1)[0];
          if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) continue;
          t.bleedT = Math.max(t.bleedT || 0, m.time);
          h.push([r2(t.x), r2(t.z)]);
        }
        const units = [...this.units.values()];
        for (let i = 0; i < m.units && units.length; i++) {
          const u = units.splice(Math.floor(Math.random() * units.length), 1)[0];
          this.destroyUnit(u, this.towers.get(u.tower) ?? null);
        }
        ev({ h, time: m.time });
        return true;
      }
      case 'harvest': {
        // Beams into up to `n` towers: damage and less range, while he heals.
        const list = this.openTowers();
        if (!list.length) return false;
        list.sort((a, b) => b.spent - a.spent || a.id - b.id);
        const hit = list.slice(0, m.n);
        for (const t of hit) {
          this.hurtTower(t, m.dmg, true);
          t.smoke = Math.max(t.smoke, m.smoke);
        }
        e.harvestT = m.time;
        e.harvestHeal = m.heal;
        ev({ h: hit.map((t) => [r2(t.x), r2(t.z)]) });
        return true;
      }
      case 'execution': {
        // A slap that instantly knocks out a pricey tower close by, shields or not.
        const list = this.enemyTargets(e, m.range).filter((t) => t.spent >= m.min && !t.holo);
        if (!list.length) return false;
        list.sort((a, b) => b.spent - a.spent);
        const t = list[0];
        if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) return false;
        if (t.shieldHp) t.shieldHp = 0;
        this.knockOut(t);
        ev({ tx: r2(t.x), tz: r2(t.z) });
        return true;
      }
      case 'overdrive': {
        e.dist = Math.min(path.length - 3, e.dist + m.dist); // Nova's Overdrive: glides ahead
        ev({});
        return true;
      }
    }
    return false;
  }

  /** Insane mode trails and smoke fade away. Hardcore healing beacons heal the enemies in them. */
  updateZones(dt) {
    if (!this.zones.length) return;
    for (const z of this.zones) {
      if (z.kind !== 'heal') continue;
      for (const o of this.enemies.values()) {
        if (o.remains || o.hp >= o.maxHp || (o.x - z.x) ** 2 + (o.z - z.z) ** 2 > z.r * z.r) continue;
        o.hp = Math.min(o.maxHp, o.hp + z.heal * dt);
      }
    }
    this.zones = this.zones.filter((z) => (z.left -= dt) > 0);
  }

  /** Beholder time bombs tick down; one that runs out blows up its tower (and those around it). */
  updateBombs(dt) {
    if (!this.bombs.length) return;
    this.bombs = this.bombs.filter((b) => {
      if (!this.towers.has(b.tower)) {
        this.events.push({ k: 'defused', id: b.id, x: r2(b.x), z: r2(b.z), quiet: 1 }); // its tower was sold
        return false;
      }
      if ((b.left -= dt) > 0) return true;
      this.hurtTowers(b.x, b.z, b.r, b.dmg);
      this.events.push({ k: 'tbBoom', id: b.id, x: r2(b.x), z: r2(b.z), r: b.r });
      return false;
    });
  }

  /**
   * The Beholder, low on health, pulls everyone into the time dimension: every tower is sold (its
   * owner gets the usual sell value), every other enemy is left behind, and the map becomes one
   * long straight path. The Beholder starts again from the entrance with its sword drawn, and
   * waits a few seconds so players can build again.
   */
  timeShift(boss) {
    this.shiftBoss = null;
    const sh = ENEMIES[boss.type].shift;
    for (const t of [...this.towers.values()]) {
      // Expert Beholder's Field: towers are refunded (`refund` of what they cost).
      const value = t.holo ? 0 : sh.refund != null ? Math.floor(t.spent * sh.refund) : Math.floor(t.spent * (TOWERS[t.type].sellRatio ?? GAME.sellRatio) * (1 + buffOf(this.buffs, t.id).sell));
      const p = this.players.get(t.owner);
      if (p) p.cash += value;
      this.removeTower(t, 'sell', { value });
    }
    for (const e of this.enemies.values()) this.events.push({ k: 'decay', e: e.id });
    this.enemies.clear();
    this.units.clear();
    this.traps.clear();
    this.queue = [];
    this.wave.left = 0;
    this.zones = [];
    this.puddles = [];
    this.axes = [];
    this.bombs = [];
    this.shells = [];
    this.flights = [];
    this.blades = [];
    this.rings = [];
    this.sweeps = [];
    this.reborn = [];
    this.holos = [];
    this.timeWorld = true;
    setTimeWorld(true);
    const e = this.spawn(sh.into ?? 'beholderTime', { dist: 0 });
    e.maxHp = boss.maxHp;
    e.hp = sh.heal ? e.maxHp : Math.max(boss.hp, boss.maxHp * sh.at * 0.5); // a lucky overkill still leaves a fight
    if (sh.heal) e.shutT = 8; // (Expert enemies don't use the Insane speed rules that read waitT)
    else e.waitT = 8;
    this.events.push({ k: 'timeShift', e: e.id, wait: 8, into: sh.into ?? 'beholderTime' });
  }

  /**
   * Hardcore: the Beholder was beaten in its Field. Everyone goes back to the real map: towers built
   * in the Field are refunded in full (they wouldn't fit the real map), and the next break is longer.
   */
  endTimeShift() {
    if (!this.timeWorld) return;
    for (const t of [...this.towers.values()]) {
      const value = t.holo ? 0 : Math.floor(t.spent);
      const p = this.players.get(t.owner);
      if (p) p.cash += value;
      this.removeTower(t, 'sell', { value });
    }
    this.units.clear();
    this.traps.clear();
    this.timeWorld = false;
    setTimeWorld(false);
    this.breakBonus = 20;
    this.events.push({ k: 'timeShiftEnd' });
  }

  /** Rebirther Blood Sacrifice: selling a tower hurts it (by `sellDmg` x what was spent on the tower). */
  sellSacrifice(t) {
    for (const e of [...this.enemies.values()]) {
      if (!e.sacrificing) continue;
      const dmg = Math.round(t.spent * ENEMIES[e.type].sacrifice.sellDmg);
      if (!(dmg > 0)) continue;
      this.events.push({ k: 'xSellHit', e: e.id, x: r2(e.x), z: r2(e.z), d: dmg });
      this.bloodPass = true;
      try {
        this.damage(null, e, dmg, true, 'none');
      } finally {
        this.bloodPass = false;
      }
    }
  }

  /** Every working tower enemies can target, anywhere on the map (Scarecrows don't draw these attacks). */
  openTowers() {
    return [...this.towers.values()].filter((t) => t.hp > 0 && !this.stealthy(t));
  }

  /**
   * Expert mode enemy abilities (see the Expert mode comment in ENEMIES): Taint poison smog, and the
   * Overlord's stomp, scepter beam and one-time missile barrage.
   */
  expertAttacks(e, def, dt) {
    const sg = def.smog;
    if (sg && (e.smogT -= dt) <= 0) {
      // The cloud is left behind even while it's stunned; it hurts towers, never enemies.
      e.smogT = sg.every;
      this.puddles.push({ x: e.x, z: e.z, r: sg.radius, dps: sg.dps, left: sg.life });
      this.events.push({ k: 'smog', x: r2(e.x), z: r2(e.z), r: sg.radius, life: sg.life });
    }
    const bg = def.barrage;
    if (bg && !e.barraged && e.hp <= e.maxHp * bg.at) {
      // Once: missiles fall from the sky on random towers all over the map.
      e.barraged = true;
      const list = this.openTowers();
      const hits = [];
      for (let i = 0; i < bg.n && list.length; i++) {
        const t = list[i < list.length ? i : Math.floor(Math.random() * list.length)];
        const x = t.x + (i < list.length ? 0 : (Math.random() - 0.5) * 6);
        const z = t.z + (i < list.length ? 0 : (Math.random() - 0.5) * 6);
        const d = bg.flight + Math.random() * 1.5;
        this.axes.push({ x, z, left: d, r: bg.radius, stun: 0, dmg: bg.dmg, kind: 'missile' });
        hits.push([r2(x), r2(z), r2(d)]);
      }
      this.events.push({ k: 'barrage', e: e.id, h: hits, r: bg.radius });
    }
    if (e.stop) return; // frozen or stunned enemies don't attack
    const st = def.stomp;
    if (st && (e.stompT -= dt) <= 0) {
      if (this.enemyTargets(e, st.range).length) {
        e.stompT = st.every;
        this.hurtTowers(e.x, e.z, st.range, st.dmg, true);
        this.events.push({ k: 'stomp', e: e.id, x: r2(e.x), z: r2(e.z), r: st.range });
      } else e.stompT = 0.5;
    }
    const bm = def.beam;
    if (bm && (e.beamT -= dt) <= 0) {
      const list = this.openTowers();
      if (list.length) {
        e.beamT = bm.every;
        for (const t of list) this.hurtTowers(t.x, t.z, 0.01, bm.dmg, true);
        this.events.push({ k: 'oBeam', e: e.id, h: list.map((t) => [r2(t.x), r2(t.z)]) });
      } else e.beamT = 1;
    }
  }

  /**
   * Expert mode (2026-11-09 spec): Time Runner dashes, the Rebirther's Blood Sacrifice, the Death
   * Angel drawing its staff, and the boss moves (`moves`): every `every` s a boss picks one of its
   * moves at random (by weight `w`). Rebirther: Violet Call, Blood Rain, Ritual. Death Angel:
   * Twirl, Blood Assembly, Pure Pain. Beholder: Time Snap, Reality Tear, Time Paradox.
   */
  expertMoves(e, def, dt) {
    const sp = def.sprint;
    if (sp && !e.stop && (e.sprintT -= dt) <= 0) {
      e.sprintT = sp.every;
      e.sprinting = sp.time;
      this.events.push({ k: 'dash', e: e.id });
      if (sp.stun) {
        // Hardcore Skeleton Rogues: the sword swing that starts the dash stuns the towers around it.
        const n = this.hexTowers(e.x, e.z, sp.stun.range, 'stun', sp.stun.time, true);
        if (n) this.events.push({ k: 'slam', e: e.id, x: r2(e.x), z: r2(e.z), r: sp.stun.range, n, name: def.name, c: 0x64b5f6 });
      }
    }
    const sac = def.sacrifice;
    if (sac && !e.sacrificing && e.hp <= e.maxHp * sac.at) {
      // Blood Sacrifice: sits down in its blood bowl for good and shrugs off almost everything.
      e.sacrificing = true;
      e.baseSpeed = 0;
      this.events.push({ k: 'xSacrifice', e: e.id, x: r2(e.x), z: r2(e.z) });
    }
    const un = def.unsheathe;
    if (un && !e.unsheathed) {
      if (e.hp > e.maxHp * un.at) return;
      // Death Angel: flies up and draws its staff; from now on it attacks.
      e.unsheathed = true;
      e.shutT = Math.max(e.shutT || 0, un.time);
      e.moveT = Math.max(e.moveT, un.time + 1);
      this.events.push({ k: 'xUnsheathe', e: e.id });
    }
    const mv = def.moves;
    if (!mv || e.noMoves || e.stop || e.shutT > 0 || e.tauntT > 0 || (e.moveT -= dt) > 0) return;
    // Time Paradox: never the first move, and at least `gap` other moves between two of them.
    // Insane `once` moves (Berserker Hammer Smash) are used one time only, even after a shield breaks.
    const list = mv.list.filter((m) => (m.key !== 'timeParadox' || (e.movesDone > 0 && e.sinceParadox >= (m.gap ?? 3))) && !(m.once && e.carry[m.key]));
    if (!list.length) {
      e.moveT = 1e9;
      return;
    }
    let roll = Math.random() * list.reduce((n, m) => n + (m.w ?? 1), 0);
    const m = list.find((x) => (roll -= x.w ?? 1) <= 0) ?? list[0];
    if (!this.bossMove(e, m)) {
      e.moveT = 0.5; // nothing to hit yet
      return;
    }
    e.moveT = mv.every * (e.despair ? 0.6 : 1); // Overlord Despair: attacks more often
    if (m.once) e.carry[m.key] = true;
    e.movesDone++;
    e.sinceParadox = m.key === 'timeParadox' ? 0 : e.sinceParadox + 1;
  }

  // ---------------------------------------------------------------- Insane mode (2026-11-09 spec)

  /**
   * Insane mode abilities that change how an enemy moves (runs before it moves this tick): Field
   * Medic / Mothership heal pulses, the Engineer building its MK11-Device and waiting by it, the
   * Overlord's Taunt, Backup (Amplifiers) and Despair, and The Vanguard's Hammer Throw.
   */
  insanePace(e, def, dt) {
    if (e.speedBoost) e.speed *= e.speedBoost; // Hammer Throw, Despair
    const hp = def.healPulse;
    if (hp && !e.stop && (e.healT -= dt) <= 0) {
      e.healT = hp.every;
      let n = 0;
      for (const o of this.enemies.values()) {
        const top = o.maxHp * (hp.over ?? 1);
        if (o === e || o.remains || o.hp >= top || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > hp.radius * hp.radius) continue;
        o.hp = Math.min(top, o.hp + (hp.pct ? o.maxHp * hp.pct : hp.hp));
        n++;
      }
      if (n) this.events.push({ k: 'dHeal', x: r2(e.x), z: r2(e.z), r: hp.radius });
    }
    const bd = def.build;
    if (bd) {
      if (e.buildT > 0 && !e.stop && (e.buildT -= dt) <= 0) {
        // Engineer: builds an MK11-Device right ahead of itself, then waits by it.
        e.carry.built = true;
        e.building = true;
        this.reborn.push({ route: e.route, type: bd.type, dist: e.dist + 2, lateral: e.lateral, hpScale: 1, owner: e.id, buildOf: e.carry, from: e.type });
        this.events.push({ k: 'iBuild', e: e.id, x: r2(e.x), z: r2(e.z) });
      }
      if (e.carry.built && e.building !== false) {
        // It stands still until its device is destroyed (the shield form's device counts too).
        let alive = false;
        for (const o of this.enemies.values()) if (o.buildOf === e.carry) alive = true;
        for (const r of this.reborn) if (r.buildOf === e.carry) alive = true;
        e.building = alive;
      }
      if (e.building) e.speed = 0;
    }
    if (def.taunt && e.tauntT > 0) {
      e.tauntT = Math.max(0, e.tauntT - dt);
      e.speed = 0;
    }
    const bk = def.backup;
    if (bk && !e.backedUp && e.hp <= e.maxHp * bk.at) {
      // Overlord Backup: two Amplifiers appear beside him and keep healing him.
      e.backedUp = true;
      for (let i = 0; i < bk.n; i++) this.reborn.push({ route: e.route, type: bk.type, dist: Math.max(0, e.dist - 2), lateral: (i % 2 ? 1 : -1) * 4, hpScale: 1, owner: e.id, from: e.type });
      this.events.push({ k: 'iBackup', e: e.id, n: bk.n });
    }
    const ds = def.despair;
    if (ds && e.backedUp && !e.despair) {
      let amps = 0;
      for (const o of this.enemies.values()) if (o.owner === e.id && o.type === bk.type) amps++;
      for (const r of this.reborn) if (r.owner === e.id && r.type === bk.type) amps++;
      if (!amps) {
        // Despair: much faster and tougher, and Vengeful Champions come out of the entrance.
        e.despair = true;
        e.speedBoost = ds.speed;
        e.carry.defense = ds.defense;
        e.carry.maxHit = ds.maxHit;
        for (let i = 0; i < ds.n; i++) this.reborn.push({ type: ds.summon, dist: 0, lateral: (i - (ds.n - 1) / 2) * 2, hpScale: 1 });
        this.events.push({ k: 'iDespair', e: e.id });
      }
    }
    const th = def.throwAt;
    if (th && !e.carry.thrown && e.hp <= e.maxHp * th.at) {
      // The Vanguard throws its hammer away: runs faster, but no more abilities.
      e.carry.thrown = true;
      e.speedBoost = th.speed;
      e.noMoves = true;
      this.events.push({ k: 'iThrow', e: e.id, x: r2(e.x), z: r2(e.z) });
    }
  }

  /** Towers `e` could hit in a line `length` long and `width` wide, straight ahead along the path. */
  towersInLine(e, length, width) {
    return this.openTowers().filter((t) => {
      const ax = t.x - e.x;
      const az = t.z - e.z;
      const along = ax * e.dx + az * e.dz;
      const side = Math.abs(ax * e.dz - az * e.dx);
      return along >= -1 && along <= length && side <= width;
    });
  }

  /** Stuns tower `t` (and anything within `r` of it) for `secs` s; returns how many were stunned. */
  stunAt(t, r, secs) {
    return this.hexTowers(t.x, t.z, Math.max(0.01, r), 'stun', secs, true);
  }

  /** Boss move `m` of enemy `e` (see expertMoves). Returns false if it had nothing to do. */
  bossMove(e, m) {
    const ev = (extra) => this.events.push({ k: 'xMove', e: e.id, key: m.key, x: r2(e.x), z: r2(e.z), ...extra });
    switch (m.key) {
      case 'violetCall': {
        // Rebirther: Scarlets step out next to it (they still give cash).
        for (let i = 0; i < m.n; i++) this.reborn.push({ route: e.route, type: m.summon, dist: Math.max(0, e.dist - 1.5 - i * 1.5), lateral: (i - (m.n - 1) / 2) * 2, hpScale: 1, owner: e.id });
        ev({ n: m.n });
        return true;
      }
      case 'bloodRain': {
        // Rebirther: a drop of blood on every tower: a little damage and a stun.
        const list = this.openTowers();
        if (!list.length) return false;
        for (const t of list) this.hurtTower(t, m.dmg, true);
        const n = this.hexTowers(e.x, e.z, 1e5, 'stun', m.stun, true);
        ev({ n, h: list.map((t) => [r2(t.x), r2(t.z)]) });
        return true;
      }
      case 'ritual': {
        // Rebirther: kills one tower.
        const list = this.openTowers();
        if (!list.length) return false;
        const t = list[Math.floor(Math.random() * list.length)];
        if (t.shieldHp) t.shieldHp = 0;
        this.knockOut(t);
        ev({ tx: r2(t.x), tz: r2(t.z), id: t.id });
        return true;
      }
      case 'twirl': {
        // Death Angel: spins, a shockwave that hurts and stuns the towers around it.
        if (!this.enemyTargets(e, m.range).length) return false;
        this.hurtTowers(e.x, e.z, m.range, m.dmg, true);
        const n = this.hexTowers(e.x, e.z, m.range, 'stun', m.stun, true);
        ev({ r: m.range, n });
        return true;
      }
      case 'bloodAssembly': {
        // Death Angel: blood orbs drop on random towers, hurting them and the towers next to them.
        const list = this.openTowers();
        if (!list.length) return false;
        const h = [];
        for (let i = 0; i < m.n; i++) {
          const t = list[Math.floor(Math.random() * list.length)];
          const d = m.flight + i * 0.15;
          this.axes.push({ x: t.x, z: t.z, left: d, r: m.radius, stun: 0, dmg: m.dmg, kind: 'bloodOrb' });
          h.push([r2(t.x), r2(t.z), r2(d)]);
        }
        ev({ h, r: m.radius });
        return true;
      }
      case 'purePain': {
        // Death Angel: thrusts its staff: huge damage all around it, and shields can't block it.
        const list = this.enemyTargets(e, m.range);
        if (!list.length) return false;
        for (const t of list) this.hurtTower(t, m.dmg, true, true);
        ev({ r: m.range, n: list.length });
        return true;
      }
      case 'timeSnap': {
        // Beholder: a finger snap, a shockwave that hurts and stuns the towers near it.
        if (!this.enemyTargets(e, m.range).length) return false;
        this.hurtTowers(e.x, e.z, m.range, m.dmg, true);
        const n = this.hexTowers(e.x, e.z, m.range, 'stun', m.stun, true);
        ev({ r: m.range, n });
        return true;
      }
      case 'realityTear': {
        // Beholder: an orb that bursts into many small orbs, each landing on a random tower.
        const list = this.openTowers();
        if (!list.length) return false;
        const h = [];
        for (let i = 0; i < m.n; i++) {
          const t = list[Math.floor(Math.random() * list.length)];
          const x = t.x + (Math.random() - 0.5) * 2;
          const z = t.z + (Math.random() - 0.5) * 2;
          const d = m.flight + Math.random() * 0.8;
          this.axes.push({ x, z, left: d, r: m.radius, stun: 0, dmg: m.dmg, kind: 'tearOrb' });
          h.push([r2(x), r2(z), r2(d)]);
        }
        ev({ h, r: m.radius });
        return true;
      }
      case 'timeParadox': {
        // Beholder: slams down; random towers turn into other towers at level 1, with no refund.
        // The new tower can't cost more than was spent on the old one (and has to fit where it stands).
        const list = this.openTowers().filter((t) => !t.holo && !TOWERS[t.type].heli);
        if (!list.length) return false;
        const h = [];
        for (let i = 0; i < m.n && list.length; i++) {
          const t = list.splice(Math.floor(Math.random() * list.length), 1)[0];
          const p = this.players.get(t.owner);
          const others = [...this.towers.values()].filter((o) => o !== t);
          // From the owner's loadout (no loadout: any plain tower, not alt forms, golden or event towers).
          const pool = (p?.loadout ?? Object.keys(TOWERS).filter((k) => TOWERS[k].levels && !TOWERS[k].altOf && !TOWERS[k].branchOf && !TOWERS[k].goldOf && !TOWERS[k].event))
            .filter((k) => TOWERS[k] && k !== rootType(t.type) && towerCost(TOWERS[k]) <= t.spent && canPlace(t.x, t.z, others, TOWERS[k].placement));
          if (!pool.length) continue;
          const type = pool[Math.floor(Math.random() * pool.length)];
          this.removeTower(t, 'paradox', { into: type });
          this.newTower(t.owner, type, t.x, t.z, 0, towerCost(TOWERS[type]));
          h.push([r2(t.x), r2(t.z)]);
        }
        ev({ h, n: h.length });
        return true;
      }
      // ---------------------------------------------------------------- Insane mode moves
      case 'hammerSmash': {
        // Berserker (once): smashes one tower and stuns it for a long time.
        const list = this.enemyTargets(e, m.range);
        if (!list.length) return false;
        const t = list[Math.floor(Math.random() * list.length)];
        this.stunAt(t, 0, m.stun);
        ev({ tx: r2(t.x), tz: r2(t.z), stun: m.stun });
        return true;
      }
      case 'boltSlam': {
        // Boltmaster: towers in a big ring fire slower, the ones closest to it are stunned.
        if (!this.enemyTargets(e, m.range).length) return false;
        this.slowTowers(e.x, e.z, m.range, m.slow, m.time);
        const n = this.hexTowers(e.x, e.z, m.inner, 'stun', m.stun, true);
        ev({ r: m.range, inner: m.inner, n });
        return true;
      }
      case 'callUnits': {
        // Bolt Summon, Eyeficated Summon, Overlord Summoning: a few units step out beside it.
        for (let i = 0; i < m.n; i++) {
          const type = m.list[Math.floor(Math.random() * m.list.length)];
          this.reborn.push({ route: e.route, type, dist: Math.max(0, e.dist - 1.5 - i * 1.5), lateral: (i - (m.n - 1) / 2) * 2, hpScale: 1, owner: e.id, from: e.type });
        }
        ev({ n: m.n, name: m.name });
        return true;
      }
      case 'rocketBombard':
      case 'telekinesis': {
        // Robotic Overseer: rockets that reach anywhere on the map. Overlord: two thrown boulders.
        const list = this.openTowers();
        if (!list.length) return false;
        const h = [];
        for (let i = 0; i < m.n; i++) {
          const t = list[Math.floor(Math.random() * list.length)];
          const x = t.x + (Math.random() - 0.5) * 2;
          const z = t.z + (Math.random() - 0.5) * 2;
          const d = m.flight + Math.random() * 0.8;
          this.axes.push({ x, z, left: d, r: m.radius, stun: m.stun, dmg: m.dmg ?? 0, kind: m.key === 'telekinesis' ? 'boulder' : 'missile' });
          h.push([r2(x), r2(z), r2(d)]);
        }
        ev({ h, r: m.radius });
        return true;
      }
      case 'minigun':
      case 'thunderstorm': {
        // Robotic Overseer Minigun Mayhem (towers near it) / Overlord Thunderstorm (anywhere):
        // up to `n` towers are hit and stunned.
        const list = m.range ? this.enemyTargets(e, m.range) : this.openTowers();
        if (!list.length) return false;
        const h = [];
        let n = 0;
        for (let i = 0; i < m.n && list.length; i++) {
          const t = list.splice(Math.floor(Math.random() * list.length), 1)[0];
          n += this.stunAt(t, m.radius ?? 0, m.stun);
          h.push([r2(t.x), r2(t.z)]);
        }
        ev({ h, n });
        return true;
      }
      case 'swordThrow':
      case 'crystalThrow':
      case 'eyeLaser': {
        // Vengeful Champion / Ravager: a thrown sword or crystal stuns the tower it lands on.
        // The Corrupted: charges its eye at a tower, then a laser stuns every tower around it;
        // afterwards its Defense and max damage per hit stay lowered for good.
        const list = m.range ? this.enemyTargets(e, m.range) : this.openTowers();
        if (!list.length) return false;
        const t = list[Math.floor(Math.random() * list.length)];
        this.axes.push({ x: t.x, z: t.z, left: m.flight, r: m.radius, stun: m.stun, dmg: 0, kind: m.key });
        if (m.key === 'eyeLaser') {
          e.carry.defense = m.defense;
          e.carry.maxHit = m.maxHit;
        }
        ev({ tx: r2(t.x), tz: r2(t.z), d: m.flight, r: m.radius });
        return true;
      }
      case 'vengefulSlash': {
        // Vengeful Champion: a slash that stuns every tower in front of it.
        const n = this.hexTowers(e.x, e.z, m.range, 'stun', m.stun, true, (t) => (t.x - e.x) * e.dx + (t.z - e.z) * e.dz >= -1);
        if (!n) return false;
        ev({ r: m.range, n });
        return true;
      }
      case 'axeSlash': {
        // Avant Guard: slashes the towers near it, and they fire slower for a while.
        if (!this.enemyTargets(e, m.range).length) return false;
        const n = this.slowTowers(e.x, e.z, m.range, m.slow, m.time);
        ev({ r: m.range, n });
        return true;
      }
      case 'hammerLine': {
        // The Vanguard Hammer Smash: a shockwave in a line ahead of it stuns the towers it crosses.
        const list = this.towersInLine(e, m.length, m.width);
        if (!list.length) return false;
        const ids = new Set(list.map((t) => t.id));
        const n = this.hexTowers(e.x, e.z, m.length + m.width, 'stun', m.stun, true, (t) => ids.has(t.id));
        if (m.unitDmg) this.hurtUnitsNear(e.x, e.z, m.length, m.unitDmg); // Hardcore Void Titan
        ev({ len: m.length, dx: r2(e.dx), dz: r2(e.dz), n });
        return true;
      }
      // ---------------------------------------------------------------- Hardcore moves
      case 'gaze': {
        // Seer / Overseer: stuns towers anywhere on the map.
        const list = this.openTowers();
        if (!list.length) return false;
        const h = [];
        let n = 0;
        for (let i = 0; i < m.n && list.length; i++) {
          const t = list.splice(Math.floor(Math.random() * list.length), 1)[0];
          n += this.stunAt(t, 0, m.stun);
          h.push([r2(t.x), r2(t.z)]);
        }
        ev({ h, n });
        return true;
      }
      case 'dSword':
      case 'dSpikes': {
        // Demise: a sword swing (close) or spikes all around (wide) stun the towers near it.
        if (!this.enemyTargets(e, m.range).length) return false;
        const n = this.hexTowers(e.x, e.z, m.range, 'stun', m.stun, true);
        ev({ r: m.range, n });
        return true;
      }
      case 'dMist': {
        // Demise: a pink mist downgrades the towers near it by one level.
        if (!this.enemyTargets(e, m.range).length) return false;
        const n = this.downgradeTowers(e.x, e.z, m.range);
        ev({ r: m.range, n });
        return true;
      }
      case 'crystalLaser': {
        // Crystalian: floats up and fires a laser all around. It can be hurt while it does.
        e.openT = m.open;
        const list = this.enemyTargets(e, m.range);
        for (const t of list) if (!(buffOf(this.buffs, t.id).invuln || t.invulnT > 0)) this.weakTower(t, m.weak, m.time);
        this.hurtUnitsNear(e.x, e.z, m.range, m.unitDmg);
        ev({ r: m.range, n: list.length, open: m.open });
        return true;
      }
      case 'hammerBounce': {
        // Vindicator: a thrown hammer bounces between up to `n` towers and scares them (no attacks).
        const list = this.enemyTargets(e, m.range);
        if (!list.length) return false;
        let t = list[Math.floor(Math.random() * list.length)];
        const hit = [t];
        while (hit.length < m.n) {
          let best = null;
          let bd = 400;
          for (const o of this.towers.values()) {
            if (o.hp <= 0 || hit.includes(o) || this.stealthy(o)) continue;
            const d2 = (o.x - t.x) ** 2 + (o.z - t.z) ** 2;
            if (d2 < bd) {
              bd = d2;
              best = o;
            }
          }
          if (!best) break;
          hit.push(best);
          t = best;
        }
        for (const o of hit) if (!(buffOf(this.buffs, o.id).invuln || o.invulnT > 0)) o.bleedT = Math.max(o.bleedT || 0, m.lock);
        this.hurtUnitsNear(e.x, e.z, m.range, m.unitDmg);
        ev({ h: hit.map((o) => [r2(o.x), r2(o.z)]) });
        return true;
      }
      case 'spear': {
        // Void Guardian: a spear thrust freezes the towers in a line, and resets its shield.
        const list = this.towersInLine(e, m.length, m.width);
        if (!list.length) return false;
        const ids = new Set(list.map((t) => t.id));
        const n = this.hexTowers(e.x, e.z, m.length + m.width, 'stun', m.stun, true, (t) => ids.has(t.id));
        this.hurtUnitsNear(e.x, e.z, m.length, m.unitDmg);
        e.osh = Math.max(e.osh || 0, m.shield);
        e.oshMax = Math.max(e.oshMax || 0, e.osh);
        ev({ len: m.length, dx: r2(e.dx), dz: r2(e.dz), n });
        return true;
      }
      case 'hammerSpin':
      case 'concLightning': {
        // The Vanguard Hammer Spin / Overlord Concentrated Lightning: stuns every tower around it.
        if (!this.enemyTargets(e, m.range).length) return false;
        const n = this.hexTowers(e.x, e.z, m.range, 'stun', m.stun, true);
        ev({ r: m.range, n });
        return true;
      }
      case 'staffSlam': {
        // Mage: slams its staff; the enemies around it move faster for a moment.
        let n = 0;
        for (const o of this.enemies.values()) {
          if (o.remains || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > m.radius * m.radius) continue;
          o.empHaste = Math.max(o.empT > 0 ? o.empHaste || 0 : 0, m.haste);
          o.empT = Math.max(o.empT || 0, m.time);
          n++;
        }
        ev({ r: m.radius, n });
        return true;
      }
    }
    return false;
  }

  /** Lava Golem magma: towers standing in a puddle keep getting hurt until it cools. */
  updatePuddles(dt) {
    if (!this.puddles.length) return;
    this.puddles = this.puddles.filter((p) => {
      if (p.dps) this.hurtTowers(p.x, p.z, p.r, p.dps * dt, true);
      if (p.slow) this.slowTowers(p.x, p.z, p.r, p.slow, 0.3); // Bio Gunner goo
      if (p.weak || p.silence) this.weakenTowers(p.x, p.z, p.r, p.weak || 0, p.silence ? 0.3 : 0); // Acid Void acid, Void Lich poison
      return (p.left -= dt) > 0;
    });
  }
}
