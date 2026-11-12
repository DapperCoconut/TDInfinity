// Tiny synthesized sound effects and the music (no audio files needed).
import { ENEMIES, TOWERS } from './config.js';
import { MusicEngine } from './music/engine.js';
import { MENU_TRACKS, bossFamily } from './music/tracks.js';

let ctx = null;
let master = null;
let noiseBuf = null;
let muted = false;
let lastShot = 0;
let lastRapid = 0;
let lastFlame = 0;

function tone(freq, dur, { type = 'square', vol = 0.2, slide = null, delay = 0 } = {}) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, { vol = 0.3, freq = 2000, type = 'bandpass' } = {}) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

// ---- Music: there's always a track playing. The menus rotate through three, every map has its
// own, and every boss has its own that takes over while that boss is alive (music/tracks.js).
const MUSIC_KEY = 'td-music';
const BOSS_LINGER = 2500; // ms a boss's track plays on after the boss is gone
const MUSIC_LEVELS = { on: 1, quiet: 0.4, off: 0 };
const music = {
  engine: null, // created with the audio context (a browser only allows sound after a click or key)
  level: 'on', // on | quiet | off
  want: null, // the track that should be playing
  opts: undefined,
  menuAt: Math.floor(Math.random() * MENU_TRACKS.length),
  boss: null, // the boss family whose track is on
  bossSeen: 0,
};
try {
  const saved = localStorage.getItem(MUSIC_KEY);
  if (saved in MUSIC_LEVELS) music.level = saved;
} catch {
  // no storage (private mode): music stays on
}

/** Makes `id` the track that plays (see MusicEngine.play for `opts`). */
function wantTrack(id, opts) {
  if (music.want === id) return;
  music.want = id;
  music.opts = opts;
  if (music.engine && music.level !== 'off') music.engine.play(id, opts);
}

/** Silent while sound is muted or the tab is hidden; nothing plays while music is switched off. */
function syncMusic() {
  const m = music.engine;
  if (!m) return;
  const off = music.level === 'off';
  m.pause(muted || off || document.hidden);
  if (!off) m.setVolume(MUSIC_LEVELS[music.level]);
  if (off) m.stop(0.3);
  else if (music.want) m.play(music.want, music.opts);
}

