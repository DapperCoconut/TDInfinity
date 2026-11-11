// Jukebox: every music track of the game, to listen to while tuning src/music/tracks.js.
// Open /tools/music.html on the dev server (npm run dev). A track's line under its name shows its
// recipe; edit it in tracks.js and the page reloads.
import { ENEMIES } from '../src/config.js';
import { MAPS } from '../src/sim/maps.js';
import { MusicEngine } from '../src/music/engine.js';
import { MENU_TRACKS, bossFamily, trackName, trackSpec } from '../src/music/tracks.js';

const groups = [
  ['Menus', MENU_TRACKS],
  ['Maps', Object.keys(MAPS).map((k) => `map:${k}`)],
  ['Bosses', [...new Set(Object.keys(ENEMIES).filter((k) => ENEMIES[k].boss).map((k) => `boss:${bossFamily(k)}`))]],
];

let engine = null;
const now = document.getElementById('now');
const buttons = new Map();

function play(id) {
  if (!engine) {
    engine = new MusicEngine(new AudioContext());
    engine.setVolume(Number(document.getElementById('vol').value));
  }
  engine.ctx.resume();
  const same = engine.playing === id;
  if (same) engine.stop(0.3);
  else engine.play(id, { fade: 0.3 });
  for (const [k, b] of buttons) b.classList.toggle('on', !same && k === id);
  const tr = engine.track(id);
  const secs = (from) => tr.sections.slice(from).reduce((a, s) => a + s.steps, 0) * (15 / tr.bpm);
  now.textContent = same ? 'Stopped.' : `${trackName(id)}  ·  ${id}  ·  ${tr.sections.map((s) => s.name).join(' ')}  ·  loops every ${Math.round(secs(tr.loop))} s`;
}

const list = document.getElementById('list');
for (const [title, ids] of groups) {
  const h = document.createElement('h2');
  h.textContent = `${title} (${ids.length})`;
  const grid = document.createElement('div');
  grid.className = 'grid';
  for (const id of ids) {
    const s = trackSpec(id);
    const b = document.createElement('button');
    b.innerHTML = `${trackName(id)}<small>${s.style ?? 'auto'} · ${s.bpm} bpm · ${s.key} ${s.scale}</small>`;
    b.onclick = () => play(id);
    buttons.set(id, b);
    grid.append(b);
  }
  list.append(h, grid);
}
document.getElementById('stop').onclick = () => {
  engine?.stop(0.3);
  for (const b of buttons.values()) b.classList.remove('on');
  now.textContent = 'Stopped.';
};
document.getElementById('vol').oninput = (e) => engine?.setVolume(Number(e.target.value));
