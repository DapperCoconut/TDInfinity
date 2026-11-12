// Tower models: machines, batch 5 (rebuilt with the vehicle kit in ../vehicles.js).
// In here: Buccaneer, Broadcaster, Stasis, Glowup, Glacier, Enforcement Base, Submerge, Marauder.
// Each makeX(level) builds one tower's look; TOWER_MODELS in ../models.js says which tower uses which.

import * as THREE from 'three';
import { VEHICLE_UNITS } from '../vehicleunits.js';
import { antenna, barrel, bolts, crate, glowMat, hatch, kit, lamp, louvres, PARTS, star, tone, wheel } from '../vehicles.js';
import { clearMat, gunMuzzle, makeThing } from './bits.js';
import { dish, pad } from './machines1.js';
import { drum, flagPole, windowAt } from './machines2.js';
import { hull } from './machines3.js';

const { STEEL, GUN, DARK, GLASS } = PARTS;
const PI = Math.PI;
const GOLD = 0xffc107;
const CONCRETE = 0x9e9e9e;
const HAZARD = 0xf2c12e;
const IRON = 0x212121;

export const lv = (level, max = 5) => Math.max(0, Math.min(max, level | 0));

// ------------------------------------------------------------------ small shared pieces

/** A regular outline with `n` corners and radius r, as [[x, z], ...]. */
export function poly(n, r, turn = PI / n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2 + turn;
    out.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return out;
}

/** A lumpy outline: like poly, but each corner pushed in or out a little (ice blocks, rocks). */
function lumpy(n, r, seed = 1) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2;
    const f = 1 + Math.sin(i * 2.7 + seed) * 0.09 + Math.cos(i * 1.3 + seed * 2) * 0.05;
    out.push([Math.cos(a) * r * f, Math.sin(a) * r * f]);
  }
  return out;
}

/** A long rounded outline [[x, z], ...] along z: `w` wide, `len` long (a submarine's sail). */
function stadium(w, len) {
  const r = w / 2;
  const out = [];
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * PI;
    out.push([Math.cos(a) * r, len / 2 - r + Math.sin(a) * r]);
  }
  for (let i = 0; i <= 6; i++) {
    const a = PI + (i / 6) * PI;
    out.push([Math.cos(a) * r, -len / 2 + r + Math.sin(a) * r]);
  }
  return out;
}

/** A see-through material that stays see-through when the tower fades (fields, domes). */
export function seeThrough(u, color, opacity, lit = false) {
  const m = lit ? glowMat(u, color) : u.M(color);
  m.transparent = true;
  m.opacity = opacity;
  m.depthWrite = false;
  m.userData.keepOpacity = opacity;
  return m;
}

/** A spinning group at (x, y, z) on `parent` whose spin axis is `axis` ('y', 'x' or 'z'). Spins with u.spin. */
export function spinner(u, parent, x, y, z, axis = 'y') {
  const mount = new THREE.Group();
  mount.position.set(x, y, z);
  if (axis === 'x') mount.rotation.z = -PI / 2;
  if (axis === 'z') mount.rotation.x = PI / 2;
  parent.add(mount);
  const g = new THREE.Group();
  mount.add(g);
  (u.spin ??= []).push(g);
  return g;
}

/**
 * A crystal standing on (x, y, z): two six-sided cones point to point, `h` tall. It leans by
 * `lean` toward the direction `dir` (an angle round y; 0 = +x).
 */
export function crystal(k, x, y, z, r, h, col, lean = 0, dir = 0) {
  const dx = Math.sin(lean) * Math.cos(dir);
  const dy = Math.cos(lean);
  const dz = Math.sin(lean) * Math.sin(dir);
  const o = { seg: 6, flat: true, rz: -lean, ry: -dir };
  k.cyl(0, h * 0.38, col, x + dx * h * 0.19, y + dy * h * 0.19, z + dz * h * 0.19, { ...o, r2: r });
  k.cyl(r, h * 0.62, col, x + dx * h * 0.69, y + dy * h * 0.69, z + dz * h * 0.69, { ...o, r2: 0 });
}

/** A straight round bar from a to b ([x, y, z]): struts, braces, guy wires. */
export const strut = (k, a, b, r, col) => k.tube([a, b], r, col, { sides: 5, seg: 1 });

/** A wooden powder keg standing on y: bulging staves and two iron hoops. */
function keg(k, x, y, z, s = 1, col = 0x8d6e63) {
  k.cyl(0.27 * s, 0.36 * s, col, x, y + 0.18 * s, z, { r2: 0.32 * s, seg: 12 });
  k.cyl(0.32 * s, 0.36 * s, col, x, y + 0.54 * s, z, { r2: 0.27 * s, seg: 12 });
  for (const f of [0.12, 0.6]) k.torus(0.31 * s, 0.025 * s, IRON, x, y + f * s, z, { rx: PI / 2, seg: 12 });
  k.cyl(0.25 * s, 0.03, tone(col, 0.8), x, y + 0.72 * s, z, { seg: 12 });
}

/** A little skull facing +z (pirate flags and sails): a cranium, two eye holes and a jaw. */
function skull(k, x, y, z, s, col = 0xfafafa, ry = 0) {
  const c = Math.cos(ry);
  const sn = Math.sin(ry);
  k.ball(0.22 * s, col, x, y + 0.05 * s, z, { sz: 0.45, seg: 10, rows: 7, ry });
  k.box(0.26 * s, 0.14 * s, 0.08 * s, col, x, y - 0.14 * s, z, { ry });
  for (const ex of [-0.08, 0.08]) k.box(0.08 * s, 0.07 * s, 0.04, 0x111111, x + ex * s * c, y + 0.02 * s, z - ex * s * sn + 0.1 * s * c, { ry });
  for (const rz of [-0.7, 0.7]) k.box(0.6 * s, 0.07 * s, 0.05, col, x, y - 0.32 * s, z - 0.02, { ry, rz }); // crossbones
}

// ------------------------------------------------------------------ Buccaneer

/**
 * Buccaneer (water): a wooden pirate ship with broadside cannons (muzzles at the cannon mouths)
 * and square sails. Bigger ship and more cannons each level, Lv 2 a figurehead and a bow chaser,
 * Lv 3 a second mast and a crow's nest, Lv 4 powder kegs on deck, Lv 5 a big dark galleon with
 * gold trim, three masts with black skull sails and lanterns.
 */
