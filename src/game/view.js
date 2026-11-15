// Keeping the picture up to date: reconcile (views match the sim), the HUD and the camera.
// These are methods of GameClient: game.js puts them on the class, so "this" is the game client.

import * as THREE from 'three';
import { ENEMIES, GAME, TOWERS, VERSUS, difficulty, facesCone, rootType } from '../config.js';
import { BeamView, BombView, EnemyView, MarkView, OrbView, RemotePlayerView, TowerView, TrapView, UnitView } from '../views.js';
import { audio } from '../audio.js';
import { subInfo } from '../substats.js';
import { SandboxBar } from '../sandboxbar.js';
import { clamp } from '../utils.js';
import { MODEL_SCALE as K, WORLD_SCALE } from '../scale.js';
import { heightAt, mapInfo } from '../sim/map.js';
import { ST_AIRBORNE, ST_ARMORED, ST_BIOHAZARD, ST_BURNING, ST_CHARGING, ST_CHILLED, ST_CLOAKED, ST_CONFUSED, ST_DANCE, ST_ENRAGED, ST_FLOAT, ST_FROZEN, ST_GASSED, ST_GLITCHED, ST_HACKED, ST_HASTED, ST_MUTANT, ST_SHOCKED, ST_SHROOM, ST_SLIMED, ST_SMOKED, ST_STUNNED, ST_VOIDARMOR, ST_VOIDAURA } from '../sim/sim.js';
import { CITADEL, borrowsHidden, buffOf, computeBuffs, mediCharge, medicShields, nextUpgrade, spyCircles } from '../sim/sim.js';
import { CAM_GROUND_GAP, CAM_PITCH_MIN, EMPTY, innerRings, ringRadius } from './shared.js';
const CLOSE_ZOOM = 7; // camera closer than this (drawn units) hides your own player

export class GameView {

