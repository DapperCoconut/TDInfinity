// Wave 12: new towers.
//   Tempest: an alternate Spiritual Advocate form. Punches with giant gauntlets, and every time it
//            is placed (and upgraded) it makes a Lightning Field that hurts and Shocks zombies.
//   Golden Bandit: the golden perk of the Bandit. Gold Shot makes zombies pay more cash, and
//                  zombies that die with it leave an Afterimage that fights for a while.
//   Phantom: stands ON the path and blocks zombies. Its upgrades stay when you sell it, but it
//            sells for nothing. Heals every wave.
//   Vanguard: an alternate Phantom form. Stands on the path, swings a mace, and Charged Smash
//             gives it a shield. Gets back up when it falls.
//   Strawman: an alternate Scarecrow form. Pick a mode when you place it: The Vengeful (hurts
//             zombies and boosts towers, but makes zombies faster) or The Benevolent (slows
//             zombies, but makes towers weaker).
//
// New mechanics (sim code in sim/parts/weapons6.js):
//   tempest: { first, field, shock, every }  Tempest.
//       first { damage, hits, slow, time }: the very first time a player places a Tempest in a
//       game, it hits every zombie in range `hits` times and Shocks them.
//       field { time, pct, min, max }: Lightning Field around it (its range) for `time` s. Every
//       zombie in it takes `pct` of its current health a second, at least `min`, at most `max`.
//       It is made on every placement, on upgrades from Lv 1 (`upField`), and every `every`
//       attacks in a row (Lv 3). A new field adds its time to the old one instead of stacking.
//       shock { slow, time, decay, fieldDecay }: attacks and the field Shock zombies (a slow).
//       Each new Shock of the same kind on the same zombie is `decay` weaker than the last.
//   gold: { pct, cap, base, cd, double, img, share }  Golden Bandit Gold Shot (see goldShot).
//   path towers (placement 'path'): stand on the path and block zombies (see pathTowerTick).
//       keepLevel: the player's level for this tower stays when it is sold (sellRatio 0).
//       placeCd / deathCd: seconds before it can be placed again after it is sold / dies.
//   phantom: { boom, slow, buff, ghost }  Phantom placement effects; deathBlast on death.
//   van: { smash, cd, mult, shield, max, decay, charges, regen, half }  Vanguard.
//   crow: { haste | slow, cap, buff }  Strawman (see updateStrawman).

// ---------------------------------------------------------------- Tempest

// Shocks: the attack Shock and the field Shock wear off separately (each has its own decay).
const T_FIELD = (time = 6) => ({ time, pct: 0.02, min: 7, max: 30 });
const T_FIRST = (slow = 0.5) => ({ damage: 100, hits: 2, slow, time: 4 });

// ---------------------------------------------------------------- Vanguard

const SUPERCHARGE = { key: 'supercharge', name: 'Supercharge', desc: 'For 5s every swing is a Charged Smash at 5x charge', cooldown: 60, duration: 5 };
const van = (o) => ({ cd: 4, mult: 2, radius: 4, decay: 8, wait: 3, ...o });

// ---------------------------------------------------------------- Strawman

const VENGEFUL = { key: 'crowV', pick: 'v', name: 'The Vengeful', desc: 'Pick Vengeful mode: hurts zombies and boosts towers near it, but makes zombies faster. Can\'t be changed', cooldown: 0.5 };
const BENEVOLENT = { key: 'crowB', pick: 'b', name: 'The Benevolent', desc: 'Pick Benevolent mode: slows zombies, but makes towers near it weaker. Can\'t be changed', cooldown: 0.5 };

