// Summoned units: spawner towers, their queues, and how units drive, fight and die (updateUnits).
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { ENEMIES, GAME, TOWERS, canHit, choicesOf, spawnExtras, unitDetection, unitGunKind } from '../../config.js';
import { path } from '../path.js';
import { CONTACT, WRECK_BLAST, buffOf, r2 } from './shared.js';

export class SimUnits {

  // ---------------------------------------------------------------- spawners & units

  /** Spawner towers send a unit every `spawnEvery` seconds of wave time. */
  updateSpawner(t, def, s, dt) {
    if (this.wave.state !== 'wave') return;
    if (s.roster) return this.updateQueues(t, s, dt);
    if (s.plants) return this.updatePlants(t, def, s, dt);
    if (s.drawings) return this.updateStella(t, s, dt);
    const cap = s.maxUnits ?? def.maxUnits; // Surveyor: its drone cap grows with upgrades
    const full = () => cap && this.unitsOf(t.id).length >= cap;
    // Extra units on their own timers (Armored Factory, Field Barracks). Each rolls out as soon as it's unlocked.
    for (const x of spawnExtras(s)) {
      const k = `spawnT${x.n}`;
      t[k] = (t[k] ?? 0) - dt;
      if (t[k] <= 0) {
        if (full() || this.unitCapped(t, x.unit)) {
          t[k] = 0; // Elf Camp: wait for a free slot
          continue;
        }
        t[k] = x.every;
        this.spawnUnits(t, x.unit);
      }
    }
    t.spawnT -= dt;
    if (t.spawnT > 0) return;
    if (full() || this.unitCapped(t, s.unit)) {
      t.spawnT = 0; // wait for a free slot
      return;
    }
    t.spawnT = s.spawnEvery ?? def.spawnEvery;
    this.spawnUnits(t, s.unit);
  }

  /**
   * Crook Boss: every `goons.every` seconds of wave time it calls in its goons (one unit per
   * def in `goons.units`, a little apart) and stops shooting for `callPause` seconds.
   * Returns true while it is busy calling.
   */
  updateGoons(t, def, s, dt) {
    t.callT = Math.max(0, (t.callT || 0) - dt);
    if (this.wave.state === 'wave') {
      t.spawnT -= dt;
      if (t.spawnT <= 0) {
        t.spawnT = s.goons.every;
        s.goons.units.forEach((u, i) => this.spawnUnit(t, u, i * 2));
        t.callT = def.callPause ?? 0;
        this.events.push({ k: 'goons', id: t.id, x: t.x, z: t.z, n: s.goons.units.length });
      }
    }
    return t.callT > 0;
  }

  /**
   * Mercenary Base: `s.queues` queues each train one unit at a time, taking turns through the
   * roster. Upgrades add queues and units; a unit uses the tower's current level when it rolls out.
   */
  updateQueues(t, s, dt) {
    this.fillQueues(t, s);
    for (const q of t.queues) {
      q.left -= dt;
      if (q.left > 0) continue;
      this.spawnUnit(t, s.roster[q.r].unit, 0, this.deployDist(t, s), t.deployR);
      this.nextInQueue(t, s, q);
    }
  }

  fillQueues(t, s) {
    t.queues ??= [];
    while (t.queues.length < s.queues) {
      const q = { r: 0, left: 0 };
      this.nextInQueue(t, s, q);
      t.queues.push(q);
    }
  }

  /** The next unit in the roster that isn't switched off in the tower panel. */
  nextInQueue(t, s, q) {
    const n = s.roster.length;
    for (let i = 0; i < n; i++) {
      t.rot = (t.rot ?? -1) + 1;
      if (!t.off?.includes(String(t.rot % n))) break;
    }
    q.r = t.rot % n;
    q.left = s.roster[q.r].every;
  }

  /**
   * Biologist: each queue grows the plant picked for it (tower field `choice`) over the plant's
   * `every` s, then plants it on a random bit of path inside the tower's range. No path in range, no plants.
   */
  updatePlants(t, def, s, dt) {
    const picks = choicesOf(def, s, t.choice);
    t.plantT ??= [];
    if (t.spotsR !== s.range) {
      t.spots = this.trapSpots(t, s.range);
      t.spotsR = s.range;
    }
    picks.forEach((key, i) => {
      const p = s.plants.find((x) => x.key === key);
      t.plantT[i] = (t.plantT[i] ?? p.every) - dt;
      if (t.plantT[i] > 0) return;
      if (!t.spots.length) {
        t.plantT[i] = 0;
        return;
      }
      t.plantT[i] = p.every;
      const spot = t.spots[Math.floor(Math.random() * t.spots.length)];
      const u = this.spawnUnit(t, p.unit, 0, spot.d, spot.r);
      u.lateral = (Math.random() - 0.5) * 2.4;
      this.placeUnit(u);
      this.events.push({ k: 'sprout', x: r2(u.x), z: r2(u.z) });
    });
  }

