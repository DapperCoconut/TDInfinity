// Tower models: machines, batch 8 (rebuilt with the vehicle kit in ../vehicles.js).
// In here: Buzzer, Nuki Launcher, Kart Kid, Balloon Pal, Scarecrow, Time Dilator: the hero
// towers built round a big object (a hive, a cannon, a kart, balloons, a pole, a robot body).
// Each makeX(level) builds one tower's look; TOWER_MODELS in ../models.js says which tower uses which.
// The Kart Kid's summoned karts (kartUnit in newmodels/h.js) are unchanged.

import * as THREE from 'three';
import { barrel, crate, glowMat, kit, lamp, tone, wheelGeo } from '../vehicles.js';
import { gunMuzzle, makeThing } from './bits.js';
import { lv, seeThrough, spinner } from './machines5.js';

const PI = Math.PI;
const INK = 0x1a1a1a;
const WOOD = 0x8d6e63;
const GRASS = 0x7cb342;

// ------------------------------------------------------------------ small shared pieces

/** A group on `parent` at (x, y, z), scaled by s and turned by ry. */
function grp(parent, x, y, z, s = 1, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  g.rotation.y = ry;
  parent.add(g);
  return g;
}

/** A ribbed jack-o'-lantern `size` wide centred on (x, y, z), its carved face (material `lit`) toward +z. */
function jack(k, size, x, y, z, lit) {
  const R = size / 2;
  k.ball(R * 0.92, 0xef6c00, x, y, z, { sy: 0.85, seg: 14, rows: 10 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    k.ball(R * 0.6, i % 2 ? 0xf57c00 : 0xe65100, x + Math.cos(a) * R * 0.46, y, z + Math.sin(a) * R * 0.46, { sy: 1.4, seg: 10, rows: 8 });
  }
  k.cyl(R * 0.1, R * 0.45, 0x33691e, x, y + R * 0.95, z, { r2: R * 0.07, seg: 6, rz: 0.2 });
  k.ball(R * 0.14, 0x558b2f, x + R * 0.14, y + R * 0.86, z + R * 0.05, { sx: 1.6, sy: 0.3, seg: 6, rows: 4 }); // leaf
  // Triangle eyes and nose, a wide toothy grin
  for (const sx of [-1, 1]) k.cyl(R * 0.2, 0.12, lit, x + sx * R * 0.4, y + R * 0.2, z + R * 0.98, { axis: 'z', seg: 3, rz: PI });
  k.cyl(R * 0.1, 0.12, lit, x, y, z + R * 1.02, { axis: 'z', seg: 3, rz: PI });
  k.box(R * 1.0, R * 0.2, 0.12, lit, x, y - R * 0.36, z + R * 0.96);
  for (const sx of [-0.22, 0.22]) k.box(R * 0.13, R * 0.1, 0.13, 0x6d2a00, x + sx * R, y - R * 0.3, z + R * 0.97);
}

/** A straw skep (dome beehive) of radius r standing on (x, y, z), its door toward +z. */
export function skep(k, r, x, y, z, door = 0x3e2410) {
  const n = 6;
  const STRAW = 0xe0b050;
  let top = y;
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    const R = r * Math.cos(f * 1.25);
    const ty = y + r * 0.12 + i * r * 0.27;
    k.cyl(R * 0.94, r * 0.28, STRAW, x, ty, z, { seg: 16 });
    k.torus(Math.max(R * 0.9, r * 0.12), r * 0.11, i % 2 ? STRAW : tone(STRAW, 0.82), x, ty, z, { rx: PI / 2, seg: 18 });
    top = ty;
  }
  k.ball(r * 0.3, tone(STRAW, 0.9), x, top + r * 0.12, z, { sy: 0.7, seg: 10, rows: 6 });
  k.cyl(r * 0.2, r * 0.3, door, x, y + r * 0.2, z + r * 0.86, { axis: 'z', seg: 10, sx: 1.4 });
}

// ------------------------------------------------------------------ Buzzer

const FUR = 0xd9822b;

/** A round fuzzy bee, about 2.6 tall at scale 1, facing +z: stripes, a face, curly antennae, see-through wings. */
export function bee(k, wing) {
  k.ball(1, FUR, 0, 1, 0, { sz: 0.95, seg: 16, rows: 12 });
  for (const dy of [-0.55, -0.18]) k.torus(Math.sqrt(1 - dy * dy) * 0.99, 0.1, INK, 0, 1 + dy, 0, { rx: PI / 2, seg: 22 });
  for (let i = 0; i < 3; i++) k.cyl(0.08, 0.3, tone(FUR, 1.15), (i - 1) * 0.12, 2.05, 0.05, { r2: 0.0, seg: 5, rz: (i - 1) * -0.4 }); // tuft
  // Face
  for (const sx of [-1, 1]) {
    k.ball(0.17, INK, sx * 0.36, 1.35, 0.84, { sy: 1.35, sz: 0.5, seg: 10, rows: 8 });
    k.ball(0.06, 0xffffff, sx * 0.36 + 0.06, 1.45, 0.92, { seg: 6, rows: 4 });
    k.ball(0.12, 0xff8a80, sx * 0.62, 1.1, 0.74, { sz: 0.4, seg: 8, rows: 5 });
  }
  k.torus(0.16, 0.035, INK, 0, 1.12, 0.93, { arc: PI, rz: PI, seg: 10 }); // smile
  // Curly antennae with round tips
  for (const sd of [-1, 1]) {
    k.tube([[sd * 0.22, 1.9, 0.2], [sd * 0.38, 2.35, 0.35], [sd * 0.66, 2.55, 0.3], [sd * 0.74, 2.38, 0.3], [sd * 0.62, 2.32, 0.3]], 0.045, INK, { sides: 5 });
    k.ball(0.09, INK, sd * 0.62, 2.32, 0.3, { seg: 6, rows: 4 });
  }
  // Stinger, little feet
  k.cyl(0.14, 0.4, INK, 0, 0.55, -0.98, { r2: 0, seg: 8, rx: -PI / 2 - 0.35 });
  for (const sx of [-0.3, 0.3]) k.ball(0.14, INK, sx, 0.08, 0.45, { sz: 1.4, sy: 0.6, seg: 8, rows: 5 });
  // Wings
  for (const sd of [-1, 1]) {
    k.ball(0.5, wing, sd * 0.85, 1.75, -0.55, { sx: 1.6, sy: 0.1, sz: 1.0, rz: sd * 0.5, seg: 12, rows: 6 });
    k.ball(0.32, wing, sd * 0.72, 1.55, -0.85, { sx: 1.5, sy: 0.1, sz: 0.9, rz: sd * 0.35, seg: 10, rows: 5 });
  }
}

/**
 * Buzzer (0-4): a round bee with a leaf hat and a little skep pack, on a big pink flower. Lv 1 a
 * bigger pack, Lv 2 a honey pot with a dipper, Lv 3 a straw beehive on a stand behind it, Lv 4 a
 * big glowing hive with worker bees flying round it.
 */
