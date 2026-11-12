// Tower models: people, batch 8 (dressed with the vehicle kit in ../vehicles.js).
// In here: Shotgunner, Pump Shotgunner, Combat Shotgunner (+bottom), Pyromancer, Plasma Trooper,
// Pulse Trooper, Electroshocker.
// Each makeX(level) builds one tower's look; TOWER_MODELS in ../models.js says which tower uses which.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.

import * as THREE from 'three';
import { glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import {
  GOLD, GUNMETAL, INK, STEEL, UP, WOOD, aimLong, armPatch, band, belt, cap, collar, cowboyHat, dome, fist, goggles,
  hair, helmet, kneePad, muzzle, own, pouch, shardOf, vest, wear,
} from './people1.js';
import { beret, duster, shoulderPads } from './people2.js';
import { feet, glassMat, hands, peakedCap, riotHelmet } from './people5.js';
import { hardHat } from './people6.js';
import { flameWand, fuelTanks, gasMask } from './people7.js';
import { spinner } from './machines5.js';

const PI = Math.PI;
const SHELL = 0xd32f2f;
const COPPER = 0xb87333;

// ------------------------------------------------------------------ shared bits for this batch

/**
 * A shotgun on the fist (gun space): receiver, barrel over a tube magazine, a ribbed pump and a
 * bead sight. o: len, wood, metal, tac (pistol grip and a skeleton stock), drum, light, rail,
 * kind ('aa12': a boxy auto with a drum, 'db12': a bulky bullpup with twin tubes on top).
 * Returns the bore point [y, z].
 */
function shotgun(k, o = {}) {
  const len = o.len ?? 2.1;
  const metal = o.metal ?? GUNMETAL;
  const wood = o.wood ?? WOOD;
  const U = UP;
  const B = U + 0.08;
  if (o.kind === 'db12') {
    k.box(0.42, 1.7, 0.6, 0x263238, 0, -0.35, U, { r: 0.08 }); // bullpup body
    k.box(0.44, 0.3, 0.64, INK, 0, 0.5, U - 0.02, { r: 0.04 }); // butt pad
    for (const s of [-1, 1]) k.cyl(0.1, 1.5, 0x37474f, s * 0.13, -0.5, U + 0.42, { seg: 10 }); // twin tubes
    k.box(0.4, 0.12, 1.6, INK, 0, -0.5, U + 0.56, { rx: PI / 2 }); // top rail
    k.cyl(0.08, len - 1.1, STEEL, 0, -1.2 - (len - 1.1) / 2 + 0.1, B, { seg: 10 });
    k.box(0.22, 0.26, 0.5, INK, 0, -0.5, U - 0.4, { rx: -0.3, r: 0.04 });
    k.cyl(0.07, 0.03, o.light ?? 0x40c4ff, 0, -1.22, U + 0.42, { seg: 10 });
    return [-len, B];
  }
  if (o.kind === 'aa12') {
    k.box(0.36, 1.3, 0.46, metal, 0, -0.3, U, { r: 0.05 }); // boxy receiver
    k.box(0.12, 0.9, 0.14, INK, 0, -0.3, U + 0.3); // carry handle
    for (const y of [0.1, -0.7]) k.box(0.12, 0.08, 0.2, INK, 0, y, U + 0.2);
    k.cyl(0.4, 0.3, INK, 0, -0.55, U - 0.5, { axis: 'x', seg: 16 }); // drum
    k.cyl(0.42, 0.06, 0x424242, 0.16, -0.55, U - 0.5, { axis: 'x', seg: 16 });
  } else {
    k.box(0.3, 0.9, 0.36, metal, 0, -0.25, U, { r: 0.04 }); // receiver
    k.box(0.04, 0.3, 0.14, INK, 0.16, -0.3, U + 0.05); // ejection port
  }
  k.cyl(0.075, len - 0.6, metal, 0, -0.65 - (len - 0.6) / 2 + 0.05, B, { seg: 10 }); // barrel
  k.cyl(0.065, len - 0.95, tone(metal, 0.8), 0, -0.65 - (len - 0.95) / 2, U - 0.1, { seg: 10 }); // tube magazine
  k.cyl(0.08, 0.04, 0x050505, 0, -len - 0.01, B, { seg: 10 });
  k.ball(0.04, 0xe0e0e0, 0, -len + 0.08, B + 0.09, { seg: 6, rows: 4 }); // bead sight
  // the pump: a ribbed forend round the tube
  k.box(0.28, 0.6, 0.3, o.pump ?? wood, 0, -1.05, U - 0.06, { r: 0.07 });
  for (let i = 0; i < 4; i++) k.box(0.3, 0.04, 0.32, tone(o.pump ?? wood, 0.7), 0, -0.85 - i * 0.13, U - 0.06);
  k.torus(0.1, 0.022, INK, 0, -0.12, U - 0.22, { ry: PI / 2, seg: 10, arc: PI }); // trigger guard
  if (o.tac) {
    k.box(0.22, 0.26, 0.5, INK, 0, 0.12, U - 0.34, { rx: -0.3, r: 0.04 });
    k.tube([[0, 0.25, U + 0.05], [0, 0.85, U + 0.05], [0, 0.85, U - 0.3], [0, 0.4, U - 0.25]], 0.035, INK, { seg: 12, sides: 4 });
    k.box(0.28, 0.08, 0.42, INK, 0, 0.9, U - 0.12, { r: 0.02 }); // butt plate
  } else {
    k.slab(0.26, 0.7, 0.32, wood, 0, 0.45, U - 0.12, { td: 1.5, tz: -0.08 }); // stock
    k.box(0.28, 0.06, 0.5, INK, 0, 0.82, U - 0.16);
  }
  if (o.rail) k.box(0.14, 0.7, 0.06, INK, 0, -0.3, U + 0.2);
  if (o.drum) k.cyl(0.36, 0.28, INK, 0, -0.5, U - 0.45, { axis: 'x', seg: 16 });
  if (o.light) {
    k.cyl(0.08, 0.3, INK, 0.2, -1.4, U - 0.04, { seg: 10 });
    k.cyl(0.065, 0.02, o.light, 0.2, -1.56, U - 0.04, { seg: 10 });
  }
  return [-len, B];
}

/** A strap of red shotgun shells across the chest (torso space; side as in sash). */
function shellStrap(k, side, strap = 0x4e342e, n = 7) {
  const rz = side * 0.62;
  k.box(0.32, 2.5, 1.12, strap, 0, 0, 0, { rz });
  for (let i = 0; i < n; i++) {
    const t = -0.9 + (i * 1.8) / (n - 1);
    const x = -Math.sin(rz) * t;
    const y = Math.cos(rz) * t;
    k.cyl(0.07, 0.24, SHELL, x, y, 0.62, { rz: rz + PI / 2, seg: 8 });
    k.cyl(0.075, 0.07, GOLD, x + Math.cos(rz) * 0.12, y + Math.sin(rz) * 0.12, 0.62, { rz: rz + PI / 2, seg: 8 }); // brass base
  }
}

/** A row of shells in loops on the belt (torso space). */
function shellBelt(k, col, n = 5) {
  belt(k, col, 0x9e9e9e, -0.86);
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.32;
    k.cyl(0.07, 0.26, SHELL, x, -0.62, 0.6, { seg: 8 });
    k.cyl(0.075, 0.07, GOLD, x, -0.78, 0.6, { seg: 8 });
  }
}