export const TWELFTH_TOWERS = {
  // Tempest (alternate Spiritual Advocate form): a melee fighter with giant gauntlet fists and
  // mechanical wings. Lightning Fields come from placing it, upgrading it and (Lv 3) punching.
  spiritTempest: {
    name: 'Tempest',
    altOf: 'spiritAdvocate',
    form: 'Tempest',
    shards: 1,
    price: 0,
    cost: 2000,
    limit: 2,
    melee: true,
    flying: false,
    lead: true,
    kindLabel: 'Melee',
    blurb: 'An alternate Spiritual Advocate with giant gauntlet fists and mechanical wings. The first Tempest you place in a game hits every zombie near it twice for 100 and Shocks them. Every time you place it, it makes a Lightning Field that hurts zombies by a share of their health. From Lv 2 its punches and field Shock (slow) zombies.',
    tip: 'It is a support: the field and Shocks slow zombies down, but don\'t count on it to kill bosses.',
    levels: [
      { name: 'Tempest', desc: 'Punches every 2s for 10. When placed: a Lightning Field for 6s that does 2% of each zombie\'s health a second (7 to 30). The first one you place also hits for 100 twice and Shocks (50% slow, 4s).', damage: 10, cooldown: 2, range: 5, hidden: false,
        tempest: { first: T_FIRST(), field: T_FIELD() } },
      { name: 'Thunder Break', desc: '+2 damage. Every upgrade makes a Lightning Field (a new field adds time instead of stacking).', cost: 800, damage: 12, cooldown: 2, range: 5, hidden: false,
        tempest: { first: T_FIRST(), field: T_FIELD(), upField: true } },
      { name: 'Static Gauntlets', desc: '+10 damage. Punches hit every zombie within 2 of the target. Punches and the field Shock (50% slow, 2s; each new Shock is 50% weaker).', cost: 2000, damage: 22, cooldown: 2, range: 5, splash: 2, hidden: false,
        tempest: { first: T_FIRST(), field: T_FIELD(), upField: true, shock: { slow: 0.5, time: 2, decay: 0.5, fieldDecay: 0.5 } } },
      { name: 'Lightning Charge', desc: '+18 damage. Every 6 punches in a row make a Lightning Field. Can\'t be stunned, and takes 1/3 damage.', cost: 8000, damage: 40, cooldown: 2, range: 5, splash: 2, hidden: false, stunImmune: true, takeMult: 1 / 3,
        tempest: { first: T_FIRST(), field: T_FIELD(), upField: true, every: 6, shock: { slow: 0.5, time: 2, decay: 0.5, fieldDecay: 0.5 } } },
      { name: 'Eye of The Storm', desc: 'Punches hit within 4. Every Shock starts at 90% slow, and field Shocks only get 15% weaker each time.', cost: 10650, damage: 40, cooldown: 2, range: 5, splash: 4, hidden: false, stunImmune: true, takeMult: 1 / 3,
        tempest: { first: T_FIRST(0.9), field: T_FIELD(), upField: true, every: 6, shock: { slow: 0.9, time: 2, decay: 0.5, fieldDecay: 0.15 } } },
      { name: 'Flasharc', desc: 'Lightning Fields last 9s. This upgrade is free.', cost: 0, damage: 40, cooldown: 2, range: 5, splash: 4, hidden: false, stunImmune: true, takeMult: 1 / 3,
        tempest: { first: T_FIRST(0.9), field: T_FIELD(9), upField: true, every: 6, shock: { slow: 0.9, time: 2, decay: 0.5, fieldDecay: 0.15 } } },
    ],
  },

  // Golden Bandit (golden perk of the Bandit). gold { pct, cap, base, cd, double, img, share }:
  // its hits put Gold Shot on a zombie: cash from hitting it is `pct` more, up to `cap` extra
  // dollars per zombie. double: its own hits on Gold Shot zombies pay 2x cash. When a zombie with
  // Gold Shot dies, an Afterimage (a see-through copy of this tower) appears for 12s, at most one
  // every `cd` s; when it fades it pays its owner `base` + the damage it dealt. img: Afterimages
  // put Gold Shot on too. share: when one fades, towers in range get that share of its cash off
  // their next upgrade.
  goldBandit: {
    name: 'Golden Bandit',
    goldOf: 'bandit',
    damageType: 'golden',
    price: 5000,
    cost: 777,
    limit: 4,
    blurb: 'The golden Bandit. Its golden bullets put Gold Shot on zombies, so hitting them pays more cash. When a zombie with Gold Shot dies, a golden Afterimage of the Bandit appears and fights for 12s, then pays you cash. At max level fading Afterimages make the next upgrade of towers near it cheaper.',
    tip: 'Put it where lots of zombies die, so it makes lots of Afterimages.',
    levels: [
      { name: 'Golden Bandit', desc: 'Golden shots every 1.6s for 4. Gold Shot: +40% hit cash from that zombie (up to $30 more). Zombies that die with Gold Shot leave an Afterimage (one every 7s) that pays $20 + its damage when it fades.', damage: 4, cooldown: 1.6, range: 13, hidden: false,
        gold: { pct: 0.4, cap: 30, base: 20, cd: 7 } },
      { name: 'Glided', desc: '+2 damage. Its hits on Gold Shot zombies pay 2x cash.', cost: 447, damage: 6, cooldown: 1.6, range: 13, hidden: false,
        gold: { pct: 0.4, cap: 30, base: 20, cd: 7, double: true } },
      { name: 'Moneyworks', desc: 'Shoots faster (every 1.6s > 1.2s), an Afterimage every 4s, and Gold Shot pays up to $75 more.', cost: 947, damage: 6, cooldown: 1.2, range: 13, hidden: false,
        gold: { pct: 0.4, cap: 75, base: 20, cd: 4, double: true } },
      { name: 'Midas Shot', desc: '+7 damage, +60% hit cash (up to $125 more), and Afterimages pay $45 + their damage.', cost: 2347, damage: 13, cooldown: 1.2, range: 13, hidden: false,
        gold: { pct: 0.6, cap: 125, base: 45, cd: 4, double: true } },
      { name: 'Auric Bullion', desc: '+10 damage, +3 range, +75% hit cash, and hidden detection. Afterimages put Gold Shot on zombies too.', cost: 4147, damage: 23, cooldown: 1.2, range: 16, hidden: true,
        gold: { pct: 0.75, cap: 125, base: 45, cd: 4, double: true, img: true } },
      { name: 'Share Relic', desc: '+25 damage, Gold Shot pays up to $177 more. When an Afterimage fades, towers in range get half its cash off their next upgrade. Only one Golden Bandit can have this.', cost: 14567, damage: 48, cooldown: 1.2, range: 16, hidden: true, maxOne: true,
        gold: { pct: 0.75, cap: 177, base: 45, cd: 4, double: true, img: true, share: 0.5 } },
    ],
  },

  // Phantom: stands on the path and blocks zombies (they stop and hit it). Heals to full every
  // wave, on every upgrade and when placed again. Its level stays when you sell it (sells for
  // $0). Placing it again waits 10s, or 100s if it died.
  // phantom { boom, slow, buff, buffT, ghost }: when placed, `boom` damage to every zombie in its
  // range (Lv 4; Lv 5 also slows `slow` for 1.5s), `buff` x damage for `buffT` s (Lv 3), and
  // zombies walk through it for `ghost` s (Lv 4). deathBlast: damage around it when it dies.
  phantom: {
    name: 'Phantom',
    price: 2500,
    cost: 525,
    limit: 1,
    placement: 'path',
    keepLevel: true,
    sellRatio: 0,
    noRefund: true,
    exactHp: true,
    placeCd: 10,
    deathCd: 100,
    melee: true,
    flying: false,
    lead: false,
    kindLabel: 'Path',
    blurb: 'A ghostly fighter that can only stand ON the path. Zombies stop at it and hit it until it falls. It heals to full every wave and every upgrade. Its upgrades stay when you sell it, so you can move it, but it sells for nothing. You can place only one, and placing it again takes 10s (100s if it died).',
    tip: 'Move it to where it is needed: its upgrades go with it. From Lv 4 placing it blows up the zombies around it.',
    levels: [
      { name: 'Phantom', desc: 'Stands on the path with 20 health and slashes for 3 every 0.6s.', damage: 3, cooldown: 0.6, range: 6, hp: 20, hidden: false,
        phantom: {} },
      { name: 'Spectral Form', desc: '+10 health, +2 damage, and hidden detection.', cost: 600, damage: 5, cooldown: 0.6, range: 6, hp: 30, hidden: true,
        phantom: {} },
      { name: 'Razorblade Saw', desc: '+40 health and slashes faster (every 0.6s > 0.4s). When it dies it blows up for 25 damage.', cost: 1200, damage: 5, cooldown: 0.4, range: 6, hp: 70, hidden: true,
        phantom: {}, deathBlast: { damage: 25, radius: 6 } },
      { name: 'Delusion', desc: '+135 health, +5 damage, death blast 50. Double damage for 10s after it is placed.', cost: 4200, damage: 10, cooldown: 0.4, range: 6, hp: 205, hidden: true,
        phantom: { buff: 2, buffT: 10 }, deathBlast: { damage: 50, radius: 6 } },
      { name: 'Shadow Phantasma', desc: '+20 damage, death blast 100. When placed: 300 damage to every zombie in range, and zombies walk through it for 6s.', cost: 11000, damage: 30, cooldown: 0.4, range: 6, hp: 205, hidden: true,
        phantom: { buff: 2, buffT: 10, boom: 300, ghost: 6 }, deathBlast: { damage: 100, radius: 6 } },
      { name: 'Void Opus', desc: 'Death blast 150. The placing blast also slows zombies 40% for 1.5s, and triple damage for 10s after it is placed.', cost: 14750, damage: 30, cooldown: 0.4, range: 6, hp: 205, hidden: true,
        phantom: { buff: 3, buffT: 10, boom: 300, slow: 0.4, ghost: 6 }, deathBlast: { damage: 150, radius: 6 } },
    ],
  },

  // Vanguard (alternate Phantom form): stands on the path like the Phantom, but heals itself and
  // has shields. When it falls it gets back up: it heals (faster from Lv 2, while it can still
  // swing) and stands up again at full health (half health from Lv 3, and any healing past full
  // turns into shield). van { cd, mult, radius, shield, max, decay, wait, charges, regen, half }:
  // Charged Smash every `cd` s: the next swing does `mult` x damage to every zombie within
  // `radius` of the target and adds `shield` (up to `max`). The shield fades by `decay` a second
  // once it hasn't smashed for `wait` s. charges: smashes it saves up while nothing is near
  // (all go out at once, stacking). regen: shield it makes a second while below 390.
  phantomVanguard: {
    name: 'Vanguard',
    altOf: 'phantom',
    form: 'Vanguard',
    shards: 1,
    price: 0,
    cost: 800,
    limit: 1,
    placement: 'path',
    keepLevel: true,
    sellRatio: 0,
    noRefund: true,
    exactHp: true,
    placeCd: 10,
    deathCd: 100,
    melee: true,
    flying: false,
    lead: true,
    kindLabel: 'Path',
    blurb: 'An alternate Phantom with a heavy mace. It stands on the path and blocks zombies, and when it falls it heals and gets back up. From Lv 1 its Charged Smash hits every zombie around its target, and from Lv 2 smashes give it a shield. Its upgrades stay when you sell it, but it sells for nothing.',
    tip: 'Keep it where zombies bunch up: every Charged Smash hits a crowd and fills its shield.',
    levels: [
      { name: 'Vanguard', desc: 'Stands on the path with 40 health and swings for 7 every 0.75s. When it falls it heals and gets back up.', damage: 7, cooldown: 0.75, range: 6, hp: 40, hidden: false,
        van: van({ smash: false }) },
      { name: 'Charged Smash', desc: '+13 health, +3 damage. Charged Smash: every 4s a swing does 2x damage to every zombie around its target.', cost: 950, damage: 10, cooldown: 0.75, range: 6, hp: 53, hidden: false,
        van: van({ smash: true }) },
      { name: 'Last Stand', desc: '+5 damage. Smashes give 30 shield (up to 120) that fades. When it falls it keeps swinging and heals faster.', cost: 2100, damage: 15, cooldown: 0.75, range: 6, hp: 53, hidden: false,
        van: van({ smash: true, shield: 30, max: 120, stand: true }) },
      { name: 'Resuscitation', desc: '+10 damage. Smashes every 3s and give 60 shield (up to 180). It gets back up at half health, and healing past full turns into shield (2 per 1%).', cost: 3800, damage: 25, cooldown: 0.75, range: 6, hp: 53, hidden: false,
        van: van({ smash: true, cd: 3, shield: 60, max: 180, stand: true, half: true }) },
      { name: 'Retaliation', desc: '+5 damage. Smashes do 3x damage and give 100 shield (up to 250).', cost: 5600, damage: 30, cooldown: 0.75, range: 6, hp: 53, hidden: false,
        van: van({ smash: true, cd: 3, mult: 3, shield: 100, max: 250, stand: true, half: true }) },
      { name: 'Retribution', desc: 'No shield cap. Saves up to 5 smashes while nothing is near, and they all land at once. Makes shield on its own while below 390. Supercharge ability.', cost: 11525, damage: 30, cooldown: 0.75, range: 6, hp: 53, hidden: false,
        van: van({ smash: true, cd: 3, mult: 3, shield: 100, max: Infinity, stand: true, half: true, charges: 5, regen: 20 }), abilities: [SUPERCHARGE] },
    ],
  },

  // Strawman (alternate Scarecrow form). It does nothing until you pick a mode (its two
  // abilities); you can have one of each. Top path = The Vengeful, Bottom path = The Benevolent
  // (picking Benevolent turns it into that path's type right away).
  // crow { haste, slow, cap, buff }: zombies in range move `haste` faster / `slow` slower.
  // cap: Vengeful hits every zombie in range for sqrt(its max health), at most `cap`.
  // buff: towers in range get that much more (or less, if negative) damage, firerate and range.
  scarecrowStrawman: {
    name: 'Strawman',
    altOf: 'scarecrow',
    form: 'Strawman',
    shards: 1,
    price: 0,
    cost: 1477,
    limit: 2,
    flying: true,
    lead: true,
    kindLabel: 'Support',
    branch: 'scarecrowStrawmanB',
    branchAt: 1,
    modePick: true,
    blurb: 'An alternate Scarecrow. Pick a mode when you place it. The Vengeful hurts every zombie near it (more against zombies with more health) and boosts towers near it, but makes zombies faster. The Benevolent slows zombies, but makes towers near it weaker. You can have one of each.',
    tip: 'Keep the Benevolent away from your towers, or put it where it cancels out nothing the Vengeful gives.',
    levels: [
      { name: 'Strawman', desc: 'Pick a mode first. Vengeful: every 0.75s hits every zombie in range for the square root of its max health (at most 10), but zombies in range are 15% faster.', range: 14, cooldown: 0.75, damage: 10, hidden: true,
        crow: { haste: 0.15, cap: 10 }, abilities: [VENGEFUL, BENEVOLENT] },
      { name: 'Disturbance Of Being', desc: 'Hits faster (every 0.75s > 0.5s), but zombies are 18% faster.', cost: 700, range: 14, cooldown: 0.5, damage: 10, hidden: true,
        crow: { haste: 0.18, cap: 10 } },
      { name: 'Restless Grounds', desc: 'Zombies are 22% faster.', cost: 1000, range: 14, cooldown: 0.5, damage: 10, hidden: true,
        crow: { haste: 0.22, cap: 10 } },
      { name: 'Cursed Power', desc: 'Towers in range get +7% damage, firerate and range. Hits up to 20, but zombies are 28% faster.', cost: 2700, range: 14, cooldown: 0.5, damage: 20, hidden: true,
        crow: { haste: 0.28, cap: 20, buff: 0.07 } },
      { name: 'Ashes To Ashes', desc: 'Towers get +11%. Hits up to 40, but zombies are 40% faster.', cost: 7000, range: 14, cooldown: 0.5, damage: 40, hidden: true,
        crow: { haste: 0.4, cap: 40, buff: 0.11 } },
      { name: 'S C A R E C R O W', desc: 'Hits up to 250, every 0.3s, but zombies are 70% faster.', cost: 11000, range: 14, cooldown: 0.3, damage: 250, hidden: true,
        crow: { haste: 0.7, cap: 250, buff: 0.11 } },
    ],
  },
  scarecrowStrawmanB: {
    name: 'Strawman',
    branchOf: 'scarecrowStrawman',
    branchAt: 1,
    modePick: true,
    form: 'Strawman',
    cost: 1477,
    limit: 2,
    flying: true,
    lead: true,
    kindLabel: 'Support',
    blurb: 'The Benevolent: slows zombies in its range, but makes towers in its range weaker. It deals no damage.',
    tip: 'Keep it away from your towers.',
    levels: [
      { name: 'The Benevolent', desc: 'Zombies in range are 15% slower. No damage.', range: 14, cooldown: 0.75, damage: 0, hidden: true,
        crow: { slow: 0.15 } },
      { name: 'Stillness Of Being', desc: 'Zombies are 18% slower.', cost: 700, range: 14, cooldown: 0.75, damage: 0, hidden: true,
        crow: { slow: 0.18 } },
      { name: 'Silent Grounds', desc: 'Zombies are 22% slower.', cost: 1000, range: 14, cooldown: 0.75, damage: 0, hidden: true,
        crow: { slow: 0.22 } },
      { name: 'Power Curse', desc: 'Zombies are 28% slower, but towers in range get -7% damage, firerate and range.', cost: 2700, range: 14, cooldown: 0.75, damage: 0, hidden: true,
        crow: { slow: 0.28, buff: -0.07 } },
      { name: 'Dust To Dust', desc: 'Zombies are 40% slower, but towers get -11%.', cost: 7000, range: 14, cooldown: 0.75, damage: 0, hidden: true,
        crow: { slow: 0.4, buff: -0.11 } },
    ],
  },
};
