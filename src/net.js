// Peer-to-peer multiplayer (PeerJS / WebRTC), so the game works as a static site.
//
// Whoever creates a room hosts it: their browser runs the room hub (hub.js, the same code the
// optional Node server runs) and registers with the PeerJS signaling server as `tdinf-<CODE>`.
// Friends join by code: their browser connects straight to the host's and talks to the hub.
// The host's own messages go to the hub without a network hop.
//
// The rest of the game only sees this interface: connect(name), send(msg), on(type, fn),
// disconnect(), id, name. Messages are the same ones the WebSocket server used.
import { Peer } from 'peerjs';
import { createHub, makeCode } from './hub.js';

const PEER_PREFIX = 'tdinf-';
const JOIN_TIMEOUT = 12000;
// Quick Play (no room code): rooms for a mode sit at well-known codes, QEASY1, QEASY2... A player
// looking for a game tries each in turn: the first open one takes them in; when a code has no host
// at all, their own browser hosts a new game there and waits for others. No server needed.
const QUICK_SLOTS = 8;
// Heartbeats: host and guests ping each other every PING_MS. WebRTC can take half a minute to
// notice a closed tab, so a link that's been silent for SILENT_MS counts as gone.
const PING_MS = 2000;
const SILENT_MS = 8000;

/**
 * setInterval / clearInterval driven by a Web Worker. Browsers slow a background tab's own
 * timers to about once a second (or less), which would freeze the game for everyone while the
 * host looks at another tab; a worker's timers keep their pace.
 */
function workerTimers() {
  let worker;
  try {
    const src = `const t = new Map();
      onmessage = (e) => {
        const [op, id, ms] = e.data;
        if (op === 'start') t.set(id, setInterval(() => postMessage(id), ms));
        else { clearInterval(t.get(id)); t.delete(id); }
      };`;
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  } catch {
    return { setInterval: (fn, ms) => setInterval(fn, ms), clearInterval: (id) => clearInterval(id) }; // no workers: plain timers
  }
  const fns = new Map();
  let next = 1;
  worker.onmessage = (e) => fns.get(e.data)?.();
  return {
    setInterval(fn, ms) {
      const id = next++;
      fns.set(id, fn);
      worker.postMessage(['start', id, ms]);
      return id;
    },
    clearInterval(id) {
      fns.delete(id);
      worker.postMessage(['stop', id]);
    },
    terminate: () => worker.terminate(),
  };
}

/** A readable message for a PeerJS error type. */
function peerError(type) {
  if (type === 'peer-unavailable') return 'No room with that code (or the host has left)';
  if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed')
    return "Couldn't reach the matchmaking server. Check your internet connection.";
  if (type === 'browser-incompatible') return "This browser can't play online";
  if (type === 'webrtc') return "Couldn't connect to the host (a firewall may be blocking it)";
  return 'Connection problem. Try again.';
}

export class Net {
  constructor() {
    this.handlers = new Map(); // type -> Set<fn>
    this.id = null;
    this.name = null;
    this.loadout = null; // last 'loadout' message, re-sent whenever we join a room
    this.link = null; // { kind: 'host' | 'guest', peer, ... } while in (or joining) a room
    // Closing the tab: tell the others right away instead of letting them time out.
    addEventListener('pagehide', () => this.teardown());
  }

  /** Online at all? Multiplayer is always "available"; rooms connect on demand. */
  get connected() {
    return true;
  }

  /** Sets our name. Nothing connects until a room is created or joined. */
  connect(name) {
    this.name = name;
    if (this.link?.ready) this.send({ type: 'setName', name });
    return Promise.resolve({ id: this.id, name });
  }

  /** Leaves any room and closes every connection. */
  disconnect() {
    this.teardown();
  }

  send(msg) {
    if (msg.type === 'loadout') this.loadout = msg;
    if (!this.link) {
      if (msg.type === 'room.create') this.host(msg);
      else if (msg.type === 'room.join') this.join(msg.code);
      else if (msg.type === 'room.quick') this.quick(msg);
      return;
    }
    if (msg.type === 'room.create' || msg.type === 'room.join' || msg.type === 'room.quick') return this.emit({ type: 'error', msg: 'You are already in a room' });
    if (this.link.ready) this.link.send(msg);
  }

