// Writes the notes of a music track from a short recipe (see tracks.js). No audio in here: this
// only decides which note plays on which step, so it also runs in Node (tools/music/check.mjs).
//
// A track is a list of sections (intro, A, B, ...). A section is a few bars; a bar is `meter`
// steps (16 = 4/4 in sixteenths, 12 = 3/4 or 6/8). Every section has a chord per bar and up to
// six layers of notes: lead, lead2 (the lead doubled an octave up), bass, arp, pad and drums.
// The tune is made up from the track's seed, so a track always sounds the same.

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  mixo: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygDom: [0, 1, 4, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  hungarian: [0, 2, 3, 6, 7, 8, 11],
};
const PC = { C: 0, 'C#': 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
/** A seeded random number generator (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Rhythms a bar of melody can have, by how busy the tune is ('x' = a note starts here).
const CELLS = {
  16: {
    calm: ['x.......x.......', 'x.....x.x.......', 'x...x...x.......', 'x.......x...x...', 'x.....x...x.....', 'x...........x...'],
    mid: ['x...x.x.x...x...', 'x.x.x...x...x...', 'x..x..x.x...x...', 'x...x...x.x.x...', 'x.x...x.x.....x.', 'x..x..x...x.x...', 'x...x.x.x.......', 'x.x.x.x.x.......'],
    busy: ['x.x.x.x.x...x.x.', 'x.xxx.x.x.x.x...', 'x.x.x.xxx...x...', 'xxx.x.x.x.x.x.x.', 'x..x..x.x.xxx...', 'x.x.xxx.x.x.x.x.', 'x.x.x.x.x.x.x.x.', 'x..x..x..x..x.x.'],
  },
  12: {
    calm: ['x.......x...', 'x...........', 'x.....x.....', 'x...x...x...'],
    mid: ['x...x...x...', 'x.....x.x...', 'x...x.x.x...', 'x.x.x...x...', 'x.......x.x.', 'x...x.x.x.x.'],
    busy: ['x.x.x.x.x...', 'x.x.x.x.x.x.', 'x...x.x.x.x.', 'x.xxx...x...', 'x.x.x...x.x.', 'x..x..x..x..'],
  },
};
const CALMER = { busy: 'mid', mid: 'calm', calm: 'mid' };

// Bass lines: [step, scale steps above the chord's root (4 = its fifth, 7 = an octave), length, loudness].
const BASS = {
  16: {
    root8: [0, 2, 4, 6, 8, 10, 12, 14].map((s) => [s, 0, 2, s % 8 ? 0.75 : 1]),
    octave: [0, 2, 4, 6, 8, 10, 12, 14].map((s) => [s, (s / 2) % 2 ? 7 : 0, 2, s % 4 ? 0.75 : 1]),
    pulse16: [...Array(16).keys()].map((s) => [s, 0, 1, s % 4 ? 0.6 : 1]),
    gallop: [0, 4, 8, 12].flatMap((b) => [[b, 0, 2, 1], [b + 2, 0, 1, 0.7], [b + 3, 0, 1, 0.7]]),
    synco: [[0, 0, 3, 1], [3, 0, 3, 0.8], [6, 4, 2, 0.8], [8, 0, 3, 1], [11, 0, 3, 0.8], [14, 7, 2, 0.8]],
    half: [[0, 0, 7, 1], [8, 4, 6, 0.85]],
    drone: [[0, 0, 16, 1]],
    walk: [[0, 0, 4, 1], [4, 2, 4, 0.8], [8, 4, 4, 0.9], [12, 'ap', 4, 0.8]],
    stomp: [[0, 0, 2, 1], [3, 0, 1, 0.7], [4, 0, 2, 0.9], [8, 0, 2, 1], [11, 0, 1, 0.7], [12, 0, 2, 0.9], [14, 4, 2, 0.8]],
    offbeat: [[0, 0, 1, 1], [2, 0, 2, 0.8], [6, 0, 2, 0.8], [8, 0, 1, 1], [10, 0, 2, 0.8], [14, 7, 2, 0.8]],
  },
  12: {
    waltz: [[0, 0, 4, 1]],
    six: [[0, 0, 6, 1], [6, 4, 6, 0.85]],
    drone: [[0, 0, 12, 1]],
    root: [[0, 0, 4, 1], [4, 0, 4, 0.8], [8, 0, 4, 0.8]],
    run: [[0, 0, 2, 1], [2, 0, 2, 0.7], [4, 4, 2, 0.8], [6, 0, 2, 1], [8, 0, 2, 0.7], [10, 4, 2, 0.8]],
    gallop: [0, 4, 8].flatMap((b) => [[b, 0, 2, 1], [b + 2, 0, 1, 0.7], [b + 3, 0, 1, 0.7]]),
  },
};
// Other names fall back to these when a track asks for a 4/4 line in 3/4 (and the other way round).
const BASS_ALIAS = { 12: { root8: 'run', octave: 'run', pulse16: 'run', synco: 'run', half: 'six', walk: 'root', stomp: 'root', offbeat: 'run' }, 16: { waltz: 'half', six: 'half', root: 'root8', run: 'root8' } };

// Arpeggios: which chord note comes next (0 root, 1 third, 2 fifth, 3 octave).
const ARPS = { up: [0, 1, 2, 3], down: [3, 2, 1, 0], updown: [0, 1, 2, 3, 2, 1], alberti: [0, 2, 1, 2], bounce: [0, 3, 1, 3, 2, 3] };
const ARP_DEG = [0, 2, 4, 7];
// Chord "stabs" instead of single notes: the steps the whole chord is hit on.
const STABS = {
  16: { stab: [2, 6, 10, 14], oompah: [4, 12], hits: [0, 3, 6, 8, 11, 14], pump: [0, 4, 8, 12] },
  12: { stab: [2, 6, 10], oompah: [4, 8], hits: [0, 3, 6, 9], pump: [0, 6] },
};

// Drum patterns, one string per drum: X loud, x normal, o soft.
//   k kick, s snare, h hi-hat, o open hat, c clap, t / m / l high / mid / low tom, p timpani (tuned
//   to the chord), a anvil clank, i tick, j tock, r shaker. `fill` plays in a section's last bar.
export const KITS = {
  16: {
    none: {},
    pop: { k: 'X.....x.X.......', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.', fill: 'snare' },
    rock: { k: 'X.......X.x.....', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.', fill: 'toms' },
    four: { k: 'X...X...X...X...', c: '....X.......X...', h: '..x...x...x...x.', r: 'o.o.o.o.o.o.o.o.', fill: 'snare' },
    march: { k: 'X.......X.......', s: 'x..ox.oox..ox.xx', fill: 'snare' },
    light: { k: 'X.........x.....', r: 'x.o.x.o.x.o.x.o.', i: '....x.......x...' },
    train: { k: 'X...x...X...x...', s: '..o.X.o...o.X.oo', r: 'xoxoxoxoxoxoxoxo', fill: 'snare' },
    metal: { k: 'X.xxX.xxX.xxX.xx', s: '....X.......X...', h: 'x.x.x.x.x.x.x.x.', fill: 'toms' },
    double: { k: 'XxXxXxXxXxXxXxXx', s: '....X.......X...', o: 'x...x...x...x...', fill: 'toms' },
    tribal: { k: 'X..x..x.X..x....', l: '..x...x...x.x.x.', m: '....x.......x.o.', t: '.......o.......x', r: 'x.xxx.xxx.xxx.xx', fill: 'toms' },
    half: { k: 'X.........x.....', s: '........X.......', h: 'x.x.x.x.x.x.x.x.', fill: 'snare' },
    doom: { k: 'X.......x.......', s: '........X.......', p: 'X.........x.....', fill: 'toms' },
    epic: { k: 'X..x..x.X..x..x.', s: '....X.......X.xx', p: 'X.......x.......', r: 'x.xxx.xxx.xxx.xx', fill: 'snare' },
    industrial: { k: 'X..x..X...x.X...', a: '....X.......X..x', h: 'xxoxxxoxxxoxxxox', fill: 'toms' },
    clock: { i: 'X...x...X...x...', j: '..x...x...x...x.', k: 'X.......x.x.....', s: '....o.......X...' },
    clockwork: { i: 'X...x...X...x...', j: '..x...x...x...x.', k: 'X..x..x.X..x....', s: '....X.......X.xx', p: 'X...............', fill: 'snare' },
    dnb: { k: 'X.........X.....', s: '....X..o.o..X...', h: 'x.xxx.xxx.xxx.xx', fill: 'snare' },
    trap: { k: 'X......x..x.....', c: '........X.......', h: 'x.x.x.xxx.x.xxxx', fill: 'snare' },
  },
  12: {
    none: {},
    waltz: { k: 'X...........', s: '....x...x...', r: 'x.o.x.o.x.o.' },
    six: { k: 'X.........x.', s: '......X.....', h: 'x.x.x.x.x.x.', fill: 'snare' },
    light: { k: 'X...........', r: 'x.o.o.x.o.o.', i: '......x.....' },
    tribal: { k: 'X.....x...x.', l: '..x.x...x...', m: '......X.....', r: 'xxxxxxxxxxxx', fill: 'toms' },
    metal: { k: 'X.xxX.xxX.xx', s: '......X.....', h: 'x.x.x.x.x.x.', fill: 'toms' },
    epic: { k: 'X..x..X..x..', s: '......X...xx', p: 'X.....x.....', r: 'x.xx.xx.xx.x', fill: 'snare' },
    doom: { k: 'X.....x.....', s: '......X.....', p: 'X...........', fill: 'toms' },
    clock: { i: 'X...x...x...', j: '..x...x...x.', k: 'X...........', s: '........x...' },
    clockwork: { i: 'X...x...x...', j: '..x...x...x.', k: 'X..x..X..x..', s: '......X...xx', p: 'X...........', fill: 'snare' },
  },
};
const KIT_ALIAS = { 12: { pop: 'six', rock: 'six', four: 'six', march: 'epic', train: 'six', double: 'metal', half: 'six', industrial: 'metal', dnb: 'six', trap: 'six' }, 16: { waltz: 'light', six: 'half' } };
const VEL = { X: 1, x: 0.72, o: 0.4 };
const LIGHT_DRUMS = 'hrij'; // the drums an intro or breakdown keeps

// The order of sections for each kind of track: [melody, bars, layers]. 'I' and 'X' (intro and
// breakdown) borrow A's chords and have no tune.
const ALL = 'lead bass drums pad arp';
const FORMS = {
  map: { loop: 1, list: [['I', 4, 'pad arp light'], ['A', 8, 'lead bass drums pad'], ['A', 8, `${ALL} lead2`], ['B', 8, ALL], ['A', 8, `${ALL} lead2`], ['X', 4, 'bass pad arp light'], ['C', 8, 'lead bass drums pad'], ['C', 8, `${ALL} lead2`], ['B', 8, ALL], ['A', 8, `${ALL} lead2`]] },
  menu: { loop: 1, list: [['I', 4, 'bass pad arp light'], ['A', 8, 'lead bass drums pad'], ['A', 8, `${ALL} lead2`], ['B', 8, ALL], ['C', 8, `${ALL} lead2`], ['A', 8, `${ALL} lead2`], ['X', 4, 'bass pad arp light']] },
  boss: { loop: 0, list: [['A', 8, ALL], ['A', 8, `${ALL} lead2`], ['B', 8, ALL], ['A', 8, `${ALL} lead2`]] },
  big: { loop: 0, list: [['A', 8, ALL], ['A', 8, `${ALL} lead2`], ['B', 8, ALL], ['C', 8, ALL], ['C', 8, `${ALL} lead2`], ['B', 8, ALL], ['A', 8, `${ALL} lead2`]] },
};

const onsets = (cell) => [...cell].flatMap((c, i) => (c === 'x' ? [i] : []));
const pick = (R, list) => list[Math.floor(R() * list.length)];
/** The chord note (root, third or fifth of the chord on scale step `chord`) closest to melody step `d`. */
function chordTone(d, chord) {
  let best = d;
  let gap = 99;
  for (const t of [0, 2, 4]) {
    const c = chord + t + 7 * Math.round((d - chord - t) / 7);
    const g = Math.abs(c - d);
    if (g < gap || (g === gap && c < best)) {
      gap = g;
      best = c;
    }
  }
  return best;
}

/** One step of a melody: mostly to the next note of the scale, sometimes a small jump. `bias` > 0 leans up. */
function stepFrom(R, cur, last, bias, lo, hi) {
  if (Math.abs(last) >= 3) return cur - Math.sign(last); // after a jump, step back
  const deltas = [-3, -2, -1, 0, 1, 2, 3];
  const w = [1, 3, 6, 1.2, 6, 3, 1].map((v, i) => v * (Math.sign(deltas[i]) === Math.sign(bias) ? 1.8 : 1));
  if (cur >= hi - 1) w[4] = w[5] = w[6] = 0.2;
  if (cur <= lo + 1) w[0] = w[1] = w[2] = 0.2;
  let r = R() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < 7; i++) if ((r -= w[i]) <= 0) return cur + deltas[i];
  return cur;
}

