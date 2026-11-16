// Wave 19: six alternate forms, most of them barracks.
//   Berserker (Assassin form): a barracks with one wild axe fighter. He heals by the damage he
//       deals (Lifesteal), and his upgrades add Savage Strike, Ferocious Leap and Whirlwind.
//   TimeBender (Time Dilator form): an old time wizard who never attacks. He resets cooldowns,
//       sends zombies back down the path, stops them in time, and at tier 4 opens a time rift
//       that makes every tower much faster. Only one per player.
//   Siphoner (Necromancer form): a dark mage whose slow magic siphon grows stronger with every
//       hit, with no limit. Upgrades heal troops, poison, slow, and can bring fallen troops back.
//   Dreamknight (Barracks form): knights in dark purple armor whose swords hit with magic. The
//       barracks itself fires an Eldritch Blast, even at flyers.
//   Knight (Enforcer form): a cheap castle barracks of armored knights that hit hard. Multi-Attack
//       sometimes hits twice, then sweeps the zombies around.
//   Golem (Juggernaut form): one huge rock giant that takes and deals huge damage, but is slow.
//       Only 2 per player. Can't hit flyers.
//
// Damage is the spec's divided by 12, like waves 16-18 (user rule). Health, heals, prices, ranges
// and timings are as written. "Rally range" is the barracks' range.
//
// New mechanics (sim code in sim/parts/nineteenth.js):
//   x19 on a troop: its swings go through swing19, which reads:
//     lifesteal: heals by the damage it deals. magic: its swings are magic damage.
//     savage / leap / whirl (Berserker): { mult, every, radius }: every `every` s one swing is a
//       special one (Savage Strike: x mult on its zombie; Leap and Whirlwind: x mult on every
//       zombie within `radius`).
//     multi19 (Knight Multi-Attack): that chance a swing hits twice, then sweeps the zombies near it.
//   hit19 on a level: its own attack (fire19): 'siphon' (Siphoner), 'eldritch' (Dreamknight).
//   thirst (Siphoner): each siphon adds `pct` of its damage to its attack for good, at least `min`
//       and at most `max` each time. leech: troops near its target heal `pct` of the damage
//       (between min and max health). rot: poison that stacks. malefice: a slow that stacks. danse:
//       that chance each siphon brings back a fallen troop of a barracks anywhere on the map.
//   abilities with x19 (TimeBender, use19): fabricate, reverse, stopTime, greaterWarp. They all
//       use themselves during waves (`auto`), and can be used by hand too.
//   supercharge unitHp / unitDmg: more health / damage for the troops, each Supercharge.
//   supercharge reverse (TimeBender): +that many zombies sent back by Reverse Timeline (every
//       full 1 is one more, up to reverseMax more). supercharge thirstMax (Siphoner): a higher cap.

const r = (n) => Math.round(n * 100) / 100;
const D = (n) => r(n / 12); // the spec's damage, divided by 12

const RALLY = { key: 'rally', name: 'Set Rally Point', desc: 'Click the path in range: its troops stand there and stop moving around', cooldown: 1, aim: true, radius: 2 };
const ROAM = { key: 'roam', name: 'Roam', desc: 'Its troops move around in its range again, going after zombies', cooldown: 1 };
const BARRACKS_AB = [RALLY, ROAM];

// ------------------------------------------------------------------ Berserker

const SAVAGE = { mult: 3, every: 8 };
const LEAP = { mult: 2, every: 15, radius: 4 }; // radius (guess)
const WHIRL = { mult: 0.5, every: 20, radius: 5 }; // radius (guess)
const berserker = (lv, hp, damage, speed) => ({
  name: 'Berserker', model: `berserkerUnit${lv}`, soldiers: 1, hp, speed: 0, walk: 7, guard: true, still: true, block: true, flying: false,
  x19: true, lifesteal: 1, gun: { damage: D(damage), cooldown: r(1 / speed), range: 3 },
  ...(lv >= 1 ? { savage: SAVAGE } : {}), ...(lv >= 2 ? { leap: LEAP } : {}), ...(lv >= 3 ? { whirl: WHIRL } : {}),
});

