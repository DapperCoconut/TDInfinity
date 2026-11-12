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