  /** Mercenary Base: units roll out at the castle-most bit of path inside its range (or the castle if none is). */
  deployDist(t, s) {
    t.deployR = path.nearestRoute(t.x, t.z);
    if (!s.range) return path.length - 1;
    if (t.spotsR !== s.range) {
      t.spots = this.trapSpots(t, s.range);
      t.spotsR = s.range;
    }
    if (!t.spots.length) return path.length - 1;
    const last = t.spots[t.spots.length - 1];
    t.deployR = last.r ?? 0;
    return last.d;
  }

  /** Air-Drop: every unit in the queues drops onto the path near (x, z), and the queues start over. */
  airDrop(t, s, x, z) {
    this.fillQueues(t, s);
    const d = path.project(x, z);
    const route = path.lastRoute;
    t.queues.forEach((q, i) => {
      const u = this.spawnUnit(t, s.roster[q.r].unit, 0, path.length - 1, route);
      u.dist = Math.max(0, Math.min(path.length - 1, d + (i - (t.queues.length - 1) / 2) * 2));
      this.placeUnit(u);
      this.nextInQueue(t, s, q);
    });
    const p = path.at(d, {}, route);
    this.events.push({ k: 'airdrop', x: r2(p.x), z: r2(p.z), n: t.queues.length });
  }

  unitsOf(towerId) {
    return [...this.units.values()].filter((u) => u.tower === towerId);
  }

  /** How many units with this def's name tower `t` has out (Relic: `max` caps each unit type). */
  countOf(t, def) {
    let n = 0;
    for (const u of this.units.values()) if (u.tower === t.id && u.def.name === def.name) n++;
    return n;
  }

  unitCapped(t, def) {
    return !!def.max && this.countOf(t, def) >= def.max;
  }

  /** Sends `def.count` (or 1) of a unit, a little apart (War Machine Factory Abrams Walkers come in pairs), but never more than its `max`. */
  spawnUnits(t, def) {
    const n = def.max ? Math.min(def.count || 1, def.max - this.countOf(t, def)) : def.count || 1;
    // Valkyr / Punkbuster / Squadron / Borealis: units start at the drop point picked with an ability.
    const start = t.dropD ?? (TOWERS[t.type].throwNear ? path.project(t.x, t.z) : path.length - 1); // throwNear: the path closest to it
    const route = t.dropD != null ? t.dropR ?? 0 : path.nearestRoute(t.x, t.z);
    for (let i = 0; i < n; i++) this.spawnUnit(t, def, i * 4, start, route);
    // Void Port: a train's wagons follow its locomotive.
    if (def.train) def.train.forEach((w, i) => this.spawnUnit(t, w, (n + i) * 4, start, route));
  }

  /** A unit starts at the castle end of the path (or `start`). It keeps its tower's firerate boost from now on. */
  spawnUnit(t, def, back = 0, start = path.length - 1, route = path.nearestRoute(t.x, t.z)) {
    const n = def.soldiers || 1;
    const u = {
      id: this.nextId++, tower: t.id, model: def.model, def,
      hp: def.hp * n, maxHp: def.hp * n, alive: n,
      dist: Math.max(0, start - back), route: route ?? 0, lateral: 0, speed: def.speed,
      rate: buffOf(this.buffs, t.id).rate,
      cooldown: 0, gap: 0, burstLeft: 0, cannonT: def.cannon ? def.cannon.every / 2 : 0, yaw: 0,
      beamT: def.beam ? def.beam.first ?? def.beam.every : 0, summonT: def.summon ? def.summon.every : 0, pauseT: 0,
      life: def.life ?? 0, // Biologist plants / Ice Turrets: seconds until it wilts (0 = forever)
    };
    if (TOWERS[t.type].noBuff) u.rate = 1; // Elf Camp / Biologist: support towers can't boost them
    this.placeUnit(u);
    if (def.free) {
      // Crows, bees and Volt Points live off the path: they start at their tower.
      u.x = t.x;
      u.z = t.z;
    }
    if (def.reveal) {
      // Punkbuster summons: hidden zombies near where they land are revealed.
      for (const e of this.enemies.values()) if (e.hidden && (e.x - u.x) ** 2 + (e.z - u.z) ** 2 <= def.reveal.radius ** 2) e.revealT = Math.max(e.revealT || 0, def.reveal.time);
    }
    this.units.set(u.id, u);
    t.unitsOut = true;
    return u;
  }

