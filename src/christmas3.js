// Christmas Night 3 (2026-11-11 user spec): 35 waves on Goldcloud Spires (map key `spires`). The
// Christmas Event (DIFFICULTIES.christmas) plays these when the spires map is picked (its
// `mapModes.spires`). The enemies are its own (xs*).
//
// From the spec: every health, shield ("+"), speed with a number, defense, damage cap, hidden,
// flying, what spawns on death, the summons, and the Arbiter's five moves with this mode's limits
// (4 towers per Speed of Light, 3 swords, a 400 cap), the Ardent's resist to the Elite tower. The spec's three tables are used as they are.
// Speeds given only as words are guesses (first table: Slow 2.4, Below average 3, Average 3.6,
// Above average 4.2, Fast 5). Every other guess (timers, ranges, tower damage, resist amounts...)
// is in the memory notes. How they act: src/sim/parts/spires.js (and the older shared moves).
// How they look: Night 1's `xm` looks with their own colors (no new models yet).

/** Kill reward and base damage from health (the Halloween Event's curve). */
const reward = (hp) => Math.max(2, Math.round(1.5 * hp ** 0.55));
const dmg = (hp) => Math.max(1, Math.round(hp ** 0.5 / 2));
// osh: the shield after the "+". The mode's health curve shrinks it too (oshCurve).
const E = (name, hp, speed, look, skin, extra = {}) => ({ name, hp, speed, reward: reward(hp + (extra.osh ?? 0)), damage: dmg(hp + (extra.osh ?? 0)), scale: 1, xm: look, skin, shirt: skin, pants: skin, face: 'blank', ...(extra.osh ? { oshCurve: true } : {}), ...extra });
const NOFREEZE = { freezeImmune: true }; // "resists freeze"
const BLAST = { explosiveResist: 0.5 }; // "resists blast"
const WINGS = { thrusters: { every: 15, time: 3, speed: 2.5 }, archangel: { every: 20, pct: 0.1 } }; // the Councilman's

