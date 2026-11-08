// TD Infinity multiplayer server: parties, rooms, chat, and one authoritative Sim per game.
// Serves the built client from ../dist (npm run build) and WebSockets on /ws.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { DEFAULT_DIFFICULTY, DIFFICULTIES, GAME, MP, PLAYER_COLORS, TOWERS, VERSUS } from '../src/config.js';
import { Sim } from '../src/sim/sim.js';
import { VersusSim } from '../src/sim/versus.js';

const PORT = Number(process.env.PORT) || 8787;
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TICK_MS = 1000 / MP.tickRate;

/** @type {Map<string, {id, name, ws, party: string|null, room: string|null}>} */
const clients = new Map();
/** @type {Map<string, {code, leader, members: string[]}>} */
const parties = new Map();
/** @type {Map<string, {code, name, host, isPublic, mode: 'coop'|'versus', members: string[], ready: Set<string>, state, sim, timer, tick}>} */
const rooms = new Map();
let nextClientId = 1;

// ------------------------------------------------------------------ helpers

function makeCode(taken) {
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

function send(c, msg) {
  if (c?.ws.readyState === 1) c.ws.send(JSON.stringify(msg));
}
const error = (c, msg) => send(c, { type: 'error', msg });

function broadcastRoom(room, msg, exceptId) {
  const data = JSON.stringify(msg);
  for (const id of room.members) {
    const c = clients.get(id);
    if (c && id !== exceptId && c.ws.readyState === 1) c.ws.send(data);
  }
}

// ------------------------------------------------------------------ parties

function partyView(p) {
  return { code: p.code, leader: p.leader, members: p.members.map((id) => ({ id, name: clients.get(id)?.name ?? '?' })) };
}

function pushParty(p) {
  const view = partyView(p);
  for (const id of p.members) send(clients.get(id), { type: 'party', party: view });
}

function leaveParty(c) {
  const p = parties.get(c.party);
  c.party = null;
  send(c, { type: 'party', party: null });
  if (!p) return;
  p.members = p.members.filter((id) => id !== c.id);
  if (!p.members.length) return parties.delete(p.code);
  if (p.leader === c.id) p.leader = p.members[0];
  pushParty(p);
}

// ------------------------------------------------------------------ rooms

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
  const msg = JSON.stringify({ type: 'rooms', rooms: roomList() });
  for (const c of clients.values()) if (!c.room && c.ws.readyState === 1) c.ws.send(msg);
}

/** Who moves with this player into a room: their whole party if they lead one. */
function groupFor(c) {
  const p = parties.get(c.party);
  if (!p || p.leader !== c.id) return [c];
  return p.members.map((id) => clients.get(id)).filter((m) => m && (!m.room || m.id === c.id));
}

function canEnterRoom(c, r) {
  if (c.room) return 'You are already in a room';
  const p = parties.get(c.party);
  if (p && p.leader !== c.id) {
    // Non-leaders may only follow their leader.
    const leader = clients.get(p.leader);
    if (leader?.room !== r?.code) return 'Only your party leader can choose a room';
  }
  return null;
}

function addToRoom(r, members) {
  for (const m of members) {
    if (m.room) continue;
    m.room = r.code;
    r.members.push(m.id);
  }
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
    clearInterval(r.timer);
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
  const players = r.members.map((id, i) => ({ id, name: clients.get(id)?.name ?? '?', color: PLAYER_COLORS[i % PLAYER_COLORS.length], loadout: clients.get(id)?.loadout }));
  // Versus: everyone gets their own map and fights to outlast the others.
  r.sim = r.mode === 'versus' ? new VersusSim(players) : new Sim(players, { mode: r.difficulty });
  r.tick = 0;
  broadcastRoom(r, { type: 'game.start', host: r.host, mode: r.mode, totalWaves: r.mode === 'versus' ? 0 : r.sim.waves.length, s: r.sim.snapshot() });
  pushRoom(r);
  pushRoomList();
  r.timer = setInterval(() => stepRoom(r), TICK_MS);
}

function stepRoom(r) {
  const sim = r.sim;
  sim.step(TICK_MS / 1000);
  const ev = sim.events;
  sim.events = [];
  r.tick++;
  const msg = { type: 'tick', ev };
  // Snapshots at a fixed rate, plus immediately when towers/players change so actions feel snappy.
  if (r.tick % MP.snapshotEvery === 0 || ev.some((e) => e.k !== 'shot' && e.k !== 'kill' && e.k !== 'ushot')) msg.s = sim.snapshot();
  if (ev.length || msg.s) broadcastRoom(r, msg);
  if (sim.over) {
    clearInterval(r.timer);
    r.timer = null;
    r.sim = null;
    r.state = 'lobby';
    pushRoom(r);
    pushRoomList();
  }
}

