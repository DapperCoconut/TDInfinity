// Tower models, batch 39 (built with the vehicle kit in ../vehicles.js).
// In here: Stardaughter (alternate AA Turret: a winged archer of holy light), Magei (alternate
// Mage: a white-cloaked figure with a crystal crown and a glass book), Sunwalker (alternate
// Hallowboomer: sun robes, a mask and five sun orbs), Aquamancer (alternate Operator: a sorceress
// floating over a stone shrine), Augur Solis (alternate Turret: a giant eye over a winged spire)
// and John Roblox (alternate John: a rifleman with a red beret).
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.

import { glowMat, kit, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { makeThing } from './bits.js';
import { GOLD, INK, LEATHER, STEEL, belt, fist, hair, muzzle, own, rifle, wear } from './people1.js';
import { feet, hands, hood } from './people5.js';
import { cape } from './people18.js';
import { bow } from './people13.js';

const PI = Math.PI;

/** Pushes both shoulders a little forward, so the rig keeps the arms exactly as built. */
function keepArms(h, z = 0.2) {
  h.rightArm.position.z = z;
  h.leftArm.position.z = z;
}

/** A long robe or dress over the legs, flaring out to the hem (torso space). */
function robe(t, col, len, flare, hem) {
  t.slab(2.16, 1.1, 1.16, col, 0, -1.45, 0, { bw: 1.15, bd: 1.12 });
  t.slab(2.4, len, 1.3, col, 0, -2.0 - len / 2, 0, { bw: flare, bd: flare });
  if (hem != null) t.box(2.4 * flare + 0.08, 0.08, 1.3 * flare + 0.08, hem, 0, -2.0 - len + 0.04, 0);
}

/** Feathered wings from the shoulder blades (torso space). `n` feathers a side, `L` the longest. */
function wings(t, mat, rim, n, L) {
  for (const s of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const a = 0.35 + i * (1.6 / n);
      const len = L - i * (L * 0.5 / n);
      t.box(0.34, len, 0.07, i % 2 ? mat : rim, s * 0.55 + s * Math.sin(a) * len / 2, 0.7 - Math.cos(a) * len / 2 + len * 0.3, -0.85 - i * 0.02, { rz: s * (a - 0.5) });
    }
  }
}

/** A cut crystal standing on end (any space). */
function crystal(k, col, x, y, z, s = 1, tilt = 0) {
  k.cyl(0.16 * s, 0.5 * s, col, x, y, z, { r2: 0.16 * s, seg: 6, rz: tilt, flat: true });
  k.cyl(0.16 * s, 0.3 * s, col, x - Math.sin(tilt) * 0.4 * s, y + Math.cos(tilt) * 0.4 * s, z, { r2: 0.01, seg: 6, rz: tilt, flat: true });
}

// ------------------------------------------------------------------ Stardaughter

const LIGHT = 0xfff8e1;
const MOON = 0xe3f2fd;

/**
 * Stardaughter (0-4): a being of holy light with glowing wings, a glowing bow, pure white eyes
 * behind a mask, a floating dress and little motes of light around her. She hovers.
 * Lv 1 a gold circlet, bigger wings. Lv 2 a halo and gold trim. Lv 3 longer wings, a star on the
 * mask. Lv 4 Favored of Umaani: a ring of stars behind her and the brightest glow.
 */
