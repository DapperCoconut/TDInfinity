// Tower models, file 5 of 12. Each makeX(level) builds one tower's look.
// In here:
// Pyromancer, Ace Plane, Aviator Ace, Medic, Medic Beam, EDJ, Electro,
// Rocketeer Missile, Rocketeer Trooper, Trapper, Mine Layer.
// The list of which tower uses which builder is TOWER_MODELS in ../models.js.

import * as THREE from 'three';
import { boxGeo, makeHumanoid, part } from './kit.js';
import { cylGeo, glow, helmet, holdLongGun, makeThing, setMuzzle } from './bits.js';

/**
 * Pyromancer (alternate Flamethrower form): a firefighter-turned-arsonist in a red coat.
 * Lv 2 a respirator and fuel tank, Lv 3 hazard stripes and a second tank, Lv 4 a heavy suit,
 * Lv 5 a blazing horned helmet and glowing napalm tanks.
 */
export function makePyromancer(level) {
  const maniac = level >= 4;
  const coat = maniac ? 0x3e2723 : 0xb71c1c;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: coat, pants: 0x212121, arms: coat, face: 'soldier' });
  const { M } = h;
  const fire = 0xff6d00;
  part(h.head, boxGeo(1.45, 0.55, 1.45), M(maniac ? 0x212121 : 0xfdd835), 0, 1.3, 0); // fire helmet
  part(h.head, boxGeo(1.6, 0.12, 1.7), M(maniac ? 0x212121 : 0xfdd835), 0, 1.05, -0.1); // brim
  if (maniac) for (const x of [-0.6, 0.6]) part(h.head, boxGeo(0.2, 0.7, 0.2), glow(h, fire), x, 1.8, 0); // horns
  if (level >= 1) {
    part(h.head, boxGeo(0.6, 0.55, 0.4), M(0x37474f), 0, 0.35, 0.75); // respirator
    part(h.head, boxGeo(1.2, 0.35, 0.08), M(0xffa000), 0, 0.8, 0.66); // visor
  }
  if (level >= 2) for (const y of [-0.5, 0.3]) part(h.torso, boxGeo(2.08, 0.18, 1.08), M(0xffeb3b), 0, y, 0); // hazard stripes
  const tank = maniac ? glow(h, fire) : M(0xc62828);
  const tanks = level >= 2 ? [-0.45, 0.45] : [0];
  for (const x of tanks) part(h.torso, boxGeo(0.7, 2.0, 0.7), tank, x, 0.2, -0.85);
  if (level >= 3) part(h.torso, boxGeo(2.2, 1.0, 1.2), M(0x5d4037), 0, 0.6, 0); // heavy suit shoulders
  const g = new THREE.Group();
  g.position.set(0, -1.9, 0);
  h.rightArm.add(g);
  part(g, boxGeo(0.4, 1.5, 0.45), M(0x424242), 0, -0.75, 0);
  part(g, boxGeo(0.55, 0.3, 0.55), M(0x212121), 0, -1.55, 0);
  part(g, boxGeo(0.15, 0.15, 0.15), glow(h, fire), 0, -1.75, 0.2); // pilot light
  setMuzzle(h, g, 0, -1.85, 0);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.15, 0, -0.5);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.15, leftRecoil: 0.05 };
  h.recoilScale = 0.1;
  return h;
}