/** A medkit pack: white box, red cross, straps (torso space). */
function medkit(k) {
  k.box(1.2, 1.1, 0.5, 0xeeeeee, 0, 0.1, -0.85, { r: 0.08 });
  k.box(0.7, 0.2, 0.04, SHELL, 0, 0.1, -1.11);
  k.box(0.2, 0.7, 0.04, SHELL, 0, 0.1, -1.11);
  for (const s of [-1, 1]) {
    k.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
    k.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
  }
}

/** A fire helmet: dome, long back brim, ridge comb and a front shield (head space). */
function fireHelmet(k, col, shield) {
  dome(k, 0.78, 0.66, col, 0, 0.92, 0);
  k.cyl(0.95, 0.06, col, 0, 0.92, -0.18, { seg: 22, sz: 1.2 }); // brim, longer at the back
  k.box(0.14, 0.18, 1.3, tone(col, 0.85), 0, 1.5, -0.05, { r: 0.05 }); // comb
  k.box(0.5, 0.55, 0.06, shield, 0, 1.25, 0.72, { rx: -0.35, r: 0.04 }); // front shield
}

/** A copper coil: a stack of windings round a core (any space; centred on x, y, z, along y). */
export function coil(k, x, y, z, r, hh, n, core = 0x37474f) {
  k.cyl(r * 0.6, hh, core, x, y, z, { seg: 12 });
  for (let i = 0; i < n; i++) k.torus(r * 0.8, r * 0.22, COPPER, x, y - hh / 2 + (i + 0.5) * (hh / n), z, { rx: PI / 2, seg: 14 });
}

/** A crooked lightning arc between two points (glow tube). */
export function arc(k, a, b, mat, jag = 0.18, seed = 1) {
  const pts = [a];
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    const j = (Math.sin(seed * 7.3 + i * 2.1) * jag);
    pts.push([a[0] + (b[0] - a[0]) * t + j, a[1] + (b[1] - a[1]) * t - j * 0.5, a[2] + (b[2] - a[2]) * t + j * 0.7]);
  }
  pts.push(b);
  k.tube(pts, 0.03, mat, { seg: 12, sides: 4, tension: 0 });
}

