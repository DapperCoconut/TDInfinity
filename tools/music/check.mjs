// Checks every music track's notes without playing them: node tools/music/check.mjs [track id]
// Every boss must have a track, every note must be in range, and no two tracks may share a tune.
// With a track id it also prints that track's first A section as a piano roll.
import { ENEMIES } from '../../src/config.js';
import { MAPS } from '../../src/sim/maps.js';
import { compose } from '../../src/music/compose.js';
import { MENU_TRACKS, TRACKS, bossFamily, trackSpec } from '../../src/music/tracks.js';

const ids = new Set(MENU_TRACKS);
for (const k of Object.keys(MAPS)) ids.add(`map:${k}`);
for (const [k, e] of Object.entries(ENEMIES)) if (e.boss) ids.add(`boss:${bossFamily(k)}`);
const problems = [];
for (const id of ids) if (!TRACKS[id]) problems.push(`${id}: no line in tracks.js (it gets an automatic track)`);
for (const id of Object.keys(TRACKS)) if (!ids.has(id)) problems.push(`${id}: in tracks.js but nothing plays it`);

const tunes = new Map();
let bars = 0;
for (const id of ids) {
  const tr = compose(trackSpec(id));
  const a = tr.sections.find((s) => s.name === 'A');
  const sig = a.lead.map((n) => `${n.s}:${n.m}`).join(' ');
  if (tunes.has(sig)) problems.push(`${id}: same tune as ${tunes.get(sig)}`);
  tunes.set(sig, id);
  for (const sec of tr.sections) {
    bars += sec.bars;
    for (const layer of ['lead', 'lead2', 'bass', 'arp', 'pad']) {
      for (const n of sec[layer]) {
        if (!(n.m >= 21 && n.m <= 100)) problems.push(`${id} ${sec.name} ${layer}: note ${n.m} out of range`);
        if (!(n.s >= 0 && n.s < sec.steps)) problems.push(`${id} ${sec.name} ${layer}: step ${n.s} outside the section`);
      }
    }
    if (sec.name !== 'I' && sec.name !== 'X' && !sec.lead.length) problems.push(`${id} ${sec.name}: no tune`);
  }
  const secs = tr.sections.reduce((n, s) => n + s.steps, 0) * (15 / tr.bpm);
  if (process.argv[2] === id) {
    console.log(`${id}: ${tr.bpm} bpm, ${tr.spec.key} ${tr.spec.scale}, ${Math.round(secs)}s`);
    const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    const hi = Math.max(...a.lead.map((n) => n.m));
    const lo = Math.min(...a.lead.map((n) => n.m));
    for (let m = hi; m >= lo; m--) {
      let row = '';
      for (let s = 0; s < a.steps; s++) {
        const n = a.lead.find((x) => x.m === m && s >= x.s && s < x.s + x.l);
        row += (s % tr.meter === 0 ? '|' : '') + (n ? (n.s === s ? 'O' : '-') : ' ');
      }
      console.log(names[m % 12].padEnd(3) + row);
    }
    console.log('chords ' + a.chords.join(' '));
  }
}
console.log(`${ids.size} tracks (${MENU_TRACKS.length} menu, ${Object.keys(MAPS).length} maps, ${ids.size - MENU_TRACKS.length - Object.keys(MAPS).length} bosses), ${bars} bars`);
if (problems.length) {
  console.log(problems.join('\n'));
  process.exit(1);
}
console.log('all good');
