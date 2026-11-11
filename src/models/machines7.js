// Tower models: machines, batch 7 (rebuilt with the vehicle kit in ../vehicles.js).
// In here: Military Base, Armored Factory, Fruit Farm, Airdrop Farm, Attack Helicopter pad (the
// Pursuit's other form), Helicopter pad, XWM Turret, Barracks, Field Barracks.
// Each makeX(level) builds one tower's look; TOWER_MODELS in ../models.js says which tower uses which.
// The helicopters themselves are unchanged: makeHeli (machines2.js) and heliCraft (newmodels/i.js).

import * as THREE from 'three';
import { antenna, barrel, bolts, crate, glowMat, hatch, kit, lamp, louvres, mgun, PARTS, star, tone } from '../vehicles.js';
import { commandoSoldier, greenSoldier, heliCraft, tuberSoldier } from '../newmodels/i.js';
import { gunMuzzle, makeThing } from './bits.js';
import { dish, pad, spinBarrels } from './machines1.js';
import { bag, drum, fence, flagPole, makeHeli, rollerDoor, tent, windowAt } from './machines2.js';
import { lv, seeThrough, spinner, strut } from './machines5.js';
import { makeUnit } from './units.js';

const { STEEL, GUN, DARK, GLASS } = PARTS;
const PI = Math.PI;
const CONCRETE = 0x9e9e9e;
const HAZARD = 0xf2c12e;
const WOOD = 0x8d6e63;
const SANDBAG = 0xb59a72;
const OLIVE = 0x4e5b31;

// ------------------------------------------------------------------ small shared pieces

/** Parks a summoned unit's model on `u.body`. */
function park(u, model, s, x, y, z, ry = 0) {
  const v = makeUnit(model);
  v.root.scale.setScalar(s);
  v.root.position.set(x, y, z);
  v.root.rotation.y = ry;
  u.body.add(v.root);
  u.mats.push(...v.mats);
  return v;
}

/** Puts a person (makeHumanoid model) on the tower. */
function person(u, h, x, y, z, ry = 0, s = 0.32) {
  h.root.scale.setScalar(s);
  h.root.position.set(x, y, z);
  h.root.rotation.y = ry;
  u.body.add(h.root);
  u.mats.push(...h.mats);
  return h;
}

/** A wooden crate standing on y: plank sides, a darker frame round the edges and a cross brace. */
function woodCrate(k, x, y, z, s, col = WOOD, ry = 0) {
  k.box(s, s, s, col, x, y + s / 2, z, { ry });
  const f = tone(col, 0.72);
  const t = s * 0.1;
  for (const sy of [-1, 1]) for (const sx of [-1, 1]) {
    // the four frame edges round the top and the bottom
    const dx = Math.cos(ry) * sx * (s / 2) ;
    const dz = -Math.sin(ry) * sx * (s / 2);
    k.box(t, t, s + 0.02, f, x + dx, y + s / 2 + sy * (s / 2 - t / 2), z + dz, { ry });
  }
  for (const sz of [-1, 1]) {
    const dx = Math.sin(ry) * sz * (s / 2 + 0.005);
    const dz = Math.cos(ry) * sz * (s / 2 + 0.005);
    k.box(s * 1.1, t * 0.8, 0.03, f, x + dx, y + s / 2, z + dz, { ry, rz: 0.78 });
  }
}

/** A cash crate: a wooden crate with a green money band and a white $ plate on the front. */
function cashCrate(k, x, y, z, s) {
  woodCrate(k, x, y, z, s, 0x8d6e63);
  k.box(s + 0.04, s * 0.2, s + 0.04, 0x43a047, x, y + s * 0.5, z);
  k.box(s * 0.32, s * 0.36, 0.03, 0xfafafa, x, y + s * 0.5, z + s / 2 + 0.03);
  k.box(s * 0.06, s * 0.3, 0.02, 0x2e7d32, x, y + s * 0.5, z + s / 2 + 0.05);
}

/** A gold bar on y: a trapezoid block (shiny glow material). */
function goldBar(k, mat, x, y, z, ry = 0) {
  k.slab(0.26, 0.14, 0.52, mat, x, y + 0.07, z, { tw: 0.7, td: 0.85, ry });
}

/** A gable roof over a box `w` wide (x) and `d` deep (z) whose walls end at y: end walls, two roof slopes, a ridge cap. */
function gable(k, x, y, z, w, d, rise, wall, roof, over = 0.15) {
  k.prism([[-w / 2, 0], [w / 2, 0], [0, rise]], d, wall, x, y, z, { ry: PI / 2 });
  const a = Math.atan2(rise, w / 2);
  const len = Math.hypot(w / 2, rise) + over;
  for (const sx of [-1, 1]) {
    k.box(len, 0.1, d + over * 2, roof, x + sx * (w / 4 + Math.cos(a) * over * 0.3), y + rise / 2 + 0.06, z, { rz: -sx * a });
  }
  k.cyl(0.07, d + over * 2, tone(roof, 0.75), x, y + rise + 0.08, z, { axis: 'z', seg: 6 });
}

/** A square helipad: slab, a darker inner square, a painted ring and "H", and lights round the edge. */
function helipad(k, u, o) {
  const s = o.size ?? 4.4;
  k.slab(s, 0.3, s, o.col, 0, 0.15, 0, { tw: 0.97, td: 0.97 });
  k.box(s - 0.8, 0.03, s - 0.8, tone(o.col, 1.12), 0, 0.31, 0);
  k.torus(1.45, 0.05, o.mark, 0, 0.33, 0, { rx: PI / 2, seg: 28 });
  for (const sx of [-1, 1]) k.box(0.32, 0.04, 1.6, o.mark, sx * 0.5, 0.34, 0);
  k.box(0.7, 0.04, 0.3, o.mark, 0, 0.34, 0);
  // Tie-down rings in the corners of the inner square
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.torus(0.08, 0.02, STEEL, sx * 1.3, 0.33, sz * 1.3, { rx: PI / 2, seg: 8 });
  const lights = glowMat(u, o.light);
  const e = s / 2 - 0.2;
  for (const [x, z] of [[-e, -e], [e, -e], [-e, e], [e, e], [0, e], [0, -e], [e, 0], [-e, 0]]) {
    k.cyl(0.11, 0.12, DARK, x, 0.36, z, { seg: 8 });
    k.ball(0.09, lights, x, 0.45, z, { seg: 6, rows: 4, sy: 0.8 });
  }
}

/** A windsock on a pole standing at (x, z): a striped cone on a ring, blowing toward +z. */
function windsock(k, x, z, h = 2.6) {
  k.cyl(0.14, 0.12, DARK, x, 0.36, z, { seg: 8 });
  k.cyl(0.06, h, 0xbdbdbd, x, 0.3 + h / 2, z, { seg: 6 });
  k.torus(0.2, 0.03, STEEL, x, 0.3 + h - 0.15, z + 0.2, { seg: 10 });
  for (let i = 0; i < 4; i++) k.cyl(0.2 - i * 0.035, 0.25, i % 2 ? 0xfafafa : 0xff6d00, x, 0.3 + h - 0.18 - i * 0.03, z + 0.35 + i * 0.25, { axis: 'z', r2: 0.2 - (i + 1) * 0.035, seg: 10, rx: 0.1 });
}

/** A standing fuel tank: banded red drum on legs, a ladder, a dark cap and a hose to the ground. */
function fuelTank(k, x, z, col = 0xc62828) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(0.08, 0.3, 0.08, DARK, x + sx * 0.3, 0.45, z + sz * 0.3);
  k.cyl(0.45, 1.3, col, x, 1.25, z, { seg: 16 });
  for (const f of [0.7, 1.8]) k.torus(0.45, 0.03, tone(col, 0.7), x, f, z, { rx: PI / 2, seg: 16 });
  k.ball(0.45, tone(col, 0.9), x, 1.9, z, { seg: 16, rows: 6, sy: 0.35 });
  k.cyl(0.1, 0.12, DARK, x, 2.06, z, { seg: 8 });
  for (const sx of [-1, 1]) k.box(0.03, 1.5, 0.03, STEEL, x + sx * 0.12, 1.25, z + 0.48);
  for (let y = 0.65; y < 2.0; y += 0.22) k.box(0.24, 0.025, 0.025, STEEL, x, y, z + 0.48);
  k.box(0.6, 0.06, 0.04, 0xfafafa, x, 1.35, z + 0.455, { ry: 0 }); // FUEL band
  k.tube([[x + 0.4, 0.8, z + 0.2], [x + 0.7, 0.45, z + 0.5], [x + 0.6, 0.35, z + 0.9]], 0.035, 0x111111, { sides: 4 });
}

// ------------------------------------------------------------------ Military Base