const NEW = {
  // ------------------------------------------------------------ first table (waves 1-14)
  xsGrail: E('Grail', 65, 2.4, 'snowy', 0xffd54f, {
    intro: '☁️ CHRISTMAS NIGHT 3! Hold Goldcloud Spires for 35 waves. "The winner takes the Holy City."' }),
  // Heals itself 5 health every half second when nothing has hit it for 2 seconds.
  xsLifeworker: E('Lifeworker', 50, 3.6, 'snowy', 0x81c784, { calmHeal: { hp: 5, every: 0.5, calm: 2 },
    intro: '💚 Lifeworkers heal themselves when you stop hitting them!' }),
  xsMetrocop: E('Metrocop', 115, 3.6, 'invader', 0x37474f, { ignite: { at: 60 / 115, speed: 5.5 } }),
  xsCrusader: E('Crusader', 190, 3, 'hero', 0xeeeeee, { defense: 1, ...BLAST }),
  // Shoots the nearest tower to stun it, and puts a 150 shield on an ally.
  xsOfficer: E('Officer', 600, 2.4, 'invader', 0x283593, { osh: 75, ...BLAST,
    zap: { every: 10, range: 25, stun: 2, c: 0x64b5f6, text: '🔫 Stunned!' },
    giveShield: { every: 8, radius: 15, amt: 150 },
    intro: '👮 Officers shoot towers to stun them and give allies a shield.' }),
  xsHoverTank: E('Hover Tank', 3200, 2.4, 'packed', 0x546e7a, { defense: 5, plasmaResist: 0.5, scale: 1.5,
    zap: { every: 12, range: 30, stun: 3, c: 0x18ffff, text: '⚡ Railgun!' },
    intro: '🛸 MINI-BOSS: the HOVER TANK! Its railgun stuns towers.' }),
  xsPriest: E('Priest', 700, 3.6, 'angel', 0xfff8e1, { osh: 150, flying: true, ...NOFREEZE,
    summon: { type: 'xsAngel', n: 2, every: 12, noCash: true },
    intro: '😇 FLYERS! Priests fly and call Angel Constructs. You need air detection.' }),
  xsAngel: E('Angel Construct', 160, 5, 'angel', 0xb3e5fc, { flying: true, defense: 1, ...NOFREEZE, scale: 0.85 }),
  // Tiny damage cap: 8 a hit (the spec's 2021 number).
  xsAvarian: E('Avarian Construct', 350, 4.2, 'angel', 0xffca28, { osh: 250, defense: 10, maxHit: 8, shockImmune: true,
    intro: '🛡️ Avarian Constructs take at most 8 damage a hit. Fast towers win here!' }),
  // Mortar Strike: towers around it fire slower.
  xsDarkPriest: E('Dark Priest', 1400, 5, 'angel', 0x4a148c, { osh: 600, flying: true, ...NOFREEZE,
    fatigue: { every: 12, radius: 12, amt: 0.4, time: 6 },
    intro: '🌑 Dark Priests fly and their Mortar Strike makes towers fire slower.' }),
  // Boss: defense 16 with its shield; without it defense 8, faster, and heals 50 a second.
  xsCrusaderLord: E('Crusader Lord', 20000, 2.4, 'hero', 0xffd700, { osh: 24000, defense: 16, scale: 1.9, boss: true, bar: true, barName: 'CRUSADER LORD',
    lord: { defense: 8, speed: 3.6, heal: 50 },
    intro: '⚔️ BOSS: the CRUSADER LORD! When his shield breaks he speeds up and heals.' }),
  xsArdent: E('Ardent', 400, 24, 'hero', 0xff7043, { osh: 60, defense: 2, maxHit: 350, scale: 0.9, towerResist: { prefix: 'phaserElite', amt: 0.5 },
    intro: '💨 Ardents are EXTREMELY fast, and no hit does more than 350 to them.' }),
  xsCourier: E('Courier', 5000, 2.4, 'angel', 0xfff59d, { osh: 2000, flying: true, defense: 5, ...NOFREEZE, scale: 1.5,
    deathSpawn: { fixed: [['xsOfficer', 2], ['xsAvarian', 2], ['xsDarkPriest', 1]] },
    intro: '📦 Couriers fly, and drop Officers, Avarian Constructs and a Dark Priest when they die!' }),
  // Boss (wave 28): Portals every 20 s. Thruster Wings: a burst of speed every 15 s, only while
  // shielded. Archangel: gets back 10% of its full shield every 20 s.
  xsCouncilman: E('Councilman', 30000, 1.8, 'spirit', 0xf5f5f5, { osh: 40000, ...NOFREEZE, bulletResist: 0.5, scale: 2, boss: true, bar: true, barName: 'THE COUNCILMAN', ...WINGS,
    summon: { type: 'xsPortal', n: 1, every: 20, here: true, noCash: true },
    intro: '🌀 BOSS: THE COUNCILMAN! His Portals keep sending enemies. Break them!' }),
  // The 2021 Councilman (waves 33 and 35): more health, a tiny shield.
  xsCouncilman2: E('Councilman', 50000, 1.8, 'spirit', 0xe0e0e0, { osh: 1000, ...NOFREEZE, bulletResist: 0.5, scale: 2, bar: true, barName: 'THE COUNCILMAN', ...WINGS,
    summon: { type: 'xsPortal', n: 1, every: 20, here: true, noCash: true } }),
  // Stands still and sends a random enemy every 6 s. Its shield fades; after 45 s it closes.
  xsPortal: E('Portal', 1, 0, 'unstable', 0xffeb3b, { osh: 4000, reward: 0, scale: 1.4,
    summon: { types: ['xsArdent', 'xsAvarian', 'xsOfficer', 'xsHoverTank', 'xsDarkPriest'], n: 1, every: 6, here: true, noCash: true },
    portalLife: { fade: 100, life: 45 } }),
  // Final boss. See arbiter in spires.js for the fight.
  xsArbiter: E('The Arbiter', 100000, 2, 'hero', 0xfffde7, { osh: 75000, ...NOFREEZE, scale: 2.6, boss: true, bar: true, barName: 'THE ARBITER',
    slam: { range: 12, every: 14, stun: 2 }, // Sword Slam
    skulls: { every: 16, n: 3, range: 50, stun: 2 }, // Sword Summon: at most 3 swords
    arbiter: {
      light: { every: 22, n: 4, range: 45, stun: 2, heal: 500 }, // Speed of Light: at most 4 towers, 500 health each
      defense: { maxHit: 400, speed: 0.75 }, // Avarian Defense, once his shield is gone
      ascend: { hp: 15000 }, // Divine Ascension: flies and loses his shield
    },
    intro: '⚖️ FINAL BOSS: THE ARBITER! "The winner takes the Holy City."' }),

  // ------------------------------------------------------------ second table
  xsTwig: E('Tiny Twig', 20, 2.5, 'snowy', 0x8d6e63, { scale: 0.6 }),
  xsBabyTanuki: E('Baby Tanuki', 150, 1.4, 'snowy', 0xa1887f, { scale: 0.75 }),
  // Every 8 s it slips past: 1.5 s that can't be hit, at double speed. A stun resets the timer.
  xsTanuki: E('Tanuki', 700, 5, 'snowy', 0x795548, { slip: { every: 8, time: 1.5, speed: 2 },
    intro: '🦝 Tanukis slip past your towers now and then. Stun them to stop it!' }),
  xsGreenBarrel: E('Green Barrel Boy', 700, 5, 'packed', 0x43a047),
  xsBarrel: E('Barrel Boy', 1500, 2, 'packed', 0x8d6e63, { scale: 1.2, deathSpawn: { fixed: [['xsGreenBarrel', 1]] },
    intro: '🛢️ Barrel Boys drop a Green Barrel Boy when they die.' }),
  xsConjuror: E('Conjuror', 2000, 3, 'mist', 0x7e57c2, { hidden: true,
    summon: { type: 'xsStarSeer', n: 1, every: 10, noCash: true },
    intro: '🔮 Conjurors are HIDDEN and call Star Seers that stun hero towers they fly past.' }),
  // Flies past hero towers and stuns the ones it touches.
  xsStarSeer: E('Star Seer', 300, 4.5, 'spirit', 0xfff176, { flying: true, noCollide: true, reward: 0, scale: 0.8,
    touch: { radius: 3, stun: 2 } }),
  xsBombBarrel: E('Bomb Barrel Boy', 3000, 2.5, 'packed', 0xd32f2f, { scale: 1.3,
    deathBlast: { radius: 10, stun: 3, heroes: true },
    deathSpawn: { fixed: [['xsBarrel', 1]] },
    intro: '💣 Bomb Barrel Boys blow up when they die, stunning hero towers close by.' }),
  // Boss: comes back with 50,000 health; phase 2 drops hero towers around it a level every 7 s.
  xsOrnate: E('Ornate', 35000, 1.2, 'necro', 0xce93d8, { scale: 2, boss: true, bar: true, barName: 'ORNATE', phase2: 'xsOrnate2',
    intro: '👑 BOSS: ORNATE! It comes back once, and then it downgrades your hero towers!' }),
  xsOrnate2: E('Ornate', 50000, 1.8, 'necro', 0xab47bc, { scale: 2.1, boss: true, bar: true, barName: 'ORNATE (REVIVED)',
    downgrade: { every: 7, radius: 15 } }),
  xsEliteConjuror: E('Elite Conjuror', 8000, 3, 'mist', 0x311b92, { hidden: true, scale: 1.3,
    summon: { type: 'xsStarSeer', n: 1, every: 8, noCash: true } }),

  // ------------------------------------------------------------ third table (robots)
  xsTargetBot: E('Target Bot', 150, 4.2, 'invader', 0xef5350, { bulletResist: 0.1 }),
  xsRangerBot: E('Ranger Bot', 250, 3.4, 'invader', 0x689f38, { unitShot: { every: 2, range: 20, dmg: 15 } }),
  // Enemies near it reach 30% further with their shots.
  xsScoutBot: E('Scout Bot', 175, 6, 'invader', 0x90a4ae, { osh: 175, scale: 0.85, rangeAura: { radius: 12, amt: 0.3 },
    intro: '📡 Scout Bots make the enemies near them shoot 30% further.' }),
  xsMissileBot: E('Missile Bot', 450, 3.2, 'invader', 0xff8a65, { osh: 100, explosiveResist: 0.55,
    zap: { every: 6, range: 25, dmg: 40, c: 0xff6d00, text: '🚀' },
    intro: '🚀 Missile Bots shoot your towers!' }),
  xsFlameBot: E('Flame Bot', 700, 2.5, 'invader', 0xff5722, { osh: 250, burnResist: 0.9,
    zap: { every: 3, range: 12, dmg: 20, c: 0xff3d00 } }),
  xsOperatorBot: E('Operator Bot', 800, 4.5, 'invader', 0x5c6bc0, { osh: 700,
    zap: { every: 8, range: 35, dmg: 75, c: 0x7c4dff } }),
  // Heals the enemies around it 2% and makes them 50% faster for 6 s.
  xsDJBot: E('DJ Bot', 800, 3, 'invader', 0xe040fb, { osh: 300,
    healPulse: { every: 8, radius: 12, pct: 0.02 }, bell: { every: 8, radius: 12, speed: 0.5, time: 6 },
    intro: '🎧 DJ Bots heal enemies and speed them up!' }),
  // Before wave 23 it calls only the 6 Scout Bots.
  // Enemies near it do 35% more damage (to the base and with their shots).
  xsCommanderBot: E('Commander Bot', 8250, 1.9, 'ravager', 0x455a64, { osh: 5000, armor: 0.25, scale: 1.6, dmgAura: { radius: 12, amt: 0.35 },
    summon: { type: 'xsMiniScout', n: 6, every: 35, noCash: true },
    intro: '🎖️ MINI-BOSS: the COMMANDER BOT! It calls more robots.' }),
  xsCommanderBot2: E('Commander Bot', 8250, 1.9, 'ravager', 0x37474f, { osh: 5000, armor: 0.25, scale: 1.6, dmgAura: { radius: 12, amt: 0.35 },
    summon: [{ type: 'xsMiniScout', n: 6, every: 35, noCash: true }, { type: 'xsJuggernautBot', n: 5, every: 35, noCash: true }, { type: 'xsRailBot', n: 3, every: 35, noCash: true }] }),
  xsMiniScout: E('Scout Bot', 835, 8.5, 'invader', 0xb0bec5, { reward: 0, scale: 0.8 }),
  // Heals the strongest enemy 250 a second; Ubercharge makes it unhittable for 5 s.
  xsMediBot: E('Medi Bot', 1000, 2.7, 'invader', 0xffffff, { osh: 500,
    medic: { range: 25, heal: 250, uber: { every: 20, time: 5 } },
    intro: '⛑️ Medi Bots heal the strongest enemy and make it invulnerable for a moment!' }),
  xsJetBot: E('Jet Bot', 1200, 4.2, 'invader', 0x26c6da, { osh: 700,
    zap: { every: 1, range: 20, dmg: 15, c: 0x00e5ff } }),
  xsSniperBot: E('Sniper Bot', 1000, 2.2, 'mist', 0x33691e, { osh: 500, hidden: true,
    intro: '🎯 Sniper Bots are HIDDEN.' }),
  xsJuggernautBot: E('Juggernaut Bot', 2200, 1.8, 'ravager', 0x616161, { osh: 1200, bulletResist: 0.3, explosiveResist: 0.5, scale: 1.3 }),
  // Heals the strongest enemy 150 a second; every 15 s it gives it +200% damage for 7 s.
  xsKritzBot: E('Kritz Bot', 1000, 2.7, 'invader', 0x1e88e5, { osh: 500, medic: { range: 25, heal: 150, kritz: { every: 15, time: 7, amt: 2 } } }),
  xsGrenadierBot: E('Sgrenadier Bot', 3000, 3, 'ravager', 0x8d6e63, { osh: 2500, scale: 1.2,
    zap: { every: 10, range: 25, slow: 0.8, time: 5, c: 0x795548, text: '💥 Reloading...' } }),
  xsM202Bot: E('M202 Bot', 3000, 2.4, 'ravager', 0x827717, { osh: 3000, explosiveResist: 0.9, scale: 1.2 }),
  xsRailBot: E('Railtrooper Bot', 5000, 1.8, 'ravager', 0x0d47a1, { osh: 3500, laserResist: 0.85, scale: 1.3,
    zap: { every: 8, range: 30, weak: 0.3, time: 6, c: 0x40c4ff, text: '📉 -30% damage' } }),
  xsGiantGrenadier: E('Giant Grenadier Bot', 15000, 2.4, 'ravager', 0x5d4037, { osh: 5000, scale: 1.9,
    zap: { every: 8, range: 30, radius: 8, weak: 0.5, time: 8, c: 0xff6f00, text: '💥 -50% damage!' },
    intro: '💣 MINI-BOSS: the GIANT GRENADIER BOT! Its grenades halve tower damage.' }),
};

