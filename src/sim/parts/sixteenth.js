// Wave 16 towers (sixteenthtowers.js): Supercharge, lethality, Rocket Battery cluster bombs, Mad
// Alchemist potions, Paladin / Cleric / Grove Warden abilities, Preservation, the King.
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { ENEMIES, TOWERS, canHit } from '../../config.js';
import { superchargeCost } from '../../sixteenthtowers.js';
import { r2 } from './shared.js';

const ALL = { hidden: true, flying: true, lead: true };
const near = (a, b, r) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2 <= r * r;

export class SimSixteenth {

  // ---------------------------------------------------------------- Supercharge

  /**
   * Buying a Supercharge for tower `t` (it is at its last tier). Returns undefined when the tower
   * has no Supercharge, else null or why it can't be bought.
   */
  scBuy(t, p) {
    const sc = TOWERS[t.type].supercharge;
    if (!sc || typeof sc !== 'object' || TOWERS[t.type].cross) return undefined;
    if (t.level < TOWERS[t.type].levels.length - 1) return undefined;
    const cost = superchargeCost(sc, t.sc || 0);
    if (p.cash < cost) return `Need $${cost} to supercharge`;
    p.cash -= cost;
    t.spent += cost;
    t.sc = (t.sc || 0) + 1;
    this.events.push({ k: 'upgrade', id: t.id, owner: t.owner, name: `Supercharge ${t.sc}`, x: t.x, z: t.z });
    return null;
  }

  /** Damage from tower `t` after Aura of Faith, lethality (Supercharge, Heroism) and a Mysterious Elixir. */
  sxDamage(t, dmg) {
    if (t.faithT > 0 && !this.dot) dmg += t.faithDmg;
    let leth = 0;
    if (t.sc) leth += (TOWERS[t.type].supercharge?.lethality || 0) * t.sc;
    if (this.heroism?.left > 0) leth += this.heroism.amt;
    if (t.elixT > 0) leth += 0.5;
    return leth ? dmg * (1 + leth) : dmg;
  }

  // ---------------------------------------------------------------- health boosts

  /** Tower or troop `o` gets `add` more max health for `time` s (the same `key` again refreshes it, never stacks). */
  hpBuff(o, key, add, time) {
    if (!(o.hp > 0)) return;
    const b = (o.hpBuf ??= {});
    const old = b[key];
    if (old) {
      this.moveMaxHp(o, add - old.add);
      old.add = Math.max(old.add, add);
      old.left = Math.max(old.left, time);
    } else {
      b[key] = { add, left: time };
      this.moveMaxHp(o, add);
    }
  }

  moveMaxHp(o, d) {
    if (!d) return;
    o.hpAdd = (o.hpAdd || 0) + d;
    o.maxHp += d;
    if (o.hp > 0) o.hp = d > 0 ? o.hp + d : Math.max(1, Math.min(o.hp, o.maxHp));
  }

  healThing(o, amount) {
    if (o.tower != null && o.def) {
      if (o.hp > 0) o.hp = Math.min(o.maxHp, o.hp + amount); // a troop
    } else this.healTower(o, amount);
  }

  /** Towers and troops within `r` of (x, z): everything a Grove Warden looks after. */
  friendsNear(x, z, r) {
    const out = [];
    const c = { x, z };
    for (const o of this.towers.values()) if (o.hp > 0 && near(o, c, r)) out.push(o);
    for (const u of this.units.values()) if (u.hp > 0 && u.maxHp && near(u, c, r)) out.push(u);
    return out;
  }

  /** Grove Warden Preservation: the first time `o` drops below half health, it heals instead (once). */
  preserve(o) {
    if (o.presUsed || !(o.hp > 0) || o.hp >= o.maxHp / 2 || !this.groves?.length) return;
    let best = 0;
    for (const g of this.groves) if (near(g, o, TOWERS[g.type].levels[g.level].aura)) best = Math.max(best, TOWERS[g.type].levels[g.level].preserve);
    if (!best) return;
    o.presUsed = true;
    o.hp = Math.min(o.maxHp, o.hp + o.maxHp * best);
    this.events.push({ k: 'chaos', x: r2(o.x), z: r2(o.z), text: '🌿 Preserved!', color: '#9ccc65' });
  }

  // ---------------------------------------------------------------- every tick

