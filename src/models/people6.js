// Tower models: people, batch 6 (dressed with the vehicle kit in ../vehicles.js).
// In here: Grenadier, Demo Expert, Assault Grenadier (+bottom), Firecracker, Frost Trooper,
// Freezer, Cryo Ranger (+bottom).
// Each makeX(level) builds one tower's look; TOWER_MODELS in ../models.js says which tower uses which.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.

import { glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import {
  GOLD, GUNMETAL, INK, STEEL, UP, WOOD, aimLong, armPatch, band, belt, cap, collar, dome, fist, goggles,
  hair, helmet, kneePad, muzzle, own, pouch, rifle, sash, shardOf, vest, wear,
} from './people1.js';
import { grenade, shoulderPads } from './people2.js';
import { beanie } from './people3.js';
import { feet, hands, hood } from './people5.js';

const PI = Math.PI;
const OLIVE = 0x33691e;
const TNT = 0xc62828;
const ICE = 0x80d8ff;

// ------------------------------------------------------------------ shared bits for this batch

/** A pineapple grenade in the fist (gun space): ribbed body, fuze, spoon and pin ring. Returns the fuze tip y. */
function heldNade(k, col, r = 0.3, glow) {
  const y = -0.42;
  k.ball(r, col, 0, y, 0, { sy: 1.25, seg: 14, rows: 9 });
  for (const t of [-0.5, 0, 0.5]) k.torus(r * Math.sqrt(1 - t * t * 0.5), 0.022, tone(col, 0.65), 0, y + t * r * 1.1, 0, { rx: PI / 2, seg: 16 });
  for (let i = 0; i < 4; i++) k.torus(r, 0.02, tone(col, 0.65), 0, y, 0, { ry: (i * PI) / 4, seg: 16, sy: 1.25 });
  if (glow) k.cyl(r * 0.5, 0.06, glow, 0, y, r * 0.95, { axis: 'z', seg: 12 }); // light
  const top = y - r * 1.25;
  k.cyl(0.1, 0.16, STEEL, 0, top - 0.04, 0, { seg: 10 }); // fuze
  k.box(0.07, r * 1.7, 0.05, STEEL, 0, y - r * 0.35, r + 0.05, { rx: -0.08 }); // spoon
  k.torus(0.1, 0.02, 0xbdbdbd, 0.16, top - 0.08, 0, { ry: PI / 2, seg: 12 }); // pin ring
  return top - 0.12;
}

/** Sticks of dynamite taped in a bundle (gun space), with a lit fuse. Returns the fuse tip y. */
function heldTnt(k, n, fuse, len = 0.95) {
  const xs = n === 1 ? [0] : n === 2 ? [-0.11, 0.11] : [-0.2, 0, 0.2];
  for (const x of xs) {
    k.cyl(0.11, len, TNT, x, -0.3, x === 0 && n === 3 ? 0.1 : 0, { seg: 10 });
    k.cyl(0.115, 0.06, 0xf5e6c8, x, -0.3 - len / 2, x === 0 && n === 3 ? 0.1 : 0, { seg: 10 }); // paper end
  }
  if (n > 1) for (const y of [-0.05, -0.55]) k.box(n * 0.24 + 0.04, 0.12, 0.3, 0x9e9e9e, 0, y, 0.03, { r: 0.03 }); // tape
  const tip = -0.3 - len / 2;
  k.tube([[0, tip, 0], [0.08, tip - 0.2, 0.05], [0.02, tip - 0.4, 0.12]], 0.025, 0x3e2723, { seg: 8, sides: 4 });
  k.ball(0.07, fuse, 0.02, tip - 0.42, 0.12, { seg: 8, rows: 6 }); // spark
  return tip - 0.42;
}

/** A Stiel stick grenade (gun space): wooden handle, steel head, screw cap. Returns the head tip y. */
function heldStiel(k, head) {
  k.cyl(0.1, 1.0, 0x8d6e63, 0, -0.25, 0, { seg: 10 }); // handle
  k.cyl(0.12, 0.08, STEEL, 0, 0.27, 0, { seg: 10 }); // cap
  k.cyl(0.3, 0.55, head, 0, -1.0, 0, { seg: 16 });
  k.cyl(0.31, 0.06, tone(head, 0.7), 0, -0.75, 0, { seg: 16 });
  k.cyl(0.31, 0.06, tone(head, 0.7), 0, -1.25, 0, { seg: 16 });
  k.box(0.04, 0.3, 0.02, 0xfafafa, 0, -1.0, 0.31); // stencil
  return -1.3;
}

/** A firecracker: red paper tube with gold caps and a twisted fuse (any space; its fuse end along -y). */
function cracker(k, x, y, z, fuse, o = {}) {
  const r = o.r ?? 0.14;
  const len = o.len ?? 0.75;
  k.cyl(r, len, 0xd50000, x, y, z, { seg: 12 });
  for (const s of [-1, 1]) k.cyl(r + 0.02, 0.08, GOLD, x, y + s * (len / 2 - 0.04), z, { seg: 12 });
  k.box(r * 1.5, 0.12, 0.02, GOLD, x, y, z + r, { r: 0.01 }); // gold label
  k.cyl(0.025, 0.25, 0xf5e6c8, x, y - len / 2 - 0.12, z, { seg: 5 });
  if (fuse) k.ball(0.06, fuse, x, y - len / 2 - 0.27, z, { seg: 8, rows: 5 });
}

/** A web belt with grenades hanging off it (torso space). */
function nadeBelt(k, col, nade = OLIVE) {
  belt(k, col, 0x9e9e9e, -0.86);
  for (const x of [-0.6, 0, 0.6]) {
    k.box(0.12, 0.2, 0.05, col, x, -0.72, 0.6); // loop
    grenade(k, x, -0.55, 0.72, nade);
  }
}

/** A strap across the chest with grenades on it (torso space; side as in sash). */
function nadeStrap(k, side, col, nade = OLIVE) {
  sash(k, col, side, 0.3);
  const rz = side * 0.62;
  for (const t of [-0.6, 0, 0.6]) grenade(k, -Math.sin(rz) * t, Math.cos(rz) * t, 0.72, nade);
}

/** A satchel on the hip with a flap, buckles and its strap over the other shoulder (torso space). */
export function satchel(k, col, side = -1) {
  sash(k, tone(col, 0.7), -side, 0.22);
  const x = side * 1.12;
  k.box(0.36, 0.8, 0.95, col, x, -0.8, 0, { r: 0.08 });
  k.box(0.4, 0.34, 0.98, tone(col, 0.85), x, -0.52, 0, { r: 0.05 });
  for (const z of [-0.25, 0.25]) k.box(0.42, 0.08, 0.1, 0xb0b0b0, x, -0.6, z);
}

/** A neck scarf with two tails hanging down the chest (torso space). */
export function neckScarf(k, col) {
  k.torus(0.62, 0.17, col, 0, 0.92, 0, { rx: PI / 2, seg: 18 });
  k.ball(0.2, tone(col, 0.9), 0.3, 0.8, 0.55, { seg: 10, rows: 7 }); // knot
  k.box(0.3, 0.8, 0.1, col, 0.38, 0.35, 0.6, { r: 0.04, rz: -0.1 });
  k.box(0.28, 0.6, 0.1, tone(col, 0.85), 0.12, 0.42, 0.62, { r: 0.04, rz: 0.12 });
}

/** A hard hat: shell, brim, centre ridge and a lamp on the front (head space). */
export function hardHat(k, col, lamp) {
  dome(k, 0.76, 0.62, col, 0, 0.95, 0);
  k.cyl(0.9, 0.06, col, 0, 0.95, 0.05, { seg: 22, sz: 1.08 });
  k.box(0.2, 0.12, 1.3, tone(col, 0.85), 0, 1.5, 0, { r: 0.05 });
  k.box(0.34, 0.26, 0.2, INK, 0, 1.12, 0.72, { r: 0.04 });
  k.cyl(0.1, 0.04, lamp, 0, 1.12, 0.83, { axis: 'z', seg: 12 });
}

/** An icicle hanging point-down (any space). */
function icicle(k, x, y, z, len, mat) {
  k.cyl(0.08, len, mat, x, y - len / 2, z, { seg: 6, r2: 0.0001 });
}

/** A standing ice crystal: two six-sided cones (any space; its foot at y). */
export function shard(k, x, y, z, hgt, r, mat, o = {}) {
  k.cyl(r, hgt * 0.75, mat, x, y + hgt * 0.375, z, { seg: 6, r2: r * 0.8, ...o });
  k.cyl(r * 0.8, hgt * 0.25, mat, x, y + hgt * 0.875, z, { seg: 6, r2: 0.0001, ...o });
}

/** A coolant tank on the back: round bottle(s) with caps, a frost band and a hose to the right hand. */
function coolant(k, col, light, o = {}) {
  const n = o.n ?? 1;
  const r = o.r ?? 0.45;
  const hh = o.h ?? 1.5;
  const z = -0.55 - r;
  const xs = n === 1 ? [0] : [-r - 0.04, r + 0.04];
  for (const x of xs) {
    k.cyl(r, hh, col, x, 0.05, z, { seg: 16 });
    for (const s of [-1, 1]) k.ball(r, col, x, 0.05 + s * hh / 2, z, { sy: 0.4, seg: 16, rows: 6 });
    k.cyl(0.13, 0.18, STEEL, x, 0.05 + hh / 2 + r * 0.4, z, { seg: 10 }); // valve
    k.torus(0.12, 0.03, 0xd32f2f, x, 0.05 + hh / 2 + r * 0.4 + 0.12, z, { rx: PI / 2, seg: 10 }); // wheel
    k.cyl(r + 0.02, 0.18, light, x, -0.2, z, { seg: 16 }); // glowing band
  }
  k.box(n * r * 2 + 0.3, 0.14, 0.2, INK, 0, 0.6, -0.55, { r: 0.03 }); // harness bar
  for (const s of [-1, 1]) {
    k.box(0.22, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
    k.box(0.22, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
  }
  k.tube([[n === 1 ? 0 : -r, -0.75, z], [-1.0, -0.95, -0.4], [-1.25, -0.6, 0.2]], 0.07, o.hose ?? 0x37474f, { seg: 12, sides: 6 });
}

/**
 * A chunky cryo gun on the fist (gun space): round body, pistol grip, front grip, glowing coils
 * and a flared nozzle. o: len, body, light, coils, crystal (a glow material for a core on top),
 * can (a side canister). Returns the nozzle tip y.
 */
function cryoGun(k, o = {}) {
  const len = o.len ?? 2.0;
  const body = o.body ?? 0xeceff1;
  const U = UP;
  k.box(0.32, 0.5, 0.42, tone(body, 0.75), 0, 0.42, U - 0.04, { r: 0.06 }); // short stock
  k.cyl(0.24, 1.1, body, 0, -0.4, U + 0.02, { seg: 16 }); // body
  k.cyl(0.26, 0.08, INK, 0, 0.12, U + 0.02, { seg: 16 });
  k.box(0.22, 0.26, 0.5, INK, 0, 0.1, U - 0.36, { rx: -0.32, r: 0.04 }); // pistol grip
  k.torus(0.1, 0.022, INK, 0, -0.14, U - 0.24, { ry: PI / 2, seg: 10, arc: PI });
  k.box(0.18, 0.18, 0.4, INK, 0, -0.75, U - 0.3, { r: 0.04 }); // front grip
  const bl = len - 0.95;
  k.cyl(0.14, bl, tone(body, 0.85), 0, -0.95 - bl / 2, U + 0.02, { seg: 12 }); // barrel
  const n = o.coils ?? 2;
  for (let i = 0; i < n; i++) k.torus(0.17, 0.045, o.light, 0, -1.05 - (i * (bl - 0.4)) / n, U + 0.02, { rx: PI / 2, seg: 14 });
  k.cyl(0.26, 0.3, INK, 0, -len + 0.15, U + 0.02, { seg: 14, r2: 0.16 }); // flared nozzle (wide end out)
  k.cyl(0.2, 0.04, o.light, 0, -len - 0.01, U + 0.02, { seg: 14 });
  if (o.crystal) shard(k, 0, U + 0.2, -0.4, 0.5, 0.14, o.crystal, { rx: 0 });
  if (o.can) {
    k.cyl(0.16, 0.7, 0x90a4ae, 0.3, -0.45, U, { seg: 12 });
    k.cyl(0.17, 0.08, o.light, 0.3, -0.45, U, { seg: 12 });
    k.cyl(0.06, 0.1, STEEL, 0.3, -0.85, U, { seg: 8 });
  }
  return -len - 0.02;
}

/** Arms up for a throw: the thrower's pose all the grenadiers share. */
export function throwPose(h) {
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -2.8, left: -1.0, leftRecoil: 0 };
  h.swing = 1.9;
}

/** The left hand's spare (Double Pin / Double Pack): its own fist group so the rig sees it as held. */
export function spare(h, key, build) {
  const g = fist(h.leftArm, -1.9, 1.1);
  const k = wear(h, g, `${key}:spare`);
  build(k);
  k.done();
}

// ------------------------------------------------------------------ Grenadier

/**
 * Grenadier: a helmeted soldier throwing grenades. Lv 1 a grenade belt, Lv 2 goggles on the
 * helmet and a satchel, Lv 3 a chest strap of grenades and a spare in the left hand, Lv 4
 * Demolitionist: a hard hat, a work coat and dynamite.
 */
export function makeGrenadier(level) {
  const demo = level >= 4;
  const shirt = demo ? 0x5d4037 : 0x6d7b4a;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x4b5530, arms: shirt, face: 'soldier' });
  const key = `grenadier${level}`;
  const fuse = glowMat(h, 0xffeb3b);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (demo) {
    hardHat(hd, 0xfbc02d, glowMat(h, 0xfff59d));
    // a work coat with reflective stripes and a pocket of sticks
    t.box(2.2, 1.9, 1.16, shirt, 0, 0.05, 0, { r: 0.12 });
    collar(t, tone(shirt, 0.8));
    for (const y of [0.25, -0.35]) t.box(2.24, 0.14, 1.2, 0xffee58, 0, y, 0);
    t.box(0.5, 0.45, 0.1, tone(shirt, 0.85), 0.55, -0.6, 0.6, { r: 0.03 });
    for (const x of [0.45, 0.6]) t.cyl(0.07, 0.4, TNT, x, -0.3, 0.64, { seg: 8 });
  } else {
    helmet(hd, 0x556b2f, { cover: 0x4b5530 });
    collar(t, tone(shirt, 0.85));
    t.box(0.06, 1.5, 0.05, tone(shirt, 0.7), 0, -0.1, 0.56); // jacket seam
  }
  if (level >= 1) nadeBelt(t, 0x4e342e, demo ? TNT : OLIVE);
  if (level >= 2) {
    goggles(hd, demo ? 1.32 : 1.18, 0xffb74d, { r: demo ? 0.78 : 0.77 });
    satchel(t, 0x6d4c41);
  }
  if (level >= 3) nadeStrap(t, 1, 0x4e342e, demo ? TNT : OLIVE);
  hd.done();
  t.done();
  hands(h, key, 0x5d4037, tone(shirt, 0.8), (a, s) => armPatch(a, s, tone(shirt, 0.8), s > 0 ? 0xffd54f : null));
  feet(h, key, 0x4e3b2a, level >= 3 ? kneePad : null);
  if (level >= 3) spare(h, key, (k) => (demo ? heldTnt(k, 1, fuse) : heldNade(k, OLIVE, 0.26)));
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const tip = demo ? heldTnt(gk, level >= 5 ? 3 : 2, fuse) : heldNade(gk, OLIVE);
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tip * 0.6, 0);
  throwPose(h);
  h.projectile = demo ? { color: 0xc62828, size: 0.4, arc: 4.5 } : { color: 0x33691e, size: 0.5, arc: 3.5 };
  return own(h, 0);
}

