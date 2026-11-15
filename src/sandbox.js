// Sandbox mode (2026-11-15 user spec): no tower limits, endless cash, a base that can't fall, and a
// bar under the health bar to summon any wave of any mode, a Dummy, or the Dummy King.
// Its enemies are here (sb*). How they act: src/sim/parts/sandbox.js. How they look:
// src/newmodels/sandbox.js. Guessed numbers are listed in the memory notes.

const NEW = {
  // A practice dummy: walks slowly, can't be hurt for real (it heals right back), and can't hurt
  // the base (it goes back to the start instead).
  sbDummy: { name: 'Dummy', hp: 1e9, speed: 1, reward: 0, damage: 0, scale: 1.2, fixedHp: true, dummy: true, rewind: true,
    sb: 'dummy', skin: 0xf5f5f5, shirt: 0xf5f5f5, pants: 0xf5f5f5, face: 'none' },
  // Broken dummies the Dummy King calls in: cracked, missing bits, lots of health.
  sbImperfect: { name: 'Imperfect Dummy', hp: 150000, speed: 2.4, reward: 0, damage: 400, scale: 1.5,
    sb: 'imperfect', skin: 0xd6d6d6, shirt: 0xd6d6d6, pants: 0xd6d6d6, face: 'none' },
  // The Dummy King: the most health of any boss. A nuke on arrival drops the base to 1 health; his
  // sword hits the towers near him; now and then he nukes a random spot (towers there are knocked
  // out); every so often 5 Imperfect Dummies come out.
  sbKing: { name: 'Dummy King', hp: 5000000, speed: 0.9, reward: 0, damage: 1e6, scale: 6, h: 5.4, boss: true, stunImmune: true,
    sb: 'king', skin: 0xfafafa, shirt: 0xfafafa, pants: 0xfafafa, face: 'none',
    slam: { range: 16, every: 7, stun: 1, dmg: 300 }, // the sword swing
    summon: { type: 'sbImperfect', n: 5, every: 30 },
    nuke: { every: 35, warn: 3, radius: 20 },
    intro: '👑 THE DUMMY KING! His nuke dropped your base to 1 health. Do not let him through!' },
};

export function addSandboxEnemies(ENEMIES) {
  for (const [k, d] of Object.entries(NEW)) ENEMIES[k] = d;
}
