// Tower models: people, batch 15 (dressed with the vehicle kit in ../vehicles.js).
// In here: Swarmer, Toxic Gunner, Sledger, Ice Breaker, Executioner, Jester, Cryomancer.
// Each makeX(level) builds one tower's look; TOWER_MODELS in ../models.js says which tower uses which.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.

import * as THREE from 'three';
import { glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import {
  GOLD, INK, LEATHER, STEEL, UP, WOOD, aimLong, band, belt, collar, dome, fist, goggles, hair, helmet, kneePad,
  muzzle, own, pockets, pouch, sash, shardOf, vest, wear,
} from './people1.js';
import { shoulderPads } from './people2.js';
import { beanie, minigun, smg } from './people3.js';
import { feet, glassMat, hands, hood } from './people5.js';
import { coolant, cryoGun, shard, spare } from './people6.js';
import { fuelTanks } from './people7.js';
import { rubberGloves } from './people8.js';
import { spinner } from './machines5.js';
import { bee, skep } from './machines8.js';

const PI = Math.PI;
const ICE = 0x80d8ff;
const FUR = 0xeceff1;
const HONEY = 0xffb300;

// ------------------------------------------------------------------ shared bits for this batch

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _Y = new THREE.Vector3(0, 1, 0);

/** A tapered rod from point a (radius r1) to point b (radius r2), any direction (any space). */
function limb(k, a, b, r1, r2, col, seg = 8) {
  _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = _v.length();
  _q.setFromUnitVectors(_Y, _v.normalize());
  _e.setFromQuaternion(_q);
  k.cyl(r1, len, col, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, { r2, seg, rx: _e.x, ry: _e.y, rz: _e.z });
}

/** A six-sided ice crystal growing from `a` toward `b` (any space): a long body and a pointed tip. */
function crystal(k, a, b, r, mat) {
  const m = [a[0] + (b[0] - a[0]) * 0.72, a[1] + (b[1] - a[1]) * 0.72, a[2] + (b[2] - a[2]) * 0.72];
  limb(k, a, m, r * 0.8, r, mat, 6);
  limb(k, m, b, r, 0.0001, mat, 6);
}

/** An icicle hanging point-down from y (any space). */
function icicle(k, x, y, z, len, mat) {
  k.cyl(0.0001, len, mat, x, y - len / 2, z, { seg: 6, r2: 0.08 });
}

/** A bushy beard, a chin tuft and a moustache (head space). */
function beard(k, col) {
  band(k, 0.665, 0.14, 0.5, 2.5, col, 0.25);
  k.ball(0.36, col, 0, 0.1, 0.48, { sy: 1.15, sz: 0.7, seg: 12, rows: 8 });
  for (const s of [-1, 1]) k.box(0.34, 0.12, 0.12, tone(col, 0.85), s * 0.18, 0.46, 0.64, { rz: s * 0.28, r: 0.05 });
}

/** A fur trapper hat: fur band, cloth crown, ear flaps and a front flap turned up (head space). */
function ushanka(k, col, fur) {
  k.cyl(0.8, 0.42, fur, 0, 1.1, 0, { seg: 22, r2: 0.76 });
  dome(k, 0.7, 0.42, col, 0, 1.28, 0);
  k.box(0.08, 0.38, 1.3, tone(col, 0.8), 0, 1.5, 0, { r: 0.03 }); // seam
  k.box(1.1, 0.5, 0.2, fur, 0, 1.3, 0.72, { rx: -0.25, r: 0.08 }); // front flap
  for (const s of [-1, 1]) {
    k.box(0.22, 0.8, 0.8, fur, s * 0.72, 0.62, -0.02, { r: 0.1 }); // ear flaps
    k.tube([[s * 0.76, 0.25, 0.1], [s * 0.7, -0.1, 0.25], [s * 0.6, -0.3, 0.2]], 0.03, INK, { seg: 6, sides: 4 }); // ties
  }
}

/** A quilted puffy coat over the chest (torso space): body, quilt seams, fur collar, toggles. */
function parka(k, col, fur, o = {}) {
  k.box(2.24, 2.0, 1.22, col, 0, 0.02, 0, { r: 0.18 });
  for (const y of [0.55, 0.0, -0.55]) k.box(2.27, 0.05, 1.25, tone(col, 0.75), 0, y, 0, { r: 0.02 });
  k.box(0.05, 1.8, 0.04, tone(col, 0.6), 0.12, 0.0, 0.62); // zip line
  if (fur != null) {
    k.torus(0.72, 0.2, fur, 0, 1.02, 0, { rx: PI / 2, seg: 18, sz: 0.65 }); // fur collar
    k.box(2.26, 0.26, 1.26, fur, 0, -0.95, 0, { r: 0.1 }); // fur hem
  }
  if (o.toggles !== false) for (let i = 0; i < 3; i++) {
    k.cyl(0.05, 0.3, WOOD, -0.08, 0.5 - i * 0.45, 0.66, { axis: 'x', seg: 6 }); // wooden toggles
    k.torus(0.07, 0.02, INK, 0.12, 0.5 - i * 0.45, 0.64, { seg: 8 });
  }
}

/** A tool-hung leather belt with a pouch on each hip (torso space). */
function workBelt(k, col, buckle = 0x9e9e9e) {
  belt(k, col, buckle);
  pouch(k, 0.65, -0.98, 0.56, 0.45, 0.4, tone(col, 1.15), 0.2);
  pouch(k, -0.7, -0.98, 0.56, 0.4, 0.36, tone(col, 1.15), 0.18);
}

// ------------------------------------------------------------------ Swarmer

/** A beekeeper's hat: brim, crown, band and a see-through veil down to the shoulders (head space). */
function beeHat(k, col, bandCol, veil) {
  k.cyl(1.05, 0.06, col, 0, 1.18, 0, { seg: 26 });
  k.torus(1.05, 0.035, tone(col, 0.85), 0, 1.18, 0, { rx: PI / 2, seg: 26 });
  k.cyl(0.6, 0.42, col, 0, 1.42, 0, { seg: 20, r2: 0.55 });
  dome(k, 0.55, 0.18, col, 0, 1.63, 0);
  k.cyl(0.62, 0.13, bandCol, 0, 1.28, 0, { seg: 20 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2 + 0.3;
    k.cyl(0.05, 0.04, INK, Math.sin(a) * 0.57, 1.5, Math.cos(a) * 0.57, { axis: 'z', seg: 6, ry: a }); // air holes
  }
  // the veil: mesh hanging from the brim, with ribs and an elastic hem on the shoulders
  k.cyl(0.88, 1.12, veil, 0, 0.6, 0, { seg: 22, r2: 1.0, open: true });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    limb(k, [Math.sin(a) * 1.0, 1.15, Math.cos(a) * 1.0], [Math.sin(a) * 0.88, 0.05, Math.cos(a) * 0.88], 0.012, 0.012, 0x37474f, 4);
  }
  k.torus(0.88, 0.05, tone(col, 0.9), 0, 0.04, 0, { rx: PI / 2, seg: 22 });
}

/**
 * The hive blaster (gun space): a wooden stock, a six-sided honeycomb drum for a barrel, a flared
 * mouth full of comb cells and (o.can) a glass honey canister on top. Returns the mouth [y, z].
 */
function hiveGun(k, o = {}) {
  const U = UP;
  const B = U + 0.06;
  const s = o.s ?? 1;
  const comb = o.comb ?? HONEY;
  const dark = o.dark ?? 0x4e342e;
  const L = o.len ?? 0.9;
  k.box(0.22, 0.26, 0.5, INK, 0, 0.1, U - 0.34, { rx: -0.3, r: 0.04 }); // grip
  k.torus(0.1, 0.022, INK, 0, -0.14, U - 0.24, { ry: PI / 2, seg: 10, arc: PI });
  k.slab(0.28, 0.75, 0.34, o.wood ?? WOOD, 0, 0.55, U - 0.06, { td: 1.5, tz: -0.06 }); // stock
  k.box(0.3, 0.06, 0.5, INK, 0, 0.94, U - 0.1);
  k.cyl(0.2, 0.5, dark, 0, 0.0, B, { seg: 12 }); // rear body
  k.cyl(0.22, 0.06, INK, 0, 0.24, B, { seg: 12 });
  // the comb drum
  const y0 = -0.25;
  k.cyl(0.36 * s, L, comb, 0, y0 - L / 2, B, { seg: 6 });
  for (let i = 0; i < 3; i++) k.cyl(0.38 * s, 0.07, tone(comb, 0.65), 0, y0 - 0.04 - (i * (L - 0.08)) / 2, B, { seg: 6 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2 + PI / 6;
    k.cyl(0.07, 0.03, tone(comb, 0.55), Math.cos(a) * 0.31 * s, y0 - L / 2, B + Math.sin(a) * 0.31 * s, { axis: 'z', seg: 6 }); // comb cells on the sides
  }
  // the mouth: a dark flare with comb cells in its face
  const tip = y0 - L - 0.28;
  k.cyl(0.42 * s, 0.28, dark, 0, y0 - L - 0.14, B, { seg: 6, r2: 0.32 * s });
  k.ball(0.07, GOLD, 0, y0 - L - 0.05, B + 0.4 * s, { seg: 6, rows: 4 }); // front sight
  for (const [x, z] of [[0, 0], [0.18, 0.1], [-0.18, 0.1], [0.18, -0.1], [-0.18, -0.1], [0, 0.2], [0, -0.2]]) {
    k.cyl(0.075 * s, 0.04, o.cell ?? 0x3e2410, x * s, tip - 0.01, B + z * s, { seg: 6 });
  }
  if (o.can) {
    // a glass honey canister with a feed pipe
    k.cyl(0.15, 0.62, o.can, 0, -0.55, B + 0.36 * s + 0.2, { seg: 12 });
    for (const y of [-0.24, -0.86]) k.cyl(0.17, 0.07, STEEL, 0, y, B + 0.36 * s + 0.2, { seg: 12 });
    k.cyl(0.05, 0.25, STEEL, 0, -0.55, B + 0.36 * s + 0.02, { seg: 6, rx: PI / 2 });
  }
  return [tip, B];
}

/** A striped bee grenade (any space). */
function beeNade(k, x, y, z, r = 0.2) {
  k.ball(r, 0xfdd835, x, y, z, { sy: 1.2, seg: 12, rows: 8 });
  for (const t of [-0.35, 0.3]) k.torus(r * Math.sqrt(1 - t * t), 0.04, INK, x, y + t * r * 1.2, z, { rx: PI / 2, seg: 14 });
  k.cyl(0.07, 0.1, STEEL, x, y + r * 1.2 + 0.03, z, { seg: 8 });
  k.torus(0.06, 0.015, 0xbdbdbd, x + 0.07, y + r * 1.2 + 0.08, z, { seg: 8 });
}

/**
 * Swarmer: a beekeeper in a white suit and a veiled hat with a hive blaster. Lv 1 a honey jar on
 * the belt, Lv 2 a honey tank on the back feeding the gun, Lv 3 bee grenades and a hive badge,
 * Lv 4 a straw hive on the back with bees flying round, Lv 5 Beekeeper of Death: a black-and-gold
 * suit and a bigger swarm.
 */
export function makeSwarmer(level) {
  const death = level >= 5;
  const suit = death ? 0x212121 : 0xf5f5ee;
  const h = makeHumanoid({ skin: 0xffcc80, shirt: suit, pants: suit, arms: suit });
  const key = `swarmer${level}`;
  const honey = glowMat(h, 0xffb300, 0.6);
  const veil = glassMat(h, death ? 0x3e2723 : 0x263238, 0.42);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x5d4037, { h: 0.4 });
  beeHat(hd, death ? 0x1a1a1a : 0xfafafa, death ? GOLD : 0xffb300, veil);
  // the bee suit: zip, chest pockets, elastic waist
  t.box(0.06, 1.7, 0.04, 0x9e9e9e, 0, -0.05, 0.52);
  pockets(t, tone(suit, 0.92));
  if (death) for (const y of [0.55, -0.15]) t.box(2.06, 0.24, 1.06, GOLD, 0, y, 0); // gold stripes
  belt(t, death ? GOLD : 0xbdbdbd, 0x757575);
  pouch(t, -0.65, -1.0, 0.56, 0.38, 0.36, 0xbcaaa4, 0.16); // hive tool pouch
  t.box(0.06, 0.5, 0.06, STEEL, -0.55, -0.85, 0.75, { rz: 0.15 }); // hive tool
  if (level >= 1) {
    // a jar of honey on the hip
    t.cyl(0.2, 0.36, honey, 0.62, -1.0, 0.72, { seg: 12 });
    t.cyl(0.22, 0.1, glassMat(h, 0xffecb3, 0.4), 0.62, -1.0, 0.72, { seg: 12, sy: 4.2 });
    t.cyl(0.21, 0.1, 0xd7a43a, 0.62, -0.78, 0.72, { seg: 12 }); // lid
  }
  if (level >= 3) {
    for (const x of [-0.25, 0.15]) beeNade(t, x, -0.62, 0.72, 0.17);
    t.cyl(0.22, 0.05, GOLD, -0.5, 0.45, 0.55, { axis: 'z', seg: 6 }); // hive badge
    t.cyl(0.14, 0.06, INK, -0.5, 0.45, 0.56, { axis: 'z', seg: 6 });
  }
  if (level >= 4) {
    // a straw hive on a back frame, its door facing back
    t.box(1.2, 0.12, 0.9, LEATHER, 0, -0.7, -0.98, { r: 0.03 }); // shelf
    skep(t, 0.68, 0, -0.66, -1.05);
    t.cyl(0.14, 0.2, 0x3e2410, 0, -0.45, -1.68, { axis: 'z', seg: 10, sx: 1.4 }); // door
    for (const s of [-1, 1]) {
      t.box(0.22, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
      t.box(0.22, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
    }
  } else if (level >= 2) {
    // a honey tank on the back, with a window and a hose to the gun
    fuelTanks(t, [0], 0.36, 1.4, death ? 0x37474f : 0xbdbdbd, { y: 0.1, stripe: honey });
  }
  hd.done();
  t.done();
  // long leather beekeeping gauntlets
  hands(h, key, death ? 0x3e2723 : 0xd7ccc8, tone(suit, 0.85), (a) => {
    a.box(1.12, 0.55, 1.12, death ? 0x3e2723 : 0xd7ccc8, 0, -1.3, 0, { r: 0.08 });
    a.box(1.16, 0.08, 1.16, death ? GOLD : 0xbcaaa4, 0, -1.04, 0);
  });
  feet(h, key, death ? 0x111111 : 0xe0e0e0, (b) => b.box(1.12, 0.12, 1.14, death ? GOLD : 0xbdbdbd, 0, -1.36, 0.02));
  // the hive blaster
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = hiveGun(gk, {
    s: [1, 1, 1.05, 1.1, 1.2, 1.25][level] ?? 1.25, len: level >= 4 ? 1.05 : 0.9, comb: death ? GOLD : HONEY,
    dark: death ? 0x111111 : 0x4e342e, wood: death ? 0x212121 : WOOD, can: level >= 2 ? honey : null,
  });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  // bees flying round the hat (Lv 4: three, Lv 5: five)
  if (level >= 4) {
    const wing = glassMat(h, 0xe3f2fd, 0.5);
    const ring = spinner(h, h.body, 0, 5.4, 0);
    const n = death ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2;
      const wg = new THREE.Group();
      wg.position.set(Math.cos(a) * 1.9, (i % 2 ? 0.5 : -0.2), Math.sin(a) * 1.9);
      wg.rotation.y = -a;
      wg.scale.setScalar(0.17);
      ring.add(wg);
      const w = wear(h, wg, 'swarmerBee');
      bee(w, wing);
      w.done();
    }
    h.idleSpin = 1.4;
  }
  aimLong(h);
  h.projectile = { color: 0xfdd835, size: 0.35 };
  h.tracer = 0xfdd835;
  return own(h);
}

// ------------------------------------------------------------------ Toxic Gunner

/** A hazmat hood with a wide see-through window, a neck seal and (o.filters) twin filters (head space). */
function hazmatHood(k, col, window, o = {}) {
  dome(k, 0.76, 0.6, col, 0, 0.98, -0.02);
  band(k, 0.74, 0.08, 1.05, 4.1, col, 0.48, { ry: PI }); // back and sides
  band(k, 0.74, 0.08, 0.32, 2.2, col, 0.14); // chin
  for (const y of [0.33, 1.0]) band(k, 0.77, 0.06, 0.07, 2.25, INK, y); // window frame
  band(k, 0.78, 0.03, 0.64, 2.2, window, 0.66); // window
  k.cyl(0.8, 0.16, tone(col, 0.8), 0, 0.0, 0, { seg: 22 }); // neck seal
  for (const s of [-1, 1]) k.cyl(0.1, 0.08, STEEL, s * 0.76, 0.66, 0.0, { axis: 'x', seg: 8 }); // window clips
  if (o.filters) {
    for (const s of [-1, 1]) {
      k.cyl(0.18, 0.3, INK, s * 0.36, 0.14, 0.78, { axis: 'z', seg: 14, ry: s * 0.4 });
      k.cyl(0.15, 0.05, o.filters, s * 0.42, 0.14, 0.94, { axis: 'z', seg: 14, ry: s * 0.4 });
    }
    k.cyl(0.14, 0.2, 0x37474f, 0, 0.16, 0.76, { axis: 'z', seg: 10 }); // valve
  }
}

/** A hazard sign on the chest (torso space): biohazard rings, or the radiation trefoil. */
function hazardSign(k, glow, radiation) {
  k.cyl(0.36, 0.05, 0xfdd835, -0.5, 0.42, 0.55, { axis: 'z', seg: 20 });
  k.cyl(0.32, 0.05, INK, -0.5, 0.42, 0.57, { axis: 'z', seg: 20 });
  if (radiation) {
    for (let i = 0; i < 3; i++) k.torus(0.16, 0.09, glow, -0.5, 0.42, 0.6, { arc: PI / 3, rz: PI / 2 - PI / 6 + (i * PI * 2) / 3, seg: 6 });
    k.cyl(0.06, 0.04, glow, -0.5, 0.42, 0.61, { axis: 'z', seg: 10 });
  } else {
    k.torus(0.16, 0.025, glow, -0.5, 0.42, 0.6, { seg: 18 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2;
      k.torus(0.08, 0.025, glow, -0.5 + Math.sin(a) * 0.12, 0.42 + Math.cos(a) * 0.12, 0.61, { seg: 12 });
    }
  }
}

/**
 * Toxic Gunner: a hazmat trooper with a poison SMG and a tank on the back. Lv 1 spare mag
 * pouches, Lv 2 a glowing drum mag and a second tank, Lv 3 Sinister Gear: a black chest rig, hood
 * filters and a poison can on the barrel, Lv 4 Going Nuclear!: a green nuclear suit and a minigun.
 */
export function makeToxicGunner(level) {
  const nuke = level >= 4;
  const sinister = level >= 3;
  const suit = nuke ? 0x33691e : 0xfbc02d;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: suit, pants: suit, arms: suit, face: 'soldier' });
  const key = `toxicGunner${level}`;
  const tox = glowMat(h, 0x76ff03);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hazmatHood(hd, nuke ? 0x2e5d18 : 0xf9a825, glassMat(h, 0x90caf9, 0.45), { filters: sinister ? tox : null });
  // suit: seams, zip flap, hazard sign, taped cuffs at the waist
  t.box(0.2, 1.8, 0.06, tone(suit, 0.8), 0.25, 0.0, 0.52, { r: 0.02 });
  for (let i = 0; i < 4; i++) t.cyl(0.04, 0.03, INK, 0.25, 0.7 - i * 0.45, 0.56, { axis: 'z', seg: 6 });
  hazardSign(t, tox, nuke);
  belt(t, INK, 0x9e9e9e);
  if (level >= 1) for (const x of [-0.75, -0.3]) pouch(t, x, -0.62, 0.56, 0.36, 0.42, sinister ? 0x263238 : 0x5d4037, 0.2); // spare mags
  if (sinister) {
    // Sinister Gear: a black chest rig over the suit, vials across the front
    vest(t, 0x212121, { pouches: 0 });
    for (let i = 0; i < 4; i++) {
      t.cyl(0.07, 0.3, tox, -0.45 + i * 0.3, 0.15, 0.72, { seg: 8 });
      t.cyl(0.075, 0.08, INK, -0.45 + i * 0.3, 0.33, 0.72, { seg: 8 });
    }
    shoulderPads(t, nuke ? 0x1b3a0f : 0x263238, 0.55);
  }
  fuelTanks(t, level >= 2 ? [-0.36, 0.36] : [0], 0.33, 1.6, nuke ? tox : 0x616161, { y: 0.15, stripe: nuke ? 0x1b3a0f : tox });
  hd.done();
  t.done();
  rubberGloves(h, key, nuke ? 0x1b1b1b : 0x2e7d32, tone(suit, 0.75));
  feet(h, key, nuke ? 0x1b1b1b : 0x2e7d32, (b) => b.box(1.12, 0.12, 1.14, tone(suit, 0.75), 0, -1.38, 0.02));
  h.muzzles = [];
  if (nuke) {
    minigun(h, h.rightArm, `${key}:mg`, { s: 1.3, len: 1.6, r: 0.22, body: 0x2e3b1f, barrel: 0x1f1f1f, glow: tox });
  } else {
    const g = fist(h.rightArm, -1.9, 1.25);
    const gk = wear(h, g, `${key}:gun`);
    let [y, z] = smg(gk, { body: 0x37474f, glow: tox });
    if (level >= 2) {
      gk.cyl(0.34, 0.28, INK, 0, -0.5, UP - 0.5, { axis: 'x', seg: 16 }); // drum mag
      gk.cyl(0.26, 0.3, tox, 0, -0.5, UP - 0.5, { axis: 'x', seg: 16 });
    }
    if (sinister) {
      // a poison can on the barrel
      gk.cyl(0.13, 0.55, 0x263238, 0, y - 0.25, z, { seg: 12 });
      for (const dy of [-0.08, -0.38]) gk.torus(0.135, 0.03, tox, 0, y + dy, z, { rx: PI / 2, seg: 12 });
      y -= 0.53;
    }
    gk.done();
    muzzle(h, g, y, z);
  }
  aimLong(h);
  h.tracer = 0x76ff03;
  h.tracerWidth = 0.12;
  return own(h);
}

// ------------------------------------------------------------------ Sledger

/**
 * A sledgehammer (gun space, head at hy): wooden handle with grip tape, a round steel head and
 * whatever each level adds: o.bands, o.big, o.ice (a glowing ice crust), o.crystals, o.glacier.
 */
function sledge(k, hy, o = {}) {
  const r = o.big ? 0.5 : 0.42;
  const L = o.big ? 1.55 : 1.35;
  k.cyl(0.11, 2.7, o.wood ?? 0x6d4c41, 0, -1.05, 0, { seg: 10 }); // handle
  for (let i = 0; i < 5; i++) k.torus(0.12, 0.025, o.tape ?? INK, 0, 0.2 - i * 0.12, 0, { rx: PI / 2, seg: 10 }); // grip tape
  k.ball(0.15, INK, 0, 0.32, 0, { seg: 8, rows: 5 });
  k.cyl(0.17, 0.35, STEEL, 0, hy + r + 0.1, 0, { seg: 10 }); // collar
  if (o.glacier) {
    // the glacier head: a faceted block of glowing ice with crystals out of every side
    k.cyl(0.75, 1.9, o.glacier, 0, hy, 0, { axis: 'z', seg: 6 });
    for (const s of [-1, 1]) k.cyl(0.6, 0.25, STEEL, 0, hy, s * 1.0, { axis: 'z', seg: 6 }); // steel caps
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      const zz = (i % 3 - 1) * 0.55;
      crystal(k, [Math.cos(a) * 0.6, hy + Math.sin(a) * 0.6, zz], [Math.cos(a) * 1.25, hy + Math.sin(a) * 1.25, zz * 1.2], 0.17, o.glacier);
    }
    for (const s of [-1, 1]) k.torus(0.77, 0.05, STEEL, 0, hy, s * 0.6, { seg: 6 });
    return;
  }
  k.cyl(r, L, o.head ?? 0x616161, 0, hy, 0, { axis: 'z', seg: 12 });
  for (const s of [-1, 1]) k.cyl(r + 0.04, 0.12, tone(o.head ?? 0x616161, 0.7), 0, hy, s * (L / 2 - 0.02), { axis: 'z', seg: 12 }); // striking faces
  k.box(0.3, 0.5, 0.3, STEEL, 0, hy, 0, { r: 0.04 }); // wedge where the handle goes through
  if (o.bands) for (const s of [-1, 1]) k.torus(r + 0.02, 0.04, INK, 0, hy, s * L * 0.25, { seg: 14 });
  if (o.big) for (let i = 0; i < 4; i++) k.ball(0.05, 0x9e9e9e, Math.cos(i * PI / 2) * (r + 0.01), hy + Math.sin(i * PI / 2) * (r + 0.01), 0, { seg: 6, rows: 4 }); // rivets
  if (o.ice) {
    k.cyl(r + 0.08, L * 0.6, o.ice, 0, hy, 0, { axis: 'z', seg: 7 }); // ice crust round the middle
    for (const z of [-0.3, 0, 0.3]) icicle(k, 0.0, hy - r - 0.02, z, 0.35 + Math.abs(z), o.ice);
  }
  if (o.crystals) {
    for (const [a, z] of [[0.6, -0.25], [1.9, 0.3], [2.9, -0.1], [-0.6, 0.35]]) {
      crystal(k, [Math.cos(a) * r, hy + Math.sin(a) * r, z], [Math.cos(a) * (r + 0.55), hy + Math.sin(a) * (r + 0.55), z * 1.3], 0.12, o.crystals);
    }
  }
}