// ------------------------------------------------------------------ Demo Expert

/**
 * A 40 mm grenade launcher on the fist (gun space): wooden stock, a fat barrel with a dark bore,
 * a leaf sight. o.drum: a six-shot revolving drum, o.heavy: a bigger barrel with a yellow ring.
 * Returns the bore point [y, z].
 */
function launcher(k, o = {}) {
  const U = UP;
  const r = o.heavy ? 0.3 : 0.24;
  const len = o.heavy ? 2.2 : 1.9;
  const B = U + 0.06;
  k.box(0.28, 0.8, 0.4, WOOD, 0, 0.5, U - 0.08, { r: 0.07 }); // stock
  k.box(0.3, 0.1, 0.46, INK, 0, 0.92, U - 0.08, { r: 0.02 }); // butt pad
  k.box(0.22, 0.26, 0.5, WOOD, 0, 0.08, U - 0.34, { rx: -0.32, r: 0.05 }); // grip
  k.torus(0.1, 0.022, INK, 0, -0.16, U - 0.24, { ry: PI / 2, seg: 10, arc: PI });
  k.box(0.32, 0.5, 0.36, GUNMETAL, 0, -0.1, U, { r: 0.04 }); // receiver
  const b0 = o.drum ? -0.95 : -0.35;
  if (o.drum) {
    k.cyl(0.42, 0.6, INK, 0, -0.62, B - 0.08, { seg: 18 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      k.cyl(0.11, 0.62, 0x5d4037, Math.sin(a) * 0.27, -0.62, B - 0.08 + Math.cos(a) * 0.27, { seg: 8 });
    }
    k.cyl(0.08, 0.7, STEEL, 0, -0.62, B - 0.08, { seg: 8 }); // axle
  }
  const bl = len + b0;
  k.cyl(r, bl, 0x37474f, 0, b0 - bl / 2, B, { seg: 16 });
  k.cyl(r - 0.07, 0.04, 0x050505, 0, -len - 0.01, B, { seg: 14 }); // bore
  for (let i = 0; i < 3; i++) k.torus(r + 0.01, 0.02, INK, 0, b0 - 0.3 - i * 0.25, B, { rx: PI / 2, seg: 14 }); // grip rings
  k.box(0.2, 0.4, 0.1, INK, 0, -0.25, B + r + 0.02, { rx: -0.35 }); // leaf sight
  k.box(0.05, 0.12, 0.1, INK, 0, -len + 0.12, B + r + 0.04);
  if (o.heavy) k.cyl(r + 0.05, 0.16, 0xfbc02d, 0, -len + 0.08, B, { seg: 16 });
  return [-len, B];
}

/** A row of 40 mm shells on a strap across the chest (torso space; side as in sash). */
function shellStrap(k, side, strap) {
  const rz = side * 0.62;
  k.box(0.32, 2.5, 1.12, strap, 0, 0, 0, { rz });
  for (let i = 0; i < 5; i++) {
    const t = -0.85 + i * 0.42;
    const x = -Math.sin(rz) * t;
    const y = Math.cos(rz) * t;
    k.cyl(0.13, 0.3, 0xc9a227, x, y, 0.64, { rz: rz + PI / 2, seg: 10 });
    k.ball(0.12, 0x455a64, x + Math.cos(rz) * 0.17, y + Math.sin(rz) * 0.17, 0.64, { seg: 8, rows: 6 });
  }
}

/**
 * Demo Expert (alternate Grenadier form): a demolitions expert in a dark coat with a 40 mm
 * launcher. Lv 1 a shell bandolier, Lv 2 goggles and a pack of sticky charges, Lv 3 a drum
 * launcher, Lv 4 a heavy armoured vest and a bigger barrel.
 */
export function makeGrenadierDemo(level) {
  const heavy = level >= 4;
  const coat = heavy ? 0x212121 : 0x263850;
  const h = makeHumanoid({ skin: 0x8d5524, shirt: coat, pants: 0x1c1c22, arms: coat, face: 'soldier' });
  const key = `grenadierDemo${level}`;
  const red = glowMat(h, 0xff5252);
  const lens = glowMat(h, 0x4fc3f7);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  beanie(hd, heavy ? 0x111111 : 0x1a237e, 0.55);
  hd.box(0.36, 0.24, 0.04, shardOf(h), 0, 1.0, 0.74); // Dimension Shard badge
  // a long dark coat with a raised collar
  t.box(2.2, 1.9, 1.16, coat, 0, 0.05, 0, { r: 0.12 });
  t.slab(2.16, 1.3, 0.14, coat, 0, -1.4, -0.58, { bw: 1.08 }); // coat tail
  t.box(2.2, 0.32, 1.18, tone(coat, 0.85), 0, 0.92, -0.04, { r: 0.08 });
  for (let i = 0; i < 4; i++) t.cyl(0.05, 0.04, INK, 0.25, 0.5 - i * 0.35, 0.6, { axis: 'z', seg: 8 });
  belt(t, 0x3e2723, 0x9e9e9e);
  pouch(t, -0.6, -0.95, 0.55, 0.4, 0.4, 0x3e2723, 0.2);
  if (level >= 1) shellStrap(t, -1, 0x4e342e);
  if (level >= 2) {
    goggles(hd, 0.76, lens);
    // sticky charges: a frame pack with four blocks and blinking lights
    t.box(1.5, 1.6, 0.2, INK, 0, 0.05, -0.65, { r: 0.04 });
    for (const [x, y] of [[-0.38, 0.4], [0.38, 0.4], [-0.38, -0.35], [0.38, -0.35]]) {
      t.box(0.62, 0.62, 0.36, 0x37474f, x, y, -0.93, { r: 0.06 });
      t.box(0.64, 0.1, 0.38, 0x212121, x, y, -0.93);
      t.cyl(0.07, 0.06, red, x + 0.18, y + 0.18, -1.12, { axis: 'z', seg: 8 });
    }
  }
  if (heavy) {
    vest(t, 0x455a64, { pouches: 3, pouch: 0x37474f });
    shoulderPads(t, 0x455a64, 0.62);
  }
  hd.done();
  t.done();
  hands(h, key, 0x1a1a1a, tone(coat, 0.8));
  feet(h, key, 0x111111, heavy ? kneePad : null);
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = launcher(gk, { drum: level >= 3, heavy });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.projectile = { color: 0x1b1b1b, size: heavy ? 0.55 : 0.45, arc: 3 };
  return own(h);
}

// ------------------------------------------------------------------ Assault Grenadier

/**
 * Assault Grenadier (alternate Grenadier with two paths). Top: Lv 1 a grenade belt, Lv 2 a
 * chest strap, Lv 3 sensor goggles, Lv 4 a Stiel stick grenade, Lv 5 an armoured vest with
 * napalm canisters. Bottom: Lv 1 belt, Lv 2 strap, Lv 3 glowing blue shock grenades, Lv 4 a
 * battery pack, Lv 5 dark Shock Trooper armour with a glowing visor.
 */
export function makeGrenadierAssault(level, bottom = false) {
  const top = !bottom;
  const shock = bottom && level >= 3;
  const trooper = bottom && level >= 5;
  const napalm = top && level >= 5;
  const shirt = trooper ? 0x1c2330 : napalm ? 0x5d4f37 : 0x5b6b3c;
  const h = makeHumanoid({ skin: 0xd8a06a, shirt, pants: trooper ? 0x12161d : 0x3e4a2a, arms: shirt, face: 'soldier' });
  const key = `grenadierAssault${bottom ? 'B' : 'T'}${level}`;
  const blue = glowMat(h, 0x40c4ff);
  const orange = glowMat(h, 0xff7043);
  const nade = shock ? 0x0d47a1 : OLIVE;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hd.box(0.3, 0.22, 0.05, shardOf(h), 0.4, 1.02, 0.62, { ry: -0.55, rx: -0.4 }); // Dimension Shard badge
  if (trooper) {
    // a full round helmet with a glowing visor and a battery bump
    dome(hd, 0.76, 0.72, 0x111820, 0, 0.72, 0);
    hd.cyl(0.76, 0.75, 0x111820, 0, 0.36, 0, { seg: 22 });
    band(hd, 0.78, 0.06, 0.26, 2.0, blue, 0.74);
    hd.box(0.4, 0.3, 0.3, 0x263040, 0, 1.2, -0.62, { r: 0.06 });
  } else {
    helmet(hd, 0x4b5d2e, { cover: napalm ? 0x6d5f45 : 0x3e4a2a });
    collar(t, tone(shirt, 0.85));
  }
  if (top && level >= 3) goggles(hd, 0.76, orange, { strap: 0x263238 });
  if (level >= 1) nadeBelt(t, 0x4e342e, nade);
  if (level >= 2) nadeStrap(t, top ? 1 : -1, 0x4e342e, nade);
  if (shock) for (const x of [-0.6, 0, 0.6]) t.cyl(0.08, 0.04, blue, x, -0.55, 0.9, { axis: 'z', seg: 8 }); // shock lights
  if (napalm) {
    vest(t, 0x6d5f45, { pouches: 2, pouch: 0x5d4037 });
    for (const x of [-0.4, 0.4]) {
      t.cyl(0.28, 1.4, 0xbf360c, x, 0.05, -0.9, { seg: 14 });
      for (const s of [-1, 1]) t.ball(0.28, 0xbf360c, x, 0.05 + s * 0.7, -0.9, { sy: 0.4, seg: 14, rows: 5 });
      t.cyl(0.12, 0.16, orange, x, 0.9, -0.9, { seg: 10 });
      t.box(0.04, 0.6, 0.3, 0x212121, x, 0, -1.19); // flame mark
    }
    t.tube([[0.4, -0.65, -0.9], [0.9, -0.9, -0.5], [1.2, -0.7, 0.1]], 0.06, INK, { seg: 10, sides: 5 });
  }
  if (bottom && level >= 4) {
    t.box(1.3, 1.3, 0.5, 0x37474f, 0, 0.1, -0.82, { r: 0.08 });
    for (let i = 0; i < 3; i++) t.box(0.9, 0.1, 0.04, blue, 0, 0.4 - i * 0.25, -1.08);
    t.cyl(0.06, 0.06, blue, 0.45, 0.65, -1.08, { axis: 'z', seg: 8 });
    t.tube([[-0.5, -0.4, -0.82], [-1.0, -0.8, -0.4], [-1.2, -0.6, 0.15]], 0.05, blue, { seg: 10, sides: 5 });
  }
  if (trooper) {
    t.box(2.22, 1.3, 1.22, 0x263040, 0, 0.35, 0, { r: 0.16 });
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) t.box(0.7, 0.22, 0.12, 0x1c2330, s * 0.4, -0.45 - i * 0.26, 0.56, { r: 0.04 });
    shoulderPads(t, 0x263040, 0.64);
    t.cyl(0.18, 0.06, blue, 0, 0.45, 0.64, { axis: 'z', seg: 12 });
  }
  hd.done();
  t.done();
  hands(h, key, trooper ? 0x111820 : 0x4e3b2a, tone(shirt, 0.8), trooper ? (a) => a.box(1.1, 0.6, 1.1, 0x263040, 0, -0.4, 0, { r: 0.1 }) : null);
  feet(h, key, trooper ? 0x0d1117 : 0x4e3b2a, level >= 2 ? (b) => kneePad(b, trooper ? 0x263040 : INK) : null);
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const stiel = top && level >= 4;
  const tip = stiel ? heldStiel(gk, napalm ? 0xbf360c : 0x455a64) : heldNade(gk, nade, 0.3, shock ? blue : null);
  gk.done();
  h.muzzles = [];
  muzzle(h, g, stiel ? -0.6 : tip * 0.6, 0);
  throwPose(h);
  h.projectile = shock ? { color: 0x40c4ff, size: 0.5, arc: 3.5 } : stiel ? { color: 0x455a64, size: 0.5, arc: 4 } : { color: 0x33691e, size: 0.5, arc: 3.5 };
  return own(h, 0);
}
export const makeGrenadierAssaultBottom = (level) => makeGrenadierAssault(level, true);

