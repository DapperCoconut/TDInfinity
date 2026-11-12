// Tower models: people, batch 7 (dressed with the vehicle kit in ../vehicles.js).
// In here: Rocketeer, Missile Rocketeer, Missile Trooper (+bottom), Mortar, Classic Mortar,
// Artillery (+bottom), Flamethrower.
// Each makeX(level) builds one tower's look; TOWER_MODELS in ../models.js says which tower uses which.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.

import * as THREE from 'three';
import { glowMat, tone, wheel } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import {
  GUNMETAL, INK, STEEL, UP, WOOD, aimLong, armPatch, band, belt, collar, dome, fist, helmet, kneePad, muzzle, own,
  pouch, sash, shardOf, vest, wear,
} from './people1.js';
import { shoulderPads } from './people2.js';
import { bag } from './machines2.js';
import { spinner } from './machines5.js';
import { feet, hands } from './people5.js';

const PI = Math.PI;

// ------------------------------------------------------------------ shared bits for this batch

/** A visor strip across a round helmet (head space). */
export function visor(k, mat) {
  band(k, 0.79, 0.05, 0.3, 2.0, mat, 0.76);
  for (const s of [-1, 1]) k.cyl(0.07, 0.06, INK, s * 0.72, 0.8, 0.28, { axis: 'x', seg: 8 });
}

/** A targeting monocle over the right eye with a glowing lens (head space). */
function monocle(k, lens) {
  k.cyl(0.2, 0.26, INK, -0.27, 0.74, 0.68, { axis: 'z', seg: 14 });
  k.cyl(0.15, 0.04, lens, -0.27, 0.74, 0.82, { axis: 'z', seg: 14 });
  k.box(0.08, 0.08, 0.5, INK, -0.6, 0.82, 0.42);
}

/** Ear defenders: a band over the helmet and two round cups (head space). */
function earMuffs(k, col) {
  k.torus(0.82, 0.05, INK, 0, 0.7, 0, { arc: PI, seg: 14 });
  for (const s of [-1, 1]) {
    k.cyl(0.28, 0.2, col, s * 0.78, 0.66, 0, { axis: 'x', seg: 14 });
    k.cyl(0.2, 0.06, tone(col, 0.6), s * 0.9, 0.66, 0, { axis: 'x', seg: 14 });
  }
}

/** A rocket standing up: body, ogive nose and four fins (any space; its base at y). */
function rocket(k, x, y, z, r, len, body, nose) {
  k.cyl(r, len * 0.7, body, x, y + len * 0.35, z, { seg: 10 });
  k.cyl(r, len * 0.3, nose, x, y + len * 0.85, z, { seg: 10, r2: 0.02 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4;
    k.box(0.03, len * 0.22, r * 1.4, INK, x + Math.sin(a) * r * 1.1, y + len * 0.1, z + Math.cos(a) * r * 1.1, { ry: a });
  }
}

/** A frame pack on the back holding `n` spare rockets nose up (torso space). */
function rocketPack(k, n, body, nose, col = 0x4e342e) {
  k.box(1.5, 1.5, 0.22, col, 0, -0.1, -0.66, { r: 0.05 });
  k.box(1.6, 0.18, 0.7, INK, 0, -0.85, -0.95, { r: 0.04 }); // shelf
  for (const s of [-1, 1]) k.box(0.12, 1.7, 0.12, INK, s * 0.75, -0.05, -1.2); // frame rails
  k.box(1.6, 0.12, 0.12, INK, 0, 0.3, -1.25); // retaining strap
  for (let i = 0; i < n; i++) rocket(k, (i - (n - 1) / 2) * 0.42, -0.76, -0.98, 0.16, 1.9, body, nose);
  for (const s of [-1, 1]) {
    k.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
    k.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
  }
}

/**
 * A shoulder-fired tube launcher on the fist (gun space, the tube runs along -y and sits above
 * the hand). o: len, r, col, back (how far it sticks out behind the hand), venturi (a flared
 * back end), scope (a big optic), warhead (colour of the rocket poking out), fat, bands (a glow
 * material for rings), grip (a front grip). Returns the muzzle [y, z].
 */
function tubeLauncher(k, o = {}) {
  const r = o.r ?? 0.34;
  const len = o.len ?? 2.6;
  const back = o.back ?? 0.8;
  const col = o.col ?? 0x616161;
  const z = UP + r - 0.05;
  const mid = (back - len) / 2 + 0.0;
  k.cyl(r, len + back, col, 0, mid, z, { seg: 18 });
  k.cyl(r + 0.06, 0.22, tone(col, 0.7), 0, -len + 0.11, z, { seg: 18 }); // front ring
  k.cyl(r * 0.8, 0.03, 0x050505, 0, -len - 0.01, z, { seg: 14 }); // bore
  if (o.venturi) k.cyl(r + 0.02, 0.5, tone(col, 0.75), 0, back + 0.2, z, { seg: 18, r2: r + 0.18 });
  else k.cyl(r + 0.05, 0.16, INK, 0, back - 0.08, z, { seg: 18 });
  for (const y of [-0.55, back - 0.4]) k.cyl(r + 0.03, 0.08, INK, 0, y, z, { seg: 18 }); // straps
  k.box(0.16, 0.7, 0.16, INK, 0, -0.1, z - r - 0.04); // rail under the tube
  k.box(0.22, 0.26, 0.55, INK, 0, 0.1, UP - 0.32, { rx: -0.3, r: 0.04 }); // pistol grip
  k.torus(0.1, 0.022, INK, 0, -0.14, UP - 0.22, { ry: PI / 2, seg: 10, arc: PI });
  k.box(0.5, 0.35, r * 2.2, 0x3e2723, 0, 0.55, z, { r: 0.08 }); // shoulder pad
  if (o.grip) k.box(0.2, 0.22, 0.6, INK, 0, -1.25, z - r - 0.3, { r: 0.04 });
  if (o.scope) {
    k.box(0.22, 0.9, 0.3, INK, -r - 0.12, -0.6, z + 0.15, { r: 0.04 });
    k.cyl(0.13, 0.04, o.scope, -r - 0.12, -1.06, z + 0.15, { seg: 12 });
    k.box(0.12, 0.2, 0.1, INK, -r - 0.05, -0.45, z + 0.05);
  } else k.box(0.08, 0.14, 0.18, INK, 0, -len + 0.4, z + r + 0.05); // flip sight
  if (o.bands) for (let i = 0; i < 3; i++) k.cyl(r + 0.04, 0.1, o.bands, 0, -0.9 - i * 0.55, z, { seg: 18 });
  if (o.warhead != null) {
    const wr = o.fat ? r + 0.12 : r * 0.82;
    k.cyl(wr, 0.3, o.warhead, 0, -len - 0.15, z, { seg: 14 });
    k.cyl(0.05, 0.4, o.warhead, 0, -len - 0.5, z, { seg: 14, r2: wr });
    return [-len - 0.7, z];
  }
  return [-len, z];
}

/** A box pod of rocket tubes on the fist (gun space, mouths along -y): cols x rows tubes. Returns [y, z]. */
function rocketPod(k, cols, rows, col, cap, o = {}) {
  const p = o.pitch ?? 0.42;
  const w = cols * p + 0.2;
  const d = rows * p + 0.2;
  const len = o.len ?? 2.5;
  const z = UP + d / 2 - 0.1;
  k.box(w, len, d, col, 0, -len / 2 + 0.6, z, { r: 0.06 });
  k.box(w + 0.08, 0.16, d + 0.08, tone(col, 0.7), 0, -len + 0.62, z, { r: 0.03 });
  k.box(w + 0.08, 0.16, d + 0.08, tone(col, 0.7), 0, 0.52, z, { r: 0.03 });
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = (i - (cols - 1) / 2) * p;
      const zz = z + (j - (rows - 1) / 2) * p;
      k.cyl(p * 0.38, 0.06, INK, x, -len + 0.57, zz, { seg: 12 });
      k.cyl(p * 0.28, 0.08, cap, x, -len + 0.55, zz, { seg: 12 }); // the rocket nose in the tube
    }
  }
  for (const s of [-1, 1]) k.box(0.05, len * 0.7, 0.3, tone(col, 0.6), s * (w / 2 + 0.02), -len / 2 + 0.6, z); // side ribs
  k.box(0.22, 0.26, 0.55, INK, 0, 0.1, UP - 0.32, { rx: -0.3, r: 0.04 });
  if (o.sight) {
    k.box(0.4, 0.5, 0.36, INK, w / 2 + 0.22, -0.3, z + 0.1, { r: 0.04 });
    k.cyl(0.12, 0.04, o.sight, w / 2 + 0.22, -0.56, z + 0.1, { seg: 12 });
  }
  return [-len + 0.5, z];
}

