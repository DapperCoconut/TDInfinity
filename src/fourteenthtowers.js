// Wave 14: Barracks and melee.
//   Footman: a starter barracks. Its Footmen stand on the path and fight the zombies they stop.
//
// Barracks towers (kind 'spawner' with a `guard` unit). Sim code in sim/parts/units.js:
//   guard: true on the unit. The unit walks to its rally point (the bit of path closest to the
//       tower) and stays there, side by side with the other guards of its tower. Zombies that
//       touch a guard stop (like the Bubble Companion), hurt it, and the guard swings at them.
//       Dead guards come back every `spawnEvery` s during a wave; between waves the tower fills
//       up at once and its guards heal to full. Upgrading the tower upgrades the guards out now.
//   blockChance: on the unit, the share of zombie hits its shield stops.
//   maxUnits: on each level, how many guards the tower keeps out.
//
// Not used by the game yet (kept for later): `supercharge` (after the last tier, buy a
// Supercharge again and again, each one dearer than the last).

const footman = (lv, hp, damage, blockChance) => ({
  name: 'Footman', model: `footman${lv}`, soldiers: 1, hp, speed: 0, guard: true, still: true, block: true, flying: false,
  blockChance, gun: { damage, cooldown: 1, range: 3 },
});

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
    blurb: 'A starter barracks. Its Footmen stand on the path closest to it, stop the zombies that reach them and fight them with swords. Fallen Footmen come back after a while.',
    tip: 'Put it next to a strong tower, so its Footmen hold zombies where that tower hits them.',
    levels: [
      { name: 'Footman', desc: 'Keeps 2 Footmen on the path (20 HP, 3 damage a swing).', hidden: false, maxUnits: 2,
        unit: footman(0, 20, 3, 0) },
      { name: 'Wooden Shield', desc: 'Last Meal: +5 health. Wooden Shield: blocks 3% of hits. Stronger Swings: 4 damage a swing.', cost: 200, hidden: false, maxUnits: 2,
        unit: footman(1, 25, 4, 0.03) },
      { name: 'Bigger Tent', desc: 'Sword Handling: +1 damage. Reinforced Wooden Shield: blocks 6% of hits. Bigger Tent: 3 Footmen. +5 health.', cost: 250, hidden: false, maxUnits: 3,
        unit: footman(2, 30, 5, 0.06) },
      { name: 'Steel Shield', desc: 'More Beds: 4 Footmen. Steel Shield: blocks 10% of hits. Healthy Soldiers: 35 health. Sword Handling: 6 damage a swing.', cost: 300, hidden: false, maxUnits: 4,
        unit: footman(3, 35, 6, 0.1) },
    ],
  },
};
