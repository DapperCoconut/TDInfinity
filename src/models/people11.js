// Tower models: people, batch 11 (dressed with the vehicle kit in ../vehicles.js).
// In here: Rebar Engineer, Hacker (+bottom), Medic, Medigun Medic (+bottom), Commander,
// Classic Commander, DJ.
// Each makeX(level) builds one tower's look; MODELS below is laid over TOWER_MODELS in ../models.js.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.

import * as THREE from 'three';
import { glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import {
  GOLD, GUNMETAL, INK, STEEL, UP, aimLong, band, belt, cap, collar, dome, fist, goggles, hair, kneePad,
  muzzle, own, pack, pistol, pouch, radio, shardOf, wear,
} from './people1.js';
import { beret, shoulderPads, specs } from './people2.js';
import { feet, glassMat, hands, hood, peakedCap } from './people5.js';
import { hardHat } from './people6.js';
import { dish } from './machines1.js';
import { spinner } from './machines5.js';

const PI = Math.PI;
const RED = 0xd32f2f;
const RUST = 0x8d6e63;

// ------------------------------------------------------------------ shared bits for this batch

/** A megaphone on the fist (gun space): pistol grip, body and a wide bell facing forward. */
function megaphone(k, body, bell) {
  const B = UP + 0.1;
  k.box(0.2, 0.24, 0.5, INK, 0, 0.08, UP - 0.32, { rx: -0.3, r: 0.04 }); // grip
  k.torus(0.09, 0.02, INK, 0, -0.12, UP - 0.2, { ry: PI / 2, seg: 10, arc: PI }); // trigger guard
  k.cyl(0.13, 0.25, INK, 0, 0.32, B, { seg: 12 }); // mouthpiece
  k.cyl(0.2, 0.55, body, 0, -0.05, B, { seg: 16, r2: 0.16 });
  k.torus(0.2, 0.03, tone(body, 0.75), 0, -0.3, B, { rx: PI / 2, seg: 16 });
  k.cyl(0.55, 0.65, bell, 0, -0.65, B, { seg: 18, r2: 0.2 }); // bell, wide end forward
  k.torus(0.55, 0.04, tone(bell, 0.7), 0, -0.97, B, { rx: PI / 2, seg: 20 });
  k.cyl(0.48, 0.02, 0x101010, 0, -0.96, B, { seg: 18 });
  k.box(0.12, 0.3, 0.12, tone(body, 0.7), 0, -0.05, B + 0.24, { r: 0.03 }); // switch
}

/** A row of medals on ribbons (torso space, left side of the chest). */
function medals(k, cols, x0 = 0.35, y = 0.42) {
  cols.forEach((c, i) => {
    const x = x0 + i * 0.25;
    k.box(0.18, 0.2, 0.04, c, x, y + 0.14, 0.53);
    k.box(0.06, 0.2, 0.045, tone(c, 0.6), x, y + 0.14, 0.535);
    k.cyl(0.08, 0.04, GOLD, x, y - 0.06, 0.55, { axis: 'z', seg: 10 });
  });
}

/** Gold shoulder boards with a fringe (torso space). */
function epaulettes(k, col, fringe = true) {
  for (const s of [-1, 1]) {
    k.box(0.55, 0.12, 0.9, col, s * 0.78, 1.04, 0, { r: 0.04 });
    k.cyl(0.07, 0.06, tone(col, 0.7), s * 0.62, 1.1, 0.25, { seg: 8 });
    if (fringe) for (let i = 0; i < 6; i++) k.cyl(0.03, 0.3, tone(col, 0.85), s * 1.04, 0.86, -0.36 + i * 0.145, { seg: 5 });
  }
}

/** Binoculars hanging on the chest with a strap (torso space). */
function binoculars(k, col = 0x263238) {
  for (const s of [-1, 1]) {
    k.cyl(0.15, 0.5, col, s * 0.17, 0.42, 0.72, { seg: 12 });
    k.cyl(0.17, 0.12, INK, s * 0.17, 0.12, 0.72, { seg: 12 });
    k.cyl(0.13, 0.02, 0x4fc3f7, s * 0.17, 0.05, 0.72, { seg: 12 });
    k.tube([[s * 0.17, 0.68, 0.72], [s * 0.4, 0.95, 0.55], [s * 0.42, 1.02, 0.1]], 0.025, INK, { seg: 8, sides: 4 });
  }
  k.box(0.18, 0.2, 0.18, tone(col, 0.7), 0, 0.5, 0.72, { r: 0.03 }); // hinge
}

/** Sneakers on both legs: canvas upper, white sole, laces and a toe cap. */
function sneakers(h, key, col, sole = 0xeeeeee) {
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:sneaker`);
    b.box(1.04, 0.42, 1.12, col, 0, -1.74, 0.04, { r: 0.08 });
    b.box(1.08, 0.16, 1.22, sole, 0, -1.93, 0.06, { r: 0.04 });
    b.box(1.0, 0.18, 0.3, sole, 0, -1.82, 0.5, { r: 0.06 }); // toe cap
    for (let i = 0; i < 3; i++) b.box(0.42, 0.04, 0.04, 0xfafafa, 0, -1.6 - i * 0.1, 0.6);
    b.ball(0.05, tone(col, 0.6), 0, -1.6, -0.56, { seg: 6, rows: 4 }); // heel tab
    b.done();
  }
}

/** A medi gun on the fist (gun space): a fat canister body, ribbed rings, a nozzle and a glowing tip. Returns the tip y. */
function mediGun(k, body, trim, tip, o = {}) {
  const B = UP + 0.06;
  const nz = o.nozzle ?? 0.6;
  k.box(0.22, 0.26, 0.5, INK, 0, 0.12, UP - 0.32, { rx: -0.3, r: 0.04 }); // grip
  k.torus(0.09, 0.02, INK, 0, -0.1, UP - 0.2, { ry: PI / 2, seg: 10, arc: PI });
  k.cyl(0.24, 0.3, tone(body, 0.8), 0, 0.35, B, { seg: 16 }); // back cap
  k.cyl(o.r ?? 0.3, 0.9, body, 0, -0.25, B, { seg: 18 }); // canister
  for (const y of [0.1, -0.25, -0.6]) k.torus(o.r ?? 0.3, 0.04, trim, 0, y, B, { rx: PI / 2, seg: 18 });
  k.box(0.32, 0.4, 0.06, trim, 0, -0.25, B + (o.r ?? 0.3) + 0.01); // red badge on top
  k.box(0.1, 0.3, 0.07, 0xfafafa, 0, -0.25, B + (o.r ?? 0.3) + 0.02);
  k.box(0.3, 0.1, 0.07, 0xfafafa, 0, -0.25, B + (o.r ?? 0.3) + 0.02);
  k.cyl(0.12, nz, STEEL, 0, -0.7 - nz / 2, B, { seg: 12, r2: 0.2 }); // nozzle, narrow end forward
  for (let i = 0; i < 3; i++) k.torus(0.15 - i * 0.012, 0.025, INK, 0, -0.8 - i * nz * 0.28, B, { rx: PI / 2, seg: 12 });
  k.cyl(0.16, 0.12, INK, 0, -0.75 - nz, B, { seg: 12 });
  k.ball(0.16, tip, 0, -0.86 - nz, B, { seg: 12, rows: 8 });
  if (o.fins) for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4;
    k.box(0.04, 0.4, 0.2, trim, Math.cos(a) * 0.36, 0.0, B + Math.sin(a) * 0.36, { ry: -a + PI / 2 });
  }
  if (o.antenna) {
    k.cyl(0.03, 0.7, STEEL, 0.2, 0.25, B + 0.55, { seg: 6 });
    k.ball(0.06, tip, 0.2, -0.1, B + 0.55, { seg: 6, rows: 4 });
  }
  return [-0.86 - nz, B];
}

/** A heal-tank backpack: rounded tank, frame, a glowing gauge window and valves (torso space). */
function healTank(k, s, col, light) {
  const z = -0.95;
  k.box(1.3 * s, 0.25, 0.7, INK, 0, -0.85 * s, z + 0.1, { r: 0.05 }); // frame foot
  k.cyl(0.42 * s, 1.5 * s, col, -0.22 * s, 0.05, z, { seg: 16 });
  k.cyl(0.42 * s, 1.5 * s, col, 0.22 * s, 0.05, z, { seg: 16 });
  for (const x of [-0.22, 0.22]) {
    dome(k, 0.42 * s, 0.25 * s, col, x * s, 0.05 + 0.75 * s, z);
    k.torus(0.42 * s, 0.035, INK, x * s, 0.05 + 0.45 * s, z, { rx: PI / 2, seg: 16 });
  }
  k.box(0.5 * s, 0.9 * s, 0.06, light, 0, 0.05, z - 0.42 * s, { r: 0.02 }); // gauge window
  k.box(0.62 * s, 1.02 * s, 0.05, 0x37474f, 0, 0.05, z - 0.4 * s);
  k.cyl(0.08, 0.25, STEEL, 0, 0.3 + 0.85 * s, z, { seg: 8 }); // valve
  k.torus(0.12, 0.03, RED, 0, 0.45 + 0.85 * s, z, { rx: PI / 2, seg: 10 });
  for (const sd of [-1, 1]) {
    k.box(0.24, 0.1, 1.2, INK, sd * 0.5, 1.0, -0.05);
    k.box(0.24, 1.3, 0.06, INK, sd * 0.5, 0.32, 0.53);
  }
}

/** A stethoscope round the neck (torso space). */
function stethoscope(k) {
  for (const s of [-1, 1]) k.tube([[s * 0.42, 1.0, -0.1], [s * 0.5, 0.75, 0.5], [s * 0.3, 0.2, 0.6], [0.1, -0.2, 0.6]], 0.035, 0x37474f, { seg: 16, sides: 5 });
  k.cyl(0.14, 0.06, STEEL, 0.1, -0.3, 0.62, { axis: 'z', seg: 12 });
  k.cyl(0.1, 0.03, 0xcfd8dc, 0.1, -0.3, 0.66, { axis: 'z', seg: 12 });
}

/** A lab coat: long panels to the knees and lapels (torso space). */
function labCoat(k, col, trim) {
  k.slab(2.16, 1.5, 0.14, col, 0, -1.35, -0.58, { bw: 1.1 });
  for (const s of [-1, 1]) {
    k.slab(0.26, 1.5, 1.1, col, s * 1.0, -1.35, 0, { bw: 1.15 });
    k.slab(0.5, 1.5, 0.08, col, s * 0.78, -1.35, 0.56, { bw: 1.1, bx: s * 0.04 }); // front flaps
    k.box(0.26, 1.15, 0.08, tone(col, 0.9), s * 0.62, 0.4, 0.55, { rz: s * 0.25 }); // lapels
    if (trim) k.box(0.06, 2.9, 0.06, trim, s * 1.13, -0.6, 0.5);
  }
}

// ------------------------------------------------------------------ Rebar Engineer

/**
 * Rebar Engineer: a builder in a hard hat and hi-vis vest with a rebar launcher. Lv 1 goggles,
 * Lv 2 a radar dish on a back pole (it turns), Lv 3 a scrap converter backpack, Lv 4 Heavy
 * Construction: steel shoulder plates and knee pads, Lv 5 a blueprint tablet and cyan goggles,
 * Lv 6 a red hat and a red rocket launcher.
 */
export function makeEngineer(level) {
  const heavy = level >= 4;
  const rocket = level >= 6;
  const shirt = heavy ? 0x455a64 : 0x5d6d7e;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x37474f, arms: shirt, face: 'soldier' });
  const key = `engineer${level}`;
  const amber = glowMat(h, level >= 5 ? 0x00e5ff : 0xffab40);
  const lamp = glowMat(h, 0xfff3b0);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x4e342e, { h: 0.38 });
  hardHat(hd, rocket ? 0xd32f2f : 0xfbc02d, lamp);
  if (level >= 1) goggles(hd, 0.76, amber, { r: 0.7 });
  // hi-vis vest: front and back panels, reflective bands, pockets, a pen and a name tag
  collar(t, tone(shirt, 0.85), { buttons: false });
  t.box(2.18, 1.7, 1.16, 0xff6f00, 0, 0.12, 0, { r: 0.12 });
  for (const y of [0.35, -0.3]) t.box(2.22, 0.16, 1.2, 0xe0e0e0, 0, y, 0);
  for (const s of [-1, 1]) t.box(0.16, 0.7, 0.06, 0xe0e0e0, s * 0.55, 0.75, 0.6);
  t.box(0.05, 1.6, 0.05, 0xbf5600, 0, 0.12, 0.6); // zip
  pouch(t, -0.55, -0.05, 0.58, 0.45, 0.35, 0xe65100, 0.08);
  t.cyl(0.035, 0.35, 0x1565c0, -0.45, 0.05, 0.66, { seg: 6 });
  t.box(0.4, 0.18, 0.04, 0xfafafa, 0.5, 0.0, 0.61);
  // tool belt: wrench, hammer, tape measure
  belt(t, 0x5d4037, 0xb0b0b0);
  pouch(t, 0.7, -1.02, 0.55, 0.45, 0.42, 0x6d4c41, 0.2);
  t.box(0.1, 0.6, 0.06, STEEL, 0.95, -1.15, 0.5, { rz: 0.15 }); // wrench
  t.torus(0.1, 0.035, STEEL, 0.99, -0.83, 0.5, { seg: 10, arc: PI * 1.5 });
  t.cyl(0.05, 0.6, 0x8d6e63, -0.95, -1.15, 0.45, { seg: 6 }); // hammer
  t.box(0.32, 0.12, 0.12, STEEL, -0.95, -0.85, 0.45, { r: 0.03 });
  t.cyl(0.16, 0.12, 0xfdd835, -0.4, -1.05, 0.58, { axis: 'z', seg: 12 }); // tape measure
  if (level >= 3) {
    // Auto Converter: a scrap machine on the back, a hopper on top, a gear and a glowing window
    const z = -0.95;
    t.box(1.5, 1.6, 0.8, 0x6d4c41, 0.15, -0.05, z, { r: 0.1 });
    t.box(1.56, 0.12, 0.84, INK, 0.15, 0.5, z);
    t.cyl(0.22, 0.45, STEEL, 0.4, 0.95, z, { seg: 12, r2: 0.45 }); // hopper
    t.box(0.5, 0.4, 0.06, glowMat(h, 0x76ff03), 0.15, 0.0, z - 0.42, { r: 0.03 });
    t.box(0.62, 0.5, 0.04, INK, 0.15, 0.0, z - 0.41);
    t.cyl(0.3, 0.08, STEEL, 0.95, -0.4, z, { axis: 'x', seg: 14 }); // gear
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      t.box(0.08, 0.12, 0.12, STEEL, 0.95, -0.4 + Math.sin(a) * 0.33, z + Math.cos(a) * 0.33, { rx: a });
    }
    t.cyl(0.1, 0.6, 0x424242, -0.45, 0.95, z - 0.1, { seg: 10 }); // exhaust
    t.cyl(0.13, 0.08, INK, -0.45, 1.28, z - 0.1, { seg: 10 });
    for (let i = 0; i < 4; i++) t.cyl(0.04, 0.03, INK, -0.35 + i * 0.3, -0.7, z - 0.41, { axis: 'z', seg: 6 }); // rivets
  }
  if (level >= 2) {
    // Makeshift Radar: a pole up the back with a dish on top that turns
    t.cyl(0.07, 2.3, STEEL, -0.75, 1.65, -0.8, { seg: 8 });
    t.box(0.3, 0.25, 0.3, INK, -0.75, 0.55, -0.8, { r: 0.04 }); // clamp
    t.cyl(0.11, 0.18, INK, -0.75, 2.8, -0.8, { seg: 10 });
  }
  if (heavy) {
    shoulderPads(t, 0x607d8b, 0.62);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) t.cyl(0.04, 0.03, INK, s * (1.25 + i * 0.15), 1.24, 0.2, { seg: 6 }); // bolts
  }
  hd.done();
  t.done();
  if (level >= 2) {
    const sp = spinner(h, h.torso, -0.75, 2.87, -0.8);
    dish(h, sp, `p1:${key}:dish`, 0, 0.1, 0, 0.6, 0xbdbdbd, glowMat(h, 0xff1744));
    h.idleSpin = 1.2;
  }
  hands(h, key, 0x8d6e63, tone(shirt, 0.8), (a, s) => {
    if (level >= 5 && s > 0) {
      // Improved Blueprints: a glowing tablet strapped to the left forearm
      a.box(0.18, 0.9, 1.1, 0x263238, 0.56, -1.3, 0.1, { r: 0.04 });
      a.box(0.04, 0.75, 0.95, glowMat(h, 0x40c4ff), 0.66, -1.3, 0.1);
      for (const y of [-1.1, -1.3, -1.5]) a.box(0.03, 0.03, 0.7, 0xe1f5fe, 0.69, y, 0.1);
    }
  });
  feet(h, key, 0x6d4c41, heavy ? (b) => kneePad(b, 0x607d8b) : (b) => b.box(1.08, 0.08, 1.1, 0xfbc02d, 0, -1.4, 0.02));
  // the launcher
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const B = UP + 0.05;
  gk.box(0.22, 0.26, 0.5, INK, 0, 0.1, UP - 0.34, { rx: -0.3, r: 0.04 }); // grip
  gk.torus(0.1, 0.022, INK, 0, -0.14, UP - 0.22, { ry: PI / 2, seg: 10, arc: PI });
  let len;
  if (rocket) {
    // Illegal Gun Parts: a fat red rocket tube with a sight and a warhead peeking out
    len = 2.3;
    gk.cyl(0.32, 2.4, 0xb71c1c, 0, -0.75, B + 0.1, { seg: 18 });
    for (const y of [0.35, -0.6, -1.9]) gk.cyl(0.35, 0.12, INK, 0, y, B + 0.1, { seg: 18 });
    gk.cyl(0.36, 0.25, 0x7f0000, 0, 0.5, B + 0.1, { seg: 18, r2: 0.42 }); // back flare
    gk.cyl(0.18, 0.4, 0x9e9e9e, 0, -2.1, B + 0.1, { seg: 14, r2: 0.28 }); // warhead, tip forward
    gk.box(0.14, 0.35, 0.3, INK, 0, -0.3, B + 0.5, { r: 0.03 }); // sight
    gk.cyl(0.07, 0.02, glowMat(h, 0xff3d00), 0, -0.48, B + 0.58, { seg: 8 });
    gk.box(0.2, 0.22, 0.45, INK, 0, -1.0, UP - 0.25, { r: 0.04 }); // front grip
    for (const s of [-1, 1]) gk.box(0.04, 0.3, 0.12, 0xffeb3b, s * 0.33, -1.3, B + 0.1); // warning stripes
  } else {
    // rebar launcher: a riveted receiver, a square barrel and a rack of rebar on top
    len = 1.9;
    gk.box(0.5, 0.85, 0.55, 0x424242, 0, -0.3, B, { r: 0.06 });
    for (const s of [-1, 1]) for (const y of [-0.05, -0.55]) gk.cyl(0.04, 0.03, STEEL, s * 0.26, y, B + 0.15, { axis: 'x', seg: 6 });
    gk.box(0.28, len - 0.7, 0.28, 0x616161, 0, -0.7 - (len - 0.7) / 2, B, { r: 0.03 }); // square barrel
    gk.box(0.34, 0.12, 0.34, INK, 0, -len + 0.06, B);
    gk.box(0.1, 0.4, 0.1, RUST, 0, -len - 0.15, B); // rebar tip
    for (let i = 0; i < 3; i++) gk.box(0.13, 0.03, 0.13, tone(RUST, 0.7), 0, -len - 0.02 - i * 0.12, B);
    for (const x of [-0.12, 0, 0.12]) gk.cyl(0.04, 1.2, RUST, x, -0.4, B + 0.38, { seg: 6 }); // spare rebar
    gk.box(0.45, 0.1, 0.12, INK, 0, 0.05, B + 0.35);
    gk.box(0.45, 0.1, 0.12, INK, 0, -0.8, B + 0.35);
    gk.slab(0.3, 0.6, 0.36, 0x5d4037, 0, 0.45, UP - 0.05, { td: 1.4 }); // stock
    gk.box(0.18, 0.2, 0.42, INK, 0, -0.9, UP - 0.25, { r: 0.04 });
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, rocket ? -2.35 : -len - 0.3, B + (rocket ? 0.1 : 0));
  aimLong(h);
  h.tracer = rocket ? 0xff7043 : 0xa1887f;
  h.flight = rocket ? { color: 0xff7043, size: 0.8, arc: 0.6 } : { color: 0x8d6e63, size: 0.7, arc: 0.4, long: true };
  return own(h);
}

// ------------------------------------------------------------------ Hacker

/**
 * Hacker: a hoodie with the hood up, hacking from a smartphone. Lv 1 headphones, Lv 2 a
 * glowing visor, Lv 3 a wrist gadget (the other hand keeps a phone), Lv 4 Botnet: a server
 * pack with blinking lights and an antenna. Top Lv 5: a violet overclocked gadget with two
 * spinning rings. Bottom Lv 5 Mainframe: an open laptop held in both hands.
 */
export function makeHacker(level, bottom = false) {
  const top = level >= 5 && !bottom;
  const laptop = level >= 5 && bottom;
  const code = top ? 0xd500f9 : 0x00e676;
  const hoodie = top ? 0x1a0033 : laptop ? 0x102027 : 0x263238;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: hoodie, pants: 0x1c2a3a, arms: hoodie, face: 'soldier' });
  const key = `hacker${bottom ? 'B' : 'T'}${level}`;
  const cg = glowMat(h, code);
  const red = glowMat(h, 0xff1744);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hood(hd, hoodie);
  if (level >= 1) {
    // Signal Booster: big headphones over the hood
    hd.torus(0.86, 0.06, 0x111111, 0, 0.72, 0, { arc: PI, seg: 16 });
    for (const s of [-1, 1]) {
      hd.cyl(0.3, 0.2, 0x111111, s * 0.88, 0.7, 0, { axis: 'x', seg: 14 });
      hd.cyl(0.18, 0.03, cg, s * 0.99, 0.7, 0, { axis: 'x', seg: 12 });
    }
  }
  if (level >= 2) {
    // 1337 Skills: a glowing visor
    band(hd, 0.7, 0.05, 0.24, 1.9, cg, 0.72);
    band(hd, 0.67, 0.07, 0.34, 2.1, 0x111111, 0.68);
  }
  // hoodie: front pocket, zip, drawstrings, a logo
  t.box(1.3, 0.55, 0.08, tone(hoodie, 1.2), 0, -0.55, 0.53, { r: 0.03 });
  t.box(1.32, 0.05, 0.1, tone(hoodie, 0.7), 0, -0.28, 0.54);
  t.box(0.04, 1.2, 0.06, 0x9e9e9e, 0, 0.3, 0.53);
  for (const s of [-1, 1]) {
    t.cyl(0.03, 0.6, 0xbdbdbd, s * 0.3, 0.55, 0.56, { seg: 5 });
    t.ball(0.05, 0x9e9e9e, s * 0.3, 0.24, 0.56, { seg: 6, rows: 4 });
  }
  t.box(0.32, 0.32, 0.03, cg, -0.5, 0.45, 0.52); // logo
  t.box(2.1, 0.22, 1.1, tone(hoodie, 0.85), 0, -0.9, 0, { r: 0.06 }); // hem band
  if (level >= 4) {
    // Botnet: a server pack with drive slots, blinking lights and an antenna
    const z = -0.92;
    t.box(1.5, 1.8, 0.75, 0x37474f, 0, 0.0, z, { r: 0.08 });
    for (let i = 0; i < 4; i++) {
      const y = 0.6 - i * 0.4;
      t.box(1.2, 0.26, 0.05, 0x212121, 0, y, z - 0.39);
      t.box(0.7, 0.05, 0.04, cg, -0.15, y, z - 0.42);
      t.cyl(0.05, 0.03, i % 2 ? red : cg, 0.45, y, z - 0.42, { axis: 'z', seg: 6 });
    }
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) t.box(0.04, 0.05, 0.6, INK, s * 0.76, -0.6 + i * 0.25, z); // vents
    t.cyl(0.05, 1.8, STEEL, 0.55, 1.75, z, { seg: 6 });
    t.cyl(0.1, 0.15, INK, 0.55, 0.9, z, { seg: 8 });
    t.ball(0.13, red, 0.55, 2.68, z, { seg: 8, rows: 6 });
    t.tube([[-0.5, -0.8, z + 0.35], [-0.95, -0.85, -0.2], [-1.1, -0.6, 0.3]], 0.04, INK, { seg: 10, sides: 5 }); // cable
    for (const s of [-1, 1]) {
      t.box(0.22, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
      t.box(0.22, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
    }
  }
  hd.done();
  t.done();
  hands(h, key, null, tone(hoodie, 0.75));
  sneakers(h, key, top ? 0x4a148c : 0x263238);
  const phone = (arm, k2) => {
    const pg = fist(arm, -2.05, 1);
    const pk = wear(h, pg, `${key}:${k2}`);
    pk.box(0.55, 0.12, 0.95, 0x111111, 0, 0, 0.35, { r: 0.04 });
    pk.box(0.47, 0.04, 0.82, cg, 0, 0.07, 0.35);
    pk.box(0.14, 0.03, 0.04, 0x37474f, 0, 0.09, 0.75);
    pk.done();
    return pg;
  };
  h.muzzles = [];
  if (laptop) {
    // Mainframe: an open laptop held out in front with both hands
    h.rightArm.rotation.set(-1.2, 0, 0.35);
    h.leftArm.rotation.set(-1.2, 0, -0.35);
    h.pose = { right: -1.2, left: -1.2, leftRecoil: 0.05 };
    const lap = new THREE.Group();
    lap.position.set(0, 2.7, 1.9);
    h.body.add(lap);
    const k = wear(h, lap, `${key}:laptop`);
    k.box(2.2, 0.12, 1.5, 0x455a64, 0, 0, 0, { r: 0.04 }); // base
    k.box(2.0, 0.03, 0.85, 0x111111, 0, 0.07, 0.2);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) k.box(0.14, 0.03, 0.14, 0x263238, -0.85 + c * 0.19, 0.09, -0.08 + r * 0.19); // keys
    k.box(0.6, 0.02, 0.35, 0x37474f, 0, 0.07, 0.56); // touchpad
    k.done();
    const lid = new THREE.Group();
    lid.position.set(0, 0.06, -0.72);
    lid.rotation.x = -0.25;
    lap.add(lid);
    const lk = wear(h, lid, `${key}:lid`);
    lk.box(2.2, 1.4, 0.1, 0x455a64, 0, 0.7, 0, { r: 0.04 });
    lk.box(2.0, 1.2, 0.03, cg, 0, 0.7, 0.06);
    for (let i = 0; i < 6; i++) lk.box(0.4 + ((i * 37) % 9) * 0.12, 0.05, 0.02, 0x003300, -0.85 + (((i * 37) % 9) * 0.06), 1.15 - i * 0.16, 0.08); // code lines
    lk.ball(0.12, 0xeceff1, 0, 0.7, -0.07, { seg: 10, rows: 6, sz: 0.3 }); // logo
    lk.done();
    muzzle(h, lap, 0.9, -0.5, 0);
  } else {
    h.rightArm.rotation.set(-1.25, 0, 0.15);
    h.leftArm.rotation.set(-0.9, 0, -0.45);
    h.pose = { right: -1.25, left: -0.9, leftRecoil: 0.05 };
    if (level < 3) {
      phone(h.rightArm, 'phoneR');
      muzzle(h, h.rightArm, -2.1, 0.9, 0);
    } else {
      // Hologram Projector: a gadget on the right wrist with a screen and an emitter
      const big = top ? 1.25 : 1;
      const ak = wear(h, h.rightArm, `${key}:gadget`);
      ak.box(1.15 * big, 0.7, 1.15 * big, top ? 0x311b92 : 0x37474f, 0, -1.3, 0, { r: 0.1 });
      ak.box(0.7, 0.04, 0.5, cg, 0, -1.3, 0.58 * big + 0.01, { rx: PI / 2 });
      for (const s of [-1, 1]) ak.box(0.06, 0.5, 0.06, cg, s * 0.58 * big, -1.3, 0.3);
      ak.cyl(0.18, 0.3, INK, 0, -1.45, 0.45, { seg: 10 });
      ak.ball(0.15, cg, 0, -1.55, 0.6, { seg: 10, rows: 6 }); // emitter (kept above the hand so the rig sees no held thing)
      ak.done();
      if (top) {
        // Overclocked Uplink: two glowing rings that spin round the forearm
        for (const y of [-0.85, -1.6]) {
          const sp = spinner(h, h.rightArm, 0, y, 0);
          const rk = wear(h, sp, `${key}:ring${y}`);
          rk.torus(0.85, 0.05, cg, 0, 0, 0, { rx: PI / 2, seg: 24 });
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * PI * 2;
            rk.box(0.16, 0.1, 0.16, cg, Math.cos(a) * 0.85, 0, Math.sin(a) * 0.85);
          }
          rk.done();
        }
        h.idleSpin = 2;
      }
      phone(h.leftArm, 'phoneL');
      muzzle(h, h.rightArm, -2.2, 0.45, 0);
    }
  }
  h.tracer = code;
  return own(h, 0);
}
export const makeHackerBottom = (level) => makeHacker(level, true);

// ------------------------------------------------------------------ Medic

/**
 * Medic: a field medic in a white coat with a medi gun. Lv 1 Prescribed Vitamins: a red med bag
 * on a strap, Lv 2 BIG BRAIN: a glass dome over a glowing brain, Lv 3 Medical Pack: a heal tank
 * on the back, Lv 4 MD-PhD: navy trousers, gold trim and round glasses.
 */
export function makeMedic(level) {
  const doc = level >= 4;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: 0xfafafa, pants: doc ? 0x1a237e : 0x546e7a, arms: 0xfafafa, face: 'smile' });
  const key = `medic${level}`;
  const pink = glowMat(h, 0xff8a80);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (level >= 2) hair(hd, 0x6d4c41, { h: 0.36 }); // under the cap it would poke through
  if (level >= 2) {
    // BIG BRAIN: a headset with a glass dome and a glowing brain
    hd.torus(0.72, 0.05, 0x212121, 0, 0.95, 0, { rx: PI / 2, seg: 22 });
    dome(hd, 0.66, 0.66, glassMat(h, 0xe1f5fe, 0.35), 0, 1.15, 0, { seg: 18, rows: 8 });
    hd.ball(0.42, glowMat(h, 0xff4081), 0, 1.38, 0, { seg: 14, rows: 9, sy: 0.75 });
    for (const s of [-1, 1]) hd.box(0.03, 0.18, 0.7, glowMat(h, 0xf50057), s * 0.03, 1.62, 0, { r: 0.01 }); // brain fold
    for (const s of [-1, 1]) {
      hd.cyl(0.2, 0.14, 0x212121, s * 0.68, 0.7, 0, { axis: 'x', seg: 12 });
      hd.cyl(0.04, 0.3, STEEL, s * 0.68, 1.0, 0, { seg: 6 });
    }
  } else {
    // a white medic cap with a red cross
    hd.cyl(0.7, 0.45, 0xfafafa, 0, 1.1, 0, { seg: 20, r2: 0.66 });
    hd.cyl(0.71, 0.08, 0xe0e0e0, 0, 0.92, 0, { seg: 20 });
    hd.box(0.36, 0.1, 0.04, RED, 0, 1.15, 0.69, { rx: 0.08 });
    hd.box(0.1, 0.36, 0.04, RED, 0, 1.15, 0.69, { rx: 0.08 });
  }
  if (doc) specs(hd, GOLD, glassMat(h, 0xb3e5fc, 0.4));
  // the coat: red cross on the chest, pockets with pens, a stethoscope
  collar(t, 0xeeeeee);
  labCoat(t, 0xfafafa, doc ? GOLD : null);
  t.box(0.6, 0.18, 0.05, RED, 0.45, 0.45, 0.53);
  t.box(0.18, 0.6, 0.05, RED, 0.45, 0.45, 0.53);
  pouch(t, -0.5, 0.35, 0.5, 0.45, 0.4, 0xeeeeee, 0.06);
  for (const [x, c] of [[-0.6, 0x1565c0], [-0.45, RED]]) t.cyl(0.035, 0.35, c, x, 0.6, 0.58, { seg: 6 });
  stethoscope(t);
  belt(t, 0x546e7a, 0xb0b0b0);
  if (level >= 1) {
    // Prescribed Vitamins: a red med bag on a strap over the shoulder
    t.box(0.2, 2.45, 1.14, 0x5d4037, 0, 0.1, 0, { rz: 0.6 });
    t.box(0.65, 0.75, 0.9, 0xc62828, -1.25, -0.85, 0, { r: 0.1 });
    t.box(0.68, 0.22, 0.94, 0xb71c1c, -1.25, -0.55, 0, { r: 0.05 });
    t.box(0.04, 0.4, 0.14, 0xfafafa, -1.6, -0.9, 0);
    t.box(0.04, 0.14, 0.4, 0xfafafa, -1.6, -0.9, 0);
    t.cyl(0.08, 0.14, 0xfdd835, -1.1, -0.3, 0.2, { seg: 8 }); // pill bottle cap
    t.cyl(0.08, 0.25, 0xff7043, -1.1, -0.45, 0.2, { seg: 8 });
  }
  if (level >= 3) healTank(t, 1, 0xb0bec5, glowMat(h, 0xff5252));
  hd.done();
  t.done();
  hands(h, key, 0x81d4fa, 0xeeeeee); // blue exam gloves
  feet(h, key, doc ? 0x212121 : 0x455a64);
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = mediGun(gk, 0xeceff1, RED, pink, { nozzle: 0.5 + level * 0.06, r: 0.26 + level * 0.01 });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.medi = 0xff8a80;
  h.tracer = 0xff8a80;
  return own(h);
}

// ------------------------------------------------------------------ Medigun Medic

/**
 * Medigun Medic (alternate Medic form): a battle medic in a red coat with round glasses, a heal
 * tank and a medigun. Top path: the tank grows each level, Lv 2 a hose, Lv 4 Uber Charge glows
 * blue, Lv 5 Max Uber adds a halo that turns. Bottom path: a longer nozzle, Lv 3 an antenna,
 * Lv 4 Damage Charge glows red. A purple Dimension Shard emblem marks it.
 */
export function makeMedicBeam(level, bottom = false) {
  const charged = level >= 4;
  const coat = 0xb71c1c;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: coat, pants: 0x37474f, arms: 0xfafafa, face: 'smile' });
  const key = `medicBeam${bottom ? 'B' : 'T'}${level}`;
  const accent = charged ? (bottom ? 0xff1744 : 0x448aff) : 0xff8a80;
  const glow = glowMat(h, accent);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // slicked-back hair and round glasses
  hair(hd, 0x3e2723, { h: 0.42 });
  hd.box(0.9, 0.1, 0.5, 0x2a1a14, 0, 1.36, 0.1, { r: 0.04, rx: -0.2 });
  specs(hd, 0x90a4ae, glassMat(h, 0xe3f2fd, 0.45));
  // the coat: a white cross, double buttons, a long back, the shard emblem
  collar(t, 0x8e0000, { buttons: false });
  labCoat(t, coat, charged ? glow : null);
  t.box(0.6, 0.18, 0.05, 0xfafafa, 0.45, 0.45, 0.53);
  t.box(0.18, 0.6, 0.05, 0xfafafa, 0.45, 0.45, 0.53);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) t.cyl(0.05, 0.03, 0x212121, s * 0.22, 0.2 - i * 0.38, 0.53, { axis: 'z', seg: 8 });
  t.box(0.34, 0.34, 0.04, shardOf(h), -0.5, 0.45, 0.53, { rz: PI / 4 }); // Dimension Shard emblem
  belt(t, 0x212121, 0xb0b0b0);
  pouch(t, 0.7, -1.0, 0.55, 0.4, 0.4, 0x8e0000, 0.18);
  // the tank: bigger each level on the Top path
  const s = !bottom ? [1, 1.06, 1.12, 1.2, 1.3, 1.4][level] ?? 1.4 : 1;
  healTank(t, s, 0x78909c, glow);
  if (level >= 2) t.tube([[0.4, -0.5, -1.0], [1.0, -0.8, -0.6], [1.15, -0.95, 0.1], [1.05, -1.0, 0.5]], 0.07, 0x212121, { seg: 14, sides: 6 }); // hose
  if (bottom && level >= 3) {
    // Longer Range: an antenna on the tank
    t.cyl(0.05, 2.2, STEEL, -0.45, 1.9, -0.95, { seg: 6 });
    for (const y of [1.2, 1.9, 2.6]) t.cyl(0.12, 0.04, STEEL, -0.45, y, -0.95, { seg: 8 });
    t.ball(0.14, glow, -0.45, 3.05, -0.95, { seg: 8, rows: 6 });
  }
  hd.done();
  t.done();
  if (!bottom && level >= 5) {
    // Max Uber: a halo of light that turns over the head
    const halo = spinner(h, h.head, 0, 1.75, 0);
    const k = wear(h, halo, `${key}:halo`);
    k.torus(0.75, 0.06, glowMat(h, 0x82b1ff), 0, 0, 0, { rx: PI / 2, seg: 28 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      k.ball(0.09, glowMat(h, 0xe3f2fd), Math.cos(a) * 0.75, 0, Math.sin(a) * 0.75, { seg: 6, rows: 4 });
    }
    k.done();
    h.idleSpin = 1;
  }
  hands(h, key, 0x212121, 0xeeeeee);
  feet(h, key, 0x212121);
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = mediGun(gk, 0xeceff1, 0xc62828, glow, {
    nozzle: bottom ? 0.6 + level * 0.14 : 0.6, r: !bottom ? 0.3 + level * 0.02 : 0.3, fins: !bottom && level >= 3, antenna: bottom && level >= 3,
  });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.medi = 0xff8a80;
  h.tracer = 0xff8a80;
  return own(h);
}
export const makeMedicBeamBottom = (level) => makeMedicBeam(level, true);

// ------------------------------------------------------------------ Commander

/**
 * Commander: an officer with a peaked cap, gold shoulder boards and a pistol. Lv 1 Drilling: long
 * coat tails and two medals, Lv 2 Call to Arms: a megaphone in the left hand, Lv 3 Organized
 * Militia: a radio pack, Lv 4 Airstrike: a white dress uniform, a gold belt and a gold pistol.
 */
export function makeCommander(level) {
  const gold = level >= 4;
  const coat = gold ? 0xfafafa : 0x33691e;
  const h = makeHumanoid({ skin: 0xc68642, shirt: coat, pants: gold ? 0x1a237e : 0x263238, arms: coat, face: 'soldier' });
  h.body.scale.setScalar(1.05);
  const key = `commander${level}`;
  const badge = gold ? glowMat(h, 0xffd54f) : GOLD;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x1a1209, { h: 0.36 });
  peakedCap(hd, 0x1b5e20, 0x111111, badge);
  // the uniform: tunic front, buttons, belt and shoulder boards
  collar(t, tone(coat, 0.85), { buttons: false });
  for (let i = 0; i < 4; i++) t.cyl(0.06, 0.04, GOLD, 0, 0.55 - i * 0.38, 0.54, { axis: 'z', seg: 8 });
  for (const s of [-1, 1]) pouch(t, s * 0.52, 0.3, 0.5, 0.48, 0.42, tone(coat, 0.9), 0.06);
  epaulettes(t, 0xffd54f);
  if (level >= 1) {
    // Drilling: long coat tails and medals
    t.slab(2.1, 1.5, 0.14, tone(coat, gold ? 0.95 : 0.9), 0, -1.6, -0.5, { bw: 1.05 });
    medals(t, [0xe53935, 0x1e88e5]);
  }
  if (gold) {
    // Airstrike: gold belt, a braided cord across the chest
    t.box(2.12, 0.28, 1.12, GOLD, 0, -0.85, 0, { r: 0.04 });
    t.box(0.4, 0.3, 0.06, tone(GOLD, 0.8), 0, -0.85, 0.57, { r: 0.03 });
    t.tube([[-0.9, 0.95, 0.4], [-0.75, 0.4, 0.6], [-0.3, 0.2, 0.6], [-0.55, 0.65, 0.6], [-0.9, 0.95, 0.4]], 0.035, GOLD, { seg: 20, sides: 5 });
    t.box(0.3, 0.04, 0.05, 0x1a237e, 0.45, 0.85, 0.55);
  } else belt(t, 0x3e2723, GOLD);
  t.box(0.24, 0.5, 0.36, 0x3e2723, -0.85, -1.05, 0.25, { r: 0.05 }); // holster
  if (level >= 3) {
    // Organized Militia: a radio pack with a long antenna
    pack(t, 0x4b5320, { w: 1.3, h: 1.4 });
    radio(t, 0.35, 0.45, -1.3, 0x4b5320, 2.0);
  }
  hd.done();
  t.done();
  hands(h, key, gold ? 0xfafafa : 0x3e2723, tone(coat, 0.8));
  feet(h, key, 0x1a1a1a, (b) => b.box(1.1, 0.06, 1.12, 0x0d0d0d, 0, -1.34, 0.02));
  if (level >= 2) {
    // Call to Arms: a megaphone in the left hand
    const mg = fist(h.leftArm, -1.9, 1.1);
    const mk = wear(h, mg, `${key}:mega`);
    megaphone(mk, 0xfafafa, 0xe53935);
    mk.done();
  }
  const g = fist(h.rightArm, -1.9, 1.3);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = pistol(gk, { body: gold ? GOLD : GUNMETAL, grip: gold ? 0xfff8e1 : 0x3e2723, trim: gold ? 0xfff176 : null });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  h.rightArm.rotation.set(-PI / 2, 0, 0.05);
  h.leftArm.rotation.set(level >= 2 ? -2.4 : -0.2, 0, -0.1);
  h.pose = { right: -PI / 2, left: level >= 2 ? -2.4 : -0.2, leftRecoil: 0 };
  h.tracer = gold ? 0xffd54f : 0xffe066;
  return own(h, 0.3);
}

// ------------------------------------------------------------------ Classic Commander

/**
 * Classic Commander: a field officer in a red beret and a khaki jacket. Lv 1 Leadership:
 * binoculars on the chest, Lv 2 Call to Arms: a yellow megaphone, Lv 3 Intense Training: three
 * medals and a map case, Lv 4 Strength in Numbers: a radio pack with a red light.
 */
export function makeCommanderClassic(level) {
  const coat = 0x7a6a45;
  const h = makeHumanoid({ skin: 0x8d5524, shirt: coat, pants: 0x4b4129, arms: coat, face: 'soldier' });
  h.body.scale.setScalar(1.05);
  const key = `commanderClassic${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x1a1209, { h: 0.34 });
  beret(hd, 0x8e0000, GOLD);
  hd.box(0.7, 0.14, 0.12, 0x1a1209, 0, 0.35, 0.6, { r: 0.04 }); // moustache
  // field jacket: collar, pockets, shoulder straps, sleeve rolls
  collar(t, tone(coat, 0.85));
  for (const s of [-1, 1]) {
    pouch(t, s * 0.52, 0.3, 0.5, 0.5, 0.45, tone(coat, 0.9), 0.06);
    pouch(t, s * 0.55, -0.45, 0.5, 0.55, 0.45, tone(coat, 0.9), 0.08);
    t.box(0.3, 0.08, 0.9, tone(coat, 0.8), s * 0.75, 1.04, 0, { r: 0.02 });
    t.cyl(0.05, 0.03, GOLD, s * 0.62, 1.09, 0.3, { seg: 6 });
  }
  belt(t, 0x3e2723, 0xb08d57);
  t.box(0.25, 2.4, 1.12, 0x3e2723, 0, 0.0, 0, { rz: -0.6 }); // Sam Browne strap
  t.box(0.26, 0.5, 0.36, 0x3e2723, -0.85, -1.05, 0.25, { r: 0.05 }); // holster
  if (level >= 1) binoculars(t);
  if (level >= 3) {
    medals(t, [0xe53935, 0x43a047, 0xfdd835], 0.3, 0.75);
    // a map case on the hip
    t.box(0.12, 0.7, 0.6, 0x5d4037, 1.12, -0.8, 0.1, { r: 0.03 });
    t.box(0.04, 0.5, 0.45, 0xfff8e1, 1.19, -0.75, 0.1);
  }
  if (level >= 4) {
    // Strength in Numbers: a radio pack to call the caravan
    pack(t, 0x4b5320, { w: 1.3, h: 1.4, roll: 0x6d6045 });
    radio(t, -0.4, 0.4, -1.3, 0x4b5320, 2.0);
    t.ball(0.12, glowMat(h, 0xff1744), -0.22, 2.75, -1.3, { seg: 8, rows: 6 });
  }
  hd.done();
  t.done();
  hands(h, key, null, tone(coat, 0.8), (a) => a.box(1.08, 0.26, 1.08, tone(coat, 0.9), 0, -1.0, 0, { r: 0.05 })); // rolled sleeves
  feet(h, key, 0x3e2723);
  if (level >= 2) {
    const mg = fist(h.leftArm, -1.9, 1.1);
    const mk = wear(h, mg, `${key}:mega`);
    megaphone(mk, 0x212121, 0xfdd835);
    mk.done();
  }
  const g = fist(h.rightArm, -1.9, 1.3);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = pistol(gk, { body: 0x3a3a3a, grip: 0x6d4c41, len: 1.05 });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  h.rightArm.rotation.set(-PI / 2, 0, 0.05);
  h.leftArm.rotation.set(level >= 2 ? -2.4 : -0.2, 0, -0.1);
  h.pose = { right: -PI / 2, left: level >= 2 ? -2.4 : -0.2, leftRecoil: 0 };
  h.tracer = 0xffe066;
  return own(h, 0.3);
}

// ------------------------------------------------------------------ DJ

/**
 * DJ: a DJ in big headphones and a yellow cap behind a booth with two turntables that spin.
 * The speaker stacks grow each level. Lv 2 Thrifty: a glowing "$" sign and gold tweeters, Lv 4
 * Apocalypse Rave: a purple shirt and a truss of coloured party lights behind the booth.
 */
export function makeDJ(level) {
  const rave = level >= 4;
  const shirt = rave ? 0x6a1b9a : 0xfafafa;
  const h = makeHumanoid({ skin: 0x8d5524, shirt, pants: 0x212121, arms: 0x8d5524, face: 'smile' });
  const key = `dj${level}`;
  const neon = glowMat(h, rave ? 0xe040fb : 0x00e5ff);
  const cupCol = rave ? 0xe040fb : 0x1e88e5;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  cap(hd, 0xffeb3b, { peak: 0xfbc02d });
  // big headphones over the cap
  hd.torus(0.82, 0.07, 0x212121, 0, 0.7, 0, { arc: PI, seg: 18 });
  for (const s of [-1, 1]) {
    hd.cyl(0.36, 0.26, 0x212121, s * 0.8, 0.68, 0, { axis: 'x', seg: 16 });
    hd.cyl(0.26, 0.04, cupCol, s * 0.95, 0.68, 0, { axis: 'x', seg: 14 });
  }
  // a t-shirt with a print and a chain
  t.box(2.1, 0.22, 1.1, tone(shirt, 0.9), 0, -0.9, 0, { r: 0.06 });
  t.cyl(0.38, 0.03, rave ? 0x00e5ff : 0x212121, 0, 0.25, 0.52, { axis: 'z', seg: 18 }); // record print
  t.cyl(0.12, 0.035, rave ? 0xffeb3b : 0xe53935, 0, 0.25, 0.53, { axis: 'z', seg: 12 });
  t.tube([[-0.45, 0.95, 0.35], [-0.3, 0.3, 0.6], [0, 0.0, 0.62], [0.3, 0.3, 0.6], [0.45, 0.95, 0.35]], 0.03, GOLD, { seg: 18, sides: 5 });
  t.box(0.22, 0.22, 0.06, GOLD, 0, -0.08, 0.63, { r: 0.03 });
  hd.done();
  t.done();
  hands(h, key, null, shirt, (a, s) => {
    a.box(1.08, 0.7, 1.08, shirt, 0, -0.35, 0, { r: 0.05 }); // short sleeves
    a.box(0.98, 0.16, 0.98, s > 0 ? GOLD : neon, 0, -1.45, 0, { r: 0.03 }); // watch / glow band
  });
  sneakers(h, key, rave ? 0x4a148c : 0xe53935);
  // the booth: a road case with a glowing strip, a mixer and two decks
  const r = wear(h, h.root, `${key}:booth`);
  const top = 2.75;
  r.box(3.6, top - 0.1, 1.3, 0x263238, 0, (top - 0.1) / 2, 1.6, { r: 0.08 });
  r.box(3.66, 0.12, 1.36, INK, 0, top - 0.1, 1.6, { r: 0.03 });
  for (const s of [-1, 1]) for (const y of [0.25, top - 0.4]) r.box(0.2, 0.2, 1.38, STEEL, s * 1.75, y, 1.6, { r: 0.04 }); // corner caps
  r.box(3.3, 0.22, 0.05, neon, 0, 1.75, 2.27);
  r.box(3.3, 0.05, 0.05, neon, 0, 0.6, 2.27);
  for (const s of [-1, 1]) r.box(0.3, 0.12, 0.08, STEEL, s * 1.0, 1.2, 2.27, { r: 0.03 }); // latches
  r.box(0.7, 0.12, 0.9, 0x111111, 0, top + 0.02, 1.6, { r: 0.03 }); // mixer
  for (let i = 0; i < 3; i++) {
    r.box(0.06, 0.04, 0.4, STEEL, -0.2 + i * 0.2, top + 0.1, 1.75);
    r.box(0.1, 0.06, 0.08, 0xeeeeee, -0.2 + i * 0.2, top + 0.13, 1.7 - i * 0.08);
    for (let j = 0; j < 2; j++) r.cyl(0.04, 0.06, 0x9e9e9e, -0.2 + i * 0.2, top + 0.11, 1.3 + j * 0.13, { seg: 8 });
  }
  for (const s of [-1, 1]) {
    r.box(1.1, 0.14, 1.0, 0x37474f, s * 1.05, top + 0.03, 1.6, { r: 0.03 }); // deck
    r.cyl(0.05, 0.25, STEEL, s * 1.05 + s * 0.42, top + 0.2, 1.25, { seg: 8 }); // tone arm post
    r.box(0.05, 0.04, 0.6, STEEL, s * 1.05 + s * 0.42, top + 0.32, 1.5, { ry: s * 0.3 });
  }
  // speakers: taller each level, one woofer per 0.9 of height, a tweeter on top
  const sp = [1.3, 1.7, 2.1, 2.5, 2.9][level] ?? 2.9;
  const n = Math.max(1, Math.floor(sp / 0.9));
  for (const s of [-1, 1]) {
    const x = s * 2.45;
    r.box(1.1, sp, 1.0, 0x111111, x, sp / 2, 0.6, { r: 0.06 });
    r.box(1.0, sp - 0.1, 0.04, 0x1c1c1c, x, sp / 2, 1.11);
    for (let i = 0; i < n; i++) {
      const y = 0.5 + i * 0.8;
      r.cyl(0.38, 0.05, 0x424242, x, y, 1.13, { axis: 'z', seg: 18 });
      r.cyl(0.12, 0.08, 0x212121, x, y, 1.14, { axis: 'z', seg: 18, r2: 0.32 }); // cone, wide end out
      r.ball(0.1, 0x616161, x, y, 1.18, { seg: 8, rows: 6 });
    }
    r.cyl(0.14, 0.06, level >= 2 ? glowMat(h, 0xffd54f) : 0x9e9e9e, x, sp - 0.22, 1.13, { axis: 'z', seg: 12 }); // tweeter
    for (const dx of [-0.35, 0.35]) r.box(0.12, 0.12, 0.12, STEEL, x + dx, sp - 0.06, 1.05, { r: 0.03 });
  }
  if (level >= 2) {
    // Thrifty: a glowing "$" sign on a stand at the front of the booth
    const gold = glowMat(h, 0xffd54f);
    r.box(1.2, 1.0, 0.1, 0x1b5e20, 0, top + 0.6, 2.15, { r: 0.05 });
    r.box(1.26, 1.06, 0.06, GOLD, 0, top + 0.6, 2.12);
    r.tube([[0.25, top + 0.85, 2.22], [0.0, top + 0.95, 2.22], [-0.25, top + 0.8, 2.22], [0.0, top + 0.6, 2.22], [0.25, top + 0.4, 2.22], [0.0, top + 0.25, 2.22], [-0.25, top + 0.35, 2.22]], 0.06, gold, { seg: 24, sides: 6 });
    r.box(0.07, 0.95, 0.06, gold, 0, top + 0.6, 2.23);
  }
  if (rave) {
    // Apocalypse Rave: a truss behind the DJ with coloured party lights aimed at the crowd
    for (const s of [-1, 1]) {
      for (const z of [-0.9, -1.6]) r.cyl(0.07, 6.6, STEEL, s * 1.9, 3.3, z, { seg: 8 });
      for (let i = 0; i < 8; i++) r.tube([[s * 1.9, 0.3 + i * 0.8, -0.9], [s * 1.9, 0.7 + i * 0.8, -1.6]], 0.025, STEEL, { seg: 2, sides: 4 });
      r.box(0.6, 0.08, 1.1, INK, s * 1.9, 0.04, -1.25); // foot plate
    }
    for (const z of [-0.9, -1.6]) r.cyl(0.07, 3.9, STEEL, 0, 6.6, z, { axis: 'x', seg: 8 });
    for (let i = 0; i < 5; i++) r.tube([[-1.6 + i * 0.8, 6.6, -0.9], [-1.2 + i * 0.8, 6.6, -1.6]], 0.025, STEEL, { seg: 2, sides: 4 });
    [0xff1744, 0x76ff03, 0x2979ff].forEach((c, i) => {
      const x = (i - 1) * 1.2;
      r.box(0.1, 0.3, 0.1, INK, x, 6.45, -0.9);
      for (const sx of [-1, 1]) r.box(0.05, 0.4, 0.08, INK, x + sx * 0.28, 6.25, -0.85); // yoke
      r.cyl(0.24, 0.45, 0x212121, x, 6.15, -0.78, { seg: 14, rx: -0.5 });
      r.cyl(0.2, 0.04, glowMat(h, c), x, 5.97, -0.67, { seg: 14, rx: -0.5 });
    });
  }
  r.done();
  // the records turn
  for (const s of [-1, 1]) {
    const pl = spinner(h, h.root, s * 1.05, top + 0.12, 1.6);
    const pk = wear(h, pl, `${key}:platter`);
    pk.cyl(0.42, 0.04, 0x111111, 0, 0, 0, { seg: 22 });
    for (const rr of [0.3, 0.36]) pk.torus(rr, 0.008, 0x2a2a2a, 0, 0.022, 0, { rx: PI / 2, seg: 22 });
    pk.cyl(0.13, 0.05, s > 0 ? 0xe53935 : 0x1e88e5, 0, 0.01, 0, { seg: 14 });
    pk.box(0.04, 0.02, 0.1, 0xfafafa, 0.08, 0.04, 0);
    pk.cyl(0.02, 0.1, STEEL, 0, 0.04, 0, { seg: 6 });
    pk.done();
  }
  h.idleSpin = 3;
  h.rightArm.rotation.set(-1.0, 0, 0.25);
  h.leftArm.rotation.set(-1.0, 0, -0.25);
  h.pose = { right: -1.0, left: -1.0, leftRecoil: 0 };
  h.bob = 0.18; // grooving to the music
  h.muzzles = [];
  return own(h, 0);
}

export const MODELS = {
  engineer: makeEngineer,
  hacker: makeHacker,
  hackerBottom: makeHackerBottom,
  medic: makeMedic,
  medicBeam: makeMedicBeam,
  medicBeamBottom: makeMedicBeamBottom,
  commander: makeCommander,
  commanderClassic: makeCommanderClassic,
  dj: makeDJ,
};
