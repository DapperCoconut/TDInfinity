// Tower models: machines, batch 6 (rebuilt with the vehicle kit in ../vehicles.js).
// In here: Orbit, Void Port, The Eldritch, Valkyr, Squadron, Borealis, Splash, Lemonade Cat.
// Each makeX(level) builds one tower's look; TOWER_MODELS in ../models.js says which tower uses which.

import * as THREE from 'three';
import { VEHICLE_UNITS } from '../vehicleunits.js';
import { antenna, barrel, bolts, crate, glowMat, kit, lamp, louvres, PARTS, tone } from '../vehicles.js';
import { gunMuzzle, makeThing } from './bits.js';
import { dish, pad, spinBarrels } from './machines1.js';
import { drum, makeHeli, windowAt } from './machines2.js';
import { hull } from './machines3.js';
import { crystal, lv, poly, seeThrough, spinner, strut } from './machines5.js';

const { STEEL, GUN, DARK, GLASS } = PARTS;
const PI = Math.PI;
const CONCRETE = 0x9e9e9e;
const HAZARD = 0xf2c12e;
const WOOD = 0x8d6e63;

// ------------------------------------------------------------------ small shared pieces

/** Parks a kit-built unit (VEHICLE_UNITS) on the tower at (x, y, z), scaled by s and turned by yaw. */
function parkUnit(u, model, s, x, y, z, yaw = 0) {
  const unit = VEHICLE_UNITS[model](model);
  unit.root.scale.setScalar(s);
  unit.root.position.set(x, y, z);
  unit.root.rotation.y = yaw;
  u.body.add(unit.root);
  u.mats.push(...unit.mats);
  return unit;
}

/** A point on a box turned by rx about its own centre (x, y, z): where the local offset (ly, lz) ends up. */
const tilted = (x, y, z, ly, lz, rx) => [x, y + ly * Math.cos(rx) - lz * Math.sin(rx), z + ly * Math.sin(rx) + lz * Math.cos(rx)];

/** A solar panel on a post at (x, z), its top at y, tipped forward by `tilt`: frame, cells and grid lines. */
function solarPanel(k, x, y, z, w, d, tilt, cell = 0x1a237e) {
  k.cyl(0.05, y - 0.3, DARK, x, 0.3 + (y - 0.3) / 2, z, { seg: 6 });
  k.box(0.18, 0.08, 0.18, DARK, x, 0.34, z);
  k.box(w + 0.06, 0.04, d + 0.06, 0xb0bec5, x, y, z, { rx: tilt });
  k.box(w, 0.05, d, cell, ...tilted(x, y, z, 0.015, 0, tilt), { rx: tilt });
  for (let i = 1; i < 3; i++) k.box(w, 0.055, 0.02, 0x5c6bc0, ...tilted(x, y, z, 0.02, -d / 2 + (i * d) / 3, tilt), { rx: tilt });
  for (let i = 1; i < 4; i++) k.box(0.02, 0.055, d, 0x5c6bc0, x - w / 2 + (i * w) / 4, ...tilted(0, y, z, 0.02, 0, tilt).slice(1), { rx: tilt });
}

/** A roller door facing +z, bottom on y: slats, side rails and a hazard-striped frame. */
function rollerDoor(k, w, h, x, y, z, col) {
  k.box(w, h, 0.06, col, x, y + h / 2, z);
  const n = Math.round(h / 0.22);
  for (let i = 0; i < n; i++) k.box(w, 0.04, 0.04, tone(col, 0.7), x, y + 0.11 + i * (h / n), z + 0.04);
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) k.box(0.14, h / 4, 0.1, i % 2 ? 0x1a1a1a : HAZARD, x + sx * (w / 2 + 0.07), y + h / 8 + (i * h) / 4, z + 0.02);
  }
  k.cyl(0.18, w + 0.3, tone(col, 0.6), x, y + h + 0.18, z + 0.04, { axis: 'x', seg: 10 });
}

/** A lemon lying along x at (x, y, z), size s: a fat oval, a nub at each end, a stalk and a leaf. */
function lemon(k, x, y, z, s, col = 0xffeb3b) {
  k.ball(0.5 * s, col, x, y, z, { sx: 1.35, seg: 14, rows: 10 });
  for (const sx of [-1, 1]) k.cyl(0.13 * s, 0.22 * s, col, x + sx * 0.7 * s, y, z, { axis: 'x', r2: 0.05 * s, seg: 8, ry: sx < 0 ? PI : 0 });
  k.cyl(0.04 * s, 0.18 * s, 0x6d4c41, x + 0.15 * s, y + 0.52 * s, z, { seg: 5 });
  k.box(0.5 * s, 0.05 * s, 0.24 * s, 0x43a047, x + 0.38 * s, y + 0.55 * s, z, { rz: 0.4, r: 0.02 * s });
}

// ------------------------------------------------------------------ Orbit

/** Orbit's big ground dish: a bowl tipped back, ribs on the inside face, struts and a lit feed horn. */
function bigDish(u, parent, key, x, y, z, r, face, feed) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.x = -0.3;
  parent.add(g);
  const k = kit(u, g, key);
  k.cyl(r * 0.2, r * 0.4, 0xeceff1, 0, 0.2 * r, 0, { r2: r, seg: 26 }); // bowl, opening up
  k.cyl(r * 0.94, 0.03, face, 0, 0.4 * r, 0, { seg: 26 }); // inside face
  k.torus(r, 0.06, 0xcfd8dc, 0, 0.4 * r, 0, { rx: PI / 2, seg: 26 });
  k.torus(r * 0.55, 0.03, 0xb0bec5, 0, 0.42 * r, 0, { rx: PI / 2, seg: 20 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    k.box(0.04, 0.03, r * 0.8, 0xb0bec5, Math.cos(a) * r * 0.5, 0.43 * r, Math.sin(a) * r * 0.5, { ry: -a + PI / 2 });
  }
  const top = r * 1.25;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4;
    k.tube([[Math.cos(a) * r * 0.9, 0.42 * r, Math.sin(a) * r * 0.9], [0, top, 0]], 0.03, DARK, { sides: 4, seg: 1 });
  }
  k.cyl(0.14, 0.4, 0x546e7a, 0, top + 0.1, 0, { r2: 0.2, seg: 10 }); // feed horn
  k.ball(0.16, feed, 0, top + 0.34, 0, { seg: 8, rows: 6 });
  k.box(0.6, 0.4, 0.6, 0x546e7a, 0, 0.05, 0, { r: 0.05 }); // drive box under the bowl
  k.done();
  return g;
}

/**
 * Orbit: a ground station with a big upward dish and a satellite hovering high above it (the
 * satellite is a child 12 up, u.satellite). One more solar panel each level; Lv 2 a radio mast,
 * Lv 3 a second pair of wings on the satellite, Lv 4 two more beam emitters, Lv 5 a glowing ring
 * that turns round the satellite, a plasma-lit dish and a faint beam joining them.
 */
