// Small numbers and helpers the game client files share: camera limits, range ring sizes,
// ability keys and first-person settings.

import { TOWERS } from '../config.js';
import { levelAt } from '../sim/map.js';

// Tower XP: the most XP one tower type can earn each wave (see earnXp).
export const XP_PER_WAVE_CAP = 40;

export const CAM_PITCH_MIN = -0.35; // below 0 the camera sits lower than the player and looks up
export const CAM_GROUND_GAP = 0.3; // how close (world units) the camera may get to the ground
/**
 * Radius of a tower's ring: the flight ring for Aviators, the boost range for support towers,
 * nothing for spawners and Farms, otherwise its (boosted) range.
 */
export function ringRadius(type, level, buff, x = 0, z = 0) {
  const def = TOWERS[type];
  const s = levelAt(def.levels[level], x, z); // Penetrator: more range on a cliff
  if (def.orbit) return def.orbit;
  if (def.heli) return s.patrol; // Pursuit: its patrol zone
  if (s.aura) return s.aura;
  if (def.kind === 'spawner' && s.range) return s.range; // Mercenary Base: where its units roll out
  if (def.kind) return 0;
  return s.range * (buff?.range ?? 1);
}
/** Engineer: its yellow build ring and red deadzone, drawn inside the range ring. */
export function innerRings(type, level) {
  const def = TOWERS[type];
  const s = def.levels[level];
  if (!s.buildRange) return s.minRange ? [{ r: s.minRange, color: 0xff1744 }] : null; // XWM Missile Pods blind spot
  return [{ r: s.buildRange, color: 0xffd600 }, { r: def.minRange || 0, color: 0xff1744 }];
}
export const ABILITY_KEYS = { KeyF: 0, KeyG: 1, KeyH: 2 };
export const EMPTY = new Map();
export const ORDINAL = ['', '1st', '2nd', '3rd', '4th'];

export const ICE_NADE = { color: 0x4fc3f7, size: 0.5, arc: 3.5, glowing: true }; // Frost / Cryo Grenade
export const FPS_SEND_INTERVAL = 1 / 15; // Gatling FPS Mode: how often the aim goes to the sim
export const FPS_LOOK = 0.0025; // mouse look speed (radians per pixel)
