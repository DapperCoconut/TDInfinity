// Halloween rewards (2026-11-11 spec): what beating each night and each contract gives, and the
// Halloween Battle Pass, filled with Candy Corn from any game. Plain data: the profile keeps what
// you've earned (profile.js `hw`), the lobby draws the Halloween panel (lobby.js renderHalloween).

/** Beating a night of the Halloween Event (winning it on that map) gives this tower. */
export const NIGHT_REWARDS = [
  { map: 'cemetery', name: 'Night 1', tower: 'graveyard' },
  { map: 'carnival', name: 'Night 2', tower: 'jester' },
  { map: 'nightmare', name: 'Night 3', tower: 'warlock' },
];

/**
 * Finishing a contract gives this tower or variant. `call` (Contract 4, Mysterious Call) isn't
 * built yet, so its reward can't be earned until it is.
 */
export const CONTRACT_REWARDS = { lastLaugh: 'jesterChaos', inhuman: 'ghostbusterLure', liminal: 'relic', call: 'ghostbuster' };
/** Every contract finished gives this. */
export const ALL_CONTRACTS_REWARD = 'exterminator';

/**
 * Candy Corn for one game: 1 per wave cleared, 10 more for a win, twice as much in the Halloween
 * modes (the event and the contracts' own modes). Guessed numbers.
 */
export const CANDY = { perWave: 1, win: 10, eventMult: 2 };
export const candyFor = (waves, win, isEvent) => Math.round((waves * CANDY.perWave + (win ? CANDY.win : 0)) * (isEvent ? CANDY.eventMult : 1));

/**
 * The Battle Pass, cheapest first. `at`: the total Candy Corn earned that unlocks it (the gaps grow
 * as you go; guessed numbers). A reward is one of:
 *   tower: a tower or a variant (form) to own,  credits: credits,
 *   map: an event map you can then play in any mode,  mode: a Halloween mode to play any time.
 */
export const PASS = [
  { at: 25, tower: 'scarecrow' },
  { at: 60, credits: 500 },
  { at: 100, tower: 'executioner' },
  { at: 150, map: 'cemetery' },
  { at: 210, tower: 'knifer' },
  { at: 280, tower: 'hayes' },
  { at: 360, tower: 'kniferSlasher' },
  { at: 450, map: 'carnival' },
  { at: 550, tower: 'hallowboomer' },
  { at: 660, tower: 'punkbuster' },
  { at: 780, tower: 'harvester' },
  { at: 910, map: 'nightmare' },
  { at: 1050, tower: 'starCannon' },
  { at: 1200, tower: 'hallowboomerPunk' },
  { at: 1360, mode: 'liminal', name: 'Infinite mode', desc: 'Play the endless Backrooms any time' },
  { at: 1530, tower: 'eldritch' },
  { at: 1710, map: 'backrooms' },
  { at: 1900, mode: 'remix', name: 'Halloween Remix', desc: '50 waves with every Halloween enemy and all three final bosses' },
];
