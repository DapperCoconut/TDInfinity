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
//   Farmer: an alternate Farm form. Pays out paychecks during the wave; Rice From The Void at Lv 4.
//   Bandit: an alternate Scout form. Shoots, and from Lv 2 slashes zombies close in front of it.
//   Shrapnel Grenadier: an alternate Grenadier form. Cheap grenades, a grenade launcher from Lv 3,
//               and at Lv 5 every blast also hurts by a share of each zombie's max health.
//   Warrior: an alternate Enforcer form. Swings a sword; hidden detection at Lv 3, Double Strike at Lv 4.
//   Eradicator: fast little energy orbs, and from Lv 3 the Raybreak: a big piercing beam. Its last
//               three levels add ΘVERLOAD, which costs its owner money for the rest of the game.
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
    altOf: 'farm',
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
};