  placeUnit(u) {
    path.at(u.dist, u, u.route);
    u.x += -u.dz * u.lateral;
    u.z += u.dx * u.lateral;
  }

  /** Units shoot (First), fire cannons, drive toward the entrance and crash into zombies. */
  updateUnits(dt) {
    // Field Medics shield units near them (less contact damage) and heal them.
    const medics = [...this.units.values()].filter((u) => u.def.heal);
    const shieldOf = (u) => {
      let best = 0;
      for (const m of medics) {
        const h = m.def.heal;
        if (m !== u && (m.x - u.x) ** 2 + (m.z - u.z) ** 2 <= h.range * h.range) best = Math.max(best, h.shield || 0);
      }
      return best;
    };
    for (const m of medics) {
      const h = m.def.heal;
      m.healing = false;
      for (const o of this.units.values()) {
        if (o === m || o.hp >= o.maxHp || (o.x - m.x) ** 2 + (o.z - m.z) ** 2 > h.range * h.range) continue;
        o.hp = Math.min(o.maxHp, o.hp + h.rate * dt);
        m.healing = true;
      }
      // A medic waits with units that are fighting nearby instead of walking off alone.
      if (!m.healing) for (const o of this.units.values()) if (o !== m && o.speed === 0 && (o.x - m.x) ** 2 + (o.z - m.z) ** 2 <= h.range * h.range) m.healing = true;
    }
    for (const u of this.units.values()) {
      const d = u.def;
      const tower = this.towers.get(u.tower) ?? null;
      if (d.free) {
        this.updateFree(u, tower, dt); // crows, bees, Volt Points
        continue;
      }
      if (u.starT > 0 && (u.starT -= dt) <= 0) {
        this.destroyUnit(u, tower); // Kart Kid: the star ran out
        continue;
      }
      if (d.life && (u.life -= dt) <= 0) {
        this.units.delete(u.id); // a plant wilts / an Ice Turret melts
        this.events.push({ k: 'udie', u: u.id, x: r2(u.x), z: r2(u.z), wilt: 1 });
        continue;
      }
      if (u.ghostT > 0) {
        // Gold Commander cyber tank ghost: can't be hurt, fades away after a while.
        u.hp = u.maxHp;
        if ((u.ghostT -= dt) <= 0) {
          this.units.delete(u.id);
          this.events.push({ k: 'udie', u: u.id, x: r2(u.x), z: r2(u.z), wilt: 1 });
          continue;
        }
      }
      if (d.decay) {
        // Valkyr mechs: an air leak slowly drains their health.
        u.hp -= d.decay * dt;
        if (u.hp <= 0) {
          this.destroyUnit(u, tower);
          continue;
        }
      }
      if (d.builds) this.buildAlong(u, tower); // Ducky Engineer sentries
      u.cooldown = Math.max(-dt, u.cooldown - dt * u.rate);
      u.gap = Math.max(0, u.gap - dt);
      const g = d.gun;
      const target = g ? this.unitTarget(u, g.range) : null;
      if (target) {
        u.yaw = Math.atan2(target.x - u.x, target.z - u.z);
        let fire = false;
        if (u.burstLeft > 0) fire = u.gap <= 0;
        else if (u.cooldown <= 0) {
          u.burstLeft = g.burst || 1;
          u.cooldown += g.cooldown;
          fire = true;
        }
        if (fire) {
          u.burstLeft--;
          u.gap = g.burstGap ?? 0.1;
          // Every soldier in a squad fires.
          for (let i = 0; i < u.alive; i++) {
            const e = i === 0 ? target : this.unitTarget(u, g.range);
            if (!e) break;
            if (g.flame) {
              // Flamethrower: fire on every zombie in range it can see (one spray per unit).
              if (i) break;
              const det = unitDetection(d);
              for (const z of [...this.enemies.values()]) {
                if (!canHit(det, z) || (z.x - u.x) ** 2 + (z.z - u.z) ** 2 > g.range * g.range) continue;
                if (z.fireImmune) continue; // Fire Slimes shrug off flames
                if (g.burn) this.ignite(z, u.tower, g.burn, g.burnTime, 0);
                this.damage(tower, z, g.damage);
              }
              this.events.push({ k: 'uflame', u: u.id, y: r2(u.yaw), r: g.range });
              continue;
            }
            if (g.radius) {
              // Grenadier: a grenade lobbed at the zombie, hurting everyone in the blast.
              const time = 0.5;
              const p = this.leadPoint(e, time);
              this.shells.push({ tower: u.tower, x: p.x, z: p.z, time, damage: g.damage, radius: g.radius, det: unitDetection(d), pierceArmor: d.pierceArmor });
              this.events.push({ k: 'ulob', u: u.id, x: r2(p.x), z: r2(p.z), d: time });
              continue;
            }
            this.events.push({ k: 'ushot', u: u.id, e: e.id, i, ...(g.rail ? { rail: 1 } : {}) });
            if (g.splash) {
              // Ivy: a splash around its target that poisons and slows.
              const det = unitDetection(d);
              const x = e.x;
              const z = e.z;
              this.events.push({ k: 'boom', x: r2(x), z: r2(z), r: g.splash, gas: 1 });
              for (const o of [...this.enemies.values()]) {
                if (!canHit(det, o) || (o.x - x) ** 2 + (o.z - z) ** 2 > g.splash * g.splash) continue;
                if (g.poison && tower) this.applyPoison(tower, o, g.poison);
                this.damage(tower, o, g.damage);
              }
              continue;
            }
            // Oddport students: harder hits the closer the zombie (`dmgMin` at the edge of their range).
            const gd = g.dmgMin != null ? Math.round((g.dmgMin + (g.damage - g.dmgMin) * Math.max(0, 1 - Math.hypot(e.x - u.x, e.z - u.z) / g.range)) * 100) / 100 : g.damage;
            this.damage(tower, e, gd, false, unitGunKind(d, g));
            if (this.enemies.has(e.id)) {
              if (g.chill && tower) this.applyChill(tower, g.chill, e); // Ice Turret
              if (g.poison && tower) this.applyPoison(tower, e, g.poison);
              if (g.confuse) this.confuse(e, g.confuse.time, g.confuse.cd); // Nightshade
              // Overseer Prime Cleaving Claw: stuns what it hits (not bosses).
              if (g.stun && !e.boss && !e.statusImmune && !(e.stop >= g.stun)) {
                e.stop = g.stun;
                e.stopKind = 'stun';
                e.speed = 0;
              }
            }
            // Riot Guard: shoves the zombie back down the path (bosses are too heavy).
            if (g.knock && this.enemies.has(e.id) && !e.boss) e.dist = Math.max(0, e.dist - g.knock);
          }
        }
      } else {
        u.cooldown = Math.max(0, u.cooldown);
        u.burstLeft = 0;
      }
      if (d.cannon) {
        const c = d.cannon;
        u.cannonT = Math.max(0, u.cannonT - dt * u.rate);
        // A cannon-only vehicle (no gun) aims with the cannon's own range.
        // Overseer Prime Radiant Smite: a cannon with its own range reaches further than the gun.
        const aim = u.cannonT <= 0 && (target && this.enemies.has(target.id) ? target : this.unitTarget(u, c.range ?? g.range));
        if (aim) {
          u.cannonT = c.every;
          this.events.push({ k: 'ushot', u: u.id, e: aim.id, c: 1 });
          const ax = aim.x;
          const az = aim.z;
          this.explode(tower, ax, az, { damage: c.damage, splash: c.splash, radius: c.radius, main: aim.id, det: unitDetection(d), ignoreExplosiveResist: d.ignoreExplosiveResist || c.ignoreExplosiveResist });
          if (c.stun || c.knock) this.smash(c, ax, az, unitDetection(d));
        }
      }

      if (d.beam) {
        // Overseer Prime Sigil of Destruction: a long laser at one zombie.
        u.beamT = Math.max(0, u.beamT - dt * u.rate);
        const e = u.beamT <= 0 && this.unitTarget(u, d.beam.range);
        if (e) {
          u.beamT = d.beam.every;
          this.events.push({ k: 'ushot', u: u.id, e: e.id, rail: 1 });
          this.damage(tower, e, d.beam.damage, false, 'laser');
        }
      }
      if (d.summon && tower) {
        // Overseer Prime Ancient Awakening: stops to call a unit beside it.
        u.summonT -= dt;
        if (u.summonT <= 0) {
          u.summonT = d.summon.every;
          u.pauseT = d.summon.pause;
          this.spawnUnit(tower, d.summon.unit, 0, u.dist, u.route);
          this.events.push({ k: 'sprout', x: r2(u.x), z: r2(u.z) });
        }
      }
      u.pauseT = Math.max(0, u.pauseT - dt);

      // Squads stop while they have something to shoot; vehicles keep driving.
      u.speed = (d.soldiers && (target || u.healing)) || u.pauseT > 0 ? 0 : target && d.slowFire ? d.speed * 0.4 : d.speed; // slowFire: Turret Trucks, Void Port carts
      if (u.starT > 0) u.speed = d.speed * 1.6; // Kart Kid star power
      // Bubble Companion: stands its ground while it's blocking a zombie.
      if (d.block) for (const e of this.enemies.values()) if (!e.flying && !e.remains && !ENEMIES[e.type].noCollide && e.route === u.route && Math.abs(e.dist - u.dist) <= CONTACT) u.speed = 0;
      if (d.still) {
        // Plants and Ice Turrets stay put; zombies walking over them still wear them down.
        u.speed = 0;
      }
      const from = u.dist; // where it was before this tick's move (for the pass-through check below)
      if (!d.still) {
        u.dist -= u.speed * dt;
        if (u.dist <= 0) {
          this.units.delete(u.id); // reached the entrance
          continue;
        }
        this.placeUnit(u);
      }
      if (d.air || u.ghostT > 0) continue; // Gift Bombers fly over the zombies; ghosts pass through them

      // Crashes (hidden zombies too: you don't need to see a zombie to run it over).
      // Every walking summon crashes: vehicles and squads alike (Punkbuster punks, Field Barracks
      // soldiers... used to let zombies walk straight through them). Only still units (plants, Ice
      // Shards) and blockers (Bubble Companions) take contact damage instead.
      const crash = !d.still && !d.block;
      for (const e of this.enemies.values()) {
        if (e.flying) continue; // flyers pass overhead
        if (e.route !== u.route) continue; // another lane
        if (ENEMIES[e.type].noCollide) continue; // Halloween Ghosts float right through units
        if (ENEMIES[e.type].tankPass && /tank/i.test(d.model ?? '')) continue; // Halloween Night 2 Witches fly through tanks
        // Touching, or they swapped sides since the last tick (a fast zombie and a unit can jump
        // past each other in one step without ever being within CONTACT).
        const gap = e.dist - u.dist;
        if (Math.abs(gap) > CONTACT && !((e.ud ?? e.dist) - from > 0 !== gap > 0)) continue;
        if (d.noGhosts && ENEMIES[e.type].model === 'ghost') continue; // elves walk right through Ghosts
        if (d.block) e.holdT = Math.max(e.holdT || 0, 0.1); // Bubble Companion: zombies can't walk past it
        if (u.starT > 0) {
          // Kart Kid star: invincible; smashes each zombie once, a bit weaker with every hit.
          if (u.starHits.has(e.id)) continue;
          u.starHits.add(e.id);
          this.damage(tower, e, Math.round(u.starDmg));
          u.starDmg *= d.star.fade;
          continue;
        }
        if (crash) {
          // Behemoths take less damage when they ram (ramArmor), so they hit for more before breaking.
          const soak = 1 - (d.ramArmor || 0);
          const hit = Math.min(e.hp, u.hp / soak);
          u.hp -= hit * soak;
          this.crashing = true; // Rebirther: Enforcement Base / Buccaneer crashes get through Blood Sacrifice
          this.damage(tower, e, hit * (1 - (ENEMIES[e.type].collisionResist ?? 0)), d.pierceArmor); // Elf crashes ignore armor; Medium bosses resist crashes
          this.crashing = false;
          if (d.burn && this.enemies.has(e.id)) this.ignite(e, u.tower, d.burn.dps, d.burn.time, 0); // Slime King fire slimes
        } else {
          // Field Barracks soldiers hurt the zombies they bump into.
          if (d.bump) this.damage(tower, e, d.bump * u.alive * dt);
          u.hp -= ENEMIES[e.type].damage * GAME.unitContact * (d.hurt ?? 1) * dt * (medics.length ? 1 - shieldOf(u) : 1) * (1 - (d.defense || 0)); // hurt: Bubble Companions pop faster
        }
        if (u.hp <= 0) break;
      }
      if (u.hp <= 0 && d.revive && (u.revived || 0) < d.revive) {
        // Oddport: Reese patches the whole group back up.
        u.revived = (u.revived || 0) + 1;
        u.hp = u.maxHp;
        this.events.push({ k: 'chaos', x: r2(u.x), z: r2(u.z), text: '✚ Revived!', color: '#ff8a80' });
      }
      if (u.hp <= 0 && d.ghost && !u.ghostT) {
        // Gold Commander cyber tank: destroyed, it fights on as a ghost (it just can't ram).
        u.ghostT = d.ghost.life;
        u.hp = u.maxHp;
        u.model = `${d.model}ghost`;
        this.events.push({ k: 'chaos', x: r2(u.x), z: r2(u.z), text: '👻 Ghost form!', color: '#fff59d' });
      }
      if (u.hp <= 0 && d.star && !u.starUsed) {
        // Kart Kid Lv 5: out of health, it grabs a star instead of breaking.
        u.starUsed = true;
        u.starT = d.star.time;
        u.starDmg = d.star.damage;
        u.starHits = new Set();
        u.hp = u.maxHp;
        this.events.push({ k: 'chaos', x: r2(u.x), z: r2(u.z), text: '★ Star power!', color: '#ffd740' });
      }
      if (d.soldiers) u.alive = Math.max(0, Math.ceil(u.hp / d.hp - 1e-6));
      if (u.hp <= 0) this.destroyUnit(u, tower);
    }
    for (const e of this.enemies.values()) e.ud = e.dist; // for next tick's pass-through check
  }