/** A shell held in the fist (gun space): body, ogive nose, fins at the tail. */
export function heldShell(k, col, fat = false, nose = null) {
  const r = fat ? 0.27 : 0.2;
  k.cyl(r, 0.7, col, 0, -0.35, 0.05, { seg: 12 });
  k.cyl(0.03, 0.35, nose ?? tone(col, 0.8), 0, -0.88, 0.05, { seg: 12, r2: r });
  k.cyl(r * 0.6, 0.3, STEEL, 0, 0.15, 0.05, { seg: 10 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2;
    k.box(0.03, 0.26, r * 1.3, STEEL, Math.sin(a) * r * 0.8, 0.2, 0.05 + Math.cos(a) * r * 0.8, { ry: a });
  }
  k.cyl(r + 0.01, 0.05, 0xffd54f, 0, -0.6, 0.05, { seg: 12 }); // band
}

/** Holds a shell in the right hand at chest height, ready to load (the mortar crews' pose). */
export function loaderPose(h, key, col, fat, nose) {
  const g = fist(h.rightArm, -1.9, 1.15);
  g.position.x = 0.35;
  g.rotation.z = 0.3;
  const k = wear(h, g, `${key}:shell`);
  heldShell(k, col, fat, nose);
  k.done();
  h.rightArm.rotation.set(-1.0, 0, 0.3);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -1.0, left: -1.0, leftRecoil: 0 };
  h.recoilScale = 0.4;
}

/** A shell standing on its tail (root space). */
function shell(k, x, z, r, hh, col, nose) {
  k.cyl(r, hh * 0.7, col, x, 0.2 + hh * 0.35, z, { seg: 12 });
  k.cyl(r, hh * 0.3, nose, x, 0.2 + hh * 0.85, z, { seg: 12, r2: 0.03 });
  k.cyl(r + 0.01, 0.05, 0xffd54f, x, 0.2 + hh * 0.5, z, { seg: 12 });
}

/** A wooden rack of shells standing on the ground (root space). */
export function shellRack(k, x, z, cols, col, nose, o = {}) {
  const r = o.r ?? 0.17;
  const p = r * 2 + 0.12;
  const w = cols * p + 0.2;
  k.box(w, 0.2, 1.0, WOOD, x, 0.1, z, { r: 0.03 });
  for (const s of [-1, 1]) k.box(0.08, 0.5, 1.0, tone(WOOD, 0.8), x + s * (w / 2 - 0.04), 0.4, z);
  k.box(w, 0.08, 0.08, tone(WOOD, 0.8), x, 0.62, z - 0.46);
  for (let i = 0; i < cols; i++) for (const dz of [-0.24, 0.24]) shell(k, x + (i - (cols - 1) / 2) * p, z + dz, r, o.h ?? 1.0, col, nose);
}

