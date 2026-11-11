// Halloween Night 2 (2026-11-11 user spec): 25 waves on the carnival map. The Halloween Event
// (DIFFICULTIES.halloween) plays these when the carnival map is picked (its `mapModes.carnival`).
// The enemies are its own (h2*), even where an older mode has one with the same name.
//
// Health: the spec's stats came from three tables with their own health scales. The middle table
// (Mummy, Ghost, Jaxe...) is used as it is; the first table (candy, clowns, reapers...) is x3 to
// match it, and the last table (Villager, Psycho, Judge...) already matched it, so it is x1.
// (Both factors are my guesses.) The Ringmaster keeps the 500,000 the spec gave.
// Speed: the spec's numbers x3, like the other modes made from the same games. Words without a
// number: Average 3, Above average 3.5, Below average 2.5, Slow 1.5, Fast 5 (my guesses).
// Every timer, range and cooldown the spec doesn't give is a guess (see the memory notes).

/** Kill reward and base damage from health (the first Halloween Event's curve). */
const reward = (hp) => Math.max(2, Math.round(1.5 * hp ** 0.55));
const dmg = (hp) => Math.max(1, Math.round(hp ** 0.5 / 2));
const E = (name, hp, speed, extra = {}) => ({ name, hp, speed: Math.round(speed * 3 * 100) / 100, reward: reward(hp), damage: dmg(hp), scale: 1, ...extra });
const T1 = 3; // first table's health factor

