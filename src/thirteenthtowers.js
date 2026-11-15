// Wave 13: new towers.
//   Technomancer: an alternate Hacker form. Fires bursts of shots, places a Hologram (a pad any
//                 tower can stand on), hijacks the tower on it for boosts, and clones it (Utopia).
//   Frostreaver: an alternate Sledger form. A melee fighter that freezes the zombie it hits and
//                grows Ice Crystals that boost it and pay for its abilities.
//   Artisan: an alternate Engineer form. A shotgun that collects Scrap, which it spends on two
//            buildings (Skirmisher, Atelier) and their upgrades. Can teleport anywhere.
//
// New mechanics (sim code in sim/parts/weapons7.js):
//   techno: { hijack }  Technomancer.
//       Hologram ability (key 'hologram'): puts its pad at a spot in range (once). Any of your
//       towers can be placed on the pad, on any ground (canPlace in map.js reads t.pad).
//       Selling the Technomancer sells the tower on its pad too.
//       hijack (Lv 3): the tower on the pad gives it boosts: for damage, firerate and range, half of
//       how much more that tower has than the Technomancer (a third less if that tower isn't max
//       level), each at most HIJACK_CAP (computeBuffs in sim/parts/shared.js).
//       Utopia ability (key 'utopia', Lv 4): a free 30s hologram copy of the tower on the pad.
//   frost: { grow, max, pct, freeze, burst }  Frostreaver (updateFrostreaver).
//       Each hit freezes its target for `freeze` s (+0.2 s per crystal; bosses never freeze).
//       Ice Crystals (Lv 1): one grows every `grow` s (every hit takes 1 s off the wait), up to
//       `max`. Each crystal: +`pct` damage, +0.2 s freeze, 0.5% of the zombie's freeze resistance
//       ignored. 5 or more: can't be stunned. burst (Lv 4): every FROST_BURST_EVERY-th hit is a
//       Frost Burst: damage x (crystals + 4)^1.1.
//       Abilities cost crystals (`crystals` on the ability): Crystal Burst (Frost Burn in an
//       area), Path Crystal (a block of ice on the path), Frost Wisp (a wisp on one of your towers
//       that attacks with power from that tower's damage a second).
//       Frost Burn = chill (sim applyChill): slows and hurts a little every second.
//   artisan: { pct, cap, skirm, atel }  Artisan.
//       Every shot gives Scrap = `pct` x the damage its pellets did (before damage boosts; a pellet
//       that already went through a zombie counts half), at least 1, up to `cap`.
//       Build Skirmisher / Build Atelier abilities (`build` = the building's tower key, `scrap` its
//       price) put a building in its range; one of each at a time. Buildings are towers with
//       `building: true`: they last BUILD_LIFE + 5 s per Artisan level, and blow up when they run out
//       or are sold (`blast`, by building level). Their upgrades cost Scrap (`cost` = Scrap) from
//       their Artisan, which must be in its range; `skirm` / `atel` = the highest building level
//       this Artisan level allows. An upgrade starts the building's time over.
//       atelier: { pulse, buff, time, unstun } on the Atelier: every `pulse` s it boosts towers in
//       its range by `buff` for `time` s, in turn firerate, damage, range (not other Ateliers).
//       unstun: its pulses end stuns. Wanderer (Lv 5): moves one of your towers for WANDER_SCRAP.

// ---------------------------------------------------------------- Technomancer

const HOLOGRAM = { key: 'hologram', name: 'Hologram', desc: 'Place a Hologram pad in range. Any tower can stand on it (ground, cliff or water towers). Selling the Technomancer sells the tower on it too', cooldown: 1, aim: true, radius: 1.5 };
const UTOPIA = { key: 'utopia', name: 'Utopia', desc: 'Make a hologram copy of the tower on your Hologram for 30s. It can go on ground or cliffs, and copies don\'t count toward tower limits', cooldown: 60, aim: true, clone: 0, life: 30, anySpot: true };

// ---------------------------------------------------------------- Frostreaver

// Frost Burn (a chill that hurts): slow, time and damage a second are guesses. Crystal Burst: dps =
// frost.burn x tower damage; Path Crystal: 10 a second.
const frostBurn = (dps) => ({ chill: 1, maxSlow: 0.4, chillTime: 5, chillDps: dps });
const CRYSTAL_BURST = { key: 'crystalBurst', name: 'Crystal Burst', crystals: 1, cooldown: 1, aim: true, reach: 20, radius: 5,
  desc: 'Spend 1 crystal: strike an area (within 20) for the tower\'s damage and put Frost Burn on every zombie in it (slows and hurts a little every second for 5s)' };
