// Tower weapons, part 1: swords, arrows, axes, knives, harpoons, first-person aiming, pursuit
// helicopters, missiles and shields.
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { ENEMIES, GAME, TOWERS, arrowModes, canHit, choicesOf } from '../../config.js';
import { angleDiff, lerpAngle } from '../../utils.js';
import { heightAt } from '../map.js';
import { AIM_TIMEOUT, FLY_HEIGHT, FPS_BACK, FPS_REACH, FPS_WIDTH, MISSILE_TIME, TAU, r2 } from './shared.js';

export class SimWeapons1 {

  /** Elite: how hot its gun is, 0 (fresh) to 1 (about to overheat). */
  heat(t, s) {
    return Math.max(0, Math.min(1, 1 - (t.ammo ?? s.ammo) / s.ammo));
  }

  /** Cyberblade Prototype Archaic: damage from `min` to `max` by the target's health (`max` from `at` up). */
  hpScaled(s, e) {
    const h = s.hpScale;
    return Math.round((h.min + (h.max - h.min) * Math.min(1, e.hp / h.at)) * 100) / 100;
  }

  /**
   * Lightbeamer Avarian Technology: its pellets build up on a zombie (per Lightbeamer); every
   * `combine.hits` of them blow up for `combine.damage` within `combine.radius`.
   */
  combinePellet(t, s, e) {
    const c = s.combine;
    e.pellets ??= new Map();
    const n = (e.pellets.get(t.id) ?? 0) + 1;
    if (n < c.hits) {
      e.pellets.set(t.id, n);
      return;
    }
    e.pellets.set(t.id, 0);
    this.explode(t, e.x, e.z, { damage: c.damage, radius: c.radius, det: this.detects(t, s), main: e.id });
  }

  /**
   * Goo Gunner hose / Cryo Blaster: every zombie within `s.spray` of a zombie it just hit (at
   * `at`) gets the same damage and on-hit effects, once per shot.
   */
  spray(t, def, s, hit, at) {
    const det = this.detects(t, s);
    const done = new Set(hit.map((e) => e.id));
    const r2max = s.spray * s.spray;
    for (const e of [...this.enemies.values()]) {
      if (done.has(e.id) || !canHit(det, e) || !at.some(([x, z]) => (e.x - x) ** 2 + (e.z - z) ** 2 <= r2max)) continue;
      if (s.damage) this.damage(t, e, s.damage);
      if (this.enemies.has(e.id)) this.hitEffects(t, def, s, e, 0);
    }
  }

  /**
   * Crossbower arrows: the on-hit effects of this arrow, or null if it has none. Arbalist arrows
   * take the next effect of `cycle` in turn (poison, fire, electric stun). Returns { s, stun }.
   */
  arrowFx(t, s) {
    if (s.cycle) {
      t.cycleN = ((t.cycleN ?? -1) + 1) % s.cycle.length;
      const c = s.cycle[t.cycleN];
      return { s: { ...s, poison: null, fire: null, ...c, cycle: null }, stun: c.stun || 0 };
    }
    return s.poison || s.poacher || s.freeze ? { s, stun: 0 } : null; // freeze: Ice Apprentice orbs
  }

  /**
   * Crossbower Power Poacher: blue fire on a zombie that isn't burning, a short slow on one that
   * is, and an explosion when `count`+ other zombies are within `near` of it.
   */
  poach(t, s, e) {
    const p = s.poacher;
    if (e.burn > 0) this.applySlime(e, p.slow);
    else this.ignite(e, t.id, p.fire.dps, p.fire.time, 0);
    let n = 0;
    for (const o of this.enemies.values()) if (o !== e && !o.flying && (o.x - e.x) ** 2 + (o.z - e.z) ** 2 <= p.near * p.near) n++;
    if (n >= p.count) this.explode(t, e.x, e.z, { damage: p.boom.damage, radius: p.boom.radius, det: this.detects(t, s), main: e.id });
  }

  /** What a single-target hit does besides damage. `t` may be null (sold while its shot flew). */
  hitEffects(t, def, s, target, stun) {
    if (s.poacher && t) this.poach(t, s, target);
    if (stun) this.stop(def, target, stun, 'stun');
    if (s.fire) this.ignite(target, t.id, s.fire.dps, s.fire.time, 0); // Jet Trooper Fire Rounds
    // Darter: some darts set the zombie on fire, some are electric and stun it (bosses too).
    if (s.fireDart && Math.random() < s.fireDart.chance) this.ignite(target, t?.id ?? 0, s.fireDart.dps, s.fireDart.time, 0);
    if (s.shockDart && Math.random() < s.shockDart.chance) this.stop({ bossStop: 1 }, target, s.shockDart.stun, 'stun');
    // Sleeter: every shot freezes the zombie it hits (bosses for `bossStop` of the time).
    if (s.freeze && !s.radius) this.iceFreeze(target, s.freeze, { freezeBoss: def.bossStop ?? 0, frostbite: s.frostbite, ignoreIceResist: s.ignoreIceResist });
    if (s.slime) this.applySlime(target, s.slime);
    if (s.chill && t) this.applyChill(t, s, target);
    if (s.harpoon) this.applyHarpoon(def, target, s.harpoon);
    if (s.cube && t) this.iceCube(t, s, target); // Glacier
    if (s.poison && t) this.applyPoison(t, target, s.poison); // Toxic Gunner, Marauder bleed, Maitake
    if (s.taint && t) this.applyTaint(t, target, s.taint); // Dumpster Child
    if (s.bees && t) this.applyBees(t, target, s.bees); // Swarmer
    if (s.bleed && t) this.applyBleed(t, def, target, s.bleed); // Slasher
    if (s.paraSlow && !target.statusImmune && !target.shockImmune) {
      // Paralyzer laser: every tick slows the zombie a bit more.
      target.paraSlow = Math.min(s.paraSlow.max, (target.paraT > 0 ? target.paraSlow || 0 : 0) + s.paraSlow.per);
      target.paraT = s.paraSlow.time;
    }
    // Frost Blaster: melts armor (the strongest melt so far wins, as with the Golden Pyromancer).
    if (s.melt && target.armor) target.armor = Math.min(target.armor, (ENEMIES[target.type].armor ?? 0) * (1 - s.melt));
    if (s.knock && this.enemies.has(target.id)) this.knockBack(target, s.knock); // Warlock beams
    if (s.element && t) {
      // Elementalist: Fire mode burns, Frost mode chills.
      const mode = choicesOf(def, s, t.choice)[0];
      if (mode === 'frost') this.applyChill(t, s.element.frost, target);
      else this.ignite(target, t.id, s.element.fire.dps, s.element.fire.time, 0);
    }
  }