export function makeOrbit(level) {
  level = lv(level);
  const u = makeThing();
  const plasma = glowMat(u, level >= 5 ? 0xe040fb : 0xce93d8);
  const red = glowMat(u, 0xff1744);
  const y0 = 0.3;
  const k = kit(u, u.body, `orbit${level}`);
  pad(k, 4.4, y0, CONCRETE, false);
  // Control building (back left): white block with a window, a door, a lit status strip and an AC unit
  const bx = -1.25;
  const bz = -1.3;
  k.box(1.7, 1.5, 1.3, 0xeceff1, bx, y0 + 0.75, bz, { r: 0.06 });
  k.box(1.74, 0.12, 1.34, 0x546e7a, bx, y0 + 0.06, bz);
  k.box(1.84, 0.12, 1.44, 0x90a4ae, bx, y0 + 1.56, bz);
  windowAt(k, bx - 0.35, y0 + 0.92, bz + 0.66, 0.55, 0.4);
  k.box(0.42, 0.85, 0.05, 0x455a64, bx + 0.45, y0 + 0.43, bz + 0.66);
  k.box(0.06, 0.06, 0.05, STEEL, bx + 0.3, y0 + 0.45, bz + 0.7);
  k.box(1.3, 0.08, 0.04, plasma, bx, y0 + 1.36, bz + 0.67);
  k.box(0.55, 0.32, 0.45, 0xb0bec5, bx + 0.4, y0 + 1.78, bz - 0.2, { r: 0.04 });
  k.cyl(0.16, 0.03, DARK, bx + 0.4, y0 + 1.95, bz - 0.2, { seg: 10 });
  louvres(k, bx - 0.35, y0 + 1.66, bz - 0.2, 0.5, 0.4, 4);
  // Cable duct from the building to the dish
  k.box(1.3, 0.1, 0.24, 0x616161, -0.35, y0 + 0.05, -0.5, { ry: -0.5 });
  // Dish pedestal: a round column, a turning collar and a yoke
  const dx = 0.5;
  const dz = 0.3;
  k.cyl(0.55, 0.3, 0x78909c, dx, y0 + 0.15, dz, { seg: 16 });
  k.cyl(0.4, 1.0, 0x90a4ae, dx, y0 + 0.75, dz, { seg: 16 });
  k.torus(0.42, 0.05, DARK, dx, y0 + 1.2, dz, { rx: PI / 2, seg: 16 });
  for (const sx of [-1, 1]) k.box(0.12, 0.6, 0.35, 0x78909c, dx + sx * 0.38, y0 + 1.45, dz);
  k.cyl(0.08, 0.95, DARK, dx, y0 + 1.65, dz, { axis: 'x', seg: 8 });
  // Solar panels in rows along the front
  for (let i = 0; i < 1 + level; i++) solarPanel(k, -1.85 + (i % 3) * 0.72, 0.85, 1.25 + Math.floor(i / 3) * 0.8, 0.62, 0.55, 0.45);
  if (level >= 2) {
    // Radio mast beside the building: a lattice of struts, a red light on top
    const mx = -1.9;
    const mz = -0.25;
    for (const [ax, az] of [[-0.12, -0.12], [0.12, -0.12], [0, 0.12]]) strut(k, [mx + ax * 2, y0, mz + az * 2], [mx + ax * 0.5, y0 + 3.0, mz + az * 0.5], 0.03, 0xd32f2f);
    for (let i = 1; i < 6; i++) k.torus(0.2 - i * 0.025, 0.015, 0xeceff1, mx, y0 + i * 0.5, mz, { rx: PI / 2, seg: 8 });
    k.ball(0.11, red, mx, y0 + 3.1, mz, { seg: 8, rows: 5 });
  }
  if (level >= 4) {
    // Fuel tank for the station
    k.cyl(0.3, 1.0, 0xeceff1, 1.75, y0 + 0.4, -1.6, { axis: 'z', seg: 12 });
    for (const sz of [-1, 1]) k.box(0.5, 0.25, 0.1, DARK, 1.75, y0 + 0.12, -1.6 + sz * 0.3);
  }
  k.done();
  bigDish(u, u.body, `orbitDish${level}`, dx, y0 + 1.75, dz, 1.4 + level * 0.08, level >= 5 ? plasma : 0xcfd8dc, plasma);

  // The satellite, high in the sky
  const sat = new THREE.Group();
  sat.position.set(0, 12, 0);
  u.body.add(sat);
  u.satellite = sat;
  const s = kit(u, sat, `orbitSat${level}`);
  const FOIL = 0xffd54f;
  s.box(1.0, 1.0, 1.4, FOIL, 0, 0, 0, { r: 0.06 });
  for (const sx of [-1, 1]) for (const [yy, zz] of [[0.2, -0.3], [-0.25, 0.35], [0.25, 0.4]]) s.box(0.02, 0.3, 0.4, tone(FOIL, 0.82), sx * 0.51, yy, zz);
  s.box(1.02, 0.08, 1.42, 0xb0bec5, 0, 0.3, 0);
  s.cyl(0.35, 0.35, 0xeceff1, 0, 0.67, 0, { seg: 14 });
  s.cyl(0.18, 0.3, DARK, 0, -0.1, -0.8, { axis: 'z', r2: 0.1, seg: 10 }); // thruster
  for (const sx of [-1, 1]) {
    // Solar wings on booms
    s.cyl(0.05, 0.7, 0xb0bec5, sx * 0.85, 0, 0, { axis: 'x', seg: 6 });
    s.box(0.12, 0.2, 0.2, DARK, sx * 1.2, 0, 0);
    const wings = level >= 3 ? 2 : 1;
    const pd = 0.9 + level * 0.06;
    for (let w = 0; w < wings; w++) {
      const cx = sx * (1.85 + w * 1.25);
      s.box(1.15, 0.04, pd + 0.06, 0xb0bec5, cx, 0, 0);
      s.box(1.1, 0.06, pd, 0x1a237e, cx, 0, 0);
      for (let i = 1; i < 4; i++) s.box(0.02, 0.07, pd, 0x5c6bc0, cx - 0.55 + i * 0.275, 0, 0);
      s.box(1.1, 0.07, 0.02, 0x5c6bc0, cx, 0, 0);
      if (w) s.box(0.12, 0.08, 0.3, 0xeceff1, cx - sx * 0.62, 0, 0); // hinge
    }
  }
  // The beam emitter under the nose
  s.cyl(0.4, 0.5, 0x90a4ae, 0, -0.7, 0.3, { r2: 0.25, seg: 14 });
  s.torus(0.33, 0.04, DARK, 0, -0.9, 0.3, { rx: PI / 2, seg: 14 });
  s.cyl(0.22, 0.08, plasma, 0, -0.98, 0.3, { seg: 14 });
  antenna(s, -0.3, 0.5, -0.4, 0.6);
  if (level >= 4) {
    for (const x of [-0.38, 0.38]) {
      s.cyl(0.14, 0.75, DARK, x, -0.65, 0.62, { seg: 10 });
      s.cyl(0.16, 0.08, plasma, x, -1.05, 0.62, { seg: 10 });
    }
  }
  s.done();
  dish(u, sat, 'orbitSatDish', 0, 0.85, 0.1, 0.38, 0xeceff1, null).rotation.x = 0.4;
  gunMuzzle(u, sat, 0, -1.1, 0.3);
  if (level >= 4) for (const x of [-0.38, 0.38]) gunMuzzle(u, sat, x, -1.15, 0.62);
  if (level >= 5) {
    // A ring that turns round the satellite, and a faint beam down to the dish
    const ring = spinner(u, sat, 0, 0, 0, 'y');
    const r = kit(u, ring, 'orbitRing');
    r.torus(2.1, 0.07, seeThrough(u, 0xe040fb, 0.5, true), 0, 0, 0, { rx: PI / 2, seg: 32 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      r.box(0.22, 0.22, 0.22, plasma, Math.cos(a) * 2.1, 0, Math.sin(a) * 2.1, { ry: -a });
    }
    r.done();
    u.idleSpin = 0.6;
    const b = kit(u, u.body, 'orbitBeam');
    b.cyl(0.08, 8.6, seeThrough(u, 0xf3e5f5, 0.25, true), dx, 7.0, dz * 0.5, { seg: 8 });
    for (const m of b.done()) m.castShadow = false;
  }
  u.static = true;
  u.tracer = 0xe040fb;
  u.tracerWidth = level >= 4 ? 0.6 : 0.4;
  return u;
}

// ------------------------------------------------------------------ Void Port

/**
 * Void Port: a dark purple station with rails running through a round stone portal. Lv 1 lamps on
 * the platform, Lv 2 void crystals, Lv 3 a locomotive coming out of the portal, Lv 4 a bigger
 * portal with a crystal crest and a gun wagon, Lv 5 a void train and a swirl turning in the portal.
 */
export function makeVoidPort(level) {
  level = lv(level);
  const u = makeThing();
  const STONE = 0x2a1a40;
  const DK = 0x160826;
  const rune = glowMat(u, level >= 5 ? 0xd500f9 : 0xaa00ff);
  const k = kit(u, u.body, `voidport${level}`);
  k.slab(4.4, 0.3, 4.4, STONE, 0, 0.15, 0, { tw: 0.97, td: 0.97 });
  for (const f of [-1.1, 1.1]) k.box(4.2, 0.02, 0.05, tone(STONE, 0.65), 0, 0.305, f);
  // Track: ballast bed, sleepers with tie plates, rails with a head and a foot
  const tx = 0.6;
  const railY = 0.69;
  k.slab(1.8, 0.12, 4.4, 0x3a2f45, tx, 0.36, 0, { tw: 0.85 });
  for (let i = 0; i < 7; i++) {
    const z = -2.0 + i * 0.66;
    k.box(1.6, 0.1, 0.28, 0x3e2723, tx, 0.47, z, { r: 0.02 });
    for (const x of [0.15, 1.05]) k.box(0.24, 0.03, 0.22, DARK, x, 0.535, z);
  }
  for (const x of [0.15, 1.05]) {
    k.box(0.16, 0.04, 4.4, 0x546e7a, x, 0.57, 0);
    k.box(0.05, 0.08, 4.4, 0x78909c, x, 0.63, 0);
    k.box(0.1, 0.05, 4.4, 0xb0bec5, x, railY - 0.025, 0);
  }
  // Platform on the left with a glowing edge, paving lines and a bench
  k.box(1.4, 0.6, 3.8, DK, -1.4, 0.6, 0, { r: 0.04 });
  k.box(0.22, 0.03, 3.8, rune, -0.82, 0.915, 0);
  for (let i = 1; i < 6; i++) k.box(1.1, 0.02, 0.03, tone(DK, 1.6), -1.5, 0.91, -1.9 + i * 0.63);
  k.box(0.5, 0.08, 1.0, 0x4a3560, -1.85, 1.3, 0.1, { r: 0.03 });
  k.box(0.08, 0.4, 1.0, 0x4a3560, -2.05, 1.52, 0.1);
  for (const z of [-0.3, 0.5]) k.box(0.4, 0.4, 0.06, DARK, -1.85, 1.1, z);
  // Canopy: two posts, a sloped roof with a gutter, brackets and a hanging sign
  for (const z of [-1.35, 1.35]) {
    k.cyl(0.08, 2.4, DARK, -1.9, 2.1, z, { seg: 8 });
    k.cyl(0.14, 0.15, DARK, -1.9, 0.98, z, { seg: 8 });
    strut(k, [-1.9, 2.8, z], [-1.2, 3.25, z], 0.04, DARK);
  }
  k.slab(1.9, 0.14, 3.7, STONE, -1.45, 3.3, 0, { rz: 0.12 });
  k.cyl(0.07, 3.7, DARK, -0.52, 3.38, 0, { axis: 'z', seg: 8 });
  k.box(1.1, 0.35, 0.06, DARK, -1.2, 2.75, 0);
  k.box(0.8, 0.08, 0.07, rune, -1.2, 2.75, 0);
  for (const sx of [-0.4, 0.4]) k.cyl(0.015, 0.4, DARK, -1.2 + sx, 3.1, 0, { seg: 4 });
  if (level >= 1) {
    // Lamps on the platform edge: posts with glowing lanterns
    for (const z of [-0.8, 1.2]) {
      k.cyl(0.05, 1.5, DARK, -0.95, 1.65, z, { seg: 6 });
      k.box(0.24, 0.3, 0.24, DARK, -0.95, 2.5, z, { r: 0.03 });
      k.ball(0.1, rune, -0.95, 2.48, z, { seg: 8, rows: 6 });
      k.cyl(0.16, 0.1, DARK, -0.95, 2.7, z, { r2: 0.04, seg: 4, ry: PI / 4 });
    }
  }
  // The portal: a stone ring the rails run through, on two buttresses, with glowing runes round it
  const az = -1.75;
  const R = level >= 4 ? 1.75 : 1.45;
  const cy = 0.45 + R;
  k.torus(R, 0.3, STONE, tx, cy, az, { seg: 30 });
  k.torus(R - 0.24, 0.06, rune, tx, cy, az + 0.05, { seg: 30 });
  for (let i = 0; i < 9; i++) {
    const a = PI * 0.12 + (i / 8) * PI * 0.76;
    const ax = tx + Math.cos(a) * R;
    const ay = cy + Math.sin(a) * R;
    k.box(0.22, 0.32, 0.12, rune, ax, ay, az + 0.28, { rz: a - PI / 2 });
    k.box(0.34, 0.44, 0.1, tone(STONE, 1.5), ax, ay, az + 0.24, { rz: a - PI / 2 });
  }
  for (const sx of [-1, 1]) k.slab(0.6, cy, 0.8, STONE, tx + sx * (R + 0.2), cy / 2 + 0.3 - 0.15, az, { tw: 0.6, tx: -sx * 0.1 });
  const veil = seeThrough(u, 0x7c4dff, level >= 5 ? 0.6 : 0.45, true);
  k.cyl(R - 0.25, 0.05, veil, tx, cy, az, { axis: 'z', seg: 30 });
  if (level >= 2) {
    // Void crystals growing out of the ground
    crystal(k, -1.9, 0.3, -2.0, 0.25, 1.2, rune, 0.2, PI * 1.2);
    crystal(k, 2.0, 0.3, 1.8, 0.22, 1.0, rune, 0.25, 0.3);
    crystal(k, 2.0, 0.3, -0.6, 0.28, 1.4, rune, 0.15, -0.2);
    crystal(k, 1.8, 0.3, -0.1, 0.14, 0.6, rune, 0.4, 0.8);
  }
  if (level >= 4) {
    // A crystal crest on top of the portal and rune spikes on the buttresses
    crystal(k, tx, cy + R + 0.2, az, 0.3, 1.1, rune);
    for (const sx of [-1, 1]) crystal(k, tx + sx * (R + 0.2), cy + 0.1, az, 0.16, 0.7, rune, 0.3, sx > 0 ? 0 : PI);
  }
  k.done();
  if (level >= 5) {
    // A swirl turning inside the portal
    const sw = spinner(u, u.body, tx, cy, az + 0.06, 'z');
    const s = kit(u, sw, `voidSwirl:${R}`);
    for (let arm = 0; arm < 3; arm++) {
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        const a = arm * ((PI * 2) / 3) + t * 2.4;
        pts.push([Math.cos(a) * t * (R - 0.3), 0, Math.sin(a) * t * (R - 0.3)]);
      }
      s.tube(pts, 0.06, rune, { sides: 4 });
    }
    s.ball(0.2, rune, 0, 0, 0, { seg: 8, rows: 6 });
    s.done();
    u.idleSpin = 1.5;
  }
  if (level >= 3) {
    parkUnit(u, level >= 5 ? 'vvoidloco' : 'vloco', 0.4, tx, railY, level >= 4 ? 1.0 : 0.3);
    if (level >= 4) parkUnit(u, level >= 5 ? 'vvoidgwagon' : 'vgunwagon', 0.4, tx, railY, -1.4);
  }
  u.static = true;
  return u;
}

