// Tower models: people, batch 17 (dressed with the vehicle kit in ../vehicles.js).
// In here: Spotlight Tech, Psycho Slayer, Bubble Blower, and the evolved Operator, Breacher
// (+bottom), Kingpin (+bottom) and Titan (+bottom).
// Each makeX(level) builds one tower's look; MODELS at the bottom says which tower uses which,
// and ../models.js lays it over TOWER_MODELS.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.
//
// The evolved towers used to be their base tower's model with a few boxes on top. Now each one is
// built on its own, still close to its base so players know it, with heavier gear and the glowing
// cyan "evolved" badge (evoBadge) on the chest. Their two paths split where the upgrades split:
// Breacher at Lv 5, Kingpin and Titan at Lv 4 (before that both paths look the same).
// Lv numbers in the comments are the level index the builders get (Lv 0 = the first look).

import * as THREE from 'three';
import { antenna, glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import {
  GOLD, GUNMETAL, INK, STEEL, UP, WOOD, aimLong, armPatch, band, belt, boots, cap, collar, dome, fist, glove,
  goggles, hair, headset, helmet, kneePad, muzzle, own, pack, pistol, pouch, radio, rifle, shades, shardOf, vest, wear,
} from './people1.js';
import { boltRifle, duster, grenade, nvg, shoulderPads } from './people2.js';
import { ammoPack, armPlate, balaclava, core, minigun } from './people3.js';
import { feet, glassMat, hands, riotHelmet } from './people5.js';
import { hardHat } from './people6.js';
import { coil, shellBelt, shotgun } from './people8.js';
import { cigar, cuffs, fedora, shoes, suitJacket, tommyGun } from './people10.js';
import { spinner } from './machines5.js';

const PI = Math.PI;
const EVO = 0x18ffff; // the evolved towers' glow
const SOAP = 0xb3e5fc;
const PINK = 0xf48fb1;
const TRUSS = 0x9ea4aa;

// ------------------------------------------------------------------ shared bits for this batch

/** A straight round rod between two points (struts, truss braces, tripod legs). */
function rod(k, a, b, r, col) {
  k.tube([a, b], r, col, { seg: 1, sides: 6, tension: 0 });
}

/** The evolved badge: a dark hex plate with a glowing cyan hex in it (torso space, facing +z). */
function evoBadge(k, mat, x, y, z) {
  k.cyl(0.24, 0.06, 0x1c2429, x, y, z, { axis: 'z', seg: 6 });
  k.cyl(0.16, 0.05, mat, x, y, z + 0.04, { axis: 'z', seg: 6 });
}

/**
 * A square stage truss column from y0 to y1 at (x, z): four chords, rungs and zigzag braces
 * on the front and back faces (any space).
 */
function trussUp(k, x, z, y0, y1, w = 0.4) {
  const d = w / 2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.cyl(0.05, y1 - y0, TRUSS, x + sx * d, (y0 + y1) / 2, z + sz * d, { seg: 6 });
  const n = Math.round((y1 - y0) / 0.55);
  const step = (y1 - y0) / n;
  for (let i = 0; i < n; i++) {
    const ya = y0 + i * step;
    const flip = i % 2 ? 1 : -1;
    for (const sz of [-1, 1]) rod(k, [x - flip * d, ya, z + sz * d], [x + flip * d, ya + step, z + sz * d], 0.025, TRUSS);
    for (const sx of [-1, 1]) k.cyl(0.025, w, TRUSS, x + sx * d, ya, z, { axis: 'z', seg: 5 });
  }
}

/** The same truss lying along x, from x0 to x1 at height y (any space). */
function trussAcross(k, x0, x1, y, z, w = 0.4) {
  const d = w / 2;
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) k.cyl(0.05, x1 - x0, TRUSS, (x0 + x1) / 2, y + sy * d, z + sz * d, { axis: 'x', seg: 6 });
  const n = Math.round((x1 - x0) / 0.55);
  const step = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const xa = x0 + i * step;
    const flip = i % 2 ? 1 : -1;
    for (const sz of [-1, 1]) rod(k, [xa, y - flip * d, z + sz * d], [xa + step, y + flip * d, z + sz * d], 0.025, TRUSS);
    for (const sy of [-1, 1]) k.cyl(0.025, w, TRUSS, xa, y + sy * d, z, { axis: 'z', seg: 5 });
  }
}

/** A stage PAR can hanging from a clamp, tipped down toward the front (any space). */
function parCan(k, x, y, z, body, lens, r = 0.32) {
  k.box(0.22, 0.24, 0.22, INK, x, y + 0.08, z, { r: 0.03 }); // clamp
  k.cyl(0.05, 0.3, INK, x, y - 0.1, z, { seg: 6 });
  k.torus(r + 0.05, 0.035, INK, x, y - 0.35, z, { ry: PI / 2, seg: 12, arc: PI, rz: PI }); // yoke
  k.cyl(r, r * 2.4, body, x, y - 0.35, z, { axis: 'z', seg: 14, rx: 0.45 });
  k.cyl(r * 0.85, 0.05, lens, x, y - 0.35 - Math.sin(0.45) * r * 1.2, z + Math.cos(0.45) * r * 1.2, { axis: 'z', seg: 14, rx: 0.45 });
  k.torus(r * 0.98, 0.03, tone(body, 0.7), x, y - 0.35 - Math.sin(0.45) * r * 1.18, z + Math.cos(0.45) * r * 1.18, { seg: 14, rx: 0.45 });
}

// ------------------------------------------------------------------ Spotlight Tech

/**
 * Spotlight Tech (event, cliff): a stagehand in black with a headset and a crew pass, working a
 * big stage lamp on a tripod. Lv 1 a tool belt, a work glove and cables on the floor, Lv 2 a hard
 * hat worn crooked, a taller stand and barn doors on the lamp, Lv 3 a stage truss behind with a
 * second light, Lv 4 shades, a purple crew jacket, a gold lamp and coloured lights on the truss.
 * The lamp (h.lamp) tips toward the light on the ground (views.js); h.spot is the light's colour.
 */
