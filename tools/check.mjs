// npm run check: one quick "did I break anything?" pass. No browser needed.
//   node tools/check.mjs                 every section
//   node tools/check.mjs towers modes    only those sections (build, data, models, towers, modes)
//   node tools/check.mjs towers scout    only the towers / enemies / modes whose key contains "scout"
// Sections:
//   build   bundles the game, the dev tools and the server: syntax errors, bad imports, missing exports
//   data    config.js sanity: waves name real enemies, modes name real bosses / unlocks / maps, no NaN
//   models  builds every tower model at every level, every enemy and every summoned unit
//   towers  places every tower in the real Sim, walks both upgrade paths, fires every ability
//   modes   plays every mode start to finish with an unkillable base and a handful of maxed towers
//   bots    three bots play the first minutes of every mode (and Versus) through the room hub, with a
//           player ordering them around from the wheel: they must build, walk, answer and not crash
// Exit code 1 when anything failed; each failure is one line that names the tower / enemy / mode.
import { build } from 'esbuild';
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import { fakeCanvas, where } from './check-worker.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SECTIONS = ['build', 'data', 'towers', 'modes', 'bots', 'models'];
const args = process.argv.slice(2);
const want = args.filter((a) => SECTIONS.includes(a));
const filter = args.filter((a) => !SECTIONS.includes(a));
const runs = (s) => !want.length || want.includes(s);
const picked = (key) => !filter.length || filter.some((f) => key.toLowerCase().includes(f.toLowerCase()));

