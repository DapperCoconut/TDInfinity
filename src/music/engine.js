// Plays the tracks compose.js writes, with synthesized instruments (no audio files).
//
// The engine keeps a little ahead of the clock: every few milliseconds it schedules the notes of
// the next quarter second. Changing track crossfades: the old one fades out while the new one
// starts. It works on any AudioContext, so tools/music can also render tracks offline to measure them.
import { compose } from './compose.js';
import { trackSpec } from './tracks.js';

const LOOKAHEAD = 0.25; // seconds of notes scheduled ahead
const TICK_MS = 40;
// How loud the music is at full volume, next to the sound effects (audio.js plays those at 0.35).
const LEVEL = 0.2;

// Instruments. w / w2: the two oscillators' waves (w2 is `det` cents sharp, `oct2` semitones up,
// and `mix2` as loud). a d s r: attack, decay, sustain level, release. lp: low-pass filter (Hz at
// middle C, it follows the pitch), lpEnv: how far it opens at the start of a note, lpD: how fast
// it closes again. vib: vibrato in cents on long notes. vol: loudness.
const INST = {
  pulse: { w: 'pulse25', a: 0.004, d: 0.08, s: 0.7, r: 0.05, vol: 0.2, vib: 6 },
  square: { w: 'square', w2: 'pulse25', det: 5, mix2: 0.5, a: 0.004, d: 0.1, s: 0.7, r: 0.05, lp: 2200, lpEnv: 1500, vol: 0.15 },
  flute: { w: 'triangle', w2: 'sine', oct2: 12, mix2: 0.3, a: 0.035, d: 0.1, s: 0.85, r: 0.12, vol: 0.17, vib: 7 },
  brass: { w: 'sawtooth', w2: 'sawtooth', det: 9, mix2: 0.8, a: 0.03, d: 0.18, s: 0.75, r: 0.09, lp: 900, lpEnv: 2400, lpD: 0.2, vol: 0.19, vib: 4 },
  sawLead: { w: 'sawtooth', w2: 'square', det: 7, mix2: 0.5, a: 0.006, d: 0.12, s: 0.7, r: 0.07, lp: 1500, lpEnv: 3000, vol: 0.18, vib: 5 },
  bell: { w: 'sine', w2: 'sine', oct2: 19, mix2: 0.3, a: 0.002, d: 0.45, s: 0.05, r: 0.3, vol: 0.26, ring: 0.5 },
  twang: { w: 'sawtooth', a: 0.002, d: 0.3, s: 0.12, r: 0.1, lp: 500, lpEnv: 4200, lpD: 0.07, vol: 0.32 },
  pluck: { w: 'square', a: 0.002, d: 0.16, s: 0.02, r: 0.05, lp: 700, lpEnv: 2600, lpD: 0.06, vol: 0.22 },
  harpsi: { w: 'pulse12', a: 0.002, d: 0.3, s: 0.1, r: 0.05, vol: 0.3 },
  organ: { w: 'sine', w2: 'triangle', oct2: 12, mix2: 0.5, a: 0.012, d: 0.05, s: 0.95, r: 0.06, vol: 0.12, vib: 5 },
  eerie: { w: 'sine', w2: 'triangle', det: 6, mix2: 0.3, a: 0.09, d: 0.1, s: 0.9, r: 0.25, vol: 0.14, vib: 16 },
  stab: { w: 'sawtooth', w2: 'sawtooth', det: 12, mix2: 0.8, a: 0.004, d: 0.14, s: 0.2, r: 0.08, lp: 900, lpEnv: 2800, lpD: 0.09, vol: 0.11 },
  // Pads
  soft: { w: 'triangle', w2: 'sine', det: 6, mix2: 0.6, a: 0.3, d: 0.2, s: 0.9, r: 0.5, vol: 0.032 },
  strings: { w: 'sawtooth', w2: 'sawtooth', det: 13, mix2: 0.9, a: 0.25, d: 0.3, s: 0.85, r: 0.5, lp: 1100, vol: 0.03 },
  dark: { w: 'sawtooth', w2: 'square', det: 10, mix2: 0.6, a: 0.35, d: 0.3, s: 0.9, r: 0.6, lp: 480, vol: 0.03 },
  power: { w: 'sawtooth', w2: 'sawtooth', det: 8, mix2: 0.9, a: 0.02, d: 0.3, s: 0.7, r: 0.15, lp: 750, lpEnv: 900, vol: 0.045 },
  organPad: { w: 'sine', w2: 'triangle', oct2: 12, mix2: 0.4, a: 0.15, d: 0.1, s: 0.95, r: 0.3, vol: 0.026 },
  // Basses
  tri: { w: 'triangle', w2: 'square', mix2: 0.12, a: 0.004, d: 0.1, s: 0.8, r: 0.05, vol: 0.135 },
  sawBass: { w: 'sawtooth', w2: 'square', oct2: -12, mix2: 0.5, a: 0.004, d: 0.12, s: 0.6, r: 0.05, lp: 420, lpEnv: 1300, lpD: 0.08, vol: 0.15 },
  sub: { w: 'sine', w2: 'triangle', mix2: 0.5, a: 0.01, d: 0.1, s: 0.95, r: 0.1, vol: 0.085 },
};
// A pad or arpeggio played on a tune instrument uses a softer version of it.
const PAD_AS = { organ: 'organPad' };
const ARP_VOL = { bell: 0.5 };
// Where each layer sits between the speakers.
const PAN = { lead: 0, lead2: 0.3, arp: -0.3, pad: 0, bass: 0, drums: 0 };

