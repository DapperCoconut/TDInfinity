// Tower models, batch 41 (built with the vehicle kit in ../vehicles.js).
// In here: TimeBender (alternate Time Dilator: an old time wizard with a long beard and a staff
// with a time orb, stopwatches flashing round him), Siphoner (alternate Necromancer: a hooded dark
// mage with a bat-winged staff), and four barracks with their troops: Berserker (a war camp; a
// mohawked fighter with two war axes, covered in blood), Dreamknight (a dark rune shrine that
// fires the Eldritch Blast; knights in dark purple armor with blue runes), Knight (a small castle
// with torches and a blue flag; knights in steel with a blue-feathered helmet and a zweihander) and
// Golem (a rocky cave; a giant rock creature with a rock hammer and a steel chest plate).
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.
// SUMMONS maps unit models to builders; ./summons.js joins it with the other summons.

import * as THREE from 'three';
import { glowMat, kit, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { makeThing } from './bits.js';
import { GOLD, INK, LEATHER, WOOD, band, belt, dome, fist, hair, muzzle, own, wear } from './people1.js';
import { feet, hands, hood } from './people5.js';
import { cape, gauntlet } from './people18.js';
import { sword } from './people24.js';

const PI = Math.PI;
const STONE = 0x9e9a92;
const STONE_DK = 0x7d7970;

/** One unit made from a humanoid body, scaled like the other summons. */
function unitOf(h, scale, height) {
  const u = makeThing();
  u.wheels = [];
  u.soldiers = [];
  h.root.scale.setScalar(scale);
  u.body.add(h.root);
  u.mats.push(...h.mats);
  u.soldiers.push(h);
  u.muzzles.push(h.muzzles[0]);
  u.height = height;
  u.tracer = h.tracer;
  u.melee = true;
  return u;
}

/** A sword in the right fist, held out in front; the muzzle sits at its tip. */
function holdSword(h, key, bl, bw, blade, o) {
  const g = fist(h.rightArm, -1.9, 1.0);
  g.rotation.x = -0.5;
  const k = wear(h, g, `${key}:blade`);
  const tip = sword(k, bl, bw, blade, o);
  k.done();
  h.muzzles = [];
  muzzle(h, g, tip, 0);
  h.rightArm.rotation.set(-PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-0.5, 0, -0.15);
  h.pose = { right: -PI / 2, left: -0.5, leftRecoil: 0 };
  h.swing = 1.8;
  h.melee = true;
}

/** A grassy (or dirt) ground plate for a building tower. */
function ground(k, col, w = 4.4) {
  k.slab(w, 0.3, w, col, 0, 0.15, 0, { tw: 0.97, td: 0.97 });
}

/** A static building: muzzle point at (x, y, z) for towers that fire from it. */
function buildingMuzzle(u, x, y, z) {
  const m = new THREE.Object3D();
  m.position.set(x, y, z);
  u.body.add(m);
  u.muzzles.push(m);
}

/** A long robe over the legs, flaring out to the hem (torso space). */
function robe(t, col, len, flare, hem) {
  t.slab(2.16, 1.1, 1.16, col, 0, -1.45, 0, { bw: 1.15, bd: 1.12 });
  t.slab(2.4, len, 1.3, col, 0, -2.0 - len / 2, 0, { bw: flare, bd: flare });
  if (hem != null) t.box(2.4 * flare + 0.08, 0.08, 1.3 * flare + 0.08, hem, 0, -2.0 - len + 0.04, 0);
}

// ------------------------------------------------------------------ TimeBender

const TB_ROBE = 0x283593;
const TB_TRIM = 0xb0bec5;
const TB_GLOW = 0xb388ff;

/** A small stopwatch (any space): a gold case, a white face with two hands, a crown on top. */
function stopwatch(k, x, y, z, s, ry, face) {
  k.cyl(0.3 * s, 0.1 * s, GOLD, x, y, z, { axis: 'z', seg: 16, ry });
  k.cyl(0.25 * s, 0.11 * s, face, x, y, z, { axis: 'z', seg: 16, ry });
  k.cyl(0.06 * s, 0.12 * s, GOLD, x, y + 0.34 * s, z, { seg: 8 });
  k.box(0.02 * s, 0.18 * s, 0.13 * s, INK, x, y + 0.07 * s, z, { ry });
  k.box(0.12 * s, 0.02 * s, 0.13 * s, INK, x + 0.05 * s, y, z, { ry });
}

/**
 * TimeBender (0-4): an old man with silver-white hair and a beard down to his chest, glowing eyes,
 * a deep blue robe with silver trim, holding a staff topped with a glowing time orb in a gold
 * ring. Stopwatches flash round him: one more each tier. Lv 3 a starry cape. Lv 4 the rift:
 * a glowing ring round the orb and a time circle under his feet.
 */
export function makeTimeBender(level) {
  const key = `timeBender${level}`;
  const h = makeHumanoid({ skin: 0xe8c39e, shirt: TB_ROBE, pants: TB_ROBE, arms: TB_ROBE, face: 'none' });
  const glow = glowMat(h, TB_GLOW, 0.9);
  const face = glowMat(h, 0xfffde7, 0.4);
  const hd = wear(h, h.head, `${key}:head`);
  hair(hd, 0xeceff1, { h: 0.5 });
  for (const x of [-0.25, 0.25]) {
    hd.box(0.22, 0.1, 0.06, glow, x, 0.72, 0.61); // glowing eyes
    hd.box(0.28, 0.08, 0.1, 0xeceff1, x, 0.86, 0.6, { rz: x > 0 ? -0.15 : 0.15 }); // bushy brows
  }
  hd.box(0.18, 0.28, 0.16, tone(0xe8c39e, 0.9), 0, 0.5, 0.64); // nose
  hd.box(0.9, 0.2, 0.2, 0xeceff1, 0, 0.36, 0.6, { r: 0.06 }); // moustache
  hd.slab(1.0, 1.2, 0.4, 0xeceff1, 0, -0.25, 0.55, { bw: 0.35, bd: 0.6 }); // long beard, down to the torso
  for (const s of [-1, 1]) band(hd, 0.66, 0.12, 0.9, 1.0, 0xeceff1, 0.5, { ry: s * 1.7 }); // long hair at the sides
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  t.box(2.18, 1.95, 1.18, TB_ROBE, 0, 0.05, 0, { r: 0.12 });
  t.slab(0.9, 1.5, 0.4, 0xeceff1, 0, 0.0, 0.62, { bw: 0.3, bd: 0.5 }); // the beard falling on his chest
  t.box(0.12, 1.9, 0.06, TB_TRIM, -0.55, 0.05, 0.6); // silver trim down the front
  t.box(0.12, 1.9, 0.06, TB_TRIM, 0.55, 0.05, 0.6);
  belt(t, 0x5c6bc0, GOLD, -0.84);
  robe(t, TB_ROBE, 1.6, 1.25, TB_TRIM);
  if (level >= 3) {
    cape(t, 0x1a237e, 3.4, { clasp: GOLD });
    for (let i = 0; i < 6; i++) t.box(0.08, 0.08, 0.02, face, -0.7 + (i % 3) * 0.7, 0.3 - Math.floor(i / 3) * 1.1, -0.82); // stars on it
  }
  t.done();
  hands(h, key, 0xe8c39e, TB_TRIM);
  feet(h, key, 0x3e2723);
  // the staff, standing up in the right hand, with the time orb on top
  h.muzzles = [];
  h.rightArm.rotation.set(-0.35, 0, -0.18);
  h.leftArm.rotation.set(-0.9, 0, 0.35); // the free hand raised, bending time
  const g = fist(h.rightArm, -1.9, 1.0);
  g.rotation.set(0.35, 0, 0.18);
  const sk = wear(h, g, `${key}:staff`);
  sk.cyl(0.09, 4.6, WOOD, 0, 0.2, 0, { seg: 8 });
  for (const y of [-1.2, 0.4, 1.6]) sk.torus(0.11, 0.03, GOLD, 0, y, 0, { rx: PI / 2, seg: 10 });
  const top = 2.9;
  sk.torus(0.42, 0.05, GOLD, 0, top, 0, { seg: 20 }); // gold ring round the orb
  sk.ball(0.3, glow, 0, top, 0, { seg: 14, rows: 10 }); // the time orb
  for (let i = 0; i < 4; i++) sk.box(0.04, 0.16, 0.04, GOLD, Math.cos(i * PI / 2) * 0.42, top + Math.sin(i * PI / 2) * 0.42, 0, { rz: i * PI / 2 }); // hour marks
  if (level >= 4) sk.torus(0.62, 0.04, glow, 0, top, 0, { rx: PI / 2, seg: 24 }); // the rift ring
  sk.done();
  muzzle(h, g, top, 0);
  h.pose = { right: -0.35, left: -0.9, leftRecoil: 0 };
  // stopwatches floating round him, and a time circle on the ground at Lv 4
  const r = wear(h, h.root, `${key}:watches`);
  const n = 2 + level;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2 + 0.4;
    stopwatch(r, Math.cos(a) * 2.1, 3.0 + (i % 3) * 0.9, Math.sin(a) * 2.1, 1.1, -a, face);
  }
  if (level >= 4) {
    r.torus(2.3, 0.05, glow, 0, 0.08, 0, { rx: PI / 2, seg: 36 });
    for (let i = 0; i < 12; i++) r.box(0.08, 0.04, 0.35, glow, Math.cos(i * PI / 6) * 2.05, 0.08, Math.sin(i * PI / 6) * 2.05, { ry: -i * PI / 6 }); // clock marks
  }
  r.done();
  h.tracer = TB_GLOW;
  return own(h, 0);
}

