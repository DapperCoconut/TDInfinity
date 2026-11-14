// Wave 11: new towers.
//   Poacher: the starter cliff tower. One arrow at a time, slow and steady, good on bosses.
//   Gunner: an alternate Soldier form. Short bursts, cheap, sees hidden zombies from Lv 3.
//
// New mechanic (see computeBuffs in sim/parts/shared.js):
//   cliffBoost: { boost, stacks, radius }  Bullseye Support: other cliff towers (placement 'cliff')
//               within `radius` get `boost` more range. Boosts from different Poachers add up,
//               up to `stacks` of them. (Poachers don't boost Poachers: towers never boost their
//               own type.)
//
// Numbers are the spec's. Guessed: Poacher price 0 (owned from the start, it's the starter cliff
// tower), its inner range (radius 15) and the arrow look; Gunner costs 1 Dimension Shard like most forms.

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
  // Gunner (alternate Soldier form): 3-shot bursts, 0.2s apart (0.1s at Lv 5). `cooldown` is the
  // full cycle, as for every burst tower.
  soldierGunner: {
    name: 'Gunner',
    altOf: 'soldier',
    form: 'Gunner',
    shards: 1,
    price: 0,
    cost: 350,
    burstGap: 0.2,
    blurb: 'An alternate Soldier that fires short bursts. Cheap to place, and it sees hidden zombies from Lv 3. At Lv 4 it swaps to two burst pistols, and at Lv 5 its bursts get big and fast.',
    tip: 'A cheap early pick. Push it to Lv 3 before hidden zombies show up.',
    levels: [
      { name: 'Gunner', desc: 'Fires 3-shot bursts at one zombie at a time.', damage: 1, burst: 3, cooldown: 1.5, range: 10, hidden: false },
      { name: 'Precision', desc: '+2 range.', cost: 150, damage: 1, burst: 3, cooldown: 1.5, range: 12, hidden: false },
      { name: 'Shredder Bullets', desc: '+1 damage, and bursts come faster (every 1s).', cost: 250, damage: 2, burst: 3, cooldown: 1, range: 12, hidden: false },
      { name: 'Marksman Eye', desc: '+2 range, +1 damage and hidden detection.', cost: 600, damage: 3, burst: 3, cooldown: 1, range: 14, hidden: true },
      { name: 'Burst Pistols', desc: 'Two pistols: +1 range, +2 damage and 4 shots per burst.', cost: 1750, damage: 5, burst: 4, cooldown: 1, range: 15, hidden: true },
      { name: 'Rapidfire Assault', desc: '+4 damage, 6 shots per burst, and the shots in a burst come twice as fast.', cost: 4150, damage: 9, burst: 6, burstGap: 0.1, cooldown: 1, range: 15, hidden: true },
    ],
  },
};