/**
 * Sledger: a burly arctic worker in a puffy parka with a sledgehammer that grows every level.
 * Lv 1 grip tape and steel bands, Lv 2 a bigger riveted sledge and a tool belt, Lv 3 Freezing
 * Point: an ice crust with icicles, Lv 4 Ice Breaker: a fur hat, fur shoulders and crystals on
 * the head, Lv 5 Arctic Aftershocks: ice armour and a huge glowing glacier hammer.
 */
export function makeSledger(level) {
  const arctic = level >= 4;
  const coat = 0x1565c0;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: coat, pants: 0x263238, arms: coat });
  const key = `sledger${level}`;
  const ice = glowMat(h, ICE);
  const pale = glowMat(h, 0xe1f5fe);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  beard(hd, 0x6d4c41);
  if (arctic) {
    ushanka(hd, 0x0d47a1, FUR);
    if (level >= 5) goggles(hd, 1.32, ice, { r: 0.8 });
  } else {
    beanie(hd, 0x0d47a1);
    hd.ball(0.2, 0xfafafa, 0, 1.58, 0, { seg: 10, rows: 7 }); // pom-pom
  }
  parka(t, coat, arctic ? FUR : 0x90a4ae);
  if (level >= 2) workBelt(t, 0x4e342e);
  else belt(t, 0x3e2723);
  if (arctic) {
    // fur over both shoulders
    for (const s of [-1, 1]) {
      t.ball(0.62, FUR, s * 1.35, 1.0, 0, { sy: 0.6, sz: 1.0, seg: 14, rows: 8 });
      for (const z of [-0.35, 0.05, 0.4]) t.ball(0.22, tone(FUR, 0.92), s * 1.55, 0.72, z, { seg: 8, rows: 6 });
    }
  }
  if (level >= 5) {
    // ice armour on the chest with glowing seams, crystals on the shoulders
    t.box(1.7, 1.2, 0.2, 0xb3e5fc, 0, 0.3, 0.62, { r: 0.08 });
    t.box(1.2, 0.06, 0.04, ice, 0, 0.3, 0.73);
    t.box(0.06, 0.9, 0.04, ice, 0, 0.3, 0.73);
    for (const s of [-1, 1]) {
      crystal(t, [s * 1.3, 1.3, 0], [s * 1.55, 2.1, -0.1], 0.14, pale);
      crystal(t, [s * 1.5, 1.2, 0.25], [s * 2.0, 1.65, 0.35], 0.1, pale);
    }
  }
  hd.done();
  t.done();
  // thick work mittens
  hands(h, key, arctic ? 0x37474f : 0x5d4037, tone(coat, 0.8), (a) => a.box(1.14, 0.28, 1.14, FUR, 0, -1.5, 0, { r: 0.08 }));
  feet(h, key, 0x3e2723, (b) => {
    b.box(1.14, 0.2, 1.16, FUR, 0, -1.34, 0.02, { r: 0.06 }); // fur boot tops
    if (level >= 2) kneePad(b, 0x263238);
  });
  h.size = arctic ? 1.1 : 1;
  const big = [1, 1.05, 1.12, 1.2, 1.3, 1.45][level] ?? 1.45;
  const g = fist(h.rightArm, -1.9, big);
  const gk = wear(h, g, `${key}:gun`);
  const hy = -2.4;
  sledge(gk, hy, {
    bands: level >= 1, big: level >= 2, tape: level >= 1 ? 0x1565c0 : INK,
    head: level >= 3 ? 0x546e7a : 0x616161, ice: level >= 3 && level < 5 ? ice : null,
    crystals: level === 4 ? pale : null, glacier: level >= 5 ? ice : null, wood: level >= 4 ? 0x37474f : 0x6d4c41,
  });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, hy, 0);
  h.rightArm.rotation.set(-2.6, 0, 0.15);
  h.leftArm.rotation.set(-2.4, 0, -0.3);
  h.pose = { right: -2.6, left: -2.4, leftRecoil: 0 };
  h.swing = 2.2;
  h.melee = true;
  h.tracer = ICE;
  return own(h, 0);
}

