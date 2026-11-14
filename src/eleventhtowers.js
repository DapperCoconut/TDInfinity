// Wave 11: new towers.
//   Poacher: the starter cliff tower. One arrow at a time, slow and steady, good on bosses.
//
// New mechanic (see computeBuffs in sim/parts/shared.js):
//   cliffBoost: { boost, stacks, radius }  Bullseye Support: other cliff towers (placement 'cliff')
//               within `radius` get `boost` more range. Boosts from different Poachers add up,
//               up to `stacks` of them. (Poachers don't boost Poachers: towers never boost their
//               own type.)
//
// Numbers are the spec's. Guessed: price 0 (owned from the start, it's the starter cliff tower),
// the inner range (radius 15) and the arrow look.

const bullseye = (boost) => ({ boost, stacks: 3, radius: 15 });

export const ELEVENTH_TOWERS = {
  poacher: {
    name: 'Poacher',
    price: 0,
    cost: 450,
    placement: 'cliff',
    blurb: 'The starter cliff tower. Fires one arrow at a time, slowly, for good damage, so it is great against bosses. From Lv 3 it sees hidden zombies and gives other cliff towers near it more range (up to 3 Poachers can stack). Cliffs only.',
    tip: 'Put Poachers next to your other cliff towers: each one gives them more range, up to 3 times.',
    levels: [
      { name: 'Poacher', desc: 'Fires one arrow at a time from a cliff.', damage: 4, cooldown: 2.5, range: 20, hidden: false },
      { name: 'Quick Hands', desc: '+1 damage, and shoots faster (every 2s).', cost: 200, damage: 5, cooldown: 2, range: 20, hidden: false },
      { name: 'Sharp Arrows', desc: '+4 damage.', cost: 350, damage: 9, cooldown: 2, range: 20, hidden: false },
      { name: 'Bullseye Support', desc: '+5 range and hidden detection. Other cliff towers near it get +9% range (stacks up to 3 times).', cost: 900, damage: 9, cooldown: 2, range: 25, hidden: true,
        cliffBoost: bullseye(0.09) },
      { name: 'Vantage', desc: '+3 range and +5 damage.', cost: 950, damage: 14, cooldown: 2, range: 28, hidden: true,
        cliffBoost: bullseye(0.09) },
      { name: 'Arrows of Power', desc: '+6 damage, and the cliff range boost rises to 13%.', cost: 2000, damage: 20, cooldown: 2, range: 28, hidden: true,
        cliffBoost: bullseye(0.13) },
    ],
  },
};
