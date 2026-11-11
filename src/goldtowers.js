// "Good as gold" update: golden perks for Samurai, Hired Gun (the spec's Mercenary), Focus, Outlaw,
// Buccaneer, Enforcement Base, Submerge, Shock Commando (the spec's Commando) and Orbit, plus the
// Gold Commander (golden perk of the Commander).
//
// Golden perks (see "golden perks" in config.js): bought with credits once you own the form, then
// switched on in the Loadout, where they replace that form. Models are the form's, recoloured gold.
// Golden damage (damageType 'golden') hurts lead zombies.
//
// goldFx: extra looks on top of the gold. Every golden tower here gets a golden mist and star
// particles; `tints` recolours the whole model at a level: { level: [colours] } (two colours
// alternate between parts). Ruby red at max level for most, diamond blue for the Samurai.
//
// Numbers are the spec's tables. Where the spec gives a firerate inside bursts and a burst
// cooldown, `burstGap` is the firerate and `cooldown` is cyc(burst, firerate, burst cooldown).
// Things the spec doesn't give are copied from the normal form (hp, blast radii, inner abilities
// like the Shock Missile, Jericho Missile, pirate barrel and Orbital Wipeout) and noted below.

/** A burst tower's full cycle: `burst` shots `gap` s apart, then `cd` s before the next burst. */
const cyc = (burst, gap, cd) => Math.round(((burst - 1) * gap + cd) * 1000) / 1000;

const RUBY = { tints: { 5: [0xd50000] } };

// ---------------------------------------------------------------- Golden Mercenary (Hired Gun)

const G_TANK = { name: 'Golden Tank', model: 'goldhgtank', hp: 350, speed: 3, flying: false, lead: true, gun: { damage: 80, cooldown: 2.4, range: 23 } };
const G_TANK_DROP = { key: 'summon', name: 'Tank Airdrop', desc: 'A Golden Tank (350 HP, 110 damage every 2.4s) drops onto the path where you click', cooldown: 45, aim: true, radius: 4, drop: [{ unit: G_TANK, n: 1 }] };

// ---------------------------------------------------------------- Golden Focus

// The golden page lists an "ability DPS" (twice the normal DPS) at every level but never says what
// the ability is. Guessed: Focus Fire, double damage for 10s every 40s.
const FOCUS_FIRE = { key: 'overload', name: 'Focus Fire', desc: 'For 10s its shots do double damage', cooldown: 40, duration: 10, self: true, dmg: 2 };

// ---------------------------------------------------------------- Golden Outlaw

const GOLDEN_MADNESS = { key: 'ghostHands', name: 'Golden Madness', desc: 'Spends its charges: each golden hand fires a revolver shot that bounces to 2 more zombies', cooldown: 30, bounces: 2, jump: 8, mult: 1 };

// ---------------------------------------------------------------- Golden Buccaneer

const CUTLASS = { name: 'Golden Cutlass Pirate', model: 'goldcutlass', soldiers: 1, hp: 90, speed: 3.5, flying: false, lead: true, gun: { damage: 210, cooldown: 1, range: 4 } };
const CORSAIR = { name: 'Golden Corsair', model: 'goldcorsair', soldiers: 1, hp: 40, speed: 3.5, hidden: true, lead: true, gun: { damage: 105, cooldown: 2, range: 14 } };

// ---------------------------------------------------------------- Golden Enforcement Base

// Golden units: faster firing and more range than the normal ones. The APM-Bot's explosive shot
// comes every 4.25s (normal 4s).
const GEB = {
  enf: { name: 'Golden Enforcer', model: 'goldebenforcer', soldiers: 1, hp: 20, speed: 4, lead: true, gun: { damage: 5, cooldown: 0.38, range: 13.2 } },
  m: { name: 'Golden Enforcer M', model: 'goldebenforcerm', soldiers: 1, hp: 50, speed: 4, flying: false, lead: true, gun: { damage: 25, cooldown: 0.57, range: 3.1 } },
  truck: { name: 'Golden Turret Truck', model: 'goldebtruck', hp: 375, speed: 4, hidden: true, lead: true, flying: true, slowFire: true, gun: { damage: 10.5, cooldown: 0.07, range: 23 } },
  apm: { name: 'Golden APM-Bot', model: 'goldebapm', hp: 2250, speed: 3, hidden: true, lead: true, flying: true, slowFire: true, gun: { damage: 24, cooldown: 0.07, range: 32.1 }, cannon: { damage: 200, every: 4.25, radius: 4 } },
};

// ---------------------------------------------------------------- Golden Submerge

