// Tower models: machines, batch 2 (rebuilt with the vehicle kit in ../vehicles.js).
// In here: Patrol, Zed, Farm, Mercenary Base, War Machine / Behemoth Factory, Pursuit (the pad and
// the helicopter; Helicopter and Cryo Heli fly the same helicopter from makeHeli).
// Each makeX(level) builds one tower's look; TOWER_MODELS in ../models.js says which tower uses which.
// The spawner towers park their current unit (makeUnit) in front of the building, as before.

import * as THREE from 'three';
import { antenna, barrel, bolts, crate, glowMat, hatch, kit, lamp, mgun, PARTS, star, tone } from '../vehicles.js';
import { gunMuzzle, makeThing } from './bits.js';
import { dish, pad, spinBarrels } from './machines1.js';
import { makeUnit } from './units.js';

const { STEEL, GUN, DARK, GLASS } = PARTS;
const PI = Math.PI;
const CONCRETE = 0x9e9e9e;
const HAZARD = 0xf2c12e;
const WOOD = 0x6d4c41;
const SANDBAG = 0xb59a72;

// ------------------------------------------------------------------ small shared pieces

/** A flag on a pole standing on y0: a ball on top and a cloth in three waving strips along +z. */
export function flagPole(k, x, y0, z, h, col, emblem = null) {
  k.cyl(0.2, 0.14, DARK, x, y0 + 0.07, z, { seg: 10 });
  k.cyl(0.07, h, 0xcfd8dc, x, y0 + h / 2, z, { r2: 0.05, seg: 8 });
  k.ball(0.11, 0xc9a227, x, y0 + h + 0.06, z, { seg: 8, rows: 5 });
  const fh = Math.min(0.9, h * 0.3);
  for (let i = 0; i < 3; i++) {
    k.box(0.04, fh, 0.46, tone(col, i % 2 ? 0.88 : 1), x + Math.sin(i * 1.6) * 0.06, y0 + h - 0.05 - fh / 2, z + 0.25 + i * 0.44, { ry: i % 2 ? 0.22 : -0.22 });
  }
  if (emblem != null) k.box(0.06, fh * 0.45, 0.3, emblem, x + 0.01, y0 + h - 0.05 - fh / 2, z + 0.7);
}

/** A roller door facing +z with its bottom on y: roll housing, side rails, slats and a handle. */
export function rollerDoor(k, w, h, x, y, z, col) {
  k.box(w, h, 0.06, col, x, y + h / 2, z);
  const n = Math.round(h / 0.22);
  for (let i = 0; i < n; i++) k.box(w, 0.04, 0.04, tone(col, 0.72), x, y + 0.11 + i * (h / n), z + 0.04);
  for (const sx of [-1, 1]) k.box(0.12, h + 0.1, 0.16, DARK, x + sx * (w / 2 + 0.06), y + h / 2, z + 0.02);
  k.cyl(0.2, w + 0.3, tone(col, 0.6), x, y + h + 0.2, z + 0.06, { axis: 'x', seg: 10 });
  k.box(0.44, 0.06, 0.08, STEEL, x, y + 0.3, z + 0.08);
}

/** A steel drum with two ribs, a lid and a bung; `mark` paints a band round it. */
export function drum(k, x, y, z, col, mark = null) {
  k.cyl(0.3, 0.9, col, x, y + 0.45, z, { seg: 14 });
  for (const f of [0.3, 0.62]) k.torus(0.3, 0.03, tone(col, 0.75), x, y + f, z, { rx: PI / 2, seg: 14 });
  k.cyl(0.27, 0.03, tone(col, 0.82), x, y + 0.91, z, { seg: 14 });
  k.cyl(0.05, 0.05, DARK, x + 0.13, y + 0.93, z, { seg: 6 });
  if (mark != null) k.cyl(0.305, 0.16, mark, x, y + 0.46, z, { seg: 14 });
}

/** A sandbag: a soft rounded block. */
export function bag(k, w, d, x, y, z, col = SANDBAG, ry = 0) {
  k.box(w, 0.32, d, col, x, y + 0.16, z, { r: 0.13, ry });
}

/** A plain window facing +z (or -z with dir -1): frame, glass, cross bar and sill. */
export function windowAt(k, x, y, z, w, h, frame = 0xeceff1, dir = 1) {
  k.box(w + 0.14, h + 0.14, 0.06, frame, x, y, z);
  k.box(w, h, 0.04, GLASS, x, y, z + dir * 0.02);
  k.box(0.05, h, 0.05, frame, x, y, z + dir * 0.04);
  k.box(w + 0.24, 0.07, 0.16, tone(frame, 0.8), x, y - h / 2 - 0.08, z + dir * 0.06);
}

/** An elliptic arch from (rx, 0) over the top to (-rx, 0), as [[x, y], ...]. */
function archPts(rx, ry, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * PI;
    out.push([Math.cos(a) * rx, Math.sin(a) * ry]);
  }
  return out;
}

/** An A-frame tent facing +z at (x, z), size s: canvas, ridge pole, dark door, rolled flap, guy ropes. */
export function tent(k, x, z, s, col) {
  const w = 1.1 * s;
  const h = 1.9 * s;
  const d = 2.6 * s;
  k.prism([[-w, 0], [w, 0], [0, h]], d, col, x, 0.25, z, { ry: PI / 2 });
  for (const sx of [-1, 1]) k.box(0.04, Math.hypot(w, h) - 0.1, d - 0.2, tone(col, 0.82), x + (sx * w) / 2, 0.25 + h / 2, z, { rz: sx * Math.atan2(w, h) }); // seam
  k.cyl(0.05, d + 0.4, WOOD, x, 0.25 + h + 0.02, z, { axis: 'z', seg: 6 }); // ridge pole
  for (const f of [-1, 1]) k.cyl(0.05, h, WOOD, x, 0.25 + h / 2, z + (f * (d + 0.3)) / 2, { seg: 6 });
  k.prism([[-w * 0.45, 0], [w * 0.45, 0], [0, h * 0.62]], 0.05, 0x1b1d1f, x, 0.26, z + d / 2 + 0.01, { ry: PI / 2 }); // door
  k.cyl(0.08, h * 0.6, tone(col, 0.9), x + w * 0.42, 0.25 + h * 0.36, z + d / 2 + 0.06, { seg: 6, rz: -0.5 }); // rolled flap
  for (const sx of [-1, 1]) for (const f of [-0.35, 0.35]) {
    const px = x + sx * (w + 0.55 * s);
    k.tube([[x + sx * w * 0.5, 0.25 + h * 0.5, z + f * d], [px, 0.27, z + f * d]], 0.012, 0xd7ccc8, { sides: 3, seg: 2 });
    k.cyl(0.03, 0.18, WOOD, px, 0.3, z + f * d, { seg: 4 });
  }
}

