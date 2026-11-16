// Tower weapons, part 6: Tempest, Golden Bandit (Gold Shot, Afterimages), the path towers
// (Phantom, Vanguard) and the Strawman.
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { ENEMIES, GAME, TOWERS, canHit, towerMaxHp } from '../../config.js';
import { canPlace } from '../map.js';
import { path } from '../path.js';
import { CONTACT, SEE_ALL, buffOf, r2 } from './shared.js';

const TEMPEST_NEON = 0x00b0ff;
const FIELD_TICK = 0.5; // Lightning Field: seconds between hits
const AFTERIMAGE_LIFE = 12;

export class SimWeapons6 {

  // ---------------------------------------------------------------- placing and upgrading

  /** Tower `t` was just placed by player `p` (the 'place' action). */
  onPlaced(t, p) {
    const def = TOWERS[t.type];
    if (def.keepLevel && p.keepLv?.[t.type]) {
      // Phantom / Vanguard: its upgrades stay when it is sold.
      t.level = p.keepLv[t.type];
      t.hp = t.maxHp = towerMaxHp(t.type, t.level);
    }
    if (def.placement === 'path') {
      t.pdist = path.project(t.x, t.z);
      t.route = path.multi ? path.lastRoute : 0;
      t.healW = this.wave.index;
    }
    const s = def.levels[t.level];
    if (s.tempest) {
      const tp = s.tempest;
      if (!p.tempestDone) {
        // The very first Tempest this player places: two big hits on everything near it.
        p.tempestDone = true;
        const near = this.enemiesNear(t.x, t.z, s.range, this.detects(t, s));
        for (let i = 0; i < tp.first.hits; i++) for (const e of near) if (this.enemies.has(e.id)) this.damage(t, e, tp.first.damage);
        for (const e of near) if (this.enemies.has(e.id)) this.tempestShock(e, tp.first.slow, tp.first.time, 0, 'p');
        this.events.push({ k: 'tempest', x: r2(t.x), z: r2(t.z), r: s.range, big: 1 });
      }
      this.tempestField(t, s);
    }
    if (s.phantom) this.phantomPlaced(t, s);
  }

  /** Tower `t` was just upgraded to level data `next`. */
  onUpgraded(t, next) {
    const def = TOWERS[t.type];
    const p = this.players.get(t.owner);
    if (def.keepLevel && p) (p.keepLv ??= {})[t.type] = t.level;
    if (def.bonusSell && p) (p.bonusSell ??= {})[t.type] = true; // Shi Director: a bigger refund once
    if (def.placement === 'path') {
      // Phantom / Vanguard: back to full health on every upgrade.
      t.vDown = false;
      t.hp = t.maxHp;
    }
    if (next.tempest?.upField) this.tempestField(t, next);
    this.refreshGuards(t, next); // Footman: the guards out now get the upgrade too
  }

  /** Player `p` can't place `type` again for `secs` s (Phantom: 10s after selling, 100s after dying). */
  setPlaceCd(p, type, secs) {
    if (!p || !secs) return;
    (p.placeCd ??= {})[type] = Math.max(p.placeCd[type] || 0, secs);
  }

  /** Every zombie `det` can hit within `r` of (x, z). */
  enemiesNear(x, z, r, det) {
    const out = [];
    for (const e of this.enemies.values()) if (!e.remains && canHit(det, e) && (e.x - x) ** 2 + (e.z - z) ** 2 <= r * r) out.push(e);
    return out;
  }