const DIVE_AB = { key: 'dive', name: 'Dive', desc: 'Switch between Afloat (fast coastal missiles) and Submerged (slow, huge golden nukes, hidden detection)', cooldown: 3 };
const JERICHO_AB = { key: 'wipeout', name: 'Golden Jericho Missile', desc: 'A cluster missile that splits midair: 18,000 damage split among every zombie on the map', cooldown: 90, damage: 10000 };

// ---------------------------------------------------------------- Golden Commando (Shock Commando)

const shockMissileAb = (damage, stun) => ({ key: 'frag', name: 'Golden Shock Missile', desc: `A missile at its target: ${damage} damage and a ${stun}s stun, even on bosses`, cooldown: 60, radius: 2, damage, stun, stunAny: true });

// ---------------------------------------------------------------- Golden Orbit

const WIPEOUT_AB = { key: 'wipeout', name: 'Golden Wipeout', desc: '60,000 damage split evenly among every zombie on the map, hidden ones too', cooldown: 120, damage: 60000 };
/** Orbit stats: `fire` s of firing every `gap` s, then `recharge` s. */
const orb = (damage, gap, range, fire, recharge, shield) => {
  const burst = Math.round(fire / gap);
  return { damage, burst, burstGap: gap, cooldown: cyc(burst, gap, recharge), range, aura: Math.min(range, 30), shield: { amount: shield, every: 15 }, hidden: true };
};

// ---------------------------------------------------------------- Gold Commander

// Deus Ex Machina: a hovering golden cyber tank. Its main cannon has huge range; two machine guns
// (one gun firing twice as often) chew through what gets close. It rams zombies (ramArmor: it
// takes half the damage). ghost: when it's destroyed it turns into a ghost that can't be hurt and
// keeps shooting (but can't ram) until it reaches the entrance or `ghost.life` s pass.
const CYBER_TANK = {
  name: 'Golden Cyber Tank', model: 'gcybertank', hp: 30000, speed: 3, flying: true, hidden: true, lead: true,
  ram: true, ramArmor: 0.5, hover: true, ghost: { life: 60 },
  gun: { damage: 60, cooldown: 0.06, range: 22 },
  cannon: { damage: 1500, every: 2, radius: 6, range: 48 },
};
const callToBattle = (rate, dmg, swordMult, duration) => ({ key: 'cta', name: 'Call to Battle!',
  desc: `For ${duration}s: towers in range attack ${rate * 100}% faster and do ${dmg * 100}% more damage, and the Gold Commander ${swordMult > 1 ? `swings his broadsword for ${swordMult}x damage` : 'pulls out his giant golden broadsword'}`,
  cooldown: 40, duration, boost: rate, dmg, swordMult });
const DEUS_EX = { key: 'militia', name: 'Deus Ex Machina', desc: 'Summons a hovering golden cyber tank (30,000 HP): a huge-range cannon and two machine guns. When it\'s destroyed it fights on as a ghost', cost: 5000, cooldown: 90, unit: CYBER_TANK };
// Orbital Airstrike: a beam that follows your cursor for `time` s, doing `dps` to everything in `radius`.
const ORBITAL = { key: 'orbital', name: 'Orbital Airstrike', desc: 'Click a spot: a giant yellow beam of destruction comes down there and follows your cursor for 12s, melting everything it touches (hidden and flying zombies too)', cooldown: 180, aim: true, radius: 6, time: 12, dps: 20000, speed: 45 };

