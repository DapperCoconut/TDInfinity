// Tower weapons, part 8: evolved towers of wave 13. Lament (Butterfly ammo, Sinking, Lament,
// Deathseeker, Salvation, Funeral, Sinking Deluge), Vulcan (stacking burns, Ignition, Burn
// Fragility, Vulcan Straight).
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { canHit } from '../../config.js';
import { buffOf, r2 } from './shared.js';

// ---------------------------------------------------------------- Lament
const BF_START = 5; // Butterfly ammo of each shade after a reload (spec)
const BF_MAX = 9; // the most of one shade (spec)
const LM_LEN = 3; // the narrow area in front: this long past the target ... (guess)
const LM_WIDTH = 1.2; // ... and this wide on each side (guess)
const SALV_STEP = 0.08; // Salvation: seconds off the wait per stack (spec)
const SALV_MAX = 5; // (spec)
const SALV_HOLD = 2; // stacks start to fade after this long without a shot (spec)
const SALV_FADE = 0.5; // then one stack goes every this many s (guess)
const FUN_IDLE = 3; // Funeral ends after this long without a shot (spec)
const DELUGE_AT = 12; // Sinking Deluge: needs this much Sinking ... (spec)
const DELUGE_USE = 8; // ... and spends this much (spec)
export const LAMENT_WHITE = 0xffffff;
export const LAMENT_BLACK = 0x7c4dff; // black shots show as a dark violet so they can be seen

// ---------------------------------------------------------------- Vulcan
const IGN_LOSE = 4; // Ignition is lost after this long without a hit (spec)
const FRAG_AT = 6; // Burn Fragility needs this much Ignition (spec)
const FRAG_TIME = 3; // Burn Fragility lasts this long after the last hit (guess)
const VS_MULT = 10; // Vulcan Straight: x damage (spec)
const VS_LEN = 8; // its area in front: this long ... (guess)
const VS_WIDTH = 2; // ... and this wide on each side (guess)
const CINCT_R = 6; // Cinctura Ignis radius (guess)
export const VULCAN_FIRE = 0xff6d00;

export class SimWeapons8 {
  /**
   * Lament. Butterfly ammo: t.bw (White), t.bb (Black), t.bnext ('w' or 'b': the next shot),
   * t.bmode ('w' White, 'b' Black, 's' Sorrow: Butterfly Gathering), t.bkills (kills since the
   * last reload). t.funeral: Funeral is on. t.salv: Salvation stacks.
   */
  updateLament(t, s, dt) {
    const L = s.lament;
    const b = buffOf(this.buffs, t.id);
    const det = this.detects(t, s);
    const range = s.range * b.range;
    t.bmode ||= 'w';
    if (L.ammo && t.bw == null) this.lamentReload(t, L, true);
    t.idle = (t.idle || 0) + dt;
    if (t.salv > 0 && t.idle > SALV_HOLD) {
      t.salvFade = (t.salvFade || 0) + dt;
      while (t.salvFade >= SALV_FADE && t.salv > 0) {
        t.salvFade -= SALV_FADE;
        t.salv--;
      }
    }
    if (t.funeral && t.idle >= FUN_IDLE) {
      t.funeral = false;
      this.lamentReload(t, L);
    }
    t.charge = L.ammo ? (t.bw + t.bb) / (BF_MAX * 2) : 0;
    const target = this.findTarget(t, s, t.x, t.z, range, null);
    if (!target) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.yaw = Math.atan2(target.x - t.x, target.z - t.z);
    if (t.cooldown > 0) return;
    let wait = s.cooldown;
    if (t.funeral) wait = L.fun;
    else if (L.salv) wait = Math.max(0.1, wait - SALV_STEP * (t.salv || 0));
    t.cooldown += wait;
    t.idle = 0;
    t.salvFade = 0;
    this.lamentShot(t, s, L, target, b, det);
  }

  /** Butterfly Gathering: White -> Black -> Sorrow -> White. */
  butterflyMode(t) {
    t.bmode = t.bmode === 'w' ? 'b' : t.bmode === 'b' ? 's' : 'w';
    if (t.bw === BF_START && t.bb === BF_START) t.bnext = t.bmode === 'w' ? 'w' : 'b'; // a fresh load starts with the mode's shade
  }

  /** Both shades back to 5, then the mode turns some of one shade into the other. */
  lamentReload(t, L, first = false) {
    t.bw = BF_START;
    t.bb = BF_START;
    const k = t.bkills || 0;
    if (!first && t.bmode === 'w') {
      const n = Math.max(2, Math.min(4, k - 1));
      t.bb -= n;
      t.bw += n;
    } else if (!first && t.bmode === 'b') {
      const n = Math.max(0, Math.min(3, 4 - k));
      t.bw -= n;
      t.bb += n;
    }
    t.bkills = 0;
    t.bnext = t.bmode === 'w' ? 'w' : 'b';
  }

