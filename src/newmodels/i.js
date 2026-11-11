import * as THREE from 'three';
import { boxGeo, part, makeHumanoid, makeThing, glowThing, holdLongGun, helmet, setMuzzle, turret, gunMuzzle, makeUnit, cylGeo } from '../models.js';

// New towers and units (set I): wave 10 reworks and new towers, Tenth-wave spawner units and the
// Sentry Engineer's devices. Every helper from models.js is only called inside functions
// (models.js imports the newmodels files, so the imports are not ready at module load time).
// Characters face +Z; units walk / drive along +Z. Tower makers take level 0..4.

/* ------------------------------------------------------------------ helpers */

const B = (p, w, h, d, m, x = 0, y = 0, z = 0) => part(p, boxGeo(w, h, d), m, x, y, z);

/** Memoised material maker: one material per colour per model. */
function mm(u) {
  const cache = new Map();
  return (c) => {
    let m = cache.get(c);
    if (!m) {
      m = u.M(c);
      cache.set(c, m);
    }
    return m;
  };
}

/** Memoised glowing material maker. */
function gm(u) {
  const cache = new Map();
  return (c) => {
    let m = cache.get(c);
    if (!m) {
      m = glowThing(u, c);
      cache.set(c, m);
    }
    return m;
  };
}

/** A see-through material that keeps its see-through look (setOpacity respects keepOpacity). */
function clear(u, color, op = 0.6, glowing = false) {
  const m = glowing ? glowThing(u, color) : u.M(color);
  m.transparent = true;
  m.opacity = op;
  m.depthWrite = false;
  m.userData.keepOpacity = op;
  return m;
}

/** An empty muzzle point on `parent`. */
function mz(parent, x, y, z) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

function group(parent, x = 0, y = 0, z = 0, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  parent.add(g);
  return g;
}

function newUnit() {
  const u = makeThing();
  u.wheels = [];
  return u;
}

/** Humanoid units as a squad (same layout as makeUnit's squads). */
function squad(u, count, mk) {
  u.soldiers = [];
  const n = Math.max(1, count || 1);
  for (let i = 0; i < n; i++) {
    const h = mk(i);
    h.root.scale.setScalar(0.6 * (h.size ?? 1));
    h.root.position.set(n === 1 ? 0 : (i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.soldiers.push(h);
    u.muzzles.push(h.muzzles[0]);
  }
  const h0 = u.soldiers[0];
  u.height = 3.5 * (h0.size ?? 1);
  u.tracer = h0.tracer;
  if (h0.projectile) u.projectile = h0.projectile;
  return u;
}

/** A group at the end of a humanoid arm (the arm points along local -Y). */
function inHand(arm, y = -1.9) {
  const g = new THREE.Group();
  g.position.set(0, y, 0);
  arm.add(g);
  return g;
}

/** Gloves on both hands. */
function gloves(h, mat, arms = [h.rightArm, h.leftArm]) {
  for (const a of arms) B(a, 1.08, 0.55, 1.08, mat, 0, -1.75, 0);
}

/** Arm bands around the upper arms. */
function armBands(h, mat, y = -0.55, arms = [h.rightArm, h.leftArm]) {
  for (const a of arms) B(a, 1.1, 0.25, 1.1, mat, 0, y, 0);
}

/** Short sleeves on the upper arms. */
function shortSleeves(h, mat) {
  for (const a of [h.rightArm, h.leftArm]) B(a, 1.1, 0.8, 1.1, mat, 0, -0.35, 0);
}

/** Over-ear headphones with a band over the top of the head. */
function headphones(h, mat, cup) {
  B(h.head, 1.4, 0.18, 0.3, mat, 0, 1.3, 0);
  for (const s of [-1, 1]) {
    B(h.head, 0.15, 0.8, 0.3, mat, s * 0.68, 1.0, 0);
    B(h.head, 0.22, 0.55, 0.55, cup, s * 0.68, 0.6, 0);
  }
}

/** A cape hanging from the shoulders down the back. */
function cape(h, mat, len = 3.2, w = 2.2) {
  B(h.torso, w, len, 0.12, mat, 0, 1 - len / 2, -0.58);
  B(h.torso, w + 0.3, 0.3, 0.6, mat, 0, 0.95, -0.25); // collar over the shoulders
}

/** Knee pads on both legs. */
function kneePads(h, mat) {
  for (const l of [h.rightLeg, h.leftLeg]) B(l, 1.08, 0.5, 0.2, mat, 0, -1.0, 0.52);
}

/** One-handed pistol pose (right arm forward). Returns the pistol group. */
function pistolPose(h) {
  const g = inHand(h.rightArm);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
  h.leftArm.rotation.set(-0.25, 0, -0.15);
  h.pose = { right: -Math.PI / 2, left: -0.25, leftRecoil: 0 };
  return g;
}

/** Melee pose: weapon raised in the right hand, like the Knifer. */
function meleePose(h, left = -0.5, swing = 1.7) {
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  h.leftArm.rotation.set(left, 0, -0.25);
  h.pose = { right: -2.4, left, leftRecoil: 0 };
  h.swing = swing;
  h.melee = true;
}

/** A blocky five-pointed star (flat in its local XY plane, facing +Z). */
function star(parent, mat, x, y, z, s = 1, rotY = 0) {
  const g = group(parent, x, y, z, s);
  g.rotation.y = rotY;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = B(g, 0.16, 0.42, 0.04, mat, Math.sin(a) * 0.2, Math.cos(a) * 0.2, 0);
    arm.rotation.z = -a;
  }
  B(g, 0.26, 0.26, 0.05, mat);
  return g;
}

/** A jack-o'-lantern: orange ribbed box with a glowing face on its front (+Z). */
/** A small perched crow facing +Z (about 1.4*s long). */
function crow(M, parent, x, y, z, s = 0.5, ry = 0) {
  const g = group(parent, x, y, z, s);
  g.rotation.y = ry;
  const black = M(0x1c1c22);
  B(g, 0.8, 0.7, 1.3, black, 0, 0.6, 0);
  B(g, 0.6, 0.6, 0.6, black, 0, 1.05, 0.6);
  B(g, 0.2, 0.18, 0.45, M(0x546e7a), 0, 1.0, 1.1);
  for (const sx of [-0.31, 0.31]) B(g, 0.06, 0.12, 0.12, M(0xffca28), sx, 1.15, 0.75);
  B(g, 0.55, 0.1, 0.7, M(0x303550), 0, 0.65, -0.9).rotation.x = -0.3;
  for (const sx of [-0.43, 0.43]) B(g, 0.1, 0.5, 1.0, M(0x303550), sx, 0.65, -0.15);
  for (const sx of [-0.18, 0.18]) B(g, 0.08, 0.3, 0.08, M(0x424242), sx, 0.12, 0.05);
  return g;
}

/** A small green toy-soldier figure (for Void Traitor's body and the like), about 1.6*s tall. */
function miniSoldier(M, parent, x, y, z, s, rx = 0, rz = 0) {
  const g = group(parent, x, y, z, s);
  g.rotation.set(rx, 0, rz);
  const green = M(0x558b2f);
  for (const sx of [-0.15, 0.15]) B(g, 0.25, 0.6, 0.25, green, sx, 0.3, 0);
  B(g, 0.6, 0.6, 0.35, green, 0, 0.9, 0);
  for (const sx of [-0.4, 0.4]) B(g, 0.18, 0.55, 0.2, green, sx, 0.9, 0.05);
  B(g, 0.32, 0.32, 0.32, M(0xe0ac69), 0, 1.35, 0);
  B(g, 0.42, 0.15, 0.42, M(0x33691e), 0, 1.55, 0);
  B(g, 0.08, 0.08, 0.6, M(0x212121), 0.4, 0.75, 0.3); // tiny rifle
  return g;
}

/* ================================================================== 1. Scarecrow: machines8.js */

/* ================================================================== 2. Paralyzer */

/**
 * Paralyzer (0-4): a soldier in purple with two canisters on its back and a stun gun. Lv 1 black
 * gloves, arm bands and a purple vial at the waist; Lv 2 a mask; Lv 3 sleeves, headphones and one
 * big canister holding two vials; Lv 4 sits on a pad at a huge black ray gun with a neon purple
 * glow, in armor with two antennas on its back.
 */
function paralyzer(level) {
  const lv = Math.min(level, 4);
  const purple = lv >= 4 ? 0x4a148c : 0x7b1fa2;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: purple, pants: 0x4a148c, arms: lv >= 3 ? purple : null, face: 'soldier' });
  const M = mm(h);
  const G = gm(h);
  const neon = G(0xd500f9);
  const metal = M(0x9e9e9e);
  if (lv < 4) helmet(h, 0x6a1b9a);
  // Canisters on the back
  if (lv < 3) {
    for (const x of [-0.45, 0.45]) {
      B(h.torso, 0.6, 1.5, 0.6, metal, x, 0.05, -0.85);
      B(h.torso, 0.3, 0.9, 0.1, neon, x, 0.05, -1.17);
      B(h.torso, 0.4, 0.2, 0.4, M(0x424242), x, 0.9, -0.85);
    }
  } else {
    B(h.torso, 1.5, 1.9, 0.8, M(0x37474f), 0, 0.05, -0.95);
    for (const x of [-0.35, 0.35]) B(h.torso, 0.35, 1.3, 0.1, neon, x, 0.05, -1.37); // two vials inside
    B(h.torso, 1.6, 0.25, 0.9, M(0x212121), 0, 1.05, -0.95);
  }
  B(h.torso, 2.1, 0.25, 1.1, M(0x311b92), 0, -0.85, 0); // belt
  if (lv >= 1) {
    gloves(h, M(0x111111));
    armBands(h, M(0x311b92));
    B(h.torso, 0.25, 0.45, 0.25, neon, 0.75, -0.95, 0.56); // vial at the waist
    B(h.torso, 0.28, 0.12, 0.28, M(0x212121), 0.75, -0.68, 0.56);
  }
  if (lv >= 2) {
    B(h.head, 1.25, 0.55, 0.1, M(0x212121), 0, 0.35, 0.62); // mask
    B(h.head, 1.1, 0.2, 0.08, neon, 0, 0.85, 0.64); // visor
  }
  if (lv >= 3) headphones(h, M(0x212121), M(0x6a1b9a));
  if (lv < 4) {
    const len = 1.5 + lv * 0.12;
    const gun = holdLongGun(h, len, M(0x37474f));
    B(gun, 0.55, 0.8, 0.6, M(0x263238), 0, -0.4, 0);
    for (let i = 0; i < 1 + Math.min(lv, 2); i++) B(gun, 0.45, 0.12, 0.5, neon, 0, -0.9 - i * 0.3, 0);
    B(gun, 0.3, 0.25, 0.3, neon, 0, -len, 0);
    h.muzzles[0].position.y = -len - 0.15;
  } else {
    // Seated at a huge black ray gun, in armor with two antennas
    h.lift = -0.7;
    h.bob = 0.02;
    for (const l of [h.rightLeg, h.leftLeg]) l.rotation.x = -Math.PI / 2;
    const black = M(0x151515);
    B(h.root, 4.2, 0.25, 4.2, M(0x212121), 0, 0.12, 0); // pad
    for (const s of [-1, 1]) {
      B(h.root, 4.2, 0.08, 0.15, neon, 0, 0.28, s * 2.0);
      B(h.root, 0.15, 0.08, 4.2, neon, s * 2.0, 0.28, 0);
    }
    B(h.root, 1.8, 0.55, 1.6, M(0x37474f), 0, 0.5, -0.1); // seat
    B(h.root, 1.8, 1.6, 0.3, M(0x37474f), 0, 1.4, -1.0);
    B(h.torso, 2.2, 1.8, 1.2, M(0x2a1a40), 0, 0.05, 0); // armor
    for (const s of [-1, 1]) B(h.torso, 0.85, 0.5, 1.3, M(0x2a1a40), s * 1.35, 1.0, 0);
    for (const s of [-1, 1]) {
      B(h.torso, 0.12, 2.0, 0.12, M(0x424242), s * 0.5, 1.9, -1.0); // antennas
      B(h.torso, 0.22, 0.22, 0.22, neon, s * 0.5, 2.95, -1.0);
    }
    helmet(h, 0x2a1a40);
    // The ray gun on its mount
    B(h.root, 0.7, 2.2, 0.7, black, 0, 1.2, 2.7);
    B(h.root, 1.5, 1.3, 3.4, black, 0, 2.85, 3.2);
    B(h.root, 1.55, 0.12, 3.0, neon, 0, 3.55, 3.2);
    for (const s of [-1, 1]) {
      B(h.root, 0.08, 0.5, 3.0, neon, s * 0.78, 2.85, 3.2);
      B(h.root, 0.3, 0.7, 0.3, M(0x424242), s * 0.6, 3.05, 1.55); // grips
    }
    B(h.root, 0.8, 0.8, 2.4, black, 0, 2.85, 6.0);
    for (const z of [5.2, 5.9, 6.6]) B(h.root, 1.1, 1.1, 0.18, neon, 0, 2.85, z);
    B(h.root, 1.4, 1.4, 0.25, M(0x212121), 0, 2.85, 7.3);
    B(h.root, 0.9, 0.9, 0.1, neon, 0, 2.85, 7.45);
    setMuzzle(h, h.root, 0, 2.85, 7.6);
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.3);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.3);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.3 };
    h.recoilScale = 0.3;
  }
  h.tracer = 0xd500f9;
  h.tracerWidth = lv >= 4 ? 0.55 : 0.3;
  return h;
}

