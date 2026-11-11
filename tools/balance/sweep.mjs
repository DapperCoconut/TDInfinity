// node tools/balance/sweep.mjs [modes=a,b] [loadouts=mid,strong] [rates=0,0.2,0.5] [farms=0,8]
// One line per setting (three seeded bot games each): how far each loadout gets in each mode at each cash-for-damage rate
// ("x" = the rate the mode has in config, 0 = the old kill rewards).
import { DIFFICULTIES } from '../../src/config.js';
import { LOADOUTS } from './loadouts.mjs';
import { play, withMode } from './lab.mjs';

const a = Object.fromEntries(process.argv.slice(2).map((s) => s.split('=')));
const list = (k, d) => (a[k] ?? d).split(',');
const modes = list('modes', Object.keys(DIFFICULTIES).join(','));
for (const mode of modes) {
  for (const lo of list('loadouts', 'mid,strong')) {
    for (const farms of list('farms', '0')) {
      for (const rate of list('rates', 'x')) {
        const patch = rate === 'x' ? {} : { dmgCash: Number(rate) };
        for (const k of ['cash', 'startCash']) if (a[k] != null) patch[k] = Number(a[k]);
        const games = [];
        for (let seed = 1; seed <= Number(a.seeds ?? 3); seed++) games.push(withMode(mode, patch, () => play(mode, { seed, loadout: LOADOUTS[lo], farms: Number(farms), map: a.map })));
        const res = games.map((r) => (r.win ? 'WIN' : `${r.wave}`)).join(' ');
        const avg = (f) => Math.round(games.reduce((s, r) => s + f(r), 0) / games.length);
        console.log(`${mode.padEnd(10)} ${lo.padEnd(8)} farms ${farms} rate ${String(rate).padEnd(5)} of ${games[0].of}: ${res.padEnd(12)} earned ${String(avg((r) => r.earned)).padStart(9)}  built ${String(avg((r) => r.waves.at(-1).spent)).padStart(9)}  unspent ${String(avg((r) => r.waves.at(-1).cash)).padStart(8)}  maxed on ${games.map((r) => r.maxedAt ?? '-').join(' ')}`);
      }
    }
  }
}
