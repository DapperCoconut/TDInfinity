// Wave 10: Scarecrow overhaul, Knifer and Barracks reworks, and new towers. New base towers that
// become the parent of older towers (the older ones turn into their alternate forms):
//   Paralyzer -> Tesla (and its forms), Helicopter -> Pursuit (and its forms), Slugger -> Brawler,
//   Doctor -> Medic, Engineer (sentryEngineer) -> the old Engineer (now "Rebar Engineer"),
//   Void Traitor (traitor) -> the old Void Traitor (now "Inferno Traitor").
// Brand new: Hunter, Exterminator, Spiritual Advocate, Golden Zed, Ice Apprentice, Time Dilator.
//
// Numbers: costs, damage and firerates are the spec's (the spec comes from an FPS game, so ammo
// counts are turned into bursts and reloads). Distances aren't in the spec; they're guessed to fit
// TD Infinity's map. Guesses are noted next to each tower.
//
// New mechanics (see sim.js):
//   scare:     { every, time, maxHp, damage, cd, bosses }  Scarecrow: every `every` s every zombie in
//              range with at most `maxHp` max health (null = any) walks backwards for `time` s and
//              takes `damage`. A zombie can't be scared again for `cd` s. `bosses`: bosses too.
//   crows (ability): a flock flies in a straight line toward the first zombie in range, hitting
//              every zombie it passes.
//   sub (Paralyzer): the stats of Laser mode (Switch Mode ability, like Submerge's Dive).
//   paraSlow:  { per, max, time }  every laser tick slows the zombie `per` more, up to `max`.
//   flyArea / moveDelay (Helicopter): it can only be moved inside `flyArea` of the tower (range
//              boosts make it bigger) and waits `moveDelay` s after every move before attacking.
//              It starts parked: it attacks once you've moved it the first time.
//   hunt:      { rate, cap }  Hunter: every zombie it finishes off adds `rate` x its max health to
//              its bounty (up to `cap`). Cash Out (`withdraw`) pays the bounty out.
//   collateral: { cost, jumps, jump }  each shot spends `cost` bounty (if it has it) for double
//              damage, and the shot bounces to `jumps` zombies within `jump` (normal damage).
//   toss extras: pierce (zombies per knife), stun (s, not bosses), bossSlow (bosses are slowed that
//              much instead, for the stun time), flash (radius: everything near the hit is stunned).
//   healCash:  { rate, cap }  Doctor: earns `rate` x the health it heals as cash, at most `cap` a second.
//   beamPct / beamRange: medi beam also heals that share of the patient's max health per second;
//              the beam reaches `beamRange` (else `aura`).
//   regen:     { delay, rate } after `delay` s without taking damage it heals `rate` x max health per s.
//   extraLife: { immune, back }  a second life: the hit that would knock it out fully heals it
//              instead and makes it immortal for `immune` s. Comes back `back` s later.
//   soul:      { per, gain, max, imbue, cost, regen }  Spiritual Advocate: `gain` souls for every
//              `per` damage, at most `max`. imbue: melee hits deal +imbue per soul and use `cost`
//              souls per zombie hit. regen: souls per second on its own.
//   critEvery: { every, mult }  Void Traitor: every `every`th swing does `mult` damage.
//   devices:   Engineer: [{ def, max }] it builds the first device it has fewer than `max` of, one
//              every `buildEvery` s. Device defs with `heal` (Menders) heal towers instead of shooting.
//   dilate:    { fast, slow, radius, spawn, cd, recharge }  Time Dilator: everything in the bubble
//              runs at `fast` (or `slow` in slow mode) speed. spawn: spawners' timers too.
//              cd: ability cooldowns too. recharge: s the bubble is off after a stun.
//   bleed (Knifer): poison with `fire: true`, so fire-immune zombies ignore it.
//
// Not used by the game yet (kept for later): Paralyzer `freezeImmune`-style details aside, these
// fields are placeholders: teleporter (Engineer Teleporter device), repair (Engineer wrench repairs
// devices 20% per swing), supportMode (Void Traitor Supporter Group/Split), blindImmune (Void
// Traitor Lv 4), golden (Golden Zed: golden damage), statusImmune (Golden Zed Lv 5), noClone (Time
// Dilator: Hacker can't clone it), consumables (Time Dilator Lv 1: players' consumable cooldowns).

// ---------------------------------------------------------------- helpers

/** Bleed: `dps` damage a second for `time` s, ticking every 0.5s. Fire-immune zombies ignore it. */
const bleed = (dps, time) => ({ damage: dps / 2, tick: 0.5, time, slow: 0, fire: true });
/** Cycle time of a burst tower whose average DPS should be `avg`. */
const cycleFor = (burst, damage, avg) => Math.round(((burst * damage) / avg) * 100) / 100;

// ---------------------------------------------------------------- Scarecrow

const crowsAb = (damage, souls = false) => ({ key: 'crows', name: souls ? 'Flock of Souls' : 'Flock of Crows',
  desc: `${souls ? 'A group of souls flies' : 'A flock of crows flies'} in a straight line toward the first zombie in range, doing ${damage} damage to every zombie it passes`,
  cooldown: 30, damage, length: 32, speed: 30 });

// ---------------------------------------------------------------- Paralyzer

const PARA_MODE = { key: 'dive', name: 'Switch Mode', desc: 'Switch between Bubble mode (stuns every zombie in a small area) and Laser mode (a laser that slows one zombie more and more)', cooldown: 1 };
const para = (laser, cd, slowPer, slowMax) => ({ radius: 0, stun: 0, damage: laser, cooldown: cd, burst: 1, paraSlow: { per: slowPer, max: slowMax, time: 1.5 } });

// ---------------------------------------------------------------- Helicopter

const heliFly = (area) => ({ key: 'patrol', name: 'Move', desc: `Fly it to a spot you click within ${area} studs of its pad. It waits 6s after every move before it attacks`, cooldown: 1, aim: true, radius: 3, area });

// ---------------------------------------------------------------- Hunter

const CASH_OUT = { key: 'withdraw', name: 'Cash Out', desc: 'Pay out its bounty as cash', cooldown: 1 };

// ---------------------------------------------------------------- Spiritual Advocate

const SOUL_BEAM = (damage) => ({ key: 'soulBeam', name: 'Soul Beam', desc: `Switch between Auto and Beam mode. Beam: holds its sword sideways and fires a laser doing ${damage} damage every 0.15s at one zombie while its souls last (4 souls a second)`, cooldown: 2, damage, tick: 0.15, drain: 4 });
const SELF_HEAL = { key: 'selfHeal', name: 'Self Heal', desc: 'Costs 20 souls: heals 120% of its health over 6s', cooldown: 25, souls: 20, pct: 1.2, time: 6 };
const SOUL_HEAL = { key: 'soulHeal', name: 'Heal', desc: 'Costs 20 souls: every tower within 25 heals 200% of its health over 8s. Its sword rests for 1.5s', cooldown: 25, souls: 20, pct: 2, time: 8, radius: 25, pause: 1.5 };