  /** Warlock: every `sword.every` s it swings at up to `sword.targets` zombies within `sword.reach`. */
  swingSword(t, def, s, dt) {
    const sw = s.sword;
    t.swordT = (t.swordT ?? 0) - dt;
    if (t.swordT > 0) return;
    const list = this.findTargets(t, { ...s, range: sw.reach }, sw.targets);
    if (!list.length) {
      t.swordT = 0;
      return;
    }
    t.swordT = sw.every;
    t.yaw = Math.atan2(list[0].x - t.x, list[0].z - t.z);
    this.events.push({ k: 'shot', t: t.id, e: list[0].id });
    for (const e of list) {
      this.damage(t, e, sw.damage);
      if (sw.bleed && this.enemies.has(e.id)) this.applyBleed(t, def, e, sw.bleed);
    }
  }

  /**
   * Star Cannon: charges over `star.charge` s, then fires at its target once full, or sooner when the
   * shot at its current charge would already kill it. Then it reboots for `star.reboot` s.
   */
  updateStar(t, def, s, dt) {
    const st = s.star;
    if (t.starT > 0) {
      t.starT = Math.max(0, t.starT - dt);
      return;
    }
    t.charge = Math.min(1, (t.charge || 0) + dt / st.charge);
    const target = this.findTarget(t, s, t.x, t.z, s.range);
    if (!target) return;
    t.yaw = Math.atan2(target.x - t.x, target.z - t.z);
    const dmg = Math.round(st.min + (st.max - st.min) * t.charge);
    if (t.charge < 1 && dmg < target.hp) return;
    t.charge = 0;
    t.starT = st.reboot;
    const det = this.detects(t, s);
    const blast = (e) => {
      this.events.push({ k: 'shot', t: t.id, e: e.id });
      const x = e.x;
      const z = e.z;
      const hit = [...this.enemies.values()].filter((o) => canHit(det, o) && (o.x - x) ** 2 + (o.z - z) ** 2 <= s.radius * s.radius);
      this.explode(t, x, z, { damage: dmg, radius: s.radius, det, main: e.id, pierceArmor: true, nuke: s.radius >= 5 });
      if (st.stun) for (const o of hit) if (this.enemies.has(o.id)) this.stop({ bossStop: st.stunBoss ? 1 : 0 }, o, st.stun, 'stun');
    };
    blast(target);
    if (st.extra) for (const e of this.findTargets(t, s, st.extra + 1).filter((e) => e !== target).slice(0, st.extra)) if (this.enemies.has(e.id)) blast(e);
  }

  /** Star Cannon batteries: a kill may drop one, charging every Star Cannon a bit. */
  dropBattery(e) {
    for (const t of this.towers.values()) {
      const st = TOWERS[t.type].levels[t.level].star;
      if (!st || t.starT > 0 || t.charge >= 1 || Math.random() >= st.battery) continue;
      t.charge = Math.min(1, (t.charge || 0) + GAME.starBattery);
      this.events.push({ k: 'battery', t: t.id, x: r2(e.x), z: r2(e.z) });
    }
  }