/** A two-bar idea: a rhythm for each bar and a line that rises in the first and falls in the second. */
function makeMotif(R, S, cells, chord, lo, hi) {
  const c1 = pick(R, cells);
  const c2 = pick(R, cells.filter((c) => c !== c1));
  let cur = chordTone(lo + 3 + Math.floor(R() * 4), chord);
  let last = 0;
  const notes = [];
  [c1, c2].forEach((cell, bar) => {
    const on = onsets(cell);
    on.forEach((s, i) => {
      if (notes.length) {
        const next = stepFrom(R, cur, last, bar ? -1 : 1, lo, hi);
        last = next - cur;
        cur = next;
      }
      notes.push({ s: bar * S + s, d: cur, l: (on[i + 1] ?? S) - s });
    });
  });
  return { notes, cells: [c1, c2] };
}

/** The same idea with a new ending. */
function vary(R, m, lo, hi) {
  const notes = m.notes.map((n) => ({ ...n }));
  const from = Math.max(1, notes.length - 3);
  let cur = notes[from - 1].d;
  let last = 0;
  for (let i = from; i < notes.length; i++) {
    const next = stepFrom(R, cur, last, R() < 0.5 ? 1 : -1, lo, hi);
    last = next - cur;
    cur = notes[i].d = next;
  }
  return notes;
}

