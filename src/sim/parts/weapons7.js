// Tower weapons, part 7: Technomancer (Hologram pad, Hijack, Utopia), Frostreaver (Ice Crystals,
// Crystal Burst, Path Crystal, Frost Burst, Frost Wisps).
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { TOWERS } from '../../config.js';
import { PAD_SNAP } from '../map.js';
import { BOUNDS, PATH_WIDTH, path } from '../path.js';
import { buffOf, r2 } from './shared.js';

const PAD_CLEAR = 4; // a Hologram pad stays this far from every tower, so a tower fits on it

// Frostreaver (guesses unless the spec gave them).
export const CRYSTAL_MAX = 7; // the most crystals any level holds (t.charge = crystals / CRYSTAL_MAX)
const CRYSTAL_FREEZE = 0.2; // +freeze seconds per crystal (spec)
const CRYSTAL_BYPASS = 0.005; // freeze resistance ignored per crystal (spec)
const CRYSTAL_STUN = 5; // this many crystals or more: can't be stunned (spec)
const FROST_BURST_EVERY = 5; // every 5th hit is a Frost Burst (my guess: the spec gives no trigger)
const WISP_MAX = 5; // Frost Wisps per Frostreaver (spec)
const WISP_PICK = 3; // a click this close to a tower puts the wisp on it

export class SimWeapons7 {

  // ---------------------------------------------------------------- Technomancer

  /** Every tick: which of its owner's towers stands on the Technomancer's pad (t.padOn, 0 if none). */
  updateTechno(t) {
    if (!t.pad) return;
    t.padOn = 0;
    for (const o of this.towers.values()) {
      if (o === t || o.owner !== t.owner || o.holo) continue;
      if ((o.x - t.pad.x) ** 2 + (o.z - t.pad.z) ** 2 <= PAD_SNAP * PAD_SNAP) {
        t.padOn = o.id;
        break;
      }
    }
  }

  /** Why the Hologram / Utopia ability can't be used now (null if it can). Utopia makes its copy here. */
  technoWhy(t, p, s, ab, m) {
    const x = Number(m.x);
    const z = Number(m.z);
    if (ab.key === 'hologram') {
      if (t.pad && t.padOn) return 'A tower is standing on its Hologram (sell it to move the Hologram)';
      if (Math.hypot(x - t.x, z - t.z) > s.range) return `Too far! The Hologram goes within ${Math.round(s.range)} studs`;
      if (x < BOUNDS.minX + 2 || x > BOUNDS.maxX - 2 || z < BOUNDS.minZ + 2 || z > BOUNDS.maxZ - 2) return "The Hologram can't go there";
      if (path.distanceTo(x, z) < PATH_WIDTH / 2 + 1.6) return "The Hologram can't go on the path";
      for (const o of this.towers.values()) if (Math.hypot(o.x - x, o.z - z) < PAD_CLEAR) return 'Too close to a tower';
      for (const o of this.towers.values()) if (o !== t && o.pad && Math.hypot(o.pad.x - x, o.pad.z - z) < PAD_CLEAR) return 'Too close to another Hologram';
      return null;
    }
    // Utopia: a free copy of the tower on the pad, placed where the player clicked.
    if (!t.pad) return 'Place its Hologram first';
    const v = this.towers.get(t.padOn);
    if (!v) return 'No tower on its Hologram';
    return this.cloneTower(p, ab, { src: v.id, x, z, yaw: m.yaw ?? v.yaw });
  }

  /** Hologram: the pad goes where the player clicked. */
  placeHologram(t, x, z) {
    t.pad = { x, z };
    t.padOn = 0;
    this.events.push({ k: 'sprout', x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, volt: 1 });
  }

  /** The Technomancer was sold: the tower on its pad is sold too. */
  sellPadTower(t, pid) {
    if (t.padOn && this.towers.has(t.padOn)) this.action(pid, { a: 'sell', id: t.padOn });
  }

  // ---------------------------------------------------------------- Frostreaver

