// updateTower: what one tower does each frame (find a target, aim, fire, run its special parts).
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { TOWERS, VERSUS, canHit, facesCone } from '../../config.js';
import { angleDiff, lerpAngle } from '../../utils.js';
import { levelAt } from '../map.js';
import { buffOf, minRangeOf, modeStats, r2 } from './shared.js';

export class SimTowerUpdate {

  /**
   * Gold Commander: his giant broadsword hits every zombie around him once a second while Call to
   * Battle is on (always at max level; the ability multiplies its damage), and the Orbital
   * Airstrike beam glides toward its owner's cursor, melting everything under it.
   */
  updateGoldCommander(t, s, dt) {
    const sw = s.sword?.radius ? s.sword : null;
    if (sw && (sw.always || t.active > 0)) {
      t.swordT = (t.swordT || 0) - dt;
      if (t.swordT <= 0) {
        const cta = t.active > 0 ? s.abilities?.find((a) => a.key === 'cta') : null;
        const dmg = sw.damage * (cta?.swordMult ?? 1);
        const det = this.detects(t, s);
        const r2max = sw.radius * sw.radius;
        const hits = [...this.enemies.values()].filter((e) => canHit(det, e) && (e.x - t.x) ** 2 + (e.z - t.z) ** 2 <= r2max);
        if (hits.length) {
          t.swordT += sw.every;
          t.yaw = Math.atan2(hits[0].x - t.x, hits[0].z - t.z);
          for (const e of hits) this.damage(t, e, dmg);
          this.events.push({ k: 'gsword', id: t.id, x: r2(t.x), z: r2(t.z), r: sw.radius });
        } else t.swordT = 0; // swings as soon as a zombie comes close
      }
    } else t.swordT = 0;
    const o = t.orb;
    if (o) {
      const dx = o.tx - o.x;
      const dz = o.tz - o.z;
      const d = Math.hypot(dx, dz);
      const step = o.speed * dt;
      if (d <= step) {
        o.x = o.tx;
        o.z = o.tz;
      } else {
        o.x += (dx / d) * step;
        o.z += (dz / d) * step;
      }
      // Hits everything under it (hidden and flying too), a little every tick.
      this.dot = true;
      for (const e of [...this.enemies.values()]) if ((e.x - o.x) ** 2 + (e.z - o.z) ** 2 <= o.radius * o.radius) this.damage(t, e, o.dps * dt);
      this.dot = false;
      if ((o.left -= dt) <= 0) t.orb = null;
    }
  }

  /** Confuses zombie `e` for `secs` (walks backwards), then it can't be confused for `cd` s. Not bosses. */
  confuse(e, secs, cd) {
    if (e.boss || e.statusImmune || e.confCd > 0 || e.remains || !this.enemies.has(e.id)) return;
    e.confT = secs;
    e.confCd = secs + cd;
  }