/** A wooden post-and-rail fence from a to b ([x, z]), posts every ~0.9. */
export function fence(k, a, b, y, h, col = WOOD, wire = false) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.round(len / 0.9));
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    k.box(0.14, h, 0.14, tone(col, i % 2 ? 0.9 : 1), a[0] + (b[0] - a[0]) * f, y + h / 2, a[1] + (b[1] - a[1]) * f);
  }
  const ry = Math.atan2(b[0] - a[0], b[1] - a[1]);
  const mx = (a[0] + b[0]) / 2;
  const mz = (a[1] + b[1]) / 2;
  for (const f of [0.4, 0.78]) k.box(0.05, 0.1, len, tone(col, 1.1), mx, y + h * f, mz, { ry });
  if (wire) {
    // Barbed wire: a sagging strand along the top with little barbs
    const pts = [];
    for (let i = 0; i <= n * 4; i++) {
      const f = i / (n * 4);
      pts.push([a[0] + (b[0] - a[0]) * f, y + h + 0.1 - Math.sin(f * n * PI) ** 2 * 0.05, a[1] + (b[1] - a[1]) * f]);
      if (i % 2) k.box(0.1, 0.02, 0.02, 0x9e9e9e, pts[i][0], pts[i][1], pts[i][2], { ry: ry + 0.8 });
    }
    k.tube(pts, 0.015, 0x9e9e9e, { sides: 3 });
  }
}

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

// ------------------------------------------------------------------ Patrol

/**
 * Patrol: a block garage with a roller door, a flag and its current vehicle parked out front.
 * Lv 1 a spiked bumper over the door and a steel hedgehog, Lv 2 red explosive drums and hazard
 * stripes, Lv 3 a sandbagged machine-gun nest on the roof, Lv 4 a tank.
 */
export function makePatrol(level) {
  const u = makeThing();
  const k = kit(u, u.body, `patrol${level}`);
  // Yard: a concrete pad with a kerb, a darker drive and painted parking lines
  k.slab(4.2, 0.3, 4.2, CONCRETE, 0, 0.15, 0, { tw: 0.97, td: 0.97 });
  k.box(2.9, 0.03, 2.2, 0x7d7d7d, 0, 0.31, 1.0);
  for (const sx of [-1, 1]) k.box(0.08, 0.02, 1.9, 0xfafafa, sx * 1.5, 0.33, 1.05);
  // Garage: block walls with a plinth, mortar lines and a flat roof with a lip
  const wall = 0xa1887f;
  k.box(3.6, 3.0, 2.0, wall, 0, 1.8, -1.0, { r: 0.04 });
  k.box(3.66, 0.3, 2.06, tone(wall, 0.7), 0, 0.45, -1.0);
  for (let i = 1; i < 6; i++) k.box(3.62, 0.03, 2.02, tone(wall, 0.85), 0, 0.3 + i * 0.5, -1.0);
  k.slab(3.95, 0.25, 2.35, 0x5d4037, 0, 3.42, -1.0, { tw: 0.97, td: 0.95 });
  k.box(3.95, 0.16, 0.08, tone(0x5d4037, 0.8), 0, 3.6, 0.13); // roof lip
  k.cyl(0.07, 3.8, 0x8d6e63, 0, 3.26, 0.2, { axis: 'x', seg: 6 }); // gutter
  k.cyl(0.06, 3.0, 0x8d6e63, 1.86, 1.8, 0.2, { seg: 6 }); // downpipe
  rollerDoor(k, 2.5, 2.2, -0.2, 0.3, 0.02, 0x78909c);
  lamp(k, -0.2, 2.95, 0.08, 0.13, 0xfff3b0);
  k.box(0.46, 0.06, 0.2, DARK, -0.2, 3.06, 0.08);
  // Side door, window and a number board
  k.box(0.6, 1.5, 0.05, 0x455a64, 1.45, 1.05, 0.01);
  k.box(0.08, 0.08, 0.06, 0xc9a227, 1.25, 1.05, 0.05);
  windowAt(k, -1.85, 1.9, -1.0, 0.7, 0.6, 0xeceff1, 1);
  k.box(0.04, 0.9, 1.0, 0x1565c0, 1.82, 2.2, -1.0); // side board
  k.box(0.05, 0.5, 0.6, 0xeceff1, 1.83, 2.2, -1.0);
  // Roof kit: a vent and an air conditioner box
  k.cyl(0.18, 0.4, STEEL, 1.1, 3.75, -1.5, { seg: 10 });
  k.cyl(0.26, 0.08, STEEL, 1.1, 3.98, -1.5, { seg: 10 });
  k.box(0.8, 0.45, 0.6, 0xcfd8dc, -1.1, 3.78, -1.5, { r: 0.04 });
  k.cyl(0.2, 0.04, DARK, -1.1, 4.02, -1.5, { seg: 12 });
  flagPole(k, 1.6, 3.55, -1.8, 2.4, 0x1e88e5, 0xfafafa);
  if (level >= 1) {
    // Spiked Bumper: a spiked bar over the door and a steel hedgehog by the drive
    k.box(3.0, 0.3, 0.3, DARK, -0.2, 2.82, 0.25, { r: 0.04 });
    for (let x = -1.5; x <= 1.15; x += 0.42) k.cyl(0.09, 0.5, 0xbdbdbd, x, 2.82, 0.6, { axis: 'z', r2: 0.01, seg: 6 });
    const hx = 1.7;
    const hz = 1.65;
    k.box(0.14, 0.14, 1.1, 0x5d5d5d, hx, 0.6, hz, { rx: 0.6 });
    k.box(0.14, 0.14, 1.1, 0x5d5d5d, hx, 0.6, hz, { rx: -0.6, ry: 1.2 });
    k.box(1.1, 0.14, 0.14, 0x5d5d5d, hx, 0.6, hz, { rz: 0.7, ry: 0.3 });
  }
  if (level >= 2) {
    // Suicide Mission: explosive drums and hazard stripes along the door rails
    for (const [x, z] of [[-1.65, 1.5], [-1.65, 0.8], [-1.05, 1.75]]) drum(k, x, 0.3, z, 0xc62828, 0xfdd835);
    for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) k.box(0.14, 0.34, 0.04, i % 2 ? 0x1a1a1a : HAZARD, -0.2 + sx * 1.38, 0.5 + i * 0.36, 0.12);
  }
  if (level >= 3) {
    // Mounted Gunner: a sandbag ring on the roof with a machine gun on a pintle
    for (let i = 0; i < 7; i++) {
      const a = PI * 0.05 + (i / 6) * PI * 0.9;
      bag(k, 0.6, 0.38, Math.cos(a) * 0.95, 3.55, -0.75 + Math.sin(a) * 0.75, SANDBAG, -a + PI / 2);
      bag(k, 0.55, 0.36, Math.cos(a + 0.1) * 0.95, 3.85, -0.75 + Math.sin(a + 0.1) * 0.75, tone(SANDBAG, 1.08), -a + PI / 2);
    }
    k.cyl(0.06, 0.7, DARK, 0, 3.9, -0.6, { seg: 6 });
    mgun(k, 0, 4.3, -0.9, 1.5, { s: 1.1 });
  }
  k.done();
  park(u, level >= 4 ? 'tank' : level >= 3 ? 'gunjeep' : 'jeep', 0.42, 0, 0.3, 1.2, PI / 2);
  return u;
}

// ------------------------------------------------------------------ Zed

/**
 * Zed: a round-roofed steel hangar (a Quonset hut) with its vehicle standing guard inside.
 * Lv 1 spiked rails on the floor, Lv 2 a cannon turret on the roof, Lv 3 the M2 mech, Lv 4 the M11.
 */