export function makeBuccaneer(level) {
  level = lv(level);
  const u = makeThing();
  const gal = level >= 5;
  const L = [4.6, 5.2, 5.8, 6.4, 7.0, 8.4][level];
  const W = [2.0, 2.2, 2.4, 2.6, 2.8, 3.3][level];
  const hh = [1.0, 1.1, 1.2, 1.3, 1.4, 1.8][level];
  const WOOD = gal ? 0x2b1d14 : 0x6d4c41;
  const PLANK = gal ? 0x4a3424 : 0xa1887f;
  const trim = gal ? glowMat(u, GOLD, 0.45) : 0xd7b98a;
  const SAIL = gal ? 0x1c1c1c : 0xf5ecd6;
  const zc = -0.3;
  const dy = hh - 0.4;
  const bow = W * 0.8;
  const key = `bucc${level}`;
  const k = kit(u, u.body, key);
  hull(k, L, W, -0.45, dy, WOOD, { z: zc, bow, stripe: gal ? 0x111111 : 0x3e2723, deck: PLANK, rail: false });
  // Plank seams down the straight sides, a painted band at the gun deck and the bulwarks on top
  const sLen = L - bow - 0.35;
  const sMid = zc + (0.35 - bow) / 2;
  for (const sx of [-1, 1]) {
    for (const y of [0.05, dy - 0.45, dy + 0.12]) k.box(0.03, 0.04, sLen, tone(WOOD, 0.7), sx * (W / 2 + 0.005), y, sMid);
    k.box(0.03, 0.42, sLen, gal ? IRON : 0x8d1c1c, sx * (W / 2 + 0.01), dy - 0.15, sMid);
    k.box(0.14, 0.45, sLen + 0.2, WOOD, sx * (W / 2 - 0.07), dy + 0.22, sMid);
    k.box(0.22, 0.06, sLen + 0.2, trim, sx * (W / 2 - 0.07), dy + 0.47, sMid);
  }
  // Bow bulwarks closing in to the stem, and the bowsprit
  for (const sx of [-1, 1]) {
    const a = Math.atan2(W / 2, bow);
    const len = Math.hypot(W / 2, bow) * 0.9;
    k.box(0.12, 0.45, len, WOOD, sx * W * 0.24, dy + 0.22, zc + L / 2 - bow / 2, { ry: -sx * a });
  }
  k.cyl(0.11, 2.2, WOOD, 0, dy + 0.75, zc + L / 2 + 0.75, { axis: 'z', r2: 0.05, rx: -0.35, seg: 8 });
  if (level >= 2) {
    // Figurehead: a gilded mermaid-ish shape under the bowsprit
    k.ball(0.22, trim, 0, dy - 0.05, zc + L / 2 + 0.1, { sz: 1.6, seg: 8, rows: 6 });
    k.ball(0.14, trim, 0, dy + 0.22, zc + L / 2 + 0.25, { seg: 8, rows: 6 });
  }
  // Sterncastle: a raised deck with gallery windows, a rail of balusters and the ship's wheel
  const sh = [0.8, 0.9, 1.0, 1.1, 1.2, 1.6][level];
  const sz = zc - L / 2 + 0.85;
  k.box(W, sh, 1.7, WOOD, 0, dy + sh / 2, sz, { r: 0.05 });
  k.slab(W + 0.2, 0.14, 1.85, trim, 0, dy + sh + 0.07, sz - 0.05, { tw: 0.96 });
  const win = gal ? glowMat(u, 0xffb300, 0.9) : 0xffe082;
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * W * 0.28;
    k.box(0.36, 0.34, 0.05, tone(WOOD, 0.6), x, dy + sh * 0.45, sz - 0.86);
    k.box(0.28, 0.26, 0.04, win, x, dy + sh * 0.45, sz - 0.885);
    k.box(0.02, 0.26, 0.05, tone(WOOD, 0.6), x, dy + sh * 0.45, sz - 0.9);
  }
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 5; i++) k.cyl(0.035, 0.32, PLANK, sx * (W / 2 - 0.08), dy + sh + 0.3, sz - 0.75 + i * 0.37, { seg: 5 });
    k.box(0.06, 0.05, 1.7, trim, sx * (W / 2 - 0.08), dy + sh + 0.47, sz - 0.02);
  }
  const wz = sz + 0.9;
  k.cyl(0.05, 0.5, tone(WOOD, 0.8), 0, dy + sh - 0.1, wz - 0.05, { seg: 6 });
  k.torus(0.28, 0.03, trim, 0, dy + sh + 0.25, wz, { seg: 14 });
  for (let i = 0; i < 4; i++) k.box(0.68, 0.035, 0.035, tone(WOOD, 1.2), 0, dy + sh + 0.25, wz, { rz: (i * PI) / 4 });
  if (gal || level >= 3) {
    // Stern lantern on a bracket
    k.box(0.06, 0.06, 0.4, IRON, 0, dy + sh + 0.55, sz - 0.95);
    k.cyl(0.13, 0.28, gal ? glowMat(u, 0xffab00) : glowMat(u, 0xffd54f, 0.6), 0, dy + sh + 0.4, sz - 1.1, { seg: 8 });
    k.cyl(0.15, 0.08, IRON, 0, dy + sh + 0.58, sz - 1.1, { r2: 0.05, seg: 8 });
  }
  // Masts with yards, billowing square sails and shrouds
  const mastH = [3.4, 3.8, 4.2, 4.6, 5.0, 6.4][level];
  const masts = gal ? [L * 0.22, -L * 0.05, -L * 0.3 + 0.3] : level >= 3 ? [L * 0.15, -L * 0.2] : [0];
  const heights = masts.map((_, i) => mastH * (masts.length === 3 && i === 1 ? 1.1 : i === 0 ? 1 : 0.9));
  masts.forEach((mz, i) => {
    const mh = heights[i];
    const z = zc + mz;
    k.cyl(0.15, mh, WOOD, 0, dy + mh / 2, z, { r2: 0.09, seg: 8 });
    k.cyl(0.2, 0.18, tone(WOOD, 0.7), 0, dy + 0.09, z, { seg: 8 }); // partners
    for (const [f, w] of [[0.42, 1.0], [0.76, 0.78]]) {
      const yy = dy + mh * f;
      const sw = W * w;
      const sH = mh * 0.3;
      k.cyl(0.06, sw + 0.5, WOOD, 0, yy + sH / 2 + 0.06, z, { axis: 'x', seg: 6 }); // yard
      k.box(sw, sH, 0.05, SAIL, 0, yy, z + 0.14, { rx: -0.08 });
      k.box(sw * 0.82, sH * 0.8, 0.08, SAIL, 0, yy - 0.02, z + 0.2, { rx: -0.08, r: 0.03 }); // belly of the sail
      k.box(sw, 0.04, 0.07, tone(SAIL, 0.75), 0, yy - sH / 2, z + 0.18); // foot rope
      if (gal && f < 0.5) skull(k, 0, yy, z + 0.26, 1.3 + (i === 1 ? 0.3 : 0), 0xeeeeee);
      else if (!gal && level >= 4 && f < 0.5) k.box(sw * 0.2, sH * 0.6, 0.09, 0xc62828, 0, yy, z + 0.2); // red stripe
    }
    for (const sx of [-1, 1]) for (const dz of [-0.35, 0.1]) strut(k, [sx * (W / 2 - 0.08), dy + 0.45, z + dz], [sx * 0.08, dy + mh * 0.88, z], 0.018, 0x3e2723);
    if (gal) k.box(0.5, 0.5, 0.08, trim, 0, dy + mh * 0.92, z + 0.12); // gold crest
  });
  strut(k, [0, dy + heights[0] * 0.9, zc + masts[0]], [0, dy + 1.1, zc + L / 2 + 1.7], 0.02, 0x3e2723); // forestay
  // The Jolly Roger at the top of the first mast, waving aft
  const fy = dy + heights[0] - 0.2;
  const fz = zc + masts[0];
  for (let i = 0; i < 3; i++) k.box(0.04, 0.6, 0.36, 0x111111, Math.sin(i * 1.6) * 0.05, fy, fz - 0.25 - i * 0.34, { ry: i % 2 ? 0.2 : -0.2 });
  skull(k, 0.04, fy + 0.02, fz - 0.6, 0.55, 0xfafafa, PI / 2);
  if (level >= 3) {
    // Crow's nest round the first mast
    const ny = dy + heights[0] * 0.88;
    k.cyl(0.46, 0.38, WOOD, 0, ny, fz, { seg: 12 });
    k.torus(0.46, 0.04, trim, 0, ny + 0.19, fz, { rx: PI / 2, seg: 12 });
  }
  if (level >= 4) {
    // Powder kegs and a pile of cannonballs on deck
    const spots = gal ? [[0.6, -L * 0.15], [-0.6, -L * 0.18], [0.62, -L * 0.18 - 0.62]] : [[0.5, -L * 0.12]];
    for (const [x, z] of spots) keg(k, x, dy, zc + z);
    for (const [x, y, z] of [[-0.45, 0.1, 0], [-0.25, 0.1, 0], [-0.35, 0.1, 0.18], [-0.35, 0.25, 0.06]]) k.ball(0.1, IRON, x, dy + y, zc + L * 0.05 + z, { seg: 8, rows: 5 });
  }
  if (gal) for (const z of [zc + L / 2 - bow - 0.1, zc + L * 0.02]) {
    // Lanterns on posts along the rail
    for (const sx of [-1, 1]) {
      k.cyl(0.04, 0.7, IRON, sx * (W / 2 - 0.1), dy + 0.8, z, { seg: 5 });
      k.cyl(0.12, 0.26, glowMat(u, 0xffab00), sx * (W / 2 - 0.1), dy + 1.25, z, { seg: 8 });
      k.cyl(0.14, 0.08, IRON, sx * (W / 2 - 0.1), dy + 1.42, z, { r2: 0.04, seg: 8 });
    }
  }
  // Broadside cannons poking out of gun ports with their lids swung up
  const n = [1, 2, 2, 3, 3, 4][level];
  const span = L * 0.55;
  const b = gal ? 1.3 : 1;
  const gy = dy - 0.15;
  for (let i = 0; i < n; i++) {
    const z = zc + (n === 1 ? 0.2 : L * 0.2 - (i / (n - 1)) * span);
    for (const sx of [-1, 1]) {
      k.box(0.06, 0.48 * b, 0.52 * b, 0x0b0b0b, sx * (W / 2 + 0.01), gy, z); // port
      const top = gy + 0.24 * b;
      k.box(0.05, 0.48 * b, 0.56 * b, gal ? IRON : 0x8d1c1c, sx * (W / 2 + 0.2 * b), top + 0.14 * b, z, { rz: -sx * 0.93 }); // lid
      const len = 0.95 * b;
      const x0 = sx * (W / 2 - 0.1);
      k.cyl(sx > 0 ? 0.17 * b : 0.13 * b, len, IRON, x0 + (sx * len) / 2, gy, z, { axis: 'x', r2: sx > 0 ? 0.13 * b : 0.17 * b, seg: 10 });
      k.cyl(0.17 * b, 0.12, gal ? trim : 0x3a3a3a, x0 + sx * (len - 0.06), gy, z, { axis: 'x', seg: 10 }); // muzzle swell
      k.cyl(0.08 * b, 0.02, 0x050505, x0 + sx * (len + 0.005), gy, z, { axis: 'x', seg: 8 });
      gunMuzzle(u, u.body, x0 + sx * (len + 0.1), gy, z);
    }
  }
  if (level >= 2) {
    // Bow chaser: a little cannon on a wheeled carriage on the foredeck
    const cz = zc + L / 2 - bow - 0.1;
    k.box(0.5, 0.22, 0.7, tone(WOOD, 1.2), 0, dy + 0.2, cz, { r: 0.03 });
    for (const sx of [-1, 1]) for (const dz of [-0.22, 0.22]) k.cyl(0.12, 0.08, tone(WOOD, 0.8), sx * 0.27, dy + 0.12, cz + dz, { axis: 'x', seg: 10 });
    barrel(k, 0, dy + 0.42, cz - 0.3, 1.1, 0.13, IRON, { r2: 0.12 });
  }
  k.done();
  if (gal) u.body.position.z = -0.4;
  u.tracer = 0xffab40;
  u.projectile = { color: 0x212121, size: gal ? 0.7 : 0.55 };
  u.static = true;
  u.bob = 0.08;
  return u;
}

// ------------------------------------------------------------------ Broadcaster

/** A microwave dish on a mast: a drum with a white cover, facing `ry`, on an arm from (0, y, mz). */
function mwDish(k, mz, y, reach, r, ry, col = 0xfafafa) {
  const dx = Math.sin(ry);
  const dz = Math.cos(ry);
  const x = dx * reach;
  const z = mz + dz * reach;
  strut(k, [dx * 0.2, y, mz + dz * 0.2], [x - dx * 0.25, y, z - dz * 0.25], 0.05, 0x616161);
  k.cyl(r, r * 0.55, tone(col, 0.85), x, y, z, { axis: 'z', ry, seg: 16 });
  k.cyl(r * 1.04, 0.08, col, x + dx * r * 0.3, y, z + dz * r * 0.3, { axis: 'z', ry, seg: 16 }); // radome
  k.cyl(r * 0.3, 0.2, DARK, x - dx * r * 0.36, y, z - dz * r * 0.36, { axis: 'z', ry, seg: 8 }); // feed box
}

/**
 * Broadcaster: a red and white lattice radio mast by a transmitter hut, with aviation lights and
 * dishes. Taller with another dish each level, Lv 2 panel antennas, Lv 3 guy wires, Lv 4 glowing
 * signal rings that turn round the top, Lv 5 a huge silver mast, a broadcast beacon and a generator.
 */