// ------------------------------------------------------------------ Siphoner

const SI_ROBE = 0x1c1424;
const BLOOD = 0xb71c1c;

/**
 * Siphoner (0-4): a hooded dark mage in a black-purple robe, holding a staff topped with bat wings
 * round a red orb. Lv 1 a blood-red sash. Lv 2 red runes on the robe. Lv 3 a tattered cape and
 * shoulder skulls. Lv 4 red orbs of stolen life circling him.
 */
export function makeSiphoner(level) {
  const key = `siphoner${level}`;
  const h = makeHumanoid({ skin: 0xbdb0a8, shirt: SI_ROBE, pants: SI_ROBE, arms: SI_ROBE, face: 'hoodPurple' });
  const red = glowMat(h, 0xff1744, 0.6 + level * 0.1);
  const hd = wear(h, h.head, `${key}:head`);
  hood(hd, 0x2a1f33);
  for (const x of [-0.24, 0.24]) hd.box(0.18, 0.08, 0.06, red, x, 0.68, 0.62); // red eyes in the hood
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  t.box(2.18, 1.95, 1.18, SI_ROBE, 0, 0.05, 0, { r: 0.12 });
  robe(t, SI_ROBE, 1.5, 1.2, 0x4a1020);
  belt(t, INK, BLOOD, -0.84);
  if (level >= 1) t.box(0.3, 2.3, 0.08, BLOOD, 0.2, 0.0, 0.62, { rz: 0.6 }); // a blood-red sash
  if (level >= 2) for (let i = 0; i < 3; i++) t.box(0.12, 0.3, 0.04, red, -0.6, 0.6 - i * 0.45, 0.61, { rz: i * 0.7 }); // runes
  if (level >= 3) {
    cape(t, 0x2a1f33, 3.4, { clasp: BLOOD, tatter: true });
    for (const s of [-1, 1]) t.ball(0.32, 0xe0d8c8, s * 1.4, 1.1, 0.1, { sy: 0.9, seg: 10, rows: 7 }); // shoulder skulls
  }
  t.done();
  hands(h, key, 0xbdb0a8, 0x2a1f33);
  feet(h, key, INK);
  h.muzzles = [];
  h.rightArm.rotation.set(-0.35, 0, -0.18);
  h.leftArm.rotation.set(-PI / 2, 0, 0.3); // the siphoning hand reaches out
  const g = fist(h.rightArm, -1.9, 1.0);
  g.rotation.set(0.35, 0, 0.18);
  const sk = wear(h, g, `${key}:staff`);
  sk.cyl(0.09, 4.4, 0x2b1d1d, 0, 0.1, 0, { seg: 8 });
  const top = 2.7;
  sk.ball(0.26, red, 0, top, 0, { seg: 12, rows: 9 }); // the red orb
  for (const s of [-1, 1]) {
    // bat wings either side of it: a bony arm and a membrane
    sk.tube([[s * 0.2, top - 0.1, 0], [s * 0.7, top + 0.4, 0], [s * 1.1, top + 0.1, 0]], 0.04, INK, { seg: 8, sides: 5 });
    sk.prism([[0, 0], [s * 0.9, 0.5], [s * 1.0, 0.0], [s * 0.7, -0.15], [s * 0.4, -0.05]], 0.03, 0x3b0d16, s * 0.15, top - 0.05, 0, {});
  }
  sk.cyl(0.12, 0.3, INK, 0, top - 0.35, 0, { r2: 0.05, seg: 8 });
  sk.done();
  muzzle(h, g, top, 0);
  h.pose = { right: -0.35, left: -PI / 2, leftRecoil: 0 };
  if (level >= 4) {
    const r = wear(h, h.root, `${key}:orbs`);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2;
      r.ball(0.22, red, Math.cos(a) * 1.9, 3.4 + (i % 2) * 0.7, Math.sin(a) * 1.9, { seg: 10, rows: 7 });
    }
    r.done();
  }
  h.tracer = 0xff1744;
  return own(h, 0);
}

