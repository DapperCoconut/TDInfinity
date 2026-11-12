// Authoritative game simulation. Pure logic: no three.js, no DOM.
// Runs in the browser for solo play and on the server (one per room) for multiplayer.
//
// The Sim class is too big for one file, so most of its methods live in sim/parts/:
//   shared.js         numbers, status names (ST_...) and helpers every part uses
//   waves.js          waves, spawning enemies, money
//   enemy-moves1/2    what enemies and bosses do in each mode
//   tower-health.js   towers getting hurt and healed
//   tower-update.js   updateTower: one tower's frame
//   weapons1-4.js     how each kind of tower weapon works
//   units.js          summoned units
//   abilities.js      useAbility and every ability
//   damage.js         damage(), burns, explosions, picking targets
// This file keeps the frame (tick), player commands (action), and what goes over the network
// (snapshot). The bottom of the file puts the parts' methods on Sim, so this.anything() works
// the same from every file. Everything sim.js exported before is still exported from here.
import {
  DIFFICULTIES, ENEMIES, GAME, PERKS, PLAYER_COLORS, SPEEDS, TARGET_MODES, TOWERS, WAVES, abilityCost, canHit,
  choiceOptions, choicesOf, difficulty, eventMap, modeFor, facesCone, pickOptions, rootType, towerCost, towerLimit, towerMaxHp,
} from '../config.js';
import { canPlace, laneOf, laneOz, mapKey, placeFail, setMap } from './map.js';
import { pickableMap } from './maps.js';
import { BEELINE, BOUNDS, path, setTimeWorld } from './path.js';
import {
  HC_FX, INSANE_FX, MAX_STEP, ORION_FX, ST_AIRBORNE, ST_ARMORED, ST_BIOHAZARD, ST_BURNING, ST_CHARGING, ST_CHILLED,
  ST_CLOAKED, ST_CONFUSED, ST_DANCE, ST_ENRAGED, ST_FLOAT, ST_FROZEN, ST_GASSED, ST_GLITCHED, ST_HACKED, ST_HASTED,
  ST_SHOCKED, ST_SHROOM, ST_SLIMED, ST_SMOKED, ST_STUNNED, ST_VOIDARMOR, ST_VOIDAURA, VB_FX, VOID_FX, buffOf, cdSnap,
  computeBuffs, nextUpgrade, r2, spyCircles,
} from './parts/shared.js';
export {
  FLY_HEIGHT, FPS_BACK, ST_AIRBORNE, ST_ARMORED, ST_BIOHAZARD, ST_BURNING, ST_CHARGING, ST_CHILLED, ST_CLOAKED,
  ST_CONFUSED, ST_DANCE, ST_ENRAGED, ST_FLOAT, ST_FROZEN, ST_GASSED, ST_GLITCHED, ST_HACKED, ST_HASTED, ST_SHOCKED,
  ST_SHROOM, ST_SLIMED, ST_SMOKED, ST_STUNNED, ST_VOIDARMOR, ST_VOIDAURA, beamHealable, bladePos, borrowsHidden,
  buffOf, computeBuffs, droneMode, droneModes, mediCharge, medicShields, modeStats, nextUpgrade, orbitOf, planePos,
  spyCircles, upgradeCost,
} from './parts/shared.js';
import { SimEnemyMoves1 } from './parts/enemy-moves1.js';
import { SimEnemyMoves2 } from './parts/enemy-moves2.js';
import { SimTowerHealth } from './parts/tower-health.js';
import { SimWaves } from './parts/waves.js';
import { SimTowerUpdate } from './parts/tower-update.js';
import { SimWeapons1 } from './parts/weapons1.js';
import { SimWeapons2 } from './parts/weapons2.js';
import { SimWeapons3 } from './parts/weapons3.js';
import { SimUnits } from './parts/units.js';
import { SimAbilities } from './parts/abilities.js';
import { SimDamage } from './parts/damage.js';
import { SimWeapons4 } from './parts/weapons4.js';
import { H2_FX, SimCarnival } from './parts/carnival.js';
import { N3_FX, SimNightmare } from './parts/nightmare.js';