const pathCrystal = (hp) => ({ key: 'pathCrystal', name: 'Path Crystal', crystals: 2, cooldown: 1, aim: true, reach: 25, radius: 6,
  unit: { name: 'Path Crystal', model: 'iceshard', hp, life: 60, speed: 0, still: true, flying: false, bump: 25, explode: { damage: 0, radius: 6, chill: frostBurn(10) } },
  desc: `Spend 2 crystals: put a chunk of ice (${hp.toLocaleString()} HP) on the path. Zombies stop to break it, and when it breaks it puts Frost Burn on every zombie within 6` });
const FROST_WISP = { key: 'frostWisp', name: 'Frost Wisp', crystals: 3, cooldown: 1, aim: true,
  desc: 'Spend 3 crystals: put a Frost Wisp on one of your towers. It stays for good and attacks zombies in that tower\'s range, stronger the more damage a second the tower does. Up to 5 per Frostreaver' };

// ---------------------------------------------------------------- Artisan

const RELOCATION = { key: 'teleport', name: 'Relocation', desc: 'Teleport the Artisan anywhere on the map', cooldown: 10, aim: true, reach: 999 };
const BUILD_SKIRM = { key: 'buildSkirm', name: 'Build Skirmisher', build: 'artisanSkirmisher', scrap: 30, cooldown: 20, aim: true,
  desc: '30 Scrap: build a Skirmisher turret in range. It locks on to a zombie, then shoots very fast for low damage' };
const BUILD_ATEL = { key: 'buildAtel', name: 'Build Atelier', build: 'artisanAtelier', scrap: 55, cooldown: 20, aim: true,
  desc: '55 Scrap: build an Atelier in range. It boosts towers near it in turn: firerate, damage, range (not other Ateliers)' };
const WANDERER = { key: 'wanderer', name: 'Wanderer', cooldown: 10, aim: true,
  desc: 'Teleport one of your towers to a new spot. Moving a tower that isn\'t the Artisan costs 200 Scrap' };
const artisan = (o) => ({ cap: 200, skirm: 0, atel: -1, ...o });
const ART_AB = (lv) => [RELOCATION, BUILD_SKIRM, ...(lv >= 2 ? [BUILD_ATEL] : []), ...(lv >= 5 ? [WANDERER] : [])];

// ---------------------------------------------------------------- Lament (evolved Gunner)

// Butterfly Gathering: one button that cycles White -> Black -> Sorrow (sim/parts/weapons8.js).
const BUTTERFLY = { key: 'butterfly', name: 'Butterfly Gathering', cooldown: 0.2,
  desc: 'Switch mode: White (after a kill, shoot White next; reloads turn some Black into White), Black (reloads turn some White into Black) or Sorrow (with 3+ Black, spend 1 more Black for 1 more Sinking)' };

// ---------------------------------------------------------------- Vulcan (evolved Warrior)

// Vulcan Straight: needs 10 Ignition. The cooldown is the spec's 18s (the spec's "6s" is not used).
const VULCAN_STRAIGHT = { key: 'vulcanStraight', name: 'Vulcan Straight', cooldown: 18,
  desc: 'Needs 10 Ignition: spends it all to slash a wide area in front for 10x damage, then Cinctura Ignis hits every zombie around it for half its damage (burning zombies take 50% more, plus their burn)' };