  /**
   * War Machine punch: every zombie in the blast is knocked back `c.knock` and stunned for `c.stun`
   * s, bosses and stun-immune ones too (at full length).
   */
  smash(c, x, z, det) {
    const r2max = c.radius * c.radius;
    for (const e of this.enemies.values()) {
      if (!canHit(det, e) || (e.x - x) ** 2 + (e.z - z) ** 2 > r2max) continue;
      if (c.knock) e.dist = Math.max(0, e.dist - c.knock);
      if (c.stun && !(e.stop >= c.stun && e.stopKind)) {
        e.stop = c.stun;
        e.stopKind = 'stun';
        e.speed = 0;
      }
    }
  }

  /** The zombie closest to the castle within `range` of the unit. Units only see hidden / flying / lead zombies if their def says so. */
  unitTarget(u, range, def = u.def) {
    const r2max = range * range;
    const det = unitDetection(def);
    let best = null;
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      if ((e.x - u.x) ** 2 + (e.z - u.z) ** 2 > r2max) continue;
      if (!best || e.dist > best.dist) best = e;
    }
    return best;
  }

  destroyUnit(u, tower) {
    this.units.delete(u.id);
    if (u.def.onDeath && tower) {
      // Trojan Duck: lets its passengers out where it went down.
      const o = u.def.onDeath;
      for (let i = 0; i < o.n; i++) this.spawnUnit(tower, o.unit, 0, Math.min(path.length - 1, u.dist + i * 1.2), u.route);
    }
    if (u.def.cash && tower) {
      // Kingpin Money Runner: pays its tower's owner when it goes down.
      const p = this.players.get(tower.owner);
      if (p) p.cash += u.def.cash;
      this.events.push({ k: 'bountyPaid', x: r2(u.x), z: r2(u.z), v: u.def.cash, owner: tower.owner, run: 1 });
    }
    let ex = u.def.explode;
    // Buzzer Dark Summoner: its owner's summons explode for half their max health.
    if (!ex && !u.def.point && tower && this.players.get(tower.owner)?.darkSummon && u.maxHp > 1) ex = { damage: Math.round(u.maxHp / 2), radius: 6 };
    this.events.push({ k: 'udie', u: u.id, x: r2(u.x), z: r2(u.z), ...(ex ? { boom: 1 } : {}) });
    if (ex) this.explode(tower, u.x, u.z, { damage: ex.damage, radius: ex.radius, det: WRECK_BLAST, pierceArmor: u.def.pierceArmor, freeze: ex.freeze, ice: ex.ice, ignoreIceResist: ex.ignoreIceResist }); // Ice Shard: freezes too (through ice resistance)
  }

  removeUnitsOf(towerId) {
    for (const u of this.units.values()) if (u.tower === towerId) this.units.delete(u.id);
  }
}
