// Halloween Night 3 (2026-11-11 user spec): 35 waves on the crater map (key `nightmare`). The
// Halloween Event (DIFFICULTIES.halloween) plays these when that map is picked (its `mapModes`).
// The enemies are its own (n3*), even where an older mode has one with the same name.
//
// The spec gives the waves, what is new in each, and the final boss's numbers. Every other health,
// speed, gap, timer, range and cooldown here is a guess (see the memory notes). Speeds are written
// like the spec's (Average 1) and x3 in the game, like Halloween Night 2.
// How they act: src/sim/parts/nightmare.js. How they look: src/newmodels/halloween3.js.

/** Kill reward and base damage from health (the first Halloween Event's curve). */
const reward = (hp) => Math.max(2, Math.round(1.5 * hp ** 0.55));
const dmg = (hp) => Math.max(1, Math.round(hp ** 0.5 / 2));
const E = (name, hp, speed, extra = {}) => ({ name, hp, speed: Math.round(speed * 3 * 100) / 100, reward: reward(hp), damage: dmg(hp), scale: 1, ...extra });
/** A humanoid dressed by `hw3` (newmodels/halloween3.js). */
const H = (name, hp, speed, look, skin, shirt, pants, extra = {}) => E(name, hp, speed, { hw3: look, skin, shirt, pants, face: 'blank', ...extra });