export const THIRTEENTH_TOWERS = {
  // Lament (evolved Gunner): dual pistols, one white and one black, that put Sinking on zombies.
  // lament: { ammo, chance, lv3, ds, salv, fun, funGive, deluge } - see sim/parts/weapons8.js.
  // Vulcan (evolved Warrior): a burning greatsword. vulcan: { ign, burnMult, tick, frag, frontal }
  // - see sim/parts/weapons8.js.
  evoVulcan: {
    name: 'Vulcan',
    altOf: 'enforcer',
    evolved: true,
    evoFrom: 'enforcerWarrior',
    evoLevel: 20,
    form: 'Vulcan',
    price: 8000,
    shards: 3,
    cost: 850,
    limit: 5,
    melee: true,
    lead: false,
    flying: false,
    kindLabel: 'Fire',
    blurb: 'The evolved Warrior. A flaming greatsword that sets zombies on fire with every hit, and burns stack. Each hit also gives it Ignition, which makes its burns hotter. From Lv 2 its hot hits make zombies take more fire damage, and at max level it unleashes Vulcan Straight.',
    tip: 'Keep it swinging: Ignition is lost after 4s without a hit. Fire towers near it love its Burn Fragility.',
    levels: [
      { name: 'Vulcan', desc: 'Slashes for 10 every 1.4s and sets the zombie on fire for 1s (25% of its damage per tick, burns stack). Every hit: +1 Ignition (up to 6), +1 burn damage each. Ignition is lost after 4s without a hit.', damage: 10, cooldown: 1.4, range: 5, hidden: false,
        vulcan: { ign: 6, tick: 0.5 } },
      { name: 'Enspark', desc: '+2 damage, and hits on burning zombies do 25% more.', cost: 500, damage: 12, cooldown: 1.4, range: 5, hidden: false,
        vulcan: { ign: 6, tick: 0.5, hot: 0.25 } },
      { name: 'Ignition Blade II', desc: '+6 damage, swings every 1.2s and hidden detection. At 6+ Ignition, hits give 15% Burn Fragility: more fire damage taken (only stacks with other kinds of towers).', cost: 1900, damage: 18, cooldown: 1.2, range: 5, hidden: true,
        vulcan: { ign: 6, tick: 0.5, hot: 0.25, frag: 0.15 } },
      { name: 'Ignition Blade V', desc: 'Enspark: 50% more on burning zombies. Burns tick twice as fast (every 0.25s). Up to 10 Ignition and +1 range.', cost: 6000, evo: 5, damage: 18, cooldown: 1.2, range: 6, hidden: true,
        vulcan: { ign: 10, tick: 0.25, hot: 0.5, frag: 0.15 } },
      { name: 'Inferno', desc: '+14 damage and 25% Burn Fragility. New ability: Vulcan Straight.', cost: 19042, evo: 10, damage: 32, cooldown: 1.2, range: 6, hidden: true,
        vulcan: { ign: 10, tick: 0.25, hot: 0.5, frag: 0.25 }, abilities: [VULCAN_STRAIGHT] },
    ],
  },

  evoLament: {
    name: 'Lament',
    altOf: 'soldier',
    evolved: true,
    evoFrom: 'soldierGunner',
    evoLevel: 20,
    form: 'Lament',
    price: 6000,
    shards: 3,
    cost: 600,
    limit: 2,
    flying: false,
    kindLabel: 'Sinking',
    blurb: 'The evolved Gunner. Two pistols, one white and one black. Every shot hits a narrow area in front of it and puts Sinking on zombies: when a zombie with Sinking is hit, some of its Sinking turns into true damage. From Lv 1 it shoots Butterfly ammo of two shades, and its passives get stronger the more (or the less) ammo it has.',
    tip: 'White shots add Sinking, Black shots make Sinking hit harder. Try each Butterfly Gathering mode to see which one fits your map.',
    levels: [
      { name: 'Lament', desc: 'Shoots a narrow area in front of it for 2 every 1.1s, and puts 2 Sinking on each zombie hit.', damage: 2, cooldown: 1.1, range: 12, hidden: false,
        sink: 2, lament: {} },
      { name: 'Lament for the Living', desc: 'Butterfly ammo: 5 White and 5 Black (up to 9), shot in turn, reloads when both run out. A kill makes the next shot Black. White: +1 Sinking and +1 Black. Black: +20% Sinking damage. Lament: a 40% chance (+20% per White) for an extra true damage hit, and double Sinking. New ability: Butterfly Gathering.', cost: 600, damage: 2, cooldown: 1.1, range: 12, hidden: false,
        sink: 2, lament: { ammo: true, chance: 0.4 }, abilities: [BUTTERFLY] },
      { name: 'Celebration for the Departed', desc: 'Deathseeker: each hit has a 50% chance (+10% for each ammo the lower shade is below 5) to hit 3 more times, with half Sinking damage. Salvation: every 2 shots, 0.08s faster (up to 5 times, fades after 2s). Funeral: while one shade is empty, shoots every 0.3s, until it stops for 3s, then reloads.', cost: 3000, damage: 2, cooldown: 1.1, range: 12, hidden: false,
        sink: 2, lament: { ammo: true, chance: 0.4, ds: 3, salv: true, fun: 0.3 }, abilities: [BUTTERFLY] },
      { name: 'A Butterfly Takes Flight', desc: '+1 damage, shoots every 0.9s and hidden detection. Lament: +20% damage per 3 White, +10% chance per 2 Black. Funeral: when it starts, adds 4 ammo to the lowest shade.', cost: 7000, evo: 5, damage: 3, cooldown: 0.9, range: 12, hidden: true,
        sink: 2, lament: { ammo: true, chance: 0.4, lv3: true, ds: 3, salv: true, fun: 0.3, funGive: 4 }, abilities: [BUTTERFLY] },
      { name: 'Funeral of Death Butterflies', desc: '+4 damage and shoots every 0.7s. Deathseeker hits 8 times. Funeral: every 0.25s. Sinking Deluge: on a zombie with 12+ Sinking, spends 8 for double damage and every Deathseeker hit lands.', cost: 29000, evo: 10, damage: 7, cooldown: 0.7, range: 12, hidden: true,
        sink: 2, lament: { ammo: true, chance: 0.4, lv3: true, ds: 8, salv: true, fun: 0.25, funGive: 4, deluge: true }, abilities: [BUTTERFLY] },
    ],
  },

  // Technomancer (alternate Hacker form): bursts of shots. The cycle (`cooldown`) is the burst
  // time plus the spec's 3s rest.
  hackerTechnomancer: {
    name: 'Technomancer',
    altOf: 'hacker',
    form: 'Technomancer',
    shards: 1,
    price: 0,
    cost: 3500,
    limit: 4,
    lead: false,
    burstGap: 0.1,
    kindLabel: 'Burst',
    blurb: 'An alternate Hacker that fires bursts of 8 shots. From Lv 2 it places a Hologram: a pad that any of your towers can stand on, even water or cliff towers. From Lv 3 it hijacks the tower on the pad and gets boosts from it. At Lv 4 Utopia makes a free copy of that tower for 30s.',
    tip: 'Put your strongest tower on its Hologram: the Technomancer gets half of what that tower has more than it (damage, firerate, range).',
    levels: [
      { name: 'Technomancer', desc: 'Fires a burst of 8 shots for 8 every 3s.', damage: 8, burst: 8, cooldown: 3.7, range: 16, hidden: false,
        techno: {} },
      { name: 'Improved Kit', desc: '+2 damage, +2 range, and hidden detection.', cost: 1250, damage: 10, burst: 8, cooldown: 3.7, range: 18, hidden: true,
        techno: {} },
      { name: 'Hologram', desc: '+4 damage. New ability: Hologram, a pad any tower can stand on.', cost: 4000, damage: 14, burst: 8, cooldown: 3.7, range: 18, hidden: true,
        techno: {}, abilities: [HOLOGRAM] },
      { name: 'Hijack', desc: '+6 damage. The tower on the Hologram is hijacked: the Technomancer gets half of how much more damage, firerate and range it has (a third less if it isn\'t max level).', cost: 12000, damage: 20, burst: 8, cooldown: 3.7, range: 18, hidden: true,
        techno: { hijack: true }, abilities: [HOLOGRAM] },
      { name: 'Technological Wonder', desc: 'Bursts of 15 shots (from 8), and faster ones. New ability: Utopia, a free 30s copy of the tower on the Hologram.', cost: 40000, damage: 20, burst: 15, burstGap: 0.08, cooldown: 4.12, range: 18, hidden: true,
        techno: { hijack: true }, abilities: [HOLOGRAM, UTOPIA] },
    ],
  },

  // Frostreaver (alternate Sledger form): a dark grey armoured ice knight with neon blue lights.
  sledgerFrostreaver: {
    name: 'Frostreaver',
    altOf: 'sledger',
    form: 'Frostreaver',
    shards: 1,
    price: 0,
    cost: 1400,
    limit: 2,
    melee: true,
    flying: false,
    lead: true,
    hitsFrozen: true,
    kindLabel: 'Freeze',
    blurb: 'An alternate Sledger in dark armour: a melee fighter with big single hits that freeze the zombie it hits. From Lv 1 it grows Ice Crystals that circle it and make it stronger, and from Lv 2 it spends them on abilities: Crystal Burst, Path Crystal and (Lv 5) Frost Wisps that fight from your other towers. Bosses never freeze.',
    tip: 'Every hit makes the next crystal come 1s sooner, so keep it busy. Save 5 crystals and it can\'t be stunned.',
    levels: [
      { name: 'Frostreaver', desc: 'Hits one zombie for 30 every 2.5s and freezes it for 3s.', damage: 30, cooldown: 2.5, range: 5, hidden: false,
        frost: { freeze: 3 } },
      { name: 'Subzero', desc: '+20 damage. Ice Crystals: one grows every 45s (each hit makes it 1s sooner), up to 3. Each gives +3% damage, +0.2s freeze and ignores 0.5% freeze resistance. 5 or more: can\'t be stunned.', cost: 1400, damage: 50, cooldown: 2.5, range: 5, hidden: false,
        frost: { freeze: 3, grow: 45, max: 3, pct: 0.03 } },
      { name: 'Elementalist', desc: '+15 damage, 2 more crystals (5). New ability: Crystal Burst.', cost: 3890, damage: 65, cooldown: 2.5, range: 5, hidden: false,
        frost: { freeze: 3, grow: 45, max: 5, pct: 0.03, burn: 0.15 }, abilities: [CRYSTAL_BURST] },
      { name: 'Crystal Mastery', desc: '+35 damage, +4% damage per crystal (from 3%). New ability: Path Crystal.', cost: 6400, damage: 100, cooldown: 2.5, range: 5, hidden: false,
        frost: { freeze: 3, grow: 45, max: 5, pct: 0.04, burn: 0.15 }, abilities: [CRYSTAL_BURST, pathCrystal(500)] },
      { name: 'Saint Jay', desc: 'Freezes for 3.5s, a crystal every 30s, and every 5th hit is a Frost Burst: damage x (crystals + 4)^1.1.', cost: 9950, damage: 100, cooldown: 2.5, range: 5, hidden: false,
        frost: { freeze: 3.5, grow: 30, max: 5, pct: 0.04, burn: 0.15, burst: true }, abilities: [CRYSTAL_BURST, pathCrystal(1000)] },
      { name: 'Icicle Zero', desc: '+150 damage, +1s freeze, +1 range, 2 more crystals (7) and +5% damage per crystal. New ability: Frost Wisp.', cost: 23450, damage: 250, cooldown: 2.5, range: 6, hidden: false,
        frost: { freeze: 4.5, grow: 30, max: 7, pct: 0.05, burn: 0.15, burst: true }, abilities: [CRYSTAL_BURST, pathCrystal(2500), FROST_WISP] },
    ],
  },

  // Artisan (alternate Engineer form). Scrap caps after Lv 1 are guesses: the spec only gives the
  // base 200, but later building upgrades cost up to 4,000.
  engineerArtisan: {
    name: 'Artisan',
    altOf: 'sentryEngineer',
    form: 'Artisan',
    shards: 1,
    price: 0,
    cost: 700,
    limit: 1,
    lead: true,
    kindLabel: 'Builder',
    blurb: 'An alternate Engineer with a scrap shotgun. Every shot collects Scrap, which it spends on buildings: a Skirmisher turret, and from Lv 2 an Atelier that boosts towers near it. Buildings last about a minute, then blow up. Upgrade them with Scrap while the Artisan is near. It can teleport anywhere, and at max level move your other towers too (Wanderer).',
    tip: 'Keep it shooting so Scrap keeps coming in. Put the Atelier next to your strongest towers.',
    levels: [
      { name: 'Artisan', desc: 'Shotgun: 3 pellets for 2 every 1.8s. 40% of the damage it does becomes Scrap (holds 200). Builds Skirmishers.', damage: 2, pellets: 3, cooldown: 1.8, range: 8, cone: 0.22, hidden: false,
        artisan: artisan({ pct: 0.4 }), abilities: ART_AB(0) },
      { name: 'Scavenger', desc: '4 pellets (from 3), and 50% of its damage becomes Scrap.', cost: 450, damage: 2, pellets: 4, cooldown: 1.8, range: 8, cone: 0.22, hidden: false,
        artisan: artisan({ pct: 0.5 }), abilities: ART_AB(1) },
      { name: 'Frontline Support', desc: '+2 damage. It can build the Atelier and upgrade the Skirmisher to Lv 1. Holds 300 Scrap.', cost: 1300, damage: 4, pellets: 4, cooldown: 1.8, range: 8, cone: 0.22, hidden: false,
        artisan: artisan({ pct: 0.5, cap: 300, skirm: 1, atel: 0 }), abilities: ART_AB(2) },
      { name: 'Battle Ready', desc: '+2 damage, shoots faster (every 1.8s > 1.4s), and it can upgrade the Atelier to Lv 1. Holds 400 Scrap.', cost: 3800, damage: 6, pellets: 4, cooldown: 1.4, range: 8, cone: 0.22, hidden: false,
        artisan: artisan({ pct: 0.5, cap: 400, skirm: 1, atel: 1 }), abilities: ART_AB(3) },
      { name: 'Revisioned Blueprints', desc: '6 pellets, 75% of its damage becomes Scrap, and both buildings can go to Lv 2. Holds 1,000 Scrap.', cost: 14000, damage: 6, pellets: 6, cooldown: 1.4, range: 8, cone: 0.22, hidden: false,
        artisan: artisan({ pct: 0.75, cap: 1000, skirm: 2, atel: 2 }), abilities: ART_AB(4) },
      { name: 'The Seventh Architect', desc: '+6 damage, both buildings can go to Lv 3, and it holds 4,000 Scrap. New ability: Wanderer, move any of your towers.', cost: 40000, damage: 12, pellets: 6, cooldown: 1.4, range: 8, cone: 0.22, hidden: false,
        artisan: artisan({ pct: 0.75, cap: 4000, skirm: 3, atel: 3 }), abilities: ART_AB(5) },
    ],
  },

  // Artisan buildings (not in the shop). Upgrade `cost` is Scrap. blast: damage when it blows up.
  artisanSkirmisher: {
    name: 'Skirmisher',
    building: true,
    cost: 0,
    limit: 99,
    lead: true,
    kindLabel: 'Building',
    blurb: 'A turret the Artisan built. It locks on to a zombie, then shoots very fast. It blows up when its time runs out or it is sold. Upgrade it with the Artisan\'s Scrap.',
    tip: 'Its upgrades cost Scrap, and the Artisan must be close to it.',
    levels: [
      { name: 'Skirmisher', desc: 'Locks on for 0.6s, then shoots every 0.2s for 2.5.', damage: 2.5, cooldown: 0.2, range: 12, lockOn: 0.6, hidden: false, blast: 40 },
      { name: 'Smart Targeting', desc: 'Shoots faster (every 0.12s), +1.5 damage, locks on in 0.4s, and hidden detection.', cost: 180, damage: 4, cooldown: 0.12, range: 12, lockOn: 0.4, hidden: true, blast: 150 },
      { name: 'Armor Piercing Rounds', desc: '+9 damage, +6 range, and ignores 80% of resistance.', cost: 650, damage: 13, cooldown: 0.12, range: 18, lockOn: 0.4, resistPierce: 0.8, hidden: true, blast: 500 },
      { name: 'Annihilator Core', desc: '+4 damage, shoots every 0.04s, and fires rockets (85 in a blast every 1.5s).', cost: 4000, damage: 17, cooldown: 0.04, range: 18, lockOn: 0.4, resistPierce: 0.8, hidden: true, blast: 1500,
        rockets: { every: 1.5, damage: 85, radius: 3 } },
    ],
  },
  artisanAtelier: {
    name: 'Atelier',
    building: true,
    cost: 0,
    limit: 99,
    kind: 'support',
    kindLabel: 'Building',
    blurb: 'A workshop the Artisan built. Every few seconds it pulses and boosts towers near it, in turn: firerate, damage, range. It can\'t boost other Ateliers. It blows up when its time runs out or it is sold.',
    tip: 'Its upgrades cost Scrap, and the Artisan must be close to it.',
    levels: [
      { name: 'Atelier', desc: 'Every 10s: +15% firerate, damage or range (in turn) for 12.5s to towers in range.', range: 12, hidden: false, blast: 40,
        atelier: { pulse: 10, buff: 0.15, time: 12.5 } },
      { name: 'Quick Fix', desc: '+20% boosts, a pulse every 7.5s, +3 range.', cost: 250, range: 15, hidden: false, blast: 150,
        atelier: { pulse: 7.5, buff: 0.2, time: 12.5 } },
      { name: 'Full Charge', desc: '+25% boosts that last 20s.', cost: 800, range: 15, hidden: false, blast: 500,
        atelier: { pulse: 7.5, buff: 0.25, time: 20 } },
      { name: 'Prime Purifier', desc: '+35% boosts, a pulse every 5s, and pulses end stuns.', cost: 2500, range: 15, hidden: false, blast: 1500,
        atelier: { pulse: 5, buff: 0.35, time: 20, unstun: true } },
    ],
  },
};
