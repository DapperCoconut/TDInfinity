// Halloween Event (2026-11-10 user spec): 10 waves on Lantern Hill Cemetery with its own six
// enemies: Zombie, Mummy, Ghost, and the bosses Reaper, Demon and Jack. The mode itself is
// DIFFICULTIES.halloween in config.js (it always plays the `cemetery` map).
//
// From the spec: health, Reaper summons (3 Zombies every 6 s, no cash), Jack's freeze immunity and
// Pumpkin Throw (towers it hits burn for 42 s: they can't fight, the same `lock` Hardcore's Expired
// Jack uses), Demon slowed 50% by fire, Ghosts hidden and passing through units, wave counts and
// wave rewards, $5,500 start, 100 base health. Those cash numbers are for one of a full server's
// four players, and the health doesn't grow with players, so the cash is a pot shared between
// whoever plays (DIFFICULTIES.halloween.pot) and damage pays cash on top (dmgCash) to afford Jack.
//
// Guesses (the spec doesn't give them): speeds (Average 12, Slow 7.5 / Reaper 6 / Jack 2.4,
// Fast 21: TDS speeds x3 like the other TDS-based modes), kill rewards, base damage, spawn gaps
// and delays, the Pumpkin Throw's range / blast radius / cooldown, and the timers on waves 1-4 and 6.

/** Kill reward (the Insane / Hardcore curve) and base damage from health. */
const reward = (hp) => Math.max(2, Math.round(1.5 * hp ** 0.55));
const dmg = (hp) => Math.max(1, Math.round(hp ** 0.5 / 2));
const E = (name, hp, speed, extra = {}) => ({ name, hp, speed, reward: reward(hp), damage: dmg(hp), scale: 1, ...extra });

// Model notes: every one is the humanoid zombie body (models.js makeZombie) dressed by
// src/newmodels/halloween.js from `hw` (which look) and `hk` (Hardcore outfit pieces).
const NEW = {
  hwZombie: E('Zombie', 25, 12, { skin: 0xb5d6a0, shirt: 0x1f2a4a, pants: 0x18203a, face: 'zombie', hw: 'zombie',
    intro: '🎃 HALLOWEEN! Zombies shamble out of the graves. Survive all 10 waves!' }),
  hwMummy: E('Mummy', 95, 7.5, { skin: 0xd9822b, shirt: 0xd9822b, pants: 0xd9822b, face: 'blank', hw: 'mummy',
    intro: '🧻 Mummies: slow and sturdy, in tight groups that shield whatever walks behind them.' }),
  // Ghosts: hidden, and units can't touch them (noCollide).
  hwGhost: E('Ghost', 85, 12, { skin: 0xf4f6f8, shirt: 0xf4f6f8, pants: 0xf4f6f8, face: 'blank', hw: 'ghost', hidden: true, noCollide: true,
    intro: '👻 Ghosts are HIDDEN: you need hidden detection. They float right through your units.' }),
  hwReaper: E('Reaper', 825, 6, { scale: 1.3, skin: 0x8a8a8a, shirt: 0x141414, pants: 0x141414, face: 'blank', hw: 'reaper', boss: true,
    hk: { robe: 0x141414, eyes: 0xd0d0d0 },
    summon: { type: 'hwZombie', n: 3, every: 6, noCash: true },
    intro: '💀 BOSS: the REAPER! It raises 3 Zombies every 6 seconds. Its Zombies give no cash.' }),
  // Demon: fast; any fire slows it 50% (fireSlow).
  hwDemon: E('Demon', 3700, 21, { scale: 1.4, skin: 0xe53935, shirt: 0x3a1450, pants: 0x2a0e3a, face: 'zombie', hw: 'demon', boss: true, wings: 0x0d0d14, fireSlow: 0.5,
    hk: { horns: 0x1a1a1a, eyes: 0xffea00 },
    intro: '😈 BOSS: the DEMON! Fast enough to run past your defenses. Fire slows it down by half.' }),
  // Jack: the final boss. Can't be frozen; Pumpkin Throw sets towers burning for 42 s.
  hwJack: { name: 'Jack', hp: 120000, speed: 2.4, reward: 0, damage: 1e6, scale: 2.8, skin: 0xd9771f, shirt: 0x1a1a1a, pants: 0x111111, face: 'blank',
    hw: 'jack', boss: true, freezeImmune: true, bar: true, barName: 'JACK', barSub: 'The Pumpkin King of Lantern Hill', jack: true, headRoll: true,
    hk: { pumpkin: 0xff6d00, cape: 0x0d0d0d },
    shots: [{ kind: 'pumpkin', range: 40, radius: 4, dmg: 0, every: 10, flight: 1.4, lock: 42 }],
    intro: '🎃 FINAL BOSS: JACK! His flaming pumpkins set your towers on fire: every tower hit can\'t fight for 42 seconds. He can\'t be frozen.' },
};

