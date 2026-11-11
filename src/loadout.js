// Loadout & shop screen: browse every tower, spin a live 3D preview through each upgrade level,
// read its stats, buy locked towers with credits and equip them. The Variants menu picks which
// version of a tower you play: alternate forms (Dimension Shards), golden perks (credits) and
// evolutions (unlocked with tower XP, then credits + shards).
import * as THREE from 'three';
import { BASE_TOWERS, EVENT_TOWERS, GAME, TOWERS, detection, formsOf, goldOf, xpKey } from './config.js';
import { TOWER_MODELS } from './models.js';
import { PAD_COLORS, driftFx } from './views.js';
import { profile } from './profile.js';
import { audio } from './audio.js';
import { damageText, detectText, dpsText, dpsValue, extrasText, isNonAttacker, limitRange, towerKind } from './stats.js';
import { towerIcon } from './icons.js';
import { blurbHtml, descHtml } from './text.js';

// Shop order: cheapest to most expensive. Credit towers by price (free ones first), then shard
// towers (fewest shards first), then Gem towers last; ties keep their config order.
const SHOP_ORDER = [...BASE_TOWERS].sort((a, b) => {
  const A = TOWERS[a], B = TOWERS[b];
  return (A.gems ? 1 : 0) - (B.gems ? 1 : 0) || (A.shards || 0) - (B.shards || 0) || (A.gems || 0) - (B.gems || 0) || (A.price || 0) - (B.price || 0);
});

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
const num = (n) => (n === Infinity ? '∞' : n.toLocaleString());
export const SHARD = '<i class="shard-icon"></i>';
export const GEM = '<i class="gem-icon"></i>';
const AUTO_EVERY = 1.6; // seconds per level while playing
const FIRE_EVERY = 1.1; // seconds between pretend shots in the preview

const padGeo = new THREE.CylinderGeometry(1.9, 2.1, 0.4, 20);
const flashGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);

export class LoadoutScreen {
  constructor(lobby) {
    this.lobby = lobby;
    this.base = profile.loadout[0] || BASE_TOWERS[0];
    this.form = profile.formOf(this.base);
    this.gold = this.goldUsed(this.form); // showing the golden perk version of this form
    this.level = 0;
    this.auto = false; // Play: the turntable spins and steps through every level; Stop freezes it
    this.variantsOpen = false;
    this.autoT = 0;
    this.open = false;
    this.three = null; // created on first open

    $('lo-back').onclick = () => lobby.show('title');
    $('lo-grid').addEventListener('click', (e) => {
      const b = e.target.closest('[data-pick]');
      if (b) this.select(b.dataset.pick);
    });
    $('lo-events').addEventListener('click', (e) => {
      const b = e.target.closest('[data-pick]');
      if (b) this.select(b.dataset.pick);
    });
    $('lo-slots').addEventListener('click', (e) => {
      const b = e.target.closest('[data-pick]');
      if (b) this.select(b.dataset.pick);
    });
    $('lo-levels').addEventListener('click', (e) => {
      const p = e.target.closest('[data-path]');
      if (p) return this.setForm(p.dataset.path);
      const b = e.target.closest('[data-lv]');
      if (b?.dataset.lv === 'auto') {
        this.auto = !this.auto;
        this.autoT = 0;
        this.renderLevels();
      } else if (b) this.setLevel(Number(b.dataset.lv), true);
    });
    $('lo-info').addEventListener('click', (e) => this.onInfoClick(e));
    $('lo-variants').addEventListener('click', (e) => this.onVariantClick(e));
    window.addEventListener('keydown', (e) => {
      if (!this.open || e.target.tagName === 'INPUT') return;
      if (e.key === 'Escape' && this.variantsOpen) return this.showVariants(false);
      if (e.key === 'ArrowRight') this.setLevel(Math.min(TOWERS[this.shown].levels.length - 1, this.level + 1), true);
      if (e.key === 'ArrowLeft') this.setLevel(Math.max(0, this.level - 1), true);
    });
  }

  // ------------------------------------------------------------------ state

  /** The type being shown: the selected form, or its golden perk when the Golden tab is on. */
  get shown() {
    if (!this.gold) return this.form;
    // A form shown on its Bottom path: the golden perk's Bottom path, if the perk has paths too.
    const fd = TOWERS[this.form];
    const g = goldOf(fd.branchOf ?? this.form);
    if (!g) return this.form;
    return fd.branchOf && TOWERS[g].branch ? TOWERS[g].branch : g;
  }