// ---------------------------------------------------------------- Engineer

const DEV = {
  s1: { name: 'Sentry MK I', model: 100, hp: 300, decay: 0, lead: true, flying: true, gun: { damage: 10, cooldown: 0.25, range: 14 } },
  s2: { name: 'Sentry MK II "Sweeper"', model: 101, hp: 500, decay: 0, lead: true, flying: true, gun: { damage: 15, cooldown: 0.2, range: 15 } },
  s3: { name: 'Sentry MK III "Defender"', model: 102, hp: 900, decay: 0, lead: true, flying: true, hidden: true, gun: { damage: 30, cooldown: 0.15, range: 16 } },
  s4: { name: 'Sentry MK IV "Guardian"', model: 103, hp: 2000, decay: 0, lead: true, flying: true, hidden: true, shield: true, gun: { damage: 60, cooldown: 0.12, range: 18 } },
  s5: { name: 'Sentry MK V "Bastion"', model: 104, hp: 5000, decay: 0, lead: true, flying: true, hidden: true, shield: true, gun: { damage: 120, cooldown: 0.1, range: 20 }, rocket: { damage: 400, every: 2, radius: 4 } },
  m1: { name: 'Mender', model: 105, hp: 400, decay: 0, heal: { radius: 8, pct: 0.07, flat: 5 } },
  m2: { name: 'Mender MK II "Rejuvenator"', model: 106, hp: 1200, decay: 0, heal: { radius: 10, pct: 0.1, flat: 20 } },
  m3: { name: 'Mender MK III "Eden"', model: 107, hp: 3000, decay: 0, heal: { radius: 12, pct: 0.14, flat: 50 } },
};
const wrench = (damage, every) => ({ damage, every, reach: 4.5, targets: 4 });

// ---------------------------------------------------------------- Void Traitor

const VT_SUPPORTER = { name: 'Void Traitor Supporter', model: 'vtsupport', soldiers: 1, hp: 2500, speed: 3, lead: true, hidden: true, life: 180, defense: 0.3, gun: { damage: 400, cooldown: 1, range: 6 } };
const strikeAb = (damages, windup, cooldown) => ({ key: 'strike', name: 'Strike', desc: `Stands still ${windup}s, then blasts a line of circles in front of it: ${damages.map((d) => d.toLocaleString()).join(' / ')} damage, harder the farther out`, cooldown, damages, windup, radius: 3.5, gap: 5 });
const SUMMON_SUPPORTER = { key: 'militia', name: 'Summon', desc: 'Summons a Void Traitor Supporter (lasts 3 minutes) that walks the path fighting zombies', cooldown: 45, unit: VT_SUPPORTER };

// ---------------------------------------------------------------- Golden Zed

const gzed = (n, hp, gun, gunCd, ram, boom, cannon) => ({
  name: ['Golden Zed', 'Golden Zed', 'Golden Zed G3', 'Golden Zed G4', 'Golden Zed G11'][n - 1], model: `gzed${n}`,
  hp, speed: 3, lead: true, flying: true, bump: ram, golden: true, ...(n === 5 ? { statusImmune: true } : {}),
  gun: { damage: gun, cooldown: gunCd, range: 20 }, ...(cannon ? { cannon } : {}), explode: { damage: boom, radius: 7 },
});

// ---------------------------------------------------------------- Ice Apprentice

const meteorAb = (damage, radius, freeze, cooldown) => ({ key: 'meteor', name: 'Ice Meteor', desc: `After 3s an ice meteor crashes down on a zombie in range: ${damage.toLocaleString()} damage in a large area and a ${freeze}s freeze`, cooldown, damage, radius, freeze, delay: 3 });
const BLIZZARD = { key: 'blizzard', name: 'Blizzard', desc: '400 ice damage every 0.5s to every zombie within 16 for 5s, freezing them. Its staff can\'t attack meanwhile', cooldown: 44, duration: 5, damage: 400, tick: 0.5, radius: 16, freeze: 0.6 };

// ---------------------------------------------------------------- Time Dilator

const timeWarp = (cooldown) => ({ key: 'timeWarp', name: 'Time Warp', desc: 'Flip the bubble between fast mode (orange) and slow mode (blue)', cooldown });
const dil = (fast, slow, spawn, cd, recharge = 6) => ({ fast, slow, radius: 26, spawn, cd, recharge });

// ---------------------------------------------------------------- Barracks

const SOLDIERS = (n, hp, damage, range, hidden) => ({ name: 'Army', model: 'tbsquad', soldiers: n, hp, speed: 3.5, ...(hidden ? { hidden } : {}), gun: { damage, burst: 3, cooldown: 1.5, range } });
const TUBER = (hp, damage) => ({ name: 'Tuber', model: 'tbtuber', soldiers: 1, hp, speed: 3.5, lead: true, gun: { damage, cooldown: 3, range: 16, radius: 3 } });
const COMMANDO = (hp, damage) => ({ name: 'Commando', model: 'tbcommando', soldiers: 1, hp, speed: 3.5, hidden: true, lead: true, gun: { damage, cooldown: 0.1, range: 16 } });
const army = (soldiers, tuber) => (tuber ? { ...soldiers, train: [tuber] } : soldiers);
const commandoAb = (hp, damage) => ({ key: 'militia', name: 'Summon Commando', desc: `Sends a Commando (${hp} HP, ${damage} damage a shot) down the path. Usable 2 times`, cost: 1850, cooldown: 60, maxUses: 2, unit: COMMANDO(hp, damage) });