  /** Frostreaver: grows Ice Crystals, freezes what it hits, its Frost Wisps attack. */
  updateFrostreaver(t, s, dt) {
    const f = s.frost;
    const b = buffOf(this.buffs, t.id);
    const n = t.crystals || 0;
    if (f.grow && n < f.max) {
      t.crystT = (t.crystT || 0) + dt;
      if (t.crystT >= f.grow) {
        t.crystT = 0;
        t.crystals = n + 1;
      }
    }
    if (t.crystals > f.max) t.crystals = f.max;
    t.charge = (t.crystals || 0) / CRYSTAL_MAX; // the client draws the crystals from this
    if ((t.crystals || 0) >= CRYSTAL_STUN) {
      t.immuneT = Math.max(t.immuneT || 0, 0.25); // 5+ crystals: can't be stunned
      t.stunT = 0;
    }
    if (t.wisps?.length) this.frostWisps(t, dt);
    const target = this.findTarget(t, s, t.x, t.z, s.range * b.range, null);
    if (!target) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.yaw = Math.atan2(target.x - t.x, target.z - t.z);
    if (t.cooldown > 0) return;
    t.cooldown += s.cooldown;
    if (f.grow) t.crystT = (t.crystT || 0) + 1; // every hit makes the next crystal come sooner
    const c = t.crystals || 0;
    let dmg = this.frostDamage(t, s);
    const burst = f.burst && (t.fHits = (t.fHits || 0) + 1) % FROST_BURST_EVERY === 0;
    if (burst) {
      dmg *= (c + 4) ** 1.1; // Frost Burst
      this.events.push({ k: 'quake', x: r2(target.x), z: r2(target.z), r: 3, c: FROST_NEON });
    }
    this.events.push({ k: 'shot', t: t.id, e: target.id });
    this.damage(t, target, dmg);
    if (!this.enemies.has(target.id)) return;
    // Freeze: crystals add time and see through some of the zombie's freeze resistance.
    const resist = Math.max(0, (target.iceResist || 0) - c * CRYSTAL_BYPASS);
    this.stop({ bossStop: 0, ignoreIceResist: true }, target, (f.freeze + c * CRYSTAL_FREEZE) * (1 - resist), 'ice');
  }

  /** One Frostreaver hit: its damage with boosts and crystals. */
  frostDamage(t, s) {
    const b = buffOf(this.buffs, t.id);
    return (s.damage + (b.dmgAdd || 0)) * b.dmg * (1 + (t.crystals || 0) * (s.frost.pct || 0));
  }

  /** Why a crystal ability can't be used now (null if it can). */
  frostWhy(t, s, ab, m) {
    if ((t.crystals || 0) < ab.crystals) return `${ab.name} needs ${ab.crystals} crystal${ab.crystals === 1 ? '' : 's'} (it has ${t.crystals || 0})`;
    const x = Number(m.x);
    const z = Number(m.z);
    if (ab.reach && Math.hypot(x - t.x, z - t.z) > ab.reach) return `Too far! ${ab.name} reaches ${Math.round(ab.reach)} studs`;
    if (ab.key === 'frostWisp') {
      if ((t.wisps?.length || 0) >= WISP_MAX) return `It already has ${WISP_MAX} Frost Wisps`;
      const host = this.wispHost(t, x, z);
      if (!host) return 'Click one of your towers that attacks';
    }
    return null;
  }

  /** The tower a Frost Wisp click lands on: one of the owner's attacking towers near (x, z). */
  wispHost(t, x, z) {
    let best = null;
    let bestD = WISP_PICK * WISP_PICK;
    for (const o of this.towers.values()) {
      if (o.owner !== t.owner || o.holo) continue;
      const l = TOWERS[o.type].levels[o.level];
      if (!l.damage || !l.cooldown) continue;
      const d = (o.x - x) ** 2 + (o.z - z) ** 2;
      if (d <= bestD) {
        best = o;
        bestD = d;
      }
    }
    return best;
  }

  /** A crystal ability (already checked by frostWhy): spends its crystals and does its thing. */
  useFrostAbility(t, s, ab, m) {
    t.crystals = (t.crystals || 0) - ab.crystals;
    const x = Number(m.x);
    const z = Number(m.z);
    if (ab.key === 'crystalBurst') {
      const dmg = this.frostDamage(t, s);
      this.explode(t, x, z, { damage: dmg, radius: ab.radius, det: this.detects(t, s), chill: { chill: 1, maxSlow: 0.4, chillTime: 5, chillDps: dmg * s.frost.burn } });
    } else if (ab.key === 'pathCrystal') this.placeIceTurret(t, ab, x, z);
    else if (ab.key === 'frostWisp') {
      const host = this.wispHost(t, x, z);
      if (host) (t.wisps ??= []).push({ host: host.id, cd: 0 });
      this.events.push({ k: 'sprout', x: r2(host?.x ?? x), z: r2(host?.z ?? z), ice: 1 });
    }
  }

  /**
   * Frost Wisps: each one attacks from its tower, within that tower's range. X = (that tower's damage
   * a second)^0.9; it hits for X / 1.5 every 5 / X s, but never faster than every 0.5 s (spec).
   */
  frostWisps(t, dt) {
    t.wisps = t.wisps.filter((w) => this.towers.has(w.host));
    for (const w of t.wisps) {
      if ((w.cd -= dt) > 0) continue;
      const host = this.towers.get(w.host);
      const hl = TOWERS[host.type].levels[host.level];
      const hb = buffOf(this.buffs, host.id);
      const dps = ((hl.damage || 0) * hb.dmg * (hl.burst || 1) * hb.rate) / hl.cooldown;
      const X = dps ** 0.9;
      if (!(X > 0)) continue;
      const e = this.findTarget(host, hl, host.x, host.z, (hl.range || 10) * hb.range, null);
      if (!e) continue;
      w.cd = Math.max(0.5, 5 / X);
      this.events.push({ k: 'wisp', h: host.id, e: e.id });
      this.damage(t, e, X / 1.5);
    }
  }
}

export const FROST_NEON = 0x1f51ff;