export function makeSpotlightTech(level) {
  const star = level >= 4;
  const coat = 0x311b92;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: 0x212121, pants: 0x263238, arms: star ? coat : 0x212121 });
  const key = `spotlight${level}`;
  const warm = glowMat(h, [0xfff8e1, 0xffe0b2, 0xffcc80, 0xffb74d, 0xffd740][level] ?? 0xffd740, 1);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x4e342e, { h: 0.4 });
  headset(hd, 0x2b2b2b);
  if (star) shades(hd, GOLD, 0x111111);
  // a black crew tee with a white CREW print on the back, and a crew pass on a lanyard
  t.box(1.3, 0.42, 0.04, 0xeeeeee, 0, 0.5, -0.52, { r: 0.02 });
  for (let i = 0; i < 4; i++) t.box(0.16, 0.24, 0.03, 0x212121, -0.45 + i * 0.3, 0.5, -0.545); // the letters
  if (star) {
    // a purple bomber jacket, open at the front, ribbed collar and hem, gold CREW on the back
    for (const s of [-1, 1]) {
      t.box(0.72, 1.94, 0.1, coat, s * 0.66, 0.02, 0.55, { r: 0.04 });
      t.box(0.1, 1.94, 1.1, coat, s * 1.06, 0.02, 0, { r: 0.03 });
      t.box(0.04, 1.8, 0.04, GOLD, s * 0.31, 0.02, 0.61); // zip edges
      t.box(0.4, 0.06, 0.06, tone(coat, 0.7), s * 0.62, -0.3, 0.62); // pocket slits
    }
    t.box(2.16, 1.94, 0.1, coat, 0, 0.02, -0.55, { r: 0.04 });
    t.box(2.24, 0.2, 1.2, tone(coat, 0.75), 0, -0.92, 0, { r: 0.05 }); // hem
    t.box(1.4, 0.24, 1.18, tone(coat, 0.75), 0, 0.94, -0.06, { r: 0.06 }); // collar
    t.box(1.3, 0.42, 0.04, GOLD, 0, 0.5, -0.62, { r: 0.02 });
    for (let i = 0; i < 4; i++) t.box(0.16, 0.24, 0.03, coat, -0.45 + i * 0.3, 0.5, -0.645);
  }
  const lz = star ? 0.62 : 0.53;
  for (const s of [-1, 1]) t.tube([[s * 0.4, 1.0, lz - 0.06], [s * 0.25, 0.6, lz], [0, 0.3, lz + 0.02]], 0.025, 0x1565c0, { seg: 8, sides: 4 });
  t.box(0.46, 0.6, 0.04, 0xffeb3b, 0, 0.0, lz + 0.03, { r: 0.04 }); // the pass
  t.box(0.18, 0.2, 0.02, 0x90a4ae, -0.08, 0.08, lz + 0.06); // photo
  for (const y of [-0.08, -0.18]) t.box(0.28, 0.04, 0.02, 0x212121, 0, y, lz + 0.06);
  if (level >= 1) {
    // a tool belt: pouches, gaffer tape, a wrench, a torch and a work glove tucked in
    belt(t, 0x5d4037, 0x9e9e9e);
    pouch(t, -0.62, -1.02, 0.56, 0.5, 0.42, 0x6d4c41, 0.22);
    pouch(t, 0.62, -1.02, 0.56, 0.4, 0.38, 0x6d4c41, 0.2);
    t.torus(0.17, 0.07, 0x9e9e9e, 0.95, -1.0, 0.25, { ry: PI / 2, seg: 14 }); // gaffer tape on the hip
    t.box(0.07, 0.6, 0.04, STEEL, 0.2, -1.1, 0.6); // wrench
    t.torus(0.08, 0.03, STEEL, 0.2, -1.42, 0.6, { seg: 8 });
    t.cyl(0.08, 0.45, INK, -1.08, -1.05, 0.2, { seg: 8 }); // torch
    t.cyl(0.07, 0.02, 0xfff3b0, -1.08, -1.28, 0.2, { seg: 8 });
    t.box(0.3, 0.4, 0.1, 0xc8a165, -0.25, -1.15, -0.58, { r: 0.04, rz: 0.2 }); // glove in the back pocket
  } else belt(t, 0x111111);
  hd.done();
  t.done();
  if (level >= 2) {
    // a hard hat, worn crooked
    const tilt = new THREE.Group();
    tilt.position.set(0, 0.95, 0);
    tilt.rotation.set(-0.12, 0, 0.28);
    h.head.add(tilt);
    const inner = new THREE.Group();
    inner.position.y = -0.95;
    tilt.add(inner);
    const hk = wear(h, inner, `${key}:hat`);
    hardHat(hk, 0xffa000, 0xfff3b0);
    hk.box(0.5, 0.14, 0.04, 0x212121, 0, 1.25, 0.66, { rx: -0.6 }); // CREW sticker
    hk.done();
  }
  hands(h, key, level >= 1 ? 0xc8a165 : null, star ? tone(coat, 0.8) : 0x2b2b2b);
  feet(h, key, 0x212121, (b) => b.box(1.12, 0.1, 1.24, 0xeeeeee, 0, -1.9, 0.06)); // sneakers with white soles
  // ------- the lamp stand: a tripod, a telescoping pole and a yoke
  const X = -2.2;
  const standH = level >= 2 ? 5.0 : 4.0;
  const ls = [1.2, 1.4, 1.7, 1.9, 2.2][level] ?? 2.2;
  const R = ls * 0.42;
  const L = ls * 1.1;
  const s = wear(h, h.body, `${key}:stand`);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2 + 0.5;
    rod(s, [X, 1.1, 0], [X + Math.sin(a) * 1.0, 0.06, Math.cos(a) * 1.0], 0.06, 0x37474f);
    s.ball(0.09, INK, X + Math.sin(a) * 1.0, 0.06, Math.cos(a) * 1.0, { seg: 8, rows: 5 });
    rod(s, [X, 0.7, 0], [X + Math.sin(a) * 0.5, 0.6, Math.cos(a) * 0.5], 0.03, 0x37474f); // braces
  }
  s.cyl(0.14, 0.3, 0x263238, X, 1.15, 0, { seg: 10 }); // hub
  s.cyl(0.11, standH * 0.5, 0x37474f, X, 1.1 + standH * 0.25, 0, { seg: 10 });
  s.cyl(0.075, standH * 0.5, 0x546e7a, X, 1.1 + standH * 0.6, 0, { seg: 10 });
  for (const y of [1.1 + standH * 0.5, standH - 0.6]) {
    s.cyl(0.14, 0.14, INK, X, y, 0, { seg: 10 }); // clamp collars
    s.cyl(0.04, 0.3, INK, X + 0.2, y, 0, { axis: 'x', seg: 6 });
  }
  const pivot = standH + 0.2;
  const yb = pivot - R - 0.18;
  s.cyl(0.075, yb - (standH - 0.6), 0x546e7a, X, (yb + standH - 0.6) / 2, 0, { seg: 10 });
  s.box(2 * R + 0.35, 0.12, 0.2, INK, X, yb, 0, { r: 0.03 }); // the yoke
  for (const sx of [-1, 1]) {
    s.box(0.1, R + 0.25, 0.2, INK, X + sx * (R + 0.12), yb + (R + 0.18) / 2, 0, { r: 0.03 });
    s.cyl(0.13, 0.12, 0x424242, X + sx * (R + 0.22), pivot, 0, { axis: 'x', seg: 10 }); // tilt knobs
  }
  if (level >= 3) for (const i of [0, 1]) {
    const a = (i / 3) * PI * 2 + 0.5;
    s.box(0.5, 0.25, 0.32, 0x8d7b5a, X + Math.sin(a) * 0.75, 0.2, Math.cos(a) * 0.75, { r: 0.08, ry: a }); // sandbags
  }
  if (level >= 1) {
    // the power cable snaking off the stand, and a coil of spare cable on the floor
    s.tube([[X, 1.2, -0.1], [X + 0.2, 0.1, -0.5], [X + 1.2, 0.06, -0.8], [0.4, 0.06, -1.0], [1.4, 0.06, 0.2], [1.6, 0.06, 1.2]], 0.06, INK, { seg: 30, sides: 5 });
    for (let i = 0; i < 3; i++) s.torus(0.45 - i * 0.03, 0.05, INK, 1.9, 0.07 + i * 0.07, 1.6, { rx: PI / 2, seg: 18 });
    s.box(0.5, 0.3, 0.4, 0x37474f, 1.1, 0.15, -1.6, { r: 0.04 }); // dimmer box
    s.box(0.3, 0.06, 0.02, 0x76ff03, 1.1, 0.22, -1.39);
  }
  if (level >= 3) {
    // a stage truss over the tech's head, with a second light
    trussUp(s, -2.2, -1.6, 0.1, 6.3);
    trussUp(s, 2.2, -1.6, 0.1, 6.3);
    trussAcross(s, -2.4, 2.4, 6.5, -1.6);
    for (const x of [-2.2, 2.2]) s.box(1.0, 0.1, 1.0, INK, x, 0.05, -1.6, { r: 0.03 }); // base plates
    parCan(s, 1.2, 6.15, -1.6, 0x37474f, warm, 0.42);
    if (star) {
      [[-1.4, 0xff1744], [-0.4, 0x2979ff], [0.4, 0x00e676]].forEach(([x, c]) => parCan(s, x, 6.15, -1.6, 0x212121, glowMat(h, c), 0.3));
    }
  }
  s.done();
  // the lamp: a round housing with fins, a fresnel lens, a handle and (Lv 3+) barn doors
  const lamp = new THREE.Group();
  lamp.position.set(X, pivot, 0);
  h.body.add(lamp);
  const body = star ? GOLD : 0x37474f;
  const k = wear(h, lamp, `${key}:lamp`);
  k.cyl(R, L, body, 0, 0, 0, { axis: 'z', seg: 22 });
  k.cyl(R * 0.82, 0.24, tone(body, 0.75), 0, 0, -L / 2 - 0.12, { axis: 'z', seg: 18 }); // back cap
  for (let i = 0; i < 5; i++) k.torus(R + 0.02, 0.03, tone(body, 0.7), 0, 0, -L / 2 + 0.15 + i * 0.12, { seg: 22 }); // cooling rings
  for (const sx of [-1, 1]) k.cyl(0.12, 0.12, tone(body, 0.7), sx * (R + 0.05), 0, 0, { axis: 'x', seg: 10 }); // pivots
  k.torus(R, 0.07, INK, 0, 0, L / 2, { seg: 22 }); // front rim
  k.cyl(R * 0.9, 0.04, warm, 0, 0, L / 2 + 0.01, { axis: 'z', seg: 22 }); // lens
  for (const f of [0.35, 0.6]) k.torus(R * f, 0.018, 0xfff3b0, 0, 0, L / 2 + 0.04, { seg: 18 }); // fresnel rings
  k.tube([[0, R, -L * 0.3], [0, R + 0.3, -L * 0.2], [0, R + 0.3, L * 0.2], [0, R, L * 0.3]], 0.04, INK, { seg: 12, sides: 5 }); // handle
  k.box(R * 0.8, 0.08, 0.2, INK, 0, R + 0.02, L / 2 - 0.15); // gel frame slot
  if (level >= 2) {
    // barn doors: four flaps hinged round the lens, opened out
    const F = L / 2 + 0.05;
    for (const sy of [-1, 1]) k.box(R * 1.9, 0.04, R * 0.9, INK, 0, sy * (R + 0.15), F + R * 0.38, { rx: sy * 0.35 });
    for (const sx of [-1, 1]) k.box(0.04, R * 1.5, R * 0.7, INK, sx * (R + 0.12), 0, F + R * 0.3, { ry: -sx * 0.35 });
  }
  if (star) k.torus(R + 0.06, 0.05, 0x212121, 0, 0, L / 2 - 0.2, { seg: 22 });
  k.done();
  h.muzzles = [];
  muzzle(h, lamp, 0, L / 2 + 0.15, 0);
  h.lamp = lamp;
  h.rightArm.rotation.set(-1.4, 0, 0.5);
  h.leftArm.rotation.set(-0.3, 0, -0.2);
  h.pose = { right: -1.4, left: -0.3, leftRecoil: 0 };
  h.spot = [0xfff8e1, 0xffe0b2, 0xffcc80, 0xffb74d, 0xffd740][level] ?? 0xffd740;
  return own(h, 0);
}

