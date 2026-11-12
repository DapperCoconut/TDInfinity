// Contracts on screen (see lastlaugh.js). Last Laugh: the little jester on Shattered Court's grass
// and its wheel, the open court's gold route, fences (hotbar slot 7) and placing them.
// These are methods of GameClient: game.js puts them on the class, so "this" is the game client.

import * as THREE from 'three';
import { CONTRACTS } from '../lastlaugh.js';
import { TOWER_MODELS } from '../models.js';
import { MODEL_SCALE } from '../scale.js';
import { makeNameTag } from '../views.js';
import { COURT_CELL, courtCell, courtIdx } from '../sim/maps.js';

/** What `placing` is set to while putting down fences. */
export const FENCE = '#fence';

const fenceWood = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });
const fenceDark = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
const postGeo = new THREE.BoxGeometry(0.5, 2.6, 0.5);
const railGeo = new THREE.BoxGeometry(COURT_CELL - 0.2, 0.35, 0.3);

/** A fence block for one court tile: a post in each corner and two rails on every side. */
function makeFence(mat = null) {
  const g = new THREE.Group();
  const h = COURT_CELL / 2 - 0.35;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = new THREE.Mesh(postGeo, mat ?? fenceDark);
    p.position.set(sx * h, 1.3, sz * h);
    g.add(p);
  }
  for (const y of [0.9, 1.9]) {
    for (const s of [-1, 1]) {
      const a = new THREE.Mesh(railGeo, mat ?? fenceWood);
      a.position.set(0, y, s * h);
      const b = new THREE.Mesh(railGeo, mat ?? fenceWood);
      b.position.set(s * h, y, 0);
      b.rotation.y = Math.PI / 2;
      g.add(a, b);
    }
  }
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = !mat;
  });
  return g;
}

export class GameContract {

  /** The game's contract as the snapshot sends it, unpacked (null: none). */
  contractInfo() {
    const raw = this.session?.sim ? this.session.sim.contractSnap?.() : this.state?.ct;
    if (!raw) return null;
    const [key, spins, cost, flags, x, z, route, fences, fenceCost] = raw;
    return { key, def: CONTRACTS[key], spins, cost, open: !!(flags & 1), gone: !!(flags & 2), armed: !!(flags & 4), boost: !!(flags & 8), done: !!(flags & 16), x, z, route: route || [], fences, fenceCost };
  }

  /**
   * Every frame, Inhuman contract (st.inhuman = [lane, bot id]): black glitchy specks on the
   * glitchy bot's towers and around the bot itself, and a warning when the game starts.
   */
  syncInhuman(dt) {
    const ih = this.state.inhuman;
    if (!ih) return;
    if (!this.ihShown) {
      this.ihShown = true;
      this.ui.toast(`👾 ${CONTRACTS.inhuman.botName} is not like the other bots. Its towers are stronger and the enemies it sends glitch down the path. Beat it to win the contract!`, 6000);
    }
    if ((this.ihT = (this.ihT ?? 0) - dt) > 0) return;
    this.ihT = 0.1;
    const id = ih[1];
    for (const t of this.state.towers.values()) if (t.owner === id && Math.random() < 0.6) this.effects.statusFx('glitch', t.x, 2.5, t.z, 1.4);
    const a = this.session.remotePos.get(id);
    if (a) this.effects.statusFx('glitch', a.x, (a.y ?? 0) + 2.5, a.z, 1.1);
  }

