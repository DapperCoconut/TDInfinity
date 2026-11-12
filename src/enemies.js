// ENEMIES: every enemy of Easy, Medium, Hard, Expert, Insane and Void.
// Hardcore and Halloween add their own at the bottom (see hardcore.js and halloween.js).
import { addHardcoreEnemies } from './hardcore.js';
import { addHalloweenEnemies } from './halloween.js';
import { addHalloween2Enemies } from './halloween2.js';
import { addHalloween3Enemies } from './halloween3.js';
import { addLastLaughEnemies } from './lastlaugh.js';

// Insane mode (2026-11-09 spec) guesses: kill reward and base damage from an enemy's health.
const iR = (hp) => Math.max(2, Math.round(1.5 * hp ** 0.55));
const iD = (hp) => Math.max(1, Math.round(hp ** 0.5 / 2));
// Void mode: the same guessed reward / base damage curves as Insane.
const vR = iR;
const vD = iD;

export const ENEMIES = {
  normal: { name: 'Zombie', hp: 5, speed: 6, reward: 6, damage: 5, scale: 1, skin: 0x7fb069, shirt: 0x4a6fa5, pants: 0x3b3b5c },
  fast: { name: 'Runner', hp: 3, speed: 10, reward: 5, damage: 4, scale: 0.85, skin: 0x9ccc65, shirt: 0xe07b24, pants: 0x5a3a22 },
  slow: { name: 'Tank', hp: 22, speed: 3.5, reward: 15, damage: 12, scale: 1.3, skin: 0x55813f, shirt: 0x5d5d5d, pants: 0x333333, helmet: true },
  // Flyers soar over the path: ground units and traps can't touch them, and a few towers
  // (melee, Mortar, Trapper, Lv 1 Crook Boss) can't hit them.
  flying: { name: 'Flyer', hp: 6, speed: 7.5, reward: 9, damage: 6, scale: 0.9, skin: 0x8bc34a, shirt: 0x6d4c41, pants: 0x3e2723, flying: true, wings: 0x4e342e },
  // Lead Zombies wear lead armor: only towers with lead detection can hurt them.
  lead: { name: 'Lead Zombie', hp: 18, speed: 4.5, reward: 14, damage: 10, scale: 1.15, skin: 0x6d8b5a, shirt: 0x78909c, pants: 0x546e7a, lead: true },
  hidden: { name: 'Ghoul', hp: 8, speed: 6.5, reward: 12, damage: 8, scale: 1, skin: 0xa5c4ae, shirt: 0x22283a, pants: 0x111111, hidden: true, hood: true },
  // Androids are only ever sent by other players (Anarchist, or bought in Versus).
  android: { name: 'Android', hp: 30, speed: 5.5, reward: 10, damage: 10, scale: 1.1, skin: 0xb0bec5, shirt: 0x37474f, pants: 0x263238, robot: 0xff1744 },
  superbot: { name: 'Super Bot', hp: 80, speed: 6.5, reward: 20, damage: 18, scale: 1.25, skin: 0xffca28, shirt: 0x212121, pants: 0x111111, robot: 0x00e5ff },
  boss: { name: 'Brute', hp: 150, speed: 2.5, reward: 300, damage: 60, scale: 2.2, skin: 0x4e7d32, shirt: 0x6a1b9a, pants: 0x2a0f3a, boss: true },

  // ---------------------------------------------------------------- Easy mode creatures
  // model: which creature model the client builds (see makeEnemy in models.js); h: model height
  // before `scale`; skin: the color of the death puff (purple for everyone, blue for the King Slime).
  // hp is the base health; Easy's waves set each group's exact health (5th entry in EASY_WAVES).
  // speed is the spec's speed number x3.
  // Types: Fire (burnResist: burns and flames do that much less; frostWeak: frost and freeze do
  // that much more), Poison (poisonResist: poison and toxic gas do that much less).
  // summon: { type, n, every }: drops `n` of `type` behind it every `every` seconds.
  // cage: when destroyed, a random enemy from this list bursts out with `cageHp` of its health.
  // phase2: when killed, it comes back as this enemy with a fresh health pool.
  slime: { name: 'Slime', model: 'easySlime', h: 2.6, hp: 3, speed: 4.5, reward: 4, damage: 3, scale: 1, skin: 0x8e24aa, color: 0x9c4dcc },
  goblin: { name: 'Goblin', model: 'goblin', h: 5.2, hp: 10, speed: 5.4, reward: 7, damage: 6, scale: 0.75, skin: 0x8e24aa },
  spider: { name: 'Spider', model: 'spider', h: 1.8, hp: 17, speed: 18, reward: 9, damage: 6, scale: 0.9, skin: 0x8e24aa },
  ghost: { name: 'Ghost', model: 'ghost', h: 4, hp: 15, speed: 18, reward: 9, damage: 6, scale: 1, skin: 0x8e24aa, hidden: true },
  shroom: { name: 'Shroom', model: 'shroom', h: 3.6, hp: 40, speed: 6, reward: 16, damage: 12, scale: 1, skin: 0x8e24aa, poisonType: true, poisonResist: 0.5 },
  giantGoblin: { name: 'Giant Goblin', model: 'giantGoblin', h: 5.2, hp: 180, speed: 4.2, reward: 60, damage: 40, scale: 1.5, skin: 0x8e24aa },
  fireSlime: { name: 'Fire Slime', model: 'easySlime', h: 2.6, hp: 70, speed: 7.5, reward: 22, damage: 15, scale: 1.2, skin: 0x8e24aa, color: 0xff8f00,
    fireType: true, burnResist: 0.5, frostWeak: 0.5 },
  golem: { name: 'Golem', model: 'boulder', h: 4.2, hp: 70, speed: 3, reward: 22, damage: 15, scale: 1.1, skin: 0x8e24aa },
  reaper: { name: 'Reaper', model: 'reaper', h: 4.4, hp: 450, speed: 6, reward: 90, damage: 60, scale: 0.9, skin: 0x8e24aa, hidden: true },
  infernoSlime: { name: 'Inferno Slime', model: 'easySlime', h: 2.6, hp: 400, speed: 7.5, reward: 70, damage: 50, scale: 1.5, skin: 0x8e24aa, color: 0x1e88e5,
    fireType: true, burnResist: 0.5, frostWeak: 0.5 },
  // The King Slime: no ability, no element. Its death puff is blue.
  kingSlime: { name: 'King Slime', model: 'kingSlime', h: 3, hp: 10000, speed: 2.1, reward: 500, damage: 1000, scale: 3.4, skin: 0x1e88e5, color: 0x1e88e5, boss: true },

  // ---------------------------------------------------------------- Medium mode enemies
  // Medium (Intermediate) from the user's 2026-11-09 spec. Health is exact: Medium doesn't grow
  // enemy health per wave (DIFFICULTIES.medium.flatHp). speed = the spec's speed number x3.
  // Rewards, base damage and anything the spec didn't give are guesses.
  // mlook: which outfit mediumParts (models.js) gives it.
  // iceResist: frost, chill and freezing work that much less on it (1 = not at all).
  // stunImmune: can't be stunned or frozen (slows still work). collisionResist: unit crashes hurt it that much less.
  // multiply.copies / .speed / .noCash: each nearby enemy is copied `copies` times; copies move
  //   `speed` times faster and give no cash (and are never copied again).
  // blast.stun: when killed, stuns towers within `radius` for that long (Shocker).
  // mAttacks: timed attacks on towers (see Sim.mediumAttacks). first: seconds until the first one.
  //   slam { range, stun }: stuns every tower in range. jam { range, slow, time }: towers in range
  //   work `slow` slower. shot { range, pick: strongest|weakest|random, n, same, dmg, pct, near }:
  //   fires at `n` towers (same: n shots at one tower) for dmg + pct of the tower's max health;
  //   near [r, dmg]: towers within r of it take dmg instead. offensive: skips income towers.
  //   cleave { range, dmg }: hurts every tower in range. flame { range, arc, dps, time }: sprays
  //   fire ahead of it. toss { list, ahead, flight }: throws a grenade `ahead` studs down the path
  //   that spawns `list` ([type, n]) enemies there, worth no cash. phase: 2 = only after rage.
  // rage { at, heal, speed, shut, immune, intro }: once its health drops to `at`, it shuts down for
  //   `shut` s (towers get `immune` s of stun immunity), heals `heal`, moves at `speed` and starts
  //   its phase-2 attacks.
  zombiePlus: { name: 'Zombie+', hp: 12, speed: 8.4, reward: 3, damage: 5, scale: 1, skin: 0xf08a3c, shirt: 0x1c1c1c, pants: 0x121212, mlook: 'implants' },
  fastZombiePlus: { name: 'Fast Zombie+', hp: 12, speed: 13.2, reward: 3, damage: 4, scale: 0.85, skin: 0xf08a3c, shirt: 0x1c1c1c, pants: 0x121212, mlook: 'fast' },
  heavyZombiePlus: { name: 'Heavy Zombie+', hp: 35, speed: 7.5, reward: 6, damage: 10, scale: 1.3, skin: 0xf08a3c, shirt: 0x2b2b2b, pants: 0x1c1c1c, mlook: 'heavy', plate: 0x8a8f94 },
  revivedBoss1: { name: 'Revived Boss 1', hp: 295, speed: 7.2, reward: 30, damage: 30, scale: 1.6, skin: 0x2e5d2e, shirt: 0x263226, pants: 0x1b1f1b, mlook: 'revived' },
  multiplier1: { name: 'Multiplier 1', hp: 20, speed: 10.5, reward: 5, damage: 5, scale: 1, skin: 0xff9100, shirt: 0xff9100, pants: 0xff9100, mlook: 'mult', xColor: 0xff6d00,
    iceResist: 1, multiply: { radius: 10, max: 8, copies: 1, speed: 1.3, noCash: true },
    intro: '✖️ Multiplier! When it dies it copies the enemies around it (the copies are faster). Ice can\'t touch it.' },
  grenadier: { name: 'Grenadier', hp: 155, speed: 7.5, reward: 20, damage: 25, scale: 1.1, skin: 0xb5c99a, shirt: 0x161616, pants: 0x161616, mlook: 'grenadier',
    mAttacks: [{ toss: { list: [['zombiePlus', 1], ['fastZombiePlus', 2], ['heavyZombiePlus', 2]], ahead: 0, flight: 0.6 }, first: 1, every: 14 }],
    intro: '💣 Grenadier! Its grenades burst into more zombies.' },
  armoredHeavyZombiePlus: { name: 'Armored Heavy Zombie+', hp: 35, speed: 5.4, reward: 8, damage: 12, scale: 1.3, skin: 0x8b1e1e, shirt: 0x6d6d6d, pants: 0x555555, mlook: 'heavy', plate: 0x9ea4a8,
    bulletResist: 0.95, intro: '🛡️ Armored zombies! Bullets do 95% less to them. Use explosions, fire, melee and the like.' },
  superHeavyZombie: { name: 'Super Heavy Zombie', hp: 550, speed: 6, reward: 50, damage: 60, scale: 1.6, skin: 0xb5605a, shirt: 0x4e4e4e, pants: 0x3a3a3a, mlook: 'superHeavy',
    bulletResist: 0.9 },
  nuclearZombie: { name: 'Nuclear Zombie', hp: 225, speed: 11.4, reward: 20, damage: 25, scale: 1.05, skin: 0x76ff03, shirt: 0x33691e, pants: 0x263d14, mlook: 'nuclear',
    iceResist: 0.8 },
  revivedTitan: { name: 'Revived Titan', hp: 1475, speed: 5.7, reward: 120, damage: 120, scale: 2.2, skin: 0x1b1b1b, shirt: 0x5d0f0f, pants: 0x3d0a0a, mlook: 'titan',
    bulletResist: 0.92 },
  multiplier2: { name: 'Multiplier 2', hp: 100, speed: 7.8, reward: 12, damage: 10, scale: 1.1, skin: 0x2979ff, shirt: 0x2979ff, pants: 0x2979ff, mlook: 'mult', xColor: 0x00b0ff,
    iceResist: 1, multiply: { radius: 10, max: 10, copies: 2, speed: 1.3, noCash: true } },
  monster: { name: 'Monster', hp: 4200, speed: 6.6, reward: 250, damage: 200, scale: 2.4, skin: 0x8d9a8a, shirt: 0x5d5a52, pants: 0x4a463e, mlook: 'monster',
    noHeadshot: true, intro: '🧟 A Monster! Huge health, no resistances.' },
  infiltrator: { name: 'Infiltrator', hp: 850, speed: 24, reward: 50, damage: 60, scale: 1.05, skin: 0x9e9e7e, shirt: 0x616161, pants: 0x616161, mlook: 'infiltrator',
    explosiveResist: 0.85, intro: '🪖 Infiltrators! Extremely fast, and explosions do 85% less to them.' },
  chargerBoss: { name: 'Charger Boss', hp: 2400, speed: 19.8, reward: 120, damage: 150, scale: 1.8, skin: 0x3f6fd8, shirt: 0x1a237e, pants: 0x0d1452, mlook: 'charger',
    intro: '⚡ A Charger Boss! Tough and extremely fast.' },
  smasher: { name: 'Smasher', hp: 9000, speed: 6.6, reward: 400, damage: 300, scale: 2.6, skin: 0x1c1c1c, shirt: 0x5d0f0f, pants: 0x3d0a0a, mlook: 'smasher',
    mAttacks: [{ slam: { range: 10, stun: 3 }, first: 3, every: 37 }],
    intro: '👊 A Smasher! Its smash stuns every tower near it for 3s.' },
  shocker: { name: 'Shocker', hp: 325, speed: 9.6, reward: 25, damage: 25, scale: 1.1, skin: 0xb5c99a, shirt: 0x161616, pants: 0x161616, mlook: 'shocker',
    blast: { radius: 20, dmg: 0, stun: 5, color: 0x40c4ff }, intro: '⚡ Shockers! When one dies, its shockwave stuns towers for 5s.' },
  mPredator: { name: 'Predator', hp: 35000, speed: 7.8, reward: 1500, damage: 150, scale: 2.3, skin: 0x9ccc65, shirt: 0x1c1c1c, pants: 0x1a237e, mlook: 'predator',
    boss: true, stunImmune: true, collisionResist: 0.3,
    mAttacks: [
      { shot: { range: 15, pick: 'strongest', offensive: true, n: 1, dmg: 600, pct: 0.04, kind: 'laser', flight: 0 }, first: 11, every: 15, name: 'Decimation' },
      { shot: { range: 22, pick: 'weakest', n: 3, dmg: 100, near: [10, 250], kind: 'revolver', flight: 0 }, first: 5, every: 12 }],
    intro: '🦾 Miniboss: the PREDATOR! He shoots your towers and can destroy them.' },
  eliteGrenadier: { name: 'Elite Grenadier', hp: 825, speed: 7.5, reward: 60, damage: 80, scale: 1.2, skin: 0xb5c99a, shirt: 0x161616, pants: 0x161616, mlook: 'eliteGrenadier',
    mAttacks: [{ toss: { list: [['revivedBoss1', 2], ['revivedTitan', 1], ['shocker', 1]], ahead: 25, flight: 1.2 }, first: 4, every: 43 }],
    intro: '💣 Elite Grenadier! Its grenades land far down the path and burst into bosses.' },
  revivedAbomination: { name: 'Revived Abomination', hp: 6000, speed: 27, reward: 300, damage: 250, scale: 2.4, skin: 0x7d8a76, shirt: 0x5a5a5a, pants: 0x444444, mlook: 'abomination',
    intro: '☣️ A Revived Abomination! Very tough and VERY fast.' },
  mEradicator: { name: 'Eradicator', hp: 140000, speed: 7.2, reward: 0, damage: 1000, scale: 3.6, skin: 0x1a1a1a, shirt: 0x1a1a1a, pants: 0x141414, mlook: 'eradicator',
    boss: true, statusImmune: true, burnable: true, collisionResist: 0.3,
    mAttacks: [
      { slam: { range: 12, stun: 3, spin: true }, first: 3, every: 45, name: 'Spin Slash' },
      { jam: { range: 18, slow: 0.77, time: 6 }, first: 6, every: 50, name: 'Sword Shock' },
      { shot: { range: 30, pick: 'random', n: 12, dmg: 125, pct: 0.1, kind: 'missile', flight: 1.2 }, first: 15, every: 80, name: 'Rocket Barrage' },
      { shot: { range: 15, pick: 'strongest', n: 3, same: true, dmg: 475, pct: 0.1, kind: 'missile', flight: 0.8 }, first: 6, every: 30, name: 'Triple Rocket Burst' },
      { cleave: { range: 25, dmg: 60 }, first: 3, every: 20, phase: 2, name: 'Energy Cleave' },
      { flame: { range: 20, arc: 100, dps: 84, time: 4 }, first: 5, every: 40, phase: 2, name: 'Pyrotechnics' }],
    rage: { at: 85000, heal: 10000, speed: 8.1, shut: 3, immune: 5, intro: '😡 ELECTRONIC RAGE! The Eradicator healed and got faster, with a sword cleave and a flamethrower!' },
    intro: '⚔️ The ERADICATOR has arrived! Swords, rockets and shockwaves: guard your towers!' },
  // ---------------------------------------------------------------- Hard mode enemies (Fallen)
  // Hard ("Fallen") from the user's 2026-11-09 spec. Health is exact (DIFFICULTIES.hard.flatHp);
  // speed = the spec's speed number x3. Rewards, base damage and anything the spec didn't give are guesses.
  // flook: which outfit fallenParts (models.js) gives it. armor = the spec's defense (1 = 100%: only
  //   defense piercing gets through). bossFirst: the first one spawned in a game is a boss.
  // regen: heals this share of its max health per second (2% every 2 s = 0.01).
  // invuln: can't be hurt for this many seconds after it spawns (Breakers popping out).
  // gift { every, radius }: Fallen Jester gifts make nearby enemies Bloated or Blessed (not bosses or Jesters).
  // necroBurst { radius, slow, time, unitDmg, goo: { n, life, heal, every, r } }: Necrotic Skeleton death.
  // hideAt: turns hidden once its health drops to that share. charge { speed, time }: charges when it spawns.
  // slam.unitDmg: the slam also hurts units within its range. fallenKing / cashDrop: see Sim.fallenKing.
  abnormal: { name: 'Abnormal', hp: 8, speed: 10.5, reward: 3, damage: 2, scale: 1, skin: 0xb5d6a7, shirt: 0x6d4c41, pants: 0x4e342e, flook: 'veins', vein: 0x2e7d32 },
  quick: { name: 'Quick', hp: 10, speed: 19.5, reward: 3, damage: 2, scale: 0.9, skin: 0xb3d4e6, shirt: 0x6d4c41, pants: 0x4e342e, flook: 'veins', vein: 0x1565c0,
    intro: '💨 Quicks! Fast and fragile.' },
  fSkeleton: { name: 'Fallen Skeleton', hp: 50, speed: 12, reward: 5, damage: 4, scale: 1, skin: 0xe0cfa0, shirt: 0xe0cfa0, pants: 0xe0cfa0, face: 'fallenSkull', flook: 'skeleton' },
  fDreg: { name: 'Fallen Dreg', hp: 80, speed: 13.5, reward: 8, damage: 5, scale: 1.05, skin: 0x5c7a99, shirt: 0x607d8b, pants: 0x546e7a, flook: 'dreg',
    armor: 0.2, corpse: 'fCorpse', cageHp: 0.75, intro: '💀 Fallen Dregs leave a Corpse behind: 100% defense, only defense piercing hurts it. You don\'t have to break it.' },
  fCorpse: { name: 'Corpse', model: 'corpse', h: 1.4, hp: 80, speed: 0, reward: 2, damage: 0, scale: 1.1, skin: 0x263238, lava: 0x37474f,
    remains: true, decay: 30, armor: 1, stunImmune: true, fireImmune: true },
  fSquire: { name: 'Fallen Squire', hp: 500, speed: 7.5, reward: 40, damage: 20, scale: 1.4, skin: 0x1c1c1c, shirt: 0x4f7a8a, pants: 0x3e5f6b, face: 'fallen', flook: 'squire',
    armor: 0.5, bossFirst: true, intro: '🛡️ Miniboss: the Fallen Squire! 50% defense.' },
  breaker2: { name: 'Breaker2', hp: 100, speed: 13.5, reward: 6, damage: 5, scale: 1, skin: 0x9ccc65, shirt: 0x9ccc65, pants: 0x9ccc65, face: 'paper', flook: 'paper', figure: 0x1e88e5,
    deathSpawn: { list: ['breaker'], n: 1 }, intro: '📄 Breakers split into smaller Breakers when they die.' },
  breaker: { name: 'Breaker', hp: 50, speed: 16.05, reward: 3, damage: 3, scale: 0.85, skin: 0x64b5f6, shirt: 0x64b5f6, pants: 0x64b5f6, face: 'paper', flook: 'paper', figure: 0x0d47a1,
    invuln: 0.5 },
  fSoul: { name: 'Fallen Soul', hp: 150, speed: 12, reward: 10, damage: 6, scale: 1, skin: 0x1a237e, shirt: 0x1a237e, pants: 0x1a237e, face: 'fallenSkull', flook: 'soul',
    hidden: true, armor: 0.2, intro: '👻 Fallen Souls are hidden! You need hidden detection.' },
  fallen: { name: 'Fallen', hp: 300, speed: 22.5, reward: 15, damage: 8, scale: 1, skin: 0xd7dde0, shirt: 0x26c6da, pants: 0x37474f, flook: 'fallen',
    intro: '🏃 The Fallen: very fast!' },
  fGiant: { name: 'Fallen Giant', hp: 4000, speed: 6, reward: 150, damage: 60, scale: 2.6, skin: 0x161616, shirt: 0xeceff1, pants: 0x212121, face: 'fallen', flook: 'giant',
    stunImmune: true, bossFirst: true, intro: '🗿 Boss: the Fallen Giant! It can\'t be stunned.' },
  fHazmat: { name: 'Fallen Hazmat', hp: 400, speed: 10.5, reward: 25, damage: 12, scale: 1.15, skin: 0x161616, shirt: 0x607d8b, pants: 0x455a64, face: 'fallen', flook: 'hazmat',
    armor: 0.6, fireImmune: true, stunImmune: true, intro: '☢️ Fallen Hazmats: 60% defense, and they can\'t be burned, stunned or frozen.' },
  fPossessed: { name: 'Possessed Armor', hp: 750, speed: 10.5, reward: 30, damage: 20, scale: 1.4, skin: 0x0d0d0d, shirt: 0x90a4ae, pants: 0x78909c, face: 'fallen', flook: 'possessed',
    armor: 0.5, shield: true, phase2: 'fPossessedGhost', intro: '🛡️ Possessed Armor: when its shield breaks the ghost inside gets faster and turns hidden!' },
  fPossessedGhost: { name: 'Possessed Armor (ghost)', hp: 1500, speed: 16.5, reward: 50, damage: 20, scale: 1.3, skin: 0x0d0d0d, shirt: 0x0d0d0d, pants: 0x0d0d0d, face: 'fallen', flook: 'ghost',
    hidden: true },
  fNecro: { name: 'Fallen Necromancer', hp: 3000, speed: 6, reward: 150, damage: 50, scale: 1.5, skin: 0x9e9e9e, shirt: 0x616161, pants: 0x424242, face: 'fallen', flook: 'necro',
    stunImmune: true, summon: { type: 'fSkeleton', n: 8, every: 10 }, intro: '💀 Fallen Necromancer! Every 10s it summons 8 Fallen Skeletons.' },
  fCorrupted: { name: 'Corrupted Fallen', hp: 1200, speed: 22.5, reward: 60, damage: 25, scale: 1.05, skin: 0x161616, shirt: 0x263238, pants: 0x1c1c1c, face: 'fallen', flook: 'corrupted',
    regen: 0.01, intro: '🩸 Corrupted Fallen: fast, and they heal 2% of their health every 2s.' },
  fSeraph: { name: 'Fallen Seraph', hp: 250, speed: 13.5, reward: 15, damage: 8, scale: 1, skin: 0x3f6fd8, shirt: 0x1a237e, pants: 0x0d1452, flook: 'seraph', flying: true, wings: 0x0d1452,
    intro: '🪽 Fallen Seraphs fly! Only towers that hit flyers can reach them.' },
  fJester: { name: 'Fallen Jester', hp: 10000, speed: 9, reward: 400, damage: 100, scale: 1.6, skin: 0x161616, shirt: 0x0d47a1, pants: 0x111111, face: 'fallen', flook: 'jester',
    boss: true, gift: { every: 7.5, radius: 5, bloated: 1.5, blessed: 0.25 },
    intro: '🎁 Boss: the Fallen Jester! Its gifts make nearby enemies Bloated (more health) or Blessed (more defense).' },
  fNecrotic: { name: 'Necrotic Skeleton', hp: 1400, speed: 18, reward: 60, damage: 25, scale: 1.15, skin: 0xe0cfa0, shirt: 0x78909c, pants: 0xe0cfa0, face: 'fallenSkull', flook: 'necrotic',
    necroBurst: { radius: 15, slow: 0.35, time: 3, unitDmg: 40, goo: { n: 4, life: 15, heal: 60, every: 0.5, r: 2.5 } },
    intro: '🦴 Necrotic Skeletons! When one dies, nearby towers fire slower for 3s and its goo heals enemies.' },
  breaker4: { name: 'Breaker4', hp: 320, speed: 9, reward: 15, damage: 10, scale: 1.25, skin: 0x8e24aa, shirt: 0x8e24aa, pants: 0x8e24aa, face: 'paper', flook: 'paper', figure: 0xe53935,
    armor: 0.35, deathSpawn: { list: ['breaker3'], n: 3 }, intro: '📄 Breaker4s split into 3 Breaker3s, which split again!' },
  breaker3: { name: 'Breaker3', hp: 160, speed: 12, reward: 8, damage: 6, scale: 1.1, skin: 0xff7043, shirt: 0xff7043, pants: 0xff7043, face: 'paper', flook: 'paper', figure: 0x43a047,
    armor: 0.2, deathSpawn: { list: ['breaker2'], n: 1 } },
  fRusher: { name: 'Fallen Rusher', hp: 800, speed: 36, reward: 40, damage: 15, scale: 1.2, skin: 0x161616, shirt: 0x37474f, pants: 0x263238, face: 'fallen', flook: 'rusher',
    armor: 0.8, shield: true, phase2: 'fRusherBroken', intro: '💨 Fallen Rushers: VERY fast with 80% defense until their shield breaks.' },
  fRusherBroken: { name: 'Fallen Rusher', hp: 900, speed: 18, reward: 40, damage: 25, scale: 1.2, skin: 0x161616, shirt: 0x37474f, pants: 0x263238, face: 'fallen', flook: 'rusherBroken' },
  fHero: { name: 'Fallen Hero', hp: 3500, speed: 13.5, reward: 150, damage: 50, scale: 1.3, skin: 0x161616, shirt: 0x607d8b, pants: 0x455a64, face: 'fallen', flook: 'hero',
    armor: 0.3, stunImmune: true, intro: '👑 Fallen Heroes: 30% defense, and they can\'t be stunned.' },
  fShield: { name: 'Fallen Shield', hp: 5000, speed: 4.5, reward: 300, damage: 150, scale: 2.4, skin: 0x161616, shirt: 0x26535a, pants: 0x1c3c42, face: 'fallen', flook: 'shieldKnight',
    armor: 0.5, stunImmune: true, bossFirst: true, shield: true, phase2: 'fShieldBroken',
    intro: '🛡️ Boss: the Fallen Shield! When its shield breaks, it charges!' },
  fShieldBroken: { name: 'Fallen Shield', hp: 10000, speed: 4.5, reward: 700, damage: 100, scale: 2.4, skin: 0x161616, shirt: 0x26535a, pants: 0x1c3c42, face: 'fallen', flook: 'shieldBroken',
    armor: 0.5, stunImmune: true, charge: { speed: 18, time: 4 } },
  fSummoner: { name: 'Fallen Summoner', hp: 12500, speed: 4.5, reward: 600, damage: 150, scale: 1.7, skin: 0x161616, shirt: 0x111111, pants: 0x111111, face: 'fallen', flook: 'summoner',
    stunImmune: true, summon: { type: 'fNecrotic', n: 3, every: 20 }, hideAt: 0.5,
    intro: '🔮 The Fallen Summoner! It summons Necrotic Skeletons and turns hidden at half health.' },
  fAngel: { name: 'Fallen Angel', hp: 5000, speed: 9, reward: 250, damage: 80, scale: 1.6, skin: 0x161616, shirt: 0x1565c0, pants: 0x0d47a1, face: 'fallen', flook: 'angel', flying: true, wings: 0x111111,
    regen: 0.01, bossFirst: true, intro: '😇 Boss: the Fallen Angel! It flies and heals 2% every 2s.' },
  fHonorGuard: { name: 'Fallen Honor Guard', hp: 100000, speed: 2.7, reward: 5000, damage: 1000, scale: 3.2, skin: 0x0d0d0d, shirt: 0x26535a, pants: 0x1c3c42, face: 'fallen', flook: 'honorGuard',
    boss: true, stunImmune: true,
    mAttacks: [{ slam: { range: 6, stun: 6, unitDmg: 250, color: 0x00e5ff }, first: 8, every: 15, name: 'Flail Smash' }],
    trail: { every: 2, radius: 3, life: 360, speed: 0.1, color: 0x00838f },
    intro: '⛓️ Boss: the Fallen Honor Guard! Its flails stun towers for 6s, and its goo trail speeds enemies up.' },
  fTank: { name: 'Fallen Tank', hp: 22500, speed: 22.5, reward: 800, damage: 200, scale: 1.9, skin: 0x78909c, shirt: 0x607d8b, pants: 0x546e7a, face: 'helm', flook: 'tank',
    intro: '🚚 The Fallen Tank: huge health AND very fast!' },
  fGuardian: { name: 'Fallen Guardian', hp: 45000, speed: 6, reward: 1500, damage: 400, scale: 2.2, skin: 0x161616, shirt: 0x1565c0, pants: 0x0d47a1, face: 'fallen', flook: 'guardian',
    armor: 0.3, stunImmune: true,
    mAttacks: [{ slam: { range: 8, stun: 3, unitDmg: 150, color: 0xb388ff }, first: 5, every: 10, name: 'Guardian Slash' }],
    intro: '⚔️ The Fallen Guardian! Its slash stuns towers for 3s.' },
  fKing: { name: 'Fallen King', hp: 250000, speed: 4.2, reward: 0, damage: 100000, scale: 3.6, skin: 0x161616, shirt: 0x9e9e9e, pants: 0x616161, face: 'fallenKing', flook: 'king',
    boss: true, stunImmune: true,
    summon: { type: 'fNecrotic', n: 5, every: 45 },
    fallenKing: {
      horde: { at: 0.5, n: 40, list: ['fPossessed', 'fCorrupted', 'fHero', 'fGiant', 'fNecro'] },
      swing: { every: 25, first: 10, range: 18, gap: 0.7, arcs: [120, 240, 360], stun: 6, unitDmg: 100 },
      comet: { every: 45, first: 30, stun: 5, unitDmg: 50 },
      bone: { loss: 0.2, add: 0.15, max: 0.6 },
    },
    cashDrop: { pct: 0.05, cash: 10000 },
    intro: '👑 FINAL BOSS: THE FALLEN KING! Sword swings and comets stun your towers. He drops $10,000 for every 5% of his health!' },

  // ---------------------------------------------------------------- Expert mode enemies
  // Expert from the user's 2026-11-09 spec: cracked figures, Vio ghosts, bots and beings of time,
  // 30 waves ending with the Beholder. Health is exact (DIFFICULTIES.expert.flatHp).
  // speed = the spec's speed x 0.45 (this spec's numbers run ~6.7x Hard's, so x0.45 lines its
  // "very fast" up with Hard's). Rewards, base damage and anything the spec didn't give are guesses.
  // xlook: which outfit expertParts (models.js) gives it.
  // mpTop: its health with 6 players, as a multiple of solo (grows evenly per extra player).
  //   mpPow: +this much health per extra player, compounding (Beholder). Neither: same health in multiplayer.
  // A negative resistance is a weakness (bulletResist: -0.75 = takes 75% more from bullets).
  // plasmaResist: placeholder, the game has no plasma damage type yet. ghost: placeholder (Viorb).
  // deathHaste { radius, speed, time }: when killed, enemies within `radius` move `speed` faster for `time` s.
  // placeAt [a, b]: appears at a random spot between those shares of the path (instead of the entrance).
  // summon `noCash`: the summons give no kill cash.
  // shots: `n` orbs at random towers; `shrink` s of halved range, `weak` { amt, time, max } stacking
  //   damage cut, `haste` { radius, speed, time } speeds up enemies near the shooter (Vio Gunner).
  // sprint { every, time, speed }: runs `speed` times faster for `time` s every `every` s (Time Runner).
  // moves { first, every, list }: a boss picks one of `list` every `every` s (see Sim.expertMoves).
  // sacrifice { at, resist, sellDmg, rams }: Rebirther's Blood Sacrifice (see Sim.expertMoves).
  // unsheathe { at, time }: Death Angel: no attacks until it has lost `at` of its health; then it
  //   stops for `time` s and draws its staff.
  // shift { at, into, heal, refund }: below `at` health it warps everyone to the Beholder's Field
  //   (Sim.timeShift): `into` takes over at full health (heal), towers are refunded `refund` of what they cost.
  xDrab: { name: 'Cracked Drab', hp: 15, speed: 12.4, reward: 4, damage: 3, scale: 1, skin: 0xc5e1a5, shirt: 0x8a8a8a, pants: 0x7a7a7a, face: 'blank', xlook: 'cracked',
    intro: '🪨 Expert mode! Cracked Drabs are weak but quick on their feet.' },
  xQuick: { name: 'Cracked Quick', hp: 15, speed: 33.8, reward: 4, damage: 3, scale: 0.95, skin: 0x81d4fa, shirt: 0x8a8a8a, pants: 0x7a7a7a, face: 'blank', xlook: 'cracked',
    intro: '💨 Cracked Quicks are extremely fast!' },
  xTrampled: { name: 'Cracked Trampled', hp: 105, speed: 6.75, reward: 10, damage: 8, scale: 1.25, skin: 0x4a4e69, shirt: 0x8a8a8a, pants: 0x7a7a7a, face: 'blank', xlook: 'trampled',
    intro: '🐢 Cracked Trampled: slow and tanky.' },
  xNoticeable: { name: 'Noticeable', hp: 25, speed: 6.75, reward: 6, damage: 4, scale: 1, skin: 0xce93d8, shirt: 0xb39ddb, pants: 0xb39ddb, face: 'blank', xlook: 'noticeable',
    hidden: true, intro: '👻 Noticeables are hidden! You need hidden detection.' },
  xLimbed: { name: 'Limbed', hp: 850, mpTop: 1100 / 850, speed: 6.75, reward: 55, damage: 25, scale: 1.3, skin: 0x7cb342, shirt: 0x8a8a8a, pants: 0x7a7a7a, face: 'blank', xlook: 'limbed',
    intro: '💪 Limbed: huge arms, lots of health.' },
  xQuickLimbed: { name: 'Quick Limbed', hp: 1050, mpTop: 1550 / 1050, speed: 22.5, reward: 65, damage: 30, scale: 1.3, skin: 0x42a5f5, shirt: 0x8a8a8a, pants: 0x7a7a7a, face: 'blank', xlook: 'limbed',
    intro: '💨 Quick Limbed: a Limbed that runs!' },
  xCharger: { name: 'Charger', hp: 75, speed: 40, reward: 12, damage: 10, scale: 1, skin: 0xff4fa3, shirt: 0x161616, pants: 0x111111, face: 'blank', xlook: 'charger', glowC: 0xff4fa3,
    intro: '⚡ Chargers are among the fastest things in the game!' },
  xViodrop: { name: 'Viodrop', hp: 65, speed: 15.75, reward: 8, damage: 6, scale: 0.95, skin: 0xd1b3ff, shirt: 0xd1b3ff, pants: 0xd1b3ff, face: 'blank', xlook: 'vio',
    bulletResist: -0.75, explosiveResist: 0.5, intro: '🟣 Viodrops come in swarms. Vio enemies resist explosions but bullets hurt them a lot more.' },
  xOvercharged: { name: 'Overcharged', hp: 400, speed: 22.5, reward: 30, damage: 20, scale: 1.15, skin: 0xff4fa3, shirt: 0x8a8a8a, pants: 0x7a7a7a, face: 'blank', xlook: 'overcharged', glowC: 0xff4fa3,
    plasmaResist: 0.5, deathHaste: { radius: 12, speed: 1, time: 3 },
    intro: '⚡ Overcharged: when one dies, the enemies around it get a big burst of speed!' },
  xCloaker: { name: 'Cloaker Bot', hp: 150, speed: 9, reward: 15, damage: 20, scale: 1.1, skin: 0x9e9e9e, shirt: 0x757575, pants: 0x616161, face: 'visor', xlook: 'cloaker', glowC: 0xb388ff,
    hidden: true, shield: true, phase2: 'xCloakerBare', bulletResist: 0.5, explosiveResist: -0.75,
    intro: '🫧 Cloaker Bots are hidden until their bubble shield breaks, then they speed up. Explosions wreck them.' },
  xCloakerBare: { name: 'Cloaker Bot', hp: 450, speed: 18, reward: 20, damage: 20, scale: 1.1, skin: 0x9e9e9e, shirt: 0x757575, pants: 0x616161, face: 'visor', xlook: 'bot', glowC: 0xb388ff,
    bulletResist: 0.5, explosiveResist: -0.75 },
  xViorb: { name: 'Viorb', model: 'viorb', h: 4, hp: 3500, speed: 0, reward: 150, damage: 0, scale: 1.5, skin: 0xd500f9,
    bulletResist: -0.75, explosiveResist: 0.5, ghost: true, placeAt: [0.2, 0.55],
    summon: { type: 'xViodrop', n: 2, every: 5, here: true, noCash: true },
    intro: '🔮 A Viorb! It never moves, but it keeps summoning Viodrops until you destroy it.' },
  xVioGunner: { name: 'Vio Gunner', hp: 1550, mpTop: 2550 / 1550, speed: 7.9, reward: 100, damage: 40, scale: 1.25, skin: 0xd1b3ff, shirt: 0x9c27b0, pants: 0x7b1fa2, face: 'goggles', xlook: 'vioGunner',
    bulletResist: -0.75, explosiveResist: 0.5,
    shots: [{ kind: 'vioOrb', range: 28, radius: 2.5, dmg: 15, every: 6, n: 4, flight: 0.9, shrink: 6, weak: { amt: 0.5, time: 6, max: 0.75 }, haste: { radius: 12, speed: 0.4, time: 4 } }],
    intro: '🔫 Vio Gunners fire orbs that halve your towers\' range and cut their damage (it stacks!), and speed up nearby enemies.' },
  xArmoured: { name: 'Armoured Bot', hp: 1500, speed: 6.75, reward: 90, damage: 40, scale: 1.4, skin: 0x1a237e, shirt: 0x1a237e, pants: 0x121858, face: 'visorRed', xlook: 'armoured',
    bulletResist: 0.8, explosiveResist: -0.5, intro: '🤖 Armoured Bots barely feel bullets, but explosions hurt them more.' },
  xUndercharged: { name: 'Undercharged', hp: 100, speed: 50, reward: 10, damage: 25, scale: 1.05, skin: 0xaa00ff, shirt: 0x8a8a8a, pants: 0x7a7a7a, face: 'blank', xlook: 'undercharged', glowC: 0xaa00ff,
    shield: true, phase2: 'xUnderchargedBare', intro: '⚡ Undercharged: the FASTEST enemy in the game, until its shield breaks!' },
  xUnderchargedBare: { name: 'Undercharged', hp: 500, speed: 22.5, reward: 30, damage: 25, scale: 1.05, skin: 0xaa00ff, shirt: 0x8a8a8a, pants: 0x7a7a7a, face: 'blank', xlook: 'undercharged', glowC: 0x6a1b9a },
  xRusher: { name: 'Rusher', hp: 4250, mpTop: 6750 / 4250, speed: 22.5, reward: 150, damage: 60, scale: 1.15, skin: 0x1e88e5, shirt: 0x424242, pants: 0x333333, face: 'blank', xlook: 'rusher',
    intro: '🏃 Rushers: fast AND tough.' },
  xScarlet: { name: 'Scarlet', hp: 5000, mpTop: 1.5, speed: 6.75, reward: 120, damage: 60, scale: 1.25, skin: 0x212121, shirt: 0x757575, pants: 0x616161, face: 'hoodPurple', xlook: 'scarlet',
    bulletResist: -0.25, explosiveResist: -0.25, plasmaResist: 0.25 },
  xFlagBot: { name: 'Flag Bot', hp: 1500, speed: 9, reward: 90, damage: 40, scale: 1.3, skin: 0x263238, shirt: 0x263238, pants: 0x1c1c1c, face: 'visorRed', xlook: 'flagBot',
    aggro: 1e4, bulletResist: 0.5, explosiveResist: -0.75,
    intro: '🚩 Flag Bots: every tower that can reach one HAS to target it. Explosions hurt them more.' },
  xVioRusher: { name: 'Vio Rusher', hp: 15000, mpTop: 1.5, speed: 33.8, reward: 320, damage: 100, scale: 1.2, skin: 0xaa00ff, shirt: 0x161616, pants: 0x111111, face: 'blank', xlook: 'charger', glowC: 0xaa00ff,
    intro: '🟣 Vio Rushers: a much stronger, much faster Rusher.' },
  xShieldBot: { name: 'Shield Bot', hp: 7500, speed: 7.9, reward: 250, damage: 150, scale: 1.55, skin: 0x311b92, shirt: 0x311b92, pants: 0x1a0f3a, face: 'visorRed', xlook: 'shieldBot',
    bulletResist: 0.8, shield: true, phase2: 'xShieldBotBare',
    intro: '🛡️ Shield Bots: a stronger Armoured Bot with a big shield, and explosions don\'t hurt it extra.' },
  xShieldBotBare: { name: 'Shield Bot', hp: 16000, speed: 7.9, reward: 400, damage: 150, scale: 1.55, skin: 0x311b92, shirt: 0x311b92, pants: 0x1a0f3a, face: 'visorRed', xlook: 'armoured',
    bulletResist: 0.8 },
  xTimeRunner: { name: 'Time Runner', hp: 35000, mpTop: 47500 / 35000, speed: 13.5, reward: 500, damage: 150, scale: 1.1, skin: 0xffffff, shirt: 0xf5f5f5, pants: 0xeeeeee, face: 'blank', xlook: 'timeRunner', glowC: 0xb388ff,
    sprint: { every: 6, time: 1.5, speed: 4 }, intro: '⏱️ Time Runners dash forward at huge speed every few seconds!' },
  xTimeTitan: { name: 'Time Titan', hp: 70000, mpTop: 95000 / 70000, speed: 6.75, reward: 400, damage: 200, scale: 2.1, skin: 0x1a237e, shirt: 0x1a237e, pants: 0x121858, face: 'blank', xlook: 'timeTitan', glowC: 0x8c9eff,
    lessDmgCash: true, intro: '⚡ Time Titans: huge tanks that pay less cash than you\'d think.' },
  xTimeCrystal: { name: 'Time Crystal', model: 'timeCrystal', h: 6, hp: 37500, mpTop: 42500 / 37500, speed: 2.25, reward: 300, damage: 150, scale: 1.4, skin: 0xffffff,
    deathSpawn: { list: ['xFragment'], n: 6 }, intro: '💎 Time Crystals shatter into Time Fragments when destroyed!' },
  xFragment: { name: 'Time Fragment', model: 'timeFragment', h: 3, hp: 2993, speed: 4.5, reward: 40, damage: 40, scale: 1.1, skin: 0xff4fa3 },
  xTimeShard: { name: 'Time Shard', hp: 400, speed: 18, reward: 20, damage: 10, scale: 0.8, skin: 0xffffff, shirt: 0xffffff, pants: 0xf5f5f5, face: 'blank', xlook: 'timeShard', glowC: 0xb388ff,
    armor: 0.5, bulletResist: 0.5, laserResist: 0.5, explosiveResist: 0.5, shield: true, phase2: 'xTimeShardBare' },
  xTimeShardBare: { name: 'Time Shard', hp: 4, speed: 18, reward: 10, damage: 10, scale: 0.8, skin: 0xffffff, shirt: 0xffffff, pants: 0xf5f5f5, face: 'blank', xlook: 'timeShardBare', glowC: 0xb388ff,
    armor: 0.5 },
  xDoomelist: { name: 'Doomelist', hp: 50000, mpTop: 62500 / 50000, speed: 4.5, reward: 800, damage: 300, scale: 1.7, skin: 0xffccbc, shirt: 0xeceff1, pants: 0xb71c1c, face: 'goggles', xlook: 'doomelist',
    stunImmune: true, shots: [{ kind: 'rocket', range: 45, radius: 9, dmg: 120, every: 14, flight: 1.6 }],
    intro: '🚀 Doomelists fire giant rockets that blow up everything around where they land!' },
  xRebirther: { name: 'Rebirther', hp: 100000, speed: 4.05, reward: 3000, damage: 1000, scale: 2.4, skin: 0x212121, shirt: 0x4a148c, pants: 0x111111, face: 'hoodPurple', xlook: 'rebirther',
    boss: true, stunImmune: true,
    moves: { first: 6, every: 10, list: [
      { key: 'violetCall', w: 2, summon: 'xScarlet', n: 2 },
      { key: 'bloodRain', w: 2, dmg: 10, stun: 2 },
      { key: 'ritual', w: 1 }] },
    sacrifice: { at: 0.5, resist: 0.999, sellDmg: 1, rams: ['enforcementBase', 'buccaneer'] },
    intro: '🩸 BOSS: the Rebirther! It summons Scarlets, rains blood on your towers, and its Ritual kills a tower.' },
  xDeathAngel: { name: 'Death Angel', hp: 100000, mpTop: 3.5, speed: 7.9, reward: 4000, damage: 1000, scale: 2.2, skin: 0xfbe9e7, shirt: 0xefebe9, pants: 0xd7ccc8, face: 'angel', xlook: 'deathAngel',
    boss: true, stunImmune: true, unsheathe: { at: 0.8, time: 2 },
    moves: { first: 2, every: 8, list: [
      { key: 'twirl', w: 2, range: 16, dmg: 21, stun: 2 },
      { key: 'bloodAssembly', w: 2, n: 5, radius: 4, dmg: 40, flight: 1.2 },
      { key: 'purePain', w: 1, range: 15, dmg: 250 }] },
    intro: '🪽 BOSS: the Death Angel! Once it draws its staff, its Pure Pain can one-shot towers, even through shields.' },
  xBeholder: { name: 'Beholder', h: 5.2, hp: 250000, mpPow: 0.25, speed: 4.3, reward: 0, damage: 100000, scale: 3.8, skin: 0x050505, shirt: 0x9e9e9e, pants: 0x616161, face: 'beholder', xlook: 'beholder',
    boss: true, stunImmune: true, chrono: true,
    moves: { first: 5, every: 8, list: [
      { key: 'timeSnap', w: 2, range: 18, dmg: 40, stun: 3 },
      { key: 'realityTear', w: 2, n: 8, radius: 4, dmg: 35, flight: 1.5 },
      { key: 'timeParadox', w: 2, n: 3, gap: 3 }] },
    shift: { at: 0.15, into: 'xBeholderField', heal: true, refund: 1, wait: 20 },
    intro: '👁️ FINAL BOSS: the Beholder, time itself! Its Time Paradox turns your towers into other towers.' },
  // In the Beholder's Field: back at full health, with Time Crystals and Time Shards at its side.
  xBeholderField: { name: 'Beholder (Beholder\'s Field)', h: 5.2, hp: 250000, speed: 4.3, reward: 0, damage: 100000, scale: 3.8, skin: 0x050505, shirt: 0x9e9e9e, pants: 0x616161, face: 'beholder', xlook: 'beholder',
    boss: true, stunImmune: true, chrono: true, fixedHp: true,
    moves: { first: 10, every: 8, list: [
      { key: 'timeSnap', w: 2, range: 18, dmg: 40, stun: 3 },
      { key: 'realityTear', w: 2, n: 8, radius: 4, dmg: 35, flight: 1.5 },
      { key: 'timeParadox', w: 2, n: 3, gap: 3 }] },
    summon: [{ type: 'xTimeCrystal', n: 1, every: 30 }, { type: 'xTimeShard', n: 3, every: 15 }],
    shiftIntro: '🌌 The Beholder WARPED you to the Beholder\'s Field! It healed fully, and your towers were refunded. Rebuild fast, it moves in 20 seconds!' },
  // ---------------------------------------------------------------- Insane mode enemies
  // Insane from the user's 2026-11-09 spec: soldiers, robots, the XCF and beings of light and
  // corruption, 50 waves ending with the Overlord. Health is exact (DIFFICULTIES.insane.flatHp);
  // "X + Y shield" = a shield form with Y health (`shield`, phase2) that turns into the bare form
  // with X. speed = the spec's speed x3 (like Easy / Medium / Hard). Rewards (iR), base damage (iD)
  // and anything the spec didn't give (ability timings, ranges, stun lengths) are guesses.
  // ilook: which outfit orionParts (models.js) gives a humanoid one; glowC: its glow color.
  // defense: flat damage blocked from every direct hit (damage over time ignores it; defense
  //   piercing `defPierce` cuts it like armor). maxHit: no single hit does more than this.
  // freezeImmune: can't be frozen or chilled. shockImmune: electricity can't stun it (approximation:
  //   no tower stuns at all, except stun-anything ones like the Stunner; no Byte shocks or Paralyzer slows).
  // healPulse { every, radius, hp | pct, over }: every `every` s heals the other enemies within
  //   `radius` by `hp` (or `pct` of their max health), up to `over` x their max health (1 = no overheal).
  // build { after, type }: `after` s after it spawns it builds a `type` next to itself and stands
  //   still until that is destroyed (Engineer -> MK11-Device). Only once, even after its shield breaks.
  // moves (see Sim.expertMoves / bossMove): `once` moves are used one time only.
  // taunt { time, maxHit }: right after it spawns it stands still for `time` s and no hit does more than `maxHit`.
  // backup { at, type, n }: below `at` of its health, `n` `type`s appear next to it (Overlord Amplifiers:
  //   `amp` heals it, never past ampCap of its max health). despair { speed, defense, maxHit, summon, n }:
  //   once every Amplifier is destroyed it moves `speed` x faster, gets tougher, and `summon`s come out of the entrance.
  // throwAt { at, speed }: below `at` of its health it throws its hammer away: `speed` x faster, no more moves.
  // Wiki looks the spec gave are in each enemy's ilook (orionParts).
  iSwordsman: { name: 'Swordsman', hp: 5, speed: 11.1, reward: iR(5), damage: iD(5), scale: 1, skin: 0x9e9e9e, shirt: 0x1c1c1c, pants: 0x1c1c1c, face: 'frown', ilook: 'swordsman',
    intro: '⚔️ Insane mode! Swordsmen carry a sword they never use. Enemies here have Defense: it blocks some damage from every hit.' },
  iNinja: { name: 'Ninja', hp: 6, speed: 18, reward: iR(6), damage: iD(6), scale: 0.95, skin: 0xf5f5f5, shirt: 0x111111, pants: 0x111111, face: 'frown', ilook: 'ninja',
    intro: '🥷 Ninjas are fast and come in groups.' },
  iWorker: { name: 'Worker', hp: 14, speed: 10.5, reward: iR(14), damage: iD(14), scale: 1.05, skin: 0xef9a9a, shirt: 0xe57373, pants: 0x424242, face: 'zombie', ilook: 'worker' },
  iSoldier: { name: 'Soldier', hp: 16, speed: 9, reward: iR(16), damage: iD(16), scale: 1.05, skin: 0xa5d6a7, shirt: 0x2e7d32, pants: 0x33691e, face: 'frown', ilook: 'soldier',
    defense: 1, intro: '🪖 Soldiers have 1 Defense: every hit on them does 1 less damage.' },
  iMetallic: { name: 'Metallic', hp: 125, speed: 8.4, reward: iR(125), damage: iD(125), scale: 1.25, skin: 0x424242, shirt: 0x37474f, pants: 0x37474f, face: 'visorRed', ilook: 'metallic', glowC: 0xff1744,
    defense: 2, intro: '🤖 A Metallic! Tough, with 2 Defense.' },
  iJetpacker: { name: 'Jetpacker', hp: 18, speed: 16.5, reward: iR(18), damage: iD(18), scale: 1, skin: 0x212121, shirt: 0x111111, pants: 0x111111, face: 'visor', ilook: 'jetpacker', glowC: 0x76ff03,
    flying: true, defense: 1, freezeImmune: true, intro: '🚀 Jetpackers fly! You need towers that can hit flying enemies. They can\'t be frozen.' },
  iDrone: { name: 'Drone', model: 'crystalCar', h: 2.2, hp: 50, speed: 30, reward: iR(50), damage: iD(50), scale: 0.7, skin: 0x81d4fa, shard: 0x40c4ff,
    intro: '🚙 Drones are very fast little cars.' },
  iTruck: { name: 'Truck M2', model: 'iTruck', h: 3.2, hp: 40, speed: 16.8, reward: iR(40), damage: iD(40), scale: 1, skin: 0x33691e,
    defense: 2, bulletResist: 0.45, deathSpawn: { list: ['iSoldier'], n: 4 },
    intro: '🚚 Truck M2s resist bullets (45% less damage) and drop 4 Soldiers when destroyed!' },
  iBerserker: { name: 'Berserker', hp: 800, speed: 4.05, reward: iR(800), damage: iD(2500), scale: 2, skin: 0x00695c, shirt: 0x004d40, pants: 0x00332c, face: 'blank', ilook: 'berserker', glowC: 0x40c4ff,
    boss: true, shield: true, phase2: 'iBerserkerBare', defense: 1, moves: { first: 4, every: 2, list: [{ key: 'hammerSmash', once: true, range: 16, stun: 15 }] },
    intro: '🔨 Miniboss: the Berserker! Its Hammer Smash stuns one tower for a long time (only once).' },
  iBerserkerBare: { name: 'Berserker', hp: 1700, speed: 4.05, reward: iR(1700), damage: iD(2500), scale: 2, skin: 0x00695c, shirt: 0x004d40, pants: 0x00332c, face: 'blank', ilook: 'berserker', glowC: 0x40c4ff,
    boss: true, defense: 1, moves: { first: 2, every: 2, list: [{ key: 'hammerSmash', once: true, range: 16, stun: 15 }] } },
  iTeleporter: { name: 'Teleporter', hp: 115, speed: 18, reward: iR(115), damage: iD(115), scale: 1.05, skin: 0xe53935, shirt: 0x37474f, pants: 0x263238, face: 'frown', ilook: 'teleporter', glowC: 0x40c4ff,
    defense: 2, deathSpawn: { list: ['iMetallic', 'iDrone', 'iUfo', 'iTruck'], n: 1 },
    intro: '📡 Teleporters pull in a Metallic, Drone, UFO or Truck M2 when they die!' },
  iSprinterM5: { name: 'Sprinter M5', hp: 600, speed: 18, reward: iR(600), damage: iD(600), scale: 1, skin: 0xffe0b2, shirt: 0x81d4fa, pants: 0x37474f, face: 'halfMetal', ilook: 'sprinterM5', glowC: 0x40c4ff,
    freezeImmune: true, shockImmune: true, intro: '🦾 Sprinter M5s are fast, and can\'t be frozen or stunned by electricity.' },
  iUfo: { name: 'UFO', model: 'crystalUfo', h: 2.4, hp: 250, speed: 9, reward: iR(250), damage: iD(300), scale: 0.8, skin: 0x111111, shard: 0x2979ff,
    flying: true, defense: 2, shield: true, phase2: 'iUfoBare', intro: '🛸 UFOs fly, and their blue forcefield has to break before you can hurt the UFO.' },
  iUfoBare: { name: 'UFO', model: 'crystalUfo', h: 2.4, hp: 50, speed: 9, reward: iR(50), damage: iD(300), scale: 0.8, skin: 0x111111, shard: 0x2979ff, flying: true, defense: 2 },
  iEliteSoldier: { name: 'Elite Soldier', hp: 175, speed: 21, reward: iR(175), damage: iD(175), scale: 1.1, skin: 0x9e9e9e, shirt: 0x757575, pants: 0x616161, face: 'blank', ilook: 'eliteSoldier', glowC: 0x40c4ff,
    intro: '🗡️ Elite Soldiers: very fast, with glowing blue swords.' },
  iEliteDrone: { name: 'Elite Drone', model: 'crystalCar', h: 2, hp: 75, speed: 39, reward: iR(75), damage: iD(75), scale: 0.6, skin: 0x111111, shard: 0xaa00ff,
    defense: 10, freezeImmune: true, intro: '🏎️ Elite Drones are tiny, rapid and armored: 10 Defense! Weak hits do nothing to them.' },
  iRaygunner: { name: 'Raygunner', hp: 300, speed: 10.5, reward: iR(300), damage: iD(500), scale: 1.05, skin: 0xffcc80, shirt: 0x263238, pants: 0x212121, face: 'eyepatch', ilook: 'raygunner', glowC: 0x40c4ff,
    shield: true, phase2: 'iRaygunnerBare', intro: '🔫 Raygunners hide in a shield bubble until it breaks.' },
  iRaygunnerBare: { name: 'Raygunner', hp: 200, speed: 10.5, reward: iR(200), damage: iD(500), scale: 1.05, skin: 0xffcc80, shirt: 0x263238, pants: 0x212121, face: 'eyepatch', ilook: 'raygunnerBare', glowC: 0x40c4ff },
  iEliteTeleporter: { name: 'Elite Teleporter', hp: 400, speed: 21.6, reward: iR(400), damage: iD(400), scale: 1.1, skin: 0x00b0ff, shirt: 0x263238, pants: 0x1c1c1c, face: 'blank', ilook: 'eliteTeleporter', glowC: 0x00e5ff,
    deathSpawn: { list: ['iEliteSoldier', 'iShielder', 'iSprinterM5', 'iRaygunner', 'iCosmil'], n: 1 },
    intro: '🌀 Elite Teleporters pull in an Elite Soldier, Shielder, Sprinter M5, Raygunner or Cosmil when they die!' },
  iMedic: { name: 'Field Medic', hp: 135, speed: 9.75, reward: iR(135), damage: iD(135), scale: 1.05, skin: 0xffe0b2, shirt: 0xfafafa, pants: 0xeceff1, face: 'smile', ilook: 'medic',
    defense: 4, healPulse: { every: 4, radius: 12, hp: 50, over: 1 }, intro: '⛑️ Field Medics heal the enemies around them by 50 every few seconds. Take them out first!' },
  iShielder: { name: 'Shielder', hp: 840, speed: 6.9, reward: iR(840), damage: iD(1000), scale: 1.2, skin: 0xeceff1, shirt: 0xfafafa, pants: 0xe0e0e0, face: 'visor', ilook: 'shielder', glowC: 0x40c4ff,
    defense: 4, shield: true, phase2: 'iShielderBare', intro: '🛡️ Shielders carry a big plasma shield, with 4 Defense.' },
  iShielderBare: { name: 'Shielder', hp: 200, speed: 6.9, reward: iR(200), damage: iD(1000), scale: 1.2, skin: 0xeceff1, shirt: 0xfafafa, pants: 0xe0e0e0, face: 'visor', ilook: 'shielderBare', glowC: 0x40c4ff, defense: 4 },
  iCarrier: { name: 'Carrier Tank', model: 'iCarrier', h: 3, hp: 1000, speed: 6, reward: iR(1000), damage: iD(6000), scale: 1.2, skin: 0x311b92, shard: 0xd500f9,
    defense: 5, freezeImmune: true, shockImmune: true, shield: true, phase2: 'iCarrierBare',
    intro: '🛻 Carrier Tanks: shielded, 5 Defense, can\'t be frozen or shocked, and they release Elite units when destroyed!' },
  iCarrierBare: { name: 'Carrier Tank', model: 'iCarrier', h: 3, hp: 5000, speed: 6, reward: iR(5000), damage: iD(6000), scale: 1.2, skin: 0x311b92, shard: 0xd500f9,
    defense: 5, freezeImmune: true, shockImmune: true, deathSpawn: { list: ['iEliteTeleporter', 'iEliteDrone', 'iEliteSoldier', 'iRaygunner'], n: 4 } },
  iEliteSwordsman: { name: 'Elite Swordsman', hp: 200, speed: 10.8, reward: iR(200), damage: iD(200), scale: 1, skin: 0x111111, shirt: 0x111111, pants: 0x111111, face: 'blank', ilook: 'eliteSwordsman', glowC: 0xffffff,
    defense: 1 },
  iCosmil: { name: 'Cosmil', hp: 450, speed: 15, reward: iR(450), damage: iD(450), scale: 1.15, skin: 0x80d8ff, shirt: 0x1c1c1c, pants: 0x1c1c1c, face: 'visorRed', ilook: 'cosmil', glowC: 0xff1744,
    defense: 20, intro: '🔴 Cosmils have 20 Defense! Small hits barely scratch them. Use strong single hits.' },
  iEngineer: { name: 'Engineer', hp: 2000, speed: 6.6, reward: iR(2000), damage: iD(10000), scale: 1.35, skin: 0x81d4fa, shirt: 0x0277bd, pants: 0x111111, face: 'welder', ilook: 'engineer',
    defense: 2, shield: true, phase2: 'iEngineerBare', build: { after: 6, type: 'iMK11' },
    intro: '🔧 Engineers build an MK11-Device that keeps summoning Elite Soldiers, and wait by it until it\'s destroyed!' },
  iEngineerBare: { name: 'Engineer', hp: 8000, speed: 6.6, reward: iR(8000), damage: iD(10000), scale: 1.35, skin: 0x81d4fa, shirt: 0x0277bd, pants: 0x111111, face: 'welder', ilook: 'engineer',
    defense: 2, build: { after: 2, type: 'iMK11' } },
  iMK11: { name: 'MK11-Device', model: 'iMK11', h: 3, hp: 1000, speed: 0.3, reward: iR(1000), damage: iD(1000), scale: 1, skin: 0x1c1c1c, shard: 0x2979ff,
    summon: { type: 'iEliteSoldier', n: [2, 3], every: 6.5, here: true } },
  iPureEnergy: { name: 'Pure Energy', hp: 150, speed: 45, reward: iR(150), damage: iD(450), scale: 1, skin: 0xaa00ff, shirt: 0xaa00ff, pants: 0xaa00ff, face: 'blank', ilook: 'pureEnergy', glowC: 0xd500f9,
    shield: true, phase2: 'iPureEnergyBare', maxHit: 250, freezeImmune: true,
    intro: '💜 Pure Energy: very, VERY fast, and no single hit can do more than 250 damage to it.' },
  iPureEnergyBare: { name: 'Pure Energy', hp: 300, speed: 45, reward: iR(300), damage: iD(450), scale: 1, skin: 0xaa00ff, shirt: 0xaa00ff, pants: 0xaa00ff, face: 'blank', ilook: 'pureEnergy', glowC: 0xd500f9,
    maxHit: 250, freezeImmune: true },
  iBoltmaster: { name: 'Boltmaster', hp: 50000, speed: 4.5, reward: iR(50000), damage: 1e5, scale: 2.3, skin: 0x111111, shirt: 0x1c1c1c, pants: 0x111111, face: 'visor', ilook: 'boltmaster', glowC: 0xaa00ff,
    boss: true, defense: 6, freezeImmune: true, shockImmune: true,
    moves: { first: 5, every: 9, list: [
      { key: 'boltSlam', w: 2, range: 24, slow: 0.5, time: 8, inner: 11, stun: 3 },
      { key: 'callUnits', w: 1, list: ['iShielder', 'iCosmil', 'iMK11', 'iRaygunner', 'iUfo'], n: 3, name: 'Bolt Summon' }] },
    intro: '⚡ BOSS: the Boltmaster! Bolt Slam slows towers around it and stuns the closest ones, and Bolt Summon calls in more units.' },
  iMothership: { name: 'Mothership', model: 'crystalUfo', h: 4, hp: 6500, speed: 5.4, reward: iR(6500), damage: iD(6500), scale: 2.2, skin: 0x111111, shard: 0xd500f9,
    flying: true, defense: 3, freezeImmune: true, shockImmune: true, healPulse: { every: 5, radius: 16, pct: 0.2, over: 1.2 },
    intro: '🛸 A Mothership! It flies and heals the enemies around it by 20% (even past full health). Shoot it down!' },
  iSentinel: { name: 'Sentinel', hp: 6000, speed: 6.6, reward: iR(6000), damage: iD(25000), scale: 1.6, skin: 0x1c1c1c, shirt: 0x212121, pants: 0x1c1c1c, face: 'visor', ilook: 'sentinel', glowC: 0xaa00ff,
    defense: 5, shield: true, phase2: 'iSentinelBare', intro: '🕴️ Sentinels: huge health, a shield and 5 Defense.' },
  iSentinelBare: { name: 'Sentinel', hp: 19000, speed: 6.6, reward: iR(19000), damage: iD(25000), scale: 1.6, skin: 0x1c1c1c, shirt: 0x212121, pants: 0x1c1c1c, face: 'visor', ilook: 'sentinel', glowC: 0xaa00ff, defense: 5 },
  iOverseer: { name: 'Robotic Overseer', hp: 25000, speed: 6.9, reward: iR(25000), damage: 1e5, scale: 3, skin: 0x4a148c, shirt: 0x6a1b9a, pants: 0x4a148c, face: 'visor', ilook: 'overseer', glowC: 0xd500f9,
    boss: true, defense: 4, freezeImmune: true, shockImmune: true, shield: true, phase2: 'iOverseerBare',
    moves: { first: 6, every: 10, list: [
      { key: 'rocketBombard', w: 1, n: 8, radius: 4, stun: 3, flight: 1.8 },
      { key: 'minigun', w: 1, range: 26, n: 6, stun: 2.5 }] },
    intro: '🤖 BOSS: the Robotic Overseer! Its rockets reach anywhere on the map, and its minigun stuns every tower it hits.' },
  iOverseerBare: { name: 'Robotic Overseer', hp: 100000, speed: 6.9, reward: iR(100000), damage: 1e5, scale: 3, skin: 0x4a148c, shirt: 0x6a1b9a, pants: 0x4a148c, face: 'visor', ilook: 'overseer', glowC: 0xd500f9,
    boss: true, defense: 4, freezeImmune: true, shockImmune: true,
    moves: { first: 3, every: 10, list: [
      { key: 'rocketBombard', w: 1, n: 8, radius: 4, stun: 3, flight: 1.8 },
      { key: 'minigun', w: 1, range: 26, n: 6, stun: 2.5 }] } },
  iVessel: { name: 'Unstable Vessel', hp: 8000, speed: 18, reward: iR(8000), damage: iD(8000), scale: 1.25, skin: 0x76ff03, shirt: 0x33691e, pants: 0x1b5e20, face: 'blank', ilook: 'vessel', glowC: 0x76ff03,
    freezeImmune: true, blast: { radius: 10, stun: 3, color: 0x76ff03 }, deathSpawn: { list: ['iEliteSoldier', 'iRaygunner', 'iEliteDrone', 'iEliteTeleporter'], n: 3 },
    intro: '☢️ Unstable Vessels explode when they die, stunning towers nearby, and Elite units pour out!' },
  iKugelblitz: { name: 'Kugelblitz', hp: 5000, speed: 9, reward: iR(5000), damage: iD(9000), scale: 1.2, skin: 0x050505, shirt: 0x050505, pants: 0x050505, face: 'blank', ilook: 'kugelblitz', glowC: 0xff6d00,
    flying: true, freezeImmune: true, shield: true, phase2: 'iKugelblitzBare', intro: '⚫ Kugelblitz: a flying black hole with a big shield.' },
  iKugelblitzBare: { name: 'Kugelblitz', hp: 4000, speed: 9, reward: iR(4000), damage: iD(9000), scale: 1.2, skin: 0x050505, shirt: 0x050505, pants: 0x050505, face: 'blank', ilook: 'kugelblitz', glowC: 0xff6d00,
    flying: true, freezeImmune: true },
  iVengeful: { name: 'Vengeful', hp: 6000, speed: 22.5, reward: iR(6000), damage: iD(6000), scale: 1.1, skin: 0x111111, shirt: 0x1c1c1c, pants: 0x111111, face: 'indigo', ilook: 'vengeful', glowC: 0x651fff,
    deathHaste: { radius: 12, speed: 1, time: 4 }, intro: '👑 When a Vengeful dies, the enemies around it move 2x faster for a while!' },
  iChampion: { name: 'Vengeful Champion', hp: 40000, speed: 6.6, reward: iR(40000), damage: iD(40000), scale: 1.8, skin: 0x111111, shirt: 0x1a1a2e, pants: 0x111111, face: 'indigo', ilook: 'champion', glowC: 0x651fff,
    defense: 8, moves: { first: 4, every: 9, list: [
      { key: 'swordThrow', w: 1, range: 35, radius: 1.5, stun: 5, flight: 0.8 },
      { key: 'vengefulSlash', w: 1, range: 16, stun: 3 }] },
    intro: '🎩 Vengeful Champions throw their sword to stun a tower, and their Vengeful Slash stuns every tower in front of them.' },
  iRavagerEnergy: { name: 'Ravager Energy', hp: 900, speed: 45, reward: iR(900), damage: iD(900), scale: 1.05, skin: 0x18ffff, shirt: 0x18ffff, pants: 0x18ffff, face: 'blank', ilook: 'ravagerEnergy', glowC: 0x18ffff,
    defense: 3, maxHit: 200, freezeImmune: true, intro: '💠 Ravager Energy: EXTREMELY fast, and no hit does more than 200 damage to it.' },
  iAvantGuard: { name: 'Avant Guard', hp: 55000, speed: 6, reward: iR(55000), damage: 1e5, scale: 2.2, skin: 0x9e9e9e, shirt: 0x757575, pants: 0x616161, face: 'blank', ilook: 'avantGuard', glowC: 0x80d8ff,
    boss: true, defense: 6, maxHit: 300, freezeImmune: true, shield: true, phase2: 'iAvantGuardBare',
    moves: { first: 4, every: 8, list: [{ key: 'axeSlash', range: 15, slow: 0.4, time: 8 }] },
    intro: '🪓 BOSS: the Avant Guard! A giant shield bubble, no hit over 300 damage, and its Axe Slash makes nearby towers fire slower.' },
  iAvantGuardBare: { name: 'Avant Guard', hp: 25000, speed: 6, reward: iR(25000), damage: 1e5, scale: 2.2, skin: 0x9e9e9e, shirt: 0x757575, pants: 0x616161, face: 'blank', ilook: 'avantGuardBare', glowC: 0x80d8ff,
    boss: true, defense: 6, maxHit: 300, freezeImmune: true,
    moves: { first: 3, every: 8, list: [{ key: 'axeSlash', range: 15, slow: 0.4, time: 8 }] } },
  iVanguard: { name: 'The Vanguard', hp: 50000, speed: 5.1, reward: iR(50000), damage: 1e5, scale: 2.6, skin: 0x111111, shirt: 0x1b5e20, pants: 0x111111, face: 'blank', ilook: 'vanguard', glowC: 0x00e676,
    boss: true, defense: 1, freezeImmune: true, shockImmune: true, shield: true, phase2: 'iVanguardBare',
    moves: { first: 5, every: 9, list: [
      { key: 'hammerLine', w: 1, length: 36, width: 5, stun: 3.5 },
      { key: 'hammerSpin', w: 1, range: 15, stun: 3 }] },
    intro: '🔨 BOSS: The Vanguard! Its hammer shockwaves stun lines and rings of towers. At low health it throws its hammer away and runs!' },
  iVanguardBare: { name: 'The Vanguard', hp: 100000, speed: 5.1, reward: iR(100000), damage: 1e5, scale: 2.6, skin: 0x111111, shirt: 0x1b5e20, pants: 0x111111, face: 'blank', ilook: 'vanguard', glowC: 0x00e676,
    boss: true, defense: 1, freezeImmune: true, shockImmune: true, throwAt: { at: 0.25, speed: 2 },
    moves: { first: 3, every: 9, list: [
      { key: 'hammerLine', w: 1, length: 36, width: 5, stun: 3.5 },
      { key: 'hammerSpin', w: 1, range: 15, stun: 3 }] } },
  iSpirit: { name: 'Spirit of Light', hp: 1350, speed: 15, reward: iR(1350), damage: iD(1350), scale: 1, skin: 0xffab40, shirt: 0xffab40, pants: 0xffab40, face: 'blank', ilook: 'spirit', glowC: 0xffab40,
    flying: true, freezeImmune: true, intro: '✨ Spirits of Light fly, and can\'t be frozen.' },
  iDivine: { name: 'Divine Being', hp: 25000, speed: 8.1, reward: iR(25000), damage: iD(25000), scale: 1.7, skin: 0xffe0b2, shirt: 0xfafafa, pants: 0xf5f5f5, face: 'blank', ilook: 'divine', glowC: 0xffab40,
    defense: 4, summon: { type: 'iSpirit', n: [2, 3], every: 9 }, intro: '🕊️ Divine Beings keep summoning Spirits of Light.' },
  iArchangel: { name: 'The Archangel', hp: 10000, speed: 14.4, reward: iR(10000), damage: 1e5, scale: 2, skin: 0xffe0b2, shirt: 0xfafafa, pants: 0xeceff1, face: 'blank', ilook: 'archangel', glowC: 0x18ffff,
    boss: true, flying: true, freezeImmune: true, shockImmune: true, shield: true, phase2: 'iArchangelBare',
    intro: '😇 BOSS: The Archangel! It flies: you NEED flying detection to stop it.' },
  iArchangelBare: { name: 'The Archangel', hp: 30000, speed: 14.4, reward: iR(30000), damage: 1e5, scale: 2, skin: 0xffe0b2, shirt: 0xfafafa, pants: 0xeceff1, face: 'blank', ilook: 'archangel', glowC: 0x18ffff,
    boss: true, flying: true, freezeImmune: true, shockImmune: true },
  iCorruption: { name: 'Corruption', hp: 8000, speed: 12, reward: iR(8000), damage: iD(8000), scale: 1.4, skin: 0x111111, shirt: 0x111111, pants: 0x111111, face: 'blank', ilook: 'corruption', glowC: 0xffffff,
    defense: 7, freezeImmune: true, intro: '👁️ Corruptions: 7 Defense and they can\'t be frozen.' },
  iTranquil: { name: 'Tranquil', hp: 20000, speed: 8.4, reward: iR(20000), damage: iD(20000), scale: 1.9, skin: 0x111111, shirt: 0x111111, pants: 0x111111, face: 'blank', ilook: 'tranquil', glowC: 0xd50000,
    defense: 4, shockImmune: true, intro: '🖤 Tranquils: huge, and electricity can\'t stun them.' },
  iNull: { name: 'Null', hp: 4500, speed: 21, reward: iR(4500), damage: iD(4500), scale: 1.05, skin: 0x0d0d0d, shirt: 0x0d0d0d, pants: 0x0d0d0d, face: 'blank', ilook: 'null', glowC: 0xaa00ff,
    defense: 5, intro: '🟣 Nulls are fast, with 5 Defense.' },
  iCorrupted: { name: 'The Corrupted', hp: 150000, speed: 3.3, reward: iR(150000), damage: 1e5, scale: 3.4, skin: 0x111111, shirt: 0x6a1b9a, pants: 0x1c1c1c, face: 'blank', ilook: 'corrupted', glowC: 0xd500f9,
    boss: true, defense: 20, freezeImmune: true, shockImmune: true, shield: true, phase2: 'iCorruptedBare',
    summon: { type: 'iNull', n: 1, every: 10 },
    moves: { first: 6, every: 11, list: [
      { key: 'eyeLaser', w: 1, radius: 9, stun: 4, flight: 2.5, defense: 15, maxHit: 200 },
      { key: 'callUnits', w: 1, list: ['iNull'], n: 3, name: 'Eyeficated Summon' }] },
    intro: '👁️ BOSS: The Corrupted! 20 Defense. Its eye laser stuns towers around its target (and lowers its Defense for good). It keeps summoning Nulls.' },
  iCorruptedBare: { name: 'The Corrupted', hp: 100000, speed: 3.3, reward: iR(100000), damage: 1e5, scale: 3.4, skin: 0x111111, shirt: 0x6a1b9a, pants: 0x1c1c1c, face: 'blank', ilook: 'corrupted', glowC: 0xd500f9,
    boss: true, defense: 20, maxHit: 600, freezeImmune: true, shockImmune: true, summon: { type: 'iNull', n: 1, every: 10 },
    moves: { first: 4, every: 11, list: [
      { key: 'eyeLaser', w: 1, radius: 9, stun: 4, flight: 2.5, defense: 15, maxHit: 200 },
      { key: 'callUnits', w: 1, list: ['iNull'], n: 3, name: 'Eyeficated Summon' }] } },
  iHardLight: { name: 'Hard Light', hp: 150, speed: 15, reward: iR(150), damage: iD(150), scale: 1, skin: 0xffffff, shirt: 0xffffff, pants: 0xffffff, face: 'blank', ilook: 'hardLight', glowC: 0xffffff,
    defense: 8000, maxHit: 30, intro: '⬜ Hard Light: 8,000 Defense! Only burns, poison and other damage over time (or defense piercing) can hurt it.' },
  iBolt: { name: 'Bolt', hp: 600, speed: 9, reward: iR(600), damage: iD(600), scale: 1.05, skin: 0xaed581, shirt: 0x1565c0, pants: 0x263238, face: 'frown', ilook: 'bolt', glowC: 0x76ff03, shockImmune: true },
  iMage: { name: 'Mage', hp: 350, speed: 6.9, reward: iR(350), damage: iD(350), scale: 1.05, skin: 0x81d4fa, shirt: 0x111111, pants: 0x111111, face: 'frown', ilook: 'mage', glowC: 0x40c4ff,
    freezeImmune: true, moves: { first: 3, every: 7, list: [{ key: 'staffSlam', radius: 12, haste: 0.5, time: 2 }] } },
  iLightningKing: { name: 'Lightning King', hp: 800, speed: 4.8, reward: iR(800), damage: iD(800), scale: 1.2, skin: 0x90caf9, shirt: 0x0d1b4a, pants: 0x0d1b4a, face: 'frown', ilook: 'lightningKing', glowC: 0x40c4ff, freezeImmune: true },
  iLightspeed: { name: 'Lightspeed', hp: 3500, speed: 13.2, reward: iR(3500), damage: iD(3500), scale: 1.15, skin: 0x111111, shirt: 0x111111, pants: 0x111111, face: 'visor', ilook: 'lightspeed', glowC: 0x40c4ff,
    defense: 2, freezeImmune: true, shockImmune: true },
  iRavager: { name: 'Ravager', hp: 15000, speed: 24, reward: iR(15000), damage: iD(35000), scale: 1.7, skin: 0x0288d1, shirt: 0x37474f, pants: 0x263238, face: 'blank', ilook: 'ravager', glowC: 0x40c4ff,
    defense: 1, maxHit: 500, freezeImmune: true, shockImmune: true, shield: true, phase2: 'iRavagerBare',
    moves: { first: 3, every: 8, list: [{ key: 'crystalThrow', range: 35, radius: 2, stun: 4, flight: 0.9 }] } },
  iRavagerBare: { name: 'Ravager', hp: 20000, speed: 24, reward: iR(20000), damage: iD(35000), scale: 1.7, skin: 0x0288d1, shirt: 0x37474f, pants: 0x263238, face: 'blank', ilook: 'ravager', glowC: 0x40c4ff,
    defense: 1, maxHit: 500, freezeImmune: true, shockImmune: true,
    moves: { first: 2, every: 8, list: [{ key: 'crystalThrow', range: 35, radius: 2, stun: 4, flight: 0.9 }] } },
  iReactor: { name: 'Reactor', hp: 400, speed: 7.5, reward: iR(400), damage: iD(1200), scale: 1.3, skin: 0xc62828, shirt: 0x1c1c1c, pants: 0x1c1c1c, face: 'frown', ilook: 'reactor', glowC: 0xff1744,
    defense: 8, fireImmune: true, shield: true, phase2: 'iReactorBare' },
  iReactorBare: { name: 'Reactor', hp: 800, speed: 7.5, reward: iR(800), damage: iD(1200), scale: 1.3, skin: 0xc62828, shirt: 0x1c1c1c, pants: 0x1c1c1c, face: 'frown', ilook: 'reactor', glowC: 0xff1744,
    defense: 8, fireImmune: true },
  iUnstable: { name: 'Unstable', hp: 100, speed: 16.5, reward: iR(100), damage: iD(100), scale: 1, skin: 0xff1744, shirt: 0xff8a80, pants: 0xff8a80, face: 'blank', ilook: 'unstable', glowC: 0xff1744,
    blast: { radius: 5, stun: 2, color: 0xff1744 } },
  iApparition: { name: 'Apparition', hp: 4000, speed: 6, reward: iR(4000), damage: iD(4000), scale: 1.3, skin: 0x212121, shirt: 0x212121, pants: 0x212121, face: 'blank', ilook: 'apparition', glowC: 0x9e9e9e, flying: true },
  iHellspeed: { name: 'Hellspeed', hp: 500, speed: 12, reward: iR(500), damage: iD(4500), scale: 1.2, skin: 0x1c1c1c, shirt: 0x111111, pants: 0x111111, face: 'flameEye', ilook: 'hellspeed', glowC: 0xff6d00,
    defense: 3, freezeImmune: true, fireImmune: true, shield: true, phase2: 'iHellspeedBare' },
  iHellspeedBare: { name: 'Hellspeed', hp: 4000, speed: 12, reward: iR(4000), damage: iD(4500), scale: 1.2, skin: 0x1c1c1c, shirt: 0x111111, pants: 0x111111, face: 'flameEye', ilook: 'hellspeed', glowC: 0xff6d00,
    defense: 3, freezeImmune: true, fireImmune: true },
  iHellflame: { name: 'Hellflame Reactor', hp: 1000, speed: 4.2, reward: iR(1000), damage: iD(5000), scale: 1.4, skin: 0xff6d00, shirt: 0x1c1c1c, pants: 0x1c1c1c, face: 'blank', ilook: 'hellflame', glowC: 0xff6d00,
    defense: 1, freezeImmune: true, fireImmune: true, shield: true, phase2: 'iHellflameBare' },
  iHellflameBare: { name: 'Hellflame Reactor', hp: 4000, speed: 4.2, reward: iR(4000), damage: iD(5000), scale: 1.4, skin: 0xff6d00, shirt: 0x1c1c1c, pants: 0x1c1c1c, face: 'blank', ilook: 'hellflame', glowC: 0xff6d00,
    defense: 1, freezeImmune: true, fireImmune: true },
  iPrompter: { name: 'Prompter', hp: 6500, speed: 6.6, reward: iR(6500), damage: iD(6500), scale: 1.35, skin: 0xff6d00, shirt: 0x1c1c1c, pants: 0x1c1c1c, face: 'sad', ilook: 'prompter', glowC: 0xff3d00,
    freezeImmune: true, fireImmune: true },
  iVengefulSpeed: { name: 'Vengeful Speed', hp: 1000, speed: 18, reward: iR(1000), damage: iD(6000), scale: 1.1, skin: 0x616161, shirt: 0x311b92, pants: 0x1a1a2e, face: 'indigo', ilook: 'vengefulSpeed', glowC: 0x7c4dff,
    defense: 1, freezeImmune: true, shield: true, phase2: 'iVengefulSpeedBare' },
  iVengefulSpeedBare: { name: 'Vengeful Speed', hp: 5000, speed: 18, reward: iR(5000), damage: iD(6000), scale: 1.1, skin: 0x616161, shirt: 0x311b92, pants: 0x1a1a2e, face: 'indigo', ilook: 'vengefulSpeed', glowC: 0x7c4dff,
    defense: 1, freezeImmune: true },
  iOverlord: { name: 'Overlord', h: 5.2, hp: 500000, speed: 3.9, reward: 0, damage: 1e6, scale: 4, skin: 0xfafafa, shirt: 0xfafafa, pants: 0x111111, face: 'overlord', ilook: 'overlord', glowC: 0xff1744,
    boss: true, defense: 2, freezeImmune: true, shockImmune: true, ampCap: 0.6,
    taunt: { time: 7, maxHit: 30 },
    backup: { at: 0.6, type: 'iAmplifier', n: 2 },
    despair: { speed: 2.5, defense: 10, maxHit: 780, summon: 'iChampion', n: 2 },
    moves: { first: 10, every: 8, list: [
      { key: 'thunderstorm', w: 2, n: 6, radius: 3, stun: 3 },
      { key: 'concLightning', w: 2, range: 22, stun: 3.5 },
      { key: 'callUnits', w: 1, list: ['iTranquil', 'iCorruption'], n: 2, name: 'Summoning' },
      { key: 'telekinesis', w: 2, n: 2, radius: 6, stun: 3, dmg: 0, flight: 1.6 }] },
    intro: '👑 FINAL BOSS: the OVERLORD, leader of the XCF\'s Orion Arm! His Taunt lets almost nothing through at first. At 60% health he calls in Amplifiers that heal him: destroy them!' },
  // Overlord Amplifier: a huge machine that never moves and keeps healing the Overlord (`amp.heal` of his max health per second).
  iAmplifier: { name: 'Overlord Amplifier', model: 'amplifier', h: 5, hp: 25000, speed: 0, reward: iR(25000), damage: 0, scale: 2.4, skin: 0xd50000, shard: 0xff1744,
    defense: 10, freezeImmune: true, shockImmune: true, amp: { speed: 0, heal: 0.008 } },

  // ---------------------------------------------------------------- Void mode enemies (2026-11-09 spec)
  // Void mode plays the 40 Tower Battles Survival waves (keys v*, stats from the user's doc: health
  // as listed, speed = studs/s x3, word speeds guessed), then 10 more. Wave 40 ends with the False
  // Void (the Tower Battles Void), wave 45 brings it back in void armor, and wave 50 is the real VOID
  // (the TDX Tower Battles mode Void, with its own Abyss Spawns). Rewards vR(hp) and base damage
  // vD(hp) use the same guessed curves as Insane.
  // blook: which outfit tbParts (models.js) gives it. noVoidArmor: never rolls void armor.
  // Void armor (DIFFICULTIES.void.voidArmor): any wave enemy may spawn wearing it (each wave's `va`
  //   is the chance; a group's `voidArmor` mod forces it). See Sim.armorUp.
  // vb: Void boss moves, run by Sim.voidBoss. Each has `first` (s after spawning) and `every` (none:
  //   used once). Keys:
  //   slash { range, time }: Guardian axe. A ground tower in range bleeds: it can't attack, use
  //     abilities or be upgraded for `time` s. Air and cliff towers are safe.
  //   shockwave { radius, stun, unitDmg } / stomp { radius, stun, unitDmg }: False Void. Stuns ground
  //     towers (not air or cliff ones) and hurts units in the radius.
  //   summon { n: [min, max], list }: pulls Spawns out of its body (no cash).
  //   abyss { stun }: VOID From the Abyss. Stuns every tower, even stun-immune ones, and kills every unit.
  //   corruption { share }: VOID turns `share` of the attacking towers to its side for good (they stop
  //     working, but sell for `GAME.corruptSell` more) and destroys that share of the units.
  //   devastation { radius, stun, dmg }: stomp, only when a tower is in range; ignores stun immunity.
  //   army { list }: Unforeseen Army. [type, n] pairs appear all along the path (no cash).
  //   meteors { rocks: [[dmg, radius, n]], stun, flight }: Abyssal Strikedown. Purple rocks fall on
  //     random towers; each stuns (even stun-immune towers) and hurts the towers it lands on.
  //   telekinesis { min, n, slow, time }: only with `min`+ Warships out. Destroys `n` of them, and
  //     every tower works `slow` slower for `time` s.
  // arrive: { title, sub, toast } a banner when it first appears.
  vNormal: { name: 'Normal', hp: 4, speed: 9.6, reward: vR(4), damage: vD(4), scale: 1, skin: 0x7cb342, shirt: 0x6d4c41, pants: 0x5d4037,
    intro: '🟣 Void mode: the 40 Tower Battles waves, and 10 more. Watch out for VOID ARMOR: a purple shield, extra armor, and tendrils that lash your towers!' },
  vSpeedy: { name: 'Speedy', hp: 3, speed: 15, reward: vR(3), damage: vD(3), scale: 0.95, skin: 0x4fc3f7, shirt: 0x6d4c41, pants: 0x5d4037 },
  vSlow: { name: 'Slow', hp: 16, speed: 4.5, reward: vR(16), damage: vD(16), scale: 1.1, skin: 0x33691e, shirt: 0x4e342e, pants: 0x3e2723 },
  vBoss1: { name: 'Boss1', hp: 180, speed: 4.2, reward: vR(180), damage: vD(180), scale: 1.5, skin: 0xaed581, shirt: 0x37474f, pants: 0x263238, blook: 'boss1',
    boss: true, iceResist: 0.2, intro: '🧟 Boss1! A big zombie in diamond-plate clothes.' },
  vHidden: { name: 'Hidden', hp: 10, speed: 9.6, reward: vR(10), damage: vD(10), scale: 1, skin: 0x1a237e, shirt: 0x111111, pants: 0x111111, blook: 'hidden', hidden: true,
    intro: '👻 Hidden zombies! Only towers with hidden detection can see them.' },
  vMystery: { name: 'Mystery', hp: 10, speed: 9.6, reward: vR(10), damage: vD(10), scale: 1, skin: 0x4fc3f7, shirt: 0x29b6f6, pants: 0x0288d1, blook: 'mystery',
    cage: ['vNormal', 'vNormal', 'vSpeedy', 'vSpeedy', 'vSlow', 'vSlow', 'vBoss1', 'vHidden', 'vHidden'], cageHp: 1, // Boss1 half as likely
    intro: '❓ Mysteries turn into a Normal, Speedy, Slow, Boss1 or Hidden when they die!' },
  vNecro: { name: 'Necromancer', hp: 200, speed: 4.5, reward: vR(200), damage: vD(200), scale: 1.3, skin: 0x9e9e9e, shirt: 0x111111, pants: 0x111111, blook: 'necro',
    boss: true, summon: { type: 'vSummon', n: [2, 3], every: 6, noCash: true },
    intro: '💀 The Necromancer! Every few seconds it slams its staff and raises Summons.' },
  vSummon: { name: 'Summon', hp: 7, speed: 9.6, reward: 0, damage: vD(7), scale: 0.95, skin: 0xc0ca33, shirt: 0x6d4c41, pants: 0x5d4037, blook: 'summon' },
  vBoss2: { name: 'Boss2', hp: 1600, speed: 3.2, reward: vR(1600), damage: vD(1600), scale: 1.9, skin: 0x33691e, shirt: 0x8d6e63, pants: 0x6d4c41, blook: 'boss2',
    boss: true, iceResist: 0.13, intro: '🧟 Boss2! Slow, limping, and very tough.' },
  vLava: { name: 'Lava', hp: 120, speed: 7.8, reward: vR(120), damage: vD(120), scale: 1.1, skin: 0xff6d00, shirt: 0x212121, pants: 0x212121, lava: 0xff6d00,
    fireImmune: true, freezeImmune: true, corpse: 'vPetrified',
    intro: '🌋 Lava zombies can\'t be frozen or burned, and they turn into Petrified statues when they die. Statues block shots aimed at zombies behind them.' },
  vPetrified: { name: 'Petrified', hp: 60, speed: 0, reward: vR(60), damage: 0, scale: 1.1, skin: 0x1c1c1c, shirt: 0x1c1c1c, pants: 0x1c1c1c, blook: 'statue',
    remains: true, decay: 20, noVoidArmor: true, danceImmune: true, blockShots: 1.6 }, // blockShots: radius that stops shots aimed past it
  vHiddenBoss: { name: 'Hidden Boss', hp: 800, speed: 9, reward: vR(800), damage: vD(800), scale: 1.6, skin: 0x1a237e, shirt: 0x111111, pants: 0x111111, blook: 'hiddenBoss',
    boss: true, hidden: true, intro: '👻 The Hidden Boss! Tough, fast and hidden.' },
  vToxic: { name: 'Toxic', hp: 140, speed: 12, reward: vR(140), damage: vD(140), scale: 1.15, skin: 0x76ff03, shirt: 0x8d6e63, pants: 0x6d4c41, blook: 'toxic',
    blast: { radius: 6, stun: 5, units: 100, color: 0x76ff03 },
    intro: '🧪 Toxic zombies burst into gas when they die: nearby towers get sick (stunned) and units take damage!' },
  vLightning: { name: 'Lightning', hp: 120, speed: 24, reward: vR(120), damage: vD(120), scale: 1, skin: 0xffee58, shirt: 0x81d4fa, pants: 0x4fc3f7, blook: 'lightning',
    shockImmune: true, intro: '⚡ Lightning zombies are extremely fast, and electricity can\'t stun them!' },
  vSlime: { name: 'Slime', model: 'slime', h: 2.2, hp: 560, speed: 9.6, reward: vR(560), damage: vD(560), scale: 2.4, skin: 0x76ff03, color: 0x64dd17,
    deathSpawn: { list: ['vGoo'], n: [3, 4] }, intro: '🟢 Slimes split into 3-4 Goos when they die!' },
  vGoo: { name: 'Goo', model: 'slime', h: 2.2, hp: 120, speed: 15, reward: vR(120), damage: vD(120), scale: 1.3, skin: 0x43a047, color: 0x2e7d32, noVoidArmor: true },
  vMystery2: { name: 'Mystery2', hp: 100, speed: 9.6, reward: vR(100), damage: vD(100), scale: 1.05, skin: 0xff1744, shirt: 0xd50000, pants: 0xb71c1c, blook: 'mystery2',
    cage: ['vBoss2', 'vLava', 'vSlime', 'vHiddenBoss', 'vLightning'], cageHp: 1,
    intro: '❓ Mystery2! These turn into a Boss2, Lava, Slime, Hidden Boss or Lightning when they die.' },
  vBoss3: { name: 'Boss3', hp: 3000, speed: 15.3, reward: vR(3000), damage: vD(3000), scale: 1.5, skin: 0xfff59d, shirt: 0xffc107, pants: 0xffa000, blook: 'boss3',
    boss: true, intro: '🎩 Boss3! Very tough and very fast, in a gold tuxedo.' },
  vBoss4: { name: 'Boss4', hp: 7400, speed: 9, reward: vR(7400), damage: vD(7400), scale: 2.6, skin: 0x880e4f, shirt: 0x3e2723, pants: 0x3e2723, blook: 'boss4',
    boss: true, freezeImmune: true, danceImmune: true, intro: '🦾 Boss4! A maroon giant with pipes and a huge chained arm. It can\'t be frozen or made to dance.' },
  vNecroBoss: { name: 'Necromancer Boss', hp: 15000, speed: 7.8, reward: vR(15000), damage: vD(15000), scale: 2, skin: 0xd7ccc8, shirt: 0x1a237e, pants: 0x111111,
    blook: 'necroBoss', boss: true, summon: { type: 'vFireSpirit', n: [2, 3], every: 8, noCash: true },
    intro: '🎩 The Necromancer Boss! Every 8 seconds it summons Fire Spirits.' },
  vFireSpirit: { name: 'Fire Spirit', hp: 700, speed: 15, reward: 0, damage: vD(700), scale: 1.1, skin: 0x212121, shirt: 0x212121, pants: 0x212121, blook: 'fireSpirit',
    fireImmune: true },
  vGuardian: { name: 'Guardian', hp: 60000, speed: 2.4, reward: vR(60000), damage: 1e5, scale: 3, skin: 0x424242, shirt: 0x4a148c, pants: 0x311b92, blook: 'guardian',
    boss: true, void: true, freezeImmune: true, shockImmune: true, noVoidArmor: true, vb: { slash: { first: 6, every: 12, range: 16, time: 20 } },
    intro: '🪓 A Guardian of the Void! Its axe makes a tower bleed for 20 seconds: no attacks, abilities or upgrades. Air and cliff towers are safe.' },
  // The False Void: the Tower Battles Void. Its health bar and the dark sky are the voidWorld ones.
  vFalseVoid: { name: 'False Void', hp: 500000, speed: 2.4, reward: vR(500000), damage: 1e5, scale: 5.5, skin: 0x150a1c, shirt: 0x1c0a22, pants: 0x100614,
    face: 'voidKing', vlook: 'king', vvein: 0x9c27b0, vglow: 0xd500f9, void: true, boss: true, statusImmune: true, noVoidArmor: true, voidWorld: 1, barName: 'THE FALSE VOID', barSub: 'The Tower Battles Void',
    vb: {
      shockwave: { first: 3, radius: 70, stun: 7, unitDmg: 4000 },
      stomp: { first: 12, every: 16, radius: 16, stun: 7, unitDmg: 4000 },
      summon: { first: 9, every: 20, n: [3, 4], list: ['vSpawn1', 'vSpawn2', 'vSpawn3', 'vSpawn4'] },
    },
    arrive: { title: 'THE FALSE VOID', sub: '"I guess... I\'ll just have to kill you MYSELF!"',
      toast: '🟣 The False Void! Its scream and stomps stun ground towers for 7s and crush units. Air and cliff towers are safe.' } },
  vSpawn1: { name: 'Spawn1', hp: 1200, speed: 9.6, reward: 0, damage: vD(1200), scale: 1.1, skin: 0x7e6a8f, shirt: 0x6a1b9a, pants: 0x4a148c, blook: 'spawn', void: true, noVoidArmor: true },
  vSpawn2: { name: 'Spawn2', hp: 900, speed: 9.6, reward: 0, damage: vD(900), scale: 1.1, skin: 0x8d6e63, shirt: 0x4a148c, pants: 0x311b92, blook: 'spawn', void: true, noVoidArmor: true },
  vSpawn3: { name: 'Spawn3', hp: 1400, speed: 4.5, reward: 0, damage: vD(1400), scale: 1.2, skin: 0x6d4c41, shirt: 0x4a148c, pants: 0x311b92, blook: 'spawn', void: true, noVoidArmor: true },
  vSpawn4: { name: 'Spawn4', hp: 1800, speed: 9.6, reward: 0, damage: vD(1800), scale: 1.3, skin: 0x795548, shirt: 0x7b1fa2, pants: 0x4a148c, blook: 'spawn', void: true, noVoidArmor: true },
  // VOID: the real final boss (TDX Tower Battles mode). No damage resistances; stuns and slows do nothing.
  vVoid: { name: 'VOID', hp: 900000, speed: 3, reward: 0, damage: 1e5, scale: 6, skin: 0x0d0612, shirt: 0x120818, pants: 0x0d0612,
    face: 'voidKing', vlook: 'king', vvein: 0x7b1fa2, vglow: 0xd500f9, blook: 'trueVoid', void: true, boss: true, statusImmune: true, burnable: true,
    noVoidArmor: true, voidWorld: 2, finale: true, barName: 'VOID', barSub: 'From the Abyss',
    vb: {
      abyss: { first: 4, stun: 6 },
      devastation: { first: 15, every: 25, radius: 15, stun: 6, dmg: 150 },
      army: { first: 15, every: 120, list: [['vMystery2', 10], ['vHiddenBoss', 10], ['vAbyss1', 3], ['vAbyss2', 2], ['vAbyss3', 1], ['vAbyss4', 1]] },
      corruption: { first: 30, every: 100, share: 0.1 },
      meteors: { first: 30, every: 82, stun: 1, flight: 1.6, rocks: [[75, 1.25, 3], [125, 1.25, 12], [150, 1.5, 2], [155, 2.5, 1], [175, 3, 1], [250, 3, 1]] },
      telekinesis: { first: 6, every: 25, min: 2, n: 2, slow: 0.4, time: 5 },
    },
    arrive: { title: 'VOID', sub: 'From the Abyss… the real one has come.',
      toast: '🟣 The real VOID! He stuns every tower and wipes out your units, corrupts towers to his side, and calls down meteors and armies. Sell corrupted towers!' } },
  // Abyss Spawns: VOID's own spawns (only from Unforeseen Army). Lasers and golden towers barely hurt them.
  vAbyss1: { name: 'Abyss Spawn 1', hp: 4444, speed: 8.4, reward: 0, damage: vD(4444), scale: 1.2, skin: 0x3e2723, shirt: 0x6a1b9a, pants: 0x4a148c, blook: 'abyss',
    void: true, laserResist: 0.95, goldResist: 0.95, noVoidArmor: true },
  vAbyss2: { name: 'Abyss Spawn 2', hp: 6666, speed: 6.6, reward: 0, damage: vD(6666), scale: 1.6, skin: 0x3e2723, shirt: 0x6a1b9a, pants: 0x4a148c, blook: 'abyss',
    void: true, laserResist: 0.95, goldResist: 0.95, noVoidArmor: true },
  vAbyss3: { name: 'Abyss Spawn 3', hp: 3333, speed: 27, reward: 0, damage: vD(3333), scale: 1.1, skin: 0x3e2723, shirt: 0x6a1b9a, pants: 0x4a148c, blook: 'abyss',
    void: true, laserResist: 0.95, goldResist: 0.95, noVoidArmor: true },
  vAbyss4: { name: 'Abyss Spawn 4', hp: 9999, speed: 9.9, reward: 0, damage: vD(9999), scale: 1.7, skin: 0x7b1fa2, shirt: 0x6a1b9a, pants: 0x6a1b9a, blook: 'abyssBig',
    void: true, laserResist: 0.95, goldResist: 0.95, noVoidArmor: true },
};

// Medium mode stealth versions (e.g. 'fastZombiePlusS' = Stealth Fast Zombie+): hidden, otherwise the same.
for (const k of ['fastZombiePlus', 'heavyZombiePlus', 'revivedBoss1', 'nuclearZombie', 'multiplier2']) {
  ENEMIES[`${k}S`] = { ...ENEMIES[k], name: `Stealth ${ENEMIES[k].name}`, hidden: true, intro: undefined };
}
// Hardcore mode's enemies (see hardcore.js): its own copies of earlier modes' enemies, plus new ones.
addHardcoreEnemies(ENEMIES);
addHalloweenEnemies(ENEMIES); // the Halloween Event's own enemies (see halloween.js)
addHalloween2Enemies(ENEMIES); // and Halloween Night 2's (see halloween2.js)
addHalloween3Enemies(ENEMIES); // and Halloween Night 3's (see halloween3.js)
addLastLaughEnemies(ENEMIES); // the Last Laugh contract's Jester (see lastlaugh.js)
