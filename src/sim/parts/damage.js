// Hurting enemies: fire and burns, damage over time, planes, beams, shells and explosions,
// damage() itself with every resist rule, and how towers pick a target.
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { ENEMIES, GAME, TOWERS, canHit, damageKind, rootType } from '../../config.js';
import { angleDiff, lerpAngle } from '../../utils.js';
import { BOMB_FALL, MISSILE_TIME, TAU, buffOf, planePos, r2 } from './shared.js';

export class SimDamage {

  /** Flamethrower: sprays a cone toward its target that sets zombies on fire (hidden ones included). */
  updateFlame(t, def, s, dt) {
    const target = this.findTarget(t, s, t.x, t.z, s.range);
    if (!target) return;
    const want = Math.atan2(target.x - t.x, target.z - t.z);
    t.yaw = lerpAngle(t.yaw, want, Math.min(1, dt * 14));
    if (t.cooldown > 0) return;
    t.cooldown += s.cooldown;
    this.events.push({ k: 'flame', t: t.id, r: s.range, c: s.cone });
    const r2max = s.range * s.range;
    // Pyromancers need detection for hidden zombies and only hit the best `hits` in the cone.
    const det = s.hits ? this.detects(t, s) : { ...this.detects(t, s), hidden: true };
    let list = [];
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      const dx = e.x - t.x;
      const dz = e.z - t.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > r2max) continue;
      if (Math.abs(angleDiff(t.yaw, Math.atan2(dx, dz))) > s.cone) continue;
      list.push({ e, sc: this.score(t.targetMode, e, d2, t) });
    }
    if (s.hits) list = list.sort((a, b) => b.sc - a.sc).slice(0, s.hits);
    for (const { e } of list) {
      // Fire Slimes shrug off flames (unless it ignores fire resistance: Flame Tanks).
      if (e.fireImmune && !s.ignoreFireResist) continue;
      this.ignite(e, t.id, s.burn, s.burnTime, def.burnSlow ?? 0, s.ignoreFireResist);
      // Flame Tanks: zombies it sets on fire take extra damage from everything for a while.
      if (s.burnVuln) {
        e.vuln = Math.max(e.vuln, s.burnVuln.amount);
        e.vulnT = Math.max(e.vulnT, s.burnVuln.time);
      }
      // Golden Pyromancer: melts away armor for good (the strongest melt so far wins).
      if (s.melt && e.armor) e.armor = Math.min(e.armor, (ENEMIES[e.type].armor ?? 0) * (1 - s.melt));
      if (s.damage) this.damage(t, e, s.damage * (1 - (ENEMIES[e.type].burnResist ?? 0))); // Fire types resist flames
    }
  }

  /** Sets a zombie on fire. Burns don't stack: the hottest one sets the damage. */
  ignite(e, by, dps, time, slow, force = false) {
    if (e.fireImmune && !force) return;
    e.burnSlow = Math.max(e.burn > 0 ? e.burnSlow : 0, slow);
    e.burn = Math.max(e.burn, time);
    if (dps >= e.burnDps) {
      e.burnDps = dps;
      e.burnBy = by;
    }
  }

  updateBurns(dt) {
    this.dot = true; // damage over time never launches fireworks
    try {
      this.tickDots(dt);
    } finally {
      this.dot = false;
    }
  }

  tickDots(dt) {
    for (const e of [...this.enemies.values()]) {
      const el = ENEMIES[e.type]; // Easy mode types: Fire takes less from burns, more from frost; Poison less from poison
      if (e.chillT > 0 && e.chillDps > 0) {
        e.chillAcc += e.chillDps * dt * (1 + (el.frostWeak ?? 0)) * (1 - e.iceResist);
        const whole = Math.floor(e.chillAcc);
        if (whole >= 1) {
          e.chillAcc -= whole;
          this.damage(this.towers.get(e.chillBy) ?? null, e, whole);
          if (!this.enemies.has(e.id)) continue;
        }
      } else {
        e.chillDps = 0;
        e.chillAcc = 0;
      }
      if (e.poison) {
        // Saboteur poison: a hit every `tick` seconds while it lasts.
        const po = e.poison;
        po.left -= dt;
        po.next -= dt;
        if (po.left <= 0) e.poison = null;
        if (po.next <= 0) {
          po.next += po.tick;
          // Toxic Gunner Sinister Gear: every tick melts a little more armor.
          if (po.melt && e.armor) e.armor = Math.max(0, e.armor - (ENEMIES[e.type].armor ?? 0) * po.melt);
          this.damage(this.towers.get(po.by) ?? null, e, el.poisonResist ? Math.max(1, Math.round(po.damage * (1 - el.poisonResist))) : po.damage);
          if (!this.enemies.has(e.id)) continue;
        }
      }
      if (e.taints) {
        // Dumpster Child: Burn / Radioactive / Biohazard, each on its own tick (armor doesn't help).
        for (const [k, d] of e.taints) {
          d.left -= dt;
          d.next -= dt;
          if (d.next <= 0 && d.left > -1e-6) {
            d.next += d.tick;
            this.damage(this.towers.get(d.by) ?? null, e, d.damage, true);
          }
          if (d.left <= 0) e.taints.delete(k);
        }
        if (!e.taints.size) e.taints = null;
        if (!this.enemies.has(e.id)) continue;
      }
      if (e.bees) {
        // Swarmer: every sting stack hurts on its own tick.
        for (let i = e.bees.length - 1; i >= 0; i--) {
          const b = e.bees[i];
          b.left -= dt;
          b.next -= dt;
          if (b.next <= 0 && b.left > -1e-6) {
            b.next += b.tick;
            this.damage(this.towers.get(b.by) ?? null, e, b.damage);
          }
          if (b.left <= 0) e.bees.splice(i, 1);
        }
        if (!e.bees.length) e.bees = null;
        if (!this.enemies.has(e.id)) continue;
      }
      if (e.bleed > 0) {
        // Slasher Bleed: a share of its max health per second per stack, until the stacks fall off.
        if ((e.bleedT -= dt) <= 0) {
          e.bleed = 0;
          e.bleedAcc = 0;
        } else {
          const fx = e.bleedFx;
          e.bleedAcc += e.maxHp * fx.dps * e.bleed * (e.boss ? fx.bossMult : 1) * dt;
          const whole = Math.floor(e.bleedAcc);
          if (whole >= 1) {
            e.bleedAcc -= whole;
            this.damage(this.towers.get(e.bleedBy) ?? null, e, whole, true);
            if (!this.enemies.has(e.id)) continue;
          }
        }
      }
      if (e.gas?.size) {
        // Toxicnator gas: every stack hurts; the strongest one's tower gets the credit.
        let dps = 0;
        let top = 0;
        let by = 0;
        for (const [k, g] of e.gas) {
          if ((g.left -= dt) <= 0) {
            e.gas.delete(k);
            continue;
          }
          dps += g.dps;
          if (g.dps > top) {
            top = g.dps;
            by = g.by;
          }
        }
        e.gasAcc = (e.gasAcc || 0) + dps * dt * (1 - (el.poisonResist ?? 0)); // Toxicnator gas is poison
        const whole = Math.floor(e.gasAcc);
        if (whole >= 1) {
          e.gasAcc -= whole;
          this.damage(this.towers.get(by) ?? null, e, whole);
          if (!this.enemies.has(e.id)) continue;
        }
      }
      if (!e.burn) {
        e.burnDps = 0;
        e.burnAcc = 0;
        continue;
      }
      e.burnAcc += e.burnDps * dt * (1 - (el.burnResist ?? 0));
      const whole = Math.floor(e.burnAcc);
      if (whole < 1) continue;
      e.burnAcc -= whole;
      this.damage(this.towers.get(e.burnBy) ?? null, e, whole);
    }
  }

  /** Plane circles the runway; its gun shoots what's under it, plus bombs and missiles. */
  updateAviator(t, def, s, dt) {
    const dir = t.dir || 1;
    t.ang = (((t.ang + (dir * dt * TAU) / (s.lap ?? def.lap)) % TAU) + TAU) % TAU;
    const p = planePos(t, this.tmp);
    const px = p.x;
    const pz = p.z;
    const target = this.findTarget(t, s, px, pz, s.range);
    if (target && t.cooldown <= 0) {
      t.cooldown += s.cooldown;
      this.shoot(t, target, s.damage);
    }
    const det = this.detects(t, s);
    if (s.bomb) {
      t.bombT = Math.max(0, t.bombT - dt);
      const b = s.bomb;
      if (t.bombT <= 0 && this.anyNear(px, pz, b.radius + s.range, det)) {
        t.bombT = b.every;
        // A stick of bombs, spaced along the flight direction.
        const dx = -Math.sin(t.ang) * dir;
        const dz = Math.cos(t.ang) * dir;
        for (let i = 0; i < b.count; i++) {
          const off = (i - (b.count - 1) / 2) * 3.5;
          const x = px + dx * off;
          const z = pz + dz * off;
          this.shells.push({ tower: t.id, x, z, time: BOMB_FALL, damage: b.damage, radius: b.radius, det });
          this.events.push({ k: 'drop', t: t.id, x: r2(x), z: r2(z), d: BOMB_FALL });
        }
      }
    }
    if (s.missile) {
      t.missileT = Math.max(0, t.missileT - dt);
      const m = s.missile;
      const aim = t.missileT <= 0 && this.findTarget(t, s, px, pz, m.range);
      if (aim) {
        t.missileT = m.every;
        for (let i = 0; i < m.count; i++) {
          this.shells.push({ tower: t.id, enemy: aim.id, x: aim.x, z: aim.z, time: MISSILE_TIME + i * 0.12, damage: m.damage, radius: m.radius, det });
          this.events.push({ k: 'missile', t: t.id, e: aim.id, i, d: MISSILE_TIME + i * 0.12 });
        }
      }
    }
  }

  /**
   * Phaser: a beam locked on one zombie. Damage per tick ramps up the longer it stays
   * on that target; after losing it, the tower waits `retarget` seconds.
   */
  updateBeam(t, def, s, dt) {
    t.wait = Math.max(0, t.wait - dt);
    const det = this.detects(t, s);
    let e = t.lock ? this.enemies.get(t.lock) : null;
    if (e && ((e.x - t.x) ** 2 + (e.z - t.z) ** 2 > s.range * s.range || !canHit(det, e))) e = null;
    if (!e && t.lock) {
      t.lock = 0;
      t.charge = 0;
      t.beamT = 0;
      t.wait = def.retarget;
    }
    if (t.wait > 0) return;
    if (!e) {
      e = this.findTarget(t, s, t.x, t.z, s.range);
      if (!e) return;
      t.lock = e.id;
      t.beamT = 0;
      t.cooldown = Math.max(0, t.cooldown);
    }
    t.yaw = Math.atan2(e.x - t.x, e.z - t.z);
    t.beamT += dt;
    t.charge = Math.min(1, t.beamT / s.ramp);
    if (t.cooldown > 0) return;
    t.cooldown += s.cooldown;
    this.shoot(t, e, Math.round(s.damage + (s.maxDamage - s.damage) * t.charge));
  }

  updateShells(dt) {
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const sh = this.shells[i];
      const e = sh.enemy && this.enemies.get(sh.enemy);
      if (e) {
        // Missiles home in on their target.
        sh.x = e.x;
        sh.z = e.z;
      }
      sh.time -= dt;
      if (sh.time > 0) continue;
      this.shells.splice(i, 1);
      this.explode(this.towers.get(sh.tower) ?? null, sh.x, sh.z, sh);
      if (sh.cluster) this.scatter(sh);
      if (sh.nuki) this.landNuki(sh);
      if (sh.gas) {
        // Toxicnator: a gas cloud where the grenade landed.
        const g = sh.gas;
        const p = { id: this.nextId++, tower: sh.tower, kind: 'gas', x: sh.x, z: sh.z, land: 0, radius: sh.radius, left: g.cloud, dps: g.dps, time: g.time, targets: g.targets, hits: new Set(), det: sh.det };
        this.traps.set(p.id, p);
      }
      if (sh.patch) {
        // Napalm Grenade: a burning patch, the same as Mine Layer thermite.
        const p = { id: this.nextId++, tower: sh.tower, kind: 'thermite', x: sh.x, z: sh.z, land: 0, radius: sh.patch.radius, left: sh.patch.time, burn: sh.patch.burn, burnTime: sh.patch.burnTime, det: sh.det };
        this.traps.set(p.id, p);
      }
    }
  }

  /** Classic Mortar cluster bombs: they bounce out of the blast and land at random spots around it. */
  scatter(sh) {
    const c = sh.cluster;
    for (let i = 0; i < c.count; i++) {
      const a = Math.random() * TAU;
      const d = sh.radius * (0.5 + Math.random());
      const x = sh.x + Math.cos(a) * d;
      const z = sh.z + Math.sin(a) * d;
      const time = 0.45 + Math.random() * 0.35;
      this.shells.push({ tower: sh.tower, x, z, time, damage: c.damage, radius: c.radius, det: sh.det });
      this.events.push({ k: 'cluster', x: r2(x), z: r2(z), fx: r2(sh.x - x), fz: r2(sh.z - z), d: r2(time) }); // from: the blast (relative, for Versus lanes)
    }
  }

  /**
   * Blast at (x, z). b: { radius, damage, det, splash?, main?, freeze?, stun?, stunTargets? }. The
   * `main` zombie takes `damage`; others take `splash` (or `damage` if there is no separate splash).
   * `stun` stuns up to `stunTargets` zombies in the blast (the main one first).
   */
  explode(t, x, z, b) {
    if (!b.smite) this.events.push({ k: 'boom', x: r2(x), z: r2(z), r: b.radius, ...(b.bomb ? { bomb: b.bomb } : b.firework ? { fw: 1 } : b.freeze || b.chill ? { ice: 1 } : b.slime ? { slime: 1 } : b.nuke ? { nuke: 1 } : b.toxic?.key === 'neuralyze' ? { neuro: 1 } : b.gas || b.toxic ? { gas: 1 } : b.paint ? { paint: 1 } : {}) });
    const r2max = b.radius * b.radius;
    const def = t ? TOWERS[t.type] : {};
    const stuns = b.stun ? [] : null;
    // Explosive resistance (Chained) applies unless the blast, its unit or its tower ignores it.
    const boomKind = b.ignoreExplosiveResist || this.ignoresExplosiveResist(t) ? 'none' : 'explosive';
    let hits = this.enemies.values();
    if (b.reveal) {
      // Gift Elf: presents reveal hidden zombies in the blast for a while.
      for (const e of this.enemies.values()) if (e.hidden && (e.x - x) ** 2 + (e.z - z) ** 2 <= r2max) e.revealT = Math.max(e.revealT || 0, b.reveal);
    }
    if (b.maxHits) {
      // Paintballer: only the zombie it hit and the closest others get splashed.
      const d2 = (e) => (e.id === b.main ? -1 : (e.x - x) ** 2 + (e.z - z) ** 2);
      hits = [...hits].filter((e) => canHit(b.det, e) && d2(e) <= r2max).sort((a, c) => d2(a) - d2(c)).slice(0, b.maxHits);
    }
    this.splashing = true; // Void Consumption: Void Skeletons ignore splash
    try {
      this.explodeHits(t, x, z, b, hits, r2max, def, stuns, boomKind);
    } finally {
      this.splashing = false;
    }
    // stunAny: stuns bosses and stun-immune zombies too, for the full time (Golden Ranger Grenade, Charged Throw).
    const stunDef = b.stunAny ? { stunAny: true, bossStop: 1, noVoidStun: def.noVoidStun } : def;
    if (stuns) for (const e of stuns.slice(0, b.stunTargets ?? Infinity)) this.stop(stunDef, e, b.stun, 'stun');
  }

  /** The enemies one explosion hits (see explode). */
  explodeHits(t, x, z, b, hits, r2max, def, stuns, boomKind) {
    for (const e of hits) {
      if (e.hp <= 0 || !canHit(b.det, e)) continue; // (a firework where a zombie just died)
      if ((e.x - x) ** 2 + (e.z - z) ** 2 > r2max) continue;
      if (stuns) {
        if (e.id === b.main) stuns.unshift(e);
        else stuns.push(e);
      }
      let dmg = b.splash != null && e.id !== b.main ? b.splash : b.damage;
      if (b.airMult && e.flying) dmg *= b.airMult; // Stinger: rockets hit flyers much harder
      if (b.freeze && (!b.freezeMain || e.id === b.main)) {
        // Stasis: zombies with less max health stay frozen much longer (bosses much shorter).
        const secs = b.freezeHp ? b.freeze * Math.min(24, Math.max(0.25, Math.sqrt(b.freezeHp / e.maxHp))) : b.freeze;
        if (b.ice) this.iceFreeze(e, secs, b.ignoreIceResist ? { ...b.ice, ignoreIceResist: true } : b.ice); // Ice Shard explosion
        else this.stop(def, e, secs, 'ice');
      }
      if (b.slime) this.applySlime(e, b.slime);
      if (b.burn) this.ignite(e, t?.id ?? 0, b.burn, b.burnTime, b.burnSlow ?? 0);
      if (b.toxic) this.weaken(e, b.toxic);
      if (b.chill && t) this.applyChill(t, b.chill, e); // Snowballer / Jester Ice Bomb
      if (b.melt && e.armor) e.armor = Math.min(e.armor, (ENEMIES[e.type].armor ?? 0) * (1 - b.melt));
      if (b.poison && t) this.applyPoison(t, e, b.poison); // Jester Poison Bomb
      if (b.confuse) this.confuse(e, b.confuse.time, b.confuse.cd); // Jester Confusion Bomb
      if (dmg > 0) this.damage(t, e, dmg, b.pierceArmor, boomKind); // explosions are never bullets or lasers
      if (b.knock && this.enemies.has(e.id)) this.knockBack(e, b.knock); // Hallow Punk
    }
  }

  anyNear(x, z, r, det) {
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      if ((e.x - x) ** 2 + (e.z - z) ** 2 <= r * r) return true;
    }
    return false;
  }

  shoot(t, e, dmg) {
    this.events.push({ k: 'shot', t: t.id, e: e.id });
    this.damage(t, e, dmg);
  }

  /**
   * Damages an enemy; `t` (may be null if the tower was sold) gets the credit. `kind`: 'bullet',
   * 'laser', 'golden' or 'none' for bullet / laser resistance; by default the tower's own kind
   * (damageKind), except for damage over time, explosions and unit crashes (`this.hitKind`).
   */
  /**
   * Cash for damage, the way Roblox tower defense games pay (Tower Battles, TDS): `dealt` health
   * damage to `e` pays every player `dealt` x the mode's rate, so a tougher wave pays for the
   * defense it takes. The extra health enemies get in multiplayer pays nothing extra (everyone
   * earns what the enemy is worth solo), and in a `pot` mode the cash is split between the players
   * instead. Shields pay nothing, summons flagged `noCash` and minions with `reward: 0` pay
   * nothing, and an enemy never pays for more than its max health (healing can't be farmed).
   * Wire Fraud and Gold Digging pay their bonus on top.
   */
  payDamage(t, e, dealt) {
    if (e.noCash || dealt <= 0) return;
    const def = ENEMIES[e.type];
    if (def.reward === 0 && !e.boss) return; // summoned minions (final bosses are `reward: 0` too, but they pay)
    // e.curve: the mode's balance curve changed its health, not what it's worth (it pays the same).
    const rate = (this.dmgCash * (def.cash ?? 1) * (this.dmgShare || 1 / this.mpHpMult(def))) / (e.curve || 1);
    let v = Math.min(dealt * rate, e.maxHp * rate - e.paid);
    if (v <= 0) return;
    e.paid += v;
    if (e.fraud) v *= 1 + e.fraud; // Hacker Wire Fraud
    if (t && this.towers.has(t.id)) v *= buffOf(this.buffs, t.id).killCash; // Gold Commander Gold Digging
    e.earned += v;
    this.cashAcc += v;
    const whole = Math.floor(this.cashAcc);
    if (!whole) return;
    this.cashAcc -= whole;
    for (const p of this.players.values()) p.cash += whole + this.cashBack(p, whole);
  }

  /**
   * Oil Derrick Cash Back: the extra `p` gets on top of `v` cash from damage (Versus: from a kill),
   * their Derrick's `dmgCash` share of it, in whole dollars (the rest carries over).
   */
  cashBack(p, v) {
    const share = this.cashBacks.get(p.id);
    if (!share) return 0;
    p.backAcc = (p.backAcc ?? 0) + v * share;
    const extra = Math.floor(p.backAcc);
    p.backAcc -= extra;
    return extra;
  }

  damage(t, e, dmg, pierceArmor = false, kind = undefined) {
    kind ??= this.hitKind ?? (this.dot || !t ? 'none' : damageKind(t.type, t.level));
    if (e.invulnT > 0) return; // Breakers: invincible for a moment as they pop out
    if (e.noTarget) return; // Hardcore: closed Drop Pods, a downed Void Reaver, the protected Void Caster
    if (e.consume && this.splashing) return; // Void Consumption: only direct hits work
    const ts0 = t ? TOWERS[t.type]?.levels[t.level] : null;
    const hm = this.hitMods; // a Mechanic turret's or an ability's own defPierce / shieldMult
    if (t && !this.dot && dmg > 0) dmg += buffOf(this.buffs, t.id).dmgAdd || 0; // Bugler Snare Drums, Slinger boosts
    if (t && this.contract?.boost) dmg *= this.llBoost.dmg; // Last Laugh: the JESTER's boost
    if (t && this.inhumanPow) dmg *= this.inhumanPow.dmg; // Inhuman contract: the glitchy bot's towers
    const adapt = ENEMIES[e.type].adapt;
    if (adapt) this.adaptResist(e, kind, dmg, adapt); // Void Colossus: its resistance wears down
    if (kind === 'bullet' && e.bulletResist && !this.ignoresBulletResist(t)) dmg *= 1 - e.bulletResist; // Shielders, Drones...
    else if (kind === 'laser') {
      const lr = Math.max(e.laserResist, e.glitchT > 0 ? e.glitchRes : 0); // Rushers, UFOs; Glitches lend it out
      if (lr) dmg *= 1 - lr;
    } else if (kind === 'explosive' && e.explosiveResist) dmg *= 1 - e.explosiveResist; // Chained
    else if (kind === 'golden' && e.goldResist && !this.ignoresGoldResist(t)) dmg *= 1 - e.goldResist; // Warpers, the Beholder
    const mr = ENEMIES[e.type].meleeResist; // Halloween Night 2 Executioner: melee towers barely hurt it
    if (mr && t && !this.dot && (TOWERS[t.type]?.melee || ts0?.melee)) dmg *= 1 - mr;
    // Armor tops out at 90%, except Hard mode Corpses (100%: only defense piercing gets through).
    const cap = e.armor >= 1 ? 1 : 0.9;
    let armor = Math.min(cap, e.armor + (e.gear || 0) + (e.auraArmor || 0) + (e.blessed || 0) + (e.vShield > 0 ? this.voidArmor.armor : 0)); // Mechanics bolt extra armor on; VOID's aura; Jester Blessed; void armor
    // Defense piercing: ignores that share of the armor (negative: armor counts for more).
    const dp = this.dot ? 0 : hm?.defPierce ?? ts0?.defPierce ?? 0;
    if (dp && armor) armor = Math.min(cap, armor * (1 - Math.min(1, dp)));
    if (armor && !pierceArmor) dmg *= 1 - armor; // Molten Squires, Knights... (Tesla Smite ignores it)
    // Insane: flat Defense blocks part of every direct hit (defense piercing cuts it like armor).
    const block = e.carry?.defense ?? e.defense;
    if (block && !this.dot && !pierceArmor) dmg = Math.max(0, dmg - block * (1 - Math.min(1, dp)));
    if (e.vuln) dmg *= 1 + e.vuln; // softened up by a DJ Booth's Red Drop the Beat
    if (e.sacrificing && !this.bloodPass) {
      // Rebirther Blood Sacrifice: almost nothing gets through, except crashes from some units.
      const sac = ENEMIES[e.type].sacrifice;
      if (!(this.crashing && t && sac.rams.includes(rootType(t.type)))) dmg *= 1 - sac.resist;
    }
    if (this.slowVulns?.length && (e.stop > 0 || e.shockT > 0 || e.slime || e.chillT > 0 || e.harpoonSlow || e.beatSlow || e.thornSlow || (e.burn && e.burnSlow) || e.poison?.slow)) {
      // Golden Byte: stunned or slowed zombies in its range take more damage (the strongest one counts).
      let v = 0;
      for (const g of this.slowVulns) if (g.v > v && (e.x - g.x) ** 2 + (e.z - g.z) ** 2 <= g.r * g.r) v = g.v;
      dmg *= 1 + v;
    }
    if (e.injured && t && rootType(t.type) === 'knifer') dmg *= 1 + e.injured; // Flayer Injured
    if (e.iceVuln && e.stopKind === 'ice') dmg *= 1 + e.iceVuln; // Cryo Ranger Deep Freeze
    const fw = ENEMIES[e.type].frostWeak; // Fire types: frost towers' hits hurt them more
    if (fw && !this.dot && ts0 && (ts0.chill || ts0.freeze || ts0.chillDps)) dmg *= 1 + fw;
    if (e.iceResist && !this.dot && ts0 && (ts0.chill || ts0.freeze || ts0.chillDps) && !ts0.ignoreIceResist) dmg *= 1 - e.iceResist; // Medium: ice resistance
    if (t) {
      const ts = TOWERS[t.type].levels[t.level];
      let mult = buffOf(this.buffs, t.id).dmg; // Ubercharge, DJ Booth Red track
      if (ts.ghostMult && ENEMIES[e.type].model === 'ghost') mult *= ts.ghostMult; // Ghostbuster
      if (ts.team && !this.dot) {
        // Ghostbuster: +`team.boost` damage for every other Ghostbuster beaming the same zombie,
        // but once beams cross they hurt themselves.
        let n = 0;
        for (const o of this.towers.values()) if (o !== t && o.type === t.type && o.lock === e.id) n++;
        if (n) {
          mult *= 1 + ts.team.boost * n;
          this.hurtTower(t, ts.team.self);
        }
      }
      if (ts.bossMult && e.boss) mult *= ts.bossMult; // Titan special rounds
      const shm = hm?.shieldMult ?? ts.shieldMult; // Elite Plasma Bombardment, Plasmators, Immolation
      if (shm && ENEMIES[e.type].shield) mult *= shm;
      if (ts.iceBreak && (e.chillT > 0 || e.stopKind === 'ice')) mult *= ts.iceBreak; // Sledger Ice Breaker
      if (ts.coord && this.coordinated(t, ts.coord)) mult *= 1 + ts.coord.boost; // Operator Coordination
      if (t.weakT > 0) mult *= 1 - t.weakAmt; // Void mode acid / poison
      if (mult !== 1) dmg = Math.round(dmg * mult * 100) / 100;
      if (!this.dot) dmg = this.capHit(e, dmg); // Insane: max damage per hit
      if (e.pure && dmg > 0) dmg = 1; // Pure crystals: every hit does exactly 1
      const dealt = Math.min(dmg, e.hp);
      t.damageDealt += dealt;
      t.fanAcc += dealt;
      if (e.dmgBy) e.dmgBy.set(t.id, (e.dmgBy.get(t.id) ?? 0) + dealt); // VOID marks whoever hurts him most
      if (ts.flashbang && this.towers.has(t.id)) this.chargeFlashbang(t, ts.flashbang, e, dealt);
    }
    if (e.pure && dmg > 0) dmg = 1;
    if (!this.dot) dmg = this.capHit(e, dmg);
    if (e.cubeHp > 0 && e.stopKind === 'ice') {
      // Glacier: the ice cube takes the hit; the zombie thaws once it breaks.
      const used = Math.min(e.cubeHp, dmg);
      e.cubeHp -= used;
      dmg -= used;
      if (e.cubeHp <= 0) {
        e.stop = 0;
        this.events.push({ k: 'boom', x: r2(e.x), z: r2(e.z), r: 1.5, ice: 1 });
      }
      if (dmg <= 0) return;
    }
    if (t && dmg > 0 && !this.dot && this.liveShows) this.showCash(e, Math.min(dmg, e.hp)); // Glowup Live Show
    if (e.vShield > 0) {
      // Void armor: its shield takes the hit first; once it breaks, the armor, slow and tendrils go.
      const used = Math.min(e.vShield, dmg);
      e.vShield -= used;
      dmg -= used;
      if (e.vShield <= 0) {
        e.vShield = 0;
        this.events.push({ k: 'vArmorBreak', e: e.id, x: r2(e.x), z: r2(e.z), big: e.boss ? 1 : 0, type: e.type });
      }
      if (dmg <= 0) return;
    }
    if (e.osh > 0) {
      // Hardcore shields ("+ shield"): they take the hit first.
      const used = Math.min(e.osh, dmg);
      e.osh -= used;
      dmg -= used;
      if (e.osh <= 0) {
        e.osh = 0;
        const sb = ENEMIES[e.type].oshBreakSpeed;
        if (sb) e.baseSpeed *= sb; // Reforged Gargantuan: faster without its shield
        this.events.push({ k: 'oshBreak', e: e.id, x: r2(e.x), z: r2(e.z), big: e.boss ? 1 : 0 });
      }
      if (dmg <= 0) return;
    }
    if (this.dmgCash) this.payDamage(t, e, Math.min(dmg, e.hp));
    e.hp -= dmg;
    // The Beholder can't die before it has pulled everyone into the time dimension.
    if (e.hp <= 0 && !e.shifted && ENEMIES[e.type].shift) {
      e.hp = 1;
      e.shifted = true;
      this.shiftBoss = e;
    }
    // VOID can't die before he rises as a spirit.
    const rise = ENEMIES[e.type].rise;
    if (e.hp <= 0 && rise && !e.risen) {
      e.hp = 1;
      e.risen = true;
      this.riseBoss = e;
    }
    // Voidkin / Guardian: the void armor breaks once enough health is gone.
    const shell = ENEMIES[e.type].shell;
    if (shell && e.hp > 0 && e.hp <= e.maxHp * (1 - shell.at) && this.enemies.delete(e.id)) {
      this.events.push({ k: 'decay', e: e.id });
      this.events.push({ k: 'shellBreak', x: r2(e.x), z: r2(e.z), type: e.type });
      this.reborn.push({ route: e.route, type: shell.into, dist: e.dist, lateral: e.lateral, hpScale: 1, from: e.type, shell: 1, keep: { hp: e.hp, maxHp: e.maxHp } });
      return;
    }
    if (e.boneAt || e.drops != null) this.kingHurt(e); // Fallen King: Bone Armor, cash drops
    // Firework Technician: a boosted tower may launch a firework where it hit (fireworks never chain).
    if (t?.fwT > 0 && t.fw && dmg > 0 && !this.dot && this.towers.has(t.id)) this.firework(t, e);
    if (e.hp > 0) return;
    const pdef = ENEMIES[e.type];
    if ((pdef.pair || pdef.rageAt) && this.enemies.has(e.id) && this.pairDeath(e, pdef)) return; // Hardcore Void Reaver / Caster
    if (!this.enemies.delete(e.id)) return; // already dead (no double rewards or double cage monsters)
    if (t) t.kills++;
    const hunt = t && TOWERS[t.type]?.levels[t.level]?.hunt;
    if (hunt) t.bank = Math.min(hunt.cap, (t.bank || 0) + e.maxHp * hunt.rate); // Hunter bounties
    this.dropBattery(e); // Star Cannon
    const def = ENEMIES[e.type];
    // Wire Fraud: hacked zombies pay everyone extra (whole dollars; the rest carries over).
    let reward = e.noCash ? 0 : def.reward * GAME.earnMult;
    if (e.fraud && !e.noCash && !this.dmgCash) {
      this.fraudAcc += def.reward * GAME.earnMult * e.fraud;
      const extra = Math.floor(this.fraudAcc);
      this.fraudAcc -= extra;
      reward += extra;
    }
    if (e.hackEv) this.holos.push(e);
    if (this.dmgCash) reward = Math.round(e.earned); // already paid, hit by hit (see payDamage): this is only what the kill shows
    else {
      // Gold Commander Gold Digging: kills by towers in its aura pay more.
      if (t && this.towers.has(t.id) && buffOf(this.buffs, t.id).killCash > 1) reward = Math.round(reward * buffOf(this.buffs, t.id).killCash);
      for (const p of this.players.values()) p.cash += reward + this.cashBack(p, reward);
    }
    this.events.push({ k: 'kill', e: e.id, r: reward });
    if (def.jester) this.jesterDown(); // Last Laugh: the contract is done
    if (e.bounty) {
      // Mobster Place Bounty: the player who placed it cashes in.
      const p = this.players.get(e.bounty.owner);
      if (p) p.cash += e.bounty.pay;
      this.events.push({ k: 'bountyPaid', x: r2(e.x), z: r2(e.z), v: e.bounty.pay, owner: e.bounty.owner });
    }
    // Cages release a random monster; the Slime King comes back for round two; Moltens leave corpses.
    const next = def.phase2 ?? def.corpse ?? (def.cage ? def.cage[Math.floor(Math.random() * def.cage.length)] : null);
    if (next) this.reborn.push({ route: e.route, type: next, dist: e.dist, lateral: e.lateral, hpScale: def.phase2 ? 1 : def.cageHp ?? 1, from: e.type, ...(def.phase2 && e.boss ? { boss: true } : {}), ...(def.phase2 ? { carry: e.carry } : {}) });
    // Multipliers copy the enemies around them; Berserkers burst into a crowd.
    if (def.multiply) {
      const m = def.multiply;
      const near = [...this.enemies.values()]
        .filter((o) => !o.remains && !o.boss && !o.copy && !ENEMIES[o.type].multiply && (o.x - e.x) ** 2 + (o.z - e.z) ** 2 <= m.radius * m.radius)
        .slice(0, m.max);
      // Medium Multipliers: `copies` of each, faster, worth no cash, and never copied again.
      for (const o of near) {
        for (let c = 0; c < (m.copies ?? 1); c++) {
          this.reborn.push({ type: o.type, dist: Math.max(0, o.dist - 1 - c), lateral: o.lateral, hpScale: 1, from: e.type,
            ...(m.copies ? { copy: true, noCash: !!m.noCash, speedMult: m.speed ?? 1 } : {}) });
        }
      }
      if (near.length) this.events.push({ k: 'burst', e: e.id, n: near.length, kind: 'multiply' });
    }
    // Devotees heal the enemies around them as they die.
    if (def.deathHeal) {
      const h = def.deathHeal;
      for (const o of this.enemies.values()) {
        if (o.remains || o.hp >= o.maxHp || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > h.radius * h.radius) continue;
        o.hp = Math.min(o.maxHp, o.hp + o.maxHp * h.heal);
      }
      this.events.push({ k: 'dHeal', x: r2(e.x), z: r2(e.z), r: h.radius });
    }
    // Revivers raise the enemies that fall near them as Devotees.
    if (!next && !e.boss && !e.remains && !def.deathHeal) {
      for (const o of this.enemies.values()) {
        const rv = ENEMIES[o.type].revive;
        if (!rv || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > rv.radius * rv.radius) continue;
        this.reborn.push({ route: e.route, type: 'devotee', dist: e.dist, lateral: e.lateral, hpScale: 1, from: e.type, revived: 1 });
        break;
      }
    }
    if (def.blast) {
      // Radiator: blows up, hurting the towers around it.
      if (def.blast.dmg) this.hurtTowers(e.x, e.z, def.blast.radius, def.blast.dmg, true);
      if (def.blast.stun) this.hexTowers(e.x, e.z, def.blast.radius, 'stun', def.blast.stun, true); // Medium Shocker
      if (def.blast.units) this.hurtUnitsNear(e.x, e.z, def.blast.radius, def.blast.units); // Void Toxic gas
      if (def.blast.weak) {
        // Hardcore Unknowns: towers nearby deal less damage for a while.
        for (const t of this.towers.values()) {
          if ((t.x - e.x) ** 2 + (t.z - e.z) ** 2 > def.blast.radius ** 2 || this.stealthy(t)) continue;
          if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) continue;
          this.weakTower(t, def.blast.weak.amt, def.blast.weak.time);
        }
      }
      this.events.push({ k: 'eBlast', x: r2(e.x), z: r2(e.z), r: def.blast.radius, ...(def.blast.color ? { c: def.blast.color } : {}) });
    }
    if (def.acid) {
      // Acid Void: a puddle of acid that hurts towers and weakens their damage.
      const a = def.acid;
      this.puddles.push({ x: e.x, z: e.z, r: a.radius, dps: a.dps, left: a.life, weak: a.weak });
      this.events.push({ k: 'acid', x: r2(e.x), z: r2(e.z), r: a.radius, life: a.life });
    }
    if (def.finale) this.voidDown(e); // VOID is finally defeated
    if (def.endShift) this.endTimeShift(); // Hardcore: the Beholder beaten in its Field: back to the real map
    if (def.deathZone) {
      // Hardcore Speedy King / Nuclear Tank: a circle on the path that makes enemies in it faster.
      const z = def.deathZone;
      this.zones.push({ kind: 'trail', x: e.x, z: e.z, r: z.radius, left: z.life, speed: z.speed, by: e.id });
      this.events.push({ k: 'trail', x: r2(e.x), z: r2(e.z), r: z.radius, life: z.life, c: z.color });
    }
    if (def.necroBurst) this.necroBurst(e, def.necroBurst);
    if (def.deathBlast) this.carnivalBlast(e, def.deathBlast); // Halloween Night 2 Jack O' Lanterns
    if (def.deathFatigue) this.nightmareDeath(e, def.deathFatigue); // Halloween Night 3 Unknowns
    if (def.deathHaste) {
      // Overcharged: the enemies around it get a big burst of speed.
      const h = def.deathHaste;
      for (const o of this.enemies.values()) {
        if (o.remains || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > h.radius * h.radius) continue;
        o.empT = Math.max(o.empT || 0, h.time);
        o.empHaste = Math.max(o.empHaste || 0, h.speed);
      }
      this.events.push({ k: 'eBlast', x: r2(e.x), z: r2(e.z), r: h.radius, c: 0xff4fa3 });
    }
    if (def.deathSpawn?.fixed) {
      // Hardcore: a set list ([type, n, mods?]), e.g. Mandrake: 1 Hefty, 2 Odds and 2 Swifts.
      let j = 0;
      for (const [type, n, mods] of def.deathSpawn.fixed) for (let i = 0; i < n; i++, j++) this.reborn.push({ route: e.route, type, dist: Math.max(0, e.dist - j * 1.1), lateral: e.lateral, hpScale: 1, from: e.type, ...(mods ? { mods } : {}) });
      this.events.push({ k: 'burst', e: e.id, n: j, kind: 'berserk' });
    } else if (def.deathSpawn) {
      const d = def.deathSpawn;
      const cnt = Array.isArray(d.n) ? d.n[0] + Math.floor(Math.random() * (d.n[1] - d.n[0] + 1)) : d.n; // Void Slime: 3-4 Goos
      for (let i = 0; i < cnt; i++) {
        const type = d.list[Math.floor(Math.random() * d.list.length)];
        this.reborn.push({ route: e.route, type, dist: Math.max(0, e.dist - i * 1.2), lateral: e.lateral, hpScale: 1, from: e.type });
      }
      this.events.push({ k: 'burst', e: e.id, n: cnt, kind: 'berserk' });
    }
  }

  /** Insane: no single hit does more than an enemy's maxHit (or its Taunt cap, or what a move lowered it to). */
  capHit(e, dmg) {
    const cap = e.tauntT > 0 ? ENEMIES[e.type].taunt.maxHit : e.carry?.maxHit ?? e.maxHit;
    return cap && dmg > cap ? cap : dmg;
  }

  /** Does tower `t` get through golden resistance right now (its level, or the first seconds of Golden Mobster Overload)? */
  ignoresGoldResist(t) {
    if (!t) return false;
    const def = TOWERS[t.type];
    const s = def.levels[t.level];
    if (s.ignoreGoldResist || def.ignoreGoldResist) return true;
    const ab = t.active > 0 ? s.abilities?.find((a) => a.self && a.ignoreGoldResist) : null;
    return !!ab && (ab.ignoreGoldResist === true || ab.duration - t.active < ab.ignoreGoldResist);
  }

  /** Do tower `t`'s explosions get through explosive resistance (its level, or the tower itself)? */
  ignoresExplosiveResist(t) {
    if (!t) return false;
    const def = TOWERS[t.type];
    return !!(def.levels[t.level].ignoreExplosiveResist || def.ignoreExplosiveResist);
  }

  /** Do tower `t`'s bullets get through bullet resistance right now (its level, or AP Rounds)? */
  ignoresBulletResist(t) {
    if (!t) return false;
    const s = TOWERS[t.type].levels[t.level];
    return !!(s.ignoreBulletResist || (t.active > 0 && s.abilities?.some((a) => a.self && a.ignoreBulletResist)));
  }

  /** Operator Coordination: is another of this owner's Operators within `c.radius`? */
  coordinated(t, c) {
    const fam = rootType(t.type);
    for (const o of this.towers.values()) {
      if (o === t || o.owner !== t.owner || rootType(o.type) !== fam || o.holo) continue;
      if ((o.x - t.x) ** 2 + (o.z - t.z) ** 2 <= c.radius * c.radius) return true;
    }
    return false;
  }

  /** Breacher Flashbang: charges with damage dealt; when full, stuns zombies around `e` (not bosses). */
  chargeFlashbang(t, fb, e, dealt) {
    t.flashAcc = (t.flashAcc || 0) + dealt;
    if (t.flashAcc < fb.charge) return;
    t.flashAcc = 0;
    const def = TOWERS[t.type];
    for (const o of [...this.enemies.values()]) {
      if (o.boss || (o.x - e.x) ** 2 + (o.z - e.z) ** 2 > fb.radius * fb.radius) continue;
      this.stop(def, o, fb.stun, 'stun');
    }
    this.events.push({ k: 'boom', x: r2(e.x), z: r2(e.z), r: fb.radius, flash: 1 });
  }

  /** Titan Fortify Zone: how much shorter stuns on tower `t` are (the best zone it is in). */
  fortifyOf(t) {
    let best = 0;
    for (const o of this.towers.values()) {
      const f = TOWERS[o.type].levels[o.level].fortify;
      if (f && (o.x - t.x) ** 2 + (o.z - t.z) ** 2 <= f.radius * f.radius) best = Math.max(best, f.reduce);
    }
    return best;
  }

  /** Best enemy for `t` within `range` of (ox, oz), by the tower's target mode. */
  findTarget(t, s, ox, oz, range, skip = null) {
    const r2max = range * range;
    const det = this.detects(t, s);
    const shared = s.shared ? this.rangeCircles(t.type) : null;
    const inShared = (e) => shared.some((c) => (e.x - c.x) ** 2 + (e.z - c.z) ** 2 <= c.r2);
    let best = null;
    let bestScore = -Infinity;
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      if (skip?.(e)) continue;
      const dx = e.x - ox;
      const dz = e.z - oz;
      const d2 = dx * dx + dz * dz;
      if (d2 > r2max && !(shared && inShared(e))) continue;
      const score = this.score(t.targetMode, e, d2, t);
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best ? this.blocker(best, ox, oz, det) : best;
  }

  /** Void Petrified: a statue standing between the shooter and its target takes the shot instead. */
  blocker(e, ox, oz, det) {
    if (!this.blockers) return e;
    const tx = e.x - ox;
    const tz = e.z - oz;
    const len2 = tx * tx + tz * tz;
    if (len2 < 1e-6) return e;
    let hit = e;
    let hitT = 1;
    for (const o of this.enemies.values()) {
      if (o === e || !ENEMIES[o.type].blockShots || !canHit(det, o)) continue;
      const u = ((o.x - ox) * tx + (o.z - oz) * tz) / len2; // how far along the shot line, 0..1
      if (u <= 0 || u >= hitT) continue;
      const px = ox + tx * u - o.x;
      const pz = oz + tz * u - o.z;
      const r = ENEMIES[o.type].blockShots;
      if (px * px + pz * pz <= r * r) { hit = o; hitT = u; }
    }
    return hit;
  }

  /** Target-mode score: higher is a better target. `d2` is squared distance to the shooter. */
  score(mode, e, d2, t = null) {
    let focus = e.neuroT > 0 ? 1e12 : 0; // Saboteur Neuralyze: every tower targets it first
    if (t?.forceE === e.id) focus += 1e14; // Bugler Unit Commander: its towers attack this one first
    // King: towers near him have to attack him.
    if (e.aggro && t && (t.x - e.x) ** 2 + (t.z - e.z) ** 2 <= e.aggro * e.aggro) focus += 1e13;
    switch (mode) {
      case 0: return focus + e.dist; // First
      case 1: return focus - e.dist; // Last
      case 2: return focus + e.hp * 10000 + e.dist; // Strongest
      default: return focus - d2; // Closest
    }
  }

  /** Up to `n` best enemies in range, by target mode (Plasma Trooper). */
  findTargets(t, s, n, ok = null, det = this.detects(t, s)) {
    const r2max = s.range * s.range;
    const list = [];
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      if (ok && !ok(e)) continue;
      const d2 = (e.x - t.x) ** 2 + (e.z - t.z) ** 2;
      if (d2 <= r2max) list.push({ e, sc: this.score(t.targetMode, e, d2, t) });
    }
    list.sort((a, b) => b.sc - a.sc);
    return list.slice(0, n).map((x) => x.e);
  }
}