const NEW = {
  // ------------------------------------------------------------ act 1 (waves 1-7)
  n3Gourdian: H('Gourdian', 30, 2.5, 'gourd', 0xff8f00, 0x33691e, 0x3e2723, {
    intro: '🎃 HALLOWEEN NIGHT 3! Monsters pour out of the Nightmare Realm portal. 35 waves!' }),
  n3HexSpawn: H('Hex Spawn', 20, 3.5, 'hexSpawn', 0x7b1fa2, 0x4a148c, 0x311b92, { scale: 0.75 }),
  n3Corrupted: H('Corrupted', 25, 3, 'corrupted', 0x212121, 0x1a1a1a, 0x111111),
  n3PumpkinSpider: E('Pumpkin Spider', 25, 6, { h: 2.4, model: 'n3PumpSpider', skin: 0xff6d00,
    intro: '🕷️ Pumpkin Spiders are FAST.' }),
  n3HexMinion: H('Hex Minion', 35, 3, 'hexMinion', 0x8e24aa, 0x4a148c, 0x2a0a3c, { scale: 0.85 }),
  n3BigGourdian: H('Big Gourdian', 120, 2, 'gourd', 0xef6c00, 0x2e5d1e, 0x3e2723, { scale: 1.35, big: true }),
  n3HexWraith: H('Hex Wraith', 60, 4, 'hexWraith', 0x9575cd, 0x311b92, 0x1a0f40),
  n3Corroded: H('Corroded', 80, 2.5, 'corroded', 0x558b2f, 0x33691e, 0x1b3a12),
  n3Ghost: E('Ghost', 50, 3.5, { h: 4.2, model: 'n3Soul', soul: 'ghost', skin: 0xeceff1, scale: 1.5 }),
  n3PumpkinBat: E('Pumpkin Bat', 40, 5, { h: 2.4, model: 'h2Bat', skin: 0xe65100 }),
  n3HexRevenant: H('Hex Revenant', 200, 2.5, 'hexRevenant', 0x7e57c2, 0x37474f, 0x263238, { scale: 1.1 }),
  n3Reaper: E('Reaper', 150, 3, { h: 5.2, model: 'h2Reaper', reaper: 'plain', skin: 0x424242, hidden: true,
    intro: '💀 Reapers and Forsaken Skulls are HIDDEN. You need hidden detection now!' }),
  n3ForsakenSkull: E('Forsaken Skull', 250, 3, { h: 3.4, model: 'hcSkull', skin: 0xd7ccc8, eyeC: 0x76ff03, hidden: true }),
  n3TombRaider: H('Tomb Raider', 180, 4, 'tombRaider', 0xd7ccc8, 0x8d6e63, 0x5d4037),
  n3StrongReaper: E('Strong Reaper', 400, 2.5, { h: 5.2, model: 'h2Reaper', reaper: 'strong', skin: 0x455a64, hidden: true }),
  // Spits out 2 Hex Spawn every 8 s.
  n3HexMimic: E('Hex Mimic', 500, 2, { h: 3.0, model: 'n3Mimic', skin: 0x6d4c41,
    summon: { type: 'n3HexSpawn', n: 2, every: 8, noCash: true },
    intro: '📦 Hex Mimics spit out Hex Spawn every 8 seconds. Those give no cash.' }),
  n3HexCorpse: H('Hex Corpse', 300, 2, 'hexCorpse', 0x9e9d24, 0x4a148c, 0x37474f),
  // Mini-boss. Wrap: every 15 s it wraps the tower nearest to it in vines: stunned for 5 s.
  n3CurseVine: E('Curse Vine', 4000, 1.5, { h: 5.0, model: 'n3Vine', skin: 0x2e7d32, scale: 1.4, boss: true,
    wrap: { every: 15, range: 30, stun: 5 },
    intro: '🌿 MINI-BOSS: CURSE VINE! Every 15 seconds it wraps the nearest tower in vines for 5 seconds.' }),
  n3SkullReaper: E('Skull Reaper', 600, 3, { h: 5.2, model: 'h2Reaper', reaper: 'skull', skin: 0xe0d6c0, hidden: true }),
  n3LostSoul: E('Lost Soul', 100, 5, { h: 3.6, model: 'n3Soul', soul: 'lost', skin: 0x80deea, scale: 1.2,
    intro: '👻 Lost Souls: quick little spirits.' }),

  // ------------------------------------------------------------ act 2 (waves 8-14)
  n3Chompski: H('Chompski', 1200, 2.5, 'chompski', 0x8d6e63, 0x5d4037, 0x3e2723, { scale: 1.3 }),
  // Drops a puddle every 8 s: enemies standing in it heal 4% of their health a second.
  n3BlightWalker: H('Blight Walker', 2000, 2, 'blight', 0x9ccc65, 0x33691e, 0x1b3a12, { scale: 1.2,
    puddle: { every: 8, radius: 7, life: 6, heal: 0.04 },
    intro: '🟢 Blight Walkers leave HEALING PUDDLES. Enemies in them heal. Kill them early!' }),
  n3TormentedSoul: E('Tormented Soul', 400, 4, { h: 4.0, model: 'n3Soul', soul: 'tormented', skin: 0xef5350, scale: 1.4 }),
  n3RottingTerror: H('Rotting Terror', 15000, 1.5, 'rotting', 0x7c8b3a, 0x3e4a1e, 0x2a2f14, { scale: 1.8, boss: true,
    slam: { range: 12, every: 15, stun: 2 },
    intro: '🧟 MINI-BOSS: ROTTING TERROR! Big and slow. Its stomp stuns the towers around it.' }),
  // Explodes when it dies: towers close by are stunned 3 s.
  n3JackLantern: E('Jack O\' Lantern', 1500, 1.5, { h: 4.4, model: 'h2Pumpkin', skin: 0xff6d00, deathBlast: { radius: 12, stun: 3 },
    intro: '🎃 Jack O\' Lanterns EXPLODE when they die: towers nearby are stunned for 3 seconds.' }),
  n3CursedHorror: H('Cursed Horror', 1000, 3, 'horror', 0x4a148c, 0x1a0f40, 0x120a2e, { scale: 1.15 }),
  n3Airbarrel: E('Skeleton Airbarrel', 800, 2.5, { h: 3.6, model: 'n3Airbarrel', skin: 0x8d6e63, flying: true,
    intro: '🎈 FLYERS! Skeleton Airbarrels float over the path. You need towers that hit air.' }),
  n3Scarecrow: E('Scarecrow', 1500, 2.5, { skin: 0xf9a825, shirt: 0x6d4c41, pants: 0x1565c0, face: 'blank', hw2: 'scarecrow', scale: 1.15 }),
  n3Enigma: E('Enigma', 1800, 3, { h: 3.6, model: 'hcEye', skin: 0x1a1a1a, iris: 0xd500f9, veins: 0x7c4dff }),
  n3PumpkinSpirit: E('Pumpkin Spirit', 2500, 9, { h: 3.8, model: 'n3PumpSpirit', skin: 0xff9100,
    intro: '🔥 Pumpkin Spirits are VERY fast!' }),
  n3VineGolem: E('Vine Golem', 12000, 1.5, { h: 5.5, model: 'hcGolem', skin: 0x33691e, eyeC: 0x76ff03, spiky: 1, scale: 1.3,
    intro: '🌳 Vine Golems are slow, but very tough.' }),
  n3HexDrako: E('Hex Drako', 1500, 4, { h: 3.6, model: 'n3Drako', skin: 0x6a1b9a, flying: true }),
  // Boss: calls up 3 Hex Minions and a Hex Wraith every 12 s.
  n3Conjurer: H('Conjurer', 40000, 1.5, 'conjurer', 0x9575cd, 0x4a148c, 0x2a0a3c, { scale: 1.8, boss: true, bar: true, barName: 'THE CONJURER',
    summon: [{ type: 'n3HexMinion', n: 3, every: 12, noCash: true }, { type: 'n3HexWraith', n: 1, every: 12, noCash: true }],
    intro: '🔮 BOSS: THE CONJURER! He calls up Hex Minions and Wraiths. Those give no cash.' }),
  // Calls up 2 Tormented Souls every 12 s.
  n3Tormentor: H('Tormentor', 12000, 2, 'tormentor', 0x5d4037, 0x3e2723, 0x1a1a1a, { scale: 1.6,
    summon: { type: 'n3TormentedSoul', n: 2, every: 12, noCash: true },
    intro: '⛓️ Tormentors call up Tormented Souls every 12 seconds.' }),

  // ------------------------------------------------------------ act 3 (waves 15-21)
  n3BunnyHazmask: H('Bunny Hazmask', 3000, 3, 'bunnyMask', 0xfff59d, 0xfdd835, 0x5d4037),
  n3Hulk: H('Nightmarish Hulk', 8000, 2, 'hulk', 0x5e35b1, 0x311b92, 0x1a0f40, { scale: 1.6 }),
  n3FlyingPumpkin: E('Flying Pumpkin', 2000, 3.5, { h: 3.8, model: 'n3PumpSpirit', wings: 1, skin: 0xff6d00, flying: true }),
  // 80% defense: takes a fifth of the damage.
  n3Eclipsed: H('Eclipsed', 6000, 2, 'eclipsed', 0x121212, 0x0d0d0d, 0x0d0d0d, { scale: 1.2, armor: 0.8,
    intro: '🌑 Eclipsed have 80% DEFENSE: they take only a fifth of the damage. Use defense piercing!' }),
  n3Ghoul: H('Ghoul', 3000, 12, 'ghoul', 0x8d9e8a, 0x37474f, 0x263238, {
    intro: '💨 Ghouls are EXTREMELY fast!' }),
  // Every 6 s: a shield of 8% of max health on itself and the enemies around it.
  n3HexWeaver: H('Hex Weaver', 5000, 3, 'hexWeaver', 0xb39ddb, 0x4527a0, 0x311b92, { scale: 1.15,
    shieldPulse: { every: 6, radius: 10, flat: 0, pct: 0.08 },
    intro: '🧵 Hex Weavers shield themselves and the enemies around them.' }),
  // Releases 20 Lost Souls when it dies.
  n3Apostle: H('Apostle', 8000, 2, 'apostle', 0xeceff1, 0xb0bec5, 0x90a4ae, { scale: 1.3,
    deathSpawn: { fixed: [['n3LostSoul', 20]] },
    intro: '🕯️ Apostles release 20 Lost Souls when they die!' }),
  n3Withered: H('Withered', 7000, 2.5, 'withered', 0x8d8a80, 0x4e4a40, 0x3a362e, { scale: 1.25 }),
  n3PumpkinBalloon: E('Pumpkin Balloon', 6000, 2, { h: 6.0, model: 'n3PumpBalloon', skin: 0xff6d00, flying: true }),
  // Boss. Every 20 s: towers within 30 work 35% slower for 8 s.
  n3Titus: H('Corrupted Titus', 100000, 1.5, 'titus', 0x37474f, 0x4a148c, 0x212121, { scale: 2.2, boss: true, bar: true, barName: 'CORRUPTED TITUS',
    fatigue: { every: 20, radius: 30, amt: 0.35, time: 8 },
    intro: '🛡️ BOSS: CORRUPTED TITUS! Every 20 seconds he makes the towers around him fire 35% slower.' }),
  n3BigPumpkinSpirit: E('Big Pumpkin Spirit', 10000, 6, { h: 3.8, model: 'n3PumpSpirit', big: true, skin: 0xff3d00, scale: 1.6 }),

  // ------------------------------------------------------------ act 4 (waves 22-35)
  // Mini-boss. Sword swing: stuns the towers around it for 3.5 s every 15 s.
  n3HexMaw: H('Hex\'s Maw', 150000, 1.5, 'maw', 0x4a148c, 0x311b92, 0x1a0f40, { scale: 2.4, boss: true, bar: true, barName: 'HEX\'S MAW',
    slam: { range: 15, every: 15, stun: 3.5 },
    intro: '⚔️ MINI-BOSS: HEX\'S MAW! Its sword swing stuns the towers around it for 3.5 seconds.' }),
  n3PlagueHazmask: H('Plague Hazmask', 6000, 3, 'plagueMask', 0x424242, 0x33691e, 0x1b3a12),
  // Drops 6 Red Skeletons when it dies.
  n3CoffinHead: H('Coffin Head', 25000, 2, 'coffin', 0x9e9e9e, 0x212121, 0x111111, { scale: 1.5,
    deathSpawn: { fixed: [['n3RedSkeleton', 6]] },
    intro: '⚰️ Coffin Heads drop 6 Red Skeletons when they die.' }),
  n3RedSkeleton: H('Red Skeleton', 1500, 4, 'skeleton', 0xc62828, 0xc62828, 0xc62828),
  n3BigReaper: E('Big Reaper', 20000, 2, { h: 5.4, model: 'h2Reaper', reaper: 'big', skin: 0x212121, hidden: true, scale: 1.5 }),
  n3GraveGuardian: H('Grave Guardian', 35000, 1.5, 'guardian', 0x78909c, 0x546e7a, 0x37474f, { scale: 1.8,
    intro: '🪦 Grave Guardians are very slow and VERY tough.' }),
  // Boss. Hammer slam: stuns the towers around him for 3 s every 12 s.
  n3JackTerror: H('Jack the Terror', 250000, 1.8, 'jackTerror', 0xff6d00, 0x1a1a1a, 0x111111, { scale: 2.5, boss: true, bar: true, barName: 'JACK THE TERROR',
    slam: { range: 14, every: 12, stun: 3 },
    intro: '🔨 BOSS: JACK THE TERROR! His hammer stuns the towers around him.' }),
  n3EvilJack: E('Evil Jack O\' Lantern', 12000, 1.6, { h: 4.6, model: 'h2Pumpkin', evil: true, skin: 0x6a1b9a, scale: 1.4,
    deathBlast: { radius: 12, stun: 3, unitDmg: 100 },
    intro: '😈 Evil Jack O\' Lanterns explode too: a 3 second stun, and 100 damage to your units.' }),
  n3GiantBat: E('Giant Bat', 6000, 5, { h: 2.4, model: 'h2Bat', skin: 0x311b92, scale: 2, flying: true }),
  n3HexReaper: E('Hex Reaper', 15000, 3, { h: 5.2, model: 'h2Reaper', reaper: 'hex', skin: 0x4a148c, hidden: true, scale: 1.2 }),
  n3WingedReaper: E('Winged Reaper', 8000, 4, { h: 5.2, model: 'h2Reaper', reaper: 'winged', skin: 0x4a148c, hidden: true, flying: true }),
  // Boss. Blood Ritual every 25 s: every enemy gets a shield of 10% of its health and runs 40% faster for 6 s.
  n3HarvestWitch: E('Harvest Witch', 300000, 1.5, { h: 6.8, skin: 0x9ccc65, shirt: 0x4a0d0d, pants: 0x1a1a1a, face: 'zombie', hw2: 'witch', hw3: 'harvest', scale: 2.2,
    boss: true, bar: true, barName: 'THE HARVEST WITCH',
    ritual: { every: 25, shield: 0.1, speed: 0.4, time: 6 },
    intro: '🩸 BOSS: THE HARVEST WITCH! Her Blood Ritual shields EVERY enemy and makes them faster.' }),
  // Boss. Every 20 s he throws 4 skulls: each stuns a tower for 3 s.
  n3Conserver: H('Corrupted Conserver', 400000, 1.4, 'conserver', 0x263238, 0x1b5e20, 0x111111, { scale: 2.4, boss: true, bar: true, barName: 'CORRUPTED CONSERVER',
    skulls: { every: 20, n: 4, range: 60, stun: 3 },
    intro: '💀 BOSS: CORRUPTED CONSERVER! His skulls stun 4 towers for 3 seconds.' }),

  // Final boss (numbers from the spec). It skips the path and walks straight from the portal to the
  // base (`beeline`). Speed 1, 1.5 below half health. 10% defense. Two phases: The Metamorphosis at 50%.
  n3Drako: { h: 7.0, name: 'Primordial Drakobloxxer', hp: 600000, speed: 3, reward: 0, damage: 1e6, scale: 3.2, model: 'n3Drako', primordial: true,
    skin: 0x1a0033, boss: true, bar: true, barName: 'PRIMORDIAL DRAKOBLOXXER', barSub: 'Phase 1', armor: 0.1, stunImmune: true, freezeImmune: true, beeline: true,
    drako: {
      blast: { every: 60, stun: 3, units: 1500, width: 14 }, // Nightmare Blast: a death beam across the middle of the map
      summon: { every: 40, boss: 1, spiders: 4 }, // 1 Unknown Boss + 4 Pumpkin Spiders
      storm: { every: 40, radius: 40, amt: 0.4, time: 8 }, // Nightmare Storm: towers nearby fire 40% slower
      morph: { at: 0.5, speed: 4.5 }, // The Metamorphosis
      laser: { every: 40, stun: 4, units: 200, width: 8 }, // Super Dupa Laser (phase 2)
      tear: { every: 50, n: 3 }, // Nightmare Tear (phase 2): 3 Unknown Smalls
    },
    intro: '🐉 FINAL BOSS: THE PRIMORDIAL DRAKOBLOXXER crawls out of the portal... and SKIPS THE PATH! It walks straight for your base.' },
  // Its summons (health: halfway between the spec's Easy and Hard). Fatigue: towers fire slower.
  n3UnknownBoss: E('Ŭ̷n̸k̵n̶o̷w̵n̷ Boss', 3750, 3, { skin: 0x1a0033, shirt: 0x1a0033, pants: 0x1a0033, face: 'blank', scale: 1.5, hk: { swarm: 0x4a148c },
    armor: 0.35, stunImmune: true, deathFatigue: { radius: 20, amt: 0.6, time: 6 },
    deathSpawn: { fixed: [['n3UnknownSmall', 1, { nimble: true }]] } }),
  n3UnknownSmall: E('Ŭ̷n̸k̵n̶o̷w̵n̷', 875, 3, { skin: 0x050505, shirt: 0x050505, pants: 0x050505, face: 'blank', hk: { swarm: 0x212121 },
    stunImmune: true, deathFatigue: { radius: 12, amt: 0.3, time: 9, units: 20 } }),
};