export function addHalloweenEnemies(ENEMIES) {
  for (const [k, d] of Object.entries(NEW)) ENEMIES[k] = d;
}

// Wave groups: [type, count, secondsBetween, startDelay]. `bonus`: the wave reward each player gets
// (the spec's numbers for a full 4-player server, paid as they are). Mummies come in tight groups.
export const HALLOWEEN_WAVES = [
  { bonus: 280, groups: [['hwZombie', 6, 1.2, 0]],
    note: 'Halloween Event! 100 base health, 10 waves, and a full server\'s cash shared between you. Waves 5 and 7-10 last until every enemy is dead.' },
  { bonus: 460, groups: [['hwMummy', 7, 0.4, 0]] },
  { bonus: 640, groups: [['hwZombie', 6, 1, 0], ['hwGhost', 8, 0.9, 4]], note: 'Ghosts are coming: they\'re hidden!' },
  { bonus: 780, groups: [['hwZombie', 6, 1, 0], ['hwMummy', 6, 0.4, 4], ['hwGhost', 5, 0.9, 8], ['hwReaper', 1, 0, 12]], note: 'BOSS WAVE: the Reaper!' },
  { bonus: 950, groups: [['hwZombie', 13, 0.7, 0], ['hwGhost', 6, 0.9, 4], ['hwMummy', 6, 0.4, 8], ['hwReaper', 4, 4, 12]],
    note: 'Four Reapers! This wave lasts until every enemy is dead.' },
  { bonus: 1120, groups: [['hwMummy', 6, 0.4, 0], ['hwReaper', 2, 5, 4], ['hwGhost', 24, 0.5, 6]] },
  { bonus: 1290, groups: [['hwZombie', 6, 0.8, 0], ['hwMummy', 3, 0.4, 3], ['hwGhost', 8, 0.7, 5], ['hwReaper', 1, 0, 9], ['hwDemon', 1, 0, 14]],
    note: 'BOSS WAVE: the Demon! Fire slows it down.' },
  { bonus: 1460, groups: [['hwReaper', 3, 4, 0], ['hwZombie', 10, 0.6, 3], ['hwGhost', 12, 0.6, 6], ['hwDemon', 3, 5, 10]] },
  { bonus: 1630, groups: [['hwMummy', 12, 0.4, 0], ['hwZombie', 8, 0.6, 3], ['hwGhost', 32, 0.4, 6], ['hwDemon', 5, 4, 10]] },
  { bonus: 1800, groups: [['hwZombie', 34, 0.4, 0], ['hwMummy', 18, 0.4, 5], ['hwGhost', 39, 0.35, 9], ['hwReaper', 4, 4, 14], ['hwDemon', 8, 3, 20], ['hwJack', 1, 0, 34]],
    note: 'FINAL WAVE. Something big is coming up the hill…' },
];
// Seconds before the next wave comes anyway (null: not until every enemy is dead). Waves 5 and
// 7-10 wait (spec); the others' timers are guesses.
export const HALLOWEEN_TIMERS = [45, 45, 50, 60, null, 60, null, null, null, null];
