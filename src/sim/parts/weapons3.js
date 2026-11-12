// Tower weapons, part 3: builders, graves, sentries, hackers and clones, slime and ice, boomerangs
// and blades, knock-back and other tricks.
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { BOSS_KNOCK, ENEMIES, KNOCK_STUDS, TOWERS, canHit, cloneCost, rootType, towerMaxHp, unitDetection } from '../../config.js';
import { angleDiff, lerpAngle } from '../../utils.js';
import { canPlace, placeFail } from '../map.js';
import { PATH_WIDTH, path } from '../path.js';
import {
  BUILD_SPOTS, GROUND_BLAST, PELLET_WIDTH, RANG_HIT, TAU, beamHealable, bladePos, buffOf, iceFx, r2, rangTime,
  stunImmune,
} from './shared.js';

export class SimWeapons3 {

  // ---------------------------------------------------------------- builders (Necromancer, Engineer)

  buildsOf(towerId, kind) {
    const list = [];
    for (const tr of this.traps.values()) if (tr.tower === towerId && tr.kind === kind) list.push(tr);
    return list;
  }

  /**
   * Fills the soul / scrap meter's bookkeeping and, once it's full, stops the tower for `build`
   * seconds while it raises a gravestone or builds a sentry. Returns true while it is busy.
   */
  updateBuilder(t, s, dt) {
    const need = s.souls || s.scrap;
    t.meter = Math.min(need, t.meter || 0);
    if (t.buildT < 0) t.buildT = Math.min(0, t.buildT + dt); // nowhere to build last time: wait a bit
    if (t.buildT > 0) {
      t.buildT -= dt;
      t.charge = 1;
      if (t.buildT > 0) return true;
      t.buildT = 0;
      if (s.souls ? this.raiseGrave(t, s) : this.buildSentry(t, s)) t.meter = 0;
      else t.buildT = -4;
      t.cooldown = Math.max(0, t.cooldown);
      t.burstLeft = 0;
    } else if (t.buildT === 0 && t.meter >= need && (s.souls ? this.canGrave(t, s) : this.buildsOf(t.id, 'sentry').length < s.sentries)) {
      t.buildT = s.build;
      this.events.push({ k: 'building', t: t.id, d: s.build });
      return true;
    }
    t.charge = t.meter / need;
    return false;
  }

  /** Can the Necromancer raise a new gravestone, or upgrade one it has? */
  canGrave(t, s) {
    const graves = this.buildsOf(t.id, 'grave');
    return graves.length < s.graves || graves.some((g) => g.lvl < s.graveLvl);
  }

  /** A new gravestone beside the path in range, or (with all of them up) the lowest one gets a level. */
  raiseGrave(t, s) {
    const graves = this.buildsOf(t.id, 'grave');
    if (graves.length >= s.graves) {
      let low = null;
      for (const g of graves) if (g.lvl < s.graveLvl && (!low || g.lvl < low.lvl)) low = g;
      if (!low) return false;
      low.lvl++;
      this.events.push({ k: 'graveUp', x: r2(low.x), z: r2(low.z), lvl: low.lvl });
      return true;
    }
    if (t.spotsR !== s.range) {
      t.spots = this.trapSpots(t, s.range);
      t.spotsR = s.range;
    }
    if (!t.spots.length) return false;
    // Spread them out: try a few random spots and keep the one farthest from the other graves.
    let best = null;
    let bestGap = -1;
    for (let i = 0; i < 8; i++) {
      const p = t.spots[Math.floor(Math.random() * t.spots.length)];
      let gap = Infinity;
      for (const g of graves) gap = Math.min(gap, Math.abs(g.d - p.d));
      if (gap > bestGap) {
        bestGap = gap;
        best = p;
      }
    }
    const side = Math.random() < 0.5 ? -1 : 1;
    const lat = side * (PATH_WIDTH / 2 + 1.2);
    const g = { id: this.nextId++, tower: t.id, kind: 'grave', x: best.x - best.dz * lat, z: best.z + best.dx * lat, d: best.d, r: best.r ?? 0, lvl: 1, land: 0, uses: 1, yaw: Math.atan2(best.dz * side, -best.dx * side) }; // facing the path
    this.traps.set(g.id, g);
    t.yaw = Math.atan2(g.x - t.x, g.z - t.z);
    this.events.push({ k: 'grave', t: t.id, x: r2(g.x), z: r2(g.z) });
    return true;
  }

  /** Raise the Dead: every gravestone breaks and summons a unit (Level `boomLvl` ones also explode). */
  raiseDead(t, s) {
    for (const g of this.buildsOf(t.id, 'grave')) {
      const pool = s.raise[Math.min(g.lvl, s.raise.length) - 1];
      const u = this.spawnUnit(t, pool[Math.floor(Math.random() * pool.length)]);
      u.dist = Math.max(0, Math.min(path.length - 1, g.d));
      u.route = g.r ?? 0;
      u.lateral = 0; // single file
      this.placeUnit(u);
      this.traps.delete(g.id);
      const boom = s.boomLvl && g.lvl >= s.boomLvl;
      this.events.push({ k: 'trapGone', id: g.id, kind: 'grave', x: r2(g.x), z: r2(g.z) });
      if (boom) this.explode(t, g.x, g.z, { damage: s.boom.damage, radius: s.boom.radius, det: GROUND_BLAST });
    }
  }