  /** Once a tick: placement waits, path towers blocking zombies, Afterimage cooldowns. */
  pathTowerTick(dt) {
    for (const p of this.players.values()) {
      if (!p.placeCd) continue;
      for (const k in p.placeCd) if ((p.placeCd[k] -= dt) <= 0) delete p.placeCd[k];
    }
    for (const t of this.towers.values()) {
      if (t.imgCd > 0) t.imgCd -= dt; // Golden Bandit
      const def = TOWERS[t.type];
      if (def.placement !== 'path') continue;
      const s = def.levels[t.level];
      if (t.ghostT > 0) t.ghostT -= dt;
      if (t.buffT > 0) t.buffT -= dt;
      if (t.superT > 0) t.superT -= dt;
      if (t.healW !== this.wave.index && this.wave.state === 'wave') {
        // A new wave: back to full health.
        t.healW = this.wave.index;
        if (t.vDown) this.vanguardUp(t, t.maxHp);
        else t.hp = t.maxHp;
      }
      if (s.van) this.vanguardShield(t, s, dt);
      if (s.van) t.charge = (t.vShield || 0) / 100; // shown in the tower panel
      if (t.hp <= 0 || t.vDown || t.ghostT > 0) continue;
      // Zombies on its route that touch it stop there and hit it.
      let hurt = 0;
      for (const e of this.enemies.values()) {
        if (e.flying || e.remains || e.route !== t.route || ENEMIES[e.type].noCollide) continue;
        if (Math.abs(e.dist - t.pdist) > CONTACT) continue;
        e.holdT = Math.max(e.holdT || 0, 0.1);
        hurt += ENEMIES[e.type].damage * GAME.unitContact * dt;
      }
      if (hurt > 0) this.hurtTower(t, hurt, true);
    }
  }

  // ---------------------------------------------------------------- Tempest

  /**
   * Tempest Shock on zombie `e`: a `slow` for `time` s. `kind` keeps the attack Shocks ('a') and
   * field Shocks ('f') apart: each new one of a kind is `decay` weaker than the last. Bosses get a third.
   */
  tempestShock(e, slow, time, decay, kind) {
    if (e.shockImmune || e.statusImmune || !(slow > 0)) return;
    const key = `ts${kind}`;
    const n = e[key] || 0;
    e[key] = n + 1;
    let v = slow * (1 - decay) ** n;
    if (e.boss) v /= 3;
    e.shock = Math.max(e.shockT > 0 ? e.shock : 0, v);
    e.shockT = Math.max(e.shockT || 0, time);
  }

  /** A Lightning Field around Tempest `t` (level data `s`): adds its time to any field already up. */
  tempestField(t, s) {
    t.active = Math.max(0, t.active || 0) + s.tempest.field.time;
    this.events.push({ k: 'tempest', x: r2(t.x), z: r2(t.z), r: s.range * buffOf(this.buffs, t.id).range });
  }

