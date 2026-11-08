// Menus: title screen, multiplayer hub (party + room browser), and room lobby.
import { DEFAULT_DIFFICULTY, DIFFICULTIES, GAME, MP, PLAYER_COLORS, TOWERS, VERSUS, detection, difficulty } from './config.js';
import { LoadoutScreen } from './loadout.js';
import { audio } from './audio.js';
import { profile } from './profile.js';
import { abilityText, boostText, cannonText, damageText, detectText, dpsText, extrasText, gunText, rosterText, unitDps, unitName } from './stats.js';
import { LocalSession, NetSession } from './session.js';

const $ = (id) => document.getElementById(id);
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
const SCREENS = { title: 'menu', loadout: 'loadout-screen', mp: 'mp-menu', room: 'room-screen' };
const num = (n) => (n === Infinity ? '∞' : n.toLocaleString());

export class Lobby {
  constructor(net) {
    this.net = net;
    this.client = null; // set by main after the GameClient exists
    this.party = null;
    this.room = null;
    this.rooms = [];
    this.inGame = false;

    const nameInput = $('name-input');
    nameInput.value = localStorage.getItem('td.name') || '';
    nameInput.addEventListener('input', () => localStorage.setItem('td.name', nameInput.value.trim()));

    // Difficulty (Solo picks it on the title screen; in a room the host picks it).
    this.difficulty = DIFFICULTIES[localStorage.getItem('td.difficulty')] ? localStorage.getItem('td.difficulty') : DEFAULT_DIFFICULTY;
    $('difficulty-row').addEventListener('click', (e) => {
      const b = e.target.closest('[data-diff]');
      if (!b) return;
      this.difficulty = b.dataset.diff;
      localStorage.setItem('td.difficulty', this.difficulty);
      this.renderDifficulty();
    });
    this.renderDifficulty();

    $('solo-btn').onclick = () => {
      audio.unlock();
      this.startSolo();
    };
    $('mp-btn').onclick = () => {
      audio.unlock();
      this.openMultiplayer();
    };
    $('mp-back').onclick = () => {
      this.net.disconnect();
      this.party = null;
      this.show('title');
    };

    // Loadout & shop (one screen)
    $('loadout-btn').onclick = () => this.show('loadout');
    this.loadoutScreen = new LoadoutScreen(this);
    profile.onChange(() => {
      this.renderInventory();
      this.loadoutScreen.render();
      this.net.send({ type: 'loadout', towers: profile.battleLoadout() });
    });

    // Party
    $('party-body').addEventListener('click', (e) => {
      const b = e.target.closest('[data-party]');
      if (!b) return;
      const act = b.dataset.party;
      if (act === 'create') net.send({ type: 'party.create' });
      if (act === 'join') net.send({ type: 'party.join', code: $('party-code').value });
      if (act === 'leave') net.send({ type: 'party.leave' });
      if (act === 'kick') net.send({ type: 'party.kick', id: b.dataset.id });
      if (act === 'copy') navigator.clipboard?.writeText(this.party.code).then(() => this.toast('Party code copied!'));
    });

    // Rooms
    $('room-create').onclick = () => net.send({ type: 'room.create', name: $('room-name').value, isPublic: $('room-public').checked, difficulty: this.difficulty });
    $('room-join').onclick = () => net.send({ type: 'room.join', code: $('room-code').value });
    $('room-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-join]');
      if (b) net.send({ type: 'room.join', code: b.dataset.join });
    });

    // Room screen
    $('room-leave').onclick = () => net.send({ type: 'room.leave' });
    $('room-ready').onclick = () => net.send({ type: 'room.ready', ready: !this.room?.members.find((m) => m.id === net.id)?.ready });
    $('room-start').onclick = () => net.send({ type: 'room.start' });
    $('room-mode').addEventListener('click', (e) => {
      const b = e.target.closest('[data-mode]');
      if (b) net.send({ type: 'room.mode', mode: b.dataset.mode });
    });
    $('room-difficulty').addEventListener('click', (e) => {
      const b = e.target.closest('[data-diff]');
      if (b) net.send({ type: 'room.difficulty', difficulty: b.dataset.diff });
    });
    $('room-players').addEventListener('click', (e) => {
      const b = e.target.closest('[data-kick]');
      if (b) net.send({ type: 'room.kick', id: b.dataset.kick });
    });
    $('room-chat-input').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const text = e.target.value.trim();
      if (text) net.send({ type: 'room.chat', text });
      e.target.value = '';
    });

    // Server messages
    net.on('party', (m) => {
      this.party = m.party;
      this.renderParty();
      this.renderRooms();
    });
    net.on('rooms', (m) => {
      this.rooms = m.rooms;
      this.renderRooms();
    });
    net.on('room', (m) => this.onRoom(m.room));
    net.on('chat', (m) => this.onChat(m));
    net.on('error', (m) => {
      if (!this.inGame) this.toast(m.msg);
    });
    net.on('game.start', (m) => this.startNetGame(m));
    net.on('close', () => {
      const wasPlaying = this.inGame && this.client.session?.mp;
      this.party = null;
      this.room = null;
      if (wasPlaying || !this.inGame) {
        if (wasPlaying) this.client.stop();
        this.inGame = false;
        this.show('title');
        this.toast('Disconnected from the server');
      }
    });
  }

  get name() {
    return $('name-input').value.trim() || 'Player';
  }

  show(screen) {
    for (const [key, id] of Object.entries(SCREENS)) $(id).classList.toggle('hidden', key !== screen);
    if (screen === 'title') this.renderInventory();
    if (screen === 'loadout') this.loadoutScreen.show();
    else this.loadoutScreen?.hide();
  }

  toast(msg, ms = 2200) {
    const t = $('menu-toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  /** Callbacks the GameClient uses for buttons that leave the game. */
  clientHooks() {
    return {
      onLeave: () => {
        if (this.client.session?.mp) this.net.send({ type: 'room.leave' });
        else this.backToTitle();
      },
      onEndPrimary: () => {
        if (this.client.session?.mp) {
          this.client.stop();
          this.inGame = false;
          this.show(this.room ? 'room' : 'mp');
          this.renderRoom();
        } else this.startSolo();
      },
      onEndSecondary: () => this.backToTitle(),
      onChat: (text) => this.net.send({ type: 'room.chat', text }),
    };
  }

  backToTitle() {
    this.client.stop();
    this.inGame = false;
    this.show('title');
  }

  startSolo() {
    this.inGame = true;
    this.show(null);
    this.client.start(new LocalSession(this.name, PLAYER_COLORS[0], this.difficulty));
  }

  /** Title screen difficulty buttons. */
  renderDifficulty() {
    $('difficulty-row').innerHTML = `<span>Difficulty:</span>${Object.entries(DIFFICULTIES)
      .map(([key, d]) => `<button class="btn small ${key === this.difficulty ? 'blue on' : ''}" data-diff="${key}">${d.icon} ${esc(d.name)}</button>`)
      .join('')}`;
    $('difficulty-hint').textContent = difficulty(this.difficulty).desc;
  }

  async openMultiplayer() {
    $('mp-btn').disabled = true;
    try {
      await this.net.connect(this.name);
      this.net.send({ type: 'loadout', towers: profile.battleLoadout() });
      $('mp-me').textContent = `Playing as ${this.net.name}`;
      this.renderParty();
      this.renderRooms();
      this.show(this.room ? 'room' : 'mp');
    } catch {
      this.toast("Couldn't reach the multiplayer server. Is it running? (npm run dev)", 4000);
    } finally {
      $('mp-btn').disabled = false;
    }
  }

  startNetGame(msg) {
    this.inGame = true;
    this.show(null);
    this.client.start(new NetSession(this.net, msg));
  }

  onRoom(room) {
    const wasIn = !!this.room;
    this.room = room;
    if (!room) {
      $('room-chat-log').innerHTML = '';
      if (this.inGame && this.client.session?.mp) {
        this.client.stop();
        this.inGame = false;
      }
      if (!this.inGame && wasIn) this.show('mp');
      return;
    }
    if (!this.inGame) {
      this.show('room');
      if (!wasIn) $('room-chat-input').focus();
    }
    this.renderRoom();
  }

  onChat(m) {
    const log = $('room-chat-log');
    const div = document.createElement('div');
    div.className = 'chat-line';
    div.innerHTML = m.system ? `<i>${esc(m.text)}</i>` : `<b style="color:${hex(m.color ?? 0xffffff)}">${esc(m.name)}:</b> ${esc(m.text)}`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    this.client.addChat(m);
  }

  // ------------------------------------------------------------------ rendering

  get icons() {
    return this.client?.icons ?? {};
  }

  /** Title screen: just the currency counters (the towers live in the Loadout menu). */
  renderInventory() {
    $('menu-credits').textContent = num(profile.credits);
    $('menu-shards').textContent = num(profile.shards);
  }

  /** Shop table columns after Lv/Upgrade/Cost/Total: headers and a row-cells function per level. */
  statColumns(def, burst, extras) {
    const detect = (l) => {
      const text = detectText(detection(def, def.levels.indexOf(l)));
      return `<td class="${text === 'None' ? 'no' : 'yes'}">${text}</td>`;
    };
    const th = (names) => names.map((n) => `<th>${n}</th>`).join('');
    if (def.kind === 'income') return { head: th(['Income per wave']), cells: (l) => `<td class="yes">$${l.income.toLocaleString()}</td>` };
    if (def.kind === 'support') {
      return {
        head: th(['Boost range', 'Boosts', 'Shoots', 'Abilities']),
        cells: (l) => `<td>${l.aura}</td><td>${boostText(l)}</td><td>${l.damage ? `${l.damage} dmg / ${l.cooldown}s` : '–'}</td>
          <td>${l.abilities?.map((a) => esc(abilityText(a))).join('<br>') || '–'}</td>`,
      };
    }
    if (def.kind === 'spawner' && def.levels[0].roster) {
      // Mercenary Base: a list of units per level, plus its damage boost.
      return {
        head: th(['Units', 'Queues', 'Boost', 'Abilities', 'Detection']),
        cells: (l) => `<td>${l.roster.map((r) => esc(rosterText(r))).join('<br>')}</td><td>${l.queues}</td>
          <td>${l.aura ? `${boostText(l)} within ${l.aura}` : '–'}</td><td>${l.abilities?.map((a) => esc(abilityText(a))).join('<br>') || '–'}</td>${detect(l)}`,
      };
    }
    if (def.kind === 'spawner') {
      return {
        head: th(['Unit', 'Gun', 'Cannon', 'Extras', 'DPS', 'Detection']),
        cells: (l) => {
          const u = l.unit;
          const extra = [u.ram && 'Rams', u.explode && `Explodes (${u.explode.damage})`, l.spawnNow && 'Sends at once', l.spawnEvery && l.spawnEvery !== def.spawnEvery && `Every ${l.spawnEvery}s`, ...(l.abilities || []).map((a) => abilityText(a))].filter(Boolean).join(', ');
          return `<td>${unitName(u)}</td><td>${u.gun ? `${gunText(u.gun)}, range ${u.gun.range}` : '–'}</td><td>${cannonText(u.cannon) || '–'}</td>
            <td>${extra || '–'}</td><td>${unitDps(u, l.spawnEvery ?? def.spawnEvery)}</td>${detect(l)}`;
        },
      };
    }
    return {
      head: th(['Dmg', ...(burst ? ['Burst'] : []), 'Firerate', 'Range', 'DPS', ...(extras ? ['Extras'] : []), 'Detection']),
      cells: (l) =>
        `<td>${damageText(l)}</td>${burst ? `<td>${l.burst}</td>` : ''}<td>${l.cooldown}s</td><td>${l.range}</td><td>${dpsText(l)}</td>${extras ? `<td>${extrasText(l) || '–'}</td>` : ''}${detect(l)}`,
    };
  }

  renderParty() {
    const p = this.party;
    const me = this.net.id;
    const body = $('party-body');
    if (!p) {
      body.innerHTML = `
        <p class="hint">Team up with friends! Create a party and share the code. The party leader picks a room and everyone joins together.</p>
        <button class="btn green wide" data-party="create">Create Party</button>
        <div class="row"><input id="party-code" placeholder="Party code" maxlength="5"><button class="btn blue" data-party="join">Join Party</button></div>`;
      return;
    }
    const leader = p.leader === me;
    body.innerHTML = `
      <div class="code-box">Party code <b>${esc(p.code)}</b> <button class="btn small" data-party="copy">Copy</button></div>
      <div class="members">${p.members
        .map(
          (m) => `<div class="member">
            <span>${m.id === p.leader ? '<span class="crown">★</span> ' : ''}${esc(m.name)}${m.id === me ? ' <small>(you)</small>' : ''}</span>
            ${leader && m.id !== me ? `<button class="btn small red" data-party="kick" data-id="${m.id}">✕</button>` : ''}
          </div>`,
        )
        .join('')}</div>
      <p class="hint">${p.members.length}/${MP.maxPartySize} · ${leader ? 'You are the leader — create or join a room and your party comes with you.' : 'Waiting for the leader to pick a room…'}</p>
      <button class="btn red wide" data-party="leave">Leave Party</button>`;
  }

  renderRooms() {
    const canPick = !this.party || this.party.leader === this.net.id;
    $('room-create').disabled = !canPick;
    $('room-join').disabled = !canPick;
    const list = $('room-list');
    if (!this.rooms.length) {
      list.innerHTML = '<p class="hint">No public rooms yet — create one!</p>';
      return;
    }
    list.innerHTML = this.rooms
      .map((r) => {
        const full = r.count >= r.max;
        const playing = r.state !== 'lobby';
        return `<div class="room-row">
          <div><div class="room-name">${esc(r.name)}</div><div class="hint">Host: ${esc(r.host)} · ${r.code}</div></div>
          ${r.mode === 'versus' ? '<span class="badge vs">VERSUS</span>' : `<span class="badge">${esc(difficulty(r.difficulty).name)}</span>`}
          <span class="badge ${playing ? 'playing' : ''}">${playing ? 'In game' : `${r.count}/${r.max}`}</span>
          <button class="btn blue small" data-join="${r.code}" ${full || playing || !canPick ? 'disabled' : ''}>Join</button>
        </div>`;
      })
      .join('');
  }

  renderRoom() {
    const r = this.room;
    if (!r) return;
    const me = this.net.id;
    const isHost = r.host === me;
    $('room-title').textContent = r.name;
    $('room-sub').innerHTML = `Code <b>${esc(r.code)}</b> · ${r.isPublic ? 'Public' : 'Private'} · ${r.members.length}/${r.max} players`;
    $('room-players').innerHTML = r.members
      .map(
        (m) => `<div class="member">
          <span><span class="dot" style="background:${hex(m.color)}"></span>${m.id === r.host ? '<span class="crown">★</span> ' : ''}${esc(m.name)}${m.id === me ? ' <small>(you)</small>' : ''}</span>
          <span>${m.id === r.host ? '<span class="tag host">Host</span>' : m.ready ? '<span class="tag ready">Ready</span>' : '<span class="tag">Not ready</span>'}
          ${isHost && m.id !== me ? `<button class="btn small red" data-kick="${m.id}">✕</button>` : ''}</span>
        </div>`,
      )
      .join('');
    const versus = r.mode === 'versus';
    $('room-mode').innerHTML = isHost
      ? `<span>Mode:</span>
         <button class="btn small ${versus ? '' : 'blue on'}" data-mode="coop">🤝 Co-op</button>
         <button class="btn small ${versus ? 'red on' : ''}" data-mode="versus">⚔ Versus</button>`
      : `<span>Mode: <b>${versus ? '⚔ Versus' : '🤝 Co-op'}</b></span>`;
    const diff = difficulty(r.difficulty);
    $('room-difficulty').classList.toggle('hidden', versus);
    $('room-difficulty').innerHTML = isHost
      ? `<span>Difficulty:</span>${Object.entries(DIFFICULTIES)
        .map(([key, d]) => `<button class="btn small ${key === r.difficulty ? 'blue on' : ''}" data-diff="${key}">${d.icon} ${esc(d.name)}</button>`)
        .join('')}`
      : `<span>Difficulty: <b>${diff.icon} ${esc(diff.name)}</b></span>`;
    $('room-mode-hint').textContent = versus
      ? 'Versus: everyone gets their own map, joined by bridges. Waves never stop — the last base standing wins! Spend cash to send zombies to an opponent. Anarchists work here.'
      : `Co-op: everyone has their own cash and towers, and every kill pays the whole team. Enemies get tougher with more players. ${diff.desc}`;
    const meReady = r.members.find((m) => m.id === me)?.ready;
    const allReady = r.members.every((m) => m.id === r.host || m.ready);
    const tooFew = versus && r.members.length < VERSUS.minPlayers;
    $('room-ready').classList.toggle('hidden', isHost);
    $('room-ready').textContent = meReady ? 'Not Ready' : 'Ready!';
    $('room-ready').className = `btn ${meReady ? '' : 'green'}${isHost ? ' hidden' : ''}`;
    $('room-start').classList.toggle('hidden', !isHost);
    $('room-start').disabled = !allReady || tooFew || r.state !== 'lobby';
    $('room-start').textContent = tooFew ? `Versus needs ${VERSUS.minPlayers}+ players` : allReady ? 'Start Game ▶' : 'Waiting for players…';
  }
}
