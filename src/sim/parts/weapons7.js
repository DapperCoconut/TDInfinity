// Tower weapons, part 7: Technomancer (Hologram pad, Hijack, Utopia), Frostreaver (Ice Crystals,
// Crystal Burst, Path Crystal, Frost Burst, Frost Wisps), Artisan (Scrap, Skirmisher and Atelier
// buildings, Wanderer).
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { TOWERS, towerMaxHp } from '../../config.js';
import { PAD_SNAP, canPlace } from '../map.js';
import { BOUNDS, PATH_WIDTH, path } from '../path.js';
import { SEE_ALL, buffOf, r2 } from './shared.js';

const PAD_CLEAR = 4; // a Hologram pad stays this far from every tower, so a tower fits on it

// Frostreaver (guesses unless the spec gave them).
export const CRYSTAL_MAX = 7; // the most crystals any level holds (t.charge = crystals / CRYSTAL_MAX)
const CRYSTAL_FREEZE = 0.2; // +freeze seconds per crystal (spec)
const CRYSTAL_BYPASS = 0.005; // freeze resistance ignored per crystal (spec)
const CRYSTAL_STUN = 5; // this many crystals or more: can't be stunned (spec)
const FROST_BURST_EVERY = 5; // every 5th hit is a Frost Burst (my guess: the spec gives no trigger)
const WISP_MAX = 5; // Frost Wisps per Frostreaver (spec)
const WISP_PICK = 3; // a click this close to a tower puts the wisp on it

