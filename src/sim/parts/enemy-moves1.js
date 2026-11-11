// What enemies and bosses do, part 1: boss attacks for Medium, Hard, Insane and Void.
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { ENEMIES, TOWERS } from '../../config.js';
import { canPlace } from '../map.js';
import { path } from '../path.js';
import { buffOf, r2, rand } from './shared.js';

export class SimEnemyMoves1 {

  /** Molten Warlord: slams stun nearby towers, and thrown axes stun towers far away. */
  bossAttacks(e, def, dt) {
    const sl = def.slam;
    if (sl && (e.slamT -= dt) <= 0) {
      if (this.towerNear(e.x, e.z, sl.range, true)) {
        e.slamT = sl.every;
        const n = this.hexTowers(e.x, e.z, sl.range, 'stun', sl.stun, true);
        if (sl.dmg) this.hurtTowers(e.x, e.z, sl.range, sl.dmg, true);
        this.events.push({ k: 'slam', e: e.id, x: r2(e.x), z: r2(e.z), r: sl.range, n });
      } else e.slamT = 0.5;
    }
    const ax = def.axe;
    if (ax && (e.axeT -= dt) <= 0) {
      // Prefer towers out of slam reach, so the axe goes after the ones hiding far away.
      const near = (sl?.range ?? 0) ** 2;
      const all = [];
      const far = [];
      for (const t of this.towers.values()) {
        const d2 = (t.x - e.x) ** 2 + (t.z - e.z) ** 2;
        if (d2 > ax.range * ax.range || this.stealthy(t)) continue; // stealthy towers can't be targeted
        all.push(t);
        if (d2 > near) far.push(t);
      }
      // Scarecrows are bait: the axe goes for one of them when it can.
      const bait = all.filter((o) => TOWERS[o.type].bait && o.hp > 0);
      const list = bait.length ? bait : far.length ? far : all;
      if (!list.length) {
        e.axeT = 1;
        return;
      }
      const t = list[Math.floor(Math.random() * list.length)];
      e.axeT = ax.every;
      this.axes.push({ x: t.x, z: t.z, left: ax.flight, r: ax.radius, stun: ax.stun, dmg: ax.dmg ?? 0 });
      this.events.push({ k: 'axe', e: e.id, fx: r2(e.x), fz: r2(e.z), x: r2(t.x), z: r2(t.z), d: ax.flight });
    }
  }

  /** Towers enemy `e` can attack within `range`: working, not stealthy (Scarecrows first if any). */
  enemyTargets(e, range) {
    const out = [];
    for (const t of this.towers.values()) {
      if (t.hp <= 0 || (t.x - e.x) ** 2 + (t.z - e.z) ** 2 > range * range || this.stealthy(t)) continue;
      out.push(t);
    }
    const bait = out.filter((o) => TOWERS[o.type].bait);
    return bait.length ? bait : out;
  }

  /**
   * Hard mode enemy abilities (see the Hard mode comment in ENEMIES): the Eradicator's enrage and
   * flight, Knight dashes and slashes, Pestilence mushrooms, and shots at towers.
   */
  hardAttacks(e, def, dt) {
    if (def.enrage?.after) e.ageT = (e.ageT || 0) + dt;
    if (def.enrage && !e.enraged && (def.enrage.after ? e.ageT >= def.enrage.after : e.hp <= e.maxHp * def.enrage.at)) {
      e.enraged = true;
      if (def.enrage.osh) {
        // Hardcore Lurch 3: smashes its core and gains a shield.
        e.osh = (e.osh || 0) + e.maxHp * def.enrage.osh;
        e.oshMax = Math.max(e.oshMax || 0, e.osh);
      }
      this.events.push({ k: 'enrage', e: e.id });
    }
    if (e.stop) return; // frozen or stunned enemies don't attack
    const fl = def.fly;
    if (fl) {
      if (e.airT > 0) {
        if ((e.airT -= dt) <= 0) {
          e.airT = 0;
          e.flying = !!def.flying;
          e.flyT = fl.every;
          this.events.push({ k: 'land', e: e.id });
        }
      } else if ((e.flyT -= dt) <= 0) {
        e.airT = fl.dur;
        e.flying = true;
        e.charging = false;
        this.events.push({ k: 'takeoff', e: e.id });
      } else if (fl.charge && !e.charging && e.flyT <= fl.charge) {
        // VOID (Spirit): glows and fades out before it flies off.
        e.charging = true;
        this.events.push({ k: 'vCharge', e: e.id });
      }
    }
    if (def.dash && (e.dashT -= dt) <= 0) {
      e.dashT = def.dash.every;
      e.dist += def.dash.dist;
      this.events.push({ k: 'dash', e: e.id });
    }
    const sl = def.slash;
    if (sl && (e.slashT -= dt) <= 0) {
      if (this.enemyTargets(e, sl.range).length) {
        e.slashT = sl.every;
        this.hurtTowers(e.x, e.z, sl.range, sl.dmg, true);
        this.events.push({ k: 'slash', e: e.id, x: r2(e.x), z: r2(e.z), r: sl.range, ...(sl.spin ? { spin: 1 } : {}) });
      } else e.slashT = 0.5;
    }
    const inf = def.infect;
    if (inf && (e.infectT -= dt) <= 0) {
      e.infectT = inf.every;
      let n = 0;
      for (const o of this.enemies.values()) {
        if (n >= inf.max) break;
        if (o.remains || o.shroom || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > inf.radius * inf.radius) continue;
        const add = Math.round(o.maxHp * inf.hp);
        o.maxHp += add;
        o.hp += add;
        o.shroom = inf.regen;
        n++;
      }
      if (n) this.events.push({ k: 'infect', e: e.id, x: r2(e.x), z: r2(e.z), r: inf.radius });
    }
    if (!def.shots) return;
    def.shots.forEach((s, i) => {
      if (s.air && !(e.airT > 0)) return;
      if ((e.shotT[i] -= dt) > 0) return;
      const list = this.enemyTargets(e, s.range);
      if (!list.length) {
        e.shotT[i] = 0.5;
        return;
      }
      e.shotT[i] = s.every;
      if (s.haste) {
        // Vio Gunner: the enemies around it speed up as it fires.
        for (const o of this.enemies.values()) {
          if (o.remains || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > s.haste.radius ** 2) continue;
          o.empT = Math.max(o.empT || 0, s.haste.time);
          o.empHaste = Math.max(o.empT > 0 ? o.empHaste || 0 : 0, s.haste.speed);
        }
      }
      // Shadow Master: a flurry of `n` shurikens at random towers.
      // Psycho: the knife goes at the nearest tower.
      const near = s.nearest ? list.reduce((a, b) => ((b.x - e.x) ** 2 + (b.z - e.z) ** 2 < (a.x - e.x) ** 2 + (a.z - e.z) ** 2 ? b : a)) : null;
      for (let k = 0; k < (s.n || 1); k++) {
        const t = near ?? list[Math.floor(Math.random() * list.length)];
        const fl = (s.flight || 0) + k * 0.08;
        this.events.push({ k: 'eShot', e: e.id, kind: s.kind, fx: r2(e.x), fz: r2(e.z), x: r2(t.x), z: r2(t.z), d: fl, air: e.airT > 0 ? 1 : 0 });
        const hit = { x: t.x, z: t.z, left: fl, r: s.radius, stun: s.stun || 0, dmg: s.dmg, kind: s.kind, puddle: s.puddle, slow: s.slow, shrink: s.shrink, weak: s.weak, lock: s.lock, bleed: s.bleed };
        if (s.drain && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * s.drain); // Time Parasite heals off its beam
        if (fl) this.axes.push(hit);
        else this.landShot(hit);
      }
    });
  }

