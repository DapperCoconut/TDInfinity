// node tools/balance/bench.mjs [tower ...]: measured damage per second of every level of each tower.
import { BASE_TOWERS, TOWERS } from '../../src/config.js';
import { benchTower } from './lab.mjs';

const list = process.argv.slice(2).length ? process.argv.slice(2) : BASE_TOWERS;
for (const type of list) {
  let r = null;
  try {
    r = benchTower(type);
  } catch (err) {
    console.log(type.padEnd(16), 'error:', err.message);
    continue;
  }
  if (!r) {
    console.log(type.padEnd(16), `(not placeable on the lab map: ${TOWERS[type].placement ?? 'ground'})`);
    continue;
  }
  console.log(type.padEnd(16), r.map((l) => `L${l.level} $${l.cost} ${l.dps.toFixed(1)}dps (${((l.dps / l.cost) * 1000).toFixed(1)}/k)`).join(' | '));
}
