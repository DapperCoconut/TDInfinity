// Wave 11: new towers.
//   Poacher: the starter cliff tower. One arrow at a time, slow and steady, good on bosses.
//   Gunner: an alternate Soldier form. Short bursts, cheap, sees hidden zombies from Lv 3.
//   Future Sniper: an alternate Sniper form. Huge range, slow heavy shots, true damage at Lv 5.
//   Ninja: throws bursts of piercing shurikens, saves some up while idle, and has a giant
//          spinning shuriken (Shirayuki Shuriken) from Lv 2.
//   Bomber: an alternate Trapper form. Lobs bombs at zombies, and lays bombs on the path while
//           nothing is in range. Time Bomb ability at Lv 4.
//   Berserker: an alternate Slugger form. Chops with two axes; Crushing Blow slams the ground
//              and makes zombies weaker to physical damage. Fatal Frenzy ability at Lv 4.
//   Priest: an alternate Medic (Doctor) form. Never attacks; blesses one tower for more damage.
//   Farmer: an alternate Oil Derrick form. Pays out paychecks during the wave; Rice From The Void at Lv 4.
//   Bandit: an alternate Scout form. Shoots, and from Lv 2 slashes zombies close in front of it.
//   Shrapnel Grenadier: an alternate Grenadier form. Cheap grenades, a grenade launcher from Lv 3,
//               and at Lv 5 every blast also hurts by a share of each zombie's max health.
//   Warrior: an alternate Enforcer form. Swings a sword; hidden detection at Lv 3, Double Strike at Lv 4.
//   Eradicator: fast little energy orbs, and from Lv 3 the Raybreak: a big piercing beam. Its last
//               three levels add ΘVERLOAD, which costs its owner money for the rest of the game.
//   Snowman: an alternate Snowballer form. Snowballs freeze zombies in place (never bosses);
//            from Lv 2 the whole blast freezes. Snowfall ability at Lv 6 (only 4 can have it).
//   Infernus: an alternate Flamethrower form. A support: a wide cone of fire whose burns slow zombies.
//   Spearman: an alternate Assassin form. Stabs harder at the far edge of its reach (Tip Damage);
//             range buffs don't work on it. Edge Cyclone at Lv 5.
//   Thief: an alternate Cowboy form. Stabs with a dagger; the damage it deals in a wave turns
//          into cash at the end of the wave (up to $8,000 each).
//   Exterminator: an alternate Mercenary Base form. A soldier that shoots very fast; Onslaught
//                 ability at Lv 5 boosts the damage of towers around it.
//   Miner: an alternate Farm form. Earns cash every wave.
//   Recon: an alternate Shotgunner form. A shotgun that fires 5 pellets (7 at Lv 4).
//   Blaster: an alternate Commando form. Fast shots that add Shatter (bad effects last longer);
//            Core Blast at Lv 3.
//   Programmer: an alternate Commander form. Towers near it attack faster; System Overdrive at Lv 3.
//   Cyborg: an alternate Commando form. Heavy bursts with a reload; Magnum Howitzer blasts from Lv 3,
//           no reload from Lv 4, rockets at Lv 5.
//   Incinerator: an alternate Hallowboomer form. Burns zombies; Heat makes burns stronger, but at
//                100 Heat it overheats and blows up unless Cool Down is switched on.
//   Smuggler: an alternate DJ form. A blunderbuss that plunders cash for every player each wave,
//             slows what it hits, and from Lv 4 makes towers near it hit harder (Hunting Crew).
//   Mage: weak long-range magic shots. Builds up its owner's Arcana, shoots faster with more of it,
//         calls down lightning every 10 shots (Stormbringer), and Artificial Ascent at Lv 5.
//
// New mechanic (see computeBuffs in sim/parts/shared.js):
//   cliffBoost: { boost, stacks, radius }  Bullseye Support: other cliff towers (placement 'cliff')
//               within `radius` get `boost` more range. Boosts from different Poachers add up,
//               up to `stacks` of them. (Poachers don't boost Poachers: towers never boost their
//               own type.)
//   ninja: { hpBonus, store, refill }  Ninja (see updateTower and ninjaShot in sim/parts/weapons4.js):
//               hpBonus: basic hits add floor((target health x tower level / 80) ^ 0.4).
//               store: shurikens it saves up while idle (one per `cooldown`). They all go out at
//               once when a zombie comes in range, each one adding a throw to the burst, and that
//               burst's throws come 60% faster. refill: shurikens saved when the zombie it is
//               targeting dies to it (its ability counts too).
//   bomber: { bombs, fourth }  Bomber (see updateBomber in sim/parts/weapons4.js): lobs a bomb at
//               its target that explodes in `radius`. While nothing is in range it lays a bomb on
//               the path in range instead, up to `bombs` lying there at once; they blow up when a
//               zombie walks over them. fourth: every 4th bomb deals that many times the damage.
//   burnMult: { mult, hot, over }  hits on burning zombies deal `mult` x damage (`hot` x when the
//               burn deals more than `over` a second). Read in damage() in sim/parts/damage.js.
//   crush: { every, radius, weak, time, cap, after }  Berserker Crushing Blow (see berserkHit in
//               sim/parts/weapons4.js): every `every`th hit slams the ground at its target, hitting
//               every zombie within `radius` for its damage and adding `weak` Physical Weakness
//               (more damage taken from physical hits: everything but lasers, golden damage and
//               damage over time) for `time` s, up to `cap`. after: at full Rage a second slam
//               (Aftershock) follows with half the damage and half the weakness time.
//   rage: { per, max, weakStacks, idle }  Berserker Rage: +1 stack per hit (`weakStacks` on
//               weakened zombies), each +`per` Crushing Blow damage, up to `max` stacks; all
//               lost after `idle` s without a hit.
//   bless: n  Priest (see updatePriest in sim/parts/weapons4.js and computeBuffs): locks onto the
//               nearest tower in its `aura` that attacks and gives it +n damage (Priests don't add
//               up: the best one counts). blessHidden: that tower also sees hidden zombies.
//   maxOne: true  (on a level) only one of a player's towers of this type can have this level.
//   maxCount: n  (on a level) only n of a player's towers of this type can have this level.
//   pay: { cash, count, every }  Farmer (see updateFarmer in sim/parts/weapons4.js): gets `count`
//               paychecks at the start of every wave (unused ones are kept), and pays one, worth
//               `cash`, every `every` s while the wave is on. organize: other Farmers within its
//               `range` pay that much faster.
//   slash: { damage, cooldown, radius, arc, min }  Bandit (see banditSlash in sim/parts/weapons4.js):
//               besides its gun, a sword swing on its own timer that hits every zombie within
//               `radius` in front of it (an `arc` wide), only when at least `min` zombies are that close.
//   noResist: true  (Eradicator) skips every resistance (bullet, laser, explosive, golden, melee),
//               but armor and defense still count. Read in damage() in sim/parts/damage.js.
//   ray: { damage, cooldown, range, windup, linger, width, cut, maxCut, burn, extra }  Eradicator
//               Raybreak (see updateRay in sim/parts/weapons4.js): after `windup` s of charging it
//               fires a beam `range` long at the zombie its orbs are shooting (or the one its
//               targeting picks within `range`). The beam stays `linger` s and hits every zombie
//               inside it (`width` wide) once for `damage`. Each kill by the beam cuts the time to
//               the next one by `cut` of its `cooldown`, up to `maxCut`. burn: { share, cap, time }
//               each hit also adds a burn stack worth `share` of the zombie's health now (at most
//               `cap`) spread over `time` s. extra: { count, mult } more beams fired off to the sides.
//   overload: n  (on a level) buying this level adds n ΘVERLOAD to its owner for good (GAME.overload
//               in config.js; see drainOverload in sim/parts/waves.js).
//   hpPct: { pct, max }  (blasts) each zombie hit also takes `pct` of its max health, but the
//               hit never goes over `max` x the tower's damage. Read in explodeHits (sim/parts/damage.js).
//   double: true  (Warrior) every swing hits its target twice. Read at the end of updateTower
//               (sim/parts/tower-update.js).
//   arcana: { gain, cap }  Mage (see mageHit in sim/parts/weapons4.js): every attack adds `gain`
//               Arcana to its owner, up to `cap`. Arcana belongs to the player, not the tower.
//   arcanaRate: n  shoots n faster (0.01 = 1%) for every 10 Arcana its owner has. Read where the
//               cooldown ticks in updateTower (sim/parts/tower-update.js).
//   storm: n  Stormbringer: every 10th attack also calls down n lightning bolts on zombies in
//               range, each dealing (damage + Arcana / 15) ^ 1.1 in a blast of 3 + Arcana / 100.
//   ARTS (Magical ARTS, e.arts): zombies take that much more damage from everything. Read in
//               damage() in sim/parts/damage.js.
//   thief: { rate, max }  Thief: after each wave its owner gets `rate` cash per damage it dealt
//               that wave, at most `max` (payIncome in sim/parts/waves.js).
//   hex: [a, b, c]  Thief Hex Thief: +2 damage for each of these its owner's Arcana is above.
//   dummybane: s  Thief: every hit adds +1 damage for `s` seconds (stacks; t.db in updateTower).
//   resistPierce: n  Exterminator: ignores that share of every resistance (damage in sim/parts/damage.js).
//   pelletW: n  Recon Heavy Shells: how close a pellet must pass to hit (PELLET_WIDTH otherwise).
//   burnSlow: n  (Infernus, on a level) how much its burns slow; the tower's own burnSlow before that.
//   tip: { width, bonus, fast, cyclone }  Spearman (see updateTower in sim/parts/tower-update.js and
//               edgeCyclone in weapons3.js). noRangeBuff: true (on the tower) range buffs don't count.
//   trueDmg: true  True damage (see damage in sim/parts/damage.js): no resistance, armor or
//               defense stops it.
//
// Numbers are the spec's. Guessed: Poacher price 0 (owned from the start, it's the starter cliff
// tower), its inner range (radius 15) and the arrow look; Gunner costs 1 Dimension Shard like most forms.