export function makeZed(level) {
  const u = makeThing();
  const k = kit(u, u.body, `zed${level}`);
  k.slab(4.2, 0.3, 4.2, 0x616161, 0, 0.15, 0, { tw: 0.97, td: 0.97 });
  // Floor: yellow guide lines and an apron with hazard stripes
  for (const sx of [-1, 1]) k.box(0.1, 0.02, 3.4, HAZARD, sx * 1.2, 0.31, 0);
  for (let i = 0; i < 8; i++) k.box(0.48, 0.03, 0.2, i % 2 ? 0x1a1a1a : HAZARD, -1.75 + i * 0.5, 0.31, 1.95);
  // The arch: corrugated steel shell from strips, ribs, and a back wall
  const RX = 2.0;
  const RY = 3.4;
  const z0 = -2.0;
  const z1 = 1.6;
  const shell = 0x546e7a;
  const pts = archPts(RX, RY, 14);
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    k.box(Math.hypot(bx - ax, by - ay) * 1.04, 0.12, z1 - z0, tone(shell, i % 2 ? 0.9 : 1), (ax + bx) / 2, 0.3 + (ay + by) / 2, (z0 + z1) / 2, { rz: Math.atan2(by - ay, bx - ax) });
  }
  for (const z of [z0 + 0.1, -0.7, 0.5, z1 - 0.05]) k.tube(archPts(RX + 0.07, RY + 0.07, 18).map(([x, y]) => [x, 0.3 + y, z]), z === z1 - 0.05 ? 0.12 : 0.07, z === z1 - 0.05 ? 0x37474f : tone(shell, 0.7), { sides: 6 });
  k.prism(pts, 0.14, tone(shell, 0.75), 0, 0.3, z0 + 0.08, { ry: PI / 2 });
  // Front: amber lights round the arch, a name board and warning beacons on top
  const glow = glowMat(u, 0xffc400);
  for (let i = 1; i < 10; i++) {
    const a = (i / 10) * PI;
    k.ball(0.09, glow, Math.cos(a) * (RX - 0.05), 0.3 + Math.sin(a) * (RY - 0.05), z1 + 0.08, { seg: 6, rows: 4 });
  }
  k.box(1.6, 0.4, 0.08, 0x263238, 0, 0.3 + RY - 0.7, z1 - 0.02);
  k.box(1.3, 0.14, 0.04, glow, 0, 0.3 + RY - 0.7, z1 + 0.03);
  for (const sx of [-1, 1]) {
    k.cyl(0.14, 0.12, DARK, sx * 0.9, 0.3 + RY - 0.38, z1 - 0.3, { seg: 8 });
    k.ball(0.12, glowMat(u, 0xff6d00), sx * 0.9, 0.3 + RY - 0.26, z1 - 0.3, { seg: 8, rows: 5 });
  }
  // Sides: buttresses, a vent cowl and a power box with a cable
  for (const sx of [-1, 1]) for (const z of [-1.3, 0.9]) k.slab(0.35, 1.2, 0.3, 0x455a64, sx * (RX + 0.12), 0.9, z, { tw: 0.4, tx: -sx * 0.08 });
  k.cyl(0.28, 0.5, STEEL, 0.9, 0.3 + RY * 0.86, -1.2, { seg: 10 });
  k.cyl(0.36, 0.1, tone(STEEL, 0.8), 0.9, 0.3 + RY * 0.86 + 0.28, -1.2, { seg: 10 });
  k.box(0.5, 0.7, 0.3, 0x37474f, -1.95, 0.75, 1.75, { r: 0.04 });
  k.box(0.3, 0.08, 0.02, 0x4caf50, -1.95, 0.9, 1.91);
  k.tube([[-1.95, 0.4, 1.6], [-1.85, 0.32, 1.2], [-1.7, 0.33, 0.6]], 0.03, 0x111111, { sides: 4 });
  if (level >= 1) {
    // Spiked Tracks: steel rails along the floor with spikes sticking up
    for (const x of [-1.5, 1.5]) {
      k.box(0.32, 0.22, 3.4, 0x424242, x, 0.41, -0.1, { r: 0.04 });
      bolts(k, [x, 0.53, -1.6], [x, 0.53, 1.4], 8, STEEL, 0.035);
      for (const z of [-1.3, -0.5, 0.3, 1.1]) k.cyl(0.13, 0.75, 0xbdbdbd, x, 0.88, z, { r2: 0.01, seg: 8 });
    }
  }
  if (level >= 2) {
    // Arm Cannon: a cannon turret on the roof ridge with a glowing muzzle
    const y = 0.3 + RY;
    k.cyl(0.62, 0.2, DARK, 0, y + 0.02, -0.4, { seg: 16 });
    k.slab(1.3, 0.7, 1.5, 0x546e7a, 0, y + 0.45, -0.4, { tw: 0.75, td: 0.8 });
    hatch(k, -0.25, y + 0.8, -0.7, 0.24, 0x546e7a);
    k.box(0.5, 0.5, 0.35, DARK, 0, y + 0.42, 0.35, { r: 0.1 });
    barrel(k, 0, y + 0.42, 0.4, 1.9, 0.16, GUN, { brake: true, sleeve: true });
    k.cyl(0.13, 0.05, glowMat(u, 0xff6d00), 0, y + 0.42, 2.32, { axis: 'z', seg: 10 });
  }
  k.done();
  park(u, ['m1', 'm1', 'm1', 'm2', 'm11'][level] ?? 'm11', level >= 4 ? 0.36 : level >= 3 ? 0.46 : 0.6, 0, 0.3, 0.2);
  return u;
}

// ------------------------------------------------------------------ Farm

/**
 * Farm: a red barn, a fenced field of crops and a hay bale. Lv 1 Fertilizer (taller crops and
 * sacks), Lv 2 Plantation (a silo and more rows), Lv 3 Orchard (fruit trees), Lv 4 Fruit of the
 * Future (golden crops and glowing fruit).
 */