/* ================================================================== 3. Helicopter */

/**
 * The flying helicopter, built like makeHeli: `heli` holds a `bank` group (nose dip / bank), a
 * main rotor `prop`, a tail rotor `tail`, a bomb `bay` and missile pod points (`missiles`).
 * Lv 0 plain grey, two front guns, headlights and an open door; Lv 1 a darker grey; Lv 2 darker
 * with red details and a rocket pod on the right; Lv 3 a chin minigun and rockets on both wings;
 * Lv 4 an olive military gunship with miniguns everywhere, 6-tube rocket pods and star markings.
 */
export function heliCraft(u, level) {
  const M = mm(u);
  const G = gm(u);
  const heli = new THREE.Group();
  const bank = new THREE.Group();
  heli.add(bank);
  const muzzles = [];
  const missiles = [];
  const spin = [];
  const mil = level >= 4;
  const body = M([0x9e9e9e, 0x7b7b7b, 0x5e5e5e, 0x4a4a4a, 0x4b5320][level]);
  const red = M(0xc62828);
  const dark = M(0x212121);
  const trim = level >= 2 && !mil ? red : M(mil ? 0x33391a : 0x616161);
  if (mil) bank.scale.setScalar(1.2);

  B(bank, 2.2, 2.0, 4.2, body, 0, 0, 0.3); // cabin
  B(bank, 1.8, 1.3, 1.2, body, 0, -0.2, 2.8); // nose
  B(bank, 1.7, 0.9, 1.0, M(0x81d4fa), 0, 0.45, 2.4); // windscreen
  B(bank, 0.7, 0.7, 4.5, body, 0, 0.4, -3.8); // tail boom
  B(bank, 0.15, 1.6, 1.0, level >= 2 ? trim : body, 0, 1.1, -5.9); // tail fin
  B(bank, 1.8, 0.12, 0.6, body, 0, 0.4, -5.4);
  B(bank, 2.3, 0.15, 0.5, trim, 0, -0.4, 0.3); // stripe
  if (level >= 2 && !mil) B(bank, 1.85, 0.2, 0.1, red, 0, -0.75, 3.41); // red nose trim
  for (const x of [-0.9, 0.9]) B(bank, 0.15, 0.15, 3.6, dark, x, -1.35, 0.4); // skids
  for (const x of [-0.9, 0.9]) for (const z of [-0.6, 1.4]) B(bank, 0.12, 0.4, 0.12, dark, x, -1.1, z);
  // Headlights
  for (const x of [-0.55, 0.55]) B(bank, 0.3, 0.25, 0.1, G(0xfff9c4), x, -0.55, 3.42);
  // Open side door on the right (-X): a dark doorway with the door slid back
  B(bank, 0.06, 1.3, 1.4, M(0x111111), -1.12, 0.1, 0.6);
  B(bank, 0.08, 1.4, 1.4, body, -1.17, 0.1, -0.9);
  B(bank, 0.06, 0.6, 1.2, M(0x81d4fa), 1.12, 0.45, 0.6); // window on the other side

  // Rotors
  B(bank, 0.4, 0.6, 0.4, dark, 0, 1.3, 0.3);
  const prop = new THREE.Group();
  prop.position.set(0, 1.65, 0.3);
  bank.add(prop);
  const bladeM = M(0x2b2b2b);
  const nBlades = mil ? 4 : 2;
  for (let i = 0; i < nBlades; i++) B(prop, 0.35, 0.08, 9, bladeM).rotation.y = (i * Math.PI) / nBlades;
  const tail = new THREE.Group();
  tail.position.set(0.15, 1.1, -5.9);
  bank.add(tail);
  B(tail, 0.08, 2.0, 0.25, bladeM);
  B(tail, 0.08, 0.25, 2.0, bladeM);

  /** A minigun with six spinning barrels pointing +Z, muzzle added to `muzzles`. */
  const minigun = (x, y, z, len = 1.5) => {
    const gun = group(bank, x, y, z);
    B(gun, 0.5, 0.5, 0.7, dark);
    const barrels = group(gun, 0, 0, 0.4);
    barrels.rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      B(barrels, 0.09, len, 0.09, mil ? M(0x37474f) : dark, Math.cos(a) * 0.17, len / 2, Math.sin(a) * 0.17);
    }
    spin.push(barrels);
    muzzles.push(mz(bank, x, y, z + 0.4 + len));
  };
  /** A rocket pod pointing +Z; tubes x rows. */
  const pod = (x, y, z, tubes) => {
    const big = tubes >= 6;
    const w = big ? 0.75 : 0.5;
    const hgt = big ? 0.55 : 0.5;
    B(bank, w, hgt, 1.6, M(mil ? 0x33391a : 0x37474f), x, y, z);
    if (big) {
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) B(bank, 0.16, 0.16, 0.06, M(0x111111), x - 0.22 + i * 0.22, y - 0.12 + j * 0.24, z + 0.81);
    } else B(bank, 0.3, 0.3, 0.1, G(0xff3d00), x, y, z + 0.82);
    missiles.push(mz(bank, x, y, z + 0.9));
  };

  if (level <= 2) {
    // Two front guns
    for (const x of [-0.75, 0.75]) {
      B(bank, 0.35, 0.35, 0.6, dark, x, -0.95, 2.6);
      B(bank, 0.14, 0.14, 1.3, dark, x, -0.95, 3.5);
      muzzles.push(mz(bank, x, -0.95, 4.2));
    }
  } else minigun(0, -1.05, 2.7, mil ? 1.8 : 1.5);
  if (level >= 2) {
    // Stub wings: only the right side (-X) at Lv 2, both from Lv 3, longer at Lv 4
    const sides = level >= 3 ? [-1, 1] : [-1];
    for (const s of sides) {
      B(bank, mil ? 2.6 : 1.8, 0.15, 0.9, body, s * (mil ? 2.2 : 1.8), -0.2, 0.3);
      if (mil) {
        pod(s * 1.9, -0.6, 0.3, 6);
        pod(s * 2.8, -0.6, 0.3, 6);
        minigun(s * 3.5, -0.45, 0.0, 1.2); // wing-tip miniguns
      } else pod(s * 2.1, -0.55, 0.3, level >= 3 ? 4 : 2);
    }
  }
  if (mil) {
    // Door minigun, armor, sensor ball and white star markings
    minigun(-1.5, -0.2, 0.6, 1.0);
    B(bank, 0.8, 0.8, 0.8, dark, 0, -1.2, 3.1);
    B(bank, 0.4, 0.4, 0.1, G(0xff1744), 0, -1.2, 3.52);
    const white = M(0xfafafa);
    star(bank, white, 1.13, 0.2, -0.6, 1.4, Math.PI / 2); // (the open door is on the other side)
    for (const s of [-1, 1]) star(bank, white, s * 0.37, 0.45, -3.6, 0.9, s * Math.PI / 2);
  }
  const bay = new THREE.Object3D();
  bay.position.set(0, -1.2, 0.3);
  bank.add(bay);
  heli.userData = { bank, prop, tail, bay, missiles };
  return { heli, muzzles, spin };
}