  /** Create/update/remove views so they match the session state. */
  reconcile(realDt, gdt) {
    const st = this.state;
    if (!!st.timeWorld !== !!this.timeShown) this.showTimeWorld(st.timeWorld);
    this.syncContract(realDt); // Contracts (Last Laugh): the little jester, fences, the open court's route
    this.syncInhuman(realDt); // Inhuman contract: the glitchy bot's black specks
    this.syncLiminal(realDt); // Liminal contract: Sunken Canyon's glitchy pit, the Backrooms shifting
    this.syncPhone(realDt); // Mysterious Call contract: the phone ringing by the cemetery chapel
    // Beholder time bombs stuck to towers.
    this.bombViews ??= new Map();
    const bombs = st.bombs ?? [];
    for (const b of bombs) {
      let v = this.bombViews.get(b.id);
      if (!v) this.bombViews.set(b.id, (v = new BombView(this.scene, b)));
      v.sync(b, realDt);
    }
    for (const [id, v] of this.bombViews) {
      if (bombs.some((b) => b.id === id)) continue;
      v.dispose();
      this.bombViews.delete(id);
    }
    // Void mode: VOID's marks over towers and his magic missiles on the path.
    this.markViews ??= new Map();
    this.orbViews ??= new Map();
    this.syncList(this.markViews, st.marks ?? [], (k) => new MarkView(this.scene, k), realDt);
    this.syncList(this.orbViews, st.orbs ?? [], (o) => new OrbView(this.scene, o), realDt);
    // Gold Commander Orbital Airstrike beams.
    this.beamViews ??= new Map();
    this.syncList(this.beamViews, st.beams ?? [], (b) => new BeamView(this.scene, b), realDt);
    this.effects.setVoid(st.voidLevel ?? 0);
    for (const t of st.towers.values()) {
      let v = this.towerViews.get(t.id);
      if (!v) {
        v = new TowerView(this.scene, t, st.players.get(t.owner)?.color ?? 0x888888);
        this.towerViews.set(t.id, v);
        if (t.id === this.selectedId) v.setSelected(true);
      }
      v.sync(t, gdt);
      v.syncHp(t, this.camera);
    }
    for (const [id, v] of this.towerViews) {
      if (st.towers.has(id)) continue;
      if (id === this.selectedId) this.deselect();
      v.dispose();
      this.towerViews.delete(id);
    }

    let embers = false; // the Molten Warlord fills the sky with embers
    let armada = false; // the Overlord's starships darken the sky
    let chrono = false; // the Beholder turns the sky violet and fills it with clock dust
    let boss = null; // VOID, for the big health bar
    for (const e of st.enemies.values()) {
      let v = this.enemyViews.get(e.id);
      if (!v) {
        v = new EnemyView(this.scene, e);
        this.enemyViews.set(e.id, v);
        if (v.def.embers) {
          audio.waveStart();
          this.ui.toast(`🔥 ${v.def.name} has arrived! The world burns…`, 3500);
        } else if (v.def.jack) {
          // Halloween Jack laughs (his theme plays while he's alive, like every boss's: audio.musicGame).
          audio.laugh();
          this.shake(1, 2);
          this.ui.screenFlash('#ff6d00', 900);
          this.ui.banner('JACK', 'The Pumpkin King of Lantern Hill', 5000);
          this.ui.toast(v.def.intro, 6000);
        } else if (v.def.arrive) {
          // The False Void / VOID arrives: the world goes dark purple.
          const a = v.def.arrive;
          audio.waveStart();
          audio.boom(8);
          this.shake(1.6, 3);
          this.ui.screenFlash('#4a0072', 1500);
          this.ui.banner(a.title, a.sub, 5500);
          this.ui.toast(a.toast, 6000);
        } else if (v.def.intro && !this.introduced?.has(e.type)) {
          // Hard mode bosses announce themselves the first time they show up.
          (this.introduced ??= new Set()).add(e.type);
          audio.waveStart();
          this.ui.toast(v.def.intro, 3500);
        }
      }
      if (v.def.embers) embers = true;
      if (v.def.armada) armada = true;
      if (v.def.chrono) chrono = true;
      if (v.def.voidWorld && (!boss || v.def.voidWorld > (ENEMIES[boss.type].voidWorld ?? 0))) boss = e;
      else if (v.def.bar && (!boss || (!ENEMIES[boss.type].voidWorld && e.maxHp > boss.maxHp))) boss = e; // Hardcore bosses (the biggest one)
      v.sync(e, gdt, this.camera);
    }
    // VOID's health bar across the top of the screen.
    this.ui.bossBar(boss && !st.over ? {
      name: ENEMIES[boss.type].barName ?? ENEMIES[boss.type].name,
      sub: (ENEMIES[boss.type].barSub ?? '') + (boss.noTarget ? ' · can\'t be hurt right now' : ''),
      frac: boss.hp / boss.maxHp,
      // Void armor (wave 45 False Void), Hardcore shields (the local sim has raw amounts, snapshots shares).
      shield: (boss.vShieldMax ? boss.vShield / boss.vShieldMax : boss.vShield) || (boss.oshMax ? boss.osh / boss.oshMax : boss.osh) || 0,
      phase2: ENEMIES[boss.type].voidWorld > 1,
    } : null);
    this.effects.setEmbers(embers);
    this.effects.setArmada(armada);
    this.effects.setChrono(chrono);
    for (const t of st.towers.values()) this.towerViews.get(t.id)?.updateBeam(t, this.enemyViews);
    for (const u of st.units.values()) {
      let v = this.unitViews.get(u.id);
      if (v && v.kind !== u.model) {
        // A Gold Commander cyber tank turned into its ghost: rebuild it with the new look.
        v.dispose();
        v = null;
      }
      if (!v) {
        v = new UnitView(this.scene, u);
        this.unitViews.set(u.id, v);
      }
      v.sync(u, gdt, this.camera);
    }
    for (const [id, v] of this.unitViews) {
      if (st.units.has(id)) continue;
      v.dispose();
      this.unitViews.delete(id);
    }
    const traps = st.traps ?? EMPTY;
    for (const tr of traps.values()) {
      let v = this.trapViews.get(tr.id);
      if (!v) {
        v = new TrapView(this.scene, tr);
        this.trapViews.set(tr.id, v);
      }
      v.sync(tr, realDt);
    }
    for (const [id, v] of this.trapViews) {
      if (traps.has(id)) continue;
      v.dispose();
      this.trapViews.delete(id);
    }
    // Medics: medi beams to the towers they shield.
    const shields = medicShields(st.towers.values());
    const byMedic = new Map();
    for (const [id, m] of shields) {
      const tv = this.towerViews.get(id);
      if (!tv) continue;
      if (!byMedic.has(m.id)) byMedic.set(m.id, []);
      byMedic.get(m.id).push(tv);
    }
    for (const t of st.towers.values()) {
      const lv = TOWERS[t.type].levels[t.level];
      if (lv.bless) {
        // Priest: a glowing link to the tower it blesses.
        const pv = t.lock ? this.towerViews.get(t.lock) : null;
        this.towerViews.get(t.id)?.updateLinks(pv ? [pv] : [], false);
        continue;
      }
      if (lv.beamHeal) {
        // Medigun Medic: one beam to its patient (blue during Uber, red during Kritz).
        const pv = t.lock ? this.towerViews.get(t.lock) : null;
        const charge = t.active > 0 ? mediCharge(lv)?.key : null;
        this.towerViews.get(t.id)?.updateLinks(pv ? [pv] : [], charge === 'uberBeam' ? 'uber' : charge ? 'kritz' : false);
        continue;
      }
      if (!lv.shields) continue;
      this.towerViews.get(t.id)?.updateLinks(byMedic.get(t.id) ?? [], t.active > 0);
    }
    for (const [id, v] of this.enemyViews) {
      if (st.enemies.has(id)) continue;
      v.dispose();
      this.enemyViews.delete(id);
    }
    for (let i = this.dying.length - 1; i >= 0; i--) {
      const v = this.dying[i];
      v.updateDying(gdt || realDt);
      if (v.done) {
        v.dispose();
        this.dying.splice(i, 1);
      }
    }

    for (const p of st.players.values()) {
      if (p.id === this.session.myId) continue;
      let v = this.remoteViews.get(p.id);
      if (!v) {
        v = new RemotePlayerView(this.scene, p);
        this.remoteViews.set(p.id, v);
      }
      v.update(realDt, this.session.remotePos.get(p.id));
    }
    for (const [id, v] of this.remoteViews) {
      if (st.players.has(id)) continue;
      v.dispose();
      this.remoteViews.delete(id);
    }
  }