// ------------------------------------------------------------------ Berserker

const SKIN_B = 0xd9a066;
const FUR = 0x6d4c41;
const IRON = 0x5b6168;

/** A war axe in a fist (fist space: -y is out along the arm, +z up when the arm is held out). */
function axe(k, len, head, glowEdge) {
  k.cyl(0.08, len, WOOD, 0, -len / 2 + 0.3, 0, { seg: 7 });
  for (let i = 0; i < 3; i++) k.torus(0.09, 0.025, LEATHER, 0, 0.1 - i * 0.14, 0, { rx: PI / 2, seg: 8 });
  const y = -len + 0.45;
  k.prism([[0, 0.25], [0.65, 0.5], [0.75, 0], [0.65, -0.5], [0, -0.25]], 0.08, head, 0, y, 0.05, { ry: -PI / 2 }); // the blade
  k.box(0.1, 0.35, 0.03, BLOOD, 0, y, 0.72); // blood on the edge
  if (glowEdge) k.box(0.1, 0.9, 0.04, glowEdge, 0, y, 0.8);
  k.cyl(0.12, 0.2, head, 0, y, -0.1, { r2: 0.02, axis: 'z', rx: PI, seg: 6 }); // back spike
  return y;
}

/**
 * A Berserker (0-3): bare skin with war paint and blood splashes, a tall red mohawk, a fur
 * loincloth and a war axe in each hand. Little armor at Lv 0; each tier adds more: Lv 1 leather
 * bracers and a fur mantle, Lv 2 an iron shoulder plate and studded belt, Lv 3 a horned half-helm
 * and an iron chest harness, his axes glowing red.
 */
