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

/** A cape hanging from the shoulders down the back. */
function cape(h, mat, len = 3.2, w = 2.2) {
  B(h.torso, w, len, 0.12, mat, 0, 1 - len / 2, -0.58);
  B(h.torso, w + 0.3, 0.3, 0.6, mat, 0, 0.95, -0.25); // collar over the shoulders
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

/* ================================================================== 5. Slugger */

/* ================================================================== 6. Doctor */

/* ================================================================== 7. Exterminator */

/* ================================================================== 8. Spirit Advocate */

/* ================================================================== 9. Sentry Engineer */

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
  goldenZed,
};

export const UNIT_MODELS_I = {
  tbsquad,
  tbtuber,
  tbcommando,
  vtsupport,
};