export function makeStardaughter(level) {
  const key = `stardaughter${level}`;
  const h = makeHumanoid({ skin: 0xfff3e0, shirt: 0xffffff, pants: 0xffffff, arms: 0xfffaf0, face: 'none' });
  const glow = glowMat(h, 0xfff59d, 0.6 + level * 0.15);
  const eye = glowMat(h, 0xffffff, 1.4);
  const wing = glowMat(h, 0xe1f5fe, 0.45 + level * 0.1);
  const mote = glowMat(h, 0xfffde7, 1.0);
  const trim = level >= 2 ? GOLD : 0xcfd8dc;
  const hd = wear(h, h.head, `${key}:head`);
  hair(hd, 0xfff9c4, { h: 0.5 });
  hd.box(0.5, 1.4, 0.3, 0xfff9c4, 0, 0.1, -0.6, { r: 0.12 }); // long hair down the back
  hd.box(1.12, 0.62, 0.12, LIGHT, 0, 0.72, 0.62, { r: 0.1 }); // the mask
  hd.box(1.0, 0.06, 0.13, trim, 0, 1.04, 0.62);
  for (const x of [-0.24, 0.24]) hd.box(0.24, 0.11, 0.06, eye, x, 0.78, 0.69, { r: 0.04 }); // pure white eyes
  if (level >= 1) hd.torus(0.72, 0.05, GOLD, 0, 1.15, 0, { rx: PI / 2 + 0.15, seg: 24 }); // circlet
  if (level >= 2) hd.torus(0.6, 0.06, glow, 0, 1.85, -0.25, { rx: PI / 2, seg: 24 }); // halo
  if (level >= 3) hd.cyl(0.12, 0.04, glow, 0, 1.02, 0.7, { axis: 'z', seg: 5 }); // a star on the brow
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  robe(t, 0xffffff, 1.3, 1.25 + level * 0.03, trim);
  t.box(2.1, 0.2, 1.12, trim, 0, -0.84, 0); // sash
  t.box(0.12, 1.4, 0.05, trim, 0, 0.2, 0.56);
  wings(t, wing, 0xffffff, 5 + level, 2.2 + level * 0.3);
  if (level >= 4) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      t.ball(0.14, glow, Math.cos(a) * 2.3, 1.3 + Math.sin(a) * 2.3, -1.3, { seg: 6, rows: 4 }); // ring of stars
    }
    t.torus(2.3, 0.04, glow, 0, 1.3, -1.3, { seg: 32 });
  }
  // motes of light floating around her
  for (let i = 0; i < 4 + level * 2; i++) {
    const a = i * 2.4;
    t.ball(0.07, mote, Math.cos(a) * (1.4 + (i % 3) * 0.3), -1.5 + (i % 5) * 0.7, Math.sin(a) * 1.1, { seg: 5, rows: 3 });
  }
  t.done();
  hands(h, key, null, LIGHT);
  // the glowing bow in the left hand, drawn
  const g = fist(h.leftArm, -1.9, 1.1);
  const gk = wear(h, g, `${key}:bow`);
  const tip = bow(gk, { wood: glow, tips: GOLD, wrap: 0xffffff, recurve: level >= 2, flame: level >= 3 ? eye : null });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tip, 0.12);
  h.leftArm.rotation.set(-PI / 2, 0, 0.3);
  h.rightArm.rotation.set(-PI / 2, 0, -0.4);
  h.pose = { right: -PI / 2, left: -PI / 2, leftRecoil: 0 };
  h.lift = 0.8; // she floats
  h.body.position.y = h.lift;
  h.blade = { color: 0xfff59d, size: 1.3 };
  h.tracer = 0xfff59d;
  return own(h, 0);
}

// ------------------------------------------------------------------ Magei

const CLOAK = 0xf5f5f5;
const CRYS = [0x40c4ff, 0xb388ff, 0xffffff];

/**
 * Magei (0-4): a mystery in a white cloak with the hood up and a shadowed face, a crown set with
 * blue, purple and white crystals, a glass book in the left hand and crystals floating behind
 * its back. More crystals each level; Lv 2+ a purple trim; Lv 4 Time Warp: a clock ring behind it.
 */