function makeBerserkerBody(level, key = `berserker${level}`) {
  const h = makeHumanoid({ skin: SKIN_B, shirt: SKIN_B, pants: FUR, arms: SKIN_B, face: 'warpaint' });
  const hd = wear(h, h.head, `${key}:head`);
  hd.box(0.22, 0.55, 1.15, BLOOD, 0, 1.4, -0.05, { r: 0.08 }); // tall mohawk
  hd.box(0.6, 0.12, 0.05, BLOOD, 0.25, 0.55, 0.61, { rz: 0.4 }); // blood on his cheek
  if (level >= 3) {
    dome(hd, 0.72, 0.4, IRON, 0, 0.92, 0, { seg: 16 }); // half-helm round the mohawk
    for (const s of [-1, 1]) hd.tube([[s * 0.6, 1.05, 0], [s * 1.0, 1.4, -0.05], [s * 0.95, 1.85, 0.1]], 0.09, 0xe8dcc0, { seg: 8, sides: 6 }); // horns
  }
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  for (const [x, y] of [[-0.5, 0.5], [0.4, -0.1], [-0.1, -0.5], [0.6, 0.6]]) t.box(0.35, 0.25, 0.03, BLOOD, x, y, 0.6, { rz: x }); // blood splashes
  for (let i = 0; i < 3; i++) t.box(0.12, 0.6, 0.03, 0x1565c0, -0.6 + i * 0.12, 0.3, 0.59, { rz: 0.2 }); // blue war paint
  belt(t, LEATHER, level >= 2 ? IRON : 0x8d6e63, -0.84);
  t.box(1.6, 0.9, 0.2, FUR, 0, -1.3, 0.55, { r: 0.06 }); // fur loincloth
  if (level >= 1) t.box(2.6, 0.45, 1.4, FUR, 0, 1.0, -0.05, { r: 0.18 }); // fur mantle
  if (level >= 2) t.slab(1.1, 0.4, 1.2, IRON, -1.45, 1.1, 0, { tw: 0.75, td: 0.8, r: 0.05 }); // an iron shoulder plate
  if (level >= 3) {
    for (const s of [-1, 1]) t.box(0.22, 2.3, 0.08, LEATHER, s * 0.35, 0.1, 0.62, { rz: s * 0.5 }); // a crossed harness
    t.cyl(0.32, 0.1, IRON, 0, 0.15, 0.66, { axis: 'z', seg: 14 }); // iron disc where the straps cross
  }
  t.done();
  hands(h, key, null, level >= 1 ? LEATHER : SKIN_B, (a) => {
    if (level >= 1) a.cyl(0.57, 0.7, LEATHER, 0, -1.2, 0, { seg: 10 }); // leather bracers
  });
  feet(h, key, FUR, (b) => {
    if (level >= 2) b.box(1.1, 0.6, 1.12, LEATHER, 0, -1.0, 0.02, { r: 0.06 });
  });
  const edge = level >= 3 ? glowMat(h, 0xff1744, 0.8) : null;
  h.muzzles = [];
  const gr = fist(h.rightArm, -1.9, 1.0);
  gr.rotation.x = -0.4;
  const rk = wear(h, gr, `${key}:axeR`);
  const tip = axe(rk, 2.4 + level * 0.15, IRON, edge);
  rk.done();
  muzzle(h, gr, tip, 0.4);
  const gl = fist(h.leftArm, -1.9, 1.0);
  gl.rotation.x = -0.4;
  const lk = wear(h, gl, `${key}:axeL`);
  axe(lk, 2.4 + level * 0.15, IRON, edge);
  lk.done();
  h.rightArm.rotation.set(-PI / 2 - 0.3, 0, 0.15);
  h.leftArm.rotation.set(-PI / 2 + 0.3, 0, -0.15);
  h.pose = { right: -PI / 2 - 0.3, left: -PI / 2 + 0.3, leftRecoil: 0 };
  h.swing = 1.8;
  h.melee = true;
  h.tracer = 0xff5252;
  return own(h, 0);
}

/**
 * Berserker (0-3): the war camp: a hide tent on poles, a fire pit, an axe stuck in a bloody stump
 * and a rack of skulls. Each tier adds trophies: Lv 1 a war banner, Lv 2 a second tent, Lv 3 a
 * big horned skull over the tent and burning braziers.
 */
export function makeBerserkerCamp(level) {
  const u = makeThing();
  const k = kit(u, u.body, `berserkerCamp${level}`);
  const fire = glowMat(u, 0xff6d00, 0.9);
  ground(k, 0x8d7b5a);
  // the tent: a hide cone on poles
  k.cyl(1.4, 2.6, 0x9c7a54, -0.4, 1.6, -0.5, { r2: 0.1, seg: 8 });
  for (let i = 0; i < 4; i++) k.cyl(0.05, 0.7, WOOD, -0.4 + Math.cos(i * 1.6) * 0.15, 3.1, -0.5 + Math.sin(i * 1.6) * 0.15, { seg: 5, rz: (i - 1.5) * 0.25 }); // pole ends
  k.prism([[0, 0], [0.7, 0], [0.35, 1.3]], 0.05, INK, -0.4, 0.3, 0.75, {}); // the dark door
  for (const [x, y] of [[-1.2, 1.2], [0.3, 1.6]]) k.box(0.3, 0.25, 0.05, BLOOD, x, y, 0.55, { ry: x * 0.5 }); // blood on the hide
  // a fire pit of stones
  for (let i = 0; i < 7; i++) k.ball(0.18, STONE_DK, 1.3 + Math.cos(i * 0.9) * 0.45, 0.4, 1.2 + Math.sin(i * 0.9) * 0.45, { seg: 6, rows: 4 });
  k.cyl(0.25, 0.5, fire, 1.3, 0.6, 1.2, { r2: 0.02, seg: 6 });
  // a stump with an axe stuck in it
  k.cyl(0.4, 0.6, WOOD, 1.4, 0.6, -1.2, { seg: 10 });
  k.box(0.5, 0.05, 0.4, BLOOD, 1.4, 0.92, -1.2);
  k.cyl(0.06, 1.2, WOOD, 1.4, 1.4, -1.2, { seg: 6, rz: 0.4 });
  k.prism([[0, 0.2], [0.5, 0.35], [0.55, 0], [0.5, -0.35], [0, -0.2]], 0.06, IRON, 1.25, 0.95, -1.2, { rz: -PI / 2 + 0.4 });
  if (level >= 1) {
    // a war banner: red with a black axe
    k.cyl(0.05, 3.0, WOOD, -1.8, 1.8, 1.4, { seg: 6 });
    k.slab(0.8, 1.2, 0.04, BLOOD, -1.8, 2.6, 1.4, { bw: 0.6 });
    k.box(0.08, 0.6, 0.05, INK, -1.8, 2.6, 1.43, { rz: 0.5 });
  }
  if (level >= 2) k.cyl(0.9, 1.7, 0x8a6a46, 1.2, 1.15, -0.1, { r2: 0.08, seg: 7 }); // a second tent
  if (level >= 3) {
    // a big horned skull over the door, and braziers
    k.ball(0.35, 0xe8dcc0, -0.4, 2.4, 0.45, { sy: 0.85, seg: 10, rows: 7 });
    for (const s of [-1, 1]) k.tube([[-0.4 + s * 0.3, 2.5, 0.45], [-0.4 + s * 0.8, 2.8, 0.4], [-0.4 + s * 0.9, 3.3, 0.5]], 0.07, 0xe8dcc0, { seg: 8, sides: 6 });
    for (const x of [-1.7, 1.8]) {
      k.cyl(0.08, 1.2, IRON, x, 0.9, -1.8, { seg: 6 });
      k.cyl(0.3, 0.25, IRON, x, 1.6, -1.8, { r2: 0.2, seg: 8 });
      k.cyl(0.2, 0.4, fire, x, 1.85, -1.8, { r2: 0.02, seg: 6 });
    }
  }
  k.done();
  u.static = true;
  return u;
}