// ------------------------------------------------------------------ Psycho Slayer

/** The Bolter (gun space): a chunky boxy gun with a sickle mag, a shrouded barrel and a brake. Returns [y, z]. */
function bolter(k, plate, trim, o = {}) {
  const U = UP;
  k.box(0.5, 1.3, 0.6, plate, 0, -0.35, U, { r: 0.08 }); // body
  k.box(0.54, 0.5, 0.64, trim, 0, -0.2, U, { r: 0.06 }); // trim band
  k.box(0.2, 0.9, 0.14, INK, 0, -0.4, U + 0.34, { r: 0.03 }); // top rail
  k.box(0.2, 0.3, 0.26, INK, 0, 0.05, U + 0.42, { r: 0.04 }); // rear sight
  k.box(0.26, 0.28, 0.55, INK, 0, 0.18, U - 0.42, { rx: -0.3, r: 0.05 }); // grip
  k.box(0.28, 0.38, 0.7, tone(plate, 0.6), 0, -0.55, U - 0.6, { rx: 0.35, r: 0.05 }); // sickle mag
  k.box(0.46, 0.9, 0.5, tone(plate, 0.85), 0, -1.35, U + 0.02, { r: 0.08 }); // barrel shroud
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) k.box(0.04, 0.16, 0.24, INK, s * 0.235, -1.1 - i * 0.24, U + 0.02);
  k.cyl(0.13, 0.5, STEEL, 0, -2.0, U + 0.02, { seg: 12 });
  k.box(0.36, 0.3, 0.36, INK, 0, -2.25, U + 0.02, { r: 0.04 }); // muzzle brake
  for (const s of [-1, 1]) k.box(0.04, 0.12, 0.2, 0x050505, s * 0.19, -2.25, U + 0.02);
  k.box(0.6, 0.5, 0.06, trim, 0, -0.8, U + 0.32, { r: 0.03 }); // the trim crest on top
  if (o.glow) k.box(0.06, 0.8, 0.08, o.glow, 0.27, -0.6, U + 0.05);
  return [-2.42, U + 0.02];
}

/**
 * Psycho Slayer (alternate event Commando form): a huge warrior in power armour with a Bolter
 * and a flanged mace. Lv 1 a sealed helmet, Lv 2 Core Armor: heavier plates and a chest core,
 * Lv 3 railguns over the shoulders on a power pack, Lv 4 a white space suit with rocket pods,
 * Lv 5 Psycho Warrior: black and red armour, a spiked crest and a mortar on the back.
 * A purple Dimension Shard marks the form.
 */
export function makePsychoSlayer(level) {
  const space = level === 4;
  const psycho = level >= 5;
  const armor = psycho ? 0x212121 : space ? 0xeceff1 : level >= 2 ? 0x455a64 : 0x5d6b3a;
  const trim = psycho ? 0xd50000 : space ? 0x1565c0 : 0xffb300;
  const h = makeHumanoid({ skin: 0xc68642, shirt: armor, pants: psycho ? 0x111111 : 0x37474f, arms: armor, face: 'soldier' });
  const key = `psycho${level}`;
  const eye = glowMat(h, psycho ? 0xff1744 : 0x76ff03);
  const blue = glowMat(h, 0x40c4ff);
  const dk = tone(armor, 0.75);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (level >= 1) {
    // a sealed helmet: a round shell, a jutting face plate, a glowing eye slit and a grille
    dome(hd, 0.8, 0.7, armor, 0, 0.78, -0.02);
    hd.cyl(0.8, 0.8, armor, 0, 0.38, -0.02, { seg: 22 });
    hd.slab(1.0, 0.75, 0.3, dk, 0, 0.42, 0.72, { tw: 1.1, bw: 0.75, bd: 0.8 }); // face plate
    hd.box(0.84, 0.16, 0.08, eye, 0, 0.74, 0.82, { r: 0.03 }); // eye slit
    hd.box(0.94, 0.06, 0.1, trim, 0, 0.88, 0.8);
    for (let i = 0; i < 4; i++) hd.box(0.5, 0.04, 0.06, INK, 0, 0.42 - i * 0.08, 0.89); // grille
    for (const s of [-1, 1]) {
      hd.cyl(0.22, 0.14, dk, s * 0.82, 0.5, -0.02, { axis: 'x', seg: 14 }); // ear pieces
      hd.cyl(0.12, 0.05, trim, s * 0.9, 0.5, -0.02, { axis: 'x', seg: 12 });
    }
    hd.torus(0.8, 0.07, trim, 0, 0.02, -0.02, { rx: PI / 2, seg: 22 }); // neck ring
    if (psycho) for (const [x, hgt] of [[-0.4, 0.5], [0, 0.75], [0.4, 0.5]]) hd.cyl(0.14, hgt, trim, x, 1.48 + hgt / 2, -0.05, { seg: 6, r2: 0.01, rz: -x * 0.6 }); // spiked crest
    else hd.box(0.14, 0.24, 1.2, trim, 0, 1.5, -0.05, { r: 0.05 }); // ridge
  } else {
    helmet(hd, 0x3e4a2a, { cover: 0x5d6b3a });
    hd.box(0.2, 0.06, 0.4, INK, 0.25, 0.32, 0.6); // chin strap buckle
  }
  // the power armour: chest cuirass, ribbed belly, big rounded pauldrons with trim and rivets
  t.box(2.3, 1.45, 1.32, armor, 0, 0.3, 0, { r: 0.22 });
  t.slab(1.3, 0.9, 0.2, dk, 0, 0.45, 0.68, { tw: 1.2, bw: 0.7 }); // chest ridge
  for (let i = 0; i < 3; i++) t.box(2.18 - i * 0.1, 0.18, 1.22, tone(armor, 0.82), 0, -0.55 - i * 0.2, 0, { r: 0.06 });
  belt(t, 0x263238, trim, -1.05);
  pouch(t, 0.62, -1.15, 0.6, 0.42, 0.4, dk, 0.22);
  if (!space) grenade(t, -0.6, -1.15, 0.72, 0x33691e);
  for (const s of [-1, 1]) {
    t.ball(0.7, armor, s * 1.5, 1.0, 0, { sy: 0.55, seg: 16, rows: 9 });
    t.torus(0.66, 0.06, trim, s * 1.5, 0.84, 0, { rx: PI / 2, seg: 20 });
    for (let i = 0; i < 4; i++) t.ball(0.05, STEEL, s * 1.5 + Math.cos(i * 1.57 + 0.78) * 0.45, 1.3, Math.sin(i * 1.57 + 0.78) * 0.45, { seg: 6, rows: 4 });
  }
  t.box(0.36, 0.36, 0.05, shardOf(h), -0.6, 0.62, 0.68, { r: 0.02 }); // Dimension Shard
  if (level >= 2) {
    // Core Armor: a glowing chest core and thicker back plates
    t.cyl(0.32, 0.14, dk, 0.45, 0.4, 0.7, { axis: 'z', seg: 16 });
    t.cyl(0.22, 0.08, eye, 0.45, 0.4, 0.78, { axis: 'z', seg: 16 });
    t.box(2.1, 1.6, 0.25, dk, 0, 0.2, -0.7, { r: 0.08 });
  }
  if (level >= 3) {
    // Rail Guns: two long rails over the shoulders on a vented power pack
    t.box(1.7, 1.4, 0.55, 0x263238, 0, 0.25, -1.0, { r: 0.1 });
    for (let i = 0; i < 4; i++) t.box(1.2, 0.05, 0.04, INK, 0, -0.1 + i * 0.22, -1.29);
    for (const x of [-0.45, 0.45]) t.cyl(0.12, 0.6, blue, x, 0.0, -1.28, { seg: 10 }); // cells
    for (const s of [-1, 1]) {
      const x = s * 0.72;
      for (const dx of [-0.11, 0.11]) t.box(0.08, 0.16, 2.6, 0x37474f, x + dx, 1.75, -0.4, { r: 0.02 });
      for (let i = 0; i < 4; i++) t.torus(0.17, 0.05, 0xb87333, x, 1.75, -1.2 + i * 0.4, { seg: 12 });
      t.box(0.36, 0.3, 0.3, 0x263238, x, 1.75, -1.5, { r: 0.04 });
      t.cyl(0.08, 0.1, blue, x, 1.75, 0.92, { axis: 'z', seg: 10 });
      t.box(0.2, 0.5, 0.2, INK, x, 1.35, -0.85); // mount
    }
  }
  if (level >= 4) {
    // rocket pods on the hips of the pack, warheads poking up
    for (const s of [-1, 1]) {
      t.box(0.75, 0.9, 0.8, trim, s * 1.35, 0.0, -0.95, { r: 0.1 });
      for (const dx of [-0.17, 0.17]) for (const dz of [-0.17, 0.17]) {
        t.cyl(0.11, 0.1, INK, s * 1.35 + dx, 0.46, -0.95 + dz, { seg: 8 });
        t.cyl(0.08, 0.2, 0xeeeeee, s * 1.35 + dx, 0.55, -0.95 + dz, { seg: 8, r2: 0.01 });
      }
    }
  }
  if (psycho) {
    // the mortar: a fat tube up the back, a glowing mouth and a sight
    t.cyl(0.42, 2.6, 0x424242, 0, 1.75, -1.25, { seg: 16, rx: -0.3 });
    for (const y of [0.9, 1.6, 2.3]) t.torus(0.44, 0.06, trim, 0, y, -1.25 - (y - 1.75) * Math.tan(0.3), { rx: PI / 2 - 0.3, seg: 16 });
    t.torus(0.34, 0.08, eye, 0, 3.0, -1.64, { rx: PI / 2 - 0.3, seg: 16 });
  }
  hd.done();
  t.done();
  // greaves, knee cops and heavy boots
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    boots(b, 0x1a1a1a);
    b.box(1.2, 0.8, 1.3, armor, 0, -1.5, 0.1, { r: 0.12 });
    b.ball(0.32, trim, 0, -0.95, 0.58, { sy: 0.8, seg: 10, rows: 6 });
    b.box(1.12, 0.7, 1.14, dk, 0, -0.4, 0.02, { r: 0.1 }); // thigh plate
    b.done();
  }
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    armPlate(a, armor);
    a.box(1.16, 0.6, 1.16, dk, 0, -1.15, 0, { r: 0.1 }); // vambrace
    a.box(1.18, 0.08, 1.18, trim, 0, -0.88, 0);
    glove(a, 0x1a1a1a);
    a.done();
  }
  // the Bolter in the right hand, the mace in the left
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = bolter(gk, tone(armor, psycho ? 1.2 : 0.7), trim, { glow: level >= 2 ? eye : null });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  const m = fist(h.leftArm, -1.9, 1.1);
  const mk = wear(h, m, `${key}:mace`);
  mk.cyl(0.11, 1.6, psycho ? 0x424242 : 0x5d4037, 0, -0.6, 0, { seg: 10 });
  for (let i = 0; i < 4; i++) mk.torus(0.12, 0.03, INK, 0, 0.05 - i * 0.12, 0, { rx: PI / 2, seg: 10 }); // grip wrap
  mk.ball(0.16, trim, 0, 0.25, 0, { seg: 10, rows: 6 }); // pommel
  const hy = -1.6;
  mk.ball(0.38, psycho ? 0x424242 : 0x78909c, 0, hy, 0, { seg: 14, rows: 10 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    mk.box(0.07, 0.75, 0.38, psycho ? 0x616161 : 0x90a4ae, Math.sin(a) * 0.38, hy, Math.cos(a) * 0.38, { ry: a }); // flanges
    mk.cyl(0.08, 0.3, trim, Math.sin(a) * 0.65, hy, Math.cos(a) * 0.65, { seg: 6, r2: 0.01, rz: -PI / 2, ry: a - PI / 2 });
  }
  mk.cyl(0.1, 0.35, trim, 0, hy - 0.5, 0, { seg: 6, r2: 0.01, rx: PI }); // the top spike
  mk.torus(0.2, 0.05, trim, 0, hy + 0.4, 0, { rx: PI / 2, seg: 12 });
  if (psycho) mk.torus(0.4, 0.04, eye, 0, hy, 0, { rx: PI / 2, seg: 18 });
  mk.done();
  h.rightArm.rotation.set(-PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-0.5, 0, -0.3);
  h.pose = { right: -PI / 2, left: -0.5, leftRecoil: 0.25 };
  h.root.scale.setScalar(1.25); // a big warrior
  h.tracer = psycho ? 0xff5252 : 0xffd740;
  h.tracerWidth = 0.22;
  return own(h);
}

