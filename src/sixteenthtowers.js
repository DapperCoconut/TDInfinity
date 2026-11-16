// Wave 16: seven alternate forms, a new barracks pair and the Silo.
//   Rocket Battery (Turret form): a rocket cart with a huge reach and a huge blind spot. Big blasts,
//       and from tier 3 some rockets burst into cluster bombs.
//   Mad Alchemist (Flamethrower form): throws potions at random zombies. Upgrades add special
//       potions that only come out by chance: fire, lightning, poison clouds, armor rot, a free reload.
//   Paladin (Combat Medic form): swings a maul, and casts auras that heal and boost towers near it.
//   Cleric (Doctor form, beside the Medic): never attacks. Heals and protects barracks troops.
//   Grove Warden (Shield Tower form): never attacks. Heals, toughens and saves towers and troops,
//       and roots zombies in place.
//   Gold Mine (Farm form): lots of cash each wave, but less every wave the game goes on.
//   Silo: a new tower. Each tier lets you place one more of every tower. Only one per player.
//   Defender (Enforcer form): a barracks of tough, heavily armored troops that hit softly.
//   King (Inferno Traitor form): a barracks with one huge King, very strong and slow to come back.
//
// Damage (hits, burns, poison, blasts) is the spec's divided by 12, to fit this game's numbers
// (user, 2026-11-15). Health, heals, prices, ranges and timings are as written.
// "Haste" is how fast it attacks: 100% is the base speed, so the cooldown is base / haste.
// "Lethality" is extra damage in % (user, 2026-11-15): +100 lethality = double damage.
//
// New mechanics (sim code in sim/parts/sixteenth.js unless it says otherwise):
//   supercharge: { cost, ... } on a tower: after the last tier it can be bought again and again,
//       each one 25% dearer than the last. Each one adds: lethality (more damage), haste (faster
//       attacks, or shorter ability cooldowns on towers that don't attack), clusters (cluster
//       bombs per burst, up to clusterMax), income (cash per wave).
//   cluster bombs by chance (Rocket Battery): clusterChance on a level, `clusterBomb` the bombs.
//   potions (Mad Alchemist): each throw rolls for one special potion (see throwPotion).
//   randomTarget on a tower: it always picks a random zombie in range, and its target mode can't change.
//   abilities with `sx`: the Paladin / Cleric / Grove Warden abilities (useSixteenth). All of them
//       use themselves during waves (`auto`), and can be used by hand too.
//   preserve on a level (Grove Warden): towers and troops in its aura are saved once each.
//   decay on a level (Gold Mine): its cash is this much smaller every wave (wave 1 pays in full).
//   slots on a level (Silo): +that many to the placement limit of every tower its owner has.
//   unit defense (Defender, already in the game): takes that share less damage.
//   unit multi (King): that chance a swing also hits 2 more zombies close by.
//   unit tempo (King Lethal Tempo): every `every` s, `mult` x damage that ignores armor for `time` s,
//       +`add` s for each zombie it hits (up to `max` s).
//
// Not used by the game yet (kept for later): `oldBlock` on Defender troops (the spec's block chance,
// removed in the spec's Mega Update), `halfSlot` on the Cleric (counts as half a tower).

// ------------------------------------------------------------------ Rocket Battery

const RB_CD = 5; // seconds between rockets at 100% haste
const cluster = { count: 3, damage: 0.5, radius: 6 }; // damage: share of the rocket's damage

// ------------------------------------------------------------------ Mad Alchemist

const AL_CD = 1.5;
const POT1 = { elixir: { chance: 0.08, time: 5 }, fire: { chance: 0.15, dps: 20.8, time: 3 } };
const POT2 = { ...POT1, zap: { chance: 0.08, mult: 4, stun: 3 } };
const POT3 = { ...POT2, fumes: { chance: 0.12, dps: 25, time: 6, radius: 5, slow: 0.25 }, metal: { chance: 0.12, shred: 0.02 } };

// ------------------------------------------------------------------ Paladin