// ------------------------------------------------------------------ TimeBender

const FABRICATE = { key: 'fabricate', x19: true, auto: true, name: 'Fabricate Epochs', desc: 'A tower in range: a barracks sends its next troop in 1s; any other tower gets all its ability cooldowns back to 0 (not ultimates)', cooldown: 40 };
const REVERSE = { key: 'reverse', x19: true, auto: true, name: 'Reverse Timeline', desc: 'Sends the zombie in range closest to the base back to a random spot between it and the start. Not bosses, not zombies fighting troops', cooldown: 12 };
const STOP_TIME = { key: 'stopTime', x19: true, auto: true, name: 'Stop Time', desc: 'Stuns a zombie in range for 20s, or adds 20s to its stun. Not bosses', cooldown: 30, time: 20 };
const GREATER_WARP = { key: 'greaterWarp', x19: true, auto: true, name: 'Greater Time Warp', desc: 'Every tower (not TimeBenders) attacks 400% faster for 10s. Mass Reversal: a quarter of the zombies (at least 5, at most 15, not bosses) go back to the start', cooldown: 120, haste: 4, duration: 10, share: 0.25, min: 5, max: 15 };
const ULT = 100; // abilities with a cooldown this long or longer count as ultimates (guess)

// ------------------------------------------------------------------ Siphoner

const SI_RANGE = 15; // (guess)
const thirst = (pct, min, max) => ({ pct, min: D(min), max: D(max) });
const LEECH = { pct: 0.1, min: 5, max: 40 };
const ROT = { dps: D(150), time: 5, add: D(150), addT: 1 }; // 750 over 5s; +150 a tick and +1s each time
const MALEFICE = { slow: 0.15, time: 5, add: 0.01, max: 0.75 };
const siphon = (lv, range, extra = {}) => ({ damage: D(5), cooldown: 10, range, hidden: lv >= 2, hit19: 'siphon', ...extra });

// ------------------------------------------------------------------ Dreamknight

const dreamknight = (lv, hp, damage, block) => ({
  name: 'Dreamknight', model: `dreamknightUnit${lv}`, soldiers: 1, hp, speed: 0, walk: 6, guard: true, still: true, block: true, flying: false,
  x19: true, magic: true, blockChance: block, gun: { damage: D(damage), cooldown: 1.2, range: 3 },
});
// The barracks' Eldritch Blast uses its knights' damage (guess); 5s before upgrades (guess), -1s each.
const dkLevel = (lv, hp, damage, block, range, blastCd) => ({
  damage: D(damage), cooldown: blastCd, range, hidden: lv >= 2, hit19: 'eldritch', guard18: true, maxUnits: 3, spawnEvery: 12,
  abilities: BARRACKS_AB, unit: dreamknight(lv, hp, damage, block),
});

// ------------------------------------------------------------------ Knight

const knight = (lv, hp, damage, multi, block) => ({
  name: 'Knight', model: `knightUnit${lv}`, soldiers: 1, hp, speed: 0, walk: 6, guard: true, still: true, block: true, flying: false,
  x19: true, defense: 0.2, multi19: multi, blockChance: block, gun: { damage: D(damage), cooldown: 1.2, range: 3 },
});

// ------------------------------------------------------------------ Golem

const golem = (lv, hp, damage) => ({
  name: 'Golem', model: `golemUnit${lv}`, soldiers: 1, hp, speed: 0, walk: 3, guard: true, still: true, block: true, flying: false,
  x19: true, gun: { damage: D(damage), cooldown: 3, range: 3.5 },
});

