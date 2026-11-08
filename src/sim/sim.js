// Authoritative game simulation. Pure logic: no three.js, no DOM.
// Runs in the browser for solo play and on the server (one per room) for multiplayer.
import { DIFFICULTIES, ENEMIES, GAME, PLAYER_COLORS, TARGET_MODES, TOWERS, VERSUS, canHit, difficulty, detection, nextTrack, cloneCost, rootType, towerCost, trackBoost, unitDetection, waveGroups } from '../config.js';
import { angleDiff, lerpAngle } from '../utils.js';
import { canPlace, heightAt } from './map.js';
import { PATH_WIDTH, path } from './path.js';

const MAX_STEP = 0.05;
const r2 = (n) => Math.round(n * 100) / 100;
const TAU = Math.PI * 2;
const BOMB_FALL = 0.55; // seconds from drop to impact
const MISSILE_TIME = 0.45; // seconds from launch to impact
const STRIKE_TIME = 1.1; // seconds from calling an Airstrike to the bomb landing
const CONTACT = 2.2; // path distance at which a unit and a zombie touch
const NO_BUFF = Object.freeze({ range: 1, rate: 1, discount: 0, cta: false, dmg: 1, shield: 0, uber: false, recharge: 0 });
const PELLET_WIDTH = 0.9; // how close a shotgun pellet's line must pass to a zombie to hit it
const TRAP_HIT = 1.6; // how close a zombie must walk to a trap to set it off
const TRAP_FLIGHT = 0.6; // seconds a thrown trap flies before it lands
const PULSE_WIDTH = 1.2; // how thick a Pulse Trooper's ring is (zombies this close to its edge get hit)
const SWEEP_WIDTH = 1.5; // how thick a Sweeper laser is
const FPS_WIDTH = 1.0; // how close a Gatling FPS bullet's line must pass to a zombie to hit it (times its size)
export const FPS_BACK = 3.2; // the FPS camera (where bullets start) sits this far behind the gun
export const FLY_HEIGHT = 5; // how high Flyers soar above the path (the views draw them there too)
const FPS_REACH = 400; // FPS bullets fly across the whole map
const AIM_TIMEOUT = 3; // FPS Mode switches off after this long without aim updates (player left)
const SEE_ALL = Object.freeze({ hidden: true, flying: true, lead: true }); // airstrikes
const GROUND_BLAST = Object.freeze({ hidden: true, flying: false, lead: true }); // landmines
const WRECK_BLAST = Object.freeze({ hidden: false, flying: false, lead: true }); // exploding vehicles

// Enemy status bits, sent to clients so they can show ice, stun stars and fire.
export const ST_FROZEN = 1;
export const ST_STUNNED = 2;
export const ST_BURNING = 4;
export const ST_DANCE = 8;
export const ST_SLIMED = 16;
export const ST_CHILLED = 32;
export const ST_HACKED = 64; // hit by a Hacker: slowed, Wire Fraud, comes back as a hologram

const BUILD_SPOTS = 24; // random spots an Engineer tries when looking for room for a sentry
const RANG_HIT = 1.8; // how close a boomerang or knife must pass to hit a zombie

/** Extra firerate a level's Call to Arms gives while it is active. */
const ctaBoost = (s) => s.abilities?.find((a) => a.key === 'cta')?.boost ?? 0;

/**
 * Which towers each Medic shields: Map towerId -> the Medic tower shielding it. Each Medic picks
 * the most valuable towers (by money spent) inside its aura that no other Medic has taken yet.
 * Medics never shield other support towers or income towers. Shared with the client (medi beams).
 */
const shieldable = (t) => {
  const kind = TOWERS[t.type].kind;
  return !kind || kind === 'spawner';
};
export function medicShields(towers) {
  const list = [...towers];
  const out = new Map();
  const medics = list.filter((o) => TOWERS[o.type].levels[o.level].shields).sort((a, b) => a.id - b.id);
  for (const m of medics) {
    const s = TOWERS[m.type].levels[m.level];
    const r2max = s.aura * s.aura;
    const picks = list
      .filter((t) => !out.has(t.id) && shieldable(t) && (t.x - m.x) ** 2 + (t.z - m.z) ** 2 <= r2max)
      .sort((a, b) => b.spent - a.spent || a.id - b.id)
      .slice(0, s.shields);
    for (const t of picks) out.set(t.id, m);
  }
  return out;
}

/**
 * Boosts every tower gets from Commanders, DJs, DJ Booths and Medics nearby (any owner's).
 * Returns Map id -> { range, rate, discount, cta, dmg, shield, uber, recharge }. Towers never
 * boost their own type, and boosts of one type don't stack: the strongest Commander and the
 * strongest DJ count. A Medic shield adds its own firerate on top (and Ubercharge damage).
 * DJ Booth tracks: the range and damage of the strongest booth multiply on top; its discount
 * counts like a DJ's (the biggest discount wins).
 * Shared by the sim and the client (the client shows boosted range and discounted prices).
 */
export function computeBuffs(towers) {
  const list = [...towers];
  const out = new Map();
  const sources = list.filter((o) => { const s = TOWERS[o.type].levels[o.level]; return s.aura || (s.radio && o.radioT > 0); });
  if (!sources.length) return out;
  const shields = medicShields(list);
  const family = (o) => TOWERS[o.type].altOf ?? rootType(o.type); // a tower, its alternate forms and upgrade paths
  for (const t of list) {
    let range = 0;
    let rate = 0;
    let cta = 0;
    let music = 0;
    let discount = 0;
    let boothRange = 0;
    let boothDmg = 0;
    let merc = 0;
    let radio = 0;
    for (const o of sources) {
      if (family(o) === family(t)) continue;
      const s = TOWERS[o.type].levels[o.level];
      const d2 = (t.x - o.x) ** 2 + (t.z - o.z) ** 2;
      // Ranger Intelligence Radio: a range boost for a while after each wave starts.
      if (s.radio && o.radioT > 0 && d2 <= s.radio.radius ** 2) radio = Math.max(radio, s.radio.boost);
      if (!s.aura || s.shields) continue; // Medics boost through their shields (below), not their aura
      if (d2 > s.aura * s.aura) continue;
      range = Math.max(range, s.rangeBoost || 0);
      rate = Math.max(rate, s.rateBoost || 0);
      if (o.active > 0) cta = Math.max(cta, ctaBoost(s));
      music = Math.max(music, s.musicBoost || 0);
      discount = Math.max(discount, s.discount || 0);
      merc = Math.max(merc, s.dmgBoost || 0);
      if (s.tracks) {
        boothRange = Math.max(boothRange, trackBoost(s, o.track, 'range'));
        boothDmg = Math.max(boothDmg, trackBoost(s, o.track, 'dmg'));
        discount = Math.max(discount, trackBoost(s, o.track, 'discount'));
      }
    }
    const m = shields.get(t.id);
    const ms = m ? TOWERS[m.type].levels[m.level] : null;
    const uber = !!(ms && m.active > 0);
    const uberBoost = uber ? (ms.abilities?.find((a) => a.key === 'uber')?.boost ?? 0) : 0;
    if (range || rate || cta || music || discount || boothRange || boothDmg || merc || radio || m) {
      out.set(t.id, {
        range: (1 + range) * (1 + boothRange) * (1 + radio),
        rate: (1 + rate + cta) * (1 + music) * (1 + (ms?.shieldRate ?? 0)),
        discount,
        cta: cta > 0,
        dmg: (1 + uberBoost) * (1 + boothDmg) * (1 + merc),
        shield: m ? m.id : 0,
        uber,
        recharge: ms?.recharge ?? 0,
      });
    }
  }
  return out;
}

/** Boosts for tower `id` from a computeBuffs() map (never undefined). */
export const buffOf = (buffs, id) => buffs.get(id) ?? NO_BUFF;

/** What upgrading to level `next` costs, after any DJ discount. */
export const upgradeCost = (next, buff) => Math.round(next.cost * (1 - (buff?.discount || 0)));

/** Lv 3+ Aviators share hidden detection with every tower inside their flight ring. */
export function spyCircles(towers) {
  const out = [];
  for (const o of towers) {
    const def = TOWERS[o.type];
    if (def.levels[o.level].spy) out.push({ x: o.x, z: o.z, r2: def.orbit * def.orbit });
  }
  return out;
}

/** Does tower `t` borrow hidden detection from one of the `circles` (and not have its own)? */
export function borrowsHidden(t, circles) {
  return !TOWERS[t.type].levels[t.level].hidden && circles.some((c) => (t.x - c.x) ** 2 + (t.z - c.z) ** 2 <= c.r2);
}

/** Where an Aviator's plane is (flight ring around the tower at angle t.ang). */
export function planePos(t, out = {}) {
  const R = TOWERS[t.type].orbit;
  out.x = t.x + Math.cos(t.ang) * R;
  out.z = t.z + Math.sin(t.ang) * R;
  return out;
}

/** Ability cooldowns for snapshots (rounded, empty for most towers). */
function cdSnap(cd) {
  const out = {};
  for (const k in cd) out[k] = Math.round(cd[k] * 10) / 10;
  return out;
}

