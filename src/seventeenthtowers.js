// Wave 17: six alternate forms that cast spells.
//   Stardaughter (AA Turret form): a winged archer of the light god Umaani. Long reach with a blind
//       spot, critical hits, huge damage to flyers, and every Stardaughter makes all of them stronger.
//   Magei (Mage form): Chain Lightning that jumps through a crowd, then ice spikes, an arcane blast,
//       a firestorm and Time Warp (every tower attacks twice as fast for a while).
//   Sunwalker (Hallowboomer form): fireballs that burn, then a sunbeam, Solarion, Combustion and a meteor.
//   Aquamancer (Operator form): Raging Wave hits every zombie on the ground, wherever it is. Then
//       Ebb and Flow, Anchor, the Queen's Galleon and Tempest.
//   Augur Solis (Turret form): a giant eye that heals barracks troops with its beam and burns the
//       zombies next to them. It needs barracks to do anything. Only one per player.
//   John Roblox (John form): a shooter that boosts the towers near him. Only one per player.
//
// Damage (hits, burns, blasts) is the spec's divided by 12, like wave 16 (user, 2026-11-15).
// Health, heals, prices, ranges and timings are as written. "Max health" damage (Augur Solis) is a
// share of the zombie's health, so it is not divided.
// "Haste" is how fast it attacks: +25% haste = the cooldown is base / 1.25 (they add up per tier).
// "Lethality" is extra damage in % (+100 lethality = double damage). A level's `leth` is lethality it
// always has; Supercharge adds more (sixteenthtowers.js).
// "Magical" damage (damageType: 'magic') is never cut by bullet resistance.
//
// New mechanics (sim code in sim/parts/seventeenth.js):
//   hit17 on a level: its own basic attack (fire17): 'star' (crit, air, unity), 'fireball', 'john'.
//   crit: { chance, mult }: that chance a hit does `mult` x damage.
//   air: flyers take this many times the damage.
//   unity: each Stardaughter on the map adds this share of each hit as true damage (up to unityCap).
//   refund (Magei Chain Lightning): each chain jump it misses (up to `max`) takes `pct` off the cooldown.
//   spells on a level: attacks on their own timers (every `every` s, faster with haste). See cast17.
//   x17 abilities: Time Warp, Purge By Fire, Inspire. All of them use themselves during waves (`auto`).
//   go (John GO, GO, GO!): towers in his range get `range` more range and `leth` more lethality.
//   sin (John Strength in Numbers): his damage +that much for each other tower in his range.
//   augur on a level (Augur Solis): its beam. See updateAugur.
//
//   fireproof (Sunwalker): its burns work on fire-immune zombies, at this share.
//
// Not used by the game yet (kept for later): `dreamshards` (Augur Solis unlock price; the shop
// uses shards).

const r = (n) => Math.round(n * 100) / 100;

// ------------------------------------------------------------------ Stardaughter

const SD_CD = 1; // seconds between arrows at 100% haste (guess)
const star = (lv, damage, range, crit, air, unity) => ({
  damage, cooldown: r(SD_CD / (1 + 0.25 * lv)), range, hidden: lv >= 2, hit17: 'star',
  ...(crit ? { crit: { chance: crit, mult: 2 } } : {}), ...(air ? { air } : {}), ...(unity ? { unity, unityCap: 0.75 } : {}),
});

// ------------------------------------------------------------------ Magei

const MG_CD = 3; // Chain Lightning cooldown (guess)
const spikes = (shatter) => ({ key: 'spikes', every: 6, count: 3, damage: 62.5, slow: 0.5, time: 5, ...(shatter ? { shatter: { add: 0.5, time: 8, max: 10 } } : {}) });
const EXPLOSION = { key: 'arcane', every: 8, damage: 250, splash: 0.25, radius: 5 };
const FIRESTORM = { key: 'firestorm', every: 15, dps: 8.3, burn: 83.3, time: 10, radius: 6 };
const TIME_WARP = { key: 'timeWarp', x17: true, auto: true, name: 'Time Warp', desc: 'Every tower attacks twice as fast (+100% haste) for 10s', cooldown: 60, duration: 10, haste: 1 };