  /**
   * Mechanic: every `buildEvery` s of wave time it builds the next turret of `sentryCycle` (up to
   * `sentries` at once). It keeps shooting meanwhile.
   */
  updateTurrets(t, s, dt) {
    if (this.wave.state !== 'wave') return;
    t.turretT = (t.turretT ?? 2) - dt;
    if (t.turretT > 0) return;
    if (s.devices) {
      // Engineer: builds the first device it has fewer of than its max.
      const mine = this.buildsOf(t.id, 'sentry');
      const k = s.devices.findIndex((d, i) => mine.filter((o) => o.slot === i).length < d.max);
      if (k < 0) t.turretT = 0;
      else t.turretT = this.buildSentry(t, { ...s, sentry: s.devices[k].def }, k) ? s.buildEvery : 2;
      return;
    }
    if (this.buildsOf(t.id, 'sentry').length >= s.sentries) {
      t.turretT = 0;
      return;
    }
    const st = s.sentryCycle[(t.turretN ?? 0) % s.sentryCycle.length];
    if (this.buildSentry(t, { ...s, sentry: st })) {
      t.turretN = (t.turretN ?? 0) + 1;
      t.turretT = s.buildEvery;
    } else t.turretT = 2; // no room right now
  }

  /** A sentry on open ground between the Engineer's deadzone and its build range. */
  buildSentry(t, s, slot = null) {
    const def = TOWERS[t.type];
    const blockers = [...this.towers.values(), ...this.traps.values()].filter((o) => !o.kind || o.kind === 'sentry');
    const inner = (def.minRange || 0) + 1.5;
    for (let i = 0; i < BUILD_SPOTS; i++) {
      const a = Math.random() * TAU;
      const r = inner + Math.sqrt(Math.random()) * (s.buildRange - inner);
      const x = t.x + Math.sin(a) * r;
      const z = t.z + Math.cos(a) * r;
      if (!canPlace(x, z, blockers, 'ground')) continue;
      const st = s.sentry;
      const sn = { id: this.nextId++, tower: t.id, kind: 'sentry', x, z, land: 0, uses: 1, hp: st.hp, maxHp: st.hp, yaw: a, cooldown: 0, rocketT: 0, stunT: 0, lvl: t.level };
      if (s.sentryCycle || slot != null) {
        // Mechanic turrets keep their own kind; `lvl` 100+ picks its model (see makeSentry).
        // Engineer devices remember their slot so upgrades can swap them (models 100+ -> lvl 200+).
        sn.def = st;
        sn.lvl = 100 + st.model;
        if (slot != null) sn.slot = slot;
      }
      this.traps.set(sn.id, sn);
      t.yaw = a;
      this.events.push({ k: 'sentry', t: t.id, x: r2(x), z: r2(z) });
      return true;
    }
    return false; // no room: try again later with the meter still full
  }

  /** Sentries shoot (First, by their own detection), fire rockets and slowly break down. */
  updateSentries(dt) {
    for (const sn of this.traps.values()) {
      if (sn.kind !== 'sentry') continue;
      const t = this.towers.get(sn.tower);
      if (!t) {
        this.traps.delete(sn.id);
        continue;
      }
      if (sn.slot != null) {
        // Engineer upgraded: its devices become the new model, keeping their share of health.
        const cur = TOWERS[t.type].levels[t.level].devices?.[sn.slot]?.def;
        if (cur && cur !== sn.def) {
          sn.hp = (sn.hp / sn.maxHp) * cur.hp;
          sn.maxHp = cur.hp;
          sn.def = cur;
          sn.lvl = 100 + cur.model;
        }
      }
      const st = sn.def ?? TOWERS[t.type].levels[t.level].sentry;
      if (!sn.def && sn.maxHp !== st.hp) {
        // The Engineer was upgraded: the sentry becomes the new model, keeping its share of health.
        sn.hp = (sn.hp / sn.maxHp) * st.hp;
        sn.maxHp = st.hp;
      }
      if (!sn.def) sn.lvl = t.level;
      sn.hp -= st.decay * dt;
      if (sn.hp <= 0) {
        this.traps.delete(sn.id);
        this.events.push({ k: 'trapGone', id: sn.id, kind: 'sentry', x: r2(sn.x), z: r2(sn.z) });
        continue;
      }
      sn.stunT = Math.max(0, sn.stunT - dt);
      if (sn.stunT > 0) continue;
      if (st.heal) {
        // Mender: heals every tower near it (a share of max health + a flat amount a second).
        const h = st.heal;
        for (const o of this.towers.values()) {
          if ((o.x - sn.x) ** 2 + (o.z - sn.z) ** 2 > h.radius * h.radius || !beamHealable(o)) continue;
          this.healTower(o, (o.maxHp * h.pct + h.flat) * dt);
        }
        continue;
      }
      const rate = buffOf(this.buffs, t.id).rate;
      sn.cooldown = Math.max(-dt, sn.cooldown - dt * rate);
      sn.rocketT = Math.max(0, sn.rocketT - dt * rate);
      const target = this.unitTarget(sn, st.gun.range, st);
      if (!target) {
        sn.cooldown = Math.max(0, sn.cooldown);
        continue;
      }
      sn.yaw = Math.atan2(target.x - sn.x, target.z - sn.z);
      if (sn.cooldown <= 0) {
        sn.cooldown += st.gun.cooldown;
        this.events.push({ k: 'sshot', s: sn.id, e: target.id });
        const g = st.gun;
        // Mechanic turrets: their own defense piercing / shield damage, Tesla zaps, Detonator blasts.
        this.hitMods = g.defPierce != null || g.shieldMult ? { defPierce: g.defPierce, shieldMult: g.shieldMult } : null;
        if (g.all) {
          const det = unitDetection(st);
          for (const e of [...this.enemies.values()]) {
            if (!canHit(det, e) || (e.x - sn.x) ** 2 + (e.z - sn.z) ** 2 > g.range * g.range) continue;
            this.damage(t, e, g.damage);
            if (g.stun && this.enemies.has(e.id)) this.stop({ bossStop: 0.25 }, e, g.stun, 'stun');
          }
        } else if (g.radius) this.explode(t, target.x, target.z, { damage: g.damage, radius: g.radius, main: target.id, det: unitDetection(st) });
        else this.damage(t, target, g.damage);
        this.hitMods = null;
      }
      if (st.rocket && sn.rocketT <= 0 && this.enemies.has(target.id)) {
        sn.rocketT = st.rocket.every;
        this.events.push({ k: 'sshot', s: sn.id, e: target.id, c: 1 });
        this.explode(t, target.x, target.z, { damage: st.rocket.damage, radius: st.rocket.radius, main: target.id, det: unitDetection(st) });
      }
    }
  }