// ------------------------------------------------------------------ Bubble Blower

/**
 * Bubble Blower (alternate Cryomancer form): a cheerful kid in overalls and a yellow cap with a
 * bubble wand. Lv 1 pink rubber gloves, Lv 2 a toy bubble gun with a fan in its ring and a soap
 * tank on the back, Lv 3 big muscles in a tank top, Lv 4 a second tank, Lv 5 Super Bubble Man:
 * a pink suit, a cape, a bubble emblem and a bubble helmet. A purple Dimension Shard marks the form.
 */
export function makeBubbleBlower(level) {
  const hero = level >= 5;
  const buff = level >= 3;
  const shirt = [0x4fc3f7, 0x4fc3f7, 0x29b6f6, 0x0288d1, 0x0277bd, 0xec407a][level] ?? 0xec407a;
  const skin = 0xf1c27d;
  const pants = hero ? 0xad1457 : 0x3949ab;
  const h = makeHumanoid({ skin, shirt, pants, arms: buff ? skin : shirt });
  const key = `bubble${level}`;
  const soap = glowMat(h, SOAP, 0.6);
  const glass = glassMat(h, 0xe1f5fe, 0.35);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x8d5524, { h: 0.4 });
  cap(hd, 0xffeb3b, { peak: 0xfdd835 });
  hd.ball(0.07, soap, 0, 1.47, 0, { seg: 8, rows: 5 }); // a bubble on the cap button
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) hd.box(0.04, 0.04, 0.02, 0xc68642, s * (0.32 + i * 0.07), 0.5 + (i % 2) * 0.05, 0.6); // freckles
  t.box(0.32, 0.22, 0.04, shardOf(h), -0.55, 0.6, 0.53, { r: 0.02 }); // Dimension Shard
  if (buff && !hero) for (const s of [-1, 1]) t.box(0.5, 0.3, 1.04, skin, s * 0.78, 0.86, 0, { r: 0.06 }); // tank top: bare shoulders
  if (hero) {
    // Super Bubble Man: a round emblem with three bubbles, a belt and a cape
    t.cyl(0.42, 0.06, 0xfafafa, 0, 0.35, 0.52, { axis: 'z', seg: 22 });
    t.torus(0.42, 0.05, SOAP, 0, 0.35, 0.55, { seg: 22 });
    for (const [x, y, r] of [[-0.12, 0.25, 0.14], [0.12, 0.45, 0.1], [0.14, 0.18, 0.07]]) t.ball(r, soap, x, y, 0.56, { seg: 10, rows: 7 });
    belt(t, 0xfdd835, 0xfafafa);
    t.box(2.0, 0.2, 0.3, 0xf06292, 0, 0.98, -0.5, { r: 0.06 }); // cape top
    t.slab(2.0, 2.9, 0.08, 0xf06292, 0, -0.45, -0.62, { tw: 0.95, bw: 1.2, bz: -0.25 }); // cape
  } else {
    // overalls: a bib with a pocket, straps and yellow buttons
    t.box(1.2, 0.95, 0.06, pants, 0, -0.38, 0.52, { r: 0.03 });
    pouch(t, 0, -0.35, 0.55, 0.5, 0.36, tone(pants, 0.85), 0.04);
    for (const s of [-1, 1]) {
      t.box(0.2, 1.1, 0.06, pants, s * 0.5, 0.55, 0.52);
      t.box(0.2, 1.8, 0.06, pants, s * 0.5, 0.05, -0.52);
      t.box(0.2, 0.14, 1.08, pants, s * 0.5, 1.0, 0);
      t.cyl(0.08, 0.05, 0xffeb3b, s * 0.5, 0.08, 0.57, { axis: 'z', seg: 10 });
    }
    t.box(2.06, 0.6, 1.06, pants, 0, -0.7, 0, { r: 0.04 });
    for (const [x, y] of [[-0.45, 0.45], [0.2, 0.7]]) t.torus(0.12, 0.03, 0xfafafa, x, y, 0.52, { seg: 12 }); // bubble print
  }
  const tanks = level >= 4 ? [-0.5, 0.5] : level >= 2 ? [0] : [];
  for (const x of tanks) {
    // soap tanks on a little harness: a clear window, a cap and a hose to the gun
    t.cyl(0.38, 1.5, 0xe1f5fe, x, 0.1, -0.95, { seg: 16 });
    t.box(0.12, 1.1, 0.04, soap, x, 0.1, -1.33);
    for (const y of [-0.45, 0.65]) t.torus(0.39, 0.04, PINK, x, y, -0.95, { rx: PI / 2, seg: 16 });
    t.cyl(0.16, 0.18, PINK, x, 0.95, -0.95, { seg: 12 });
    t.cyl(0.38, 0.1, PINK, x, -0.66, -0.95, { seg: 16 });
  }
  if (tanks.length) {
    t.box(1.6, 0.14, 0.2, INK, 0, 0.6, -0.6);
    t.tube([[tanks[0], -0.7, -1.0], [-0.9, -1.0, -0.6], [-1.2, -0.6, 0.2]], 0.06, PINK, { seg: 14, sides: 6 });
  }
  hd.done();
  t.done();
  if (hero) {
    // the bubble helmet round the head
    const hk = wear(h, h.head, `${key}:helm`);
    hk.ball(1.05, glass, 0, 0.6, 0, { seg: 22, rows: 16 });
    hk.torus(0.9, 0.07, 0xfafafa, 0, 0.0, 0, { rx: PI / 2, seg: 22 });
    hk.done();
  }
  hands(h, key, level >= 1 ? PINK : null, buff ? skin : tone(shirt, 0.85), (a, s) => {
    if (buff) {
      a.ball(0.42, skin, s * 0.12, -0.55, 0.22, { sy: 0.9, seg: 12, rows: 8 }); // big muscles
      a.box(1.06, 0.12, 1.06, hero ? 0xfafafa : shirt, 0, -0.05, 0); // a sleeve stub
    }
    if (level >= 1) a.box(1.12, 0.2, 1.12, tone(PINK, 0.85), 0, -1.55, 0, { r: 0.05 }); // glove cuff
  });
  feet(h, key, 0xe53935, (b) => {
    b.box(1.12, 0.1, 1.24, 0xfafafa, 0, -1.9, 0.06);
    if (hero) b.box(1.1, 0.4, 1.12, 0xf06292, 0, -1.5, 0.02, { r: 0.05 }); // hero boots
  });
  // a few soap bubbles floating round the kid
  if (level >= 2) {
    const bk = wear(h, h.body, `${key}:float`);
    for (const [x, y, z, r] of [[1.9, 4.6, 0.8, 0.3], [2.4, 3.6, -0.3, 0.2], [-0.9, 6.0, 0.9, 0.24], [1.3, 5.6, -0.9, 0.16]]) {
      bk.ball(r, glass, x, y, z, { seg: 12, rows: 9 });
      bk.ball(r * 0.25, soap, x - r * 0.4, y + r * 0.4, z + r * 0.4, { seg: 6, rows: 4 });
    }
    bk.done();
  }
  h.muzzles = [];
  if (level >= 2) {
    // a toy bubble gun: a pink body, a clear chamber full of bubbles, a ring with a fan inside
    const len = level >= 4 ? 2.0 : 1.6;
    const g = fist(h.rightArm, -1.9, 1.2);
    const gk = wear(h, g, `${key}:gun`);
    const U = UP;
    gk.box(0.36, 1.0, 0.5, PINK, 0, -0.3, U, { r: 0.14 });
    gk.box(0.26, 0.3, 0.55, 0xfdd835, 0, 0.12, U - 0.4, { rx: -0.3, r: 0.08 }); // grip
    gk.torus(0.12, 0.035, 0xfdd835, 0, -0.15, U - 0.26, { ry: PI / 2, seg: 10, arc: PI });
    gk.ball(0.42, glass, 0, -0.45, U + 0.45, { seg: 16, rows: 12 }); // chamber
    for (const [x, y, z, r] of [[0.1, -0.35, 0.4, 0.12], [-0.12, -0.55, 0.5, 0.09], [0.05, -0.5, 0.3, 0.07], [-0.1, -0.3, 0.55, 0.06]]) gk.ball(r, soap, x, y, U + z, { seg: 8, rows: 6 });
    gk.cyl(0.22, 0.1, 0xfdd835, 0, -0.45, U + 0.06, { seg: 14 }); // chamber base
    gk.cyl(0.16, len - 1.0, 0x80deea, 0, -0.8 - (len - 1.0) / 2, U, { seg: 12 }); // barrel
    gk.cyl(0.36, 0.14, PINK, 0, -len + 0.05, U, { seg: 18 }); // ring housing
    gk.torus(0.36, 0.06, soap, 0, -len - 0.04, U, { rx: PI / 2, seg: 20 }); // the soap ring
    gk.box(0.06, 0.4, 0.06, 0xfdd835, 0, -0.5, U - 0.3); // trigger rod
    gk.done();
    const fan = new THREE.Group();
    fan.position.set(0, -len + 0.18, U);
    g.add(fan);
    const fk = wear(h, fan, `${key}:fan`);
    fk.cyl(0.07, 0.12, INK, 0, 0, 0, { seg: 8 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2;
      fk.box(0.26, 0.02, 0.1, 0xfafafa, Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15, { ry: -a, rx: 0.4 });
    }
    fk.done();
    (h.spin ??= []).push(fan);
    muzzle(h, g, -len - 0.05, U);
    aimLong(h);
  } else {
    // a plain bubble wand: a stick, a soap ring, and a bottle of soap in the other hand
    const w = fist(h.rightArm, -1.9, 1.1);
    const wk = wear(h, w, `${key}:wand`);
    wk.cyl(0.06, 1.2, PINK, 0, -0.6, 0, { seg: 8 });
    wk.cyl(0.08, 0.3, 0xfdd835, 0, -0.05, 0, { seg: 8 }); // handle
    wk.torus(0.32, 0.05, PINK, 0, -1.55, 0, { rx: PI / 2, seg: 18 });
    wk.torus(0.28, 0.025, soap, 0, -1.55, 0, { rx: PI / 2, seg: 18 }); // the soap film
    wk.done();
    const b = fist(h.leftArm, -1.9, 1.0);
    const bk = wear(h, b, `${key}:bottle`);
    bk.cyl(0.24, 0.6, 0x80deea, 0, -0.25, 0.1, { seg: 12 });
    bk.cyl(0.12, 0.16, PINK, 0, 0.12, 0.1, { seg: 10 });
    bk.box(0.3, 0.25, 0.02, 0xfafafa, 0, -0.25, 0.35);
    bk.done();
    muzzle(h, w, -1.6, 0);
    h.rightArm.rotation.set(-PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-0.3, 0, -0.2);
    h.pose = { right: -PI / 2, left: -0.3, leftRecoil: 0 };
  }
  h.tracer = SOAP;
  h.tracerWidth = 0.3;
  return own(h, level >= 2 ? UP : 0);
}