// ------------------------------------------------------------------ Firecracker

/**
 * Firecracker (free alternate Grenadier form): a festive thrower in a red jacket with a lit
 * firecracker. Lv 1 a gold sash of firecrackers, Lv 2 a red cap, Lv 3 a spare in the left hand,
 * Lv 4 goggles, Lv 5 a gold dragon-trim jacket and a bundle of three.
 */
export function makeFirecracker(level) {
  const finale = level >= 5;
  const shirt = finale ? 0xb71c1c : 0xe53935;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x212121, arms: shirt, face: 'soldier' });
  const key = `firecracker${level}`;
  const fuse = glowMat(h, 0xffeb3b);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // a jacket with a stand-up collar and knot buttons
  t.box(2.18, 1.88, 1.16, shirt, 0, 0.05, 0, { r: 0.12 });
  t.cyl(0.66, 0.24, tone(shirt, 0.85), 0, 0.98, 0, { seg: 20 });
  for (let i = 0; i < 4; i++) {
    t.box(0.34, 0.06, 0.05, GOLD, 0.1, 0.55 - i * 0.36, 0.59);
    t.ball(0.06, GOLD, 0.27, 0.55 - i * 0.36, 0.61, { seg: 6, rows: 4 });
  }
  t.box(0.36, 0.24, 0.04, shardOf(h), -0.55, 0.45, 0.6); // Dimension Shard badge
  belt(t, 0x212121, GOLD);
  if (level >= 1) {
    sash(t, GOLD, -1, 0.3);
    const rz = -0.62;
    for (const s of [-0.65, -0.2, 0.25, 0.7]) cracker(t, -Math.sin(rz) * s, Math.cos(rz) * s, 0.7, null, { r: 0.1, len: 0.42 });
  }
  if (level >= 2) cap(hd, 0xc62828, { peak: 0x8e0000 });
  else hair(hd, 0x1a1209);
  if (level >= 4) goggles(hd, level >= 2 ? 1.12 : 0.76, 0xffb74d, { r: 0.72 });
  if (finale) {
    t.box(2.22, 0.18, 1.2, GOLD, 0, -0.98, 0); // gold hem
    for (const s of [-1, 1]) t.box(2.22, 0.12, 0.05, GOLD, 0, 0.75, s * 0.6); // shoulder band
    // a gold dragon winding down the front: a chain of scales with a head
    const pts = [[-0.7, 0.55], [-0.4, 0.3], [-0.65, 0.0], [-0.35, -0.3], [-0.6, -0.6]];
    pts.forEach(([x, y], i) => t.ball(0.13 - i * 0.012, GOLD, x, y, 0.6, { sz: 0.4, seg: 8, rows: 6 }));
    t.box(0.3, 0.2, 0.06, GOLD, -0.85, 0.7, 0.6, { rz: 0.3 });
    t.ball(0.04, 0xd50000, -0.82, 0.74, 0.64, { seg: 6, rows: 4 });
    // a lantern on the belt
    t.cyl(0.2, 0.35, 0xd50000, 0.85, -1.2, 0.3, { seg: 12 });
    for (const s of [-1, 1]) t.cyl(0.21, 0.05, GOLD, 0.85, -1.2 + s * 0.18, 0.3, { seg: 12 });
    t.cyl(0.03, 0.3, GOLD, 0.85, -1.52, 0.3, { seg: 5 }); // tassel
  }
  hd.done();
  t.done();
  hands(h, key, null, GOLD);
  feet(h, key, 0x1a1a1a);
  if (level >= 3) spare(h, key, (k) => cracker(k, 0, -0.4, 0, fuse));
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  if (finale) {
    for (const [x, z] of [[-0.18, 0], [0.18, 0], [0, 0.2]]) cracker(gk, x, -0.4, z, fuse);
    gk.box(0.6, 0.1, 0.5, GOLD, 0, -0.3, 0.07, { r: 0.03 }); // gold ribbon
  } else cracker(gk, 0, -0.4, 0, fuse);
  gk.done();
  h.muzzles = [];
  muzzle(h, g, -0.3, 0);
  throwPose(h);
  h.projectile = { color: 0xd50000, size: 0.35, arc: 3 };
  return own(h, 0);
}