/**
 * Military Base (Patrol's other form): an olive steel hangar with a gable roof, a roller door, a
 * starred sign and a guard booth, with its current vehicle parked out front. Lv 1 barbed-wire
 * fences, Lv 2 spare armour plates against the wall, Lv 3 a sandbagged gun deck on the roof,
 * Lv 4 a sweeping radar dish, Lv 5 a glowing railgun charging pylon.
 */
export function makeMilitaryBase(level) {
  const L = lv(level);
  const u = makeThing();
  const k = kit(u, u.body, `milbase${L}`);
  const OD = 0x6b6b4e;
  pad(k, 4.6, 0.3, 0x8d8d8d, false);
  k.box(2.7, 0.03, 2.3, 0x5f5f5f, 0, 0.31, 1.05); // asphalt drive
  for (let i = 0; i < 3; i++) k.box(0.1, 0.02, 0.4, 0xfafafa, 0, 0.33, 0.35 + i * 0.65);
  // Hangar: steel walls with ribs on the sides, pilasters at the front corners, a gable roof
  const hw = 4.0;
  const hd = 2.1;
  const hh = 2.6;
  const hz = -1.15;
  const top = 0.3 + hh;
  k.box(hw, hh, hd, OD, 0, 0.3 + hh / 2, hz);
  k.box(hw + 0.06, 0.25, hd + 0.06, tone(OD, 0.7), 0, 0.42, hz); // plinth
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 7; i++) k.box(0.05, hh - 0.3, 0.06, tone(OD, 0.8), sx * (hw / 2 + 0.02), 0.3 + hh / 2 + 0.1, hz - hd / 2 + 0.15 + i * 0.3);
    k.box(0.3, hh, 0.3, tone(OD, 0.85), sx * (hw / 2 - 0.1), 0.3 + hh / 2, hz + hd / 2 - 0.1);
    k.box(0.04, 0.5, 0.04, 0x16181a, sx * (hw / 2 + 0.03), 1.6, hz - 0.4); // vent slot
  }
  gable(k, 0, top, hz, hw, hd, 0.6, tone(OD, 0.9), 0x4a4a36);
  rollerDoor(k, 2.8, 2.0, 0, 0.3, hz + hd / 2 + 0.01, 0x55553f);
  lamp(k, -1.6, 2.5, hz + hd / 2 + 0.05, 0.12);
  lamp(k, 1.6, 2.5, hz + hd / 2 + 0.05, 0.12);
  // Sign over the door: a white board with a green star
  const sz = hz + hd / 2 + 0.04;
  k.box(1.7, 0.42, 0.06, 0xfafafa, 0, top - 0.1, sz);
  k.box(1.8, 0.06, 0.08, 0x3e3e30, 0, top + 0.13, sz);
  star(k, -0.55, top - 0.1, sz + 0.04, 0.17, 0x2e7d32, { rx: PI / 2 });
  for (let i = 0; i < 4; i++) k.box(0.18, 0.08, 0.02, 0x2e7d32, -0.1 + i * 0.24, top - 0.1, sz + 0.04);
  // Roof vents
  for (const z of [hz - 0.5, hz + 0.4]) {
    k.cyl(0.14, 0.4, STEEL, -1.1, top + 0.45, z, { seg: 8 });
    k.cyl(0.22, 0.08, tone(STEEL, 0.8), -1.1, top + 0.67, z, { seg: 8 });
  }
  flagPole(k, -2.0, 0.3, -2.05, 3.6, 0x2e7d32, 0xfafafa);
  // Guard booth by the drive: walls, windows on three sides and a roof that sticks out
  const bx = 1.8;
  const bz = 1.75;
  k.box(0.7, 1.2, 0.7, 0xd7ccc8, bx, 0.9, bz, { r: 0.03 });
  for (const [dx, dz, ry] of [[0, 0.36, 0], [-0.36, 0, PI / 2], [0.36, 0, PI / 2]]) k.box(0.5, 0.35, 0.03, GLASS, bx + dx, 1.25, bz + dz, { ry });
  k.slab(0.95, 0.12, 0.95, 0x3e3e30, bx, 1.56, bz, { tw: 0.85, td: 0.85 });
  lamp(k, bx, 1.66, bz, 0.07, 0xff6d00);
  // Boom barrier beside the booth, raised
  k.box(0.18, 0.5, 0.18, 0x37474f, bx - 0.55, 0.55, bz + 0.2);
  for (let i = 0; i < 5; i++) k.box(0.08, 0.32, 0.08, i % 2 ? 0xfafafa : 0xd32f2f, bx - 0.55, 0.92 + i * 0.3, bz + 0.2, { rz: 0.15 });
  if (L >= 1) {
    // Barbed Wire: fences down both sides of the yard
    for (const sx of [-1, 1]) fence(k, [sx * 2.15, -0.05], [sx * 2.15, sx > 0 ? 1.2 : 2.15], 0.3, 0.9, 0x5d4037, true);
  }
  if (L >= 2) {
    // Armor Plating: spare plates leaning on the side wall, bolted round the edges
    for (const z of [hz - 0.55, hz + 0.25]) {
      k.slab(0.1, 1.4, 0.7, 0x7d6f50, 2.12, 1.02, z, { rz: 0.17, td: 0.92 });
      bolts(k, [2.08, 1.55, z - 0.25], [2.08, 1.55, z + 0.25], 3, STEEL, 0.035);
      bolts(k, [2.2, 0.55, z - 0.25], [2.2, 0.55, z + 0.25], 3, STEEL, 0.035);
    }
  }
  if (L >= 3) {
    // Mounted Gunner: a steel deck on the ridge with a sandbag ring and a machine gun
    const dy = top + 0.62;
    const dz = hz + 0.35;
    k.box(1.8, 0.12, 1.3, 0x3e3e30, 0, dy, dz);
    for (const sx of [-1, 1]) k.box(0.1, 0.3, 1.2, DARK, sx * 0.8, dy - 0.2, dz);
    for (let i = 0; i < 6; i++) {
      const a = PI * 0.08 + (i / 5) * PI * 0.84;
      bag(k, 0.46, 0.3, Math.cos(a) * 0.72, dy + 0.06, dz + Math.sin(a) * 0.48, SANDBAG, -a + PI / 2);
    }
    k.cyl(0.05, 0.5, DARK, 0, dy + 0.3, dz + 0.1, { seg: 6 });
    mgun(k, 0, dy + 0.58, dz - 0.2, 1.3, { s: 0.9 });
  }
  k.done();
  if (L >= 4) {
    // Tank / Airstrike: a lattice mast at the back with a dish that sweeps round
    const r = kit(u, u.body, 'milbasemast');
    const mx = 1.4;
    const mz = -2.0;
    for (const [ax, az] of [[-0.18, -0.12], [0.18, -0.12], [0, 0.18]]) strut(r, [mx + ax * 1.6, top - 0.35, mz + az * 1.6], [mx + ax * 0.5, top + 1.6, mz + az * 0.5], 0.035, 0x757575);
    for (const y of [top + 0.2, top + 0.8, top + 1.3]) r.torus(0.18 - (y - top) * 0.05, 0.02, 0x757575, mx, y, mz, { rx: PI / 2, seg: 6 });
    r.cyl(0.14, 0.1, DARK, mx, top + 1.65, mz, { seg: 10 });
    r.done();
    const sweep = spinner(u, u.body, mx, top + 1.72, mz);
    dish(u, sweep, 'milbasedish', 0, 0.25, 0, 0.6, 0xe0e0e0, glowMat(u, 0xff1744));
    u.idleSpin = 1.2;
  }
  if (L >= 5) {
    // Railgun Tank: a charging pylon with glowing coils and a cable to the tank
    const c = kit(u, u.body, 'milbasepylon');
    const coil = glowMat(u, 0x40c4ff);
    const px = -1.85;
    const pz = 1.85;
    c.box(0.6, 0.2, 0.6, DARK, px, 0.4, pz, { r: 0.04 });
    c.cyl(0.18, 2.3, 0x37474f, px, 1.6, pz, { seg: 10 });
    for (const y of [1.0, 1.55, 2.1]) {
      c.cyl(0.3, 0.12, coil, px, y, pz, { seg: 14 });
      c.torus(0.32, 0.03, STEEL, px, y + 0.08, pz, { rx: PI / 2, seg: 14 });
    }
    c.ball(0.22, coil, px, 2.85, pz, { seg: 10, rows: 6 });
    c.tube([[px + 0.2, 0.5, pz - 0.1], [px + 0.6, 0.33, pz - 0.4], [px + 1.0, 0.45, pz - 0.6]], 0.04, 0x111111, { sides: 4 });
    c.done();
  }
  park(u, ['humvee', 'humvee', 'humvee2', 'humvee3', 'tank', 'railtank'][L], 0.4, -0.1, 0.32, 1.05, PI / 2);
  return u;
}

// ------------------------------------------------------------------ Armored Factory

