// Tower models: people, batch 18 (dressed with the vehicle kit in ../vehicles.js).
// In here: Combat Medic (+bottom), Jet Trooper (+bottom), Refractor (+bottom), Noob Tuber, Stinger,
// Void Traitor, Knifer.
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.

import * as THREE from 'three';
import { antenna, glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { makeThing } from './bits.js';
import {
  GOLD, GUNMETAL, INK, STEEL, UP, WOOD, aimLong, band, belt, boots, canteen, collar, dome, fist, goggles, hair,
  helmet, kneePad, muzzle, own, pistol, pockets, pouch, rifle, shardOf, vest, wear,
} from './people1.js';
import { boonie, shoulderPads } from './people2.js';
import { bandolier } from './people3.js';
import { beamGun, cellPack, chestPlate, visorHelmet } from './people4.js';
import { feet, glassMat, hands, hood } from './people5.js';
import { rocketPod, tubeLauncher } from './people7.js';
import { bag } from './machines2.js';
import { spinner } from './machines5.js';

const PI = Math.PI;
const RED = 0xd32f2f;
const SAND = 0xc8b48a;
const OLIVE = 0x4e5b31;
const _e = new THREE.Euler();
const _n = new THREE.Vector3();

// ------------------------------------------------------------------ shared bits for this batch

/** A round patch with a cross on it, facing +z turned by o.rx / o.ry (any space). */
function crossPatch(k, x, y, z, r, bg, fg, o = {}) {
  _n.set(0, 0, 1).applyEuler(_e.set(o.rx ?? 0, o.ry ?? 0, 0));
  const rot = { rx: o.rx ?? 0, ry: o.ry ?? 0 };
  k.cyl(r, 0.04, bg, x, y, z, { axis: 'z', seg: 16, ...rot });
  const d = 0.03;
  k.box(r * 1.25, r * 0.38, 0.03, fg, x + _n.x * d, y + _n.y * d, z + _n.z * d, rot);
  k.box(r * 0.38, r * 1.25, 0.03, fg, x + _n.x * d, y + _n.y * d, z + _n.z * d, rot);
}

/** Camo blotches on the front and back of the chest (torso space). */
function camo(k, cols, seed = 1) {
  for (let i = 0; i < 9; i++) {
    const a = Math.sin(seed * 3.1 + i * 1.7);
    const b = Math.cos(seed * 1.3 + i * 2.3);
    const w = 0.35 + Math.abs(a) * 0.3;
    const hh = 0.22 + Math.abs(b) * 0.2;
    const side = i % 2 ? 1 : -1;
    k.box(w, hh, 0.02, cols[i % cols.length], a * 0.65, b * 0.7, side * 0.505, { rz: a * 0.6, r: 0.008 });
  }
}

/** A cape from the shoulders, flaring out at the bottom (torso space). o: w, clasp, tatter (points along the hem). */
export function cape(k, col, len, o = {}) {
  const w = o.w ?? 2.2;
  k.slab(w, len, 0.1, col, 0, 1 - len / 2, -0.62, { bw: 1.25, bz: -0.18 });
  k.box(w + 0.25, 0.3, 0.72, tone(col, 0.85), 0, 0.97, -0.26, { r: 0.12 }); // collar over the shoulders
  for (let i = 0; i < 3; i++) k.box(0.04, len * 0.8, 0.03, tone(col, 0.75), (i - 1) * 0.6, 1 - len * 0.45, -0.69 - i * 0.0, { rz: (i - 1) * 0.06 }); // folds
  if (o.clasp != null) for (const s of [-1, 1]) k.cyl(0.13, 0.08, o.clasp, s * 0.8, 0.85, 0.56, { axis: 'z', seg: 10 });
  if (o.tatter) {
    const n = 6;
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5) / n - 0.5) * w * 1.2;
      k.cyl(0.005, 0.4 + (i % 2) * 0.2, col, x, 1 - len - 0.18 - (i % 2) * 0.1, -0.62 - 0.17, { r2: 0.2, seg: 3, sz: 0.3 });
    }
  }
}

/** A gauntlet: armour plates down the forearm and a plated glove (arm space). */
export function gauntlet(k, col, trim) {
  k.box(1.08, 0.7, 1.08, col, 0, -1.25, 0, { r: 0.08 });
  k.box(1.12, 0.1, 1.12, trim, 0, -0.92, 0);
  k.box(1.06, 0.42, 1.06, tone(col, 0.8), 0, -1.82, 0, { r: 0.06 });
  for (let i = 0; i < 3; i++) k.box(0.2, 0.08, 0.2, tone(col, 0.6), -0.3 + i * 0.3, -1.98, 0.48); // knuckles
}

// ------------------------------------------------------------------ Combat Medic

/** A docked medic quad drone on the back (torso space): body, cross, arms, spinning rotors. */
function medDrone(h, t, key, x, y, z) {
  t.box(0.62, 0.24, 0.62, 0xeceff1, x, y, z, { r: 0.08 });
  t.box(0.5, 0.08, 0.5, 0xbdbdbd, x, y - 0.15, z, { r: 0.03 });
  crossPatch(t, x, y + 0.13, z, 0.16, 0xeceff1, RED, { rx: -PI / 2 });
  t.cyl(0.09, 0.08, INK, x, y - 0.06, z + 0.32, { axis: 'z', seg: 10 }); // camera
  t.cyl(0.06, 0.02, glowMat(h, 0x69f0ae), x, y - 0.06, z + 0.37, { axis: 'z', seg: 10 });
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    t.box(0.5, 0.06, 0.08, 0x90a4ae, x + dx * 0.32, y + 0.06, z + dz * 0.32, { ry: dx * dz > 0 ? -PI / 4 : PI / 4 });
    t.cyl(0.07, 0.14, INK, x + dx * 0.5, y + 0.12, z + dz * 0.5, { seg: 8 }); // motor
    const r = spinner(h, h.torso, x + dx * 0.5, y + 0.21, z + dz * 0.5);
    const rk = wear(h, r, `p18:medrotor`);
    rk.box(0.5, 0.02, 0.07, 0x263238, 0, 0, 0);
    rk.box(0.07, 0.02, 0.5, 0x263238, 0, 0, 0);
    rk.cyl(0.04, 0.05, STEEL, 0, 0.02, 0, { seg: 6 });
    rk.done();
  }
}

/**
 * Combat Medic: a camo medic with a rifle, a red-cross helmet and armband. Top path: a drum mag
 * (Lv 1), an ammo belt (Lv 2), a Revive Pack with a glowing green cross (Lv 3), defib paddles on
 * it (Lv 4), then an armoured vest and a green visor (Lv 5). Bottom path: med pouches (Lv 1), a
 * big med bag (Lv 2), a drone pack with a Medic Drone docked on it, rotors turning (Lv 3), an
 * antenna (Lv 4), then a cyan visor and 2 drones (Lv 5).
 */
