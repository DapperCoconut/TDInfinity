// Every music track in the game: three for the menus, one per map and one per boss.
//
// A track is a recipe, not a recording: a style (which instruments and drums), a tempo, a key and
// scale, and the chords of its sections (A, B and C; numbers are scale steps, 0 = the keynote's
// chord). compose.js writes the tune from that and the track's name, so every track has its own
// melody and always plays the same way. To change how a track feels, edit its line here.
//
//   bpm    beats per minute            key / scale   see SCALES in compose.js
//   A B C  chords, one per bar (4 or 8; B and C default to A)
//   lead   instrument of the tune      bass  [instrument, line]     arp  [instrument, pattern, steps per note]
//   pad    instrument holding chords   kit   drum pattern           dens  calm | mid | busy
//   meter  12 for a waltz (16 = 4/4)   swing 0-0.3                  echo  0-0.5
//   form   map | menu | boss | big (a longer boss track)            mel   scale steps the tune may use
//   gain   loudness trim               oct   -1 / 1 moves the tune an octave
//   drumVol  loudness of the drums (1 = normal)
import { ENEMIES } from '../config.js';
import { hash } from './compose.js';

const PENTA_MAJOR = [0, 1, 2, 4, 5];
const PENTA_MINOR = [0, 2, 3, 4, 6];

export const STYLES = {
  chip: { lead: 'pulse', bass: ['tri', 'octave'], arp: ['pluck', 'alberti', 2], pad: 'soft', kit: 'pop', dens: 'mid', echo: 0.2 },
  anthem: { lead: 'brass', bass: ['tri', 'root8'], arp: ['pluck', 'up', 2], pad: 'strings', kit: 'march', dens: 'mid', echo: 0.2 },
  calm: { lead: 'flute', bass: ['tri', 'half'], arp: ['pluck', 'updown', 2], pad: 'soft', kit: 'light', dens: 'calm', echo: 0.35 },
  wave: { lead: 'sawLead', bass: ['sawBass', 'octave'], arp: ['pluck', 'up', 1], pad: 'strings', kit: 'four', dens: 'mid', echo: 0.3 },
  western: { lead: 'twang', bass: ['tri', 'walk'], arp: ['twang', 'oompah'], pad: null, kit: 'train', dens: 'mid', swing: 0.18, echo: 0.25, gain: 1.15 },
  baroque: { lead: 'harpsi', bass: ['tri', 'walk'], arp: ['harpsi', 'alberti', 1], pad: 'organ', kit: 'light', dens: 'busy', echo: 0.3 },
  heavy: { lead: 'sawLead', bass: ['sawBass', 'gallop'], arp: null, pad: 'power', padChord: 'power', kit: 'metal', drumVol: 0.75, dens: 'busy', echo: 0.15 },
  stomp: { lead: 'brass', bass: ['tri', 'stomp'], arp: ['stab', 'oompah'], pad: 'power', padChord: 'power', kit: 'rock', dens: 'mid', echo: 0.15 },
  tribal: { lead: 'brass', bass: ['sub', 'synco'], arp: ['pluck', 'hits'], pad: 'dark', kit: 'tribal', drumVol: 0.85, dens: 'mid', echo: 0.2 },
  spooky: { meter: 12, lead: 'bell', bass: ['tri', 'waltz'], arp: ['organ', 'oompah'], pad: 'dark', kit: 'waltz', dens: 'mid', echo: 0.4 },
  circus: { meter: 12, lead: 'pulse', bass: ['tri', 'waltz'], arp: ['organ', 'oompah'], pad: null, kit: 'waltz', dens: 'busy', echo: 0.2 },
  night: { lead: 'bell', bass: ['sub', 'half'], arp: ['pluck', 'updown', 2], pad: 'strings', kit: 'light', dens: 'calm', echo: 0.4 },
  industrial: { lead: 'square', bass: ['sawBass', 'pulse16'], arp: ['stab', 'hits'], pad: 'dark', kit: 'industrial', dens: 'mid', echo: 0.2 },
  epic: { lead: 'brass', bass: ['sawBass', 'root8'], arp: ['stab', 'hits'], pad: 'strings', kit: 'epic', dens: 'mid', echo: 0.25 },
  void: { lead: 'eerie', bass: ['sub', 'drone'], arp: ['bell', 'down', 4], pad: 'dark', kit: 'doom', dens: 'calm', echo: 0.45 },
  clock: { lead: 'bell', bass: ['tri', 'synco'], arp: ['pluck', 'updown', 1], pad: 'soft', kit: 'clock', drumVol: 0.8, dens: 'mid', echo: 0.3 },
  dnb: { lead: 'sawLead', bass: ['sub', 'synco'], arp: ['pluck', 'bounce', 1], pad: 'dark', kit: 'dnb', dens: 'mid', echo: 0.25 },
  holy: { lead: 'flute', bass: ['sub', 'half'], arp: ['bell', 'up', 2], pad: 'strings', kit: 'half', dens: 'mid', echo: 0.4 },
  sneaky: { lead: 'pluck', bass: ['tri', 'walk'], arp: ['stab', 'stab'], pad: null, kit: 'light', dens: 'mid', swing: 0.2, echo: 0.3, oct: -1, gain: 1.2 },
};