  /** Subscribe to a message type. Returns an unsubscribe function. */
  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.handlers.get(type).delete(fn);
  }

  emit(msg) {
    if (msg.type === 'welcome') {
      this.id = msg.id;
      this.name = msg.name;
    }
    const set = this.handlers.get(msg.type);
    if (set) for (const fn of [...set]) fn(msg);
    // Out of the room (left, kicked, or the game was ours and we left): hang up.
    if (msg.type === 'room' && !msg.room && this.link?.inRoom) this.teardown();
    else if (msg.type === 'room' && msg.room && this.link) this.link.inRoom = true;
  }

  /** Something went wrong before we got into a room: report it and reset. */
  fail(text) {
    this.teardown();
    this.emit({ type: 'error', msg: text });
  }

  /** Closes the current link. Only an unexpected drop tells the lobby ('close'). */
  teardown(dropped = false) {
    const l = this.link;
    if (!l) return;
    this.link = null;
    clearTimeout(l.timer);
    if (l.beat != null) l.timers.clearInterval(l.beat);
    if (l.kind === 'host') {
      for (const g of l.guests) {
        if (g.conn.open) g.conn.send({ type: 'bye' });
        g.conn.close();
      }
      l.hub.shutdown();
    } else {
      if (l.conn?.open) l.conn.send({ type: 'bye' });
      l.conn?.close();
    }
    l.timers.terminate?.();
    l.peer.destroy();
    if (dropped && l.inRoom) this.emit({ type: 'close' });
  }

  // ---------------------------------------------------------------- hosting

  /**
   * Quick Play: looks for an open game of `msg.difficulty` (or Versus) at the well-known codes,
   * slot by slot, and hosts one when a slot is empty. msg: { mode, difficulty, map, seats, bots, name }.
   */
  quick(msg, slot = 1) {
    if (slot > QUICK_SLOTS) return this.fail('Every game is full right now. Try again in a moment!');
    const key = String(msg.mode === 'versus' ? 'versus' : msg.difficulty).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 9);
    this.emit({ type: 'quick', text: slot === 1 ? 'Looking for a game…' : `Looking for a game… (${slot})` });
    this.join(`Q${key}${slot}`, { ...msg, slot });
  }

  /**
   * Create a room: become a PeerJS peer named after a fresh room code (or `code`) and run the hub
   * here. A Quick Play host (createMsg.quick) that finds its code taken joins that game instead.
   */
  host(createMsg, attempt = 0, code = makeCode()) {
    const peer = new Peer(PEER_PREFIX + code);
    const timers = workerTimers();
    const hub = createHub(timers);
    const link = { kind: 'host', peer, hub, timers, guests: new Set(), ready: false, inRoom: false };
    this.link = link;
    // Ping every guest, and drop guests we haven't heard from in a while.
    link.beat = timers.setInterval(() => {
      const now = Date.now();
      for (const g of link.guests) {
        if (now - g.heard > SILENT_MS) g.conn.close();
        else if (g.conn.open) g.conn.send({ type: 'ping' });
      }
    }, PING_MS);
    // Our own messages go straight to the hub. Replies come back on a microtask, like they
    // would over the network, so handlers never run inside each other.
    const me = hub.connect((msg) => queueMicrotask(() => this.link === link && this.emit(msg)));
    link.send = (msg) => me.receive(msg);
    link.timer = setTimeout(() => this.link === link && this.fail(peerError('network')), JOIN_TIMEOUT);

    peer.on('open', () => {
      if (this.link !== link) return;
      clearTimeout(link.timer);
      link.ready = true;
      me.receive({ type: 'hello', name: this.name });
      if (this.loadout) me.receive(this.loadout);
      me.receive({ ...createMsg, code });
    });

    peer.on('connection', (conn) => {
      if (this.link !== link) return conn.close();
      const guest = { conn, client: null, heard: Date.now() };
      link.guests.add(guest);
      conn.on('open', () => {
        if (this.link !== link) return conn.close();
        guest.client = hub.connect((msg) => {
          if (conn.open) conn.send(msg);
        });
      });
      const gone = () => {
        link.guests.delete(guest);
        guest.client?.close();
        guest.client = null;
      };
      conn.on('data', (m) => {
        guest.heard = Date.now();
        if (m?.type === 'ping') return;
        if (m?.type === 'bye') return conn.close();
        guest.client?.receive(m);
      });
      conn.on('close', gone);
      conn.on('error', gone);
    });

    peer.on('error', (err) => {
      if (this.link !== link) return;
      // Someone already has that code: try another one (Quick Play: someone just opened a game
      // at this slot, so join it).
      if (err.type === 'unavailable-id' && !link.inRoom && attempt < 4) {
        this.teardown();
        if (createMsg.quick) return this.quick(createMsg.quick, createMsg.quick.slot);
        return this.host(createMsg, attempt + 1);
      }
      // One guest's connection failing doesn't end the room.
      if (link.inRoom && (err.type === 'peer-unavailable' || err.type === 'webrtc')) return;
      if (link.inRoom) {
        if (!peer.destroyed && peer.disconnected) peer.reconnect();
        return;
      }
      this.fail(peerError(err.type));
    });

    // Lost the signaling server: games keep going over the direct connections, but new friends
    // couldn't find the room, so reconnect.
    peer.on('disconnected', () => {
      if (this.link === link && !peer.destroyed) peer.reconnect();
    });
  }

  // ---------------------------------------------------------------- joining

  /**
   * Join a room by code: connect straight to the host's browser. `quick` (Quick Play): the
   * settings to host with when nobody's at this code, and the next code is tried when this room
   * is full or already playing.
   */
  join(rawCode, quick = null) {
    const code = String(rawCode ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 5 || code.length > 12) return this.emit({ type: 'error', msg: 'Room codes are 5 letters and numbers' });
    const peer = new Peer();
    const timers = workerTimers();
    const link = { kind: 'guest', peer, timers, conn: null, ready: false, inRoom: false, heard: Date.now(), quick };
    this.link = link;
    // Ping the host, and give up if the host has gone quiet (closed the tab, lost internet).
    link.beat = timers.setInterval(() => {
      if (!link.conn?.open) return;
      if (link.inRoom && Date.now() - link.heard > SILENT_MS) return this.teardown(true);
      link.conn.send({ type: 'ping' });
    }, PING_MS);
    link.send = (msg) => {
      if (link.conn?.open) link.conn.send(msg);
    };
    link.timer = setTimeout(() => this.link === link && this.fail(peerError('peer-unavailable')), JOIN_TIMEOUT);

    peer.on('open', () => {
      if (this.link !== link) return;
      const conn = peer.connect(PEER_PREFIX + code, { reliable: true, serialization: 'json' });
      link.conn = conn;
      conn.on('open', () => {
        if (this.link !== link) return;
        clearTimeout(link.timer);
        link.ready = true;
        link.heard = Date.now();
        conn.send({ type: 'hello', name: this.name });
        if (this.loadout) conn.send(this.loadout);
        conn.send({ type: 'room.join', code });
      });
      conn.on('data', (m) => {
        if (this.link !== link) return;
        link.heard = Date.now();
        if (m?.type === 'ping') return;
        if (m?.type === 'bye') return this.teardown(true);
        // Turned away (room full, already playing...) before getting in: hang up (Quick Play: try the next slot).
        if (m?.type === 'error' && !link.inRoom && quick) {
          this.teardown();
          return this.quick(quick, quick.slot + 1);
        }
        this.emit(m);
        if (m.type === 'error' && !link.inRoom) this.teardown();
      });
      conn.on('close', () => {
        if (this.link !== link) return;
        if (link.inRoom) this.teardown(true);
        else this.fail('Lost the connection to the host');
      });
    });

    peer.on('error', (err) => {
      if (this.link !== link) return;
      if (link.inRoom) {
        if (err.type === 'network' || err.type === 'disconnected') return; // the direct link may still work
        return this.teardown(true);
      }
      // Quick Play: nobody's hosting at this code, so host the game here and wait for others.
      if (quick && err.type === 'peer-unavailable') {
        this.teardown();
        this.emit({ type: 'quick', text: 'No open game found: starting one. Waiting for players…' });
        return this.host({ type: 'room.create', name: quick.name, isPublic: true, quick, mode: quick.mode, difficulty: quick.difficulty, map: quick.map, seats: quick.seats, bots: quick.bots }, 0, code);
      }
      this.fail(peerError(err.type));
    });
  }
}