/** The Ace Pilot's plane (faces +Z): a yellow racer, a blue warbird, a grey jet from Lv 4, a gold jet at Lv 5. */
export function makeAcePlane(h, level) {
  const { M } = h;
  const plane = new THREE.Group();
  const bank = new THREE.Group();
  plane.add(bank);
  const muzzles = [];
  const muzzle = (x, y, z) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    bank.add(m);
    muzzles.push(m);
  };
  let prop = null;
  if (level <= 2) {
    const body = M(level >= 2 ? 0x1565c0 : 0xfbc02d);
    const trim = M(level >= 2 ? 0xfafafa : 0x212121);
    part(bank, boxGeo(1.1, 1.1, 4.4), body, 0, 0, 0);
    part(bank, boxGeo(6, 0.2, 1.3), body, 0, -0.2, 0.5); // wings
    for (const x of [-2.2, 2.2]) part(bank, boxGeo(0.6, 0.22, 1.32), trim, x, -0.2, 0.5); // wing tips
    part(bank, boxGeo(2.2, 0.15, 0.8), body, 0, 0.1, -1.9);
    part(bank, boxGeo(0.15, 1.0, 0.9), trim, 0, 0.65, -1.9);
    part(bank, boxGeo(0.8, 0.45, 1.0), M(0x90caf9), 0, 0.7, 0.4);
    part(bank, boxGeo(0.7, 0.7, 0.4), M(0xc62828), 0, 0, 2.3); // red nose
    prop = new THREE.Group();
    prop.position.set(0, 0, 2.55);
    bank.add(prop);
    part(prop, boxGeo(0.3, 2.4, 0.1), M(0x3e2723), 0, 0, 0);
    if (level >= 1) for (const x of [-1.8, 1.8]) part(bank, boxGeo(0.4, 0.4, 0.9), M(0x263238), x, -0.55, 0.5); // bombs
    muzzle(-0.8, -0.2, 1.4);
    muzzle(0.8, -0.2, 1.4);
  } else {
    const gold = level >= 4;
    const body = M(gold ? 0xffc107 : 0x78909c);
    const dark = M(gold ? 0x5d4037 : 0x37474f);
    part(bank, boxGeo(1.0, 0.9, 5.4), body, 0, 0, 0);
    part(bank, boxGeo(0.55, 0.55, 1.0), dark, 0, -0.05, 3.1);
    part(bank, boxGeo(0.75, 0.45, 1.3), M(0x4fc3f7), 0, 0.55, 1.1);
    for (const side of [-1, 1]) {
      const w = part(bank, boxGeo(3.0, 0.15, 1.8), body, side * 1.8, -0.1, -0.3);
      w.rotation.y = side * 0.5;
      part(bank, boxGeo(0.12, 1.1, 1.0), dark, side * 0.45, 0.75, -2.3).rotation.z = side * -0.3;
      part(bank, boxGeo(0.35, 0.35, 1.1), M(0x263238), side * 1.6, -0.45, 0.1); // bomb rack
    }
    part(bank, boxGeo(0.7, 0.7, 0.3), glow(h, gold ? 0xff3d00 : 0xff9100), 0, 0, -2.8);
    if (level >= 3) part(bank, boxGeo(0.5, 0.4, 0.5), glow(h, 0x00e5ff), 0, -0.6, 1.4); // spy camera
    muzzle(-0.55, -0.2, 2.4);
    muzzle(0.55, -0.2, 2.4);
  }
  const bay = new THREE.Object3D();
  bay.position.set(0, -0.8, 0);
  bank.add(bay);
  plane.userData = { bank, prop, bay, missiles: [] };
  return { plane, muzzles };
}

/** Ace Pilot (alternate Aviator form): a flying ace in a bomber jacket, flight helmet from Lv 3. */
export function makeAviatorAce(level) {
  const jet = level >= 2;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: 0x8d5524, pants: 0x3e4a5a, arms: 0x8d5524 });
  const { M } = h;
  if (jet) {
    part(h.head, boxGeo(1.45, 1.4, 1.45), M(level >= 4 ? 0xffc107 : 0x546e7a), 0, 0.65, -0.03);
    part(h.head, boxGeo(1.2, 0.45, 0.08), M(0xff7043), 0, 0.7, 0.7);
  } else {
    const cap = M(0x4e342e);
    part(h.head, boxGeo(1.35, 0.6, 1.35), cap, 0, 1.0, -0.02);
    part(h.head, boxGeo(1.3, 0.12, 0.1), M(0x3e2723), 0, 1.05, 0.66);
    for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.4, 0.3, 0.08), M(0xffe082), x, 1.05, 0.7);
  }
  part(h.torso, boxGeo(2.15, 0.45, 1.15), M(0xefebe9), 0, 0.85, 0); // fur collar
  if (level >= 1) part(h.torso, boxGeo(0.5, 0.5, 0.1), M(0xffd54f), -0.5, 0.2, 0.52); // ace badge
  if (level >= 3) part(h.head, boxGeo(0.08, 0.9, 0.08), M(0x212121), -0.7, 1.6, -0.2); // radio antenna
  // A small runway pad with stripes.
  part(h.root, boxGeo(3.6, 0.08, 1.0), M(0x424242), 0, 0.04, -1.6);
  for (const x of [-1.2, 0, 1.2]) part(h.root, boxGeo(0.6, 0.1, 0.2), M(0xfafafa), x, 0.06, -1.6);
  h.rightArm.rotation.set(Math.PI * 0.85, 0, 0.25);
  h.pose = { right: Math.PI * 0.85, left: 0, leftRecoil: 0 };
  const { plane, muzzles } = makeAcePlane(h, level);
  h.plane = plane;
  h.muzzles = muzzles;
  h.flyHeight = 12;
  h.tracer = level >= 4 ? 0xffab40 : 0xffe082;
  return h;
}