/* ================================================================== 4. Hunter */

/**
 * Hunter (0-4): mud-brown clothes, a safari hat, a dark brown backpack and a hunting rifle. Lv 1
 * black gloves and an arm band; Lv 2 sunglasses; Lv 3 darker long-sleeved clothes and a new
 * rifle; Lv 4 the cyber hunter: tech arm band and glasses, an antenna in the bag, a black mask
 * and a glowing laser rifle.
 */
function hunter(level) {
  const lv = Math.min(level, 4);
  const cyber = lv >= 4;
  const shirt = cyber ? 0x2e2a24 : lv >= 3 ? 0x4e3b26 : 0x7a5c3a;
  const h = makeHumanoid({ skin: 0xd9a066, shirt, pants: cyber ? 0x1f1c18 : lv >= 3 ? 0x3e2e1e : 0x5d4630, arms: lv >= 3 ? shirt : null, face: 'soldier' });
  const M = mm(h);
  const G = gm(h);
  const cyan = G(0x00e5ff);
  if (lv < 3) shortSleeves(h, M(shirt));
  // Safari hat
  const hat = M(cyber ? 0x3a3530 : 0xc8a96e);
  B(h.head, 1.8, 0.12, 1.8, hat, 0, 1.25, 0);
  B(h.head, 1.25, 0.5, 1.25, hat, 0, 1.55, 0);
  B(h.head, 1.3, 0.15, 1.3, cyber ? cyan : M(0x5d4037), 0, 1.38, 0);
  // Backpack
  B(h.torso, 1.5, 1.7, 0.7, M(0x3e2723), 0, -0.05, -0.85);
  B(h.torso, 1.3, 0.5, 0.25, M(0x4e342e), 0, -0.4, -1.3);
  for (const x of [-0.6, 0.6]) B(h.torso, 0.22, 2.0, 0.08, M(0x3e2723), x, 0.05, 0.53);
  B(h.torso, 2.1, 0.22, 1.1, M(0x4e342e), 0, -0.85, 0); // belt
  for (const x of [-0.4, -0.2, 0, 0.2]) B(h.torso, 0.12, 0.3, 0.12, M(0xc9a227), x, -0.85, 0.57); // shells
  if (lv >= 1) {
    gloves(h, M(0x111111));
    armBands(h, cyber ? cyan : M(0xff6f00), -0.55, [h.leftArm]);
  }
  if (lv >= 2 && !cyber) B(h.head, 1.15, 0.25, 0.1, M(0x111111), 0, 0.85, 0.63); // sunglasses
  if (cyber) {
    B(h.head, 1.15, 0.25, 0.1, cyan, 0, 0.85, 0.64); // tech glasses
    B(h.head, 1.25, 0.55, 0.1, M(0x111111), 0, 0.35, 0.62); // black mask
    B(h.torso, 0.1, 2.2, 0.1, M(0x424242), 0.5, 1.4, -1.0); // antenna in the bag
    B(h.torso, 0.2, 0.2, 0.2, G(0xff1744), 0.5, 2.55, -1.0);
    B(h.torso, 0.5, 0.3, 0.1, cyan, -0.3, 0.2, -1.22);
  }
  const len = lv >= 3 ? 2.4 : 2.1;
  const gun = holdLongGun(h, len, M(cyber ? 0x212121 : lv >= 3 ? 0x2b2b2b : 0x3a3a3a));
  B(gun, 0.4, 0.9, 0.55, M(cyber ? 0x263238 : lv >= 3 ? 0x3e2723 : 0x6d4c41), 0, 0.2, 0.05); // stock
  B(gun, 0.25, 0.8, 0.25, M(0x111111), 0, -0.7, 0.32); // scope
  if (lv >= 3) B(gun, 0.32, 0.25, 0.32, cyber ? cyan : M(0x111111), 0, -0.3, 0.32);
  if (cyber) {
    for (const y of [-1.1, -1.5, -1.9]) B(gun, 0.42, 0.12, 0.5, cyan, 0, y, 0);
    B(gun, 0.3, 0.25, 0.3, cyan, 0, -len, 0);
  }
  h.muzzles[0].position.y = -len - 0.15;
  h.tracer = cyber ? 0x00e5ff : 0xffd54f;
  if (cyber) h.tracerWidth = 0.35;
  return h;
}

/* ================================================================== 5. Slugger */

/**
 * Slugger (0-4): a blue outfit and cap and a wooden bat. Lv 1 sleeves and dark blue gloves; Lv 2
 * a backpack, a belt and a spiked bat; Lv 3 darker clothes, a black glove, headphones, knee pads
 * and a metal bat; Lv 4 all black with a mask, a metal spiked bat with a red neon ring and a small
 * flag with a red crossed-circle symbol.
 */
function slugger(level) {
  const lv = Math.min(level, 4);
  const blk = lv >= 4;
  const shirt = blk ? 0x151515 : lv >= 3 ? 0x0d47a1 : 0x1e88e5;
  const pants = blk ? 0x0d0d0d : lv >= 3 ? 0x1a237e : 0x1565c0;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants, arms: lv >= 1 ? shirt : null, face: 'smile' });
  const M = mm(h);
  const G = gm(h);
  if (lv === 0) shortSleeves(h, M(shirt));
  // Cap
  const capM = M(blk ? 0x0d0d0d : lv >= 3 ? 0x0d47a1 : 0x1565c0);
  B(h.head, 1.32, 0.42, 1.32, capM, 0, 1.3, 0);
  B(h.head, 1.0, 0.12, 0.6, capM, 0, 1.12, 0.88);
  if (!blk) B(h.head, 0.3, 0.3, 0.05, M(0xfafafa), 0, 1.3, 0.67);
  if (!blk) B(h.torso, 0.6, 0.6, 0.06, M(0xfafafa), 0, 0.3, 0.52); // jersey number
  if (lv >= 1) gloves(h, M(lv >= 3 ? 0x111111 : 0x0d47a1), lv >= 3 ? [h.rightArm] : [h.rightArm, h.leftArm]);
  if (lv >= 3) gloves(h, M(0x0d47a1), [h.leftArm]);
  if (lv >= 2) {
    B(h.torso, 1.4, 1.6, 0.65, M(blk ? 0x212121 : 0x37474f), 0, 0, -0.85); // backpack
    B(h.torso, 2.1, 0.25, 1.1, M(0x3e2723), 0, -0.85, 0); // belt
    B(h.torso, 0.3, 0.25, 0.1, M(0xbdbdbd), 0, -0.85, 0.56);
  }
  if (lv >= 3) {
    headphones(h, M(0x212121), M(blk ? 0xd50000 : 0x1e88e5));
    kneePads(h, M(0x212121));
  }
  if (blk) {
    B(h.head, 1.25, 0.6, 0.1, M(0x111111), 0, 0.35, 0.62); // mask
    for (const x of [-0.25, 0.25]) B(h.head, 0.2, 0.1, 0.05, G(0xff1744), x, 0.85, 0.63);
    // Small flag on the backpack: a red crossed circle on white
    B(h.torso, 0.08, 2.6, 0.08, M(0x9e9e9e), 0.5, 1.2, -1.15);
    const flag = group(h.torso, 0.5, 2.15, -1.15);
    B(flag, 0.05, 0.8, 1.1, M(0xfafafa), 0, 0, -0.55);
    const redM = M(0xd50000);
    for (const [y, z, hh, dd] of [[0.28, -0.55, 0.08, 0.56], [-0.28, -0.55, 0.08, 0.56], [0, -0.83, 0.56, 0.08], [0, -0.27, 0.56, 0.08]]) B(flag, 0.07, hh, dd, redM, 0, y, z);
    B(flag, 0.07, 0.08, 0.75, redM, 0, 0, -0.55).rotation.x = Math.PI / 4;
  }
  // Bat
  const bat = inHand(h.rightArm);
  const metal = lv >= 3;
  const batM = M(blk ? 0x546e7a : metal ? 0xb0bec5 : 0xa1734a);
  B(bat, 0.22, 0.9, 0.22, M(metal ? 0x212121 : 0x6d4c41), 0, -0.3, 0); // grip
  B(bat, 0.34, 1.0, 0.34, batM, 0, -1.2, 0);
  B(bat, 0.46, 1.1, 0.46, batM, 0, -2.2, 0);
  if (lv >= 2 && lv !== 3) {
    const spikeM = M(0xcfd8dc);
    for (const y of [-1.8, -2.3, -2.7]) for (const [x, z] of [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) B(bat, x ? 0.2 : 0.06, 0.06, z ? 0.2 : 0.06, spikeM, x, y, z);
  }
  if (blk) B(bat, 0.58, 0.15, 0.58, G(0xff1744), 0, -1.65, 0); // neon ring
  setMuzzle(h, bat, 0, -2.7, 0);
  meleePose(h, -0.5, 1.8);
  h.tracer = blk ? 0xff1744 : 0xffffff;
  return h;
}

