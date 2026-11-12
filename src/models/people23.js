// Tower models: people, batch 23 (dressed with the vehicle kit in ../vehicles.js).
// In here: Keith (hero), Oddport (the school building), Chaos Jester (hero), Paralyzer, Hunter
// (the wave 10 bounty hunter, not the Marksman's Hunter form), Slugger, Doctor.
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.
// Keith and the Chaos Jester are hero towers: their level colours and orbiting pieces are built
// here now; blitzup.js only makes Keith a bit bigger at max level.

import * as THREE from 'three';
import { antenna, glowMat, kit, lamp, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { makeThing } from './bits.js';
import {
  GOLD, GUNMETAL, INK, LEATHER, STEEL, UP, WOOD, aimLong, band, belt, cap, collar, cowboyHat, dome, fist,
  glove, goggles, hair, helmet, kneePad, muzzle, own, pack, pistol, pockets, pouch, shades, wear,
} from './people1.js';
import { boltRifle, shoulderPads } from './people2.js';
import { bandolier } from './people3.js';
import { feet, glassMat, hands } from './people5.js';
import { neckScarf, spare } from './people6.js';
import { coil } from './people8.js';
import { boomerang, held, overhand } from './people9.js';
import { labCoat, stethoscope } from './people11.js';
import { headphones, sleeves } from './people12.js';
import { limb } from './people15.js';
import { cape, crossPatch } from './people18.js';
import { flagPole } from './machines2.js';
import { spinner } from './machines5.js';
import { student } from '../newmodels/h.js';

const PI = Math.PI;
const RED = 0xd32f2f;
const PALE = 0xfafafa;

// ------------------------------------------------------------------ shared bits for this batch

/** A group that keeps turning round y (and bobs): views.js driftFx turns everything in h.drift. */
function drifter(h, parent, y, speed, bob = 0) {
  const g = new THREE.Group();
  g.position.y = y;
  g.userData = { speed, bob, y };
  parent.add(g);
  (h.drift ??= []).push(g);
  return g;
}

/** A flat boomerang lying in the x-y plane at z: elbow at (x, y), arms reaching up and out, turned by `turn`. */
function rangAt(k, x, y, z, turn, col, L = 1.0) {
  for (const s of [-1, 1]) {
    const b = turn + s * 0.62;
    k.box(0.28, L, 0.1, col, x + Math.sin(b) * L * 0.5, y + Math.cos(b) * L * 0.5, z, { rz: -b, r: 0.04 });
    k.cyl(0.14, 0.1, col, x + Math.sin(b) * L, y + Math.cos(b) * L, z, { axis: 'z', seg: 12 });
  }
  k.cyl(0.19, 0.1, col, x, y, z, { axis: 'z', seg: 12 });
}

/** A playing card standing on its edge (any space, facing +x): white face, a border and a suit pip. */
function card(k, suit, x = 0, y = 0, z = 0) {
  k.box(0.05, 0.84, 0.6, PALE, x, y, z, { r: 0.02 });
  k.box(0.06, 0.7, 0.46, tone(suit, 1.0), x, y, z, { r: 0.01 });
  k.box(0.07, 0.62, 0.38, PALE, x, y, z);
  k.box(0.08, 0.2, 0.2, suit, x, y, z, { rx: PI / 4 });
  for (const s of [-1, 1]) k.box(0.08, 0.08, 0.08, suit, x, y + s * 0.24, z - s * 0.13, { rx: PI / 4 });
}

/** A big die (any space): rounded cube `s` wide with pips on the front, top and right faces. */
function die(k, x, y, z, s, col, pip) {
  k.box(s, s, s, col, x, y, z, { r: s * 0.14 });
  const at = (lx, ly, lz, o) => k.cyl(s * 0.08, 0.04, pip, x + lx, y + ly, z + lz, { seg: 8, ...o });
  const f = s / 2 + 0.005;
  const q = s * 0.26;
  at(0, 0, f, { rx: PI / 2 }); // one on the front
  for (const [a, b] of [[-q, -q], [q, q], [0, 0]]) at(a, f, b, {}); // three on top
  for (const [a, b] of [[-q, -q], [q, q], [-q, q], [q, -q]]) at(f, a, b, { rz: PI / 2 }); // four on the side
}

// ------------------------------------------------------------------ Keith

/**
 * Keith: a deadpan cowboy kid in overalls with boomerangs. Lv 1 Metal Edge: steel edges, Lv 2 Two
 * Boomerangs: one in each hand and green overalls, Lv 3 Holster: a red bandana, a hip holster and
 * three boomerangs on his back, Lv 4 Golden Boomerang: purple overalls, a striped poncho, gold
 * boomerangs and three more circling him.
 */
export function makeKeith(level) {
  const gold = level >= 4;
  const denim = gold ? 0x6a1b9a : level >= 2 ? 0x2e7d32 : 0x1e88e5;
  const shirt = 0xeceff1;
  const h = makeHumanoid({ skin: 0xfff59d, shirt, pants: denim, arms: shirt, face: 'soldier' });
  h.body.scale.setScalar(0.88);
  const key = `p23keith${level}`;
  const goldM = glowMat(h, GOLD, 0.6);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // spiky blond hair poking out under a big brown hat
  const blond = 0xffd54f;
  hair(hd, blond, { h: 0.4 });
  for (let i = 0; i < 9; i++) {
    const a = PI * 0.35 + (i / 8) * PI * 1.3; // round the sides and back, poking out under the brim
    hd.cyl(0.16, 0.62, i % 2 ? blond : tone(blond, 0.9), Math.sin(a) * 0.72, 0.82, Math.cos(a) * 0.72, { r2: 0.01, seg: 6, rz: -Math.sin(a) * 1.3, rx: Math.cos(a) * 1.3 });
  }
  for (const x of [-0.3, 0, 0.3]) hd.cyl(0.1, 0.3, blond, x, 1.02, 0.6, { r2: 0.01, seg: 5, rx: 2.3, rz: -x }); // fringe
  cowboyHat(hd, 0x795548, gold ? GOLD : 0x3e2723);
  hd.box(0.14, 0.1, 0.04, gold ? 0xfff8e1 : 0xb0bec5, 0, 1.22, 0.56); // hat band buckle
  // overalls: bib, waist, straps over the shoulders crossing at the back, gold buttons
  const dk = tone(denim, 0.8);
  t.box(2.08, 0.78, 1.08, denim, 0, -0.62, 0, { r: 0.05 });
  t.box(1.3, 0.98, 0.08, denim, 0, 0.2, 0.53, { r: 0.03 });
  t.box(1.22, 0.025, 0.02, 0xffd54f, 0, 0.64, 0.575); // stitching
  pouch(t, 0, 0.12, 0.57, 0.62, 0.42, dk, 0.05); // bib pocket
  for (const s of [-1, 1]) {
    t.box(0.26, 0.7, 0.08, denim, s * 0.55, 0.62, 0.53);
    t.box(0.26, 0.08, 1.1, denim, s * 0.55, 1.0, 0);
    t.box(0.24, 2.1, 0.06, denim, 0, 0.1, -0.54, { rz: s * 0.42 });
    t.cyl(0.09, 0.05, 0xffd54f, s * 0.55, 0.62, 0.59, { axis: 'z', seg: 10 });
    t.cyl(0.05, 0.04, 0xffd54f, s * 1.05, -0.5, 0.2, { axis: 'x', seg: 8 }); // side rivets
    t.box(0.04, 0.5, 0.3, dk, s * 1.04, -0.55, 0.2); // side slit
  }
  belt(t, 0x5d4037, gold ? GOLD : 0xb0b0b0, -0.88);
  // an apple-juice box on the belt with its straw
  t.box(0.42, 0.55, 0.3, 0xffca28, 0.72, -0.72, 0.72, { r: 0.03 });
  t.box(0.3, 0.22, 0.02, 0x7cb342, 0.72, -0.72, 0.88);
  t.ball(0.07, RED, 0.72, -0.72, 0.9, { seg: 8, rows: 5 });
  t.cyl(0.025, 0.42, PALE, 0.8, -0.3, 0.74, { rz: -0.3, seg: 6 });
  const wood = gold ? goldM : level >= 1 ? 0x90a4ae : 0x8d6e63;
  const edge = gold ? 0xfff8e1 : level >= 1 ? 0xcfd8dc : null;
  if (level >= 3) {
    neckScarf(t, RED);
    // a hip holster with two boomerang tips peeking out
    t.box(0.5, 0.85, 0.62, LEATHER, -1.18, -0.95, 0.05, { r: 0.08 });
    t.box(0.54, 0.12, 0.66, tone(LEATHER, 0.75), -1.18, -0.55, 0.05);
    for (const z of [-0.12, 0.2]) t.box(0.1, 0.62, 0.28, gold ? GOLD : 0x8d6e63, -1.18, -0.3, z, { rz: 0.45, r: 0.04 });
    // three boomerangs fanned on the back under a strap
    for (let i = 0; i < 3; i++) rangAt(t, -0.45 + i * 0.45, -0.2 + Math.abs(i - 1) * 0.15, (gold ? -0.8 : -0.62) - i * 0.03, (i - 1) * 0.35, gold ? GOLD : 0xa1887f, 0.9);
    t.box(1.7, 0.12, 0.06, LEATHER, 0, 0.0, gold ? -0.9 : -0.72);
  }
  if (gold) {
    // a striped poncho over the overalls, with a fringe
    const pon = 0x8d4b2a;
    t.slab(2.3, 1.2, 1.3, pon, 0, 0.47, 0, { bw: 1.1, bd: 1.08 });
    const wAt = (y) => 2.3 * (1 + (0.1 * (1.07 - y)) / 1.2) + 0.03;
    const dAt = (y) => 1.3 * (1 + (0.08 * (1.07 - y)) / 1.2) + 0.03;
    for (const [y, c] of [[0.0, 0xffca28], [0.3, 0x2e7d32], [0.55, 0xffca28]]) t.box(wAt(y), 0.08, dAt(y), c, 0, y, 0);
    for (let i = 0; i < 4; i++) t.box(0.22, 0.22, 0.04, 0x2e7d32, -0.66 + i * 0.44, -0.12, dAt(-0.12) / 2 + 0.01, { rz: PI / 4 });
    t.cyl(0.66, 0.18, tone(pon, 0.8), 0, 1.0, 0, { seg: 16 });
    for (let i = 0; i < 11; i++) t.cyl(0.035, 0.28, 0xffca28, -1.2 + i * 0.24, -0.26, 0.69, { seg: 4 });
  }
  hd.done();
  t.done();
  hands(h, key, null, tone(shirt, 0.88), (a) => a.box(1.08, 0.3, 1.08, shirt, 0, -0.5, 0, { r: 0.06 })); // rolled-up sleeves
  feet(h, key, 0x6d4c41, (b) => b.box(1.1, 0.2, 1.1, tone(denim, 1.15), 0, -1.28, 0.01, { r: 0.04 })); // rolled jean cuffs
  const make = (k) => boomerang(k, wood, edge, { wrap: 0xc62828, len: gold ? 1.3 : 1.15, gem: gold ? 0x6a1b9a : null, dots: level === 0 ? PALE : null });
  const g = held(h, key, 1.15, make);
  if (level >= 2) spare(h, key, make);
  if (gold) {
    // three gold boomerangs circling him
    const ring = drifter(h, h.root, 2.6, 2.0, 0.2);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2;
      const b = new THREE.Group();
      b.position.set(Math.cos(a) * 2.4, 0, Math.sin(a) * 2.4);
      b.rotation.set(PI / 2, 0, a);
      ring.add(b);
      const k = wear(h, b, `${key}:orbit`);
      boomerang(k, goldM, 0xfff8e1, { len: 1.0 });
      k.done();
    }
  }
  h.muzzles = [];
  muzzle(h, g, -0.5, 0);
  overhand(h, -2.6, level >= 2 ? -1.2 : -0.6, 1.9);
  h.projectile = { color: gold ? 0xffc107 : 0x8d6e63, size: gold ? 1.25 : 1 };
  h.tracer = gold ? 0xffc107 : 0xffe082;
  return own(h, 0);
}

