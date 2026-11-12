// Tower models: people, batch 14 (dressed with the vehicle kit in ../vehicles.js).
// In here: Slasher, Frost Blaster, Flame Trooper, Goo Gunner, Cryo Blaster (+bottom), Cryo Mortar,
// Archer (the Bowmaster form). All of them are alternate forms, so each wears a Dimension Shard.
// Each makeX(level) builds one tower's look; TOWER_MODELS in ../models.js says which tower uses which.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.

import * as THREE from 'three';
import { glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import {
  GOLD, GUNMETAL, INK, LEATHER, STEEL, UP, WOOD, aimLong, armPatch, band, belt, collar, dome, fist, goggles,
  hair, helmet, kneePad, muzzle, own, pouch, rifle, sash, shardOf, vest, wear,
} from './people1.js';
import { shoulderPads } from './people2.js';
import { feet, glassMat, hands, hood } from './people5.js';
import { coolant, cryoGun, icicle, neckScarf, shard } from './people6.js';
import { flameWand, fuelTanks, gasMask, loaderPose, mortarGun, visor } from './people7.js';
import { spinner } from './machines5.js';

const PI = Math.PI;
const ICE = 0x80d8ff;
const BLOOD = 0x8b0000;
const GOO = 0x76ff03;

// ------------------------------------------------------------------ shared bits for this batch

/** The Dimension Shard badge on the chest (torso space). */
function shardBadge(h, t, x = -0.55, y = 0.45) {
  t.box(0.34, 0.34, 0.05, shardOf(h), x, y, 0.62, { rz: PI / 4 });
  t.box(0.44, 0.44, 0.03, INK, x, y, 0.6, { rz: PI / 4 });
}

/** A puffy snow suit over the chest: quilted rings, a zip and a fur hem (torso space). */
function snowSuit(k, col, o = {}) {
  k.box(2.22, 1.92, 1.2, col, 0, 0.04, 0, { r: 0.18 });
  for (const y of [0.45, -0.1, -0.6]) k.box(2.26, 0.06, 1.24, tone(col, 0.85), 0, y, 0);
  k.box(0.06, 1.6, 0.05, 0x90a4ae, 0, -0.05, 0.62);
  k.box(0.1, 0.16, 0.06, 0xb0bec5, 0, 0.7, 0.64); // zip pull
  if (o.hem !== false) k.box(2.3, 0.24, 1.28, o.hem ?? 0xf5f5f5, 0, -0.96, 0, { r: 0.1 });
}

/** Faceted ice plates on both shoulders with a crystal sticking up (torso space). */
function icePauldrons(k, mat, spike) {
  for (const s of [-1, 1]) {
    k.ball(0.64, mat, s * 1.42, 0.95, 0, { sy: 0.55, seg: 6, rows: 4 });
    shard(k, s * 1.55, 1.1, -0.1, 0.6, 0.12, spike, { rz: s * -0.5 });
    shard(k, s * 1.45, 1.15, 0.25, 0.4, 0.08, spike, { rz: s * -0.3 });
  }
}

/** A fur-flap hat (ushanka): crown, a turned-up front and ear flaps (head space). */
function furHat(k, col, fur) {
  dome(k, 0.74, 0.62, col, 0, 0.92, 0);
  k.cyl(0.8, 0.3, fur, 0, 0.98, -0.02, { seg: 20 });
  k.box(1.2, 0.36, 0.2, fur, 0, 1.2, 0.68, { rx: -0.25, r: 0.08 }); // front flap
  for (const s of [-1, 1]) {
    k.box(0.22, 0.75, 0.62, fur, s * 0.72, 0.62, -0.02, { r: 0.08 }); // ear flaps
    k.cyl(0.02, 0.4, INK, s * 0.72, 0.1, 0.1, { seg: 5 }); // ties
  }
}

// ------------------------------------------------------------------ Slasher

/**
 * A big knife in the fist (gun space, blade along -y, back of the blade on +z). o: len, wide,
 * blade (colour or glow material), saw (teeth on the back), cleaver (a wide square blade).
 * Returns the tip y.
 */
function knife(k, o = {}) {
  const len = o.len ?? 1.5;
  const wide = o.wide ?? 0.4;
  const blade = o.blade ?? 0xcfd8dc;
  const grip = o.grip ?? 0x2b2b2b;
  k.cyl(0.12, 0.62, grip, 0, 0, 0, { seg: 10 }); // handle
  for (let i = 0; i < 4; i++) k.torus(0.125, 0.025, tone(grip, 0.6), 0, 0.2 - i * 0.14, 0, { rx: PI / 2, seg: 10 });
  k.ball(0.14, STEEL, 0, 0.34, 0, { seg: 10, rows: 6 }); // pommel
  k.box(0.18, 0.12, wide + 0.25, STEEL, 0, -0.36, 0, { r: 0.04 }); // guard
  const y = -0.42 - len / 2;
  if (o.cleaver) {
    k.slab(0.07, len, wide, blade, 0, y, 0.04, { bd: 0.9, bz: 0.02 });
    k.cyl(0.09, 0.08, INK, 0, -0.42 - len * 0.82, wide / 2 - 0.1, { axis: 'x', seg: 10 }); // hanging hole
  } else {
    k.slab(0.07, len, wide, blade, 0, y, 0.04, { bd: 0.12, bz: wide * 0.4 }); // the tip sits on the back
  }
  if (typeof blade === 'number') k.box(0.075, len * 0.55, 0.05, tone(blade, 0.7), 0, -0.42 - len * 0.35, wide * 0.18); // fuller groove
  if (o.saw) for (let i = 0; i < 6; i++) k.box(0.06, 0.12, 0.12, typeof blade === 'number' ? tone(blade, 0.85) : blade, 0, -0.55 - i * len * 0.11, wide / 2 + 0.06, { rx: PI / 4 });
  return -0.42 - len;
}

/** A sheathed knife (torso or leg space): leather sheath, a strap and the handle sticking out. */
function sheath(k, x, y, z, rz = 0) {
  const s = Math.sin(rz);
  const c = Math.cos(rz);
  k.slab(0.24, 0.7, 0.1, LEATHER, x, y, z, { bw: 0.4, rz });
  k.box(0.28, 0.06, 0.12, INK, x - s * 0.15, y + c * 0.15, z + 0.01, { rz });
  k.cyl(0.06, 0.3, 0x2b2b2b, x + s * 0.48, y - c * -0.48, z, { seg: 8, rz });
  k.box(0.08, 0.1, 0.22, STEEL, x + s * 0.34, y + c * 0.34, z, { rz });
}

/**
 * Slasher (alternate Knifer form): a hooded killer in a hockey-style mask with a big knife. Lv 1
 * fingerless gloves and a strap of spare knives, Lv 2 Bloodlust: a blood-red outfit and a longer
 * knife, Lv 3 Psycho Knife: a saw-backed blade and a stained apron, Lv 4 Ocean Of Blood: a
 * glowing red blade, glowing eyes and a pool of blood at its feet.
 */
export function makeSlasher(level) {
  const blood = level >= 2;
  const ocean = level >= 4;
  const shirt = blood ? 0x4a0000 : 0x37474f;
  const h = makeHumanoid({ skin: 0xd9a066, shirt, pants: 0x1a1a1a, arms: shirt, face: 'agent' });
  const key = `slasher${level}`;
  const red = glowMat(h, 0xff1744);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hood(hd, blood ? 0x2b0000 : 0x263238);
  // the mask: a pale curved plate with eye holes, breathing holes and a strap
  band(hd, 0.66, 0.07, 0.86, 1.95, 0xeeeeee, 0.6);
  for (const s of [-1, 1]) {
    if (ocean) hd.box(0.22, 0.11, 0.05, red, s * 0.25, 0.72, 0.72, { ry: s * 0.3 });
    else hd.box(0.22, 0.12, 0.05, 0x111111, s * 0.25, 0.72, 0.72, { ry: s * 0.3 });
  }
  for (const [x, y] of [[-0.12, 0.42], [0, 0.38], [0.12, 0.42], [-0.06, 0.3], [0.06, 0.3]]) hd.cyl(0.03, 0.05, 0x111111, x, y, 0.73, { axis: 'z', seg: 6 });
  if (blood) for (const [x, y, w] of [[0.32, 0.5, 0.1], [0.4, 0.62, 0.06], [-0.3, 0.95, 0.08]]) hd.box(w, w * 1.6, 0.03, BLOOD, x, y, 0.735, { rz: x }); // splatter
  // the hoodie: kangaroo pocket, drawstring toggles, ribbed hem
  t.box(2.2, 1.9, 1.18, shirt, 0, 0.05, 0, { r: 0.14 });
  t.slab(1.3, 0.62, 0.1, tone(shirt, 0.85), 0, -0.45, 0.6, { tw: 0.8 });
  t.box(2.24, 0.2, 1.22, tone(shirt, 0.75), 0, -0.88, 0, { r: 0.05 });
  for (const s of [-1, 1]) t.ball(0.05, 0xbdbdbd, s * 0.2, 0.32, 0.62, { seg: 6, rows: 4 });
  shardBadge(h, t, 0.55, 0.45);
  if (level >= 1) {
    // Sleight of Hands: a strap of spare knives across the chest
    sash(t, 0x1a1a1a, -1, 0.26);
    for (const tt of [-0.55, 0.05, 0.6]) sheath(t, Math.sin(-0.62) * -tt, Math.cos(-0.62) * tt, 0.66, -0.62);
  }
  if (level >= 3) {
    // a butcher's apron, stained
    t.slab(1.7, 1.7, 0.08, 0x5d4037, 0, -0.35, 0.62, { tw: 0.75 });
    t.box(1.9, 0.08, 1.2, 0x3e2723, 0, -0.55, 0); // apron string
    for (const [x, y, w] of [[-0.4, -0.2, 0.35], [0.3, -0.7, 0.25], [0.1, 0.25, 0.2]]) t.cyl(w, 0.03, BLOOD, x, y, 0.67, { axis: 'z', seg: 9, sx: 1.3 });
  }
  hd.done();
  t.done();
  hands(h, key, level >= 1 ? 0x1a1a1a : null, tone(shirt, 0.8), level >= 1 ? (a) => {
    for (let i = 0; i < 4; i++) a.box(0.16, 0.12, 0.06, 0xd9a066, -0.3 + i * 0.2, -2.0, 0.5); // bare fingertips
  } : null);
  feet(h, key, 0x1a1a1a);
  if (ocean) {
    const r = wear(h, h.root, `${key}:pool`);
    r.cyl(1.6, 0.04, 0x6a0000, 0.2, 0.03, 0.4, { seg: 18, sx: 1.2 });
    for (const [x, z, s] of [[1.7, 1.3, 0.35], [-1.3, 1.5, 0.25], [1.2, -1.0, 0.3]]) r.cyl(s, 0.04, BLOOD, x, 0.03, z, { seg: 10 });
    r.done();
  }
  const g = fist(h.rightArm, -1.9, 1.25);
  const gk = wear(h, g, `${key}:knife`);
  const len = level >= 3 ? 1.9 : blood ? 1.7 : 1.4;
  const tip = knife(gk, {
    len, wide: level >= 3 ? 0.55 : 0.42, blade: ocean ? red : blood ? 0xb0bec5 : 0xcfd8dc,
    saw: level >= 3, grip: blood ? 0x3e2723 : 0x2b2b2b,
  });
  if (blood) for (const [y, z] of [[-0.9, 0.1], [-1.3, -0.05], [-1.6, 0.15]]) gk.ball(0.06, ocean ? glowMat(h, 0xd50000) : BLOOD, 0.05, y * len / 1.9, z, { seg: 6, rows: 4, sy: 1.6 }); // drips
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tip, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  h.leftArm.rotation.set(-0.6, 0, -0.3);
  h.pose = { right: -2.4, left: -0.6, leftRecoil: 0 };
  h.swing = 1.8;
  h.melee = true;
  h.tracer = blood ? 0xd50000 : 0xffffff;
  return own(h, 0);
}

// ------------------------------------------------------------------ Frost Blaster

/**
 * Frost Blaster (alternate Sleeter form): a trooper in white snow gear with a long ice rifle.
 * Lv 1 goggles, Lv 2 Piercing Cold: a scope and ice spikes on the barrel, Lv 3 a coolant tank,
 * Lv 4 Hyper Icer Trooper: an ice-blue suit, ice pauldrons and a huge ice cannon.
 */
export function makeFrostBlaster(level) {
  const hyper = level >= 4;
  const coat = hyper ? 0x4fc3f7 : 0xeceff1;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: coat, pants: hyper ? 0x0277bd : 0x90a4ae, arms: coat, face: 'soldier' });
  const key = `frostBlaster${level}`;
  const ice = glowMat(h, ICE);
  const pale = glowMat(h, 0xb3e5fc);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  helmet(hd, hyper ? 0x0288d1 : 0xcfd8dc, { cover: hyper ? 0x01579b : 0xeceff1 });
  if (level >= 1) goggles(hd, 0.76, ice, { r: 0.68 });
  if (hyper) visor(hd, ice);
  hd.box(1.0, 0.3, 0.3, 0xfafafa, 0, 0.25, 0.5, { r: 0.1 }); // face scarf
  snowSuit(t, coat, { hem: hyper ? 0xe1f5fe : 0xf5f5f5 });
  belt(t, 0x546e7a, ICE);
  pouch(t, 0.6, -0.65, 0.6, 0.42, 0.4, 0x78909c, 0.18);
  pouch(t, -0.6, -0.65, 0.6, 0.42, 0.4, 0x78909c, 0.18);
  shardBadge(h, t);
  if (level >= 3) coolant(t, hyper ? 0xcfd8dc : 0x90a4ae, ice, { r: hyper ? 0.36 : 0.45, h: 1.5, n: hyper ? 2 : 1 });
  if (hyper) icePauldrons(t, pale, ice);
  else if (level >= 2) shoulderPads(t, 0xcfd8dc, 0.55);
  hd.done();
  t.done();
  hands(h, key, 0x546e7a, tone(coat, 0.85));
  feet(h, key, 0x546e7a, (b) => {
    b.box(1.14, 0.18, 1.16, 0xf5f5f5, 0, -1.34, 0.02, { r: 0.06 }); // fur cuffs
    if (level >= 2) kneePad(b, 0xb0bec5);
  });
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  let y;
  let z = UP + 0.02;
  if (hyper) {
    y = cryoGun(gk, { len: 2.9, body: 0xe1f5fe, light: ice, coils: 4, crystal: pale, can: true });
    gk.box(0.6, 0.7, 0.6, 0x0277bd, 0, -0.4, UP + 0.02, { r: 0.08 }); // power block
    for (const s of [-1, 1]) gk.cyl(0.1, 0.55, pale, s * 0.22, -1.5, UP + 0.35, { axis: 'z', seg: 6, r2: 0.001, ry: s * 0.5 }); // ice spikes
    gk.cyl(0.34, 0.06, ice, 0, -2.6, UP + 0.02, { seg: 16 });
  } else {
    [y, z] = rifle(gk, { len: level >= 2 ? 3.0 : 2.7, body: 0xeceff1, furn: 0x546e7a, mag: false, optic: level >= 2 ? 'scope' : 'dot', lens: ICE, glow: ice });
    // the ice cell where a mag would be
    gk.cyl(0.17, 0.5, ice, 0, -0.6, UP - 0.4, { seg: 10 });
    for (const s of [-1, 1]) gk.box(0.04, 0.55, 0.04, INK, s * 0.17, -0.6, UP - 0.4);
    if (level >= 2) for (let i = 0; i < 3; i++) gk.cyl(0.05, 0.26, pale, 0, -1.65 - i * 0.2, UP + 0.2, { axis: 'z', seg: 6, r2: 0.001 }); // ice spikes
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = ICE;
  h.tracerWidth = hyper ? 0.35 : 0.2;
  return own(h);
}