/** A pulse wave with duty cycle `d` (the classic chiptune lead). */
function pulseWave(ctx, d) {
  const n = 32;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let i = 1; i < n; i++) {
    real[i] = (2 * Math.sin(2 * Math.PI * i * d)) / (Math.PI * i);
    imag[i] = (2 * (1 - Math.cos(2 * Math.PI * i * d))) / (Math.PI * i);
  }
  return ctx.createPeriodicWave(real, imag);
}

export class MusicEngine {
  /** Plays into `dest` (default: the speakers). `live: false` for an OfflineAudioContext (no timer). */
  constructor(ctx, dest = ctx.destination, live = true) {
    this.ctx = ctx;
    this.waves = { pulse25: pulseWave(ctx, 0.25), pulse12: pulseWave(ctx, 0.125) };
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    // Everything goes through one volume knob and a limiter, so loud tracks can't clip.
    // `out` is the volume knob, after the limiter; the tracks play into `mix`.
    this.mix = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 5;
    comp.attack.value = 0.005;
    comp.release.value = 0.2;
    this.out = ctx.createGain();
    this.out.gain.value = (this.volume = 1) * LEVEL;
    this.mix.connect(comp).connect(this.out).connect(dest);
    // A small room, shared by every track.
    this.reverb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 1.3);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    this.reverb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    this.reverb.connect(wet).connect(this.mix);

    this.players = [];
    this.current = null; // the player that's fading in or playing
    this.cache = new Map(); // id -> composed track
    this.places = new Map(); // id -> section to pick a track up from again
    this.onLoop = null; // (id) => {} when a track has played all the way through
    this.paused = false;
    if (live) this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  track(id) {
    let tr = this.cache.get(id);
    if (!tr) {
      tr = compose(trackSpec(id));
      for (const sec of tr.sections) {
        sec.at = Array.from({ length: sec.steps }, () => []);
        for (const layer of ['lead', 'lead2', 'bass', 'arp', 'pad', 'drums']) for (const ev of sec[layer]) sec.at[ev.s].push([layer, ev]);
      }
      this.cache.set(id, tr);
    }
    return tr;
  }

  /** The track that's playing (or fading in). */
  get playing() {
    return this.current?.id ?? null;
  }