// ------------------------------------------------------------------ Operator (evolved Scout)

/**
 * Operator (evolved Scout): a black-ops soldier in a high-cut helmet with night-vision goggles and
 * a suppressed rifle. Lv 1 Tactical Gear: a plate carrier, knee pads and a weapon light, Lv 2 a
 * radio pack, a comms headset and a red-dot, Lv 3 Cyber-Enforcer: a balaclava and glowing arm
 * braces, Lv 4 Threat Sentinel: cyan lenses, a chest light strip and a scope, Lv 5 Synchronized
 * Vision: four-eyed goggles and a sensor pod on the shoulder, Lv 6 1000-THR E.M.: an E.M. coil
 * pack and glowing rails on the rifle.
 */
export function makeOperator(level) {
  const cyber = level >= 3;
  const sentinel = level >= 4;
  const em = level >= 6;
  const shirt = 0x2a3038;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x1c2026, arms: shirt, face: 'soldier' });
  const key = `evoOperator${level}`;
  const cyan = glowMat(h, EVO);
  const lens = sentinel ? cyan : glowMat(h, 0x76ff03);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (cyber) balaclava(hd, 0x111418);
  // a high-cut helmet: shell, side rails, a cover band and a Velcro patch
  const shell = 0x2b3038;
  dome(hd, 0.76, 0.56, shell, 0, 0.94, 0);
  hd.torus(0.75, 0.04, tone(shell, 0.8), 0, 0.95, 0, { rx: PI / 2, seg: 20 });
  for (const s of [-1, 1]) {
    hd.box(0.08, 0.14, 0.8, INK, s * 0.73, 1.1, -0.02, { rz: s * 0.25 }); // rails
    hd.box(0.08, 0.1, 0.12, STEEL, s * 0.75, 1.1, 0.3, { rz: s * 0.25 });
  }
  hd.box(0.4, 0.24, 0.05, tone(shell, 1.3), 0, 1.35, -0.55, { rx: -0.6 }); // patch
  hd.box(0.3, 0.1, 0.06, 0xff1744, 0, 1.3, -0.6, { rx: -0.6 }); // IR strobe
  if (level >= 5) {
    // four-eyed goggles, flipped down
    hd.box(0.34, 0.24, 0.16, INK, 0, 1.18, 0.72, { r: 0.03 });
    hd.box(0.86, 0.26, 0.24, 0x263238, 0, 0.86, 0.76, { r: 0.05 });
    for (const x of [-0.33, -0.12, 0.12, 0.33]) {
      hd.cyl(0.09, 0.3, 0x263238, x, 0.86, 0.94, { axis: 'z', seg: 10 });
      hd.cyl(0.07, 0.02, lens, x, 0.86, 1.1, { axis: 'z', seg: 10 });
    }
  } else nvg(hd, lens);
  if (level >= 2) {
    // comms: ear cups over the helmet sides and a mic boom
    for (const s of [-1, 1]) {
      hd.cyl(0.26, 0.18, 0x2b2b2b, s * 0.72, 0.62, 0, { axis: 'x', seg: 14 });
      hd.cyl(0.18, 0.05, INK, s * 0.82, 0.62, 0, { axis: 'x', seg: 12 });
    }
    hd.tube([[-0.74, 0.55, 0.1], [-0.6, 0.38, 0.45], [-0.3, 0.32, 0.66]], 0.03, INK, { seg: 8, sides: 4 });
  }
  collar(t, tone(shirt, 0.85), { buttons: false });
  belt(t, 0x111418, 0x5a5f66);
  pouch(t, 0.7, -1.02, 0.56, 0.36, 0.34, 0x2e3440, 0.2);
  if (level >= 1) {
    vest(t, 0x3b4350, { pouches: 3, pouch: 0x2e3440 });
    evoBadge(t, cyan, 0.45, 0.62, 0.68);
  } else evoBadge(t, cyan, 0.5, 0.45, 0.52);
  if (level >= 2) {
    pack(t, 0x2a2e35, { w: 1.1, h: 1.1, d: 0.42 });
    radio(t, 0.32, 0.55, -1.05, 0x2b3038, 2.0);
  }
  if (sentinel) {
    // the sentinel light strip across the chest and a light on the shoulder strap
    t.box(1.5, 0.08, 0.04, cyan, 0, 0.88, 0.68);
    t.cyl(0.1, 0.16, INK, -0.55, 0.98, 0.62, { axis: 'z', seg: 10 });
    t.cyl(0.07, 0.02, cyan, -0.55, 0.98, 0.71, { axis: 'z', seg: 10 });
  }
  if (level >= 5) {
    // a sensor pod on the left shoulder: a little dome with a glowing eye
    t.box(0.5, 0.2, 0.5, INK, 1.3, 1.05, 0, { r: 0.05 });
    dome(t, 0.28, 0.3, 0x37474f, 1.3, 1.15, 0);
    t.cyl(0.08, 0.05, cyan, 1.3, 1.3, 0.24, { axis: 'z', seg: 10, rx: -0.3 });
    antenna(t, 1.45, 1.15, -0.15, 0.6);
  }
  if (em) {
    // the E.M. pack: two coils with glowing caps on the back of the pack
    for (const x of [-0.6, -0.15]) {
      coil(t, x, 1.0, -1.05, 0.22, 0.7, 4);
      t.ball(0.12, cyan, x, 1.45, -1.05, { seg: 8, rows: 6 });
    }
  }
  hd.done();
  t.done();
  hands(h, key, 0x16181a, tone(shirt, 0.8), (a, s) => {
    armPatch(a, s, 0x2e3440, s > 0 ? 0x5a5f66 : null);
    if (cyber) {
      a.box(1.1, 0.45, 1.1, 0x263238, 0, -1.15, 0, { r: 0.06 }); // arm brace
      a.box(1.12, 0.06, 1.12, cyan, 0, -1.05, 0);
    }
    if (em) a.box(1.08, 0.08, 1.08, cyan, 0, -0.5, 0);
  });
  feet(h, key, 0x111111, level >= 1 ? (b) => kneePad(b, 0x262b33) : null);
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = rifle(gk, {
    len: 2.35, body: 0x1b1e22, furn: 0x2b3038, mag: 'box', can: true,
    optic: level >= 4 ? 'scope' : level >= 2 ? 'dot' : 'iron', lens: sentinel ? cyan : 0xff5252,
    light: level >= 1, glow: em ? cyan : null,
  });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = sentinel ? EVO : 0xffe066;
  return own(h);
}