/**
 * Armored Factory (Patrol's other form): a brick and steel hall with a raised window roof, a tall
 * brick chimney and a loading apron where its current Humvee waits. Top path: ammo crates
 * (Lv 1), a TOW missile rack on the roof (Lv 3), a radar panel (Lv 4), a Bradley alongside (Lv 5).
 * Bottom path: a training banner (gold from Lv 2), an MRAP / Abrams / M1X parked beside it
 * (Lv 3+), hall lights (Lv 4+).
 */
export function makeArmoredFactoryWith(level, bottom) {
  const L = lv(level);
  const u = makeThing();
  const top = !bottom;
  const k = kit(u, u.body, `armfactory${bottom ? 'B' : 'T'}${L}`);
  pad(k, 4.8, 0.3, 0x757575, true);
  // Apron: a raised slab with yellow chevrons leading out of the door
  k.box(3.0, 0.1, 2.1, 0x8a8a8a, 0, 0.35, 1.15);
  for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) k.box(0.7, 0.02, 0.14, HAZARD, sx * 0.3, 0.41, 0.5 + i * 0.6, { ry: sx * 0.6 });
  // Hall: brick lower walls, steel cladding above, pilasters
  const BRICK = 0x8d4e3c;
  const CLAD = 0x546e7a;
  const hz = -1.25;
  const hd = 2.2;
  const fz = hz + hd / 2;
  k.box(4.4, 1.2, hd, BRICK, 0, 0.9, hz);
  for (let i = 1; i < 6; i++) k.box(4.42, 0.025, hd + 0.02, tone(BRICK, 0.8), 0, 0.3 + i * 0.2, hz); // mortar lines
  k.box(4.4, 1.8, hd, CLAD, 0, 2.4, hz);
  for (let i = 0; i < 13; i++) {
    const x = -2.15 + i * 0.36;
    if (Math.abs(x) < 1.5) continue; // the door
    k.box(0.06, 1.75, 0.04, tone(CLAD, 0.8), x, 2.4, fz + 0.01);
  }
  for (const sx of [-1, 1]) {
    k.box(0.32, 3.1, 0.32, tone(BRICK, 0.85), sx * 2.12, 1.85, fz - 0.1);
    for (let i = 0; i < 6; i++) k.box(0.04, 1.7, 0.06, tone(CLAD, 0.8), sx * 2.21, 2.4, hz - 0.9 + i * 0.35);
    louvres(k, sx * 2.23, 3.0, hz, 0.04, 1.0, 5);
  }
  rollerDoor(k, 2.8, 2.2, 0, 0.3, fz + 0.01, 0x37474f);
  for (let i = 0; i < 8; i++) k.box(0.36, 0.14, 0.05, i % 2 ? 0x212121 : 0xffc400, -1.26 + i * 0.36, 2.92, fz + 0.03); // hazard band
  for (const sx of [-1, 1]) lamp(k, sx * 1.75, 3.05, fz + 0.06, 0.13);
  // Roof: a deck with a raised clerestory of windows along the middle
  const ry = 3.3;
  k.slab(4.7, 0.22, hd + 0.3, 0x37474f, 0, ry + 0.11, hz, { tw: 0.98, td: 0.94 });
  k.box(2.2, 0.6, hd - 0.2, 0x455a64, 0, ry + 0.52, hz);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) k.box(0.42, 0.38, 0.03, GLASS, -0.75 + i * 0.5, ry + 0.52, hz + s * (hd / 2 - 0.09));
  k.slab(2.45, 0.1, hd + 0.05, 0x263238, 0, ry + 0.87, hz, { tw: 0.9 });
  louvres(k, -1.7, ry + 0.23, hz + 0.3, 0.6, 0.8, 4);
  // Brick chimney with bands and a soot-black top
  const cx = 1.75;
  const cz = hz - 0.6;
  k.box(0.75, 0.6, 0.75, BRICK, cx, ry + 0.5, cz);
  k.cyl(0.36, 2.6, BRICK, cx, ry + 2.0, cz, { r2: 0.3, seg: 12 });
  for (const y of [ry + 1.2, ry + 2.4]) k.torus(0.34, 0.04, STEEL, cx, y, cz, { rx: PI / 2, seg: 12 });
  k.cyl(0.36, 0.25, 0x212121, cx, ry + 3.35, cz, { seg: 12 });
  k.cyl(0.22, 0.04, 0x050505, cx, ry + 3.48, cz, { seg: 10 });
  if (top && L >= 1) {
    // 50 Cal+: ammo crates by the door
    crate(k, 1.85, 0.6, 0.35, 0.5, 0.5, 0.7, 0x5d6b3a);
    crate(k, 1.85, 1.1, 0.35, 0.5, 0.45, 0.7, 0x5d6b3a);
    crate(k, 1.85, 0.6, 1.1, 0.5, 0.5, 0.7, 0x4b5a2a);
  }
  if (top && L >= 3) {
    // TOW Missile Upgrade: a launcher rack of three missile tubes on the roof
    const mx = -1.3;
    k.box(0.9, 0.12, 1.6, DARK, mx, ry + 0.35, hz + 0.3);
    for (const sx of [-1, 1]) k.box(0.08, 0.4, 0.08, DARK, mx + sx * 0.35, ry + 0.5, hz + 0.3);
    for (const x of [-0.27, 0, 0.27]) {
      k.cyl(0.12, 1.5, 0xeceff1, mx + x, ry + 0.75, hz + 0.3, { axis: 'z', seg: 10, rx: -0.25 });
      k.cyl(0.1, 0.04, 0xd32f2f, mx + x, ry + 0.94, hz + 1.03, { axis: 'z', seg: 10, rx: -0.25 });
    }
  }
  if (bottom && L >= 1) {
    // Vehicle / Veteran Training: a banner on a bracket on the left wall
    const bc = L >= 2 ? 0xffc400 : 0x2e7d32;
    k.box(0.3, 0.06, 0.06, STEEL, -2.36, 3.0, hz + 0.2);
    k.box(0.04, 1.4, 0.9, bc, -2.5, 2.25, hz + 0.2);
    k.box(0.04, 0.12, 0.9, tone(bc, 0.7), -2.51, 1.5, hz + 0.2);
    star(k, -2.53, 2.4, hz + 0.2, 0.25, 0xfafafa, { rz: PI / 2 });
  }
  k.done();
  if (top && L >= 4) {
    // Missile Turret: a glowing red radar panel on a mast
    const r = kit(u, u.body, 'armfactoryradar');
    const red = glowMat(u, 0xff1744);
    r.cyl(0.06, 0.8, DARK, -1.3, ry + 1.3, hz - 0.7, { seg: 6 });
    r.slab(1.1, 0.7, 0.14, 0x37474f, -1.3, ry + 1.95, hz - 0.7, { rx: -0.3 });
    r.box(0.95, 0.55, 0.04, red, -1.3, ry + 1.97, hz - 0.62, { rx: -0.3 });
    r.done();
  }
  if (bottom && L >= 4) {
    // Hall lights: a glowing strip along the front (green with the last upgrade)
    const h = kit(u, u.body, `armfactorylights${L >= 5 ? 5 : 4}`);
    h.box(4.4, 0.12, 0.08, glowMat(u, L >= 5 ? 0x76ff03 : 0xff9100), 0, 3.22, fz + 0.06);
    h.done();
  }
  const main = top ? ['afhumvee', 'afhumvee', 'afhumveetow', 'afhumveetow', 'afhumveemissile', 'afhumveemissile'][L] : 'afhumvee';
  park(u, main, 0.4, bottom && L >= 3 ? -1.1 : 0, 0.4, 1.3, PI / 2);
  const side = top ? (L >= 5 ? 'bradley' : null) : L >= 5 ? 'm1x' : L >= 4 ? 'abrams' : L >= 3 ? 'mrap' : null;
  if (side) park(u, side, 0.33, top ? -1.6 : 1.2, 0.3, top ? 1.1 : 1.3, top ? PI / 2 : 0);
  return u;
}
export const makeArmoredFactory = (level) => makeArmoredFactoryWith(level, false);
export const makeArmoredFactoryBottom = (level) => makeArmoredFactoryWith(level, true);

// ------------------------------------------------------------------ Fruit Farm

/** A round tree on (x, y, z): a tapered trunk with a branch and a canopy of three balls. */
function tree(k, x, y, z, leaves, s = 1) {
  k.cyl(0.14 * s, 1.1 * s, 0x5d4037, x, y + 0.55 * s, z, { r2: 0.09 * s, seg: 7 });
  k.cyl(0.05 * s, 0.5 * s, 0x5d4037, x + 0.18 * s, y + 0.95 * s, z, { rz: -0.6, seg: 5 });
  k.ball(0.55 * s, leaves, x, y + 1.55 * s, z, { seg: 10, rows: 7 });
  k.ball(0.38 * s, tone(leaves, 0.85), x + 0.35 * s, y + 1.35 * s, z + 0.15 * s, { seg: 8, rows: 6 });
  k.ball(0.36 * s, tone(leaves, 1.12), x - 0.3 * s, y + 1.4 * s, z - 0.2 * s, { seg: 8, rows: 6 });
}