export function makeCombatMedic(level, bottom = false) {
  const top = !bottom;
  const shirt = 0x5b6b3a;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: OLIVE, arms: shirt, face: 'soldier' });
  const key = `p18medic${bottom ? 'B' : 'T'}${level}`;
  const green = glowMat(h, 0x69f0ae);
  const cyan = glowMat(h, 0x18ffff);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  helmet(hd, 0x556b2f, { cover: 0x3e4a2a });
  crossPatch(hd, 0, 1.2, 0.66, 0.24, 0xfafafa, RED, { rx: -0.5 });
  for (const s of [-1, 1]) crossPatch(hd, s * 0.66, 1.18, 0, 0.18, 0xfafafa, RED, { ry: s * PI / 2, rx: 0 });
  if (level >= 5) {
    const visorM = top ? green : cyan;
    band(hd, 0.8, 0.05, 0.26, 2.0, tone(0x37412a, 1), 0.74);
    band(hd, 0.84, 0.04, 0.18, 1.8, visorM, 0.74);
    for (const s of [-1, 1]) hd.cyl(0.07, 0.06, INK, s * 0.74, 0.8, 0.3, { axis: 'x', seg: 8 });
  }
  camo(t, [0x4b5a30, 0x6b7a45, 0x3e4a26], 2);
  collar(t, tone(shirt, 0.85));
  crossPatch(t, 0.5, 0.42, 0.53, 0.22, 0xfafafa, RED);
  belt(t, 0x3e2723, 0x9e9e9e);
  canteen(t, 0.8);
  pouch(t, -0.62, -0.95, 0.52, 0.36, 0.34, 0x4b5320);
  if (level >= 5 && top) {
    vest(t, 0x37412a, { pouches: 3, patch: 0xfafafa });
    crossPatch(t, -0.45, 0.6, 0.68, 0.14, 0xfafafa, RED);
  }
  if (top && level >= 2) bandolier(t, 1, 0x4e342e);
  if (top && level >= 3) {
    // Revive Pack: a rounded pack with a glowing green cross and a charge gauge
    t.box(1.45, 1.6, 0.7, 0x33691e, 0, 0.0, -0.88, { r: 0.12 });
    t.box(1.4, 0.36, 0.76, 0x2e5418, 0, 0.66, -0.88, { r: 0.08 }); // lid
    t.box(0.9, 0.9, 0.06, 0x1b2e10, 0, -0.05, -1.25, { r: 0.04 });
    t.box(0.7, 0.2, 0.06, green, 0, -0.05, -1.29);
    t.box(0.2, 0.7, 0.06, green, 0, -0.05, -1.29);
    for (let i = 0; i < 4; i++) t.box(0.14, 0.08, 0.04, i < 3 ? green : INK, -0.45 + i * 0.3, 0.66, -1.27); // charge lights
    for (const s of [-1, 1]) {
      t.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
      t.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
    }
    if (level >= 4) {
      // defib paddles on the sides of the pack, coiled cables
      for (const s of [-1, 1]) {
        const x = s * 0.88;
        t.box(0.2, 0.55, 0.42, 0xfdd835, x, -0.25, -0.88, { r: 0.06 });
        t.box(0.24, 0.12, 0.46, INK, x, -0.52, -0.88, { r: 0.03 });
        t.cyl(0.07, 0.35, INK, x + s * 0.12, 0.12, -0.88, { seg: 8 }); // handle
        t.tube([[x, 0.3, -0.88], [x + s * 0.12, 0.55, -1.05], [x * 0.7, 0.6, -1.22], [x * 0.3, 0.4, -1.25]], 0.03, 0x263238, { seg: 14, sides: 4 });
      }
      t.box(0.2, 0.32, 0.04, 0xfdd835, 0.48, 0.3, -1.25, { rz: 0.4 }); // lightning mark
    }
  }
  if (bottom) {
    if (level >= 1) for (const x of [-0.6, 0.05]) {
      pouch(t, x, -0.52, 0.52, 0.45, 0.45, 0x3e4a26, 0.22);
      crossPatch(t, x, -0.58, 0.76, 0.09, 0xfafafa, RED);
    }
    if (level >= 2) {
      // a big med bag on the right hip, its strap over the left shoulder
      t.box(0.2, 2.45, 1.14, 0x3e2723, 0, 0.1, 0, { rz: 0.62 });
      t.box(0.75, 0.85, 1.0, RED, -1.32, -0.85, 0, { r: 0.12 });
      t.box(0.78, 0.25, 1.04, 0xb71c1c, -1.32, -0.5, 0, { r: 0.06 });
      crossPatch(t, -1.71, -0.9, 0, 0.18, 0xfafafa, RED, { ry: -PI / 2 });
      t.box(0.5, 0.06, 0.06, 0xbdbdbd, -1.32, -0.62, 0.52); // zip
    }
    if (level >= 3) {
      // drone pack: a back frame with a dock on top
      t.box(1.35, 1.5, 0.55, 0x455a64, 0, -0.05, -0.82, { r: 0.1 });
      t.box(1.45, 0.14, 0.95, 0x37474f, 0, 0.98, -0.85, { r: 0.04 }); // dock deck
      for (const s of [-1, 1]) t.box(0.1, 0.45, 0.1, INK, s * 0.6, 0.75, -0.85);
      for (let i = 0; i < 3; i++) t.box(0.9, 0.04, 0.04, 0x263238, 0, -0.4 + i * 0.25, -1.11);
      t.box(0.3, 0.16, 0.04, green, 0.35, 0.55, -1.11);
      for (const s of [-1, 1]) {
        t.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
        t.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
      }
      const drones = level >= 5 ? [-0.62, 0.62] : [0];
      for (const x of drones) medDrone(h, t, key, x, 1.25, -0.85);
      h.idleSpin = 14;
    }
    if (level >= 4) {
      t.cyl(0.04, 1.5, INK, 0.62, 1.55, -1.05, { seg: 6 });
      t.ball(0.1, glowMat(h, 0xff1744), 0.62, 2.32, -1.05, { seg: 8, rows: 6 });
      t.box(0.2, 0.25, 0.2, 0x263238, 0.62, 0.85, -1.05, { r: 0.03 });
    }
  }
  hd.done();
  t.done();
  hands(h, key, 0x3e2723, tone(shirt, 0.82), (a, s) => {
    if (s < 0) return;
    // white armband with a red cross on the left arm
    a.box(1.06, 0.42, 1.06, 0xfafafa, 0, -0.5, 0, { r: 0.03 });
    a.box(0.03, 0.3, 0.1, RED, 0.545, -0.5, 0);
    a.box(0.03, 0.1, 0.3, RED, 0.545, -0.5, 0);
  });
  feet(h, key, 0x3e2723, level >= 3 ? (b) => kneePad(b, 0x3e4a26) : null);
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = rifle(gk, {
    len: 2.2, furn: 0x3e4a26, mag: top && level >= 1 ? 'drum' : 'curved',
    optic: level >= 3 ? 'dot' : 'iron', lens: top ? 0x69f0ae : 0x18ffff, light: level >= 4,
  });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.medi = 0x69f0ae;
  h.tracer = 0xffe082;
  return own(h);
}
export const makeCombatMedicBottom = (level) => makeCombatMedic(level, true);

// ------------------------------------------------------------------ Jet Trooper

/**
 * Jet Trooper: a round launch pad, plus a soldier with a jetpack that the view hovers above it
 * (like a helicopter, so it can fly wherever the sim puts it). The turbine fans spin. Top path:
 * a longer mag (Lv 1), bigger thrusters (Lv 2), a sensor visor (Lv 3), an ammo belt (Lv 4), then
 * white-blue Air Defender armour with wings (Lv 5). Bottom path: an antenna (Lv 1), a heavy vest
 * (Lv 2), an orange explosive-ammo rifle with a launcher (Lv 3), fuel tanks for fire rounds
 * (Lv 4), then the black-red X-Jet Suit with wings (Lv 5).
 */