// ------------------------------------------------------------------ Frost Trooper

/**
 * Frost Trooper: a white snow suit, a hood with a glowing visor, a coolant tank and a cryo gun.
 * Lv 1 frosty shoulder pads with icicles, Lv 2 glowing ice gauntlets, Lv 3 a bigger tank and a
 * longer gun, Lv 4 Blizzard: an ice crown, a snowy cape and ice crystals round its feet.
 */
export function makeFrost(level) {
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: 0xe3f2fd, pants: 0x90caf9, arms: 0xe3f2fd, face: 'soldier' });
  const key = `frost${level}`;
  const ice = glowMat(h, ICE);
  const pale = glowMat(h, 0xb3e5fc);
  const big = level >= 3;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hood(hd, 0xfafafa);
  band(hd, 0.74, 0.05, 0.3, 2.0, ice, 0.72); // visor
  hd.torus(0.72, 0.06, 0xe0e0e0, 0, 0.3, 0.05, { rx: PI / 2, seg: 20 }); // fur trim round the face
  // a puffy snow suit: quilted rings and a zip
  t.box(2.2, 1.9, 1.18, 0xe3f2fd, 0, 0.05, 0, { r: 0.18 });
  for (const y of [0.45, -0.1, -0.6]) t.box(2.24, 0.06, 1.22, 0xbbdefb, 0, y, 0);
  t.box(0.06, 1.6, 0.05, 0x90a4ae, 0, -0.05, 0.6);
  belt(t, 0x546e7a, ICE);
  coolant(t, 0x90a4ae, ice, { r: big ? 0.5 : 0.42, h: big ? 1.6 : 1.3, n: 1 });
  if (level >= 1) {
    for (const s of [-1, 1]) {
      t.ball(0.6, 0xfafafa, s * 1.42, 0.95, 0, { sy: 0.55, seg: 14, rows: 8 });
      for (const z of [-0.3, 0.1, 0.4]) icicle(t, s * (1.55 + z * 0.1), 0.72, z, 0.35 + Math.abs(z) * 0.4, pale);
    }
  }
  if (level >= 4) {
    for (const [x, hh] of [[-0.45, 0.45], [0, 0.7], [0.45, 0.45]]) shard(hd, x, 1.28, 0.1, hh, 0.12, pale); // ice crown
    t.slab(2.2, 2.6, 0.12, 0xe1f5fe, 0, -0.7, -1.45, { bw: 1.25 }); // snowy cape behind the tank
    for (let i = 0; i < 7; i++) icicle(t, -0.9 + i * 0.3, -2.0, -1.45, 0.25, pale);
  }
  hd.done();
  t.done();
  hands(h, key, level >= 2 ? null : 0x90caf9, 0xbbdefb, level >= 2 ? (a) => {
    // ice gauntlet on the forearm (kept above y -1.6, or the rig takes the glow mesh for a held thing)
    a.box(1.12, 0.6, 1.12, ice, 0, -1.4, 0, { r: 0.1 });
    for (const z of [-0.3, 0.3]) shard(a, 0.58, -1.5, z, 0.5, 0.08, pale, { rz: -0.9 });
  } : null);
  feet(h, key, 0xeceff1, (b) => b.box(1.12, 0.14, 1.14, 0xe0e0e0, 0, -1.36, 0.02)); // fur cuffs
  if (level >= 4) {
    const r = wear(h, h.root, `${key}:ring`);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      shard(r, Math.cos(a) * 1.7, 0, Math.sin(a) * 1.7, 0.9 + (i % 2) * 0.6, 0.25, pale);
      shard(r, Math.cos(a + 0.3) * 1.95, 0, Math.sin(a + 0.3) * 1.95, 0.5, 0.15, pale);
    }
    r.done();
  }
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const tip = cryoGun(gk, { len: big ? 2.3 : 1.95, light: ice, coils: level >= 2 ? 3 : 2, can: big });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tip, UP + 0.02);
  aimLong(h);
  h.tracer = ICE;
  h.tracerWidth = 0.3;
  return own(h);
}

