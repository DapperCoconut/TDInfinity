// Abilities: useAbility runs the button a player presses on a tower; the rest are the abilities
// themselves (nukes, drops, grenades, puddles, fireworks...).
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { GAME, TOWERS, arrowModes, canHit, choicesOf, familyOf, nextTrack, timedAbility } from '../../config.js';
import { path } from '../path.js';
import { BUBBLE_PUSH_CD, SEE_ALL, STRIKE_TIME, TAU, beamHealable, buffOf, droneMode, droneModes, iceFx, minRangeOf, r2 } from './shared.js';

export class SimAbilities {

  // ---------------------------------------------------------------- abilities

  useAbility(t, s, ab, m) {
    const fury = TOWERS[t.type].fury;
    if (fury) t.fury = Math.max(t.fury, fury); // Classic Commander fights for a while after any ability
    if (timedAbility(ab)) {
      t.active = ab.duration;
      if (ab.key === 'uberBeam' || ab.key === 'kritz') {
        // Medigun Medic: lock the beam onto the tower getting it.
        const p = this.chargeTarget(t, s, ab);
        t.lock = p ? p.id : 0;
        if (ab.key === 'uberBeam') {
          for (const o of p ? [t, p] : [t]) {
            o.stunT = 0;
            o.smoke = 0;
            this.healTower(o, o.maxHp);
          }
        }
      }
      if (ab.heal) this.healTower(t, ab.heal); // Juggernaut Overcharge
      if (ab.unstunSelf) t.stunT = 0; // Golden Juggernaut Reboot Systems
      if (ab.immune) {
        t.immuneT = Math.max(t.immuneT || 0, ab.duration); // Yasuke Dragon Flame: can't be stunned
        t.stunT = 0;
      }
    } else if (ab.key === 'grandslam') this.grandSlam(t, s, ab);
    else if (ab.key === 'magicBoost') t.magic = (t.magic || 0) + ab.add; // Wizard
    else if (ab.key === 'soulSurge') {} // Lure: the use count is the effect (see updateTower)
    else if (ab.key === 'spore') {
      // Quinn Spore Field: every zombie in range slows down (bosses too).
      for (const e of this.enemies.values()) if ((e.x - t.x) ** 2 + (e.z - t.z) ** 2 <= s.range * s.range) this.applySlime(e, { slow: ab.slow, time: ab.time, boss: 1 });
      this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r: s.range });
    } else if (ab.key === 'crucifix') {
      const e = this.crucifixTarget(t, s);
      if (e) {
        this.stop({ bossStop: ab.boss }, e, ab.time, 'ice');
        this.events.push({ k: 'shot', t: t.id, e: e.id, c: 1 });
      }
    } else if (ab.key === 'voltPoint') {
      const u = this.spawnUnit(t, { ...ab.unit, radius: ab.radius }, 0, path.project(Number(m.x), Number(m.z)), path.lastRoute);
      u.x = Number(m.x);
      u.z = Number(m.z);
      this.events.push({ k: 'sprout', x: r2(u.x), z: r2(u.z), volt: 1 });
    } else if (ab.key === 'extraSlot' || ab.key === 'darkSummon') {
      const p = this.players.get(t.owner);
      if (p && ab.key === 'extraSlot') p.extraSlots = (p.extraSlots || 0) + 1; // Discount Dog
      if (p && ab.key === 'darkSummon') p.darkSummon = true; // Buzzer
    } else if (ab.key === 'repaint') {
      // Stella: every drawing back to full health.
      for (const u of this.units.values()) if (u.tower === t.id) u.hp = u.maxHp;
      this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r: s.range });
    }
    else if (ab.key === 'reposition' || ab.key === 'teleport' || ab.key === 'jump') {
      this.reposition(t, s, ab, Number(m.x), Number(m.z));
      if (ab.immune) t.immuneT = Math.max(t.immuneT || 0, ab.immune); // Eldritch Rift: stun immunity
    }
    else if (ab.key === 'carpetBomb') this.carpetBomb(t, s, ab, Number(m.x), Number(m.z));
    else if (ab.key === 'redeploy') t.face = t.yaw = Math.atan2(Number(m.x) - t.x, Number(m.z) - t.z); // Machine Gunner: turn its cone
    else if (ab.key === 'reverse') t.dir = -(t.dir || 1);
    else if (ab.key === 'patrol') {
      // Pursuit: move the patrol zone (the helicopter flies over on its own).
      // Splash Total Relocation: every Splash its owner has flies there.
      let x = Number(m.x);
      let z = Number(m.z);
      if (s.flyArea) {
        // Helicopter: only inside its fly area (range boosts make it bigger), then a wait before it attacks.
        const area = s.flyArea * buffOf(this.buffs, t.id).range;
        const d = Math.hypot(x - t.x, z - t.z);
        if (d > area) {
          x = t.x + ((x - t.x) / d) * area;
          z = t.z + ((z - t.z) / d) * area;
        }
        t.parked = false;
        t.heliWait = TOWERS[t.type].moveDelay ?? 0;
      }
      for (const o of ab.all ? [...this.towers.values()].filter((o) => o.type === t.type && o.owner === t.owner) : [t]) {
        o.cx = x;
        o.cz = z;
      }
    } else if (ab.key === 'crows') this.crowFlock(t, s, ab);
    else if (ab.key === 'strike') this.strike(t, s, ab);
    else if (ab.key === 'meteor') this.iceMeteor(t, s, ab);
    else if (ab.key === 'timeWarp') t.choice = t.choice?.[0] === 'slow' ? [] : ['slow']; // Time Dilator
    else if (ab.key === 'soulBeam') t.choice = t.choice?.[0] === 'beam' ? [] : ['beam']; // Spiritual Advocate
    else if (ab.key === 'selfHeal' || ab.key === 'soulHeal') {
      this.setSouls(t, s, (t.soulN || 0) - ab.souls);
      const r2max = (ab.radius ?? 0) ** 2;
      for (const o of ab.key === 'selfHeal' ? [t] : [...this.towers.values()].filter((o) => (o.x - t.x) ** 2 + (o.z - t.z) ** 2 <= r2max)) {
        if (!beamHealable(o) && o !== t) continue;
        o.hotT = ab.time;
        o.hotRate = (o.maxHp * ab.pct) / ab.time;
      }
      if (ab.pause) t.restT = ab.pause;
      this.events.push({ k: 'chaos', x: r2(t.x), z: r2(t.z), text: '✚ Healing', color: '#b2ff59' });
    } else if (ab.key === 'fps') {
      t.manual = !t.manual;
      t.fire = false;
      t.flyX = t.flyZ = undefined;
      t.aimYaw = t.yaw;
      t.aimAge = 0;
    }
    else if (ab.key === 'track') t.track = nextTrack(t.track, s);
    else if (ab.key === 'absZero') this.absoluteZero(t, ab);
    else if (ab.key === 'unitCommand' || ab.key === 'immolation') {
      // Bugler Unit Commander / Elite Immolation: the zombie closest to the clicked spot.
      const e = this.closestEnemy(Number(m.x), Number(m.z), ab.key === 'immolation' ? this.detects(t, s) : SEE_ALL);
      if (e && ab.key === 'unitCommand') {
        for (const o of this.towers.values()) if ((o.x - t.x) ** 2 + (o.z - t.z) ** 2 <= s.aura * s.aura) o.forceE = e.id;
        this.events.push({ k: 'shot', t: t.id, e: e.id, c: 1 });
      } else if (e) {
        this.events.push({ k: 'shot', t: t.id, e: e.id, c: 2 });
        this.hitMods = { shieldMult: ab.shieldMult };
        this.damage(t, e, ab.damage);
        this.hitMods = null;
      }
    } else if (ab.key === 'directedPower') {
      // Bugler Directed Power: the owner's tower closest to the spot fires `boost` faster; low levels for longer.
      let best = null;
      let bestD = Infinity;
      for (const o of this.towers.values()) {
        if (o.owner !== t.owner || o === t || TOWERS[o.type].kind) continue;
        const d = (o.x - Number(m.x)) ** 2 + (o.z - Number(m.z)) ** 2;
        if (d < bestD) {
          best = o;
          bestD = d;
        }
      }
      if (best) {
        const max = Math.max(1, TOWERS[best.type].levels.length - 1);
        best.dpT = ab.long - (ab.long - ab.short) * Math.min(1, best.level / Math.min(4, max));
        best.dpBoost = ab.boost;
        this.events.push({ k: 'ability', id: best.id, owner: best.owner, name: 'Directed Power', x: best.x, z: best.z });
      }
    } else if (ab.key === 'attrition') {
      this.attrition = { left: ab.duration, pct: ab.pct, cap: ab.cap };
      this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r: 6 });
    } else if (ab.key === 'withdraw') {
      // Market Banking: pays out the bank.
      const owner = this.players.get(t.owner);
      const v = Math.floor(t.bank || 0);
      t.bank = 0;
      if (owner && v > 0) {
        owner.cash += v;
        this.events.push({ k: 'income', id: t.id, owner: t.owner, v, x: t.x, z: t.z });
      }
    } else if (ab.key === 'radarMove') {
      t.rx = Number(m.x); // Surveyor Radar Drone
      t.rz = Number(m.z);
    } else if (ab.key === 'forcefield') {
      // Mechanic Forcefield Generator: towers nearby can't be stunned for a while.
      for (const o of this.towers.values()) {
        if ((o.x - t.x) ** 2 + (o.z - t.z) ** 2 > ab.radius * ab.radius) continue;
        o.immuneT = Math.max(o.immuneT || 0, ab.duration);
        o.stunT = 0;
      }
      this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r: ab.radius });
    }
    else if (ab.key === 'bounty') this.placeBounty(t, s, ab);
    else if (ab.key === 'beat') this.dropBeat(t, s, ab);
    else if (ab.key === 'militia' || ab.vehicle) this.spawnUnit(t, ab.unit);
    else if (ab.key === 'raise') this.raiseDead(t, s);
    else if (ab.key === 'airdrop') this.airDrop(t, s, Number(m.x), Number(m.z));
    else if (ab.key === 'summon') this.relicSummon(t, ab, Number(m.x), Number(m.z));
    else if (ab.key === 'caravan') ab.units.forEach((u, i) => this.spawnUnit(t, u, i * (ab.gap ?? 6)));
    else if (ab.key === 'crossbow') this.crossbowMine(t, s, ab, Number(m.x), Number(m.z));
    else if (ab.key === 'chargedThrow') this.chargedThrow(t, s, ab);
    else if (ab.key === 'spotter') this.spotter(t, s, ab);
    else if (ab.key === 'barrier') {
      // Combat Drone Shield: immune to every attack for a while, and shakes off debuffs.
      t.invulnT = ab.duration;
      t.stunT = 0;
      t.smoke = 0;
    } else if (ab.key === 'medDrone') {
      this.healZones ??= [];
      this.healZones.push({ tower: t.id, x: Number(m.x), z: Number(m.z), radius: ab.radius, n: ab.towers, heal: ab.heal, left: ab.time });
      this.events.push({ k: 'medDrone', id: t.id, x: r2(Number(m.x)), z: r2(Number(m.z)), r: ab.radius, d: ab.time });
    } else if (ab.key === 'voidSlam') {
      const e = this.findTarget(t, s, t.x, t.z, s.range);
      if (e) {
        this.events.push({ k: 'shot', t: t.id, e: e.id, c: 2 });
        this.damage(t, e, ab.damage);
      }
    }
    else if (ab.key === 'sweeper') this.sweep(t, ab);
    else if (ab.key === 'flare') this.flare(t, s, ab);
    else if (ab.key === 'sensor') this.stealthSensor(t, s, ab);
    else if (ab.key === 'healpack') this.healPack(t, ab);
    else if (ab.key === 'unstun') this.unstun(t, ab);
    else if (ab.key === 'stiel' || ab.key === 'napalm') this.throwNade(t, s, ab, Number(m.x), Number(m.z));
    else if (ab.key === 'ghostGrenade') this.ghostGrenade(t, ab);
    else if (ab.key === 'concussive') this.concussive(t, s, ab, Number(m.x), Number(m.z));
    else if (ab.key === 'beeNade') this.beeNade(t, s, ab, Number(m.x), Number(m.z));
    else if (ab.key === 'arrows') t.track = ((t.track || 0) + 1) % arrowModes(s).length; // Archer (Bowmaster)
    else if (ab.key === 'element') t.choice = [choicesOf(TOWERS[t.type], s, t.choice)[0] === 'fire' ? 'frost' : 'fire']; // Elementalist
    else if (ab.key === 'heatwave') {
      this.heatwave(t, s, ab);
      if (ab.selfDamage) this.hurtTower(t, ab.selfDamage); // Rockety Vintage Fuze blows up on top of it
    }
    else if (ab.key === 'ghostHands') this.ghostHands(t, s, ab);
    else if (ab.key === 'seeMe') t.seeT = ab.duration;
    else if (ab.key === 'nuke') this.nuke(t, s, ab);
    else if (ab.key === 'droneMode') {
      // Spectre: switch to the next drone mode it has unlocked.
      const modes = droneModes(s);
      t.choice = [modes[(modes.indexOf(droneMode(t, s)) + 1) % modes.length]];
    } else if (ab.key === 'dive') t.choice = t.choice?.[0] === 'sub' ? [] : ['sub']; // Submerge
    else if (ab.key === 'scope') t.choice = t.choice?.[0] === 'wide' ? [] : ['wide']; // Stormwing Expanded Scope
    else if (ab.key === 'liveShow') {
      t.liveT = ab.duration;
      this.liveShows = true;
      this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r: ab.radius });
    } else if (ab.key === 'wipeout') this.wipeout(t, s, ab);
    else if (ab.key === 'orbital') {
      // Gold Commander Orbital Airstrike: the beam starts where you clicked, then follows your cursor ('laser').
      const x = Number(m.x);
      const z = Number(m.z);
      t.orb = { x, z, tx: x, tz: z, left: ab.time, dps: ab.dps, radius: ab.radius, speed: ab.speed };
    }
    else if (ab.key === 'harpoon') this.harpoonShot(t, s, ab);
    else if (ab.key === 'deploy') {
      // Valkyr / Punkbuster / Squadron / Borealis: units now start from the path closest to this spot.
      t.dropD = path.project(Number(m.x), Number(m.z));
      t.dropR = path.lastRoute;
      const p = path.at(t.dropD, {}, t.dropR);
      this.events.push({ k: 'airdrop', x: r2(p.x), z: r2(p.z), n: 0 });
    }
    else if (ab.key === 'iceTurret' || ab.key === 'iceShard') this.placeIceTurret(t, ab, Number(m.x), Number(m.z));
    else if (ab.key === 'targetSelect') t.spot = { x: Number(m.x), z: Number(m.z) }; // Artillery
    else if (ab.key === 'thorns') this.growThorns(t, s, ab, Number(m.x), Number(m.z));
    else if (ab.key === 'puddle') this.dropPuddle(t, ab);
    else if (ab.key === 'toxicBlast' || ab.key === 'neuralyze') this.throwToxic(t, s, ab, Number(m.x), Number(m.z));
    else if (ab.key === 'airstrike') {
      const x = Number(m.x);
      const z = Number(m.z);
      // One bomb, or `bombs` of them in a line through the spot (the plane flies along +x).
      const n = ab.bombs || 1;
      const gap = ab.radius * 0.9;
      for (let i = 0; i < n; i++) {
        const bx = x + (i - (n - 1) / 2) * gap;
        const time = STRIKE_TIME + i * 0.12;
        this.shells.push({ tower: t.id, x: bx, z, time, damage: ab.damage, radius: ab.radius, det: SEE_ALL });
        this.events.push({ k: 'strike', x: r2(bx), z: r2(z), d: time, ...(i ? { n: i } : {}) });
      }
    } else if (ab.key === 'frostNade') {
      // Freezes the best few zombies in range (bosses can't be frozen).
      // Each one gets its own thrown grenade.
      const list = this.findTargets(t, s, ab.count, (e) => !e.boss);
      list.forEach((e, i) => {
        const time = 0.55 + i * 0.08;
        this.flights.push({ tower: t.id, type: t.type, enemy: e.id, time, ice: ab.duration });
        this.events.push({ k: 'fly', t: t.id, e: e.id, d: r2(time), nade: 'ice' });
      });
    } else if (ab.key === 'frag') {
      // Ranger Grenade: an explosive blast around its best target in range (or at its feet).
      const e = this.findTarget(t, s, t.x, t.z, s.range);
      const x = e ? e.x : t.x;
      const z = e ? e.z : t.z;
      const time = 0.6;
      this.shells.push({ tower: t.id, x, z, time, damage: ab.damage, radius: ab.radius, det: this.detects(t, s), stun: ab.stun, stunAny: ab.stunAny, burn: ab.burn, burnTime: ab.burnTime });
      t.yaw = Math.atan2(x - t.x, z - t.z);
      this.events.push({ k: 'lob', t: t.id, x: r2(x), z: r2(z), d: time });
    } else if (ab.key === 'cryoNade') {
      // Cryo Ranger: a freezing blast around its best target in range (or at its feet).
      // The grenade is thrown at where the zombie will be when it lands.
      const e = this.findTarget(t, s, t.x, t.z, s.range);
      const time = 0.6;
      const p = e ? this.leadPoint(e, time) : { x: t.x, z: t.z };
      this.shells.push({ tower: t.id, x: p.x, z: p.z, time, damage: ab.damage, radius: ab.radius, freeze: ab.duration, ice: iceFx(s), det: this.detects(t, s) });
      t.yaw = Math.atan2(p.x - t.x, p.z - t.z);
      this.events.push({ k: 'lob', t: t.id, x: r2(p.x), z: r2(p.z), d: time, nade: 'ice' });
    } else if (ab.versus) {
      this.vs.attack(this.lane, ab.key, ab); // Smokes / Pyrotechnics land on the target's map
    } else if (ab.key === 'rave') {
      const stopDef = { bossStop: GAME.danceBossScale };
      for (const e of this.enemies.values()) {
        if ((e.x - t.x) ** 2 + (e.z - t.z) ** 2 <= s.aura * s.aura) this.stop(stopDef, e, ab.duration, 'dance');
      }
      this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r: s.aura });
    }
  }

  // ---------------------------------------------------------------- wave 7 towers

  /** Freezer Absolute Zero: every zombie within `radius` of it freezes for `freeze` s (bosses half) and takes `damage`. */
  absoluteZero(t, ab) {
    for (const e of [...this.enemies.values()]) {
      if ((e.x - t.x) ** 2 + (e.z - t.z) ** 2 > ab.radius * ab.radius) continue;
      this.damage(t, e, ab.damage);
      if (this.enemies.has(e.id)) this.iceFreeze(e, ab.freeze, { freezeBoss: 0.5 });
    }
    this.events.push({ k: 'boom', x: r2(t.x), z: r2(t.z), r: ab.radius, ice: 1 });
  }

  /** The zombie closest to (x, z) that `det` can see, or null. */
  /** El Goblino Crucifix: the zombie in range with the most health (that isn't frozen already). */
  crucifixTarget(t, s) {
    const det = this.detects(t, s);
    let best = null;
    for (const e of this.enemies.values()) {
      if (e.remains || !canHit(det, e) || e.statusImmune || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > s.range * s.range) continue;
      if (!best || e.hp > best.hp) best = e;
    }
    return best;
  }

  closestEnemy(x, z, det) {
    let best = null;
    let bestD = Infinity;
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      const d = (e.x - x) ** 2 + (e.z - z) ** 2;
      if (d < bestD) {
        best = e;
        bestD = d;
      }
    }
    return best;
  }

  /** Samurai: when nothing is in reach, throws a shuriken (`damage`) at a zombie within `shuriken.range`. */
  throwShuriken(t, s, dt) {
    const sh = s.shuriken;
    t.shurT = Math.max(0, (t.shurT ?? 0) - dt);
    if (t.shurT > 0) return;
    const e = this.findTarget(t, s, t.x, t.z, sh.range);
    if (!e) return;
    t.shurT = sh.cooldown;
    t.yaw = Math.atan2(e.x - t.x, e.z - t.z);
    this.shoot(t, e, sh.damage);
  }

  /** Void King: every `lasers.every` hits, lasers strike up to `count` zombies within `reach`, hurting and stunning them. */
  voidLasers(t, def, s) {
    const l = s.lasers;
    const list = this.findTargets(t, { ...s, range: l.reach }, l.count);
    for (const e of list) {
      this.events.push({ k: 'shot', t: t.id, e: e.id, c: 2 });
      this.damage(t, e, l.damage);
      if (this.enemies.has(e.id)) this.stop(def, e, l.stun, 'stun');
    }
  }

  /**
   * The Eldritch: every hit builds charge; at `railgun.max` it fires its railgun: `damage` to every
   * zombie on a line out to `range`, losing `falloff` with each zombie it pierces.
   */
  chargeRailgun(t, s, target) {
    const rg = s.railgun;
    t.meter = (t.meter || 0) + 1;
    if (t.meter < rg.max) return;
    t.meter = 0;
    this.penetrate(t, { ...s, damage: rg.damage, range: rg.range, pen: { pierce: 100, falloff: rg.falloff } }, target);
  }

  /** Outlaw Ghost Madness: a ghost hand per charge, each a revolver shot that bounces to `bounces` more zombies. */
  ghostHands(t, s, ab) {
    const det = this.detects(t, s);
    const firsts = this.findTargets(t, s, s.ghosts);
    for (let i = 0; i < s.ghosts && firsts.length; i++) {
      let cur = firsts[i % firsts.length];
      const seen = new Set();
      const hits = [];
      while (cur && hits.length <= ab.bounces) {
        hits.push(cur);
        seen.add(cur.id);
        let best = null;
        let bestD = ab.jump * ab.jump;
        for (const e of this.enemies.values()) {
          if (seen.has(e.id) || !canHit(det, e)) continue;
          const d = (e.x - cur.x) ** 2 + (e.z - cur.z) ** 2;
          if (d <= bestD) {
            best = e;
            bestD = d;
          }
        }
        cur = best;
      }
      this.events.push({ k: 'bounce', t: t.id, es: hits.map((e) => e.id), m: 'ghost' });
      for (const e of hits) if (this.enemies.has(e.id)) this.damage(t, e, s.damage * ab.mult);
    }
  }

  /** Raider Nuke: `damage` to every zombie within `radius` of the tower, no matter how many. */
  nuke(t, s, ab) {
    const r2max = ab.radius * ab.radius;
    for (const e of [...this.enemies.values()]) {
      if ((e.x - t.x) ** 2 + (e.z - t.z) ** 2 <= r2max) this.damage(t, e, ab.damage, false, 'none');
    }
    this.events.push({ k: 'boom', x: r2(t.x), z: r2(t.z), r: ab.radius, nuke: 1 });
  }

  /** Orbital Wipeout / Jericho Missile: `damage` split evenly among every zombie on the map (hidden ones too). */
  wipeout(t, s, ab) {
    const all = [...this.enemies.values()].filter((e) => !e.remains);
    if (!all.length) return;
    const each = ab.damage / all.length;
    for (const e of all) {
      this.events.push({ k: 'strike', x: r2(e.x), z: r2(e.z), d: 0.6 });
      this.damage(t, e, Math.round(each * 100) / 100, false, 'none');
    }
  }

  /** Marauder Harpoon: a huge hit on its strongest zombie in range that stuns it (bosses too) and makes it take more damage. */
  harpoonShot(t, s, ab) {
    const e = this.findTarget({ ...t, targetMode: 2 }, s, t.x, t.z, s.range);
    if (!e) return;
    t.yaw = Math.atan2(e.x - t.x, e.z - t.z);
    this.events.push({ k: 'shot', t: t.id, e: e.id, c: 2 });
    // If the harpoon would kill it, it reels the zombie in instead (pulled back down the path).
    if (e.hp <= ab.damage && !e.boss) {
      e.dist = Math.max(0, e.dist - ab.reel);
    }
    this.damage(t, e, ab.damage);
    if (!this.enemies.has(e.id)) return;
    this.stop({ stunAny: true, bossStop: 1 }, e, ab.stun, 'stun');
    e.vuln = Math.max(e.vuln, ab.vuln);
    e.vulnT = Math.max(e.vulnT || 0, ab.vulnTime);
  }

  /** Buccaneer pirate barrel: every `drop.every` s its units land on the path, `drop.at` of the way along it. */
  updateDrops(t, s, dt) {
    if (this.wave.state !== 'wave') return;
    t.dropT = (t.dropT ?? s.drop.every) - dt;
    if (t.dropT > 0) return;
    t.dropT = s.drop.every;
    const d = path.length * s.drop.at;
    const route = path.nearestRoute(t.x, t.z);
    s.drop.units.forEach((u, i) => this.spawnUnit(t, u, i * 1.5, d, route));
    const p = path.at(d, {}, route);
    this.events.push({ k: 'airdrop', x: r2(p.x), z: r2(p.z), n: s.drop.units.length });
  }

  /**
   * Spectre drone. Offense: drops `offense` bombs on its own timer (and the Spectre does
   * `offenseDmg` times damage). Defense: every `defense.every` s heals towers in `aura` by
   * `defense.heal` and makes them stun immune for `defense.immune` s. Support: boosts the damage
   * of towers in `aura` (see computeBuffs).
   */
  updateSpectreDrone(t, s, dt) {
    const mode = droneMode(t, s);
    const d = s.drone;
    t.droneT = Math.max(0, (t.droneT ?? 0) - dt);
    if (t.droneT > 0) return;
    if (mode === 'offense') {
      if (this.fireMissiles(t, s, d.offense, 0)) t.droneT = d.offense.every;
    } else if (mode === 'defense') {
      t.droneT = d.defense.every;
      const r2max = s.aura * s.aura;
      for (const o of this.towers.values()) {
        if ((o.x - t.x) ** 2 + (o.z - t.z) ** 2 > r2max) continue;
        if (!TOWERS[o.type].noHeal) this.healTower(o, d.defense.heal);
        o.immuneT = Math.max(o.immuneT || 0, d.defense.immune);
      }
      this.events.push({ k: 'shieldUp', id: t.id, x: t.x, z: t.z, r: s.aura });
    }
  }

  /** Glowup Live Show: zombies in its radius are slowed heavily (cash for damage there: see damage). */
  updateLiveShow(t, s, dt) {
    t.liveT = Math.max(0, t.liveT - dt);
    if (!t.liveT) this.liveShows = [...this.towers.values()].some((o) => o.liveT > 0);
    const ab = s.abilities?.find((a) => a.key === 'liveShow');
    if (!ab) return;
    const r2max = ab.radius * ab.radius;
    for (const e of this.enemies.values()) {
      if ((e.x - t.x) ** 2 + (e.z - t.z) ** 2 <= r2max) this.applySlime(e, { slow: ab.slow, time: 0.3 });
    }
  }

  /** Live Show cash: the Glowup owner whose show covers (x, z) gets `cash` of the damage done there. */
  showCash(e, dealt) {
    for (const o of this.towers.values()) {
      if (!(o.liveT > 0)) continue;
      const ab = TOWERS[o.type].levels[o.level].abilities?.find((a) => a.key === 'liveShow');
      if (!ab || (e.x - o.x) ** 2 + (e.z - o.z) ** 2 > ab.radius * ab.radius) continue;
      const p = this.players.get(o.owner);
      if (!p) continue;
      o.showAcc = (o.showAcc || 0) + dealt * ab.cash;
      const pay = Math.floor(o.showAcc);
      o.showAcc -= pay;
      p.cash += pay;
      return;
    }
  }

  /**
   * Glacier: traps the zombie in an ice cube for `cube.time` s (bosses: `bossTime`). The cube has
   * the zombie's health (at most `cube.hp`, bosses 3x that) and takes the damage meant for the
   * zombie; the zombie thaws when it breaks or melts.
   */
  iceCube(t, s, e) {
    if (e.cubeHp > 0 || e.statusImmune || e.stunImmune || e.freezeImmune || e.iceResist >= 1) return;
    const c = s.cube;
    const boss = !!e.boss;
    e.cubeHp = Math.min(e.hp, c.hp) * (boss ? 3 : 1);
    e.stop = boss ? c.time * 2 : c.time;
    e.stopKind = 'ice';
    e.speed = 0;
    this.events.push({ k: 'boom', x: r2(e.x), z: r2(e.z), r: 1.5, ice: 1 });
  }

  /** Ducky Engineer: builds its sentry at each `builds.at` share of the path it walks past. */
  buildAlong(u, tower) {
    const b = u.def.builds;
    u.built ??= 0;
    while (u.built < b.at.length && u.dist <= path.length * b.at[u.built]) {
      u.built++;
      if (!tower) continue;
      this.spawnUnit(tower, b.unit, 0, u.dist, u.route);
      this.events.push({ k: 'sprout', x: r2(u.x), z: r2(u.z) });
    }
  }

  /** Elementalist Heatwave: hurts, burns and knocks back every zombie it can see within `ab.radius`. */
  heatwave(t, s, ab) {
    const det = this.detects(t, s);
    for (const e of [...this.enemies.values()]) {
      if (!canHit(det, e) || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > ab.radius * ab.radius) continue;
      this.ignite(e, t.id, ab.burn, ab.burnTime, 0);
      this.damage(t, e, ab.damage);
      if (this.enemies.has(e.id)) this.knockBack(e, ab.knock);
    }
    this.events.push({ k: 'boom', x: r2(t.x), z: r2(t.z), r: ab.radius, heat: 1 });
  }

  /** Elementalist Ice Turret: a turret (a unit that stands still) on the path closest to (x, z). */
  /** Relic Summon: drops every unit in `ab.drop` on the path near (x, z), a little apart. */
  relicSummon(t, ab, x, z) {
    const d = path.project(x, z);
    const route = path.lastRoute;
    const all = ab.drop.flatMap((g) => Array(g.n).fill(g.unit));
    all.forEach((def, i) => {
      const u = this.spawnUnit(t, def, 0, path.length - 1, route);
      u.dist = Math.max(0, Math.min(path.length - 1, d + (i - (all.length - 1) / 2) * 1.5));
      this.placeUnit(u);
    });
    const p = path.at(d, {}, route);
    this.events.push({ k: 'airdrop', x: r2(p.x), z: r2(p.z), n: all.length, relic: 1 });
  }

  placeIceTurret(t, ab, x, z) {
    const u = this.spawnUnit(t, ab.unit, 0, path.project(x, z), path.lastRoute);
    this.events.push({ k: 'sprout', x: r2(u.x), z: r2(u.z), ice: 1 });
  }

  /** Harvester Thorns: a thorn patch where you clicked, plus a weaker one by each of your Farms in range. */
  growThorns(t, s, ab, x, z) {
    const patch = (px, pz, mult) => {
      const p = { id: this.nextId++, tower: t.id, kind: 'thorns', x: px, z: pz, land: 0, radius: ab.radius, left: ab.time, damage: ab.damage * mult, tick: ab.tick, next: 0, slow: ab.slow };
      this.traps.set(p.id, p);
    };
    patch(x, z, 1);
    for (const o of this.towers.values()) {
      if (o.owner !== t.owner || familyOf(o.type) !== 'farm' || (o.x - t.x) ** 2 + (o.z - t.z) ** 2 > s.range * s.range) continue;
      const p = path.at(path.project(o.x, o.z), {}, path.lastRoute);
      patch(p.x, p.z, ab.farmMult);
    }
  }

  /** Goo Gunner Spawn Puddle: a goo puddle on the bit of path closest to the tower. */
  dropPuddle(t, ab) {
    const d = path.project(t.x, t.z);
    const r = path.lastRoute;
    const p = path.at(d, {}, r);
    const id = this.nextId++;
    this.traps.set(id, { id, tower: t.id, kind: 'goo', x: p.x, z: p.z, d, r, land: 0, radius: ab.radius, left: ab.time, every: ab.every, next: 0, units: ab.units });
    this.events.push({ k: 'boom', x: r2(p.x), z: r2(p.z), r: ab.radius, slime: 1 });
  }

  /** A goo puddle: sends out its units every `every` s until it dries up (or its tower is gone). */
  gooPuddle(p, dt) {
    const tower = this.towers.get(p.tower);
    if ((p.left -= dt) <= 0 || !tower) {
      this.traps.delete(p.id);
      this.events.push({ k: 'trapGone', id: p.id, kind: p.kind, x: r2(p.x), z: r2(p.z) });
      return;
    }
    if ((p.next -= dt) > 0) return;
    p.next += p.every;
    const all = p.units.flatMap((g) => Array(g.n).fill(g.unit));
    all.forEach((def, i) => this.spawnUnit(tower, def, i * 1.5, p.d, p.r ?? 0));
    this.events.push({ k: 'boom', x: r2(p.x), z: r2(p.z), r: p.radius, slime: 1 });
  }

  /** A thorn patch: hurts and slows every ground zombie inside (hidden ones too, never lead) every `tick` s. */
  thornPatch(p, dt) {
    if ((p.left -= dt) <= 0) {
      this.traps.delete(p.id);
      this.events.push({ k: 'trapGone', id: p.id, kind: p.kind, x: r2(p.x), z: r2(p.z) });
      return;
    }
    p.next -= dt;
    const hit = p.next <= 0;
    if (hit) p.next += p.tick;
    const tower = this.towers.get(p.tower) ?? null;
    for (const e of [...this.enemies.values()]) {
      if (e.flying || e.lead || (e.x - p.x) ** 2 + (e.z - p.z) ** 2 > p.radius * p.radius) continue;
      if (!e.statusImmune) {
        e.thornSlow = Math.max(e.thornT > 0 ? e.thornSlow : 0, p.slow);
        e.thornT = 1;
      }
      if (hit) this.damage(tower, e, p.damage);
    }
  }

  /** Firework Technician: when a wave starts, towers in its range get hidden detection and fireworks for a while. */
  lightFireworks() {
    for (const f of this.towers.values()) {
      const fw = TOWERS[f.type].levels[f.level].firework;
      if (!fw || f.hp <= 0) continue;
      const r = TOWERS[f.type].levels[f.level].aura;
      for (const t of this.towers.values()) {
        if (t === f || TOWERS[t.type].kind === 'income' || TOWERS[t.type].levels[t.level].firework || (t.x - f.x) ** 2 + (t.z - f.z) ** 2 > r * r) continue;
        // The best Technician in range wins.
        if (t.fwT > 0 && t.fw && t.fw.damage >= fw.damage) continue;
        t.fwT = fw.time;
        t.fw = { ...fw, by: f.id };
      }
    }
  }

  /** Firework: tower `t` (boosted by a Technician) may launch one at the zombie it just hurt. */
  firework(t, e) {
    const s = TOWERS[t.type].levels[t.level];
    const per = (s.cooldown || 1) / (s.burst || 1);
    if (Math.random() >= Math.min(t.fw.cap, per / 2)) return;
    const by = this.towers.get(t.fw.by) ?? null;
    this.explode(by, e.x, e.z, { damage: t.fw.damage, radius: t.fw.radius, burn: t.fw.burn, burnTime: 3, det: { hidden: true, flying: true, lead: true }, pierceArmor: true, firework: 1 });
  }

  /** Mobster Place Bounty: the toughest zombie in range it can hit that has no bounty yet (or the toughest one). */
  bountyTarget(t, s) {
    const det = this.detects(t, s);
    const r2max = s.range * s.range;
    let best = null;
    for (const e of this.enemies.values()) {
      if (!canHit(det, e) || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > r2max) continue;
      const rank = (e.bounty ? 0 : 1e12) + e.hp;
      if (!best || rank > best.rank) best = { e, rank };
    }
    return best?.e ?? null;
  }

  /** Marks a zombie for good: when it dies, the owner gets `ab.pct` of its max health as cash, up to `ab.cap`. A better bounty replaces a worse one. */
  placeBounty(t, s, ab) {
    const e = this.bountyTarget(t, s);
    if (!e) return;
    const pay = Math.round(Math.min(ab.cap, e.maxHp * ab.pct));
    if (e.bounty && e.bounty.pay >= pay) return;
    e.bounty = { owner: t.owner, pay };
    this.events.push({ k: 'bounty', e: e.id, v: pay });
  }

  /**
   * Slammer Grand Slam: every zombie it can hit within `ab.radius` takes its damage, catches fire
   * and is stunned for `ab.stun` s, even bosses (full length) and stun-immune zombies.
   */
  grandSlam(t, s, ab) {
    const det = this.detects(t, s);
    const r2max = ab.radius * ab.radius;
    this.events.push({ k: 'whirl', t: t.id, r: ab.radius });
    for (const e of [...this.enemies.values()]) {
      if (!canHit(det, e) || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > r2max) continue;
      this.ignite(e, t.id, ab.burn, ab.burnTime, 0);
      this.damage(t, e, s.damage);
      if (!this.enemies.has(e.id) || e.stop >= ab.stun) continue;
      e.stop = ab.stun;
      e.stopKind = 'stun';
      e.speed = 0;
    }
  }

  /**
   * Assault Grenadier Stiel / Napalm Grenade: thrown at a spot the player picked. The blast sets
   * zombies on fire; napalm also leaves a burning patch (a thermite trap) for `ab.time` s.
   */
  throwNade(t, s, ab, x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const time = 0.9;
    const det = this.detects(t, s);
    const patch = ab.time ? { radius: ab.radius, time: ab.time, burn: ab.burn, burnTime: ab.burnTime } : null;
    this.shells.push({ tower: t.id, x, z, time, damage: ab.damage, radius: ab.radius, burn: ab.burn, burnTime: ab.burnTime, det, patch });
    t.yaw = Math.atan2(x - t.x, z - t.z);
    this.events.push({ k: 'lob', t: t.id, x: r2(x), z: r2(z), d: time });
  }

  /**
   * Commando Concussive Missiles: `count` missiles land around (x, z) `delay` s later, each
   * `damage` within `radius` (ignoring armor, hitting lead zombies) and stunning for `stun` s.
   */
  concussive(t, s, ab, x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const det = { ...this.detects(t, s), lead: true };
    for (let i = 0; i < ab.count; i++) {
      const a = (i / ab.count) * TAU;
      const off = ab.count > 1 ? ab.radius * 0.6 : 0;
      const bx = x + Math.sin(a) * off;
      const bz = z + Math.cos(a) * off;
      const time = ab.delay + i * 0.15;
      this.shells.push({ tower: t.id, x: bx, z: bz, time, damage: ab.damage, radius: ab.radius, stun: ab.stun, det, pierceArmor: true });
      this.events.push({ k: 'strike', x: r2(bx), z: r2(bz), d: time, ...(i ? { n: i } : {}), t: t.id });
    }
    t.yaw = Math.atan2(x - t.x, z - t.z);
  }

  /**
   * MLRS Carpet Bomb: a B-52 flies along the path through (x, z) and drops `ab.bombs` bombs
   * `ab.gap` s apart over a strip `ab.length` long, zig-zagging across its `ab.width`.
   */
  carpetBomb(t, s, ab, x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    // Line it up with the path where it's closest to the click.
    const p = path.at(path.project(x, z), {}, path.lastRoute);
    const ux = p.dx;
    const uz = p.dz;
    const det = { ...this.detects(t, s), lead: true };
    const n = ab.bombs;
    const side = ab.width / 2 - ab.radius;
    for (let i = 0; i < n; i++) {
      const along = (i / (n - 1) - 0.5) * ab.length;
      const across = (i % 2 ? 1 : -1) * side;
      const bx = x + ux * along - uz * across;
      const bz = z + uz * along + ux * across;
      const time = ab.delay + i * ab.gap;
      this.shells.push({ tower: t.id, x: bx, z: bz, time, damage: ab.damage, radius: ab.radius, det });
      this.events.push({ k: 'strike', x: r2(bx), z: r2(bz), d: r2(time), ...(i ? { n: i } : {}) });
    }
    this.events.push({ k: 'b52', x: r2(x), z: r2(z), dx: r2(ux), dz: r2(uz), d: ab.delay, len: ab.length, gap: ab.gap * n });
  }

  /**
   * Bubble Blower: `s.bubble.n` bubbles at different zombies in range (the target first). Each does
   * `s.damage`; non-boss zombies are pushed back (`push`, at most once every BUBBLE_PUSH_CD s) or,
   * with `float`, lifted off the ground for that long.
   */
  blowBubbles(t, def, s, target) {
    const b = s.bubble;
    const list = b.n > 1 ? [target, ...this.findTargets(t, s, b.n - 1, (e) => e !== target)] : [target];
    for (const e of list) {
      this.shoot(t, e, s.damage);
      if (!this.enemies.has(e.id) || e.boss || e.statusImmune) continue;
      if (b.float) this.stop(def, e, b.float, 'float');
      else if (!(e.pushT > 0)) {
        this.knockBack(e, b.push);
        e.pushT = BUBBLE_PUSH_CD;
      }
    }
  }

  /** Bubble Blower Lv 5: a Bubble Companion every `every` s of wave time, at the far end of the path in its range. */
  updateCompanion(t, s, dt) {
    if (this.wave.state !== 'wave') return;
    const c = s.companion;
    t.compT = (t.compT ?? 0) - dt;
    if (t.compT > 0) return;
    if (this.countOf(t, c.unit) >= (c.unit.max ?? Infinity)) {
      t.compT = 0; // wait for a free slot
      return;
    }
    const p = {};
    const r2max = s.range * s.range;
    for (let r = 0; r < path.routes.length; r++) for (let d = 0; d <= path.length; d += 0.5) {
      path.at(d, p, r);
      if ((p.x - t.x) ** 2 + (p.z - t.z) ** 2 > r2max) continue;
      t.compT = c.every;
      this.spawnUnit(t, c.unit, 0, d, r);
      this.events.push({ k: 'sprout', x: r2(p.x), z: r2(p.z), bubble: 1 });
      return;
    }
    t.compT = 1; // no path in range
  }

  /** Swarmer Bee Swarm Grenade:`damage` to everything within `radius` of (x, z), ignoring armor, lead too. */
  beeNade(t, s, ab, x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const time = 0.9;
    this.shells.push({ tower: t.id, x, z, time, damage: ab.damage, radius: ab.radius, det: { ...this.detects(t, s), lead: true }, pierceArmor: true });
    t.yaw = Math.atan2(x - t.x, z - t.z);
    this.events.push({ k: 'lob', t: t.id, x: r2(x), z: r2(z), d: time });
  }

  /**
   * Toxicnator Toxic Blast / Saboteur Aggressive Toxins: a grenade thrown at a spot; zombies in
   * the blast take extra damage for a while (Neuralyzed ones are also targeted first).
   */
  throwToxic(t, s, ab, x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const time = 0.9;
    this.shells.push({ tower: t.id, x, z, time, damage: 0, radius: ab.radius, det: this.detects(t, s), toxic: ab });
    t.yaw = Math.atan2(x - t.x, z - t.z);
    this.events.push({ k: 'lob', t: t.id, x: r2(x), z: r2(z), d: time });
  }

  /**
   * Ghost C7 Drone (while it's on): reveals hidden zombies within its range and shoots them,
   * or any zombie in range when there is no hidden one.
   */
  /** Ice Breaker Snow Storm: while it's on, zombies around the tower build up freeze fast. */
  updateSnowStorm(t, s, dt) {
    const ab = s.abilities?.find((a) => a.key === 'snowStorm');
    if (!ab) return;
    const det = this.detects(t, s);
    const r2max = ab.radius * ab.radius;
    const fx = { chill: ab.freeze * 0.06 * dt, chillTime: s.chillTime ?? 3, maxSlow: s.maxSlow ?? 0.3, chillDps: 0, chillFreeze: s.chillFreeze ?? 1, freezeBoss: s.freezeBoss };
    for (const e of this.enemies.values()) {
      if (canHit(det, e) && (e.x - t.x) ** 2 + (e.z - t.z) ** 2 <= r2max) this.applyChill(t, fx, e);
    }
    // A puff of snow about once a second while it lasts.
    t.stormFx = (t.stormFx ?? 0) - dt;
    if (t.stormFx <= 0) {
      t.stormFx = 1;
      this.events.push({ k: 'boom', x: r2(t.x), z: r2(t.z), r: ab.radius, ice: 1 });
    }
  }

  updateDrone(t, s, dt) {
    const ab = s.abilities?.find((a) => a.key === 'drone');
    if (!ab) return;
    const r2max = ab.range * ab.range;
    let best = null;
    let bestHidden = false;
    for (const e of this.enemies.values()) {
      if (e.remains || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > r2max) continue;
      if (e.hidden) e.revealT = Math.max(e.revealT || 0, 0.3);
      // Hidden zombies first, then the one furthest down the path.
      if (!best || (e.hidden && !bestHidden) || (e.hidden === bestHidden && e.dist > best.dist)) {
        best = e;
        bestHidden = e.hidden;
      }
    }
    t.droneT = Math.max(-dt, (t.droneT || 0) - dt);
    if (!best || t.droneT > 0) return;
    t.droneT += ab.every;
    this.events.push({ k: 'shot', t: t.id, e: best.id, dr: 1 });
    this.damage(t, best, ab.damage);
  }

  /** Splash towers: grenades/shells lobbed at where the zombie will be, homing rockets, or an instant ice blast. */
  fireSplash(t, def, s, target) {
    let det = this.detects(t, s);
    if (def.splashAir) det = { ...det, flying: true }; // Demolitionist: its blasts catch flyers near the ground zombie
    const blast = { damage: s.damage, splash: s.splash, radius: s.radius, freeze: s.freeze, freezeMain: s.freezeMain, slime: s.slime,
      ...(s.ignite ? { burn: s.ignite.dps, burnTime: s.ignite.time, burnSlow: def.burnSlow ?? 0 } : {}), stun: s.stun, stunTargets: s.stunTargets, det, main: target.id, cluster: s.cluster, nuke: s.nuke, gas: s.gas, maxHits: s.maxHits, paint: def.paint,
      knock: s.knock, chill: s.chill ? s : null, airMult: s.airMult, freezeHp: s.freezeHp, reveal: s.reveal,
      ...(s.poison ? { poison: s.poison } : {}), ...(s.nuki ? { nuki: s.nuki } : {}) }; // Maitake splash poison, Nuki Launcher
    if (s.bombs) {
      // Jester: every bomb has the effects of every bomb type picked (the biggest blast and damage of them).
      const bombs = this.bombsOf(t, s);
      blast.radius = Math.max(...bombs.map((b) => b.radius));
      blast.damage = s.damage * Math.max(...bombs.map((b) => b.mult));
      for (const b of bombs) {
        if (b.key === 'fire') Object.assign(blast, { burn: b.dps, burnTime: b.time, burnSlow: 0 });
        else if (b.key === 'ice') Object.assign(blast, { chill: b, melt: b.melt, ice: null });
        else if (b.key === 'poison') blast.poison = b;
        else if (b.key === 'confuse') blast.confuse = b;
      }
      blast.bomb = bombs.map((b) => b.key).join(',');
    }
    if (def.fly) {
      // Explosive Goo / splash rockets: fly to the zombie and burst where it is when they land.
      const time = this.flyTime(t, s, target);
      this.shells.push({ tower: t.id, enemy: target.id, x: target.x, z: target.z, time, ...blast });
      this.events.push({ k: 'fly', t: t.id, e: target.id, d: r2(time) });
      return;
    }
    if (!def.lob) {
      // Ice blast: instant hit on the target, freezing everything around it.
      this.events.push({ k: 'shot', t: t.id, e: target.id });
      this.explode(t, target.x, target.z, blast);
      return;
    }
    const time = s.lob ?? def.lob;
    if (s.throws > 1) {
      // Firecracker: each firecracker is lobbed at a different zombie (doubling up if there are few).
      const list = this.findTargets(t, s, s.throws);
      if (!list.length) list.push(target);
      for (let i = 0; i < s.throws; i++) {
        const e = list[i % list.length];
        const d = time + i * 0.08;
        const p = this.leadPoint(e, d);
        this.shells.push({ tower: t.id, x: p.x, z: p.z, time: d, ...blast, main: e.id });
        this.events.push({ k: 'lob', t: t.id, x: r2(p.x), z: r2(p.z), d });
      }
      return;
    }
    if (s.volley) {
      // Missile Maelstrom: each missile locks onto a different zombie (doubling up if there are few).
      const list = this.findTargets(t, s, s.volley, minRangeOf(def, s) ? (e) => !this.deadzone(t, minRangeOf(def, s))(e) : null);
      if (!list.length) list.push(target);
      for (let i = 0; i < s.volley; i++) {
        const e = list[i % list.length];
        const d = time + i * 0.1;
        this.shells.push({ tower: t.id, enemy: e.id, x: e.x, z: e.z, time: d, ...blast, main: e.id });
        this.events.push({ k: 'rocket', t: t.id, e: e.id, d });
      }
      return;
    }
    if (def.homing) {
      this.shells.push({ tower: t.id, enemy: target.id, x: target.x, z: target.z, time, ...blast });
      this.events.push({ k: 'rocket', t: t.id, e: target.id, d: time });
      return;
    }
    // Snowballer: aims as if no zombie is faster than `leadCap`, so fast ones walk out of the way.
    // Artillery: shells land right on its Target Select spot.
    const p = t.spotOn ? t.spot : this.leadPoint(target, time, def.leadCap);
    this.shells.push({ tower: t.id, x: p.x, z: p.z, time, ...blast });
    this.events.push({ k: 'lob', t: t.id, x: r2(p.x), z: r2(p.z), d: time });
  }

  /** Where enemy `e` will be after `time` seconds at its current speed (at most `maxSpeed`). */
  leadPoint(e, time, maxSpeed = Infinity) {
    const p = path.at(e.dist + Math.min(e.speed, maxSpeed) * time, {}, e.route);
    p.x += -p.dz * e.lateral;
    p.z += p.dx * e.lateral;
    return p;
  }

  /** Freeze or stun an enemy for `secs` (bosses get only `def.bossStop` of it). */
  stop(def, e, secs, kind) {
    if (!this.enemies.has(e.id) || (e.statusImmune && !def.stunAny)) return; // Stunner: stuns anything
    if (e.void && kind === 'stun' && (def.stunAny || (def.noVoidStun && e.boss))) return; // ...but never Void enemies
    if (e.stunImmune && !def.stunAny) return; // Medium Predator: no stuns or freezes
    if (kind === 'ice' && e.freezeImmune) return; // Insane: freeze immune
    if (kind === 'dance' && e.danceImmune) return; // Void Boss4: won't dance
    if (kind === 'stun' && e.shockImmune && !def.stunAny) return; // Insane: electric immune
    if (kind === 'ice' && e.iceResist && !def.ignoreIceResist) secs *= 1 - e.iceResist; // Multipliers, Nuclear Zombies
    const d = e.boss ? secs * (def.bossStop ?? 1) : secs;
    if (d <= 0 || (d <= e.stop && e.stopKind)) return;
    e.stop = d;
    e.stopKind = kind;
    e.speed = 0;
    if (e.boss && def.bossGrace) e.zapT = d + def.bossGrace;
  }
}