export function makeBuzzer(level) {
  level = lv(level, 4);
  const u = makeThing();
  const honey = glowMat(u, 0xffa000);
  const cell = glowMat(u, 0xffb300);
  const wing = seeThrough(u, 0xe1f5fe, 0.6);
  const k = kit(u, u.body, `buzzer${level}`);
  k.slab(4.4, 0.25, 4.4, GRASS, 0, 0.125, 0, { tw: 0.97, td: 0.97 });
  for (const [x, z, a] of [[-1.7, 1.6, 0.5], [1.8, 1.4, -0.4], [-1.9, -0.3, 1.2], [1.95, -1.6, 2.2]]) {
    k.ball(0.4, 0x558b2f, x, 0.3, z, { sx: 1.4, sy: 0.15, sz: 0.6, ry: a, seg: 8, rows: 5 });
    k.box(0.5, 0.03, 0.04, 0x33691e, x, 0.36, z, { ry: a });
  }
  for (const [x, z] of [[-1.5, -1.9], [1.2, 1.95], [1.9, 0.5]]) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      k.ball(0.07, 0xfafafa, x + Math.cos(a) * 0.09, 0.3, z + Math.sin(a) * 0.09, { seg: 5, rows: 3 });
    }
    k.ball(0.05, 0xffd600, x, 0.33, z, { seg: 5, rows: 3 });
  }
  // The flower: two rings of petals round a seedy yellow middle
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    k.ball(0.7, 0xf48fb1, Math.cos(a) * 1.3, 0.42, Math.sin(a) * 1.3, { sx: 1.05, sy: 0.2, sz: 0.62, ry: -a, seg: 12, rows: 6 });
    k.ball(0.5, 0xf8bbd0, Math.cos(a + PI / 6) * 1.05, 0.5, Math.sin(a + PI / 6) * 1.05, { sx: 1.0, sy: 0.2, sz: 0.6, ry: -a - PI / 6, seg: 10, rows: 5 });
  }
  k.cyl(0.95, 0.35, 0xffd600, 0, 0.55, 0, { seg: 20 });
  k.ball(0.95, 0xffca28, 0, 0.7, 0, { sy: 0.12, seg: 20, rows: 6 });
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4;
    const r = 0.25 + (i / 14) * 0.6;
    k.ball(0.06, 0x8d5524, Math.cos(a) * r, 0.8, Math.sin(a) * r, { seg: 5, rows: 3 });
  }
  if (level >= 2) {
    // Honey pot with a glowing top, a drip and a wooden dipper
    const px = 1.8;
    const pz = 1.1;
    k.cyl(0.5, 0.9, 0x8d5524, px, 0.7, pz, { r2: 0.38, seg: 16 });
    k.ball(0.52, 0x8d5524, px, 0.42, pz, { sy: 0.45, seg: 16, rows: 6 });
    k.torus(0.4, 0.07, tone(0x8d5524, 0.8), px, 1.15, pz, { rx: PI / 2, seg: 16 });
    k.cyl(0.36, 0.06, honey, px, 1.16, pz, { seg: 16 });
    k.ball(0.09, honey, px + 0.22, 1.0, pz + 0.38, { sy: 1.8, seg: 6, rows: 4 });
    k.torus(0.48, 0.06, 0xffd54f, px, 0.75, pz, { rx: PI / 2, seg: 16 });
    k.cyl(0.04, 1.0, WOOD, px - 0.15, 1.5, pz - 0.1, { rz: 0.35, seg: 6 });
    for (let i = 0; i < 3; i++) k.torus(0.1 - i * 0.015, 0.035, 0xd7a86e, px + 0.02 + i * 0.03, 1.15 - i * 0.07, pz - 0.1, { rx: PI / 2, rz: 0.35, seg: 8 });
  }
  if (level >= 3) {
    // A straw beehive on a wooden stand behind the flower (bigger and glowing at Lv 4)
    const big = level >= 4;
    const r = big ? 1.15 : 0.9;
    const hx = -1.3;
    const hz = -1.4;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.cyl(0.07, 0.6, WOOD, hx + sx * r * 0.7, 0.55, hz + sz * r * 0.7, { seg: 6 });
    k.box(r * 1.9, 0.12, r * 1.9, tone(WOOD, 0.85), hx, 0.88, hz, { r: 0.04 });
    skep(k, r, hx, 0.94, hz, big ? cell : 0x3e2410);
    if (big) {
      for (const [a, f] of [[0.3, 0.35], [-0.5, 0.55], [0.9, 0.75], [-0.1, 1.0]]) {
        k.cyl(0.13, 0.05, cell, hx + Math.sin(a) * r * 0.85, 0.94 + f * r * 1.4, hz + Math.cos(a) * r * 0.85, { seg: 6, rx: PI / 2, ry: a });
      }
      k.ball(0.35, cell, hx, 0.94 + r * 1.75, hz, { seg: 10, rows: 7 });
    }
  }
  k.done();
  // The bee, with a leaf hat and a skep pack
  const g = grp(u.body, 0, 0.75, 0, 1.25);
  const b = kit(u, g, 'buzzerBee');
  bee(b, wing);
  b.ball(0.6, 0x43a047, 0.05, 2.05, 0.05, { sx: 1.15, sy: 0.12, sz: 0.85, ry: 0.4, rz: 0.08, seg: 12, rows: 6 });
  b.box(1.0, 0.04, 0.06, 0x2e7d32, 0.05, 2.12, 0.05, { ry: 0.4 });
  b.cyl(0.04, 0.3, 0x33691e, 0.1, 2.25, 0.05, { seg: 5, rz: 0.3 });
  b.done();
  const pk = kit(u, grp(g, 0, 0.7, -0.98, level >= 1 ? 1.3 : 1), `buzzerPack${level >= 4 ? 1 : 0}`);
  skep(pk, 0.5, 0, 0, 0, level >= 4 ? cell : 0x3e2410);
  pk.box(0.08, 0.9, 0.06, INK, -0.28, 0.4, 0.42, { rx: 0.35 }); // straps
  pk.box(0.08, 0.9, 0.06, INK, 0.28, 0.4, 0.42, { rx: 0.35 });
  pk.done();
  if (level >= 4) {
    // Worker bees flying round the hive
    const ring = spinner(u, u.body, -1.3, 2.8, -1.4, 'y');
    for (const [a, y] of [[0, 0.4], [PI * 0.66, 1.4], [PI * 1.33, -0.3]]) {
      const wg = grp(ring, Math.cos(a) * 1.8, y, Math.sin(a) * 1.8, 0.24, -a);
      const w = kit(u, wg, 'buzzerWorker');
      bee(w, wing);
      w.done();
    }
    u.idleSpin = 1.2;
  }
  gunMuzzle(u, g, 0, 1.2, 1.1);
  return u;
}

// ------------------------------------------------------------------ Nuki Launcher

/** A fluffy tanuki, about 2.2 tall, facing +z. */
function tanuki(k, leaf) {
  const FUR_T = 0xc99a86;
  const LIGHT = 0xf3d9cc;
  const DARK = 0x3b2a26;
  for (const sx of [-0.3, 0.3]) k.ball(0.22, DARK, sx, 0.13, 0.12, { sy: 0.6, sz: 1.3, seg: 8, rows: 6 });
  k.ball(0.6, FUR_T, 0, 0.8, 0, { sy: 0.85, sz: 0.85, seg: 14, rows: 10 });
  k.ball(0.4, LIGHT, 0, 0.75, 0.3, { sy: 0.85, sz: 0.5, seg: 12, rows: 8 });
  // Head: round, cheek fluff, dark mask, bright eyes, a pale snout
  k.ball(0.52, FUR_T, 0, 1.55, 0.05, { sx: 1.05, sy: 0.85, sz: 0.9, seg: 14, rows: 10 });
  for (const sx of [-1, 1]) k.ball(0.26, FUR_T, sx * 0.45, 1.38, 0.12, { sx: 1.25, sy: 0.8, seg: 8, rows: 6 });
  k.ball(0.3, DARK, 0, 1.6, 0.34, { sx: 1.65, sy: 0.5, sz: 0.55, seg: 12, rows: 6 });
  for (const sx of [-1, 1]) {
    k.ball(0.08, 0xffffff, sx * 0.2, 1.63, 0.49, { seg: 8, rows: 6 });
    k.ball(0.045, 0x111111, sx * 0.2, 1.63, 0.55, { seg: 6, rows: 4 });
  }
  k.ball(0.2, LIGHT, 0, 1.38, 0.44, { sx: 1.2, sy: 0.75, seg: 10, rows: 7 });
  k.ball(0.07, DARK, 0, 1.45, 0.6, { sx: 1.3, seg: 6, rows: 4 });
  k.box(0.12, 0.04, 0.04, 0x6d2f2f, 0, 1.3, 0.6);
  for (const sd of [-1, 1]) {
    k.cyl(0.17, 0.35, FUR_T, sd * 0.33, 2.02, 0, { r2: 0.03, seg: 8, rz: -sd * 0.3 });
    k.cyl(0.09, 0.16, DARK, sd * (0.33 + 0.07), 2.16, 0.0, { r2: 0.01, seg: 8, rz: -sd * 0.3 });
    k.ball(0.17, FUR_T, sd * 0.55, 1.0, 0.35, { seg: 8, rows: 6 }); // fists up
  }
  // Big bushy ringed tail
  for (const [z, y, r, c] of [[-0.55, 0.5, 0.3, FUR_T], [-0.78, 0.55, 0.33, DARK], [-0.95, 0.62, 0.34, FUR_T], [-1.15, 0.72, 0.31, DARK], [-1.3, 0.82, 0.26, FUR_T], [-1.45, 0.92, 0.18, DARK]]) {
    k.ball(r, c, 0, y, z, { sz: c === DARK ? 0.55 : 1, seg: 10, rows: 7 });
  }
  if (leaf) {
    k.ball(0.3, 0x43a047, 0, 2.02, 0.05, { sy: 0.15, sz: 0.65, ry: 0.5, rz: 0.15, seg: 10, rows: 5 });
    k.cyl(0.03, 0.2, 0x2e7d32, 0, 2.12, 0.05, { seg: 5 });
  }
}

/** A spoked wooden cart wheel of radius r, its axle along x, centred on (x, y, z). */
function spokedWheel(k, r, x, y, z, col = 0x6d4c41) {
  k.torus(r * 0.9, r * 0.1, col, x, y, z, { ry: PI / 2, seg: 18 });
  k.torus(r * 0.98, r * 0.05, 0x37474f, x, y, z, { ry: PI / 2, seg: 18 });
  k.cyl(r * 0.2, r * 0.4, tone(col, 0.85), x, y, z, { axis: 'x', seg: 10 });
  k.cyl(r * 0.1, r * 0.46, 0x37474f, x, y, z, { axis: 'x', seg: 8 });
  for (let i = 0; i < 8; i++) k.box(r * 0.08, r * 1.7, r * 0.08, col, x, y, z, { rx: (i * PI) / 8 });
}

/**
 * Nuki Launcher (0-4): a tanuki beside a wheeled launcher cannon aimed up and forward. Lv 1 a
 * bigger banded cannon and an ammo crate, Lv 2 a drum-shaped breech and a sandbag wall, Lv 3
 * a double cannon with gold bands, Lv 4 a huge leaf-decorated cannon with a glowing rim.
 */