export class Sim {
  /**
   * @param {{id: string, name: string, color?: number, loadout?: string[], evo?: object}[]} players  (no loadout = any tower;
   *   evo: evolution level of each evolved tower they own, which gates its upgrades; none = no gate)
   * @param {{vs?: object, lane?: number, idBase?: number}} opts  Versus: the VersusSim running this map,
   *   which lane it is, and where its ids start (so ids are unique across every lane).
   */
  constructor(players, opts = {}) {
    this.vs = opts.vs ?? null;
    // Difficulty: which scripted waves this game plays (Versus always plays the zombie waves).
    this.mode = this.vs ? 'zombies' : DIFFICULTIES[opts.mode] ? opts.mode : 'easy';
    // Versus lanes: the VersusSim already picked the map. Event modes always play their own map.
    if (!this.vs) setMap(eventMap(this.mode, opts.map) ?? pickableMap(opts.map), true); // an event plays one of its own maps, and only an event does
    this.map = mapKey;
    const dm = this.vs ? {} : modeFor(this.mode, mapKey); // (an event map may bring its own waves)
    this.waves = this.vs ? WAVES : dm.waves;
    this.cashMult = this.vs ? 1 : dm.cash; // harder modes pay more in-game cash
    // Cash for damage (see GAME.dmgCash): every point of health damage pays every player this
    // much. 0 (Versus): enemies pay their `reward` when they die instead.
    this.dmgCash = this.vs ? 0 : dm.dmgCash ?? GAME.dmgCash;
    this.cashAcc = 0; // damage cash not paid out yet (it pays whole dollars)
    // Halloween (`pot`): the mode's cash numbers are a full server's, shared between whoever is
    // playing: with a pot of 4, a solo player gets 4x the starting cash and wave bonus and all of
    // the damage cash, and four players get the listed numbers and a quarter of the damage cash each.
    this.potShare = dm.pot ? dm.pot / Math.max(1, players.length) : 1;
    this.dmgShare = dm.pot ? 1 / Math.max(1, players.length) : 0; // 0: not a pot mode (see payDamage)
    this.flatHp = !!dm.flatHp; // Medium: enemy health doesn't grow per wave
    this.dm = dm; // its DIFFICULTIES entry (hpCurve reads it)
    this.timers = dm.timers ?? null; // Medium: waves that start the next one after a while anyway
    this.maxBaseHp = dm.baseHp ?? GAME.baseHp;
    this.mpHp = dm.mpHp ?? null; // Hard: enemy health bonus per number of extra players
    this.mpPerEnemy = !!dm.mpPerEnemy; // Expert: each enemy has its own multiplayer health (mpTop / mpPow)
    this.voidArmor = dm.voidArmor ?? null; // Void mode: the void armor mutation (see armorUp)
    this.bossSeen = new Set(); // Hard: `bossFirst` enemies already spawned this game
    this.goos = []; // Hard: Necrotic Skeleton goo puddles that heal enemies: { x, z, r, left, heal, every, t }
    // Medium sets its own starting cash, plus a group bonus when playing with others.
    const startCash = Math.round((dm.startCash != null ? dm.startCash + (players.length > 1 ? dm.groupBonus ?? 0 : 0) : Math.round(GAME.startCash * this.cashMult)) * this.potShare);
    this.lane = opts.lane ?? 0;
    this.players = new Map();
    players.forEach((p, i) =>
      this.players.set(p.id, { id: p.id, name: p.name, color: p.color ?? PLAYER_COLORS[i % PLAYER_COLORS.length], cash: startCash, loadout: p.loadout ?? null, evo: p.evo ?? null }),
    );
    this.startingPlayers = Math.max(1, players.length);
    this.towers = new Map();
    this.enemies = new Map();
    this.nextId = opts.idBase ?? 1;
    this.baseHp = this.maxBaseHp;
    this.speed = 1;
    this.over = 0; // 0 = playing, 1 = victory, -1 = defeat
    this.wave = { state: 'intermission', index: 0, countdown: dm.firstIntermission ?? GAME.firstIntermission, t: 0, left: 0, votes: 0, total: this.waves.length };
    this.queue = [];
    this.shells = []; // bombs and missiles in flight
    this.flights = []; // single-target projectiles in flight (slime globs, harpoons, thrown grenades...)
    this.blades = []; // boomerangs and thrown knives in flight (they pierce, so they're tracked over time)
    this.rings = []; // Pulse Trooper pulses growing out from their tower
    this.sweeps = []; // Sweeper lasers spinning around their tower
    this.spies = []; // Aviator hidden-detection rings, refreshed every tick
    this.buffs = new Map(); // Commander / DJ boosts, refreshed every tick
    this.cashBacks = new Map(); // player id -> Oil Derrick Cash Back share, refreshed every tick
    this.units = new Map(); // Jeeps, Tanks, Soldier squads... driving from the castle toward the entrance
    this.traps = new Map(); // Trapper spikes, landmines and bear traps lying on the path
    this.skipVotes = new Set();
    this.holos = []; // hacked zombies that died this tick, to come back as holograms
    this.fraudAcc = 0; // Wire Fraud cash not paid out yet (it pays whole dollars)
    this.axes = []; // Molten Warlord axes (and Hard mode fireballs, boulders, missiles...) in flight
    this.puddles = []; // Lava Golem magma puddles: { x, z, r, dps, left }
    this.reborn = []; // enemies to spawn at the end of the tick (cage monsters, boss phase 2, summons)
    this.zones = []; // Insane mode trails and smoke on the path: { kind: 'trail' | 'smoke', x, z, r, left, speed }
    this.bombs = []; // Beholder time bombs stuck to towers: { id, tower, x, z, left, dmg, r }
    this.timeWorld = false; // the Beholder pulled everyone into the time dimension
    this.marks = []; // VOID's purple X marks on towers: { id, tower, x, z, left }
    this.orbs = []; // VOID's magic missiles flying down the path: { id, dist, x, z, speed, dmg }
    this.lasers = []; // VOID's sky lasers charging up: { left }
    this.finaleT = 0; // VOID is dead: seconds of the finale before the game is won
    setTimeWorld(false);
    this.events = []; // drained by whoever runs the sim
    this.tmp = {};
  }

  removePlayer(id) {
    this.players.delete(id);
    this.skipVotes.delete(id);
    this.wave.votes = this.skipVotes.size;
    this.checkSkip();
  }

  // ---------------------------------------------------------------- stepping

  step(realDt) {
    let dt = realDt * this.speed;
    while (dt > 1e-6 && !this.over) {
      const h = Math.min(dt, MAX_STEP);
      this.tick(h);
      dt -= h;
    }
  }

