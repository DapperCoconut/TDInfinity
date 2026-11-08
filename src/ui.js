// In-game HUD. Reads plain session state; never mutates game state itself.
import { ENEMIES, GAME, TARGET_MODES, TOWERS, TRACKS, VERSUS, WAVES, detection } from './config.js';
import {
  abilityText, cloneText, hackText, ammoText, bombText, radioText, sweeperOf, boostText, buffText, cannonText, cashText, chainText, clusterText, rosterText, chillText, critText, damageText, detectText, dpsText, dpsValue, fanText, goonText, gunText, isBeam, limitText, missileText, slimeText,
  trapText, unitDps, unitName, whirlText, graveText, poolText, sentryText, overchargeText,
} from './stats.js';

const ABILITY_KEYS = 'FGH';
// Ability bar (bottom right): one key per ability group, in bar order.
const ABILITY_BAR_LABELS = 'ZCVRYUIOP';
export const ABILITY_BAR_KEYS = [...ABILITY_BAR_LABELS].map((c) => `Key${c}`);

const $ = (id) => document.getElementById(id);
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

/** "+340 credits (+1 Dimension Shard)" line on the end screen. */
function rewardText(credits, shards) {
  const shard = shards ? ` <span class="shard-text">+${shards} <i class="shard-icon"></i> Dimension Shard${shards === 1 ? '' : 's'}</span>` : '';
  return `+${credits} credits${shard} — spend them in the Loadout & Shop!`;
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
      scoreboard: $('scoreboard'),
      chatLog: $('chat-log'),
      chatInput: $('chat-input'),
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
    this.el.speed.onclick = handlers.onSpeed;
    this.el.mute.onclick = handlers.onMute;
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
  buildHotbar(icons, loadout, costOf = (type) => TOWERS[type].cost) {
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
      html += `<button class="slot" data-tower="${type}" title="${def.name} — ${def.blurb}">
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
              <img src="${this.icons[g.type] ?? ''}" alt="">
              <span class="ab-key">${ABILITY_BAR_LABELS[i] ?? ''}</span>
              <span class="ab-name">${esc(g.ab.name)}</span>
              <span class="ab-sub"></span>
              <span class="ab-cd"></span>
            </button>`)
          .join('')}`
        : '';
      bar.classList.toggle('hidden', !groups.length);
    }
    bar.classList.toggle('off', off);
    bar.querySelectorAll('[data-abar]').forEach((b) => {
      const g = groups[Number(b.dataset.abar)];
      if (!g) return;
      const n = g.towers.length;
      const sub = g.active > 0 ? `ON ${Math.ceil(g.active)}s`
        : `${n > 1 ? `${g.ready}/${n} ready` : g.ready ? 'Ready' : ''}${g.ab.cost ? ` · $${g.ab.cost.toLocaleString()}` : ''}`;
      const cd = g.ready ? '' : `${Math.ceil(g.cd)}s`;
      const subEl = b.querySelector('.ab-sub');
      const cdEl = b.querySelector('.ab-cd');
      if (subEl.textContent !== sub) subEl.textContent = sub;
      if (cdEl.textContent !== cd) cdEl.textContent = cd;
      // Cooldown sweep: how much of the soonest recharge is left.
      const left = g.ready ? 0 : Math.min(1, g.cd / (g.ab.cooldown || 1));
      b.style.setProperty('--cd', `${Math.round(left * 100)}%`);
      b.classList.toggle('waiting', !g.ready);
      b.classList.toggle('poor', !!g.ab.cost && cash < g.ab.cost);
      b.classList.toggle('live', g.active > 0);
    });
  }

  updateHotbar(cash, counts, placing, off = false) {
    this.el.hotbar.classList.toggle('off', off);
    this.el.hotbar.querySelectorAll('[data-tower]').forEach((b) => {
      const def = TOWERS[b.dataset.tower];
      b.classList.toggle('poor', cash < this.costOf(b.dataset.tower));
      b.classList.toggle('active', placing === b.dataset.tower);
      b.querySelector('.slot-count').textContent = `${counts[b.dataset.tower] || 0}/${limitText(def.limit)}`;
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

  setBase(hp) {
    const r = Math.max(0, hp / GAME.baseHp);
    this.el.baseFill.style.width = `${r * 100}%`;
    this.el.baseFill.style.background =
      r > 0.5 ? 'linear-gradient(#66bb6a,#388e3c)' : r > 0.25 ? 'linear-gradient(#ffca28,#f9a825)' : 'linear-gradient(#ef5350,#c62828)';
    this.el.baseText.textContent = `❤ ${Math.max(0, Math.ceil(hp))} / ${GAME.baseHp}`;
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
    else if (w.state === 'victory') status = 'Victory!';
    else if (w.state === 'defeat') status = 'The base has fallen!';
    this.el.waveStatus.textContent = status;
    // Between waves: start now. Once a wave has fully spawned: skip ahead to the next one.
    const showSkip = !spectating && (w.state === 'intermission' || (w.state === 'wave' && w.canSkip));
    this.el.skip.classList.toggle('hidden', !showSkip);
    if (showSkip) {
      const label = w.state === 'wave' ? 'Skip Wave ⏭' : w.index === 0 ? 'Start Wave ▶' : 'Skip ▶';
      this.el.skip.textContent = mp ? `${label} ${w.votes}/${st.votesNeeded}` : label;
    }
  }

  setSpeed(speed, canChange) {
    this.el.speed.textContent = `${speed}x`;
    this.el.speed.disabled = !canChange;
    this.el.speed.title = canChange ? 'Game speed' : 'Only the host can change speed';
  }

  setMuted(m) {
    this.el.mute.textContent = m ? 'Sound: Off' : 'Sound: On';
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

  toast(msg, ms = 1800) {
    const t = this.el.toast;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('show'), ms);
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

  showEnd(win, waveNum, mp, credits, shards = 0, total = WAVES.length, mode = 'zombies') {
    this.el.end.classList.remove('hidden');
    $('end-title').innerHTML = win ? 'VICTORY<span>!</span>' : 'DEFEAT';
    const foes = mode === 'easy' ? 'monsters' : 'zombies';
    $('end-sub').textContent = win ? `You survived all ${total} waves!` : `The ${foes} broke through on wave ${waveNum}.`;
    $('end-credits').innerHTML = rewardText(credits, shards);
    $('end-primary').textContent = mp ? 'Back to Room' : 'Play Again';
    $('end-secondary').classList.toggle('hidden', mp);
  }

  showVersusEnd(place, winnerName, wave, credits, shards = 0) {
    this.el.end.classList.remove('hidden');
    const ord = ['', '1st', '2nd', '3rd', '4th'][place] ?? `#${place}`;
    $('end-title').innerHTML = place === 1 ? 'VICTORY<span>!</span>' : `${ord.toUpperCase()} PLACE`;
    $('end-sub').textContent = place === 1 ? `You outlasted everyone! (wave ${wave})` : `Your base fell on wave ${wave}. ${winnerName} won the battle.`;
    $('end-credits').innerHTML = rewardText(credits, shards);
    $('end-primary').textContent = 'Back to Room';
    $('end-secondary').classList.add('hidden');
  }

  hidePanel() {
    this.el.panel.classList.add('hidden');
    this.panelKey = '';
  }

  /** Re-renders the tower panel only when something structural changes, so clicks aren't lost. */
  updatePanel(t, ctx) {
    if (!t) return this.hidePanel();
    const def = TOWERS[t.type];
    const next = def.levels[t.level + 1];
    const mine = t.owner === ctx.myId;
    const key = [t.id, t.type, t.level, !!t.holo, t.targetMode, t.track, next ? `${ctx.upCost}:${ctx.cash >= ctx.upCost}:${ctx.upCostB}:${ctx.cash >= ctx.upCostB}` : '-', t.spent, mine, ctx.ownerName, ctx.borrowed, buffText(ctx.buff)].join('|');
    if (key !== this.panelKey) {
      this.panelKey = key;
      this.renderPanel(t, def, next, mine, ctx);
    }
    const s = def.levels[t.level];
    const c = t.charge || 0;
    const charge = isBeam(s) ? ` · Charge: ${Math.round(c * 100)}%`
      : s.souls ? ` · Souls: ${Math.round(c * s.souls)}/${s.souls}`
      : s.scrap ? ` · Scrap: ${Math.round(c * s.scrap)}/${s.scrap}`
      : t.holo ? ` · Hologram: ${Math.ceil(t.holo)}s left`
      : s.overcharge ? (c < 0 ? ' · Cooling down' : t.lock ? ` · Firing (${Math.round(c * 100)}% left)` : ` · Charging ${Math.round(c * 100)}%`)
      : '';
    const rec =
      def.kind === 'income' ? `Earns $${s.income} every wave`
      : def.kind === 'support' && !s.damage ? `${s.shields ? 'Shielding' : 'Boosting'} ${ctx.boosting} tower${ctx.boosting === 1 ? '' : 's'}`
      : `Kills: ${t.kills} · Damage dealt: ${Math.round(t.damageDealt)}${charge}`;
    this.el.panel.querySelector('.p-record').textContent = rec;
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
      const live = (ab.key === 'cta' || ab.key === 'uber') && t.active > 0 ? ` – ON ${Math.ceil(t.active)}s`
        : ab.key === 'fps' && t.manual ? ' – ON'
        : ab.key === 'track' ? ` – ${TRACKS[t.track || 0].name}` : '';
      const label = cd > 0 ? `${ab.name} (${cd}s)${live}` : `${ab.name}${ab.cost ? ` $${ab.cost.toLocaleString()}` : ''} (${ABILITY_KEYS[i]})`;
      if (b.textContent !== label) b.textContent = label;
      const off = !mine || cd > 0 || (ab.cost && ctx.cash < ab.cost) || (ab.versus && !ctx.versus);
      if (b.disabled !== !!off) b.disabled = !!off;
    });
  }

  /** Stats rows for towers that don't attack on their own (spawners, income, support). */
  kindStats(def, s, t) {
    const rows = [];
    const row = (k, v, cls = '') => rows.push(`<span>${k}</span><span class="${cls}">${v}</span>`);
    if (def.kind === 'income') row('Income', `+$${s.income} / wave`, 'yes');
    if (def.kind === 'spawner' && s.roster) {
      // Mercenary Base: several kinds of units, trained in queues.
      for (const r of s.roster) row(r.unit.name, `${rosterText(r).slice(r.unit.name.length + 2)}`);
      row('Queues', `${s.queues} unit${s.queues > 1 ? 's' : ''} trained at once`);
      if (s.aura) {
        row('Boost range', s.aura);
        row('Boosts', boostText(s), 'yes');
      }
    } else if (def.kind === 'spawner') {
      const u = s.unit;
      row('Sends', unitName(u));
      row('Every', `${s.spawnEvery ?? def.spawnEvery}s of wave time${def.maxUnits ? ` (max ${def.maxUnits} out)` : ''}`);
      if (u.ram) row('Rams', 'Crashes into zombies');
      if (u.gun) row('Gun', `${gunText(u.gun)}, range ${u.gun.range}`);
      if (u.cannon) row('Cannon', cannonText(u.cannon));
      if (u.explode) row('Explodes', `${u.explode.damage} dmg when destroyed`);
      row('DPS', `${unitDps(u, s.spawnEvery ?? def.spawnEvery)}`);
    }
    if (def.kind === 'support') {
      row(s.shields ? 'Shield range' : 'Boost range', s.aura);
      row(s.shields ? 'Shields' : 'Boosts', boostText(s), 'yes');
      if (s.tracks) {
        const tr = TRACKS[t.track || 0];
        row('Playing', `<b style="color:${tr.css}">${tr.name}</b>${s.offTrack ? ' (full), others at half' : ''}`);
      }
      if (s.damage) row('Shoots', `${s.damage} dmg every ${s.cooldown}s, ${def.fury ? `only for ${def.fury}s after an ability` : 'only during Call to Arms'}`);
    }
    return rows.join('');
  }

  renderPanel(t, def, next, mine, ctx) {
    const s = def.levels[t.level];
    const kind = def.kind;
    const sellValue = Math.floor(t.spent * GAME.sellRatio);
    const pips = def.levels.map((_, i) => `<div class="pip ${i <= t.level ? 'on' : ''}"></div>`).join('');
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
        if ((next.stun || 0) !== (s.stun || 0) && !s.chains) diffs.push(s.stun ? `Stun ${s.stun}s → ${next.stun}s` : `+ Every hit stuns for ${next.stun}s`);
        if (critText(next) !== critText(s)) diffs.push(`Critical hit: ${critText(next)}`);
        if (next.stunAll && !s.stunAll) diffs.push('+ Every hit stuns');
        if (next.riot && !s.riot) diffs.push(`+ Riot shield: blocks stuns, then ${next.riot.duration}s of double damage`);
        if (next.burnTime !== s.burnTime) diffs.push(`Burn time ${s.burnTime}s → ${next.burnTime}s`);
        if (next.cone !== s.cone) diffs.push(s.pellets ? '+ Wider spread' : def.fps ? '+ Wider cone' : '+ Wider flames');
        if (ammoText(next) !== ammoText(s)) diffs.push(`Ammo: ${ammoText(s)} → ${ammoText(next)}`);
        if (next.patrol !== s.patrol) diffs.push(`Patrol zone ${s.patrol} → ${next.patrol}`);
        if ((next.pellets || 0) !== (s.pellets || 0)) diffs.push(`Pellets ${s.pellets} → ${next.pellets}`);
        if ((next.hits || 0) !== (s.hits || 0)) diffs.push(`Hits ${s.hits} → ${next.hits} zombies per spray`);
        if (chainText(next) !== chainText(s)) diffs.push(`Lightning: ${chainText(next)}`);
        if ((next.volley || 0) !== (s.volley || 0)) diffs.push(`+ Fires ${next.volley} missiles at once`);
        if (trapText(next) !== trapText(s)) diffs.push(`Traps: ${trapText(next)}`);
        if (next.cooldown !== s.cooldown) diffs.push(`${beam ? 'Tick' : 'Cooldown'} ${s.cooldown}s → ${next.cooldown}s`);
        if (next.range !== s.range) diffs.push(`Range ${s.range} → ${next.range}`);
        if (goonText(next.goons) !== goonText(s.goons)) diffs.push(`Goons: ${goonText(next.goons)}`);
        if ((next.income || 0) !== (s.income || 0)) diffs.push(`+ $${next.income} every wave`);
        if (next.shared && !s.shared) diffs.push('+ Shoots in range of every Tweeter');
        if (next.spy && !s.spy) diffs.push('+ Shares hidden detection inside its ring');
        if (bombText(next.bomb) !== bombText(s.bomb)) diffs.push(`Bombs: ${bombText(next.bomb)}`);
        if (missileText(next.missile) !== missileText(s.missile)) diffs.push(`Missiles: ${missileText(next.missile)}`);
        if ((next.extra || 0) !== (s.extra || 0)) diffs.push(`Extra targets ${s.extra} → ${next.extra}`);
        if ((next.targets || 0) !== (s.targets || 0)) diffs.push(`Targets ${s.targets} → ${next.targets}`);
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
        if (whirlText(next.whirl) !== whirlText(s.whirl)) diffs.push(`Whirlwind: ${whirlText(next.whirl)}`);
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
        if (gunText(a.gun) !== gunText(b.gun) || a.gun?.range !== b.gun?.range) diffs.push(`Gun: ${b.gun ? `${gunText(b.gun)}, range ${b.gun.range}` : 'none'}`);
        if (cannonText(a.cannon) !== cannonText(b.cannon)) diffs.push(`Cannon: ${cannonText(b.cannon)}`);
        if (b.explode && !a.explode) diffs.push(`+ Explodes for ${b.explode.damage} dmg`);
        if (next.spawnNow) diffs.push('+ Sends the new unit right away');
      }
      if (kind !== 'income' && !(kind === 'support' && !next.damage)) {
        const d0 = detection(t.type, t.level);
        const d1 = detection(nextType, t.level + 1);
        for (const k of ['hidden', 'flying', 'lead']) if (d1[k] && !d0[k]) diffs.push(`+ ${k[0].toUpperCase() + k.slice(1)} detection`);
      }
      const key = action === 'upgrade' ? ' <small>(E)</small>' : '';
      return `<div class="next">
        <div class="next-title">${pathTag ? `<span class="path-tag">${pathTag}</span> ` : ''}Lv ${t.level + 2} – ${next.name}</div>
        <div class="next-desc">${next.desc}</div>
        <div class="diff">${diffs.join('<br>')}</div>
        ${mine ? `<button class="btn green" data-action="${action}" ${ctx.cash < upCost ? 'disabled' : ''}>Upgrade $${upCost.toLocaleString()}${upCost < next.cost ? ` <s>$${next.cost.toLocaleString()}</s>` : ''}${key}</button>` : ''}
      </div>`;
    };
    if (t.holo) nextHtml = '<div class="maxed">Hologram: can\'t be upgraded</div>';
    else if (next) {
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
    const actions = mine
      ? `${targets ? `<div class="p-row"><button class="btn blue" data-action="target">Target: ${TARGET_MODES[t.targetMode]} <small>(T)</small></button></div>` : ''}
         <div class="p-row"><button class="btn red" data-action="sell">${t.holo ? 'Remove hologram' : `Sell $${sellValue}`} <small>(X)</small></button></div>`
      : targets ? `<div class="p-row"><span class="p-target">Target: ${TARGET_MODES[t.targetMode]}</span></div>` : '';
    const boosted = buffText(ctx.buff);
    const det = detection(t.type, t.level);
    const borrowed = !det.hidden && ctx.borrowed && !kind;
    const mark = (yes, label, note = '') => `<span class="${yes ? 'yes' : 'no'}">${yes ? '✔' : '✘'} ${label}${note}</span>`;
    const hiddenRow = kind === 'income' || (kind === 'support' && !s.damage)
      ? ''
      : `<span>Detection</span><span>${mark(det.hidden || borrowed, 'Hidden', borrowed ? ' (Aviator)' : '')} ${mark(det.flying, 'Flying')} ${mark(det.lead, 'Lead')}</span>`;
    const range = ctx.buff && ctx.buff.range > 1 ? `${Math.round(s.range * ctx.buff.range * 100) / 100} <small>(${s.range} base)</small>` : s.range;
    const attackStats = `
        <span>Damage</span><span>${damageText(s)}</span>
        ${s.burst ? `<span>Burst</span><span>${s.burst} shots</span>` : ''}
        ${s.extra ? `<span>Extra targets</span><span>${s.extra} more in a cone</span>` : ''}
        ${s.targets ? `<span>Targets</span><span>Up to ${s.targets} at once</span>` : ''}
        ${def.pulse ? '<span>Pulse</span><span>Hits every zombie in range once</span>' : ''}
        ${sweeperOf(s) ? `<span>Sweeper</span><span>${sweeperOf(s).damage} dmg per pass, spins ${sweeperOf(s).duration}s</span>` : ''}
        ${s.pellets ? `<span>Pellets</span><span>${s.pellets}, each pierces 3 zombies</span>` : ''}
        ${s.hits ? `<span>Hits</span><span>Up to ${s.hits} zombies per spray</span>` : ''}
        ${s.chains ? `<span>Lightning</span><span>${chainText(s)}</span>` : ''}
        ${s.volley ? `<span>Volley</span><span>${s.volley} missiles, different targets</span>` : ''}
        ${s.spike ? `<span>Traps</span><span>${trapText(s)}</span>` : ''}
        ${def.minRange ? `<span>Deadzone</span><span>Can't hit zombies within ${def.minRange}</span>` : ''}
        ${def.aim ? `<span>Aiming</span><span>${def.aim}s before the first shot</span>` : ''}
        ${s.rev ? `<span>Rev-up</span><span>${s.rev}s before it fires</span>` : ''}
        ${s.radio ? `<span>Radio</span><span>${radioText(s.radio)}</span>` : ''}
        ${s.pierce ? `<span>Pierce</span><span>${s.pierce} zombies${s.rangs > 1 ? ` × ${s.rangs} boomerangs` : ''}</span>` : ''}
        ${s.slime ? `<span>Slime</span><span>${slimeText(s.slime)}</span>` : ''}
        ${s.chill ? `<span>Chill</span><span>${chillText(s)}</span>` : ''}
        ${s.whirl ? `<span>Whirlwind</span><span>${whirlText(s.whirl)}</span>` : ''}
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
        ${s.stun && !s.chains ? `<span>Stun</span><span>${s.stun}s per ${s.crit && !s.stunAll ? 'crit' : 'hit'}</span>` : ''}
        ${s.riot ? `<span>Riot shield</span><span class="yes">Blocks stuns, then ${s.riot.duration}s double damage</span>` : ''}
        ${s.burn != null ? `<span>Burn</span><span>${s.burn}/s for ${s.burnTime}s${def.burnSlow ? `, ${Math.round(def.burnSlow * 100)}% slow` : ''}</span>` : ''}
        ${beam ? `<span>Full charge</span><span>${s.ramp}s on one target</span>` : ''}
        <span>${def.orbit || def.heli ? 'Gun range' : 'Range'}</span><span>${range}</span>
        ${s.patrol ? `<span>Patrol zone</span><span>${s.patrol} (Patrol ability moves it)</span>` : ''}
        ${def.fps ? `<span>Cone</span><span>${Math.round((s.cone * 360) / Math.PI)}° wide, facing where it was placed</span>` : ''}
        ${s.ammo ? `<span>Ammo</span><span class="p-ammo"></span><span>Reload</span><span>${s.reload}s</span>` : ''}
        ${def.fps ? `<span>FPS Mode</span><span class="yes">×${def.fps.mult} damage, pierces ${def.fps.pierce} (DPS ${Math.round(dpsValue(s) * def.fps.mult * 10) / 10})</span>` : ''}
        <span>DPS</span><span>${dps}</span>
        ${s.bomb ? `<span>Bombs</span><span>${bombText(s.bomb)}</span>` : ''}
        ${s.missile ? `<span>Missiles</span><span>${missileText(s.missile)}</span>` : ''}
        ${s.android ? `<span>Sends</span><span class="${ctx.versus ? 'yes' : 'no'}">${ENEMIES[s.android.type].name} every ${s.android.every}s${ctx.versus ? '' : ' (Versus only)'}</span>` : ''}
        ${s.chip ? `<span>No Mercy</span><span class="${ctx.versus ? 'yes' : 'no'}">-${s.chip.damage} enemy base / ${s.chip.every}s${ctx.versus ? '' : ' (Versus only)'}</span>` : ''}`;
    this.el.panel.innerHTML = `
      <div class="p-head">
        <img src="${this.icons[t.type]}" alt="">
        <div><div class="p-name">${def.name}</div><div class="p-sub">Lv ${t.level + 1} · ${s.name}${t.holo ? ' · Hologram' : ''}</div></div>
        <button class="btn p-close" data-action="close">✕</button>
      </div>
      ${owner}
      <div class="pips">${pips}</div>
      <div class="stats">
        ${kind ? this.kindStats(def, s, t) : attackStats}
        ${hiddenRow}
        ${boosted ? `<span>Boosted</span><span class="yes">${boosted}</span>` : ''}
        ${s.spy ? `<span>Spy ring</span><span class="yes">✔ Shares detection</span>` : ''}
        ${def.placement === 'cliff' ? `<span>Placement</span><span>Cliffs only</span>` : ''}
        ${def.stunImmune ? `<span>Stuns</span><span class="yes">✔ Can't be stunned</span>` : ''}
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