// ------------------------------------------------------------------ Ice Breaker

/** An ice pick (gun space): handle, a long curved spike forward (+z), an adze behind, head at hy. */
function icePick(k, hy, o = {}) {
  const head = o.head ?? 0x90a4ae;
  k.cyl(0.1, 2.5, o.handle ?? 0x5d4037, 0, -0.95, 0, { seg: 10 });
  k.cyl(0.13, 0.15, STEEL, 0, 0.3, 0, { seg: 10 }); // end cap
  k.cyl(0.04, 0.25, STEEL, 0, 0.45, 0, { seg: 6 });
  k.torus(0.1, 0.025, INK, 0, 0.6, 0, { seg: 10 }); // wrist loop
  if (o.wrap) for (let i = 0; i < 6; i++) k.torus(0.115, 0.03, o.wrap, 0, 0.15 - i * 0.1, 0, { rx: PI / 2, seg: 10 }); // grip wraps
  k.box(0.3, 0.55, 0.38, STEEL, 0, hy + 0.05, 0, { r: 0.05 }); // socket
  // the pick: curving down at the tip
  limb(k, [0, hy, 0.15], [0, hy - 0.08, 0.85], 0.14, 0.11, head, 6);
  limb(k, [0, hy - 0.08, 0.85], [0, hy - 0.35, 1.45], 0.11, 0.01, head, 6);
  for (let i = 0; i < 3; i++) k.box(0.04, 0.05, 0.12, tone(head, 0.6), 0, hy - 0.2 - i * 0.04, 0.9 + i * 0.15); // teeth
  // the adze behind
  k.slab(0.32, 0.18, 0.75, head, 0, hy + 0.02, -0.5, { bw: 0.6, bd: 1, td: 1, tw: 1.2 });
  k.box(0.42, 0.22, 0.08, tone(head, 0.75), 0, hy, -0.9);
  if (o.crystal) {
    // a crystal head over the pick
    crystal(k, [0, hy, 0.2], [0, hy - 0.2, 1.6], 0.2, o.crystal);
    crystal(k, [0, hy, -0.2], [0, hy + 0.1, -1.05], 0.16, o.crystal);
  }
}