/* ================================================================== 6. Doctor */

/**
 * Doctor (0-4): yellow skin, white clothes, a head mirror and a silenced pistol. Lv 1 a
 * stethoscope; Lv 2 a red cross on the chest and a cape; Lv 3 a medigun backpack with a hose and
 * a nozzle in the other hand; Lv 4 a black and light-blue outfit.
 */
function doctor(level) {
  const lv = Math.min(level, 4);
  const dark = lv >= 4;
  const shirt = dark ? 0x1a1a1a : 0xfafafa;
  const h = makeHumanoid({ skin: 0xf5cd30, shirt, pants: dark ? 0x111111 : 0xe0e0e0, arms: shirt, face: 'smile' });
  const M = mm(h);
  const G = gm(h);
  const blue = dark ? G(0x4fc3f7) : M(0x90caf9);
  // Long coat panels and collar
  for (const s of [-1, 1]) B(h.torso, 0.55, 2.6, 0.12, M(shirt), s * 0.72, -0.3, 0.52);
  B(h.torso, 0.5, 1.4, 0.06, M(dark ? 0x4fc3f7 : 0x90caf9), 0, 0.3, 0.51); // scrubs underneath
  if (dark) for (const s of [-1, 1]) B(h.torso, 0.08, 2.0, 1.04, blue, s * 1.0, 0, 0);
  // Head mirror on a band
  B(h.head, 1.3, 0.2, 1.3, M(dark ? 0x263238 : 0x9e9e9e), 0, 1.0, 0);
  B(h.head, 0.5, 0.5, 0.08, M(0xcfd8dc), 0.25, 1.05, 0.7);
  B(h.head, 0.2, 0.2, 0.05, M(0x37474f), 0.25, 1.05, 0.75);
  if (lv >= 1) {
    // Stethoscope round the neck
    const tube = M(0x212121);
    for (const s of [-1, 1]) B(h.torso, 0.1, 1.0, 0.1, tube, s * 0.35, 0.5, 0.56);
    B(h.torso, 0.8, 0.1, 0.1, tube, 0, 0.98, 0.45);
    B(h.torso, 0.3, 0.3, 0.12, M(0xbdbdbd), -0.35, -0.05, 0.6);
  }
  if (lv >= 2) {
    const red = dark ? blue : M(0xd32f2f);
    B(h.torso, 0.7, 0.22, 0.06, red, 0.45, 0.45, 0.58); // cross
    B(h.torso, 0.22, 0.7, 0.06, red, 0.45, 0.45, 0.58);
    cape(h, M(dark ? 0x4fc3f7 : 0xc62828), 3.0);
  }
  if (lv >= 3) {
    // Medigun backpack, hose and nozzle in the left hand
    B(h.torso, 1.3, 1.8, 0.75, M(dark ? 0x263238 : 0xb0bec5), 0, 0.05, -0.95);
    B(h.torso, 0.8, 1.2, 0.1, G(dark ? 0x4fc3f7 : 0xff5252), 0, 0.05, -1.35);
    const hose = M(0x37474f);
    B(h.torso, 0.18, 0.18, 1.2, hose, 1.0, -0.3, -0.4);
    B(h.torso, 0.18, 1.2, 0.18, hose, 1.1, -0.85, 0.1);
    const nozzle = inHand(h.leftArm);
    B(nozzle, 0.35, 1.0, 0.35, M(0xeceff1), 0, -0.4, 0);
    B(nozzle, 0.3, 0.25, 0.3, G(dark ? 0x4fc3f7 : 0xff8a80), 0, -0.95, 0);
    // Medigun beam: drawn from the nozzle tip to the tower it heals.
    h.medi = dark ? 0x4fc3f7 : 0xff8a80;
    h.mediFrom = new THREE.Object3D();
    h.mediFrom.position.set(0, -1.1, 0);
    nozzle.add(h.mediFrom);
  }
  // Silenced pistol
  const g = pistolPose(h);
  const gunM = M(0x263238);
  B(g, 0.25, 0.4, 0.25, gunM, 0, -0.1, 0.15);
  B(g, 0.28, 0.85, 0.3, gunM, 0, -0.45, 0);
  B(g, 0.2, 0.9, 0.2, M(0x111111), 0, -1.3, 0); // silencer
  setMuzzle(h, g, 0, -1.8, 0);
  if (lv >= 3) {
    h.leftArm.rotation.set(-1.2, 0, -0.2);
    h.pose.left = -1.2;
  }
  h.tracer = dark ? 0x4fc3f7 : 0xeeeeee;
  return h;
}

/* ================================================================== 7. Exterminator */

/**
 * Exterminator (0-4): a dark blue and black outfit, a purple bandana, a canister on the back and a
 * futuristic gun. Lv 1 gloves and goggles; Lv 2 a second canister and a bigger gun; Lv 3 a
 * respirator helmet, armor and an even bigger gun; Lv 4 red, with a huge gun on a fixed base.
 */
function exterminator(level) {
  const lv = Math.min(level, 4);
  const redS = lv >= 4;
  const shirt = redS ? 0xb71c1c : 0x1a237e;
  const h = makeHumanoid({ skin: 0xd9a066, shirt, pants: redS ? 0x3e0000 : 0x111111, arms: redS ? 0x7f0000 : 0x0d1440, face: 'soldier' });
  const M = mm(h);
  const G = gm(h);
  const accent = G(redS ? 0xff1744 : 0x76ff03);
  // Bandana: band round the head and over the lower face
  const band = M(redS ? 0x4a148c : 0x8e24aa);
  B(h.head, 1.3, 0.3, 1.3, band, 0, 1.1, 0);
  B(h.head, 1.25, 0.55, 0.1, band, 0, 0.35, 0.62);
  B(h.head, 0.3, 0.5, 0.1, band, 0.2, 1.05, -0.7);
  // Canister(s)
  const tank = M(redS ? 0x212121 : 0x455a64);
  const tanks = lv >= 2 ? [-0.45, 0.45] : [0];
  for (const x of tanks) {
    B(h.torso, 0.65, 1.7, 0.65, tank, x, 0.05, -0.88);
    B(h.torso, 0.3, 1.0, 0.1, accent, x, 0.05, -1.22);
  }
  B(h.torso, 2.1, 0.25, 1.1, M(0x212121), 0, -0.85, 0);
  if (lv >= 1) {
    gloves(h, M(0x111111));
    B(h.head, 1.15, 0.3, 0.12, accent, 0, 0.85, 0.64); // goggles
  }
  if (lv >= 2) for (const s of [-1, 1]) B(h.torso, 0.85, 0.5, 1.3, M(redS ? 0x7f0000 : 0x263238), s * 1.35, 1.0, 0); // shoulder pads
  if (lv >= 3) {
    B(h.head, 1.45, 0.6, 1.45, M(redS ? 0x7f0000 : 0x263238), 0, 1.35, 0); // helmet
    B(h.head, 0.5, 0.5, 0.35, M(0x37474f), 0, 0.3, 0.75); // respirator
    for (const s of [-1, 1]) B(h.head, 0.25, 0.25, 0.25, M(0x212121), s * 0.35, 0.25, 0.85);
    B(h.torso, 2.2, 1.7, 1.2, M(redS ? 0x7f0000 : 0x263238), 0, 0.15, 0); // armor
    B(h.torso, 0.5, 0.5, 0.1, accent, 0, 0.4, 0.62);
  }
  if (!redS) {
    const len = [1.6, 1.7, 1.9, 2.2][lv];
    const gun = holdLongGun(h, len, M(0x263238));
    const body = lv >= 2 ? 0.75 : 0.6;
    B(gun, body, 1.0, body, M(0x37474f), 0, -0.5, 0);
    for (let i = 0; i <= lv; i++) B(gun, body - 0.1, 0.12, body - 0.05, accent, 0, -0.8 - i * 0.3, 0);
    B(gun, 0.45, 0.3, 0.45, accent, 0, -len, 0);
    if (lv >= 3) B(gun, 0.5, 0.6, 0.5, tank, 0, -0.5, -0.5); // drum
    h.muzzles[0].position.y = -len - 0.15;
  } else {
    // Huge gun on a fixed base
    const black = M(0x151515);
    B(h.root, 2.6, 0.4, 2.6, M(0x212121), 0, 0.2, 2.2);
    B(h.root, 0.8, 2.0, 0.8, black, 0, 1.4, 2.4);
    B(h.root, 1.8, 1.4, 3.2, M(0x7f0000), 0, 3.1, 3.0);
    for (const s of [-1, 1]) {
      B(h.root, 0.1, 0.4, 2.8, accent, s * 0.92, 3.1, 3.0);
      B(h.root, 0.3, 0.7, 0.3, black, s * 0.6, 3.3, 1.35); // grips
      B(h.root, 0.7, 0.9, 1.4, tank, s * 1.25, 3.0, 2.4); // side tanks
    }
    B(h.root, 1.0, 1.0, 2.6, black, 0, 3.1, 5.8);
    for (const z of [5.0, 5.7, 6.4]) B(h.root, 1.25, 1.25, 0.18, accent, 0, 3.1, z);
    B(h.root, 1.5, 1.5, 0.3, black, 0, 3.1, 7.2);
    B(h.root, 0.8, 0.8, 0.1, accent, 0, 3.1, 7.37);
    setMuzzle(h, h.root, 0, 3.1, 7.5);
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.3);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.3);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.3 };
    h.recoilScale = 0.3;
  }
  h.tracer = redS ? 0xff1744 : 0x76ff03;
  h.tracerWidth = 0.3 + lv * 0.06;
  return h;
}