// ------------------------------------------------------------------ Flame Trooper

/**
 * Flame Trooper (alternate Flamethrower form): a trooper in an orange fire suit with a long
 * flamethrower. Lv 1 a respirator, Lv 2 a bigger flamethrower, Lv 3 Napalm: two glowing tanks,
 * Lv 4 M3: armour plates and a shrouded M3 gun, Lv 5 the black-and-orange Exo-Flame Suit.
 */
export function makeFlameTrooper(level) {
  const exo = level >= 5;
  const m3 = level >= 4;
  const coat = exo ? 0x212121 : 0xe65100;
  const h = makeHumanoid({ skin: 0xd2a679, shirt: coat, pants: exo ? 0x1a1a1a : 0x4e342e, arms: coat, face: 'soldier' });
  const key = `flameTrooper${level}`;
  const fire = glowMat(h, 0xff6d00);
  const amber = glowMat(h, 0xffa000);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  helmet(hd, exo ? 0x37474f : 0x5d4037, { cover: exo ? 0x212121 : 0x4e342e });
  visor(hd, exo ? fire : amber);
  if (level >= 1) {
    // respirator: a snout with two filters
    hd.box(0.5, 0.42, 0.3, 0x37474f, 0, 0.36, 0.7, { r: 0.1 });
    for (const s of [-1, 1]) {
      hd.cyl(0.17, 0.22, INK, s * 0.32, 0.3, 0.72, { axis: 'z', seg: 12, rz: s * 0.4, ry: s * 0.5 });
      hd.cyl(0.14, 0.04, 0x616161, s * 0.38, 0.3, 0.83, { axis: 'z', seg: 12, ry: s * 0.5 });
    }
  }
  // a fire suit: reflective bands, heavy collar, clasps
  t.box(2.2, 1.9, 1.18, coat, 0, 0.05, 0, { r: 0.12 });
  t.box(2.2, 0.3, 1.2, tone(coat, 0.8), 0, 0.92, -0.04, { r: 0.08 });
  for (let i = 0; i < 4; i++) t.box(0.3, 0.08, 0.06, 0x9e9e9e, 0.14, 0.6 - i * 0.38, 0.61);
  for (const y of [-0.55, 0.25]) t.box(2.24, 0.14, 1.22, exo ? fire : 0xbdbdbd, 0, y, 0);
  belt(t, 0x212121);
  pouch(t, -0.6, -0.95, 0.55, 0.4, 0.4, 0x3e2723, 0.2);
  shardBadge(h, t, 0.55, 0.5);
  const napalm = level >= 3;
  fuelTanks(t, napalm ? [-0.4, 0.4] : [0], napalm ? 0.34 : 0.38, 2.0, napalm ? fire : 0xbf360c, { y: 0.2, stripe: napalm ? 0x212121 : 0xffeb3b });
  if (m3) {
    shoulderPads(t, exo ? 0x424242 : 0x6d4c41, 0.64);
    t.box(1.7, 1.0, 0.16, exo ? 0x303030 : 0x5d4037, 0, 0.45, 0.62, { r: 0.06 }); // chest plate
    for (const x of [-0.5, 0, 0.5]) t.box(0.1, 0.6, 0.04, exo ? fire : 0x3e2723, x, 0.45, 0.71);
  }
  if (exo) {
    // Exo-Flame Suit: a glowing core and vents
    t.cyl(0.26, 0.08, fire, 0, 0.45, 0.76, { axis: 'z', seg: 16 });
    t.torus(0.28, 0.05, 0x616161, 0, 0.45, 0.78, { seg: 16 });
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) t.box(0.3, 0.05, 0.05, fire, s * 1.02, 0.4 - i * 0.18, 0.3, { ry: PI / 2 });
  }
  hd.done();
  t.done();
  hands(h, key, exo ? 0x37474f : 0x3e2723, tone(coat, 0.8), m3 ? (a) => a.box(1.12, 0.55, 1.12, exo ? 0x424242 : 0x6d4c41, 0, -1.05, 0, { r: 0.08 }) : null);
  feet(h, key, 0x212121, (b) => {
    b.box(1.12, 0.12, 1.14, exo ? 0xff6d00 : 0xbdbdbd, 0, -1.45, 0.02);
    if (m3) kneePad(b, exo ? 0x424242 : 0x6d4c41);
  });
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const len = m3 ? 2.5 : level >= 2 ? 2.2 : 1.8;
  const tip = flameWand(gk, fire, { len, wide: level >= 2 });
  // a fuel canister under the gun
  gk.cyl(0.2, 0.6, napalm ? fire : 0xbf360c, 0, -0.55, UP - 0.42, { seg: 12 });
  gk.cyl(0.21, 0.06, INK, 0, -0.55, UP - 0.42, { seg: 12 });
  if (m3) {
    gk.cyl(0.22, len - 1.0, exo ? 0x303030 : 0x424242, 0, -0.75 - (len - 1.0) / 2, UP, { seg: 12 }); // heat shroud
    for (let i = 0; i < 4; i++) gk.box(0.46, 0.06, 0.06, INK, 0, -0.9 - i * 0.3, UP + 0.18);
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tip, UP);
  aimLong(h);
  h.recoilScale = 0.1;
  return own(h);
}