  /** Tempest: Lightning Field hits, then punches (splash and Shock from Lv 2). */
  updateTempest(t, s, dt) {
    const tp = s.tempest;
    const b = buffOf(this.buffs, t.id);
    const det = this.detects(t, s);
    const range = s.range * b.range;
    if (t.active > 0) {
      t.fieldAcc = (t.fieldAcc || 0) + dt;
      while (t.fieldAcc >= FIELD_TICK) {
        t.fieldAcc -= FIELD_TICK;
        const f = tp.field;
        const hit = [];
        for (const e of this.enemiesNear(t.x, t.z, range, det)) {
          const d = Math.min(f.max, Math.max(f.min, f.pct * e.hp)) * FIELD_TICK;
          this.damage(t, e, d);
          if (hit.length < 6) hit.push(e.id);
          if (tp.shock && this.enemies.has(e.id) && !(e.shockT > 0)) this.tempestShock(e, tp.shock.slow, tp.shock.time, tp.shock.fieldDecay, 'f');
        }
        if (hit.length) this.events.push({ k: 'tField', t: t.id, es: hit });
      }
    } else t.fieldAcc = 0;
    const target = this.findTarget(t, s, t.x, t.z, range, null);
    if (!target) {
      t.tRow = 0; // "in a row" starts over
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.yaw = Math.atan2(target.x - t.x, target.z - t.z);
    if (t.cooldown > 0) return;
    t.cooldown += s.cooldown;
    this.events.push({ k: 'shot', t: t.id, e: target.id });
    const hits = s.splash ? this.enemiesNear(target.x, target.z, s.splash, det) : [target];
    if (s.splash) this.events.push({ k: 'quake', x: r2(target.x), z: r2(target.z), r: s.splash, c: TEMPEST_NEON, soft: 1 });
    for (const e of hits) {
      this.damage(t, e, s.damage * b.dmg);
      if (tp.shock && this.enemies.has(e.id)) this.tempestShock(e, tp.shock.slow, tp.shock.time, tp.shock.decay, 'a');
    }
    if (tp.every && (t.tRow = (t.tRow || 0) + 1) >= tp.every) {
      t.tRow = 0;
      this.tempestField(t, s);
    }
  }

  // ---------------------------------------------------------------- Golden Bandit

  /** Golden Bandit (or one of its Afterimages) hit zombie `e`: Gold Shot. */
  goldMark(t, s, e) {
    const g = s.gold;
    if (t.afterimg && !g.img) return; // Afterimages only spread Gold Shot from Lv 4
    const by = t.afterimg || t.id;
    if (e.gold) {
      e.gold.pct = Math.max(e.gold.pct, g.pct);
      e.gold.cap = Math.max(e.gold.cap, g.cap);
      e.gold.by = by;
      return;
    }
    e.gold = { pct: g.pct, cap: g.cap, got: 0, by };
  }

  /**
   * Extra cash Gold Shot adds to `v` cash from damaging `e` with tower `t` (never past its cap).
   * Glided: the Golden Bandit's own hits pay twice as much.
   */
  goldCash(t, e, v) {
    const g = e.gold;
    let extra = v * g.pct;
    const ts = t && TOWERS[t.type]?.levels[t.level];
    if (ts?.gold?.double) extra += v;
    extra = Math.max(0, Math.min(extra, g.cap - g.got));
    g.got += extra;
    return extra;
  }

  /** A zombie with Gold Shot died: its Golden Bandit leaves an Afterimage near itself. */
  goldDeath(e) {
    const src = this.towers.get(e.gold.by);
    if (!src || src.holo || src.imgCd > 0) return;
    const def = TOWERS[src.type];
    const s = def.levels[src.level];
    if (!s.gold) return;
    const towers = [...this.towers.values()];
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 3 + Math.random() * 4;
      const x = r2(src.x + Math.cos(a) * d);
      const z = r2(src.z + Math.sin(a) * d);
      if (!canPlace(x, z, towers, def.placement, src.type)) continue;
      src.imgCd = s.gold.cd;
      const t = this.newTower(src.owner, src.type, x, z, 0, 0);
      t.level = src.level;
      t.hp = t.maxHp = towerMaxHp(t.type, t.level);
      t.targetMode = src.targetMode;
      t.holo = t.holoMax = AFTERIMAGE_LIFE;
      t.afterimg = src.id;
      this.events.push({ k: 'place', id: t.id, owner: src.owner, x, z, holo: 1 });
      return;
    }
  }

  /** An Afterimage fades: its owner gets base cash + its damage; Share Relic cuts nearby upgrade prices. */
  afterimageEnd(t) {
    const s = TOWERS[t.type].levels[t.level].gold;
    if (!s) return;
    const cash = Math.round(s.base + (t.damageDealt || 0));
    const p = this.players.get(t.owner);
    if (p) p.cash += cash;
    this.events.push({ k: 'chaos', x: r2(t.x), z: r2(t.z), text: `+$${cash}`, color: '#ffd740' });
    const src = this.towers.get(t.afterimg);
    const ss = src && TOWERS[src.type].levels[src.level];
    if (!ss?.gold?.share) return;
    const r = ss.range * buffOf(this.buffs, src.id).range;
    const off = Math.round(cash * ss.gold.share);
    for (const o of this.towers.values()) {
      if (o.holo || (o.x - src.x) ** 2 + (o.z - src.z) ** 2 > r * r) continue;
      o.nextOff = (o.nextOff || 0) + off;
    }
  }

  // ---------------------------------------------------------------- Phantom and Vanguard

