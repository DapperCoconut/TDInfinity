// Tower models: people, batch 37 (dressed with the vehicle kit in ../vehicles.js).
// In here: Rocket Battery (alternate Turret: a hwacha rocket cart with its operator), Mad Alchemist
// (alternate Flamethrower: a goblin-masked potion thrower), Paladin (alternate Combat Medic: a
// heavy knight with a maul) and Cleric (alternate Doctor: a praying healer in yellow).
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.

import * as THREE from 'three';
import { glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { GOLD, INK, LEATHER, STEEL, WOOD, band, belt, dome, fist, goggles, hair, helmet, muzzle, own, sash, wear } from './people1.js';
import { shoulderPads } from './people2.js';
import { feet, hands } from './people5.js';
import { cape, gauntlet } from './people18.js';

const PI = Math.PI;

/** Pushes both shoulders a little forward, so the rig keeps the arms exactly as built (rig.armsMoved). */
function keepArms(h, z = 0.2) {
  h.rightArm.position.z = z;
  h.leftArm.position.z = z;
}

// ------------------------------------------------------------------ Rocket Battery

const IRON = 0x6f767d;
const IRON_DK = 0x454b51;
const PAPER = 0xd7c29e; // the paper powder tube tied to each rocket arrow

/** A wooden cart wheel with spokes, its hole along x (root space). `iron`: a steel tyre. */
function cartWheel(k, x, y, z, r, iron) {
  k.torus(r, 0.11, WOOD, x, y, z, { ry: PI / 2, seg: 22 });
  if (iron) k.torus(r + 0.07, 0.05, IRON_DK, x, y, z, { ry: PI / 2, seg: 22 });
  for (let i = 0; i < 8; i++) k.box(0.1, r * 2 - 0.1, 0.1, tone(WOOD, 0.85), x, y, z, { rx: (i / 8) * PI });
  k.cyl(0.24, 0.36, tone(WOOD, 0.7), x, y, z, { axis: 'x', seg: 12 }); // hub
  k.cyl(0.08, 0.5, iron ? IRON_DK : INK, x, y, z, { axis: 'x', seg: 8 }); // axle pin
}

/**
 * One rocket arrow lying along +z (rack space), its tail at z0: a shaft, the powder tube near
 * the head, an iron head. o.cluster: a fat round warhead; o.raze: a red warhead with a gold tip.
 */
function rocketArrow(k, x, y, z0, len, o = {}) {
  k.cyl(0.035, len, 0xb08850, x, y, z0 + len / 2, { axis: 'z', seg: 5 });
  const tz = z0 + len;
  k.cyl(0.085, 0.42, PAPER, x, y, tz - 0.32, { axis: 'z', seg: 8 }); // powder tube
  k.cyl(0.088, 0.05, 0x8d6e63, x, y, tz - 0.42, { axis: 'z', seg: 8 }); // binding
  if (o.cluster || o.raze) {
    k.ball(0.15, o.raze ? 0xc62828 : 0x2e3338, x, y, tz + 0.04, { sz: 1.3, seg: 10, rows: 7 });
    k.cyl(0.1, 0.2, o.raze ? GOLD : IRON, x, y, tz + 0.28, { axis: 'z', r2: 0.01, seg: 8 });
  } else k.cyl(0.07, 0.22, IRON, x, y, tz + 0.08, { axis: 'z', r2: 0.01, seg: 6 });
}

/** The operator's iron helmet with a low brim, and goggles under it (head space). */
function operatorHead(hd, level) {
  helmet(hd, IRON, { cover: level >= 4 ? 0xc62828 : IRON_DK, band: true });
  hd.torus(0.86, 0.06, IRON_DK, 0, 0.93, 0, { rx: PI / 2, seg: 22 }); // brim
  goggles(hd, 0.74, level >= 4 ? 0xffb300 : 0x90a4ae, { frame: 0x3e2723, strap: LEATHER });
  if (level >= 4) {
    // Raze Cities: a red plume in a gold holder
    hd.cyl(0.08, 0.3, GOLD, 0, 1.6, 0, { seg: 8 });
    hd.tube([[0, 1.72, 0.1], [0, 1.95, -0.2], [0, 1.85, -0.7], [0, 1.5, -1.0]], 0.13, 0xc62828, { seg: 12, sides: 7 });
  }
}

/**
 * Rocket Battery (0-4): a hwacha. A wooden two-wheeled cart holds a box rack full of rocket
 * arrows tilted up; the operator stands behind it in an iron helmet, goggles and an iron
 * chestplate down to both elbows over leather, holding a spare rocket.
 * Lv 1 Bigger Rockets: a bigger rack, iron bands and iron tyres. Lv 2 Guided Rockets: more
 * tubes, iron corners and a sighting vane. Lv 3 Clusterbombs: fat round warheads. Lv 4 Raze
 * Cities: red paint, gold bands, red warheads and glowing fuses.
 */
export function makeRocketBattery(level) {
  const key = `rocketBattery${level}`;
  const raze = level >= 4;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: 0x7a5230, pants: 0x4e3420, arms: 0x7a5230, face: 'focus' });
  const ember = glowMat(h, 0xff6d00);
  const hd = wear(h, h.head, `${key}:head`);
  operatorHead(hd, level);
  hd.done();
  // the iron chestplate over a leather jerkin
  const plate = raze ? 0x7b1f1f : IRON;
  const trim = raze ? GOLD : IRON_DK;
  const t = wear(h, h.torso, `${key}:torso`);
  t.box(2.2, 1.55, 1.22, plate, 0, 0.25, 0, { r: 0.14 });
  t.box(0.12, 1.4, 0.06, trim, 0, 0.25, 0.63); // centre ridge
  t.box(2.24, 0.1, 1.26, trim, 0, -0.5, 0); // lower rim
  t.box(2.24, 0.1, 1.26, trim, 0, 0.98, 0); // neck rim
  for (const sx of [-0.8, 0.8]) for (const y of [0.85, -0.38]) t.ball(0.06, trim, sx, y, 0.62, { seg: 6, rows: 4 }); // rivets
  belt(t, LEATHER, raze ? GOLD : 0x9e9e9e, -0.82);
  t.box(2.18, 0.5, 1.16, tone(0x7a5230, 0.85), 0, -1.12, 0, { r: 0.05 }); // leather skirt
  t.box(0.5, 0.36, 0.22, LEATHER, -0.6, -1.0, 0.62, { r: 0.04 }); // match pouch
  t.done();
  // the plate reaches down both upper arms to the elbows
  hands(h, key, LEATHER, tone(0x7a5230, 0.75), (a) => {
    a.box(1.14, 0.95, 1.14, plate, 0, -0.42, 0, { r: 0.1 });
    a.box(1.18, 0.08, 1.18, trim, 0, -0.88, 0);
    a.ball(0.18, trim, 0, -0.84, 0.5, { seg: 8, rows: 5 }); // elbow cop
  });
  feet(h, key, 0x3e2723);
  // a spare rocket in the right hand, the left hand steadying it
  const g = fist(h.rightArm, -1.9, 1.0);
  const gk = wear(h, g, `${key}:held`);
  gk.cyl(0.035, 1.6, 0xb08850, 0, -0.5, 0, { seg: 5 });
  gk.cyl(0.1, 0.45, PAPER, 0, -1.05, 0, { seg: 8 });
  if (level >= 3) gk.ball(0.17, raze ? 0xc62828 : 0x2e3338, 0, -1.4, 0, { sy: 1.3, seg: 10, rows: 7 });
  else gk.cyl(0.01, 0.26, IRON, 0, -1.4, 0, { r2: 0.08, seg: 6 });
  for (let i = 0; i < 3; i++) gk.box(0.02, 0.3, 0.14, 0xeeeeee, Math.sin((i / 3) * PI * 2) * 0.05, 0.25, Math.cos((i / 3) * PI * 2) * 0.05, { ry: (i / 3) * PI * 2 }); // fletching
  gk.done();
  h.rightArm.rotation.set(-0.7, 0, 0.35);
  h.leftArm.rotation.set(-0.75, 0, -0.45);
  h.pose = { right: -0.7, left: -0.75, leftRecoil: 0 };

  // the cart, in front of the operator
  const k = wear(h, h.root, `${key}:cart`);
  const Z = 3.0;
  const wr = 1.05;
  for (const s of [-1, 1]) {
    cartWheel(k, s * 1.75, wr, Z, wr, level >= 1);
    // a long shaft each side, from the handles by the operator to the front of the cart
    k.tube([[s * 1.2, 1.6, 0.9], [s * 1.25, 1.35, Z - 0.6], [s * 1.25, 1.2, Z + 1.3]], 0.11, WOOD, { seg: 10, sides: 6 });
    k.cyl(0.1, 0.5, tone(WOOD, 0.7), s * 1.2, 1.62, 0.7, { axis: 'z', seg: 8 }); // handle grip
    k.cyl(0.07, 1.3, tone(WOOD, 0.85), s * 1.25, 0.65, Z + 1.1, { seg: 6, rz: s * 0.05 }); // prop leg
  }
  k.cyl(0.1, 3.3, tone(WOOD, 0.8), 0, wr, Z, { axis: 'x', seg: 8 }); // axle
  k.box(2.6, 0.18, 2.6, WOOD, 0, 1.38, Z, { r: 0.04 }); // bed
  for (let i = 0; i < 4; i++) k.box(0.03, 0.2, 2.62, tone(WOOD, 0.7), -0.975 + i * 0.65, 1.39, Z); // plank seams
  if (level >= 1) for (const zz of [Z - 1.1, Z + 1.1]) k.box(2.64, 0.22, 0.12, raze ? GOLD : IRON_DK, 0, 1.38, zz); // iron straps
  // crate of spare rockets on the bed's side, and a match tub
  k.box(0.7, 0.45, 1.6, tone(WOOD, 1.1), 1.0, 1.7, Z - 0.2, { r: 0.03 });
  for (let i = 0; i < 3; i++) k.cyl(0.07, 1.5, PAPER, 0.8 + i * 0.2, 1.98, Z - 0.2, { axis: 'z', seg: 6 });
  k.cyl(0.25, 0.4, tone(WOOD, 0.8), -1.6, 0.2, 0.9, { seg: 10 });
  k.cyl(0.02, 0.3, raze ? ember : 0x8d6e63, -1.6, 0.5, 0.9, { seg: 4 });
  k.done();

  // the rack, tilted up toward +z
  const rack = new THREE.Group();
  rack.position.set(0, 2.2, Z);
  rack.rotation.x = -0.6;
  h.root.add(rack);
  const rk = wear(h, rack, `${key}:rack`);
  const cols = [4, 5, 6, 6, 7][level];
  const rows = [3, 3, 4, 4, 5][level];
  const sp = 0.34;
  const W = cols * sp + 0.3;
  const H = rows * sp + 0.3;
  const D = 1.3;
  const wood = raze ? 0x8e2a1e : 0x8d6e47;
  rk.box(W, H, 0.12, tone(wood, 0.85), 0, 0, -D / 2); // back board
  for (const s of [-1, 1]) {
    rk.box(0.12, H, D, wood, s * (W / 2 - 0.06), 0, 0); // sides
    rk.box(W, 0.12, D, wood, 0, s * (H / 2 - 0.06), 0); // top and bottom
  }
  rk.box(W, H, 0.1, wood, 0, 0, D / 2 - 0.05, { r: 0.03 }); // the front board the tubes poke through
  const band2 = raze ? GOLD : IRON_DK;
  if (level >= 1) for (const zz of [-D / 2 + 0.15, D / 2 - 0.2]) {
    rk.box(W + 0.06, 0.08, 0.12, band2, 0, H / 2 + 0.01, zz);
    rk.box(W + 0.06, 0.08, 0.12, band2, 0, -H / 2 - 0.01, zz);
    for (const s of [-1, 1]) rk.box(0.08, H + 0.06, 0.12, band2, s * (W / 2 + 0.01), 0, zz);
  }
  if (level >= 2) {
    // iron corner caps and a sighting vane on top
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) rk.box(0.2, 0.2, 0.2, band2, sx * W / 2, sy * H / 2, D / 2 - 0.05, { r: 0.03 });
    rk.box(0.06, 0.35, 0.5, band2, 0, H / 2 + 0.17, 0.2);
    rk.torus(0.12, 0.03, band2, 0, H / 2 + 0.4, 0.4, { seg: 10 });
  }
  const len = [1.5, 1.7, 1.8, 1.8, 1.9][level];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const x = (c - (cols - 1) / 2) * sp;
      const y = (r - (rows - 1) / 2) * sp;
      rk.cyl(0.13, 0.08, INK, x, y, D / 2 + 0.01, { axis: 'z', seg: 8 }); // the tube mouth
      // most tubes hold a ready rocket; a couple are empty (already fired)
      if ((c * 7 + r * 3) % 9 !== 4) rocketArrow(rk, x, y, D / 2 - len + 0.9, len, { cluster: level >= 3 && (c + r) % 2 === 0, raze: raze && (c + r) % 2 === 0 });
      if (raze && (c + r) % 3 === 0) rk.ball(0.06, ember, x, y, -D / 2 - 0.05, { seg: 6, rows: 4 }); // glowing fuses at the back
    }
  }
  rk.done();
  h.muzzles = [];
  muzzle(h, rack, 0, D / 2 + 1.0, 0);
  h.tracer = raze ? 0xff3d00 : 0xff8f00;
  h.projectile = { color: raze ? 0xc62828 : level >= 3 ? 0x2e3338 : 0xd7c29e, size: 0.4 + level * 0.06, arc: 6, ...(raze ? { glowing: true } : {}) };
  return own(h, 0);
}

