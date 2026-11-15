// The Enemy Journal (2026-11-15): every enemy whose spirit wisp you picked up (game/wisps.js), with
// its picture, stats and what makes it special. Opened from the main menu's 📖 Journal button.

import { DIFFICULTIES, ENEMIES } from './config.js';
import { enemyIcon } from './icons.js';
import { profile } from './profile.js';

const BOSS_KILLS = 3; // (game/wisps.js: a boss's wisp drops on this kill)

/** What each special enemy key means, in plain words. */
const SPECIALS = {
  slam: (v) => `Slams the ground, hurting and stunning towers within ${v.range}.`,
  axe: () => 'Throws axes at towers far away.',
  summon: (v) => [].concat(v).map((s) => `Calls in ${ENEMIES[s.type]?.name ?? 'helpers'} (${Array.isArray(s.n) ? s.n.join('-') : s.n}) every ${s.every}s.`).join(' '),
  deathSpawn: () => 'Lets out more enemies when it dies.',
  nuke: (v) => `Launches a nuke every ${v.every}s that knocks out every tower it lands on.`,
  shots: () => 'Shoots at towers.',
  slash: () => 'Slashes nearby towers.',
  dash: () => 'Dashes forward in bursts.',
  fly: () => 'Flies over the path for a while.',
  infect: () => 'Infects towers.',
  enrage: () => 'Gets angry and fast when hurt.',
  stomp: () => 'Stomps, stunning towers.',
  beam: () => 'Fires a beam at towers.',
  barrage: () => 'Fires a missile barrage.',
  smog: () => 'Leaves poison clouds behind.',
  multiply: () => 'Copies the enemies around it.',
  blast: () => 'Stuns towers near it when it dies.',
  rewind: () => 'Goes back to the start instead of entering the base.',
  drain: (v) => `Drains $${v} from every player each second.`,
  mAttacks: () => 'Has timed attacks on towers.',
  hurtSummon: () => 'Enemies burst out of it as it gets hurt.',
  regen: () => 'Heals over time.',
};

/** Enemies grouped by the first mode whose waves bring them; the rest under "Other". */
function groups() {
  const out = [];
  const used = new Set();
  for (const [k, d] of Object.entries(DIFFICULTIES)) {
    const lists = [[d.name, d.waves], ...Object.entries(d.mapModes ?? {}).map(([m, v]) => [`${d.name}: ${m[0].toUpperCase()}${m.slice(1)}`, v.waves])];
    for (const [name, waves] of lists) {
      const types = [];
      for (const w of waves ?? []) for (const g of w.groups ?? []) if (ENEMIES[g[0]] && !used.has(g[0])) used.add(g[0]), types.push(g[0]);
      if (d.sandbox) for (const t of ['sbImperfect', 'sbKing']) if (!used.has(t)) used.add(t), types.push(t);
      if (types.length) out.push({ name, types, key: k });
    }
  }
  const rest = Object.keys(ENEMIES).filter((t) => !used.has(t) && !ENEMIES[t].dummy);
  if (rest.length) out.push({ name: 'Other', types: rest });
  return out;
}

const pct = (v) => `${Math.round(v * 100)}%`;
const big = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : `${n}`);

export class Journal {
  constructor() {
    this.groups = null;
  }