// ------------------------------------------------------------------ Breacher (evolved Shotgunner)

/**
 * Breacher (evolved Shotgunner): a navy SWAT officer with a pump shotgun. Lv 1 gloves, Lv 2
 * flashbangs on the vest, Lv 3 knee pads and a thigh holster, Lv 4 a breaching ram on the back.
 * Top path: Lv 5 Good Coms: a headset and a boxy full-auto shotgun, Lv 6 Full Arsenal: a drum
 * and spare drums on the belt, Lv 7 Punisher: a red-eyed mask and a red chest plate. Bottom path: Lv 5
 * SWAT Van: a riot helmet and a tactical shotgun, Lv 6 Full Suit: heavy armour all over, Lv 7
 * Peacekeeper: a blue chest light and a riot shield on the back.
 */
export function makeBreacher(level, bottom = false) {
  const top = !bottom && level >= 5;
  const bot = bottom && level >= 5;
  const suit = bot && level >= 6;
  const navy = 0x0d1b2a;
  const h = makeHumanoid({ skin: 0xd2a679, shirt: navy, pants: 0x0b1520, arms: navy, face: 'soldier' });
  const key = `evoBreacher${top ? 'T' : bot ? 'B' : ''}${level}`;
  const cyan = glowMat(h, EVO);
  const red = glowMat(h, 0xff1744);
  const blue = glowMat(h, 0x40c4ff);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (bot) riotHelmet(hd, 0x111a24, glassMat(h, 0x90caf9, 0.5));
  else {
    if (top && level >= 7) balaclava(hd, 0x111111);
    helmet(hd, 0x14202e, { cover: 0x1b263b });
    goggles(hd, 0.76, top && level >= 7 ? red : 0x90caf9, { r: 0.7, frame: 0x111111 });
    hd.box(0.7, 0.16, 0.04, 0xfafafa, 0, 1.18, 0.66, { rx: -0.5 }); // SWAT strip on the helmet
  }
  if (top) {
    // Good Coms: a headset over the helmet with a boom mic
    for (const s of [-1, 1]) hd.cyl(0.26, 0.18, 0x2b2b2b, s * 0.74, 0.62, 0, { axis: 'x', seg: 14 });
    hd.tube([[-0.76, 0.55, 0.1], [-0.6, 0.38, 0.45], [-0.3, 0.32, 0.68]], 0.03, INK, { seg: 8, sides: 4 });
    antenna(hd, -0.75, 0.8, -0.2, 0.7);
  }
  if (bot && level >= 7) hd.box(1.0, 0.06, 0.06, blue, 0, 1.36, 0.42, { rx: -0.6 });
  collar(t, tone(navy, 0.85), { buttons: false });
  vest(t, 0x1b263b, { pouches: 3, pouch: 0x14202e });
  for (const z of [0.68, -0.68]) {
    // white SWAT bands front and back, with the letters
    t.box(1.5, 0.3, 0.04, 0xfafafa, 0, 0.56, z, { r: 0.02 });
    for (let i = 0; i < 4; i++) t.box(0.16, 0.18, 0.03, navy, -0.42 + i * 0.28, 0.56, z * 1.03);
  }
  evoBadge(t, cyan, -0.5, 0.15, 0.7);
  if (level >= 2) for (const x of [0.4, 0.68]) {
    // flashbangs: a can with holes, a spoon and a ring
    t.cyl(0.13, 0.42, 0x9e9e9e, x, 0.12, 0.84, { seg: 10 });
    for (const y of [0.0, 0.2]) t.torus(0.135, 0.02, INK, x, y, 0.84, { rx: PI / 2, seg: 10 });
    t.box(0.06, 0.3, 0.04, STEEL, x + 0.1, 0.25, 0.98);
    t.torus(0.06, 0.015, 0xbdbdbd, x - 0.08, 0.4, 0.84, { seg: 8 });
  }
  if (level >= 4) {
    // a breaching ram on the back: a heavy tube with two handles
    t.cyl(0.24, 1.9, 0x37474f, 0.1, 0.2, -0.82, { seg: 14, rz: 0.35 });
    t.cyl(0.27, 0.3, INK, 0.1 - Math.sin(0.35) * 0.85, 0.2 + Math.cos(0.35) * 0.85, -0.82, { seg: 14, rz: 0.35 });
    for (const d of [-0.3, 0.3]) t.tube([[0.1 - Math.sin(0.35) * d, 0.2 + Math.cos(0.35) * d, -1.05], [0.1 - Math.sin(0.35) * d, 0.2 + Math.cos(0.35) * d, -1.3]], 0.05, INK, { seg: 2, sides: 5 });
  }
  if (top && level >= 6) for (const x of [-0.45, 0.45]) {
    // spare drums on the back of the belt
    t.cyl(0.34, 0.26, INK, x, -0.75, -0.8, { axis: 'z', seg: 18 });
    t.cyl(0.12, 0.3, STEEL, x, -0.75, -0.8, { axis: 'z', seg: 10 });
  }
  if (top && level >= 7) {
    // Punisher: a red glowing chest plate with a skull
    t.box(0.7, 0.7, 0.06, 0x212121, 0, -0.05, 0.74, { r: 0.05 });
    t.ball(0.2, red, 0, 0.0, 0.78, { sy: 1.1, seg: 10, rows: 7 });
    t.box(0.24, 0.12, 0.05, red, 0, -0.22, 0.78);
  }
  if (suit) {
    // Full Suit: big shoulder plates, a thick chest plate and a groin flap
    shoulderPads(t, 0x1b263b, 0.72);
    t.box(1.8, 0.9, 0.24, 0x1b263b, 0, 0.0, 0.82, { r: 0.1 });
    t.box(0.9, 0.5, 0.16, 0x1b263b, 0, -1.1, 0.62, { r: 0.06 });
    t.box(1.0, 0.2, 0.04, 0xfafafa, 0, 0.2, 0.95);
  }
  if (bot && level >= 7) {
    // Peacekeeper: a blue chest light and a riot shield across the back
    t.cyl(0.24, 0.08, blue, 0, -0.25, 0.96, { axis: 'z', seg: 16 });
    t.box(1.9, 2.4, 0.12, 0x263238, 0, 0.0, -1.0, { r: 0.08 });
    t.box(1.5, 0.9, 0.06, glassMat(h, 0x90caf9, 0.45), 0, 0.55, -1.07);
    t.box(1.2, 0.2, 0.04, 0xfafafa, 0, -0.4, -1.08);
  }
  shellBelt(t, 0x111111, 5);
  hd.done();
  t.done();
  hands(h, key, level >= 1 ? 0x111111 : null, tone(navy, 0.8), (a, s) => {
    armPatch(a, s, 0x1b263b, s > 0 ? 0xfafafa : null);
    if (suit) a.box(1.14, 0.6, 1.14, 0x1b263b, 0, -1.1, 0, { r: 0.1 });
  });
  for (const [leg, s] of [[h.rightLeg, -1], [h.leftLeg, 1]]) {
    const b = wear(h, leg, `${key}:leg${s}`);
    boots(b, 0x111111);
    if (level >= 3) kneePad(b, 0x1b263b);
    if (level >= 3 && s < 0) {
      // a drop-leg holster with a pistol in it
      b.box(0.2, 0.7, 0.55, INK, -0.56, -0.5, 0.05, { r: 0.04 });
      b.box(0.16, 0.3, 0.3, 0x212121, -0.58, -0.05, -0.1, { r: 0.04 });
      for (const y of [-0.3, -0.75]) b.box(1.06, 0.08, 1.06, INK, 0, y, 0);
    }
    if (suit) b.box(1.12, 0.9, 1.12, 0x1b263b, 0, -0.5, 0.02, { r: 0.1 });
    b.done();
  }
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = shotgun(gk, {
    len: top ? 2.3 : bot ? 2.35 : 2.15, metal: 0x1a1a1a, wood: 0x263238, pump: 0x37474f,
    kind: top ? 'aa12' : null, tac: true, rail: true, drum: (top && level >= 6) || (bot && level >= 6),
    light: top && level >= 7 ? red : bot ? (level >= 7 ? blue : 0xfff3b0) : level >= 3 ? 0xfff3b0 : null,
  });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = 0xffab40;
  return own(h);
}