const faith = (hp, dmg) => ({ key: 'faith', sx: true, auto: true, name: 'Aura of Faith', desc: `Towers nearby get +${hp} max health and +${dmg} damage for 30s`, cooldown: 90, duration: 30, hp, dmg });
const SANCTUARY = { key: 'sanctuary', sx: true, auto: true, name: 'Holy Sanctuary', desc: 'For 10s, towers nearby heal 1% of their max health a second and zombies nearby take 16.7 damage a second', cooldown: 30, duration: 10, pct: 0.01, dps: 16.7 };
const smite = (damage, cut) => ({ key: 'smite', sx: true, auto: true, name: 'Holy Smite', desc: `${damage.toLocaleString()} damage shared out over the zombies in range, and their armor drops by ${Math.round(cut * 100)}%`, cooldown: 20, damage, cut });
const HEROISM = { key: 'heroism', sx: true, auto: true, name: 'Heroism', desc: 'Every tower deals double damage (+100 lethality) for 20s', cooldown: 60, duration: 20, leth: 1 };
const RESTORE = { key: 'restoreFaith', sx: true, auto: true, name: 'Restore Faith', desc: 'Heals towers nearby 8% of their max health', cooldown: 20, pct: 0.08 };

// ------------------------------------------------------------------ Cleric

const mend = (heal) => ({ key: 'mend', sx: true, auto: true, name: 'Mend', desc: `Heals the most hurt barracks troop nearby ${heal} health`, cooldown: 5, heal });
const fort = (hp) => ({ key: 'fortitude', sx: true, auto: true, name: 'Aura of Fortitude', desc: `Barracks troops nearby get +${hp} max health for 30s (doesn't stack)`, cooldown: 30, duration: 30, hp });
const WELL = { key: 'healingWell', sx: true, auto: true, name: 'Healing Well', desc: 'For 10s, your troops nearby heal 100 health a second', cooldown: 30, duration: 10, heal: 100 };
const RESURRECT = { key: 'resurrect', sx: true, auto: true, name: 'Resurrection', desc: 'An angel guards a barracks nearby: the next of its troops to fall comes straight back', cooldown: 30 };

// ------------------------------------------------------------------ Grove Warden

const regrow = (pct, duration) => ({ key: 'regrowth', sx: true, auto: true, name: 'Regrowth', desc: `For ${duration}s, towers and troops nearby heal ${Math.round(pct * 100)}% of their max health a second`, cooldown: 30, duration, pct });
const BARKSKIN = { key: 'barkskin', sx: true, auto: true, name: 'Barkskin', desc: 'Towers and troops nearby get +3,000 max health and block 45% of hits for 7s', cooldown: 25, duration: 7, hp: 3000, block: 0.45 };
const GRASP = { key: 'grasp', sx: true, auto: true, name: "Nature's Grasp", desc: 'Roots up to 5 zombies in range, stunning them for 5s', cooldown: 20, targets: 5, stun: 5 };
const BLOOM = { key: 'naturebloom', sx: true, auto: true, name: 'Naturebloom', desc: 'For 7s, towers and troops nearby heal 10% of their max health a second and get +500 max health', cooldown: 30, duration: 7, pct: 0.1, hp: 500 };

// ------------------------------------------------------------------ barracks

const RALLY = { key: 'rally', name: 'Set Rally Point', desc: 'Click the path in range: its troops stand there and stop moving around', cooldown: 1, aim: true, radius: 2 };
const ROAM = { key: 'roam', name: 'Roam', desc: 'Its troops move around in its range again, going after zombies', cooldown: 1 };
const BARRACKS_AB = [RALLY, ROAM];

const defender = (lv, hp, oldBlock) => ({
  name: 'Defender', model: `defenderUnit${lv}`, soldiers: 1, hp, speed: 0, walk: 5, guard: true, still: true, block: true, flying: false,
  defense: 0.4, oldBlock, gun: { damage: 3, cooldown: 1.2, range: 3 },
});
const TEMPO = { every: 60, time: 25, mult: 3, add: 5, max: 60 };
const king = (lv, hp, damage, multi, blockChance) => ({
  name: 'King', model: `kingUnit${lv}`, soldiers: 1, hp, speed: 0, walk: 6, guard: true, still: true, block: true, flying: false,
  blockChance, multi, gun: { damage, cooldown: 1.5, range: 3.5 }, ...(lv >= 4 ? { tempo: TEMPO } : {}),
});