// ------------------------------------------------------------------ Sunwalker

const SUNBEAM = { key: 'sunbeam', every: 15, dps: 41.7, time: 5 };
const SOLARION = { key: 'solarion', every: 20, dps: 41.7, time: 5, cone: 0.6, burn: 83.3, burnTime: 5 };
const COMBUST = { key: 'combust', every: 12, mult: 10 };
const METEOR = { key: 'meteor', every: 30, damage: 1250, radius: 10 };
const fireball = (lv, range, spells, leth) => ({
  damage: r(8.33 * (lv + 1)), cooldown: 3, range, radius: 2, burn: r(12.5 * (lv + 1)), burnTime: 2, hidden: lv >= 2, hit17: 'fireball',
  ...(lv >= 1 ? { fireproof: 0.25 } : {}), ...(spells ? { spells } : {}), ...(leth ? { leth } : {}),
});

// ------------------------------------------------------------------ Aquamancer

const AQ_CD = 2; // her basic attack (guess)
const WAVE = { key: 'wave', every: 10 };
const EBB = { key: 'ebb', every: 20, min: 0.5, max: 4.5, tmin: 1, tmax: 10 };
const ANCHOR = { key: 'anchor', every: 8, slow: 0.75, time: 3, radius: 4 };
const GALLEON = { key: 'galleon', every: 30, shots: 10, damage: 833.3 };
const TEMPEST = { key: 'tempest', every: 30, targets: 10, damage: 1000, stun: 5 };

// ------------------------------------------------------------------ Augur Solis

const flame = (heal, pct, hpDmg, burn) => ({ key: 'sacred', every: 20, time: 10, radius: 6, heal, pct, hpDmg, ...(burn ? { burn, burnTime: 5 } : {}) });
const beam = (damage, heal, pct, burn) => ({ damage, every: 1, radius: 4, heal, pct, ...(burn ? { burn, burnTime: 5 } : {}) });
const PURGE = { key: 'purge', x17: true, auto: true, name: 'Purge By Fire', desc: 'For 20s, all your troops heal 200 + 1% of their max health a second, and zombies in range burn for 83 over 4s', cooldown: 60, duration: 20, heal: 200, pct: 0.01, burn: 20.8, burnTime: 4 };

// ------------------------------------------------------------------ John Roblox

const INSPIRE = { key: 'inspire', x17: true, auto: true, name: 'Inspire', desc: 'Every tower gets +50% damage and attacks 50% faster for 20s', cooldown: 60, duration: 20, leth: 0.5, haste: 0.5 };
const john = (damage, range, go, sin, abilities) => ({ damage, cooldown: 0.6, range, hidden: false, hit17: 'john', ...(go ? { go, sin } : {}), ...(abilities ? { abilities } : {}) });

