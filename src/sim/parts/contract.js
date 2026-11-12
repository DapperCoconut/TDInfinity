// Contracts (see lastlaugh.js). Last Laugh on Shattered Court: the little jester's wheel, the open
// board (enemies take the shortest way, fences block tiles), and the JESTER boss's moves.
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { ENEMIES, GAME, waveGroups } from '../../config.js';
import { CONTRACTS } from '../../lastlaugh.js';
import { COURT_FENCES, mapKey } from '../map.js';
import { COURT_CELL, COURT_NOBUILD, COURT_CARDS, COURT_CRYSTALS, courtCell, courtId, courtIdx, courtPoints, courtShortest, courtTile } from '../maps.js';
import { BEELINE, path, setMapRoutes } from '../path.js';
import { r2, rand } from './shared.js';

const TOWER_R = 1.6 * 0.8; // a tower's footprint (as map.js checks it)
const FOOT = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];

export class SimContract {

  /** Sets up contract `key` for this game, if it fits the map (called by the constructor). */
  initContract(key) {
    this.contract = null;
    this.fences = new Map(); // court tile id -> the player who put the fence there
    COURT_FENCES.clear();
    const def = CONTRACTS[key];
    if (!def || this.vs || String(mapKey).split(':')[0] !== def.map) return;
    // The little jester stands on the grass island in the middle of the board.
    const [x, z] = courtCell(20, 16);
    this.contract = { key, spins: 0, open: false, gone: false, armed: false, boost: false, done: false, jester: 0, x: x + 3.5, z: z + 2, pending: [], t: 0 };
  }

  /** What the next spin costs. */
  spinCost() {
    const c = this.contract;
    const def = CONTRACTS[c.key];
    return Math.round(def.spinCost * def.spinGrow ** c.spins * (this.cashMult || 1));
  }

  /** What one fence costs. */
  fenceCost() {
    return Math.round(CONTRACTS[this.contract.key].fenceCost * (this.cashMult || 1));
  }

  /** A player pays to spin the jester's wheel. Returns an error, or null. */
  spinWheel(p) {
    const c = this.contract;
    if (!c) return 'There is no wheel here';
    if (c.gone) return 'The jester has gone';
    const cost = this.spinCost();
    if (p.cash < cost) return `Not enough cash! A spin costs $${cost}`;
    p.cash -= cost;
    c.spins++;
    const def = CONTRACTS[c.key];
    if (c.spins >= def.spins) {
      // Yellow! The jester leaves, and the final boss will be the JESTER.
      c.gone = true;
      c.armed = true;
      this.events.push({ k: 'wheel', by: p.id, n: c.spins, win: 1 });
      return null;
    }
    // Red: more enemies from the wave. The first red one opens the board.
    const n = Math.round(def.extra[0] + def.extra[1] * (c.spins - 1));
    this.events.push({ k: 'wheel', by: p.id, n: c.spins, win: 0, extra: n, ...(c.open ? {} : { open: 1 }) });
    if (!c.open) this.openCourt();
    const w = this.wave;
    let list = waveGroups(Math.min(w.index, this.waves.length - 1), this.waves).filter(([type, , , , x]) => ENEMIES[type] && !ENEMIES[type].boss && !(x && typeof x === 'object' && x.boss));
    if (!list.length) list = this.waves.flatMap((_, i) => waveGroups(i, this.waves)).filter(([type]) => ENEMIES[type] && !ENEMIES[type].boss);
    for (let i = 0; i < n && list.length; i++) {
      const [type, , , , x] = list[Math.floor(Math.random() * list.length)];
      c.pending.push({ t: i * 0.6, type, hp: typeof x === 'number' ? x : undefined, mods: x && typeof x === 'object' ? x : undefined });
    }
    return null;
  }

  /** The first red spin: the board opens, and enemies take the shortest way from now on. */
  openCourt() {
    this.contract.open = true;
    if (!this.relayCourt()) this.relayCourt(true);
  }

  /** Court tiles a tower's footprint touches. */
  towerTiles(t, out = new Set()) {
    for (const [dx, dz] of FOOT) {
      const [c, i] = courtIdx(t.x + dx * TOWER_R, t.z + dz * TOWER_R);
      out.add(courtId(c, i));
    }
    return out;
  }

