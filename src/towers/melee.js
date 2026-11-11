// Towers: slows, blades and melee. Boomerang, Slime, Assassin, Brawler, Crook Boss, Mobster,
// Ghost, Toxicnator.
// One group of the TOWERS table. config.js joins the groups in order (see TOWERS there).
// Shared units and abilities (MERC, AP_AB, ...) come from shared.js.
import {
  AGENT, AGENT_2, AGENT_3, AP_AB, DON_GOON, MOB_GOON, MOB_GOON_2, MOB_GOON_3, PISTOL_GOON, TOMMY_GOON, bountyAbility,
  repositionAbility,
} from './shared.js';

export const TOWERS_MELEE = {

  // ---------------------------------------------------------------- slows, blades & melee
  // slime: { slow, time } Slime Trooper. Hit zombies lose `slow` of their speed for `time`
  //        seconds. Bosses ignore it, and slimes don't stack with each other.
  // pierce / speed / rangs: Boomerang. Throws `rangs` boomerangs that loop out to the target and
  //        back at `speed`, each hitting up to `pierce` zombies once. It waits until they're back.
  // whirl: { every, damage } Assassin. Every `every`th slash hits every zombie in range instead.
  // fan:   { every, damage, pierce, reach, speed } after every `every` damage dealt, throws
  //        three knives that fly `reach` and each pierce up to `pierce` zombies.

  boomerang: {
    name: 'Boomerang',
    lead: 4,
    price: 600,
    cost: 550,
    limit: 12,
    blurb: 'Throws a boomerang that loops out, slices through several zombies, and comes back. It can\'t throw again until the boomerang returns. Never sees hidden zombies.',
    tip: 'Place it where its loop covers as much path as possible. Each throw only hits a set number of zombies, even if it passes more.',
    levels: [
      { name: 'Boomerang', desc: 'A boomerang that hits up to 3 zombies per throw.', damage: 7, cooldown: 2.6, range: 14, pierce: 3, speed: 22, hidden: false },
      { name: 'Steel Fang', desc: 'More damage and a bit more range.', cost: 400, damage: 12, cooldown: 2.6, range: 15, pierce: 3, speed: 22, hidden: false },
      { name: 'Firmer Grip', desc: 'Throws faster, the boomerang flies faster, and it hits one more zombie.', cost: 750, damage: 12, cooldown: 1.6, range: 15, pierce: 4, speed: 28, hidden: false },
      { name: 'Twin Strike', desc: 'Throws a second boomerang at once, with more damage and range.', cost: 2500, damage: 16, cooldown: 1.6, range: 16, pierce: 4, speed: 28, rangs: 2, hidden: false },
      { name: 'Boomerang Master', desc: 'A huge damage boost, throws faster, faster boomerangs, and one more zombie hit.', cost: 7000, damage: 40, cooldown: 1.4, range: 16, pierce: 5, speed: 34, rangs: 2, hidden: false },
    ],
  },
  slime: {
    name: 'Slime Trooper',
    fly: 30, // globs of slime fly to the zombie
    lead: 4,
    price: 500,
    cost: 500,
    limit: 8,
    blurb: 'Shoots sticky globs of slime that slow zombies down, so your damage towers get more time. At Lv 5 the slime explodes and splashes groups. Bosses ignore the slow.',
    tip: 'Pair it with big damage towers like the Marksman, Rocketeer or Railgunner. Its slow stacks with fire and the Freezer.',
    levels: [
      { name: 'Slime Trooper', desc: 'Sticky slime that slows a zombie by 15% for 3s.', damage: 10, cooldown: 3, range: 11.5, slime: { slow: 0.15, time: 3 }, hidden: false },
      { name: 'Stickier Slime', desc: 'Shoots faster, more range and a stronger slow.', cost: 250, damage: 10, cooldown: 2.25, range: 13, slime: { slow: 0.175, time: 3 }, hidden: false },
      { name: 'Heavy Globs', desc: 'More damage and range, and it can now see hidden zombies.', cost: 650, damage: 20, cooldown: 2.25, range: 15.5, slime: { slow: 0.175, time: 3 }, hidden: true },
      { name: 'Potent Goo', desc: 'A big damage boost, more range, and a stronger slow that lasts longer.', cost: 2100, damage: 46, cooldown: 2.25, range: 17, slime: { slow: 0.2, time: 5 }, hidden: true },
      { name: 'Explosive Goo', desc: 'The slime explodes, hurting and slowing every zombie in the splash. More damage, faster shots and a stronger slow.', cost: 4650, damage: 64, cooldown: 1.8, range: 17, radius: 3.5, slime: { slow: 0.225, time: 5 }, hidden: true },
    ],
  },
  assassin: {
    name: 'Assassin',
    lead: 3,
    flying: false,
    price: 750,
    cost: 300,
    limit: 10,
    melee: true,
    blurb: 'Slashes zombies with a knife at very short range. From Lv 3 every third slash is a Whirlwind Slash that hits everything around it, and at Lv 5 it throws fans of knives.',
    tip: 'Place two cheap Assassins and get them to Lv 3 early. Put them at tight bends or spots the path passes more than once.',
    levels: [
      { name: 'Assassin', desc: 'Slashes the closest zombie with a knife.', damage: 3, cooldown: 0.6, range: 6, hidden: false },
      { name: 'CQC Training', desc: 'More damage and slashes faster.', cost: 450, damage: 6, cooldown: 0.5, range: 6, hidden: false },
      { name: 'Shadow Whirl', desc: 'More damage, hidden detection, and every third slash is a Whirlwind Slash that hits all zombies in range.', cost: 625, damage: 9, cooldown: 0.5, range: 6, hidden: true,
        whirl: { every: 3, damage: 9 } },
      { name: 'Shadow Master', desc: 'More damage and whirlwind damage, and slashes faster.', cost: 2000, damage: 16, cooldown: 0.35, range: 6, hidden: true,
        whirl: { every: 3, damage: 24 } },
      { name: 'Blade Storm', desc: 'A big damage boost, a little more range, and Fan of Knives: after every 500 damage it throws three knives that each pierce 3 zombies.', cost: 6800, damage: 35, cooldown: 0.35, range: 6.5, hidden: true,
        whirl: { every: 3, damage: 45 }, fan: { every: 500, damage: 35, pierce: 3, reach: 22, speed: 40 } },
    ],
  },

  // Brawler: a melee boxer with mechanical fists. combo: { hits, damage, knock, cooldown }: every
  // `hits`th punch is a finisher that does `damage` instead and knocks the zombie back `knock`
  // force (KNOCK_STUDS studs per point, bosses a quarter as far); the next combo starts `cooldown`
  // s later (instead of the normal swing time). Reposition: it leaps to a spot within `reach`,
  // hitting every zombie within `radius` of where it lands for `damage` and knocking them back.
  brawler: {
    name: 'Brawler',
    altOf: 'slugger',
    form: 'Brawler',
    lead: true,
    flying: false,
    price: 0,
    shards: 2,
    cost: 300,
    limit: 10,
    melee: true,
    stunImmune: true,
    blurb: 'A cheap melee tower that punches zombies with mechanical fists. From Lv 3 it throws three-punch combos, and the last punch hits harder and knocks the zombie back. It can\'t be stunned and hits lead zombies.',
    tip: 'A few Lv 1 Brawlers can clear weak early hordes. It can\'t be stunned, so it\'s great against zombies that stun towers. Careful: Reposition can move it away from your buff towers.',
    levels: [
      { name: 'Brawler', desc: 'Punches the closest zombie with mechanical fists.', damage: 5, cooldown: 1, range: 6, stunImmune: true, hidden: false },
      { name: 'Hand to Hand Training', desc: 'Punches much faster with a little more reach.', cost: 200, damage: 5, cooldown: 0.6, range: 6.5, stunImmune: true, hidden: false },
      { name: 'Enhanced Gauntlets', desc: 'Much more damage, and a 3-hit combo: the third punch does 11 damage and knocks the zombie back.', cost: 1200, damage: 14, cooldown: 0.6, range: 6.5, stunImmune: true, hidden: false,
        combo: { hits: 3, damage: 21, knock: 17.5, cooldown: 0.6 } },
      { name: 'Pack a Punch', desc: 'More damage, faster punches, a much harder finisher with more knockback, and hidden detection.', cost: 2500, damage: 24, cooldown: 0.5, range: 6.5, stunImmune: true, hidden: true,
        combo: { hits: 3, damage: 48, knock: 24, cooldown: 0.5 } },
      { name: 'GALVAKNUCKLES', desc: 'More damage, reach and knockback, and unlocks Reposition: leap to a spot nearby, smashing and knocking back the zombies it lands on.', cost: 3500, damage: 35, cooldown: 0.5, range: 7, stunImmune: true, hidden: true,
        combo: { hits: 3, damage: 70, knock: 28, cooldown: 0.5 }, abilities: [repositionAbility(50, 7.5)] },
      { name: "Boreas' Fury", desc: 'A big damage boost, more reach, faster punches and combos, more knockback, and a stronger, longer Reposition leap.', cost: 7777, damage: 50, cooldown: 0.4, range: 8, stunImmune: true, hidden: true,
        combo: { hits: 3, damage: 100, knock: 32, cooldown: 0.4 }, abilities: [repositionAbility(100, 10)] },
    ],
  },

  // goons: { every, units }: every `every` seconds of wave time it calls in one of each unit
  // def in `units` (same rules as spawner units). Each call stops it shooting for `callPause`.
  crookBoss: {
    name: 'Crook Boss',
    lead: true,
    price: 3500,
    cost: 2250,
    limit: 5,
    callPause: 1.5,
    blurb: 'A gangster boss who shoots zombies and calls in goons to fight with him. Goons shoot and crash into zombies until they are destroyed. He stops shooting for a moment every time he calls them.',
    tip: "Expensive with short range early, so it's best mid-to-late game. At Lv 5 it's a solid backup damage tower, and its goons help cover hidden and flying zombies.",
    levels: [
      { name: 'Crook Boss', desc: 'Shoots zombies (lead ones too) and calls in a Pistol Goon that can hit flying zombies.', damage: 12, cooldown: 0.9, range: 16.5, hidden: false, flying: false,
        goons: { every: 15, units: [PISTOL_GOON] } },
      { name: 'Quick Getaway', desc: 'More damage, shoots faster, and can now hit flying zombies.', cost: 1500, damage: 16, cooldown: 0.6, range: 16.5, hidden: false,
        goons: { every: 15, units: [PISTOL_GOON] } },
      { name: 'Double Trouble', desc: 'More range and damage, hidden detection, and calls Pistol Goons two at a time.', cost: 2750, damage: 23, cooldown: 0.6, range: 19, hidden: true,
        goons: { every: 15, units: [PISTOL_GOON, PISTOL_GOON] } },
      { name: 'Tommy Goons', desc: 'Shoots much faster with more range, and also calls in a Tommy Goon with a tommy gun that can see hidden zombies.', cost: 14000, damage: 23, cooldown: 0.2, range: 22, hidden: true,
        goons: { every: 15, units: [PISTOL_GOON, PISTOL_GOON, TOMMY_GOON] } },
      { name: 'The Godfather', desc: 'More damage, shoots even faster, and his Tommy Goons get tougher and stronger.', cost: 47500, damage: 38, cooldown: 0.12, range: 22, hidden: true,
        goons: { every: 15, units: [PISTOL_GOON, PISTOL_GOON, DON_GOON] } },
    ],
  },

  // Mobster (alternate Crook Boss form, two paths right away). Shoots and calls in helpers with
  // `goons` (see Crook Boss). cashback: when a tower within its range is knocked out, the Mobster's
  // owner gets that much of the tower's total cost back (the best nearby Mobster pays).
  // Abilities: AP Rounds (self boost) and Place Bounty (see bountyAbility).
  // ignoreBulletResist (Mafia Boss, Agent 3s, AP Rounds): gets through bullet resistance (Expert mode).
  mobster: {
    name: 'Mobster',
    altOf: 'crookBoss',
    form: 'Mobster',
    shards: 1,
    price: 0,
    cost: 400,
    limit: 4,
    callPause: 1,
    branch: 'mobsterBottom',
    branchAt: 1,
    path: 'Top',
    blurb: 'An alternate Crook Boss with two upgrade paths right away. A cheap gangster who shoots zombies and calls in helpers. Top path: more damage and crowds of Goons, then AP Rounds. Bottom path: money. Cheap hidden detection, Agents, Place Bounty for cash from tough zombies, and cash back when towers near it are knocked out.',
    tip: 'Good cheap early defense, and Bottom Lv 2 is a very cheap way to see hidden zombies. Its placement limit is low, so it can\'t be your main late-game damage. Put Bottom path Mobsters next to your expensive towers to get cash back if they go down.',
    levels: [
      { name: 'Mobster', desc: 'A cheap gangster with a pistol.', damage: 4, cooldown: 0.9, range: 9.5, hp: 100, hidden: false },
      { name: '+P Ammo', path: 'Top', desc: 'Top path: more damage, range and health.', cost: 200, damage: 6, cooldown: 0.9, range: 10.5, hp: 125, hidden: false },
      { name: 'The Mob', path: 'Top', desc: 'Calls in a Goon every 55s. More damage and health.', cost: 1000, damage: 8, cooldown: 0.9, range: 10.5, hp: 175, hidden: false,
        goons: { every: 55, units: [MOB_GOON] } },
      { name: 'Mac 10', path: 'Top', desc: 'Shoots much faster (but a bit weaker) and calls Goons two at a time. Lots more health.', cost: 4000, damage: 6, cooldown: 0.4, range: 10.5, hp: 375, hidden: false,
        goons: { every: 55, units: [MOB_GOON, MOB_GOON] } },
      { name: 'Upgraded Henchmen', path: 'Top', desc: 'Calls 2 tougher Goon 2s every 48s and unlocks AP Rounds: 50% more damage for 10s. More damage, range and health.', cost: 7000, damage: 11, cooldown: 0.4, range: 11.5, hp: 825, hidden: false,
        goons: { every: 48, units: [MOB_GOON_2, MOB_GOON_2] }, abilities: [AP_AB] },
      { name: 'Mafia Army', path: 'Top', desc: 'Calls 3 strong Goon 3s every 43s. A huge damage boost and lots more range and health.', cost: 18680, damage: 37, cooldown: 0.4, range: 15.5, hp: 1625, hidden: false,
        goons: { every: 43, units: [MOB_GOON_3, MOB_GOON_3, MOB_GOON_3] }, abilities: [AP_AB] },
    ],
  },
  // The Mobster's Bottom path (not in the shop: a Mobster becomes this when you pick it).
  mobsterBottom: {
    name: 'Mobster',
    branchOf: 'mobster',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 400,
    limit: 4,
    callPause: 1,
    blurb: "The Mobster's Bottom path: cheap hidden detection, then Agents, Place Bounty for extra cash from tough zombies, and cash back when towers near it are knocked out.",
    tip: 'Place Bounty on the toughest zombie of the wave (bosses pay the most). Keep it close to your priciest towers for the cash back.',
    levels: [
      { name: 'Mobster', desc: 'A cheap gangster with a pistol.', damage: 4, cooldown: 0.9, range: 9.5, hp: 100, hidden: false },
      { name: 'Extended Barrel', path: 'Bottom', desc: 'Bottom path: more range.', cost: 150, damage: 4, cooldown: 0.9, range: 12.5, hp: 125, hidden: false },
      { name: 'Advanced Visors', path: 'Bottom', desc: 'Sees hidden zombies and shoots faster.', cost: 225, damage: 4, cooldown: 0.65, range: 12.5, hp: 150, hidden: true },
      { name: 'Bounty Hunter', path: 'Bottom', desc: 'Calls in an Agent every 62s, unlocks Place Bounty (15% up to $5,750), and gives 5% cash back when nearby towers are knocked out. Much more damage and range, shoots a bit slower.', cost: 5000, damage: 26, cooldown: 0.85, range: 17.5, hp: 300, hidden: true, cashback: 0.05,
        goons: { every: 62, units: [AGENT] }, abilities: [bountyAbility(0.15, 5750)] },
      { name: 'Life Insurance', path: 'Bottom', desc: 'Agent 2s replace Agents, bounties pay 25% (up to $8,000) and cash back rises to 10%. More damage, range and health.', cost: 8500, damage: 58, cooldown: 0.85, range: 19.5, hp: 1000, hidden: true, cashback: 0.1,
        goons: { every: 62, units: [AGENT_2] }, abilities: [bountyAbility(0.25, 8000)] },
      { name: 'Mafia Boss', path: 'Bottom', desc: 'Agent 3s replace Agent 2s, bounties pay 30% (up to $23,000), cash back rises to 20%, and it ignores bullet resistance (hits lead zombies). A huge damage boost, shoots a bit slower.', cost: 45000, damage: 178, cooldown: 0.95, range: 22.5, hp: 2300, hidden: true, cashback: 0.2, lead: true, ignoreBulletResist: true,
        goons: { every: 62, units: [AGENT_3] }, abilities: [bountyAbility(0.3, 23000)] },
    ],
  },

  // Ghost: a fast-shooting fighter with two paths right away (see Pursuit). Hits flying zombies.
  // C7 Drone (ability `drone`, timed): for `duration` s a drone flies over her that reveals hidden
  //   zombies within `range` (every tower can hit them) and shoots them for `damage` every `every`
  //   s (any zombie in range if no hidden one is).
  // stealth / restealth: see GAME.stealthTime. restealth is how long she stays revealed once her stealth runs out.
  // Ghost Grenade (ability `ghostGrenade`): every tower within `radius` (hers or a teammate's,
  //   her too) turns stealthy for `duration` s.
  // hp: tower health (see GAME.towerHp).
  ghost: {
    name: 'Ghost',
    price: 5000,
    cost: 750,
    limit: 8,
    branch: 'ghostBottom',
    branchAt: 1,
    path: 'Top',
    blurb: 'A cheap, fast-shooting fighter with two upgrade paths right away. Strong early damage that can be your main DPS, and hits flying zombies. Top path: hidden detection at Lv 1, much faster shooting, then the C7 Drone that hunts hidden zombies. Bottom path: big damage and range boosts. Low health.',
    tip: 'Go Bottom first: its early upgrades are the best value. Top Lv 1 is a cheap way to see hidden zombies.',
    levels: [
      { name: 'Ghost', desc: 'Shoots one zombie at a time, very fast.', damage: 2, cooldown: 0.3, range: 10, hp: 135, hidden: false },
      { name: 'Eye Sensor', path: 'Top', desc: 'Top path: sees hidden zombies and gets more range.', cost: 550, damage: 2, cooldown: 0.3, range: 13.5, hp: 160, hidden: true },
      { name: 'Faster Firing', path: 'Top', desc: 'Shoots faster.', cost: 900, damage: 2, cooldown: 0.2, range: 13.5, hp: 215, hidden: true },
      { name: 'Stealth Assault', path: 'Top', desc: 'Shoots twice as fast with more range, and turns stealthy so enemies can\'t target her.', cost: 3750, damage: 2, cooldown: 0.1, range: 17.5, hp: 340, hidden: true,
        stealth: true, restealth: 3.5 },
      { name: 'C7 Drone', path: 'Top', desc: 'More damage, shoots faster, lots more health, and the C7 Drone: a drone that reveals hidden zombies and shoots them.', cost: 12750, damage: 5, cooldown: 0.08, range: 17.5, hp: 940, lead: true, hidden: true,
        stealth: true, restealth: 2.5,
        abilities: [{ key: 'drone', name: 'C7 Drone', desc: 'For 15s a drone reveals hidden zombies within 20 and shoots them (10 damage, 4 shots a second)', cooldown: 45, duration: 15, range: 20, damage: 10, every: 0.25 }] },
      { name: 'X-Ghost', path: 'Top', desc: 'A huge damage boost, more range and health, and a stronger C7 Drone II.', cost: 28000, damage: 15.5, cooldown: 0.07, range: 19.5, hp: 1840, lead: true, hidden: true,
        stealth: true, restealth: 1.5,
        abilities: [{ key: 'drone', name: 'C7 Drone II', desc: 'For 20s a drone reveals hidden zombies within 25 and shoots them (30 damage, 5 shots a second)', cooldown: 45, duration: 20, range: 25, damage: 30, every: 0.2 }] },
    ],
  },
  // The Ghost's Bottom path (not in the shop: a Ghost becomes this when you pick it). It never
  // sees hidden zombies.
  ghostBottom: {
    name: 'Ghost',
    branchOf: 'ghost',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 750,
    limit: 8,
    blurb: "The Ghost's Bottom path: much more damage and range, then the Honey Badger with stealth, and the Ghost Grenade.",
    tip: "It never sees hidden zombies: pair it with a tower that does, or a Tactical Sniper's Flare Gun.",
    levels: [
      { name: 'Ghost', desc: 'Shoots one zombie at a time, very fast.', damage: 2, cooldown: 0.3, range: 10, hp: 135, hidden: false },
      { name: '+P Ammo', path: 'Bottom', desc: 'Bottom path: double damage.', cost: 450, damage: 4, cooldown: 0.3, range: 10, hp: 160, hidden: false },
      { name: 'Extended Barrel', path: 'Bottom', desc: 'More damage and range, and it can now hurt lead zombies.', cost: 950, damage: 7, cooldown: 0.3, range: 12, hp: 195, lead: true, hidden: false },
      { name: 'Honey Badger', path: 'Bottom', desc: 'A big damage boost, almost double the range, more health, and stealth so enemies can\'t target her.', cost: 8000, damage: 17, cooldown: 0.3, range: 23, hp: 495, lead: true, hidden: false,
        stealth: true, restealth: 45 },
      { name: 'Stealth Grenade', path: 'Bottom', desc: 'More than double the damage, lots more health, and the Ghost Grenade that makes nearby towers stealthy.', cost: 21000, damage: 39, cooldown: 0.3, range: 24, hp: 1195, lead: true, hidden: false,
        stealth: true, restealth: 40,
        abilities: [{ key: 'ghostGrenade', name: 'Ghost Grenade', desc: 'Towers within 15 turn stealthy for 10s, so bosses can\'t target them', cooldown: 40, radius: 15, duration: 10 }] },
      { name: "World's Deadliest", path: 'Bottom', desc: 'A huge damage boost, shoots faster, more range, and a stronger Ghost Grenade II.', cost: 40000, damage: 76, cooldown: 0.25, range: 27, hp: 2195, lead: true, hidden: false,
        stealth: true, restealth: 35,
        abilities: [{ key: 'ghostGrenade', name: 'Ghost Grenade II', desc: 'Towers within 20 turn stealthy for 15s, so bosses can\'t target them', cooldown: 40, radius: 20, duration: 15 }] },
    ],
  },

  // Toxicnator: lobs toxic grenades that leave a gas cloud of `radius` (two paths right away).
  // gas: { dps, time, cloud, targets }: the cloud lasts `cloud` s. Zombies in it (up to `targets`
  //   different ones per cloud) are gassed: `dps` damage a second for `time` s, refreshed while
  //   they stay inside. Gas from different clouds stacks (unlike fire).
  // Toxic Blast (ability `toxicBlast`): throw it where you click: zombies within `radius` take
  //   `vuln` more damage from everything for `vulnTime` s (bosses `bossVuln`, if set). The game
  //   has no resistances yet, so this extra damage stands in for its resistance cut.
  // hp: tower health (see GAME.towerHp).
  toxicnator: {
    name: 'Toxicnator',
    lead: true,
    price: 6500,
    cost: 925,
    limit: 8,
    lob: 0.8,
    branch: 'toxicnatorBottom',
    branchAt: 1,
    path: 'Top',
    blurb: 'Lobs toxic grenades that leave gas clouds, which hurt zombies over time. Clouds stack. Two upgrade paths right away. Top path: wears down huge crowds, with gas that clings to up to 99 zombies at Lv 5. Bottom path: much stronger gas and Toxic Blast, which makes zombies take extra damage from all your towers. Low single-target damage against tanky zombies and bosses.',
    tip: 'Put it on a long stretch of path or near a bend. Use Toxic Blast on bosses.',
    levels: [
      { name: 'Toxicnator', desc: 'Lobs toxic grenades that leave a gas cloud.', damage: 0, cooldown: 6, range: 10, radius: 3, hp: 200, hidden: false,
        gas: { dps: 3, time: 3, cloud: 4, targets: 7 } },
      { name: 'Toxic Research', path: 'Top', desc: 'Top path: stronger gas.', cost: 375, damage: 0, cooldown: 6, range: 10, radius: 3, hp: 220, hidden: false,
        gas: { dps: 4.5, time: 3, cloud: 4, targets: 7 } },
      { name: 'Advanced Nades', path: 'Top', desc: 'More range.', cost: 250, damage: 0, cooldown: 6, range: 13, radius: 3, hp: 245, hidden: false,
        gas: { dps: 4.5, time: 3, cloud: 4, targets: 7 } },
      { name: 'MGL', path: 'Top', desc: 'Stronger gas, bigger clouds that last longer and hit 3 more zombies, and it throws faster.', cost: 1650, damage: 0, cooldown: 5.5, range: 13, radius: 4.5, hp: 295, hidden: false,
        gas: { dps: 6.5, time: 3, cloud: 6, targets: 10 } },
      { name: 'Speed Loader', path: 'Top', desc: 'Sees hidden zombies, throws faster, stronger gas, and clouds hit 2 more zombies.', cost: 2500, damage: 0, cooldown: 4.5, range: 13, radius: 4.5, hp: 545, hidden: true,
        gas: { dps: 7.5, time: 3, cloud: 6, targets: 12 } },
      { name: 'Toxic Fumes', path: 'Top', desc: 'Much stronger gas that clings to zombies for 21s, and each cloud gasses up to 99 zombies.', cost: 30000, damage: 0, cooldown: 4.5, range: 13, radius: 4.5, hp: 1370, hidden: true,
        gas: { dps: 16.5, time: 21, cloud: 6, targets: 99 } },
    ],
  },
  // The Toxicnator's Bottom path (not in the shop: a Toxicnator becomes this when you pick it).
  toxicnatorBottom: {
    name: 'Toxicnator',
    lead: true,
    branchOf: 'toxicnator',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 925,
    limit: 8,
    lob: 0.8,
    blurb: "The Toxicnator's Bottom path: more range, then much stronger gas in short-lived clouds, and Toxic Blast, which makes zombies take extra damage from all your towers.",
    tip: "Use Toxic Blast on bosses. It can't see hidden zombies until Lv 5.",
    levels: [
      { name: 'Toxicnator', desc: 'Lobs toxic grenades that leave a gas cloud.', damage: 0, cooldown: 6, range: 10, radius: 3, hp: 200, hidden: false,
        gas: { dps: 3, time: 3, cloud: 4, targets: 7 } },
      { name: 'Toxic Safety', path: 'Bottom', desc: 'Bottom path: more range.', cost: 150, damage: 0, cooldown: 6, range: 12, radius: 3, hp: 215, hidden: false,
        gas: { dps: 3, time: 3, cloud: 4, targets: 7 } },
      { name: 'Higher Dose', path: 'Bottom', desc: 'Stronger gas and it throws faster.', cost: 425, damage: 0, cooldown: 5, range: 12, radius: 3, hp: 250, hidden: false,
        gas: { dps: 5, time: 3, cloud: 4, targets: 7 } },
      { name: 'Anthrax', path: 'Bottom', desc: 'Much stronger gas that clings 1s longer, and Toxic Blast. Clouds are short-lived and hit 4 fewer zombies.', cost: 4250, damage: 0, cooldown: 5, range: 13, radius: 3, hp: 500, hidden: false,
        gas: { dps: 25.5, time: 4, cloud: 1.1, targets: 3 },
        abilities: [{ key: 'toxicBlast', name: 'Toxic Blast', desc: 'Throw it where you click: zombies in the blast take 5% more damage from everything for 4s', cooldown: 20, aim: true, radius: 6, vuln: 0.05, vulnTime: 4 }] },
      { name: 'Acid Meltdown', path: 'Bottom', desc: 'A huge gas boost, more range, and Toxic Blast II.', cost: 14000, damage: 0, cooldown: 5, range: 15, radius: 3, hp: 1025, hidden: false,
        gas: { dps: 98.5, time: 4, cloud: 1.1, targets: 3 },
        abilities: [{ key: 'toxicBlast', name: 'Toxic Blast II', desc: 'Throw it where you click: zombies in the blast take 10% more damage from everything for 5s', cooldown: 20, aim: true, radius: 6, vuln: 0.1, vulnTime: 5 }] },
      { name: 'Gamma Toxins', path: 'Bottom', desc: 'An enormous gas boost, sees hidden zombies, throws faster, more range, and Toxic Blast III.', cost: 30000, damage: 0, cooldown: 4.5, range: 16, radius: 3, hp: 2275, hidden: true,
        gas: { dps: 273.5, time: 4, cloud: 1.1, targets: 3 },
        abilities: [{ key: 'toxicBlast', name: 'Toxic Blast III', desc: 'Throw it where you click: zombies in the blast take 20% more damage from everything for 6s (bosses 10%)', cooldown: 20, aim: true, radius: 6, vuln: 0.2, vulnTime: 6, bossVuln: 0.1 }] },
    ],
  },
  // Saboteur (alternate Toxicnator form): a shotgun of poison pellets (see Pump Shotgunner for
  //   pellets / cone). scatter: how many zombies along each pellet's line it hits (full damage).
  // poison: { damage, tick, time, slow }: every zombie hit is poisoned for `time` s: `damage`
  //   every `tick` s and `slow` (fraction of speed lost). Poison doesn't stack: the strongest
  //   one wins and every hit refreshes it.
  // Aggressive Toxins (ability `neuralyze`, costs cash each use): a grenade thrown where you
  //   click. Zombies within `radius` are Neuralyzed for `vulnTime` s: they take `vuln` more
  //   damage from everything and every tower targets them first.
  toxicnatorSaboteur: {
    name: 'Saboteur',
    lead: true,
    altOf: 'toxicnator',
    form: 'Saboteur',
    shards: 1,
    price: 0,
    cost: 775,
    limit: 8,
    blurb: 'An alternate Toxicnator that fires a spread of poison pellets like a shotgun. Every zombie hit is poisoned: it takes damage over time and is slowed. From Lv 3 each pellet hits more than one zombie (Scattershot), and at Lv 4 Aggressive Toxins makes zombies take extra damage and pulls every tower\'s fire onto them. Sees hidden zombies from Lv 2. Its pellets spread out, so they don\'t always hit the same zombie.',
    tip: 'Use Aggressive Toxins to make all your towers focus a dangerous zombie, like a boss. Aim the grenade carefully: picking the wrong target can let other zombies slip by.',
    levels: [
      { name: 'Saboteur', desc: 'Fires 3 poison pellets at once. Poisoned zombies are slowed a little.', damage: 2, pellets: 3, cone: 0.3, scatter: 1, cooldown: 1.35, range: 12.5, hidden: false,
        poison: { damage: 1, tick: 0.9, time: 5, slow: 0.075 } },
      { name: 'Scam Artist', desc: 'More damage, poison ticks faster, and it can now see hidden zombies.', cost: 375, damage: 3, pellets: 3, cone: 0.3, scatter: 1, cooldown: 1.35, range: 12.5, hidden: true,
        poison: { damage: 1, tick: 0.6, time: 5, slow: 0.075 } },
      { name: 'Brand New Rig', desc: 'More damage and range, fires faster, stronger and longer poison, a tighter spread, and Scattershot: each pellet hits 1 more zombie.', cost: 1850, damage: 4, pellets: 3, cone: 0.24, scatter: 2, cooldown: 1, range: 13.5, hidden: true,
        poison: { damage: 2, tick: 0.6, time: 6, slow: 0.075 } },
      { name: 'Black Market Tech', desc: 'Much more damage, fires faster, more range, much stronger poison, 4 pellets, and Aggressive Toxins: a grenade that Neuralyzes zombies.', cost: 5950, damage: 7, pellets: 4, cone: 0.24, scatter: 2, cooldown: 0.8, range: 14.5, hidden: true,
        poison: { damage: 4, tick: 0.6, time: 6, slow: 0.075 },
        abilities: [{ key: 'neuralyze', name: 'Aggressive Toxins', desc: 'Throw a grenade where you click: zombies in the blast are Neuralyzed for 5s, taking 10% more damage, and every tower targets them first', cooldown: 15, cost: 500, aim: true, radius: 3.5, vuln: 0.1, vulnTime: 5 }] },
      { name: 'Neural-Runner', desc: 'Fires faster, more range, 6 pellets in a tighter spread that each hit 1 more zombie, much stronger poison that lasts longer, ticks faster and slows more, and a stronger Aggressive Toxins.', cost: 15115, damage: 7, pellets: 6, cone: 0.18, scatter: 3, cooldown: 0.65, range: 16.5, hidden: true,
        poison: { damage: 7, tick: 0.4, time: 8, slow: 0.1 },
        abilities: [{ key: 'neuralyze', name: 'Aggressive Toxins II', desc: 'Throw a grenade where you click: zombies in the blast are Neuralyzed for 7.5s, taking 15% more damage, and every tower targets them first', cooldown: 15, cost: 500, aim: true, radius: 3.5, vuln: 0.15, vulnTime: 7.5 }] },
    ],
  },
};