/* ================================================================== 8. Spirit Advocate */

/**
 * Spirit Advocate (0-4): pale white skin, a metal sword on the right arm, a grey spiky crown with
 * blue spikes, a grey jacket, blue pants and blue arm bands. Lv 1 a blue sash; Lv 2 antlers, a
 * bigger sword and robes; Lv 3 more armor; Lv 4 ice-blue wings, a halo, shoulder pads and a
 * turquoise-to-white glowing blade.
 */
function spiritAdvocate(level) {
  const lv = Math.min(level, 4);
  const h = makeHumanoid({ skin: 0xf4f4f4, shirt: 0x757575, pants: 0x1e88e5, arms: 0x757575, face: 'none' });
  const M = mm(h);
  const G = gm(h);
  const ice = G(0x80deea);
  for (const x of [-0.27, 0.27]) B(h.head, 0.22, 0.14, 0.05, G(0x40c4ff), x, 0.7, 0.62); // eyes
  armBands(h, M(0x1e88e5), -0.7);
  // Jacket lapels
  for (const s of [-1, 1]) B(h.torso, 0.4, 1.9, 0.08, M(0x616161), s * 0.45, 0, 0.52);
  // Spiky crown
  const grey = M(0x9e9e9e);
  B(h.head, 1.35, 0.3, 1.35, grey, 0, 1.25, 0);
  for (const [x, z] of [[-0.5, 0.55], [0, 0.55], [0.5, 0.55], [-0.55, 0], [0.55, 0], [0, -0.55]]) {
    B(h.head, 0.2, 0.4, 0.2, grey, x, 1.55, z);
    B(h.head, 0.12, 0.3, 0.12, G(0x2979ff), x, 1.85, z);
  }
  if (lv >= 1) B(h.torso, 0.3, 2.3, 1.1, M(0x1565c0), 0, 0, 0).rotation.z = 0.6; // sash
  if (lv >= 2) {
    // Antlers and robes
    const antler = M(0xd7ccc8);
    for (const s of [-1, 1]) {
      B(h.head, 0.15, 0.9, 0.15, antler, s * 0.55, 1.9, 0).rotation.z = s * -0.4;
      B(h.head, 0.12, 0.6, 0.12, antler, s * 0.85, 2.3, 0).rotation.z = s * -0.9;
      B(h.head, 0.12, 0.5, 0.12, antler, s * 0.75, 2.45, 0.1).rotation.z = s * 0.2;
    }
    const robe = M(0xe0e0e0);
    B(h.torso, 2.15, 1.8, 0.1, robe, 0, -1.6, 0.55);
    B(h.torso, 2.15, 1.8, 0.1, robe, 0, -1.6, -0.55);
    B(h.torso, 0.4, 2.7, 0.12, M(0x1e88e5), 0, -1.2, 0.6);
  }
  if (lv >= 3) {
    const plate = M(0xb0bec5);
    B(h.torso, 2.2, 1.6, 1.2, plate, 0, 0.2, 0);
    B(h.torso, 0.5, 0.5, 0.1, ice, 0, 0.4, 0.62);
    for (const a of [h.rightArm, h.leftArm]) B(a, 1.12, 0.9, 1.12, plate, 0, -1.4, 0); // gauntlets
    for (const l of [h.rightLeg, h.leftLeg]) B(l, 1.08, 0.8, 1.08, plate, 0, -1.4, 0);
  }
  if (lv >= 4) {
    for (const s of [-1, 1]) {
      B(h.torso, 1.0, 0.6, 1.4, M(0xcfd8dc), s * 1.4, 1.1, 0); // shoulder pads
      B(h.torso, 0.15, 0.25, 1.45, ice, s * 1.4, 1.45, 0);
      const wing = clear(h, 0xb3e5fc, 0.7, true);
      const w1 = B(h.torso, 0.15, 2.4, 2.4, wing, s * 0.9, 0.8, -1.4);
      w1.rotation.set(0.25, s * 0.55, s * 0.4);
      const w2 = B(h.torso, 0.12, 1.6, 1.8, wing, s * 1.8, 1.7, -1.9);
      w2.rotation.set(0.35, s * 0.8, s * 0.7);
    }
    const halo = G(0xe0f7fa);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      B(h.head, 0.42, 0.12, 0.16, halo, Math.cos(a) * 0.75, 2.15, Math.sin(a) * 0.75).rotation.y = -a + Math.PI / 2;
    }
  }
  // Sword
  const sword = inHand(h.rightArm);
  const bl = [2.0, 2.2, 2.7, 2.9, 3.4][lv];
  const bw = lv >= 2 ? 0.45 : 0.32;
  B(sword, 0.25, 0.5, 0.25, M(0x263238), 0, -0.2, 0);
  B(sword, 1.0 + lv * 0.08, 0.15, 0.3, M(lv >= 4 ? 0xb3e5fc : 0x78909c), 0, -0.45, 0);
  if (lv >= 4) {
    const cols = [0x1de9b6, 0x64ffda, 0xa7ffeb, 0xe0f7fa, 0xffffff];
    const seg = bl / cols.length;
    cols.forEach((c, i) => B(sword, bw, seg, 0.12, G(c), 0, -0.5 - seg * (i + 0.5), 0));
  } else B(sword, bw, bl, 0.12, M(0xcfd8dc), 0, -0.5 - bl / 2, 0);
  setMuzzle(h, sword, 0, -0.5 - bl, 0);
  meleePose(h, -0.4, 1.9);
  h.tracer = lv >= 4 ? 0x64ffda : 0x40c4ff;
  return h;
}

/* ================================================================== 9. Sentry Engineer */

/**
 * Sentry Engineer (0-4): a worker in a light blue shirt, denim overalls, a black belt with a gold
 * buckle and an orange hard hat, with a nailgun and a wrench. Lv 1 welding goggles, gloves and
 * knee pads; Lv 2 an orange suit; Lv 3 more gear (tool pack, radio, pouches); Lv 4 a dark red suit
 * with neon red details, a military backpack and a futuristic vest.
 */
function sentryEngineer(level) {
  const lv = Math.min(level, 4);
  const red = lv >= 4;
  const orange = lv >= 2 && !red;
  const shirt = red ? 0x5d0f0f : orange ? 0xef6c00 : 0x81d4fa;
  const pants = red ? 0x3b0a0a : orange ? 0xe65100 : 0x1565c0;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants, arms: shirt, face: 'soldier' });
  const M = mm(h);
  const G = gm(h);
  const neon = G(0xff1744);
  if (lv < 2) {
    // Denim bib and straps
    B(h.torso, 1.5, 1.2, 0.08, M(0x1565c0), 0, -0.35, 0.52);
    for (const s of [-1, 1]) B(h.torso, 0.25, 1.0, 0.08, M(0x1565c0), s * 0.6, 0.5, 0.52);
    B(h.torso, 0.4, 0.3, 0.06, M(0x0d47a1), 0, -0.3, 0.57);
  }
  B(h.torso, 2.1, 0.25, 1.1, M(0x111111), 0, -0.85, 0); // belt
  B(h.torso, 0.35, 0.3, 0.1, M(0xffc107), 0, -0.85, 0.56); // gold buckle
  helmet(h, red ? 0x212121 : 0xff9800);
  if (lv >= 1) {
    B(h.head, 1.2, 0.3, 0.12, M(0x212121), 0, 0.9, 0.65); // welding goggles
    for (const x of [-0.27, 0.27]) B(h.head, 0.3, 0.2, 0.05, red ? neon : G(0x26c6da), x, 0.9, 0.72);
    gloves(h, M(0x5d4037));
    kneePads(h, M(0x37474f));
  }
  if (lv >= 3) {
    B(h.torso, 1.5, 1.6, 0.7, M(red ? 0x4b5320 : 0x795548), 0, 0, -0.85); // tool pack / military backpack
    B(h.torso, 0.1, 1.8, 0.1, M(0x424242), -0.55, 1.6, -1.0); // radio antenna
    B(h.torso, 0.18, 0.18, 0.18, red ? neon : G(0x76ff03), -0.55, 2.55, -1.0);
    for (const x of [-0.75, 0.75]) B(h.torso, 0.4, 0.45, 0.4, M(0x6d4c41), x, -1.05, 0.4); // pouches
  }
  if (red) {
    B(h.torso, 2.2, 1.7, 1.2, M(0x263238), 0, 0.15, 0); // futuristic vest
    for (const x of [-0.5, 0.5]) B(h.torso, 0.12, 1.4, 0.06, neon, x, 0.2, 0.62);
    B(h.torso, 1.2, 0.1, 0.06, neon, 0, 0.75, 0.62);
    for (const s of [-1, 1]) B(h.torso, 0.8, 0.45, 1.25, M(0x263238), s * 1.35, 1.0, 0);
    B(h.head, 1.5, 0.12, 0.1, neon, 0, 1.15, 0.72);
    for (const l of [h.rightLeg, h.leftLeg]) B(l, 1.06, 0.1, 1.06, neon, 0, -0.5, 0);
  }
  // Wrench in the left hand
  const wr = inHand(h.leftArm);
  B(wr, 0.18, 1.0, 0.18, M(0x9e9e9e), 0, -0.4, 0);
  B(wr, 0.5, 0.25, 0.18, M(0x9e9e9e), 0, -0.95, 0);
  // Nailgun
  const gun = holdLongGun(h, 1.2, M(red ? 0x212121 : 0x424242));
  B(gun, 0.55, 0.9, 0.7, M(red ? 0x7f0000 : 0xff9800), 0, -0.45, 0.1);
  B(gun, 0.35, 0.4, 0.3, M(0x616161), 0, -0.5, 0.55); // magazine
  if (red) B(gun, 0.25, 0.25, 0.25, neon, 0, -1.2, 0);
  h.muzzles[0].position.y = -1.35;
  h.tracer = red ? 0xff1744 : 0xbdbdbd;
  return h;
}

