// Sandbox mode (src/sandbox.js): summoning waves from any mode, the Dummy, and the Dummy King's
// nukes. The base can't fall in Sandbox, except while the Dummy King is out (his first nuke drops
// it to 1 health; once he is gone it is full and safe again).
// These are methods of Sim: sim.js puts them on the Sim class, so "this" is the game.

import { ENEMIES, GAME, hpCurve, modeFor, waveGroups } from '../../config.js';
import { path } from '../path.js';
import { r2 } from './shared.js';

export class SimSandbox {

  /** Each tick: keep the base full while it is safe, and make it safe again once the Dummy King is gone. */
  sandboxTick(dt) {
    if (this.sbMortal && ![...this.enemies.values()].some((e) => ENEMIES[e.type].nuke) && !this.reborn.some((r) => ENEMIES[r.type]?.nuke)) {
      this.sbMortal = false;
      this.events.push({ k: 'sbToast', text: '👑 The Dummy King is gone. Your base is safe again.' });
    }
    if (!this.sbMortal) this.baseHp = this.maxBaseHp;
    this.wave.t += dt;
    while (this.queue.length && this.queue[0].t <= this.wave.t) this.spawnQueued(this.queue.shift());
    this.wave.left = this.queue.length;
  }

  /** The Sandbox bar's buttons. Returns an error message, or null. */
  sandboxAction(m) {
    if (!this.sandbox) return 'Only in Sandbox';
    if (m.a === 'sbSummon') return this.sbSummon(String(m.src), Math.floor(Number(m.wave)));
    if (m.a === 'sbDummy') {
      this.spawn('sbDummy');
      return null;
    }
    if (m.a === 'sbKing') {
      if ([...this.enemies.values()].some((e) => e.type === 'sbKing')) return 'The Dummy King is already here';
      const e = this.spawn('sbKing');
      if (e) this.dummyKingMoves(e, ENEMIES.sbKing, 0); // his nuke lands on the base right away
      return null;
    }
    if (m.a === 'sbClear') {
      for (const e of this.enemies.values()) this.events.push({ k: 'decay', e: e.id });
      this.enemies.clear();
      this.queue.length = 0;
      this.reborn.length = 0;
      return null;
    }
    return null;
  }

  /** Queues wave `index` of mode `src` ("easy", or "halloween:carnival"), with that mode's health. */
  sbSummon(src, index) {
    const [key, map] = src.split(':');
    const dm = modeFor(key, map);
    if (!dm || dm.sandbox || dm.endless || !dm.waves?.[index]) return 'No such wave';
    const w = this.wave;
    for (const [type, count, gap, delay, x] of waveGroups(index, dm.waves)) {
      const def = ENEMIES[type];
      if (!def) continue;
      const mods = x && typeof x === 'object' ? x : undefined;
      const raw = typeof x === 'number' ? x : def.hp * (dm.flatHp ? 1 : 1 + index * GAME.hpScalePerWave);
      const hp = def.fixedHp ? undefined : Math.max(1, Math.round(raw * hpCurve(dm, index, def.boss || mods?.boss)));
      for (let i = 0; i < count; i++) this.queue.push({ t: w.t + delay + i * gap, type, hp, mods });
    }
    this.queue.sort((a, b) => a.t - b.t);
    w.left = this.queue.length;
    this.events.push({ k: 'sbToast', text: `Summoned ${dm.name} wave ${index + 1}` });
    return null;
  }

  /** The Dummy King: a nuke at the base when he arrives, then one on a random spot every so often. */
  dummyKingMoves(e, def, dt) {
    const nk = def.nuke;
    if (!e.nuked) {
      e.nuked = true;
      e.nukeT = nk.every;
      this.sbMortal = true;
      this.baseHp = Math.min(this.baseHp, 1);
      const end = path.at(path.length, {});
      this.events.push({ k: 'sbNuke', e: e.id, x: r2(end.x), z: r2(end.z), r: 12, base: 1 });
    }
    if (e.nukeAt) {
      const n = e.nukeAt;
      if ((n.left -= dt) > 0) return;
      e.nukeAt = null;
      // Everything inside is knocked out at once.
      for (const t of this.towers.values()) {
        if (t.hp > 0 && t.owner !== 'citadel' && (t.x - n.x) ** 2 + (t.z - n.z) ** 2 <= nk.radius ** 2) this.knockOut(t);
      }
      this.hurtUnitsNear(n.x, n.z, nk.radius, 1e9);
      this.events.push({ k: 'sbNuke', e: e.id, x: r2(n.x), z: r2(n.z), r: nk.radius });
      return;
    }
    if ((e.nukeT -= dt) > 0) return;
    e.nukeT = nk.every;
    // A random spot: a random standing tower's (so it lands on something), else a random bit of path.
    const up = [...this.towers.values()].filter((t) => t.hp > 0 && t.owner !== 'citadel');
    const at = up.length ? up[Math.floor(Math.random() * up.length)] : path.at(Math.random() * path.length, {});
    e.nukeAt = { x: at.x + (Math.random() - 0.5) * 8, z: at.z + (Math.random() - 0.5) * 8, left: nk.warn };
    this.events.push({ k: 'sbNukeWarn', e: e.id, x: r2(e.nukeAt.x), z: r2(e.nukeAt.z), r: nk.radius, d: nk.warn });
  }
}
