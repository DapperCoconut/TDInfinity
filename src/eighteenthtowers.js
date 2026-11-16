// Wave 18: seven alternate forms and Helloc.
//   Hoplite (Marksman form): a Greek spearman who throws spears for big damage at short range.
//       Goes on the ground or on cliffs. Challenge marks a zombie: Hoplites hurt it more.
//   Great Cannon (Railgunner form): a huge iron cannon with a giant reach. Its balls go through
//       a row of zombies, and every upgrade makes it slower but much stronger.
//   Crossbowman (Archer form): a hooded bowman with a heavy crossbow. Far reach, critical hits,
//       and at tier 3 bolts that go through armor and slow.
//   Arcantech Commando (Commando form): a fast rifle that hits with bullets and magic at once.
//       Goes on the ground or on cliffs. Only 5 on the map.
//   Cygor (Noob Tuber form): a one-eyed giant that throws huge exploding boulders very far.
//   Oathsworn Revenant (Phaser form): a skeleton knight with slow, huge magic hits, a ghost skull,
//       Souldrain, Veil of Souls and Damnation.
//   Astrapomancer (Grenadier form): a cheap storm mage whose zaps stun. Conduit speeds up the
//       Astrapomancers and Magei near it, again and again.
//   Helloc: a new tower, a demon with a giant sword. Only one on the whole map. Annihilation
//       wipes out hurt zombies (not bosses), Lava Waves roll down the whole path, and at tier 4
//       a Spawn of Helloc fights on the path.
//
// Damage (hits, bleeds, blasts, the max-health caps) is the spec's divided by 12, like waves 16-17.
// Health, prices, ranges and timings are as written. Max-health % damage is not divided.
// "Haste" is how fast it attacks: +25% haste = the cooldown is base / 1.25 (they add up).
// "Speed +1" (Crossbowman, Arcantech) is read as +100% haste; Great Cannon's "speed -0.25" as 25%
// more time between shots.
//
// New mechanics (sim code in sim/parts/eighteenth.js):
//   hit18 on a level: its own basic attack (fire18): 'spear', 'cannon', 'xbow', 'hybrid',
//       'boulder', 'zap', 'helloc'.
//   air: flyers take this many times the damage (Hoplite Aerbane).
//   challenged: on a Hoplite level, how much more damage Challenged zombies take from it.
//   bleed: { dps, time } after each hit (it works like a burn).
//   pierce: Great Cannon balls hit this many zombies in a line.
//   crit: { chance, mult } (Crossbowman). slow: { amt, time } on each hit. armorPierce: ignores armor.
//   stun: seconds each zap stuns (Astrapomancer).
//   split (Helloc Defender's Fall): its hits are a third physical, a third magic, a third true damage.
//   spells (cast18 in eighteenth.js): challenge, thunderclap, conduit, skull, souldrain, veil,
//       damnation, annihilate, lava. Like wave 17 spells, each on its own timer.
//   mapLimit on a tower: how many can stand on the whole map (every player counted).
//   mapOne on a level: only one tower on the whole map may have that tier (Great Cannon tier 4).
//   guard18 (Helloc tier 4): the tower attacks AND keeps its `unit` guard on the path.
//   supercharge units (Helloc): +that much troop room each; every full 1 is one more Spawn.
//
// Not used by the game yet: `mrShred` (Souldrain; zombies have no magic resistance here).

const r = (n) => Math.round(n * 100) / 100;
const D = (n) => r(n / 12); // the spec's damage, divided by 12

// ------------------------------------------------------------------ Hoplite

const HOP_CD = 2; // seconds between spears at 100% haste (guess)
const CHALLENGE = (slay) => ({ key: 'challenge', every: 12, time: 10, slow: 0.5, ...(slay ? { slay } : {}) });
const hoplite = (lv, damage, haste, range, extra = {}) => ({
  damage: D(damage), cooldown: r(HOP_CD / (1 + haste)), range, hidden: lv >= 2, hit18: 'spear', ...(lv >= 1 ? { air: 3 } : {}), ...extra,
});

// ------------------------------------------------------------------ Great Cannon