export const audio = {
  unlock() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      music.engine = new MusicEngine(ctx);
      // A menu track that has played through hands over to the next one.
      music.engine.onLoop = (id) => {
        if (id !== music.want || !MENU_TRACKS.includes(id)) return;
        music.menuAt = (MENU_TRACKS.indexOf(id) + 1) % MENU_TRACKS.length;
        wantTrack(MENU_TRACKS[music.menuAt], { cut: true });
      };
      document.addEventListener('visibilitychange', syncMusic);
      syncMusic();
    }
    if (ctx.state === 'suspended') ctx.resume();
  },
  toggleMute() {
    muted = !muted;
    syncMusic();
    return muted;
  },
  /** Music: on -> quiet -> off -> on (remembered for next time). Returns the new level. */
  toggleMusic() {
    const levels = Object.keys(MUSIC_LEVELS);
    music.level = levels[(levels.indexOf(music.level) + 1) % levels.length];
    try {
      localStorage.setItem(MUSIC_KEY, music.level);
    } catch {
      // not saved, then
    }
    syncMusic();
    return music.level;
  },
  /** 'on', 'quiet' or 'off'. */
  get musicLevel() {
    return music.level;
  },
  /** The id of the track that should be playing (music/tracks.js). */
  get track() {
    return music.want;
  },
  /**
   * Menus: the three menu tracks, one after the other. Coming back from a game starts the next
   * one, after `delay` seconds (room for the victory or defeat jingle).
   */
  musicMenu(delay = 0) {
    if (MENU_TRACKS.includes(music.want)) return;
    if (music.want) music.menuAt = (music.menuAt + 1) % MENU_TRACKS.length;
    music.boss = null;
    wantTrack(MENU_TRACKS[music.menuAt], { fade: 0.6, delay });
  },
  /**
   * In a game on map `map` (its key in maps.js): the map's track, or the track of the biggest boss
   * among `enemies` (objects with type, hp and maxHp). A boss's track stays on while any of its
   * kind is alive (a boss with a health bar takes over from one without), and a moment longer.
   */
  musicGame(map, enemies) {
    let best = null;
    let bestRank = -1;
    let bestBar = false;
    let curAlive = false;
    let curBar = false;
    for (const e of enemies) {
      const def = ENEMIES[e.type];
      if (!def?.boss || !(e.hp > 0)) continue;
      const fam = bossFamily(e.type);
      const rank = (def.bar ? 1e15 : 0) + (e.maxHp ?? def.hp ?? 0);
      if (fam === music.boss) {
        curAlive = true;
        curBar ||= !!def.bar;
      }
      if (rank > bestRank) {
        bestRank = rank;
        best = fam;
        bestBar = !!def.bar;
      }
    }
    if (curAlive && (curBar || !bestBar)) best = music.boss;
    const now = performance.now();
    if (best) {
      music.boss = best;
      music.bossSeen = now;
      wantTrack(`boss:${best}`, { fade: 0.8 });
    } else if (!music.boss || now - music.bossSeen > BOSS_LINGER) {
      music.boss = null;
      wantTrack(`map:${map}`, { fade: 1.5, resume: true }); // the map's track carries on where it was
    }
  },
  shot(level, type) {
    if (!ctx) return;
    type = TOWERS[type]?.goldOf ?? type; // golden towers sound like their normal version
    const now = ctx.currentTime;
    if (now - lastShot < 0.03) return; // avoid stacking dozens of shots in one frame
    lastShot = now;
    if (type === 'phaser') {
      // Beam hum: pitch climbs with level
      tone(180 + level * 60, 0.12, { type: 'sawtooth', vol: 0.04, slide: 260 + level * 80 });
      return;
    }
    if (type === 'railgunner') {
      // Charged rail crack: rising whine + heavy thump
      tone(level >= 4 ? 80 : 140, 0.35, { type: 'sawtooth', vol: 0.14, slide: 40 });
      tone(2400, 0.15, { type: 'square', vol: 0.05, slide: 300 });
      noise(0.3, { vol: 0.35, freq: 500, type: 'lowpass' });
      return;
    }
    if (type === 'enforcer' || type === 'enforcerWarden') {
      // Bonk (with an electric zap from the Enforcer's Lv 4)
      tone(150, 0.1, { type: 'triangle', vol: 0.18, slide: 70 });
      if (level >= 3 && type === 'enforcer') tone(2200, 0.08, { type: 'sawtooth', vol: 0.04, slide: 900 });
      return;
    }
    if (type === 'frost') {
      // Icy hiss
      noise(0.25, { vol: 0.12, freq: 6000, type: 'highpass' });
      tone(1800, 0.15, { type: 'sine', vol: 0.05, slide: 2600 });
      return;
    }
    if (type === 'shotgunner') {
      // Boom of buckshot
      noise(0.18, { vol: 0.3, freq: 900, type: 'lowpass' });
      tone(130, 0.1, { type: 'triangle', vol: 0.1, slide: 60 });
      return;
    }
    if (type === 'plasma') {
      // Crackly electric zap
      tone(900 + level * 150, 0.09, { type: 'sawtooth', vol: 0.05, slide: 2400 });
      noise(0.06, { vol: 0.06, freq: 5000, type: 'highpass' });
      return;
    }
    if (type === 'unit') {
      if (now - lastRapid < 0.07) return;
      lastRapid = now;
      noise(0.05, { vol: 0.1, freq: level ? 1800 : 2600 });
      return;
    }
    if (type === 'sniper') {
      noise(0.22, { vol: 0.32, freq: level >= 3 ? 450 : 600 });
      tone(level >= 4 ? 120 : 200, 0.12, { type: 'triangle', vol: 0.08, slide: 60 });
      return;
    }
    if (type === 'tesla') {
      // Heavy crackling arc
      noise(0.2, { vol: 0.18, freq: 3200 });
      tone(420 + level * 60, 0.16, { type: 'sawtooth', vol: 0.06, slide: 120 });
      return;
    }
    if (type === 'toxicnatorSaboteur') {
      // Muffled pellet shotgun with a wet hiss
      if (now - lastRapid < 0.06) return;
      lastRapid = now;
      noise(0.12, { vol: 0.2, freq: 1400, type: 'lowpass' });
      noise(0.1, { vol: 0.05, freq: 5000, type: 'highpass' });
      return;
    }
    if (type === 'electro' || type === 'electroTrooper') {
      // Crackling zap
      noise(0.12, { vol: 0.14, freq: 4000 });
      tone(900 + level * 120, 0.1, { type: 'square', vol: 0.05, slide: 200 });
      return;
    }
    if (type === 'plasmaPulse') {
      // Deep electric "whum" that drops in pitch as the ring spreads
      tone(520 + level * 60, 0.22, { type: 'sine', vol: 0.09, slide: 140 });
      noise(0.08, { vol: 0.05, freq: 4500, type: 'highpass' });
      return;
    }
    if (type === 'shotgunnerCombat' || type === 'shotgunnerCombatBottom') {
      // Buckshot boom; heavier for the DB-12 / SWAT. One per blast, not per zombie hit.
      if (now - lastRapid < 0.06) return;
      lastRapid = now;
      noise(0.16, { vol: 0.28, freq: type === 'shotgunnerCombatBottom' && level >= 4 ? 600 : 1000, type: 'lowpass' });
      if (type === 'shotgunnerCombatBottom') tone(110, 0.12, { type: 'triangle', vol: 0.1, slide: 50 });
      return;
    }
    if (type === 'frostRanger' || type === 'frostRangerBottom') {
      // Icy rifle crack with a glassy ping
      if (now - lastRapid < 0.06) return;
      lastRapid = now;
      noise(0.06, { vol: 0.12, freq: 3200, type: 'highpass' });
      tone(1500 + level * 100, 0.06, { type: 'sine', vol: 0.04, slide: 2200 });
      return;
    }
    if (type === 'shotgunnerPump') {
      noise(0.2, { vol: 0.3, freq: 900 });
      return;
    }
    if (type === 'railgunnerRanger') {
      // Big-bore rifle boom (an explosive cannon blast at max level)
      if (level >= 4) tone(70, 0.4, { type: 'sawtooth', vol: 0.14, slide: 35 });
      noise(0.3, { vol: 0.38, freq: level >= 4 ? 400 : 600 });
      return;
    }
    if (type === 'mercLaser' || type === 'mercLaserBottom') {
      // Laser zap (rapid SMG / minigun zaps are rate-limited)
      if (level >= 3) {
        if (now - lastRapid < 0.07) return;
        lastRapid = now;
      }
      tone(level >= 3 ? 1500 : 1200, 0.07, { type: 'square', vol: 0.05, slide: 450 });
      return;
    }
    if (type === 'turret') {
      if (now - lastRapid < 0.06) return;
      lastRapid = now;
      if (level >= 5) tone(700, 0.06, { type: 'square', vol: 0.05, slide: 250 });
      noise(0.08, { vol: 0.2, freq: level >= 3 ? 900 : 1200 });
      return;
    }
    if (type === 'marksmanHunter') {
      noise(0.2, { vol: 0.3, freq: 650 });
      return;
    }
    if (type === 'commando' || type === 'commandoMinigunner' || type === 'aviator' || type === 'mercMilitant' || type === 'aviatorAce' || type === 'merc') {
      if (now - lastRapid < 0.07) return; // rapid-fire guns would otherwise drown everything out
      lastRapid = now;
    }
    if (type === 'commandoMinigunner') noise(0.04, { vol: level >= 4 ? 0.16 : 0.13, freq: level >= 4 ? 1600 : 2000 });
    else if (type === 'commando') {
      if (level >= 4) tone(1300, 0.05, { type: 'square', vol: 0.04, slide: 600 });
      else noise(0.04, { vol: 0.14, freq: 2200 });
    } else if (type === 'aviator' || type === 'aviatorAce') noise(0.04, { vol: 0.08, freq: 3000 });
    else if (type === 'mercMilitant' || type === 'merc') noise(0.05, { vol: level >= 4 ? 0.16 : 0.11, freq: level >= 4 ? 1500 : 2600 });
    else if (type === 'marksman') {
      // Heavy rifle crack (pulse zap when maxed)
      if (level >= 4) tone(900, 0.18, { type: 'sawtooth', vol: 0.1, slide: 120 });
      noise(0.16, { vol: 0.3, freq: 700 });
    } else if (type === 'soldier' && level >= 4) tone(1600, 0.06, { type: 'square', vol: 0.06, slide: 500 }); // laser
    else if (level >= 4) noise(0.05, { vol: 0.15, freq: 3500 });
    else noise(0.07, { vol: 0.22, freq: 1400 + level * 300 });
  },
  /** Grenade toss or mortar thump. */
  lob(type) {
    if (type === 'mortar' || type === 'mortarClassic' || type === 'cryoMortar' || type === 'mortarArtillery' || type === 'mortarArtilleryBottom') {
      tone(70, 0.25, { type: 'sine', vol: 0.2, slide: 45 });
      noise(0.2, { vol: 0.2, freq: 400, type: 'lowpass' });
    } else if (type === 'paintballer') {
      tone(260, 0.06, { type: 'square', vol: 0.05, slide: 140 }); // air-gun thwip
      noise(0.05, { vol: 0.08, freq: 2200 });
    } else if (type === 'paint') {
      noise(0.08, { vol: 0.1, freq: 900, type: 'lowpass' }); // wet splat
    } else if (type === 'gas') {
      noise(0.45, { vol: 0.07, freq: 2500 }); // gas hiss
    } else if (type === 'grenadierAssaultBottom') {
      noise(0.12, { vol: 0.06, freq: 1200 });
      tone(900, 0.08, { type: 'square', vol: 0.03, slide: 1800 }); // shock grenade crackle
    } else noise(0.12, { vol: 0.06, freq: 1200 });
  },
  rocket(level, type) {
    if (type === 'rocketeerTrooperBottom' && level >= 5) return noise(0.2, { vol: 0.09, freq: 1100 }); // MRL: quick light whooshes
    if (type === 'rocketeerTrooper' && level >= 5) tone(160, 0.4, { type: 'triangle', vol: 0.08, slide: 60 }); // Javelin: heavy launch thump
    noise(0.35, { vol: 0.16, freq: 700 });
    if (level >= 4) tone(500, 0.3, { type: 'sawtooth', vol: 0.05, slide: 1200 });
  },
  flame() {
    if (!ctx) return;
    const now = ctx.currentTime;
    if (now - lastFlame < 0.2) return; // several flamethrowers would roar too loud
    lastFlame = now;
    noise(0.3, { vol: 0.09, freq: 500, type: 'lowpass' });
  },
  ice() {
    tone(2400, 0.2, { type: 'sine', vol: 0.05, slide: 1200 });
    noise(0.2, { vol: 0.1, freq: 5000, type: 'highpass' });
  },
  /** Airstrike jet screaming overhead. */
  jet() {
    tone(1400, 0.9, { type: 'sawtooth', vol: 0.06, slide: 300 });
    noise(0.9, { vol: 0.12, freq: 1200 });
  },
  /** Sweeper: a laser hum that wobbles while the beams spin. */
  sweep(duration = 6) {
    tone(220, 0.8, { type: 'sawtooth', vol: 0.07, slide: 660 });
    for (let t = 0.6; t < duration; t += 0.6) tone(440, 0.55, { type: 'sine', vol: 0.04, slide: 520, delay: t });
  },
  /** Apocalypse Rave: a quick bass-drop arpeggio. */
  rave() {
    [65, 98, 131, 196, 262, 392].forEach((f, i) => tone(f, 0.18, { type: 'square', vol: 0.12, delay: i * 0.09 }));
    tone(55, 0.8, { type: 'sine', vol: 0.25, slide: 40, delay: 0.55 });
  },
  missile() {
    noise(0.3, { vol: 0.12, freq: 900 });
  },
  boom(radius = 4) {
    tone(90, 0.35, { type: 'sawtooth', vol: Math.min(0.25, 0.1 + radius * 0.015), slide: 35 });
    noise(0.4, { vol: 0.3, freq: 350, type: 'lowpass' });
  },
  kill() {
    tone(220, 0.12, { type: 'square', vol: 0.08, slide: 90 });
  },
  cash() {
    tone(1200, 0.06, { type: 'triangle', vol: 0.06 });
  },
  place() {
    tone(500, 0.08, { type: 'triangle', vol: 0.2 });
    tone(750, 0.1, { type: 'triangle', vol: 0.2, delay: 0.07 });
  },
  upgrade() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { type: 'triangle', vol: 0.15, delay: i * 0.06 }));
  },
  sell() {
    tone(800, 0.1, { type: 'triangle', vol: 0.15, slide: 400 });
  },
  error() {
    tone(160, 0.15, { type: 'sawtooth', vol: 0.12 });
  },
  baseHit() {
    tone(110, 0.3, { type: 'sawtooth', vol: 0.2, slide: 55 });
    noise(0.2, { vol: 0.2, freq: 300, type: 'lowpass' });
  },
  waveStart() {
    tone(392, 0.15, { type: 'square', vol: 0.1 });
    tone(523, 0.25, { type: 'square', vol: 0.1, delay: 0.15 });
  },
  victory() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.2, delay: i * 0.12 }));
  },
  /** Halloween Jack laughs when he spawns: a deep, wobbling "ha-ha-ha-haaa". */
  laugh() {
    [0, 0.2, 0.4, 0.6, 0.85].forEach((d, i) => {
      const f = 210 - i * 18;
      tone(f, i === 4 ? 0.6 : 0.16, { type: 'sawtooth', vol: 0.14, slide: f * 0.7, delay: d });
      tone(f * 2.5, i === 4 ? 0.5 : 0.12, { type: 'square', vol: 0.04, slide: f * 1.6, delay: d });
    });
    noise(1.4, { vol: 0.08, freq: 600 });
  },
  /** An old phone ringing: a fast double bell (Mysterious Call). `vol`: 0..1, quieter far away. */
  ring(vol = 1) {
    for (let i = 0; i < 12; i++) tone(i % 2 ? 1250 : 1000, 0.05, { type: 'square', vol: 0.05 * vol, delay: i * 0.05 + (i >= 6 ? 0.2 : 0) });
  },
  /** A breathy whisper (Halloween Jack's death). */
  whisper() {
    noise(1.8, { vol: 0.16, freq: 3200 });
    noise(1.2, { vol: 0.1, freq: 1800 });
    tone(880, 1.6, { type: 'sine', vol: 0.03, slide: 440 });
  },
  defeat() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, { type: 'sawtooth', vol: 0.12, delay: i * 0.2 }));
  },
};
