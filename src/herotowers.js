// Wave 9: the "hero" towers. 30 alternate forms of existing towers (bought with Dimension Shards),
// three new base towers (Balloon Pal, Buzzer, Nuki Launcher, bought with credits) and one event
// tower (Hayes).
//
// Numbers: in-game costs, damage, firerates and spawn timers are the spec's. Every distance (range,
// splash radius, aura, jump, unit gun range) and unit speed is doubled, because the spec's game is
// about half TD Infinity's scale (its Wizard tops out at range 16, the Scout reaches 22 here).
// Where the spec gave no number (attack speed of support towers, effect lengths...), the guess is
// noted next to the tower.
//
// Cycle times: the spec lists "rate" (time between shots of a burst) and "cooldown" (wait after a
// burst). TD Infinity's `cooldown` is the whole cycle, so cooldown = burst * burstGap + wait.
//
// New mechanics (see sim.js):
//   charge:   { max, time }  Mako: charges up while it has nothing to hit; the next hit does up to
//             `max` damage instead of `damage` (full after `time` s).
//   area:     radius        Hotdog Frank / Mako: melee hits also land on every zombie within `area`
//             of the target (same damage), with no explosion.
//   nearDmg:  max           Wafer: damage ramps from `damage` (edge of its range) to `nearDmg` (point blank).
//   taint:    { kind, damage, tick, time }  Dumpster Child: a damage-over-time effect. Effects of
//             different kinds stack on a zombie; the same kind doesn't (it refreshes). It aims at
//             zombies that don't have its effect yet.
//   shock:    { slow, time, maxHp, paralyze }  Byte: no damage; slows (or with `paralyze` stops)
//             zombies with at most `maxHp` max health (null = any). Skips zombies already shocked.
//   flask:    Maitake: { heal, unstun, linger } on a poison tower: each throw heals the summons
//             (units) in range by `heal` HP, `unstun` frees stunned towers in range, `linger`
//             leaves a poison cloud that lasts that many seconds.
//   burstMax: Fracture: each burst is `burst`..`burstMax` shots; the cycle is `burstPause` +
//             shots * burstGap.
//   lemon:    { pay, cap }  Lemonade Cat: earns `pay` cash per second for every zombie inside its
//             range (hidden ones too), counting at most `cap` zombies at once.
//   costUp:   (support aura) towers in its range pay this much more for upgrades (Specter).
//   dmgLoss / rateLoss (support aura): towers in range deal less damage / attack slower (Discount
//             Dog / Balloon Pal). splashBoost: bigger splash for towers in range (Balloon Pal).
//   kin.min:  Bunny group boost only counts once this many other Bunnies are in range.
//   nuki:     Nuki Launcher: where each lobbed shell lands, a Nuki unit stays on the path to fight.
//   drawings: Stella: paints a drawing (a still unit) near the path every `drawEvery` s while a
//             zombie is in range, cycling through the unlocked ones, at most `maxDrawings` out.
//   chaos:    Chaos Jester: something random happens every `every` s (see CHAOS below).
//   voltPoints: Volt can also zap zombies near any Volt Point on the map (placed with its ability).
//   free units (`crow` / `bee`): fly anywhere off the path, chase zombies and peck/sting them
//             `hits` times before they die.
//   costMax (on a level): the upgrade costs a random amount between `cost` and `costMax`.
//   Abilities: `costs` (price per use, in order; once used up the ability is gone), `costStep`
//             (each use costs that much more), `maxUses`.

// ---------------------------------------------------------------- units

const oddport = (n, hp, dmgMin, dmg, range, revive = 0) => ({
  name: ['Student', 'Students + PK', 'Students + Reese', 'Students + Sticky', 'Full Class'][n - 1],
  model: `oddport${n}`, soldiers: n, hp: Math.round((hp / n) * 100) / 100, speed: 7, revive,
  gun: { damage: dmg, dmgMin, cooldown: 1, range },
});

const SLIME = (hp, speed, burn, fire) => ({ name: fire ? 'Fire Slime' : 'Slime', model: fire ? 'kslimeFire' : 'kslime', hp, speed, ram: true, flying: false, ...(burn ? { burn } : {}) });
const SLIME_KING = { name: 'Slime King', model: 'slimeKingUnit', hp: 7000, speed: 5, ram: true, flying: false, burn: { dps: 40, time: 4 } };
const SUMMON_KING_AB = { key: 'militia', name: 'Summon King', desc: 'Sends the Slime King himself (7,000 HP) down the path to crash into zombies and set them ablaze', cost: 20000, cooldown: 90, unit: SLIME_KING };

const KART = (hp, speed, star) => ({ name: 'Kart', model: star || hp >= 350 ? 'kart2' : 'kart', hp, speed, ram: true, flying: false, ...(star ? { star } : {}) });

// Crows (Hayes): fly anywhere on the map, peck `hits` times, then die.
const CROW = (damage, cooldown, hidden) => ({ name: 'Crow', model: 'hcrow', hp: 1, crow: true, free: true, air: true, flying: true, hidden, hits: 12, speed: 16, gun: { damage, cooldown, range: 2.5 } });
// Bees (Buzzer): chase zombies inside the tower's range and sting `hits` times, then die (exploding from Lv 3).
const BEE = (damage, hidden, explode) => ({ name: 'Bee', model: 'bbee', hp: 1, bee: true, free: true, air: true, flying: true, hidden, hits: 6, speed: 20, gun: { damage, cooldown: 0.6, range: 2 },
  ...(explode ? { explode: { damage: explode, radius: 5 } } : {}) });

const NUKI = (hp, damage, burst, hidden, elite) => ({ name: elite ? 'Elite Nuki' : 'Nuki', model: elite ? 'nukiElite' : 'nuki', hp, speed: 0, still: true, flying: false, hidden,
  gun: { damage, ...(burst > 1 ? { burst, burstGap: 0.12 } : {}), cooldown: burst > 1 ? 1.6 : 1, range: 9 } });

// Stella's drawings: still units that see hidden zombies.
const DRAW = {
  wuffle: { name: 'Wuffle', model: 'sWuffle', hp: 150, speed: 0, still: true, flying: true, hidden: true, gun: { damage: 10, cooldown: 0.8, range: 6 } },
  jem: { name: 'Jem', model: 'sJem', hp: 80, speed: 0, still: true, flying: true, hidden: true, gun: { damage: 6, burst: 6, burstGap: 0.1, cooldown: 2, range: 14 } },
  snow: { name: 'Snow Minion', model: 'sSnow', hp: 200, speed: 0, still: true, flying: true, hidden: true,
    gun: { damage: 5, cooldown: 1, range: 10, chill: { chill: 0.2, maxSlow: 0.4, chillTime: 3, chillDps: 8 } } },
  doug: { name: 'Doug', model: 'sDoug', hp: 450, speed: 0, still: true, flying: false, hidden: true, gun: { damage: 70, cooldown: 2, range: 10, splash: 4 } },
  crab: { name: 'Crab Bot', model: 'sCrab', hp: 250, speed: 0, still: true, flying: true, hidden: true, lead: true, gun: { damage: 40, cooldown: 1.2, range: 28 } },
};
const REPAINT_AB = { key: 'repaint', name: 'Repaint', desc: 'Paints over every one of its drawings, healing them to full', cost: 250, cooldown: 15 };

const CHAOS_UNITS = {
  toy: { name: 'Wind-up Toy', model: 'chaosToy', soldiers: 1, hp: 80, speed: 8, gun: { damage: 8, cooldown: 0.6, range: 12 } },
  ball: { name: 'Chaos Ball', model: 'chaosBall', hp: 400, speed: 12, ram: true, flying: false },
  clown: { name: 'Big Clown', model: 'chaosClown', soldiers: 1, hp: 1200, speed: 6, hidden: true, gun: { damage: 35, burst: 3, burstGap: 0.15, cooldown: 1.5, range: 16 } },
};

const BOMB_FLOAT = { name: 'Bomb Float', model: 'bombFloat', hp: 5000, speed: 8, ram: true, flying: false, explode: { damage: 2500, radius: 10 } };
const VOLT_POINT = { name: 'Volt Point', model: 'voltPoint', hp: 1, speed: 0, still: true, air: true, free: true, point: true, radius: 10 };

// ---------------------------------------------------------------- abilities

const MAGIC_BOOST_AB = { key: 'magicBoost', name: 'Magic Boost', desc: '+10 damage for good (up to 4 times)', costs: [2000, 3000, 4000, 5000], add: 10, cooldown: 1 };
const DRAGON_FLAME_AB = { key: 'dragonFlame', name: 'Dragon Flame', desc: 'For 20s: 30% more damage, 6-slash bursts, faster, 14% more range, slashes set zombies on fire, and it can\'t be stunned. Costs $250 more each use',
  cost: 250, costStep: 250, cooldown: 20, duration: 20, self: true, dmg: 1.3, range: 1.14, burst: 6, burstGap: 0.26, cycle: 2.24, burn: 25, burnTime: 3, immune: true };
const SPORE_AB = { key: 'spore', name: 'Spore Field', desc: 'Every zombie in its range slows to 60% speed for 10s', cost: 15000, cooldown: 70, slow: 0.4, time: 10 };
const CRUCIFIX_AB = { key: 'crucifix', name: 'Crucifix', desc: 'Freezes the strongest zombie in range for 10s (bosses 5s)', cooldown: 75, time: 10, boss: 0.5 };
const VOLT_POINT_AB = { key: 'voltPoint', name: 'Volt Point', desc: 'Place a Volt Point inside its range. Every Volt can zap zombies near any Volt Point (radius 10). Up to 5, $4,000 more each',
  cost: 3000, costStep: 4000, maxUses: 5, cooldown: 1, aim: true, radius: 10, unit: VOLT_POINT };
const FIRE_RATE_AB = { key: 'cta', name: 'Fire Rate Boost', desc: 'Towers in its range attack 25% faster for 15s', cost: 10000, cooldown: 30, duration: 15, boost: 0.25 };
const EXTRA_SLOT_AB = { key: 'extraSlot', name: 'Extra Slot', desc: 'You can place one more of every tower for the rest of the game (up to 3 times)', cost: 6000, costStep: 3000, maxUses: 3, cooldown: 1 };
const SPAWN_HELPER_AB = { key: 'militia', name: 'Spawn Helper', desc: 'Sends a 5,000 HP Bomb Float down the path that explodes for 2,500 splash when it pops', cost: 20000, cooldown: 60, unit: BOMB_FLOAT };
const DARK_SUMMONER_AB = { key: 'darkSummon', name: 'Dark Summoner', desc: 'For the rest of the game, all of your summons explode when they die, for half their max health', cost: 40000, costs: [40000], cooldown: 1 };
const SOUL_SURGE_AB = { key: 'soulSurge', name: 'Soul Surge', desc: 'Each use lets it hit one more zombie at once (up to 5 uses, $5,000 more each)', cost: 11500, costStep: 5000, maxUses: 5, cooldown: 1 };