// ------------------------------------------------------------------ Dreamknight

const DK_ARMOR = 0x2e1a47;
const DK_DARK = 0x1a0f2b;
const DK_RUNE = 0x40c4ff;

/**
 * A Dreamknight (0-3): a closed helm and plate armor in dark purple, blue runes glowing on the
 * chest, helm and gauntlets, a dark cape and a sword with a blue glowing blade. More runes each
 * tier; Lv 2 spiked pauldrons; Lv 3 a crest of blue flame on the helm.
 */
function makeDreamknightBody(level, key = `dreamknight${level}`) {
  const h = makeHumanoid({ skin: 0xd7b49e, shirt: DK_ARMOR, pants: DK_DARK, arms: DK_ARMOR, face: 'helm' });
  const rune = glowMat(h, DK_RUNE, 0.6 + level * 0.12);
  const hd = wear(h, h.head, `${key}:head`);
  hd.cyl(0.72, 1.3, DK_ARMOR, 0, 0.6, 0, { seg: 20 });
  dome(hd, 0.74, 0.4, DK_ARMOR, 0, 1.24, 0, { seg: 20 });
  band(hd, 0.735, 0.04, 0.1, 1.6, rune, 0.72); // glowing eye slit
  hd.box(0.1, 0.45, 0.05, rune, 0, 0.3, 0.73); // a rune down the face
  if (level >= 3) for (let i = 0; i < 4; i++) hd.cyl(0.12 - i * 0.02, 0.4, rune, 0, 1.6 + i * 0.12, -0.2 - i * 0.18, { r2: 0.01, seg: 6, rx: -0.6 }); // blue flame crest
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  cape(t, DK_DARK, 3.2, { clasp: rune });
  t.box(2.22, 1.9, 1.24, DK_ARMOR, 0, 0.1, 0, { r: 0.14 });
  t.slab(0.2, 1.2, 0.1, tone(DK_ARMOR, 1.3), 0, 0.35, 0.64, { tw: 0.6 });
  t.torus(0.3, 0.035, rune, 0, 0.45, 0.65, { seg: 16 }); // a rune circle on the chest
  for (let i = 0; i <= level; i++) t.box(0.06, 0.35, 0.03, rune, -0.7 + i * 0.47, -0.4, 0.64, { rz: (i % 2 ? 1 : -1) * 0.4 });
  belt(t, INK, DK_RUNE, -0.84);
  for (const s of [-1, 1]) {
    t.ball(0.72, DK_ARMOR, s * 1.45, 0.82, 0, { sy: 0.62, seg: 14, rows: 8 });
    if (level >= 2) for (let i = 0; i < 3; i++) t.cyl(0.1, 0.45, DK_DARK, s * (1.25 + i * 0.22), 1.25, 0, { r2: 0.01, seg: 5, rz: -s * 0.3 }); // spikes
  }
  t.done();
  hands(h, key, null, DK_ARMOR, (a) => {
    gauntlet(a, DK_ARMOR, DK_DARK);
    a.box(0.05, 0.3, 0.03, rune, 0, -1.25, 0.56);
  });
  feet(h, key, DK_DARK, (b) => b.box(1.1, 0.75, 1.12, DK_ARMOR, 0, -1.0, 0.02, { r: 0.08 }));
  holdSword(h, key, 2.2, 0.3, DK_RUNE, { guard: 0.9, grip: DK_DARK, metal: 0x4527a0, gem: DK_RUNE, segs: [rune, glowMat(h, 0x80d8ff, 0.7), rune] });
  h.tracer = DK_RUNE;
  return own(h, 0);
}

/**
 * Dreamknight (0-3): the barracks, a shrine of dark purple stone: a stepped base, two pillars and
 * a tall obelisk with a floating blue rune crystal that fires the Eldritch Blast. Lv 1 rune stones
 * round it. Lv 2 an arch between the pillars and a second ring on the crystal. Lv 3 taller, with
 * blue flames on the pillars.
 */