// ------------------------------------------------------------------ Goo Gunner

/**
 * Goo Gunner (alternate Slime Trooper form): a lab worker in a green hazmat suit with a goo
 * blaster. Lv 1 a gas mask filter, Lv 2 vials of goo on the belt and a bigger tank, Lv 3 the Glue
 * Hose: a big goo tank with a hose to a spray nozzle, Lv 4 acid-yellow trim, Lv 5 a second tank,
 * a dripping goo crown and a puddle of goo at its feet.
 */
export function makeGooGunner(level) {
  const hose = level >= 3;
  const acid = level >= 4;
  const units = level >= 5;
  const suit = acid ? 0x1b5e20 : 0x43a047;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: suit, pants: suit, arms: suit, face: 'soldier' });
  const key = `gooGunner${level}`;
  const goo = glowMat(h, GOO);
  const trim = acid ? 0xeeff41 : 0x2e7d32;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // hazmat hood with a see-through window
  hood(hd, suit);
  band(hd, 0.72, 0.05, 0.62, 2.0, glassMat(h, 0xc5e1a5, 0.45), 0.7);
  band(hd, 0.7, 0.04, 0.08, 2.1, trim, 1.03);
  band(hd, 0.7, 0.04, 0.08, 2.1, trim, 0.37);
  if (level >= 1) {
    hd.cyl(0.22, 0.3, 0x263238, 0, 0.22, 0.78, { axis: 'z', seg: 14, rx: 0.4 }); // filter
    hd.cyl(0.2, 0.05, 0x616161, 0, 0.17, 0.92, { axis: 'z', seg: 14, rx: 0.4 });
    for (let i = 0; i < 3; i++) hd.box(0.26, 0.03, 0.03, INK, 0, 0.12 + i * 0.07, 0.95, { rx: 0.4 });
  }
  if (units) {
    // the goo crown: blobs dripping over the hood
    for (const [x, z, s] of [[-0.45, 0.1, 0.24], [0, 0.2, 0.3], [0.45, 0.05, 0.22], [0.2, -0.4, 0.2], [-0.25, -0.35, 0.22]]) {
      hd.ball(s, goo, x, 1.45, z, { seg: 10, rows: 7, sy: 0.8 });
      icicle(hd, x, 1.4, z + 0.05, 0.3, goo);
    }
  }
  // the suit: a zip, taped seams, a hazard badge
  t.box(2.2, 1.9, 1.18, suit, 0, 0.05, 0, { r: 0.16 });
  t.box(0.12, 1.7, 0.05, trim, 0, -0.05, 0.62);
  for (const y of [-0.5, 0.3]) t.box(2.26, acid ? 0.18 : 0.06, 1.24, trim, 0, y, 0);
  t.cyl(0.24, 0.04, 0xfdd835, 0.55, 0.55, 0.62, { axis: 'z', seg: 3, rz: PI }); // hazard triangle
  t.ball(0.06, INK, 0.55, 0.53, 0.65, { seg: 6, rows: 4 });
  shardBadge(h, t);
  belt(t, 0x263238);
  if (level >= 2) for (const x of [-0.75, -0.45, 0.45, 0.75]) {
    t.cyl(0.09, 0.32, glassMat(h, 0xc5e1a5, 0.5), x, -0.7, 0.66, { seg: 8 });
    t.cyl(0.07, 0.22, goo, x, -0.74, 0.66, { seg: 8 });
    t.cyl(0.1, 0.06, INK, x, -0.52, 0.66, { seg: 8 });
  }
  // the goo tank(s) on the back: a steel bottle with a window of glowing goo
  const tank = (x, tall, r) => {
    t.cyl(r, tall, 0x546e7a, x, 0.1, -0.6 - r, { seg: 14 });
    for (const s of [-1, 1]) t.ball(r, 0x546e7a, x, 0.1 + s * tall / 2, -0.6 - r, { sy: 0.4, seg: 14, rows: 5 });
    t.box(r * 0.7, tall * 0.6, 0.08, goo, x, 0.1, -0.6 - r * 2, { r: 0.03 }); // window of glowing goo
    for (const s of [-1, 1]) t.box(0.05, tall * 0.62, 0.1, INK, x + s * r * 0.37, 0.1, -0.6 - r * 2);
    for (const y of [-0.3, 0.3]) t.cyl(r + 0.02, 0.08, acid ? 0xeeff41 : INK, x, 0.1 + y * tall, -0.6 - r, { seg: 14 });
    t.cyl(0.08, 0.2, STEEL, x, 0.1 + tall / 2 + r * 0.4, -0.6 - r, { seg: 8 });
  };
  t.box(units ? 1.6 : 1.0, 1.6, 0.12, INK, 0, 0.1, -0.6); // back plate
  for (const s of [-1, 1]) {
    t.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
    t.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
  }
  const tr = hose ? 0.46 : level >= 2 ? 0.4 : 0.34;
  const th = hose ? 1.9 : 1.4;
  if (units) {
    tank(-0.5, th, 0.4);
    tank(0.5, th, 0.4);
  } else tank(0, th, tr);
  if (hose) t.tube([[units ? -0.5 : 0, -0.85, -1.0], [-1.0, -1.0, -0.45], [-1.25, -0.7, 0.2]], 0.09, 0x2e7d32, { seg: 12, sides: 6 });
  hd.done();
  t.done();
  hands(h, key, 0xfdd835, tone(suit, 0.85), (a) => a.box(1.1, 0.45, 1.1, 0xfdd835, 0, -1.3, 0, { r: 0.08 })); // rubber gloves
  feet(h, key, 0xfdd835, (b) => b.box(1.12, 0.12, 1.14, tone(suit, 0.8), 0, -1.38, 0.02));
  if (units) {
    // Spawn Puddle: a glowing pool with bubbles
    const r = wear(h, h.root, `${key}:puddle`);
    r.cyl(1.5, 0.05, 0x4caf10, -0.3, 0.03, 0.6, { seg: 18, sx: 1.25 });
    for (const [x, z, s] of [[1.2, 1.2, 0.18], [-1.6, 1.0, 0.14], [0.4, 1.8, 0.12], [-1.0, -0.6, 0.16]]) r.ball(s, goo, x, 0.06, z, { seg: 8, rows: 5, sy: 0.7 });
    r.done();
  }
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  let tip;
  const B = UP + 0.02;
  if (hose) {
    // the Glue Hose: a spray wand with a fat nozzle
    tip = flameWand(gk, goo, { len: 2.0, wide: acid });
    gk.cyl(0.24, 0.35, 0x2e7d32, 0, -1.6, B, { seg: 12, r2: 0.18 });
    gk.ball(0.12, goo, 0, -2.1, B, { seg: 8, rows: 6 });
  } else {
    // a goo blaster: round body, a glass canister on top and a wide nozzle
    const len = level >= 2 ? 1.7 : 1.5;
    gk.box(0.32, 0.5, 0.42, 0x37474f, 0, 0.42, B - 0.04, { r: 0.06 });
    gk.cyl(0.22, 1.0, 0x455a64, 0, -0.35, B, { seg: 14 });
    gk.box(0.22, 0.26, 0.5, INK, 0, 0.1, UP - 0.36, { rx: -0.32, r: 0.04 });
    gk.torus(0.1, 0.022, INK, 0, -0.14, UP - 0.24, { ry: PI / 2, seg: 10, arc: PI });
    gk.cyl(0.13, len - 0.85, 0x37474f, 0, -0.85 - (len - 0.85) / 2, B, { seg: 12 });
    gk.cyl(0.18, 0.3, INK, 0, -len + 0.15, B, { seg: 12, r2: 0.28 }); // flared nozzle
    gk.cyl(0.2, 0.04, goo, 0, -len - 0.01, B, { seg: 12 });
    // the canister of goo on top
    const cr = level >= 2 ? 0.26 : 0.22;
    gk.cyl(cr, 0.6, glassMat(h, 0xc5e1a5, 0.45), 0, -0.4, B + 0.45, { seg: 12 });
    gk.cyl(cr * 0.8, 0.5, goo, 0, -0.4, B + 0.45, { seg: 12 });
    for (const s of [-1, 1]) gk.cyl(cr + 0.03, 0.07, INK, 0, -0.4 + s * 0.3, B + 0.45, { seg: 12 });
    gk.ball(0.09, goo, 0, -len - 0.08, B - 0.12, { seg: 8, rows: 5, sy: 1.3 }); // drip
    tip = -len - 0.05;
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tip, B);
  aimLong(h);
  h.tracer = GOO;
  h.tracerWidth = hose ? 0.4 : 0.32;
  h.flight = { color: GOO, size: 0.55, arc: 1.2, glowing: true, blob: true }; // a glob of goo
  return own(h);
}