/**
 * Ice Breaker (alternate Sledger form): a climber in arctic gear with an ice pick. Lv 1 grip wraps
 * and climbing gloves, Lv 2 a frosted pick and a scarf, Lv 3 Crystal Head: a glowing crystal
 * pick, Lv 4 Cryo Fuel: twin coolant tanks, Lv 5 X-Cryosuit: glowing armour and a visor helmet.
 */
export function makeIceBreaker(level) {
  const suit = level >= 5;
  const coat = suit ? 0x0288d1 : 0x4fc3f7;
  const h = makeHumanoid({ skin: 0xffcc80, shirt: coat, pants: suit ? 0x01579b : 0x37474f, arms: coat });
  const key = `sledgerIce${level}`;
  const ice = glowMat(h, ICE);
  const pale = glowMat(h, 0xb3e5fc);
  const shard = shardOf(h);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // a ponytail out the back
  hd.tube([[0, 1.1, -0.62], [0, 1.0, -0.95], [0, 0.65, -1.05], [0, 0.3, -0.95]], 0.13, 0x5d4037, { seg: 12, sides: 8 });
  hd.ball(0.11, 0x5d4037, 0, 0.28, -0.94, { seg: 8, rows: 5 });
  if (suit) {
    helmet(hd, 0xe1f5fe, { band: false });
    band(hd, 0.8, 0.05, 0.3, 2.0, ice, 0.74); // visor
    hd.box(0.3, 0.22, 0.05, shard, 0, 1.3, 0.62, { rx: -0.5 });
  } else {
    hair(hd, 0x5d4037, { h: 0.42 });
    hd.cyl(0.76, 0.34, FUR, 0, 1.12, 0, { seg: 22, r2: 0.72 }); // fur hat
    dome(hd, 0.66, 0.3, 0xfafafa, 0, 1.28, 0);
    hd.box(0.3, 0.22, 0.05, shard, 0, 1.12, 0.78, { rx: -0.1 }); // Dimension Shard on the hat
  }
  if (level >= 2 && !suit) {
    // a knitted scarf
    t.torus(0.66, 0.16, 0x0277bd, 0, 1.0, 0, { rx: PI / 2, seg: 18, sz: 0.7 });
    t.box(0.28, 0.75, 0.1, 0x0277bd, 0.4, 0.45, 0.6, { r: 0.04, rz: -0.1 });
    for (let i = 0; i < 3; i++) t.box(0.3, 0.05, 0.11, 0xfafafa, 0.42 - i * 0.012, 0.65 - i * 0.2, 0.61, { rz: -0.1 });
  }
  // a climbing jacket: chest strap, zip, harness loops
  parka(t, coat, level >= 1 ? FUR : null, { toggles: false });
  t.box(0.36, 0.32, 0.05, shard, -0.55, 0.45, 0.64); // Dimension Shard
  belt(t, 0x263238, 0x90a4ae);
  for (const x of [-0.75, 0.75]) t.torus(0.13, 0.035, STEEL, x, -1.05, 0.6, { seg: 10, sy: 1.4 }); // carabiners
  if (level >= 4) coolant(t, suit ? 0xe1f5fe : 0xb0bec5, ice, { n: 2, r: 0.3, h: 1.3 });
  if (suit) {
    // X-Cryosuit: glowing armour plates and pauldrons
    t.box(1.8, 1.3, 0.2, 0xe1f5fe, 0, 0.3, 0.65, { r: 0.08 });
    for (const y of [0.65, 0.3, -0.05]) t.box(1.5, 0.05, 0.04, ice, 0, y, 0.76);
    t.cyl(0.22, 0.06, pale, 0, 0.3, 0.77, { axis: 'z', seg: 16 });
    shoulderPads(t, 0xb3e5fc, 0.6);
    for (const s of [-1, 1]) t.box(0.6, 0.06, 0.06, ice, s * 1.45, 1.05, 0.5);
  }
  hd.done();
  t.done();
  hands(h, key, level >= 1 ? 0x263238 : 0x6d4c41, tone(coat, 0.8), level >= 1 ? (a) => a.box(1.1, 0.12, 1.1, 0x0288d1, 0, -1.55, 0) : null);
  feet(h, key, suit ? 0xe1f5fe : 0x37474f, (b) => {
    for (let i = 0; i < 4; i++) b.cyl(0.04, 0.2, STEEL, (i % 2 ? 0.3 : -0.3), -2.08, i < 2 ? 0.35 : -0.25, { seg: 6, r2: 0.0001, rx: PI }); // crampon spikes
    if (level >= 3) kneePad(b, 0x263238);
  });
  const g = fist(h.rightArm, -1.9, [1, 1, 1.1, 1.2, 1.25, 1.4][level] ?? 1.4);
  const gk = wear(h, g, `${key}:gun`);
  const hy = -2.2;
  icePick(gk, hy, {
    handle: level >= 1 ? 0x263238 : 0x5d4037, wrap: level >= 1 ? 0x0288d1 : null,
    head: level >= 2 ? 0xb3e5fc : 0x90a4ae, crystal: level >= 3 ? (suit ? pale : ice) : null,
  });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, hy - 0.1, 0.6);
  h.rightArm.rotation.set(-2.6, 0, 0.15);
  h.leftArm.rotation.set(-2.4, 0, -0.3);
  h.pose = { right: -2.6, left: -2.4, leftRecoil: 0 };
  h.swing = 2.2;
  h.melee = true;
  h.tracer = ICE;
  return own(h, 0);
}