export function makeFarm(level) {
  const u = makeThing();
  const k = kit(u, u.body, `farm${level}`);
  const SOIL = 0x6d4c41;
  k.slab(4.2, 0.3, 4.2, 0x7cb342, 0, 0.15, 0, { tw: 0.98, td: 0.98 }); // grass
  // Barn: a gambrel (two-slope) roof, white trim, a cross-braced door and a hay loft
  const red = 0xc62828;
  const bx = -0.9;
  const bz = -1.1;
  const prof = [[-1.1, 0], [1.1, 0], [1.1, 1.5], [0.72, 2.25], [0, 2.65], [-0.72, 2.25], [-1.1, 1.5]];
  k.prism(prof, 1.8, red, bx, 0.3, bz, { ry: PI / 2 });
  for (let i = 2; i <= 5; i++) {
    // Roof boards on the four roof slopes, pushed out a little from the wall
    const [ax, ay] = prof[i];
    const [cx, cy] = prof[i + 1];
    const a = Math.atan2(cy - ay, cx - ax);
    k.box(Math.hypot(cx - ax, cy - ay) + 0.14, 0.1, 2.05, 0x4e342e, bx + (ax + cx) / 2 + Math.sin(a) * 0.05, 0.3 + (ay + cy) / 2 - Math.cos(a) * 0.05, bz, { rz: a });
  }
  k.box(0.14, 0.12, 2.05, 0x3e2723, bx, 0.3 + 2.72, bz); // ridge cap
  const W = 0xfafafa;
  const fz = bz + 0.91;
  for (const sx of [-1, 1]) k.box(0.1, 1.5, 0.05, W, bx + sx * 1.06, 1.05, fz); // corner trim
  k.box(2.2, 0.1, 0.05, W, bx, 1.8, fz);
  k.box(1.0, 1.25, 0.05, 0x8e1c1c, bx, 0.93, fz); // door
  k.box(1.06, 1.31, 0.03, W, bx, 0.93, fz - 0.01);
  for (const s of [-1, 1]) k.box(0.08, 1.5, 0.04, W, bx, 0.93, fz + 0.03, { rz: s * 0.68 });
  k.box(0.5, 0.45, 0.05, 0x3e2723, bx, 2.15, fz); // hay loft
  k.box(0.56, 0.06, 0.06, W, bx, 2.4, fz);
  k.box(0.12, 0.12, 0.4, 0x3e2723, bx, 2.55, fz + 0.15); // hoist beam
  k.ball(0.2, 0xd4b24c, bx + 0.25, 2.12, fz + 0.04, { sz: 0.4, seg: 6, rows: 4 }); // hay poking out
  // Field: furrows with crops in rows, behind a rail fence
  for (let i = 0; i < 4; i++) k.box(2.2, 0.08, 0.3, SOIL, -1.0, 0.33, 0.35 + i * 0.5);
  const rows = Math.min(4, 2 + level);
  const gold = level >= 4;
  const leaf = level >= 2 ? 0x7cb342 : 0x689f38;
  const tall = 0.5 + level * 0.1;
  for (let i = 0; i < rows; i++) for (let j = 0; j < 4; j++) {
    const x = -1.85 + j * 0.56;
    const z = 0.35 + i * 0.5;
    k.cyl(0.035, tall, 0x558b2f, x, 0.37 + tall / 2, z, { seg: 5 });
    for (const s of [-1, 1]) k.box(0.24, 0.03, 0.08, leaf, x + s * 0.1, 0.37 + tall * (s > 0 ? 0.45 : 0.6), z, { rz: s * 0.5 });
    if (gold) k.cyl(0.07, 0.24, glowMat(u, 0xffd740, 0.5), x, 0.37 + tall + 0.08, z, { seg: 6, r2: 0.03 });
    else k.ball(0.12, level >= 1 ? 0xfbc02d : 0x9ccc65, x, 0.37 + tall + 0.05, z, { seg: 6, rows: 4, sy: 1.3 });
  }
  fence(k, [-2.0, 2.05], [0.0, 2.05], 0.3, 0.6, 0xbcaaa4);
  fence(k, [-2.05, 0.1], [-2.05, 2.0], 0.3, 0.6, 0xbcaaa4);
  // A round hay bale and a water trough
  k.cyl(0.36, 0.6, 0xd4b24c, 0.55, 0.66, -0.3, { axis: 'x', seg: 14 });
  k.torus(0.36, 0.02, 0xb08a2a, 0.4, 0.66, -0.3, { ry: PI / 2, seg: 14 });
  k.box(0.9, 0.3, 0.4, 0x78909c, 0.6, 0.45, 0.45, { r: 0.04 });
  k.box(0.8, 0.02, 0.3, 0x4fc3f7, 0.6, 0.6, 0.45);
  if (level >= 1) {
    // Fertilizer: stacked sacks by the barn
    for (const [x, y, z] of [[0.45, 0.3, -1.6], [0.85, 0.3, -1.55], [0.65, 0.55, -1.58]]) {
      k.box(0.38, 0.24, 0.55, 0xeeeeee, x, y + 0.12, z, { r: 0.08 });
      k.box(0.39, 0.1, 0.3, 0x2e7d32, x, y + 0.14, z);
    }
  }
  if (level >= 2) {
    // Plantation: a ribbed silo with a dome, a ladder and a chute to the barn
    const sx = 1.45;
    const sz = -1.35;
    k.cyl(0.6, 3.4, 0xb0bec5, sx, 2.0, sz, { seg: 18 });
    for (let i = 0; i < 6; i++) k.torus(0.6, 0.03, 0x90a4ae, sx, 0.6 + i * 0.6, sz, { rx: PI / 2, seg: 18 });
    k.ball(0.62, 0x78909c, sx, 3.7, sz, { seg: 16, rows: 8, sy: 0.7 });
    k.ball(0.1, 0x546e7a, sx, 4.15, sz, { seg: 6, rows: 4 });
    for (const dx of [-0.15, 0.15]) k.box(0.04, 3.3, 0.04, DARK, sx + dx, 1.95, sz + 0.64);
    for (let y = 0.6; y < 3.5; y += 0.3) k.box(0.3, 0.03, 0.03, DARK, sx, y, sz + 0.64);
    k.tube([[sx - 0.5, 3.2, sz], [0.4, 2.6, sz + 0.1], [0.2, 2.2, sz + 0.2]], 0.07, 0x90a4ae, { sides: 6 });
  }
  if (level >= 3) {
    // Orchard: two fruit trees (glowing fruit with Fruit of the Future)
    const fruit = gold ? glowMat(u, 0x00e5ff) : 0xe53935;
    for (const z of [0.55, 1.6]) {
      const x = 1.5;
      k.cyl(0.13, 1.2, 0x5d4037, x, 0.9, z, { r2: 0.09, seg: 7 });
      k.cyl(0.05, 0.5, 0x5d4037, x + 0.2, 1.35, z, { rz: -0.6, seg: 5 });
      k.ball(0.55, 0x388e3c, x, 1.85, z, { seg: 10, rows: 7 });
      k.ball(0.38, 0x2e7d32, x + 0.35, 1.65, z + 0.15, { seg: 8, rows: 6 });
      k.ball(0.36, 0x43a047, x - 0.3, 1.7, z - 0.2, { seg: 8, rows: 6 });
      for (const [ox, oy, oz] of [[0.3, 1.6, 0.42], [-0.35, 1.85, 0.3], [0.1, 2.1, 0.45], [0.5, 1.9, -0.1], [-0.1, 1.5, 0.5]]) k.ball(0.08, fruit, x + ox, oy, z + oz, { seg: 6, rows: 4 });
    }
  }
  k.done();
  u.static = true;
  return u;
}

// ------------------------------------------------------------------ Mercenary Base

/**
 * Mercenary Base: a fenced dirt yard with a tent, a campfire and a flag. Lv 1 a crate of
 * grenades, Lv 2 a second tent, Lv 3 a watchtower with a gold star banner, Lv 4 riot shields on
 * a rack, Lv 5 a helipad, Lv 6 concrete blast walls instead of the fence.
 */