  updateTower(t, dt) {
    // Hacker clones fade away when their time is up.
    if (t.holo && (t.holo -= dt) <= 0) return this.removeTower(t, 'holoEnd');
    const def = TOWERS[t.type];
    let s = levelAt(def.levels[t.level], t.x, t.z); // Penetrator: cliff stats on a cliff
    s = modeStats(s, t); // Submerge Submerged mode, Spectre Offense drone
    const b = buffOf(this.buffs, t.id);
    if (t.immuneT > 0) t.immuneT = Math.max(0, t.immuneT - dt); // Spectre Defense drone / Eldritch Rift: stun immunity
    if (t.seeT > 0) t.seeT = Math.max(0, t.seeT - dt); // Spark Now-You-See-Me: hidden detection
    t.active = Math.max(0, t.active - dt);
    t.fury = Math.max(0, t.fury - dt);
    t.riotT = Math.max(0, t.riotT - dt);
    t.parryT = Math.max(0, (t.parryT || 0) - dt);
    t.aspectT = Math.max(0, (t.aspectT || 0) - dt);
    t.radioT = Math.max(0, t.radioT - dt);
    if (t.fwT > 0) t.fwT = Math.max(0, t.fwT - dt); // Firework Technician boost
    // Time Dilator Warp Drive: ability cooldowns run on bubble time too.
    const cdDt = t.dil?.cd ? dt * t.dil.scale : dt;
    for (const k in t.cd) t.cd[k] = Math.max(0, t.cd[k] - cdDt);
    this.towerUpkeep(t, def, def.levels[t.level], dt);
    // Versus debuffs from an opponent's Anarchist: smoke halves range, fireworks stun.
    t.smoke = Math.max(0, t.smoke - dt);
    t.stunT = Math.max(0, t.stunT - dt);
    if (t.slowT > 0) t.slowT = Math.max(0, t.slowT - dt); // Insane mode: goo, time waves, Time Parasites
    if (t.weakT > 0) t.weakT = Math.max(0, t.weakT - dt); // Void mode: acid
    if (t.silenceT > 0) t.silenceT = Math.max(0, t.silenceT - dt); // Void Lich poison: no abilities
    if (t.bleedT > 0) t.bleedT = Math.max(0, t.bleedT - dt); // Void Guardian axe: bleeding
    this.drainStealth(t, def.levels[t.level], dt);
    if (t.cloakT > 0) t.cloakT = Math.max(0, t.cloakT - dt); // Ghost Grenade
    t.shieldT = Math.max(0, t.shieldT - dt); // Medic shield recharging after blocking a stun
    if (t.invulnT > 0) t.invulnT = Math.max(0, t.invulnT - dt); // Combat Drone Shield
    if (t.reviveT > 0 && (t.reviveT -= dt) <= 0) {
      // Combat Medic Revive Pack: back on its feet at full health.
      t.reviveT = 0;
      this.healTower(t, t.maxHp);
    }
    this.landCrates(t, dt, false); // Airdrop Farm crates still fall while it's stunned
    if (t.hp <= 0 && def.unitsDie && t.unitsOut) {
      this.removeUnitsOf(t.id); // Field Barracks: its units die with it
      t.unitsOut = false;
    }
    if (t.hp > 0) t.repairT = 0;
    else if (def.rebuilds && t.rebuilt < def.rebuilds) {
      // XWM Turret: rebuilds itself to full health (it can't shoot meanwhile).
      if (!(t.repairT > 0)) t.repairT = def.rebuildTime;
      t.repairT -= dt;
      if (t.repairT <= 0) {
        t.repairT = 0;
        t.rebuilt++;
        this.healTower(t, t.maxHp);
      }
      return;
    }
    if (t.stunT > 0 || t.hp <= 0) return; // stunned, or knocked out until healed
    if (t.bleedT > 0 || t.corrupt) return; // Void mode: bleeding (Guardian) or turned by VOID
    if (t.curseBy) {
      // Hardcore: cursed by the Soul Stealer / Void Reaver: nothing works until that enemy is gone.
      if (this.enemies.has(t.curseBy)) return;
      t.curseBy = 0;
    }
    if (t.parryT > 0) return; // Gladiator: recovering from a parry
    // Slowed towers (and ones the Beholder's sword has nerfed for good) do everything slower.
    // Time Dilator bubble: faster or slower (spawners only from Paradox Limiters).
    const tempo = (t.slowT > 0 ? 1 - t.slowAmt : 1) * (t.nerf ?? 1) * (t.dil && (def.kind !== 'spawner' || t.dil.spawn) ? t.dil.scale : 1);
    if (tempo !== 1) dt *= tempo;
    if (t.dpT > 0) t.dpT = Math.max(0, t.dpT - dt); // Bugler Directed Power
    // Abilities with `auto` (Gunslinger Reinforcements) use themselves when ready during a wave.
    if (s.abilities && this.wave.state === 'wave' && this.enemies.size && !(t.silenceT > 0) && !(t.bleedT > 0) && !t.corrupt) {
      for (const ab of s.abilities) {
        if (!ab.auto || t.cd[ab.key] > 0) continue;
        t.cd[ab.key] = ab.cooldown * (1 - b.cdCut);
        this.useAbility(t, s, ab, {});
        this.events.push({ k: 'ability', id: t.id, owner: t.owner, name: ab.name, x: t.x, z: t.z });
      }
    }
    if (s.android && this.vs) this.updateAnarchy(t, s, dt);
    if (s.oil) this.updateOil(t, s, dt);
    if (s.shield) this.updateShieldTower(t, s, dt);
    if (s.revive) this.updateRevive(t, s, dt);
    if (s.sword?.radius || t.orb) this.updateGoldCommander(t, s, dt); // not the Warlock / Engineer melee `sword` (that has `reach`)
    if (s.missiles && !def.heli) this.updateMissiles(t, s, dt); // Warship: passive weapons on their own timers
    if (s.companion) this.updateCompanion(t, s, dt); // Bubble Blower
    if (s.drop?.units) this.updateDrops(t, s, dt); // Buccaneer pirate barrel (Airdrop Farms / Markets use `drop` for crate timing)
    if (s.drone) this.updateSpectreDrone(t, s, dt); // Spectre drone
    if (t.liveT > 0) this.updateLiveShow(t, s, dt); // Glowup Live Show
    if (s.scare) return this.updateScare(t, def, s, b, dt); // Scarecrow
    if (def.bait) return; // bait never attacks
    if (def.kind === 'spawner') return this.updateSpawner(t, def, s, dt);
    if (s.goons && this.updateGoons(t, def, s, dt)) return;
    if (s.lemon) return this.updateLemon(t, s, b, dt); // Lemonade Cat: cash for zombies in range
    if (def.kind === 'income') return;
    if (s.chaos) return this.updateChaos(t, s, dt); // Chaos Jester
    if (s.tracks) return this.updateBooth(t, s, dt);
    if (s.beamHeal) {
      this.updateMediBeam(t, s, dt);
      if (!s.damage) return; // Doctor: its pistol keeps shooting
    }
    // Commanders only shoot during Call to Arms (Classic Commanders: for `fury` s after any ability).
    if (def.kind === 'support' && !(s.damage && (t.active > 0 || t.fury > 0))) return;
    // Cowboy: twirling its revolver after a cash shot (its cooldown waits too).
    if (t.spinT > 0) {
      t.spinT = Math.max(0, t.spinT - dt * b.rate);
      return;
    }
    const rangeMult = b.range * (t.smoke > 0 ? VERSUS.smokeRange : 1);
    if (rangeMult !== 1) s = { ...s, range: s.range * rangeMult };
    // Electricizer: zombies within part of its range switch it to its short-range mode.
    if (s.near) {
      t.near = this.anyNear(t.x, t.z, s.range * s.near.within, this.detects(t, s));
      if (t.near) s = { ...s, ...s.near };
    }
    // HE Rounds / Overcharge: more damage and range while on (HE: every bullet explodes).
    const self = t.active > 0 ? s.abilities?.find((a) => a.self) : null;
    // Shock Rounds: shots also stun the zombie they hit first.
    if (self) s = { ...s, damage: s.damage * (self.dmg ?? 1), range: s.range * (self.range ?? 1), ...(self.radius ? { radius: self.radius } : {}), ...(self.stun ? { stun: Math.max(s.stun || 0, self.stun) } : {}),
      ...(self.burn ? { fire: { dps: self.burn, time: self.burnTime } } : {}), // Jet Trooper Fire Rounds
      ...(self.burst ? { burst: self.burst, burstGap: self.burstGap, cooldown: self.cycle } : {}) }; // Yasuke Dragon Flame
    if (t.magic) s = { ...s, damage: s.damage + t.magic }; // Wizard Magic Boost
    if (t.uses?.soulSurge) s = { ...s, targets: 1 + t.uses.soulSurge }; // Lure Soul Surge: more zombies per shot
    // Balloon Pal: bigger splash too.
    if (b.splash > 1 && (s.radius || s.area)) s = { ...s, ...(s.radius ? { radius: s.radius * b.splash } : {}), ...(s.area ? { area: s.area * b.splash } : {}) };
    // Cooldowns may dip just below zero so leftover time carries into the next shot;
    // that keeps very fast fire rates accurate at any tick length. Firerate boosts speed them up.
    const dpRate = t.dpT > 0 ? 1 + (t.dpBoost || 0) : 1; // Bugler Directed Power
    t.cooldown = Math.max(-dt, t.cooldown - dt * b.rate * dpRate * (self?.rate ?? 1)); // Machine Gunner Overcharge: faster firing
    t.gap = Math.max(0, t.gap - dt);
    // Ammo towers stop shooting while they reload (firerate boosts don't speed that up).
    let loaded = true;
    if (s.ammo) {
      if (t.reloadT > 0) {
        t.reloadT = Math.max(0, t.reloadT - dt);
        if (t.reloadT <= 0) t.ammo = s.ammo;
      }
      loaded = t.reloadT <= 0;
      if (!loaded) t.cooldown = Math.max(0, t.cooldown);
    }
    if (def.pulse) return this.firePulse(t, def, s);
    if (s.star) return this.updateStar(t, def, s, dt);
    if (s.spot) return this.updateSpotlight(t, def, s, dt);
    if (def.orbit) return this.updateAviator(t, def, s, dt);
    if (def.fps && t.manual) return this.updateFps(t, def, s, dt, loaded);
    if (def.heli) return this.updatePursuit(t, def, s, dt, loaded);
    if (s.maxDamage != null) return this.updateBeam(t, def, s, dt);
    if (s.overcharge != null) return this.updateAccel(t, s, dt);
    if (s.synapses) return this.updateHacker(t, s);
    // Necromancer / Engineer: busy raising a gravestone or building a sentry.
    if ((s.souls || s.scrap) && this.updateBuilder(t, s, dt)) return;
    if (s.buildEvery) this.updateTurrets(t, s, dt); // Mechanic: a temporary turret every `buildEvery` s
    if (s.burn != null) return this.updateFlame(t, def, s, dt);
    if (def.traps) return this.updateTrapper(t, def, s);
    // Ice Apprentice Blizzard: its staff can't attack while it lasts.
    if (t.active > 0 && s.abilities?.some((a) => a.key === 'blizzard')) return this.updateBlizzard(t, s, dt);
    if (s.soul && t.choice?.[0] === 'beam') return this.updateSoulBeam(t, s, dt * b.rate); // Spiritual Advocate Beam mode
    if (t.restT > 0) {
      t.restT -= dt; // Spiritual Advocate Heal: its sword rests
      return;
    }
    if (s.fan && t.fanAcc >= s.fan.every) this.throwKnives(t, s);
    if (s.chop) this.chopAxe(t, s, dt);
    if (t.shockT > 0 && (t.shockT -= dt) <= 0) this.aftershock(t, def, s); // Sledger
    if (s.toss) this.tossKnife(t, s, dt * b.rate);
    if (s.sword) this.swingSword(t, def, s, dt * b.rate); // Warlock: its sword works on its own timer
    if (t.active > 0) this.updateDrone(t, s, dt);
    if (t.active > 0) this.updateSnowStorm(t, s, dt);

    // Boomerangs can't be thrown again until every one of them is back.
    if (s.pierce && t.out > 0) return;

    // Freezers don't waste shots on zombies that are already frozen.
    // Sleeters won't shoot burning zombies either.
    let skip = s.shock?.hitAll ? null // Golden Byte: zaps any zombie (it only shocks the ones it can)
      : s.shock ? (e) => e.shockT > 0 || e.stop > 0 || e.statusImmune || e.shockImmune || (s.shock.maxHp != null && e.maxHp > s.shock.maxHp) // Byte: only zombies it can still shock
      : s.taint ? (e) => !!e.taints?.has(s.taint.kind) || e.statusImmune // Dumpster Child: zombies without its effect yet
      : def.skipStopped ? (e) => e.stop > 0 || (e.boss && e.zapT > 0) // Stunner
      : (s.freeze || s.chill) && !def.hitsFrozen ? (e) => e.stopKind === 'ice' || (def.skipBurning && e.burn > 0)
      : minRangeOf(def, s) ? this.deadzone(t, minRangeOf(def, s))
      : facesCone(def) ? this.outsideCone(t, s.cone) // Gatling Gun / Sentry: only zombies inside its cone
      : s.bubble?.float ? (e) => e.stopKind === 'float' // Bubble Blower: don't waste bubbles on floating zombies
      : s.cube ? (e) => e.cubeHp > 0 // Glacier: not zombies already in a cube
      : null;
    if ((s.freeze || s.chill) && !def.skipStopped && !def.hitsFrozen && minRangeOf(def, s)) {
      // Cryo Mortar: skips frozen zombies and can't hit close ones either.
      const ice = skip;
      const close = this.deadzone(t, minRangeOf(def, s));
      skip = (e) => ice(e) || close(e);
    }
    if (s.payday) this.updatePayday(t, s, dt);
    if (s.handgun) this.fireHandgun(t, def, s, dt * b.rate);
    let target;
    if (s.abilities?.some((a) => a.key === 'targetSelect')) {
      // Artillery: only shoots zombies in the blast at its Target Select spot. autoAim levels
      // pick their own target when nothing is there (or no spot is set).
      target = t.spot ? this.findTarget(t, s, t.spot.x, t.spot.z, s.radius, skip) : null;
      t.spotOn = !!target;
      if (!target && s.autoAim) target = this.findTarget(t, s, t.x, t.z, s.range, skip);
    } else target = this.findTarget(t, s, t.x, t.z, s.range, skip);
    // Volt: zombies near any Volt Point on the map can be zapped too.
    if (!target && def.voltUser) {
      for (const u of this.units.values()) {
        if (!u.def.point) continue;
        target = this.findTarget(t, s, u.x, u.z, u.def.radius, skip);
        if (target) break;
      }
    }
    if (!target) {
      if (s.charge) t.chargeT = Math.min(s.charge.time, (t.chargeT || 0) + dt); // Mako: charging up while idle
      if (s.shuriken) this.throwShuriken(t, s, dt * b.rate); // Samurai: a shuriken at a zombie just out of reach
      t.aimT = 0; // Hunters have to aim again at the next zombie
      t.revT = Math.max(0, t.revT - dt * b.rate); // Minigunners spin back down
      return;
    }
    // Minigunner: spins up on a target before the first shot.
    if (s.rev && t.revT < s.rev) {
      t.revT = Math.min(s.rev, t.revT + dt * b.rate);
      t.cooldown = Math.max(0, t.cooldown);
      if (t.revT < s.rev) return;
    }
    const want = Math.atan2(target.x - t.x, target.z - t.z);
    t.yaw = lerpAngle(t.yaw, want, Math.min(1, dt * 18));
    if (Math.abs(angleDiff(t.yaw, want)) > 0.35) return;
    if (!loaded) return;
    if (s.rockets) this.fireRockets(t, s, target, dt * b.rate);
    if (s.m203) this.fireM203(t, s, target, dt);
    if (s.rail) this.fireRail(t, s, target, dt);
    if (def.aim && t.aimT < def.aim) {
      t.aimT += dt * b.rate;
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }

    // A cycle is `burst` shots `burstGap` apart; the cycle restarts after `cooldown`.
    if (t.burstLeft > 0) {
      if (t.gap > 0) return;
    } else {
      if (t.cooldown > 0) return;
      // Javelin: once reloaded, it aims `aimShot` s before every shot.
      if (s.aimShot) {
        if (t.aimT < s.aimShot) {
          t.aimT += dt * b.rate;
          t.cooldown = Math.max(0, t.cooldown);
          if (t.aimT < s.aimShot) return;
        }
        t.aimT = 0;
      }
      t.burstLeft = s.burst || 1;
      if (s.burstMax) {
        // Fracture: a random number of shards per burst; the cycle is the pause plus the burst.
        t.burstLeft = s.burst + Math.floor(Math.random() * (s.burstMax - s.burst + 1));
        t.cooldown += s.burstPause + t.burstLeft * s.burstGap;
      } else
      // Elite Plasma Rifle: fires faster the hotter it gets (the fewer shots before it overheats).
      t.cooldown += s.heatRamp && s.ammo ? s.cooldown + (s.heatRamp.minCd - s.cooldown) * this.heat(t, s) : s.cooldown;
    }
    t.burstLeft--;
    t.gap = s.burstGap ?? def.burstGap ?? 0;
    if (s.bolt) return this.bolt(t, s, target, want);
    if (s.bubble) return this.blowBubbles(t, def, s, target);
    if (s.scrap) t.meter++; // Engineer: every shot collects scrap
    if (s.pierce) return this.throwRangs(t, s, target);
    if (s.whirl && ++t.swings % s.whirl.every === 0) return this.whirl(t, s);
    if (s.pellets) {
      this.pump(t, s, want);
      if (s.ammo) this.useAmmo(t, s); // Breacher Good Coms: a full-auto magazine
      return;
    }
    if (s.chains) return this.chain(t, def, s, target);
    if (s.arrow) return this.fireArrow(t, s, want);
    if (s.axe) return this.throwAxe(t, s, target);
    if (s.bounce) return this.bounceArrow(t, s, target);
    if (s.pen) return this.penetrate(t, s, target);
    if (s.flask) this.flask(t, s, target); // Maitake: heals summons, frees towers, leaves a cloud
    if (s.area) return this.areaHit(t, def, s, target); // Hotdog Frank / Mako
    if (s.shock) return this.byteZap(t, def, s, target); // Byte
    if (s.radius) return this.fireSplash(t, def, s, target);
    if (s.targets) {
      // Gladiator Fire Aspect: this swing sets every zombie it hits on fire.
      const fire = s.fireAspect && t.aspectT <= 0 ? s.fireAspect : null;
      if (fire) t.aspectT = fire.every;
      const hit = this.findTargets(t, s, s.targets);
      const at = hit.map((e) => [e.x, e.z]); // where they were (for the spray), even if they die
      // Void Traitor critical hits; Spiritual Advocate Sword Imbue (stronger with more souls).
      let mult = 1;
      if (s.critEvery && hit.length && ++t.swings % s.critEvery.every === 0) mult = s.critEvery.mult;
      if (s.soul?.imbue && t.soulN > 0) mult *= 1 + s.soul.imbue * t.soulN;
      if (s.soul?.imbue && hit.length) this.setSouls(t, s, t.soulN - s.soul.cost * hit.length);
      for (const e of hit) {
        this.shoot(t, e, (s.hpScale ? this.hpScaled(s, e) : s.damage) * mult);
        if (!this.enemies.has(e.id)) continue;
        if (s.stun) this.stop(def, e, s.stun, 'stun'); // Slammer: every zombie hit is stunned
        if (fire) this.ignite(e, t.id, fire.dps, fire.time, 0);
        this.hitEffects(t, def, s, e, 0); // Sledger: chills every zombie it hits
      }
      if (s.spray) this.spray(t, def, s, hit, at);
      if (s.lasers && hit.length && ++t.swings % s.lasers.every === 0) this.voidLasers(t, def, s); // Void King
      if (s.aftershock) t.shockT = s.aftershock.delay;
      if (s.ammo) this.useAmmo(t, s); // Cryomancer: one tank of frost per spray
      if (s.cash && hit.length && ++t.cashN % s.cash.every === 0) this.cashShot(t, s.cash); // Plunder
      return;
    }
    // Warden: every `crit.every`th swing is a critical hit (and stuns, unless every hit does).
    // Riot shield: double damage for a while after blocking a stun.
    let dmg = s.hpScale ? this.hpScaled(s, target) : s.damage; // Cyberblade Prototype Archaic
    // Wafer: hits harder the closer the zombie is (`damage` at the edge of its range, `nearDmg` point blank).
    // Inside `meleeRange` it's the full candy-cane hit; past it the damage fades out to the edge of its range.
    if (s.nearDmg != null) {
      const mr = s.meleeRange || 0;
      const d = Math.hypot(target.x - t.x, target.z - t.z);
      dmg = Math.round((d <= mr ? s.nearDmg : s.damage + (s.nearDmg - s.damage) * Math.max(0, 1 - (d - mr) / Math.max(0.01, s.range - mr))) * 100) / 100;
    }
    if (s.heatRamp?.dmg && s.ammo) dmg = Math.round(dmg * (1 + s.heatRamp.dmg * this.heat(t, s)) * 100) / 100; // Particle Accelerator
    let stun = s.stun;
    // Outlaw: a random share of shots are critical hits.
    let lucky = false;
    if (s.critChance && Math.random() < s.critChance) {
      dmg = Math.round(dmg * s.critMult * 100) / 100;
      lucky = true;
    }
    // Planeswalker: zombies inside its inner range take less damage.
    if (s.closeRange && (target.x - t.x) ** 2 + (target.z - t.z) ** 2 <= s.closeRange ** 2) dmg = Math.round(dmg * s.closeMult * 100) / 100;
    // Hunter Collateral: spends bounty for a double-damage shot that bounces to nearby zombies.
    let collat = null;
    if (s.collateral && (t.bank || 0) >= s.collateral.cost) {
      t.bank -= s.collateral.cost;
      dmg *= 2;
      collat = { x: target.x, z: target.z, main: target.id };
    }
    // Flayer: every swing in a row on the same zombie hits a bit harder.
    if (s.focus) {
      t.focusN = t.focusE === target.id ? (t.focusN || 0) + 1 : 0;
      t.focusE = target.id;
      dmg = Math.round(dmg * (1 + Math.min(s.focus.max, t.focusN * s.focus.per)) * 100) / 100;
    }
    if (s.combo) {
      // Brawler: every `hits`th punch is the combo finisher (harder, with knockback). The next
      // combo starts `combo.cooldown` s after it instead of the normal swing time.
      const fin = ++t.swings % s.combo.hits === 0;
      if (fin) {
        dmg = s.combo.damage;
        t.cooldown += s.combo.cooldown - s.cooldown;
      }
      this.events.push({ k: 'shot', t: t.id, e: target.id, ...(fin ? { c: 2 } : {}) });
      this.damage(t, target, dmg);
      if (fin && this.enemies.has(target.id)) this.knockBack(target, s.combo.knock);
    } else if (s.crit) {
      const crit = ++t.swings % s.crit.every === 0;
      if (crit) dmg = s.crit.damage;
      else if (!s.stunAll) stun = 0;
      if (t.riotT > 0) dmg *= 2;
      this.events.push({ k: 'shot', t: t.id, e: target.id, ...(crit ? { c: 1 } : {}) });
      this.damage(t, target, dmg);
    } else if (def.fly) this.launch(t, s, target, dmg, stun);
    else if (lucky) {
      this.events.push({ k: 'shot', t: t.id, e: target.id, c: 1 });
      this.damage(t, target, dmg);
    } else this.shoot(t, target, dmg);
    if (s.pass) this.passThrough(t, s, target, dmg);
    if (collat) this.collateralBounce(t, s, collat);
    if (s.combine && this.enemies.has(target.id)) this.combinePellet(t, s, target); // Lightbeamer pellets
    // Focus: shots at zombies inside its inner range don't add heat.
    if (s.ammo && !(s.coolRange && (target.x - t.x) ** 2 + (target.z - t.z) ** 2 <= s.coolRange ** 2)) this.useAmmo(t, s);
    if (s.railgun) this.chargeRailgun(t, s, target); // The Eldritch
    // Ruptor: the last shot of every burst explodes.
    if (s.boom && t.burstLeft === 0) this.explode(t, target.x, target.z, { damage: s.boom.damage, radius: s.boom.radius, det: this.detects(t, s) });
    if (s.cash && ++t.cashN % s.cash.every === 0) this.cashShot(t, s.cash);
    if (def.fly) return; // the projectile's effects happen when it lands
    if (!this.enemies.has(target.id)) {
      if (def.burstStops) t.burstLeft = 0; // Huntsman: its burst ends when the target dies
      return;
    }
    if (s.extra) this.spread(t, s, target);
    this.hitEffects(t, def, s, target, stun);
  }
}