export function makeDreamknightShrine(level) {
  const u = makeThing();
  const k = kit(u, u.body, `dreamknightShrine${level}`);
  const rune = glowMat(u, DK_RUNE, 0.7 + level * 0.1);
  ground(k, 0x3b3550);
  k.box(3.4, 0.4, 3.4, 0x4a3f63, 0, 0.5, 0); // stepped base
  k.box(2.6, 0.4, 2.6, 0x3d3354, 0, 0.9, 0);
  const oh = [2.6, 2.8, 3.0, 3.6][level];
  k.slab(1.0, oh, 1.0, DK_ARMOR, 0, 1.1 + oh / 2, 0, { tw: 0.55, td: 0.55 }); // the obelisk
  for (let i = 0; i < 3; i++) k.box(0.06, 0.35, 0.03, rune, 0, 1.6 + i * 0.6, 0.45 - i * 0.05); // runes on it
  const cy = 1.1 + oh + 0.7;
  k.ball(0.38, rune, 0, cy, 0, { sy: 1.6, seg: 6, rows: 4 }); // the floating crystal
  k.torus(0.6, 0.04, rune, 0, cy, 0, { rx: PI / 2, seg: 20 });
  if (level >= 2) k.torus(0.75, 0.03, rune, 0, cy, 0, { rx: 0.6, seg: 20 });
  for (const s of [-1, 1]) {
    const ph = [1.8, 1.9, 2.1, 2.5][level];
    k.box(0.45, ph, 0.45, DK_DARK, s * 1.2, 1.1 + ph / 2, 0.9);
    k.box(0.6, 0.15, 0.6, 0x4a3f63, s * 1.2, 1.1 + ph + 0.07, 0.9);
    k.box(0.05, 0.4, 0.03, rune, s * 1.2, 1.6, 1.13);
    if (level >= 3) k.cyl(0.18, 0.5, rune, s * 1.2, 1.1 + ph + 0.4, 0.9, { r2: 0.01, seg: 6 }); // blue flames
  }
  if (level >= 2) k.torus(1.2, 0.12, DK_DARK, 0, 3.0 + (level >= 3 ? 0.4 : 0), 0.9, { arc: PI, seg: 16 }); // the arch
  if (level >= 1) for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4;
    k.box(0.35, 0.7, 0.2, 0x4a3f63, Math.cos(a) * 2.0, 0.65, Math.sin(a) * 2.0, { ry: -a });
    k.box(0.04, 0.25, 0.03, rune, Math.cos(a) * 2.11, 0.75, Math.sin(a) * 2.11, { ry: -a + PI / 2 });
  }
  k.done();
  buildingMuzzle(u, 0, cy, 0);
  u.static = true;
  return u;
}

// ------------------------------------------------------------------ Knight

const PLATE = 0xb8c2cc;
const PLATE_DK = 0x6b7682;
const MAIL = 0x8f979e;
const BLUE = 0x1e5bb8;
const BLUE_DK = 0x123d7d;

/**
 * A Knight (0-3): steel armor over chain mail, a helmet with blue feathers, horns on the leg
 * armor and a big two-handed zweihander with a blue grip held in both hands. Lv 1 a blue tabard.
 * Lv 2 more feathers and pauldrons with blue trim. Lv 3 a gold-trimmed helm and a longer sword.
 */
function makeKnightBody(level, key = `knight${level}`) {
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: MAIL, pants: MAIL, arms: MAIL, face: 'helm' });
  const trim = level >= 3 ? GOLD : PLATE_DK;
  const hd = wear(h, h.head, `${key}:head`);
  hd.cyl(0.72, 1.2, PLATE, 0, 0.6, 0, { seg: 20 });
  dome(hd, 0.74, 0.45, PLATE, 0, 1.2, 0, { seg: 20 });
  band(hd, 0.735, 0.03, 0.1, 1.6, INK, 0.72); // eye slit
  hd.box(0.1, 0.55, 0.05, trim, 0, 0.35, 0.73);
  hd.torus(0.73, 0.04, trim, 0, 1.1, 0, { rx: PI / 2, seg: 20 });
  const n = level >= 2 ? 5 : 3;
  for (let i = 0; i < n; i++) hd.box(0.14, 0.9, 0.14, i % 2 ? 0x90caf9 : BLUE, (i - (n - 1) / 2) * 0.13, 1.95, -0.25 - Math.abs(i - (n - 1) / 2) * 0.1, { rx: -0.5, r: 0.05 }); // blue feathers
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  t.box(2.16, 1.9, 1.16, MAIL, 0, 0.02, 0, { r: 0.1 });
  t.box(2.22, 1.35, 1.26, PLATE, 0, 0.35, 0, { r: 0.14 });
  if (level >= 1) t.box(1.1, 2.0, 0.06, BLUE, 0, -0.3, 0.65); // tabard
  t.box(2.24, 0.5, 1.22, MAIL, 0, -1.12, 0, { r: 0.06 });
  belt(t, LEATHER, trim, -0.84);
  for (const s of [-1, 1]) {
    t.ball(0.7, PLATE, s * 1.45, 0.82, 0, { sy: 0.6, seg: 14, rows: 8 });
    if (level >= 2) t.torus(0.62, 0.05, BLUE, s * 1.45, 0.7, 0, { rx: PI / 2, seg: 16 });
  }
  t.done();
  hands(h, key, null, MAIL, (a) => gauntlet(a, PLATE, trim));
  feet(h, key, PLATE_DK, (b) => {
    b.box(1.1, 0.75, 1.12, PLATE, 0, -1.0, 0.02, { r: 0.08 });
    for (const s of [-1, 1]) b.cyl(0.1, 0.4, 0xe8dcc0, s * 0.62, -1.0, 0, { r2: 0.02, rz: -s * 1.0, seg: 8 }); // horns on the leg armor
  });
  // the zweihander, both hands on the grip
  holdSword(h, key, level >= 3 ? 3.3 : 3.0, 0.32, 0xdfe6ea, { guard: 1.3, grip: BLUE_DK, metal: 0x90a4ae, gem: BLUE });
  h.leftArm.rotation.set(-PI / 2 + 0.15, 0, -0.45); // the left hand on the grip too
  h.pose = { right: -PI / 2, left: -PI / 2 + 0.15, leftRecoil: 0 };
  h.tracer = 0xeeeeee;
  return own(h, 0);
}

/** A wall torch: a bracket and a burning top (facing +z). */
function torch(k, x, y, z, fire) {
  k.box(0.08, 0.08, 0.3, INK, x, y, z + 0.1);
  k.cyl(0.06, 0.45, WOOD, x, y + 0.15, z + 0.25, { seg: 6 });
  k.cyl(0.12, 0.3, fire, x, y + 0.5, z + 0.25, { r2: 0.01, seg: 6 });
}

/**
 * Knight (0-3): a small square castle: stone walls with crenellations, a gate, torches either
 * side and a blue flag on top. Lv 1 a blue banner over the gate. Lv 2 a corner turret. Lv 3 a
 * second turret with a blue roof and a gold-topped flag.
 */