/** Thick rubber gloves up to the elbow (arm space). */
export function rubberGloves(h, key, col, sleeve) {
  hands(h, key, col, sleeve, (a) => a.box(1.1, 0.5, 1.1, col, 0, -1.25, 0, { r: 0.08 }));
}

// ------------------------------------------------------------------ Shotgunner

/**
 * Shotgunner: a hunter with a pump shotgun and a wide-brim hat. Lv 1 Midnight Hunter: a dark
 * outfit and a red hat band, Lv 2 a long coat, Lv 3 a shell bandolier, Lv 4 Crowd Control: riot
 * gear and a drum-fed shotgun.
 */
export function makeShotgunner(level) {
  const night = level >= 1;
  const riot = level >= 4;
  const shirt = riot ? 0x263238 : night ? 0x283044 : 0x8d6e63;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: riot ? 0x1c2429 : night ? 0x1e2333 : 0x4e342e, arms: shirt, face: 'soldier' });
  const key = `shotgunner${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (riot) {
    riotHelmet(hd, 0x37474f, glassMat(h, 0x90caf9, 0.5));
    t.box(2.22, 1.3, 1.2, 0x455a64, 0, 0.35, 0, { r: 0.16 }); // chest plate
    shoulderPads(t, 0x37474f, 0.6);
  } else {
    hair(hd, 0x3e2723, { h: 0.38 });
    cowboyHat(hd, night ? 0x1a1a1a : 0x6d4c41, night ? 0xc62828 : 0x3e2723);
    collar(t, tone(shirt, 0.85));
  }
  if (level >= 2 && !riot) duster(t, night ? 0x1e2333 : 0x5d4037);
  if (level >= 3) shellStrap(t, 1);
  shellBelt(t, 0x3e2723, riot ? 5 : 3);
  hd.done();
  t.done();
  hands(h, key, riot ? 0x1a1a1a : 0x5d4037, tone(shirt, 0.8));
  feet(h, key, 0x3e2723, riot ? kneePad : null);
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = shotgun(gk, { len: riot ? 2.3 : 2.0, metal: riot ? 0x212121 : GUNMETAL, wood: riot ? 0x37474f : 0x5d4037, tac: riot, drum: riot, light: riot ? 0xfff3b0 : null });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = 0xffab40;
  return own(h);
}

// ------------------------------------------------------------------ Pump Shotgunner

/**
 * Pump Shotgunner (alternate Shotgunner form): an enforcer in a blue cap with a pump shotgun.
 * Lv 1 a shell belt, Lv 2 a vest, Lv 3 a helmet and a longer gun, Lv 4 Tactical Blowback: dark
 * gear and a drum-fed tactical shotgun with a laser.
 */
export function makeShotgunnerPump(level) {
  const tac = level >= 4;
  const shirt = tac ? 0x1c2833 : 0x37474f;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: tac ? 0x111a22 : 0x263238, arms: shirt, face: 'agent' });
  const key = `shotgunnerPump${level}`;
  const red = glowMat(h, 0xff1744);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (level >= 3) helmet(hd, tac ? 0x0d1b2a : 0x263238, { cover: tac ? 0x1c2833 : 0x37474f });
  else {
    hair(hd, 0x1a1209, { h: 0.36 });
    cap(hd, 0x0d47a1, { peak: 0x0a3880 });
  }
  hd.box(0.3, 0.22, 0.05, shardOf(h), 0.4, 1.02, 0.62, { ry: -0.55, rx: -0.4 }); // Dimension Shard badge
  collar(t, tone(shirt, 0.85));
  if (level >= 1) shellBelt(t, 0x3e2723, 5);
  else belt(t, 0x3e2723);
  if (level >= 2) vest(t, tac ? 0x263238 : 0x455a64, { pouches: 3 });
  hd.done();
  t.done();
  hands(h, key, 0x212121, tone(shirt, 0.8), (a, s) => armPatch(a, s, tone(shirt, 0.8), s > 0 ? 0x0d47a1 : null));
  feet(h, key, 0x1a1a1a, level >= 2 ? kneePad : null);
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = shotgun(gk, { len: tac ? 2.4 : level >= 3 ? 2.25 : 2.05, metal: 0x212121, wood: tac ? 0x37474f : 0x5d4037, tac, drum: tac, rail: tac, light: tac ? red : null });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = 0xffab40;
  return own(h);
}

// ------------------------------------------------------------------ Combat Shotgunner

/**
 * Combat Shotgunner (alternate Shotgunner with two paths). Top: Lv 1 gloves, Lv 2 a padded
 * vest, Lv 3 a militant beret, Lv 4 green goggles, Lv 5 a drum-fed AA-12 and a medkit. Bottom:
 * Lv 1 a shell bandolier, Lv 3 an officer's cap, Lv 4 SWAT gear, Lv 5 the bulky DB-12.
 */
export function makeShotgunnerCombat(level, bottom = false) {
  const top = !bottom;
  const swat = bottom && level >= 4;
  const officer = bottom && level === 3;
  const shirt = swat ? 0x1b1f24 : bottom && level >= 3 ? 0x1a237e : 0x556b2f;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: swat ? 0x15181c : 0x3e4a2a, arms: shirt, face: 'soldier' });
  const key = `shotgunnerCombat${bottom ? 'B' : 'T'}${level}`;
  const green = glowMat(h, 0x76ff03);
  const blue = glowMat(h, 0x40c4ff);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (swat) riotHelmet(hd, 0x111111, glassMat(h, 0x90caf9, 0.5));
  else if (officer) {
    hair(hd, 0x1a1209, { h: 0.36 });
    peakedCap(hd, 0x0d1b4c, 0x111111, GOLD);
  } else if (top && level >= 3) {
    hair(hd, 0x1a1209, { h: 0.36 });
    beret(hd, 0x33691e, GOLD);
  } else hair(hd, 0x1a1209, { h: 0.4 });
  hd.box(0.3, 0.22, 0.05, shardOf(h), -0.42, 0.95, 0.6, { ry: 0.55 }); // Dimension Shard badge
  if (top && level >= 4) goggles(hd, 0.76, green);
  collar(t, tone(shirt, 0.85));
  belt(t, 0x3e2723);
  if (bottom && level >= 1) shellStrap(t, -1);
  if (top && level >= 2) {
    // a padded vest: quilted panels
    t.box(2.2, 1.7, 1.18, 0x6b7b3a, 0, 0.05, 0, { r: 0.14 });
    for (const y of [0.5, 0.0, -0.5]) t.box(2.24, 0.06, 1.22, 0x55632e, 0, y, 0);
    pouch(t, -0.5, -0.3, 0.6, 0.45, 0.45, 0x55632e, 0.18);
  }
  if (swat) {
    vest(t, 0x263238, { pouches: 3, patch: 0xeceff1 });
    t.box(1.0, 0.25, 0.04, 0xeceff1, 0, 0.3, -0.7); // SWAT across the back
  }
  if (top && level >= 5) medkit(t);
  hd.done();
  t.done();
  hands(h, key, top && level >= 1 || swat ? 0x212121 : null, tone(shirt, 0.8));
  feet(h, key, 0x2b2b2b, level >= 2 ? kneePad : null);
  const big = level >= 5;
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = shotgun(gk, {
    len: big ? 2.3 : 2.05, metal: 0x212121, wood: 0x5d4037,
    kind: big ? (top ? 'aa12' : 'db12') : null, tac: swat, light: bottom && big ? blue : null,
  });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = bottom && level >= 4 ? 0xffd740 : 0xffab40;
  return own(h);
}
export const makeShotgunnerCombatBottom = (level) => makeShotgunnerCombat(level, true);

// ------------------------------------------------------------------ Pyromancer

/**
 * Pyromancer (alternate Flamethrower form): a firefighter-turned-arsonist in a red coat. Lv 1 a
 * gas mask, Lv 2 hazard stripes and a second tank, Lv 3 heavy suit shoulders, Lv 4 Pyromaniac:
 * a black helmet with glowing horns and glowing napalm tanks.
 */
export function makePyromancer(level) {
  const maniac = level >= 4;
  const coat = maniac ? 0x3e2723 : 0xb71c1c;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: coat, pants: 0x212121, arms: coat, face: 'soldier' });
  const key = `pyromancer${level}`;
  const fire = glowMat(h, 0xff6d00);
  const amber = glowMat(h, 0xffa000);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  fireHelmet(hd, maniac ? 0x212121 : 0xfdd835, maniac ? fire : 0x5d4037);
  if (maniac) for (const s of [-1, 1]) hd.cyl(0.14, 0.7, fire, s * 0.55, 1.65, 0, { seg: 8, r2: 0.01, rz: s * -0.35 }); // horns
  if (level >= 1) gasMask(hd, 0x37474f, amber);
  // a turnout coat: reflective bands, clasps and a high collar
  t.box(2.2, 1.9, 1.18, coat, 0, 0.05, 0, { r: 0.12 });
  t.box(2.2, 0.3, 1.2, tone(coat, 0.85), 0, 0.92, -0.04, { r: 0.08 });
  for (let i = 0; i < 4; i++) t.box(0.3, 0.08, 0.06, 0x9e9e9e, 0.12, 0.6 - i * 0.38, 0.61);
  if (level >= 2) for (const y of [-0.55, 0.25]) t.box(2.24, 0.16, 1.22, 0xffeb3b, 0, y, 0); // hazard stripes
  belt(t, 0x212121);
  if (level >= 3) shoulderPads(t, 0x5d4037, 0.62);
  hd.done();
  fuelTanks(t, level >= 2 ? [-0.38, 0.38] : [0], 0.32, 1.8, maniac ? fire : 0xc62828, { y: 0.2, stripe: level >= 2 ? 0xffeb3b : null });
  t.done();
  hands(h, key, 0x3e2723, tone(coat, 0.8));
  feet(h, key, 0x212121, (b) => b.box(1.12, 0.12, 1.14, 0xffeb3b, 0, -1.45, 0.02));
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:wand`);
  const tip = flameWand(gk, fire, { len: 1.9, wide: level >= 3 });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tip, UP);
  h.rightArm.rotation.set(-PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-PI / 2 + 0.15, 0, -0.5);
  h.pose = { right: -PI / 2, left: -PI / 2 + 0.15, leftRecoil: 0.05 };
  h.recoilScale = 0.1;
  return own(h);
}

