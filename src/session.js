// A session is where game state comes from. The game client only talks to this interface:
//   state            { players, towers, enemies, units: Map, wave, baseHp, speed, over, votesNeeded,
//                      versus, lanes }  (Versus: players also carry lane, baseHp, place, target;
//                      enemies and units carry lane and oz, their lane's world z offset)
//   myId, mp, isHost
//   update(dt) -> events[]   (advance / drain events)
//   send(action)              (player action: place, upgrade, sell, target, skip, speed)
//   sendPos(p), remotePos     (multiplayer avatar sync)
//   onError(msg)              (set by the client to show rejected actions)
import { Sim, ST_CONFUSED } from './sim/sim.js';
import { laneOz, setMap } from './sim/map.js';
import { setTimeWorld } from './sim/path.js';
import { TOWERS } from './config.js';

export class LocalSession {
  constructor(name, color, mode, evo = null, map = null) {
    this.myId = 'local';
    this.mp = false;
    this.isHost = true;
    this.sim = new Sim([{ id: this.myId, name, color, evo }], { mode, map });
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
  command() {} // no teammates to order around
  dispose() {}
}

export class NetSession {
  constructor(net, startMsg) {
    this.net = net;
    this.myId = net.id;
    this.mp = true;
    this.isHost = startMsg.host === net.id;
    setMap(startMsg.s.mk); // before anything reads the path
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
    setTimeWorld(false); // the host's sim says when the Beholder shifts the map (snapshot `tw`)
    this.onError = null;
    this.applySnapshot(startMsg.s);
    this.unsubs = [
      net.on('tick', (m) => {
        if (m.ev?.length) this.pending.push(...m.ev);
        if (m.s) this.applySnapshot(m.s);
      }),
      net.on('pos', (m) => this.remotePos.set(m.id, m)),
      net.on('order', (m) => this.pending.push({ k: 'order', ...m })), // a player's order from the wheel: shown like a sim event
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
    st.timeWorld = !!s.tw; // Insane mode: the Beholder's time dimension
    st.bombs = (s.tb ?? []).map(([id, x, z, left]) => ({ id, x, z, left })); // Beholder time bombs
    st.voidLevel = s.vw ?? 0; // Void mode: how dark VOID has made the world
    st.marks = (s.vm ?? []).map(([id, tower, x, z, left]) => ({ id, tower, x, z, left })); // VOID's marks on towers
    st.orbs = (s.vo ?? []).map(([id, x, z]) => ({ id, x, z })); // VOID's magic missiles
    st.beams = (s.ob ?? []).map(([id, x, z, left, r]) => ({ id, x, z, left, r })); // Gold Commander Orbital Airstrike beams (id = its tower)

    st.players.clear();
    for (const [id, name, cash, color, lane = 0, baseHp, place = 0, target = null] of s.p) {
      st.players.set(id, { id, name, cash: cash === 'inf' ? Infinity : cash, color, lane, baseHp: baseHp ?? s.b, place, target });
    }

    const seenT = new Set();
    for (const [id, owner, type, level, x, z, yaw, targetMode, kills, damageDealt, spent, ang, lock, charge, active, cd, fx = 0, dir = 1, track = 0, radioT = 0, ext = 0, holo = 0, hp = 0, maxHp = 0, rb = 0, sth = 0, face = 0, off = 0, choice = 0, lt = 0, fwT = 0, starT = 0, shd = 0, invulnT = 0, reviveT = 0, w8 = 0, w9 = 0] of s.t) {
      seenT.add(id);
      const t = { id, owner, type, level, x, z, yaw, targetMode, kills, damageDealt, spent, ang, lock, charge, active, cd, fx, dir, track, radioT, holo, hp, maxHp, rebuilt: rb ? rb[0] : 0, repairT: rb ? rb[1] : 0, stealthLeft: sth ? sth[0] : 0, exposedT: sth ? sth[1] : 0, cloakT: sth ? sth[2] : 0, off: off || [],
        choice: choice || [], fwT, starT, // Jester / Biologist / Elementalist picks, Firework boost, Star Cannon reboot
        shieldHp: shd ? shd[0] : 0, pool: shd ? shd[1] : 0, invulnT, reviveT }; // Shield Tower shields, Combat Drone Shield, Revive Pack
      if (w8) Object.assign(t, { bank: w8[0], dpT: w8[1], near: !!w8[2], ...(w8[3] != null ? { rx: x + w8[3], rz: z + w8[4] } : {}) }); // Market bank, Directed Power, Electricizer mode, Radar Drone
      if (lt) Object.assign(t, { lx: x + lt[0], lz: z + lt[1] }); // Spotlight Tech: where the light is
      if (w9) Object.assign(t, { uses: w9[0] || undefined, costRoll: w9[1], magic: w9[2], chargeF: w9[3] }); // ability uses, Chaos Jester price roll, Magic Boost, Mako charge
      if (TOWERS[type]?.facing) t.face = face; // Sentry: its cone's direction
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
    for (const [id, type, hp, maxHp, dist, speed, lateral, bits, route = 0, lane = 0] of s.e) {
      seenE.add(id);
      let e = st.enemies.get(id);
      if (!e) {
        e = { id, type, dist };
        st.enemies.set(id, e);
      }
      Object.assign(e, { hp, maxHp, speed, lateral, st: bits, route, lane, oz: laneOz(lane), target: dist, vShield: 0 });
    }
    for (const [id, left] of s.va ?? []) { const e = st.enemies.get(id); if (e) e.vShield = left; } // Void armor: share of the shield left
    for (const e of st.enemies.values()) e.osh = e.noTarget = 0;
    for (const [id, left, nt] of s.os ?? []) { const e = st.enemies.get(id); if (e) Object.assign(e, { osh: left, noTarget: nt }); } // Hardcore shields, untargetable bosses
    for (const id of st.enemies.keys()) if (!seenE.has(id)) st.enemies.delete(id);

    // Units (Jeeps, squads...) drive toward the entrance, so their dist goes down.
    const seenU = new Set();
    for (const [id, tower, model, hp, maxHp, dist, lateral, alive, speed, yaw, free = 0, route = 0, lane = 0] of s.u || []) {
      seenU.add(id);
      let u = st.units.get(id);
      if (!u) {
        u = { id, dist };
        st.units.set(id, u);
      }
      Object.assign(u, { tower, model, hp, maxHp, lateral, alive, speed, yaw, route, lane, oz: laneOz(lane), target: dist, fx: free ? free[0] : null, fz: free ? free[1] : null }); // fx/fz: crows, bees, Volt Points fly freely
    }
    for (const id of st.units.keys()) if (!seenU.has(id)) st.units.delete(id);

    // Trapper traps lying on the path (land: 0 while still in the air), Necromancer gravestones
    // and Engineer sentries (level, facing, share of health left, stunned).
    st.traps.clear();
    for (const [id, tower, kind, x, z, landed, lvl = 0, yaw = 0, hp = 1, stun = 0, radius = 0] of s.tr || []) {
      st.traps.set(id, { id, tower, kind, x, z, land: landed ? 0 : 1, lvl, yaw, hp, stun: !!stun, radius });
    }
  }

  update(dt) {
    const st = this.state;
    const step = st.over ? 0 : dt * st.speed;
    for (const e of st.enemies.values()) {
      // Dead-reckon along the path, easing toward the server's position (confused zombies walk backwards).
      const v = (e.st & ST_CONFUSED ? -e.speed : e.speed) * step;
      e.target += v;
      e.dist += v;
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

  /** An order from the wheel for the bots (and everyone's chat): { cmd, id, x, z }. */
  command(o) {
    this.net.send({ type: 'game.command', ...o });
  }

  dispose() {
    this.unsubs.forEach((u) => u());
  }
}