  tick(dt) {
    const w = this.wave;
    if (this.vs) {
      // Versus: the VersusSim starts waves on its shared clock; the queue just keeps running.
      if (w.state === 'wave') {
        w.t += dt;
        while (this.queue.length && this.queue[0].t <= w.t) this.spawnQueued(this.queue.shift());
        w.left = this.queue.length;
      }
    } else if (w.state === 'intermission') {
      w.countdown -= dt;
      if (w.countdown <= 0) this.startWave();
    } else if (w.state === 'wave') {
      w.t += dt;
      while (this.queue.length && this.queue[0].t <= w.t) this.spawnQueued(this.queue.shift());
      w.left = this.queue.length;
      // Medium wave timers: when it runs out, the next wave comes whether this one is cleared or not.
      const timer = this.timers?.[w.index];
      w.countdown = timer && w.index < this.waves.length - 1 ? Math.max(0, timer - w.t) : 0;
      if (timer && w.t >= timer && this.canSkipWave) {
        this.events.push({ k: 'waveTimer', i: w.index });
        this.skipWave();
      }
    }

    // Overlord Amplifiers: the speed and healing each summoner gets from its amplifiers (they stack).
    let amps = null;
    for (const o of this.enemies.values()) {
      const amp = ENEMIES[o.type].amp;
      if (!amp || !o.owner) continue;
      const sum = (amps ??= new Map()).get(o.owner) ?? { speed: 0, heal: 0 };
      sum.speed += amp.speed;
      sum.heal += amp.heal;
      amps.set(o.owner, sum);
    }
    if (this.finaleT > 0) this.finaleT = Math.max(0, this.finaleT - dt);
    // VOID's aura: enemies near him are hidden and heavily armored.
    let voidAuras = null;
    for (const o of this.enemies.values()) if (ENEMIES[o.type].aura) (voidAuras ??= []).push(o);
    // Insane mode: Warpers speed up the enemies around them, Mechanics armor them up.
    let auras = null;
    for (const o of this.enemies.values()) {
      const d = ENEMIES[o.type];
      if (d.hasteAura || d.gear) (auras ??= []).push(o);
    }
    // Time Dilators: time bubbles that speed up or slow down towers and zombies inside them.
    const dils = this.timeBubbles(dt);
    for (const e of this.enemies.values()) {
      // Status effects: frozen/stunned zombies stand still, burning ones are slowed.
      e.stop = Math.max(0, e.stop - dt);
      if (!e.stop) {
        e.stopKind = 0;
        e.iceVuln = 0;
        e.cubeHp = 0; // Glacier: the ice cube has melted
      }
      e.burn = Math.max(0, e.burn - dt);
      e.slimeT = Math.max(0, e.slimeT - dt);
      if (!e.slimeT) e.slime = 0;
      e.chillT = Math.max(0, e.chillT - dt);
      if (!e.chillT) e.chill = 0;
      e.beatT = Math.max(0, e.beatT - dt);
      if (!e.beatT) e.beatSlow = 0;
      e.vulnT = Math.max(0, e.vulnT - dt);
      if (!e.vulnT) e.vuln = 0;
      if (e.neuroT) e.neuroT = Math.max(0, e.neuroT - dt);
      if (e.zapT) e.zapT = Math.max(0, e.zapT - dt);
      if (e.injuredT && !(e.injuredT = Math.max(0, e.injuredT - dt))) e.injured = 0;
      if (e.harpoons) {
        let sum = 0;
        for (let i = e.harpoons.length - 1; i >= 0; i--) {
          const h = e.harpoons[i];
          if ((h.t -= dt) <= 0) e.harpoons.splice(i, 1);
          else sum += h.slow;
        }
        e.harpoonSlow = Math.min(e.harpoonMax, sum);
        if (!e.harpoons.length) e.harpoons = null;
      }
      if (e.revealT) e.revealT = Math.max(0, e.revealT - dt); // Flare Gun
      if (e.shockT) e.shockT = Math.max(0, e.shockT - dt); // Byte
      if (e.confT) e.confT = Math.max(0, e.confT - dt); // confused: walking backwards
      if (e.confCd) e.confCd = Math.max(0, e.confCd - dt); // can't be confused again yet
      if (e.thornT && !(e.thornT = Math.max(0, e.thornT - dt))) e.thornSlow = 0; // Harvester thorns
      if (e.paraT && !(e.paraT = Math.max(0, e.paraT - dt))) e.paraSlow = 0; // Paralyzer laser
      // Slows from fire, slime, chill, frostbite and Drop the Beat all stack (multiplicatively).
      let slow = (1 - (e.burn ? Math.max(e.burnSlow, ENEMIES[e.type].fireSlow ?? 0) : 0)) * (1 - e.slime) * (1 - e.chill * e.chillMax) * (1 - e.beatSlow) * (1 - e.hackSlow) * (1 - e.coldSlow) * (1 - (e.poison ? e.poison.slow : 0)) * (1 - (e.thornSlow || 0)) * (1 - (e.shockT > 0 ? e.shock : 0)) * (1 - (e.paraSlow || 0));
      // Harpoons stack on top, but never take it past `harpoonCap` (unless it already was).
      if (e.harpoonSlow) slow = Math.max(slow * (1 - e.harpoonSlow), Math.min(slow, 1 - e.harpoonCap));
      if (e.pushT) e.pushT = Math.max(0, e.pushT - dt); // Bubble Blower push cooldown
      if (e.holdT) e.holdT = Math.max(0, e.holdT - dt); // held up by a blocking unit (Bubble Companion)
      e.speed = e.stop || e.holdT ? 0 : e.baseSpeed * slow;
      const def = ENEMIES[e.type];
      if (e.enraged) e.speed *= def.enrage.speed; // Eradicator's last stand
      if (e.shutT > 0) {
        // Medium Eradicator: shut down for a moment when Electronic Rage starts.
        e.shutT = Math.max(0, e.shutT - dt);
        e.speed = 0;
      }
      if (e.vShield > 0) e.speed *= 1 - this.voidArmor.slow; // Void armor is heavy
      if (def.accel) {
        // Void Speedy: faster the longer it has been walking.
        e.age = (e.age || 0) + dt;
        e.speed *= Math.min(def.accel.max, 1 + def.accel.rate * e.age);
      }
      const amp = amps?.get(e.id);
      if (amp) {
        // Insane Overlord: his Amplifiers never heal him past ampCap of his max health.
        const top = e.maxHp * (def.ampCap ?? 1);
        e.speed *= 1 + amp.speed;
        if (e.hp < top) e.hp = Math.min(top, e.hp + e.maxHp * amp.heal * dt);
      }
      // Archers stop and stay back while they have a tower to snipe.
      if (def.camp && this.enemyTargets(e, def.camp).length) e.speed = 0;
      // (Also once the last trail or cloud is gone, so smoke, armor and haste wear off.)
      if (auras || this.zones.length || e.insane || e.smoked || e.hasted || e.gear || e.empT || e.glitchT) e.speed *= this.insaneSpeed(e, def, auras, dt);
      if (voidAuras || e.auraArmor || def.fly?.hide) {
        // VOID's aura (not on himself), and VOID (Spirit) is hidden while it flies.
        let aura = 0;
        for (const a of voidAuras ?? []) {
          const ad = ENEMIES[a.type].aura;
          if (a !== e && !e.remains && (e.x - a.x) ** 2 + (e.z - a.z) ** 2 <= ad.radius * ad.radius) aura = Math.max(aura, ad.armor);
        }
        e.auraArmor = aura;
        e.hidden = !!def.hidden || !!e.cloak || !!e.smoked || aura > 0 || (!!def.fly?.hide && (e.airT > 0 || e.charging));
      }
      if (dils) {
        // Time bubble: bosses can be sped up but never slowed down.
        const sc = this.dilationAt(e.x, e.z, dils)?.scale ?? 1;
        if (sc > 1 || (sc < 1 && !e.boss)) e.speed *= sc;
      }
      // Pestilence mushrooms heal.
      if (e.shroom && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.shroom * dt);
      // Hard mode: Health Regen, Breakers' spawn invulnerability, Fallen Shield charge, Summoner hiding.
      if (e.regen && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regen * dt);
      if (e.invulnT > 0) e.invulnT -= dt;
      if (e.chargeT > 0) {
        e.chargeT -= dt;
        e.speed *= def.charge.speed / def.speed;
      }
      if (def.hideAt && !e.cloak && e.hp <= e.maxHp * def.hideAt) {
        e.hidden = e.cloak = true;
        this.events.push({ k: 'cloak', e: e.id });
      }
      if (def.gift || def.fallenKing) this.fallenAttacks(e, def, dt);
      if (ORION_FX.has(e.type) || e.speedBoost) this.insanePace(e, def, dt);
      if (e.sprinting > 0) {
        // Time Runner: dashing ahead at many times its speed.
        e.sprinting = Math.max(0, e.sprinting - dt);
        e.speed *= def.sprint.speed;
      }
      if (HC_FX.has(e.type) && this.hcAttacks(e, def, dt) === 'gone') continue; // Hardcore (a Drop Pod may burst open)
      if (H2_FX.has(e.type)) this.carnivalMoves(e, def, dt); // Halloween Night 2
      if (N3_FX.has(e.type)) this.nightmareMoves(e, def, dt); // Halloween Night 3
      e.st = (e.stopKind === 'ice' ? ST_FROZEN : e.stopKind === 'stun' ? ST_STUNNED : e.stopKind === 'dance' ? ST_DANCE : e.stopKind === 'float' ? ST_FLOAT : 0) | (e.burn || e.taints?.has('burn') ? ST_BURNING : 0)
        | (e.slime ? ST_SLIMED : 0) | (e.chill ? ST_CHILLED : 0) | (e.hackEv || e.fraud ? ST_HACKED : 0) | (e.gas?.size || e.poison || e.taints?.has('radioactive') ? ST_GASSED : 0) | (e.confT > 0 ? ST_CONFUSED : 0)
        | (e.shockT > 0 ? ST_SHOCKED : 0) | (e.taints?.has('biohazard') ? ST_BIOHAZARD : 0)
        | (e.airT > 0 ? ST_AIRBORNE : 0) | (e.shroom ? ST_SHROOM : 0) | (e.enraged || e.raged ? ST_ENRAGED : 0)
        | (e.smoked ? ST_SMOKED : 0) | (e.armorUp ? ST_ARMORED : 0) | (e.hasted ? ST_HASTED : 0) | (e.glitchT > 0 ? ST_GLITCHED : 0)
        | (e.auraArmor ? ST_VOIDAURA : 0) | (e.charging ? ST_CHARGING : 0) | (e.cloak ? ST_CLOAKED : 0) | (e.vShield > 0 ? ST_VOIDARMOR : 0);
      // Confused zombies walk back toward the entrance.
      if (e.confT > 0) e.dist = Math.max(0, e.dist - e.speed * dt);
      else e.dist += (e.speed * dt) / (e.route === BEELINE ? path.beeline.k : 1); // the straight line is shorter
      // Spider Queen: lays spiders behind her (not while frozen or stunned). Some summon several kinds.
      if (e.summonT && !e.stop) {
        [].concat(def.summon).forEach((sm, i) => {
          if ((e.summonT[i] -= dt) > 0) return;
          e.summonT[i] = sm.every;
          if (sm.max) {
            let alive = 0;
            for (const o of this.enemies.values()) if (o.owner === e.id && o.type === sm.type) alive++;
            for (const r of this.reborn) if (r.owner === e.id && r.type === sm.type) alive++;
            if (alive >= sm.max) return;
          }
          const cnt = Array.isArray(sm.n) ? sm.n[0] + Math.floor(Math.random() * (sm.n[1] - sm.n[0] + 1)) : sm.n; // MK11-Device: 2-3
          // Goodie Bag, Clown Car: a random one of `types` each time.
          const type = sm.types ? sm.types[Math.floor(Math.random() * sm.types.length)] : sm.type;
          for (let j = 0; j < cnt; j++) this.reborn.push({ route: e.route, type, dist: Math.max(0, sm.here ? e.dist : e.dist - 1.5 - j), lateral: sm.here ? e.lateral : 0, hpScale: 1, owner: e.id, noCash: !!sm.noCash });
          this.events.push({ k: 'summon', e: e.id, type });
        });
      }
      // Amplifiers float along next to the enemy that summoned them.
      if (def.escort) {
        const boss = this.enemies.get(e.owner);
        if (boss) {
          e.dist = Math.max(0, boss.dist - 3);
          e.lateral = boss.lateral + 2.5;
        }
      }
      // Corpses crumble away after a while.
      if (e.remains && (e.life -= dt) <= 0) {
        this.enemies.delete(e.id);
        this.events.push({ k: 'decay', e: e.id });
        continue;
      }
      if ((def.slam || def.axe) && !e.stop) this.bossAttacks(e, def, dt);
      if (def.shots || def.slash || def.dash || def.fly || def.infect || def.enrage) this.hardAttacks(e, def, dt);
      if (def.smog || def.stomp || def.beam || def.barrage) this.expertAttacks(e, def, dt);
      if (def.moves || def.sprint || def.sacrifice) this.expertMoves(e, def, dt);
      if (INSANE_FX.has(e.type)) this.insaneAttacks(e, def, dt);
      if (VOID_FX.has(e.type)) this.voidAttacks(e, def, dt);
      if (VB_FX.has(e.type)) this.voidBoss(e, def, dt);
      if (e.vShield > 0) this.voidTendrils(e, dt);
      if (def.mAttacks || def.rage || e.flameT > 0) this.mediumAttacks(e, def, dt);
      if (e.dist >= path.length && def.rewind) {
        // Rewind: only scratches the base, then goes back to the start.
        const dmg = def.damage;
        this.baseHp = Math.max(0, this.baseHp - dmg);
        this.events.push({ k: 'rewind', e: e.id, d: dmg, x: r2(e.x), z: r2(e.z) });
        if (this.baseHp <= 0) return this.end(false);
        e.dist = 0;
      }
      if (e.dist >= path.length && def.recede && (e.recedes || 0) < def.recede.n) {
        // Emperor Taunting Recession: warps back to the start instead of entering the base.
        e.recedes = (e.recedes || 0) + 1;
        e.dist = 0;
        this.events.push({ k: 'hcRecede', e: e.id, n: e.recedes, left: def.recede.n - e.recedes });
      }
      if (e.dist >= path.length) {
        this.enemies.delete(e.id);
        const dmg = def.leakHp ? Math.ceil(e.hp * def.leakHp) : def.damage; // Mr. Saw: double the health he has left
        this.baseHp = Math.max(0, this.baseHp - dmg);
        this.events.push({ k: 'leak', e: e.id, d: dmg });
        if (this.baseHp <= 0) return this.end(false);
        continue;
      }
      path.at(e.dist, e, e.route);
      e.x += -e.dz * e.lateral;
      e.z += e.dx * e.lateral;
    }

    this.spies = spyCircles(this.towers.values());
    this.buffs = computeBuffs(this.towers.values());
    this.carnivalTowers(dt); // Halloween Night 2: Spotlight boosts, bleeding towers
    // Golden Byte: zombies in its range that are stunned or slowed take more damage (see damage()).
    this.slowVulns = [];
    // Oil Derrick Cash Back: each player's bonus on cash from damage (see cashBack). Derricks that
    // are stunned or knocked out don't count, and `noStack` ones don't add up: the best one counts.
    this.cashBacks.clear();
    for (const o of this.towers.values()) {
      const back = TOWERS[o.type].levels[o.level].dmgCash;
      if (back && o.hp > 0 && !(o.stunT > 0) && !o.holo && !o.corrupt && !o.curseBy) {
        const had = this.cashBacks.get(o.owner) ?? 0;
        this.cashBacks.set(o.owner, TOWERS[o.type].noStack ? Math.max(had, back) : had + back);
      }
      const v = TOWERS[o.type].levels[o.level].slowVuln;
      if (v && o.hp > 0 && !(o.stunT > 0)) this.slowVulns.push({ x: o.x, z: o.z, r: TOWERS[o.type].levels[o.level].range * buffOf(this.buffs, o.id).range, v });
    }
    this.medicRepair(dt);
    this.updateHealZones(dt);
    for (const t of this.towers.values()) {
      t.dil = dils && !TOWERS[t.type].levels[t.level].dilate ? this.dilationAt(t.x, t.z, dils) : null;
      this.updateTower(t, dt);
    }
    // Unit crashes and the like are never bullets or lasers; unit guns say what they fire.
    this.hitKind = 'none';
    try {
      this.updateUnits(dt);
    } finally {
      this.hitKind = undefined;
    }
    this.updateShells(dt);
    this.updateFlights(dt);
    this.updateBlades(dt);
    if (this.attrition?.left > 0) this.attrition.left -= dt; // Businessman Attrition
    this.updateRings(dt);
    this.updateSweeps(dt);
    this.updateTraps(dt);
    this.updateSentries(dt);
    this.updateBurns(dt);
    this.updateAxes(dt);
    this.updatePuddles(dt);
    this.updateGoos(dt);
    this.updateZones(dt);
    this.updateBombs(dt);
    if (this.shiftBoss) this.timeShift(this.shiftBoss);
    this.updateMarks(dt);
    this.updateOrbs(dt);
    if (this.over) return;
    this.updateLasers(dt);
    if (this.riseBoss) this.voidRise(this.riseBoss);
    this.spawnReborn();

    if (!this.vs && w.state === 'wave' && !this.queue.length && !(this.finaleT > 0) && this.allClear()) {
      this.payWave();
      if (w.index >= this.waves.length - 1) return this.end(true);
      w.index++;
      w.state = 'intermission';
      w.countdown = GAME.intermission + (this.breakBonus || 0); // back from the Beholder's Field: time to rebuild
      this.breakBonus = 0;
    }
  }