const GC_CD = 3; // seconds between shots before any upgrade (guess)
const cannon = (slow, damage, pierce, extra = {}) => ({ damage: D(damage), cooldown: r(GC_CD * (1 + 0.25 * slow)), range: 120, hidden: false, hit18: 'cannon', pierce, ...extra });

// ------------------------------------------------------------------ Crossbowman

const XB_CD = 2; // (guess)
const xbow = (lv, damage, speed, range, crit, extra = {}) => ({
  damage: D(damage), cooldown: r(XB_CD / (1 + speed)), range, hidden: lv >= 2, hit18: 'xbow', ...(crit ? { crit: { chance: crit, mult: 2 } } : {}), ...extra,
});

// ------------------------------------------------------------------ Arcantech Commando

const AC_CD = 0.5; // (guess)
const arcantech = (lv, damage, speed, range) => ({ damage: D(damage), cooldown: r(AC_CD / (1 + speed)), range, hidden: lv >= 1, hit18: 'hybrid' });

// ------------------------------------------------------------------ Cygor

const CY_CD = 6; // (guess)
const cygor = (lv, damage, haste, range, radius) => ({ damage: D(damage), cooldown: r(CY_CD / (1 + haste)), range, radius, hidden: lv >= 2, hit18: 'boulder' });

// ------------------------------------------------------------------ Oathsworn Revenant

const SKULL = { key: 'skull', every: 30, radius: 6 }; // its damage is the basic hit's (guess)
const SOULDRAIN = { key: 'souldrain', every: 25, time: 5, pct: 0.05, cap: D(3500), mrShred: 1 };
const VEIL = { key: 'veil', every: 20, slow: 0.75, time: 5 }; // every 20s (guess)
const DAMNATION = { key: 'damnation', every: 90, time: 15, radius: 30, pct: 0.05, cap: D(3000) };
const oath = (lv, damage, range, spells) => ({ damage: D(damage), cooldown: 4, range, hidden: lv >= 2, spells });

// ------------------------------------------------------------------ Astrapomancer

const AS_CD = 3; // (guess)
const THUNDERCLAP = { key: 'thunderclap', every: 10, damage: D(55), stun: 5, radius: 5 };
const CONDUIT = { key: 'conduit', every: 15, haste: 0.5, time: 10, radius: 15, kinds: ['astrapomancer', 'magei'] };
const astra = (lv, damage, stun, range, spells) => ({ damage: D(damage), cooldown: AS_CD, range, stun, hidden: lv >= 2, hit18: 'zap', ...(spells ? { spells } : {}) });

// ------------------------------------------------------------------ Helloc

const HL_CD = 5; // a slow swing (guess)
const ANNIHILATE = (below) => ({ key: 'annihilate', every: 3, below });
const LAVA = { key: 'lava', every: 20, min: 0.25 }; // a wave hits for its swing x 0.25 at the base end, x 1 at the start
const spawnOfHelloc = { name: 'Spawn of Helloc', model: 'hellocSpawn', soldiers: 1, hp: 20000, speed: 0, walk: 6, guard: true, still: true, block: true, flying: false,
  blockChance: 0, gun: { damage: D(100000), cooldown: 2, range: 4 } };
const helloc = (damage, extra = {}) => ({ damage: D(damage), cooldown: HL_CD, range: 30, radius: 4, hidden: true, hit18: 'helloc', ...extra });