export function makeJetTrooper(level, bottom = false) {
  const u = makeThing();
  const top = !bottom;
  const x5 = level >= 5;
  const key = `p18jet${bottom ? 'B' : 'T'}${level}`;
  // the pad: a concrete disc with a steel rim, a hazard ring, a blast grate, lights and a fuel pump
  const lamp = glowMat(u, 0xff9100);
  const p = wear(u, u.body, `${key}:pad`);
  p.cyl(1.8, 0.3, 0x546e7a, 0, 0.15, 0, { seg: 32, r2: 1.72 });
  p.torus(1.72, 0.06, STEEL, 0, 0.3, 0, { rx: PI / 2, seg: 32 });
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * PI * 2;
    p.box(0.5, 0.03, 0.2, i % 2 ? 0xfdd835 : INK, Math.cos(a) * 1.42, 0.31, Math.sin(a) * 1.42, { ry: -a + PI / 2 });
  }
  p.cyl(0.95, 0.04, 0x263238, 0, 0.32, 0, { seg: 24 });
  for (let i = 0; i < 7; i++) p.box(1.5 - Math.abs(i - 3) * 0.18, 0.03, 0.06, 0x111111, 0, 0.345, (i - 3) * 0.22); // grate slots
  p.torus(0.95, 0.04, STEEL, 0, 0.34, 0, { rx: PI / 2, seg: 24 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4;
    const x = Math.cos(a) * 1.2;
    const z = Math.sin(a) * 1.2;
    p.cyl(0.12, 0.1, INK, x, 0.35, z, { seg: 10 });
    dome(p, 0.1, 0.1, lamp, x, 0.4, z, { seg: 10 });
  }
  // fuel pump at the back edge with a coiled hose
  p.box(0.5, 0.9, 0.4, 0xc62828, -1.05, 0.75, -1.05, { r: 0.05, ry: PI / 4 });
  p.box(0.3, 0.2, 0.04, 0x263238, -0.9, 0.95, -0.9, { ry: PI / 4 });
  p.tube([[-0.85, 0.6, -0.85], [-0.6, 0.45, -0.75], [-0.75, 0.35, -0.5], [-1.0, 0.38, -0.6]], 0.04, INK, { seg: 16, sides: 5 });
  p.done();

  const suit = x5 ? (top ? 0xeceff1 : 0x1a1a1a) : 0x546e7a;
  const h = makeHumanoid({ skin: 0xc68642, shirt: suit, pants: x5 ? (top ? 0x1565c0 : 0x111111) : 0x37474f, arms: suit, face: 'soldier' });
  const accentC = x5 ? (top ? 0x40c4ff : 0xff1744) : 0xff9100;
  const accent = glowMat(h, accentC);
  const flameOut = glassMat(h, bottom && x5 ? 0xff6d00 : 0xffab40, 0.7);
  const flameIn = glowMat(h, 0xfff59d, 1);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const helmC = x5 ? (top ? 0x1565c0 : 0x212121) : 0x37474f;
  helmet(hd, helmC, { band: false });
  if ((top && level >= 3) || x5) {
    band(hd, 0.8, 0.05, 0.28, 2.0, tone(helmC, 0.7), 0.74);
    band(hd, 0.84, 0.04, 0.2, 1.8, x5 ? accent : glowMat(h, 0x76ff03), 0.74);
  } else goggles(hd, 1.22, 0x4fc3f7, { r: 0.76, strap: INK });
  if (bottom && level >= 1) antenna(hd, 0.6, 1.1, -0.3, 1.0);
  collar(t, tone(suit, 0.85), { buttons: false });
  t.box(0.06, 1.5, 0.05, 0x90a4ae, 0, -0.05, 0.56); // flight suit zip
  belt(t, INK, 0x9e9e9e);
  if (bottom && level >= 2 && !x5) vest(t, 0x4e5b31, { pouches: 3 });
  if (x5) {
    chestPlate(t, top ? 0xeceff1 : 0x212121, accent);
    shoulderPads(t, top ? 0xb0bec5 : 0x2b2b2b, 0.62);
  }
  if (top && level >= 4) bandolier(t, -1);
  // the jetpack: a frame plate, a centre fuel tank and two turbines with nozzles and flames
  const big = (top && level >= 2) || x5;
  const R = big ? 0.36 : 0.28;
  const fl = big ? 1.5 : 1.0;
  const packC = x5 ? (top ? 0xcfd8dc : 0x2b2b2b) : 0x78909c;
  t.box(1.5, 1.7, 0.22, tone(packC, 0.8), 0, 0.1, -0.62, { r: 0.06 });
  t.cyl(0.26, 1.2, tone(packC, 0.9), 0, 0.25, -0.95, { seg: 14 });
  dome(t, 0.26, 0.18, tone(packC, 0.9), 0, 0.85, -0.95, { seg: 14 });
  t.box(0.1, 0.5, 0.06, accent, 0, 0.25, -1.22);
  for (const s of [-1, 1]) {
    const x = s * (0.42 + R);
    t.cyl(R, 1.35, packC, x, 0.15, -0.98, { seg: 16 });
    t.torus(R, 0.05, INK, x, 0.83, -0.98, { rx: PI / 2, seg: 16 }); // intake lip
    t.torus(R + 0.01, 0.04, accent, x, 0.0, -0.98, { rx: PI / 2, seg: 16 });
    t.cyl(R * 0.7, 0.42, INK, x, -0.74, -0.98, { seg: 16, r2: R }); // nozzle
    t.cyl(R * 0.6, 0.03, 0x050505, x, -0.96, -0.98, { seg: 16 });
    t.cyl(0.02, fl, flameOut, x, -0.97 - fl / 2, -0.98, { seg: 12, r2: R * 0.7 }); // flame
    t.cyl(0.02, fl * 0.55, flameIn, x, -0.97 - fl * 0.275, -0.98, { seg: 10, r2: R * 0.4 });
    t.box(0.12, 0.6, 0.3, tone(packC, 0.7), s * 0.28, 0.15, -0.8); // mounts
  }
  for (const s of [-1, 1]) {
    t.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
    t.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
  }
  t.box(0.5, 0.4, 0.1, 0x9e9e9e, 0, 0.0, 0.58, { r: 0.04 }); // harness buckle
  if (bottom && level >= 4) {
    // fire-round fuel tanks on the sides of the pack
    for (const s of [-1, 1]) {
      t.cyl(0.2, 1.1, glowMat(h, 0xff6d00), s * 1.15, 0.2, -0.85, { seg: 12 });
      for (const y of [-0.38, 0.78]) t.cyl(0.22, 0.08, INK, s * 1.15, y, -0.85, { seg: 12 });
    }
  }
  if (x5) {
    // swept wings with tip lights and a stripe
    const wingC = top ? 0xb0bec5 : 0x212121;
    for (const s of [-1, 1]) {
      t.plan([[s * 0.8, -0.72], [s * 0.8, -1.22], [s * 3.0, -1.6], [s * 3.0, -1.3]], 0.1, wingC, 0, 0.35, 0, { rz: s * 0.18 });
      t.box(0.9, 0.04, 0.12, accent, s * 2.2, 0.87, -1.3, { rz: s * 0.18 });
      t.box(0.15, 0.14, 0.3, accent, s * 3.0, 0.95, -1.45, { rz: s * 0.18 });
    }
  }
  hd.done();
  t.done();
  // turbine fans in the intakes (the view spins heli rotors)
  const rotors = [];
  for (const s of [-1, 1]) {
    const fan = new THREE.Group();
    fan.position.set(s * (0.42 + R), 0.8, -0.98);
    h.torso.add(fan);
    const fk = wear(h, fan, `p18:jetfan${big ? 1 : 0}`);
    fk.cyl(R * 0.3, 0.08, STEEL, 0, 0, 0, { seg: 10 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      fk.box(R * 0.75, 0.02, 0.1, 0x90a4ae, Math.cos(a) * R * 0.5, 0, Math.sin(a) * R * 0.5, { ry: -a, rx: 0.4 });
    }
    fk.done();
    rotors.push(fan);
  }
  hands(h, key, x5 ? (top ? 0x1565c0 : 0x111111) : 0x263238, tone(suit, 0.8));
  feet(h, key, x5 ? 0x212121 : 0x263238, (b) => kneePad(b, x5 ? (top ? 0xb0bec5 : 0x2b2b2b) : 0x263238));
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const hot = bottom && level >= 3;
  const [y, z] = rifle(gk, {
    len: 2.1, body: hot ? 0xe65100 : GUNMETAL, furn: hot ? 0x263238 : INK, mag: top && level >= 1 ? 'box' : 'curved',
    optic: (top && level >= 3) || x5 ? 'dot' : 'iron', lens: accentC,
  });
  if (top && level >= 1) gk.box(0.2, 0.3, 0.5, INK, 0, -0.58, UP - 0.95, { rx: 0.08, r: 0.03 }); // extended mag
  if (hot) {
    // under-barrel grenade launcher
    gk.cyl(0.14, 0.9, 0x424242, 0, -1.25, UP - 0.28, { seg: 12 });
    gk.cyl(0.1, 0.03, 0x050505, 0, -1.71, UP - 0.28, { seg: 10 });
    gk.box(0.18, 0.2, 0.3, INK, 0, -0.85, UP - 0.45, { r: 0.03 });
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.leftLeg.rotation.x = 0.25; // legs dangle
  h.rightLeg.rotation.x = 0.1;
  const heli = new THREE.Group();
  const bank = new THREE.Group();
  heli.add(bank);
  h.root.position.y = -2.5;
  bank.add(h.root);
  const prop = new THREE.Object3D(); // nothing spins as a main rotor
  bank.add(prop);
  const bay = new THREE.Object3D();
  bay.position.set(0, -2.5, 0);
  bank.add(bay);
  heli.userData = { bank, prop, tail: null, bay, missiles: [], rotors };
  u.mats.push(...h.mats);
  u.plane = heli;
  u.heli = true;
  u.muzzles = h.muzzles;
  u.spin = null;
  u.flyHeight = 8;
  u.tracer = hot ? 0xff6d00 : 0xffd740;
  return u;
}
export const makeJetTrooperBottom = (level) => makeJetTrooper(level, true);

// ------------------------------------------------------------------ Refractor

/** A crystal prism held in gold claws at the front of a gun (gun space, centred on y along -y). */
function prism(k, y, z, r, mat, claw) {
  k.cyl(0.02, r * 1.5, mat, 0, y - r * 0.75, z, { seg: 6, r2: r }); // front point
  k.cyl(r, r * 0.9, mat, 0, y + r * 0.45, z, { seg: 6, r2: 0.02 }); // back point
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    const cx = Math.sin(a);
    const cz = Math.cos(a);
    k.tube([[cx * 0.12, y + r * 1.2, z + cz * 0.12], [cx * (r + 0.1), y + 0.05, z + cz * (r + 0.1)], [cx * (r * 0.6), y - r * 0.6, z + cz * (r * 0.6)]], 0.035, claw, { seg: 10, sides: 4 });
  }
}

/**
 * Refractor (alternate Phaser form): a white-and-gold armoured gunner with a crystal laser
 * emitter. Top path: glowing cells (Lv 1), a chest fusion core (Lv 2), splitter prisms on the gun
 * (Lv 3), shoulder coils (Lv 4), then a turning halo of orbs (Lv 5). Bottom path: shoulder pads
 * (Lv 1), a power pack (Lv 2), a bigger red-gold cannon (Lv 3), a full face visor (Lv 4), then the
 * huge Calamity cannon and a gold crest (Lv 5). The Bottom path draws a steady beam; the Top path
 * fires thick golden tracers. A purple Dimension Shard badge marks the form.
 */
export function makeRefractor(level, bottom = false) {
  const top = !bottom;
  const hot = bottom && level >= 3;
  const color = hot ? (level >= 5 ? 0xff1744 : 0xff6d00) : 0xffd740;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: 0xeceff1, pants: 0x90a4ae, arms: 0xeceff1, face: 'soldier' });
  const key = `p18refr${bottom ? 'B' : 'T'}${level}`;
  const beam = glowMat(h, color);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  visorHelmet(hd, GOLD, beam, { crest: bottom && level >= 5 ? null : tone(GOLD, 0.8) });
  if (bottom && level >= 4) {
    band(hd, 0.8, 0.06, 0.6, 2.1, tone(GOLD, 0.6), 0.5); // face guard under the visor
    for (let i = 0; i < 3; i++) hd.box(0.3, 0.04, 0.04, beam, 0, 0.32 + i * 0.1, 0.83);
  }
  if (bottom && level >= 5) for (const x of [-0.42, 0, 0.42]) hd.box(0.16, 0.7 - Math.abs(x) * 0.6, 0.6, GOLD, x, 1.65 - Math.abs(x) * 0.3, -0.05, { r: 0.05, rz: -x * 0.6 }); // crest
  chestPlate(t, 0xfafafa, top && level >= 2 ? beam : null, { r: 0.34 });
  for (const s of [-1, 1]) t.box(0.06, 1.0, 0.04, GOLD, s * 0.55, 0.3, 0.61); // gold trim
  t.box(0.32, 0.22, 0.04, shardOf(h), -0.55, 0.75, 0.6); // Dimension Shard badge
  if (top && level >= 2) for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    t.box(0.05, 0.12, 0.04, GOLD, Math.sin(a) * 0.44, 0.35 + Math.cos(a) * 0.44, 0.62, { rz: -a });
  }
  belt(t, 0x546e7a, GOLD);
  if (top && level >= 1) cellPack(t, 0x37474f, beam, 3);
  if (bottom && level >= 2) {
    // power pack: a heavy box, a glowing window, vents and a cable to the gun
    t.box(1.55, 1.75, 0.75, 0x37474f, 0, 0, -0.9, { r: 0.12 });
    t.box(0.8, 0.8, 0.06, INK, 0, 0.15, -1.29);
    t.box(0.66, 0.66, 0.06, beam, 0, 0.15, -1.31);
    for (let i = 0; i < 4; i++) t.box(1.2, 0.05, 0.05, INK, 0, -0.4 - i * 0.12, -1.29);
    t.tube([[-0.6, -0.6, -0.9], [-1.15, -0.8, -0.3], [-1.3, -0.4, 0.3]], 0.06, INK, { seg: 12, sides: 6 });
    for (const s of [-1, 1]) {
      t.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
      t.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
    }
  }
  if ((bottom && level >= 1) || (top && level >= 4)) shoulderPads(t, GOLD, 0.62);
  if (top && level >= 4) {
    // shoulder coils: gold posts wound with glowing rings
    for (const s of [-1, 1]) {
      t.cyl(0.1, 0.9, tone(GOLD, 0.8), s * 1.4, 1.55, 0, { seg: 10 });
      for (let i = 0; i < 4; i++) t.torus(0.16, 0.04, beam, s * 1.4, 1.25 + i * 0.18, 0, { rx: PI / 2, seg: 12 });
      t.ball(0.16, beam, s * 1.4, 2.08, 0, { seg: 10, rows: 7 });
    }
  }
  hd.done();
  t.done();
  hands(h, key, 0x546e7a, 0xd4af37, (a, s) => a.box(0.05, 0.08, 0.6, beam, s * 0.54, -1.58, 0));
  feet(h, key, 0x78909c, (b) => {
    b.box(0.86, 0.5, 0.2, GOLD, 0, -0.95, 0.54, { r: 0.08 }); // knee guard
    b.box(0.06, 0.5, 0.04, beam, 0.5, -0.6, 0.3);
  });
  if (top && level >= 5) {
    // the halo of six orbs that turns over the head
    const halo = spinner(h, h.body, 0, 6.5, 0);
    const k = wear(h, halo, `${key}:halo`);
    k.torus(1.0, 0.04, tone(GOLD, 0.9), 0, 0, 0, { rx: PI / 2, seg: 28 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      k.ball(0.2, beam, Math.cos(a) * 1.0, 0, Math.sin(a) * 1.0, { seg: 10, rows: 7 });
      k.torus(0.22, 0.03, GOLD, Math.cos(a) * 1.0, 0, Math.sin(a) * 1.0, { seg: 12 , ry: -a });
    }
    k.done();
    h.idleSpin = 0.8;
  }
  const len = hot ? (level >= 5 ? 2.7 : 2.3) : 2.0;
  const fat = hot ? (level >= 5 ? 1.7 : 1.35) : 1;
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [by, bz] = beamGun(gk, {
    len, body: hot ? 0xb71c1c : 0xfafafa, trim: GOLD, glow: beam, rings: hot ? 4 : 2, scope: top && level >= 1, fat,
  });
  if (hot) {
    for (const s of [-1, 1]) gk.box(0.08, 0.9, 0.3, GOLD, s * 0.3 * fat, -0.9, UP, { r: 0.03 }); // side fins
    if (level >= 5) gk.box(0.34, 0.6, 0.3, 0x263238, 0, -0.35, UP - 0.5, { r: 0.05 }); // front grip
  }
  const pr = hot ? 0.24 * fat : 0.24;
  const py = by - pr * 0.9;
  prism(gk, py, bz, pr, beam, GOLD);
  if (top && level >= 3) for (const s of [-1, 1]) {
    // splitter prisms on arms either side of the emitter
    gk.box(0.36, 0.06, 0.06, GOLD, s * 0.25, by + 0.25, bz);
    gk.cyl(0.02, 0.22, beam, s * 0.42, by - 0.05, bz, { seg: 6, r2: 0.11 });
    gk.cyl(0.11, 0.14, beam, s * 0.42, by + 0.13, bz, { seg: 6, r2: 0.02 });
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, py - pr * 1.5 - 0.1, bz);
  aimLong(h);
  h.tracer = color;
  if (bottom) h.beam = color;
  else h.tracerWidth = 0.3;
  return own(h);
}
export const makeRefractorBottom = (level) => makeRefractor(level, true);

