// Versus (PVP): every player gets their own copy of the map (a "lane"), run by its own Sim.
// Lanes sit LANE_SPACING apart along +Z and are joined by bridges. Waves start on one shared
// clock and never end; players can buy zombies to send to an opponent, and Anarchists send
// Androids, smoke and fireworks. The last base standing wins.
//
// It has the same interface as Sim (step, events, over, action, removePlayer, snapshot), so the
// server runs it exactly like a co-op game. Each lane's Sim works in map-local coordinates;
// this class shifts z by the lane offset on the way out (snapshots, events) and back on the way in.
import { ENEMIES, GAME, SPEEDS, PLAYER_COLORS, VERSUS, waveGroups } from '../config.js';
import { Sim } from './sim.js';
import { laneOz } from './map.js';

const MAX_STEP = 0.05;
const ID_STRIDE = 1_000_000; // lane i's ids start at (i + 1) * ID_STRIDE
const r2 = (n) => Math.round(n * 100) / 100;

export class VersusSim {
  /** @param {{id: string, name: string, color?: number, loadout?: string[]}[]} players */
  constructor(players) {
    this.versus = true;
    this.lanes = players.map((p, i) => ({
      id: p.id,
      i,
      oz: laneOz(i),
      alive: true,
      place: 0, // finishing place once out (1 = winner)
      target: null, // id of the player this lane sends zombies to
      sim: new Sim([{ ...p, color: p.color ?? PLAYER_COLORS[i % PLAYER_COLORS.length] }], { vs: this, lane: i, idBase: (i + 1) * ID_STRIDE }),
    }));
    this.byId = new Map(this.lanes.map((l) => [l.id, l]));
    for (const l of this.lanes) l.target = this.nextTarget(l)?.id ?? null;
    this.speed = 1;
    this.over = 0;
    this.started = false;
    this.wave = { state: 'intermission', index: 0, countdown: VERSUS.firstIntermission, votes: 0 };
    this.skipVotes = new Set();
    this.events = [];
  }

  get alive() {
    return this.lanes.filter((l) => l.alive);
  }

  /** Everyone still in (and connected) must vote to skip. */
  get votesNeeded() {
    return Math.max(1, this.alive.filter((l) => l.sim.players.has(l.id)).length);
  }

  /** The next living lane after `l` (wrapping around), never `l` itself. */
  nextTarget(l, dir = 1) {
    const n = this.lanes.length;
    for (let k = 1; k < n; k++) {
      const o = this.lanes[(((l.i + dir * k) % n) + n) % n];
      if (o.alive) return o;
    }
    return null;
  }

  /** The lane `l` is attacking; re-picks if the old target is out. */
  targetOf(l) {
    let t = this.byId.get(l.target);
    if (!t?.alive || t === l) {
      t = this.nextTarget(l);
      l.target = t?.id ?? null;
    }
    return t;
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
    w.countdown -= dt;
    if (w.countdown <= 0) this.startWave();
    for (const l of this.lanes) if (l.alive) l.sim.step(dt);
    for (const l of this.lanes) this.drain(l);
    for (const l of this.lanes) {
      if (l.alive && l.sim.over) this.eliminate(l);
      if (this.over) return;
    }
  }

  /** Moves a lane's events into ours, shifted onto that lane and tagged with it (L). */
  drain(l) {
    for (const ev of l.sim.events) {
      // Wave messages come from the shared clock instead; base deaths become 'elim'.
      if (ev.k === 'waveStart' || ev.k === 'waveClear' || ev.k === 'end') continue;
      if (ev.z != null) ev.z = r2(ev.z + l.oz);
      ev.L = l.i;
      this.events.push(ev);
    }
    l.sim.events = [];
  }

  startWave() {
    const w = this.wave;
    const index = this.started ? w.index + 1 : 0;
    this.started = true;
    const bonus = index > 0 ? GAME.waveBonus(index) : 0;
    for (const l of this.alive) {
      if (bonus) {
        for (const p of l.sim.players.values()) p.cash += bonus;
        l.sim.payIncome();
      }
      l.sim.startWave(index);
    }
    w.index = index;
    w.state = 'wave';
    let last = 0;
    for (const [, count, gap, delay] of waveGroups(index)) last = Math.max(last, delay + (count - 1) * gap);
    w.countdown = Math.max(VERSUS.minWaveGap, last + VERSUS.waveBreak);
    this.skipVotes.clear();
    w.votes = 0;
    this.events.push({ k: 'waveStart', i: index, bonus });
  }

  eliminate(l) {
    l.alive = false;
    l.place = this.alive.length + 1;
    // Clear the dead map so nothing keeps walking around on it.
    l.sim.enemies.clear();
    l.sim.units.clear();
    l.sim.queue = [];
    l.sim.shells = [];
    l.sim.blades = [];
    l.sim.traps.clear();
    this.skipVotes.delete(l.id);
    this.wave.votes = this.skipVotes.size;
    this.events.push({ k: 'elim', id: l.id, place: l.place, wave: this.wave.index + 1 });
    const left = this.alive;
    if (left.length <= 1) {
      const winner = left[0] ?? l;
      winner.place = 1;
      this.over = 1;
      this.wave.state = 'over';
      const places = Object.fromEntries(this.lanes.map((o) => [o.id, o.place]));
      this.events.push({ k: 'end', versus: 1, winner: winner.id, places, wave: this.wave.index + 1 });
    } else if (this.skipVotes.size && this.skipVotes.size >= this.votesNeeded) this.wave.countdown = 0;
  }