  /**
   * Crossfades to track `id`. `fade`: seconds. `resume`: pick the track up at the section it was
   * last left in, instead of from the top. `delay`: seconds of silence before it starts. `cut`:
   * no crossfade; the playing track stops at the bar line it has reached and this one starts there.
   */
  play(id, { fade = 1, resume = false, delay = 0, cut = false } = {}) {
    if (this.current?.id === id) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    let start = now + 0.06 + delay;
    const old = this.current;
    if (cut && old && !this.paused && old.next > now) {
      start = old.next;
      this.places.delete(old.id);
      old.done = true;
      old.gain.gain.setValueAtTime(old.gain.gain.value, start);
      old.gain.gain.linearRampToValueAtTime(0.0001, start + 1.2); // its last notes ring out
      old.stopAt = start + 1.2;
      this.current = null;
    } else this.stop(fade);
    const tr = this.track(id);
    const spec = tr.spec;
    const p = { id, tr, sec: resume ? this.places.get(id) ?? 0 : 0, step: 0, dt: 15 / tr.bpm, next: start, loops: 0, stopAt: null, done: false, nodes: [] };
    const first = (x) => (Array.isArray(x) ? x[0] : x);
    p.inst = { lead: INST[spec.lead], lead2: INST[spec.lead2 ?? spec.lead], bass: INST[first(spec.bass)], arp: INST[first(spec.arp)], pad: INST[PAD_AS[spec.pad] ?? spec.pad] };
    p.vol = { arp: ARP_VOL[first(spec.arp)] ?? 1, drums: spec.drumVol ?? 1 };
    const node = (n) => (p.nodes.push(n), n);
    p.gain = node(ctx.createGain());
    p.gain.gain.setValueAtTime(0.0001, Math.max(now, start - 0.06));
    p.gain.gain.linearRampToValueAtTime(spec.gain ?? 1, start + (cut ? 0 : Math.min(fade, 0.4)) + 0.02);
    p.gain.connect(this.mix);
    p.dry = node(ctx.createGain());
    p.dry.connect(p.gain);
    // Tune, arpeggio and pad also go to an echo (three steps long) and the room.
    p.fx = node(ctx.createGain());
    p.fx.connect(p.dry);
    const echo = spec.echo ?? 0.25;
    const send = node(ctx.createGain());
    send.gain.value = echo;
    const tap = node(ctx.createDelay(1.5));
    tap.delayTime.value = Math.min(1.4, p.dt * 3);
    const back = node(ctx.createGain());
    back.gain.value = 0.35;
    const damp = node(ctx.createBiquadFilter());
    damp.frequency.value = 2400;
    p.fx.connect(send).connect(tap).connect(damp).connect(back).connect(tap);
    damp.connect(p.gain);
    const room = node(ctx.createGain());
    room.gain.value = echo * 0.5;
    p.fx.connect(room).connect(this.reverb);
    p.bus = {};
    for (const [layer, pan] of Object.entries(PAN)) {
      const to = layer === 'bass' || layer === 'drums' ? p.dry : p.fx;
      if (pan && ctx.createStereoPanner) {
        const sp = node(ctx.createStereoPanner());
        sp.pan.value = pan;
        sp.connect(to);
        p.bus[layer] = sp;
      } else p.bus[layer] = to;
    }
    this.players.push(p);
    this.current = p;
  }

  /** Fades the playing track out (it remembers where it was). */
  stop(fade = 1) {
    const p = this.current;
    if (!p) return;
    const now = this.ctx.currentTime;
    this.places.set(p.id, p.sec < p.tr.loop ? p.tr.loop : p.sec);
    p.gain.gain.cancelScheduledValues(now);
    p.gain.gain.setValueAtTime(p.gain.gain.value, now);
    p.gain.gain.linearRampToValueAtTime(0.0001, now + fade);
    p.stopAt = now + fade;
    this.current = null;
  }

