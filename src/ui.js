// In-game HUD. Reads plain session state; never mutates game state itself.
import { levelAt } from './sim/map.js';
import { droneMode } from './sim/sim.js';

const DRONE_NAMES = { offense: 'Offense', defense: 'Defense', support: 'Support' }; // Spectre drone modes
import { ENEMIES, GAME, SPEEDS, arrowName, TARGET_MODES, TOWERS, TRACKS, VERSUS, WAVES, detection, facesCone, spawnExtras, timedAbility, towerMaxHp, pickOptions, choiceOptions, choicesOf, rootType, abilityCost } from './config.js';
import {
  abilityText, chopText, railText, cloneText, hackText, ammoText, bombText, radioText, sweeperOf, boostText, buffText, cannonText, cashText, chainText, clusterText, rosterText, chillText, m203Name, m203Text, critText, damageText, detectText, dpsText, dpsValue, fanText, goonText, gunText, isBeam, limitText, missileText, slimeText,
  trapText, isTrapper, spawnerUnits, unitDps, unitName, whirlText, comboText, repositionOf, graveText, poolText, sentryText, overchargeText, poisonText, smiteText,
  fireAspectText, penText, procText, beesText, axeText, bleedText, aftershockText, arrowsText, bombTypeText, swordText, starText, bubbleText, companionText,
} from './stats.js';
import { subIcon, towerIcon } from './icons.js';
import { descHtml, splitBlurb } from './text.js';

// A small picture for each line of an upgrade's changes, by what the line is about.
const DIFF_ICONS = [
  [/detection/i, '👁️'],
  [/^\+ Ability|Unlocks/i, '✨'],
  [/Health|Repairs|HP\b/, '❤️'],
  [/\$|Income|Cash|Bundles|Bounty/, '💰'],
  [/Freeze|Chill|Ice|Frost|Slow/i, '❄️'],
  [/Stun|Riot/i, '💫'],
  [/Burn|fire\b|flame|Molotov/i, '🔥'],
  [/Poison|Slime|Toxin/i, '☠️'],
  [/Lightning|Overcharge|Smite|Tesla|Shock/i, '⚡'],
  [/Blast|Bomb|Missile|Rocket|Explo|Cluster|Nuclear|Cannon/i, '💥'],
  [/Boost|Queues/i, '📣'],
  [/Sentr|Turret|Drone|Goon|Unit|Sends|every \d|summon|Grave|Clone|Synaps/i, '🪖'],
  [/Range|Patrol|zone|reach/i, '🎯'],
  [/Cooldown|Tick|faster|Full charge|heats/i, '⏱️'],
  [/piercing|Pierce|Hits|Targets|Extra targets|Pellets|Burst|Ammo|Throws/i, '🔸'],
  [/Damage|dmg|Critical|Combo/i, '⚔️'],
];
function diffIcon(line) {
  for (const [re, ico] of DIFF_ICONS) if (re.test(line)) return ico;
  return line.startsWith('-') ? '🔻' : '⬆️';
}

const ABILITY_KEYS = 'FGH';
// Ability bar (bottom right): one key per ability group, in bar order.
const ABILITY_BAR_LABELS = 'ZCVRYUIOP';
export const ABILITY_BAR_KEYS = [...ABILITY_BAR_LABELS].map((c) => `Key${c}`);

const $ = (id) => document.getElementById(id);
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

/** "+340 credits (+1 Dimension Shard)" line on the end screen. */
function rewardText(credits, shards, gems = 0, derrick = 0) {
  const shard = shards ? ` <span class="shard-text">+${shards} <i class="shard-icon"></i> Dimension Shard${shards === 1 ? '' : 's'}</span>` : '';
  const gem = gems ? ` <span class="gem-text">+${gems} <i class="gem-icon"></i> Gems</span>` : '';
  const oil = derrick ? ` (${derrick} from your Oil Derrick)` : '';
  return `+${credits} credits${oil}${shard}${gem} — spend them in the Loadout & Shop!`;
}