// Halloween Jack's own riff (the loop he has had since the event was added), note by note.
const JACK_BELL = [81, 0, 84, 83, 82, 0, 80, 0, 81, 84, 87, 0, 86, 84, 83, 82];
const JACK_BASS = [45, 0, 45, 0, 48, 0, 45, 0, 44, 0, 44, 0, 47, 0, 43, 0];

const t = (style, bpm, key, scale, A, B, more) => ({ style, bpm, key, scale, A, B, ...more });

export const MENU_TRACKS = ['menu1', 'menu2', 'menu3'];

export const TRACKS = {
  // ---------------------------------------------------------------- menus
  menu1: t('anthem', 112, 'C', 'major', [0, 4, 5, 3], [3, 4, 5, 2, 3, 4, 0, 0], { C: [5, 3, 0, 4], form: 'menu', name: 'Hold the Path' }),
  menu2: t('calm', 92, 'F', 'major', [0, 5, 3, 4], [3, 0, 3, 4], { C: [5, 2, 3, 0], form: 'menu', mel: PENTA_MAJOR, name: 'Castle at Dawn' }),
  menu3: t('wave', 118, 'A', 'minor', [0, 5, 2, 6], [5, 6, 0, 0], { C: [3, 5, 0, 6], form: 'menu', name: 'Infinity Run' }),

  // ---------------------------------------------------------------- maps
  'map:meadow': t('chip', 120, 'G', 'major', [0, 3, 4, 0], [5, 3, 0, 4], { C: [0, 4, 5, 3], mel: PENTA_MAJOR, name: 'Sunny Meadow' }),
  'map:canyon': t('western', 100, 'E', 'dorian', [0, 3, 0, 6], [3, 0, 3, 4], { C: [0, 0, 6, 3], name: 'Sunken Canyon' }),
  'map:nexus': t('wave', 124, 'F#', 'minor', [0, 5, 2, 6], [5, 6, 0, 0], { C: [0, 2, 5, 4], name: 'Twilight Nexus' }),
  'map:court': t('baroque', 132, 'D', 'harmonic', [0, 3, 4, 0], [5, 2, 3, 4], { C: [0, 4, 0, 4, 3, 0, 4, 0], name: 'Shattered Court' }),
  'map:ember': t('tribal', 132, 'E', 'phrygian', [0, 1, 0, 6], [5, 6, 0, 0], { C: [0, 0, 1, 0], name: 'Ember Keep' }),
  'map:rampart': t('night', 96, 'B', 'minor', [0, 5, 3, 6], [3, 6, 0, 0], { C: [5, 3, 0, 4], name: 'Midnight Rampart' }),
  'map:brook': t('calm', 100, 'D', 'major', [0, 5, 3, 4], [3, 0, 4, 5], { C: [0, 3, 0, 4], mel: PENTA_MAJOR, arp: ['pluck', 'alberti', 2], name: 'Brook Hollow' }),
  'map:crossing': t('anthem', 116, 'A', 'mixo', [0, 6, 3, 0], [3, 6, 0, 0], { C: [0, 3, 6, 3], kit: 'rock', name: 'Sunset Crossing' }),
  'map:cemetery': t('spooky', 138, 'C', 'harmonic', [0, 0, 3, 4], [5, 3, 4, 4, 5, 3, 4, 0], { C: [0, 5, 3, 4], name: 'Lantern Hill Cemetery' }),
  'map:carnival': t('spooky', 150, 'A', 'harmonic', [0, 3, 0, 4], [5, 4, 3, 4, 5, 3, 4, 0], { C: [0, 3, 4, 0], arp: ['pluck', 'alberti', 2], name: 'Halloween Night 2' }),
  'map:rig': t('industrial', 126, 'G', 'minor', [0, 6, 5, 6], [3, 5, 6, 0], { C: [0, 0, 5, 6], name: 'Rig Point' }),

  // ---------------------------------------------------------------- bosses: first game, Easy, Medium
  'boss:boss': t('stomp', 120, 'E', 'minor', [0, 0, 5, 6], [3, 3, 5, 4]),
  'boss:kingSlime': t('chip', 148, 'C', 'dorian', [0, 3, 0, 6], [5, 6, 0, 0], { C: [3, 0, 3, 4], form: 'big' }),
  'boss:mPredator': t('dnb', 160, 'F', 'minor', [0, 0, 5, 6], [3, 5, 6, 0]),
  'boss:mEradicator': t('industrial', 140, 'D', 'minor', [0, 5, 6, 0], [3, 3, 5, 6], { C: [0, 6, 5, 4], form: 'big', lead: 'brass' }),
  // Hard (the Fallen)
  'boss:fJester': t('circus', 168, 'Eb', 'harmonic', [0, 4, 0, 4, 3, 0, 4, 0], [5, 3, 4, 4]),
  'boss:fHonorGuard': t('epic', 126, 'G', 'harmonic', [0, 6, 5, 4], [5, 6, 0, 0], { kit: 'march' }),
  'boss:fKing': t('epic', 144, 'D', 'harmonic', [0, 5, 3, 4], [5, 6, 0, 4], { C: [3, 0, 4, 0], form: 'big' }),
  // Expert
  'boss:xRebirther': t('night', 110, 'F#', 'phrygian', [0, 1, 0, 6], [5, 6, 0, 0], { kit: 'half', lead: 'eerie' }),
  'boss:xDeathAngel': t('holy', 132, 'C#', 'harmonic', [0, 5, 3, 4], [5, 2, 3, 4], { kit: 'rock' }),
  'boss:xBeholder': t('clock', 138, 'A', 'harmonic', [0, 3, 6, 2], [5, 3, 4, 4], { C: [0, 6, 5, 4], form: 'big', kit: 'clockwork' }),
  // Insane
  'boss:iBerserker': t('heavy', 176, 'E', 'minor', [0, 0, 5, 6], [3, 5, 6, 6]),
  'boss:iBoltmaster': t('wave', 164, 'B', 'minor', [0, 6, 5, 6], [5, 6, 0, 0], { kit: 'dnb' }),
  'boss:iOverseer': t('industrial', 132, 'C', 'minor', [0, 0, 6, 5], [3, 5, 6, 0]),
  'boss:iAvantGuard': t('epic', 150, 'F', 'minor', [0, 5, 6, 0], [3, 6, 5, 4], { kit: 'rock' }),
  'boss:iVanguard': t('heavy', 160, 'A', 'phrygian', [0, 1, 0, 6], [5, 6, 0, 0], { kit: 'double' }),
  'boss:iArchangel': t('holy', 140, 'E', 'lydian', [0, 1, 0, 4], [5, 1, 4, 0]),
  'boss:iCorrupted': t('dnb', 136, 'Bb', 'phrygian', [0, 1, 6, 0], [5, 6, 1, 0], { kit: 'trap', lead: 'square' }),
  'boss:iOverlord': t('epic', 152, 'C', 'harmonic', [0, 6, 5, 4], [3, 0, 4, 0], { C: [5, 6, 0, 0], form: 'big', bass: ['sawBass', 'gallop'] }),
  // Void
  'boss:vBoss1': t('stomp', 112, 'A', 'minor', [0, 6, 0, 6], [5, 6, 0, 0], { lead: 'pulse' }),
  'boss:vNecro': t('spooky', 150, 'G', 'harmonic', [0, 3, 4, 0], [5, 3, 4, 4]),
  'boss:vBoss2': t('stomp', 96, 'D', 'minor', [0, 0, 3, 0], [5, 5, 6, 6], { kit: 'doom' }),
  'boss:vHiddenBoss': t('sneaky', 126, 'F#', 'harmonic', [0, 3, 0, 4], [5, 4, 5, 4]),
  'boss:vBoss3': t('wave', 150, 'G', 'dorian', [0, 3, 0, 3], [6, 3, 0, 0], { lead: 'pulse' }),
  'boss:vBoss4': t('heavy', 138, 'C#', 'minor', [0, 5, 0, 6], [3, 5, 6, 0], { kit: 'industrial' }),
  'boss:vNecroBoss': t('spooky', 160, 'D', 'harmonic', [0, 5, 3, 4], [3, 0, 4, 0], { kit: 'epic', lead: 'organ' }),
  'boss:vGuardian': t('epic', 132, 'Eb', 'minor', [0, 3, 5, 6], [5, 6, 0, 0], { kit: 'doom' }),
  'boss:vFalseVoid': t('void', 100, 'C', 'phrygian', [0, 1, 0, 6], [5, 6, 0, 1], { C: [0, 0, 5, 6], form: 'big' }),
  'boss:vVoid': t('epic', 128, 'C#', 'phrygDom', [0, 1, 0, 6], [3, 1, 0, 0], { C: [0, 6, 1, 0], form: 'big', bass: ['sawBass', 'gallop'], pad: 'dark', arp: ['bell', 'down', 2] }),
  // Hardcore
  'boss:thDemise': t('void', 120, 'Ab', 'minor', [0, 5, 6, 0], [3, 5, 6, 6], { C: [0, 2, 5, 6], form: 'big', kit: 'trap' }),
  'boss:tbJack': t('spooky', 132, 'A', 'harmonic', [0, 3, 0, 4], [5, 3, 4, 4], { lead: 'organ' }),
  'boss:vcCrystalian': t('clock', 126, 'B', 'lydian', [0, 1, 0, 4], [5, 4, 1, 0], { kit: 'half' }),
  'boss:vcVindicator': t('heavy', 148, 'D', 'phrygian', [0, 1, 0, 1], [5, 6, 0, 0]),
  'boss:vcSoulStealer': t('night', 124, 'F', 'harmonic', [0, 3, 4, 0], [5, 6, 4, 4], { C: [0, 6, 5, 4], form: 'big', kit: 'epic', lead: 'eerie', dens: 'mid' }),
  'boss:vcReaver': t('heavy', 156, 'E', 'phrygDom', [0, 1, 0, 6], [3, 1, 0, 0], { C: [0, 0, 1, 1], form: 'big', kit: 'double' }),
  'boss:vcCaster': t('void', 116, 'Bb', 'minor', [0, 5, 2, 6], [3, 6, 0, 0], { C: [5, 6, 0, 0], form: 'big', kit: 'half', arp: ['bell', 'up', 2], dens: 'mid' }),
  'boss:txJager': t('industrial', 144, 'A', 'harmonic', [0, 5, 6, 4], [3, 0, 4, 0], { lead: 'brass' }),
  'boss:txApex': t('dnb', 170, 'F#', 'minor', [0, 0, 5, 6], [3, 6, 5, 4], { C: [0, 2, 5, 6], form: 'big' }),
  'boss:txCloneI': t('wave', 140, 'Eb', 'minor', [0, 6, 0, 5], [3, 5, 6, 0], { kit: 'trap' }),
  'boss:txCloneII': t('wave', 152, 'Ab', 'dorian', [0, 3, 6, 0], [5, 3, 0, 0], { kit: 'dnb', lead: 'square' }),
  'boss:txEmperor': t('epic', 158, 'D', 'harmonic', [0, 5, 6, 4], [3, 4, 5, 4], { C: [0, 2, 3, 4], form: 'big', bass: ['sawBass', 'gallop'], kit: 'industrial' }),
  'boss:ruBerserker': t('heavy', 150, 'G', 'minor', [0, 6, 5, 6], [3, 5, 6, 0], { meter: 12 }),
  'boss:ruCysian': t('wave', 158, 'C#', 'minor', [0, 5, 6, 0], [3, 6, 5, 5]),
  'boss:ruGrandEye': t('void', 118, 'F', 'hungarian', [0, 5, 4, 0], [5, 4, 0, 0], { C: [0, 0, 5, 4], form: 'big', kit: 'tribal', dens: 'mid' }),
  'boss:ruChronos': t('clock', 146, 'B', 'harmonic', [0, 3, 6, 2], [5, 3, 4, 4], { C: [0, 5, 3, 4], form: 'big', kit: 'clockwork', lead: 'brass', arp: ['bell', 'updown', 1] }),
  // Halloween
  'boss:hwReaper': t('night', 100, 'E', 'harmonic', [0, 3, 0, 4], [5, 3, 4, 0], { kit: 'half', lead: 'organ' }),
  'boss:hwDemon': t('heavy', 180, 'G', 'phrygian', [0, 1, 0, 6], [5, 6, 0, 0], { kit: 'double' }),
  'boss:hwJack': t('spooky', 88, 'A', 'harmonic', [0], [3, 0, 4, 0], { C: [5, 3, 4, 4], form: 'big', meter: 16, kit: 'four', bass: ['sawBass', 'root8'], arp: ['organ', 'stab'], tune: { A: { lead: JACK_BELL, bass: JACK_BASS } } }),
};

