// Tower model pieces, file 7. What is left here:
// makeSentry (the Engineer's sentry), makeGrave, makeHologram (summons and props).

import * as THREE from 'three';
import { makeMechTurret } from '../newmodels/e.js';
import { makeEngDevice } from '../newmodels/i.js';
import { boxGeo, makeHumanoid, part, setOpacity } from './kit.js';
import { glow, glowThing, gunMuzzle, helmet, holdLongGun, makeThing, turret } from './bits.js';
import { makeEnemy } from './enemy.js';

// ------------------------------------------------------------------ Necromancer, Engineer, Accelerator

/**
 * Engineer sentry turret on a tripod. tier: 0-1 Sentry, 2-3 Rifle Sentry, 4-5 Minigun Sentry
 * (5 adds a shield), 6 War Machine Sentry with a rocket pod. `turret` turns, `muzzles[0]` fires.
 */
export function makeSentry(tier) {
  if (tier >= 200) return makeEngDevice(tier - 200); // Sentry Engineer devices
  if (tier >= 100) return makeMechTurret(tier - 100); // Mechanic turrets
  const u = makeThing();
  const { M } = u;
  const metal = M(tier >= 6 ? 0x5d4037 : tier >= 4 ? 0x455a64 : tier >= 2 ? 0x556b2f : 0x757575);
  for (const a of [0, 2.1, 4.2]) {
    const leg = part(u.body, boxGeo(0.2, 1.6, 0.2), M(0x424242), Math.sin(a) * 0.6, 0.7, Math.cos(a) * 0.6);
    leg.rotation.set(Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4);
  }
  const t = turret(u, 1.5);
  const big = tier >= 4 ? 1.3 : 1;
  part(t, boxGeo(1.1 * big, 0.8 * big, 1.3 * big), metal, 0, 0.3, 0);
  part(t, boxGeo(0.5, 0.2, 0.1), glow(u, tier >= 6 ? 0xff1744 : 0x76ff03), 0, 0.5 * big, 0.66 * big); // sensor
  const barrel = tier >= 2 ? 1.6 : 1.0;
  if (tier >= 4) {
    for (const x of [-0.18, 0.18]) for (const y of [0.15, 0.45]) part(t, boxGeo(0.14, 0.14, barrel), M(0x212121), x, y, 0.65 * big + barrel / 2);
  } else part(t, boxGeo(0.2, 0.2, barrel), M(0x212121), 0, 0.3, 0.65 + barrel / 2);
  gunMuzzle(u, t, 0, 0.3, 0.65 * big + barrel);
  if (tier >= 5) {
    // Improved Blueprints: a shield plate in front
    const sh = part(t, boxGeo(1.8, 1.2, 0.1), glowThing(u, 0x40c4ff), 0, 0.4, 0.9 * big);
    sh.material.transparent = true;
    sh.material.opacity = 0.45;
  }
  if (tier >= 6) {
    const pod = part(t, boxGeo(0.8, 0.8, 1.2), M(0x3e2723), 0.95, 0.6, 0);
    for (const y of [-0.2, 0.2]) part(pod, boxGeo(0.25, 0.25, 0.06), M(0xff6d00), 0, y, 0.61);
    u.cannon = gunMuzzle(u, t, 0.95, 0.6, 0.7);
    u.muzzles.pop();
  }
  u.tracer = tier >= 6 ? 0xffab40 : tier >= 4 ? 0xffd54f : 0xffe082;
  u.height = 2.8;
  return u;
}

/** Necromancer gravestone. Level 2 is taller with green runes, level 3 dark stone with red ones. */
export function makeGrave(lvl) {
  const u = makeThing();
  const { M } = u;
  const stone = M(lvl >= 3 ? 0x37474f : lvl >= 2 ? 0x78909c : 0x9e9e9e);
  const hgt = lvl >= 2 ? 2.6 : 2;
  part(u.body, boxGeo(2.0, 0.3, 1.4), M(0x5d4037), 0, 0.12, 0.3); // dirt mound
  part(u.body, boxGeo(1.3, hgt, 0.4), stone, 0, hgt / 2, 0);
  part(u.body, boxGeo(0.9, 0.3, 0.42), stone, 0, hgt + 0.1, 0); // rounded top
  const rune = lvl >= 3 ? glowThing(u, 0xff1744) : lvl >= 2 ? glowThing(u, 0x76ff03) : M(0x616161);
  part(u.body, boxGeo(0.15, 0.9, 0.05), rune, 0, hgt * 0.6, 0.22); // cross
  part(u.body, boxGeo(0.6, 0.15, 0.05), rune, 0, hgt * 0.7, 0.22);
  return u;
}

/**
 * Hacker hologram: a converted zombie rebuilt in see-through glowing cyan. It walks like a unit
 * (`walk` legs are swung by the view).
 */
export function makeHologram(def) {
  const h = makeEnemy(def);
  for (const m of h.mats) {
    m.color?.setHex(0x00bcd4);
    if (m.map) m.map = null;
    m.userData.glow = 0x00838f;
    m.emissive?.setHex(0x00838f);
    m.needsUpdate = true;
  }
  setOpacity(h, 0.55);
  h.root.scale.setScalar(def.scale ?? 1);
  if (h.leftLeg && h.rightLeg) h.walk = [h.leftLeg, h.rightLeg];
  if (h.leftArm && h.rightArm) h.leftArm.rotation.x = h.rightArm.rotation.x = -Math.PI / 2; // zombie arms out
  h.muzzles = [];
  h.wheels = [];
  h.height = (def.h ?? 5.2) * (def.scale ?? 1);
  h.holo = true;
  return h;
}