export function makeMercBase(level) {
  const u = makeThing();
  const armored = level >= 6;
  const k = kit(u, u.body, `merc${level}`);
  k.slab(4.6, 0.25, 4.6, 0x8d7b5a, 0, 0.125, 0, { tw: 0.98, td: 0.98 }); // dirt yard
  for (const [x, z, r] of [[0.9, 1.6, 0.3], [-1.6, -1.9, 0.22], [1.8, -0.3, 0.26]]) k.cyl(r, 0.03, 0x7a6a4c, x, 0.26, z, { seg: 8 }); // dirt patches
  if (armored) {
    // Enhanced Equipment: concrete T-walls along the sides and back
    const T = 0x8a9399;
    const walls = [];
    for (const z of [-1.65, -0.55, 0.55, 1.65]) for (const sx of [-1, 1]) walls.push([sx * 2.05, z, PI / 2]);
    for (const x of [-1.1, 0, 1.1]) walls.push([x, -2.05, 0]);
    for (const [x, z, ry] of walls) {
      k.slab(1.05, 1.6, 0.26, T, x, 1.05, z, { tw: 1, td: 0.55, ry });
      k.box(1.05, 0.25, 0.7, tone(T, 0.85), x, 0.37, z, { ry });
      k.box(0.6, 0.12, 0.02, HAZARD, x + (ry ? Math.sign(x) * -0.14 : 0), 1.3, z + (ry ? 0 : 0.14), { ry });
    }
  } else {
    fence(k, [-2.1, -2.1], [-2.1, 2.1], 0.25, 1.0, WOOD, true);
    fence(k, [2.1, -2.1], [2.1, 2.1], 0.25, 1.0, WOOD, true);
    fence(k, [-2.1, -2.1], [2.1, -2.1], 0.25, 1.0, WOOD, true);
  }
  tent(k, -0.6, -0.75, 1, level >= 3 ? 0x3e4a2a : 0x6b7d3a);
  // Campfire: a ring of stones, crossed logs and glowing embers
  const fx = -0.15;
  const fz = 1.0;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * PI * 2;
    k.ball(0.11, 0x757575, fx + Math.cos(a) * 0.3, 0.3, fz + Math.sin(a) * 0.3, { seg: 6, rows: 4, sy: 0.7 });
  }
  for (const ry of [0.5, -0.6, 1.6]) k.cyl(0.05, 0.5, 0x4e342e, fx, 0.33, fz, { axis: 'z', ry, seg: 5 });
  k.ball(0.12, glowMat(u, 0xff6d00), fx, 0.33, fz, { seg: 6, rows: 4 });
  k.cyl(0.14, 0.25, 0x8d6e63, fx + 0.55, 0.38, fz - 0.15, { axis: 'x', seg: 7 }); // log seat
  if (level >= 1) {
    // Explosive Experts: an open crate of grenades
    crate(k, 1.4, 0.55, 1.3, 0.9, 0.55, 0.7, 0x4e5b31);
    for (const x of [1.15, 1.4, 1.65]) {
      k.ball(0.1, 0x33691e, x, 0.92, 1.3, { seg: 7, rows: 5, sy: 1.2 });
      k.box(0.04, 0.12, 0.06, STEEL, x + 0.06, 1.0, 1.3);
    }
  }
  if (level >= 2) tent(k, 1.2, -0.95, 0.7, level >= 3 ? 0x4b5631 : 0x7b8a46); // Upgraded Barracks
  if (level >= 3) {
    // Improved Training: a watchtower with a ladder, a railing, a roof and a gold star banner
    const tx = -1.5;
    const tz = 1.5;
    const top = 3.1;
    for (const ox of [-0.42, 0.42]) for (const oz of [-0.42, 0.42]) k.tube([[tx + ox * 1.25, 0.25, tz + oz * 1.25], [tx + ox, top, tz + oz]], 0.07, WOOD, { sides: 5, seg: 2 });
    for (const [a, b] of [[[-1, -1], [1, -1]], [[-1, 1], [1, 1]], [[-1, -1], [-1, 1]], [[1, -1], [1, 1]]]) {
      const p = (s, y) => [tx + s[0] * 0.42 * (1 + (0.25 * (top - y)) / top), y, tz + s[1] * 0.42 * (1 + (0.25 * (top - y)) / top)];
      k.tube([p(a, 0.6), p(b, 1.8)], 0.035, tone(WOOD, 0.85), { sides: 4, seg: 2 }); // cross braces
      k.tube([p(b, 0.6), p(a, 1.8)], 0.035, tone(WOOD, 0.85), { sides: 4, seg: 2 });
    }
    k.box(1.3, 0.14, 1.3, 0x795548, tx, top, tz);
    for (const ox of [-0.6, 0.6]) for (const oz of [-0.6, 0.6]) k.box(0.08, 1.2, 0.08, WOOD, tx + ox, top + 0.6, tz + oz);
    for (const s of [-1, 1]) {
      k.box(1.3, 0.06, 0.06, WOOD, tx, top + 0.55, tz + s * 0.6);
      k.box(0.06, 0.06, 1.3, WOOD, tx + s * 0.6, top + 0.55, tz);
    }
    k.slab(1.6, 0.45, 1.6, 0x5d4037, tx, top + 1.42, tz, { tw: 0.15, td: 0.15 });
    for (const dx of [-0.16, 0.16]) k.box(0.05, top, 0.05, 0x8d6e63, tx + 0.5 + dx, top / 2 + 0.2, tz + 0.75, { rx: -0.15 }); // ladder
    for (let y = 0.5; y < top; y += 0.35) k.box(0.36, 0.04, 0.04, 0x8d6e63, tx + 0.5, y, tz + 0.66 + (0.15 * (top - y)) / top);
    k.box(0.04, 0.9, 0.7, 0x1a237e, tx + 0.67, top + 0.4, tz);
    star(k, tx + 0.7, top + 0.45, tz, 0.26, glowMat(u, 0xffc400), { rz: PI / 2 });
  }
  if (level >= 4) {
    // Riot Control: riot shields leaning on a rack
    k.box(1.7, 0.1, 0.12, 0x3e2723, 0.4, 1.25, 1.95);
    for (const x of [-0.35, 1.15]) k.box(0.1, 1.0, 0.1, 0x3e2723, x, 0.75, 1.95);
    for (const x of [-0.05, 0.4, 0.85]) {
      k.box(0.44, 0.95, 0.06, 0x90a4ae, x, 0.78, 2.0, { r: 0.03, rx: -0.15 });
      k.box(0.28, 0.14, 0.03, 0x263238, x, 1.0, 2.04, { rx: -0.15 });
      k.box(0.3, 0.06, 0.02, 0xfafafa, x, 0.6, 2.06, { rx: -0.15 });
    }
  }
  if (level >= 5) {
    // Air Transport: a round helipad with an H and edge lights
    const hx = 1.2;
    const hz = 0.25;
    k.cyl(0.95, 0.06, 0x424242, hx, 0.28, hz, { seg: 20 });
    k.torus(0.82, 0.03, 0xfafafa, hx, 0.31, hz, { rx: PI / 2, seg: 20 });
    for (const sx of [-1, 1]) k.box(0.14, 0.03, 0.8, 0xfafafa, hx + sx * 0.25, 0.32, hz);
    k.box(0.5, 0.03, 0.14, 0xfafafa, hx, 0.32, hz);
    const g = glowMat(u, 0x76ff03);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      k.ball(0.05, g, hx + Math.cos(a) * 0.95, 0.33, hz + Math.sin(a) * 0.95, { seg: 5, rows: 3 });
    }
  }
  flagPole(k, 1.9, 0.25, -1.9, 3.1, armored ? 0xffc400 : 0xc62828, 0x212121);
  k.done();
  u.static = true;
  return u;
}

// ------------------------------------------------------------------ War Machine / Behemoth Factory

/**
 * Behemoth Factory / War Machine Factory: a steel works hall open at the front, with a sawtooth
 * glass roof, a gantry crane inside, a smokestack and the factory's current unit on the floor.
 * Lv 1 a path flag on the roof, Lv 3 a roof machine house with fans. `kind` is 'behemoth' or 'war'.
 */
