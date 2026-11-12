// Christmas Night 1 (2026-11-11 user spec): 20 waves on Frostwatch Basin (map key `frost`), the
// Christmas Event's map (DIFFICULTIES.christmas). The enemies are its own (xm*).
//
// From the spec: every health, speed (already in game units: Average 3), defense, flying / hidden,
// freeze immunity, the Ravager's shield, the unit damage numbers, and what spawns on each wave.
// Guesses (see the memory notes): gaps, delays, timers, wave bonuses, every cooldown, range and
// freeze time, what a Frost Mystery turns into.
// How they act: src/sim/parts/christmas.js. How they look: src/newmodels/christmas.js.

/** Kill reward and base damage from health (the Halloween Event's curve). */
const reward = (hp) => Math.max(2, Math.round(1.5 * hp ** 0.55));
const dmg = (hp) => Math.max(1, Math.round(hp ** 0.5 / 2));
/** An enemy dressed by `xm` (newmodels/christmas.js). */
const E = (name, hp, speed, look, skin, extra = {}) => ({ name, hp, speed, reward: reward(hp), damage: dmg(hp), scale: 1, xm: look, skin, shirt: skin, pants: skin, face: 'blank', ...extra });

const NEW = {
  xmSnowy: E('Snowy', 20, 3, 'snowy', 0xb3e5fc, {
    intro: '🎄 CHRISTMAS NIGHT 1! Commander: "Frost creatures are coming out of the portal. Hold the basin for 20 waves, soldier!"' }),
  xmFrozen: E('Frozen', 25, 4.25, 'frozen', 0x81d4fa),
  xmColdMist: E('Cold Mist', 30, 3.5, 'mist', 0x1a1a2e, { hidden: true, noCollide: true,
    intro: '🌫️ Cold Mists are HIDDEN ghosts. You need hidden detection!' }),
  xmPackedIce: E('Packed Ice', 250, 2.5, 'packed', 0xb2ebf2, { armor: 0.25, scale: 1.15,
    intro: '🧊 Packed Ice has 25% DEFENSE: it takes less damage.' }),
  // Turns into a random enemy when it dies.
  xmMystery: E('Frost Mystery', 50, 5, 'mystery', 0x4fc3f7, {
    deathSpawn: { n: 1, list: ['xmSnowy', 'xmFrozen', 'xmColdMist', 'xmPackedIce', 'xmMinion'] },
    intro: '❓ Frost Mysteries turn into a random enemy when they die!' }),
  xmGolem: E('Snow Golem', 600, 2, 'golem', 0xf5f5f5, { scale: 1.6,
    deathSpawn: { fixed: [['xmMinion', 2]] },
    intro: '⛄ Snow Golems drop 2 Snow Minions when they die.' }),
  xmMinion: E('Snow Minion', 250, 4, 'golem', 0xeceff1, { scale: 0.85 }),
  // Flash Freeze when it dies: every tower close by is frozen, units take 80 damage.
  xmUnstable: E('Unstable Ice', 200, 4, 'unstable', 0x00e5ff, {
    flashFreeze: { radius: 22, freeze: 3, unitDmg: 80 },
    intro: '💥 Unstable Ice FLASH FREEZES the towers around it when it dies!' }),
  xmDeepFreeze: E('Deep Freeze', 5000, 2, 'deep', 0xe1f5fe, { armor: 0.5, freezeImmune: true, scale: 1.7,
    intro: '🥶 Deep Freeze has 50% DEFENSE and can\'t be frozen.' }),
  xmInvader: E('Frost Invader', 3000, 4, 'invader', 0xeceff1, { freezeImmune: true,
    intro: '👁️ Frost Invaders are tough and fast, and can\'t be frozen.' }),
  // Mini-boss. 50% defense while its shield is up; the shield pays no cash (damage to shields never does).
  xmRavager: E('Frost Ravager', 20000, 2, 'ravager', 0x81d4fa, { osh: 15000, oshCurve: true, shieldArmor: 0.5, freezeImmune: true, scale: 1.9, boss: true,
    intro: '🛡️ MINI-BOSS: FROST RAVAGER! While its ice shield is up it has 50% defense.' }),
  xmAngel: E('Crying Angel', 500, 5, 'angel', 0x616161, { flying: true,
    intro: '👼 Crying Angels FLY. You need towers that hit air.' }),
  // Mini-boss. Tundra Slam stuns the towers around him; Frost Hand freezes a tower and hurts units.
  xmHero: E('Frost Hero', 80000, 1.5, 'hero', 0x212121, { freezeImmune: true, scale: 1.9, boss: true, bar: true, barName: 'FROST HERO',
    slam: { range: 13, every: 15, stun: 2.5 },
    frostHand: { every: 18, range: 35, radius: 7, freeze: 4, unitDmg: 300 },
    intro: '⚔️ MINI-BOSS: FROST HERO! His Tundra Slam stuns, his Frost Hand freezes towers.' }),
  // Mini-boss. Raises his staff: 4 Snow Minions.
  xmNecro: E('Frost Necromancer', 35000, 1.5, 'necro', 0x111111, { scale: 1.8, boss: true, bar: true, barName: 'FROST NECROMANCER',
    summon: { type: 'xmMinion', n: 4, every: 14, noCash: true },
    intro: '💀 MINI-BOSS: FROST NECROMANCER! He raises Snow Minions. Those give no cash.' }),

  // Final boss. Immune to stun, freeze, burn and energy (shock).
  xmSpirit: E('Frost Spirit', 1000000, 1.25, 'spirit', 0x0d0d0d, { scale: 2.8, boss: true, bar: true, barName: 'THE FROST SPIRIT',
    stunImmune: true, freezeImmune: true, fireImmune: true, shockImmune: true, thaw: true,
    frostSpirit: {
      column: { every: 20, length: 45, width: 7, freeze: 4 }, // Frostbite Slam: a line of ice in front of it
      stomp: { every: 26, radius: 18, amt: 0.6, time: 8 }, // Nausea Stomp: 150% fatigue (towers fire at 1/2.5 speed)
      mist: { every: 32, range: 22, freeze: 3, unitDmg: 450, ticks: 3 }, // Antarctic Mist: 450 a tick to units
      fly: { at: 0.5, speed: 2.5 }, // Flying Frost: hovers and speeds up to below average
    },
    intro: '❄️ BOSS: THE FROST SPIRIT! "It\'s do or die!" It freezes towers, slows them, and its mist shreds units.' }),
};