// ------------------------------------------------------------------ Executioner

/** An executioner's hood over the whole head: pointed top, eye slit, eyes and a drape over the shoulders (head space). */
function execHood(k, col, eyes) {
  k.cyl(0.69, 1.0, col, 0, 0.52, 0, { seg: 22 });
  dome(k, 0.69, 0.5, col, 0, 1.02, 0);
  k.cyl(0.32, 0.5, col, 0, 1.62, -0.06, { seg: 12, r2: 0.03, rx: -0.25 }); // point
  k.box(0.78, 0.22, 0.06, 0x050505, 0, 0.72, 0.68, { r: 0.03 }); // eye slit
  for (const s of [-1, 1]) k.ball(0.075, eyes, s * 0.22, 0.72, 0.71, { seg: 8, rows: 5, sz: 0.4 });
  k.cyl(0.98, 0.42, col, 0, -0.08, 0, { seg: 22, r2: 0.7 }); // drape
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI * 2;
    k.cyl(0.14, 0.32, col, Math.sin(a) * 0.9, -0.42, Math.cos(a) * 0.9, { seg: 5, r2: 0.0001, rx: PI }); // ragged hem
  }
  for (const s of [-1, 1]) k.box(0.05, 0.4, 0.04, tone(col, 1.6), s * 0.2, 0.2, 0.69); // stitching
}