  updateHud(realDt) {
    this.uiTimer -= realDt;
    if (this.uiTimer > 0) return;
    this.uiTimer = 0.1;
    const s = this.session;
    const st = s.state;
    this.ui.setCash(this.myCash);
    this.ui.setOverload(st.overload?.get(s.myId) ?? 0); // Eradicator ΘVERLOAD
    this.ui.setArcana(st.arcana?.get(s.myId) ?? 0); // Mage Arcana
    const gate = !this.versus && mapInfo?.gate; // Frostgate Citadel: the gate's health is the base's
    const sandbox = !this.versus && difficulty(st.mode).sandbox;
    if (sandbox && !this.sbBar && !this.spectating) this.sbBar = new SandboxBar((m) => this.session?.send(m)); // Sandbox: the bar under the health bar
    this.ui.setBase(this.versus ? (this.me?.baseHp ?? 0) : st.baseHp, this.versus ? GAME.baseHp : gate || (difficulty(st.mode).baseHp ?? GAME.baseHp), sandbox && !st.sbMortal);
    this.ui.setRepair(gate && !this.spectating ? mapInfo.repair : null, st.baseHp < gate);
    this.ui.setWave(st, s.mp, this.spectating);
    this.ui.setSpeed(st.speed, s.isHost);
    if (st.versus) {
      this.ui.setVersusBoard(st.players, s.myId);
      this.ui.updateSend(this.myCash, st.wave, st.players.get(this.me?.target)?.name, this.spectating || this.ended);
    } else if (s.mp) this.ui.setScoreboard(st.players, s.myId);
    let boss = null;
    // The toughest boss gets the bar (the Beholder, not the Time Titans it summons).
    for (const e of st.enemies.values()) if (ENEMIES[e.type].boss && (e.lane ?? 0) === this.myLane && !(boss?.maxHp > e.maxHp)) boss = { ...e, def: ENEMIES[e.type] };
    this.ui.setBoss(boss);
    const counts = {};
    for (const t of st.towers.values()) if (t.owner === s.myId) counts[rootType(t.type)] = (counts[rootType(t.type)] || 0) + 1;
    this.ui.updateHotbar(this.myCash, counts, this.placing, this.spectating);
    this.ui.updateAbilityBar(this.abilityGroups(), this.myCash, this.spectating || this.ended);
    const sel = st.towers.get(this.selectedId);
    if (sel) {
      const borrowed = borrowsHidden(sel, spyCircles(st.towers.values()));
      const buffs = computeBuffs(st.towers.values());
      const buff = buffOf(buffs, sel.id);
      const def = TOWERS[sel.type];
      // Upgrade paths: what the next Top / Bottom upgrade costs (crosspath towers can have both).
      const upTop = nextUpgrade(sel, 'top', st.towers.values(), buffs);
      const upBot = nextUpgrade(sel, 'bottom', st.towers.values(), buffs);
      const upCost = upTop?.cost ?? (def.cross ? 0 : 0);
      const upCostB = upBot?.cost ?? 0;
      const aura = TOWERS[sel.type].levels[sel.level].aura ?? 0;
      let boosting = 0;
      if (TOWERS[sel.type].levels[sel.level].beamHeal) boosting = sel.lock ? 1 : 0;
      else if (TOWERS[sel.type].levels[sel.level].shields) {
        for (const m of medicShields(st.towers.values()).values()) if (m.id === sel.id) boosting++;
      } else for (const o of st.towers.values()) if (o.type !== sel.type && (o.x - sel.x) ** 2 + (o.z - sel.z) ** 2 <= aura * aura) boosting++;
      this.ui.updatePanel(sel, { myId: s.myId, cash: this.myCash, mp: s.mp, versus: this.versus, borrowed, buff, upCost, upCostB, upTop, upBot, boosting, upgradeLock: (type, next) => this.upgradeLock(type, next), ownerName: st.players.get(sel.owner)?.name ?? (sel.owner === CITADEL ? 'the Citadel' : 'a player who left') });
      const smoked = sel.fx & 1 && !TOWERS[sel.type].kind && !TOWERS[sel.type].orbit;
      const r = ringRadius(sel.type, sel.level, buff, sel.x, sel.z) * (smoked ? VERSUS.smokeRange : 1);
      if (this.aiming) {
        // the aim ring is drawn by updateGhost
      } else if (facesCone(def)) this.showCone(sel.x, sel.z, r, sel.face ?? sel.yaw, def.levels[sel.level].cone, 0xffffff);
      else if (r > 0) this.showRing(def.heli ? sel.cx ?? sel.x : sel.x, def.heli ? sel.cz ?? sel.z : sel.z, r, 0xffffff, innerRings(sel.type, sel.level));
      else this.ring.visible = this.cone.visible = false;
    } else if (this.selectedSub) {
      const sub = this.selectedSub;
      const towerId = sub.kind === 'plane' ? sub.id : sub.kind === 'trap' ? st.traps?.get(sub.id)?.tower : st.units.get(sub.id)?.tower;
      const buff = towerId != null ? buffOf(computeBuffs(st.towers.values()), towerId) : null;
      const info = subInfo(st, sub, buff);
      if (!info) return this.deselect(); // it broke, died or was sold
      this.subRing = { range: info.range };
      this.ui.updateSubPanel(info, { myId: s.myId, mp: s.mp, ownerName: st.players.get(info.owner)?.name ?? 'a player who left' });
    } else if (!this.placing) this.cone.visible = false;
    if (this.fps) this.updateFpsHud();
  }