// ------------------------------------------------------------------ The Eldritch

/** A curling tentacle from (x, y, z) leaning out toward angle a: tapering round segments, suckers, a glowing tip. */
function tentacle(k, x, y, z, a, n, len, col, tip, phase) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const out = Math.sin(t * 2.4) * len * 0.42;
    const side = Math.sin(t * 4 + phase) * 0.22;
    pts.push([x + Math.cos(a) * out - Math.sin(a) * side, y + t * len * (1 - t * 0.25), z + Math.sin(a) * out + Math.cos(a) * side]);
  }
  for (let i = 0; i < n; i++) {
    const r = 0.2 * (1 - (i / n) * 0.7);
    k.tube([pts[i], pts[i + 1]], r, col, { sides: 7, seg: 2 });
    k.ball(r * 1.06, col, pts[i][0], pts[i][1], pts[i][2], { seg: 8, rows: 5 });
    if (i % 2) k.ball(r * 0.4, tip, pts[i][0] - Math.cos(a) * r, pts[i][1], pts[i][2] - Math.sin(a) * r, { seg: 5, rows: 4 });
  }
  k.ball(0.09, tip, pts[n][0], pts[n][1], pts[n][2], { seg: 6, rows: 4 });
}

/**
 * The Eldritch: a cosmic rail cannon on a cracked obsidian altar, wrapped in curling tentacles.
 * Longer rails and more glow every level; Lv 1 cables into the cannon, Lv 2 a floating eye,
 * Lv 3 rune obelisks, Lv 4 more tentacles and a second pair of rails, Lv 5 a huge eye, a void
 * core and a halo of shards turning round the eye.
 */
export function makeEldritch(level) {
  level = lv(level);
  const u = makeThing();
  const teal = [0x1de9b6, 0x1de9b6, 0x00e5a0, 0x64ffda, 0x76ff03, 0xb2ff59][level];
  const glowM = glowMat(u, teal);
  const voidM = glowMat(u, 0xd500f9);
  const STONE = 0x1b1426;
  const FLESH = level >= 4 ? 0x2e1a47 : 0x263238;
  const k = kit(u, u.body, `eldritch${level}`);
  // Two-step octagonal altar with glowing cracks and a rune ring
  k.plan(poly(8, 2.25), 0.5, STONE, 0, 0, 0, { bevel: 0.08 });
  k.plan(poly(8, 1.65), 0.6, 0x2a2036, 0, 0.5, 0, { bevel: 0.08 });
  for (const [x, z, r, l] of [[-1.2, 1.55, 0.4, 1.0], [1.4, -1.0, -0.6, 0.9], [0.3, 1.95, 0, 0.7], [-1.6, -0.6, 1.2, 0.6]]) k.box(l, 0.04, 0.08, glowM, x, 0.5, z, { ry: r });
  k.torus(1.25, 0.04, glowM, 0, 1.1, 0, { rx: PI / 2, seg: 24 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    k.box(0.16, 0.03, 0.08, glowM, Math.cos(a) * 1.25, 1.11, Math.sin(a) * 1.25, { ry: -a });
  }
  // Pedestal under the cannon
  k.cyl(0.8, 1.4, 0x0d0a12, 0, 1.8, 0, { r2: 0.65, seg: 8, flat: true });
  for (const y of [1.3, 2.2]) k.torus(0.74, 0.05, FLESH, 0, y, 0, { rx: PI / 2, seg: 8 });
  // Tentacles writhing up round the cannon
  const n = 2 + Math.min(level, 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2 + 0.4;
    tentacle(k, Math.cos(a) * 1.35, 1.1, Math.sin(a) * 1.35, a, 5 + (level >> 1), 1.9 + level * 0.18, FLESH, glowM, i * 1.7);
  }
  if (level >= 3) {
    // Rune obelisks on the lower step, each with a floating crystal
    for (const [x, z] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) {
      k.slab(0.5, 2.0, 0.5, STONE, x, 1.5, z, { tw: 0.6, td: 0.6 });
      k.box(0.46, 0.14, 0.46, glowM, x, 1.9, z);
      k.box(0.1, 0.5, 0.02, glowM, x, 1.4, z + Math.sign(z) * 0.24);
      crystal(k, x, 2.75, z, 0.14, 0.5, glowM);
    }
  }
  if (level >= 5) k.ball(0.45, voidM, 0, 1.8, 0.75, { seg: 12, rows: 8 }); // void core
  k.done();

  // The cannon: a stone housing with ribbed rails, coils and an emitter
  const len = 3.4 + level * 0.7;
  const pairs = level >= 4 ? 2 : 1;
  const gun = new THREE.Group();
  gun.position.set(0, 3.0, -0.4);
  u.body.add(gun);
  const g = kit(u, gun, `eldritchGun${level}`);
  g.box(2.0, 1.4, 2.4, STONE, 0, 0, 0, { r: 0.18 });
  for (const z of [-0.7, 0, 0.7]) g.box(2.08, 0.12, 0.16, FLESH, 0, 0.15, z, { r: 0.04 });
  g.torus(0.42, 0.05, glowM, 0, 0.1, 1.21, { seg: 16 });
  g.ball(0.16, glowM, 0, 0.1, 1.2, { seg: 8, rows: 6 });
  for (let p = 0; p < pairs; p++) {
    const y = pairs > 1 ? (p ? 0.35 : -0.35) : 0;
    for (const x of [-0.4, 0.4]) {
      g.cyl(0.14, len, 0x0d0a12, x, y, 1.2 + len / 2, { axis: 'z', seg: 8 });
      g.box(0.05, 0.1, len - 0.2, glowM, x * 0.62, y, 1.2 + len / 2);
      g.cyl(0.05, 0.4, 0x0d0a12, x, y, 1.4 + len, { axis: 'z', r2: 0, seg: 6 }); // prong
    }
  }
  const rings = 2 + level;
  for (let i = 0; i < rings; i++) g.torus(0.62, 0.09, i % 2 ? glowM : FLESH, 0, 0, 1.6 + (i * (len - 0.6)) / rings, { sy: pairs > 1 ? 1.5 : 1, seg: 14 });
  g.ball(0.24, glowM, 0, 0, 1.25 + len, { seg: 10, rows: 7 });
  if (level >= 1) {
    // Fleshy cables from the housing down into the altar
    for (const sx of [-1, 1]) g.tube([[sx * 1.0, -0.2, -0.3], [sx * 1.5, -0.9, -0.5], [sx * 1.4, -1.9, -0.2]], 0.14, FLESH, { sides: 6 });
  }
  g.done();
  gunMuzzle(u, gun, 0, 0, 1.4 + len);

  if (level >= 2) {
    // A floating eye watching over the cannon: lids, an iris, a slit pupil and veins
    const es = level >= 5 ? 1.6 : 1;
    const eye = new THREE.Group();
    eye.position.set(0, 5.2 + level * 0.2, -1.2);
    u.body.add(eye);
    const e = kit(u, eye, `eldritchEye${es}:${level >= 4}`);
    e.ball(0.5 * es, 0xe0e0d0, 0, 0, 0, { seg: 16, rows: 12 });
    e.ball(0.27 * es, glowM, 0, 0, 0.32 * es, { sz: 0.55, seg: 14, rows: 8 });
    e.box(0.08 * es, 0.34 * es, 0.04, 0x050505, 0, 0, 0.47 * es);
    e.torus(0.47 * es, 0.09 * es, FLESH, 0, 0, 0.1 * es, { seg: 18 });
    e.torus(0.4 * es, 0.06 * es, FLESH, 0, 0.12 * es, 0.24 * es, { arc: PI, sx: 1.1, seg: 14 }); // heavy upper lid
    for (const a of [0.6, 2.3, 3.9, 5.2]) e.tube([[Math.cos(a) * 0.48 * es, Math.sin(a) * 0.48 * es, 0.1 * es], [Math.cos(a) * 0.38 * es, Math.sin(a) * 0.38 * es, 0.32 * es], [Math.cos(a + 0.3) * 0.28 * es, Math.sin(a + 0.3) * 0.28 * es, 0.42 * es]], 0.012 * es, 0xc62828, { sides: 3 });
    for (let i = 0; i < 3; i++) e.tube([[(i - 1) * 0.2 * es, -0.4 * es, -0.1], [(i - 1) * 0.3 * es, -0.8 * es, -0.2], [(i - 1) * 0.25 * es, -1.2 * es, 0]], 0.05 * es, FLESH, { sides: 5 });
    if (level >= 5) e.torus(0.6 * es, 0.04, glowM, 0, 0, 0.05, { seg: 20 });
    e.done();
  }
  if (level >= 5) {
    // A halo of void shards turning round the eye
    const halo = spinner(u, u.body, 0, 6.6, -1.2, 'y');
    const h = kit(u, halo, 'eldritchHalo');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      crystal(h, Math.cos(a) * 2.4, -0.3, Math.sin(a) * 2.4, 0.16, 0.7, i % 2 ? voidM : glowM);
    }
    h.done();
    u.idleSpin = 0.7;
  }
  u.tracer = teal;
  u.tracerWidth = 0.4 + level * 0.12;
  return u;
}