// ------------------------------------------------------------------ Mad Alchemist

const ALC_SKIN = 0x7cb342; // green skin
const ROBE = 0x6a1b9a; // purple clothes
const SLEEVE = 0x9e9e9e; // grey sleeves
const MASK = 0x558b2f; // the goblin mask
const BELT = 0x6d4c41; // the brown shoulder belt
const NEON = 0x76ff03; // the neon-green brew

/** A round-bottomed potion flask in a fist (gun space: hanging along -y). Returns the flask's middle y. */
function flask(k, glass, brew, r) {
  const y = -0.25 - r;
  k.cyl(0.09, 0.32, glass, 0, -0.12, 0, { seg: 8 }); // neck
  k.cyl(0.11, 0.12, 0x8d6e63, 0, 0.08, 0, { seg: 8 }); // cork
  k.ball(r, glass, 0, y, 0, { seg: 14, rows: 10 });
  k.ball(r * 0.8, brew, 0, y - r * 0.12, 0, { seg: 12, rows: 8 }); // the glowing brew inside
  return y;
}

/**
 * Mad Alchemist (0-4): green skin, purple clothes with grey sleeves, a goblin-like green mask with
 * long ears and a hooked nose, a black witch hat and a brown belt over one shoulder. He holds up
 * a neon-green potion to throw and has a matching vial in the other hand.
 * Lv 1 an orange fire potion on the belt. Lv 2 a blue lightning potion. Lv 3 a purple poison
 * potion, a grey metal potion and a satchel. Lv 4 Mad Flailing: glowing eyes, a bigger flask and
 * green bubbles rising off it.
 */