// ------------------------------------------------------------------ Oddport

/** A school window facing +z (or along x when `side`): frame, pane (lit or glass), cross bars, sill and shutters. */
function schoolWindow(k, x, y, z, w, hh, frame, pane, shutter, side = 0) {
  const W = (a, b, c, col, dx, dy, dz, o) => (side
    ? k.box(c, b, a, col, x + side * dz, y + dy, z + dx, o)
    : k.box(a, b, c, col, x + dx, y + dy, z + dz, o));
  W(w + 0.14, hh + 0.14, 0.06, frame, 0, 0, 0);
  W(w, hh, 0.05, pane, 0, 0, 0.02);
  W(0.05, hh, 0.05, frame, 0, 0, 0.05);
  W(w, 0.05, 0.05, frame, 0, hh * 0.1, 0.05);
  W(w + 0.26, 0.07, 0.16, tone(frame, 0.8), 0, -hh / 2 - 0.08, 0.07);
  if (shutter != null) for (const s of [-1, 1]) {
    W(w * 0.42, hh + 0.08, 0.05, shutter, s * (w / 2 + w * 0.24), 0, 0.03);
    for (let i = 0; i < 3; i++) W(w * 0.34, 0.03, 0.03, tone(shutter, 0.7), s * (w / 2 + w * 0.24), -hh * 0.3 + i * hh * 0.3, 0.06);
  }
}

/**
 * Oddport: a little academy for the crescent-moon students, with a bell tower, a school gate and
 * the level's student waiting at the gate. Lv 1 a second floor and a bench, Lv 2 flags, Lv 3 a
 * clock on the front gable, Lv 4 cream walls, a purple roof, gold trim, a gold crest, banners and
 * lit windows.
 */