/**
 * Fruit Farm (Farm's other form): a white farmhouse with a blue roof and a porch, a fenced plot and
 * a new crop every level: carrots, wheat, young trees, apple trees, then glowing space fruit.
 */
export function makeFarmFruit(level) {
  const L = lv(level, 4);
  const u = makeThing();
  const k = kit(u, u.body, `farmfruit${L}`);
  const SOIL = 0x6d4c41;
  k.slab(4.2, 0.3, 4.2, 0x7cb342, 0, 0.15, 0, { tw: 0.98, td: 0.98 }); // grass
  // Farmhouse: clapboard walls, a blue gable roof, a porch, a chimney and windows
  const hx = -1.1;
  const hz = -1.2;
  const W = 0xfff8e1;
  k.box(1.8, 1.4, 1.5, W, hx, 1.0, hz);
  for (let i = 1; i < 6; i++) k.box(1.82, 0.025, 1.52, tone(W, 0.85), hx, 0.3 + i * 0.24, hz); // boards
  gable(k, hx, 1.7, hz, 1.8, 1.5, 0.75, W, 0x1565c0, 0.18);
  k.box(0.32, 0.9, 0.32, 0x8d4e3c, hx + 0.5, 2.25, hz - 0.35); // chimney
  k.box(0.38, 0.08, 0.38, 0x5d4037, hx + 0.5, 2.72, hz - 0.35);
  k.box(0.45, 0.8, 0.05, 0x6d4c41, hx - 0.35, 0.7, hz + 0.76); // door
  k.ball(0.03, 0xc9a227, hx - 0.2, 0.7, hz + 0.79, { seg: 6, rows: 4 });
  windowAt(k, hx + 0.4, 1.15, hz + 0.76, 0.45, 0.4, 0xfafafa, 1);
  windowAt(k, hx, 2.05, hz + 0.76, 0.3, 0.3, 0xfafafa, 1);
  // Porch: a deck, two posts and a little roof
  k.box(1.7, 0.1, 0.55, 0xa1887f, hx, 0.35, hz + 1.05);
  for (const sx of [-1, 1]) k.cyl(0.04, 0.9, 0xfafafa, hx + sx * 0.75, 0.8, hz + 1.28, { seg: 6 });
  k.slab(1.8, 0.07, 0.65, 0x1565c0, hx, 1.27, hz + 1.05, { rx: 0.2 });
  // Fence along the front, a mailbox and a water pump
  fence(k, [-2.0, 1.95], [2.0, 1.95], 0.3, 0.55, 0xbcaaa4);
  k.cyl(0.03, 0.7, WOOD, 1.85, 0.65, -1.85, { seg: 5 });
  k.box(0.18, 0.18, 0.32, 0x1565c0, 1.85, 1.05, -1.85, { r: 0.06 });
  k.box(0.02, 0.12, 0.04, 0xd32f2f, 1.95, 1.15, -1.8);
  k.cyl(0.08, 0.7, 0x2e7d32, 0.4, 0.65, -1.6, { seg: 8 }); // pump
  k.box(0.04, 0.04, 0.45, 0x2e7d32, 0.4, 1.0, -1.45, { rx: -0.4 });
  k.cyl(0.03, 0.2, 0x2e7d32, 0.4, 0.82, -1.48, { rx: 1.2, seg: 6 });
  k.cyl(0.25, 0.18, 0x78909c, 0.4, 0.39, -1.35, { seg: 12 }); // bucket
  if (L <= 1) {
    // Carrots (Lv 1) or wheat (Lv 2) in rows on ridged soil
    for (let i = 0; i < 3; i++) k.box(3.4, 0.12, 0.42, SOIL, 0, 0.36, 0.2 + i * 0.6, { r: 0.05 });
    for (let i = 0; i < 3; i++) for (let j = 0; j < 6; j++) {
      const x = -1.55 + j * 0.62;
      const z = 0.2 + i * 0.6;
      if (L === 0) {
        k.cyl(0.08, 0.12, 0xff7043, x, 0.45, z, { seg: 6, r2: 0.06 }); // carrot top
        for (let f = 0; f < 3; f++) k.box(0.03, 0.34, 0.1, 0x43a047, x + Math.cos(f * 2.1) * 0.04, 0.66, z + Math.sin(f * 2.1) * 0.04, { rz: Math.cos(f * 2.1) * 0.35, rx: Math.sin(f * 2.1) * 0.35 });
      } else {
        for (let f = 0; f < 3; f++) {
          const ox = Math.cos(f * 2.1 + j) * 0.09;
          const oz = Math.sin(f * 2.1 + j) * 0.09;
          k.cyl(0.02, 0.8, 0xd4b24c, x + ox, 0.82, z + oz, { seg: 4, rz: ox * 0.8, rx: -oz * 0.8 });
          k.ball(0.06, 0xfbc02d, x + ox * 1.6, 1.25, z + oz * 1.6, { seg: 6, rows: 4, sy: 2.2 });
        }
      }
    }
  } else {
    // Trees (Lv 3), apple trees (Lv 4) or space fruit trees (Lv 5), with mulch rings
    const space = L >= 4;
    const leaves = space ? 0x1de9b6 : 0x2e7d32;
    const fruit = space ? glowMat(u, 0xd500f9) : 0xe53935;
    for (const [x, z] of [[-1.2, 0.6], [0.2, 1.2], [1.4, 0.4], [1.3, -1.2]]) {
      k.cyl(0.4, 0.06, SOIL, x, 0.33, z, { seg: 12 });
      tree(k, x, 0.3, z, leaves, 0.95);
      if (L >= 3) for (const [ox, oy, oz] of [[0.42, 1.35, 0.25], [-0.35, 1.6, 0.3], [0.1, 1.8, 0.45], [0.45, 1.6, -0.2], [-0.15, 1.3, 0.5]]) k.ball(0.09, fruit, x + ox, 0.3 + oy, z + oz, { seg: 6, rows: 4 });
    }
    if (L >= 3) {
      // A basket of picked fruit
      k.cyl(0.26, 0.3, 0xa1887f, -0.3, 0.45, 1.6, { r2: 0.3, seg: 10 });
      for (const [ox, oz] of [[-0.1, 0], [0.1, 0.05], [0, -0.1]]) k.ball(0.09, fruit, -0.3 + ox, 0.62, 1.6 + oz, { seg: 6, rows: 4 });
    }
    if (space) {
      // Space fruit: a little dome sprinkler that waters the trees
      k.cyl(0.2, 0.25, 0xcfd8dc, -0.3, 0.42, -0.3, { seg: 10 });
      k.ball(0.18, glowMat(u, 0x18ffff), -0.3, 0.55, -0.3, { seg: 10, rows: 5 });
    }
  }
  k.done();
  u.static = true;
  return u;
}

// ------------------------------------------------------------------ Airdrop Farm

/**
 * Airdrop Farm (Farm's other form): a helipad with a yellow landing square, a control hut with a
 * mast and a windsock. Top path: green landing lights (Lv 1), a crate (Lv 2), a medical tent
 * (Lv 3), a bank vault (Lv 4), a radar dish and red beacons (Lv 5). Bottom path: piles of cash
 * crates that grow every level, gold bars (Lv 4), taller piles (Lv 5).
 */
