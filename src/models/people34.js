// Tower models: people, batch 34 (dressed with the vehicle kit in ../vehicles.js).
// In here: Lament (evolved Gunner), Vulcan (evolved Warrior).
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.

import { glowMat } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { aimBoth, fist, muzzle, own, wear } from './people1.js';
import { shoulderPads } from './people2.js';
import { feet, hands, hood } from './people5.js';
import { cape } from './people18.js';

const PI = Math.PI;
const W = 0xffffff;
const W2 = 0xf2f2f2;
const W3 = 0xe0e0e0;
const B = 0x15151b;
const B2 = 0x24242d;
const B3 = 0x34343f;

// ------------------------------------------------------------------ Lament (white and black, violet glow)

export const LAMENT_GLOW = 0xb388ff;

/** A little butterfly at (x, y, z), wings spread, facing +z; `s` = size, `tilt` = how far the wings are raised. */
function butterfly(k, wing, body, x, y, z, s = 1, tilt = 0.45, ry = 0) {
  const c = Math.cos(ry);
  const sn = Math.sin(ry);
  const at = (dx, dz) => [x + dx * c + dz * sn, z - dx * sn + dz * c];
  k.cyl(0.035 * s, 0.32 * s, body, x, y, z, { axis: 'z', seg: 5, ry });
  for (const side of [-1, 1]) {
    const [ux, uz] = at(side * 0.19 * s, -0.05 * s);
    k.box(0.34 * s, 0.02, 0.26 * s, wing, ux, y + 0.06 * s, uz, { rz: side * tilt, ry: ry + side * 0.25 }); // upper wing
    const [lx, lz] = at(side * 0.13 * s, 0.12 * s);
    k.box(0.22 * s, 0.02, 0.18 * s, wing, lx, y + 0.03 * s, lz, { rz: side * tilt, ry: ry - side * 0.35 }); // lower wing
  }
}

/** A long mourning pistol (fist space, barrel down -y). `body` and `trim` colours, `glow` lines. Returns [muzzle y, z]. */
function mournPistol(k, body, trim, glow, o = {}) {
  const len = o.long ? 1.35 : 1.05;
  const U = 0.3;
  k.box(0.27, len, 0.3, body, 0, -len / 2 + 0.18, U + 0.06, { r: 0.04 }); // slide
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) k.box(0.02, 0.03, 0.2, trim, s * 0.14, 0.1 - i * 0.07, U + 0.08); // grip lines
  k.box(0.25, len * 0.8, 0.16, trim, 0, -len * 0.4 + 0.16, U - 0.15); // frame
  k.box(0.25, 0.28, 0.58, body, 0, 0.12, U - 0.4, { rx: -0.28, r: 0.05 }); // grip
  k.torus(0.09, 0.02, trim, 0, -0.12, U - 0.25, { ry: PI / 2, seg: 10, arc: PI }); // trigger guard
  k.box(0.29, 0.05, len * 0.7, glow, 0, -len * 0.45, U + 0.22, { rx: PI / 2 }); // glowing rail on top
  for (const s of [-1, 1]) k.box(0.02, len * 0.55, 0.06, glow, s * 0.145, -len * 0.48, U + 0.06); // side lines
  let tip = -len + 0.18;
  // a butterfly-wing guard at the muzzle
  for (const s of [-1, 1]) k.box(0.32, 0.03, 0.22, trim, s * 0.2, tip + 0.1, U + 0.06, { rz: s * 0.5 });
  k.cyl(0.1, 0.12, trim, 0, tip - 0.04, U + 0.06, { seg: 10 });
  k.cyl(0.06, 0.04, glow, 0, tip - 0.11, U + 0.06, { seg: 10 });
  tip -= 0.12;
  if (o.long) k.box(0.2, 0.22, 0.5, trim, 0, 0.2, U - 0.88, { rx: -0.28, r: 0.03 }); // longer magazine
  return [tip, U + 0.06];
}

const UPPER_WING = [[0, 0], [0.35, 0.55], [0.9, 1.15], [1.55, 1.35], [1.9, 1.1], [1.85, 0.55], [1.4, 0.15], [0.7, -0.05]];
const LOWER_WING = [[0, 0], [0.75, -0.1], [1.15, -0.55], [1.05, -1.1], [0.6, -1.3], [0.25, -0.8]];