// ------------------------------------------------------------------ Cryo Blaster

/**
 * A fan blaster on the fist (gun space): a round body, a grip, and a fan in a cage at the front
 * whose blades spin while it fires (a spinner group in h.spin). o: fan (cage radius), blades,
 * twin (a second ring for the turbine), storm (a glow ring round the cage). Returns the front y.
 */
function fanGun(h, g, gk, key, o) {
  const B = UP + 0.02;
  const R = o.fan;
  const fy = -1.35;
  gk.box(0.32, 0.5, 0.42, 0x455a64, 0, 0.42, B - 0.04, { r: 0.06 });
  gk.cyl(0.26, 1.1, 0x546e7a, 0, -0.35, B, { seg: 16 });
  for (let i = 0; i < 3; i++) gk.torus(0.27, 0.035, o.light, 0, -0.1 - i * 0.2, B, { rx: PI / 2, seg: 14 });
  gk.box(0.22, 0.26, 0.5, INK, 0, 0.1, UP - 0.36, { rx: -0.32, r: 0.04 });
  gk.torus(0.1, 0.022, INK, 0, -0.14, UP - 0.24, { ry: PI / 2, seg: 10, arc: PI });
  gk.box(0.18, 0.18, 0.4, INK, 0, -0.75, UP - 0.32, { r: 0.04 });
  // the shroud: a short cone out to the cage
  gk.cyl(0.3, 0.4, 0x455a64, 0, -1.0, B, { seg: 18, r2: R * 0.95 });
  // the cage: two rings and bars
  for (const y of [fy + 0.18, fy - 0.2]) gk.torus(R, 0.05, 0xcfd8dc, 0, y, B, { rx: PI / 2, seg: 22 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    gk.box(0.04, 0.42, 0.04, 0xcfd8dc, Math.sin(a) * R, fy - 0.01, B + Math.cos(a) * R);
  }
  for (const a of [0, PI / 2]) gk.box(R * 2, 0.04, 0.04, 0xcfd8dc, 0, fy - 0.2, B, { ry: a }); // front cross
  if (o.twin) gk.torus(R * 0.65, 0.04, 0xcfd8dc, 0, fy - 0.2, B, { rx: PI / 2, seg: 18 });
  if (o.storm) gk.torus(R + 0.14, 0.06, o.storm, 0, fy - 0.05, B, { rx: PI / 2, seg: 24 });
  // the fan: a hub and blades, spinning about the barrel line
  const spin = new THREE.Group();
  spin.position.set(0, fy, B);
  g.add(spin);
  (h.spin ??= []).push(spin);
  const f = wear(h, spin, `${key}:fan`);
  f.cyl(0.12, 0.16, INK, 0, 0, 0, { seg: 12 });
  f.cyl(0.08, 0.04, o.light, 0, -0.09, 0, { seg: 10 });
  const n = o.blades ?? 5;
  for (let ring = 0; ring < (o.twin ? 2 : 1); ring++) {
    const r = ring ? R * 0.55 : R * 0.9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2 + ring * 0.4;
      f.box(0.24, 0.03, r - 0.12, ring ? o.light : 0x90a4ae, Math.sin(a) * (r / 2 + 0.06), ring ? -0.06 : 0, Math.cos(a) * (r / 2 + 0.06), { ry: a, rz: 0.4 });
    }
  }
  f.done();
  return fy - 0.25;
}