export function makeNukiLauncher(level) {
  level = lv(level, 4);
  const u = makeThing();
  const rim = glowMat(u, 0xffab40);
  const k = kit(u, u.body, `nuki${level}`);
  k.slab(4.4, 0.25, 4.4, 0x8d7b5a, 0, 0.125, 0, { tw: 0.97, td: 0.97 });
  for (const [x, z, r] of [[1.9, 1.8, 0.22], [-1.95, 1.2, 0.16], [1.8, -0.4, 0.14], [-0.3, 1.9, 0.12]]) k.ball(r, 0x8d8d8d, x, 0.25, z, { sy: 0.6, seg: 7, rows: 5 });
  for (const [x, z] of [[-1.9, -1.8], [0.4, -1.95], [1.95, 0.8]]) for (let i = 0; i < 3; i++) k.cyl(0.04, 0.3, 0x689f38, x + (i - 1) * 0.08, 0.38, z, { r2: 0, seg: 4, rz: (i - 1) * 0.35 });
  // Carriage: cheek plates, axle, two spoked wheels and a trail down to the ground
  const cx = -0.9;
  const cz = -0.2;
  const WOODC = level >= 4 ? 0x5d4037 : 0x6d4c41;
  for (const sx of [-0.62, 0.62]) {
    k.prism([[-0.9, 0.6], [-0.5, 1.75], [0.5, 1.75], [0.8, 0.6]], 0.16, WOODC, cx + sx, 0, cz);
    k.cyl(0.08, 0.06, 0x37474f, cx + sx * 1.15, 1.6, cz, { axis: 'x', seg: 8 });
  }
  k.cyl(0.1, 2.3, 0x37474f, cx, 0.75, cz, { axis: 'x', seg: 8 });
  for (const sx of [-1.12, 1.12]) spokedWheel(k, 0.75, cx + sx, 0.75, cz, WOODC);
  k.slab(0.5, 0.18, 1.8, WOODC, cx, 0.55, cz - 1.25, { rx: -0.3, tw: 0.9 });
  k.box(0.7, 0.4, 0.08, 0x37474f, cx, 0.32, cz - 2.1, { rx: 0.4 });
  if (level >= 1) {
    // Ammo crate, a spare tanuki helmet and a stack of round shots
    crate(k, 1.6, 0.6, -1.5, 1.0, 0.7, 0.8, WOOD);
    k.ball(0.3, 0x78909c, 1.6, 0.98, -1.5, { sy: 0.6, seg: 10, rows: 5 });
    k.cyl(0.33, 0.04, 0x546e7a, 1.6, 0.98, -1.5, { seg: 12 });
    for (const [x, y, z] of [[0.85, 0.4, -1.75], [1.15, 0.4, -1.75], [1.0, 0.4, -1.5], [1.0, 0.62, -1.66]]) k.ball(0.15, 0x3a3a3a, x, y, z, { seg: 8, rows: 6 });
  }
  if (level >= 2) {
    // Sandbag wall round the front
    for (let i = 0; i < 7; i++) {
      const a = PI * 0.15 + (i / 6) * PI * 0.9;
      k.box(0.9, 0.42, 0.5, i % 2 ? 0xbcaaa4 : 0xa1887f, Math.cos(a) * 2.6, 0.45, Math.sin(a) * 2.6, { r: 0.15, ry: -a + PI / 2 });
    }
  }
  k.done();
  // The cannon, tilted up
  const big = [1, 1.2, 1.3, 1.3, 1.7][level];
  const metal = level >= 4 ? 0x5d4037 : level >= 3 ? 0x37474f : 0x455a64;
  const band = level >= 4 ? 0xffc400 : level >= 3 ? 0xffb300 : 0x263238;
  const gun = grp(u.body, cx, 1.6, cz);
  gun.rotation.x = -0.75;
  const gk = kit(u, gun, `nukiGun${level}`);
  const xs = level >= 3 ? [-0.42, 0.42] : [0];
  const r = level >= 3 ? 0.36 : 0.38 * big;
  const len = 2.2 * big;
  gk.cyl(0.13, 1.6 * Math.max(1, big * 0.9), 0x37474f, 0, 0, 0, { axis: 'x', seg: 8 }); // trunnions
  if (level === 2 || level >= 4) {
    // Drum-shaped breech with a band round it
    const d = 0.8 * (level >= 4 ? 1.3 : 1);
    gk.cyl(d, d * 1.1, metal, 0, 0, -0.25, { axis: 'z', seg: 18 });
    gk.torus(d * 1.01, 0.08, band, 0, 0, -0.25, { seg: 18 });
    for (const f of [-0.45, 0.45]) gk.torus(d * 0.98, 0.05, tone(metal, 0.75), 0, 0, -0.25 + f * d, { seg: 18 });
    gk.ball(d * 0.5, metal, 0, 0, -0.25 - d * 0.55, { sz: 0.6, seg: 12, rows: 7 });
  } else {
    gk.ball(0.62 * big, metal, 0, 0, -0.3, { sz: 1.2, seg: 14, rows: 9 });
    gk.ball(0.16, tone(metal, 0.8), 0, 0, -0.3 - 0.78 * big, { seg: 8, rows: 6 }); // knob at the back
  }
  for (const x of xs) {
    barrel(gk, x, 0, 0, len, r, metal, { r2: r * 0.95, seg: 14 });
    gk.torus(r * 1.18, r * 0.2, band, x, 0, len - 0.1, { seg: 16 }); // muzzle swell
    if (level >= 1) gk.torus(r * 1.05, r * 0.12, band, x, 0, len * 0.45, { seg: 16 });
    gk.torus(r * 1.08, r * 0.12, band, x, 0, 0.25, { seg: 16 });
    if (level >= 4) gk.torus(r * 1.25, 0.06, rim, x, 0, len + 0.02, { seg: 16 });
    gunMuzzle(u, gun, x, 0, len + 0.1);
  }
  if (level >= 4) {
    for (const [x, y, z, rz] of [[0.75, 0.55, 0.6, -0.5], [-0.75, 0.55, 1.2, 0.5], [0.65, -0.45, 1.8, 0.4], [0, 0.85, 2.6, 0]]) {
      gk.ball(0.45, 0x43a047, x, y, z, { sy: 0.12, sz: 0.6, rx: 0.3, ry: 0.4, rz, seg: 10, rows: 5 });
      gk.box(0.7, 0.03, 0.04, 0x2e7d32, x, y + 0.02, z, { rx: 0.3, ry: 0.4, rz });
    }
  }
  gk.done();
  const t = grp(u.body, 1.3, 0.25, 0.4, 1.6, -0.3);
  const tk = kit(u, t, `nukiTanuki${level >= 4 ? 1 : 0}`);
  tanuki(tk, level >= 4);
  tk.done();
  u.projectile = { color: 0xc99a86, size: 0.7, arc: 6 };
  return u;
}

// ------------------------------------------------------------------ Kart Kid

/** The hooded kid in his cardboard-box kart (painted red at Lv 4), facing +z, about 3.4 tall. */
function kart(k, painted, lit) {
  const box = painted ? 0xe53935 : 0xc8a165;
  const edge = tone(box, 0.75);
  k.box(1.8, 0.9, 2.6, box, 0, 0.8, 0, { r: 0.06 });
  k.box(1.6, 0.06, 2.4, painted ? 0x7f1010 : 0x8a6a3a, 0, 1.24, 0);
  k.box(0.3, 0.92, 2.62, painted ? 0xfafafa : 0xe6d3a8, 0, 0.8, 0); // tape / racing stripe
  for (const sx of [-1, 1]) {
    k.box(0.04, 0.04, 2.62, edge, sx * 0.9, 1.25, 0); // folded top edges
    k.box(0.04, 0.5, 2.2, box, sx * 1.05, 1.42, 0, { rz: sx * 0.5 }); // flaps
  }
  if (!painted) {
    k.box(1.6, 0.04, 0.5, box, 0, 1.36, 1.46, { rx: 0.6 });
    k.box(0.5, 0.3, 0.02, 0x8a6a3a, 0.45, 0.85, 1.31); // "this side up" print
    k.cyl(0.07, 0.25, 0x8a6a3a, 0.35, 0.95, 1.32, { r2: 0, seg: 3, axis: 'z' });
  }
  // Round wheels on little axles
  const ws = painted ? 0.85 : 0.7;
  for (const z of [-0.85, 0.85]) {
    k.cyl(0.06, 2.0, 0x3a3d40, 0, ws / 2, z, { axis: 'x', seg: 6 });
    for (const x of [-1.0, 1.0]) k.geo(wheelGeo(ws / 2, 0.36, x, { rim: painted ? 0xffc400 : 0x9e9e9e, lugs: false }), x, ws / 2, z);
  }
  // The kid: a white body and a tall pointed hood with a stitched scar
  const WHITE = 0xf5f5f5;
  k.box(0.85, 0.6, 0.65, WHITE, 0, 1.5, -0.3, { r: 0.2 });
  k.ball(0.48, WHITE, 0, 2.08, -0.25, { sy: 0.85, seg: 14, rows: 10 });
  k.ball(0.34, WHITE, 0, 2.55, -0.3, { seg: 12, rows: 8 });
  k.ball(0.22, WHITE, 0, 2.92, -0.38, { seg: 10, rows: 7 });
  k.cyl(0.15, 0.55, WHITE, 0, 3.22, -0.52, { r2: 0.02, seg: 8, rx: -0.55 });
  k.ball(0.3, INK, 0, 2.06, 0.06, { sy: 0.78, sz: 0.55, seg: 12, rows: 8 }); // face opening
  for (const sx of [-0.13, 0.13]) k.ball(0.06, 0xffffff, sx, 2.1, 0.22, { sy: 1.2, seg: 6, rows: 4 });
  k.box(0.04, 0.45, 0.04, 0x8b1a1a, 0.24, 2.55, -0.02, { rz: 0.25, rx: -0.3 });
  for (const y of [2.42, 2.55, 2.68]) k.box(0.16, 0.03, 0.04, 0x8b1a1a, 0.24 - (y - 2.55) * 0.25, y, -0.02 - (y - 2.55) * 0.3);
  // Arms on a round steering wheel
  for (const sx of [-0.3, 0.3]) k.cyl(0.1, 0.6, WHITE, sx, 1.58, 0.15, { axis: 'z', seg: 8 });
  k.cyl(0.05, 0.5, 0x212121, 0, 1.4, 0.65, { rx: 0.6, seg: 6 });
  k.torus(0.26, 0.05, 0x212121, 0, 1.58, 0.5, { rx: -0.4, seg: 14 });
  if (painted) {
    // Spoiler on two struts, twin exhausts, headlights and number roundels
    for (const x of [-0.55, 0.55]) k.box(0.08, 0.45, 0.12, 0x212121, x, 1.45, -1.2);
    k.prism([[-0.3, 0], [0.3, 0.1], [0.25, 0.16], [-0.3, 0.1]], 1.9, 0x212121, 0, 1.68, -1.25);
    for (const x of [-0.45, 0.45]) {
      k.cyl(0.11, 0.4, 0xb0bec5, x, 0.6, -1.45, { axis: 'z', seg: 10 });
      k.cyl(0.08, 0.06, lit, x, 0.6, -1.66, { axis: 'z', seg: 10 });
    }
    for (const x of [-0.6, 0.6]) lamp(k, x, 0.95, 1.3, 0.13);
    for (const sx of [-1, 1]) {
      k.cyl(0.3, 0.02, 0xfafafa, sx * 0.91, 0.85, 0.3, { axis: 'x', seg: 14 });
      k.box(0.03, 0.3, 0.07, 0x111111, sx * 0.925, 0.85, 0.3);
    }
  }
}

