// Liminal contract on screen (see lastlaugh.js). On Sunken Canyon, with the contract accepted, the
// giant pit glitches and you can walk into it (that starts the Backrooms game: lobby.js). In the
// Backrooms: the rooms shifting, and the tower pick every 10 waves (3 cards, each with a blessing
// and a curse; up to 10 towers, then a new one replaces one).
// These are methods of GameClient: game.js puts them on the class, so "this" is the game client.

import * as THREE from 'three';
import { TOWERS, towerCost } from '../config.js';
import { CONTRACTS } from '../lastlaugh.js';
import { profile } from '../profile.js';
import { MAP, mapInfo, mapKey } from '../sim/map.js';
import { PATH_WIDTH, PLAYER_SPAWN, path } from '../sim/path.js';
import { baseKey } from '../sim/maps.js';

const LM = CONTRACTS.liminal;
const STAT_NAMES = { dmg: 'Damage', rate: 'Attack speed', range: 'Range', cost: 'Price' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const rnd = (a, b) => a + Math.random() * (b - a);

export class GameLiminal {

  /** Is this game the Backrooms? */
  get inLiminal() {
    return !!this.session?.sim?.lm;
  }

  /** Every frame: the glitchy pit on Sunken Canyon, and the Backrooms' shifting rooms. */
  syncLiminal(dt) {
    if (this.inLiminal) {
      this.syncMap(); // the rooms shifted (the sim laid a new map)
      return;
    }
    if (this.versus || baseKey(mapKey) !== 'canyon' || !profile.contracts.accepted.includes('liminal') || !this.player || this.ended) return;
    const pit = MAP.props.find((p) => p.kind === 'crater');
    if (!pit) return;
    // The pit's edge doesn't stop you any more.
    if (this.staticColliders !== this.lmCols) {
      this.lmCols = this.staticColliders.filter((c) => !(c.hole && ((c.x - pit.x) / pit.rx) ** 2 + ((c.z - pit.z) / pit.rz) ** 2 <= 1.3));
      this.staticColliders = this.lmCols;
    }
    if (!this.lmHint) {
      this.lmHint = true;
      this.ui.toast('🟨 The giant pit in the middle is glitching... walk into it to enter the Backrooms.', 5000);
    }
    // A flickering glitch glow over the pit, and glitchy specks.
    if (!this.lmGlow) {
      this.lmGlow = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
      this.lmGlow.rotation.x = -Math.PI / 2;
      this.lmGlow.scale.set(pit.rx * 0.95, pit.rz * 0.95, 1);
      this.scene.add(this.lmGlow);
    }
    if ((this.lmT = (this.lmT ?? 0) - dt) <= 0) {
      this.lmT = 0.05;
      const g = this.lmGlow;
      g.material.color.setHex([0xff00ff, 0x00ffff, 0xffe066, 0x000000][Math.floor(Math.random() * 4)]);
      g.material.opacity = 0.15 + Math.random() * 0.35;
      g.position.set(pit.x + (Math.random() - 0.5) * 1.5, -0.5 - Math.random() * 3, pit.z + (Math.random() - 0.5) * 1.5);
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * 0.95;
        this.effects.statusFx('glitch', pit.x + Math.cos(a) * pit.rx * r, rnd(-1, 3), pit.z + Math.sin(a) * pit.rz * r, 2.2);
      }
    }
    // Walked in (off the bridge)?
    const p = this.player.pos;
    const inside = ((p.x - pit.x) / (pit.rx * 0.8)) ** 2 + ((p.z - pit.z) / (pit.rz * 0.8)) ** 2 < 1;
    if (inside && path.distanceTo(p.x, p.z) > PATH_WIDTH / 2 + 1.5 && !this.lmGoing) {
      this.lmGoing = true;
      this.ui.toast('🟨 You noclipped out of reality...', 2500);
      setTimeout(() => {
        this.lmGoing = false;
        this.onLiminal?.();
      }, 600);
    }
  }

  /** Forgets the pit state (a new game started). */
  clearLiminal() {
    if (this.lmGlow) {
      this.scene.remove(this.lmGlow);
      this.lmGlow.geometry.dispose();
      this.lmGlow.material.dispose();
      this.lmGlow = null;
    }
    this.lmCols = null;
    this.lmHint = false;
    this.lmGoing = false;
    this.lmOffers = [];
    this.closePick();
  }

  /** Liminal: a tower's blessing and curse for this player (or null). */
  lmMod(type) {
    return this.session?.sim?.players.get(this.session.myId)?.lmMods?.[type] ?? null;
  }

  /** Sim events for the Backrooms. */
  liminalEvent(ev) {
    if (ev.k === 'lmShift') {
      this.syncMap();
      this.player?.pos.set(PLAYER_SPAWN.x, PLAYER_SPAWN.y, PLAYER_SPAWN.z);
      this.ui.toast(`🟨 The rooms shift... (${mapInfo.style ?? 'new rooms'})${ev.refunds ? `. Towers in the way were refunded: $${ev.refunds.toLocaleString()}` : ''}`, 5000);
    } else if (ev.k === 'lmOffer') {
      (this.lmOffers ??= []).push(this.makeOffer(ev.n));
      if (this.lmOffers.length === 1) this.openPick();
    } else if (ev.k === 'lmPicked' && ev.by === this.session.myId) {
      this.ui.buildHotbar(this.icons, this.loadout, (type) => this.costOf(type), (type) => this.limitOf(type));
    }
  }

  /**
   * Three of your towers for pick number `n`: cheap ones first, pricier ones as you go. Each gets
   * a random blessing and a curse on another stat.
   */
  makeOffer(n) {
    const have = new Set(this.loadout);
    const owned = [...new Set(profile.owned.map((t) => profile.playedAs(t)))].filter((t) => TOWERS[t]);
    // Towers you don't have here yet; with fewer than 3 of those, ones you have too (a new blessing and curse).
    let all = owned.filter((t) => !have.has(t));
    if (all.length < 3) all = owned;
    all.sort((a, b) => towerCost(TOWERS[a]) - towerCost(TOWERS[b]));
    // A window that slides from the cheapest towers to the priciest over about 6 picks.
    const mid = Math.min(1, 0.1 + (n - 1) * 0.16);
    let list = all.filter((_, i) => Math.abs(i / Math.max(1, all.length - 1) - mid) <= 0.2);
    if (list.length < 3) list = all;
    const out = [];
    while (out.length < 3 && list.length) {
      const type = list.splice(Math.floor(Math.random() * list.length), 1)[0];
      const stats = Object.keys(STAT_NAMES);
      const b = stats.splice(Math.floor(Math.random() * stats.length), 1)[0];
      const c = stats[Math.floor(Math.random() * stats.length)];
      out.push({ type, bless: [b, +rnd(...LM.bless[b]).toFixed(2)], curse: [c, +rnd(...LM.curse[c]).toFixed(2)] });
    }
    return out;
  }

  /** "+25% Damage" for a blessing, "-15% Range" / "+20% Price" for a curse. */
  modText([stat, a], good) {
    const up = stat === 'cost' ? !good : good;
    return `${up ? '+' : '-'}${Math.round(a * 100)}% ${STAT_NAMES[stat]}`;
  }

  /** Shows the first waiting offer: three tower cards, and Skip. */
  openPick() {
    const offer = this.lmOffers?.[0];
    if (!offer) return this.closePick();
    if (!this.pickEl) {
      const el = document.createElement('div');
      el.id = 'lm-pick';
      document.body.appendChild(el);
      this.pickEl = el;
    }
    const el = this.pickEl;
    el.classList.remove('hidden');
    const full = this.loadout.length >= LM.maxTowers && offer.some((o) => !this.loadout.includes(o.type));
    el.innerHTML = `<div class="lmp-box">
      <h3>🟨 Pick a tower</h3>
      <p>${full ? `Your loadout is full (${LM.maxTowers}): the new tower replaces one.` : `It joins your loadout (${this.loadout.length}/${LM.maxTowers}).`} Every tower has a blessing and a curse.</p>
      <div class="lmp-cards">${offer.map((o, i) => `<button class="lmp-card" data-i="${i}">
        <img src="${this.icons[o.type]}" alt="">
        <b>${esc(TOWERS[o.type].name)}</b>${this.loadout.includes(o.type) ? '<small>(new blessing and curse)</small>' : ''}
        <span class="lmp-cost">$${Math.round(towerCost(TOWERS[o.type]) * (o.bless[0] === 'cost' ? 1 - o.bless[1] : o.curse[0] === 'cost' ? 1 + o.curse[1] : 1))}</span>
        <span class="lmp-good">✨ ${this.modText(o.bless, true)}</span>
        <span class="lmp-bad">💀 ${this.modText(o.curse, false)}</span>
      </button>`).join('')}</div>
      <div class="lmp-swap hidden"><p>Swap out which tower?</p><div class="lmp-row"></div></div>
      <button class="btn small lmp-skip">Skip</button>
    </div>`;
    el.querySelector('.lmp-skip').onclick = () => this.takePick(null);
    el.querySelectorAll('.lmp-card').forEach((b) => {
      b.onclick = () => {
        const o = offer[Number(b.dataset.i)];
        if (!full || this.loadout.includes(o.type)) return this.takePick(o);
        // Full: pick which tower goes.
        el.querySelectorAll('.lmp-card').forEach((c) => c.classList.toggle('on', c === b));
        const swap = el.querySelector('.lmp-swap');
        swap.classList.remove('hidden');
        swap.querySelector('.lmp-row').innerHTML = this.loadout.map((t, i) => `<button class="lmp-old" data-i="${i}" title="${esc(TOWERS[t].name)}"><img src="${this.icons[t]}" alt=""></button>`).join('');
        swap.querySelectorAll('.lmp-old').forEach((s) => (s.onclick = () => this.takePick(o, Number(s.dataset.i))));
      };
    });
  }

  closePick() {
    this.pickEl?.classList.add('hidden');
  }

  /** Takes offer `o` (null: skip), into slot `slot` (a full loadout) or onto the end. */
  takePick(o, slot = -1) {
    this.lmOffers?.shift();
    this.session?.send(o ? { a: 'lmPick', type: o.type, bless: o.bless, curse: o.curse } : { a: 'lmPick', type: null });
    if (o) {
      if (this.loadout.includes(o.type)); // already here: only its blessing and curse change
      else if (slot >= 0) this.loadout[slot] = o.type;
      else this.loadout.push(o.type);
      this.ui.buildHotbar(this.icons, this.loadout, (type) => this.costOf(type), (type) => this.limitOf(type));
      this.ui.toast(`🟨 ${TOWERS[o.type].name} joined your loadout: ${this.modText(o.bless, true)}, ${this.modText(o.curse, false)}`, 4000);
    }
    this.openPick(); // the next one, if more are waiting
  }
}