/**
 * A big axe (gun space; handle along -y, the blade out to +z, its head at hy): a curved steel
 * blade with a bright edge, a socket and a back spike. o.double: a second blade behind; o.edge:
 * the edge colour (a glow at Lv 5); o.runes.
 */
function bigAxe(k, hy, o = {}) {
  const steel = o.steel ?? 0x78909c;
  const edge = o.edge ?? 0xcfd8dc;
  k.cyl(0.12, 3.0, o.wood ?? 0x3e2723, 0, -1.15, 0, { seg: 10 }); // haft
  for (let i = 0; i < 6; i++) k.torus(0.13, 0.03, LEATHER, 0, 0.3 - i * 0.1, 0, { rx: PI / 2, seg: 10 }); // leather grip
  k.cyl(0.15, 0.18, STEEL, 0, 0.42, 0, { seg: 10 }); // pommel
  k.cyl(0.0001, 0.25, STEEL, 0, hy - 0.78, 0, { seg: 8, r2: 0.07 }); // spike past the head
  k.box(0.3, 0.75, 0.32, STEEL, 0, hy, 0, { r: 0.05 }); // socket
  for (const y of [hy + 0.3, hy - 0.3]) k.ball(0.05, 0xbdbdbd, 0.16, y, 0, { seg: 6, rows: 4 });
  const blade = (dir) => {
    const p = [[0.12, 0.3], [0.5, 0.42], [0.95, 0.72], [1.15, 0.25], [1.18, -0.3], [1.0, -0.88], [0.5, -0.5], [0.12, -0.32]];
    const ed = [[0.9, 0.78], [1.06, 0.82], [1.28, 0.27], [1.3, -0.32], [1.1, -0.98], [0.95, -0.92], [1.15, -0.3], [1.12, 0.25]];
    const flip = (pts) => pts.map(([z, y]) => [z * dir, y]);
    k.prism(dir > 0 ? flip(p) : flip(p).reverse(), 0.14, steel, 0, hy, 0, { bevel: 0.03 });
    k.prism(dir > 0 ? flip(ed) : flip(ed).reverse(), 0.07, edge, 0, hy, 0);
    if (o.runes) for (const y of [0.25, 0, -0.25]) k.box(0.16, 0.08, 0.14, o.runes, 0, hy + y, dir * 0.75);
  };
  blade(1);
  if (o.double) blade(-1);
  else k.cyl(0.0001, 0.5, STEEL, 0, hy, -0.4, { axis: 'z', seg: 6, r2: 0.09 }); // back spike
}

/**
 * Executioner: a hooded executioner with a big axe and a leather apron. Lv 1 Quick Chopping:
 * studded bracers, Lv 2 a double-headed axe, Lv 3 Cloaked Revenant: a ghostly cloak and purple
 * eyes, Lv 4 Ghoul Shreddin': spiked pauldrons and chains, Lv 5 the Judge: red eyes, a gold seal
 * and a glowing red axe.
 */
export function makeExecutioner(level) {
  const judge = level >= 5;
  const skin = 0xd9a066;
  const h = makeHumanoid({ skin, shirt: 0x212121, pants: 0x111111, arms: skin });
  const key = `executioner${level}`;
  const red = glowMat(h, 0xff1744);
  const ghost = glowMat(h, 0x7c4dff);
  const eyes = judge ? red : level >= 3 ? ghost : 0xffffff;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  execHood(hd, 0x111111, eyes);
  // a leather apron with a pocket and straps
  t.slab(1.6, 2.6, 0.1, 0x4e342e, 0, -0.55, 0.56, { bw: 1.15 });
  t.box(0.7, 0.4, 0.06, 0x3e2723, 0.2, -0.75, 0.62, { r: 0.03 });
  for (const s of [-1, 1]) t.box(0.18, 0.9, 0.06, 0x3e2723, s * 0.7, 0.55, 0.56, { rz: s * 0.2 });
  t.box(2.12, 0.34, 1.12, 0x3e2723, 0, -0.85, 0, { r: 0.04 }); // wide belt
  t.box(0.42, 0.32, 0.06, judge ? GOLD : 0x9e9e9e, 0, -0.85, 0.58, { r: 0.03 });
  for (let i = 0; i < 3; i++) t.torus(0.08, 0.03, STEEL, -0.8 + i * 0.06, -1.05 - i * 0.08, 0.58, { seg: 8 }); // keys on a ring
  if (level >= 3) {
    // Cloaked Revenant: a long ghostly cloak with a ragged hem and a high collar
    const cloak = judge ? 0x4a0000 : 0x311b92;
    t.slab(2.3, 3.7, 0.12, cloak, 0, -0.85, -0.64, { bw: 1.3 });
    t.slab(2.2, 0.7, 0.12, cloak, 0, 1.3, -0.62, { tw: 1.2, tz: -0.1 }); // high collar
    for (let i = 0; i < 7; i++) t.cyl(0.18, 0.45, cloak, -1.2 + i * 0.4, -2.92, -0.66, { seg: 5, r2: 0.0001, rx: PI }); // tatters
    t.box(2.9, 0.06, 0.05, judge ? red : ghost, 0, -2.6, -0.71); // glowing hem line
  }
  if (level >= 4) {
    // Ghoul Shreddin': spiked pauldrons and chains across the chest
    shoulderPads(t, 0x424242, 0.62);
    for (const s of [-1, 1]) for (const z of [-0.3, 0.25]) t.cyl(0.1, 0.5, 0x9e9e9e, s * 1.5, 1.45, z, { seg: 6, r2: 0.0001 });
    for (let i = 0; i < 9; i++) {
      const tt = -1 + i * 0.25;
      t.torus(0.09, 0.03, 0x9e9e9e, -tt * 0.85, tt * 0.85 + 0.15, 0.68, { seg: 8, rx: i % 2 ? PI / 2 : 0, rz: -PI / 4 });
    }
  }
  if (judge) {
    // the Judge's gold seal: scales on a disc
    t.cyl(0.3, 0.06, GOLD, -0.45, 0.45, 0.66, { axis: 'z', seg: 20 });
    t.box(0.04, 0.3, 0.04, INK, -0.45, 0.45, 0.7);
    t.box(0.34, 0.04, 0.04, INK, -0.45, 0.58, 0.7);
    for (const s of [-1, 1]) t.cyl(0.07, 0.03, red, -0.45 + s * 0.16, 0.4, 0.7, { axis: 'z', seg: 8 });
  }
  hd.done();
  t.done();
  hands(h, key, level >= 1 ? 0x212121 : null, 0x3e2723, level >= 1 ? (a) => {
    a.box(1.1, 0.5, 1.1, 0x3e2723, 0, -1.25, 0, { r: 0.06 }); // bracer
    for (const z of [-0.3, 0.3]) a.cyl(0.06, 0.08, 0x9e9e9e, 0, -1.25, z > 0 ? 0.56 : -0.56, { axis: 'z', seg: 6 });
  } : null);
  feet(h, key, 0x1a1a1a);
  const g = fist(h.rightArm, -1.9, [1, 1, 1.1, 1.15, 1.2, 1.3][level] ?? 1.3);
  const gk = wear(h, g, `${key}:gun`);
  const hy = -2.2;
  bigAxe(gk, hy, {
    double: level >= 2, steel: judge ? 0x3e2723 : 0x78909c, edge: judge ? red : level >= 3 ? 0xd1c4e9 : 0xcfd8dc,
    runes: level >= 3 ? (judge ? red : ghost) : null, wood: judge ? 0x1a1a1a : 0x3e2723,
  });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, hy, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  h.leftArm.rotation.set(-0.6, 0, -0.3);
  h.pose = { right: -2.4, left: -0.6, leftRecoil: 0 };
  h.tracer = judge ? 0xff1744 : 0xb0bec5;
  h.tracerWidth = 0.3;
  return own(h, 0);
}

