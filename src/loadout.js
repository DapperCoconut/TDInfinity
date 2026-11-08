// Loadout & shop screen: browse every tower, spin a live 3D preview through each upgrade level,
// read its stats, buy locked towers with credits, equip them, and buy / pick alternate forms
// with Dimension Shards.
import * as THREE from 'three';
import { BASE_TOWERS, GAME, TOWERS, detection, formsOf } from './config.js';
import { TOWER_MODELS } from './models.js';
import { PAD_COLORS } from './views.js';
import { profile } from './profile.js';
import { audio } from './audio.js';
import { damageText, detectText, dpsText, dpsValue, extrasText, isNonAttacker, limitText, towerKind } from './stats.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
const num = (n) => (n === Infinity ? '∞' : n.toLocaleString());
export const SHARD = '<i class="shard-icon"></i>';
const AUTO_EVERY = 1.6; // seconds per level while auto-playing
const FIRE_EVERY = 1.1; // seconds between pretend shots in the preview

const padGeo = new THREE.CylinderGeometry(1.9, 2.1, 0.4, 20);
const flashGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);

export class LoadoutScreen {
  constructor(lobby) {
    this.lobby = lobby;
    this.base = profile.loadout[0] || BASE_TOWERS[0];
    this.form = profile.formOf(this.base);
    this.level = 0;
    this.auto = false;
    this.autoT = 0;
    this.open = false;
    this.three = null; // created on first open

    $('lo-back').onclick = () => lobby.show('title');
    $('lo-grid').addEventListener('click', (e) => {
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
    window.addEventListener('keydown', (e) => {
      if (!this.open || e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') this.setLevel(Math.min(TOWERS[this.form].levels.length - 1, this.level + 1), true);
      if (e.key === 'ArrowLeft') this.setLevel(Math.max(0, this.level - 1), true);
    });
  }

  // ------------------------------------------------------------------ state

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
    cancelAnimationFrame(this.raf);
  }

  select(base) {
    if (!TOWERS[base] || base === this.base) return;
    this.base = base;
    this.form = profile.formOf(base);
    this.level = 0;
    this.autoT = 0;
    audio.click?.();
    this.render();
    this.buildModel(true);
  }

  setForm(type) {
    if (type === this.form) return;
    this.form = type;
    this.level = Math.min(this.level, TOWERS[type].levels.length - 1); // forms can have different level counts
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
    if (act === 'form') return this.setForm(b.dataset.type);
    if (act === 'equip') err = profile.toggleLoadout(this.base);
    if (act === 'buy') {
      err = profile.buy(this.base);
      if (!err) {
        audio.upgrade();
        this.lobby.toast(`Unlocked the ${TOWERS[this.base].name}!${profile.loadout.includes(this.base) ? ' Added to your loadout.' : ''}`);
      }
    }
    const formKey = TOWERS[this.form].branchOf ?? this.form; // a form's Bottom path tab means that form
    if (act === 'use') err = profile.setForm(this.base, formKey);
    if (act === 'buyform') {
      err = profile.buyForm(formKey);
      if (!err) {
        audio.upgrade();
        this.lobby.toast(`Unlocked the ${TOWERS[formKey].name}! It now replaces the ${TOWERS[this.base].name} in your loadout.`, 3000);
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
    this.renderSlots();
    this.renderGrid();
    this.renderLevels();
    this.renderInfo();
  }

  card(base, extra = '') {
    const type = profile.formOf(base);
    const def = TOWERS[type];
    const owned = profile.owns(base);
    const sel = base === this.base ? ' sel' : '';
    const badges = [
      !owned && '<span class="lo-badge lock">🔒</span>',
      !owned && `<span class="lo-badge price">${TOWERS[base].shards ? `${SHARD} ${TOWERS[base].shards}` : `🪙 ${num(TOWERS[base].price)}`}</span>`,
      profile.loadout.includes(base) && '<span class="lo-badge on">✔</span>',
      formsOf(base).length && `<span class="lo-badge form" title="Has alternate forms">${SHARD}</span>`,
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
    $('lo-grid').innerHTML = BASE_TOWERS.map((t) => this.card(t)).join('');
  }

  /**
   * Upgrade paths (Pursuit, Hacker, Tactical Sniper): a Top / Bottom toggle that switches the
   * shown levels, stats and model to that path. Empty for towers without paths.
   */
  pathToggle() {
    const def = TOWERS[this.form];
    const root = def.branchOf ?? (def.branch ? this.form : null);
    if (!root) return '';
    return `<div class="lo-paths"><span>Upgrade path:</span>${[root, TOWERS[root].branch]
      .map((t) => {
        const d = TOWERS[t];
        const on = t === this.form;
        return `<button class="btn small ${on ? (d.path === 'Top' ? 'blue on' : 'red on') : ''}" data-path="${t}" title="Lv ${d.branchAt + 1}+: ${esc(d.levels[d.branchAt].name)}">${d.path === 'Top' ? '▲' : '▼'} ${d.path} path</button>`;
      })
      .join('')}</div>`;
  }

  renderLevels() {
    const def = TOWERS[this.form];
    $('lo-levels').innerHTML =
      this.pathToggle() +
      def.levels
        .map((l, i) => `<button class="btn small ${i === this.level ? 'blue on' : ''}" data-lv="${i}" title="${esc(l.name)}">Lv ${i + 1}</button>`)
        .join('') + `<button class="btn small ${this.auto ? 'green on' : ''}" data-lv="auto" title="Play through every level">${this.auto ? '⏸ Stop' : '▶ Play'}</button>`;
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
    const def = TOWERS[this.form];
    // Viewing an alternate form's Bottom path still means that form.
    const formKey = def.branchOf ?? this.form;
    const formDef = TOWERS[formKey];
    const i = this.level;
    const l = def.levels[i];
    const owned = profile.owns(this.base);
    const inLoadout = profile.loadout.includes(this.base);
    const using = profile.formOf(this.base) === formKey;
    const alts = formsOf(this.base);

    // Form tabs: the default tower plus each alternate form.
    const tabs = alts.length
      ? `<div class="lo-forms">${[this.base, ...alts]
          .map((t) => {
            const d = TOWERS[t];
            const label = d.altOf ? d.form : 'Default';
            const tag = d.altOf && !profile.ownsForm(t) ? ` · ${SHARD}${d.shards}` : profile.formOf(this.base) === t ? ' ✔' : '';
            return `<button class="btn small ${t === formKey ? (d.altOf ? 'purple on' : 'blue on') : ''}" data-act="form" data-type="${t}">${label}${tag}</button>`;
          })
          .join('')}</div>`
      : '';

    // Upgrade paths: Top / Bottom toggle to see each path's levels.
    const paths = this.pathToggle();

    // What you can do with this tower / form.
    const btns = [];
    if (!owned) {
      const [have, need, icon] = base.shards ? [profile.shards, base.shards, SHARD] : [profile.credits, base.price, '🪙'];
      const can = have >= need;
      btns.push(`<button class="btn ${base.shards ? 'purple' : 'green'}" data-act="buy" ${can ? '' : 'disabled'}>Buy for ${icon} ${num(need)}</button>`);
      if (!can) btns.push(`<span class="tag">Need ${icon} ${num(need - have)} more</span>`);
    }
    else btns.push(`<button class="btn ${inLoadout ? 'red' : 'green'}" data-act="equip">${inLoadout ? 'Remove from loadout' : 'Add to loadout'}</button>`);
    if (formDef.altOf) {
      if (!profile.ownsForm(formKey)) {
        const can = owned && profile.shards >= formDef.shards;
        btns.push(`<button class="btn purple" data-act="buyform" ${can ? '' : 'disabled'}>Buy form for ${SHARD} ${formDef.shards}</button>`);
      } else if (!using) btns.push('<button class="btn purple" data-act="use">Use this form</button>');
      else btns.push('<span class="tag ready">✔ Using this form</span>');
    } else if (alts.length && owned) {
      btns.push(using ? '<span class="tag ready">✔ Using default form</span>' : '<button class="btn blue" data-act="use">Use default form</button>');
    }

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
        return `<tr data-row="${k}" class="${k === i ? 'sel' : ''}"><td>${k + 1}</td><td>${esc(x.name)}${tag}</td><td>$${cost.toLocaleString()}</td><td>$${total.toLocaleString()}</td>${cells(x)}</tr>`;
      })
      .join('');

    const where = def.placement === 'cliff' ? 'Cliff only' : def.placement === 'any' || def.orbit ? 'Ground or cliff' : 'Ground';
    const upCost = i === 0 ? `Place for $${def.cost.toLocaleString()}` : `Upgrade for $${l.cost.toLocaleString()}`;
    $('lo-info').innerHTML = `
      <div class="lo-title">${esc(def.name)}${formDef.altOf ? ` <span class="lo-alt">${SHARD} ${esc(formDef.form)} form</span>` : ''}
        <small>${towerKind(def)} · ${where} · Max ${limitText(def.limit)}</small></div>
      ${tabs}${paths}
      <div class="lo-actions">${btns.join('')}</div>
      <div class="lo-level">
        <div class="lo-level-head"><span class="lo-lv">Lv ${i + 1}</span> <b>${esc(l.name)}</b>
          <span class="lo-cost">${upCost} · $${totalHere.toLocaleString()} total</span></div>
        <div class="lo-desc">${esc(l.desc)}</div>
        ${this.chips(def, i)}
      </div>
      <div class="shop-blurb">${esc(def.blurb)}</div>
      ${def.tip ? `<div class="lo-tip"><b>Tip:</b> ${esc(def.tip)}</div>` : ''}
      <table class="shop-stats lo-table"><tr><th>Lv</th><th>Upgrade</th><th>Cost</th><th>Total</th>${head}</tr>${rows}</table>
      <div class="hint">Click a row (or use ← →) to see that level. Every upgrade changes how the tower looks.</div>`;
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
    const m = TOWER_MODELS[this.form](this.level);
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
    const fit = this.fitFor(this.form);
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
        this.setLevel((this.level + 1) % TOWERS[this.form].levels.length);
      }
    }

    // Turntable (pauses briefly after a drag), plus a little "pop" when the level changes.
    if (!T.dragging || now - T.dragging > 1500) T.yaw += dt * 0.6;
    T.stage.rotation.y = T.yaw;
    T.pop = Math.max(0, T.pop - dt * 3);
    const s = 1 + Math.sin(T.pop * Math.PI) * 0.12;
    T.stage.scale.setScalar(s);

    const m = T.model;
    // Idle bob, and a pretend shot every so often so you can see how it attacks.
    m.body.position.y = (m.lift || 0) + Math.sin(t * 2) * (m.bob ?? (m.lift ? 0.15 : 0.04));
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
      m.plane.userData.prop.rotation.y += dt * 28;
      m.plane.userData.tail.rotation.x += dt * 36;
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
