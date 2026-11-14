// Wave 11: new towers.
//   Poacher: the starter cliff tower. One arrow at a time, slow and steady, good on bosses.
//   Gunner: an alternate Soldier form. Short bursts, cheap, sees hidden zombies from Lv 3.
//   Future Sniper: an alternate Sniper form. Huge range, slow heavy shots, true damage at Lv 5.
//   Ninja: throws bursts of piercing shurikens, saves some up while idle, and has a giant
//          spinning shuriken (Shirayuki Shuriken) from Lv 2.
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

const bullseye = (boost) => ({ boost, stacks: 3, radius: 15 });

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
};