export function makeBroadcaster(level) {
  level = lv(level);
  const u = makeThing();
  const top = level >= 5;
  const H = [6, 7.5, 9, 10.5, 12, 16][level];
  const RED = top ? 0xb0bec5 : 0xd32f2f;
  const WHITE = 0xeceff1;
  const red = glowMat(u, 0xff1744);
  const signal = glowMat(u, top ? 0x40c4ff : 0x69f0ae);
  const key = `bcast${level}`;
  const k = kit(u, u.body, key);
  const y0 = 0.22;
  pad(k, 5.2, y0, CONCRETE, false);
  // Transmitter hut: rendered block, flat roof with a lip, steel door, ON AIR sign and an AC unit
  const hz = -1.5;
  k.box(3.0, 1.6, 1.7, 0x90a4ae, -0.6, y0 + 0.8, hz, { r: 0.05 });
  k.slab(3.25, 0.16, 1.95, 0x546e7a, -0.6, y0 + 1.68, hz, { tw: 0.96, td: 0.94 });
  k.box(0.75, 1.2, 0.06, 0x455a64, -1.5, y0 + 0.62, hz + 0.86);
  k.box(0.08, 0.05, 0.12, STEEL, -1.25, y0 + 0.6, hz + 0.9);
  windowAt(k, -0.5, y0 + 1.0, hz + 0.86, 0.6, 0.4, 0xcfd8dc);
  k.box(0.75, 0.24, 0.05, DARK, 0.45, y0 + 1.25, hz + 0.86);
  k.box(0.62, 0.15, 0.04, signal, 0.45, y0 + 1.25, hz + 0.89); // ON AIR
  k.box(0.5, 0.6, 0.6, 0xb0bec5, 1.15, y0 + 0.3, hz + 0.4, { r: 0.04 });
  k.torus(0.2, 0.025, DARK, 1.41, y0 + 0.32, hz + 0.4, { ry: PI / 2, seg: 12 });
  k.cyl(0.17, 0.03, 0x37474f, 1.41, y0 + 0.32, hz + 0.4, { axis: 'x', seg: 10 });
  antenna(k, -1.6, y0 + 1.76, hz - 0.4, 1.0);
  // Cable tray from the hut to the mast
  for (const z of [hz + 1.0, hz + 1.5]) k.cyl(0.03, 1.2, DARK, 0.5, y0 + 0.6, z, { seg: 5 });
  k.box(0.3, 0.06, 1.0, STEEL, 0.5, y0 + 1.2, hz + 1.3);
  // The lattice mast: four legs leaning in, ladders of rungs and X braces, red and white bands
  const mz = 0.6;
  const segs = Math.round(H / 1.5);
  const sh = H / segs;
  const half = (y) => 0.75 - ((y - y0) / H) * 0.45;
  const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let i = 0; i < segs; i++) {
    const ya = y0 + i * sh;
    const yb = ya + sh;
    const col = i % 2 ? WHITE : RED;
    const ha = half(ya);
    const hb = half(yb);
    for (let c = 0; c < 4; c++) {
      const [ax, az] = C[c];
      const [bx, bz] = C[(c + 1) % 4];
      strut(k, [ax * ha, ya, mz + az * ha], [ax * hb, yb, mz + az * hb], 0.07, col);
      strut(k, [ax * hb, yb, mz + az * hb], [bx * hb, yb, mz + bz * hb], 0.035, col);
      strut(k, [ax * ha, ya, mz + az * ha], [bx * hb, yb, mz + bz * hb], 0.025, col);
      strut(k, [bx * ha, ya, mz + bz * ha], [ax * hb, yb, mz + az * hb], 0.025, col);
    }
    if (i % 2 === 1) for (const [x, z] of [[-1, 1], [1, 1]]) k.ball(0.1, red, x * hb, yb, mz + z * hb + 0.06, { seg: 6, rows: 4 });
  }
  for (const [x, z] of C) k.box(0.3, 0.12, 0.3, CONCRETE, x * 0.75, y0 + 0.06, mz + z * 0.75); // footings
  const topY = y0 + H;
  k.box(0.7, 0.1, 0.7, DARK, 0, topY + 0.05, mz);
  k.cyl(0.05, 1.5, WHITE, 0, topY + 0.8, mz, { r2: 0.02, seg: 5 }); // whip antenna
  k.ball(0.18, red, 0, topY + 1.6, mz, { seg: 8, rows: 6 });
  // Dishes: one more per level, spiralling up the mast
  for (let i = 0; i <= level; i++) {
    const y = y0 + H * (0.35 + (0.5 * i) / Math.max(1, level));
    mwDish(k, mz, y, half(y) + 0.45, 0.42 + (i % 2) * 0.12 + (top ? 0.18 : 0), i * 2.1 + 0.4);
  }
  if (level >= 2) for (let i = 0; i < 4; i++) {
    // Panel antennas round the top
    const a = (i / 4) * PI * 2;
    const r = half(topY - 1) + 0.18;
    k.box(0.45, 1.3, 0.14, WHITE, Math.sin(a) * r, topY - 1.0, mz + Math.cos(a) * r, { ry: a, r: 0.04 });
  }
  if (level >= 3) for (const [x, z] of C) {
    // Guy wires to anchors in the pad corners, with turnbuckles
    const ax = x * 2.25;
    const az = mz + z * 2.25 - 0.6;
    const hy = y0 + H * 0.62;
    strut(k, [x * half(hy), hy, mz + z * half(hy)], [ax, y0 + 0.2, az], 0.018, 0x424242);
    k.box(0.32, 0.14, 0.32, 0x757575, ax, y0 + 0.07, az);
    k.cyl(0.04, 0.24, STEEL, ax, y0 + 0.28, az, { seg: 5 });
  }
  if (top) {
    // Generator shed with louvres, an exhaust stack and a fuel tank
    k.box(1.4, 1.2, 1.5, 0x607d8b, 1.6, y0 + 0.6, -1.4, { r: 0.05 });
    louvres(k, 1.6, y0 + 1.22, -1.4, 1.1, 1.1, 5);
    k.cyl(0.08, 0.9, DARK, 2.1, y0 + 1.6, -1.8, { seg: 8 });
    k.cyl(0.35, 1.3, 0xeceff1, 1.6, y0 + 0.4, 0.0, { axis: 'z', seg: 14 });
    for (const z of [-0.45, 0.45]) k.box(0.6, 0.25, 0.12, DARK, 1.6, y0 + 0.12, z);
    k.box(0.35, 0.3, 0.05, red, 1.6, y0 + 0.8, -0.63);
  }
  k.done();
  if (level >= 4) {
    // Signal rings (and the Lv 5 beacon) turning round the top of the mast
    const sp = spinner(u, u.body, 0, topY - 0.6, mz);
    const s = kit(u, sp, `${key}:spin`);
    for (let i = 0; i < 2; i++) {
      const r = 1.0 + i * 0.45;
      const tilt = PI / 2 + (i ? -0.18 : 0.18);
      s.torus(r, 0.06, signal, 0, -i * 1.4, 0, { rx: tilt, seg: 28 });
      for (const sx of [-1, 1]) s.ball(0.12, WHITE, sx * r, -i * 1.4, 0, { seg: 6, rows: 4 });
    }
    if (top) {
      s.ball(0.55, signal, 0, 3.0, 0, { seg: 4, rows: 2, flat: true });
      s.torus(1.4, 0.08, signal, 0, 3.0, 0, { rx: PI / 2 + 0.15, seg: 28 });
      s.cyl(0.08, 1.0, WHITE, 0, 2.2, 0, { seg: 6 });
    }
    s.done();
    u.idleSpin = 1;
  }
  gunMuzzle(u, u.body, 0, topY + (top ? 2.4 : 1.6), mz);
  u.tracer = top ? 0x40c4ff : 0x69f0ae;
  u.static = true;
  return u;
}

// ------------------------------------------------------------------ Stasis

/**
 * Stasis: a freeze-field projector on an eight-sided plinth. A glowing crystal core held in three
 * prongs, with cyan rings gyrating round it (spinning up when it fires); one more ring each level,
 * Lv 3 capacitor posts, Lv 4 a dark plinth, Lv 5 a big floating core and a see-through field dome.
 */
export function makeStasis(level) {
  level = lv(level);
  const u = makeThing();
  const cyan = glowMat(u, 0x18ffff);
  const pale = glowMat(u, 0xb2ebf2, 0.6);
  const METAL = level >= 4 ? 0x263238 : 0x546e7a;
  const TRIM = 0xcfd8dc;
  const key = `stasis${level}`;
  const k = kit(u, u.body, key);
  // Plinth: two bevelled steps, glowing vents and a ring slot
  k.plan(poly(8, 2.0), 0.6, METAL, 0, 0, 0, { bevel: 0.08 });
  k.plan(poly(8, 1.5), 0.55, TRIM, 0, 0.6, 0, { bevel: 0.07 });
  k.torus(1.3, 0.05, cyan, 0, 1.16, 0, { rx: PI / 2, seg: 32 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    k.box(0.5, 0.18, 0.05, cyan, c * 1.86, 0.3, s * 1.86, { ry: PI / 2 - a });
    k.box(0.6, 0.04, 0.06, tone(METAL, 0.7), c * 1.87, 0.42, s * 1.87, { ry: PI / 2 - a });
    k.cyl(0.06, 0.06, STEEL, Math.cos(a + 0.39) * 1.3, 1.17, Math.sin(a + 0.39) * 1.3, { seg: 6 });
  }
  // Emitter column: a tapered eight-sided post with glowing coil rings and a collar
  const colH = 1.6 + level * 0.25;
  const cy = 1.15;
  k.cyl(0.46, colH, METAL, 0, cy + colH / 2, 0, { r2: 0.34, seg: 8, flat: true });
  for (let i = 0; i < 2 + Math.min(level, 3); i++) {
    const y = cy + 0.3 + (i * (colH - 0.5)) / (2 + Math.min(level, 3));
    k.torus(0.48 - (0.12 * (y - cy)) / colH, 0.06, i % 2 ? pale : cyan, 0, y, 0, { rx: PI / 2, seg: 16 });
  }
  const top = cy + colH;
  k.cyl(0.4, 0.2, TRIM, 0, top, 0, { r2: 0.55, seg: 16 });
  const big = level >= 5;
  const coreY = top + (big ? 1.6 : 0.9);
  const cs = big ? 1.2 : 0.7 + level * 0.06;
  // Three prongs curving up round the core, with glowing tips
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2 + PI / 6;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const R = cs * 0.75 + 0.15;
    k.tube([[c * 0.4, top + 0.05, s * 0.4], [c * (R + 0.2), coreY - cs * 0.5, s * (R + 0.2)], [c * R, coreY + cs * 0.4, s * R]], 0.07, TRIM, { sides: 6, tension: 0.4 });
    k.ball(0.1, cyan, c * R, coreY + cs * 0.45, s * R, { seg: 6, rows: 4 });
  }
  crystal(k, 0, coreY - cs * 0.7, 0, cs * 0.5, cs * 1.4, cyan);
  if (level >= 3) for (let i = 0; i < 3; i++) {
    // Capacitor posts: ribbed cans with glowing caps and a cable back to the column
    const a = (i / 3) * PI * 2 + PI / 2;
    const x = Math.cos(a) * 1.55;
    const z = Math.sin(a) * 1.55;
    k.cyl(0.24, 1.3, METAL, x, 1.15 + 0.65, z, { seg: 12 });
    for (const f of [0.3, 0.6, 0.9]) k.torus(0.24, 0.03, TRIM, x, 1.15 + f * 1.3, z, { rx: PI / 2, seg: 12 });
    k.cyl(0.18, 0.12, cyan, x, 2.5, z, { seg: 12 });
    k.tube([[x * 0.9, 1.4, z * 0.9], [x * 0.55, 1.25, z * 0.55], [x * 0.25, 1.6, z * 0.25]], 0.04, IRON, { sides: 4 });
  }
  k.done();
  // Rings: each on its own spinner, tilted differently so they gyrate round the core
  const n = level + 1;
  for (let i = 0; i < n; i++) {
    const sp = spinner(u, u.body, 0, coreY, 0);
    sp.rotation.y = i * 1.1;
    const r = 1.1 + i * 0.32 + (big ? 0.3 : 0);
    const tilt = PI / 2 + (i % 2 ? -1 : 1) * (0.3 + i * 0.12);
    const s = kit(u, sp, `stasisR:${r.toFixed(2)}:${i}:${big}`);
    s.torus(r, 0.07 + (big ? 0.03 : 0), i % 2 ? pale : cyan, 0, 0, 0, { rx: tilt, seg: 32 });
    for (const sx of [-1, 1]) {
      s.box(0.24, 0.24, 0.24, TRIM, sx * r, 0, 0, { r: 0.05 });
      s.ball(0.07, cyan, sx * (r + 0.13), 0, 0, { seg: 6, rows: 4 });
    }
    s.done();
  }
  if (big) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3.0, 24, 10, 0, PI * 2, 0, PI / 2), seeThrough(u, 0x84ffff, 0.15, true));
    dome.position.y = 1.15;
    dome.castShadow = false;
    u.body.add(dome);
  }
  gunMuzzle(u, u.body, 0, coreY, 0);
  u.idleSpin = 1.2 + level * 0.2;
  u.tracer = 0x18ffff;
  u.projectile = { color: 0x84ffff, size: 0.6 };
  u.static = true;
  return u;
}

