// The multiplayer "server": rooms, chat, and one authoritative Sim per game. It doesn't care how
// messages travel: in peer-to-peer play it runs in the room host's browser (see net.js), and
// server/index.js can still run it in Node over WebSockets.
//
//   const hub = createHub({ setInterval, clearInterval });
//   const client = hub.connect((msg) => deliver(msg));   // one per player
//   client.receive(msg);                                  // a message from that player
//   client.close();                                       // that player disconnected
import { DEFAULT_DIFFICULTY, DIFFICULTIES, GAME, eventMap, MP, PLAYER_COLORS, TOWERS, VERSUS } from './config.js';
import { Sim } from './sim/sim.js';
import { VersusSim } from './sim/versus.js';
import { setMap } from './sim/map.js';
import { DEFAULT_MAP, MAPS, pickableMap } from './sim/maps.js';
import { Bot } from './bot/bot.js';
import { BOT_NAMES, botRoles } from './bot/loadouts.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** How many players room `r` holds at most: Hardcore co-op holds more (DIFFICULTIES[mode].maxPlayers). */
const roomMax = (r) => (r.mode !== 'versus' && DIFFICULTIES[r.difficulty]?.maxPlayers) || MP.maxRoomPlayers;
/** How many seats room `r` has: the host's pick (Quick Play), capped by what the mode holds. */
const roomSeats = (r) => Math.min(roomMax(r), r.seats || roomMax(r));
/** Everyone in room `r`, players then bots, in seat order (colors go by this order). */
const seated = (r) => [...r.members, ...r.bots.map((b) => b.id)];
const TICK_MS = 1000 / MP.tickRate;
const BOT_POS_EVERY = 3; // ticks between bot avatar updates (about 7 a second)
/** What a player's order from the wheel says in chat. */
const ORDER_TEXT = { upgrade: 'Upgrade this tower!', sell: 'Sell this tower!', move: 'Move this tower here!', build: 'Build here!', defend: 'We need more defense!', farm: 'Farm up!', save: 'Save your cash!', look: 'Look at this!' };

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
  /**
   * @type {Map<string, {code, name, host, isPublic, quick, mode: 'coop'|'versus', difficulty, map, seats, bots: {id, name}[],
   *   members: string[], ready: Set<string>, state, sim, brains: Bot[], later: {at, fn}[], timer, tick}>}
   * members are the players (client ids); bots sit in the room's other seats and play when a game starts.
   */
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
      quick: r.quick,
      mode: r.mode,
      difficulty: r.difficulty,
      map: r.map,
      max: roomMax(r),
      seats: roomSeats(r),
      bots: r.bots.length,
      state: r.state,
      members: seated(r).map((id, i) => {
        const bot = r.bots.find((b) => b.id === id);
        return { id, name: bot ? bot.name : clients.get(id)?.name ?? '?', ready: !!bot || r.ready.has(id), bot: !!bot, color: PLAYER_COLORS[i % PLAYER_COLORS.length] };
      }),
    };
  }

  /** Puts `n` bots in room `r`'s spare seats (fewer if the room can't hold them). */
  function setBots(r, n) {
    n = Math.max(0, Math.min(Math.floor(n) || 0, roomSeats(r) - r.members.length));
    while (r.bots.length > n) r.bots.pop();
    while (r.bots.length < n) {
      const taken = new Set(r.bots.map((b) => b.name));
      const name = BOT_NAMES.find((nm) => !taken.has(`🤖 ${nm}`)) ?? `Bot ${r.bots.length + 1}`;
      r.bots.push({ id: `bot${r.bots.length + 1}`, name: `🤖 ${name}` });
    }
  }

  /** Runs `fn` after `ticks` game ticks (a bot answering a moment later, like a person would). */
  function later(r, ticks, fn) {
    r.later.push({ at: r.tick + ticks, fn });
  }

  function pushRoom(r) {
    const view = roomView(r);
    for (const id of r.members) send(clients.get(id), { type: 'room', room: view });
  }

  function roomList() {
    return [...rooms.values()]
      .filter((r) => r.isPublic)
      .map((r) => ({ code: r.code, name: r.name, mode: r.mode, difficulty: r.difficulty, host: clients.get(r.host)?.name ?? '?', count: r.members.length + r.bots.length, max: roomSeats(r), state: r.state }));
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
      // Bots don't keep a room open.
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
    const players = seated(r).map((id, i) => {
      const bot = r.bots.find((b) => b.id === id);
      const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
      // Bots bring no loadout (any tower) and have no evolution levels to gate their upgrades.
      return bot ? { id, name: bot.name, color, loadout: null, evo: null } : { id, name: clients.get(id)?.name ?? '?', color, loadout: clients.get(id)?.loadout, evo: clients.get(id)?.evo ?? {} };
    });
    // Versus: everyone gets their own map and fights to outlast the others.
    r.sim = r.mode === 'versus' ? new VersusSim(players, r.map) : new Sim(players, { mode: r.difficulty, map: r.map });
    r.tick = 0;
    r.later = [];
    // The bots' brains: each plays its own lane in Versus, the shared map in co-op.
    const roles = botRoles(r.bots.length, r.mode === 'versus' ? 'zombies' : r.difficulty);
    r.brains = r.bots.map((b, i) => {
      const lane = r.mode === 'versus' ? r.sim.byId.get(b.id) : null;
      const color = PLAYER_COLORS[seated(r).indexOf(b.id) % PLAYER_COLORS.length];
      const say = (text) => later(r, 10 + Math.floor(Math.random() * 20), () => r.state === 'game' && broadcastRoom(r, { type: 'chat', id: b.id, name: b.name, color, text }));
      return new Bot(lane ? lane.sim : r.sim, b.id, { role: roles[i], mode: r.mode === 'versus' ? 'zombies' : r.difficulty, top: r.sim, lane: lane ? lane.i : 0, loose: r.bots.length >= 3 && i > 0, say });
    });
    broadcastRoom(r, { type: 'game.start', host: r.host, mode: r.mode, totalWaves: r.mode === 'versus' ? 0 : r.sim.waves.length, s: r.sim.snapshot() });
    pushRoom(r);
    pushRoomList();
    r.timer = every(() => stepRoom(r), TICK_MS);
  }

  function stepRoom(r) {
    const sim = r.sim;
    if (!sim) return;
    setMap(sim.map); // a server hosting several rooms: each steps on its own map
    sim.step(TICK_MS / 1000);
    const ev = sim.events;
    for (const b of r.brains) b.tick((TICK_MS / 1000) * sim.speed, ev);
    sim.events = [];
    r.tick++;
    if (r.later.length && r.later[0].at <= r.tick) {
      const due = r.later.filter((l) => l.at <= r.tick);
      r.later = r.later.filter((l) => l.at > r.tick);
      for (const l of due) l.fn();
    }
    const msg = { type: 'tick', ev };
    // Snapshots at a fixed rate, plus immediately when towers/players change so actions feel snappy.
    if (r.tick % MP.snapshotEvery === 0 || ev.some((e) => e.k !== 'shot' && e.k !== 'kill' && e.k !== 'ushot')) msg.s = sim.snapshot();
    if (ev.length || msg.s) broadcastRoom(r, msg);
    // The bots' avatars walk around like everyone else's.
    if (r.brains.length && r.tick % BOT_POS_EVERY === 0) {
      for (const b of r.brains) {
        const a = b.avatar();
        const n = (v) => Math.round(v * 100) / 100;
        broadcastRoom(r, { type: 'pos', id: b.id, x: n(a.x), y: n(a.y), z: n(a.z), yaw: n(a.yaw), m: a.m, g: a.g });
      }
    }
    if (sim.over) {
      stop(r.timer);
      r.timer = null;
      r.sim = null;
      r.brains = [];
      r.later = [];
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
    /**
     * `code`: use this room code (peer-to-peer hosts already picked one) if it's free. Quick Play
     * rooms (`quick`) also set `seats` (how many players and bots in all) and `bots` (how many of
     * those seats bots take); anyone who joins one is ready at once.
     */
    'room.create'(c, m) {
      if (c.room) return error(c, 'You are already in a room');
      const want = clean(m.code, 12).toUpperCase();
      const r = {
        code: want && !rooms.has(want) ? want : makeCode(new Set(rooms.keys())),
        name: clean(m.name, 24) || `${c.name}'s room`,
        host: c.id,
        isPublic: m.isPublic !== false,
        quick: !!m.quick,
        mode: m.mode === 'versus' ? 'versus' : 'coop',
        difficulty: DIFFICULTIES[m.difficulty] ? m.difficulty : DEFAULT_DIFFICULTY,
        map: eventMap(m.difficulty, m.map) === m.map ? m.map : pickableMap(m.map), // an event's own map only with that event
        seats: 0,
        bots: [],
        members: [],
        ready: new Set(),
        state: 'lobby',
        sim: null,
        brains: [],
        later: [],
        timer: null,
        tick: 0,
      };
      if (Number.isFinite(m.seats)) r.seats = Math.max(1, Math.min(roomMax(r), Math.floor(m.seats)));
      rooms.set(r.code, r);
      c.room = r.code;
      r.members.push(c.id);
      if (Number.isFinite(m.bots)) setBots(r, m.bots);
      pushRoom(r);
      pushRoomList();
    },
    'room.join'(c, m) {
      const r = rooms.get(clean(m.code, 12).toUpperCase());
      if (!r) return error(c, 'No room with that code');
      if (c.room) return error(c, 'You are already in a room');
      if (r.state !== 'lobby') return error(c, 'That room is already playing');
      if (r.members.length + r.bots.length >= roomSeats(r)) return error(c, 'That room is full');
      if (r.quick) r.ready.add(c.id); // Quick Play: no readying up, the host starts when they like
      addToRoom(r, c);
      broadcastRoom(r, { type: 'chat', system: true, text: `${c.name} joined` });
    },
    /** The host sets how many bots play (they take the room's spare seats). */
    'room.bots'(c, m) {
      const r = rooms.get(c.room);
      if (!r || r.state !== 'lobby') return;
      if (r.host !== c.id) return error(c, 'Only the host can add bots');
      const was = r.bots.length;
      setBots(r, Number(m.n));
      if (r.bots.length === was && Number(m.n) > was) return error(c, 'No seats left for more bots');
      pushRoom(r);
      pushRoomList();
    },
    /** The host sets how many seats the room has (players and bots together). */
    'room.seats'(c, m) {
      const r = rooms.get(c.room);
      if (!r || r.state !== 'lobby') return;
      if (r.host !== c.id) return error(c, 'Only the host can change the room size');
      const n = Math.max(1, Math.min(roomMax(r), Math.floor(Number(m.n)) || 1));
      if (n < r.members.length) return error(c, `${r.members.length} players are already here`);
      r.seats = n;
      setBots(r, r.bots.length); // drops bots that no longer fit
      pushRoom(r);
      pushRoomList();
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
      if (r.mode === 'versus' && r.members.length + r.bots.length < VERSUS.minPlayers) return error(c, `Versus needs at least ${VERSUS.minPlayers} players (bots count)`);
      const notReady = r.members.filter((id) => id !== r.host && !r.ready.has(id));
      if (notReady.length) return error(c, `Waiting for ${notReady.map((id) => clients.get(id)?.name).join(', ')} to ready up`);
      startGame(r);
    },
    'room.mode'(c, m) {
      const r = rooms.get(c.room);
      if (!r || r.state !== 'lobby') return;
      if (r.host !== c.id) return error(c, 'Only the host can change the mode');
      const mode = m.mode === 'versus' ? 'versus' : 'coop';
      if (r.members.length > roomMax({ ...r, mode })) return error(c, `${mode === 'versus' ? 'Versus' : 'That mode'} holds at most ${roomMax({ ...r, mode })} players`);
      r.mode = mode;
      setBots(r, r.bots.length); // the room may hold fewer now
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
      if (r.members.length > roomMax({ ...r, difficulty: m.difficulty })) return error(c, `${DIFFICULTIES[m.difficulty].name} holds at most ${roomMax({ ...r, difficulty: m.difficulty })} players`);
      r.difficulty = m.difficulty;
      if (MAPS[r.map]?.event && eventMap(r.difficulty, r.map) !== r.map) r.map = DEFAULT_MAP; // left the event: back to a normal map
      setBots(r, r.bots.length); // the room may hold fewer now
      r.ready.clear(); // everyone confirms again
      broadcastRoom(r, { type: 'chat', system: true, text: `Difficulty: ${DIFFICULTIES[r.difficulty].name}` });
      pushRoom(r);
      pushRoomList();
    },
    'room.map'(c, m) {
      const r = rooms.get(c.room);
      if (!r || r.state !== 'lobby') return;
      if (r.host !== c.id) return error(c, 'Only the host can change the map');
      if (!MAPS[m.map] || m.map === r.map) return;
      if (MAPS[m.map].event && eventMap(r.difficulty, m.map) !== m.map) return; // an event's map only while the room plays that event
      r.map = m.map;
      r.ready.clear(); // everyone confirms again
      broadcastRoom(r, { type: 'chat', system: true, text: `Map: ${MAPS[r.map].name}` });
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
    /**
     * An order from the wheel: { cmd, id (a tower), x, z }. Everyone sees it in chat (and a marker
     * where it points); the bots it concerns do it and answer.
     */
    'game.command'(c, m) {
      const r = rooms.get(c.room);
      if (!r?.sim || !ORDER_TEXT[m.cmd]) return;
      const color = PLAYER_COLORS[r.members.indexOf(c.id) % PLAYER_COLORS.length];
      const x = Number.isFinite(Number(m.x)) ? Number(m.x) : null;
      const z = Number.isFinite(Number(m.z)) ? Number(m.z) : null;
      broadcastRoom(r, { type: 'chat', id: c.id, name: c.name, color, text: `📣 ${ORDER_TEXT[m.cmd]}` });
      broadcastRoom(r, { type: 'order', id: c.id, cmd: m.cmd, tower: m.id ?? null, x, z, name: c.name, color });
      const lane = r.mode === 'versus' ? r.sim.byId.get(c.id) : null;
      for (const b of r.brains) {
        if (lane && b.lane !== lane.i) continue; // Versus: orders stay on your own map
        const reply = b.order({ cmd: m.cmd, id: m.id, x, z: z != null && lane ? z - lane.oz : z });
        if (reply) b.say(reply, true);
      }
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
      if (!r?.sim || r.members.length < 2) return; // bots don't watch; nobody to tell
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