// ---------------------------------------------------------------- Chaos Jester
// Every `every` s it rolls one outcome (weights): a friendly unit, an enemy from this wave, a
// random effect on every zombie in range, cash, stolen cash, or (Lv 5) the jackpot.
const CHAOS = [
  { every: 16, w: { unit: 55, enemy: 45 }, units: [CHAOS_UNITS.toy] },
  { every: 15, w: { unit: 40, enemy: 25, effect: 35 }, units: [CHAOS_UNITS.toy, CHAOS_UNITS.ball], effects: ['burn', 'poison', 'heal'] },
  { every: 14, w: { unit: 30, enemy: 20, effect: 25, cash: 15, steal: 10 }, units: [CHAOS_UNITS.toy, CHAOS_UNITS.ball, CHAOS_UNITS.clown], effects: ['burn', 'poison', 'heal', 'slow'], cash: [400, 1500], steal: [200, 800] },
  { every: 13, w: { unit: 28, enemy: 17, effect: 25, cash: 18, steal: 12 }, units: [CHAOS_UNITS.toy, CHAOS_UNITS.ball, CHAOS_UNITS.clown], effects: ['burn', 'poison', 'heal', 'slow', 'freeze', 'paralyze'], cash: [750, 4000], steal: [300, 1200] },
  { every: 12, w: { unit: 25, enemy: 15, effect: 25, cash: 20, steal: 8, jackpot: 7 }, units: [CHAOS_UNITS.toy, CHAOS_UNITS.ball, CHAOS_UNITS.clown, CHAOS_UNITS.clown], effects: ['burn', 'poison', 'heal', 'slow', 'freeze', 'paralyze'],
    cash: [4000, 10000], steal: [500, 1500], jackpot: [10000, 20000], super: true },
];

// ---------------------------------------------------------------- towers