export function makeMagei(level) {
  const key = `magei${level}`;
  const h = makeHumanoid({ skin: 0x1a1a2e, shirt: CLOAK, pants: CLOAK, arms: CLOAK, face: 'indigo' });
  const cr = CRYS.map((c) => glowMat(h, c, 0.6 + level * 0.1));
  const glass = glowMat(h, 0xb3e5fc, 0.35);
  const trim = level >= 2 ? 0x7e57c2 : 0x90a4ae;
  const hd = wear(h, h.head, `${key}:head`);
  hood(hd, CLOAK);
  // the crown over the hood: a gold band with crystals
  hd.torus(0.7, 0.07, GOLD, 0, 1.38, 0, { rx: PI / 2, seg: 24 });
  const n = 5 + Math.min(level, 2) * 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2;
    crystal(hd, cr[i % 3], Math.sin(a) * 0.7, 1.55, Math.cos(a) * 0.7, i % 2 ? 0.7 : 1);
  }
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  robe(t, CLOAK, 1.2, 1.2, trim);
  t.box(0.14, 2.6, 0.05, trim, 0, -0.8, 0.6); // front trim
  belt(t, trim, GOLD, -0.84);
  cape(t, CLOAK, 3.6, { clasp: cr[1] });
  // crystals floating in an arc behind its back
  const m = 3 + level;
  for (let i = 0; i < m; i++) {
    const a = -0.9 + (i / Math.max(1, m - 1)) * 1.8;
    crystal(t, cr[i % 3], Math.sin(a) * 1.7, 1.0 + Math.cos(a) * 1.2, -1.2, 1.2, -a * 0.5);
  }
  if (level >= 4) {
    t.torus(2.0, 0.06, cr[1], 0, 1.0, -1.4, { seg: 36 }); // the Time Warp clock ring
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2;
      t.box(0.06, i % 3 ? 0.18 : 0.36, 0.04, cr[2], Math.sin(a) * 1.8, 1.0 + Math.cos(a) * 1.8, -1.4, { rz: -a });
    }
    t.box(0.06, 1.2, 0.05, GOLD, 0.3, 1.45, -1.38, { rz: -0.5 }); // clock hands
    t.box(0.06, 0.8, 0.05, GOLD, -0.2, 1.3, -1.38, { rz: 0.9 });
  }
  t.done();
  hands(h, key, null, tone(CLOAK, 0.9), (a) => a.cyl(0.6, 0.45, CLOAK, 0, -1.3, 0, { seg: 12, r2: 0.7 }));
  feet(h, key, 0xb0bec5);
  // the glass book, open in the left hand
  const g = fist(h.leftArm, -1.9, 1.0);
  const bk = wear(h, g, `${key}:book`);
  for (const s of [-1, 1]) bk.box(0.75, 0.05, 1.0, glass, s * 0.38, -0.2, 0.35, { rz: s * 0.15 });
  bk.box(0.06, 0.1, 1.0, cr[1], 0, -0.25, 0.35);
  bk.ball(0.12, cr[0], 0, 0.15, 0.35, { seg: 8, rows: 5 }); // a spark over the page
  bk.done();
  h.leftArm.rotation.set(-1.2, 0, -0.2);
  // the right hand raised to cast, a crystal over the palm
  const rg = fist(h.rightArm, -1.9, 1.0);
  const rk = wear(h, rg, `${key}:cast`);
  crystal(rk, cr[0], 0, -0.6, 0, 1.1);
  rk.done();
  h.rightArm.rotation.set(-1.6, 0, 0.25);
  keepArms(h);
  h.pose = { right: -1.6, left: -1.2, leftRecoil: 0 };
  h.muzzles = [];
  muzzle(h, rg, -0.8, 0);
  h.tracer = 0x80d8ff;
  return own(h, 0);
}

// ------------------------------------------------------------------ Sunwalker

const SUN_ROBE = 0xef6c00;
const SUN_RED = 0xc62828;

/**
 * Sunwalker (0-4): sun robes with gold patterns, a red cape, a gold belt and leggings and a gold
 * sun mask. Five sun orbs: one in each hand and three floating around it. More gold each level;
 * Lv 4 Meteor: a blazing sun disc behind its head.
 */
