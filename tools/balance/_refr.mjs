import { benchTower } from './lab.mjs';
for (const ty of ['refractor', 'refractorBottom']) {
  console.time(ty);
  try { console.log(ty, JSON.stringify(benchTower(ty, 10))); } catch (e) { console.log('ERR', e.stack); }
  console.timeEnd(ty);
}