// ------------------------------------------------------------------ Glowup

/** A speaker cabinet facing +z: box, a woofer cone, a horn tweeter and a neon edge on top. */
export function speaker(k, x, y, z, w, h, neon) {
  k.box(w, h, 0.9, 0x15151c, x, y + h / 2, z, { r: 0.05 });
  const r = Math.min(w, h * 0.6) * 0.36;
  const wy = y + h * 0.38;
  k.torus(r, 0.04, 0x37474f, x, wy, z + 0.45, { seg: 16 });
  k.cyl(r, 0.06, 0x2a2a2a, x, wy, z + 0.42, { axis: 'z', seg: 16 });
  k.cyl(r * 0.9, 0.12, 0x1c1c1c, x, wy, z + 0.4, { axis: 'z', r2: r * 0.3, seg: 14 });
  k.ball(r * 0.25, 0x37474f, x, wy, z + 0.47, { seg: 8, rows: 5, sz: 0.5 });
  k.box(w * 0.5, h * 0.16, 0.08, 0x2a2a2a, x, y + h * 0.8, z + 0.44, { r: 0.02 }); // horn
  k.box(w * 0.36, h * 0.06, 0.04, 0x0b0b0b, x, y + h * 0.8, z + 0.48);
  k.box(w + 0.02, 0.07, 0.92, neon, x, y + h, z);
  for (const sx of [-1, 1]) for (const sy of [0.06, 0.94]) k.box(0.08, 0.08, 0.08, STEEL, x + sx * (w / 2 - 0.02), y + h * sy, z + 0.43); // corners
}

/** A square truss from a to b ([x, y, z]), `s` wide: four chords and a zigzag on each face. */
export function truss(k, a, b, s, col) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  const up = Math.abs(d[1]) > Math.abs(d[0]) + Math.abs(d[2]);
  const off = up ? [[s, 0, s], [s, 0, -s], [-s, 0, -s], [-s, 0, s]] : [[0, s, s], [0, s, -s], [0, -s, -s], [0, -s, s]];
  for (const o of off) strut(k, [a[0] + o[0] / 2, a[1] + o[1] / 2, a[2] + o[2] / 2], [b[0] + o[0] / 2, b[1] + o[1] / 2, b[2] + o[2] / 2], 0.045, col);
  const n = Math.max(2, Math.round(len / (s * 1.4)));
  for (let i = 0; i < n; i++) {
    const p = (f, o) => [a[0] + d[0] * f + o[0] / 2, a[1] + d[1] * f + o[1] / 2, a[2] + d[2] * f + o[2] / 2];
    for (let j = 0; j < 4; j++) strut(k, p(i / n, off[j]), p((i + 1) / n, off[(j + 1) % 4]), 0.022, col);
  }
}

/**
 * Glowup: speakers, neon tubes and a spinning disco ball. Lv 1 a second speaker stack, Lv 2 a
 * stage, Lv 3 a neon arch, Lv 4 a truss with spotlights ("Live Show") and a light-up floor,
 * Lv 5 the biggest stage with an LED screen and glowing pillars.
 */
export function makeGlowup(level) {
  level = lv(level);
  const u = makeThing();
  const NEON = [0xff4081, 0x18ffff, 0x76ff03, 0xffea00, 0xe040fb, 0xff6e40];
  const neon = NEON.map((c) => glowMat(u, c));
  const key = `glowup${level}`;
  const k = kit(u, u.body, key);
  const stage = level >= 2;
  const SW = [0, 0, 4.2, 4.8, 5.8, 7.0][level];
  const SD = [0, 0, 3.0, 3.4, 4.0, 4.8][level];
  const sy = stage ? (level >= 4 ? 0.9 : 0.6) : 0;
  if (stage) {
    // Stage deck on a skirt, a neon strip along the front edge and steps up the side
    k.box(SW, sy - 0.08, SD, 0x15151c, 0, (sy - 0.08) / 2, 0);
    k.box(SW + 0.1, 0.1, SD + 0.1, 0x2b2b33, 0, sy - 0.05, 0, { r: 0.03 });
    k.box(SW + 0.12, 0.06, 0.04, neon[level % 6], 0, sy - 0.16, SD / 2 + 0.06);
    for (let i = 0; i < 3; i++) k.box(0.9, sy * (i + 1) / 4, 0.32, 0x2b2b33, SW / 2 - 0.6, (sy * (i + 1)) / 8, SD / 2 + 0.2 + (2 - i) * 0.3);
    if (level >= 4) for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) k.box(SW / 6 - 0.06, 0.04, SD / 4 - 0.06, (i + j) % 2 ? neon[i] : 0x2b2b33, -SW / 2 + (SW / 6) * (i + 1), sy + 0.02, (j - 0.5) * (SD / 4)); // light-up floor
  } else {
    // Road cases and a cable spool on the grass
    crate(k, -0.2, 0.25, 1.2, 0.9, 0.5, 0.6, 0x263238);
    k.cyl(0.4, 0.3, 0x5d4037, 0.9, 0.4, 1.0, { axis: 'x', seg: 14 });
    k.cyl(0.25, 0.32, 0x111111, 0.9, 0.4, 1.0, { axis: 'x', seg: 12 });
  }
  // Speaker stacks: a big cabinet with a smaller one on top
  const spH = [1.6, 1.8, 2.0, 2.4, 2.8, 3.4][level];
  const spX = stage ? SW / 2 - 0.6 : 1.3;
  for (const side of level >= 1 ? [-1, 1] : [-1]) {
    const x = side * spX;
    speaker(k, x, sy, 0, 1.1, spH * 0.62, neon[side > 0 ? 4 : 1]);
    speaker(k, x, sy + spH * 0.62 + 0.07, 0, 0.9, spH * 0.38, neon[side > 0 ? 0 : 3]);
  }
  // Neon tubes with dark caps: more each level
  const bars = level + 1;
  for (let i = 0; i < bars; i++) {
    const x = (i - (bars - 1) / 2) * (stage ? SW / (bars + 1) : 0.6);
    const bh = 1.2 + ((i * 7) % 3) * 0.4 + level * 0.15;
    const z = stage ? -SD / 2 + 0.3 : -0.8;
    k.cyl(0.08, bh, neon[i % 6], x, sy + bh / 2 + 0.1, z, { seg: 8 });
    for (const y of [0.05, bh + 0.15]) k.cyl(0.11, 0.12, 0x2b2b33, x, sy + y, z, { seg: 8 });
  }
  // Pole for the disco ball, on a tripod
  const poleH = [2.4, 2.8, 3.2, 3.6, 4.6, 5.6][level];
  const orbS = [0.8, 0.9, 1.0, 1.2, 1.4, 2.0][level];
  const orbX = level === 0 ? 0.3 : 0;
  k.cyl(0.07, poleH - orbS / 2, 0x616161, orbX, sy + (poleH - orbS / 2) / 2, 0, { seg: 8 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    strut(k, [orbX, sy + 0.9, 0], [orbX + Math.cos(a) * 0.6, sy, Math.sin(a) * 0.6], 0.035, 0x424242);
  }
  if (level >= 3) {
    // Neon arch over the back of the stage, on dark posts
    const archH = poleH + 0.8;
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * PI;
      pts.push([Math.cos(a) * (SW / 2 - 0.15), sy + archH * 0.6 + Math.sin(a) * archH * 0.4, -SD / 2 + 0.15]);
    }
    k.tube(pts, 0.09, neon[4], { sides: 6, seg: 40, tension: 0.5 });
    k.tube(pts.map(([x, y, z]) => [x * 0.9, y - 0.25, z]), 0.06, neon[1], { sides: 6, seg: 40, tension: 0.5 });
    for (const sx of [-1, 1]) k.cyl(0.11, archH * 0.6, 0x2b2b33, sx * (SW / 2 - 0.15), sy + archH * 0.3, -SD / 2 + 0.15, { seg: 8 });
  }
  if (level >= 4) {
    // Live Show: a truss across the front with moving-head spotlights hanging under it
    const tH = poleH + 1.2;
    const tz = SD / 2 - 0.25;
    for (const sx of [-1, 1]) {
      truss(k, [sx * (SW / 2 - 0.2), sy, tz], [sx * (SW / 2 - 0.2), sy + tH, tz], 0.32, 0x9e9e9e);
      k.box(0.6, 0.06, 0.6, 0x424242, sx * (SW / 2 - 0.2), sy + 0.03, tz);
    }
    truss(k, [-SW / 2 + 0.05, sy + tH, tz], [SW / 2 - 0.05, sy + tH, tz], 0.32, 0x9e9e9e);
    const lamps = level >= 5 ? 5 : 3;
    for (let i = 0; i < lamps; i++) {
      const x = (i - (lamps - 1) / 2) * (SW / (lamps + 0.5));
      const ly = sy + tH - 0.55;
      const rx = 0.75;
      k.box(0.5, 0.08, 0.1, 0x2b2b33, x, ly + 0.3, tz); // clamp
      for (const sx of [-1, 1]) k.box(0.05, 0.4, 0.1, 0x2b2b33, x + sx * 0.25, ly + 0.12, tz); // yoke
      k.cyl(0.2, 0.55, 0x15151c, x, ly, tz, { axis: 'z', rx, seg: 12 });
      k.cyl(0.17, 0.04, neon[(i + 1) % 6], x, ly - Math.sin(rx) * 0.29, tz + Math.cos(rx) * 0.29, { axis: 'z', rx, seg: 12 });
    }
  }
  if (level >= 5) {
    // An LED screen with an equaliser on it, and glowing pillars topped with diamonds
    const scY = sy + poleH + 0.2;
    k.box(SW * 0.62, 2.7, 0.22, 0x15151c, 0, scY, -SD / 2 - 0.15, { r: 0.05 });
    k.box(SW * 0.58, 2.45, 0.04, 0x0b0b12, 0, scY, -SD / 2 - 0.03);
    for (let i = 0; i < 9; i++) {
      const bh = [0.6, 1.3, 2.0, 1.1, 1.7, 0.9, 1.4, 1.9, 0.8][i];
      k.box(0.3, bh, 0.04, neon[i % 6], (i - 4) * 0.42, scY - 1.15 + bh / 2, -SD / 2 + 0.0);
    }
    for (const sx of [-1, 1]) {
      const px = sx * (SW / 2 + 0.4);
      const ph = poleH + 3;
      k.cyl(0.32, 0.3, 0x2b2b33, px, 0.15, -SD / 2, { seg: 10 });
      k.cyl(0.14, ph, neon[sx > 0 ? 4 : 1], px, ph / 2, -SD / 2, { seg: 10 });
      for (let j = 1; j < 5; j++) k.torus(0.17, 0.04, 0x2b2b33, px, (ph * j) / 5, -SD / 2, { rx: PI / 2, seg: 12 });
      k.ball(0.45, neon[sx > 0 ? 3 : 0], px, ph + 0.3, -SD / 2, { seg: 4, rows: 2, flat: true });
    }
  }
  k.done();
  // The disco ball: a grey ball covered in mirror tiles, a few of them glowing
  const orb = spinner(u, u.body, orbX, sy + poleH, 0);
  const o = kit(u, orb, `glowupOrb:${orbS}`);
  o.cyl(0.03, 0.4, DARK, 0, orbS / 2 + 0.15, 0, { seg: 5 });
  o.ball(orbS / 2, 0x9ea7ad, 0, 0, 0, { seg: 14, rows: 10 });
  const rows = 6;
  for (let i = 1; i < rows; i++) {
    const lat = (i / rows - 0.5) * PI;
    const per = Math.max(4, Math.round(12 * Math.cos(lat)));
    for (let j = 0; j < per; j++) {
      const lon = (j / per) * PI * 2 + i * 0.3;
      const R = orbS * 0.5;
      const t = orbS * 0.16;
      const glowTile = (i * 5 + j * 3) % 7 === 0;
      o.box(t, t, 0.04, glowTile ? neon[(i + j) % 6] : (i + j) % 2 ? 0xeceff1 : 0xcfd8dc, Math.sin(lon) * Math.cos(lat) * R, Math.sin(lat) * R, Math.cos(lon) * Math.cos(lat) * R, { ry: lon, rx: -lat });
    }
  }
  o.done();
  gunMuzzle(u, orb, 0, 0, 0);
  u.idleSpin = 1.5;
  u.tracer = 0xff4081;
  u.static = true;
  return u;
}

