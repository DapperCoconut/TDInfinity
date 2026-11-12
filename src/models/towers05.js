// Tower models, file 5 of 12. Each makeX(level) builds one tower's look.
// In here:
// Ace Plane, Medic, Medic Beam, EDJ, Trapper, Mine Layer.
// (Missile Rocketeer, Missile Trooper: people7.js; Pyromancer, Electro: people8.js.)
// The list of which tower uses which builder is TOWER_MODELS in ../models.js.

import * as THREE from 'three';
import { boxGeo, makeHumanoid, part } from './kit.js';
import { cylGeo, glow, helmet, holdLongGun, setMuzzle } from './bits.js';

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