// ------------------------------------------------------------------ Noob Tuber

/** A strap of 40 mm grenades across the chest (torso space; side as in sash). */
function nadeSash(k, side, n = 6) {
  const rz = side * 0.62;
  k.box(0.32, 2.5, 1.12, 0x5d4037, 0, 0, 0, { rz });
  for (let i = 0; i < n; i++) {
    const t = -0.85 + (i * 1.7) / (n - 1);
    const x = -Math.sin(rz) * t;
    const y = Math.cos(rz) * t;
    k.cyl(0.11, 0.24, 0x558b2f, x, y, 0.62, { axis: 'z', seg: 10 });
    k.cyl(0.115, 0.08, GOLD, x, y, 0.56, { axis: 'z', seg: 10 }); // brass case
    dome(k, 0.11, 0.08, 0x558b2f, x, y, 0.74, { rx: PI / 2, seg: 10 });
  }
}

/**
 * A grenade launcher on the fist (gun space): a wood stock, a fat barrel, a leaf sight. o.mgl: a
 * six-shot revolving drum and a folding stock; o.scope: a lens (IR sight). Returns [y, z].
 */
function nadeLauncher(k, o = {}) {
  const U = UP + 0.04;
  const body = o.body ?? OLIVE;
  if (o.mgl) {
    k.tube([[0, 0.2, U], [0, 0.9, U], [0, 0.9, U - 0.35], [0, 0.45, U - 0.3]], 0.04, INK, { seg: 12, sides: 5 }); // folding stock
    k.box(0.32, 0.1, 0.46, INK, 0, 0.92, U - 0.15, { r: 0.03 });
    k.box(0.3, 0.55, 0.36, body, 0, 0.0, U, { r: 0.05 });
    const dz = U - 0.12;
    k.cyl(0.4, 0.62, tone(body, 0.8), 0, -0.6, dz, { seg: 18 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      k.cyl(0.11, 0.64, 0x263238, Math.sin(a) * 0.25, -0.6, dz + Math.cos(a) * 0.25, { seg: 10 }); // chambers
      k.box(0.05, 0.5, 0.05, tone(body, 0.6), Math.sin(a + PI / 6) * 0.4, -0.6, dz + Math.cos(a + PI / 6) * 0.4); // flutes
    }
    k.cyl(0.08, 0.66, STEEL, 0, -0.6, dz, { seg: 8 }); // spindle
    k.cyl(0.16, 0.9, body, 0, -1.35, U + 0.12, { seg: 14 });
    k.box(0.36, 0.12, 0.5, INK, 0, -0.9, U - 0.05, { r: 0.03 }); // frame bridge
    k.box(0.2, 0.22, 0.46, INK, 0, -1.25, U - 0.25, { r: 0.04 }); // fore grip
    k.cyl(0.18, 0.08, INK, 0, -1.8, U + 0.12, { seg: 14 });
  } else {
    k.slab(0.26, 0.8, 0.34, WOOD, 0, 0.55, U - 0.1, { td: 1.35, tz: -0.06 }); // stock
    k.box(0.28, 0.08, 0.5, INK, 0, 0.97, U - 0.14); // butt pad
    k.box(0.32, 0.5, 0.38, body, 0, -0.02, U, { r: 0.05 }); // receiver
    k.cyl(0.07, 0.2, STEEL, 0, -0.25, U - 0.12, { axis: 'x', seg: 8 }); // break hinge
    k.cyl(0.2, 1.3, body, 0, -0.9, U + 0.06, { seg: 16 }); // fat barrel
    k.cyl(0.22, 0.12, tone(body, 0.75), 0, -1.5, U + 0.06, { seg: 16 });
    k.box(0.28, 0.7, 0.2, WOOD, 0, -0.65, U - 0.2, { r: 0.05 }); // forend
    k.box(0.18, 0.08, 0.3, INK, 0, -0.2, U + 0.33); // leaf sight
    k.box(0.04, 0.06, 0.12, INK, 0, -1.45, U + 0.3);
  }
  k.box(0.22, 0.26, 0.52, o.mgl ? INK : WOOD, 0, 0.12, U - 0.36, { rx: -0.3, r: 0.04 }); // grip
  k.torus(0.1, 0.022, INK, 0, -0.12, U - 0.24, { ry: PI / 2, seg: 10, arc: PI });
  if (o.scope) {
    k.box(0.22, 0.6, 0.26, INK, 0, -0.3, U + 0.45, { r: 0.04 });
    k.cyl(0.1, 0.04, o.scope, 0, -0.62, U + 0.47, { seg: 10 });
    k.box(0.12, 0.12, 0.2, INK, 0, -0.3, U + 0.28);
  }
  const tip = o.mgl ? -1.84 : -1.56;
  k.cyl(o.mgl ? 0.12 : 0.15, 0.03, 0x050505, 0, tip, U + (o.mgl ? 0.12 : 0.06), { seg: 12 });
  return [tip - 0.05, U + (o.mgl ? 0.12 : 0.06)];
}

/**
 * Noob Tuber (alternate Paintballer form): a classic noob with a grenade launcher. Lv 1 a
 * grenade sash, Lv 2 the six-shot MGL, Lv 3 red IR goggles and a sight. Lv 4 it mans a mounted
 * 2x2-tube launcher turret behind sandbags, and Lv 5 the X-Turret with nine tubes.
 */
export function makeNoobTuber(level) {
  const key = `p18noob${level}`;
  if (level >= 4) {
    const u = makeThing();
    const x5 = level >= 5;
    const hotM = glowMat(u, 0xff6d00);
    const k = wear(u, u.body, `${key}:base`);
    // a ring of sandbags open at the back, two rows high
    for (let row = 0; row < 2; row++) {
      const n = 7 - row;
      for (let i = 0; i < n; i++) {
        const a = -0.2 + ((i + row * 0.5) / 6) * (PI + 0.4);
        bag(k, 1.0, 0.58, Math.cos(a) * 1.85, row * 0.32, Math.sin(a) * 1.85, i % 2 ? 0xa1887f : 0x8d6e63, -a + PI / 2);
      }
    }
    // the mount: base plate, a column, a yaw ring
    k.cyl(0.62, 0.12, INK, 0, 0.06, 0.3, { seg: 18 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      k.cyl(0.05, 0.06, STEEL, Math.cos(a) * 0.5, 0.14, 0.3 + Math.sin(a) * 0.5, { seg: 6 });
    }
    k.cyl(0.2, 1.45, 0x424242, 0, 0.85, 0.3, { seg: 12, r2: 0.16 });
    k.cyl(0.36, 0.14, STEEL, 0, 1.6, 0.4, { seg: 16 });
    // ammo crates beside it
    k.box(0.7, 0.45, 0.5, OLIVE, 1.1, 0.23, -0.6, { r: 0.03 });
    k.box(0.72, 0.08, 0.52, tone(OLIVE, 0.8), 1.1, 0.48, -0.6);
    k.box(0.04, 0.16, 0.3, 0xffd54f, 1.46, 0.25, -0.6);
    k.done();
    const tg = new THREE.Group();
    tg.position.set(0, 2.0, 0.4);
    u.body.add(tg);
    const n = x5 ? 3 : 2;
    const w = n * 0.48 + 0.3;
    const boxC = x5 ? 0x37474f : 0x556b2f;
    const tk = wear(u, tg, `${key}:turret`);
    tk.box(w, w, 1.3, boxC, 0, 0, 0.25, { r: 0.08 });
    tk.box(w + 0.08, w + 0.08, 0.14, tone(boxC, 0.7), 0, 0, 0.88, { r: 0.04 });
    tk.box(w + 0.08, w + 0.08, 0.14, tone(boxC, 0.7), 0, 0, -0.38, { r: 0.04 });
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = (i - (n - 1) / 2) * 0.48;
      const y = (j - (n - 1) / 2) * 0.48;
      tk.cyl(0.18, 0.5, x5 ? 0x263238 : OLIVE, x, y, 1.1, { axis: 'z', seg: 12 });
      tk.cyl(0.13, 0.03, 0x050505, x, y, 1.36, { axis: 'z', seg: 12 });
      if (x5) tk.torus(0.17, 0.025, hotM, x, y, 1.34, { seg: 14 });
      gunMuzzleAt(u, tg, x, y, 1.45);
    }
    // a feed drum on the right, a sight on top, spade grips at the back
    tk.cyl(0.42, 0.4, INK, -w / 2 - 0.22, -0.1, 0.2, { axis: 'x', seg: 16 });
    tk.cyl(0.44, 0.06, 0x424242, -w / 2 - 0.42, -0.1, 0.2, { axis: 'x', seg: 16 });
    tk.box(0.26, 0.3, 0.5, INK, 0, w / 2 + 0.16, 0.2, { r: 0.04 });
    tk.cyl(0.08, 0.04, glowMat(u, 0xff1744), 0, w / 2 + 0.18, 0.47, { axis: 'z', seg: 10 });
    for (const s of [-1, 1]) {
      tk.box(0.1, 0.1, 0.6, INK, s * 0.35, 0.2, -0.65);
      tk.cyl(0.07, 0.4, 0x212121, s * 0.35, 0.3, -0.95, { seg: 8 });
    }
    tk.cyl(0.32, 0.12, STEEL, 0, -w / 2 - 0.08, 0.0, { seg: 14 }); // pivot
    if (x5) {
      for (const s of [-1, 1]) {
        tk.box(0.05, 0.1, 1.0, hotM, s * (w / 2 + 0.02), w * 0.25, 0.25);
        tk.box(0.05, 0.1, 1.0, hotM, s * (w / 2 + 0.02), -w * 0.25, 0.25);
        tk.box(0.1, 0.05, 1.0, hotM, s * w * 0.3, w / 2 + 0.02, 0.25);
      }
    }
    tk.done();
    // the noob stands behind it, hands on the grips, IR goggles on
    const h = makeHumanoid({ face: 'smile' });
    const hd = wear(h, h.head, `${key}:noobhead`);
    goggles(hd, 0.74, glowMat(h, 0xff1744), { r: 0.66 });
    hd.done();
    feet(h, `${key}:noob`, 0x2e7d32);
    h.root.scale.setScalar(0.7);
    h.root.position.set(0, 0, -1.25);
    h.rightArm.rotation.set(-1.3, 0, 0.12);
    h.leftArm.rotation.set(-1.3, 0, -0.12);
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.tracer = 0xffab40;
    u.projectile = { color: 0x558b2f, size: 0.5 };
    u.static = true;
    return u;
  }
  const h = makeHumanoid({ face: 'smile' }); // the classic noob colours
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (level >= 3) goggles(hd, 0.74, glowMat(h, 0xff1744), { r: 0.66 });
  if (level >= 1) nadeSash(t, 1);
  belt(t, 0x5d4037, 0xbdbdbd);
  if (level >= 2) for (const x of [-0.55, 0.55]) pouch(t, x, -0.62, 0.55, 0.4, 0.38, 0x556b2f, 0.2);
  hd.done();
  t.done();
  feet(h, key, 0x2e7d32);
  const g = fist(h.rightArm, -1.9, 1.25);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = nadeLauncher(gk, { mgl: level >= 2, scope: level >= 3 ? glowMat(h, 0xff1744) : null });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = 0xffab40;
  h.projectile = { color: 0x558b2f, size: 0.45 };
  return own(h);
}

/** A muzzle point on a unit (things keep their muzzles in u.muzzles). */
function gunMuzzleAt(u, parent, x, y, z) {
  const m = new THREE.Object3D();
  m.position.set(x, y, z);
  parent.add(m);
  u.muzzles.push(m);
  return m;
}

// ------------------------------------------------------------------ Stinger

/**
 * Stinger (alternate Marksman form): a soldier in desert camo with a rocket tube on his right
 * shoulder and a handgun in the left hand. Lv 1 a helmet, Lv 2 an IFF radar box with an antenna
 * on the tube, Lv 3 a bigger glowing warhead, Lv 4 the M202 Flash (a 2x2 tube box), Lv 5 the
 * X-Stinger: one big launcher with glowing rings, and dark armour.
 */
export function makeStinger(level) {
  const x5 = level >= 5;
  const shirt = x5 ? 0x37474f : SAND;
  const h = makeHumanoid({ skin: 0xd7a26b, shirt, pants: x5 ? 0x263238 : 0xa38f62, arms: shirt, face: 'soldier' });
  const key = `p18sting${level}`;
  const blue = glowMat(h, 0x40c4ff);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (level >= 1) {
    helmet(hd, x5 ? 0x263238 : 0x8d7b55, { cover: x5 ? 0x37474f : 0x6d5f40 });
    if (x5) {
      band(hd, 0.8, 0.05, 0.28, 2.0, INK, 0.74);
      band(hd, 0.84, 0.04, 0.2, 1.8, blue, 0.74);
    } else goggles(hd, 1.22, 0xffb74d, { r: 0.76, strap: 0x5d4f33 });
  } else {
    hair(hd, 0x4e342e, { h: 0.36 });
    boonie(hd, 0xa38f62);
  }
  if (!x5) camo(t, [0xa68b5b, 0xd8c8a0, 0x8d7550], 5);
  collar(t, tone(shirt, 0.85));
  if (x5) {
    chestPlate(t, 0x455a64, blue);
    shoulderPads(t, 0x37474f, 0.6);
  } else if (level >= 2) vest(t, 0x8d7b55, { pouches: 3 });
  else pockets(t, tone(shirt, 0.9));
  belt(t, 0x5d4037, 0x9e9e9e);
  canteen(t, 0.8, 0x6d5f40);
  // a holster on the left hip and spare rockets on the back from Lv 3
  t.box(0.3, 0.55, 0.4, 0x4e342e, 0.95, -1.05, 0.2, { r: 0.05 });
  if (level >= 3) {
    t.box(1.0, 1.4, 0.3, 0x5d4f33, 0, 0.0, -0.68, { r: 0.05 });
    for (const x of [-0.25, 0.25]) {
      t.cyl(0.16, 1.5, x5 ? 0x263238 : 0x556b2f, x, 0.15, -0.95, { seg: 12 });
      t.cyl(0.16, 0.35, x5 ? blue : 0xff3d00, x, 1.07, -0.95, { seg: 10, r2: 0.02 });
    }
    t.box(1.1, 0.12, 0.5, INK, 0, 0.3, -0.9);
  }
  hd.done();
  t.done();
  hands(h, key, x5 ? 0x111111 : 0x5d4f33, tone(shirt, 0.82));
  feet(h, key, x5 ? 0x212121 : 0x8d6e63, level >= 2 ? (b) => kneePad(b, x5 ? 0x263238 : 0x6d5f40) : null);
  // the launcher: built in gun space on a group turned so it points forward along +z
  const mount = new THREE.Group();
  mount.position.set(-1.15, 4.18, 0.1);
  mount.rotation.x = -PI / 2;
  h.body.add(mount);
  const lk = wear(h, mount, `${key}:tube`);
  const tubeC = x5 ? 0x263238 : 0x556b2f;
  let my;
  let mz;
  if (level === 4) {
    [my, mz] = rocketPod(lk, 2, 2, tubeC, 0xff3d00, { len: 2.6, sight: 0xffb74d });
  } else {
    const r = x5 ? 0.45 : level >= 3 ? 0.32 : 0.26;
    [my, mz] = tubeLauncher(lk, {
      r, len: x5 ? 2.8 : 2.2, back: x5 ? 1.2 : 0.9, col: tubeC, venturi: true, scope: level >= 2 ? (x5 ? blue : 0x4fc3f7) : null,
      warhead: level >= 3 ? (x5 ? blue : glowMat(h, 0xff3d00)) : null, fat: x5, bands: x5 ? blue : null, grip: true,
    });
  }
  if (level >= 2) {
    // IFF radar box on the outer side of the tube, with an antenna
    const bx = -((level === 4 ? 0.55 : x5 ? 0.6 : 0.45) + 0.12);
    lk.box(0.4, 0.55, 0.4, 0x37474f, bx, -0.6, UP + 0.4, { r: 0.04 });
    lk.box(0.04, 0.3, 0.2, INK, bx - 0.21, -0.6, UP + 0.4);
    for (let i = 0; i < 3; i++) lk.box(0.42, 0.03, 0.04, INK, bx, -0.45 - i * 0.12, UP + 0.61);
    lk.cyl(0.025, 0.9, INK, bx, -0.45, UP + 0.95, { seg: 5 });
    lk.ball(0.05, glowMat(h, 0x76ff03), bx, -0.45, UP + 1.42, { seg: 6, rows: 4 });
  }
  lk.done();
  h.muzzles = [];
  muzzle(h, mount, my - 0.15, mz);
  // the close-range handgun in the left hand
  const pg = fist(h.leftArm, -1.9, 1.3);
  const pk = wear(h, pg, `${key}:pistol`);
  pistol(pk, { body: x5 ? 0x263238 : GUNMETAL, laser: level >= 3 ? 0xff1744 : null });
  pk.done();
  h.rightArm.rotation.set(-2.6, 0, 0.1);
  h.leftArm.rotation.set(-1.4, 0, -0.1);
  h.pose = { right: -2.6, left: -1.4, leftRecoil: 0.3 };
  h.recoilScale = 0.4;
  h.tracer = 0xffab40;
  h.projectile = { color: 0xeceff1, size: 0.5 };
  return own(h, 0);
}

// ------------------------------------------------------------------ Void Traitor

/** A void sword (gun space, blade along -y): pommel, wrapped grip, horned guard, blade and a glowing fuller. Returns the tip y. */
function voidSword(k, bl, bw, blade, fuller, metal, gem) {
  k.ball(0.17, metal, 0, 0.42, 0, { seg: 10, rows: 7 });
  k.cyl(0.12, 0.62, 0x111111, 0, 0.04, 0, { seg: 10 }); // grip
  for (let i = 0; i < 4; i++) k.torus(0.12, 0.025, 0x4a148c, 0, 0.26 - i * 0.14, 0, { rx: PI / 2 + (i % 2 ? 0.4 : -0.4), seg: 10 });
  const gw = 0.9 + bw;
  k.box(gw, 0.16, 0.26, metal, 0, -0.36, 0, { r: 0.05 }); // guard
  for (const s of [-1, 1]) k.cyl(0.1, 0.45, metal, s * (gw / 2 + 0.1), -0.25, 0, { seg: 6, r2: 0.01, rz: s * -0.9 }); // horns
  k.ball(0.11, gem, 0, -0.36, 0.14, { seg: 8, rows: 6 });
  const tipL = Math.min(0.7, bl * 0.25);
  const body = bl - tipL;
  k.box(bw, body, 0.1, blade, 0, -0.44 - body / 2, 0);
  k.slab(bw, tipL, 0.1, blade, 0, -0.44 - body - tipL / 2, 0, { bw: 0.04 });
  k.box(bw * 0.28, body * 0.85, 0.13, fuller, 0, -0.5 - body * 0.43, 0); // fuller
  for (const s of [-1, 1]) k.box(0.03, body, 0.06, tone(0x5e35b1, 1.2), s * bw / 2, -0.44 - body / 2, 0); // edges
  return -0.44 - bl;
}

/**
 * Void Traitor (event, "Inferno Traitor"): a dark knight in a great helm with a glowing void
 * sword and a cape. Lv 1 a longer blade, Lv 2 the blade glows, Lv 3 an All Seeing Eye on the helm
 * and chest, Lv 4 Void Armor with spiked shoulders, Lv 5 the full Void Traitor: bigger, with bat
 * wings, void rocks orbiting and an aura ring on the ground.
 */
export function makeVoidTraitor(level) {
  const full = level >= 5;
  const h = makeHumanoid({ skin: 0x9575cd, shirt: 0x1a0033, pants: 0x0b0014, arms: 0x311b92, face: 'none' });
  const key = `p18void${level}`;
  const voidC = full ? 0xd500f9 : 0xaa00ff;
  const rune = glowMat(h, voidC);
  const eye = glowMat(h, 0xff1744);
  const plate = level >= 4 ? 0x120020 : 0x2a1a40;
  const trim = level >= 4 ? 0x4a148c : 0x37284f;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // a great helm: a round can over the whole head, a domed top, a glowing eye slit, breaths and a ridge
  hd.cyl(0.74, 1.0, plate, 0, 0.55, 0, { seg: 20 });
  dome(hd, 0.74, 0.42, plate, 0, 1.05, 0, { seg: 20 });
  hd.torus(0.74, 0.05, trim, 0, 0.07, 0, { rx: PI / 2, seg: 20 });
  band(hd, 0.76, 0.04, 0.14, 1.5, rune, 0.74); // eye slit
  band(hd, 0.77, 0.05, 0.05, 1.6, trim, 0.84);
  hd.box(0.1, 0.9, 0.1, trim, 0, 0.6, 0.75, { r: 0.03 }); // nose ridge
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) hd.box(0.03, 0.12, 0.03, INK, s * (0.2 + i * 0.1), 0.35, 0.73 - i * 0.03); // breaths
  hd.box(0.1, 0.24, 1.3, trim, 0, 1.45, -0.05, { r: 0.04 }); // crest ridge
  if (level >= 3) {
    // All Seeing Eye on the brow
    hd.cyl(0.2, 0.08, INK, 0, 1.12, 0.66, { axis: 'z', seg: 14, rx: -0.4, sy: 0.7 });
    hd.ball(0.13, eye, 0, 1.12, 0.7, { seg: 10, rows: 7, sy: 0.65 });
    hd.ball(0.05, INK, 0, 1.12, 0.81, { seg: 8, rows: 5 });
  }
  if (full) for (const s of [-1, 1]) hd.cyl(0.13, 0.8, plate, s * 0.55, 1.5, -0.05, { seg: 8, r2: 0.01, rz: s * -0.5 }); // horns
  // a dark tunic with straps, a rune belt and a cape
  t.box(2.12, 0.5, 1.12, tone(0x1a0033, 0.8), 0, -0.75, 0, { r: 0.05 }); // tunic skirt top
  t.slab(2.1, 0.8, 1.1, 0x1a0033, 0, -1.3, 0, { bw: 1.12, bd: 1.08 });
  belt(t, 0x111111, 0x7e57c2, -0.62);
  t.box(0.2, 0.2, 0.04, rune, 0, -0.62, 0.6);
  for (const s of [-1, 1]) t.box(0.22, 2.3, 1.12, 0x111111, 0, 0, 0, { rz: s * 0.62 }); // crossed straps
  t.cyl(0.16, 0.06, trim, 0, 0.0, 0.6, { axis: 'z', seg: 10 });
  cape(t, 0x1a0033, 3.2 + level * 0.15, { clasp: rune, tatter: level >= 2 });
  if (level >= 3) {
    // the eye on the chest
    t.cyl(0.32, 0.06, INK, 0, 0.45, 0.6, { axis: 'z', seg: 16, sy: 0.6 });
    t.ball(0.22, eye, 0, 0.45, 0.62, { seg: 12, rows: 8, sy: 0.6, sz: 0.4 });
    t.ball(0.08, INK, 0, 0.45, 0.7, { seg: 8, rows: 5 });
  }
  if (level >= 4) {
    // Void Armor: a ridged breastplate with rune lines and spiked pauldrons
    t.box(2.2, 1.45, 1.2, plate, 0, 0.3, 0, { r: 0.16 });
    for (let i = 0; i < 2; i++) t.box(2.16, 0.14, 1.16, tone(plate, 1.6), 0, -0.48 - i * 0.18, 0, { r: 0.05 });
    for (const s of [-1, 1]) t.box(0.05, 0.9, 0.04, rune, s * 0.5, 0.35, 0.61, { rz: s * 0.25 });
    if (level >= 3) {
      t.cyl(0.32, 0.06, INK, 0, 0.45, 0.62, { axis: 'z', seg: 16, sy: 0.6 });
      t.ball(0.22, eye, 0, 0.45, 0.64, { seg: 12, rows: 8, sy: 0.6, sz: 0.4 });
    }
    for (const s of [-1, 1]) {
      dome(t, 0.62, 0.5, plate, s * 1.42, 0.92, 0, { seg: 14 });
      t.torus(0.6, 0.05, trim, s * 1.42, 0.94, 0, { rx: PI / 2, seg: 14 });
      for (const dz of [-0.25, 0.25]) t.cyl(0.13, 0.8, rune, s * 1.55, 1.65, dz, { seg: 6, r2: 0.01, rz: s * -0.4 }); // spikes
    }
  }
  if (full) {
    // bat wings: a membrane on glowing ribs, swept back behind the cape
    const pts = [[0.5, 0.6], [1.6, 2.2], [3.4, 1.9], [3.0, 0.6], [2.4, 1.0], [1.9, -0.2], [1.3, 0.3], [0.6, -0.3]];
    for (const s of [-1, 1]) {
      const wg = new THREE.Group();
      wg.position.set(0, 0, -0.8);
      wg.rotation.y = s * 0.35;
      h.torso.add(wg);
      const wk = wear(h, wg, `${key}:wing${s}`);
      wk.plan(pts.map(([x, v]) => [s * x, -v]), 0.06, 0x0b0014, 0, 0, -0.03, { rx: PI / 2 });
      for (const [x, v] of [[3.4, 1.9], [3.0, 0.6], [1.9, -0.2]]) wk.tube([[s * 0.5, 0.6, 0], [s * 1.6, 2.2, 0], [s * x, v, 0]], 0.045, rune, { seg: 10, sides: 4 });
      wk.done();
    }
  }
  hd.done();
  t.done();
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    a.box(1.04, 0.16, 1.04, 0x111111, 0, -0.7, 0, { r: 0.03 });
    gauntlet(a, plate, trim);
    a.box(0.04, 0.3, 0.3, rune, s * 0.55, -1.25, 0);
    a.done();
  }
  feet(h, key, plate, (b) => {
    b.box(1.08, 0.7, 0.2, plate, 0, -1.1, 0.5, { r: 0.06 }); // greave
    b.box(0.86, 0.38, 0.22, trim, 0, -0.85, 0.54, { r: 0.08 }); // knee cop
    b.box(0.05, 0.4, 0.04, rune, 0, -1.15, 0.62);
  });
  if (full) {
    // void rocks orbiting at chest height, and an aura ring on the ground
    const orbit = spinner(h, h.root, 0, 0, 0);
    const rk = wear(h, orbit, `${key}:rocks`);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      const x = Math.cos(a) * 2.6;
      const z = Math.sin(a) * 2.6;
      const y = 4 + (i % 2) * 1.2;
      rk.ball(0.34, 0x311b92, x, y, z, { seg: 5, rows: 4, sx: 1.2, rx: a, ry: a });
      rk.ball(0.14, rune, x, y, z + 0.0, { seg: 6, rows: 4, sx: 2.7, sz: 0.3, ry: a });
    }
    rk.done();
    h.idleSpin = 0.7;
    const ak = wear(h, h.root, `${key}:aura`);
    ak.cyl(2.8, 0.04, glassMat(h, voidC, 0.25), 0, 0.04, 0, { seg: 36 });
    ak.torus(2.8, 0.05, rune, 0, 0.07, 0, { rx: PI / 2, seg: 40 });
    ak.torus(2.2, 0.03, rune, 0, 0.07, 0, { rx: PI / 2, seg: 36 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      ak.box(0.3, 0.03, 0.12, rune, Math.cos(a) * 2.5, 0.07, Math.sin(a) * 2.5, { ry: -a });
    }
    for (const m of ak.done()) m.castShadow = false;
  }
  const g = fist(h.rightArm, -1.9, 1);
  const sk = wear(h, g, `${key}:sword`);
  const bl = [2.0, 2.4, 2.6, 2.9, 3.2, 4.2][level] ?? 4.2;
  const bw = full ? 0.6 : 0.3 + level * 0.05;
  const blade = level >= 2 ? rune : 0x5e35b1;
  const tip = voidSword(sk, bl, bw, blade, level >= 1 ? (level >= 2 ? glowMat(h, 0xf3e5f5) : rune) : 0x4a148c, level >= 4 ? 0x4a148c : 0x37284f, eye);
  sk.done();
  h.muzzles = [];
  muzzle(h, g, tip, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  h.leftArm.rotation.set(-0.3, 0, -0.2);
  h.pose = { right: -2.4, left: -0.3, leftRecoil: 0 };
  h.swing = 2;
  h.melee = true;
  h.tracer = voidC;
  if (full) h.body.scale.setScalar(1.2);
  return own(h, 0);
}