export class UI {
  constructor(handlers) {
    this.h = handlers;
    this.el = {
      hud: $('hud'),
      waveLabel: $('wave-label'),
      waveStatus: $('wave-status'),
      baseFill: $('base-fill'),
      baseText: $('base-text'),
      bossBox: $('boss-box'),
      bossName: $('boss-name'),
      bossFill: $('boss-fill'),
      cash: $('cash'),
      hotbar: $('hotbar'),
      abilityBar: $('ability-bar'),
      panel: $('panel'),
      toast: $('toast'),
      skip: $('skip-btn'),
      speed: $('speed-btn'),
      mute: $('mute-btn'),
      music: $('music-btn'),
      menuMusic: $('menu-music-btn'),
      scoreboard: $('scoreboard'),
      chatLog: $('chat-log'),
      chatInput: $('chat-input'),
      wheel: $('wheel'),
      end: $('end'),
      send: $('send-panel'),
      sendList: $('send-list'),
      sendTarget: $('send-target-name'),
    };
    this.icons = {};
    this.panelKey = '';
    this.toastTimer = 0;
    this.lastCash = null;

    this.el.skip.onclick = handlers.onSkip;
    this.el.speed.innerHTML = SPEEDS.map((v) => `<option value="${v}">${v}x</option>`).join('');
    this.el.speed.onchange = () => {
      handlers.onSpeed(Number(this.el.speed.value));
      this.el.speed.blur(); // give keyboard focus back to the game
    };
    this.el.mute.onclick = handlers.onMute;
    this.el.music.onclick = this.el.menuMusic.onclick = handlers.onMusic;
    $('leave-btn').onclick = handlers.onLeave;
    $('end-primary').onclick = handlers.onEndPrimary;
    $('end-secondary').onclick = handlers.onEndSecondary;
    this.el.send.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      if (b.dataset.send) handlers.onSend(b.dataset.send);
      if (b.dataset.tgt) handlers.onTarget(Number(b.dataset.tgt));
    });
    this.el.sendList.innerHTML = Object.entries(VERSUS.sends)
      .map(([type, d]) => `<button class="btn send-btn" data-send="${type}" title="${esc(ENEMIES[type].name)}: ${ENEMIES[type].hp} HP, ${ENEMIES[type].damage} base damage">
        <span>${d.n > 1 ? `${d.n}× ` : ''}${esc(ENEMIES[type].name)}</span><span class="send-cost"></span></button>`)
      .join('');
    this.el.abilityBar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-abar]');
      if (!b) return;
      b.blur(); // so Space (jump) doesn't press it again
      handlers.onAbilityBar(Number(b.dataset.abar));
    });
    this.el.panel.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action) handlers.onPanel(action);
    });
    this.el.chatInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const text = this.el.chatInput.value.trim();
        if (text) handlers.onChat(text);
        this.closeChat();
      } else if (e.key === 'Escape') this.closeChat();
    });
    // Keep buttons from stealing keyboard focus (Space would re-click them).
    document.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) e.preventDefault();
    });
  }

  show(on, mp, versus) {
    this.el.hud.classList.toggle('hidden', !on);
    this.el.hud.classList.toggle('mp', !!mp);
    this.el.hud.classList.toggle('vs', !!versus);
    this.el.end.classList.add('hidden');
    this.el.chatLog.innerHTML = '';
    this.closeChat();
    this.hidePanel();
    this.lastCash = null;
    this.lastBoard = null;
  }

  /** Hotbar slots follow the player's loadout; slot N is placed with key N. */
  buildHotbar(icons, loadout, costOf = (type) => TOWERS[type].cost, limitOf = (type) => TOWERS[type].limit) {
    this.limitOf = limitOf;
    this.icons = icons;
    this.costOf = costOf;
    let html = '';
    for (let i = 0; i < GAME.loadoutSize; i++) {
      const type = loadout[i];
      if (!type) {
        html += `<div class="slot empty"><div class="slot-key">${i + 1}</div></div>`;
        continue;
      }
      const def = TOWERS[type];
      html += `<button class="slot" data-tower="${type}" title="${def.name} — ${splitBlurb(def.blurb)[0]}">
        <img src="${icons[type]}" alt="${def.name}">
        <div class="slot-key">${i + 1}</div>
        <div class="slot-count"></div>
        <div class="slot-cost">$${costOf(type)}</div>
      </button>`;
    }
    this.el.hotbar.innerHTML = html;
    this.el.hotbar.querySelectorAll('[data-tower]').forEach((b) => {
      b.onclick = () => this.h.onSlot(b.dataset.tower);
    });
  }

  /**
   * Ability bar (bottom right): every ability group from GameClient.abilityGroups(), each with
   * its key. Rebuilt only when the groups change; cooldowns tick in place so clicks aren't eaten.
   */
  updateAbilityBar(groups, cash, off = false) {
    const bar = this.el.abilityBar;
    const sig = groups.map((g) => g.id).join(',');
    if (sig !== this.abilitySig) {
      this.abilitySig = sig;
      bar.innerHTML = groups.length
        ? `<div class="ab-head">Abilities</div>${groups
          .map((g, i) => `<button class="ab-btn" data-abar="${i}" title="${esc(`${TOWERS[g.type].name}: ${abilityText(g.ab)}`)}">
              <img src="${this.icons[g.type] ?? this.icons[rootType(g.type)] ?? ''}" alt="">
              <span class="ab-key">${ABILITY_BAR_LABELS[i] ?? ''}</span>
              <span class="ab-name">${esc(g.ab.name)}</span>
              <span class="ab-sub"></span>
              <span class="ab-cd"></span>
            </button>`)
          .join('')}`
        : '';
      bar.classList.toggle('hidden', !groups.length);
      // The tower panel shares the right edge: keep it above the bar (see #panel in style.css).
      const space = groups.length ? bar.offsetHeight + 24 : 0;
      document.documentElement.style.setProperty('--ab-space', `${space}px`);
    }
    bar.classList.toggle('off', off);
    bar.querySelectorAll('[data-abar]').forEach((b) => {
      const g = groups[Number(b.dataset.abar)];
      if (!g) return;
      const n = g.towers.length;
      const price = abilityCost(g.towers[0], g.ab); // rising prices (Magic Boost, Volt Points...), null once used up
      const sub = g.active > 0 ? `ON ${Math.ceil(g.active)}s`
        : `${n > 1 ? `${g.ready}/${n} ready` : g.ready ? 'Ready' : ''}${price == null ? ' · used up' : price ? ` · $${price.toLocaleString()}` : ''}`;
      const cd = g.ready ? '' : `${Math.ceil(g.cd)}s`;
      const subEl = b.querySelector('.ab-sub');
      const cdEl = b.querySelector('.ab-cd');
      if (subEl.textContent !== sub) subEl.textContent = sub;
      if (cdEl.textContent !== cd) cdEl.textContent = cd;
      // Cooldown sweep: how much of the soonest recharge is left.
      const left = g.ready ? 0 : Math.min(1, g.cd / (g.ab.cooldown || 1));
      b.style.setProperty('--cd', `${Math.round(left * 100)}%`);
      b.classList.toggle('waiting', !g.ready);
      b.classList.toggle('poor', price == null || (!!price && cash < price));
      b.classList.toggle('live', g.active > 0);
    });
  }

  /**
   * Last Laugh: the fence slot after the towers (key 7). `info`: { cost, on, poor }, or null to hide
   * it. `onClick` picks fences up / puts them away.
   */
  fenceSlot(info, onClick) {
    let b = this.el.hotbar.querySelector('.fence-slot');
    if (!info) return b?.remove();
    if (!b) {
      b = document.createElement('button');
      b.className = 'slot fence-slot';
      b.title = 'Fence: blocks a tile, so enemies have to walk round it. Click a fence while placing to take it away.';
      b.innerHTML = '<div class="fence-pic">🚧</div><div class="slot-key">7</div><div class="slot-count">Fence</div><div class="slot-cost"></div>';
      this.el.hotbar.appendChild(b);
    }
    b.onclick = onClick;
    const cost = `$${info.cost}`;
    const el = b.querySelector('.slot-cost');
    if (el.textContent !== cost) el.textContent = cost;
    b.classList.toggle('active', !!info.on);
    b.classList.toggle('poor', !!info.poor);
  }

  updateHotbar(cash, counts, placing, off = false) {
    this.el.hotbar.classList.toggle('off', off);
    this.el.hotbar.querySelectorAll('[data-tower]').forEach((b) => {
      const def = TOWERS[b.dataset.tower];
      b.classList.toggle('poor', cash < this.costOf(b.dataset.tower));
      b.classList.toggle('active', placing === b.dataset.tower);
      b.querySelector('.slot-count').textContent = `${counts[b.dataset.tower] || 0}/${limitText(this.limitOf(b.dataset.tower))}`;
    });
  }

  setCash(n) {
    if (n === this.lastCash) return;
    this.lastCash = n;
    const el = this.el.cash;
    el.textContent = `$${n.toLocaleString()}`;
    el.classList.remove('bump');
    void el.offsetWidth; // restart animation
    el.classList.add('bump');
  }

  setBase(hp, max = GAME.baseHp) {
    const r = Math.max(0, hp / max);
    this.el.baseFill.style.width = `${r * 100}%`;
    this.el.baseFill.style.background =
      r > 0.5 ? 'linear-gradient(#66bb6a,#388e3c)' : r > 0.25 ? 'linear-gradient(#ffca28,#f9a825)' : 'linear-gradient(#ef5350,#c62828)';
    this.el.baseText.textContent = `❤ ${Math.max(0, Math.ceil(hp))} / ${max}`;
  }

  setWave(st, mp, spectating) {
    const w = st.wave;
    if (st.versus) {
      // Versus: endless waves on a shared clock; skipping needs every player still in.
      this.el.waveLabel.textContent = w.state === 'intermission' ? 'VERSUS' : `Wave ${w.index + 1}`;
      const next = Math.ceil(w.countdown);
      this.el.waveStatus.textContent =
        w.state === 'over' ? 'Battle over!'
        : spectating ? `Spectating · wave ${w.index + 2} in ${next}s`
        : w.state === 'intermission' ? `Wave 1 starts in ${next}s` : `Next wave in ${next}s`;
      const showSkip = w.state !== 'over' && !spectating;
      this.el.skip.classList.toggle('hidden', !showSkip);
      if (showSkip) this.el.skip.textContent = `${w.state === 'intermission' ? 'Start Wave ▶' : 'Next Wave ▶'} ${w.votes}/${st.votesNeeded}`;
      return;
    }
    this.el.waveLabel.textContent = `Wave ${Math.min(w.index + 1, w.total)} / ${w.total}`;
    let status = '';
    if (w.state === 'intermission') status = `Wave ${w.index + 1} starts in ${Math.ceil(w.countdown)}s`;
    else if (w.state === 'wave') status = w.left ? `${st.mode === 'zombies' ? 'Zombies' : 'Monsters'} incoming!` : 'Clear the remaining enemies!';
    if (w.state === 'wave' && w.countdown > 0) status += ` · next wave in ${Math.ceil(w.countdown)}s`; // Medium wave timers
    else if (w.state === 'victory') status = 'Victory!';
    else if (w.state === 'defeat') status = 'The base has fallen!';
    this.el.waveStatus.textContent = status;
    // Between waves: start now. Once a wave has fully spawned: skip ahead to the next one.
    const showSkip = !spectating && (w.state === 'intermission' || (w.state === 'wave' && (w.canSkip || st.canSkipWave)));
    this.el.skip.classList.toggle('hidden', !showSkip);
    if (showSkip) {
      const label = w.state === 'wave' ? 'Skip Wave ⏭' : w.index === 0 ? 'Start Wave ▶' : 'Skip ▶';
      this.el.skip.textContent = mp ? `${label} ${w.votes}/${st.votesNeeded}` : label;
    }
  }

  setSpeed(speed, canChange) {
    if (document.activeElement !== this.el.speed) this.el.speed.value = String(speed);
    this.el.speed.disabled = !canChange;
    this.el.speed.title = canChange ? 'Game speed' : 'Only the host can change speed';
  }

  setMuted(m) {
    this.el.mute.textContent = m ? 'Sound: Off' : 'Sound: On';
  }

  /** The music buttons (HUD and menus). `level`: 'on', 'quiet' or 'off'. */
  setMusic(level) {
    const text = `Music: ${{ on: 'On', quiet: 'Quiet', off: 'Off' }[level]}`;
    this.el.music.textContent = text;
    this.el.menuMusic.textContent = `♪ ${text}`;
  }

  setBoss(enemy) {
    if (!enemy) {
      this.el.bossBox.classList.add('hidden');
      return;
    }
    this.el.bossBox.classList.remove('hidden');
    this.el.bossName.textContent = `${enemy.def.name} — ${Math.max(0, Math.ceil(enemy.hp))} / ${enemy.maxHp}`;
    this.el.bossFill.style.width = `${Math.max(0, enemy.hp / enemy.maxHp) * 100}%`;
  }

  setScoreboard(players, myId) {
    this.el.scoreboard.innerHTML = [...players.values()]
      .map(
        (p) => `<div class="sb-row ${p.id === myId ? 'me' : ''}">
          <span class="dot" style="background:${hex(p.color)}"></span>
          <span class="sb-name">${esc(p.name)}</span>
          <span class="sb-cash">$${p.cash.toLocaleString()}</span></div>`,
      )
      .join('');
  }

  /** Versus scoreboard: everyone's base health and cash; knocked-out players show their place. */
  setVersusBoard(players, myId) {
    const me = players.get(myId);
    const list = [...players.values()].sort((a, b) => (a.place || 0) - (b.place || 0) || a.lane - b.lane);
    const html = list
      .map((p) => {
        const hp = Math.max(0, Math.ceil(p.baseHp));
        const status = p.place ? `<span class="sb-out">OUT · ${['', '1st', '2nd', '3rd', '4th'][p.place] ?? p.place}</span>` : `<span class="sb-hp">❤ ${hp}</span>`;
        const target = me && p.id === me.target && !me.place ? '<span class="sb-target" title="Your target">🎯</span>' : '';
        return `<div class="sb-row ${p.id === myId ? 'me' : ''} ${p.place ? 'out' : ''}">
          <span class="dot" style="background:${hex(p.color)}"></span>
          <span class="sb-name">${target}${esc(p.name)}</span>
          ${status}
          <span class="sb-cash">$${p.cash === Infinity ? '∞' : p.cash.toLocaleString()}</span></div>`;
      })
      .join('');
    if (html !== this.lastBoard) this.el.scoreboard.innerHTML = this.lastBoard = html;
  }

  /** Versus send panel: who you're attacking and which zombie packs you can afford. */
  updateSend(cash, wave, targetName, off) {
    this.el.send.classList.toggle('off', !!off);
    this.el.sendTarget.textContent = targetName ?? '—';
    const started = wave.state !== 'intermission';
    this.el.sendList.querySelectorAll('[data-send]').forEach((b) => {
      const d = VERSUS.sends[b.dataset.send];
      const locked = !started || wave.index + 1 < d.minWave;
      const label = locked ? `🔒 Wave ${d.minWave}` : `$${d.cost.toLocaleString()}`;
      const cost = b.querySelector('.send-cost');
      if (cost.textContent !== label) cost.textContent = label;
      const disabled = off || locked || cash < d.cost;
      if (b.disabled !== disabled) b.disabled = disabled;
    });
  }

  /** A big cinematic title across the middle of the screen (VOID's arrival and fall). */
  banner(title, sub = '', ms = 4000, cls = '') {
    let el = document.getElementById('cine-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cine-banner';
      document.body.appendChild(el);
    }
    el.className = cls;
    el.innerHTML = `<div class="cine-title">${esc(title)}</div>${sub ? `<div class="cine-sub">${esc(sub)}</div>` : ''}`;
    void el.offsetWidth; // restart the animation
    el.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  /** A full-screen colored flash (VOID's sky laser, his marks going off...). */
  screenFlash(color = '#d500f9', ms = 600) {
    const el = document.createElement('div');
    el.className = 'cine-flash';
    el.style.background = color;
    el.style.animationDuration = `${ms}ms`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  /** The big boss health bar at the top of the screen (VOID). `b`: { name, sub, frac } or null to hide. */
  bossBar(b) {
    let el = document.getElementById('boss-bar');
    if (!b) {
      if (el) el.classList.remove('show');
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'boss-bar';
      el.innerHTML = '<div class="bb-name"></div><div class="bb-track"><div class="bb-fill"></div><div class="bb-shield"></div></div><div class="bb-sub"></div>';
      document.body.appendChild(el);
    }
    el.classList.add('show');
    el.classList.toggle('phase2', !!b.phase2);
    const name = el.querySelector('.bb-name');
    if (name.textContent !== b.name) name.textContent = b.name;
    const sub = el.querySelector('.bb-sub');
    if (sub.textContent !== b.sub) sub.textContent = b.sub;
    el.querySelector('.bb-fill').style.width = `${Math.max(0, Math.min(1, b.frac)) * 100}%`;
    el.querySelector('.bb-shield').style.width = `${Math.max(0, Math.min(1, b.shield || 0)) * 100}%`; // Void armor
  }

  toast(msg, ms = 1800) {
    const t = this.el.toast;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  // ---- the order wheel (right-click; see game/wheel.js)
  get wheelOpen() {
    return !this.el.wheel.classList.contains('hidden');
  }
  /** Shows `items` ([{ key, label, icon, hint }]) in a ring around screen point (cx, cy); onPick(key) when one is clicked. */
  showWheel(cx, cy, items, onPick) {
    const w = this.el.wheel;
    const r = 84;
    w.innerHTML =
      '<div class="wheel-back"></div><div class="wheel-dot"></div>' +
      items
        .map((it, i) => {
          const a = -Math.PI / 2 + (i / items.length) * Math.PI * 2;
          return `<button class="wheel-item" data-key="${it.key}" style="left:${Math.round(Math.cos(a) * r)}px;top:${Math.round(Math.sin(a) * r)}px"><span class="wi-icon">${it.icon}</span>${esc(it.label)}${it.hint ? ` <small>${it.hint}</small>` : ''}</button>`;
        })
        .join('');
    w.style.left = `${cx}px`;
    w.style.top = `${cy}px`;
    w.classList.remove('hidden');
    w.onclick = (e) => {
      const b = e.target.closest('[data-key]');
      if (b) onPick(b.dataset.key);
      else this.hideWheel();
    };
    w.oncontextmenu = (e) => {
      e.preventDefault();
      this.hideWheel();
    };
  }
  hideWheel() {
    this.el.wheel.classList.add('hidden');
    this.el.wheel.innerHTML = '';
  }

  // ---- chat
  get chatOpen() {
    return !this.el.chatInput.classList.contains('hidden');
  }
  openChat() {
    this.el.chatInput.classList.remove('hidden');
    this.el.chatInput.value = '';
    this.el.chatInput.focus();
  }
  closeChat() {
    this.el.chatInput.classList.add('hidden');
    this.el.chatInput.blur();
  }
  addChat(m) {
    const div = document.createElement('div');
    div.className = 'chat-line';
    div.innerHTML = m.system
      ? `<i>${esc(m.text)}</i>`
      : `<b style="color:${hex(m.color ?? 0xffffff)}">${esc(m.name)}:</b> ${esc(m.text)}`;
    this.el.chatLog.appendChild(div);
    while (this.el.chatLog.children.length > 8) this.el.chatLog.firstChild.remove();
    setTimeout(() => div.classList.add('fade'), 10000);
  }

  showEnd(win, waveNum, mp, credits, shards = 0, total = WAVES.length, mode = 'easy', unlocked = null, gems = 0, derrick = 0) {
    this.el.end.classList.remove('hidden');
    $('end-title').innerHTML = win ? 'VICTORY<span>!</span>' : 'DEFEAT';
    const foes = mode === 'easy' ? 'monsters' : 'zombies';
    $('end-sub').textContent = win
      ? mode === 'void' ? `VOID has fallen. You survived all ${total} waves. It is finally over.` : mode === 'hardcore' ? `All six final bosses have fallen. You beat HARDCORE: all ${total} waves!` : mode === 'halloween' ? `Jack is dead and Lantern Hill is quiet again. Happy Halloween!` : `You survived all ${total} waves!`
      : `The ${foes} broke through on wave ${waveNum}.`;
    $('end-credits').innerHTML = rewardText(credits, shards, gems, derrick) + (unlocked ? `<div class="end-unlock">🟣 Unlocked: <b>${esc(unlocked)}</b>!</div>` : '');
    $('end-primary').textContent = mp ? 'Back to Room' : 'Play Again';
    $('end-secondary').classList.toggle('hidden', mp);
  }

  showVersusEnd(place, winnerName, wave, credits, shards = 0, derrick = 0) {
    this.el.end.classList.remove('hidden');
    const ord = ['', '1st', '2nd', '3rd', '4th'][place] ?? `#${place}`;
    $('end-title').innerHTML = place === 1 ? 'VICTORY<span>!</span>' : `${ord.toUpperCase()} PLACE`;
    $('end-sub').textContent = place === 1 ? `You outlasted everyone! (wave ${wave})` : `Your base fell on wave ${wave}. ${winnerName} won the battle.`;
    $('end-credits').innerHTML = rewardText(credits, shards, 0, derrick);
    $('end-primary').textContent = 'Back to Room';
    $('end-secondary').classList.add('hidden');
  }

  hidePanel() {
    this.el.panel.classList.add('hidden');
    this.panelKey = '';
  }

  /**
   * Panel for a plane, sentry, gravestone or unit (see substats.js). Re-renders only when its stats
   * change; the status line (health...) updates in place.
   */
  updateSubPanel(info, ctx) {
    if (!info) return this.hidePanel();
    const owner = ctx.mp && info.owner != null ? (info.owner === ctx.myId ? 'Yours' : `Owned by ${esc(ctx.ownerName)}`) : '';
    const key = JSON.stringify(['sub', info.name, info.sub, info.rows, owner, info.towerId, info.pic]);
    if (key !== this.panelKey) {
      this.panelKey = key;
      const parent = info.towerId != null ? TOWERS[info.icon]?.name : null;
      // Its own portrait (the jeep, the squad, the sentry...); the tower's if it can't be drawn.
      const pic = subIcon(info.pic) || (info.icon && this.icons[info.icon]) || '';
      this.el.panel.innerHTML = `
        <div class="p-head">
          ${pic ? `<img src="${pic}" alt="">` : ''}
          <div><div class="p-name">${esc(info.name)}</div><div class="p-sub">${esc(info.sub)}</div></div>
          <button class="btn p-close" data-action="close">✕</button>
        </div>
        ${owner ? `<div class="p-owner">${owner}</div>` : ''}
        <div class="stats">${info.rows.map(([k, v, cls = '']) => `<span>${esc(k)}</span><span class="${cls}">${v}</span>`).join('')}</div>
        ${parent ? `<div class="p-row"><button class="btn blue" data-action="parent">Select ${esc(parent)}</button></div>` : ''}
        <div class="p-record"></div>`;
      this.el.panel.classList.remove('hidden');
    }
    const rec = this.el.panel.querySelector('.p-record');
    if (rec.textContent !== info.status) rec.textContent = info.status;
  }

  /** Re-renders the tower panel only when something structural changes, so clicks aren't lost. */
  updatePanel(t, ctx) {
    if (!t) return this.hidePanel();
    const def = TOWERS[t.type];
    // Crosspath towers: the Top upgrade if there is one, else the Bottom one (see ctx.upTop / upBot).
    const next = def.cross ? ctx.upTop?.next ?? ctx.upBot?.next ?? null : def.levels[t.level + 1] && levelAt(def.levels[t.level + 1], t.x, t.z); // Penetrator: cliff stats
    const mine = t.owner === ctx.myId;
    const key = [t.id, t.type, t.level, !!t.holo, t.targetMode, t.track, (t.off || []).join(','), (t.choice || []).join(','), next ? `${ctx.upCost}:${ctx.cash >= ctx.upCost}:${ctx.upCostB}:${ctx.cash >= ctx.upCostB}` : '-', t.spent, mine, ctx.ownerName, ctx.borrowed, buffText(ctx.buff)].join('|');
    if (key !== this.panelKey) {
      this.panelKey = key;
      this.renderPanel(t, def, next, mine, ctx);
    }
    const s = def.levels[t.level];
    const c = t.charge || 0;
    const charge = s.star ? (t.starT > 0 ? ` · Rebooting ${Math.ceil(t.starT)}s` : ` · Charge: ${Math.round(c * 100)}% (${Math.round(s.star.min + (s.star.max - s.star.min) * c).toLocaleString()} dmg)`)
      : t.fwT > 0 ? ` · 🎆 Fireworks ${Math.ceil(t.fwT)}s`
      : isBeam(s) ? ` · Charge: ${Math.round(c * 100)}%`
      : s.souls ? ` · Souls: ${Math.round(c * s.souls)}/${s.souls}`
      : s.soul ? ` · Souls: ${Math.floor(c * s.soul.max)}/${s.soul.max}`
      : s.hunt ? ` · 🎯 Bounty: $${Math.floor(t.bank || 0).toLocaleString()} / $${s.hunt.cap.toLocaleString()}`
      : s.scrap ? ` · Scrap: ${Math.round(c * s.scrap)}/${s.scrap}`
      : s.smite ? ` · Smite: ${Math.round(c * s.smite.hits)}/${s.smite.hits}`
      : t.holo ? ` · Hologram: ${Math.ceil(t.holo)}s left`
      : s.overcharge ? (c < 0 ? ' · Cooling down' : t.lock ? ` · Firing (${Math.round(c * 100)}% left)` : ` · Charging ${Math.round(c * 100)}%`)
      : '';
    const rec =
      def.kind === 'income' && s.bank ? `🏦 Bank: $${(t.bank || 0).toLocaleString()} / $${s.bank.cap.toLocaleString()} · +${Math.round(s.bank.interest * 100)}% each wave · ${s.crates} bundles of $${s.bundle} a wave`
      : def.kind === 'income' && s.bundles ? `Pays $${s.income} a wave in ${s.crates} bundles of $${s.bundle}`
      : def.kind === 'income' && s.crates ? `Drops $${s.income}${s.econ ? ' + bonus' : ''} in crates every wave`
      : def.kind === 'income' && s.oil ? `Pumps $${s.oil.pay} every ${s.oil.every}s${s.income ? ` + $${s.income} every wave` : ''}`
      : def.kind === 'income' && s.lemon ? `🍋 Earns $${s.lemon.pay}/s for every zombie in range (up to ${s.lemon.cap})`
      : def.kind === 'income' ? `Earns $${s.income} every wave`
      : s.shield ? (s.shield.shared ? `🛡 Shared shield: ${(t.pool || 0).toLocaleString()} / ${s.shield.amount.toLocaleString()} left` : `🛡 Gives every tower in range a ${s.shield.amount.toLocaleString()} shield every ${s.shield.every}s`)
      : s.beamHeal ? (t.lock ? `Healing a tower${t.active > 0 ? ` · ${s.abilities.find((a) => timedAbility(a)).name} on (${Math.ceil(t.active)}s)` : ''}` : 'No tower to heal')
      : def.bait ? '🎯 Bait: drawing enemy attacks'
      : def.kind === 'support' && !s.damage && !s.firework ? `${s.shields ? 'Shielding' : 'Boosting'} ${ctx.boosting} tower${ctx.boosting === 1 ? '' : 's'}`
      : `Kills: ${t.kills} · Damage dealt: ${Math.round(t.damageDealt)}${charge}`;
    const rebuilds = def.rebuilds ? def.rebuilds - (t.rebuilt || 0) : 0; // XWM Turret
    const down = t.repairT > 0 ? `🔧 Rebuilding… ${Math.ceil(t.repairT)}s (${rebuilds - 1} rebuild${rebuilds - 1 === 1 ? '' : 's'} left after this)`
      : def.rebuilds ? `💫 Knocked out! No rebuilds left${def.noHeal ? '' : ': heal it with a Health Pack'}` : '💫 Knocked out! Heal it with a Medic or Health Pack';
    const hp = t.maxHp ? (t.hp > 0 ? `❤ ${t.hp}/${t.maxHp}${def.rebuilds ? ` · 🔧 ${rebuilds} rebuild${rebuilds === 1 ? '' : 's'} left` : ''}` : down) : '';
    // Stealth: enemies can't target or hurt it. It drains, then it's revealed until it refills.
    const stealth = t.cloakT > 0 ? `👻 Stealthy (grenade ${Math.ceil(t.cloakT)}s)`
      : !s.stealth ? ''
      : t.exposedT > 0 ? `👁 Revealed (${Math.ceil(t.exposedT)}s)`
      : `👻 Stealthy (${Math.ceil(t.stealthLeft)}s)`;
    const shieldHp = t.shieldHp > 0 ? `🛡 ${t.shieldHp}` : '';
    const extra = t.invulnT > 0 ? `✨ Shield ${Math.ceil(t.invulnT)}s` : t.reviveT > 0 ? `✚ Reviving… ${Math.ceil(t.reviveT)}s`
      : t.dpT > 0 ? `⚡ Directed Power ${Math.ceil(t.dpT)}s` : s.near ? (t.near ? '⚡ Short-range mode' : '⚡ Long-range mode') : '';
    const head = [hp, shieldHp, extra, stealth].filter(Boolean).join(' · ');
    this.el.panel.querySelector('.p-record').textContent = head ? `${head} · ${rec}` : rec;
    const ammo = this.el.panel.querySelector('.p-ammo');
    if (ammo) {
      const text = t.reloadT > 0 ? `Reloading… ${Math.ceil(t.reloadT)}s` : `${t.ammo ?? s.ammo} / ${s.ammo}`;
      if (ammo.textContent !== text) ammo.textContent = text;
      ammo.className = `p-ammo ${t.reloadT > 0 ? 'no' : 'yes'}`;
    }
    // Ability buttons tick down in place (re-rendering would eat clicks).
    this.el.panel.querySelectorAll('[data-ab]').forEach((b, i) => {
      const ab = s.abilities?.find((a) => a.key === b.dataset.ab);
      if (!ab) return;
      const cd = Math.ceil(t.cd?.[ab.key] || 0);
      const live = timedAbility(ab) && t.active > 0 ? ` – ON ${Math.ceil(t.active)}s`
        : ab.key === 'fps' && t.manual ? ' – ON'
        : ab.key === 'track' ? ` – ${TRACKS[t.track || 0].name}`
        : ab.key === 'arrows' ? ` – ${arrowName(s, t.track)}`
        : ab.key === 'element' ? ` – ${def.choices[choicesOf(def, s, t.choice)[0]]}`
        : ab.key === 'droneMode' ? ` – ${DRONE_NAMES[droneMode(t, s)]}`
        : ab.key === 'dive' ? ` – ${t.choice?.[0] === 'sub' ? (s.paraSlow || s.sub?.paraSlow ? 'Laser' : 'Submerged') : s.sub?.paraSlow ? 'Bubble' : 'Afloat'}`
        : ab.key === 'timeWarp' ? ` – ${t.choice?.[0] === 'slow' ? 'Slow' : 'Fast'}`
        : ab.key === 'soulBeam' ? ` – ${t.choice?.[0] === 'beam' ? 'Beam' : 'Auto'}`
        : ab.key === 'scope' ? ` – ${t.choice?.[0] === 'wide' ? 'Wide' : 'Normal'}` : '';
      const price = abilityCost(t, ab);
      const uses = ab.maxUses || ab.costs ? ` ${t.uses?.[ab.key] || 0}/${ab.maxUses ?? ab.costs.length}` : '';
      const label = cd > 0 ? `${ab.name} (${cd}s)${live}` : price == null ? `${ab.name} (used up)` : `${ab.name}${uses}${price ? ` $${price.toLocaleString()}` : ''} (${ABILITY_KEYS[i]})`;
      if (b.textContent !== label) b.textContent = label;
      const off = !mine || cd > 0 || price == null || (price && ctx.cash < price) || (ab.versus && !ctx.versus) || (ab.mode && choicesOf(def, s, t.choice)[0] !== ab.mode);
      if (b.disabled !== !!off) b.disabled = !!off;
    });
  }

  /** Stats rows for towers that don't attack on their own (spawners, income, support). */
  kindStats(def, s, t) {
    const rows = [];
    const row = (k, v, cls = '') => rows.push(`<span>${k}</span><span class="${cls}">${v}</span>`);
    if (s.oil) row('Oil', `+$${s.oil.pay} every ${s.oil.every}s`, 'yes');
    if (s.lemon) {
      row('Income', `+$${s.lemon.pay}/s per zombie in range`, 'yes');
      row('Counts', `Up to ${s.lemon.cap} zombies at once (hidden ones too), only while they are in range`);
      row('Range', s.range);
    } else if (def.kind === 'income' && (s.income || !s.oil)) row('Income', `+$${s.income ?? 0} / wave`, 'yes');
    if (def.kind === 'income' && s.dmgCash) row('Cash back', `+${Math.round(s.dmgCash * 100)}% cash from damage${def.noStack ? ' (best Derrick only)' : ''}`, 'yes');
    if (s.shield) row('Shield', `${s.shield.amount.toLocaleString()} ${s.shield.shared ? 'shared by every tower in range' : 'for each tower in range'}, every ${s.shield.every}s`, 'yes');
    if (s.shield) row('Range', s.aura);
    if (s.shield && s.towerHeal) row('Repairs', `${s.towerHeal} HP/s to towers in range`, 'yes');
    if (s.crates) row('Crates', `${s.crates} a wave, the first lands ${s.drop}s in`);
    if (s.econ) row('Tower Economics', `+${Math.round(s.econ.pct * 100)}% of nearby towers' value (up to $${s.econ.max.toLocaleString()})`, 'yes');
    if (def.noHeal) row('Healing', "Medics can't heal it", 'no');
    if (def.kind === 'spawner' && s.roster) {
      // Mercenary Base: several kinds of units, trained in queues.
      for (const r of s.roster) row(r.unit.name, `${rosterText(r).slice(r.unit.name.length + 2)}`);
      row('Queues', `${s.queues} unit${s.queues > 1 ? 's' : ''} trained at once`);
      if (s.range) row('Deploy range', `${s.range} (units roll out on the path in range)`);
      if (s.aura) {
        row('Boost range', s.aura);
        row('Boosts', boostText(s), 'yes');
      }
    } else if (def.kind === 'spawner' && s.plants) {
      // Biologist: plants grown in queues on the path inside its range.
      row('Queues', `${s.queues} plant${s.queues > 1 ? 's' : ''} growing at once`);
      row('Plant range', `${s.range} (plants grow on the path in range)`);
      for (const p of s.plants) {
        const u = p.unit;
        row(u.name, `${u.hp} HP, lasts ${u.life}s, grows in ${p.every}s`);
        row('', `${gunText(u.gun)}, range ${u.gun.range}`);
      }
    } else if (def.kind === 'spawner' && s.drawings) {
      // Stella: paints drawings on the path in range while zombies are near.
      row('Paints', `A drawing every ${s.drawEvery}s while a zombie is within ${s.range}, up to ${s.maxDrawings} out`);
      for (const u of s.drawings) {
        row(u.name, `${u.hp} HP, stays until it's worn down`);
        row('', `${gunText(u.gun)}, range ${u.gun.range}`);
      }
    } else if (def.kind === 'spawner') {
      // Usually one unit; the Armored Factory can also send a second vehicle on its own timer.
      for (const { unit: u, every } of spawnerUnits(s, def)) {
        row('Sends', unitName(u));
        row('Every', `${every}s of wave time${def.maxUnits ? ` (max ${def.maxUnits} out)` : u.max ? ` (max ${u.max} out)` : ''}`);
        if (u.crow) row('Flies', `Anywhere on the map; pecks ${u.hits} times, then leaves`);
        else if (u.bee) row('Flies', `Chases zombies in range (${s.range}); stings ${u.hits} times, then dies`);
        else if (u.air) row('Flies', 'Over the zombies (they can\'t touch it)');
        if (s.maxUnits && u.free) row('Max out', `${s.maxUnits} at once`);
        if (u.burn) row('Burns', `${u.burn.dps}/s for ${u.burn.time}s on every zombie it hits`);
        if (u.revive) row('Revives', `Back to full health ${u.revive === 1 ? 'once' : `${u.revive} times`}`, 'yes');
        if (u.star) row('Star', `Out of health: ${u.star.time}s invincible, ${u.star.damage} dmg smashes (-${Math.round((1 - u.star.fade) * 100)}% each)`, 'yes');
        if (u.defense) row('Defense', `Takes ${Math.round(u.defense * 100)}% less damage`, 'yes');
        if (u.ram) row('Rams', `Crashes into zombies${u.ramArmor ? ` (takes ${Math.round(u.ramArmor * 100)}% less damage)` : ''}`);
        if (u.bump) row('Bumps', `${u.bump} dmg/s to zombies it touches${u.soldiers > 1 ? ' (per soldier)' : ''}`);
        if (u.gun) row('Gun', `${gunText(u.gun)}, range ${limitText(u.gun.range)}`);
        if (u.cannon) row('Cannon', cannonText(u.cannon));
        if (u.beam) row('Laser', `${u.beam.damage.toLocaleString()} dmg to one zombie every ${u.beam.every}s, range ${u.beam.range}`);
        if (u.summon) row('Summons', `${unitName(u.summon.unit)} every ${u.summon.every}s`);
        if (u.explode) row('Explodes', `${u.explode.damage} dmg when destroyed${u.pierceArmor ? ' (ignores armor)' : ''}`);
        row('DPS', `${unitDps(u, every)}`);
      }
      if (def.noBuff) row('Boosts', "Support towers can't boost its units", 'no');
    }
    if (def.bait) {
      row('Bait', 'Enemies that attack towers go for it first', 'yes');
      row('Attacks', 'Never', 'no');
    } else if (def.kind === 'support') {
      row(s.shields ? 'Shield range' : s.beamHeal ? 'Heal range' : 'Boost range', s.aura);
      row(s.shields ? 'Shields' : s.beamHeal ? 'Heals' : 'Boosts', boostText(s), 'yes');
      if (s.tracks) {
        const tr = TRACKS[t.track || 0];
        row('Playing', `<b style="color:${tr.css}">${tr.name}</b>${s.offTrack ? ' (full), others at half' : ''}`);
      }
      if (s.firework) row('Fireworks', `${s.firework.damage} dmg, blast ${s.firework.radius}, chance = half the tower's seconds per shot (up to ${Math.round(s.firework.cap * 100)}%)`);
      if (s.damage) row('Shoots', `${s.damage} dmg every ${s.cooldown}s, ${def.fury ? `only for ${def.fury}s after an ability` : 'only during Call to Arms'}`);
    }
    return rows.join('');
  }

  renderPanel(t, def, next, mine, ctx) {
    const s = levelAt(def.levels[t.level], t.x, t.z);
    const kind = def.kind;
    const sellValue = Math.floor(t.spent * (def.sellRatio ?? GAME.sellRatio) * (1 + (ctx.buff?.sell || 0))); // EDJ sellback
    // Crosspath towers: a row of Top pips and a row of Bottom pips.
    const pipRow = (n, on, label) => `<span class="pip-tag">${label}</span>${Array.from({ length: n }, (_, i) => `<div class="pip ${i < on ? 'on' : ''}"></div>`).join('')}`;
    const pips = def.cross
      ? `${pipRow(def.cross.maxA, def.cross.a, '▲')}<span class="pip-gap"></span>${pipRow(def.cross.maxB, def.cross.b, '▼')}`
      : def.levels.map((_, i) => `<div class="pip ${i <= t.level ? 'on' : ''}"></div>`).join('');
    const dps = dpsText(s);
    const beam = isBeam(s);
    let nextHtml = '<div class="maxed">★ MAX LEVEL ★</div>';
    // One upgrade option. Towers with upgrade paths offer two at the fork (Top and Bottom).
    const nextBlock = (next, nextType, upCost, action, pathTag) => {
      const diffs = [];
      if (!kind) {
        if (damageText(next) !== damageText(s)) diffs.push(`Damage ${damageText(s)} → ${damageText(next)}`);
        if (beam && next.ramp !== s.ramp) diffs.push(`Full charge in ${s.ramp}s → ${next.ramp}s`);
        if ((next.burst || 1) !== (s.burst || 1)) diffs.push(`Burst ${s.burst} → ${next.burst} shots`);
        if (next.radius !== s.radius) diffs.push(`Blast ${s.radius} → ${next.radius}`);
        if (clusterText(next.cluster) !== clusterText(s.cluster)) diffs.push(`Cluster bombs: ${clusterText(next.cluster)}`);
        if (next.nuke && !s.nuke) diffs.push('+ Nuclear-style explosion');
        if ((next.freeze || 0) !== (s.freeze || 0)) diffs.push(`Freeze ${s.freeze}s → ${next.freeze}s`);
        if ((next.stun || 0) !== (s.stun || 0) && !s.chains) diffs.push(s.stun ? `Stun ${s.stun}s → ${next.stun}s` : next.stunTargets ? `+ Stuns up to ${next.stunTargets} zombies for ${next.stun}s` : `+ Every hit stuns for ${next.stun}s`);
        if (s.stunTargets && next.stunTargets !== s.stunTargets) diffs.push(`Stuns ${s.stunTargets} → ${next.stunTargets} zombies`);
        if (critText(next) !== critText(s)) diffs.push(`Critical hit: ${critText(next)}`);
        if (next.stunAll && !s.stunAll) diffs.push('+ Every hit stuns');
        if (next.riot && !s.riot) diffs.push(`+ Riot shield: blocks stuns, then ${next.riot.duration}s of double damage`);
        if (next.burnTime !== s.burnTime) diffs.push(`Burn time ${s.burnTime}s → ${next.burnTime}s`);
        if (next.cone !== s.cone) diffs.push(next.cone < s.cone ? '- Narrower cone' : s.pellets ? '+ Wider spread' : facesCone(def) || s.extra ? '+ Wider cone' : '+ Wider flames');
        if (ammoText(next) !== ammoText(s)) diffs.push(`Ammo: ${ammoText(s)} → ${ammoText(next)}`);
        if (next.patrol !== s.patrol) diffs.push(`Patrol zone ${s.patrol} → ${next.patrol}`);
        if ((next.pellets || 0) !== (s.pellets || 0)) diffs.push(`Pellets ${s.pellets} → ${next.pellets}`);
        if ((next.hits || 0) !== (s.hits || 0)) diffs.push(`Hits ${s.hits} → ${next.hits} zombies per spray`);
        if (chainText(next) !== chainText(s)) diffs.push(`Lightning: ${chainText(next)}`);
        if (smiteText(next.smite) !== smiteText(s.smite)) diffs.push(s.smite ? `Smite: ${smiteText(next.smite)}` : `+ Smite: ${smiteText(next.smite)}`);
        if (poisonText(next.poison) !== poisonText(s.poison)) diffs.push(`Poison: ${poisonText(next.poison)}`);
        if ((next.defPierce || 0) !== (s.defPierce || 0)) diffs.push(`Defense piercing ${pct(s.defPierce)} → ${pct(next.defPierce)}`);
        if (next.kin && JSON.stringify(next.kin) !== JSON.stringify(s.kin)) diffs.push(`+ Boosts nearby ${def.name}s: ${kinText(next.kin)}`);
        if (next.combine && JSON.stringify(next.combine) !== JSON.stringify(s.combine)) diffs.push(`Pellets: ${next.combine.hits} hits on one zombie → ${next.combine.damage} dmg blast`);
        if (next.heatRamp && JSON.stringify(next.heatRamp) !== JSON.stringify(s.heatRamp)) diffs.push(`+ Fires faster as it heats up${next.heatRamp.dmg ? ` (up to +${Math.round(next.heatRamp.dmg * 1000) / 10}% damage)` : ''}`);
        if ((next.ammo || 0) !== (s.ammo || 0) && s.ammo && !next.ammo) diffs.push('+ Never overheats');
        if (next.shieldMult && !s.shieldMult) diffs.push(`+ ${next.shieldMult}x damage to shields`);
        if (next.cycle && !s.cycle) diffs.push('+ Arrows cycle poison, fire and stun');
        if (next.poacher && !s.poacher) diffs.push('+ Blue fire, slows and crowd explosions');
        if (next.sentryCycle && JSON.stringify(next.sentryCycle) !== JSON.stringify(s.sentryCycle)) diffs.push(`Turrets: ${next.sentryCycle.map((x) => x.name).join(', ')}`);
        if (next.near !== s.near && !next.near) diffs.push('- Loses its short-range mode');
        if ((next.scatter || 0) !== (s.scatter || 0)) diffs.push(`+ Scattershot: each pellet hits ${next.scatter} zombies`);
        if ((next.volley || 0) !== (s.volley || 0)) diffs.push(`+ Fires ${next.volley} missiles at once`);
        if ((next.aimShot || 0) !== (s.aimShot || 0)) diffs.push(`- Aims ${next.aimShot}s before every shot`);
        if (trapText(next) !== trapText(s)) diffs.push(`Traps: ${trapText(next)}`);
        if (next.cooldown !== s.cooldown) diffs.push(`${beam ? 'Tick' : 'Cooldown'} ${s.cooldown}s → ${next.cooldown}s`);
        if (next.range !== s.range) diffs.push(`Range ${s.range} → ${next.range}`);
        if (goonText(next.goons) !== goonText(s.goons)) diffs.push(`Goons: ${goonText(next.goons)}`);
        if ((next.income || 0) !== (s.income || 0)) diffs.push(`+ $${next.income} every wave`);
        if (next.shared && !s.shared) diffs.push('+ Shoots in range of every Tweeter');
        if (next.spy && !s.spy) diffs.push(`+ Shares hidden detection inside its ${def.orbit ? 'ring' : 'range'}`);
        if (bombText(next.bomb) !== bombText(s.bomb)) diffs.push(`Bombs: ${bombText(next.bomb)}`);
        if (missileText(next.missile) !== missileText(s.missile)) diffs.push(`Missiles: ${missileText(next.missile)}`);
        if (next.rockets && JSON.stringify(next.rockets) !== JSON.stringify(s.rockets)) diffs.push(`+ Rockets: ${next.rockets.damage} dmg every ${next.rockets.every}s`);
        if ((next.extra || 0) !== (s.extra || 0)) diffs.push(`Extra targets ${s.extra} → ${next.extra}`);
        if ((next.targets || 0) !== (s.targets || 0)) diffs.push(`Targets ${s.targets} → ${next.targets}`);
        if ((next.beam || 0) !== (s.beam || 0)) diffs.push(`Ice beam hits ${s.beam} → ${next.beam} zombies`);
        if (JSON.stringify(next.missiles) !== JSON.stringify(s.missiles)) for (const m of next.missiles || []) diffs.push(`${s.missiles ? '' : '+ '}${m.name}: ${missileText(m)}`);
        if ((next.pierce || 0) !== (s.pierce || 0)) diffs.push(`Hits ${s.pierce} → ${next.pierce} zombies per ${s.bolt ? 'bolt' : 'throw'}`);
        if (next.stack && !s.stack) diffs.push(`+ Stacking beam: up to +${Math.round(next.stack.max * 100)}% damage on one zombie`);
        if (graveText(next) !== graveText(s)) diffs.push(`Gravestones: ${graveText(next)}`);
        if (next.raise && s.raise) next.raise.forEach((pool, i) => {
          if (!s.raise[i]) diffs.push(`+ Lv ${i + 1} graves summon ${poolText(pool)}`);
          else if (poolText(pool) !== poolText(s.raise[i]) || pool.some((u, j) => u !== s.raise[i][j])) diffs.push(`Lv ${i + 1} graves summon ${poolText(pool)}`);
        });
        if (next.boom && !s.boom) diffs.push(`+ Lv ${next.boomLvl} graves explode for ${next.boom.damage} dmg`);
        if (next.sentry && s.sentry) {
          if (next.sentries !== s.sentries) diffs.push(`Sentries ${s.sentries} → ${next.sentries}`);
          if (sentryText(next) !== sentryText(s)) diffs.push(`Sentry: ${sentryText(next)}`);
          if (next.buildRange !== s.buildRange) diffs.push(`Build range ${s.buildRange} → ${next.buildRange}`);
        }
        if (next.synapses && s.synapses) {
          if (next.synapses !== s.synapses) diffs.push(`Synapses ${s.synapses} → ${next.synapses}`);
          if (next.ev !== s.ev) diffs.push(`Hologram health: max health^${s.ev} → ^${next.ev}`);
          if (next.slow !== s.slow) diffs.push(`Slowness ${Math.round(s.slow * 1000) / 10}% → ${Math.round(next.slow * 1000) / 10}%`);
          if (next.fraud !== s.fraud) diffs.push(`Wire Fraud +${Math.round(s.fraud * 1000) / 10}% → +${Math.round(next.fraud * 1000) / 10}%`);
          if (cloneText(s) && cloneText(next) !== cloneText(s)) diffs.push(`Clones: ${cloneText(next)}`);
        }
        if (overchargeText(next) !== overchargeText(s)) diffs.push(`Overcharge: ${overchargeText(next)}`);
        if ((next.rangs || 1) !== (s.rangs || 1)) diffs.push(`+ Throws ${next.rangs} boomerangs at once`);
        if (next.speed !== s.speed && next.pierce) diffs.push('+ Faster boomerangs');
        if (slimeText(next.slime) !== slimeText(s.slime)) diffs.push(`Slime: ${slimeText(next.slime)}`);
        if (chillText(next) !== chillText(s)) diffs.push(`Chill: ${chillText(next)}`);
        if (m203Text(next.m203) !== m203Text(s.m203)) diffs.push(`${s.m203 ? '' : '+ '}${m203Name(next.m203)}: ${m203Text(next.m203)}`);
        if (whirlText(next.whirl) !== whirlText(s.whirl)) diffs.push(`Whirlwind: ${whirlText(next.whirl)}`);
        if (bubbleText(next.bubble) !== bubbleText(s.bubble)) diffs.push(`Bubbles: ${bubbleText(next.bubble)}`);
        if (next.companion && !s.companion) diffs.push(`+ ${companionText(next.companion)}`);
        if (comboText(next.combo) !== comboText(s.combo)) diffs.push(`${s.combo ? '' : '+ '}Combo: ${comboText(next.combo)}`);
        const rp0 = repositionOf(s);
        const rp1 = repositionOf(next);
        if (rp1 && (rp0?.damage !== rp1.damage || rp0?.reach !== rp1.reach)) diffs.push(`${rp0 ? '' : '+ '}Reposition: ${rp1.damage} dmg leap within ${rp1.reach}`);
        if (next.fan && !s.fan) diffs.push(`+ Fan of Knives: ${fanText(next.fan)}`);
        if (next.android && (next.android.every !== s.android?.every || next.android.type !== s.android?.type)) {
          diffs.push(`Sends a ${ENEMIES[next.android.type].name} every ${next.android.every}s`);
        }
        const sw0 = sweeperOf(s);
        const sw1 = sweeperOf(next);
        if (sw0 && sw1 && (sw0.damage !== sw1.damage || sw0.spin !== sw1.spin)) diffs.push(`Sweeper: ${sw0.damage} → ${sw1.damage} dmg, one turn every ${sw0.spin}s → ${sw1.spin}s`);
        if (cashText(next.cash) !== cashText(s.cash)) diffs.push(`Cash shot: ${cashText(next.cash)}`);
        if (next.chip && !s.chip) diffs.push(`+ No Mercy: -${next.chip.damage} enemy base health every ${next.chip.every}s`);
      }
      const hpNow = towerMaxHp(t.type, t.level);
      const hpNext = towerMaxHp(nextType, t.level + 1);
      if (hpNext !== hpNow) diffs.push(`Health ${hpNow} → ${hpNext}`);
      if ((next.towerHeal || 0) !== (s.towerHeal || 0)) diffs.push(`Repairs towers ${s.towerHeal || 0} → ${next.towerHeal} HP/s`);
      if ((next.income || 0) !== (s.income || 0) && kind) diffs.push(`Income $${s.income} → $${next.income} every wave`);
      if (next.aura !== s.aura) diffs.push(`Boost range ${s.aura} → ${next.aura}`);
      if (boostText(next) !== boostText(s)) diffs.push(`Boosts: ${boostText(next)}`);
      if (next.damage && !s.damage && kind === 'support') diffs.push(def.fury ? `+ Fights for ${def.fury}s after any ability` : '+ Shoots during Call to Arms');
      else if (kind === 'support' && s.damage && next.damage !== s.damage) diffs.push(`Damage ${s.damage} → ${next.damage}`);
      for (const a of next.abilities || []) if (!s.abilities?.some((b) => b.key === a.key)) diffs.push(`+ Ability: ${abilityText(a)}`);
      if (next.roster && s.roster) {
        if (next.queues !== s.queues) diffs.push(`Queues ${s.queues} → ${next.queues}`);
        for (const r of next.roster) {
          const old = s.roster.find((o) => o.unit.name === r.unit.name);
          if (!old) diffs.push(`+ ${rosterText(r)}`);
          else if (rosterText(old) !== rosterText(r)) diffs.push(`${rosterText(r)}`);
        }
      }
      if (next.unit && s.unit) {
        const a = s.unit;
        const b = next.unit;
        if (unitName(a) !== unitName(b)) diffs.push(`${unitName(a)} → ${unitName(b)}`);
        if (gunText(a.gun) !== gunText(b.gun) || a.gun?.range !== b.gun?.range) diffs.push(`Gun: ${b.gun ? `${gunText(b.gun)}, range ${limitText(b.gun.range)}` : 'none'}`);
        if (cannonText(a.cannon) !== cannonText(b.cannon)) diffs.push(`Cannon: ${cannonText(b.cannon)}`);
        if (b.explode && !a.explode) diffs.push(`+ Explodes for ${b.explode.damage} dmg`);
        if (next.spawnNow) diffs.push('+ Sends the new unit right away');
      }
      for (const x of spawnExtras(next)) {
        // Armored Factory / Field Barracks: extra units, added or swapped.
        const a = s[`unit${x.n}`];
        const b = x.unit;
        const was = s[`spawnEvery${x.n}`];
        if (!a) diffs.push(`+ ${unitName(b)} every ${x.every}s`);
        else if (unitName(a) !== unitName(b) || x.every !== was) diffs.push(`${unitName(a)} → ${unitName(b)} every ${x.every}s`);
        if (gunText(a?.gun) !== gunText(b.gun)) diffs.push(`${b.name} gun: ${b.gun ? `${gunText(b.gun)}, range ${limitText(b.gun.range)}` : 'none'}`);
        if (cannonText(a?.cannon) !== cannonText(b.cannon)) diffs.push(`${b.name} cannon: ${cannonText(b.cannon) || 'none'}`);
      }
      if ((next.spawnEvery ?? def.spawnEvery) !== (s.spawnEvery ?? def.spawnEvery) && kind === 'spawner' && !next.roster)
        diffs.push(`Every ${s.spawnEvery ?? def.spawnEvery}s → ${next.spawnEvery ?? def.spawnEvery}s`);
      if (kind !== 'income' && !(kind === 'support' && !next.damage)) {
        const d0 = detection(t.type, t.level);
        const d1 = detection(nextType, t.level + 1);
        for (const k of ['hidden', 'flying', 'lead']) if (d1[k] && !d0[k]) diffs.push(`+ ${k[0].toUpperCase() + k.slice(1)} detection`);
      }
      const key = action === 'upgrade' ? ' <small>(E)</small>' : '';
      // The upgrade's picture: the tower as it will look, in its own stance (icons.js).
      const pic = towerIcon(nextType, t.level + 1);
      return `<div class="next">
        <div class="next-head">
          ${pic ? `<img class="next-ico" src="${pic}" alt="">` : ''}
          <div class="next-main">
            <div class="next-title">${pathTag ? `<span class="path-tag">${pathTag}</span> ` : ''}${def.cross ? next.tierText : `Lv ${t.level + 2}`} – ${next.name}</div>
            <div class="next-desc">${descHtml(next.desc)}</div>
          </div>
        </div>
        <div class="diff">${diffs.map((d) => `<div class="dl"><span class="di">${diffIcon(d)}</span><span>${d}</span></div>`).join('')}</div>
        ${mine && ctx.upgradeLock?.(nextType, next) ? `<button class="btn" disabled title="${next.perk ? 'A reward for winning a mode' : 'Earn XP with this tower to raise its evolution level'}">🔒 ${ctx.upgradeLock(nextType, next)}</button>` : ''}
        ${mine && !ctx.upgradeLock?.(nextType, next) ? `<button class="btn green" data-action="${action}" ${ctx.cash < upCost ? 'disabled' : ''}>Upgrade $${upCost.toLocaleString()}${upCost < next.cost ? ` <s>$${next.cost.toLocaleString()}</s>` : ''}${key}</button>` : ''}
      </div>`;
    };
    if (t.holo) nextHtml = '<div class="maxed">Hologram: can\'t be upgraded</div>';
    else if (def.cross) {
      // Crosspathing: one path can go all the way, the other up to 2.
      const c = def.cross;
      const blocks = [];
      if (ctx.upTop) blocks.push(nextBlock(ctx.upTop.next, ctx.upTop.type, ctx.upCost, 'upgrade', `▲ Top ${ctx.upTop.next.tier}`));
      else if (c.a < c.maxA) blocks.push('<div class="maxed">▲ Top path locked: the Bottom path is past tier 2</div>');
      if (ctx.upBot) blocks.push(nextBlock(ctx.upBot.next, ctx.upBot.type, ctx.upCostB, 'upgrade:bottom', `▼ Bottom ${ctx.upBot.next.tier}`));
      else if (c.b < c.maxB) blocks.push('<div class="maxed">▼ Bottom path locked: the Top path is past tier 2</div>');
      if (ctx.upTop || ctx.upBot) nextHtml = blocks.join('');
    } else if (next) {
      const fork = def.branch && t.level + 1 === def.branchAt;
      nextHtml = nextBlock(next, t.type, ctx.upCost, 'upgrade', fork ? `${def.path} path` : '');
      if (fork) {
        const b = TOWERS[def.branch];
        nextHtml += nextBlock(b.levels[t.level + 1], def.branch, ctx.upCostB, 'upgrade:bottom', `${b.path} path`);
      }
    }
    const owner = ctx.mp ? `<div class="p-owner">${mine ? 'Your tower' : `Owned by ${esc(ctx.ownerName)}`}</div>` : '';
    const targets = (!kind && !def.pulse) || (kind === 'support' && s.damage); // pulses never aim
    const abilities = s.abilities?.length
      ? `<div class="p-row abil">${s.abilities.map((a) => `<button class="btn purple" data-action="ability:${a.key}" data-ab="${a.key}" title="${esc(abilityText(a))}"></button>`).join('')}</div>`
      : '';
    // Trapper traps / Mercenary Base units: toggle which ones it uses.
    const opts = pickOptions(s);
    const off = t.off || [];
    const picks = opts
      ? `<div class="p-picks"><div class="p-picks-title">${s.roster ? 'Units to train' : 'Traps to throw'}</div><div class="p-row">${opts
          .map((o) => `<button class="btn pick ${off.includes(o.key) ? 'off' : 'on'}" data-action="pick:${o.key}" ${mine ? '' : 'disabled'}>${off.includes(o.key) ? '✘' : '✔'} ${esc(o.name)}</button>`)
          .join('')}</div></div>`
      : '';
    // Jester bombs / Biologist plants: pick one option per slot (free and instant).
    const ch = choiceOptions(def, s);
    const chosen = choicesOf(def, s, t.choice);
    const choose = ch?.free
      ? `<div class="p-picks"><div class="p-picks-title">${ch.title}</div>${chosen
          .map((k, i) => `<div class="p-row">${ch.slots > 1 ? `<span class="p-slot">${ch.slot} ${i + 1}</span>` : ''}${ch.options
            .map((o) => `<button class="btn pick ${o.key === k ? 'on' : 'off'}" data-action="choose:${i}:${o.key}" ${mine ? '' : 'disabled'}>${o.key === k ? '●' : '○'} ${esc(o.name)}</button>`)
            .join('')}</div>`)
          .join('')}</div>`
      : '';
    const actions = choose + picks + (mine
      ? `${targets ? `<div class="p-row"><button class="btn blue" data-action="target">Target: ${TARGET_MODES[t.targetMode]} <small>(T)</small></button></div>` : ''}
         <div class="p-row"><button class="btn red" data-action="sell">${t.holo ? 'Remove hologram' : `Sell $${sellValue}`} <small>(X)</small></button></div>`
      : targets ? `<div class="p-row"><span class="p-target">Target: ${TARGET_MODES[t.targetMode]}</span></div>` : '');
    const boosted = buffText(ctx.buff);
    const det = detection(t.type, t.level);
    const borrowed = !det.hidden && ctx.borrowed && !kind;
    const mark = (yes, label, note = '') => `<span class="${yes ? 'yes' : 'no'}">${yes ? '✔' : '✘'} ${label}${note}</span>`;
    const hiddenRow = kind === 'income' || (kind === 'support' && !s.damage)
      ? ''
      : `<span>Detection</span><span>${mark(det.hidden || borrowed, 'Hidden', borrowed ? ' (Aviator)' : '')} ${mark(det.flying, 'Flying')} ${mark(det.lead, 'Lead')}${det.ground === false ? ' <span class="no">✘ Ground (flying only)</span>' : ''}</span>`;
    const range = ctx.buff && ctx.buff.range > 1 ? `${Math.round(s.range * ctx.buff.range * 100) / 100} <small>(${s.range} base)</small>` : s.range;
    const attackStats = `
        <span>Damage</span><span>${damageText(s)}</span>
        ${s.burst ? `<span>Burst</span><span>${s.burst} shots</span>` : ''}
        ${s.extra ? `<span>Extra targets</span><span>${s.extra} more in a cone</span>` : ''}
        ${s.targets ? `<span>Targets</span><span>Up to ${s.targets} at once</span>` : ''}
        ${s.beam ? `<span>Ice beam</span><span>Up to ${s.beam} zombies at once</span>` : ''}
        ${(s.missiles || []).map((m) => `<span>${m.name}</span><span>${missileText(m)}</span>`).join('')}
        ${def.pulse ? '<span>Pulse</span><span>Hits every zombie in range once</span>' : ''}
        ${sweeperOf(s) ? `<span>Sweeper</span><span>${sweeperOf(s).damage} dmg per pass, spins ${sweeperOf(s).duration}s</span>` : ''}
        ${s.pellets ? `<span>Pellets</span><span>${s.pellets}, each ${s.scatter ? `hits ${s.scatter} zombie${s.scatter > 1 ? 's' : ''}` : 'pierces 3 zombies'}</span>` : ''}
        ${s.poison ? `<span>Poison</span><span>${poisonText(s.poison)}</span>` : ''}
        ${s.hits ? `<span>Hits</span><span>Up to ${s.hits} zombies per spray</span>` : ''}
        ${s.chains ? `<span>Lightning</span><span>${chainText(s)}</span>` : ''}
        ${s.smite ? `<span>Smite</span><span>${smiteText(s.smite)}</span>` : ''}
        ${s.volley ? `<span>Volley</span><span>${s.volley} missiles, different targets</span>` : ''}
        ${isTrapper(s) ? `<span>${s.spike || s.bear ? 'Traps' : 'Mines'}</span><span>${trapText(s)}</span>` : ''}
        ${s.minRange ?? def.minRange ? `<span>Deadzone</span><span>Can't hit zombies within ${s.minRange ?? def.minRange}</span>` : ''}
        ${s.rail ? `<span>Railgun</span><span>${railText(s.rail)}</span>` : ''}
        ${s.bubble ? `<span>Bubbles</span><span>${bubbleText(s.bubble)}</span>` : ''}
        ${s.companion ? `<span>Companion</span><span>${companionText(s.companion)}</span>` : ''}
        ${s.chop ? `<span>Axe Attack</span><span>${chopText(s.chop)}</span>` : ''}
        ${s.throws > 1 ? `<span>Firecrackers</span><span>${s.throws} per throw, at different zombies</span>` : ''}
        ${s.pen ? `<span>${s.pen.ricochet ? 'Ricochet' : 'Pierce'}</span><span>${penText(s)}</span>` : ''}
        ${procText(s) ? `<span>Special</span><span>${procText(s)}</span>` : ''}
        ${s.pass ? `<span>Pierce</span><span>${s.pass} more zombie${s.pass > 1 ? 's' : ''} behind its target</span>` : ''}
        ${def.parry ? `<span>Parry</span><span class="yes">Blocks stuns, then pauses ${def.parry}s</span>` : ''}
        ${s.fireAspect ? `<span>Fire Aspect</span><span>${fireAspectText(s.fireAspect)}</span>` : ''}
        ${s.bleed ? `<span>Bleed</span><span>${bleedText(s.bleed, def.bleedFx)}</span>` : ''}
        ${s.bees ? `<span>Bee stings</span><span>${beesText(s.bees)}</span>` : ''}
        ${wave8Rows(s)}
        ${s.axe ? `<span>Axe</span><span>${axeText(s.axe)}</span>` : ''}
        ${s.bounce ? `<span>Bounce</span><span>Hits ${s.bounce.hits} zombies (jumps up to ${s.bounce.jump})</span>` : ''}
        ${s.arrows ? `<span>Arrow types</span><span>Normal, ${arrowsText(s.arrows)}</span>` : ''}
        ${s.bombs ? Object.entries(s.bombs).map(([k, b]) => `<span>${{ fire: 'Fire', ice: 'Ice', poison: 'Poison', confuse: 'Confusion' }[k]} bomb</span><span>${bombTypeText(k, b)}</span>`).join('') : ''}
        ${s.element ? `<span>Element</span><span><b>${def.choices[chosen[0]]}</b>: ${chosen[0] === 'frost' ? chillText(s.element.frost) : `burns ${s.element.fire.dps}/s for ${s.element.fire.time}s`}</span>` : ''}
        ${s.sword ? `<span>Sword</span><span>${swordText(s.sword)}</span>` : ''}
        ${s.knock ? `<span>Knockback</span><span>${s.knock}</span>` : ''}
        ${s.chillDps ? `<span>Frostbite</span><span>Slowed zombies take ${s.chillDps} dmg/s</span>` : ''}
        ${s.spot ? `<span>Spotlight</span><span>Radius ${s.spot.radius}, ${Math.round(s.spot.edge * 100)}% damage at the edge${s.spot.reveal ? ', reveals hidden zombies' : ''}</span>` : ''}
        ${s.spot?.confuse ? `<span>Confusion</span><span>After ${s.spot.confuse.charge.toLocaleString()} dmg: confuses the light for ${s.spot.confuse.time}s (${s.spot.confuse.cd}s cooldown)</span>` : ''}
        ${s.ignite && (s.spot || def.fly) ? `<span>Burn</span><span>${s.ignite.dps}/s for ${s.ignite.time}s</span>` : ''}
        ${s.star ? `<span>Star beam</span><span>${starText(s.star)}, ignores armor</span>${s.star.stun ? `<span>Stun</span><span>${s.star.stun}s${s.star.stunBoss ? ', bosses too' : ' (not bosses)'}</span>` : ''}${s.star.extra ? `<span>Extra blasts</span><span>${s.star.extra} more zombies per shot</span>` : ''}<span>Batteries</span><span>${Math.round(s.star.battery * 100)}% of kills: +${Math.round(GAME.starBattery * 100)}% charge</span>` : ''}
        ${s.melt && s.burn == null ? `<span>Armor melt</span><span>${Math.round(s.melt * 100)}% per hit</span>` : ''}
        ${s.iceBreak ? `<span>Ice Breaker</span><span>×${s.iceBreak} damage to chilled or frozen zombies</span>` : ''}
        ${s.aftershock ? `<span>Aftershock</span><span>${aftershockText(s.aftershock)}</span>` : ''}
        ${def.aim ? `<span>Aiming</span><span>${def.aim}s before the first shot</span>` : ''}
        ${s.aimShot ? `<span>Aiming</span><span>${s.aimShot}s before every shot</span>` : ''}
        ${s.rev ? `<span>Rev-up</span><span>${s.rev}s before it fires</span>` : ''}
        ${s.radio ? `<span>Radio</span><span>${radioText(s.radio)}</span>` : ''}
        ${s.pierce ? `<span>Pierce</span><span>${s.pierce} zombies${s.rangs > 1 ? ` × ${s.rangs} boomerangs` : ''}</span>` : ''}
        ${s.slime ? `<span>Slime</span><span>${slimeText(s.slime)}</span>` : ''}
        ${s.chill ? `<span>Chill</span><span>${chillText(s)}</span>` : ''}
        ${s.m203 ? `<span>${m203Name(s.m203)}</span><span>${m203Text(s.m203)}</span>` : ''}
        ${s.whirl ? `<span>Whirlwind</span><span>${whirlText(s.whirl)}</span>` : ''}
        ${s.combo ? `<span>Combo</span><span>${comboText(s.combo)}</span>` : ''}
        ${s.fan ? `<span>Fan of Knives</span><span>${fanText(s.fan)}</span>` : ''}
        ${s.cash ? `<span>Cash shot</span><span class="yes">${cashText(s.cash)}</span>` : ''}
        ${s.goons ? `<span>Goons</span><span>${goonText(s.goons)}, stops shooting ${def.callPause}s per call</span>` : ''}
        ${s.stack ? `<span>Stacking</span><span>+${Math.round(s.stack.per * 100)}% per hit in a row on one zombie, up to +${Math.round(s.stack.max * 100)}%</span>` : ''}
        ${s.souls ? `<span>Gravestones</span><span>${graveText(s)}</span>` : ''}
        ${s.raise ? s.raise.map((pool, i) => `<span>Lv ${i + 1} grave</span><span>Summons ${poolText(pool)}${s.boomLvl && i + 1 >= s.boomLvl ? `, explodes for ${s.boom.damage}` : ''}</span>`).join('') : ''}
        ${s.scrap ? `<span>Sentries</span><span>Up to ${s.sentries}, 1 per ${s.scrap} shots (${s.build}s to build, within ${s.buildRange})</span><span>Sentry</span><span>${sentryText(s)}, loses ${s.sentry.decay} HP/s</span>` : ''}
        ${s.synapses ? `<span>Synapses</span><span>Hits ${s.synapses} zombie${s.synapses > 1 ? 's' : ''} at once</span><span>Slowness</span><span>${Math.round(s.slow * 1000) / 10}% (not bosses)</span><span>Wire Fraud</span><span class="yes">+${Math.round(s.fraud * 1000) / 10}% cash for everyone</span><span>Holograms</span><span>Max health^${s.ev}, ram zombies (up to ${s.units}, not bosses)</span>` : ''}
        ${cloneText(s) ? `<span>Clones</span><span>${cloneText(s)}</span>` : ''}
        ${s.overcharge ? `<span>Charge-up</span><span>${s.charge}s with a zombie in range</span><span>Overcharge</span><span>Fires until it deals ${s.overcharge} damage</span><span>Cooldown</span><span>${s.cool}s after overcharging</span>` : ''}
        <span>${beam ? 'Tick' : s.overcharge ? 'Fires every' : s.burn != null ? 'Spray every' : def.melee ? 'Swing every' : def.traps ? 'Throws every' : 'Cooldown'}</span><span>${s.cooldown}s</span>
        ${s.radius ? `<span>Blast radius</span><span>${s.radius}</span>` : ''}
        ${s.freeze ? `<span>Freeze</span><span>${s.freeze}s</span>` : ''}
        ${s.crit ? `<span>Critical hit</span><span>${critText(s)}</span>` : ''}
        ${s.stun && !s.chains ? `<span>Stun</span><span>${s.stun}s per ${s.crit && !s.stunAll ? 'crit' : 'hit'}${s.stunTargets ? `, up to ${s.stunTargets} zombies` : ''}</span>` : ''}
        ${s.riot ? `<span>Riot shield</span><span class="yes">Blocks stuns, then ${s.riot.duration}s double damage</span>` : ''}
        ${s.burn != null ? `<span>Burn</span><span>${s.burn}/s for ${s.burnTime}s${def.burnSlow ? `, ${Math.round(def.burnSlow * 100)}% slow` : ''}</span>` : ''}
        ${beam ? `<span>Full charge</span><span>${s.ramp}s on one target</span>` : ''}
        <span>${def.orbit || def.heli ? 'Gun range' : 'Range'}</span><span>${range}</span>
        ${s.patrol ? `<span>Patrol zone</span><span>${s.patrol} (Patrol ability moves it)</span>` : ''}
        ${facesCone(def) ? `<span>Cone</span><span>${Math.round((s.cone * 360) / Math.PI)}° wide, facing where it was placed</span>` : ''}
        ${s.ammo ? `<span>Ammo</span><span class="p-ammo"></span><span>Reload</span><span>${s.reload}s</span>` : ''}
        ${def.fps ? `<span>FPS Mode</span><span class="yes">×${def.fps.mult} damage, pierces ${def.fps.pierce} (DPS ${Math.round(dpsValue(s) * def.fps.mult * 10) / 10})</span>` : ''}
        <span>DPS</span><span>${dps}</span>
        ${s.bomb ? `<span>Bombs</span><span>${bombText(s.bomb)}</span>` : ''}
        ${s.missile ? `<span>Missiles</span><span>${missileText(s.missile)}</span>` : ''}
        ${s.rockets ? `<span>Rockets</span><span>${s.rockets.damage} dmg every ${s.rockets.every}s, blast ${s.rockets.radius}</span>` : ''}
        ${s.android ? `<span>Sends</span><span class="${ctx.versus ? 'yes' : 'no'}">${ENEMIES[s.android.type].name} every ${s.android.every}s${ctx.versus ? '' : ' (Versus only)'}</span>` : ''}
        ${s.chip ? `<span>No Mercy</span><span class="${ctx.versus ? 'yes' : 'no'}">-${s.chip.damage} enemy base / ${s.chip.every}s${ctx.versus ? '' : ' (Versus only)'}</span>` : ''}`;
    this.el.panel.innerHTML = `
      <div class="p-head">
        <img src="${towerIcon(t.type, t.level) || (this.icons[t.type] ?? this.icons[rootType(t.type)])}" alt="">
        <div><div class="p-name">${def.name}</div><div class="p-sub">${def.cross ? `${def.cross.a}-${def.cross.b}` : `Lv ${t.level + 1}`} · ${s.name}${t.holo ? ' · Hologram' : ''}</div></div>
        <button class="btn p-close" data-action="close">✕</button>
      </div>
      ${owner}
      <div class="pips">${pips}</div>
      <div class="stats">
        ${kind ? this.kindStats(def, s, t) + wave8Rows(s) : attackStats}
        ${hiddenRow}
        ${boosted ? `<span>Boosted</span><span class="yes">${boosted}</span>` : ''}
        ${s.spy ? `<span>${def.orbit ? 'Spy ring' : 'Hidden aura'}</span><span class="yes">✔ Shares detection</span>` : ''}
        ${def.placement === 'cliff' ? `<span>Placement</span><span>Cliffs only</span>` : def.placement === 'water' ? `<span>Placement</span><span>Water only</span>` : ''}
        ${s.stunImmune ?? def.stunImmune ? `<span>Stuns</span><span class="yes">✔ Can't be stunned</span>` : ''}
        ${def.noRangeBuff ? `<span>Range boosts</span><span class="no">✘ Support towers can't boost its range</span>` : ''}
        ${def.rebuilds ? `<span>Rebuilds</span><span class="yes">Up to ${def.rebuilds}× when knocked out (${def.rebuildTime}s each)</span>` : ''}
        ${s.income && kind !== 'income' ? `<span>Income</span><span class="yes">+$${s.income} / wave</span>` : ''}
        ${s.shared ? `<span>Shared range</span><span class="yes">✔ All Tweeters</span>` : ''}
      </div>
      ${abilities}
      ${nextHtml}
      ${actions}
      <div class="p-record"></div>`;
    this.el.panel.classList.remove('hidden');
  }
}

// ---------------------------------------------------------------- wave 8 (crosspath towers)

const pct = (v) => `${Math.round((v || 0) * 100)}%`;
const kinText = (k) => [k.rate ? `+${pct(k.rate)} firerate (max ${pct(k.rateCap)})` : '', k.dmg ? `+${k.dmg} dmg (max ${k.dmgCap})` : '', k.range ? `+${pct(k.range)} range (max ${pct(k.rangeCap)})` : ''].filter(Boolean).join(', ');

/** Tower panel rows for the wave 8 mechanics (see crosstowers.js). */
function wave8Rows(s) {
  const row = (a, b, cls = '') => `<span>${a}</span><span${cls ? ` class="${cls}"` : ''}>${b}</span>`;
  const out = [];
  if (s.defPierce) out.push(row('Def. piercing', s.defPierce < 0 ? `${pct(s.defPierce)} (armor counts double)` : pct(s.defPierce), s.defPierce < 0 ? 'no' : 'yes'));
  if (s.hpScale) out.push(row('Damage', `${s.hpScale.min}-${s.hpScale.max} by target health (max from ${s.hpScale.at.toLocaleString()} HP)`));
  if (s.kin) out.push(row('Slinger boost', kinText(s.kin), 'yes'));
  if (s.near) out.push(row('Short range', `Within ${pct(s.near.within)} of its range: ${s.near.damage ? `${s.near.damage} dmg every ${s.near.cooldown}s` : 'splash'}${s.near.radius ? ` (blast ${s.near.radius})` : ''}`));
  if (s.heatRamp) out.push(row('Heat', `Fires faster as it heats up (to ${s.heatRamp.minCd}s)${s.heatRamp.dmg ? `, up to +${Math.round(s.heatRamp.dmg * 1000) / 10}% damage` : ''}`));
  if (s.ammo && s.reload && s.heatRamp == null && s.burst) out.push(row('Overheat', `After ${s.ammo} shots, cools down ${s.reload}s`));
  if (s.shieldMult) out.push(row('Shields', `${s.shieldMult}x damage to shielded zombies`, 'yes'));
  if (s.combine) out.push(row('Pellets', `${s.combine.hits} hits on one zombie → ${s.combine.damage} dmg blast`));
  if (s.cycle) out.push(row('Arrows', 'Cycle poison, fire and a 0.5s stun'));
  if (s.poacher) out.push(row('Poacher', `Blue fire on unburned, slows burning ones, ${s.poacher.boom.damage} dmg blast in crowds`));
  if (s.sentryCycle) out.push(row('Turrets', `${s.sentryCycle.map((x) => x.name).join(', ')}: one every ${s.buildEvery}s (up to ${s.sentries}), each lasts ${s.sentryCycle[0].life}s`));
  if (s.spike?.pool) out.push(row('Spikes', `${s.spike.pool} health each, ${s.spike.life ? `last ${s.spike.life}s` : 'last until used up'}, up to ${s.maxTraps}${s.shred ? `; ${s.shred.mult}x vs ${s.shred.over}+ HP zombies` : ''}${s.boom ? `; explode for ${s.boom.damage}` : ''}`));
  if (s.income && s.damage) out.push(row('Income', `$${s.income} every wave`, 'yes'));
  if (s.globalCdCut) out.push(row('Cooldowns', `All towers' abilities ${pct(s.globalCdCut)} faster (stacks to 30%)`, 'yes'));
  if (s.bizDisc) out.push(row('Discount', `Towers in range: ${pct(s.bizDisc.pct)} off tier 1-${s.bizDisc.tier} upgrades (stacks to ${pct(s.bizDisc.cap)})`, 'yes'));
  if (s.shared) out.push(row('Shared range', 'Also shoots inside other Businessmen\'s range', 'yes'));
  if (s.dmgAdd) out.push(row('Damage boost', `+${s.dmgAdd} damage to towers in range`, 'yes'));
  if (s.radar) out.push(row('Radar Drone', `+${pct(s.radar.boost)} range to towers within ${s.radar.radius} of it`, 'yes'));
  if (s.bank) out.push(row('Bank', `Holds up to $${s.bank.cap.toLocaleString()}, +${pct(s.bank.interest)} interest each wave`, 'yes'));
  if (s.maxUnits && s.unit?.air) out.push(row('Drones', `${s.unit.name} (${s.unit.life}s), up to ${s.maxUnits} out`));
  return out.join('');
}
