// Wave 13: new towers.
//   Technomancer: an alternate Hacker form. Fires bursts of shots, places a Hologram (a pad any
//                 tower can stand on), hijacks the tower on it for boosts, and clones it (Utopia).
//   Frostreaver: an alternate Sledger form. A melee fighter that freezes the zombie it hits and
//                grows Ice Crystals that boost it and pay for its abilities.
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

export const THIRTEENTH_TOWERS = {
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
};