export function addHalloween3Enemies(ENEMIES) {
  for (const [k, d] of Object.entries(NEW)) ENEMIES[k] = d;
}

// Wave groups: [type, count, secondsBetween, startDelay]. The counts are the spec's; the gaps,
// delays, wave bonuses and timers are guesses. `bonus` is one of four players' share (the event's pot).
const W = (bonus, groups, note) => ({ bonus, groups, ...(note ? { note } : {}) });
const b = (n) => 250 + (n - 1) * 70;
export const HALLOWEEN3_WAVES = [
  W(b(1), [['n3Gourdian', 8, 1, 0], ['n3HexSpawn', 6, 0.9, 5], ['n3Corrupted', 6, 1, 9]], 'Halloween Night 3! An easy start.'),
  W(b(2), [['n3PumpkinSpider', 6, 0.7, 0], ['n3HexMinion', 8, 0.9, 4], ['n3Corrupted', 8, 0.9, 9]], 'Pumpkin Spiders are fast!'),
  W(b(3), [['n3BigGourdian', 4, 1.5, 0], ['n3HexWraith', 6, 1, 5], ['n3Corroded', 4, 1.2, 10], ['n3Ghost', 4, 1, 14]]),
  W(b(4), [['n3PumpkinBat', 4, 0.8, 0], ['n3HexRevenant', 3, 2, 4], ['n3Corroded', 6, 1, 9], ['n3Ghost', 6, 1, 14]]),
  W(b(5), [['n3Reaper', 3, 2, 0], ['n3ForsakenSkull', 2, 3, 5], ['n3TombRaider', 2, 2, 10], ['n3Corrupted', 10, 0.7, 13]], 'HIDDEN enemies: you need hidden detection!'),
  W(b(6), [['n3StrongReaper', 4, 2, 0], ['n3HexMimic', 2, 5, 6], ['n3HexCorpse', 4, 1.5, 12], ['n3TombRaider', 3, 2, 17]], 'Hex Mimics spit out Hex Spawn.'),
  W(b(7), [['n3CurseVine', 1, 0, 0], ['n3SkullReaper', 2, 3, 4], ['n3HexRevenant', 4, 1.5, 9], ['n3LostSoul', 6, 0.8, 14]], 'MINI-BOSS: the Curse Vine wraps your towers!'),
  W(b(8), [['n3Chompski', 3, 3, 0], ['n3LostSoul', 6, 0.8, 6], ['n3ForsakenSkull', 3, 2, 11], ['n3HexMimic', 2, 5, 16]]),
  W(b(9), [['n3BlightWalker', 2, 5, 0], ['n3TormentedSoul', 4, 1.2, 6], ['n3PumpkinBat', 4, 0.8, 11]], 'Blight Walkers leave healing puddles!'),
  W(b(10), [['n3RottingTerror', 1, 0, 0], ['n3JackLantern', 2, 5, 5], ['n3TombRaider', 6, 1.2, 12]], 'MINI-BOSS: the Rotting Terror! Jack O\' Lanterns stun when they die.'),
  W(b(11), [['n3CursedHorror', 4, 1.5, 0], ['n3Airbarrel', 2, 4, 6], ['n3Chompski', 3, 3, 12]], 'FLYERS! You need towers that hit air.'),
  W(b(12), [['n3Scarecrow', 3, 2, 0], ['n3Enigma', 2, 3, 6], ['n3TormentedSoul', 8, 0.8, 11], ['n3BlightWalker', 2, 5, 17]]),
  W(b(13), [['n3PumpkinSpirit', 1, 0, 0], ['n3VineGolem', 1, 0, 4], ['n3HexDrako', 4, 1.5, 9]], 'A very fast Spirit and a tanky Golem.'),
  W(b(14), [['n3Conjurer', 1, 0, 0], ['n3Tormentor', 1, 0, 8], ['n3SkullReaper', 3, 2, 14]], 'BOSS: the Conjurer! He and the Tormentor call up more enemies.'),
  W(b(15), [['n3BunnyHazmask', 2, 3, 0], ['n3Hulk', 2, 5, 5], ['n3FlyingPumpkin', 4, 1.5, 12]], 'A lighter wave: time to rebuild.'),
  W(b(16), [['n3Eclipsed', 2, 5, 0], ['n3Airbarrel', 4, 2, 6], ['n3JackLantern', 4, 3, 12]], 'Eclipsed have 80% defense!'),
  W(b(17), [['n3Ghoul', 2, 2, 0], ['n3PumpkinSpirit', 2, 3, 5], ['n3HexWeaver', 2, 4, 10]], 'Ghouls are EXTREMELY fast!'),
  W(b(18), [['n3Apostle', 1, 0, 0], ['n3VineGolem', 3, 5, 5], ['n3Enigma', 4, 2, 16]], 'The Apostle releases 20 souls when it dies.'),
  W(b(19), [['n3Withered', 3, 3, 0], ['n3PumpkinBalloon', 2, 5, 7], ['n3BunnyHazmask', 2, 3, 14]]),
  W(b(20), [['n3Titus', 1, 0, 0], ['n3Hulk', 2, 5, 8], ['n3Tormentor', 2, 8, 15]], 'BOSS: Corrupted Titus slows your towers!'),
  W(b(21), [['n3BigPumpkinSpirit', 1, 0, 0], ['n3Apostle', 2, 8, 4], ['n3CursedHorror', 4, 1.5, 12]], 'A lighter wave: time to rebuild.'),
  W(b(22), [['n3HexMaw', 1, 0, 0], ['n3PlagueHazmask', 3, 2, 6], ['n3FlyingPumpkin', 4, 1.5, 12]], 'MINI-BOSS: Hex\'s Maw! Its sword stuns towers for 3.5 seconds.'),
  W(b(23), [['n3CoffinHead', 1, 0, 0], ['n3BigReaper', 2, 6, 5], ['n3Withered', 3, 3, 12]], 'Coffin Heads drop Red Skeletons.'),
  W(b(24), [['n3GraveGuardian', 2, 8, 0], ['n3HexWeaver', 4, 2, 6], ['n3HexDrako', 6, 1.2, 12]]),
  W(b(25), [['n3JackTerror', 1, 0, 0], ['n3EvilJack', 2, 6, 6], ['n3Ghoul', 4, 1.5, 14]], 'BOSS: Jack the Terror! His hammer stuns towers.'),
  W(b(26), [['n3GiantBat', 4, 2, 0], ['n3HexReaper', 2, 4, 6], ['n3WingedReaper', 2, 4, 12]], 'A lighter wave: time to rebuild.'),
  W(b(27), [['n3BigPumpkinSpirit', 2, 4, 0], ['n3PumpkinBalloon', 3, 4, 5], ['n3Eclipsed', 2, 5, 12], ['n3PlagueHazmask', 4, 1.5, 18]]),
  W(b(28), [['n3HarvestWitch', 1, 0, 0], ['n3Apostle', 2, 8, 6], ['n3Withered', 3, 3, 14]], 'BOSS: the Harvest Witch! Her Blood Ritual shields and speeds up every enemy.'),
  W(b(29), [['n3CoffinHead', 2, 8, 0], ['n3HexReaper', 4, 2, 6], ['n3CursedHorror', 6, 1.2, 12]], 'A lighter wave: time to rebuild.'),
  W(b(30), [['n3Conserver', 1, 0, 0], ['n3GraveGuardian', 2, 8, 6], ['n3BigReaper', 2, 6, 14]], 'BOSS: the Corrupted Conserver! His skulls stun towers.'),
  W(b(31), [['n3EvilJack', 3, 4, 0], ['n3GiantBat', 4, 2, 6], ['n3Withered', 4, 2.5, 12], ['n3Tormentor', 2, 8, 18]]),
  W(b(32), [['n3Ghoul', 4, 1, 0], ['n3BigPumpkinSpirit', 3, 3, 4], ['n3HexReaper', 3, 2, 12]], 'Speed check!'),
  W(b(33), [['n3CoffinHead', 2, 8, 0], ['n3GraveGuardian', 3, 8, 5], ['n3EvilJack', 2, 6, 14]], 'Tank check! Save some cash for the boss.'),
  W(b(34), [['n3HexReaper', 4, 2, 0], ['n3Apostle', 2, 8, 5], ['n3BigReaper', 4, 4, 12], ['n3Eclipsed', 6, 2, 20]], 'Last stand. The portal starts to glow...', ),
  W(b(35), [['n3Drako', 1, 0, 0], ['n3Withered', 4, 2.5, 6], ['n3Enigma', 4, 2, 12], ['n3HexWeaver', 2, 4, 18], ['n3BigPumpkinSpirit', 3, 3, 24], ['n3PumpkinBalloon', 2, 5, 30]], 'FINAL WAVE: the Primordial Drakobloxxer!'),
];
HALLOWEEN3_WAVES[33].glow = true; // wave 34: the portal glows (newmodels / world read it from the wave)
// Seconds before the next wave comes anyway (null: not until every enemy is dead). Boss and
// mini-boss waves and the last two wait. All guesses.
export const HALLOWEEN3_TIMERS = [40, 40, 45, 45, 50, 50, null, 50, 55, null, 55, 55, 60, null, 60, 60, 60, 65, 65, null, 65, null, 70, 70, null, 70, 70, null, 70, null, 75, 75, 75, null, null];