/** Big glowing butterfly wings on the back (torso space): a dark rim, then the glowing wing. `s` = size. */
function backWings(t, upper, lower, s) {
  for (const side of [-1, 1]) {
    for (const [pts, col, y] of [[UPPER_WING, upper, 0.45], [LOWER_WING, lower, 0.35]]) {
      const sh = pts.map(([a, b]) => [side * a * s, b * s]);
      const rim = pts.map(([a, b]) => [side * (a * 1.1 + 0.05) * s, (b * 1.1 + (b > 0 ? 0.05 : -0.05)) * s]);
      const ry = PI / 2 + side * 0.35;
      t.prism(rim, 0.05, B3, 0, y, -0.85, { ry });
      t.prism(sh, 0.06, col, 0, y, -0.88, { ry });
    }
  }
  t.ball(0.18, upper, 0, 0.45, -0.9, { seg: 10, rows: 6 }); // where they join
}

/**
 * Lament (evolved Gunner): a faceless mourner in a long black coat over white, with two pistols:
 * a white one (The Living) and a black one (The Departed), and butterflies around it.
 * Lv 1 Lament for the Living: Butterfly ammo vials on the belt and more butterflies.
 * Lv 2 Celebration for the Departed: a white sash with a lily and a mantle on the shoulders.
 * Lv 3 A Butterfly Takes Flight: big glowing butterfly wings and longer pistols.
 * Lv 4 Funeral of Death Butterflies: bigger wings, a crown of black butterflies, a long tattered
 * cape and a glowing heart.
 */