/**
 * Medic: a field medic in a white coat with a medi gun. Lv 2 a med bag, Lv 3 a big-brain
 * headset, Lv 4 a backpack tank, Lv 5 a gold-trimmed coat. Draws beams to shielded towers.
 */
export function makeMedic(level) {
  const doc = level >= 4;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: 0xfafafa, pants: doc ? 0x1a237e : 0x546e7a, arms: 0xfafafa, face: 'smile' });
  const { M } = h;
  const red = M(0xd32f2f);
  // Red cross on the chest and the cap.
  part(h.torso, boxGeo(0.7, 0.22, 0.06), red, 0.4, 0.4, 0.52);
  part(h.torso, boxGeo(0.22, 0.7, 0.06), red, 0.4, 0.4, 0.52);
  part(h.head, boxGeo(1.32, 0.4, 1.32), M(0xfafafa), 0, 1.25, 0);
  part(h.head, boxGeo(0.4, 0.12, 0.06), red, 0, 1.3, 0.67);
  part(h.head, boxGeo(0.12, 0.4, 0.06), red, 0, 1.3, 0.67);
  if (level >= 1) {
    part(h.torso, boxGeo(0.8, 0.8, 0.9), M(0xc62828), -1.2, -0.8, 0); // med bag
    part(h.torso, boxGeo(0.2, 2.3, 1.12), M(0x5d4037), 0, 0.1, 0).rotation.z = 0.6;
  }
  if (level >= 2) {
    part(h.head, boxGeo(1.5, 0.15, 0.15), M(0x212121), 0, 1.0, 0); // headset band
    part(h.head, boxGeo(0.45, 0.45, 0.2), glow(h, 0xff4081), 0, 1.65, 0); // brain light
  }
  if (level >= 3) {
    part(h.torso, boxGeo(1.2, 1.8, 0.7), M(0xb0bec5), 0, 0.1, -0.85); // medi tank
    part(h.torso, boxGeo(0.8, 1.2, 0.1), glow(h, 0xff5252), 0, 0.1, -1.22);
  }
  if (doc) for (const x of [-1.03, 1.03]) part(h.torso, boxGeo(0.1, 2, 1.05), M(0xffd54f), x, 0, 0); // gold trim
  const gun = holdLongGun(h, 1.3, M(0xeceff1));
  part(gun, boxGeo(0.45, 0.45, 0.5), red, 0, -0.5, 0.05);
  part(gun, boxGeo(0.3, 0.3, 0.3), glow(h, 0xff8a80), 0, -1.35, 0);
  h.muzzles[0].position.y = -1.45;
  h.medi = 0xff8a80;
  h.tracer = 0xff8a80;
  return h;
}

/**
 * Medigun Medic (alternate Medic form): a medic in a red coat with a backpack tank and a medigun.
 * Top path: the tank and gun grow, then glow blue (Uber). Bottom path: a longer nozzle and an
 * antenna, then a red glow (Kritz). A purple Dimension Shard emblem marks it.
 */
export function makeMedicBeam(level, bottom = false) {
  const charged = level >= 4;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: 0xb71c1c, pants: 0x37474f, arms: 0xfafafa, face: 'smile' });
  const { M } = h;
  const white = M(0xfafafa);
  const accent = charged ? (bottom ? 0xff1744 : 0x448aff) : 0xff8a80;
  // White cross on the coat, glasses and slicked-back hair.
  part(h.torso, boxGeo(0.7, 0.22, 0.06), white, 0.4, 0.4, 0.52);
  part(h.torso, boxGeo(0.22, 0.7, 0.06), white, 0.4, 0.4, 0.52);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.5, 0.45, 0.52);
  part(h.head, boxGeo(1.3, 0.35, 1.3), M(0x3e2723), 0, 1.2, -0.05);
  part(h.head, boxGeo(1.1, 0.2, 0.08), M(0x90a4ae), 0, 0.55, 0.66);
  // Backpack tank, bigger on the Top path.
  const tank = !bottom ? [1, 1.1, 1.2, 1.35, 1.5, 1.7][level] : 1;
  part(h.torso, boxGeo(1.2 * tank, 1.8 * tank, 0.7), M(0x78909c), 0, 0.1, -0.85);
  part(h.torso, boxGeo(0.8 * tank, 1.2 * tank, 0.1), glow(h, accent), 0, 0.1, -1.22);
  if (level >= 2) part(h.torso, boxGeo(0.3, 0.3, 1.0), M(0x212121), 0.75, 0.6, -0.4); // hose
  if (bottom && level >= 3) {
    // Longer Range: an antenna on the backpack
    part(h.torso, boxGeo(0.12, 2.2, 0.12), M(0x9e9e9e), -0.4, 1.9, -0.85);
    part(h.torso, boxGeo(0.3, 0.3, 0.3), glow(h, accent), -0.4, 3.05, -0.85);
  }
  if (charged) for (const x of [-1.03, 1.03]) part(h.torso, boxGeo(0.1, 2, 1.05), glow(h, accent), x, 0, 0);
  if (!bottom && level >= 5) part(h.head, boxGeo(1.5, 0.15, 1.5), glow(h, 0x82b1ff), 0, 1.5, 0); // Max Uber halo
  const gun = holdLongGun(h, bottom ? 1.3 + level * 0.12 : 1.3, M(0xeceff1));
  part(gun, boxGeo(0.5, 0.5, 0.55), M(0xc62828), 0, -0.5, 0.05);
  part(gun, boxGeo(0.32, 0.32, 0.32), glow(h, accent), 0, -1.35 - (bottom ? level * 0.12 : 0), 0);
  h.muzzles[0].position.y = -1.45 - (bottom ? level * 0.12 : 0);
  h.medi = 0xff8a80;
  h.tracer = 0xff8a80;
  return h;
}
export const makeMedicBeamBottom = (level) => makeMedicBeam(level, true);