export function makeHeavyFactory(level, bottom, kind) {
  const u = makeThing();
  const war = kind === 'war';
  const H = war ? 4.6 : 3.8;
  const wall = war ? 0x37474f : 0x4e5b31;
  const lit = glowMat(u, war ? 0xff6d00 : 0xffc400);
  const k = kit(u, u.body, `factory${kind}${bottom ? 'B' : 'T'}${level}`);
  pad(k, 4.6, 0.3, 0x6b6b6b);
  for (const x of [-0.7, 0.7]) k.box(0.12, 0.04, 4.2, STEEL, x, 0.32, 0); // floor rails
  // Side walls: thick, with pilasters, vent slats and hazard-banded front edges
  for (const sx of [-1, 1]) {
    const x = sx * 2.05;
    k.box(0.5, H, 3.8, wall, x, 0.3 + H / 2, -0.4, { r: 0.05 });
    for (const z of [-1.9, -0.4, 1.1]) k.box(0.14, H, 0.3, tone(wall, 0.82), x + sx * 0.3, 0.3 + H / 2, z);
    for (let i = 0; i < 5; i++) k.box(0.04, 0.08, 0.9, 0x16181a, x + sx * 0.26, 0.3 + H * 0.55 + i * 0.18, -1.15, { rx: 0.3 });
    for (let i = 0; i < 9; i++) k.box(0.52, H / 9 - 0.01, 0.06, i % 2 ? 0x1a1a1a : HAZARD, x, 0.3 + (i + 0.5) * (H / 9), 1.5);
    lamp(k, x - sx * 0.1, 0.3 + H - 0.5, 1.56, 0.14, 0xfff3b0);
  }
  k.box(3.6, H, 0.3, tone(wall, 0.7), 0, 0.3 + H / 2, -2.15); // back wall
  for (let i = 0; i < 3; i++) k.box(0.9, 0.9, 0.06, tone(wall, 0.55), -1.1 + i * 1.1, 0.3 + H * 0.6, -1.98); // back panels
  // Header beam with a glowing strip
  k.box(4.6, 0.6, 0.35, tone(wall, 0.8), 0, 0.3 + H - 0.3, 1.38);
  k.box(3.6, 0.12, 0.06, lit, 0, 0.3 + H - 0.58, 1.57);
  bolts(k, [-2.0, 0.3 + H - 0.12, 1.57], [2.0, 0.3 + H - 0.12, 1.57], 10, STEEL, 0.04);
  // Roof: a deck with a sawtooth of glass skylights
  const roofY = 0.3 + H;
  k.box(4.7, 0.3, 4.0, 0x263238, 0, roofY + 0.15, -0.4);
  for (const z of [-2.0, -0.8, 0.4]) {
    k.prism([[0, 0], [1.1, 0], [1.1, 0.75]], 3.8, 0x37474f, 0, roofY + 0.3, z);
    k.box(3.7, 0.62, 0.04, 0x6fb7e6, 0, roofY + 0.64, z + 1.12);
  }
  // Gantry crane inside, under the roof
  k.box(3.6, 0.3, 0.32, HAZARD, 0, roofY - 0.85, 0.2);
  k.box(0.6, 0.35, 0.5, 0x37474f, 0.5, roofY - 1.15, 0.2, { r: 0.04 });
  k.tube([[0.5, roofY - 1.3, 0.2], [0.5, roofY - 2.0, 0.2]], 0.025, 0x111111, { sides: 4, seg: 2 });
  k.torus(0.14, 0.04, STEEL, 0.5, roofY - 2.12, 0.2, { arc: PI * 1.4, rz: 2.4, seg: 8 });
  // Smokestack: banded, with a dark cap
  const sy = roofY + 0.3;
  k.cyl(0.38, 2.2, 0x455a64, 1.6, sy + 1.1, -1.65, { r2: 0.32, seg: 14 });
  for (const f of [0.3, 0.7]) k.torus(0.36 - f * 0.05, 0.04, HAZARD, 1.6, sy + f * 2.2, -1.65, { rx: PI / 2, seg: 14 });
  k.cyl(0.4, 0.2, DARK, 1.6, sy + 2.25, -1.65, { seg: 14 });
  k.cyl(0.24, 0.04, 0x0b0b0b, 1.6, sy + 2.36, -1.65, { seg: 12 });
  if (level >= 1) flagPole(k, -1.85, sy, -1.95, 1.8, bottom ? 0x1e88e5 : 0xd50000, 0xfafafa);
  if (level >= 3) {
    // Roof machine house: a box with two fans and a pipe
    k.box(1.6, 0.7, 1.4, 0x37474f, -0.3, sy + 0.35, -0.9, { r: 0.05 });
    for (const x of [-0.75, 0.15]) {
      k.cyl(0.3, 0.06, DARK, x, sy + 0.73, -0.9, { seg: 14 });
      k.box(0.55, 0.03, 0.08, STEEL, x, sy + 0.77, -0.9, { ry: 0.5 });
      k.box(0.55, 0.03, 0.08, STEEL, x, sy + 0.77, -0.9, { ry: -1.07 });
    }
    k.tube([[0.5, sy + 0.4, -0.9], [1.0, sy + 0.4, -1.3], [1.3, sy + 0.8, -1.65]], 0.08, STEEL, { sides: 6 });
  }
  k.done();
  const model = war
    ? bottom && level >= 3 ? ['warmachine', 'warmachine2', 'warmachine3'][level - 3] : `walker${level >= 2 && !bottom ? level : ''}`
    : bottom && level >= 3 ? ['laserbehemoth', 'laserbehemoth2', 'laserbehemoth3'][level - 3] : ['behemoth', 'behemoth', 'behemoth2', 'behemoth3', 'behemoth4', 'mammoth'][bottom ? 0 : level];
  const v = makeUnit(model);
  const fit = 3.9 / Math.max(v.height, 3);
  v.root.scale.setScalar(Math.min(war ? 0.55 : model === 'mammoth' ? 0.3 : 0.4, fit));
  v.root.position.set(0, 0.3, 0.4);
  u.body.add(v.root);
  u.mats.push(...v.mats);
  return u;
}
export const makeBehemothFactory = (level) => makeHeavyFactory(level, false, 'behemoth');
export const makeBehemothFactoryBottom = (level) => makeHeavyFactory(level, true, 'behemoth');
export const makeWarMachineFactory = (level) => makeHeavyFactory(level, false, 'war');
export const makeWarMachineFactoryBottom = (level) => makeHeavyFactory(level, true, 'war');

// ------------------------------------------------------------------ the helicopter

/**
 * The Pursuit's helicopter (faces +Z). `bank` tilts, `prop` (main rotor) and `tail` (tail
 * rotor) spin. Lv 1 an ammo can and belt, Lv 2 a radar dome over the rotor, Lv 3 stub wings with
 * rocket pods. Top path: twin chin miniguns (Lv 5), a huge black-and-red Leviathan (Lv 6). Bottom
 * path: a desert gunship with a sensor ball and more pods (Lv 5), a dark Demolition Gunship (Lv 6).
 * Helicopter, Cryo Heli and the event helis use it too, with their own paint (`look`).
 */
