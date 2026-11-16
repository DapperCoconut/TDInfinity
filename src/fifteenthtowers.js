// Wave 15: two alternate forms.
//   Bowman: an alternate Poacher on the ground. A longbow with very long range and a blind spot
//           close in. Upgrades add bleeding, critical hits and a slow.
//   Ground Mortar: an alternate Mortar, a cannon built into the ground. Unlimited range, a big
//           blind spot, slow and inaccurate cannonballs with a big blast. Can't hit flyers.
//
// "Haste" in the spec is how fast it fires: 100% is the base speed, +100% haste fires twice as
// often, so the cooldown is the base cooldown / (haste / 100%).
// Damage (hits, bleed, burn) is the spec's divided by 12, to fit this game's numbers (user, 2026-11-15).
//
// New mechanics (sim code):
//   bees with a `name` (Bowman Bleed): the Swarmer's sting stacks, shown under that name.
//   knee: { slow, time, max, boss }  Bowman Arrow In The Knee (applyKnee in sim/parts/weapons3.js).
//       Each hit slows the zombie by `slow` and adds `time` s to the slow, up to `max` s.
//       Bosses are slowed `boss` as much.
//   inacc: on a lobbing tower, its shells land up to `inacc` studs away from the aim point.
//   Barrage ability (key 'barrage', in useAbility): `shots` shells at once at its target, each
//       `spread` times as inaccurate.
//   Rapid Fire ability (key 'rapidFire'): a timed self boost, `rate` x fire rate.
//
// Not used by the game yet (kept for later): `supercharge` (after the last tier, buy a
// Supercharge again and again), `lethality` (the spec's lethality %).

const BLEED = { name: 'Bleed', damage: 0.8, tick: 2, time: 2, stacks: 10 };
const KNEE = { slow: 0.5, time: 3, max: 9, boss: 0.5 };
const BARRAGE = { key: 'barrage', name: 'Barrage', desc: 'Fires 3 cannonballs at once, but they land twice as far off', cooldown: 15, shots: 3, spread: 2 };
const RAPID = { key: 'rapidFire', name: 'Rapid Fire', desc: 'For 5s it fires 4 times as fast', cooldown: 30, duration: 5, self: true, rate: 4 };

export const FIFTEENTH_TOWERS = {
  bowman: {
    name: 'Bowman',
    altOf: 'poacher',
    form: 'Bowman',
    shards: 1,
    price: 0,
    cost: 200,
    minRange: 5,
    lethality: 1,
    supercharge: { cost: 1500, lethality: 0.01 },
    blurb: 'An alternate Poacher that stands on the ground. A longbow with very long range that hits one zombie at a time. Upgrades make zombies bleed, add critical hits and slow zombies down. It can\'t shoot zombies that get too close, so put it near the path, not on it.',
    tip: 'Strong early. Armored zombies, late waves and zombies that can\'t bleed or be slowed give it trouble.',
    levels: [
      { name: 'Bowman', desc: 'A longbow: 2.5 damage an arrow, from very far away. Can\'t hit zombies right next to it.', damage: 2.5, cooldown: 3, range: 24, hidden: false },
      { name: 'Serrated Edges', desc: 'Bleed (0.8 damage over 2s, stacks), +4.2 damage, fires twice as fast, 3% critical hits for 2x damage, +5 range.', cost: 500,
        damage: 6.7, cooldown: 1.5, range: 29, hidden: false, bees: BLEED, critChance: 0.03, critMult: 2 },
      { name: 'Steel Arrowheads', desc: '+5 damage, fires faster, 6% critical hits, +5 range.', cost: 750,
        damage: 11.7, cooldown: 1, range: 34, hidden: false, bees: BLEED, critChance: 0.06, critMult: 2 },
      { name: 'Arrow In The Knee', desc: 'Arrows slow zombies by 50% for 3s (stacks), +6.2 damage, fires faster, 10% critical hits, +5 range.', cost: 1200,
        damage: 17.9, cooldown: 0.75, range: 39, hidden: false, bees: BLEED, critChance: 0.1, critMult: 2, knee: KNEE },
    ],
  },
  mortarGround: {
    name: 'Ground Mortar',
    altOf: 'mortar',
    form: 'Ground',
    shards: 1,
    price: 0,
    cost: 250,
    limit: 4,
    flying: false,
    lob: 2,
    minRange: 20,
    supercharge: { cost: 5000, barrage: 0.1, barrageMax: 2, lethality: 0.01 },
    blurb: 'An alternate Mortar: a big cannon built into the ground. It reaches the whole map, but its cannonballs are slow and land a bit off. Big blasts. It can\'t hit flying zombies or anything within 20 of it.',
    tip: 'Put it far from the path. Its blasts are big enough that landing a bit off still hits the crowd.',
    levels: [
      { name: 'Ground Mortar', desc: 'Lobs slow cannonballs anywhere on the map: 25 damage in a blast. They land a bit off. Not within 20.', damage: 25, cooldown: 6, range: 999, radius: 8, inacc: 3, hidden: false },
      { name: 'More Gunpowder', desc: '+25 damage, and Barrage: fire 3 cannonballs at once (they land twice as far off).', cost: 1200,
        damage: 50, cooldown: 6, range: 999, radius: 8, inacc: 3, hidden: false, abilities: [BARRAGE] },
      { name: 'Heavy Artillery', desc: '+25 damage, a much bigger blast, and Rapid Fire: 4 times as fast for 5s.', cost: 1900,
        damage: 75, cooldown: 6, range: 999, radius: 17, inacc: 3, hidden: false, abilities: [BARRAGE, RAPID] },
      { name: 'The Bigger, The Better', desc: '+42 damage, an even bigger blast, and the cannonballs set zombies on fire (1.25 damage over 3s).', cost: 4000,
        damage: 117, cooldown: 6, range: 999, radius: 21, inacc: 3, hidden: false, ignite: { dps: 0.42, time: 3 }, abilities: [BARRAGE, RAPID] },
    ],
  },
};
