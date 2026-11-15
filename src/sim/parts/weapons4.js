// Tower weapons, part 4 (the wave 10 towers): upkeep, scarecrows, strikes, souls, lemons, flasks,
// Stella's drawings, crows and bees that fly free, and the Chaos Jester.
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { ENEMIES, TOWERS, canHit, unitDetection, waveGroups } from '../../config.js';
import { path } from '../path.js';
import { SEE_ALL, TAU, TRAP_FLIGHT, buffOf, r2 } from './shared.js';

export class SimWeapons4 {

  // ---------------------------------------------------------------- networking

  // ---------------------------------------------------------------- wave 9 hero towers

  /** Lemonade Cat: `lemon.pay` cash per second for every zombie in its range (up to `lemon.cap`), paid every 2s. */
  // ---------------------------------------------------------------- wave 10 towers

  /** Regen, heals over time, second-life cooldown, passive souls and Doctor healing pay (every tick, even when stunned). */
  towerUpkeep(t, def, lv, dt) {
    if (t.hotT > 0) {
      const h = Math.min(dt, t.hotT); // Spiritual Advocate Self Heal / Heal
      t.hotT -= h;
      this.healTower(t, t.hotRate * h);
    }
    if (lv.regen) {
      // Doctor: heals itself after a while without taking damage.
      t.calmT = (t.calmT || 0) + dt;
      if (t.calmT >= lv.regen.delay && t.hp > 0) this.healTower(t, t.maxHp * lv.regen.rate * dt);
    }
    if (t.lifeCd > 0) t.lifeCd = Math.max(0, t.lifeCd - dt);
    if (lv.soul?.regen && this.wave.state === 'wave') this.setSouls(t, lv, (t.soulN || 0) + lv.soul.regen * dt);
    if (lv.healCash) {
      // Doctor: pays out what it earned healing, at most `cap` a second.
      t.payT = (t.payT ?? 1) - dt;
      if (t.payT <= 0) {
        t.payT = 1;
        const v = Math.min(lv.healCash.cap, Math.floor(t.healBank || 0));
        t.healBank = 0;
        const p = this.players.get(t.owner);
        if (p && v > 0) {
          p.cash += v;
          this.events.push({ k: 'income', id: t.id, owner: t.owner, v, x: t.x, z: t.z });
        }
      }
    }
  }

  /** Doctor: healing `amount` health earns it cash (paid out once a second, see towerUpkeep). */
  healPay(m, s, amount) {
    if (s.healCash && amount > 0) m.healBank = (m.healBank || 0) + amount * s.healCash.rate;
  }

  /** Scarecrow: every `scare.every` s, zombies in range it can scare walk backwards for a moment. */
  updateScare(t, def, s, b, dt) {
    const sc = s.scare;
    t.scareT = (t.scareT ?? 0) - dt;
    if (t.scareT > 0) return;
    const r = s.range * b.range;
    const det = this.detects(t, s);
    let any = false;
    for (const e of [...this.enemies.values()]) {
      if (e.remains || e.statusImmune || e.confCd > 0 || !canHit(det, e) || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > r * r) continue;
      if ((sc.maxHp != null && e.maxHp > sc.maxHp) || (e.boss && !sc.bosses)) continue;
      e.confT = sc.time * (e.boss ? sc.bosses : 1);
      e.confCd = e.confT + sc.cd;
      any = true;
      if (sc.damage) this.damage(t, e, sc.damage);
    }
    t.scareT = any ? sc.every : 0.25;
    if (any) this.events.push({ k: 'chaos', x: r2(t.x), z: r2(t.z), text: '👻 Boo!', color: '#ffab40' });
  }

  /** Scarecrow Flock of Crows: flies in a straight line toward the first zombie in range, hitting everything it passes. */
  crowFlock(t, s, ab) {
    const target = this.findTarget(t, s, t.x, t.z, s.range * buffOf(this.buffs, t.id).range);
    const aim = target ? Math.atan2(target.x - t.x, target.z - t.z) : t.yaw;
    t.yaw = aim;
    const tx = t.x + Math.sin(aim) * ab.length;
    const tz = t.z + Math.cos(aim) * ab.length;
    const time = ab.length / ab.speed;
    this.blades.push({ tower: t.id, loop: false, ox: t.x, oz: t.z, tx, tz, t: 0, time, left: Infinity, hits: new Set(), damage: ab.damage, det: SEE_ALL });
    this.events.push({ k: 'knife', t: t.id, x: r2(tx), z: r2(tz), d: r2(time) });
  }

  /** Void Traitor Strike: stands still, then a line of blasts in front of it (harder the farther out). */
  strike(t, s, ab) {
    const target = this.findTarget(t, s, t.x, t.z, ab.gap * (ab.damages.length + 1));
    const aim = target ? Math.atan2(target.x - t.x, target.z - t.z) : t.yaw;
    t.yaw = aim;
    t.parryT = ab.windup;
    const det = this.detects(t, s);
    ab.damages.forEach((damage, i) => {
      const d = ab.gap * (i + 1);
      this.shells.push({ tower: t.id, x: t.x + Math.sin(aim) * d, z: t.z + Math.cos(aim) * d, time: ab.windup + i * 0.12, damage, radius: ab.radius, det });
    });
  }

  /** Ice Apprentice Ice Meteor: crashes down on a zombie in range after `delay` s, freezing the area. */
  iceMeteor(t, s, ab) {
    const e = this.findTarget(t, s, t.x, t.z, s.range * buffOf(this.buffs, t.id).range);
    if (!e) return;
    this.shells.push({ tower: t.id, enemy: e.id, x: e.x, z: e.z, time: ab.delay, damage: ab.damage, radius: ab.radius, freeze: ab.freeze, det: this.detects(t, s), ignoreExplosiveResist: true });
    this.events.push({ k: 'missile', t: t.id, e: e.id, i: 0, d: ab.delay });
  }

  /** Ice Apprentice Blizzard: hits and freezes every zombie around it every `tick` s. */
  updateBlizzard(t, s, dt) {
    const ab = s.abilities.find((a) => a.key === 'blizzard');
    t.blizT = (t.blizT ?? 0) - dt;
    if (t.blizT > 0) return;
    t.blizT = ab.tick;
    this.explode(t, t.x, t.z, { damage: ab.damage, radius: ab.radius, freeze: ab.freeze, det: this.detects(t, s), ignoreExplosiveResist: true });
  }

  /** Spiritual Advocate: souls held (0..max). t.charge shows the meter in the panel. */
  setSouls(t, s, n) {
    if (!s.soul) return;
    t.soulN = Math.max(0, Math.min(s.soul.max, n));
    t.charge = t.soulN / s.soul.max;
  }

  /** Spiritual Advocate: `gain` souls for every `per` damage its projectiles deal. */
  soulGain(t, dmg) {
    const s = TOWERS[t.type].levels[t.level];
    if (!s.soul) return;
    t.soulAcc = (t.soulAcc || 0) + dmg;
    while (t.soulAcc >= s.soul.per) {
      t.soulAcc -= s.soul.per;
      this.setSouls(t, s, (t.soulN || 0) + s.soul.gain);
    }
  }

