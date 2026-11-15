// Wave 13: new towers.
//   Technomancer: an alternate Hacker form. Fires bursts of shots, places a Hologram (a pad any
//                 tower can stand on), hijacks the tower on it for boosts, and clones it (Utopia).
//
// New mechanics (sim code in sim/parts/weapons7.js):
//   techno: { hijack }  Technomancer.
//       Hologram ability (key 'hologram'): puts its pad at a spot in range (once). Any of your
//       towers can be placed on the pad, on any ground (canPlace in map.js reads t.pad).
//       Selling the Technomancer sells the tower on its pad too.
//       hijack (Lv 3): the tower on the pad gives it boosts: for damage, firerate and range, half of
//       how much more that tower has than the Technomancer (a third less if that tower isn't max
//       level), each at most HIJACK_CAP (computeBuffs in sim/parts/shared.js).
//       Utopia ability (key 'utopia', Lv 4): a free 30s hologram copy of the tower on the pad.

// ---------------------------------------------------------------- Technomancer

const HOLOGRAM = { key: 'hologram', name: 'Hologram', desc: 'Place a Hologram pad in range. Any tower can stand on it (ground, cliff or water towers). Selling the Technomancer sells the tower on it too', cooldown: 1, aim: true, radius: 1.5 };
const UTOPIA = { key: 'utopia', name: 'Utopia', desc: 'Make a hologram copy of the tower on your Hologram for 30s. It can go on ground or cliffs, and copies don\'t count toward tower limits', cooldown: 60, aim: true, clone: 0, life: 30, anySpot: true };

export const THIRTEENTH_TOWERS = {
  // Technomancer (alternate Hacker form): bursts of shots. The cycle (`cooldown`) is the burst
  // time plus the spec's 3s rest.
  hackerTechnomancer: {
    name: 'Technomancer',
    altOf: 'hacker',
    form: 'Technomancer',
    shards: 1,
    price: 0,
    cost: 3500,
    limit: 4,
    lead: false,
    burstGap: 0.1,
    kindLabel: 'Burst',
    blurb: 'An alternate Hacker that fires bursts of 8 shots. From Lv 2 it places a Hologram: a pad that any of your towers can stand on, even water or cliff towers. From Lv 3 it hijacks the tower on the pad and gets boosts from it. At Lv 4 Utopia makes a free copy of that tower for 30s.',
    tip: 'Put your strongest tower on its Hologram: the Technomancer gets half of what that tower has more than it (damage, firerate, range).',
    levels: [
      { name: 'Technomancer', desc: 'Fires a burst of 8 shots for 8 every 3s.', damage: 8, burst: 8, cooldown: 3.7, range: 16, hidden: false,
        techno: {} },
      { name: 'Improved Kit', desc: '+2 damage, +2 range, and hidden detection.', cost: 1250, damage: 10, burst: 8, cooldown: 3.7, range: 18, hidden: true,
        techno: {} },
      { name: 'Hologram', desc: '+4 damage. New ability: Hologram, a pad any tower can stand on.', cost: 4000, damage: 14, burst: 8, cooldown: 3.7, range: 18, hidden: true,
        techno: {}, abilities: [HOLOGRAM] },
      { name: 'Hijack', desc: '+6 damage. The tower on the Hologram is hijacked: the Technomancer gets half of how much more damage, firerate and range it has (a third less if it isn\'t max level).', cost: 12000, damage: 20, burst: 8, cooldown: 3.7, range: 18, hidden: true,
        techno: { hijack: true }, abilities: [HOLOGRAM] },
      { name: 'Technological Wonder', desc: 'Bursts of 15 shots (from 8), and faster ones. New ability: Utopia, a free 30s copy of the tower on the Hologram.', cost: 40000, damage: 20, burst: 15, burstGap: 0.08, cooldown: 4.12, range: 18, hidden: true,
        techno: { hijack: true }, abilities: [HOLOGRAM, UTOPIA] },
    ],
  },
};