  /**
   * Spotlight Tech: the light glides toward its target; every `cooldown` s it hurts every zombie
   * inside it (less near the rim), burns them, reveals hidden ones and, once charged, confuses them.
   */
  updateSpotlight(t, def, s, dt) {
    const sp = s.spot;
    if (t.lx == null) {
      t.lx = t.x;
      t.lz = t.z;
    }
    t.spotCd = Math.max(0, (t.spotCd || 0) - dt);
    const target = this.findTarget(t, s, t.x, t.z, s.range);
    if (target) {
      const dx = target.x - t.lx;
      const dz = target.z - t.lz;
      const d = Math.hypot(dx, dz);
      const step = Math.min(d, sp.speed * dt);
      if (d > 0) {
        t.lx += (dx / d) * step;
        t.lz += (dz / d) * step;
      }
      t.yaw = Math.atan2(t.lx - t.x, t.lz - t.z);
    }
    if (t.cooldown > 0) return;
    t.cooldown += s.cooldown;
    const det = this.detects(t, s);
    const r2max = sp.radius * sp.radius;
    const lit = [];
    for (const e of this.enemies.values()) {
      const d2 = (e.x - t.lx) ** 2 + (e.z - t.lz) ** 2;
      if (d2 > r2max) continue;
      if (sp.reveal && e.hidden && det.hidden) e.revealT = Math.max(e.revealT || 0, 0.5); // Hidden Reveal
      if (canHit(det, e)) lit.push([e, d2]);
    }
    if (!lit.length) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    let dealt = 0;
    for (const [e, d2] of lit) {
      const k = 1 - (1 - sp.edge) * Math.sqrt(d2 / r2max);
      const before = e.hp;
      this.damage(t, e, Math.round(s.damage * k * 100) / 100);
      dealt += before - Math.max(0, e.hp);
      if (s.ignite && this.enemies.has(e.id)) this.ignite(e, t.id, s.ignite.dps, s.ignite.time, 0);
    }
    if (sp.confuse && t.spotCd <= 0) {
      t.spotAcc = (t.spotAcc || 0) + dealt;
      if (t.spotAcc >= sp.confuse.charge) {
        t.spotAcc = 0;
        t.spotCd = sp.confuse.cd;
        for (const [e] of lit) this.confuse(e, sp.confuse.time, 0);
        this.events.push({ k: 'confuse', x: r2(t.lx), z: r2(t.lz), r: sp.radius });
      }
    }
  }

  /** Swarmer: one more bee sting stack on `e` (refreshes its oldest one when it has `b.stacks`). */
  applyBees(t, e, b) {
    const list = (e.bees ??= []);
    const sting = { damage: b.damage, tick: b.tick, left: b.time, next: b.tick, by: t.id };
    if (list.length < b.stacks) list.push(sting);
    else {
      let old = 0;
      for (let i = 1; i < list.length; i++) if (list[i].left < list[old].left) old = i;
      list[old] = sting;
    }
  }

  /**
   * Slasher: `n` more Bleed stacks on `e`. Stacks hurt a share of its max health every second;
   * at the tower's `bleedFx.max` they burst for `bleedFx.burst` of its max health and reset.
   */
  applyBleed(t, def, e, n) {
    const fx = def.bleedFx;
    if (!fx) return;
    e.bleed = Math.min(fx.max, e.bleed + n);
    e.bleedT = fx.time;
    e.bleedBy = t.id;
    e.bleedFx = fx;
    if (e.bleed < fx.max) return;
    e.bleed = 0;
    e.bleedT = 0;
    this.events.push({ k: 'bleedBurst', e: e.id });
    this.damage(t, e, e.maxHp * fx.burst * (e.boss ? fx.bossMult : 1), true);
  }

  /**
   * Executioner: an axe that hits `target`, then bounces `axe.bounces` times to the closest zombie
   * within `axe.jump` (never the one it just hit; unhit ones first, at most `axe.targets` different
   * ones). Every bounce does `axe.ramp` more damage. Lead zombies are skipped unless it sees lead.
   */
  throwAxe(t, s, target) {
    const a = s.axe;
    const det = this.detects(t, s);
    const hits = [target];
    const seen = new Set([target.id]);
    const j2 = a.jump * a.jump;
    let cur = target;
    for (let i = 0; i < a.bounces; i++) {
      let best = null;
      let bestD = Infinity;
      for (const e of this.enemies.values()) {
        if (e === cur || !canHit(det, e)) continue;
        const fresh = !seen.has(e.id);
        if (!fresh && seen.size < a.targets) continue; // go for new zombies while it can
        if (fresh && seen.size >= a.targets) continue;
        const d = (e.x - cur.x) ** 2 + (e.z - cur.z) ** 2;
        if (d <= j2 && d < bestD) {
          best = e;
          bestD = d;
        }
      }
      if (!best && seen.size < a.targets) {
        // No new zombie close by: bounce back to one it already hit.
        for (const e of this.enemies.values()) {
          if (e === cur || !seen.has(e.id)) continue;
          const d = (e.x - cur.x) ** 2 + (e.z - cur.z) ** 2;
          if (d <= j2 && d < bestD) {
            best = e;
            bestD = d;
          }
        }
      }
      if (!best) break;
      hits.push(best);
      seen.add(best.id);
      cur = best;
    }
    this.events.push({ k: 'bounce', t: t.id, es: hits.map((e) => e.id), axe: 1 });
    hits.forEach((e, i) => {
      if (this.enemies.has(e.id)) this.damage(t, e, s.damage + i * a.ramp);
    });
  }