// ------------------------------------------------------------------ Glacier

/**
 * Glacier (cliff): a frost cannon on a block of glacier ice. More crystals round the base every
 * level; Lv 1 icicles, Lv 2 twin barrels, Lv 3 a frost core and crystal spikes on the shoulders,
 * Lv 4 a triple cannon under a crown of glowing crystals and a frosty halo.
 */
export function makeGlacier(level) {
  level = lv(level, 4);
  const u = makeThing();
  const ICE = 0xb3e5fc;
  const DEEP = 0x4fc3f7;
  const SNOW = 0xf5f9ff;
  const frost = glowMat(u, level >= 4 ? 0x84ffff : 0x80deea, 0.6);
  const STEELC = level >= 3 ? 0x546e7a : 0x78909c;
  const key = `glacier${level}`;
  const k = kit(u, u.body, key);
  // The ice block: two lumpy bevelled tiers, a snow cap and dark crevices
  k.plan(lumpy(11, 2.0, 1), 1.2, 0xe1f5fe, 0, 0, 0, { bevel: 0.18 });
  k.plan(lumpy(9, 1.6, 3), 0.62, ICE, 0, 1.15, 0, { bevel: 0.14 });
  k.plan(lumpy(9, 1.42, 3), 0.08, SNOW, 0, 1.74, 0, { bevel: 0.03 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2 + 0.5;
    k.box(0.05, 0.7, 0.2, 0x0277bd, Math.cos(a) * 1.93, 0.55, Math.sin(a) * 1.93, { ry: -a, rz: 0.2 * (i % 2 ? 1 : -1) });
  }
  // A ring of crystals round the base, more each level
  const n = 3 + level * 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2 + 0.3;
    const h = 0.9 + ((i * 7) % 5) * 0.25 + level * 0.1;
    const col = i % 3 === 0 ? DEEP : i % 3 === 1 ? ICE : frost;
    crystal(k, Math.cos(a) * 1.75, 0.7, Math.sin(a) * 1.75, 0.22, h, col, 0.35, a);
    if (i % 2 === 0) crystal(k, Math.cos(a + 0.2) * 1.9, 0.5, Math.sin(a + 0.2) * 1.9, 0.13, h * 0.55, ICE, 0.6, a + 0.2);
  }
  k.done();

  // Turret: a rounded housing on a ring with the barrels pointing +Z
  const t = new THREE.Group();
  t.position.set(0, 1.8, 0);
  u.body.add(t);
  const g = kit(u, t, `${key}:t`);
  g.cyl(1.05, 0.3, DARK, 0, 0.15, 0, { seg: 20 });
  g.torus(1.0, 0.05, STEEL, 0, 0.3, 0, { rx: PI / 2, seg: 20 });
  g.box(1.8, 1.3, 2.1, 0x90a4ae, 0, 1.0, -0.1, { r: 0.18 });
  g.slab(1.95, 0.32, 2.25, ICE, 0, 1.78, -0.1, { tw: 0.85, td: 0.85 }); // frosted roof
  g.ball(0.75, SNOW, -0.2, 1.9, -0.3, { sy: 0.3, seg: 10, rows: 5 });
  g.box(0.95, 0.45, 0.06, frost, 0, 1.25, 0.96); // frost window
  for (const sx of [-1, 1]) {
    g.box(0.06, 0.8, 1.6, tone(0x90a4ae, 0.85), sx * 0.91, 0.95, -0.15);
    bolts(g, [sx * 0.95, 0.6, -0.8], [sx * 0.95, 0.6, 0.5], 4, STEEL);
    louvres(g, sx * 0.5, 1.66, -0.6, 0.5, 0.6, 3);
  }
  // Coolant tank on the back, banded with frost, piped forward to the barrels
  g.cyl(0.5, 1.4, DEEP, 0, 1.0, -1.55, { axis: 'z', seg: 14 });
  for (const f of [-0.45, 0, 0.45]) g.torus(0.51, 0.05, SNOW, 0, 1.0, -1.55 + f, { seg: 14 });
  g.ball(0.5, DEEP, 0, 1.0, -2.25, { sz: 0.4, seg: 12, rows: 6 });
  const xs = level >= 4 ? [-0.55, 0, 0.55] : level >= 2 ? [-0.35, 0.35] : [0];
  const len = 2.2 + level * 0.3;
  const br = level >= 4 ? 0.2 : 0.25;
  for (const x of xs) {
    g.box(br * 2.6, br * 2.6, 0.3, DARK, x, 1.0, 1.05, { r: 0.05 });
    barrel(g, x, 1.0, 1.1, len, br, STEELC, { r2: br * 0.9 });
    for (let i = 0; i < 2 + (level >= 3 ? 1 : 0); i++) g.torus(br * 1.25, 0.06, ICE, x, 1.0, 1.5 + i * (len / 3), { seg: 10 }); // frost rings
    g.cyl(br * 1.35, 0.35, frost, x, 1.0, 1.1 + len, { axis: 'z', r2: br * 1.5, seg: 10 }); // icy muzzle
    for (let j = 0; j < 4; j++) {
      const a = (j / 4) * PI * 2 + PI / 4;
      g.cyl(0.05, 0.3, ICE, x + Math.cos(a) * br * 1.5, 1.0 + Math.sin(a) * br * 1.5, 1.2 + len, { axis: 'z', r2: 0, seg: 4 });
    }
    gunMuzzle(u, t, x, 1.0, 1.4 + len);
    g.tube([[x * 0.6, 1.3, -1.0], [x, 1.55, 0.2], [x, 1.0 + br, 1.3]], 0.05, 0x0288d1, { sides: 5 });
  }
  if (level >= 1) for (const x of [-0.7, -0.35, 0.05, 0.4, 0.75]) g.cyl(0, 0.35 + Math.abs(Math.sin(x * 7)) * 0.3, ICE, x, 0.15, 0.95, { r2: 0.08, seg: 5 }); // icicles
  if (level >= 3) {
    // Frost core floating over the roof, crystal spikes on the shoulders
    g.ball(0.4, frost, 0, 2.5, -0.4, { seg: 4, rows: 2, flat: true });
    g.torus(0.55, 0.04, ICE, 0, 2.5, -0.4, { rx: PI / 2 + 0.3, seg: 16 });
    for (const sx of [-1, 1]) {
      crystal(g, sx * 0.85, 1.5, -0.3, 0.22, 1.2, DEEP, 0.6, sx > 0 ? 0 : PI);
      crystal(g, sx * 0.8, 1.5, -0.8, 0.15, 0.8, ICE, 0.5, sx > 0 ? 0.3 : PI - 0.3);
    }
  }
  g.done();
  if (level >= 4) {
    // Crown of big glowing crystals behind the turret, and a frosty halo on the ice
    const c = kit(u, u.body, `${key}:crown`);
    for (const [x, h] of [[-1.1, 2.0], [0, 2.8], [1.1, 2.0]]) crystal(c, x, 1.75, -1.35, 0.4, h, frost, x ? 0.25 : 0.1, x > 0 ? 0 : x < 0 ? PI : -PI / 2);
    c.done();
    const halo = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.06, 24), clearMat(u, 0x84ffff, 0.25));
    halo.position.y = 1.25;
    halo.castShadow = false;
    u.body.add(halo);
  }
  u.static = true;
  u.bob = 0;
  u.tracer = 0x84ffff;
  u.projectile = { color: 0xe1f5fe, size: level >= 4 ? 0.8 : 0.6 };
  u.flight = { color: 0xb3e5fc, size: level >= 4 ? 0.9 : 0.7, arc: 0.3 }; // ice cubes
  return u;
}

