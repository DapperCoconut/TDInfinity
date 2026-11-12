// What Christmas Night 1's enemies do (src/christmas.js): Unstable Ice's Flash Freeze, the Frost
// Hero's Frost Hand, and the Frost Spirit's whole fight. (The Hero's Tundra Slam is the plain `slam`,
// the Necromancer's Snow Minions the plain `summon`, the Ravager's shield `osh` + `shieldArmor`.)
// A frozen tower is a stunned one (it can't fire), shown with ice.
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { ENEMIES } from '../../config.js';
import { HERO_TOWERS } from '../../herotowers.js';
import { r2 } from './shared.js';

/** Enemies that use christmasMoves (sim.js checks this set every tick). Night 2's too. */
export const XM_FX = new Set(Object.keys(ENEMIES).filter((k) => {
  const d = ENEMIES[k];
  return d.frostHand || d.frostSpirit || d.ignite || d.xcDash || d.santaBot || d.exoSanta;
}));
const HEROES = new Set(Object.keys(HERO_TOWERS)); // Blizzard Warrior: the towers its dash stuns

const ICE = 0x80deea;

export class SimChristmas {

  /** Freezes every tower within `r` of (x, z) for `secs` (and `filter` picks which). Returns how many. */
  freezeTowers(x, z, r, secs, filter = null) {
    const n = this.hexTowers(x, z, r, 'stun', secs, true, filter);
    this.events.push({ k: 'eBlast', x: r2(x), z: r2(z), r: Math.min(r, 60), c: ICE });
    return n;
  }

