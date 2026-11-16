// Wave 14: Barracks and melee.
//   Footman: a starter barracks. Its Footmen roam the path in its range and fight the zombies they stop.
//
// Barracks towers (kind 'spawner' with a `guard` unit). Sim code in sim/parts/units.js:
//   guard: true on the unit. Guards walk along the path inside the tower's `range` to fight the
//       first zombies in it (each guard picks its own), and go back to the bit of path closest to
//       the tower when there are none. Set Rally Point (ability 'rally', in range) makes them stand
//       on one spot instead; Roam (ability 'roam') lets them move again. Zombies that touch a
//       guard stop (like the Bubble Companion), hurt it, and the guard swings at them.
//       Dead guards come back every `spawnEvery` s during a wave; between waves the tower fills
//       up at once and its guards heal to full. Upgrading the tower upgrades the guards out now.
//   walk: on the unit, how fast a guard walks (default 6).
//   blockChance: on the unit, the share of zombie hits its shield stops.
//   maxUnits: on each level, how many guards the tower keeps out.
//
// Not used by the game yet (kept for later): `supercharge` (after the last tier, buy a
// Supercharge again and again, each one dearer than the last).

const footman = (lv, hp, damage, blockChance) => ({
  name: 'Footman', model: `footman${lv}`, soldiers: 1, hp, speed: 0, walk: 6, guard: true, still: true, block: true, flying: false,
  blockChance, gun: { damage, cooldown: 1, range: 3 },
});
const RALLY = { key: 'rally', name: 'Set Rally Point', desc: 'Click the path in range: its troops stand there and stop moving around', cooldown: 1, aim: true, radius: 2 };
const ROAM = { key: 'roam', name: 'Roam', desc: 'Its troops move around in its range again, going after zombies', cooldown: 1 };
const BARRACKS_AB = [RALLY, ROAM];

export const FOURTEENTH_TOWERS = {
  footman: {
    name: 'Footman',
    price: 0,
    cost: 150,
    limit: 6,
    kind: 'spawner',
    spawnEvery: 8,
    unitsDie: true,
    supercharge: true,
    blurb: 'A starter barracks. Its Footmen walk around the path in its range to fight zombies, stopping the ones they reach. Set a rally point to make them hold one spot. Fallen Footmen come back after a while.',
    tip: 'Put it next to a strong tower, so its Footmen hold zombies where that tower hits them.',
    levels: [
      { name: 'Footman', desc: 'Keeps 2 Footmen on the path (20 HP, 3 damage a swing).', range: 10, hidden: false, abilities: BARRACKS_AB, maxUnits: 2,
        unit: footman(0, 20, 3, 0) },
      { name: 'Wooden Shield', desc: 'Last Meal: +5 health. Wooden Shield: blocks 3% of hits. Stronger Swings: 4 damage a swing.', cost: 200, range: 10, hidden: false, abilities: BARRACKS_AB, maxUnits: 2,
        unit: footman(1, 25, 4, 0.03) },
      { name: 'Bigger Tent', desc: 'Sword Handling: +1 damage. Reinforced Wooden Shield: blocks 6% of hits. Bigger Tent: 3 Footmen. +5 health.', cost: 250, range: 10, hidden: false, abilities: BARRACKS_AB, maxUnits: 3,
        unit: footman(2, 30, 5, 0.06) },
      { name: 'Steel Shield', desc: 'More Beds: 4 Footmen. Steel Shield: blocks 10% of hits. Healthy Soldiers: 35 health. Sword Handling: 6 damage a swing.', cost: 300, range: 10, hidden: false, abilities: BARRACKS_AB, maxUnits: 4,
        unit: footman(3, 35, 6, 0.1) },
    ],
  },
};