// ------------------------------------------------------------------ Valkyr

const VALKYR_MECHS = [
  ['mech1', 5.83],
  ['mech2', 6.92],
  ['mech45', 8.01],
  ['mech10', 9.47],
  ['mechult', 12.38],
];

/**
 * Valkyr (0-4): a mech drop base. A landing pad with a drop beacon and a hangar that grows each
 * level. Lv 1 floodlights, Lv 2 the level's mech parked on the pad, Lv 3 a turning radar dish and
 * supply crates, Lv 4 a huge hangar and a drop pod hovering over the pad on its thrusters.
 */
export function makeValkyr(level) {
  level = lv(level, 4);
  const u = makeThing();
  const accent = glowMat(u, level >= 4 ? 0x00e5ff : 0xffab00);
  const beacon = glowMat(u, level >= 2 ? 0xff1744 : 0xffd600);
  const flood = glowMat(u, 0xfff9c4);
  const y0 = 0.3;
  const k = kit(u, u.body, `valkyr${level}`);
  k.slab(4.6, y0, 4.6, 0x616161, 0, y0 / 2, 0, { tw: 0.97, td: 0.97 });
  for (const f of [-1.15, 1.15]) k.box(4.4, 0.02, 0.05, 0x4a4a4a, 0, y0 + 0.005, f);
  // Landing circle: dark disc, yellow ring, a white cross and lights round the edge
  const pz = 0.9;
  k.cyl(1.6, 0.03, 0x424242, 0, y0 + 0.015, pz, { seg: 30 });
  k.torus(1.42, 0.06, HAZARD, 0, y0 + 0.035, pz, { rx: PI / 2, seg: 30 });
  for (const ry of [PI / 4, -PI / 4]) k.box(1.6, 0.03, 0.14, 0xeceff1, 0, y0 + 0.03, pz, { ry });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    k.cyl(0.13, 0.07, DARK, Math.cos(a) * 1.75, y0 + 0.035, pz + Math.sin(a) * 1.75, { seg: 8 });
    k.cyl(0.09, 0.05, accent, Math.cos(a) * 1.75, y0 + 0.08, pz + Math.sin(a) * 1.75, { seg: 8 });
  }
  // Hangar at the back, bigger each level
  const hw = 2.4 + level * 0.45;
  const hh = 1.8 + level * 0.4;
  const hz = -1.45;
  const WALL = [0x78909c, 0x607d8b, 0x546e7a, 0x455a64, 0x37474f][level];
  k.box(hw, hh, 1.6, WALL, 0, y0 + hh / 2, hz, { r: 0.05 });
  for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) k.box(0.04, hh, 0.08, tone(WALL, 0.8), sx * (hw / 2 + 0.01), y0 + hh / 2, hz - 0.6 + i * 0.3);
  k.slab(hw + 0.3, 0.3, 1.9, 0x263238, 0, y0 + hh + 0.15, hz, { tw: 0.92, td: 0.85 });
  rollerDoor(k, hw * 0.62, hh * 0.78, 0, y0, hz + 0.81, 0x2b2b2b);
  k.box(hw * 0.7, 0.1, 0.06, accent, 0, y0 + hh * 0.93, hz + 0.82);
  for (const sx of [-1, 1]) {
    const gx = sx * (hw * 0.31 + 0.14 + (hw * 0.19 - 0.14) / 2);
    k.box(0.28, 0.3, 0.05, 0x1b1d1f, gx, y0 + hh * 0.6, hz + 0.81);
    for (let i = 0; i < 4; i++) k.box(0.26, 0.03, 0.04, 0x90a4ae, gx, y0 + hh * 0.6 - 0.11 + i * 0.075, hz + 0.84);
  }
  k.box(0.6, 0.3, 0.5, 0xb0bec5, -hw / 4, y0 + hh + 0.45, hz + 0.1, { r: 0.04 });
  k.cyl(0.18, 0.03, DARK, -hw / 4, y0 + hh + 0.61, hz + 0.1, { seg: 10 });
  // Fuel hose from the hangar to the pad
  k.tube([[hw / 2 - 0.2, y0 + 0.1, hz + 0.8], [hw / 2 - 0.4, y0 + 0.05, hz + 1.8], [1.0, y0 + 0.05, pz - 0.6]], 0.05, 0x212121, { sides: 5 });
  // Drop beacon: a lattice mast with a light in a cage
  const bh = 2.4 + level * 0.4;
  const bx = 1.95;
  const bz = 1.95;
  for (const [ax, az] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    strut(k, [bx + ax * 0.22, y0, bz + az * 0.22], [bx + ax * 0.1, y0 + bh, bz + az * 0.1], 0.03, 0xbdbdbd);
  }
  for (let i = 1; i < 5; i++) k.box(0.36 - i * 0.04, 0.03, 0.36 - i * 0.04, 0xbdbdbd, bx, y0 + (i * bh) / 5, bz);
  k.box(0.4, 0.05, 0.4, DARK, bx, y0 + bh, bz);
  k.ball(0.2, beacon, bx, y0 + bh + 0.25, bz, { seg: 10, rows: 7 });
  for (let i = 0; i < 4; i++) k.box(0.03, 0.5, 0.03, DARK, bx + Math.cos((i * PI) / 2 + PI / 4) * 0.25, y0 + bh + 0.25, bz + Math.sin((i * PI) / 2 + PI / 4) * 0.25);
  k.cyl(0.24, 0.05, DARK, bx, y0 + bh + 0.52, bz, { seg: 10 });
  if (level >= 1) {
    // Floodlights on poles at the pad's sides
    for (const sx of [-1, 1]) {
      k.cyl(0.07, 1.8, 0x757575, sx * 2.05, y0 + 0.9, 0, { seg: 8 });
      k.box(0.55, 0.38, 0.22, DARK, sx * 2.05, y0 + 1.9, 0.05, { r: 0.04 });
      for (const lx of [-0.13, 0.13]) lamp(k, sx * 2.05 + lx, y0 + 1.9, 0.12, 0.1, flood);
    }
  }
  if (level >= 3) {
    // Supply crates and fuel drums by the pad, a radar mast on the roof
    crate(k, -1.85, y0 + 0.25, 1.6, 0.6, 0.5, 0.6, 0x4e5b31);
    crate(k, -1.85, y0 + 0.75, 1.6, 0.6, 0.5, 0.6, 0x5d6b3a);
    drum(k, -1.85, y0, 2.2, 0x37474f, HAZARD);
    k.cyl(0.07, 0.9, 0x757575, -hw / 2 + 0.45, y0 + hh + 0.75, hz - 0.2, { seg: 8 });
  }
  k.done();
  if (level >= 3) {
    const radar = spinner(u, u.body, -hw / 2 + 0.45, y0 + hh + 1.2, hz - 0.2, 'y');
    dish(u, radar, 'valkyrRadar', 0, 0, 0, 0.55, 0xeceff1, accent);
    u.idleSpin = 1.2;
  }
  if (level >= 2) {
    const [mech, h] = VALKYR_MECHS[level];
    parkUnit(u, mech, 2.2 / h, 0, y0 + 0.03, pz);
  }
  if (level >= 4) {
    // A drop pod hovering high over the pad on four thrusters
    const pod = new THREE.Group();
    pod.position.set(0, 5.6, pz);
    u.body.add(pod);
    const p = kit(u, pod, 'valkyrPod');
    p.cyl(0.72, 1.6, 0xcfd8dc, 0, 0, 0, { r2: 0.6, seg: 16 });
    p.cyl(0.6, 0.6, 0x37474f, 0, 1.1, 0, { r2: 0.18, seg: 16 });
    p.cyl(0.74, 0.18, accent, 0, 0.25, 0, { seg: 16 });
    p.box(0.5, 0.7, 0.06, 0x37474f, 0, -0.1, 0.7, { rx: 0.06 });
    p.box(0.3, 0.15, 0.04, GLASS, 0, 0.1, 0.73);
    bolts(p, [-0.45, -0.7, 0.65], [0.45, -0.7, 0.65], 5, STEEL);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2 + PI / 4;
      p.slab(0.1, 1.2, 0.7, 0x546e7a, Math.cos(a) * 0.85, -0.4, Math.sin(a) * 0.85, { ry: -a, tw: 0.4 });
      p.cyl(0.18, 0.3, DARK, Math.cos(a) * 0.4, -0.95, Math.sin(a) * 0.4, { r2: 0.13, seg: 10 });
      p.cyl(0.02, 0.6, glowMat(u, 0xff6d00), Math.cos(a) * 0.4, -1.4, Math.sin(a) * 0.4, { r2: 0.14, seg: 8 });
    }
    p.done();
  }
  return u;
}