  // ---------------------------------------------------------------- attacks

  /** Why lane `laneIdx` can't attack right now, or null if it can. */
  canAttack(laneIdx) {
    if (!this.started) return 'Wait for wave 1 to start';
    if (!this.targetOf(this.lanes[laneIdx])) return 'No one left to attack';
    return null;
  }

  /** An Anarchist on lane `laneIdx` hits its owner's target: 'android', 'chip', 'smoke' or 'pyro'. */
  attack(laneIdx, kind, data) {
    const from = this.lanes[laneIdx];
    const to = this.targetOf(from);
    if (!to || !from.alive) return;
    const sim = to.sim;
    if (kind === 'android') {
      sim.queueSent(data.type, 1, 0);
      this.events.push({ k: 'sent', from: from.id, to: to.id, type: data.type, n: 1 });
    } else if (kind === 'chip') {
      const d = sim.chipBase(data.damage, data.floor);
      if (d) this.events.push({ k: 'chip', from: from.id, to: to.id, d, L: to.i });
    } else if (kind === 'smoke' || kind === 'pyro') {
      const spot = sim.bestCluster(data.radius);
      const n = sim.hexTowers(spot.x, spot.z, data.radius, kind === 'smoke' ? 'smoke' : 'stun', data.duration);
      if (kind === 'pyro') sim.hurtUnits(data.unitDamage);
      this.events.push({ k: kind, from: from.id, to: to.id, x: r2(spot.x), z: r2(spot.z + to.oz), r: data.radius, d: data.duration, n, L: to.i });
    }
  }

  /** Buys a pack of zombies (VERSUS.sends) and sends it to `l`'s target. */
  send(l, type) {
    const def = VERSUS.sends[type];
    if (!def) return 'Unknown zombie';
    if (!l.alive) return "You're out!";
    if (!this.started) return 'Wait for wave 1 to start';
    const name = ENEMIES[type].name;
    if (this.wave.index + 1 < def.minWave) return `${name}s unlock on wave ${def.minWave}`;
    const to = this.targetOf(l);
    if (!to) return 'No one to send to';
    const p = l.sim.players.get(l.id);
    if (!p) return null;
    if (p.cash < def.cost) return `Need $${def.cost} to send ${def.n > 1 ? `${def.n} ${name}s` : `a ${name}`}`;
    p.cash -= def.cost;
    to.sim.queueSent(type, def.n, def.gap);
    this.events.push({ k: 'sent', from: l.id, to: to.id, type, n: def.n });
    return null;
  }

  // ---------------------------------------------------------------- players

  /** Applies an action from a player. Returns an error message, or null on success. */
  action(pid, m) {
    const l = this.byId.get(pid);
    if (!l || this.over || !m) return null;
    switch (m.a) {
      case 'speed':
        if (SPEEDS.includes(m.v)) this.speed = m.v;
        return null;
      case 'skip': {
        if (!l.alive) return null;
        this.skipVotes.add(pid);
        this.wave.votes = this.skipVotes.size;
        if (this.skipVotes.size >= this.votesNeeded) this.wave.countdown = 0;
        return null;
      }
      case 'vtarget': {
        const t = this.byId.get(m.id);
        if (!t || t === l) return 'Pick another player';
        if (!t.alive) return 'That player is already out';
        l.target = t.id;
        return null;
      }
      case 'send':
        return this.send(l, m.type);
    }
    if (!l.alive) return "You're out! Watch the others battle it out.";
    // Positions arrive in world space; the lane's Sim works on its own copy of the map.
    if (m.z !== undefined) m = { ...m, z: Number(m.z) - l.oz };
    return l.sim.action(pid, m);
  }

  removePlayer(id) {
    const l = this.byId.get(id);
    if (!l) return;
    l.sim.removePlayer(id);
    this.skipVotes.delete(id);
    if (l.alive && !this.over) this.eliminate(l);
  }

  // ---------------------------------------------------------------- networking

  snapshot() {
    const w = this.wave;
    const t = [];
    const u = [];
    const e = [];
    const tr = [];
    const ob = []; // Gold Commander Orbital Airstrike beams
    for (const l of this.lanes) {
      const s = l.sim.snapshot();
      for (const row of s.ob ?? []) ob.push([row[0], row[1], r2(row[2] + l.oz), row[3], row[4]]);
      for (const row of s.t) {
        row[5] = r2(row[5] + l.oz); // tower z
        t.push(row);
      }
      for (const row of s.u) u.push([...row, l.i]);
      for (const row of s.e) e.push([...row, l.i]);
      for (const row of s.tr) {
        row[4] = r2(row[4] + l.oz); // trap z
        tr.push(row);
      }
    }
    return {
      vs: 1,
      L: this.lanes.length,
      w: [w.state, w.index, Math.round(w.countdown * 10) / 10, 0, w.votes, this.votesNeeded],
      b: 0,
      sp: this.speed,
      o: this.over,
      p: this.lanes
        .filter((l) => l.sim.players.has(l.id))
        .map((l) => {
          const p = l.sim.players.get(l.id);
          return [p.id, p.name, p.cash === Infinity ? 'inf' : p.cash, p.color, l.i, l.sim.baseHp, l.alive ? 0 : l.place, l.target];
        }),
      t,
      u,
      e,
      tr,
      ...(ob.length ? { ob } : {}),
    };
  }
}