/** A half ring of sandbags, two rows high, round (0, cz) at radius rx/rz (root space). */
function sandbags(k, rx, rz, cz, n = 6, col) {
  for (let row = 0; row < 2; row++) {
    const m = n - row;
    for (let i = 0; i < m; i++) {
      const a = -1.25 + (i + row * 0.5) * (2.5 / (n - 1));
      bag(k, 1.0, 0.55, Math.sin(a) * rx, row * 0.32, cz + Math.cos(a) * rz, col, a);
    }
  }
}

/**
 * A mortar in front of the crewman (root space): round base plate, a tube leaning forward and a
 * bipod with an elevation screw. Returns the tube group (the muzzle goes on it). o: w (tube
 * radius), len, col, bands (glow material), stripe (glow material), rings (reinforcing bands).
 */
export function mortarGun(h, key, o) {
  const mount = new THREE.Group();
  mount.position.set(0, 0, o.z ?? 2.2);
  h.root.add(mount);
  const r = o.r;
  const len = o.len;
  const lean = o.lean ?? 0.5;
  const m = wear(h, mount, `${key}:mount`);
  m.cyl(0.95, 0.16, 0x424242, 0, 0.08, 0, { seg: 20 }); // base plate
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4;
    m.box(0.1, 0.3, 0.6, 0x37474f, Math.sin(a) * 0.55, 0.2, Math.cos(a) * 0.55, { ry: a }); // ribs
  }
  m.ball(r + 0.1, 0x37474f, 0, 0.3, 0, { seg: 12, rows: 8 }); // socket
  // bipod: two legs from the ground up to a collar halfway along the tube
  const cy = 0.3 + Math.cos(lean) * len * 0.55;
  const cz = Math.sin(lean) * len * 0.55;
  for (const s of [-1, 1]) {
    m.tube([[s * 0.85, 0.05, cz + 0.9], [s * 0.2, cy - 0.35, cz + 0.2]], 0.06, INK, { seg: 2, sides: 6 });
    m.box(0.25, 0.08, 0.3, INK, s * 0.85, 0.04, cz + 0.9); // feet
  }
  m.box(1.2, 0.07, 0.07, STEEL, 0, 0.6, cz + 0.62); // spreader chain
  m.cyl(0.07, cy - 0.5, STEEL, 0, (cy - 0.3) / 2 + 0.1, cz + 0.45, { seg: 8 }); // elevation screw
  m.box(0.4, 0.2, 0.2, INK, 0, cy - 0.35, cz + 0.25, { r: 0.04 }); // collar
  m.box(0.18, 0.3, 0.24, 0x263238, 0.38, cy - 0.15, cz + 0.2); // sight
  m.cyl(0.06, 0.03, glowMat(h, 0x76ff03), 0.38, cy, cz + 0.32, { axis: 'z', seg: 8 });
  m.done();
  const tube = new THREE.Group();
  tube.position.set(0, 0.3, 0);
  tube.rotation.x = lean; // leans forward
  mount.add(tube);
  const t = wear(h, tube, `${key}:tube`);
  t.cyl(r, len, o.col, 0, len / 2, 0, { seg: 18, r2: r * 0.96 });
  t.cyl(r + 0.07, 0.22, tone(o.col, 0.65), 0, len - 0.11, 0, { seg: 18 }); // muzzle ring
  t.cyl(r * 0.75, 0.03, 0x050505, 0, len + 0.005, 0, { seg: 14 });
  for (const y of o.rings ?? []) t.cyl(r + 0.05, 0.16, tone(o.col, 0.7), 0, y * len, 0, { seg: 18 });
  if (o.bands) for (let i = 0; i < 3; i++) t.cyl(r + 0.04, 0.12, o.bands, 0, len * (0.3 + i * 0.22), 0, { seg: 18 });
  if (o.stripe) t.cyl(r + 0.03, 0.45, o.stripe, 0, len * 0.62, 0, { seg: 18 });
  t.box(0.06, 0.6, 0.02, 0xfafafa, 0, len * 0.4, r + 0.01); // stencil
  t.done();
  return tube;
}

// ------------------------------------------------------------------ Rocketeer

/**
 * Rocketeer: a rocket launcher on the shoulder. Lv 1 a pack of spare rockets, Lv 2 a targeting
 * monocle, a big scope and a flak vest, Lv 3 a fat olive bazooka, Lv 4 a purple plasma launcher.
 */
export function makeRocketeer(level) {
  const plasma = level >= 4;
  const bazooka = level >= 3;
  const shirt = plasma ? 0x311b92 : 0x795548;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: plasma ? 0x1a1a40 : 0x4e342e, arms: shirt, face: 'soldier' });
  const key = `rocketeer${level}`;
  const red = glowMat(h, plasma ? 0xe040fb : 0xff5252);
  const purple = glowMat(h, 0xd500f9);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  helmet(hd, plasma ? 0x212121 : 0x6d4c41, { cover: plasma ? 0x311b92 : 0x5d4037 });
  collar(t, tone(shirt, 0.85));
  belt(t, 0x3e2723);
  if (level >= 1) rocketPack(t, 3, plasma ? 0x37474f : 0x9e9e9e, plasma ? purple : 0xe65100);
  if (level >= 2) {
    monocle(hd, red);
    if (!plasma) vest(t, 0x5d4037, { pouches: 2 });
  }
  if (plasma) {
    t.box(2.2, 1.3, 1.2, 0x4527a0, 0, 0.35, 0, { r: 0.16 });
    shoulderPads(t, 0x4527a0, 0.6);
    t.cyl(0.2, 0.08, purple, 0, 0.45, 0.62, { axis: 'z', seg: 12 });
  }
  hd.done();
  t.done();
  hands(h, key, 0x3e2723, tone(shirt, 0.8), (a, s) => armPatch(a, s, tone(shirt, 0.8), s > 0 ? 0xe65100 : null));
  feet(h, key, 0x3e2723, level >= 2 ? kneePad : null);
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = tubeLauncher(gk, {
    r: bazooka ? 0.42 : 0.32, len: bazooka ? 2.9 : 2.4, back: 0.7,
    col: plasma ? 0x4a148c : bazooka ? 0x556b2f : 0x616161,
    venturi: bazooka, scope: level >= 2 ? red : null, bands: plasma ? purple : null,
    warhead: plasma ? null : 0xe65100, fat: bazooka,
  });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.pose.leftRecoil = 0.2;
  h.projectile = plasma ? { color: 0xe040fb, size: 1.4 } : bazooka ? { color: 0xff6d00, size: 1.2 } : { color: 0xff6d00, size: 1 };
  return own(h);
}