export function makeOddport(level) {
  const u = makeThing();
  const top4 = level >= 4;
  const key = `p23odd${level}`;
  const k = kit(u, u.body, `${key}:base`);
  const wall = top4 ? 0xfff3e0 : 0xf3e5ab;
  const trim = top4 ? 0xffc400 : 0x8d6e63;
  const roof = top4 ? 0x4a148c : 0x8e3b2f;
  const stone = 0x9e9e9e;
  const pane = top4 ? glowMat(u, 0xffe082, 0.7) : 0x81d4fa;
  const shutter = top4 ? 0x5e35b1 : 0x4e7a3a;
  // lawn, flagstone path and hedges
  k.box(4.6, 0.3, 4.6, 0x7cb342, 0, 0.15, 0, { r: 0.08 });
  for (let i = 0; i < 5; i++) k.box(0.62, 0.06, 0.34, i % 2 ? 0xbcaaa4 : 0xa1887f, (i % 2 ? 0.12 : -0.1), 0.32, 0.45 + i * 0.36, { r: 0.03, ry: i * 0.2 });
  for (const s of [-1, 1]) {
    k.box(1.0, 0.5, 0.42, 0x2e7d32, s * 1.85, 0.52, 1.9, { r: 0.18 }); // hedges by the gate
    for (let i = 0; i < 4; i++) k.ball(0.07, [0xff4081, 0xffeb3b, PALE, 0xe040fb][i], s * (1.5 + i * 0.22), 0.8, 1.98 + (i % 2) * 0.1, { seg: 6, rows: 4 });
  }
  // the building
  const floors = level >= 1 ? 2 : 1;
  const fh = 1.6;
  const by = 0.3;
  const z0 = -0.9;
  const front = z0 + 1.1;
  k.box(3.8, 0.3, 2.4, stone, 0, by + 0.15, z0, { r: 0.04 }); // plinth
  for (let f = 0; f < floors; f++) {
    const y = by + fh * f;
    k.box(3.6, fh, 2.2, wall, 0, y + fh / 2, z0);
    k.box(3.7, 0.14, 2.3, trim, 0, y + fh, z0, { r: 0.03 }); // floor trim
    for (const s of [-1, 1]) for (let q = 0; q < 3; q++) k.box(0.2, 0.42, 0.2, tone(wall, 0.85), s * 1.76, y + 0.3 + q * 0.5, front - 0.06 - (q % 2) * 0.04); // corner stones
    for (const x of [-1.15, 1.15]) schoolWindow(k, x, y + 0.9, front + 0.03, 0.56, 0.66, PALE, pane, shutter);
    for (const s of [-1, 1]) schoolWindow(k, s * 1.83, y + 0.9, z0, 0.56, 0.66, PALE, pane, null, s);
    if (f === 1 && !top4) {
      k.box(0.7, 0.62, 0.06, PALE, 0, y + 0.9, front + 0.02, { r: 0.03 }); // the middle window
      k.box(0.54, 0.46, 0.05, pane, 0, y + 0.9, front + 0.05);
    }
  }
  const top = by + fh * floors;
  // the door: two panels, an arched glass light over it, steps and two lamps
  k.box(1.2, 1.45, 0.08, PALE, 0, by + 0.72, front + 0.02);
  for (const s of [-1, 1]) {
    k.box(0.48, 1.28, 0.08, 0x5d4037, s * 0.25, by + 0.64, front + 0.06);
    k.box(0.32, 0.4, 0.04, 0x4e342e, s * 0.25, by + 0.95, front + 0.11);
    k.box(0.32, 0.4, 0.04, 0x4e342e, s * 0.25, by + 0.4, front + 0.11);
    k.ball(0.05, GOLD, s * 0.07, by + 0.65, front + 0.13, { seg: 6, rows: 4 });
    lamp(k, s * 0.85, by + 1.1, front + 0.08, 0.1, top4 ? 0xffe082 : 0xfff3b0);
  }
  k.cyl(0.6, 0.06, PALE, 0, by + 1.45, front + 0.04, { axis: 'z', seg: 16 });
  k.cyl(0.5, 0.07, pane, 0, by + 1.45, front + 0.05, { axis: 'z', seg: 16 });
  for (let i = 0; i < 2; i++) k.box(1.5 - i * 0.3, 0.12, 0.3, 0xbdbdbd, 0, 0.36 + i * 0.12, front + 0.3 - i * 0.12);
  // a gable roof with tile rows, a ridge cap and a chimney
  const rh = 0.95;
  k.slab(3.95, rh, 2.6, roof, 0, top + rh / 2, z0, { td: 0.04 });
  const slope = Math.atan2(rh, 1.3);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const f = (i + 0.5) / 4.5;
    k.box(3.97, 0.05, 0.08, tone(roof, 0.78), 0, top + rh * f + 0.03, z0 + s * 1.3 * (1 - f), { rx: s * slope });
  }
  k.cyl(0.08, 3.95, tone(roof, 0.7), 0, top + rh, z0, { axis: 'x', seg: 8 });
  k.box(0.42, 0.9, 0.42, 0xa1887f, 1.3, top + 0.7, z0 - 0.45, { r: 0.03 });
  k.box(0.5, 0.1, 0.5, stone, 1.3, top + 1.16, z0 - 0.45);
  // a front gable over the door; Lv 3 a clock in it
  const gz = front + 0.15;
  k.slab(1.5, 0.75, 0.6, roof, 0, top + 0.38, gz - 0.15, { tw: 0.04 });
  k.slab(1.3, 0.66, 0.1, wall, 0, top + 0.33, gz + 0.12, { tw: 0.04 }); // its wall
  if (level >= 3) {
    const cy = top + 0.28;
    k.cyl(0.26, 0.06, PALE, 0, cy, gz + 0.16, { axis: 'z', seg: 18 });
    k.torus(0.26, 0.04, top4 ? GOLD : 0x5d4037, 0, cy, gz + 0.18, { seg: 18 });
    k.box(0.03, 0.18, 0.02, INK, 0, cy + 0.08, gz + 0.2);
    k.box(0.13, 0.03, 0.02, INK, 0.06, cy, gz + 0.2);
  } else k.cyl(0.18, 0.06, pane, 0, top + 0.26, gz + 0.16, { axis: 'z', seg: 14 }); // a round window
  // the bell tower on the ridge: posts, a bell, a little spire
  const bt = top + rh - 0.05;
  k.box(1.1, 0.14, 1.1, trim, 0, bt + 0.07, z0, { r: 0.03 });
  for (const x of [-0.42, 0.42]) for (const z of [-0.42, 0.42]) k.cyl(0.07, 1.0, PALE, x, bt + 0.6, z0 + z, { seg: 8 });
  k.box(1.2, 0.16, 1.2, roof, 0, bt + 1.15, z0, { r: 0.04 });
  k.cyl(0.85, 0.75, roof, 0, bt + 1.6, z0, { seg: 4, r2: 0.02, ry: PI / 4 });
  const bellC = top4 ? GOLD : 0xffb300;
  k.cyl(0.32, 0.45, bellC, 0, bt + 0.6, z0, { r2: 0.15, seg: 14 });
  k.torus(0.32, 0.04, tone(bellC, 0.8), 0, bt + 0.38, z0, { rx: PI / 2, seg: 14 });
  k.ball(0.08, 0x5d4037, 0, bt + 0.34, z0, { seg: 6, rows: 4 });
  k.cyl(0.03, 0.4, trim, 0, bt + 2.15, z0, { seg: 6 });
  // the weathervane turns
  const vane = spinner(u, u.body, 0, bt + 2.35, z0);
  const vk = kit(u, vane, `${key}:vane`);
  vk.box(0.9, 0.04, 0.04, INK, 0, 0, 0);
  vk.cyl(0.09, 0.18, INK, 0.54, 0, 0, { r2: 0.0, axis: 'x', seg: 4 });
  vk.box(0.04, 0.2, 0.22, INK, -0.42, 0, 0);
  vk.cyl(0.08, 0.04, top4 ? GOLD : 0xffb300, 0, 0.1, 0, { seg: 4, rx: PI / 2 }); // a little moon sign
  vk.done();
  u.idleSpin = 0.7;
  // the school gate: stone pillars with caps, an iron arch with the moon sign, gates swung open
  const iron = top4 ? GOLD : 0x263238;
  for (const s of [-1, 1]) {
    k.box(0.6, 1.9, 0.6, stone, s * 1.3, 1.25, 1.9, { r: 0.05 });
    for (let i = 0; i < 3; i++) k.box(0.64, 0.05, 0.64, tone(stone, 0.8), s * 1.3, 0.6 + i * 0.55, 1.9);
    k.box(0.75, 0.18, 0.75, 0x757575, s * 1.3, 2.25, 1.9, { r: 0.03 });
    k.ball(0.2, top4 ? GOLD : 0xbdbdbd, s * 1.3, 2.5, 1.9, { seg: 10, rows: 7 });
    // the open gate half: a frame of bars turned in toward the lawn
    const hx = s * 0.98;
    const th = Math.atan2(-s * Math.cos(1.2), -Math.sin(1.2));
    const gx = (dx) => hx - s * Math.cos(1.2) * dx;
    const gz = (dx) => 1.9 - Math.sin(1.2) * dx;
    k.box(0.05, 0.05, 0.9, iron, gx(0.45), 1.85, gz(0.45), { ry: th });
    k.box(0.05, 0.05, 0.9, iron, gx(0.45), 0.5, gz(0.45), { ry: th });
    for (let i = 0; i < 4; i++) {
      const d = 0.08 + i * 0.25;
      k.cyl(0.025, 1.45, iron, gx(d), 1.18, gz(d), { seg: 5 });
      k.cyl(0.05, 0.14, iron, gx(d), 1.97, gz(d), { r2: 0.0, seg: 4 }); // spear tips
    }
  }
  k.torus(0.98, 0.05, iron, 0, 2.05, 1.9, { arc: PI, sy: 0.55, seg: 18 });
  k.box(1.96, 0.08, 0.08, iron, 0, 2.05, 1.9);
  k.box(1.0, 0.4, 0.06, 0x4527a0, 0, 2.35, 1.93, { r: 0.04 }); // sign
  k.box(1.06, 0.46, 0.04, top4 ? GOLD : 0xffc400, 0, 2.35, 1.9);
  k.torus(0.12, 0.04, top4 ? GOLD : 0xffe082, -0.3, 2.35, 1.97, { arc: PI * 1.3, rz: PI * 0.2, seg: 10 }); // the moon
  for (let i = 0; i < 3; i++) k.box(0.12, 0.05, 0.02, PALE, 0.0 + i * 0.16, 2.35, 1.97);
  if (level >= 1) {
    // a wooden bench on the lawn
    for (let i = 0; i < 2; i++) k.box(0.15, 0.06, 1.2, WOOD, -1.42 + i * 0.17, 0.64, 0.85, { r: 0.02 });
    for (let i = 0; i < 2; i++) k.box(0.05, 0.12, 1.2, WOOD, -1.62, 0.8 + i * 0.16, 0.85, { r: 0.02 });
    for (const z of [-0.5, 0.5]) {
      for (const x of [-0.12, 0.12]) k.box(0.05, 0.32, 0.05, INK, -1.34 + x - 0.0, 0.46, 0.85 + z);
      k.box(0.05, 0.5, 0.05, INK, -1.62, 0.75, 0.85 + z);
    }
  }
  if (level >= 2) {
    flagPole(k, -1.95, 0.3, -1.95, 3.4, 0x7e57c2, 0xffe082);
    flagPole(k, 1.95, 0.3, -1.95, 3.4, 0xffc400, 0x4527a0);
  }
  if (top4) {
    // a gold crest over the door and purple banners down the front
    const cy = by + fh * (floors - 1) + 0.9;
    k.box(0.6, 0.55, 0.06, GOLD, 0, cy + 0.05, front + 0.06, { r: 0.05 });
    k.cyl(0.3, 0.06, GOLD, 0, cy - 0.2, front + 0.06, { axis: 'z', seg: 3, rz: PI });
    k.box(0.44, 0.4, 0.04, 0x4527a0, 0, cy + 0.05, front + 0.1);
    k.torus(0.12, 0.035, 0xfff8e1, 0, cy + 0.05, front + 0.13, { arc: PI * 1.3, rz: PI * 0.2, seg: 10 });
    for (const s of [-1, 1]) {
      const bx = s * 0.46;
      k.box(0.08, 0.08, 0.3, GOLD, bx, top - 0.05, front + 0.1);
      k.box(0.26, 1.2, 0.04, 0x6a1b9a, bx, top - 0.7, front + 0.13);
      k.cyl(0.15, 0.04, 0x6a1b9a, bx, top - 1.3, front + 0.13, { axis: 'z', seg: 3, rz: PI });
      k.box(0.3, 0.06, 0.05, GOLD, bx, top - 0.15, front + 0.14);
      k.ball(0.06, GOLD, bx, top - 0.7, front + 0.16, { seg: 6, rows: 4 });
    }
  }
  k.done();
  // the level's student waits at the gate (Nelly brings a friend)
  const kids = top4 ? [[-0.45, 4], [0.5, 0]] : [[-0.1, level]];
  for (const [x, i] of kids) {
    const s = student(i);
    s.root.scale.setScalar(0.32);
    s.root.position.set(x, 0.3, 1.2);
    u.body.add(s.root);
    u.mats.push(...s.mats);
  }
  u.projectile = { color: 0x9e9e9e, size: 0.6, arc: 3 };
  u.tracer = 0x9e9e9e;
  return u;
}

// ------------------------------------------------------------------ Chaos Jester

/**
 * Chaos Jester: a round white grinning face under a floppy pink-and-white hat with bell tips, a
 * ruffle collar and curled shoes, juggling a gold coin and a ball. Lv 1 Party Tricks: a card and a
 * magic cube join the juggle, Lv 2 Wheel of Fortune: purple motley and a spinning wheel behind
 * him, Lv 3 Loaded Dice: red and black motley, two big dice and playing cards circling him, Lv 4
 * Jackpot: royal purple and gold, popping out of a jack-in-the-box stage.
 */
