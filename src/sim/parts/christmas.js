// What Christmas Night 1's enemies do (src/christmas.js): Unstable Ice's Flash Freeze, the Frost
// Hero's Frost Hand, and the Frost Spirit's whole fight. (The Hero's Tundra Slam is the plain `slam`,
// the Necromancer's Snow Minions the plain `summon`, the Ravager's shield `osh` + `shieldArmor`.)
// A frozen tower is a stunned one (it can't fire), shown with ice.
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { ENEMIES } from '../../config.js';
import { r2 } from './shared.js';

/** Enemies that use christmasMoves (sim.js checks this set every tick). */
export const XM_FX = new Set(Object.keys(ENEMIES).filter((k) => ENEMIES[k].frostHand || ENEMIES[k].frostSpirit));

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
    if (e.stop) return; // stunned or frozen: no attacks
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
}