// ------------------------------------------------------------------ Missile Rocketeer

/**
 * Missile Rocketeer (alternate Rocketeer form): a heavy weapons trooper. Lv 1 a pack of white
 * missiles, Lv 2 a visor, a vest and an optic, Lv 3 a longer olive launcher, Lv 4 Missile
 * Maelstrom: a quad missile pod in dark grey.
 */
export function makeRocketeerMissile(level) {
  const quad = level >= 4;
  const shirt = quad ? 0x263238 : 0x5d6b3a;
  const h = makeHumanoid({ skin: 0x8d5524, shirt, pants: quad ? 0x1c2429 : 0x3e4a2a, arms: shirt, face: 'soldier' });
  const key = `rocketeerMissile${level}`;
  const amber = glowMat(h, 0xff8f00);
  const fire = glowMat(h, 0xff3d00);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  helmet(hd, quad ? 0x37474f : 0x4b5320, { cover: quad ? 0x263238 : 0x3e4a2a });
  hd.box(0.3, 0.22, 0.05, shardOf(h), 0.4, 1.02, 0.62, { ry: -0.55, rx: -0.4 }); // Dimension Shard badge
  collar(t, tone(shirt, 0.85));
  belt(t, 0x3e2723);
  if (level >= 1) rocketPack(t, 3, 0xeceff1, quad ? 0xd32f2f : 0x37474f, 0x4e342e);
  if (level >= 2) {
    visor(hd, amber);
    vest(t, quad ? 0x37474f : 0x4a5232, { pouches: 3 });
  }
  if (quad) shoulderPads(t, 0x37474f, 0.62);
  hd.done();
  t.done();
  hands(h, key, 0x212121, tone(shirt, 0.8));
  feet(h, key, 0x2b2b2b, kneePad);
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = quad
    ? rocketPod(gk, 2, 2, 0x37474f, fire, { pitch: 0.5, len: 2.6, sight: amber })
    : tubeLauncher(gk, { r: level >= 3 ? 0.44 : 0.38, len: level >= 3 ? 3.0 : 2.6, col: level >= 3 ? 0x33691e : 0x616161, venturi: true, scope: level >= 2 ? amber : null, warhead: 0xeceff1, fat: level >= 3 });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.pose.leftRecoil = 0.2;
  h.projectile = quad ? { color: 0xeceff1, size: 0.9 } : { color: 0xff6d00, size: level >= 3 ? 1.3 : 1.1 };
  return own(h);
}

// ------------------------------------------------------------------ Missile Trooper

/**
 * Missile Trooper (alternate Rocketeer form with two paths): a desert-camo trooper with a
 * shoulder launcher. Top: Lv 1 an orange HE warhead, Lv 2 an optic sight, Lv 3 the longer
 * SMAW+ and a visor, Lv 4 a fat warhead, Lv 5 the olive Javelin with its launch unit.
 * Bottom: Lv 1 gloves, Lv 2 a rocket bandolier, Lv 3 the green Carl Gustaf with a front grip,
 * Lv 4 a wider bore, Lv 5 a six-tube rocket pod.
 */