  // ------------------------------------------------------------------ camera

  updateCamera(dt) {
    if (this.fps && this.fpsCamera()) return;
    const cam = this.cam;
    const k = this.keys;
    if (this.session && !this.ui.chatOpen) {
      if (k.has('ArrowLeft')) cam.yaw += dt * 2.2;
      if (k.has('ArrowRight')) cam.yaw -= dt * 2.2;
      if (k.has('ArrowUp')) cam.pitch = clamp(cam.pitch + dt * 1.2, CAM_PITCH_MIN, 1.4);
      if (k.has('ArrowDown')) cam.pitch = clamp(cam.pitch - dt * 1.2, CAM_PITCH_MIN, 1.4);
    }
    if (this.player) {
      const p = this.player.pos;
      this.player.h.root.visible = cam.dist > CLOSE_ZOOM; // zoomed right in: hide yourself so you can see
      cam.target.lerp({ x: p.x * WORLD_SCALE, y: p.y * WORLD_SCALE + 4, z: p.z * WORLD_SCALE }, Math.min(1, dt * 12));
    }
    const cp = Math.cos(cam.pitch);
    const cx = cam.target.x + Math.sin(cam.yaw) * cp * cam.dist;
    const cz = cam.target.z + Math.cos(cam.yaw) * cp * cam.dist;
    // The camera can swing all the way down to the ground (and look up a little), but never under it.
    const ground = heightAt(cx / WORLD_SCALE, cz / WORLD_SCALE) * WORLD_SCALE + CAM_GROUND_GAP;
    this.camera.position.set(cx, Math.max(ground, cam.target.y + Math.sin(cam.pitch) * cam.dist), cz);
    this.camera.lookAt(cam.target);
    if (this.shakeT > 0) {
      // VOID's slams, punches and arrival shake the camera.
      this.shakeT = Math.max(0, this.shakeT - dt);
      const a = this.shakeAmt * (this.shakeT / this.shakeMax);
      this.camera.position.x += (Math.random() - 0.5) * a;
      this.camera.position.y += (Math.random() - 0.5) * a;
      this.camera.position.z += (Math.random() - 0.5) * a;
    }
  }

