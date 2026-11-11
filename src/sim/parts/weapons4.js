// Tower weapons, part 4 (the wave 10 towers): upkeep, scarecrows, strikes, souls, lemons, flasks,
// Stella's drawings, crows and bees that fly free, and the Chaos Jester.
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { ENEMIES, TOWERS, canHit, unitDetection, waveGroups } from '../../config.js';
import { path } from '../path.js';
import { SEE_ALL, TAU, buffOf, r2 } from './shared.js';

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
}