/**
 * EDJ (alternate DJ form): a DJ with a light-up visor behind a small neon deck. Top path: more
 * speakers and stage lights (gold at Showdown). Bottom path: a "$" sign, then a costume cape
 * (Cosplay Party) and rave lights (DJ Rave). A purple Dimension Shard emblem marks her.
 */
export function makeEDJ(level, bottom = false) {
  const neon = bottom ? 0x69f0ae : 0x00e5ff;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: bottom && level >= 4 ? 0x4a148c : 0x263238, pants: 0x212121, arms: 0xe0ac69, face: 'smile' });
  const { M } = h;
  // Long hair, headphones and a glowing visor.
  part(h.head, boxGeo(1.35, 0.45, 1.35), M(0xd81b60), 0, 1.2, -0.02);
  part(h.head, boxGeo(1.3, 1.2, 0.35), M(0xd81b60), 0, 0.5, -0.65);
  for (const x of [-0.7, 0.7]) part(h.head, boxGeo(0.25, 0.55, 0.55), M(0x212121), x, 0.6, 0);
  part(h.head, boxGeo(1.2, 0.25, 0.08), glow(h, neon), 0, 0.75, 0.66);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.5, 0.45, 0.52);
  // A small deck with one turntable and a neon strip.
  part(h.root, boxGeo(2.6, 2.2, 1.0), M(0x1c1c24), 0, 1.1, 1.5);
  part(h.root, boxGeo(1.0, 0.12, 0.9), M(0x111111), -0.6, 2.26, 1.5);
  part(h.root, boxGeo(0.3, 0.14, 0.3), glow(h, neon), -0.6, 2.32, 1.5);
  part(h.root, boxGeo(0.8, 0.16, 0.7), M(0x424242), 0.7, 2.28, 1.5);
  part(h.root, boxGeo(2.5, 0.2, 0.06), glow(h, neon), 0, 1.5, 2.02);
  // Speakers, more and taller on the Top path.
  const sp = !bottom ? [1.2, 1.6, 1.8, 2.2, 2.5, 2.9][level] : 1.2 + level * 0.15;
  for (const x of [-1, 1]) {
    part(h.root, boxGeo(0.9, sp, 0.9), M(0x111111), x * 1.9, sp / 2, 0.8);
    part(h.root, boxGeo(0.55, 0.55, 0.06), glow(h, neon), x * 1.9, sp * 0.65, 1.26);
  }
  if (!bottom && level >= 3) {
    // Rally Call: stage lights on poles
    const lightC = level >= 5 ? 0xffd54f : neon;
    for (const x of [-2.6, 2.6]) {
      part(h.root, boxGeo(0.18, 5, 0.18), M(0x9e9e9e), x, 2.5, 0.2);
      part(h.root, boxGeo(0.5, 0.4, 0.5), glow(h, lightC), x, 5.1, 0.2);
    }
  }
  if (bottom && level >= 3) {
    // Budget Costs: a gold "$" sign on the deck
    part(h.root, boxGeo(0.16, 0.7, 0.06), glow(h, 0xffd54f), 0, 0.9, 2.04);
    for (const y of [0.65, 0.9, 1.15]) part(h.root, boxGeo(0.5, 0.11, 0.06), glow(h, 0xffd54f), 0, y, 2.05);
  }
  if (bottom && level >= 4) part(h.torso, boxGeo(1.8, 2.2, 0.12), M(0x7b1fa2), 0, -0.3, -0.62); // Cosplay Party: a cape
  if (bottom && level >= 5) for (const x of [-1.2, 0, 1.2]) part(h.root, boxGeo(0.35, 0.35, 0.35), glow(h, [0xff1744, 0x76ff03, 0x2979ff][x / 1.2 + 1]), x, 6, 0.4);
  h.rightArm.rotation.set(-1.3, 0, 0.2);
  h.leftArm.rotation.set(-1.3, 0, -0.2);
  h.pose = { right: -1.3, left: -1.3, leftRecoil: 0 };
  h.bob = 0.18;
  h.muzzles = [];
  return h;
}
export const makeEDJBottom = (level) => makeEDJ(level, true);