export function makeSunwalker(level) {
  const key = `sunwalker${level}`;
  const h = makeHumanoid({ skin: 0x8d5524, shirt: SUN_ROBE, pants: GOLD, arms: SUN_ROBE, face: 'none' });
  const orb = glowMat(h, 0xff9100, 0.9 + level * 0.15);
  const core = glowMat(h, 0xffe082, 1.2);
  const hd = wear(h, h.head, `${key}:head`);
  hair(hd, 0x3e2723);
  hd.box(1.12, 1.0, 0.14, GOLD, 0, 0.62, 0.6, { r: 0.12 }); // the sun mask
  for (const x of [-0.24, 0.24]) hd.box(0.22, 0.1, 0.06, INK, x, 0.75, 0.68, { r: 0.03 });
  for (let i = 0; i < 9; i++) {
    const a = -PI / 2 + (i / 8) * PI;
    hd.box(0.08, 0.3 + (i % 2) * 0.15, 0.06, GOLD, Math.sin(a) * 0.7, 0.62 + Math.cos(a) * 0.7, 0.6, { rz: -a }); // rays round the mask
  }
  if (level >= 4) {
    hd.cyl(1.1, 0.06, orb, 0, 1.0, -0.75, { axis: 'z', seg: 24 }); // the sun disc
    hd.cyl(0.6, 0.08, core, 0, 1.0, -0.72, { axis: 'z', seg: 18 });
  }
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  robe(t, SUN_ROBE, 0.9, 1.12, GOLD);
  belt(t, GOLD, SUN_RED, -0.84);
  for (let i = 0; i < 2 + level; i++) t.box(2.24, 0.06, 1.2, GOLD, 0, 0.75 - i * 0.28, 0); // gold patterns
  t.cyl(0.25, 0.05, GOLD, 0, 0.3, 0.6, { axis: 'z', seg: 12 }); // sun badge
  cape(t, SUN_RED, 3.0 + level * 0.15, { clasp: GOLD });
  // three orbs floating around it
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2 + 0.6;
    t.ball(0.3, orb, Math.cos(a) * 1.8, 1.6 + (i % 2) * 0.5, Math.sin(a) * 1.3, { seg: 10, rows: 7 });
  }
  t.done();
  hands(h, key, null, GOLD);
  feet(h, key, 0x6d4c41);
  // an orb in each hand
  h.muzzles = [];
  for (const [arm, side] of [[h.rightArm, 'r'], [h.leftArm, 'l']]) {
    const g = fist(arm, -1.9, 1.0);
    const ok = wear(h, g, `${key}:orb${side}`);
    ok.ball(0.32, orb, 0, -0.35, 0, { seg: 10, rows: 7 });
    ok.ball(0.18, core, 0, -0.35, 0.12, { seg: 8, rows: 5 });
    ok.done();
    if (side === 'r') muzzle(h, g, -0.35, 0);
  }
  h.rightArm.rotation.set(-1.3, 0, 0.5);
  h.leftArm.rotation.set(-1.3, 0, -0.5);
  keepArms(h);
  h.pose = { right: -1.3, left: -1.3, leftRecoil: 0 };
  h.projectile = { color: 0xff6d00, size: 0.9, arc: 3, glowing: true };
  h.tracer = 0xff9100;
  return own(h, 0);
}

// ------------------------------------------------------------------ Aquamancer

const STONE = 0x9e9e9e;
const STONE_DK = 0x757575;
const SEA = 0x0277bd;

/**
 * Aquamancer (0-4): a base of stone bricks with short columns on its upper sides, and the
 * sorceress floating on top in sea-blue robes with a coral crown and a water orb. Lv 2+ the water
 * glows brighter; Lv 4 seaweed sticks out of the ground on both sides of the base.
 */