  open() {
    this.groups ??= groups();
    const el = (this.el = document.createElement('div'));
    el.id = 'journal';
    el.className = 'overlay interactive';
    const total = this.groups.reduce((n, g) => n + g.types.length, 0);
    const seen = this.groups.reduce((n, g) => n + g.types.filter((t) => profile.knows(t)).length, 0);
    el.innerHTML = `<div class="jr-wrap">
      <div class="mp-header"><button class="btn jr-back">◀ Back</button><h2>📖 Enemy Journal</h2><span class="jr-count">${seen} / ${total} found</span></div>
      <p class="jr-hint">Killed enemies sometimes drop a glowing spirit wisp. Walk into it (or click it) to add the enemy here. Your 3rd kill of a boss always drops a big red boss wisp.</p>
      <div class="jr-body"><div class="jr-list">${this.groups.map((g) => `<h3>${g.name} <small>${g.types.filter((t) => profile.knows(t)).length}/${g.types.length}</small></h3>
        <div class="jr-grid">${g.types.map((t) => this.card(t)).join('')}</div>`).join('')}</div>
      <div class="jr-detail"><div class="jr-empty">Pick an enemy you have found.</div></div></div></div>`;
    document.body.appendChild(el);
    el.querySelector('.jr-back').onclick = () => this.close();
    el.querySelector('.jr-list').onclick = (e) => {
      const c = e.target.closest('[data-t]');
      if (c && profile.knows(c.dataset.t)) this.detail(c.dataset.t);
    };
    // Pictures are drawn a few per frame, only for enemies you have found.
    this.queue = [...el.querySelectorAll('img[data-icon]')];
    const step = () => {
      if (!this.el) return;
      const end = performance.now() + 12;
      while (this.queue.length && performance.now() < end) {
        const img = this.queue.shift();
        img.src = enemyIcon(img.dataset.icon, 128);
      }
      if (this.queue.length) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  card(t) {
    const d = ENEMIES[t];
    if (profile.knows(t)) return `<div class="jr-card${d.boss ? ' boss' : ''}" data-t="${t}" title="${d.name}"><img data-icon="${t}" alt=""><span>${d.name}</span></div>`;
    const kills = d.boss ? profile.journal.bossKills[t] ?? 0 : 0;
    return `<div class="jr-card unknown${d.boss ? ' boss' : ''}"><b>?</b><span>${d.boss ? `Boss · ${Math.min(kills, BOSS_KILLS)}/${BOSS_KILLS} kills` : '???'}</span></div>`;
  }

  detail(t) {
    const d = ENEMIES[t];
    const rows = [
      ['Health', d.dummy ? '∞' : big(d.hp)],
      ['Speed', `${d.speed}`],
      ['Base damage', big(d.damage ?? 0)],
    ];
    if (d.armor) rows.push(['Armor', pct(d.armor)]);
    if (d.defense) rows.push(['Defense', `${d.defense} per hit`]);
    if (d.maxHit) rows.push(['Biggest hit it takes', big(d.maxHit)]);
    if (d.bulletResist) rows.push(['Bullet resist', pct(d.bulletResist)]);
    if (d.laserResist) rows.push(['Laser resist', pct(d.laserResist)]);
    if (d.iceResist) rows.push(['Ice resist', pct(d.iceResist)]);
    const traits = [
      [d.boss, 'Boss'], [d.hidden, 'Hidden'], [d.flying, 'Flying'], [d.lead, 'Lead'], [d.stunImmune, "Can't be stunned"],
      [d.freezeImmune, "Can't be frozen"], [d.fireImmune, "Can't burn"], [d.statusImmune, 'No status effects'], [d.pure, 'Every hit does 1'],
    ].filter(([on]) => on).map(([, n]) => `<span>${n}</span>`).join('');
    const special = Object.entries(SPECIALS).filter(([k]) => d[k]).map(([k, f]) => `<li>${f(d[k])}</li>`).join('');
    const kills = d.boss ? `<p class="jr-kills">You have beaten it ${profile.journal.bossKills[t] ?? 0} time${profile.journal.bossKills[t] === 1 ? '' : 's'}.</p>` : '';
    this.el.querySelector('.jr-detail').innerHTML = `<img class="jr-big" src="${enemyIcon(t, 256)}" alt="">
      <h3>${d.name}</h3>${traits ? `<div class="jr-traits">${traits}</div>` : ''}
      <table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>
      ${special ? `<h4>What it does</h4><ul>${special}</ul>` : ''}
      ${d.intro ? `<p class="jr-intro">${d.intro}</p>` : ''}${kills}`;
  }

  close() {
    cancelAnimationFrame(this.raf);
    this.el?.remove();
    this.el = null;
  }
}