  /** Hovering an enemy or a friendly summon: a little card by the mouse with its name, health and what is on it. */
  updateHover() {
    let tip = this.hoverTip;
    if (!tip) {
      tip = this.hoverTip = document.createElement('div');
      tip.id = 'enemy-tip';
      document.body.appendChild(tip);
    }
    const st = this.session && !this.fps && !this.ended ? this.state : null;
    let best = null;
    if (st && this.mouseIn !== false) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const mx = (this.mouse.x + 1) * w / 2;
      const my = (1 - this.mouse.y) * h / 2;
      let bestD = Infinity;
      this.tipV ??= new THREE.Vector3();
      for (const v of this.enemyViews.values()) {
        if (v.dying || !st.enemies.has(v.id)) continue;
        const p = v.aimPoint(this.tipV).multiplyScalar(WORLD_SCALE); // (the map is drawn scaled down)
        const far = this.camera.position.distanceTo(p);
        p.project(this.camera);
        if (p.z > 1) continue; // behind the camera
        const sx = (p.x + 1) * w / 2;
        const sy = (1 - p.y) * h / 2;
        // How big it looks on screen: its height, seen from this far away.
        const reach = Math.max(18, Math.min(160, v.height * WORLD_SCALE * h / (2 * far * Math.tan((this.camera.fov * Math.PI) / 360)) * 0.6));
        const d = Math.hypot(sx - mx, sy - my);
        if (d < reach && d < bestD) {
          bestD = d;
          best = v;
        }
      }
      // Friendly summons (units) too.
      for (const v of this.unitViews.values()) {
        if (!st.units.has(v.id)) continue;
        const ht = (v.m.height || 2) * K;
        const p = this.tipV.copy(v.pos).setY(v.pos.y + ht * 0.5).multiplyScalar(WORLD_SCALE);
        const far = this.camera.position.distanceTo(p);
        p.project(this.camera);
        if (p.z > 1) continue;
        const sx = (p.x + 1) * w / 2;
        const sy = (1 - p.y) * h / 2;
        const reach = Math.max(18, Math.min(160, ht * WORLD_SCALE * h / (2 * far * Math.tan((this.camera.fov * Math.PI) / 360)) * 0.6));
        const d = Math.hypot(sx - mx, sy - my);
        if (d < reach && d < bestD) {
          bestD = d;
          best = v;
        }
      }
    }
    if (best instanceof UnitView) {
      this.unitTip(tip, st.units.get(best.id), st);
      return;
    }
    tip.classList.remove('ally');
    if (!best) {
      if (this.tipId != null) tip.style.display = 'none';
      this.tipId = null;
      return;
    }
    const e = st.enemies.get(best.id);
    const def = best.def;
    const key = `${e.id}|${Math.ceil(e.hp)}|${e.st}`;
    if (key !== this.tipKey) {
      this.tipKey = key;
      const good = [];
      const bad = [];
      if (def.boss) good.push('Boss');
      if (def.hidden) good.push('Hidden');
      if (def.flying) good.push('Flying');
      for (const [bit, name, isBad] of ENEMY_EFFECTS) if (e.st & bit) (isBad ? bad : good).push(name);
      const hp = def.dummy || e.maxHp === Infinity || e.hp === Infinity ? '∞' : `${Math.ceil(e.hp).toLocaleString()} / ${Math.ceil(e.maxHp).toLocaleString()}`;
      const share = !def.dummy && e.maxHp > 0 && e.maxHp !== Infinity ? Math.max(0, Math.min(1, e.hp / e.maxHp)) : 1;
      tip.innerHTML = `<div class="et-name">${def.name}</div>`
        + `<div class="et-bar"><div style="width:${share * 100}%"></div></div><div class="et-hp">❤ ${hp}</div>`
        + (good.length ? `<div class="et-good">${good.map((n) => `<span>${n}</span>`).join('')}</div>` : '')
        + (bad.length ? `<div class="et-bad">${bad.map((n) => `<span>${n}</span>`).join('')}</div>` : '');
    }
    this.tipId = e.id;
    tip.style.display = 'block';
    const x = (this.mouse.x + 1) * window.innerWidth / 2;
    const y = (1 - this.mouse.y) * window.innerHeight / 2;
    tip.style.left = `${Math.min(x + 16, window.innerWidth - tip.offsetWidth - 8)}px`;
    tip.style.top = `${Math.min(y + 16, window.innerHeight - tip.offsetHeight - 8)}px`;
  }

  /** The hover card for a friendly summon: name, the tower that sent it, health, traits and effects. */
  unitTip(tip, u, st) {
    const tower = st.towers.get(u.tower);
    const def = unitDefOf(tower?.type, u.model);
    const key = `u${u.id}|${Math.ceil(u.hp)}|${u.ust}|${u.alive}`;
    if (key !== this.tipKey) {
      this.tipKey = key;
      const good = [];
      const bad = [];
      if (def) {
        if (def.soldiers > 1) good.push(`Squad of ${u.alive}`);
        if (def.air) good.push('Flying');
        if (def.untouchable) good.push("Can't be hurt");
        if (def.hidden) good.push('Sees hidden');
        if (def.flying) good.push('Hits flyers');
        if (def.heal) good.push('Medic');
        if (def.decay) bad.push('Wearing down');
        if (def.life) bad.push(`Leaves after ${def.life}s`);
      }
      for (const [bit, name] of UNIT_EFFECTS) if (u.ust & bit) good.push(name);
      const hp = u.maxHp > 1 ? `${Math.ceil(u.hp).toLocaleString()} / ${Math.ceil(u.maxHp).toLocaleString()}` : '—';
      const share = u.maxHp > 0 ? Math.max(0, Math.min(1, u.hp / u.maxHp)) : 1;
      const from = tower ? TOWERS[tower.type]?.name : null;
      tip.innerHTML = `<div class="et-name">${def?.name ?? 'Summon'}</div>`
        + (from ? `<div class="et-from">From ${from}${tower.owner !== this.session.myId && st.players?.get?.(tower.owner)?.name ? ` (${st.players.get(tower.owner).name})` : ''}</div>` : '')
        + `<div class="et-bar"><div style="width:${share * 100}%"></div></div><div class="et-hp">❤ ${hp}</div>`
        + (good.length ? `<div class="et-good">${good.map((n) => `<span>${n}</span>`).join('')}</div>` : '')
        + (bad.length ? `<div class="et-bad">${bad.map((n) => `<span>${n}</span>`).join('')}</div>` : '');
    }
    tip.classList.add('ally');
    this.tipId = u.id;
    tip.style.display = 'block';
    const x = (this.mouse.x + 1) * window.innerWidth / 2;
    const y = (1 - this.mouse.y) * window.innerHeight / 2;
    tip.style.left = `${Math.min(x + 16, window.innerWidth - tip.offsetWidth - 8)}px`;
    tip.style.top = `${Math.min(y + 16, window.innerHeight - tip.offsetHeight - 8)}px`;
  }
}