  /** Spiritual Advocate Beam mode: a laser at one zombie while souls last, then back to Auto. */
  updateSoulBeam(t, s, dt) {
    const ab = s.abilities.find((a) => a.key === 'soulBeam');
    if (!(t.soulN > 0)) {
      t.choice = [];
      return;
    }
    const target = this.findTarget(t, s, t.x, t.z, s.toss?.range ?? s.range);
    if (!target) {
      t.sbT = 0;
      return;
    }
    t.yaw = Math.atan2(target.x - t.x, target.z - t.z);
    this.setSouls(t, s, t.soulN - ab.drain * dt);
    t.sbT = (t.sbT ?? 0) - dt;
    if (t.sbT > 0) return;
    t.sbT = ab.tick;
    this.events.push({ k: 'shot', t: t.id, e: target.id });
    this.damage(t, target, ab.damage);
  }

  /** Hunter Collateral: the shot bounces to the closest few zombies near where it hit (normal damage). */
  collateralBounce(t, s, c) {
    const det = this.detects(t, s);
    const r2max = s.collateral.jump * s.collateral.jump;
    const d2 = (e) => (e.x - c.x) ** 2 + (e.z - c.z) ** 2;
    const list = [...this.enemies.values()].filter((e) => e.id !== c.main && canHit(det, e) && d2(e) <= r2max).sort((a, b) => d2(a) - d2(b)).slice(0, s.collateral.jumps);
    for (const e of list) {
      this.events.push({ k: 'shot', t: t.id, e: e.id });
      this.damage(t, e, s.damage);
    }
  }

  /** Slugger baseball: stuns the zombie it hits (bosses are only slowed); a flashbang stuns everything near it. */
  baseball(t, b, e) {
    const one = (z) => {
      if (!this.enemies.has(z.id)) return;
      if (!z.boss) return this.stop({ bossStop: 0 }, z, b.stun, 'stun');
      if (!b.bossSlow || z.statusImmune) return;
      z.thornSlow = Math.max(z.thornT > 0 ? z.thornSlow : 0, b.bossSlow);
      z.thornT = Math.max(z.thornT || 0, b.stun);
    };
    if (!b.flash) return one(e);
    const x = e.x;
    const z0 = e.z;
    this.events.push({ k: 'boom', x: r2(x), z: r2(z0), r: b.flash });
    for (const z of [...this.enemies.values()]) {
      if (!canHit(b.det, z) || (z.x - x) ** 2 + (z.z - z0) ** 2 > b.flash * b.flash) continue;
      if (z !== e) this.damage(t, z, b.damage);
      one(z);
    }
  }

  updateLemon(t, s, b, dt) {
    if (t.holo) return;
    const r = s.range * b.range;
    let n = 0;
    for (const e of this.enemies.values()) {
      if (e.remains || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > r * r) continue;
      if (++n >= s.lemon.cap) break;
    }
    if (n) t.lemonAcc = (t.lemonAcc || 0) + n * s.lemon.pay * dt;
    t.lemonT = (t.lemonT || 0) + dt;
    if (t.lemonT < 2 || !(t.lemonAcc >= 1)) return;
    const v = Math.floor(t.lemonAcc);
    t.lemonAcc -= v;
    t.lemonT = 0;
    const owner = this.players.get(t.owner);
    if (owner) owner.cash += v;
    this.events.push({ k: 'income', id: t.id, owner: t.owner, v, x: t.x, z: t.z });
  }

  /** Hotdog Frank / Mako: a melee hit on the target and every zombie within `area` of it. Mako's hit is stronger the longer it charged. */
  areaHit(t, def, s, target) {
    let dmg = s.damage;
    let big = false;
    if (s.charge) {
      const f = Math.min(1, (t.chargeT || 0) / s.charge.time);
      dmg = Math.round((s.damage + (s.charge.max - s.damage) * f) * 100) / 100;
      big = f >= 0.5;
      t.chargeT = 0;
    }
    this.events.push({ k: 'shot', t: t.id, e: target.id, ...(big ? { c: 2 } : {}) });
    const det = this.detects(t, s);
    const hit = [target];
    const r2max = s.area * s.area;
    for (const e of this.enemies.values()) if (e !== target && canHit(det, e) && (e.x - target.x) ** 2 + (e.z - target.z) ** 2 <= r2max) hit.push(e);
    for (const e of hit) {
      if (!this.enemies.has(e.id)) continue;
      if (e !== target) this.events.push({ k: 'slice', e: e.id });
      this.damage(t, e, dmg);
    }
  }

  /** Byte: shocks its target to `slow` for `time` s, or (Paralyze) stops it. */
  byteZap(t, def, s, target) {
    const sh = s.shock;
    this.events.push({ k: 'zap', t: t.id, es: [target.id] });
    if (s.damage) {
      // Golden Byte: real damage, then a shock only if the zombie is one it may shock and isn't already.
      this.damage(t, target, s.damage);
      if (!this.enemies.has(target.id) || target.shockT > 0 || target.stop > 0 || target.statusImmune || target.shockImmune || (sh.maxHp != null && target.maxHp > sh.maxHp)) return;
    }
    if (sh.paralyze) {
      this.stop(def, target, sh.time, 'stun');
      return;
    }
    target.shock = sh.slow;
    target.shockT = target.boss ? sh.time * (def.bossStop ?? 1) : sh.time;
  }

  /** Maitake: every throw heals summons in range, (Lv 4+) frees stunned towers in range, (Lv 5) leaves a poison cloud. */
  flask(t, s, target) {
    const f = s.flask;
    const r2max = s.range * s.range;
    if (f.heal) {
      for (const u of this.units.values()) {
        if (u.def.point || u.hp >= u.maxHp || (u.x - t.x) ** 2 + (u.z - t.z) ** 2 > r2max) continue;
        u.hp = Math.min(u.maxHp, u.hp + f.heal);
      }
    }
    if (f.unstun) for (const o of this.towers.values()) if (o.stunT > 0 && (o.x - t.x) ** 2 + (o.z - t.z) ** 2 <= r2max) o.stunT = 0;
    if (f.linger) {
      const po = s.poison;
      const c = { id: this.nextId++, tower: t.id, kind: 'gas', x: target.x, z: target.z, land: 0, radius: 4, left: f.linger, dps: po.damage / po.tick, time: 1.5, targets: 99, hits: new Set(), det: this.detects(t, s) };
      this.traps.set(c.id, c);
    }
  }

  /** Dumpster Child: a damage-over-time effect of its own kind (different kinds stack, the same kind refreshes). */
  applyTaint(t, e, ta) {
    if (e.statusImmune || (ta.kind === 'burn' && e.fireImmune)) return;
    const old = e.taints?.get(ta.kind);
    if (old && old.damage / old.tick > ta.damage / ta.tick) {
      old.left = Math.max(old.left, ta.time);
      return;
    }
    (e.taints ??= new Map()).set(ta.kind, { damage: ta.damage, tick: ta.tick, left: ta.time, next: old?.left > 0 ? old.next : ta.tick, by: t.id });
  }

  /** Nuki Launcher: where a shell lands, a Nuki stays on the path to fight. */
  landNuki(sh) {
    const t = this.towers.get(sh.tower);
    if (!t) return;
    const u = this.spawnUnit(t, sh.nuki, 0, path.project(sh.x, sh.z), path.lastRoute);
    u.lateral = (Math.random() - 0.5) * 2.4;
    this.placeUnit(u);
    this.events.push({ k: 'sprout', x: r2(u.x), z: r2(u.z) });
  }