  sxTick(dt) {
    if (this.heroism?.left > 0) this.heroism.left -= dt;
    this.groves = [];
    for (const t of this.towers.values()) {
      const s = TOWERS[t.type].levels[t.level];
      if (s.preserve && t.hp > 0) this.groves.push(t);
      if (t.elixT > 0) t.elixT -= dt;
      if (t.faithT > 0) t.faithT -= dt;
      if (t.barkT > 0) t.barkT -= dt;
      if (t.hpBuf) this.tickHpBuf(t, dt);
      if (!(t.hp > 0) || t.stunT > 0) continue;
      if (t.sanctT > 0) {
        // Paladin Holy Sanctuary: towers heal, zombies burn.
        t.sanctT -= dt;
        const a = t.sanct;
        for (const o of this.towers.values()) if (o.hp > 0 && near(o, t, s.aura)) this.healTower(o, o.maxHp * a.pct * dt);
        this.dot = true;
        try {
          for (const e of [...this.enemies.values()]) if (canHit(ALL, e) && near(e, t, s.aura)) this.damage(t, e, a.dps * dt);
        } finally {
          this.dot = false;
        }
      }
      if (t.wellT > 0) {
        // Cleric Healing Well: your troops nearby heal.
        t.wellT -= dt;
        for (const u of this.units.values()) if (u.hp > 0 && this.towers.get(u.tower)?.owner === t.owner && near(u, t, s.aura)) u.hp = Math.min(u.maxHp, u.hp + t.well.heal * dt);
      }
      for (const k of ['regrow', 'bloom']) {
        // Grove Warden Regrowth / Naturebloom: towers and troops nearby heal a share of their max health.
        if (!(t[`${k}T`] > 0)) continue;
        t[`${k}T`] -= dt;
        for (const o of this.friendsNear(t.x, t.z, s.aura)) if (o.hp < o.maxHp) this.healThing(o, o.maxHp * t[k].pct * dt);
      }
    }
    const wave = this.wave.state === 'wave' && this.enemies.size > 0;
    for (const u of this.units.values()) {
      if (u.hpBuf) this.tickHpBuf(u, dt);
      if (u.barkT > 0) u.barkT -= dt;
      const tp = u.def.tempo;
      if (!tp) continue;
      // King Lethal Tempo: every `every` s of fighting, `time` s of triple damage.
      if (u.tempoT > 0) u.tempoT -= dt;
      else if (wave && (u.tempoCd = (u.tempoCd ?? tp.every) - dt) <= 0) {
        u.tempoCd = tp.every;
        u.tempoT = tp.time;
        this.events.push({ k: 'chaos', x: r2(u.x), z: r2(u.z), text: '⚔ Lethal Tempo!', color: '#ffd740' });
      }
    }
  }

  tickHpBuf(o, dt) {
    for (const [k, b] of Object.entries(o.hpBuf)) {
      if ((b.left -= dt) > 0) continue;
      delete o.hpBuf[k];
      this.moveMaxHp(o, -b.add);
    }
  }

  // ---------------------------------------------------------------- abilities