export function makeMadAlchemist(level) {
  const key = `madAlchemist${level}`;
  const h = makeHumanoid({ skin: ALC_SKIN, shirt: ROBE, pants: tone(ROBE, 0.7), arms: SLEEVE, face: 'goblin' });
  const neon = glowMat(h, NEON);
  const glass = glowMat(h, 0xccff90, 0.25);
  const eye = glowMat(h, level >= 4 ? NEON : 0xffeb3b, level >= 4 ? 1.2 : 0.6);
  const hd = wear(h, h.head, `${key}:head`);
  // the goblin mask over the upper face: brow, hooked nose, eye holes, long pointed ears
  band(hd, 0.66, 0.06, 0.55, 2.4, MASK, 0.78);
  hd.box(0.95, 0.12, 0.14, tone(MASK, 0.75), 0, 1.0, 0.66, { r: 0.04 }); // heavy brow
  hd.cyl(0.13, 0.5, MASK, 0, 0.6, 0.86, { axis: 'z', r2: 0.02, seg: 8, rx: 0.35 }); // hooked nose
  for (const s of [-1, 1]) {
    hd.box(0.2, 0.12, 0.06, INK, s * 0.24, 0.78, 0.72, { rz: s * -0.25 }); // eye hole
    hd.box(0.08, 0.06, 0.04, eye, s * 0.24, 0.78, 0.755);
    hd.cyl(0.18, 0.75, MASK, s * 0.95, 0.85, -0.05, { r2: 0.01, seg: 6, rz: s * -1.25, sz: 0.4 }); // ear
  }
  for (const x of [-0.25, 0, 0.25]) hd.cyl(0.04, 0.12, 0xfff9c4, x, 0.5, 0.67, { r2: 0.005, seg: 4, rx: PI }); // fangs
  // the witch hat: wide brim, tall bent cone, a band and buckle
  hd.cyl(1.25, 0.06, 0x1a1a1a, 0, 1.28, 0, { seg: 24 });
  hd.cyl(0.72, 1.1, 0x212121, 0, 1.85, 0, { r2: 0.38, seg: 16 });
  hd.cyl(0.38, 0.7, 0x212121, 0, 2.55, -0.12, { r2: 0.02, seg: 12, rx: -0.45 });
  hd.cyl(0.71, 0.18, level >= 4 ? neon : ROBE, 0, 1.42, 0, { r2: 0.66, seg: 16 });
  hd.box(0.26, 0.24, 0.06, GOLD, 0, 1.42, 0.7);
  hd.done();
  // purple tunic: a hem to the knees, the brown shoulder belt with potions on it
  const t = wear(h, h.torso, `${key}:torso`);
  t.slab(2.16, 0.75, 1.16, ROBE, 0, -1.3, 0, { bw: 1.12, bd: 1.1 });
  for (const s of [-1, 1]) t.box(0.06, 0.7, 0.06, tone(ROBE, 0.7), s * 0.4, -1.3, 0.62); // hem slits
  t.box(0.9, 0.22, 1.12, SLEEVE, 0, 0.92, 0, { r: 0.06 }); // grey collar
  belt(t, BELT, 0x9e9e9e, -0.84);
  sash(t, BELT, 1, 0.3);
  const pots = [[NEON, true]];
  if (level >= 1) pots.push([0xff6d00, true]);
  if (level >= 2) pots.push([0x2979ff, true]);
  if (level >= 3) pots.push([0xaa00ff, true], [0x9e9e9e, false]);
  // along the belt: over the left shoulder down to the right hip, on the front of the chest
  const dir = [-Math.sin(0.62), Math.cos(0.62)];
  pots.forEach(([col, glow], i) => {
    const tt = 0.75 - i * 0.36;
    const x = dir[0] * tt * 1.15;
    const y = dir[1] * tt * 1.15;
    const brew = glow ? glowMat(h, col, 0.7) : col;
    t.box(0.3, 0.08, 0.1, tone(BELT, 0.75), x, y - 0.12, 0.66); // loop
    t.cyl(0.12, 0.32, glass, x, y, 0.75, { seg: 10 });
    t.cyl(0.1, 0.24, brew, x, y - 0.03, 0.75, { seg: 10 });
    t.cyl(0.07, 0.08, 0x8d6e63, x, y + 0.2, 0.75, { seg: 6 });
  });
  if (level >= 3) {
    // a leather satchel at the left hip
    t.box(0.6, 0.55, 0.32, LEATHER, 1.0, -1.05, 0.25, { r: 0.06 });
    t.box(0.62, 0.22, 0.34, tone(LEATHER, 0.8), 1.0, -0.86, 0.26, { r: 0.04 });
  }
  t.done();
  hands(h, key, null, tone(SLEEVE, 0.75), (a) => {
    a.cyl(0.58, 0.3, tone(SLEEVE, 0.85), 0, -1.25, 0, { seg: 12, r2: 0.62 }); // flared cuff
  });
  feet(h, key, 0x3e2723, (b) => b.cyl(0.2, 0.4, 0x3e2723, 0, -1.85, 0.75, { axis: 'z', r2: 0.03, seg: 6, rx: -0.4 })); // curled toe tips
  // the neon-green potion held up to throw
  h.muzzles = [];
  const r = level >= 4 ? 0.4 : 0.32;
  const g = fist(h.rightArm, -1.9, 1.1);
  const gk = wear(h, g, `${key}:potion`);
  const fy = flask(gk, glass, neon, r);
  if (level >= 4) for (let i = 0; i < 4; i++) gk.ball(0.06 + (i % 2) * 0.03, neon, Math.sin(i * 2.3) * 0.2, fy + 0.2 + i * 0.22, Math.cos(i * 2.3) * 0.2, { seg: 6, rows: 4 }); // bubbles
  gk.done();
  muzzle(h, g, fy, 0);
  // the matching vial in the left hand
  const v = fist(h.leftArm, -1.9, 1.0);
  const vk = wear(h, v, `${key}:vial`);
  vk.cyl(0.1, 0.6, glass, 0, -0.4, 0, { seg: 10 });
  vk.cyl(0.08, 0.45, neon, 0, -0.45, 0, { seg: 10 });
  vk.cyl(0.08, 0.12, 0x8d6e63, 0, -0.05, 0, { seg: 6 });
  vk.ball(0.1, glass, 0, -0.7, 0, { seg: 8, rows: 5 });
  vk.done();
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-0.9, 0, -0.25);
  h.pose = { right: -2.8, left: -0.9, leftRecoil: 0 };
  h.swing = 1.9;
  h.tracer = NEON;
  h.projectile = { color: NEON, size: 0.45, arc: 3, glowing: true };
  return own(h, 0);
}

