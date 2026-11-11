// Towers: event towers, waves 3 to 5. Elf Camp, Jester, Cryomancer, Harvester, Elementalist,
// Firework Technician, Biologist, Warlock, Spotlight, Star Cannon, Relic, MLRS, Psycho, Bubble.
// One group of the TOWERS table. config.js joins the groups in order (see TOWERS there).
// Shared units and abilities (MERC, AP_AB, ...) come from shared.js.
import {
  BUBBLE_BUDDY, CARPET_BOMB_AB, ELEMENT_AB, ELF, PSYCHO_MORTAR, RELIC, TELEPORT_AB, heatwaveAb, iceTurret,
  iceTurretAb, ivy, jumpAb, nightshade, psychoRail, psychoRockets, psychoSlam, sunflower, targetSelectAb, thornsAb,
} from './shared.js';

export const TOWERS_EVENT_2 = {
  // ---------------------------------------------------------------- event towers (wave 3)
  // Elf Camp: see ELF for the unit fields. maxUnits counts every elf it has out.
  elfCamp: {
    name: 'Elf Camp',
    event: 'Event reward',
    cost: 300,
    limit: 4,
    kind: 'spawner',
    spawnEvery: 10,
    maxUnits: 30,
    noBuff: true,
    blurb: "A cheap tower that doesn't attack. It keeps sending friendly elves down the path that crash into zombies, throw snowballs, shoot or explode. Elf crashes and explosions ignore armor, but most elves are fragile, they walk right through Ghosts, and support towers can't boost them.",
    tip: 'Bomber Elf explosions are great for clearing early crowds.',
    levels: [
      { name: 'Elf Camp', desc: 'Sends an Elf (6 HP) every 10s that crashes into zombies.', hidden: false, unit: ELF.basic },
      { name: "Sno'ball Training", desc: 'Also sends a Snowball Elf every 10s that stays back and throws snowballs (1.6 damage every 2s).', cost: 750, hidden: false,
        unit: ELF.basic, unit2: ELF.snowball, spawnEvery2: 10 },
      { name: 'Unpaid Labor', desc: 'Snowball Elves become Cannoneer Elves (1.6 damage every 0.5s), and Bomber Elves explode for 18 when they go down (lead detection).', cost: 2022, hidden: false,
        unit: ELF.basic, unit2: ELF.cannon, spawnEvery2: 12, unit3: ELF.bomber, spawnEvery3: 10 },
      { name: 'Cookie Cutting', desc: 'Elves become sword-swinging Guardian Elves, and Cannoneers become Gunner Elves that fire 5-shot bursts. Both see hidden zombies.', cost: 4500, hidden: false,
        unit: ELF.guardian, unit2: ELF.gunner, spawnEvery2: 25, unit3: ELF.bomber, spawnEvery3: 10 },
      { name: 'A Violent Night', desc: 'Tougher, harder-hitting Guardians with 30% defense, Gunners in pairs that fire faster, flying Gift Bombers, and the 400 HP Ripped Elf.', cost: 12012, hidden: false,
        unit: ELF.guardian2, unit2: ELF.gunner2, spawnEvery2: 25, unit3: ELF.gift, spawnEvery3: 50, unit4: ELF.ripped, spawnEvery4: 100 },
    ],
  },
  // Jester: lobs trick bombs. bombs: the bomb types this level has unlocked; the player picks one
  // per `slots` in the tower panel (tower field `choice`). Every bomb thrown has the effects of
  // every picked type. Its blast is the biggest `radius` of the picked types, and it does the
  // biggest `mult` of their damage. Only Fire bombs can hit lead zombies.
  //   fire: { dps, time } sets them on fire. ice: chill (see Freezer) and `melt` armor.
  //   poison: see Toxic Gunner. confuse: { time, cd } walks them backwards (not bosses).
  jester: {
    name: 'Jester',
    event: 'Event reward',
    flying: false,
    lead: true,
    cost: 650,
    limit: 8,
    lob: 0.8,
    kindLabel: 'Splash',
    blurb: 'Lobs trick bombs, and you pick which kind in its panel: Fire bombs burn, Ice bombs slow, Poison bombs poison and Confusion bombs make zombies walk backwards. Low range and a slow throw, and it can\'t hit flying zombies. Only Fire bombs hurt lead zombies.',
    tip: 'Switch bombs whenever you like, for free. Confusion bombs work best far from where the zombies come in.',
    levels: [
      { name: 'Jester', desc: 'Throws fire bombs that set zombies on fire.', damage: 4, cooldown: 1.2, range: 10, radius: 3, slots: 1, hidden: false,
        bombs: { fire: { radius: 3, mult: 1, dps: 1, time: 3 } } },
      { name: 'Trained Juggling', desc: 'Damage 1.8 → 2.7, burns +0.4, throws faster and more range.', cost: 400, damage: 6, cooldown: 1, range: 12.3, radius: 3, slots: 1, hidden: false,
        bombs: { fire: { radius: 3, mult: 1, dps: 2, time: 3 } } },
      { name: 'Cold Humor', desc: 'Damage 2.7 → 4.5, burns +0.5 and more range. Unlocks the Ice Bomb: 20% damage, but a 25% slow for 3s in a big blast.', cost: 670, damage: 10, cooldown: 1, range: 13, radius: 3, slots: 1, hidden: false,
        bombs: { fire: { radius: 3, mult: 1, dps: 3, time: 3 }, ice: { radius: 6, mult: 0.2, chill: 1, maxSlow: 0.25, chillTime: 3 } } },
      { name: 'Potent Bombs', desc: 'Damage 4.5 → 14, burns +2.7 and hidden detection. Bigger Ice blasts that melt 1% of armor. Unlocks the Poison Bomb: 1.4 damage every 0.4s for 30s.', cost: 2750, damage: 30, cooldown: 1, range: 13, radius: 3, slots: 1, hidden: true,
        bombs: { fire: { radius: 3, mult: 1, dps: 9, time: 3 }, ice: { radius: 7, mult: 0.2, chill: 1, maxSlow: 0.25, chillTime: 3, melt: 0.01 }, poison: { radius: 3, mult: 1, damage: 3, tick: 0.4, time: 30, slow: 0 } } },
      { name: 'Harlequin of Doom', desc: 'Damage 14 → 22, burns +2.7, poison +0.9, throws faster, more range, and a second bomb slot: two bomb types at once. Unlocks the Confusion Bomb (zombies walk backwards for 2s).', cost: 8500, damage: 48, cooldown: 0.6, range: 16, radius: 3, slots: 2, hidden: true,
        bombs: { fire: { radius: 3, mult: 1, dps: 15, time: 3 }, ice: { radius: 7, mult: 0.2, chill: 1, maxSlow: 0.25, chillTime: 3, melt: 0.01 }, poison: { radius: 3, mult: 1, damage: 5, tick: 0.4, time: 30, slow: 0 },
          confuse: { radius: 3, mult: 0, time: 2, cd: 6 } } },
    ],
  },
  // Cryomancer: a frost beam that hits up to `targets` zombies (see Freezer for chill, Frost
  // Blaster for melt / freezeNext). chillDps: chilled zombies take this much damage per second.
  // Ammo: it fires until its tank is empty, then reloads. Not used by the game yet (kept for
  // later): beamWidth (how wide the beam is; it just hits `targets` zombies for now).
  cryomancer: {
    name: 'Cryomancer',
    event: 'Event reward',
    flying: false,
    lead: true,
    cost: 250,
    limit: Infinity,
    freezeNext: true,
    kindLabel: 'Slow',
    blurb: 'A cheap support tower that sprays a frost beam over several zombies. Each hit slows them a little more and melts their armor. No damage until Lv 3 (Lv 2 makes slowed zombies take damage), and from Lv 5 it freezes. No hidden or flying detection.',
    tip: 'Not for early defense. Several Cryomancers stall crowds and bosses really well.',
    levels: [
      { name: 'Cryomancer', desc: 'A frost beam that slows up to 3 zombies by 7.5% per hit (up to 15%) and melts 5% of their armor. No damage.', damage: 0, cooldown: 0.2, range: 11, targets: 3, chill: 0.5, maxSlow: 0.15, chillTime: 2, melt: 0.05, ammo: 50, reload: 2, beamWidth: 1.25, hidden: false },
      { name: 'Frosty Gear', desc: 'More range, and a stronger, longer slow: 10% per hit, up to 20%, for 3s.', cost: 200, damage: 0, cooldown: 0.2, range: 13.5, targets: 3, chill: 0.5, maxSlow: 0.2, chillTime: 3, melt: 0.05, ammo: 50, reload: 2, beamWidth: 1.25, hidden: false },
      { name: 'Freezing Tanks', desc: 'Slowed zombies take 1.8 damage every second, 7% armor melt and 25 more ammo.', cost: 935, damage: 0, cooldown: 0.2, range: 13.5, targets: 3, chill: 0.5, maxSlow: 0.2, chillTime: 3, chillDps: 3, melt: 0.07, ammo: 75, reload: 2, beamWidth: 1.25, hidden: false },
      { name: 'Ice Commando', desc: 'The beam does 1.8 damage, slowed zombies take 3 a second, it hits 4 zombies, and slows 12.5% per hit up to 25% for 5s.', cost: 2750, damage: 3, cooldown: 0.2, range: 13.5, targets: 4, chill: 0.5, maxSlow: 0.25, chillTime: 5, chillDps: 5, melt: 0.07, ammo: 75, reload: 2, beamWidth: 1.75, hidden: false },
      { name: "Winter's Fury", desc: 'Damage 1.8 → 3.6, slowed zombies take 6 a second, more range, hits 6 zombies, faster reloads, 20 more ammo, 10% armor melt, and a hit on a fully slowed zombie freezes it for 0.75s.', cost: 6250, damage: 6, cooldown: 0.2, range: 15, targets: 6, chill: 0.5, maxSlow: 0.25, chillTime: 5, chillDps: 10, chillFreeze: 0.75, melt: 0.1, ammo: 95, reload: 1.25, beamWidth: 2.25, hidden: false },
    ],
  },
  // Hallow Punk (alternate Hallowboomer form): homing rockets (`fly`: their speed, or the level's
  // `speed`) that burst in a blast, knocking zombies back `knock` (see knockBack).
  hallowboomerPunk: {
    name: 'Hallow Punk',
    altOf: 'hallowboomer',
    form: 'Punk',
    shards: 1,
    price: 0,
    flying: false,
    lead: true,
    cost: 500,
    limit: 10,
    fly: 35,
    blurb: 'An alternate Hallowboomer that fires homing rockets. The blasts hit a crowd and knock zombies back, and from Lv 3 they set them on fire. A slow fire rate, and it can\'t ignore armor.',
    tip: 'Place a few early for crowds. Strongest targeting gets the most damage; Random spreads the fire around once it burns.',
    levels: [
      { name: 'Hallow Punk', desc: 'Homing rockets: 12 damage in a blast that knocks zombies back.', damage: 12, cooldown: 4.5, range: 18, radius: 3, speed: 35, knock: 10, hidden: false },
      { name: 'Bewitching Blaze', desc: 'Damage 12 → 18, fires faster, more range and a bigger blast.', cost: 300, damage: 18, cooldown: 4, range: 21, radius: 3.5, speed: 35, knock: 10, hidden: false },
      { name: 'Vengeful Missiles', desc: 'Damage 18 → 50, faster rockets, hidden detection, and rockets set zombies on fire (6 a second for 6s).', cost: 2700, damage: 50, cooldown: 4, range: 21, radius: 3.5, speed: 45, knock: 10, ignite: { dps: 6, time: 6 }, hidden: true },
      { name: 'Queen of the Blood Ember', desc: 'Damage 50 → 150, hotter and longer burns, a much bigger blast, stronger knockback and flying detection.', cost: 7270, damage: 150, cooldown: 4, range: 21, radius: 5, speed: 45, knock: 12.5, ignite: { dps: 12, time: 7 }, flying: true, hidden: true },
    ],
  },
  // Harvester: spectral bolts (homing, `fly` speed or the level's `speed`) plus the Thorns ability
  // (see thornsAb).
  harvester: {
    name: 'Harvester',
    event: 'Event reward',
    flying: true,
    lead: false,
    cost: 2000,
    limit: 5,
    fly: 60,
    blurb: 'A haunted scarecrow that shoots spectral bolts at one zombie, with flying detection from the start. Its Thorns ability grows a patch of thorns on the path that hurts and slows zombies, and your Farms in its range grow thorns too. No lead detection, and hidden detection only from Lv 4.',
    tip: 'Place Farms near the path inside its range for extra thorns. Thorns hit hidden zombies but not flying or lead ones.',
    levels: [
      { name: 'Harvester', desc: 'Spectral bolts: 20 damage every 1.4s. Unlocks Thorns.', damage: 20, cooldown: 1.4, range: 20, speed: 60, hidden: false,
        abilities: [thornsAb(2, 0.25, 4, 8, 0.15)] },
      { name: 'Sharper Thorns', desc: 'Shoots faster, and thorns do 2 more damage.', cost: 625, damage: 20, cooldown: 1.2, range: 20, speed: 60, hidden: false,
        abilities: [thornsAb(4, 0.25, 4, 8, 0.15)] },
      { name: 'Early Harvest', desc: 'Damage 20 → 35. Bigger thorn patches that last 11s and slow 20%.', cost: 1500, damage: 35, cooldown: 1.2, range: 20, speed: 60, hidden: false,
        abilities: [thornsAb(4, 0.25, 5, 11, 0.2)] },
      { name: "Nature's Vengence", desc: 'Damage 35 → 65 and hidden detection. Thorns do 4 more damage, cover more path and hit faster.', cost: 4000, damage: 65, cooldown: 1.2, range: 20, speed: 60, hidden: true,
        abilities: [thornsAb(8, 0.2, 6, 11, 0.2)] },
      { name: 'Cold-Hearted Scarecrow', desc: 'Damage 65 → 90, shoots every 0.75s and more range. Thorns cover more path, +1 damage and last 12s.', cost: 8750, damage: 90, cooldown: 0.75, range: 25, speed: 60, hidden: true,
        abilities: [thornsAb(9, 0.2, 7.5, 12, 0.2)] },
      { name: 'Harvesting Season', desc: 'Huge, slow shots: damage 90 → 420 every 1.75s, more range and faster bolts. Thorns do 4 more damage, last 15s and slow 30%.', cost: 24300, damage: 420, cooldown: 1.75, range: 30, speed: 85, hidden: true,
        abilities: [thornsAb(13, 0.2, 8, 15, 0.3)] },
    ],
  },
  // Snowballer (not the old one): exploding snowballs that splash the closest `maxHits` zombies
  // and chill them (see Freezer); from Lv 4 a hit on a fully chilled zombie freezes it.
  snowballerFrost: {
    name: 'Snowballer',
    event: 'Event reward',
    flying: false,
    lead: true,
    cost: 300,
    limit: Infinity,
    lob: 0.6,
    freezeNext: true,
    kindLabel: 'Splash',
    blurb: 'A very cheap tower that throws exploding snowballs. Each one splashes a couple of zombies and slows them, and from Lv 4 fully slowed zombies freeze for a moment. Lead detection from the start, but low damage.',
    tip: 'Rush it to Lv 4 so it hits more zombies and freezes them. In harder modes, use it mostly to slow.',
    levels: [
      { name: 'Snowballer', desc: 'Snowballs that splash up to 2 zombies and slow them 10% per hit (up to 20%).', damage: 3, cooldown: 1.5, range: 15, radius: 2.5, maxHits: 2, chill: 0.5, maxSlow: 0.2, chillTime: 3, hidden: false },
      { name: 'Snow Day', desc: 'Throws faster and more range.', cost: 50, damage: 3, cooldown: 1.35, range: 17.5, radius: 2.5, maxHits: 2, chill: 0.5, maxSlow: 0.2, chillTime: 3, hidden: false },
      { name: 'Frigid Temperatures', desc: 'Damage 3 → 6, and a stronger slow: 15% per hit, up to 30%.', cost: 320, damage: 6, cooldown: 1.35, range: 17.5, radius: 2.5, maxHits: 2, chill: 0.5, maxSlow: 0.3, chillTime: 3, hidden: false },
      { name: 'Snowball Cannon', desc: 'Damage 6 → 28, throws faster, more range, hits 3 zombies, flying detection, and fully slowed zombies freeze for 0.6s.', cost: 3000, damage: 28, cooldown: 1.25, range: 20, radius: 2.5, maxHits: 3, chill: 0.5, maxSlow: 0.3, chillTime: 3, chillFreeze: 0.6, flying: true, hidden: false },
    ],
  },
  // Elementalist: bursts in Fire or Frost mode (tower field `choice[0]`, 'fire' unless switched
  // with ELEMENT_AB). element.fire: { dps, time } sets the zombies hit on fire. element.frost:
  // chill (see Freezer). Not used by the game yet (kept for later): leadBurn (its burns should
  // hurt lead zombies even though its shots can't hit them).
  elementalist: {
    name: 'Elementalist',
    event: 'Event reward',
    flying: false,
    lead: false,
    leadBurn: true,
    cost: 2000,
    limit: 5,
    choices: { fire: 'Fire', frost: 'Frost' },
    blurb: 'A mid-game burst-fire tower that switches between Fire mode (burns) and Frost mode (slows). From Lv 3 it unlocks Heatwave (Fire) and Ice Turret (Frost). No flying or lead detection.',
    tip: 'Switching takes 5s to recharge. Burns don\'t stack, so run one Elementalist on Fire and the rest on Frost.',
    levels: [
      { name: 'Elementalist', desc: '3-shot bursts in Fire mode (burns) or Frost mode (2% slow per hit, up to 10%).', damage: 3, burst: 3, burstGap: 0.2, cooldown: 1.2, range: 12, hidden: false,
        element: { fire: { dps: 2, time: 2 }, frost: { chill: 0.2, maxSlow: 0.1, chillTime: 3 } }, abilities: [ELEMENT_AB] },
      { name: 'Elemental Armory', desc: 'Damage 3 → 5, more range and 4-shot bursts. Fire burns harder for 3s; Frost slows 2.5% per hit.', cost: 1500, damage: 5, burst: 4, burstGap: 0.2, cooldown: 1.4, range: 15, hidden: false,
        element: { fire: { dps: 5, time: 3 }, frost: { chill: 0.25, maxSlow: 0.1, chillTime: 3 } }, abilities: [ELEMENT_AB] },
      { name: 'Experimental Tech', desc: 'Damage 5 → 10, more range and hidden detection. Fire: Heatwave. Frost: slows up to 15% and Ice Turret.', cost: 4000, damage: 10, burst: 4, burstGap: 0.2, cooldown: 1.4, range: 17, hidden: true,
        element: { fire: { dps: 5, time: 4 }, frost: { chill: 0.167, maxSlow: 0.15, chillTime: 3 } },
        abilities: [ELEMENT_AB, heatwaveAb(150, 20, 12.5, 15), iceTurretAb(iceTurret(10, 0.45, 12, 0.15))] },
      { name: 'Improved Exhaust Systems', desc: 'Damage 10 → 12, 5-shot bursts and shorter pauses. Fire burns tick twice as fast; bigger Heatwave. Frost slows 5% per hit; stronger Ice Turret.', cost: 8000, damage: 12, burst: 5, burstGap: 0.2, cooldown: 1.5, range: 17, hidden: true,
        element: { fire: { dps: 28, time: 2 }, frost: { chill: 0.333, maxSlow: 0.15, chillTime: 3 } },
        abilities: [ELEMENT_AB, heatwaveAb(250, 28, 13.5, 20), iceTurretAb(iceTurret(20, 0.35, 14.5, 0.15))] },
      { name: 'Frost Fire Specialist', desc: 'Damage 12 → 16, 7-shot bursts that fire much faster. Fire burns last 4s; huge Heatwave. Frost slows up to 20%; the best Ice Turret.', cost: 15000, damage: 16, burst: 7, burstGap: 0.125, cooldown: 1.275, range: 17, hidden: true,
        element: { fire: { dps: 28, time: 4 }, frost: { chill: 0.25, maxSlow: 0.2, chillTime: 3 } },
        abilities: [ELEMENT_AB, heatwaveAb(400, 38, 15, 25), iceTurretAb(iceTurret(28, 0.3, 17, 0.2))] },
    ],
  },
  // Firework Technician: a support tower that doesn't attack. When a wave starts, every tower
  // within `aura` gets hidden detection for `firework.time` s, and while that lasts each time
  // one of them damages a zombie it may launch a firework there: `damage` within `radius`
  // (ignoring armor, hitting lead) that sets zombies on fire (`burn` per second for 3s). The
  // chance is half the tower's seconds per shot, up to `cap` (slow towers fire more fireworks).
  fireworkTech: {
    name: 'Firework Technician',
    event: 'Event reward',
    cost: 1500,
    limit: 1,
    kind: 'support',
    blurb: "A support tower that doesn't attack. When a wave starts, towers in its range get hidden detection for a while, and while it lasts they have a chance to shoot a firework whenever they hurt a zombie. Fireworks explode, ignore armor, hit lead zombies and burn. Slow-firing towers get more fireworks.",
    tip: 'Its range is small, so place it right in the middle of your strongest towers.',
    levels: [
      { name: 'Firework Technician', desc: 'Towers in range get hidden detection for 10s each wave and up to a 50% chance of a 6 damage firework.', aura: 10, firework: { damage: 6, radius: 1, burn: 2, time: 10, cap: 0.5 } },
      { name: 'Pyrotechnics', desc: 'Fireworks do 12 damage and burn hotter. Detection lasts 20s, chance up to 60%.', cost: 2000, aura: 10, firework: { damage: 12, radius: 1, burn: 4, time: 20, cap: 0.6 } },
      { name: 'Bigger Boom', desc: 'Fireworks do 24 damage in a bigger blast and burn twice as fast. More range, detection lasts 30s, chance up to 70%.', cost: 6500, aura: 11, firework: { damage: 24, radius: 2, burn: 8, time: 30, cap: 0.7 } },
      { name: 'Light the Sky', desc: 'Fireworks do 35 damage and burn hotter. Chance up to 80%.', cost: 12000, aura: 11, firework: { damage: 35, radius: 2, burn: 16, time: 30, cap: 0.8 } },
      { name: 'The Finale', desc: 'Fireworks do 55 damage in a bigger blast and burn much hotter. More range, detection lasts 60s, chance up to 100%.', cost: 22000, aura: 12, firework: { damage: 55, radius: 3, burn: 32, time: 60, cap: 1 } },
    ],
  },
  // Biologist: grows plants (see sunflower / ivy / nightshade) on the path inside its range. It has
  // `queues` plant queues; the player picks which plant each one grows in the tower panel (tower
  // field `choice`). A queue grows its plant over the plant's `every` s, then starts the next.
  biologist: {
    name: 'Biologist',
    event: 'Event reward',
    cost: 750,
    limit: 8,
    kind: 'spawner',
    plants: true,
    noBuff: true,
    blurb: "Doesn't attack. It grows plants on the path next to it, and you pick which ones in its panel: Sunflowers shoot one zombie, Ivy poisons groups (and hurts lead zombies), and Nightshade confuses zombies. Its range is tiny, plants get trampled by zombies, and support towers can't boost them.",
    tip: 'Place it right beside the path. Several Sunflowers give you hidden detection; Ivy is the plant that hurts lead zombies.',
    levels: [
      { name: 'Biologist', desc: 'Grows Sunflowers on the path: 2.5 damage every 1.1s.', range: 9, queues: 1, hidden: false,
        plants: [{ key: 'sun', unit: sunflower(50, 6, 1.1, 15), every: 10 }] },
      { name: 'Bio Chemistry', desc: 'Sunflowers +1.7 damage and +50 HP. Unlocks Ivy: splash damage that poisons and slows, with lead detection.', cost: 600, range: 9, queues: 1, hidden: false,
        plants: [{ key: 'sun', unit: sunflower(100, 10, 1.1, 15), every: 10 }, { key: 'ivy', unit: ivy(100, 8, 2, 14, 3, { damage: 1, tick: 0.75, time: 4.5, slow: 0.05 }), every: 20 }] },
      { name: 'Scientific Breakthrough', desc: 'A second plant queue. Sunflowers get +0.8 damage, more range and HP, and hidden detection. Ivy hits harder in a bigger splash.', cost: 1850, range: 9, queues: 2, hidden: false,
        plants: [{ key: 'sun', unit: sunflower(200, 12, 1.1, 17, true), every: 10 }, { key: 'ivy', unit: ivy(200, 12, 1.8, 15.5, 4, { damage: 2, tick: 0.75, time: 4.5, slow: 0.075 }), every: 20 }] },
      { name: 'Flower Power', desc: 'Sunflowers +7 damage, Ivy +6 damage with stronger poison. Unlocks Nightshade: 21 damage with huge range that confuses zombies, with flying detection.', cost: 4500, range: 9, queues: 2, hidden: false,
        plants: [{ key: 'sun', unit: sunflower(400, 28, 1, 19.5, true), every: 10 }, { key: 'ivy', unit: ivy(400, 25, 1.8, 17, 4.5, { damage: 4, tick: 0.6, time: 4.5, slow: 0.075 }), every: 20 },
          { key: 'night', unit: nightshade(400, 50, 3, 30, { time: 1, cd: 4 }), every: 20 }] },
      { name: 'Botanical Berserker!', desc: 'A third plant queue, and every plant gets much stronger.', cost: 20000, range: 9, queues: 3, hidden: false,
        plants: [{ key: 'sun', unit: sunflower(800, 55, 0.8, 22.5, true), every: 10 }, { key: 'ivy', unit: ivy(800, 45, 1.5, 18.5, 4.5, { damage: 5, tick: 0.6, time: 5.2, slow: 0.125 }), every: 20 },
          { key: 'night', unit: nightshade(800, 135, 2.75, 35, { time: 1.25, cd: 4 }), every: 20 }] },
    ],
  },
  // Warlock: beams at zombies outside its sword's reach (`minRange` = sword.reach), knocking them
  // back `knock`. sword: { damage, every, reach, targets, bleed? }: every `every` s it swings at up
  // to `targets` zombies within `reach`, adding `bleed` Bleed stacks (see Slasher bleedFx).
  warlock: {
    name: 'Warlock',
    event: 'Event reward',
    flying: false,
    cost: 4200,
    limit: 4,
    bleedFx: { max: 40, dps: 0.0002, time: 5, burst: 0.1, bossMult: 0.2 },
    kindLabel: 'Hybrid',
    blurb: 'A hybrid with a sword for zombies up close and energy beams for zombies farther away. From Lv 3 its beams knock zombies back, and from Lv 5 its sword stacks Bleed that bursts for big damage. Great against tough zombies and bosses, but no flying detection.',
    tip: 'Pair it with slowing towers to keep zombies inside its sword range.',
    levels: [
      { name: 'Warlock', desc: 'Beams far zombies (25 damage) and swings a sword at close ones.', damage: 25, cooldown: 1.1, range: 18, minRange: 6, hidden: false,
        sword: { damage: 40, every: 2, reach: 6, targets: 2 } },
      { name: 'Acolyte', desc: 'Beam damage 25 → 40, more range, sword +30 damage.', cost: 2500, damage: 40, cooldown: 1.1, range: 19, minRange: 6, hidden: false,
        sword: { damage: 70, every: 2, reach: 6, targets: 2 } },
      { name: 'Forbidden Arts', desc: 'Hidden detection. Beams knock zombies back, do 60 damage, fire faster with more range. Sword +65 damage and more reach.', cost: 6800, damage: 60, cooldown: 0.8, range: 22, minRange: 6.5, knock: 5, hidden: true,
        sword: { damage: 135, every: 2, reach: 6.5, targets: 2 } },
      { name: 'Pact of the Blade', desc: 'Beam damage 60 → 115 with stronger knockback. Sword +60 damage and swings faster.', cost: 12000, damage: 115, cooldown: 0.8, range: 22, minRange: 6.5, knock: 7.5, hidden: true,
        sword: { damage: 195, every: 1.8, reach: 6.5, targets: 2 } },
      { name: 'Eldritch Knight', desc: 'Beam damage 115 → 190 and more range. Sword +150 damage, more reach, hits 3 zombies and adds 3 Bleed per hit.', cost: 20000, damage: 190, cooldown: 0.8, range: 24, minRange: 7, knock: 7.5, hidden: true,
        sword: { damage: 345, every: 1.8, reach: 7, targets: 3, bleed: 3 } },
      { name: 'Abyss Walker', desc: 'Lead detection. Beam damage 190 → 250, fires faster, stronger knockback. Sword +200 damage, more reach and 5 Bleed per hit.', cost: 30000, damage: 250, cooldown: 0.7, range: 24, minRange: 8, knock: 10, lead: true, hidden: true,
        sword: { damage: 545, every: 1.8, reach: 8, targets: 3, bleed: 5 } },
    ],
  },
  // Spotlight Tech: sweeps a spotlight toward its target (`spot.speed` studs a second) and every
  // `cooldown` s hits every zombie in the light (`spot.radius`), doing less away from the middle
  // (down to `spot.edge` of the damage at the rim). ignite: burns everything in the light.
  // spot.reveal: hidden zombies in the light are revealed to every tower. spot.confuse: { charge,
  // time, cd }: after dealing `charge` damage, confuses everything in the light (not bosses).
  spotlight: {
    name: 'Spotlight Tech',
    event: 'Event reward',
    placement: 'cliff',
    lead: 1,
    cost: 3225,
    limit: 1,
    stunImmune: true,
    kindLabel: 'Area',
    blurb: 'A cliff tower that sweeps a spotlight over the zombies, hurting every zombie in the light (less near the edge). From Lv 2 the light burns, from Lv 3 it reveals hidden zombies to every tower, and at Lv 5 it can confuse everything in the light. Flying detection and can\'t be stunned. One per player, cliffs only.',
    tip: 'Random targeting spreads the burn around. Slowing towers bunch zombies up so the light hits more of them.',
    levels: [
      { name: 'Spotlight Tech', desc: 'A spotlight that hurts every zombie inside it.', damage: 4, cooldown: 0.325, range: 30, spot: { radius: 2, speed: 18, edge: 0.5 }, hidden: false },
      { name: 'Backstage Crew', desc: 'Lead detection, a bigger light, and it sets zombies on fire.', cost: 1865, damage: 4, cooldown: 0.325, range: 30, spot: { radius: 3.5, speed: 18, edge: 0.5 }, ignite: { dps: 4, time: 2 }, hidden: false },
      { name: 'Non OSHA Compliant', desc: 'Damage 4 → 8, more range, hidden detection, a bigger light, hotter burns, and Hidden Reveal: zombies in the light can be hit by every tower.', cost: 4820, damage: 8, cooldown: 0.325, range: 35, spot: { radius: 4.5, speed: 18, edge: 0.5, reveal: true }, ignite: { dps: 8, time: 2 }, hidden: true },
      { name: 'Backstage Crew', desc: 'Damage 8 → 10, hits much faster, and burns are much hotter and last 4s.', cost: 12560, damage: 10, cooldown: 0.2, range: 35, spot: { radius: 4.5, speed: 18, edge: 0.5, reveal: true }, ignite: { dps: 20, time: 4 }, hidden: true },
      { name: 'Certified Spotlight Operator', desc: 'Damage 10 → 14, more range, a bigger light, much hotter 6s burns, and after dealing 1,800 damage it confuses everything in the light for 2.5s.', cost: 19320, damage: 14, cooldown: 0.2, range: 40,
        spot: { radius: 5.5, speed: 18, edge: 0.5, reveal: true, confuse: { charge: 1800, time: 2.5, cd: 7.5 } }, ignite: { dps: 40, time: 6 }, hidden: true },
    ],
  },
  // Star Cannon: charges up over `star.charge` s (while not rebooting), then fires a beam that
  // explodes for `min` to `max` damage (by charge) within `radius`, ignoring armor. It fires once
  // the charge is full, or sooner if the shot would already kill its target. It then reboots for
  // `star.reboot` s. star.stun: stuns everything in the blast (bosses only with `stunBoss`).
  // star.extra: it also blasts that many more zombies. star.battery: the chance that any kill
  // drops a battery, adding `GAME.starBattery` of a full charge to every Star Cannon. Not used by
  // the game yet (kept for later): freezeImmune (nothing freezes towers yet).
  starCannon: {
    name: 'Star Cannon',
    event: 'Event reward',
    placement: 'cliff',
    lead: true,
    cost: 20210,
    limit: 1,
    stunImmune: true,
    freezeImmune: true,
    kindLabel: 'Charge',
    blurb: 'A huge cliff cannon that charges up and fires a beam that explodes on zombies, ignoring armor. The longer it charges the harder it hits, and kills sometimes drop batteries that speed up the charge. The biggest hits in the game, but long charges and reboots. One per player, cliffs only.',
    tip: 'Strongest targeting gets the most out of each shot. It fires early if a weaker shot is already enough to kill.',
    levels: [
      { name: 'Star Cannon', desc: 'Charges for 30s, then fires a beam: 200 to 4,000 damage (by charge) in a blast that ignores armor.', damage: 200, cooldown: 7.5, range: 90, radius: 2.5, hidden: false,
        star: { min: 200, max: 4000, charge: 30, reboot: 7.5, battery: 0.1 } },
      { name: 'Solar-Flare Batteries', desc: '300 to 5,500 damage, and hits stun zombies (not bosses) for 1s.', cost: 9001, damage: 300, cooldown: 7.5, range: 90, radius: 2.5, hidden: false,
        star: { min: 300, max: 5500, charge: 30, reboot: 7.5, battery: 0.1, stun: 1 } },
      { name: 'Eclipsed Crew', desc: '500 to 15,000 damage, a bigger blast, 2s stuns and more batteries. But a full charge takes 45s and rebooting 10s.', cost: 29001, damage: 500, cooldown: 10, range: 90, radius: 3, hidden: false,
        star: { min: 500, max: 15000, charge: 45, reboot: 10, battery: 0.15, stun: 2 } },
      { name: 'Lunar Charges', desc: '2,000 to 45,000 damage, hidden detection and 4s stuns. Rebooting takes 7.5s, but a full charge 60s.', cost: 80000, damage: 2000, cooldown: 7.5, range: 90, radius: 3, hidden: true,
        star: { min: 2000, max: 45000, charge: 60, reboot: 7.5, battery: 0.15, stun: 4 } },
      { name: 'Shot of the Century', desc: '5,000 to 140,000 damage, a huge blast, each shot hits 3 more zombies, and it stuns bosses too. A full charge takes 70s and rebooting 10s.', cost: 240000, damage: 5000, cooldown: 10, range: 90, radius: 5, hidden: true,
        star: { min: 5000, max: 140000, charge: 70, reboot: 10, battery: 0.15, stun: 4, stunBoss: true, extra: 3 } },
    ],
  },
  // ---------------------------------------------------------------- event towers (wave 4)
  // Relic: a spawner of medieval units (see RELIC for the unit fields). `unit` to `unit5` each
  // come on their own timer (`spawnEvery`, `spawnEvery2`...). Its units can't be boosted by
  // support towers (`noBuff`). Relic Summon (ability `summon`): drops `drop` units on the path
  // where you click. ignoreExplosiveResist (last level): gets through explosive resistance. Not used
  // by the game yet (kept for later): the explosive / lightning damage types the Relic gets at its last level.
  relic: {
    name: 'Relic',
    event: 'The Awakened Invasion (back in the Halloween 2026 update)',
    cost: 2000,
    limit: 5,
    teamLimit: [5, 3, 2, 2],
    kind: 'spawner',
    spawnEvery: 30,
    noBuff: true,
    blurb: "A spawner that sends medieval units down the path to block zombies and fight them. Units stop and attack when zombies come into range; most of their damage is up close or from ramming. Early levels send Bandits, Zealot knights, Archers and Wardens. Lv 5 adds flying Seraphs and the huge Overseer, and the last level sends Seraphs, Overseers and the giant Overseer Prime, and unlocks Relic Summon.",
    tip: "Great at blocking and stalling zombies, and at max level it shreds bosses and hordes: the Overseer Prime's laser reaches almost anywhere. Support towers can't boost its units, and the last level is extremely expensive.",
    levels: [
      { name: 'Relic', desc: 'Sends a Bandit (190 HP, 20 DPS) every 30s that fights zombies up close. The Relic has 2,000 health.', hp: 2000, hidden: false,
        unit: RELIC.bandit },
      { name: 'Armor', desc: 'Sends 3 Bandits every 30s instead of 1. Health 2,300.', cost: 2700, hp: 2300, hidden: false,
        unit: RELIC.bandit3 },
      { name: 'Knights', desc: 'Adds a Zealot knight (2,000 HP, 200 DPS) every 55s and an Archer (175 HP, 30 DPS) every 50s. Units see hidden zombies. Health 2,700.', cost: 16500, hp: 2700, hidden: true,
        unit: RELIC.bandit3h, unit2: RELIC.zealot, spawnEvery2: 55, unit3: RELIC.archer, spawnEvery3: 50 },
      { name: 'Warden', desc: 'Adds a Warden (15,000 HP, 750 DPS, small splash) every 60s, and Bandits become Bandit Level 1s (560 HP, 111 DPS), 3 every 25s. Health 4,200.', cost: 45000, hp: 4200, hidden: true, spawnEvery: 25,
        unit: RELIC.bandit1, unit2: RELIC.zealot, spawnEvery2: 55, unit3: RELIC.archer, spawnEvery3: 50, unit4: RELIC.warden, spawnEvery4: 60 },
      { name: 'Relic Army', desc: 'No more Bandits. Sends 2 Zealots every 15s, 2 Archers every 45s, 2 Wardens every 50s, a flying Seraph (about 1,944 DPS) every 50s and a 120,000 HP Overseer that rams zombies every 145s. Health 11,200.', cost: 250000, hp: 11200, hidden: true, spawnEvery: 15,
        unit: RELIC.zealot2, unit2: RELIC.archer2, spawnEvery2: 45, unit3: RELIC.warden2, spawnEvery3: 50, unit4: RELIC.seraph, spawnEvery4: 50, unit5: RELIC.overseer, spawnEvery5: 145 },
      { name: 'Overseer & Seraph', desc: 'Only Seraphs (2 every 40s), Overseers (2 every 100s) and the giant Overseer Prime (200,000 HP) every 230s, up to 2 at once. Every unit hits flying zombies, and it unlocks Relic Summon. Health 46,200.', cost: 1500000, hp: 46200, hidden: true, spawnEvery: 40,
        ignoreExplosiveResist: true, damageTypes: ['explosive', 'lightning'],
        unit: RELIC.seraph2, unit2: RELIC.overseer2, spawnEvery2: 100, unit3: RELIC.prime, spawnEvery3: 230,
        abilities: [{ key: 'summon', name: 'Relic Summon', desc: 'Drops 2 Wardens, 3 Seraphs and a Phantom Overseer on the path where you click', cooldown: 220, aim: true, radius: 4,
          drop: [{ unit: RELIC.warden, n: 2 }, { unit: RELIC.seraph2, n: 3 }, { unit: RELIC.phantom, n: 1 }] }] },
    ],
  },
  // ---------------------------------------------------------------- event towers (wave 5)
  // MLRS: a rocket truck. It fires `burst` rockets per reload (`burstGap` s apart), each a blast of
  // `radius`, and has a big deadzone (`minRange`). Target Select (see targetSelectAb) aims it at a
  // spot; with `autoAim` it picks its own targets when nothing is there (or no spot is set), so
  // it works either way. Carpet Bomb: see CARPET_BOMB_AB. The spec gives no limit, blast or
  // deadzone size: limit 3, blast 3 (4 at Lv 3, 6 at Lv 5) and deadzone 15 (17 from Lv 2) are guesses.
  mlrs: {
    name: 'MLRS',
    event: 'Event reward',
    cost: 17000,
    limit: 3,
    flying: false,
    lead: true,
    lob: 1.4,
    burstGap: 0.15,
    blurb: 'A rocket truck that fires bursts of explosive rockets from very far away. Aim it yourself with Target Select like the Artillery, or let it pick its own targets. It has a big deadzone close to itself and slow reloads. Sees hidden zombies from Lv 4, and at max level it calls a B-52 bomber to carpet bomb a long stretch of path.',
    tip: 'Aim it at summoners or busy corners, and save Carpet Bomb for long straight stretches of path. Keep it far from the path so the deadzone doesn\'t matter.',
    levels: [
      { name: 'MLRS', desc: 'Fires 6 explosive rockets every 14s from far away. Can\'t hit zombies closer than 15.', damage: 265, burst: 6, cooldown: 14, range: 75, radius: 3, minRange: 15, hp: 1550, hidden: false, autoAim: true, abilities: [targetSelectAb(3)] },
      { name: 'Extra Salvo', desc: '12 rockets per burst instead of 6, and reloads 1s faster.', cost: 10400, damage: 265, burst: 12, cooldown: 13, range: 75, radius: 3, minRange: 15, hp: 1750, hidden: false, autoAim: true, abilities: [targetSelectAb(3)] },
      { name: 'Radar', desc: '+50 range, but the deadzone grows by 2.', cost: 4000, damage: 265, burst: 12, cooldown: 13, range: 125, radius: 3, minRange: 17, hp: 2125, hidden: false, autoAim: true, abilities: [targetSelectAb(3)] },
      { name: 'Heavy Missiles', desc: 'Damage 265 → 765 per rocket and a bigger blast.', cost: 45000, damage: 765, burst: 12, cooldown: 13, range: 125, radius: 4, minRange: 17, hp: 2705, hidden: false, autoAim: true, abilities: [targetSelectAb(4)] },
      { name: 'Dual Radar', desc: 'Hidden detection, +150 range, and reloads 2s faster.', cost: 12000, damage: 765, burst: 12, cooldown: 11, range: 275, radius: 4, minRange: 17, hp: 3625, hidden: true, autoAim: true, abilities: [targetSelectAb(4)] },
      { name: 'Freedom Time', desc: 'Damage 765 → 2,265, a much bigger blast, reloads 1s faster and unlocks Carpet Bomb: a B-52 drops 105 bombs along the path.', cost: 215000, damage: 2265, burst: 12, cooldown: 10, range: 275, radius: 6, minRange: 17, hp: 5095, hidden: true, autoAim: true,
        abilities: [targetSelectAb(6), CARPET_BOMB_AB] },
    ],
  },
  // Psycho Slayer (alternate event Commando form): a big armored warrior. Its Bolter gun shoots one
  // zombie; passive weapons on their own timers (see psychoSlam / psychoRail / psychoRockets /
  // PSYCHO_MORTAR) and Teleport / Jump (see TELEPORT_AB, jumpAb). The spec gives no limit: 3 is a
  // guess. ignoreBulletResist on the Bolter: gets through bullet resistance (it also has `lead:
  // true`). ignoreExplosiveResist on the Mortar works; on Jump it's kept for later (see jumpAb).
  eventCommandoPsycho: {
    name: 'Psycho Slayer',
    altOf: 'eventCommando',
    form: 'Psycho Slayer',
    shards: 1,
    price: 0,
    cost: 3000,
    limit: 3,
    flying: false,
    lead: true,
    ignoreBulletResist: true,
    blurb: 'An alternate Commando: a big armored warrior with a Bolter gun and a mace that smacks and stuns the strongest zombie nearby. Later it adds railguns, rockets that hit flyers and a long-range mortar, and it can teleport or jump around the map. Tons of health, but expensive, no hidden detection until max level, and a low limit.',
    tip: 'Great for catching leaks and as a late-game helper. Pair it with healers like the Combat Medic or Shield Tower. Jump onto bosses to hit them hard, or out of the way of deadly attacks.',
    levels: [
      { name: 'Psycho Slayer', desc: 'A Bolter gun, plus a mace Slam on the strongest zombie within 7 (100 damage, 0.2s stun, every 10s).', damage: 20, cooldown: 0.8, range: 15, hp: 1800, hidden: false,
        missiles: [psychoSlam(100, 0.2, 10, 20)] },
      { name: 'Enhanced Suit', desc: 'Damage 20 → 30, shoots faster, a stronger Slam, and unlocks Teleport.', cost: 2800, damage: 30, cooldown: 0.6, range: 15, hp: 2650, hidden: false,
        missiles: [psychoSlam(160, 0.4, 10, 50)], abilities: [TELEPORT_AB] },
      { name: 'Core Armor', desc: 'Damage 30 → 50, more range and a stronger Slam.', cost: 7250, damage: 50, cooldown: 0.6, range: 18, hp: 4450, hidden: false,
        missiles: [psychoSlam(200, 0.5, 10, 100)], abilities: [TELEPORT_AB] },
      { name: 'Rail Guns', desc: 'Damage 50 → 90, more range, a stronger Slam, and a Railgun Attack: 3 shots of 700 every 12s.', cost: 27000, damage: 90, cooldown: 0.6, range: 23, hp: 7350, hidden: false,
        missiles: [psychoSlam(400, 0.5, 13, 150), psychoRail(700, 12)], abilities: [TELEPORT_AB] },
      { name: 'Space Suit', desc: "Damage 90 → 150, can't be stunned, Rockets that hit flyers (6 × 325 every 16s), Jump, and stronger Slam and Railgun.", cost: 43000, damage: 150, cooldown: 0.5, range: 23, hp: 16600, hidden: false, stunImmune: true,
        missiles: [psychoSlam(600, 1.2, 12, 200), psychoRail(800, 10), psychoRockets(325, 1, 16)], abilities: [TELEPORT_AB, jumpAb(1000, 1, 7, 10)] },
      { name: 'Psycho Warrior', desc: 'Damage 150 → 550, hidden detection, a Mortar that hits the strongest zombie for 9,000, and much stronger Slam (stuns anything), Railgun, Rockets and Jump.', cost: 350000, damage: 550, cooldown: 0.4, range: 23, hp: 66600, hidden: true, stunImmune: true,
        missiles: [psychoSlam(4000, 1.5, 7.5, 300, true), psychoRail(3500, 12), psychoRockets(1400, 2, 12), PSYCHO_MORTAR], abilities: [TELEPORT_AB, jumpAb(5000, 2, 9, 12)] },
    ],
  },
  // Bubble Blower (alternate Cryomancer form): blows bursts of bubbles. bubble: { n, push } — each
  // shot blows `n` bubbles at different zombies in range, each doing `damage` and pushing non-boss
  // zombies back `push` (knockback, see knockBack; a zombie can only be pushed every BUBBLE_PUSH_CD
  // s). bubble.float (Lv 5): bubbles lift non-boss zombies off the ground for that long instead.
  // companion: { unit, every }: a unit that appears on the path at the far end of its range.
  // Big bursts are split into `n` bubbles per shot so they fit the sim's tick rate. The spec gives
  // no limit: 10 is a guess. Not used by the game yet (kept for later): aimDelay (Lv 2 aims 0.72s
  // longer, Lv 5 0.04s faster; the game has no aim delay yet).
  cryomancerBubble: {
    name: 'Bubble Blower',
    altOf: 'cryomancer',
    form: 'Bubble Blower',
    shards: 1,
    price: 0,
    cost: 150,
    limit: 10,
    flying: false,
    lead: true,
    bossStop: 0,
    kindLabel: 'Stall',
    blurb: 'An alternate Cryomancer: a stalling tower that blows bubbles that push zombies backward. At max level it shoots nonstop, its bubbles float zombies in the air so they can\'t move, and it sends out a Bubble Companion every 10 seconds to block the path. Tiny damage, and bubbles do nothing to bosses.',
    tip: 'Pair it with stunning towers and big splash damage: zombies bunch up while they\'re pushed back. Several Bubble Blowers stall crowds really well.',
    levels: [
      { name: 'Bubble Blower', desc: 'Blows 9 bubbles every 4.1s that push non-boss zombies back 0.8 studs.', damage: 0.5, burst: 9, burstGap: 0.2, cooldown: 4.1, range: 6.7, bubble: { n: 1, push: 4 }, hp: 100, hidden: false },
      { name: 'Gloves', desc: 'Reloads 0.5s faster and +1 range.', cost: 285, damage: 0.5, burst: 9, burstGap: 0.2, cooldown: 3.6, range: 7.7, bubble: { n: 1, push: 4 }, hp: 125, hidden: false },
      { name: 'Bubble Gun', desc: '50 bubbles per burst, +2 range and stronger push (1 stud), but reloads a bit slower.', cost: 600, damage: 0.5, burst: 25, burstGap: 0.08, cooldown: 4, range: 9.7, bubble: { n: 2, push: 5 }, hp: 175, hidden: false, aimDelay: 0.72 },
      { name: 'Big Muscles', desc: 'Damage 0.5 → 1 and stronger push (1.5 studs).', cost: 2150, damage: 1, burst: 25, burstGap: 0.08, cooldown: 4, range: 9.7, bubble: { n: 2, push: 7.5 }, hp: 675, hidden: false, aimDelay: 0.72 },
      { name: 'Extra Bubbles', desc: 'Damage 1 → 1.5, 120 bubbles per burst and a bit more push (1.6 studs).', cost: 4750, damage: 1.5, burst: 40, burstGap: 0.06, cooldown: 4, range: 9.7, bubble: { n: 3, push: 8 }, hp: 725, hidden: false, aimDelay: 0.72 },
      { name: 'Super Bubble Man', desc: 'Shoots nonstop and +7 range. Bubbles float non-boss zombies for 2.2s instead of pushing them, and a Bubble Companion (100 HP) appears every 10s, up to 2 at once.', cost: 17250, damage: 1.5, cooldown: 0.14, range: 16.7, bubble: { n: 1, float: 2.2 }, hp: 2225, hidden: false, aimDelay: 0.68,
        companion: { unit: BUBBLE_BUDDY, every: 10 } },
    ],
  },
};
