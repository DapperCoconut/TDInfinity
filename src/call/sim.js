// Mysterious Call (Contract 4, see call/data.js): the rules of the haunted-mansion game.
// No three.js and no page here, so it also runs in Node (tools/check.mjs plays it with a bot).
// The mansion is flat: x from -24 to 24, z from -16 to 16. Ghosts fly through walls; you and
// your shots don't.

import { CALL, CLASSES, GHOSTS } from './data.js';

export const EYE = 1.6; // your eye height
const PR = 0.45; // your radius
export const BOUNDS = { x0: -24, x1: 24, z0: -16, z1: 16 };

// Walls (tall: they stop shots) and furniture (low: only you bump into it). [x0, z0, x1, z1, height]
const T = 0.25; // half a wall's thickness
export const WALLS = [
  [-24 - T, -16 - T, 24 + T, -16 + T, 4], [-24 - T, 16 - T, 24 + T, 16 + T, 4], // north, south
  [-24 - T, -16, -24 + T, 16, 4], [24 - T, -16, 24 + T, 16, 4], // west, east
  // The hall's side walls, with a doorway into each wing room.
  ...[-8, 8].flatMap((x) => [[x - T, -16, x + T, -10, 4], [x - T, -7, x + T, 7, 4], [x - T, 10, x + T, 16, 4]]),
  // Each wing split into two rooms, with a doorway between.
  [-24, -T, -17, T, 4], [-14, -T, -8, T, 4], [8, -T, 14, T, 4], [17, -T, 24, T, 4],
  // Pillars in the hall.
  ...[[-4.5, -10], [4.5, -10], [-4.5, 10], [4.5, 10]].map(([x, z]) => [x - 0.45, z - 0.45, x + 0.45, z + 0.45, 4]),
].map(([x0, z0, x1, z1, h]) => ({ x0, z0, x1, z1, h, wall: true }));
export const FURNITURE = [
  [-1.1, -4, 1.1, 4, 0.8, 'table'], // the long dining table
  [-22, -12, -19, -10.5, 0.9, 'bed'], [-22, 4, -20.5, 8, 0.6, 'couch'], [-13, 11, -10, 12.5, 0.8, 'piano'],
  [19, -14, 22, -12.5, 1, 'shelf'], [12, -6, 14, -4, 0.8, 'table'], [20, 10, 22.5, 14, 0.6, 'couch'], [10, 13, 12, 15, 0.9, 'chest'],
].map(([x0, z0, x1, z1, h, kind]) => ({ x0, z0, x1, z1, h, kind }));
const BLOCKS = [...WALLS, ...FURNITURE];
// Where ghosts come in: the fireplaces and the windows along the walls.
export const SPAWNS = [[-22, -15], [22, -15], [-22, 15], [22, 15], [0, -15.5], [0, 15.5], [-23.5, -5], [23.5, 5], [-15, -15.5], [15, 15.5]];
const START = { x: 0, z: 9 };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angleDiff = (a, b) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
const inBox = (b, x, z, r = 0) => x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r;

/** How far a ray (x, z) + t (dx, dz) goes before it hits a wall (Infinity if none). Flat: walls are tall. */
export function wallHit(x, z, dx, dz, max = 200) {
  let best = max;
  for (const b of WALLS) {
    let t0 = 0;
    let t1 = best;
    for (const [o, d, lo, hi] of [[x, dx, b.x0, b.x1], [z, dz, b.z0, b.z1]]) {
      if (Math.abs(d) < 1e-9) {
        if (o < lo || o > hi) t0 = Infinity;
        continue;
      }
      let a = (lo - o) / d;
      let c = (hi - o) / d;
      if (a > c) [a, c] = [c, a];
      t0 = Math.max(t0, a);
      t1 = Math.min(t1, c);
    }
    if (t0 <= t1 && t0 < best) best = t0;
  }
  return best;
}

export class CallSim {
  constructor(cls = 'paintballer') {
    this.cls = CLASSES[cls] ? cls : 'paintballer';
    const c = (this.c = CLASSES[this.cls]);
    this.p = { x: START.x, z: START.z, yaw: 0, pitch: 0, hp: c.hp, maxHp: c.hp, fireCd: 0, altCd: 0, heat: 0, hot: 0, hurtT: 0 };
    this.ghosts = new Map();
    this.shots = []; // your bullets, paint bombs and knives in flight
    this.orbs = []; // ghost spit, flying at you through anything
    this.traps = []; // Ghostbuster traps on the floor
    this.candles = []; // Allister's red candles
    this.beam = null; // { x, y, z } where your beam ends this frame (and `on`: the ghost it hits)
    this.nextId = 1;
    this.wave = { n: 0, state: 'wait', t: CALL.firstWait, queue: [], spawnT: 0 };
    this.over = 0; // 1 won, -1 lost
    this.time = 0;
    this.events = [];
  }

