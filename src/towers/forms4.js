// Towers: alternate forms, wave 4. Flame Trooper, Goo Gunner, Frost Blaster, Cryo Mortar,
// Bow Archer, Swarmer, Toxic Gunner, Sledger, Cryo Helicopter, Executioner.
// One group of the TOWERS table. config.js joins the groups in order (see TOWERS there).
// Shared units and abilities (MERC, AP_AB, ...) come from shared.js.
import {
  ARROWS_AB, CRYO_FOLLOW, CRYO_MOVE, FIRE_RING_AB, ICE_SHARD_AB, PUDDLE_AB, SNOW_STORM_AB, beeNadeAb, cryoMissile,
} from './shared.js';

export const TOWERS_FORMS_4 = {
  // ---------------------------------------------------------------- alternate forms, wave 4
  // Flame Trooper (alternate Flamethrower form): a narrow line of fire (small `cone`) that hits the
  // best `hits` zombies in it (see Pyromancer), so it needs detection and never sees hidden ones.
  // From Lv 4 burnVuln (see Patrol Boat Flame Tanks), Lv 5 the Fire Ring ability.
  // Not used by the game yet (kept for later): aimDelay on Lv 5 (spec: "aims 1.1s longer").
  flameTrooper: {
    name: 'Flame Trooper',
    lead: true,
    altOf: 'flamethrower',
    form: 'Trooper',
    shards: 2,
    price: 0,
    cost: 850,
    limit: 8,
    burnSlow: 0,
    blurb: 'An alternate Flamethrower that sprays a line of fire through many zombies at once and sets them burning. From Lv 4 burning zombies take extra damage from all your towers, and at Lv 5 it gets the Fire Ring blast. Very cost-efficient early. No hidden detection, and fire-immune zombies and most bosses shrug it off.',
    tip: 'Put it on tight corners so the line of fire covers more path, and use Random targeting to spread the burn debuff.',
    levels: [
      { name: 'Flame Trooper', desc: 'Sprays a line of fire that hits up to 10 zombies and burns them for 0.8 per second for 5s.', damage: 2, hits: 10, burn: 1, burnTime: 5, cooldown: 0.2, range: 5, cone: 0.2, hp: 175, hidden: false },
      { name: 'Hotter Temps', desc: 'Damage 1.5 → 3.4, burns 1.5 per second and 2 more range.', cost: 1150, damage: 4.5, hits: 10, burn: 2, burnTime: 5, cooldown: 0.2, range: 7, cone: 0.2, hp: 250, hidden: false },
      { name: 'Bigger Flamethrower', desc: 'Damage 3.4 → 7.9 and 4 more range.', cost: 2250, damage: 10.5, hits: 10, burn: 2, burnTime: 5, cooldown: 0.2, range: 11, cone: 0.2, hp: 400, hidden: false },
      { name: 'Napalm', desc: 'Damage 7.9 → 13, burns 4.5 per second and they last 1s longer.', cost: 5250, damage: 17.5, hits: 10, burn: 6, burnTime: 6, cooldown: 0.2, range: 11, cone: 0.2, hp: 650, hidden: false },
      { name: 'M3 Flamethrower', desc: 'Burning zombies take 5% more damage from everything for 7s, and it can\'t be stunned. Damage 13 → 18, burns 6 per second for 10s and 3 more range.', cost: 10500,
        damage: 23.5, hits: 10, burn: 8, burnTime: 10, cooldown: 0.2, range: 14, cone: 0.2, hp: 1100, stunImmune: true, burnVuln: { amount: 0.05, time: 7 }, hidden: false },
      { name: 'Exo-Flame Suit', desc: 'A huge boost: damage 18 → 49, burns 11 per second, burning zombies take 10% more damage, and the Fire Ring ability.', cost: 30500,
        damage: 65.5, hits: 10, burn: 15, burnTime: 10, cooldown: 0.2, range: 14, cone: 0.2, hp: 2550, stunImmune: true, burnVuln: { amount: 0.1, time: 7 }, aimDelay: 1.1, hidden: false,
        abilities: [FIRE_RING_AB] },
    ],
  },
  // Goo Gunner (alternate Slime Trooper form): goo globs (see Slime Trooper) that slow one zombie,
  // then from Lv 3 a Glue Hose that hits `targets` zombies at once. spray: each zombie the hose
  // hits also splashes every zombie within `spray` of it (same damage and slow). Lv 5 Spawn Puddle.
  // The spec doesn't give its base slow: 15% for 3s is a guess (+5% / +2s etc. from there).
  gooGunner: {
    name: 'Goo Gunner',
    fly: 30, // globs of goo fly to the zombie (the hose hits at once)
    lead: 3,
    altOf: 'slime',
    form: 'Gunner',
    shards: 1,
    price: 0,
    cost: 300,
    limit: 8,
    kindLabel: 'Slow',
    blurb: 'An alternate Slime Trooper that shoots toxic goo that slows zombies. At Lv 3 it switches to a Glue Hose that sprays several zombies at once, and at Lv 5 it drops a goo puddle that sends out friendly Goos to ram zombies. Cheap to max, but low damage, and its early single-target shots are slow. Bosses ignore the slow.',
    tip: 'Use Strongest targeting before Glue Hose and Random after it, so the slow spreads over the crowd.',
    levels: [
      { name: 'Goo Gunner', desc: 'Goo globs that slow a zombie by 15% for 3s.', damage: 2, cooldown: 1.5, range: 12, slime: { slow: 0.15, time: 3 }, hp: 500, hidden: false },
      { name: 'Sticky Goo', desc: 'Damage 0.8 → 1.9, 2 more range and a 5% stronger slow.', cost: 400, damage: 5, cooldown: 1.5, range: 14, slime: { slow: 0.2, time: 3 }, hp: 650, hidden: false },
      { name: 'Slow Dry', desc: 'Damage 1.9 → 3.8, shoots a bit faster, and the slow is 5% stronger and lasts 2s longer.', cost: 1000, damage: 10, cooldown: 1.35, range: 14, slime: { slow: 0.25, time: 5 }, hp: 850, hidden: false },
      { name: 'Glue Hose', desc: 'A hose that sprays 3 zombies at once with a small splash and shoots much faster, but damage 3.8 → 1.9 and 3 less range. Can hit lead zombies.', cost: 1850,
        damage: 5, cooldown: 0.2, range: 11, targets: 3, spray: 1, slime: { slow: 0.25, time: 5 }, hp: 1050, hidden: false },
      { name: 'Acidic Goo', desc: 'Damage 1.9 → 3.8, a bigger splash and 5 zombies at once.', cost: 3000, damage: 10, cooldown: 0.2, range: 11, targets: 5, spray: 1.5, slime: { slow: 0.25, time: 5 }, hp: 1450, hidden: false },
      { name: 'Goo Units', desc: 'Damage 3.8 → 5.3, 7 zombies at once, a bigger splash, a 10% stronger slow that lasts 3s longer, and the Spawn Puddle ability.', cost: 6000,
        damage: 14, cooldown: 0.2, range: 11, targets: 7, spray: 2, slime: { slow: 0.35, time: 8 }, hp: 2050, hidden: false, abilities: [PUDDLE_AB] },
    ],
  },
  // Cryo Blaster (alternate Frost Trooper with two paths): sprays ice that builds up chill (see
  // Freezer) until zombies freeze for `chillFreeze` s (the thaw time). The spec's "freeze amount"
  // is chill here at 0.06 chill per point (1 chill = frozen), capped at 1. Hits `targets` zombies
  // with a `spray` splash (see Goo Gunner). frostbite / frozenVuln / freezeBoss: see Cryo Ranger.
  // The spec doesn't give its base thaw time (1s), slow (up to 30%) or splash (1): guesses.
  // ignoreIceResist (Top 5 Snow Storm): its chill, freezes and frost damage ignore ice resistance.
  frostBlaster: {
    name: 'Cryo Blaster',
    lead: true,
    flying: false,
    altOf: 'frost',
    form: 'Blaster',
    shards: 2,
    price: 0,
    cost: 225,
    limit: 10,
    kindLabel: 'Slow',
    branch: 'frostBlasterBottom',
    branchAt: 1,
    path: 'Top',
    blurb: 'An alternate Frost Trooper with two upgrade paths right away. Sprays ice that builds up freeze on zombies: they slow down, then get stuck in place until they thaw, and frozen zombies take extra damage. No damage until Lv 3. Top path: a wide Snow Storm that freezes crowds (never bosses, no hidden detection). Bottom path: a Cryo Rifle that freeze-locks a few strong zombies, and at max level freezes bosses and sees hidden and flying zombies.',
    tip: 'Put the Top path near the zombie spawn, or right next to a short-range tower.',
    levels: [
      { name: 'Cryo Blaster', desc: 'Sprays ice that slowly freezes a zombie (and those right next to it). No damage.', damage: 0, cooldown: 0.2, range: 7, targets: 1, spray: 1, hp: 50, hidden: false,
        chill: 0.03, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 1 },
      { name: 'Subzero Temperature', path: 'Top', desc: 'Top path: zombies it freezes stay 25% slower for good.', cost: 225, damage: 0, cooldown: 0.2, range: 7, targets: 1, spray: 1, hp: 75, hidden: false,
        chill: 0.03, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, frostbite: 0.25 },
      { name: 'Bigger Fan', path: 'Top', desc: '2.5 more range.', cost: 250, damage: 0, cooldown: 0.2, range: 9.5, targets: 1, spray: 1, hp: 110, hidden: false,
        chill: 0.03, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, frostbite: 0.25 },
      { name: 'Cryo Thrower', path: 'Top', desc: 'Freezes much faster, sprays 3 zombies at once and does a little damage.', cost: 1000, damage: 0.5, cooldown: 0.2, range: 9.5, targets: 3, spray: 1, hp: 185, hidden: false,
        chill: 0.15, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, frostbite: 0.25 },
      { name: 'Bigger Tank', path: 'Top', desc: 'Frozen zombies take 40% more damage. Freezes faster, a bigger splash and 5 zombies at once.', cost: 2750, damage: 0.5, cooldown: 0.2, range: 9.5, targets: 5, spray: 2, hp: 435, hidden: false,
        chill: 0.27, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, frostbite: 0.25, frozenVuln: 0.4 },
      { name: 'Snow Storm', path: 'Top', desc: 'A much stronger freeze, frozen zombies take 55% more damage, 10 zombies at once, damage 0.2 → 1 and a bigger splash. Ignores ice resistance.', cost: 7500,
        damage: 2.5, cooldown: 0.2, range: 9.5, targets: 10, spray: 2.5, hp: 985, hidden: false, ignoreIceResist: true,
        chill: 0.69, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, frostbite: 0.25, frozenVuln: 0.55 },
    ],
  },
  // The Cryo Blaster's Bottom path (not in the shop: a Cryo Blaster becomes this when you pick it).
  frostBlasterBottom: {
    name: 'Cryo Blaster',
    lead: true,
    flying: false,
    branchOf: 'frostBlaster',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 225,
    limit: 10,
    kindLabel: 'Slow',
    blurb: 'The Cryo Blaster\'s Bottom path: a stronger freeze, then the Cryo Rifle that freezes up to 3 zombies with every shot and does real damage. At Lv 5 Deep Freeze freezes bosses (for half the time) and sees hidden and flying zombies.',
    tip: 'It can\'t see hidden or flying zombies until Lv 5, and can\'t freeze bosses until then either.',
    levels: [
      { name: 'Cryo Blaster', desc: 'Sprays ice that slowly freezes a zombie (and those right next to it). No damage.', damage: 0, cooldown: 0.2, range: 7, targets: 1, spray: 1, hp: 50, hidden: false,
        chill: 0.03, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 1 },
      { name: 'Ice Block', path: 'Bottom', desc: 'Bottom path: freezes much faster and frozen zombies take 25% more damage.', cost: 450, damage: 0.5, cooldown: 0.2, range: 7, targets: 1, spray: 1, hp: 65, hidden: false,
        chill: 0.12, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, frozenVuln: 0.25 },
      { name: 'Turbo Turbine', path: 'Bottom', desc: 'Sprays 3 zombies at once and 3 more range.', cost: 475, damage: 0.5, cooldown: 0.2, range: 10, targets: 3, spray: 1, hp: 100, hidden: false,
        chill: 0.12, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, frozenVuln: 0.25 },
      { name: 'Cryo Rifle', path: 'Bottom', desc: 'A rifle: every shot freezes up to 3 zombies for 2s and does 20 damage, frozen zombies take 30% more damage and 4.5 more range. No splash, and it shoots every 2s.', cost: 2100,
        damage: 20, cooldown: 2, range: 14.5, targets: 3, hp: 250, hidden: false,
        chill: 1, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 2, frozenVuln: 0.3 },
      { name: 'Overcharged Tanks', path: 'Bottom', desc: 'Damage 20 → 50, shoots a bit faster and 2 more range.', cost: 5675, damage: 50, cooldown: 1.75, range: 16.5, targets: 3, hp: 725, hidden: false,
        chill: 1, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 2, frozenVuln: 0.3 },
      { name: 'Deep Freeze', path: 'Bottom', desc: 'Freezes bosses too (for half the time), sees hidden and flying zombies, freezes last 4s, frozen zombies take 55% more damage, damage 50 → 100 and faster shots.', cost: 14000,
        damage: 100, cooldown: 1.25, range: 17.5, targets: 3, hp: 1975, hidden: true, flying: true,
        chill: 1, chillTime: 2.5, maxSlow: 0.3, chillDps: 0, chillFreeze: 4, frozenVuln: 0.55, freezeBoss: 0.5 },
    ],
  },
  // Cryo Mortar (alternate Harpoon Hunter form): a cliff mortar lobbing icy shells. Every zombie in
  // the blast gets chill (see Cryo Blaster: 0.06 per "freeze amount" point) and freezes at full chill.
  // minRange: it can't shoot zombies this close. The spec gives no base freeze (4), thaw time
  // (1.5s, 2s at Lv 5) or deadzone (8, then +8): guesses. Its Lv 5 table DPS (89.4) would mean a 7s
  // reload, but the upgrade text says "reloads 1s faster" (4s → 3s): the text wins.
  cryoMortar: {
    name: 'Cryo Mortar',
    lead: true,
    flying: false,
    altOf: 'harpoonHunter',
    form: 'Mortar',
    shards: 2,
    price: 0,
    cost: 1750,
    limit: 4,
    placement: 'cliff',
    lob: 1.3,
    minRange: 8,
    blurb: 'An alternate Harpoon Hunter: a long-range mortar that lobs icy shells, hurting and freezing every zombie in the blast. It can\'t hit zombies that are too close. At Lv 5 it freezes bosses too. Low health. Cliffs only.',
    tip: 'Place it away from your main defense so its blind spot doesn\'t matter, and pair it with other freezing towers.',
    levels: [
      { name: 'Cryo Mortar', desc: 'Icy shells that hurt and chill every zombie in the blast. Can\'t hit zombies within 8.', damage: 10, cooldown: 4.5, range: 30, radius: 4, hp: 300, hidden: false,
        chill: 0.24, chillTime: 6, maxSlow: 0.3, chillDps: 0, chillFreeze: 1.5 },
      { name: 'Advanced Training', desc: 'Damage 10 → 16, a stronger freeze, reloads faster and 5 more range.', cost: 650, damage: 16, cooldown: 4, range: 35, radius: 4, hp: 330, hidden: false,
        chill: 0.48, chillTime: 6, maxSlow: 0.3, chillDps: 0, chillFreeze: 1.5 },
      { name: 'Bigger Shell', desc: 'Damage 16 → 26, a stronger freeze and a bigger blast.', cost: 1500, damage: 26, cooldown: 4, range: 35, radius: 4.5, hp: 505, hidden: false,
        chill: 0.72, chillTime: 6, maxSlow: 0.3, chillDps: 0, chillFreeze: 1.5 },
      { name: 'Nitrogen Shell', desc: 'Damage 26 → 76, every shell now freezes the zombies it hits, and 5 more range.', cost: 4850, damage: 76, cooldown: 4, range: 40, radius: 4.5, hp: 905, hidden: false,
        chill: 1, chillTime: 6, maxSlow: 0.3, chillDps: 0, chillFreeze: 1.5 },
      { name: 'Sub-Zero Shell', desc: 'A huge damage boost (76 → 176) and 20 more range.', cost: 16000, damage: 176, cooldown: 4, range: 60, radius: 4.5, hp: 1905, hidden: false,
        chill: 1, chillTime: 6, maxSlow: 0.3, chillDps: 0, chillFreeze: 1.5 },
      { name: 'Ice Is Nice', desc: 'Freezes bosses too (for half the time). Damage 176 → 626, a huge blast, reloads faster and 65 more range, but its blind spot grows to 16.', cost: 50000,
        damage: 626, cooldown: 3, range: 125, radius: 11.5, minRange: 16, hp: 2905, hidden: false,
        chill: 1, chillTime: 6, maxSlow: 0.3, chillDps: 0, chillFreeze: 2, freezeBoss: 0.5 },
    ],
  },
  // Archer (Bowmaster form, alternate event Archer). bounce: { hits, jump }: each arrow hits its
  // target, then bounces to the closest zombie within `jump` it hasn't hit, `hits` zombies in all.
  // arrows: the arrow types it has unlocked (Switch Arrows cycles them; 'normal' is always there):
  //   flame:     { dps, time, extra } sets the zombies hit on fire and bounces `extra` more times.
  //   explosive: { damage, radius } a blast where the arrow first lands.
  //   shock:     { stun, targets } stuns the first `targets` zombies it hits.
  // Flame and Explosive arrows can aim at lead zombies, but only their fire / blast hurts them.
  archerBow: {
    name: 'Archer',
    altOf: 'archer',
    form: 'Bowmaster',
    shards: 1,
    price: 0,
    flying: false,
    cost: 600,
    limit: 15,
    kindLabel: 'Bounce',
    blurb: 'An alternate Archer with very long range. Its arrows bounce from zombie to zombie, and later upgrades unlock flaming, exploding and shocking arrows (switch between them with an ability).',
    tip: 'Compact paths make arrows bounce more. Burns don\'t stack, so only a few Archers should use flame arrows.',
    levels: [
      { name: 'Archer', desc: 'Long-range arrows that bounce between up to 3 zombies.', damage: 5, cooldown: 1.6, range: 16.5, bounce: { hits: 3, jump: 7 }, hidden: false },
      { name: 'Eagle Eye', desc: 'Faster shots and much more range.', cost: 250, damage: 5, cooldown: 1.4, range: 20, bounce: { hits: 3, jump: 7 }, hidden: false },
      { name: 'Deadshot', desc: 'Damage 5 → 8 and hidden detection.', cost: 550, damage: 8, cooldown: 1.4, range: 20, bounce: { hits: 3, jump: 7 }, hidden: true },
      { name: 'Flame-tipped Arrows', desc: 'Damage 8 → 10, more range and arrows hit 1 more zombie. Unlocks Flame Arrows (3 burn per second for 2s).', cost: 1250, damage: 10, cooldown: 1.4, range: 21, bounce: { hits: 4, jump: 7 }, hidden: true,
        arrows: { flame: { dps: 3, time: 2, extra: 0 } }, abilities: [ARROWS_AB] },
      { name: 'Powder Keg Arrows', desc: 'Damage 10 → 16 and faster shots. Unlocks Explosive Arrows (25 splash). Flame Arrows burn hotter for 4s and bounce once more.', cost: 3000, damage: 16, cooldown: 1.2, range: 21, bounce: { hits: 4, jump: 7 }, hidden: true,
        arrows: { flame: { dps: 5, time: 4, extra: 1 }, explosive: { damage: 25, radius: 2 } }, abilities: [ARROWS_AB] },
      { name: 'Shock & Awe', desc: 'Damage 16 → 40, faster shots and more range. Unlocks Shock Arrows that stun up to 5 zombies. Bigger, harder explosions and much hotter flames that bounce 4 more times.', cost: 8500, damage: 40, cooldown: 1, range: 24, bounce: { hits: 4, jump: 7 }, hidden: true,
        arrows: { flame: { dps: 14, time: 4, extra: 5 }, explosive: { damage: 45, radius: 2.5 }, shock: { stun: 0.15, targets: 5 } }, abilities: [ARROWS_AB] },
    ],
  },
  // Swarmer: shoots bees (homing projectiles, see `fly`). bees: { damage, tick, time, stacks }:
  // every hit adds a bee sting stack that does `damage` every `tick` s for `time` s. A zombie holds
  // at most `stacks` stacks (from this tower's level); past that, a hit refreshes the oldest one.
  swarmer: {
    name: 'Swarmer',
    event: 'Event reward',
    flying: false,
    cost: 900,
    limit: 10,
    fly: 30,
    kindLabel: 'DoT',
    blurb: 'Shoots bees at a zombie. Every hit adds a stack of bee stings that keep hurting it, and the stacks add up, so it melts tough zombies and bosses over time. From Lv 4 it throws a Bee Swarm Grenade. Slow and short-ranged early on, with no hidden or flying detection.',
    tip: 'Set targeting to Strongest; First can waste stacks on zombies that are about to die.',
    levels: [
      { name: 'Swarmer', desc: 'Shoots bees: each hit adds a sting stack (4.2 damage a second for 2.1s, 1 stack max).', damage: 2, cooldown: 1.2, range: 13, bees: { damage: 3, tick: 1, time: 2.1, stacks: 1 }, hidden: false },
      { name: 'Extra Honey', desc: 'Up to 3 sting stacks on one zombie.', cost: 400, damage: 2, cooldown: 1.2, range: 13, bees: { damage: 3, tick: 1, time: 2.1, stacks: 3 }, hidden: false },
      { name: 'Aggressive Bees', desc: 'Damage 2.8 → 5.6, more range, stings last 4.1s and 6 stacks.', cost: 1250, damage: 4, cooldown: 1.2, range: 15, bees: { damage: 3, tick: 1, time: 4.1, stacks: 6 }, hidden: false },
      { name: 'Bee Certified Weapons', desc: 'No more direct damage and slower shots, but stings tick faster and last 5.25s, more range and 12 stacks. Unlocks Bee Swarm Grenade.', cost: 2000, damage: 0, cooldown: 1.5, range: 18, bees: { damage: 3, tick: 0.75, time: 5.25, stacks: 12 }, hidden: false,
        abilities: [beeNadeAb(30, 6)] },
      { name: 'Beehive of Madness', desc: 'Faster shots, more range, stings last 7.5s and 25 stacks. Grenade: 98 damage in a bigger blast.', cost: 5750, damage: 0, cooldown: 1.25, range: 20, bees: { damage: 3, tick: 0.75, time: 7.5, stacks: 25 }, hidden: false,
        abilities: [beeNadeAb(70, 7)] },
      { name: 'Beekeeper of Death', desc: '+1.4 sting damage, stings last 15s and 30 stacks. Grenade: 175 damage in an even bigger blast.', cost: 10000, damage: 0, cooldown: 1.25, range: 20, bees: { damage: 4, tick: 0.75, time: 15, stacks: 30 }, hidden: false,
        abilities: [beeNadeAb(125, 8)] },
    ],
  },
  // Toxic Gunner: bursts of poison bullets (see Saboteur for `poison`; here every bullet poisons).
  // poison.melt: every poison tick melts this much of the zombie's armor (stacking, down to 0).
  // A burst cycle is `cooldown` s: the pause between bursts plus burst * burstGap.
  toxicGunner: {
    name: 'Toxic Gunner',
    event: 'Event reward',
    flying: false,
    lead: true,
    cost: 525,
    limit: 10,
    burstGap: 0.1,
    blurb: 'A cheap rapid-fire tower that shoots bursts of poison bullets. Poisoned zombies take damage every second and walk slower, and from Lv 4 the poison melts their armor. It never sees hidden zombies.',
    tip: 'Pair it with high-damage towers so they get more time to hit. Combine it with other slows to almost stop zombies.',
    levels: [
      { name: 'Toxic Gunner', desc: 'Bursts of 4 poison bullets: poisoned zombies take 1 damage a second for 6s and are 10% slower.', damage: 1, burst: 4, cooldown: 1.6, range: 10, poison: { damage: 1, tick: 1, time: 6, slow: 0.1 }, hidden: false },
      { name: 'Faster Reloading', desc: 'Half the pause between bursts.', cost: 200, damage: 1, burst: 4, cooldown: 1.0, range: 10, poison: { damage: 1, tick: 1, time: 6, slow: 0.1 }, hidden: false },
      { name: 'Poisonous Bullets', desc: 'More range, 8 bullets per burst, poison does 3 damage and slows 20%.', cost: 800, damage: 1, burst: 8, cooldown: 1.4, range: 14, poison: { damage: 3, tick: 1, time: 6, slow: 0.2 }, hidden: false },
      { name: 'Sinister Gear', desc: 'Damage 1 → 4, 20 bullets per burst, flying detection, and poison melts 3% of armor every tick.', cost: 3500, damage: 4, burst: 20, cooldown: 2.6, range: 14, flying: true, poison: { damage: 3, tick: 1, time: 6, slow: 0.2, melt: 0.03 }, hidden: false },
      { name: 'Going Nuclear!', desc: 'Fires nonstop, more range, damage 4 → 8, poison does 10 damage for 10s and slows 30%.', cost: 14000, damage: 8, burst: 20, cooldown: 2, range: 18, flying: true, poison: { damage: 10, tick: 1, time: 10, slow: 0.3, melt: 0.03 }, hidden: false },
    ],
  },
  // Sledger: an ice hammer that hits up to `targets` zombies per swing and chills them (see
  // Freezer; `freezeNext` as on the Frost Blaster). iceBreak: damage multiplier against chilled or
  // frozen zombies. aftershock: { delay, mult }: `delay` s after each swing a shockwave hits the
  // same way for `mult` of its damage (it keeps their chill from wearing off, but adds none).
  sledger: {
    name: 'Sledger',
    event: 'Event reward',
    flying: false,
    lead: true,
    cost: 950,
    limit: 6,
    melee: true,
    freezeNext: true,
    kindLabel: 'Multi',
    blurb: 'A melee tower with a big ice sledgehammer that smashes several zombies at once. Every hit chills (slows) them, and from Lv 4 a fully chilled zombie freezes solid. Its damage falls behind late game, and it can\'t hit hidden zombies.',
    tip: 'Place it near corners next to high-damage towers so its slows give them more time.',
    levels: [
      { name: 'Sledger', desc: 'Swings an ice hammer at up to 4 zombies, chilling them (15% slow per hit, up to 30%).', damage: 10, cooldown: 1.2, range: 7, targets: 4, chill: 0.5, maxSlow: 0.3, chillTime: 4, hidden: false },
      { name: 'Heavier Swings', desc: 'Damage 4 → 5.6.', cost: 400, damage: 14, cooldown: 1.2, range: 7, targets: 4, chill: 0.5, maxSlow: 0.3, chillTime: 4, hidden: false },
      { name: 'Better Sledge', desc: 'Damage 5.6 → 11 and hits 5 zombies.', cost: 1650, damage: 28, cooldown: 1.2, range: 7, targets: 5, chill: 0.5, maxSlow: 0.3, chillTime: 4, hidden: false },
      { name: 'Freezing Point', desc: 'Damage 11 → 22, 35% slow per hit, and a hit on a fully chilled zombie freezes it for 0.85s.', cost: 3200, damage: 55, cooldown: 1.2, range: 7, targets: 5, chill: 1, maxSlow: 0.35, chillTime: 4, chillFreeze: 0.85, hidden: false },
      { name: 'Ice Breaker', desc: 'Damage 22 → 42, more range, slows last 5s, and double damage to chilled and frozen zombies.', cost: 8250, damage: 105, cooldown: 1.2, range: 7.5, targets: 5, chill: 1, maxSlow: 0.35, chillTime: 5, chillFreeze: 0.85, iceBreak: 2, hidden: false },
      { name: 'Arctic Aftershocks', desc: 'Damage 42 → 60, hits 8 zombies, 1.2s freezes, and an Aftershock 0.4s after each swing hits again for 40%.', cost: 16000, damage: 150, cooldown: 1.2, range: 7.5, targets: 8, chill: 1, maxSlow: 0.35, chillTime: 5, chillFreeze: 1.2, iceBreak: 2,
        aftershock: { delay: 0.4, mult: 0.4 }, hidden: false },
    ],
  },
  // Ice Breaker (alternate Sledger form): a melee fighter whose every hit adds freeze (chill, see
  // Cryo Blaster: 0.06 per "freeze amount" point); unlike the Sledger, a zombie freezes as soon as
  // it is fully chilled. burst: hits per attack, `burstGap` s apart. Lv 5 unlocks Ice Shard and
  // Snow Storm (see ICE_SHARD_AB / SNOW_STORM_AB). The spec gives no base freeze amount (3) or
  // thaw time (1s, 1.25s at Lv 5): guesses.
  sledgerIce: {
    name: 'Ice Breaker',
    flying: false,
    lead: true,
    altOf: 'sledger',
    form: 'Breaker',
    shards: 1,
    price: 0,
    cost: 400,
    limit: 6,
    melee: true,
    hitsFrozen: true, // keeps hitting zombies it has frozen (other ice towers skip them)
    burstGap: 0.25,
    kindLabel: 'Freeze',
    blurb: "An alternate Sledger: a cheap melee fighter that freezes zombies with every hit. From Lv 3 one hit is enough to freeze a zombie solid. At Lv 5 she freezes bosses and unlocks Ice Shard (a block of ice that explodes and freezes everything when it breaks) and Snow Storm (a freezing aura). Very short range, and she can't see hidden zombies.",
    tip: 'Place her right by the zombie entrance so she freezes them early and gives your other towers more time.',
    levels: [
      { name: 'Ice Breaker', desc: 'Hits up to 3 zombies with an icy pick, adding freeze to each.', damage: 8, cooldown: 1.75, range: 4.5, targets: 3, hp: 200, hidden: false,
        chill: 0.18, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1 },
      { name: 'Better Grip', desc: 'Hits twice per attack, more freeze and a bit more range.', cost: 450, damage: 8, burst: 2, cooldown: 1.75, range: 5, targets: 3, hp: 235, hidden: false,
        chill: 0.3, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1 },
      { name: 'Speed Reductions', desc: 'Damage 2.6 → 5.9, more freeze and 1 more zombie per hit.', cost: 1350, damage: 18, burst: 2, cooldown: 1.75, range: 5, targets: 4, hp: 285, hidden: false,
        chill: 0.6, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1 },
      { name: 'Crystal Head', desc: 'Damage 5.9 → 13, 1 more zombie and 1 more hit per attack, and every hit freezes a zombie solid.', cost: 2325, damage: 38, burst: 3, cooldown: 1.75, range: 5, targets: 5, hp: 660, hidden: false,
        chill: 1, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1 },
      { name: 'Cryo Fuel', desc: 'Damage 13 → 22.', cost: 6000, damage: 68, burst: 3, cooldown: 1.75, range: 5, targets: 5, hp: 1310, hidden: false,
        chill: 1, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1 },
      { name: 'X-Cryosuit', desc: "Damage 22 → 40, faster swings, 1 more hit, longer freezes, a bit more range. Freezes bosses (for half the time), can't be stunned, and unlocks Ice Shard and Snow Storm.", cost: 33000,
        damage: 120, burst: 4, cooldown: 1.25, range: 6, targets: 5, hp: 2910, hidden: false, stunImmune: true,
        chill: 1, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1.25, freezeBoss: 0.5, abilities: [ICE_SHARD_AB, SNOW_STORM_AB] },
    ],
  },
  // Cryo Helicopter: flies like the Helicopter (see pursuitHeli: patrol, heli). beam: its ice
  // beam hits up to `beam` zombies every `cooldown` s, adding chill (0.06 per "freeze amount"
  // point) and freezing them at full chill; it prefers zombies that aren't frozen yet.
  // missiles: Cryo Missiles (see cryoMissile). deathBlast: when it's knocked out it stuns towers
  // within `radius` for `stun` s, does `damage` to zombies there and `towerDamage` to towers.
  // The spec gives no death-blast numbers, thaw time (1s) or limit (4): guesses.
  // ignoreIceResist (Lv 5): its chill, freezes and frost damage ignore ice resistance.
  cryoHeli: {
    name: 'Cryo Helicopter',
    event: 'Event reward',
    flying: false,
    lead: true,
    cost: 2125,
    limit: 4,
    noBuff: true,
    heli: { speed: 12, height: 13 },
    kindLabel: 'Freeze',
    blurb: "A flying helicopter whose ice beam freezes up to 2 zombies at a time. Send it anywhere on the map with Set Location, or have it follow you with Follow Player. Sees hidden and flying zombies from Lv 1, fires freezing Cryo Missiles from Lv 3 and freezes bosses at Lv 5. Low damage for its price, and support towers can't boost it. If it's knocked out, it explodes and briefly freezes your towers nearby.",
    tip: "Use it to freeze dangerous zombies and bosses wherever they are, not as your main damage. Keep it away from your other towers if it might get knocked out.",
    levels: [
      { name: 'Cryo Helicopter', desc: 'An ice beam that freezes up to 2 zombies. Move it anywhere, or have it follow you.', damage: 4, beam: 2, cooldown: 0.2, range: 11, patrol: 5, hp: 850, hidden: false,
        chill: 0.09, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, deathBlast: { radius: 8, stun: 1, damage: 50, towerDamage: 25 }, abilities: [CRYO_MOVE, CRYO_FOLLOW] },
      { name: 'Bigger Beam', desc: 'Hidden and flying detection, damage 4 → 6 and a stronger freeze.', cost: 2500, damage: 6, beam: 2, cooldown: 0.2, range: 11, patrol: 5, hp: 950, hidden: true, flying: true,
        chill: 0.21, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, deathBlast: { radius: 8, stun: 1, damage: 100, towerDamage: 50 }, abilities: [CRYO_MOVE, CRYO_FOLLOW] },
      { name: 'Speed Reduction', desc: 'A much stronger freeze and damage 6 → 10.', cost: 7500, damage: 10, beam: 2, cooldown: 0.2, range: 11, patrol: 5, hp: 1050, hidden: true, flying: true,
        chill: 0.69, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, deathBlast: { radius: 8, stun: 1, damage: 200, towerDamage: 75 }, abilities: [CRYO_MOVE, CRYO_FOLLOW] },
      { name: 'Ice Missiles', desc: 'Every beam hit now freezes, damage 10 → 16, much more range, and Cryo Missiles: 100 damage to up to 3 zombies in a blast every 2s, chilling them.', cost: 17250,
        damage: 16, beam: 2, cooldown: 0.2, range: 23, patrol: 5, hp: 1650, hidden: true, flying: true,
        chill: 1, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, missiles: [cryoMissile(100, 2, 0.3)], deathBlast: { radius: 8, stun: 1, damage: 400, towerDamage: 100 }, abilities: [CRYO_MOVE, CRYO_FOLLOW] },
      { name: 'Cryo Munitions', desc: 'The beam hits 3 zombies, damage 16 → 30, flies faster, and Cryo Missiles do 200 damage every 1.5s.', cost: 46800,
        damage: 30, beam: 3, cooldown: 0.2, range: 23, patrol: 5, heliSpeed: 15, hp: 3650, hidden: true, flying: true,
        chill: 1, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1, missiles: [cryoMissile(200, 1.5, 0.5)], deathBlast: { radius: 8, stun: 1, damage: 800, towerDamage: 150 }, abilities: [CRYO_MOVE, CRYO_FOLLOW] },
      { name: 'Mi-Ice Hind', desc: 'Freezes bosses (for half the time), damage 30 → 50, a small splash on the beam, longer freezes, and Cryo Missiles do 400 damage every 0.9s. Ignores ice resistance.', cost: 175000,
        damage: 50, beam: 3, spray: 0.5, cooldown: 0.2, range: 23, patrol: 5, heliSpeed: 15, hp: 6900, hidden: true, flying: true, ignoreIceResist: true,
        chill: 1, chillTime: 3, maxSlow: 0.3, chillDps: 0, chillFreeze: 1.5, freezeBoss: 0.5, missiles: [cryoMissile(400, 0.9, 0.75)], deathBlast: { radius: 8, stun: 1, damage: 1600, towerDamage: 200 }, abilities: [CRYO_MOVE, CRYO_FOLLOW] },
    ],
  },
  // Executioner: throws a bouncing axe. axe: { targets, bounces, ramp, jump }: it hits its target,
  // then bounces `bounces` times to the closest zombie within `jump` (never the one it just hit;
  // zombies it hasn't hit yet first, at most `targets` different ones). Every bounce does `ramp`
  // more damage than the one before.
  executioner: {
    name: 'Executioner',
    event: 'Event reward',
    lead: false,
    cost: 1800,
    limit: 9,
    kindLabel: 'Bounce',
    blurb: 'Throws an axe that bounces between zombies, hitting harder with every bounce. Great at wiping out groups, very weak against a single zombie. It can\'t hurt lead zombies, sees flying zombies from the start and gets hidden detection at Lv 4.',
    tip: 'It needs at least two zombies close together. Slowing towers keep more zombies near each other.',
    levels: [
      { name: 'Executioner', desc: 'A bouncing axe that hits up to 3 zombies, harder with each bounce.', damage: 7, cooldown: 1, range: 15, axe: { targets: 3, bounces: 2, ramp: 1, jump: 8 }, hidden: false },
      { name: 'Quick Chopping', desc: 'Throws faster and more range.', cost: 450, damage: 7, cooldown: 0.75, range: 17, axe: { targets: 3, bounces: 2, ramp: 1, jump: 8 }, hidden: false },
      { name: 'Double-Headed Axe', desc: 'Damage 2.8 → 5.6, hits 1 more zombie and bounces once more.', cost: 1777, damage: 14, cooldown: 0.75, range: 17, axe: { targets: 4, bounces: 3, ramp: 1, jump: 8 }, hidden: false },
      { name: 'Cloaked Revenant', desc: 'Hidden detection, damage 5.6 → 8, bounces once more and +2.4 damage per bounce.', cost: 3750, damage: 20, cooldown: 0.75, range: 17, axe: { targets: 4, bounces: 4, ramp: 7, jump: 8 }, hidden: true },
      { name: "Ghoul Shreddin'", desc: 'Damage 8 → 16, hits 2 more zombies, bounces 2 more times and +0.4 damage per bounce.', cost: 6750, damage: 40, cooldown: 0.75, range: 17, axe: { targets: 6, bounces: 6, ramp: 8, jump: 8 }, hidden: true },
      { name: 'The Judge & The Jury', desc: 'Throws every 0.5s, more range, damage 16 → 20, 1 more target, 3 more bounces and +0.8 damage per bounce.', cost: 13500, damage: 50, cooldown: 0.5, range: 19, axe: { targets: 7, bounces: 9, ramp: 10, jump: 8 }, hidden: true },
    ],
  },
};