/** Boomerang loop: an oval from the thrower out to (tx, tz) and back, `d` long and 0.7 * d wide. */
const RANG_WIDTH = 0.35; // half-width of the oval, as a fraction of its length
function rangTime(d, speed) {
  const a = d / 2;
  const b = d * RANG_WIDTH;
  const perim = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))); // Ramanujan
  return perim / speed;
}

/**
 * Where a blade is at fraction `f` (0..1) of its flight. Loops (boomerangs) go out along one
 * side of the oval and come back along the other; straight blades (knives) fly in a line.
 * Shared with the client so the boomerang drawn on screen follows the same path.
 */
export function bladePos(b, f, out) {
  const dx = b.tx - b.ox;
  const dz = b.tz - b.oz;
  if (!b.loop) {
    out.x = b.ox + dx * f;
    out.z = b.oz + dz * f;
    return out;
  }
  const th = f * TAU;
  const u = (1 - Math.cos(th)) / 2; // 0 at the thrower, 1 at the far end
  const w = Math.sin(th) * RANG_WIDTH * (b.side ?? 1);
  out.x = b.ox + dx * u - dz * w;
  out.z = b.oz + dz * u + dx * w;
  return out;
}

export class Sim {
  /**
   * @param {{id: string, name: string, color?: number, loadout?: string[]}[]} players  (no loadout = any tower)
   * @param {{vs?: object, lane?: number, idBase?: number}} opts  Versus: the VersusSim running this map,
   *   which lane it is, and where its ids start (so ids are unique across every lane).
   */
  constructor(players, opts = {}) {
    this.vs = opts.vs ?? null;
    // Difficulty: which scripted waves this game plays (Versus always plays the zombie waves).
    this.mode = this.vs ? 'zombies' : DIFFICULTIES[opts.mode] ? opts.mode : 'easy';
    this.waves = difficulty(this.mode).waves;
    this.cashMult = this.vs ? 1 : difficulty(this.mode).cash; // harder modes pay more in-game cash
    this.lane = opts.lane ?? 0;
    this.players = new Map();
    players.forEach((p, i) =>
      this.players.set(p.id, { id: p.id, name: p.name, color: p.color ?? PLAYER_COLORS[i % PLAYER_COLORS.length], cash: Math.round(GAME.startCash * this.cashMult), loadout: p.loadout ?? null }),
    );
    this.startingPlayers = Math.max(1, players.length);
    this.towers = new Map();
    this.enemies = new Map();
    this.nextId = opts.idBase ?? 1;
    this.baseHp = GAME.baseHp;
    this.speed = 1;
    this.over = 0; // 0 = playing, 1 = victory, -1 = defeat
    this.wave = { state: 'intermission', index: 0, countdown: GAME.firstIntermission, t: 0, left: 0, votes: 0, total: this.waves.length };
    this.queue = [];
    this.shells = []; // bombs and missiles in flight
    this.blades = []; // boomerangs and thrown knives in flight (they pierce, so they're tracked over time)
    this.rings = []; // Pulse Trooper pulses growing out from their tower
    this.sweeps = []; // Sweeper lasers spinning around their tower
    this.spies = []; // Aviator hidden-detection rings, refreshed every tick
    this.buffs = new Map(); // Commander / DJ boosts, refreshed every tick
    this.units = new Map(); // Jeeps, Tanks, Soldier squads... driving from the castle toward the entrance
    this.traps = new Map(); // Trapper spikes, landmines and bear traps lying on the path
    this.skipVotes = new Set();
    this.holos = []; // hacked zombies that died this tick, to come back as holograms
    this.fraudAcc = 0; // Wire Fraud cash not paid out yet (it pays whole dollars)
    this.axes = []; // Molten Warlord axes in flight
    this.reborn = []; // enemies to spawn at the end of the tick (cage monsters, boss phase 2, summons)
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
        while (this.queue.length && this.queue[0].t <= w.t) this.spawn(this.queue.shift().type);
        w.left = this.queue.length;
      }
    } else if (w.state === 'intermission') {
      w.countdown -= dt;
      if (w.countdown <= 0) this.startWave();
    } else if (w.state === 'wave') {
      w.t += dt;
      while (this.queue.length && this.queue[0].t <= w.t) this.spawn(this.queue.shift().type);
      w.left = this.queue.length;
    }

    for (const e of this.enemies.values()) {
      // Status effects: frozen/stunned zombies stand still, burning ones are slowed.
      e.stop = Math.max(0, e.stop - dt);
      if (!e.stop) e.stopKind = 0;
      e.burn = Math.max(0, e.burn - dt);
      e.slimeT = Math.max(0, e.slimeT - dt);
      if (!e.slimeT) e.slime = 0;
      e.chillT = Math.max(0, e.chillT - dt);
      if (!e.chillT) e.chill = 0;
      e.beatT = Math.max(0, e.beatT - dt);
      if (!e.beatT) e.beatSlow = 0;
      e.vulnT = Math.max(0, e.vulnT - dt);
      if (!e.vulnT) e.vuln = 0;
      if (e.revealT) e.revealT = Math.max(0, e.revealT - dt); // Flare Gun
      // Slows from fire, slime, chill and Drop the Beat all stack (multiplicatively).
      const slow = (1 - (e.burn ? e.burnSlow : 0)) * (1 - e.slime) * (1 - e.chill * e.chillMax) * (1 - e.beatSlow) * (1 - e.hackSlow);
      e.speed = e.stop ? 0 : e.baseSpeed * slow;
      e.st = (e.stopKind === 'ice' ? ST_FROZEN : e.stopKind === 'stun' ? ST_STUNNED : e.stopKind === 'dance' ? ST_DANCE : 0) | (e.burn ? ST_BURNING : 0)
        | (e.slime ? ST_SLIMED : 0) | (e.chill ? ST_CHILLED : 0) | (e.hackEv || e.fraud ? ST_HACKED : 0);
      e.dist += e.speed * dt;
      // Spider Queen: lays spiders behind her (not while frozen or stunned).
      const sm = ENEMIES[e.type].summon;
      if (sm && !e.stop && (e.summonT -= dt) <= 0) {
        e.summonT = sm.every;
        for (let i = 0; i < sm.n; i++) this.reborn.push({ type: sm.type, dist: Math.max(0, e.dist - 1.5 - i), hpScale: 1 });
        this.events.push({ k: 'summon', e: e.id });
      }
      // Corpses crumble away after a while.
      if (e.remains && (e.life -= dt) <= 0) {
        this.enemies.delete(e.id);
        this.events.push({ k: 'decay', e: e.id });
        continue;
      }
      const def = ENEMIES[e.type];
      if ((def.slam || def.axe) && !e.stop) this.bossAttacks(e, def, dt);
      if (e.dist >= path.length) {
        this.enemies.delete(e.id);
        const dmg = ENEMIES[e.type].damage;
        this.baseHp = Math.max(0, this.baseHp - dmg);
        this.events.push({ k: 'leak', e: e.id, d: dmg });
        if (this.baseHp <= 0) return this.end(false);
        continue;
      }
      path.at(e.dist, e);
      e.x += -e.dz * e.lateral;
      e.z += e.dx * e.lateral;
    }

    this.spies = spyCircles(this.towers.values());
    this.buffs = computeBuffs(this.towers.values());
    for (const t of this.towers.values()) this.updateTower(t, dt);
    this.updateUnits(dt);
    this.updateShells(dt);
    this.updateBlades(dt);
    this.updateRings(dt);
    this.updateSweeps(dt);
    this.updateTraps(dt);
    this.updateSentries(dt);
    this.updateBurns(dt);
    this.updateAxes(dt);
    this.spawnReborn();

    if (!this.vs && w.state === 'wave' && !this.queue.length && this.allClear()) {
      this.payWave();
      if (w.index >= this.waves.length - 1) return this.end(true);
      w.index++;
      w.state = 'intermission';
      w.countdown = GAME.intermission;
    }
  }

  /** No enemies left except corpses (they don't have to be broken to finish a wave). */
  allClear() {
    for (const e of this.enemies.values()) if (!e.remains) return false;
    return true;
  }

  /** Molten Warlord: slams stun nearby towers, and thrown axes stun towers far away. */
  bossAttacks(e, def, dt) {
    const sl = def.slam;
    if (sl && (e.slamT -= dt) <= 0) {
      if (this.towerNear(e.x, e.z, sl.range)) {
        e.slamT = sl.every;
        const n = this.hexTowers(e.x, e.z, sl.range, 'stun', sl.stun);
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
        if (d2 > ax.range * ax.range) continue;
        all.push(t);
        if (d2 > near) far.push(t);
      }
      const list = far.length ? far : all;
      if (!list.length) {
        e.axeT = 1;
        return;
      }
      const t = list[Math.floor(Math.random() * list.length)];
      e.axeT = ax.every;
      this.axes.push({ x: t.x, z: t.z, left: ax.flight, r: ax.radius, stun: ax.stun });
      this.events.push({ k: 'axe', e: e.id, fx: r2(e.x), fz: r2(e.z), x: r2(t.x), z: r2(t.z), d: ax.flight });
    }
  }

  towerNear(x, z, r) {
    for (const t of this.towers.values()) if ((t.x - x) ** 2 + (t.z - z) ** 2 <= r * r) return true;
    return false;
  }

  /** Thrown axes land and stun the towers around them. */
  updateAxes(dt) {
    if (!this.axes.length) return;
    this.axes = this.axes.filter((a) => {
      if ((a.left -= dt) > 0) return true;
      const n = this.hexTowers(a.x, a.z, a.r, 'stun', a.stun);
      this.events.push({ k: 'axeHit', x: r2(a.x), z: r2(a.z), r: a.r, n });
      return false;
    });
  }

  /** Wave bonus to every player, plus tower income, for clearing (or skipping) the current wave. */
  payWave(skip = false) {
    const w = this.wave;
    const bonus = Math.round(GAME.waveBonus(w.index + 1) * this.cashMult);
    for (const p of this.players.values()) p.cash += bonus;
    this.events.push({ k: 'waveClear', i: w.index, bonus, ...(skip ? { skip: 1 } : {}) });
    this.payIncome();
  }

  /**
   * Can players vote to skip ahead to the next wave right now? Once every zombie in the wave has
   * spawned, even if some are still walking the path.
   */
  get canSkipWave() {
    const w = this.wave;
    return !this.vs && w.state === 'wave' && !this.queue.length && w.index < this.waves.length - 1;
  }

  /**
   * Skips ahead: pays this wave's bonus now and starts the next wave at once. Zombies already
   * out stay, and ones still waiting to spawn come along with the new wave.
   */
  skipWave() {
    const w = this.wave;
    this.payWave(true);
    const left = this.queue.map((q) => ({ t: Math.max(0, q.t - w.t), type: q.type }));
    this.startWave(w.index + 1);
    this.queue.push(...left);
    this.queue.sort((a, b) => a.t - b.t);
    w.left = this.queue.length;
  }

  /** Starts wave `index`. In Versus, earlier waves may still be spawning, so it adds to the queue. */
  startWave(index = this.wave.index) {
    const w = this.wave;
    if (!this.vs) {
      this.queue = [];
      w.t = 0;
    }
    w.index = index;
    for (const [type, count, interval, delay] of waveGroups(index, this.waves)) {
      for (let i = 0; i < count; i++) this.queue.push({ t: w.t + delay + i * interval, type });
    }
    this.queue.sort((a, b) => a.t - b.t);
    w.state = 'wave';
    w.left = this.queue.length;
    this.healBase();
    this.startRadios();
    this.skipVotes.clear();
    w.votes = 0;
    this.events.push({ k: 'waveStart', i: w.index });
  }

  /** Versus: zombies another player sent here, `n` of them `gap` seconds apart. */
  queueSent(type, n, gap) {
    for (let i = 0; i < n; i++) this.queue.push({ t: this.wave.t + 0.3 + i * gap, type });
    this.queue.sort((a, b) => a.t - b.t);
    this.wave.left = this.queue.length;
  }

  /**
   * Spawns an enemy at the entrance, or (`at`) partway down the path: { dist, lateral?, hpScale? }.
   * Returns it.
   */
  spawn(type, at = null) {
    const def = ENEMIES[type];
    const extra = this.startingPlayers - 1;
    const hpMult = this.vs ? VERSUS.hpMult(this.wave.index) : (1 + this.wave.index * GAME.hpScalePerWave) * (1 + GAME.mpHpScale * extra);
    const maxHp = Math.max(1, Math.round(def.hp * hpMult * (at?.hpScale ?? 1)));
    const e = {
      id: this.nextId++,
      type,
      hp: maxHp,
      maxHp,
      dist: at?.dist ?? 0,
      speed: 0,
      baseSpeed: def.speed * (0.94 + Math.random() * 0.12),
      lateral: def.boss ? 0 : at?.lateral ?? (Math.random() - 0.5) * 2.4,
      fireImmune: !!(def.fireImmune || def.statusImmune), // fire can't burn it (flamethrowers do nothing)
      statusImmune: !!def.statusImmune, // no burning, freezing, stuns, slime, chill or dancing
      summonT: def.summon ? def.summon.every * 0.5 : 0, // seconds until the next summon
      hidden: !!def.hidden,
      flying: !!def.flying, // ground units and traps can't touch it
      lead: !!def.lead, // only towers with lead detection hurt it
      boss: !!def.boss,
      armor: def.armor ?? 0, // takes this fraction less damage
      remains: !!def.remains, // a corpse: never moves, crumbles after `life` seconds
      life: def.decay ?? 0,
      slamT: def.slam ? 3 : 0, // Molten Warlord: seconds until the next slam / axe throw
      axeT: def.axe ? def.axe.every * 0.5 : 0,
      stop: 0, // seconds left frozen or stunned
      stopKind: 0, // 'ice' | 'stun' | 0
      burn: 0, // seconds left on fire
      burnDps: 0,
      burnSlow: 0,
      burnAcc: 0, // fractional burn damage not applied yet
      burnBy: 0, // tower id that gets credit for burn damage
      slime: 0, // Slime Trooper slow (fraction of speed lost)
      slimeT: 0, // seconds left slimed
      chill: 0, // Freezer chill, 0..1 (full chill freezes from Lv 3)
      chillT: 0, // seconds until the chill wears off
      chillMax: 0, // slow at full chill
      chillDps: 0,
      chillBy: 0, // tower id that gets credit for chill damage
      chillAcc: 0,
      beatSlow: 0, // DJ Booth Purple Drop the Beat slow (fraction of speed lost)
      beatT: 0,
      vuln: 0, // DJ Booth Red Drop the Beat: takes this much extra damage from everything
      vulnT: 0,
      hackSlow: 0, // Hacker slowness (fraction of speed lost, for good)
      fraud: 0, // Hacker Wire Fraud: extra share of the kill reward
      hackEv: 0, // Hacker: comes back as a hologram with maxHp^hackEv health (0 = no)
      hackBy: 0, // the Hacker tower its hologram fights for
      st: 0, // ST_* bits
    };
    e.speed = e.baseSpeed;
    path.at(e.dist, e);
    e.x += -e.dz * e.lateral;
    e.z += e.dx * e.lateral;
    this.enemies.set(e.id, e);
    return e;
  }

  /** Spawns what died-and-came-back or was summoned this tick (after every tower has fired). */
  spawnReborn() {
    if (this.holos.length) this.spawnHolograms();
    if (!this.reborn.length) return;
    const list = this.reborn;
    this.reborn = [];
    for (const r of list) {
      const e = this.spawn(r.type, r);
      if (r.from) this.events.push({ k: 'reborn', e: e.id, from: r.from, type: r.type });
    }
  }

  end(win) {
    this.over = win ? 1 : -1;
    this.wave.state = win ? 'victory' : 'defeat';
    this.events.push({ k: 'end', win });
  }

  // ---------------------------------------------------------------- towers

  /** Medics heal the base at the start of every wave (never above its starting health). */
  healBase() {
    for (const t of this.towers.values()) {
      const heal = TOWERS[t.type].levels[t.level].heal;
      if (!heal || this.baseHp >= GAME.baseHp) continue;
      const v = Math.min(heal, GAME.baseHp - this.baseHp);
      this.baseHp += v;
      this.events.push({ k: 'heal', id: t.id, v, x: t.x, z: t.z });
    }
  }

  /** Rangers with Intelligence Radio boost the range of nearby towers for a while every wave. */
  startRadios() {
    for (const t of this.towers.values()) {
      const radio = TOWERS[t.type].levels[t.level].radio;
      if (radio) t.radioT = radio.time;
    }
  }

  /** Towers with an `income` stat (e.g. Stonk Tweeters) pay their owner after each wave. */
  payIncome() {
    for (const t of this.towers.values()) {
      const income = !t.holo && TOWERS[t.type].levels[t.level].income;
      const owner = this.players.get(t.owner);
      if (!income || !owner) continue;
      owner.cash += income;
      this.events.push({ k: 'income', id: t.id, owner: t.owner, v: income, x: t.x, z: t.z });
    }
  }

  /** Every tower of `type` as a range circle; used by `shared` towers (ChitChat). */
  rangeCircles(type) {
    const circles = [];
    for (const o of this.towers.values()) {
      if (o.type !== type) continue;
      const r = TOWERS[type].levels[o.level].range;
      circles.push({ x: o.x, z: o.z, r2: r * r });
    }
    return circles;
  }

  /** What tower `t` can hit right now: { hidden, flying, lead } (Aviator spy rings lend hidden). */
  detects(t, s) {
    const d = detection(t.type, t.level);
    if (!d.hidden && this.spies.some((c) => (t.x - c.x) ** 2 + (t.z - c.z) ** 2 <= c.r2)) d.hidden = true;
    return d;
  }

  updateTower(t, dt) {
    // Hacker clones fade away when their time is up.
    if (t.holo && (t.holo -= dt) <= 0) return this.removeTower(t, 'holoEnd');
    const def = TOWERS[t.type];
    let s = def.levels[t.level];
    const b = buffOf(this.buffs, t.id);
    t.active = Math.max(0, t.active - dt);
    t.fury = Math.max(0, t.fury - dt);
    t.riotT = Math.max(0, t.riotT - dt);
    t.radioT = Math.max(0, t.radioT - dt);
    for (const k in t.cd) t.cd[k] = Math.max(0, t.cd[k] - dt);
    // Versus debuffs from an opponent's Anarchist: smoke halves range, fireworks stun.
    t.smoke = Math.max(0, t.smoke - dt);
    t.stunT = Math.max(0, t.stunT - dt);
    t.shieldT = Math.max(0, t.shieldT - dt); // Medic shield recharging after blocking a stun
    if (t.stunT > 0) return;
    if (s.android && this.vs) this.updateAnarchy(t, s, dt);
    if (def.kind === 'spawner') return this.updateSpawner(t, def, s, dt);
    if (s.goons && this.updateGoons(t, def, s, dt)) return;
    if (def.kind === 'income') return;
    if (s.tracks) return this.updateBooth(t, s, dt);
    // Commanders only shoot during Call to Arms (Classic Commanders: for `fury` s after any ability).
    if (def.kind === 'support' && !(s.damage && (t.active > 0 || t.fury > 0))) return;
    // Cowboy: twirling its revolver after a cash shot (its cooldown waits too).
    if (t.spinT > 0) {
      t.spinT = Math.max(0, t.spinT - dt * b.rate);
      return;
    }
    const rangeMult = b.range * (t.smoke > 0 ? VERSUS.smokeRange : 1);
    if (rangeMult !== 1) s = { ...s, range: s.range * rangeMult };
    // Cooldowns may dip just below zero so leftover time carries into the next shot;
    // that keeps very fast fire rates accurate at any tick length. Firerate boosts speed them up.
    t.cooldown = Math.max(-dt, t.cooldown - dt * b.rate);
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
    if (def.orbit) return this.updateAviator(t, def, s, dt);
    if (def.heli) return this.updatePursuit(t, def, s, dt, loaded);
    if (def.fps && t.manual) return this.updateFps(t, def, s, dt, loaded);
    if (s.maxDamage != null) return this.updateBeam(t, def, s, dt);
    if (s.overcharge != null) return this.updateAccel(t, s, dt);
    if (s.synapses) return this.updateHacker(t, s);
    // Necromancer / Engineer: busy raising a gravestone or building a sentry.
    if ((s.souls || s.scrap) && this.updateBuilder(t, s, dt)) return;
    if (s.burn != null) return this.updateFlame(t, def, s, dt);
    if (def.traps) return this.updateTrapper(t, def, s);
    if (s.fan && t.fanAcc >= s.fan.every) this.throwKnives(t, s);

    // Boomerangs can't be thrown again until every one of them is back.
    if (s.pierce && t.out > 0) return;

    // Freezers don't waste shots on zombies that are already frozen.
    const skip = s.freeze || s.chill ? (e) => e.stopKind === 'ice'
      : def.minRange ? this.deadzone(t, def.minRange)
      : def.fps ? this.outsideCone(t, s.cone) // Gatling Gun: only zombies inside its cone
      : null;
    const target = this.findTarget(t, s, t.x, t.z, s.range, skip);
    if (!target) {
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
      t.burstLeft = s.burst || 1;
      t.cooldown += s.cooldown;
    }
    t.burstLeft--;
    t.gap = s.burstGap ?? def.burstGap ?? 0;
    if (s.bolt) return this.bolt(t, s, target, want);
    if (s.scrap) t.meter++; // Engineer: every shot collects scrap
    if (s.pierce) return this.throwRangs(t, s, target);
    if (s.whirl && ++t.swings % s.whirl.every === 0) return this.whirl(t, s);
    if (s.pellets) return this.pump(t, s, want);
    if (s.chains) return this.chain(t, def, s, target);
    if (s.radius) return this.fireSplash(t, def, s, target);
    if (s.targets) {
      for (const e of this.findTargets(t, s, s.targets)) this.shoot(t, e, s.damage);
      return;
    }
    // Warden: every `crit.every`th swing is a critical hit (and stuns, unless every hit does).
    // Riot shield: double damage for a while after blocking a stun.
    let dmg = s.damage;
    let stun = s.stun;
    if (s.crit) {
      const crit = ++t.swings % s.crit.every === 0;
      if (crit) dmg = s.crit.damage;
      else if (!s.stunAll) stun = 0;
      if (t.riotT > 0) dmg *= 2;
      this.events.push({ k: 'shot', t: t.id, e: target.id, ...(crit ? { c: 1 } : {}) });
      this.damage(t, target, dmg);
    } else this.shoot(t, target, dmg);
    if (s.pass) this.passThrough(t, s, target, dmg);
    if (s.ammo) this.useAmmo(t, s);
    if (s.cash && ++t.cashN % s.cash.every === 0) this.cashShot(t, s.cash);
    if (!this.enemies.has(target.id)) return;
    if (s.extra) this.spread(t, s, target);
    if (stun) this.stop(def, target, stun, 'stun');
    if (s.slime) this.applySlime(target, s.slime);
    if (s.chill) this.applyChill(t, s, target);
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
    const ox = t.x - ux * FPS_BACK;
    const oz = t.z - uz * FPS_BACK;
    const oy = heightAt(t.x, t.z) + t.aimH;
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
    this.useAmmo(t, s);
  }

  /**
   * Pursuit: the helicopter flies around inside its patrol zone. With a zombie in the zone it
   * flies over to hover near it and shoots whatever is in its gun range, plus splash missiles.
   */
  updatePursuit(t, def, s, dt, loaded) {
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
    const step = def.heli.speed * dt;
    if (md > 1e-3) {
      const k = Math.min(1, step / md);
      t.hx += mx * k;
      t.hz += mz * k;
      if (!target && md > 0.5) t.hyaw = lerpAngle(t.hyaw, Math.atan2(mx, mz), Math.min(1, dt * 3));
    }
    // Gun: whatever is in range of the helicopter itself.
    if (loaded) {
      const e = this.findTarget(t, s, t.hx, t.hz, s.range);
      if (e && t.cooldown <= 0) {
        t.cooldown += s.cooldown;
        this.shoot(t, e, s.damage);
        this.useAmmo(t, s);
      }
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

  /** Cowboy cash shot: pays the owner, then the Cowboy twirls its gun for a moment. */
  cashShot(t, c) {
    const owner = this.players.get(t.owner);
    if (owner) owner.cash += c.pay;
    t.spinT = c.spin;
    this.events.push({ k: 'cash', id: t.id, owner: t.owner, v: c.pay, spin: c.spin, x: t.x, z: t.z });
  }

  /** DJ Booth: never shoots; it only fires the pulses of a Red Drop the Beat. */
  updateBooth(t, s, dt) {
    if (!(t.pulses > 0)) return;
    t.pulseT -= dt;
    if (t.pulseT > 0) return;
    const ab = s.abilities?.find((a) => a.key === 'beat');
    if (!ab) return void (t.pulses = 0);
    t.pulses--;
    t.pulseT += ab.every;
    const det = this.detects(t, s);
    const r2max = s.aura * s.aura;
    for (const e of [...this.enemies.values()]) {
      if (!canHit(det, e) || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > r2max) continue;
      e.vuln = Math.max(e.vuln, ab.vuln);
      e.vulnT = Math.max(e.vulnT, ab.vulnTime);
      this.damage(t, e, ab.pulseDamage);
    }
    this.events.push({ k: 'beat', id: t.id, x: t.x, z: t.z, r: s.aura, c: 2 });
  }

  /** Drop the Beat: what it does depends on the track the DJ Booth is playing. */
  dropBeat(t, s, ab) {
    const track = t.track || 0;
    if (track === 1) {
      const owner = this.players.get(t.owner);
      if (owner) owner.cash += ab.cash;
      this.events.push({ k: 'income', id: t.id, owner: t.owner, v: ab.cash, x: t.x, z: t.z });
    } else if (track === 2) {
      t.pulses = ab.pulses;
      t.pulseT = 0; // the first pulse goes off right away
      return;
    } else {
      const det = this.detects(t, s);
      const r2max = s.aura * s.aura;
      for (const e of this.enemies.values()) {
        if (!canHit(det, e) || e.statusImmune || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > r2max) continue;
        e.dist = Math.max(0, e.dist - ab.knock * (e.boss ? ab.bossKnock : 1));
        e.beatSlow = Math.max(e.beatSlow, ab.slow);
        e.beatT = Math.max(e.beatT, ab.slowTime);
      }
    }
    this.events.push({ k: 'beat', id: t.id, x: t.x, z: t.z, r: s.aura, c: track });
  }

  /** Skip-test for towers with a deadzone: zombies closer than `r` can't be targeted. */
  deadzone(t, r) {
    return (e) => (e.x - t.x) ** 2 + (e.z - t.z) ** 2 < r * r;
  }

  /**
   * Pump Shotgunner: `pellets` pellets at random angles inside the cone around `aim`. Each one
   * pierces along its line: the first 2 zombies take full damage, the 3rd half.
   */
  pump(t, s, aim) {
    const det = this.detects(t, s);
    const near = [];
    const r2max = s.range * s.range;
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      const dx = e.x - t.x;
      const dz = e.z - t.z;
      if (dx * dx + dz * dz <= r2max) near.push({ e, dx, dz });
    }
    const hits = new Map(); // enemy -> damage this shot
    for (let i = 0; i < s.pellets; i++) {
      const a = aim + (Math.random() * 2 - 1) * s.cone;
      const ux = Math.sin(a);
      const uz = Math.cos(a);
      const line = [];
      for (const n of near) {
        const along = n.dx * ux + n.dz * uz;
        if (along < 0) continue;
        if (Math.abs(n.dx * uz - n.dz * ux) <= PELLET_WIDTH) line.push({ e: n.e, along });
      }
      line.sort((p, q) => p.along - q.along);
      for (let k = 0; k < Math.min(3, line.length); k++) {
        const d = k < 2 ? s.damage : s.damage / 2;
        hits.set(line[k].e, (hits.get(line[k].e) || 0) + d);
      }
    }
    this.events.push({ k: 'pellets', t: t.id, es: [...hits.keys()].map((e) => e.id), a: r2(aim), r: s.range, c: s.cone });
    for (const [e, d] of hits) if (this.enemies.has(e.id)) this.damage(t, e, d);
  }

  /** Electroshocker: a bolt that hits the target and jumps to the closest unhit zombie, stunning each. */
  chain(t, def, s, target) {
    const det = this.detects(t, s);
    const list = [target];
    const seen = new Set([target.id]);
    let cur = target;
    const j2 = s.jump * s.jump;
    while (list.length < s.chains) {
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
      list.push(best);
      seen.add(best.id);
      cur = best;
    }
    this.events.push({ k: 'zap', t: t.id, es: list.map((e) => e.id) });
    for (const e of list) {
      if (!this.enemies.has(e.id)) continue;
      this.damage(t, e, s.damage);
      this.stop(def, e, s.stun, 'stun');
    }
  }

  // ---------------------------------------------------------------- pulses & sweeps

  /** Pulse Trooper: whenever a zombie it can see is in range, sends out a growing ring. */
  firePulse(t, def, s) {
    if (t.cooldown > 0) return;
    const det = this.detects(t, s);
    if (!this.anyNear(t.x, t.z, s.range + PULSE_WIDTH, det)) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.cooldown += s.cooldown;
    this.rings.push({ tower: t.id, x: t.x, z: t.z, r: 0, max: s.range, speed: def.pulse, damage: s.damage, det, hits: new Set() });
    this.events.push({ k: 'pulse', t: t.id, r: r2(s.range), d: r2(s.range / def.pulse) });
  }

  /** Rings grow outward; each zombie the edge passes over is hit once. */
  updateRings(dt) {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      const r0 = ring.r;
      ring.r = Math.min(ring.max, ring.r + ring.speed * dt);
      const lo = Math.max(0, r0 - PULSE_WIDTH);
      const hi = ring.r + PULSE_WIDTH;
      const tower = this.towers.get(ring.tower) ?? null;
      for (const e of [...this.enemies.values()]) {
        if (ring.hits.has(e.id) || !canHit(ring.det, e)) continue;
        const d = Math.hypot(e.x - ring.x, e.z - ring.z);
        if (d < lo || d > hi) continue;
        ring.hits.add(e.id);
        this.events.push({ k: 'slice', e: e.id });
        this.damage(tower, e, ring.damage);
      }
      if (ring.r >= ring.max) this.rings.splice(i, 1);
    }
  }

  /**
   * Sweeper: two lasers on opposite sides of the tower, reaching across the whole map, spin
   * around it (one turn every `spin` seconds) for `duration` seconds.
   */
  sweep(t, ab) {
    const ang = t.yaw || 0;
    this.sweeps.push({ tower: t.id, x: t.x, z: t.z, ang, rate: TAU / ab.spin, spin: ab.spin, left: ab.duration, t: 0, damage: ab.damage, last: [new Map(), new Map()] });
    this.events.push({ k: 'sweep', t: t.id, a: r2(ang), d: ab.duration, s: ab.spin });
  }

  /**
   * Each laser hits every zombie (hidden ones too) it passes over. A zombie can be hit again by
   * the same laser on its next turn, so it's hit about twice per spin while the lasers last.
   */
  updateSweeps(dt) {
    for (let i = this.sweeps.length - 1; i >= 0; i--) {
      const sw = this.sweeps[i];
      const step = Math.min(dt, sw.left);
      const a0 = sw.ang;
      const turn = sw.rate * step;
      sw.ang += turn;
      sw.t += step;
      sw.left -= step;
      const tower = this.towers.get(sw.tower) ?? null;
      for (const e of [...this.enemies.values()]) {
        const dx = e.x - sw.x;
        const dz = e.z - sw.z;
        const d = Math.hypot(dx, dz);
        const tol = d > 0.01 ? Math.atan2(SWEEP_WIDTH, d) : Math.PI;
        const ea = Math.atan2(dx, dz);
        for (let k = 0; k < 2; k++) {
          const diff = (((ea - a0 - k * Math.PI) % TAU) + TAU) % TAU; // how far ahead of the laser it is
          if (diff > turn + tol && diff < TAU - tol) continue;
          const last = sw.last[k].get(e.id);
          if (last != null && sw.t - last < sw.spin * 0.5) continue; // already hit on this pass
          sw.last[k].set(e.id, sw.t);
          this.events.push({ k: 'slice', e: e.id });
          this.damage(tower, e, sw.damage);
          if (!this.enemies.has(e.id)) break;
        }
      }
      if (sw.left <= 0) this.sweeps.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- traps

  /** Path points a Trapper can throw traps on: every unit of path inside its range. */
  trapSpots(t, range) {
    const spots = [];
    const p = {};
    for (let d = 0; d < path.length; d += 1) {
      path.at(d, p);
      if ((p.x - t.x) ** 2 + (p.z - t.z) ** 2 <= range * range) spots.push({ d, x: p.x, z: p.z, dx: p.dx, dz: p.dz });
    }
    return spots;
  }

  /** Trapper: throws its next trap (spike / mine / bear, in `order`) onto the path in range. */
  updateTrapper(t, def, s) {
    if (t.cooldown > 0) return;
    if (t.spotsR !== s.range) {
      t.spots = this.trapSpots(t, s.range);
      t.spotsR = s.range;
    }
    if (!t.spots.length) return;
    let mine = 0;
    for (const tr of this.traps.values()) if (tr.tower === t.id) mine++;
    if (mine >= s.maxTraps) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.cooldown += s.cooldown;
    // Aim a little ahead of the lead zombie in range; otherwise anywhere in range.
    const lead = this.findTarget(t, s, t.x, t.z, s.range);
    const ahead = lead ? t.spots.filter((p) => p.d > lead.dist + 3 && p.d < lead.dist + 12) : [];
    const pool = ahead.length ? ahead : t.spots;
    const spot = pool[Math.floor(Math.random() * pool.length)];
    const lat = (Math.random() - 0.5) * 2;
    const x = spot.x - spot.dz * lat;
    const z = spot.z + spot.dx * lat;
    const kind = s.order[t.trapN++ % s.order.length];
    const st = s[kind];
    const trap = { id: this.nextId++, tower: t.id, kind, x, z, land: TRAP_FLIGHT, uses: st.uses ?? 1, hits: new Set(), ...st };
    trap.bossStop = def.bossStop;
    this.traps.set(trap.id, trap);
    t.yaw = Math.atan2(x - t.x, z - t.z);
    this.events.push({ k: 'trapThrow', t: t.id, x: r2(x), z: r2(z), d: TRAP_FLIGHT });
  }

  /** Traps spring when a zombie (hidden ones too, not flyers) walks over them. */
  updateTraps(dt) {
    for (const tr of this.traps.values()) {
      if (tr.kind === 'grave' || tr.kind === 'sentry') continue; // Necromancer / Engineer builds
      if (tr.land > 0) {
        tr.land -= dt;
        continue;
      }
      const tower = this.towers.get(tr.tower) ?? null;
      for (const e of [...this.enemies.values()]) {
        if (e.flying) continue; // flyers pass over traps
        if ((e.x - tr.x) ** 2 + (e.z - tr.z) ** 2 > TRAP_HIT * TRAP_HIT) continue;
        if (tr.kind === 'spike') {
          if (tr.hits.has(e.id)) continue;
          tr.hits.add(e.id);
          this.events.push({ k: 'slice', e: e.id });
          this.damage(tower, e, tr.damage);
          if (--tr.uses > 0) continue;
        } else if (tr.kind === 'mine') {
          this.explode(tower, tr.x, tr.z, { damage: tr.damage, radius: tr.radius, det: GROUND_BLAST, burn: tr.burn, burnTime: tr.burnTime });
        } else {
          this.events.push({ k: 'slice', e: e.id });
          this.stop({ bossStop: tr.bossStop }, e, tr.stun, 'stun');
          this.damage(tower, e, tr.damage);
        }
        tr.uses = 0;
        break;
      }
      if (tr.uses <= 0) {
        this.traps.delete(tr.id);
        this.events.push({ k: 'trapGone', id: tr.id, kind: tr.kind, x: r2(tr.x), z: r2(tr.z) });
      }
    }
  }

  removeTrapsOf(towerId) {
    for (const tr of this.traps.values()) if (tr.tower === towerId) this.traps.delete(tr.id);
  }

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
    const g = { id: this.nextId++, tower: t.id, kind: 'grave', x: best.x - best.dz * lat, z: best.z + best.dx * lat, d: best.d, lvl: 1, land: 0, uses: 1, yaw: Math.atan2(best.dz * side, -best.dx * side) }; // facing the path
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
      u.lateral = (Math.random() - 0.5) * 1.6;
      this.placeUnit(u);
      this.traps.delete(g.id);
      const boom = s.boomLvl && g.lvl >= s.boomLvl;
      this.events.push({ k: 'trapGone', id: g.id, kind: 'grave', x: r2(g.x), z: r2(g.z) });
      if (boom) this.explode(t, g.x, g.z, { damage: s.boom.damage, radius: s.boom.radius, det: GROUND_BLAST });
    }
  }

  /** A sentry on open ground between the Engineer's deadzone and its build range. */
  buildSentry(t, s) {
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
      const st = TOWERS[t.type].levels[t.level].sentry;
      if (sn.maxHp !== st.hp) {
        // The Engineer was upgraded: the sentry becomes the new model, keeping its share of health.
        sn.hp = (sn.hp / sn.maxHp) * st.hp;
        sn.maxHp = st.hp;
      }
      sn.lvl = t.level;
      sn.hp -= st.decay * dt;
      if (sn.hp <= 0) {
        this.traps.delete(sn.id);
        this.events.push({ k: 'trapGone', id: sn.id, kind: 'sentry', x: r2(sn.x), z: r2(sn.z) });
        continue;
      }
      sn.stunT = Math.max(0, sn.stunT - dt);
      if (sn.stunT > 0) continue;
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
        this.damage(t, target, st.gun.damage);
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
    if (!canPlace(x, z, this.towers.values(), def.placement)) return def.placement === 'cliff' ? `A ${def.name} can only go on top of a cliff!` : "Can't place there!";
    p.cash -= cost;
    const t = this.newTower(p.id, src.type, x, z, m.yaw, 0);
    t.level = src.level;
    t.targetMode = src.targetMode;
    t.track = src.track;
    t.ammo = def.levels[t.level].ammo ?? 0;
    t.holo = t.holoMax = ab.life;
    this.events.push({ k: 'place', id: t.id, owner: p.id, x, z, holo: 1 });
    return null;
  }

  /** Takes a tower off the map with everything it made (sold, or a hologram fading). */
  removeTower(t, k, extra = {}) {
    this.towers.delete(t.id);
    this.removeUnitsOf(t.id);
    this.removeTrapsOf(t.id);
    this.events.push({ k, id: t.id, owner: t.owner, x: t.x, z: t.z, ...extra });
  }

  // ---------------------------------------------------------------- slows

  /** Slime Trooper: slows a zombie by `slow` for `time` seconds. Bosses ignore it; slimes don't stack. */
  applySlime(e, sl) {
    if (e.boss || e.statusImmune) return;
    e.slime = Math.max(e.slimeT > 0 ? e.slime : 0, sl.slow);
    e.slimeT = Math.max(e.slimeT, sl.time);
  }

  /**
   * Freezer: every hit adds `s.chill` chill (0..1). Chill slows up to `maxSlow` (half for bosses)
   * and hurts `chillDps` per second while it lasts. At full chill, `chillFreeze` freezes the zombie.
   */
  applyChill(t, s, e) {
    if (e.statusImmune) return;
    e.chillMax = Math.max(e.chillT > 0 ? e.chillMax : 0, s.maxSlow * (e.boss ? 0.5 : 1));
    e.chill = Math.min(1, e.chill + s.chill);
    e.chillT = s.chillTime;
    if (s.chillDps >= e.chillDps) {
      e.chillDps = s.chillDps;
      e.chillBy = t.id;
    }
    if (e.chill >= 1 && s.chillFreeze && !e.boss) {
      this.stop({}, e, s.chillFreeze, 'ice');
      e.chill = 0;
      e.chillT = 0;
    }
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

  /** Tactical Sniper: the shot goes on through up to `pass` more zombies behind `main` (closest first). */
  passThrough(t, s, main, dmg) {
    const det = this.detects(t, s);
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
    list.sort((a, b) => a.along - b.along);
    for (const { e } of list.slice(0, s.pass)) this.shoot(t, e, dmg);
  }

  /** Flare Gun: hidden zombies in the tower's range are revealed to every tower for a while. */
  flare(t, s, ab) {
    const r2max = s.range * s.range;
    for (const e of this.enemies.values()) {
      if (e.hidden && (e.x - t.x) ** 2 + (e.z - t.z) ** 2 <= r2max) e.revealT = Math.max(e.revealT || 0, ab.duration);
    }
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
  hexTowers(x, z, r, kind, secs) {
    const key = kind === 'smoke' ? 'smoke' : 'stunT';
    let n = 0;
    for (const t of this.towers.values()) {
      if ((t.x - x) ** 2 + (t.z - z) ** 2 > r * r) continue;
      if (kind === 'stun' && TOWERS[t.type]?.stunImmune) continue;
      if (kind === 'stun') {
        // Warden riot shield: blocks the stun, then double damage and stun immune for a while.
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
      t[key] = Math.max(t[key], secs);
      n++;
    }
    // Engineer sentries get stunned too, unless they have a shield.
    if (kind === 'stun') {
      for (const sn of this.traps.values()) {
        if (sn.kind !== 'sentry' || (sn.x - x) ** 2 + (sn.z - z) ** 2 > r * r) continue;
        const t = this.towers.get(sn.tower);
        if (t && TOWERS[t.type].levels[t.level].sentry.shield) continue;
        sn.stunT = Math.max(sn.stunT, secs);
      }
    }
    return n;
  }

  /** Every unit on this map takes `dmg` (Pyrotechnics). */
  hurtUnits(dmg) {
    for (const u of [...this.units.values()]) {
      u.hp -= dmg;
      if (u.def.soldiers) u.alive = Math.max(0, Math.ceil(u.hp / u.def.hp - 1e-6));
      if (u.hp <= 0) this.destroyUnit(u, this.towers.get(u.tower) ?? null);
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

  // ---------------------------------------------------------------- spawners & units

  /** Spawner towers send a unit every `spawnEvery` seconds of wave time. */
  updateSpawner(t, def, s, dt) {
    if (this.wave.state !== 'wave') return;
    if (s.roster) return this.updateQueues(t, s, dt);
    t.spawnT -= dt;
    if (t.spawnT > 0) return;
    if (def.maxUnits && this.unitsOf(t.id).length >= def.maxUnits) {
      t.spawnT = 0; // wait for a free slot
      return;
    }
    t.spawnT = s.spawnEvery ?? def.spawnEvery;
    this.spawnUnit(t, s.unit);
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
      this.spawnUnit(t, s.roster[q.r].unit);
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

  nextInQueue(t, s, q) {
    q.r = (t.rot = (t.rot ?? -1) + 1) % s.roster.length;
    q.left = s.roster[q.r].every;
  }

  /** Air-Drop: every unit in the queues drops onto the path near (x, z), and the queues start over. */
  airDrop(t, s, x, z) {
    this.fillQueues(t, s);
    const d = path.project(x, z);
    t.queues.forEach((q, i) => {
      const u = this.spawnUnit(t, s.roster[q.r].unit);
      u.dist = Math.max(0, Math.min(path.length - 1, d + (i - (t.queues.length - 1) / 2) * 2));
      this.placeUnit(u);
      this.nextInQueue(t, s, q);
    });
    const p = path.at(d, {});
    this.events.push({ k: 'airdrop', x: r2(p.x), z: r2(p.z), n: t.queues.length });
  }

  unitsOf(towerId) {
    return [...this.units.values()].filter((u) => u.tower === towerId);
  }

  /** A unit starts at the castle end of the path. It keeps its tower's firerate boost from now on. */
  spawnUnit(t, def, back = 0) {
    const n = def.soldiers || 1;
    const u = {
      id: this.nextId++, tower: t.id, model: def.model, def,
      hp: def.hp * n, maxHp: def.hp * n, alive: n,
      dist: path.length - 1 - back, lateral: (Math.random() - 0.5) * 1.6, speed: def.speed,
      rate: buffOf(this.buffs, t.id).rate,
      cooldown: 0, gap: 0, burstLeft: 0, cannonT: def.cannon ? def.cannon.every / 2 : 0, yaw: 0,
    };
    this.placeUnit(u);
    this.units.set(u.id, u);
    return u;
  }

  placeUnit(u) {
    path.at(u.dist, u);
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
          u.gap = 0.1;
          // Every soldier in a squad fires.
          for (let i = 0; i < u.alive; i++) {
            const e = i === 0 ? target : this.unitTarget(u, g.range);
            if (!e) break;
            if (g.radius) {
              // Grenadier: a grenade lobbed at the zombie, hurting everyone in the blast.
              const time = 0.5;
              const p = this.leadPoint(e, time);
              this.shells.push({ tower: u.tower, x: p.x, z: p.z, time, damage: g.damage, radius: g.radius, det: unitDetection(d) });
              this.events.push({ k: 'ulob', u: u.id, x: r2(p.x), z: r2(p.z), d: time });
              continue;
            }
            this.events.push({ k: 'ushot', u: u.id, e: e.id, i });
            this.damage(tower, e, g.damage);
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
        const aim = u.cannonT <= 0 && (target && this.enemies.has(target.id) ? target : g && this.unitTarget(u, g.range));
        if (aim) {
          u.cannonT = c.every;
          this.events.push({ k: 'ushot', u: u.id, e: aim.id, c: 1 });
          this.explode(tower, aim.x, aim.z, { damage: c.damage, splash: c.splash, radius: c.radius, main: aim.id, det: unitDetection(d) });
        }
      }

      // Squads stop while they have something to shoot; vehicles keep driving.
      u.speed = d.soldiers && (target || u.healing) ? 0 : d.speed;
      u.dist -= u.speed * dt;
      if (u.dist <= 0) {
        this.units.delete(u.id); // reached the entrance
        continue;
      }
      this.placeUnit(u);

      // Crashes (hidden zombies too: you don't need to see a zombie to run it over).
      for (const e of this.enemies.values()) {
        if (e.flying || Math.abs(e.dist - u.dist) > CONTACT) continue; // flyers pass overhead
        if (d.ram) {
          const hit = Math.min(e.hp, u.hp);
          u.hp -= hit;
          this.damage(tower, e, hit);
        } else u.hp -= ENEMIES[e.type].damage * GAME.unitContact * dt * (medics.length ? 1 - shieldOf(u) : 1);
        if (u.hp <= 0) break;
      }
      if (d.soldiers) u.alive = Math.max(0, Math.ceil(u.hp / d.hp - 1e-6));
      if (u.hp <= 0) this.destroyUnit(u, tower);
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
    const ex = u.def.explode;
    this.events.push({ k: 'udie', u: u.id, x: r2(u.x), z: r2(u.z), ...(ex ? { boom: 1 } : {}) });
    if (ex) this.explode(tower, u.x, u.z, { damage: ex.damage, radius: ex.radius, det: WRECK_BLAST });
  }

  removeUnitsOf(towerId) {
    for (const u of this.units.values()) if (u.tower === towerId) this.units.delete(u.id);
  }

  // ---------------------------------------------------------------- abilities

  useAbility(t, s, ab, m) {
    const fury = TOWERS[t.type].fury;
    if (fury) t.fury = Math.max(t.fury, fury); // Classic Commander fights for a while after any ability
    if (ab.key === 'cta' || ab.key === 'uber') t.active = ab.duration;
    else if (ab.key === 'reverse') t.dir = -(t.dir || 1);
    else if (ab.key === 'patrol') {
      // Pursuit: move the patrol zone (the helicopter flies over on its own).
      t.cx = Number(m.x);
      t.cz = Number(m.z);
    } else if (ab.key === 'fps') {
      t.manual = !t.manual;
      t.fire = false;
      t.aimYaw = t.yaw;
      t.aimAge = 0;
    }
    else if (ab.key === 'track') t.track = nextTrack(t.track, s);
    else if (ab.key === 'beat') this.dropBeat(t, s, ab);
    else if (ab.key === 'militia') this.spawnUnit(t, ab.unit);
    else if (ab.key === 'raise') this.raiseDead(t, s);
    else if (ab.key === 'airdrop') this.airDrop(t, s, Number(m.x), Number(m.z));
    else if (ab.key === 'caravan') ab.units.forEach((u, i) => this.spawnUnit(t, u, i * 6));
    else if (ab.key === 'sweeper') this.sweep(t, ab);
    else if (ab.key === 'flare') this.flare(t, s, ab);
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
      const list = this.findTargets(t, s, ab.count, (e) => !e.boss);
      for (const e of list) this.stop({}, e, ab.duration, 'ice');
      this.events.push({ k: 'boom', x: r2(t.x), z: r2(t.z), r: s.range * 0.5, ice: 1 });
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

  /** Splash towers: grenades/shells lobbed at where the zombie will be, homing rockets, or an instant ice blast. */
  fireSplash(t, def, s, target) {
    const det = this.detects(t, s);
    const blast = { damage: s.damage, splash: s.splash, radius: s.radius, freeze: s.freeze, slime: s.slime, det, main: target.id, cluster: s.cluster, nuke: s.nuke };
    if (!def.lob) {
      // Ice blast: instant hit on the target, freezing everything around it.
      this.events.push({ k: 'shot', t: t.id, e: target.id });
      this.explode(t, target.x, target.z, blast);
      return;
    }
    const time = s.lob ?? def.lob;
    if (s.volley) {
      // Missile Maelstrom: each missile locks onto a different zombie (doubling up if there are few).
      const list = this.findTargets(t, s, s.volley, def.minRange ? (e) => !this.deadzone(t, def.minRange)(e) : null);
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
    const p = this.leadPoint(target, time);
    this.shells.push({ tower: t.id, x: p.x, z: p.z, time, ...blast });
    this.events.push({ k: 'lob', t: t.id, x: r2(p.x), z: r2(p.z), d: time });
  }

  /** Where enemy `e` will be after `time` seconds at its current speed. */
  leadPoint(e, time) {
    const p = path.at(e.dist + e.speed * time, {});
    p.x += -p.dz * e.lateral;
    p.z += p.dx * e.lateral;
    return p;
  }

  /** Freeze or stun an enemy for `secs` (bosses get only `def.bossStop` of it). */
  stop(def, e, secs, kind) {
    if (!this.enemies.has(e.id) || e.statusImmune) return;
    const d = e.boss ? secs * (def.bossStop ?? 1) : secs;
    if (d <= e.stop && e.stopKind) return;
    e.stop = d;
    e.stopKind = kind;
    e.speed = 0;
  }

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
      list.push({ e, sc: this.score(t.targetMode, e, d2) });
    }
    if (s.hits) list = list.sort((a, b) => b.sc - a.sc).slice(0, s.hits);
    for (const { e } of list) {
      if (e.fireImmune) continue; // Fire Slimes shrug off flames
      this.ignite(e, t.id, s.burn, s.burnTime, def.burnSlow ?? 0);
      if (s.damage) this.damage(t, e, s.damage);
    }
  }

  /** Sets a zombie on fire. Burns don't stack: the hottest one sets the damage. */
  ignite(e, by, dps, time, slow) {
    if (e.fireImmune) return;
    e.burnSlow = Math.max(e.burn > 0 ? e.burnSlow : 0, slow);
    e.burn = Math.max(e.burn, time);
    if (dps >= e.burnDps) {
      e.burnDps = dps;
      e.burnBy = by;
    }
  }

  updateBurns(dt) {
    for (const e of [...this.enemies.values()]) {
      if (e.chillT > 0 && e.chillDps > 0) {
        e.chillAcc += e.chillDps * dt;
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
      if (!e.burn) {
        e.burnDps = 0;
        e.burnAcc = 0;
        continue;
      }
      e.burnAcc += e.burnDps * dt;
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
   * Blast at (x, z). b: { radius, damage, det, splash?, main?, freeze? }. The `main` zombie
   * takes `damage`; others take `splash` (or `damage` if there is no separate splash).
   */
  explode(t, x, z, b) {
    this.events.push({ k: 'boom', x: r2(x), z: r2(z), r: b.radius, ...(b.freeze ? { ice: 1 } : b.slime ? { slime: 1 } : b.nuke ? { nuke: 1 } : {}) });
    const r2max = b.radius * b.radius;
    const def = t ? TOWERS[t.type] : {};
    for (const e of this.enemies.values()) {
      if (!canHit(b.det, e)) continue;
      if ((e.x - x) ** 2 + (e.z - z) ** 2 > r2max) continue;
      const dmg = b.splash != null && e.id !== b.main ? b.splash : b.damage;
      if (b.freeze) this.stop(def, e, b.freeze, 'ice');
      if (b.slime) this.applySlime(e, b.slime);
      if (b.burn) this.ignite(e, t?.id ?? 0, b.burn, b.burnTime, 0);
      if (dmg > 0) this.damage(t, e, dmg);
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

  /** Damages an enemy; `t` (may be null if the tower was sold) gets the credit. */
  damage(t, e, dmg) {
    if (e.armor) dmg *= 1 - e.armor; // Molten Squires, Knights...
    if (e.vuln) dmg *= 1 + e.vuln; // softened up by a DJ Booth's Red Drop the Beat
    if (t) {
      const mult = buffOf(this.buffs, t.id).dmg;
      if (mult !== 1) dmg = Math.round(dmg * mult * 100) / 100; // Ubercharge, DJ Booth Red track
      const dealt = Math.min(dmg, e.hp);
      t.damageDealt += dealt;
      t.fanAcc += dealt;
    }
    e.hp -= dmg;
    if (e.hp > 0) return;
    if (!this.enemies.delete(e.id)) return; // already dead (no double rewards or double cage monsters)
    if (t) t.kills++;
    const def = ENEMIES[e.type];
    // Wire Fraud: hacked zombies pay everyone extra (whole dollars; the rest carries over).
    let reward = def.reward;
    if (e.fraud) {
      this.fraudAcc += def.reward * e.fraud;
      const extra = Math.floor(this.fraudAcc);
      this.fraudAcc -= extra;
      reward += extra;
    }
    if (e.hackEv) this.holos.push(e);
    for (const p of this.players.values()) p.cash += reward;
    this.events.push({ k: 'kill', e: e.id, r: reward });
    // Cages release a random monster; the Slime King comes back for round two; Moltens leave corpses.
    const next = def.phase2 ?? def.corpse ?? (def.cage ? def.cage[Math.floor(Math.random() * def.cage.length)] : null);
    if (next) this.reborn.push({ type: next, dist: e.dist, lateral: e.lateral, hpScale: def.phase2 ? 1 : def.cageHp ?? 1, from: e.type });
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
      const score = this.score(t.targetMode, e, d2);
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best;
  }

  /** Target-mode score: higher is a better target. `d2` is squared distance to the shooter. */
  score(mode, e, d2) {
    switch (mode) {
      case 0: return e.dist; // First
      case 1: return -e.dist; // Last
      case 2: return e.hp * 10000 + e.dist; // Strongest
      default: return -d2; // Closest
    }
  }

  /** Up to `n` best enemies in range, by target mode (Plasma Trooper). */
  findTargets(t, s, n, ok = null) {
    const r2max = s.range * s.range;
    const det = this.detects(t, s);
    const list = [];
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      if (ok && !ok(e)) continue;
      const d2 = (e.x - t.x) ** 2 + (e.z - t.z) ** 2;
      if (d2 <= r2max) list.push({ e, sc: this.score(t.targetMode, e, d2) });
    }
    list.sort((a, b) => b.sc - a.sc);
    return list.slice(0, n).map((x) => x.e);
  }

  /** A new tower at level 0 (`spent`: what it cost, for selling). */
  newTower(pid, type, x, z, camYaw, spent) {
    const def = TOWERS[type];
    // The Gatling Gun's cone points away from the camera, the way the player is looking.
    const yaw = (Number(camYaw) || 0) + (def.fps ? Math.PI : 0);
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
      trapN: 0, spots: [], spotsR: 0, // Trapper: traps thrown so far, path spots in range (Necromancer too)
      meter: 0, buildT: 0, // Necromancer souls / Engineer scrap, seconds left raising a gravestone or building a sentry
      phase: 0, dealt: 0, // Accelerator: 0 charging, 1 firing (damage dealt so far), 2 cooling down
      cashN: 0, spinT: 0, // Cowboy: shots toward the next cash shot, seconds left twirling
      track: 0, pulses: 0, pulseT: 0, // DJ Booth: track playing (TRACKS index), Red beat pulses left
      ammo: def.levels[0].ammo ?? 0, reloadT: 0, // Pursuit / Gatling Gun: bullets left, seconds of reloading left
      hx: x, hz: z, hyaw: 0, cx: x, cz: z, // Pursuit: where the helicopter is, middle of its patrol zone
      face: yaw, manual: false, fire: false, aimYaw: yaw, aimPitch: 0, aimH: 4, aimAge: 0, // Gatling Gun: cone direction, FPS Mode
      holo: 0, holoMax: 0, // Hacker clone: seconds left, lifetime
    };
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
        if (owned >= def.limit) return `Placement limit reached (${def.limit})`;
        const x = Number(m.x);
        const z = Number(m.z);
        if (!canPlace(x, z, this.towers.values(), def.placement)) {
          return def.placement === 'cliff' ? `${def.name} can only go on top of a cliff!` : "Can't place there!";
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
        let def = TOWERS[t.type];
        // Upgrade paths: picking the bottom path turns the tower into its branch type.
        const branch = m.path === 'bottom' && def.branch && t.level + 1 === def.branchAt ? def.branch : null;
        if (branch) def = TOWERS[branch];
        const next = def.levels[t.level + 1];
        if (!next) return 'Already max level!';
        const cost = upgradeCost(next, buffOf(computeBuffs(this.towers.values()), t.id));
        if (p.cash < cost) return `Need $${cost} to upgrade`;
        p.cash -= cost;
        if (branch) t.type = branch;
        t.level++;
        t.spent += cost;
        if (next.ammo) {
          t.ammo = next.ammo; // a fresh, bigger magazine
          t.reloadT = 0;
        }
        if (next.spawnNow) {
          // The upgraded unit rolls out right away and replaces the old ones.
          this.removeUnitsOf(t.id);
          this.spawnUnit(t, next.unit);
          t.spawnT = next.spawnEvery ?? def.spawnEvery;
        }
        this.events.push({ k: 'upgrade', id: t.id, owner: pid, name: next.name, x: t.x, z: t.z });
        return null;
      }
      case 'sell': {
        const t = this.ownedTower(pid, m.id);
        if (typeof t === 'string') return t;
        const value = Math.floor(t.spent * GAME.sellRatio);
        p.cash += value;
        this.removeTower(t, 'sell', { value });
        return null;
      }
      case 'target': {
        const t = this.ownedTower(pid, m.id);
        if (typeof t === 'string') return t;
        t.targetMode = (t.targetMode + 1) % TARGET_MODES.length;
        return null;
      }
      case 'ability': {
        const t = this.ownedTower(pid, m.id);
        if (typeof t === 'string') return t;
        const s = TOWERS[t.type].levels[t.level];
        const ab = s.abilities?.find((a) => a.key === m.key);
        if (!ab) return "That tower can't do that";
        if (t.cd[ab.key] > 0) return `${ab.name} is recharging (${Math.ceil(t.cd[ab.key])}s)`;
        if (ab.cost && p.cash < ab.cost) return `Need $${ab.cost} for ${ab.name}`;
        if (ab.versus) {
          const why = this.vs ? this.vs.canAttack(this.lane) : `${ab.name} only works in Versus`;
          if (why) return why;
        }
        if (ab.aim && !(Number.isFinite(Number(m.x)) && Number.isFinite(Number(m.z)))) return 'Pick a spot first';
        if (ab.key === 'raise' && !this.buildsOf(t.id, 'grave').length) return 'No gravestones to raise yet';
        if (ab.key === 'clone') {
          const why = this.cloneTower(p, ab, m);
          if (why) return why;
        }
        if (ab.cost) p.cash -= ab.cost;
        t.cd[ab.key] = ab.cooldown;
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
        this.speed = this.speed >= 3 ? 1 : this.speed + 1;
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

  // ---------------------------------------------------------------- networking

  snapshot() {
    const w = this.wave;
    return {
      w: [w.state, w.index, Math.round(w.countdown * 10) / 10, w.left, w.votes, this.votesNeeded, this.canSkipWave ? 1 : 0],
      b: this.baseHp,
      m: this.mode,
      sp: this.speed,
      o: this.over,
      // JSON can't hold Infinity (Konami code cash), so it travels as 'inf'.
      p: [...this.players.values()].map((p) => [p.id, p.name, p.cash === Infinity ? 'inf' : p.cash, p.color]),
      t: [...this.towers.values()].map((t) => [
        t.id, t.owner, t.type, t.level, r2(t.x), r2(t.z), r2(t.yaw), t.targetMode, t.kills, t.damageDealt, t.spent,
        r2(t.ang), t.lock, r2(t.charge), r2(t.active), cdSnap(t.cd), (t.smoke > 0 ? 1 : 0) | (t.stunT > 0 ? 2 : 0) | (t.shieldT > 0 ? 4 : 0) | (t.revT > 0 ? 8 : 0), t.dir, t.track,
        r2(t.radioT),
        // Pursuit / Gatling Gun extras: [ammo, reload left, helicopter dx, dz, heading, patrol zone dx, dz, FPS Mode, cone facing]
        // (positions relative to the tower, so Versus lanes don't have to shift them).
        TOWERS[t.type].levels[t.level].ammo
          ? [t.ammo, r2(t.reloadT), r2(t.hx - t.x), r2(t.hz - t.z), r2(t.hyaw), r2(t.cx - t.x), r2(t.cz - t.z), t.manual ? 1 : 0, r2(t.face)]
          : 0,
        t.holo ? r2(t.holo) : 0, // Hacker clone: seconds left
      ]),
      // Traps, plus Necromancer gravestones and Engineer sentries: [..., level, facing, health left (0-1), stunned].
      tr: [...this.traps.values()].map((tr) => [tr.id, tr.tower, tr.kind, r2(tr.x), r2(tr.z), tr.land > 0 ? 0 : 1, tr.lvl ?? 0, r2(tr.yaw ?? 0), tr.maxHp ? r2(tr.hp / tr.maxHp) : 1, tr.stunT > 0 ? 1 : 0]),
      u: [...this.units.values()].map((u) => [u.id, u.tower, u.model, Math.ceil(u.hp), u.maxHp, r2(u.dist), r2(u.lateral), u.alive, r2(u.speed), r2(u.yaw)]),
      e: [...this.enemies.values()].map((e) => [e.id, e.type, e.hp, e.maxHp, r2(e.dist), r2(e.speed), r2(e.lateral), e.st]),
    };
  }
}