export function makeRocketeerTrooper(level, bottom = false) {
  const top = !bottom;
  const jav = top && level >= 5;
  const mrl = bottom && level >= 5;
  const shirt = mrl ? 0x3b3f2a : jav ? 0x6b5d3f : 0xa08c62;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: mrl ? 0x262a1b : 0x7a6a48, arms: shirt, face: 'soldier' });
  const key = `rocketeerTrooper${bottom ? 'B' : 'T'}${level}`;
  const lens = glowMat(h, mrl ? 0x76ff03 : 0x4fc3f7);
  const red = glowMat(h, 0xff1744);
  const fire = glowMat(h, 0xff3d00);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  helmet(hd, mrl ? 0x2e3322 : 0x8a7a55, { cover: mrl ? 0x262a1b : 0x7a6a48 });
  hd.box(0.3, 0.22, 0.05, shardOf(h), 0.4, 1.02, 0.62, { ry: -0.55, rx: -0.4 }); // Dimension Shard badge
  if ((top && level >= 3) || mrl) visor(hd, lens);
  collar(t, tone(shirt, 0.85));
  // desert camo blotches
  for (const [x, y, w, c] of [[-0.5, 0.4, 0.5, 0x7a6a48], [0.4, -0.2, 0.6, 0xc2b280], [-0.3, -0.6, 0.4, 0x8d7b55]]) t.box(w, w * 0.6, 0.04, mrl ? tone(c, 0.5) : c, x, y, 0.56, { r: 0.02 });
  belt(t, 0x4e342e);
  if (level >= 3) vest(t, mrl ? 0x2e3322 : 0x6d6046, { pouches: 3 });
  if (bottom && level >= 2) {
    sash(t, 0x4e342e, -1, 0.3);
    for (const s of [-0.6, 0, 0.6]) {
      t.cyl(0.1, 0.4, 0xff6d00, Math.sin(-0.62) * -s, Math.cos(0.62) * s, 0.72, { seg: 10, rz: -0.62 });
      t.cyl(0.1, 0.15, 0x9e9e9e, Math.sin(-0.62) * -s + 0.1, Math.cos(0.62) * s - 0.15, 0.72, { seg: 10, rz: -0.62, r2: 0.03 });
    }
  }
  // a spare rocket slung on the back
  rocket(t, 0.5, -0.7, -0.75, 0.2, 1.9, 0x5d5d4a, top && level >= 1 ? 0xff6d00 : 0x9e9e9e);
  t.box(0.6, 0.1, 0.5, INK, 0.5, 0.2, -0.75);
  hd.done();
  t.done();
  hands(h, key, bottom && level >= 1 ? 0x212121 : null, tone(shirt, 0.8));
  feet(h, key, 0x8d6e47, level >= 3 ? kneePad : null);
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  let bore;
  if (mrl) bore = rocketPod(gk, 3, 2, 0x3b3f2a, fire, { pitch: 0.44, len: 2.6, sight: lens });
  else if (jav) {
    // Javelin: a thick olive tube with end caps and the command launch unit on the side
    bore = tubeLauncher(gk, { r: 0.55, len: 3.0, back: 1.0, col: 0x556b2f });
    for (const y of [0.9, -2.85]) gk.cyl(0.66, 0.3, 0x3d4d21, 0, y, bore[1], { seg: 18 });
    gk.box(0.8, 0.9, 0.7, 0x333333, 0.95, -0.4, bore[1] + 0.1, { r: 0.08 });
    gk.cyl(0.18, 0.05, red, 0.95, -0.4, bore[1] + 0.47, { axis: 'z', seg: 12 });
    for (const s of [-1, 1]) gk.box(0.12, 0.3, 0.12, INK, 0.95 + s * 0.3, -0.75, bore[1] + 0.4); // handles
  } else {
    const carl = bottom && level >= 3;
    bore = tubeLauncher(gk, {
      r: carl ? (level >= 4 ? 0.5 : 0.44) : top && level >= 4 ? 0.42 : 0.36,
      len: carl ? 2.8 : top && level >= 3 ? 3.0 : 2.5,
      col: carl ? 0x2e7d32 : 0x6d6046, venturi: carl, grip: carl,
      scope: top && level >= 2 ? lens : null,
      warhead: top && level >= 1 ? 0xff6d00 : null, fat: top && level >= 4,
    });
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, bore[0], bore[1]);
  aimLong(h);
  h.pose.leftRecoil = 0.2;
  h.projectile = mrl ? { color: 0xffab40, size: 0.75 } : jav ? { color: 0xeceff1, size: 1.3 } : { color: 0xff6d00, size: level >= 3 ? 1.2 : 1.0 };
  return own(h);
}
export const makeRocketeerTrooperBottom = (level) => makeRocketeerTrooper(level, true);

// ------------------------------------------------------------------ Mortar

/**
 * Mortar (cliff): a crewman with a shell beside a mortar. Lv 1 ear defenders and a crate of
 * ready shells, Lv 2 a wider tube and a sandbag wall, Lv 3 a heavier helmet and a shell rack,
 * Lv 4 Doomsday: glowing green shells and bands on the tube.
 */
export function makeMortar(level) {
  const doom = level >= 4;
  const shirt = 0x6b7d3a;
  const h = makeHumanoid({ skin: 0x8d5524, shirt, pants: 0x4b5320, arms: shirt, face: 'soldier' });
  const key = `mortar${level}`;
  const green = glowMat(h, 0x76ff03);
  const shellCol = doom ? green : 0x37474f;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  helmet(hd, level >= 3 ? 0x37474f : 0x556b2f, { cover: 0x4b5320, y: level >= 3 ? 0.95 : 0.92 });
  if (level >= 3) hd.cyl(0.8, 0.06, 0x37474f, 0, 0.95, 0, { seg: 22 }); // wider brim
  if (level >= 1) earMuffs(hd, 0xff8f00);
  collar(t, tone(shirt, 0.85));
  belt(t, 0x3e2723);
  pouch(t, -0.6, -0.95, 0.55, 0.4, 0.4, 0x4b5320, 0.2);
  pouch(t, 0.6, -0.95, 0.55, 0.4, 0.4, 0x4b5320, 0.2);
  if (level >= 2) vest(t, 0x55663a, { pouches: 2 });
  hd.done();
  t.done();
  hands(h, key, 0x3e2723, tone(shirt, 0.8), (a, s) => armPatch(a, s, tone(shirt, 0.8), s > 0 ? 0xffd54f : null));
  feet(h, key, 0x3e2723, kneePad);
  const r = wear(h, h.root, `${key}:ground`);
  if (level >= 1) {
    // an open crate of ready shells
    r.box(1.3, 0.6, 0.9, 0x6d4c41, -2.0, 0.3, 1.0, { r: 0.04 });
    r.box(1.34, 0.08, 0.94, 0x4e342e, -2.0, 0.55, 1.0);
    r.box(1.3, 0.06, 0.7, 0x8d6e63, -2.0, 0.85, 0.5, { rx: -0.9 }); // open lid
    for (const x of [-2.35, -2.0, -1.65]) {
      r.cyl(0.13, 0.45, shellCol, x, 0.75, 1.0, { seg: 10 });
      r.cyl(0.13, 0.2, doom ? green : 0x263238, x, 1.07, 1.0, { seg: 10, r2: 0.03 });
    }
  }
  if (level >= 2) sandbags(r, 3.3, 1.6, 2.2, 6);
  if (level >= 3) shellRack(r, 1.95, 0.2, 4, shellCol, doom ? green : 0x263238);
  r.done();
  const tube = mortarGun(h, key, { r: level >= 2 ? 0.42 : 0.33, len: level >= 2 ? 3.6 : 3.0, col: doom ? 0x37474f : 0x4a5a3a, bands: doom ? green : null });
  h.muzzles = [];
  muzzle(h, tube, (level >= 2 ? 3.6 : 3.0) + 0.3, 0);
  loaderPose(h, key, shellCol, false, doom ? green : null);
  h.projectile = doom ? { color: 0x76ff03, size: 0.9, arc: 20, glowing: true } : { color: 0x37474f, size: 0.6, arc: 18 };
  return own(h, 0);
}