// Looks: `model` is a creature builder (newmodels/halloween2.js); without one the enemy is the
// humanoid body dressed by `hw2` (also in newmodels/halloween2.js).
const NEW = {
  // ------------------------------------------------------------ first table (health x3)
  h2GumDrop: E('Gum Drop', 4 * T1, 2, { h: 2.8, model: 'h2Candy', candy: 'gumdrop', skin: 0x66bb6a,
    intro: '🍬 HALLOWEEN NIGHT 2! The carnival is open. Candy, clowns and monsters want your base. 25 waves!' }),
  h2Monkey: E('Monkey', 20 * T1, 1.5, { h: 4.1, model: 'h2Monkey', skin: 0x6d4c41 }),
  h2Candy: E('Candy', 25 * T1, 2, { h: 3.0, model: 'h2Candy', candy: 'wrapped', skin: 0xe53935 }),
  h2Crow: E('Crow', 20 * T1, 4, { h: 3.0, model: 'h2Crow', skin: 0x1a1a1a, intro: '🐦‍⬛ Crows: quick little birds.' }),
  h2Clown: E('Clown', 25 * T1, 4, { skin: 0xf5f5f5, shirt: 0xffeb3b, pants: 0x1e88e5, face: 'blank', hw2: 'clown',
    intro: '🤡 Clowns! Fast and silly. Lots more of them later...' }),
  // Poison type: poison does half (the spec only says "Poison"; this reading is mine).
  h2Shroom: E('Shroom', 40 * T1, 2, { h: 4.3, model: 'h2Shroom', skin: 0x8e24aa, poisonResist: 0.5,
    intro: '🍄 Shrooms are poison types: poison does half damage to them.' }),
  h2CottonCandy: E('Cotton Candy', 50 * T1, 2, { h: 4.6, model: 'h2Candy', candy: 'cotton', skin: 0xf48fb1 }),
  h2MonkeyBall: E('Monkey Ball', 150 * T1, 1.6, { h: 4.6, model: 'h2Monkey', ball: true, skin: 0x6d4c41 }),
  h2CandyCorn: E('Candy Corn', 50 * T1, 2, { h: 3.8, model: 'h2Candy', candy: 'corn', skin: 0xff9800 }),
  h2SadClown: E('Sad Clown', 90 * T1, 3, { skin: 0xf5f5f5, shirt: 0x5c6bc0, pants: 0x37474f, face: 'blank', hw2: 'sadClown' }),
  // No health scaling: the mode's health curve doesn't touch it.
  h2Balloon: E('Balloon Animal', 350 * T1, 2, { h: 4.6, model: 'h2Balloon', skin: 0xff4081, fixedHp: true,
    intro: '🎈 Balloon Animals: tough, and they never get any tougher.' }),
  h2Twist: E('Twist', 200 * T1, 3, { h: 5.0, model: 'h2Candy', candy: 'twist', skin: 0xffffff }),
  // Summoner: a random candy every 5 s.
  h2GoodieBag: E('Goodie Bag', 300 * T1, 1.5, { h: 4.6, model: 'h2Bag', skin: 0xff6f00,
    summon: { types: ['h2GumDrop', 'h2Candy', 'h2CandyCorn', 'h2CottonCandy'], n: 1, every: 5, noCash: true },
    intro: '🎁 Goodie Bags drop a random candy every 5 seconds. Pop them fast!' }),
  h2Crackle: E('Crackle', 300 * T1, 2.5, { h: 3.6, model: 'h2Candy', candy: 'crackle', skin: 0x8d6e63 }),
  h2Popcorn: E('Popcorn', 350 * T1, 2.4, { h: 4.6, model: 'h2Popcorn', skin: 0xfff8e1 }),
  // Defense 9, and a Clown or a Sad Clown pops out every 3 s.
  h2ClownCar: E('Clown Car', 1500 * T1, 3, { h: 4.0, model: 'h2ClownCar', skin: 0xe53935, defense: 9,
    summon: { types: ['h2Clown', 'h2SadClown'], n: 1, every: 3, here: true, noCash: true },
    intro: '🚗 Clown Cars! Defense 9 blocks weak hits, and a clown jumps out every 3 seconds.' }),
  h2StrongReaper: E('Strong Reaper', 500 * T1, 2, { h: 5.2, model: 'h2Reaper', reaper: 'strong', skin: 0x455a64, hidden: true,
    intro: '💀 Strong Reapers are HIDDEN.' }),
  h2ChocolateBar: E('Chocolate Bar', 400 * T1, 2.2, { h: 4.4, model: 'h2Candy', candy: 'chocolate', skin: 0x5d4037 }),
  // Fire type, like the Ember Keep ones: burns do half, frost does more.
  h2BurntPopcorn: E('Burnt Popcorn', 900 * T1, 2.4, { h: 4.6, model: 'h2Popcorn', burnt: true, skin: 0x3e2723, fireType: true, burnResist: 0.5, frostWeak: 0.5,
    intro: '🔥 Burnt Popcorn is a FIRE type: fire does half damage, frost does more.' }),
  h2WingedReaper: E('Winged Reaper', 2000 * T1, 4, { h: 5.2, model: 'h2Reaper', reaper: 'winged', skin: 0x4a148c, hidden: true }),
  h2BigMonkey: E('Big Monkey', 3000 * T1, 2.5, { h: 4.4, model: 'h2Monkey', big: true, skin: 0x4e342e, scale: 1.6 }),
  // Explodes when it dies: towers close by are stunned for 7 s.
  h2JackLantern: E('Jack O\' Lantern', 1000 * T1, 1.5, { h: 4.4, model: 'h2Pumpkin', skin: 0xff6d00, deathBlast: { radius: 12, stun: 7 },
    intro: '🎃 Jack O\' Lanterns EXPLODE when they die: towers nearby are stunned for 7 seconds.' }),
  h2SkullReaper: E('Skull Reaper', 900 * T1, 2, { h: 5.2, model: 'h2Reaper', reaper: 'skull', skin: 0xe0d6c0, hidden: true }),
  h2Lollipop: E('Lollipop', 500 * T1, 2, { h: 5.4, model: 'h2Candy', candy: 'lollipop', skin: 0xec407a }),
  h2BigReaper: E('Big Reaper', 10000 * T1, 2, { h: 5.4, model: 'h2Reaper', reaper: 'big', skin: 0x212121, hidden: true, scale: 1.5 }),
  h2EvilJack: E('Evil Jack O\' Lantern', 5000 * T1, 1.6, { h: 4.6, model: 'h2Pumpkin', evil: true, skin: 0x6a1b9a, scale: 1.4,
    deathBlast: { radius: 12, stun: 7, unitDmg: 100 },
    intro: '😈 Evil Jack O\' Lanterns explode too: 7 second stun, and 100 damage to your units.' }),
  // Final boss, phase 1. Spotlight: one tower gets 2x damage and +50% range, the others are stunned 5 s.
  // When he goes down, Jack O' Bot walks out (phase2). The Awakened resist explosions.
  h2Ringmaster: { h: 6.6, name: 'Ringmaster', hp: 500000, speed: 6, reward: 0, damage: 1e6, scale: 2.4, hw2: 'ringmaster',
    skin: 0xf2c9a0, shirt: 0xc62828, pants: 0x1a1a1a, face: 'blank', boss: true, bar: true, barName: 'THE RINGMASTER', barSub: 'Phase 1: the show begins',
    explosiveResist: 0.5, spotlight: { every: 25, stun: 5, time: 10, dmg: 2, range: 1.5 }, phase2: 'h2JackBot',
    intro: '🎪 FINAL BOSS: THE RINGMASTER! Every 25 s his Spotlight powers up one tower and stuns all the others for 5 seconds. He resists explosions.' },

  // ------------------------------------------------------------ middle table (health as written)
  h2Mummy: E('Mummy', 50, 3, { skin: 0xd7ccc8, shirt: 0xd7ccc8, pants: 0xd7ccc8, face: 'blank', hw2: 'mummy' }),
  h2StrongMummy: E('Strong Mummy', 80, 1.5, { skin: 0xbcaaa4, shirt: 0xbcaaa4, pants: 0xbcaaa4, face: 'blank', hw2: 'mummy', scale: 1.15,
    intro: '🧻 Strong Mummies: slow, but tougher.' }),
  h2Scarecrow: E('Straw Scarecrow', 100, 3.5, { skin: 0xf9a825, shirt: 0x8d6e63, pants: 0x1565c0, face: 'blank', hw2: 'scarecrow' }),
  h2Demon: E('Demon', 450, 3, { skin: 0xd32f2f, shirt: 0x3a1450, pants: 0x2a0e3a, face: 'zombie', hw2: 'demon', fireImmune: true,
    intro: '😈 Demons can\'t burn. Fire does nothing to them.' }),
  // Hidden; splash, burns and freezing don't work on it.
  h2Ghost: E('Ghost', 150, 3.5, { h: 6.2, skin: 0xf4f6f8, shirt: 0xf4f6f8, pants: 0xf4f6f8, face: 'blank', hw2: 'ghost', hidden: true,
    consume: true, fireImmune: true, freezeImmune: true,
    intro: '👻 Ghosts are HIDDEN. Splash, fire and freezing don\'t hurt them: use direct hits.' }),
  h2Vampire: E('Vampire', 350, 3, { skin: 0xe0e0e0, shirt: 0x1a1a1a, pants: 0x1a1a1a, face: 'blank', hw2: 'vampire', phase2: 'h2Bat',
    intro: '🧛 Vampires turn into Bats when they die. Bats are HIDDEN and fly over your units.' }),
  h2Bat: E('Bat', 120, 5, { h: 2.4, model: 'h2Bat', skin: 0x212121, hidden: true, flying: true, noCollide: true }),
  // Ignores tank units (walks right through them).
  h2Witch: E('Witch', 200, 5, { h: 6.8, skin: 0x9ccc65, shirt: 0x311b92, pants: 0x1a1a1a, face: 'zombie', hw2: 'witch', tankPass: true,
    intro: '🧙 Witches fly through tanks: tanks can\'t block them.' }),
  h2SumReaper: E('Summoner Reaper', 750, 1.5, { h: 5.2, model: 'h2Reaper', reaper: 'summoner', skin: 0x37474f,
    summon: { types: ['h2Mummy', 'h2StrongMummy', 'h2Scarecrow', 'h2Ghost'], n: 1, every: 6, noCash: true },
    intro: '💀 Summoner Reapers call up Mummies, Scarecrows and Ghosts. The ones they call give no cash.' }),
  h2SpeedClown: E('Speed Clown', 600, 6, { skin: 0xf5f5f5, shirt: 0x00e676, pants: 0xd500f9, face: 'blank', hw2: 'speedClown',
    intro: '💨 Speed Clowns: the fastest thing at the carnival!' }),
  h2Frank: E('Frankenstein', 3000, 3, { skin: 0x7cb342, shirt: 0x263238, pants: 0x212121, face: 'zombie', hw2: 'frank', scale: 1.35 }),
  h2Swamp: E('Swamp Thing', 6000, 2.5, { skin: 0x33691e, shirt: 0x33691e, pants: 0x1b5e20, face: 'blank', hw2: 'swamp', scale: 1.4 }),
  // Burns don't work. Axe Swing: stuns the towers around it.
  h2Jaxe: E('Jaxe', 50000, 4.5, { skin: 0xff6d00, shirt: 0x212121, pants: 0x1a1a1a, face: 'blank', hw2: 'jaxe', scale: 1.6, fireImmune: true,
    slam: { range: 10, every: 12, stun: 3 },
    intro: '🪓 JAXE! His Axe Swing stuns the towers around him, and he can\'t burn.' }),
  // Final boss, phase 2. Minigun: lasers that stun the towers they hit for a moment. Hallowed Laugh:
  // Jaxes, Mummies, Ghosts and Clowns. Jack O' Bombs is cut (spec).
  h2JackBot: { h: 6.0, name: 'Jack O\' Bot', hp: 350000, speed: 3, reward: 0, damage: 1e6, scale: 2.8, hw2: 'jackBot',
    skin: 0xff6d00, shirt: 0x37474f, pants: 0x263238, face: 'blank', boss: true, bar: true, barName: 'JACK O\' BOT', barSub: 'Phase 2: out of the big tent',
    freezeImmune: true, fireImmune: true, explosiveResist: 0.5, jack: true,
    shots: [{ kind: 'laser', range: 45, radius: 2, every: 8, n: 6, stun: 1.5, dmg: 0 }],
    summon: [{ type: 'h2Jaxe', n: 1, every: 30 }, { type: 'h2Mummy', n: 4, every: 30 }, { type: 'h2Ghost', n: 3, every: 30 }, { type: 'h2Clown', n: 4, every: 30 }],
    intro: '🤖 JACK O\' BOT! His minigun lasers stun towers, and his Hallowed Laugh calls Jaxes, Mummies, Ghosts and Clowns. He can\'t be frozen or burned.' },

  // ------------------------------------------------------------ last table (health as written)
  // Health 17-25 and explosive resistance 18-44%, rolled for each one.
  h2Villager: E('Villager', 21, 2.4, { skin: 0xf2c9a0, shirt: 0x795548, pants: 0x5d4037, face: 'zombie', hw2: 'villager', explosiveResist: 0.31,
    roll: { hp: [17, 25], explosiveResist: [0.18, 0.44] } }),
  // Throws a knife at the nearest tower: 50 damage, then it bleeds.
  h2Psycho: E('Psycho', 150, 6, { skin: 0xf2c9a0, shirt: 0xeeeeee, pants: 0x37474f, face: 'zombie', hw2: 'psycho',
    shots: [{ kind: 'knife', range: 20, radius: 1, every: 6, dmg: 50, flight: 0.4, nearest: true, bleed: { dps: 5, time: 5 } }],
    intro: '🔪 Psychos throw knives at your nearest tower: 50 damage, and it keeps bleeding.' }),
  // Deals double its health left when it reaches the base.
  h2MrSaw: E('Mr. Saw', 550, 2.2, { skin: 0xf2c9a0, shirt: 0x4e342e, pants: 0x212121, face: 'blank', hw2: 'mrSaw', scale: 1.3, explosiveResist: 0.4, leakHp: 2,
    intro: '🪚 MINI-BOSS: MR. SAW! If he reaches your base he hits it for DOUBLE the health he has left.' }),
  // Charges at 10.3 once it is below 65% health.
  h2Prowler: E('Prowler', 350, 1.6, { skin: 0x5d4037, shirt: 0x3e2723, pants: 0x3e2723, face: 'zombie', hw2: 'prowler', chargeAt: { hp: 0.65, speed: 10.3 * 3 },
    intro: '🐺 Prowlers are slow... until they get hurt. Below 65% health they CHARGE.' }),
  h2ProwlerHidden: E('Stealth Prowler', 350, 1.6, { skin: 0x5d4037, shirt: 0x3e2723, pants: 0x3e2723, face: 'zombie', hw2: 'prowler', hidden: true, chargeAt: { hp: 0.65, speed: 10.3 * 3 } }),
  h2Psycop: E('Psycop', 250, 2.5, { skin: 0xf2c9a0, shirt: 0x1a237e, pants: 0x0d1b4a, face: 'zombie', hw2: 'psycop', bulletResist: 0.1, explosiveResist: 0.5, laserResist: 0.25 }),
  h2PsycopHidden: E('Stealth Psycop', 250, 2.5, { skin: 0xf2c9a0, shirt: 0x1a237e, pants: 0x0d1b4a, face: 'zombie', hw2: 'psycop', hidden: true, bulletResist: 0.1, explosiveResist: 0.5, laserResist: 0.25,
    intro: '🚓 Stealth Psycops are HIDDEN, and explosions do half damage to them.' }),
  // The Bell Tolls: enemies nearby are 60% faster for 10 s.
  h2Judge: E('Judge', 2800, 1.8, { skin: 0xf2c9a0, shirt: 0x111111, pants: 0x111111, face: 'blank', hw2: 'judge', scale: 1.3,
    bulletResist: 0.1, laserResist: 0.1, goldResist: 0.1, bell: { every: 20, radius: 15, speed: 0.6, time: 10 },
    intro: '🔔 MINI-BOSS: THE JUDGE! The Bell Tolls makes the enemies around him 60% faster for 10 seconds.' }),
  // Can't be stunned. Axe slam: 200 damage to towers within 10 every 15 s.
  h2Executioner: E('Executioner', 1750, 1.9, { skin: 0xf2c9a0, shirt: 0x212121, pants: 0x1a1a1a, face: 'blank', hw2: 'executioner', scale: 1.3,
    stunImmune: true, bulletResist: 0.5, meleeResist: 0.95, slam: { range: 10, every: 15, stun: 0, dmg: 200 },
    intro: '🪓 Executioners can\'t be stunned, shrug off melee and bullets, and their axe slam hurts towers nearby.' }),
  h2Worker: E('Worker', 125, 2.4, { skin: 0xf2c9a0, shirt: 0xff9800, pants: 0x1565c0, face: 'zombie', hw2: 'worker', bulletResist: 0.5 }),
  // Every 2 s: a shield of 40 + 5% of max health on itself and the enemies around it.
  h2NailHead: E('Nail Head', 300, 2, { skin: 0xbdbdbd, shirt: 0x37474f, pants: 0x263238, face: 'blank', hw2: 'nailHead', shieldPulse: { every: 2, radius: 10, flat: 40, pct: 0.05 },
    intro: '🔩 Nail Heads shield themselves and the enemies around them every 2 seconds.' }),
  // Can't be stunned. Screech: stuns towers 2 s every 45 s. Charge: a burst of speed.
  h2Predator: E('Corrupted Predator', 24000, 2.1, { skin: 0x1a1a1a, shirt: 0x4a148c, pants: 0x1a1a1a, face: 'blank', hw2: 'predator', scale: 1.7, boss: true,
    stunImmune: true, screech: { every: 45, stun: 2, radius: 30 }, burst: { every: 20, time: 2, speed: 3 },
    intro: '🦖 MINI-BOSS: A dark figure emerges... the CORRUPTED PREDATOR! Its Screech stuns your towers, and it can\'t be stunned.' }),
  h2Vile: E('Twitching Vile', 1500, 8.3, { skin: 0x9e9e9e, shirt: 0x424242, pants: 0x212121, face: 'zombie', hw2: 'vile', explosiveResist: 0.3, laserResist: 0.7, goldResist: 0.7,
    intro: '⚡ Twitching Viles are super fast and shrug off lasers and golden damage.' }),
  h2DreadKnight: E('Dread Knight', 3500, 4, { skin: 0x212121, shirt: 0x263238, pants: 0x1a1a1a, face: 'helm', hw2: 'dreadKnight', scale: 1.3, bulletResist: 0.85, fireImmune: true,
    intro: '🛡️ Dread Knights: bullets barely scratch them and fire does nothing.' }),
  // No stuns or slows. Smite: hits the most expensive tower every 15 s.
  h2Heretic: E('Heretic', 27357, 1.1, { skin: 0x9e9e9e, shirt: 0x880e4f, pants: 0x4a0d2a, face: 'blank', hw2: 'heretic', scale: 1.8, boss: true,
    statusImmune: true, burnable: true, smite: { every: 15, dmg: 300, stun: 3 },
    intro: '⛪ MINI-BOSS: THE HERETIC! Nothing stuns or slows him, and his Smite strikes your most expensive tower.' }),
  // Jumps ahead along the path.
  h2NailGolem: E('Nail Golem', 20000, 3.5, { skin: 0x616161, shirt: 0x424242, pants: 0x424242, face: 'blank', hw2: 'nailGolem', scale: 1.8, dash: { every: 15, dist: 20 },
    intro: '🗿 Nail Golems jump ahead and skip part of the path!' }),
};