/**
 * Cryo Blaster (alternate Frost Trooper with two paths): a trooper in pale blue snow gear with an
 * ice fan blaster. Top: Lv 1 frosty shoulder pads, Lv 2 a bigger fan, Lv 3 Cryo Thrower: glowing
 * coils and goggles, Lv 4 a second tank, Lv 5 Snow Storm: a white suit, ice pauldrons and a fan
 * that never stops. Bottom: Lv 1 an ice block on the belt, Lv 2 a twin turbine, Lv 3 a long Cryo
 * Rifle with a scope, Lv 4 overcharged tanks, Lv 5 Deep Freeze armour.
 */
export function makeCryoBlaster(level, bottom = false) {
  const top = !bottom;
  const maxed = level >= 5;
  const coat = maxed ? (bottom ? 0x01579b : 0xe1f5fe) : bottom && level >= 3 ? 0x4fc3f7 : 0xb3e5fc;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: coat, pants: maxed && bottom ? 0x0d2b45 : 0x78909c, arms: coat, face: 'soldier' });
  const key = `cryoBlaster${bottom ? 'B' : 'T'}${level}`;
  const ice = glowMat(h, ICE);
  const pale = glowMat(h, 0xb3e5fc);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const helm = bottom && level >= 3 ? 0x0277bd : 0xeceff1;
  helmet(hd, maxed && bottom ? 0x0d47a1 : helm, { cover: maxed && bottom ? 0x01579b : 0x90a4ae });
  goggles(hd, 0.76, ice, { r: 0.68 });
  hd.box(1.0, 0.3, 0.3, 0xfafafa, 0, 0.25, 0.5, { r: 0.1 }); // face scarf
  snowSuit(t, coat, { hem: maxed && bottom ? 0x90caf9 : 0xf5f5f5 });
  belt(t, 0x546e7a, ICE);
  shardBadge(h, t);
  const tanks = level >= 4 ? 2 : 1;
  coolant(t, bottom && level >= 4 ? 0x455a64 : 0x90a4ae, ice, { n: tanks, r: tanks > 1 ? 0.36 : 0.44, h: 1.5 });
  if (bottom && level >= 4) for (const s of [-1, 1]) for (const y of [0.4, -0.3]) t.cyl(0.39, 0.08, pale, s * 0.4, y, -0.95, { seg: 14 }); // overcharge rings
  if (top && level >= 1 && !maxed) for (const s of [-1, 1]) {
    t.ball(0.6, 0xfafafa, s * 1.42, 0.95, 0, { sy: 0.55, seg: 14, rows: 8 });
    for (const z of [-0.3, 0.1, 0.4]) icicle(t, s * (1.55 + z * 0.1), 0.72, z, 0.3 + Math.abs(z) * 0.35, pale);
  }
  if (bottom && level >= 1) {
    // Ice Block: a cube of ice clipped to the belt
    t.box(0.5, 0.5, 0.5, pale, 0.75, -0.75, 0.75, { r: 0.05 });
    t.box(0.56, 0.08, 0.56, INK, 0.75, -0.55, 0.75);
  }
  if (maxed) icePauldrons(t, pale, ice);
  if (bottom && maxed) {
    vest(t, 0x0d47a1, { pouches: 3, pouch: 0x1565c0 });
    for (let i = 0; i < 5; i++) icicle(t, -0.8 + i * 0.4, -0.95, 0.68, 0.3, pale);
  }
  hd.done();
  t.done();
  hands(h, key, 0x546e7a, tone(coat, 0.85));
  feet(h, key, 0x546e7a, (b) => {
    b.box(1.14, 0.18, 1.16, 0xf5f5f5, 0, -1.34, 0.02, { r: 0.06 });
    if (bottom && level >= 3) kneePad(b, 0x0277bd);
  });
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  let y;
  let z = UP + 0.02;
  if (bottom && level >= 3) {
    // the Cryo Rifle: long, scoped, with an ice cell and frost coils
    [y, z] = rifle(gk, { len: maxed ? 3.1 : 2.8, body: maxed ? 0x0d47a1 : 0xeceff1, furn: 0x37474f, mag: false, optic: 'scope', lens: ICE, glow: ice });
    gk.cyl(0.17, 0.5, ice, 0, -0.6, UP - 0.4, { seg: 10 });
    for (const s of [-1, 1]) gk.box(0.04, 0.55, 0.04, INK, s * 0.17, -0.6, UP - 0.4);
    for (let i = 0; i < (level >= 4 ? 3 : 2); i++) gk.torus(0.1, 0.03, ice, 0, -1.8 - i * 0.25, z, { rx: PI / 2, seg: 10 });
    if (maxed) for (const s of [-1, 1]) gk.cyl(0.08, 0.45, pale, s * 0.2, -1.2, UP + 0.3, { axis: 'z', seg: 6, r2: 0.001, ry: s * 0.5 });
  } else {
    const big = top ? level >= 2 : level >= 2;
    y = fanGun(h, g, gk, key, {
      fan: big ? 0.72 : 0.55, light: ice, twin: bottom && level >= 2, blades: top && level >= 3 ? 6 : 5,
      storm: top && maxed ? pale : null,
    });
    if (top && level >= 3) for (let i = 0; i < 2; i++) gk.torus(0.3, 0.04, ice, 0, -0.85 - i * 0.18, UP + 0.02, { rx: PI / 2, seg: 14 });
  }
  gk.done();
  if (top && maxed) h.idleSpin = 4; // Snow Storm: the fan never stops
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = ICE;
  h.tracerWidth = bottom && level >= 3 ? (maxed ? 0.35 : 0.25) : 0.3;
  return own(h);
}
export const makeCryoBlasterBottom = (level) => makeCryoBlaster(level, true);