// ------------------------------------------------------------------ Freezer

/**
 * Freezer (alternate Frost form): a polar explorer with a crystal-core cryo rifle. Lv 1 a fur
 * hood and snow goggles, Lv 2 a red scarf and a coolant tank, Lv 3 an arctic soldier's dark coat
 * and shoulder plates, Lv 4 Glacier Arrow: ice bow arms on the gun.
 */
export function makeFrostFreezer(level) {
  const arctic = level >= 3;
  const coat = arctic ? 0x1565c0 : 0x29b6f6;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: coat, pants: 0x37474f, arms: coat, face: 'soldier' });
  const key = `frostFreezer${level}`;
  const ice = glowMat(h, ICE);
  const lens = glowMat(h, 0x4fc3f7);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (level >= 1) {
    hood(hd, tone(coat, 0.9));
    hd.torus(0.74, 0.14, 0xf5f5f5, 0, 0.4, 0.1, { rx: PI / 2 - 0.15, seg: 20 }); // fur ruff
    goggles(hd, 0.76, lens, { r: 0.68, strap: 0x263238 });
  } else beanie(hd, 0xeceff1, 0.6);
  hd.box(0.32, 0.22, 0.04, shardOf(h), 0.4, 1.2, 0.62, { ry: -0.5 }); // Dimension Shard badge
  // a parka: puffy body, fur hem, toggles, big pockets
  t.box(2.24, 1.95, 1.2, coat, 0, 0.02, 0, { r: 0.2 });
  t.box(2.3, 0.26, 1.26, 0xf5f5f5, 0, -0.95, 0, { r: 0.1 }); // fur hem
  for (let i = 0; i < 4; i++) t.box(0.06, 0.2, 0.08, WOOD, 0.08, 0.6 - i * 0.38, 0.62, { rz: PI / 2 }); // toggles
  for (const s of [-1, 1]) pouch(t, s * 0.55, -0.45, 0.58, 0.55, 0.5, tone(coat, 0.85), 0.12);
  if (level >= 2) {
    neckScarf(t, 0xc62828);
    coolant(t, 0x90a4ae, ice, { r: 0.4, h: 1.3 });
  }
  if (arctic) {
    for (const s of [-1, 1]) {
      t.box(0.75, 0.5, 1.3, 0xb0bec5, s * 1.38, 0.95, 0, { r: 0.12 });
      t.box(0.8, 0.08, 1.34, 0x78909c, s * 1.38, 0.75, 0);
    }
    t.box(0.44, 0.26, 0.04, 0xfafafa, -0.55, 0.5, 0.62); // unit patch
    t.box(0.2, 0.14, 0.02, 0x1565c0, -0.55, 0.5, 0.64);
  }
  hd.done();
  t.done();
  hands(h, key, 0x37474f, 0xf5f5f5); // mittens with fur cuffs
  feet(h, key, 0x5d4037, (b) => b.box(1.14, 0.2, 1.16, 0xf5f5f5, 0, -1.34, 0.02, { r: 0.06 }));
  const bow = level >= 4;
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const tip = cryoGun(gk, { len: bow ? 2.1 : 1.7, body: bow ? 0xe1f5fe : 0x546e7a, light: ice, coils: 2, crystal: ice });
  if (bow) {
    // ice bow arms swept back from the front of the gun, with a glowing string
    for (const s of [-1, 1]) gk.tube([[0, -1.55, UP], [s * 0.6, -1.4, UP], [s * 1.0, -1.05, UP], [s * 1.15, -0.65, UP]], 0.07, ice, { seg: 12, sides: 6 });
    gk.tube([[-1.15, -0.65, UP], [0, -0.35, UP], [1.15, -0.65, UP]], 0.02, glowMat(h, 0xe1f5fe), { seg: 8, sides: 4 });
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tip, UP + 0.02);
  aimLong(h);
  h.tracer = ICE;
  h.tracerWidth = 0.22;
  return own(h);
}

