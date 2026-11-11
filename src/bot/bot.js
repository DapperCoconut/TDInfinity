// A bot teammate: a player the room hub runs. It brings a loadout (loadouts.js), walks to where
// it wants to build, places and upgrades towers where they do the most good (spots.js, value.js),
// fires abilities, votes to skip, and does what players ask it to with the order wheel.
// Runs wherever the hub runs (the host's browser or Node): no three.js, no DOM.
//
//   const bot = new Bot(sim, 'bot1', { role: 'generalist', mode: 'easy', say: (text) => ... });
//   bot.tick(dt, sim.events);   // every sim tick, before the events are drained
//   bot.pos();                  // where its avatar is (for the other players' screens)
//   bot.order({ cmd: 'upgrade', id });   // a player's order: returns what the bot says back
import { ENEMIES, TOWERS, VERSUS, rootType, towerCost, towerLimit } from '../config.js';
import { computeBuffs, nextUpgrade } from '../sim/sim.js';
import { PLAYER_SPAWN, path } from '../sim/path.js';
import { heightAt, laneOz } from '../sim/map.js';
import { botLoadout } from './loadouts.js';
import { costUpTo, hitShare, levelPower, threats, waveLoad, waveTime } from './value.js';
import { attackSpot, cover, coveredBy, hasSpots, quietSpot, supportSpot, walkable } from './spots.js';

const WALK = 40; // studs per second (players walk 48)
const ARRIVE = 3; // close enough to a spot to build there
const SAT = 24; // a tower that sees this many path samples (48 studs of track) is fully used
// How much stronger than the next wave the team's defense should be before a bot stops buying it.
const MARGIN = { easy: 1.3, medium: 1.5, hard: 1.7, expert: 1.8, insane: 2, void: 2, hardcore: 2.4, halloween: 1.6, zombies: 1.5 };
// Abilities bots leave alone: they need a player's hands (FPS Mode, flying a drone), or they're
// switches and sells a bot would only get wrong.
const DENY = new Set(['fps', 'follow', 'clone', 'track', 'extraSlot', 'droneMode', 'directedPower', 'element', 'repaint', 'unitCommand', 'radarMove', 'seeMe', 'scope', 'sweeper', 'liveShow', 'spotter', 'neuralyze', 'magicBoost', 'withdraw', 'reverse', 'rbBliss', 'rbTruck', 'rbTank', 'redeploy', 'soulBeam', 'raise', 'chase', 'targetSelect', 'thorns', 'iceTurret', 'iceShard', 'voltPoint', 'concussive', 'crossbow', 'reposition', 'teleport', 'jump', 'bounty']);
// What a bot says. Short, like a kid typing fast.
const SAY = {
  ok: ['On it!', 'Sure thing', 'Got it', 'Okay!', 'Yep'],
  broke: ['I need $%s more for that', 'Not enough cash yet, I will when I can', 'Saving up for it ($%s)'],
  sold: ['Sold it', 'Done, sold', 'Okay, sold it'],
  maxed: ['That one is maxed already!', "It can't go higher"],
  notMine: ["That's not my tower", 'Not mine!'],
  build: ['I will build there', 'Okay, building there next', 'Good spot, on it'],
  defend: ['More defense coming', 'Okay, building defense', 'On it, more towers'],
  farm: ['Farming it is', 'Okay, more farms', 'Farms coming up'],
  noFarm: ["I don't have a farm!", 'No farm in my loadout, sorry'],
  save: ['Okay, saving up', 'Holding my cash', 'Saving, got it'],
  leak: ['Oops', 'They got through!', 'Need more here', 'Hold on, building'],
  wave: ['Here they come', 'Big wave!', 'Ready?', 'Let\'s go'],
  gg: ['gg', 'GG!', 'We did it!', 'nice'],
};