// ------------------------------------------------------------------ Jester

/** A round bomb in the fist (gun space): iron ball, fuse cap, a curly fuse and a spark. */
function bomb(k, r, col, spark, o = {}) {
  const y = -0.3 - r * 0.6;
  k.ball(r, col, 0, y, 0, { seg: 14, rows: 10 });
  k.torus(r * 0.99, 0.03, tone(col, 0.6), 0, y, 0, { seg: 18, ry: PI / 2 });
  if (o.band) k.torus(r * 1.0, 0.04, o.band, 0, y, 0, { rx: PI / 2, seg: 18 });
  k.cyl(r * 0.35, 0.16, 0x616161, 0, y, r + 0.02, { axis: 'z', seg: 10 }); // fuse cap
  k.tube([[0, y, r + 0.1], [0.08, y - 0.08, r + 0.25], [-0.04, y - 0.05, r + 0.38]], 0.025, 0xd7ccc8, { seg: 8, sides: 4 });
  k.ball(0.08, spark, -0.04, y - 0.05, r + 0.42, { seg: 8, rows: 5 });
  return y;
}

/**
 * Jester: a court jester who throws bombs. Lv 1 purple and gold motley, a two-point hat with bells
 * and curled shoes; Lv 1 juggling balls circling overhead; Lv 2 Cold Humor: icy blue motley,
 * frost bells and ice bombs on the belt; Lv 3 Potent Bombs: toxic green, goggles and a strap of
 * poison vials; Lv 4 Harlequin of Doom: black and red diamonds, a three-point hat, a mask, a cape
 * and a bomb in each hand.
 */
