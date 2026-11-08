// Tiny synthesized sound effects (no audio files needed).

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
    }
    if (ctx.state === 'suspended') ctx.resume();
  },
  toggleMute() {
    muted = !muted;
    return muted;
  },
  shot(level, type) {
    if (!ctx) return;
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
    if (type === 'electro') {
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
    if (type === 'commando' || type === 'commandoMinigunner' || type === 'aviator' || type === 'rifleman' || type === 'riflemanMilitant' || type === 'aviatorAce') {
      if (now - lastRapid < 0.07) return; // rapid-fire guns would otherwise drown everything out
      lastRapid = now;
    }
    if (type === 'commandoMinigunner') noise(0.04, { vol: level >= 4 ? 0.16 : 0.13, freq: level >= 4 ? 1600 : 2000 });
    else if (type === 'commando') {
      if (level >= 4) tone(1300, 0.05, { type: 'square', vol: 0.04, slide: 600 });
      else noise(0.04, { vol: 0.14, freq: 2200 });
    } else if (type === 'aviator' || type === 'aviatorAce') noise(0.04, { vol: 0.08, freq: 3000 });
    else if (type === 'rifleman' || type === 'riflemanMilitant') noise(0.05, { vol: level >= 4 ? 0.16 : 0.11, freq: level >= 4 ? 1500 : 2600 });
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
    if (type === 'mortar' || type === 'mortarClassic') {
      tone(70, 0.25, { type: 'sine', vol: 0.2, slide: 45 });
      noise(0.2, { vol: 0.2, freq: 400, type: 'lowpass' });
    } else noise(0.12, { vol: 0.06, freq: 1200 });
  },
  rocket(level) {
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
  defeat() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, { type: 'sawtooth', vol: 0.12, delay: i * 0.2 }));
  },
};