  get aim() {
    const { yaw, pitch } = this.p;
    return { x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) };
  }

  /**
   * One step. `inp`: { fwd, side (-1..1), yaw, pitch, fire (held), alt (pressed this step) }.
   */
  step(dt, inp) {
    if (this.over) return;
    this.time += dt;
    const p = this.p;
    p.yaw = inp.yaw ?? p.yaw;
    p.pitch = clamp(inp.pitch ?? p.pitch, -1.4, 1.4);
    this.move(dt, inp.fwd ?? 0, inp.side ?? 0);
    this.weapons(dt, !!inp.fire, !!inp.alt);
    this.waves(dt);
    this.updateGhosts(dt);
    this.updateShots(dt);
    this.updateOrbs(dt);
    this.updateTraps(dt);
    p.hurtT = Math.max(0, p.hurtT - dt);
    if ((p.calmT = (p.calmT ?? 0) + dt) > CALL.regen.after && p.hp > 0) p.hp = Math.min(p.maxHp, p.hp + CALL.regen.rate * dt);
    if (p.hp <= 0 && !this.over) {
      p.hp = 0;
      this.over = -1;
      this.events.push({ k: 'lose' });
    }
  }

  // ---------------------------------------------------------------- you

  move(dt, fwd, side) {
    const p = this.p;
    let len = Math.hypot(fwd, side);
    if (len < 0.01) return;
    if (len > 1) {
      fwd /= len;
      side /= len;
    }
    const s = this.c.speed * dt;
    const sin = Math.sin(p.yaw);
    const cos = Math.cos(p.yaw);
    // Forward is -z when yaw is 0; right is +x.
    this.slide(p, (-sin * fwd + cos * side) * s, (-cos * fwd - sin * side) * s);
  }

  /** Moves you by (dx, dz), sliding along walls and furniture. */
  slide(p, dx, dz) {
    p.x += dx;
    for (const b of BLOCKS) if (inBox(b, p.x, p.z, PR)) p.x = dx > 0 ? b.x0 - PR : b.x1 + PR;
    p.z += dz;
    for (const b of BLOCKS) if (inBox(b, p.x, p.z, PR)) p.z = dz > 0 ? b.z0 - PR : b.z1 + PR;
  }

  /** The first ghost along a ray from your eye (within `range`, before a wall): [ghost, distance]. */
  rayGhost(dir, range, skip) {
    const p = this.p;
    const flat = Math.hypot(dir.x, dir.z) || 1e-9;
    const wall = wallHit(p.x, p.z, dir.x / flat, dir.z / flat) / flat; // along the 3D ray
    const max = Math.min(range, wall);
    let best = null;
    let bestT = max;
    for (const g of this.ghosts.values()) {
      if (skip?.has(g.id)) continue;
      const ox = g.x - p.x, oy = g.y - EYE, oz = g.z - p.z;
      const t = ox * dir.x + oy * dir.y + oz * dir.z;
      if (t < 0 || t > bestT + g.r) continue;
      const d2 = ox * ox + oy * oy + oz * oz - t * t;
      if (d2 > g.r * g.r) continue;
      const hitT = t - Math.sqrt(g.r * g.r - d2);
      if (hitT < bestT) {
        bestT = Math.max(0, hitT);
        best = g;
      }
    }
    return [best, bestT];
  }

  weapons(dt, fire, alt) {
    const p = this.p;
    const f = this.c.fire;
    p.fireCd -= dt;
    p.altCd = Math.max(0, p.altCd - dt);
    this.beam = null;
    const aim = this.aim;
    if (f.heat) {
      if (p.hot > 0) {
        p.hot -= dt;
        if (p.hot <= 0) p.heat = 0;
      } else if (!fire) p.heat = Math.max(0, p.heat - dt * (f.heat / f.cool));
    }
    if (fire && !(p.hot > 0)) {
      if (f.kind === 'beam') {
        const [g, t] = this.rayGhost(aim, f.range);
        this.beam = { x: p.x + aim.x * t, y: EYE + aim.y * t, z: p.z + aim.z * t, on: g?.id ?? 0 };
        if (g) {
          this.hurt(g, f.dps * dt, true);
          if (f.slow) g.slowT = Math.max(g.slowT, 0.2), (g.slowBy = Math.max(g.slowBy ?? 0, f.slow));
        }
        if (f.heat && (p.heat += dt) >= f.heat) {
          p.hot = f.cool;
          this.events.push({ k: 'overheat' });
        }
      } else if (f.kind === 'vacuum') {
        // Sucks at the nearest ghost in reach, wherever you look.
        let best = null;
        let bd = f.range;
        for (const g of this.ghosts.values()) {
          const d = Math.hypot(g.x - p.x, g.z - p.z);
          if (d < bd) (bd = d), (best = g);
        }
        if (best) {
          this.beam = { x: best.x, y: best.y, z: best.z, on: best.id, vac: true };
          this.hurt(best, f.dps * dt, true);
          if (!best.def.boss && bd > f.pullTo) {
            best.x += ((p.x - best.x) / bd) * f.pull * dt;
            best.z += ((p.z - best.z) / bd) * f.pull * dt;
          }
        }
      } else if (p.fireCd <= 0) {
        p.fireCd = 1 / f.rate;
        this.events.push({ k: 'shoot', kind: f.kind });
        if (f.kind === 'shot') this.addShot(aim, f.speed, { dmg: f.dmg, splash: f.splash, splashPct: f.splashPct, size: f.size, look: this.cls });
        else if (f.kind === 'pellets') {
          for (let i = 0; i < f.n; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * f.spread;
            const d = norm({ x: aim.x + Math.cos(a) * r * Math.cos(p.yaw), y: aim.y + Math.sin(a) * r, z: aim.z - Math.cos(a) * r * Math.sin(p.yaw) });
            const [g, t] = this.rayGhost(d, f.range);
            this.events.push({ k: 'tracer', x: p.x + d.x * t, y: EYE + d.y * t, z: p.z + d.z * t });
            if (g) this.hurt(g, f.dmg);
          }
        } else if (f.kind === 'melee') {
          for (const g of [...this.ghosts.values()]) {
            const d = Math.hypot(g.x - p.x, g.z - p.z) - g.r;
            if (d < f.reach && angleDiff(Math.atan2(-(g.x - p.x), -(g.z - p.z)), p.yaw) < f.arc / 2) this.hurt(g, f.dmg);
          }
        }
      }
    }
    if (alt && p.altCd <= 0) {
      const a = this.c.alt;
      p.altCd = a.cd;
      this.events.push({ k: 'alt', kind: a.kind });
      if (a.kind === 'paintBomb') this.addShot({ x: aim.x, y: aim.y + 0.35, z: aim.z }, a.speed, { bomb: a, grav: 14, size: 0.25, look: 'bomb' });
      else if (a.kind === 'throw') this.addShot(aim, a.speed, { dmg: a.dmg, pierce: true, size: a.size, look: 'knife' });
      else if (a.kind === 'shove' || a.kind === 'flash') {
        for (const g of [...this.ghosts.values()]) {
          const dx = g.x - p.x, dz = g.z - p.z;
          const d = Math.hypot(dx, dz);
          if (d - g.r > a.reach || angleDiff(Math.atan2(-dx, -dz), p.yaw) > a.arc / 2) continue;
          if (a.kind === 'shove' && !g.def.boss) {
            g.kx = (dx / (d || 1)) * a.push * 2.5;
            g.kz = (dz / (d || 1)) * a.push * 2.5;
          }
          if (a.kind === 'flash') g.stunT = Math.max(g.stunT, g.def.boss ? a.stun / 3 : a.stun);
          this.hurt(g, a.dmg);
        }
      } else if (a.kind === 'trap') {
        // On the floor where you aim (as far as `reach`), or in front of a wall.
        let t = aim.y < -0.05 ? EYE / -aim.y : a.reach;
        const flat = Math.hypot(aim.x, aim.z) || 1e-9;
        t = Math.min(t * flat, a.reach, wallHit(p.x, p.z, aim.x / flat, aim.z / flat) - 0.5);
        this.traps.push({ id: this.nextId++, x: p.x + (aim.x / flat) * t, z: p.z + (aim.z / flat) * t, left: a.hold, r: a.radius, dps: a.dps });
      } else if (a.kind === 'candle') {
        if (this.candles.length >= a.max) this.candles.shift();
        this.candles.push({ id: this.nextId++, x: p.x, z: p.z, left: a.lasts });
      }
    }
  }

  addShot(dir, speed, o) {
    const p = this.p;
    this.shots.push({ id: this.nextId++, x: p.x + dir.x * 0.6, y: EYE - 0.15 + dir.y * 0.6, z: p.z + dir.z * 0.6, vx: dir.x * speed, vy: dir.y * speed, vz: dir.z * speed, life: 2.5, hit: new Set(), ...o });
  }

  // ---------------------------------------------------------------- waves and ghosts

  waves(dt) {
    const w = this.wave;
    if (w.state === 'wait') {
      w.t -= dt;
      if (w.t > 0) return;
      w.n++;
      w.state = 'wave';
      const list = [];
      for (const [k, n] of CALL.waves[w.n - 1]) for (let i = 0; i < n; i++) list.push(k);
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      const b = list.indexOf('boss');
      if (b > 0) list.unshift(...list.splice(b, 1)); // the boss comes first
      w.queue = list;
      w.spawnT = 0;
      w.total = list.length;
      this.events.push({ k: 'wave', n: w.n });
      return;
    }
    if (w.queue.length) {
      w.spawnT -= dt;
      if (w.spawnT <= 0 && this.ghosts.size < CALL.maxAlive) {
        w.spawnT = CALL.gap;
        this.spawn(w.queue.shift());
      }
    } else if (!this.ghosts.size) {
      if (w.n >= CALL.waves.length) {
        this.over = 1;
        this.events.push({ k: 'win' });
        return;
      }
      w.state = 'wait';
      w.t = CALL.between;
      const p = this.p;
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * CALL.healBetween);
      this.events.push({ k: 'clear', n: w.n });
    }
  }

  /** A ghost at the spawn point furthest from you (bosses), or a random one not too close. */
  spawn(type, at) {
    const def = GHOSTS[type];
    const p = this.p;
    let x, z;
    if (at) ({ x, z } = at);
    else {
      const far = SPAWNS.filter(([sx, sz]) => Math.hypot(sx - p.x, sz - p.z) > 12);
      const list = def.boss ? [SPAWNS.reduce((a, b) => (Math.hypot(b[0] - p.x, b[1] - p.z) > Math.hypot(a[0] - p.x, a[1] - p.z) ? b : a))] : far.length ? far : SPAWNS;
      [x, z] = list[Math.floor(Math.random() * list.length)];
    }
    const hp = Math.round(def.hp * (1 + CALL.hpGrow * Math.max(0, this.wave.n - 1)));
    const g = { id: this.nextId++, type, def, x, z, y: 1.3 * def.size, r: 0.55 * def.size, hp, maxHp: hp, shield: def.shield?.hp ?? 0, quietT: 0,
      hitCd: 0, shootT: def.shoot?.every ?? 0, summonT: def.summon?.every ?? 0, volleyT: def.volley?.every ?? 0, stunT: 0, slowT: 0, slowBy: 0, kx: 0, kz: 0, held: 0, bob: Math.random() * 6 };
    this.ghosts.set(g.id, g);
    this.events.push({ k: 'spawn', id: g.id, boss: !!def.boss });
    return g;
  }

  updateGhosts(dt) {
    const p = this.p;
    for (const g of [...this.ghosts.values()]) {
      const def = g.def;
      g.bob += dt * 2;
      g.hitCd -= dt;
      g.stunT = Math.max(0, g.stunT - dt);
      g.slowT = Math.max(0, g.slowT - dt);
      if (!g.slowT) g.slowBy = 0;
      if (def.shield && (g.quietT += dt) > def.shield.regenAfter) g.shield = Math.min(def.shield.hp, g.shield + def.shield.regen * dt);
      const dx = p.x - g.x, dz = p.z - g.z;
      const d = Math.hypot(dx, dz) || 1e-6;
      // Pushed back (John's shove): slides away and slows down.
      g.x += g.kx * dt;
      g.z += g.kz * dt;
      g.kx *= Math.exp(-5 * dt);
      g.kz *= Math.exp(-5 * dt);
      let speed = def.speed * (1 - g.slowBy);
      if (def.rage && g.hp < g.maxHp * def.rage.at) speed *= def.rage.speed;
      if (g.stunT > 0 || g.held > 0) speed = 0;
      let want = 1;
      // Spitters stop once they are close enough and can see you (no wall between).
      const sees = !def.keep || wallHit(g.x, g.z, dx / d, dz / d, d) >= d;
      if (def.keep) want = d > def.keep || !sees ? 1 : 0;
      if (speed > 0 && want) {
        // Toward you, a little sideways around other ghosts.
        let mx = (dx / d) * want, mz = (dz / d) * want;
        for (const o of this.ghosts.values()) {
          if (o === g) continue;
          const ox = g.x - o.x, oz = g.z - o.z;
          const od = Math.hypot(ox, oz);
          if (od < g.r + o.r + 0.3 && od > 1e-4) (mx += (ox / od) * 0.6), (mz += (oz / od) * 0.6);
        }
        const ml = Math.hypot(mx, mz) || 1;
        const step = want > 0 ? Math.min(speed * dt, Math.max(0, d - (g.r + PR) * 0.9)) : speed * dt; // (stops at you)
        g.x += (mx / ml) * step;
        g.z += (mz / ml) * step;
      }
      g.x = clamp(g.x, BOUNDS.x0 + 0.5, BOUNDS.x1 - 0.5);
      g.z = clamp(g.z, BOUNDS.z0 + 0.5, BOUNDS.z1 - 0.5);
      g.y = 1.3 * def.size + Math.sin(g.bob) * 0.15;
      if (g.stunT > 0) continue;
      // Touching you hurts.
      const near = Math.hypot(p.x - g.x, p.z - g.z);
      if (def.dmg && near < g.r + PR + 0.35 && g.hitCd <= 0) {
        g.hitCd = 1;
        this.hurtMe(def.dmg);
      }
      if (def.blast && near < def.blast.at) {
        this.explode(g, true);
        continue;
      }
      if (def.shoot && (g.shootT -= dt) <= 0 && sees) {
        g.shootT = def.shoot.every;
        this.spit(g, def.shoot.dmg, def.shoot.speed, 0);
      }
      if (def.summon && (g.summonT -= dt) <= 0) {
        g.summonT = def.summon.every;
        for (let i = 0; i < def.summon.n; i++) {
          const a = Math.random() * Math.PI * 2;
          this.spawn(def.summon.kinds[i % def.summon.kinds.length], { x: clamp(g.x + Math.cos(a) * 3, -23, 23), z: clamp(g.z + Math.sin(a) * 3, -15, 15) });
        }
        this.events.push({ k: 'summon', x: g.x, z: g.z });
      }
      if (def.volley && (g.volleyT -= dt) <= 0) {
        g.volleyT = def.volley.every;
        const v = def.volley;
        for (let i = 0; i < v.n; i++) this.spit(g, v.dmg, v.speed, (i / (v.n - 1) - 0.5) * v.spread);
      }
    }
  }

  /** A ghost spits an orb at you (turned by `turn` radians). */
  spit(g, dmg, speed, turn) {
    const p = this.p;
    const a = Math.atan2(p.z - g.z, p.x - g.x) + turn;
    const d = Math.hypot(p.x - g.x, p.z - g.z) || 1;
    const vy = ((1.0 - g.y) / d) * speed;
    this.orbs.push({ id: this.nextId++, x: g.x, y: g.y, z: g.z, vx: Math.cos(a) * speed, vy, vz: Math.sin(a) * speed, dmg, life: 5 });
  }

  /** A Boomer goes off. Near you it hurts you; it always hurts the ghosts around it. */
  explode(g, hurtsYou) {
    const b = g.def.blast;
    this.ghosts.delete(g.id);
    this.events.push({ k: 'boom', x: g.x, y: g.y, z: g.z, r: b.radius });
    if (hurtsYou && Math.hypot(this.p.x - g.x, this.p.z - g.z) < b.radius) this.hurtMe(b.dmg);
    for (const o of [...this.ghosts.values()]) if (Math.hypot(o.x - g.x, o.z - g.z) < b.radius + o.r) this.hurt(o, b.dmg);
  }

  hurtMe(dmg) {
    const p = this.p;
    p.hp -= dmg;
    p.hurtT = 0.4;
    p.calmT = 0;
    this.events.push({ k: 'hurt', dmg });
  }

  /** Damages a ghost: its shield first. `quiet`: a beam (no hit event every frame). */
  hurt(g, dmg, quiet) {
    if (!this.ghosts.has(g.id)) return;
    g.quietT = 0;
    if (g.shield > 0) {
      const s = Math.min(g.shield, dmg);
      g.shield -= s;
      dmg -= s;
      if (g.shield <= 0) this.events.push({ k: 'shieldBreak', x: g.x, y: g.y, z: g.z });
    }
    g.hp -= dmg;
    if (!quiet) this.events.push({ k: 'hit', id: g.id, x: g.x, y: g.y, z: g.z });
    if (g.hp > 0) return;
    if (g.def.blast) return this.explode(g, false);
    this.ghosts.delete(g.id);
    this.events.push({ k: 'kill', type: g.type, x: g.x, y: g.y, z: g.z, color: g.def.color, size: g.def.size });
  }

  // ---------------------------------------------------------------- things in flight

  updateShots(dt) {
    const keep = [];
    for (const s of this.shots) {
      let gone = false;
      const steps = Math.max(1, Math.ceil((Math.hypot(s.vx, s.vy, s.vz) * dt) / 0.3));
      const h = dt / steps;
      for (let i = 0; i < steps && !gone; i++) {
        if (s.grav) s.vy -= s.grav * h;
        s.x += s.vx * h;
        s.y += s.vy * h;
        s.z += s.vz * h;
        if (s.y <= 0.05 || WALLS.some((b) => inBox(b, s.x, s.z, 0.05))) {
          gone = true;
          if (s.bomb) this.paintBoom(s);
          else this.events.push({ k: 'splat', x: s.x, y: Math.max(0.05, s.y), z: s.z, look: s.look });
          break;
        }
        for (const g of this.ghosts.values()) {
          if (s.hit.has(g.id) || (g.x - s.x) ** 2 + (g.y - s.y) ** 2 + (g.z - s.z) ** 2 > (g.r + (s.size ?? 0.1)) ** 2) continue;
          if (s.bomb) {
            gone = true;
            this.paintBoom(s);
            break;
          }
          s.hit.add(g.id);
          this.hurt(g, s.dmg);
          if (s.splash) {
            for (const o of [...this.ghosts.values()]) if (o !== g && Math.hypot(o.x - s.x, o.z - s.z) < s.splash + o.r) this.hurt(o, s.dmg * s.splashPct);
            this.events.push({ k: 'splat', x: s.x, y: s.y, z: s.z, look: s.look });
          }
          if (!s.pierce) {
            gone = true;
            break;
          }
        }
      }
      if (!gone && (s.life -= dt) > 0) keep.push(s);
    }
    this.shots = keep;
  }

  paintBoom(s) {
    const a = s.bomb;
    this.events.push({ k: 'paint', x: s.x, y: Math.max(0.05, s.y), z: s.z, r: a.radius });
    for (const g of [...this.ghosts.values()]) {
      if (Math.hypot(g.x - s.x, g.z - s.z) > a.radius + g.r) continue;
      g.slowT = Math.max(g.slowT, a.slowFor);
      g.slowBy = Math.max(g.slowBy, a.slow);
      this.hurt(g, a.dmg);
    }
  }

  updateOrbs(dt) {
    const p = this.p;
    this.orbs = this.orbs.filter((o) => {
      o.x += o.vx * dt;
      o.y = Math.max(0.4, o.y + o.vy * dt);
      o.z += o.vz * dt;
      if (Math.hypot(o.x - p.x, o.z - p.z) < PR + 0.35 && o.y < 2.1) {
        this.hurtMe(o.dmg);
        return false;
      }
      return (o.life -= dt) > 0;
    });
  }

  updateTraps(dt) {
    for (const t of this.traps) {
      t.left -= dt;
      for (const g of this.ghosts.values()) {
        const d = Math.hypot(g.x - t.x, g.z - t.z);
        if (d > t.r + g.r) continue;
        if (g.def.boss) {
          g.slowT = Math.max(g.slowT, 0.2);
          g.slowBy = Math.max(g.slowBy, 0.4);
        } else {
          g.held = 0.15;
          const pull = Math.min(d, 6 * dt);
          if (d > 0.01) (g.x += ((t.x - g.x) / d) * pull), (g.z += ((t.z - g.z) / d) * pull);
        }
        this.hurt(g, t.dps * dt, true);
      }
    }
    for (const g of this.ghosts.values()) g.held = Math.max(0, g.held - dt);
    this.traps = this.traps.filter((t) => t.left > 0);
    // Allister's candles heal you while you stand near one.
    const a = this.c.alt;
    const p = this.p;
    for (const c of this.candles) {
      c.left -= dt;
      if (Math.hypot(c.x - p.x, c.z - p.z) < a.radius) p.hp = Math.min(p.maxHp, p.hp + a.heal * dt);
    }
    this.candles = this.candles.filter((c) => c.left > 0);
  }
}

function norm(v) {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}