export function makeAquamancer(level) {
  const key = `aquamancer${level}`;
  const h = makeHumanoid({ skin: 0xb2dfdb, shirt: SEA, pants: SEA, arms: 0x4fc3f7, face: 'calm' });
  const water = glowMat(h, 0x40c4ff, 0.5 + level * 0.12);
  const hd = wear(h, h.head, `${key}:head`);
  hair(hd, 0x00695c, { h: 0.55 });
  hd.box(0.6, 1.6, 0.35, 0x00695c, 0, 0.0, -0.58, { r: 0.15 }); // long sea-green hair
  for (let i = 0; i < 5; i++) {
    const a = -0.8 + i * 0.4;
    hd.cyl(0.06, 0.35 + (i % 2) * 0.2, 0xff7043, Math.sin(a) * 0.6, 1.45, Math.cos(a) * 0.4 - 0.1, { rz: -a * 0.6, seg: 5 }); // coral crown
  }
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  robe(t, SEA, 1.0, 1.15, water);
  belt(t, 0x004d40, 0x80cbc4, -0.84);
  t.box(1.4, 0.12, 0.06, water, 0, 0.6, 0.56); // a wave pattern across the chest
  t.done();
  hands(h, key, null, 0x0288d1);
  // a water orb over her right hand
  const g = fist(h.rightArm, -1.9, 1.0);
  const wk = wear(h, g, `${key}:orb`);
  wk.ball(0.4, water, 0, -0.5, 0, { seg: 12, rows: 8 });
  wk.torus(0.5, 0.04, 0xb3e5fc, 0, -0.5, 0, { rx: 0.5, seg: 16 });
  wk.done();
  h.rightArm.rotation.set(-1.4, 0, 0.3);
  h.leftArm.rotation.set(-0.4, 0, -0.5);
  keepArms(h);
  h.pose = { right: -1.4, left: -0.4, leftRecoil: 0 };
  h.muzzles = [];
  muzzle(h, g, -0.5, 0);
  // the stone base, on the ground (it doesn't bob with her)
  const k = wear(h, h.root, `${key}:base`);
  const W = 3.6;
  const top = 2.0;
  for (let row = 0; row < 4; row++) {
    const y = 0.25 + row * 0.5;
    const off = row % 2 ? 0.45 : 0;
    for (let i = 0; i < 4; i++) {
      const x = -W / 2 + 0.45 + off + i * 0.9;
      if (x > W / 2 - 0.2) continue;
      k.box(0.86, 0.46, W, (i + row) % 2 ? STONE : tone(STONE, 0.9), x, y, 0, { r: 0.04 }); // bricks
    }
  }
  k.box(W + 0.2, 0.2, W + 0.2, STONE_DK, 0, top, 0, { r: 0.05 }); // the top slab
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    k.cyl(0.22, 0.9, STONE, sx * (W / 2 - 0.1), top + 0.55, sz * (W / 2 - 0.1), { seg: 10 }); // short columns
    k.box(0.55, 0.15, 0.55, STONE_DK, sx * (W / 2 - 0.1), top + 1.05, sz * (W / 2 - 0.1));
  }
  k.cyl(1.0, 0.08, water, 0, top + 0.14, 0, { seg: 20 }); // a pool of water on top
  if (level >= 4) {
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) k.tube([[sx * (W / 2 + 0.2), 0, -1 + i * 0.6], [sx * (W / 2 + 0.5), 0.8, -1 + i * 0.6 + 0.2], [sx * (W / 2 + 0.35), 1.6 + (i % 2) * 0.4, -1 + i * 0.6]], 0.07, 0x2e7d32, { seg: 8, sides: 5 }); // seaweed
  }
  k.done();
  h.lift = top + 0.6; // she floats over the base
  h.body.position.y = h.lift;
  h.tracer = 0x40c4ff;
  return own(h, 0);
}

// ------------------------------------------------------------------ Augur Solis

/**
 * Augur Solis (0-3): a giant eye hovering over a tall spike structure with dragon wings and
 * engravings. The eye's ring and the engravings glow brighter each level; Lv 2+ more spikes;
 * Lv 3 Purge By Fire: a ring of flame-coloured rays round the eye.
 */
export function makeAugurSolis(level) {
  const u = makeThing();
  const k = kit(u, u.body, `augurSolis${level}`);
  const sun = glowMat(u, 0xffd54f, 0.6 + level * 0.2);
  const iris = glowMat(u, 0xff8f00, 1.0);
  const rune = glowMat(u, 0xfff176, 0.5 + level * 0.15);
  const SPIRE = 0x4e342e;
  k.slab(4.0, 0.4, 4.0, 0x5d4037, 0, 0.2, 0, { tw: 0.9, td: 0.9 }); // the base
  // the spike structure: a tall central spike and smaller ones round it
  k.cyl(0.9, 4.5, SPIRE, 0, 2.6, 0, { r2: 0.25, seg: 8 });
  const n = 4 + level * 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2;
    k.cyl(0.3, 2.0 + (i % 2) * 0.8, tone(SPIRE, 0.85), Math.cos(a) * 1.4, 1.2, Math.sin(a) * 1.4, { r2: 0.02, seg: 6, rx: Math.sin(a) * 0.25, rz: -Math.cos(a) * 0.25 });
  }
  for (let i = 0; i < 6; i++) k.box(0.08, 0.5, 0.05, rune, Math.sin(i) * 0.1, 1.2 + i * 0.55, 0.78 - i * 0.08); // engravings
  // dragon wings: a bony arm and membrane panels each side
  for (const s of [-1, 1]) {
    k.tube([[s * 0.6, 3.6, 0], [s * 2.0, 4.8, -0.3], [s * 3.2, 4.0, -0.4]], 0.1, SPIRE, { seg: 10, sides: 6 });
    for (let i = 0; i < 3; i++) {
      const x = s * (1.1 + i * 0.75);
      k.box(0.7, 1.6 - i * 0.3, 0.05, 0x8d2b0b, x, 3.5 - i * 0.1, -0.3, { rz: s * (0.3 + i * 0.15) });
    }
  }
  // the eye, hovering over the top
  const ey = 6.6;
  k.ball(1.0, 0xfafafa, 0, ey, 0, { seg: 16, rows: 12 });
  k.torus(1.05, 0.1, sun, 0, ey, 0, { seg: 28 });
  k.cyl(0.5, 0.1, iris, 0, ey, 0.92, { axis: 'z', seg: 16 });
  k.cyl(0.22, 0.12, INK, 0, ey, 0.98, { axis: 'z', seg: 12 });
  if (level >= 3) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2;
      k.box(0.1, 0.6, 0.06, iris, Math.cos(a) * 1.6, ey + Math.sin(a) * 1.6, -0.1, { rz: a - PI / 2 }); // rays
    }
  }
  k.done();
  muzzle(u, u.body, ey, 1.0);
  u.tracer = 0xfff176;
  return u;
}