// ------------------------------------------------------------------ Kingpin (evolved Crook Boss)

/** A gold chain over the chest with a round K medallion (torso space). */
function goldChain(k, mat, glowK) {
  k.tube([[-0.55, 0.98, 0.3], [-0.42, 0.55, 0.56], [0, 0.25, 0.62], [0.42, 0.55, 0.56], [0.55, 0.98, 0.3]], 0.05, mat, { seg: 20, sides: 5 });
  k.cyl(0.24, 0.06, mat, 0, 0.1, 0.62, { axis: 'z', seg: 18 });
  k.box(0.06, 0.28, 0.04, glowK, -0.06, 0.1, 0.66); // the K
  k.box(0.06, 0.18, 0.04, glowK, 0.04, 0.16, 0.66, { rz: -0.7 });
  k.box(0.06, 0.18, 0.04, glowK, 0.04, 0.04, 0.66, { rz: 0.7 });
}

/**
 * Kingpin (evolved Crook Boss): a mob boss in a purple pinstripe suit and a fedora with a gold
 * band, one gold pistol. Lv 1 Hat Trick: a feather, shades and a gold watch, Lv 2 Mafia
 * Expansion: a tommy gun and a gold chain, Lv 3 High Roller: a cigar, gold rings and a waistcoat.
 * Top path: Lv 4 Bounty Hunter: a long gold-trim rifle and a bounty star, Lv 5 Flashy Business:
 * a long fur-collared coat, Lv 6 LV. 999 BOSS: a white hat and shining gold. Bottom path: Lv 4 Underworld Backup: a
 * syndicate belt and a drum tommy gun, Lv 5 shoulder holsters, Lv 6 Golden Syndicate: a gold suit
 * trim and a gold tommy gun.
 */