  /**
   * Medium mode attacks (see the Medium comment in ENEMIES): Smasher / Eradicator slams, Sword
   * Shock, Predator and Eradicator shots and rockets, Energy Cleave, Pyrotechnics, Grenadier
   * grenades, and the Eradicator's Electronic Rage.
   */
  mediumAttacks(e, def, dt) {
    const rg = def.rage;
    // rage.at and rage.heal are for its listed health: they scale with its real max health
    // (multiplayer, the mode's balance curve).
    const k = e.maxHp / def.hp;
    if (rg && !e.raged && e.hp <= rg.at * k) {
      e.raged = true;
      e.shutT = rg.shut;
      e.hp = Math.min(e.maxHp, e.hp + rg.heal * k);
      e.baseSpeed = rg.speed;
      for (const o of this.towers.values()) o.immuneT = Math.max(o.immuneT || 0, rg.immune); // a short stun immunity
      this.events.push({ k: 'mRage', e: e.id });
    }
    if (e.flameT > 0) {
      // Pyrotechnics: a flamethrower sprays an arc in front of it (the way it walks).
      const fl = e.flameAb;
      e.flameT = Math.max(0, e.flameT - dt);
      const half = (fl.arc / 2) * (Math.PI / 180);
      for (const o of this.enemyTargets(e, fl.range)) {
        const a = Math.atan2(o.x - e.x, o.z - e.z) - Math.atan2(e.dx, e.dz);
        if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) <= half) this.hurtTower(o, fl.dps * dt, true);
      }
      if ((e.flameFx = (e.flameFx || 0) - dt) <= 0) {
        e.flameFx = 0.25;
        this.events.push({ k: 'eFlame', e: e.id, x: r2(e.x), z: r2(e.z), yaw: r2(Math.atan2(e.dx, e.dz)), r: fl.range, arc: fl.arc });
      }
    }
    if (e.stop || e.shutT > 0 || !def.mAttacks) return; // stunned, frozen or shut down: no attacks
    def.mAttacks.forEach((a, i) => {
      if (a.phase === 2 && !e.raged) return;
      if ((e.mT[i] -= dt) > 0) return;
      if (a.slam) {
        if (!this.towerNear(e.x, e.z, a.slam.range, true)) return void (e.mT[i] = 0.5);
        const n = this.hexTowers(e.x, e.z, a.slam.range, 'stun', a.slam.stun, true);
        if (a.slam.unitDmg) this.hurtUnitsNear(e.x, e.z, a.slam.range, a.slam.unitDmg); // Hard: Honor Guard, Guardian
        this.events.push({ k: 'slam', e: e.id, x: r2(e.x), z: r2(e.z), r: a.slam.range, n, name: a.name ?? def.name, ...(a.slam.spin ? { spin: 1 } : {}), ...(a.slam.color ? { c: a.slam.color } : {}) });
      } else if (a.jam) {
        if (!this.enemyTargets(e, a.jam.range).length) return void (e.mT[i] = 0.5);
        const n = this.slowTowers(e.x, e.z, a.jam.range, a.jam.slow, a.jam.time, true);
        this.events.push({ k: 'jam', e: e.id, x: r2(e.x), z: r2(e.z), r: a.jam.range, n });
      } else if (a.cleave) {
        if (!this.enemyTargets(e, a.cleave.range).length) return void (e.mT[i] = 0.5);
        this.hurtTowers(e.x, e.z, a.cleave.range, a.cleave.dmg, true);
        this.events.push({ k: 'slash', e: e.id, x: r2(e.x), z: r2(e.z), r: a.cleave.range });
      } else if (a.flame) {
        if (!this.enemyTargets(e, a.flame.range).length) return void (e.mT[i] = 0.5);
        e.flameT = a.flame.time;
        e.flameAb = a.flame;
        e.flameFx = 0;
      } else if (a.toss) {
        const tg = a.toss;
        const dist = Math.min(e.dist + (tg.ahead || 0), path.length - 2);
        const p = path.at(dist, {}, e.route);
        this.events.push({ k: 'eShot', e: e.id, kind: 'grenade', fx: r2(e.x), fz: r2(e.z), x: r2(p.x), z: r2(p.z), d: tg.flight });
        this.axes.push({ x: p.x, z: p.z, left: tg.flight, r: 3, stun: 0, dmg: 0, kind: 'grenade', spawn: { list: tg.list, dist } });
      } else if (a.shot) {
        const s = a.shot;
        let list = this.enemyTargets(e, s.range);
        if (s.offensive) list = list.filter((o) => TOWERS[o.type].kind !== 'income');
        if (!list.length) return void (e.mT[i] = 0.5);
        let picks;
        if (s.pick === 'random') picks = Array.from({ length: s.n }, () => list[Math.floor(Math.random() * list.length)]);
        else {
          list.sort((x, y) => (s.pick === 'weakest' ? x.spent - y.spent : y.spent - x.spent) || x.id - y.id);
          picks = s.same ? Array(s.n).fill(list[0]) : list.slice(0, s.n);
        }
        picks.forEach((o, k) => {
          const close = s.near && (o.x - e.x) ** 2 + (o.z - e.z) ** 2 <= s.near[0] ** 2;
          const dmg = (close ? s.near[1] : s.dmg) + (s.pct ? o.maxHp * s.pct : 0);
          const fl = (s.flight || 0) + k * 0.1;
          this.events.push({ k: 'eShot', e: e.id, kind: s.kind, fx: r2(e.x), fz: r2(e.z), x: r2(o.x), z: r2(o.z), d: fl });
          // Aimed at one tower: only that tower is hit.
          const hit = { x: o.x, z: o.z, left: fl, r: 0.5, stun: s.stun || 0, dmg: 0, kind: s.kind, tower: o.id, tdmg: dmg, weak: s.weak, slow: s.slow, lock: s.lock }; // (Hardcore: stun / weaken / slow it too)
          if (fl) this.axes.push(hit);
          else this.landShot(hit);
        });
      }
      e.mT[i] = a.every;
    });
  }

  /**
   * Hard mode (Fallen) abilities: Fallen Jester gifts, and the Fallen King's Summon (once), Sword
   * Swing (three slashes, each wider) and Fallen Comet. Undead Charge is a plain `summon`.
   */
  fallenAttacks(e, def, dt) {
    if (e.stop) return;
    const g = def.gift;
    if (g && (e.giftT -= dt) <= 0) {
      e.giftT = g.every;
      let n = 0;
      for (const o of this.enemies.values()) {
        if (o === e || o.remains || o.boss || o.gifted || ENEMIES[o.type].gift || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > g.radius * g.radius) continue;
        o.gifted = true;
        n++;
        if (Math.random() < 0.5) {
          // Bloated: more health.
          o.maxHp = Math.round(o.maxHp * g.bloated);
          o.hp = Math.min(o.maxHp, o.hp * g.bloated);
        } else o.blessed = g.blessed; // Blessed: more defense
      }
      this.events.push({ k: 'gift', e: e.id, x: r2(e.x), z: r2(e.z), r: g.radius, n });
    }
    const fk = def.fallenKing;
    if (!fk) return;
    // Summon (once): a horde of Fallen bursts out behind him.
    if (!e.hordeDone && e.hp <= e.maxHp * fk.horde.at) {
      e.hordeDone = true;
      for (let i = 0; i < fk.horde.n; i++) {
        const type = fk.horde.list[Math.floor(Math.random() * fk.horde.list.length)];
        this.reborn.push({ route: e.route, type, dist: Math.max(0, e.dist - 3 - i * 0.6), lateral: (Math.random() - 0.5) * 2, hpScale: 1, owner: e.id });
      }
      this.events.push({ k: 'kingHorde', e: e.id, n: fk.horde.n });
    }
    // Sword Swing: three slashes, each one wider than the last (the third is a full circle).
    const sw = fk.swing;
    if ((e.swingT -= dt) <= 0) {
      if (!e.swingN && !this.enemyTargets(e, sw.range).length) e.swingT = 0.5;
      else {
        const arc = sw.arcs[e.swingN];
        const half = (arc / 2) * (Math.PI / 180);
        const yaw = Math.atan2(e.dx, e.dz);
        const inArc = (o) => {
          if (arc >= 360) return true;
          const a = Math.atan2(o.x - e.x, o.z - e.z) - yaw;
          return Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) <= half;
        };
        const n = this.hexTowers(e.x, e.z, sw.range, 'stun', sw.stun, true, inArc);
        this.hurtUnitsNear(e.x, e.z, sw.range, sw.unitDmg, inArc);
        this.events.push({ k: 'kingSwing', e: e.id, x: r2(e.x), z: r2(e.z), r: sw.range, arc, yaw: r2(yaw), n, i: e.swingN });
        e.swingN++;
        if (e.swingN >= sw.arcs.length) {
          e.swingN = 0;
          e.swingT = sw.every;
        } else e.swingT = sw.gap;
      }
    }
    // Fallen Comet: spikes rain down on the whole map.
    const cm = fk.comet;
    if ((e.cometT -= dt) <= 0) {
      e.cometT = cm.every;
      const n = this.hexTowers(e.x, e.z, 1e5, 'stun', cm.stun, true);
      this.hurtUnits(cm.unitDmg);
      this.events.push({ k: 'comet', e: e.id, n });
    }
  }

  /** Fallen King: Bone Armor (more defense as he loses health) and $10,000 for every 5% of health lost. */
  kingHurt(e) {
    const def = ENEMIES[e.type];
    const bone = def.fallenKing?.bone;
    if (bone && e.hp > 0 && e.hp <= e.boneAt && e.armor < bone.max) {
      e.armor = Math.min(bone.max, e.armor + bone.add);
      e.boneAt = e.hp * (1 - bone.loss);
      this.events.push({ k: 'boneArmor', e: e.id, a: Math.round(e.armor * 100) });
    }
    const cd = def.cashDrop;
    if (cd) {
      const lost = Math.min(Math.round(1 / cd.pct), Math.floor((1 - Math.max(0, e.hp) / e.maxHp) / cd.pct + 1e-9));
      if (lost > e.drops) {
        const v = (lost - e.drops) * cd.cash;
        e.drops = lost;
        for (const p of this.players.values()) p.cash += v;
        this.events.push({ k: 'cashDrop', x: r2(e.x), z: r2(e.z), v });
      }
    }
  }

  /** Necrotic Skeleton dies: towers nearby fire slower, units get hurt, and healing goo spills on the path. */
  necroBurst(e, nb) {
    this.slowTowers(e.x, e.z, nb.radius, nb.slow, nb.time, true);
    this.hurtUnitsNear(e.x, e.z, nb.radius, nb.unitDmg);
    this.events.push({ k: 'eBlast', x: r2(e.x), z: r2(e.z), r: nb.radius, c: 0x00e5ff });
    const g = nb.goo;
    for (let i = 0; i < g.n; i++) {
      const d = Math.min(path.length - 1, Math.max(0, e.dist + (i - (g.n - 1) / 2) * 3));
      const p = path.at(d, {}, e.route);
      this.goos.push({ x: p.x, z: p.z, r: g.r, left: g.life, heal: g.heal, every: g.every, t: g.every });
      this.events.push({ k: 'goo', x: r2(p.x), z: r2(p.z), r: g.r, life: g.life });
    }
  }

  /** Necrotic goo: heals the enemies standing in it every `every` s. */
  updateGoos(dt) {
    if (!this.goos.length) return;
    this.goos = this.goos.filter((g) => {
      if ((g.t -= dt) <= 0) {
        g.t += g.every;
        for (const o of this.enemies.values()) {
          if (o.remains || o.hp >= o.maxHp || (o.x - g.x) ** 2 + (o.z - g.z) ** 2 > g.r * g.r) continue;
          o.hp = Math.min(o.maxHp, o.hp + g.heal);
        }
      }
      return (g.left -= dt) > 0;
    });
  }

  /**
   * Insane mode: how much faster (or slower) enemy `e` moves this tick. Trails and EMPs and Warpers
   * speed it up (the strongest one counts), Timelings change pace, Glitches only lurch, the
   * Beholder speeds up near towers. Also: Smoker smoke hides it, Mechanics armor it up.
   */
  insaneSpeed(e, def, auras, dt) {
    let haste = e.empT > 0 ? e.empHaste : 0;
    if (e.empT > 0) e.empT = Math.max(0, e.empT - dt);
    if (e.glitchT > 0) e.glitchT = Math.max(0, e.glitchT - dt);
    let smoked = false;
    for (const z of this.zones) {
      if ((e.x - z.x) ** 2 + (e.z - z.z) ** 2 > z.r * z.r) continue;
      if (z.kind === 'smoke') smoked = true;
      else if (z.by !== e.id) haste = Math.max(haste, z.speed);
    }
    let geared = 0;
    if (auras) {
      for (const a of auras) {
        if (a === e) continue;
        const ad = ENEMIES[a.type];
        const d2 = (e.x - a.x) ** 2 + (e.z - a.z) ** 2;
        if (ad.hasteAura && d2 <= ad.hasteAura.radius ** 2) haste = Math.max(haste, ad.hasteAura.speed);
        if (ad.gear && d2 <= ad.gear.radius ** 2 && !e.remains) geared = ad.gear;
      }
    }
    if (geared) e.gear = Math.min(geared.max, e.gear + geared.rate * dt);
    else if (e.gear) e.gear = Math.max(0, e.gear - 0.05 * dt);
    e.smoked = smoked && !def.hidden;
    e.hidden = !!def.hidden || !!e.cloak || smoked;
    const nh = def.nearHaste;
    if (nh) {
      let n = 0;
      for (const t of this.towers.values()) if (t.hp > 0 && (t.x - e.x) ** 2 + (t.z - e.z) ** 2 <= nh.radius * nh.radius) n++;
      haste = Math.max(haste, Math.min(nh.max, n * nh.per));
    }
    e.hasted = haste > 0;
    let mult = 1 + haste;
    if (def.tempo) mult *= e.tempo;
    if (def.lurch) mult = 0; // Glitches don't walk, they lurch (insaneAttacks)
    if (e.waitT > 0) {
      e.waitT = Math.max(0, e.waitT - dt);
      mult = 0;
    }
    return mult;
  }

  /** Towers within `r` of (x, z) work `amt` slower for `secs` s (`enemy`: stealthy towers are safe). Returns how many. */
  slowTowers(x, z, r, amt, secs, enemy = true) {
    let n = 0;
    for (const t of this.towers.values()) {
      if ((t.x - x) ** 2 + (t.z - z) ** 2 > r * r) continue;
      if (enemy && this.stealthy(t)) continue;
      if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) continue;
      t.slowAmt = t.slowT > 0 ? Math.max(t.slowAmt, amt) : amt;
      t.slowT = Math.max(t.slowT || 0, secs);
      n++;
    }
    return n;
  }

  /**
   * Insane mode enemy abilities (see the Insane mode comment in ENEMIES): trails and smoke, Battery
   * lightning and EMPs, King stabs, Timeling pace, Time Titan armor, Glitch lurches, and the
   * Beholder's time waves, time bombs, sword and its shift into the time dimension.
   */
  insaneAttacks(e, def, dt) {
    if (def.shift && !e.shifted && e.hp <= e.maxHp * def.shift.at && !this.shiftBoss) {
      e.shifted = true;
      this.shiftBoss = e;
      return;
    }
    if (def.trail && (e.trailT -= dt) <= 0) {
      e.trailT = def.trail.every;
      this.zones.push({ kind: 'trail', x: e.x, z: e.z, r: def.trail.radius, left: def.trail.life, speed: def.trail.speed, by: e.id });
      this.events.push({ k: 'trail', x: r2(e.x), z: r2(e.z), r: def.trail.radius, life: def.trail.life, ...(def.trail.color ? { c: def.trail.color } : {}) });
    }
    if (def.smoke && (e.smokeT -= dt) <= 0) {
      e.smokeT = def.smoke.every;
      this.zones.push({ kind: 'smoke', x: e.x, z: e.z, r: def.smoke.radius, left: def.smoke.life });
      this.events.push({ k: 'smoke2', x: r2(e.x), z: r2(e.z), r: def.smoke.radius, life: def.smoke.life });
    }
    if (def.tempo && (e.tempoT -= dt) <= 0) {
      e.tempoT = rand(...def.tempo.every);
      e.tempo = rand(def.tempo.min, def.tempo.max);
    }
    if (def.armorSwap && (e.armorT -= dt) <= 0) {
      e.armorT = rand(...def.armorSwap.every);
      e.armorUp = !e.armorUp;
      e.armor = e.armorUp ? def.armorSwap.armor : 0;
      this.events.push({ k: 'armorSwap', e: e.id, on: e.armorUp ? 1 : 0 });
    }
    if (e.stop) return; // frozen or stunned enemies don't attack (or lurch)
    const lu = def.lurch;
    if (lu && (e.lurchT -= dt) <= 0) {
      e.lurchT = lu.every * rand(0.6, 1.4);
      const from = e.dist;
      const step = lu.dist * rand(0.7, 1.3);
      e.dist = e.confT > 0 ? Math.max(0, e.dist - step) : e.dist + step;
      const lo = Math.min(from, e.dist);
      const hi = Math.max(from, e.dist);
      // Every enemy it glitched through gets laser resistance for a while.
      for (const o of this.enemies.values()) {
        if (o === e || o.remains || o.dist < lo || o.dist > hi) continue;
        o.glitchT = lu.time;
        o.glitchRes = lu.resist;
      }
      this.events.push({ k: 'lurch', e: e.id });
    }
    const arc = def.arc;
    if (arc && (e.arcT -= dt) <= 0) {
      const list = this.enemyTargets(e, arc.range);
      if (!list.length) e.arcT = 0.5;
      else {
        // Battery lightning: one tower, then it jumps on to the closest towers nearby.
        e.arcT = arc.every;
        let t = list[Math.floor(Math.random() * list.length)];
        const hit = [t];
        for (let i = 0; i < arc.n; i++) {
          let best = null;
          let bd = arc.jump * arc.jump;
          for (const o of this.towers.values()) {
            if (o.hp <= 0 || hit.includes(o) || this.stealthy(o)) continue;
            const d2 = (o.x - t.x) ** 2 + (o.z - t.z) ** 2;
            if (d2 <= bd) {
              bd = d2;
              best = o;
            }
          }
          if (!best) break;
          hit.push(best);
          t = best;
        }
        for (const o of hit) this.hurtTowers(o.x, o.z, 0.01, arc.dmg, true);
        this.events.push({ k: 'arc', e: e.id, h: hit.map((o) => [r2(o.x), r2(o.z)]) });
      }
    }
    const emp = def.emp;
    if (emp && (e.empCdT -= dt) <= 0) {
      if (!this.towerNear(e.x, e.z, emp.radius, true)) e.empCdT = 0.5;
      else {
        e.empCdT = emp.every;
        const n = this.hexTowers(e.x, e.z, emp.radius, 'stun', emp.stun, true);
        for (const o of this.enemies.values()) {
          if (o.remains || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > emp.radius * emp.radius) continue;
          o.empT = emp.time;
          o.empHaste = emp.haste;
        }
        this.events.push({ k: 'emp', e: e.id, x: r2(e.x), z: r2(e.z), r: emp.radius, n });
      }
    }
    const sb = def.stab;
    if (sb && (e.stabT -= dt) <= 0) {
      const list = this.enemyTargets(e, sb.range);
      if (!list.length) e.stabT = 0.5;
      else {
        e.stabT = sb.every;
        const t = list[Math.floor(Math.random() * list.length)];
        this.hurtTowers(t.x, t.z, 0.01, sb.dmg, true);
        this.events.push({ k: 'stab', e: e.id, x: r2(t.x), z: r2(t.z) });
      }
    }
    const tw = def.timeWave;
    if (tw && (e.waveT -= dt) <= 0) {
      e.waveT = tw.every;
      const n = this.slowTowers(e.x, e.z, tw.radius, tw.slow, tw.time);
      this.events.push({ k: 'timeWave', e: e.id, x: r2(e.x), z: r2(e.z), r: tw.radius, n });
    }
    const tb = def.timeBomb;
    if (tb && (e.bombT -= dt) <= 0) {
      const list = this.openTowers().filter((t) => !this.bombs.some((b) => b.tower === t.id));
      if (!list.length) e.bombT = 1;
      else {
        e.bombT = tb.every;
        const t = list[Math.floor(Math.random() * list.length)];
        const b = { id: this.nextId++, tower: t.id, x: t.x, z: t.z, left: tb.fuse, dmg: tb.dmg, r: tb.radius };
        this.bombs.push(b);
        this.events.push({ k: 'tBomb', e: e.id, id: b.id, x: r2(b.x), z: r2(b.z), fuse: tb.fuse });
      }
    }
    const sw = def.sword;
    if (sw && (e.swordT -= dt) <= 0) {
      const list = this.enemyTargets(e, sw.range);
      if (!list.length) e.swordT = 0.5;
      else {
        // A sword swipe: hurts the towers around it, and they fire a bit slower for good.
        e.swordT = sw.every;
        this.hurtTowers(e.x, e.z, sw.range, sw.dmg, true);
        for (const t of list) t.nerf = Math.max(sw.minRate, (t.nerf ?? 1) * (1 - sw.nerf));
        this.events.push({ k: 'swipe', e: e.id, x: r2(e.x), z: r2(e.z), r: sw.range, n: list.length });
      }
    }
  }

  // ---------------------------------------------------------------- Void mode

  /** Void Colossus: each hit of a kind wears that kind's resistance down a little. */
  adaptResist(e, kind, dmg, adapt) {
    const field = kind === 'bullet' ? 'bulletResist' : kind === 'laser' ? 'laserResist' : kind === 'explosive' ? 'explosiveResist' : kind === 'golden' ? 'goldResist' : null;
    if (!field || !(e[field] > 0) || !(dmg > 0)) return;
    e[field] = Math.max(0, e[field] - adapt.rate * (dmg / e.maxHp));
  }

  /** How dark the world is: 0 normal, 1 while VOID is alive, 2 for his spirit form. */
  get voidLevel() {
    let lv = 0;
    for (const e of this.enemies.values()) lv = Math.max(lv, ENEMIES[e.type].voidWorld ?? 0);
    if (this.riseBoss || this.reborn.some((r) => ENEMIES[r.type].voidWorld)) lv = Math.max(lv, 1);
    return lv;
  }

  /**
   * Void mode enemy abilities (see the Void mode comment in ENEMIES): the Golden Void's cash drain,
   * and VOID's punch, marks, summons when hurt, magic missiles, sky laser and tower drain.
   */
  voidAttacks(e, def, dt) {
    if (def.drain && (e.drainT -= dt) <= 0) {
      // Golden Void: takes cash from every player each second.
      e.drainT = 1;
      for (const p of this.players.values()) p.cash = Math.max(0, p.cash - def.drain);
      this.events.push({ k: 'drain', e: e.id, v: def.drain });
    }
    if (def.towerDrain) {
      // VOID (Spirit): every tower on the map slowly withers.
      for (const t of this.towers.values()) if (t.hp > 0) this.hurtTower(t, def.towerDrain * dt, true);
    }
    const lost = 1 - e.hp / e.maxHp;
    const hs = def.hurtSummon;
    if (hs) {
      // Each `per` of health lost: a few random enemies burst out.
      const due = Math.floor(lost / hs.per);
      if (due > e.hurtDone && !e.risen) {
        e.hurtDone = due; // a huge hit still only lets out one batch
        for (let i = 0; i < hs.n; i++) {
          const type = hs.list[Math.floor(Math.random() * hs.list.length)];
          this.reborn.push({ route: e.route, type, dist: Math.max(0, e.dist - 1.5 - i * 1.5), lateral: (Math.random() - 0.5) * 2, hpScale: 1, from: e.type });
        }
        this.events.push({ k: 'summon', e: e.id, type: 'voidHurt' });
      }
    }
    if (def.mark) {
      // Every 25% of health lost: a purple X over the tower that has hurt him most.
      while (e.marksDone < 3 && lost >= 0.25 * (e.marksDone + 1)) {
        e.marksDone++;
        const marked = new Set(this.marks.map((k) => k.tower));
        let best = null;
        let most = -1;
        for (const t of this.towers.values()) {
          if (t.hp <= 0 || marked.has(t.id)) continue;
          const v = e.dmgBy.get(t.id) ?? -1 + t.damageDealt * 1e-9; // nobody hurt him? then the strongest damage dealer
          if (v > most) {
            most = v;
            best = t;
          }
        }
        if (!best) continue;
        const k = { id: this.nextId++, tower: best.id, x: best.x, z: best.z, left: def.mark.fuse };
        this.marks.push(k);
        this.events.push({ k: 'vMark', e: e.id, id: k.id, tower: best.id, x: r2(best.x), z: r2(best.z), fuse: def.mark.fuse });
      }
    }
    const ob = def.orb;
    if (ob && (e.orbT -= dt) <= 0) {
      // A slow magic missile flies down the path toward the base. Touch it to pop it!
      e.orbT = ob.every;
      const o = { id: this.nextId++, dist: e.dist + 2, route: e.route, x: e.x, z: e.z, speed: ob.speed, dmg: ob.dmg };
      path.at(o.dist, o, o.route);
      this.orbs.push(o);
      this.events.push({ k: 'vOrb', e: e.id, id: o.id, x: r2(o.x), z: r2(o.z) });
    }
    const sk = def.skyLaser;
    if (sk && (e.laserT -= dt) <= 0) {
      e.laserT = sk.every;
      this.lasers.push({ left: sk.warn });
      this.events.push({ k: 'vLaserWarn', e: e.id, warn: sk.warn });
    }
    if (e.stop) return; // frozen or stunned: no punches
    const pu = def.punch;
    if (pu && (e.punchT -= dt) <= 0) {
      const list = this.enemyTargets(e, pu.range);
      if (!list.length) e.punchT = 0.5;
      else {
        e.punchT = pu.every;
        const t = list[Math.floor(Math.random() * list.length)];
        this.events.push({ k: 'punch', e: e.id, x: r2(t.x), z: r2(t.z) });
        this.hurtTower(t, pu.dmg, true);
        this.knockTower(t, e, pu.knock);
      }
    }
  }

  /** VOID's punch sends tower `t` flying up to `dist` studs away from `from` (if there's room to land). */
  knockTower(t, from, dist) {
    const def = TOWERS[t.type];
    if (def.heli || !this.towers.has(t.id)) return;
    const d = Math.hypot(t.x - from.x, t.z - from.z) || 1;
    const dx = (t.x - from.x) / d;
    const dz = (t.z - from.z) / d;
    const others = [...this.towers.values()].filter((o) => o !== t);
    for (const f of [1, 0.75, 0.5, 0.25]) {
      const x = t.x + dx * dist * f;
      const z = t.z + dz * dist * f;
      if (!canPlace(x, z, others, def.placement)) continue;
      this.reposition(t, null, { radius: 0 }, x, z);
      return;
    }
  }

  /** VOID's marks count down; when one runs out its tower is destroyed (knocked out). */
  updateMarks(dt) {
    if (!this.marks.length) return;
    this.marks = this.marks.filter((k) => {
      const t = this.towers.get(k.tower);
      if (!t) return false; // sold
      k.x = t.x;
      k.z = t.z;
      if ((k.left -= dt) > 0) return true;
      if (t.hp > 0) {
        if (t.shieldHp) t.shieldHp = 0;
        this.knockOut(t);
      }
      this.events.push({ k: 'vMarkHit', id: k.id, tower: t.id, x: r2(t.x), z: r2(t.z) });
      return false;
    });
  }

  /** VOID's magic missiles float down the path; one that reaches the base hurts it. */
  updateOrbs(dt) {
    if (!this.orbs.length) return;
    this.orbs = this.orbs.filter((o) => {
      o.dist += o.speed * dt;
      if (o.dist < path.length) {
        path.at(o.dist, o, o.route);
        return true;
      }
      this.baseHp = Math.max(0, this.baseHp - o.dmg);
      this.events.push({ k: 'orbHit', id: o.id, d: o.dmg });
      if (this.baseHp <= 0) this.end(false);
      return false;
    });
  }

  /** VOID's sky laser: after its warning it burns the whole track, killing every unit on it. */
  updateLasers(dt) {
    if (!this.lasers.length) return;
    this.lasers = this.lasers.filter((l) => {
      if ((l.left -= dt) > 0) return true;
      const n = this.units.size;
      for (const u of [...this.units.values()]) this.destroyUnit(u, this.towers.get(u.tower) ?? null);
      this.events.push({ k: 'vLaser', n });
      return false;
    });
  }

  /** VOID's health ran out: he rises as a spirit with a void heart, and Guardians appear around him. */
  voidRise(boss) {
    this.riseBoss = null;
    const rise = ENEMIES[boss.type].rise;
    this.enemies.delete(boss.id);
    this.events.push({ k: 'decay', e: boss.id });
    this.reborn.push({ route: boss.route, type: rise.into, dist: boss.dist, lateral: 0, hpScale: 1, from: boss.type });
    for (let i = 0; i < rise.n; i++) {
      this.reborn.push({ route: boss.route, type: rise.guards, dist: Math.max(0, boss.dist - 4 - i * 3), lateral: (i - (rise.n - 1) / 2) * 2.5, hpScale: 1 });
    }
    this.events.push({ k: 'vRise', x: r2(boss.x), z: r2(boss.z) });
  }

  /** VOID is defeated: everything else fades away, and after a short finale the game is won. */
  voidDown(e) {
    for (const o of this.enemies.values()) this.events.push({ k: 'decay', e: o.id });
    this.enemies.clear();
    this.queue = [];
    this.wave.left = 0;
    this.reborn = [];
    this.orbs = [];
    this.marks = [];
    this.lasers = [];
    this.axes = [];
    this.puddles = [];
    this.finaleT = 5;
    this.events.push({ k: 'vDown', x: r2(e.x), z: r2(e.z) });
  }

  // ---------------------------------------------------------------- Void mode (2026-11-09 spec)

  /** Void armor: a shield worth `shield` of its max health, extra armor, slower, and tendrils (see DIFFICULTIES.void). */
  armorUp(e) {
    const va = this.voidArmor;
    e.vShieldMax = e.vShield = Math.max(1, Math.round(e.maxHp * va.shield));
    e.tendrilT = va.tendril.every * rand(0.3, 1);
  }

  /** Void armor tendrils lash up to `n` towers near the enemy while its shield holds. */
  voidTendrils(e, dt) {
    const td = this.voidArmor.tendril;
    if (e.stop || (e.tendrilT -= dt) > 0) return;
    const list = this.enemyTargets(e, td.range);
    if (!list.length) {
      e.tendrilT = 0.5;
      return;
    }
    e.tendrilT = td.every;
    const dmg = Math.min(td.max, Math.max(td.min, Math.round(Math.sqrt(e.maxHp) * td.mult)));
    const h = [];
    for (let i = 0; i < td.n && list.length; i++) {
      const t = list.splice(Math.floor(Math.random() * list.length), 1)[0];
      this.hurtTower(t, dmg, true);
      h.push([r2(t.x), r2(t.z)]);
    }
    this.events.push({ k: 'vTendril', e: e.id, h });
  }

  /** Air and cliff towers (Aviators, helicopters, Railgunners...): the False Void and Guardians can't reach them. */
  airTower(t) {
    const d = TOWERS[t.type];
    return !!(d.heli || d.orbit || d.flyingTower || d.placement === 'cliff' || d.placement === 'any');
  }

  /** Stuns every tower within `r` of (x, z) for `secs` s, even stun-immune ones (VOID). Returns how many. */
  hardStun(x, z, r, secs) {
    let n = 0;
    for (const t of this.towers.values()) {
      if (t.hp <= 0 || (t.x - x) ** 2 + (t.z - z) ** 2 > r * r || this.stealthy(t)) continue;
      if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) continue;
      t.stunT = Math.max(t.stunT, secs);
      n++;
    }
    return n;
  }

  /** Void boss moves (def.vb, see ENEMIES): each on its own timer; one without `every` happens once. */
  voidBoss(e, def, dt) {
    const vb = def.vb;
    e.vbT ??= Object.fromEntries(Object.entries(vb).map(([k, m]) => [k, m.first ?? m.every]));
    if (e.stop) return;
    for (const k in vb) {
      if (e.vbT[k] == null || (e.vbT[k] -= dt) > 0) continue;
      const m = vb[k];
      const done = this.voidMove(e, k, m);
      e.vbT[k] = !done ? 0.5 : m.every ?? null; // nothing to hit yet: try again soon
    }
  }

  /** One Void boss move (see voidBoss). Returns false if it had nothing to do. */
  voidMove(e, k, m) {
    const ev = (extra) => this.events.push({ k: 'vMove', e: e.id, key: k, x: r2(e.x), z: r2(e.z), ...extra });
    const ground = (t) => !this.airTower(t);
    switch (k) {
      case 'slash': {
        // Guardian: an axe strike makes one ground tower bleed (no attacks, abilities or upgrades).
        const list = this.enemyTargets(e, m.range).filter(ground);
        if (!list.length) return false;
        const t = list[Math.floor(Math.random() * list.length)];
        if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) return true;
        t.bleedT = Math.max(t.bleedT || 0, m.time);
        ev({ tx: r2(t.x), tz: r2(t.z), tower: t.id, time: m.time });
        return true;
      }
      case 'shockwave':
      case 'stomp': {
        // False Void: a scream (huge radius) or a stomp; ground towers are stunned, units crushed.
        if (k === 'stomp' && !this.enemyTargets(e, m.radius).filter(ground).length) return false;
        const n = this.hexTowers(e.x, e.z, m.radius, 'stun', m.stun, true, ground);
        this.hurtUnitsNear(e.x, e.z, m.radius, m.unitDmg);
        ev({ r: m.radius, n, stun: m.stun });
        return true;
      }
      case 'summon': {
        // False Void: reaches into its body and pulls out Spawns (no cash).
        const cnt = m.n[0] + Math.floor(Math.random() * (m.n[1] - m.n[0] + 1));
        for (let i = 0; i < cnt; i++) {
          const type = m.list[Math.floor(Math.random() * m.list.length)];
          this.reborn.push({ route: e.route, type, dist: Math.max(0, e.dist - 2 - i * 1.5), lateral: (i - (cnt - 1) / 2) * 1.5, hpScale: 1, owner: e.id, noCash: true });
        }
        ev({ n: cnt });
        return true;
      }
      case 'abyss': {
        // VOID From the Abyss: a scream that stuns every tower (even stun-immune) and kills every unit.
        const n = this.hardStun(e.x, e.z, 1e4, m.stun);
        const u = this.units.size;
        for (const x of [...this.units.values()]) this.destroyUnit(x, this.towers.get(x.tower) ?? null);
        ev({ n, u, stun: m.stun });
        return true;
      }
      case 'corruption': {
        // VOID Corruption: a share of the attacking towers (and units) turn to his side for good.
        const list = [...this.towers.values()].filter((t) => !t.corrupt && !t.holo && TOWERS[t.type].kind !== 'income');
        const n = list.length ? Math.max(1, Math.round(list.length * m.share)) : 0;
        const ids = [];
        for (let i = 0; i < n; i++) {
          const t = list.splice(Math.floor(Math.random() * list.length), 1)[0];
          t.corrupt = true;
          this.removeUnitsOf(t.id); // its units go too
          ids.push(t.id);
        }
        const units = [...this.units.values()];
        const nu = Math.round(units.length * m.share);
        for (let i = 0; i < nu; i++) {
          const u = units.splice(Math.floor(Math.random() * units.length), 1)[0];
          this.destroyUnit(u, this.towers.get(u.tower) ?? null);
        }
        ev({ ids, u: nu });
        return true;
      }
      case 'devastation': {
        // VOID Devastation: only when a tower is near; stuns (even stun-immune) and hurts them.
        if (!this.enemyTargets(e, m.radius).length) return false;
        const n = this.hardStun(e.x, e.z, m.radius, m.stun);
        this.hurtTowers(e.x, e.z, m.radius, m.dmg, true);
        ev({ r: m.radius, n });
        return true;
      }
      case 'army': {
        // VOID Unforeseen Army: enemies appear all along the path (no cash).
        let n = 0;
        for (const [type, cnt] of m.list) {
          for (let i = 0; i < cnt; i++, n++) this.reborn.push({ type, dist: path.length * rand(0.08, 0.75), lateral: (Math.random() - 0.5) * 2, hpScale: 1, noCash: true });
        }
        ev({ n });
        return true;
      }
      case 'meteors': {
        // VOID Abyssal Strikedown: purple rocks rain down on towers; each one stuns what it lands on.
        const list = this.openTowers();
        if (!list.length) return false;
        const h = [];
        for (const [dmg, r, cnt] of m.rocks) {
          for (let i = 0; i < cnt; i++) {
            const t = list[Math.floor(Math.random() * list.length)];
            const x = t.x + (Math.random() - 0.5) * 3;
            const z = t.z + (Math.random() - 0.5) * 3;
            const d = m.flight + Math.random() * 1.5;
            this.axes.push({ x, z, left: d, r, stun: m.stun, hard: true, dmg, kind: 'voidRock' });
            h.push([r2(x), r2(z), r2(d), r]);
          }
        }
        ev({ h });
        return true;
      }
      case 'telekinesis': {
        // VOID Telekinesis: with 2+ Warships out he lifts some and destroys them; meanwhile every tower is slowed.
        const ships = [...this.towers.values()].filter((t) => t.hp > 0 && /warship/i.test(t.type));
        if (ships.length < m.min) return false;
        const h = [];
        for (let i = 0; i < m.n && ships.length; i++) {
          const t = ships.splice(Math.floor(Math.random() * ships.length), 1)[0];
          if (t.shieldHp) t.shieldHp = 0;
          this.knockOut(t);
          h.push([r2(t.x), r2(t.z)]);
        }
        this.slowTowers(e.x, e.z, 1e4, m.slow, m.time, false);
        ev({ h, slow: m.slow, time: m.time });
        return true;
      }
    }
    return this.hcMove(e, k, m); // Hardcore bosses
  }
}