export function addHalloween2Enemies(ENEMIES) {
  for (const [k, d] of Object.entries(NEW)) ENEMIES[k] = d;
}

// Wave groups: [type, count, secondsBetween, startDelay]. The counts are the spec's; the gaps,
// delays, wave bonuses and timers are guesses. `bonus` is one of four players' share (the event's pot).
const W = (bonus, groups, note) => ({ bonus, groups, ...(note ? { note } : {}) });
export const HALLOWEEN2_WAVES = [
  W(250, [['h2GumDrop', 6, 1, 0], ['h2Mummy', 5, 1.2, 4], ['h2Villager', 4, 1.2, 8]], 'Halloween Night 2! An easy start at the carnival.'),
  W(330, [['h2Monkey', 8, 0.9, 0], ['h2Mummy', 6, 1, 5], ['h2Villager', 6, 1, 10]]),
  W(410, [['h2Candy', 6, 0.9, 0], ['h2StrongMummy', 4, 1.5, 4], ['h2Villager', 8, 0.9, 9]], 'Slow, tougher Mummies.'),
  W(490, [['h2Crow', 6, 0.7, 0], ['h2Scarecrow', 4, 1.2, 4], ['h2Psycho', 2, 2, 8], ['h2Villager', 6, 0.9, 11]]),
  W(570, [['h2Clown', 8, 0.7, 0], ['h2Scarecrow', 5, 1.1, 4], ['h2Demon', 1, 0, 9], ['h2Villager', 10, 0.8, 11]], 'Demons can\'t burn!'),
  W(650, [['h2Shroom', 4, 1, 0], ['h2CottonCandy', 6, 1, 4], ['h2Demon', 1, 0, 9], ['h2MrSaw', 2, 6, 12]], 'MINI-BOSS: Mr. Saw! The first one that attacks towers... and your base.'),
  W(730, [['h2Ghost', 6, 1, 0], ['h2MonkeyBall', 8, 1, 5], ['h2Psycho', 3, 2, 11]], 'Ghosts are HIDDEN: you need hidden detection now!'),
  W(810, [['h2Prowler', 3, 2, 0], ['h2CandyCorn', 8, 0.8, 4], ['h2Ghost', 5, 1, 9], ['h2Demon', 2, 4, 13]]),
  W(890, [['h2SadClown', 6, 1, 0], ['h2Vampire', 2, 3, 5], ['h2PsycopHidden', 4, 1.5, 9]], 'Vampires turn into hidden Bats!'),
  W(970, [['h2Balloon', 6, 1.5, 0], ['h2MrSaw', 3, 5, 6], ['h2Ghost', 6, 1, 10], ['h2Witch', 4, 1.5, 14]], 'Witches fly right through your tanks.'),
  W(1050, [['h2Twist', 6, 1, 0], ['h2Vampire', 3, 3, 5], ['h2Witch', 8, 1, 9], ['h2Psycop', 6, 1.2, 13]]),
  W(1130, [['h2GoodieBag', 4, 3, 0], ['h2MrSaw', 3, 5, 6], ['h2SumReaper', 1, 0, 12], ['h2Judge', 1, 0, 16]], 'MINI-BOSS: the Judge and a Summoner Reaper!'),
  W(1210, [['h2Witch', 10, 0.9, 0], ['h2SumReaper', 2, 6, 5], ['h2Crackle', 4, 1.5, 10], ['h2Prowler', 5, 1.5, 14]]),
  W(1290, [['h2Popcorn', 6, 1, 0], ['h2SpeedClown', 4, 1, 5], ['h2Executioner', 2, 5, 9], ['h2Psycop', 8, 1, 14]], 'Executioners shrug off melee!'),
  W(1370, [['h2Clown', 10, 0.6, 0], ['h2SadClown', 6, 0.8, 4], ['h2SpeedClown', 6, 0.8, 8], ['h2ClownCar', 2, 6, 12]], 'All clowns! Hope you\'re not afraid of clowns...'),
  W(1450, [['h2Frank', 4, 2, 0], ['h2StrongReaper', 3, 2, 6], ['h2Worker', 10, 0.8, 10], ['h2Judge', 2, 6, 15]]),
  W(1530, [['h2ChocolateBar', 6, 1, 0], ['h2BurntPopcorn', 4, 1.5, 5], ['h2Frank', 6, 1.5, 10], ['h2Executioner', 2, 5, 16], ['h2NailHead', 1, 0, 20]], 'Burnt Popcorn is a FIRE type.'),
  W(1610, [['h2Swamp', 5, 2.5, 0], ['h2WingedReaper', 2, 4, 8], ['h2Predator', 1, 0, 14]], 'A dark figure emerges...'),
  W(1690, [['h2BigMonkey', 3, 3, 0], ['h2Swamp', 5, 2.5, 6], ['h2Vile', 2, 2, 12], ['h2ProwlerHidden', 10, 1, 15]]),
  W(1770, [['h2JackLantern', 4, 2.5, 0], ['h2ClownCar', 2, 6, 6], ['h2Judge', 1, 0, 12], ['h2Jaxe', 2, 8, 16]], 'JAXE! His axe stuns towers. Jack O\' Lanterns explode when they die.'),
  W(1850, [['h2SkullReaper', 4, 2, 0], ['h2Lollipop', 8, 0.8, 5], ['h2DreadKnight', 6, 1.5, 10], ['h2Executioner', 3, 4, 16]]),
  W(1930, [['h2BigReaper', 2, 6, 0], ['h2Jaxe', 3, 8, 6], ['h2Heretic', 1, 0, 14]], 'MINI-BOSS: the Heretic!'),
  W(2010, [['h2EvilJack', 1, 0, 0], ['h2Vile', 4, 1.5, 4], ['h2Swamp', 8, 2, 8], ['h2NailGolem', 2, 6, 16]], 'Nail Golems skip part of the path! Save some cash for the boss.'),
  W(2090, [['h2EvilJack', 2, 5, 0], ['h2Predator', 2, 10, 5], ['h2Jaxe', 3, 8, 10], ['h2ClownCar', 4, 4, 16], ['h2Frank', 10, 1, 22]], 'Last stand before the boss!'),
  W(2170, [['h2Ringmaster', 1, 0, 0], ['h2Jaxe', 2, 10, 12], ['h2Vile', 4, 1.5, 20], ['h2Villager', 20, 0.5, 24]], 'FINAL WAVE. It\'s spooky hour...'),
];
// Seconds before the next wave comes anyway (null: not until every enemy is dead). Mini-boss waves
// and the last three wait. All guesses.
export const HALLOWEEN2_TIMERS = [40, 40, 45, 45, 50, null, 50, 50, 55, 55, 60, null, 60, 60, 60, 65, 65, null, 70, 70, 70, null, null, null, null];