export function makeLament(level) {
  const h = makeHumanoid({ skin: W, shirt: W, pants: B2, arms: B, face: 'none' });
  const key = `evoLament${level}`;
  const glow = glowMat(h, LAMENT_GLOW);
  const pale = glowMat(h, 0xffffff, 0.85);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // a black mourning hood with a violet band, and a thin veil over the front
  hood(hd, B);
  hd.box(1.45, 0.06, 0.08, glow, 0, 1.2, 0.68, { rx: 0.35 });
  hd.slab(1.2, 0.7, 0.02, B3, 0, 0.55, 0.78, { bw: 1.2 });
  if (level >= 4) {
    // a crown of black butterflies over the head, with a glowing ring
    hd.torus(0.75, 0.03, glow, 0, 1.75, 0, { rx: PI / 2, seg: 24 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      butterfly(hd, B, glow, Math.sin(a) * 0.75, 1.8, Math.cos(a) * 0.75, 0.9, 0.6, a);
    }
  }
  // the coat: black, with a white shirt front and a violet seam
  t.box(1.08, 1.8, 1.15, W2, -0.535, 0.1, 0, { r: 0.12 }); // white half (The Living)
  t.box(1.08, 1.8, 1.15, B, 0.535, 0.1, 0, { r: 0.12 }); // black half (The Departed)
  t.box(0.6, 1.6, 0.06, W, 0, 0.15, 0.58); // shirt front
  t.box(0.05, 1.6, 0.04, glow, 0, 0.15, 0.62); // seam
  for (let i = 0; i < 3; i++) t.ball(0.06, W3, 0.38, 0.6 - i * 0.4, 0.6, { seg: 6, rows: 4 }); // buttons
  t.box(2.2, 0.22, 1.2, B2, 0, -0.84, 0, { r: 0.04 }); // belt
  t.box(0.3, 0.2, 0.06, glow, 0, -0.84, 0.61, { r: 0.02 }); // buckle
  // long coat tails at the back and sides
  for (const s of [-1, 1]) {
    const col = s < 0 ? W2 : B;
    t.slab(1.05, 1.9, 0.08, col, s * 0.53, -1.8, -0.55, { bw: 1.25, bx: s * 0.13, bz: -0.2 });
    t.slab(0.65, 1.7, 0.08, col, s * 0.75, -1.7, 0.5, { bw: 1.2, bz: 0.12 });
    t.box(0.05, 1.7, 0.1, s < 0 ? B3 : glow, s * 1.08, -1.7, 0.5); // trim on the flap's edge
  }
  t.box(2.3, 0.3, 1.25, B2, 0, 0.92, 0, { r: 0.1 }); // high collar
  // butterflies resting on the shoulders (more as it grows)
  butterfly(t, W, B, -1.1, 1.15, 0.1, 1);
  butterfly(t, B, W, 1.1, 1.15, 0.1, 1);
  if (level >= 1) {
    // Butterfly ammo: white and black glass vials on the belt
    for (let i = 0; i < 4; i++) {
      const s = i < 2 ? -1 : 1;
      const x = s * (0.55 + (i % 2) * 0.3);
      t.cyl(0.1, 0.34, i < 2 ? pale : B3, x, -0.6, 0.62, { seg: 8 });
      t.cyl(0.11, 0.06, B2, x, -0.4, 0.62, { seg: 8 });
    }
    butterfly(t, pale, B, -0.9, 1.6, 0.9, 0.8, 0.6, 0.4); // flying round it
    butterfly(t, glow, B, 1.0, 1.9, 0.6, 0.8, 0.6, -0.5);
  }
  if (level >= 2) {
    // a white sash with violet trim, a lily on the chest, and a short mantle
    t.box(0.3, 2.3, 0.06, W, 0, 0.1, 0.66, { rz: 0.62 });
    t.box(0.05, 2.3, 0.07, glow, 0.13, 0.1, 0.67, { rz: 0.62 });
    t.cyl(0.18, 0.3, W, -0.5, 0.55, 0.66, { axis: 'z', seg: 6, r2: 0.02 }); // lily
    t.ball(0.06, glow, -0.5, 0.55, 0.8, { seg: 6, rows: 4 });
    t.slab(2.5, 0.75, 0.08, B2, 0, 0.7, 0, { bw: 1.15 }); // mantle round the shoulders
    for (const s of [-1, 1]) t.box(0.9, 0.05, 0.9, glow, s * 0.9, 0.36, 0, { rz: s * 0.25 });
  }
  if (level >= 3) backWings(t, pale, glow, level >= 4 ? 1.35 : 1);
  if (level >= 4) {
    cape(t, B, 3.2, { w: 2.2, clasp: LAMENT_GLOW, tatter: true });
    t.ball(0.22, glow, 0, 0.35, 0.64, { seg: 12, rows: 8 }); // glowing heart
    t.torus(0.3, 0.04, W, 0, 0.35, 0.64, { seg: 16 });
    butterfly(t, B, glow, 0.2, 2.3, -0.4, 1.1, 0.5, 0.3);
    butterfly(t, pale, B, -1.6, 0.4, 0.6, 0.9, 0.7, -0.6);
  }
  hd.done();
  t.done();
  hands(h, key, W3, B2, (a, s) => {
    a.box(0.5, 0.06, 0.04, s > 0 ? glow : pale, 0, -0.55, 0.55); // cuff line: violet on the black side, white on the white side
  });
  feet(h, key, B2, null);
  // two pistols: white in the right hand (The Living), black in the left (The Departed)
  h.muzzles = [];
  const guns = [[h.rightArm, W, W3, pale], [h.leftArm, B, B3, glow]];
  for (const [arm, body, trim, g] of guns) {
    const f = fist(arm, -1.9, 1.35);
    const gk = wear(h, f, `${key}:gun${body === W ? 'w' : 'b'}`);
    const [y, z] = mournPistol(gk, body, trim, g, { long: level >= 3 });
    gk.done();
    muzzle(h, f, y, z);
  }
  aimBoth(h);
  h.tracer = LAMENT_GLOW;
  return own(h, 0.3);
}

// ------------------------------------------------------------------ Vulcan (charcoal and molten orange)

export const VULCAN_GLOW = 0xff6d00;
const C = 0x26221f; // charcoal armour
const C2 = 0x36302b;
const C3 = 0x4a423b;

/** A little flame: an orange cone with a yellow core, pointing up. */
function flame(k, fire, core, x, y, z, s = 1, o = {}) {
  k.cyl(0.18 * s, 0.6 * s, fire, x, y, z, { r2: 0.01, seg: 6, ...o });
  k.cyl(0.09 * s, 0.38 * s, core, x, y - 0.06 * s, z, { r2: 0.01, seg: 5, ...o });
}

/** The Vulcan greatsword (fist space, blade down -y): a dark blade with a molten core and flames. Returns the tip y. */
function vulcanSword(k, fire, core, o = {}) {
  const bl = o.big ? 3.4 : 2.9;
  const bw = o.big ? 0.62 : 0.52;
  k.cyl(0.11, 0.7, C2, 0, 0.12, 0, { seg: 8 }); // grip
  for (let i = 0; i < 3; i++) k.torus(0.11, 0.025, C3, 0, 0.35 - i * 0.2, 0, { rx: PI / 2, seg: 8 });
  k.ball(0.17, fire, 0, 0.55, 0, { seg: 10, rows: 7 }); // pommel
  // a swept crossguard with burning ends
  for (const sd of [-1, 1]) {
    k.box(0.2, 0.18, 0.7, C3, 0, -0.3, sd * 0.38, { r: 0.04, rx: sd * 0.3 });
    flame(k, fire, core, 0, -0.05, sd * 0.78, 0.7);
  }
  const y0 = -0.4;
  const body = bl * 0.85;
  const tip = bl - body;
  k.box(0.1, body, bw, C, 0, y0 - body / 2, 0); // blade
  k.slab(0.1, tip, bw, C, 0, y0 - body - tip / 2, 0, { bd: 0.05 });
  k.box(0.12, body * 0.9, 0.12, fire, 0, y0 - body * 0.47, 0); // molten core
  for (const sd of [-1, 1]) k.box(0.11, body, 0.04, core, 0, y0 - body / 2, sd * (bw / 2 - 0.02)); // hot edges
  // flames licking up off the blade
  const n = o.big ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const sd = i % 2 ? 1 : -1;
    flame(k, fire, core, 0, y0 - 0.5 - (i * body) / n, sd * (bw / 2 + 0.12), o.big ? 0.9 : 0.75, { rx: sd * 2.6 });
  }
  if (o.rings) for (let i = 0; i < 2; i++) k.torus(0.55, 0.04, fire, 0, y0 - body * (0.35 + i * 0.3), 0, { rz: PI / 2, seg: 16 }); // burning rings
  return y0 - bl;
}