// ------------------------------------------------------------------ Paladin

const PLATE = 0xb8c2cc; // bright steel
const PLATE_DK = 0x7d8790;
const MAIL = 0x8f979e;
const WHITE = 0xf2f2f2;

/** The Paladin's head (head space): bare at Lv 0, an open helm at Lv 1, a great helm from Lv 2. */
function paladinHead(hd, level, eyes) {
  if (level === 0) {
    hair(hd, 0xa1887f);
    return;
  }
  if (level === 1) {
    dome(hd, 0.8, 0.66, PLATE, 0, 0.88, 0);
    band(hd, 0.74, 0.08, 0.6, 3.6, PLATE, 0.6, { ry: PI }); // back and cheeks
    hd.box(0.12, 0.5, 0.08, PLATE_DK, 0, 0.78, 0.76); // nasal bar
    hd.torus(0.79, 0.05, GOLD, 0, 0.9, 0, { rx: PI / 2, seg: 22 }); // gold rim
    return;
  }
  // the great helm: a steel pot over the whole head, with a slit to see through
  hd.cyl(0.84, 1.15, PLATE, 0, 0.72, 0, { seg: 20 });
  dome(hd, 0.84, 0.42, PLATE, 0, 1.29, 0);
  hd.box(0.95, 0.13, 0.1, INK, 0, 0.8, 0.82); // eye slit
  hd.box(0.14, 0.62, 0.06, GOLD, 0, 0.36, 0.84); // gold cross below the slit
  hd.box(0.5, 0.12, 0.06, GOLD, 0, 0.5, 0.84);
  for (const x of [-0.42, -0.28, 0.28, 0.42]) for (const y of [0.35, 0.5]) hd.box(0.06, 0.06, 0.05, INK, x, y, 0.82, { ry: x * 0.6 }); // breath holes
  hd.torus(0.85, 0.05, GOLD, 0, 1.28, 0, { rx: PI / 2, seg: 22 });
  hd.torus(0.85, 0.05, PLATE_DK, 0, 0.16, 0, { rx: PI / 2, seg: 22 });
  if (level >= 3) {
    // only glowing eyes show, and a gold crest on top
    for (const s of [-1, 1]) hd.box(0.2, 0.08, 0.04, eyes, s * 0.22, 0.8, 0.86);
    hd.prism([[-0.5, 0], [-0.3, 0.45], [0.3, 0.45], [0.5, 0]], 0.1, GOLD, 0, 1.62, 0);
    hd.cyl(0.07, 0.4, WHITE, 0, 2.05, -0.1, { seg: 6 });
  }
}