  /**
   * Archer (Bowmaster): an arrow that hits `target` and bounces to the closest unhit zombie within
   * `bounce.jump`, `bounce.hits` zombies in all, with its current arrow type's extras.
   */
  bounceArrow(t, s, target) {
    const modes = arrowModes(s);
    const mode = modes[(t.track || 0) % modes.length]; // `track` doubles as its arrow type (it's in snapshots)
    const fx = mode === 'normal' ? null : s.arrows[mode];
    // Flame and Explosive arrows can bounce onto lead zombies (only the fire / blast hurts them).
    const det = { ...this.detects(t, s), ...(mode === 'flame' || mode === 'explosive' ? { lead: true } : {}) };
    const total = s.bounce.hits + (mode === 'flame' ? fx.extra : 0);
    const hits = [target];
    const seen = new Set([target.id]);
    const j2 = s.bounce.jump * s.bounce.jump;
    let cur = target;
    while (hits.length < total) {
      let best = null;
      let bestD = Infinity;
      for (const e of this.enemies.values()) {
        if (seen.has(e.id) || !canHit(det, e)) continue;
        const d = (e.x - cur.x) ** 2 + (e.z - cur.z) ** 2;
        if (d <= j2 && d < bestD) {
          best = e;
          bestD = d;
        }
      }
      if (!best) break;
      hits.push(best);
      seen.add(best.id);
      cur = best;
    }
    this.events.push({ k: 'bounce', t: t.id, es: hits.map((e) => e.id), ...(mode !== 'normal' ? { m: mode } : {}) });
    if (mode === 'explosive') this.explode(t, target.x, target.z, { damage: fx.damage, radius: fx.radius, det: { ...det, hidden: true } });
    const cfx = this.arrowFx(t, s); // Crossbower homing arrows: poison / cycling effects / Power Poacher
    hits.forEach((e, i) => {
      if (!this.enemies.has(e.id)) return;
      if (!e.lead || this.detects(t, s).lead) this.damage(t, e, s.damage);
      if (!this.enemies.has(e.id)) return;
      if (cfx) this.hitEffects(t, TOWERS[t.type], cfx.s, e, cfx.stun);
      if (!this.enemies.has(e.id)) return;
      if (mode === 'flame') this.ignite(e, t.id, fx.dps, fx.time, 0);
      if (mode === 'shock' && i < fx.targets) this.stop({}, e, fx.stun, 'stun');
    });
  }

  /** Sledger Aftershock: a second shockwave after a swing, for `aftershock.mult` of its damage. */
  aftershock(t, def, s) {
    if (!s.aftershock) return;
    const list = this.findTargets(t, s, s.targets);
    if (!list.length) return;
    this.events.push({ k: 'quake', x: r2(t.x), z: r2(t.z), r: s.range });
    for (const e of list) {
      this.damage(t, e, s.damage * s.aftershock.mult);
      if (this.enemies.has(e.id)) this.hitEffects(t, def, { ...s, chill: 0 }, e, 0); // refreshes the chill without adding to it
    }
  }

  /** Seconds a `fly` tower's projectile takes from `t` to `e` (a level's `speed` overrides `def.fly`). */
  flyTime(t, s, e) {
    const speed = s.speed ?? TOWERS[t.type].fly;
    return Math.max(0.06, Math.hypot(e.x - t.x, e.z - t.z) / speed);
  }

  /**
   * A physical projectile (slime glob, harpoon, rebar) flying from `t` to zombie `e`: it homes in
   * and deals `dmg` plus the tower's on-hit effects when it arrives. If `e` dies first, it's wasted.
   */
  launch(t, s, e, dmg, stun) {
    const time = this.flyTime(t, s, e);
    this.flights.push({ tower: t.id, type: t.type, enemy: e.id, time, dmg, stun, s });
    this.events.push({ k: 'fly', t: t.id, e: e.id, d: r2(time) });
  }