// ------------------------------------------------------------------ Classic Mortar

/**
 * Classic Mortar (alternate Mortar form): a gunner with a big mortar cannon behind sandbags.
 * Lv 1 purple ear defenders, Lv 2 a wider tube, Lv 3 a bigger cannon with reinforcing bands,
 * Lv 4 a rack of cluster shells, Lv 5 City Buster: a hazard vest and glowing yellow shells.
 */
export function makeMortarClassic(level) {
  const nuke = level >= 5;
  const coat = nuke ? 0x2b2b2b : 0x7a6a45;
  const h = makeHumanoid({ skin: 0xc68642, shirt: coat, pants: nuke ? 0x1a1a1a : 0x4e4630, arms: coat, face: 'soldier' });
  const key = `mortarClassic${level}`;
  const yellow = glowMat(h, 0xffd600);
  const shellCol = nuke ? yellow : 0x8d6e63;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  helmet(hd, nuke ? 0x212121 : 0x5d5040, { cover: nuke ? 0x333333 : 0x4e4630 });
  hd.box(0.3, 0.22, 0.05, shardOf(h), 0, 1.1, 0.66, { rx: -0.4 }); // Dimension Shard emblem
  if (level >= 1) earMuffs(hd, 0x6a1b9a);
  collar(t, tone(coat, 0.85));
  t.box(0.36, 0.24, 0.04, shardOf(h), -0.55, 0.45, 0.58);
  belt(t, 0x3e2723);
  if (nuke) {
    t.box(2.2, 1.5, 1.18, 0xfbc02d, 0, 0.15, 0, { r: 0.14 }); // hazard vest
    for (const y of [0.45, -0.15]) t.box(2.24, 0.14, 1.22, 0xeceff1, 0, y, 0);
    t.cyl(0.24, 0.04, INK, 0.5, 0.65, 0.6, { axis: 'z', seg: 3 }); // hazard sign
  }
  hd.done();
  t.done();
  hands(h, key, 0x3e2723, tone(coat, 0.8));
  feet(h, key, 0x3e2723, kneePad);
  const r = wear(h, h.root, `${key}:ground`);
  sandbags(r, 3.4, 1.7, 2.3, 6);
  if (level >= 4) shellRack(r, 2.0, 0.2, 3, shellCol, nuke ? yellow : 0x5d4037, { r: 0.22, h: 1.05 });
  r.done();
  const len = level >= 3 ? 4.0 : level >= 2 ? 3.4 : 3.0;
  const tube = mortarGun(h, key, {
    z: 2.3, r: level >= 3 ? 0.56 : level >= 2 ? 0.47 : 0.38, len, lean: 0.45,
    col: nuke ? 0x37474f : 0x5d6b3a, rings: level >= 3 ? [0.22, 0.5] : [], stripe: nuke ? yellow : null,
  });
  h.muzzles = [];
  muzzle(h, tube, len + 0.3, 0);
  loaderPose(h, key, shellCol, level >= 4, nuke ? 0x212121 : null);
  h.projectile = nuke ? { color: 0xffd600, size: 1.0, arc: 18, glowing: true } : { color: 0x5d4037, size: 0.7, arc: 16 };
  return own(h, 0);
}

// ------------------------------------------------------------------ Artillery

/**
 * Artillery (alternate Mortar form with two paths): a gunner beside a wheeled field howitzer.
 * Top: Lv 1 ear defenders, Lv 2 a longer M119 barrel, Lv 3 a shell rack, Lv 4 fat shells, Lv 5
 * three barrels. Bottom: Lv 1 HE shells, Lv 2 a heavier gun and a rack, Lv 3 the big M198 with
 * recoil cylinders, Lv 4 a bigger gun, Lv 5 the grey Skyhawk with a spinning radar dish.
 */