/**
 * Paladin (0-3): a heavy knight in a white tabard with a gold cross, a heavy maul over his
 * shoulder (the two-handed smash: see POLES in visuals.js).
 * Lv 0 no helmet, a mail shirt and a breastplate. Lv 1 Aura of Faith: an open helm, pauldrons,
 * gauntlets, greaves and gold bands on the maul. Lv 2 Holy Sanctuary: a great helm, a white cape,
 * a gorget and glowing runes on the maul. Lv 3 Heroism: armoured head to foot, only glowing eyes
 * show, gold trim and a bigger glowing maul.
 */
export function makePaladin(level) {
  const key = `paladin${level}`;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: MAIL, pants: level >= 2 ? PLATE_DK : 0x5d4037, arms: level >= 1 ? PLATE_DK : MAIL, face: level >= 2 ? 'none' : 'stern' });
  const holy = glowMat(h, 0xffe082, level >= 3 ? 1.1 : 0.8);
  const eyes = glowMat(h, 0xfff59d, 1.3);
  const hd = wear(h, h.head, `${key}:head`);
  paladinHead(hd, level, eyes);
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  // mail shirt under a breastplate
  t.box(2.16, 1.9, 1.16, MAIL, 0, 0.02, 0, { r: 0.1 });
  t.box(2.22, 0.5, 1.22, MAIL, 0, -1.12, 0, { r: 0.06 });
  t.box(2.22, 1.45, 1.26, PLATE, 0, 0.3, 0, { r: 0.18 });
  t.box(0.1, 1.3, 0.06, PLATE_DK, 0, 0.3, 0.64); // ridge
  // the white tabard with a gold cross, hanging below the belt
  t.box(1.1, 2.45, 0.05, WHITE, 0, -0.55, 0.67);
  t.box(1.1, 2.45, 0.05, WHITE, 0, -0.55, -0.67);
  t.box(0.16, 0.85, 0.03, GOLD, 0, 0.2, 0.7);
  t.box(0.6, 0.16, 0.03, GOLD, 0, 0.35, 0.7);
  if (level >= 3) for (const s of [-1, 1]) t.box(0.05, 2.45, 0.06, GOLD, s * 0.55, -0.55, 0.69); // gold edging
  belt(t, LEATHER, GOLD, -0.84);
  if (level >= 1) {
    shoulderPads(t, PLATE, 0.66);
    for (const s of [-1, 1]) t.torus(0.5, 0.05, GOLD, s * 1.45, 0.8, 0, { rx: PI / 2, seg: 14 });
    // tassets over the hips
    for (const s of [-1, 1]) t.box(0.7, 0.55, 1.2, PLATE, s * 0.75, -1.15, 0, { r: 0.06, rz: s * 0.12 });
  }
  if (level >= 2) {
    cape(t, level >= 3 ? 0xeeeeee : WHITE, 3.0, { clasp: GOLD });
    t.cyl(0.78, 0.32, PLATE, 0, 1.05, 0, { seg: 18 }); // gorget
    t.torus(0.78, 0.04, GOLD, 0, 1.2, 0, { rx: PI / 2, seg: 18 });
    // a second, upper plate on each pauldron
    for (const s of [-1, 1]) t.ball(0.58, PLATE, s * 1.5, 1.12, 0, { sy: 0.45, seg: 14, rows: 8 });
  }
  if (level >= 3) {
    t.ball(0.2, holy, 0, 0.35, 0.72, { sz: 0.4, seg: 10, rows: 7 }); // a holy gem at the cross
    for (const s of [-1, 1]) t.cyl(0.12, 0.45, GOLD, s * 1.6, 1.35, 0, { r2: 0.01, seg: 6, rz: s * -0.5 }); // pauldron spikes
  }
  t.done();
  hands(h, key, null, tone(MAIL, 0.8), (a) => {
    if (level >= 1) gauntlet(a, PLATE, GOLD);
    else {
      a.box(1.05, 0.4, 1.05, LEATHER, 0, -1.82, 0, { r: 0.06 }); // leather gloves
      a.cyl(0.56, 0.5, LEATHER, 0, -1.3, 0, { seg: 12 }); // bracer
    }
    if (level >= 2) a.box(1.1, 0.7, 1.1, PLATE, 0, -0.45, 0, { r: 0.08 }); // rerebrace
    if (level >= 3) a.ball(0.3, PLATE, 0, -0.85, -0.45, { seg: 10, rows: 7 }); // elbow cop
  });
  feet(h, key, level >= 2 ? PLATE : 0x4e342e, (b) => {
    if (level >= 1) {
      b.box(1.08, 0.85, 1.1, PLATE, 0, -1.25, 0.02, { r: 0.08 }); // greave
      b.ball(0.3, PLATE, 0, -0.9, 0.5, { seg: 10, rows: 7 }); // knee cop
    }
    if (level >= 3) b.box(1.08, 0.6, 1.1, PLATE_DK, 0, -0.4, 0.02, { r: 0.08 }); // thigh plate
  });
  // the heavy maul (gun space: the handle runs down -y, the head at the far end)
  const big = [1, 1.08, 1.16, 1.28][level];
  const g = fist(h.rightArm, -1.9, big * 1.1);
  const gk = wear(h, g, `${key}:maul`);
  const hy = -2.35;
  gk.cyl(0.11, 2.55, WOOD, 0, -0.98, 0, { seg: 8 }); // haft
  for (let i = 0; i < 4; i++) gk.torus(0.12, 0.025, LEATHER, 0, 0.15 - i * 0.12, 0, { rx: PI / 2, seg: 8 }); // grip wrap
  gk.ball(0.15, level >= 1 ? GOLD : STEEL, 0, 0.3, 0, { seg: 8, rows: 5 }); // pommel
  if (level >= 1) for (const s of [-1, 1]) gk.box(0.05, 0.8, 0.12, PLATE_DK, s * 0.12, hy + 0.75, 0); // langets
  gk.box(0.92, 0.92, 1.55, level >= 3 ? PLATE : 0x8a9198, 0, hy, 0, { r: 0.08 }); // the head
  for (const s of [-1, 1]) gk.box(1.02, 1.02, 0.14, PLATE_DK, 0, hy, s * 0.76, { r: 0.04 }); // striking faces
  if (level >= 1) for (const z of [-0.35, 0.35]) gk.box(0.98, 0.98, 0.1, GOLD, 0, hy, z); // gold bands
  if (level >= 2) for (const s of [-1, 1]) {
    // glowing runes on both sides of the head
    gk.box(0.03, 0.4, 0.1, holy, s * 0.47, hy, 0);
    gk.box(0.03, 0.1, 0.32, holy, s * 0.47, hy + 0.08, 0);
  }
  if (level >= 3) for (const s of [-1, 1]) gk.box(0.7, 0.7, 0.04, holy, 0, hy, s * 0.84); // glowing striking faces
  gk.done();
  h.muzzles = [];
  muzzle(h, g, hy, 0);
  h.rightArm.rotation.set(-2.6, 0, 0.15);
  h.leftArm.rotation.set(-2.4, 0, -0.3);
  h.pose = { right: -2.6, left: -2.4, leftRecoil: 0 };
  h.swing = 2.2;
  h.melee = true;
  h.tracer = level >= 2 ? 0xffe082 : 0xffffff;
  return own(h, 0);
}