  useSixteenth(t, s, ab) {
    const r = s.aura ?? s.range;
    switch (ab.key) {
      case 'faith':
        for (const o of this.towers.values()) {
          if (!(o.hp > 0) || !near(o, t, r)) continue;
          this.hpBuff(o, 'faith', ab.hp, ab.duration);
          o.faithDmg = Math.max(o.faithT > 0 ? o.faithDmg || 0 : 0, ab.dmg);
          o.faithT = ab.duration;
        }
        this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r });
        break;
      case 'sanctuary':
        t.sanctT = ab.duration;
        t.sanct = ab;
        this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r });
        break;
      case 'smite': {
        const list = [...this.enemies.values()].filter((e) => canHit(ALL, e) && near(e, t, r));
        for (const e of list) {
          const base = ENEMIES[e.type].armor ?? 0;
          if (base > 0) e.armor = Math.min(e.armor, base * (1 - ab.cut)); // over 100%: armor below zero, it takes extra damage
          this.events.push({ k: 'boom', x: r2(e.x), z: r2(e.z), r: 2 });
          this.damage(t, e, ab.damage / list.length);
        }
        break;
      }
      case 'heroism':
        this.heroism = { left: ab.duration, amt: ab.leth };
        this.events.push({ k: 'chaos', x: r2(t.x), z: r2(t.z), text: '✦ Heroism!', color: '#ffd740' });
        break;
      case 'restoreFaith':
        for (const o of this.towers.values()) if (o.hp > 0 && near(o, t, r)) this.healTower(o, o.maxHp * ab.pct);
        this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r });
        break;
      case 'mend': {
        // The most hurt barracks troop nearby.
        let best = null;
        for (const u of this.units.values()) if (u.def.guard && u.hp > 0 && u.hp < u.maxHp && near(u, t, r) && (!best || u.hp / u.maxHp < best.hp / best.maxHp)) best = u;
        if (best) {
          best.hp = Math.min(best.maxHp, best.hp + ab.heal);
          this.events.push({ k: 'chaos', x: r2(best.x), z: r2(best.z), text: `✚ ${ab.heal}`, color: '#fff176' });
        }
        break;
      }
      case 'fortitude':
        for (const u of this.units.values()) if (u.def.guard && u.hp > 0 && near(u, t, r)) this.hpBuff(u, 'fort', ab.hp, ab.duration);
        break;
      case 'healingWell':
        t.wellT = ab.duration;
        t.well = ab;
        this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r });
        break;
      case 'resurrect': {
        // An angel on the barracks nearby that has spent the most (and has none yet).
        let best = null;
        for (const o of this.towers.values()) {
          const os = TOWERS[o.type].levels[o.level];
          if (o.angel || !os.unit?.guard || !near(o, t, r)) continue;
          if (!best || o.spent > best.spent) best = o;
        }
        if (best) {
          best.angel = true;
          this.events.push({ k: 'chaos', x: r2(best.x), z: r2(best.z), text: '😇 Guarded by an angel', color: '#fffde7' });
        }
        break;
      }
      case 'regrowth':
        t.regrowT = ab.duration;
        t.regrow = ab;
        break;
      case 'naturebloom':
        t.bloomT = ab.duration;
        t.bloom = ab;
        for (const o of this.friendsNear(t.x, t.z, r)) this.hpBuff(o, 'bloom', ab.hp, ab.duration);
        this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r });
        break;
      case 'barkskin':
        for (const o of this.friendsNear(t.x, t.z, r)) {
          this.hpBuff(o, 'bark', ab.hp, ab.duration);
          o.barkT = ab.duration;
          o.barkBlock = ab.block;
        }
        this.events.push({ k: 'rave', id: t.id, x: t.x, z: t.z, r });
        break;
      case 'grasp': {
        const list = [...this.enemies.values()].filter((e) => canHit(ALL, e) && !e.flying && near(e, t, r)).sort((a, b) => b.dist - a.dist).slice(0, ab.targets);
        for (const e of list) {
          this.stop({}, e, ab.stun, 'stun');
          this.events.push({ k: 'sprout', x: r2(e.x), z: r2(e.z) });
        }
        break;
      }
    }
  }

  // ---------------------------------------------------------------- Rocket Battery

  /** Rocket Battery: by chance, this rocket bursts into cluster bombs (Supercharges add more). */
  rollCluster(t, s) {
    if (Math.random() >= s.clusterChance) return null;
    const c = s.clusterBomb;
    const sc = TOWERS[t.type].supercharge;
    const extra = (sc?.clusters || 0) * (t.sc || 0);
    let count = c.count + Math.floor(extra) + (Math.random() < extra % 1 ? 1 : 0);
    count = Math.min(sc?.clusterMax ?? count, count);
    return { count, damage: s.damage * c.damage, radius: c.radius };
  }

  // ---------------------------------------------------------------- Mad Alchemist

  /** One potion at `target`. It rolls for one special potion; the rest are plain. */
  throwPotion(t, def, s, target) {
    const p = s.potions;
    let pick = null;
    let roll = Math.random();
    for (const k of ['elixir', 'fire', 'zap', 'fumes', 'metal']) {
      if (!p[k]) continue;
      if (roll < p[k].chance) {
        pick = k;
        break;
      }
      roll -= p[k].chance;
    }
    const blast = { damage: s.damage, radius: s.radius, det: this.detects(t, s), main: target.id };
    const o = pick && p[pick];
    if (pick === 'fire') Object.assign(blast, { burn: o.dps, burnTime: o.time, burnSlow: 0 });
    if (pick === 'zap') Object.assign(blast, { damage: s.damage * o.mult, stun: o.stun, stunTargets: 1 });
    if (pick === 'fumes') blast.gas = { cloud: o.time, dps: o.dps, time: 1, targets: 99, radius: o.radius, slow: o.slow };
    if (pick === 'metal') blast.shred = o.shred;
    const time = def.lob;
    const at = this.leadPoint(target, time);
    this.shells.push({ tower: t.id, x: at.x, z: at.z, time, ...blast });
    this.events.push({ k: 'lob', t: t.id, x: r2(at.x), z: r2(at.z), d: time });
    if (pick === 'elixir') {
      // Mysterious Elixir: throws again at once, and half the time a 5s boost (more damage, or double speed).
      t.cooldown = 0;
      if (Math.random() < 0.5) {
        if (Math.random() < 0.5) t.elixT = o.time;
        else {
          t.dpT = o.time;
          t.dpBoost = 1;
        }
      }
      this.events.push({ k: 'chaos', x: r2(t.x), z: r2(t.z), text: '⚗ Elixir!', color: '#76ff03' });
    }
  }

  // ---------------------------------------------------------------- King

  /** A King's swing at `e`: Lethal Tempo (triple damage through armor) and Multi-Attack (2 more zombies nearby). */
  kingSwing(u, tower, e, dmg) {
    const d = u.def;
    const tempo = u.tempoT > 0;
    const hit = [e];
    if (d.multi && Math.random() < d.multi) {
      const more = [...this.enemies.values()].filter((o) => o !== e && !o.flying && canHit(ALL, o) && near(o, e, 4)).slice(0, 2);
      hit.push(...more);
    }
    for (const o of hit) {
      this.damage(tower, o, tempo ? dmg * d.tempo.mult : dmg, tempo);
      if (tempo) u.tempoT = Math.min(d.tempo.max, u.tempoT + d.tempo.add);
    }
  }
}