  /**
   * Time Dilators that are working right now (not knocked out, stunned or recharging after a
   * stun): [{ x, z, r2, level, scale, spawn, cd }] or null.
   */
  timeBubbles(dt) {
    let out = null;
    for (const o of this.towers.values()) {
      const ds = TOWERS[o.type].levels[o.level].dilate;
      if (!ds) continue;
      if (o.stunT > 0) o.dilOff = ds.recharge; // the shield has to recharge after a stun
      else if (o.dilOff > 0) o.dilOff = Math.max(0, o.dilOff - dt);
      if (o.hp <= 0 || o.stunT > 0 || o.dilOff > 0) continue;
      (out ??= []).push({ x: o.x, z: o.z, r2: ds.radius * ds.radius, level: o.level, scale: o.choice?.[0] === 'slow' ? ds.slow : ds.fast, spawn: ds.spawn, cd: ds.cd });
    }
    return out;
  }

  /** The time bubble at (x, z): where bubbles overlap only the highest-level one counts. */
  dilationAt(x, z, dils) {
    let best = null;
    for (const d of dils) if ((x - d.x) ** 2 + (z - d.z) ** 2 <= d.r2 && (!best || d.level > best.level)) best = d;
    return best;
  }

  /** No enemies left except corpses (they don't have to be broken to finish a wave). */
  allClear() {
    for (const e of this.enemies.values()) if (!e.remains) return false;
    return true;
  }