/** mulberry32: a small seeded random source, so bots in one game differ but a test replays the same. */
function seeded(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Bot {
  /**
   * @param sim   the Sim it plays in (in Versus: its own lane's Sim, in map-local coordinates)
   * @param id    its player id in that sim
   * @param opts  { role, mode, seed, say(text), top (the VersusSim, for skips and sends), lane, loose }
   *   loose: a less structured build (with three or more bots they don't all follow the plan)
   */
  constructor(sim, id, opts = {}) {
    this.sim = sim;
    this.id = id;
    this.top = opts.top ?? sim;
    this.lane = opts.lane ?? 0;
    this.mode = opts.mode ?? sim.mode ?? 'easy';
    this.role = opts.role ?? 'generalist';
    this.loose = !!opts.loose;
    this.rnd = seeded(opts.seed ?? Math.floor(Math.random() * 1e9));
    this.sayFn = opts.say ?? (() => {});
    const lo = botLoadout(this.mode, this.role, this.rnd, hasSpots);
    this.loadout = lo.towers;
    this.phase = lo.phase;
    this.margin = (MARGIN[this.mode] ?? 1.5) * (this.role === 'dps' ? 1.15 : 1);
    this.t = 0;
    this.thinkT = 1.5 + this.rnd() * 2; // a moment before the first move, like a person
    this.thinkEvery = 0.7 + this.rnd() * 0.5;
    this.abilityT = 0;
    this.sayT = -99;
    this.leakT = -99;
    this.skipT = 0;
    this.sendT = 0;
    this.started = false; // wave 1 has started
    this.cleared = false; // a wave has been cleared (so wave.index is the last wave, not the next)
    this.won = false;
    this.pos = { x: PLAYER_SPAWN.x + (this.rnd() - 0.5) * 8, z: PLAYER_SPAWN.z + 4 + this.rnd() * 4 };
    this.yaw = 0;
    this.moving = false;
    this.goal = null;
    this.wanderT = 4 + this.rnd() * 6;
    this.stuck = 0;
    this.plan = null; // { type, x, z, cost, then } while walking somewhere to build
    this.orders = []; // what players asked for, oldest first
    this.hold = { build: null, defend: 0, farm: 0, save: 0 };
    this.failed = new Map(); // tower id -> sim time until its upgrade is tried again
    this.abFail = new Map(); // "tower:ability" -> sim time until it's tried again
    this.patrolled = new Set(); // towers whose patrol zone is set
  }

  get player() {
    return this.sim.players.get(this.id);
  }

  get cash() {
    return this.player?.cash ?? 0;
  }

  /** Says `text` in chat (not more than once every few seconds, so bots don't flood it). */
  say(text, force = false) {
    if (!force && this.t - this.sayT < 6) return;
    this.sayT = this.t;
    this.sayFn(text);
  }

  pick(list, n = null) {
    const s = list[Math.floor(this.rnd() * list.length)];
    return n == null ? s : s.replace('%s', n.toLocaleString());
  }

  /** Its avatar, in world coordinates: { x, y, z, yaw, m (moving), g (on the ground) }. */
  avatar() {
    return { x: this.pos.x, y: heightAt(this.pos.x, this.pos.z), z: this.pos.z + laneOz(this.lane), yaw: this.yaw, m: this.moving ? 1 : 0, g: 1 };
  }

  // ---------------------------------------------------------------- every tick

  /** Advances the bot by `dt` sim seconds. `events`: the sim's events of this tick (leaks, waves). */
  tick(dt, events = []) {
    if (this.sim.over) {
      if (!this.won && this.sim.over === 1) {
        this.won = true;
        if (this.rnd() < 0.7) this.say(this.pick(SAY.gg), true);
      }
      this.moving = false;
      return;
    }
    this.t += dt;
    for (const ev of events) {
      if (ev.k === 'leak') {
        if (this.t - this.leakT > 20 && this.rnd() < 0.35) this.say(this.pick(SAY.leak));
        this.leakT = this.t;
      } else if (ev.k === 'waveStart') {
        this.started = true;
        if (ev.i > 0 && ev.i % 5 === 4 && this.rnd() < 0.3) this.say(this.pick(SAY.wave));
      } else if (ev.k === 'waveClear') this.cleared = true;
    }
    this.walk(dt);
    if (this.t >= this.thinkT) {
      this.thinkT = this.t + this.thinkEvery * (0.8 + this.rnd() * 0.4);
      try {
        this.think();
      } catch (e) {
        console.error('bot', this.id, e);
      }
    }
  }

  /** Walks toward its goal; builds when it gets there; wanders a little when idle. */
  walk(dt) {
    const g = this.goal;
    if (!g) {
      this.moving = false;
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = 6 + this.rnd() * 10;
        if (this.rnd() < 0.6) this.goal = this.idleSpot();
      }
      return;
    }
    const dx = g.x - this.pos.x;
    const dz = g.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d <= (this.plan ? ARRIVE : 1.5)) {
      this.goal = null;
      this.moving = false;
      if (this.plan) this.build();
      return;
    }
    const step = Math.min(d, WALK * dt);
    let nx = this.pos.x + (dx / d) * step;
    let nz = this.pos.z + (dz / d) * step;
    if (!walkable(nx, nz)) {
      // Slide along whatever is in the way; give up (and build from here) if stuck for a while.
      if (walkable(nx, this.pos.z)) nz = this.pos.z;
      else if (walkable(this.pos.x, nz)) nx = this.pos.x;
      else {
        this.stuck += dt;
        if (this.stuck > 2.5) {
          this.stuck = 0;
          this.goal = null;
          if (this.plan) this.build();
        }
        this.moving = false;
        return;
      }
    }
    this.stuck = 0;
    this.yaw = Math.atan2(nx - this.pos.x, nz - this.pos.z);
    this.pos.x = nx;
    this.pos.z = nz;
    this.moving = true;
  }

  /** Somewhere to stand around: by one of its towers, or near the base. */
  idleSpot() {
    const mine = [...this.sim.towers.values()].filter((t) => t.owner === this.id);
    const base = path.points[path.points.length - 1];
    const at = mine.length && this.rnd() < 0.7 ? mine[Math.floor(this.rnd() * mine.length)] : base;
    for (let k = 0; k < 8; k++) {
      const a = this.rnd() * Math.PI * 2;
      const r = 5 + this.rnd() * 6;
      const x = at.x + Math.cos(a) * r;
      const z = at.z + Math.sin(a) * r;
      if (walkable(x, z) && path.distanceTo(x, z) > 4) return { x, z };
    }
    return null;
  }

  /** Walks to (x, z) and does `then` there (`then` may be null: just a stroll). */
  goTo(x, z, plan = null) {
    this.plan = plan;
    // Stand a little to the side of the spot, not on it.
    const a = Math.atan2(this.pos.z - z, this.pos.x - x);
    this.goal = { x: x + Math.cos(a) * 2.5, z: z + Math.sin(a) * 2.5 };
  }

  /** Places the tower the bot walked over for. */
  build() {
    const p = this.plan;
    this.plan = null;
    if (!p) return;
    const err = this.sim.action(this.id, { a: 'place', type: p.type, x: p.x, z: p.z, yaw: this.yaw + Math.PI });
    if (err) {
      // Someone built there first (or cash went): find another spot next think.
      this.thinkT = Math.min(this.thinkT, this.t + 0.3);
      return;
    }
    let placed = null;
    for (const t of this.sim.towers.values()) if (t.owner === this.id && t.x === p.x && t.z === p.z) placed = t;
    if (p.then && placed) p.then(placed);
    // Stay by it a moment, then carry on.
    this.wanderT = 2 + this.rnd() * 4;
  }

  // ---------------------------------------------------------------- thinking

  /** The wave about to start (or on now), 0-based. */
  get nextWave() {
    const w = this.sim.wave;
    return w.state === 'wave' || !this.cleared ? w.index : w.index + 1;
  }

  /** 0 early game, 1 mid game, 2 late game. */
  get gamePhase() {
    const share = this.nextWave / Math.max(1, this.sim.waves.length);
    return share < 0.25 ? 0 : share < 0.55 ? 1 : 2;
  }

  /** Towers on this map that count (not holograms, not corrupted by VOID). */
  get teamTowers() {
    return [...this.sim.towers.values()].filter((t) => !t.holo && !t.corrupt);
  }

  think() {
    const sim = this.sim;
    if (!this.player) return;
    if (this.plan) return; // on the way to build something
    if (this.doOrders()) return;
    this.useAbilities();
    if (this.sim.vs) this.versusSends();
    this.maybeSkip();
    this.buy();
  }

  /**
   * How well the team is set for the coming waves: the team's useful damage per second over
   * what the next waves need. Below the bot's margin, it buys defense.
   */
  readiness(th, towers) {
    const sim = this.sim;
    const w = this.nextWave;
    let supply = 0;
    for (const t of towers) {
      const def = TOWERS[t.type];
      const l = def.levels[t.level];
      const power = levelPower(def, l);
      if (!power) continue;
      const share = hitShare(def, t.level, th);
      const sat = def.kind === 'spawner' ? 1 : Math.min(1, cover(t.x, t.z, l.range ?? 10) / SAT);
      supply += power * share * sat;
    }
    let demand = 1;
    for (let i = w; i < w + 3; i++) demand = Math.max(demand, waveLoad(sim, i) / Math.max(10, waveTime(sim, i, path.length)));
    return supply / demand;
  }

  get danger() {
    if (this.t - this.leakT < 12) return true;
    const sim = this.sim;
    if (sim.baseHp < sim.maxBaseHp * 0.5) return true;
    for (const e of sim.enemies.values()) if (e.dist > path.length * 0.62 && !e.noCash) return true;
    return false;
  }

  /**
   * The value of tower `type` at `level` standing at `at`: its damage per second x how much of the
   * coming waves it can hit x how much track it sees. Support towers: the boost they give the
   * attack towers in their aura.
   */
  value(type, level, th, at, towers) {
    const def = TOWERS[type];
    const l = def.levels[level];
    if (!l) return 0;
    const kind = def.kind ?? 'attack';
    if (kind === 'income') return 0;
    if (kind === 'support') {
      const aura = l.aura ?? l.range ?? 10;
      const boost = (l.rangeBoost || 0) + (l.musicBoost || 0) + (l.splashBoost || 0) * 0.5 + (l.shield ? 0.12 : 0) + (l.firework ? 0.2 : 0) + (l.scare ? 0.15 : 0) + (l.dilate ? 0.2 : 0) + (l.abilities?.length ? 0.05 : 0);
      let sum = 0;
      for (const t of towers) {
        if ((t.x - at.x) ** 2 + (t.z - at.z) ** 2 > aura * aura) continue;
        const d = TOWERS[t.type];
        if ((d.kind ?? 'attack') === 'income' || d.kind === 'support') continue;
        sum += levelPower(d, d.levels[t.level]) * Math.min(1, cover(t.x, t.z, d.levels[t.level].range ?? 10) / SAT);
      }
      return boost * sum;
    }
    const power = levelPower(def, l);
    if (!power) return 0;
    const sat = kind === 'spawner' ? 1 : Math.min(1, cover(at.x, at.z, l.range ?? 10) / SAT);
    return power * Math.max(0.03, hitShare(def, level, th)) * sat;
  }

  /**
   * The best deal on a tower: the later level that adds the most value per dollar on the way
   * there (buying through a dull level to reach hidden detection). `steps`: the next levels,
   * [{ type, level, cost (total from here) }] (see ladder / newLadder). Returns { cost (of the
   * first step), ratio }.
   */
  deal(have, steps, th, at, towers) {
    if (!steps.length || !at) return null;
    let ratio = 0;
    for (const s of steps) if (s.cost > 0) ratio = Math.max(ratio, (this.value(s.type, s.level, th, at, towers) - have) / s.cost);
    return { cost: steps[0].cost, ratio };
  }

  /** The first three levels of a new tower of `type`, with their total cost. */
  newLadder(type) {
    const def = TOWERS[type];
    const steps = [];
    for (let k = 0; k < def.levels.length && k < 3; k++) steps.push({ type, level: k, cost: k ? costUpTo(type, k) - towerCost(def, !!this.sim.vs) + towerCost(def, !!this.sim.vs) : towerCost(def, !!this.sim.vs) });
    return steps;
  }

  /**
   * The next three upgrades of tower `t` (Top path while it goes on, then Bottom), with their
   * total cost from here: [{ type, level, cost, path }]. Works for branching and crosspath towers.
   */
  ladder(t, towers, buffs = computeBuffs(towers)) {
    const steps = [];
    let at = t;
    let paid = 0;
    for (let k = 0; k < 3; k++) {
      let up = nextUpgrade(at, 'top', towers, buffs);
      let pathName = 'top';
      if (!up) {
        up = nextUpgrade(at, 'bottom', towers, buffs);
        pathName = 'bottom';
      }
      if (!up) break;
      paid += up.cost;
      steps.push({ type: up.type, level: at.level + 1, cost: paid, path: pathName, next: up.next });
      at = { ...at, type: up.type, level: at.level + 1 };
    }
    return steps;
  }

  /** The next upgrade of tower `t` (top path, else bottom), with its price: { type, next, cost, path }. */
  upgradeOf(t, towers) {
    return this.ladder(t, towers)[0] ?? null;
  }

  /** What it would buy now, best first: new towers at their best spots and upgrades of its own. */
  options(th, towers, need) {
    const sim = this.sim;
    const out = [];
    const owned = {};
    const wavesLeft = Math.max(0, sim.waves.length - this.nextWave);
    const danger = this.danger;
    const defenseFine = need >= this.margin && !danger && this.t > this.hold.defend;
    let mine = 0;
    let supports = 0;
    for (const t of towers) {
      if (t.owner !== this.id) continue;
      mine++;
      if (TOWERS[t.type].kind === 'support') supports++;
    }
    // Players upgrade what they have rather than carpet the map: past a handful of towers, new
    // ones lose most of their appeal (upgrades gain a little), and one support tower serves
    // about five attack towers.
    const newPenalty = mine < 6 ? 1 : mine < 12 ? 0.45 : 0.12;
    const supportRoom = supports < 1 + Math.floor((mine - supports) / 5);
    const buffs = computeBuffs(towers);
    for (const t of towers) {
      if (t.owner !== this.id) continue;
      const root = rootType(t.type);
      owned[root] = (owned[root] ?? 0) + 1;
      if ((this.failed.get(t.id) ?? 0) > this.t) continue;
      const def = TOWERS[t.type];
      const l = def.levels[t.level];
      const steps = this.ladder(t, towers, buffs);
      const up = steps[0];
      if (!up) continue;
      const kind = def.kind ?? 'attack';
      if (kind === 'income') {
        // A farm upgrade is worth it while it pays for itself well before the game ends.
        const gain = (up.next.income ?? 0) - (l.income ?? 0) + ((up.next.oil ? up.next.oil.pay / up.next.oil.every : 0) - (l.oil ? l.oil.pay / l.oil.every : 0)) * 40;
        if (!danger && gain * wavesLeft > up.cost * 1.8 && (defenseFine || this.role === 'farmer' || this.t < this.hold.farm)) out.push({ t, up, cost: up.cost, ratio: (this.role === 'farmer' ? 2 : 1) * (sim.vs ? 20 : 60) / up.cost, kind });
        continue;
      }
      if (kind === 'support') {
        // Worth upgrading once it has a few towers to boost, more so when the defense is fine.
        const covered = coveredBy(t.x, t.z, l.aura ?? l.range ?? 10, towers);
        if (covered < 3) continue;
        const gain = this.value(up.type, t.level + 1, th, t, towers) - this.value(t.type, t.level, th, t, towers);
        out.push({ t, up, cost: up.cost, ratio: Math.max(gain / up.cost, (covered * (defenseFine ? 40 : 12)) / up.cost), kind });
        continue;
      }
      const d = this.deal(this.value(t.type, t.level, th, t, towers), steps, th, t, towers);
      if (d && d.ratio > 0) out.push({ t, up, cost: d.cost, ratio: d.ratio * 1.15, kind });
    }
    const hasUpgrade = out.some((o) => o.t);
    const phase = this.gamePhase + (this.loose ? 1 : 0);
    const players = sim.vs ? 1 : sim.players.size;
    for (const type of this.loadout) {
      const def = TOWERS[type];
      const kind = def.kind ?? 'attack';
      if ((owned[type] ?? 0) >= towerLimit(def, players) + (this.player.extraSlots || 0)) continue;
      const cost = towerCost(def, !!sim.vs);
      if (kind === 'income') {
        const wantFarm = this.role === 'farmer' || this.t < this.hold.farm || (defenseFine && this.role !== 'dps' && wavesLeft > sim.waves.length * 0.5);
        const l = def.levels[0];
        const income = (l.income ?? 0) + (l.oil ? (l.oil.pay / l.oil.every) * 40 : 0);
        if (!wantFarm || danger || income * wavesLeft < cost * 1.8 || this.nextWave > sim.waves.length * 0.6) continue;
        const spot = quietSpot(type, towers, this.buildHint());
        if (spot) out.push({ type, spot, cost, ratio: (this.role === 'farmer' ? 3 : 1) * (sim.vs ? 20 : 60) / cost, kind });
        continue;
      }
      if (kind === 'support') {
        if (!supportRoom) continue;
        const spot = supportSpot(type, towers, this.loose ? 2 : 3, this.buildHint());
        if (!spot) continue;
        const v = this.value(type, 0, th, spot, towers);
        if (v > 0) out.push({ type, spot, cost, ratio: ((v / cost) * (defenseFine ? 1.4 : 0.8)) / (1 + supports), kind });
        continue;
      }
      // Attack towers and summoners. Early-game towers first; dearer ones once the game goes on
      // (or when the bot is rich enough that it doesn't matter).
      if ((this.phase[type] ?? 1) > phase && this.cash < cost * 2.5) continue;
      if (mine >= 12 && hasUpgrade && (owned[type] ?? 0) >= 2) continue; // enough towers: upgrade them instead
      const needsTrack = kind !== 'spawner' || !!def.levels[0].range;
      const spot = needsTrack ? attackSpot(type, 0, towers, this.buildHint()) : quietSpot(type, towers, this.buildHint());
      if (!spot) continue;
      const d = this.deal(0, this.newLadder(type), th, spot, towers);
      if (d && d.ratio > 0) out.push({ type, spot, cost, ratio: d.ratio * (needsTrack ? 1 : 0.9) * newPenalty, kind });
    }
    out.sort((a, b) => b.ratio - a.ratio);
    return out;
  }

  /** Where a player asked the bot to build (for a while after they asked). */
  buildHint() {
    const b = this.hold.build;
    return b && b.until > this.t ? b : null;
  }

  /** Buys the best thing it can (or saves up for it). */
  buy() {
    const sim = this.sim;
    if (this.t < this.hold.save) return;
    const towers = this.teamTowers;
    const th = threats(sim, this.nextWave);
    const need = this.readiness(th, towers);
    const danger = this.danger;
    const options = this.options(th, towers, need);
    if (!options.length) return;
    const defense = (o) => o.kind !== 'income';
    let pick = options[0];
    // Short on defense: the best defensive buy; in real trouble, the best one it can afford now.
    if (need < this.margin || danger || this.t < this.hold.defend) {
      pick = options.find(defense) ?? pick;
      if (pick.cost > this.cash && (danger || need < this.margin * 0.6)) pick = options.find((o) => defense(o) && o.cost <= this.cash) ?? null;
    }
    if (!pick) return;
    if (pick.cost > this.cash) {
      // Save up for it, unless it's far off: then buy the next best thing that's worth it now.
      const alt = options.find((o) => o.cost <= this.cash && o.ratio >= pick.ratio * 0.5);
      if (!alt || pick.cost < this.cash * 1.6) return;
      pick = alt;
    }
    this.spend(pick);
  }

  spend(o) {
    if (o.t) {
      const err = this.sim.action(this.id, { a: 'upgrade', id: o.t.id, path: o.up.path });
      if (err) this.failed.set(o.t.id, this.t + 15);
      return !err;
    }
    const d = Math.hypot(o.spot.x - this.pos.x, o.spot.z - this.pos.z);
    const plan = { type: o.type, x: o.spot.x, z: o.spot.z, then: o.then ?? null };
    if (d <= ARRIVE + 2) {
      this.plan = plan;
      this.build();
    } else this.goTo(o.spot.x, o.spot.z, plan);
    return true;
  }

  // ---------------------------------------------------------------- abilities, skips, sends

  /** Fires one ability that's worth firing right now. */
  useAbilities() {
    const sim = this.sim;
    if (this.t - this.abilityT < 1.2 || !sim.enemies.size) return;
    const enemies = [...sim.enemies.values()];
    const boss = enemies.find((e) => ENEMIES[e.type]?.boss);
    for (const t of sim.towers.values()) {
      if (t.owner !== this.id || t.holo || t.corrupt) continue;
      const s = TOWERS[t.type].levels[t.level];
      for (const ab of s.abilities ?? []) {
        if (DENY.has(ab.key) || (t.cd?.[ab.key] ?? 0) > 0) continue;
        const fk = `${t.id}:${ab.key}`;
        if ((this.abFail.get(fk) ?? 0) > this.t) continue;
        if (ab.cost && this.cash < ab.cost * 2) continue;
        let m = { a: 'ability', id: t.id, key: ab.key };
        if (ab.key === 'patrol') {
          // A helicopter's zone: over the most track it can reach, once.
          if (this.patrolled.has(t.id)) continue;
          const spot = attackSpot(rootType(t.type), 0, [], null) ?? { x: t.x, z: t.z };
          const reach = ab.reach ?? 40;
          const d = Math.hypot(spot.x - t.x, spot.z - t.z);
          const k = d > reach ? reach / d : 1;
          m = { ...m, x: t.x + (spot.x - t.x) * k, z: t.z + (spot.z - t.z) * k };
          this.patrolled.add(t.id);
        } else if (ab.aim) {
          const c = this.cluster(enemies, ab.radius ?? 6, ab.reach ? { x: t.x, z: t.z, r: ab.reach } : null);
          if (!c || (c.n < 3 && !c.boss)) continue;
          m = { ...m, x: c.x, z: c.z };
        } else if (ab.unit || ab.vehicle || ab.all || ab.global) {
          if (sim.wave.state !== 'wave') continue;
        } else {
          // Boosts and blasts: when there's a crowd or a boss near the tower.
          const r = (s.range ?? s.aura ?? 15) * 1.3;
          let near = 0;
          let bossNear = false;
          for (const e of enemies) {
            if ((e.x - t.x) ** 2 + (e.z - t.z) ** 2 > r * r) continue;
            near++;
            if (ENEMIES[e.type]?.boss) bossNear = true;
          }
          if (near < 4 && !bossNear && !(boss && ab.duration)) continue;
        }
        const err = sim.action(this.id, m);
        if (err) {
          this.abFail.set(fk, this.t + 20);
          continue;
        }
        this.abilityT = this.t;
        return;
      }
    }
  }

  /** The spot (on the path) with the most zombies within `radius`, or null. `within`: { x, z, r } the spot must be in. */
  cluster(enemies, radius, within) {
    let best = null;
    for (const e of enemies) {
      if (within && Math.hypot(e.x - within.x, e.z - within.z) > within.r) continue;
      let n = 0;
      let boss = false;
      for (const o of enemies) {
        if ((o.x - e.x) ** 2 + (o.z - e.z) ** 2 > radius * radius) continue;
        n++;
        if (ENEMIES[o.type]?.boss) boss = true;
      }
      if (!best || n > best.n) best = { x: e.x, z: e.z, n, boss };
    }
    return best;
  }

  /** Votes to skip the wait when the team's set and a player (or everyone's a bot) wants to go. */
  maybeSkip() {
    const sim = this.sim;
    const top = this.top;
    const w = sim.wave;
    const canSkip = (w.state === 'intermission' && w.countdown > 2.5) || sim.canSkipWave;
    if (!canSkip || sim.skipVotes?.has(this.id) || top.skipVotes?.has(this.id)) {
      this.skipT = 0;
      return;
    }
    const humansVoted = w.votes > 0 || (top.wave?.votes ?? 0) > 0;
    const allBots = [...(top.players ?? sim.players).values()].every((p) => String(p.id).startsWith('bot'));
    if (!humansVoted && !allBots) return;
    if (!this.skipT) this.skipT = this.t + 1.5 + this.rnd() * 2.5;
    if (this.t < this.skipT) return;
    const need = this.readiness(threats(sim, this.nextWave), this.teamTowers);
    if (need >= this.margin || humansVoted) {
      top.action(this.id, { a: 'skip' });
      this.skipT = 0;
    }
  }

  /** Versus: with the lane safe and cash to spare, sends zombies at its target. */
  versusSends() {
    const sim = this.sim;
    const vs = sim.vs;
    if (!vs?.started || this.t < this.sendT) return;
    this.sendT = this.t + 5 + this.rnd() * 5;
    const need = this.readiness(threats(sim, this.nextWave), this.teamTowers);
    if (need < this.margin * 1.1) return;
    const wave = vs.wave.index + 1;
    const reserve = 250 + wave * 40;
    const picks = Object.entries(VERSUS.sends).filter(([, s]) => s.minWave <= wave && s.cost <= this.cash - reserve).sort((a, b) => b[1].cost - a[1].cost);
    if (picks.length) vs.action(this.id, { a: 'send', type: picks[0][0] });
  }

  // ---------------------------------------------------------------- orders from players

  /**
   * A player's order from the wheel: { cmd, id (a tower), x, z }. cmd: 'upgrade' | 'sell' | 'move'
   * (that tower) | 'build' | 'defend' | 'farm' | 'save'. Returns what the bot answers (or null when
   * the order isn't for it).
   */
  order(o) {
    const sim = this.sim;
    if (sim.over) return null;
    const t = o.id != null ? sim.towers.get(o.id) : null;
    const mine = t && t.owner === this.id;
    switch (o.cmd) {
      case 'upgrade': {
        if (!t) return null;
        if (!mine) return null;
        if (!this.upgradeOf(t, this.teamTowers)) return this.pick(SAY.maxed);
        this.orders.push({ kind: 'upgrade', id: t.id, until: this.t + 90 });
        return this.pick(SAY.ok);
      }
      case 'sell': {
        if (!t || !mine) return null;
        const err = sim.action(this.id, { a: 'sell', id: t.id });
        return err ? null : this.pick(SAY.sold);
      }
      case 'move': {
        if (!t || !mine) return null;
        this.orders.push({ kind: 'move', id: t.id, x: Number(o.x), z: Number(o.z), until: this.t + 30 });
        return this.pick(SAY.ok);
      }
      case 'build':
        if (!Number.isFinite(Number(o.x)) || !Number.isFinite(Number(o.z))) return null;
        this.hold.build = { x: Number(o.x) - (sim.vs ? 0 : 0), z: Number(o.z), until: this.t + 90 };
        this.hold.defend = Math.max(this.hold.defend, this.t + 30);
        return this.pick(SAY.build);
      case 'defend':
        this.hold.defend = this.t + 60;
        this.hold.save = 0;
        return this.pick(SAY.defend);
      case 'farm':
        if (!this.loadout.some((k) => (TOWERS[k].kind ?? 'attack') === 'income')) return this.pick(SAY.noFarm);
        this.hold.farm = this.t + 90;
        return this.pick(SAY.farm);
      case 'save':
        this.hold.save = this.t + 45;
        return this.pick(SAY.save);
      default:
        return null;
    }
  }

  /** Works on the oldest order. Returns true while an order is being handled (nothing else is bought). */
  doOrders() {
    const sim = this.sim;
    while (this.orders.length) {
      const o = this.orders[0];
      const t = sim.towers.get(o.id);
      if (!t || t.owner !== this.id || o.until < this.t) {
        this.orders.shift();
        continue;
      }
      if (o.kind === 'upgrade') {
        const up = this.upgradeOf(t, this.teamTowers);
        if (!up || (o.to != null && t.level >= o.to)) {
          this.orders.shift();
          continue;
        }
        if (up.cost > this.cash) {
          if (!o.told) {
            o.told = true;
            this.say(this.pick(SAY.broke, up.cost - this.cash));
          }
          return true; // saving up for it
        }
        const err = sim.action(this.id, { a: 'upgrade', id: t.id, path: up.path });
        if (err) this.orders.shift();
        return true;
      }
      if (o.kind === 'move') {
        this.orders.shift();
        const type = rootType(t.type);
        const level = t.level;
        const near = Number.isFinite(o.x) ? { x: o.x, z: o.z } : null;
        const others = this.teamTowers.filter((x) => x.id !== t.id);
        const def = TOWERS[type];
        const kind = def.kind ?? 'attack';
        const quiet = kind === 'income' || (kind === 'spawner' && !def.levels[0].range);
        // As close to the asked spot as the tower can usefully go; failing that, its best spot anywhere.
        const spot = (quiet ? quietSpot(type, others, near) : kind === 'support' ? supportSpot(type, others, 1, near) : attackSpot(type, 0, others, near)) ?? (quiet ? quietSpot(type, others) : attackSpot(type, 0, others));
        if (!spot) continue;
        if (sim.action(this.id, { a: 'sell', id: t.id })) continue;
        const then = (placed) => {
          if (level > 0) this.orders.push({ kind: 'upgrade', id: placed.id, to: level, until: this.t + 240 });
        };
        this.spend({ type, spot, cost: towerCost(def, !!sim.vs), then });
        return true;
      }
      this.orders.shift();
    }
    return false;
  }
}