// ------------------------------------------------------------------ Cryo Ranger

/**
 * Cryo Ranger (alternate Frost form with two paths): a ranger in a knit cap with an ice-cell
 * rifle. Lv 1 an ice-blue scarf, Lv 2 a longer barrel. Top: Lv 3 a glowing sensor eye, Lv 4
 * nitrogen tanks, Lv 5 an Ice LMG. Bottom: Lv 3 a strap of frost grenades, Lv 4 a launcher
 * tube under the barrel, Lv 5 Deep Freeze armour with a helmet and ice plates.
 */
export function makeFrostRanger(level, bottom = false) {
  const top = !bottom;
  const armour = bottom && level >= 5;
  const suit = armour ? 0x0d47a1 : top && level >= 4 ? 0x01579b : 0xe3f2fd;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: suit, pants: 0x546e7a, arms: suit, face: 'soldier' });
  const key = `frostRanger${bottom ? 'B' : 'T'}${level}`;
  const ice = glowMat(h, ICE);
  const pale = glowMat(h, 0xb3e5fc);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (armour) helmet(hd, 0x1a237e, { cover: 0x283593 });
  else beanie(hd, 0x90caf9, 0.58);
  hd.box(0.32, 0.22, 0.04, shardOf(h), armour ? 0.42 : 0.4, armour ? 1.3 : 1.05, 0.66, { ry: -0.5 }); // Dimension Shard badge
  collar(t, tone(suit, 0.85));
  belt(t, 0x37474f, 0x9e9e9e);
  pouch(t, 0.6, -0.95, 0.55, 0.4, 0.4, 0x455a64, 0.2);
  pouch(t, -0.6, -0.95, 0.55, 0.4, 0.4, 0x455a64, 0.2);
  if (level >= 1) neckScarf(t, 0x4fc3f7);
  if (top && level >= 3) {
    // a sensor eye: a round housing over the right eye with a glowing lens and a small antenna
    hd.cyl(0.24, 0.26, 0x263238, -0.27, 0.74, 0.66, { axis: 'z', seg: 14 });
    hd.cyl(0.17, 0.04, glowMat(h, 0x18ffff), -0.27, 0.74, 0.8, { axis: 'z', seg: 14 });
    hd.box(0.1, 0.1, 0.5, 0x263238, -0.62, 0.8, 0.4);
    hd.cyl(0.02, 0.4, 0x263238, -0.68, 1.05, 0.2, { seg: 5 });
  }
  if (top && level >= 4) coolant(t, 0xcfd8dc, ice, { n: 2, r: 0.32, h: 1.5 });
  if (bottom && level >= 3) nadeStrap(t, 1, 0x455a64, 0x4fc3f7);
  if (bottom && level >= 3) for (const tt of [-0.6, 0, 0.6]) t.cyl(0.07, 0.04, ice, -Math.sin(0.62) * tt, Math.cos(0.62) * tt, 0.9, { axis: 'z', seg: 8 });
  if (armour) {
    vest(t, 0x1a237e, { pouches: 3, pouch: 0x283593 });
    for (const s of [-1, 1]) {
      t.ball(0.62, pale, s * 1.42, 0.95, 0, { sy: 0.5, seg: 6, rows: 4 }); // faceted ice plates
      shard(t, s * 1.6, 1.05, -0.1, 0.5, 0.1, pale, { rz: s * -0.5 });
    }
  }
  hd.done();
  t.done();
  hands(h, key, 0x37474f, tone(suit, 0.8));
  feet(h, key, 0x37474f, level >= 2 ? kneePad : null);
  const lmg = top && level >= 5;
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = rifle(gk, { len: lmg ? 2.5 : level >= 2 ? 2.3 : 2.0, body: lmg ? 0x37474f : 0x546e7a, furn: 0x37474f, mag: lmg ? 'box' : false, optic: top && level >= 3 ? 'scope' : 'dot', lens: ICE, glow: ice });
  // the ice cell where a mag would be: a glowing canister in a cage
  gk.cyl(0.17, 0.5, ice, 0, -0.6, UP - 0.4, { seg: 10 });
  for (const s of [-1, 1]) gk.box(0.04, 0.55, 0.04, INK, s * 0.17, -0.6, UP - 0.4);
  if (lmg) {
    gk.box(0.5, 0.55, 0.6, 0x263238, 0, -0.45, UP - 0.62, { r: 0.05 }); // box magazine
    for (const s of [-1, 1]) gk.tube([[0, -1.7, UP - 0.05], [s * 0.25, -1.75, UP - 0.6], [s * 0.4, -1.75, UP - 1.0]], 0.035, INK, { seg: 6, sides: 4 }); // bipod
  }
  if (bottom && level >= 4) {
    gk.cyl(0.16, 0.95, 0x263238, 0, -1.25, UP - 0.32, { seg: 14 }); // launcher tube
    gk.cyl(0.11, 0.03, 0x050505, 0, -1.73, UP - 0.32, { seg: 12 });
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = ICE;
  h.tracerWidth = 0.16;
  h.projectile = { color: 0x4fc3f7, size: 0.45, arc: 3.5, glowing: true };
  return own(h);
}
export const makeFrostRangerBottom = (level) => makeFrostRanger(level, true);