export const EIGHTEENTH_TOWERS = {
  hoplite: {
    name: 'Hoplite',
    altOf: 'marksman',
    form: 'Hoplite',
    shards: 1,
    price: 0,
    cost: 500,
    limit: 8,
    placement: 'any',
    supercharge: { cost: 2500, lethality: 0.02 },
    blurb: 'An alternate Marksman: a Greek spearman. Throws heavy spears for big damage at short range. It can stand on the ground or on cliffs. Hoplites never throw at a zombie another Hoplite just threw at, if there is another one to hit.',
    tip: 'Challenge marks a zombie: every Hoplite hurts it more. Put a few together.',
    levels: [
      { name: 'Hoplite', desc: 'Throws a spear for 14.6 damage.', ...hoplite(0, 175, 0, 10) },
      { name: 'Sharpened Spears', desc: '+20 damage. Speed Drills: 25% faster. Keen Eye: +5 range. Aerbane: triple damage to flyers.', cost: 750,
        ...hoplite(1, 415, 0.25, 15) },
      { name: 'Challenge', desc: '+22.5 damage, 25% faster, +5 range. Challenge: every 12s, a zombie takes 50% more damage from Hoplites and walks 50% slower for 10s (more time if it is Challenged again).', cost: 1000,
        ...hoplite(2, 685, 0.5, 20, { challenged: 0.5, spells: [CHALLENGE()] }) },
      { name: 'Demigod Training', desc: '+50 damage, 50% faster, +10 range. Spears make zombies bleed 20.8 over 4s. Slay the Weak: Challenged zombies take 150% more on top.', cost: 2000,
        ...hoplite(3, 1285, 1, 30, { challenged: 2, bleed: { dps: r(D(250) / 4), time: 4 }, spells: [CHALLENGE(true)] }) },
    ],
  },
  greatCannon: {
    name: 'Great Cannon',
    altOf: 'railgunner',
    form: 'Cannon',
    shards: 2,
    price: 0,
    cost: 500,
    limit: 4,
    flying: false,
    blurb: 'An alternate Railgunner: a huge black iron cannon on wheels. It reaches almost the whole map and its balls go through a row of zombies. Every upgrade makes it slower, but much stronger. Only one on the map can reach tier 4.',
    tip: 'Aim it down a long straight bit of path, so each ball goes through more zombies.',
    levels: [
      { name: 'Great Cannon', desc: 'A cannonball every 3s for 8.3 damage that goes through 2 zombies.', ...cannon(0, 100, 2) },
      { name: 'More Gunpowder', desc: '+29.2 damage (37.5), 25% slower. Shieldbreaker: goes through 3 zombies.', cost: 10000,
        ...cannon(1, 450, 3) },
      { name: "'Blackdust' Gunpowder", desc: '+41.7 damage (79.2), 25% slower. Fleshcleaver: goes through 5 zombies.', cost: 20000,
        ...cannon(2, 950, 5) },
      { name: 'Artillery Shells', desc: '+166.7 damage (245.8), 25% slower, sees hidden zombies. Shrapnel: zombies hit bleed 166.7 over 5s. Wall Destroyer: goes through 7.', cost: 75000,
        ...cannon(3, 2950, 7, { hidden: true, bleed: { dps: r(D(2000) / 5), time: 5 } }) },
      { name: "King's Hammer", desc: "+333.3 damage (579.2), 50% slower. King's Hammer: goes through 10 zombies. Only one Great Cannon on the map can have this.", cost: 200000, mapOne: true,
        ...cannon(5, 6950, 10, { hidden: true, bleed: { dps: r(D(2000) / 5), time: 5 } }) },
    ],
  },
  crossbowman: {
    name: 'Crossbowman',
    altOf: 'archer',
    form: 'Crossbow',
    shards: 1,
    price: 0,
    cost: 500,
    limit: 8,
    blurb: 'An alternate Archer: a hooded bowman with a heavy iron crossbow. One zombie at a time from very far away. Upgrades add critical hits, and at tier 3 bolts that go through armor and slow.',
    tip: 'Great against armored zombies once it reaches tier 3.',
    levels: [
      { name: 'Crossbowman', desc: 'A bolt every 2s for 10.4 damage, from far away.', ...xbow(0, 125, 0, 30) },
      { name: '440lb Draw Weight', desc: '+12.5 damage (22.9), 50% faster, +5 range. 5% chance of a double-damage critical hit.', cost: 2000,
        ...xbow(1, 275, 0.5, 35, 0.05) },
      { name: '720lb Draw Weight', desc: '+16.7 damage (39.6), 50% faster, +5 range, sees hidden zombies. Critical chance 10%.', cost: 2500,
        ...xbow(2, 475, 1, 40, 0.1) },
      { name: '1250lb Draw Weight', desc: '+20.8 damage (60.4) that ignores armor, +100% speed, +5 range. Critical chance 20%. Arrow in the Knee: slows zombies 50% for 3s.', cost: 3500,
        ...xbow(3, 725, 2, 45, 0.2, { armorPierce: true, slow: { amt: 0.5, time: 3 } }) },
    ],
  },
  arcantech: {
    name: 'Arcantech Commando',
    altOf: 'commando',
    form: 'Arcantech',
    shards: 2,
    price: 0,
    cost: 5000,
    limit: 5,
    mapLimit: 5,
    placement: 'any',
    blurb: 'An alternate Commando: a visored soldier with a glowing arcane rifle. Fires very fast, and each bullet hits with half bullet damage and half magic. Hits flyers. It can stand on the ground or on cliffs. Only 5 on the whole map.',
    tip: 'The magic half gets through bullet resistance.',
    levels: [
      { name: 'Arcantech Commando', desc: 'Fast arcane bullets for 3.3 damage: half bullet, half magic.', ...arcantech(0, 40, 0, 15) },
      { name: 'Lead Bullets', desc: '+5 damage (8.3), +1 range, twice as fast, sees hidden zombies.', cost: 15000, ...arcantech(1, 100, 1, 16) },
      { name: 'Steel Bullets', desc: '+6.3 damage (14.6), +2 range, faster again.', cost: 25000, ...arcantech(2, 175, 2, 18) },
      { name: 'Killing Machine', desc: '+12.5 damage (27.1), +3 range. Masterwork Gun: faster again.', cost: 45000, ...arcantech(3, 325, 4, 21) },
    ],
  },
  cygor: {
    name: 'Cygor',
    altOf: 'noobTuber',
    form: 'Cygor',
    shards: 2,
    price: 0,
    cost: 450,
    limit: 8,
    placement: 'any',
    minRange: 10,
    flying: false,
    lob: 1.2,
    supercharge: { cost: 250000, lethality: 0.1 },
    blurb: 'An alternate Noob Tuber: a one-eyed giant, part minotaur, with hooves, sharp teeth and a hunched back. It leans back and throws a huge boulder that explodes on a big area. Very far reach, but it can\'t hit zombies within 10 of it. It can stand on the ground or on cliffs.',
    tip: 'Set a few to Strongest and they all throw at the boss together.',
    levels: [
      { name: 'Cygor', desc: 'A boulder every 6s: 16.7 damage to every zombie within 14.', ...cygor(0, 200, 0, 40, 14) },
      { name: 'Young Cygor', desc: '+33.3 damage (50), 25% faster, +5 range, blast 15.', cost: 2000, ...cygor(1, 600, 0.25, 45, 15) },
      { name: 'Adolescent Cygor', desc: '+50 damage (100), 25% faster, +5 range, blast 16, sees hidden zombies.', cost: 12500, ...cygor(2, 1200, 0.5, 50, 16) },
      { name: 'Mature Cygor', desc: '+66.7 damage (166.7), 50% faster, +5 range, blast 17.', cost: 75000, ...cygor(3, 2000, 1, 55, 17) },
      { name: 'Apex Cygor', desc: 'Mountain Thrower: +166.7 damage (333.3), twice as fast, +5 range, blast 20.', cost: 200000, ...cygor(4, 4000, 2, 60, 20) },
    ],
  },
  oathsworn: {
    name: 'Oathsworn Revenant',
    altOf: 'phaser',
    form: 'Oathsworn',
    shards: 3,
    price: 0,
    cost: 25000,
    limit: 3,
    damageType: 'magic',
    lead: true,
    blurb: 'An alternate Phaser: a skeleton knight in rusted armor with a ghostly skull. A huge magic hit every 4s, and a screaming skull that blasts a crowd. Upgrades add Souldrain, Veil of Souls and Damnation, which eat away a share of the zombies\' health.',
    tip: 'Souldrain and Damnation take a share of max health, so they are best on very tough zombies.',
    levels: [
      { name: 'Oathsworn Revenant', desc: 'A magic hit every 4s for 83.3 damage. Sepulchral Cacophony: every 30s, a ghost skull hits every zombie near its target just as hard.', ...oath(0, 1000, 15, [SKULL]) },
      { name: 'Souldrain', desc: 'Unholy Grip: +41.7 damage (125). +2 range. Souldrain: every 25s, its target loses 5% of its max health a second for 5s (at most 291.7 a second).', cost: 100000,
        ...oath(1, 1500, 17, [SKULL, SOULDRAIN]) },
      { name: 'Veil of Souls', desc: 'Unholy Grip: +83.3 damage (208.3). +3 range. Veil of Souls: every 20s, every zombie in range walks 75% slower for 5s.', cost: 200000,
        ...oath(2, 2500, 20, [SKULL, SOULDRAIN, VEIL]) },
      { name: 'Damnation', desc: 'Unholy Grip: +41.7 damage (250). +5 range. Damnation: every 90s, a rift for 15s: zombies within 30 lose 5% of their max health a second (at most 250 a second).', cost: 200000,
        ...oath(3, 3000, 25, [SKULL, SOULDRAIN, VEIL, DAMNATION]) },
    ],
  },
  astrapomancer: {
    name: 'Astrapomancer',
    altOf: 'grenadier',
    form: 'Astrapo',
    shards: 1,
    price: 0,
    cost: 250,
    limit: 8,
    damageType: 'magic',
    lead: true,
    blurb: 'An alternate Grenadier: a cheap storm mage with a copper staff. Its zaps are weak but stun, and it hits flyers. Upgrades add Thunderclap (a stunning blast) and Conduit, which keeps speeding up the Astrapomancers and Magei near it.',
    tip: 'Put several close together: Conduit stacks again and again.',
    levels: [
      { name: 'Astrapomancer', desc: 'Zaps one zombie every 3s for 1.3 damage and stuns it for 2s.', ...astra(0, 15, 2, 12) },
      { name: 'Enhanced Zap', desc: 'Zaps hit for 2.5 and stun for 4s. +5 range.', cost: 625, ...astra(1, 30, 4, 17) },
      { name: 'Thunderclap', desc: 'Zaps hit for 3.3 and stun for 7.5s. +5 range, sees hidden zombies. Thunderclap: every 10s, 4.6 damage and a 5s stun to every zombie near its target.', cost: 975,
        ...astra(2, 40, 7.5, 22, [THUNDERCLAP]) },
      { name: 'Conduit', desc: '+10 range. Conduit: every 15s, it and the Astrapomancers and Magei near it attack 50% faster for 10s. It stacks with no limit.', cost: 1500,
        ...astra(3, 40, 7.5, 32, [THUNDERCLAP, CONDUIT]) },
    ],
  },
  helloc: {
    name: 'Helloc',
    price: 100000,
    cost: 300000,
    limit: 1,
    mapLimit: 1,
    supercharge: { cost: 375000, units: 0.25 },
    blurb: 'A smaller Helloc, the demon boss: crimson spikes, horns in red chains, wings that can\'t fly and the greatsword Defender\'s Fall. A huge slow swing that hits a crowd. Annihilation wipes out hurt zombies (not bosses), Lava Waves roll down the whole path, and at tier 4 a Spawn of Helloc fights on the path. Only one on the whole map.',
    tip: 'Upgrades don\'t add range, so put him near the middle of the map.',
    levels: [
      { name: 'Helloc', desc: 'Swings Defender\'s Fall every 5s for 8,333 damage to every zombie near the one it hits.', ...helloc(100000) },
      { name: "Defender's Fall", desc: "+3,333 damage. Defender's Fall: a third bullet, a third magic and a third true damage. Annihilation: every 3s, every zombie in range under 75% health is wiped out (not bosses).", cost: 300000,
        ...helloc(140000, { split: true, spells: [ANNIHILATE(0.75)] }) },
      { name: 'Lava Waves', desc: '+3,333 damage. Lava Waves: every 20s, a wave of lava rolls from the base to the start and hits every zombie on the map, harder the farther it has rolled.', cost: 300000,
        ...helloc(180000, { split: true, spells: [ANNIHILATE(0.75), LAVA] }) },
      { name: 'Annihilation', desc: '+6,667 damage. Annihilation wipes out every zombie in range that isn\'t a boss.', cost: 300000,
        ...helloc(260000, { split: true, spells: [ANNIHILATE(1), LAVA] }) },
      { name: 'Infernal Guard', desc: '+7,500 damage. Infernal Guard: a Spawn of Helloc (20,000 health, 8,333 damage a swing) fights on the path. It comes back 120s after it falls.', cost: 300000,
        ...helloc(350000, { split: true, spells: [ANNIHILATE(1), LAVA], guard18: true, unit: spawnOfHelloc, maxUnits: 1, spawnEvery: 120 }) },
    ],
  },
};