/**
 * Kart Kid (0-4): the hooded kid in his cardboard kart, parked on a starting ramp. Lv 1 flags,
 * Lv 2 a wooden garage, Lv 3 a tire stack and a cone, Lv 4 a red racing garage with a chequered
 * banner and a painted kart.
 */
export function makeKartKid(level) {
  level = lv(level, 4);
  const u = makeThing();
  const lit = glowMat(u, 0xff6d00);
  const bulb = glowMat(u, 0xfff59d);
  const k = kit(u, u.body, `kartKid${level}`);
  // Asphalt with kerbs and a painted lane
  k.slab(4.6, 0.25, 4.6, 0x616161, 0, 0.125, 0, { tw: 0.97, td: 0.97 });
  for (let i = 0; i < 9; i++) {
    k.box(0.5, 0.1, 0.25, i % 2 ? 0xfafafa : 0xe53935, -2.0 + i * 0.5, 0.27, 2.12, { r: 0.03 });
  }
  for (const x of [-1.25, 1.25]) k.box(0.08, 0.02, 1.6, 0xfafafa, x, 0.26, 1.35);
  // Starting platform on posts, and its ramp
  const DECK = 0x8d6e63;
  k.box(2.8, 0.2, 2.4, DECK, 0, 0.85, -0.6, { r: 0.03 });
  for (let i = 0; i < 7; i++) k.box(0.02, 0.21, 2.4, tone(DECK, 0.7), -1.2 + i * 0.4, 0.86, -0.6);
  for (const sx of [-1.25, 1.25]) for (const sz of [-1.65, 0.45]) k.box(0.2, 0.7, 0.2, tone(DECK, 0.8), sx, 0.45, sz);
  k.box(2.6, 0.15, 1.9, DECK, 0, 0.55, 1.35, { rx: 0.36 });
  for (const sx of [-1, 1]) k.box(0.1, 0.12, 1.9, 0x5d4037, sx * 1.3, 0.65, 1.35, { rx: 0.36 });
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) k.box(0.43, 0.04, 0.2, (i + j) % 2 ? 0x111111 : 0xfafafa, -1.15 + i * 0.46, 0.97, 0.47 + j * 0.2);
  if (level >= 1) {
    // Chequered flag on a pole and a blue pennant
    k.cyl(0.06, 3.2, 0xbdbdbd, 2.0, 1.85, 1.6, { seg: 8 });
    k.ball(0.1, 0xffc107, 2.0, 3.48, 1.6, { seg: 8, rows: 6 });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      k.box(0.04, 0.22, 0.22, (i + j) % 2 ? 0x111111 : 0xfafafa, 2.0 + Math.sin(i * 1.4) * 0.05, 3.3 - j * 0.22, 1.73 + i * 0.22);
    }
    k.cyl(0.05, 2.4, 0xbdbdbd, -2.0, 1.45, 1.6, { seg: 8 });
    k.prism([[0, 0], [0.85, -0.28], [0, -0.56]], 0.03, 0x1e88e5, -2.0, 2.62, 1.62);
  }
  if (level >= 2) {
    const race = level >= 4;
    const WALL = race ? 0xc62828 : 0xa1887f;
    for (const x of [-1.85, 1.85]) {
      k.box(0.3, 3.0, 2.2, WALL, x, 1.75, -1.1);
      if (!race) for (let i = 0; i < 5; i++) k.box(0.31, 0.03, 2.2, tone(WALL, 0.75), x, 0.6 + i * 0.6, -1.1);
    }
    k.box(4.0, 3.0, 0.3, WALL, 0, 1.75, -2.15);
    if (race) {
      // Flat roof, a chequered banner with lamps, a rolled-up shutter and a gold number board
      k.box(4.2, 0.3, 2.6, 0x212121, 0, 3.4, -1.0, { r: 0.05 });
      for (let i = 0; i < 10; i++) for (let j = 0; j < 2; j++) k.box(0.4, 0.3, 0.06, (i + j) % 2 ? 0x111111 : 0xfafafa, -1.8 + i * 0.4, 3.1 - j * 0.3, 0.15);
      for (const x of [-1.5, -0.5, 0.5, 1.5]) {
        k.cyl(0.04, 0.25, 0x212121, x, 3.35, 0.32, { axis: 'z', seg: 6 });
        k.ball(0.12, bulb, x, 3.25, 0.45, { seg: 8, rows: 6 });
      }
      k.cyl(0.18, 3.4, 0x9e9e9e, 0, 2.75, -0.05, { axis: 'x', seg: 10 });
      k.box(0.9, 0.6, 0.06, 0xffc107, 0, 3.95, -0.4, { r: 0.04 });
      k.box(0.12, 0.42, 0.07, 0x111111, 0, 3.95, -0.37);
      for (const x of [-0.6, 0.6]) k.box(0.06, 0.4, 0.06, 0x212121, x * 0.5, 3.65, -0.4);
    } else {
      // A pitched shingle roof with gable ends
      for (const sx of [-1, 1]) {
        k.box(2.35, 0.14, 2.7, 0x6d4c41, sx * 1.05, 3.65, -1.0, { rz: -sx * 0.42 });
        for (let i = 0; i < 4; i++) k.box(2.36, 0.03, 2.72, tone(0x6d4c41, 0.75), sx * (0.4 + i * 0.45), 3.92 - i * 0.2, -1.0, { rz: -sx * 0.42 });
      }
      k.prism([[-2.0, 0], [0, 0.9], [2.0, 0]], 0.2, WALL, 0, 3.25, -2.15, { ry: PI / 2 });
      k.prism([[-2.0, 0], [0, 0.9], [2.0, 0]], 0.15, WALL, 0, 3.25, 0.1, { ry: PI / 2 });
      k.box(1.2, 0.35, 0.06, 0xfafafa, 0, 3.55, 0.2, { r: 0.03 });
      k.box(0.9, 0.08, 0.07, 0xc62828, 0, 3.55, 0.22);
    }
  }
  if (level >= 3) {
    // Tire stack and a traffic cone
    for (let i = 0; i < 3; i++) {
      k.torus(0.4, 0.17, 0x151515, 1.75, 0.42 + i * 0.32, 0.5, { rx: PI / 2, seg: 16 });
      k.cyl(0.26, 0.3, 0x424242, 1.75, 0.42 + i * 0.32, 0.5, { seg: 12, open: true });
    }
    k.cyl(0.25, 0.7, 0xff6d00, -1.8, 0.62, 0.3, { r2: 0.04, seg: 12 });
    k.cyl(0.17, 0.12, 0xfafafa, -1.8, 0.7, 0.3, { r2: 0.13, seg: 12 });
    k.box(0.6, 0.06, 0.6, 0xff6d00, -1.8, 0.28, 0.3, { r: 0.03 });
  }
  k.done();
  const kg = grp(u.body, 0, 0.95, -0.5, 0.95);
  const kk = kit(u, kg, `kartKidKart${level >= 4 ? 1 : 0}`);
  kart(kk, level >= 4, lit);
  kk.done();
  gunMuzzle(u, u.body, 0, 0.8, 2.2);
  return u;
}

// ------------------------------------------------------------------ Balloon Pal

/** Sets both arms' rest rotation and the matching view pose. */
function pose(h, right, left, rz = 0.1, lz = -0.1) {
  h.rightArm.rotation.set(right, 0, rz);
  h.leftArm.rotation.set(left, 0, lz);
  h.pose = { right, left, leftRecoil: 0 };
}

/** A shiny balloon of colour `col` centred on `at`, its string running down to `from`. */
function balloon(k, col, from, at, s) {
  const [x, y, z] = at;
  k.ball(0.52 * s, col, x, y, z, { sy: 1.18, seg: 14, rows: 10 });
  k.cyl(0.12 * s, 0.16 * s, tone(col, 0.8), x, y - 0.66 * s, z, { r2: 0.03 * s, seg: 8, rx: PI });
  k.ball(0.12 * s, 0xffffff, x - 0.2 * s, y + 0.25 * s, z + 0.4 * s, { sy: 1.6, sz: 0.4, seg: 6, rows: 4 });
  const [fx, fy, fz] = from;
  const by = y - 0.74 * s;
  k.tube([[x, by, z], [x * 0.7 + fx * 0.3 + 0.15, by * 0.6 + fy * 0.4, z * 0.7 + fz * 0.3], [fx, fy, fz]], 0.02, 0xeeeeee, { sides: 4 });
}

