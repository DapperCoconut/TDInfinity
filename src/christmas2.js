// Christmas Night 2 (2026-11-11 user spec): 25 waves on Frostgate Citadel (map key `citadel`). The
// Christmas Event (DIFFICULTIES.christmas) plays these when the citadel map is picked (its
// `mapModes.citadel`). The enemies are its own (xc*), even where Night 1 has one with the same name.
//
// From the spec: every health, speed, defense, resist, hidden, what spawns on death, the summons,
// the Elf Guardian's spin, the Coal Man's fire, the bosses' moves and Exo Santa's three phases.
// Health: the spec's three tables are used as they are (no factor). Speed: the spec's numbers;
// words without a number are guesses: Average 3, Slow 1.5, Fast 5. "Ice" type = 100% ice resist.
// Every other guess (gaps, timers, cooldowns, ranges, burn damage...) is in the memory notes.
// How they act: src/sim/parts/christmas.js. How they look: src/newmodels/christmas.js (`xm` looks
// borrowed from Night 1 for now, with their own colors).

/** Kill reward and base damage from health (the Halloween Event's curve). */
const reward = (hp) => Math.max(2, Math.round(1.5 * hp ** 0.55));
const dmg = (hp) => Math.max(1, Math.round(hp ** 0.5 / 2));
const E = (name, hp, speed, look, skin, extra = {}) => ({ name, hp, speed, reward: reward(hp), damage: dmg(hp), scale: 1, xm: look, skin, shirt: skin, pants: skin, face: 'blank', ...extra });
const ICE = { iceResist: 1 }; // "Ice" and "100% ice resist": frost and freezing do nothing