export function makeKnightCastle(level) {
  const u = makeThing();
  const k = kit(u, u.body, `knightCastle${level}`);
  const fire = glowMat(u, 0xffab40, 0.9);
  ground(k, 0x7cb342);
  const W = 2.8;
  const H = 2.4;
  k.box(W, H, W, STONE, 0, 0.3 + H / 2, -0.2);
  for (let i = 1; i < H / 0.45; i++) k.box(W + 0.02, 0.03, W + 0.02, STONE_DK, 0, 0.3 + i * 0.45, -0.2); // courses
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) {
    k.box(0.4, 0.4, 0.3, STONE, -W / 2 + 0.2 + i * 0.6, 0.3 + H + 0.2, -0.2 + s * (W / 2 - 0.15)); // crenellations front and back
    k.box(0.3, 0.4, 0.4, STONE, s * (W / 2 - 0.15), 0.3 + H + 0.2, -0.2 - W / 2 + 0.2 + i * 0.6); // and sides
  }
  // the gate
  const gz = -0.2 + W / 2;
  k.box(1.0, 1.3, 0.08, 0x6d4c41, 0, 0.95, gz);
  k.cyl(0.5, 0.08, 0x6d4c41, 0, 1.6, gz, { axis: 'z', seg: 14 });
  for (let i = 0; i < 4; i++) k.box(0.04, 1.6, 0.05, INK, -0.36 + i * 0.24, 1.05, gz + 0.05); // portcullis bars
  torch(k, -0.9, 1.5, gz, fire);
  torch(k, 0.9, 1.5, gz, fire);
  // the blue flag on top
  const top = 0.3 + H + 0.4;
  k.cyl(0.05, 1.8, 0x5d4037, 0, top + 0.9, -0.2, { seg: 6 });
  k.ball(0.08, level >= 3 ? GOLD : 0x9e9e9e, 0, top + 1.82, -0.2, { seg: 8, rows: 5 });
  k.prism([[0, 0], [1.0, 0.25], [0, 0.6]], 0.03, BLUE, 0, top + 1.15, -0.2, { ry: PI / 2 });
  if (level >= 1) k.slab(0.7, 1.1, 0.04, BLUE, 0, 0.3 + H - 0.55, gz + 0.03, { bw: 0.7 }); // banner over the gate
  const turret = (x, z, roof) => {
    k.cyl(0.6, H + 1.0, STONE, x, 0.3 + (H + 1.0) / 2, z, { seg: 16 });
    k.cyl(0.75, 0.2, STONE_DK, x, 0.3 + H + 1.1, z, { seg: 16 });
    if (roof) k.cyl(0.8, 1.2, BLUE, x, 0.3 + H + 1.8, z, { r2: 0.02, seg: 16 });
    else for (let i = 0; i < 6; i++) k.box(0.25, 0.3, 0.25, STONE, x + Math.cos(i * PI / 3) * 0.6, 0.3 + H + 1.35, z + Math.sin(i * PI / 3) * 0.6);
    k.box(0.08, 0.4, 0.06, INK, x, 1.8, z + 0.6);
  };
  if (level >= 2) turret(W / 2, -0.2 - W / 2, level >= 3);
  if (level >= 3) turret(-W / 2, -0.2 - W / 2, true);
  k.done();
  u.static = true;
  return u;
}

// ------------------------------------------------------------------ Golem

const ROCK = 0x7a746c;
const ROCK_DK = 0x5a554e;
const MOSS = 0x5b7f2e;

/**
 * A Golem (0-3): a giant made of rock blocks, a steel chest plate held on with straps, glowing
 * orange eyes and cracks, and a huge rock hammer on a stone handle. Lv 1 moss on his shoulders.
 * Lv 2 steel bands on his arms. Lv 3 crystals growing from his back and a bigger hammer.
 */