  /** Every frame: the jester, the gold route, the fences and the fence slot follow the game. */
  syncContract(dt) {
    const ct = (this.ct = this.contractInfo());
    if (!ct) return this.clearContract();
    // The little jester on the grass (gone after the yellow spin).
    if (!ct.gone && !this.llNpc) {
      const h = TOWER_MODELS.jesterChaos(3);
      h.root.scale.setScalar(MODEL_SCALE * 1.3);
      h.root.position.set(ct.x, -2.5, ct.z);
      // A tag over its head so it's easy to find.
      const tag = makeNameTag('🎡 Click me: spin the wheel!', 0xffd740);
      tag.scale.set(14, 2.4, 1);
      tag.position.y = 11;
      h.root.add(tag);
      this.llTag = tag;
      h.root.traverse((o) => (o.userData.llNpc = true));
      // A see-through ball round it so it's easy to click.
      const hit = new THREE.Mesh(new THREE.SphereGeometry(4, 10, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      hit.position.y = 4;
      hit.userData.llNpc = true;
      h.root.add(hit);
      this.scene.add(h.root);
      this.llNpc = h;
      this.llT = 0;
    }
    if (ct.gone && this.llNpc) {
      this.effects.puff(this.llNpc.root.position.clone().setY(3), 0xffd740, 30, 0.9, 14);
      this.removeNpc();
      this.closeWheel();
    }
    if (this.llNpc) {
      this.llT += dt;
      const r = this.llNpc.root;
      r.position.y = -2.5 + Math.abs(Math.sin(this.llT * 2.4)) * 0.6;
      r.lookAt(this.camera.position.x, r.position.y, this.camera.position.z);
    }
    // The open court's route: gold tiles where enemies walk now.
    const rk = ct.open ? ct.route.join() : '';
    if (rk && (rk !== this.llRouteKey || this.llRouteWorld !== this.baseWorld)) {
      this.llRouteKey = rk;
      this.llRouteWorld = this.baseWorld;
      this.baseWorld?.userData.setRoute?.(ct.route);
    }
    // Fences.
    this.llFences ??= new Map();
    const want = new Set(ct.fences);
    for (const id of want) {
      if (this.llFences.has(id)) continue;
      const f = makeFence();
      const [x, z] = courtCell(id % 40, Math.floor(id / 40) + 1);
      f.position.set(x, 0, z);
      this.scene.add(f);
      this.llFences.set(id, f);
    }
    for (const [id, f] of this.llFences) {
      if (want.has(id)) continue;
      this.scene.remove(f);
      this.llFences.delete(id);
    }
    this.ui.fenceSlot(ct.open && !this.versus ? { cost: ct.fenceCost, on: this.placing === FENCE, poor: this.myCash < ct.fenceCost } : null, () => (this.placing === FENCE ? this.cancelPlace() : this.beginFence()));
    if (this.wheelEl && !this.wheelEl.classList.contains('hidden')) this.updateWheel(ct);
  }

  removeNpc() {
    if (!this.llNpc) return;
    this.scene.remove(this.llNpc.root);
    this.llNpc.mats?.forEach((m) => m.dispose());
    this.llTag?.material.map?.dispose();
    this.llTag?.material.dispose();
    this.llTag = null;
    this.llNpc = null;
  }

  /** Takes away everything the contract put on screen (no contract, or the game stopped). */
  clearContract() {
    this.ct = null;
    this.removeNpc();
    for (const f of this.llFences?.values() ?? []) this.scene.remove(f);
    this.llFences?.clear();
    this.llRouteKey = '';
    this.llRouteWorld = null;
    if (this.fenceGhost) this.fenceGhost.visible = false;
    this.ui.fenceSlot(null);
    this.closeWheel();
  }

  /** Is the mouse on the little jester? */
  pickNpc() {
    if (!this.llNpc) return false;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    return this.raycaster.intersectObject(this.llNpc.root, true).length > 0;
  }

  // ------------------------------------------------------------------ the wheel

  /** Opens the wheel window: a big red wheel with a thin yellow slice, its price and Spin. */
  openWheel() {
    if (!this.ct || this.ct.gone) return;
    if (!this.wheelEl) {
      const el = document.createElement('div');
      el.id = 'll-wheel';
      el.className = 'hidden';
      el.innerHTML = `<div class="llw-box">
        <button class="llw-x" title="Close">✖</button>
        <h3>🃏 The Jester's Wheel</h3>
        <div class="llw-wrap"><div class="llw-pin"></div><div class="llw-disc"></div></div>
        <p class="llw-text"></p>
        <button class="llw-spin"></button>
      </div>`;
      document.body.appendChild(el);
      el.querySelector('.llw-x').onclick = () => this.closeWheel();
      el.querySelector('.llw-spin').onclick = () => this.session?.send({ a: 'spin' });
      this.wheelEl = el;
      this.wheelTurn = 0;
    }
    this.wheelEl.classList.remove('hidden');
    this.updateWheel(this.ct);
  }

  closeWheel() {
    this.wheelEl?.classList.add('hidden');
  }

  updateWheel(ct) {
    const el = this.wheelEl;
    const left = ct.def.spins - ct.spins;
    const text = ct.gone ? 'The jester is gone!' : `Spins: ${ct.spins}. Red brings more enemies. ${left} more spin${left === 1 ? '' : 's'} to go.`;
    const t = el.querySelector('.llw-text');
    if (t.textContent !== text) t.textContent = text;
    const b = el.querySelector('.llw-spin');
    const label = ct.gone ? 'Gone' : `Spin! $${ct.cost.toLocaleString()}`;
    if (b.textContent !== label) b.textContent = label;
    b.disabled = ct.gone || this.myCash < ct.cost;
  }

  /** A spin happened: the wheel turns and stops on red, or (win) on the yellow slice. */
  spinWheelFx(win) {
    if (!this.wheelEl || this.wheelEl.classList.contains('hidden')) return;
    // The yellow slice is at the top (0 deg); red is everywhere else.
    const land = win ? 0 : 30 + Math.random() * 300;
    this.wheelTurn += 1440 + ((360 - land - (this.wheelTurn % 360)) % 360 + 360) % 360;
    this.wheelEl.querySelector('.llw-disc').style.transform = `rotate(${this.wheelTurn}deg)`;
  }

  // ------------------------------------------------------------------ fences

  beginFence() {
    if (!this.session || this.ended || !this.ct?.open) return;
    if (this.myCash < this.ct.fenceCost) return this.fail(`Not enough cash! A fence costs $${this.ct.fenceCost}`);
    this.cancelPlace();
    this.deselect();
    this.placing = FENCE;
    if (!this.fenceGhost) {
      this.fenceMat = new THREE.MeshBasicMaterial({ color: 0x4caf50, transparent: true, opacity: 0.55, depthWrite: false });
      this.fenceGhost = makeFence(this.fenceMat);
      this.scene.add(this.fenceGhost);
    }
    this.fenceGhost.visible = false;
  }

  /** The tile under the mouse, as [col, row index], or null. */
  fenceTile() {
    if (!this.hasGround) return null;
    return courtIdx(this.groundHit.x, this.groundHit.z);
  }

  /** The fence ghost sits on the tile under the mouse: green where a fence can go, red on your own (click to take it away). */
  updateFenceGhost() {
    const at = this.fenceTile();
    this.ring.visible = false;
    if (!at || !this.fenceGhost) {
      if (this.fenceGhost) this.fenceGhost.visible = false;
      return;
    }
    const [c, i] = at;
    const [x, z] = courtCell(c, i + 1);
    this.fenceGhost.visible = true;
    this.fenceGhost.position.set(x, 0, z);
    const mine = this.ct?.fences.includes(i * 40 + c);
    const ok = !mine && !this.session.sim?.fenceFail?.(c, i);
    this.fenceMat.color.setHex(mine ? 0xff9800 : ok || !this.session.sim ? 0x4caf50 : 0xf44336);
  }

  /** Click while placing fences: a fence on that tile, or (on a fence) take it away. */
  tryFence() {
    const at = this.fenceTile();
    if (!at) return;
    const [c, i] = at;
    if (this.ct?.fences.includes(i * 40 + c)) return this.session.send({ a: 'unfence', c, i });
    this.session.send({ a: 'fence', c, i });
  }
}
