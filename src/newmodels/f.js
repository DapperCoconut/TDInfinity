import * as THREE from 'three';
import { boxGeo, part, makeHumanoid, makeThing, glow, glowThing, holdLongGun, setMuzzle, gunMuzzle } from '../models.js';

// New towers and units (set F). Tower makers take the level index (0-4, 0 = as placed).
// Helpers from models.js are only called inside functions (models.js imports this file, so
// the imports are not ready at module load time). Characters face +Z; the character's right is -X.

/* ------------------------------------------------------------------ helpers */

/* ------------------------------------------------------------------ towers */

/* ------------------------------------------------------------------ units */

/** Volt Point: a small glowing electric pylon placed on the path (doesn't move). */
function voltPoint() {
  const u = makeThing();
  u.wheels = [];
  const { M } = u;
  part(u.body, boxGeo(1.1, 0.35, 1.1), M(0x757575), 0, 0.18, 0);
  part(u.body, boxGeo(0.7, 0.25, 0.7), M(0x616161), 0, 0.47, 0);
  part(u.body, boxGeo(0.3, 1.0, 0.3), M(0x424242), 0, 1.05, 0);
  for (let i = 0; i < 3; i++) part(u.body, boxGeo(0.5, 0.08, 0.5), M(0xb87333), 0, 0.75 + i * 0.25, 0);
  part(u.body, boxGeo(0.45, 0.45, 0.45), glowThing(u, 0xffee58), 0, 1.75, 0).rotation.set(0.6, 0.6, 0);
  const arc = glowThing(u, 0xfff9c4);
  for (const s of [-1, 1]) part(u.body, boxGeo(0.06, 0.4, 0.06), arc, s * 0.3, 1.85, 0).rotation.z = s * 0.6;
  gunMuzzle(u, u.body, 0, 1.8, 0);
  u.height = 2.0;
  u.tracer = 0xffee58;
  return u;
}

/* ------------------------------------------------------------------ exports */

export const TOWER_MODELS_F = {
};

export const UNIT_MODELS_F = {
  voltPoint,
};