// ------------------------------------------------------------------ Squadron and Borealis

/**
 * The carrier both towers use. look: hull / waterline / deck / line / edge / island / glass colours,
 * fortress (no island), plane (the parked plane's model), grow (extra length per level).
 * Returns the deck height and the layout so each tower can add its own pieces.
 */
function carrier(u, k, level, look) {
  const L = 6.4 + level * look.grow;
  const W = 2.6;
  const z0 = -0.3;
  const dy = 0.8;
  const top = dy + 0.2;
  hull(k, L, W, -0.4, dy, look.hull, { z: z0, bow: 1.5, stripe: look.waterline, deck: tone(look.hull, 0.8), rail: false });
  // Flight deck: wider than the hull, with the angled landing deck sticking out on the left
  const hw = W / 2 + 0.35;
  const deck = [
    [hw, -L / 2 - 0.15], [hw, L / 2 - 1.2], [hw - 0.4, L / 2 + 0.1], [-hw + 0.4, L / 2 + 0.1], [-hw, L / 2 - 1.0],
    [-hw - 0.15, L * 0.1], [-hw - 0.75, -L * 0.12], [-hw - 0.6, -L / 2 + 0.25], [-hw, -L / 2 - 0.15],
  ];
  k.plan(deck.map(([x, z]) => [x * 0.94, z * 0.97]), 0.3, tone(look.hull, 0.85), 0, dy - 0.3, z0);
  k.plan(deck, 0.2, look.deck, 0, dy, z0, { bevel: 0.04 });
  for (const z of [-L * 0.3, -L * 0.05]) k.tube([[-W / 2 + 0.1, 0.2, z0 + z], [-hw - 0.5, dy - 0.05, z0 + z]], 0.06, tone(look.hull, 0.7), { sides: 5, seg: 1 });
  // Deck markings: the straight runway, the angled landing line, edge lines and wires
  for (let i = 0; i < 6; i++) k.box(0.1, 0.02, L * 0.08, look.line, 0.2, top + 0.005, z0 - L / 2 + 0.6 + (i * L) / 6.5);
  for (let i = 0; i < 5; i++) {
    const f = -0.42 + i * 0.14;
    k.box(0.1, 0.02, L * 0.08, look.line, -0.85 - f * 0.9, top + 0.005, z0 + f * L, { ry: -0.15 });
  }
  for (const sx of [-1, 1]) k.box(0.06, 0.02, L * 0.7, look.edge, sx * (hw - 0.1), top + 0.005, z0 - 0.2);
  for (let i = 0; i < 3; i++) k.box(1.4, 0.03, 0.03, DARK, -0.85, top + 0.01, z0 - L * 0.32 + i * 0.25, { ry: -0.15 });
  for (const x of [-0.65, 0.55]) k.box(0.08, 0.025, L * 0.3, 0x2b2b2b, x, top + 0.008, z0 + L * 0.28);
  k.box(1.0, 0.02, 1.0, tone(look.deck, 0.85), hw - 0.6, top + 0.004, z0 - L * 0.35); // lift
  let ix = 0;
  let iz = 0;
  let mastTop = 0;
  if (!look.fortress) {
    // The island: a tall block with a wrap-round bridge, windows, a funnel and a mast
    ix = W / 2 + 0.1;
    iz = z0 - L * 0.08;
    const ih = 1.4 + level * 0.15;
    k.box(0.85, ih, 1.9, look.island, ix, top + ih / 2, iz, { r: 0.05 });
    k.slab(1.0, 0.45, 1.35, look.island, ix, top + ih + 0.22, iz + 0.25, { tw: 0.9, td: 0.9 });
    k.box(1.02, 0.16, 1.32, look.glass, ix, top + ih + 0.24, iz + 0.25);
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) k.box(0.02, 0.1, 0.14, look.glass, ix - 0.43, top + ih * (0.4 + r * 0.25), iz - 0.6 + i * 0.4);
    k.slab(0.55, 0.6, 0.7, tone(look.island, 0.85), ix, top + ih + 0.3, iz - 0.6, { tw: 0.8, td: 0.8 });
    k.box(0.45, 0.06, 0.56, 0x1a1a1a, ix, top + ih + 0.62, iz - 0.6);
    k.box(0.04, 0.4, 0.5, 0xfafafa, ix + 0.43, top + ih * 0.5, iz + 0.4); // hull number
    mastTop = top + ih + 1.5;
    k.cyl(0.06, 1.1, DARK, ix, top + ih + 0.95, iz + 0.1, { seg: 6 });
    k.box(0.9, 0.05, 0.05, DARK, ix, top + ih + 1.2, iz + 0.1);
    antenna(k, ix + 0.35, top + ih + 0.45, iz + 0.6, 0.6);
  }
  // Parked planes (the plane this level sends out)
  const spots = [[-0.65, L * 0.3, 0], [0.55, L * 0.3, 0], [-0.65, L * 0.1, 0], [-0.95, -L * 0.24, -0.3], [0.35, -L * 0.36, 0.5], [-0.45, -L * 0.42, 0.2]];
  const n = Math.min(spots.length, 1 + level);
  const planes = [];
  for (let i = 0; i < n; i++) {
    const [x, z, r] = spots[i];
    planes.push(parkUnit(u, look.plane, 0.19, x, top + 0.22, z0 + z, r));
  }
  // Bow gun: a turret with twin barrels (the first muzzle)
  const t = new THREE.Group();
  t.position.set(0, top, z0 + L / 2 - 0.35);
  u.body.add(t);
  const g = kit(u, t, `carrierGun:${look.island}`);
  g.cyl(0.4, 0.12, DARK, 0, 0.06, 0, { seg: 14 });
  g.box(0.6, 0.35, 0.6, look.island, 0, 0.3, 0, { r: 0.08 });
  for (const x of [-0.08, 0.08]) barrel(g, x, 0.32, 0.25, 0.7, 0.05, GUN);
  g.done();
  gunMuzzle(u, t, 0, 0.32, 1.0);
  return { L, W, dy, top, z0, hw, ix, iz, mastTop, planes };
}

/**
 * Squadron: an aircraft carrier with a flight deck, a control island and parked planes (one more
 * each level). Lv 2 a turning radar, Lv 3 catapult lights, Lv 4 spinning point-defense guns,
 * Lv 5 a dark hull with glowing deck edge lights.
 */