/**
 * Balloon Pal (0-4, support: range): a little blue blob floating under balloons, tethered to a
 * pad. Lv 1 a third balloon, Lv 2 a propeller cap, Lv 3 a wicker basket, Lv 4 a big bunch of
 * balloons and a telescope.
 */
export function makeBalloonPal(level) {
  level = lv(level, 4);
  const h = makeThing();
  h.static = false;
  const g = (x, y, z) => {
    const o = new THREE.Group();
    o.position.set(x, y, z);
    h.body.add(o);
    return o;
  };
  h.torso = g(0, 2.7, 0);
  h.head = h.torso;
  h.rightArm = g(-0.95, 2.75, 0.1);
  h.leftArm = g(0.95, 2.55, 0.15);
  h.rightLeg = g(-0.5, 2, 0);
  h.leftLeg = g(0.5, 2, 0);
  h.muzzles = [];
  const SKIN = 0xb3e5fc;
  // Blob body with a toothy grin, headphones and a neckerchief
  const b = kit(h, h.torso, `balloonPalBody${level >= 2 ? 1 : 0}${level >= 3 ? 1 : 0}`);
  b.ball(0.95, SKIN, 0, 0, 0, { sy: 0.9, sz: 0.85, seg: 18, rows: 12 });
  for (const sx of [-1, 1]) {
    b.ball(0.13, INK, sx * 0.38, 0.33, 0.72, { sy: 1.3, sz: 0.4, seg: 8, rows: 6 });
    b.ball(0.045, 0xffffff, sx * 0.38 - 0.04, 0.4, 0.77, { seg: 5, rows: 3 });
    b.ball(0.11, 0x81d4fa, sx * 0.62, 0.05, 0.6, { sz: 0.4, seg: 8, rows: 5 });
  }
  b.box(1.0, 0.4, 0.12, 0xfafafa, 0, -0.17, 0.72, { r: 0.05 });
  for (let i = 0; i < 4; i++) b.box(0.15, 0.15, 0.06, INK, -0.37 + i * 0.25, -0.17 + (i % 2 ? 0.09 : -0.09), 0.79, { rz: PI / 4 });
  for (const y of [0.04, -0.38]) b.box(1.04, 0.05, 0.06, INK, 0, y, 0.78);
  b.torus(0.98, 0.07, 0x212121, 0, 0.18, 0, { arc: PI, sy: 0.72, seg: 18 });
  for (const sx of [-1, 1]) {
    b.cyl(0.3, 0.3, 0x37474f, sx * 1.0, 0.18, 0, { axis: 'x', seg: 14 });
    b.torus(0.24, 0.07, 0x212121, sx * 0.86, 0.18, 0, { ry: PI / 2, seg: 12 });
  }
  b.cyl(0.66, 0.26, 0x263238, 0, -0.52, 0, { r2: 0.8, seg: 18 });
  b.box(0.4, 0.4, 0.08, 0x263238, 0, -0.7, 0.7, { rz: PI / 4, rx: 0.3 });
  if (level >= 2) {
    // Propeller cap: red and yellow segments with a shaft
    b.ball(0.58, 0xe53935, 0, 0.6, 0, { sy: 0.55, seg: 16, rows: 8 });
    for (let i = 0; i < 4; i++) b.ball(0.585, 0xfdd835, 0, 0.6, 0, { sx: 0.18, sy: 0.555, ry: (i * PI) / 4, seg: 10, rows: 8 });
    b.cyl(0.6, 0.06, 0xb71c1c, 0, 0.6, 0, { seg: 16 });
    b.box(0.5, 0.05, 0.4, 0xe53935, 0, 0.62, 0.6, { rx: 0.25 }); // brim
    b.cyl(0.05, 0.42, 0x424242, 0, 1.05, 0, { seg: 6 });
  }
  if (level >= 3) {
    // A wicker basket hanging below on four ropes
    const WICK = 0xa1887f;
    b.cyl(0.6, 0.6, WICK, 0, -1.75, 0, { r2: 0.7, seg: 16 });
    for (let i = 0; i < 3; i++) b.torus(0.62 + i * 0.035, 0.035, tone(WICK, 0.8), 0, -1.95 + i * 0.18, 0, { rx: PI / 2, seg: 16 });
    b.torus(0.72, 0.07, 0x6d4c41, 0, -1.45, 0, { rx: PI / 2, seg: 16 });
    for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) b.tube([[x, -1.45, z], [x * 1.1, -0.8, z * 1.0]], 0.025, 0x8d6e63, { sides: 4 });
  }
  b.done();
  if (level >= 2) {
    const prop = spinner(h, h.torso, 0, 1.28, 0, 'y');
    const pk = kit(h, prop, 'balloonPalProp');
    pk.ball(0.08, 0xfdd835, 0, 0, 0, { seg: 8, rows: 6 });
    pk.ball(0.38, 0x1e88e5, 0.4, 0, 0, { sy: 0.08, sz: 0.3, rx: 0.3, seg: 10, rows: 5 });
    pk.ball(0.38, 0x43a047, -0.4, 0, 0, { sy: 0.08, sz: 0.3, rx: -0.3, seg: 10, rows: 5 });
    pk.done();
    h.idleSpin = 8;
  }
  for (const arm of [h.rightArm, h.leftArm]) {
    const ak = kit(h, arm, 'balloonPalArm');
    ak.ball(0.22, SKIN, 0, -0.3, 0, { sy: 1.5, seg: 10, rows: 7 });
    ak.done();
  }
  // Balloons on strings from the raised right hand
  const hold = [-0.95, 3.4, 0.1];
  const spots = [[0xe53935, [-1.1, 6.0, 0.1]], [0xf48fb1, [0.4, 6.4, -0.2]]];
  if (level >= 1) spots.push([0xfdd835, [-0.2, 7.1, 0.3]]);
  if (level >= 4) spots.push([0x42a5f5, [1.2, 5.9, 0.4]], [0x66bb6a, [-1.6, 7.0, -0.4]], [0xab47bc, [0.9, 7.4, -0.5]], [0xff7043, [-0.5, 8.0, -0.3]]);
  const bk = kit(h, h.body, `balloonPalBunch${level}`);
  for (const [c, at] of spots) balloon(bk, c, hold, at, level >= 4 ? 0.95 : 1);
  bk.done();
  if (level >= 4) {
    // A little brass telescope in the left hand
    const t = new THREE.Group();
    t.position.set(0, -0.5, 0);
    h.leftArm.add(t);
    const tk = kit(h, t, 'balloonPalScope');
    tk.cyl(0.13, 0.55, 0xffb300, 0, -0.2, 0, { seg: 10 });
    tk.cyl(0.17, 0.5, 0xffd54f, 0, -0.68, 0, { seg: 12 });
    for (const y of [0.05, -0.45, -0.93]) tk.torus(y < -0.5 ? 0.18 : 0.14, 0.03, 0x8d6e00, 0, y, 0, { rx: PI / 2, seg: 12 });
    tk.cyl(0.14, 0.04, glowMat(h, 0x80d8ff), 0, -0.95, 0, { seg: 12 });
    tk.done();
    pose(h, PI, -1.5, 0, -0.1);
  } else pose(h, PI, -0.3, 0, -0.2);
  // Base pad with a tether ring and post
  const pk = kit(h, h.root, `balloonPalPad${level >= 3 ? 1 : 0}`);
  pk.cyl(0.95, 0.25, 0x90a4ae, 0, 0.125, 0, { r2: 0.88, seg: 20 });
  pk.cyl(0.62, 0.06, 0x4fc3f7, 0, 0.27, 0, { seg: 20 });
  pk.torus(0.78, 0.04, 0x607d8b, 0, 0.26, 0, { rx: PI / 2, seg: 20 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4;
    pk.cyl(0.06, 0.08, 0x546e7a, Math.cos(a) * 0.78, 0.29, Math.sin(a) * 0.78, { seg: 6 });
  }
  pk.cyl(0.13, 0.4, 0x546e7a, 0, 0.45, 0, { r2: 0.1, seg: 10 });
  pk.torus(0.1, 0.03, 0xb0bec5, 0, 0.7, 0, { seg: 10 });
  pk.tube([[0, 0.72, 0], [0.08, (0.72 + (level >= 3 ? 0.9 : 1.6)) / 2, 0.05], [0, level >= 3 ? 0.9 : 1.6, 0]], 0.025, 0xeeeeee, { sides: 4 });
  pk.done();
  h.lift = 0.5;
  h.bob = 0.35;
  return h;
}

// ------------------------------------------------------------------ Scarecrow

/** A small perched crow facing +z, about 1.4*s long. */
function crow(k, x, y, z, s) {
  const BLACK = 0x1c1c22;
  k.ball(0.45 * s, BLACK, x, y + 0.6 * s, z, { sx: 0.9, sy: 0.85, sz: 1.4, seg: 10, rows: 7 });
  k.ball(0.32 * s, BLACK, x, y + 1.05 * s, z + 0.55 * s, { seg: 10, rows: 7 });
  k.cyl(0.11 * s, 0.4 * s, 0x546e7a, x, y + 1.0 * s, z + 0.95 * s, { r2: 0, seg: 6, rx: PI / 2 });
  for (const sx of [-1, 1]) {
    k.ball(0.06 * s, 0xffca28, x + sx * 0.2 * s, y + 1.12 * s, z + 0.75 * s, { seg: 5, rows: 3 });
    k.ball(0.32 * s, 0x303550, x + sx * 0.38 * s, y + 0.65 * s, z - 0.1 * s, { sx: 0.25, sz: 1.6, seg: 8, rows: 5 });
    k.cyl(0.04 * s, 0.35 * s, 0x424242, x + sx * 0.15 * s, y + 0.15 * s, z, { seg: 4 });
  }
  k.ball(0.35 * s, 0x303550, x, y + 0.62 * s, z - 0.85 * s, { sx: 0.9, sy: 0.15, sz: 1.3, rx: -0.3, seg: 8, rows: 5 });
}