export function makeFarmAirdrop(level, bottom = false) {
  const L = lv(level);
  const u = makeThing();
  const k = kit(u, u.body, `farmairdrop${bottom ? 'B' : 'T'}${L}`);
  k.slab(4.4, 0.3, 4.4, CONCRETE, 0, 0.15, 0, { tw: 0.97, td: 0.97 });
  k.box(3.4, 0.03, 3.4, 0xffc107, 0, 0.31, 0.3); // yellow landing square
  k.box(3.0, 0.04, 3.0, tone(CONCRETE, 0.92), 0, 0.32, 0.3);
  const white = 0xfafafa;
  for (const x of [-0.6, 0.6]) k.box(0.3, 0.04, 1.8, white, x, 0.34, 0.3); // the H
  k.box(1.2, 0.04, 0.3, white, 0, 0.34, 0.3);
  for (let i = 0; i < 4; i++) k.box(1.2, 0.025, 0.04, tone(CONCRETE, 0.8), 0, 0.31, -1.95 + i * 1.3); // slab joints
  // Control hut: walls, a window band, a door, a roof with an overhang, an aerial
  const hx = -1.55;
  const hz = -1.65;
  k.box(1.1, 1.1, 0.9, 0x546e7a, hx, 0.85, hz, { r: 0.03 });
  k.box(0.9, 0.3, 0.04, GLASS, hx, 1.1, hz + 0.46);
  k.box(0.04, 0.3, 0.6, GLASS, hx + 0.56, 1.1, hz);
  k.box(0.35, 0.65, 0.04, 0x37474f, hx - 0.3, 0.63, hz + 0.46);
  k.slab(1.3, 0.1, 1.1, 0x37474f, hx, 1.45, hz, { tw: 0.9, td: 0.9 });
  antenna(k, hx - 0.4, 1.5, hz - 0.3, 1.2);
  windsock(k, 1.9, -1.9, 2.2);
  const crateAt = (x, z, y = 0.3, s = 0.65) => cashCrate(k, x, y, z, s);
  if (!bottom) {
    if (L >= 2) {
      // Precision Crates: a crate with its folded parachute on top
      crateAt(1.2, 1.3);
      k.ball(0.28, 0xeeeeee, 1.2, 1.02, 1.3, { seg: 8, rows: 5, sy: 0.4 });
      k.torus(0.2, 0.03, 0xd32f2f, 1.2, 1.03, 1.3, { rx: PI / 2, seg: 10 });
    }
    if (L >= 3) {
      // Medical Aid: a white ridge tent with a red cross
      k.prism([[-0.6, 0], [0.6, 0], [0.45, 0.8], [-0.45, 0.8]], 1.0, white, -0.2, 0.3, -1.7, { ry: PI / 2 });
      k.box(0.95, 0.06, 1.05, 0xe0e0e0, -0.2, 1.12, -1.7);
      k.box(0.4, 0.12, 0.03, 0xd32f2f, -0.2, 0.75, -1.18);
      k.box(0.12, 0.4, 0.03, 0xd32f2f, -0.2, 0.75, -1.18);
    }
    if (L >= 4) {
      // Tower Economics: a little bank vault with a round door
      k.box(0.9, 1.3, 0.9, 0x455a64, 1.0, 0.95, -1.6, { r: 0.05 });
      k.cyl(0.36, 0.08, 0x90a4ae, 1.0, 0.95, -1.13, { axis: 'z', seg: 18 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * PI * 2;
        k.box(0.04, 0.22, 0.04, STEEL, 1.0 + Math.cos(a) * 0.12, 0.95 + Math.sin(a) * 0.12, -1.07, { rz: a + PI / 2 });
      }
      k.slab(1.0, 0.12, 1.0, 0x37474f, 1.0, 1.66, -1.6, { tw: 0.8, td: 0.8 });
    }
  } else {
    // More crates every level, gold bars, then taller piles
    const spots = [[1.4, 1.6], [1.4, 0.8], [-1.4, 1.6], [-1.4, 0.8], [0.6, -1.4]];
    for (let i = 0; i < Math.min(L, spots.length); i++) crateAt(spots[i][0], spots[i][1]);
    if (L >= 3) crateAt(1.4, 1.6, 0.95, 0.55);
    if (L >= 5) {
      crateAt(-1.4, 0.8, 0.95, 0.55);
      crateAt(-1.4, 1.6, 0.95, 0.55);
    }
  }
  k.done();
  if (L >= 1 && !bottom) {
    // Landing lights: green lamps round the landing square
    const g = kit(u, u.body, 'farmairdroplights');
    const green = glowMat(u, 0x76ff03);
    for (const [x, z] of [[-1.8, 1.9], [1.8, 1.9], [-1.8, -1.3], [1.8, -1.3], [0, 1.9]]) {
      g.cyl(0.1, 0.1, DARK, x, 0.36, z, { seg: 8 });
      g.ball(0.08, green, x, 0.44, z, { seg: 6, rows: 4 });
    }
    g.done();
  }
  if (L >= 4) {
    const v = kit(u, u.body, `farmairdropgold${bottom ? 'B' : 'T'}`);
    const gold = glowMat(u, 0xffd54f);
    if (bottom) for (const [x, y, z] of [[-0.25, 0.32, -1.5], [0.05, 0.32, -1.5], [-0.1, 0.46, -1.5]]) goldBar(v, gold, x, y, z, PI / 2);
    else v.box(0.5, 0.5, 0.04, gold, 1.0, 1.42, -1.13); // $ sign over the vault door
    v.done();
  }
  if (L >= 5 && !bottom) {
    // Emergency Airdrop: a dish on the hut roof and red beacons on the front corners
    const b = kit(u, u.body, 'farmairdropbeacons');
    const red = glowMat(u, 0xff1744);
    b.cyl(0.06, 0.5, DARK, -1.55, 1.75, -1.65, { seg: 6 });
    for (const [x, z] of [[-2.05, 2.05], [2.05, 2.05]]) {
      b.cyl(0.14, 0.2, DARK, x, 0.4, z, { seg: 8 });
      b.ball(0.13, red, x, 0.58, z, { seg: 8, rows: 5 });
    }
    b.done();
    dish(u, u.body, 'farmairdropdish', -1.55, 2.05, -1.65, 0.45, 0xeceff1, red);
  }
  return u;
}
export const makeFarmAirdropBottom = (level) => makeFarmAirdrop(level, true);

// ------------------------------------------------------------------ Attack Helicopter (Pursuit's other form)

/**
 * Attack Helicopter: a dark helipad with red edge lights, a fuel tank and a path flag, plus the
 * helicopter from makeHeli. Top path: olive Huey (Lv 4), green Apache (Lv 5), black-and-red War
 * Apache (Lv 6). Bottom path: grey Viper (Lv 4-5), then a black Stealth Comanche with purple trim.
 * Lv 3 rearm crates and a rocket trolley by the pad.
 */
export function makeHelicopterModel(level, bottom) {
  const L = lv(level);
  const u = makeThing();
  const k = kit(u, u.body, `heliattackpad${bottom ? 'B' : 'T'}${L}`);
  helipad(k, u, { col: 0x37474f, mark: 0xfafafa, light: 0xff1744 });
  fuelTank(k, 1.75, -1.75);
  if (L >= 1) flagPole(k, -1.9, 0.3, -2.1, 1.9, bottom ? 0x546e7a : 0x2e7d32, 0xfafafa);
  if (L >= 3) {
    // Rearm: ammo boxes and a trolley of rockets
    crate(k, -1.7, 0.53, 1.35, 0.9, 0.42, 0.5, OLIVE);
    crate(k, -1.7, 0.53, 1.95, 0.9, 0.42, 0.5, OLIVE);
    const tx = 1.6;
    const tz = 1.6;
    k.box(0.9, 0.08, 0.6, 0x37474f, tx, 0.55, tz);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.cyl(0.09, 0.06, 0x15171a, tx + sx * 0.35, 0.42, tz + sz * 0.26, { axis: 'x', seg: 8 });
    for (const [oz, oy] of [[-0.14, 0.68], [0.14, 0.68], [0, 0.85]]) {
      k.cyl(0.07, 0.8, 0x6b7d3a, tx, oy, tz + oz, { axis: 'x', seg: 8 });
      k.cyl(0.07, 0.15, 0xe53935, tx + 0.47, oy, tz + oz, { axis: 'x', r2: 0.01, seg: 8 });
    }
  }
  k.done();
  const big = L >= 5;
  const look = bottom
    ? { color: big ? 0x1a1a1a : 0x546e7a, trim: big ? 0xd500f9 : 0x263238 }
    : { color: big ? 0x1b1b1b : L >= 4 ? 0x33691e : 0x6b7d3a, trim: big ? 0xd50000 : 0x263238 };
  const { heli, muzzles } = makeHeli(u, level, bottom && L >= 3, look);
  u.plane = heli;
  u.heli = true;
  u.muzzles = muzzles;
  u.spin = u.spin ?? null;
  u.flyHeight = 13;
  u.tracer = big ? (bottom ? 0xea80fc : 0xff5252) : 0xffd740;
  return u;
}
export const makeHelicopter = (level) => makeHelicopterModel(level, false);
export const makeHelicopterBottom = (level) => makeHelicopterModel(level, true);

// ------------------------------------------------------------------ Helicopter

/**
 * Helicopter (levels 0-4): a helipad the helicopter (heliCraft) flies from, with a windsock.
 * Lv 1 a fuel tank, Lv 2 red edge lights, Lv 3 rocket crates, Lv 4 a military pad: olive paint,
 * a white star, sandbags.
 */
export function makeHelicopterPad(level) {
  const L = lv(level, 4);
  const u = makeThing();
  const mil = L >= 4;
  const k = kit(u, u.body, `helipad${L}`);
  helipad(k, u, { col: mil ? 0x4b5320 : 0x757575, mark: mil ? 0xfafafa : 0xfdd835, light: L >= 2 ? 0xff1744 : 0xff9100 });
  windsock(k, 1.8, -1.8);
  if (L >= 1) fuelTank(k, -1.75, -1.75);
  if (L >= 3) {
    // Rocket crates: long olive boxes with stencilled ends
    for (const z of [1.35, 1.9]) {
      crate(k, -1.7, 0.53, z, 1.0, 0.42, 0.48, OLIVE);
      k.box(0.03, 0.2, 0.3, HAZARD, -2.21, 0.53, z);
    }
  }
  if (mil) {
    for (let i = 0; i < 4; i++) {
      bag(k, 0.7, 0.42, -1.05 + i * 0.7, 0.3, 2.05);
      if (i < 3) bag(k, 0.66, 0.4, -0.7 + i * 0.7, 0.62, 2.05, tone(SANDBAG, 1.06));
    }
    star(k, 1.45, 0.33, 1.45, 0.45, 0xfafafa);
  }
  k.done();
  const { heli, muzzles, spin } = heliCraft(u, L);
  u.plane = heli;
  u.heli = true;
  u.muzzles = muzzles;
  u.spin = spin.length ? spin : null;
  u.flyHeight = 13;
  u.tracer = mil ? 0xff5252 : 0xffd740;
  return u;
}

// ------------------------------------------------------------------ XWM Turret

/** One XWM leg at side sx: a hip drum, a thigh, a knee, a shin with a piston and a toed foot. */
function xwmLeg(k, sx, metal, dark) {
  const x = sx * 1.25;
  k.plan([[-0.55, -0.7], [0.55, -0.7], [0.65, 0.5], [0.3, 0.95], [-0.3, 0.95], [-0.65, 0.5]], 0.22, dark, x, 0.4, 0, { bevel: 0.06 }); // foot
  for (const ox of [-0.35, 0, 0.35]) k.box(0.18, 0.12, 0.3, tone(dark, 1.2), x + ox, 0.48, 1.0, { r: 0.04 }); // toes
  k.slab(0.6, 0.9, 0.7, metal, x, 1.05, 0.05, { tw: 0.85, td: 0.8 }); // shin
  k.ball(0.3, dark, x, 1.6, 0.1, { seg: 10, rows: 6 }); // knee
  k.slab(0.7, 0.95, 0.75, tone(metal, 0.92), x, 2.05, -0.05, { bw: 0.85, bd: 0.85 }); // thigh
  k.cyl(0.38, 0.5, dark, x, 2.55, 0, { axis: 'x', seg: 14 }); // hip drum
  k.cyl(0.18, 0.54, STEEL, x, 2.55, 0, { axis: 'x', seg: 10 });
  strut(k, [x + sx * 0.36, 1.0, 0.25], [x + sx * 0.36, 2.2, 0.2], 0.05, STEEL); // piston
  k.cyl(0.08, 0.5, DARK, x + sx * 0.36, 1.25, 0.24, { seg: 8 });
  bolts(k, [x + sx * 0.36, 1.9, -0.25], [x + sx * 0.36, 2.35, -0.25], 3, STEEL, 0.04);
}

/**
 * XWM Turret (Turret's other form): a gun pod on two stubby walker legs with a pilot behind the
 * glass and a purple Dimension Shard on its side. Top path: longer guns, then 2 and 4 spinning
 * miniguns (Lv 5 cyan). Bottom path: heavier barrels, then rocket boxes and huge missile pods.
 */
export function makeXwm(level, bottom = false) {
  const L = lv(level);
  const u = makeThing();
  const top = !bottom;
  const metal = L >= 5 ? 0x37474f : 0x607d8b;
  const dark = 0x263238;
  const key = `xwm${bottom ? 'B' : 'T'}${L}`;
  const shard = glowMat(u, 0xb388ff);
  const base = kit(u, u.body, key + ':base');
  pad(base, 4.6, 0.4, CONCRETE, true);
  for (const sx of [-1, 1]) xwmLeg(base, sx, metal, dark);
  base.box(1.8, 0.5, 0.9, dark, 0, 2.55, 0, { r: 0.08 }); // pelvis
  base.done();
  // Cockpit pod (the guns hang off it)
  const head = new THREE.Group();
  head.position.set(0, 2.7, 0);
  u.body.add(head);
  const h = kit(u, head, key + ':pod');
  const glass = seeThrough(u, 0x80d8ff, 0.55);
  const outline = [[-1.5, -1.4], [1.5, -1.4], [1.5, 0.9], [1.0, 1.5], [-1.0, 1.5], [-1.5, 0.9]];
  // Lower hull, the upper hull behind the cab, two cheeks beside it and a roof over all
  h.plan(outline, 1.0, metal, 0, 0, 0, { bevel: 0.12 });
  h.plan([[-1.5, -1.4], [1.5, -1.4], [1.5, 0.4], [-1.5, 0.4]], 1.0, metal, 0, 1.0, 0);
  for (const sx of [-1, 1]) h.plan([[sx * 1.0, 0.4], [sx * 1.5, 0.4], [sx * 1.5, 0.9], [sx * 1.0, 1.5]], 1.0, metal, 0, 1.0, 0);
  h.plan(outline, 0.2, tone(metal, 0.85), 0, 2.0, 0, { bevel: 0.06 });
  // The pilot: a body, a helmeted head and a visor, under a slanted window
  h.box(0.8, 0.5, 0.45, 0x37474f, 0, 1.2, 0.65, { r: 0.1 });
  h.ball(0.26, 0xe0ac69, 0, 1.62, 0.7, { seg: 10, rows: 7 });
  h.ball(0.29, 0x455a64, 0, 1.68, 0.67, { seg: 10, rows: 6, sy: 0.85 });
  h.box(0.36, 0.1, 0.06, 0x111111, 0, 1.62, 0.95);
  h.box(2.0, 1.32, 0.05, glass, 0, 1.5, 1.0, { rx: -0.7 });
  h.box(2.0, 0.08, 0.14, DARK, 0, 1.98, 0.55); // window frame
  h.box(2.0, 0.08, 0.14, DARK, 0, 1.02, 1.45);
  h.box(0.06, 1.32, 0.08, DARK, 0, 1.5, 1.02, { rx: -0.7 });
  // Details: louvres and a hatch on top, lamps, side grab bars, the shard emblem
  louvres(h, 0, 2.21, -0.8, 1.6, 0.6, 5);
  hatch(h, 0.6, 2.22, 0.2, 0.3, tone(metal, 0.9));
  antenna(h, -1.1, 2.2, -1.1, 1.4);
  for (const sx of [-1, 1]) {
    lamp(h, sx * 0.85, 0.5, 1.48, 0.12);
    h.box(0.06, 0.06, 1.6, STEEL, sx * 1.52, 1.75, -0.3);
  }
  h.cyl(0.25, 0.08, shard, L >= 1 ? 1.75 : 1.53, 0.6, 0.0, { axis: 'x', seg: 4 });
  if (L >= 1) for (const sx of [-1, 1]) {
    // Armour plates on the sides
    h.slab(0.2, 1.5, 2.4, 0x455a64, sx * 1.62, 1.0, -0.2, { td: 0.9 });
    bolts(h, [sx * 1.73, 1.6, -1.2], [sx * 1.73, 1.6, 0.8], 5, STEEL, 0.04);
  }
  // Gun pylons out to both sides
  for (const sx of [-1, 1]) h.box(0.5, 0.35, 0.8, dark, sx * 1.75, 0.9, 0.6, { r: 0.06 });
  if (top && L < 3) {
    const len = L >= 2 ? 4 : 3;
    const r = L >= 1 ? 0.22 : 0.17;
    for (const x of [-1.95, 1.95]) {
      h.box(0.6, 0.6, 0.9, GUN, x, 0.9, 0.7, { r: 0.08 });
      barrel(h, x, 0.9, 1.1, len, r, GUN, { sleeve: true, brake: L >= 1 });
      gunMuzzle(u, head, x, 0.9, 1.2 + len);
    }
  } else if (bottom && L < 3) {
    const len = 3 + L * 0.5;
    const r = 0.2 + L * 0.06;
    for (const x of [-1.95, 1.95]) {
      h.box(0.7, 0.7, 1.0, GUN, x, 0.9, 0.7, { r: 0.08 });
      barrel(h, x, 0.9, 1.15, len, r, GUN, { brake: true, evac: 0.5 });
      gunMuzzle(u, head, x, 0.9, 1.25 + len);
    }
  } else if (bottom) {
    // Rocket Launchers / Missile Pods: boxes of tubes on each side
    const big = L >= 4;
    const pod = big ? 2.0 : 1.4;
    const n = big ? 3 : 2;
    const fire = L >= 5 ? glowMat(u, 0xff3d00) : null;
    for (const sx of [-1, 1]) {
      const px = sx * (1.5 + pod / 2);
      h.box(pod, pod, 2.2, L >= 5 ? 0x263238 : OLIVE, px, 1.0, 0.3, { r: 0.08 });
      h.box(pod + 0.04, 0.1, 2.24, tone(OLIVE, 0.7), px, 1.0 + pod / 2 - 0.15, 0.3);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const ox = px + (i - (n - 1) / 2) * (pod / n);
        const oy = 1.0 + (j - (n - 1) / 2) * (pod / n);
        h.cyl(pod / n / 2 - 0.08, 0.08, 0x0e0f10, ox, oy, 1.4, { axis: 'z', seg: 10 });
        h.cyl(pod / n / 2 - 0.16, 0.06, fire ?? 0xd84315, ox, oy, 1.38, { axis: 'z', seg: 8 });
      }
      gunMuzzle(u, head, px, 1.0, 1.6);
    }
    u.projectile = { color: 0xff7043, size: L >= 5 ? 0.6 : 0.45 };
  }
  h.done();
  if (top && L >= 3) {
    // Dual / Quad / Super Quad Miniguns
    const xs = L >= 4 ? [-2.05, -1.45, 1.45, 2.05] : [-1.95, 1.95];
    const len = L >= 5 ? 3.6 : 3;
    const cyan = L >= 5 ? glowMat(u, 0x18ffff) : null;
    const m = kit(u, head, key + ':mounts');
    for (const x of xs) m.box(0.45, 0.45, 0.6, GUN, x, 0.9, 1.1, { r: 0.06 });
    m.done();
    for (const x of xs) {
      spinBarrels(u, head, `${key}:mini`, x, 0.9, 1.35, len, 6, 0.18, L >= 5 ? 0x263238 : GUN, cyan);
      gunMuzzle(u, head, x, 0.9, 1.4 + len);
    }
  }
  u.tracer = bottom ? 0xff7043 : L >= 5 ? 0x18ffff : 0xffe066;
  if (bottom && L < 3) u.tracer = 0xffab40;
  u.static = true;
  return u;
}
export const makeXwmBottom = (level) => makeXwm(level, true);