/** An eight-bar tune over `prog` (a chord per bar): idea, idea again, something new, and a way home. */
function makeTune(R, spec, prog, dens, reg) {
  const S = spec.meter;
  const cells = CELLS[S][dens];
  const lo = -3 + reg;
  const hi = 8 + reg;
  const m = makeMotif(R, S, cells, prog[0], lo, hi);
  const out = [];
  const put = (notes, bar, shift = 0) => notes.forEach((n) => out.push({ s: n.s + bar * S, d: n.d + shift, l: n.l }));
  put(m.notes, 0);
  put(vary(R, m, lo, hi), 2);
  if (R() < 0.5) put(m.notes, 4, m.notes[0].d + 2 > hi - 2 ? -2 : 2); // the idea, a third higher (or lower)
  else put(makeMotif(R, S, CELLS[S][CALMER[dens]], prog[4], lo, hi).notes, 4);
  // Bar 7 walks toward home, bar 8 holds the last note.
  let cur = out[out.length - 1].d;
  const home = 7 * Math.round(cur / 7);
  const on = onsets(m.cells[0]);
  on.forEach((s, i) => {
    cur += cur === home ? (i % 2 ? -1 : 1) : Math.sign(home - cur);
    out.push({ s: 6 * S + s, d: cur, l: (on[i + 1] ?? S) - s });
  });
  out.push({ s: 7 * S, d: chordTone(cur, prog[7]), l: Math.round(S * 0.75), end: true });

  // Notes on strong beats and long notes are moved onto the chord, the rest pass between them.
  const strong = S === 16 ? 8 : 6;
  const allowed = spec.mel;
  for (const n of out) {
    const chord = prog[Math.floor(n.s / S)];
    if (n.end || n.s % strong === 0 || n.l >= S / 2) n.d = chordTone(n.d, chord);
    else if (allowed && !allowed.includes(((n.d % 7) + 7) % 7)) n.d += allowed.includes((((n.d - 1) % 7) + 7) % 7) ? -1 : 1;
    while (n.d > hi + 2) n.d -= 7;
    while (n.d < lo - 2) n.d += 7;
  }
  return out;
}

