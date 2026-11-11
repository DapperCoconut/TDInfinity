// node tools/balance/bots.mjs <mode> [key=value ...]: bots play one co-op game, no browser.
//   bots=3 (how many)  map=meadow  seed=1  v=1 (per-wave table)  roles=farmer,dps (instead of the usual ones)
//   speed=1 (how many sim seconds per 0.05 s step: 1 = real pace, higher plays faster but coarser)
// Prints each bot's loadout, what it built, and how the game went. Used to tune the bot brain.
import { Sim } from '../../src/sim/sim.js';
import { TOWERS } from '../../src/config.js';
import { Bot } from '../../src/bot/bot.js';
import { botRoles, BOT_NAMES } from '../../src/bot/loadouts.js';

const [mode = 'easy', ...rest] = process.argv.slice(2);
const a = Object.fromEntries(rest.map((s) => s.split('=')));
const n = Number(a.bots ?? 3);
const seed = Number(a.seed ?? 1);
const roles = a.roles ? a.roles.split(',') : botRoles(n, mode);
const players = roles.map((_, i) => ({ id: `bot${i + 1}`, name: `🤖 ${BOT_NAMES[i]}`, loadout: null }));
const sim = new Sim(players, { mode, map: a.map });
const chat = [];
const bots = roles.map((role, i) => new Bot(sim, players[i].id, { role, mode, seed: seed * 100 + i, loose: n >= 3 && i > 0, say: (text) => chat.push(`${Math.round(simT)}s ${players[i].name}: ${text}`) }));
for (const b of bots) console.log(`${players[b.id === undefined ? 0 : bots.indexOf(b)].name} (${b.role}): ${b.loadout.map((k) => `${TOWERS[k].name} $${TOWERS[k].cost}`).join(', ')}`);

let simT = 0;
let lastWave = -1;
const t0 = Date.now();
const dt = 0.05;
while (!sim.over && simT < 3 * 3600) {
  sim.step(dt);
  simT += dt;
  for (const b of bots) b.tick(dt, sim.events);
  if (a.v) {
    for (const ev of sim.events) {
      if (ev.k === 'waveStart' && ev.i !== lastWave) {
        lastWave = ev.i;
        const cash = bots.map((b) => `$${Math.round(b.cash)}`).join(' ');
        console.log(`wave ${String(ev.i + 1).padStart(2)} t=${String(Math.round(simT)).padStart(5)} base ${String(Math.round(sim.baseHp)).padStart(4)} towers ${sim.towers.size}  cash ${cash}`);
      }
    }
  }
  sim.events.length = 0;
}
const built = {};
for (const t of sim.towers.values()) built[`${t.owner}:${TOWERS[t.type].name} L${t.level + 1}`] = (built[`${t.owner}:${TOWERS[t.type].name} L${t.level + 1}`] ?? 0) + 1;
console.log('built:', Object.entries(built).map(([k, v]) => (v > 1 ? `${k} x${v}` : k)).join(', '));
if (chat.length) console.log('chat:', chat.slice(0, 12).join(' | '));
console.log(`${mode} x${n} bots: ${sim.over === 1 ? 'WIN' : `lost on wave ${sim.wave.index + 1}/${sim.waves.length}`}  base ${Math.round(sim.baseHp)}  ${Math.round(simT)}s game, ${Date.now() - t0}ms`);
