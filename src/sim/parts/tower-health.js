// Towers getting hurt: enemy shots landing, stealth, knock-outs, and the medics that heal towers.
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { ENEMIES, GAME, TOWERS } from '../../config.js';
import { mapInfo } from '../map.js';
import { SEE_ALL, beamHealable, buffOf, mediCharge, r2 } from './shared.js';

export class SimTowerHealth {

  /** A thrown axe (or Hard mode shot) lands: stuns and hurts the towers around it. */
  landShot(a) {
    const n = a.stun ? (a.hard ? this.hardStun(a.x, a.z, a.r, a.stun) : this.hexTowers(a.x, a.z, a.r, 'stun', a.stun, true)) : 0; // VOID's meteors ignore stun immunity
    if (a.tower) {
      // Medium Predator / Eradicator: a shot at one tower (if it's still there).
      const o = this.towers.get(a.tower);
      if (o) this.hurtTower(o, a.tdmg, true);
    }
    if (a.dmg) this.hurtTowers(a.x, a.z, a.r, a.dmg, true);
    if (a.bleed) for (const t of this.towers.values()) if (t.hp > 0 && (t.x - a.x) ** 2 + (t.z - a.z) ** 2 <= Math.max(a.r || 0, 0.5) ** 2) this.cutTower(t, a.bleed); // Psycho knives
    if (a.puddle) this.puddles.push({ x: a.x, z: a.z, r: a.r, dps: a.puddle.dps, left: a.puddle.life, slow: a.puddle.slow ?? 0, weak: a.puddle.weak ?? 0, silence: !!a.puddle.silence });
    if (a.slow) this.slowTowers(a.x, a.z, Math.max(a.r, 0.5), a.slow.amt, a.slow.time, true); // Time Parasite
    if (a.lock) {
      // Hardcore Expired Jack: a flaming pumpkin sets the towers it lands on burning (they can't fight).
      for (const t of this.towers.values()) {
        if ((t.x - a.x) ** 2 + (t.z - a.z) ** 2 > Math.max(a.r, 0.5) ** 2 || this.stealthy(t)) continue;
        if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) continue;
        t.bleedT = Math.max(t.bleedT || 0, a.lock);
      }
    }
    if (a.shrink || a.weak) {
      // Vio Gunner orbs: half range for a while, and a damage cut that stacks with every orb.
      for (const t of this.towers.values()) {
        if ((t.x - a.x) ** 2 + (t.z - a.z) ** 2 > a.r * a.r || this.stealthy(t)) continue;
        if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) continue;
        if (a.shrink) t.smoke = Math.max(t.smoke, a.shrink); // the same halved range as Versus smoke
        if (a.weak) {
          const w = a.weak;
          t.weakAmt = Math.min(w.max, 1 - (1 - (t.weakT > 0 ? t.weakAmt : 0)) * (1 - w.amt));
          t.weakT = Math.max(t.weakT || 0, w.time);
        }
      }
    }
    if (a.spawn) {
      // Medium Grenadiers: the grenade bursts into zombies (worth no cash).
      let j = 0;
      for (const [type, n] of a.spawn.list) for (let i = 0; i < n; i++, j++) this.reborn.push({ type, dist: Math.max(0, a.spawn.dist - j * 0.8), lateral: 0, hpScale: 1, noCash: true });
    }
    if (a.kind) this.events.push({ k: 'eHit', kind: a.kind, x: r2(a.x), z: r2(a.z), r: a.r, ...(a.puddle ? { life: a.puddle.life } : {}) });
    else this.events.push({ k: 'axeHit', x: r2(a.x), z: r2(a.z), r: a.r, n });
  }

  /** Can enemies target tower `t`? Stealthy towers (a level's `stealth` or a Ghost Grenade) can't be, unless revealed. */
  stealthy(t) {
    if (t.cloakT > 0) return true; // Ghost Grenade
    return !!TOWERS[t.type].levels[t.level].stealth && !(t.exposedT > 0);
  }

  /** A level's stealth slowly drains; once it's gone the tower is revealed for a while, then it refills. */
  drainStealth(t, s, dt) {
    const full = s.stealthTime ?? GAME.stealthTime;
    if (!s.stealth) {
      t.stealthLeft = full; // ready for when it upgrades into stealth
      t.exposedT = 0;
      return;
    }
    t.stealthLeft ??= full;
    if (t.exposedT > 0) {
      t.exposedT = Math.max(0, t.exposedT - dt);
      if (!t.exposedT) t.stealthLeft = full;
      return;
    }
    t.stealthLeft = Math.min(full, t.stealthLeft) - dt;
    if (t.stealthLeft > 0) return;
    t.stealthLeft = 0;
    t.exposedT = s.restealth ?? GAME.restealth;
    this.events.push({ k: 'exposed', id: t.id, x: t.x, z: t.z });
  }

  /** Ghost Grenade: every tower within `ab.radius` of `t` (it too) turns stealthy for `ab.duration` s. */
  ghostGrenade(t, ab) {
    const r2max = ab.radius * ab.radius;
    for (const o of this.towers.values()) {
      if ((o.x - t.x) ** 2 + (o.z - t.z) ** 2 <= r2max) o.cloakT = Math.max(o.cloakT || 0, ab.duration);
    }
    this.events.push({ k: 'cloak', id: t.id, x: t.x, z: t.z, r: ab.radius });
  }

  /**
   * Every tower within `r` of (x, z) loses `dmg` health; at 0 it's knocked out until healed.
   * `enemy`: an enemy's attack, which can't touch stealthy towers.
   */
  hurtTowers(x, z, r, dmg, enemy = false) {
    for (const t of this.towers.values()) {
      if (t.hp <= 0 || (t.x - x) ** 2 + (t.z - z) ** 2 > r * r) continue;
      this.hurtTower(t, dmg, enemy);
    }
  }

  /** Tower `t` loses `dmg` health (see hurtTowers). */
  hurtTower(t, dmg, enemy = false, noShield = false) {
    if (t.hp <= 0) return;
    if (enemy && this.stealthy(t)) return;
    if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) return; // Medigun Medic Uber / Combat Drone Shield
    const left = noShield ? dmg : this.soakShield(t, dmg); // Shield Tower shields take the hit first (not Death Angel Pure Pain)
    if (left <= 0) return;
    t.calmT = 0; // Doctor: its regen waits again
    const xl = TOWERS[t.type].levels[t.level].extraLife;
    if (xl && t.hp - left <= 0 && !(t.lifeCd > 0)) {
      // Second life: back to full health and immortal for a moment.
      t.hp = t.maxHp;
      t.invulnT = xl.immune;
      t.lifeCd = xl.back;
      this.events.push({ k: 'chaos', x: r2(t.x), z: r2(t.z), text: '✚ Second life!', color: '#80d8ff' });
      return;
    }
    t.hp = Math.max(0, t.hp - left);
    if (t.hp <= 0) this.knockOut(t);
  }

  /** Tower `t` just ran out of health: it's knocked out until healed. */
  knockOut(t) {
    t.hp = 0;
    this.events.push({ k: 'towerDown', id: t.id, owner: t.owner, x: t.x, z: t.z });
    this.lifeInsurance(t);
    this.deathBlast(t);
    this.revivePack(t);
  }

  /** Towers within `r` of (x, z) deal `weak` less damage for a while; `silence` s: they can't use abilities. */
  weakenTowers(x, z, r, weak, silence) {
    for (const t of this.towers.values()) {
      if ((t.x - x) ** 2 + (t.z - z) ** 2 > r * r || this.stealthy(t)) continue;
      if (buffOf(this.buffs, t.id).invuln || t.invulnT > 0) continue;
      if (weak) {
        t.weakAmt = t.weakT > 0 ? Math.max(t.weakAmt, weak) : weak;
        t.weakT = Math.max(t.weakT || 0, 4); // lingers a few seconds after leaving the puddle
      }
      if (silence) t.silenceT = Math.max(t.silenceT || 0, silence);
    }
  }

  /**
   * Cryo Helicopter Freeze on Death: where the helicopter is, towers are stunned (frozen) and
   * hurt, and zombies take damage.
   */
  deathBlast(t) {
    const b = TOWERS[t.type].levels[t.level].deathBlast;
    if (!b) return;
    const x = t.hx ?? t.x;
    const z = t.hz ?? t.z;
    this.explode(t, x, z, { damage: b.damage, radius: b.radius, det: SEE_ALL });
    this.events.push({ k: 'boom', x: r2(x), z: r2(z), r: b.radius, ice: 1 });
    this.hexTowers(x, z, b.radius, 'stun', b.stun);
    if (b.towerDamage) this.hurtTowers(x, z, b.radius, b.towerDamage);
  }

  /**
   * Mobster (Bottom path) cash back: when tower `down` is knocked out, the best working Mobster
   * that has it in range pays its owner `cashback` of the tower's total cost.
   */
  lifeInsurance(down) {
    let best = null;
    for (const m of this.towers.values()) {
      if (m === down || m.hp <= 0 || m.holo) continue;
      const ms = TOWERS[m.type].levels[m.level];
      if (!ms.cashback || (m.x - down.x) ** 2 + (m.z - down.z) ** 2 > ms.range * ms.range) continue;
      if (!best || ms.cashback > best.pct) best = { m, pct: ms.cashback };
    }
    if (!best) return;
    const v = Math.floor(down.spent * best.pct);
    const p = this.players.get(best.m.owner);
    if (!p || v <= 0) return;
    p.cash += v;
    this.events.push({ k: 'cashback', x: down.x, z: down.z, v, owner: p.id });
  }

  /** Heals a tower by `amount` (up to its max); a knocked-out tower gets back up. */
  /** Heals tower `t` up to `amount`; returns how much it actually healed. */
  healTower(t, amount) {
    if (t.hp >= t.maxHp || amount <= 0) return 0;
    const was = t.hp;
    t.hp = Math.min(t.maxHp, t.hp + amount);
    if (was <= 0 && t.hp > 0) this.events.push({ k: 'towerUp', id: t.id, owner: t.owner, x: t.x, z: t.z });
    return t.hp - was;
  }

  /** Every working tower heals a tiny bit by itself (GAME.towerRegen of its max health a second). Knocked-out ones still need a Medic. */
  towerRegen(dt) {
    for (const t of this.towers.values()) {
      if (t.hp > 0 && t.hp < t.maxHp && !TOWERS[t.type].noHeal) this.healTower(t, t.maxHp * GAME.towerRegen * dt);
    }
  }

  /** Frostgate Citadel: towers standing on the lanes are hurt by the ground enemies walking through them. */
  trample(dt) {
    const pt = mapInfo.pathTowers;
    const r2max = pt.radius * pt.radius;
    for (const e of this.enemies.values()) {
      if (e.flying || e.remains || e.hp <= 0) continue;
      const hit = ENEMIES[e.type].damage * pt.hurt * dt;
      for (const t of this.towers.values()) {
        if (t.hp > 0 && (t.x - e.x) ** 2 + (t.z - e.z) ** 2 <= r2max) this.hurtTower(t, hit, true);
      }
    }
  }

  /** Medics repair damaged towers inside their aura (any owner's, not other Medics) every second. */
  medicRepair(dt) {
    for (const m of this.towers.values()) {
      const s = TOWERS[m.type].levels[m.level];
      if (!s.towerHeal || m.stunT > 0 || m.hp <= 0) continue;
      const r2max = s.aura * s.aura;
      for (const t of this.towers.values()) {
        if (t === m || t.hp >= t.maxHp || (t.x - m.x) ** 2 + (t.z - m.z) ** 2 > r2max) continue;
        if ((TOWERS[t.type].levels[t.level].towerHeal && !TOWERS[m.type].mutualHeal) || TOWERS[t.type].noHeal || TOWERS[t.type].packHealOnly) continue;
        this.healPay(m, s, this.healTower(t, s.towerHeal * dt));
      }
    }
  }

  /** Medigun Medic: towers its beam can reach (inside its aura, healable, not itself). */
  beamPatients(m, s) {
    const out = [];
    for (const t of this.towers.values()) {
      const r = s.beamRange ?? s.aura; // Doctor: its medigun reaches farther than its medkits
      if (t !== m && beamHealable(t) && (t.x - m.x) ** 2 + (t.z - m.z) ** 2 <= r * r) out.push(t);
    }
    return out;
  }

  /**
   * Who a Medigun Medic's Uber / Kritz goes to: its current patient if it can take it, else the
   * most valuable tower in range (Kritz: attacking towers only). Null if there is none.
   */
  chargeTarget(m, s, ab) {
    const ok = ab.key === 'kritz' ? this.beamPatients(m, s).filter((t) => !TOWERS[t.type].kind && !TOWERS[t.type].noBuff) : this.beamPatients(m, s);
    return ok.find((t) => t.id === m.lock) ?? ok.sort((a, b) => b.spent - a.spent || a.id - b.id)[0] ?? null;
  }

  /**
   * Medigun Medic: its beam heals the most hurt tower in range (it sticks with its patient while
   * one is just as hurt, and stays on it when nobody is hurt). While Uber or Kritz is on, the beam
   * stays locked on the tower that got it.
   */
  updateMediBeam(t, s, dt) {
    const list = this.beamPatients(t, s);
    let p = list.find((o) => o.id === t.lock) ?? null;
    if (!(t.active > 0 && mediCharge(s))) {
      const hurt = (o) => o.hp / o.maxHp;
      let best = p && p.hp < p.maxHp ? p : null;
      for (const o of list) if (o.hp < o.maxHp && (!best || hurt(o) < hurt(best) - 0.05)) best = o;
      if (best) p = best;
    }
    t.lock = p ? p.id : 0;
    if (p) this.healPay(t, s, this.healTower(p, (s.beamHeal + (s.beamPct ? p.maxHp * s.beamPct : 0)) * dt)); // Doctor: + a share of max health
  }

  towerNear(x, z, r, targetable = false) {
    for (const t of this.towers.values()) if ((t.x - x) ** 2 + (t.z - z) ** 2 <= r * r && !(targetable && this.stealthy(t))) return true;
    return false;
  }

  /** Thrown axes land and stun the towers around them. */
  updateAxes(dt) {
    if (!this.axes.length) return;
    this.axes = this.axes.filter((a) => {
      if ((a.left -= dt) > 0) return true;
      this.landShot(a);
      return false;
    });
  }
}
