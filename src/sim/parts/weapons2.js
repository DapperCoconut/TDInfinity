// Tower weapons, part 2: mines, DJ booths, poison, chain lightning, pulses, sweeps and traps.
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { TOWERS, canHit } from '../../config.js';
import { path } from '../path.js';
import { GROUND_BLAST, PELLET_WIDTH, PULSE_WIDTH, SWEEP_WIDTH, TAU, TRAP_FLIGHT, TRAP_HIT, minRangeOf, r2 } from './shared.js';

export class SimWeapons2 {

  /** Stinger handgun: shoots a zombie inside its rocket deadzone. */
  fireHandgun(t, def, s, dt) {
    const hg = s.handgun;
    t.hgT = Math.max(-dt, (t.hgT ?? 0) - dt);
    if (t.hgT > 0) return;
    const e = this.findTarget(t, s, t.x, t.z, minRangeOf(def, s));
    if (!e) {
      t.hgT = Math.max(0, t.hgT);
      return;
    }
    t.hgT += hg.cooldown;
    this.shoot(t, e, hg.damage);
  }

  /** The point on the path closest to (x, z). */
  nearestPathPoint(x, z) {
    const p = {};
    let best = null;
    let bestD = Infinity;
    for (let r = 0; r < path.routes.length; r++) for (let d = 0; d <= path.length; d += 0.5) {
      path.at(d, p, r);
      const d2 = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d2 < bestD) {
        bestD = d2;
        best = { x: p.x, z: p.z };
      }
    }
    return best;
  }

  /** Golden Mine Layer Crossbow: a mine shot onto the path at the clicked spot. */
  crossbowMine(t, s, ab, x, z) {
    const p = this.nearestPathPoint(x, z);
    if (!p) return;
    const trap = { id: this.nextId++, tower: t.id, kind: 'mine', x: p.x, z: p.z, land: TRAP_FLIGHT, uses: 1, hits: new Set(), ...ab.mine };
    trap.det = { hidden: true, flying: false, lead: true };
    this.traps.set(trap.id, trap);
    t.yaw = Math.atan2(p.x - t.x, p.z - t.z);
    this.events.push({ k: 'trapThrow', t: t.id, x: r2(p.x), z: r2(p.z), d: TRAP_FLIGHT });
  }

  /** Golden Mine Layer Charged Throw: a mine at the toughest zombie on the map (flyers too). */
  chargedThrow(t, s, ab) {
    const det = { hidden: !!s.hidden, flying: true, lead: true };
    let best = null;
    for (const e of this.enemies.values()) if (canHit(det, e) && (!best || e.hp > best.hp)) best = e;
    if (!best) return;
    const time = 0.8;
    this.shells.push({ tower: t.id, enemy: best.id, x: best.x, z: best.z, time, main: best.id, damage: ab.damage + ab.extra, splash: ab.damage, radius: ab.radius,
      stun: ab.stun, stunAny: true, burn: ab.burn, burnTime: ab.burnTime, det });
    t.yaw = Math.atan2(best.x - t.x, best.z - t.z);
    this.events.push({ k: 'fly', t: t.id, e: best.id, d: time });
  }

  /** Combat Drone Spotter: the toughest zombie in range takes extra damage and is slowed for a while. */
  spotter(t, s, ab) {
    let best = null;
    const det = this.detects(t, s);
    for (const e of this.enemies.values()) {
      if (!canHit(det, e) || (e.x - (t.hx ?? t.x)) ** 2 + (e.z - (t.hz ?? t.z)) ** 2 > s.range * s.range) continue;
      if (!best || e.hp > best.hp) best = e;
    }
    if (!best) return;
    const boss = best.boss;
    best.vuln = Math.max(best.vuln || 0, boss ? ab.bossVuln : ab.vuln);
    best.vulnT = Math.max(best.vulnT || 0, ab.duration);
    best.thornSlow = Math.max(best.thornSlow || 0, boss ? ab.bossSlow : ab.slow);
    best.thornT = Math.max(best.thornT || 0, ab.duration);
    this.events.push({ k: 'spotted', e: best.id, d: ab.duration });
  }

  /** Cowboy cash shot: pays the owner, then the Cowboy twirls its gun for a moment. */
  cashShot(t, c) {
    if (c.captain) {
      // Plunder: only the Captain (its owner's oldest Plunder still standing) digs up treasure.
      let cap = null;
      for (const o of this.towers.values()) if (o.type === t.type && o.owner === t.owner && o.hp > 0 && (!cap || o.id < cap.id)) cap = o;
      if (cap !== t) return;
    }
    const owner = this.players.get(t.owner);
    if (owner) owner.cash += c.pay;
    t.spinT = c.spin;
    this.events.push({ k: 'cash', id: t.id, owner: t.owner, v: c.pay, spin: c.spin, x: t.x, z: t.z });
  }

  /** DJ Booth: never shoots; it only fires the pulses of a Red Drop the Beat. */
  updateBooth(t, s, dt) {
    if (!(t.pulses > 0)) return;
    t.pulseT -= dt;
    if (t.pulseT > 0) return;
    const ab = s.abilities?.find((a) => a.key === 'beat');
    if (!ab) return void (t.pulses = 0);
    t.pulses--;
    t.pulseT += ab.every;
    const det = this.detects(t, s);
    const r2max = s.aura * s.aura;
    for (const e of [...this.enemies.values()]) {
      if (!canHit(det, e) || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > r2max) continue;
      e.vuln = Math.max(e.vuln, ab.vuln);
      e.vulnT = Math.max(e.vulnT, ab.vulnTime);
      this.damage(t, e, ab.pulseDamage);
    }
    this.events.push({ k: 'beat', id: t.id, x: t.x, z: t.z, r: s.aura, c: 2 });
  }

  /** Drop the Beat: what it does depends on the track the DJ Booth is playing. */
  dropBeat(t, s, ab) {
    const track = t.track || 0;
    if (track === 1) {
      const owner = this.players.get(t.owner);
      if (owner) owner.cash += ab.cash;
      this.events.push({ k: 'income', id: t.id, owner: t.owner, v: ab.cash, x: t.x, z: t.z });
    } else if (track === 2) {
      t.pulses = ab.pulses;
      t.pulseT = 0; // the first pulse goes off right away
      return;
    } else {
      const det = this.detects(t, s);
      const r2max = s.aura * s.aura;
      for (const e of this.enemies.values()) {
        if (!canHit(det, e) || e.statusImmune || (e.x - t.x) ** 2 + (e.z - t.z) ** 2 > r2max) continue;
        e.dist = Math.max(0, e.dist - ab.knock * (e.boss ? ab.bossKnock : 1));
        e.beatSlow = Math.max(e.beatSlow, ab.slow);
        e.beatT = Math.max(e.beatT, ab.slowTime);
      }
    }
    this.events.push({ k: 'beat', id: t.id, x: t.x, z: t.z, r: s.aura, c: track });
  }

  /** Skip-test for towers with a deadzone: zombies closer than `r` can't be targeted. */
  deadzone(t, r) {
    return (e) => (e.x - t.x) ** 2 + (e.z - t.z) ** 2 < r * r;
  }

  /**
   * Pump Shotgunner: `pellets` pellets at random angles inside the cone around `aim`. Each one
   * pierces along its line: the first 2 zombies take full damage, the 3rd half.
   * Saboteur: each pellet hits the first `scatter` zombies on its line (full damage) and
   * poisons every zombie it hits.
   */
  pump(t, s, aim) {
    const det = this.detects(t, s);
    const near = [];
    const r2max = s.range * s.range;
    for (const e of this.enemies.values()) {
      if (!canHit(det, e)) continue;
      const dx = e.x - t.x;
      const dz = e.z - t.z;
      if (dx * dx + dz * dz <= r2max) near.push({ e, dx, dz });
    }
    const hits = new Map(); // enemy -> damage this shot
    for (let i = 0; i < s.pellets; i++) {
      const a = aim + (Math.random() * 2 - 1) * s.cone;
      const ux = Math.sin(a);
      const uz = Math.cos(a);
      const line = [];
      for (const n of near) {
        const along = n.dx * ux + n.dz * uz;
        if (along < 0) continue;
        if (Math.abs(n.dx * uz - n.dz * ux) <= PELLET_WIDTH) line.push({ e: n.e, along });
      }
      line.sort((p, q) => p.along - q.along);
      for (let k = 0; k < Math.min(s.scatter ?? 3, line.length); k++) {
        const d = s.scatter || k < 2 ? s.damage : s.damage / 2;
        hits.set(line[k].e, (hits.get(line[k].e) || 0) + d);
      }
    }
    this.events.push({ k: 'pellets', t: t.id, es: [...hits.keys()].map((e) => e.id), a: r2(aim), r: s.range, c: s.cone });
    for (const [e, d] of hits) {
      if (!this.enemies.has(e.id)) continue;
      this.damage(t, e, d);
      if (s.poison && this.enemies.has(e.id)) this.applyPoison(t, e, s.poison);
    }
  }

  /** Saboteur poison: damage every `tick` s and a slow. The strongest poison wins; hits refresh it. */
  applyPoison(t, e, po) {
    if (e.statusImmune || (po.fire && e.fireImmune)) return; // Knifer bleed: fire-immune zombies ignore it
    const old = e.poison;
    if (old && old.left > 0 && old.damage / old.tick > po.damage / po.tick) {
      old.left = Math.max(old.left, po.time);
      return;
    }
    e.poison = { damage: po.damage, tick: po.tick, slow: po.slow, melt: po.melt ?? 0, left: po.time, next: old?.left > 0 ? old.next : po.tick, by: t.id };
  }

  /** Electroshocker: a bolt that hits the target and jumps to the closest unhit zombie, stunning each. */
  chain(t, def, s, target) {
    const det = this.detects(t, s);
    const list = [target];
    const seen = new Set([target.id]);
    let cur = target;
    const j2 = s.jump * s.jump;
    while (list.length < s.chains) {
      let best = null;
      let bestD = Infinity;
      for (const e of this.enemies.values()) {
        if (seen.has(e.id) || !canHit(det, e)) continue;
        const d = (e.x - cur.x) ** 2 + (e.z - cur.z) ** 2;
        if (d <= j2 && d < bestD) {
          best = e;
          bestD = d;
        }
      }
      if (!best) break;
      list.push(best);
      seen.add(best.id);
      cur = best;
    }
    this.events.push({ k: 'zap', t: t.id, es: list.map((e) => e.id) });
    list.forEach((e, i) => {
      if (!this.enemies.has(e.id)) return;
      // Shock Trooper: the jumps after the first zombie do `chainMult` of the damage.
      this.damage(t, e, i && s.chainMult != null ? Math.round(s.damage * s.chainMult * 100) / 100 : s.damage);
      if (s.stun && this.enemies.has(e.id)) this.stop(def, e, s.stun, 'stun');
    });
    // Tesla Smite: every zombie hit fills the meter; when it's full, a thunderbolt hits the target.
    const sm = s.smite;
    if (!sm) return;
    t.meter = (t.meter || 0) + list.length;
    if (t.meter >= sm.hits) {
      t.meter = 0;
      this.events.push({ k: 'smite', x: r2(target.x), z: r2(target.z), r: sm.radius });
      this.explode(t, target.x, target.z, { damage: sm.damage, radius: sm.radius, det, pierceArmor: true, smite: true });
    }
    t.charge = t.meter / sm.hits;
  }

  // ---------------------------------------------------------------- pulses & sweeps

  /** Pulse Trooper: whenever a zombie it can see is in range, sends out a growing ring. */
  firePulse(t, def, s) {
    if (t.cooldown > 0) return;
    const det = this.detects(t, s);
    if (!this.anyNear(t.x, t.z, s.range + PULSE_WIDTH, det)) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.cooldown += s.cooldown;
    this.rings.push({ tower: t.id, x: t.x, z: t.z, r: 0, max: s.range, speed: def.pulse, damage: s.damage, det, hits: new Set() });
    this.events.push({ k: 'pulse', t: t.id, r: r2(s.range), d: r2(s.range / def.pulse) });
  }

  /** Rings grow outward; each zombie the edge passes over is hit once. */
  updateRings(dt) {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      const r0 = ring.r;
      ring.r = Math.min(ring.max, ring.r + ring.speed * dt);
      const lo = Math.max(0, r0 - PULSE_WIDTH);
      const hi = ring.r + PULSE_WIDTH;
      const tower = this.towers.get(ring.tower) ?? null;
      for (const e of [...this.enemies.values()]) {
        if (ring.hits.has(e.id) || !canHit(ring.det, e)) continue;
        const d = Math.hypot(e.x - ring.x, e.z - ring.z);
        if (d < lo || d > hi) continue;
        ring.hits.add(e.id);
        this.events.push({ k: 'slice', e: e.id });
        this.damage(tower, e, ring.damage);
      }
      if (ring.r >= ring.max) this.rings.splice(i, 1);
    }
  }

  /**
   * Sweeper: two lasers on opposite sides of the tower, reaching across the whole map, spin
   * around it (one turn every `spin` seconds) for `duration` seconds.
   */
  sweep(t, ab) {
    const ang = t.yaw || 0;
    this.sweeps.push({ tower: t.id, x: t.x, z: t.z, ang, rate: TAU / ab.spin, spin: ab.spin, left: ab.duration, t: 0, damage: ab.damage, last: [new Map(), new Map()] });
    this.events.push({ k: 'sweep', t: t.id, a: r2(ang), d: ab.duration, s: ab.spin });
  }

  /**
   * Each laser hits every zombie (hidden ones too) it passes over. A zombie can be hit again by
   * the same laser on its next turn, so it's hit about twice per spin while the lasers last.
   */
  updateSweeps(dt) {
    for (let i = this.sweeps.length - 1; i >= 0; i--) {
      const sw = this.sweeps[i];
      const step = Math.min(dt, sw.left);
      const a0 = sw.ang;
      const turn = sw.rate * step;
      sw.ang += turn;
      sw.t += step;
      sw.left -= step;
      const tower = this.towers.get(sw.tower) ?? null;
      for (const e of [...this.enemies.values()]) {
        const dx = e.x - sw.x;
        const dz = e.z - sw.z;
        const d = Math.hypot(dx, dz);
        const tol = d > 0.01 ? Math.atan2(SWEEP_WIDTH, d) : Math.PI;
        const ea = Math.atan2(dx, dz);
        for (let k = 0; k < 2; k++) {
          const diff = (((ea - a0 - k * Math.PI) % TAU) + TAU) % TAU; // how far ahead of the laser it is
          if (diff > turn + tol && diff < TAU - tol) continue;
          const last = sw.last[k].get(e.id);
          if (last != null && sw.t - last < sw.spin * 0.5) continue; // already hit on this pass
          sw.last[k].set(e.id, sw.t);
          this.events.push({ k: 'slice', e: e.id });
          this.damage(tower, e, sw.damage);
          if (!this.enemies.has(e.id)) break;
        }
      }
      if (sw.left <= 0) this.sweeps.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- traps

  /** Path points a Trapper can throw traps on: every unit of path inside its range. */
  trapSpots(t, range) {
    const spots = [];
    const p = {};
    for (let r = 0; r < path.routes.length; r++) {
      for (let d = 0; d < path.length; d += 1) {
        path.at(d, p, r);
        if ((p.x - t.x) ** 2 + (p.z - t.z) ** 2 <= range * range) spots.push({ d, r, x: p.x, z: p.z, dx: p.dx, dz: p.dz });
      }
    }
    if (path.multi) spots.sort((a, b) => a.d - b.d); // castle-most last, whatever its lane
    return spots;
  }

  /** Trapper: throws its next trap (spike / mine / bear, in `order`) onto the path in range. */
  updateTrapper(t, def, s) {
    if (t.cooldown > 0) return;
    if (t.spotsR !== s.range) {
      t.spots = this.trapSpots(t, s.range);
      t.spotsR = s.range;
    }
    if (!t.spots.length) return;
    let mine = 0;
    for (const tr of this.traps.values()) if (tr.tower === t.id && tr.kind !== 'thermite') mine++;
    if (s.maxTraps && mine >= s.maxTraps) {
      t.cooldown = Math.max(0, t.cooldown);
      return;
    }
    t.cooldown += s.cooldown;
    // Aim a little ahead of the lead zombie in range; otherwise anywhere in range.
    // Mine Layer: always the far end of the path in range, so mines stack up where leaks go.
    const far = def.mines ? t.spots[t.spots.length - 1].d - 6 : 0;
    const lead = def.mines ? null : this.findTarget(t, s, t.x, t.z, s.range);
    const ahead = def.mines ? t.spots.filter((p) => p.d >= far) : lead ? t.spots.filter((p) => p.d > lead.dist + 3 && p.d < lead.dist + 12) : [];
    const pool = ahead.length ? ahead : t.spots;
    const spot = pool[Math.floor(Math.random() * pool.length)];
    const lat = (Math.random() - 0.5) * 2;
    const x = spot.x - spot.dz * lat;
    const z = spot.z + spot.dx * lat;
    // Traps switched off in the tower panel are skipped (at least one always stays on).
    const order = s.order.filter((k) => !t.off?.includes(k));
    const use = order.length ? order : s.order;
    const kind = use[t.trapN++ % use.length];
    const st = s[kind];
    const trap = { id: this.nextId++, tower: t.id, kind, x, z, land: TRAP_FLIGHT, uses: st.uses ?? 1, hits: new Set(), ...st };
    trap.bossStop = def.bossStop;
    // Mine Layer mines only see hidden zombies when the tower does (Trapper traps always do).
    trap.det = def.mines ? { hidden: !!s.hidden, flying: false, lead: true } : GROUND_BLAST;
    this.traps.set(trap.id, trap);
    t.yaw = Math.atan2(x - t.x, z - t.z);
    this.events.push({ k: 'trapThrow', t: t.id, x: r2(x), z: r2(z), d: TRAP_FLIGHT });
  }

  /** Traps spring when a zombie (hidden ones too, not flyers) walks over them. */
  updateTraps(dt) {
    for (const tr of this.traps.values()) {
      if (tr.kind === 'grave' || tr.kind === 'sentry') continue; // Necromancer / Engineer builds
      if (tr.kind === 'thermite') {
        this.burnPatch(tr, dt);
        continue;
      }
      if (tr.kind === 'gas') {
        this.gasCloud(tr, dt);
        continue;
      }
      if (tr.kind === 'thorns') {
        this.thornPatch(tr, dt);
        continue;
      }
      if (tr.kind === 'goo') {
        this.gooPuddle(tr, dt);
        continue;
      }
      if (tr.life != null && (tr.life -= dt) <= 0) tr.uses = 0; // Mine Layer mine wore out
      if (tr.land > 0) {
        tr.land -= dt;
        continue;
      }
      const tower = this.towers.get(tr.tower) ?? null;
      for (const e of tr.uses > 0 ? [...this.enemies.values()] : []) {
        if (e.flying || !canHit(tr.det, e)) continue; // flyers pass over traps
        if ((e.x - tr.x) ** 2 + (e.z - tr.z) ** 2 > TRAP_HIT * TRAP_HIT) continue;
        if (tr.kind === 'spike') {
          if (tr.hits.has(e.id)) continue;
          tr.hits.add(e.id);
          this.events.push({ k: 'slice', e: e.id });
          if (tr.pool != null) {
            // Trapper X: a spike with health wears down by the damage it deals.
            this.poolSpike(tower, tr, e);
            if (tr.pool > 0) continue;
          } else {
            this.damage(tower, e, tr.damage);
            if (--tr.uses > 0) continue;
          }
        } else if (tr.kind === 'mine') {
          this.explode(tower, tr.x, tr.z, { damage: tr.damage, radius: tr.radius, det: tr.det, burn: tr.burn, burnTime: tr.burnTime, stun: tr.stun }); // Golden S-Mine: stuns
          if (tr.thermite) this.dropThermite(tr);
        } else {
          this.events.push({ k: 'slice', e: e.id });
          this.stop({ bossStop: tr.bossStop, noVoidStun: tower ? TOWERS[tower.type].noVoidStun : false }, e, tr.stun, 'stun');
          this.damage(tower, e, tr.damage);
        }
        tr.uses = 0;
        break;
      }
      if (tr.uses <= 0) {
        this.traps.delete(tr.id);
        this.events.push({ k: 'trapGone', id: tr.id, kind: tr.kind, x: r2(tr.x), z: r2(tr.z) });
      }
    }
  }

  /**
   * Trapper X spike: zombie `e` takes up to the spike's health left (`shred`: zombies with more
   * than `shred.over` max health take `shred.mult` x as much for the same wear). A used-up spike
   * with `boom` explodes.
   */
  poolSpike(tower, tr, e) {
    const mult = tr.shred && e.maxHp > tr.shred.over ? tr.shred.mult : 1;
    const hit = Math.min(tr.pool * mult, e.hp);
    this.damage(tower, e, hit);
    tr.pool -= hit / mult;
    if (tr.pool > 0.01) return;
    tr.pool = 0;
    if (tr.boom) this.explode(tower, tr.x, tr.z, { damage: tr.boom.damage, radius: tr.boom.radius, det: tr.det });
  }

  /** Mine Layer Thermite: a burning patch where a mine went off. */
  dropThermite(tr) {
    const th = tr.thermite;
    const p = { id: this.nextId++, tower: tr.tower, kind: 'thermite', x: tr.x, z: tr.z, land: 0, radius: th.radius, left: th.time, burn: th.burn, burnTime: th.burnTime, det: tr.det };
    this.traps.set(p.id, p);
  }

  /** Thermite patch: sets every ground zombie inside it on fire until it burns out. */
  burnPatch(p, dt) {
    if ((p.left -= dt) <= 0) {
      this.traps.delete(p.id);
      this.events.push({ k: 'trapGone', id: p.id, kind: p.kind, x: r2(p.x), z: r2(p.z) });
      return;
    }
    const r2max = p.radius * p.radius;
    for (const e of this.enemies.values()) {
      if (e.flying || !canHit(p.det, e) || (e.x - p.x) ** 2 + (e.z - p.z) ** 2 > r2max) continue;
      this.ignite(e, p.tower, p.burn, p.burnTime, 0);
    }
  }

  /** Toxicnator gas cloud: gasses up to `targets` different zombies that come inside it. */
  gasCloud(p, dt) {
    if ((p.left -= dt) <= 0) {
      this.traps.delete(p.id);
      this.events.push({ k: 'trapGone', id: p.id, kind: p.kind, x: r2(p.x), z: r2(p.z) });
      return;
    }
    const r2max = p.radius * p.radius;
    for (const e of this.enemies.values()) {
      if (!canHit(p.det, e) || (e.x - p.x) ** 2 + (e.z - p.z) ** 2 > r2max) continue;
      if (!p.hits.has(e.id)) {
        if (p.hits.size >= p.targets) continue;
        p.hits.add(e.id);
      }
      // One gas stack per cloud, so gas from several clouds adds up.
      (e.gas ??= new Map()).set(p.id, { dps: p.dps, left: p.time, by: p.tower });
    }
  }

  /** Toxic Blast: zombie `e` takes extra damage from everything for a while. */
  weaken(e, tx) {
    const v = e.boss && tx.bossVuln != null ? tx.bossVuln : tx.vuln;
    e.vuln = Math.max(e.vuln, v);
    e.vulnT = Math.max(e.vulnT, tx.vulnTime);
    if (tx.key === 'neuralyze') e.neuroT = Math.max(e.neuroT, tx.vulnTime); // Saboteur: towers target it first
  }

  removeTrapsOf(towerId) {
    for (const tr of this.traps.values()) if (tr.tower === towerId) this.traps.delete(tr.id);
  }
}