export function addChristmas3Enemies(ENEMIES) {
  for (const [k, d] of Object.entries(NEW)) ENEMIES[k] = d;
}

// Wave groups: [type, count, secondsBetween, startDelay]. Counts are the spec's. Gaps, delays,
// bonuses and timers are guesses. `bonus` is one of four players' share.
const W = (bonus, groups, note) => ({ bonus, groups, ...(note ? { note } : {}) });
const b = (n) => 250 + (n - 1) * 70;
export const CHRISTMAS3_WAVES = [
  W(b(1), [['xsGrail', 10, 0.8, 0], ['xsLifeworker', 6, 1, 3], ['xsTwig', 6, 0.7, 6], ['xsTargetBot', 8, 0.8, 9]], 'Christmas Night 3! An easy start.'),
  W(b(2), [['xsGrail', 12, 0.7, 0], ['xsLifeworker', 8, 0.9, 3], ['xsMetrocop', 6, 1, 7], ['xsRangerBot', 6, 1, 11]], 'Lifeworkers heal themselves.'),
  W(b(3), [['xsMetrocop', 10, 0.8, 0], ['xsCrusader', 6, 1, 4], ['xsTwig', 6, 0.6, 8], ['xsScoutBot', 4, 1, 11]]),
  W(b(4), [['xsCrusader', 8, 1, 0], ['xsGrail', 10, 0.6, 4], ['xsBabyTanuki', 4, 1.2, 8], ['xsMissileBot', 4, 1.5, 11]], 'Missile Bots shoot towers.'),
  W(b(5), [['xsOfficer', 4, 2, 0], ['xsMetrocop', 8, 0.8, 4], ['xsBabyTanuki', 6, 1, 8], ['xsRangerBot', 6, 1, 12]], 'Officers stun towers and shield allies.'),
  W(b(6), [['xsOfficer', 6, 1.5, 0], ['xsCrusader', 10, 0.8, 4], ['xsLifeworker', 6, 0.8, 9], ['xsFlameBot', 2, 3, 12]]),
  W(b(7), [['xsHoverTank', 1, 0, 0], ['xsOfficer', 4, 1.5, 3], ['xsBabyTanuki', 8, 0.8, 7], ['xsOperatorBot', 4, 1.5, 11]], 'MINI-BOSS: the Hover Tank! Its railgun stuns towers.'),
  W(b(8), [['xsPriest', 2, 3, 0], ['xsMetrocop', 10, 0.8, 4], ['xsMissileBot', 4, 1.5, 9]], 'A lighter wave. First flyers: you need air detection!'),
  W(b(9), [['xsPriest', 3, 3, 0], ['xsAngel', 6, 1, 4], ['xsTanuki', 2, 2, 8], ['xsDJBot', 2, 3, 11]], 'DJ Bots heal and speed up enemies.'),
  W(b(10), [['xsCommanderBot', 1, 0, 0], ['xsCrusader', 6, 1, 3], ['xsOfficer', 4, 1.5, 7]], 'MINI-BOSS: the Commander Bot calls more robots!'),
  W(b(11), [['xsAvarian', 4, 1.5, 0], ['xsHoverTank', 2, 4, 4], ['xsTanuki', 4, 1.5, 9], ['xsMediBot', 2, 3, 13]], 'Avarian Constructs take tiny damage per hit.'),
  W(b(12), [['xsDarkPriest', 2, 3, 0], ['xsPriest', 4, 2, 4], ['xsGreenBarrel', 3, 1.5, 9], ['xsJetBot', 4, 1.5, 12]], 'Dark Priests make towers fire slower.'),
  W(b(13), [['xsAvarian', 6, 1.2, 0], ['xsOfficer', 6, 1.2, 4], ['xsGreenBarrel', 4, 1.2, 9], ['xsSniperBot', 2, 3, 12]], 'Sniper Bots are hidden!'),
  W(b(14), [['xsCrusaderLord', 1, 0, 0], ['xsDarkPriest', 3, 3, 4], ['xsBarrel', 2, 3, 9]], 'BOSS: the Crusader Lord! He speeds up and heals once his shield breaks.'),
  W(b(15), [['xsArdent', 4, 1.5, 0], ['xsMetrocop', 6, 0.8, 4], ['xsJuggernautBot', 2, 4, 8]], 'A lighter wave. Ardents are extremely fast!'),
  W(b(16), [['xsConjuror', 1, 0, 0], ['xsPriest', 4, 2, 3], ['xsAvarian', 6, 1.2, 7], ['xsKritzBot', 2, 3, 11]], 'The Conjuror is hidden and calls stunning Star Seers.'),
  W(b(17), [['xsHoverTank', 3, 3, 0], ['xsDarkPriest', 4, 2, 5], ['xsBarrel', 3, 2, 9], ['xsGrenadierBot', 2, 4, 13]]),
  W(b(18), [['xsArdent', 8, 1, 0], ['xsOfficer', 6, 1.2, 4], ['xsConjuror', 2, 4, 8], ['xsOperatorBot', 4, 1.5, 12]]),
  W(b(19), [['xsCourier', 2, 5, 0], ['xsTanuki', 4, 1.5, 4], ['xsM202Bot', 2, 4, 8]], 'Couriers drop more enemies when they die.'),
  W(b(20), [['xsAvarian', 6, 1.2, 0], ['xsDarkPriest', 4, 2, 4], ['xsBombBarrel', 2, 4, 8], ['xsRailBot', 2, 4, 12]], 'Bomb Barrel Boys stun hero towers when they die.'),
  W(b(21), [['xsOrnate', 1, 0, 0], ['xsArdent', 4, 1.5, 4], ['xsHoverTank', 3, 4, 8]], 'BOSS: ORNATE! In phase 2 it downgrades hero towers.'),
  W(b(22), [['xsAngel', 10, 0.8, 0], ['xsPriest', 4, 2, 4], ['xsGreenBarrel', 6, 1, 8], ['xsDJBot', 2, 3, 12]], 'A lighter wave to rebuild.'),
  W(b(23), [['xsCrusaderLord', 1, 0, 0], ['xsOfficer', 6, 1.2, 4], ['xsCommanderBot2', 2, 6, 8]], 'MINI-BOSS: another Crusader Lord, and Commander Bots call their whole army now!'),
  W(b(24), [['xsCourier', 3, 4, 0], ['xsEliteConjuror', 2, 5, 4], ['xsMediBot', 2, 3, 9]]),
  W(b(25), [['xsArdent', 10, 0.8, 0], ['xsDarkPriest', 6, 1.5, 4], ['xsBombBarrel', 3, 3, 9], ['xsJuggernautBot', 4, 2, 13]]),
  W(b(26), [['xsHoverTank', 4, 3, 0], ['xsAvarian', 8, 1, 5], ['xsGrenadierBot', 2, 4, 9], ['xsRailBot', 2, 4, 13]]),
  W(b(27), [['xsCrusaderLord', 1, 0, 0], ['xsCourier', 2, 4, 4], ['xsEliteConjuror', 2, 5, 8], ['xsM202Bot', 2, 4, 12]]),
  W(b(28), [['xsCouncilman', 1, 0, 0], ['xsDarkPriest', 4, 2, 4], ['xsRailBot', 2, 4, 9]], 'BOSS: THE COUNCILMAN! His Portals send more enemies.'),
  W(b(29), [['xsArdent', 12, 0.8, 0], ['xsOfficer', 6, 1.2, 4], ['xsTanuki', 4, 1.5, 9]], 'A lighter wave to rebuild.'),
  W(b(30), [['xsGiantGrenadier', 1, 0, 0], ['xsHoverTank', 4, 3, 4], ['xsAvarian', 6, 1.2, 9], ['xsBombBarrel', 2, 4, 13]], 'MINI-BOSS: the Giant Grenadier Bot! Its grenades cut tower damage.'),
  W(b(31), [['xsCourier', 4, 3, 0], ['xsDarkPriest', 6, 1.5, 4], ['xsEliteConjuror', 2, 5, 9]], 'Air check!'),
  W(b(32), [['xsCrusaderLord', 2, 8, 0], ['xsArdent', 10, 0.8, 4], ['xsCommanderBot2', 2, 6, 9]]),
  W(b(33), [['xsCouncilman2', 1, 0, 0], ['xsAvarian', 8, 1, 4], ['xsHoverTank', 4, 3, 8], ['xsBombBarrel', 3, 3, 13]], '⚖️ The Arbiter speaks: "Prove you are worthy of the Holy City."'),
  W(b(34), [['xsCrusaderLord', 2, 8, 0], ['xsCourier', 3, 4, 4], ['xsArdent', 10, 0.8, 8], ['xsEliteConjuror', 2, 5, 12], ['xsGiantGrenadier', 1, 0, 16]], '⚖️ Last stand: the Arbiter\'s challenge! Save cash for him.'),
  // The Arbiter comes 20 s in, after his challenge.
  W(b(35), [['xsCouncilman2', 1, 0, 0], ['xsDarkPriest', 6, 1.5, 3], ['xsAvarian', 8, 1, 6], ['xsArdent', 10, 0.8, 9], ['xsEliteConjuror', 2, 5, 12], ['xsCommanderBot2', 2, 6, 15], ['xsArbiter', 1, 0, 20]], '⚖️ FINAL BOSS: THE ARBITER comes in 20 seconds. "The winner takes the Holy City."'),
];
// Seconds before the next wave comes anyway (null: not until every enemy is dead). All guesses.
export const CHRISTMAS3_TIMERS = [35, 35, 40, 40, 45, 45, 50, 40, 45, 55, 50, 50, 50, null, 45, 55, 55, 60, 55, 60, null, 45, 60, 60, 60, 60, 60, null, 50, 60, 60, 60, 60, 60, null];
