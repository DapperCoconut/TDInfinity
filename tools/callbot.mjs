// Plays Mysterious Call (src/call/) headless with a simple bot: faces the nearest ghost, fires,
// uses the right-click ability when ready, walks in circles around the hall.
// node tools/callbot.mjs [class|all] [games]
import { CallSim, EYE } from '../src/call/sim.js';
import { CLASS_KEYS } from '../src/call/data.js';

/** One game with the bot. `god`: you can't die (tools/check.mjs). */
export function playCall(cls, maxT = 900, god = false) {
  const s = new CallSim(cls);
  const dt = 1 / 30;
  let t = 0;
  while (!s.over && t < maxT) {
    t += dt;
    const p = s.p;
    let best = null, bd = Infinity;
    for (const g of s.ghosts.values()) {
      const d = Math.hypot(g.x - p.x, g.z - p.z);
      if (d < bd) (bd = d), (best = g);
    }
    const inp = { fwd: 0, side: Math.sin(t * 0.7), fire: false, alt: false };
    if (best) {
      inp.yaw = Math.atan2(-(best.x - p.x), -(best.z - p.z));
      inp.pitch = Math.atan2(best.y - EYE, bd);
      inp.fire = true;
      inp.alt = true;
      // Walk away from the ghosts (weighted by how close) and back toward the middle of the hall.
      let mx = -p.x * 0.03, mz = -p.z * 0.05;
      for (const g of s.ghosts.values()) {
        const d = Math.hypot(g.x - p.x, g.z - p.z) || 1;
        if (d < 12) (mx -= ((g.x - p.x) / d) * (12 - d) / 12), (mz -= ((g.z - p.z) / d) * (12 - d) / 12);
      }
      if (bd > 8) (mx += (best.x - p.x) / bd), (mz += (best.z - p.z) / bd); // far away (maybe behind a wall): go get it
      mx += Math.cos(t * 0.5) * 0.4;
      mz += Math.sin(t * 0.5) * 0.4;
      const y = inp.yaw;
      inp.fwd = -Math.sin(y) * mx - Math.cos(y) * mz;
      inp.side = Math.cos(y) * mx - Math.sin(y) * mz;
    }
    if (god) s.p.hp = 1e9;
    s.step(dt, inp);
    s.events.length = 0;
  }
  return { won: s.over === 1, wave: s.wave.n, hp: Math.round(s.p.hp), t: Math.round(t) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const which = process.argv[2] && process.argv[2] !== 'all' ? [process.argv[2]] : CLASS_KEYS;
  const n = +(process.argv[3] ?? 3);
  for (const c of which) {
    const r = Array.from({ length: n }, () => playCall(c));
    console.log(c.padEnd(12), r.map((x) => `${x.won ? 'WIN' : 'lost'} w${x.wave} hp${x.hp} ${x.t}s`).join(' | '));
  }
}