// Ninja: Shirayuki Shuriken. A giant shuriken thrown onto the path at its target (or the closest
// bit of path if there is none). It spins for `time` s, drifting slowly toward the nearest zombie,
// and hits every zombie within `radius` for `mult` x the tower's damage every `tick` s, ignoring
// all resistance. Its shop perk Kuroyuki Shuriken (much less damage, reveals hidden zombies for
// every tower) is not built yet.
const shirayuki = (mult, cooldown) => ({ key: 'shirayuki', name: 'Shirayuki Shuriken', cooldown, mult, tick: 0.25, radius: 4, time: 9, drift: 1.5,
  desc: `Throws a giant spinning shuriken onto the path for 9s: ${mult}x the Ninja's damage every 0.25s to every zombie it touches, ignoring all resistance` });
const ninja = (hpBonus, store, refill) => ({ hpBonus, store, refill });

// Bomber: Time Bomb. A big bomb thrown onto the path at its target (or the closest bit of path)
// that blows up after `fuse` s for `damage` in `radius`.
const timeBomb = { key: 'timeBomb', name: 'Time Bomb', cooldown: 30, damage: 500, fuse: 5, radius: 6,
  desc: 'Throws a big bomb onto the path that blows up after 5s for 500 damage' };
const bomber = (bombs, fourth = 1) => ({ bombs, fourth });

const bullseye = (boost) => ({ boost, stacks: 3, radius: 15 });

// Berserker: Fatal Frenzy. Swings 15% faster and can't be stunned for 10s.
const fatalFrenzy = { key: 'fatalFrenzy', name: 'Fatal Frenzy', cooldown: 40, duration: 10, self: true, rate: 1.15, immune: true,
  desc: 'For 10s: swings 15% faster and can\'t be stunned' };
const crush = (cap, after = false) => ({ every: 5, radius: 3, weak: 0.03, time: 15, cap, after });
const RAGE = { per: 0.05, max: 10, weakStacks: 2, idle: 4 };

// Priest abilities. Their "($N)" prices are ignored (abilities are free).
const changeTarget = (cooldown) => ({ key: 'changeTarget', name: 'Change Target', cooldown,
  desc: 'Blesses the next tower in range instead' });
const divineShield = { key: 'divineShield', name: 'Divine Shield', cooldown: 30, duration: 6,
  desc: 'Towers in range shake off stuns and can\'t be stunned for 6s' };

// Farmer: Rice From The Void. Pays every paycheck it has left right away (35% less), then fights
// with melee swings for `duration` s, earning nothing meanwhile.
const riceVoid = { key: 'riceVoid', name: 'Rice From The Void', cooldown: 300, duration: 30, cut: 0.35, damage: 120, swing: 1, reach: 6,
  desc: 'Pays all its paychecks now (35% less), then swings at zombies for 120 damage for 30s (no paychecks meanwhile)' };
const pay = (cash, count, every) => ({ cash, count, every });

// Bandit: the sword swing (`radius` 6 and the arc are guesses; the spec only says "inner ring").
const slash = (damage, cooldown, min = 1) => ({ damage, cooldown, radius: 6, arc: 2.1, min });

// Eradicator: Raybreak.
const ray = (damage, o = {}) => ({ damage, cooldown: 10, range: 20, windup: 0.5, linger: 1, width: 1.6, cut: 0.1, maxCut: 0.75, ...o });
const RAY_BURN = { share: 0.05, cap: 400, time: 8 };

// Mage: Artificial Ascent. An arcane blast where the player clicks: `mult` x the Mage's damage to
// every zombie in `radius`, and Magical ARTS on each (`arts` more damage taken for `time` s,
// adding up to `cap`). More Arcana makes the ARTS stronger and last longer (see arcaneBlast).
const ascent = { key: 'artificialAscent', name: 'Artificial Ascent', cooldown: 50, aim: true, reach: 40, mult: 3, radius: 6, arts: 0.05, time: 15, cap: 0.25,
  desc: 'Fires a blast of arcane energy where you click: 3x the Mage\'s damage, and Magical ARTS (+5% damage taken from everything for 15s, up to 25%). More Arcana makes the ARTS stronger and last longer' };
const snowfall = { key: 'snowfall', name: 'Snowfall', cooldown: 50, freeze: 6, vuln: 0.2, extra: 10,
  desc: 'Freezes every zombie on the map for 6s (not bosses). Frozen zombies take +20% damage. +10s cooldown for every other max level Snowman' };
const ARCANA = (gain) => ({ gain, cap: 200 });
// Exterminator: Onslaught. Like John's Rage Mode: other towers within `radius` deal `boost` more damage.
// radius 27 = its Lv 5 range (20) after RANGE_BOOST.
const onslaught = (boost, duration, cooldown) => ({ key: 'rage', name: 'Onslaught', cooldown, duration, radius: 27, boost,
  desc: `Towers in its range deal ${Math.round(boost * 100)}% more damage for ${duration}s` });
const THIEF_MAX = 8000;
// Programmer System Overdrive: `boost` on top of its own buff makes 50% (Call to Arms code).
const overdrive = (boost, cooldown) => ({ key: 'cta', name: 'System Overdrive', desc: 'Firerate boost 50% for 10s, and it attacks', cooldown, duration: 10, boost });
// Incinerator Cool Down: switches on and off (see updateIncinerator in sim/parts/weapons4.js).
const COOL_DOWN = { key: 'coolDown', name: 'Cool Down', desc: 'On: stops attacking and cools down fast. Press again to switch it off', cooldown: 1 };
// Smuggler Hunting Crew (towers named in `names` get `fav`, the rest `boost`).
const CREW = { boost: 0.1, fav: 0.25, names: ['Bandit', 'Archer', 'Thief', 'Mercenary', 'Mercenary Base', 'Bomber', 'Hunter', 'Berserker'], cash: 0.2, max: 0.5 };

