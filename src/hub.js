// The multiplayer "server": rooms, chat, and one authoritative Sim per game. It doesn't care how
// messages travel: in peer-to-peer play it runs in the room host's browser (see net.js), and
// server/index.js can still run it in Node over WebSockets.
//
//   const hub = createHub({ setInterval, clearInterval });
//   const client = hub.connect((msg) => deliver(msg));   // one per player
//   client.receive(msg);                                  // a message from that player
//   client.close();                                       // that player disconnected
import { DEFAULT_DIFFICULTY, DIFFICULTIES, GAME, MP, PLAYER_COLORS, TOWERS, VERSUS } from './config.js';
import { Sim } from './sim/sim.js';
import { VersusSim } from './sim/versus.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TICK_MS = 1000 / MP.tickRate;

/** A random 5-character room code (no look-alike letters), not in `taken`. */
export function makeCode(taken = new Set()) {
  let code;
  do code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  while (taken.has(code));
  return code;
}

const clean = (s, max) =>
  String(s ?? '')
    .replace(/[\u0000-\u001f<>]/g, '')
    .trim()
    .slice(0, max);

/**
 * @param {{setInterval?: Function, clearInterval?: Function}} timers  how the game loop ticks
 *   (the browser host passes timers that keep running in a background tab).
 */
