// A session is where game state comes from. The game client only talks to this interface:
//   state            { players, towers, enemies, units: Map, wave, baseHp, speed, over, votesNeeded,
//                      versus, lanes }  (Versus: players also carry lane, baseHp, place, target;
//                      enemies and units carry lane and oz, their lane's world z offset)
//   myId, mp, isHost
//   update(dt) -> events[]   (advance / drain events)
//   send(action)              (player action: place, upgrade, sell, target, skip, speed)
//   sendPos(p), remotePos     (multiplayer avatar sync)
//   onError(msg)              (set by the client to show rejected actions)
import { Sim } from './sim/sim.js';
import { laneOz } from './sim/map.js';

export class LocalSession {
  constructor(name, color, mode) {
    this.myId = 'local';
    this.mp = false;
    this.isHost = true;
    this.sim = new Sim([{ id: this.myId, name, color }], { mode });
    this.state = this.sim; // the sim already has the state shape the client reads
    this.remotePos = new Map();
    this.onError = null;
  }

  update(dt) {
    this.sim.step(dt);
    const ev = this.sim.events;
    this.sim.events = [];
    return ev;
  }

  send(action) {
    const err = this.sim.action(this.myId, action);
    if (err) this.onError?.(err);
  }

  sendPos() {}
  dispose() {}
}

export class NetSession {
  constructor(net, startMsg) {
    this.net = net;
    this.myId = net.id;
    this.mp = true;
    this.isHost = startMsg.host === net.id;
    this.state = {
      players: new Map(),
      towers: new Map(),
      enemies: new Map(),
      units: new Map(),
      traps: new Map(),
      wave: { state: 'intermission', index: 0, countdown: 0, left: 0, votes: 0, total: startMsg.totalWaves },
      votesNeeded: 1,
      baseHp: 0,
      speed: 1,
      over: 0,
      versus: !!startMsg.s.vs,
      mode: startMsg.s.m ?? 'zombies', // difficulty (which scripted waves)
      lanes: startMsg.s.L || 1,
    };
    this.remotePos = new Map();
    this.pending = [];
    this.onError = null;
    this.applySnapshot(startMsg.s);
    this.unsubs = [
      net.on('tick', (m) => {
        if (m.ev?.length) this.pending.push(...m.ev);
        if (m.s) this.applySnapshot(m.s);
      }),
      net.on('pos', (m) => this.remotePos.set(m.id, m)),
      net.on('room', (m) => {
        if (m.room) this.isHost = m.room.host === this.myId;
      }),
      net.on('error', (m) => this.onError?.(m.msg)),
    ];
  }

  applySnapshot(s) {
    const st = this.state;
    const [state, index, countdown, left, votes, needed, canSkip = 0] = s.w;
    Object.assign(st.wave, { state, index, countdown, left, votes, canSkip });
    st.votesNeeded = needed;
    st.baseHp = s.b;
    st.speed = s.sp;
    st.over = s.o;

    st.players.clear();
    for (const [id, name, cash, color, lane = 0, baseHp, place = 0, target = null] of s.p) {
      st.players.set(id, { id, name, cash: cash === 'inf' ? Infinity : cash, color, lane, baseHp: baseHp ?? s.b, place, target });
    }

    const seenT = new Set();
    for (const [id, owner, type, level, x, z, yaw, targetMode, kills, damageDealt, spent, ang, lock, charge, active, cd, fx = 0, dir = 1, track = 0, radioT = 0, ext = 0, holo = 0] of s.t) {
      seenT.add(id);
      const t = { id, owner, type, level, x, z, yaw, targetMode, kills, damageDealt, spent, ang, lock, charge, active, cd, fx, dir, track, radioT, holo };
      if (ext) {
        // Pursuit / Gatling Gun: ammo, reloading, helicopter and patrol zone (sent relative to the tower).
        const [ammo, reloadT, hx, hz, hyaw, cx, cz, manual, face] = ext;
        Object.assign(t, { ammo, reloadT, hx: x + hx, hz: z + hz, hyaw, cx: x + cx, cz: z + cz, manual: !!manual, face });
      }
      st.towers.set(id, t);
    }
    for (const id of st.towers.keys()) if (!seenT.has(id)) st.towers.delete(id);

    // Enemies keep their object so we can smoothly extrapolate between snapshots.
    const seenE = new Set();
    for (const [id, type, hp, maxHp, dist, speed, lateral, bits, lane = 0] of s.e) {
      seenE.add(id);
      let e = st.enemies.get(id);
      if (!e) {
        e = { id, type, dist };
        st.enemies.set(id, e);
      }
      Object.assign(e, { hp, maxHp, speed, lateral, st: bits, lane, oz: laneOz(lane), target: dist });
    }
    for (const id of st.enemies.keys()) if (!seenE.has(id)) st.enemies.delete(id);

    // Units (Jeeps, squads...) drive toward the entrance, so their dist goes down.
    const seenU = new Set();
    for (const [id, tower, model, hp, maxHp, dist, lateral, alive, speed, yaw, lane = 0] of s.u || []) {
      seenU.add(id);
      let u = st.units.get(id);
      if (!u) {
        u = { id, dist };
        st.units.set(id, u);
      }
      Object.assign(u, { tower, model, hp, maxHp, lateral, alive, speed, yaw, lane, oz: laneOz(lane), target: dist });
    }
    for (const id of st.units.keys()) if (!seenU.has(id)) st.units.delete(id);

    // Trapper traps lying on the path (land: 0 while still in the air), Necromancer gravestones
    // and Engineer sentries (level, facing, share of health left, stunned).
    st.traps.clear();
    for (const [id, tower, kind, x, z, landed, lvl = 0, yaw = 0, hp = 1, stun = 0] of s.tr || []) {
      st.traps.set(id, { id, tower, kind, x, z, land: landed ? 0 : 1, lvl, yaw, hp, stun: !!stun });
    }
  }

  update(dt) {
    const st = this.state;
    const step = st.over ? 0 : dt * st.speed;
    for (const e of st.enemies.values()) {
      // Dead-reckon along the path, easing toward the server's position.
      e.target += e.speed * step;
      e.dist += e.speed * step;
      e.dist += (e.target - e.dist) * Math.min(1, dt * 8);
    }
    for (const u of st.units.values()) {
      u.target -= u.speed * step;
      u.dist -= u.speed * step;
      u.dist += (u.target - u.dist) * Math.min(1, dt * 8);
    }
    for (const t of st.towers.values()) {
      // Count ability timers down between snapshots so the panel ticks smoothly.
      if (t.active > 0) t.active = Math.max(0, t.active - step);
      for (const k in t.cd) t.cd[k] = Math.max(0, t.cd[k] - step);
      if (t.reloadT > 0) t.reloadT = Math.max(0, t.reloadT - step);
      if (t.holo > 0) t.holo = Math.max(0.01, t.holo - step); // Hacker clone fading (0 would mean a real tower)
    }
    if (st.wave.state === 'intermission' || (st.versus && st.wave.state === 'wave')) st.wave.countdown = Math.max(0, st.wave.countdown - step);

    const ev = this.pending;
    this.pending = [];
    for (const e of ev) {
      if (e.k === 'kill' || e.k === 'leak' || e.k === 'decay') st.enemies.delete(e.e);
      if (e.k === 'udie') st.units.delete(e.u);
    }
    return ev;
  }

  send(action) {
    this.net.send({ type: 'game.action', action });
  }

  sendPos(p) {
    this.net.send({ type: 'game.pos', ...p });
  }

  dispose() {
    this.unsubs.forEach((u) => u());
  }
}