  /** Is the golden perk of form `type` owned and switched on? */
  goldUsed(type) {
    const g = goldOf(type);
    return !!g && profile.usesGold(g);
  }

  show() {
    this.open = true;
    if (!this.three) this.initThree();
    this.render();
    this.buildModel();
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  hide() {
    this.open = false;
    this.showVariants(false);
    cancelAnimationFrame(this.raf);
  }

  select(base) {
    if (!TOWERS[base] || base === this.base) return;
    this.base = base;
    this.form = profile.formOf(base);
    this.gold = this.goldUsed(this.form);
    this.level = 0;
    this.autoT = 0;
    audio.click?.();
    this.render();
    this.buildModel(true);
  }

  setForm(type) {
    if (type === this.form) return;
    this.form = type;
    this.gold = this.goldUsed(TOWERS[type].branchOf ?? type); // a path switch keeps the golden perk shown
    this.level = Math.min(this.level, TOWERS[this.shown].levels.length - 1); // forms can have different level counts
    this.render();
    this.buildModel(true);
  }

  setLevel(level, manual = false) {
    if (manual) this.auto = false;
    if (level === this.level) return this.renderLevels();
    this.level = level;
    this.renderLevels();
    this.renderInfo();
    this.buildModel(true);
  }

  onInfoClick(e) {
    const path = e.target.closest('[data-path]');
    if (path) return this.setForm(path.dataset.path);
    const b = e.target.closest('[data-act]');
    if (!b) {
      const row = e.target.closest('[data-row]');
      if (row) this.setLevel(Number(row.dataset.row), true);
      return;
    }
    const act = b.dataset.act;
    let err = null;
    if (act === 'variants') return this.showVariants(true);
    if (act === 'equip') {
      err = profile.toggleLoadout(this.base);
      if (!err && b.dataset.type) err = profile.useVariant(this.base, b.dataset.type);
    }
    if (act === 'usevar') {
      err = profile.useVariant(this.base, b.dataset.type);
      if (!err) {
        audio.click?.();
        this.lobby.toast(`Now using the ${TOWERS[b.dataset.type].name} in your loadout.`);
      }
    }
    if (act === 'buy') {
      err = profile.buy(this.base);
      if (!err) {
        audio.upgrade();
        this.lobby.toast(`Unlocked the ${TOWERS[this.base].name}!${profile.loadout.includes(this.base) ? ' Added to your loadout.' : ''}`);
      }
    }
    if (err) {
      audio.error();
      this.lobby.toast(err);
    }
  }

  // ------------------------------------------------------------------ rendering (DOM)

  render() {
    if (!this.open) return;
    $('lo-credits').textContent = num(profile.credits);
    $('lo-shards').textContent = num(profile.shards);
    $('lo-gems').textContent = num(profile.gems);
    this.renderSlots();
    this.renderGrid();
    this.renderLevels();
    this.renderInfo();
    this.renderVariants();
  }

  card(base, extra = '') {
    const type = profile.playedAs(base);
    const def = TOWERS[type];
    const owned = profile.owns(base);
    const sel = base === this.base ? ' sel' : '';
    const badges = [
      !owned && '<span class="lo-badge lock">🔒</span>',
      !owned && TOWERS[base].event && '<span class="lo-badge price event">🎁 Event</span>',
      !owned && !TOWERS[base].event && `<span class="lo-badge price">${TOWERS[base].gems ? `${GEM} ${num(TOWERS[base].gems)}` : TOWERS[base].shards ? `${SHARD} ${TOWERS[base].shards}` : `🪙 ${num(TOWERS[base].price)}`}</span>`,
      profile.loadout.includes(base) && '<span class="lo-badge on">✔</span>',
      formsOf(base).length && `<span class="lo-badge form" title="Has alternate forms">${SHARD}</span>`,
      TOWERS[type].goldOf && '<span class="lo-badge gold" title="Golden perk on">★</span>',
    ].filter(Boolean).join('');
    return `<button class="inv-tower${sel}${owned ? '' : ' locked'}" data-pick="${base}" title="${esc(def.name)}">
      <img src="${this.lobby.icons[type]}" alt=""><span class="inv-name">${esc(def.name)}</span>${badges}${extra}
    </button>`;
  }

  renderSlots() {
    let html = '';
    for (let i = 0; i < GAME.loadoutSize; i++) {
      const t = profile.loadout[i];
      html += t ? this.card(t, `<span class="inv-key">${i + 1}</span>`) : `<div class="inv-tower empty"><span class="inv-key">${i + 1}</span></div>`;
    }
    $('lo-slots').innerHTML = html;
  }

  renderGrid() {
    $('lo-grid').innerHTML = SHOP_ORDER.map((t) => this.card(t)).join('');
    $('lo-events').innerHTML = EVENT_TOWERS.map((t) => this.card(t)).join('');
  }

  /**
   * Upgrade paths (Pursuit, Hacker, Tactical Sniper): a Top / Bottom toggle that switches the
   * shown levels, stats and model to that path. Empty for towers without paths.
   */
  pathToggle() {
    const def = TOWERS[this.form];
    const root = def.branchOf ?? (def.branch ? this.form : null);
    if (!root) return '';
    // Golden perks: only the ones with two paths of their own (the buttons still pick the form's path).
    const g = this.gold ? goldOf(root) : null;
    if (this.gold && !TOWERS[g]?.branch) return '';
    return `<div class="lo-paths"><span>Upgrade path:</span>${[root, TOWERS[root].branch]
      .map((t) => {
        const d = g ? TOWERS[t === root ? g : TOWERS[g].branch] : TOWERS[t];
        const on = t === this.form;
        return `<button class="btn small ${on ? (d.path === 'Top' ? 'blue on' : 'red on') : ''}" data-path="${t}" title="Lv ${d.branchAt + 1}+: ${esc(d.levels[d.branchAt].name)}">${d.path === 'Top' ? '▲' : '▼'} ${d.path} path</button>`;
      })
      .join('')}</div>`;
  }

  renderLevels() {
    const def = TOWERS[this.shown];
    $('lo-levels').innerHTML =
      this.pathToggle() +
      def.levels
        .map((l, i) => `<button class="btn small ${i === this.level ? 'blue on' : ''}" data-lv="${i}" title="${esc(l.name)}">Lv ${i + 1}</button>`)
        .join('') + `<button class="btn small ${this.auto ? 'green on' : ''}" data-lv="auto" title="${this.auto ? 'Stop spinning and stay on this level' : 'Spin the tower and play through every level'}">${this.auto ? '⏸ Stop' : '▶ Play'}</button>`;
  }

  /** Big stat chips for the selected level, with arrows showing what the upgrade improved. */
  chips(def, i) {
    const l = def.levels[i];
    const prev = i > 0 ? def.levels[i - 1] : null;
    const chip = (label, value, better) => `<div class="lo-chip${better ? ' up' : ''}"><small>${label}</small><b>${value}${better ? ' ▲' : ''}</b></div>`;
    if (isNonAttacker(def)) {
      // Spawners, support and income towers: the shop's columns for this one level.
      const { head, cells } = this.lobby.statColumns(def, false, false);
      return `<table class="shop-stats lo-one"><tr>${head}</tr><tr>${cells(l)}</tr></table>`;
    }
    const dps = dpsValue;
    const extras = extrasText(l);
    return `<div class="lo-chips">
      ${chip('Damage', damageText(l), prev && (l.damage > prev.damage || l.maxDamage > prev.maxDamage || l.burn > prev.burn || l.spike?.damage > prev.spike?.damage))}
      ${l.burst ? chip('Burst', l.burst, prev && l.burst > prev.burst) : ''}
      ${chip('Firerate', `${l.cooldown}s`, prev && l.cooldown < prev.cooldown)}
      ${chip('Range', l.range, prev && l.range > prev.range)}
      ${chip('DPS', dpsText(l), prev && dps(l) > dps(prev))}
      ${chip('Detects', detectText(detection(def, i)), prev && ['hidden', 'flying', 'lead'].some((k) => detection(def, i)[k] && !detection(def, i - 1)[k]))}
    </div>${extras ? `<div class="lo-extras">${esc(extras)}</div>` : ''}`;
  }

  renderInfo() {
    const base = TOWERS[this.base];
    const def = TOWERS[this.shown];
    // Viewing an alternate form's Bottom path still means that form.
    const formKey = TOWERS[this.form].branchOf ?? this.form;
    const formDef = TOWERS[formKey];
    const i = this.level;
    const l = def.levels[i];
    const owned = profile.owns(this.base);
    const inLoadout = profile.loadout.includes(this.base);

    // Variants: one button that opens the Variants menu (forms, golden perks, evolutions).
    const cur = this.gold ? goldOf(formKey) : formKey;
    const variants = this.variants();
    const playing = profile.playedAs(this.base);
    const varBtn = variants.length > 1
      ? `<button class="btn lo-var-btn" data-act="variants" title="Pick, buy and unlock versions of this tower">
          <img src="${this.lobby.icons[cur]}" alt=""><span><small>Variant · ${variants.length} total</small><b>${esc(this.variantLabel(cur))}${owned && playing === cur ? ' ✔' : ''}</b></span><i>▾</i></button>`
      : '';

    // What you can do with this tower.
    const btns = [];
    if (!owned && base.event) {
      btns.push(`<span class="tag">🎁 Event tower: ${esc(base.event)}. Can't be bought.</span>`);
    } else if (!owned) {
      const [have, need, icon] = base.gems ? [profile.gems, base.gems, GEM] : base.shards ? [profile.shards, base.shards, SHARD] : [profile.credits, base.price, '🪙'];
      const can = have >= need;
      btns.push(`<button class="btn ${base.gems || base.shards ? 'purple' : 'green'}" data-act="buy" ${can ? '' : 'disabled'}>Buy for ${icon} ${num(need)}</button>`);
      if (!can) btns.push(`<span class="tag">Need ${icon} ${num(need - have)} more${base.gems ? ' (Gems come from Hardcore)' : ''}</span>`);
    }
    else {
      // The version being previewed, if it's owned but not the one being played: offer to use it.
      const cd = TOWERS[cur];
      const hasCur = cd.goldOf ? profile.ownsGold(cur) : cd.altOf ? profile.ownsForm(cur) : true;
      const switchTo = hasCur && playing !== cur;
      if (!inLoadout) btns.push(`<button class="btn green" data-act="equip" data-type="${switchTo ? cur : ''}">Add ${switchTo ? esc(this.variantLabel(cur)) + ' ' : ''}to loadout</button>`);
      else {
        if (switchTo) btns.push(`<button class="btn blue" data-act="usevar" data-type="${cur}">Use ${esc(this.variantLabel(cur))}</button>`);
        btns.push(`<button class="btn red" data-act="equip">Remove from loadout</button>`);
      }
      if (switchTo) btns.push(`<span class="tag">Now playing: ${esc(this.variantLabel(playing))}</span>`);
    }

    // Tower level (or evolution level): towers earn XP while you use them.
    const xp = this.xpBar(this.shown);

    const burst = def.levels.some((x) => x.burst);
    const extras = def.levels.some((x) => extrasText(x));
    const { head, cells } = this.lobby.statColumns(def, burst, extras);
    let total = 0;
    let totalHere = 0;
    const rows = def.levels
      .map((x, k) => {
        const cost = k === 0 ? def.cost : x.cost;
        total += cost;
        if (k === i) totalHere = total;
        const tag = x.path ? ` <small>(${x.path})</small>` : '';
        const evo = x.evo ? ` <small class="lo-evo-req">Evo ${x.evo}</small>` : '';
        return `<tr data-row="${k}" class="${k === i ? 'sel' : ''}"><td>${k + 1}</td><td><img class="lv-ico" src="${towerIcon(this.shown, k)}" alt="">${esc(x.name)}${tag}${evo}</td><td>$${cost.toLocaleString()}</td><td>$${total.toLocaleString()}</td>${cells(x)}</tr>`;
      })
      .join('');

    const where = def.placement === 'cliff' ? 'Cliff only' : def.placement === 'water' ? 'Water only' : def.placement === 'any' || def.orbit ? 'Ground or cliff' : 'Ground';
    const upCost = (i === 0 ? `Place for $${def.cost.toLocaleString()}` : `Upgrade for $${l.cost.toLocaleString()}${l.costMax ? `–${l.costMax.toLocaleString()} (random)` : ''}`) + (l.evo ? ` · 🔒 Evolution Lv ${l.evo}` : '');
    $('lo-info').innerHTML = `
      <div class="lo-title">${esc(def.name)}${base.event ? ' <span class="lo-alt lo-event">🎁 Event tower</span>' : ''}${this.gold ? ' <span class="lo-alt lo-gold">★ Golden perk</span>' : formDef.evolved ? ' <span class="lo-alt lo-evo">⬆ Evolution</span>' : formDef.altOf ? ` <span class="lo-alt">${SHARD} ${esc(formDef.form)} form</span>` : ''}
        <small>${towerKind(def)} · ${where} · Max ${limitRange(def)}</small></div>
      ${def.cross ? `<div class="lo-extras">↕ Crosspathing: take one path all the way (${def.cross.maxA} Top / ${def.cross.maxB} Bottom) and up to 2 upgrades on the other.</div>` : ''}
      ${xp}
      ${varBtn}
      ${this.pathToggle()}
      <div class="lo-actions">${btns.join('')}</div>
      <div class="lo-level">
        <div class="lo-level-head"><span class="lo-lv">Lv ${i + 1}</span> <b>${esc(l.name)}</b>
          <span class="lo-cost">${upCost} · $${totalHere.toLocaleString()} total</span></div>
        <div class="lo-desc">${descHtml(l.desc, esc, 110)}</div>
        ${this.chips(def, i)}
      </div>
      <div class="shop-blurb">${blurbHtml(def.blurb, esc)}</div>
      ${def.tip ? `<div class="lo-tip"><b>Tip:</b> ${esc(def.tip)}</div>` : ''}
      <table class="shop-stats lo-table"><tr><th>Lv</th><th>Upgrade</th><th>Cost</th><th>Total</th>${head}</tr>${rows}</table>
      <div class="hint">Click a row (or use ← →) to see that level. Every upgrade changes how the tower looks.</div>`;
  }

  // ------------------------------------------------------------------ variants menu

  /** Every version of the selected tower: default, alternate forms, golden perks, evolutions. */
  variants() {
    const forms = formsOf(this.base);
    const plain = [this.base, ...forms.filter((t) => !TOWERS[t].evolved)];
    const golds = [this.base, ...forms].map(goldOf).filter(Boolean);
    return [...plain, ...golds, ...forms.filter((t) => TOWERS[t].evolved)];
  }

  variantLabel(type) {
    const d = TOWERS[type];
    if (d.goldOf) return d.name;
    if (d.altOf) return d.evolved ? d.name : `${d.form} form`;
    return 'Default';
  }

  /** Tower level (evolution level for evolved towers) with an XP bar. */
  xpBar(type) {
    const key = xpKey(type);
    if (TOWERS[key].event) return '';
    const { level, xp, need, max } = profile.levelOf(key);
    const label = TOWERS[key].evolved ? 'Evolution' : 'Tower';
    return `<div class="lo-xp" title="Towers earn XP every wave they are out in a game. More towers and higher upgrades earn more.">
      <span>${label} Lv <b>${level}</b></span><div class="lo-xp-bar"><i style="width:${max ? 100 : Math.round((xp / need) * 100)}%"></i></div>
      <small>${max ? 'MAX' : `${num(xp)} / ${num(need)} XP`}</small></div>`;
  }

  showVariants(on) {
    this.variantsOpen = on;
    $('lo-variants').classList.toggle('hidden', !on);
    if (on) this.renderVariants();
  }

  /** One row of the Variants menu: icon, name and status, and one action. */
  variantRow(type) {
    const d = TOWERS[type];
    const owned = profile.owns(this.base);
    const has = d.goldOf ? profile.ownsGold(type) : d.altOf ? profile.ownsForm(type) : owned;
    const using = owned && has && profile.playedAs(this.base) === type;
    const viewing = (this.gold ? goldOf(TOWERS[this.form].branchOf ?? this.form) : TOWERS[this.form].branchOf ?? this.form) === type;
    let sub = '';
    let action = '';
    if (using) {
      action = d.goldOf ? '<button class="btn small" data-vact="goldoff" title="Play the normal version instead">Turn off</button><span class="lo-var-on">✔ Using</span>' : '<span class="lo-var-on">✔ Using</span>';
    } else if (has) {
      action = owned ? `<button class="btn small blue" data-vact="use" data-type="${type}">Use</button>` : '';
      if (!owned) sub = `Buy the ${esc(TOWERS[this.base].name)} to use it`;
    } else if (!d.altOf && !d.goldOf) {
      sub = 'Buy this tower to use it'; // the default version of a tower you don't own yet
    } else if (d.evolved) {
      const from = profile.levelOf(d.evoFrom);
      const ready = from.level >= d.evoLevel;
      const can = ready && owned && profile.credits >= d.price && profile.shards >= d.shards;
      const pct = ready ? 100 : Math.round(((from.level - 1 + from.xp / from.need) / (d.evoLevel - 1)) * 100);
      sub = `<span class="lo-var-prog"><span>${esc(TOWERS[d.evoFrom].name)} Lv ${from.level} / ${d.evoLevel}</span><span class="lo-xp-bar"><i style="width:${pct}%"></i></span></span>`;
      action = `<button class="btn small evo" data-vact="buyevo" data-type="${type}" ${can ? '' : 'disabled'}>${ready ? '' : '🔒 '}🪙 ${num(d.price)} + ${SHARD} ${d.shards}</button>`;
    } else if (d.goldOf) {
      const ready = profile.ownsGoldBase(type);
      if (!ready) sub = `Unlock the ${esc(TOWERS[d.goldOf].name)} first`;
      action = `<button class="btn small gold on" data-vact="buygold" data-type="${type}" ${ready && profile.credits >= d.price ? '' : 'disabled'}>🪙 ${num(d.price)}</button>`;
    } else if (d.winReward) {
      sub = `🏆 ${esc(d.winReward)} to unlock it`; // a mode win reward: can't be bought
      action = '<span class="lo-var-on">🔒 Reward</span>';
    } else {
      if (!owned) sub = `Buy the ${esc(TOWERS[this.base].name)} first`;
      action = `<button class="btn small purple" data-vact="buyform" data-type="${type}" ${owned && profile.shards >= d.shards ? '' : 'disabled'}>${SHARD} ${d.shards}</button>`;
    }
    if (!sub && d.evolved && has) sub = `Evolution Lv ${profile.levelOf(type).level}`;
    return `<div class="lo-var${viewing ? ' sel' : ''}${has ? '' : ' locked'}" data-view="${type}" title="Click to preview">
      <img src="${this.lobby.icons[type]}" alt="">
      <div class="lo-var-name"><b>${esc(d.goldOf || d.evolved ? d.name : this.variantLabel(type))}</b>${sub ? `<small>${sub}</small>` : ''}</div>
      <div class="lo-var-act">${action}</div></div>`;
  }

  renderVariants() {
    if (!this.variantsOpen) return;
    const all = this.variants();
    const group = (title, list, note = '') =>
      list.length ? `<div class="lo-var-group"><h4>${title}${note ? ` <small>${note}</small>` : ''}</h4>${list.map((t) => this.variantRow(t)).join('')}</div>` : '';
    $('lo-variants').innerHTML = `<div class="lo-var-card card">
      <div class="lo-var-head"><b>${esc(TOWERS[this.base].name)}</b>
        <span class="lo-var-money">🪙 ${num(profile.credits)} · ${SHARD} ${num(profile.shards)}</span>
        <button class="btn small" data-vact="close" title="Close (Esc)">✕</button></div>
      ${group('Forms', all.filter((t) => !TOWERS[t].goldOf && !TOWERS[t].evolved))}
      ${group('Golden', all.filter((t) => TOWERS[t].goldOf))}
      ${group('Evolutions', all.filter((t) => TOWERS[t].evolved), `unlock at tower Lv ${TOWERS[all.find((t) => TOWERS[t].evolved)]?.evoLevel ?? 20}`)}
    </div>`;
  }

  onVariantClick(e) {
    if (e.target.id === 'lo-variants') return this.showVariants(false); // clicked the dimmed backdrop
    const b = e.target.closest('[data-vact]');
    if (!b) {
      const row = e.target.closest('[data-view]');
      if (row) {
        this.preview(row.dataset.view);
        this.showVariants(false);
      }
      return;
    }
    const act = b.dataset.vact;
    const type = b.dataset.type;
    if (act === 'close') return this.showVariants(false);
    let err = null;
    let done = null;
    if (act === 'use') err = profile.useVariant(this.base, type);
    if (act === 'goldoff') err = profile.toggleGold(profile.playedAs(this.base));
    if (act === 'buyform') {
      err = profile.buyForm(type);
      done = `Unlocked the ${TOWERS[type].name}! It now replaces the ${TOWERS[this.base].name} in your loadout.`;
    }
    if (act === 'buygold') {
      err = profile.buyGold(type) || profile.useVariant(this.base, type);
      done = `Unlocked the ${TOWERS[type].name}! It now replaces the ${TOWERS[TOWERS[type].goldOf].name} in your loadout.`;
    }
    if (act === 'buyevo') {
      err = profile.buyEvo(type);
      done = `Evolved! The ${TOWERS[type].name} now replaces the ${TOWERS[this.base].name} in your loadout.`;
    }
    if (err) {
      audio.error();
      return this.lobby.toast(err);
    }
    if (done) {
      audio.upgrade();
      this.lobby.toast(done, 3000);
    } else audio.click?.();
    if (type) this.preview(type);
    this.render(); // profile.save() re-renders too; this also covers no-change clicks
  }

  /** Shows variant `type` in the preview and stats. */
  preview(type) {
    const d = TOWERS[type];
    const form = d.goldOf ?? type;
    if (form === (TOWERS[this.form].branchOf ?? this.form) && this.gold === !!d.goldOf) return;
    this.form = form;
    this.gold = !!d.goldOf;
    this.level = Math.min(this.level, TOWERS[this.shown].levels.length - 1);
    this.render();
    this.buildModel(true);
  }

  // ------------------------------------------------------------------ 3D preview

  initThree() {
    const canvas = $('lo-canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x556070, 2.0));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(4, 8, 6);
    scene.add(sun);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
    const stage = new THREE.Group(); // turntable: pad + model
    scene.add(stage);
    const padMat = new THREE.MeshLambertMaterial({ color: PAD_COLORS[0] });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = 0.2;
    stage.add(pad);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.9 });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.visible = false;
    scene.add(flash);
    this.three = { renderer, scene, camera, stage, padMat, flash, flashMat, model: null, yaw: 0.5, fit: new Map(), pop: 0, recoil: 0, fireT: 0, shots: 0, flashT: 0 };

    // Drag to spin the tower.
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => {
      drag = e.clientX;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (drag == null) return;
      this.three.yaw += (e.clientX - drag) * 0.012;
      this.three.dragging = performance.now();
      drag = e.clientX;
    });
    canvas.addEventListener('pointerup', () => (drag = null));
  }

  /** Camera framing per tower type, big enough for its largest level so you can see it grow. */
  fitFor(type) {
    const T = this.three;
    if (T.fit.has(type)) return T.fit.get(type);
    const box = new THREE.Box3();
    for (let lv = 0; lv < TOWERS[type].levels.length; lv++) {
      const m = TOWER_MODELS[type](lv);
      m.root.position.y = 0.4;
      m.root.updateMatrixWorld(true);
      box.expandByObject(m.root);
      for (const mat of m.mats) mat.dispose();
    }
    box.expandByPoint(new THREE.Vector3(2.4, 0, 2.4)).expandByPoint(new THREE.Vector3(-2.4, 0, -2.4));
    if (TOWERS[type].orbit || TOWERS[type].heli) box.expandByPoint(new THREE.Vector3(0, 9.5, 0)); // room for the plane overhead
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(size.y * 0.62, Math.hypot(size.x, size.z) * 0.5);
    const fit = { center, dist: radius / Math.tan(THREE.MathUtils.degToRad(16)) + 1.5 };
    T.fit.set(type, fit);
    return fit;
  }

  buildModel(pop = false) {
    const T = this.three;
    if (!T) return;
    if (T.model) {
      T.stage.remove(T.model.root);
      if (T.model.plane) T.stage.remove(T.model.plane);
      for (const m of T.model.mats) m.dispose();
    }
    const m = TOWER_MODELS[this.shown](this.level);
    m.root.position.y = 0.4;
    T.stage.add(m.root);
    if (m.plane) {
      m.plane.scale.setScalar(0.5);
      T.stage.add(m.plane);
    }
    T.model = m;
    T.padMat.color.setHex(PAD_COLORS[this.level]);
    T.pop = pop ? 1 : 0;
    T.recoil = 0;
    T.fireT = 0.5;
    const fit = this.fitFor(this.shown);
    T.camera.position.set(fit.center.x, fit.center.y + fit.dist * 0.28, fit.center.z + fit.dist);
    T.camera.lookAt(fit.center);
  }

  frame(now) {
    if (!this.open) return;
    this.raf = requestAnimationFrame((t) => this.frame(t));
    const T = this.three;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const t = now / 1000;

    // Resize to the canvas' CSS size.
    const c = T.renderer.domElement;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (w && h && (c.width !== Math.floor(w * T.renderer.getPixelRatio()) || c.height !== Math.floor(h * T.renderer.getPixelRatio()))) {
      T.renderer.setSize(w, h, false);
      T.camera.aspect = w / h;
      T.camera.updateProjectionMatrix();
    }

    if (this.auto) {
      this.autoT += dt;
      if (this.autoT >= AUTO_EVERY) {
        this.autoT = 0;
        this.setLevel((this.level + 1) % TOWERS[this.shown].levels.length);
      }
    }

    // Turntable: spins while playing (pausing briefly after a drag); you can always drag it.
    // Plus a little "pop" when the level changes.
    if (this.auto && (!T.dragging || now - T.dragging > 1500)) T.yaw += dt * 0.6;
    T.stage.rotation.y = T.yaw;
    T.pop = Math.max(0, T.pop - dt * 3);
    const s = 1 + Math.sin(T.pop * Math.PI) * 0.12;
    T.stage.scale.setScalar(s);

    const m = T.model;
    // Idle bob, and a pretend shot every so often so you can see how it attacks.
    m.body.position.y = (m.lift || 0) + Math.sin(t * 2) * (m.bob ?? (m.lift ? 0.15 : 0.04));
    if (m.drift) driftFx(m, dt, t);
    T.fireT -= dt;
    if (T.fireT <= 0 && m.muzzles?.length && !m.static) {
      T.fireT = FIRE_EVERY;
      T.recoil = 1;
      T.shots++;
      const muzzle = m.muzzles[T.shots % m.muzzles.length];
      if (!m.melee && !m.beam && !m.swing) {
        m.root.updateMatrixWorld(true);
        muzzle.getWorldPosition(T.flash.position);
        T.flashMat.color.setHex(m.tracer ?? 0xfff3b0);
        T.flash.visible = true;
        T.flashT = 0.07;
      }
    }
    T.recoil = Math.max(0, T.recoil - dt * (m.swing ? 4 : 10));
    if (m.static) {
      // Buildings don't animate.
    } else if (m.punch) {
      const left = T.shots % 2 === 0; // Brawler: fists take turns
      m.rightArm.rotation.x = m.pose.right + (left ? 0 : T.recoil * m.swing);
      m.leftArm.rotation.x = m.pose.left + (left ? T.recoil * m.swing : 0);
    } else if (m.swing) {
      m.rightArm.rotation.x = m.pose.right + T.recoil * m.swing;
    } else if (!m.plane && m.pose) {
      const dual = m.muzzles.length > 1;
      const leftFired = dual && T.shots % 2 === 1;
      const kick = T.recoil * (m.recoilScale ?? 1);
      m.rightArm.rotation.x = m.pose.right - (leftFired ? 0 : kick * 0.35);
      m.leftArm.rotation.x = m.pose.left - (dual && !leftFired ? 0 : kick * m.pose.leftRecoil);
    }
    if (m.spin) for (const b of m.spin) b.rotation.y += dt * 12;
    if (m.heli) {
      // Pursuit: the helicopter hovers over its pad, slowly turning.
      m.plane.position.set(0, 8 + Math.sin(t * 1.6) * 0.3, 0);
      m.plane.rotation.y = t * 0.4;
      if (m.plane.userData.prop) m.plane.userData.prop.rotation.y += dt * 28;
      if (m.plane.userData.tail) m.plane.userData.tail.rotation.x += dt * 36; // Jet Trooper: no tail rotor
    } else if (m.plane) {
      // Aviator: the plane circles overhead.
      const a = t * 0.9;
      m.plane.position.set(Math.cos(a) * 3.2, 8.5, Math.sin(a) * 3.2);
      m.plane.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
      m.plane.userData.bank.rotation.z = 0.35;
      if (m.plane.userData.prop) m.plane.userData.prop.rotation.z += dt * 40;
    }
    if (T.flashT > 0) {
      T.flashT -= dt;
      if (T.flashT <= 0) T.flash.visible = false;
    }
    T.renderer.render(T.scene, T.camera);
  }
}
