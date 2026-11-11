// Towers: builders, income and support. Necromancer, Engineer, Hacker, Farm, Medic,
// Commander, DJ, and the Versus-only Anarchist.
// One group of the TOWERS table. config.js joins the groups in order (see TOWERS there).
// Shared units and abilities (MERC, AP_AB, ...) come from shared.js.
import { HACKER_SHARED, SENTRY, SKEL, cloneAbility, raiseAbility } from './shared.js';

export const TOWERS_SUPPORT = {

  // ---------------------------------------------------------------- builders
  // Necromancer. Shoots `bolt`s that pierce up to `pierce` zombies along their line. Every zombie
  // a bolt hits adds a soul; with `souls` souls it stops shooting for `build` seconds and raises a
  // gravestone beside the path in range (up to `graves`). When it has all its gravestones it
  // upgrades the lowest one instead, up to level `graveLvl`. Raise the Dead smashes them all:
  // each summons a unit from `raise[grave level - 1]`. Level `boomLvl` gravestones explode too.
  // stack: { per, max } hits in a row on the same zombie deal +`per` damage each, up to +`max`.
  necromancer: {
    name: 'Necromancer',
    lead: true,
    flying: false,
    price: 0,
    gems: 4000,
    cost: 4200,
    limit: 3,
    blurb: 'Shoots piercing magic bolts. Every zombie it hits fills its soul meter, and when the meter is full it raises a gravestone. Use Raise the Dead to smash them all and summon skeleton warriors. Sees hidden zombies from Lv 3 and flying ones at Lv 5.',
    tip: 'Put it next to the path where it can cover a lot of the route, so it keeps hitting zombies and fills its soul meter faster. It stops shooting while it raises gravestones, so pair it with reliable towers to catch fast zombies.',
    levels: [
      { name: 'Necromancer', desc: 'Piercing bolts fill its soul meter to raise up to 3 gravestones. Raise the Dead turns them into Skeletons.', damage: 16, cooldown: 1, range: 26, bolt: true, pierce: 3, hidden: false,
        souls: 12, build: 2.5, graves: 3, graveLvl: 1, raise: [[SKEL.skeleton]], abilities: [raiseAbility] },
      { name: 'Soul Forge', desc: 'More damage, gravestones rise faster, and they can now summon Sword Skeletons.', cost: 3400, damage: 25, cooldown: 1, range: 26, bolt: true, pierce: 3, hidden: false,
        souls: 10, build: 2, graves: 3, graveLvl: 1, raise: [[SKEL.skeleton, SKEL.sword]], abilities: [raiseAbility] },
      { name: 'Skull Centrifuge', desc: 'More range, faster shots, hidden detection, up to 6 gravestones, tougher and faster Sword Skeletons, and the odd Giant Skeleton.', cost: 12000, damage: 34, cooldown: 0.8, range: 28, bolt: true, pierce: 3, hidden: true,
        souls: 10, build: 2, graves: 6, graveLvl: 1, raise: [[SKEL.skeleton, SKEL.sword2, SKEL.sword2, SKEL.skeleton, SKEL.giant]], abilities: [raiseAbility] },
      { name: 'Graveward', desc: 'More range and damage, and full gravestones get upgraded to Level 2, which summon Skeletons, Skeleton Knights, Hallow Guards and Giant Skeletons.', cost: 40000, damage: 80, cooldown: 0.7, range: 32, bolt: true, pierce: 4, hidden: true,
        souls: 10, build: 1.5, graves: 6, graveLvl: 2,
        raise: [[SKEL.skeleton, SKEL.sword2, SKEL.sword2, SKEL.giant], [SKEL.skeleton, SKEL.knight, SKEL.knight, SKEL.hallow, SKEL.giant]], abilities: [raiseAbility] },
      { name: 'Apostle of Hades', desc: 'Fires much faster with beams that stack damage on one zombie, flying detection, and Level 3 gravestones that summon Hallow Guards, Executioner Skeletons and Skeleton Knights, then explode.', cost: 80000, damage: 42, cooldown: 0.4, range: 36, bolt: true, pierce: 4, hidden: true, flying: true,
        stack: { per: 0.25, max: 2 }, souls: 10, build: 1.2, graves: 6, graveLvl: 3, boomLvl: 3, boom: { damage: 300, radius: 6 },
        raise: [[SKEL.skeleton, SKEL.sword2, SKEL.sword2, SKEL.giant], [SKEL.skeleton, SKEL.knight, SKEL.knight, SKEL.hallow, SKEL.giant], [SKEL.hallow, SKEL.exec, SKEL.knight, SKEL.hallow, SKEL.exec]],
        abilities: [raiseAbility] },
    ],
  },
  // Engineer. Every shot adds scrap; with `scrap` scrap it stops shooting for `build` seconds and
  // builds a `sentry` on open ground between its deadzone (`minRange`) and `buildRange`, up to
  // `sentries` at once. Sentries shoot on their own and slowly break down (SENTRY `decay`).
  // Upgrading the Engineer upgrades the sentries it already has. Shielded sentries can't be stunned.
  engineer: {
    name: 'Rebar Engineer',
    altOf: 'sentryEngineer',
    form: 'Rebar',
    fly: 45, // rebar flies to the zombie
    lead: true,
    price: 0,
    shards: 3,
    cost: 600,
    limit: 6,
    minRange: 3,
    blurb: 'Shoots zombies with a rebar launcher, and every shot collects scrap. When its scrap meter fills, it stops to build a sentry turret nearby that shoots zombies until it breaks down. Lead and flying detection from the start, hidden from Lv 3.',
    tip: 'When placing or selecting it you see three rings: white is its attack range, yellow is where it can build sentries, red is a deadzone where it can\'t shoot or build. Sentries need open ground inside the yellow ring, away from the path.',
    levels: [
      { name: 'Engineer', desc: 'A rebar launcher that collects scrap to build 1 Sentry.', damage: 4, cooldown: 1.4, range: 13, hidden: false,
        scrap: 8, build: 3, buildRange: 9, sentries: 1, sentry: SENTRY.basic },
      { name: 'Precise Calculations', desc: 'More damage, more range and faster shots.', cost: 325, damage: 6, cooldown: 1.2, range: 16, hidden: false,
        scrap: 8, build: 3, buildRange: 10, sentries: 1, sentry: SENTRY.basic },
      { name: 'Makeshift Radar', desc: 'More damage and range, hidden detection, and its sentries become stronger Rifle Sentries that also see hidden zombies.', cost: 900, damage: 10, cooldown: 1.2, range: 18, hidden: true,
        scrap: 10, build: 3, buildRange: 11, sentries: 1, sentry: SENTRY.rifle },
      { name: 'Auto Converter', desc: 'A big damage boost, faster shots and one more sentry.', cost: 2077, damage: 20, cooldown: 1, range: 18, hidden: true,
        scrap: 10, build: 2.5, buildRange: 11, sentries: 2, sentry: SENTRY.rifle },
      { name: 'Heavy Construction', desc: 'More damage and range, and its sentries become tougher Minigun Sentries.', cost: 6250, damage: 33, cooldown: 0.9, range: 21, hidden: true,
        scrap: 12, build: 2.5, buildRange: 12, sentries: 2, sentry: SENTRY.minigun },
      { name: 'Improved Blueprints', desc: 'A big damage boost, faster shots, one more sentry, and sentries get a shield that makes them stun immune.', cost: 12500, damage: 80, cooldown: 0.75, range: 21, hidden: true,
        scrap: 12, build: 2, buildRange: 12, sentries: 3, sentry: SENTRY.minigunShield },
      { name: 'Illegal Gun Parts', desc: 'Its shots explode with splash rockets, one more sentry, and sentries become War Machine Sentries with rockets.', cost: 32500, damage: 90, splash: 45, radius: 3, cooldown: 0.6, range: 22.5, hidden: true,
        scrap: 14, build: 2, buildRange: 13, sentries: 4, sentry: SENTRY.war },
    ],
  },
  // Hacker: shoots synapses at up to `synapses` zombies at once (single-target damage each).
  //         Every zombie it hits is hacked for good: slowed by `slow` (not bosses), pays `fraud`
  //         more cash for damage (Versus: when it dies), and when it dies (to anything) it comes back as a
  //         hologram unit with (max health)^`ev` health that rams zombies (not from bosses).
  //         `units`: holograms it can have out at once. Upgrade paths at Lv 6 (see Pursuit).
  hacker: {
    name: 'Hacker',
    price: 0,
    gems: 10000,
    cost: 900,
    limit: 2,
    branch: 'hackerBottom',
    branchAt: 5,
    path: 'Top',
    blurb: "Hacks zombies with synapses from its gadgets. Hacked zombies are slowed, pay everyone more cash for damage (Wire Fraud), and come back as holograms that ram other zombies (not bosses). Its synapses only deal damage from Lv 4, when it also gets Hologram Tower to clone any tower for a while. At Lv 6 pick a path: Top for fast, hard-hitting synapses, Bottom for a laptop with 4 synapses and long-lasting clones. Sees hidden zombies from Lv 3, never lead ones.",
    tip: "Put it near the start of the path so it hacks zombies early and they spend longer slowed. Clone your strongest tower with Hologram Tower when a tough wave comes.",
    levels: HACKER_SHARED.concat([
      { name: 'Overclocked Uplink', path: 'Top', desc: 'Top path: synapses fire 3x faster and hit harder, with more range and the toughest holograms.', cost: 60001, damage: 25, cooldown: 0.1, range: 18.5, synapses: 3, ev: 0.75, slow: 0.1, fraud: 0.2, units: 1000, hidden: true,
        abilities: [cloneAbility(0.2, 30)] },
    ]),
  },
  // The Hacker's Bottom path (not in the shop: a Hacker becomes this when you pick it).
  hackerBottom: {
    name: 'Hacker',
    branchOf: 'hacker',
    branchAt: 5,
    path: 'Bottom',
    price: 0,
    cost: 900,
    limit: 2,
    blurb: "The Hacker's Bottom path: a laptop with 4 synapses, huge range, a stronger slow, and clones that last 2 minutes (but cost more).",
    tip: 'Clone your most expensive tower: it lasts long enough for a whole wave.',
    levels: HACKER_SHARED.concat([
      { name: 'Mainframe', path: 'Bottom', desc: 'Bottom path: a laptop with 4 synapses, much more range, a stronger slow, and clones last 120s (but cost 75%).', cost: 53200, damage: 22, cooldown: 0.3, range: 21, synapses: 4, ev: 0.675, slow: 0.125, fraud: 0.2, units: 1000, hidden: true,
        abilities: [cloneAbility(0.75, 120)] },
    ]),
  },

  // ---------------------------------------------------------------- income & support
  // kind 'income': never attacks; `income` is paid every wave.
  // kind 'support': boosts towers inside its `aura` (towers of the same type are never boosted).
  //   rangeBoost / rateBoost: Commander (+range, +firerate). Several Commanders don't stack.
  //   musicBoost / discount: DJ (+firerate, cheaper upgrades). Several DJs don't stack.
  //   Commander and DJ boosts do stack with each other.
  //   damage / cooldown / range: the Commander only shoots while Call to Arms is on.
  // abilities: buttons in the tower panel. { key, name, desc, cooldown, cost?, ... }
  //   cta:       +`boost` firerate for `duration` seconds to towers in the aura.
  //   militia:   sends `unit` down the path (so does any ability with `vehicle: true`).
  //   airstrike: pick a spot; `damage` to every zombie within `radius` (hidden ones too).
  //   rave:      every zombie inside the aura stops and dances for `duration` seconds.

  farm: {
    name: 'Farm',
    price: 500,
    cost: 300,
    limit: 8,
    kind: 'income',
    blurb: 'Never attacks. Gives you extra cash every wave on top of kills and wave bonuses. Each upgrade pays for itself in about 5 to 6 waves.',
    levels: [
      { name: 'Farm', desc: 'Earns $50 every wave.', income: 50, hidden: false },
      { name: 'Fertilizer', desc: 'Doubles its cash per wave.', cost: 250, income: 100, hidden: false },
      { name: 'Plantation', desc: 'Doubles it again.', cost: 550, income: 200, hidden: false },
      { name: 'Orchard', desc: 'A big jump in money per wave.', cost: 1200, income: 500, hidden: false },
      { name: 'Fruit of the Future', desc: 'A huge amount of cash every wave.', cost: 4800, income: 1500, hidden: false },
    ],
  },
  farmFruit: {
    name: 'Fruit Farm',
    altOf: 'farm',
    form: 'Fruit',
    shards: 1,
    price: 0,
    cost: 300,
    limit: 10,
    kind: 'income',
    stunImmune: true,
    blurb: 'An alternate Farm that grows a new crop at every level. Never attacks; gives you cash every wave. Its later crops pay much more, and you can place up to 10. Can\'t be stunned.',
    tip: 'Push Farms to Lv 3 and Lv 4 first, and get Lv 4 before Lv 5. Lv 5 Fruit Farms only pay off in long games.',
    levels: [
      { name: 'Fruit Farm', desc: 'Earns $60 every wave.', income: 60, hidden: false },
      { name: 'Wheat Farm', desc: 'Earns $225 every wave.', cost: 800, income: 225, hidden: false },
      { name: 'Tree Farm', desc: 'Earns $500 every wave.', cost: 1250, income: 500, hidden: false },
      { name: 'Apple Farm', desc: 'Earns $900 every wave.', cost: 2500, income: 900, hidden: false },
      { name: 'Space Fruit Farm', desc: 'Earns the most cash: $1,500 every wave.', cost: 4500, income: 1500, hidden: false },
    ],
  },
  // Airdrop Farm (alternate Farm form) with upgrade paths right after placing (see Tactical Sniper).
  // crates: a cargo plane drops this many cash crates on its helipad every wave; together they pay
  //         `income`. The first lands `drop` seconds into the wave, the rest `crateGap` s apart.
  //         Crates still in the air when the wave ends land right away. What a wave pays is fixed
  //         when the wave starts, so upgrades bought during a wave only count from the next one.
  // econ:   Tower Economics: each crate wave also pays `pct` of the money spent on every other
  //         (non-income) tower within `radius`, up to `max`.
  // noHeal: Medics and Health Packs can't heal it.
  farmAirdrop: {
    name: 'Airdrop Farm',
    altOf: 'farm',
    form: 'Airdrop',
    shards: 2,
    price: 0,
    cost: 475,
    limit: 8,
    kind: 'income',
    noHeal: true,
    crateGap: 3,
    branch: 'farmAirdropBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate Farm: a helipad that never attacks. Every wave a cargo plane drops cash crates on it. Two upgrade paths right away. Top path: faster drops, more health, and Tower Economics pays a share of the value of expensive towers nearby. Bottom path: much more cash per crate, and two crates a wave at max level. Upgrades bought during a wave only start paying the next wave. Medics can't heal it.",
    tip: "Put Bottom path Farms where other towers wouldn't help, but put Top path Farms next to your most expensive towers. Crates take a while to drop, so don't rush through waves.",
    levels: [
      { name: 'Airdrop Farm', desc: 'A helipad. Every wave a cargo plane drops a $100 cash crate on it.', income: 100, crates: 1, drop: 20, hp: 100, hidden: false },
      { name: 'Precision Crates', path: 'Top', desc: 'Top path: crates drop 50% faster.', cost: 50, income: 100, crates: 1, drop: 13, hp: 100, hidden: false },
      { name: 'War Bonds', path: 'Top', desc: '+$20 per crate.', cost: 100, income: 120, crates: 1, drop: 13, hp: 100, hidden: false },
      { name: 'Medical Aid', path: 'Top', desc: '+$150 per crate and 25 more health.', cost: 3000, income: 270, crates: 1, drop: 13, hp: 125, hidden: false },
      { name: 'Tower Economics', path: 'Top', desc: "+$175 per crate, plus 1% of the value of nearby towers (up to $5,000).", cost: 9750, income: 445, crates: 1, drop: 13, hp: 125, hidden: false,
        econ: { radius: 14, pct: 0.01, max: 5000 } },
      { name: 'Emergency Airdrop', path: 'Top', desc: '+$1,000 per crate and more health.', cost: 12500, income: 1445, crates: 1, drop: 13, hp: 175, hidden: false,
        econ: { radius: 14, pct: 0.01, max: 5000 } },
    ],
  },
  // The Airdrop Farm's Bottom path (not in the shop: an Airdrop Farm becomes this when you pick it).
  farmAirdropBottom: {
    name: 'Airdrop Farm',
    branchOf: 'farmAirdrop',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 475,
    limit: 8,
    kind: 'income',
    noHeal: true,
    crateGap: 3,
    blurb: "The Airdrop Farm's Bottom path: a lot more cash in every crate, and two crates every wave at max level.",
    tip: "Put it where other towers wouldn't help. Crates take a while to drop, so don't rush through waves.",
    levels: [
      { name: 'Airdrop Farm', desc: 'A helipad. Every wave a cargo plane drops a $100 cash crate on it.', income: 100, crates: 1, drop: 20, hp: 100, hidden: false },
      { name: 'More Loot', path: 'Bottom', desc: 'Bottom path: +$150 per crate.', cost: 775, income: 250, crates: 1, drop: 20, hp: 100, hidden: false },
      { name: 'Even More Loot', path: 'Bottom', desc: '+$250 per crate.', cost: 1250, income: 500, crates: 1, drop: 20, hp: 100, hidden: false },
      { name: 'Valuable Goods', path: 'Bottom', desc: '+$375 per crate.', cost: 1850, income: 875, crates: 1, drop: 20, hp: 100, hidden: false },
      { name: 'GDA Funding', path: 'Bottom', desc: '+$550 per crate.', cost: 3250, income: 1425, crates: 1, drop: 20, hp: 100, hidden: false },
      { name: 'Double Crates', path: 'Bottom', desc: 'Two crates every wave, worth $1,725 together (+$300).', cost: 12750, income: 1725, crates: 2, drop: 20, hp: 100, hidden: false },
    ],
  },
  // Medic (support): never attacks. Shields the `shields` most valuable towers inside its `aura`
  // (any owner's, never other Medics). Shielded towers shoot `shieldRate` faster, and a stun that
  // hits them breaks the shield instead; it comes back after `recharge` seconds. Several Medics
  // never shield the same tower. `heal`: base health restored at the start of every wave.
  // `towerHeal`: health per second it restores to every damaged tower inside its aura (any owner's).
  // Ubercharge (ability): shielded towers deal +`boost` damage and ignore stuns for `duration` s.
  medic: {
    name: 'Medic',
    altOf: 'doctor',
    form: 'Medic',
    shards: 2,
    price: 0,
    cost: 400,
    limit: 4,
    kind: 'support',
    blurb: "Never attacks. Shields your best towers nearby with a medi gun: they shoot faster and the shield blocks stuns. Heals your base at the start of every wave and repairs damaged towers nearby. From Lv 3 it can Ubercharge them for bonus damage.",
    tip: 'Shield your most important towers, like ones with low placement limits. All 4 Medics maxed shield up to 20 towers. Medics stack with Commanders and DJs.',
    levels: [
      { name: 'Medic', desc: 'Shields 1 tower (15% faster firing, blocks stuns), heals the base 2 HP every wave, and repairs damaged towers nearby.', aura: 12, shields: 1, shieldRate: 0.15, recharge: 20, heal: 2, towerHeal: 4, hidden: false },
      { name: 'Prescribed Vitamins', desc: 'More range, shields 3 towers, heals more, and the shield recharges faster.', cost: 1075, aura: 14, shields: 3, shieldRate: 0.15, recharge: 15, heal: 4, towerHeal: 6, hidden: false },
      { name: 'BIG BRAIN', desc: 'A bit more range, and unlocks Ubercharge: shielded towers get a damage boost and can\'t be stunned for a while.', cost: 2400, aura: 15, shields: 3, shieldRate: 0.15, recharge: 15, heal: 4, towerHeal: 7, hidden: false,
        abilities: [{ key: 'uber', name: 'Ubercharge', desc: 'Shielded towers +25% damage and stun immune for 7.5s', cooldown: 45, duration: 7.5, boost: 0.25 }] },
      { name: 'Medical Pack', desc: 'More range, shields 4 towers, heals more, faster recharge, and a stronger, longer Ubercharge.', cost: 5000, aura: 18, shields: 4, shieldRate: 0.15, recharge: 10, heal: 7, towerHeal: 10, hidden: false,
        abilities: [{ key: 'uber', name: 'Ubercharge', desc: 'Shielded towers +40% damage and stun immune for 10s', cooldown: 45, duration: 10, boost: 0.4 }] },
      { name: 'MD-PhD', desc: 'More range, shields 5 towers, faster recharge, and an even stronger Ubercharge.', cost: 12000, aura: 20, shields: 5, shieldRate: 0.15, recharge: 7, heal: 7, towerHeal: 14, hidden: false,
        abilities: [{ key: 'uber', name: 'Ubercharge', desc: 'Shielded towers +60% damage and stun immune for 10s', cooldown: 45, duration: 10, boost: 0.6 }] },
    ],
  },
  // Medigun Medic (alternate Medic form) with upgrade paths right after placing (see Tactical Sniper).
  // beamHeal: health per second its medi beam restores to ONE tower inside its `aura` (the most hurt
  //   one, any owner's; never itself, income towers, Sentries or `noHeal` / `packHealOnly` towers).
  //   Two Medigun Medics heal each other. The beam's target is the tower's `lock`.
  // Abilities (they lock the beam onto the current patient, or the most valuable tower in range):
  //   uberBeam: the Medic and its patient are invulnerable (no damage, stuns or smoke) for
  //             `duration` s, and both are cleared of debuffs and fully healed when it starts.
  //   kritz:    its patient (an attacking tower) deals +`boost` damage for `duration` s.
  medicBeam: {
    name: 'Medigun Medic',
    altOf: 'doctor',
    form: 'Medigun',
    shards: 2,
    price: 0,
    cost: 600,
    limit: 4,
    kind: 'support',
    branch: 'medicBeamBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate Medic that never attacks: its medi beam heals the most hurt tower nearby. It can't heal itself, so place two to heal each other. Two upgrade paths right away. Top path: much more healing, and Uber makes the Medic and one tower invulnerable. Bottom path: a lot more range, and Kritz gives one tower a big damage boost. Can't heal farms, Sentries or the XWM Turret.",
    tip: 'Place at least 2 so they heal each other. Use Uber to save a tower from stuns and big hits, and Kritz on big hitters like the Railgunner.',
    levels: [
      { name: 'Medigun Medic', desc: 'Heals the most hurt tower nearby 50 HP/s.', aura: 12, beamHeal: 50, hp: 350, hidden: false },
      { name: 'Healing Cells', path: 'Top', desc: 'Top path: +20 healing per second, more range and health.', cost: 400, aura: 14, beamHeal: 70, hp: 400, hidden: false },
      { name: 'Bigger Beam', path: 'Top', desc: '+35 healing per second and more health.', cost: 825, aura: 14, beamHeal: 105, hp: 470, hidden: false },
      { name: 'Advanced Medigun', path: 'Top', desc: '+75 healing per second, more range and health.', cost: 3000, aura: 16, beamHeal: 180, hp: 670, hidden: false },
      { name: 'Uber Charge', path: 'Top', desc: 'Unlocks Uber: the Medic and its patient become invulnerable for 12s, cleared of debuffs and fully healed. +150 healing per second.', cost: 8000, aura: 19, beamHeal: 330, hp: 1145, hidden: false,
        abilities: [{ key: 'uberBeam', name: 'Uber', desc: 'The Medic and one tower are invulnerable for 12s, cleared of debuffs and fully healed', cooldown: 60, duration: 12 }] },
      { name: 'Max Uber', path: 'Top', desc: 'Uber lasts longer and recharges faster, and the Medic can\'t be stunned. +400 healing per second.', cost: 29000, aura: 25, beamHeal: 730, hp: 2545, stunImmune: true, hidden: false,
        abilities: [{ key: 'uberBeam', name: 'Uber', desc: 'The Medic and one tower are invulnerable for 16s, cleared of debuffs and fully healed', cooldown: 45, duration: 16 }] },
    ],
  },
  // The Medigun Medic's Bottom path (not in the shop: a Medigun Medic becomes this when you pick it).
  medicBeamBottom: {
    name: 'Medigun Medic',
    branchOf: 'medicBeam',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 600,
    limit: 4,
    kind: 'support',
    blurb: "The Medigun Medic's Bottom path: a lot more range, and Kritz gives one tower a big damage boost.",
    tip: 'Use Kritz on big hitters like the Railgunner, right when a boss walks into range.',
    levels: [
      { name: 'Medigun Medic', desc: 'Heals the most hurt tower nearby 50 HP/s.', aura: 12, beamHeal: 50, hp: 350, hidden: false },
      { name: 'Extended Range', path: 'Bottom', desc: 'Bottom path: more range and health.', cost: 150, aura: 14, beamHeal: 50, hp: 385, hidden: false },
      { name: 'Lasting Cells', path: 'Bottom', desc: 'More range and health.', cost: 450, aura: 17, beamHeal: 50, hp: 435, hidden: false },
      { name: 'Longer Range', path: 'Bottom', desc: 'A lot more range and +25 healing per second.', cost: 2800, aura: 26, beamHeal: 75, hp: 535, hidden: false },
      { name: 'Damage Charge', path: 'Bottom', desc: "Unlocks Kritz: one tower deals double damage for 10s. The Medic can't be stunned. +125 healing per second.", cost: 9250, aura: 28, beamHeal: 200, hp: 835, stunImmune: true, hidden: false,
        abilities: [{ key: 'kritz', name: 'Kritz', desc: 'One tower deals +100% damage for 10s', cooldown: 50, duration: 10, boost: 1 }] },
      { name: 'Kritz', path: 'Bottom', desc: 'Kritz gets stronger: +200% damage for 12s. +200 healing per second.', cost: 28000, aura: 28, beamHeal: 400, hp: 2035, stunImmune: true, hidden: false,
        abilities: [{ key: 'kritz', name: 'Kritz', desc: 'One tower deals +200% damage for 12s', cooldown: 50, duration: 12, boost: 2 }] },
    ],
  },
  commander: {
    name: 'Commander',
    lead: 4,
    price: 1200,
    cost: 700,
    limit: 4,
    kind: 'support',
    blurb: "Makes nearby towers better: more range, then faster shooting, then abilities to boost even harder, call in a Stryker and order airstrikes. Can't boost other Commanders.",
    levels: [
      { name: 'Commander', desc: 'Towers in range get +25% range.', aura: 14, rangeBoost: 0.25, hidden: false },
      { name: 'Drilling', desc: 'Towers in range also shoot 25% faster.', cost: 1000, aura: 14, rangeBoost: 0.25, rateBoost: 0.25, hidden: false },
      { name: 'Call to Arms', desc: 'Ability: nearby towers get an extra +50% firerate for 8 seconds, and the Commander shoots too.', cost: 2400, aura: 14, rangeBoost: 0.25, rateBoost: 0.25, hidden: false,
        damage: 3, cooldown: 1, range: 14,
        abilities: [{ key: 'cta', name: 'Call to Arms', desc: '+50% firerate for 8s', cooldown: 30, duration: 8, boost: 0.5 }] },
      { name: 'Organized Militia', desc: 'Ability: sends a tough Stryker vehicle down the path ($600 each use).', cost: 5000, aura: 14, rangeBoost: 0.25, rateBoost: 0.25, hidden: false,
        damage: 3, cooldown: 1, range: 14,
        abilities: [
          { key: 'cta', name: 'Call to Arms', desc: '+50% firerate for 8s', cooldown: 30, duration: 8, boost: 0.5 },
          { key: 'militia', name: 'Organized Militia', desc: 'Sends a 600 HP Stryker', cost: 600, cooldown: 20,
            unit: { name: 'Stryker', model: 'stryker', hp: 600, speed: 4.5, ram: true, gun: { damage: 2, cooldown: 0.25, range: 20 } } },
        ] },
      { name: 'Airstrike', desc: 'Ability: a jet bombs a spot you pick for 450 splash damage ($1,200 each use).', cost: 12000, aura: 14, rangeBoost: 0.25, rateBoost: 0.25, hidden: false,
        damage: 12, cooldown: 1, range: 14,
        abilities: [
          { key: 'cta', name: 'Call to Arms', desc: '+50% firerate for 8s', cooldown: 30, duration: 8, boost: 0.5 },
          { key: 'militia', name: 'Organized Militia', desc: 'Sends a 600 HP Stryker', cost: 600, cooldown: 20,
            unit: { name: 'Stryker', model: 'stryker', hp: 600, speed: 4.5, ram: true, gun: { damage: 2, cooldown: 0.25, range: 20 } } },
          { key: 'airstrike', name: 'Airstrike', desc: '450 damage where you click', cost: 1200, cooldown: 30, damage: 450, radius: 8, aim: true },
        ] },
    ],
  },
  // Classic Commander (alternate Commander form). fury: seconds it fights after using any ability.
  // caravan: sends `units` down the path (a little apart).
  commanderClassic: {
    name: 'Classic Commander',
    lead: 2,
    altOf: 'commander',
    form: 'Classic',
    shards: 1,
    price: 0,
    cost: 650,
    limit: 6,
    kind: 'support',
    fury: 10,
    blurb: 'An alternate Commander that makes nearby towers shoot faster. It has no normal attack: it only fights for 10 seconds ("fury mode") after you use one of its abilities. From Lv 3 it gets hidden, flying and lead detection and Call to Arms; at max level it sends a Support Caravan. Can\'t boost other Commanders.',
    tip: 'Place it near as many towers as possible; slow shooters like the Rocketeer and Sniper gain the most. Three Lv 3+ Classic Commanders taking turns using Call to Arms about every 10 seconds keep the boost almost always on.',
    levels: [
      { name: 'Classic Commander', desc: 'Towers in range shoot 10% faster.', aura: 10, rateBoost: 0.1, hidden: false },
      { name: 'Leadership', desc: 'The firerate boost goes up to 15%.', cost: 400, aura: 10, rateBoost: 0.15, hidden: false },
      { name: 'Call to Arms', desc: 'Hidden, flying and lead detection, more range, and unlocks Call to Arms: nearby towers get an extra +10% firerate for 10 seconds.', cost: 2450, aura: 13, rateBoost: 0.15, hidden: true,
        damage: 15, cooldown: 0.6, range: 13,
        abilities: [{ key: 'cta', name: 'Call to Arms', desc: '+10% firerate for 10s', cooldown: 30, duration: 10, boost: 0.1 }] },
      { name: 'Intense Training', desc: 'More range and damage. The boost goes up to 17.5% and Call to Arms to +15%.', cost: 4500, aura: 15, rateBoost: 0.175, hidden: true,
        damage: 30, cooldown: 0.6, range: 15,
        abilities: [{ key: 'cta', name: 'Call to Arms', desc: '+15% firerate for 10s', cooldown: 30, duration: 10, boost: 0.15 }] },
      { name: 'Strength in Numbers', desc: 'Both boosts go up to 20%, and unlocks Support Caravan: two Gunner APCs and a Missile APC drive down the path to fight.', cost: 14000, aura: 17, rateBoost: 0.2, hidden: true,
        damage: 50, cooldown: 0.6, range: 17,
        abilities: [
          { key: 'cta', name: 'Call to Arms', desc: '+20% firerate for 10s', cooldown: 30, duration: 10, boost: 0.2 },
          { key: 'caravan', name: 'Support Caravan', desc: 'Sends 2 Gunner APCs and a Missile APC', cooldown: 60,
            units: [
              { name: 'Gunner APC', model: 'apc', hp: 500, speed: 4, ram: true, lead: true, gun: { damage: 5, cooldown: 0.2, range: 17.5 } },
              { name: 'Gunner APC', model: 'apc', hp: 500, speed: 4, ram: true, lead: true, gun: { damage: 5, cooldown: 0.2, range: 17.5 } },
              { name: 'Missile APC', model: 'missileapc', hp: 800, speed: 4, ram: true, lead: true, flying: true,
                gun: { damage: 3, cooldown: 0.3, range: 20 }, cannon: { damage: 120, radius: 5, every: 2.5 } },
            ] },
        ] },
    ],
  },
  dj: {
    name: 'DJ',
    price: 1400,
    cost: 950,
    limit: 2,
    kind: 'support',
    blurb: 'Plays music and never deals damage. Towers in its big range shoot faster, later their upgrades get cheaper, and at max level it can make zombies dance.',
    levels: [
      { name: 'DJ', desc: 'Towers in range shoot 15% faster.', aura: 20, musicBoost: 0.15, hidden: false },
      { name: 'Louder Speakers', desc: 'More range and a bigger firerate boost.', cost: 600, aura: 25, musicBoost: 0.2, hidden: false },
      { name: 'Thrifty', desc: 'Upgrades become cheaper for every tower in its range.', cost: 2000, aura: 25, musicBoost: 0.2, discount: 0.1, hidden: false },
      { name: 'Encore', desc: 'More range, a bigger boost and a bigger discount.', cost: 6400, aura: 27, musicBoost: 0.25, discount: 0.15, hidden: false },
      { name: 'Apocalypse Rave', desc: 'Even more boost and discount, plus an ability that makes zombies in range stop and dance for 8 seconds.', cost: 12600, aura: 29, musicBoost: 0.3, discount: 0.2, hidden: false,
        abilities: [{ key: 'rave', name: 'Apocalypse Rave', desc: 'Zombies in range dance for 8s', cooldown: 40, duration: 8 }] },
    ],
  },
  // DJ Booth (alternate DJ form). It plays one track at a time (switched with the Switch Track
  // ability, tower field `track`, see TRACKS): Purple +`tracks.range` range, Green
  // `tracks.discount` off upgrades, Red (once `tracks.dmg` is set) +`tracks.dmg` damage.
  // offTrack: the tracks that aren't playing still give this fraction of their boost.
  // Drop the Beat (ability `beat`) does something different on each track:
  //   Purple: knocks zombies in range back `knock` (bosses `bossKnock` of that) and slows them by
  //           `slow` for `slowTime` s. Green: pays the owner `cash`. Red: `pulses` pulses `every`
  //           s apart, each `pulseDamage` to zombies in range; hit zombies take +`vuln` damage
  //           from everything for `vulnTime` s.
  djBooth: {
    name: 'DJ Booth',
    altOf: 'dj',
    form: 'Booth',
    shards: 1,
    price: 0,
    cost: 1000,
    limit: 1,
    lead: 3,
    kind: 'support',
    blurb: 'An alternate DJ that plays one track at a time. Purple gives nearby towers more range, Green makes their upgrades cheaper, and Red (from Lv 3) gives them more damage. From Lv 4 it can Drop the Beat, which does something different on each track. You can only have one.',
    tip: 'Use Green on easy waves to save money, Red against tough zombies or crowds, and Purple against fast ones. Great with expensive long-range towers like the Railgunner and Commando.',
    levels: [
      { name: 'DJ Booth', desc: 'Plays Purple (more range) or Green (cheaper upgrades) for towers in range.', aura: 18, hidden: false,
        tracks: { range: 0.15, discount: 0.1 },
        abilities: [{ key: 'track', name: 'Switch Track', desc: 'Play the next track', cooldown: 1 }] },
      { name: 'Laptop Studio', desc: 'More range.', cost: 450, aura: 22, hidden: false,
        tracks: { range: 0.15, discount: 0.1 },
        abilities: [{ key: 'track', name: 'Switch Track', desc: 'Play the next track', cooldown: 1 }] },
      { name: 'Party Mode', desc: 'Stronger tracks, and unlocks the Red track: towers in range deal more damage.', cost: 1500, aura: 22, hidden: false,
        tracks: { range: 0.2, discount: 0.15, dmg: 0.15 },
        abilities: [{ key: 'track', name: 'Switch Track', desc: 'Play the next track', cooldown: 1 }] },
      { name: 'Thrifty Music', desc: 'Gets lead detection and unlocks Drop the Beat: Purple knocks zombies back and slows them, Green makes cash, and Red sends damaging pulses that make zombies take more damage.', cost: 3000, aura: 22, hidden: false,
        tracks: { range: 0.2, discount: 0.15, dmg: 0.15 },
        abilities: [
          { key: 'track', name: 'Switch Track', desc: 'Play the next track', cooldown: 1 },
          { key: 'beat', name: 'Drop the Beat', desc: 'Purple: knockback 6 + 40% slow 4s. Green: +$400. Red: 4 pulses of 25 dmg, +15% damage taken 6s', cooldown: 45,
            knock: 6, bossKnock: 0.3, slow: 0.4, slowTime: 4, cash: 400, pulses: 4, every: 1, pulseDamage: 25, vuln: 0.15, vulnTime: 6 },
        ] },
      { name: 'Audio Visualizer', desc: 'More range, and every track and Drop the Beat gets stronger.', cost: 6500, aura: 25, hidden: false,
        tracks: { range: 0.25, discount: 0.2, dmg: 0.2 },
        abilities: [
          { key: 'track', name: 'Switch Track', desc: 'Play the next track', cooldown: 1 },
          { key: 'beat', name: 'Drop the Beat', desc: 'Purple: knockback 9 + 50% slow 5s. Green: +$800. Red: 5 pulses of 60 dmg, +20% damage taken 6s', cooldown: 45,
            knock: 9, bossKnock: 0.3, slow: 0.5, slowTime: 5, cash: 800, pulses: 5, every: 1, pulseDamage: 60, vuln: 0.2, vulnTime: 6 },
        ] },
      { name: 'Apocalypse Rave', desc: 'All three tracks play at once (the ones you didn\'t pick at half strength), and every track and Drop the Beat is at its strongest.', cost: 15000, aura: 28, hidden: false,
        tracks: { range: 0.3, discount: 0.25, dmg: 0.3 }, offTrack: 0.5,
        abilities: [
          { key: 'track', name: 'Switch Track', desc: 'Pick which track plays at full strength', cooldown: 1 },
          { key: 'beat', name: 'Drop the Beat', desc: 'Purple: knockback 12 + 60% slow 6s. Green: +$1,500. Red: 6 pulses of 150 dmg, +30% damage taken 8s', cooldown: 45,
            knock: 12, bossKnock: 0.3, slow: 0.6, slowTime: 6, cash: 1500, pulses: 6, every: 1, pulseDamage: 150, vuln: 0.3, vulnTime: 8 },
        ] },
    ],
  },
  // EDJ (alternate DJ form) with upgrade paths right after placing (see Tactical Sniper).
  // musicBoost is its firerate boost, musicRange its range boost (they count as DJ boosts: the
  // strongest DJ of any form wins). sellback: towers in range sell for that much more (+0.1 = 10%).
  // cdCut: towers in range get their abilities back that much faster (0.15 = 15% shorter cooldowns).
  // encore (ability): towers in range get +`boost` firerate and +`range` range for `duration` s.
  djEdj: {
    name: 'EDJ',
    altOf: 'dj',
    form: 'EDJ',
    shards: 2,
    price: 0,
    cost: 2000,
    limit: 2,
    kind: 'support',
    branch: 'djEdjBottom',
    branchAt: 1,
    path: 'Top',
    blurb: "An alternate DJ with a small range that never deals damage: towers nearby shoot faster and see farther. Two upgrade paths right away. Top path: bigger boosts and the Encore ability. Bottom path: nearby towers' upgrades get up to 30% cheaper, they sell for more, and at max level their abilities recharge faster. Can't boost the Field Barracks or XWM Turret.",
    tip: 'Pair her with John and a Commander. Use the Bottom path next to expensive towers you still have to upgrade.',
    levels: [
      { name: 'EDJ', desc: 'Towers in range get +5% firerate and +5% range.', aura: 8.5, musicBoost: 0.05, musicRange: 0.05, hp: 400, hidden: false },
      { name: 'Bass Boosted', path: 'Top', desc: 'Top path: more range.', cost: 500, aura: 10.5, musicBoost: 0.05, musicRange: 0.05, hp: 420, hidden: false },
      { name: 'Aggressive Tracks', path: 'Top', desc: '+5% firerate boost.', cost: 1500, aura: 10.5, musicBoost: 0.1, musicRange: 0.05, hp: 470, hidden: false },
      { name: 'Rally Call', path: 'Top', desc: 'Bigger boosts and more range, and unlocks Encore: +40% firerate for 7s.', cost: 4300, aura: 11.5, musicBoost: 0.2, musicRange: 0.1, hp: 620, hidden: false,
        abilities: [{ key: 'encore', name: 'Encore', desc: 'Towers in range get +40% firerate for 7s', cooldown: 45, duration: 7, boost: 0.4 }] },
      { name: 'Encore', path: 'Top', desc: '+10% firerate boost.', cost: 5500, aura: 11.5, musicBoost: 0.3, musicRange: 0.1, hp: 970, hidden: false,
        abilities: [{ key: 'encore', name: 'Encore', desc: 'Towers in range get +40% firerate for 7s', cooldown: 45, duration: 7, boost: 0.4 }] },
      { name: 'Showdown', path: 'Top', desc: '+10% firerate and +10% range boost, and Encore becomes Super Encore: +60% firerate and +20% range for 10s.', cost: 20000, aura: 11.5, musicBoost: 0.4, musicRange: 0.2, hp: 1970, hidden: false,
        abilities: [{ key: 'encore', name: 'Super Encore', desc: 'Towers in range get +60% firerate and +20% range for 10s', cooldown: 45, duration: 10, boost: 0.6, range: 0.2 }] },
    ],
  },
  // The EDJ's Bottom path (not in the shop: an EDJ becomes this when you pick it).
  djEdjBottom: {
    name: 'EDJ',
    branchOf: 'djEdj',
    branchAt: 1,
    path: 'Bottom',
    price: 0,
    cost: 2000,
    limit: 2,
    kind: 'support',
    blurb: "The EDJ's Bottom path: more range boost, then nearby towers' upgrades get up to 30% cheaper and they sell for more. At max level their abilities recharge 15% faster.",
    tip: 'Place her next to expensive towers before you upgrade them.',
    levels: [
      { name: 'EDJ', desc: 'Towers in range get +5% firerate and +5% range.', aura: 8.5, musicBoost: 0.05, musicRange: 0.05, hp: 400, hidden: false },
      { name: 'Sound Effects', path: 'Bottom', desc: 'Bottom path: +5% range boost and more range.', cost: 850, aura: 9.5, musicBoost: 0.05, musicRange: 0.1, hp: 420, hidden: false },
      { name: 'Nice Rhythm', path: 'Bottom', desc: '+5% range boost.', cost: 1100, aura: 9.5, musicBoost: 0.05, musicRange: 0.15, hp: 470, hidden: false },
      { name: 'Budget Costs', path: 'Bottom', desc: 'Towers in range get 10% off upgrades and sell for 10% more.', cost: 3250, aura: 9.5, musicBoost: 0.05, musicRange: 0.15, discount: 0.1, sellback: 0.1, hp: 645, hidden: false },
      { name: 'Cosplay Party', path: 'Bottom', desc: '20% off upgrades, +5% range boost and more range.', cost: 7000, aura: 10.5, musicBoost: 0.05, musicRange: 0.2, discount: 0.2, sellback: 0.1, hp: 1145, hidden: false },
      { name: 'DJ Rave', path: 'Bottom', desc: '30% off upgrades, towers in range sell for 65% more, their ability cooldowns are 15% shorter, and more range.', cost: 16000, aura: 12.5, musicBoost: 0.05, musicRange: 0.2, discount: 0.3, sellback: 0.65, cdCut: 0.15, hp: 2245, hidden: false },
    ],
  },
  // ---------------------------------------------------------------- versus
  // Anarchist: a Versus tower. It shoots normally everywhere (and is cheaper outside Versus), but
  // its tricks only work in Versus: every `android.every` seconds it sends an Android to your
  // target. Abilities with `versus: true` hit the target's towers from afar (auto-aimed at their
  // biggest cluster of towers).
  //   smoke: towers within `radius` keep VERSUS.smokeRange of their range for `duration` s.
  //   pyro:  towers within `radius` are stunned for `duration` s; their units nearby take `unitDamage`.
  //   chip (No Mercy): takes `damage` base health from the target every `every` s, never below `floor`.
  anarchist: {
    name: 'Anarchist',
    price: 1400,
    cost: 650,
    survivalCost: 500,
    limit: 1,
    burstGap: 0.08,
    blurb: 'Versus tower: fires quick bursts and messes with your opponent. Sends Androids to their map, and its upgrades smoke or stun their towers. Short range, no hidden detection. Its tricks only work in Versus.',
    levels: [
      { name: 'Anarchist', desc: 'Fires quick bursts. In Versus, sends an Android to your target every 45 seconds.', damage: 1, burst: 3, cooldown: 1.3, range: 8, hidden: false,
        android: { type: 'android', every: 45 } },
      { name: 'Attrition', desc: 'Androids come more often: one every 30 seconds.', cost: 2, damage: 1, burst: 3, cooldown: 1.3, range: 8, hidden: false,
        android: { type: 'android', every: 30 } },
      { name: 'Smokes', desc: 'Ability: a helicopter drops a smoke bomb on your target\'s towers, halving their range for 12 seconds.', cost: 2, damage: 1, burst: 3, cooldown: 1.3, range: 8, hidden: false,
        android: { type: 'android', every: 30 },
        abilities: [{ key: 'smoke', name: 'Smokes', desc: '-50% range to enemy towers within 5.5 for 12s', cost: 400, cooldown: 30, duration: 12, radius: 5.5, versus: true }] },
      { name: 'Super Bots', desc: 'Sends Super Bots instead: tougher, faster Androids that hit the base harder.', cost: 2, damage: 1, burst: 3, cooldown: 1.3, range: 8, hidden: false,
        android: { type: 'superbot', every: 30 },
        abilities: [{ key: 'smoke', name: 'Smokes', desc: '-50% range to enemy towers within 5.5 for 12s', cost: 400, cooldown: 30, duration: 12, radius: 5.5, versus: true }] },
      { name: 'No Mercy', desc: 'Bursts of 9 with more damage and range. No Mercy keeps chipping 2 base health off your target (down to 2), and Pyrotechnics stuns their towers.', cost: 2500, damage: 3, burst: 9, cooldown: 1.6, range: 16, hidden: false,
        android: { type: 'superbot', every: 30 },
        chip: { damage: 2, every: 12, floor: 2 },
        abilities: [
          { key: 'smoke', name: 'Smokes', desc: '-50% range to enemy towers within 5.5 for 12s', cost: 400, cooldown: 30, duration: 12, radius: 5.5, versus: true },
          { key: 'pyro', name: 'Pyrotechnics', desc: 'Stuns enemy towers within 4.5 for 6s and hurts their units', cost: 900, cooldown: 40, duration: 6, radius: 4.5, unitDamage: 150, versus: true },
        ] },
    ],
  },
};
