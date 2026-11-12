// Contract 4, Mysterious Call (2026-11-11 spec): a phone rings in Lantern Hill Cemetery's chapel.
// Answer it and you are in a haunted mansion: a first-person game, 10 waves of ghosts. Pick one of
// 6 classes. Beat wave 10 (the boss) to finish the contract.
// Plain data. The game itself is in call/sim.js (rules, no three.js) and call/game.js (drawing).
// Every number here is a guess (the spec gives none).

// The classes. `fire` is the left mouse button, `alt` the right one.
//   kind 'shot': one bullet that flies (speed), maybe splashing (splash, splashPct of dmg).
//   kind 'pellets': a spread of instant hits (n pellets, spread in radians).
//   kind 'beam': hold to hit the ghost you aim at, dps per second (heat: seconds before it overheats).
//   kind 'melee': a slash in front of you (reach, arc in radians).
//   kind 'vacuum': hold to suck at the nearest ghost in reach, no aiming needed.
export const CLASSES = {
  paintballer: {
    name: 'Paintballer', icon: '🎨', color: '#ff4081',
    desc: 'Fast paintballs that splash a little. Right click: a paint bomb that slows ghosts.',
    hp: 100, speed: 7,
    fire: { kind: 'shot', dmg: 14, rate: 6, speed: 45, splash: 1.5, splashPct: 0.5, size: 0.12 },
    alt: { kind: 'paintBomb', name: 'Paint bomb', cd: 8, dmg: 60, radius: 4, slow: 0.5, slowFor: 3, speed: 18 },
  },
  john: {
    name: 'John', icon: '🧔', color: '#8d6e63',
    desc: 'Just John, with a shotgun. Big hits up close. Right click: shove every ghost in front of you away.',
    hp: 130, speed: 6.5,
    fire: { kind: 'pellets', dmg: 9, n: 8, spread: 0.09, rate: 1.3, range: 20 },
    alt: { kind: 'shove', name: 'Shove', cd: 6, dmg: 25, reach: 6, push: 8, arc: 1.6 },
  },
  lightBeamer: {
    name: 'Light Beamer', icon: '🔦', color: '#ffee58',
    desc: 'Hold to burn ghosts with a long beam of light. Right click: a flash that stuns ghosts you look at.',
    hp: 90, speed: 7,
    fire: { kind: 'beam', dps: 42, range: 24 },
    alt: { kind: 'flash', name: 'Flash', cd: 10, dmg: 30, reach: 12, arc: 1.4, stun: 2.5 },
  },
  ghostbuster: {
    name: 'Ghostbuster', icon: '👻', color: '#ef6c00',
    desc: 'A strong proton stream that slows ghosts, but it overheats. Right click: a trap that holds ghosts.',
    hp: 110, speed: 6.5,
    fire: { kind: 'beam', dps: 62, range: 16, slow: 0.3, heat: 4, cool: 2 },
    alt: { kind: 'trap', name: 'Ghost trap', cd: 14, radius: 3.5, hold: 4, dps: 25, reach: 8 },
  },
  knifer: {
    name: 'Knifer', icon: '🔪', color: '#b0bec5',
    desc: 'Quick and fast-moving. Slash ghosts up close. Right click: throw a knife that goes through ghosts.',
    hp: 85, speed: 9,
    fire: { kind: 'melee', dmg: 45, rate: 2.5, reach: 2.8, arc: 1.3 },
    alt: { kind: 'throw', name: 'Throw knife', cd: 3, dmg: 70, speed: 38, size: 0.15 },
  },
  // Allister: the user's own class. Tanky, a vacuum that aims by itself for small hits, and red
  // candles that heal friends nearby (in this solo game, you).
  allister: {
    name: 'Allister', icon: '🕯️', color: '#c62828',
    desc: 'Tanky, with lots of health. Hold to vacuum the nearest ghost (it aims for you). Right click: a red candle that heals you nearby.',
    hp: 230, speed: 5.5,
    fire: { kind: 'vacuum', dps: 32, range: 12, pull: 1.2, pullTo: 5 },
    alt: { kind: 'candle', name: 'Red candle', cd: 12, heal: 12, radius: 5, lasts: 10, max: 2 },
  },
};
export const CLASS_KEYS = Object.keys(CLASSES);

// The ghosts. hp, speed (m/s), dmg on touch (once a second). They fly through walls.
export const GHOSTS = {
  basic: { name: 'Ghost', hp: 40, speed: 3.2, dmg: 10, size: 1, color: 0xf5f5f5 },
  fast: { name: 'Quick Ghost', hp: 25, speed: 6.5, dmg: 6, size: 0.75, color: 0x90caf9 },
  strong: { name: 'Heavy Ghost', hp: 220, speed: 1.8, dmg: 25, size: 1.6, color: 0xa5d6a7 },
  ranged: { name: 'Spitter', hp: 50, speed: 2.6, dmg: 6, size: 1, color: 0xce93d8, keep: 10, // stays 10 m away (where it can see you)
    shoot: { every: 3, dmg: 8, speed: 12 } },
  explosive: { name: 'Boomer', hp: 35, speed: 4.5, dmg: 0, size: 0.95, color: 0xffab40, blast: { at: 2, radius: 3.5, dmg: 30 } },
  shield: { name: 'Shielded Ghost', hp: 60, speed: 2.8, dmg: 12, size: 1.1, color: 0x80deea, shield: { hp: 80, regenAfter: 4, regen: 20 } },
  boss: { name: 'The Caller', hp: 3200, speed: 2.1, dmg: 30, size: 3, color: 0x7e57c2, boss: true,
    summon: { every: 8, n: 3, kinds: ['basic', 'fast'] }, volley: { every: 5, n: 7, dmg: 12, speed: 13, spread: 0.9 }, rage: { at: 0.5, speed: 1.5 } },
};

export const CALL = {
  // Each wave: [ghost, count] groups, spawned one at a time, mixed. Health grows by hpGrow per wave.
  waves: [
    [['basic', 6]],
    [['basic', 8], ['fast', 4]],
    [['basic', 8], ['fast', 6], ['ranged', 2]],
    [['strong', 2], ['basic', 8], ['explosive', 3]],
    [['shield', 4], ['fast', 8], ['ranged', 3]],
    [['explosive', 6], ['strong', 3], ['basic', 10]],
    [['shield', 6], ['ranged', 5], ['fast', 10]],
    [['strong', 5], ['explosive', 6], ['shield', 4], ['basic', 10]],
    [['basic', 12], ['fast', 12], ['strong', 4], ['ranged', 6], ['explosive', 6], ['shield', 6]],
    [['boss', 1], ['basic', 6], ['fast', 6]],
  ],
  hpGrow: 0.08, // wave w's ghosts have 1 + 0.08 x (w - 1) times their health
  gap: 0.8, // seconds between ghosts appearing
  maxAlive: 12, // no more than this many at once (the rest wait)
  firstWait: 6, // seconds before wave 1
  between: 8, // seconds between waves
  healBetween: 0.3, // a cleared wave heals this much of your health
  regen: { after: 2.5, rate: 8 }, // 2.5 s without getting hurt: you heal 8 health a second
};