/* ================================================================== 10. Void Traitor */

/**
 * Void Traitor (0-4): a dark void figure with tiny soldier figures stuck in it, growing every
 * level. Lv 1 black equipment; Lv 2 dark red armor and a scimitar; Lv 3 a purple crystal core and
 * a cape; Lv 4 neon armor, wings, a greatsword and a shield.
 */
function traitor(level) {
  const lv = Math.min(level, 4);
  const h = makeHumanoid({ skin: 0x1a0d26, shirt: 0x12001f, pants: 0x0b0014, arms: 0x1a0033, face: 'void' });
  const M = mm(h);
  const G = gm(h);
  const voidG = G(0xaa00ff);
  const neon = G(0xe040fb);
  // Void haze around the body
  const haze = clear(h, 0x4a148c, 0.35);
  B(h.torso, 2.4, 2.3, 1.3, haze, 0, 0, 0);
  // Tiny soldiers stuck into it
  const spots = [
    [h.torso, 0.6, 0.3, 0.5, -0.5, 0.3],
    [h.torso, -0.5, -0.5, 0.45, -0.7, -0.4],
    [h.torso, 0.2, 0.7, -0.5, 0.6, 0.2],
    [h.rightLeg, 0, -1.0, 0.5, -0.4, 0.5],
    [h.leftArm, 0.4, -1.0, 0.2, 0.2, -1.2],
  ];
  spots.slice(0, 3 + Math.min(lv, 2)).forEach(([p, x, y, z, rx, rz]) => miniSoldier(M, p, x, y, z, 0.55, rx, rz));
  if (lv >= 1) {
    const black = M(0x0a0a0a);
    B(h.torso, 2.1, 0.3, 1.1, black, 0, -0.85, 0);
    for (const s of [-1, 1]) B(h.torso, 0.8, 0.45, 1.2, black, s * 1.35, 1.0, 0);
    gloves(h, black);
    B(h.head, 1.35, 0.35, 1.35, black, 0, 1.2, 0);
  }
  if (lv >= 2) {
    const armor = M(lv >= 4 ? 0x1a0033 : 0x5d0000);
    B(h.torso, 2.2, 1.5, 1.2, armor, 0, 0.25, 0);
    for (const s of [-1, 1]) {
      B(h.torso, 0.95, 0.55, 1.35, armor, s * 1.4, 1.05, 0);
      B(h.torso, 0.2, 0.6, 0.2, armor, s * 1.5, 1.55, 0).rotation.z = s * -0.4;
    }
    B(h.head, 1.45, 0.5, 1.45, armor, 0, 1.3, 0);
  }
  if (lv >= 3) {
    B(h.torso, 0.6, 0.6, 0.3, G(0xd500f9), 0, 0.35, 0.6); // crystal core
    B(h.torso, 0.3, 0.9, 0.2, G(0xea80fc), 0, 0.35, 0.68).rotation.z = Math.PI / 4;
    cape(h, M(0x1a0033), 3.6, 2.4);
  }
  if (lv >= 4) {
    for (const s of [-1, 1]) {
      B(h.torso, 0.08, 1.4, 0.06, neon, s * 0.9, 0.2, 0.62);
      B(h.torso, 1.0, 0.1, 1.4, neon, s * 1.4, 1.35, 0);
      const w = B(h.torso, 3.0, 2.0, 0.12, M(0x0b0014), s * 1.9, 1.2, -0.85);
      w.rotation.z = s * 0.45;
      B(h.torso, 2.8, 0.12, 0.14, neon, s * 2.0, 1.75, -0.85).rotation.z = s * 0.45;
    }
    // Shield on the left arm
    const sh = inHand(h.leftArm, -1.2);
    B(sh, 0.25, 2.2, 1.7, M(0x1a0033), 0.55, 0, 0);
    B(sh, 0.1, 1.6, 0.12, neon, 0.7, 0, 0);
    B(sh, 0.1, 0.12, 1.2, neon, 0.7, 0, 0);
  }
  // Weapon: void claws, a scimitar, then a greatsword
  const hand = inHand(h.rightArm);
  B(hand, 0.25, 0.5, 0.25, M(0x111111), 0, -0.2, 0);
  let tip;
  if (lv < 2) {
    for (const z of [-0.2, 0, 0.2]) B(hand, 0.08, 1.0, 0.08, voidG, 0, -0.8, z);
    tip = -1.3;
  } else if (lv < 4) {
    B(hand, 0.9, 0.15, 0.25, M(0x4a148c), 0, -0.45, 0);
    const steel = lv >= 3 ? voidG : M(0x9e9e9e);
    B(hand, 0.12, 1.2, 0.35, steel, 0, -1.1, 0);
    B(hand, 0.12, 0.9, 0.4, steel, 0, -2.0, 0.12).rotation.x = 0.25;
    B(hand, 0.12, 0.6, 0.35, steel, 0, -2.6, 0.38).rotation.x = 0.6;
    tip = -2.9;
  } else {
    B(hand, 1.4, 0.2, 0.3, M(0x311b92), 0, -0.5, 0);
    B(hand, 0.6, 3.4, 0.14, M(0x1a0033), 0, -2.3, 0);
    B(hand, 0.3, 3.2, 0.16, neon, 0, -2.3, 0);
    tip = -4.0;
  }
  setMuzzle(h, hand, 0, tip, 0);
  meleePose(h, lv >= 4 ? -1.0 : -0.3, 2);
  h.tracer = lv >= 4 ? 0xe040fb : 0xaa00ff;
  h.body.scale.setScalar(1 + lv * 0.06);
  return h;
}

/* ================================================================== 11. Golden Zed */

/**
 * Golden Zed (0-4): a spawner. A vehicle depot with gold accents and its golden tank waiting
 * inside. Lv 1 gold lamps, Lv 2 a gold roof emblem, Lv 3 gold pillars and a striped door, Lv 4 a
 * gold dome with a crown and glowing trim.
 */
function goldenZed(level) {
  const lv = Math.min(level, 4);
  const u = makeThing();
  const M = mm(u);
  const G = gm(u);
  const gold = M(0xffc107);
  const goldG = G(0xffd740);
  B(u.body, 4.6, 0.3, 4.6, M(lv >= 3 ? 0x8d7b4a : 0x616161), 0, 0.15, 0);
  const wall = M(lv >= 4 ? 0xfafafa : 0x546e7a);
  for (const x of [-1.95, 1.95]) B(u.body, 0.3, 3.6, 3.6, wall, x, 1.8, -0.3);
  B(u.body, 4.2, 3.6, 0.3, wall, 0, 1.8, -2.0);
  B(u.body, 4.3, 0.4, 3.8, M(0x37474f), 0, 3.75, -0.3);
  B(u.body, 4.4, 0.15, 0.2, gold, 0, 3.55, 1.6); // gold eave
  for (const x of [-1.95, 1.95]) B(u.body, 0.35, 0.2, 3.7, gold, x, 3.55, -0.3);
  if (lv >= 1) for (const x of [-1.6, 1.6]) B(u.body, 0.3, 0.3, 0.3, goldG, x, 3.2, 1.7); // lamps
  if (lv >= 2) {
    // Gold roof emblem: a Z
    B(u.body, 1.6, 0.25, 0.25, gold, 0, 4.6, 1.0);
    B(u.body, 1.6, 0.25, 0.25, gold, 0, 5.6, 1.0);
    B(u.body, 0.25, 1.3, 0.25, gold, 0, 5.1, 1.0).rotation.z = -0.95;
    B(u.body, 0.15, 0.6, 0.15, M(0x424242), 0, 4.2, 1.0);
  }
  if (lv >= 3) {
    for (const x of [-2.15, 2.15]) {
      B(u.body, 0.5, 3.8, 0.5, gold, x, 1.9, 1.5); // pillars
      B(u.body, 0.7, 0.3, 0.7, gold, x, 3.9, 1.5);
    }
    for (let i = 0; i < 6; i++) B(u.body, 3.6, 0.12, 0.08, M(i % 2 ? 0x212121 : 0xffc107), 0, 3.2 - i * 0.12, 1.55); // rolled-up door
  }
  if (lv >= 4) {
    B(u.body, 2.6, 0.8, 2.6, gold, 0, 4.35, -0.3); // dome
    B(u.body, 1.8, 0.6, 1.8, gold, 0, 5.0, -0.3);
    B(u.body, 1.0, 0.4, 1.0, gold, 0, 5.5, -0.3);
    for (const [x, z] of [[-0.4, 0.1], [0.4, 0.1], [0, -0.7]]) B(u.body, 0.2, 0.5, 0.2, goldG, x, 5.95, z - 0.3);
    for (const x of [-1.98, 1.98]) B(u.body, 0.05, 0.12, 3.5, goldG, x * 1.04, 0.5, -0.3);
  }
  const v = makeUnit(`gzed${lv + 1}`);
  v.root.scale.setScalar(lv >= 4 ? 0.45 : 0.55);
  v.root.position.set(0, 0.3, 0.1);
  u.body.add(v.root);
  u.mats.push(...v.mats);
  u.muzzles.push(mz(u.body, 0, 1.5, 2.0));
  u.height = 4.5;
  return u;
}

/* ================================================================== 12. Ice Apprentice */

/**
 * Ice Apprentice (0-4): a mage with a staff, a light blue ice torso and legs and a frozen ice cape.
 * Lv 1 short sleeves and dark gloves; Lv 2 a light blue top hat and suit and a new staff; Lv 3 a
 * bigger crystal with orbiting shards; Lv 4 light blue wings.
 */