export function makeSquadron(level) {
  level = lv(level);
  const u = makeThing();
  const lit = glowMat(u, 0x76ff03);
  const cat = glowMat(u, 0x40c4ff);
  const k = kit(u, u.body, `squadron${level}`);
  const c = carrier(u, k, level, {
    grow: 0.4,
    hull: level >= 5 ? 0x37474f : 0x607d8b,
    waterline: 0x8e2b2b,
    deck: 0x424242,
    line: 0xfafafa,
    edge: 0xfdd835,
    island: level >= 5 ? 0x455a64 : 0x78909c,
    glass: 0x4fc3f7,
    plane: 'jmerlin',
  });
  const { L, W, top, z0 } = c;
  if (level >= 3) for (const x of [-0.65, 0.55]) k.box(0.06, 0.03, L * 0.28, cat, x, top + 0.02, z0 + L * 0.28);
  if (level >= 5) {
    for (let i = 0; i < 7; i++) for (const sx of [-1, 1]) k.box(0.1, 0.06, 0.1, lit, sx * (c.hw - 0.05), top + 0.03, z0 - L / 2 + 0.3 + (i * L) / 7);
    for (const sx of [-1, 1]) k.box(0.04, 0.12, L * 0.6, 0xffc107, sx * (W / 2 + 0.02), 0.45, z0 - 0.2);
  }
  k.done();
  if (level >= 2) {
    const r = spinner(u, u.body, c.ix, c.mastTop, c.iz + 0.1, 'y');
    const rk = kit(u, r, 'carrierRadar');
    rk.box(0.9, 0.3, 0.06, 0xeceff1, 0, 0.1, 0);
    for (let i = 0; i < 4; i++) rk.box(0.02, 0.28, 0.08, 0x90a4ae, -0.33 + i * 0.22, 0.1, 0);
    rk.cyl(0.06, 0.15, DARK, 0, -0.1, 0, { seg: 6 });
    rk.done();
    u.idleSpin = 1.5;
  }
  if (level >= 4) {
    // Point-defense guns at the stern corners: white domes over spinning barrels
    for (const sx of [-1, 1]) {
      const gp = new THREE.Group();
      gp.position.set(sx * (W / 2 + 0.25), top, z0 - L / 2 + 0.55);
      u.body.add(gp);
      const pk = kit(u, gp, 'ciws');
      pk.cyl(0.3, 0.25, 0x90a4ae, 0, 0.12, 0, { seg: 12 });
      pk.box(0.42, 0.3, 0.4, 0xeceff1, 0, 0.4, 0, { r: 0.06 });
      pk.ball(0.26, 0xeceff1, 0, 0.75, -0.05, { sy: 1.3, seg: 12, rows: 8 });
      pk.done();
      spinBarrels(u, gp, 'ciwsBarrels', 0, 0.42, 0.2, 0.55, 6, 0.06);
      gunMuzzle(u, gp, 0, 0.42, 0.8);
    }
  }
  u.body.position.z = 0.3 - level * 0.05;
  u.tracer = 0xffd740;
  u.projectile = { color: 0x424242, size: 0.5 };
  u.static = true;
  u.bob = 0.06;
  return u;
}

/**
 * Borealis (0-4): an aircraft carrier carved from ice, aurora green and purple glowing along the
 * hull, icicles under the deck and frosty planes. Lv 2 an ice radar crystal, Lv 3 aurora masts
 * with streaming light, Lv 4 an ice fortress on deck with a glowing crystal spire.
 */
export function makeBorealis(level) {
  level = lv(level, 4);
  const u = makeThing();
  const aurora = glowMat(u, 0x69f0ae);
  const violet = glowMat(u, 0xb388ff);
  const ICE = 0xb3e5fc;
  const SNOWC = 0xf5f9ff;
  const k = kit(u, u.body, `borealis${level}`);
  const fortress = level >= 4;
  const c = carrier(u, k, level, {
    grow: 0.5,
    hull: 0x81d4fa,
    waterline: aurora,
    deck: 0xe1f5fe,
    line: violet,
    edge: aurora,
    island: ICE,
    glass: glowMat(u, 0x80deea),
    fortress,
    plane: ['bbreeze', 'bbreeze', 'bnorthwind', 'bnorthwind', 'bnorthwind'][level],
  });
  const { L, W, dy, top, z0, hw } = c;
  // Aurora bands along the hull and icicles under the deck edge
  for (const sx of [-1, 1]) {
    k.box(0.05, 0.1, L * 0.7, aurora, sx * (W / 2 + 0.02), 0.3, z0 - 0.3);
    k.box(0.05, 0.1, L * 0.5, violet, sx * (W / 2 + 0.02), 0.55, z0 - 0.1);
    const m = 4 + level;
    for (let i = 0; i < m; i++) {
      const h = 0.3 + ((i * 7) % 3) * 0.12;
      k.cyl(0, h, 0xe1f5fe, sx * (hw - 0.05), dy - 0.3 - h / 2, z0 - L / 2 + 0.5 + (i * (L - 1.2)) / m, { r2: 0.07, seg: 5 });
    }
  }
  // Snow drifts on the deck corners
  for (const [x, z] of [[hw - 0.35, -L / 2 + 0.2], [-hw + 0.5, L / 2 - 0.8], [-hw - 0.3, -L * 0.15]]) k.ball(0.32, SNOWC, x, top, z0 + z, { sy: 0.3, seg: 10, rows: 6 });
  if (level >= 2 && !fortress) crystal(k, c.ix, top + 3.0, c.iz, 0.28, 0.9, violet);
  if (level >= 3) {
    // Aurora masts: tall poles trailing ribbons of light
    for (const z of [-L * 0.4, L * 0.05]) {
      k.cyl(0.06, 2.4, 0xeceff1, W / 2 + 0.3, top + 1.2, z0 + z, { seg: 6 });
      k.ball(0.1, aurora, W / 2 + 0.3, top + 2.45, z0 + z, { seg: 8, rows: 5 });
      for (let i = 0; i < 4; i++) k.box(0.04, 0.5, 0.35, i % 2 ? violet : aurora, W / 2 + 0.3, top + 2.1 - i * 0.18, z0 + z - 0.25 - i * 0.3, { rx: 0.2 * (i % 2 ? 1 : -1) });
    }
  }
  if (fortress) {
    // Ice fortress on the deck: octagonal walls with battlements, four round towers, a crystal spire
    const fx = 0.6;
    const fz = z0 - L * 0.08;
    k.plan(poly(8, 1.25), 1.0, ICE, fx, top, fz, { bevel: 0.05 });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * PI * 2;
      if (i % 2) k.box(0.22, 0.2, 0.22, SNOWC, fx + Math.cos(a) * 1.08, top + 1.1, fz + Math.sin(a) * 1.08, { ry: -a });
    }
    for (const [x, z] of [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]]) {
      k.cyl(0.32, 1.8, ICE, fx + x, top + 0.9, fz + z, { r2: 0.27, seg: 10 });
      k.cyl(0.36, 0.5, SNOWC, fx + x, top + 2.05, fz + z, { r2: 0.02, seg: 10 });
      k.box(0.1, 0.2, 0.04, aurora, fx + x, top + 1.3, fz + z + Math.sign(z) * 0.3);
    }
    k.box(0.5, 0.7, 0.06, 0x4fc3f7, fx, top + 0.4, fz + 1.2);
    k.plan(poly(6, 0.55), 0.9, ICE, fx, top + 1.0, fz, { bevel: 0.05 });
    crystal(k, fx, top + 1.9, fz, 0.32, 1.8, violet);
    crystal(k, fx, top + 3.3, fz, 0.15, 0.8, aurora);
  }
  k.done();
  if (level >= 2 && !fortress) {
    const r = spinner(u, u.body, c.ix, c.mastTop, c.iz + 0.1, 'y');
    const rk = kit(u, r, 'borealisRadar');
    rk.box(0.9, 0.3, 0.06, 0xe1f5fe, 0, 0.1, 0);
    rk.box(0.92, 0.05, 0.08, aurora, 0, 0.27, 0);
    rk.cyl(0.06, 0.15, DARK, 0, -0.1, 0, { seg: 6 });
    rk.done();
    u.idleSpin = 1.5;
  }
  u.body.position.z = 0.3 - level * 0.08;
  u.tracer = 0x69f0ae;
  u.projectile = { color: 0xb3e5fc, size: 0.55, glowing: true };
  u.static = true;
  u.bob = 0.06;
  return u;
}

// ------------------------------------------------------------------ Splash

/**
 * Splash (0-4): a water-bomber helicopter (the Pursuit's helicopter in white and blue) over a wet
 * helipad with a water tower. A belly tank and a water cannon under the nose; the helicopter grows
 * each level, Lv 1 a hose reel, Lv 2 water barrels, Lv 3 missile pods, Lv 4 the big four-blade
 * deep-blue model with glowing trim.
 */