export function makeJester(level) {
  const doom = level >= 4;
  const [ca, cb] = [[0x7b1fa2, 0xffc107], [0x7b1fa2, 0xffc107], [0x1565c0, 0xe3f2fd], [0x2e7d32, 0x6a1b9a], [0x111111, 0xd50000]][level] ?? [0x111111, 0xd50000];
  const h = makeHumanoid({ skin: 0xffe0bd, shirt: ca, pants: cb, arms: cb });
  const key = `jester${level}`;
  const frost = glowMat(h, ICE);
  const tox = glowMat(h, 0x76ff03);
  const red = glowMat(h, 0xff1744);
  const bell = level === 2 ? frost : level === 3 ? tox : doom ? GOLD : 0xffeb3b;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // the floppy hat: a two-colour band, a crown and two (three) drooping points with bells
  hd.cyl(0.73, 0.32, cb, 0, 1.0, 0, { seg: 22 });
  hd.torus(0.73, 0.04, GOLD, 0, 1.15, 0, { rx: PI / 2, seg: 22 });
  dome(hd, 0.73, 0.38, ca, 0, 1.15, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    hd.ball(0.07, i % 2 ? GOLD : ca, Math.sin(a) * 0.74, 0.86, Math.cos(a) * 0.74, { seg: 6, rows: 4 }); // band studs
  }
  const points = doom ? [-1, 0, 1] : [-1, 1];
  for (const s of points) {
    const col = s < 0 ? ca : s > 0 ? cb : tone(cb, 0.8);
    const p = s === 0
      ? [[0, 1.4, -0.25], [0, 2.0, -0.75], [0, 1.9, -1.3], [0, 1.45, -1.45]]
      : [[s * 0.35, 1.35, 0], [s * 0.95, 1.9, 0], [s * 1.42, 1.78, 0], [s * 1.55, 1.35, 0]];
    const r = [0.32, 0.2, 0.12, 0.06];
    for (let i = 0; i < 3; i++) {
      limb(hd, p[i], p[i + 1], r[i], r[i + 1], col, 10);
      if (i > 0) hd.ball(r[i], col, ...p[i], { seg: 10, rows: 6 });
    }
    hd.ball(0.15, bell, p[3][0], p[3][1] - 0.12, p[3][2], { seg: 10, rows: 7 });
    hd.box(0.2, 0.03, 0.03, INK, p[3][0], p[3][1] - 0.2, p[3][2] + 0.1);
  }
  if (level >= 3 && !doom) goggles(hd, 1.02, tox, { r: 0.74 });
  if (doom) {
    // a white half-mask with red glowing eyes and a painted grin
    band(hd, 0.67, 0.05, 0.62, 2.1, 0xfafafa, 0.62);
    for (const s of [-1, 1]) {
      hd.box(0.22, 0.14, 0.05, red, s * 0.24, 0.72, 0.69, { ry: s * 0.35, rz: s * 0.25 });
      hd.box(0.06, 0.25, 0.04, INK, s * 0.24, 0.5, 0.69, { ry: s * 0.35 }); // painted tears
    }
    hd.torus(0.2, 0.03, INK, 0, 0.4, 0.66, { arc: PI, rz: PI, seg: 10 }); // grin
  }
  // motley: the other colour on the left half, diamonds across, a frilled collar with bells
  t.box(1.02, 2.02, 1.04, cb, 0.5, 0, 0);
  for (const [x, y, c] of [[-0.5, 0.45, cb], [0.5, -0.35, ca], [-0.5, -0.55, cb], [0.5, 0.5, ca]]) {
    t.box(0.42, 0.42, 0.04, c, x, y, 0.53, { rz: PI / 4 });
    t.box(0.42, 0.42, 0.04, c, x, y, -0.53, { rz: PI / 4 });
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * PI * 2;
    t.ball(0.24, i % 2 ? (doom ? 0x9e9e9e : 0xfafafa) : tone(doom ? 0x9e9e9e : 0xfafafa, 0.85), Math.sin(a) * 0.92, 1.05, Math.cos(a) * 0.62, { sy: 0.55, seg: 8, rows: 6 });
  }
  for (let i = 0; i < 6; i++) {
    const a = ((i + 0.5) / 6) * PI * 2;
    const x = Math.sin(a);
    const z = Math.cos(a);
    limb(t, [x * 0.8, 0.95, z * 0.5], [x * 1.25, 0.45, z * 0.75], 0.2, 0.03, i % 2 ? ca : cb, 6);
    t.ball(0.09, bell, x * 1.27, 0.38, z * 0.76, { seg: 8, rows: 5 });
  }
  belt(t, doom ? 0x212121 : 0x5d4037, GOLD);
  if (level >= 2) for (const x of [-0.6, 0, 0.6]) {
    // spare bombs on the belt (icy blue from Lv 2)
    t.ball(0.2, level === 2 ? 0x0d47a1 : level === 3 ? 0x1b5e20 : 0x311b92, x, -0.62, 0.72, { seg: 10, rows: 7 });
    t.ball(0.07, level === 2 ? frost : level === 3 ? tox : red, x, -0.42, 0.78, { seg: 6, rows: 4 });
  }
  if (level >= 3) {
    // a strap of poison vials
    sash(t, 0x4e342e, -1);
    for (let i = 0; i < 5; i++) {
      const tt = -0.7 + i * 0.35;
      const x = Math.sin(0.62) * tt;
      const y = Math.cos(0.62) * tt;
      t.cyl(0.08, 0.32, tox, x, y, 0.62, { seg: 8, rz: -0.62 });
      t.cyl(0.06, 0.08, 0x8d6e63, x - Math.sin(0.62) * 0.2, y + Math.cos(0.62) * 0.2, 0.62, { seg: 6, rz: -0.62 });
    }
  }
  if (doom) {
    // a cape with a diamond trim
    t.slab(2.4, 3.6, 0.12, 0x6a0000, 0, -0.85, -0.64, { bw: 1.25 });
    for (let i = 0; i < 6; i++) t.box(0.3, 0.3, 0.04, i % 2 ? 0x111111 : 0xd50000, -1.25 + i * 0.5, -2.55, -0.72, { rz: PI / 4 });
  }
  hd.done();
  t.done();
  hands(h, key, doom ? 0xfafafa : ca, tone(cb, 0.85), (a) => a.box(1.12, 0.18, 1.12, GOLD, 0, -1.45, 0));
  // soft shoes with curled toes and a bell on each tip (from Lv 1)
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    b.box(1.06, 0.5, 1.1, ca, 0, -1.75, 0.05, { r: 0.15 });
    b.box(1.1, 0.12, 1.14, cb, 0, -1.5, 0.05);
    if (level >= 1) {
      limb(b, [0, -1.85, 0.5], [0, -1.8, 1.0], 0.32, 0.18, ca, 10);
      b.ball(0.18, ca, 0, -1.8, 1.0, { seg: 8, rows: 6 });
      limb(b, [0, -1.8, 1.0], [0, -1.45, 1.22], 0.18, 0.07, ca, 8);
      b.ball(0.12, bell, 0, -1.38, 1.15, { seg: 8, rows: 5 });
    } else limb(b, [0, -1.85, 0.5], [0, -1.85, 0.95], 0.3, 0.04, ca, 10);
    b.done();
  }
  // juggling balls circling overhead (three, five for the Harlequin)
  if (level >= 1) {
    const ring = spinner(h, h.body, 0, 7.6, 0, 'z');
    const balls = [0xff1744, 0x2979ff, 0xffea00, 0x00e676, 0xd500f9];
    const n = doom ? 5 : 3;
    const k = wear(h, ring, `${key}:balls`);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2;
      const c = level >= 2 ? glowMat(h, balls[i]) : balls[i];
      k.ball(0.26, c, Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95, { seg: 10, rows: 7 });
      k.torus(0.26, 0.03, 0xfafafa, Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95, { seg: 12 });
    }
    k.done();
    h.idleSpin = 2.2;
  }
  // the bomb in the throwing hand (and the Harlequin's spare in the other)
  const bombCol = [0x212121, 0x212121, 0x0d47a1, 0x1b5e20, 0x311b92][level] ?? 0x311b92;
  const spark = glowMat(h, doom ? 0xff1744 : 0xff9100);
  const r = 0.38 + level * 0.04;
  const g = fist(h.rightArm, -1.9, 1.1);
  const gk = wear(h, g, `${key}:bomb`);
  const by = bomb(gk, r, bombCol, spark, { band: level === 2 ? frost : level === 3 ? tox : doom ? red : null });
  gk.done();
  if (doom) spare(h, key, (k) => bomb(k, 0.42, 0x212121, spark, { band: red }));
  h.muzzles = [];
  muzzle(h, g, by, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(doom ? -2.2 : -0.6, 0, -0.3);
  h.pose = { right: -2.8, left: doom ? -2.2 : -0.6, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = { color: bombCol === 0x212121 ? 0x4a148c : bombCol, size: 0.6 + level * 0.06, arc: 4, glowing: true };
  return own(h, 0);
}

// ------------------------------------------------------------------ Cryomancer

/**
 * Cryomancer: a frost sprayer in a parka. Lv 1 Frosty Gear: a fur-rimmed hood, goggles and fur
 * mittens; Lv 2 Freezing Tanks: twin coolant tanks; Lv 3 Ice Commando: a helmet, a plate carrier
 * and a frost cannon; Lv 4 Winter's Fury: glowing ice armour, crystal pauldrons, an icicle crown
 * and a crystal cannon.
 */
export function makeCryomancer(level) {
  const fury = level >= 4;
  const commando = level >= 3;
  const coat = [0x81d4fa, 0x4fc3f7, 0x29b6f6, 0x37474f, 0x0d47a1][level] ?? 0x0d47a1;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: coat, pants: commando ? 0x263238 : 0x546e7a, arms: coat });
  const key = `cryomancer${level}`;
  const ice = glowMat(h, fury ? 0xb3e5fc : ICE);
  const pale = glowMat(h, 0xe1f5fe);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (commando) {
    helmet(hd, fury ? 0xe1f5fe : 0x455a64, { cover: fury ? 0x81d4fa : 0x37474f });
    goggles(hd, 0.76, ice, { r: 0.7 });
    if (fury) for (let i = 0; i < 5; i++) {
      const a = ((i - 2) / 5) * PI * 0.9;
      shard(hd, Math.sin(a) * 0.6, 1.25, Math.cos(a) * 0.6, 0.55 + (i === 2 ? 0.3 : 0), 0.1, pale); // icicle crown
    }
  } else {
    hair(hd, 0x3e2723, { h: 0.4 });
    hood(hd, coat);
    if (level >= 1) {
      hd.torus(0.64, 0.13, FUR, 0, 0.62, 0.58, { seg: 18, sy: 1.15 }); // fur rim round the face
      goggles(hd, 1.0, ice, { r: 0.76 });
    }
  }
  if (commando) {
    parka(t, coat, null, { toggles: false });
    vest(t, fury ? 0xb3e5fc : 0x546e7a, { pouches: 3, pouch: fury ? 0x81d4fa : 0x455a64 });
    if (fury) {
      // ice armour: glowing seams and crystal pauldrons
      for (const y of [0.55, 0.15]) t.box(1.5, 0.05, 0.04, ice, 0, y, 0.78);
      shoulderPads(t, 0xb3e5fc, 0.6);
      for (const s of [-1, 1]) {
        crystal(t, [s * 1.4, 1.2, 0], [s * 1.7, 2.0, -0.05], 0.15, ice);
        crystal(t, [s * 1.55, 1.15, 0.3], [s * 2.05, 1.6, 0.4], 0.1, ice);
        crystal(t, [s * 1.55, 1.15, -0.3], [s * 2.0, 1.55, -0.45], 0.1, ice);
      }
    }
  } else {
    parka(t, coat, FUR);
  }
  belt(t, 0x37474f, 0x90a4ae);
  for (const x of [-0.7, 0.7]) icicle(t, x, -1.0, 0.6, 0.3, ice); // frost on the belt
  coolant(t, fury ? 0xe1f5fe : 0x90a4ae, ice, level >= 2 ? { n: 2, r: 0.34, h: 1.6 } : { n: 1, r: 0.36, h: 1.2 });
  hd.done();
  t.done();
  if (level >= 1) hands(h, key, fury ? 0xe1f5fe : 0xcfd8dc, tone(coat, 0.8), (a) => a.box(1.16, 0.3, 1.16, FUR, 0, -1.45, 0, { r: 0.1 }));
  else hands(h, key, 0x546e7a, tone(coat, 0.8));
  feet(h, key, commando ? 0x263238 : 0x5d4037, (b) => {
    b.box(1.14, 0.22, 1.16, FUR, 0, -1.34, 0.02, { r: 0.06 });
    if (commando) kneePad(b, 0x263238);
  });
  const g = fist(h.rightArm, -1.9, 1.15 + level * 0.05);
  const gk = wear(h, g, `${key}:gun`);
  const tip = cryoGun(gk, {
    len: 1.6 + level * 0.2, body: fury ? 0xe1f5fe : commando ? 0x37474f : 0xeceff1, light: ice,
    coils: 1 + level, crystal: fury ? pale : null, can: level >= 2,
  });
  if (commando) for (const s of [-1, 1]) gk.box(0.06, 0.9, 0.18, fury ? ice : 0x263238, s * 0.2, -1.15, UP + 0.02); // cooling fins
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tip, UP + 0.02);
  aimLong(h);
  h.tracer = fury ? 0xe1f5fe : ICE;
  h.tracerWidth = 0.25 + level * 0.08;
  return own(h);
}

export const MODELS = {
  swarmer: makeSwarmer,
  toxicGunner: makeToxicGunner,
  sledger: makeSledger,
  sledgerIce: makeIceBreaker,
  executioner: makeExecutioner,
  jester: makeJester,
  cryomancer: makeCryomancer,
};