function iceApprentice(level) {
  const lv = Math.min(level, 4);
  const suit = lv >= 2;
  const h = makeHumanoid({ skin: 0xf1d4c0, shirt: suit ? 0x4fc3f7 : 0xb3e5fc, pants: suit ? 0x0288d1 : 0x81d4fa, arms: suit ? 0x4fc3f7 : null, face: 'smile' });
  const M = mm(h);
  const G = gm(h);
  const iceGlow = G(0x80d8ff);
  // Ice cracks on the torso and legs
  for (const [x, y] of [[-0.5, 0.4], [0.4, -0.3]]) B(h.torso, 0.5, 0.12, 0.06, M(0xe1f5fe), x, y, 0.52);
  // Frozen ice cape
  const capeM = clear(h, 0xb3e5fc, 0.75);
  B(h.torso, 2.3, 3.4, 0.15, capeM, 0, -0.6, -0.62);
  for (const x of [-0.8, 0, 0.8]) B(h.torso, 0.35, 0.5, 0.15, capeM, x, -2.5, -0.62); // icicle hem
  if (lv >= 1) {
    if (!suit) shortSleeves(h, M(0xb3e5fc));
    gloves(h, M(0x263238));
  }
  if (suit) {
    // Suit: white shirt front, dark tie, light blue top hat
    B(h.torso, 0.6, 1.6, 0.06, M(0xfafafa), 0, 0.15, 0.52);
    B(h.torso, 0.2, 1.2, 0.08, M(0x01579b), 0, 0.1, 0.56);
    for (const s of [-1, 1]) B(h.torso, 0.35, 1.4, 0.08, M(0x29b6f6), s * 0.45, 0.3, 0.53).rotation.z = s * 0.25;
    const hat = M(0x81d4fa);
    B(h.head, 1.7, 0.12, 1.7, hat, 0, 1.25, 0);
    B(h.head, 1.15, 1.1, 1.15, hat, 0, 1.85, 0);
    B(h.head, 1.2, 0.2, 1.2, M(0x0277bd), 0, 1.4, 0);
    B(h.head, 0.25, 0.25, 0.08, iceGlow, 0.35, 1.4, 0.62);
  } else {
    // Hood of frost
    B(h.head, 1.35, 0.4, 1.35, M(0xb3e5fc), 0, 1.3, -0.05);
  }
  if (lv >= 4) {
    const wing = clear(h, 0x81d4fa, 0.75, true);
    for (const s of [-1, 1]) {
      B(h.torso, 0.15, 2.4, 2.6, wing, s * 0.9, 0.9, -1.4).rotation.set(0.25, s * 0.55, s * 0.4);
      B(h.torso, 0.12, 1.6, 2.0, wing, s * 1.9, 1.8, -1.9).rotation.set(0.35, s * 0.8, s * 0.7);
    }
  }
  // Staff held upright in the right hand
  h.rightArm.rotation.set(-0.9, 0, 0.1);
  h.leftArm.rotation.set(-0.3, 0, -0.15);
  h.pose = { right: -0.9, left: -0.3, leftRecoil: 0 };
  const hand = inHand(h.rightArm);
  const staff = group(hand);
  staff.rotation.x = 0.9;
  B(staff, 0.2, 4.0, 0.2, M(suit ? 0xcfd8dc : 0x6d4c41), 0, 0.5, 0);
  const cs = lv >= 3 ? 0.75 : suit ? 0.6 : 0.45;
  if (suit) {
    for (const s of [-1, 1]) B(staff, 0.12, 0.6, 0.12, M(0xcfd8dc), s * 0.25, 2.5, 0).rotation.z = s * 0.4; // prongs
  }
  B(staff, cs, cs * 1.4, cs, iceGlow, 0, 2.7 + cs * 0.4, 0).rotation.y = Math.PI / 4;
  if (lv >= 3) {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      B(staff, 0.2, 0.35, 0.2, G(0xe1f5fe), Math.cos(a) * 0.8, 2.9, Math.sin(a) * 0.8);
    }
  }
  setMuzzle(h, staff, 0, 2.7 + cs * 0.4, 0);
  h.tracer = 0x80d8ff;
  h.tracerWidth = 0.3;
  return h;
}

/* ================================================================== 13. Time Dilator: machines8.js */

/* ================================================================== 14. Barracks (rework) */

/** A plain green soldier (Barracks squads). */
export function greenSoldier() {
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: 0x4caf50, pants: 0x2e7d32, arms: 0x4caf50, face: 'soldier' });
  const M = mm(h);
  helmet(h, 0x33691e);
  B(h.torso, 2.1, 0.22, 1.1, M(0x3e2723), 0, -0.85, 0);
  B(h.torso, 1.2, 1.2, 0.5, M(0x558b2f), 0, 0, -0.7); // pack
  holdLongGun(h, 1.5, M(0x262626));
  h.tracer = 0xffc107;
  return h;
}

/** A Tuber: a green soldier with a bazooka tube on the shoulder. */
export function tuberSoldier() {
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: 0x558b2f, pants: 0x33691e, arms: 0x558b2f, face: 'soldier' });
  const M = mm(h);
  helmet(h, 0x33691e);
  B(h.torso, 2.1, 0.22, 1.1, M(0x3e2723), 0, -0.85, 0);
  for (const x of [-0.4, 0.4]) B(h.torso, 0.4, 1.1, 0.4, M(0x4b5320), x, 0, -0.75); // spare rockets
  const gun = holdLongGun(h, 2.4, M(0x4b5320));
  B(gun, 0.62, 2.6, 0.62, M(0x556b2f), 0, -1.0, 0.25);
  B(gun, 0.75, 0.3, 0.75, M(0x212121), 0, -2.3, 0.25);
  B(gun, 0.3, 0.5, 0.3, M(0x212121), 0, -0.6, -0.3); // grip
  h.muzzles[0].position.set(0, -2.5, 0.25);
  h.projectile = { color: 0xff6d00, size: 0.4, arc: 1.2 };
  h.tracer = 0xff6d00;
  h.size = 1.05;
  return h;
}

/** A tough commando in dark gear with a big gun. */
export function commandoSoldier() {
  const h = makeHumanoid({ skin: 0xc68642, shirt: 0x263238, pants: 0x1c2429, arms: 0x263238, face: 'soldier' });
  const M = mm(h);
  const G = gm(h);
  helmet(h, 0x111111);
  B(h.head, 1.1, 0.3, 0.15, G(0xff3d00), 0, 1.0, 0.68); // goggles
  B(h.torso, 2.3, 1.8, 1.25, M(0x37474f), 0, 0.05, 0); // heavy vest
  for (const s of [-1, 1]) B(h.torso, 0.9, 0.5, 1.3, M(0x37474f), s * 1.35, 1.0, 0);
  for (const x of [-0.5, 0, 0.5]) B(h.torso, 0.35, 0.5, 0.2, M(0x4b5320), x, -0.3, 0.68); // pouches
  gloves(h, M(0x111111));
  const gun = holdLongGun(h, 2.0, M(0x212121));
  B(gun, 0.75, 1.1, 0.8, M(0x2b2b2b), 0, -0.5, 0);
  B(gun, 0.6, 0.6, 0.6, M(0x4b5320), 0, -0.6, -0.6); // drum
  for (const x of [-0.12, 0.12]) B(gun, 0.12, 0.6, 0.12, M(0x111111), x, -2.1, 0);
  h.muzzles[0].position.y = -2.4;
  h.tracer = 0xffab40;
  h.size = 1.25;
  return h;
}


/* ================================================================== 15. Knifer (rework) */

/**
 * Knifer (0-4): a grey outfit, a black bandana mask and one knife. Lv 1 a black glove; Lv 2 a grey
 * cape; Lv 3 a second knife; Lv 4 a darker outfit, a black cape, a black hooded top and red-metal
 * knives.
 */
function kniferI(level) {
  const lv = Math.min(level, 4);
  const dark = lv >= 4;
  const shirt = dark ? 0x111111 : 0x757575;
  const h = makeHumanoid({ skin: 0xd9a066, shirt, pants: dark ? 0x263238 : 0x616161, arms: shirt, face: 'agent' });
  const M = mm(h);
  B(h.head, 1.25, 0.55, 0.1, M(0x111111), 0, 0.35, 0.62); // bandana mask
  B(h.head, 1.28, 0.55, 1.28, M(0x111111), 0, 0.35, 0); // wrapped round
  B(h.head, 0.3, 0.6, 0.1, M(0x111111), 0.1, 0.1, -0.7); // knot tails
  B(h.torso, 2.1, 0.22, 1.1, M(0x212121), 0, -0.85, 0);
  if (lv >= 1) gloves(h, M(0x111111), [h.rightArm]);
  if (lv >= 3) gloves(h, M(0x111111), [h.leftArm]);
  if (lv >= 2) cape(h, M(dark ? 0x0a0a0a : 0x9e9e9e), 3.0);
  if (dark) {
    // Black hood
    const hood = M(0x0d0d0d);
    B(h.head, 1.45, 0.4, 1.45, hood, 0, 1.3, -0.05);
    for (const s of [-1, 1]) B(h.head, 0.12, 1.1, 1.45, hood, s * 0.72, 0.75, -0.05);
    B(h.head, 1.45, 1.2, 0.12, hood, 0, 0.75, -0.72);
    for (const x of [-0.6, 0.6]) B(h.torso, 0.15, 0.45, 0.15, M(0x8b0000), x, -0.9, 0.6); // spare knives
  }
  const blade = dark ? M(0xb71c1c) : M(0xcfd8dc);
  if (dark) {
    blade.emissive.setHex(0x3a0000);
    blade.userData.glow = 0x3a0000;
  }
  const len = dark ? 1.6 : 1.3;
  const knife = (arm) => {
    const g = inHand(arm);
    B(g, 0.25, 0.5, 0.25, M(0x3e2723), 0, -0.15, 0);
    B(g, 0.45, 0.1, 0.3, M(0x424242), 0, -0.42, 0);
    B(g, 0.1, len, 0.4, blade, 0, -0.45 - len / 2, 0);
    return g;
  };
  const right = knife(h.rightArm);
  setMuzzle(h, right, 0, -0.45 - len, 0);
  if (lv >= 3) {
    knife(h.leftArm);
    meleePose(h, -2.0, 1.7);
    h.leftArm.rotation.set(-2.0, 0, -0.2);
  } else meleePose(h, -0.6, 1.7);
  h.blade = { color: dark ? 0xff1744 : 0xcfd8dc, size: 1 };
  h.tracer = dark ? 0xff1744 : 0xffffff;
  return h;
}