function makeGolemBody(level, key = `golem${level}`) {
  const h = makeHumanoid({ skin: ROCK, shirt: ROCK, pants: ROCK_DK, arms: ROCK, face: 'none' });
  const ember = glowMat(h, 0xffab40, 0.8);
  const hd = wear(h, h.head, `${key}:head`);
  hd.box(1.3, 1.1, 1.25, ROCK, 0, 0.55, 0.05, { r: 0.15 });
  hd.box(1.35, 0.3, 0.5, ROCK_DK, 0, 0.9, 0.45, { r: 0.08 }); // heavy brow
  for (const x of [-0.3, 0.3]) hd.box(0.24, 0.12, 0.06, ember, x, 0.68, 0.69); // glowing eyes
  hd.box(0.5, 0.06, 0.05, ember, 0, 0.3, 0.68); // a crack of a mouth
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  t.box(2.5, 2.1, 1.5, ROCK, 0, 0.1, 0, { r: 0.2 });
  for (const [x, y] of [[-0.8, -0.6], [0.7, 0.8], [-0.2, -1.0]]) t.box(0.5, 0.06, 0.05, ember, x, y, 0.76, { rz: x }); // glowing cracks
  t.box(1.9, 1.4, 0.15, 0x90a4ae, 0, 0.35, 0.78, { r: 0.08 }); // steel chest plate
  for (const [x, y] of [[-0.8, 0.95], [0.8, 0.95], [-0.8, -0.25], [0.8, -0.25]]) t.ball(0.07, 0x546e7a, x, y, 0.86, { seg: 6, rows: 4 }); // rivets
  for (const s of [-1, 1]) t.box(0.18, 2.2, 1.56, LEATHER, s * 0.7, 0.2, 0, { rz: s * 0.15 }); // straps over the shoulders
  for (const s of [-1, 1]) {
    t.ball(0.85, ROCK_DK, s * 1.6, 0.9, 0, { sy: 0.7, seg: 8, rows: 6 }); // boulder shoulders
    if (level >= 1) t.ball(0.5, MOSS, s * 1.6, 1.35, 0, { sy: 0.35, seg: 8, rows: 5 });
  }
  if (level >= 3) for (let i = 0; i < 4; i++) t.cyl(0.18, 0.9, glowMat(h, 0x80deea, 0.7), -0.6 + i * 0.4, 0.8, -0.8, { r2: 0.01, seg: 5, rx: -0.5 - (i % 2) * 0.3 }); // crystals
  t.done();
  hands(h, key, null, ROCK, (a) => {
    a.box(1.3, 0.9, 1.3, ROCK_DK, 0, -1.6, 0, { r: 0.15 }); // big rock fists
    if (level >= 2) for (const y of [-0.9, -1.2]) a.box(1.18, 0.12, 1.18, 0x90a4ae, 0, y, 0);
  });
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    b.box(1.25, 0.6, 1.4, ROCK_DK, 0, -1.7, 0.1, { r: 0.12 });
    b.done();
  }
  // the rock hammer: a stone handle and a huge rough head
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.0);
  g.rotation.x = -0.5;
  const k = wear(h, g, `${key}:hammer`);
  const len = level >= 3 ? 3.2 : 2.8;
  k.cyl(0.14, len, ROCK_DK, 0, -len / 2 + 0.3, 0, { seg: 7 });
  const s = level >= 3 ? 1.25 : 1;
  k.box(1.1 * s, 0.9 * s, 1.6 * s, ROCK, 0, -len + 0.2, 0.2, { r: 0.18 });
  k.box(1.2 * s, 0.15, 1.7 * s, 0x90a4ae, 0, -len + 0.2, 0.2); // a steel band round it
  k.done();
  muzzle(h, g, -len + 0.2, 0.2);
  h.rightArm.rotation.set(-PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-0.3, 0, -0.2);
  h.pose = { right: -PI / 2, left: -0.3, leftRecoil: 0 };
  h.swing = 1.4;
  h.melee = true;
  h.tracer = 0xbcaaa4;
  return own(h, 0);
}

/**
 * Golem (0-3): a rocky cave in a hill of boulders, glowing runes over its mouth and a pile of
 * rubble. Lv 1 a rune stone. Lv 2 a bigger hill and steel bars over the mouth. Lv 3 crystals
 * growing out of the rock.
 */
export function makeGolemCave(level) {
  const u = makeThing();
  const k = kit(u, u.body, `golemCave${level}`);
  const ember = glowMat(u, 0xffab40, 0.8);
  ground(k, 0x8d8a6e);
  const big = level >= 2 ? 1.15 : 1;
  k.ball(2.0 * big, ROCK, 0, 0.3, -0.4, { sy: 0.85, seg: 9, rows: 6 }); // the hill
  for (const [x, z, r] of [[-1.6, 0.6, 0.7], [1.5, 0.4, 0.8], [1.0, -1.6, 0.6], [-1.3, -1.5, 0.55]]) k.ball(r * big, ROCK_DK, x, 0.4, z, { sy: 0.8, seg: 7, rows: 5 }); // boulders
  k.ball(0.9, INK, 0, 0.6, 1.25 * big, { sz: 0.4, seg: 10, rows: 6 }); // the cave mouth
  for (let i = 0; i < 3; i++) k.box(0.25, 0.08, 0.05, ember, -0.4 + i * 0.4, 1.75, 1.35 * big, { rz: i - 1 }); // runes over it
  for (let i = 0; i < 6; i++) k.ball(0.18, STONE_DK, 1.2 + (i % 3) * 0.3, 0.4, 1.4 + Math.floor(i / 3) * 0.3, { seg: 5, rows: 4 }); // rubble
  if (level >= 1) {
    k.box(0.5, 1.4, 0.3, STONE, -1.7, 1.0, 1.2, { r: 0.08 });
    k.box(0.06, 0.6, 0.03, ember, -1.7, 1.1, 1.36);
  }
  if (level >= 2) for (let i = 0; i < 4; i++) k.box(0.06, 1.1, 0.06, 0x90a4ae, -0.45 + i * 0.3, 0.75, 1.45 * big); // steel bars
  if (level >= 3) {
    const crystal = glowMat(u, 0x80deea, 0.7);
    for (const [x, y, z, rz] of [[-0.8, 2.0, -0.6, 0.4], [0.5, 2.1, -0.2, -0.3], [0.1, 2.2, -1.0, 0.1], [1.4, 1.2, -1.4, -0.6]]) k.cyl(0.22, 1.1, crystal, x, y, z, { r2: 0.02, seg: 5, rz });
  }
  k.done();
  u.static = true;
  return u;
}

export const MODELS = {
  timeBender: makeTimeBender,
  siphoner: makeSiphoner,
  bloodBerserker: makeBerserkerCamp,
  dreamknight: makeDreamknightShrine,
  steelKnight: makeKnightCastle,
  stoneGolem: makeGolemCave,
};

export const SUMMONS = {};
for (let lv = 0; lv < 4; lv++) {
  SUMMONS[`berserkerUnit${lv}`] = () => unitOf(makeBerserkerBody(lv), 0.6, 3.5);
  SUMMONS[`dreamknightUnit${lv}`] = () => unitOf(makeDreamknightBody(lv), 0.65, 3.7);
  SUMMONS[`knightUnit${lv}`] = () => unitOf(makeKnightBody(lv), 0.6, 3.5);
  SUMMONS[`golemUnit${lv}`] = () => unitOf(makeGolemBody(lv), 1.0, 6);
}