// ------------------------------------------------------------------ Knifer

/** A combat knife (gun space, blade along -y): ringed handle, guard, a clip-point blade. Returns the tip y. */
function knife(k, len, blade, o = {}) {
  k.cyl(0.13, 0.56, o.grip ?? 0x3e2723, 0, 0.02, 0, { seg: 8 });
  for (let i = 0; i < 3; i++) k.torus(0.13, 0.025, INK, 0, 0.18 - i * 0.16, 0, { rx: PI / 2, seg: 8 });
  k.cyl(0.15, 0.08, STEEL, 0, 0.32, 0, { seg: 8 }); // pommel
  k.box(0.16, 0.08, 0.62, o.guard ?? 0x424242, 0, -0.3, 0, { r: 0.03 }); // guard
  const body = len * 0.78;
  const tipL = len - body;
  k.box(0.08, body, 0.34, blade, 0, -0.34 - body / 2, 0.03);
  k.slab(0.08, tipL, 0.34, blade, 0, -0.34 - body - tipL / 2, 0.03, { bd: 0.1, bz: -0.12 });
  k.box(0.1, body * 0.9, 0.05, o.edge ?? 0xeceff1, 0, -0.34 - body / 2, 0.19); // bright edge
  k.box(0.1, body * 0.6, 0.04, tone(0x37474f, 1), 0, -0.4 - body * 0.3, -0.04); // fuller
  return -0.34 - len;
}

