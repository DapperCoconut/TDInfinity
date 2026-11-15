// Tower weapons, part 5: Hunter, Juggernaut (and Sinking), Soul Master, Toxicator.
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { ENEMIES, TOWERS, canHit } from '../../config.js';
import { TAU, r2 } from './shared.js';

export class SimWeapons5 {

  // ---------------------------------------------------------------- Hunter

  /**
   * Hunter: aims for `aim` s (firerate boosts don't change that), then fires a bolt. Zombies in
   * the outer ring of its range take `mult` x damage. Piercing bolts also hit zombies behind the target.
   */
  updateHunter(t, s, dt) {
    const h = s.hunter;
    const target = this.findTarget(t, s, t.x, t.z, s.range, null);
    if (!target) {
      t.huntAim = 0;
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.yaw = Math.atan2(target.x - t.x, target.z - t.z);
    if (t.cooldown > 0) return;
    t.cooldown = 0;
    t.huntAim = (t.huntAim || 0) + dt; // plain time: firerate boosts don't speed up aiming
    if (t.huntAim < h.aim) return;
    t.huntAim = 0;
    t.cooldown += s.cooldown;
    const hit = [target];
    if (h.pierce) {
      // Zombies close to the line from the tower through its target, out to the edge of its range.
      const det = this.detects(t, s);
      const dx = target.x - t.x;
      const dz = target.z - t.z;
      const len = Math.hypot(dx, dz) || 1;
      const ux = dx / len;
      const uz = dz / len;
      const behind = [];
      for (const e of this.enemies.values()) {
        if (e === target || !canHit(det, e)) continue;
        const along = (e.x - t.x) * ux + (e.z - t.z) * uz;
        if (along <= len || along > s.range) continue;
        const side = Math.abs((e.x - t.x) * uz - (e.z - t.z) * ux);
        if (side <= 1.2) behind.push([along, e]);
      }
      behind.sort((a, b) => a[0] - b[0]);
      for (const [, e] of behind.slice(0, h.pierce)) hit.push(e);
    }
    const inner = s.range * h.inner;
    for (const e of hit) {
      let dmg = s.damage;
      if ((e.x - t.x) ** 2 + (e.z - t.z) ** 2 > inner * inner) dmg *= h.mult;
      if (h.shatter && (e.shatter || 0) >= 15) dmg *= 1 + Math.min(0.5, 0.04 * Math.floor(e.shatter / 5));
      this.shoot(t, e, dmg);
    }
  }

  // ---------------------------------------------------------------- Juggernaut

  /** Juggernaut: the mace slam (one or two blasts) and the Magnetic Field. */
  updateJuggernaut(t, s, dt) {
    const j = s.jug;
    const det = this.detects(t, s);
    if (j.mag) {
      t.magT = (t.magT || 0) - dt;
      if (t.magT <= 0) {
        t.magT += j.mag.every;
        const r2max = s.range * s.range;
        const near = [...this.enemies.values()].filter((e) => canHit(det, e) && (e.x - t.x) ** 2 + (e.z - t.z) ** 2 <= r2max);
        if (near.length) this.events.push({ k: 'quake', x: r2(t.x), z: r2(t.z), r: s.range, c: 0xd50000, soft: 1 });
        this.magField = j.mag.sinkMult;
        try {
          for (const e of near) {
            this.damage(t, e, j.mag.damage);
            if (!j.mag.add || !this.enemies.has(e.id)) continue;
            e.magN ??= {};
            if ((e.magN[t.id] || 0) >= j.mag.max) continue;
            e.magN[t.id] = (e.magN[t.id] || 0) + 1;
            this.addSinking(t, e, j.mag.add);
          }
        } finally {
          this.magField = 0;
        }
      }
    } else t.magT = 0;
    if (t.jugBoom && (t.jugBoom.left -= dt) <= 0) {
      const b = t.jugBoom;
      t.jugBoom = null;
      this.maceBlast(t, s, b.x, b.z);
    }
    const target = this.findTarget(t, s, t.x, t.z, s.range, null);
    if (!target) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.yaw = Math.atan2(target.x - t.x, target.z - t.z);
    if (t.cooldown > 0) return;
    t.cooldown += s.cooldown;
    this.events.push({ k: 'shot', t: t.id, e: target.id });
    const x = target.x;
    const z = target.z;
    this.maceBlast(t, s, x, z);
    if ((j.booms || 1) > 1) t.jugBoom = { x, z, left: 0.35 }; // the second blast, a moment later
  }

  /** One mace blast at (x, z): damage, then Sinking on every zombie still standing in it. */
  maceBlast(t, s, x, z) {
    const j = s.jug;
    const det = this.detects(t, s);
    const r2max = s.radius * s.radius;
    const hit = [...this.enemies.values()].filter((e) => canHit(det, e) && (e.x - x) ** 2 + (e.z - z) ** 2 <= r2max);
    this.events.push({ k: 'quake', x: r2(x), z: r2(z), r: s.radius, c: 0xd50000 });
    for (const e of hit) {
      let dmg = s.damage;
      if (j.hpPct) dmg += Math.min(e.maxHp * j.hpPct.pct, dmg * (j.hpPct.max - 1));
      this.damage(t, e, dmg);
      if (j.sink && this.enemies.has(e.id)) this.addSinking(t, e, j.sink);
    }
  }

  addSinking(t, e, n) {
    if (e.statusImmune) return;
    e.sink = (e.sink || 0) + n;
    e.sinkBy = t.id;
  }

  /**
   * Sinking: `e` just took damage from `t` (still alive). 20% of its Sinking (at least 1) turns
   * into that much true damage, and is used up. The Magnetic Field (this.magField = its share)
   * and a Lv 5 Juggernaut's own slams set it off without using it up.
   */
  sinkHit(t, e) {
    const n = Math.max(1, Math.round(e.sink * 0.2));
    let dmg = n;
    if (this.magField) dmg = n * this.magField;
    else if (!(t && TOWERS[t.type]?.levels[t.level]?.jug?.keep)) e.sink -= n; // a Lv 5 Juggernaut's hits keep it
    if (e.sink <= 0) e.sink = 0;
    const dot = this.dot;
    const field = this.magField;
    this.sinking = true;
    this.trueHit = true;
    this.dot = false;
    this.magField = 0;
    try {
      this.damage(this.towers.get(e.sinkBy) ?? null, e, dmg, true, 'none');
    } finally {
      this.sinking = false;
      this.trueHit = false;
      this.dot = dot;
      this.magField = field;
    }
  }

  // ---------------------------------------------------------------- Soul Master

  /**
   * Soul Master: `n` souls (plus stolen ones) fly round it at its range and hurt every zombie
   * they touch. t.ang is where the first soul is, t.dir which way they go, t.charge souls / max.
   */
  updateSoulMaster(t, s, dt, rate) {
    const m = s.sm;
    const max = m.max ?? m.n;
    t.dir ||= 1;
    if (m.steal && this.wave.state === 'wave') {
      t.stealT = (t.stealT || 0) + dt;
      if (t.stealT >= m.steal) {
        t.stealT -= m.steal;
        t.stolen = Math.min(max - m.n, (t.stolen || 0) + 1);
      }
    }
    const n = Math.min(max, m.n + (m.steal ? t.stolen || 0 : 0));
    t.charge = n / max;
    t.ang = ((t.ang || 0) + (t.dir * dt * rate * TAU) / m.spin) % TAU;
    if (m.rev && this.wave.state === 'wave') {
      t.revenT = (t.revenT ?? m.revEvery) + dt;
      if (t.revenT >= m.revEvery) {
        t.revenT = 0;
        this.spawnUnit(t, m.rev);
        this.events.push({ k: 'sprout', x: r2(t.x), z: r2(t.z) });
      }
    }
    t.smClock = (t.smClock || 0) + dt;
    t.smHits ??= new Map();
    const det = this.detects(t, s);
    const R = s.range;
    const h2 = m.hit * m.hit;
    for (let i = 0; i < n; i++) {
      const a = t.ang + (i * TAU) / n;
      const sx = t.x + Math.cos(a) * R;
      const sz = t.z + Math.sin(a) * R;
      for (const e of [...this.enemies.values()]) {
        if (!canHit(det, e) || (e.x - sx) ** 2 + (e.z - sz) ** 2 > h2) continue;
        const key = `${e.id}:${i}`;
        if (t.smClock - (t.smHits.get(key) ?? -99) < m.every) continue;
        t.smHits.set(key, t.smClock);
        this.damage(t, e, s.damage);
      }
    }
    if (t.smHits.size > 200) for (const [k, v] of t.smHits) if (t.smClock - v > m.every) t.smHits.delete(k);
  }

  // ---------------------------------------------------------------- Toxicator

  /** Toxicator: a toxic blast at its target (two at max level) that leaves a fading poison stack. */
  updateToxicator(t, s, dt) {
    if (t.toxNext && (t.toxNext.left -= dt) <= 0) {
      const b = t.toxNext;
      t.toxNext = null;
      this.toxBlast(t, s, b.x, b.z);
    }
    const target = this.findTarget(t, s, t.x, t.z, s.range, null);
    if (!target) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.yaw = Math.atan2(target.x - t.x, target.z - t.z);
    if (t.cooldown > 0) return;
    t.cooldown += s.cooldown;
    this.events.push({ k: 'shot', t: t.id, e: target.id });
    this.toxBlast(t, s, target.x, target.z);
    if (s.tox.twice) t.toxNext = { x: target.x, z: target.z, left: 0.3 };
  }

  toxBlast(t, s, x, z) {
    const tx = s.tox;
    const det = this.detects(t, s);
    const r2max = s.radius * s.radius;
    const hit = [...this.enemies.values()].filter((e) => canHit(det, e) && (e.x - x) ** 2 + (e.z - z) ** 2 <= r2max);
    this.events.push({ k: 'boom', x: r2(x), z: r2(z), r: s.radius, ...(tx.nuke ? { nuke: 1 } : { gas: 1 }) });
    this.splashing = true;
    try {
      for (const e of hit) {
        this.damage(t, e, s.damage, false, 'explosive');
        if (!this.enemies.has(e.id) || e.statusImmune) continue;
        (e.tox ??= []).push({ dmg: tx.init, step: tx.init * tx.decay, tick: tx.tick, next: tx.tick, by: t.id });
      }
    } finally {
      this.splashing = false;
    }
  }

  /** Toxicator poison stacks on `e`: each one hurts on its own tick, a bit less every time. */
  toxTick(e, dt) {
    const pr = ENEMIES[e.type].poisonResist ?? 0;
    for (let i = e.tox.length - 1; i >= 0; i--) {
      const st = e.tox[i];
      st.next -= dt;
      if (st.next > 0) continue;
      st.next += st.tick;
      const d = Math.round(st.dmg * (1 - pr) * 100) / 100;
      st.dmg -= st.step;
      if (st.dmg <= 1e-6) e.tox.splice(i, 1);
      if (d > 0) this.damage(this.towers.get(st.by) ?? null, e, d);
      if (!this.enemies.has(e.id)) return;
    }
    if (!e.tox.length) e.tox = null;
  }
}