// ------------------------------------------------------------------ Cryo Mortar

/**
 * Cryo Mortar (alternate Harpoon Hunter form): a gunner in an arctic parka loading ice shells into
 * a frosty mortar. Lv 1 snow goggles and a crate of shells, Lv 2 a wider tube and a vest, Lv 3
 * Nitrogen Shell: two nitrogen tanks, Lv 4 a longer tube with frost bands, Lv 5 Ice Is Nice: a
 * huge glowing ice cannon, a dark blue coat and ice crystals round the base.
 */
export function makeCryoMortar(level) {
  const nice = level >= 5;
  const coat = nice ? 0x0288d1 : 0xeceff1;
  const h = makeHumanoid({ skin: 0xffcc80, shirt: coat, pants: nice ? 0x01579b : 0x90a4ae, arms: coat, face: 'soldier' });
  const key = `cryoMortar${level}`;
  const ice = glowMat(h, ICE);
  const pale = glowMat(h, 0xb3e5fc);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (nice) helmet(hd, 0x01579b, { cover: 0x0277bd });
  else furHat(hd, 0x78909c, 0xf5f5f5);
  if (level >= 1) goggles(hd, nice ? 0.76 : 0.82, ice, { r: nice ? 0.68 : 0.7 });
  // a parka: puffy body, fur hem, toggles, big pockets
  t.box(2.24, 1.95, 1.2, coat, 0, 0.02, 0, { r: 0.2 });
  t.box(2.3, 0.26, 1.26, 0xf5f5f5, 0, -0.95, 0, { r: 0.1 });
  for (let i = 0; i < 4; i++) t.box(0.06, 0.2, 0.08, WOOD, 0.08, 0.6 - i * 0.38, 0.62, { rz: PI / 2 });
  for (const s of [-1, 1]) pouch(t, s * 0.55, -0.45, 0.58, 0.55, 0.5, tone(coat, 0.85), 0.12);
  shardBadge(h, t, -0.55, 0.5);
  if (level >= 2) vest(t, nice ? 0x01579b : 0x78909c, { pouches: 2 });
  if (level >= 4) neckScarf(t, 0x4fc3f7);
  hd.done();
  t.done();
  hands(h, key, 0x37474f, 0xf5f5f5);
  feet(h, key, 0x5d4037, (b) => {
    b.box(1.14, 0.2, 1.16, 0xf5f5f5, 0, -1.34, 0.02, { r: 0.06 });
    kneePad(b, 0x546e7a);
  });
  // the ground: a patch of snow, a crate of shells, nitrogen tanks, ice crystals
  const r = wear(h, h.root, `${key}:ground`);
  r.cyl(2.6, 0.08, 0xf5f9fc, 0.2, 0.04, 1.2, { seg: 20, sx: 1.25 });
  for (const [x, z, s] of [[-2.2, -0.6, 0.5], [2.4, 2.8, 0.4], [-1.6, 3.0, 0.35]]) r.ball(s, 0xeef4f8, x, 0.05, z, { seg: 10, rows: 5, sy: 0.4 });
  if (level >= 1) {
    r.box(1.3, 0.6, 0.9, 0x78909c, -2.1, 0.3, 1.0, { r: 0.04 });
    r.box(1.34, 0.08, 0.94, 0x546e7a, -2.1, 0.55, 1.0);
    r.box(1.3, 0.06, 0.7, 0x90a4ae, -2.1, 0.85, 0.5, { rx: -0.9 }); // open lid
    for (const x of [-2.45, -2.1, -1.75]) {
      r.cyl(0.13, 0.45, 0xb0bec5, x, 0.75, 1.0, { seg: 10 });
      r.cyl(0.13, 0.2, ice, x, 1.07, 1.0, { seg: 10, r2: 0.03 });
    }
  }
  if (level >= 3) for (const x of [1.7, 2.4]) {
    // nitrogen tanks: tall bottles with frosty valves
    r.cyl(0.3, 1.5, 0x90a4ae, x, 0.85, 0.3, { seg: 14 });
    r.ball(0.3, 0x90a4ae, x, 1.6, 0.3, { sy: 0.45, seg: 14, rows: 5 });
    r.cyl(0.31, 0.16, ice, x, 0.9, 0.3, { seg: 14 });
    r.cyl(0.08, 0.2, STEEL, x, 1.82, 0.3, { seg: 8 });
    r.torus(0.12, 0.03, 0x1565c0, x, 1.92, 0.3, { rx: PI / 2, seg: 10 });
    r.box(0.5, 0.06, 0.04, INK, x, 0.85, 0.62); // N2 label
    icicle(r, x + 0.2, 1.55, 0.55, 0.3, pale);
  }
  if (nice) for (let i = 0; i < 5; i++) {
    const a = -0.9 + i * 0.45;
    shard(r, Math.sin(a) * 1.7, 0, 2.2 + Math.cos(a) * 1.4, 0.7 + (i % 2) * 0.5, 0.2, pale);
  }
  r.done();
  const w = nice ? 0.55 : level >= 2 ? 0.44 : 0.36;
  const len = nice ? 4.4 : level >= 4 ? 3.9 : 3.2;
  const tube = mortarGun(h, key, {
    r: w, len, col: nice ? 0x0277bd : 0x78909c, z: 2.3, lean: 0.45,
    bands: level >= 4 ? pale : null, stripe: nice ? ice : null, rings: level >= 2 ? [0.25] : [],
  });
  // a frosted rim with icicles under the mouth
  const f = wear(h, tube, `${key}:frost`);
  f.cyl(w + 0.1, 0.12, ice, 0, len - 0.3, 0, { seg: 18 });
  const n = level >= 2 ? 6 : 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2 + 0.3;
    icicle(f, Math.sin(a) * (w + 0.06), len - 0.36, Math.cos(a) * (w + 0.06), 0.2 + (i % 2) * 0.12, pale);
  }
  if (nice) for (let i = 0; i < 4; i++) shard(f, Math.sin(i * 1.6) * (w + 0.05), len * 0.45, Math.cos(i * 1.6) * (w + 0.05), 0.5, 0.1, pale, { rz: Math.sin(i * 1.6) * -0.8, rx: Math.cos(i * 1.6) * 0.8 });
  f.done();
  h.muzzles = [];
  muzzle(h, tube, len + 0.3, 0);
  loaderPose(h, key, 0xb0bec5, nice, ice);
  h.projectile = { color: ICE, size: nice ? 1.0 : 0.7, arc: 16, glowing: true };
  return own(h, 0);
}