// ------------------------------------------------------------------ Enforcement Base

/** A parked unit model (from VEHICLE_UNITS) scaled by s on the tower's body. */
function parkUnit(u, model, s, x, y, z, yaw = 0) {
  const unit = VEHICLE_UNITS[model](model);
  unit.root.scale.setScalar(s);
  unit.root.position.set(x, y, z);
  unit.root.rotation.y = yaw;
  u.body.add(unit.root);
  u.mats.push(...unit.mats);
  return unit;
}

/** A police patrol car on `parent` facing +z: white body, navy doors, a light bar and round wheels. */
function patrolCar(u, parent, key, red, blue) {
  const k = kit(u, parent, key);
  const NAVY = 0x1a237e;
  k.box(1.15, 0.42, 2.3, 0xf5f5f5, 0, 0.5, 0, { r: 0.12 });
  k.slab(1.0, 0.42, 1.2, NAVY, 0, 0.92, -0.15, { tw: 0.86, td: 0.72, tz: -0.05 });
  k.slab(1.02, 0.34, 1.0, GLASS, 0, 0.9, -0.15, { tw: 0.86, td: 0.72, tz: -0.05 });
  k.box(0.9, 0.06, 0.6, NAVY, 0, 1.14, -0.18, { r: 0.02 });
  for (const sx of [-1, 1]) {
    k.box(0.04, 0.32, 1.2, NAVY, sx * 0.58, 0.52, -0.1);
    k.box(0.05, 0.1, 0.36, GOLD, sx * 0.6, 0.55, -0.1); // badge
    lamp(k, sx * 0.38, 0.55, 1.12, 0.09, 0xfff8e1);
    k.box(0.22, 0.08, 0.04, 0xd50000, sx * 0.38, 0.6, -1.16);
  }
  k.box(0.9, 0.18, 0.08, DARK, 0, 0.36, 1.18); // push bar
  for (const sx of [-1, 1]) k.box(0.06, 0.3, 0.08, DARK, sx * 0.36, 0.45, 1.22);
  k.box(0.8, 0.08, 0.26, DARK, 0, 1.2, -0.15);
  k.box(0.36, 0.13, 0.24, red, -0.2, 1.3, -0.15, { r: 0.04 });
  k.box(0.36, 0.13, 0.24, blue, 0.2, 1.3, -0.15, { r: 0.04 });
  k.done();
  for (const sx of [-1, 1]) for (const z of [-0.72, 0.72]) wheel(u, parent, sx * 0.52, 0.28, z, 0.28, 0.22);
}

/**
 * Enforcement Base: a police HQ with a light bar, a garage and a patrol car out front. Lv 1 a
 * radio mast and a flag, Lv 2 striped barricades, Lv 3 a watchtower with a searchlight, Lv 4 a
 * truck bay with the armored Turret Truck, Lv 5 a robot hangar with the APM-Bot.
 */
export function makeEnforcementBase(level) {
  level = lv(level);
  const u = makeThing();
  const NAVY = 0x283593;
  const WHITE = 0xeceff1;
  const red = glowMat(u, 0xff1744);
  const blue = glowMat(u, 0x2979ff);
  const key = `enfb${level}`;
  const k = kit(u, u.body, key);
  const x0 = level >= 4 ? -0.8 : 0;
  const y0 = 0.25;
  // Concrete lot with parking lines
  k.slab(level >= 4 ? 5.6 : 4.6, y0, 4.6, CONCRETE, x0 * 0.6, y0 / 2, 0, { tw: 0.97, td: 0.97 });
  for (const x of [-1.4, -0.2, 1.0]) k.box(0.06, 0.02, 1.0, 0xfafafa, x0 + x, y0 + 0.01, 1.5);
  // HQ: navy block with a white band, a roof with a parapet, glass doors and windows
  const hx = x0;
  const hz = -1.0;
  k.box(3.4, 2.9, 2.0, NAVY, hx, y0 + 1.45, hz, { r: 0.05 });
  k.box(3.44, 0.35, 2.04, WHITE, hx, y0 + 2.25, hz);
  k.box(3.6, 0.12, 2.2, 0x263238, hx, y0 + 2.96, hz);
  for (const sx of [-1, 1]) k.box(0.1, 0.25, 2.2, 0x263238, hx + sx * 1.75, y0 + 3.12, hz);
  k.box(3.6, 0.25, 0.1, 0x263238, hx, y0 + 3.12, hz + 1.05);
  k.box(3.6, 0.25, 0.1, 0x263238, hx, y0 + 3.12, hz - 1.05);
  k.box(1.1, 1.55, 0.08, 0xb0bec5, hx + 1.0, y0 + 0.78, hz + 1.01);
  for (const sx of [-1, 1]) k.box(0.48, 1.4, 0.05, GLASS, hx + 1.0 + sx * 0.26, y0 + 0.72, hz + 1.05);
  k.box(1.3, 0.1, 0.5, 0x263238, hx + 1.0, y0 + 1.65, hz + 1.25); // canopy
  k.box(1.5, 0.42, 0.06, WHITE, hx + 1.0, y0 + 2.0, hz + 1.03);
  k.box(1.4, 0.12, 0.07, NAVY, hx + 1.0, y0 + 1.88, hz + 1.04);
  star(k, hx + 1.0, y0 + 2.42, hz + 1.06, 0.26, GOLD, { rx: PI / 2 });
  windowAt(k, hx - 0.15, y0 + 1.75, hz + 1.01, 0.5, 0.45, WHITE);
  // Garage with a roll-up door and a lamp over it
  const gx = hx - 0.85;
  k.box(1.7, 1.8, 0.06, 0x616161, gx, y0 + 0.9, hz + 1.01);
  for (let i = 0; i < 6; i++) k.box(1.7, 0.04, 0.05, 0x424242, gx, y0 + 0.2 + i * 0.3, hz + 1.05);
  k.box(1.86, 0.12, 0.12, WHITE, gx, y0 + 1.86, hz + 1.03);
  k.box(0.3, 0.12, 0.2, DARK, gx, y0 + 2.0, hz + 1.12);
  k.box(0.22, 0.04, 0.14, glowMat(u, 0xfff9c4), gx, y0 + 1.93, hz + 1.14);
  // Rooftop: AC unit with a fan, the light bar
  k.box(0.9, 0.5, 0.8, 0xb0bec5, hx - 0.9, y0 + 3.15, hz - 0.4, { r: 0.04 });
  k.torus(0.3, 0.03, DARK, hx - 0.9, y0 + 3.41, hz - 0.4, { rx: PI / 2, seg: 14 });
  k.box(1.6, 0.16, 0.5, 0x263238, hx + 0.2, y0 + 3.0, hz + 0.4);
  k.box(0.7, 0.28, 0.42, red, hx - 0.18, y0 + 3.2, hz + 0.4, { r: 0.06 });
  k.box(0.7, 0.28, 0.42, blue, hx + 0.58, y0 + 3.2, hz + 0.4, { r: 0.06 });
  if (level >= 1) {
    antenna(k, hx - 1.45, y0 + 3.0, hz - 0.7, 2.4);
    antenna(k, hx - 1.25, y0 + 3.0, hz - 0.85, 1.6);
    flagPole(k, hx + 1.5, y0 + 3.0, hz - 0.8, 2.0, NAVY);
  }
  if (level >= 2) for (const x of [-1.6, 1.6]) {
    // Striped barricades on A-frame legs with a blinking lamp
    const bx = x0 * 0.6 + x;
    k.box(1.1, 0.26, 0.08, WHITE, bx, y0 + 0.62, 1.95);
    for (const f of [-0.33, 0, 0.33]) k.box(0.14, 0.27, 0.09, 0xff6f00, bx + f, y0 + 0.62, 1.95, { rz: 0.5 });
    for (const sx of [-0.45, 0.45]) for (const sz of [-1, 1]) strut(k, [bx + sx, y0 + 0.6, 1.95], [bx + sx, y0, 1.95 + sz * 0.25], 0.03, DARK);
    k.cyl(0.08, 0.12, (x < 0 ? red : glowMat(u, 0xffab00)), bx - 0.45, y0 + 0.81, 1.95, { seg: 8 });
  }
  if (level >= 3) {
    // Watchtower: legs with braces, a cabin with windows and a searchlight on top
    const wx = x0 + 1.4;
    const wz = -1.5;
    for (const dx of [-0.4, 0.4]) for (const dz of [-0.4, 0.4]) strut(k, [wx + dx * 1.2, y0 + 2.95, wz + dz * 1.2], [wx + dx, y0 + 5.0, wz + dz], 0.06, 0x37474f);
    for (const dz of [-0.4, 0.4]) strut(k, [wx - 0.44, y0 + 3.6, wz + dz * 1.1], [wx + 0.44, y0 + 4.5, wz + dz * 1.05], 0.03, 0x37474f);
    k.box(1.2, 0.12, 1.2, 0x263238, wx, y0 + 5.0, wz);
    k.box(1.1, 0.75, 1.1, NAVY, wx, y0 + 5.45, wz, { r: 0.03 });
    for (const sx of [-1, 1]) {
      k.box(0.9, 0.3, 0.04, GLASS, wx, y0 + 5.55, wz + sx * 0.56);
      k.box(0.04, 0.3, 0.9, GLASS, wx + sx * 0.56, y0 + 5.55, wz);
    }
    k.slab(1.35, 0.14, 1.35, 0x263238, wx, y0 + 5.9, wz, { tw: 0.7, td: 0.7 });
    k.box(0.36, 0.3, 0.06, DARK, wx, y0 + 6.1, wz);
    k.cyl(0.24, 0.5, 0x424242, wx, y0 + 6.3, wz + 0.05, { axis: 'z', rx: 0.35, seg: 12 });
    k.cyl(0.2, 0.04, glowMat(u, 0xfff9c4), wx, y0 + 6.21, wz + 0.31, { axis: 'z', rx: 0.35, seg: 12 });
  }
  if (level >= 4) {
    // Truck bay on the right with a hazard-striped header
    const bx = 1.9;
    for (const sx of [-1, 1]) {
      k.box(0.15, 2.4, 3.6, NAVY, bx + sx * 1.0, y0 + 1.2, -0.2);
      k.box(0.2, 0.2, 0.2, HAZARD, bx + sx * 1.0, y0 + 0.1, 1.55);
    }
    k.slab(2.4, 0.22, 3.9, 0x263238, bx, y0 + 2.5, -0.2, { tw: 0.95, td: 0.97 });
    const n = 8;
    for (let i = 0; i < n; i++) k.box(2.0 / n - 0.02, 0.3, 0.06, i % 2 ? 0x1a1a1a : HAZARD, bx - 1.0 + (i + 0.5) * (2.0 / n), y0 + 2.25, 1.62, { rz: 0.35 });
    lamp(k, bx, y0 + 2.05, 1.5, 0.12, 0xfff9c4);
  }
  if (level >= 5) {
    // Robot hangar behind: a tall shed with ribbed walls and a glowing door frame
    k.box(4.2, 0.3, 1.8, CONCRETE, 0, 0.15, -2.85);
    k.box(3.8, 4.4, 0.2, 0x1a237e, 0, 2.35, -3.6);
    for (const sx of [-1, 1]) {
      k.box(0.25, 4.4, 1.5, 0x1a237e, sx * 1.9, 2.35, -2.9);
      for (let i = 0; i < 4; i++) k.box(0.06, 4.3, 0.06, 0x283593, sx * 2.03, 2.35, -3.5 + i * 0.4);
      k.box(0.1, 4.0, 0.1, blue, sx * 1.65, 2.3, -2.12);
    }
    k.slab(4.1, 0.3, 1.9, 0x263238, 0, 4.7, -2.85, { tw: 0.9 });
    k.box(3.2, 0.1, 0.1, blue, 0, 4.4, -2.12);
    k.box(1.2, 0.3, 0.06, WHITE, 0, 4.15, -2.12);
  }
  k.done();
  // The patrol car out front, side-on
  const car = new THREE.Group();
  car.position.set(x0 - 0.3, y0, 1.25);
  car.rotation.y = PI / 2;
  u.body.add(car);
  patrolCar(u, car, 'enfbCar', red, blue);
  if (level >= 4) parkUnit(u, 'ebtruck', 0.32, 1.9, y0 + 0.05, -0.1);
  if (level >= 5) parkUnit(u, 'ebapm', 0.5, 0, 0.3, -2.75);
  u.static = true;
  return u;
}