  /** Phantom placed: a placement blast (Lv 4), a damage boost (Lv 3) and Ghosting (Lv 4). */
  phantomPlaced(t, s) {
    const ph = s.phantom;
    if (ph.buff) t.buffT = ph.buffT;
    if (ph.ghost) t.ghostT = ph.ghost;
    if (!ph.boom) return;
    const near = this.enemiesNear(t.x, t.z, s.range, SEE_ALL);
    for (const e of near) {
      this.damage(t, e, ph.boom);
      if (ph.slow && this.enemies.has(e.id)) this.applySlime(e, { slow: ph.slow, time: 1.5, boss: 1 });
    }
    this.events.push({ k: 'boom', x: r2(t.x), z: r2(t.z), r: s.range, neuro: 1 });
  }

  /** Phantom / Vanguard: swings at the closest zombie in range. */
  updatePathTower(t, s, dt) {
    const b = buffOf(this.buffs, t.id);
    const target = this.findTarget(t, s, t.x, t.z, s.range * b.range, null);
    if (!target) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.yaw = Math.atan2(target.x - t.x, target.z - t.z);
    if (t.cooldown > 0) return;
    t.cooldown += s.cooldown;
    this.events.push({ k: 'shot', t: t.id, e: target.id });
    let dmg = s.damage * b.dmg;
    if (s.phantom?.buff && t.buffT > 0) dmg *= s.phantom.buff; // Delusion / Void Opus
    const v = s.van;
    const n = v ? this.smashCharges(t, v) : 0;
    if (!n) return this.damage(t, target, dmg);
    // Charged Smash: n smashes in one, stacking their damage and shield.
    const det = this.detects(t, s);
    for (const e of this.enemiesNear(target.x, target.z, v.radius, det)) this.damage(t, e, dmg * v.mult * n);
    this.events.push({ k: 'quake', x: r2(target.x), z: r2(target.z), r: v.radius, c: 0xffab40 });
    if (v.shield && !t.vDown) {
      const cap = t.superT > 0 ? Infinity : v.max;
      t.vShield = Math.min(cap, (t.vShield || 0) + v.shield * n);
      t.vIdle = 0;
    }
    if (n > 1) this.events.push({ k: 'chaos', x: r2(t.x), z: r2(t.z), text: `Smash x${n}!`, color: '#ffab40' });
  }

  /** Vanguard: how many Charged Smashes this swing uses (0 = a normal swing). */
  smashCharges(t, v) {
    if (!v.smash) return 0;
    if (t.superT > 0) return 5; // Supercharge
    if (v.charges) {
      const n = t.vCh || 0;
      t.vCh = 0;
      return n;
    }
    if (!t.vReady) return 0;
    t.vReady = false;
    return 1;
  }

  /** Vanguard upkeep (every tick, even when stunned): smash charging, shield fading and regen. */
  vanguardShield(t, s, dt) {
    const v = s.van;
    if (v.smash) {
      t.smashT = (t.smashT ?? v.cd) - dt;
      if (t.smashT <= 0) {
        t.smashT += v.cd;
        if (v.charges) t.vCh = Math.min(v.charges, (t.vCh || 0) + 1);
        else t.vReady = true;
      }
    }
    if (!(t.vShield > 0) && !v.regen) return;
    t.vIdle = (t.vIdle || 0) + dt;
    if (t.vIdle > v.wait && t.vShield > 0) t.vShield = Math.max(0, t.vShield - v.decay * dt);
    if (v.regen && !t.vDown && (t.vShield || 0) < 390) t.vShield = Math.min(390, (t.vShield || 0) + v.regen * dt);
  }

  /** Vanguard fell: it lies down and heals until it gets back up (see vanguardDowned). */
  vanguardDown(t) {
    t.hp = 0;
    t.vDown = true;
    t.vDownT = 0;
    t.vShield = 0;
    this.events.push({ k: 'chaos', x: r2(t.x), z: r2(t.z), text: 'Downed!', color: '#ffab40' });
  }

  /** Vanguard gets back up with `hp` health. */
  vanguardUp(t, hp) {
    t.vDown = false;
    t.hp = Math.min(t.maxHp, hp);
    this.events.push({ k: 'towerUp', id: t.id, owner: t.owner, x: t.x, z: t.z });
  }