export function makeHeli(h, level, bottom, look = null) {
  const heli = new THREE.Group();
  const bank = new THREE.Group();
  heli.add(bank);
  const muzzles = [];
  const missiles = [];
  const point = (x, y, z, list) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    bank.add(m);
    list.push(m);
  };
  const top = level >= 4 && !bottom;
  const bot = level >= 4 && bottom;
  const big = level >= 5;
  const color = look?.color ?? (top ? (big ? 0x1c1c1c : 0x607d8b) : bot ? (big ? 0x263238 : 0xc2a46b) : 0x556b2f);
  const trimC = look?.trim ?? (top && big ? 0xd50000 : bot && big ? 0xff6d00 : 0x37474f);
  const trim = big ? glowMat(h, trimC) : trimC;
  const key = `heli${level}${bottom ? 'B' : 'T'}${color}:${trimC}`;
  if (big) bank.scale.setScalar(1.25);
  const k = kit(h, bank, key);
  // Body: a rounded cabin, a bulged nose with a bubble canopy and an engine deck on top
  k.box(2.1, 1.9, 3.4, color, 0, 0, 0.3, { r: 0.45 });
  k.ball(1.0, color, 0, -0.2, 2.0, { sx: 0.95, sy: 0.78, sz: 1.25, seg: 16, rows: 10 });
  k.ball(0.95, 0x81d4fa, 0, 0.3, 1.85, { sx: 0.88, sy: 0.72, sz: 1.1, seg: 16, rows: 10 });
  k.box(0.08, 0.08, 1.6, tone(color, 0.7), 0, 0.98, 1.75, { rx: 0.42 }); // canopy frame
  k.box(2.14, 0.24, 2.9, trim, 0, -0.42, 0.3); // stripe
  k.box(1.4, 0.65, 2.1, tone(color, 0.9), 0, 1.15, 0, { r: 0.22 }); // engine deck
  for (const sx of [-1, 1]) {
    k.cyl(0.22, 0.12, DARK, sx * 0.48, 1.15, 1.06, { axis: 'z', seg: 10 }); // intakes
    k.cyl(0.16, 0.5, 0x3a3d40, sx * 0.55, 1.1, -1.2, { axis: 'z', r2: 0.2, seg: 8, ry: sx * 0.35 }); // exhausts
    k.box(0.04, 1.0, 1.1, tone(color, 0.85), sx * 1.06, 0.05, 0.0); // sliding door
    k.box(0.05, 0.45, 0.5, 0x81d4fa, sx * 1.07, 0.3, 0.05);
    k.box(0.05, 0.05, 1.1, STEEL, sx * 1.08, 0.58, 0.0); // door rail
    // Skids on struts
    k.tube([[sx * 0.95, -1.35, -1.4], [sx * 0.95, -1.35, 1.9], [sx * 0.95, -1.18, 2.4]], 0.07, DARK, { sides: 6 });
    for (const z of [-0.6, 1.3]) k.tube([[sx * 0.6, -0.75, z], [sx * 0.95, -1.35, z]], 0.06, DARK, { sides: 5, seg: 2 });
  }
  // Tail: a tapered boom, a swept fin, stabilisers and a tail light
  k.cyl(0.2, 4.6, color, 0, 0.35, -3.7, { axis: 'z', r2: 0.52, seg: 12 });
  k.slab(0.12, 1.7, 1.1, color, 0, 1.15, -5.85, { td: 0.6, tz: -0.25 });
  k.slab(2.0, 0.1, 0.55, color, 0, 0.35, -5.2, { tw: 0.8 });
  k.box(2.0, 0.12, 0.08, trim, 0, 0.36, -4.95);
  k.ball(0.07, glowMat(h, 0xff1744), 0, 2.0, -6.05, { seg: 6, rows: 4 });
  // Rotor mast and swashplate
  k.cyl(0.16, 0.7, DARK, 0, 1.7, 0.3, { seg: 8 });
  k.cyl(0.32, 0.12, STEEL, 0, 1.55, 0.3, { seg: 12 });

  // Main rotor: a hub and long blades with painted tips
  const prop = new THREE.Group();
  prop.position.set(0, 2.05, 0.3);
  bank.add(prop);
  const nb = big ? 4 : 2;
  const p = kit(h, prop, `heliprop${nb}`);
  p.cyl(0.32, 0.18, DARK, 0, 0, 0, { seg: 12 });
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * PI * 2;
    p.box(0.34, 0.05, 4.2, 0x2b2b2b, Math.sin(a) * 2.3, 0, Math.cos(a) * 2.3, { ry: a });
    p.box(0.35, 0.06, 0.4, HAZARD, Math.sin(a) * 4.2, 0, Math.cos(a) * 4.2, { ry: a });
    p.box(0.2, 0.12, 0.4, STEEL, Math.sin(a) * 0.35, 0, Math.cos(a) * 0.35, { ry: a });
  }
  p.done();
  // Tail rotor: spins about x
  const tail = new THREE.Group();
  tail.position.set(0.15, 1.2, -5.95);
  bank.add(tail);
  const t = kit(h, tail, 'helitail');
  t.cyl(0.12, 0.14, DARK, 0.04, 0, 0, { axis: 'x', seg: 8 });
  for (let i = 0; i < 4; i++) t.box(0.04, 1.0, 0.18, 0x2b2b2b, 0.08, Math.cos((i * PI) / 2) * 0.5, Math.sin((i * PI) / 2) * 0.5, { rx: (i * PI) / 2 });
  t.done();

  // Nose gun(s): twin miniguns on the top path, one chin gun otherwise
  const guns = top ? 2 : 1;
  for (let gi = 0; gi < guns; gi++) {
    const x = guns > 1 ? (gi ? 1.25 : -1.25) : 0;
    const y = guns > 1 ? -0.7 : -1.0;
    if (top) {
      k.box(0.5, 0.5, 0.7, DARK, x, y, 2.4, { r: 0.08 });
      k.box(0.6, 0.12, 0.5, tone(color, 0.8), x * 0.6, y + 0.25, 2.2); // mount arm
      spinBarrels(h, bank, `${key}:mini${gi}`, x, y, 2.7, 1.25, 6, 0.13, GUN, big ? trim : null);
    } else {
      k.ball(0.32, DARK, x, y, 2.6, { seg: 10, rows: 7 });
      barrel(k, x, y, 2.7, 1.1, 0.07, GUN, { sleeve: true });
    }
    point(x, y, 3.9, muzzles);
  }
  if (level >= 1) {
    // AP Rounds: an ammo can under the cabin with a belt to the gun
    crate(k, 0.6, -1.1, 1.3, 0.45, 0.4, 0.7, 0x4e5b31);
    k.tube([[0.4, -1.0, 1.65], [0.2, -1.05, 2.2], [0, -1.0, 2.5]], 0.05, 0xc9a227, { sides: 4 });
  }
  if (level >= 2) {
    // Enhanced Radar: a dome over the rotor hub and a whip aerial
    k.cyl(0.07, 0.6, DARK, 0, 2.35, 0.3, { seg: 6 });
    k.ball(0.42, 0xeceff1, 0, 2.75, 0.3, { sy: 0.7, seg: 12, rows: 8 });
    k.torus(0.42, 0.03, tone(0xeceff1, 0.8), 0, 2.72, 0.3, { rx: PI / 2, seg: 12 });
    antenna(k, -0.6, 0.65, -1.4, 0.9);
    k.ball(0.06, glowMat(h, 0x76ff03), -0.6, 2.0, -1.45, { seg: 5, rows: 3 });
  }
  if (level >= 3) {
    // Air to Ground Missiles: stub wings with rocket pods (more pods on the Bottom path)
    const pods = bot ? (big ? 3 : 2) : 1;
    const podC = bot ? 0x5d4037 : 0x37474f;
    for (const side of [-1, 1]) {
      const span = 1.4 + pods * 0.55;
      k.slab(span, 0.13, 0.9, color, side * (0.95 + span / 2), -0.2, 0.2, { td: 0.7 });
      for (let j = 0; j < pods; j++) {
        const x = side * (1.75 + j * 0.55);
        k.box(0.1, 0.22, 0.4, DARK, x, -0.35, 0.3); // pylon
        k.cyl(0.24, 1.5, podC, x, -0.6, 0.3, { axis: 'z', seg: 12 });
        k.cyl(0.24, 0.2, tone(podC, 0.7), x, -0.6, 1.0, { axis: 'z', r2: 0.18, seg: 12 });
        for (let r = 0; r < 6; r++) {
          const a = (r / 6) * PI * 2;
          k.cyl(0.04, 0.04, 0x0e0f10, x + Math.cos(a) * 0.12, -0.6 + Math.sin(a) * 0.12, 1.11, { axis: 'z', seg: 5 });
        }
        k.cyl(0.07, 0.06, glowMat(h, 0xff3d00), x, -0.6, 1.11, { axis: 'z', seg: 8 });
        point(x, -0.6, 1.2, missiles);
      }
    }
  }
  if (bot) {
    // Modified Payload: a sensor ball under the nose (hidden detection)
    k.ball(0.4, DARK, 0, -1.05, 2.95, { seg: 12, rows: 8 });
    k.cyl(0.16, 0.06, glowMat(h, 0x00e5ff), 0, -1.05, 3.34, { axis: 'z', seg: 10 });
    k.cyl(0.07, 0.06, glowMat(h, 0x00e5ff), 0.2, -0.88, 3.3, { axis: 'z', seg: 8 });
  }
  k.done();
  const bay = new THREE.Object3D();
  bay.position.set(0, -1.2, 0.3);
  bank.add(bay);
  heli.userData = { bank, prop, tail, bay, missiles };
  return { heli, muzzles };
}