/**
 * Electroshocker: a lineman with a shock gun and coil pack. Lv 2 rubber gloves and goggles,
 * Lv 3 a Faraday vest, Lv 4 a big Tesla coil pack, Lv 5 a crackling Zeus cannon.
 */
export function makeElectro(level) {
  const zeus = level >= 4;
  const shirt = zeus ? 0x1a237e : 0xf9a825;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x37474f, arms: level >= 1 ? 0x212121 : shirt, face: 'soldier' });
  const { M } = h;
  const bolt = zeus ? 0xe1f5fe : 0x80d8ff;
  helmet(h, zeus ? 0x283593 : 0xfdd835);
  if (level >= 1) {
    part(h.head, boxGeo(1.25, 0.3, 0.12), M(0x263238), 0, 0.8, 0.63);
    part(h.head, boxGeo(1.0, 0.18, 0.06), glow(h, bolt), 0, 0.8, 0.7);
  }
  if (level >= 2) {
    // Faraday's Vest: a metal mesh vest
    part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x90a4ae), 0, 0.05, 0);
    for (const y of [-0.5, 0, 0.5]) part(h.torso, boxGeo(2.18, 0.06, 1.18), M(0x546e7a), 0, y, 0);
  }
  // Coil pack on the back, taller each level.
  const coil = level >= 3 ? 2.6 : 1.6;
  part(h.torso, boxGeo(1.0, coil, 0.7), M(0x455a64), 0, 0.2 + (coil - 1.6) / 2, -0.85);
  for (let i = 0; i < (level >= 3 ? 4 : 2); i++) part(h.torso, boxGeo(1.2, 0.15, 0.85), M(0xb87333), 0, -0.3 + i * 0.6, -0.85);
  part(h.torso, boxGeo(0.4, 0.4, 0.4), glow(h, bolt), 0, 0.4 + coil, -0.85);
  const gun = holdLongGun(h, zeus ? 1.9 : 1.4, M(zeus ? 0x283593 : 0x424242));
  part(gun, boxGeo(0.5, 0.5, 0.5), M(0xb87333), 0, -0.5, 0); // copper coil
  part(gun, boxGeo(zeus ? 0.6 : 0.4, 0.3, zeus ? 0.6 : 0.4), glow(h, bolt), 0, zeus ? -1.9 : -1.4, 0);
  if (zeus) for (const s of [-1, 1]) part(gun, boxGeo(0.12, 0.8, 0.12), glow(h, bolt), s * 0.35, -1.6, 0);
  h.tracer = bolt;
  return h;
}

/**
 * Missile Rocketeer (alternate Rocketeer form): a heavy weapons trooper with a big tube.
 * Lv 2 a rocket pack, Lv 3 a helmet visor and vest, Lv 4 a heavier launcher, Lv 5 a quad
 * missile pod.
 */