/** A round hay bale on its side with two twine bands. */
function bale(k, x, y, z, ry) {
  k.cyl(0.4, 0.75, 0xe6c35c, x, y + 0.4, z, { axis: 'x', ry, seg: 14 });
  k.cyl(0.3, 0.76, 0xd4ae45, x, y + 0.4, z, { axis: 'x', ry, seg: 14 });
  for (const f of [-0.2, 0.2]) k.torus(0.41, 0.025, 0x8d6e63, x + Math.cos(ry) * f, y + 0.4, z - Math.sin(ry) * f, { ry: ry + PI / 2, seg: 14 });
}

/** A bunch of straw ends sticking out along direction (dx, dy) from (x, y, z). */
function strawTuft(k, x, y, z, dx, dy) {
  const a = Math.atan2(dx, dy);
  for (let i = 0; i < 5; i++) {
    const t = a + (i - 2) * 0.22;
    k.cyl(0.05, 0.4, i % 2 ? 0xe6c35c : 0xd4ae45, x + Math.sin(t) * 0.15, y + Math.cos(t) * 0.15, z + (i % 3 - 1) * 0.08, { r2: 0.0, seg: 4, rz: -t });
  }
}

/**
 * Scarecrow (0-4): Lv 0 a scarecrow on a pole with a jack-o'-lantern head; Lv 1 brown clothes
 * and a fancy top hat; Lv 2 leather straps and a crow on its shoulder; Lv 3 The Statue: a
 * hooded stone harbinger with a scythe; Lv 4 the Pumpkin King with glowing souls circling it.
 */
export function makeScarecrow(level) {
  level = lv(level, 4);
  const u = makeThing();
  const k = kit(u, u.body, `scarecrow${level}`);
  if (level <= 2) {
    const lit = glowMat(u, 0xffab00);
    k.slab(4.4, 0.25, 4.4, 0x6d8b3a, 0, 0.125, 0, { tw: 0.97, td: 0.97 });
    bale(k, -1.5, 0.25, 1.3, 0.4);
    bale(k, 1.5, 0.25, -1.4, -0.6);
    for (const [x, z] of [[1.4, 1.5], [-1.6, -1.3], [1.9, 0.2]]) for (let i = 0; i < 4; i++) k.cyl(0.04, 0.35, 0xd4ae45, x + (i - 1.5) * 0.1, 0.4, z, { r2: 0, seg: 4, rz: (i - 1.5) * 0.3 });
    const POLE = 0x6d4c41;
    k.cyl(0.18, 5.8, POLE, 0, 2.9, -0.35, { seg: 8 });
    k.cyl(0.15, 4.6, POLE, 0, 4.4, -0.4, { axis: 'x', seg: 8 });
    for (const rz of [0.7, -0.7]) k.box(0.42, 0.06, 0.06, 0x8d6e63, 0, 4.4, -0.2, { rz });
    const shirt = level >= 1 ? 0x6d4c41 : 0xc9a66b;
    const pants = level >= 1 ? 0x4e342e : 0x5c7a99;
    k.box(1.6, 2.0, 0.9, shirt, 0, 3.6, 0, { r: 0.2 });
    k.torus(0.7, 0.06, 0xa1887f, 0, 2.75, 0, { rx: PI / 2, sz: 0.65, seg: 16 }); // rope belt
    for (const s of [-1, 1]) {
      k.cyl(0.3, 1.9, shirt, s * 1.6, 4.4, -0.05, { axis: 'x', r2: 0.34, seg: 10 }); // sleeves along the crossbar
      k.torus(0.3, 0.05, tone(shirt, 0.75), s * 2.5, 4.4, -0.05, { ry: PI / 2, seg: 12 });
      strawTuft(k, s * 2.65, 4.4, -0.05, s, 0);
      k.cyl(0.28, 1.4, pants, s * 0.4, 2.0, 0, { r2: 0.3, seg: 10 }); // dangling legs
      k.torus(0.27, 0.05, tone(pants, 0.75), s * 0.4, 1.35, 0, { rx: PI / 2, seg: 12 });
      strawTuft(k, s * 0.4, 1.2, 0, 0, -1);
    }
    if (level === 0) {
      // Patches with stitches
      for (const [x, y, c] of [[0.4, 3.9, 0x8e24aa], [-0.45, 3.1, 0x1565c0]]) {
        k.box(0.4, 0.4, 0.05, c, x, y, 0.46, { r: 0.02 });
        for (let i = 0; i < 4; i++) k.box(0.04, 0.12, 0.03, 0xfafafa, x - 0.15 + i * 0.1, y + 0.2, 0.49);
      }
    } else {
      // A coat front with gold buttons, and coat tails
      k.box(0.5, 1.9, 0.06, 0x8d6e63, 0, 3.6, 0.47);
      for (const y of [3.0, 3.5, 4.0]) k.ball(0.08, 0xffc107, 0, y, 0.52, { seg: 6, rows: 4 });
      for (const s of [-1, 1]) k.slab(0.5, 0.8, 0.12, shirt, s * 0.55, 2.35, -0.1, { bw: 1.3, rz: s * 0.08 });
    }
    jack(k, 1.35, 0, 5.3, 0, lit);
    if (level >= 1) {
      // Fancy top hat: tall black crown, purple band, a red feather
      k.cyl(0.95, 0.1, 0x1a1a1a, 0, 5.95, 0, { seg: 18 });
      k.cyl(0.56, 1.2, 0x1a1a1a, 0, 6.6, 0, { r2: 0.6, seg: 16 });
      k.cyl(0.58, 0.22, 0x6a1b9a, 0, 6.15, 0, { seg: 16 });
      k.ball(0.3, 0xc62828, 0.6, 6.55, 0.2, { sx: 0.25, sy: 1.6, sz: 0.6, rz: -0.3, seg: 8, rows: 6 });
    }
    if (level >= 2) {
      // Crossed leather straps with a gold buckle, and a crow on the shoulder
      for (const s of [-1, 1]) k.box(0.22, 2.3, 0.08, 0x3e2723, 0, 3.6, 0.48, { rz: s * 0.6 });
      k.box(0.32, 0.32, 0.1, 0xffc107, 0, 3.6, 0.53, { r: 0.04 });
      k.box(0.18, 0.18, 0.11, 0x3e2723, 0, 3.6, 0.55);
      crow(k, 0.85, 4.6, 0, 0.5);
    }
    k.done();
    gunMuzzle(u, u.body, 0, 5.3, 0.8);
    u.height = level >= 1 ? 7.2 : 6.2;
    u.tracer = 0xffab00;
    return u;
  }
  if (level === 3) {
    // The Statue: a hooded stone harbinger on a plinth, holding a stone scythe
    const eye = glowMat(u, 0xb2ff59);
    const STONE = 0x4a4f55;
    const DARKS = 0x2e3236;
    k.slab(4.4, 0.25, 4.4, 0x3e3a36, 0, 0.125, 0, { tw: 0.97, td: 0.97 });
    for (const [x, z, r] of [[1.7, 1.6, 0.25], [-1.8, -1.6, 0.3], [-1.6, 1.7, 0.18]]) k.ball(r, 0x5d5d5d, x, 0.25, z, { sy: 0.6, seg: 7, rows: 5 });
    k.slab(3.0, 0.8, 3.0, DARKS, 0, 0.65, 0, { tw: 0.92, td: 0.92 });
    k.box(3.1, 0.2, 3.1, STONE, 0, 1.12, 0, { r: 0.05 });
    k.cyl(1.2, 2.6, STONE, 0, 2.5, 0, { r2: 0.95, seg: 14 }); // robe skirt
    for (let i = 0; i < 7; i++) {
      const a = PI * 0.15 + (i / 6) * PI * 0.7;
      k.box(0.14, 2.5, 0.12, DARKS, Math.cos(a) * 1.08, 2.45, Math.sin(a) * 1.08, { ry: -a + PI / 2, rx: Math.sin(a) * 0.1 });
    }
    k.box(2.0, 1.8, 1.5, STONE, 0, 4.6, 0, { r: 0.35 }); // chest
    for (const s of [-1, 1]) k.ball(0.6, STONE, s * 1.0, 5.25, 0, { sy: 0.7, seg: 12, rows: 8 }); // shoulders
    k.ball(0.85, STONE, 0, 6.3, -0.05, { sy: 1.05, seg: 14, rows: 10 }); // hood
    k.cyl(0.55, 1.0, STONE, 0, 7.2, -0.4, { r2: 0.0, seg: 10, rx: -0.55 }); // hood peak
    k.ball(0.55, 0x0b0b0b, 0, 6.2, 0.42, { sy: 1.0, sz: 0.55, seg: 12, rows: 8 }); // shadowed face
    for (const x of [-0.22, 0.22]) k.ball(0.09, eye, x, 6.32, 0.7, { sx: 1.4, sy: 0.6, seg: 6, rows: 4 });
    for (const s of [-1, 1]) k.cyl(0.36, 2.2, STONE, s * 1.4, 4.4, 0.25, { r2: 0.42, seg: 10, rx: -0.25 }); // sleeves
    // Stone scythe in the right hand (-x)
    k.cyl(0.11, 6.2, DARKS, -1.5, 3.9, 0.7, { seg: 8 });
    for (const y of [2.6, 5.0]) k.torus(0.13, 0.04, STONE, -1.5, y, 0.7, { rx: PI / 2, seg: 8 });
    k.prism([[0.55, 7.1], [1.4, 7.18], [2.2, 6.9], [2.85, 6.2], [2.05, 6.62], [1.3, 6.78], [0.55, 6.78]], 0.12, STONE, -1.5, 0, 0);
    for (const [x, y, z] of [[0.7, 1.5, 1.15], [-0.9, 3.0, 0.9], [0.5, 5.4, 0.72], [-1.2, 1.2, 1.2]]) k.ball(0.28, 0x556b2f, x, y, z, { sy: 0.45, sz: 0.3, seg: 8, rows: 5 });
    k.done();
    gunMuzzle(u, u.body, 0, 6.3, 1.0);
    u.height = 7.6;
    u.tracer = 0xb2ff59;
    return u;
  }
  // The Pumpkin King: a tall pinstriped figure with a crowned jack-o'-lantern head and souls
  const small = glowMat(u, 0xff6d00);
  const lit = glowMat(u, 0xffd740);
  const gem = glowMat(u, 0xd500f9);
  const BLACK = 0x161616;
  const STRIPE = 0x3a3a3a;
  k.slab(4.4, 0.25, 4.4, 0x3e3a36, 0, 0.125, 0, { tw: 0.97, td: 0.97 });
  for (const [x, z] of [[-1.6, 1.4], [1.7, 1.2], [1.5, -1.6]]) jack(k, 0.8, x, 0.6, z, small);
  for (const s of [-1, 1]) {
    k.cyl(0.22, 2.6, BLACK, s * 0.45, 1.55, 0, { r2: 0.25, seg: 10 }); // thin legs
    for (const y of [0.8, 1.6, 2.4]) k.torus(0.23, 0.04, STRIPE, s * 0.45, y, 0, { rx: PI / 2, seg: 12 });
    k.ball(0.3, BLACK, s * 0.45, 0.38, 0.25, { sx: 0.9, sy: 0.5, sz: 1.6, seg: 10, rows: 6 }); // pointed shoes
    k.cyl(0.1, 0.4, BLACK, s * 0.45, 0.55, 0.8, { r2: 0.0, seg: 6, rx: 0.9 });
  }
  k.slab(1.9, 2.4, 1.1, BLACK, 0, 4.0, 0, { tw: 1.12, bw: 0.85 }); // tailcoat
  for (const x of [-0.5, 0, 0.5]) k.box(0.06, 2.3, 0.04, STRIPE, x, 4.0, 0.56);
  for (const s of [-1, 1]) k.slab(0.7, 1.4, 0.12, BLACK, s * 0.5, 2.4, -0.45, { bw: 1.3, rx: 0.2 }); // coat tails
  // Bat bow tie
  k.ball(0.13, BLACK, 0, 5.0, 0.6, { seg: 8, rows: 6 });
  for (const s of [-1, 1]) k.prism([[0, 0], [0.18, 0.15], [0.05, 0.02], [0.15, -0.15]], 0.06, 0x2a2a2a, 0, 5.0, 0.6, { ry: s * PI / 2 });
  // Long arms with clawed white fingers
  for (const s of [-1, 1]) {
    k.cyl(0.2, 2.6, BLACK, s * 1.3, 4.1, 0.1, { r2: 0.24, seg: 10, rz: s * 0.35 });
    for (const f of [-0.12, 0, 0.12]) k.cyl(0.035, 0.5, 0xeeeeee, s * 1.78 + f, 2.75, 0.1, { r2: 0.01, rx: PI, seg: 5 });
  }
  // Purple-lined cape and a high collar
  k.slab(2.6, 3.6, 0.12, 0x1a0d26, 0, 3.6, -0.65, { tw: 0.75 });
  k.slab(2.4, 3.4, 0.06, 0x4a148c, 0, 3.6, -0.57, { tw: 0.75 });
  for (const s of [-1, 1]) k.slab(0.6, 1.2, 0.15, 0x1a0d26, s * 1.0, 5.6, -0.5, { tw: 1.4, rz: s * -0.3 });
  jack(k, 1.9, 0, 6.15, 0, lit);
  // Crown with points and a gem
  k.cyl(0.75, 0.3, 0xffc107, 0, 7.15, 0, { seg: 16, open: true });
  k.torus(0.75, 0.05, 0xffa000, 0, 7.02, 0, { rx: PI / 2, seg: 16 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2 + PI / 2;
    k.cyl(0.13, 0.45, 0xffc107, Math.cos(a) * 0.7, 7.5, Math.sin(a) * 0.7, { r2: 0.0, seg: 6 });
  }
  k.ball(0.13, gem, 0, 7.18, 0.77, { sz: 0.5, seg: 8, rows: 6 });
  k.done();
  // Glowing souls circling it
  const souls = spinner(u, u.body, 0, 0, 0, 'y');
  const sk = kit(u, souls, 'scarecrowSouls');
  const soul = glowMat(u, 0x84ffff);
  const halo = seeThrough(u, 0xe0f7fa, 0.35, true);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    const y = 3.2 + (i % 3) * 1.2;
    const x = Math.cos(a) * 2.6;
    const z = Math.sin(a) * 2.6;
    sk.ball(0.18, soul, x, y, z, { seg: 8, rows: 6 });
    sk.ball(0.32, halo, x, y, z, { seg: 10, rows: 7 });
    sk.cyl(0.0, 0.5, halo, x, y - 0.42, z, { r2: 0.2, seg: 8 });
  }
  sk.done();
  u.idleSpin = 1.5;
  gunMuzzle(u, u.body, 0, 6.2, 1.1);
  u.height = 7.8;
  u.tracer = 0x84ffff;
  return u;
}