/* ================================================================== units */

function tbsquad(count) {
  return squad(newUnit(), count, () => greenSoldier());
}

function tbtuber(count) {
  return squad(newUnit(), count, () => tuberSoldier());
}

function tbcommando(count) {
  return squad(newUnit(), count, () => commandoSoldier());
}

/** A small void-traitor supporter: a dark purple armored soldier with glowing eyes. */
function vtsupport(count) {
  return squad(newUnit(), count, () => {
    const h = makeHumanoid({ skin: 0x311b92, shirt: 0x4a148c, pants: 0x1a0033, arms: 0x4a148c, face: 'none' });
    const M = mm(h);
    const G = gm(h);
    const rune = G(0xd500f9);
    B(h.head, 1.4, 1.35, 1.4, M(0x1a0033), 0, 0.65, -0.03); // helm
    for (const x of [-0.28, 0.28]) B(h.head, 0.22, 0.14, 0.05, rune, x, 0.72, 0.68); // glowing eyes
    B(h.torso, 2.2, 1.7, 1.2, M(0x2a1040), 0, 0.15, 0); // armor
    for (const s of [-1, 1]) B(h.torso, 0.85, 0.5, 1.3, M(0x2a1040), s * 1.35, 1.0, 0);
    B(h.torso, 0.4, 0.4, 0.1, rune, 0, 0.4, 0.62);
    const gun = holdLongGun(h, 1.6, M(0x1a0033));
    B(gun, 0.5, 0.7, 0.55, M(0x311b92), 0, -0.4, 0);
    B(gun, 0.4, 0.12, 0.45, rune, 0, -1.0, 0);
    B(gun, 0.25, 0.25, 0.25, rune, 0, -1.6, 0);
    h.tracer = 0xd500f9;
    h.size = 0.85;
    return h;
  });
}

/* ================================================================== Engineer devices */

/**
 * Sentry Engineer devices (placed through makeSentry as tier 200 + n). n 0-4: Sentry MK I-V (a
 * tripod gun turret that grows meaner; MK V "Bastion" heavy with glowing red). 5-7: Mender MK
 * I-III (a pylon with a green cross and a glowing healing emitter; MK III "Eden" with plants). 8-9:
 * Teleporter MK I-II (a flat pad with a glowing ring). `turret` turns, `muzzles[0]` fires.
 */
export function makeEngDevice(n) {
  const u = makeThing();
  const M = mm(u);
  const G = gm(u);
  if (n <= 4) {
    const bastion = n >= 4;
    const metal = M([0x9e9e9e, 0x78909c, 0x546e7a, 0x37474f, 0x212121][n]);
    const legLen = 1.6 + n * 0.12;
    for (const a of [0, 2.1, 4.2]) {
      const leg = B(u.body, 0.2 + n * 0.04, legLen, 0.2 + n * 0.04, M(0x424242), Math.sin(a) * 0.65, legLen * 0.44, Math.cos(a) * 0.65);
      leg.rotation.set(Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4);
    }
    if (bastion) B(u.body, 2.2, 0.4, 2.2, M(0x263238), 0, 0.2, 0);
    const big = 1 + n * 0.12;
    const t = turret(u, 1.5 + n * 0.1);
    B(t, 1.1 * big, 0.8 * big, 1.3 * big, metal, 0, 0.3, 0);
    B(t, 0.5, 0.2, 0.1, G(bastion ? 0xff1744 : n >= 2 ? 0xffab00 : 0x76ff03), 0, 0.3 + 0.35 * big, 0.66 * big); // sensor
    const barrel = 1.0 + n * 0.25;
    const front = 0.65 * big;
    if (n <= 1) {
      B(t, 0.2, 0.2, barrel, M(0x212121), 0, 0.3, front + barrel / 2);
      gunMuzzle(u, t, 0, 0.3, front + barrel);
    } else {
      for (const x of [-0.2, 0.2]) {
        B(t, 0.16, 0.16, barrel, M(0x212121), x, 0.3, front + barrel / 2);
        gunMuzzle(u, t, x, 0.3, front + barrel);
      }
      if (n >= 3) {
        for (const s of [-1, 1]) B(t, 0.15, 0.9 * big, 1.2 * big, metal, s * 0.65 * big, 0.3, 0.1); // side armor
      }
    }
    if (bastion) {
      for (const s of [-1, 1]) {
        B(t, 0.1, 0.12, 1.2, G(0xff1744), s * 0.72 * big, 0.6, 0.2);
        B(t, 0.6, 0.6, 1.0, M(0x3e2723), s * 1.1 * big, 0.6, 0); // rocket pods
        B(t, 0.35, 0.35, 0.06, G(0xff1744), s * 1.1 * big, 0.6, 0.52);
      }
      B(t, 1.2 * big, 0.12, 0.06, G(0xff1744), 0, 0.3 + 0.5 * big, front + 0.02); // red visor band
      u.cannon = mz(t, 1.1 * big, 0.6, 0.6);
    }
    u.tracer = bastion ? 0xff5252 : n >= 2 ? 0xffd54f : 0xffe082;
    u.height = 2.6 + n * 0.25;
    return u;
  }
  if (n <= 7) {
    const k = n - 5;
    const eden = k >= 2;
    const green = G(0x69f0ae);
    B(u.body, 1.8 + k * 0.3, 0.3, 1.8 + k * 0.3, M(eden ? 0x6d4c41 : 0x607d8b), 0, 0.15, 0);
    const t = turret(u, 0.3);
    B(t, 1.1, 1.4 + k * 0.2, 1.1, M(eden ? 0xeceff1 : 0xcfd8dc), 0, 0.7 + k * 0.1, 0); // pylon
    const cy = 0.8 + k * 0.1;
    for (const s of [-1, 1]) {
      B(t, 0.6, 0.2, 0.05, M(0x2e7d32), 0, cy, s * 0.56);
      B(t, 0.2, 0.6, 0.05, M(0x2e7d32), 0, cy, s * 0.56);
    }
    const top = 1.4 + k * 0.2;
    B(t, 0.5, 0.15, 0.5, M(0x455a64), 0, top + 0.1, 0);
    B(t, 0.4, 0.4, 0.4, green, 0, top + 0.4, 0).rotation.y = Math.PI / 4; // emitter
    const glowHalo = clear(u, 0x69f0ae, 0.3, true);
    B(t, 0.75, 0.75, 0.75, glowHalo, 0, top + 0.4, 0).rotation.y = Math.PI / 4;
    if (k >= 1) for (const s of [-1, 1]) B(t, 0.1, 0.8, 0.1, M(0x9e9e9e), s * 0.45, top + 0.4, 0); // emitter prongs
    if (eden) {
      // Eden: little plants and flowers around the base, glowing leaves
      const leaf = M(0x43a047);
      for (const [x, z] of [[-0.9, 0.9], [0.9, 0.9], [-0.9, -0.9], [0.9, -0.9], [0, 1.0]]) {
        B(u.body, 0.3, 0.4, 0.3, leaf, x, 0.5, z);
        B(u.body, 0.18, 0.18, 0.18, G(x > 0 ? 0xff80ab : 0xfff176), x, 0.78, z);
      }
      for (const s of [-1, 1]) B(t, 0.25, 0.5, 0.06, G(0xb9f6ca), s * 0.35, top + 0.85, 0).rotation.z = s * 0.5;
    }
    gunMuzzle(u, t, 0, top + 0.4, 0);
    u.tracer = 0x69f0ae;
    u.height = top + 1.0;
    return u;
  }
  // Teleporter pad
  const k = n - 8;
  const ringC = k >= 1 ? 0xd500f9 : 0x40c4ff;
  B(u.body, 2.4, 0.3, 2.4, M(0x37474f), 0, 0.15, 0);
  B(u.body, 2.0, 0.08, 2.0, M(0x263238), 0, 0.34, 0);
  const t = turret(u, 0.4);
  const ringM = G(ringC);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    B(t, 0.45, 0.08, 0.15, ringM, Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8).rotation.y = -a + Math.PI / 2;
  }
  const field = part(t, cylGeo(0.7, 0.7, 0.04, 16), clear(u, ringC, 0.4, true), 0, 0.02, 0);
  field.castShadow = false;
  if (k >= 1) {
    for (const [x, z] of [[-1.05, -1.05], [1.05, -1.05], [-1.05, 1.05], [1.05, 1.05]]) {
      B(u.body, 0.2, 0.9, 0.2, M(0x455a64), x, 0.75, z);
      B(u.body, 0.22, 0.2, 0.22, ringM, x, 1.25, z);
    }
  }
  gunMuzzle(u, t, 0, 0.3, 0);
  u.tracer = ringC;
  u.height = 1.4;
  return u;
}

/* ------------------------------------------------------------------ exports */

export const TOWER_MODELS_I = {
  paralyzer,
  hunter,
  slugger,
  doctor,
  exterminator,
  spiritAdvocate,
  sentryEngineer,
  traitor,
  goldenZed,
  iceApprentice,
  knifer: kniferI,
};

export const UNIT_MODELS_I = {
  tbsquad,
  tbtuber,
  tbcommando,
  vtsupport,
};