  setVolume(v) {
    this.volume = v;
    this.out.gain.setTargetAtTime(this.paused ? 0 : v * LEVEL, this.ctx.currentTime, 0.05);
  }

  /** Silences the music and stops writing notes (a hidden tab, or music switched off). */
  pause(on) {
    if (this.paused === on) return;
    this.paused = on;
    this.out.gain.setTargetAtTime(on ? 0 : this.volume * LEVEL, this.ctx.currentTime, 0.08);
  }

  tick() {
    const now = this.ctx.currentTime;
    for (let i = this.players.length - 1; i >= 0; i--) {
      const p = this.players[i];
      if (p.stopAt != null && now > p.stopAt + 0.05) {
        for (const n of p.nodes) n.disconnect();
        this.players.splice(i, 1);
        continue;
      }
      if (this.paused || p.done) continue;
      if (p.next < now - 0.1) p.next = now + 0.05; // we fell behind (the tab was asleep): carry on from now
      const until = Math.min(now + LOOKAHEAD, p.stopAt ?? Infinity);
      while (p.next < until && !p.done) this.step(p);
    }
  }

  /** Schedules one step of player `p` and moves it on. */
  step(p) {
    const tr = p.tr;
    const sec = tr.sections[p.sec];
    const time = p.next + (p.step % 2 ? tr.swing * p.dt : 0);
    for (const [layer, ev] of sec.at[p.step]) {
      if (layer === 'drums') this.drum(p.bus.drums, time, ev, p.vol.drums);
      else this.note(p.bus[layer], time, ev.m, ev.l * p.dt, p.inst[layer], ev.v * (p.vol[layer] ?? 1));
    }
    p.next += p.dt;
    if (++p.step < sec.steps) return;
    p.step = 0;
    if (++p.sec < tr.sections.length) return;
    p.sec = tr.loop;
    p.loops++;
    if (p === this.current) this.onLoop?.(p.id);
  }

  /** Offline: writes the first `seconds` of track `id` straight into the context, from time 0. */
  render(id, seconds) {
    this.play(id, { fade: 0 });
    const p = this.current;
    p.next = 0.05;
    while (p.next < seconds) this.step(p);
  }

  /** One note of instrument `I`. */
  note(dest, time, midi, dur, I, vel = 1) {
    if (!I) return;
    const ctx = this.ctx;
    const f = 440 * 2 ** ((midi - 69) / 12);
    const a = I.a;
    const end = time + Math.max(dur, a + 0.03);
    const r = I.ring ? Math.max(I.r, I.ring) : I.r;
    const off = end + r * 2.2;
    const peak = I.vol * vel;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(peak, time + a);
    g.gain.setTargetAtTime(peak * I.s, time + a, I.d / 3);
    g.gain.setTargetAtTime(0, end, r / 3);
    let head = g;
    if (I.lp) {
      const lp = ctx.createBiquadFilter();
      const base = I.lp * (f / 261.6) ** 0.5;
      lp.frequency.setValueAtTime(base + (I.lpEnv ?? 0), time);
      if (I.lpEnv) lp.frequency.setTargetAtTime(base, time, I.lpD ?? 0.12);
      lp.connect(g);
      head = lp;
    }
    const osc = (wave, freq, det) => {
      const o = ctx.createOscillator();
      if (this.waves[wave]) o.setPeriodicWave(this.waves[wave]);
      else o.type = wave;
      o.frequency.value = freq;
      if (det) o.detune.value = det;
      o.start(time);
      o.stop(off);
      return o;
    };
    const o1 = osc(I.w, f, 0);
    o1.connect(head);
    let o2 = null;
    if (I.w2) {
      o2 = osc(I.w2, f * 2 ** ((I.oct2 ?? 0) / 12), I.det ?? 0);
      const m = ctx.createGain();
      m.gain.value = I.mix2 ?? 0.5;
      o2.connect(m).connect(head);
    }
    if (I.vib && dur > 0.28) {
      // Vibrato that comes in after the start of a long note.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 5.5;
      const depth = ctx.createGain();
      depth.gain.setValueAtTime(0, time + 0.12);
      depth.gain.linearRampToValueAtTime(I.vib, time + 0.3);
      lfo.connect(depth);
      depth.connect(o1.detune);
      if (o2) depth.connect(o2.detune);
      lfo.start(time);
      lfo.stop(off);
    }
    g.connect(dest);
  }

