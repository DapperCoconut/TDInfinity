// node tools/balance/curve.mjs [mode,mode...] [teams=1,2,3] [seeds=3] [maps=meadow,canyon] [wave=1] [set={mode:{json}}] [best=1]
// best=1: every bot brings the strongest loadout for its role (a skilled player), not a random one.
// The difficulty curve of each mode: the real bots play many games (team sizes x seeds x maps,
// spread over all CPU cores) and it prints how often each team size wins, where games are lost,
// and, wave by wave, how much base health leaks and how far ahead of the wave the defense was
// ("ready": the bots' own measure, team damage per second over what the next waves need; big
// numbers early = the start is too easy). wave=1 prints the per-wave table, not just the summary.
import { fork } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';

const me = fileURLToPath(import.meta.url);

if (process.argv[2] === '--one') {
  // Worker: play one game and send back its curve.
  const [mode, n, seed, map, patch, best] = process.argv.slice(3);
  const { DIFFICULTIES } = await import('../../src/config.js');
  Object.assign(DIFFICULTIES[mode], JSON.parse(patch)[mode] ?? {}); // set={mode: {...}}: try settings without editing config.js
  const { Sim } = await import('../../src/sim/sim.js');
  const { Bot } = await import('../../src/bot/bot.js');
  const { botRoles } = await import('../../src/bot/loadouts.js');
  const { threats } = await import('../../src/bot/value.js');
  const roles = botRoles(Number(n), mode);
  const players = roles.map((_, i) => ({ id: `bot${i + 1}`, name: `b${i}`, loadout: null }));
  const sim = new Sim(players, { mode, map });
  const bots = roles.map((role, i) => new Bot(sim, players[i].id, { role, mode, seed: Number(seed) * 100 + i, loose: n >= 3 && i > 0, best: best === '1', say: () => {} }));
  const waves = [];
  const gone = new Map(); // enemy id -> type, for enemies removed this tick (a leak names only the id)
  const del = sim.enemies.delete.bind(sim.enemies);
  sim.enemies.delete = (id) => { const e = sim.enemies.get(id); if (e) gone.set(id, e.type); return del(id); };
  let t = 0;
  let cur = null;
  while (!sim.over && t < 3 * 3600) {
    sim.step(0.05);
    t += 0.05;
    for (const b of bots) b.tick(0.05, sim.events);
    for (const ev of sim.events) {
      if (ev.k === 'waveStart' && (!cur || ev.i !== cur.i)) {
        if (cur) cur.lost = cur.hp - sim.baseHp;
        const ready = bots[0].readiness(threats(sim, ev.i), bots[0].teamTowers);
        const cash = bots.reduce((s, b) => s + b.cash, 0);
        cur = { i: ev.i, hp: sim.baseHp, ready, cash, t, by: {} };
        waves.push(cur);
      }
      if ((ev.k === 'leak' || ev.k === 'rewind') && cur) {
        const type = gone.get(ev.e) ?? sim.enemies.get(ev.e)?.type ?? '?';
        cur.by[type] = (cur.by[type] ?? 0) + ev.d;
      }
    }
    sim.events.length = 0;
    gone.clear();
  }
  if (cur) cur.lost = cur.hp - sim.baseHp;
  process.send({ mode, n: Number(n), seed: Number(seed), map, win: sim.over === 1, wave: sim.wave.index + 1, of: sim.waves.length, max: sim.maxBaseHp, waves });
  process.exit(0);
}

const { DIFFICULTIES } = await import('../../src/config.js');
const args = process.argv.slice(2);
const a = Object.fromEntries(args.filter((s) => s.includes('=')).map((s) => s.split('=')));
const modes = (args.find((s) => !s.includes('=')) ?? Object.keys(DIFFICULTIES).join(',')).split(',');
const teams = (a.teams ?? '1,2,3').split(',').map(Number);
const seeds = Number(a.seeds ?? 3);
const maps = (a.maps ?? 'meadow,canyon').split(',');
const patch = a.set ?? '{}'; // e.g. set='{"insane":{"hpCurve":[[1,1],[10,2]],"dmgCash":0.3}}'
const jobs = [];
for (const mode of modes) for (const n of teams) for (let s = 1; s <= seeds; s++) for (const map of DIFFICULTIES[mode].map ? [DIFFICULTIES[mode].map] : maps) jobs.push([mode, n, s, map]);

const results = [];
await new Promise((done) => {
  let next = 0;
  let running = 0;
  const start = () => {
    while (running < availableParallelism() && next < jobs.length) {
      const job = jobs[next++];
      running++;
      const c = fork(me, ['--one', ...job.map(String), patch, a.best ?? '0'], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
      c.on('message', (m) => results.push(m));
      c.on('exit', () => {
        running--;
        if (next >= jobs.length && running === 0) done();
        else start();
      });
    }
  };
  start();
});

const pct = (v) => `${Math.round(v * 100)}%`.padStart(4);
for (const mode of modes) {
  const rs = results.filter((r) => r.mode === mode);
  if (!rs.length) continue;
  const of = rs[0].of;
  const line = teams.map((n) => {
    const t = rs.filter((r) => r.n === n);
    const wins = t.filter((r) => r.win).length;
    const lost = t.filter((r) => !r.win).map((r) => r.wave).sort((x, y) => x - y);
    return `${n}p ${wins}/${t.length} won${lost.length ? ` (lost on ${lost.join(',')})` : ''}`;
  }).join('  ');
  console.log(`${mode.padEnd(9)} ${of} waves  ${line}`);
  if (!a.wave) continue;
  console.log(' wave  reached  leak(avg % of base)  ready(median)  by team size');
  for (let i = 0; i < of; i++) {
    const cells = teams.map((n) => {
      const ws = rs.filter((r) => r.n === n).map((r) => r.waves.find((w) => w.i === i)).filter(Boolean);
      if (!ws.length) return '      -          ';
      const leak = ws.reduce((s, w) => s + w.lost, 0) / ws.length / rs[0].max;
      const ready = ws.map((w) => w.ready).sort((x, y) => x - y)[Math.floor(ws.length / 2)];
      return `${String(ws.length).padStart(2)} ${pct(leak)} ${ready.toFixed(1).padStart(6)}`;
    });
    const by = {};
    for (const r of rs) for (const [k, v] of Object.entries(r.waves.find((w) => w.i === i)?.by ?? {})) by[k] = (by[k] ?? 0) + v;
    const top = Object.entries(by).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, v]) => `${k} ${Math.round(v)}`).join(', ');
    console.log(` ${String(i + 1).padStart(3)}   ${cells.join('  |  ')}   ${top}`);
  }
}