// ------------------------------------------------------------------ Archer

/**
 * A recurve bow in the left fist (gun space: the arrow flies along -y, +z is up). The grip is at
 * the fist, the limbs curve back towards the archer and flick forward at the tips. o: limb
 * (colour), string (colour or glow), arrow tip (colour or glow), big, keg (a powder keg on the
 * arrow), shock (glowing coils on the limbs). Returns the arrow tip y.
 */
function bow(k, o) {
  const L = o.big ? 2.2 : 1.9;
  const limb = o.limb;
  k.box(0.2, 0.26, 0.9, tone(limb, 0.8), 0, 0, 0, { r: 0.06 }); // riser
  k.box(0.22, 0.2, 0.5, LEATHER, 0, 0, 0, { r: 0.04 }); // leather grip
  k.box(0.06, 0.18, 0.2, INK, -0.12, -0.04, 0.32); // arrow rest
  const tips = [];
  for (const s of [-1, 1]) {
    const pts = [[0, 0, s * 0.42], [0, 0.18, s * L * 0.5], [0, 0.38, s * L * 0.85], [0, 0.26, s * L]];
    k.tube(pts, 0.07, limb, { seg: 16, sides: 6 });
    k.cyl(0.08, 0.14, GOLD, 0, 0.32, s * L * 0.82, { seg: 8, rx: s * 0.5 }); // tip caps
    if (o.shock) for (const f of [0.5, 0.7]) k.torus(0.1, 0.03, o.shock, 0, 0.15 + f * 0.2, s * L * f, { seg: 10 });
    tips.push([0, 0.26, s * L]);
  }
  // the string, drawn back a little to the nock
  const nock = 0.85;
  k.tube([tips[0], [0, nock, 0], tips[1]], 0.02, o.string, { seg: 4, sides: 4, tension: 0 });
  // the arrow: shaft, fletching, head
  const ay = -0.75;
  k.cyl(0.035, nock - ay, 0xd7ccc8, -0.08, (nock + ay) / 2, 0.06, { seg: 6 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    k.box(0.02, 0.32, 0.12, o.fletch ?? 0xc62828, -0.08 + Math.sin(a) * 0.06, nock - 0.25, 0.06 + Math.cos(a) * 0.06, { ry: a });
  }
  if (o.keg) {
    k.cyl(0.12, 0.26, 0x5d4037, -0.08, ay + 0.05, 0.06, { seg: 10 });
    for (const d of [-0.08, 0.08]) k.cyl(0.13, 0.03, INK, -0.08, ay + 0.05 + d, 0.06, { seg: 10 });
  }
  k.cyl(0.09, 0.26, o.tip, -0.08, ay - 0.13, 0.06, { seg: 6, r2: 0.005 }); // arrow head (point forward)
  return ay - 0.3;
}

/**
 * Archer (Bowmaster form): a ranger in a long green cloak with a big recurve bow. Lv 1 Eagle Eye:
 * amber goggles and a feather, Lv 2 Deadshot: bracers and a bigger bow, Lv 3 flaming arrow tips,
 * Lv 4 powder kegs on the belt and on the arrow, Lv 5 Shock & Awe: a storm-blue cloak and a bow
 * with crackling coils.
 */
export function makeBowmaster(level) {
  const storm = level >= 5;
  const coat = storm ? 0x1a237e : 0x33691e;
  const cloak = storm ? 0x283593 : 0x2e7d32;
  const h = makeHumanoid({ skin: 0xffcc80, shirt: coat, pants: 0x3e2723, arms: coat });
  const key = `archer${level}`;
  const flame = glowMat(h, 0xff7043);
  const spark = glowMat(h, 0x80d8ff);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x6d4c41, { h: 0.4 });
  hood(hd, storm ? 0x0d1440 : 0x1b5e20);
  if (level >= 1) {
    goggles(hd, 0.76, glowMat(h, 0xffd740), { r: 0.7, frame: 0x5d4037, strap: 0x3e2723 });
    hd.box(0.08, 0.6, 0.16, storm ? 0x80d8ff : 0xfafafa, -0.72, 1.15, -0.25, { rz: 0.4, r: 0.03 }); // feather
  }
  // a tunic with a leather jerkin and a long cloak
  t.box(2.2, 1.9, 1.18, coat, 0, 0.05, 0, { r: 0.14 });
  t.slab(1.6, 1.5, 0.1, LEATHER, 0, 0.0, 0.6, { tw: 0.85 });
  for (let i = 0; i < 4; i++) t.box(0.3, 0.05, 0.05, tone(LEATHER, 0.6), 0, 0.5 - i * 0.3, 0.66); // laces
  t.slab(2.3, 3.2, 0.1, cloak, 0, -0.55, -0.66, { bw: 1.25 }); // cloak
  t.box(2.3, 0.25, 1.25, cloak, 0, 0.92, -0.02, { r: 0.08 }); // cloak collar
  t.cyl(0.13, 0.06, GOLD, 0.6, 0.85, 0.64, { axis: 'z', seg: 10 }); // clasp
  belt(t, 0x3e2723, GOLD);
  pouch(t, -0.6, -0.95, 0.55, 0.4, 0.4, LEATHER, 0.2);
  shardBadge(h, t, -0.5, 0.5);
  // the quiver, slung on the back with arrows sticking out
  t.cyl(0.32, 1.7, LEATHER, 0.45, 0.25, -0.95, { seg: 12, rz: 0.3 });
  t.cyl(0.34, 0.1, INK, 0.62, 0.95, -0.95, { seg: 12, rz: 0.3 });
  for (let i = 0; i < 4; i++) {
    const dx = (i - 1.5) * 0.12;
    t.cyl(0.03, 0.6, 0xd7ccc8, 0.75 + dx, 1.3, -0.95 + (i % 2) * 0.1, { seg: 5, rz: 0.3 });
    t.box(0.03, 0.25, 0.14, i % 2 ? 0xfafafa : 0xc62828, 0.82 + dx, 1.5, -0.95 + (i % 2) * 0.1, { rz: 0.3 });
    if (level >= 3) t.ball(0.07, flame, 0.7 + dx, 1.15, -0.9 + (i % 2) * 0.1, { seg: 6, rows: 4 });
  }
  t.box(0.12, 2.6, 0.06, INK, 0, 0.05, 0.62, { rz: -0.6 }); // quiver strap
  if (level >= 4) for (const x of [-0.75, 0.75]) {
    // powder kegs on the belt
    t.cyl(0.24, 0.45, 0x5d4037, x, -1.15, 0.62, { seg: 12 });
    for (const d of [-0.15, 0.15]) t.cyl(0.25, 0.05, INK, x, -1.15 + d, 0.62, { seg: 12 });
    t.cyl(0.03, 0.15, 0x3e2723, x, -0.86, 0.62, { seg: 5 });
  }
  if (storm) for (let i = 0; i < 4; i++) t.box(0.06, 0.4, 0.04, spark, -0.9 + i * 0.6, -1.9, -0.98, { rz: (i % 2 ? 1 : -1) * 0.5 }); // sparks on the hem
  hd.done();
  t.done();
  hands(h, key, LEATHER, tone(coat, 0.8), level >= 2 ? (a) => {
    a.box(1.1, 0.6, 1.1, LEATHER, 0, -1.3, 0, { r: 0.08 }); // bracer
    for (let i = 0; i < 3; i++) a.box(1.14, 0.05, 1.14, GOLD, 0, -1.12 - i * 0.18, 0);
  } : null);
  feet(h, key, 0x4e342e, (b) => b.box(1.14, 0.2, 1.16, 0x6d4c41, 0, -1.34, 0.02, { r: 0.05 }));
  const g = fist(h.leftArm, -1.9, 1.2);
  const k = wear(h, g, `${key}:bow`);
  const tip = bow(k, {
    big: level >= 2, limb: storm ? 0x37474f : 0x795548, string: storm ? spark : 0xeeeeee,
    tip: level >= 3 ? flame : STEEL, keg: level >= 4, shock: storm ? spark : null,
    fletch: storm ? 0x80d8ff : 0xc62828,
  });
  if (level >= 3) k.ball(0.14, flame, -0.08, tip + 0.08, 0.06, { seg: 8, rows: 6, sy: 1.4 }); // flame on the tip
  k.done();
  h.muzzles = [];
  muzzle(h, g, tip, 0.06, -0.08);
  h.leftArm.rotation.set(-PI / 2, 0, 0.3);
  h.rightArm.rotation.set(-PI / 2, 0, -0.4);
  h.pose = { right: -PI / 2, left: -PI / 2, leftRecoil: 0 };
  h.tracer = storm ? 0x80d8ff : level >= 3 ? 0xff7043 : 0xd7ccc8;
  return own(h, 0);
}

export const MODELS = {
  kniferSlasher: makeSlasher,
  sleeterBlaster: makeFrostBlaster,
  flameTrooper: makeFlameTrooper,
  gooGunner: makeGooGunner,
  frostBlaster: makeCryoBlaster,
  frostBlasterBottom: makeCryoBlasterBottom,
  cryoMortar: makeCryoMortar,
  archerBow: makeBowmaster,
};