export function makeKingpin(level, bottom = false) {
  const top = !bottom && level >= 4;
  const bot = bottom && level >= 4;
  const boss = level >= 6;
  const suitC = 0x311b92;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: suitC, pants: 0x1a1040, arms: suitC, face: 'soldier' });
  const key = `evoKingpin${top ? 'T' : bot ? 'B' : ''}${level}`;
  const cyan = glowMat(h, EVO);
  const gold = boss ? glowMat(h, 0xffc400, 0.35) : GOLD;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  fedora(hd, top && boss ? 0xfafafa : 0x1a1040, GOLD, { feather: level >= 1 ? 0xab47bc : null });
  for (const s of [-1, 1]) hd.box(0.06, 0.3, 0.2, 0x1a1209, s * 0.63, 0.75, 0.15); // sideburns
  hd.box(0.36, 0.06, 0.05, 0x1a1209, 0, 0.4, 0.63); // moustache
  if (level >= 1) shades(hd, GOLD, 0x111111);
  if (level >= 3) cigar(hd, glowMat(h, 0xff6d00));
  suitJacket(t, suitC, { shirt: 0x212121, tie: GOLD, square: GOLD, stripe: 0x7e57c2, vest: level >= 3 ? GOLD : null });
  evoBadge(t, cyan, -0.62, 0.5, 0.58);
  if (level >= 2) goldChain(t, gold, cyan);
  if (top) {
    // a bounty star badge on the chest
    const star = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * PI * 2;
      const r = i % 2 ? 0.12 : 0.28;
      star.push([Math.sin(a) * r, Math.cos(a) * r]);
    }
    t.plan(star, 0.06, gold, 0.6, 0.15, 0.56, { rx: PI / 2 });
  }
  if (bot) {
    // the syndicate belt: wide gold with a purple gem
    t.box(2.14, 0.3, 1.14, gold, 0, -0.86, 0, { r: 0.04 });
    t.box(0.5, 0.4, 0.08, gold, 0, -0.86, 0.58, { r: 0.04 });
    t.ball(0.12, glowMat(h, 0xd500f9), 0, -0.86, 0.63, { seg: 10, rows: 6 });
  } else belt(t, 0x111111, GOLD, -0.86);
  if (top && level >= 5) {
    // Flashy Business: a long coat with a white fur collar
    duster(t, 0x24145e, { trim: GOLD });
    for (let i = 0; i < 9; i++) {
      const a = -1.2 + i * 0.3;
      t.ball(0.2, 0xf5f5f5, Math.sin(a) * 1.0, 1.0 + Math.cos(a) * 0.1, Math.cos(a) * 0.45 - 0.05, { seg: 8, rows: 6 });
    }
  }
  if (bot && level >= 5) {
    // shoulder holsters with spare pistols under the arms
    for (const s of [-1, 1]) {
      t.box(0.2, 1.3, 1.16, INK, s * 0.88, 0.35, 0, { rz: s * 0.1 });
      t.box(0.24, 0.6, 0.4, 0x3e2723, s * 1.05, -0.05, 0.1, { r: 0.04 });
      t.box(0.2, 0.25, 0.3, 0x212121, s * 1.06, 0.3, -0.1, { r: 0.03 });
    }
  }
  hd.done();
  t.done();
  cuffs(h, key, 0xfafafa, tone(suitC, 0.85), GOLD);
  // gold rings on the fingers from High Roller
  if (level >= 3) for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:rings${s}`);
    a.box(1.04, 0.1, 1.04, tone(suitC, 0.85), 0, -0.7, 0); // a seam, so the rig reads the rings as the hand
    for (const z of [0.2, -0.1]) a.torus(0.12, 0.04, GOLD, s * 0.5, -1.82, z, { ry: PI / 2, seg: 10 });
    a.done();
  }
  shoes(h, key, 0x111111, { pants: 0x1a1040, spat: 0xeeeeee });
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, top ? 1.35 : level >= 2 ? 1.2 : 1.3);
  const gk = wear(h, g, `${key}:gun`);
  let tip;
  if (top) {
    tip = boltRifle(gk, { len: 2.8, wood: 0x6a1b9a, metal: boss ? 0xffc400 : 0xb8860b, brake: true, scope: 0.9, lens: EVO });
    for (const y of [0.3, -0.95]) gk.box(0.34, 0.08, 0.46, GOLD, 0, y, UP - 0.06); // gold bands
  }
  else if (level >= 2) tip = tommyGun(gk, { metal: bot && boss ? 0xffc400 : GUNMETAL, wood: 0x4e342e, trim: GOLD });
  else tip = pistol(gk, { len: 1.05, body: 0x37474f, grip: 0x4a148c, trim: GOLD });
  if (bot) {
    // a drum on the tommy gun
    gk.cyl(0.5, 0.26, GOLD, 0, -0.6, UP - 0.52, { axis: 'x', seg: 22 });
  }
  gk.done();
  muzzle(h, g, tip[0], tip[1]);
  if (level >= 2) {
    aimLong(h);
    h.recoilScale = 0.4;
  } else {
    h.rightArm.rotation.set(-PI / 2, 0, 0.05);
    h.leftArm.rotation.set(-0.3, 0, -0.15);
    h.pose = { right: -PI / 2, left: -0.3, leftRecoil: 0 };
  }
  h.tracer = boss ? 0xffd740 : 0xffca28;
  return own(h, level >= 2 ? UP : 0.3);
}

// ------------------------------------------------------------------ Titan (evolved Minigunner)

/**
 * Titan (evolved Minigunner): a giant in gunmetal bomb-suit armour with a cyan visor and a
 * minigun. Lv 1 gloves, Lv 2 shoulder plates and a chest core, Lv 3 longer barrels and a glowing
 * ammo pack. Top path: Lv 4 Fortifier: a tower shield on the back and a spinning Fortify emitter,
 * Lv 5 cyan-trimmed pauldrons, Lv 6 Flak Jacket: quilted flak panels, Lv 7 Hammerhead: a hammer
 * crest on the helmet. Bottom path: Lv 4 Experimental Weaponry: a ten-barrel minigun with red
 * special rounds, Lv 5 Bigger Guns: two of them, Lv 6 Titanium Armor: silver plates, Lv 7
 * Thresher: red glow strips and spikes.
 */
export function makeTitan(level, bottom = false) {
  const top = !bottom && level >= 4;
  const bot = bottom && level >= 4;
  const ti = bot && level >= 6;
  const plate = ti ? 0xb0bec5 : 0x455a64;
  const h = makeHumanoid({ skin: 0xc68642, shirt: 0x263238, pants: 0x1c2429, arms: 0x263238, face: 'soldier' });
  h.body.scale.setScalar(1.3);
  const key = `evoTitan${top ? 'T' : bot ? 'B' : ''}${level}`;
  const cyan = glowMat(h, EVO);
  const red = glowMat(h, 0xff1744);
  const accent = bot ? red : cyan;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // the helmet: a big round shell, a visor band, a neck collar and vents
  dome(hd, 0.84, 0.82, plate, 0, 0.7, -0.04);
  hd.cyl(0.84, 0.72, plate, 0, 0.34, -0.04, { seg: 24 });
  hd.torus(0.82, 0.14, tone(plate, 0.75), 0, 0.0, -0.04, { rx: PI / 2, seg: 22 });
  band(hd, 0.87, 0.06, 0.22, 2.0, tone(plate, 0.6), 0.74);
  band(hd, 0.9, 0.04, 0.14, 1.7, level >= 4 ? accent : cyan, 0.74); // visor
  for (const s of [-1, 1]) hd.cyl(0.18, 0.14, tone(plate, 0.7), s * 0.86, 0.5, -0.04, { axis: 'x', seg: 12 });
  for (let i = 0; i < 4; i++) hd.box(0.4, 0.04, 0.06, INK, 0, 0.38 - i * 0.07, 0.84); // breathing grille
  if (top && level >= 7) {
    // Hammerhead: a wide hammer crest across the top
    hd.box(0.2, 0.4, 0.5, tone(plate, 0.8), 0, 1.6, -0.05, { r: 0.05 });
    hd.box(1.9, 0.32, 0.4, plate, 0, 1.9, -0.05, { r: 0.1 });
    for (const s of [-1, 1]) hd.box(0.08, 0.2, 0.42, cyan, s * 0.95, 1.9, -0.05);
  } else hd.box(0.14, 0.3, 0.95, tone(plate, 0.8), 0, 1.52, -0.1, { r: 0.04 }); // crest
  if (bot && level >= 7) for (const x of [-0.4, 0, 0.4]) hd.cyl(0.1, 0.4, STEEL, x, 1.7, -0.1, { seg: 6, r2: 0.01 });
  // the armoured suit
  t.box(2.26, 1.32, 1.26, plate, 0, 0.32, 0, { r: 0.2 });
  for (let i = 0; i < 3; i++) t.box(2.2, 0.2, 1.22, tone(plate, 0.82), 0, -0.45 - i * 0.24, 0, { r: 0.06 });
  t.box(0.8, 0.5, 0.14, tone(plate, 0.8), 0, -1.05, 0.56, { r: 0.05 });
  evoBadge(t, cyan, -0.6, 0.62, 0.66);
  if (level >= 2) core(t, tone(plate, 0.6), accent, 0.3);
  ammoPack(t, bot ? 0x3e2723 : 0x37474f, { glow: level >= 3 ? accent : null });
  if (level >= 2) shoulderPads(t, plate, top && level >= 5 ? 0.8 : 0.68);
  if (top && level >= 5) for (const s of [-1, 1]) t.torus(0.62, 0.05, cyan, s * 1.45, 0.82, 0, { rx: PI / 2, seg: 18 });
  if (top && level >= 6) {
    // Flak Jacket: quilted panels over the chest
    for (const s of [-1, 1]) {
      t.box(0.85, 1.1, 1.32, 0x4e5b31, s * 0.7, 0.35, 0, { r: 0.14 });
      for (const y of [0.05, 0.35, 0.65]) t.box(0.88, 0.05, 1.36, 0x3e4a2a, s * 0.7, y, 0);
    }
    pouch(t, 0.7, -0.3, 0.62, 0.42, 0.4, 0x3e4a2a, 0.2);
  }
  if (top) {
    // Fortifier: a tower shield on the back, with rivets and a cyan stripe
    t.box(2.6, 2.6, 0.16, 0x546e7a, 0, 0.1, -1.55, { r: 0.12 });
    t.box(2.3, 2.3, 0.06, 0x455a64, 0, 0.1, -1.66, { r: 0.08 });
    t.box(0.18, 2.2, 0.04, cyan, 0, 0.1, -1.7);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) t.ball(0.07, STEEL, sx * 1.1, 0.1 + sy * 1.1, -1.66, { seg: 6, rows: 4 });
  }
  if (bot && level >= 7) {
    // Thresher: red strips down the chest and spikes on the shoulders
    for (const s of [-1, 1]) t.box(0.08, 1.1, 0.04, red, s * 0.7, 0.3, 0.64);
    for (const s of [-1, 1]) for (const dz of [-0.3, 0.3]) t.cyl(0.1, 0.45, STEEL, s * 1.45, 1.4, dz, { seg: 6, r2: 0.01 });
  }
  hd.done();
  t.done();
  if (top) {
    // the Fortify emitter: a ring of nodes turning on a mast over the shield
    const mk = wear(h, h.torso, `${key}:mast`);
    mk.cyl(0.08, 1.1, INK, 0.9, 1.75, -1.55, { seg: 8 });
    mk.done();
    const em = spinner(h, h.torso, 0.9, 2.35, -1.55);
    const ek = wear(h, em, `${key}:emitter`);
    ek.cyl(0.18, 0.2, 0x37474f, 0, 0, 0, { seg: 12 });
    ek.torus(0.42, 0.04, cyan, 0, 0.05, 0, { rx: PI / 2, seg: 20 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2;
      ek.box(0.4, 0.06, 0.08, INK, Math.cos(a) * 0.22, 0.05, Math.sin(a) * 0.22, { ry: -a });
      ek.ball(0.09, cyan, Math.cos(a) * 0.42, 0.05, Math.sin(a) * 0.42, { seg: 8, rows: 5 });
    }
    ek.done();
    h.idleSpin = 1.2;
  }
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    boots(b, 0x212121);
    b.box(1.1, 1.0, 1.1, plate, 0, -0.75, 0.02, { r: 0.12 });
    b.box(0.9, 0.5, 0.22, tone(plate, 0.8), 0, -1.0, 0.56, { r: 0.08 });
    b.done();
  }
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    armPlate(a, plate);
    a.box(1.1, 0.5, 1.1, tone(plate, 0.85), 0, -1.1, 0, { r: 0.08 });
    if (level >= 3) a.box(1.12, 0.06, 1.12, accent, 0, -0.95, 0);
    if (level >= 1) glove(a, 0x212121);
    a.done();
  }
  h.muzzles = [];
  const dual = bot && level >= 5;
  const o = {
    s: 1.25, len: level >= 3 ? 2.1 : 1.6, r: bot ? 0.3 : 0.24, n: bot ? 10 : 6, body: bot ? 0x37474f : 0x424242,
    barrel: bot ? 0x2b2b2b : level >= 6 ? cyan : 0x1f1f1f, glow: level >= 3 ? accent : null,
  };
  minigun(h, h.rightArm, `${key}:mg`, o);
  if (dual) {
    minigun(h, h.leftArm, `${key}:mg`, o);
    h.rightArm.rotation.set(-PI / 2, 0, 0.08);
    h.leftArm.rotation.set(-PI / 2, 0, -0.08);
    h.pose = { right: -PI / 2, left: -PI / 2, leftRecoil: 0.1 };
  } else {
    h.rightArm.rotation.set(-PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-PI / 2 + 0.1, 0, -0.5);
    h.pose = { right: -PI / 2, left: -PI / 2 + 0.1, leftRecoil: 0.1 };
  }
  h.recoilScale = 0.2;
  h.tracer = bot ? 0xff5252 : level >= 4 ? EVO : 0xffd740;
  return own(h);
}

export const MODELS = {
  spotlight: makeSpotlightTech,
  eventCommandoPsycho: makePsychoSlayer,
  cryomancerBubble: makeBubbleBlower,
  evoOperator: makeOperator,
  evoBreacher: (level) => makeBreacher(level),
  evoBreacherBottom: (level) => makeBreacher(level, true),
  evoKingpin: (level) => makeKingpin(level),
  evoKingpinBottom: (level) => makeKingpin(level, true),
  evoTitan: (level) => makeTitan(level),
  evoTitanBottom: (level) => makeTitan(level, true),
};