export function makeArtillery(level, bottom = false) {
  const sky = bottom && level >= 5;
  const coat = sky ? 0x37474f : 0x6b7d3a;
  const h = makeHumanoid({ skin: 0xc68642, shirt: coat, pants: sky ? 0x263238 : 0x4b5320, arms: coat, face: 'soldier' });
  const key = `artillery${bottom ? 'B' : 'T'}${level}`;
  const red = glowMat(h, 0xff1744);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  helmet(hd, sky ? 0x455a64 : 0x556b2f, { cover: sky ? 0x37474f : 0x4b5320 });
  hd.box(0.3, 0.22, 0.05, shardOf(h), 0, 1.1, 0.66, { rx: -0.4 }); // Dimension Shard emblem
  if (level >= 1) earMuffs(hd, 0xff8f00);
  collar(t, tone(coat, 0.85));
  belt(t, 0x3e2723);
  if (level >= 2) vest(t, sky ? 0x455a64 : 0x55663a, { pouches: 2 });
  hd.done();
  t.done();
  hands(h, key, 0x3e2723, tone(coat, 0.8));
  feet(h, key, 0x3e2723, kneePad);
  // the howitzer: a split-trail carriage on two round wheels, a shield and a barrel cradle
  const gun = new THREE.Group();
  gun.position.set(1.6, 0, 2.2);
  gun.scale.setScalar(bottom ? [1, 1, 1.1, 1.3, 1.45, 1.6][level] : level >= 2 ? 1.1 : 1);
  h.root.add(gun);
  const steel = sky ? 0x78909c : 0x4a5a3a;
  const g = wear(h, gun, `${key}:carriage`);
  g.box(1.5, 0.45, 1.2, steel, 0, 0.95, 0, { r: 0.08 }); // axle housing
  g.cyl(0.12, 2.1, INK, 0, 0.7, 0, { axis: 'x', seg: 10 }); // axle
  for (const s of [-1, 1]) {
    g.tube([[s * 0.5, 0.75, -0.3], [s * 0.7, 0.45, -1.6], [s * 0.85, 0.12, -2.8]], 0.1, steel, { seg: 6, sides: 6 }); // trail legs
    g.box(0.4, 0.4, 0.12, INK, s * 0.85, 0.15, -2.85, { r: 0.03 }); // spades
    g.box(0.08, 0.6, 0.6, tone(steel, 0.8), s * 0.65, 1.55, 0.1, { r: 0.03 }); // cradle cheeks
  }
  g.slab(1.7, 1.1, 0.1, steel, 0, 1.55, 0.75, { tw: 0.85 }); // gun shield
  g.box(0.5, 0.3, 0.12, INK, 0.45, 1.85, 0.82); // sight window
  g.box(0.2, 0.25, 0.3, 0x263238, -0.55, 1.75, 0.55); // panoramic sight
  if (sky) {
    // Skyhawk: a mast with a radar dish (the dish spins)
    g.cyl(0.07, 1.8, 0x263238, -0.7, 2.2, -0.6, { seg: 8 });
    g.box(0.3, 0.3, 0.3, 0x263238, -0.7, 1.4, -0.6, { r: 0.04 });
  }
  g.done();
  for (const s of [-1, 1]) wheel(h, gun, s * 1.05, 0.7, 0, 0.7, 0.32);
  if (sky) {
    const dish = spinner(h, gun, -0.7, 3.15, -0.6);
    const d = wear(h, dish, `${key}:dish`);
    d.cyl(0.65, 0.12, 0xcfd8dc, 0, 0, 0.1, { axis: 'z', seg: 18, r2: 0.4, rx: -0.5 });
    d.cyl(0.05, 0.5, 0x263238, 0, 0.12, 0.3, { axis: 'z', seg: 6, rx: -0.5 });
    d.ball(0.12, red, 0, 0.2, 0.52, { seg: 8, rows: 6 });
    d.done();
    h.idleSpin = 1.2;
  }
  const n = !bottom && level >= 5 ? 3 : 1;
  const len = bottom ? 4.2 : level >= 2 ? 4.4 : 3.8;
  const br = bottom && level >= 3 ? 0.3 : 0.22;
  const barrels = new THREE.Group();
  barrels.position.set(0, 1.45, 0.2);
  barrels.rotation.x = 0.9; // tilted up toward the sky
  gun.add(barrels);
  const b = wear(h, barrels, `${key}:barrels`);
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.55;
    b.cyl(br, len, sky ? 0x546e7a : 0x3e4a2a, x, len / 2, 0, { seg: 14, r2: br * 0.85 });
    b.cyl(br * 1.5, br * 2.4, INK, x, len - br * 1.2, 0, { seg: 12 }); // muzzle brake
    b.box(br * 3.2, br * 0.6, br * 0.8, 0x0e0f10, x, len - br * 1.2, 0);
    b.cyl(br * 1.25, 0.6, tone(sky ? 0x546e7a : 0x3e4a2a, 0.8), x, 0.2, 0, { seg: 12 }); // breech
  }
  if (bottom && level >= 3) for (const s of [-1, 1]) b.cyl(0.13, 1.5, STEEL, s * 0.3, 0.9, -br - 0.05, { seg: 10 }); // recoil cylinders
  b.done();
  h.muzzles = [];
  muzzle(h, barrels, len + 0.3, 0);
  const shellCol = bottom && level >= 1 ? 0x8d6e63 : 0x37474f;
  if ((!bottom && level >= 3) || (bottom && level >= 2)) {
    const r = wear(h, h.root, `${key}:ground`);
    shellRack(r, -2.0, 0.4, 3, shellCol, 0xb0b0b0, { r: 0.2, h: 1.1 });
    r.done();
  }
  const fat = (!bottom && level >= 4) || sky;
  loaderPose(h, key, shellCol, fat, 0xb0b0b0);
  h.projectile = sky ? { color: 0xff6d00, size: 1.1, arc: 26, glowing: true } : { color: 0x37474f, size: fat ? 0.9 : 0.7, arc: 24 };
  return own(h, 0);
}

// ------------------------------------------------------------------ Flamethrower

/** A gas mask: face plate, two round lenses, a filter can and straps (head space). */
export function gasMask(k, col, lens) {
  band(k, 0.69, 0.08, 0.75, 2.4, col, 0.55);
  for (const s of [-1, 1]) {
    k.cyl(0.2, 0.12, INK, s * 0.26, 0.76, 0.68, { axis: 'z', seg: 14 });
    k.cyl(0.16, 0.04, lens, s * 0.26, 0.76, 0.74, { axis: 'z', seg: 14 });
  }
  k.cyl(0.22, 0.32, INK, 0, 0.32, 0.78, { axis: 'z', seg: 14, rx: 0.4 }); // filter
  k.cyl(0.2, 0.05, 0x616161, 0, 0.26, 0.94, { axis: 'z', seg: 14, rx: 0.4 });
  for (const y of [0.9, 0.5]) k.torus(0.69, 0.035, INK, 0, y, 0, { rx: PI / 2, seg: 20 }); // straps
}