// ------------------------------------------------------------------ Time Dilator

/**
 * Time Dilator (0-5): a robotic bunny sitting on a pedestal. Silver plates, big feet, a round
 * tail, long jointed ears with glowing tips and a cyan visor. Its chest is a glass window with a
 * glowing hourglass (the time core) and a clock face on its belly. Lv 1 gear joints on hips and
 * shoulders; Lv 2 emitter dishes on the ear tips and pylons round it; Lv 3 a floating clock ring
 * that turns; Lv 4 a warp-drive backpack; Lv 5 B.U.N.N.Y: gold trim, a pink visor and a bunny
 * emblem. The glowing time core is named `timeCore` and its material is in `u.timeMats`.
 */
export function makeTimeDilator(level) {
  level = lv(level, 5);
  const u = makeThing();
  const PLATE = 0xe0e0e0;
  const JOINT = 0x546e7a;
  const DARK = 0x263238;
  const PINK = 0xf8bbd0;
  const TRIM = level >= 5 ? 0xffc107 : 0x90a4ae;
  const eye = glowMat(u, level >= 5 ? 0xff4081 : 0x18ffff);
  const tip = glowMat(u, level >= 5 ? 0xff80ab : 0x40c4ff);
  const sand = glowMat(u, 0xffd54f);
  sand.userData.timeCore = true;
  u.timeMats = [sand];
  const glass = seeThrough(u, 0xe1f5fe, 0.35);
  const flame = glowMat(u, 0xff9100);
  const k = kit(u, u.body, `timeDilator${level}`);
  // Pedestal with a ring of lights
  k.cyl(2.0, 0.3, 0x455a64, 0, 0.15, 0, { r2: 1.92, seg: 24 });
  k.cyl(1.6, 0.5, JOINT, 0, 0.55, 0, { seg: 24 });
  k.torus(1.62, 0.05, TRIM, 0, 0.81, 0, { rx: PI / 2, seg: 24 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2 + PI / 12;
    k.ball(0.07, tip, Math.cos(a) * 1.6, 0.5, Math.sin(a) * 1.6, { seg: 6, rows: 4 });
  }
  // Big feet with glowing toe pads
  for (const s of [-1, 1]) {
    k.box(0.8, 0.45, 1.8, PLATE, s * 0.75, 1.05, 0.55, { r: 0.18 });
    k.box(0.82, 0.1, 1.82, DARK, s * 0.75, 0.86, 0.55, { r: 0.04 });
    for (const x of [-0.22, 0, 0.22]) k.ball(0.08, eye, s * 0.75 + x, 1.1, 1.45, { sz: 0.6, seg: 6, rows: 4 });
  }
  // A sitting bunny: wide haunches, round belly, a smaller chest
  for (const s of [-1, 1]) k.ball(0.62, PLATE, s * 0.85, 1.65, -0.2, { sx: 0.75, sy: 0.85, sz: 1.1, seg: 14, rows: 10 });
  k.ball(1.0, PLATE, 0, 1.85, -0.1, { sy: 0.75, sz: 0.85, seg: 18, rows: 12 });
  k.box(1.6, 1.3, 1.4, PLATE, 0, 3.0, -0.15, { r: 0.35 });
  k.cyl(0.88, 0.12, TRIM, 0, 2.42, -0.12, { seg: 20 });
  // Clock face on the belly
  k.cyl(0.5, 0.08, 0xfff8e1, 0, 1.85, 0.74, { axis: 'z', seg: 20 });
  k.torus(0.5, 0.05, TRIM, 0, 1.85, 0.77, { seg: 20 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    k.box(0.05, i % 3 ? 0.06 : 0.11, 0.04, DARK, Math.sin(a) * 0.4, 1.85 + Math.cos(a) * 0.4, 0.8, { rz: -a });
  }
  k.box(0.05, 0.34, 0.04, DARK, 0, 2.0, 0.82);
  k.box(0.26, 0.05, 0.04, DARK, 0.11, 1.85, 0.82);
  k.ball(0.05, TRIM, 0, 1.85, 0.84, { seg: 6, rows: 4 });
  // Chest window with the glowing hourglass inside
  k.box(0.9, 1.0, 0.1, DARK, 0, 3.05, 0.56, { r: 0.04 });
  k.box(0.7, 0.8, 0.05, glass, 0, 3.05, 0.63);
  for (const y of [2.71, 3.39]) k.cyl(0.24, 0.05, TRIM, 0, y, 0.6, { seg: 10 });
  for (const sx of [-0.2, 0.2]) k.cyl(0.02, 0.68, TRIM, sx, 3.05, 0.6, { seg: 4 });
  k.cyl(0.2, 0.3, sand, 0, 2.88, 0.6, { r2: 0.02, seg: 10 });
  k.cyl(0.02, 0.3, sand, 0, 3.22, 0.6, { r2: 0.2, seg: 10 });
  // Arms with little paws held up in front of the chest
  for (const s of [-1, 1]) {
    k.cyl(0.2, 1.0, PLATE, s * 0.95, 2.9, 0.2, { rx: -0.6, seg: 10 });
    k.ball(0.25, JOINT, s * 0.85, 2.5, 0.65, { sy: 0.85, seg: 10, rows: 7 });
    k.ball(0.18, JOINT, s * 0.97, 3.32, -0.07, { seg: 8, rows: 6 }); // shoulder
  }
  // Round fluffy tail with a glowing fibre-optic tuft
  k.ball(0.38, 0xfafafa, 0, 1.6, -1.0, { seg: 12, rows: 8 });
  k.ball(0.2, tip, 0, 1.6, -1.32, { seg: 8, rows: 6 });
  if (level >= 1) {
    // Gear joints on the hips and shoulders
    for (const s of [-1, 1]) {
      for (const [y, z] of [[1.75, -0.2], [3.4, -0.15]]) {
        const x = s * (y < 2 ? 1.32 : 0.86);
        k.cyl(0.3, 0.12, TRIM, x, y, z, { axis: 'x', seg: 14 });
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * PI * 2;
          k.box(0.12, 0.12, 0.1, TRIM, x, y + Math.cos(a) * 0.34, z + Math.sin(a) * 0.34, { rx: -a });
        }
        k.cyl(0.12, 0.16, 0x795548, x, y, z, { axis: 'x', seg: 8 });
      }
    }
  }
  if (level >= 2) {
    // Emitter pylons at the corners
    for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) {
      k.cyl(0.24, 0.2, JOINT, x, 0.4, z, { seg: 10 });
      k.cyl(0.13, 1.6, JOINT, x, 1.1, z, { r2: 0.1, seg: 8 });
      for (const y of [0.8, 1.3]) k.torus(0.13, 0.04, TRIM, x, y, z, { rx: PI / 2, seg: 10 });
      k.cyl(0.08, 0.15, TRIM, x, 1.95, z, { r2: 0.25, seg: 10 });
      k.ball(0.18, tip, x, 2.12, z, { seg: 8, rows: 6 });
    }
  }
  if (level >= 4) {
    // Warp-drive backpack: two thrusters with glowing nozzles
    k.box(1.3, 1.2, 0.5, DARK, 0, 3.0, -1.0, { r: 0.12 });
    for (let i = 0; i < 4; i++) k.box(0.9, 0.05, 0.05, JOINT, 0, 2.7 + i * 0.2, -1.26);
    for (const s of [-1, 1]) {
      k.cyl(0.22, 1.1, JOINT, s * 0.45, 2.7, -1.3, { seg: 12 });
      k.torus(0.22, 0.04, TRIM, s * 0.45, 3.1, -1.3, { rx: PI / 2, seg: 12 });
      k.cyl(0.15, 0.22, DARK, s * 0.45, 2.05, -1.3, { r2: 0.22, seg: 12 });
      k.cyl(0.0, 0.45, flame, s * 0.45, 1.75, -1.3, { r2: 0.14, seg: 10 });
    }
  }
  if (level >= 5) {
    // B.U.N.N.Y: a bunny emblem on the pedestal front
    k.box(1.4, 0.4, 0.08, DARK, 0, 0.55, 1.62, { r: 0.03 });
    k.ball(0.14, 0xfafafa, 0, 0.52, 1.67, { sz: 0.4, seg: 8, rows: 6 });
    for (const sx of [-1, 1]) {
      k.box(0.07, 0.24, 0.05, 0xfafafa, sx * 0.08, 0.72, 1.67, { r: 0.02, rz: -sx * 0.15 });
      k.ball(0.07, tip, sx * 0.5, 0.55, 1.67, { seg: 6, rows: 4 });
    }
  }
  const parts = k.done();
  for (const m of parts) if (m.material === sand) m.name = 'timeCore';
  // Head: a rounded box with a jaw ring, visor, nose and whiskers
  const head = grp(u.body, 0, 4.15, 0);
  const hk = kit(u, head, `timeDilatorHead${level >= 5 ? 1 : 0}`);
  hk.box(1.5, 1.15, 1.35, PLATE, 0, 0, 0, { r: 0.4 });
  hk.box(1.56, 0.3, 1.1, TRIM, 0, -0.45, 0.05, { r: 0.1 });
  hk.box(1.25, 0.34, 0.12, DARK, 0, 0.12, 0.66, { r: 0.06 });
  for (const s of [-1, 1]) hk.box(0.42, 0.2, 0.06, eye, s * 0.3, 0.12, 0.73, { r: 0.03 });
  hk.ball(0.12, 0xf48fb1, 0, -0.18, 0.7, { sy: 0.7, seg: 8, rows: 6 });
  hk.box(0.04, 0.16, 0.04, DARK, 0, -0.32, 0.7);
  for (const s of [-1, 1]) {
    hk.cyl(0.2, 0.1, JOINT, s * 0.77, -0.05, 0.1, { axis: 'x', seg: 12 });
    hk.cyl(0.1, 0.12, tip, s * 0.8, -0.05, 0.1, { axis: 'x', seg: 8 });
    for (let i = 0; i < 3; i++) hk.cyl(0.012, 0.35, 0xb0bec5, s * (0.6 + i * 0.02), -0.25 - i * 0.06, 0.7, { axis: 'x', seg: 4, rz: s * (0.15 - i * 0.12) });
  }
  if (level >= 5) hk.box(1.58, 0.14, 1.42, TRIM, 0, 0.5, 0, { r: 0.06 });
  hk.done();
  // Long jointed ears that lean out a little, with glowing tips (dishes from Lv 2)
  for (const s of [-1, 1]) {
    const ear = grp(head, s * 0.4, 0.55, -0.1);
    ear.rotation.set(-0.15, 0, -s * 0.18);
    const ek = kit(u, ear, `timeDilatorEar${level >= 5 ? 1 : 0}`);
    ek.box(0.42, 1.0, 0.2, PLATE, 0, 0.5, 0, { r: 0.08 });
    ek.box(0.26, 0.82, 0.04, PINK, 0, 0.5, 0.1, { r: 0.015 });
    ek.cyl(0.14, 0.5, JOINT, 0, 1.05, 0, { axis: 'x', seg: 10 });
    ek.cyl(0.06, 0.52, TRIM, 0, 1.05, 0, { axis: 'x', seg: 8 });
    ek.done();
    const upper = grp(ear, 0, 1.1, 0);
    upper.rotation.x = -0.25;
    const uk = kit(u, upper, `timeDilatorEarTop${level >= 5 ? 1 : 0}${level >= 2 ? 1 : 0}`);
    uk.box(0.38, 1.0, 0.18, PLATE, 0, 0.5, 0, { r: 0.08 });
    uk.box(0.22, 0.78, 0.04, PINK, 0, 0.5, 0.09, { r: 0.015 });
    uk.ball(0.17, tip, 0, 1.08, 0, { sy: 0.9, seg: 10, rows: 7 });
    if (level >= 2) {
      uk.cyl(0.06, 0.12, TRIM, 0, 1.25, 0, { r2: 0.32, seg: 14 });
      uk.cyl(0.03, 0.2, TRIM, 0, 1.38, 0, { seg: 5 });
      uk.ball(0.07, tip, 0, 1.5, 0, { seg: 6, rows: 4 });
    }
    uk.done();
  }
  if (level >= 3) {
    // A floating clock ring round its middle that turns slowly
    const ring = spinner(u, u.body, 0, 2.6, 0, 'y');
    const rk = kit(u, ring, `timeDilatorRing${level >= 5 ? 1 : 0}`);
    rk.torus(2.0, 0.04, TRIM, 0, 0, 0, { rx: PI / 2, seg: 40 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2;
      rk.box(0.5, 0.15, 0.2, i % 3 ? TRIM : tip, Math.cos(a) * 2.0, 0, Math.sin(a) * 2.0, { ry: -a + PI / 2, r: 0.04 });
    }
    rk.done();
    u.idleSpin = 0.8;
  }
  gunMuzzle(u, head, 0, 1.0, 0);
  u.tracer = 0x80d8ff;
  u.height = 7.2;
  return u;
}