export const TENTH_TOWERS = {
  // Scarecrow (event, overhauled): still bait with growing health, and now it scares zombies.
  // Guessed: limit 8 (was 20, but it fights now), scare every 2.5s for 1s (4s before the same
  // zombie can be scared again), ranges 8-15, thresholds 60 / 250 / 250 / 1,500 max health
  // (Boss1 -> Brute / Zombie Boss, Lava Golem -> 1,500); at max level there's no threshold and
  // bosses are scared too.
  scarecrow: {
    name: 'Scarecrow',
    event: 'Event reward',
    cost: 300,
    limit: 8,
    kind: 'support',
    bait: true,
    kindLabel: 'Scare',
    blurb: 'A scarecrow that scares zombies in its range so they walk backwards for a moment. Each level lets it scare tougher zombies, and at max level it scares anything, bosses too. From Lv 3 every scare also hurts, and it unlocks a flock of crows that flies in a straight line. It\'s still bait: enemies that throw attacks at towers aim at it first.',
    tip: 'Put it where zombies have a long walk ahead, so the time they lose walking backwards adds up. Keep it a little away from your real towers so splash aimed at it misses them.',
    levels: [
      { name: 'Scarecrow', desc: 'Scares zombies with up to 60 max health in range. No damage.', range: 8, hp: 101, hidden: false,
        scare: { every: 2.5, time: 1, maxHp: 60, damage: 0, cd: 4 } },
      { name: 'Spooky Attire', desc: 'More range, and it scares zombies with up to 250 max health (Brutes and Zombie Bosses). More health.', cost: 250, range: 10, hp: 131, hidden: false,
        scare: { every: 2.5, time: 1, maxHp: 250, damage: 0, cd: 4 } },
      { name: 'Wild Harvester', desc: 'Each scare does 6 damage, more health, and unlocks Flock of Crows: 20 damage to every zombie in a straight line (30s cooldown).', cost: 700, range: 10, hp: 151, hidden: false,
        scare: { every: 2.5, time: 1, maxHp: 250, damage: 6, cd: 4 }, abilities: [crowsAb(20)] },
      { name: 'Tomb of the Guardian', desc: 'More range, 35 damage per scare, crows do 64, and it scares zombies with up to 1,500 max health (Lava Golems). More health.', cost: 3280, range: 12, hp: 176, hidden: false,
        scare: { every: 2.5, time: 1, maxHp: 1500, damage: 35, cd: 4 }, abilities: [crowsAb(64)] },
      { name: 'Grave of the King', desc: 'Much more range, 60 damage per scare, and it scares every zombie, bosses too (half as long). The crows become a group of souls doing 200. Lots more health.', cost: 11666, range: 15, hp: 226, hidden: false,
        scare: { every: 2.5, time: 1, maxHp: null, damage: 60, cd: 4, bosses: 0.5 }, abilities: [crowsAb(200, true)] },
    ],
  },

  // Knifer (event, reworked): stabs plus a bleed. Fire-immune zombies ignore the bleed.
  knifer: {
    name: 'Knifer',
    event: 'Event reward',
    flying: false,
    cost: 400,
    limit: 10,
    melee: true,
    blurb: 'A short-range melee tower that stabs zombies and makes them bleed for a few seconds. Every level stabs harder and faster with a stronger, longer bleed. Sees hidden zombies from Lv 3. Fire-immune zombies ignore the bleed.',
    tip: 'Put it right next to the path. Its bleed keeps hurting zombies after they walk past, so spread a few along a long stretch.',
    levels: [
      { name: 'Knifer', desc: '3 damage per stab, plus a bleed: 1 damage a second for 2s.', damage: 3, cooldown: 0.8, range: 6.5, poison: bleed(1, 2), hidden: false },
      { name: 'Sleight of Hand', desc: '6 damage per stab and slightly faster swings.', cost: 380, damage: 6, cooldown: 0.7, range: 6.5, poison: bleed(1, 2), hidden: false },
      { name: 'Assassin', desc: '10 damage per stab, a little more range and hidden detection. Bleed: 3 a second for 3s.', cost: 750, damage: 10, cooldown: 0.7, range: 7.5, poison: bleed(3, 3), hidden: true },
      { name: 'Dual Wield', desc: 'A second knife: swings twice as fast, 14 damage per stab. Bleed: 10 a second for 4s.', cost: 1900, damage: 14, cooldown: 0.35, range: 7.5, poison: bleed(10, 4), hidden: true },
      { name: 'Murderer', desc: '38 damage per stab and much faster swings. Bleed: 25 a second for 10s.', cost: 5050, damage: 38, cooldown: 0.2, range: 7.5, poison: bleed(25, 10), hidden: true },
    ],
  },

  // Barracks (reworked). Each army is a squad of Soldiers, plus a Tuber (bazooka) from Lv 3, sent
  // together every 35s, at most 2 armies out. Soldier/Tuber damage isn't in the spec (guessed).
  barracks: {
    name: 'Barracks',
    price: 1000,
    cost: 1100,
    limit: 2,
    kind: 'spawner',
    spawnEvery: 35,
    maxUnits: 2,
    blurb: 'Sends small armies down the path every 35 seconds, up to 2 at once. Upgrades add Soldiers, then a Tuber with a bazooka, and tougher troops. From Lv 4 you can buy a Commando to join the fight. Its early troops are very fragile, so strong zombies walk right through them.',
    tip: 'Its troops get much tougher at Lv 4-5. Save the Commando for when something big is coming.',
    levels: [
      { name: 'Barracks', desc: 'Each army is 2 Soldiers with 5 health each. Up to 2 armies, one every 35s.', hidden: false,
        unit: SOLDIERS(2, 5, 1, 14) },
      { name: 'Squadron', desc: 'A third Soldier in each army.', cost: 350, hidden: false,
        unit: SOLDIERS(3, 5, 1, 14) },
      { name: 'Spec Ops', desc: 'Soldiers get 8 health, slightly more range and hidden detection, and a Tuber (30 health, bazooka) joins each army.', cost: 700, hidden: true, maxUnits: 4,
        unit: army(SOLDIERS(3, 8, 1, 16, true), TUBER(30, 8)) },
      { name: 'Legion', desc: 'Soldiers 24 health, Tuber 50 and stronger guns. Unlocks Summon Commando ($1,850, 200 health).', cost: 5150, hidden: true, maxUnits: 4, spawnNow: true,
        unit: army(SOLDIERS(3, 24, 3, 16, true), TUBER(50, 20)), abilities: [commandoAb(200, 3)] },
      { name: 'Fort', desc: 'Max-level troops: one more Soldier per army, Soldiers 60 health, Tuber 125, and the Commando gets 400 health and 8 damage.', cost: 17500, hidden: true, maxUnits: 4, spawnNow: true,
        unit: army(SOLDIERS(4, 60, 8, 18, true), TUBER(125, 50)), abilities: [commandoAb(400, 8)] },
    ],
  },

  // Paralyzer: Bubble mode (default) = splash stuns; Laser mode (`sub`) = a slowing laser.
  // Guessed: firerates, stun lengths, slow strength, ranges, limit 4, bosses stunned 25% as long.
  paralyzer: {
    name: 'Paralyzer',
    price: 5000,
    cost: 3500,
    limit: 4,
    lead: true,
    bossStop: 0.25,
    kindLabel: 'Stun',
    blurb: 'Stuns and slows zombies, with two modes you switch between. Bubble mode fires a bubble that stuns every zombie in a small area. Laser mode fires a laser at one zombie that hurts it every tick and slows it more and more. Upgrades raise both modes\' damage and make stuns and slows stronger. Sees hidden zombies from Lv 3. Bosses are stunned for a quarter as long.',
    tip: 'Use Bubble mode on crowds and Laser mode to drag a single tough zombie to a crawl. Its damage is low, so pair it with real damage dealers.',
    levels: [
      { name: 'Paralyzer', desc: 'Bubble: 30 damage and a 0.6s stun to every zombie in the area. Laser: 4 damage a tick and a slow that builds up.', damage: 30, cooldown: 3, range: 14, radius: 3, stun: 0.6, hidden: false,
        sub: para(4, 0.25, 0.04, 0.3), abilities: [PARA_MODE] },
      { name: 'Faster Charging', desc: 'Fires faster (mostly the bubble).', cost: 600, damage: 30, cooldown: 2.3, range: 14, radius: 3, stun: 0.6, hidden: false,
        sub: para(4, 0.24, 0.04, 0.3), abilities: [PARA_MODE] },
      { name: 'Flash Mask', desc: 'More range, faster firing, bigger bubble splash and hidden detection. Laser 8, bubble 48.', cost: 3600, damage: 48, cooldown: 2, range: 16, radius: 4, stun: 0.75, hidden: true,
        sub: para(8, 0.22, 0.04, 0.35), abilities: [PARA_MODE] },
      { name: 'Stronger Chemicals', desc: 'A bit more range, faster in both modes, and stronger stuns and slows. Laser 12, bubble 90.', cost: 8950, damage: 90, cooldown: 1.7, range: 17, radius: 4, stun: 1, hidden: true,
        sub: para(12, 0.2, 0.05, 0.45), abilities: [PARA_MODE] },
      { name: 'Paralysis Ray', desc: 'More range, faster firing and even stronger stuns and slows. Laser 24, bubble 240.', cost: 31500, damage: 240, cooldown: 1.4, range: 20, radius: 4.5, stun: 1.4, hidden: true,
        sub: para(24, 0.17, 0.06, 0.6), abilities: [PARA_MODE] },
    ],
  },

  // Helicopter: flies like the Pursuit, but only inside its fly area, and it starts parked.
  // Guessed: firerates, gun range, fly area 20 (26 at Lv 5), rocket timers and blasts.
  helicopter: {
    name: 'Helicopter',
    price: 4500,
    cost: 3000,
    limit: 3,
    heli: { speed: 12, height: 13 },
    moveDelay: 6,
    kindLabel: 'Air',
    blurb: 'A helicopter you move by hand: it sits parked on its pad until you Move it, and after every move it waits 6 seconds before it attacks. It can only fly inside its fly area around the pad (range boosts like the Commander make that bigger). Shoots with guns, and from Lv 3 fires rockets that hit lead zombies. Sees hidden zombies from Lv 4.',
    tip: 'Park it over a busy stretch of path and leave it there; every move costs 6 seconds of shooting.',
    levels: [
      { name: 'Helicopter', desc: 'Guns that do 3 damage a shot. Move it to start attacking.', damage: 3, cooldown: 0.15, range: 10, patrol: 3, flyArea: 20, hidden: false,
        abilities: [heliFly(20)] },
      { name: 'Quicker Autoloader', desc: 'Fires faster.', cost: 1550, damage: 3, cooldown: 0.1, range: 10, patrol: 3, flyArea: 20, hidden: false,
        abilities: [heliFly(20)] },
      { name: 'Rocket Pods', desc: 'A rocket pod: 2 rockets a volley, 24 damage each, that hit lead zombies.', cost: 2650, damage: 3, cooldown: 0.1, range: 10, patrol: 3, flyArea: 20, lead: true, hidden: false,
        missiles: [{ name: 'Rockets', damage: 24, count: 2, every: 3, radius: 2.5, range: 12 }], abilities: [heliFly(20)] },
      { name: 'Heavy Armaments', desc: 'Hidden detection, a bit more range, faster guns and rockets, guns do 9, and a second pod: 3 rockets a volley.', cost: 11400, damage: 9, cooldown: 0.08, range: 12, patrol: 3, flyArea: 20, lead: true, hidden: true,
        missiles: [{ name: 'Rockets', damage: 24, count: 3, every: 2.5, radius: 2.5, range: 14 }], abilities: [heliFly(20)] },
      { name: 'Aerial Supremacy', desc: 'More range, faster fire and a bigger fly area. Guns do 20; rockets do 100 each, 6 a volley.', cost: 40000, damage: 20, cooldown: 0.06, range: 14, patrol: 3, flyArea: 26, lead: true, hidden: true,
        missiles: [{ name: 'Rockets', damage: 100, count: 6, every: 2, radius: 3, range: 16 }], abilities: [heliFly(26)] },
    ],
  },

  // Hunter: cliff sniper that collects bounties. Guessed: firerates, ranges, bounty 25% of max
  // health, caps $500 / $1,000 / $2,000 / $5,000, Collateral bounces to 2 zombies within 6.
  hunter: {
    name: 'Hunter',
    price: 1500,
    cost: 950,
    limit: 6,
    placement: 'cliff',
    lead: 3,
    kindLabel: 'Bounty',
    blurb: 'A cliff sniper that collects a bounty for every zombie it finishes off (based on that zombie\'s max health, up to a cap). Cash Out pays it to you. From Lv 4 Collateral spends $32 of bounty per shot for double damage that bounces to nearby zombies. Sees hidden zombies from Lv 3. Cliffs only.',
    tip: 'Set it to Strongest so it lands the kills on big zombies, and cash out before the bounty hits its cap.',
    levels: [
      { name: 'Hunter', desc: '8 damage a shot. Bounties unlock at Lv 2.', damage: 8, cooldown: 1.6, range: 24, hidden: false },
      { name: 'Bounties', desc: 'Every zombie it finishes off adds 25% of its max health to its bounty (up to $500). Cash Out pays it.', cost: 200, damage: 8, cooldown: 1.6, range: 24, hidden: false,
        hunt: { rate: 0.25, cap: 500 }, abilities: [CASH_OUT] },
      { name: 'Sharp Vision', desc: '15 damage, more range, hidden detection, bounty cap $1,000.', cost: 900, damage: 15, cooldown: 1.6, range: 28, hidden: true,
        hunt: { rate: 0.25, cap: 1000 }, abilities: [CASH_OUT] },
      { name: 'Collateral Damage', desc: '24 damage, more range, faster, 1.5x damage to shields, bounty cap $2,000. Collateral: each shot spends $32 of bounty for double damage that bounces to 2 nearby zombies.', cost: 2750, damage: 24, cooldown: 1.2, range: 32, hidden: true, shieldMult: 1.5,
        hunt: { rate: 0.25, cap: 2000 }, collateral: { cost: 32, jumps: 2, jump: 6 }, abilities: [CASH_OUT] },
      { name: 'Most Wanted', desc: '70 damage, more range, bounty cap $5,000.', cost: 10800, damage: 70, cooldown: 1.2, range: 36, hidden: true, shieldMult: 1.5,
        hunt: { rate: 0.25, cap: 5000 }, collateral: { cost: 32, jumps: 2, jump: 6 }, abilities: [CASH_OUT] },
    ],
  },

  // Slugger: bat swings hit every zombie in range; a baseball every 5s stuns. Bosses aren't stunned
  // (from Lv 3 the baseball slows them instead). Guessed: swing times, stun lengths, ranges.
  slugger: {
    name: 'Slugger',
    price: 800,
    cost: 700,
    limit: 8,
    flying: false,
    lead: true,
    melee: true,
    bossStop: 0,
    kindLabel: 'Melee',
    blurb: 'Swings a bat that hits every zombie around it, and every 5 seconds it hits a baseball at a zombie farther away that stuns it. From Lv 4 its swings stun too and it sees hidden zombies; at max level the baseball becomes a flashbang that stuns a whole area. Bosses are never stunned, but from Lv 3 the baseball slows them.',
    tip: 'Cheap crowd damage with lots of stuns. Put it where the path bends around it so more zombies are in reach.',
    levels: [
      { name: 'Slugger', desc: 'Bat swings do 8 to every nearby zombie. A baseball (13 damage, 1s stun) every 5s.', damage: 8, cooldown: 1.2, range: 6, targets: 99, hidden: false,
        toss: { damage: 13, every: 5, range: 12, speed: 35, stun: 1 } },
      { name: 'Sturdy Grip', desc: 'Swings faster and throws the baseball farther.', cost: 340, damage: 8, cooldown: 0.95, range: 6, targets: 99, hidden: false,
        toss: { damage: 13, every: 5, range: 16, speed: 35, stun: 1 } },
      { name: 'Spiked Bat', desc: 'Swings do 16, the baseball does 25 with a longer stun, and it now slows bosses.', cost: 960, damage: 16, cooldown: 0.95, range: 6, targets: 99, hidden: false,
        toss: { damage: 25, every: 5, range: 16, speed: 35, stun: 1.5, bossSlow: 0.4 } },
      { name: 'Metal Gear', desc: 'Swings do 30 and stun too, the baseball does 40, faster swings and hidden detection.', cost: 3025, damage: 30, cooldown: 0.8, range: 6.5, targets: 99, stun: 0.4, hidden: true,
        toss: { damage: 40, every: 5, range: 16, speed: 35, stun: 1.5, bossSlow: 0.4 } },
      { name: 'Power Surge', desc: 'Swings do 70 with stronger stuns and knockback. The baseball becomes a flashbang: 85 damage and a 2.5s stun to every zombie near where it hits.', cost: 9250, damage: 70, cooldown: 0.7, range: 6.5, targets: 99, stun: 0.6, knock: 6, hidden: true,
        toss: { damage: 85, every: 5, range: 18, speed: 40, stun: 2.5, bossSlow: 0.5, flash: 4 } },
    ],
  },

  // Doctor: pistol + medkits (healing area, `towerHeal` per second averaged over the reload) and a
  // medigun from Lv 4. Earns cash for healing. Can't be healed; regenerates when left alone.
  // Changed from the spec: cash is half the health healed, at most $5-$25 a second (the spec's
  // $100 per 0.25s would out-earn every farm). Guessed: ranges, medigun reach 20 / 25.
  doctor: {
    name: 'Doctor',
    price: 1200,
    cost: 900,
    limit: 3,
    noHeal: true,
    kindLabel: 'Healer',
    blurb: 'A healer with a silenced pistol. It throws medkits that heal towers around it, and from Lv 4 a medigun locks onto one tower and keeps healing it. It earns cash for the health it heals. It can\'t be healed itself, but it regenerates after 7 seconds without taking damage. From Lv 4 it has a second life.',
    tip: 'Keep it next to a tanky tower like the Void Traitor or Golden Zed\'s path. Healing is its money maker, so it earns most where towers get hit.',
    levels: [
      { name: 'Doctor', desc: 'Pistol: 13 damage (8 shots, then a 1.4s reload). Medkits heal towers nearby about 20 HP/s.', damage: 13, cooldown: 0.35, ammo: 8, reload: 1.4, range: 14, aura: 10, towerHeal: 20, hp: 40, hidden: false,
        healCash: { rate: 0.5, cap: 5 }, regen: { delay: 7, rate: 0.1667 } },
      { name: 'Trained Professional', desc: 'Medkits heal much more (about 62 HP/s). More health.', cost: 400, damage: 13, cooldown: 0.35, ammo: 8, reload: 1.4, range: 14, aura: 10, towerHeal: 62, hp: 60, hidden: false,
        healCash: { rate: 0.5, cap: 6 }, regen: { delay: 7, rate: 0.1667 } },
      { name: 'Enhanced Medkits', desc: 'Medkits become a healing area on the ground with a bigger reach. Pistol 13 → 23. More health.', cost: 700, damage: 23, cooldown: 0.35, ammo: 8, reload: 1.4, range: 14, aura: 12, towerHeal: 48, hp: 100, hidden: false,
        healCash: { rate: 0.5, cap: 8 }, regen: { delay: 7, rate: 0.1667 } },
      { name: 'Medigun', desc: 'A medigun locks onto the most hurt tower and heals 20% of its max health + 200 a second. A second life (3s immortal, back 30s after it breaks). Pistol → 70, stronger medkits, lots more health.', cost: 4200, damage: 70, cooldown: 0.35, ammo: 8, reload: 1.4, range: 16, aura: 12, towerHeal: 96, hp: 500, hidden: false,
        beamHeal: 200, beamPct: 0.2, beamRange: 20, healCash: { rate: 0.5, cap: 15 }, regen: { delay: 7, rate: 0.1667 }, extraLife: { immune: 3, back: 30 } },
      { name: 'Crazed Scientist', desc: 'A laser blaster: 600 damage every 1s with no reloads. Medigun reaches farther and heals 30% + 200 a second. Medkits heal about 576 HP/s. Lots more health.', cost: 16600, damage: 600, cooldown: 1, range: 18, aura: 14, towerHeal: 576, hp: 1250, laser: true, hidden: false,
        beamHeal: 200, beamPct: 0.3, beamRange: 25, healCash: { rate: 0.5, cap: 25 }, regen: { delay: 7, rate: 0.1667 }, extraLife: { immune: 3, back: 30 } },
    ],
  },

  // Exterminator (event): charges up, then empties its magazine in one long burst of lasers, then a
  // long recharge. More ammo = bigger bursts. Cycle times match the spec's average DPS.
  // Guessed: ranges, hidden detection from Lv 3.
  exterminator: {
    name: 'Exterminator',
    event: 'Event reward',
    cost: 4000,
    limit: 3,
    lead: true,
    laser: true,
    kindLabel: 'Burst',
    blurb: 'A very accurate laser gunner. It charges up, then fires a long stream of laser shots until its magazine is empty, then has to recharge for a long time. Every upgrade adds ammo, so the bursts get bigger. Huge burst damage for bosses, helpless between bursts. Sees hidden zombies from Lv 3.',
    tip: 'Set it to Strongest so its burst lands on the boss. Put faster towers next to it to cover the long recharge.',
    levels: [
      { name: 'Exterminator', desc: 'Bursts of 75 lasers (45 damage, 0.075s apart), then recharges. About 137 DPS on average, 600 while firing.', damage: 45, burst: 75, burstGap: 0.075, cooldown: cycleFor(75, 45, 137), range: 16, hp: 250, hidden: false },
      { name: 'Proper Equipment', desc: 'Recharges much faster. About 231 DPS on average.', cost: 800, damage: 45, burst: 75, burstGap: 0.075, cooldown: cycleFor(75, 45, 231), range: 16, hp: 300, hidden: false },
      { name: 'Hallowed Technology', desc: '75 damage, 0.06s apart, 150-shot bursts and hidden detection. About 554 DPS on average, 1,250 while firing.', cost: 3000, damage: 75, burst: 150, burstGap: 0.06, cooldown: cycleFor(150, 75, 554), range: 18, hp: 500, hidden: true },
      { name: 'The Prototype', desc: '150 damage and 200-shot bursts. About 1,240 DPS on average, 2,500 while firing.', cost: 12000, damage: 150, burst: 200, burstGap: 0.06, cooldown: cycleFor(200, 150, 1240), range: 20, hp: 1400, hidden: true },
      { name: 'Spooky Destruction', desc: 'A stationary cannon: 200 damage every 0.04s, 300-shot bursts. About 2,439 DPS on average, 5,000 while firing.', cost: 80000, damage: 200, burst: 300, burstGap: 0.04, cooldown: cycleFor(300, 200, 2439), range: 22, hp: 3500, hidden: true },
    ],
  },

  // Spiritual Advocate (event): sword swings hit 6 zombies up close and send a projectile that
  // pierces 6. Souls power Sword Imbue (Lv 2), Soul Beam (Lv 3+), Self Heal (Lv 4) and Heal (Lv 5).
  // Guessed: projectile range 24, beam drains 4 souls a second, Lv 3+ Auto mode has no imbue (spec).
  spiritAdvocate: {
    name: 'Spiritual Advocate',
    event: 'Event reward',
    cost: 3000,
    limit: 1,
    flying: false,
    lead: true,
    melee: true,
    kindLabel: 'Melee',
    blurb: 'A tough sword fighter. Each swing hits up to 6 zombies up close and fires a small projectile that pierces up to 6 more. Dealing damage collects souls. Lv 2: souls make its sword hits stronger. Lv 3: Soul Beam fires a laser at one zombie while souls last. Lv 4: Self Heal. Lv 5: it gains souls on its own and can Heal every tower around it.',
    tip: 'Save souls for the Soul Beam when a boss shows up, and keep 20 for a heal.',
    levels: [
      { name: 'Spiritual Advocate', desc: '240 damage swings (up to 6 zombies) and piercing shots every 1.2s.', damage: 240, cooldown: 1.2, range: 7, targets: 6, hp: 1000, hidden: false,
        toss: { damage: 240, every: 1.2, range: 24, speed: 12, pierce: 6 } },
      { name: 'Harsh Adaptation', desc: 'Sword Imbue: sword hits do 2% more per soul held (up to 40 souls), using 4 souls per zombie hit. Gains 8 souls for every 818 damage. Swings every 1s.', cost: 1300, damage: 240, cooldown: 1, range: 7, targets: 6, hp: 1500, hidden: false,
        toss: { damage: 240, every: 1, range: 24, speed: 12, pierce: 6 }, soul: { per: 818, gain: 8, max: 40, imbue: 0.02, cost: 4 } },
      { name: 'Soul Reclaimer', desc: '500 damage. Soul Beam: switch to Beam mode to fire a laser (180 damage every 0.15s) at one zombie while souls last. Sword Imbue is gone.', cost: 7000, damage: 500, cooldown: 1, range: 7, targets: 6, hp: 3000, hidden: false,
        toss: { damage: 500, every: 1, range: 24, speed: 12, pierce: 6 }, soul: { per: 818, gain: 8, max: 40 }, abilities: [SOUL_BEAM(180)] },
      { name: 'Demanding Power', desc: 'Swings every 0.7s, Beam 225 every 0.1s, up to 60 souls (12 per 1,414 damage). Self Heal: 20 souls to heal 120% of its health over 6s.', cost: 23000, damage: 500, cooldown: 0.7, range: 7, targets: 6, hp: 6000, hidden: false,
        toss: { damage: 500, every: 0.7, range: 24, speed: 12, pierce: 6 }, soul: { per: 1414, gain: 12, max: 60 }, abilities: [{ ...SOUL_BEAM(225), tick: 0.1 }, SELF_HEAL] },
      { name: 'Freed Divinity', desc: '800 damage every 0.4s, Beam 450 a tick, gains a soul every second on its own. Heal: 20 souls to heal every tower within 25 by 200% over 8s.', cost: 72000, damage: 800, cooldown: 0.4, range: 7, targets: 6, hp: 12000, hidden: false,
        toss: { damage: 800, every: 0.4, range: 24, speed: 12, pierce: 6 }, soul: { per: 1414, gain: 12, max: 60, regen: 1 }, abilities: [{ ...SOUL_BEAM(450), tick: 0.1 }, SELF_HEAL, SOUL_HEAL] },
    ],
  },

  // Engineer (new base; the old one is now its Rebar form). Nailgun with a magazine, a wrench that
  // hits up to 4 zombies (`sword`), and devices it builds every 12s. Sentry and Mender stats aren't in
  // the spec (guessed, see DEV). Teleporter (Lv 4+) isn't built yet (`teleporter` placeholder).
  sentryEngineer: {
    name: 'Engineer',
    price: 3500,
    cost: 2000,
    limit: 2,
    lead: true,
    minRange: 0,
    kindLabel: 'Builder',
    blurb: 'A sturdy builder. Shoots a nailgun, swings a wrench at up to 4 zombies up close, and builds devices on open ground nearby: up to 2 Sentries that shoot zombies, then from Lv 3 a Mender that heals towers around it. Upgrading it upgrades its devices. Sees hidden zombies from Lv 3 (its sentries too).',
    tip: 'Its devices need open ground near it, so leave some space around it. Menders love being next to your tankiest towers.',
    levels: [
      { name: 'Engineer', desc: 'Nailgun: 8 damage (40 nails, 3.3s reload). Wrench: 40 to up to 4 zombies every 1.2s. Builds up to 2 Sentry MK I.', damage: 8, cooldown: 0.15, ammo: 40, reload: 3.3, range: 14, hp: 200, hidden: false,
        sword: wrench(40, 1.2), buildEvery: 12, buildRange: 10, devices: [{ def: DEV.s1, max: 2 }], repair: 0.2 },
      { name: 'Quick Grip', desc: 'Nailgun 16, wrench 80 every 1s. Sentries become MK II "Sweeper".', cost: 900, damage: 16, cooldown: 0.15, ammo: 40, reload: 3.3, range: 15, hp: 250, hidden: false,
        sword: wrench(80, 1), buildEvery: 12, buildRange: 10, devices: [{ def: DEV.s2, max: 2 }], repair: 0.2 },
      { name: 'Optimized Designs', desc: 'Nailgun 36 and faster, wrench 200, hidden detection. Sentries become MK III "Defender". New device: a Mender that heals towers nearby 7% + 5 a second.', cost: 4600, damage: 36, cooldown: 0.12, ammo: 40, reload: 3.3, range: 16, hp: 500, hidden: true,
        sword: wrench(200, 1), buildEvery: 12, buildRange: 11, devices: [{ def: DEV.s3, max: 2 }, { def: DEV.m1, max: 1 }], repair: 0.2 },
      { name: 'Military Grade Equipment', desc: 'Nailgun 60, wrench 400. Sentry MK IV "Guardian" and Mender MK II "Rejuvenator".', cost: 25500, damage: 60, cooldown: 0.12, ammo: 40, reload: 3.3, range: 18, hp: 2000, hidden: true,
        sword: wrench(400, 1), buildEvery: 10, buildRange: 12, devices: [{ def: DEV.s4, max: 2 }, { def: DEV.m2, max: 1 }], repair: 0.2, teleporter: 1 },
      { name: 'Experimental Technology', desc: 'Nailgun 100 every 0.1s (100 nails), wrench 1,200. Sentry MK V "Bastion" with rockets and Mender MK III "Eden".', cost: 90000, damage: 100, cooldown: 0.1, ammo: 100, reload: 3.3, range: 20, hp: 5000, hidden: true,
        sword: wrench(1200, 1), buildEvery: 8, buildRange: 13, devices: [{ def: DEV.s5, max: 2 }, { def: DEV.m3, max: 1 }], repair: 0.2, teleporter: 2 },
    ],
  },

  // Void Traitor (new base, unlocked by beating Void mode; the old one is now its Inferno form).
  // Guessed: reach 7-8, Supporter stats, Strike circle size and spacing.
  traitor: {
    name: 'Void Traitor',
    event: 'Defeat VOID in Void mode',
    cost: 8000,
    limit: 4,
    flying: false,
    lead: true,
    melee: true,
    kindLabel: 'Multi',
    blurb: 'A huge-health melee tank whose sword hits several zombies at once. Lv 3 adds critical hits, Lv 4 a long-range Strike that blasts a line of circles in front of it, and Lv 5 summons Supporters onto the path and gives it a second life.',
    tip: 'Put it on the busiest stretch of path to soak up hits, with a Doctor or Medic nearby.',
    levels: [
      { name: 'Void Traitor', desc: '600 damage every 1.5s to up to 3 zombies.', damage: 600, cooldown: 1.5, range: 7, targets: 3, hp: 3000, hidden: false },
      { name: "Void's Wrath", desc: '750 damage, swings every 1s. More health.', cost: 4000, damage: 750, cooldown: 1, range: 7, targets: 3, hp: 5000, hidden: false },
      { name: 'Vindication', desc: 'Critical Hit: after 2 swings in a row, the next does 1.5x. 1,200 damage, more reach and health.', cost: 12000, damage: 1200, cooldown: 1, range: 8, targets: 3, hp: 8500, hidden: false,
        critEvery: { every: 3, mult: 1.5 } },
      { name: 'Ancient Magic', desc: 'Crits every other swing, 1,600 damage to up to 4 zombies. Strike: stands still 2s, then blasts a line of circles in front of it (2,000 / 3,000 / 5,000 / 7,500, harder the farther out).', cost: 24000, damage: 1600, cooldown: 1, range: 8, targets: 4, hp: 12500, hidden: false, blindImmune: true,
        critEvery: { every: 2, mult: 1.5 }, abilities: [strikeAb([2000, 3000, 5000, 7500], 2, 15)] },
      { name: 'Archangel', desc: '2,600 damage every 0.85s. Summon: a Void Traitor Supporter that fights on the path for 3 minutes. Stronger Strike. A second life (back 30s after it breaks).', cost: 75000, damage: 2600, cooldown: 0.85, range: 8, targets: 4, hp: 15000, hidden: false, blindImmune: true,
        critEvery: { every: 2, mult: 1.5 }, extraLife: { immune: 3, back: 30 }, supportMode: true,
        abilities: [strikeAb([3500, 5000, 7000, 10000], 1.5, 17), SUMMON_SUPPORTER] },
    ],
  },

  // Golden Zed (golden perk of Zed: buy it in the Loadout once you own Zed, then it replaces Zed):
  // a spawner that sends one golden tank down the path. It shoots, fires rockets from
  // Lv 2 and rams zombies (`bump`: damage per second to zombies it touches; it takes their contact
  // damage too), and explodes when destroyed. Rebuilt 30s after it's destroyed.
  // Changed from the spec: rockets are one splash hit (the spec's separate direct hit is left out).
  goldenZed: {
    name: 'Golden Zed',
    goldOf: 'zed',
    price: 50000,
    cost: 12000,
    limit: 1,
    kind: 'spawner',
    spawnEvery: 30,
    maxUnits: 1,
    blurb: 'The golden Zed, and the most expensive tower: a golden Zed tank driven by a Golden Commando. It drives down the path firing a machine gun, rams zombies for huge damage (ramming hurts it too) and explodes when destroyed. From Lv 2 it also fires rockets. A new one rolls out 30 seconds after it\'s destroyed, and upgrades send the new tank right away.',
    tip: 'Put a Doctor\'s medigun or Medics on its path... or just let it ram everything. Save up for it.',
    levels: [
      { name: 'Golden Zed', desc: 'Gun: 30 damage every 0.08s. Ram: 1,000 DPS. Explodes for 450 when destroyed. 3,000 health.', hidden: false,
        unit: gzed(1, 3000, 30, 0.08, 1000, 450) },
      { name: 'Cannons', desc: 'Rockets: 250 splash every 1.25s. Gun 40, ram 1,500 DPS, explosion 500. 4,500 health.', cost: 8000, hidden: false, spawnNow: true,
        unit: gzed(2, 4500, 40, 0.08, 1500, 500, { damage: 250, every: 1.25, radius: 3.5 }) },
      { name: 'Dual Miniguns', desc: 'Two machine guns: 40 damage every 0.04s. Explosion 600. 9,000 health.', cost: 28000, hidden: false, spawnNow: true,
        unit: gzed(3, 9000, 40, 0.04, 1500, 600, { damage: 250, every: 1.25, radius: 3.5 }) },
      { name: 'Laser Cannons', desc: 'Gun 120 every 0.06s, rockets 600 every 1.5s, ram 4,167 DPS, explosion 1,500. 25,000 health.', cost: 77000, hidden: true, spawnNow: true,
        unit: { ...gzed(4, 25000, 120, 0.06, 4167, 1500, { damage: 600, every: 1.5, radius: 4 }), hidden: true } },
      { name: 'Ascension', desc: 'Gun 200 every 0.05s, rockets 900, ram 7,500 DPS, explosion 3,000. 50,000 health.', cost: 300000, hidden: true, spawnNow: true,
        unit: { ...gzed(5, 50000, 200, 0.05, 7500, 3000, { damage: 900, every: 1.5, radius: 4.5 }), hidden: true } },
    ],
  },

  // Ice Apprentice (event): slow ice orbs (`arrow`) that pierce and freeze (not bosses).
  // Guessed: orb speed and range, freeze 0.5s (1.2s from Lv 4).
  iceApprentice: {
    name: 'Ice Apprentice',
    event: 'Event reward',
    cost: 1750,
    limit: 3,
    lead: true,
    bossStop: 0,
    kindLabel: 'Ice',
    blurb: 'A winter mage that shoots slow-flying ice orbs that pierce zombies and freeze them for a moment (not bosses). Lv 3 fires bursts of 4 orbs, Lv 4 adds an Ice Meteor that freezes a whole area, and Lv 5 a Blizzard that hits and freezes everything around it.',
    tip: 'Aim it down a long straight stretch of path so its orbs pierce more zombies.',
    levels: [
      { name: 'Ice Apprentice', desc: '200-damage ice orbs every 1.4s that pierce 2 zombies and briefly freeze them.', damage: 200, cooldown: 1.4, range: 18, arrow: { speed: 16, pierce: 2 }, freeze: 0.5, hp: 125, hidden: false },
      { name: 'Improved Magic', desc: '340 damage and faster orbs.', cost: 1500, damage: 340, cooldown: 1.4, range: 18, arrow: { speed: 22, pierce: 2 }, freeze: 0.5, hp: 165, hidden: false },
      { name: 'Quadra Barrage', desc: 'Bursts of 4 orbs 0.5s apart, 250 each. 400 DPS.', cost: 3000, damage: 250, burst: 4, burstGap: 0.5, cooldown: cycleFor(4, 250, 400), range: 18, arrow: { speed: 22, pierce: 2 }, freeze: 0.6, hp: 300, hidden: false },
      { name: 'Intense Magic', desc: 'Bursts of 7 orbs, 450 each, piercing 4 and freezing 1.2s. Ice Meteor: 2,500 damage in a large area and a 1.9s freeze (20s cooldown).', cost: 9000, damage: 450, burst: 7, burstGap: 0.5, cooldown: cycleFor(7, 450, 787.5), range: 20, arrow: { speed: 22, pierce: 4 }, freeze: 1.2, hp: 750, hidden: false,
        abilities: [meteorAb(2500, 8, 1.9, 20)] },
      { name: 'Ice Lord', desc: 'Orbs do 900. Meteor does 5,000 in a bigger area with a 2.2s freeze (15s cooldown). Blizzard: 400 every 0.5s to everything within 16 for 5s, freezing them.', cost: 38000, damage: 900, burst: 7, burstGap: 0.5, cooldown: cycleFor(7, 900, 1575), range: 22, arrow: { speed: 22, pierce: 4 }, freeze: 1.2, hp: 2500, hidden: false,
        abilities: [meteorAb(5000, 10, 2.2, 15), BLIZZARD] },
    ],
  },

  // Time Dilator: a time bubble (radius 26) around it. Fast mode: everything inside (towers,
  // zombies) runs faster; slow mode: slower (bosses are never slowed). Overlapping Dilators don't
  // stack (the highest level counts). Spawners count from Lv 2, ability cooldowns from Lv 4.
  // Not built: units inside the bubble keep normal speed; enemy attacks keep their timers.
  timeDilator: {
    name: 'Time Dilator',
    price: 8000,
    cost: 4500,
    limit: 2,
    kind: 'support',
    noBuff: true,
    noClone: true,
    kindLabel: 'Time',
    blurb: 'A robotic bunny that never attacks. Puts a time bubble around itself. Fast mode (orange): towers and zombies inside run faster. Slow mode (blue): they run slower, but bosses are never slowed. Time Warp flips the mode. From Lv 2 it changes spawner timers, and from Lv 4 ability cooldowns. Two Dilators don\'t stack, and range boosts don\'t work on it.',
    tip: 'Put it behind your defense so fast mode covers your towers but not the path, or put the path in slow mode and keep your towers out of the bubble.',
    levels: [
      { name: 'Time Dilator', desc: 'A time bubble: fast mode 1.1x, slow mode 0.9x. A stun turns the bubble off for 6s.', range: 26, dilate: dil(1.1, 0.9, false, false), hidden: false, abilities: [timeWarp(50)] },
      { name: 'Active Time Battle', desc: 'Fast mode 1.15x.', cost: 4000, range: 26, dilate: dil(1.15, 0.9, false, false), consumables: true, hidden: false, abilities: [timeWarp(50)] },
      { name: 'Paradox Limiters', desc: 'Spawners inside the bubble send units faster (or slower).', cost: 6000, range: 26, dilate: dil(1.15, 0.9, true, false), consumables: true, hidden: false, abilities: [timeWarp(50)] },
      { name: 'Hourglass Stabilizers', desc: 'Fast mode 1.2x, slow mode 0.85x.', cost: 13000, range: 26, dilate: dil(1.2, 0.85, true, false), consumables: true, hidden: false, abilities: [timeWarp(50)] },
      { name: 'Warp Drive', desc: 'Slow mode 0.8x, Time Warp every 25s, and tower ability cooldowns inside speed up or slow down too.', cost: 17000, range: 26, dilate: dil(1.2, 0.8, true, true), consumables: true, hidden: false, abilities: [timeWarp(25)] },
      { name: 'B.U.N.N.Y', desc: 'Fast mode 1.3x, slow mode 0.75x, and the bubble comes back 3s after a stun.', cost: 25000, range: 26, dilate: dil(1.3, 0.75, true, true, 3), consumables: true, hidden: false, abilities: [timeWarp(25)] },
    ],
  },
};