// ------------------------------------------------------------------ message handling

const handlers = {
  hello(c, m) {
    c.name = clean(m.name, 16) || `Player${c.id}`;
    send(c, { type: 'welcome', id: c.id, name: c.name });
    send(c, { type: 'rooms', rooms: roomList() });
  },
  setName(c, m) {
    c.name = clean(m.name, 16) || c.name;
    send(c, { type: 'welcome', id: c.id, name: c.name });
    if (c.party) pushParty(parties.get(c.party));
  },

  /** The towers this player brings into games (their client-side loadout). */
  loadout(c, m) {
    if (!Array.isArray(m.towers)) return;
    const towers = [...new Set(m.towers.filter((t) => typeof t === 'string' && Object.hasOwn(TOWERS, t)))].slice(0, GAME.loadoutSize);
    c.loadout = towers.length ? towers : null;
  },

  'party.create'(c) {
    if (c.room) return error(c, 'Leave your room first');
    if (c.party) leaveParty(c);
    const p = { code: makeCode(parties), leader: c.id, members: [c.id] };
    parties.set(p.code, p);
    c.party = p.code;
    pushParty(p);
  },
  'party.join'(c, m) {
    if (c.room) return error(c, 'Leave your room first');
    const p = parties.get(clean(m.code, 8).toUpperCase());
    if (!p) return error(c, 'No party with that code');
    if (p.members.includes(c.id)) return;
    if (p.members.length >= MP.maxPartySize) return error(c, 'That party is full');
    if (c.party) leaveParty(c);
    p.members.push(c.id);
    c.party = p.code;
    pushParty(p);
  },
  'party.leave'(c) {
    if (c.party) leaveParty(c);
  },
  'party.kick'(c, m) {
    const p = parties.get(c.party);
    if (!p || p.leader !== c.id || m.id === c.id) return;
    const target = clients.get(m.id);
    if (target && target.party === p.code) {
      leaveParty(target);
      error(target, 'You were removed from the party');
    }
  },

  'rooms.list'(c) {
    send(c, { type: 'rooms', rooms: roomList() });
  },
  'room.create'(c, m) {
    const why = canEnterRoom(c, null);
    if (why) return error(c, why);
    const group = groupFor(c);
    if (group.length > MP.maxRoomPlayers) return error(c, 'Your party is too big for a room');
    const r = {
      code: makeCode(rooms),
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
    addToRoom(r, group);
  },
  'room.join'(c, m) {
    const r = rooms.get(clean(m.code, 8).toUpperCase());
    if (!r) return error(c, 'No room with that code');
    const why = canEnterRoom(c, r);
    if (why) return error(c, why);
    if (r.state !== 'lobby') return error(c, 'That room is already playing');
    const group = groupFor(c);
    if (r.members.length + group.length > MP.maxRoomPlayers)
      return error(c, group.length > 1 ? 'Not enough space for your whole party' : 'That room is full');
    addToRoom(r, group);
    broadcastRoom(r, { type: 'chat', system: true, text: `${group.map((g) => g.name).join(', ')} joined` });
  },
  'room.leave'(c) {
    const r = rooms.get(c.room);
    if (!r) return;
    const p = parties.get(c.party);
    // A party leader takes their party along.
    const leaving = p && p.leader === c.id ? p.members.map((id) => clients.get(id)).filter((m) => m?.room === r.code) : [c];
    for (const m of leaving) leaveRoom(m);
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
      leaveRoom(target);
      error(target, 'You were removed from the room');
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

// ------------------------------------------------------------------ HTTP + WebSocket

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath);
  if (!file.startsWith(DIST)) {
    res.writeHead(403).end();
    return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Client not built. Run "npm run build", or use "npm run dev" for development.');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }).end(data);
  });
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });

wss.on('connection', (ws) => {
  const c = { id: `p${nextClientId++}`, name: 'Player', ws, party: null, room: null, loadout: null };
  clients.set(c.id, c);
  ws.on('message', (data) => {
    let m;
    try {
      m = JSON.parse(data);
    } catch {
      return;
    }
    const h = handlers[m?.type];
    if (!h) return;
    try {
      h(c, m);
    } catch (e) {
      console.error(`Error handling ${m.type}:`, e);
    }
  });
  ws.on('close', () => {
    if (c.room) leaveRoom(c);
    if (c.party) leaveParty(c);
    clients.delete(c.id);
  });
});

server.listen(PORT, () => console.log(`TD Infinity server on http://localhost:${PORT} (WebSocket /ws)`));