export const SEVENTEENTH_TOWERS = {
  stardaughter: {
    name: 'Stardaughter',
    altOf: 'aaTurret',
    form: 'Star',
    shards: 2,
    price: 0,
    cost: 5000,
    limit: 5,
    minRange: 10,
    damageType: 'magic',
    lead: true,
    supercharge: { cost: 187500, lethality: 0.25 },
    blurb: 'An alternate AA Turret: a winged archer made of holy light by the god Umaani. Fast arrows from very far away, but it can\'t hit zombies within 10 of it. Upgrades add critical hits, huge damage to flyers, and Umaani\'s Unity: every Stardaughter you place makes all of them hit harder.',
    tip: 'Place several: with Unity each one adds true damage to all of them (up to +75%).',
    levels: [
      { name: 'Stardaughter', desc: 'Shoots glowing arrows for 41.7 damage from far away. Can\'t hit zombies within 10.', ...star(0, 41.7, 40) },
      { name: 'Celestial Guardian', desc: '+58.3 damage, 25% faster, +10 range. Critical Strike: 10% chance of double damage. Stardragon-bane Arrows: triple damage to flyers. Umaani\'s Unity: +8% true damage for each Stardaughter.', cost: 12500,
        ...star(1, 100, 50, 0.1, 3, 0.08) },
      { name: 'Intangible Transcension', desc: '+75 damage, 25% faster, +10 range, hidden detection. Critical chance 20%. Ascended Aim: 4x damage to flyers. Unity: +9% each.', cost: 25000,
        ...star(2, 175, 60, 0.2, 4, 0.09) },
      { name: 'Masterful Lethality', desc: '+116.7 damage, 25% faster, +10 range. Critical chance 35%. Wingslicing Aim: 5x damage to flyers. Unity: +10% each.', cost: 75000,
        ...star(3, 291.7, 70, 0.35, 5, 0.1) },
      { name: 'Favored of Umaani', desc: '+125 damage, 25% faster, +10 range. Critical chance 50%. Tears of the Illidin: 6x damage to flyers. Unity: +11% each.', cost: 150000,
        ...star(4, 416.7, 80, 0.5, 6, 0.11) },
    ],
  },
  magei: {
    name: 'Magei',
    altOf: 'mage',
    form: 'Magei',
    shards: 2,
    price: 0,
    cost: 1000,
    limit: 5,
    damageType: 'magic',
    lead: true,
    supercharge: { cost: 375000, lethality: 0.25 },
    blurb: 'An alternate Mage: a mystery in a white cloak and a crystal crown. Chain Lightning jumps through up to 15 zombies, and comes back sooner when there are fewer to hit. Upgrades add ice spikes, an arcane blast, a firestorm and Time Warp.',
    tip: 'Chain Lightning loves crowds. With few zombies it casts much faster instead.',
    levels: [
      { name: 'Magei', desc: 'Chain Lightning: 7.5 damage, jumps through up to 15 zombies. Each jump it misses makes it 6% faster to cast again.', damage: 7.5, cooldown: MG_CD, range: 16, chains: 15, jump: 6, refund: { pct: 0.06, max: 15 }, hidden: false },
      { name: 'Glacier Spikes', desc: 'Glacier Spikes: every 6s, 3 ice spikes of 62.5 damage that slow zombies 50% for 5s. +2.5 range.', cost: 5000,
        damage: 7.5, cooldown: MG_CD, range: 18.5, chains: 15, jump: 6, refund: { pct: 0.06, max: 15 }, hidden: false, spells: [spikes()] },
      { name: 'Arcane Explosion', desc: '+50% damage, +2.5 range. Arcane Explosion: every 8s, 250 damage to one zombie and a quarter of that to zombies near it.', cost: 50000,
        damage: 7.5, cooldown: MG_CD, range: 21, chains: 15, jump: 6, refund: { pct: 0.06, max: 15 }, hidden: true, leth: 0.5, spells: [spikes(), EXPLOSION] },
      { name: 'Firestorm', desc: 'Freezeshatter: each spike makes the next spike on that zombie 50% stronger (8s, up to 10). Firestorm: every 15s, a fire zone for 10s, 8.3 damage a second and a big burn. +2.5 range.', cost: 100000,
        damage: 7.5, cooldown: MG_CD, range: 23.5, chains: 15, jump: 6, refund: { pct: 0.06, max: 15 }, hidden: true, leth: 0.5, spells: [spikes(true), EXPLOSION, FIRESTORM] },
      { name: 'Time Warp', desc: 'Time Warp: every tower attacks twice as fast for 10s. Arcane Mastery IV: +250% damage. +2.5 range.', cost: 300000,
        damage: 7.5, cooldown: MG_CD, range: 26, chains: 15, jump: 6, refund: { pct: 0.06, max: 15 }, hidden: true, leth: 3, spells: [spikes(true), EXPLOSION, FIRESTORM], abilities: [TIME_WARP] },
    ],
  },
  sunwalker: {
    name: 'Sunwalker',
    altOf: 'hallowboomer',
    form: 'Sun',
    shards: 2,
    price: 0,
    cost: 500,
    limit: 6,
    lob: 0.6,
    damageType: 'magic',
    lead: true,
    supercharge: { cost: 375000, lethality: 0.08 },
    blurb: 'An alternate Hallowboomer: a pupil of the sun god in gold-trimmed robes, with five sun orbs around it. Throws fireballs that burn. Upgrades add a Sunbeam, Solarion, Combustion (sets off every burn at once) and a Meteor. Short range, so it sits by the path.',
    tip: 'Combustion turns the burns already on zombies into one big hit. Let the fireballs and Solarion burn first.',
    levels: [
      { name: 'Sunwalker', desc: 'Fireball every 3s: 8.3 damage and a burn of 12.5 a second for 2s.', ...fireball(0, 10) },
      { name: 'Sunbeam', desc: 'Sunbeam: every 15s, 41.7 damage a second for 5s to every zombie in range. Fireball II: double damage. Fireproof: burns work on fire-immune zombies (at 25%). +2.5 range.', cost: 5000,
        ...fireball(1, 12.5, [SUNBEAM]) },
      { name: 'Solarion', desc: 'Solarion: every 20s, 41.7 damage a second for 5s in front of it, and a burn of 417 over 5s. Fireball III. +2.5 range.', cost: 50000,
        ...fireball(2, 15, [SUNBEAM, SOLARION]) },
      { name: 'Combustion', desc: 'Combustion: every 12s, puts out every burn nearby and deals 10x what was left of it at once. Fireball IV. +5 range.', cost: 100000,
        ...fireball(3, 20, [SUNBEAM, SOLARION, COMBUST]) },
      { name: 'Meteor', desc: 'Meteor: every 30s, 1,250 damage in a huge area. Pupil of Umaani IV: +200% damage. Fireball V.', cost: 300000,
        ...fireball(4, 20, [SUNBEAM, SOLARION, COMBUST, METEOR], 2) },
    ],
  },
  aquamancer: {
    name: 'Aquamancer',
    altOf: 'operator',
    form: 'Aqua',
    shards: 2,
    price: 0,
    cost: 5000,
    limit: 3,
    flying: false,
    damageType: 'magic',
    lead: true,
    supercharge: { cost: 187500, lethality: 0.25 },
    blurb: 'An alternate Operator: a sorceress floating over a stone shrine. Raging Wave hits every zombie on the ground, anywhere on the track, every 10s. Short range and she can\'t hit flyers. Upgrades add Ebb and Flow, Anchor, the Queen\'s Galleon and Tempest. Only 3 per player.',
    tip: 'Raging Wave reaches the whole track, so she helps even far from the action.',
    levels: [
      { name: 'Aquamancer', desc: 'Water bolts for 41.7 damage. Raging Wave: every 10s, 41.7 damage to every zombie on the ground.', damage: 41.7, cooldown: AQ_CD, range: 9, hidden: false, spells: [WAVE] },
      { name: 'Ebb and Flow', desc: '+2 range. Ebb and Flow: every 20s, attacks 50% to 450% faster for 1 to 10s (random).', cost: 20000,
        damage: 41.7, cooldown: AQ_CD, range: 11, hidden: false, spells: [WAVE, EBB] },
      { name: 'Anchor', desc: '+3 range, +50% damage. Anchor: every 8s, zombies near her target walk 75% slower for 3s.', cost: 50000,
        damage: 41.7, cooldown: AQ_CD, range: 14, hidden: true, leth: 0.5, spells: [WAVE, EBB, ANCHOR] },
      { name: "Queen's Galleon", desc: "+5 range, +50% damage. Queen's Galleon: every 30s, a galleon fires 10 shots of 833 damage at the toughest zombies on the ground.", cost: 90000,
        damage: 41.7, cooldown: AQ_CD, range: 19, hidden: true, leth: 1, spells: [WAVE, EBB, ANCHOR, GALLEON] },
      { name: 'Tempest', desc: '+5 range, +50% damage. Tempest: every 30s, lightning hits 10 random zombies for 1,000 and stuns them for 5s.', cost: 150000,
        damage: 41.7, cooldown: AQ_CD, range: 24, hidden: true, leth: 1.5, spells: [WAVE, EBB, ANCHOR, GALLEON, TEMPEST] },
    ],
  },
  augurSolis: {
    name: 'Augur Solis',
    altOf: 'turret',
    form: 'Augur',
    shards: 3,
    dreamshards: 9999,
    price: 0,
    cost: 10000,
    limit: 1,
    minRange: 8,
    lead: true,
    kind: 'support',
    kindLabel: 'Healer',
    supercharge: { cost: 375000, haste: 0.1 },
    blurb: 'An alternate Turret: Augur, Interpreter of the Sun, a giant eye over a winged spire. Its Purifying Beam locks onto one of your barracks troops and heals it until it is full, while burning the zombies around that troop with true damage (armor doesn\'t stop it). Without barracks troops in range it does nothing. Only one per player.',
    tip: 'Put it near your barracks, but not too near: it can\'t reach troops within 8 of it.',
    levels: [
      { name: 'Augur Solis', desc: 'Purifying Beam: heals one barracks troop 50 + 1% of its max health a second, and deals 25 true damage a second to zombies near it.', range: 40, hidden: true, augur: beam(25, 50, 0.01) },
      { name: 'Sacred Flame', desc: 'Beam: +25 damage and a burn, heals 90 + 2%. +10 range. Sacred Flame: every 20s, a holy zone for 10s where troops heal 90 + 2% a second and zombies lose 1% of their max health a second.', cost: 50000,
        range: 50, hidden: true, augur: beam(50, 90, 0.02, 1.67), spells: [flame(90, 0.02, 0.01)] },
      { name: 'Eye of God', desc: 'Beam: +62.5 damage, heals 110 + 3%. +10 range. Sacred Flame heals 110 + 3% and burns zombies for 208 over 5s.', cost: 150000,
        range: 60, hidden: true, augur: beam(112.5, 110, 0.03, 1.67), spells: [flame(110, 0.03, 0.01, 41.7)] },
      { name: 'Purge By Fire', desc: 'Beam: +83.3 damage, heals 130 + 4%. +15 range. Sacred Flame heals 130 + 4% and takes 5% max health a second. Purge By Fire: all your troops heal for 20s, and zombies in range burn.', cost: 300000,
        range: 75, hidden: true, augur: beam(195.8, 130, 0.04, 1.67), spells: [flame(130, 0.04, 0.05, 41.7)], abilities: [PURGE] },
    ],
  },
  johnRoblox: {
    name: 'John Roblox',
    altOf: 'john',
    form: 'Roblox',
    shards: 2,
    price: 0,
    cost: 1000,
    limit: 1,
    supercharge: { cost: 375000, lethality: 0.1, haste: 0.1 },
    blurb: 'An alternate John: a sharpshooter who leads. Upgrades give towers in his range more range and damage (GO, GO, GO!), make him hit harder the more towers stand near him, and at tier 4 Inspire boosts every tower. Only one per player.',
    tip: 'Put him in the middle of your towers: he boosts them, and they boost him.',
    levels: [
      { name: 'John Roblox', desc: 'Shoots for 6.25 damage from far away.', ...john(6.25, 20) },
      { name: 'GO, GO, GO!', desc: 'GO, GO, GO!: towers in his range get +5 range and +25% damage. Longer Barrel: +20.8 damage. +5 range. Strength in Numbers: +2% damage for each tower in his range.', cost: 5000,
        ...john(27.1, 25, { range: 5, leth: 0.25 }, 0.02) },
      { name: 'Steel Bullets', desc: 'GO, GO, GO!: +7 range, +40% damage. Steel Bullets: +31.3 damage. +5 range. Strength in Numbers: +4% a tower.', cost: 10000,
        ...john(58.3, 30, { range: 7, leth: 0.4 }, 0.04) },
      { name: 'Surefire Aim', desc: 'GO, GO, GO!: +8 range, +50% damage. Surefire Aim: +41.7 damage. +5 range. Strength in Numbers: +7% a tower.', cost: 100000,
        ...john(100, 35, { range: 8, leth: 0.5 }, 0.07) },
      { name: 'Inspire', desc: 'GO, GO, GO!: +9 range, +75% damage. Longer Barrel: +62.5 damage. +5 range. Strength in Numbers: +10% a tower. Inspire: every tower gets +50% damage and speed for 20s.', cost: 300000,
        ...john(162.5, 40, { range: 9, leth: 0.75 }, 0.1, [INSPIRE]) },
    ],
  },
};