  /** A burst of filtered noise that dies away over `decay` seconds. */
  hiss(dest, time, vol, decay, type, freq, q = 0.7) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.0005, time + decay);
    src.connect(f).connect(g).connect(dest);
    src.start(time, Math.random());
    src.stop(time + decay + 0.02);
    return g;
  }

  /** A tone that drops from `f0` to `f1` and dies away (kicks, toms, ticks). */
  thump(dest, time, vol, decay, f0, f1, wave = 'sine', drop = 0.1) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = wave;
    o.frequency.setValueAtTime(f0, time);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, time + drop);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.0005, time + decay);
    o.connect(g).connect(dest);
    o.start(time);
    o.stop(time + decay + 0.02);
  }

  drum(dest, time, ev, vol = 1) {
    const v = ev.v * vol;
    switch (ev.k) {
      case 'k':
        this.thump(dest, time, v * 0.46, 0.24, 165, 44, 'sine', 0.11);
        break;
      case 's':
        this.hiss(dest, time, v * 0.3, 0.16, 'bandpass', 1900);
        this.thump(dest, time, v * 0.16, 0.08, 210, 150, 'triangle', 0.06);
        break;
      case 'h':
        this.hiss(dest, time, v * 0.1, 0.04, 'highpass', 7500);
        break;
      case 'o':
        this.hiss(dest, time, v * 0.09, 0.26, 'highpass', 7000);
        break;
      case 'c': {
        // A clap is three quick slaps.
        const g = this.hiss(dest, time, v * 0.28, 0.17, 'bandpass', 1300, 1);
        g.gain.setValueAtTime(v * 0.28, time + 0.012);
        g.gain.setValueAtTime(v * 0.28, time + 0.024);
        break;
      }
      case 't':
        this.thump(dest, time, v * 0.38, 0.26, 230, 130, 'sine', 0.2);
        break;
      case 'm':
        this.thump(dest, time, v * 0.34, 0.28, 165, 92, 'sine', 0.2);
        break;
      case 'l':
        this.thump(dest, time, v * 0.34, 0.32, 115, 64, 'sine', 0.2);
        break;
      case 'p': {
        // Timpani, tuned to the chord's root.
        const f = 440 * 2 ** ((ev.m + 12 - 69) / 12);
        this.thump(dest, time, v * 0.4, 0.7, f * 1.08, f, 'sine', 0.08);
        this.thump(dest, time, v * 0.12, 0.4, f * 2.16, f * 2, 'triangle', 0.08);
        this.hiss(dest, time, v * 0.14, 0.09, 'lowpass', 320);
        break;
      }
      case 'a':
        this.thump(dest, time, v * 0.07, 0.14, 830, 830, 'square');
        this.thump(dest, time, v * 0.06, 0.11, 1332, 1332, 'square');
        this.hiss(dest, time, v * 0.1, 0.05, 'bandpass', 3200, 2);
        break;
      case 'i':
        this.thump(dest, time, v * 0.1, 0.03, 2600, 2600, 'triangle');
        break;
      case 'j':
        this.thump(dest, time, v * 0.09, 0.03, 1750, 1750, 'triangle');
        break;
      case 'r':
        this.hiss(dest, time, v * 0.05, 0.055, 'highpass', 5500);
        break;
      case 'crash':
        this.hiss(dest, time, v * 0.14, 1.3, 'highpass', 4500);
        this.thump(dest, time, v * 0.3, 0.6, 70, 38, 'sine', 0.4);
        break;
    }
  }
}