  /** A new tower at level 0 (`spent`: what it cost, for selling). */
  newTower(pid, type, x, z, camYaw, spent) {
    const def = TOWERS[type];
    // The Gatling Gun's cone points away from the camera, the way the player is looking.
    const yaw = (Number(camYaw) || 0) + (facesCone(def) ? Math.PI : 0);
    const t = {
      id: this.nextId++, owner: pid, type, level: 0, x, z,
      yaw, targetMode: def.melee ? 3 : 0, // melee towers start on Closest
      cooldown: 0, gap: 0, burstLeft: 0, kills: 0, damageDealt: 0, spent,
      ang: 0, bombT: 0, missileT: 0, // Aviator
      lock: 0, charge: 0, beamT: 0, wait: 0, // Phaser
      out: 0, // Boomerang: boomerangs still in the air
      swings: 0, fanAcc: 0, // Assassin: slashes so far, damage toward the next Fan of Knives
      spawnT: 0, // spawners: seconds until the next unit
      cd: {}, active: 0, // ability cooldowns (key -> seconds) and Call to Arms time left
      fury: 0, // Classic Commander: seconds left fighting after an ability
      riotT: 0, // Warden riot shield: seconds of double damage and stun immunity left
      smoke: 0, stunT: 0, // Versus debuffs: seconds left smoked / stunned
      androidT: def.levels[0].android?.every ?? 0, // Anarchist: seconds until the next Android
      aimT: 0, // Hunter: seconds spent aiming at the current target
      revT: 0, // Minigunner: seconds of spin-up so far
      radioT: 0, // Ranger: seconds left of its Intelligence Radio range boost
      dir: 1, // Ace Pilot: 1 or -1, which way the plane circles
      shieldT: 0, // Medic shield: seconds until it's back after blocking a stun
      off: [], // Trapper traps / Mercenary Base units switched off in the tower panel (pickOptions keys)
      trapN: 0, spots: [], spotsR: 0, // Trapper: traps thrown so far, path spots in range (Necromancer too)
      meter: 0, buildT: 0, // Necromancer souls / Engineer scrap, seconds left raising a gravestone or building a sentry
      phase: 0, dealt: 0, // Accelerator: 0 charging, 1 firing (damage dealt so far), 2 cooling down
      cashN: 0, spinT: 0, // Cowboy: shots toward the next cash shot, seconds left twirling
      track: 0, pulses: 0, pulseT: 0, // DJ Booth: track playing (TRACKS index), Red beat pulses left
      ammo: def.levels[0].ammo ?? 0, reloadT: 0, // Pursuit / Gatling Gun: bullets left, seconds of reloading left
      hx: x, hz: z, hyaw: 0, cx: x, cz: z, // Pursuit: where the helicopter is, middle of its patrol zone
      face: yaw, manual: false, fire: false, aimYaw: yaw, aimPitch: 0, aimH: 4, aimAge: 0, // Gatling Gun: cone direction, FPS Mode
      holo: 0, holoMax: 0, // Hacker clone: seconds left, lifetime
      rebuilt: 0, repairT: 0, // XWM Turret: rebuilds used, seconds left rebuilding
      rocketT: 0, // Sentry Minigun: seconds until the next rocket
      chopT: 0, // John Slayer: seconds until the next axe attack
      parryT: 0, // Gladiator: seconds left recovering from a parry (it doesn't attack meanwhile)
      aspectT: 0, // Gladiator Fire Aspect: seconds until its next swing sets zombies on fire
      shockT: 0, // Sledger Aftershock: seconds until the shockwave after its last swing
      crates: [], // Airdrop Farm: crates still falling this wave ({ t: seconds until it lands, v: cash })
      choice: [], // Jester bombs / Biologist plants / Elementalist element, by slot (see choicesOf)
      fwT: 0, fw: null, // Firework Technician: seconds of boost left, its firework
      starT: 0, // Star Cannon: seconds left rebooting
      lx: x, lz: z, // Spotlight Tech: where the light is
      costRoll: Math.random(), // Chaos Jester: where in its price range the next upgrade lands
    };
    t.hp = t.maxHp = towerMaxHp(type, 0); // tower health (see GAME.towerHp)
    this.towers.set(t.id, t);
    return t;
  }

  // ---------------------------------------------------------------- player actions