export function makeRocketeerMissile(level) {
  const quad = level >= 4;
  const shirt = quad ? 0x263238 : 0x5d6b3a;
  const h = makeHumanoid({ skin: 0x8d5524, shirt, pants: quad ? 0x1c2429 : 0x3e4a2a, arms: shirt, face: 'soldier' });
  const { M } = h;
  helmet(h, quad ? 0x37474f : 0x4b5320);
  if (level >= 2) {
    part(h.head, boxGeo(1.2, 0.4, 0.08), M(0xff8f00), 0, 0.75, 0.7); // visor
    part(h.torso, boxGeo(2.15, 1.7, 1.15), M(quad ? 0x37474f : 0x4a5232), 0, 0.05, 0);
  }
  if (level >= 1) {
    part(h.torso, boxGeo(1.5, 1.7, 0.7), M(0x4e342e), 0, 0, -0.85);
    for (const x of [-0.4, 0, 0.4]) part(h.torso, boxGeo(0.3, 0.6, 0.3), M(0xeceff1), x, 1.1, -0.85);
  }
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  h.rightArm.add(gun);
  if (quad) {
    // Quad launcher: four tubes in a box.
    part(gun, boxGeo(1.4, 2.6, 1.4), M(0x37474f), 0, -0.8, 0);
    for (const x of [-0.35, 0.35]) for (const z of [-0.35, 0.35]) part(gun, boxGeo(0.5, 0.1, 0.5), glow(h, 0xff3d00), x, -2.12, z);
    setMuzzle(h, gun, 0, -2.2, 0);
  } else {
    const w = level >= 3 ? 1.0 : 0.8;
    const len = level >= 3 ? 3.2 : 2.7;
    part(gun, boxGeo(w, len, w), M(level >= 3 ? 0x33691e : 0x616161), 0, -len / 2 + 0.6, 0);
    part(gun, boxGeo(w + 0.2, 0.35, w + 0.2), M(0x212121), 0, -len + 0.6, 0);
    if (level >= 2) part(gun, boxGeo(0.4, 1.0, 0.4), M(0x212121), 0, -0.8, w / 2 + 0.25);
    setMuzzle(h, gun, 0, -len + 0.4, 0);
  }
  part(gun, boxGeo(0.3, 0.5, 0.3), M(0x212121), 0, -0.3, -0.5); // grip
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.2 };
  h.projectile = quad ? { color: 0xeceff1, size: 0.9 } : { color: 0xff6d00, size: level >= 3 ? 1.3 : 1.1 };
  return h;
}

/**
 * Missile Trooper (alternate Rocketeer form with two paths): a desert-camo trooper with a
 * shoulder launcher. Top path: Lv 1 orange HE warhead, Lv 2 an optic sight, Lv 3 the longer
 * SMAW+ with a visor, Lv 4 a fat warhead, Lv 5 the olive Javelin tube with its sight unit.
 * Bottom path: Lv 1-2 gloves and a rocket bandolier, Lv 3 the green M2 Carl with a front grip,
 * Lv 4 a wider bore, Lv 5 a six-tube MRL pod.
 */