export function createHub(timers = {}) {
  const every = timers.setInterval ?? ((fn, ms) => setInterval(fn, ms));
  const stop = timers.clearInterval ?? ((id) => clearInterval(id));

  /** @type {Map<string, {id, name, send: Function, room: string|null, loadout: string[]|null}>} */
  const clients = new Map();
  /** @type {Map<string, {code, name, host, isPublic, mode: 'coop'|'versus', difficulty, members: string[], ready: Set<string>, state, sim, timer, tick}>} */
  const rooms = new Map();
  let nextClientId = 1;

  const send = (c, msg) => c?.send(msg);
  const error = (c, msg) => send(c, { type: 'error', msg });

  function broadcastRoom(room, msg, exceptId) {
    for (const id of room.members) if (id !== exceptId) send(clients.get(id), msg);
  }

  // ---------------------------------------------------------------- rooms

  function roomView(r) {
    return {
      code: r.code,
      name: r.name,
      host: r.host,
      isPublic: r.isPublic,
      mode: r.mode,
      difficulty: r.difficulty,
      max: MP.maxRoomPlayers,
      state: r.state,
      members: r.members.map((id, i) => ({ id, name: clients.get(id)?.name ?? '?', ready: r.ready.has(id), color: PLAYER_COLORS[i % PLAYER_COLORS.length] })),
    };
  }

  function pushRoom(r) {
    const view = roomView(r);
    for (const id of r.members) send(clients.get(id), { type: 'room', room: view });
  }

  function roomList() {
    return [...rooms.values()]
      .filter((r) => r.isPublic)
      .map((r) => ({ code: r.code, name: r.name, mode: r.mode, difficulty: r.difficulty, host: clients.get(r.host)?.name ?? '?', count: r.members.length, max: MP.maxRoomPlayers, state: r.state }));
  }

  /** Everyone browsing (not in a room) gets the updated public room list. */
  function pushRoomList() {
    const msg = { type: 'rooms', rooms: roomList() };
    for (const c of clients.values()) if (!c.room) send(c, msg);
  }

  function addToRoom(r, c) {
    c.room = r.code;
    r.members.push(c.id);
    pushRoom(r);
    pushRoomList();
  }

  function leaveRoom(c) {
    const r = rooms.get(c.room);
    c.room = null;
    send(c, { type: 'room', room: null });
    send(c, { type: 'rooms', rooms: roomList() });
    if (!r) return;
    r.members = r.members.filter((id) => id !== c.id);
    r.ready.delete(c.id);
    r.sim?.removePlayer(c.id);
    if (!r.members.length) {
      if (r.timer != null) stop(r.timer);
      rooms.delete(r.code);
    } else {
      if (r.host === c.id) r.host = r.members[0];
      broadcastRoom(r, { type: 'chat', system: true, text: `${c.name} left the room` });
      pushRoom(r);
    }
    pushRoomList();
  }

  function startGame(r) {
    r.state = 'game';
    r.ready.clear();
    const players = r.members.map((id, i) => ({ id, name: clients.get(id)?.name ?? '?', color: PLAYER_COLORS[i % PLAYER_COLORS.length], loadout: clients.get(id)?.loadout, evo: clients.get(id)?.evo ?? {} }));
    // Versus: everyone gets their own map and fights to outlast the others.
    r.sim = r.mode === 'versus' ? new VersusSim(players) : new Sim(players, { mode: r.difficulty });
    r.tick = 0;
    broadcastRoom(r, { type: 'game.start', host: r.host, mode: r.mode, totalWaves: r.mode === 'versus' ? 0 : r.sim.waves.length, s: r.sim.snapshot() });
    pushRoom(r);
    pushRoomList();
    r.timer = every(() => stepRoom(r), TICK_MS);
  }

  function stepRoom(r) {
    const sim = r.sim;
    if (!sim) return;
    sim.step(TICK_MS / 1000);
    const ev = sim.events;
    sim.events = [];
    r.tick++;
    const msg = { type: 'tick', ev };
    // Snapshots at a fixed rate, plus immediately when towers/players change so actions feel snappy.
    if (r.tick % MP.snapshotEvery === 0 || ev.some((e) => e.k !== 'shot' && e.k !== 'kill' && e.k !== 'ushot')) msg.s = sim.snapshot();
    if (ev.length || msg.s) broadcastRoom(r, msg);
    if (sim.over) {
      stop(r.timer);
      r.timer = null;
      r.sim = null;
      r.state = 'lobby';
      pushRoom(r);
      pushRoomList();
    }
  }

  // ---------------------------------------------------------------- message handling

  const handlers = {
    hello(c, m) {
      c.name = clean(m.name, 16) || `Player${c.id}`;
      send(c, { type: 'welcome', id: c.id, name: c.name });
      send(c, { type: 'rooms', rooms: roomList() });
    },
    setName(c, m) {
      c.name = clean(m.name, 16) || c.name;
      send(c, { type: 'welcome', id: c.id, name: c.name });
    },

    /** The towers this player brings into games (their client-side loadout). */
    loadout(c, m) {
      if (!Array.isArray(m.towers)) return;
      const towers = [...new Set(m.towers.filter((t) => typeof t === 'string' && Object.hasOwn(TOWERS, t)))].slice(0, GAME.loadoutSize);
      c.loadout = towers.length ? towers : null;
      // Evolution levels of the evolved towers they own (gates those towers' upgrades).
      const evo = {};
      if (m.evo && typeof m.evo === 'object') for (const [t, lv] of Object.entries(m.evo)) if ((TOWERS[t]?.evolved || /^perk:\w+$/.test(t)) && Number.isFinite(lv)) evo[t] = Math.max(0, Math.floor(lv));
      c.evo = evo;
    },

    'rooms.list'(c) {
      send(c, { type: 'rooms', rooms: roomList() });
    },
    /** `code`: use this room code (peer-to-peer hosts already picked one) if it's free. */
    'room.create'(c, m) {
      if (c.room) return error(c, 'You are already in a room');
      const want = clean(m.code, 8).toUpperCase();
      const r = {
        code: want && !rooms.has(want) ? want : makeCode(new Set(rooms.keys())),
        name: clean(m.name, 24) || `${c.name}'s room`,
        host: c.id,
        isPublic: m.isPublic !== false,
        mode: m.mode === 'versus' ? 'versus' : 'coop',
        difficulty: DIFFICULTIES[m.difficulty] ? m.difficulty : DEFAULT_DIFFICULTY,
        members: [],
        ready: new Set(),
        state: 'lobby',
        sim: null,
        timer: null,
        tick: 0,
      };
      rooms.set(r.code, r);
      addToRoom(r, c);
    },
    'room.join'(c, m) {
      const r = rooms.get(clean(m.code, 8).toUpperCase());
      if (!r) return error(c, 'No room with that code');
      if (c.room) return error(c, 'You are already in a room');
      if (r.state !== 'lobby') return error(c, 'That room is already playing');
      if (r.members.length >= MP.maxRoomPlayers) return error(c, 'That room is full');
      addToRoom(r, c);
      broadcastRoom(r, { type: 'chat', system: true, text: `${c.name} joined` });
    },
    'room.leave'(c) {
      if (rooms.has(c.room)) leaveRoom(c);
    },
    'room.ready'(c, m) {
      const r = rooms.get(c.room);
      if (!r || r.state !== 'lobby') return;
      m.ready ? r.ready.add(c.id) : r.ready.delete(c.id);
      pushRoom(r);
    },
    'room.start'(c) {
      const r = rooms.get(c.room);
      if (!r || r.state !== 'lobby') return;
      if (r.host !== c.id) return error(c, 'Only the host can start');
      if (r.mode === 'versus' && r.members.length < VERSUS.minPlayers) return error(c, `Versus needs at least ${VERSUS.minPlayers} players`);
      const notReady = r.members.filter((id) => id !== r.host && !r.ready.has(id));
      if (notReady.length) return error(c, `Waiting for ${notReady.map((id) => clients.get(id)?.name).join(', ')} to ready up`);
      startGame(r);
    },
    'room.mode'(c, m) {
      const r = rooms.get(c.room);
      if (!r || r.state !== 'lobby') return;
      if (r.host !== c.id) return error(c, 'Only the host can change the mode');
      r.mode = m.mode === 'versus' ? 'versus' : 'coop';
      r.ready.clear(); // everyone confirms again for the new mode
      broadcastRoom(r, { type: 'chat', system: true, text: r.mode === 'versus' ? 'Mode: Versus — every player for themselves!' : 'Mode: Co-op — defend together!' });
      pushRoom(r);
      pushRoomList();
    },
    'room.difficulty'(c, m) {
      const r = rooms.get(c.room);
      if (!r || r.state !== 'lobby') return;
      if (r.host !== c.id) return error(c, 'Only the host can change the difficulty');
      if (!DIFFICULTIES[m.difficulty] || m.difficulty === r.difficulty) return;
      r.difficulty = m.difficulty;
      r.ready.clear(); // everyone confirms again
      broadcastRoom(r, { type: 'chat', system: true, text: `Difficulty: ${DIFFICULTIES[r.difficulty].name}` });
      pushRoom(r);
      pushRoomList();
    },
    'room.kick'(c, m) {
      const r = rooms.get(c.room);
      if (!r || r.host !== c.id || m.id === c.id || r.state !== 'lobby') return;
      const target = clients.get(m.id);
      if (target?.room === r.code) {
        error(target, 'You were removed from the room');
        leaveRoom(target);
      }
    },
    'room.chat'(c, m) {
      const r = rooms.get(c.room);
      const text = clean(m.text, 200);
      if (!r || !text) return;
      const color = PLAYER_COLORS[r.members.indexOf(c.id) % PLAYER_COLORS.length];
      broadcastRoom(r, { type: 'chat', id: c.id, name: c.name, color, text });
    },

    'game.action'(c, m) {
      const r = rooms.get(c.room);
      if (!r?.sim || !m.action) return;
      if (m.action.a === 'speed' && r.host !== c.id) return error(c, 'Only the host can change speed');
      const err = r.sim.action(c.id, m.action);
      if (err) error(c, err);
    },
    'game.pos'(c, m) {
      const r = rooms.get(c.room);
      if (!r?.sim) return;
      const n = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0);
      broadcastRoom(r, { type: 'pos', id: c.id, x: n(m.x), y: n(m.y), z: n(m.z), yaw: n(m.yaw), m: m.m ? 1 : 0, g: m.g ? 1 : 0 }, c.id);
    },
  };

  return {
    /** A new player. `deliver(msg)` sends a message object to them. */
    connect(deliver) {
      const c = { id: `p${nextClientId++}`, name: 'Player', send: deliver, room: null, loadout: null };
      clients.set(c.id, c);
      return {
        id: c.id,
        receive(m) {
          const h = handlers[m?.type];
          if (!h) return;
          try {
            h(c, m);
          } catch (e) {
            console.error(`Error handling ${m.type}:`, e);
          }
        },
        close() {
          if (!clients.has(c.id)) return;
          if (c.room) leaveRoom(c);
          clients.delete(c.id);
        },
      };
    },
    /** Stops every running game (the host is shutting down). */
    shutdown() {
      for (const r of rooms.values()) if (r.timer != null) stop(r.timer);
      rooms.clear();
      clients.clear();
    },
  };
}