/** Fills a track recipe (already merged with its style) into sections of timed notes. */
export function compose(spec) {
  const S = spec.meter ?? 16;
  spec = { ...spec, meter: S };
  const scale = SCALES[spec.scale];
  const pc = PC[spec.key];
  const leadBase = (pc <= 6 ? 60 : 48) + pc + 12 * (spec.oct ?? 0);
  const bassBase = (pc <= 4 ? 36 : 24) + pc;
  const midBase = leadBase - 12;
  const note = (base, d) => base + 12 * Math.floor(d / 7) + scale[((d % 7) + 7) % 7];
  const R = rng(hash(`${spec.id}:${spec.seed ?? 0}`));
  const prog8 = (p) => [...Array(8).keys()].map((i) => p[i % p.length]);
  const progs = { A: prog8(spec.A), B: prog8(spec.B ?? spec.A), C: prog8(spec.C ?? spec.A) };
  progs.I = progs.X = progs.A;
  const dens = spec.dens ?? 'mid';
  const tunes = {
    A: makeTune(R, spec, progs.A, dens, 0),
    B: makeTune(R, spec, progs.B, CALMER[dens], 2),
    C: makeTune(R, spec, progs.C, dens, 1),
  };
  const bassLine = BASS[S][spec.bass?.[1]] ?? BASS[S][BASS_ALIAS[S][spec.bass?.[1]]] ?? BASS[S].drone;
  const kit = KITS[S][spec.kit] ?? KITS[S][KIT_ALIAS[S][spec.kit]] ?? {};
  const form = FORMS[spec.form ?? 'map'];

  const sections = form.list.map(([name, bars, layerList], idx) => {
    const on = new Set(layerList.split(' '));
    const prog = progs[name];
    const sec = { name, bars, steps: bars * S, chords: prog.slice(0, bars), lead: [], lead2: [], bass: [], arp: [], pad: [], drums: [] };
    const fixed = spec.tune?.[name];
    // Lead
    if (on.has('lead') && fixed?.lead) {
      for (let b = 0; b < bars; b++) fixed.lead.forEach((m, s) => m && sec.lead.push({ s: b * S + s, m, l: 1.6, v: 1 }));
    } else if (on.has('lead') && tunes[name]) {
      for (const n of tunes[name]) sec.lead.push({ s: n.s, m: note(leadBase, n.d), l: Math.min(n.l, S / 2) * 0.92, v: n.s % 4 ? 0.85 : 1 });
    }
    if (on.has('lead2')) for (const n of sec.lead) sec.lead2.push({ ...n, m: n.m + (n.m > 76 ? -12 : 12), v: n.v * 0.5 });
    for (let b = 0; b < bars; b++) {
      const chord = prog[b];
      const low = chord >= 5 ? chord - 7 : chord; // the bass dips under the keynote for the top chords
      const next = prog[(b + 1) % prog.length];
      // Bass
      if (on.has('bass') && fixed?.bass) fixed.bass.forEach((m, s) => m && sec.bass.push({ s: b * S + s, m, l: 1.8, v: 1 }));
      else if (on.has('bass') && spec.bass) {
        for (const [s, off, l, v] of bassLine) {
          const d = off === 'ap' ? (next >= 5 ? next - 7 : next) - 1 : low + off;
          sec.bass.push({ s: b * S + s, m: note(bassBase, d), l: l * 0.9, v });
        }
      }
      // Arpeggio or chord stabs
      if (on.has('arp') && spec.arp) {
        const [, pattern, rate = 2] = spec.arp;
        const stab = STABS[S][pattern];
        if (stab) for (const s of stab) for (const t of [0, 2, 4]) sec.arp.push({ s: b * S + s, m: note(midBase, chord + t), l: 1.5, v: 0.8 });
        else {
          const seq = ARPS[pattern] ?? ARPS.up;
          for (let s = 0, i = b * (S / rate); s < S; s += rate, i++) sec.arp.push({ s: b * S + s, m: note(midBase, chord + ARP_DEG[seq[i % seq.length]]), l: rate * 0.9, v: s % 4 ? 0.75 : 1 });
        }
      }
      // Pad: the chord held for the bar
      if (on.has('pad') && spec.pad) {
        const tones = spec.padChord === 'power' ? [0, 4, 7] : [0, 2, 4];
        for (const t of tones) sec.pad.push({ s: b * S, m: note(midBase, low + t), l: S, v: 1 });
      }
      // Drums
      const light = on.has('light');
      if (on.has('drums') || light) {
        const fill = !light && b === bars - 1 && kit.fill;
        for (const [drum, line] of Object.entries(kit)) {
          if (drum === 'fill' || (light && !LIGHT_DRUMS.includes(drum))) continue;
          for (let s = 0; s < S; s++) {
            if (fill && s >= S / 2 && 'shctml'.includes(drum)) continue; // the fill takes over
            const v = VEL[line[s]];
            if (v) sec.drums.push({ s: b * S + s, k: drum, v, m: note(bassBase, low) });
          }
        }
        if (fill) {
          for (let s = S / 2; s < S; s++) {
            const t = (s - S / 2) / (S / 2);
            if (fill === 'snare') sec.drums.push({ s: b * S + s, k: 's', v: 0.4 + 0.6 * t });
            else if (s % 2 === 0 || t > 0.7) sec.drums.push({ s: b * S + s, k: t < 0.34 ? 't' : t < 0.67 ? 'm' : 'l', v: 0.8 });
          }
        }
        if (b === 0 && !light) sec.drums.push({ s: 0, k: 'crash', v: idx === 0 ? 1 : 0.6 });
      }
    }
    return sec;
  });
  return { id: spec.id, bpm: spec.bpm, meter: S, swing: spec.swing ?? 0, sections, loop: form.loop, spec };
}