export function makeSplash(level) {
  level = lv(level, 4);
  const u = makeThing();
  const water = glowMat(u, 0x29b6f6);
  const gauge = glowMat(u, 0x80d8ff);
  const k = kit(u, u.body, `splashpad${level}`);
  // Wet helipad: a blue-grey slab, a pale wet circle, the H, puddles and lights round the edge
  k.slab(4.4, 0.3, 4.4, 0x90a4ae, 0, 0.15, 0, { tw: 0.97, td: 0.97 });
  k.cyl(1.8, 0.03, 0xb3e5fc, 0, 0.31, 0, { seg: 28 });
  k.torus(1.6, 0.05, 0xfafafa, 0, 0.32, 0, { rx: PI / 2, seg: 28 });
  for (const sx of [-1, 1]) k.box(0.32, 0.04, 1.7, 0xfafafa, sx * 0.55, 0.33, 0);
  k.box(0.8, 0.04, 0.3, 0xfafafa, 0, 0.33, 0);
  for (const [x, z, s] of [[-1.6, -0.6, 0.4], [1.3, 1.6, 0.3], [-0.6, 1.9, 0.25]]) k.ball(s, 0x4fc3f7, x, 0.3, z, { sy: 0.06, sz: 0.7, seg: 12, rows: 4 });
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
    k.cyl(0.14, 0.12, DARK, x, 0.36, z, { seg: 8 });
    k.ball(0.1, water, x, 0.45, z, { seg: 8, rows: 5 });
  }
  // Water tower on four legs: a round tank with hoops, a dome, a ladder and a glowing level gauge
  const tx = 1.7;
  const tz = -1.7;
  const th = 1.0 + level * 0.2;
  const ty = 1.3;
  for (const [ax, az] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) strut(k, [tx + ax * 0.5, 0.3, tz + az * 0.5], [tx + ax * 0.35, ty, tz + az * 0.35], 0.05, 0x546e7a);
  for (const [a, b] of [[[-1, -1], [1, 1]], [[1, -1], [-1, 1]]]) strut(k, [tx + a[0] * 0.45, 0.5, tz + a[1] * 0.45], [tx + b[0] * 0.38, ty - 0.1, tz + b[1] * 0.38], 0.025, 0x546e7a);
  k.cyl(0.6, 0.1, 0x37474f, tx, ty, tz, { seg: 16 });
  k.cyl(0.55, th, 0x0277bd, tx, ty + th / 2, tz, { seg: 16 });
  for (let i = 1; i < 3; i++) k.torus(0.56, 0.03, 0x01579b, tx, ty + (i * th) / 3, tz, { rx: PI / 2, seg: 16 });
  k.ball(0.55, 0x0288d1, tx, ty + th, tz, { sy: 0.4, seg: 16, rows: 6 });
  k.box(0.12, th * 0.75, 0.05, gauge, tx - 0.39, ty + th / 2, tz + 0.39, { ry: -PI / 4 });
  for (const sx of [-0.1, 0.1]) k.box(0.03, th + 1.0, 0.03, 0xb0bec5, tx + 0.58, 0.3 + (th + 1.0) / 2, tz + sx);
  for (let i = 0; i < 6; i++) k.box(0.03, 0.03, 0.2, 0xb0bec5, tx + 0.58, 0.5 + (i * (th + 0.8)) / 6, tz);
  k.tube([[tx - 0.3, ty, tz + 0.3], [tx - 0.6, 0.5, tz + 0.8], [tx - 1.0, 0.33, tz + 1.0]], 0.06, 0x37474f, { sides: 6 });
  k.torus(0.12, 0.025, 0xd32f2f, tx - 0.5, 0.65, tz + 0.75, { seg: 10, ry: 0.6 });
  if (level >= 1) {
    // Hose reel on a stand
    k.cyl(0.32, 0.36, 0xd32f2f, -1.8, 0.75, -1.7, { axis: 'x', seg: 14 });
    k.cyl(0.36, 0.04, 0x8e1c1c, -1.98, 0.75, -1.7, { axis: 'x', seg: 14 });
    k.cyl(0.36, 0.04, 0x8e1c1c, -1.62, 0.75, -1.7, { axis: 'x', seg: 14 });
    for (const sx of [-1, 1]) k.box(0.05, 0.5, 0.05, DARK, -1.8 + sx * 0.22, 0.5, -1.7);
    k.tube([[-1.8, 0.45, -1.4], [-1.4, 0.32, -0.9], [-1.0, 0.32, -1.2]], 0.04, 0xfbc02d, { sides: 4 });
  }
  if (level >= 2) for (const z of [1.3, 1.95]) drum(k, -1.75, 0.3, z, 0x4fc3f7, 0xfafafa);
  k.done();

  const big = level >= 4;
  const hl = [0, 1, 2, 4, 5][level];
  const { heli, muzzles } = makeHeli(u, hl, true, { color: big ? 0x01579b : 0xfafafa, trim: big ? 0x40c4ff : 0x0288d1 });
  const bank = heli.userData.bank;
  bank.scale.setScalar([0.9, 0.97, 1.05, 1.15, 1.3][level]);
  // Belly tank with a glowing water band and a dump door
  const b = kit(u, bank, `splashBelly${big}`);
  b.box(1.6, 0.8, 2.4, big ? 0x0288d1 : 0x1e88e5, 0, -1.6, 0.2, { r: 0.25 });
  b.box(1.62, 0.15, 0.6, water, 0, -1.45, 0.2);
  b.box(0.9, 0.04, 1.2, 0x01579b, 0, -2.01, 0.1);
  for (const sx of [-1, 1]) b.box(0.08, 0.5, 0.1, DARK, sx * 0.5, -1.05, -0.4);
  b.done();
  // Water cannon under the nose
  const cannon = new THREE.Group();
  cannon.position.set(0, -1.6, 2.2);
  bank.add(cannon);
  const nl = 1.4 + level * 0.25;
  const cn = kit(u, cannon, `splashCannon${level}`);
  cn.ball(0.42, 0x37474f, 0, 0, 0, { seg: 12, rows: 8 });
  cn.cyl(0.2, nl, 0xb0bec5, 0, 0, 0.3 + nl / 2, { axis: 'z', r2: 0.14, seg: 10 });
  for (const f of [0.3, 0.65]) cn.torus(0.2, 0.035, DARK, 0, 0, 0.3 + nl * f, { seg: 10 });
  cn.cyl(0.24, 0.15, water, 0, 0, 0.4 + nl, { axis: 'z', seg: 12 });
  cn.done();
  const m = new THREE.Object3D();
  m.position.set(0, 0, 0.6 + nl);
  cannon.add(m);
  u.plane = heli;
  u.heli = true;
  u.muzzles = [m, ...muzzles];
  u.spin = u.spin ?? null;
  u.flyHeight = 13;
  u.tracer = 0x4fc3f7;
  u.tracerWidth = 0.4 + level * 0.08;
  return u;
}

// ------------------------------------------------------------------ Lemonade Cat

/** The Lemonade Cat: a grey-and-white cat in a yellow shirt with sleepy eyes, holding a lemon slice. */
function lemonCat(u, parent, x, y, z, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  parent.add(g);
  const k = kit(u, g, 'lemonCat');
  const GREY = 0x9e9e9e;
  const WHITE = 0xfafafa;
  const YEL = 0xfdd835;
  const PINK = 0xf48fb1;
  k.box(1.0, 1.0, 0.8, YEL, 0, 0.5, 0, { r: 0.2 });
  k.box(0.5, 0.55, 0.06, WHITE, 0, 0.55, 0.4, { r: 0.03 });
  for (const sx of [-0.25, 0.25]) k.ball(0.18, WHITE, sx, 0.1, 0.38, { sy: 0.6, sz: 1.2, seg: 8, rows: 6 });
  k.box(1.1, 0.9, 0.9, GREY, 0, 1.45, 0, { r: 0.25 });
  for (const sx of [-0.25, 0, 0.25]) k.box(0.12, 0.04, 0.5, 0x757575, sx, 1.9, -0.1);
  k.ball(0.32, WHITE, 0, 1.28, 0.38, { sy: 0.6, sz: 0.5, seg: 10, rows: 7 });
  k.ball(0.07, PINK, 0, 1.42, 0.55, { sy: 0.7, seg: 6, rows: 4 });
  for (const sx of [-1, 1]) {
    k.box(0.26, 0.06, 0.05, 0x212121, sx * 0.26, 1.6, 0.46);
    k.box(0.3, 0.09, 0.05, 0x757575, sx * 0.26, 1.67, 0.47);
    for (const rz of [-0.12, 0.12]) k.box(0.42, 0.02, 0.02, 0xeeeeee, sx * 0.48, 1.3 + rz * 0.5, 0.48, { rz: sx * rz });
    k.cyl(0.22, 0.42, GREY, sx * 0.36, 2.05, 0, { r2: 0.02, seg: 4, rz: -sx * 0.3, flat: true });
    k.cyl(0.12, 0.26, PINK, sx * 0.36, 2.02, 0.08, { r2: 0.01, seg: 4, rz: -sx * 0.3, flat: true });
  }
  k.tube([[0.4, 0.2, -0.38], [0.62, 0.55, -0.6], [0.55, 1.05, -0.7], [0.35, 1.25, -0.6]], 0.1, GREY, { sides: 6 });
  k.ball(0.11, WHITE, 0.35, 1.27, -0.58, { seg: 6, rows: 5 });
  // Arm holding a lemon slice
  k.cyl(0.13, 0.6, YEL, -0.62, 0.85, 0.25, { rx: -0.8, seg: 8 });
  k.cyl(0.3, 0.08, 0xfbc02d, -0.66, 1.1, 0.55, { axis: 'z', seg: 14 });
  k.cyl(0.25, 0.09, 0xfff59d, -0.66, 1.1, 0.56, { axis: 'z', seg: 14 });
  for (let i = 0; i < 3; i++) k.box(0.48, 0.015, 0.1, 0xfbc02d, -0.66, 1.1, 0.57, { rz: (i * PI) / 3 });
  k.done();
  return g;
}

/** A lemonade jug standing on y: pale body, white lid and spout, a handle and a lemon label. */
function jug(k, x, y, z, s = 1) {
  k.cyl(0.3 * s, 0.8 * s, 0xfff176, x, y + 0.4 * s, z, { r2: 0.27 * s, seg: 14 });
  k.cyl(0.28 * s, 0.12 * s, 0xfafafa, x, y + 0.86 * s, z, { seg: 14 });
  k.cyl(0.06 * s, 0.2 * s, 0xfafafa, x - 0.2 * s, y + 0.8 * s, z + 0.15 * s, { rz: 0.6, seg: 6 });
  k.torus(0.2 * s, 0.04 * s, 0xfafafa, x + 0.3 * s, y + 0.45 * s, z, { arc: PI, rz: -PI / 2, seg: 10 });
  k.ball(0.12 * s, 0xfbc02d, x, y + 0.45 * s, z + 0.29 * s, { sz: 0.3, sx: 1.3, seg: 8, rows: 5 });
}

/** A paper cup with a straw. */
function cup(k, x, y, z) {
  k.cyl(0.08, 0.26, 0xfff59d, x, y + 0.13, z, { r2: 0.11, seg: 10 });
  k.cyl(0.02, 0.3, 0xe53935, x + 0.03, y + 0.3, z, { rz: -0.25, seg: 5 });
}