export const NINETEENTH_TOWERS = {
  bloodBerserker: {
    name: 'Berserker',
    altOf: 'assassin',
    form: 'Berserker',
    shards: 1,
    price: 0,
    cost: 1000,
    limit: 4,
    kind: 'spawner',
    spawnEvery: 10,
    unitsDie: true,
    blurb: 'An alternate Assassin: a barracks with one wild Berserker who wears little armor and swings two war axes. Lifesteal heals him by the damage he deals, so he holds fast zombies in place for a long time. Upgrades add Savage Strike, Ferocious Leap and Whirlwind.',
    tip: 'Strong early: put him where fast zombies come in.',
    levels: [
      { name: 'Berserker', desc: 'Keeps a Berserker on the path (200 health, 4.2 damage a swing). Lifesteal: he heals by the damage he deals.', range: 10, hidden: false, abilities: BARRACKS_AB, maxUnits: 1,
        unit: berserker(0, 200, 50, 1) },
      { name: 'Sharpened Axes', desc: 'Constitution Training: +200 health (400). Sharpened Axes: +66.7 damage (70.8). Savage Strike: every 8s a swing hits for 3x. +8 range.', cost: 5000, range: 18, hidden: false, abilities: BARRACKS_AB, maxUnits: 1,
        unit: berserker(1, 400, 850, 1) },
      { name: 'Fearsome Berserker', desc: '+400 health (800). Bloodied Axes: +116.7 damage (187.5). Pure Rage: 75% faster swings. Ferocious Leap: every 15s he crushes the zombies near him for 2x. +15 range.', cost: 35000, range: 33, hidden: false, abilities: BARRACKS_AB, maxUnits: 1,
        unit: berserker(2, 800, 2250, 1.75) },
      { name: 'BLOOD, CARNAGE, BATTLE', desc: 'Fearless: +900 health (1,700). Bloody Carnage: +166.7 damage (354.2). Swings 125% faster again. Whirlwind: every 20s, half damage to every zombie near him. +20 range.', cost: 100000, range: 53, hidden: false, abilities: BARRACKS_AB, maxUnits: 1,
        unit: berserker(3, 1700, 4250, 3) },
    ],
  },
  timeBender: {
    name: 'TimeBender',
    altOf: 'timeDilator',
    form: 'TimeBender',
    shards: 3,
    price: 0,
    cost: 250,
    limit: 1,
    kind: 'support',
    noBuff: true,
    supercharge: { cost: 125000, reverse: 0.25, reverseMax: 10 },
    ult: ULT,
    blurb: 'An alternate Time Dilator: an old man with a long beard, glowing eyes and a staff with a time orb. He never attacks. He resets cooldowns, sends zombies back down the path and stops them in time. At tier 4 his time rift makes every tower 400% faster. Bosses ignore his tricks. Only one per player.',
    tip: 'Keep him off the path but close to it. Put him by towers with long ability cooldowns.',
    levels: [
      { name: 'TimeBender', desc: 'Never attacks. Upgrade him to bend time.', range: 25, hidden: false },
      { name: 'Fabricate Epochs', desc: 'Fabricate Epochs (every 40s): a barracks in range sends its next troop in 1s; any other tower gets its ability cooldowns back to 0 (not ultimates).', cost: 1000, range: 25, hidden: false,
        abilities: [FABRICATE] },
      { name: 'Reverse Timeline', desc: 'Reverse Timeline (every 12s): the zombie in range closest to the base goes back to a random spot between it and the start. Not bosses, not zombies fighting troops.', cost: 2500, range: 25, hidden: false,
        abilities: [FABRICATE, REVERSE] },
      { name: 'Stop Time', desc: 'Stop Time (every 30s): stuns a zombie in range for 20s, or adds 20s to its stun. Not bosses.', cost: 4500, range: 25, hidden: true,
        abilities: [FABRICATE, REVERSE, STOP_TIME] },
      { name: 'Greater Time Warp', desc: 'Greater Time Warp (every 120s): every tower except TimeBenders attacks 400% faster for 10s. Mass Reversal: a quarter of the zombies on the map (at least 5, at most 15, not bosses) go back to the start.', cost: 100000, range: 25, hidden: true,
        abilities: [FABRICATE, REVERSE, STOP_TIME, GREATER_WARP] },
    ],
  },
  siphoner: {
    name: 'Siphoner',
    altOf: 'necromancer',
    form: 'Siphoner',
    shards: 1,
    price: 0,
    cost: 100,
    limit: 6,
    damageType: 'magic',
    supercharge: { cost: 312500, thirstMax: D(25) },
    blurb: 'An alternate Necromancer: a hooded dark mage with a bat-winged staff that pulls red streams out of zombies. Its magic siphon is very weak and very slow at first, but every hit makes it stronger, with no limit. Upgrades heal troops, poison and slow, and at the top can bring fallen troops back.',
    tip: 'Place it early so it grows all game, next to where your barracks fight.',
    levels: [
      { name: 'Siphoner', desc: 'Siphons one zombie every 10s for 0.4 magic damage.', ...siphon(0, SI_RANGE) },
      { name: 'Sanguine Thirst', desc: 'Sanguine Thirst: each siphon adds 23% of its damage to its attack for good (0.08 to 16.7 each time). Leech: troops near its target heal 10% of the damage (5 to 40 health).', cost: 1000,
        ...siphon(1, SI_RANGE, { thirst: thirst(0.23, 1, 200), leech: LEECH }) },
      { name: 'Soulrot', desc: 'Sanguine Thirst 21% (0.4 to 5 each time). Soulrot: poison, 62.5 over 5s; each new siphon adds 12.5 a second and 1s more. Sees hidden zombies.', cost: 5000,
        ...siphon(2, SI_RANGE, { thirst: thirst(0.21, 5, 60), leech: LEECH, rot: ROT }) },
      { name: 'Malefice Animus', desc: 'Sanguine Thirst 19% (0.4 to 6.7 each time). Malefice Animus: zombies it siphons walk 15% slower for 5s, 1% more each time (up to 75%). +2 range.', cost: 25000,
        ...siphon(3, SI_RANGE + 2, { thirst: thirst(0.19, 5, 80), leech: LEECH, rot: ROT, malefice: MALEFICE }) },
      { name: 'Danse Macabre', desc: 'Sanguine Thirst 17% (0.4 to 8.3 each time). Danse Macabre: each siphon has a 5% chance to bring back a fallen troop of a barracks anywhere on the map. +2 range.', cost: 250000,
        ...siphon(4, SI_RANGE + 4, { thirst: thirst(0.17, 5, 100), leech: LEECH, rot: ROT, malefice: MALEFICE, danse: 0.05 }) },
    ],
  },
  dreamknight: {
    name: 'Dreamknight',
    altOf: 'barracks',
    form: 'Dreamknight',
    shards: 2,
    price: 0,
    cost: 20000,
    limit: 3,
    damageType: 'magic',
    supercharge: { cost: 100000, unitHp: 75, lethality: 0.25 },
    blurb: 'An alternate Barracks: three knights in dark purple armor with glowing blue runes. Their swords hit with magic, and the barracks itself fires an Eldritch Blast like a normal tower, even at flyers. Less tough than the Defender, but much stronger.',
    tip: 'The blast hits flyers, so it helps where your other barracks can\'t.',
    levels: [
      { name: 'Dreamknight', desc: 'Keeps 3 Dreamknights on the path (1,100 health, 41.7 magic damage a swing, block 5%). Eldritch Blast: every 5s, 41.7 magic damage to a zombie in range.', ...dkLevel(0, 1100, 500, 0.05, 15, 5) },
      { name: 'Eldritch Blast II', desc: 'Eldritch Blast every 4s.', cost: 20000, ...dkLevel(1, 1100, 500, 0.05, 15, 4) },
      { name: 'Ethereal Aura', desc: 'Ethereal Aura: +375 health (1,475). +5 range, block 10%. Eldritch Blast III: every 3s. Enchanted Armaments II: +66.7 damage (108.3).', cost: 50000, ...dkLevel(2, 1475, 1300, 0.1, 20, 3) },
      { name: 'Eldritch Powers', desc: 'Eldritch Powers: +500 health (1,975). +8 range, block 20%. Eldritch Blast IV: every 2s. Enchanted Armaments III: +66.7 damage (175).', cost: 80000, ...dkLevel(3, 1975, 2100, 0.2, 28, 2) },
    ],
  },
  steelKnight: {
    name: 'Knight',
    altOf: 'enforcer',
    form: 'Knight',
    shards: 1,
    price: 0,
    cost: 900,
    limit: 6,
    kind: 'spawner',
    spawnEvery: 10,
    unitsDie: true,
    blurb: 'An alternate Enforcer: a small castle with torches and a blue flag. Its Knights wear steel over chain mail, a blue-feathered helmet and swing a big two-handed sword. Medium armor and high damage. Multi-Attack sometimes hits twice, then sweeps the zombies around.',
    tip: 'Cheap and strong early. Put the castle where the path bends so the Knights meet zombies head on.',
    levels: [
      { name: 'Knight', desc: 'Keeps 2 Knights on the path (300 health, 20% armor, 8.3 damage a swing).', range: 12, hidden: false, abilities: BARRACKS_AB, maxUnits: 2,
        unit: knight(0, 300, 100, 0, 0) },
      { name: 'Multi-Attack', desc: 'Multi-Attack: 15% chance to hit twice, then sweep. Block 5%. +12.5 damage (20.8). +50 health.', cost: 1000, range: 12, hidden: false, abilities: BARRACKS_AB, maxUnits: 2,
        unit: knight(1, 350, 250, 0.15, 0.05) },
      { name: 'More Knights', desc: 'Multi-Attack 30%. Block 10%. +22.9 damage (43.8). +50 health. 3 Knights.', cost: 1200, range: 12, hidden: false, abilities: BARRACKS_AB, maxUnits: 3,
        unit: knight(2, 400, 525, 0.3, 0.1) },
      { name: 'Knight Order', desc: 'Multi-Attack 50%. Block 15%. +41.7 damage (85.4). +75 health. 4 Knights.', cost: 2000, range: 12, hidden: false, abilities: BARRACKS_AB, maxUnits: 4,
        unit: knight(3, 475, 1025, 0.5, 0.15) },
    ],
  },
  stoneGolem: {
    name: 'Golem',
    altOf: 'maceJuggernaut',
    form: 'Golem',
    shards: 3,
    price: 0,
    cost: 35000,
    limit: 2,
    kind: 'spawner',
    spawnEvery: 30,
    unitsDie: true,
    supercharge: { cost: 187500, unitHp: 500, unitDmg: D(500) },
    blurb: 'An alternate Juggernaut: a barracks with one giant rock Golem in a steel chest plate, swinging a rock hammer. He takes and deals huge damage, but walks and swings slowly and can\'t hit flyers. Only 2 per player.',
    tip: 'Put him in front of your strongest towers: very little gets past him.',
    levels: [
      { name: 'Golem', desc: 'Keeps a Golem on the path (4,000 health, 166.7 damage a swing every 3s).', range: 10, hidden: false, abilities: BARRACKS_AB, maxUnits: 1,
        unit: golem(0, 4000, 2000) },
      { name: 'Hardened Rock', desc: '+900 health (4,900). +2 range. +62.5 damage (229.2).', cost: 40000, range: 12, hidden: false, abilities: BARRACKS_AB, maxUnits: 1,
        unit: golem(1, 4900, 2750) },
      { name: 'Boulder Fists', desc: '+1,500 health (6,400). +3 range. +208.3 damage (437.5).', cost: 80000, range: 15, hidden: false, abilities: BARRACKS_AB, maxUnits: 1,
        unit: golem(2, 6400, 5250) },
      { name: 'Mountain Heart', desc: '+2,500 health (8,900). +5 range. +416.7 damage (854.2). 3 Golems.', cost: 150000, range: 20, hidden: false, abilities: BARRACKS_AB, maxUnits: 3,
        unit: golem(3, 8900, 10250) },
    ],
  },
};
