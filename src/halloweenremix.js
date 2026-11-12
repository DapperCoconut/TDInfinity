// Halloween Remix (2026-11-11, the Battle Pass's last reward): 50 waves with every Halloween enemy.
// No new enemies: each Remix wave mixes one wave from each of the three Halloween nights, taken at
// the same point of the way through (Remix wave 25 = about halfway through every night). The three
// final bosses get their own waves: JACK on 30, the RINGMASTER on 40, the DRAKOBLOXXER on 50.
//
// The health each night gives an enemy (its hpCurve) is baked in here as an exact health, so the
// Remix needs no curve of its own. Every number here is a guess (see the memory notes).
// config.js calls buildRemix once the modes exist (it would be a loop to import config.js here).
import { ENEMIES } from './enemies.js';

const LEN = 50;
/** Each night's share of a mixed wave: half of its counts (at least 1). */
const SHARE = 0.5;
/** Final boss waves: Remix wave number -> the night whose last wave's boss comes. */
const FINALS = { 30: 0, 40: 1, 50: 2 };

/** Group `g` of night `n`'s wave `i`, with that night's health baked in and `share` of its count. */
function bake(NIGHTS, hpCurve, n, i, [type, count, gap, delay], share) {
  const def = ENEMIES[type];
  const hp = Math.round(def.hp * hpCurve(NIGHTS[n], i, def.boss));
  return [type, Math.max(1, Math.round(count * share)), gap, delay, hp];
}

/** The 50 waves, from `NIGHTS` (the three nights' modes, see modeFor) and config.js's hpCurve. */
export function buildRemix(NIGHTS, hpCurve) {
  const waves = [];
  for (let w = 1; w <= LEN; w++) {
    const p = (w - 1) / (LEN - 1);
    const groups = [];
    let bonus = 0;
    NIGHTS.forEach((night, n) => {
      const i = Math.round(p * (night.waves.length - 2)); // never the last wave (its final boss): see FINALS
      groups.push(...night.waves[i].groups.map((g) => bake(NIGHTS, hpCurve, n, i, g, SHARE)));
      bonus += night.waves[i].bonus;
    });
    const f = FINALS[w];
    let note;
    if (f != null) {
      const night = NIGHTS[f];
      const last = night.waves.length - 1;
      groups.push(bake(NIGHTS, hpCurve, f, last, [night.boss, 1, 0, 15], 1)); // the night's final boss
      note = `FINAL BOSS WAVE: ${ENEMIES[night.boss].barName ?? ENEMIES[night.boss].name}!`;
    }
    if (w === 1) note = 'Halloween Remix! 50 waves with every Halloween enemy, and all three final bosses on waves 30, 40 and 50.';
    waves.push({ bonus: Math.round(bonus * SHARE), groups, ...(note ? { note } : {}) });
  }
  return waves;
}