/** A striped awning `w` wide and `d` deep, its middle at (x, y, z), its front edge tipped down by `tilt`, with a scalloped edge. */
function awning(k, w, d, x, y, z, tilt = 0.3) {
  const n = Math.max(4, Math.round(w / 0.45));
  const sw = w / n;
  const fy = y - (d / 2) * Math.sin(tilt);
  const fz = z + (d / 2) * Math.cos(tilt);
  for (let i = 0; i < n; i++) {
    const col = i % 2 ? 0xfafafa : 0xfdd835;
    const sx = x - w / 2 + sw * (i + 0.5);
    k.box(sw, 0.08, d, col, sx, y, z, { rx: tilt });
    k.cyl(sw / 2, 0.05, col, sx, fy - 0.04, fz, { axis: 'z', seg: 10 });
  }
  k.cyl(0.04, w + 0.1, 0xb0bec5, x, y - (d / 2) * Math.sin(-tilt), z - (d / 2) * Math.cos(tilt), { axis: 'x', seg: 6 });
}

/**
 * Lemonade Cat (income): the cat sells lemonade. Lv 0 on a crate with a jug, Lv 1 a striped stand,
 * Lv 2 a yellow kiosk (from Lv 1 the cat stands out front), Lv 3 a bigger shop with a glowing lemon sign, Lv 4 a round lemon tower on
 * the roof topped by a giant glowing lemon that slowly turns.
 */
export function makeLemonade(level) {
  level = lv(level, 4);
  const u = makeThing();
  const glowLemon = glowMat(u, 0xffee58);
  const k = kit(u, u.body, `lemonade${level}`);
  const GRASS = 0x7cb342;
  k.slab(4.4, 0.3, 4.4, GRASS, 0, 0.15, 0, { tw: 0.97, td: 0.97 });
  for (const [x, z, c] of [[-1.9, 1.9, 0xfff176], [1.8, -1.9, 0xfafafa], [1.95, 1.2, 0xfff176], [-1.95, -1.4, 0xfafafa]]) {
    for (let i = 0; i < 3; i++) k.cyl(0.05, 0.25, tone(GRASS, 0.8), x + (i - 1) * 0.1, 0.42, z + (i % 2) * 0.08, { r2: 0.0, seg: 4, rz: (i - 1) * 0.3 });
    k.ball(0.07, c, x, 0.56, z, { seg: 6, rows: 4 });
  }
  if (level === 0) {
    // A crate for a counter, a jug and a cardboard sign
    crate(k, 0, 0.75, 0, 1.4, 0.9, 1.2, WOOD);
    jug(k, 1.3, 0.3, 0.6);
    k.box(0.06, 0.8, 0.06, 0x6d4c41, -1.3, 0.7, 0.85);
    k.box(0.9, 0.7, 0.05, 0xd7ccc8, -1.3, 0.95, 0.9, { rx: -0.2 });
    lemon(k, -1.3, 0.97, 0.96, 0.3, 0xfbc02d);
    k.done();
    lemonCat(u, u.body, 0, 1.2, 0, 1);
    return u;
  }
  if (level === 1) {
    // A small stand: striped counter, wooden top, posts, an awning, a sign board, cups and a jug
    k.box(3.0, 1.2, 0.9, 0xfafafa, 0, 0.9, 0.8, { r: 0.04 });
    for (let i = 0; i < 5; i++) k.box(0.3, 1.2, 0.04, 0xfdd835, -1.2 + i * 0.6, 0.9, 1.26);
    k.box(3.2, 0.12, 1.1, WOOD, 0, 1.56, 0.8, { r: 0.03 });
    for (const x of [-1.45, 1.45]) for (const z of [0.5, 1.2]) k.cyl(0.07, 3.0, WOOD, x, 1.8, z, { seg: 8 });
    awning(k, 3.3, 1.1, 0, 3.4, 1.0, 0.25);
    k.box(1.6, 0.4, 0.06, 0xfdd835, 0, 3.75, 0.5, { r: 0.03 });
    lemon(k, 0, 3.75, 0.55, 0.28, 0xfbc02d);
    jug(k, 1.0, 1.62, 0.8, 0.9);
    for (const x of [-1.0, -0.65]) cup(k, x, 1.62, 0.9);
    k.done();
    lemonCat(u, u.body, -0.5, 0.3, 1.75, 0.8);
    return u;
  }
  // Kiosk / shop: a lemon-yellow building with a serving window, the cat on the ledge
  const big = level >= 3;
  const W = big ? 4.0 : 3.4;
  const H = big ? 3.4 : 2.8;
  const D = big ? 3.0 : 2.6;
  const wz = big ? -0.5 : -0.4;
  const front = wz + D / 2;
  const WALL = 0xfff176;
  k.box(W, H, D, WALL, 0, 0.3 + H / 2, wz, { r: 0.08 });
  k.box(W + 0.06, 0.3, D + 0.06, 0xfafafa, 0, 0.45, wz, { r: 0.04 });
  for (const sx of [-1, 1]) k.box(0.2, H, 0.2, 0xfafafa, sx * (W / 2 - 0.02), 0.3 + H / 2, front - 0.02, { r: 0.04 });
  const wy = 0.3 + H * 0.6;
  k.box(W * 0.6, 1.3, 0.05, 0x3e2723, 0, wy, front + 0.01);
  k.box(W * 0.6 + 0.16, 0.08, 0.1, 0xfafafa, 0, wy + 0.69, front + 0.03);
  for (const sx of [-1, 1]) k.box(0.08, 1.4, 0.1, 0xfafafa, sx * (W * 0.3 + 0.04), wy, front + 0.03);
  k.box(W * 0.7, 0.16, 0.9, WOOD, 0, wy - 0.75, front + 0.4, { r: 0.03 });
  for (const sx of [-1, 1]) k.box(0.08, 0.35, 0.5, WOOD, sx * W * 0.3, wy - 0.95, front + 0.2, { rx: 0.5 });
  awning(k, W * 0.8, 1.2, 0, wy + 0.95, front + 0.55, 0.3);
  k.slab(W + 0.4, 0.3, D + 0.4, 0xfbc02d, 0, 0.45 + H, wz, { tw: 0.95, td: 0.95 });
  k.box(W + 0.44, 0.08, D + 0.44, 0xfafafa, 0, 0.32 + H, wz);
  const ledge = wy - 0.67;
  jug(k, W * 0.25, ledge, front + 0.45, 0.75);
  cup(k, W * 0.25 + 0.4, ledge, front + 0.5);
  lemon(k, W * 0.36, 0.3 + H * 0.25, front + 0.06, 0.55, 0xfbc02d);
  // Chalkboard price list beside the shop
  const bx = -W / 2 - 0.35;
  for (const sx of [-1, 1]) k.box(0.05, 1.0, 0.05, WOOD, bx, 0.75, front + 0.2 + sx * 0.2, { rx: sx * 0.15 });
  k.box(0.06, 0.7, 0.55, 0x263238, bx + 0.04, 0.95, front + 0.2);
  for (let i = 0; i < 3; i++) k.box(0.02, 0.04, 0.35 - i * 0.06, 0xeeeeee, bx + 0.08, 1.12 - i * 0.15, front + 0.2);
  if (level === 2) {
    // A small lemon on a pole on the roof
    k.cyl(0.05, 0.6, WOOD, 0, 0.9 + H, wz, { seg: 6 });
    lemon(k, 0, 1.4 + H, wz, 0.55);
    k.done();
    lemonCat(u, u.body, 0.3, 0.3, front + 0.95, 0.8);
    return u;
  }
  // Crate of lemons beside the shop
  crate(k, -1.5, 0.6, front + 0.6, 1.0, 0.6, 0.8, WOOD);
  for (const [x, z] of [[-1.75, 0], [-1.5, 0.1], [-1.25, -0.05], [-1.6, -0.2], [-1.35, 0.2]]) lemon(k, x, 1.0, front + 0.6 + z, 0.2);
  if (level === 3) {
    // A big glowing lemon sign on two posts
    for (const x of [-0.6, 0.6]) k.cyl(0.07, 0.9, WOOD, x, 1.05 + H, wz, { seg: 6 });
    k.box(1.6, 0.08, 0.1, WOOD, 0, 1.45 + H, wz);
    lemon(k, 0, 2.1 + H, wz, 1.0, glowLemon);
    k.done();
    lemonCat(u, u.body, 0.3, 0.3, front + 0.95, 0.85);
    return u;
  }
  // Lv 4: a round striped tower on the roof with glowing windows, and a giant turning lemon
  const T = 4.6;
  const base = 0.6 + H;
  k.cyl(1.1, T, WALL, 0, base + T / 2, wz, { seg: 20 });
  for (let i = 0; i < 3; i++) k.torus(1.11, 0.1, 0xfafafa, 0, base + 0.9 + i * 1.4, wz, { rx: PI / 2, seg: 20 });
  for (let i = 0; i < 3; i++) {
    k.cyl(0.3, 0.08, glowMat(u, 0xffe082), 0, base + 1.55 + i * 1.4, wz + 1.08, { axis: 'z', seg: 12 });
    k.torus(0.3, 0.04, 0xfafafa, 0, base + 1.55 + i * 1.4, wz + 1.12, { seg: 12 });
  }
  k.cyl(1.35, 0.3, 0xfbc02d, 0, base + T + 0.15, wz, { seg: 20 });
  k.torus(1.3, 0.05, 0xfafafa, 0, base + T + 0.32, wz, { rx: PI / 2, seg: 20 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    k.ball(0.08, glowMat(u, i % 2 ? 0xffffff : 0xfff176), Math.cos(a) * 2.2, base + 1.5 + (i % 3) * 1.6, wz + Math.sin(a) * 2.2, { seg: 6, rows: 4 });
  }
  k.done();
  lemonCat(u, u.body, 0.3, 0.3, front + 0.95, 0.85);
  const top = spinner(u, u.body, 0, base + T + 1.3, wz, 'y');
  const t = kit(u, top, 'lemonTop');
  lemon(t, 0, 0, 0, 1.3, glowLemon);
  t.done();
  u.idleSpin = 0.8;
  return u;
}