// ------------------------------------------------------------------ Submerge

/**
 * Submerge (water): a submarine riding low with a deck of missile hatches (a muzzle on each).
 * Bigger every level; Lv 1 dive planes on the sail, Lv 2 more hatches, Lv 3 a periscope and a
 * striped nuke silo, Lv 4 a sonar dome and bow planes, Lv 5 a big dark sub with a huge glowing
 * missile raised out of the silo.
 */
export function makeSubmerge(level) {
  level = lv(level);
  const u = makeThing();
  const dark5 = level >= 5;
  const L = [5.0, 5.4, 5.9, 6.4, 7.0, 8.2][level];
  const R = [0.85, 0.9, 1.0, 1.05, 1.15, 1.35][level];
  const HULL = dark5 ? 0x1a1a1a : level >= 3 ? 0x37474f : 0x455a64;
  const DECK = dark5 ? 0x263238 : 0x546e7a;
  const redGlow = glowMat(u, 0xff1744);
  const key = `sub${level}`;
  const k = kit(u, u.body, key);
  const y = 0.2;
  // Pressure hull: a long cylinder with a round nose and a tapering tail
  k.cyl(R, L, HULL, 0, y, 0, { axis: 'z', seg: 18 });
  k.ball(R, HULL, 0, y, L / 2, { sz: 1.3, seg: 18, rows: 10 });
  k.cyl(R * 0.22, 2.0, HULL, 0, y, -L / 2 - 1.0, { axis: 'z', r2: R, seg: 18 });
  k.torus(R * 1.0, 0.04, tone(HULL, 0.75), 0, y, L / 2 - 0.3, { seg: 18 }); // hull joints
  k.torus(R * 1.0, 0.04, tone(HULL, 0.75), 0, y, -L / 2 + 0.3, { seg: 18 });
  // Deck casing with a row of dark vent slots down each side, and a white bow number
  k.box(R * 1.1, 0.22, L * 0.86, DECK, 0, y + R * 0.9, -0.1, { r: 0.06 });
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 8; i++) k.box(0.03, 0.06, 0.22, 0x0b0b0b, sx * R * 0.56, y + R * 0.86, -L * 0.38 + (i * L * 0.76) / 7);
    k.box(0.03, 0.22, 0.5, 0xfafafa, sx * R * 0.97, y + R * 0.3, L / 2 - 0.9, { rz: sx * 0.25 });
  }
  // Tail: cross fins with dark tips
  const tz = -L / 2 - 1.5;
  k.slab(0.1, R * 2.2, 0.8, HULL, 0, y, tz, { td: 0.6, tz: -0.1 });
  k.slab(R * 2.2, 0.1, 0.8, HULL, 0, y, tz, { td: 0.6, tz: -0.1 });
  for (const s of [-1, 1]) {
    k.box(0.12, 0.2, 0.6, DARK, 0, y + s * R * 1.1, tz - 0.05);
    k.box(0.2, 0.12, 0.6, DARK, s * R * 1.1, y, tz - 0.05);
  }
  // The sail: a rounded tower with bridge windows, masts and (Lv 1) dive planes
  const sz = L * 0.18;
  const sh = 1.2 + level * 0.12;
  k.plan(stadium(0.8, 1.9), sh, HULL, 0, y + R * 0.8, sz, { bevel: 0.06 });
  k.plan(stadium(0.84, 1.94), 0.1, tone(HULL, 0.7), 0, y + R * 0.8 + sh - 0.05, sz);
  for (const sx of [-0.18, 0.18]) k.box(0.18, 0.12, 0.05, 0x4fc3f7, sx, y + R * 0.8 + sh - 0.25, sz + 0.94, { ry: sx * 1.2 });
  const st = y + R * 0.8 + sh + 0.05;
  k.cyl(0.05, 0.9, DARK, -0.15, st + 0.45, sz - 0.5, { seg: 6 });
  k.box(0.1, 0.12, 0.35, DARK, -0.15, st + 0.9, sz - 0.5);
  if (level >= 1) for (const sx of [-1, 1]) k.slab(0.9, 0.08, 0.55, HULL, sx * 0.82, y + R * 0.8 + sh * 0.62, sz + 0.2, { tw: 0.8, tx: sx * 0.05 });
  // Missile hatches behind the sail: round lids with red caps, a muzzle on each
  const cells = [2, 3, 4, 4, 5, 6][level];
  for (let i = 0; i < cells; i++) {
    for (const x of [-0.32, 0.32]) {
      const z = sz - 1.45 - i * 0.62;
      k.cyl(0.24, 0.06, tone(DECK, 0.8), x, y + R * 0.9 + 0.12, z, { seg: 14 });
      k.cyl(0.21, 0.08, 0x78909c, x, y + R * 0.9 + 0.16, z, { seg: 14 });
      k.cyl(0.08, 0.04, dark5 ? redGlow : 0xe53935, x, y + R * 0.9 + 0.21, z, { seg: 10 });
      k.box(0.12, 0.06, 0.1, DARK, x + Math.sign(x) * 0.22, y + R * 0.9 + 0.16, z);
      gunMuzzle(u, u.body, x, y + R * 0.9 + 0.45, z);
    }
  }
  const siloZ = sz + 1.7;
  if (level >= 3) {
    // Periscope, and a nuke silo with a yellow-black striped collar in front of the sail
    k.cyl(0.06, 1.4, DARK, 0.15, st + 0.7, sz - 0.1, { seg: 8 });
    k.box(0.14, 0.18, 0.4, DARK, 0.15, st + 1.4, sz + 0.02);
    k.box(0.1, 0.1, 0.04, 0x4fc3f7, 0.15, st + 1.4, sz + 0.23);
    k.cyl(0.6, 0.3, HAZARD, 0, y + R * 0.9 + 0.2, siloZ, { seg: 16 });
    for (let j = 0; j < 8; j++) {
      const a = (j / 8) * PI * 2;
      k.box(0.14, 0.31, 0.2, IRON, Math.cos(a) * 0.58, y + R * 0.9 + 0.2, siloZ + Math.sin(a) * 0.58, { ry: -a + 0.5 });
    }
    k.cyl(0.42, 0.32, 0x212121, 0, y + R * 0.9 + 0.22, siloZ, { seg: 14 });
    if (!dark5) k.cyl(0.14, 0.04, glowMat(u, 0xff6d00), 0, y + R * 0.9 + 0.39, siloZ, { seg: 10 });
  }
  if (level >= 4) {
    // Sonar dome on the bow and bow planes
    k.ball(R * 0.55, DECK, 0, y + R * 0.85, L / 2 - 0.55, { sy: 0.55, sz: 1.3, seg: 14, rows: 6 });
    for (const sx of [-1, 1]) k.slab(0.8, 0.08, 0.5, HULL, sx * (R + 0.35), y + R * 0.3, L / 2 - 1.2, { tw: 0.75, tx: sx * 0.05 });
  }
  if (dark5) {
    // The huge missile, raised out of the silo, and red glowing strips along the hull
    const my = y + R * 0.9 + 0.3;
    k.cyl(0.32, 3.0, 0xeceff1, 0, my + 1.5, siloZ, { seg: 14 });
    k.cyl(0.32, 0.9, redGlow, 0, my + 3.45, siloZ, { r2: 0.02, seg: 14 });
    k.cyl(0.33, 0.25, IRON, 0, my + 2.3, siloZ, { seg: 14 });
    k.cyl(0.33, 0.12, redGlow, 0, my + 1.0, siloZ, { seg: 14 });
    for (let j = 0; j < 4; j++) {
      const a = (j / 4) * PI * 2;
      k.slab(0.06, 0.7, 0.5, 0x424242, Math.cos(a) * 0.45, my + 0.4, siloZ + Math.sin(a) * 0.45, { ry: -a, td: 0.4, tz: 0 });
    }
    for (const sx of [-1, 1]) k.box(0.04, 0.1, L * 0.8, redGlow, sx * R * 1.0, y + 0.2, 0);
  }
  k.done();
  // The propeller turns slowly
  const prop = spinner(u, u.body, 0, y, -L / 2 - 2.05, 'z');
  const p = kit(u, prop, `subProp:${R}`);
  p.cyl(0.12, 0.25, DARK, 0, 0, 0, { seg: 8 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * PI * 2;
    p.box(0.22, 0.04, R * 0.6, 0xb08d57, Math.sin(a) * R * 0.32, 0, Math.cos(a) * R * 0.32, { ry: a, rz: 0.5 });
  }
  p.done();
  u.idleSpin = 2;
  if (dark5) u.body.scale.setScalar(0.92);
  u.static = true;
  u.bob = 0.05;
  u.tracer = dark5 ? 0xff1744 : 0xff7043;
  u.projectile = { color: 0xeceff1, size: dark5 ? 0.8 : 0.6 };
  return u;
}

