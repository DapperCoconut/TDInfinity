// node tools/balance/play.mjs <mode> [key=value ...]: one bot game, wave by wave.
//   loadout=a,b,c   farms=N   map=meadow   dmgCash=0.5 (0 = the old kill rewards)   v=1 (per-wave table)
import { LOADOUTS } from './loadouts.mjs';
import { play, withMode } from './lab.mjs';

const [mode = 'easy', ...rest] = process.argv.slice(2);
const a = Object.fromEntries(rest.map((s) => s.split('=')));
const patch = {};
for (const k of ['dmgCash', 'cash', 'startCash']) if (a[k] != null) patch[k] = Number(a[k]);
const loadout = a.loadout ? (LOADOUTS[a.loadout] ?? a.loadout.split(',')) : LOADOUTS.mid;
const t0 = Date.now();
const r = withMode(mode, patch, () => play(mode, { loadout, farms: Number(a.farms ?? 0), map: a.map }));
if (a.v) for (const w of r.waves) console.log(`wave ${String(w.wave).padStart(2)} t=${String(w.t).padStart(5)} cash ${String(w.cash).padStart(8)} built ${String(w.spent).padStart(8)} earned ${String(w.earned).padStart(9)} base ${String(w.base).padStart(4)} towers ${w.towers}`);
console.log(`${mode}: ${r.win ? 'WIN' : `lost on wave ${r.wave}/${r.of}`}  base ${r.base}  earned $${r.earned}  ${r.time}s game, ${Date.now() - t0}ms`);