const fails = [];
const warns = [];
const fail = (section, what, err) => fails.push(`[${section}] ${what}${err ? `: ${typeof err === 'string' ? err : where(err)}` : ''}`);
async function section(name, fn) {
  if (!runs(name)) return;
  const t0 = Date.now();
  const before = fails.length;
  let note = '';
  try {
    note = (await fn()) ?? '';
  } catch (err) {
    fail(name, 'the check itself crashed', err);
  }
  const bad = fails.length - before;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${name.padEnd(7)} ${String(Date.now() - t0).padStart(6)}ms  ${bad ? `${bad} problem${bad > 1 ? 's' : ''}` : note}`);
}

/** Every NaN inside `o` (a config table), as "path.to.key" strings. (Infinity is fine: no limit, endless range.) */
function badNumbers(o, at, out = [], seen = new Set()) {
  if (typeof o === 'number') {
    if (Number.isNaN(o)) out.push(at);
  } else if (o && typeof o === 'object' && !seen.has(o)) {
    seen.add(o);
    for (const [k, v] of Object.entries(o)) badNumbers(v, `${at}.${k}`, out, seen);
  }
  return out;
}

// ---------------------------------------------------------------- build

await section('build', async () => {
  const entries = [
    ['src/main.js', 'browser'],
    ['tools/viewer.js', 'browser'],
    ['tools/music.js', 'browser'],
    ['server/index.js', 'node'],
  ];
  let files = 0;
  for (const [entry, platform] of entries) {
    const r = await build({
      entryPoints: [ROOT + entry],
      bundle: true,
      write: false,
      format: 'esm',
      platform,
      packages: platform === 'node' ? 'external' : undefined,
      loader: { '.css': 'empty' },
      logLevel: 'silent',
      metafile: true,
    }).catch((e) => e);
    for (const e of r.errors ?? []) fail('build', `${e.location ? `${e.location.file}:${e.location.line}` : entry}`, e.text);
    // esbuild only warns about an import that names nothing the other file exports; in the browser that is a crash.
    for (const w of r.warnings ?? []) if (w.id === 'import-is-undefined') fail('build', `${w.location?.file}:${w.location?.line}`, w.text);
    files += Object.keys(r.metafile?.inputs ?? {}).filter((f) => !f.includes('node_modules')).length;
  }
  return `${entries.length} entry points, ${files} files bundle`;
});

// The game's own modules load in Node (three.js builds models without a renderer).
const cfg = await import('../src/config.js').catch((err) => (fail('load', 'src/config.js', err), null));
const { TOWERS, ENEMIES, DIFFICULTIES } = cfg ?? {};

// Tower models: thousands of them (every level of every tower), and building one is slow, so they
// are shared out over worker threads that run while the sections below do their work. The models
// section at the end collects what they found.
const modelsT0 = Date.now();
const modelKeys = cfg && runs('models') ? Object.keys(TOWERS).filter(picked) : [];
const modelThreads = Math.min(Number(process.env.CHECK_THREADS) || 8, Math.max(1, availableParallelism() - 1), Math.ceil(modelKeys.length / 20));
const modelJobs = Array.from({ length: modelThreads }, (_, i) => {
  const share = modelKeys.filter((_, j) => j % modelThreads === i);
  return new Promise((resolve) => {
    // A roomy young heap: model building makes a lot of short-lived garbage, and with the default the workers mostly collect it.
    const w = new Worker(new URL('./check-worker.mjs', import.meta.url), { workerData: { keys: share }, resourceLimits: { maxYoungGenerationSizeMb: 256, maxOldGenerationSizeMb: 2048 } });
    w.once('message', resolve);
    w.once('error', (err) => resolve({ n: 0, fails: [['a model worker crashed', where(err)]] }));
  });
});

// ---------------------------------------------------------------- data

await section('data', async () => {
  if (!cfg) return 'skipped';
  const { MAPS } = await import('../src/sim/maps.js');
  for (const at of badNumbers(TOWERS, 'TOWERS')) fail('data', `${at} is not a number`);
  for (const at of badNumbers(ENEMIES, 'ENEMIES')) fail('data', `${at} is not a number`);
  for (const at of badNumbers(cfg.GAME, 'GAME')) fail('data', `${at} is not a number`);
  for (const [key, def] of Object.entries(TOWERS)) {
    if (!Array.isArray(def.levels) || !def.levels.length) fail('data', `TOWERS.${key} has no levels`);
    if (!def.name) fail('data', `TOWERS.${key} has no name`);
  }
  for (const key of [...cfg.BASE_TOWERS, ...cfg.EVENT_TOWERS, ...cfg.STARTER_TOWERS]) if (!TOWERS[key]) fail('data', `tower list names "${key}", which is not in TOWERS`);
  for (const [key, def] of Object.entries(ENEMIES)) {
    if (!(def.hp > 0)) fail('data', `ENEMIES.${key}.hp is ${def.hp}`);
    if (!(def.speed >= 0)) fail('data', `ENEMIES.${key}.speed is ${def.speed}`);
  }
  let waves = 0;
  // (An event map with its own waves, `mapModes`, is checked as a mode of its own: "halloween:carnival".)
  const modeList = Object.entries(DIFFICULTIES).flatMap(([k, d]) => [[k, d], ...Object.entries(d.mapModes ?? {}).map(([m, v]) => {
    if (!MAPS[m]) fail('data', `mode ${k}: mapModes names map "${m}", which is not in MAPS`);
    return [`${k}:${m}`, { ...d, ...v }];
  })]);
  for (const [mode, d] of modeList) {
    if (d.endless) continue; // the Liminal mode makes its waves up as it goes (checked in modes)
    if (!Array.isArray(d.waves) || !d.waves.length) {
      fail('data', `mode ${mode} has no waves`);
      continue;
    }
    if (d.boss && !ENEMIES[d.boss]) fail('data', `mode ${mode}: boss "${d.boss}" is not in ENEMIES`);
    if (d.unlock && !TOWERS[d.unlock]) fail('data', `mode ${mode}: unlock "${d.unlock}" is not in TOWERS`);
    if (d.perk && !cfg.PERKS[d.perk]) fail('data', `mode ${mode}: perk "${d.perk}" is not in PERKS`);
    if (d.map && !MAPS[d.map]) fail('data', `mode ${mode}: map "${d.map}" is not in MAPS`);
    if (d.timers && d.timers.length !== d.waves.length) fail('data', `mode ${mode}: ${d.timers.length} timers for ${d.waves.length} waves`);
    for (const k of d.needs ?? []) if (!DIFFICULTIES[k]) fail('data', `mode ${mode}: needs "${k}", which is not a mode`);
    d.waves.forEach((w, i) => {
      waves++;
      for (const g of w.groups ?? []) {
        if (!ENEMIES[g[0]]) fail('data', `mode ${mode} wave ${i + 1}: enemy "${g[0]}" is not in ENEMIES`);
        if (!(g[1] > 0)) fail('data', `mode ${mode} wave ${i + 1}: ${g[0]} count is ${g[1]}`);
      }
    });
  }
  return `${Object.keys(TOWERS).length} towers, ${Object.keys(ENEMIES).length} enemies, ${waves} waves in ${Object.keys(DIFFICULTIES).length} modes`;
});

// ---------------------------------------------------------------- sim helpers

const simMods = cfg && (runs('towers') || runs('modes')) ? await Promise.all([import('../src/sim/sim.js'), import('../src/sim/path.js'), import('./balance/lab.mjs')]).catch((err) => (fail('load', 'the sim', err), null)) : null;
const [{ Sim } = {}, { path } = {}, lab = {}] = simMods ?? [];

/** What is wrong with the sim's numbers right now (null: nothing). */
function sick(sim) {
  if (!Number.isFinite(sim.baseHp)) return `base health is ${sim.baseHp}`;
  for (const p of sim.players.values()) if (!Number.isFinite(p.cash)) return `cash is ${p.cash}`;
  for (const e of sim.enemies.values()) {
    if (!Number.isFinite(e.hp)) return `enemy ${e.type} health is ${e.hp}`;
    if (!Number.isFinite(e.dist)) return `enemy ${e.type} distance is ${e.dist}`;
    if (!Number.isFinite(e.x) || !Number.isFinite(e.z)) return `enemy ${e.type} is at ${e.x}, ${e.z}`;
  }
  for (const t of sim.towers.values()) {
    if (!Number.isFinite(t.x) || !Number.isFinite(t.z)) return `tower ${t.type} is at ${t.x}, ${t.z}`;
    if (t.hp != null && !Number.isFinite(t.hp)) return `tower ${t.type} health is ${t.hp}`;
    if (!Number.isFinite(t.damageDealt ?? 0)) return `tower ${t.type} damage dealt is ${t.damageDealt}`;
  }
  return null;
}
/** The path distance where route 0 comes closest to `spot`. */
function nearest(spot) {
  let best = Infinity;
  let dist = 0;
  for (let d = 0; d <= path.length; d += 1) {
    const p = path.at(d, { d }, 0);
    const far = (p.x - spot.x) ** 2 + (p.z - spot.z) ** 2;
    if (far < best) [best, dist] = [far, d];
  }
  return dist;
}

// ---------------------------------------------------------------- towers

await section('towers', () => {
  if (!simMods) return 'skipped';
  const spotMemo = new Map();
  let placed = 0;
  let levels = 0;
  let shooters = 0; // towers that hurt the test zombies (the rest support, farm, or need another kind of target)
  const skipped = [];
  // One tower, one upgrade path: place it, then at each level shoot at a stream of tough zombies
  // for a second and fire every ability, all the way to the top.
  const walk = (type, first) => {
    const def = TOWERS[type];
    const sim = new Sim([{ id: 'c', name: 'check' }], { mode: 'easy', map: 'meadow' });
    const me = sim.players.get('c');
    me.cash = 1e12;
    sim.wave.countdown = 1e9; // no waves: the check sends its own zombies
    const range = def.levels[0].range ?? 12;
    const key = `${def.placement ?? 'ground'}:${range}`;
    if (!spotMemo.has(key)) {
      const spot = lab.spots(sim, def.placement, range, 3)[0] ?? null;
      if (spot) spot.dist = nearest(spot);
      spotMemo.set(key, spot);
    }
    const spot = spotMemo.get(key);
    const why = spot ? sim.action('c', { a: 'place', type, x: spot.x, z: spot.z }) : 'no spot on the map';
    if (why !== null) return why;
    const t = [...sim.towers.values()][0];
    const from = Math.max(0, spot.dist - range * 0.7);
    const aim = path.at(spot.dist, { d: spot.dist }, 0);
    let stage = 'placing';
    try {
      for (;;) {
        stage = `${t.type} level ${t.level}`;
        levels++;
        sim.spawn('normal', { hp: 1e9, dist: from, route: 0 });
        for (let s = 0; s < 1; s += 0.05) {
          if (Math.abs(s - 0.25) < 0.02) for (const ab of TOWERS[t.type].levels[t.level].abilities ?? []) sim.action('c', { a: 'ability', id: t.id, key: ab.key, x: aim.x, z: aim.z });
          sim.baseHp = 1e9;
          me.cash = 1e12;
          sim.step(0.05);
          sim.events.length = 0;
        }
        const bad = sick(sim);
        if (bad) throw new Error(bad);
        if (!sim.towers.has(t.id)) break; // some towers use themselves up
        const a = sim.action('c', { a: 'upgrade', id: t.id, path: first });
        if (a !== null && sim.action('c', { a: 'upgrade', id: t.id, path: first === 'top' ? 'bottom' : 'top' }) !== null) break;
      }
      JSON.stringify(sim.snapshot()); // what goes over the network must still serialize
      if (first === 'top' && t.damageDealt > 0) shooters++;
    } catch (err) {
      fail('towers', `${type} (${first} path) at ${stage}`, err);
    }
    return null;
  };
  for (const type of Object.keys(TOWERS)) {
    if (!picked(type)) continue;
    let why = null;
    try {
      why = walk(type, 'top');
      if (why === null) {
        placed++;
        walk(type, 'bottom');
      } else skipped.push(type);
    } catch (err) {
      fail('towers', `${type} could not be set up`, err);
    }
  }
  if (!placed && skipped.length) fail('towers', `none of ${skipped.length} towers could be placed`);
  return `${placed} towers placed (${shooters} dealt damage), ${levels} levels run${skipped.length ? `, ${skipped.length} not placeable on the test map` : ''}`;
});

// ---------------------------------------------------------------- modes

await section('modes', async () => {
  if (!simMods) return 'skipped';
  const out = [];
  const LOADOUT = ['operator', 'plasma', 'sentry', 'turret', 'marksman'];
  // (An event map with its own waves is played too, as "halloween:carnival".)
  const plays = Object.entries(DIFFICULTIES).flatMap(([k, d]) => [[k, 'meadow', k], ...Object.keys(d.mapModes ?? {}).map((m) => [k, m, `${k}:${m}`])]);
  for (const [mode, map, label] of plays) {
    if (!picked(mode) && !picked(label)) continue;
    let sim = null;
    try {
      sim = new Sim([{ id: 'c', name: 'check' }], { mode, map });
      const me = sim.players.get('c');
      me.cash = 1e12;
      // A handful of maxed towers, so zombies die (rewards, on-death tricks) and fight back at something.
      for (const type of LOADOUT) {
        const def = TOWERS[type];
        if (!def) continue;
        const spots = lab.spots(sim, def.placement, def.levels[0].range ?? 12, 3);
        for (let i = 0, n = 0; i < spots.length && n < 2; i++) {
          if (sim.action('c', { a: 'place', type, x: spots[i].x, z: spots[i].z }) !== null) continue;
          n++;
          const t = [...sim.towers.values()].at(-1);
          while (lab.upgrade(sim, 'c', t));
        }
      }
      const kinds = new Set();
      const t0 = Date.now();
      const last = DIFFICULTIES[mode].endless ? 54 : sim.waves.length - 1; // the endless Liminal mode: 55 waves (two room shifts)
      let simT = 0;
      let next = 0;
      let allOut = null; // game time when the last wave finished spawning
      // An unkillable base means a boss the test towers can't kill would walk forever, so the game
      // is played until two minutes after the last zombie of the last wave is out (or it ends).
      while (!sim.over && simT < 3 * 3600 && (allOut == null || simT < allOut + 120)) {
        sim.baseHp = 1e9; // every wave gets played, whatever leaks
        me.cash = 1e12;
        sim.step(0.05);
        simT += 0.05;
        sim.events.length = 0;
        if (simT >= next) {
          next = simT + 1;
          for (const e of sim.enemies.values()) kinds.add(e.type);
          if (allOut == null && sim.wave.index === last && sim.wave.state === 'wave' && !sim.queue.length) allOut = simT;
          sim.action('c', { a: 'skip' }); // hurry the next wave along whenever the game allows it
          const bad = sick(sim);
          if (bad) throw new Error(bad);
        }
      }
      JSON.stringify(sim.snapshot());
      if (!sim.over && allOut == null) fail('modes', `${label} is stuck on wave ${sim.wave.index + 1}/${sim.waves.length} after ${Math.round(simT / 60)} game minutes with ${sim.enemies.size} enemies left`);
      out.push(`${label} ${sim.waves.length}w ${kinds.size}e ${Date.now() - t0}ms`);
    } catch (err) {
      fail('modes', `${label} wave ${sim ? sim.wave.index + 1 : '?'}`, err);
    }
  }
  // Mysterious Call (call/): every class plays the haunted mansion to the end, and can't die.
  if (picked('call')) {
    const { CLASS_KEYS } = await import('../src/call/data.js');
    const { playCall } = await import('./callbot.mjs');
    for (const cls of CLASS_KEYS) {
      try {
        const r = playCall(cls, 1500, true);
        if (!r.won) fail('modes', `call:${cls} is stuck on wave ${r.wave} after ${r.t} s`);
      } catch (err) {
        fail('modes', `call:${cls}`, err);
      }
    }
    out.push(`call ${CLASS_KEYS.length} classes`);
  }
  return out.join(', ');
});

// ---------------------------------------------------------------- bots

await section('bots', async () => {
  if (!cfg) return 'skipped';
  const { createHub } = await import('../src/hub.js');
  const out = [];
  const games = [...Object.keys(DIFFICULTIES).map((d) => ['coop', d]), ['versus', 'easy']];
  for (const [mode, diff] of games) {
    const key = mode === 'versus' ? 'versus' : diff;
    if (!picked(key)) continue;
    const t0 = Date.now();
    const errors = [];
    const oldError = console.error;
    console.error = (...a) => errors.push(a.map((x) => (x instanceof Error ? where(x) : String(x))).join(' '));
    try {
      // The hub with timers we drive by hand: one tick per call.
      const timers = [];
      const hub = createHub({ setInterval: (fn) => timers.push(fn), clearInterval: (id) => (timers[id - 1] = null) });
      let snap = null;
      let room = null;
      const chat = [];
      const me = hub.connect((m) => {
        if (m.type === 'room') room = m.room;
        else if (m.type === 'error') errors.push(`hub error: ${m.msg}`);
        else if (m.type === 'chat') chat.push(m);
        if (m.s) snap = m.s;
      });
      me.receive({ type: 'hello', name: 'check' });
      me.receive({ type: 'room.create', name: 'check', mode, difficulty: diff, map: 'meadow', seats: 4, bots: 3 });
      me.receive({ type: 'room.start' });
      if (room?.state !== 'game') throw new Error(`the game did not start (room state ${room?.state})`);
      const botTowers = () => (snap?.t ?? []).filter((r) => String(r[1]).startsWith('bot'));
      const secs = 75;
      for (let i = 0; i < secs * 20; i++) {
        for (const fn of timers) fn?.();
        if (i === 20 * 40) me.receive({ type: 'game.command', cmd: 'build', x: 20, z: 10 });
        if (i === 20 * 50) {
          const t = botTowers()[0];
          if (t) me.receive({ type: 'game.command', cmd: 'upgrade', id: t[0], x: t[4], z: t[5] });
        }
      }
      const owners = new Set(botTowers().map((r) => r[1]));
      if (owners.size < 3) fail('bots', `${key}: only ${owners.size} of 3 bots built anything in ${secs}s`);
      const replies = chat.filter((m) => String(m.id).startsWith('bot')).length;
      if (mode !== 'versus' && !replies) fail('bots', `${key}: no bot answered an order`);
      for (const e of errors) fail('bots', `${key}`, e);
      out.push(`${key} ${botTowers().length}t ${Date.now() - t0}ms`);
    } catch (err) {
      fail('bots', key, err);
    } finally {
      console.error = oldError;
    }
  }
  return out.join(', ');
});

// ---------------------------------------------------------------- models

await section('models', async () => {
  if (!cfg) return 'skipped';
  fakeCanvas();
  const { makeEnemy, makeUnit } = await import('../src/models.js');
  let n = 0;
  const built = (m, what) => {
    n++;
    if (!m?.root) fail('models', `${what} built no model`);
  };
  // Every unit model a tower can send out (same walk as tools/viewer.js).
  const units = new Map();
  const seen = new Set();
  const walk = (o, d) => {
    if (!o || typeof o !== 'object' || seen.has(o) || d > 8) return;
    seen.add(o);
    if (typeof o.model === 'string' && o.hp != null && !units.has(o.model)) units.set(o.model, o);
    for (const v of Object.values(o)) walk(v, d + 1);
  };
  for (const def of Object.values(TOWERS)) walk(def, 0);
  for (const [key, def] of Object.entries(ENEMIES)) {
    if (!picked(key)) continue;
    try {
      built(makeEnemy(def), `enemy ${key}`);
    } catch (err) {
      fail('models', `enemy ${key}`, err);
    }
  }
  for (const [key, def] of units) {
    if (!picked(key)) continue;
    try {
      built(makeUnit(key, def.soldiers || 1), `unit ${key}`);
    } catch (err) {
      fail('models', `unit ${key}`, err);
    }
  }
  for (const r of await Promise.all(modelJobs)) {
    n += r.n;
    for (const [what, err] of r.fails) fail('models', what, err);
  }
  return `${n} models built (towers on ${modelJobs.length} threads, ${Date.now() - modelsT0}ms alongside the sections above)`;
});

// ---------------------------------------------------------------- report

for (const w of warns) console.log(`warn ${w}`);
if (fails.length) {
  console.log(`\n${fails.length} problem${fails.length > 1 ? 's' : ''}:`);
  for (const f of fails.slice(0, 60)) console.log(`  ${f}`);
  if (fails.length > 60) console.log(`  ... and ${fails.length - 60} more`);
  process.exit(1);
}
console.log('\nAll good.');