  updateFlights(dt) {
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const f = this.flights[i];
      if ((f.time -= dt) > 0) continue;
      this.flights.splice(i, 1);
      const e = this.enemies.get(f.enemy);
      if (!e) continue;
      const t = this.towers.get(f.tower) ?? null;
      this.events.push({ k: 'impact', e: e.id, t: f.tower, ...(f.ice ? { ice: 1 } : {}) });
      if (f.ice) {
        // Frost Grenade: freezes the zombie it lands on.
        if (!e.boss) this.stop({}, e, f.ice, 'ice');
        continue;
      }
      this.damage(t, e, f.dmg);
      if (this.enemies.has(e.id)) this.hitEffects(t, TOWERS[f.type], f.s, e, f.stun);
    }
  }

  /** Archer: a slow arrow flies straight along `aim` out to its range, piercing `arrow.pierce` zombies. */
  fireArrow(t, s, aim) {
    const a = s.arrow;
    const tx = t.x + Math.sin(aim) * s.range;
    const tz = t.z + Math.cos(aim) * s.range;
    const time = s.range / a.speed;
    const fx = this.arrowFx(t, s); // Crossbower: poison / cycling effects / Power Poacher on every zombie hit
    this.blades.push({ tower: t.id, loop: false, ox: t.x, oz: t.z, tx, tz, t: 0, time, left: a.pierce, hits: new Set(), damage: s.damage, det: this.detects(t, s),
      ...(s.ignite ? { burn: s.ignite.dps, burnTime: s.ignite.time } : {}), ...(fx ? { fxS: fx.s, fxStun: fx.stun } : {}) });
    this.events.push({ k: 'knife', t: t.id, x: r2(tx), z: r2(tz), d: r2(time) });
  }

  /** Knifer Dual Wield / Flayer: every `toss.every` s, throws a knife at a zombie within `toss.range`. */
  tossKnife(t, s, dt) {
    const k = s.toss;
    t.tossT = (t.tossT ?? 0) - dt;
    if (t.tossT > 0) return;
    const target = this.findTarget(t, s, t.x, t.z, k.range);
    if (!target) {
      t.tossT = 0;
      return;
    }
    t.tossT = k.every;
    const time = Math.hypot(target.x - t.x, target.z - t.z) / k.speed;
    const p = this.leadPoint(target, time);
    // Fly a little past the aim point so a knife that's slightly off can still connect.
    const dx = p.x - t.x;
    const dz = p.z - t.z;
    const d = Math.hypot(dx, dz) || 1;
    const reach = d + 1.5;
    const tx = t.x + (dx / d) * reach;
    const tz = t.z + (dz / d) * reach;
    const fly = reach / k.speed;
    this.blades.push({ tower: t.id, loop: false, ox: t.x, oz: t.z, tx, tz, t: 0, time: fly, left: k.pierce ?? 1, hits: new Set(), damage: k.damage, det: this.detects(t, s),
      ...(k.injure ? { injure: k.injure } : {}), ...(k.stun ? { stun: k.stun, bossSlow: k.bossSlow, flash: k.flash } : {}) }); // Slugger baseball
    this.events.push({ k: 'knife', t: t.id, x: r2(tx), z: r2(tz), d: r2(fly) });
  }

  /** Harpoon Hunter: one more harpoon stuck in `e`, slowing it (stacking up to the tower's `harpoonMax`). */
  applyHarpoon(def, e, h) {
    if (e.statusImmune) return;
    (e.harpoons ??= []).push({ slow: h.slow, t: h.time });
    e.harpoonMax = Math.max(e.harpoonMax, e.void && def.voidSlow != null ? Math.min(def.harpoonMax, def.voidSlow) : def.harpoonMax);
    e.harpoonCap = Math.max(e.harpoonCap, def.slowCap);
    e.harpoonSlow = Math.min(e.harpoonMax, e.harpoonSlow + h.slow);
  }

  /**
   * Huntsman Bounty: a timer that only counts down while a zombie it can see is in range. Each
   * time it runs out the owner gets `payday.pay` cash.
   */
  updatePayday(t, s, dt) {
    const det = this.detects(t, s);
    if (!this.anyNear(t.x, t.z, s.range, det)) return;
    t.payT = (t.payT ?? s.payday.every) - dt;
    if (t.payT > 0) return;
    t.payT += s.payday.every;
    this.cashShot(t, { pay: s.payday.pay, spin: 0 });
  }

  /** Sentry Minigun: a homing rocket at its target every `rockets.every` s, on top of its gun. */
  fireRockets(t, s, target, dt) {
    t.rocketT = (t.rocketT ?? 0) - dt;
    if (t.rocketT > 0) return;
    t.rocketT = s.rockets.every;
    const time = 0.5;
    this.shells.push({ tower: t.id, enemy: target.id, x: target.x, z: target.z, time, damage: s.rockets.damage, radius: s.rockets.radius, det: this.detects(t, s), main: target.id });
    this.events.push({ k: 'rocket', t: t.id, e: target.id, d: time });
  }

  /** Spends one bullet; an empty gun starts reloading. */
  useAmmo(t, s) {
    t.ammo--;
    if (t.ammo > 0) return;
    t.ammo = 0;
    t.reloadT = s.reload;
    this.events.push({ k: 'reload', t: t.id, d: s.reload });
  }

  /** Skip-test for the Gatling Gun: zombies outside its cone (half-angle `cone`) around where it faces. */
  outsideCone(t, cone) {
    return (e) => Math.abs(angleDiff(t.face, Math.atan2(e.x - t.x, e.z - t.z))) > cone;
  }

  /**
   * Gatling Gun in FPS Mode: the owner aims it (t.aimYaw) and holds fire (t.fire). Each bullet
   * flies in a straight line across the map and hits the first `fps.pierce` zombies it passes.
   */
  updateFps(t, def, s, dt, loaded) {
    t.aimAge += dt;
    if (t.aimAge > AIM_TIMEOUT) {
      // No aim updates for a while (the player left or lost connection): back to automatic.
      t.manual = false;
      t.fire = false;
      return;
    }
    t.yaw = t.aimYaw;
    t.face = t.aimYaw; // the cone follows the gun, so it keeps facing this way back on automatic
    if (def.heli) {
      // Combat Drone Direct Control: it flies wherever the owner steers it (they send where
      // they've flown to; it follows at a bit over its own speed so it can catch up).
      if (Number.isFinite(t.flyX)) {
        const mx = t.flyX - t.hx;
        const mz = t.flyZ - t.hz;
        const md = Math.hypot(mx, mz);
        const step = (s.heliSpeed ?? def.heli.speed) * 1.5 * dt;
        if (md > 1e-3) {
          const k = Math.min(1, step / md);
          t.hx += mx * k;
          t.hz += mz * k;
        }
      }
      // Its patrol zone moves with it, so it stays here when you let go.
      t.cx = t.hx;
      t.cz = t.hz;
      t.hyaw = t.aimYaw;
    }
    if (!t.fire || !loaded) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    if (t.cooldown > 0) return;
    t.cooldown += s.cooldown;
    const det = this.detects(t, s);
    // The bullet flies in 3D from the FPS camera along the aim (yaw and pitch). `along` is how
    // far it has gone across the ground; its height there is oy + along * slope.
    const ux = Math.sin(t.aimYaw);
    const uz = Math.cos(t.aimYaw);
    const px = def.heli ? t.hx : t.x; // the Combat Drone shoots from wherever it's flying
    const pz = def.heli ? t.hz : t.z;
    const ox = px - ux * FPS_BACK;
    const oz = pz - uz * FPS_BACK;
    const oy = heightAt(px, pz) + t.aimH;
    const slope = Math.tan(t.aimPitch);
    // Aimed down, it stops where it hits the ground.
    const reach = slope < 0 ? Math.min(FPS_REACH, oy / -slope) : FPS_REACH;
    const line = [];
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      const def2 = ENEMIES[e.type];
      const size = def2.scale ?? 1;
      const dx = e.x - ox;
      const dz = e.z - oz;
      const along = dx * ux + dz * uz;
      if (along < 0 || along > reach) continue;
      if (Math.abs(dx * uz - dz * ux) > FPS_WIDTH * size) continue;
      // Zombies are standing boxes from their feet (or flying height) to the top of their head.
      const y = oy + along * slope;
      const foot = def2.flying ? FLY_HEIGHT : 0;
      if (y >= foot - 0.4 && y <= foot + (def2.h ?? 5.2) * size + 0.4) line.push({ e, along });
    }
    line.sort((a, b) => a.along - b.along);
    const hits = line.slice(0, def.fps.pierce).map((h) => h.e);
    // The bullet stops at the last zombie it pierces (or the ground, or flies on out of sight).
    const len = hits.length >= def.fps.pierce ? line[def.fps.pierce - 1].along : Math.min(reach, 160);
    this.events.push({
      k: 'fpsShot', t: t.id, es: hits.map((e) => e.id),
      x: r2(ox + ux * len), y: r2(oy + slope * len), z: r2(oz + uz * len),
    });
    for (const e of hits) if (this.enemies.has(e.id)) this.damage(t, e, s.damage * def.fps.mult);
    if (s.ammo) this.useAmmo(t, s);
  }

  /**
   * Pursuit: the helicopter flies around inside its patrol zone. With a zombie in the zone it
   * flies over to hover near it and shoots whatever is in its gun range, plus splash missiles.
   */
  updatePursuit(t, def, s, dt, loaded) {
    // Helicopter: parked on its pad until it's moved the first time.
    if (def.moveDelay != null && t.parked !== false) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    // Helicopter Pursuit: the zone follows the zombie closest to the base, anywhere on the map.
    if (t.active > 0 && s.abilities?.some((a) => a.key === 'chase')) {
      const det = this.detects(t, s);
      let first = null;
      for (const e of this.enemies.values()) if (canHit(det, e) && (!first || e.dist > first.dist)) first = e;
      if (first) {
        t.cx = first.x;
        t.cz = first.z;
      }
    }
    const R = s.patrol;
    const target = this.findTarget(t, s, t.cx, t.cz, R + s.range);
    let gx = t.hx;
    let gz = t.hz;
    if (target) {
      // Fly toward it until it's comfortably inside the gun's range, then hover.
      const dx = target.x - t.hx;
      const dz = target.z - t.hz;
      const d = Math.hypot(dx, dz);
      const hover = s.range * 0.55;
      if (d > hover) {
        gx = t.hx + (dx / d) * (d - hover);
        gz = t.hz + (dz / d) * (d - hover);
      }
      t.hyaw = lerpAngle(t.hyaw, Math.atan2(dx, dz), Math.min(1, dt * 6));
    } else {
      // Nothing to chase: circle lazily around the middle of the zone.
      t.ang = (t.ang + dt * 0.35) % TAU;
      gx = t.cx + Math.cos(t.ang) * R * 0.45;
      gz = t.cz + Math.sin(t.ang) * R * 0.45;
    }
    // Never leave the patrol zone.
    const ox = gx - t.cx;
    const oz = gz - t.cz;
    const od = Math.hypot(ox, oz);
    if (od > R) {
      gx = t.cx + (ox / od) * R;
      gz = t.cz + (oz / od) * R;
    }
    const mx = gx - t.hx;
    const mz = gz - t.hz;
    const md = Math.hypot(mx, mz);
    const step = (s.heliSpeed ?? def.heli.speed) * dt;
    if (md > 1e-3) {
      const k = Math.min(1, step / md);
      t.hx += mx * k;
      t.hz += mz * k;
      if (!target && md > 0.5) t.hyaw = lerpAngle(t.hyaw, Math.atan2(mx, mz), Math.min(1, dt * 3));
    }
    // Helicopter: waits a moment after every move before it attacks.
    if (t.heliWait > 0) {
      t.heliWait = Math.max(0, t.heliWait - dt);
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    // Stealth Comanche: hidden zombies near the helicopter are revealed to every tower.
    if (s.reveal) {
      const r2max = s.range * s.range;
      for (const e of this.enemies.values()) {
        if (e.hidden && (e.x - t.hx) ** 2 + (e.z - t.hz) ** 2 <= r2max) e.revealT = Math.max(e.revealT || 0, 0.3);
      }
    }
    // Cryo Helicopter: an ice beam at up to `beam` zombies near the helicopter, unfrozen ones first.
    if (s.beam) {
      const from = { ...t, x: t.hx, z: t.hz };
      let list = this.findTargets(from, s, s.beam, (e) => e.stopKind !== 'ice');
      if (list.length < s.beam) list = list.concat(this.findTargets(from, s, s.beam - list.length, (e) => e.stopKind === 'ice'));
      if (!list.length) t.cooldown = Math.max(0, t.cooldown);
      else if (t.cooldown <= 0) {
        t.cooldown += s.cooldown;
        const at = list.map((e) => [e.x, e.z]);
        for (const e of list) {
          this.shoot(t, e, s.damage);
          if (this.enemies.has(e.id)) this.hitEffects(t, def, s, e, 0);
        }
        if (s.spray) this.spray(t, def, s, list, at);
      }
    } else if (loaded) {
      // Gun: whatever is in range of the helicopter itself.
      const e = this.findTarget(t, s, t.hx, t.hz, s.range);
      if (e && t.cooldown <= 0) {
        t.cooldown += s.cooldown;
        if (s.radius) {
          // Apache: explosive bullets.
          this.events.push({ k: 'shot', t: t.id, e: e.id });
          this.explode(t, e.x, e.z, { damage: s.damage, radius: s.radius, main: e.id, det: this.detects(t, s), ...(s.fire ? { burn: s.fire.dps, burnTime: s.fire.time } : {}) });
        } else {
          this.shoot(t, e, s.damage);
          if (s.fire && this.enemies.has(e.id)) this.ignite(e, t.id, s.fire.dps, s.fire.time, 0); // Jet Trooper Fire Rounds
          if (s.slime && this.enemies.has(e.id)) this.applySlime(e, s.slime); // Splash
        }
        if (s.pass && this.enemies.has(e.id)) this.passThrough({ ...t, x: t.hx, z: t.hz }, s, e, s.damage);
        if (s.ammo) this.useAmmo(t, s);
      } else if (!e) t.cooldown = Math.max(0, t.cooldown);
    }
    // Helicopter: several missile weapons, each on its own timer.
    if (s.missiles) {
      t.mT ??= [];
      s.missiles.forEach((m, k) => {
        t.mT[k] = Math.max(0, (t.mT[k] ?? 0) - dt);
        if (t.mT[k] > 0) return;
        if (this.fireMissiles(t, s, m, k)) t.mT[k] = m.every;
      });
      return;
    }
    // Missiles: each one at a different zombie near the helicopter.
    if (s.missile) {
      const m = s.missile;
      t.missileT = Math.max(0, t.missileT - dt);
      if (t.missileT > 0) return;
      const list = this.findTargets({ ...t, x: t.hx, z: t.hz }, { ...s, range: m.range }, m.count);
      if (!list.length) return;
      t.missileT = m.every;
      const det = this.detects(t, s);
      for (let i = 0; i < m.count; i++) {
        const e = list[i % list.length];
        const time = MISSILE_TIME + i * 0.1;
        this.shells.push({ tower: t.id, enemy: e.id, x: e.x, z: e.z, time, damage: m.damage, radius: m.radius, det });
        this.events.push({ k: 'missile', t: t.id, e: e.id, i, d: time });
      }
    }
  }

  /** One volley of Helicopter missiles `m` (weapon `k`): each at a different zombie near the helicopter. Returns false if nothing is in range. */
  fireMissiles(t, s, m, k) {
    // air: only flying zombies (AA Guns). flying: this weapon hits flyers even if the main gun can't (Gatling Turret).
    let det = this.detects(t, s);
    if (m.air || m.flying) det = { ...det, flying: true, ...(m.air ? { ground: false } : {}) };
    if (m.hidden) det = { ...det, hidden: true };
    // Psycho Slayer: minRange = deadzone, minHp = skips zombies with less health, strongest = the toughest first.
    const fx = t.hx ?? t.x;
    const fz = t.hz ?? t.z;
    const close = (m.minRange ?? 0) ** 2;
    const ok = (e) => (!m.air || e.flying) && (!close || (e.x - fx) ** 2 + (e.z - fz) ** 2 >= close) && !(m.minHp && e.hp < m.minHp);
    const list = this.findTargets({ ...t, x: fx, z: fz, ...(m.strongest ? { targetMode: 2 } : {}) }, { ...s, range: m.range ?? s.range }, m.count, ok, det);
    if (!list.length) return false;
    if (m.reveal) {
      // Marauder sonar bombs: hidden zombies first, and every hidden zombie near the target is revealed.
      list.sort((a, c) => (c.hidden ? 1 : 0) - (a.hidden ? 1 : 0));
      const at = list[0];
      for (const e of this.enemies.values()) if (e.hidden && (e.x - at.x) ** 2 + (e.z - at.z) ** 2 <= m.radius * m.radius * 4) e.revealT = Math.max(e.revealT || 0, m.reveal);
    }
    for (let i = 0; i < m.count; i++) {
      const e = m.focus || m.strongest || m.gap ? list[0] : list[i % list.length]; // focus: every shell at the same zombie (Mortars)
      if (m.fx) {
        // Psycho Slayer Slam / Railgun: a hit straight from the tower (`gap` s between shots).
        const time = (m.fx === 'slam' ? 0.15 : 0.05) + i * (m.gap ?? 0);
        this.shells.push({ tower: t.id, enemy: e.id, x: e.x, z: e.z, time, damage: m.damage, radius: m.radius, det, main: e.id, stun: m.stun, stunAny: m.stunAny });
        this.events.push({ k: 'pshot', t: t.id, e: e.id, fx: m.fx, r: m.radius, d: r2(time) });
        continue;
      }
      const time = MISSILE_TIME + i * (m.gap ?? 0.1);
      // Cryo Missiles: hit at most `maxHits` zombies and chill them.
      this.shells.push({ tower: t.id, enemy: e.id, x: e.x, z: e.z, time, damage: m.damage, radius: m.radius, det, main: e.id, maxHits: m.maxHits, chill: m.chill, stun: m.stun, stunAny: m.stunAny, burn: m.burn, burnTime: m.burnTime, ignoreExplosiveResist: m.ignoreExplosiveResist });
      this.events.push({ k: 'missile', t: t.id, e: e.id, i: i + k * 4, d: time });
    }
    return true;
  }

  // ---------------------------------------------------------------- Shield Tower, Oil Derrick, Combat Medic

  /** Shield Tower shields soak `dmg` meant for tower `t` (its own shield first, then shared ones). Returns what's left. */
  soakShield(t, dmg) {
    if (t.shieldHp > 0) {
      const used = Math.min(t.shieldHp, dmg);
      t.shieldHp -= used;
      dmg -= used;
    }
    if (dmg <= 0) return 0;
    for (const o of this.towers.values()) {
      if (!(o.pool > 0) || o.hp <= 0 || !this.shieldCovers(o, t)) continue;
      const used = Math.min(o.pool, dmg);
      o.pool -= used;
      dmg -= used;
      if (dmg <= 0) return 0;
    }
    return dmg;
  }

  /** Does Shield Tower `o` cover tower `t`? Shield Towers can't shield each other (Top path shields itself). */
  shieldCovers(o, t) {
    const sh = TOWERS[o.type].levels[o.level].shield;
    if (!sh) return false;
    if (t === o) return !!sh.shared;
    if (TOWERS[t.type].levels[t.level].shield) return false;
    const r = TOWERS[o.type].levels[o.level].aura;
    return (t.x - o.x) ** 2 + (t.z - o.z) ** 2 <= r * r;
  }

  /**
   * Shield Tower: every `shield.every` s it gives out its shield. Shared (Top path): one pool of
   * `amount` that every tower in range drains. Per tower (Bottom path): each tower in range (not
   * itself) gets a shield of `amount`.
   */
  updateShieldTower(t, s, dt) {
    const sh = s.shield;
    t.shieldGenT = (t.shieldGenT ?? 0) - dt;
    if (t.shieldGenT > 0) return;
    t.shieldGenT = sh.every;
    if (sh.shared) t.pool = sh.amount;
    else {
      t.pool = 0;
      for (const o of this.towers.values()) if (o !== t && this.shieldCovers(t, o)) o.shieldHp = Math.max(o.shieldHp || 0, sh.amount);
    }
    this.events.push({ k: 'shieldUp', id: t.id, x: t.x, z: t.z, r: s.aura });
  }

  /** Oil Derrick: pays its owner `oil.pay` every `oil.every` seconds. */
  updateOil(t, s, dt) {
    if (this.over || t.holo) return;
    t.oilT = (t.oilT ?? 0) + dt;
    if (t.oilT < s.oil.every) return;
    t.oilT -= s.oil.every;
    const owner = this.players.get(t.owner);
    if (!owner) return;
    owner.cash += s.oil.pay;
    this.events.push({ k: 'income', id: t.id, owner: t.owner, v: s.oil.pay, x: t.x, z: t.z });
  }

  /** Combat Medic Revive Pack: just recharges (the pack is thrown in revivePack when a tower goes down). */
  updateRevive(t, s, dt) {
    t.revCd = Math.max(0, (t.revCd ?? s.revive.first ?? 0) - dt);
  }

  /**
   * Tower `down` was just knocked out: the first working Combat Medic in range with a Revive Pack
   * ready throws it, and `down` is back at full health `revive.delay` s later.
   */
  revivePack(down) {
    if (down.holo || TOWERS[down.type].mechanical || TOWERS[down.type].rebuilds) return;
    for (const m of this.towers.values()) {
      const ms = TOWERS[m.type].levels[m.level];
      if (m === down || !ms.revive || m.hp <= 0 || m.stunT > 0 || m.holo || (m.revCd ?? ms.revive.first ?? 0) > 0) continue;
      if ((m.x - down.x) ** 2 + (m.z - down.z) ** 2 > ms.aura * ms.aura) continue;
      down.reviveT = ms.revive.delay;
      m.revCd = ms.revive.cooldown;
      this.events.push({ k: 'revive', id: down.id, by: m.id, x: down.x, z: down.z, d: ms.revive.delay });
      return;
    }
  }

  /** Combat Medic Medic Drone: heals the `n` most hurt towers within `radius` of its spot every second until it leaves. */
  updateHealZones(dt) {
    if (!this.healZones?.length) return;
    for (let i = this.healZones.length - 1; i >= 0; i--) {
      const z = this.healZones[i];
      if ((z.left -= dt) <= 0 || !this.towers.has(z.tower)) {
        this.healZones.splice(i, 1);
        continue;
      }
      const r2max = z.radius * z.radius;
      const hurt = [...this.towers.values()]
        .filter((o) => o.hp < o.maxHp && !TOWERS[o.type].noHeal && (o.x - z.x) ** 2 + (o.z - z.z) ** 2 <= r2max)
        .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)
        .slice(0, z.n);
      for (const o of hurt) this.healTower(o, z.heal * dt);
    }
  }

  /** Passive weapons (Warship missiles, mortars, AA guns...), each on its own timer. */
  updateMissiles(t, s, dt) {
    t.mT ??= [];
    s.missiles.forEach((m, k) => {
      t.mT[k] = Math.max(0, (t.mT[k] ?? 0) - dt);
      if (t.mT[k] > 0) return;
      if (this.fireMissiles(t, s, m, k)) t.mT[k] = m.every;
    });
  }
}