  /** Stella: paints a drawing near the path while a zombie is in range (the type she has the fewest of). */
  updateStella(t, s, dt) {
    t.spawnT -= dt;
    if (t.spawnT > 0) return;
    const mine = this.unitsOf(t.id);
    if (mine.length >= s.maxDrawings || !this.anyNear(t.x, t.z, s.range, SEE_ALL)) {
      t.spawnT = 0;
      return;
    }
    if (t.spotsR !== s.range) {
      t.spots = this.trapSpots(t, s.range);
      t.spotsR = s.range;
    }
    if (!t.spots.length) return;
    t.spawnT = s.drawEvery;
    let pick = s.drawings[0];
    let fewest = Infinity;
    for (const d of s.drawings) {
      const n = mine.filter((u) => u.def.name === d.name).length;
      if (n <= fewest) {
        fewest = n;
        pick = d; // ties go to the newest drawing
      }
    }
    const spot = t.spots[Math.floor(Math.random() * t.spots.length)];
    const u = this.spawnUnit(t, pick, 0, spot.d, spot.r);
    u.lateral = (Math.random() - 0.5) * 2.4;
    this.placeUnit(u);
    t.yaw = Math.atan2(u.x - t.x, u.z - t.z);
    this.events.push({ k: 'sprout', x: r2(u.x), z: r2(u.z), paint: 1 });
  }

  /**
   * Crows (Hayes) and bees (Buzzer) fly freely: crows anywhere on the map (the zombie closest to
   * the base), bees only after zombies inside their Buzzer's range (the closest one). Each peck or
   * sting uses one of its `hits`; then it dies. With nothing to chase they circle over their tower.
   */
  updateFree(u, tower, dt) {
    const d = u.def;
    if (d.point || !tower) return; // Volt Points just sit there
    u.cooldown = Math.max(-dt, u.cooldown - dt * u.rate);
    const det = unitDetection(d);
    const leash = d.bee ? TOWERS[tower.type].levels[tower.level].range : 0;
    const ok = (e) => !!e && this.enemies.has(e.id) && !e.remains && canHit(det, e) && (!leash || (e.x - tower.x) ** 2 + (e.z - tower.z) ** 2 <= leash * leash);
    let target = u.lock ? this.enemies.get(u.lock) : null;
    if (!ok(target)) {
      target = null;
      let best = Infinity;
      for (const e of this.enemies.values()) {
        if (!ok(e)) continue;
        const sc = d.crow ? -e.dist : (e.x - u.x) ** 2 + (e.z - u.z) ** 2;
        if (sc < best) {
          best = sc;
          target = e;
        }
      }
      u.lock = target ? target.id : 0;
    }
    let tx;
    let tz;
    if (target) {
      tx = target.x;
      tz = target.z;
    } else {
      u.idleA = (u.idleA ?? Math.random() * TAU) + dt * 1.6;
      tx = tower.x + Math.cos(u.idleA) * 3.5;
      tz = tower.z + Math.sin(u.idleA) * 3.5;
    }
    const dx = tx - u.x;
    const dz = tz - u.z;
    const dist = Math.hypot(dx, dz);
    const speed = target ? d.speed : d.speed * 0.35;
    if (dist > 0.05) {
      const k = Math.min(1, (speed * dt) / dist);
      u.x += dx * k;
      u.z += dz * k;
      u.yaw = Math.atan2(dx, dz);
    }
    u.speed = speed;
    if (!target || dist > d.gun.range) {
      u.cooldown = Math.max(0, u.cooldown);
      return;
    }
    if (u.cooldown > 0) return;
    u.cooldown += d.gun.cooldown;
    this.events.push({ k: 'ushot', u: u.id, e: target.id, i: 0 });
    this.damage(tower, target, d.gun.damage, false, 'none');
    u.left = (u.left ?? d.hits) - 1;
    if (u.left <= 0) this.destroyUnit(u, tower);
  }

