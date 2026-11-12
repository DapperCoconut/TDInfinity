// Menus: title screen, multiplayer menu (create / join a room by code), and room lobby.
import { DEFAULT_DIFFICULTY, DIFFICULTIES, EVENT_KEYS, GAME, eventMap, MODE_KEYS, MP, PLAYER_COLORS, TOWERS, VERSUS, detection, difficulty, modeFor } from './config.js';
import { LoadoutScreen } from './loadout.js';
import { audio } from './audio.js';
import { profile } from './profile.js';
import { abilityText, boostText, cannonText, damageText, detectText, dpsText, extrasText, gunText, rosterText, spawnerUnits, unitDps, unitName } from './stats.js';
import { LocalSession, NetSession } from './session.js';
import { DEFAULT_MAP, MAPS, mapDef, mapRating } from './sim/maps.js';
import { enemyIcon, towerIcon } from './icons.js';
import { ALL_CONTRACTS_REWARD, CONTRACT_REWARDS, NIGHT_REWARDS, PASS } from './halloweenpass.js';
import { CONTRACTS, CONTRACT_KEYS, contractFor } from './lastlaugh.js';
import { setMap } from './sim/map.js';
import { CallGame, pickClass } from './call/game.js';

const $ = (id) => document.getElementById(id);
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
const SCREENS = { title: 'menu', loadout: 'loadout-screen', mp: 'mp-menu', room: 'room-screen' };
// Map cards run from the easiest map to the hardest (see MAP_RATINGS). An event's own map has no
// card: it comes with its event (the event button, top right) and nothing else can play it.
const MAP_ORDER = Object.keys(MAPS).filter((k) => !MAPS[k].event).sort((a, b) => mapRating(a).rank - mapRating(b).rank);
const ALL_MAPS = [...MAP_ORDER, ...Object.keys(MAPS).filter((k) => MAPS[k].event)]; // every map with a picture
// The map pictures are kept between visits (localStorage) for as long as the page itself is the
// same; while developing they're drawn again every time, so they always show the maps as they are.
const PICS_KEY = 'td.mapPics';
const PICS_STAMP = import.meta.env?.DEV ? null : `1|${document.lastModified}`;
/** Sets el's cards, but only when `sig` (what they depend on) changed: no flicker, and hover and pop-in animations aren't restarted. */
function fill(el, sig, html) {
  if (el.dataset.sig === sig) return;
  el.dataset.sig = sig;
  el.innerHTML = html();
}
/** Marks the card whose data-`attr` is `key` as picked. */
function mark(el, attr, key) {
  for (const c of el.querySelectorAll(`[data-${attr}]`)) c.classList.toggle('on', c.dataset[attr] === key);
}
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
    const saved = localStorage.getItem('td.difficulty');
    this.difficulty = MODE_KEYS.includes(saved) && profile.modeOpen(saved) ? saved : DEFAULT_DIFFICULTY;
    this.event = null; // the special event picked instead of a mode and a map (see pickEvent)
    this.thumbs = {}; // map key -> its picture (a data URL), see loadThumbs
    $('difficulty-row').addEventListener('click', (e) => {
      const b = e.target.closest('[data-diff]');
      if (!b) return;
      if (this.lockedToast(b.dataset.diff)) return;
      this.difficulty = b.dataset.diff;
      localStorage.setItem('td.difficulty', this.difficulty);
      this.renderDifficulty();
    });
    // Pointing at a card shows what it is; moving off goes back to what's picked.
    $('difficulty-row').addEventListener('mouseover', (e) => this.modeHint(e.target.closest('[data-diff]')?.dataset.diff));
    $('difficulty-row').addEventListener('mouseleave', () => this.modeHint());
    this.renderDifficulty();

    // Map (same deal: Solo picks on the title screen, the host picks in a room).
    this.map = this.mapOrder().includes(localStorage.getItem('td.map')) ? localStorage.getItem('td.map') : DEFAULT_MAP;
    $('map-row').addEventListener('click', (e) => {
      const b = e.target.closest('[data-map]');
      if (!b) return;
      this.map = b.dataset.map;
      localStorage.setItem('td.map', this.map);
      this.renderMap();
    });
    $('map-row').addEventListener('mouseover', (e) => this.mapHint(e.target.closest('[data-map]')?.dataset.map));
    $('map-row').addEventListener('mouseleave', () => this.mapHint());

    // Special events (Halloween): a button in the top right picks the event's mode and map
    // together, in place of the cards. Clicking it again goes back to the normal modes.
    $('event-btns').addEventListener('click', (e) => {
      const b = e.target.closest('[data-event]');
      if (b) this.pickEvent(this.event === b.dataset.event ? null : b.dataset.event);
    });
    $('event-back').onclick = () => this.pickEvent(null);
    // An event with more than one map: its banner shows them all, click one to play it.
    this.eventMap = localStorage.getItem('td.eventMap');
    $('event-banner').addEventListener('click', (e) => {
      const b = e.target.closest('[data-map]');
      if (!b || !this.event) return;
      this.eventMap = b.dataset.map;
      localStorage.setItem('td.eventMap', this.eventMap);
      this.renderEvent();
      this.renderMap();
    });
    $('room-event-banner').addEventListener('click', (e) => {
      const b = e.target.closest('[data-map]');
      if (b && this.room?.host === net.id) net.send({ type: 'room.map', map: b.dataset.map });
    });
    // Halloween panel tabs: Nights, Contracts, Battle Pass.
    $('event-tabs').addEventListener('click', (e) => {
      const tab = e.target.closest('[data-hwtab]');
      if (!tab) return;
      this.hwTab = tab.dataset.hwtab;
      this.renderContracts();
    });
    // Contracts (Halloween panel): accept or drop one.
    $('event-contracts').addEventListener('click', (e) => {
      const b = e.target.closest('[data-contract]');
      const play = e.target.closest('[data-hwplay]');
      if (play) {
        audio.unlock();
        if (play.dataset.hwplay === 'remix') return this.startRemix(); // Halloween Remix (Battle Pass)
        return this.startLiminal(); // Infinite mode (Battle Pass): the endless Backrooms, any time
      }
      if (!b) return;
      profile.toggleContract(b.dataset.contract);
      this.renderContracts();
    });
    profile.halloweenRewards(); // contracts finished before the rewards existed still give theirs
    this.renderEvent();
    this.renderMap();

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
      this.renderContracts(); // (a contract finished in a game: its card and red buttons change)
      this.renderInventory();
      this.loadoutScreen.render();
      this.net.send({ type: 'loadout', towers: profile.battleLoadout(), evo: profile.evoLevels() });
    });

    // Rooms
    // Rooms are peer-to-peer: creating one makes this browser the host; joining connects to the
    // host's browser by its code (see net.js).
    $('room-create').onclick = () => {
      this.setBusy('Creating room…');
      net.send({ type: 'room.create', name: $('room-name').value, isPublic: false, difficulty: this.playMode, map: this.playMap, contract: this.playContract });
    };
    const join = () => {
      this.setBusy('Joining room…');
      net.send({ type: 'room.join', code: $('room-code').value });
    };
    $('room-join').onclick = join;
    $('room-code').addEventListener('keydown', (e) => e.key === 'Enter' && !this.busy && join());

    // Quick Play: find (or open) a game of the picked mode at the well-known codes (see net.js).
    // Seats: players and bots together; bots fill the seats nobody takes when the host starts.
    let quick = {};
    try {
      quick = JSON.parse(localStorage.getItem('td.quick') || '{}');
    } catch {
      quick = {};
    }
    this.quick = { mode: quick.mode === 'versus' ? 'versus' : 'coop', seats: Math.min(4, Math.max(1, quick.seats || 4)), bots: Math.max(0, quick.bots ?? 1) };
    const quickChange = (fn) => {
      fn();
      localStorage.setItem('td.quick', JSON.stringify(this.quick));
      this.renderQuick();
    };
    $('quick-mode').addEventListener('click', (e) => {
      const b = e.target.closest('[data-qmode]');
      if (b) quickChange(() => (this.quick.mode = b.dataset.qmode));
    });
    $('mp-menu').addEventListener('click', (e) => {
      const seat = e.target.closest('[data-qseat]');
      const bot = e.target.closest('[data-qbot]');
      if (seat) quickChange(() => (this.quick.seats += Number(seat.dataset.qseat)));
      if (bot) quickChange(() => (this.quick.bots += Number(bot.dataset.qbot)));
    });
    $('quick-go').onclick = () => {
      // Inhuman contract: 1 seat and 1 bot starts the game against the glitchy bot, in this browser only.
      if (this.inhumanReady) {
        this.setBusy('Something is waiting for you…');
        this.net.offline({ type: 'room.create', name: 'Inhuman', isPublic: false, mode: 'versus', difficulty: this.playMode, map: this.playMap, seats: 2, bots: 1, contract: 'inhuman' });
        return;
      }
      this.setBusy('Looking for a game…');
      net.send({ type: 'room.quick', mode: this.quick.mode, difficulty: this.playMode, map: this.playMap, seats: this.quick.seats, bots: this.quick.bots, name: `${this.name}'s game` });
    };
    net.on('quick', (m) => this.setBusy(m.text));

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
      if (b && this.room?.host === net.id && !this.lockedToast(b.dataset.diff)) net.send({ type: 'room.difficulty', difficulty: b.dataset.diff });
    });
    $('room-map').addEventListener('click', (e) => {
      const b = e.target.closest('[data-map]');
      if (b && this.room?.host === net.id) net.send({ type: 'room.map', map: b.dataset.map });
    });
    // The host's event button: the room plays the event, or (clicked again) goes back to the mode
    // the host has picked on the title screen.
    $('room-event').addEventListener('click', (e) => {
      const b = e.target.closest('[data-event]');
      if (!b || this.room?.host !== net.id) return;
      net.send({ type: 'room.difficulty', difficulty: this.room.difficulty === b.dataset.event ? this.difficulty : b.dataset.event });
    });
    $('room-players').addEventListener('click', (e) => {
      const b = e.target.closest('[data-kick]');
      if (b) net.send({ type: 'room.kick', id: b.dataset.kick });
      if (e.target.closest('[data-unbot]') && this.room) net.send({ type: 'room.bots', n: this.room.bots - 1 });
    });
    // The host sets the room's seats and how many bots take them.
    $('room-seats').addEventListener('click', (e) => {
      const seat = e.target.closest('[data-seats]');
      const bot = e.target.closest('[data-bots]');
      if (!this.room || this.room.host !== net.id) return;
      if (seat) net.send({ type: 'room.seats', n: this.room.seats + Number(seat.dataset.seats) });
      if (bot) net.send({ type: 'room.bots', n: this.room.bots + Number(bot.dataset.bots) });
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
    if (screen === 'title') {
      this.renderInventory();
      this.renderDifficulty(); // a mode just beaten gets its tick, Hardcore may have unlocked
      this.renderEvent();
      this.renderMap();
      this.loadThumbs();
    }
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
        if (this.client.session?.sim?.lm) return this.startLiminal(); // Liminal: back to the Backrooms
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

  /**
   * Liminal contract: you walked into Sunken Canyon's glitchy pit. You leave the game (and its room,
   * in multiplayer) and start the endless Backrooms on your own.
   */
  startLiminal() {
    const mp = this.client.session?.mp;
    this.client.stop();
    if (mp) this.net.send({ type: 'room.leave' });
    this.inGame = true;
    this.show(null);
    this.client.start(new LocalSession(this.name, PLAYER_COLORS[0], 'liminal', profile.evoLevels(), 'backrooms', null));
  }

  /** Halloween Remix (Battle Pass): 50 waves on one of the three Halloween nights' maps, at random. Solo. */
  startRemix() {
    const maps = DIFFICULTIES.remix.maps;
    this.inGame = true;
    this.show(null);
    this.client.start(new LocalSession(this.name, PLAYER_COLORS[0], 'remix', profile.evoLevels(), maps[Math.floor(Math.random() * maps.length)], null));
  }

  /**
   * Mysterious Call contract: you answered the phone by the cemetery chapel. You leave the game (and
   * its room) and pick a class; then the haunted mansion (call/game.js) borrows the game's screen.
   */
  startCall() {
    const mp = this.client.session?.mp;
    this.client.stop();
    if (mp) this.net.send({ type: 'room.leave' });
    this.inGame = true;
    this.show(null);
    pickClass((cls) => {
      const c = this.client;
      c.call = new CallGame(c.renderer, c.canvas, cls, {
        onEnd: (won, wave) => setTimeout(() => this.callEnd(won, wave), 1500),
        onQuit: () => this.callLeave(),
      });
    }, () => this.callLeave());
  }

  /** The mansion is over: won (the contract is done) or lost. */
  callEnd(won, wave) {
    let got = [];
    let first = false;
    if (won) {
      first = profile.finishContract('call');
      if (first) got = profile.halloweenRewards();
    }
    const el = document.createElement('div');
    el.id = 'call-pick';
    el.innerHTML = `<h2>${won ? '🏆 You survived the mansion!' : '👻 The ghosts got you...'}</h2>
      <p>${won ? (first ? 'Contract complete: Mysterious Call!' : 'You beat all 10 waves again.') : `You made it to wave ${wave}.`}</p>
      ${got.length ? `<p>🎁 Halloween reward: ${got.map(esc).join(', ')}!</p>` : ''}
      <div><button class="btn" data-again>📞 Play again</button> <button class="btn" data-menu>Back to the menu</button></div>`;
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-again]')) {
        el.remove();
        this.callLeave(true);
      } else if (e.target.closest('[data-menu]')) {
        el.remove();
        this.callLeave();
      }
    });
    document.body.appendChild(el);
  }

  /** Leaves the mansion: back to the class pick (`again`) or to the menu. */
  callLeave(again) {
    this.client.call?.dispose();
    this.client.call = null;
    if (again) return this.startCall();
    this.inGame = false;
    this.show('title');
  }

  startSolo() {
    this.inGame = true;
    this.show(null);
    this.client.start(new LocalSession(this.name, PLAYER_COLORS[0], this.playMode, profile.evoLevels(), this.playMap, this.playContract));
  }

  /** The accepted contract the next game plays (one made for the picked map), or null. */
  get playContract() {
    return this.event ? null : contractFor(profile.contracts.accepted, this.playMap);
  }

  /**
   * The Halloween panel, under the event's banner: three tabs. Nights (the banner with its maps, and
   * the tower each night gives), Contracts (accept / drop, and what each gives), and the Battle Pass
   * (Candy Corn from any game fills a track of rewards).
   */
  renderContracts() {
    $('mp-btn').classList.toggle('ct-red', this.inhumanOn); // Inhuman contract: the red trail starts here
    if (this.quick) this.renderQuick();
    const el = $('event-contracts');
    if (this.event !== 'halloween') {
      el.innerHTML = '';
      $('event-tabs').innerHTML = '';
      $('event-banner').classList.remove('hidden');
      return;
    }
    const tab = this.hwTab ?? 'nights';
    $('event-banner').classList.toggle('hidden', tab !== 'nights');
    const tabs = [['nights', '🎃', 'Nights'], ['contracts', '📜', 'Contracts'], ['pass', '🌽', 'Battle Pass']];
    const head = `<div class="hw-tabs">${tabs.map(([k, i, n]) => `<button class="hw-tab${k === tab ? ' on' : ''}" data-hwtab="${k}">${i} ${n}</button>`).join('')}
      <span class="hw-candy" title="Candy Corn: earn it in any game. It fills the Battle Pass.">🌽 ${num(profile.hw.candy)}</span></div>`;
    $('event-tabs').innerHTML = head;
    el.innerHTML = (tab === 'contracts' ? this.hwContracts() : tab === 'pass' ? this.hwPass() : this.hwNights());
    const track = el.querySelector('.hw-track');
    const next = el.querySelector('.hw-next');
    if (track && next) track.scrollLeft = next.offsetLeft - track.clientWidth / 2 + next.offsetWidth / 2; // the next reward in the middle
  }

  /** A reward tile: a tower's portrait and name, with a tick once you own it. */
  hwReward(t, label) {
    const def = TOWERS[t];
    const own = def.altOf ? profile.ownsForm(t) : profile.owns(t);
    return `<div class="hw-reward${own ? ' got' : ''}" title="${esc(`${label}: ${def.name}${def.altOf ? ` (${TOWERS[def.altOf].name} variant)` : ''}`)}">
      <img src="${towerIcon(t)}" alt="" draggable="false">${own ? '<span class="ev-won">✔</span>' : ''}
      <small>${esc(label)}</small><b>${esc(def.name)}</b></div>`;
  }

  hwNights() {
    return `<div class="hw-row">${NIGHT_REWARDS.map((n) => this.hwReward(n.tower, `Beat ${n.name}`)).join('')}</div>
      <p class="hw-note">Win a night on its own map to get its tower.</p>`;
  }

  hwContracts() {
    const cards = CONTRACT_KEYS.map((k) => {
      const c = CONTRACTS[k];
      const on = profile.contracts.accepted.includes(k);
      const done = profile.contracts.done.includes(k);
      return `<div class="contract-card${on ? ' on' : ''}" style="--c:${c.color}">
        <img src="${towerIcon(c.pic)}" alt="" draggable="false">
        <div class="cc-text"><h4>${c.icon} ${esc(c.name)}${done ? ' <span class="ev-won" title="You finished this contract">✔</span>' : ''}</h4><p>${esc(c.desc)}</p></div>
        ${CONTRACT_REWARDS[k] ? this.hwReward(CONTRACT_REWARDS[k], 'Reward') : ''}
        <button class="btn small" data-contract="${k}">${on ? 'Drop it' : done ? 'Play again' : 'Accept'}</button>
      </div>`;
    });
    return `${cards.join('')}<div class="hw-all">🏆 Finish every contract: ${this.hwReward(ALL_CONTRACTS_REWARD, 'All contracts')}</div>`;
  }

  hwPass() {
    const candy = profile.hw.candy;
    const next = PASS.findIndex((r) => r.at > candy);
    const tiles = PASS.map((r, i) => {
      const got = candy >= r.at;
      let pic, name, small;
      if (r.tower) {
        const def = TOWERS[r.tower];
        pic = `<img src="${towerIcon(r.tower)}" alt="" draggable="false">`;
        name = def.name;
        small = def.altOf ? `${TOWERS[def.altOf].name} variant` : 'Tower';
      } else if (r.credits) {
        pic = '<span class="hw-big">🪙</span>';
        name = `${r.credits} credits`;
        small = 'Credits';
      } else if (r.map) {
        pic = `<span class="hw-map">${this.mapArt(r.map)}</span>`;
        name = mapDef(r.map).name;
        small = 'Map for every mode';
      } else {
        pic = `<span class="hw-big">${r.mode === 'liminal' ? '♾️' : '🎃'}</span>`;
        name = r.name;
        small = r.desc;
      }
      const play = got && r.mode ? `<button class="btn small" data-hwplay="${r.mode}">▶ Play</button>` : '';
      return `<div class="hw-tier${got ? ' got' : ''}${i === next ? ' hw-next' : ''}" title="${esc(`${name} (${small}): ${num(r.at)} Candy Corn`)}">
        <span class="hw-at">🌽 ${num(r.at)}</span>${pic}<small>${esc(small)}</small><b>${esc(name)}</b>${got ? '<span class="ev-won">✔</span>' : ''}${play}</div>`;
    });
    const prev = next > 0 ? PASS[next - 1].at : 0;
    const pct = next < 0 ? 100 : Math.round(((candy - prev) / (PASS[next].at - prev)) * 100);
    return `<div class="hw-bar"><span style="width:${pct}%"></span><b>${next < 0 ? 'Battle Pass complete!' : `${num(PASS[next].at - candy)} more Candy Corn to the next reward`}</b></div>
      <div class="hw-track">${tiles.join('')}</div>
      <p class="hw-note">Earn Candy Corn in any game: 1 per wave, 10 for a win, double in Halloween modes.</p>`;
  }

  /** A locked mode (Hardcore before every other mode is beaten): says what's missing. Returns true if locked. */
  lockedToast(key) {
    if (profile.modeOpen(key)) return false;
    this.toast(`🔒 ${DIFFICULTIES[key].name} unlocks once you've beaten every mode. Still to beat: ${profile.modeMissing(key).join(', ')}`, 3500);
    return true;
  }

  /** What Solo and a new room play: the event that's picked, otherwise the mode card that's picked. */
  get playMode() {
    return this.event ?? this.difficulty;
  }

  /** What Solo and a new room play on: the picked event's picked map, otherwise the picked map card. */
  get playMap() {
    return eventMap(this.playMode, this.eventMap) ?? this.map;
  }

  /** Picks special event `key` (null: back to the normal modes and maps). */
  pickEvent(key) {
    this.event = EVENT_KEYS.includes(key) ? key : null;
    this.renderEvent();
    this.renderMap();
  }

  /** An event's button (top right of the title screen and, for the host, of a room): its boss and its name. */
  eventButton(key) {
    const d = DIFFICULTIES[key];
    return `<button class="event-btn" data-event="${key}" style="--c:${d.color}" title="${esc(d.desc)}">
      <img src="${enemyIcon(d.boss)}" alt="" draggable="false">
      <span class="ev-text"><small class="ev-off">★ Special event</small><small class="ev-on">◀ Back to modes</small><b>${esc(d.name)}</b></span>
      ${profile.beaten.includes(key) ? '<span class="ev-won" title="You beat this event">✔</span>' : ''}
    </button>`;
  }
  eventButtons() {
    return EVENT_KEYS.map((key) => this.eventButton(key)).join('');
  }
  /** What the event buttons and banners depend on: which events are beaten (their ticks). */
  get eventSig() {
    return `events|${EVENT_KEYS.map((k) => +profile.beaten.includes(k)).join('')}`;
  }

  /** An event's banner, shown instead of the mode and map cards: its boss, what it is, and its own map. */
  eventBanner(key, picked) {
    const d = DIFFICULTIES[key];
    const maps = d.maps ?? [d.map];
    const on = eventMap(key, picked);
    return `<div class="event-banner" style="--c:${d.color}">
      <img class="eb-boss" src="${enemyIcon(modeFor(key, on).boss)}" alt="" draggable="false">
      <div class="eb-text">
        <h3>${d.icon} ${esc(d.name)}${profile.beaten.includes(key) ? ' <span class="ev-won" title="You beat this event">✔</span>' : ''}</h3>
        <p>${esc(d.desc)}</p>
      </div>
      <div class="eb-maps${maps.length > 1 ? ' pick' : ''}${maps.length > 2 ? ' three' : ''}">${maps
        .map((k) => {
          const m = mapDef(k);
          return `<div class="eb-map${k === on ? ' on' : ''}" data-map="${k}" title="${esc(`${m.name}: ${m.desc}`)}">
          <span class="pc-art">${this.mapArt(k)}</span>
          <span class="eb-map-name"><small>${maps.length > 1 ? (k === on ? '✔ Playing' : 'Click to play') : 'Event map'}</small>${esc(m.name)}</span>
        </div>`;
        })
        .join('')}</div>
    </div>`;
  }

  /** Title screen: the event buttons, and the event's banner in place of the cards while one is picked. */
  renderEvent() {
    const btns = $('event-btns');
    fill(btns, this.eventSig, () => this.eventButtons());
    mark(btns, 'event', this.event);
    $('pick-normal').classList.toggle('hidden', !!this.event);
    $('event-panel').classList.toggle('hidden', !this.event);
    if (this.event) fill($('event-banner'), `${this.event}|${this.eventSig}|${this.playMap}`, () => this.eventBanner(this.event, this.eventMap));
    this.renderContracts();
  }

  /**
   * A mode's card: a square in the mode's color with its final boss on it. Locked modes show the
   * boss as a shadow behind a padlock; modes you've beaten get a tick.
   */
  modeCard(key, i = 0) {
    const d = DIFFICULTIES[key];
    const open = profile.modeOpen(key);
    const tip = open ? d.desc : `Locked: beat ${profile.modeMissing(key).join(', ')} first`;
    return `<button class="pick-card mode-card${open ? '' : ' locked'}" data-diff="${key}" style="--c:${d.color};--i:${i}" title="${esc(tip)}">
      <img class="pc-boss" src="${enemyIcon(d.boss)}" alt="" draggable="false">
      ${profile.beaten.includes(key) ? '<span class="pc-won" title="You beat this mode">✔</span>' : ''}
      ${open ? '' : '<span class="pc-lock">🔒</span>'}
      <span class="pc-name">${esc(d.name)}<small>${d.waves.length} waves</small></span>
    </button>`;
  }

  /** Every mode's card. What they show depends on which modes are beaten (ticks, Hardcore's lock). */
  modeCards() {
    return MODE_KEYS.map((key, i) => this.modeCard(key, i)).join('');
  }
  get modeSig() {
    return `modes|${profile.beaten.join()}|${MODE_KEYS.map((k) => +profile.modeOpen(k)).join('')}`;
  }

  /** The picture on a map's card: the map drawn from above once that's ready (loadThumbs), until then its icon on its sky and ground colors. */
  mapArt(key) {
    const m = mapDef(key);
    return this.thumbs[key]
      ? `<img class="pc-pic" src="${this.thumbs[key]}" alt="" draggable="false">`
      : `<span class="pc-ph" style="background:linear-gradient(${hex(m.theme.sky)} 46%, ${m.theme.ground[0]} 46%)">${m.icon}</span>`;
  }

  /** A map's card: a square picture of the map, framed in the color of how hard the map is. */
  mapCard(key, i = 0) {
    const m = mapDef(key);
    const r = mapRating(key);
    return `<button class="pick-card map-card" data-map="${key}" style="--c:${r.color};--i:${i}" title="${esc(`${m.name} (${r.name}): ${m.desc}`)}">
      <span class="pc-art">${this.mapArt(key)}</span>
      <span class="pc-chip">${r.name}</span>
      <span class="pc-name">${esc(m.name)}</span>
    </button>`;
  }
  /** The maps on the map cards: the normal ones, then the event maps the Halloween Battle Pass unlocked. */
  mapOrder() {
    return [...MAP_ORDER, ...Object.keys(MAPS).filter((k) => MAPS[k].unlockable && profile.hasMap(k))];
  }
  mapCards() {
    return this.mapOrder().map((key, i) => this.mapCard(key, i)).join('');
  }

  /**
   * Gets a picture of every map for the cards. Saved ones are used if the game hasn't changed
   * since; the rest are drawn by the game client behind the menu, one a frame (see
   * GameClient.requestMapThumbs), and each card gets its picture as soon as it's ready.
   */
  loadThumbs() {
    if (this.thumbsAsked || !this.client) return;
    this.thumbsAsked = true;
    const show = (key) => {
      for (const art of document.querySelectorAll(`[data-map="${key}"] .pc-art`)) art.innerHTML = this.mapArt(key); // its card, or its event's banner
    };
    try {
      const saved = PICS_STAMP && JSON.parse(localStorage.getItem(PICS_KEY) || 'null');
      if (saved?.stamp === PICS_STAMP) for (const key of ALL_MAPS) if (typeof saved.pics?.[key] === 'string') this.thumbs[key] = saved.pics[key];
    } catch {
      /* no saved pictures: draw them */
    }
    ALL_MAPS.forEach(show);
    const missing = ALL_MAPS.filter((key) => !this.thumbs[key]);
    if (!missing.length) return;
    this.client.requestMapThumbs(
      missing,
      (key, url) => {
        if (!url) return;
        this.thumbs[key] = url;
        show(key);
      },
      () => {
        // The client's world was rebuilt as each map in turn: back to the one the menu shows.
        this.previewMap(this.backdrop);
        if (!PICS_STAMP) return;
        try {
          localStorage.setItem(PICS_KEY, JSON.stringify({ stamp: PICS_STAMP, pics: this.thumbs }));
        } catch {
          /* storage full: they're drawn again next time */
        }
      },
    );
  }

  /** Title screen mode cards. */
  renderDifficulty() {
    if (!profile.modeOpen(this.difficulty)) this.difficulty = DEFAULT_DIFFICULTY;
    const row = $('difficulty-row');
    fill(row, this.modeSig, () => this.modeCards());
    mark(row, 'diff', this.difficulty);
    this.modeHint();
  }

  /** The line under the mode cards: about mode `key` (the one pointed at), or the one picked. */
  modeHint(key = this.difficulty) {
    const d = DIFFICULTIES[key];
    if (!d) return;
    const text = profile.modeOpen(key) ? d.desc : `Locked. Still to beat: ${profile.modeMissing(key).join(', ')}.`;
    $('difficulty-hint').innerHTML = `<b class="pick-tag" style="background:${d.color}">${esc(d.name)}</b> ${esc(text)}`;
  }

  /** Shows map `key` behind the menus (only while no game is running). */
  previewMap(key) {
    this.backdrop = key;
    if (this.inGame || this.client?.session) return;
    setMap(key);
    this.client?.syncMap();
  }

  /** Title screen map cards (picking a map also shows it behind the menu). */
  renderMap() {
    this.previewMap(this.playMap); // a picked event shows its own map
    const row = $('map-row');
    fill(row, `maps|${this.mapOrder().length}`, () => this.mapCards());
    mark(row, 'map', this.map);
    this.mapHint();
  }

  /** The line under the map cards: about map `key` (the one pointed at), or the one picked. */
  mapHint(key = this.map) {
    if (!MAPS[key]) return;
    const m = mapDef(key);
    const r = mapRating(key);
    $('map-hint').innerHTML = `<b class="pick-tag" style="background:${r.color}">${esc(m.name)} · ${r.name}</b> ${esc(m.desc)}`;
  }

  async openMultiplayer() {
    await this.net.connect(this.name);
    this.net.send({ type: 'loadout', towers: profile.battleLoadout(), evo: profile.evoLevels() });
    $('mp-me').textContent = `Playing as ${this.net.name}`;
    this.renderQuick();
    this.show(this.room ? 'room' : 'mp');
  }

  /** While creating / joining a room: show `text` and lock the buttons (false = done). */
  setBusy(text) {
    this.busy = !!text;
    $('room-create').disabled = this.busy;
    $('room-join').disabled = this.busy;
    $('quick-go').disabled = this.busy;
    $('mp-status').textContent = text || '';
  }

  /** How many seats a Quick Play game of the picked mode can have (Hardcore holds more). */
  get quickMax() {
    return (this.quick.mode !== 'versus' && DIFFICULTIES[this.playMode]?.maxPlayers) || MP.maxRoomPlayers;
  }

  /** Inhuman contract accepted (lastlaugh.js): the red buttons lead to 1 seat and 1 bot. */
  get inhumanOn() {
    return profile.contracts.accepted.includes('inhuman');
  }

  /** ... and the counters are there: Find a Game starts the fight against the glitchy bot. */
  get inhumanReady() {
    return this.inhumanOn && this.quick.seats === 1 && this.quick.bots === 1;
  }

  /** The Quick Play card: what it would play, and the seat and bot counters (kept in range). */
  renderQuick() {
    const q = this.quick;
    const ih = this.inhumanOn;
    q.seats = Math.max(q.mode === 'versus' && !ih ? VERSUS.minPlayers : 1, Math.min(this.quickMax, q.seats));
    q.bots = Math.max(0, Math.min(ih && q.seats === 1 ? 1 : q.seats - 1, q.bots)); // (Inhuman: 1 seat may hold a bot)
    // Inhuman: red buttons show the way down to 1 seat and 1 bot, then to Find a Game.
    const red = (sel, on) => document.querySelector(sel)?.classList.toggle('ct-red', !!on);
    red('[data-qseat="-1"]', ih && q.seats > 1);
    red('[data-qbot="-1"]', ih && q.bots > 1);
    red('[data-qbot="1"]', ih && q.seats === 1 && q.bots < 1);
    red('#quick-go', this.inhumanReady);
    mark($('quick-mode'), 'qmode', q.mode);
    $('quick-seats').textContent = q.seats;
    $('quick-bots').textContent = q.bots;
    const d = difficulty(this.playMode);
    const m = mapDef(this.playMap);
    const humans = q.seats - q.bots;
    if (this.inhumanReady) {
      $('quick-sub').innerHTML = `👾 <b>1 seat, 1 bot.</b> That shouldn't be possible... Something is waiting for you.`;
      return;
    }
    $('quick-sub').innerHTML = `${q.mode === 'versus' ? '⚔ Versus' : `${d.icon} ${esc(d.name)}`} · ${esc(m.name)} · <b>${q.seats}</b> seat${q.seats === 1 ? '' : 's'}: up to ${humans} player${humans === 1 ? '' : 's'}${q.bots ? ` + ${q.bots} bot${q.bots === 1 ? '' : 's'}` : ''}${q.mode === 'versus' && q.bots ? ' (bots fight for their own base)' : ''}`;
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
    $('menu-gems').textContent = num(profile.gems);
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
    this.previewMap((r.mode !== 'versus' && eventMap(r.difficulty, r.map)) || r.map);
    const me = this.net.id;
    const isHost = r.host === me;
    $('room-title').textContent = r.quick ? `⚡ ${r.name}` : r.name;
    const humans = r.members.filter((m) => !m.bot).length;
    $('room-sub').innerHTML = `Room code <b class="room-code">${esc(r.code)}</b> <button class="btn small" data-copy="${esc(r.code)}">Copy</button> · ${humans}/${r.seats - r.bots} players${r.bots ? ` + ${r.bots} bot${r.bots === 1 ? '' : 's'}` : ''}${r.quick ? ' · Quick Play: others can join until the game starts' : ''}${isHost ? ' · You are hosting: keep this tab open' : ''}`;
    $('room-players').innerHTML = r.members
      .map(
        (m) => `<div class="member">
          <span><span class="dot" style="background:${hex(m.color)}"></span>${m.id === r.host ? '<span class="crown">★</span> ' : ''}${esc(m.name)}${m.id === me ? ' <small>(you)</small>' : ''}</span>
          <span>${m.bot ? '<span class="tag bot">Bot</span>' : m.id === r.host ? '<span class="tag host">Host</span>' : m.ready ? '<span class="tag ready">Ready</span>' : '<span class="tag">Not ready</span>'}
          ${isHost && m.id !== me ? `<button class="btn small red" ${m.bot ? 'data-unbot="1"' : `data-kick="${m.id}"`} title="${m.bot ? 'Remove this bot' : 'Kick'}">✕</button>` : ''}</span>
        </div>`,
      )
      .join('');
    // Seats (players and bots together) and how many bots take them: the host picks.
    const seatBtn = (attr, d) => `<button class="btn small" data-${attr}="${d}">${d < 0 ? '−' : '+'}</button>`;
    $('room-seats').innerHTML = isHost
      ? `<span>Seats: ${seatBtn('seats', -1)} <b>${r.seats}</b> ${seatBtn('seats', 1)}</span> <span>🤖 Bots: ${seatBtn('bots', -1)} <b>${r.bots}</b> ${seatBtn('bots', 1)}</span> <span class="hint">Bots take the seats nobody fills.</span>`
      : `<span>Seats: <b>${r.seats}</b> · 🤖 Bots: <b>${r.bots}</b></span>`;
    const versus = r.mode === 'versus';
    $('room-mode').innerHTML = isHost
      ? `<span>Mode:</span>
         <button class="btn small ${versus ? '' : 'blue on'}" data-mode="coop">🤝 Co-op</button>
         <button class="btn small ${versus ? 'red on' : ''}" data-mode="versus">⚔ Versus</button>`
      : `<span>Mode: <b>${versus ? '⚔ Versus' : '🤝 Co-op'}</b></span>`;
    const diff = difficulty(r.difficulty);
    // Everyone sees the same cards; only the host can pick.
    const grid = (cards) => `<div class="card-grid small${isHost ? '' : ' static'}">${cards}</div>`;
    const label = (what, tag, color) => `<div class="pick-label">${what}: <b class="pick-tag" style="background:${color}">${esc(tag)}</b></div>`;
    // An event (co-op only) takes the place of both pickers: its mode and its map come together.
    const event = !versus && diff.event ? r.difficulty : null;
    const evEl = $('room-event');
    evEl.classList.toggle('hidden', !isHost || versus);
    fill(evEl, this.eventSig, () => this.eventButtons());
    mark(evEl, 'event', event);
    const bEl = $('room-event-banner');
    bEl.classList.toggle('hidden', !event);
    if (event) fill(bEl, `${event}|${this.eventSig}|${r.map}|${isHost}`, () => this.eventBanner(event, r.map));
    const dEl = $('room-difficulty');
    dEl.classList.toggle('hidden', versus || !!event);
    fill(dEl, `${this.modeSig}|${isHost}`, () => `<div class="pick-label"></div>${grid(this.modeCards())}`);
    dEl.firstElementChild.outerHTML = label('Difficulty', diff.name, diff.color);
    mark(dEl, 'diff', r.difficulty);
    const map = mapDef(r.map);
    const rating = mapRating(r.map);
    const mEl = $('room-map');
    mEl.classList.toggle('hidden', !!event);
    fill(mEl, `maps|${isHost}`, () => `<div class="pick-label"></div>${grid(this.mapCards())}`);
    mEl.firstElementChild.outerHTML = label('Map', `${map.name} · ${rating.name}`, rating.color);
    mark(mEl, 'map', r.map);
    $('room-mode-hint').textContent = versus
      ? 'Versus: everyone gets their own map, joined by bridges. Waves never stop — the last base standing wins! Spend cash to send zombies to an opponent. Anarchists work here.'
      : `Co-op: everyone has their own cash and towers, and all damage pays cash to the whole team. Enemies get tougher with more players. ${diff.desc}`;
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
