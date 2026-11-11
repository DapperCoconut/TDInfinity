// Towers: event towers, waves 1 and 2. Elf, Hallowboomer, Graveyard, Sleeter, Snowballer,
// Huntsman, Archer, Stunner, Harpoon Hunter, Gladiator, Event Commando, Slasher, Blaster.
// One group of the TOWERS table. config.js joins the groups in order (see TOWERS there).
// Shared units and abilities (MERC, AP_AB, ...) come from shared.js.
import { GRAVE, WARCRY_AB, concussiveAb } from './shared.js';

export const TOWERS_EVENT_1 = {

  // ---------------------------------------------------------------- event towers
  // event: where the tower came from. Event towers can't be bought in the shop: they only unlock
  // with the Konami code (in the menus) and have their own section in the Loadout screen.
  // ignite (splash towers): every zombie in the blast catches fire for `time` s, taking `dps`
  //        per second and moving `def.burnSlow` slower (it keeps hitting burning zombies).
  // freeze on a tower without `radius` (Sleeter): every shot freezes the zombie it hits.
  // skipBurning: it won't shoot zombies that are on fire (or already frozen).
  // freezeMain (Snowballer): only the zombie the snowball was thrown at gets frozen.
  // leadCap: it aims as if no zombie moves faster than this, so its lobs miss fast zombies.
  // splash: 0 = a lob that only hurts the zombie it was thrown at.
  // payday: a bounty timer of `every` s that only counts down while a zombie is in range; each
  //         time it runs out the owner gets `pay` cash. burstStops: a burst ends when its target dies.
  // kindLabel: the attack type shown in the shop (instead of the guessed one).
  elf: {
    name: 'Elf',
    event: 'Christmas 2017 event reward (no longer obtainable)',
    cost: 400,
    limit: 10,
    lob: 0.8,
    blurb: 'The prize for winning Christmas 2017. Throws exploding presents, and each blast hurts every zombie bunched up where it lands. Does very little damage to one strong zombie, even maxed.',
    tip: 'Get it to Lv 3 early so it can see hidden zombies.',
    levels: [
      { name: 'Elf', desc: 'Throws exploding presents that hurt every zombie in the blast.', damage: 2, cooldown: 3, range: 13, radius: 4, hidden: false },
      { name: 'Rapid Reload', desc: 'Throws presents faster.', cost: 300, damage: 2, cooldown: 2, range: 13, radius: 4, hidden: false },
      { name: 'Elf Tech', desc: 'A headset gives it hidden detection, and a little more range.', cost: 360, damage: 2, cooldown: 2, range: 14, radius: 4, hidden: true },
      { name: 'Present Boom', desc: 'Double present damage and a bigger blast.', cost: 850, damage: 4, cooldown: 2, range: 14, radius: 5, hidden: true },
      { name: 'Fireworks', desc: 'Fireworks: much more damage, a huge blast and more range.', cost: 2700, damage: 10, cooldown: 2, range: 15, radius: 7, hidden: true },
    ],
  },
  hallowboomer: {
    name: 'Hallowboomer',
    event: 'Halloween 2018 reward (sold for 750 Candy in Halloween 2023)',
    lead: true,
    cost: 600,
    limit: 8,
    lob: 0.9,
    burnSlow: 0.4,
    blurb: 'Throws flaming pumpkins. Each one explodes and sets every zombie in the blast on fire: burning zombies take extra damage and walk 40% slower. Its direct hits are weak until the later upgrades.',
    tip: 'Unlike the Flamethrower, it keeps shooting zombies that are already burning. It can even set bosses on fire to slow them.',
    levels: [
      { name: 'Hallowboomer', desc: 'Flaming pumpkins that set every zombie in the blast on fire.', damage: 1, cooldown: 3.08, range: 13, radius: 3, ignite: { dps: 1, time: 3 }, hidden: false },
      { name: 'Specs', desc: 'More range.', cost: 200, damage: 1, cooldown: 3.08, range: 16, radius: 3, ignite: { dps: 1, time: 3 }, hidden: false },
      { name: 'Raking Season', desc: 'Double damage, throws faster and a much bigger blast.', cost: 700, damage: 2, cooldown: 2.65, range: 16, radius: 5.5, ignite: { dps: 1, time: 3 }, hidden: false },
      { name: 'Pumpkin Juice', desc: 'Double damage, and the fire burns twice as hot and much longer.', cost: 1600, damage: 4, cooldown: 2.65, range: 16, radius: 5.5, ignite: { dps: 2, time: 7 }, hidden: false },
      { name: 'Spooky Rampage', desc: 'Double damage, much hotter and longer burns, throws twice as fast, a bigger blast and more range.', cost: 4500, damage: 8, cooldown: 1.35, range: 17, radius: 6.5, ignite: { dps: 5, time: 9 }, hidden: false },
    ],
  },
  graveyard: {
    name: 'Graveyard',
    event: 'Halloween 2020 reward (sold for 1,000 Candy in Halloween 2023)',
    cost: 450,
    limit: 3,
    kind: 'spawner',
    spawnEvery: 20,
    blurb: "Doesn't shoot. Keeps sending undead units onto the path that hurt zombies by crashing into them or hitting them up close. Its first levels only make tiny skeletons that do very little.",
    tip: 'Most of its power is in Lv 4 and 5, so save up for that very expensive last upgrade.',
    levels: [
      { name: 'Graveyard', desc: 'Sends a small Skeleton down the path every 20 seconds.', hidden: false, unit: GRAVE.skeleton },
      { name: 'Extra Capacity', desc: 'Sends a Skeleton every 10 seconds instead of 20.', cost: 400, hidden: false, spawnEvery: 10, unit: GRAVE.skeleton },
      { name: 'Giant Skeleton', desc: 'Also sends a tougher Giant Skeleton every 40 seconds.', cost: 1400, hidden: false, spawnEvery: 10, unit: GRAVE.skeleton,
        unit2: GRAVE.giant, spawnEvery2: 40 },
      { name: 'Fallen Warriors', desc: 'Also sends a sword-swinging Haunted Knight every 45 seconds.', cost: 6200, hidden: false, spawnEvery: 10, unit: GRAVE.skeleton,
        unit2: GRAVE.giant, spawnEvery2: 40, unit3: GRAVE.knight, spawnEvery3: 45 },
      { name: 'Return of the King', desc: 'Summons Jack every 100 seconds, and every unit gets a stronger cursed version.', cost: 40000, hidden: false, spawnEvery: 10, unit: GRAVE.cursed,
        unit2: GRAVE.giantCursed, spawnEvery2: 40, unit3: GRAVE.hallowKnight, spawnEvery3: 45, unit4: GRAVE.jack, spawnEvery4: 100 },
    ],
  },
  sleeter: {
    name: 'Sleeter',
    event: 'Winter 2019 event reward (unobtainable since March 2019)',
    cost: 700,
    limit: 8,
    bossStop: 0.5,
    skipBurning: true,
    blurb: "The prize for Winter 2019. Fires bursts of ice shots that freeze zombies in place for a moment, even fast ones and bosses (for less time). It won't shoot zombies that are already frozen or burning, so keep it away from fire towers.",
    tip: 'Several Sleeters can freeze almost a whole crowd. Keep it away from Flamethrowers and Hallowboomers.',
    levels: [
      { name: 'Sleeter', desc: '3-shot bursts of ice: every shot freezes the zombie it hits.', damage: 2, burst: 3, burstGap: 0.15, cooldown: 2.08, range: 10, freeze: 0.8, hidden: false },
      { name: 'Permafrost', desc: 'After a zombie thaws out, it stays 5% slower for good.', cost: 450, damage: 2, burst: 3, burstGap: 0.15, cooldown: 2.08, range: 10, freeze: 0.8, frostbite: 0.05, hidden: false },
      { name: 'Radio', desc: 'Hidden detection, a little more range and damage.', cost: 650, damage: 3, burst: 3, burstGap: 0.15, cooldown: 2.08, range: 11, freeze: 0.8, frostbite: 0.05, hidden: true },
      { name: 'Arctic Gorilla', desc: 'Double damage, 5-shot bursts and freezes last twice as long.', cost: 3200, damage: 6, burst: 5, burstGap: 0.15, cooldown: 2.08, range: 11, freeze: 1.7, frostbite: 0.05, hidden: true },
      { name: 'Subzero Hero', desc: 'Double damage, faster bursts, 3s freezes, more range, and thawed zombies stay 20% slower for good.', cost: 7500, damage: 12, burst: 5, burstGap: 0.15, cooldown: 1.85, range: 12, freeze: 3, frostbite: 0.2, hidden: true },
    ],
  },
  snowballer: {
    name: 'Snowballer',
    event: 'Sold for 500 credits for a limited time (no longer sold)',
    flying: false,
    cost: 100,
    limit: 12,
    lob: 0.9,
    leadCap: 6.5,
    bossStop: 0.5,
    kindLabel: 'Single',
    blurb: 'Throws snowballs that fly through the air at one ground zombie, so they can miss fast zombies. Cheap early defense, and from Lv 4 its snowballs freeze what they hit. It never sees hidden zombies.',
    tip: "It only costs $100 to place, so it's great at the very start. From Lv 4 it can even freeze bosses for a moment.",
    levels: [
      { name: 'Snowballer', desc: 'Throws snowballs at one zombie. They can miss fast zombies.', damage: 1, cooldown: 3, range: 7.8, radius: 1.3, splash: 0, hidden: false },
      { name: 'Warm Gloves', desc: 'Throws faster with more range.', cost: 80, damage: 1, cooldown: 2, range: 9.5, radius: 1.3, splash: 0, hidden: false },
      { name: 'Thick Snow', desc: 'Double snowball damage.', cost: 280, damage: 2, cooldown: 2, range: 9.5, radius: 1.3, splash: 0, hidden: false },
      { name: 'Icy Snowballs', desc: 'Snowballs do 18 damage and freeze the zombie they hit for 1 second.', cost: 620, damage: 6, cooldown: 2, range: 9.5, radius: 1.3, splash: 0, freeze: 1, freezeMain: true, hidden: false },
      { name: 'Death Ball', desc: 'Snowballs do 36 damage, splash 15 damage onto zombies nearby, and freeze for 2.5s.', cost: 3000, damage: 12, cooldown: 2, range: 9.5, radius: 4, splash: 5, freeze: 2.5, freezeMain: true, hidden: false },
    ],
  },
  huntsman: {
    name: 'Huntsman',
    event: 'Tournament winners and map contributors only',
    flying: false,
    cost: 1000,
    limit: 6,
    burstStops: true,
    blurb: 'A rare tower for tournament winners. Fires long bullet bursts at ground zombies and sees hidden zombies from the start. From Lv 3 its Bounty timer pays you cash while zombies are in range. If its target dies, the burst stops early.',
    tip: 'Get it to Lv 3 quickly to start earning Bounty cash.',
    levels: [
      { name: 'Huntsman', desc: 'Long bullet bursts, with hidden detection from the start.', damage: 1, burst: 10, burstGap: 0.07, cooldown: 1.9, range: 11.5, hidden: true },
      { name: 'Longshot', desc: 'Laser sights: much more range.', cost: 260, damage: 1, burst: 10, burstGap: 0.07, cooldown: 1.9, range: 15.5, hidden: true },
      { name: 'Payday', desc: 'Bounty: a 15s timer counts down while zombies are in range (pausing when none are) and pays $80 each time.', cost: 1500, damage: 1, burst: 10, burstGap: 0.07, cooldown: 1.9, range: 15.5, hidden: true,
        payday: { every: 15, pay: 80 } },
      { name: 'Double Tap', desc: 'Two guns: 20-shot bursts, slightly faster shots, and Bounty pays $160.', cost: 1750, damage: 1, burst: 20, burstGap: 0.06, cooldown: 2.4, range: 15.5, hidden: true,
        payday: { every: 15, pay: 160 } },
      { name: 'Harvester', desc: '4 damage per bullet, 36-shot bursts, more range, and Bounty pays $380 every 10s.', cost: 6400, damage: 4, burst: 36, burstGap: 0.06, cooldown: 3.36, range: 18, hidden: true,
        payday: { every: 10, pay: 380 } },
    ],
  },
  // arrow: { speed, pierce }: a slow arrow flies straight at where the zombie is now, out to the
  //        tower's range, hitting the first `pierce` zombies it passes (it doesn't lead its
  //        target, so it misses zombies walking across its path). With `ignite`, arrows set
  //        every zombie they hit on fire.
  archer: {
    name: 'Archer',
    event: 'Event reward',
    flying: false,
    cost: 650,
    limit: 8,
    kindLabel: 'Pierce',
    blurb: "Shoots slow arrows in a straight line that pierce through up to three zombies, and later sets them on fire. The arrows don't lead their target, so they often miss zombies that aren't walking along the arrow's path.",
    tip: 'Place it where zombies walk straight toward or away from it so the arrows land.',
    levels: [
      { name: 'Archer', desc: 'Slow arrows that fly in a straight line and pierce up to 3 zombies.', damage: 6, cooldown: 3, range: 16, arrow: { speed: 22, pierce: 3 }, hidden: false },
      { name: 'Quick Hand', desc: 'Shoots every 2s instead of 3s.', cost: 260, damage: 6, cooldown: 2, range: 16, arrow: { speed: 22, pierce: 3 }, hidden: false },
      { name: 'Extra Sight', desc: 'Heat-vision goggles: hidden detection, more range and damage.', cost: 780, damage: 8, cooldown: 2, range: 19, arrow: { speed: 22, pierce: 3 }, hidden: true },
      { name: 'Flaming Arrows', desc: 'Arrows set zombies on fire, and damage goes from 13 to 19.', cost: 1950, damage: 12, cooldown: 2, range: 19, arrow: { speed: 22, pierce: 3 }, ignite: { dps: 4, time: 3 }, hidden: true },
      { name: 'Taste for Blood', desc: 'A crossbow: 48 damage per flaming bolt and each bolt pierces up to 5 zombies, but it fires every 2.5s and has less range.', cost: 6400, damage: 30, cooldown: 2.5, range: 17, arrow: { speed: 30, pierce: 5 }, ignite: { dps: 10, time: 4 }, hidden: true },
    ],
  },
  // toss: { damage, every, range, speed, injure? }: on top of its melee swings, it throws a knife
  //       every `every` s at a zombie within the much larger `range` (the knife leads its target).
  //       injure: { amount, time }: zombies hit by a thrown knife take `amount` more damage from
  //       every Knifer for `time` s.
  // focus: { per, max }: every swing in a row on the same zombie does `per` more damage, up to
  //        +`max` (switching targets resets it).
  // skipStopped: it won't shoot zombies that are already stunned or frozen.
  // stunAny: it stuns zombies that normally can't be stunned (bosses still get `bossStop` of it), but never Void enemies.
  // bossGrace: after one of its stuns wears off, a boss can't be stunned by it again for this many s.
  // noBuff: support towers can't boost it.
  stunner: {
    name: 'Stunner',
    event: 'Event reward',
    flying: false,
    cost: 200,
    limit: 8,
    skipStopped: true,
    stunAny: true,
    bossStop: 0.25,
    bossGrace: 2,
    noBuff: true,
    kindLabel: 'Stun',
    blurb: 'Zaps zombies with a taser to stun them for a while, even ones that normally can\'t be stunned (bosses for a quarter of the time). Cheaper than a Cryo-Gunner, but it barely does damage, has no splash, never sees hidden zombies and can\'t be boosted.',
    tip: 'Pair it with strong damage towers so they can hit zombies while they\'re stunned.',
    levels: [
      { name: 'Stunner', desc: 'A taser that stuns one zombie for 5.25s. No damage.', damage: 0, cooldown: 3.05, range: 8, stun: 5.25, hidden: false },
      { name: 'Bigger Zap', desc: 'Stuns last 6s instead of 5.25s.', cost: 200, damage: 0, cooldown: 3.05, range: 8, stun: 6, hidden: false },
      { name: 'Heavy Duty', desc: 'Now does 1 damage per zap, and more range.', cost: 380, damage: 1, cooldown: 3.05, range: 10, stun: 6, hidden: false },
      { name: 'Peacekeeper', desc: 'Zaps every 2.05s instead of 3.05s.', cost: 400, damage: 1, cooldown: 2.05, range: 10, stun: 6, hidden: false },
      { name: 'Thunder God', desc: '2 damage per zap, zaps every 1.15s, 10s stuns and more range.', cost: 1400, damage: 2, cooldown: 1.15, range: 12, stun: 10, hidden: false },
    ],
  },
  // harpoon: { slow, time }: each harpoon slows the zombie it hits by `slow` for `time` s. Harpoons
  //          stack up to `harpoonMax`, and together with fire slows (Flamethrower, Hallowboomer)
  //          up to `slowCap`.
  // Not used by the game yet (kept for later): speed (harpoon flight speed; harpoons hit
  // instantly for now).
  // voidSlow: the most Void enemies can be slowed by its harpoons.
  harpoonHunter: {
    name: 'Harpoon Hunter',
    fly: 65, // harpoons fly at the level's `speed`
    event: 'Event reward',
    cost: 650,
    limit: 6,
    placement: 'cliff',
    harpoonMax: 0.5,
    slowCap: 0.9,
    voidSlow: 0.1,
    kindLabel: 'Slow',
    blurb: 'Fires harpoons from a cliff that stick into zombies and slow them. Each harpoon adds more slow, up to 50%, and with fire slows up to 90%. Big, cost-efficient damage on tough zombies mid to late game. Cliffs only. Never sees hidden zombies, and its slow firerate makes it poor early.',
    tip: 'Use it like a Marksman for tough zombies, paired with something that has hidden detection.',
    levels: [
      { name: 'Harpoon Hunter', desc: 'Harpoons that slow the zombie they hit by 10% for 4s (stacking up to 50%).', damage: 4, cooldown: 2.2, range: 18, speed: 65, harpoon: { slow: 0.1, time: 4 }, hidden: false },
      { name: 'Pressure Gauge', desc: 'Faster harpoons and more range.', cost: 300, damage: 4, cooldown: 2.2, range: 22.5, speed: 80, harpoon: { slow: 0.1, time: 4 }, hidden: false },
      { name: 'Precision', desc: 'Damage 4 → 10, fires a bit faster, and harpoons last 5s.', cost: 750, damage: 10, cooldown: 2, range: 22.5, speed: 80, harpoon: { slow: 0.1, time: 5 }, hidden: false },
      { name: 'Titanium Enforced', desc: 'Damage 10 → 25, and harpoons slow by 15% for 6s.', cost: 1500, damage: 25, cooldown: 2, range: 22.5, speed: 80, harpoon: { slow: 0.15, time: 6 }, hidden: false },
      { name: 'Apex Predator', desc: 'Damage 25 → 100, harpoons slow by 25% for 8s, and much more range.', cost: 7500, damage: 100, cooldown: 2, range: 32, speed: 80, harpoon: { slow: 0.25, time: 8 }, hidden: false },
    ],
  },
  // ---------------------------------------------------------------- event towers (wave 2)
  // parry: blocks every stun aimed at it (not freezes or debuffs), but then stops attacking for
  //        this many s. fireAspect: { every, dps, time }: every `every` s its next swing sets every
  //        zombie it hits on fire (`dps` per second for `time` s, no slow).
  gladiator: {
    name: 'Gladiator',
    event: 'Event reward',
    flying: false,
    lead: 3,
    cost: 525,
    limit: Infinity,
    melee: true,
    parry: 0.75,
    kindLabel: 'Multi',
    blurb: 'An early melee fighter that swings a sword in an arc, hitting several zombies at once. Sees hidden zombies from the start and parries stuns (it pauses for a moment after a parry). Very short range, and it can\'t hit flying zombies.',
    tip: 'Place it at bends or where paths cross so it covers more of the path. It has no placement limit, so stack several around a corner.',
    levels: [
      { name: 'Gladiator', desc: 'Swings a sword at up to 2 zombies, sees hidden zombies and parries stuns.', damage: 5, cooldown: 0.95, range: 5.5, targets: 2, hidden: true },
      { name: 'Arena Conditioning', desc: 'Damage 2.8 → 3.9 and faster swings.', cost: 375, damage: 7, cooldown: 0.8, range: 5.5, targets: 2, hidden: true },
      { name: "Warrior's Call", desc: 'Damage 3.9 → 9.4. Unlocks War Cry: swings 65% faster for 15s.', cost: 1250, damage: 17, cooldown: 0.8, range: 5.5, targets: 2, hidden: true,
        abilities: [WARCRY_AB] },
      { name: "Champion's Flame", desc: 'Damage 9.4 → 15, more range, faster swings, hits 5 zombies and lead detection. Fire Aspect: every 4s its next swing sets zombies on fire.', cost: 2125, damage: 27, cooldown: 0.7, range: 6, targets: 5, lead: true, hidden: true,
        fireAspect: { every: 4, dps: 6.7, time: 1.2 }, abilities: [WARCRY_AB] },
      { name: 'Centurion', desc: 'Damage 15 → 31 and hits 7 zombies. Fire Aspect burns hotter and recharges every 3s.', cost: 6200, damage: 57, cooldown: 0.7, range: 6, targets: 7, lead: true, hidden: true,
        fireAspect: { every: 3, dps: 13.3, time: 1.2 }, abilities: [WARCRY_AB] },
      { name: 'King of the Arena', desc: 'Damage 31 → 42, faster swings, more range and hits 10 zombies. Fire Aspect burns much hotter for 1.5s and recharges every 2s.', cost: 14900, damage: 77, cooldown: 0.55, range: 6.5, targets: 10, lead: true, hidden: true,
        fireAspect: { every: 2, dps: 46.7, time: 1.5 }, abilities: [WARCRY_AB] },
    ],
  },
  // Commando (event, not the base Commando): piercing laser shots (`pass`) with ammo, plus
  // Concussive Missiles (see concussiveAb). laser: laser damage (see damageKind).
  eventCommando: {
    name: 'Commando',
    event: 'Beat Hard mode', // win reward (see DIFFICULTIES unlock)
    cost: 2150,
    limit: 8,
    bossStop: 0.5,
    laser: true,
    blurb: 'A mid-game laser trooper whose shots pierce a second zombie. It has limited ammo and stops to reload. From Lv 4 it fires Concussive Missiles at a spot you pick that blast and stun groups, ignoring armor. Hits flying zombies from the start.',
    tip: 'Before Lv 3, put it where zombies line up (corners, straight paths) for more piercing hits. Aim missiles a little in front of moving zombies: they take 2 seconds to land.',
    levels: [
      { name: 'Commando', desc: 'Fast laser shots that pierce one more zombie, 30 shots per magazine.', damage: 5, cooldown: 0.225, range: 16, pass: 1, ammo: 30, reload: 2.25, hidden: false },
      { name: 'Recon Mission', desc: 'Shoots faster and reloads faster.', cost: 935, damage: 5, cooldown: 0.17, range: 16, pass: 1, ammo: 30, reload: 2, hidden: false },
      { name: 'Titanium Rounds', desc: 'Hidden detection, more range, damage 5 → 7, faster shots and 15 more ammo.', cost: 2850, damage: 7, cooldown: 0.14, range: 17.5, pass: 1, ammo: 45, reload: 2, hidden: true },
      { name: 'Jericho Missiles', desc: 'Damage 7 → 14, 15 more ammo and faster reloads. Unlocks Concussive Missiles.', cost: 8115, damage: 14, cooldown: 0.14, range: 17.5, pass: 1, ammo: 60, reload: 1.5, hidden: true,
        abilities: [concussiveAb(2, 275, 0.5, 35, 20)] },
      { name: 'Death & Taxes', desc: 'Damage 14 → 23, more range, faster shots, 20 more ammo and faster reloads. Missiles: 4 of them, harder, 1s stuns, more reach and half the cooldown.', cost: 25000, damage: 23, cooldown: 0.1, range: 20, pass: 1, ammo: 80, reload: 1.25, hidden: true,
        abilities: [concussiveAb(4, 325, 1, 40, 10)] },
    ],
  },
  // Slasher (alternate Knifer form). crit: see Warden. bleed (on a level): stacks of Bleed each
  // hit adds (see `bleedFx`). bleedFx: { max, dps, time, burst, bossMult }: each stack hurts `dps`
  // of the zombie's max health per second; stacks fall off `time` s after its last hit. At `max`
  // stacks the bleed bursts: `burst` of its max health at once, and the stacks reset. Bosses
  // take `bossMult` of the bleed and burst damage. Not used by the game yet (kept for later):
  // freezeImmune (nothing freezes towers yet).
  kniferSlasher: {
    name: 'Slasher',
    altOf: 'knifer',
    form: 'Slasher',
    shards: 1,
    price: 0,
    flying: false,
    lead: 2,
    cost: 2400,
    limit: 8,
    melee: true,
    bleedFx: { max: 400, dps: 0.00002, time: 5, burst: 0.15, bossMult: 0.2 },
    blurb: 'An alternate Knifer that stabs one zombie at a time, landing a critical hit every third swing. From Lv 3 its hits stack Bleed, which eats away at the zombie\'s max health and bursts for a huge hit when it maxes out.',
    tip: 'Put it on path corners because its range is short. Several Slashers build bleed faster and trigger bursts sooner.',
    levels: [
      { name: 'Slasher', desc: 'Stabs one zombie; every third swing is a critical hit.', damage: 8, cooldown: 0.3, range: 6, crit: { every: 3, damage: 16 }, hidden: false },
      { name: 'Sleight of Hands', desc: 'Damage 8 → 10, faster swings and hidden detection.', cost: 1000, damage: 10, cooldown: 0.25, range: 6, crit: { every: 3, damage: 20 }, hidden: true },
      { name: 'Bloodlust', desc: 'Big, slower hits (damage 10 → 32), stronger crits, lead detection, can\'t be stunned, and every hit adds 10 Bleed.', cost: 5600, damage: 32, cooldown: 0.6, range: 6, crit: { every: 3, damage: 96 }, bleed: 10, stunImmune: true, freezeImmune: true, hidden: true },
      { name: 'Psycho Knife', desc: 'Damage 32 → 40, slightly faster, stronger crits and 18 Bleed per hit.', cost: 11003, damage: 40, cooldown: 0.55, range: 6, crit: { every: 3, damage: 160 }, bleed: 18, stunImmune: true, freezeImmune: true, hidden: true },
      { name: 'Ocean Of Blood', desc: 'Damage 40 → 55, faster swings and 40 Bleed per hit.', cost: 32500, damage: 55, cooldown: 0.5, range: 6, crit: { every: 3, damage: 220 }, bleed: 40, stunImmune: true, freezeImmune: true, hidden: true },
    ],
  },
  // Frost Blaster (alternate Sleeter form): piercing ice shots (`pass`; `pierceFx`: the zombies
  // pierced get the on-hit effects too) that chill (see Freezer). freezeNext: a hit on a zombie
  // that is already fully chilled freezes it for `chillFreeze` s. melt: armor melted (see Pyromancer).
  sleeterBlaster: {
    name: 'Frost Blaster',
    altOf: 'sleeter',
    form: 'Blaster',
    shards: 1,
    price: 0,
    flying: false,
    lead: true,
    cost: 850,
    limit: 12,
    pierceFx: true,
    freezeNext: true,
    blurb: 'An alternate Sleeter that fires piercing ice shots through a line of zombies. Every hit chills (slows) them, a hit on a fully chilled zombie freezes it for a moment, and from Lv 3 its shots melt armor.',
    tip: 'A cheap way to get hidden detection early. Pair it with big damage towers so they get more time to hit.',
    levels: [
      { name: 'Frost Blaster', desc: 'Piercing ice shots that hit 2 zombies and slow them 15%.', damage: 4, cooldown: 0.8, range: 12, pass: 1, chill: 1, maxSlow: 0.15, chillTime: 3, chillFreeze: 0.2, hidden: false },
      { name: 'Endurance', desc: 'Faster shots, more range, hidden detection and longer freezes.', cost: 350, damage: 4, cooldown: 0.6, range: 15, pass: 1, chill: 1, maxSlow: 0.15, chillTime: 3, chillFreeze: 0.3, hidden: true },
      { name: 'Piercing Cold', desc: 'Damage 4 → 8, pierces 3 zombies, 25% slow, and melts 15% of armor.', cost: 1500, damage: 8, cooldown: 0.6, range: 15, pass: 2, chill: 1, maxSlow: 0.25, chillTime: 3, chillFreeze: 0.3, melt: 0.15, hidden: true },
      { name: 'Subzero Hero', desc: 'Damage 8 → 12, more range and faster shots.', cost: 3800, damage: 12, cooldown: 0.45, range: 17.5, pass: 2, chill: 1, maxSlow: 0.25, chillTime: 3, chillFreeze: 0.3, melt: 0.15, hidden: true },
      { name: 'Hyper Icer Trooper', desc: 'Damage 12 → 53 but slower shots. Much more range, pierces 4 zombies, melts 35% of armor and 0.6s freezes.', cost: 9500, damage: 53, cooldown: 0.9, range: 22.5, pass: 3, chill: 1, maxSlow: 0.25, chillTime: 3, chillFreeze: 0.6, melt: 0.35, hidden: true },
    ],
  },
};