// Artisan (guesses unless the spec gave them).
const BUILD_LIFE = 60; // seconds a building lasts (spec) ...
const BUILD_PER_LV = 5; // ... + 5 s per Artisan level (spec said "per Artisan": with a limit of 1 I read it as per level)
const BUILD_BLAST_R = 8; // radius of a building's blast when it runs out or is sold (guess)
const WANDER_SCRAP = 200; // Wanderer: moving a tower that isn't the Artisan (spec)
const ATEL_KINDS = ['rate', 'dmg', 'range']; // Atelier pulses, in turn (spec)

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

  // ---------------------------------------------------------------- Artisan

  /** Artisan Scrap: set it (kept under its cap) and show it to the client as t.charge. */
  setScrap(t, s, n) {
    t.scrap = Math.max(0, Math.min(s.artisan.cap, n));
    t.charge = t.scrap / s.artisan.cap;
  }

  /** A shot whose pellets did `x` damage (pierced pellets counted half) gives `pct` of it as Scrap, at least 1. */
  addScrap(t, s, x) {
    this.setScrap(t, s, (t.scrap || 0) + Math.max(1, x * s.artisan.pct));
  }

  /** How long a building made by Artisan `art` lasts. */
  buildLife(art) {
    return BUILD_LIFE + BUILD_PER_LV * (art?.level ?? 0);
  }

  /** The building of `type` this Artisan has out, if any. */
  buildingOf(t, type) {
    for (const o of this.towers.values()) if (o.parent === t.id && o.type === type) return o;
    return null;
  }

  /** Why an Artisan ability can't be used now (null if it can). */
  artisanWhy(t, p, s, ab, m) {
    const x = Number(m.x);
    const z = Number(m.z);
    if (ab.build) {
      const def = TOWERS[ab.build];
      if ((t.scrap || 0) < ab.scrap) return `Needs ${ab.scrap} Scrap (it has ${Math.floor(t.scrap || 0)})`;
      if (this.buildingOf(t, ab.build)) return `It already has a ${def.name}`;
      const range = s.range * buffOf(this.buffs, t.id).range;
      if (Math.hypot(x - t.x, z - t.z) > range) return `Too far! It builds within ${Math.round(range)} studs`;
      if (!canPlace(x, z, this.towers.values(), def.placement, ab.build)) return `A ${def.name} can't go there`;
      return null;
    }
    // Wanderer: move one of the owner's towers.
    const src = this.towers.get(Number(m.src));
    if (!src || src.owner !== t.owner) return 'Pick one of your towers to move';
    const def = TOWERS[src.type];
    if (src.holo || def.building || def.placement === 'path') return `It can't move the ${def.name}`;
    if (src !== t && (t.scrap || 0) < WANDER_SCRAP) return `Moving a tower costs ${WANDER_SCRAP} Scrap (it has ${Math.floor(t.scrap || 0)})`;
    if (!canPlace(x, z, [...this.towers.values()].filter((o) => o !== src), def.placement, src.type)) return `The ${def.name} can't go there`;
    return null;
  }

  /** An Artisan ability (already checked by artisanWhy). */
  useArtisanAbility(t, s, ab, m) {
    const x = Number(m.x);
    const z = Number(m.z);
    if (ab.build) {
      this.setScrap(t, s, t.scrap - ab.scrap);
      const b = this.newTower(t.owner, ab.build, x, z, m.yaw, 0);
      b.parent = t.id;
      b.life = b.active = this.buildLife(t);
      this.events.push({ k: 'place', id: b.id, owner: t.owner, x, z });
      return;
    }
    const src = this.towers.get(Number(m.src));
    if (!src) return;
    if (src !== t) this.setScrap(t, s, t.scrap - WANDER_SCRAP);
    this.reposition(src, null, { key: 'teleport', radius: 0 }, x, z);
  }

  /** Every tick for a building: its time runs down; at 0 it blows up. Returns true when it is gone. */
  buildingTick(t, dt) {
    t.life = (t.life ?? BUILD_LIFE) - dt; // (one placed some other way lasts the base time)
    t.active = Math.max(0, t.life); // the client shows this
    if (t.life > 0) return false;
    this.removeTower(t, 'holoEnd');
    this.buildingBlast(t);
    return true;
  }

  /** A building blows up (its time ran out, or it was sold): `blast` damage around it. */
  buildingBlast(t) {
    const s = TOWERS[t.type].levels[t.level];
    const by = this.towers.get(t.parent) ?? t;
    this.explode(by, t.x, t.z, { damage: s.blast, radius: BUILD_BLAST_R, det: SEE_ALL });
  }

  /** Upgrading a building: costs its Artisan's Scrap, the Artisan must be near it and high enough level. */
  upgradeBuilding(t, pid) {
    const def = TOWERS[t.type];
    const next = def.levels[t.level + 1];
    if (!next) return 'Already max level!';
    const art = this.towers.get(t.parent);
    if (!art) return 'Its Artisan is gone, so it can\'t be upgraded';
    const ad = TOWERS[art.type];
    const as = ad.levels[art.level];
    const key = t.type === 'artisanAtelier' ? 'atel' : 'skirm';
    if (as.artisan[key] < t.level + 1) {
      const need = ad.levels.findIndex((l) => l.artisan[key] >= t.level + 1);
      return `The Artisan must be Lv ${need} to upgrade this`;
    }
    const range = as.range * buffOf(this.buffs, art.id).range;
    if (Math.hypot(art.x - t.x, art.z - t.z) > range) return 'The Artisan must be in range of it to upgrade it';
    if ((art.scrap || 0) < next.cost) return `Needs ${next.cost.toLocaleString()} Scrap (the Artisan has ${Math.floor(art.scrap || 0)})`;
    this.setScrap(art, as, art.scrap - next.cost);
    t.level++;
    t.hp = t.maxHp = towerMaxHp(t.type, t.level);
    t.life = t.active = this.buildLife(art); // an upgrade starts its time over
    this.events.push({ k: 'upgrade', id: t.id, owner: pid, name: next.name, x: t.x, z: t.z });
    return null;
  }

  /** Atelier: every `pulse` s, boosts towers in its range (firerate, damage, range in turn). */
  updateAtelier(t, s, dt) {
    const a = s.atelier;
    t.pulseT = (t.pulseT || 0) + dt;
    if (t.pulseT < a.pulse) return;
    t.pulseT = 0;
    const kind = ATEL_KINDS[(t.pulseN || 0) % 3];
    t.pulseN = (t.pulseN || 0) + 1;
    const r = s.range * buffOf(this.buffs, t.id).range;
    for (const o of this.towers.values()) {
      if (o.type === t.type || (o.x - t.x) ** 2 + (o.z - t.z) ** 2 > r * r) continue;
      (o.atel ??= {})[kind] = { a: a.buff, t: a.time };
      if (a.unstun) o.stunT = 0;
    }
    this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r });
  }

  /** Atelier boosts on tower `t` wear off. */
  tickAtel(t, dt) {
    for (const k in t.atel) if ((t.atel[k].t -= dt) <= 0) delete t.atel[k];
    if (!Object.keys(t.atel).length) t.atel = null;
  }
}

export const FROST_NEON = 0x1f51ff;