  /** Applies an action from a player. Returns an error message, or null on success. */
  action(pid, m) {
    const p = this.players.get(pid);
    if (!p || this.over || !m) return null;
    switch (m.a) {
      case 'place': {
        const def = TOWERS[m.type];
        if (!def) return 'Unknown tower';
        if (p.loadout && !p.loadout.includes(m.type)) return `${def.name} isn't in your loadout`;
        const cost = towerCost(def, !!this.vs);
        if (p.cash < cost) return `Not enough cash! ${def.name} costs $${cost}`;
        let owned = 0;
        for (const t of this.towers.values()) if (t.owner === pid && !t.holo && rootType(t.type) === m.type) owned++;
        const limit = towerLimit(def, this.vs ? 1 : this.players.size) + (p.extraSlots || 0); // Discount Dog Extra Slot
        if (owned >= limit) return `Placement limit reached (${limit})`;
        const x = Number(m.x);
        const z = Number(m.z);
        if (!canPlace(x, z, this.towers.values(), def.placement)) {
          return placeFail(def);
        }
        p.cash -= cost;
        const t = this.newTower(pid, m.type, x, z, m.yaw, cost);
        this.events.push({ k: 'place', id: t.id, owner: pid, x, z });
        return null;
      }
      case 'upgrade': {
        const t = this.ownedTower(pid, m.id);
        if (typeof t === 'string') return t;
        if (t.holo) return "Holograms can't be upgraded";
        if (t.bleedT > 0) return "Bleeding! It can't be upgraded until it stops";
        if (t.corrupt) return 'Corrupted by VOID! It can only be sold now';
        // Upgrade paths: picking the bottom path turns the tower into its branch type; crosspath
        // towers turn into the type of their new Top / Bottom combo.
        const up = nextUpgrade(t, m.path === 'bottom' ? 'bottom' : 'top', this.towers.values(), computeBuffs(this.towers.values()));
        if (!up) return TOWERS[t.type].cross ? (TOWERS[t.type].cross.a + TOWERS[t.type].cross.b > 0 ? "That path can't go any higher" : 'Already max level!') : 'Already max level!';
        const def = TOWERS[up.type];
        const next = up.next;
        if (next.evo && p.evo && (p.evo[rootType(t.type)] ?? 0) < next.evo) return `Needs evolution level ${next.evo}`;
        if (next.perk && p.evo && !p.evo[`perk:${next.perk}`]) return `Locked: ${PERKS[next.perk] ?? 'win a mode'} to unlock this upgrade`;
        const cost = up.cost;
        if (p.cash < cost) return `Need $${cost} to upgrade`;
        p.cash -= cost;
        t.type = up.type;
        t.level++;
        this.setTowerLevelHp(t);
        t.spent += cost;
        t.costRoll = Math.random(); // Chaos Jester: a new random price for the next upgrade
        if (next.ammo) {
          t.ammo = next.ammo; // a fresh, bigger magazine
          t.reloadT = 0;
        }
        if (next.spawnNow) {
          // The upgraded unit rolls out right away and replaces the old ones.
          this.removeUnitsOf(t.id);
          this.spawnUnits(t, next.unit);
          t.spawnT = next.spawnEvery ?? def.spawnEvery;
        }
        this.events.push({ k: 'upgrade', id: t.id, owner: pid, name: next.name, x: t.x, z: t.z });
        return null;
      }
      case 'sell': {
        const t = this.ownedTower(pid, m.id);
        if (typeof t === 'string') return t;
        const value = Math.floor(t.spent * (TOWERS[t.type].sellRatio ?? GAME.sellRatio) * (1 + buffOf(this.buffs, t.id).sell) * (t.corrupt ? 1 + GAME.corruptSell : 1)); // EDJ sellback; VOID's corrupted towers sell for more
        p.cash += value;
        this.removeTower(t, 'sell', { value });
        this.sellSacrifice(t);
        return null;
      }
      case 'defuse': {
        // Beholder time bomb: anyone can click it to defuse it.
        const i = this.bombs.findIndex((b) => b.id === m.id);
        if (i < 0) return null;
        const [b] = this.bombs.splice(i, 1);
        this.events.push({ k: 'defused', id: b.id, x: r2(b.x), z: r2(b.z), by: pid });
        return null;
      }
      case 'pop': {
        // VOID's magic missile: a player touched it.
        const i = this.orbs.findIndex((o) => o.id === m.id);
        if (i < 0) return null;
        const [o] = this.orbs.splice(i, 1);
        this.events.push({ k: 'orbPop', id: o.id, x: r2(o.x), z: r2(o.z), by: pid });
        return null;
      }
      case 'target': {
        const t = this.ownedTower(pid, m.id);
        if (typeof t === 'string') return t;
        t.targetMode = (t.targetMode + 1) % TARGET_MODES.length;
        return null;
      }
      case 'pick': {
        // Trapper traps / Mercenary Base units: switch one on or off.
        const t = this.ownedTower(pid, m.id);
        if (typeof t === 'string') return t;
        const s = TOWERS[t.type].levels[t.level];
        const opts = pickOptions(s);
        const key = String(m.key);
        if (!opts?.some((o) => o.key === key)) return "That tower can't do that";
        const off = new Set(t.off);
        if (off.has(key)) off.delete(key);
        else if (opts.filter((o) => !off.has(o.key)).length <= 1) return 'At least one has to stay on';
        else off.add(key);
        t.off = [...off];
        // Queues training a unit that was just switched off move on to the next one, keeping their progress.
        for (const q of t.queues ?? []) {
          if (!off.has(String(q.r))) continue;
          const left = q.left;
          this.nextInQueue(t, s, q);
          q.left = Math.min(left, q.left);
        }
        return null;
      }
      case 'choose': {
        // Jester bombs / Biologist plant queues: pick what one slot uses.
        const t = this.ownedTower(pid, m.id);
        if (typeof t === 'string') return t;
        const def = TOWERS[t.type];
        const s = def.levels[t.level];
        const c = choiceOptions(def, s);
        const slot = Number(m.slot) | 0;
        const key = String(m.key);
        if (!c?.free || slot < 0 || slot >= c.slots || !c.options.some((o) => o.key === key)) return "That tower can't do that";
        const now = choicesOf(def, s, t.choice);
        const other = now.indexOf(key);
        if (c.distinct && other >= 0 && other !== slot) now[other] = now[slot]; // swap so two slots never match
        now[slot] = key;
        t.choice = now;
        return null;
      }
      case 'ability': {
        const t = this.ownedTower(pid, m.id);
        if (typeof t === 'string') return t;
        const s = TOWERS[t.type].levels[t.level];
        const ab = s.abilities?.find((a) => a.key === m.key);
        if (!ab) return "That tower can't do that";
        if (t.silenceT > 0) return 'Poisoned! Its abilities are locked until the poison fades';
        if (t.bleedT > 0) return 'Bleeding! It can\'t use abilities until it stops';
        if (t.curseBy && this.enemies.has(t.curseBy)) return 'Cursed! It can\'t do anything until the enemy that cursed it is gone';
        if (t.corrupt) return 'Corrupted by VOID! It only works for him now. Sell it!';
        if (t.cd[ab.key] > 0) return `${ab.name} is recharging (${Math.ceil(t.cd[ab.key])}s)`;
        const price = abilityCost(t, ab); // rising prices / limited uses (Magic Boost, Volt Points...)
        if (price == null) return `${ab.name} is all used up`;
        if (price && p.cash < price) return `Need $${price.toLocaleString()} for ${ab.name}`;
        if (ab.versus) {
          const why = this.vs ? this.vs.canAttack(this.lane) : `${ab.name} only works in Versus`;
          if (why) return why;
        }
        if (ab.aim && !(Number.isFinite(Number(m.x)) && Number.isFinite(Number(m.z)))) return 'Pick a spot first';
        if (ab.key === 'reposition' || ab.key === 'teleport' || ab.key === 'jump') {
          const x = Number(m.x);
          const z = Number(m.z);
          if (Math.hypot(x - t.x, z - t.z) > ab.reach) return `Too far! ${ab.name} reaches ${ab.reach} studs`;
          const others = [...this.towers.values()].filter((o) => o !== t);
          if (!canPlace(x, z, others, TOWERS[t.type].placement)) return "It can't land there";
        }
        if (ab.mode && choicesOf(TOWERS[t.type], s, t.choice)[0] !== ab.mode) return `${ab.name} only works in ${ab.mode === 'fire' ? 'Fire' : 'Frost'} mode`;
        if ((ab.key === 'thorns' || ab.key === 'iceTurret' || ab.key === 'iceShard' || ab.key === 'targetSelect' || ab.key === 'voltPoint') && Math.hypot(Number(m.x) - t.x, Number(m.z) - t.z) > (ab.reach ?? s.range)) return `Too far! ${ab.name} reaches ${ab.reach ?? s.range} studs`;
        if (ab.key === 'concussive' && Math.hypot(Number(m.x) - t.x, Number(m.z) - t.z) > ab.reach) return `Too far! ${ab.name} reach ${ab.reach} studs`;
        if (ab.key === 'crossbow' && Math.hypot(Number(m.x) - t.x, Number(m.z) - t.z) > ab.reach) return `Too far! ${ab.name} reaches ${ab.reach} studs`;
        if (ab.key === 'chargedThrow' && ![...this.enemies.values()].some((e) => canHit({ hidden: !!s.hidden, flying: true, lead: true }, e))) return 'No zombie to throw at';
        if (ab.key === 'raise' && !this.buildsOf(t.id, 'grave').length) return 'No gravestones to raise yet';
        if (ab.key === 'bounty' && !this.bountyTarget(t, s)) return 'No zombie in range to put a bounty on';
        if (ab.key === 'kritz' && !this.chargeTarget(t, s, ab)) return 'No tower in range to Kritz';
        if (ab.key === 'clone') {
          const why = this.cloneTower(p, ab, m);
          if (why) return why;
        }
        if (ab.key === 'crucifix' && !this.crucifixTarget(t, s)) return 'No zombie in range';
        if (ab.souls && (t.soulN || 0) < ab.souls) return `${ab.name} needs ${ab.souls} souls`;
        if (ab.key === 'soulBeam' && t.choice?.[0] !== 'beam' && !(t.soulN > 0)) return 'No souls to fire the beam with yet';
        if (ab.key === 'meteor' && !this.findTarget(t, s, t.x, t.z, s.range * buffOf(this.buffs, t.id).range)) return 'No zombie in range';
        if (price) p.cash -= price;
        if (ab.costs || ab.costStep || ab.maxUses) (t.uses ??= {})[ab.key] = (t.uses[ab.key] || 0) + 1;
        t.cd[ab.key] = ab.cooldown * (1 - buffOf(this.buffs, t.id).cdCut); // EDJ DJ Rave: shorter cooldowns
        this.useAbility(t, s, ab, m);
        this.events.push({ k: 'ability', id: t.id, owner: pid, name: ab.name, x: t.x, z: t.z });
        return null;
      }
      case 'aim': {
        // Gatling Gun FPS Mode: where the owner is aiming and whether they're holding fire.
        const t = this.towers.get(m.id);
        if (!t || t.owner !== pid || !TOWERS[t.type].fps || !t.manual) return null;
        const yaw = Number(m.yaw);
        if (Number.isFinite(yaw)) t.aimYaw = yaw;
        const pitch = Number(m.pitch);
        if (Number.isFinite(pitch)) t.aimPitch = Math.max(-0.8, Math.min(0.8, pitch));
        const h = Number(m.h);
        if (Number.isFinite(h)) t.aimH = Math.max(0, Math.min(12, h));
        t.fire = !!m.fire;
        t.aimAge = 0;
        const fx = Number(m.x);
        const fz = Number(m.z);
        if (TOWERS[t.type].heli && Number.isFinite(fx) && Number.isFinite(fz)) {
          // Combat Drone Direct Control: where the owner has flown it, kept on its own map.
          const oz = laneOz(laneOf(t.z));
          t.flyX = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, fx));
          t.flyZ = Math.max(BOUNDS.minZ + oz, Math.min(BOUNDS.maxZ + oz, fz));
        }
        return null;
      }
      case 'laser': {
        // Gold Commander Orbital Airstrike: the owner's client sends where its cursor points.
        const t = this.ownedTower(pid, m.id);
        if (typeof t === 'string' || !t.orb) return null;
        const x = Number(m.x);
        const z = Number(m.z);
        if (Number.isFinite(x) && Number.isFinite(z)) {
          t.orb.tx = x;
          t.orb.tz = z;
        }
        return null;
      }
      case 'follow': {
        // Cryo Helicopter Follow Player: the owner's client sends where they are.
        const t = this.ownedTower(pid, m.id);
        if (typeof t === 'string' || !TOWERS[t.type].levels[t.level].abilities?.some((a) => a.key === 'follow')) return null;
        const x = Number(m.x);
        const z = Number(m.z);
        if (Number.isFinite(x) && Number.isFinite(z)) {
          t.cx = x;
          t.cz = z;
        }
        return null;
      }
      case 'skip': {
        if (this.wave.state !== 'intermission' && !this.canSkipWave) return null;
        this.skipVotes.add(pid);
        this.wave.votes = this.skipVotes.size;
        this.checkSkip();
        return null;
      }
      case 'konami': // cheat code: infinite cash for the rest of this game
        p.cash = Infinity;
        this.events.push({ k: 'konami', owner: pid });
        return null;
      case 'speed':
        if (SPEEDS.includes(m.v)) this.speed = m.v;
        return null;
      default:
        return null;
    }
  }

  get votesNeeded() {
    return Math.max(1, Math.ceil(this.players.size / 2));
  }

  checkSkip() {
    if (!this.skipVotes.size || this.skipVotes.size < this.votesNeeded) return;
    if (this.wave.state === 'intermission') this.startWave();
    else if (this.canSkipWave) this.skipWave();
  }

  ownedTower(pid, id) {
    const t = this.towers.get(id);
    if (!t) return 'That tower is gone';
    if (t.owner !== pid) return "That's not your tower!";
    return t;
  }

  snapshot() {
    const w = this.wave;
    return {
      w: [w.state, w.index, Math.round(w.countdown * 10) / 10, w.left, w.votes, this.votesNeeded, this.canSkipWave ? 1 : 0],
      b: this.baseHp,
      m: this.mode,
      mk: this.map,
      sp: this.speed,
      o: this.over,
      // JSON can't hold Infinity (Konami code cash), so it travels as 'inf'.
      p: [...this.players.values()].map((p) => [p.id, p.name, p.cash === Infinity ? 'inf' : p.cash, p.color]),
      t: [...this.towers.values()].map((t) => [
        t.id, t.owner, t.type, t.level, r2(t.x), r2(t.z), r2(t.yaw), t.targetMode, t.kills, t.damageDealt, t.spent,
        r2(t.ang), t.lock, r2(t.charge), r2(t.active), cdSnap(t.cd), (t.smoke > 0 ? 1 : 0) | (t.stunT > 0 ? 2 : 0) | (t.shieldT > 0 ? 4 : 0) | (t.revT > 0 ? 8 : 0) | (this.stealthy(t) ? 16 : 0) | (t.slowT > 0 ? 32 : 0) | ((t.nerf ?? 1) < 1 ? 64 : 0) | (t.weakT > 0 ? 128 : 0) | (t.silenceT > 0 ? 256 : 0) | (t.bleedT > 0 || t.curseBy ? 512 : 0) | (t.corrupt ? 1024 : 0), t.dir, t.track,
        r2(t.radioT),
        // Pursuit / Gatling Gun extras: [ammo, reload left, helicopter dx, dz, heading, patrol zone dx, dz, FPS Mode, cone facing]
        // (positions relative to the tower, so Versus lanes don't have to shift them).
        TOWERS[t.type].levels[t.level].ammo || TOWERS[t.type].heli
          ? [t.ammo, r2(t.reloadT), r2(t.hx - t.x), r2(t.hz - t.z), r2(t.hyaw), r2(t.cx - t.x), r2(t.cz - t.z), t.manual ? 1 : 0, r2(t.face)]
          : 0,
        t.holo ? r2(t.holo) : 0, // Hacker clone: seconds left
        Math.ceil(t.hp), t.maxHp, // tower health
        TOWERS[t.type].rebuilds ? [t.rebuilt, r2(t.repairT)] : 0, // XWM Turret: rebuilds used, seconds left rebuilding
        TOWERS[t.type].levels[t.level].stealth || t.cloakT > 0 ? [r2(t.stealthLeft ?? 0), r2(t.exposedT || 0), r2(t.cloakT || 0)] : 0, // stealth left, revealed for, Ghost Grenade left
        TOWERS[t.type].facing ? r2(t.face) : 0, // Sentry: which way its cone faces
        t.off?.length ? t.off : 0, // Trapper traps / Mercenary Base units switched off
        t.choice?.length ? t.choice : 0, // Jester bombs / Biologist plants / Elementalist element
        TOWERS[t.type].levels[t.level].spot ? [r2(t.lx - t.x), r2(t.lz - t.z)] : 0, // Spotlight Tech: the light (relative)
        t.fwT > 0 ? r2(t.fwT) : 0, // Firework Technician boost left
        r2(t.starT || 0), // Star Cannon: rebooting
        // Shield Tower: [this tower's own shield, the shared pool it gives out], Combat Drone Shield, Revive Pack
        t.shieldHp > 0 || t.pool > 0 ? [Math.ceil(t.shieldHp || 0), Math.ceil(t.pool || 0)] : 0,
        t.invulnT > 0 ? r2(t.invulnT) : 0,
        t.reviveT > 0 ? r2(t.reviveT) : 0,
        // Wave 8: [Market bank, Directed Power left, Electricizer short-range mode, Radar Drone dx, dz]
        t.bank > 0 || t.dpT > 0 || t.near || t.rx != null ? [Math.floor(t.bank || 0), r2(t.dpT || 0), t.near ? 1 : 0, t.rx != null ? r2(t.rx - t.x) : null, t.rz != null ? r2(t.rz - t.z) : null] : 0,
        // Wave 9: [ability uses (paid abilities with rising prices), Chaos Jester price roll, Wizard Magic Boost, Mako charge 0-1]
        t.uses || t.magic || t.chargeT || TOWERS[t.type].levels.some((l) => l.costMax)
          ? [t.uses || 0, r2(t.costRoll ?? 0.5), t.magic || 0, TOWERS[t.type].levels[t.level].charge ? r2((t.chargeT || 0) / TOWERS[t.type].levels[t.level].charge.time) : 0] : 0,
      ]),
      // Traps, plus Necromancer gravestones and Engineer sentries: [..., level, facing, health left (0-1), stunned, thermite radius].
      tr: [...this.traps.values()].map((tr) => [tr.id, tr.tower, tr.kind, r2(tr.x), r2(tr.z), tr.land > 0 ? 0 : 1, tr.lvl ?? 0, r2(tr.yaw ?? 0), tr.maxHp ? r2(tr.hp / tr.maxHp) : 1, tr.stunT > 0 ? 1 : 0, tr.kind === 'thermite' || tr.kind === 'gas' || tr.kind === 'thorns' || tr.kind === 'goo' ? tr.radius : 0]),
      // Units: free ones (crows, bees, Volt Points) also send where they are, [x, z].
      u: [...this.units.values()].map((u) => [u.id, u.tower, u.model, Math.ceil(u.hp), u.maxHp, r2(u.dist), r2(u.lateral), u.alive, r2(u.speed), r2(u.yaw), u.def.free ? [r2(u.x), r2(u.z)] : 0, u.route || 0]),
      e: [...this.enemies.values()].map((e) => [e.id, e.type, e.hp, e.maxHp, r2(e.dist), r2(e.speed), r2(e.lateral), e.st, e.route || 0]),
      // Insane mode: the time dimension, and Beholder time bombs [id, x, z, seconds left].
      ...(this.timeWorld ? { tw: 1 } : {}),
      ...(this.bombs.length ? { tb: this.bombs.map((b) => [b.id, r2(b.x), r2(b.z), r2(b.left)]) } : {}),
      // Void mode: how dark the world is (VOID, VOID Spirit), his marks [id, tower, x, z, left] and magic missiles [id, x, z].
      ...(this.voidLevel ? { vw: this.voidLevel } : {}),
      ...(this.marks.length ? { vm: this.marks.map((k) => [k.id, k.tower, r2(k.x), r2(k.z), r2(k.left)]) } : {}),
      ...(this.orbs.length ? { vo: this.orbs.map((o) => [o.id, r2(o.x), r2(o.z)]) } : {}),
      // Void armor shields left: [enemy id, share of the shield left].
      ...(this.voidArmor ? { va: [...this.enemies.values()].filter((e) => e.vShield > 0).map((e) => [e.id, r2(e.vShield / e.vShieldMax)]) } : {}),
      // Hardcore shields left: [enemy id, share of the shield left], and enemies that can't be targeted.
      ...([...this.enemies.values()].some((e) => e.osh > 0 || e.noTarget) ? { os: [...this.enemies.values()].filter((e) => e.osh > 0 || e.noTarget).map((e) => [e.id, e.osh > 0 ? r2(e.osh / e.oshMax) : 0, e.noTarget ? 1 : 0]) } : {}),
      // Gold Commander Orbital Airstrike beams: [tower, x, z, seconds left, radius].
      ...([...this.towers.values()].some((t) => t.orb) ? { ob: [...this.towers.values()].filter((t) => t.orb).map((t) => [t.id, r2(t.orb.x), r2(t.orb.z), r2(t.orb.left), t.orb.radius]) } : {}),
    };
  }
}

// Sim's methods are kept in several files (see the list at the top). This puts them all on Sim,
// just as if they were written inside the class.
for (const part of [SimEnemyMoves1, SimEnemyMoves2, SimTowerHealth, SimWaves, SimTowerUpdate, SimWeapons1, SimWeapons2, SimWeapons3, SimUnits, SimAbilities, SimDamage, SimWeapons4, SimCarnival, SimNightmare]) {
  const props = Object.getOwnPropertyDescriptors(part.prototype);
  delete props.constructor;
  Object.defineProperties(Sim.prototype, props);
}