// A boss's other shapes share its track: Hardcore's copies (hcFKing = fKing), second phases
// (iBerserkerBare = iBerserker) and the Beholder inside its Field.
const FAMILY = { xBeholderField: 'xBeholder' };
for (const [key, def] of Object.entries(ENEMIES)) if (def.phase2) FAMILY[def.phase2] = key;
/** The enemy type whose boss track `type` plays. */
export function bossFamily(type) {
  if (type.startsWith('hc')) {
    const src = type[2].toLowerCase() + type.slice(3);
    if (ENEMIES[src]) type = src;
  }
  for (let i = 0; i < 4 && FAMILY[type]; i++) type = FAMILY[type];
  return type;
}

// A boss or map added later, without a line above, still gets a track of its own: its style,
// tempo, key and chords are picked from its name.
const AUTO_BOSS = ['heavy', 'epic', 'industrial', 'dnb', 'stomp', 'wave'];
const AUTO_MAP = ['chip', 'calm', 'anthem', 'night', 'wave'];
const AUTO_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Eb', 'F#'];
const AUTO_PROGS = [[0, 5, 6, 0], [0, 6, 5, 6], [0, 3, 5, 4], [0, 0, 5, 6], [0, 5, 2, 6]];
function auto(id) {
  const h = hash(id);
  const boss = id.startsWith('boss:');
  const styles = boss ? AUTO_BOSS : AUTO_MAP;
  return t(styles[h % styles.length], (boss ? 120 : 96) + ((h >>> 4) % 9) * 5, AUTO_KEYS[(h >>> 8) % AUTO_KEYS.length], 'minor',
    AUTO_PROGS[(h >>> 12) % AUTO_PROGS.length], AUTO_PROGS[(h >>> 16) % AUTO_PROGS.length]);
}

/** The full recipe of track `id` ('menu1', 'map:<key>', 'boss:<enemy type>'): its style with the track's own settings on top. */
export function trackSpec(id) {
  const own = TRACKS[id] ?? auto(id);
  const form = own.form ?? (id.startsWith('boss:') ? 'boss' : 'map');
  return { ...STYLES[own.style], ...own, form, id };
}

/** What to call a track in the jukebox. */
export function trackName(id) {
  if (TRACKS[id]?.name) return TRACKS[id].name;
  const type = id.split(':')[1];
  return ENEMIES[type]?.name ?? id;
}