  /** Unstable Ice: when it dies, the towers around it freeze and units take damage. */
  flashFreeze(e, f) {
    const n = this.freezeTowers(e.x, e.z, f.radius, f.freeze);
    if (f.unitDmg) this.hurtUnitsNear(e.x, e.z, f.radius, f.unitDmg);
    if (n) this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: `❄️ FLASH FREEZE! ${n} frozen`, color: '#84ffff' });
  }

  /** One enemy's Christmas moves for this tick (before it walks). */
  christmasMoves(e, def, dt) {
    const T = (e.xmT ??= {});
    const k = def.frostSpirit;
    // Flying Frost: at half health the Frost Spirit takes to its wings and speeds up (even when stopped).
    if (k && !T.flying && e.hp <= e.maxHp * k.fly.at) {
      T.flying = true;
      e.baseSpeed = k.fly.speed;
      this.events.push({ k: 'xmFly', e: e.id });
      this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: '🪽 FLYING FROST! It speeds up!', color: '#84ffff' });
    }
    // Antarctic Mist keeps hurting units for a few ticks after the breath.
    if (T.mistLeft > 0 && (T.mistTick -= dt) <= 0) {
      T.mistLeft--;
      T.mistTick = 1;
      this.hurtUnitsNear(T.mistX, T.mistZ, k.mist.range, k.mist.unitDmg);
    }
    // Christmas Night 2 Coal Man: at 65% health it catches fire and runs.
    if (def.ignite && !T.lit && e.hp <= e.maxHp * def.ignite.at) {
      T.lit = true;
      e.baseSpeed = def.ignite.speed;
      this.events.push({ k: 'enrage', e: e.id });
    }
    if (e.stop) return; // stunned or frozen: no attacks
    if (def.xcDash) this.warriorDash(e, def.xcDash, T, dt);
    if (def.santaBot) this.santaBotFight(e, def.santaBot, T, dt);
    if (def.exoSanta) this.exoSantaFight(e, def.exoSanta, T, dt);
    // Frost Hero's Frost Hand: freezes the towers round one tower in range and hurts units there.
    const fh = def.frostHand;
    if (fh && ((T.hand ??= fh.every * 0.5), (T.hand -= dt) <= 0)) {
      const list = [...this.towers.values()].filter((t) => !this.stealthy(t) && (t.x - e.x) ** 2 + (t.z - e.z) ** 2 <= fh.range * fh.range);
      if (!list.length) T.hand = 1;
      else {
        T.hand = fh.every;
        const t = list[Math.floor(Math.random() * list.length)];
        const n = this.freezeTowers(t.x, t.z, fh.radius, fh.freeze);
        this.hurtUnitsNear(t.x, t.z, fh.radius, fh.unitDmg);
        this.events.push({ k: 'eShot', e: e.id, kind: 'laser', fx: r2(e.x), fz: r2(e.z), x: r2(t.x), z: r2(t.z), d: 0, c: ICE });
        this.events.push({ k: 'chaos', x: r2(t.x), z: r2(t.z), text: `🖐️ FROST HAND! ${n} frozen`, color: '#84ffff' });
      }
    }
    if (k) this.frostSpiritFight(e, k, T, dt);
  }

  /** The Frost Spirit: Frostbite Slam, Nausea Stomp and Antarctic Mist, each on its own timer. */
  frostSpiritFight(e, k, T, dt) {
    T.column ??= k.column.every * 0.4;
    T.stomp ??= k.stomp.every * 0.7;
    T.mist ??= k.mist.every;
    // Frostbite Slam: the scythe sends a column of ice straight ahead.
    if ((T.column -= dt) <= 0) {
      T.column = k.column.every;
      const c = k.column;
      const dx = e.dx || 0;
      const dz = e.dz || 1;
      const w2 = (c.width / 2) ** 2;
      const inCol = (o) => {
        const along = (o.x - e.x) * dx + (o.z - e.z) * dz;
        if (along < -2 || along > c.length) return false;
        return (o.x - e.x - dx * along) ** 2 + (o.z - e.z - dz * along) ** 2 <= w2;
      };
      const n = this.hexTowers(e.x, e.z, c.length + c.width, 'stun', c.freeze, true, inCol);
      this.events.push({ k: 'eShot', e: e.id, kind: 'laser', fx: r2(e.x), fz: r2(e.z), x: r2(e.x + dx * c.length), z: r2(e.z + dz * c.length), d: 0, c: ICE, w: c.width });
      this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: `🧊 FROSTBITE SLAM! ${n} frozen`, color: '#84ffff' });
    }
    // Nausea Stomp: towers around it fire much slower.
    if ((T.stomp -= dt) <= 0) {
      T.stomp = k.stomp.every;
      const s = k.stomp;
      const n = this.slowTowers(e.x, e.z, s.radius, s.amt, s.time, true);
      this.events.push({ k: 'slam', e: e.id, x: r2(e.x), z: r2(e.z), r: s.radius, n: 0 });
      this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: `🤢 NAUSEA STOMP! ${n} towers slowed`, color: '#b2ebf2' });
    }
    // Antarctic Mist: freezes the towers around it, then hurts units in the mist for a few ticks.
    if ((T.mist -= dt) <= 0) {
      T.mist = k.mist.every;
      const m = k.mist;
      const n = this.freezeTowers(e.x, e.z, m.range, m.freeze);
      this.hurtUnitsNear(e.x, e.z, m.range, m.unitDmg);
      T.mistLeft = m.ticks - 1;
      T.mistTick = 1;
      T.mistX = e.x;
      T.mistZ = e.z;
      this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: `🌬️ ANTARCTIC MIST! ${n} frozen`, color: '#84ffff' });
    }
  }

  /** Blizzard Warrior: dashes a little faster for a moment, then stuns the hero towers around it. */
  warriorDash(e, d, T, dt) {
    if (T.dashing > 0) {
      e.speed *= d.speed / ENEMIES[e.type].speed;
      if ((T.dashing -= dt) <= 0) {
        const n = this.hexTowers(e.x, e.z, d.radius, 'stun', d.stun, true, (t) => HEROES.has(t.type));
        this.events.push({ k: 'slam', e: e.id, x: r2(e.x), z: r2(e.z), r: d.radius, n });
        if (n) this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: `💨 DASH! ${n} heroes stunned`, color: '#90caf9' });
      }
    } else if (((T.dash ??= d.every * 0.5), (T.dash -= dt)) <= 0) {
      T.dash = d.every;
      T.dashing = d.time;
    }
  }

  /** Sets the ground round (x, z) on fire: towers there lose `dps` health a second for `time` s. */
  burnPatch(x, z, r, dps, time) {
    this.puddles.push({ x, z, r, dps, left: time });
    this.events.push({ k: 'acid', x: r2(x), z: r2(z), r, life: time, c: 0xff6d00 });
  }

  /** SantaBot: Present Throw (a fire patch round a random tower) and Candy Cane Minigun (the closest tower). */
  santaBotFight(e, k, T, dt) {
    const inRange = (r) => [...this.towers.values()].filter((t) => !this.stealthy(t) && (t.x - e.x) ** 2 + (t.z - e.z) ** 2 <= r * r);
    const p = k.present;
    if (((T.present ??= p.every * 0.5), (T.present -= dt)) <= 0) {
      const list = inRange(p.range);
      T.present = list.length ? p.every : 1;
      if (list.length) {
        const t = list[Math.floor(Math.random() * list.length)];
        this.burnPatch(t.x, t.z, p.radius, p.dps, p.time);
        this.events.push({ k: 'chaos', x: r2(t.x), z: r2(t.z), text: '🎁 PRESENT THROW!', color: '#ff9100' });
      }
    }
    const m = k.minigun;
    if (((T.minigun ??= m.every * 0.3), (T.minigun -= dt)) <= 0) {
      const list = inRange(m.range);
      T.minigun = list.length ? m.every : 1;
      if (list.length) {
        const d2 = (t) => (t.x - e.x) ** 2 + (t.z - e.z) ** 2;
        const t = list.reduce((a, o) => (d2(o) < d2(a) ? o : a));
        this.burnPatch(t.x, t.z, m.radius, m.dps, m.time);
        this.events.push({ k: 'eShot', e: e.id, kind: 'laser', fx: r2(e.x), fz: r2(e.z), x: r2(t.x), z: r2(t.z), d: 0, c: 0xff1744 });
        this.events.push({ k: 'chaos', x: r2(t.x), z: r2(t.z), text: '🍬 CANDY CANE MINIGUN!', color: '#ff1744' });
      }
    }
  }

  /** Exo Santa: Burst of Carols and Northern Calls all fight; Festive Spray from phase 2, Jolly Present from phase 3. */
  exoSantaFight(e, k, T, dt) {
    const frac = e.hp / e.maxHp;
    const phase = frac <= k.present.at ? 3 : frac <= k.spray.at ? 2 : 1;
    if (phase > (T.phase ?? 1)) {
      T.phase = phase;
      this.events.push({ k: 'enrage', e: e.id });
      this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: phase === 2 ? '⚙️ DETERIORATION! Festive Spray!' : '💀 FALLEN FACADE! Jolly Presents!', color: '#ff5252' });
    }
    // Burst of Carols: shots at the most expensive tower (hidden or bait towers don't fool him).
    const c = k.carols;
    if (((T.carols ??= c.every * 0.5), (T.carols -= dt)) <= 0) {
      let best = null;
      for (const t of this.towers.values()) if (!best || (t.spent ?? 0) > (best.spent ?? 0)) best = t;
      T.carols = best ? c.every : 1;
      if (best) {
        const n = this.hexTowers(best.x, best.z, 1, 'stun', c.stun * c.shots, false, (t) => t === best);
        for (let i = 0; i < c.shots; i++) this.events.push({ k: 'eShot', e: e.id, kind: 'laser', fx: r2(e.x), fz: r2(e.z), x: r2(best.x), z: r2(best.z), d: 0, c: 0xffd740 });
        if (n) this.events.push({ k: 'chaos', x: r2(best.x), z: r2(best.z), text: '🎶 BURST OF CAROLS!', color: '#ffd740' });
      }
    }
    // Northern Calls: helpers (an Elf Guardian too in phase 3). They give no cash.
    const nc = k.calls;
    if (((T.calls ??= nc.every * 0.5), (T.calls -= dt)) <= 0) {
      T.calls = nc.every;
      const list = phase === 3 ? [...nc.list, ...nc.late] : nc.list;
      let j = 0;
      for (const [type, n] of list) for (let i = 0; i < n; i++, j++) this.reborn.push({ route: e.route, type, dist: Math.max(0, e.dist - 2 - j * 1.2), lateral: 0, hpScale: 1, owner: e.id, noCash: true, from: e.type });
      this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: '📯 NORTHERN CALLS!', color: '#80d8ff' });
    }
    // Festive Spray: a cone in front of him hurts units for a few seconds.
    const sp = k.spray;
    if (T.sprayLeft > 0 && (T.sprayTick -= dt) <= 0) {
      T.sprayLeft--;
      T.sprayTick = 1;
      const dx = e.dx || 0;
      const dz = e.dz || 1;
      const cos = Math.cos((sp.angle / 2) * Math.PI / 180);
      this.hurtUnitsNear(e.x, e.z, sp.range, sp.dps, (u) => {
        const ux = u.x - e.x;
        const uz = u.z - e.z;
        const len = Math.hypot(ux, uz) || 1;
        return (ux * dx + uz * dz) / len >= cos;
      });
      this.events.push({ k: 'eBlast', x: r2(e.x + dx * sp.range * 0.5), z: r2(e.z + dz * sp.range * 0.5), r: sp.range * 0.5, c: 0xe0f7fa });
    }
    if (phase >= 2 && ((T.spray ??= 3), (T.spray -= dt)) <= 0) {
      T.spray = sp.every;
      T.sprayLeft = sp.time;
      T.sprayTick = 0;
      this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: '❄️ FESTIVE SPRAY!', color: '#e0f7fa' });
    }
    // Jolly Present: a gift lands past the defense and bursts into Gift Boxes.
    const jp = k.present;
    if (phase === 3 && ((T.gift ??= 3), (T.gift -= dt)) <= 0) {
      T.gift = jp.every;
      for (let i = 0; i < jp.n; i++) this.reborn.push({ route: e.route, type: 'xcGiftBox', dist: e.dist + jp.ahead + i * 1.5, lateral: 0, hpScale: 1, owner: e.id, noCash: true, from: e.type });
      this.events.push({ k: 'chaos', x: r2(e.x), z: r2(e.z), text: '🎁 JOLLY PRESENT!', color: '#ff5252' });
    }
  }
}
