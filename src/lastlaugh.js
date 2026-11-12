// Contracts: quests from the Halloween panel. Accept one and it changes the games it fits.
// Contract 1, Last Laugh (2026-11-11 spec): on Shattered Court a little jester stands on the grass in
// the middle. Pay to spin its wheel: red (24 times) brings more enemies, and the first red one opens
// the board (enemies take the shortest way to the base, and fences block tiles). The 25th spin lands
// on yellow and the jester leaves. Then the mode's final boss is replaced by the JESTER: beat him to
// finish the contract. Plain data: the Sim code is in sim/parts/contract.js.

export const CONTRACTS = {
  lastLaugh: {
    name: 'Last Laugh',
    icon: '🃏',
    color: '#8e24aa',
    map: 'court', // only games on this map
    pic: 'jesterChaos', // the tower whose portrait is on the card
    desc: 'Play any mode on Shattered Court. Spin the little jester\'s wheel on the grass 25 times, then beat the JESTER in place of the final boss.',
    // The wheel. Every number here is a guess (the spec gives none).
    spins: 25, // the last one lands on yellow
    spinCost: 100, // the first spin, times the mode's cash multiplier
    spinGrow: 1.12, // each spin costs this much more than the one before
    extra: [2, 0.5], // a red spin sends 2 + 0.5 per spin so far more enemies from the wave
    fenceCost: 50, // one fence, times the mode's cash multiplier
    boss: 'llJester',
    bossHp: 2, // his health is the final boss's he replaces, times this
    boost: { at: 0.25, dmg: 2, rate: 1.5 }, // once he is 25% of the way: towers hit 2x as hard and 1.5x as fast
  },
  // Contract 2, Inhuman (2026-11-11 spec): the Multiplayer button turns red, then the buttons that
  // get you to 1 seat and 1 bot (usually not allowed), then Find a Game. That starts a Versus game
  // against one dark, glitchy bot. Its towers are stronger, its base has more health, and the
  // enemies it sends you are glitchy (they jump down the path) and tougher. Beat it to finish.
  // Played offline in your own browser (net.js offline). The Sim code is in sim/versus.js.
  inhuman: {
    name: 'Inhuman',
    icon: '👾',
    color: '#37474f',
    pvp: true, // not a map's contract: it is its own Versus game
    pic: 'hacker',
    desc: 'Follow the red buttons in Multiplayer, all the way down to 1 seat and 1 bot. Then beat the glitchy bot in Versus.',
    botName: '👾 N̷U̷L̷L̷',
    // Every number here is a guess (the spec gives none).
    baseHp: 2, // its base has this many times the normal health
    towerDmg: 1.5, // its towers hit this much harder...
    towerRate: 1.25, // ... and this much faster
    sendHp: 1.75, // the enemies it sends you have this much more health
    jump: [0.35, 0.8], // they stand still, then jump to where they would have walked, every 0.35-0.8 s
  },
  // Contract 3, Liminal (2026-11-11 spec): on Sunken Canyon the giant pit in the middle turns
  // glitchy, and walking into it takes you to the Backrooms: an endless mode (DIFFICULTIES.liminal).
  // Random enemies from every mode, tougher the further you get; some come mutated (twisted shapes,
  // more health). The rooms shift every 25 waves. Every 10 waves you pick 1 of 3 of your own towers
  // to add to your loadout (better ones later on), each with a random blessing and curse. Up to 10
  // towers. Surviving 30 waves finishes the contract, but it keeps going.
  // The Sim code is in sim/parts/liminal.js, the pit and the picks in game/liminal.js.
  liminal: {
    name: 'Liminal',
    icon: '🟨',
    color: '#b59a2c',
    pit: true, // not a map's contract: it opens Sunken Canyon's pit
    pic: 'hacker',
    desc: 'Play on Sunken Canyon and walk into the glitchy pit in the middle. Survive 30 waves in the endless Backrooms.',
    goal: 30, // waves to survive
    // Every number below is a guess (the spec gives none).
    shiftEvery: 25, // the rooms shift after this many waves
    pickEvery: 10, // a new tower to pick after this many waves
    maxTowers: 10, // loadout size in the Backrooms
    // A wave's total enemy health: base x grow^wave, growing slower (late) after `lateFrom`.
    budget: { base: 110, grow: 1.12, late: 1.09, lateFrom: 40 }, // (2026-11-11: was 150, 1.2, 1.15 from 30: too hard)
    perEnemy: 18, // a wave has about this many enemies' worth of health (picks how tough the kinds are)
    groups: [1, 3], // kinds of enemy in a wave
    maxCount: 30, // most of one kind in a wave (more health each instead)
    // Mutated enemies: this much more health; the chance grows each wave up to `max`.
    mutant: { hp: 2, chance: 0.02, grow: 0.004, max: 0.35 },
    // Blessings and curses on picked towers: [smallest, biggest] change (0.2 = 20%).
    bless: { dmg: [0.15, 0.4], rate: [0.1, 0.3], range: [0.1, 0.3], cost: [0.1, 0.3] },
    curse: { dmg: [0.1, 0.3], rate: [0.1, 0.25], range: [0.1, 0.25], cost: [0.15, 0.4] },
  },
};
export const CONTRACT_KEYS = Object.keys(CONTRACTS);

/** The contract a game on `map` plays: the first accepted one made for that map, or null. */
export function contractFor(accepted, map) {
  if (!Array.isArray(accepted) || !map) return null;
  const base = String(map).split(':')[0];
  return accepted.find((k) => CONTRACTS[k]?.map === base) ?? null;
}

// The Jester (guessed numbers). hp is only used if he ever spawns outside the contract.
const NEW = {
  llJester: { name: 'Jester', hp: 200000, speed: 2.6, reward: 0, damage: 1e6, scale: 3.4, model: 'llJester', boss: true, freezeImmune: true,
    bar: true, barName: 'JESTER', barSub: 'The last laugh is his',
    jester: { summon: { every: 9, n: [2, 4] }, dice: { every: 5, n: [1, 3], radius: 6, pct: 0.04 } },
    intro: '🃏 CONTRACT BOSS: the JESTER! He calls in random enemies and throws exploding dice. Once he is a quarter of the way down your path, your towers get a huge boost!' },
};

export function addLastLaughEnemies(ENEMIES) {
  for (const [k, d] of Object.entries(NEW)) ENEMIES[k] = d;
}