  lamentShot(t, s, L, target, b, det) {
    let shade = null;
    if (L.ammo) {
      shade = t.bnext;
      if (shade === 'w' && !t.bw) shade = 'b';
      if (shade === 'b' && !t.bb) shade = 'w';
      if (shade === 'w') t.bw--;
      else t.bb--;
    }
    let sink = s.sink || 0;
    let mult = 1; // Sinking damage
    if (shade === 'w') {
      sink += 1;
      t.bb = Math.min(BF_MAX, t.bb + 1); // The Living gives back 1 Departed
    } else if (shade === 'b') mult *= 1.2;
    if (L.ammo && t.bmode === 's' && t.bb >= 3) {
      t.bb--; // Sorrow
      sink += 1;
    }
    let lament = false;
    if (L.chance) {
      const ch = L.chance + 0.2 * t.bw + (L.lv3 ? 0.1 * Math.floor(t.bb / 2) : 0);
      lament = Math.random() < ch;
    }
    if (lament) {
      sink *= 2;
      mult *= 2;
    }
    const deluge = L.deluge && (target.sink || 0) >= DELUGE_AT;
    if (deluge) target.sink -= DELUGE_USE;
    const base = s.damage * b.dmg;
    const lamentDmg = base * (L.lv3 ? 1 + 0.2 * Math.floor(t.bw / 3) : 1);
    // the narrow area: the target, and zombies close to the line just past it
    const dx = target.x - t.x;
    const dz = target.z - t.z;
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len;
    const uz = dz / len;
    const hits = [target];
    for (const e of this.enemies.values()) {
      if (e === target || e.remains || !canHit(det, e)) continue;
      const ex = e.x - target.x;
      const ez = e.z - target.z;
      const along = ex * ux + ez * uz;
      if (along < -LM_WIDTH || along > LM_LEN) continue;
      if (Math.abs(ex * uz - ez * ux) <= LM_WIDTH) hits.push(e);
    }
    this.events.push({ k: 'shot', t: t.id, e: target.id, ...(shade === 'b' ? { c: 1 } : {}) });
    if (lament) this.events.push({ k: 'quake', x: r2(target.x), z: r2(target.z), r: 1.5, c: shade === 'b' ? LAMENT_BLACK : LAMENT_WHITE, soft: 1 });
    const kills0 = t.kills;
    for (const e of hits) {
      const sure = deluge && e === target;
      this.lamentHit(t, e, sure ? base * 2 : base, mult, false, L, sure);
      if (sink && this.enemies.has(e.id)) this.addSinking(t, e, sink);
      if (lament && this.enemies.has(e.id)) this.lamentHit(t, e, lamentDmg, mult, true, L, false);
    }
    if (!L.ammo) return;
    const killed = t.kills - kills0;
    if (killed > 0) {
      t.bkills = (t.bkills || 0) + killed;
      t.bnext = t.bmode === 'w' ? 'w' : 'b';
    } else t.bnext = shade === 'w' ? 'b' : 'w';
    if (L.fun && !t.funeral && (t.bw === 0 || t.bb === 0) && t.bw + t.bb > 0) {
      t.funeral = true;
      t.salv = 0; // Salvation doesn't work with Funeral
      for (let i = 0; i < (L.funGive || 0); i++) {
        if (t.bw <= t.bb) t.bw++;
        else t.bb++;
      }
    }
    if (t.bw <= 0 && t.bb <= 0) {
      t.funeral = false;
      this.lamentReload(t, L);
    }
    if (L.salv && !t.funeral && (t.salvN = (t.salvN || 0) + 1) >= 2) {
      t.salvN = 0;
      t.salv = Math.min(SALV_MAX, (t.salv || 0) + 1);
    }
  }

  /**
   * One Lament hit (`tru`: the Lament extra hit, true damage), with Sinking damage x `mult`, then
   * Deathseeker: up to `ds` more hits (each its own roll) that use half Sinking and don't spend it.
   */
  lamentHit(t, e, dmg, mult, tru, L, sure) {
    const strike = (field) => {
      const sm = this.sinkMult;
      this.sinkMult = mult;
      if (field) this.magField = field;
      if (tru) this.trueHit = true;
      try {
        this.damage(t, e, dmg);
      } finally {
        this.sinkMult = sm;
        this.magField = 0;
        this.trueHit = false;
      }
    };
    strike(0);
    if (!L.ds) return;
    const ch = sure ? 1 : Math.min(1, 0.5 + 0.1 * Math.max(0, BF_START - Math.min(t.bw, t.bb)));
    for (let i = 0; i < L.ds && this.enemies.has(e.id); i++) if (Math.random() < ch) strike(0.5);
  }