const NEW = {
  // ------------------------------------------------------------ waves 1-5
  xcSnowDrop: E('Snow Drop', 30, 8, 'snowy', 0xe1f5fe, { ...ICE, scale: 0.8,
    intro: '🎄 CHRISTMAS NIGHT 2! Defend the Frostgate Citadel\'s gate for 25 waves. Ho ho... no!' }),
  xcGingerbread: E('Gingerbread', 20, 3, 'snowy', 0xa1662f, { scale: 0.85 }),
  xcFrozenZombie: E('Frozen Zombie', 40, 3, 'frozen', 0x80cbc4, { ...ICE }),
  // Fire hurts it twice as much (the spec says the Flamethrower; here every burn does).
  xcSnowman: E('Snowman', 80, 1.5, 'golem', 0xffffff, { burnResist: -1, scale: 1.1,
    intro: '⛄ Snowmen are sturdy, but fire melts them twice as fast!' }),
  xcDarkElfGuard: E('Dark Elf Guard', 20, 4, 'mist', 0x2e1a47, { hidden: true, noCollide: true,
    intro: '🧝 Dark Elf Guards and Shadows are HIDDEN. You need hidden detection!' }),
  xcShadow: E('Shadow', 65, 3, 'mist', 0x111122, { hidden: true, noCollide: true }),
  xcSnowRunner: E('Snow Runner', 15, 7, 'frozen', 0xb3e5fc, { ...ICE, scale: 0.75 }),
  xcPresent: E('Present', 30, 3, 'mystery', 0xe53935, {
    deathSpawn: { n: 1, list: ['xcGingerbread', 'xcSnowman', 'xcShadow', 'xcYeti'], noCash: true },
    intro: '🎁 Presents unwrap into a random enemy! (That one gives no cash.)' }),
  xcRanger: E('Summoned Ranger', 175, 4, 'invader', 0x558b2f, { scale: 0.9 }),
  xcYeti: E('Yeti', 800, 5, 'golem', 0xcfd8dc, { scale: 1.5,
    intro: '🦍 MINI-BOSS: the YETI! Big and fast.' }),

  // ------------------------------------------------------------ waves 6-12
  xcSnowGunner: E('Snow Gunner', 300, 4.5, 'invader', 0xe3f2fd, { ...ICE }),
  xcSnowPal: E('Snow Pal', 200, 5, 'snowy', 0xf1f8e9, { ...ICE }),
  xcWall: E('XMAS Wall', 200, 2, 'packed', 0x2e7d32, { reward: 0, scale: 1.2,
    intro: '🧱 XMAS Walls soak up damage and give NO cash.' }),
  xcBlizzardGolem: E('Blizzard Golem', 350, 0.8, 'golem', 0xb3e5fc, { ...ICE, scale: 1.4 }),
  xcChimney: E('Chimney', 300, 4, 'packed', 0x8d4b3a, { bulletResist: 0.5,
    intro: '🏠 Chimneys take half damage from bullets.' }),
  xcSnowZombie: E('Snow Zombie', 100, 3, 'frozen', 0xeceff1, { ...ICE }),
  xcTree: E('Tree', 375, 12, 'invader', 0x1b5e20, { hidden: true,
    intro: '🎄 Trees are HIDDEN and VERY fast!' }),
  // Gatling Gift: a 150-health Snow Drop pops out every few seconds, and a plain one when it dies.
  xcGatlingGift: E('Gatling Gift', 600, 1.5, 'mystery', 0x1e88e5, { defense: 12, scale: 1.3,
    summon: { type: 'xcGiftDrop', n: 1, every: 6, here: true, noCash: true },
    deathSpawn: { fixed: [['xcSnowDrop', 1]] },
    intro: '🔫 Gatling Gifts have 12 DEFENSE and shoot out Snow Drops.' }),
  xcGiftDrop: E('Snow Drop', 150, 8, 'snowy', 0xe1f5fe, { ...ICE, scale: 0.8 }),
  // At 65% health it catches fire and races ahead.
  xcCoalMan: E('Coal Man', 400, 3.5, 'packed', 0x212121, { explosiveResist: 0.27,
    ignite: { at: 0.65, speed: 12.5 },
    intro: '🔥 Coal Men catch fire when hurt and RUN at full speed!' }),
  xcGolem: E('Golem', 4600, 1.5, 'deep', 0x9e9e9e, { freezeImmune: true, scale: 1.7,
    intro: '🗿 MINI-BOSS: the GOLEM! It can\'t be frozen.' }),
  // On death it copies 1 enemy close by (the copy gives no cash).
  xcMultiplier: E('Multiplier', 20, 3.5, 'unstable', 0xffd600, { ...ICE,
    multiply: { radius: 10, max: 1, copies: 1, speed: 1.3, noCash: true },
    intro: '✖️ Multipliers copy an enemy next to them when they die!' }),
  xcGiftBox: E('Gift Box', 100, 4, 'mystery', 0x8e24aa, {
    deathSpawn: { fixed: [['xcToy', 7]] },
    intro: '🎁 Gift Boxes burst into 7 fast Toys!' }),
  xcToy: E('Toy', 18, 13.5, 'snowy', 0xff7043, { reward: 0, explosiveResist: 0.27, scale: 0.6 }),
  xcSnowHead: E('Snowman Head', 1000, 3, 'golem', 0xfafafa, { ...ICE, scale: 1.2 }),
  // Boss: a Giant Top every 10 s.
  xcToymaker: E('Toymaker', 100000, 2, 'necro', 0x6d4c41, { boss: true, bar: true, barName: 'THE TOYMAKER', scale: 1.9,
    summon: { type: 'xcTop', n: 1, every: 10, noCash: true },
    intro: '🧸 BOSS: THE TOYMAKER! He makes a Giant Top every 10 seconds.' }),
  xcTop: E('Giant Top', 1000, 6.5, 'unstable', 0xffca28, { scale: 1.1 }),

  // ------------------------------------------------------------ waves 13-19
  xcWendigo: E('Wendigo', 2150, 11, 'invader', 0x3e2723, { ...ICE, scale: 1.3,
    intro: '🦌 Wendigos are tough and EXTREMELY fast.' }),
  // Dashes ahead now and then; at the end of a dash it stuns the hero towers around it.
  xcBlizzardWarrior: E('Blizzard Warrior', 2600, 2.7, 'hero', 0x90caf9, { ...ICE, scale: 1.4,
    xcDash: { every: 10, time: 2, speed: 3, radius: 10, stun: 2 },
    intro: '⚔️ Blizzard Warriors dash forward and stun hero towers!' }),
  xcSuperNaughty: E('Super Naughty', 10000, 2.7, 'ravager', 0x424242, { scale: 1.6,
    intro: '😈 MINI-BOSS: SUPER NAUGHTY! Very tanky.' }),
  xcDarkElf: E('Dark Elf', 3300, 6, 'mist', 0x4a148c, { hidden: true, noCollide: true, scale: 1.2,
    intro: '🧝 The Dark Elf is HIDDEN and fast!' }),
  xcBlackIce: E('Black Ice', 300, 2, 'packed', 0x263238),
  // Sword spin: stuns the towers within 10 for 3 s, every 8 s.
  xcElfGuardian: E('Elf Guardian', 18000, 2.3, 'hero', 0x2e7d32, { scale: 1.6,
    slam: { range: 10, every: 8, stun: 3 },
    intro: '🗡️ ELF GUARDIAN! Its sword spin stuns towers close by for 3 seconds.' }),
  xcGiantSnowman: E('Giant Snowman', 4000, 1.5, 'golem', 0xffffff, { ...ICE, fixedHp: true, scale: 1.9,
    deathSpawn: { fixed: [['xcSnowHead', 1]] },
    intro: '⛄ Giant Snowmen become a Snowman Head when they die.' }),

  // ------------------------------------------------------------ waves 20-25
  // Boss: Present Throw (a fire patch round a tower) and Candy Cane Minigun (sets one tower on fire).
  xcSantaBot: E('SantaBot', 150000, 1.5, 'hero', 0xc62828, { boss: true, bar: true, barName: 'SANTABOT', freezeImmune: true, scale: 2.1,
    santaBot: {
      present: { every: 20, range: 35, radius: 6, dps: 3, time: 42 },
      minigun: { every: 12, range: 25, radius: 2.5, dps: 4, time: 42 },
    },
    intro: '🤖 BOSS: SANTABOT! His presents and candy canes set towers on fire for 42 seconds!' }),
  xcBiggerSnowman: E('Bigger Snowman', 6000, 1, 'golem', 0xf5f5f5, { ...ICE, fixedHp: true, scale: 2.2,
    deathSpawn: { fixed: [['xcGiantSnowman', 1]] },
    intro: '⛄ The Bigger Snowman splits twice!' }),
  // Boss: 5 phases (each one comes back stronger when the last dies). 32,000 in all.
  ...worm(),
  xcGatlingFreezer: E('Gatling Freezer', 30000, 2.8, 'ravager', 0x0288d1, { defense: 8, fixedHp: true, scale: 1.8,
    intro: '🧊 The Gatling Freezer has 8 DEFENSE.' }),

  // Final boss. Immune to stun, slow and freezing; 100% ice resist. Three phases (see christmasMoves).
  xcExoSanta: E('Exo Santa', 420000, 2.4, 'spirit', 0xb71c1c, { ...ICE, boss: true, bar: true, barName: 'EXO SANTA', scale: 2.6,
    stunImmune: true, freezeImmune: true,
    exoSanta: {
      carols: { every: 18, shots: 2, stun: 1.5 }, // Burst of Carols: the most expensive tower
      calls: { every: 45, list: [['xcSnowPal', 6], ['xcWendigo', 1]], late: [['xcElfGuardian', 1]] }, // Northern Calls
      spray: { at: 300000 / 420000, every: 45, time: 4, dps: 150, range: 25, angle: 105 }, // Festive Spray (phase 2)
      present: { at: 135000 / 420000, every: 30, n: 2, ahead: 40 }, // Jolly Present (phase 3)
    },
    intro: '🎅 FINAL BOSS: EXO SANTA! "Ho ho ho." He gets meaner as he breaks down.' }),
};

