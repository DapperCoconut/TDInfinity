// node tools/balance/table.mjs [mode] [dmgCash=0.5] [cash=1.3] [startCash=600]
// The money each mode pays against the health it sends, wave by wave, assuming every zombie dies:
// the old kill rewards next to cash for damage. "press" = the wave's health per dollar earned so
// far: how hard the wave leans on your wallet (about 0.1 is comfortable, 1 is a wall).
// With a mode it prints every wave, without one a summary line per mode. The figures are a solo
// player's (in a `pot` mode like Halloween that is also what a whole team gets between them).
import { DIFFICULTIES, ENEMIES, GAME } from '../../src/config.js';

const args = process.argv.slice(2);
const only = args.find((s) => !s.includes('='));
const a = Object.fromEntries(args.filter((s) => s.includes('=')).map((s) => s.split('=')));
const pad = (v, n) => String(v).padStart(n);
// What the kill-reward economy paid, where a mode's numbers have changed since (for the "old" columns).
const OLD = { hardcore: { cash: 2.8 } };
const k = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e4 ? `${Math.round(v / 1e3)}k` : `${Math.round(v)}`);

for (const [key, d] of Object.entries(DIFFICULTIES)) {
  if (only && key !== only) continue;
  const rate = Number(a.dmgCash ?? d.dmgCash ?? GAME.dmgCash);
  const cash = Number(a.cash ?? d.cash);
  const pot = d.pot ?? 1; // a full server's cash, all of it a solo player's
  const oldCash = OLD[key]?.cash ?? d.cash;
  const start = Number(a.startCash ?? (d.startCash ?? Math.round(GAME.startCash * d.cash)) * pot);
  let oldCum = d.startCash ?? Math.round(GAME.startCash * oldCash);
  let newCum = start;
  let totalHp = 0;
  const rows = [];
  d.waves.forEach((w, i) => {
    const scale = d.flatHp ? 1 : 1 + GAME.hpScalePerWave * i;
    let hp = 0;
    let kills = 0;
    let pays = 0;
    for (const [type, count, , , x] of w.groups) {
      const e = ENEMIES[type];
      const h = (typeof x === 'number' ? x : e.hp * scale) * count;
      hp += h;
      kills += e.reward * GAME.earnMult * count;
      if (e.reward !== 0 || e.boss) pays += h * rate * (e.cash ?? 1);
    }
    const base = w.bonus ?? GAME.waveBonus(i + 1);
    rows.push({ wave: i + 1, hp, oldCum, newCum, oldPress: hp / oldCum, newPress: hp / newCum });
    oldCum += kills + Math.round(base * oldCash);
    newCum += pays + Math.round(base * cash * pot);
    totalHp += hp;
  });
  if (only) {
    console.log(`${key}: $${rate} per damage, wave bonus x${cash}, start $${start}`);
    console.log('wave    health   old cash  press   new cash  press');
    for (const r of rows) console.log(`${pad(r.wave, 4)} ${pad(k(r.hp), 9)} ${pad(k(r.oldCum), 10)} ${pad(r.oldPress.toFixed(2), 6)} ${pad(k(r.newCum), 10)} ${pad(r.newPress.toFixed(2), 6)}`);
  }
  const third = (f, n) => Math.max(...rows.slice(Math.floor((rows.length * n) / 3), Math.floor((rows.length * (n + 1)) / 3)).map(f)).toFixed(2);
  const dip = rows.reduce((m, r) => (r.newCum / r.oldCum < m.v ? { v: r.newCum / r.oldCum, wave: r.wave } : m), { v: 9, wave: 0 });
  console.log(`${key.padEnd(10)} rate ${pad(rate, 4)}  health ${pad(k(totalHp), 6)}  cash old ${pad(k(oldCum), 6)} new ${pad(k(newCum), 6)}  worst press by third: old ${third((r) => r.oldPress, 0)} ${third((r) => r.oldPress, 1)} ${third((r) => r.oldPress, 2)}  new ${third((r) => r.newPress, 0)} ${third((r) => r.newPress, 1)} ${third((r) => r.newPress, 2)}  poorest vs old: ${Math.round(dip.v * 100)}% on wave ${dip.wave}`);
}