/** Fuel tanks on a back frame: `xs` bottles of radius r and height hh, with valves and a hose to the hand (torso space). */
export function fuelTanks(k, xs, r, hh, col, o = {}) {
  const z = -0.6 - r;
  k.box(xs.length * r * 2 + 0.3, hh * 0.9, 0.12, INK, 0, o.y ?? 0, -0.6); // back plate
  for (const x of xs) {
    k.cyl(r, hh, col, x, o.y ?? 0, z, { seg: 14 });
    for (const s of [-1, 1]) k.ball(r, col, x, (o.y ?? 0) + s * hh / 2, z, { sy: 0.45, seg: 14, rows: 5 });
    k.cyl(0.08, 0.2, STEEL, x, (o.y ?? 0) + hh / 2 + r * 0.45, z, { seg: 8 });
    if (o.stripe) k.cyl(r + 0.01, 0.16, o.stripe, x, (o.y ?? 0) + hh * 0.2, z, { seg: 14 });
  }
  for (const s of [-1, 1]) {
    k.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
    k.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
  }
  k.box(xs.length * r * 2 + 0.2, 0.14, 0.14, STEEL, 0, (o.y ?? 0) - hh / 2 + 0.1, z - r * 0.4); // manifold
  for (const s of o.hoses ?? [-1]) k.tube([[s * 0.3, (o.y ?? 0) - hh / 2, z], [s * 1.0, -1.0, -0.4], [s * 1.25, -0.7, 0.2]], 0.07, 0x212121, { seg: 12, sides: 6 });
}

/** A flame wand on the fist (gun space): rear grip and valve, a long tube and a shrouded tip with a pilot light. Returns the tip y. */
export function flameWand(k, pilot, o = {}) {
  const len = o.len ?? 2.0;
  const U = UP;
  k.box(0.22, 0.26, 0.5, INK, 0, 0.1, U - 0.32, { rx: -0.3, r: 0.04 });
  k.cyl(0.14, 0.7, GUNMETAL, 0, -0.1, U, { seg: 12 }); // valve body
  k.cyl(0.18, 0.08, 0xd32f2f, 0.2, -0.1, U, { axis: 'x', seg: 10 }); // valve wheel
  k.cyl(0.08, len - 0.7, STEEL, 0, -0.45 - (len - 0.7) / 2, U, { seg: 10 }); // tube
  k.box(0.18, 0.2, 0.5, INK, 0, -0.9, U - 0.3, { r: 0.04 }); // front grip
  const tip = -len;
  k.cyl(o.wide ? 0.34 : 0.17, 0.4, INK, 0, tip + 0.2, U, { seg: 12, r2: o.wide ? 0.24 : 0.15 }); // shroud
  for (let i = 0; i < 3; i++) k.box(0.04, 0.3, 0.06, 0x050505, Math.sin(i * 2.1) * 0.16, tip + 0.25, U + Math.cos(i * 2.1) * 0.16);
  k.ball(0.07, pilot, 0.05, tip + 0.05, U - 0.2, { seg: 8, rows: 6 }); // pilot light
  return tip - 0.1;
}

/**
 * Flamethrower: a gas mask and fuel tanks. Lv 1 a third, taller tank, Lv 2 a silver fire suit
 * and a wide nozzle, Lv 3 Inferno: orange tanks with hazard bands, Lv 4 Twin Torches: four tanks
 * and a wand in each hand.
 */
export function makeFlamethrower(level) {
  const twin = level >= 4;
  const suit = level >= 2;
  const shirt = suit ? 0x9e9e9e : 0x5d4037;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: suit ? 0x757575 : 0x3e2723, arms: shirt });
  const key = `flamethrower${level}`;
  const pilot = glowMat(h, 0xff9100);
  const amber = glowMat(h, 0xffa000);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (suit) {
    // a silver fire hood over the mask
    dome(hd, 0.76, 0.66, 0xbdbdbd, 0, 0.92, 0);
    band(hd, 0.76, 0.07, 1.0, 3.6, 0xbdbdbd, 0.45, { ry: PI });
    hd.box(1.6, 0.3, 1.4, 0xbdbdbd, 0, 0.0, -0.05, { r: 0.1 }); // shoulder cape
  } else helmet(hd, 0x424242, { band: false });
  gasMask(hd, suit ? 0x9e9e9e : 0x424242, amber);
  collar(t, tone(shirt, 0.85), { buttons: false });
  for (const y of [0.3, -0.3]) t.box(2.18, 0.1, 1.16, suit ? 0xe0e0e0 : 0x8d6e63, 0, y, 0); // quilting
  belt(t, 0x212121);
  pouch(t, 0.6, -0.95, 0.55, 0.4, 0.4, 0x212121, 0.2);
  const tank = level >= 3 ? 0xffa000 : 0xc62828;
  const xs = twin ? [-0.6, -0.2, 0.2, 0.6] : level >= 1 ? [-0.55, 0, 0.55] : [-0.35, 0.35];
  fuelTanks(t, xs, twin ? 0.2 : level >= 1 ? 0.26 : 0.32, level >= 1 ? 2.0 : 1.6, tank, {
    y: level >= 1 ? 0.2 : 0, stripe: level >= 3 ? 0x212121 : null, hoses: twin ? [-1, 1] : [-1],
  });
  hd.done();
  t.done();
  hands(h, key, suit ? 0x757575 : 0x3e2723, tone(shirt, 0.8));
  feet(h, key, 0x212121);
  h.muzzles = [];
  for (const arm of twin ? [h.rightArm, h.leftArm] : [h.rightArm]) {
    const g = fist(arm, -1.9, 1.15);
    const gk = wear(h, g, `${key}:wand`);
    const tip = flameWand(gk, pilot, { len: 2.0, wide: suit });
    gk.done();
    muzzle(h, g, tip, UP);
  }
  if (twin) {
    h.rightArm.rotation.set(-PI / 2, 0, 0.12);
    h.leftArm.rotation.set(-PI / 2, 0, -0.12);
    h.pose = { right: -PI / 2, left: -PI / 2, leftRecoil: 0.05 };
  } else {
    h.rightArm.rotation.set(-PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-PI / 2 + 0.15, 0, -0.5);
    h.pose = { right: -PI / 2, left: -PI / 2 + 0.15, leftRecoil: 0.05 };
  }
  h.recoilScale = 0.1;
  return own(h);
}
