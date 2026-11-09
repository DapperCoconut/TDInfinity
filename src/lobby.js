// Menus: title screen, multiplayer menu (create / join a room by code), and room lobby.
import { DEFAULT_DIFFICULTY, DIFFICULTIES, GAME, MP, PLAYER_COLORS, TOWERS, VERSUS, detection, difficulty } from './config.js';
import { LoadoutScreen } from './loadout.js';
import { audio } from './audio.js';
import { profile } from './profile.js';
import { abilityText, boostText, cannonText, damageText, detectText, dpsText, extrasText, gunText, rosterText, spawnerUnits, unitDps, unitName } from './stats.js';
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
    this.room = null;
    this.busy = false; // creating or joining a room (connecting to peers)
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
      this.setBusy(false);
      this.show('title');
    };

    // Loadout & shop (one screen)
    $('loadout-btn').onclick = () => this.show('loadout');
    this.loadoutScreen = new LoadoutScreen(this);
    profile.onChange(() => {
      this.renderInventory();
      this.loadoutScreen.render();
      this.net.send({ type: 'loadout', towers: profile.battleLoadout(), evo: profile.evoLevels() });
    });

    // Rooms
    // Rooms are peer-to-peer: creating one makes this browser the host; joining connects to the
    // host's browser by its code (see net.js).
    $('room-create').onclick = () => {
      this.setBusy('Creating room…');
      net.send({ type: 'room.create', name: $('room-name').value, isPublic: false, difficulty: this.difficulty });
    };
    const join = () => {
      this.setBusy('Joining room…');
      net.send({ type: 'room.join', code: $('room-code').value });
    };
    $('room-join').onclick = join;
    $('room-code').addEventListener('keydown', (e) => e.key === 'Enter' && !this.busy && join());

    // Room screen
    $('room-sub').addEventListener('click', (e) => {
      const b = e.target.closest('[data-copy]');
      if (b) navigator.clipboard?.writeText(b.dataset.copy).then(() => this.toast('Room code copied! Send it to your friends.'));
    });
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
    net.on('room', (m) => this.onRoom(m.room));
    net.on('chat', (m) => this.onChat(m));
    net.on('error', (m) => {
      if (!this.room) this.setBusy(false); // creating / joining failed
      if (!this.inGame) this.toast(m.msg, 3500);
    });
    net.on('game.start', (m) => this.startNetGame(m));
    net.on('close', () => {
      const wasPlaying = this.inGame && this.client.session?.mp;
      this.room = null;
      $('room-chat-log').innerHTML = '';
      if (wasPlaying || !this.inGame) {
        if (wasPlaying) this.client.stop();
        this.inGame = false;
        this.show('mp');
        this.toast('Lost the connection to the room host', 3500);
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
        const credits = this.client.leaveCredits;
        this.client.leaveCredits = 0;
        if (this.client.session?.mp) this.net.send({ type: 'room.leave' });
        else this.backToTitle();
        if (credits) this.toast(`+${credits} credits for the waves you cleared`, 3000);
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
    this.client.start(new LocalSession(this.name, PLAYER_COLORS[0], this.difficulty, profile.evoLevels()));
  }

  /** Title screen difficulty buttons. */
  renderDifficulty() {
    $('difficulty-row').innerHTML = `<span>Difficulty:</span>${Object.entries(DIFFICULTIES)
      .map(([key, d]) => `<button class="btn small ${key === this.difficulty ? 'blue on' : ''}" data-diff="${key}">${d.icon} ${esc(d.name)}</button>`)
      .join('')}`;
    $('difficulty-hint').textContent = difficulty(this.difficulty).desc;
  }

  async openMultiplayer() {
    await this.net.connect(this.name);
    this.net.send({ type: 'loadout', towers: profile.battleLoadout(), evo: profile.evoLevels() });
    $('mp-me').textContent = `Playing as ${this.net.name}`;
    this.show(this.room ? 'room' : 'mp');
  }

  /** While creating / joining a room: show `text` and lock the buttons (false = done). */
  setBusy(text) {
    this.busy = !!text;
    $('room-create').disabled = this.busy;
    $('room-join').disabled = this.busy;
    $('mp-status').textContent = text || '';
  }

  startNetGame(msg) {
    this.inGame = true;
    this.show(null);
    this.client.start(new NetSession(this.net, msg));
  }

  onRoom(room) {
    const wasIn = !!this.room;
    this.room = room;
    this.setBusy(false);
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
    // Oil Derrick: cash every few seconds, plus (Bottom path) every wave.
    if (def.kind === 'income' && def.levels.some((l) => l.oil)) {
      return { head: th(['Oil', 'Income per wave']), cells: (l) => `<td class="yes">${l.oil ? `$${l.oil.pay.toLocaleString()} every ${l.oil.every}s` : '–'}</td><td class="yes">${l.income ? `$${l.income.toLocaleString()}` : '–'}</td>` };
    }
    if (def.kind === 'income') return { head: th(['Income per wave']), cells: (l) => `<td class="yes">$${(l.income ?? 0).toLocaleString()}</td>` };
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
          // Armored Factory levels can send a second vehicle: one line per vehicle in each column.
          const us = spawnerUnits(l, def);
          const col = (f) => `<td>${us.map(f).join('<br>')}</td>`;
          const extra = (u, i) =>
            [u.ram && 'Rams', u.explode && `Explodes (${u.explode.damage})`, u.air && 'Flies', u.defense && `${Math.round(u.defense * 100)}% defense`, u.life && `Every ${us[i].every}s, lasts ${u.life}s`, l.queues && i === 0 && `${l.queues} queue${l.queues > 1 ? 's' : ''}`, i === 0 && l.spawnNow && 'Sends at once', (i > 0 || (l.spawnEvery && l.spawnEvery !== def.spawnEvery)) && `Every ${us[i].every}s`, ...(i === 0 ? l.abilities || [] : []).map((a) => abilityText(a))].filter(Boolean).join(', ') || '–';
          const dps = us.reduce((sum, { unit, every }) => sum + unitDps(unit, every), 0);
          return `${col(({ unit }) => unitName(unit))}${col(({ unit: u }) => (u.gun ? `${gunText(u.gun)}, range ${u.gun.range}` : '–'))}${col(({ unit }) => cannonText(unit.cannon) || '–')}
            ${col(({ unit }, i) => extra(unit, i))}<td>${Math.round(dps * 10) / 10}</td>${detect(l)}`;
        },
      };
    }
    return {
      head: th(['Dmg', ...(burst ? ['Burst'] : []), 'Firerate', 'Range', 'DPS', ...(extras ? ['Extras'] : []), 'Detection']),
      cells: (l) =>
        `<td>${damageText(l)}</td>${burst ? `<td>${l.burst}</td>` : ''}<td>${l.cooldown}s</td><td>${l.range}</td><td>${dpsText(l)}</td>${extras ? `<td>${extrasText(l) || '–'}</td>` : ''}${detect(l)}`,
    };
  }

  renderRoom() {
    const r = this.room;
    if (!r) return;
    const me = this.net.id;
    const isHost = r.host === me;
    $('room-title').textContent = r.name;
    $('room-sub').innerHTML = `Room code <b class="room-code">${esc(r.code)}</b> <button class="btn small" data-copy="${esc(r.code)}">Copy</button> · ${r.members.length}/${r.max} players${isHost ? ' · You are hosting: keep this tab open' : ''}`;
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