// ------------------------------------------------------------------ Plasma Trooper

/**
 * Plasma Trooper: holds a crackling plasma globe in both hands. Lv 1 safety goggles and yellow
 * rubber gloves, Lv 2 a bigger, pinker globe, Lv 3 a lab coat in purple and a Tesla coil pack,
 * Lv 4 Lightbulb of Doom: a giant glowing bulb floating overhead.
 */
export function makePlasma(level) {
  const doom = level >= 4;
  const shirt = level >= 3 ? 0x4a148c : 0xeceff1;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt, pants: level >= 3 ? 0x311b92 : 0x78909c, arms: shirt, face: 'soldier' });
  const key = `plasma${level}`;
  const zap = glowMat(h, level >= 2 ? 0xe040fb : 0x7c4dff);
  const white = glowMat(h, 0xf3e5f5);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // wild purple hair standing up in tufts
  hair(hd, 0x8e24aa, { h: 0.5 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * PI * 2;
    hd.cyl(0.14, 0.45, 0x8e24aa, Math.sin(a) * 0.45, 1.35, Math.cos(a) * 0.45 - 0.05, { seg: 6, r2: 0.01, rx: Math.cos(a) * 0.6, rz: -Math.sin(a) * 0.6 });
  }
  if (level >= 1) goggles(hd, 0.76, glowMat(h, 0x80deea), { r: 0.7 });
  // a lab coat: long front panels, pockets, pens
  collar(t, 0xfafafa, { buttons: true });
  t.slab(2.16, 1.4, 0.14, shirt, 0, -1.3, -0.58, { bw: 1.08 });
  for (const s of [-1, 1]) t.slab(0.26, 1.4, 1.1, shirt, s * 1.0, -1.3, 0, { bw: 1.15 });
  pouch(t, 0.55, 0.35, 0.52, 0.45, 0.4, tone(shirt, 0.9), 0.06);
  for (const [x, c] of [[0.45, 0x1565c0], [0.6, SHELL]]) t.cyl(0.04, 0.35, c, x, 0.6, 0.6, { seg: 6 });
  belt(t, 0x37474f);
  if (level >= 3) {
    // Plasma Tower: a Tesla coil on a back frame, with a glowing ball on top
    t.box(1.2, 1.4, 0.5, 0x37474f, 0, 0, -0.8, { r: 0.08 });
    coil(t, 0, 1.2, -0.85, 0.35, 1.0, 5);
    t.torus(0.3, 0.1, STEEL, 0, 1.8, -0.85, { rx: PI / 2, seg: 16 });
    t.ball(0.22, zap, 0, 2.1, -0.85, { seg: 12, rows: 8 });
    for (let i = 0; i < 3; i++) arc(t, [0, 2.1, -0.85], [Math.sin(i * 2.1) * 0.6, 2.4 + i * 0.1, -0.85 + Math.cos(i * 2.1) * 0.6], zap, 0.12, i + 1);
  }
  hd.done();
  t.done();
  if (level >= 1) rubberGloves(h, key, 0xfdd835, tone(shirt, 0.85));
  else hands(h, key, null, tone(shirt, 0.85));
  feet(h, key, 0x37474f);
  // the globe, held in front with both hands on a little base
  const holder = new THREE.Group();
  holder.position.set(0, 3.2, 1.6);
  h.body.add(holder);
  const r = [0.6, 0.6, 0.7, 0.8, 0.9][level] ?? 0.9;
  const k = wear(h, holder, `${key}:globe`);
  k.cyl(0.38, 0.35, 0x263238, 0, -0.35, 0, { seg: 16, r2: 0.3 });
  k.torus(0.34, 0.05, COPPER, 0, -0.2, 0, { rx: PI / 2, seg: 16 });
  k.ball(r, glassMat(h, 0xe1bee7, 0.3), 0, r - 0.15, 0, { seg: 18, rows: 12 });
  k.ball(r * 0.28, white, 0, r - 0.15, 0, { seg: 10, rows: 8 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    const e = r * 0.92;
    arc(k, [0, r - 0.15, 0], [Math.sin(a) * e * 0.8, r - 0.15 + Math.cos(a * 1.7) * e * 0.55, Math.cos(a) * e * 0.8], zap, r * 0.15, i + 3);
  }
  k.done();
  if (doom) {
    // Lightbulb of Doom: a giant glowing bulb floating overhead, screw base down
    const b = wear(h, h.body, `${key}:bulb`);
    b.ball(1.0, glowMat(h, 0xfff59d), 0, 8.1, 0, { seg: 18, rows: 12, sy: 1.1 });
    b.cyl(0.55, 0.5, glowMat(h, 0xfff59d), 0, 7.1, 0, { seg: 16, r2: 0.75 });
    b.cyl(0.5, 0.6, 0x9e9e9e, 0, 6.65, 0, { seg: 16 });
    for (let i = 0; i < 4; i++) b.torus(0.5, 0.05, 0xbdbdbd, 0, 6.42 + i * 0.15, 0, { rx: PI / 2, seg: 16 });
    b.cyl(0.2, 0.15, INK, 0, 6.3, 0, { seg: 12 });
    for (let i = 0; i < 4; i++) arc(b, [0, 8.1, 0], [Math.sin(i * 1.6) * 0.8, 8.1 + Math.cos(i * 2.3) * 0.7, Math.cos(i * 1.6) * 0.8], white, 0.15, i + 9);
    b.done();
  }
  h.muzzles = [];
  muzzle(h, holder, r * 2 - 0.15, 0, 0);
  h.rightArm.rotation.set(-1.2, 0, 0.35);
  h.leftArm.rotation.set(-1.2, 0, -0.35);
  h.pose = { right: -1.2, left: -1.2, leftRecoil: 0.05 };
  h.recoilScale = 0.15;
  h.tracer = level >= 2 ? 0xe040fb : 0x7c4dff;
  h.tracerWidth = 0.18;
  return own(h, 0);
}

// ------------------------------------------------------------------ Pulse Trooper

/**
 * Pulse Trooper (alternate Plasma form): a technician in a cyan suit holding a pulse emitter
 * disc out in front. Lv 1 capacitor cells on the belt, Lv 2 a visor and a shoulder dish, Lv 3 a
 * coil pack with filament rods, Lv 4 twin Sweeper laser pods, Lv 5 an Arc Reactor and a halo.
 */
export function makePlasmaPulse(level) {
  const arcR = level >= 5;
  const suit = level >= 4 ? 0x0d2b45 : 0x00838f;
  const h = makeHumanoid({ skin: 0xc68642, shirt: suit, pants: level >= 4 ? 0x0a1a2a : 0x006064, arms: suit, face: 'soldier' });
  const key = `plasmaPulse${level}`;
  const zap = glowMat(h, arcR ? 0x84ffff : 0x40c4ff);
  const red = glowMat(h, 0xff1744);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x1a1209, { h: 0.36 });
  cap(hd, 0x263238, { peak: 0x1c2429 });
  t.box(0.36, 0.24, 0.04, shardOf(h), -0.55, 0.45, 0.58); // Dimension Shard emblem
  // a jumpsuit: zip, chest seams, utility belt
  t.box(0.06, 1.6, 0.05, 0x90a4ae, 0, -0.05, 0.56);
  for (const s of [-1, 1]) t.box(0.05, 1.2, 0.04, tone(suit, 0.75), s * 0.6, 0.1, 0.56);
  belt(t, 0x37474f);
  if (level >= 1) for (const x of [-0.6, 0, 0.6]) {
    t.cyl(0.13, 0.4, 0x37474f, x, -0.6, 0.7, { seg: 10 });
    t.cyl(0.14, 0.12, zap, x, -0.55, 0.7, { seg: 10 });
  }
  if (level >= 2) {
    band(hd, 0.72, 0.05, 0.26, 2.0, zap, 0.74); // visor
    // a little dish on the right shoulder
    t.cyl(0.06, 0.5, 0x90a4ae, -0.85, 1.25, 0, { seg: 8 });
    t.cyl(0.42, 0.1, 0xb0bec5, -0.85, 1.55, 0, { seg: 16, r2: 0.2, rx: 0.4 });
    t.ball(0.07, zap, -0.85, 1.65, 0.05, { seg: 8, rows: 5 });
  }
  if (level >= 3) {
    // Charged Filament: a coil pack with two glowing rods
    t.box(1.3, 1.5, 0.5, 0x263238, 0, 0, -0.8, { r: 0.08 });
    for (const x of [-0.4, 0.4]) {
      coil(t, x, 0.95, -0.85, 0.22, 0.5, 3);
      t.cyl(0.07, 1.2, zap, x, 1.75, -0.85, { seg: 8 });
      t.ball(0.12, zap, x, 2.4, -0.85, { seg: 8, rows: 6 });
    }
  }
  if (level >= 4) {
    // Sweeper: laser pods on both shoulders
    for (const s of [-1, 1]) {
      t.box(0.55, 0.45, 0.9, 0x37474f, s * 1.3, 1.3, 0, { r: 0.08 });
      t.cyl(0.12, 0.3, INK, s * 1.3, 1.3, 0.55, { axis: 'z', seg: 10 });
      t.cyl(0.09, 0.04, red, s * 1.3, 1.3, 0.71, { axis: 'z', seg: 10 });
    }
  }
  if (arcR) {
    t.cyl(0.42, 0.1, 0x37474f, 0, 0.35, 0.58, { axis: 'z', seg: 18 });
    t.cyl(0.32, 0.08, glowMat(h, 0xffffff), 0, 0.35, 0.64, { axis: 'z', seg: 18 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      t.box(0.06, 0.12, 0.04, zap, Math.sin(a) * 0.37, 0.35 + Math.cos(a) * 0.37, 0.66, { rz: -a });
    }
  }
  hd.done();
  t.done();
  hands(h, key, 0x263238, tone(suit, 0.8));
  feet(h, key, 0x263238);
  if (arcR) {
    // the halo: a glowing ring with eight nodes that turns slowly over the head
    const halo = spinner(h, h.body, 0, 6.6, 0);
    const k = wear(h, halo, `${key}:halo`);
    k.torus(1.4, 0.06, zap, 0, 0, 0, { rx: PI / 2, seg: 32 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      k.box(0.3, 0.12, 0.3, zap, Math.cos(a) * 1.4, 0, Math.sin(a) * 1.4, { ry: -a });
    }
    k.done();
    h.idleSpin = 0.8;
  }
  // the emitter: a disc held flat in front, a ring of vents and a glowing core
  const holder = new THREE.Group();
  holder.position.set(0, 3.0, 1.6);
  h.body.add(holder);
  const size = [1.0, 1.1, 1.2, 1.3, 1.4, 1.6][level] ?? 1.6;
  const k = wear(h, holder, `${key}:disc`);
  k.cyl(size / 2, 0.22, 0x455a64, 0, 0, 0, { seg: 24 });
  k.torus(size / 2, 0.05, INK, 0, 0.1, 0, { rx: PI / 2, seg: 24 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    k.box(0.06, 0.04, size * 0.16, INK, Math.sin(a) * size * 0.36, 0.12, Math.cos(a) * size * 0.36, { ry: a });
  }
  k.cyl(size * 0.22, 0.2, zap, 0, 0.1, 0, { seg: 18 });
  k.torus(size * 0.26, 0.03, zap, 0, 0.3, 0, { rx: PI / 2, seg: 20 });
  for (const s of [-1, 1]) k.box(0.2, 0.18, 0.4, INK, s * size / 2, 0, 0, { r: 0.04 }); // hand grips
  k.done();
  h.muzzles = [];
  muzzle(h, holder, 0.3, 0, 0);
  h.rightArm.rotation.set(-1.1, 0, 0.3);
  h.leftArm.rotation.set(-1.1, 0, -0.3);
  h.pose = { right: -1.1, left: -1.1, leftRecoil: 0.05 };
  h.recoilScale = 0.12;
  h.tracer = arcR ? 0x84ffff : 0x40c4ff;
  return own(h, 0);
}

// ------------------------------------------------------------------ Electroshocker

/**
 * Electroshocker: a lineman in a hard hat with a shock gun and a coil pack. Lv 1 dark rubber
 * sleeves, gloves and goggles, Lv 2 Faraday's Vest: a metal mesh vest, Lv 3 a tall Tesla coil
 * pack, Lv 4 Zeus Cannon: a blue suit and a forked cannon with crackling prongs.
 */
export function makeElectro(level) {
  const zeus = level >= 4;
  const shirt = zeus ? 0x1a237e : 0xf9a825;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x37474f, arms: level >= 1 ? 0x212121 : shirt, face: 'soldier' });
  const key = `electro${level}`;
  const bolt = glowMat(h, zeus ? 0xe1f5fe : 0x80d8ff);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hardHat(hd, zeus ? 0x283593 : 0xfdd835, bolt);
  if (level >= 1) goggles(hd, 0.76, bolt, { r: 0.7 });
  collar(t, tone(shirt, 0.85));
  // a tool belt: pliers, tape, a coil of wire
  belt(t, 0x5d4037);
  pouch(t, 0.6, -1.0, 0.55, 0.42, 0.45, 0x6d4c41, 0.2);
  t.torus(0.18, 0.06, COPPER, -0.75, -1.05, 0.64, { seg: 14 });
  t.cyl(0.14, 0.12, INK, -0.25, -1.05, 0.62, { axis: 'z', seg: 12 });
  if (level >= 2) {
    // Faraday's Vest: a mesh of thin bars over the chest
    t.box(2.2, 1.6, 1.18, 0x90a4ae, 0, 0.15, 0, { r: 0.12 });
    for (let i = 0; i < 5; i++) t.box(2.24, 0.04, 1.22, 0x546e7a, 0, -0.5 + i * 0.32, 0);
    for (let i = 0; i < 6; i++) t.box(0.04, 1.6, 0.04, 0x546e7a, -0.85 + i * 0.34, 0.15, 0.6);
  }
  // the coil pack on the back, taller from Lv 3, with a glowing ball on top and arcs
  const tall = level >= 3;
  const ch = tall ? 2.0 : 1.2;
  t.box(1.1, 1.4, 0.4, 0x455a64, 0, -0.1, -0.75, { r: 0.08 });
  coil(t, 0, 0.6 + ch / 2, -0.95, 0.38, ch, tall ? 8 : 5);
  t.torus(0.35, 0.12, STEEL, 0, 0.7 + ch, -0.95, { rx: PI / 2, seg: 16 });
  t.ball(0.24, bolt, 0, 1.0 + ch, -0.95, { seg: 12, rows: 8 });
  if (tall) for (let i = 0; i < 3; i++) arc(t, [0, 1.0 + ch, -0.95], [Math.sin(i * 2.1) * 0.7, 1.3 + ch, -0.95 + Math.cos(i * 2.1) * 0.7], bolt, 0.12, i + 1);
  t.tube([[0, -0.6, -0.95], [-1.0, -0.95, -0.4], [-1.25, -0.7, 0.2]], 0.06, 0x212121, { seg: 12, sides: 6 }); // cable
  hd.done();
  t.done();
  if (level >= 1) rubberGloves(h, key, 0x212121, 0x212121);
  else hands(h, key, 0x5d4037, tone(shirt, 0.8));
  feet(h, key, 0x5d4037);
  // the shock gun: a body with copper windings, a stubby barrel and two prongs (a forked cannon at Lv 4)
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const len = zeus ? 2.2 : 1.7;
  const B = UP + 0.02;
  gk.box(0.22, 0.26, 0.5, INK, 0, 0.1, UP - 0.34, { rx: -0.3, r: 0.04 });
  gk.box(0.36, 0.5, 0.42, zeus ? 0x283593 : 0x424242, 0, 0.3, B, { r: 0.06 }); // back
  gk.cyl(zeus ? 0.3 : 0.22, 0.9, zeus ? 0x283593 : 0x424242, 0, -0.35, B, { seg: 14 });
  for (let i = 0; i < 5; i++) gk.torus(zeus ? 0.3 : 0.22, 0.05, COPPER, 0, -0.05 - i * 0.15, B, { rx: PI / 2, seg: 14 });
  gk.cyl(0.1, len - 0.8, STEEL, 0, -0.8 - (len - 0.8) / 2, B, { seg: 10 });
  gk.box(0.18, 0.2, 0.45, INK, 0, -0.9, UP - 0.3, { r: 0.04 }); // front grip
  const spread = zeus ? 0.32 : 0.16;
  for (const s of [-1, 1]) {
    gk.tube([[0, -len + 0.1, B], [s * spread, -len - 0.1, B], [s * spread, -len - (zeus ? 0.5 : 0.3), B]], 0.04, STEEL, { seg: 8, sides: 5 });
    gk.ball(0.07, bolt, s * spread, -len - (zeus ? 0.52 : 0.32), B, { seg: 8, rows: 5 });
  }
  arc(gk, [-spread, -len - (zeus ? 0.5 : 0.3), B], [spread, -len - (zeus ? 0.5 : 0.3), B], bolt, 0.08, 4);
  if (zeus) {
    gk.cyl(0.36, 0.12, GOLD, 0, -0.85, B, { seg: 16 });
    for (const s of [-1, 1]) gk.box(0.06, 0.5, 0.25, GOLD, s * 0.3, -0.2, B + 0.2, { rz: s * 0.3 }); // little wings
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, -len - (zeus ? 0.5 : 0.3), B);
  aimLong(h);
  h.tracer = zeus ? 0xe1f5fe : 0x80d8ff;
  return own(h);
}