// ------------------------------------------------------------------ Marauder

/** A saw disc lying flat at (x, y, z): a steel plate with teeth round the rim and a hub. */
function sawDisc(k, x, y, z, r, col = 0xcfd8dc) {
  k.cyl(r, 0.05, col, x, y, z, { seg: 16 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    k.box(0.12, 0.04, 0.08, col, x + Math.cos(a) * r, y, z + Math.sin(a) * r, { ry: -a + 0.6 });
  }
  k.cyl(r * 0.25, 0.07, DARK, x, y, z, { seg: 8 });
}

/**
 * Marauder (water): a sleek raider speedboat with a razor launcher on the bow. Lv 1 twin outboard
 * motors, Lv 2 ram spikes, Lv 3 a sonar dish, Lv 4 a big harpoon gun with a rope spool, Lv 5 a
 * dark red armored boat with spiked plates and an armored canopy.
 */
export function makeMarauder(level) {
  level = lv(level);
  const u = makeThing();
  const armored = level >= 5;
  const L = [4.6, 4.8, 5.0, 5.3, 5.6, 6.2][level];
  const W = armored ? 2.6 : 2.2;
  const HULL = armored ? 0x5d0a0a : 0x37474f;
  const trim = armored ? glowMat(u, 0xff1744) : 0xc62828;
  const DK = armored ? 0x1a1a1a : 0x212121;
  const STEELC = 0x90a4ae;
  const zc = -0.4;
  const dy = 0.45;
  const key = `marauder${level}`;
  const k = kit(u, u.body, key);
  hull(k, L, W, -0.4, dy, HULL, { z: zc, bow: W * 1.05, stripe: DK, deck: 0x424242, rail: false });
  // Racing stripes down the sides and a chevron on the bow
  const sLen = L - W * 1.05 - 0.35;
  const sMid = zc + (0.35 - W * 1.05) / 2;
  for (const sx of [-1, 1]) {
    k.box(0.04, 0.1, sLen, trim, sx * (W / 2 + 0.01), 0.28, sMid);
    k.box(0.04, 0.05, sLen * 0.8, trim, sx * (W / 2 + 0.01), 0.14, sMid - sLen * 0.1);
    k.box(0.05, 0.1, W * 0.6, trim, sx * W * 0.26, 0.28, zc + L / 2 - W * 0.55, { ry: -sx * 0.45 });
  }
  // Low cockpit with a raked windscreen and two bucket seats
  const cz = zc - L / 2 + 1.3;
  k.slab(W - 0.6, 0.5, 1.6, DK, 0, dy + 0.25, cz, { tw: 0.9, td: 0.7, tz: -0.2 });
  k.slab(W - 0.7, 0.42, 0.6, armored ? 0xff5252 : 0x4fc3f7, 0, dy + 0.55, cz + 0.85, { td: 0.2, tz: -0.25 });
  for (const sx of [-0.35, 0.35]) {
    k.box(0.4, 0.15, 0.4, 0x3e2723, sx, dy + 0.55, cz - 0.1, { r: 0.05 });
    k.box(0.4, 0.45, 0.1, 0x3e2723, sx, dy + 0.75, cz - 0.32, { r: 0.04, rx: -0.2 });
  }
  // Outboard motors on the transom with glowing exhausts
  for (const x of level >= 1 ? [-0.5, 0.5] : [0]) {
    const ez = zc - L / 2 - 0.3;
    k.box(0.45, 0.65, 0.55, DK, x, dy + 0.25, ez, { r: 0.12 });
    k.box(0.47, 0.08, 0.57, trim, x, dy + 0.35, ez);
    k.box(0.14, 0.7, 0.2, 0x37474f, x, dy - 0.4, ez - 0.05);
    k.cyl(0.12, 0.3, 0x37474f, x, dy - 0.75, ez - 0.05, { axis: 'z', seg: 8 });
    if (level >= 1) k.cyl(0.1, 0.1, glowMat(u, armored ? 0xff1744 : 0xff9100), x, dy + 0.3, ez - 0.29, { axis: 'z', seg: 8 });
  }
  if (level >= 2) for (const x of [-0.45, 0, 0.45]) {
    // Ram spikes on the bow
    k.cyl(0.09, 0.9, STEELC, x, 0.15, zc + L / 2 + 0.2 - Math.abs(x) * 0.9, { axis: 'z', r2: 0, seg: 6 });
  }
  if (level >= 3) {
    // Sonar mast behind the cockpit
    k.cyl(0.06, 1.2, DK, 0, dy + 0.7, cz - 0.7, { seg: 8 });
    k.box(0.5, 0.06, 0.06, DK, 0, dy + 1.0, cz - 0.7);
  }
  if (armored) for (const sx of [-1, 1]) {
    // Armor plates with rivets and spikes, and an armored canopy over the cockpit
    k.slab(0.16, 0.55, L - 1.2, DK, sx * (W / 2 + 0.08), 0.22, zc - 0.4, { td: 0.9 });
    bolts(k, [sx * (W / 2 + 0.17), 0.4, zc - L / 2 + 0.8], [sx * (W / 2 + 0.17), 0.4, zc + L / 2 - 2.2], 6, STEELC);
    for (const z of [-1.6, -0.4, 0.8]) k.cyl(sx > 0 ? 0.08 : 0, 0.45, STEELC, sx * (W / 2 + 0.38), 0.22, zc + z + 0.4, { axis: 'x', r2: sx > 0 ? 0 : 0.08, seg: 6 });
  }
  if (armored) k.slab(W - 0.6, 0.12, 1.4, DK, 0, dy + 0.85, cz + 0.1, { tw: 0.85 });
  k.done();
  if (level >= 3) dish(u, u.body, 'marauderSonar', 0, dy + 1.35, cz - 0.7, 0.5, 0xeceff1, armored ? trim : glowMat(u, 0x76ff03));

  // Weapon head on the bow
  const head = new THREE.Group();
  head.position.set(0, dy, zc + L / 2 - 1.4 + 0.4);
  u.body.add(head);
  const h = kit(u, head, `${key}:head`);
  h.cyl(0.55, 0.22, DK, 0, 0.11, 0, { seg: 16 });
  h.torus(0.52, 0.04, STEEL, 0, 0.22, 0, { rx: PI / 2, seg: 16 });
  if (level >= 4) {
    // Big harpoon gun: a long barrel, a barbed harpoon and a rope spool
    h.box(0.9, 0.6, 1.1, armored ? 0x3e0d0d : 0x455a64, 0, 0.55, -0.1, { r: 0.1 });
    barrel(h, 0, 0.7, 0.3, 2.3, 0.18, DK, { r2: 0.16 });
    h.cyl(0.05, 1.2, STEELC, 0, 0.7, 3.0, { axis: 'z', seg: 6 });
    h.cyl(0.2, 0.45, armored ? trim : STEELC, 0, 0.7, 3.75, { axis: 'z', r2: 0, seg: 8 });
    for (const a of [0, PI / 2, PI, -PI / 2]) h.box(0.04, 0.3, 0.06, STEELC, Math.cos(a) * 0.15, 0.7 + Math.sin(a) * 0.15, 3.45, { rz: a + PI / 2 }); // barbs
    h.cyl(0.28, 0.45, 0x8d6e63, 0.75, 0.55, -0.4, { axis: 'x', seg: 12 });
    for (const sx of [-1, 1]) h.cyl(0.36, 0.05, DK, 0.75 + sx * 0.24, 0.55, -0.4, { axis: 'x', seg: 12 });
    h.tube([[0.75, 0.83, -0.4], [0.5, 1.0, 0.8], [0.12, 0.8, 2.5]], 0.025, 0xd7ccc8, { sides: 4 });
    gunMuzzle(u, head, 0, 0.7, 4.0);
    u.flight = { color: armored ? 0xff1744 : 0xbdbdbd, size: 1, arc: 0.5, long: true };
  } else {
    // Razor launcher: a magazine of saw discs and a short launch rail
    h.box(0.9, 0.5, 1.0, 0x455a64, 0, 0.47, -0.1, { r: 0.08 });
    h.box(0.75, 0.1, 1.5, DK, 0, 0.62, 0.9);
    for (const sx of [-1, 1]) h.box(0.06, 0.12, 1.5, STEELC, sx * 0.4, 0.7, 0.9);
    for (let i = 0; i < 2 + Math.min(level, 2); i++) sawDisc(h, 0, 0.78 + i * 0.09, -0.1, 0.4);
    h.cyl(0.08, 0.5, DK, 0, 1.0, -0.1, { seg: 8 }); // spindle
    sawDisc(h, 0, 0.72, 1.3, 0.38);
    gunMuzzle(u, head, 0, 0.72, 1.8);
    u.flight = { color: 0xcfd8dc, size: 0.8, arc: 0.15 };
  }
  h.done();
  u.static = true;
  u.bob = 0.08;
  u.tracer = armored ? 0xff1744 : 0xb0bec5;
  return u;
}