/** The Snow Worm's five phases: 6,000 to 6,800 health. */
function worm() {
  const out = {};
  for (let i = 1; i <= 5; i++) {
    out[`xcWorm${i}`] = E('Snow Worm', 6000 + (i - 1) * 200, 2.5, 'ravager', 0xe0f7fa, { ...ICE, boss: true, bar: true, barName: `SNOW WORM (${i}/5)`, scale: 1.6 + i * 0.1,
      ...(i < 5 ? { phase2: `xcWorm${i + 1}` } : {}),
      ...(i === 1 ? { intro: '🐛 BOSS: THE SNOW WORM! It has 5 phases, each one stronger.' } : {}) });
  }
  return out;
}

export function addChristmas2Enemies(ENEMIES) {
  for (const [k, d] of Object.entries(NEW)) ENEMIES[k] = d;
}

// Wave groups: [type, count, secondsBetween, startDelay]. Counts are the spec's (wave 18 is missing
// from it: mine). Gaps, delays, bonuses and timers are guesses. `bonus` is one of four players' share.
const W = (bonus, groups, note) => ({ bonus, groups, ...(note ? { note } : {}) });
const b = (n) => 250 + (n - 1) * 80;
export const CHRISTMAS2_WAVES = [
  W(b(1), [['xcSnowDrop', 8, 0.8, 0], ['xcGingerbread', 6, 1, 3], ['xcFrozenZombie', 4, 1, 7]], 'Christmas Night 2! Easy start. Guard the gate!'),
  W(b(2), [['xcSnowDrop', 6, 0.8, 0], ['xcSnowman', 6, 1.2, 3], ['xcFrozenZombie', 6, 1, 8]]),
  W(b(3), [['xcDarkElfGuard', 4, 1, 0], ['xcShadow', 4, 1.2, 3], ['xcSnowRunner', 10, 0.5, 7]], 'Hidden enemies: you need detection!'),
  W(b(4), [['xcSnowDrop', 8, 0.7, 0], ['xcPresent', 6, 1.2, 3], ['xcRanger', 4, 1.5, 8]], 'Presents unwrap into random enemies.'),
  W(b(5), [['xcYeti', 1, 0, 0], ['xcDarkElfGuard', 6, 0.8, 2], ['xcSnowRunner', 15, 0.4, 6]], 'MINI-BOSS: a fast Yeti!'),
  W(b(6), [['xcSnowGunner', 3, 1.5, 0], ['xcSnowPal', 6, 1, 3], ['xcWall', 8, 1, 6], ['xcShadow', 4, 1, 10]], 'XMAS Walls soak damage and give no cash.'),
  W(b(7), [['xcBlizzardGolem', 3, 3, 0], ['xcChimney', 3, 1.5, 4], ['xcPresent', 8, 0.8, 8]], 'A lighter wave. Rebuild!'),
  W(b(8), [['xcSnowGunner', 4, 1.2, 0], ['xcSnowZombie', 4, 1, 3], ['xcYeti', 2, 3, 6], ['xcTree', 2, 1.5, 10]], 'Trees are hidden and very fast!'),
  W(b(9), [['xcGatlingGift', 2, 4, 0], ['xcCoalMan', 6, 1.2, 3], ['xcShadow', 10, 0.6, 8]], 'Gatling Gifts shoot out Snow Drops.'),
  W(b(10), [['xcGolem', 1, 0, 0], ['xcBlizzardGolem', 4, 2.5, 2], ['xcMultiplier', 1, 0, 8]], 'MINI-BOSS: the Golem! A Multiplier copies enemies when it dies.'),
  W(b(11), [['xcGiftBox', 6, 1.5, 0], ['xcSnowHead', 2, 3, 4], ['xcSnowman', 4, 1.2, 8]], 'Gift Boxes burst into 7 Toys!'),
  W(b(12), [['xcToymaker', 1, 0, 0], ['xcYeti', 4, 2, 4], ['xcTree', 4, 1.5, 10]], 'BOSS: THE TOYMAKER!'),
  W(b(13), [['xcGatlingGift', 2, 4, 0], ['xcWendigo', 2, 3, 4], ['xcPresent', 10, 0.7, 8]], 'A lighter wave. Rebuild!'),
  W(b(14), [['xcBlizzardWarrior', 1, 0, 0], ['xcGolem', 2, 4, 3], ['xcCoalMan', 8, 1, 7]], 'The Blizzard Warrior dashes and stuns hero towers!'),
  W(b(15), [['xcSuperNaughty', 1, 0, 0], ['xcSnowHead', 3, 2, 3], ['xcGiftBox', 6, 1.2, 7]], 'MINI-BOSS: SUPER NAUGHTY! A tank check.'),
  W(b(16), [['xcDarkElf', 1, 0, 0], ['xcWendigo', 3, 2.5, 3], ['xcBlackIce', 6, 1, 6], ['xcShadow', 10, 0.6, 10]], 'A fast hidden Elf!'),
  W(b(17), [['xcBlizzardWarrior', 2, 3, 0], ['xcGolem', 3, 3, 4], ['xcSuperNaughty', 2, 5, 9]]),
  W(b(18), [['xcElfGuardian', 1, 0, 0], ['xcWendigo', 2, 3, 3], ['xcCoalMan', 8, 1, 6]], 'The Elf Guardian\'s sword spin stuns towers for 3 seconds!'),
  W(b(19), [['xcGiantSnowman', 1, 0, 0], ['xcWendigo', 4, 2, 3], ['xcPresent', 15, 0.6, 7]], 'Night falls. The Giant Snowman splits when it dies.'),
  W(b(20), [['xcSantaBot', 1, 0, 0], ['xcGolem', 4, 3, 4], ['xcGingerbread', 6, 0.8, 10]], 'BOSS: SANTABOT! He sets towers on fire.'),
  W(b(21), [['xcBiggerSnowman', 1, 0, 0], ['xcGiftBox', 10, 1, 3], ['xcSnowRunner', 20, 0.3, 8]], 'A lighter wave. The Bigger Snowman splits twice!'),
  W(b(22), [['xcWorm1', 1, 0, 0], ['xcGatlingFreezer', 1, 0, 5], ['xcSuperNaughty', 2, 5, 9]], 'BOSS: THE SNOW WORM! It has 5 phases.'),
  W(b(23), [['xcGatlingFreezer', 1, 0, 0], ['xcElfGuardian', 2, 5, 3], ['xcWendigo', 6, 1.5, 7], ['xcTree', 4, 1.2, 12]], 'Save some cash for the last boss!'),
  W(b(24), [['xcSuperNaughty', 4, 3, 0], ['xcGolem', 5, 2.5, 4], ['xcGiantSnowman', 2, 4, 9], ['xcPresent', 30, 0.4, 12]], 'Last stand!'),
  W(b(25), [['xcExoSanta', 1, 0, 0], ['xcSuperNaughty', 3, 4, 5], ['xcGingerbread', 20, 0.4, 8], ['xcGiftBox', 6, 1.5, 14], ['xcTree', 4, 1.5, 20]], 'FINAL BOSS: EXO SANTA! "Ho ho ho."'),
];
// Seconds before the next wave comes anyway (null: not until every enemy is dead). All guesses.
export const CHRISTMAS2_TIMERS = [35, 35, 40, 40, 45, 45, 40, 45, 50, 55, 50, null, 45, 55, 60, 55, 60, 60, 60, null, 55, null, 60, 60, null];