  /**
   * A downed Vanguard (call before the stun check: it may still swing). Heals after 1s, faster
   * while zombies are near from Lv 2 (Last Stand, and it keeps swinging); gets up at full health,
   * or right away at half health from Lv 3. Returns true (nothing else runs while it is down).
   */
  vanguardDowned(t, s, dt) {
    const v = s.van;
    t.vDownT += dt;
    const near = v.stand && this.findTarget(t, s, t.x, t.z, s.range * buffOf(this.buffs, t.id).range, null);
    if (t.vDownT >= 1) {
      if (v.half) {
        this.vanguardUp(t, t.maxHp * 0.5);
        return true;
      }
      t.hp = Math.min(t.maxHp, t.hp + t.maxHp * (near ? 0.25 : 0.1) * dt);
      if (t.hp >= t.maxHp) {
        this.vanguardUp(t, t.maxHp);
        return true;
      }
    }
    if (near && !(t.stunT > 0)) this.updatePathTower(t, s, dt);
    return true;
  }

  /**
   * Vanguard Resuscitation: healing past full health turns into shield, 2 for every 1% of its
   * max health. Returns the shield added.
   */
  vanguardExcess(t, amount) {
    const v = TOWERS[t.type].levels[t.level].van;
    if (!v?.half || t.vDown) return 0;
    const over = t.hp + amount - t.maxHp;
    if (over <= 0) return 0;
    const add = (over / t.maxHp) * 100 * 2;
    const cap = t.superT > 0 ? Infinity : v.max;
    t.vShield = Math.min(cap, (t.vShield || 0) + add);
    return add;
  }

  // ---------------------------------------------------------------- Strawman

  /**
   * Strawman: zombies in range are faster (Vengeful) or slower (Benevolent). Vengeful also hits
   * every zombie in range for sqrt(max health), at most `cap`. Nothing until a mode is picked.
   */
  updateStrawman(t, s, dt) {
    if (!t.mode) return;
    const c = s.crow;
    const b = buffOf(this.buffs, t.id);
    const r = s.range * b.range;
    const all = this.enemiesNear(t.x, t.z, r, SEE_ALL);
    for (const e of all) {
      if (c.haste) e.crowH = Math.max(e.crowT > 0 ? e.crowH || 0 : 0, c.haste);
      if (c.slow && !e.statusImmune) e.crowS = Math.max(e.crowT > 0 ? e.crowS || 0 : 0, e.boss ? c.slow / 2 : c.slow);
      e.crowT = 0.25;
    }
    if (!c.cap) return;
    t.cooldown = Math.max(-dt, t.cooldown - dt * b.rate);
    if (t.cooldown > 0) return;
    const det = this.detects(t, s);
    const hits = all.filter((e) => canHit(det, e));
    if (!hits.length) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.cooldown += s.cooldown;
    this.events.push({ k: 'quake', x: r2(t.x), z: r2(t.z), r, c: 0xff3d00, soft: 1 });
    for (const e of hits) if (this.enemies.has(e.id)) this.damage(t, e, Math.min(c.cap, Math.sqrt(e.maxHp)) * b.dmg);
  }

  /** Strawman: may player `pid`'s tower `t` take mode `mode` ('v' / 'b')? An error message, or null. */
  crowModeWhy(t, mode) {
    if (t.mode) return 'Its mode is already picked';
    for (const o of this.towers.values()) {
      if (o !== t && o.owner === t.owner && o.mode === mode && TOWERS[o.type].modePick) return `You already have a ${mode === 'v' ? 'Vengeful' : 'Benevolent'} Strawman`;
    }
    return null;
  }

  /** Strawman: picks mode `mode`. Benevolent turns it into its Bottom path type. */
  crowMode(t, mode) {
    t.mode = mode;
    const def = TOWERS[t.type];
    if (mode === 'b' && def.branch) t.type = def.branch;
    this.events.push({ k: 'chaos', x: r2(t.x), z: r2(t.z), text: mode === 'v' ? 'The Vengeful' : 'The Benevolent', color: mode === 'v' ? '#ff3d00' : '#69f0ae' });
  }
}