export function makeRocketeerTrooper(level, bottom = false) {
  const top = !bottom;
  const jav = top && level >= 5;
  const mrl = bottom && level >= 5;
  const shirt = mrl ? 0x3b3f2a : jav ? 0x6b5d3f : 0xa08c62;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: mrl ? 0x262a1b : 0x7a6a48, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(0x212121);
  helmet(h, mrl ? 0x2e3322 : 0x8a7a55);
  if ((top && level >= 3) || mrl) part(h.head, boxGeo(1.2, 0.4, 0.08), M(mrl ? 0x76ff03 : 0x4fc3f7), 0, 0.75, 0.7); // visor
  if (level >= 3) part(h.torso, boxGeo(2.15, 1.7, 1.15), M(mrl ? 0x2e3322 : 0x6d6046), 0, 0.05, 0); // vest
  if (bottom && level >= 1) {
    // Gloves, then a bandolier of spare rockets.
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(0.62, 0.45, 0.62), dark, 0, -2.0, 0);
    if (level >= 2) {
      const strap = part(h.torso, boxGeo(0.3, 2.5, 1.18), M(0x4e342e), 0, 0, 0);
      strap.rotation.z = -0.7;
      for (const t of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.25, 0.25, 0.35), M(0xff6d00), t * -0.75, t * -0.8, 0.68);
    }
  }
  // Spare rocket on the back.
  part(h.torso, boxGeo(0.45, 1.6, 0.45), M(0x5d5d4a), 0.5, 0.2, -0.75);
  part(h.torso, boxGeo(0.35, 0.4, 0.35), M(level >= 1 && top ? 0xff6d00 : 0x9e9e9e), 0.5, 1.15, -0.75);

  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  h.rightArm.add(gun);
  if (mrl) {
    // MRL: a 2x3 pod of rocket tubes.
    part(gun, boxGeo(1.7, 2.6, 1.15), M(0x3b3f2a), 0, -0.9, 0);
    for (const x of [-0.5, 0, 0.5]) for (const z of [-0.27, 0.27]) part(gun, boxGeo(0.38, 0.1, 0.38), glow(h, 0xff3d00), x, -2.22, z);
    setMuzzle(h, gun, 0, -2.3, 0);
  } else if (jav) {
    // Javelin: a thick olive tube with the command launch unit on the side.
    part(gun, boxGeo(1.15, 3.6, 1.15), M(0x556b2f), 0, -1.2, 0);
    for (const y of [0.4, -2.8]) part(gun, boxGeo(1.35, 0.35, 1.35), M(0x3d4d21), 0, y, 0);
    part(gun, boxGeo(0.9, 0.9, 0.7), M(0x333333), 0.95, -0.4, 0.2); // launch unit
    part(gun, boxGeo(0.3, 0.3, 0.12), glow(h, 0xff1744), 0.95, -0.4, 0.58);
    setMuzzle(h, gun, 0, -3.0, 0);
  } else {
    const carl = bottom && level >= 3;
    const w = carl ? (level >= 4 ? 1.05 : 0.9) : top && level >= 4 ? 0.9 : 0.75;
    const len = carl ? 3.0 : top && level >= 3 ? 3.2 : 2.6;
    part(gun, boxGeo(w, len, w), M(carl ? 0x2e7d32 : 0x6d6046), 0, -len / 2 + 0.6, 0);
    part(gun, boxGeo(w + 0.2, 0.35, w + 0.2), dark, 0, -len + 0.6, 0);
    if (carl) {
      part(gun, boxGeo(w + 0.25, 0.5, w + 0.25), M(0x1b5e20), 0, 0.4, 0); // venturi
      part(gun, boxGeo(0.25, 0.25, 0.7), dark, 0, -1.2, w / 2 + 0.3); // front grip
    } else if (top && level >= 1) {
      // A warhead poking out of the tube (fatter at Lv 4).
      const hw = level >= 4 ? 0.85 : 0.55;
      part(gun, boxGeo(hw, 0.5, hw), M(0xff6d00), 0, -len + 0.35, 0);
    }
    if (top && level >= 2) part(gun, boxGeo(0.35, 0.9, 0.35), dark, 0, -0.9, w / 2 + 0.2); // optic sight
    setMuzzle(h, gun, 0, -len + 0.3, 0);
  }
  part(gun, boxGeo(0.3, 0.5, 0.3), dark, 0, -0.3, -0.5); // grip
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.2 };
  h.projectile = mrl ? { color: 0xffab40, size: 0.75 } : jav ? { color: 0xeceff1, size: 1.3 } : { color: 0xff6d00, size: level >= 3 ? 1.2 : 1.0 };
  return h;
}
export const makeRocketeerTrooperBottom = (level) => makeRocketeerTrooper(level, true);

/**
 * Trapper: a backwoods trapper in a fur hat with a sack of traps. Lv 2 a spike bandolier,
 * Lv 3 a landmine satchel, Lv 4 a bigger pack, Lv 5 a bear trap on the back.
 */
export function makeTrapper(level) {
  const h = makeHumanoid({ skin: 0xd2a679, shirt: level >= 3 ? 0x4e342e : 0x6d4c41, pants: 0x3e2723, arms: 0x8d6e63, face: 'smile' });
  const { M } = h;
  const fur = M(0x8d6e63);
  part(h.head, boxGeo(1.45, 0.75, 1.45), fur, 0, 1.4, 0); // fur hat
  part(h.head, boxGeo(0.35, 0.35, 1.0), M(0x5d4037), 0, 1.3, -1.0); // tail
  const metal = M(0x90a4ae);
  if (level >= 1) {
    const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), M(0x3e2723), 0, 0, 0);
    strap.rotation.z = 0.7;
    for (const t of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.25, 0.25, 0.3), metal, t * 0.75, t * -0.8, 0.65);
  }
  // Sack on the back, bigger at Lv 4.
  const sack = level >= 3 ? 1.9 : 1.4;
  part(h.torso, boxGeo(sack, sack, 0.8), M(0xa1887f), 0, 0.1, -0.9);
  if (level >= 2) part(h.torso, boxGeo(0.9, 0.7, 0.8), M(0x33402a), 1.25, -0.8, 0); // landmine satchel
  if (level >= 4) {
    // Bear trap strapped to the sack
    part(h.torso, boxGeo(1.5, 0.2, 0.2), metal, 0, 0.6, -1.4);
    part(h.torso, boxGeo(1.5, 0.2, 0.2), metal, 0, -0.4, -1.4);
    for (const x of [-0.6, -0.2, 0.2, 0.6]) part(h.torso, boxGeo(0.12, 0.3, 0.12), metal, x, 0.4, -1.45);
  }
  // A spike trap held in the raised right hand.
  const hand = new THREE.Group();
  hand.position.set(0, -2.1, 0);
  h.rightArm.add(hand);
  part(hand, boxGeo(0.9, 0.15, 0.9), M(0x5d4037), 0, -0.2, 0);
  for (const x of [-0.25, 0.25]) part(hand, boxGeo(0.12, 0.35, 0.12), metal, x, -0.4, 0);
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.6, 0, 0.2);
  h.leftArm.rotation.set(-0.8, 0, -0.3);
  h.pose = { right: -2.6, left: -0.8, leftRecoil: 0 };
  h.swing = 1.8;
  h.projectile = { color: 0x8d6e63, size: 0.7, arc: 3 };
  return h;
}