export const GOLD_TOWERS = {
  // Golden Samurai. Spec: Lv 4 range 4.7 (the Samurai page says 4.75). Shuriken copied from the
  // normal Samurai (3x its damage).
  goldSamurai: {
    name: 'Golden Samurai',
    goldOf: 'samurai',
    damageType: 'golden',
    price: 6500,
    flying: false,
    lead: true,
    cost: 475,
    limit: 10,
    melee: true,
    kindLabel: 'Multi',
    goldFx: { tints: { 4: [0x40c4ff] } }, // a diamond at max level
    blurb: 'The golden Samurai. Cheaper to place and upgrade than the normal one, swings more times per burst at higher levels and reaches a little further, with golden slashes that hurt lead zombies. Each hit is weaker, and he only sees hidden zombies from Lv 3.',
    tip: 'Max level costs $8,725 in total for more DPS than a maxed normal Samurai. Put him on a corner of the path.',
    levels: [
      { name: 'Golden Samurai', desc: 'Bursts of 2 golden slashes, each hitting up to 3 zombies.', damage: 6, burst: 2, burstGap: 0.3, cooldown: cyc(2, 0.3, 1.4), range: 3.5, targets: 3, shuriken: { damage: 18, range: 9, cooldown: 1.5 }, hidden: false },
      { name: 'Gilded Edge', desc: 'Bursts of 3, faster slashes and shorter pauses.', cost: 250, damage: 6, burst: 3, burstGap: 0.275, cooldown: cyc(3, 0.275, 1.25), range: 3.5, targets: 3, shuriken: { damage: 18, range: 9, cooldown: 1.5 }, hidden: false },
      { name: 'Golden Steel', desc: 'Damage 6 → 10, bursts of 4, shorter pauses.', cost: 1300, damage: 10, burst: 4, burstGap: 0.275, cooldown: cyc(4, 0.275, 1), range: 3.5, targets: 3, shuriken: { damage: 30, range: 9, cooldown: 1.5 }, hidden: false },
      { name: 'Way of Gold', desc: 'Damage 10 → 12, faster, more reach, bursts of 5, and hidden detection.', cost: 2450, damage: 12, burst: 5, burstGap: 0.255, cooldown: cyc(5, 0.255, 1), range: 4, targets: 3, shuriken: { damage: 36, range: 10, cooldown: 1.5 }, hidden: true },
      { name: 'Diamond Katanas', desc: 'Damage 12 → 14, faster, more reach, bursts of 8 and much shorter pauses. Turns to diamond.', cost: 4250, damage: 14, burst: 8, burstGap: 0.225, cooldown: cyc(8, 0.225, 0.75), range: 4.7, targets: 3, shuriken: { damage: 42, range: 11, cooldown: 1.5 }, hidden: true },
    ],
  },

  // Golden Mercenary (golden Hired Gun). The Mercenary page's own Golden table disagrees (16 damage,
  // 0.16 firerate, $29,800 total); this uses the golden page.
  goldHiredGun: {
    name: 'Golden Mercenary',
    goldOf: 'hiredGun',
    damageType: 'golden',
    price: 7500,
    lead: true,
    cost: 600,
    limit: 8,
    goldFx: RUBY,
    blurb: 'The golden Hired Gun. Still fires long bursts of 30 to 40 golden shots (they hurt lead zombies), with buffed stats. Hidden detection from Lv 2. At max level his Tank Airdrop calls in a Golden Tank that fires faster than the normal one. His first two levels are weak.',
    tip: 'Cheap, strong late levels: $20,600 in total for about 110 DPS plus the tank.',
    levels: [
      { name: 'Golden Mercenary', desc: 'Bursts of 30 golden bullets.', damage: 2.5, burst: 30, burstGap: 0.25, cooldown: cyc(30, 0.25, 3), range: 9, hidden: false },
      { name: 'Gold Sights', desc: 'Faster, much more range.', cost: 450, damage: 2.5, burst: 30, burstGap: 0.225, cooldown: cyc(30, 0.225, 3), range: 11.5, hidden: false },
      { name: 'Golden Night Vision', desc: 'Damage 3.5 → 5.6, faster, bursts of 40, shorter pauses, and hidden detection.', cost: 950, damage: 4, burst: 40, burstGap: 0.2, cooldown: cyc(40, 0.2, 2.7), range: 11.5, hidden: true },
      { name: 'Gilded Mag', desc: 'Damage 5.6 → 7, more range.', cost: 3150, damage: 5, burst: 40, burstGap: 0.2, cooldown: cyc(40, 0.2, 2.7), range: 13, hidden: true },
      { name: 'Golden Armor', desc: 'Damage 7 → 11, much faster.', cost: 5600, damage: 8, burst: 40, burstGap: 0.15, cooldown: cyc(40, 0.15, 2.7), range: 13, hidden: true },
      { name: 'Golden Radio', desc: 'Damage 11 → 21, faster, more range. Unlocks Tank Airdrop: a Golden Tank. Turns ruby red.', cost: 9850, damage: 15, burst: 40, burstGap: 0.125, cooldown: cyc(40, 0.125, 2.7), range: 15, hidden: true, abilities: [G_TANK_DROP] },
    ],
  },

  // Golden Focus. The golden page has no overheat: instead it has to charge up (`rev`, like the
  // Minigunner) before it fires. The Focus page's Golden tab tells a different story (same costs as
  // Focus, damage 3.75 → 16.5, overheat limits); this uses the golden page.
  goldFocus: {
    name: 'Golden Focus',
    goldOf: 'focus',
    damageType: 'golden',
    price: 9000,
    lead: true,
    cost: 2500,
    limit: 8,
    goldFx: RUBY,
    blurb: 'The golden Focus. An even faster stream of small golden shots at one zombie, and it never overheats, but it has to charge up before it fires. Focus Fire doubles its damage for a while. Costs more than a normal Focus to max, has short range early and only sees hidden zombies from Lv 2.',
    tip: 'Place it where zombies stay in range so it stays charged up.',
    levels: [
      { name: 'Golden Focus', desc: 'Rapid golden shots after a 1.5s charge-up. Focus Fire: double damage for 10s.', damage: 3, cooldown: 0.085, range: 8, rev: 1.5, hidden: false, abilities: [FOCUS_FIRE] },
      { name: 'Gold Lens', desc: 'More range, charges up in 1.2s.', cost: 650, damage: 3, cooldown: 0.085, range: 10, rev: 1.2, hidden: false, abilities: [FOCUS_FIRE] },
      { name: 'Golden Scanner', desc: 'Faster, more range, and hidden detection.', cost: 2600, damage: 3, cooldown: 0.065, range: 12, rev: 1.2, hidden: true, abilities: [FOCUS_FIRE] },
      { name: 'Twin Gold Barrels', desc: 'Damage 3 → 5, faster, charges up in 1s.', cost: 9500, damage: 5, cooldown: 0.06, range: 12, rev: 1, hidden: true, abilities: [FOCUS_FIRE] },
      { name: 'Gold Sink', desc: 'Damage 5 → 7, faster, more range.', cost: 14500, damage: 7, cooldown: 0.05, range: 13, rev: 1, hidden: true, abilities: [FOCUS_FIRE] },
      { name: 'Ruby Hot', desc: 'Damage 7 → 10, more range, charges up in 0.8s. Turns ruby red.', cost: 23500, damage: 10, cooldown: 0.05, range: 15, rev: 0.8, hidden: true, stunImmune: true, abilities: [FOCUS_FIRE] },
    ],
  },

  // Golden Outlaw: shots `burstGap` apart in bursts, then a burst cooldown (no ammo / reload).
  // Crits hit harder and more often. Charges = golden hands for Golden Madness (from Lv 2, like the
  // normal Outlaw). hp copied from the Outlaw.
  goldOutlaw: {
    name: 'Golden Outlaw',
    goldOf: 'outlaw',
    damageType: 'golden',
    price: 8000,
    lead: true,
    cost: 600,
    limit: 8,
    goldFx: RUBY,
    blurb: 'The golden Outlaw. Her golden revolver hits harder and crits more often, and her Golden Madness uses golden hands instead of ghost hands. Big damage for the price. Hidden detection from Lv 2, and her health is still low.',
    tip: '128 DPS at max for $20,800. Keep her away from boss attacks.',
    levels: [
      { name: 'Golden Outlaw', desc: 'A golden revolver. 35% of shots crit for 1.45x.', damage: 8, cooldown: cyc(1, 0.35, 1.5), range: 10, critChance: 0.35, critMult: 1.45, hp: 80, hidden: false },
      { name: 'Golden Draw', desc: 'Damage 8 → 15, more range, crits 1.5x.', cost: 400, damage: 15, cooldown: cyc(1, 0.315, 1.5), range: 12, critChance: 0.35, critMult: 1.5, hp: 90, hidden: false },
      { name: 'Golden Madness', desc: 'Damage 15 → 20, more range, shorter pauses, 40% crits, hidden detection. Unlocks Golden Madness (1 golden hand).', cost: 1400, damage: 20, cooldown: cyc(1, 0.3, 1.25), range: 14, critChance: 0.4, critMult: 1.5, ghosts: 1, hp: 100, hidden: true, abilities: [GOLDEN_MADNESS] },
      { name: 'Fan the Gold', desc: 'Damage 20 → 25, 2-shot bursts, crits 1.6x, 2 golden hands.', cost: 3450, damage: 25, burst: 2, burstGap: 0.3, cooldown: cyc(2, 0.3, 1.2), range: 14, critChance: 0.4, critMult: 1.6, ghosts: 2, hp: 120, hidden: true, abilities: [GOLDEN_MADNESS] },
      { name: 'Golden Eye', desc: 'Damage 25 → 35, faster, more range, 45% crits for 1.8x.', cost: 6450, damage: 35, burst: 2, burstGap: 0.25, cooldown: cyc(2, 0.25, 1), range: 16, critChance: 0.45, critMult: 1.8, ghosts: 2, hp: 140, hidden: true, abilities: [GOLDEN_MADNESS] },
      { name: 'Legend of Gold', desc: 'Damage 35 → 50, more range, 60% crits for 2x, 4 golden hands. Turns ruby red.', cost: 8500, damage: 50, burst: 2, burstGap: 0.25, cooldown: cyc(2, 0.25, 1), range: 17, critChance: 0.6, critMult: 2, ghosts: 4, hp: 160, hidden: true, abilities: [GOLDEN_MADNESS] },
    ],
  },

  // Golden Buccaneer. Spec placement cost: $4,500 (the golden page says $4,750 once, but its own
  // totals and the Buccaneer page use $4,500). Blast radius and the pirate barrel (Lv 4+, golden
  // pirates) copied from the Buccaneer.
  goldBuccaneer: {
    name: 'Golden Buccaneer',
    goldOf: 'buccaneer',
    damageType: 'golden',
    price: 15000,
    lead: true,
    cost: 4500,
    limit: 6,
    placement: 'water',
    lob: 0.8,
    friendlyFire: true,
    goldFx: RUBY,
    blurb: 'The golden Buccaneer. Its golden cannonballs hit a bit softer, but its bursts come back twice as fast and it reaches even further across the map. It finally sees hidden zombies at Lv 5. Water only.',
    tip: 'Set it to Strongest. 205 DPS with 170 range and hidden detection at max.',
    levels: [
      { name: 'Golden Buccaneer', desc: '2-cannonball bursts with huge range.', damage: 15, burst: 2, burstGap: 0.25, cooldown: cyc(2, 0.25, 1.5), range: 100, radius: 2, hidden: false },
      { name: 'Golden Shot', desc: 'Damage 15 → 25, more range.', cost: 3000, damage: 25, burst: 2, burstGap: 0.25, cooldown: cyc(2, 0.25, 1.5), range: 115, radius: 2, hidden: false },
      { name: 'Golden Broadside', desc: 'Damage 25 → 30, more range, 4-cannonball bursts.', cost: 7500, damage: 30, burst: 4, burstGap: 0.25, cooldown: cyc(4, 0.25, 1.5), range: 125, radius: 2, hidden: false },
      { name: 'Golden Man-o\'-War', desc: 'Damage 30 → 35, 6-cannonball bursts.', cost: 10500, damage: 35, burst: 6, burstGap: 0.25, cooldown: cyc(6, 0.25, 1.5), range: 125, radius: 2, hidden: false },
      { name: 'Golden Barrel', desc: '12-cannonball bursts, faster, more range, longer pauses. Every 90s it drops 2 golden Cutlass pirates and a golden Corsair on the path.', cost: 18500, damage: 35, burst: 12, burstGap: 0.15, cooldown: cyc(12, 0.15, 3), range: 150, radius: 2, hidden: false,
        drop: { every: 90, at: 0.5, units: [CUTLASS, CUTLASS, CORSAIR] } },
      { name: 'Ruby Galleon', desc: 'Damage 35 → 60, faster, more range, shorter pauses, and hidden detection. The barrel comes every 80s. Turns ruby red.', cost: 35000, damage: 60, burst: 12, burstGap: 0.125, cooldown: cyc(12, 0.125, 2), range: 170, radius: 2, hidden: true,
        drop: { every: 80, at: 0.5, units: [CUTLASS, CUTLASS, CORSAIR] } },
    ],
  },

  // Golden Enforcement Base: the normal costs and timers (the wiki lists none of its own), with
  // golden units. Red at Lv 4, then bright yellow and blue at max.
  goldEnforcementBase: {
    name: 'Golden Enforcement Base',
    goldOf: 'enforcementBase',
    price: 12000,
    cost: 1150,
    limit: 3,
    kind: 'spawner',
    spawnEvery: 60,
    goldFx: { tints: { 4: [0xd50000], 5: [0xffee58, 0x2979ff] } },
    blurb: 'The golden Enforcement Base. Sends golden units that fire faster and reach further than the normal ones: Enforcers, Enforcer Ms, then the Golden Turret Truck (150 DPS) and the Golden APM-Bot (about 390 DPS). The sign says the safety budget went into yachts.',
    tip: 'Pair it with a Broadcaster to make its later levels cheaper. Lightning attacks still wipe out its spawns.',
    levels: [
      { name: 'Golden Enforcement Base', desc: 'A Golden Enforcer every 60s.', hidden: false, unit: GEB.enf },
      { name: 'Faster Dispatch', desc: 'A Golden Enforcer every 40s.', cost: 850, hidden: false, spawnEvery: 40, unit: GEB.enf },
      { name: 'Golden Enforcer M', desc: 'Adds a Golden Enforcer M every 45s.', cost: 2500, hidden: false, spawnEvery: 40, unit: GEB.enf, unit2: GEB.m, spawnEvery2: 45 },
      { name: 'Golden Squads', desc: '3 Enforcers every 30s, 2 Enforcer Ms every 45s.', cost: 5850, hidden: false, spawnEvery: 30, unit: { ...GEB.enf, count: 3 }, unit2: { ...GEB.m, count: 2 }, spawnEvery2: 45 },
      { name: 'Golden Turret Truck', desc: 'Faster squads, and a Golden Turret Truck every 50s (375 HP, 150 DPS, hidden detection). Turns red.', cost: 14500, hidden: true, spawnEvery: 25, unit: { ...GEB.enf, count: 3 },
        unit2: { ...GEB.m, count: 3 }, spawnEvery2: 35, unit3: GEB.truck, spawnEvery3: 50 },
      { name: 'Golden APM-Bot', desc: '5 Enforcers every 25s, more Ms and Trucks, and the Golden APM-Bot every 75s (2,250 HP, about 390 DPS, 200-damage blasts). Turns yellow and blue.', cost: 80000, hidden: true, spawnEvery: 25, unit: { ...GEB.enf, count: 5 },
        unit2: { ...GEB.m, count: 3 }, spawnEvery2: 25, unit3: GEB.truck, spawnEvery3: 40, unit4: GEB.apm, spawnEvery4: 75 },
    ],
  },

  // Golden Submerge. The Submerge page's Golden tables differ a lot ($7,500 to place, 220 / 1,700
  // damage at max); this uses the golden page, including its range drop at Lv 5 (130 afloat,
  // 150 submerged). Blast radii and the Jericho Missile copied from the Submerge.
  goldSubmerge: {
    name: 'Golden Submerge',
    goldOf: 'submerge',
    damageType: 'golden',
    price: 20000,
    lead: true,
    cost: 7750,
    limit: 5,
    placement: 'water',
    homing: true,
    lob: 1,
    goldFx: RUBY,
    blurb: 'The golden Submerge. Harder-hitting golden missiles in both modes. Afloat fires bursts of missiles; from Lv 3 it can dive and fire slow, huge golden nukes (1,800 damage each at max), the only mode with hidden detection. Very expensive. Water only.',
    tip: 'Keep it Submerged against bosses. Set it to Strongest.',
    levels: [
      { name: 'Golden Submerge', desc: 'Bursts of 2 golden missiles.', damage: 45, burst: 2, burstGap: 1, cooldown: cyc(2, 1, 7), range: 110, radius: 3, hidden: false },
      { name: 'More Gold Tubes', desc: 'Damage 81 → 90, bursts of 4.', cost: 4500, damage: 50, burst: 4, burstGap: 1, cooldown: cyc(4, 1, 7), range: 110, radius: 3, hidden: false },
      { name: 'Golden Missile Deck', desc: 'Damage 90 → 135, more range, bursts of 8, shorter pauses.', cost: 9750, damage: 75, burst: 8, burstGap: 1, cooldown: cyc(8, 1, 6.5), range: 130, radius: 3, hidden: false },
      { name: 'Golden Dive', desc: 'Afloat: damage 135 → 180, much shorter pauses. Unlocks Submerged mode: 685-damage nukes every 3s with a huge blast and hidden detection.', cost: 16000, damage: 100, burst: 8, burstGap: 1, cooldown: cyc(8, 1, 3.5), range: 130, radius: 3, hidden: false,
        sub: { damage: 380, burst: 1, burstGap: 3, cooldown: 6, range: 150, radius: 8, lob: 2.5, hidden: true }, abilities: [DIVE_AB] },
      { name: 'Golden Hunter', desc: 'Afloat: faster, more range. Submerged: 1,080-damage nukes, 2 per burst, more range.', cost: 26500, damage: 100, burst: 8, burstGap: 0.8, cooldown: cyc(8, 0.8, 3.5), range: 140, radius: 3, hidden: false,
        sub: { damage: 600, burst: 2, burstGap: 2.5, cooldown: cyc(2, 2.5, 6), range: 190, radius: 8, lob: 2.5, hidden: true }, abilities: [DIVE_AB] },
      { name: 'Ruby Jericho', desc: 'Afloat: damage 290, faster. Submerged: 1,800-damage nukes, 3 per burst. Unlocks the Golden Jericho Missile. Turns ruby red.', cost: 58000, damage: 160, burst: 8, burstGap: 0.75, cooldown: cyc(8, 0.75, 3.5), range: 130, radius: 3, hidden: false,
        sub: { damage: 1000, burst: 3, burstGap: 2.5, cooldown: cyc(3, 2.5, 10), range: 150, radius: 9, lob: 2.5, hidden: true }, abilities: [DIVE_AB, JERICHO_AB] },
    ],
  },

  // Golden Commando (golden Shock Commando): bursts of golden explosive missiles. The Shock Missile
  // (Lv 4+) is copied from the Shock Commando.
  goldShockCommando: {
    name: 'Golden Commando',
    goldOf: 'shockCommando',
    damageType: 'golden',
    price: 10000,
    lead: true,
    cost: 700,
    limit: 8,
    homing: true,
    lob: 0.5,
    goldFx: RUBY,
    blurb: 'The golden Shock Commando. Starts a little weaker and cheaper, but its upgrades add much more damage, ending at 195 per golden missile. Great against late-game crowds. Costs more to max than the normal one, and sees hidden zombies from Lv 2.',
    tip: 'About 166 DPS at max, or close to 500 when each blast hits 3 zombies. Save the Shock Missile for bosses.',
    levels: [
      { name: 'Golden Commando', desc: 'Bursts of 2 golden explosive missiles.', damage: 12, burst: 2, burstGap: 0.75, cooldown: cyc(2, 0.75, 3), range: 10, radius: 2, hidden: false },
      { name: 'Golden Warheads', desc: 'Damage 12 → 22, shorter pauses, bigger blast.', cost: 1250, damage: 22, burst: 2, burstGap: 0.75, cooldown: cyc(2, 0.75, 2.8), range: 10, radius: 2.45, hidden: false },
      { name: 'Golden Sights', desc: 'Damage 22 → 32, faster, more range, and hidden detection.', cost: 2900, damage: 32, burst: 2, burstGap: 0.65, cooldown: cyc(2, 0.65, 2.7), range: 12, radius: 2.45, hidden: true },
      { name: 'Second Gold Pod', desc: 'Damage 32 → 50, more range, bursts of 4, bigger blast.', cost: 8500, damage: 50, burst: 4, burstGap: 0.65, cooldown: cyc(4, 0.65, 2.7), range: 14, radius: 2.75, hidden: true },
      { name: 'Golden Shock Missile', desc: 'Damage 50 → 96, faster, more range. Unlocks the Golden Shock Missile (150 damage, 1s stun).', cost: 9500, damage: 96, burst: 4, burstGap: 0.5, cooldown: cyc(4, 0.5, 2.7), range: 16, radius: 2.75, hidden: true, abilities: [shockMissileAb(150, 1)] },
      { name: 'Ruby Storm', desc: 'Damage 96 → 195, more range, bigger blast. Shock Missile: 500 damage, 1.25s stun. Turns ruby red.', cost: 25000, damage: 195, burst: 4, burstGap: 0.5, cooldown: cyc(4, 0.5, 2.7), range: 17, radius: 3, hidden: true, abilities: [shockMissileAb(500, 1.25)] },
    ],
  },

  // Golden Orbit: about twice the reach of the Orbit, less damage per tick. Sees hidden zombies
  // from Lv 0. Its shield and Orbital Wipeout copied from the Orbit; the shield aura stops at 30
  // (it doesn't cover the whole golden range).
  goldOrbit: {
    name: 'Golden Orbit',
    goldOf: 'orbit',
    damageType: 'golden',
    price: 18000,
    lead: true,
    cost: 4500,
    limit: 4,
    goldFx: RUBY,
    blurb: 'The golden Orbit. Its golden satellite beam reaches about twice as far as the Orbit\'s, covering a huge part of the map, but each tick does less damage and it fires a little slower. Sees hidden zombies from the start. Slightly cheaper to max.',
    tip: 'Put it in the middle of the map: its range covers most of the path.',
    levels: [
      { name: 'Golden Orbit', desc: '5s of golden laser fire, then 8s recharging. Shields towers nearby (100 every 15s).', ...orb(6, 0.165, 40, 5, 8, 100) },
      { name: 'Golden Lens', desc: 'Damage 11 → 20, faster, more range, 6s of fire.', cost: 4400, ...orb(11, 0.13, 44, 6, 8, 150) },
      { name: 'Golden Core', desc: 'Damage 20 → 25, faster.', cost: 9000, ...orb(14, 0.12, 44, 6, 8, 250) },
      { name: 'Golden Array', desc: 'Damage 25 → 40, more range, 7s of fire.', cost: 17000, ...orb(22, 0.12, 50, 7, 8, 400) },
      { name: 'Golden Recharge', desc: 'Damage 40 → 45, more range, recharges in 7s.', cost: 26500, ...orb(25, 0.12, 55, 7, 7, 600) },
      { name: 'Ruby Wipeout', desc: 'Damage 45 → 54, more range, 10s of fire, recharges in 6.5s. Unlocks Golden Wipeout. Turns ruby red.', cost: 41500, ...orb(30, 0.12, 60, 10, 6.5, 1000), abilities: [WIPEOUT_AB] },
    ],
  },

  // Gold Commander: the ultimate support tower (golden perk of the Commander, 50,000 credits).
  // Mechanics (see sim.js):
  //   killCash: damage by towers in its aura pays that much (1.5 = 1.5x; in Versus, their kills do).
  //   goldRate: extra firerate for golden towers in its aura, on top of the other boosts.
  //   cta ability `dmg`: extra damage while Call to Battle is on (besides `boost` firerate).
  //   sword: { damage, every, radius, always } his giant broadsword: every `every` s it hits every
  //          zombie within `radius` (hidden too). Only while Call to Battle is on, or `always`.
  //          The ability's `swordMult` multiplies its damage while it's on.
  //   orbital ability: see ORBITAL above.
  // Guessed (the spec only says "significantly expensive" / "large damage"): upgrade costs, aura 18.6
  // (33% more than the Commander's 14), limit 2, Call to Battle 12s every 40s, sword numbers, the
  // cyber tank's stats and ghost time, orbital beam damage and cooldown.
  goldCommander: {
    name: 'Gold Commander',
    goldOf: 'commander',
    damageType: 'golden',
    price: 50000,
    lead: true,
    cost: 1500,
    limit: 2,
    kind: 'support',
    goldFx: {},
    blurb: 'The ultimate tower. Towers in his range do 33% more damage with 33% more range, earn 1.5x cash for their damage, and golden towers attack faster too. Call to Battle! pulls out his giant golden broadsword and pushes nearby towers even harder; Deus Ex Machina summons a hovering golden cyber tank; and at max level an Orbital Airstrike beam follows your cursor, melting everything in its path. Every upgrade is very expensive.',
    tip: 'Surround him with your best towers, golden ones most of all. Steer the Orbital Airstrike along the path with your mouse.',
    levels: [
      { name: 'Gold Commander', desc: 'Towers in range get +33% damage and +33% range. 33% more range than a Commander.', aura: 18.6, rangeBoost: 0.33, dmgBoost: 0.33, hidden: false },
      { name: 'Gold Digging', desc: 'Towers in range earn 1.5x cash for their damage, and golden towers in range attack 15% faster on top of the other boosts.', cost: 8000, aura: 18.6, rangeBoost: 0.33, dmgBoost: 0.33, killCash: 1.5, goldRate: 0.15, hidden: false },
      { name: 'Call to Battle!', desc: 'Ability: for 12s he pulls out his giant golden broadsword (300 damage to every zombie within 12, every second), and towers in range attack 50% faster and do 25% more damage.', cost: 25000, aura: 18.6, rangeBoost: 0.33, dmgBoost: 0.33, killCash: 1.5, goldRate: 0.15, hidden: true,
        sword: { damage: 300, every: 1, radius: 12 },
        abilities: [callToBattle(0.5, 0.25, 1, 12)] },
      { name: 'Deus Ex Machina', desc: 'Ability ($5,000): summons a hovering golden cyber tank with a huge-range cannon and two machine guns. When destroyed it fights on as a ghost (it just can\'t ram).', cost: 60000, aura: 18.6, rangeBoost: 0.33, dmgBoost: 0.33, killCash: 1.5, goldRate: 0.15, hidden: true,
        sword: { damage: 300, every: 1, radius: 12 },
        abilities: [callToBattle(0.5, 0.25, 1, 12), DEUS_EX] },
      { name: 'Give them hell!', desc: 'Call to Battle is always on (+50% firerate, +66% damage in total) and his sword is boosted (500 damage within 14). The Call to Battle! ability now doubles his sword and adds another +50% firerate and +50% damage. Ability: Orbital Airstrike, a beam that follows your cursor for 12s.', cost: 150000, aura: 18.6, rangeBoost: 0.33, dmgBoost: 0.66, rateBoost: 0.5, killCash: 1.5, goldRate: 0.15, hidden: true,
        sword: { damage: 500, every: 1, radius: 14, always: true },
        abilities: [callToBattle(0.5, 0.5, 2, 12), DEUS_EX, ORBITAL] },
    ],
  },
};