/** Live summon states the sim sends (bits): [bit, name]. All good for the summon. */
const UNIT_EFFECTS = [[1, 'Star power'], [2, 'Ghost'], [4, 'Being healed'], [8, 'Shielded']];

/**
 * The unit def behind a summon's model: looked for in its own tower's levels first, then in every
 * tower (a unit def is any object with a `model`, a `name` and `hp`).
 */
const unitDefs = new Map();
function unitDefOf(type, model) {
  const k = `${type}|${model}`;
  if (unitDefs.has(k)) return unitDefs.get(k);
  const find = (root) => {
    const seen = new Set();
    const walk = (o) => {
      if (!o || typeof o !== 'object' || seen.has(o)) return null;
      seen.add(o);
      if (o.model === model && typeof o.name === 'string' && o.hp != null) return o;
      for (const v of Object.values(o)) {
        const r = walk(v);
        if (r) return r;
      }
      return null;
    };
    return walk(root);
  };
  const def = (type && find(TOWERS[type]?.levels)) || find(TOWERS) || null;
  unitDefs.set(k, def);
  return def;
}

/** Status bits shown on the hover card: [bit, name, bad for the enemy]. */
const ENEMY_EFFECTS = [
  [ST_FROZEN, 'Frozen', true], [ST_STUNNED, 'Stunned', true], [ST_BURNING, 'Burning', true], [ST_DANCE, 'Dancing', true],
  [ST_SLIMED, 'Slimed', true], [ST_CHILLED, 'Chilled', true], [ST_HACKED, 'Hacked', true], [ST_GASSED, 'Poisoned', true],
  [ST_CONFUSED, 'Confused', true], [ST_FLOAT, 'In a bubble', true], [ST_SHOCKED, 'Shocked', true], [ST_BIOHAZARD, 'Biohazard', true],
  [ST_AIRBORNE, 'Airborne', false], [ST_SHROOM, 'Mushrooms', false], [ST_ENRAGED, 'Enraged', false], [ST_SMOKED, 'In smoke', false],
  [ST_ARMORED, 'Armored', false], [ST_HASTED, 'Sped up', false], [ST_GLITCHED, 'Glitched', false], [ST_VOIDAURA, 'Void aura', false],
  [ST_CHARGING, 'Charging', false], [ST_CLOAKED, 'Cloaked', false], [ST_VOIDARMOR, 'Void armor', false], [ST_MUTANT, 'Mutant', false],
];