/**
 * Mine Layer: a combat engineer in olive fatigues and a helmet, holding a mine to throw, with a
 * satchel of mines. Top path: Lv 3 a claymore on the chest and a visor, Lv 4+ black AP gear
 * with a red-striped mine, Lv 5 a glowing mine. Bottom path: Lv 3 a bigger anti-tank mine,
 * Lv 4+ a thermite tank on the back that glows hotter at Lv 5 (X-Mine).
 */
export function makeMineLayer(level, bottom = false) {
  const top = !bottom;
  const ap = top && level >= 4;
  const cloth = ap ? 0x263238 : 0x556b2f;
  const h = makeHumanoid({ skin: 0xc68642, shirt: cloth, pants: ap ? 0x212121 : 0x4b5320, arms: cloth, face: 'soldier' });
  const { M } = h;
  const olive = M(0x33402a);
  const metal = M(0x78909c);
  part(h.head, boxGeo(1.45, 0.55, 1.45), M(ap ? 0x212121 : 0x4b5320), 0, 1.3, 0); // helmet
  if (top && level >= 3) part(h.head, boxGeo(1.2, 0.25, 0.1), glow(h, 0x76ff03), 0, 0.85, 0.66); // night-vision visor
  // Satchel of mines on the hip, bigger from Lv 2.
  const bag = level >= 2 ? 1.0 : 0.8;
  part(h.torso, boxGeo(bag, bag * 0.8, 0.8), M(0x6d5f3a), 1.25, -0.8, 0);
  for (const x of [-0.3, 0.3]) part(h.torso, boxGeo(0.45, 0.2, 0.45), olive, 1.25 + x * 0.4, -0.25, 0); // mines poking out
  if (level >= 1) {
    const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), M(0x3e2723), 0, 0, 0);
    strap.rotation.z = -0.7;
  }
  if (top && level >= 3) {
    // Claymore strapped to the chest
    part(h.torso, boxGeo(1.0, 0.6, 0.25), olive, 0, 0.3, 0.6);
    for (const x of [-0.35, 0.35]) part(h.torso, boxGeo(0.08, 0.3, 0.08), metal, x, -0.1, 0.62);
  }
  if (bottom && level >= 4) {
    // Thermite tank on the back with a glowing core
    part(h.torso, cylGeo(0.55, 0.55, 1.9), M(0x5d4037), 0, 0.1, -0.95);
    part(h.torso, boxGeo(0.35, 1.2, 0.2), glow(h, level >= 5 ? 0xffea00 : 0xff6d00), 0, 0.1, -1.5);
  } else part(h.torso, boxGeo(1.3, 1.3, 0.7), M(0x6d5f3a), 0, 0.1, -0.85); // pack
  // The mine held up in the right hand, ready to throw.
  const hand = new THREE.Group();
  hand.position.set(0, -2.1, 0);
  h.rightArm.add(hand);
  const big = bottom && level >= 3;
  const mineM = level >= 5 && top ? glow(h, 0xff1744) : ap ? M(0x212121) : olive;
  part(hand, cylGeo(big ? 0.65 : 0.5, big ? 0.7 : 0.55, 0.28, 12), mineM, 0, -0.25, 0);
  if (ap) part(hand, cylGeo(0.52, 0.52, 0.06, 12), M(0xd50000), 0, -0.08, 0); // AP stripe
  part(hand, boxGeo(0.18, 0.12, 0.18), glow(h, bottom && level >= 4 ? 0xff9100 : 0xff1744), 0, -0.05, 0); // arming light
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.6, 0, 0.2);
  h.leftArm.rotation.set(-0.8, 0, -0.3);
  h.pose = { right: -2.6, left: -0.8, leftRecoil: 0 };
  h.swing = 1.8;
  h.projectile = { color: bottom && level >= 4 ? 0xff6d00 : ap ? 0x212121 : 0x33402a, size: big ? 0.9 : 0.75, arc: 3 };
  return h;
}
export const makeMineLayerBottom = (level) => makeMineLayer(level, true);
