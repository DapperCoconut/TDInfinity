// Keeping the picture up to date: reconcile (views match the sim), the HUD and the camera.
// These are methods of GameClient: game.js puts them on the class, so "this" is the game client.

import { ENEMIES, GAME, TOWERS, VERSUS, difficulty, facesCone, rootType } from '../config.js';
import { BeamView, BombView, EnemyView, MarkView, OrbView, RemotePlayerView, TowerView, TrapView, UnitView } from '../views.js';
import { audio } from '../audio.js';
import { subInfo } from '../substats.js';
import { clamp } from '../utils.js';
import { WORLD_SCALE } from '../scale.js';
import { heightAt } from '../sim/map.js';
import { borrowsHidden, buffOf, computeBuffs, mediCharge, medicShields, nextUpgrade, spyCircles } from '../sim/sim.js';
import { CAM_GROUND_GAP, CAM_PITCH_MIN, EMPTY, innerRings, ringRadius } from './shared.js';

export class GameView {

  /** Create/update/remove views so they match the session state. */
  reconcile(realDt, gdt) {
    const st = this.state;
    if (!!st.timeWorld !== !!this.timeShown) this.showTimeWorld(st.timeWorld);
    this.syncContract(realDt); // Contracts (Last Laugh): the little jester, fences, the open court's route
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
    this.ui.setBase(this.versus ? (this.me?.baseHp ?? 0) : st.baseHp, this.versus ? GAME.baseHp : difficulty(st.mode).baseHp ?? GAME.baseHp);
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
      this.ui.updatePanel(sel, { myId: s.myId, cash: this.myCash, mp: s.mp, versus: this.versus, borrowed, buff, upCost, upCostB, upTop, upBot, boosting, upgradeLock: (type, next) => this.upgradeLock(type, next), ownerName: st.players.get(sel.owner)?.name ?? 'a player who left' });
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
}