  /**
   * Necromancer bolt: flies from the tower through `target` to the edge of its range, hitting up
   * to `pierce` zombies along the way (closest first). Each zombie hit adds a soul. Apostle of
   * Hades: hits in a row on the same main target stack extra damage.
   */
  bolt(t, s, target, aim) {
    const det = this.detects(t, s);
    const dx = Math.sin(aim);
    const dz = Math.cos(aim);
    const hits = [];
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      const ex = e.x - t.x;
      const ez = e.z - t.z;
      const along = ex * dx + ez * dz;
      if (along < 0 || along > s.range) continue;
      if (Math.abs(ex * dz - ez * dx) > PELLET_WIDTH * 1.4 && e !== target) continue;
      hits.push({ e, along });
    }
    hits.sort((a, b) => a.along - b.along);
    const list = hits.slice(0, s.pierce).map((h) => h.e);
    if (!list.includes(target)) {
      if (list.length >= s.pierce) list.pop();
      list.push(target);
    }
    let mult = 1;
    if (s.stack) {
      t.stackN = t.stackE === target.id ? (t.stackN || 0) + 1 : 0;
      t.stackE = target.id;
      mult = 1 + Math.min(s.stack.max, t.stackN * s.stack.per);
    }
    this.events.push({ k: 'bolt', t: t.id, es: list.map((e) => e.id), x: r2(t.x + dx * s.range), z: r2(t.z + dz * s.range), ...(mult > 1 ? { m: r2(mult) } : {}) });
    for (const e of list) {
      t.meter = (t.meter || 0) + 1;
      this.damage(t, e, e === target ? Math.round(s.damage * mult * 100) / 100 : s.damage);
    }
  }

  /**
   * Accelerator: charges up while a zombie is in range, then fires locked-on shots (switching
   * to a new zombie if its target dies or leaves) until it has dealt `overcharge` damage, then
   * cools down. t.charge: 0..1 charging, 1..0 overcharge left while firing, below 0 cooling.
   */
  updateAccel(t, s, dt) {
    t.phase ??= 0;
    if (t.phase === 2) {
      t.wait -= dt;
      t.charge = -Math.max(0, t.wait) / s.cool;
      t.cooldown = Math.max(0, t.cooldown);
      if (t.wait > 0) return;
      t.phase = 0;
      t.beamT = 0;
    }
    const det = this.detects(t, s);
    let e = t.lock ? this.enemies.get(t.lock) : null;
    if (e && ((e.x - t.x) ** 2 + (e.z - t.z) ** 2 > s.range * s.range || !canHit(det, e))) e = null;
    if (!e) e = this.findTarget(t, s, t.x, t.z, s.range);
    if (t.phase === 0) {
      t.lock = 0;
      t.cooldown = Math.max(0, t.cooldown);
      if (!e) return;
      t.yaw = lerpAngle(t.yaw, Math.atan2(e.x - t.x, e.z - t.z), Math.min(1, dt * 10));
      t.beamT += dt;
      t.charge = Math.min(1, t.beamT / s.charge);
      if (t.charge < 1) return;
      t.phase = 1;
      t.dealt = 0;
    }
    if (!e) {
      t.lock = 0;
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.lock = e.id;
    t.yaw = Math.atan2(e.x - t.x, e.z - t.z);
    while (t.cooldown <= 0 && this.enemies.has(e.id)) {
      t.cooldown += s.cooldown;
      this.shoot(t, e, s.damage);
      t.dealt += s.damage;
      if (t.dealt >= s.overcharge) {
        t.phase = 2;
        t.wait = s.cool;
        t.lock = 0;
        t.charge = -1;
        t.cooldown = Math.max(0, t.cooldown);
        this.events.push({ k: 'overcharge', t: t.id });
        return;
      }
    }
    t.charge = 1 - t.dealt / s.overcharge;
  }

  // ---------------------------------------------------------------- hacker

  /** Hacker: every `cooldown` s, a synapse hits each of the best `synapses` zombies in range. */
  updateHacker(t, s) {
    const list = this.findTargets(t, s, s.synapses);
    if (!list.length) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.yaw = Math.atan2(list[0].x - t.x, list[0].z - t.z);
    if (t.cooldown > 0) return;
    t.cooldown += s.cooldown;
    for (const e of list) {
      this.hack(t, s, e);
      this.events.push({ k: 'shot', t: t.id, e: e.id });
      if (s.damage) this.damage(t, e, s.damage);
    }
  }

  /** Hacks a zombie for good: slowness (not bosses), Wire Fraud, and conversion when it dies (not bosses). */
  hack(t, s, e) {
    e.fraud = Math.max(e.fraud, s.fraud);
    if (e.boss) return;
    e.hackSlow = Math.max(e.hackSlow, s.slow);
    if (s.ev >= e.hackEv) {
      e.hackEv = s.ev;
      e.hackBy = t.id;
    }
  }

  /** Hacked zombies that died this tick come back as holograms that ram other zombies. */
  spawnHolograms() {
    const list = this.holos;
    this.holos = [];
    for (const e of list) {
      const t = this.towers.get(e.hackBy);
      if (!t) continue; // its Hacker was sold
      const s = TOWERS[t.type].levels[t.level];
      if (this.unitsOf(t.id).length >= (s.units ?? Infinity)) continue;
      const hp = Math.max(1, Math.round(e.maxHp ** e.hackEv * 10) / 10);
      const def = { name: 'Hologram', model: `holo:${e.type}`, hp, speed: ENEMIES[e.type].speed, ram: true, holo: true };
      const u = this.spawnUnit(t, def);
      u.dist = Math.max(0, Math.min(path.length - 1, e.dist));
      u.route = e.route;
      u.lateral = e.lateral;
      this.placeUnit(u);
      this.events.push({ k: 'convert', u: u.id, x: r2(u.x), z: r2(u.z) });
    }
  }

  /** Hologram Tower: clones tower `src` at (x, z). Returns an error message, or null. */
  cloneTower(p, ab, m) {
    const src = this.towers.get(Number(m.src));
    if (!src) return 'Pick a tower to clone';
    const def = TOWERS[src.type];
    const root = rootType(src.type);
    if (root === 'hacker') return "Hackers can't clone Hackers";
    if (def.kind === 'income') return "Income towers can't be cloned";
    if (src.holo) return "Holograms can't be cloned";
    let clones = 0;
    for (const t of this.towers.values()) if (t.holo && t.owner === p.id && rootType(t.type) === root) clones++;
    if (clones >= TOWERS[root].limit) return `You already have ${clones} ${def.name} hologram${clones === 1 ? '' : 's'} (its limit)`;
    const cost = cloneCost(ab, src);
    if (p.cash < cost) return `Need $${cost} to clone the ${def.name}`;
    const x = Number(m.x);
    const z = Number(m.z);
    if (!canPlace(x, z, this.towers.values(), def.placement)) return placeFail(def, 'A');
    p.cash -= cost;
    const t = this.newTower(p.id, src.type, x, z, m.yaw, 0);
    t.level = src.level;
    t.hp = t.maxHp = towerMaxHp(t.type, t.level);
    t.targetMode = src.targetMode;
    t.track = src.track;
    t.off = [...(src.off ?? [])];
    t.ammo = def.levels[t.level].ammo ?? 0;
    t.holo = t.holoMax = ab.life;
    this.events.push({ k: 'place', id: t.id, owner: p.id, x, z, holo: 1 });
    return null;
  }

  /** After an upgrade: the new max health, keeping the damage the tower has taken. */
  setTowerLevelHp(t) {
    const max = towerMaxHp(t.type, t.level);
    if (t.hp > 0) t.hp = Math.max(1, t.hp + max - t.maxHp);
    t.maxHp = max;
  }

  /** Takes a tower off the map with everything it made (sold, or a hologram fading). */
  removeTower(t, k, extra = {}) {
    this.towers.delete(t.id);
    this.removeUnitsOf(t.id);
    this.removeTrapsOf(t.id);
    this.events.push({ k, id: t.id, owner: t.owner, x: t.x, z: t.z, ...extra });
    if (this.contract?.open) this.relayCourt(); // Last Laugh: its tiles are free to walk now
  }

  // ---------------------------------------------------------------- slows

  /** Slime Trooper: slows a zombie by `slow` for `time` seconds. Bosses ignore it; slimes don't stack. */
  applySlime(e, sl) {
    if ((e.boss && !sl.boss) || e.statusImmune) return;
    const slow = e.boss ? sl.slow * sl.boss : sl.slow; // Splash: bosses are slowed `boss` as much
    e.slime = Math.max(e.slimeT > 0 ? e.slime : 0, slow);
    e.slimeT = Math.max(e.slimeT, sl.time);
  }

  /**
   * Freezer: every hit adds `s.chill` chill (0..1). Chill slows up to `maxSlow` (half for bosses)
   * and hurts `chillDps` per second while it lasts. At full chill, `chillFreeze` freezes the zombie.
   */
  applyChill(t, s, e) {
    const ir = s.ignoreIceResist ? 0 : e.iceResist; // Ice Grenade, Snow Storm, Cryo Helicopter Lv 5...
    if (e.statusImmune || e.freezeImmune || ir >= 1) return;
    e.chillMax = Math.max(e.chillT > 0 ? e.chillMax : 0, s.maxSlow * (e.boss ? 0.5 : 1));
    const wasFull = e.chillT > 0 && e.chill >= 1;
    e.chill = Math.min(1, e.chill + s.chill * (1 - ir));
    e.chillT = s.chillTime;
    if (s.chillDps >= e.chillDps) {
      e.chillDps = s.chillDps;
      e.chillBy = t.id;
    }
    // freezeNext (Frost Blaster, Sledger): only a hit on an already fully chilled zombie freezes it.
    const full = TOWERS[t.type].freezeNext ? wasFull : e.chill >= 1;
    if (full && s.chillFreeze && (!e.boss || s.freezeBoss)) {
      this.iceFreeze(e, s.chillFreeze, s);
      e.chill = 0;
      e.chillT = 0;
    }
  }

  /**
   * Cryo Ranger freeze for `secs`. fx: { freezeBoss? (bosses freeze this fraction of the time,
   * else never), frostbite? (slower for good), frozenVuln? (extra damage while frozen) }.
   */
  iceFreeze(e, secs, fx) {
    this.stop({ bossStop: fx.freezeBoss ?? 0, ignoreIceResist: fx.ignoreIceResist }, e, secs, 'ice');
    if (e.stopKind !== 'ice' || !this.enemies.has(e.id)) return;
    if (fx.frostbite) e.coldSlow = Math.max(e.coldSlow, fx.frostbite);
    if (fx.frozenVuln) e.iceVuln = Math.max(e.iceVuln, fx.frozenVuln);
  }

  /** Cryo M203 / M203 Incendiary: every `m203.every` s while shooting, lobs a grenade at the target. */
  fireM203(t, s, target, dt) {
    const m = s.m203;
    t.m203T = (t.m203T ?? m.every * 0.5) - dt;
    if (t.m203T > 0) return;
    t.m203T = m.every;
    const time = 0.7;
    const p = this.leadPoint(target, time);
    // Cryo M203 freezes; the Ranger's M203 Incendiary leaves a burning patch (see updateShells).
    const fx = m.patch ? { patch: { radius: m.radius, ...m.patch } } : m.burn ? {} : { freeze: m.freeze, ice: iceFx(s) };
    if (m.burn) Object.assign(fx, { burn: m.burn, burnTime: m.burnTime }); // Sharpshooter Molotov: sets the zombies in it on fire
    this.shells.push({ tower: t.id, x: p.x, z: p.z, time, damage: m.damage, radius: m.radius, ...fx, det: this.detects(t, s) });
    this.events.push({ k: 'lob', t: t.id, x: r2(p.x), z: r2(p.z), d: time });
  }

  /** John Slayer: a passive railgun that shoots its target every `rail.every` s, piercing `rail.pass` more. */
  fireRail(t, s, target, dt) {
    const r = s.rail;
    t.railT = (t.railT ?? r.every * 0.5) - dt;
    if (t.railT > 0) return;
    t.railT = r.every;
    this.shoot(t, target, r.damage);
    this.passThrough(t, { ...s, pass: r.pass }, target, r.damage);
  }

  /** John Slayer: every `chop.every` s its axe hits up to `chop.targets` zombies nearby, hidden ones too. */
  chopAxe(t, s, dt) {
    const c = s.chop;
    t.chopT = Math.max(0, (t.chopT ?? 0) - dt);
    if (t.chopT > 0) return;
    const r2max = c.range * c.range;
    const det = { ...this.detects(t, s), hidden: true };
    const list = [];
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      const d2 = (e.x - t.x) ** 2 + (e.z - t.z) ** 2;
      if (d2 <= r2max) list.push({ e, d2 });
    }
    if (!list.length) return;
    t.chopT = c.every;
    list.sort((a, b) => a.d2 - b.d2);
    this.events.push({ k: 'whirl', t: t.id, r: c.range });
    for (const { e } of list.slice(0, c.targets)) this.damage(t, e, c.damage);
  }

  // ---------------------------------------------------------------- piercing blades

  /**
   * Boomerang: throws `rangs` boomerangs on an oval loop out to where the target will be and
   * back. Each one hits up to `pierce` zombies once. The second one loops on the other side.
   */
  throwRangs(t, s, target) {
    const det = this.detects(t, s);
    let p = { x: target.x, z: target.z };
    for (let i = 0; i < 2; i++) {
      const d = Math.hypot(p.x - t.x, p.z - t.z);
      p = this.leadPoint(target, rangTime(d, s.speed) / 2);
    }
    const d = Math.max(2, Math.hypot(p.x - t.x, p.z - t.z));
    const time = rangTime(d, s.speed);
    const n = s.rangs || 1;
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? -1 : 1;
      this.blades.push({ tower: t.id, loop: true, ox: t.x, oz: t.z, tx: p.x, tz: p.z, side, t: 0, time, left: s.pierce, hits: new Set(), damage: s.damage, det });
      this.events.push({ k: 'rang', t: t.id, x: r2(p.x), z: r2(p.z), d: r2(time), s: side });
    }
    t.out = n;
  }

  /** Assassin Fan of Knives: three knives fly out past its range, each piercing a few zombies. */
  throwKnives(t, s) {
    const f = s.fan;
    t.fanAcc -= f.every;
    const det = this.detects(t, s);
    for (const off of [-0.3, 0, 0.3]) {
      const a = t.yaw + off;
      const tx = t.x + Math.sin(a) * f.reach;
      const tz = t.z + Math.cos(a) * f.reach;
      const time = f.reach / f.speed;
      this.blades.push({ tower: t.id, loop: false, ox: t.x, oz: t.z, tx, tz, t: 0, time, left: f.pierce, hits: new Set(), damage: f.damage, det });
      this.events.push({ k: 'knife', t: t.id, x: r2(tx), z: r2(tz), d: r2(time) });
    }
  }

  updateBlades(dt) {
    const pos = this.tmp;
    for (let i = this.blades.length - 1; i >= 0; i--) {
      const b = this.blades[i];
      b.t += dt;
      bladePos(b, Math.min(1, b.t / b.time), pos);
      const tower = this.towers.get(b.tower) ?? null;
      if (b.left > 0) {
        for (const e of this.enemies.values()) {
          if (b.hits.has(e.id) || !canHit(b.det, e)) continue;
          if ((e.x - pos.x) ** 2 + (e.z - pos.z) ** 2 > RANG_HIT * RANG_HIT) continue;
          b.hits.add(e.id);
          this.events.push({ k: 'slice', e: e.id });
          this.damage(tower, e, b.damage);
          if (tower) this.soulGain(tower, b.damage); // Spiritual Advocate souls
          if (b.burn) this.ignite(e, b.tower, b.burn, b.burnTime, 0); // Archer Flaming Arrows
          if (b.fxS && tower && this.enemies.has(e.id)) this.hitEffects(tower, TOWERS[tower.type], b.fxS, e, b.fxStun); // Crossbower
          if (b.stun && this.enemies.has(e.id)) this.baseball(tower, b, e);
          if (b.injure) {
            // Flayer: thrown knives leave zombies Injured.
            e.injured = Math.max(e.injured, b.injure.amount);
            e.injuredT = Math.max(e.injuredT, b.injure.time);
          }
          if (--b.left <= 0) break;
        }
      }
      if (b.t < b.time) continue;
      this.blades.splice(i, 1);
      if (b.loop && tower) tower.out = Math.max(0, tower.out - 1);
    }
  }

  /** Assassin Whirlwind Slash: hits every zombie in range. */
  whirl(t, s) {
    const det = this.detects(t, s);
    this.events.push({ k: 'whirl', t: t.id, r: s.range });
    const r2max = s.range * s.range;
    for (const e of [...this.enemies.values()]) {
      if (!canHit(det, e)) continue;
      if ((e.x - t.x) ** 2 + (e.z - t.z) ** 2 <= r2max) this.damage(t, e, s.whirl.damage);
    }
  }

  /** Knocks zombie `e` back along the path by `force` knockback (bosses a fraction as far). */
  knockBack(e, force) {
    if (e.statusImmune) return;
    e.dist = Math.max(0, e.dist - force * KNOCK_STUDS * (e.boss ? BOSS_KNOCK : 1));
  }

  /**
   * Brawler Reposition: the tower leaps to (x, z) (already checked by the action), then every
   * zombie it can see within `ab.radius` of the landing spot takes `ab.damage` and is knocked back.
   */
  reposition(t, s, ab, x, z) {
    const fromX = t.x;
    const fromZ = t.z;
    t.x = x;
    t.z = z;
    if (!TOWERS[t.type].heli) {
      t.hx = x; // passive weapons (Psycho Slayer) fire from where it is now
      t.hz = z;
    }
    this.events.push({ k: 'leap', t: t.id, fx: r2(fromX), fz: r2(fromZ), x: r2(x), z: r2(z), r: ab.radius, ...(ab.key === 'teleport' ? { tp: 1 } : {}) });
    if (!ab.radius) return; // Psycho Slayer Teleport: just moves
    const det = this.detects(t, s);
    const r2max = ab.radius * ab.radius;
    for (const e of [...this.enemies.values()]) {
      if (!canHit(det, e) || (e.x - x) ** 2 + (e.z - z) ** 2 > r2max) continue;
      if (ab.damage) this.damage(t, e, ab.damage);
      if (!this.enemies.has(e.id)) continue;
      if (ab.knock) this.knockBack(e, ab.knock);
      if (ab.stun) this.stop(TOWERS[t.type], e, ab.stun, 'stun'); // Psycho Slayer Jump
    }
  }

  /**
   * Penetrator: on the ground the shot pierces `pen.pierce` zombies in a line; on a cliff it hits its
   * target and ricochets to `pen.ricochet` more. Each zombie after the first takes `pen.falloff` less
   * than the one before. Every `flameShot.every`th shot is a flaming arrow that burns all it hits.
   */
  penetrate(t, s, target) {
    const p = s.pen;
    const det = this.detects(t, s);
    const hits = [target];
    if (p.ricochet) {
      const seen = new Set([target.id]);
      const j2 = p.jump * p.jump;
      let cur = target;
      while (hits.length <= p.ricochet) {
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
    } else hits.push(...this.lineBehind(t, s, target, det).slice(0, p.pierce - 1));
    const flame = s.flameShot && (t.flameN = (t.flameN || 0) + 1) % s.flameShot.every === 0 ? s.flameShot : null;
    this.events.push({ k: 'bounce', t: t.id, es: hits.map((e) => e.id), ...(flame ? { m: 'flame' } : {}) });
    let dmg = s.damage;
    for (const e of hits) {
      if (!this.enemies.has(e.id)) continue;
      this.damage(t, e, Math.round(dmg * 100) / 100);
      if (flame && this.enemies.has(e.id)) this.ignite(e, t.id, flame.dps, flame.time, 0);
      dmg *= 1 - p.falloff;
    }
  }

  /** The zombies `det` can hit behind `main` on the line from the tower, out to its range (closest first). */
  lineBehind(t, s, main, det) {
    const dx = main.x - t.x;
    const dz = main.z - t.z;
    const d0 = Math.hypot(dx, dz) || 1;
    const ux = dx / d0;
    const uz = dz / d0;
    const list = [];
    for (const e of this.enemies.values()) {
      if (e === main || !canHit(det, e)) continue;
      const ex = e.x - t.x;
      const ez = e.z - t.z;
      const along = ex * ux + ez * uz;
      if (along <= d0 || along > s.range) continue;
      if (Math.abs(ex * uz - ez * ux) > 1.2 * (ENEMIES[e.type].scale ?? 1)) continue;
      list.push({ e, along });
    }
    return list.sort((a, b) => a.along - b.along).map((o) => o.e);
  }

  /** Tactical Sniper: the shot goes on through up to `pass` more zombies behind `main` (closest first). */
  passThrough(t, s, main, dmg) {
    const fx = TOWERS[t.type].pierceFx; // Frost Blaster: pierced zombies get chilled too
    for (const e of this.lineBehind(t, s, main, this.detects(t, s)).slice(0, s.pass)) {
      this.shoot(t, e, dmg);
      if (fx && this.enemies.has(e.id)) this.hitEffects(t, TOWERS[t.type], s, e, 0);
    }
  }

  /** Health Pack (Combat Shotgunner): towers, sentries and units within `ab.radius` get `ab.heal` of their max health back. */
  healPack(t, ab) {
    const r2max = ab.radius * ab.radius;
    const near = (o) => (o.x - t.x) ** 2 + (o.z - t.z) ** 2 <= r2max;
    for (const o of this.towers.values()) if (near(o) && !TOWERS[o.type].noHeal) this.healTower(o, o.maxHp * ab.heal);
    for (const sn of this.traps.values()) if (sn.maxHp && near(sn)) sn.hp = Math.min(sn.maxHp, sn.hp + sn.maxHp * ab.heal);
    for (const u of this.units.values()) {
      if (!near(u)) continue;
      u.hp = Math.min(u.maxHp, u.hp + u.maxHp * ab.heal);
      if (u.def.soldiers) u.alive = Math.max(0, Math.ceil(u.hp / u.def.hp - 1e-6));
    }
  }

  /** Unstun Power (Combat Shotgunner): every tower and sentry within `ab.radius` stops being stunned. */
  unstun(t, ab) {
    const r2max = ab.radius * ab.radius;
    for (const o of this.towers.values()) if ((o.x - t.x) ** 2 + (o.z - t.z) ** 2 <= r2max) o.stunT = 0;
    for (const sn of this.traps.values()) if (sn.stunT && (sn.x - t.x) ** 2 + (sn.z - t.z) ** 2 <= r2max) sn.stunT = 0;
  }

  /** Flare Gun: hidden zombies in the tower's range are revealed to every tower for a while. */
  flare(t, s, ab) {
    const r2max = ab.global ? Infinity : s.range * s.range; // Railgun Warship: the whole map
    for (const e of this.enemies.values()) {
      if (e.hidden && (e.x - t.x) ** 2 + (e.z - t.z) ** 2 <= r2max) e.revealT = Math.max(e.revealT || 0, ab.duration);
    }
  }

  /** Laser Gunner's Stealth Sensor: hidden zombies nearby are revealed for good, then a shockwave hits everything nearby. */
  stealthSensor(t, s, ab) {
    const r2max = ab.radius * ab.radius;
    for (const e of this.enemies.values()) {
      if (e.hidden && (e.x - t.x) ** 2 + (e.z - t.z) ** 2 <= r2max) e.revealT = Infinity;
    }
    this.explode(t, t.x, t.z, { damage: ab.damage, radius: ab.radius, det: this.detects(t, s) });
  }

  /** Shotgunner: up to `extra` more zombies in its cone (closest to the main target first) take `splash`. */
  spread(t, s, main) {
    const det = this.detects(t, s);
    const r2max = s.range * s.range;
    const list = [];
    for (const e of this.enemies.values()) {
      if (e === main || !canHit(det, e)) continue;
      const dx = e.x - t.x;
      const dz = e.z - t.z;
      if (dx * dx + dz * dz > r2max) continue;
      if (Math.abs(angleDiff(t.yaw, Math.atan2(dx, dz))) > s.cone) continue;
      list.push({ e, d: (e.x - main.x) ** 2 + (e.z - main.z) ** 2 });
    }
    list.sort((a, b) => a.d - b.d);
    for (let i = 0; i < Math.min(s.extra, list.length); i++) this.shoot(t, list[i].e, s.splash);
  }

  // ---------------------------------------------------------------- versus

  /** Anarchist (Versus only): sends Androids to its owner's target, and No Mercy chips their base. */
  updateAnarchy(t, s, dt) {
    if (this.wave.state !== 'wave') return;
    t.androidT -= dt;
    if (t.androidT <= 0) {
      t.androidT += s.android.every;
      this.vs.attack(this.lane, 'android', { type: s.android.type, tower: t.id });
    }
    if (s.chip) {
      if (t.chipT == null) t.chipT = s.chip.every;
      t.chipT -= dt;
      if (t.chipT <= 0) {
        t.chipT += s.chip.every;
        this.vs.attack(this.lane, 'chip', s.chip);
      }
    }
  }

  /** Smoke (`kind` 'smoke') or stun ('stun') every tower within `r` of (x, z) for `secs`. */
  hexTowers(x, z, r, kind, secs, enemy = false, filter = null) {
    const key = kind === 'smoke' ? 'smoke' : 'stunT';
    let n = 0;
    for (const t of this.towers.values()) {
      if ((t.x - x) ** 2 + (t.z - z) ** 2 > r * r) continue;
      if (filter && !filter(t)) continue; // Fallen King sword swings only reach towers in their arc
      if (enemy && this.stealthy(t)) continue; // an enemy's attack can't touch stealthy towers
      if (kind === 'stun' && stunImmune(t)) continue;
      if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) continue; // Medigun Medic Uber / Combat Drone Shield
      if (kind === 'stun') {
        // Warden riot shield: blocks the stun, then double damage and stun immune for a while.
        // Gladiator parry: blocks the stun, but it stops attacking for a moment.
        if (TOWERS[t.type].parry) {
          t.parryT = Math.max(t.parryT || 0, TOWERS[t.type].parry);
          this.events.push({ k: 'block', id: t.id, x: t.x, z: t.z, p: 1 });
          continue;
        }
        const riot = TOWERS[t.type].levels[t.level].riot;
        if (riot) {
          if (t.riotT <= 0) {
            t.riotT = riot.duration;
            this.events.push({ k: 'block', id: t.id, x: t.x, z: t.z });
          }
          continue;
        }
        // A Medic shield blocks the stun (and then recharges); Ubercharge blocks every stun.
        const b = buffOf(this.buffs, t.id);
        if (b.uber) continue;
        if (b.shield && t.shieldT <= 0) {
          t.shieldT = b.recharge;
          continue;
        }
      }
      t[key] = Math.max(t[key], secs * (1 - this.fortifyOf(t))); // Titan Fortify Zone
      n++;
    }
    // Engineer sentries get stunned too, unless they have a shield.
    if (kind === 'stun') {
      for (const sn of this.traps.values()) {
        if (sn.kind !== 'sentry' || (sn.x - x) ** 2 + (sn.z - z) ** 2 > r * r) continue;
        const t = this.towers.get(sn.tower);
        if (t && (sn.def ?? TOWERS[t.type].levels[t.level].sentry)?.shield) continue;
        sn.stunT = Math.max(sn.stunT, secs);
      }
    }
    return n;
  }

  /** Every unit on this map takes `dmg` (Pyrotechnics). */
  hurtUnits(dmg) {
    for (const u of [...this.units.values()]) {
      if (u.ghostT > 0) continue; // Gold Commander cyber tank ghost
      u.hp -= dmg;
      if (u.def.soldiers) u.alive = Math.max(0, Math.ceil(u.hp / u.def.hp - 1e-6));
      if (u.hp <= 0 && !u.def.ghost) this.destroyUnit(u, this.towers.get(u.tower) ?? null); // a cyber tank turns into a ghost on its next update
    }
  }

  /** Units within `r` of (x, z) take `dmg` (Hard mode slams, Necrotic Skeletons, the Fallen King). */
  hurtUnitsNear(x, z, r, dmg, filter = null) {
    for (const u of [...this.units.values()]) {
      if (u.ghostT > 0 || (u.x - x) ** 2 + (u.z - z) ** 2 > r * r || (filter && !filter(u))) continue;
      u.hp -= dmg;
      if (u.def.soldiers) u.alive = Math.max(0, Math.ceil(u.hp / u.def.hp - 1e-6));
      if (u.hp <= 0 && !u.def.ghost) this.destroyUnit(u, this.towers.get(u.tower) ?? null);
    }
  }

  /** No Mercy: takes up to `d` base health, but never below `floor`. Returns what it took. */
  chipBase(d, floor) {
    const n = Math.min(d, Math.max(0, this.baseHp - floor));
    if (n <= 0) return 0;
    this.baseHp -= n;
    return n;
  }

  /** The spot (a tower's position) whose `r` circle covers the most towers; the path's end if there are none. */
  bestCluster(r) {
    let best = null;
    let most = 0;
    for (const t of this.towers.values()) {
      let n = 0;
      for (const o of this.towers.values()) if ((t.x - o.x) ** 2 + (t.z - o.z) ** 2 <= r * r) n++;
      if (n > most) {
        most = n;
        best = { x: t.x, z: t.z };
      }
    }
    return best ?? path.at(path.length - 12, {});
  }
}