// ------------------------------------------------------------------ Pursuit

/**
 * Pursuit tower: a helipad with edge lights, a windsock and a fuel cart, plus the helicopter the
 * view flies around. Lv 2 a radar dish beside the pad, Lv 3 a missile trolley, Lv 4 a path flag.
 */
export function makePursuitModel(level, bottom) {
  const u = makeThing();
  const k = kit(u, u.body, `pursuitpad${level}${bottom ? 'B' : 'T'}`);
  k.slab(4.2, 0.3, 4.2, 0x757575, 0, 0.15, 0, { tw: 0.97, td: 0.97 });
  k.cyl(1.75, 0.03, 0x5f5f5f, 0, 0.31, 0, { seg: 28 });
  k.torus(1.55, 0.05, 0xfdd835, 0, 0.32, 0, { rx: PI / 2, seg: 28 });
  for (const sx of [-1, 1]) k.box(0.32, 0.04, 1.6, 0xfdd835, sx * 0.5, 0.33, 0);
  k.box(0.7, 0.04, 0.3, 0xfdd835, 0, 0.33, 0);
  const lights = glowMat(u, 0xff9100);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2 + PI / 8;
    const x = Math.cos(a) * 1.92;
    const z = Math.sin(a) * 1.92;
    k.cyl(0.1, 0.12, DARK, x, 0.36, z, { seg: 8 });
    k.ball(0.08, lights, x, 0.44, z, { seg: 6, rows: 4 });
  }
  // Windsock on a pole: striped orange-and-white cone
  k.cyl(0.06, 2.6, 0xbdbdbd, 1.75, 1.6, -1.75, { seg: 6 });
  k.torus(0.2, 0.03, STEEL, 1.75, 2.75, -1.55, { seg: 10 });
  for (let i = 0; i < 4; i++) k.cyl(0.2 - i * 0.035, 0.25, i % 2 ? 0xfafafa : 0xff6d00, 1.75, 2.72 - i * 0.03, -1.4 + i * 0.25, { axis: 'z', r2: 0.2 - (i + 1) * 0.035, seg: 10, rx: 0.1 });
  // Fuel cart: a tank on a little frame with wheels
  const fx = -1.65;
  const fz = 1.75;
  k.box(0.9, 0.08, 0.55, DARK, fx, 0.55, fz);
  k.cyl(0.24, 0.85, 0xc62828, fx, 0.85, fz, { axis: 'x', seg: 12 });
  for (const sx of [-1, 1]) k.ball(0.24, 0xc62828, fx + sx * 0.42, 0.85, fz, { sx: 0.3, seg: 10, rows: 6 });
  k.cyl(0.06, 0.12, DARK, fx, 1.12, fz, { seg: 6 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.cyl(0.12, 0.08, 0x15171a, fx + sx * 0.32, 0.42, fz + sz * 0.3, { axis: 'x', seg: 10 });
  k.tube([[fx + 0.45, 0.8, fz], [fx + 0.7, 0.4, fz - 0.2], [fx + 0.6, 0.34, fz - 0.6]], 0.03, 0x111111, { sides: 4 });
  if (level >= 3) {
    // Missile trolley: three missiles with fins on a low cart
    const mx = -1.55;
    const mz = -1.6;
    k.box(1.2, 0.1, 0.7, 0x37474f, mx, 0.55, mz);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.cyl(0.1, 0.06, 0x15171a, mx + sx * 0.45, 0.42, mz + sz * 0.3, { axis: 'x', seg: 8 });
    for (const [oz, oy] of [[-0.18, 0.72], [0.18, 0.72], [0, 0.92]]) {
      k.cyl(0.09, 1.1, 0xeceff1, mx, oy, mz + oz, { axis: 'x', seg: 8 });
      k.cyl(0.09, 0.2, 0xe53935, mx + 0.65, oy, mz + oz, { axis: 'x', r2: 0.01, seg: 8 });
      k.box(0.18, 0.24, 0.02, 0x546e7a, mx - 0.48, oy, mz + oz);
    }
  }
  if (level >= 4) flagPole(k, 1.85, 0.3, 1.2, 1.7, bottom ? 0xff6d00 : 0xd50000, 0xfafafa);
  k.done();
  if (level >= 2) {
    // Enhanced Radar: a dish on a mast beside the pad
    const r = kit(u, u.body, 'pursuitmast');
    r.cyl(0.3, 0.2, DARK, 1.7, 0.4, 1.7, { seg: 10 });
    r.cyl(0.07, 1.1, 0x616161, 1.7, 1.05, 1.7, { seg: 6 });
    r.done();
    dish(u, u.body, 'pursuitdish', 1.7, 1.7, 1.7, 0.55, 0xeceff1, glowMat(u, 0xff1744)).rotation.y = -0.8;
  }
  const { heli, muzzles } = makeHeli(u, level, bottom);
  u.plane = heli;
  u.heli = true;
  u.muzzles = muzzles;
  u.spin = u.spin ?? null;
  u.flyHeight = 13;
  u.tracer = level >= 5 && !bottom ? 0xff5252 : 0xffd740;
  return u;
}
export const makePursuit = (level) => makePursuitModel(level, false);
export const makePursuitBottom = (level) => makePursuitModel(level, true);