// ------------------------------------------------------------------ John Roblox

/**
 * John Roblox (0-4): a rifleman in a red beret with a green jacket and a radio. Lv 1 a longer
 * barrel; Lv 2 a vest; Lv 3 a scope; Lv 4 Inspire: a gold star on the beret and a small flag on
 * his back.
 */
export function makeJohnRoblox(level) {
  const key = `johnRoblox${level}`;
  const h = makeHumanoid({ skin: 0xf5cd30, shirt: 0x2e7d32, pants: 0x37474f, arms: 0x2e7d32, face: 'smirk' });
  const hd = wear(h, h.head, `${key}:head`);
  hd.cyl(0.78, 0.3, 0xc62828, -0.1, 1.15, 0, { seg: 18, rz: 0.15 }); // the beret
  hd.ball(0.08, 0x8e1c1c, -0.1, 1.33, 0, { seg: 6, rows: 4 });
  if (level >= 4) hd.cyl(0.14, 0.04, GOLD, 0.35, 1.15, 0.6, { axis: 'z', seg: 5 }); // gold star
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  belt(t, LEATHER, 0x9e9e9e, -0.84);
  t.box(0.6, 0.7, 0.4, 0x455a64, 0.5, 0.1, -0.7, { r: 0.06 }); // radio on the back
  t.cyl(0.03, 1.4, INK, 0.7, 1.0, -0.7, { seg: 4 }); // its aerial
  if (level >= 2) {
    t.box(2.2, 1.6, 1.22, 0x556b2f, 0, 0.2, 0, { r: 0.12 }); // vest
    for (const x of [-0.5, 0.5]) t.box(0.45, 0.5, 0.18, tone(0x556b2f, 0.8), x, -0.1, 0.65, { r: 0.04 }); // pouches
  }
  if (level >= 4) {
    t.cyl(0.03, 2.2, 0x9e9e9e, -0.6, 1.6, -0.7, { seg: 5 }); // the flag on his back
    t.box(0.9, 0.55, 0.03, 0xc62828, -1.05, 2.4, -0.7);
    t.cyl(0.12, 0.04, GOLD, -1.05, 2.4, -0.68, { axis: 'z', seg: 5 });
  }
  t.done();
  hands(h, key, 0x3e2723, tone(0x2e7d32, 0.8));
  feet(h, key, 0x212121);
  const g = fist(h.rightArm, -1.9, 1.1);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = rifle(gk, { len: level >= 1 ? 2.8 : 2.2, body: 0x3e3e3e, furn: 0x6d4c41, mag: 'box', stock: true, optic: level >= 3 ? 'scope' : 'iron' });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  h.tracer = 0xffe082;
  return own(h);
}

export const MODELS = {
  stardaughter: makeStardaughter,
  magei: makeMagei,
  sunwalker: makeSunwalker,
  aquamancer: makeAquamancer,
  augurSolis: makeAugurSolis,
  johnRoblox: makeJohnRoblox,
};