export const SIXTEENTH_TOWERS = {
  rocketBattery: {
    name: 'Rocket Battery',
    altOf: 'turret',
    form: 'Rocket',
    shards: 2,
    price: 0,
    cost: 8500,
    limit: 3,
    fly: 45, // rocket speed
    minRange: 30,
    supercharge: { cost: 93750, clusters: 0.25, clusterMax: 7, lethality: 0.05 },
    blurb: 'An alternate Turret: a cart of rockets with an operator. It reaches very far, but it can\'t hit anything within 30 of it. Upgrades make the rockets explode in big blasts, and at tier 3 some burst into cluster bombs.',
    tip: 'Put it far back from the path. Its blind spot is huge.',
    levels: [
      { name: 'Rocket Battery', desc: 'Fires a rocket for 16.7 damage from very far away. Can\'t hit zombies within 30.', damage: 16.7, cooldown: r(RB_CD / 1.5), range: 60, radius: 1, hidden: false },
      { name: 'Bigger Rockets', desc: '+12.5 damage, fires faster, +20 range, and the rockets explode (blast 13).', cost: 20000,
        damage: 29.2, cooldown: r(RB_CD / 2.5), range: 80, radius: 13, hidden: false },
      { name: 'Guided Rockets', desc: '+8.3 damage, fires faster, +20 range, a bigger blast and hidden detection.', cost: 35000,
        damage: 37.5, cooldown: r(RB_CD / 3.5), range: 100, radius: 15, hidden: true },
      { name: 'Clusterbombs', desc: '+12.5 damage, fires faster, a bigger blast, and 5% of rockets burst into 3 cluster bombs.', cost: 40000,
        damage: 50, cooldown: r(RB_CD / 4.5), range: 100, radius: 17, hidden: true, clusterChance: 0.05, clusterBomb: cluster },
      { name: 'Raze Cities', desc: '+25 damage, a bigger blast, and 10% of rockets burst into cluster bombs.', cost: 75000,
        damage: 75, cooldown: r(RB_CD / 4.5), range: 100, radius: 20, hidden: true, clusterChance: 0.1, clusterBomb: cluster },
    ],
  },
  madAlchemist: {
    name: 'Mad Alchemist',
    altOf: 'flamethrower',
    form: 'Alchemist',
    shards: 2,
    price: 0,
    cost: 5000,
    limit: 5,
    lob: 0.7,
    randomTarget: true,
    supercharge: { cost: 93750, lethality: 0.1 },
    blurb: 'An alternate Flamethrower: a mad alchemist who throws potions at random zombies in range (you can\'t change who it aims at). Upgrades add special potions that come out by chance: fire, lightning, poison clouds, armor rot, and an elixir that lets it throw again at once.',
    tip: 'Random aim spreads its potions over the whole crowd. Good with towers that focus one zombie.',
    levels: [
      { name: 'Mad Alchemist', desc: 'Throws potions for 12.5 damage in a small splash at random zombies.', damage: 12.5, cooldown: AL_CD, range: 14, radius: 3, hidden: false },
      { name: 'Toxic Chemicals', desc: '+8.3 damage, +2 range. Mysterious Elixir (8%): throws again at once, and may boost itself. Combustive Alchemicals (15%): fire, 62.5 damage over 3s.', cost: 7500,
        damage: 20.8, cooldown: AL_CD, range: 16, radius: 3, hidden: false, potions: POT1 },
      { name: 'Horrible Toxins', desc: '+12.5 damage, +3 range. Lightning in a Bottle (8%): 4x damage and a 3s stun.', cost: 11250,
        damage: 33.3, cooldown: AL_CD, range: 19, radius: 3, hidden: false, potions: POT2 },
      { name: 'Volatile Chemicals', desc: '+16.7 damage, +5 range. Noxious Fumes (12%): a poison cloud, 150 damage over 6s and 25% slower. Metal Transmutations (12%): -2% armor for good, stacks.', cost: 15000,
        damage: 50, cooldown: AL_CD, range: 24, radius: 3, hidden: true, potions: POT3 },
      { name: 'Mad Flailing', desc: '+33.3 damage and throws 50% faster.', cost: 75000,
        damage: 83.3, cooldown: r(AL_CD / 1.5), range: 24, radius: 3, hidden: true, potions: POT3 },
    ],
  },
  paladin: {
    name: 'Paladin',
    altOf: 'combatMedic',
    form: 'Paladin',
    shards: 2,
    price: 0,
    cost: 3500,
    limit: 4,
    melee: true,
    flying: false,
    supercharge: { cost: 12125, lethality: 0.05, haste: 0.05 },
    blurb: 'An alternate Combat Medic: a knight in heavy armor who swings a maul. Upgrades give it holy auras that heal and boost the towers around it. Three max-level Paladins can keep Aura of Faith up all the time.',
    tip: 'Put it in the middle of your strongest towers so its auras reach them all.',
    levels: [
      { name: 'Paladin', desc: 'Swings a heavy maul for 25 damage.', damage: 25, cooldown: 1.5, range: 8, aura: 15, hp: 1200, hidden: false },
      { name: 'Aura of Faith', desc: 'Infused Hammer: +41.7 damage. Aura of Faith: towers nearby get +300 max health and +4.2 damage for 30s.', cost: 4000,
        damage: 66.7, cooldown: 1.5, range: 8, aura: 15, hp: 1800, hidden: false, abilities: [faith(300, 4.2)] },
      { name: 'Holy Sanctuary', desc: 'Infused Hammer: +58.3 damage. Holy Sanctuary: towers nearby heal, zombies nearby burn. Holy Smite: 1,000 damage shared out, armor -75%.', cost: 6500,
        damage: 125, cooldown: 1.5, range: 8, aura: 15, hp: 2600, hidden: false, abilities: [faith(300, 4.2), SANCTUARY, smite(1000, 0.75)] },
      { name: 'Heroism', desc: 'Infused Hammer: +66.7 damage. Heroism: every tower deals double damage for 20s. Aura of Faith: +750 health, +8.3 damage. Holy Smite: 2,000 damage, armor -150%. Restore Faith: heals 8%.', cost: 9700,
        damage: 191.7, cooldown: 1.5, range: 8, aura: 15, hp: 3600, hidden: true, abilities: [faith(750, 8.3), SANCTUARY, smite(2000, 1.5), HEROISM, RESTORE] },
    ],
  },
  cleric: {
    name: 'Cleric',
    altOf: 'doctor',
    form: 'Cleric',
    shards: 1,
    price: 0,
    cost: 200,
    limit: 6,
    kind: 'support',
    kindLabel: 'Healer',
    halfSlot: true,
    supercharge: { cost: 688, haste: 0.01 },
    blurb: 'An alternate Doctor that has taken a vow of peace: it never attacks. It heals and protects barracks troops near it. From tier 3 an angel guards a barracks and brings back the next troop that falls.',
    tip: 'Keep your barracks together and put the Cleric in the middle so they are all in range. Resurrection is great on troops that take long to come back, like the King.',
    levels: [
      { name: 'Cleric', desc: 'Mend: heals the most hurt barracks troop nearby 5 health every 5s.', aura: 12, hp: 300, hidden: false, abilities: [mend(5)] },
      { name: 'Herbal Remedies', desc: 'Mend heals 90. Aura of Fortitude: barracks troops nearby get +90 max health for 30s.', cost: 250,
        aura: 12, hp: 350, hidden: false, abilities: [mend(90), fort(90)] },
      { name: 'Holy Water', desc: 'Mend heals 150. Aura of Fortitude gives +200. Healing Well: your troops nearby heal 100 a second for 10s.', cost: 300,
        aura: 12, hp: 400, hidden: false, abilities: [mend(150), fort(200), WELL] },
      { name: 'Ascended Prayers', desc: 'Mend heals 250. Resurrection: an angel guards a barracks; the next troop to fall comes straight back.', cost: 550,
        aura: 12, hp: 500, hidden: false, abilities: [mend(250), fort(200), WELL, RESURRECT] },
    ],
  },
  groveWarden: {
    name: 'Grove Warden',
    altOf: 'shieldTower',
    form: 'Grove',
    shards: 2,
    price: 0,
    cost: 3500,
    limit: 3,
    kind: 'support',
    kindLabel: 'Healer',
    supercharge: { cost: 81250, haste: 0.15 },
    blurb: 'An alternate Shield Tower: a forest keeper who never attacks. Regrowth slowly heals the towers and troops around it. Upgrades add Barkskin (more health and blocking), Preservation (saves each one once), roots that stun zombies, and a big healing bloom.',
    tip: 'Put it where zombies hit your towers hardest. Great with barracks: their troops get the heals too.',
    levels: [
      { name: 'Grove Warden', desc: 'Regrowth: for 15s, towers and troops nearby heal 3% of their max health a second (every 30s).', aura: 14, hp: 3000, hidden: false, abilities: [regrow(0.03, 15)] },
      { name: 'Barkskin', desc: 'Barkskin: +3,000 max health and 45% block for 7s. Preservation: the first hit that drops each tower or troop below half health heals it 25% instead (once each).', cost: 20000,
        aura: 14, hp: 3300, hidden: false, preserve: 0.25, abilities: [regrow(0.03, 15), BARKSKIN] },
      { name: "Nature's Grasp", desc: "Nature's Grasp: roots up to 5 zombies for 5s. Regrowth heals +11% (14% a second).", cost: 45000,
        aura: 14, hp: 3800, hidden: false, preserve: 0.25, abilities: [regrow(0.14, 15), BARKSKIN, GRASP] },
      { name: 'Naturebloom', desc: "Naturebloom: 10% healing a second and +500 max health for 7s. Nature's Affinity: Regrowth lasts 45s and Preservation heals 100%.", cost: 65000,
        aura: 14, hp: 4500, hidden: false, preserve: 1, abilities: [regrow(0.14, 45), BARKSKIN, GRASP, BLOOM] },
    ],
  },
  goldMine: {
    name: 'Gold Mine',
    altOf: 'farm',
    form: 'Mine',
    shards: 1,
    price: 0,
    cost: 1000,
    limit: 6,
    kind: 'income',
    supercharge: { cost: 43750, income: 1500 },
    blurb: 'An alternate Farm: a mine that digs up lots of cash every wave. But the gold runs out: every wave it pays 15% less than the wave before, so it is best bought early.',
    tip: 'Buy it in the first waves. Late in the game a Farm pays more.',
    levels: [
      { name: 'Gold Mine', desc: 'Give Gold: $500 every wave, 15% less each wave the game goes on.', income: 500, decay: 0.85, hidden: false },
      { name: 'Iron Deposits', desc: '+$2,000 every wave (it still shrinks each wave).', cost: 3500, income: 2500, decay: 0.85, hidden: false },
      { name: 'Gold Deposits', desc: '+$8,000 every wave.', cost: 15000, income: 10500, decay: 0.85, hidden: false },
      { name: 'Precious Gems', desc: '+$20,000 every wave. (Miiine Diiiiamonds does nothing. It\'s a joke.)', cost: 35000, income: 30500, decay: 0.85, hidden: false },
    ],
  },
  silo: {
    name: 'Silo',
    price: 5000,
    cost: 300000,
    limit: 1,
    kind: 'income',
    blurb: 'Never attacks. Each upgrade lets you place one more of every tower you have. Only one Silo per player. Very expensive, so it is for late games with lots of cash.',
    tip: 'Buy it when you have hit the placement limit of your best tower.',
    levels: [
      { name: 'Silo', desc: 'A big grain silo. Upgrade it to place more towers.', slots: 0, hidden: false },
      { name: 'Wheat Stores', desc: '+1 to the placement limit of every tower you have.', cost: 300000, slots: 1, hidden: false },
      { name: 'Iron Farm Tools', desc: '+2 to the placement limit of every tower you have.', cost: 300000, slots: 2, hidden: false },
    ],
  },
  defender: {
    name: 'Defender',
    altOf: 'enforcer',
    form: 'Defender',
    shards: 2,
    price: 0,
    cost: 2500,
    limit: 3,
    kind: 'spawner',
    spawnEvery: 10,
    unitsDie: true,
    blurb: 'An alternate Enforcer: a castle barracks. Its Defenders wear heavy armor (they take 40% less damage) and have lots of health, but hit softly. Great at holding fast zombies in place.',
    tip: 'With a Grove Warden or a Cleric nearby they are very hard to kill.',
    levels: [
      { name: 'Defender', desc: 'Keeps 3 Defenders on the path (200 health, 40% armor, 3 damage a swing).', range: 12, hidden: false, abilities: BARRACKS_AB, maxUnits: 3,
        unit: defender(0, 200, 0) },
      { name: 'Lean Protein Meals', desc: '+200 health (400). Small Steel Shield.', cost: 4500, range: 12, hidden: false, abilities: BARRACKS_AB, maxUnits: 3,
        unit: defender(1, 400, 0.1) },
      { name: 'Call to Arms', desc: 'Last Minute Workout: +200 health (600). Medium Steel Shield. Call to Arms: 4 Defenders.', cost: 6000, range: 12, hidden: false, abilities: BARRACKS_AB, maxUnits: 4,
        unit: defender(2, 600, 0.2) },
      { name: 'Adrenaline Rush', desc: 'Adrenaline Rush: +300 health (900). Large Steel Shield. Call to Arms: 5 Defenders.', cost: 9000, range: 12, hidden: false, abilities: BARRACKS_AB, maxUnits: 5,
        unit: defender(3, 900, 0.3) },
    ],
  },
  king: {
    name: 'King',
    altOf: 'traitor',
    form: 'King',
    shards: 3,
    price: 0,
    cost: 100000,
    limit: 1,
    kind: 'spawner',
    spawnEvery: 30,
    unitsDie: true,
    blurb: 'An alternate Traitor: a barracks with one King in gold-plated steel and a giant sword. He has huge health and hits very hard, but fights one zombie at a time, so crowds give him trouble. When he falls he takes 30s to come back.',
    tip: 'A Cleric with Resurrection brings him straight back. At tier 4 Lethal Tempo makes him unstoppable for a while.',
    levels: [
      { name: 'King', desc: 'Keeps the King on the path (5,000 health, 625 damage a swing).', range: 12, hidden: true, abilities: BARRACKS_AB, maxUnits: 1,
        unit: king(0, 5000, 625, 0, 0) },
      { name: 'Master Duelist', desc: '+104 damage, +1,250 max health, 30% chance to hit 2 more zombies, +20 range, blocks 5% of hits.', cost: 200000, range: 32, hidden: true, abilities: BARRACKS_AB, maxUnits: 1,
        unit: king(1, 6250, 729.2, 0.3, 0.05) },
      { name: 'Rare Strength Elixirs', desc: '+167 damage, +1,500 max health, 35% multi-attack, +10 range, blocks 10%.', cost: 250000, range: 42, hidden: true, abilities: BARRACKS_AB, maxUnits: 1,
        unit: king(2, 7750, 895.8, 0.35, 0.1) },
      { name: 'Grandiose Strikes', desc: '+292 damage, +1,750 max health, 45% multi-attack, +10 range, blocks 15%.', cost: 300000, range: 52, hidden: true, abilities: BARRACKS_AB, maxUnits: 1,
        unit: king(3, 9500, 1187.5, 0.45, 0.15) },
      { name: 'Sword of Ashkanite', desc: '+417 damage, +2,000 max health, 60% multi-attack, +20 range, blocks 20%. Lethal Tempo: every 60s, triple damage that ignores armor for 25s, +5s for each zombie he hits.', cost: 300000, range: 72, hidden: true, abilities: BARRACKS_AB, maxUnits: 1,
        unit: king(4, 11500, 1604.2, 0.6, 0.2) },
    ],
  },
};