  /** Tiles enemies can't walk on: fences and towers (and `extra`). */
  courtBlocked(extra = null, noTowers = false) {
    const out = new Set(this.fences.keys());
    if (!noTowers) for (const t of this.towers.values()) this.towerTiles(t, out);
    if (extra != null) out.add(extra);
    return out;
  }

  /**
   * Lays the open court's route again (the shortest way round the fences and towers) and moves
   * every enemy and unit onto it, each keeping how far it still has to go. Returns false if
   * there's no way through (nothing changes then).
   */
  relayCourt(noTowers = false) {
    const steps = new Int16Array(40 * 41);
    const tiles = courtShortest(this.courtBlocked(null, noTowers), steps);
    if (!tiles) return false;
    const key = tiles.map(([c, i]) => courtId(c, i)).join();
    if (key === this.contract.routeKey) return true;
    // How far everyone still has to go, measured on the new route.
    const N = tiles.length;
    const left = (o) => {
      const [c, i] = courtIdx(o.x, o.z);
      const s = courtTile(c, i) ? steps[courtId(c, i)] : -1;
      return s >= 0 ? COURT_CELL * (N - s) : null; // the tile s steps from T40 is that far down the new route
    };
    const movers = [];
    for (const e of this.enemies.values()) if (e.route !== BEELINE && e.x != null) movers.push([e, left(e)]);
    for (const u of this.units.values()) if (u.x != null && !u.def?.free) movers.push([u, left(u)]);
    const oldLen = path.length;
    this.contract.routeKey = key;
    this.contract.tiles = tiles;
    setMapRoutes([courtPoints(tiles)]);
    for (const [o, at] of movers) {
      // Already standing on the new route: stay put. Otherwise: the same distance from the base.
      const onIt = path.distanceTo(o.x, o.z) < 0.6;
      const d = onIt ? path.project(o.x, o.z) : at ?? path.length - (oldLen - o.dist);
      o.dist = Math.max(0, Math.min(path.length, d));
      path.at(o.dist, o, 0);
      o.x += -o.dz * (o.lateral || 0);
      o.z += o.dx * (o.lateral || 0);
    }
    this.events.push({ k: 'courtRoute' });
    return true;
  }

  /** Can a fence go on tile (c, i)? Returns an error, or null. */
  fenceFail(c, i) {
    if (!this.contract?.open) return 'Fences only work once the jester has opened the board';
    if (!courtTile(c, i)) return 'Fences go on the floor tiles';
    const id = courtId(c, i);
    if (this.fences.has(id)) return 'There is a fence there already';
    if ([...COURT_NOBUILD, ...COURT_CRYSTALS, ...COURT_CARDS].some(([nc, ni]) => nc === c && ni === i)) return "A fence can't go there";
    for (const t of this.towers.values()) if (this.towerTiles(t).has(id)) return 'A tower is standing there';
    if (!courtShortest(this.courtBlocked(id))) return "You can't block the base off completely!";
    return null;
  }

  /** A player puts a fence on tile (c, i). */
  placeFence(p, c, i) {
    c = Math.floor(Number(c));
    i = Math.floor(Number(i));
    const err = this.fenceFail(c, i);
    if (err) return err;
    const cost = this.fenceCost();
    if (p.cash < cost) return `Not enough cash! A fence costs $${cost}`;
    p.cash -= cost;
    this.fences.set(courtId(c, i), p.id);
    COURT_FENCES.add(courtId(c, i));
    this.relayCourt();
    return null;
  }

  /** A player takes their fence off tile (c, i) and gets some of its price back. */
  removeFence(p, c, i) {
    const id = courtId(Math.floor(Number(c)), Math.floor(Number(i)));
    const owner = this.fences.get(id);
    if (owner == null) return 'There is no fence there';
    if (owner !== p.id) return "That's someone else's fence";
    this.fences.delete(id);
    COURT_FENCES.delete(id);
    p.cash += Math.floor(this.fenceCost() * GAME.sellRatio);
    this.relayCourt();
    return null;
  }