export const ELEVENTH_TOWERS = {
  poacher: {
    name: 'Poacher',
    price: 0,
    cost: 450,
    placement: 'cliff',
    blurb: 'The starter cliff tower. Fires one arrow at a time, slowly, for good damage, so it is great against bosses. From Lv 3 it sees hidden zombies and gives other cliff towers near it more range (up to 3 Poachers can stack). Cliffs only.',
    tip: 'Put Poachers next to your other cliff towers: each one gives them more range, up to 3 times.',
    levels: [
      { name: 'Poacher', desc: 'Fires one arrow at a time from a cliff.', damage: 4, cooldown: 2.5, range: 20, hidden: false },
      { name: 'Quick Hands', desc: '+1 damage, and shoots faster (every 2s).', cost: 200, damage: 5, cooldown: 2, range: 20, hidden: false },
      { name: 'Sharp Arrows', desc: '+4 damage.', cost: 350, damage: 9, cooldown: 2, range: 20, hidden: false },
      { name: 'Bullseye Support', desc: '+5 range and hidden detection. Other cliff towers near it get +9% range (stacks up to 3 times).', cost: 900, damage: 9, cooldown: 2, range: 25, hidden: true,
        cliffBoost: bullseye(0.09) },
      { name: 'Vantage', desc: '+3 range and +5 damage.', cost: 950, damage: 14, cooldown: 2, range: 28, hidden: true,
        cliffBoost: bullseye(0.09) },
      { name: 'Arrows of Power', desc: '+6 damage, and the cliff range boost rises to 13%.', cost: 2000, damage: 20, cooldown: 2, range: 28, hidden: true,
        cliffBoost: bullseye(0.13) },
    ],
  },
  // Gunner (alternate Soldier form): 3-shot bursts, 0.2s apart (0.1s at Lv 5). `cooldown` is the
  // full cycle, as for every burst tower.
  soldierGunner: {
    name: 'Gunner',
    altOf: 'soldier',
    form: 'Gunner',
    shards: 1,
    price: 0,
    cost: 350,
    burstGap: 0.2,
    blurb: 'An alternate Soldier that fires short bursts. Cheap to place, and it sees hidden zombies from Lv 3. At Lv 4 it swaps to two burst pistols, and at Lv 5 its bursts get big and fast.',
    tip: 'A cheap early pick. Push it to Lv 3 before hidden zombies show up.',
    levels: [
      { name: 'Gunner', desc: 'Fires 3-shot bursts at one zombie at a time.', damage: 1, burst: 3, cooldown: 1.5, range: 10, hidden: false },
      { name: 'Precision', desc: '+2 range.', cost: 150, damage: 1, burst: 3, cooldown: 1.5, range: 12, hidden: false },
      { name: 'Shredder Bullets', desc: '+1 damage, and bursts come faster (every 1s).', cost: 250, damage: 2, burst: 3, cooldown: 1, range: 12, hidden: false },
      { name: 'Marksman Eye', desc: '+2 range, +1 damage and hidden detection.', cost: 600, damage: 3, burst: 3, cooldown: 1, range: 14, hidden: true },
      { name: 'Burst Pistols', desc: 'Two pistols: +1 range, +2 damage and 4 shots per burst.', cost: 1750, damage: 5, burst: 4, cooldown: 1, range: 15, hidden: true },
      { name: 'Rapidfire Assault', desc: '+4 damage, 6 shots per burst, and the shots in a burst come twice as fast.', cost: 4150, damage: 9, burst: 6, burstGap: 0.1, cooldown: 1, range: 15, hidden: true },
    ],
  },
  // Future Sniper (alternate Sniper form). Its shop perk Sniper Ricochet (one shot hits several
  // zombies) is not built yet.
  sniperFuture: {
    name: 'Future Sniper',
    altOf: 'sniper',
    form: 'Future',
    shards: 1,
    price: 0,
    cost: 1250,
    placement: 'cliff',
    blurb: 'An alternate Sniper with huge range. Fires one slow, heavy shot at a time. Cliffs only. Sees hidden zombies from Lv 2, and at Lv 5 its shots become true damage that no resistance, armor or defense can stop, which is great against tough bosses.',
    tip: 'Set it to Strongest. Archers and Programmers near it make it even better.',
    levels: [
      { name: 'Future Sniper', desc: 'One slow, heavy shot at a time from very far away.', damage: 15, cooldown: 4, range: 25, hidden: false },
      { name: 'Steady Aim', desc: '+3 damage and +4 range.', cost: 400, damage: 18, cooldown: 4, range: 29, hidden: false },
      { name: 'Hidden Sights', desc: '+4 damage and hidden detection.', cost: 450, damage: 22, cooldown: 4, range: 29, hidden: true },
      { name: 'Marksman Bullets', desc: '+8 damage, +5 range, and it shoots faster (every 3.5s).', cost: 1600, damage: 30, cooldown: 3.5, range: 34, hidden: true },
      { name: 'Head Hunter', desc: '+15 damage and +4 range.', cost: 2400, damage: 45, cooldown: 3.5, range: 38, hidden: true },
      { name: 'Future Rifle', desc: '+70 damage, and its shots become true damage: no resistance, armor or defense can stop them.', cost: 9000, damage: 115, cooldown: 3.5, range: 38, hidden: true, trueDmg: true },
    ],
  },
  // Ninja: bursts of shurikens `burstGap` s apart; `pass` = how many more zombies each one pierces.
  ninja: {
    name: 'Ninja',
    price: 1500,
    cost: 500,
    burstGap: 0.15,
    blurb: 'A quick, versatile tower that sees hidden zombies from the start. Throws bursts of shurikens, and its hits do more to zombies with lots of health. From Lv 2 it saves up shurikens while idle and throws them all at once, and it can throw a giant spinning shuriken that ignores all resistance.',
    tip: 'Let it rest between waves: it saves up shurikens and throws them all as soon as a zombie shows up.',
    levels: [
      { name: 'Ninja', desc: 'Throws a shuriken at one zombie at a time. Sees hidden zombies.', damage: 2, cooldown: 0.75, range: 13, burst: 1, hidden: true },
      { name: 'Ninja Training', desc: '+3 range and 2 shurikens per burst. Hits do extra damage to zombies with lots of health.', cost: 400, damage: 2, cooldown: 0.75, range: 16, burst: 2, hidden: true,
        ninja: ninja(true, 0, 0) },
      { name: 'Dummyjitsu', desc: '+2 damage. Saves up 3 shurikens while idle. Unlocks Shirayuki Shuriken.', cost: 1300, damage: 4, cooldown: 0.75, range: 16, burst: 2, hidden: true,
        ninja: ninja(true, 3, 0), abilities: [shirayuki(2, 40)] },
      { name: 'Lightweight Shurikens', desc: '+3 range and faster throws (every 0.5s). Gets 1 shuriken back when its target dies.', cost: 1650, damage: 4, cooldown: 0.5, range: 19, burst: 2, hidden: true,
        ninja: ninja(true, 3, 1), abilities: [shirayuki(2, 40)] },
      { name: 'Jonin', desc: '+1 damage and shurikens pierce 2 zombies. Shirayuki Shuriken does 3x damage and recharges in 30s.', cost: 1950, damage: 5, cooldown: 0.5, range: 19, burst: 2, pass: 1, hidden: true,
        ninja: ninja(true, 3, 1), abilities: [shirayuki(3, 30)] },
      { name: 'Rayedge Shurikens', desc: '+3 damage, 3 shurikens per burst, pierce 3 zombies, saves up 5 shurikens, and gets 3 back when its target dies.', cost: 2550, damage: 8, cooldown: 0.5, range: 19, burst: 3, pass: 2, hidden: true,
        ninja: ninja(true, 5, 3), abilities: [shirayuki(3, 30)] },
    ],
  },
  // Bomber (alternate Trapper form). Bombs don't hit flying zombies. Its shop perk Pumpkin Bomb
  // and the Shatter bounce are not built yet.
  trapperBomber: {
    name: 'Bomber',
    altOf: 'trapper',
    form: 'Bomber',
    shards: 1,
    price: 0,
    cost: 700,
    limit: 8,
    lead: true,
    flying: false,
    fly: 22,
    blurb: 'An alternate Trapper that loves explosions. Lobs bombs that blow up in an area, and while no zombie is in range it lays bombs on the path that go off when zombies walk over them. Its bombs hurt burning zombies more. Sees hidden zombies from Lv 2, and at Lv 4 it gets the Time Bomb.',
    tip: 'Put it next to fire towers: burning zombies take 1.5x damage from its bombs (up to 3x at Lv 5).',
    levels: [
      { name: 'Bomber', desc: 'Lobs a bomb that explodes in an area. Lays up to 3 bombs on the path when no zombie is in range.', damage: 4, cooldown: 2, radius: 3, range: 11, hidden: false,
        bomber: bomber(3) },
      { name: 'More Gunpowder', desc: '+1 damage, and bombs deal 1.5x damage to burning zombies.', cost: 550, damage: 5, cooldown: 2, radius: 3, range: 11, hidden: false,
        bomber: bomber(3), burnMult: { mult: 1.5 } },
      { name: 'Explosive Arsenal', desc: '+2 damage, bigger blasts, hidden detection, and it can lay 4 bombs.', cost: 1000, damage: 7, cooldown: 2, radius: 4, range: 11, hidden: true,
        bomber: bomber(4), burnMult: { mult: 1.5 } },
      { name: 'Dynamites', desc: '+3 range and +3 damage. Every 4th bomb deals 3x damage.', cost: 3000, damage: 10, cooldown: 2, radius: 4, range: 14, hidden: true,
        bomber: bomber(4, 3), burnMult: { mult: 1.5 } },
      { name: 'Timed Detonation', desc: '+5 damage, throws faster (every 1.5s), and unlocks Time Bomb.', cost: 3500, damage: 15, cooldown: 1.5, radius: 4, range: 14, hidden: true,
        bomber: bomber(4, 3), burnMult: { mult: 1.5 }, abilities: [timeBomb] },
      { name: 'Critical Explosives', desc: '+7 damage and it can lay 6 bombs. Zombies burning for more than 7 a second take 3x damage.', cost: 6000, damage: 22, cooldown: 1.5, radius: 4, range: 14, hidden: true,
        bomber: bomber(6, 3), burnMult: { mult: 1.5, hot: 3, over: 7 }, abilities: [timeBomb] },
    ],
  },
  // Berserker (alternate Slugger form, like the Brawler): chops with two axes.
  berserker: {
    name: 'Berserker',
    altOf: 'slugger',
    form: 'Berserker',
    shards: 1,
    price: 0,
    cost: 750,
    limit: 10,
    melee: true,
    lead: true,
    flying: false,
    blurb: 'A melee tower that chops zombies with two axes. From Lv 1, every 5th hit is a Crushing Blow that slams the ground, hurting every zombie near its target and making them weaker to physical damage. It builds up Rage as it fights, and at Lv 4 it gets Fatal Frenzy.',
    tip: 'Put it where zombies bunch up. Weakened zombies take more damage from your other towers too (not from lasers or golden damage).',
    levels: [
      { name: 'Berserker', desc: 'Chops the closest zombie with two axes.', damage: 5, cooldown: 0.8, range: 5, hidden: false },
      { name: 'Larger Muscles', desc: 'Every 5th hit is a Crushing Blow: it slams the ground, hitting every zombie near its target and giving them Physical Weakness (+3% physical damage taken for 15s, up to 10%).', cost: 600, damage: 5, cooldown: 0.8, range: 5, hidden: false,
        crush: crush(0.1) },
      { name: 'Violent Tendencies', desc: '+2 damage and faster swings (every 0.75s). Rage: every hit adds 1 stack (2 on weakened zombies), each +5% Crushing Blow damage, up to 50%. Rage is lost after 4s without a hit.', cost: 1200, damage: 7, cooldown: 0.75, range: 5, hidden: false,
        crush: crush(0.1), rage: RAGE },
      { name: 'Brutalist', desc: '+5 damage. At 10 Rage, Crushing Blow adds an Aftershock: a second slam with half the damage and half as long a weakness.', cost: 3000, damage: 12, cooldown: 0.75, range: 5, hidden: false,
        crush: crush(0.1, true), rage: RAGE },
      { name: 'Berserker', desc: 'Faster swings (every 0.6s), Physical Weakness goes up to 20%, and unlocks Fatal Frenzy.', cost: 7500, damage: 12, cooldown: 0.6, range: 5, hidden: false,
        crush: crush(0.2, true), rage: RAGE, abilities: [fatalFrenzy] },
    ],
  },
  // Priest (alternate Doctor form, like the Medic): never attacks. Its `aura` is its range.
  priest: {
    name: 'Priest',
    altOf: 'doctor',
    form: 'Priest',
    shards: 1,
    price: 0,
    cost: 600,
    limit: 5,
    kind: 'support',
    size: 0.5, // takes up half the room: other towers can stand closer to it
    blurb: 'Never attacks, and takes up less space than other towers. Blesses the closest tower in range that attacks: it deals more damage (burns and poisons too). Change Target picks the next tower. At max level the blessed tower sees hidden zombies, and Divine Shield stops stuns. Only one Priest can be maxed.',
    tip: 'Bless your strongest tower. At max level, pick a strong tower that cannot see hidden zombies.',
    levels: [
      { name: 'Priest', desc: 'Blesses the closest tower in range: +12% damage.', aura: 8, bless: 0.12, hidden: false,
        abilities: [changeTarget(15)] },
      { name: 'Lesser Blessing', desc: 'Blessing: +18% damage.', cost: 400, aura: 8, bless: 0.18, hidden: false,
        abilities: [changeTarget(15)] },
      { name: 'Holy Favor', desc: 'Blessing: +30% damage, and +5 range.', cost: 3000, aura: 13, bless: 0.3, hidden: false,
        abilities: [changeTarget(15)] },
      { name: 'Divinity', desc: 'Blessing: +50% damage. Change Target recharges in 5s.', cost: 6000, aura: 13, bless: 0.5, hidden: false,
        abilities: [changeTarget(5)] },
      { name: 'Guardian Angel', desc: 'Blessing: +150% damage, and the blessed tower sees hidden zombies. Unlocks Divine Shield. Only one Priest can have this.', cost: 22500, aura: 13, bless: 1.5, blessHidden: true, maxOne: true, hidden: false,
        abilities: [changeTarget(5), divineShield] },
    ],
  },
  // Farmer (alternate Farm form): pays during the wave, not at the end.
  farmer: {
    name: 'Farmer',
    altOf: 'oilDerrick',
    form: 'Farmer',
    shards: 1,
    price: 0,
    cost: 1000,
    limit: 2,
    kind: 'income',
    blurb: 'Never attacks (until Lv 4). Gets paychecks at the start of every wave and pays them out one by one during the wave. Paychecks it does not use are kept for later. At Lv 4, Rice From The Void cashes them all in at once and lets it fight for 30s.',
    tip: 'Do not skip waves too fast: it pays during the wave. Use Rice From The Void when lots of paychecks have piled up.',
    levels: [
      { name: 'Farmer', desc: '8 paychecks every wave: $30 each, one every 4s.', range: 11, pay: pay(30, 8, 4), hidden: false },
      { name: 'Plantation', desc: '+$20 per paycheck.', cost: 800, range: 11, pay: pay(50, 8, 4), hidden: false },
      { name: 'Farming Skillz', desc: '+$10 per paycheck, one every 3s, and 15 paychecks every wave.', cost: 1950, range: 11, pay: pay(60, 15, 3), hidden: false },
      { name: 'Farmers Organization', desc: '+$40 per paycheck. Other Farmers nearby pay 20% faster.', cost: 3100, range: 11, pay: pay(100, 15, 3), organize: 0.2, hidden: false },
      { name: 'Shadow Reaper of the Rice Dimension', desc: '50 paychecks every wave, one every 2s. Unlocks Rice From The Void.', cost: 17000, range: 11, pay: pay(100, 50, 2), organize: 0.2, hidden: false,
        abilities: [riceVoid] },
    ],
  },
  // Bandit (alternate Scout form): a gun plus, from Lv 2, a sword swing on its own timer.
  // Lv 5 is the spec's "Potential" level (the Potential: Bandit shop perk isn't built, so every
  // Bandit can reach it). Its other perks (Candy Corn, Deadeye Bandit, Perk Mastery) aren't built.
  bandit: {
    name: 'Bandit',
    altOf: 'scout',
    form: 'Bandit',
    shards: 1,
    price: 0,
    cost: 400,
    burstGap: 0.2,
    blurb: 'An alternate Scout that shoots from range. From Lv 2 it also swings a sword at every zombie close in front of it, and from Lv 3 it fires two shots at a time and sees hidden zombies. No placement limit.',
    tip: 'Put it near the path so zombies walk into its sword range too.',
    levels: [
      { name: 'Bandit', desc: 'Shoots one zombie at a time.', damage: 2, cooldown: 1.2, range: 12, hidden: false },
      { name: 'Combat Ready', desc: '+1 damage.', cost: 200, damage: 3, cooldown: 1.2, range: 12, hidden: false },
      { name: 'Bladeworks', desc: 'Shoots faster (every 1s) and +1 range. Adds a sword swing: 6 damage to every zombie close in front of it, every 2s.', cost: 380, damage: 3, cooldown: 1, range: 13, hidden: false,
        slash: slash(6, 2) },
      { name: 'Twinshot', desc: 'Fires two shots at a time, and sees hidden zombies.', cost: 800, damage: 3, burst: 2, cooldown: 1, range: 13, hidden: true,
        slash: slash(6, 2) },
      { name: 'Combat Mastery', desc: '+3 range, +6 damage, and the sword does 18 damage.', cost: 2000, damage: 9, burst: 2, cooldown: 1, range: 16, hidden: true,
        slash: slash(18, 2) },
      { name: 'Potential', desc: '+25 damage and +4 range, but slower (every 1.7s). The sword does 68 damage every 1.7s, only when more than one zombie is close.', cost: 4800, damage: 34, cooldown: 1.7, range: 20, hidden: true,
        slash: slash(68, 1.7, 2) },
    ],
  },
  // Shrapnel Grenadier (alternate Grenadier form). Range follows the spec's table (+3 at Lv 3).
  grenadierShrapnel: {
    name: 'Shrapnel Grenadier',
    lead: true,
    altOf: 'grenadier',
    form: 'Shrapnel',
    shards: 1,
    price: 0,
    cost: 250,
    limit: Infinity,
    lob: 0.7,
    blurb: 'An alternate Grenadier that throws grenades into big blasts. At Lv 3 it gets a grenade launcher and sees hidden zombies. At max level every blast also hurts each zombie by 1% of its max health, so it is great against tough zombies. No placement limit.',
    tip: 'Cheap to start. Max it out to deal with big zombies and bosses.',
    levels: [
      { name: 'Shrapnel Grenadier', desc: 'Throws grenades that hurt every zombie in the blast.', damage: 3, cooldown: 2.5, range: 7, radius: 4, hidden: false },
      { name: 'Heavy Impact', desc: '+2 damage.', cost: 300, damage: 5, cooldown: 2.5, range: 7, radius: 4, hidden: false },
      { name: 'Bigger Bombs', desc: '+2 damage.', cost: 400, damage: 7, cooldown: 2.5, range: 7, radius: 4, hidden: false },
      { name: 'Grenade Launcher', desc: '+3 damage, +3 range, fires faster (every 1.8s) and sees hidden zombies.', cost: 1000, damage: 10, cooldown: 1.8, range: 10, radius: 4, hidden: true, lob: 0.5 },
      { name: 'Shrapnel Explosives', desc: '+6 damage and a bigger blast (4 > 6).', cost: 1550, damage: 16, cooldown: 1.8, range: 10, radius: 6, hidden: true, lob: 0.5 },
      { name: 'Demolition', desc: '+8 damage and +4 range. Each blast also hurts every zombie in it by 1% of its max health (up to 3x damage: 72).', cost: 3000, damage: 24, cooldown: 1.8, range: 14, radius: 6, hidden: true, lob: 0.5,
        hpPct: { pct: 0.01, max: 3 } },
    ],
  },
  // Warrior (alternate Enforcer form). Stats follow the spec's table (cost 400, Lv 4 swings every 0.7s).
  enforcerWarrior: {
    name: 'Warrior',
    altOf: 'enforcer',
    form: 'Warrior',
    shards: 1,
    price: 0,
    cost: 400,
    limit: Infinity,
    melee: true,
    lead: false,
    flying: false,
    bossStop: 0.5,
    blurb: 'An alternate Enforcer that slashes the closest zombie with a sword. At Lv 3 its blade turns ethereal and sees hidden zombies. At max level every swing hits twice. No placement limit.',
    tip: 'Short range: put it right next to a bend in the path.',
    levels: [
      { name: 'Warrior', desc: 'Slashes the closest zombie with a sword.', damage: 3, cooldown: 0.6, range: 5, hidden: false },
      { name: 'Broadsword', desc: '+2 damage.', cost: 300, damage: 5, cooldown: 0.6, range: 5, hidden: false },
      { name: 'Sharpness', desc: '+3 damage and +1 range.', cost: 700, damage: 8, cooldown: 0.6, range: 6, hidden: false },
      { name: 'Ethereal Blade', desc: '+6 damage and sees hidden zombies.', cost: 1200, damage: 14, cooldown: 0.6, range: 6, hidden: true },
      { name: 'Warrior Spirit', desc: '+12 damage and Double Strike: every swing hits twice (swings every 0.7s).', cost: 3500, damage: 26, cooldown: 0.7, range: 6, hidden: true,
        double: true },
    ],
  },
  // Snowman (alternate Snowballer form). Snowballs freeze what they hit; bosses never freeze (bossStop 0).
  snowballerSnowman: {
    name: 'Snowman',
    altOf: 'snowballerFrost',
    form: 'Snowman',
    shards: 1,
    price: 0,
    cost: 550,
    limit: 12,
    lob: 0.6,
    lead: true,
    flying: false,
    bossStop: 0,
    kindLabel: 'Splash',
    blurb: 'An alternate Snowballer whose snowballs freeze zombies in their tracks. Bosses never freeze. From Lv 2 the whole blast freezes. At max level it unlocks Snowfall, which freezes every zombie on the map. Up to 12, and only 4 can reach max level.',
    tip: 'Great for holding zombies still while your big towers hit them.',
    levels: [
      { name: 'Snowman', desc: 'Throws a snowball that freezes the zombie it hits for 1s.', damage: 2, cooldown: 3, range: 9, radius: 1.5, maxHits: 1, freeze: 1, hidden: false },
      { name: 'Stronger Snowballs', desc: '+1 damage and freezes longer (1s > 1.25s).', cost: 350, damage: 3, cooldown: 3, range: 9, radius: 1.5, maxHits: 1, freeze: 1.25, hidden: false },
      { name: 'Cold Snap', desc: 'The snowball bursts and freezes every zombie in the blast.', cost: 650, damage: 3, cooldown: 3, range: 9, radius: 3, freeze: 1.25, hidden: false },
      { name: 'Winter Scarf', desc: '+2 range and throws faster (every 3s > 2.2s).', cost: 1050, damage: 3, cooldown: 2.2, range: 11, radius: 3, freeze: 1.25, hidden: false },
      { name: 'Frostbringer', desc: '+3 damage and a bigger blast.', cost: 2000, damage: 6, cooldown: 2.2, range: 11, radius: 4.5, freeze: 1.25, hidden: false },
      { name: 'Subzero', desc: '+7 damage, +3 range and freezes longer (1.25s > 2s).', cost: 3750, damage: 13, cooldown: 2.2, range: 14, radius: 4.5, freeze: 2, hidden: false },
      { name: 'Endless Blizzard', desc: '+22 damage and freezes longer (2s > 3.5s). Unlocks Snowfall. Only 4 Snowmen can have this.', cost: 23000, damage: 35, cooldown: 2.2, range: 14, radius: 4.5, freeze: 3.5, hidden: false,
        maxCount: 4, abilities: [snowfall] },
    ],
  },
  // Infernus (alternate Flamethrower form): a slow-fire support. Burn damage is per tick, and the
  // game burns smoothly, so `burn` here is burn damage / tick (per second). burnSlow on a level
  // sets how much its burns slow.
  flamethrowerInfernus: {
    name: 'Infernus',
    altOf: 'flamethrower',
    form: 'Infernus',
    shards: 1,
    price: 0,
    cost: 750,
    limit: Infinity,
    lead: true,
    burnSlow: 0.1,
    kindLabel: 'Slow',
    blurb: 'An alternate Flamethrower that helps your other towers. Its wide cone of fire sets zombies burning, and burning zombies move slower, so your big towers get more time to hit them. Flames even burn hidden zombies. No placement limit.',
    tip: 'Put it where the path enters your main defense so the zombies stay slow while your damage towers work.',
    levels: [
      { name: 'Infernus', desc: 'Sprays a cone of fire: zombies burn for 3s (1 damage a second) and move 10% slower.', damage: 0, burn: 1, burnTime: 3, cooldown: 0.25, range: 11, cone: 0.45, hidden: false },
      { name: 'Bigger Flames', desc: '+1 damage and bigger flames.', cost: 500, damage: 1, burn: 1, burnTime: 3, cooldown: 0.25, range: 11, cone: 0.55, hidden: false },
      { name: 'Napalm Fire', desc: 'Burns last longer (3s > 6s) and slow by 15%.', cost: 850, damage: 1, burn: 1, burnTime: 6, burnSlow: 0.15, cooldown: 0.25, range: 11, cone: 0.55, hidden: false },
      { name: 'Blazing Arson', desc: '+2 burn damage, bigger flames and +1 damage.', cost: 1450, damage: 2, burn: 3, burnTime: 6, burnSlow: 0.15, cooldown: 0.25, range: 11, cone: 0.65, hidden: false },
      { name: 'The Furnace', desc: 'Burns hurt twice as often (every 1s > 0.5s) and +1 burn damage.', cost: 2250, damage: 2, burn: 8, burnTime: 6, burnSlow: 0.15, cooldown: 0.25, range: 11, cone: 0.65, hidden: false },
      { name: 'Absolute Hellfire', desc: 'Burns last longer (6s > 10s), +6 burn damage, +2 damage, and burns slow by 25%.', cost: 7500, damage: 4, burn: 20, burnTime: 10, burnSlow: 0.25, cooldown: 0.25, range: 11, cone: 0.65, hidden: false },
    ],
  },
  // Spearman (alternate Assassin form). range = regular range + tip range; tip: { width, bonus }:
  // zombies in the outer `width` studs of its range take `bonus` more (Tip Damage). fast: stabs
  // at closer zombies come that many times faster. cyclone: a tip attack hits the whole outer ring.
  assassinSpearman: {
    name: 'Spearman',
    altOf: 'assassin',
    form: 'Spearman',
    shards: 1,
    price: 0,
    cost: 450,
    limit: Infinity,
    melee: true,
    lead: false,
    flying: false,
    noRangeBuff: true,
    blurb: 'An alternate Assassin with a long spear. Zombies near the far edge of its reach take Tip Damage, a lot more than a normal stab. Range buffs don\'t work on it. Sees hidden zombies from Lv 3. No placement limit.',
    tip: 'Place it a little away from the path so the zombies walk through the tip of its spear.',
    levels: [
      { name: 'Spearman', desc: 'Stabs with a spear: 2 damage, or 4 at the tip.', damage: 2, cooldown: 0.8, range: 6.5, tip: { width: 1.5, bonus: 2 }, hidden: false },
      { name: 'Steel Tip', desc: '+2 damage and +2 Tip Damage.', cost: 500, damage: 4, cooldown: 0.8, range: 6.5, tip: { width: 1.5, bonus: 4 }, hidden: false },
      { name: 'Spear Rush', desc: '+3 damage, stabs faster (every 0.8s > 0.6s), and stabs that are not at the tip are 15% faster.', cost: 750, damage: 7, cooldown: 0.6, range: 6.5, tip: { width: 1.5, bonus: 4, fast: 1.15 }, hidden: false },
      { name: 'Piercing Thorn', desc: '+4 damage, +2 Tip Damage and sees hidden zombies.', cost: 1000, damage: 11, cooldown: 0.6, range: 6.5, tip: { width: 1.5, bonus: 6, fast: 1.15 }, hidden: true },
      { name: 'Striking Spear', desc: '+4 damage and +1 tip range.', cost: 1450, damage: 15, cooldown: 0.6, range: 7.5, tip: { width: 2.5, bonus: 6, fast: 1.15 }, hidden: true },
      { name: 'Vicious Cyclone', desc: '+4 damage and Edge Cyclone: a tip attack spins the spear and hits every zombie at the tip.', cost: 4000, damage: 19, cooldown: 0.6, range: 7.5, tip: { width: 2.5, bonus: 6, fast: 1.15, cyclone: true }, hidden: true },
    ],
  },
  // Eradicator: quick energy orbs, and from Lv 3 the Raybreak beam (on its own timer).
  eradicator: {
    name: 'Eradicator',
    price: 2000,
    cost: 500,
    blurb: 'Fires quick little energy orbs that ignore resistance (from Lv 1), but its real power is the Raybreak from Lv 3: a huge piercing beam that hits every zombie in a line, and burns them at Lv 5. Careful: its last three upgrades add ΘVERLOAD, which drains your money every second for the rest of the game, even after you sell it.',
    tip: 'One max Eradicator is fine. Too much ΘVERLOAD drains money twice as fast and cuts the cash you get from hits.',
    levels: [
      { name: 'Eradicator', desc: 'Fires small energy orbs at one zombie at a time.', damage: 1, cooldown: 1, range: 11, hidden: false },
      { name: 'Powered Raygun', desc: '+5 range, shoots much faster (every 0.35s), and ignores all resistance.', cost: 1250, damage: 1, cooldown: 0.35, range: 16, noResist: true, hidden: false },
      { name: 'Raysight', desc: '+1 damage, +1 range and hidden detection.', cost: 1500, damage: 2, cooldown: 0.35, range: 17, noResist: true, hidden: true },
      { name: 'Alpha Ray', desc: 'Raybreak: every 10s it fires a piercing beam that hits every zombie in a line for 50 damage.', cost: 3000, damage: 2, cooldown: 0.35, range: 17, noResist: true, hidden: true,
        ray: ray(50, { cut: 0 }) },
      { name: 'Beta Ray', desc: 'Shoots faster (every 0.25s). Raybreak does 150 damage, and each kill by it makes the next one come 10% sooner (up to 75%). +5 ΘVERLOAD.', cost: 5000, damage: 2, cooldown: 0.25, range: 17, noResist: true, hidden: true, overload: 5,
        ray: ray(150) },
      { name: 'Gamma Ray', desc: '+1 damage. Raybreak does 500 damage and burns (5% of the zombie\'s health, up to 400, over 8s; stacks). +3 ΘVERLOAD.', cost: 12500, damage: 3, cooldown: 0.25, range: 17, noResist: true, hidden: true, overload: 3,
        ray: ray(500, { burn: RAY_BURN }) },
      { name: 'Ultra Ray', desc: 'Raybreak: +10 range, 650 damage, 15% sooner per kill, and two more wild beams for 75% damage (487.5). +8 ΘVERLOAD.', cost: 40000, damage: 3, cooldown: 0.25, range: 17, noResist: true, hidden: true, overload: 8,
        ray: ray(650, { range: 30, cut: 0.15, burn: RAY_BURN, extra: { count: 2, mult: 0.75 } }) },
    ],
  },
  // Mage: weak long-range shots. Arcana is its owner's, shared by all their Mages.
  // Thief (alternate Cowboy form): a dagger fighter whose damage turns into cash after each wave.
  // `thief.rate` is cash per damage: 1 at first, x1.6 at Lv 2 and x2.22 at Lv 4 (the spec's real
  // multipliers, not the 175% / 225% its upgrade text shows).
  cowboyThief: {
    name: 'Thief',
    altOf: 'cowboy',
    form: 'Thief',
    shards: 1,
    price: 0,
    cost: 600,
    limit: Infinity,
    melee: true,
    lead: false,
    flying: false,
    blurb: 'An alternate Cowboy that stabs zombies up close. At the end of every wave, all the damage it dealt that wave turns into cash (up to $8,000 per Thief each wave). Hits harder with more Arcana from Lv 4, and keeps getting stronger while it keeps hitting at Lv 5. No placement limit.',
    tip: 'Put it where lots of zombies walk past close by. The more it hits, the more money it makes.',
    levels: [
      { name: 'Thief', desc: 'Stabs with a dagger. Its damage each wave turns into cash after the wave.', damage: 4, cooldown: 0.9, range: 5, hidden: false,
        thief: { rate: 1, max: THIEF_MAX } },
      { name: 'Crooked Connections', desc: 'Stabs faster (every 0.9s > 0.7s), and +$20 every wave.', cost: 200, damage: 4, cooldown: 0.7, range: 5, income: 20, hidden: false,
        thief: { rate: 1, max: THIEF_MAX } },
      { name: 'Pickpocket', desc: '+1 damage, and 60% more cash for its damage.', cost: 700, damage: 5, cooldown: 0.7, range: 5, income: 20, hidden: false,
        thief: { rate: 1.6, max: THIEF_MAX } },
      { name: 'Duel Daggers', desc: 'Two daggers: stabs much faster (every 0.7s > 0.45s).', cost: 1150, damage: 5, cooldown: 0.45, range: 5, income: 20, hidden: false,
        thief: { rate: 1.6, max: THIEF_MAX } },
      { name: 'Hex Thief', desc: '+4 damage and even more cash for its damage. +2 damage when your Arcana is above 10, 50 and 125 (up to +6).', cost: 2350, damage: 9, cooldown: 0.45, range: 5, income: 20, hidden: false,
        thief: { rate: 2.22, max: THIEF_MAX }, hex: [10, 50, 125] },
      { name: 'Dummybane', desc: 'Every hit gives it +1 damage for 12s (these add up).', cost: 4800, damage: 9, cooldown: 0.45, range: 5, income: 20, hidden: false,
        thief: { rate: 2.22, max: THIEF_MAX }, hex: [10, 50, 125], dummybane: 12 },
    ],
  },
  // Exterminator (alternate Mercenary Base form): a soldier, not a base. Has 7 levels (the spec's
  // 6 upgrades). Onslaught at Lv 5; Onrush (Lv 6) makes it stronger and gets through half of
  // every resistance.
  mercenaryExterminator: {
    name: 'Exterminator',
    altOf: 'mercenary',
    form: 'Exterminator',
    shards: 1,
    price: 0,
    cost: 1000,
    limit: 6,
    blurb: 'An alternate Mercenary Base: one soldier who shoots instead of a base that sends units. Shoots faster and faster as it levels up, sees hidden zombies from Lv 2, and at Lv 5 gets Onslaught, which makes every tower in its range deal more damage. At max level it gets through half of every resistance.',
    tip: 'Put your strongest towers inside its range so Onslaught boosts them.',
    levels: [
      { name: 'Exterminator', desc: 'Shoots one zombie at a time.', damage: 5, cooldown: 1.2, range: 12, hidden: false },
      { name: 'Firepower', desc: '+2 damage.', cost: 550, damage: 7, cooldown: 1.2, range: 12, hidden: false },
      { name: 'Pursuit', desc: '+3 range, and sees hidden zombies.', cost: 700, damage: 7, cooldown: 1.2, range: 15, hidden: true },
      { name: 'Assault', desc: 'Shoots much faster (every 1.2s > 0.45s).', cost: 1750, damage: 7, cooldown: 0.45, range: 15, hidden: true },
      { name: 'Exterminate', desc: '+2 range and +4 damage.', cost: 2000, damage: 11, cooldown: 0.45, range: 17, hidden: true },
      { name: 'Emissary', desc: '+3 range, shoots faster (every 0.45s > 0.22s), and unlocks Onslaught.', cost: 6500, damage: 11, cooldown: 0.22, range: 20, hidden: true,
        abilities: [onslaught(0.25, 8, 40)] },
      { name: 'Onrush', desc: '+2 damage, shoots faster (every 0.22s > 0.14s), and gets through half of every resistance. Onslaught: +35% damage for 10s, recharges in 30s.', cost: 10000, damage: 13, cooldown: 0.14, range: 20, resistPierce: 0.5, hidden: true,
        abilities: [onslaught(0.35, 10, 30)] },
    ],
  },
  // Miner (alternate Farm form): cash every wave, like a Farm.
  farmMiner: {
    name: 'Miner',
    altOf: 'farm',
    form: 'Miner',
    shards: 1,
    price: 0,
    cost: 300,
    limit: 6,
    kind: 'income',
    blurb: 'An alternate Farm: a miner who digs up cash every wave. Never attacks. Its later levels pay a lot more. Up to 6.',
    tip: 'Get your Miners to Lv 3 and Lv 4 early. Lv 5 only pays off in long games.',
    levels: [
      { name: 'Miner', desc: 'Earns $50 every wave.', income: 50, hidden: false },
      { name: 'Excavation', desc: 'Earns $100 every wave.', cost: 300, income: 100, hidden: false },
      { name: 'Mining Helmet', desc: 'Earns $250 every wave.', cost: 850, income: 250, hidden: false },
      { name: 'Better Pickaxe', desc: 'Earns $400 every wave.', cost: 1000, income: 400, hidden: false },
      { name: 'Refined Minerals', desc: 'Earns $900 every wave.', cost: 2900, income: 900, hidden: false },
      { name: 'Mining Industry', desc: 'Earns $1,350 every wave.', cost: 4500, income: 1350, hidden: false },
    ],
  },
  // Recon (alternate Shotgunner form): a shotgun of `pellets` pellets; each one hits the first
  // zombie on its line (scatter 1).
  shotgunnerRecon: {
    name: 'Recon',
    altOf: 'shotgunner',
    form: 'Recon',
    shards: 1,
    price: 0,
    cost: 500,
    limit: Infinity,
    lead: 3,
    blurb: 'An alternate Shotgunner with short range. Each shot sprays 5 pellets (7 from Lv 4) that each hit the first zombie in their way, so zombies up close take lots of them. Sees hidden zombies from Lv 2. No placement limit.',
    tip: 'Put it right next to the path. Up close, most of its pellets hit the same zombie.',
    levels: [
      { name: 'Recon', desc: 'A shotgun: 5 pellets of 2 damage each.', damage: 2, pellets: 5, scatter: 1, cone: 0.22, cooldown: 2.5, range: 8, hidden: false },
      { name: 'Faster Reload', desc: '+1 range, and shoots faster (every 2.5s > 2s).', cost: 250, damage: 2, pellets: 5, scatter: 1, cone: 0.22, cooldown: 2, range: 9, hidden: false },
      { name: 'Radio Signal', desc: '+2 damage, and sees hidden zombies.', cost: 600, damage: 4, pellets: 5, scatter: 1, cone: 0.22, cooldown: 2, range: 9, hidden: true },
      { name: 'Heavy Shells', desc: '+4 damage, and bigger pellets that hit more easily.', cost: 1550, damage: 8, pellets: 5, scatter: 1, cone: 0.22, cooldown: 2, range: 9, pelletW: 1.3, hidden: true },
      { name: 'Shotgun Barrage', desc: '+2 damage, 7 pellets, and +2 range.', cost: 3200, damage: 10, pellets: 7, scatter: 1, cone: 0.22, cooldown: 2, range: 11, pelletW: 1.3, hidden: true },
      { name: 'Expert Assassin', desc: '+1 range, +6 damage, and shoots faster (every 2s > 1.5s).', cost: 4500, damage: 16, pellets: 7, scatter: 1, cone: 0.22, cooldown: 1.5, range: 12, pelletW: 1.3, hidden: true },
    ],
  },
  // Blaster (alternate Commando form): fast shots that each add `shatter` Shatter to the zombie
  // (bad effects wear off slower, +1% per stack, up to 100, never fades). From Lv 3 Core Blast:
  // a zombie with `coreBlast.cost`+ Shatter loses that much and blows up for (5 x damage)^1.3
  // splash damage (see addShatter in sim/parts/damage.js).
  commandoBlaster: {
    name: 'Blaster',
    altOf: 'commando',
    form: 'Blaster',
    shards: 1,
    price: 0,
    cost: 1750,
    limit: Infinity,
    lead: false,
    blurb: 'An alternate Commando that shoots fast blasts. Every hit adds 1 Shatter to the zombie (up to 100, never fades): bad effects like burns, slows and stuns last longer on it. Sees hidden zombies from Lv 2. From Lv 3, Core Blast spends 15 Shatter on a zombie to make it explode. No placement limit.',
    tip: 'Pair it with towers that freeze, stun, slow or burn: Shatter makes all of that last longer.',
    levels: [
      { name: 'Blaster', desc: 'Fast blasts at one zombie at a time. Each hit adds 1 Shatter.', damage: 3, cooldown: 0.45, range: 16, shatter: 1, hidden: false },
      { name: 'Ranged Blasting', desc: '+3 range.', cost: 400, damage: 3, cooldown: 0.45, range: 19, shatter: 1, hidden: false },
      { name: 'Enhanced Module', desc: 'Shoots faster (every 0.45s > 0.3s), and sees hidden zombies.', cost: 750, damage: 3, cooldown: 0.3, range: 19, shatter: 1, hidden: true },
      { name: 'Energy Cannon', desc: '+2 damage. Core Blast: a zombie with 15+ Shatter loses 15 and explodes for (5 x damage)^1.3 damage to all zombies around it.', cost: 1600, damage: 5, cooldown: 0.3, range: 19, shatter: 1, coreBlast: { cost: 15, radius: 5 }, hidden: true },
      { name: 'Supercharge', desc: '+1 range, +3 damage, and shoots faster (every 0.3s > 0.2s).', cost: 5500, damage: 8, cooldown: 0.2, range: 20, shatter: 1, coreBlast: { cost: 15, radius: 5 }, hidden: true },
      { name: 'Mega Blaster', desc: '+5 range and +8 damage.', cost: 12050, damage: 16, cooldown: 0.2, range: 25, shatter: 1, coreBlast: { cost: 15, radius: 5 }, hidden: true },
    ],
  },
  // Programmer (alternate Commander form): towers in its aura attack faster (`rateBoost`; boosts
  // from several Programmers don't add up, the best one counts). System Overdrive at Lv 3 is a
  // Call to Arms ('cta'): its `boost` tops the buff up to 50%, and the Programmer attacks too.
  commanderProgrammer: {
    name: 'Programmer',
    altOf: 'commander',
    form: 'Programmer',
    shards: 1,
    price: 0,
    cost: 600,
    limit: 6,
    kind: 'support',
    blurb: "An alternate Commander that makes nearby towers attack faster: 8% at first, up to 25% at max level. More Programmers don't add up. At Lv 3, System Overdrive boosts that to 50% for 10s and lets the Programmer attack too. Can't boost Commanders. Up to 6.",
    tip: 'Put it next to your fastest-shooting towers, and use System Overdrive when a big wave or a boss shows up.',
    levels: [
      { name: 'Programmer', desc: 'Towers in range attack 8% faster.', aura: 12, rateBoost: 0.08, hidden: false },
      { name: 'Initialize', desc: 'Towers in range attack 12% faster.', cost: 400, aura: 12, rateBoost: 0.12, hidden: false },
      { name: 'Enhanced Interface', desc: 'Towers in range attack 15% faster, and +2 range.', cost: 1100, aura: 14, rateBoost: 0.15, hidden: false },
      { name: 'System Overdrive', desc: 'Unlocks System Overdrive: for 10s the boost is 50%, and the Programmer attacks too (10 damage).', cost: 2200, aura: 14, rateBoost: 0.15, hidden: false,
        damage: 10, cooldown: 1.5, range: 14, abilities: [overdrive(0.35, 40)] },
      { name: 'Amplifier', desc: 'Towers in range attack 20% faster, +3 range, and its attacks during System Overdrive add 4 Shatter.', cost: 4200, aura: 17, rateBoost: 0.2, hidden: false,
        damage: 10, cooldown: 1.5, range: 17, shatter: 4, abilities: [overdrive(0.3, 40)] },
      { name: 'Final Protocol', desc: 'Towers in range attack 25% faster, and System Overdrive recharges in 30s.', cost: 8900, aura: 17, rateBoost: 0.25, hidden: false,
        damage: 10, cooldown: 1.5, range: 17, shatter: 4, abilities: [overdrive(0.25, 30)] },
    ],
  },
  // Prophet (alternate Phaser form): a beam that stays on one zombie until it dies (or leaves
  // range). Every `chargeRate` s locked on adds +1 damage, from `damage` up to `maxDamage`; the
  // charge resets on a new target, a stun or an upgrade. `ramp` is only for the panel (time to
  // full charge). arcanaDmg: n  +1 damage for every n Arcana its owner has (at most +10).
  // noRateBuff (tower): firerate boosts don't speed it up (read in updateTower).
  phaserProphet: {
    name: 'Prophet',
    altOf: 'phaser',
    form: 'Prophet',
    shards: 1,
    price: 0,
    cost: 5000,
    limit: 6,
    retarget: 0,
    noRateBuff: true,
    blurb: 'An alternate Phaser that locks a beam onto one zombie and never lets go until it dies. The longer it stays on, the harder it hits. The charge resets on a new target, a stun or an upgrade. Shreds bosses. Never sees hidden zombies, and firerate boosts don\'t work on it. Up to 6.',
    tip: 'Put it where bosses walk past for a long time, and pair it with a tower that clears the small zombies.',
    levels: [
      { name: 'Prophet', desc: 'A beam locked on one zombie. +1 damage every 1s on it, from 1 up to 5.', damage: 1, maxDamage: 5, chargeRate: 1, ramp: 4, cooldown: 0.2, range: 20, hidden: false },
      { name: 'Charged Ray', desc: '+5 max damage (10), and charges faster (+1 every 0.75s).', cost: 2000, damage: 1, maxDamage: 10, chargeRate: 0.75, ramp: 6.75, cooldown: 0.2, range: 20, hidden: false },
      { name: 'Genesis of a Prophecy', desc: '+3 range, charges faster (+1 every 0.5s), and every hit gives you 0.1 Arcana (Prophets stop at 300).', cost: 4850, damage: 1, maxDamage: 10, chargeRate: 0.5, ramp: 4.5, cooldown: 0.2, range: 23, hidden: false,
        arcana: { gain: 0.1, cap: 300 } },
      { name: 'Ray of Ark', desc: '+1 base damage, +10 max damage (20), and ticks faster (every 0.2s > 0.15s).', cost: 9000, damage: 2, maxDamage: 20, chargeRate: 0.5, ramp: 9, cooldown: 0.15, range: 23, hidden: false,
        arcana: { gain: 0.1, cap: 300 } },
      { name: 'Transpire Vision', desc: '+2 range, +2 base damage, +5 max damage (25), and +1 damage for every 50 Arcana you have (up to +10).', cost: 14500, damage: 4, maxDamage: 25, chargeRate: 0.5, ramp: 10.5, cooldown: 0.15, range: 25, hidden: false,
        arcana: { gain: 0.1, cap: 300 }, arcanaDmg: 50 },
      { name: 'Fate of the Prophecy', desc: '+25 max damage (50), charges faster (+1 every 0.3s), and ticks faster (every 0.15s > 0.1s).', cost: 50000, damage: 4, maxDamage: 50, chargeRate: 0.3, ramp: 13.8, cooldown: 0.1, range: 25, hidden: false,
        arcana: { gain: 0.1, cap: 300 }, arcanaDmg: 50 },
    ],
  },
  // Cyborg (alternate Commando form): empties a magazine of `ammo` shots `cooldown` s apart, then
  // reloads for `reload` s. spool { per, max, decay }: every shot in a row fires `per` faster (up
  // to +`max`); it starts over on a reload, or after `decay` s without a shot. howitzer { every,
  // mult, radius }: Magnum Howitzer, a shot that blows up for `mult` x damage (every: 0 = the last
  // shot of each magazine, else every `every`th shot). ceilDmg: its damage is rounded up.
  // rockets.count: rockets per volley. sellRatio on a level: what selling gives back from then on.
  commandoCyborg: {
    name: 'Cyborg',
    altOf: 'commando',
    form: 'Cyborg',
    shards: 1,
    price: 0,
    cost: 700,
    limit: 3,
    lead: false,
    flying: false,
    blurb: 'An alternate Commando that fires heavy bursts at ground zombies: a full magazine, then a reload. From Lv 3 it fires faster the longer it shoots, and its last shot is a Magnum Howitzer that blows up for 10x damage. From Lv 4 it never reloads, and at max level it also fires rockets. Up to 3.',
    tip: 'Keep it shooting: the longer it fires without stopping, the faster it gets.',
    levels: [
      { name: 'Cyborg', desc: 'Bursts of 15 shots (1 damage each, every 0.2s), then a reload.', damage: 1, cooldown: 0.2, ammo: 15, reload: 3, range: 15, hidden: false },
      { name: 'Scanner', desc: 'Sees hidden zombies.', cost: 500, damage: 1, cooldown: 0.2, ammo: 15, reload: 3, range: 15, hidden: true },
      { name: 'Overclock', desc: '+3 range, +1 damage, and 20 shots per burst.', cost: 1450, damage: 2, cooldown: 0.2, ammo: 20, reload: 3, range: 18, hidden: true },
      { name: 'Magnum Howitzer', desc: 'Fires faster the longer it shoots (up to twice as fast). The last shot of every burst is a Magnum Howitzer: 10x damage to all zombies around it. Its damage is rounded up.', cost: 2000, damage: 2, cooldown: 0.2, ammo: 20, reload: 3, range: 18, hidden: true,
        spool: { per: 0.04, max: 1 }, howitzer: { every: 0, mult: 10, radius: 5 }, ceilDmg: true },
      { name: 'Reactor System', desc: '+1 damage and no more reloading. A Magnum Howitzer every 30 shots. The faster firing wears off after 2s without shooting.', cost: 4200, damage: 3, cooldown: 0.2, range: 18, hidden: true,
        spool: { per: 0.04, max: 1, decay: 2 }, howitzer: { every: 30, mult: 10, radius: 5 }, ceilDmg: true },
      { name: 'Cyber Augment: Jetstream', desc: '+4 range, +2 damage, a Magnum Howitzer every 20 shots, and 3 rockets every 8s (175 damage each). Selling it now gives back 80%.', cost: 21950, damage: 5, cooldown: 0.2, range: 22, hidden: true,
        spool: { per: 0.04, max: 1, decay: 2 }, howitzer: { every: 20, mult: 10, radius: 5 }, ceilDmg: true,
        rockets: { every: 8, damage: 175, radius: 3, count: 3 }, sellRatio: 0.8 },
    ],
  },
  // Incinerator (alternate Hallowboomer form): every attack hits one zombie and sets it on fire:
  // incin.burn damage every incin.tick s for incin.time s, +1% for every point of Heat. heat (on
  // the tower): each attack adds `gain` Heat (up to 100); after `wait` s without attacking it
  // cools `decay` a second. Cool Down (ability 'coolDown', a toggle) stops attacking and cools
  // `cool` a second. Both cool incin.cool times faster. At 100 Heat it loses `drain` of its
  // health a second until it dies (only Cool Down saves it); then it blows up within `radius`
  // for ((100 x level)^1.25 x 3) x incin.blast, + (ΘVERLOAD x 4)^1.32 once incin.over is set.
  // incin.aoe: from Lv 3 the attack also splashes that radius (half damage, half burn).
  hallowboomerIncinerator: {
    name: 'Incinerator',
    altOf: 'hallowboomer',
    form: 'Incinerator',
    shards: 1,
    price: 0,
    cost: 1400,
    limit: 10,
    lead: true,
    heat: { gain: 5, wait: 4, decay: 4, cool: 20, drain: 0.1, radius: 10 },
    blurb: 'An alternate Hallowboomer in heavy armor that sets zombies on fire. Every attack adds 5 Heat, and every point of Heat makes its burns 1% stronger. At 100 Heat it overheats and starts to fall apart: use Cool Down in time, or it blows up and takes nearby zombies with it. Up to 10.',
    tip: 'Let the Heat climb for stronger burns, then switch Cool Down on before it hits 100. Or let it blow up on purpose in front of a boss.',
    levels: [
      { name: 'Incinerator', desc: 'Sets one zombie on fire: 2 burn damage every 0.6s for 3s.', damage: 5, cooldown: 3, range: 11, hidden: false,
        incin: { burn: 2, tick: 0.6, time: 3, cool: 1, blast: 1 }, abilities: [COOL_DOWN] },
      { name: 'Intense Flames', desc: '+3 damage, and burns tick faster (every 0.6s > 0.25s).', cost: 1250, damage: 8, cooldown: 3, range: 11, hidden: false,
        incin: { burn: 2, tick: 0.25, time: 3, cool: 1, blast: 1 }, abilities: [COOL_DOWN] },
      { name: 'Long Range Incineration', desc: '+5 range, 5 burn damage (from 2), and attacks faster (every 3s > 2.5s).', cost: 1700, damage: 8, cooldown: 2.5, range: 16, hidden: false,
        incin: { burn: 5, tick: 0.25, time: 3, cool: 1, blast: 1 }, abilities: [COOL_DOWN] },
      { name: 'Incinerator Mk2', desc: '+12 damage. Attacks also splash a blast of 4 (half damage, half burn). Cools 20% faster.', cost: 7500, damage: 20, cooldown: 2.5, range: 16, hidden: false,
        incin: { burn: 5, tick: 0.25, time: 3, cool: 1.2, blast: 1, aoe: 4 }, abilities: [COOL_DOWN] },
      { name: 'Immolation', desc: 'Its overheat blast does 3x damage and also grows with your ΘVERLOAD. Burns last 6s (from 3s) and do 10 damage (from 5). +3 ΘVERLOAD.', cost: 11500, damage: 20, cooldown: 2.5, range: 16, hidden: false, overload: 3,
        incin: { burn: 10, tick: 0.25, time: 6, cool: 1.2, blast: 3, over: true, aoe: 4 }, abilities: [COOL_DOWN] },
      { name: 'Ashmaker', desc: '+40 damage, burns last 12s (from 6s) and tick faster (every 0.25s > 0.2s). +5 ΘVERLOAD.', cost: 33000, damage: 60, cooldown: 2.5, range: 16, hidden: false, overload: 5,
        incin: { burn: 10, tick: 0.2, time: 12, cool: 1.2, blast: 3, over: true, aoe: 4 }, abilities: [COOL_DOWN] },
    ],
  },
  // Smuggler (alternate DJ form): a blunderbuss whose shots splash `radius`. lowHpMult: x damage on
  // zombies below half health. hitSlow: the zombie it hits directly is slowed (no stacking; the
  // stronger slow wins). plunder (see payPlunder in sim/parts/waves.js): at the end of every wave
  // each player gets $base (in multiplayer base / (1.3 x (players - 1)), at least 40% of it),
  // + up to 100% more for the damage it dealt that wave (damage^0.6 x 7.35 %), x `mult`. crew
  // (Hunting Crew): other towers in its aura deal `boost` more damage (`fav` for the towers named
  // in CREW); each player gets +`cash` plunder for every max-level tower of theirs it boosts (up to `max`).
  djSmuggler: {
    name: 'Smuggler',
    altOf: 'dj',
    form: 'Smuggler',
    shards: 1,
    price: 0,
    cost: 700,
    limit: 4,
    lead: false,
    blurb: 'An alternate DJ with a blunderbuss. Its shots splash a little, and from Lv 1 it plunders cash for every player at the end of each wave (more the more damage it dealt). Its direct hits slow zombies from Lv 2. At Lv 4 Hunting Crew makes towers near it hit harder. Up to 4.',
    tip: 'Get one early for the free cash every wave. At Lv 4, put it next to Bandits, Archers, Thieves, Mercenaries, Bombers, Hunters and Berserkers.',
    levels: [
      { name: 'Smuggler', desc: 'A blunderbuss: 1 damage in a small splash.', damage: 1, cooldown: 1.5, range: 15, radius: 3, hidden: false },
      { name: 'Plunder', desc: 'Sees hidden zombies, 1.5x damage to zombies below half health. Plunder: every player gets about $100 each wave (less in multiplayer), up to twice that for the damage it dealt.', cost: 600, damage: 1, cooldown: 1.5, range: 15, radius: 3, hidden: true,
        lowHpMult: 1.5, plunder: { base: 100, mult: 1 } },
      { name: 'Concussion', desc: '+2 damage. Direct hits slow the zombie by 10% for 2s.', cost: 700, damage: 3, cooldown: 1.5, range: 15, radius: 3, hidden: true,
        lowHpMult: 1.5, plunder: { base: 100, mult: 1 }, hitSlow: { slow: 0.1, time: 2, boss: 1 } },
      { name: 'Blunderbomb', desc: 'Shoots faster (every 1.5s > 1.1s), Plunder pays 30% more, and direct hits slow by 20%.', cost: 1700, damage: 3, cooldown: 1.1, range: 15, radius: 3, hidden: true,
        lowHpMult: 1.5, plunder: { base: 100, mult: 1.3 }, hitSlow: { slow: 0.2, time: 2, boss: 1 } },
      { name: 'Hunting Crew', desc: '+9 damage, but the splash does half. Hunting Crew: other towers in range deal 10% more damage (25% for Bandits, Archers, Thieves, Mercenaries, Bombers, Hunters and Berserkers). Plunder: +20% for every max-level tower of yours it boosts (up to +50%).', cost: 4700, damage: 12, splash: 6, cooldown: 1.1, range: 15, radius: 3, hidden: true,
        lowHpMult: 1.5, plunder: { base: 100, mult: 1.3 }, hitSlow: { slow: 0.2, time: 2, boss: 1 }, aura: 15, crew: CREW },
    ],
  },
  mage: {
    name: 'Mage',
    price: 500,
    cost: 450,
    blurb: 'An early tower with weak but long-range magic shots. From Lv 2 every shot gives you Arcana (up to 200), and from Lv 3 more Arcana makes it shoot faster. At Lv 4 every 10th shot calls down lightning bolts, and at max level Artificial Ascent makes zombies take more damage from everything.',
    tip: 'Arcana is yours, not the tower\'s: every Mage you own builds it up and uses it.',
    levels: [
      { name: 'Mage', desc: 'Shoots magic at one zombie at a time from far away.', damage: 2, cooldown: 1.1, range: 10, hidden: false },
      { name: 'Wand Training', desc: '+2 damage and +2 range.', cost: 300, damage: 4, cooldown: 1.1, range: 12, hidden: false },
      { name: 'Arcana Amplifier', desc: '+2 damage and hidden detection. Every shot gives you 0.1 Arcana (up to 200).', cost: 800, damage: 6, cooldown: 1.1, range: 12, hidden: true,
        arcana: ARCANA(0.1) },
      { name: 'Enhanced Arcana', desc: '+1 damage and shoots faster (every 0.9s). Shoots 1% faster for every 10 Arcana you have.', cost: 1500, damage: 7, cooldown: 0.9, range: 12, hidden: true,
        arcana: ARCANA(0.1), arcanaRate: 0.01 },
      { name: 'Stormbringer', desc: '+3 damage. Every 10 shots it calls down 2 lightning bolts: (damage + Arcana / 15) ^ 1.1 each, in a blast of 3 + Arcana / 100.', cost: 3000, damage: 10, cooldown: 0.9, range: 12, hidden: true,
        arcana: ARCANA(0.1), arcanaRate: 0.01, storm: 2 },
      { name: 'Ascendant of Magic', desc: '+4 damage, shoots faster (every 0.8s), 3 lightning bolts, and 0.4 Arcana per shot. Unlocks Artificial Ascent.', cost: 7500, damage: 14, cooldown: 0.8, range: 12, hidden: true,
        arcana: ARCANA(0.4), arcanaRate: 0.01, storm: 3, abilities: [ascent] },
    ],
  },
};