/** What tower `t`'s next Supercharge costs (each one 25% dearer than the last). */
export const superchargeCost = (sc, n) => Math.round(sc.cost * 1.25 ** n);

/** Can this tower be supercharged (after its last tier)? */
export const canSupercharge = (def) => typeof def?.supercharge === 'object' && !def.cross;

/** What one Supercharge gives, in words. */
export function superchargeText(sc) {
  const out = [];
  if (sc.lethality) out.push(`+${Math.round(sc.lethality * 100)}% damage`);
  if (sc.haste) out.push(`+${Math.round(sc.haste * 100)}% speed`);
  if (sc.clusters) out.push(`+${sc.clusters} cluster bombs (up to ${sc.clusterMax})`);
  if (sc.income) out.push(`+$${sc.income.toLocaleString()} a wave`);
  if (sc.units) out.push(`+${sc.units} troop room`); // Helloc (every full 1 is one more Spawn)
  if (sc.unitHp) out.push(`+${sc.unitHp.toLocaleString()} troop health`); // Dreamknight, Golem
  if (sc.unitDmg) out.push(`+${sc.unitDmg} troop damage`); // Golem
  if (sc.reverse) out.push(`+${sc.reverse} zombies sent back (up to +${sc.reverseMax})`); // TimeBender
  if (sc.thirstMax) out.push(`+${sc.thirstMax} Sanguine Thirst cap`); // Siphoner
  return out.join(', ');
}

/**
 * Silo: how many more of each tower player `pid` may place (the best Silo it owns). `towers` are
 * the match's towers ({ type, level, owner }). The Silo itself never gets more.
 */
export function siloSlots(towers, pid) {
  let n = 0;
  for (const t of towers) if (t.owner === pid && t.type === 'silo') n = Math.max(n, SIXTEENTH_TOWERS.silo.levels[t.level]?.slots || 0);
  return n;
}

function r(n) {
  return Math.round(n * 100) / 100;
}