// ------------------------------------------------------------------ Barracks

/**
 * Barracks (levels 0-4): Lv 0 a green tent and a yard with crates and a green flag; Lv 1 a
 * satellite dish on the tent and a soldier leaning outside; Lv 2 a longer tent with a side door
 * and a Tuber sitting on a crate; Lv 3 a proper block building; Lv 4 a dark Techno Fort.
 */
export function makeBarracks(level) {
  const L = lv(level, 4);
  const u = makeThing();
  const k = kit(u, u.body, `barracks${L}`);
  k.slab(4.6, 0.25, 4.6, L >= 4 ? 0x37474f : L >= 3 ? 0x8d8d80 : 0x8d7b5a, 0, 0.125, 0, { tw: 0.98, td: 0.98 }); // yard
  if (L <= 2) {
    const canvas = 0x558b2f;
    tent(k, 0, -0.6, L >= 2 ? 1.3 : 1.1, canvas);
    if (L >= 2) {
      // Second door: a flap on the right side of the tent
      k.box(0.05, 1.0, 0.7, 0x1b1d1f, 0.92, 1.15, -0.3, { rz: 0.525 });
    }
    woodCrate(k, 1.6, 0.25, 1.6, 0.7);
    woodCrate(k, 1.6, 0.95, 1.6, 0.5, WOOD, 0.4);
    woodCrate(k, -1.7, 0.25, 1.7, 0.6);
    flagPole(k, -1.9, 0.25, -1.9, 3.2, 0x2e7d32, 0xfafafa);
    if (L >= 2) woodCrate(k, 1.75, 0.25, -0.2, 0.8);
    if (L >= 1) k.cyl(0.05, 0.4, DARK, 0, 0.25 + 1.9 * (L >= 2 ? 1.3 : 1.1) + 0.1, -1.4, { seg: 6 }); // dish mast
    // Stove pipe through the canvas
    k.cyl(0.08, 1.0, DARK, -0.6, 2.45, -1.6, { seg: 8 });
    k.cyl(0.13, 0.1, DARK, -0.6, 2.98, -1.6, { seg: 8 });
  } else if (L === 3) {
    // A proper building: block walls, a parapet roof, two doors with canopies, windows
    const wall = 0x9e9e8c;
    k.box(3.8, 2.6, 2.8, wall, 0, 1.55, -0.7, { r: 0.03 });
    for (let i = 1; i < 6; i++) k.box(3.82, 0.025, 2.82, tone(wall, 0.85), 0, 0.25 + i * 0.44, -0.7);
    k.box(3.9, 0.3, 2.9, 0x556b2f, 0, 0.4, -0.7); // painted base
    k.box(4.0, 0.25, 3.0, 0x616161, 0, 2.95, -0.7);
    for (const [w, d, x, z] of [[4.0, 0.12, 0, 0.74], [4.0, 0.12, 0, -2.14], [0.12, 3.0, 1.94, -0.7], [0.12, 3.0, -1.94, -0.7]]) k.box(w, 0.3, d, 0x757575, x, 3.2, z); // parapet
    for (const x of [-1.0, 1.0]) {
      k.box(0.9, 1.7, 0.06, 0x3e2723, x, 1.1, 0.71);
      k.ball(0.05, 0xffc107, x + 0.3, 1.1, 0.76, { seg: 6, rows: 4 });
      k.slab(1.2, 0.08, 0.5, 0x556b2f, x, 2.1, 0.92, { rx: 0.25 });
    }
    windowAt(k, -1.65, 2.25, 0.71, 0.4, 0.35, 0xeceff1, 1);
    windowAt(k, 0, 2.25, 0.71, 0.6, 0.35, 0xeceff1, 1);
    windowAt(k, 1.65, 2.25, 0.71, 0.4, 0.35, 0xeceff1, 1);
    louvres(k, -0.8, 3.08, -1.2, 1.0, 0.8, 4);
    k.box(0.8, 0.45, 0.6, 0xcfd8dc, 0.4, 3.3, -1.5, { r: 0.04 }); // air conditioner
    k.cyl(0.06, 0.4, DARK, 1.2, 3.25, -1.4, { seg: 6 }); // dish mast
    k.cyl(0.18, 0.04, DARK, 0.4, 3.53, -1.5, { seg: 12 });
    flagPole(k, -1.6, 3.07, -1.8, 2.4, 0x2e7d32, 0xfafafa);
    for (const x of [-1.8, -1.05, 1.05, 1.8]) bag(k, 0.7, 0.5, x, 0.25, 2.0);
    for (const x of [-1.45, 1.45]) bag(k, 0.66, 0.48, x, 0.57, 2.0, tone(SANDBAG, 1.06));
    woodCrate(k, 1.9, 0.25, 1.2, 0.6);
  } else {
    // Techno Fort: dark armoured walls, round corner towers, a gate with light bars, a dome turret
    const plate = 0x263238;
    const dark = 0x151b1f;
    k.box(3.8, 2.8, 3.2, plate, 0, 1.65, -0.5, { r: 0.05 });
    for (let i = 0; i < 5; i++) k.box(0.06, 2.6, 0.04, tone(plate, 0.75), -1.5 + i * 0.75, 1.65, 1.11);
    for (const x of [-1.6, -0.55, 0.55, 1.6]) k.slab(0.6, 0.5, 3.2, plate, x, 3.3, -0.5, { tw: 0.8 }); // battlements
    for (const [x, z] of [[-2.0, 1.0], [2.0, 1.0], [-2.0, -2.0], [2.0, -2.0]]) {
      k.cyl(0.55, 3.8, dark, x, 2.15, z, { seg: 14 });
      k.cyl(0.65, 0.3, plate, x, 4.15, z, { seg: 14 });
      k.cyl(0.5, 0.1, 0x0b0e10, x, 4.31, z, { seg: 12 });
    }
    k.box(1.4, 2.0, 0.1, 0x0d1117, 0, 1.25, 1.12); // gate
    k.ball(1.0, dark, 0, 3.05, -0.8, { seg: 16, rows: 8, sy: 0.75 }); // dome turret
    k.cyl(1.05, 0.15, plate, 0, 3.1, -0.8, { seg: 18 });
    barrel(k, 0, 3.55, -0.2, 1.9, 0.16, 0x37474f, { sleeve: true });
    antenna(k, 1.0, 3.55, -1.6, 2.4);
  }
  k.done();
  if (L >= 1 && L <= 2) dish(u, u.body, 'barracksdish', 0.0, 0.25 + 1.9 * (L >= 2 ? 1.3 : 1.1) + 0.3, -1.4, 0.5, 0xeceff1, glowMat(u, 0xff1744));
  if (L === 3) dish(u, u.body, 'barracksdish3', 1.2, 3.35, -1.4, 0.5, 0xeceff1, glowMat(u, 0xff1744));
  if (L >= 1 && L <= 2) {
    // A soldier leaning on the tent pole outside, arms crossed
    const s = person(u, greenSoldier(), -1.55, 0.25, 0.9, 0.5);
    s.root.rotation.z = 0.12;
    s.rightArm.rotation.set(-1.3, 0, -0.9);
    s.leftArm.rotation.set(-1.3, 0, 0.9);
  }
  if (L === 2) {
    // A Tuber sitting on a crate by the side door
    const t = person(u, tuberSoldier(), 1.75, 0.6, -0.25, -PI / 2 + 0.6);
    for (const leg of [t.rightLeg, t.leftLeg]) leg.rotation.x = -PI / 2;
    t.body.position.y = -0.9;
  }
  if (L === 3) {
    person(u, greenSoldier(), -0.3, 0.25, 1.3, 0.3);
    person(u, tuberSoldier(), 0.9, 0.25, 1.4, -0.3, 0.3);
  }
  if (L >= 4) {
    // Light trims, tower lights, gate bars, a hologram flag
    const n = kit(u, u.body, 'barracksfortglow');
    const neon = glowMat(u, 0x00e5ff);
    const red = glowMat(u, 0xff1744);
    n.box(3.82, 0.1, 3.22, neon, 0, 2.6, -0.5);
    n.box(1.5, 0.1, 0.12, neon, 0, 2.3, 1.13);
    for (const x of [-0.4, 0, 0.4]) n.box(0.06, 1.8, 0.05, neon, x, 1.25, 1.18);
    for (const [x, z] of [[-2.0, 1.0], [2.0, 1.0], [-2.0, -2.0], [2.0, -2.0]]) {
      n.torus(0.56, 0.05, neon, x, 3.6, z, { rx: PI / 2, seg: 14 });
      n.ball(0.16, red, x, 4.45, z, { seg: 8, rows: 5 });
    }
    n.ball(0.13, neon, 1.0, 5.95, -1.6, { seg: 8, rows: 5 });
    n.cyl(0.04, 1.8, 0x9e9e9e, -1.0, 4.4, -1.95, { seg: 6 });
    n.box(0.05, 0.7, 1.1, seeThrough(u, 0x00e5ff, 0.6, true), -1.0, 5.0, -1.4);
    n.done();
    const c = person(u, commandoSoldier(), -1.3, 0.25, 1.9, 0.2, 0.28);
    c.root.rotation.y = 0.2;
    person(u, greenSoldier(), 1.3, 0.25, 1.9, -0.2);
  }
  gunMuzzle(u, u.body, 0, 1.0, 2.0);
  u.height = L >= 4 ? 4.5 : L >= 3 ? 3.3 : 2.8;
  return u;
}