  // ---------------------------------------------------------------- Vulcan

  /** Vulcan: t.ign = Ignition, t.idle = time since its last hit. t.charge = Ignition / max. */
  updateVulcan(t, s, dt) {
    const v = s.vulcan;
    const b = buffOf(this.buffs, t.id);
    t.idle = (t.idle || 0) + dt;
    if (t.idle >= IGN_LOSE) t.ign = 0;
    t.charge = (t.ign || 0) / v.ign;
    const target = this.findTarget(t, s, t.x, t.z, s.range * b.range, null);
    if (!target) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.yaw = Math.atan2(target.x - t.x, target.z - t.z);
    if (t.cooldown > 0) return;
    t.cooldown += s.cooldown;
    t.idle = 0;
    this.events.push({ k: 'shot', t: t.id, e: target.id });
    this.vulcanHit(t, s, target, s.damage * b.dmg);
    t.ign = Math.min(v.ign, (t.ign || 0) + 1);
  }

  /** Is `e` on fire (a normal burn or stacked burns)? */
  burning(e) {
    return e.burn > 0 || e.rayBurn?.length > 0;
  }

  /** One Vulcan hit for `dmg`: Enspark, the hit, a stacking 1s burn and Burn Fragility. */
  vulcanHit(t, s, e, dmg) {
    const v = s.vulcan;
    if (v.hot && this.burning(e)) dmg *= 1 + v.hot;
    this.fireHit = true;
    try {
      this.damage(t, e, dmg);
    } finally {
      this.fireHit = false;
    }
    if (!this.enemies.has(e.id) || e.fireImmune) return;
    const tick = s.damage * 0.25 + (t.ign || 0); // burn damage per tick (spec), before damage boosts
    (e.rayBurn ??= []).push({ left: 1, dps: tick / v.tick, by: t.id, fire: 1 });
    if (v.frag && (t.ign || 0) >= FRAG_AT) {
      e.frag ??= {};
      e.frag[t.type] = { v: v.frag, left: FRAG_TIME };
    }
  }

  /** Burn Fragility on `e`: one amount per kind of tower, added up. */
  fragOf(e) {
    let v = 0;
    for (const k in e.frag) v += e.frag[k].v;
    return v;
  }

  /** Burn Fragility wears off (once a tick, from tickDots). */
  fragTick(e, dt) {
    for (const k in e.frag) if ((e.frag[k].left -= dt) <= 0) delete e.frag[k];
    if (!Object.keys(e.frag).length) e.frag = null;
  }

  vulcanWhy(t) {
    return (t.ign || 0) < 10 ? 'Vulcan Straight needs 10 Ignition' : null;
  }

  /** Vulcan Straight: 10x damage in a wide area in front, then Cinctura Ignis all around. */
  vulcanStraight(t, s) {
    const b = buffOf(this.buffs, t.id);
    const det = this.detects(t, s);
    const dmg = s.damage * b.dmg;
    t.ign = 0;
    t.charge = 0;
    const ux = Math.sin(t.yaw || 0);
    const uz = Math.cos(t.yaw || 0);
    for (const e of [...this.enemies.values()]) {
      if (e.remains || !canHit(det, e)) continue;
      const ex = e.x - t.x;
      const ez = e.z - t.z;
      const along = ex * ux + ez * uz;
      if (along < 0 || along > VS_LEN) continue;
      if (Math.abs(ex * uz - ez * ux) <= VS_WIDTH) this.vulcanHit(t, s, e, dmg * VS_MULT);
    }
    this.events.push({ k: 'quake', x: r2(t.x + ux * VS_LEN / 2), z: r2(t.z + uz * VS_LEN / 2), r: VS_LEN / 2, c: VULCAN_FIRE });
    // Cinctura Ignis
    for (const e of [...this.enemies.values()]) {
      if (e.remains || !canHit(det, e) || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > CINCT_R * CINCT_R) continue;
      let d = dmg * 0.5;
      if (this.burning(e)) {
        let burn = e.burnDps || 0;
        for (const rb of e.rayBurn ?? []) burn += rb.dps;
        d += dmg * 0.5 + burn * s.vulcan.tick; // + one tick of its burns
      }
      this.fireHit = true;
      try {
        this.damage(t, e, d);
      } finally {
        this.fireHit = false;
      }
    }
    this.events.push({ k: 'quake', x: r2(t.x), z: r2(t.z), r: CINCT_R, c: VULCAN_FIRE, soft: 1 });
  }
}