export function addChristmasEnemies(ENEMIES) {
  for (const [k, d] of Object.entries(NEW)) ENEMIES[k] = d;
}

// Wave groups: [type, count, secondsBetween, startDelay, opts?]. opts.route: the lane it walks
// (0 Far Left, 1 Middle Left, 2 Middle Right, 3 Far Right); without one, spawns take turns.
// The counts are the spec's; gaps, delays, bonuses and timers are guesses. `bonus` is one of four
// players' share (the event's pot).
const W = (bonus, groups, note) => ({ bonus, groups, ...(note ? { note } : {}) });
const b = (n) => 250 + (n - 1) * 80;
const lane = (route) => ({ route });
export const CHRISTMAS_WAVES = [
  W(b(1), [['xmSnowy', 6, 1.2, 0]], 'Christmas Night 1! Commander: "Here they come. Build up your defenses!"'),
  W(b(2), [['xmSnowy', 9, 1, 0]]),
  W(b(3), [['xmSnowy', 6, 1, 0], ['xmFrozen', 4, 1, 4]], 'Frozen are a bit faster.'),
  W(b(4), [['xmSnowy', 6, 0.9, 0], ['xmFrozen', 6, 0.9, 4]]),
  W(b(5), [['xmFrozen', 6, 1, 0], ['xmColdMist', 4, 1.2, 4]], 'Cold Mists are HIDDEN!'),
  W(b(6), [['xmSnowy', 8, 0.8, 0], ['xmColdMist', 6, 1, 3], ['xmFrozen', 4, 1, 8]]),
  W(b(7), [['xmFrozen', 8, 0.8, 0], ['xmPackedIce', 2, 3, 5]], 'Packed Ice has defense.'),
  W(b(8), [['xmMystery', 5, 1.2, 0], ['xmSnowy', 6, 0.8, 4], ['xmColdMist', 4, 1, 8]], 'Frost Mysteries turn into something else when they die.'),
  W(b(9), [['xmMystery', 12, 0.8, 0], ['xmFrozen', 6, 0.8, 5], ['xmPackedIce', 2, 3, 10]]),
  W(b(10), [['xmGolem', 2, 4, 0], ['xmFrozen', 6, 0.8, 3], ['xmColdMist', 4, 1, 7], ['xmPackedIce', 2, 3, 11]], 'Snow Golems! They drop Snow Minions.'),
  W(b(11), [['xmGolem', 2, 4, 0], ['xmUnstable', 3, 2, 4], ['xmDeepFreeze', 1, 0, 10]], 'Unstable Ice freezes towers when it dies!'),
  W(b(12), [['xmGolem', 3, 3, 0], ['xmUnstable', 4, 2, 4], ['xmDeepFreeze', 1, 0, 12]]),
  W(b(13), [['xmGolem', 4, 3, 0], ['xmUnstable', 5, 1.5, 4], ['xmDeepFreeze', 1, 0, 12]]),
  W(b(14), [['xmInvader', 1, 0, 0, lane(0)], ['xmInvader', 1, 0, 0.5, lane(1)], ['xmInvader', 1, 0, 1, lane(2)], ['xmInvader', 1, 0, 1.5, lane(3)]], 'Frost Invaders on every lane!'),
  W(b(15), [['xmInvader', 4, 0.6, 0], ['xmInvader', 4, 0.6, 6], ['xmInvader', 4, 0.6, 12], ['xmInvader', 4, 0.6, 18]]),
  W(b(16), [['xmInvader', 10, 1.2, 0], ['xmRavager', 1, 0, 6]], 'MINI-BOSS: the Frost Ravager and its ice shield!'),
  W(b(17), [['xmInvader', 10, 1, 0], ['xmRavager', 1, 0, 6]]),
  W(b(18), [['xmInvader', 10, 0.9, 0], ['xmRavager', 1, 0, 5]]),
  W(b(19), [['xmAngel', 2, 1.5, 0], ['xmInvader', 4, 1, 3], ['xmNecro', 1, 0, 6, lane(0)], ['xmHero', 1, 0, 9, lane(2)], ['xmRavager', 1, 0, 12, lane(1)], ['xmRavager', 1, 0, 14, lane(3)]], 'MINI-BOSSES: the Frost Necromancer and the Frost Hero!'),
  W(b(20), [['xmSpirit', 1, 0, 0, lane(1)], ['xmAngel', 4, 1.5, 4], ['xmNecro', 1, 0, 10, lane(0)], ['xmRavager', 2, 6, 16], ['xmNecro', 1, 0, 24, lane(3)], ['xmHero', 1, 0, 30, lane(2)], ['xmAngel', 4, 1.5, 36]], 'FINAL WAVE: the FROST SPIRIT! It\'s do or die!'),
];
// Seconds before the next wave comes anyway (null: not until every enemy is dead). All guesses.
export const CHRISTMAS_TIMERS = [35, 35, 40, 40, 45, 45, 45, 50, 50, 55, 55, 55, 60, 60, 60, null, null, null, null, null];