export function makeChaosJester(level) {
  const jack = level >= 4;
  const [main, accent] = [[0xec407a, 0xf8bbd0], [0xec407a, 0xf8bbd0], [0x8e24aa, 0xf8bbd0], [0xc62828, 0x424242], [0x6a1b9a, 0xffd54f]][level] ?? [0x6a1b9a, 0xffd54f];
  const h = makeHumanoid({ skin: PALE, shirt: PALE, pants: main, arms: accent });
  h.head.remove(h.head.children[0]); // the round face takes the head's place
  const key = `p23cjest${level}`;
  const bellM = glowMat(h, GOLD, jack ? 0.8 : 0.35);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // the round face: slanted eyes, cheek diamonds and a wide grin full of teeth
  const R = 0.9;
  const cy = 0.85;
  hd.ball(R, PALE, 0, cy, 0, { sy: 0.95, sz: 0.85, seg: 22, rows: 16 });
  const fz = (x, y) => 0.85 * R * Math.sqrt(Math.max(0, 1 - (x / R) ** 2 - ((y - cy) / (0.95 * R)) ** 2));
  const eye = level >= 3 ? glowMat(h, main) : INK;
  for (const s of [-1, 1]) {
    hd.box(0.42, 0.13, 0.08, INK, s * 0.36, 1.12, fz(s * 0.36, 1.12), { rz: s * 0.35, ry: s * 0.45 });
    hd.box(0.12, 0.08, 0.06, eye, s * 0.36, 1.1, fz(s * 0.36, 1.1) + 0.03, { ry: s * 0.45 });
    hd.box(0.18, 0.18, 0.05, main, s * 0.62, 0.66, fz(s * 0.62, 0.66), { rz: PI / 4, ry: s * 0.75 });
  }
  hd.torus(0.44, 0.1, 0x4a0d1e, 0, 0.82, 0.68, { arc: PI, rz: PI, rx: -0.3, seg: 16 });
  for (let i = 0; i < 7; i++) {
    const a = -PI / 2 + ((i - 3) / 3) * 1.1;
    const x = Math.cos(a) * 0.44;
    const y = 0.82 + Math.sin(a) * 0.44;
    hd.box(0.1, 0.1, 0.06, PALE, x, y + 0.06, fz(x, y) + 0.04, { rz: a + PI / 2, ry: x * 0.8 });
  }
  hd.ball(0.11, main, 0, 0.98, fz(0, 0.98) + 0.03, { seg: 10, rows: 7 }); // a round nose
  // the floppy hat: a checked band, a crown and drooping points with bells (three for Jackpot)
  hd.cyl(0.84, 0.26, main, 0, 1.38, 0, { seg: 24 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    hd.box(0.42, 0.24, 0.05, i % 2 ? PALE : tone(main, 0.85), Math.sin(a) * 0.86, 1.38, Math.cos(a) * 0.86, { ry: a });
  }
  hd.torus(0.86, 0.04, GOLD, 0, 1.52, 0, { rx: PI / 2, seg: 24 });
  dome(hd, 0.82, 0.42, main, 0, 1.52, 0);
  const points = jack ? [-1, 0, 1] : [-1, 1];
  for (const s of points) {
    const col = s < 0 ? main : s > 0 ? PALE : accent;
    const p = s === 0
      ? [[0, 1.75, -0.3], [0, 2.4, -0.85], [0, 2.25, -1.45], [0, 1.75, -1.6]]
      : [[s * 0.4, 1.7, 0], [s * 1.05, 2.3, 0], [s * 1.55, 2.1, 0], [s * 1.62, 1.6, 0.05]];
    const r = [0.36, 0.24, 0.14, 0.07];
    for (let i = 0; i < 3; i++) {
      limb(hd, p[i], p[i + 1], r[i], r[i + 1], col, 10);
      if (i > 0) hd.ball(r[i], col, ...p[i], { seg: 10, rows: 6 });
    }
    hd.ball(0.17, bellM, p[3][0], p[3][1] - 0.14, p[3][2], { seg: 10, rows: 7 });
    hd.box(0.22, 0.03, 0.03, INK, p[3][0], p[3][1] - 0.22, p[3][2] + 0.12);
  }
  // a frilly ruffle collar (two rings)
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * PI * 2;
    t.ball(0.26, i % 2 ? main : tone(main, 1.35), Math.sin(a) * 0.95, 1.06, Math.cos(a) * 0.62, { sy: 0.5, seg: 8, rows: 6 });
    t.ball(0.18, PALE, Math.sin(a + 0.2) * 0.72, 1.22, Math.cos(a + 0.2) * 0.45, { sy: 0.5, seg: 8, rows: 5 });
  }
  // motley: diamonds front and back, pompom buttons, a jagged hem
  for (const [x, y] of [[-0.5, 0.35], [0.5, 0.35], [0, -0.35]]) for (const z of [0.53, -0.53]) t.box(0.52, 0.52, 0.04, main, x, y, z, { rz: PI / 4 });
  for (const [x, y] of [[0, 0.35], [-0.5, -0.35], [0.5, -0.35]]) t.box(0.3, 0.3, 0.04, accent, x, y, 0.56, { rz: PI / 4 });
  for (const y of [0.55, 0.05, -0.45]) t.ball(0.1, bellM, 0, y, 0.6, { seg: 8, rows: 5 });
  for (let i = 0; i < 10; i++) {
    const a = ((i + 0.5) / 10) * PI * 2;
    const x = Math.max(-1, Math.min(1, Math.sin(a) * 1.25));
    const z = Math.max(-0.5, Math.min(0.5, Math.cos(a) * 0.7));
    t.cyl(0.005, 0.5, i % 2 ? main : accent, x * 1.02, -1.18, z * 1.08, { r2: 0.28, seg: 4, sz: 0.35, ry: Math.atan2(x, z) });
  }
  belt(t, INK, GOLD, -0.82);
  hd.done();
  t.done();
  hands(h, key, PALE, tone(accent, 0.85), (a) => {
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * PI * 2;
      a.ball(0.18, main, Math.sin(ang) * 0.5, -1.5, Math.cos(ang) * 0.5, { sy: 0.6, seg: 8, rows: 5 }); // ruffled cuffs
    }
  });
  // one white leg for motley, curled shoes with a bell on each tip
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:${leg === h.leftLeg ? 'L' : 'R'}leg`);
    if (leg === h.leftLeg) b.box(1.03, 1.68, 1.03, PALE, 0, -0.84, 0, { r: 0.05 });
    b.box(1.06, 0.5, 1.12, main, 0, -1.75, 0.05, { r: 0.15 });
    b.box(1.1, 0.12, 1.16, accent, 0, -1.5, 0.05);
    limb(b, [0, -1.85, 0.5], [0, -1.8, 1.0], 0.32, 0.18, main, 10);
    b.ball(0.18, main, 0, -1.8, 1.0, { seg: 8, rows: 6 });
    limb(b, [0, -1.8, 1.0], [0, -1.45, 1.22], 0.18, 0.07, main, 8);
    b.ball(0.12, bellM, 0, -1.38, 1.15, { seg: 8, rows: 5 });
    b.done();
  }
  // things juggled in a loop over his head (it turns)
  const loop = spinner(h, h.body, 0, 8.5, 0.3, 'z');
  const jk = wear(h, loop, `${key}:juggle`);
  const items = [
    (x, z) => { jk.cyl(0.32, 0.1, glowMat(h, GOLD, 0.6), x, 0, z, { seg: 16 }); jk.torus(0.3, 0.03, 0xffa000, x, 0.05, z, { rx: PI / 2, seg: 14 }); }, // a gold coin
    (x, z) => { jk.ball(0.26, PALE, x, 0, z, { seg: 12, rows: 8 }); jk.torus(0.26, 0.04, main, x, 0, z, { seg: 14 }); }, // a ball
  ];
  if (level >= 1) {
    items.push((x, z) => card(jk, RED, x, 0, z));
    items.push((x, z) => jk.box(0.42, 0.42, 0.42, glowMat(h, 0xe040fb), x, 0, z, { rx: 0.6, ry: 0.6, r: 0.04 })); // a magic cube
  }
  if (jack) items.push((x, z) => jk.ball(0.3, glowMat(h, 0x00e5ff), x, 0, z, { seg: 6, rows: 3 })); // a gem
  items.forEach((mk, i) => {
    const a = (i / items.length) * PI * 2;
    mk(Math.cos(a) * 1.05, Math.sin(a) * 1.05);
  });
  jk.done();
  h.idleSpin = 1.6;
  if (level >= 2) {
    // the wheel of fortune behind him on a post (it turns), with a pointer on top
    const wy = jack ? 5.4 : 5.2;
    const pk = wear(h, h.body, `${key}:post`);
    pk.cyl(0.16, wy - 0.1, 0x6d4c41, 0, (wy - 0.1) / 2, -1.85, { seg: 10 });
    pk.box(0.9, 0.12, 0.9, 0x5d4037, 0, 0.06, -1.85, { r: 0.04 });
    pk.box(0.3, 0.5, 0.12, INK, 0, wy + 1.75, -1.6, { r: 0.03 });
    pk.cyl(0.0, 0.3, RED, 0, wy + 1.42, -1.6, { r2: 0.13, seg: 4 }); // pointer tip
    pk.cyl(0.12, 0.3, GOLD, 0, wy, -1.82, { axis: 'z', seg: 12 });
    pk.done();
    const w = spinner(h, h.body, 0, wy, -1.62, 'z');
    const wk = wear(h, w, `${key}:wheel`);
    const cols = [0xe53935, 0xffc400, 0x1e88e5, 0x43a047, 0xec407a, 0x8e24aa, 0xff7043, 0x00acc1];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      const p = (t) => [Math.sin(t) * 1.5, Math.cos(t) * 1.5];
      wk.plan([[0, 0], p(a - PI / 8), p(a), p(a + PI / 8)], 0.1, cols[i], 0, -0.05, 0); // one wedge
    }
    wk.torus(1.55, 0.1, GOLD, 0, 0, 0, { rx: PI / 2, seg: 28 });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * PI * 2;
      wk.ball(0.07, i % 2 ? PALE : GOLD, Math.sin(a) * 1.55, 0.1, Math.cos(a) * 1.55, { seg: 6, rows: 4 });
    }
    for (let i = 0; i < 4; i++) wk.box(3.0, 0.06, 0.08, tone(GOLD, 0.85), 0, 0.07, 0, { ry: (i / 4) * PI });
    wk.cyl(0.32, 0.22, GOLD, 0, 0.08, 0, { seg: 14 });
    wk.cyl(0.18, 0.1, main, 0, 0.2, 0, { seg: 12 });
    wk.done();
  }
  // a stage kit on the ground (it stays down when Jackpot lifts him)
  const gk = wear(h, h.root, `${key}:ground`);
  if (level >= 3) {
    die(gk, jack ? 2.4 : 1.9, 0.42, jack ? 1.4 : 1.3, 0.84, PALE, INK);
    die(gk, jack ? -2.35 : 2.5, 0.42, jack ? 0.9 : 0.3, 0.84, PALE, RED);
  }
  if (jack) {
    // the jack-in-the-box: a striped box, gold trim, the lid flung open, a crank and stage lights
    h.lift = 2.0;
    h.bob = 0.08;
    for (let i = 0; i < 5; i++) gk.box(0.68, 1.9, 3.4, i % 2 ? PALE : main, -1.36 + i * 0.68, 0.95, 0);
    for (const y of [0.05, 1.95]) gk.box(3.55, 0.14, 3.55, GOLD, 0, y, 0, { r: 0.04 });
    for (const x of [-1.72, 1.72]) for (const z of [-1.72, 1.72]) gk.box(0.14, 1.9, 0.14, GOLD, x, 0.95, z);
    for (const s of [-1, 1]) gk.box(1.2, 1.2, 0.04, accent, s * 0.0 + 0, 1.0, s * 1.71, { rz: PI / 4 }); // a diamond each side
    gk.box(3.4, 0.14, 3.4, main, 0, 2.95, -2.35, { rx: -1.2 });
    gk.box(3.5, 0.08, 3.5, GOLD, 0, 2.92, -2.3, { rx: -1.2 });
    for (let i = 0; i < 4; i++) gk.torus(0.6, 0.07, 0xb0bec5, 0, 2.0 + i * 0.1, 0, { rx: PI / 2, seg: 16 }); // the spring under him
    for (const x of [-1.4, 1.4]) {
      gk.cyl(0.2, 0.25, INK, x, 2.12, 1.55, { seg: 10 });
      gk.ball(0.18, glowMat(h, 0xfff176), x, 2.3, 1.6, { seg: 10, rows: 6 }); // stage lights
    }
    for (const [x, z] of [[-1.3, -1.3], [1.3, -1.25]]) for (let i = 0; i < 4; i++) gk.cyl(0.2, 0.06, GOLD, x + (i % 2) * 0.03, 2.05 + i * 0.07, z, { seg: 12 }); // coin stacks
    gk.cyl(0.08, 0.3, 0x9e9e9e, 1.85, 1.1, 0.4, { axis: 'x', seg: 8 });
  }
  gk.done();
  if (jack) {
    const crank = spinner(h, h.root, 2.0, 1.1, 0.4, 'x');
    const ck = wear(h, crank, `${key}:crank`);
    ck.box(0.12, 0.1, 0.7, 0x9e9e9e, 0, 0, 0.3);
    ck.cyl(0.08, 0.3, GOLD, 0, 0.15, 0.6, { seg: 8 });
    ck.done();
  }
  if (level >= 3) {
    // playing cards circling him
    const ring = drifter(h, h.root, jack ? 1.2 : 0.9, 0.25, 0.25);
    const n = jack ? 8 : 5;
    const r = jack ? 3.0 : 2.5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2;
      const c = new THREE.Group();
      c.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      c.rotation.y = -a;
      ring.add(c);
      const ck = wear(h, c, `${key}:card${i % 2}`);
      card(ck, i % 2 ? INK : RED);
      ck.done();
    }
  }
  // a glowing ball ready to throw in his right hand
  const g = held(h, key, 1.0, (k) => {
    k.ball(0.26, glowMat(h, main === 0x424242 ? 0xff4081 : tone(main, 1.3)), 0, -0.3, 0, { seg: 12, rows: 8 });
    k.torus(0.26, 0.04, GOLD, 0, -0.3, 0, { seg: 14 });
  });
  h.muzzles = [];
  muzzle(h, g, -0.3, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-2.4, 0, -0.3);
  h.pose = { right: -2.8, left: -2.4, leftRecoil: 0 };
  return own(h, 0);
}

// ------------------------------------------------------------------ Paralyzer

/** A stun gun on the fist (gun space): a chunky body, a copper coil barrel with glowing rings, two prongs. Returns the bore point. */
function stunGun(k, len, neon, rings) {
  const U = UP;
  k.box(0.22, 0.26, 0.5, INK, 0, 0.1, U - 0.36, { rx: -0.3, r: 0.04 }); // grip
  k.torus(0.09, 0.02, INK, 0, -0.12, U - 0.22, { ry: PI / 2, seg: 10, arc: PI });
  k.box(0.26, 0.55, 0.34, 0x37474f, 0, 0.45, U + 0.02, { r: 0.07 }); // battery stock
  k.box(0.28, 0.1, 0.36, neon, 0, 0.3, U + 0.02);
  k.box(0.36, 0.9, 0.5, 0x263238, 0, -0.25, U, { r: 0.08 }); // body
  k.box(0.04, 0.5, 0.22, neon, 0.19, -0.25, U + 0.04); // side light
  k.box(0.12, 0.6, 0.08, INK, 0, -0.25, U + 0.28);
  const bl = len - 0.7;
  k.cyl(0.11, bl, 0x37474f, 0, -0.7 - bl / 2, U, { seg: 12 });
  coil(k, 0, -0.95, U, 0.22, 0.45, 4, 0x263238);
  for (let i = 0; i < rings; i++) k.torus(0.17, 0.04, neon, 0, -1.3 - i * 0.22, U, { rx: PI / 2, seg: 14 });
  k.cyl(0.18, 0.16, 0x263238, 0, -len + 0.05, U, { seg: 12, r2: 0.13 });
  for (const s of [-1, 1]) {
    k.box(0.05, 0.3, 0.05, STEEL, s * 0.12, -len - 0.12, U);
    k.ball(0.05, neon, s * 0.12, -len - 0.28, U, { seg: 6, rows: 4 });
  }
  k.ball(0.1, neon, 0, -len - 0.08, U, { seg: 8, rows: 6 });
  return [-len - 0.15, U];
}

/**
 * Paralyzer: a soldier in purple with stun canisters on the back and a stun gun. Lv 1 Faster
 * Charging: black gloves, arm bands and a vial at the waist, Lv 2 Flash Mask: a mask with a neon
 * visor, Lv 3 Stronger Chemicals: sleeves, headphones and one big canister holding two vials, Lv 4
 * Paralysis Ray: in armour with two antennas, seated on a pad at a huge black ray gun.
 */
export function makeParalyzer(level) {
  const ray = level >= 4;
  const purple = ray ? 0x4a148c : 0x7b1fa2;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: purple, pants: 0x4a148c, arms: level >= 3 ? purple : null, face: 'soldier' });
  const key = `p23para${level}`;
  const neon = glowMat(h, 0xd500f9);
  const metal = 0x9e9e9e;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  helmet(hd, ray ? 0x2a1a40 : 0x6a1b9a, { cover: 0x311b92 });
  if (level >= 2) {
    // the flash mask: a dark face plate, filter cans and a neon visor
    band(hd, 0.66, 0.06, 0.48, 2.3, 0x212121, 0.3);
    band(hd, 0.67, 0.05, 0.2, 2.0, neon, 0.74);
    for (const s of [-1, 1]) hd.cyl(0.12, 0.16, 0x37474f, s * 0.38, 0.25, 0.6, { axis: 'z', seg: 10, ry: s * 0.6 });
    hd.box(0.2, 0.2, 0.08, 0x37474f, 0, 0.3, 0.7, { r: 0.04 });
  }
  if (level >= 3) headphones(hd, 0x212121, neon, { r: 0.82 });
  // the chest: a padded vest with a lightning badge
  if (!ray) {
    t.box(2.12, 1.3, 1.12, tone(purple, 0.75), 0, 0.28, 0, { r: 0.08 });
    for (let i = 0; i < 3; i++) t.box(2.14, 0.04, 1.14, tone(purple, 0.55), 0, 0.0 + i * 0.3, 0);
    pouch(t, -0.5, -0.32, 0.56, 0.42, 0.42, 0x311b92);
  }
  const bz = ray ? 0.66 : 0.62;
  t.box(0.14, 0.4, 0.04, neon, 0.45, 0.62, bz, { rz: -0.5 });
  t.box(0.14, 0.4, 0.04, neon, 0.52, 0.36, bz, { rz: -0.5 });
  belt(t, 0x311b92, 0x9575cd);
  // on the back: two canisters, from Lv 3 one big glass canister with two vials inside
  for (const s of [-1, 1]) {
    t.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
    if (ray) continue;
    t.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, 0.6);
  }
  if (level < 3) {
    for (const x of [-0.45, 0.45]) {
      t.cyl(0.3, 1.4, metal, x, 0.05, -0.88, { seg: 14 });
      dome(t, 0.3, 0.18, metal, x, 0.75, -0.88);
      t.cyl(0.32, 0.14, 0x424242, x, -0.6, -0.88, { seg: 14 });
      t.box(0.16, 0.9, 0.08, neon, x, 0.05, -1.17);
      t.cyl(0.08, 0.2, 0x424242, x, 1.0, -0.88, { seg: 8 });
      t.torus(0.12, 0.03, RED, x, 1.12, -0.88, { rx: PI / 2, seg: 10 });
    }
    t.tube([[0.45, 1.05, -0.88], [0.8, 1.2, -0.5], [1.0, 0.9, 0.0]], 0.05, INK, { seg: 10, sides: 5 }); // hose to the gun
  } else {
    const gl = glassMat(h, 0xb39ddb, 0.3);
    t.box(1.5, 0.28, 0.85, 0x212121, 0, -0.85, -1.0, { r: 0.06 });
    t.box(1.5, 0.28, 0.85, 0x212121, 0, 1.0, -1.0, { r: 0.06 });
    for (const x of [-0.7, 0.7]) t.box(0.12, 1.6, 0.12, 0x37474f, x, 0.07, -0.62);
    for (const x of [-0.7, 0.7]) t.box(0.12, 1.6, 0.12, 0x37474f, x, 0.07, -1.38);
    for (const x of [-0.35, 0.35]) {
      t.cyl(0.2, 1.4, neon, x, 0.07, -1.0, { seg: 12 });
      t.cyl(0.22, 0.12, metal, x, 0.82, -1.0, { seg: 12 });
    }
    t.box(1.4, 1.62, 0.8, gl, 0, 0.07, -1.0);
    t.cyl(0.1, 0.3, metal, 0, 1.25, -1.0, { seg: 8 });
    t.box(0.6, 0.2, 0.06, neon, 0, -0.85, -1.44);
  }
  if (level >= 1) {
    t.cyl(0.13, 0.42, neon, 0.75, -0.95, 0.66, { seg: 10 }); // a vial at the waist
    t.cyl(0.15, 0.12, 0x212121, 0.75, -0.68, 0.66, { seg: 10 });
    t.box(0.34, 0.1, 0.2, INK, 0.75, -1.05, 0.6);
  }
  if (ray) {
    // armour with shoulder plates and two antennas on the back
    t.box(2.22, 1.85, 1.2, 0x2a1a40, 0, 0.05, 0, { r: 0.14 });
    t.box(1.4, 0.9, 0.06, 0x3d2560, 0, 0.35, 0.61, { r: 0.05 });
    for (let i = 0; i < 3; i++) t.box(1.6, 0.05, 0.04, neon, 0, -0.3 - i * 0.18, 0.61);
    shoulderPads(t, 0x2a1a40, 0.66);
    t.box(1.3, 1.5, 0.5, 0x212121, 0, 0.1, -0.85, { r: 0.08 }); // power pack
    for (const s of [-1, 1]) {
      antenna(t, s * 0.5, 0.85, -0.95, 1.6, 0.0);
      t.ball(0.13, neon, s * 0.5, 2.85, -0.95, { seg: 8, rows: 6 });
    }
    t.box(0.6, 0.6, 0.05, neon, 0, 0.1, -1.11, { r: 0.04 });
  }
  hd.done();
  t.done();
  const glov = level >= 1 ? 0x111111 : null;
  const armBand = level >= 1 ? (a) => a.box(1.12, 0.2, 1.12, 0x311b92, 0, -0.95, 0, { r: 0.03 }) : null;
  if (level >= 3) hands(h, key, glov, tone(purple, 0.8), armBand);
  else sleeves(h, key, purple, glov, armBand);
  feet(h, key, 0x212121, ray ? kneePad : null);
  h.muzzles = [];
  if (!ray) {
    const g = fist(h.rightArm, -1.9, 1.2);
    const gk = wear(h, g, `${key}:gun`);
    const [y, z] = stunGun(gk, 1.5 + level * 0.12, neon, 1 + Math.min(level, 2));
    gk.done();
    muzzle(h, g, y, z);
    aimLong(h);
  } else {
    // seated on a pad at the ray gun
    h.lift = -0.7;
    h.bob = 0.02;
    for (const l of [h.rightLeg, h.leftLeg]) l.rotation.x = -PI / 2;
    const k = wear(h, h.root, `${key}:ray`);
    k.box(4.2, 0.25, 4.2, 0x212121, 0, 0.12, 0, { r: 0.08 }); // pad
    for (const s of [-1, 1]) {
      k.box(4.0, 0.06, 0.12, neon, 0, 0.27, s * 1.95);
      k.box(0.12, 0.06, 4.0, neon, s * 1.95, 0.27, 0);
    }
    for (const x of [-1.6, 1.6]) for (const z of [-1.6, 1.6]) k.cyl(0.12, 0.06, STEEL, x, 0.27, z, { seg: 8 }); // bolts
    // the seat
    k.cyl(0.35, 0.3, 0x37474f, 0, 0.4, -0.1, { seg: 12 });
    k.box(1.8, 0.4, 1.6, 0x37474f, 0, 0.6, -0.1, { r: 0.12 });
    k.box(1.7, 0.12, 1.5, 0x4a148c, 0, 0.82, -0.1, { r: 0.05 });
    k.box(1.8, 1.7, 0.3, 0x37474f, 0, 1.55, -1.0, { r: 0.1 });
    k.box(1.5, 1.4, 0.1, 0x4a148c, 0, 1.55, -0.83, { r: 0.04 });
    // the gun on its post
    k.cyl(0.35, 2.2, 0x151515, 0, 1.2, 2.7, { seg: 14 });
    k.cyl(0.55, 0.3, 0x212121, 0, 2.2, 2.7, { seg: 14 });
    k.box(1.5, 1.3, 3.4, 0x151515, 0, 2.85, 3.2, { r: 0.18 });
    for (const x of [-0.45, 0.45]) k.box(0.14, 0.06, 3.0, neon, x, 3.52, 3.2);
    k.box(0.6, 0.18, 1.6, 0x2a2a2a, 0, 3.55, 3.0, { r: 0.05 }); // top sight
    k.cyl(0.12, 0.6, 0x111111, 0, 3.75, 3.3, { axis: 'z', seg: 10 });
    for (const s of [-1, 1]) {
      k.box(0.06, 0.16, 3.0, neon, s * 0.77, 3.25, 3.2);
      for (let i = 0; i < 5; i++) k.box(0.1, 1.0, 0.1, 0x2a2a2a, s * 0.79, 2.85, 2.2 + i * 0.45); // cooling ribs
      k.box(0.12, 0.6, 0.12, 0x424242, s * 0.6, 3.05, 1.55); // grips
      k.box(0.3, 0.12, 0.3, 0x424242, s * 0.6, 2.75, 1.55);
      k.cyl(0.22, 1.2, 0x37474f, s * 0.95, 2.4, 3.3, { axis: 'z', seg: 12 }); // energy cells
      k.cyl(0.16, 1.0, neon, s * 0.95, 2.4, 3.3, { axis: 'z', seg: 10 });
    }
    k.tube([[0, 2.2, 1.8], [0, 1.0, 1.3], [0.4, 0.3, 0.8]], 0.08, INK, { seg: 12, sides: 6 }); // power cable
    k.cyl(0.42, 2.4, 0x151515, 0, 2.85, 6.0, { axis: 'z', seg: 16, r2: 0.36 });
    for (const z of [5.2, 5.9, 6.6]) k.torus(0.52, 0.09, neon, 0, 2.85, z, { seg: 18 });
    k.cyl(0.7, 0.3, 0x212121, 0, 2.85, 7.3, { axis: 'z', seg: 18, r2: 0.55 });
    k.cyl(0.45, 0.08, neon, 0, 2.85, 7.48, { axis: 'z', seg: 18 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2 + PI / 2;
      k.box(0.1, 0.1, 0.6, STEEL, Math.cos(a) * 0.62, 2.85 + Math.sin(a) * 0.62, 7.6); // emitter prongs
    }
    k.done();
    muzzle(h, h.root, 2.85, 7.6, 0);
    h.rightArm.rotation.set(-PI / 2, 0, 0.3);
    h.leftArm.rotation.set(-PI / 2, 0, -0.3);
    h.pose = { right: -PI / 2, left: -PI / 2, leftRecoil: 0.3 };
    h.recoilScale = 0.3;
  }
  h.tracer = 0xd500f9;
  h.tracerWidth = ray ? 0.55 : 0.3;
  return own(h);
}

// ------------------------------------------------------------------ Hunter

/** A safari hat (head space): a wide stiff brim, a round crown with air vents, a band and a chin strap. */
function safariHat(k, col, bandCol) {
  k.cyl(1.0, 0.07, col, 0, 1.1, 0, { seg: 24 });
  k.torus(1.0, 0.04, tone(col, 0.82), 0, 1.09, 0, { rx: PI / 2, seg: 24 });
  k.cyl(0.66, 0.5, col, 0, 1.38, 0, { seg: 20, r2: 0.6 });
  dome(k, 0.6, 0.24, col, 0, 1.62, 0);
  k.cyl(0.67, 0.16, bandCol, 0, 1.2, 0, { seg: 20 });
  for (const s of [-1, 1]) {
    k.cyl(0.05, 0.04, INK, s * 0.63, 1.45, 0, { axis: 'x', seg: 8 }); // vents
    k.tube([[s * 0.66, 1.12, 0.05], [s * 0.6, 0.5, 0.15], [s * 0.35, 0.1, 0.35]], 0.025, LEATHER, { seg: 8, sides: 4 });
  }
}

/**
 * Hunter: a bounty hunter in mud-brown clothes with a safari hat, a backpack and a hunting rifle.
 * Lv 1 Bounties: black gloves, an orange arm band and a wanted poster on the pack, Lv 2 Sharp
 * Vision: sunglasses and a scope, Lv 3 Collateral Damage: darker long sleeves, a bandolier and a
 * bigger rifle, Lv 4 Most Wanted: the cyber hunter, with tech glasses, a black mask, an antenna in
 * the pack and a glowing laser rifle.
 */
export function makeBountyHunter(level) {
  const cyber = level >= 4;
  const shirt = cyber ? 0x2e2a24 : level >= 3 ? 0x4e3b26 : 0x7a5c3a;
  const h = makeHumanoid({ skin: 0xd9a066, shirt, pants: cyber ? 0x1f1c18 : level >= 3 ? 0x3e2e1e : 0x5d4630, arms: level >= 3 ? shirt : null, face: 'soldier' });
  const key = `p23bounty${level}`;
  const cyan = glowMat(h, 0x00e5ff);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x4e342e, { h: 0.38 });
  safariHat(hd, cyber ? 0x3a3530 : 0xc8a96e, cyber ? cyan : 0x5d4037);
  if (cyber) {
    band(hd, 0.66, 0.05, 0.2, 2.0, cyan, 0.72); // tech glasses
    band(hd, 0.655, 0.06, 0.46, 2.2, 0x111111, 0.3); // black mask
    hd.cyl(0.1, 0.12, 0x263238, -0.66, 0.72, 0, { axis: 'x', seg: 10 });
    hd.ball(0.04, glowMat(h, 0xff1744), -0.73, 0.72, 0.05, { seg: 6, rows: 4 });
  } else if (level >= 2) shades(hd, 0x111111, 0x263238);
  // a safari shirt: collar, four pockets, epaulettes and a shell belt
  collar(t, tone(shirt, 0.85));
  pockets(t, tone(shirt, 0.9));
  for (const s of [-1, 1]) {
    pouch(t, s * 0.55, -0.45, 0.5, 0.48, 0.42, tone(shirt, 0.9), 0.06);
    t.box(0.3, 0.08, 0.9, tone(shirt, 0.8), s * 0.72, 1.02, 0, { r: 0.02 });
  }
  belt(t, 0x4e342e, cyber ? 0x00e5ff : 0xb0b0b0);
  for (const x of [-0.75, -0.55, -0.35, 0.35, 0.55, 0.75]) {
    t.cyl(0.065, 0.26, cyber ? 0x37474f : 0xc9a227, x, -0.66, 0.6, { seg: 8 });
    t.ball(0.06, cyber ? cyan : 0x8d6e63, x, -0.52, 0.6, { seg: 6, rows: 4 });
  }
  if (level >= 3) bandolier(t, -1, cyber ? 0x212121 : 0x3e2723);
  // the backpack with a bedroll; Lv 1 a wanted poster, Lv 4 an antenna and a screen
  pack(t, 0x3e2723, { w: 1.5, h: 1.6, d: 0.7, roll: cyber ? 0x263238 : 0x33691e, strap: 0x2b1d14 });
  if (level >= 1 && !cyber) {
    t.box(0.48, 0.4, 0.03, 0xf5e6c8, 0.2, 0.24, -1.23, { rz: 0.08 }); // wanted poster
    t.box(0.24, 0.18, 0.02, 0x5d4037, 0.2, 0.22, -1.25, { rz: 0.08 });
    t.box(0.36, 0.05, 0.02, 0x8d1c1c, 0.19, 0.37, -1.25, { rz: 0.08 });
    t.box(0.34, 0.03, 0.02, 0x5d4037, 0.21, 0.09, -1.25, { rz: 0.08 });
  }
  if (cyber) {
    antenna(t, 0.5, 0.75, -0.95, 1.8, 0.0);
    t.ball(0.11, glowMat(h, 0xff1744), 0.5, 2.95, -0.95, { seg: 8, rows: 6 });
    t.box(0.6, 0.36, 0.05, cyan, -0.25, 0.25, -1.24, { r: 0.03 });
  }
  hd.done();
  t.done();
  const glov = level >= 1 ? 0x111111 : null;
  const armBand = level >= 1 ? (a, s) => { if (s > 0) a.box(1.12, 0.14, 1.12, cyber ? cyan : 0xff6f00, 0, -0.5, 0, { r: 0.03 }); } : null;
  if (level >= 3) hands(h, key, glov, tone(shirt, 0.85), armBand);
  else sleeves(h, key, shirt, glov, armBand);
  feet(h, key, 0x4e342e, (b) => b.box(1.1, 0.4, 1.1, cyber ? 0x212121 : 0x8d6e63, 0, -1.3, 0.02, { r: 0.05 })); // gaiters
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = boltRifle(gk, {
    len: level >= 3 ? 2.8 : 2.45,
    wood: cyber ? 0x263238 : level >= 3 ? 0x3e2723 : 0x6d4c41,
    metal: cyber ? 0x212121 : GUNMETAL,
    scope: level >= 2 ? 1.0 : 0.7,
    lens: cyber ? 0x00e5ff : 0x4fc3f7,
    brake: level >= 3,
  });
  if (cyber) {
    for (const yy of [-1.15, -1.55, -1.95]) gk.torus(0.11, 0.035, cyan, 0, yy, z, { rx: PI / 2, seg: 12 });
    gk.ball(0.1, cyan, 0, y - 0.05, z, { seg: 8, rows: 6 });
    gk.box(0.04, 0.8, 0.1, cyan, 0.16, -0.5, UP - 0.02);
  }
  gk.tube([[0, 0.7, UP - 0.28], [0, -0.2, UP - 0.55], [0, -1.2, UP - 0.25]], 0.025, LEATHER, { seg: 8, sides: 4 }); // sling
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = cyber ? 0x00e5ff : 0xffd54f;
  if (cyber) h.tracerWidth = 0.35;
  return own(h);
}

// ------------------------------------------------------------------ Slugger

/** A baseball bat in gun space (grip in the fist, barrel up along -y). o: col, grip, metal, spikes, neon. Returns the tip y. */
function bat(k, o) {
  const col = o.col;
  k.cyl(0.15, 0.1, o.grip, 0, 0.2, 0, { seg: 12 }); // knob
  k.cyl(0.1, 1.0, o.grip, 0, -0.3, 0, { seg: 10 });
  for (let i = 0; i < 4; i++) k.torus(0.1, 0.02, tone(o.grip, 0.7), 0, 0.05 - i * 0.22, 0, { rx: PI / 2, seg: 10, rz: 0.2 }); // tape wraps
  k.cyl(0.26, 1.3, col, 0, -1.45, 0, { r2: 0.11, seg: 14 }); // taper
  k.cyl(0.27, 0.95, col, 0, -2.55, 0, { r2: 0.26, seg: 14 });
  k.ball(0.27, col, 0, -3.02, 0, { sy: 0.35, seg: 14, rows: 6 });
  if (o.metal) {
    k.cyl(0.272, 0.25, o.label, 0, -2.2, 0, { seg: 14 }); // a painted label band
    k.cyl(0.115, 0.05, INK, 0, -0.82, 0, { seg: 10 });
  } else for (let i = 0; i < 3; i++) k.box(0.02, 1.2, 0.02, tone(col, 0.78), Math.sin(i * 2.1) * 0.24, -2.4, Math.cos(i * 2.1) * 0.24); // grain
  if (o.spikes) for (const yy of [-2.2, -2.55, -2.9]) for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2 + yy;
    k.cyl(0.06, 0.3, STEEL, Math.cos(a) * 0.38, yy, Math.sin(a) * 0.38, { r2: 0.005, rz: -PI / 2, ry: -a, seg: 5 });
  }
  if (o.neon) k.torus(0.3, 0.05, o.neon, 0, -1.75, 0, { rx: PI / 2, seg: 16 });
  return -3.1;
}

/**
 * Slugger: a baseball player in a blue cap and jersey with a wooden bat. Lv 1 Sturdy Grip: sleeves
 * and dark blue batting gloves, Lv 2 Spiked Bat: a backpack, a belt and nails in the bat, Lv 3
 * Metal Gear: darker kit, a black glove, headphones, knee pads and a metal bat, Lv 4 Power Surge:
 * all black with a mask, a spiked metal bat with a red neon ring and a flag on the pack.
 */
export function makeSlugger(level) {
  const blk = level >= 4;
  const shirt = blk ? 0x151515 : level >= 3 ? 0x0d47a1 : 0x1e88e5;
  const pants = blk ? 0x0d0d0d : level >= 3 ? 0x1a237e : 0x1565c0;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants, arms: level >= 1 ? shirt : null, face: 'smile' });
  const key = `p23slug${level}`;
  const red = glowMat(h, 0xff1744);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const capC = blk ? 0x0d0d0d : level >= 3 ? 0x0d47a1 : 0x1565c0;
  hair(hd, 0x3e2723, { h: 0.38 });
  capBadge(hd, capC, blk ? red : PALE);
  if (level >= 3) headphones(hd, 0x212121, blk ? red : 0x1e88e5, { r: 0.8 });
  if (blk) {
    band(hd, 0.66, 0.06, 0.48, 2.3, 0x111111, 0.3); // mask
    for (const s of [-1, 1]) hd.box(0.2, 0.08, 0.04, red, s * 0.25, 0.75, 0.64, { ry: s * 0.35 });
  }
  // the jersey: a V-neck with piping, a number front and back, sleeve stripes
  const pipe = blk ? 0xd50000 : PALE;
  for (const s of [-1, 1]) t.box(0.08, 0.6, 0.04, pipe, s * 0.17, 0.78, 0.52, { rz: s * 0.5 });
  t.box(0.04, 1.4, 0.04, pipe, 0, 0.0, 0.52);
  for (const z of [0.52, -0.52]) {
    t.box(0.5, 0.55, 0.02, blk ? 0x212121 : PALE, 0.5 * Math.sign(z), 0.3, z);
    t.box(0.1, 0.4, 0.03, blk ? 0xd50000 : capC, 0.5 * Math.sign(z) + 0.05, 0.25, z, { rz: -0.3 }); // a "7"
    t.box(0.3, 0.08, 0.03, blk ? 0xd50000 : capC, 0.5 * Math.sign(z), 0.47, z);
  }
  if (level >= 2) {
    belt(t, 0x3e2723, 0xbdbdbd);
    pack(t, blk ? 0x212121 : 0x37474f, { w: 1.4, h: 1.55, d: 0.65 });
    // a spare bat poking out of the pack
    t.cyl(0.09, 1.2, 0x8d6e63, -0.45, 1.0, -0.9, { seg: 8, rz: 0.2 });
    t.cyl(0.13, 0.08, 0x8d6e63, -0.57, 1.6, -0.9, { seg: 8, rz: 0.2 });
  }
  if (blk) {
    // a small flag on the pack: a red crossed circle on white
    t.cyl(0.04, 2.6, 0x9e9e9e, 0.5, 1.2, -1.15, { seg: 6 });
    t.box(0.04, 0.8, 1.1, PALE, 0.5, 2.15, -1.72);
    t.torus(0.26, 0.05, 0xd50000, 0.5, 2.15, -1.72, { ry: PI / 2, seg: 16 });
    t.box(0.06, 0.07, 0.6, 0xd50000, 0.5, 2.15, -1.72, { rx: PI / 4 });
  }
  hd.done();
  t.done();
  const gR = level >= 3 ? 0x111111 : 0x0d47a1;
  const gL = 0x0d47a1;
  const extra = (a, s) => {
    if (level >= 1) glove(a, s < 0 ? gR : gL);
    if (level >= 1) a.box(1.08, 0.14, 1.08, pipe, 0, -0.3, 0); // sleeve stripe
  };
  if (level >= 1) hands(h, key, null, tone(shirt, 0.85), extra);
  else sleeves(h, key, shirt, null);
  feet(h, key, blk ? 0x111111 : 0x212121, (b) => {
    b.box(1.07, 0.34, 1.07, blk ? 0x212121 : PALE, 0, -1.3, 0.01, { r: 0.04 }); // socks
    b.box(1.08, 0.08, 1.08, blk ? 0xd50000 : capC, 0, -1.22, 0.01);
    if (level >= 3) kneePad(b, 0x212121);
  });
  const metal = level >= 3;
  const g = held(h, key, 1.0, (k) => bat(k, {
    col: blk ? 0x546e7a : metal ? 0xb0bec5 : 0xa1734a,
    grip: metal ? 0x212121 : 0x6d4c41,
    metal,
    label: blk ? 0xd50000 : 0x1e88e5,
    spikes: level === 2 || blk,
    neon: blk ? red : null,
  }));
  h.muzzles = [];
  muzzle(h, g, -2.9, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  h.leftArm.rotation.set(-0.5, 0, -0.25);
  h.pose = { right: -2.4, left: -0.5, leftRecoil: 0 };
  h.swing = 1.8;
  h.melee = true;
  h.tracer = blk ? 0xff1744 : 0xffffff;
  return own(h, 0);
}

/** A ball cap with a round badge on the front (head space). */
function capBadge(k, col, badge) {
  cap(k, col);
  k.cyl(0.13, 0.04, badge, 0, 1.17, 0.62, { axis: 'z', rx: -0.45, seg: 12 });
}

// ------------------------------------------------------------------ Doctor

/**
 * Doctor: a yellow doctor in a white coat with a head mirror and a silenced pistol. Lv 1 Trained
 * Professional: a stethoscope, Lv 2 Enhanced Medkits: a red cross on the chest, a cape and a
 * medkit on the belt, Lv 3 Medigun: a medigun pack on the back with a hose to a nozzle in the
 * left hand, Lv 4 Crazed Scientist: a black and glowing light-blue outfit, wild white hair and
 * goggles.
 */
export function makeDoctor(level) {
  const dark = level >= 4;
  const coat = dark ? 0x1a1a1a : PALE;
  const h = makeHumanoid({ skin: 0xf5cd30, shirt: coat, pants: dark ? 0x111111 : 0xe0e0e0, arms: coat, face: 'smile' });
  const key = `p23doc${level}`;
  const blue = glowMat(h, 0x4fc3f7);
  const cross = dark ? blue : RED;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (dark) {
    // wild white hair and goggles
    hair(hd, 0xeeeeee, { h: 0.42 });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * PI * 2;
      hd.cyl(0.16, 0.5, 0xeeeeee, Math.sin(a) * 0.55, 1.15, Math.cos(a) * 0.5 - 0.05, { r2: 0.02, seg: 6, rz: -Math.sin(a) * 1.0, rx: Math.cos(a) * 0.9 });
    }
    goggles(hd, 1.12, blue, { r: 0.68, frame: 0x37474f });
  } else hair(hd, 0x5d4037, { h: 0.38 });
  // the head mirror on its band
  hd.torus(0.7, 0.05, dark ? 0x263238 : 0x9e9e9e, 0, 0.98, 0, { rx: PI / 2, seg: 22 });
  hd.cyl(0.27, 0.05, 0xcfd8dc, 0.26, 1.1, 0.7, { axis: 'z', rx: -0.3, seg: 18 });
  hd.torus(0.27, 0.035, dark ? 0x263238 : 0x9e9e9e, 0.26, 1.1, 0.72, { rx: -0.3, seg: 18 });
  hd.cyl(0.06, 0.06, INK, 0.26, 1.1, 0.74, { axis: 'z', rx: -0.3, seg: 8 });
  // the coat over scrubs: lapels, pockets, a pen and a name badge
  t.box(0.55, 1.5, 0.04, dark ? 0x0d47a1 : 0x90caf9, 0, 0.25, 0.51);
  labCoat(t, coat, dark ? blue : null);
  for (const s of [-1, 1]) t.box(0.55, 0.06, 1.04, tone(coat, 0.9), s * 0.75, -0.6, 0, { r: 0.02 });
  pouch(t, -0.55, 0.3, 0.5, 0.42, 0.42, tone(coat, 0.92), 0.05);
  t.cyl(0.03, 0.3, 0x1565c0, -0.45, 0.48, 0.58, { seg: 6 });
  t.box(0.36, 0.16, 0.03, dark ? blue : 0x90caf9, -0.55, 0.72, 0.54);
  belt(t, 0x37474f, 0xb0b0b0);
  if (level >= 1) stethoscope(t);
  if (level >= 2) {
    crossPatch(t, 0.48, 0.4, 0.53, 0.28, dark ? 0x0d47a1 : PALE, cross);
    cape(t, dark ? 0x4fc3f7 : 0xc62828, 3.0, { clasp: GOLD });
    // a medkit on the hip
    t.box(0.55, 0.45, 0.35, PALE, 0.95, -0.95, 0.4, { r: 0.05 });
    t.box(0.3, 0.1, 0.02, RED, 0.95, -0.95, 0.58);
    t.box(0.1, 0.3, 0.02, RED, 0.95, -0.95, 0.58);
  }
  if (level >= 3) {
    // the medigun pack: a tank with a glowing window, valves, and a hose to the nozzle
    const pc = dark ? 0x263238 : 0xb0bec5;
    t.box(1.3, 1.8, 0.75, pc, 0, 0.05, -1.0, { r: 0.12 });
    t.box(0.8, 1.2, 0.06, dark ? blue : glowMat(h, 0xff5252), 0, 0.05, -1.4, { r: 0.04 });
    t.box(0.9, 1.3, 0.04, INK, 0, 0.05, -1.38);
    crossPatch(t, 0, 0.8, -1.42, 0.2, PALE, cross, { ry: PI });
    for (const s of [-1, 1]) {
      t.cyl(0.08, 0.3, STEEL, s * 0.4, 1.05, -1.0, { seg: 8 });
      t.torus(0.12, 0.03, cross, s * 0.4, 1.22, -1.0, { rx: PI / 2, seg: 10 });
      t.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.1);
    }
    t.tube([[0.55, -0.6, -1.3], [1.15, -0.8, -0.8], [1.1, -0.95, 0.0], [1.05, -0.6, 0.3]], 0.07, 0x37474f, { seg: 16, sides: 6 });
  }
  hd.done();
  t.done();
  hands(h, key, dark ? 0x111111 : 0x90caf9, tone(coat, 0.88)); // latex gloves
  feet(h, key, dark ? 0x111111 : 0x3e2723);
  // the silenced pistol
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = pistol(gk, { body: 0x263238, can: true, laser: dark ? blue : null });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  h.rightArm.rotation.set(-PI / 2, 0, 0.05);
  h.leftArm.rotation.set(-0.25, 0, -0.15);
  h.pose = { right: -PI / 2, left: -0.25, leftRecoil: 0 };
  if (level >= 3) {
    // the medigun nozzle in the left hand; the heal beam starts at its tip
    const n = fist(h.leftArm, -1.9, 1.0);
    const nk = wear(h, n, `${key}:nozzle`);
    nk.box(0.22, 0.26, 0.4, INK, 0, 0.05, -0.15, { r: 0.04 });
    nk.cyl(0.16, 0.5, 0xeceff1, 0, -0.3, 0, { seg: 12 });
    for (const yy of [-0.15, -0.45]) nk.torus(0.17, 0.03, cross, 0, yy, 0, { rx: PI / 2, seg: 12 });
    nk.cyl(0.1, 0.4, STEEL, 0, -0.75, 0, { seg: 10, r2: 0.15 });
    nk.ball(0.14, dark ? blue : glowMat(h, 0xff8a80), 0, -1.0, 0, { seg: 10, rows: 7 });
    nk.done();
    h.medi = dark ? 0x4fc3f7 : 0xff8a80;
    h.mediFrom = new THREE.Object3D();
    h.mediFrom.position.set(0, -1.1, 0);
    n.add(h.mediFrom);
    h.leftArm.rotation.set(-1.2, 0, -0.2);
    h.pose.left = -1.2;
  }
  h.tracer = dark ? 0x4fc3f7 : 0xeeeeee;
  return own(h);
}

export const MODELS = {
  boomerangKeith: makeKeith,
  barracksOddport: makeOddport,
  jesterChaos: makeChaosJester,
  paralyzer: makeParalyzer,
  hunter: makeBountyHunter,
  slugger: makeSlugger,
  doctor: makeDoctor,
};