/**
 * Knifer (wave-10 rework look): a grey outfit, a black bandana mask and one knife. Lv 1 a black
 * glove, Lv 2 a grey cape, Lv 3 a second knife, Lv 4 Murderer: a darker outfit, a black cape, a
 * black hood, red-metal knives and spare knives on the chest.
 */
export function makeKnifer(level) {
  const lv = Math.min(level, 4);
  const dark = lv >= 4;
  const shirt = dark ? 0x111111 : 0x757575;
  const h = makeHumanoid({ skin: 0xd9a066, shirt, pants: dark ? 0x263238 : 0x616161, arms: shirt, face: 'agent' });
  const key = `p18knifer${lv}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const mask = 0x111111;
  if (dark) hood(hd, 0x0d0d0d);
  else hair(hd, 0x2b1d14, { h: 0.38 });
  // the bandana mask over the nose and mouth, tied at the back
  band(hd, 0.66, 0.08, 0.5, 3.2, mask, 0.32);
  hd.cyl(0.66, 0.08, tone(mask, 1.6), 0, 0.57, 0, { seg: 20, open: true });
  hd.box(0.5, 0.06, 0.04, 0x2a2a2a, 0, 0.36, 0.69); // fold
  if (!dark) {
    hd.ball(0.14, mask, 0, 0.5, -0.68, { seg: 8, rows: 6 }); // knot
    for (const s of [-1, 1]) hd.box(0.14, 0.55, 0.05, mask, s * 0.1, 0.2, -0.72, { rz: s * 0.25, r: 0.02 });
  }
  // a zip-up top: zip, pocket, belt with sheaths
  t.box(0.05, 1.6, 0.05, 0x9e9e9e, 0.08, -0.05, 0.53);
  t.box(1.1, 0.4, 0.08, tone(shirt, 0.85), 0, -0.45, 0.53, { r: 0.03 }); // pouch pocket
  collar(t, tone(shirt, 0.8), { buttons: false });
  belt(t, 0x212121, 0x616161);
  for (const x of [-0.75, 0.75]) {
    t.box(0.22, 0.6, 0.14, 0x3e2723, x, -1.15, 0.58, { r: 0.03 }); // sheath
    t.cyl(0.08, 0.3, 0x3e2723, x, -0.7, 0.62, { seg: 8 }); // handle
  }
  if (lv >= 2) cape(t, dark ? 0x0a0a0a : 0x9e9e9e, 3.0, { w: 2.1 });
  if (dark) {
    // spare red knives on a chest strap
    t.box(0.24, 2.4, 1.12, 0x212121, 0, 0.05, 0, { rz: -0.6 });
    for (const u of [-0.5, -0.1, 0.3]) {
      const x = Math.sin(0.6) * u;
      const y = Math.cos(0.6) * u;
      t.cyl(0.06, 0.24, 0x3e2723, x, y + 0.1, 0.63, { seg: 6 });
      t.slab(0.04, 0.4, 0.14, 0xb71c1c, x, y - 0.22, 0.63, { bd: 0.2 });
    }
  }
  hd.done();
  t.done();
  hands(h, key, null, tone(shirt, 0.75), (a, s) => {
    if ((s < 0 && lv >= 1) || (s > 0 && lv >= 3)) {
      a.box(1.05, 0.4, 1.05, 0x111111, 0, -1.82, 0, { r: 0.06 });
      a.box(1.08, 0.12, 1.08, 0x1f1f1f, 0, -1.6, 0);
    }
    for (let i = 0; i < 2; i++) a.box(1.06, 0.06, 1.06, tone(shirt, 0.65), 0, -1.2 - i * 0.18, 0); // sleeve wraps
  });
  feet(h, key, dark ? 0x111111 : 0x37474f);
  const bladeC = dark ? 0xb71c1c : 0xcfd8dc;
  const bladeM = dark ? glowMat(h, 0x8b0000, 0.5) : bladeC;
  const len = dark ? 1.6 : 1.3;
  const opts = { grip: dark ? 0x1a1a1a : 0x3e2723, guard: dark ? 0x212121 : 0x424242, edge: dark ? 0xff5252 : 0xeceff1 };
  const g = fist(h.rightArm, -1.9, 1.25);
  const kk = wear(h, g, `${key}:knife`);
  const tip = knife(kk, len, bladeM, opts);
  kk.done();
  h.muzzles = [];
  muzzle(h, g, tip, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  if (lv >= 3) {
    const g2 = fist(h.leftArm, -1.9, 1.25);
    const k2 = wear(h, g2, `${key}:knife`);
    knife(k2, len, bladeM, opts);
    k2.done();
    h.leftArm.rotation.set(-2.0, 0, -0.2);
    h.pose = { right: -2.4, left: -2.0, leftRecoil: 0 };
  } else {
    h.leftArm.rotation.set(-0.6, 0, -0.25);
    h.pose = { right: -2.4, left: -0.6, leftRecoil: 0 };
  }
  h.swing = 1.7;
  h.melee = true;
  h.blade = { color: dark ? 0xff1744 : 0xcfd8dc, size: 1 };
  h.tracer = dark ? 0xff1744 : 0xffffff;
  return own(h, 0);
}

export const MODELS = {
  combatMedic: makeCombatMedic,
  combatMedicBottom: makeCombatMedicBottom,
  jetTrooper: makeJetTrooper,
  jetTrooperBottom: makeJetTrooperBottom,
  refractor: makeRefractor,
  refractorBottom: makeRefractorBottom,
  noobTuber: makeNoobTuber,
  stinger: makeStinger,
  voidTraitor: makeVoidTraitor,
  knifer: makeKnifer,
};