// ------------------------------------------------------------------ Cleric

const YELLOW = 0xfbc02d;
const YELLOW_DK = 0xc49000;
const CORD = 0x6d4c41; // the brown belt

/**
 * Cleric (0-3): a healer in a yellow cloak with a brown belt and a yellow halo, always praying
 * with both hands together (the arms stay as built: it never aims).
 * Lv 1 Herbal Remedies: a cape and a pouch of herbs. Lv 2 Holy Water: a fuller cloak with a hood
 * down on the shoulders, and a flask of holy water. Lv 3 Ascended Prayers: white wings and a
 * brighter double halo with rays.
 */
export function makeCleric(level) {
  const key = `cleric${level}`;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: YELLOW, pants: YELLOW_DK, arms: YELLOW, face: 'calm' });
  const halo = glowMat(h, 0xffeb3b, level >= 3 ? 1.3 : 0.8);
  const holy = glowMat(h, 0x80d8ff, 0.7);
  const wing = level >= 3 ? glowMat(h, 0xfffde7, 0.35) : null;
  const hd = wear(h, h.head, `${key}:head`);
  hair(hd, 0x5d4037);
  hd.torus(0.62, 0.07, halo, 0, 1.75, -0.1, { rx: PI / 2, seg: 24 });
  if (level >= 3) {
    hd.torus(0.82, 0.04, halo, 0, 1.75, -0.1, { rx: PI / 2, seg: 28 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      hd.box(0.05, 0.03, 0.3, halo, Math.cos(a) * 1.0, 1.75, -0.1 + Math.sin(a) * 1.0, { ry: -a + PI / 2 }); // rays
    }
  }
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  // the yellow cloak: a robe to the knees with a brown rope belt
  t.slab(2.16, 1.1, 1.16, YELLOW, 0, -1.45, 0, { bw: 1.2, bd: 1.15 });
  t.box(0.08, 2.5, 0.05, YELLOW_DK, 0, -0.75, 0.6); // front seam
  t.box(1.0, 0.25, 1.12, tone(YELLOW, 0.9), 0, 0.92, 0, { r: 0.08 }); // collar
  belt(t, CORD, 0xb08850, -0.84);
  for (const x of [-0.25, -0.1]) t.cyl(0.05, 0.7, CORD, x, -1.25, 0.58, { seg: 6 }); // belt cord ends
  for (const x of [-0.25, -0.1]) t.ball(0.08, CORD, x, -1.62, 0.58, { seg: 6, rows: 4 });
  t.box(0.12, 0.4, 0.04, GOLD, 0, 0.3, 0.52); // a small gold sun badge
  t.box(0.4, 0.12, 0.04, GOLD, 0, 0.36, 0.52);
  if (level >= 1) {
    cape(t, level >= 2 ? YELLOW : 0xffe082, level >= 2 ? 3.4 : 2.8, { clasp: GOLD });
    t.box(0.42, 0.38, 0.22, 0x7cb342, 0.75, -1.05, 0.62, { r: 0.05 }); // a pouch of herbs
    for (const x of [0.65, 0.8]) t.cyl(0.03, 0.3, 0x558b2f, x, -0.75, 0.68, { seg: 4 });
  }
  if (level >= 2) {
    // the hood lies down on the shoulders, the robe reaches the shins
    t.box(1.6, 0.45, 0.6, tone(YELLOW, 0.92), 0, 0.95, -0.55, { r: 0.18 });
    t.slab(2.3, 0.6, 1.25, YELLOW, 0, -2.2, 0, { bw: 1.15, bd: 1.12 });
    t.box(2.44, 0.06, 1.42, GOLD, 0, -2.48, 0); // gold hem
    t.cyl(0.14, 0.38, holy, -0.75, -1.1, 0.62, { seg: 10 }); // holy water flask
    t.cyl(0.07, 0.12, 0x8d6e63, -0.75, -0.86, 0.62, { seg: 6 });
  }
  if (level >= 3) {
    // white wings from the shoulder blades: long feathers fanning out, short ones over them
    for (const s of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const a = 0.55 + i * 0.32;
        const L = 2.4 - i * 0.22;
        const ax = s * 0.55;
        const ay = 0.55;
        t.box(0.32, L, 0.07, i % 2 ? 0xffffff : 0xf5f0e0, ax + s * Math.sin(a) * L / 2, ay - Math.cos(a) * L / 2, -0.85 - i * 0.02, { rz: s * a });
      }
      for (let i = 0; i < 4; i++) {
        const a = 0.7 + i * 0.4;
        const L = 1.1 - i * 0.1;
        t.box(0.36, L, 0.08, wing, s * 0.55 + s * Math.sin(a) * L / 2, 0.6 - Math.cos(a) * L / 2, -0.95, { rz: s * a });
      }
    }
  }
  t.done();
  // wide sleeves with brown cuffs; the hands meet in front of the chest
  hands(h, key, null, tone(YELLOW, 0.85), (a) => {
    a.cyl(0.6, 0.45, YELLOW, 0, -1.3, 0, { seg: 12, r2: level >= 2 ? 0.72 : 0.64 });
    a.torus(0.62, 0.05, CORD, 0, -1.08, 0, { rx: PI / 2, seg: 12 });
  });
  feet(h, key, 0x795548);
  h.rightArm.rotation.set(-1.0, 0, 0.58);
  h.leftArm.rotation.set(-1.0, 0, -0.58);
  keepArms(h);
  h.pose = { right: -1.0, left: -1.0, leftRecoil: 0 };
  // a string of prayer beads hanging from the clasped hands
  const g = fist(h.rightArm, -1.9, 1.0);
  const bk = wear(h, g, `${key}:beads`);
  for (let i = 0; i < 7; i++) bk.ball(0.07, i === 6 ? GOLD : CORD, 0.45 + Math.sin(i * 0.5) * 0.08, -0.15 - i * 0.12, 0.1, { seg: 6, rows: 4 });
  bk.done();
  h.muzzles = [];
  muzzle(h, g, -0.2, 0, 0.45);
  h.tracer = 0xffeb3b;
  return own(h, 0);
}

export const MODELS = {
  rocketBattery: makeRocketBattery,
  madAlchemist: makeMadAlchemist,
  paladin: makePaladin,
  cleric: makeCleric,
};