/**
 * Vulcan (evolved Warrior): a charcoal knight in plate with molten orange cracks, a horned helm
 * and a flaming greatsword. Lv 1 Enspark: a glowing chest core. Lv 2 Ignition Blade II: a burning
 * crest, molten gauntlets and shoulder plates with ember spikes. Lv 3 Ignition Blade V: a wreath
 * of flames on its back and a burning sword with rings. Lv 4 Inferno: a bigger sword, a crown of
 * fire and a burning cape.
 */
export function makeVulcan(level) {
  const h = makeHumanoid({ skin: C, shirt: C, pants: C2, arms: C, face: 'none' });
  const key = `evoVulcan${level}`;
  const fire = glowMat(h, VULCAN_GLOW);
  const core = glowMat(h, 0xffd54f);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // a horned great helm with a glowing eye slit and cracks
  hd.box(1.35, 1.4, 1.35, C2, 0, 0.58, 0, { r: 0.22 });
  hd.box(1.05, 0.12, 0.06, core, 0, 0.62, 0.69); // eye slit
  hd.box(0.06, 0.45, 0.05, fire, 0.3, 0.25, 0.69, { rz: 0.4 }); // crack
  for (const sd of [-1, 1]) {
    const hl = level >= 4 ? 1.1 : 0.8;
    hd.tube([[sd * 0.62, 0.85, 0], [sd * 1.0, 1.15, -0.1], [sd * 1.1, 1.15 + hl * 0.6, -0.25]], 0.1, C3, { seg: 10, sides: 6 }); // horns
    hd.ball(0.07, fire, sd * 1.1, 1.2 + hl * 0.6, -0.25, { seg: 6, rows: 4 });
  }
  if (level >= 2) {
    // a crest of flames along the top
    for (let i = 0; i < 4; i++) flame(hd, fire, core, 0, 1.45, 0.45 - i * 0.3, 0.8 + (i === 1 ? 0.3 : 0));
  }
  if (level >= 4) {
    // a crown of fire
    hd.torus(0.72, 0.05, fire, 0, 1.35, 0, { rx: PI / 2, seg: 20 });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * PI * 2;
      flame(hd, fire, core, Math.sin(a) * 0.72, 1.6, Math.cos(a) * 0.72, 0.65);
    }
  }
  // plate armour with molten cracks
  t.box(2.18, 1.8, 1.18, C, 0, 0.05, 0, { r: 0.12 });
  t.box(2.28, 1.25, 1.28, C2, 0, 0.3, 0, { r: 0.14 }); // breastplate
  for (const [x, y, rz] of [[-0.5, 0.5, 0.5], [0.45, 0.2, -0.6], [-0.2, -0.1, 0.2], [0.6, 0.7, 0.3]]) t.box(0.05, 0.42, 0.04, fire, x, y, 0.65, { rz });
  t.box(2.24, 0.26, 1.22, C3, 0, -0.86, 0, { r: 0.04 }); // belt
  t.box(0.36, 0.24, 0.06, fire, 0, -0.86, 0.63, { r: 0.02 });
  for (const sd of [-1, 1]) t.slab(0.75, 0.7, 0.12, C2, sd * 0.55, -1.3, 0.5, { bw: 0.8 }); // tassets
  if (level >= 1) {
    // Enspark: a glowing core in the chest
    t.ball(0.24, core, 0, 0.45, 0.66, { seg: 12, rows: 8 });
    t.torus(0.32, 0.06, C3, 0, 0.45, 0.66, { seg: 14 });
    for (let i = 0; i < 4; i++) t.box(0.05, 0.3, 0.04, fire, Math.sin((i * PI) / 2) * 0.45, 0.45 + Math.cos((i * PI) / 2) * 0.45, 0.66, { rz: (i * PI) / 2 });
  }
  if (level >= 2) {
    shoulderPads(t, C2, 0.62);
    for (const sd of [-1, 1]) {
      for (let i = 0; i < 3; i++) t.cyl(0.1, 0.45, C3, sd * (1.25 + i * 0.12), 1.15 - i * 0.05, -0.25 + i * 0.25, { r2: 0.01, seg: 6, rz: -sd * 0.5 }); // spikes
      t.ball(0.08, fire, sd * 1.5, 1.4, 0, { seg: 6, rows: 4 });
    }
  }
  if (level >= 3) {
    // a wreath of flames on its back
    t.torus(1.05, 0.07, C3, 0, 0.6, -0.85, { seg: 24 });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * PI * 2;
      flame(t, fire, core, Math.sin(a) * 1.05, 0.6 + Math.cos(a) * 1.05, -0.88, 0.9, { rz: -a });
    }
  }
  if (level >= 4) {
    cape(t, 0x3e1a0b, 3.0, { w: 2.2, clasp: VULCAN_GLOW, tatter: true });
    t.box(2.4, 0.08, 0.05, fire, 0, -1.9, -0.82); // burning hem
  }
  hd.done();
  t.done();
  hands(h, key, C3, C2, (a) => {
    if (level >= 2) {
      a.box(0.75, 0.55, 0.75, C2, 0, -1.25, 0, { r: 0.08 }); // gauntlets
      a.box(0.77, 0.07, 0.77, fire, 0, -1.05, 0);
    }
  });
  feet(h, key, C3, (b) => b.box(1.12, 0.1, 1.14, fire, 0, -1.3, 0.02));
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const tipY = vulcanSword(gk, fire, core, { big: level >= 4, rings: level >= 3 });
  gk.done();
  muzzle(h, g, tipY, 0);
  h.rightArm.rotation.set(-2.5, 0, 0.2);
  h.leftArm.rotation.set(-0.4, 0, -0.25);
  h.pose = { right: -2.5, left: -0.4, leftRecoil: 0 };
  h.swing = 2.0;
  h.melee = true;
  h.tracer = VULCAN_GLOW;
  return own(h, 0);
}

export const MODELS = {
  evoLament: makeLament,
  evoVulcan: makeVulcan,
};