export const HERO_TOWERS = {
  // Wizard (Scout): long range, one zombie at a time. Lv 5 Magic Boost adds +10 damage for good, up to 4 times.
  scoutWizard: {
    name: 'Wizard',
    altOf: 'scout',
    form: 'Wizard',
    shards: 1,
    price: 0,
    cost: 100,
    limit: 13,
    blurb: 'A little wizard who shoots magic at one zombie at a time. Cheap upgrades, huge range and the highest placement limit of any tower. At Lv 5 its Magic Boost adds +10 damage for good, up to 4 times.',
    tip: 'Spread Magic Boosts over several Wizards: each one on the same Wizard costs more. Weak against big crowds.',
    levels: [
      { name: 'Wizard', desc: 'Shoots magic at one zombie at a time.', damage: 3, cooldown: 1.9, range: 10, hidden: false },
      { name: 'Apprentice', desc: 'More damage and range, and it sees hidden zombies.', cost: 430, damage: 7, cooldown: 1.8, range: 16, hidden: true },
      { name: 'Spellcaster', desc: 'Double damage, more range and faster shots.', cost: 1500, damage: 15, cooldown: 1.5, range: 22, hidden: true },
      { name: 'Sorcerer', desc: 'More damage and range, and faster again.', cost: 2400, damage: 24, cooldown: 1.3, range: 28, hidden: true },
      { name: 'Archmage', desc: 'More damage, range and speed, and unlocks Magic Boost: +10 damage for good per use (4 uses: $2,000 / $3,000 / $4,000 / $5,000).', cost: 4500, damage: 28, cooldown: 1.1, range: 32, hidden: true,
        abilities: [MAGIC_BOOST_AB] },
    ],
  },

  // Chef (Enforcer): huge single melee hits, the highest base DPS here.
  enforcerChef: {
    name: 'Chef',
    altOf: 'enforcer',
    form: 'Chef',
    shards: 2,
    price: 0,
    cost: 110,
    limit: 12,
    flying: false,
    melee: true,
    blurb: 'A burly chef who hits one zombie at a time with kitchen tools. Every hit is huge, and its weapon gets bigger every level, from a spork to a meat tenderizer. Very high damage for the money and a high limit, but only one zombie per swing and short reach.',
    tip: 'Line several Chefs along a curve for early and mid waves, and keep them for bosses. A Specter near them doubles their hits.',
    levels: [
      { name: 'Chef', desc: 'Swings a spork at one zombie up close.', damage: 4, cooldown: 1.8, range: 6, hidden: false },
      { name: 'Frying Pan', desc: 'A heavy pan: 7x damage, a bit more reach, and it sees hidden zombies.', cost: 1000, damage: 28, cooldown: 2.35, range: 7, hidden: true },
      { name: 'Cleaver', desc: 'Much more damage, faster swings and more reach.', cost: 2200, damage: 75, cooldown: 2, range: 8, hidden: true },
      { name: 'Rolling Pin', desc: 'Much more damage and faster again.', cost: 3700, damage: 130, cooldown: 1.8, range: 9, hidden: true },
      { name: 'Meat Tenderizer', desc: 'Massive hits, faster swings and more reach.', cost: 6000, damage: 230, cooldown: 1.5, range: 10, hidden: true },
    ],
  },

  // Lemonade Cat (Farm): sells lemonade to zombies walking past. Cash per second for every zombie
  // inside its range (up to `cap` at once), instead of cash per wave. Tuned so a cat on a busy
  // stretch of path earns about what the spec's per-wave income would (50 / 250 / 550 / 900 / 1,400).
  farmLemonade: {
    name: 'Lemonade Cat',
    altOf: 'farm',
    form: 'Lemonade Cat',
    shards: 2,
    price: 0,
    cost: 200,
    limit: 4,
    kind: 'income',
    blurb: 'A cat that sells lemonade to the zombies walking past. Instead of paying after each wave, it earns cash every second for every zombie inside its range (hidden ones too), so the busier its stretch of path, the more it makes. Never attacks.',
    tip: 'Put it where the path loops or doubles back so lots of zombies are in range at once, and near slowing towers so they stay longer. It earns nothing between waves.',
    levels: [
      { name: 'Lemonade Cat', desc: 'Earns $0.75/s for every zombie in range (up to 4 at once).', range: 9, lemon: { pay: 0.75, cap: 4 }, hidden: false },
      { name: 'Lemonade Stand', desc: 'Earns $2.5/s per zombie in range (up to 5) and reaches farther.', cost: 900, range: 11, lemon: { pay: 2.5, cap: 5 }, hidden: false },
      { name: 'Little Kiosk', desc: 'Earns $4.5/s per zombie in range, up to 5 at once.', cost: 1700, range: 12, lemon: { pay: 4.5, cap: 5 }, hidden: false },
      { name: 'Lemon Shop', desc: 'Earns $6.5/s per zombie in range, up to 6 at once.', cost: 2800, range: 13, lemon: { pay: 6.5, cap: 6 }, hidden: false },
      { name: 'Lemon Tower', desc: 'Earns $8/s per zombie in range, up to 6 at once, and reaches farthest.', cost: 4200, range: 15, lemon: { pay: 8, cap: 6 }, hidden: false },
    ],
  },

  // Yasuke (Knifer): bursts of fast slashes. Lv 5 Dragon Flame (a paid timed ability).
  kniferYasuke: {
    name: 'Yasuke',
    altOf: 'knifer',
    form: 'Yasuke',
    shards: 3,
    price: 0,
    cost: 260,
    limit: 12,
    flying: false,
    melee: true,
    blurb: 'A half-dragon swordsman. From Lv 2 it slashes in quick bursts for very high damage up close. At Lv 5, Dragon Flame powers it up for 20s: more damage, reach and speed, flaming slashes and stun immunity. The shortest reach of any tower.',
    tip: 'Put it right on a sharp curve, and pair it with something that holds zombies in place (Byte, El Goblino). Fast zombies slip past its tiny reach.',
    levels: [
      { name: 'Yasuke', desc: 'Swings a practice sword at one zombie up close.', damage: 3, cooldown: 1.6, range: 8, hidden: false },
      { name: 'Katana', desc: 'Slashes in bursts of 4, more damage, and it sees hidden zombies.', cost: 1100, damage: 7, burst: 4, burstGap: 0.25, cooldown: 2.4, range: 8, hidden: true },
      { name: 'Twin Blades', desc: 'Double damage, shorter wait between bursts, a bit more reach.', cost: 1800, damage: 15, burst: 4, burstGap: 0.3, cooldown: 2.3, range: 8.4, hidden: true },
      { name: 'Dragon Scales', desc: 'Double damage and an even shorter wait.', cost: 3500, damage: 29, burst: 4, burstGap: 0.3, cooldown: 2.1, range: 9, hidden: true },
      { name: 'Dragon Blood', desc: 'Double damage, 5-slash bursts, and unlocks Dragon Flame ($250, +$250 each use).', cost: 6700, damage: 58, burst: 5, burstGap: 0.3, cooldown: 2.3, range: 9.4, hidden: true,
        abilities: [DRAGON_FLAME_AB] },
    ],
  },

  // Maitake (Toxicnator): poison flasks. Guessed: one flask every 2s (2.5s at Lv 5, which the spec
  // says attacks slower), poison ticks every 0.2s, Lv 3 splash radius 4, Lv 5 lingering cloud 3s.
  toxicnatorMaitake: {
    name: 'Maitake',
    altOf: 'toxicnator',
    form: 'Maitake',
    shards: 2,
    price: 0,
    cost: 350,
    limit: 4,
    lob: 0.6,
    stunImmune: true,
    kindLabel: 'Poison',
    blurb: 'A mushroom witch who throws poison flasks that hurt zombies over time. Sees hidden zombies from the start and can\'t be stunned. From Lv 2 every flask also heals your summons in range; from Lv 4 it poisons every zombie in range at once and frees stunned towers near it.',
    tip: 'Great spread out along the path early on. Keep one at Lv 4 if you want its un-stunning: Lv 5 throws a little slower.',
    levels: [
      { name: 'Maitake', desc: 'Throws a flask that poisons one zombie (10/s for 8s).', damage: 0, cooldown: 2, range: 7, hidden: true, poison: { damage: 2, tick: 0.2, time: 8, slow: 0 } },
      { name: 'Potion Belt', desc: 'Stronger, longer poison, and each flask heals summons in range by 10 HP.', cost: 1500, damage: 0, cooldown: 2, range: 9, hidden: true,
        poison: { damage: 5, tick: 0.2, time: 11, slow: 0 }, flask: { heal: 10 } },
      { name: 'Cauldron', desc: 'The poison splashes onto nearby zombies, more range, heals summons 15 HP.', cost: 2200, damage: 0, cooldown: 2, range: 11, radius: 4, hidden: true,
        poison: { damage: 6, tick: 0.2, time: 13, slow: 0 }, flask: { heal: 15 } },
      { name: 'Floating Flasks', desc: 'Poisons every zombie in range at once, frees stunned towers in range, heals summons 20 HP.', cost: 5600, damage: 0, cooldown: 2, range: 11.8, targets: 99, hidden: true,
        poison: { damage: 7, tick: 0.2, time: 15, slow: 0 }, flask: { heal: 20, unstun: true } },
      { name: 'Fungal Queen', desc: 'Stronger poison, and each throw leaves a poison cloud that catches zombies walking in for 3s. Throws a little slower.', cost: 6800, damage: 0, cooldown: 2.5, range: 11.8, targets: 99, hidden: true,
        poison: { damage: 9, tick: 0.2, time: 17, slow: 0 }, flask: { heal: 25, unstun: true, linger: 3 } },
    ],
  },

  // Branch (Spark): splash from Lv 2, fast bursts from Lv 3. Guessed: splash radius 2.5 / 3 / 3.5 / 4.
  sparkBranch: {
    name: 'Branch',
    altOf: 'spark',
    form: 'Branch',
    shards: 2,
    price: 0,
    cost: 150,
    limit: 6,
    blurb: 'A leafy plant monster that spits seeds. From Lv 2 its seeds splash, and from Lv 3 it fires them in fast bursts, so it chews through crowds. Weak until Lv 3, and its last two upgrades are pricey.',
    tip: 'If you bring it early, save up and rush it to Lv 3.',
    levels: [
      { name: 'Branch', desc: 'Spits a seed at one zombie.', damage: 3, cooldown: 2.2, range: 8, hidden: false },
      { name: 'Seed Pods', desc: 'More damage and range, its seeds splash a little, and it sees hidden zombies.', cost: 800, damage: 8, cooldown: 2, range: 14, radius: 2.5, hidden: true },
      { name: 'Vine Arms', desc: 'Fires bursts of 7 seeds, more range and a bigger splash.', cost: 2900, damage: 11, burst: 7, burstGap: 0.3, cooldown: 4.1, range: 18, radius: 3, hidden: true },
      { name: 'In Bloom', desc: 'Bursts of 10 stronger seeds and more range.', cost: 4200, damage: 17, burst: 10, burstGap: 0.3, cooldown: 4.9, range: 22, radius: 3.5, hidden: true },
      { name: 'Overgrowth', desc: 'Bursts of 17 even stronger, faster seeds and more range.', cost: 6200, damage: 21, burst: 17, burstGap: 0.2, cooldown: 5.2, range: 25, radius: 4, hidden: true },
    ],
  },

  // Scientist (Railgunner): long-range zaps; bursts from Lv 4.
  railgunnerScientist: {
    name: 'Scientist',
    altOf: 'railgunner',
    form: 'Scientist',
    shards: 2,
    price: 0,
    cost: 250,
    limit: 5,
    lead: true,
    blurb: 'A scientist who zaps zombies with an electric rod from very far away. At Lv 4 she switches to quick bursts of zaps that move on to the next zombie if the first one dies. Weak early and against big crowds.',
    tip: 'Lv 2 is cheap and great for hidden zombies. Use her on big maps with long stretches of path.',
    levels: [
      { name: 'Scientist', desc: 'Zaps one zombie from far away.', damage: 6, cooldown: 3.5, range: 20, hidden: false },
      { name: 'Goggles', desc: 'More damage, a bit faster, more range, and it sees hidden zombies.', cost: 1200, damage: 15, cooldown: 3, range: 24, hidden: true },
      { name: 'Generator Pack', desc: 'More than double damage, a little faster, more range.', cost: 2500, damage: 35, cooldown: 2.5, range: 26, hidden: true },
      { name: 'Tesla Pack', desc: 'Fires bursts of 10 quick zaps, with much more range.', cost: 4500, damage: 12, burst: 10, burstGap: 0.2, cooldown: 4.5, range: 32, hidden: true },
      { name: 'Lightning Staff', desc: 'Bursts of 27 very fast zaps and a bit more range.', cost: 8000, damage: 13, burst: 27, burstGap: 0.1, cooldown: 5.3, range: 33, hidden: true },
    ],
  },

  // Voca (Mortar): Lv 2 sparkler burns (5 per 0.2s = 25/s for 4s), Lv 3+ fireworks lobbed from far
  // away with splash (the spec's splash numbers are splash damage, half the hit). Guessed blast
  // radius 5 / 6 / 7.
  mortarVoca: {
    name: 'Voca',
    altOf: 'mortar',
    form: 'Voca',
    shards: 2,
    price: 0,
    cost: 120,
    limit: 5,
    flying: false,
    lob: 1.1,
    blurb: 'An idol who attacks with sparklers and then fireworks. Lv 2 sets zombies on fire; from Lv 3 her fireworks explode from very far away with a big splash. Very slow, and short-ranged for her first two levels.',
    tip: 'Lv 2 is a good early answer to a tough single zombie; Lv 3-5 shine against crowds on long maps.',
    levels: [
      { name: 'Voca', desc: 'Throws a little sparkle at one zombie.', damage: 3, cooldown: 2.2, range: 6, hidden: false },
      { name: 'Sparkler', desc: 'A sparkler that sets zombies on fire (25/s for 4s), and it sees hidden zombies.', cost: 1000, damage: 0, cooldown: 4, range: 7, hidden: true, fire: { dps: 25, time: 4 } },
      { name: 'Fireworks', desc: 'Fireworks: 45 damage, 22 splash to zombies around it, from very far away.', cost: 3200, damage: 45, splash: 22.5, cooldown: 3.8, range: 32, radius: 5, hidden: true },
      { name: 'Encore', desc: 'More damage, a bit faster, more range and a bigger splash.', cost: 5200, damage: 70, splash: 35, cooldown: 3.2, range: 34, radius: 6, hidden: true },
      { name: 'Grand Finale', desc: 'Huge fireworks: more damage, a much bigger splash and enormous range.', cost: 6700, damage: 110, splash: 55, cooldown: 3, range: 50, radius: 7, hidden: true },
    ],
  },

  // Quinn (Sniper): big slow arrows from very far. Lv 5 Spore Field.
  sniperQuinn: {
    name: 'Quinn',
    altOf: 'sniper',
    form: 'Quinn',
    shards: 2,
    price: 0,
    cost: 150,
    limit: 6,
    lead: 2,
    blurb: 'A plant archer who shoots big, slow arrows from extremely far away. At Lv 5 her Spore Field slows every zombie in her range to 60% speed. Cheap to place, but her upgrades are expensive and she struggles with fast zombies.',
    tip: 'Spam a few cheap ones early. A Balloon Pal gives her almost map-wide range.',
    levels: [
      { name: 'Quinn', desc: 'Shoots a big arrow at one zombie.', damage: 7, cooldown: 3.3, range: 14, hidden: false },
      { name: 'Hunter', desc: 'More than double damage, more range, and it sees hidden zombies.', cost: 1350, damage: 16, cooldown: 3.2, range: 20, hidden: true },
      { name: 'Flower Hood', desc: 'More than double damage, much more range, and her arrows punch through lead.', cost: 3600, damage: 40, cooldown: 3, range: 30, hidden: true },
      { name: 'Monster Eyes', desc: 'Double damage and a bit faster.', cost: 5600, damage: 80, cooldown: 2.8, range: 32, hidden: true },
      { name: 'Spore Archer', desc: 'More damage, huge range, and unlocks Spore Field ($15,000): every zombie in range slows to 60% for 10s.', cost: 7000, damage: 120, cooldown: 2.8, range: 46, hidden: true,
        abilities: [SPORE_AB] },
    ],
  },

  // Mako (Brawler): slow, huge splash hits; charges up from Lv 3 while it has nothing to hit.
  // Splash radius doubled from the spec (1.5 / 2 / 2.5 / 3 / 4).
  brawlerMako: {
    name: 'Mako',
    altOf: 'slugger',
    form: 'Mako',
    shards: 2,
    price: 0,
    cost: 130,
    limit: 8,
    flying: false,
    lead: true,
    melee: true,
    blurb: 'A baby shark in a bucket who grows into a knight. Hits slowly but very hard, splashing every zombie around its target. From Lv 3 it charges up while it has nothing to hit, so its first hit on a new group does much more damage.',
    tip: 'It only charges while it isn\'t attacking, so put it behind your other towers as a backstop for leaks, not at the front.',
    levels: [
      { name: 'Mako', desc: 'Chomps one zombie and splashes the ones around it.', damage: 6, cooldown: 2.5, range: 6.4, area: 3, hidden: false },
      { name: 'Pot Helmet', desc: 'More damage, a bigger splash, and it sees hidden zombies.', cost: 1000, damage: 20, cooldown: 4, range: 7, area: 4, hidden: true },
      { name: 'Shark Knight', desc: 'Charges up while idle: 40 damage normally, up to 100 when fully charged (15s).', cost: 2500, damage: 40, cooldown: 3.8, range: 8, area: 5, hidden: true, charge: { max: 100, time: 15 } },
      { name: 'Armored Knight', desc: '150-350 damage, faster swings, a bigger splash and more reach.', cost: 3500, damage: 150, cooldown: 3.4, range: 9, area: 6, hidden: true, charge: { max: 350, time: 14 } },
      { name: 'Great Shark', desc: '250-500 damage, faster swings and charging, a huge splash and more reach.', cost: 6000, damage: 250, cooldown: 3, range: 11, area: 8, hidden: true, charge: { max: 500, time: 12 } },
    ],
  },

  // Volt (Tesla): fast chain zaps. Guessed jump distance 4 (Lv 1-3, zombies must be bunched up) / 7.
  // Lv 5 Volt Points: zap zombies near any Volt Point too.
  teslaVolt: {
    name: 'Volt',
    altOf: 'paralyzer',
    form: 'Volt',
    shards: 3,
    price: 0,
    cost: 170,
    limit: 6,
    lead: true,
    voltUser: true, // can zap zombies near Volt Points
    blurb: 'A living lamp that zaps zombies with lightning that chains from one to the next, very fast. At Lv 5 it can place Volt Points that let every Volt zap zombies near them, wherever they are. Cheap early levels, but the chain only jumps between zombies that are close together until Lv 4.',
    tip: 'Volt Points must go inside a Volt\'s range, but then every Volt on the map can use them. Put them on a far stretch of path to cover it.',
    levels: [
      { name: 'Volt', desc: 'A zap that chains to up to 3 zombies close together.', damage: 2, chains: 3, jump: 4, cooldown: 0.9, range: 6, hidden: false },
      { name: 'Bright Bulb', desc: 'Much more damage, chains to 6, and it sees hidden zombies.', cost: 1200, damage: 9, chains: 6, jump: 4, cooldown: 0.7, range: 7, hidden: true },
      { name: 'Coil Lamp', desc: 'More damage, faster zaps, more range, chains to 9.', cost: 2800, damage: 13, chains: 9, jump: 4, cooldown: 0.55, range: 9, hidden: true },
      { name: 'Arc Crown', desc: 'More damage, even faster, chains to 12 and jumps much farther.', cost: 5000, damage: 19, chains: 12, jump: 7, cooldown: 0.43, range: 10, hidden: true },
      { name: 'Storm Lamp', desc: 'Chains to 15, more damage, and unlocks Volt Points ($3,000, +$4,000 each, up to 5).', cost: 6800, damage: 22, chains: 15, jump: 7, cooldown: 0.34, range: 11, hidden: true, voltPoints: true,
        abilities: [VOLT_POINT_AB] },
    ],
  },

  // Specter (Commander): a guitar-playing ghost that boosts damage. From Lv 3 towers in range pay
  // a bit more for upgrades. Lv 5 Fire Rate Boost (guessed: 15s, 30s cooldown).
  commanderSpecter: {
    name: 'Specter',
    altOf: 'commander',
    form: 'Specter',
    shards: 3,
    price: 0,
    cost: 500,
    limit: 1,
    kind: 'support',
    blurb: 'A ghost who plays guitar to boost the damage of every tower in his range, up to double at Lv 5. Never attacks. From Lv 3 towers in his range pay a little more for their upgrades. Lv 5 unlocks Fire Rate Boost.',
    tip: 'Surround him with your hardest hitters (Chef, Wizard, Yasuke). Do their upgrades before his Lv 3, or put up with the small markup.',
    levels: [
      { name: 'Specter', desc: '+10% damage to towers in range.', aura: 10, dmgBoost: 0.1, hidden: false },
      { name: 'Amp', desc: '+25% damage and more range.', cost: 1700, aura: 12, dmgBoost: 0.25, hidden: false },
      { name: 'Amp Stack', desc: '+40% damage and more range, but towers in range pay 3% more for upgrades.', cost: 3300, aura: 14, dmgBoost: 0.4, costUp: 0.03, hidden: false },
      { name: 'Flame Guitar', desc: '+70% damage and much more range; upgrades in range cost 8% more.', cost: 4000, aura: 20, dmgBoost: 0.7, costUp: 0.08, hidden: false },
      { name: 'Headliner', desc: 'Double damage, more range; upgrades in range cost 10% more. Unlocks Fire Rate Boost ($10,000): towers in range attack 25% faster for 15s.', cost: 7900, aura: 24, dmgBoost: 1, costUp: 0.1, hidden: false,
        abilities: [FIRE_RATE_AB] },
    ],
  },

  // Discount Dog (DJ): cheaper upgrades for towers in range; from Lv 3 they lose a little damage.
  djDiscount: {
    name: 'Discount Dog',
    altOf: 'dj',
    form: 'Discount Dog',
    shards: 2,
    price: 0,
    cost: 400,
    limit: 3,
    kind: 'support',
    blurb: 'A dog running a sale: towers in his range pay less for their upgrades, up to 40% off. From Lv 3 the towers he discounts deal a tiny bit less damage. At Lv 5 his Extra Slot ability lets you place one more of every tower.',
    tip: 'Bunch your expensive towers (and Lemonade Cats) around him while you upgrade them, then sell him near the end.',
    levels: [
      { name: 'Discount Dog', desc: '3% off upgrades for towers in range.', aura: 7, discount: 0.03, hidden: false },
      { name: 'Sale Sign', desc: '5% off and more range.', cost: 1200, aura: 9, discount: 0.05, hidden: false },
      { name: 'Big Sale', desc: '15% off and more range, but towers in range deal 1% less damage.', cost: 2500, aura: 12, discount: 0.15, dmgLoss: 0.01, hidden: false },
      { name: 'Megaphone', desc: '25% off and more range; 1.5% less damage.', cost: 3500, aura: 15, discount: 0.25, dmgLoss: 0.015, hidden: false },
      { name: 'Clearance Event', desc: '40% off and more range; 2% less damage. Unlocks Extra Slot ($6,000, +$3,000 each): place one more of every tower.', cost: 5500, aura: 18, discount: 0.4, dmgLoss: 0.02, hidden: false,
        abilities: [EXTRA_SLOT_AB] },
    ],
  },

  // Dumpster Child (Flamethrower): damage over time only. Burn (Lv 1-3), Radioactive (Lv 4),
  // Biohazard (Lv 5) are different effects, so mixing levels stacks them.
  flamethrowerDumpster: {
    name: 'Dumpster Child',
    altOf: 'flamethrower',
    form: 'Dumpster Child',
    shards: 2,
    price: 0,
    cost: 600,
    limit: 8,
    lead: true,
    kindLabel: 'Effects',
    blurb: 'A kid living in a trash can who never hits directly: it throws damage-over-time effects on zombies that don\'t have them yet. Burn at Lv 1-3, Radioactive at Lv 4, Biohazard at Lv 5. Its effects ignore armor. Several of the same level don\'t stack, but different effects do.',
    tip: 'Mix levels: a Lv 3, a Lv 4 and a Lv 5 put all three effects on the same zombie.',
    levels: [
      { name: 'Dumpster Child', desc: 'Burns a zombie (5/s for 2s).', damage: 0, cooldown: 3, range: 8, hidden: false, taint: { kind: 'burn', damage: 1, tick: 0.2, time: 2 } },
      { name: 'Hot Lid', desc: 'A stronger, longer burn (10/s for 3s), faster, more range, and it sees hidden zombies.', cost: 1100, damage: 0, cooldown: 2.5, range: 9, hidden: true, taint: { kind: 'burn', damage: 2, tick: 0.2, time: 3 } },
      { name: 'Trash Fire', desc: 'A much stronger burn: 30/s for 7s.', cost: 2500, damage: 0, cooldown: 2.2, range: 9.4, hidden: true, taint: { kind: 'burn', damage: 6, tick: 0.2, time: 7 } },
      { name: 'Radioactive', desc: 'Switches to Radioactive: 55/s for 16s.', cost: 3800, damage: 0, cooldown: 2, range: 10, hidden: true, taint: { kind: 'radioactive', damage: 11, tick: 0.2, time: 16 } },
      { name: 'Biohazard', desc: 'Switches to Biohazard: 75/s for 20s.', cost: 6000, damage: 0, cooldown: 1.9, range: 10, hidden: true, taint: { kind: 'biohazard', damage: 15, tick: 0.2, time: 20 } },
    ],
  },

  // Stella (Engineer): paints living drawings near the path. Guessed drawing stats (see DRAW).
  engineerStella: {
    name: 'Stella',
    altOf: 'sentryEngineer',
    form: 'Stella',
    shards: 3,
    price: 0,
    cost: 600,
    limit: 3,
    kind: 'spawner',
    kindLabel: 'Painter',
    blurb: 'An axolotl painter who paints living drawings on the path, each with its own job, while a zombie is in her range. Every drawing sees hidden zombies. Upgrades unlock new drawings: Jem (bursts), Snow Minion (slows), Doug (splash) and Crab Bot (long range). Her Repaint ability heals all of them.',
    tip: 'Place her right next to the path so lots of drawings fit. She only paints while zombies are near, so she starts slowly.',
    levels: [
      { name: 'Stella', desc: 'Paints a Wuffle every 16s (a melee doodle pup), up to 2 drawings.', range: 8, drawEvery: 16, maxDrawings: 2, drawings: [DRAW.wuffle], hidden: true, abilities: [REPAINT_AB] },
      { name: 'Palette', desc: 'Unlocks Jem, which shoots quick bursts. Up to 3 drawings.', cost: 2000, range: 9, drawEvery: 16, maxDrawings: 3, drawings: [DRAW.wuffle, DRAW.jem], hidden: true, abilities: [REPAINT_AB] },
      { name: 'Easel', desc: 'Unlocks Snow Minion, which slows zombies and hurts them over time. Up to 4 drawings, paints faster.', cost: 3200, range: 10, drawEvery: 15, maxDrawings: 4,
        drawings: [DRAW.wuffle, DRAW.jem, DRAW.snow], hidden: true, abilities: [REPAINT_AB] },
      { name: 'Paint Buckets', desc: 'Unlocks Doug, the strongest drawing, with splash. Up to 5 drawings.', cost: 4400, range: 11, drawEvery: 15, maxDrawings: 5,
        drawings: [DRAW.wuffle, DRAW.jem, DRAW.snow, DRAW.doug], hidden: true, abilities: [REPAINT_AB] },
      { name: 'Masterpiece', desc: 'Unlocks Crab Bot, the longest-range drawing. Up to 6 drawings, paints faster.', cost: 6800, range: 12, drawEvery: 14, maxDrawings: 6,
        drawings: [DRAW.wuffle, DRAW.jem, DRAW.snow, DRAW.doug, DRAW.crab], hidden: true, abilities: [REPAINT_AB] },
    ],
  },

  // Byte (Electroshocker): no damage, slows (Shock, half speed) or stops (Paralyze) zombies.
  // Guessed: one zap every 1.5s; Paralyze stops bosses half as long.
  electroByte: {
    name: 'Byte',
    altOf: 'electro',
    form: 'Byte',
    shards: 2,
    price: 0,
    cost: 500,
    limit: 6,
    lead: true,
    bossStop: 0.5,
    kindLabel: 'Slow',
    blurb: 'A little computer robot that zaps zombies with its cable. It does no damage: it Shocks them to half speed, and at Lv 5 Paralyzes them so they stop completely for 5s. Lv 1-3 only work on zombies under a health limit. Short range.',
    tip: 'Not for the early game. Put a Lv 4 just before a Lv 5 on the path so their effects chain, next to melee towers like Yasuke or Hotdog Frank.',
    levels: [
      { name: 'Byte', desc: 'Shocks zombies with at most 200 max health to half speed for 2s.', damage: 0, cooldown: 1.5, range: 5.2, hidden: false, shock: { slow: 0.5, time: 2, maxHp: 200 } },
      { name: 'Antenna', desc: 'Shocks zombies up to 1,000 health for 3s, more range, and it sees hidden zombies.', cost: 2500, damage: 0, cooldown: 1.5, range: 6.4, hidden: true, shock: { slow: 0.5, time: 3, maxHp: 1000 } },
      { name: 'Long Cable', desc: 'Shocks zombies up to 2,500 health for 4s, much more range.', cost: 3400, damage: 0, cooldown: 1.5, range: 9.2, hidden: true, shock: { slow: 0.5, time: 4, maxHp: 2500 } },
      { name: 'Twin Cables', desc: 'Shocks any zombie, bosses too, for 5s.', cost: 4700, damage: 0, cooldown: 1.5, range: 9.4, hidden: true, shock: { slow: 0.5, time: 5, maxHp: null } },
      { name: 'Paralyze', desc: 'Paralyzes any zombie: it stops completely for 5s (bosses 2.5s).', cost: 7000, damage: 0, cooldown: 1.5, range: 10, hidden: true, shock: { slow: 1, time: 5, maxHp: null, paralyze: true } },
    ],
  },

  // Wafer (Warlock): ornaments from far away, and more damage the closer the zombie is. Zombies
  // within `meleeRange` get the full candy-cane hit (`nearDmg`); past it damage fades to `damage`
  // at the edge of its range.
  warlockWafer: {
    name: 'Wafer',
    altOf: 'warlock',
    form: 'Wafer',
    shards: 1,
    price: 0,
    cost: 120,
    limit: 7,
    flying: false,
    kindLabel: 'Hybrid',
    blurb: 'A gingerbread fighter who throws ornaments at far zombies and bonks close ones with a candy cane. The closer the zombie, the harder it hits. Very good range and fast attacks from Lv 2, but its damage is below average.',
    tip: 'Place it right next to the path (but not by the entrance), so zombies walk past close to it.',
    levels: [
      { name: 'Wafer', desc: '1-3 damage (more the closer the zombie is).', damage: 1, nearDmg: 3, meleeRange: 3, cooldown: 1.2, range: 7.6, hidden: false },
      { name: 'Candy Cane', desc: '10-20 damage, more range, and it sees hidden zombies.', cost: 1300, damage: 10, nearDmg: 20, meleeRange: 4, cooldown: 1.3, range: 14, hidden: true },
      { name: 'Ornament Belt', desc: '22-32 damage, a bit faster, more range.', cost: 2700, damage: 22, nearDmg: 32, meleeRange: 4.5, cooldown: 1.2, range: 22, hidden: true },
      { name: 'Gumdrop Armor', desc: '35-45 damage, faster, more range.', cost: 4000, damage: 35, nearDmg: 45, meleeRange: 5, cooldown: 1.1, range: 30, hidden: true },
      { name: 'Peppermint Knight', desc: '42-62 damage, faster, and huge range.', cost: 6000, damage: 42, nearDmg: 62, meleeRange: 5.5, cooldown: 1, range: 36, hidden: true },
    ],
  },

  // Lure (Ghostbuster): long bursts of quick shots; sees hidden and can't be stunned. Lv 5 Soul Surge.
  ghostbusterLure: {
    name: 'Lure',
    altOf: 'ghostbuster',
    form: 'Lure',
    shards: 2,
    price: 0,
    cost: 160,
    limit: 8,
    stunImmune: true,
    blurb: 'A ghost cat floating out of a clay pot that fires long bursts of quick shots. It sees hidden zombies from the start and can\'t be stunned. At Lv 5, each Soul Surge lets it hit one more zombie with every shot.',
    tip: 'Its range is below average: pair it with a Balloon Pal or Byte.',
    levels: [
      { name: 'Lure', desc: 'Bursts of 9 quick shots.', damage: 1, burst: 9, burstGap: 0.25, cooldown: 5.25, range: 10, hidden: true },
      { name: 'Haunted Pot', desc: 'Four times the damage, 12-shot bursts, more range.', cost: 950, damage: 4, burst: 12, burstGap: 0.23, cooldown: 5.56, range: 14, hidden: true },
      { name: 'Rune Pot', desc: 'More than double damage, 17-shot bursts, shorter wait, more range.', cost: 2500, damage: 9, burst: 17, burstGap: 0.2, cooldown: 5.6, range: 20, hidden: true },
      { name: 'Wisps', desc: 'More damage, 25-shot bursts, more range.', cost: 4250, damage: 13, burst: 25, burstGap: 0.18, cooldown: 6.6, range: 22, hidden: true },
      { name: 'Soul Lantern', desc: 'More damage, faster 26-shot bursts, more range, and Soul Surge ($11,500, +$5,000 each): hit one more zombie per shot.', cost: 6000, damage: 15, burst: 26, burstGap: 0.15, cooldown: 5.9, range: 24, hidden: true,
        abilities: [SOUL_SURGE_AB] },
    ],
  },

  // Sparks Kilowatt (Soldier): plasma bursts, plus a rocket at the end of every burst from Lv 3.
  // Guessed: 2s between bursts, rocket blast radius 3.
  soldierSparks: {
    name: 'Sparks Kilowatt',
    altOf: 'soldier',
    form: 'Sparks',
    shards: 1,
    price: 0,
    cost: 150,
    limit: 8,
    blurb: 'A girl in a robotic suit who fires fast bursts of plasma beams with great range, and from Lv 3 a rocket at the end of every burst. Cheap and strong early, but armored zombies shrug off her small hits.',
    tip: 'Great on big open maps. Bring something with heavy hits for armored waves.',
    levels: [
      { name: 'Sparks Kilowatt', desc: 'Bursts of 9 plasma shots.', damage: 1, burst: 9, burstGap: 0.25, cooldown: 4.25, range: 12, laser: true, hidden: false },
      { name: 'Bigger Blaster', desc: 'Triple damage, 10-shot bursts, more range, and it sees hidden zombies.', cost: 800, damage: 3, burst: 10, burstGap: 0.22, cooldown: 4.2, range: 16, laser: true, hidden: true },
      { name: 'Rocket Pod', desc: 'Double damage, 11-shot bursts, and an 18-damage rocket at the end of each burst.', cost: 2500, damage: 6, burst: 11, burstGap: 0.2, cooldown: 4.2, range: 20, laser: true, hidden: true,
        boom: { damage: 18, radius: 3 } },
      { name: 'Jet Pack', desc: 'More damage, 14-shot bursts, a 30-damage rocket and more range.', cost: 4000, damage: 8, burst: 14, burstGap: 0.18, cooldown: 4.52, range: 26, laser: true, hidden: true,
        boom: { damage: 30, radius: 3 } },
      { name: 'Mech Suit', desc: 'More damage, 16-shot bursts, a 40-damage rocket and even more range.', cost: 5500, damage: 11, burst: 16, burstGap: 0.18, cooldown: 4.88, range: 30, laser: true, hidden: true,
        boom: { damage: 40, radius: 3.5 } },
    ],
  },

  // Soda Pop (Grenadier): splash with hidden detection from Lv 1, the smallest footprint.
  grenadierSoda: {
    name: 'Soda Pop',
    altOf: 'grenadier',
    form: 'Soda Pop',
    shards: 1,
    price: 0,
    cost: 140,
    limit: 7,
    lob: 0.5,
    blurb: 'A worried little mouse who throws fizzing soda that splashes every zombie around its target. Sees hidden zombies from the start. Great early and on cramped maps, but short-ranged until Lv 4 and its last upgrades are pricey.',
    tip: 'Several Lv 2 Soda Pops early on beat one big one.',
    levels: [
      { name: 'Soda Pop', desc: 'Throws soda that splashes zombies around its target.', damage: 4, cooldown: 2, range: 6, radius: 5, hidden: true },
      { name: 'Six-Pack', desc: 'Triple damage, faster throws, more range and a bigger splash.', cost: 950, damage: 12, cooldown: 1.4, range: 10, radius: 6, hidden: true },
      { name: 'Soda Launcher', desc: 'More than double damage, a bigger splash and more range.', cost: 2600, damage: 30, cooldown: 1.2, range: 14, radius: 7, hidden: true },
      { name: 'Fizz Tank', desc: 'More damage, a much bigger splash, faster and more range.', cost: 4600, damage: 43, cooldown: 1.1, range: 18, radius: 10, hidden: true },
      { name: 'Soda Cannon', desc: 'More damage, a huge splash and lots more range.', cost: 5500, damage: 52, cooldown: 1, range: 24, radius: 12, hidden: true },
    ],
  },

  // Hotdog Frank (Assassin): melee; from Lv 2 its hits land on every zombie around the target.
  // Guessed area radius 3 / 3.5 / 4 / 4.5.
  assassinFrank: {
    name: 'Hotdog Frank',
    altOf: 'assassin',
    form: 'Hotdog Frank',
    shards: 1,
    price: 0,
    cost: 135,
    limit: 11,
    flying: false,
    melee: true,
    blurb: 'A hotdog who fights with kicks, a tied-up string of sausages and a corndog. From Lv 2 every hit lands on all the zombies around its target, so it handles crowds well. Cheap with a high limit, but very short range at first and slow swings.',
    tip: 'Put it on curves so zombies stay in range longer. A Byte nearby keeps them there.',
    levels: [
      { name: 'Hotdog Frank', desc: 'Kicks one zombie up close.', damage: 7, cooldown: 2.8, range: 4, hidden: false },
      { name: 'Corndog Club', desc: 'Its hits land on every zombie around its target, double damage, and it sees hidden zombies.', cost: 900, damage: 15, cooldown: 2.6, range: 5, area: 3, hidden: true },
      { name: 'Condiments', desc: 'Double damage and much more reach.', cost: 1800, damage: 30, cooldown: 2.35, range: 9, area: 3.5, hidden: true },
      { name: 'Big Corndog', desc: 'Double damage, faster swings, more reach.', cost: 3000, damage: 60, cooldown: 2, range: 10.6, area: 4, hidden: true },
      { name: 'Masked Frank', desc: 'More damage and even more reach.', cost: 5200, damage: 80, cooldown: 1.9, range: 13, area: 4.5, hidden: true },
    ],
  },

  // Keith (Boomerang): boomerangs that pierce any number of zombies on the way out and back.
  boomerangKeith: {
    name: 'Keith',
    altOf: 'boomerang',
    form: 'Keith',
    shards: 1,
    price: 0,
    cost: 280,
    limit: 8,
    lead: 3,
    blurb: 'A cowboy kid who throws boomerangs that hit every zombie in their path, on the way out and again on the way back. Cheap upgrades and a high limit, but below-average range and a long wait between throws.',
    tip: 'Very cost-efficient early: place him beside long straight stretches of path.',
    levels: [
      { name: 'Keith', desc: 'A boomerang that hits every zombie it passes, both ways.', damage: 2, cooldown: 3.2, range: 9, pierce: 999, speed: 22, hidden: false },
      { name: 'Metal Edge', desc: 'More damage, more range, and it sees hidden zombies.', cost: 1300, damage: 9, cooldown: 3.1, range: 12, pierce: 999, speed: 24, hidden: true },
      { name: 'Two Boomerangs', desc: 'Triple damage, a bit faster, more range.', cost: 2000, damage: 28, cooldown: 2.9, range: 14.4, pierce: 999, speed: 26, hidden: true },
      { name: 'Holster', desc: 'More damage, faster throws, more range, and they slice through lead.', cost: 2800, damage: 42, cooldown: 2.7, range: 17, pierce: 999, speed: 28, hidden: true },
      { name: 'Golden Boomerang', desc: 'More damage and much more range.', cost: 3500, damage: 60, cooldown: 2.5, range: 22, pierce: 999, speed: 32, hidden: true },
    ],
  },

  // Bunny (Rocketeer): eggs → slingshot → catapult → bazooka. From Lv 3, +5% damage for every other
  // Lv 3+ Bunny in its range once at least 3 others are there (4 Bunnies together), up to +40%.
  rocketeerBunny: {
    name: 'Bunny',
    altOf: 'rocketeer',
    form: 'Bunny',
    shards: 1,
    price: 0,
    cost: 110,
    limit: 8,
    lob: 0.4,
    blurb: 'An Easter bunny who throws eggs, then upgrades to a slingshot, a catapult and finally a bazooka. The cheapest upgrades around for strong hits, and from Lv 3 it hits harder when 4 or more Bunnies are close together.',
    tip: 'Pack Bunnies tightly so they are all in range of each other; the group boost tops out at 9 Bunnies.',
    levels: [
      { name: 'Bunny', desc: 'Throws an egg at one zombie.', damage: 3, cooldown: 2, range: 8, hidden: false },
      { name: 'Egg Basket', desc: 'More than triple damage, faster, and it sees hidden zombies.', cost: 650, damage: 10, cooldown: 1.4, range: 8, hidden: true },
      { name: 'Slingshot', desc: 'Much more damage and range, and a group boost: +5% damage per other Bunny in range once 4 are together (up to +40%).', cost: 2400, damage: 29, cooldown: 1.3, range: 18, hidden: true,
        kin: { dmg: 0.05, dmgCap: 0.4, min: 3 } },
      { name: 'Catapult', desc: 'Much more damage and range.', cost: 2700, damage: 51, cooldown: 1.3, range: 22, hidden: true, kin: { dmg: 0.05, dmgCap: 0.4, min: 3 } },
      { name: 'Bazooka', desc: 'More damage, a bit faster and much more range.', cost: 3500, damage: 61, cooldown: 1.2, range: 28, hidden: true, kin: { dmg: 0.05, dmgCap: 0.4, min: 3 } },
    ],
  },

  // Beebo (Aviator): from Lv 2 it rides around in a circle (per-level `orbit`), so its range moves with it.
  aviatorBeebo: {
    name: 'Beebo',
    altOf: 'aviator',
    form: 'Beebo',
    shards: 1,
    price: 0,
    cost: 120,
    limit: 6,
    orbit: 4,
    lap: 7,
    blurb: 'A little robot who throws ice creams very fast at one zombie at a time. From Lv 2 it rides around in a circle, so its short range sweeps over more of the path. Cheap, with great single-target damage, but weak against crowds.',
    tip: 'Place it on a curve so its circle covers lots of path, and bring a Balloon Pal for range.',
    levels: [
      { name: 'Beebo', desc: 'Throws ice cream at one zombie.', damage: 3, cooldown: 1.7, range: 5.6, orbit: 0, hidden: false },
      { name: 'Scooter', desc: 'Rides in a circle, more damage and range, and it sees hidden zombies.', cost: 900, damage: 10, cooldown: 1.4, range: 8, hidden: true },
      { name: 'Ice Cream Cooler', desc: 'Nearly triple damage, throws much faster, more range.', cost: 2300, damage: 29, cooldown: 0.9, range: 12, hidden: true },
      { name: 'Racing Kart', desc: 'More damage, much faster, more range.', cost: 3200, damage: 32, cooldown: 0.55, range: 16.8, hidden: true },
      { name: 'Hover Kart', desc: 'More damage, very fast throws, much more range and a bigger circle.', cost: 5500, damage: 44, cooldown: 0.45, range: 24, orbit: 6, hidden: true },
    ],
  },

  // Fracture (Marksman): crystal shards; random 2-3 / 3-4 shard bursts at Lv 4-5.
  marksmanFracture: {
    name: 'Fracture',
    altOf: 'marksman',
    form: 'Fracture',
    shards: 2,
    price: 0,
    cost: 130,
    limit: 7,
    lead: 2,
    blurb: 'A living rock that throws crystal shards. High damage with good range and hidden detection from the start, and its first four levels are cheap. At Lv 4 it throws bursts of 2-3 shards. Bad against crowds, and big.',
    tip: 'Spam a few Lv 1 Fractures for early hidden zombies, and run several Lv 4s mid-game.',
    levels: [
      { name: 'Fracture', desc: 'Throws a crystal shard at one zombie.', damage: 3, cooldown: 1.5, range: 5, hidden: true },
      { name: 'Amber Crystals', desc: 'More damage and much more range.', cost: 900, damage: 8, cooldown: 1.5, range: 14, hidden: true },
      { name: 'Shard Hands', desc: 'More than triple damage, more range, and it breaks lead armor.', cost: 2100, damage: 28, cooldown: 1.6, range: 20, hidden: true },
      { name: 'Magma Cracks', desc: 'Throws bursts of 2-3 shards, much more damage and range.', cost: 3700, damage: 52, burst: 2, burstMax: 3, burstGap: 0.3, burstPause: 1.5, cooldown: 2.25, range: 26, hidden: true },
      { name: 'Crystal Crown', desc: 'Bursts of 3-4 shards, more damage and range.', cost: 6800, damage: 60, burst: 3, burstMax: 4, burstGap: 0.3, burstPause: 1.5, cooldown: 2.55, range: 28, hidden: true },
    ],
  },

  // Oddport (Barracks): one group of students at a time, sharing one health bar. Each student hits
  // harder the closer its zombie is. Reese revives the group (once, twice from Lv 4).
  barracksOddport: {
    name: 'Oddport',
    altOf: 'barracks',
    form: 'Oddport',
    shards: 1,
    price: 0,
    cost: 720,
    limit: 1,
    kind: 'spawner',
    spawnEvery: 6,
    maxUnits: 1,
    blurb: 'An academy that sends out one group of students at a time. They walk the path and stop to fight, sharing one health bar, and each one hits harder the closer its zombie is. Upgrades add new classmates: PK (ranged), Reese (revives the group), Sticky (quick shots) and Nelly (a fast fighter).',
    tip: 'Great early on one-path maps to catch zombies that slip past, and against slow, tanky zombies.',
    levels: [
      { name: 'Oddport', desc: 'One student, 30 HP, 1-3 damage.', hidden: false, unit: oddport(1, 30, 1, 3, 6) },
      { name: 'PK', desc: 'Adds PK, who throws ranged shots. 70 HP, 3-8 damage.', cost: 1500, hidden: false, unit: oddport(2, 70, 3, 8, 10) },
      { name: 'Reese', desc: 'Adds Reese, who heals the group to full once when it would fall. 110 HP, 5-22 damage.', cost: 2700, hidden: false, unit: oddport(3, 110, 5, 22, 12, 1) },
      { name: 'Sticky', desc: 'Adds Sticky, who fires fast weak shots, and Reese can revive twice. 200 HP, 10-45 damage, sees hidden zombies.', cost: 4200, hidden: true,
        unit: { ...oddport(4, 200, 10, 45, 20, 2), hidden: true } },
      { name: 'Nelly', desc: 'Adds Nelly, a fast melee fighter. 350 HP, 13-62 damage.', cost: 6800, hidden: true, unit: { ...oddport(5, 350, 13, 62, 24, 2), hidden: true } },
    ],
  },

  // Slime King (Patrol): slimes crash into zombies; from Lv 3 they set them on fire.
  patrolSlime: {
    name: 'Slime King',
    altOf: 'patrol',
    form: 'Slime King',
    winReward: 'Beat Easy mode', // can't be bought: given for winning (see DIFFICULTIES unlock)
    shards: 2,
    price: 0,
    cost: 700,
    limit: 1,
    kind: 'spawner',
    spawnEvery: 16,
    blurb: 'A royal slime who sends slime minions from the far end of the path to crash into zombies (hidden ones too). From Lv 3 the slimes burn whatever they hit. From Lv 3 his Summon King ability sends the Slime King himself (7,000 HP) down the path.',
    tip: 'Weak value at Lv 1-2; it shines from Lv 3. Summon King gets more valuable late in the game.',
    levels: [
      { name: 'Slime King', desc: 'Sends an 8 HP slime every 16s.', hidden: false, unit: SLIME(8, 5) },
      { name: 'Bigger Slimes', desc: 'Slimes get 40 HP.', cost: 1500, hidden: false, unit: SLIME(40, 5) },
      { name: 'Fire Slimes', desc: 'Slimes get 250 HP, move faster and Burn what they hit (10/s for 4s). Unlocks Summon King ($20,000).', cost: 2500, hidden: false,
        unit: SLIME(250, 6.5, { dps: 10, time: 4 }, true), abilities: [SUMMON_KING_AB] },
      { name: 'Hot Slimes', desc: '400 HP slimes, faster spawns, a stronger Burn (20/s).', cost: 3800, hidden: false, spawnEvery: 15,
        unit: SLIME(400, 6.5, { dps: 20, time: 4 }, true), abilities: [SUMMON_KING_AB] },
      { name: 'Incinerate', desc: '500 HP slimes, faster spawns, and Incinerate (40/s).', cost: 6000, hidden: false, spawnEvery: 14,
        unit: SLIME(500, 6.5, { dps: 40, time: 4 }, true), abilities: [SUMMON_KING_AB] },
    ],
  },

  // Kart Kid (Zed): karts that crash into zombies. Lv 5: a kart that runs out of health gets a
  // 7s invincible star and smashes through zombies (900 damage, 20% less with each hit).
  zedKart: {
    name: 'Kart Kid',
    altOf: 'zed',
    form: 'Kart Kid',
    shards: 1,
    price: 0,
    cost: 650,
    limit: 1,
    kind: 'spawner',
    spawnEvery: 27,
    blurb: 'A hooded kid who sends copies of himself in cardboard karts to crash into zombies. Cheap, with tough karts that are great on long maps. At Lv 5 a kart that runs out of health grabs a star: 7 seconds of invincible smashing.',
    tip: 'Good for stopping dangerous zombies before they reach your base, but not your main boss killer.',
    levels: [
      { name: 'Kart Kid', desc: 'Sends a 30 HP kart every 27s.', hidden: false, unit: KART(30, 5) },
      { name: 'Tougher Karts', desc: '120 HP karts that drive faster.', cost: 1400, hidden: false, spawnEvery: 26, unit: KART(120, 5.6) },
      { name: 'Painted Karts', desc: '350 HP karts.', cost: 2500, hidden: false, spawnEvery: 26, unit: KART(350, 5.6) },
      { name: 'Turbo Karts', desc: '500 HP karts, faster and a bit more often.', cost: 4000, hidden: false, spawnEvery: 25, unit: KART(500, 6) },
      { name: 'Star Power', desc: '600 HP karts. When a kart runs out of health it gets a star: invincible for 7s, smashing zombies for 900 (20% less with each hit).', cost: 6500, hidden: false, spawnEvery: 25,
        unit: KART(600, 7, { time: 7, damage: 900, fade: 0.8 }) },
    ],
  },

  // El Goblino (Trapper): traps that stun and hurt the zombie that steps on them. Guessed: stun 2s
  // (bosses 40%), up to 3 traps out. Crucifix from Lv 3.
  trapperGoblino: {
    name: 'El Goblino',
    altOf: 'trapper',
    form: 'El Goblino',
    shards: 1,
    price: 0,
    cost: 350,
    limit: 3,
    flying: false,
    traps: true,
    bossStop: 0.4,
    blurb: 'A goblin who throws traps on the path that stun and hurt the zombie that steps on them, bosses too. Each trap only catches one zombie and takes a while to come back. From Lv 3 its Crucifix freezes the strongest zombie in range for 10s.',
    tip: 'Pair it with heavy melee hitters like Yasuke or Chef, and place it on a straight stretch near a corner.',
    levels: [
      { name: 'El Goblino', desc: 'Throws a wood trap every 19s: 10 damage and a 2s stun.', cooldown: 19, range: 7.4, maxTraps: 3, hidden: true, order: ['bear'], bear: { damage: 10, stun: 2 } },
      { name: 'Seek Trap', desc: '45-damage traps.', cost: 1800, cooldown: 19, range: 7.6, maxTraps: 3, hidden: true, order: ['bear'], bear: { damage: 45, stun: 2 } },
      { name: 'Bob Trap', desc: '90-damage traps, a bit faster, and unlocks Crucifix: freeze the strongest zombie in range for 10s.', cost: 3000, cooldown: 18, range: 7.8, maxTraps: 3, hidden: true, order: ['bear'], bear: { damage: 90, stun: 2 },
        abilities: [CRUCIFIX_AB] },
      { name: 'Snare Trap', desc: '190-damage traps and a bit more range.', cost: 5200, cooldown: 18, range: 8, maxTraps: 3, hidden: true, order: ['bear'], bear: { damage: 190, stun: 2.5 }, abilities: [CRUCIFIX_AB] },
      { name: 'Meat Trap', desc: '290-damage traps, the fastest throws and the longest range.', cost: 6700, cooldown: 17, range: 8.4, maxTraps: 3, hidden: true, order: ['bear'], bear: { damage: 290, stun: 3 }, abilities: [CRUCIFIX_AB] },
    ],
  },

  // Chaos Jester (Jester): random everything, even its upgrade prices (`costMax`).
  jesterChaos: {
    name: 'Chaos Jester',
    altOf: 'jester',
    form: 'Chaos',
    shards: 3,
    price: 0,
    cost: 700,
    limit: 1,
    kindLabel: 'Chaos',
    blurb: 'The master of chaos. Every few seconds something random happens: it spawns a friendly unit or an extra zombie, throws a random effect (burn, poison, heal, slow, freeze...) on every zombie in range, or gives you cash or steals some. Even its upgrade prices are random. At Lv 5 it can hit the jackpot.',
    tip: 'Max it late, once you have enough defense to handle the extra zombies it lets in.',
    levels: [
      { name: 'Chaos Jester', desc: 'Every 16s: a Wind-up Toy helps you, or an extra zombie from this wave shows up.', range: 10, hidden: false, chaos: CHAOS[0] },
      { name: 'Party Tricks', desc: 'Every 15s. Adds Chaos Balls and random effects on zombies in range: burn, poison, or heal.', cost: 2500, costMax: 3500, range: 12, hidden: false, chaos: CHAOS[1] },
      { name: 'Wheel of Fortune', desc: 'Every 14s. Adds Big Clowns, slows, and cash: gives $400-1,500, or steals $200-800.', cost: 4000, costMax: 5500, range: 14, hidden: false, chaos: CHAOS[2] },
      { name: 'Loaded Dice', desc: 'Every 13s. Adds Freeze and Paralyze effects, and cash swings up to $4,000.', cost: 6000, costMax: 7500, range: 16, hidden: true, chaos: CHAOS[3] },
      { name: 'Jackpot', desc: 'Every 12s. Supercharged effects, $4,000-10,000 cash rolls, and a jackpot of $10,000-20,000.', cost: 7500, costMax: 10000, range: 18, hidden: true, chaos: CHAOS[4] },
    ],
  },

  // ---------------------------------------------------------------- new base towers (credits)

  // Balloon Pal: more range (and bigger splash) for towers in range; from Lv 3 they attack a bit slower.
  balloonPal: {
    name: 'Balloon Pal',
    price: 2000,
    cost: 350,
    limit: 3,
    kind: 'support',
    placement: 'any',
    blurb: 'A little blob floating from balloons that gives every tower in its range more range and a bigger splash, up to +50%. From Lv 3 the towers it boosts attack a little slower. Its Lv 5 Spawn Helper sends an exploding Bomb Float down the path.',
    tip: 'Bring it in almost any game with ranged towers. It even stretches other support towers\' ranges.',
    levels: [
      { name: 'Balloon Pal', desc: '+6% range for towers in range.', aura: 10, rangeBoost: 0.06, splashBoost: 0.06, hidden: false },
      { name: 'Third Balloon', desc: '+10% range and more reach.', cost: 1600, aura: 13, rangeBoost: 0.1, splashBoost: 0.1, hidden: false },
      { name: 'Propeller Cap', desc: '+20% range, more reach, but towers in range attack 2% slower.', cost: 2300, aura: 18, rangeBoost: 0.2, splashBoost: 0.2, rateLoss: 0.02, hidden: false },
      { name: 'Basket', desc: '+37% range and more reach; 3% slower attacks.', cost: 3200, aura: 22, rangeBoost: 0.37, splashBoost: 0.37, rateLoss: 0.03, hidden: false },
      { name: 'Balloon Bunch', desc: '+50% range, the most reach; 4% slower attacks. Unlocks Spawn Helper ($20,000).', cost: 6000, aura: 28, rangeBoost: 0.5, splashBoost: 0.5, rateLoss: 0.04, hidden: false,
        abilities: [SPAWN_HELPER_AB] },
    ],
  },

  // Buzzer: bees that chase zombies inside its range; from Lv 3 they explode when they die.
  buzzer: {
    name: 'Buzzer',
    price: 4500,
    cost: 430,
    limit: 2,
    kind: 'spawner',
    kindLabel: 'Summoner',
    blurb: 'A bee who keeps a swarm of fast bees that chase any zombie entering her range and sting it until they run out of stingers. From Lv 3 bees explode when they die. Her Lv 5 Dark Summoner makes every one of your summons explode when it dies.',
    tip: 'Very expensive to upgrade but a monster late. Pair her with Maitake to keep the bees alive against bosses.',
    levels: [
      { name: 'Buzzer', desc: 'Up to 2 bees (6 damage per sting).', range: 12, spawnEvery: 3, maxUnits: 2, hidden: false, unit: BEE(6, false) },
      { name: 'Busy Bees', desc: 'Up to 3 bees with double damage, faster summons, and they see hidden zombies.', cost: 2100, range: 14, spawnEvery: 2.5, maxUnits: 3, hidden: true, unit: BEE(12, true) },
      { name: 'Explosive Bees', desc: 'Up to 4 bees, more range, and bees explode for 60 when they die.', cost: 4200, range: 20, spawnEvery: 2.5, maxUnits: 4, hidden: true, unit: BEE(13, true, 60) },
      { name: 'Hive Pack', desc: 'Up to 6 bees, 18 damage, 100-damage explosions.', cost: 6200, range: 24, spawnEvery: 2, maxUnits: 6, hidden: true, unit: BEE(18, true, 100) },
      { name: 'Queen Hive', desc: 'Up to 8 bees, 22 damage, 140-damage explosions, more range. Unlocks Dark Summoner ($40,000).', cost: 8000, range: 28, spawnEvery: 2, maxUnits: 8, hidden: true, unit: BEE(22, true, 140),
        abilities: [DARK_SUMMONER_AB] },
    ],
  },

  // Nuki Launcher: fires Nukis from very far away; each lands with splash and stays to fight.
  // Guessed Nuki stats (see NUKI). Splash radius doubled from the spec (5 → 6).
  nukiLauncher: {
    name: 'Nuki Launcher',
    price: 6000,
    cost: 580,
    limit: 1,
    flying: false,
    lob: 1.6,
    kindLabel: 'Summoner',
    blurb: 'A tanuki with a cannon that fires Nukis onto the path from the longest range in the game. Each one lands with a splash and then stays there to fight, with no limit on how many pile up. Weak alone and slow to get going, and the most expensive tower to max.',
    tip: 'Build cheaper towers first and this one mid to late game. Don\'t skip waves, so Nukis have time to pile up.',
    levels: [
      { name: 'Nuki Launcher', desc: 'Fires a Nuki every 18s: 7 splash damage, then it stays to fight.', damage: 7, cooldown: 18, range: 40, radius: 10, hidden: false, nuki: NUKI(80, 3, 1, false) },
      { name: 'Drum Cannon', desc: 'More damage and range; it and its Nukis see hidden zombies.', cost: 3500, damage: 23, cooldown: 18, range: 50, radius: 10.4, hidden: true, nuki: NUKI(150, 8, 1, true) },
      { name: 'Elite Nukis', desc: 'Much more damage; Nukis attack in fast bursts of 4.', cost: 6000, damage: 50, cooldown: 18, range: 50, radius: 11, hidden: true, nuki: NUKI(250, 10, 4, true, true) },
      { name: 'Double Cannon', desc: 'More damage, huge range, stronger Nuki bursts, fires a bit faster.', cost: 8500, damage: 110, cooldown: 17, range: 60, radius: 11.2, hidden: true, nuki: NUKI(400, 18, 4, true, true) },
      { name: 'Grand Launcher', desc: 'The biggest hits and splash; Nukis hit in bursts of 5.', cost: 10000, damage: 170, cooldown: 17, range: 60, radius: 12, hidden: true, nuki: NUKI(600, 24, 5, true, true) },
    ],
  },

  // ---------------------------------------------------------------- event tower

  // Hayes: a scarecrow that summons crows; they fly anywhere on the map and peck 12 times, then
  // die. Guessed: peck rate from the spec's DPS table (1 / 0.7 / 0.7 / 0.6 / 0.5 s).
  hayes: {
    name: 'Hayes',
    event: 'Halloween event reward',
    cost: 650,
    limit: 2,
    kind: 'spawner',
    kindLabel: 'Summoner',
    blurb: 'A scarecrow who summons crows that fly anywhere on the map to peck zombies. Each crow pecks 12 times and then leaves. Infinite range, great on long maps, and a monster against bosses when maxed, but weak early and very expensive.',
    tip: 'Place it near the middle of long maps. A Discount Dog helps a lot with its pricey upgrades.',
    levels: [
      { name: 'Hayes', desc: 'One crow at a time (2 damage per peck), a new one every 10s.', range: 6, spawnEvery: 10, maxUnits: 1, hidden: false, unit: CROW(2, 1, false) },
      { name: 'Murder of Crows', desc: 'Up to 2 crows with triple damage that see hidden zombies.', cost: 2500, range: 6, spawnEvery: 10, maxUnits: 2, hidden: true, unit: CROW(6, 0.7, true) },
      { name: 'Pumpkin Patch', desc: 'Crows peck for 17 and fly faster.', cost: 5000, range: 6, spawnEvery: 10, maxUnits: 2, hidden: true, unit: { ...CROW(17, 0.7, true), speed: 20 } },
      { name: 'Lantern', desc: 'Up to 3 crows, faster summons, 23 damage.', cost: 7000, range: 6, spawnEvery: 8, maxUnits: 3, hidden: true, unit: { ...CROW(23, 0.6, true), speed: 20 } },
      { name: 'Harvest Moon', desc: 'Up to 4 crows with 28 damage.', cost: 10000, range: 6, spawnEvery: 8, maxUnits: 4, hidden: true, unit: { ...CROW(28, 0.5, true), speed: 22 } },
    ],
  },

  // ---------------------------------------------------------------- golden hero perks
  // Golden versions of hero forms (see "golden perks" in config.js): bought with credits once you
  // own the form, then switched on in the Loadout. Models are the form's, recoloured gold. In-game
  // costs match the normal form.

  // Golden Fracture: fixed shard bursts that grow with level (Lv 3: 3, Lv 4: 4, Lv 5: 5 shards),
  // more damage and range.
  goldFracture: {
    name: 'Golden Fracture',
    goldOf: 'marksmanFracture',
    damageType: 'golden',
    price: 7000,
    cost: 130,
    limit: 7,
    lead: true,
    blurb: 'The golden Fracture. Its golden crystal shards hit harder, reach farther and hurt lead zombies. From Lv 3 it throws bursts of shards that grow every level: 3, then 4, then 5 shards per burst.',
    tip: 'Lv 3 is already a big jump; it is one of the best single-target towers for its price mid-game.',
    levels: [
      { name: 'Golden Fracture', desc: 'Throws a golden shard at one zombie.', damage: 4, cooldown: 1.5, range: 5.5, hidden: true },
      { name: 'Gilded Crystals', desc: 'More damage and much more range.', cost: 900, damage: 10, cooldown: 1.5, range: 16, hidden: true },
      { name: 'Shard Storm', desc: 'Throws bursts of 3 golden shards, with more damage and range.', cost: 2100, damage: 32, burst: 3, burstGap: 0.3, cooldown: 2.4, range: 23, hidden: true },
      { name: 'Molten Gold', desc: 'Bursts of 4 shards, much more damage and range.', cost: 3700, damage: 62, burst: 4, burstGap: 0.3, cooldown: 2.7, range: 30, hidden: true },
      { name: 'Golden Crown', desc: 'Bursts of 5 shards, more damage and range.', cost: 6800, damage: 72, burst: 5, burstGap: 0.3, cooldown: 3, range: 32, hidden: true },
    ],
  },

  // Golden Wafer: a much bigger melee radius, faster attacks, +30% damage.
  goldWafer: {
    name: 'Golden Wafer',
    goldOf: 'warlockWafer',
    damageType: 'golden',
    price: 5000,
    cost: 120,
    limit: 7,
    flying: false,
    lead: true,
    kindLabel: 'Hybrid',
    blurb: 'The golden Wafer. Switches to its full-power candy-cane hit from about twice as far away, attacks faster and hits harder, with golden damage that hurts lead zombies.',
    tip: 'Its melee radius is wide enough to cover a whole bend of path: place it on the inside of a curve.',
    levels: [
      { name: 'Golden Wafer', desc: '1.3-4 damage, full damage within 6.', damage: 1.3, nearDmg: 4, meleeRange: 6, cooldown: 0.95, range: 7.6, hidden: false },
      { name: 'Golden Cane', desc: '13-26 damage, full damage within 8, more range, and it sees hidden zombies.', cost: 1300, damage: 13, nearDmg: 26, meleeRange: 8, cooldown: 1.05, range: 14, hidden: true },
      { name: 'Gilded Ornaments', desc: '29-42 damage, full damage within 9, faster, more range.', cost: 2700, damage: 29, nearDmg: 42, meleeRange: 9, cooldown: 0.95, range: 22, hidden: true },
      { name: 'Gold Gumdrops', desc: '46-59 damage, full damage within 10, faster, more range.', cost: 4000, damage: 46, nearDmg: 59, meleeRange: 10, cooldown: 0.9, range: 30, hidden: true },
      { name: 'Golden Knight', desc: '55-81 damage, full damage within 11, faster, and huge range.', cost: 6000, damage: 55, nearDmg: 81, meleeRange: 11, cooldown: 0.8, range: 36, hidden: true },
    ],
  },

  // Golden Byte: its zaps do real (golden) damage, and zombies in its range that are stunned or
  // slowed by anything take `slowVuln` more damage from everything. It zaps any zombie, shocking
  // the ones it's allowed to (same health limits as Byte).
  goldByte: {
    name: 'Golden Byte',
    goldOf: 'electroByte',
    damageType: 'golden',
    price: 6000,
    cost: 500,
    limit: 6,
    lead: true,
    bossStop: 0.5,
    kindLabel: 'Slow',
    blurb: 'The golden Byte. Its golden zaps do real damage now, still Shock (and at Lv 5 Paralyze) zombies, and every zombie in its range that is stunned or slowed by anything takes extra damage from all your towers.',
    tip: 'Put it where your other slows and stuns land (Frost towers, El Goblino, Quinn\'s Spore Field) to soften zombies up for everything else.',
    levels: [
      { name: 'Golden Byte', desc: '12 damage per zap; shocks zombies up to 200 max health; stunned or slowed zombies in range take 10% more damage.', damage: 12, cooldown: 1.5, range: 5.2, hidden: false,
        shock: { slow: 0.5, time: 2, maxHp: 200, hitAll: true }, slowVuln: 0.1 },
      { name: 'Gold Antenna', desc: '35 damage, shocks up to 1,000 health for 3s, +15% damage taken, more range, sees hidden zombies.', cost: 2500, damage: 35, cooldown: 1.5, range: 6.4, hidden: true,
        shock: { slow: 0.5, time: 3, maxHp: 1000, hitAll: true }, slowVuln: 0.15 },
      { name: 'Gold Cable', desc: '75 damage, shocks up to 2,500 health for 4s, +20% damage taken, much more range.', cost: 3400, damage: 75, cooldown: 1.5, range: 9.2, hidden: true,
        shock: { slow: 0.5, time: 4, maxHp: 2500, hitAll: true }, slowVuln: 0.2 },
      { name: 'Twin Gold Cables', desc: '130 damage, shocks any zombie for 5s, +25% damage taken.', cost: 4700, damage: 130, cooldown: 1.5, range: 9.4, hidden: true,
        shock: { slow: 0.5, time: 5, maxHp: null, hitAll: true }, slowVuln: 0.25 },
      { name: 'Golden Paralyze', desc: '220 damage, paralyzes any zombie for 5s (bosses 2.5s), +35% damage taken.', cost: 7000, damage: 220, cooldown: 1.5, range: 10, hidden: true,
        shock: { slow: 1, time: 5, maxHp: null, paralyze: true, hitAll: true }, slowVuln: 0.35 },
    ],
  },

  // Golden Mako: +30% damage, charges up faster, a much higher charged hit, and it starts charging from Lv 2.
  goldMako: {
    name: 'Golden Mako',
    goldOf: 'brawlerMako',
    damageType: 'golden',
    price: 7500,
    cost: 130,
    limit: 8,
    flying: false,
    lead: true,
    melee: true,
    blurb: 'The golden Mako. Hits harder with golden damage, starts charging up from Lv 2, charges much faster and stores a far bigger charged hit: up to 800 at Lv 5.',
    tip: 'Its fast charge means it is ready again between most groups. Still best as the backstop behind your other towers.',
    levels: [
      { name: 'Golden Mako', desc: 'Chomps one zombie and splashes the ones around it.', damage: 8, cooldown: 2.5, range: 6.4, area: 3, hidden: false },
      { name: 'Gold Pot Helmet', desc: 'More damage, a bigger splash, hidden detection, and it charges up while idle: up to 60 damage (8s).', cost: 1000, damage: 26, cooldown: 4, range: 7, area: 4, hidden: true, charge: { max: 60, time: 8 } },
      { name: 'Golden Knight', desc: '52-160 damage, charging fully in 9s.', cost: 2500, damage: 52, cooldown: 3.8, range: 8, area: 5, hidden: true, charge: { max: 160, time: 9 } },
      { name: 'Gilded Armor', desc: '195-550 damage, faster swings, a bigger splash, more reach, full charge in 8.5s.', cost: 3500, damage: 195, cooldown: 3.4, range: 9, area: 6, hidden: true, charge: { max: 550, time: 8.5 } },
      { name: 'Golden Great Shark', desc: '325-800 damage, a huge splash, more reach, full charge in 7s.', cost: 6000, damage: 325, cooldown: 3, range: 11, area: 8, hidden: true, charge: { max: 800, time: 7 } },
    ],
  },
};