  /** Every tick: the extra enemies from red spins, and the JESTER's boost. */
  contractTick(dt) {
    const c = this.contract;
    if (c.pending.length) {
      c.t += dt;
      while (c.pending.length && c.pending[0].t <= c.t) this.spawnQueued(c.pending.shift());
      if (!c.pending.length) c.t = 0;
    }
    const j = c.jester && this.enemies.get(c.jester);
    if (j && !c.boost && j.dist >= path.length * CONTRACTS[c.key].boost.at) {
      c.boost = true;
      this.events.push({ k: 'jesterBoost' });
    }
  }

  /** Last Laugh: the final boss becomes the JESTER once the wheel has landed on yellow. */
  contractSwap(q) {
    const c = this.contract;
    if (!c?.armed || c.jester || q.type !== this.dm.boss || this.wave.index < this.waves.length - 1) return null;
    const def = CONTRACTS[c.key];
    const e = this.spawn(def.boss, { hp: Math.round((q.hp ?? ENEMIES[q.type].hp) * def.bossHp), mods: q.mods, wave: true });
    c.jester = e.id;
    return e;
  }

  /** The JESTER is dead: the contract is done. */
  jesterDown() {
    const c = this.contract;
    if (!c || c.done) return;
    c.done = true;
    c.boost = false;
    this.events.push({ k: 'contractDone', key: c.key });
  }

  /** Last Laugh: towers hit harder and faster while the JESTER's boost is on. */
  get llBoost() {
    return this.contract?.boost ? CONTRACTS[this.contract.key].boost : null;
  }

  /** The JESTER's moves: calling in random enemies and throwing exploding dice. */
  jesterMoves(e, def, dt) {
    if (e.stop) return;
    const J = def.jester;
    const T = (e.jT ??= { summon: J.summon.every * 0.5, dice: J.dice.every * 0.5 });
    if ((T.summon -= dt) <= 0) {
      T.summon = J.summon.every;
      const kinds = (this.jesterKinds ??= [...new Set(this.waves.flatMap((_, i) => waveGroups(i, this.waves)).map(([type]) => type))].filter((k) => ENEMIES[k] && !ENEMIES[k].boss));
      const n = J.summon.n[0] + Math.floor(Math.random() * (J.summon.n[1] - J.summon.n[0] + 1));
      for (let k = 0; k < n && kinds.length; k++) {
        const type = kinds[Math.floor(Math.random() * kinds.length)];
        this.reborn.push({ route: e.route, type, dist: Math.max(0, e.dist - 2 - k * 1.5), lateral: 0, hpScale: 1, owner: e.id });
      }
      if (kinds.length) this.events.push({ k: 'summon', e: e.id, type: kinds[0] });
    }
    if ((T.dice -= dt) <= 0) {
      T.dice = J.dice.every;
      // Exploding dice land on random enemies: each blast hurts the enemies around it by the roll.
      const D = J.dice;
      const list = [...this.enemies.values()].filter((o) => o !== e && !o.remains);
      const n = D.n[0] + Math.floor(Math.random() * (D.n[1] - D.n[0] + 1));
      for (let k = 0; k < n; k++) {
        const at = list.length ? list[Math.floor(Math.random() * list.length)] : null;
        const x = at ? at.x : e.x + rand(-8, 8);
        const z = at ? at.z : e.z + rand(-8, 8);
        const roll = 1 + Math.floor(Math.random() * 6);
        for (const o of list) {
          if (o.boss || !this.enemies.has(o.id) || (o.x - x) ** 2 + (o.z - z) ** 2 > D.radius * D.radius) continue;
          this.damage(null, o, o.maxHp * D.pct * roll, true, 'explosive');
        }
        this.events.push({ k: 'dice', x: r2(x), z: r2(z), r: D.radius, roll, fx: r2(e.x), fz: r2(e.z) });
      }
    }
  }

  /** What the snapshot sends about the contract (null: none in this game). */
  contractSnap() {
    const c = this.contract;
    if (!c) return null;
    return [c.key, c.spins, c.gone ? 0 : this.spinCost(), (c.open ? 1 : 0) | (c.gone ? 2 : 0) | (c.armed ? 4 : 0) | (c.boost ? 8 : 0) | (c.done ? 16 : 0), r2(c.x), r2(c.z),
      c.open ? (c.tiles ?? []).map(([cc, i]) => courtId(cc, i)) : 0, [...this.fences.keys()], this.fenceCost()];
  }
}