  /** Chaos Jester: every `chaos.every` s of wave time, one random thing happens. */
  updateChaos(t, s, dt) {
    if (this.wave.state !== 'wave') return;
    const c = s.chaos;
    t.chaosT = (t.chaosT ?? c.every) - dt;
    if (t.chaosT > 0) return;
    t.chaosT = c.every;
    let roll = Math.random() * Object.values(c.w).reduce((a, b) => a + b, 0);
    let pick = 'unit';
    for (const [k, w] of Object.entries(c.w)) {
      if ((roll -= w) < 0) {
        pick = k;
        break;
      }
    }
    const say = (text, color) => this.events.push({ k: 'chaos', x: t.x, z: t.z, text, color });
    const owner = this.players.get(t.owner);
    const randInt = ([a, b]) => Math.round((a + Math.random() * (b - a)) / 50) * 50;
    if (pick === 'enemy') {
      const types = [...new Set(waveGroups(this.wave.index, this.waves).map((g) => g[0]))].filter((k) => !ENEMIES[k].boss);
      if (types.length) {
        this.spawn(types[Math.floor(Math.random() * types.length)]);
        return say('🃏 An extra zombie!', '#ff8a80');
      }
      pick = 'unit';
    }
    if (pick === 'unit') {
      const u = c.units[Math.floor(Math.random() * c.units.length)];
      this.spawnUnits(t, u);
      return say(`🃏 ${u.name}!`, '#80d8ff');
    }
    if (pick === 'effect') {
      const fx = c.effects[Math.floor(Math.random() * c.effects.length)];
      const m = (c.super ? 2 : 1) * (1 + t.level * 0.5);
      for (const e of [...this.enemies.values()]) {
        if (e.remains || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > s.range * s.range) continue;
        if (fx === 'burn') this.ignite(e, t.id, 8 * m, 4, 0);
        else if (fx === 'poison') this.applyPoison(t, e, { damage: Math.round(3 * m), tick: 0.5, time: 8, slow: 0 });
        else if (fx === 'heal') e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.15);
        else if (fx === 'slow') this.applySlime(e, { slow: 0.4, time: 3 * (c.super ? 2 : 1), boss: 0.5 });
        else if (fx === 'freeze') this.stop({ bossStop: 0.3 }, e, 3 * (c.super ? 2 : 1), 'ice');
        else if (fx === 'paralyze') this.stop({ bossStop: 0.3 }, e, 2.5 * (c.super ? 2 : 1), 'stun');
      }
      this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r: s.range });
      const names = { burn: 'Burn', poison: 'Poison', heal: 'Heal (oops!)', slow: 'Slow', freeze: 'Freeze', paralyze: 'Paralyze' };
      return say(`🃏 ${c.super && fx !== 'heal' ? 'Super ' : ''}${names[fx]}!`, fx === 'heal' ? '#ff8a80' : '#e1bee7');
    }
    if (!owner) return;
    if (pick === 'steal') {
      const v = Math.min(owner.cash === Infinity ? Infinity : Math.max(0, owner.cash), randInt(c.steal));
      if (v !== Infinity) owner.cash -= v;
      return say(`🃏 Stole $${(v === Infinity ? 0 : v).toLocaleString()}!`, '#ff8a80');
    }
    const v = randInt(pick === 'jackpot' ? c.jackpot : c.cash);
    owner.cash += v;
    this.events.push({ k: 'income', id: t.id, owner: t.owner, v, x: t.x, z: t.z });
    say(pick === 'jackpot' ? '🃏 JACKPOT!' : '🃏 Free cash!', '#ffd740');
  }

  // ---------------------------------------------------------------- Ninja

  /** Ninja Dummyjitsu: while nothing is in range it saves up one shuriken every `cooldown` s, up to `store`. */
  ninjaRest(t, s, dt) {
    const max = s.ninja.store || 0;
    t.stash ||= 0;
    if (t.stash >= max) {
      t.stashT = 0;
      return;
    }
    t.stashT = (t.stashT || 0) + dt;
    while (t.stashT >= s.cooldown && t.stash < max) {
      t.stashT -= s.cooldown;
      t.stash++;
    }
  }

  /** Ninja Lightweight Shurikens: the zombie it was targeting died to it, so it gets shurikens back. */
  ninjaKill(t) {
    const n = TOWERS[t.type]?.levels[t.level]?.ninja;
    if (n?.refill) t.stash = Math.min(n.store, (t.stash || 0) + n.refill);
  }

  /** Ninja Shirayuki Shuriken: a giant shuriken lands on the path at its target (or the path closest to it). */
  throwShirayuki(t, s, ab) {
    const e = this.findTarget(t, s, t.x, t.z, s.range, null);
    const p = this.nearestPathPoint(e ? e.x : t.x, e ? e.z : t.z);
    if (!p) return;
    const id = this.nextId++;
    this.traps.set(id, { id, tower: t.id, kind: 'blade', x: p.x, z: p.z, land: 0, radius: ab.radius, left: ab.time,
      damage: s.damage * ab.mult, tick: ab.tick, next: 0, drift: ab.drift });
    t.yaw = Math.atan2(p.x - t.x, p.z - t.z);
  }

  /**
   * The giant shuriken spins in place, drifting slowly toward the nearest zombie close by, and hits
   * every zombie under it every `tick` s. Its hits ignore all resistance.
   */
  spinBlade(p, dt) {
    if ((p.left -= dt) <= 0) {
      this.traps.delete(p.id);
      this.events.push({ k: 'trapGone', id: p.id, kind: p.kind, x: r2(p.x), z: r2(p.z) });
      return;
    }
    let best = null;
    let bestD = (p.radius * 3) ** 2;
    for (const e of this.enemies.values()) {
      const d = (e.x - p.x) ** 2 + (e.z - p.z) ** 2;
      if (d < bestD) {
        best = e;
        bestD = d;
      }
    }
    if (best && bestD > 0.04) {
      const d = Math.sqrt(bestD);
      const step = Math.min(d, p.drift * dt);
      p.x += ((best.x - p.x) / d) * step;
      p.z += ((best.z - p.z) / d) * step;
    }
    if ((p.next -= dt) > 0) return;
    p.next += p.tick;
    const tower = this.towers.get(p.tower) ?? null;
    this.trueHit = true;
    for (const e of [...this.enemies.values()]) {
      if ((e.x - p.x) ** 2 + (e.z - p.z) ** 2 <= p.radius * p.radius) this.damage(tower, e, p.damage);
    }
    this.trueHit = false;
  }

  // ---------------------------------------------------------------- Bomber

  /**
   * Bomber: lobs a bomb at its target every `cooldown` s that blows up in `radius` where it lands.
   * While nothing is in range it lays a bomb on the path in range instead, up to `bomber.bombs`
   * lying there at once (they go off when a zombie walks over them).
   */
  updateBomber(t, def, s) {
    const target = this.findTarget(t, s, t.x, t.z, s.range, null);
    if (target) t.yaw = Math.atan2(target.x - t.x, target.z - t.z);
    if (t.cooldown > 0) return;
    if (target) {
      t.cooldown += s.cooldown;
      const time = this.flyTime(t, s, target);
      this.flights.push({ tower: t.id, type: t.type, enemy: target.id, time, boom: { damage: this.bombDamage(t, s), radius: s.radius, det: this.detects(t, s) } });
      this.events.push({ k: 'fly', t: t.id, e: target.id, d: r2(time) });
      return;
    }
    if (t.spotsR !== s.range) {
      t.spots = this.trapSpots(t, s.range);
      t.spotsR = s.range;
    }
    let laid = 0;
    for (const tr of this.traps.values()) if (tr.tower === t.id && tr.kind === 'bomb') laid++;
    if (!t.spots.length || laid >= s.bomber.bombs) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.cooldown += s.cooldown;
    const spot = t.spots[Math.floor(Math.random() * t.spots.length)];
    const lat = (Math.random() - 0.5) * 2;
    const x = spot.x - spot.dz * lat;
    const z = spot.z + spot.dx * lat;
    const id = this.nextId++;
    this.traps.set(id, { id, tower: t.id, kind: 'bomb', x, z, land: TRAP_FLIGHT, uses: 1, hits: new Set(), damage: this.bombDamage(t, s), radius: s.radius,
      det: { ...this.detects(t, s), flying: false } });
    t.yaw = Math.atan2(x - t.x, z - t.z);
    this.events.push({ k: 'trapThrow', t: t.id, x: r2(x), z: r2(z), d: TRAP_FLIGHT });
  }

  /**
   * Incinerator: attacks one zombie every `cooldown` s and sets it on fire (stronger with Heat;
   * from Lv 3 a smaller splash too). Each attack adds Heat; it cools off when idle or while Cool
   * Down is on (no attacks then). At 100 Heat it loses health fast until Cool Down brings the Heat
   * back down, or it dies and blows up (overheatBlast in tower-health.js). t.charge = Heat / 100.
   */
  updateIncinerator(t, def, s, dt) {
    const h = def.heat;
    const ic = s.incin;
    t.heat ??= 0;
    t.idleT = (t.idleT || 0) + dt;
    if (t.cooling) t.heat = Math.max(0, t.heat - h.cool * ic.cool * dt);
    else if (t.heat >= 100) this.hurtTower(t, t.maxHp * h.drain * dt, false, true);
    else if (t.idleT > h.wait) t.heat = Math.max(0, t.heat - h.decay * ic.cool * dt);
    t.charge = t.heat / 100;
    if (!this.towers.has(t.id) || t.hp <= 0) return;
    const target = this.findTarget(t, s, t.x, t.z, s.range, null);
    if (target) t.yaw = Math.atan2(target.x - t.x, target.z - t.z);
    if (t.cooling || !target || t.cooldown > 0) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.cooldown += s.cooldown;
    t.idleT = 0;
    t.heat = Math.min(100, t.heat + h.gain);
    t.charge = t.heat / 100;
    const dps = (ic.burn / ic.tick) * (1 + t.heat / 100);
    const x = target.x;
    const z = target.z;
    this.shoot(t, target, s.damage);
    if (this.enemies.has(target.id)) this.ignite(target, t.id, dps, ic.time, 0);
    if (ic.aoe) this.explode(t, x, z, { damage: 0, splash: s.damage * 0.5, radius: ic.aoe, det: this.detects(t, s), main: target.id, burn: dps * 0.5, burnTime: ic.time });
  }

  /** Bomber Dynamites: every 4th bomb (thrown or laid) deals `bomber.fourth` x damage. */
  bombDamage(t, s) {
    t.bombN = (t.bombN || 0) + 1;
    return t.bombN % 4 === 0 ? s.damage * s.bomber.fourth : s.damage;
  }

  /** Bomber Time Bomb: a big bomb lands on the path at its target (or the path closest to it) and blows up after `fuse` s. */
  throwTimeBomb(t, s, ab) {
    const e = this.findTarget(t, s, t.x, t.z, s.range, null);
    const p = this.nearestPathPoint(e ? e.x : t.x, e ? e.z : t.z);
    if (!p) return;
    const id = this.nextId++;
    this.traps.set(id, { id, tower: t.id, kind: 'tbomb', x: p.x, z: p.z, land: TRAP_FLIGHT, fuse: ab.fuse, uses: 1, hits: new Set(), damage: ab.damage, radius: ab.radius,
      det: this.detects(t, s) });
    t.yaw = Math.atan2(p.x - t.x, p.z - t.z);
    this.events.push({ k: 'trapThrow', t: t.id, x: r2(p.x), z: r2(p.z), d: TRAP_FLIGHT });
  }

  // ---------------------------------------------------------------- Berserker

  /**
   * Berserker, after each axe hit at `at` ({ x, z, weak }: where its target was, and whether it
   * had Physical Weakness). Rage: +1 stack (more on weakened zombies), kept while it keeps
   * hitting. Crushing Blow: every `crush.every`th hit slams the ground there.
   */
  berserkHit(t, s, at) {
    if (s.rage) {
      t.rage = Math.min(s.rage.max, (t.rage || 0) + (at.weak ? s.rage.weakStacks : 1));
      t.rageT = s.rage.idle;
    }
    t.crushN = (t.crushN || 0) + 1;
    if (t.crushN % s.crush.every) return;
    const dmg = Math.round(s.damage * (1 + (s.rage ? s.rage.per * (t.rage || 0) : 0)) * 100) / 100;
    this.crushSlam(t, s, at.x, at.z, dmg, s.crush.time);
    // Brutalist Aftershock: at full Rage a second, weaker slam follows a moment later.
    if (s.crush.after && s.rage && t.rage >= s.rage.max) t.after = { x: at.x, z: at.z, dmg: Math.round(dmg * 50) / 100, time: s.crush.time / 2, left: 0.4 };
  }

  /** Berserker Crushing Blow: hits every zombie within `crush.radius` of (x, z) and adds Physical Weakness for `time` s. */
  crushSlam(t, s, x, z, dmg, time) {
    const c = s.crush;
    const det = this.detects(t, s);
    const r2max = c.radius * c.radius;
    this.events.push({ k: 'quake', x: r2(x), z: r2(z), r: c.radius, c: 0xff2a2a });
    for (const e of [...this.enemies.values()]) {
      if (!canHit(det, e) || (e.x - x) ** 2 + (e.z - z) ** 2 > r2max) continue;
      this.damage(t, e, dmg);
      if (!this.enemies.has(e.id)) continue;
      // A Lv 4 Berserker can push it past a lower level's cap; a lower level never brings it down.
      e.physWeak = Math.max(e.physWeak || 0, Math.min(c.cap, (e.physWeak || 0) + c.weak));
      e.physWeakT = Math.max(e.physWeakT || 0, time);
    }
  }

  /** Berserker Aftershock: the second slam, `t.after` ({ x, z, dmg, time }). */
  aftershock(t, s) {
    const a = t.after;
    t.after = null;
    if (s.crush) this.crushSlam(t, s, a.x, a.z, a.dmg, a.time);
  }

  // ---------------------------------------------------------------- Priest

  /** Priest: towers it can bless (in its range, attacking towers only), closest first. */
  priestTargets(t, s) {
    const r2max = s.aura * s.aura;
    const out = [];
    for (const o of this.towers.values()) {
      const d = TOWERS[o.type];
      if (o === t || d.kind === 'support' || d.kind === 'income' || d.noBuff || d.noDmgBuff) continue;
      const d2 = (o.x - t.x) ** 2 + (o.z - t.z) ** 2;
      if (d2 <= r2max) out.push([o, d2]);
    }
    return out.sort((a, b) => a[1] - b[1] || a[0].id - b[0].id).map(([o]) => o);
  }

  /** Priest: keeps blessing the same tower while it can, else the closest one. */
  updatePriest(t, s) {
    const list = this.priestTargets(t, s);
    const p = list.find((o) => o.id === t.lock) ?? list[0] ?? null;
    t.lock = p ? p.id : 0;
    if (p) t.yaw = Math.atan2(p.x - t.x, p.z - t.z);
  }

  /** Priest Change Target: bless the next tower in range (by distance, going round). */
  priestNext(t, s) {
    const list = this.priestTargets(t, s);
    if (!list.length) return;
    const i = list.findIndex((o) => o.id === t.lock);
    t.lock = list[(i + 1) % list.length].id;
  }

  // ---------------------------------------------------------------- Farmer

  /** Farmers get their paychecks for the wave when it starts (unused ones are kept). */
  loadPaychecks() {
    for (const t of this.towers.values()) {
      const s = TOWERS[t.type].levels[t.level];
      if (s.pay && !t.holo) t.payN = (t.payN || 0) + s.pay.count;
    }
  }

  /**
   * Farmer: pays one paycheck every `pay.every` s while a wave is on (faster near a Lv 3+
   * Farmer). During Rice From The Void it swings at zombies instead and pays nothing.
   */
  updateFarmer(t, s, dt) {
    const rice = t.active > 0 ? s.abilities?.find((a) => a.key === 'riceVoid') : null;
    if (rice) {
      t.swingT = (t.swingT || 0) - dt;
      if (t.swingT > 0) return;
      const e = this.findTarget(t, s, t.x, t.z, rice.reach);
      if (!e) {
        t.swingT = 0;
        return;
      }
      t.swingT = rice.swing;
      t.yaw = Math.atan2(e.x - t.x, e.z - t.z);
      this.events.push({ k: 'shot', t: t.id, e: e.id });
      this.damage(t, e, rice.damage);
      return;
    }
    if (this.wave.state !== 'wave' || !(t.payN > 0)) return;
    // Farmers Organization: other Farmers nearby pay faster (the best one counts).
    let org = 0;
    for (const o of this.towers.values()) {
      const os = TOWERS[o.type].levels[o.level];
      if (o !== t && os.organize && (o.x - t.x) ** 2 + (o.z - t.z) ** 2 <= os.range * os.range) org = Math.max(org, os.organize);
    }
    t.payT = (t.payT || 0) + dt * (1 + org);
    if (t.payT < s.pay.every) return;
    t.payT -= s.pay.every;
    t.payN--;
    const owner = this.players.get(t.owner);
    if (!owner) return;
    owner.cash += s.pay.cash;
    this.events.push({ k: 'income', id: t.id, owner: t.owner, v: s.pay.cash, x: t.x, z: t.z });
  }

  /** Farmer Rice From The Void: every paycheck it has left, paid now at `cut` less. */
  riceVoid(t, s, ab) {
    const v = Math.floor((t.payN || 0) * s.pay.cash * (1 - ab.cut));
    t.payN = 0;
    t.payT = 0;
    t.swingT = 0;
    const owner = this.players.get(t.owner);
    if (!owner || v <= 0) return;
    owner.cash += v;
    this.events.push({ k: 'income', id: t.id, owner: t.owner, v, x: t.x, z: t.z });
  }

  // ---------------------------------------------------------------- Bandit

  /**
   * Bandit: its sword swings on its own timer (firerate boosts speed it up), hitting every zombie
   * within `slash.radius` in front of it (an `arc` wide, centred on the closest one), but only
   * when at least `slash.min` zombies are that close.
   */
  banditSlash(t, s, b, dt) {
    const sl = s.slash;
    t.slashT = (t.slashT || 0) - dt * b.rate;
    if (t.slashT > 0) return;
    const det = this.detects(t, s);
    const r2max = sl.radius * sl.radius;
    const near = [];
    for (const e of this.enemies.values()) {
      const d2 = (e.x - t.x) ** 2 + (e.z - t.z) ** 2;
      if (d2 <= r2max && canHit(det, e)) near.push([e, d2]);
    }
    if (near.length < sl.min) {
      t.slashT = 0;
      return;
    }
    near.sort((a, c) => a[1] - c[1]);
    const face = Math.atan2(near[0][0].x - t.x, near[0][0].z - t.z);
    t.slashT = sl.cooldown;
    t.yaw = face;
    for (const [e] of near) {
      let da = Math.atan2(e.x - t.x, e.z - t.z) - face;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) <= sl.arc / 2) this.damage(t, e, sl.damage);
    }
    this.events.push({ k: 'gsword', id: t.id, x: r2(t.x), z: r2(t.z), r: sl.radius, c: 0x2979ff });
  }

  /**
   * Eradicator Raybreak: charges for `windup` s, then fires a beam (plus `extra` wild ones) that
   * stays `linger` s and hits every zombie inside it once. Aims at what its orbs would shoot,
   * or else at what its targeting picks within the beam's own range.
   */
  updateRay(t, s, b, dt) {
    const r = s.ray;
    const reach = s.range * b.range; // range boosts reach the beam too
    t.rayLen = r.range * b.range;
    if (t.rays) this.rayTick(t, r, dt);
    if (t.rayCharge > 0) {
      let e = this.enemies.get(t.rayE);
      if (!e) {
        e = this.findTarget(t, s, t.x, t.z, reach) ?? this.findTarget(t, s, t.x, t.z, t.rayLen);
        if (!e) {
          t.rayCharge = 0; // nothing left to fire at: keep it ready
          return;
        }
        t.rayE = e.id;
      }
      t.yaw = Math.atan2(e.x - t.x, e.z - t.z);
      if ((t.rayCharge -= dt * b.rate) > 0) return;
      t.rayCharge = 0;
      this.rayFire(t, r, e);
      return;
    }
    t.rayT = (t.rayT || 0) - dt * b.rate;
    if (t.rayT > 0 || t.rays) return;
    const e = this.findTarget(t, s, t.x, t.z, reach) ?? this.findTarget(t, s, t.x, t.z, t.rayLen);
    if (!e) {
      t.rayT = 0;
      return;
    }
    t.rayE = e.id;
    t.rayCharge = r.windup;
    this.events.push({ k: 'rayCharge', id: t.id, x: r2(t.x), z: r2(t.z), d: r.windup });
  }

  /** Eradicator: the beams go out (the main one at `e`, the extra ones off to the sides). */
  rayFire(t, r, e) {
    const a = Math.atan2(e.x - t.x, e.z - t.z);
    const beams = [{ a, mult: 1 }];
    const ex = r.extra;
    if (ex) for (let i = 0; i < ex.count; i++) beams.push({ a: a + (i % 2 ? 1 : -1) * (0.18 + Math.random() * 0.22), mult: ex.mult });
    t.rays = beams.map((bm) => ({ dx: Math.sin(bm.a), dz: Math.cos(bm.a), mult: bm.mult, hit: new Set() }));
    t.rayLeft = r.linger;
    t.rayT = r.cooldown;
    t.rayCut = 0;
    this.events.push({ k: 'raybreak', id: t.id, x: r2(t.x), z: r2(t.z), len: r2(t.rayLen), w: r.width, d: r.linger,
      b: t.rays.map((bm) => [r2(bm.dx), r2(bm.dz)]) });
    this.rayTick(t, r, 0);
  }

  /** Eradicator: the beams hit every zombie inside them (once per beam) until they fade. */
  rayTick(t, r, dt) {
    const det = this.detects(t, TOWERS[t.type].levels[t.level]);
    const half = r.width / 2 + 0.5;
    for (const bm of t.rays) {
      for (const e of [...this.enemies.values()]) {
        if (bm.hit.has(e.id) || !canHit(det, e)) continue;
        const ox = e.x - t.x;
        const oz = e.z - t.z;
        const along = ox * bm.dx + oz * bm.dz;
        if (along < 0 || along > t.rayLen) continue;
        if (Math.abs(ox * bm.dz - oz * bm.dx) > half) continue;
        bm.hit.add(e.id);
        const hpNow = e.hp;
        this.damage(t, e, r.damage * bm.mult, false, 'laser');
        if (!this.enemies.has(e.id)) {
          // Kills make the next Raybreak come sooner (up to maxCut of the cooldown).
          const add = Math.min(r.cut || 0, r.maxCut - (t.rayCut || 0));
          if (add > 0) {
            t.rayCut = (t.rayCut || 0) + add;
            t.rayT -= r.cooldown * add;
          }
        } else if (r.burn) {
          const total = Math.min(r.burn.cap, hpNow * r.burn.share);
          if (total > 0) (e.rayBurn ??= []).push({ left: r.burn.time, dps: total / r.burn.time, by: t.id });
        }
      }
    }
    if ((t.rayLeft -= dt) <= 0) t.rays = null;
  }

  // ---------------------------------------------------------------- Mage

  /**
   * Mage, after every attack: its owner gets `s.arcana.gain` Arcana (up to `cap`). Stormbringer:
   * every 10th attack calls down `s.storm` lightning bolts, the target first, then other zombies
   * in range (the target again if there are none). Each one deals (damage + Arcana / 15) ^ 1.1
   * to every zombie within 3 + Arcana / 100.
   */
  mageHit(t, s, target) {
    const p = this.players.get(t.owner);
    // Never lowers it: Prophets can fill Arcana past a Mage's own cap.
    if (p) p.arcana = Math.max(p.arcana || 0, Math.min(s.arcana.cap, Math.round(((p.arcana || 0) + s.arcana.gain) * 100) / 100));
    if (!s.storm || ++t.swings % 10 !== 0) return;
    const ar = p?.arcana || 0;
    const det = this.detects(t, s);
    const damage = Math.round((s.damage + ar / 15) ** 1.1 * 100) / 100;
    const radius = 3 + ar / 100;
    const list = [target, ...this.findTargets(t, s, s.storm - 1, (e) => e !== target)];
    for (let i = 0; i < s.storm; i++) {
      const e = list[i] ?? target;
      const time = 0.12 + i * 0.08;
      this.shells.push({ tower: t.id, x: e.x, z: e.z, time, damage, radius, det });
      this.events.push({ k: 'mageBolt', x: r2(e.x), z: r2(e.z), r: r2(radius), d: r2(time) });
    }
  }

  /**
   * Mage Artificial Ascent: a blast at (x, z) for `ab.mult` x its damage, adding Magical ARTS to
   * every zombie in it. Its owner's Arcana makes the ARTS stronger and longer: up to 2x at 200.
   */
  arcaneBlast(t, s, ab, x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const more = 1 + (this.players.get(t.owner)?.arcana || 0) / 200;
    const arts = { add: ab.arts * more, time: ab.time * more, cap: ab.cap };
    this.shells.push({ tower: t.id, x, z, time: 0.4, damage: s.damage * ab.mult, radius: ab.radius, det: this.detects(t, s), arts });
    this.events.push({ k: 'arcaneBlast', t: t.id, x: r2(x), z: r2(z), r: ab.radius, d: 0.4 });
    t.yaw = Math.atan2(x - t.x, z - t.z);
  }

  /** Magical ARTS: `a.add` more damage taken from everything, adding up to `a.cap`, for `a.time` s. */
  addArts(e, a) {
    e.arts = Math.min(a.cap, (e.arts || 0) + a.add);
    e.artsT = Math.max(e.artsT || 0, a.time);
  }

  // ---------------------------------------------------------------- Ghost, Vindicator, Cryolator

  /**
   * Ghost Spectral Shot: every few seconds a strong shot at its target that puts a Ghost Mark on
   * it (more laser damage taken, no laser resistance). A shot on a zombie that was already marked
   * makes the next one come 1s sooner (down to `min`); one on an unmarked zombie starts over.
   */
  ghostSpectral(t, s, dt) {
    const sp = s.spectral;
    t.specT = (t.specT ?? sp.every) - dt;
    if (t.specT > 0) return;
    const target = this.findTargets(t, s, 1)[0];
    if (!target) {
      t.specT = 0;
      return;
    }
    const marked = target.gmT > 0;
    t.specCd = marked ? Math.max(sp.min, (t.specCd ?? sp.every) - 1) : sp.every;
    t.specT = t.specCd;
    t.yaw = Math.atan2(target.x - t.x, target.z - t.z);
    this.events.push({ k: 'shot', t: t.id, e: target.id, c: 1 });
    this.damage(t, target, s.damage * sp.mult);
    if (!this.enemies.has(target.id)) return;
    target.gm = Math.min(sp.cap, (marked ? target.gm : 0) + sp.mark);
    target.gmT = sp.time;
    if (sp.reveal && target.hidden) target.revealT = Math.max(target.revealT || 0, sp.time);
    if (sp.shock && !target.statusImmune && !target.shockImmune) {
      target.shock = Math.max(target.shockT > 0 ? target.shock : 0, target.boss ? sp.shock.boss : sp.shock.slow);
      target.shockT = Math.max(target.shockT || 0, sp.shock.time);
    }
  }

  /**
   * Vindicator Execution: a hit that leaves the zombie below `exec.at` of its health does `mult`
   * x damage (`first` x the first time any zombie is executed). `force`: always an Execution.
   * Each Execution adds a Slash (2 while Mass Lethality runs), once per swing or Slash.
   */
  execHit(t, s, e, dmg, force = false, gain = true) {
    const x = s.exec;
    if (!force && e.hp - dmg >= e.maxHp * x.at) return dmg;
    const first = !e.execd;
    e.execd = true;
    if (s.ml && gain && !force) this.addSlashes(t, s, t.mlOn ? 2 : 1);
    return dmg * (first ? Math.max(x.first, x.mult) : x.mult);
  }

  addSlashes(t, s, n) {
    t.slashes = Math.min(s.ml.max, (t.slashes || 0) + n);
    t.charge = t.slashes / s.ml.max;
  }

  /** Vindicator: the Mass Lethality button. */
  startMassLethality(t) {
    if (!(t.slashes > 0)) return;
    t.mlOn = true;
    t.mlT = 0;
    t.mlHit = new Set();
    t.mlBuff = 0;
    t.stunT = 0;
  }

  /**
   * Vindicator: saves up Slashes while Mass Lethality is off; while it's on, spends one every
   * `tick` s to hit every zombie in its second range, and can't be stunned.
   */
  updateVindicator(t, s, b, dt) {
    const ml = s.ml;
    t.slashes ??= 0;
    const det = this.detects(t, s);
    const reach = ml.range * b.range;
    const near = [];
    for (const e of this.enemies.values()) if (canHit(det, e) && (e.x - t.x) ** 2 + (e.z - t.z) ** 2 <= reach * reach) near.push(e);
    if (!t.mlOn) {
      if (near.length) t.idleT = 0;
      else if ((t.idleT = (t.idleT || 0) + dt) >= ml.idle.every) {
        t.idleT -= ml.idle.every;
        this.addSlashes(t, s, ml.idle.n);
      }
      if (ml.trickle && (t.trickT = (t.trickT || 0) + dt) >= ml.trickle) {
        t.trickT -= ml.trickle;
        this.addSlashes(t, s, 1);
      }
      if (ml.refresh && t.slashes >= ml.max) t.cd.massLethality = 0; // Mass Lethality X
      t.charge = t.slashes / ml.max;
      return;
    }
    t.immuneT = Math.max(t.immuneT || 0, ml.tick + 0.1);
    t.stunT = 0;
    if ((t.mlT -= dt) > 0) return;
    t.mlT = Math.max(0, t.mlT + ml.tick);
    if (!near.length) return this.endMassLethality(t, s); // nothing left near: it stops, the rest of the Slashes are kept
    t.slashes--;
    const last = t.slashes <= 0;
    let got = false;
    for (const e of near) {
      let dmg = s.damage * (1 + (t.mlBuff || 0));
      if (s.exec) {
        const before = t.slashes;
        dmg = this.execHit(t, s, e, dmg, last && ml.lastExec, !got);
        if (t.slashes !== before) got = true;
      }
      t.mlHit.add(e.id);
      this.damage(t, e, dmg);
      if (!this.enemies.has(e.id)) {
        if (ml.kill) this.addSlashes(t, s, ml.kill); // Deathstalker: kills give Slashes back
      } else if (ml.stalk) {
        // Deathstalker: +(10 - X)% damage, X = (damage boosts on it % - 60) / 15, from 0 to 8.
        const boost = ((b.dmg - 1) + t.mlBuff) * 100;
        t.mlBuff += (10 - Math.min(8, Math.max(0, (boost - 60) / 15))) / 100;
      }
    }
    this.events.push({ k: 'gsword', id: t.id, x: r2(t.x), z: r2(t.z), r: reach, c: 0xd500f9 });
    t.charge = Math.max(0, t.slashes) / ml.max;
    if (t.slashes <= 0) this.endMassLethality(t, s);
  }

  /** Vindicator: Mass Lethality ends with Echo Slashes: every zombie it cut that is still alive takes `max` more. */
  endMassLethality(t, s) {
    const ml = s.ml;
    for (const id of t.mlHit) {
      const e = this.enemies.get(id);
      if (e) this.damage(t, e, s.damage * ml.echo * ml.max * (1 + t.mlBuff));
    }
    t.slashes = Math.max(0, t.slashes);
    t.charge = t.slashes / ml.max;
    t.mlOn = false;
    t.mlHit = null;
    t.mlBuff = 0;
  }

  /**
   * Cryolator: freezes the zombie it hit (bosses never). A zombie it froze in the last 5s freezes
   * only half as long, unless `stack` is on. Then a slow of `slow` for as long again.
   */
  cryoFreeze(def, c, e) {
    if (!this.enemies.has(e.id)) return;
    const secs = !c.stack && e.cryoT > 0 ? c.freeze / 2 : c.freeze;
    this.iceFreeze(e, secs, { freezeBoss: def.bossStop ?? 0 });
    e.cryoT = 5;
    if (c.slow) this.applySlime(e, { slow: c.slow, time: secs * 2, boss: 1 });
  }

  // ---------------------------------------------------------------- Taser, Shinobi, Trickster

  /** Taser: zaps its target (and from Lv 2 every zombie in `radius` around it). */
  updateTaser(t, s) {
    const target = this.findTarget(t, s, t.x, t.z, s.range, null);
    if (target) t.yaw = Math.atan2(target.x - t.x, target.z - t.z);
    if (!target || t.cooldown > 0) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.cooldown += s.cooldown;
    const hit = [target];
    if (s.radius) {
      const det = this.detects(t, s);
      for (const e of this.enemies.values()) if (e !== target && canHit(det, e) && (e.x - target.x) ** 2 + (e.z - target.z) ** 2 <= s.radius * s.radius) hit.push(e);
    }
    this.events.push({ k: 'zap', t: t.id, es: hit.map((e) => e.id) });
    for (const e of hit) this.taserHit(t, s, e, e === target);
  }

  /**
   * One Taser zap: more damage the more Electrocuted the zombie is (from any Taser), then more
   * Electrocute, which wears off 5s after this zap. Small zombies it hits head-on are slowed, a bit less each time.
   */
  taserHit(t, s, e, main) {
    const tz = s.taser;
    const el = e.elec || 0;
    this.damage(t, e, s.damage * Math.min(tz.max, 1 + el));
    if (!this.enemies.has(e.id)) return;
    // Each zap's Electrocute lasts 5s on its own (e.elecS: [seconds left, amount]).
    const add = Math.min(tz.per, Math.max(0, tz.max - 1 - el)); // up to this Taser's max
    if (add > 0) {
      (e.elecS ??= []).push([5, add]);
      e.elec = el + add;
    }
    const sl = tz.slow;
    if (sl && main && !e.boss && (ENEMIES[e.type].scale ?? 1) <= 1.2) {
      const pct = sl.pct - sl.fade * (e.taseN || 0);
      e.taseN = (e.taseN || 0) + 1;
      if (pct > 0) this.applySlime(e, { slow: pct, time: sl.time, boss: 0 });
    }
  }

  /** Shinobi: the Blade Stance button. Bladestorm: it starts with a big cut on every zombie in range. */
  startBladeStance(t, s, ab) {
    t.bladeT = ab.duration;
    t.stunT = 0;
    t.immuneT = Math.max(t.immuneT || 0, ab.duration);
    const sh = s.shin;
    if (!sh.unsheath) return;
    const b = buffOf(this.buffs, t.id);
    const reach = s.range * b.range;
    const det = this.detects(t, s);
    for (const e of [...this.enemies.values()]) {
      if (!canHit(det, e) || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > reach * reach) continue;
      this.damage(t, e, s.damage * sh.unsheath * (1 + (sh.blade || 0)));
    }
    this.events.push({ k: 'gsword', id: t.id, x: r2(t.x), z: r2(t.z), r: reach, c: 0xff1744 });
  }

  /**
   * Shinobi: only attacks during Blade Stance (t.bladeT) or Senseless Stance (t.senseless).
   * Mental Focus (t.focus) builds while Blade Stance is ready and makes it swing faster.
   */
  updateShinobi(t, s, dt) {
    const sh = s.shin;
    t.focus ??= 0;
    if (t.bladeT > 0 && (t.bladeT -= dt) <= 0) {
      t.bladeT = 0;
      t.focus = 0; // Mental Focus is spent when Blade Stance ends
    }
    if (t.senseless) t.focus = Math.max(0, t.focus - dt); // fades fast
    else if (sh.focus && !(t.bladeT > 0) && !(t.cd.bladeStance > 0)) t.focus = Math.min(sh.focusMax, t.focus + sh.focus * dt);
    t.charge = sh.focusMax ? t.focus / sh.focusMax : 0;
    const blade = t.bladeT > 0;
    if (!blade && !t.senseless) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    if (t.focus > 0) t.cooldown -= dt * buffOf(this.buffs, t.id).rate * t.focus; // Mental Focus: faster swings
    const target = this.findTarget(t, s, t.x, t.z, s.range, null);
    if (target) t.yaw = Math.atan2(target.x - t.x, target.z - t.z);
    if (!target || t.cooldown > 0) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.cooldown += s.cooldown;
    let dmg = s.damage * (blade ? 1 + (sh.blade || 0) : 1);
    if (sh.hpPct) dmg += Math.min(sh.hpPct * target.hp, sh.hpCap * dmg); // Sensing Weakness
    this.shoot(t, target, dmg);
    if (sh.split) {
      // To Cut Through Life and Soul: `split` damage shared by every zombie in range.
      const list = this.findTargets(t, s, Infinity);
      const each = sh.split * (blade ? sh.splitBlade : 1) / Math.max(1, list.length);
      for (const e of list) if (this.enemies.has(e.id)) this.damage(t, e, each);
    }
  }

  /** Trickster: how many other Red towers its owner has in their loadout (or has built, without one). */
  redCount(t) {
    const p = this.players.get(t.owner);
    const keys = p?.loadout ?? [...new Set([...this.towers.values()].filter((o) => o.owner === t.owner).map((o) => o.type))];
    return keys.filter((k) => k !== t.type && TOWERS[k]?.red).length;
  }

  /** Trickster Knife Trick: shrugs off a stun, 1s stun immunity, +range (and Red tower boosts from Lv 4). */
  knifeTrick(t, k) {
    t.stunT = 0;
    t.immuneT = Math.max(t.immuneT || 0, 1);
    t.knifeN = Math.min(k.max, (t.knifeN || 0) + 1);
    if (k.red) t.redN = (t.redN || 0) + 1;
    t.charge = t.knifeN / k.max;
    this.events.push({ k: 'block', id: t.id, x: t.x, z: t.z, p: 1 });
  }

  /** Trickster: knives at up to `trick.targets` zombies in a wedge toward its target (a bit past its range too). */
  updateTrickster(t, s) {
    const tr = s.trick;
    const range = s.range * (1 + (t.knifeN || 0) * (tr.knife?.range || 0));
    const target = this.findTarget(t, s, t.x, t.z, range, null);
    if (target) t.yaw = Math.atan2(target.x - t.x, target.z - t.z);
    if (!target || t.cooldown > 0) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.cooldown += s.cooldown;
    const det = this.detects(t, s);
    const reach = range * 1.3;
    const near = [];
    for (const e of this.enemies.values()) {
      if (e === target || !canHit(det, e)) continue;
      const d2 = (e.x - t.x) ** 2 + (e.z - t.z) ** 2;
      if (d2 > reach * reach) continue;
      const a = Math.atan2(e.x - t.x, e.z - t.z) - t.yaw;
      if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) <= 0.45) near.push({ e, d2 });
    }
    near.sort((a, b) => a.d2 - b.d2);
    const hit = [target, ...near.slice(0, tr.targets - 1).map((n) => n.e)];
    const dmg = s.damage * (1 + (tr.scarlet || 0) * this.redCount(t)) * (hit.length === 1 && tr.single ? 1 + tr.single : 1);
    for (const e of hit) this.shoot(t, e, dmg);
  }
}