// ------------------------------------------------------------------ Field Barracks

/**
 * Field Barracks (Barracks' other form): a sandbagged canvas outpost with a flagpole and a Scout
 * on guard. Top path: an ammo crate (Lv 1), a radio mast (Lv 3), a glowing rail charging rack
 * (Lv 5). Bottom path: a training dummy (gold-topped from Lv 2), a rocket crate (Lv 3), a riot
 * shield rack (Lv 4), red fuel drums (Lv 5).
 */
export function makeFieldBarracksWith(level, bottom) {
  const L = lv(level);
  const u = makeThing();
  const k = kit(u, u.body, `fieldbarracks${bottom ? 'B' : 'T'}${L}`);
  k.slab(4.6, 0.25, 4.6, 0x8d7b5a, 0, 0.125, 0, { tw: 0.98, td: 0.98 }); // dirt pad
  for (const [x, z, r] of [[1.2, 0.3, 0.35], [-0.6, 1.8, 0.25], [0.4, 1.5, 0.3]]) k.cyl(r, 0.03, 0x7a6a4c, x, 0.26, z, { seg: 10 }); // trodden patches
  const canvas = bottom ? [0x8d9a5b, 0x8d9a5b, 0x8d9a5b, 0x7a6a4f, 0x5d4037, 0x4e342e][L] : [0x8d9a5b, 0x8d9a5b, 0x6b7d3a, 0x7a6a4f, 0x37474f, 0x263238][L];
  tent(k, 0, -0.8, 1.0, canvas);
  // Sandbag walls along the front and the sides, two rows
  for (const x of [-1.8, -1.1, 1.1, 1.8]) bag(k, 0.66, 0.5, x, 0.25, 1.6);
  for (const x of [-1.45, 1.45]) bag(k, 0.64, 0.48, x, 0.57, 1.6, tone(SANDBAG, 1.06));
  for (const sx of [-1, 1]) for (const z of [0.2, 0.9]) {
    bag(k, 0.5, 0.66, sx * 2.0, 0.25, z);
    bag(k, 0.48, 0.62, sx * 2.0, 0.57, z + 0.35, tone(SANDBAG, 1.06));
  }
  flagPole(k, 1.8, 0.25, -1.8, 3.2, L >= 4 ? 0xffc400 : bottom ? 0xc62828 : 0x1e88e5, 0xfafafa);
  // Camp stool and a lantern
  k.cyl(0.18, 0.06, WOOD, 1.25, 0.6, 1.0, { seg: 10 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    strut(k, [1.25 + Math.cos(a) * 0.15, 0.25, 1.0 + Math.sin(a) * 0.15], [1.25, 0.58, 1.0], 0.025, WOOD);
  }
  if (!bottom) {
    if (L >= 1) crate(k, 1.3, 0.55, 0.3, 0.8, 0.6, 0.6, 0x5d6b3a); // ammo crate
    if (L >= 3) {
      // Radio mast with guy wires and a radio set at its foot
      k.cyl(0.05, 3.0, 0x424242, -1.9, 1.75, -1.9, { seg: 6 });
      for (const [dx, dz] of [[0.6, 0], [0, 0.6]]) strut(k, [-1.9, 3.0, -1.9], [-1.9 + dx, 0.27, -1.9 + dz], 0.012, 0x9e9e9e);
      k.box(0.5, 0.35, 0.35, 0x4b5a2a, -1.55, 0.43, -1.5, { r: 0.04 });
      k.box(0.3, 0.12, 0.02, 0x111111, -1.55, 0.48, -1.32);
    }
    if (L >= 5) {
      // Rail charging rack: a frame with three glowing rails behind the tent
      k.box(1.6, 1.4, 0.35, 0x37474f, 0.4, 0.95, -2.2, { r: 0.04 });
      k.box(1.7, 0.12, 0.45, DARK, 0.4, 1.7, -2.2);
    }
  } else {
    if (L >= 1) {
      // Troop Training: a straw dummy on a post
      k.cyl(0.05, 1.4, WOOD, 1.4, 0.95, 0.6, { seg: 6 });
      k.box(0.7, 0.06, 0.06, WOOD, 1.4, 1.45, 0.6);
      k.cyl(0.26, 0.7, 0xd7b46a, 1.4, 1.35, 0.6, { r2: 0.2, seg: 8 });
      k.box(0.54, 0.04, 0.54, 0xb08a3a, 1.4, 1.1, 0.6); // rope belt
      k.box(0.2, 0.2, 0.04, 0xd32f2f, 1.4, 1.4, 0.87); // target
    }
    if (L >= 3) {
      crate(k, -1.5, 0.5, -1.9, 1.0, 0.5, 0.6, 0x4b5320); // rocket crate
      k.cyl(0.08, 0.9, 0x6b7d3a, -1.5, 0.82, -1.9, { axis: 'x', seg: 8 });
    }
    if (L >= 4) {
      // Riot shields leaning on a rack
      k.box(1.1, 0.08, 0.08, WOOD, 0, 1.45, -2.25);
      for (const x of [-0.3, 0.2]) {
        k.slab(0.08, 1.4, 0.8, 0x90a4ae, x, 0.98, -2.1, { rx: -0.15 });
        k.box(0.09, 0.22, 0.6, 0x263238, x, 1.3, -2.08, { rx: -0.15 });
      }
    }
    if (L >= 5) for (const x of [1.0, 1.6]) drum(k, x, 0.25, -1.7, 0xc62828, 0xfdd835);
  }
  k.done();
  if (bottom && L >= 1) {
    const d = kit(u, u.body, `fieldbarracksdummy${L >= 2 ? 'G' : 'S'}`);
    d.ball(0.22, L >= 2 ? glowMat(u, 0xffc400, 0.4) : 0xd7b46a, 1.4, 1.95, 0.6, { seg: 8, rows: 6 });
    d.done();
  }
  if (!bottom && L >= 3) {
    const r = kit(u, u.body, 'fieldbarracksradio');
    r.ball(0.12, glowMat(u, 0xff1744), -1.9, 3.3, -1.9, { seg: 8, rows: 5 });
    r.done();
  }
  if (!bottom && L >= 5) {
    const r = kit(u, u.body, 'fieldbarracksrails');
    const cyan = glowMat(u, 0x00e5ff);
    for (const x of [-0.1, 0.4, 0.9]) r.cyl(0.06, 1.0, cyan, x, 1.0, -1.98, { seg: 8 });
    r.done();
  }
  const look = bottom ? 'bscout' : ['bscout', 'bscout', 'bscout2', 'bscout3', 'bspec', 'bspec'][L];
  park(u, look, 0.75, -1.0, 0.25, 1.0);
  return u;
}
export const makeFieldBarracks = (level) => makeFieldBarracksWith(level, false);
export const makeFieldBarracksBottom = (level) => makeFieldBarracksWith(level, true);
