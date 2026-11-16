// Tower models, batch 38 (built with the vehicle kit in ../vehicles.js).
// In here: Grove Warden (a forest keeper in bark armour with a living staff), Gold Mine (a mine
// in a rock mound with a cart on rails), Silo (a grain silo by a small barn), Defender (a castle
// tower barracks, and its Defender units: plate over chain mail, a blue cape and a steel shield)
// and King (a royal pavilion barracks, and its King: gold-plated steel and a giant sword).
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.
// SUMMONS maps unit models to builders; ./summons.js joins it with the other summons.

import { glowMat, kit, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { makeThing } from './bits.js';
import { GOLD, INK, LEATHER, STEEL, WOOD, band, belt, dome, fist, hair, muzzle, own, pouch, wear } from './people1.js';
import { feet, hands, hood } from './people5.js';
import { cape, gauntlet } from './people18.js';
import { sword } from './people24.js';

const PI = Math.PI;

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

/** A sword in the right fist, held out in front like the Footman's; the muzzle sits at its tip. */
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

// ------------------------------------------------------------------ Grove Warden

const BARK = 0x5d4632;
const BARK_DK = 0x3e2d1f;
const MOSS = 0x5b7f2e;
const LEAF = 0x3f6b2a;
const LEAF_LT = 0x7cb342;
const RUNE = 0x76ff03;

/** A small leaf: a flat oval (any space). */
function leaf(k, x, y, z, col = LEAF_LT, o = {}) {
  k.ball(o.s ?? 0.16, col, x, y, z, { sx: 1, sy: 0.25, sz: 1.8, seg: 6, rows: 4, rx: o.rx ?? 0.3, ry: o.ry ?? 0, rz: o.rz ?? 0 });
}

/** A five-petal flower facing up (any space). */
function flower(k, x, y, z, petal, s = 1) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * PI * 2;
    k.ball(0.09 * s, petal, x + Math.cos(a) * 0.09 * s, y, z + Math.sin(a) * 0.09 * s, { sy: 0.35, seg: 6, rows: 4 });
  }
  k.ball(0.055 * s, 0xffd54f, x, y + 0.02 * s, z, { seg: 6, rows: 4 });
}

/** One antler: a curved beam with two tines (head space, s = side). */
function antler(k, s) {
  const c = 0xd7c4a3;
  k.tube([[s * 0.42, 1.25, -0.05], [s * 0.7, 1.6, -0.1], [s * 0.85, 2.0, -0.25], [s * 0.8, 2.35, -0.35]], 0.06, c, { seg: 12, sides: 6 });
  k.tube([[s * 0.68, 1.6, -0.1], [s * 0.6, 1.9, 0.12]], 0.045, c, { seg: 4, sides: 5 });
  k.tube([[s * 0.85, 2.0, -0.25], [s * 1.08, 2.25, -0.15]], 0.04, c, { seg: 4, sides: 5 });
}

/**
 * The living staff in the right fist (gun space, standing straight up: +y is up). A gnarled
 * shaft from the ground to above the head, branches curling round a seed at the top. Returns
 * the y of the seed.
 */
function livingStaff(k, level, glow) {
  const top = 2.5;
  k.tube([[0.03, -2.1, 0], [-0.04, -1.2, 0.03], [0.04, -0.2, -0.03], [-0.03, 0.9, 0.02], [0.03, 1.9, 0], [0, top, 0]], 0.1, WOOD, { seg: 24, sides: 7 });
  for (const y of [-1.5, -0.3, 1.2]) k.ball(0.13, tone(WOOD, 0.8), 0.06, y, 0.02, { seg: 7, rows: 5 }); // knots
  k.cyl(0.13, 0.5, MOSS, 0, 0.05, 0, { seg: 8 }); // moss wrap where the hand holds it
  // three branches curl up round the seed
  const sy = top + 0.35;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    k.tube([[0, top - 0.1, 0], [c * 0.32, top + 0.15, s * 0.32], [c * 0.3, sy + 0.25, s * 0.3], [c * 0.1, sy + 0.42, s * 0.1]], 0.045, WOOD, { seg: 12, sides: 5 });
    leaf(k, c * 0.36, top + 0.2, s * 0.36, LEAF_LT, { ry: -a, rz: 0.6 });
  }
  if (level >= 2) k.ball(0.22, glow, 0, sy, 0, { seg: 12, rows: 8 }); // a glowing seed
  else k.ball(0.2, 0x8d6e47, 0, sy, 0, { sy: 1.25, seg: 10, rows: 7 }); // an acorn-like seed
  if (level < 2) dome(k, 0.21, 0.12, 0x5d4037, 0, sy + 0.12, 0, { seg: 10 });
  // leaves sprouting from the shaft
  for (const [y, a] of [[1.4, 0.4], [0.8, 2.6], [-0.9, 4.4]]) leaf(k, Math.cos(a) * 0.18, y, Math.sin(a) * 0.18, LEAF, { ry: -a, rz: 0.5 });
  if (level >= 2) for (const y of [0.5, 1.0, 1.6]) k.box(0.05, 0.16, 0.2, glow, 0.09, y, 0, { rz: 0.1 }); // runes cut in the wood
  if (level >= 3) for (const [y, a, c] of [[2.1, 1.0, 0xf48fb1], [1.7, 3.5, 0xffffff], [0.3, 5.2, 0xce93d8]]) flower(k, Math.cos(a) * 0.15, y, Math.sin(a) * 0.15, c, 0.8);
  return sy;
}

/**
 * Grove Warden (0-3): a forest keeper in bark armour and a leaf hood with antlers, holding a
 * living wooden staff, on a ring of mossy roots. Lv 1 Barkskin: bark shoulder plates and bark
 * bracers. Lv 2 Nature's Grasp: glowing green runes on the armour and staff, a glowing seed.
 * Lv 3 Naturebloom: flowers on the hood, shoulders, roots and staff.
 */
export function makeGroveWarden(level) {
  const h = makeHumanoid({ skin: 0xc69c6d, shirt: BARK, pants: 0x4a3a28, arms: MOSS, face: 'soldier' });
  const key = `groveWarden${level}`;
  const glow = glowMat(h, RUNE);
  // head: hair, a leaf hood, antlers, a braided beard of moss
  const hd = wear(h, h.head, `${key}:head`);
  hair(hd, 0x6d4c41);
  hood(hd, LEAF);
  for (let i = 0; i < 9; i++) {
    const a = PI * 0.15 + (i / 8) * PI * 0.7;
    leaf(hd, Math.cos(a) * 0.82, 0.85 + Math.sin(a) * 0.55, 0.3, i % 2 ? LEAF_LT : MOSS, { rx: 1.2, rz: (a - PI / 2) * 0.8 }); // leaves round the hood's edge
  }
  for (const s of [-1, 1]) antler(hd, s);
  hd.box(0.6, 0.35, 0.18, MOSS, 0, 0.25, 0.6, { r: 0.08 }); // mossy beard
  hd.box(0.3, 0.28, 0.14, tone(MOSS, 0.8), 0, 0.02, 0.62, { r: 0.06 });
  if (level >= 3) for (const [x, y, c] of [[-0.45, 1.45, 0xf48fb1], [0.5, 1.4, 0xffffff], [0.05, 1.55, 0xce93d8]]) flower(hd, x, y, 0.35, c, 1.1);
  hd.done();
  // torso: a leaf cape, bark armour over the chest with grooves, a vine belt with a seed pouch
  const t = wear(h, h.torso, `${key}:torso`);
  cape(t, LEAF, 3.0, { clasp: 0x8d6e47, tatter: true });
  t.box(2.14, 1.7, 1.12, BARK, 0, 0.12, 0, { r: 0.12 });
  for (let i = 0; i < 7; i++) t.box(0.06, 1.5 - (i % 2) * 0.3, 0.04, BARK_DK, -0.8 + i * 0.27, 0.15, 0.57); // bark grooves
  for (let i = 0; i < 4; i++) t.ball(0.18, MOSS, -0.7 + i * 0.5, -0.65 + (i % 2) * 0.15, 0.55, { sz: 0.35, seg: 7, rows: 5 }); // moss patches
  belt(t, 0x558b2f, 0x8d6e47);
  pouch(t, 0.7, -1.0, 0.56, 0.36, 0.32, LEATHER, 0.18);
  t.box(1.9, 0.5, 1.15, tone(BARK, 0.85), 0, -1.15, 0, { r: 0.08 }); // a bark skirt over the hips
  if (level >= 1) {
    // Barkskin: thick bark shoulder plates
    for (const s of [-1, 1]) {
      t.slab(1.1, 0.4, 1.2, BARK_DK, s * 1.45, 0.95, 0, { tw: 0.7, td: 0.8, r: 0.05 });
      t.box(0.9, 0.05, 1.22, BARK, s * 1.45, 0.82, 0);
      leaf(t, s * 1.6, 1.2, 0.3, LEAF_LT, { rz: s * 0.4 });
    }
  }
  if (level >= 2) {
    // Nature's Grasp: glowing runes on the chest and the shoulder plates
    t.box(0.08, 0.7, 0.03, glow, 0, 0.35, 0.58);
    for (const s of [-1, 1]) t.box(0.06, 0.4, 0.03, glow, s * 0.22, 0.35, 0.58, { rz: s * 0.6 });
    t.torus(0.32, 0.03, glow, 0, 0.35, 0.58, { seg: 16 });
    if (level >= 1) for (const s of [-1, 1]) t.box(0.3, 0.05, 0.05, glow, s * 1.45, 1.17, 0.35);
  }
  if (level >= 3) for (const [x, y, c] of [[-1.5, 1.2, 0xffffff], [1.4, 1.22, 0xf48fb1], [-0.6, -0.84, 0xce93d8], [0.3, -0.84, 0xffffff]]) flower(t, x, y, 0.62, c, 1.2);
  t.done();
  hands(h, key, null, tone(MOSS, 0.8), (a) => {
    if (level >= 1) {
      // bark bracers
      a.cyl(0.58, 0.7, BARK_DK, 0, -1.25, 0, { seg: 10, r2: 0.62 });
      for (let i = 0; i < 4; i++) a.box(0.05, 0.6, 0.04, BARK, Math.cos(i * 1.6) * 0.6, -1.25, Math.sin(i * 1.6) * 0.6, { ry: -i * 1.6 });
      if (level >= 2) a.box(0.05, 0.4, 0.04, glow, 0, -1.25, 0.63);
    }
  });
  feet(h, key, 0x4e342e, (b) => {
    b.box(1.1, 0.5, 1.12, MOSS, 0, -1.15, 0.02, { r: 0.06 }); // moss leg wraps
    for (let i = 0; i < 3; i++) b.box(1.12, 0.05, 1.14, BARK_DK, 0, -0.98 - i * 0.16, 0.02);
  });
  // the staff, standing up in the right hand
  h.muzzles = [];
  h.rightArm.rotation.set(-0.35, 0, -0.18);
  h.leftArm.rotation.set(-0.25, 0, -0.12);
  const g = fist(h.rightArm, -1.9, 1.0);
  g.rotation.set(0.35, 0, 0.18);
  const sk = wear(h, g, `${key}:staff`);
  const top = livingStaff(sk, level, glow);
  sk.done();
  muzzle(h, g, top, 0);
  h.pose = { right: -0.35, left: -0.25, leftRecoil: 0 };
  // the ring of mossy roots he stands on
  const r = wear(h, h.root, `${key}:roots`);
  r.cyl(1.9, 0.12, 0x4e6b2a, 0, 0.06, 0, { r2: 1.75, seg: 24 }); // moss ground
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2 + 0.2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    r.tube([[c * 0.6, 0.15, s * 0.6], [c * 1.2, 0.35, s * 1.2], [c * 1.8, 0.2, s * 1.8], [c * 2.3, 0.05, s * 2.3]], 0.13 - (i % 2) * 0.03, BARK, { seg: 12, sides: 6 });
    r.ball(0.16, MOSS, c * 1.2, 0.42, s * 1.2, { sy: 0.5, seg: 7, rows: 5 });
  }
  // a little mushroom ring and a stump with moss
  r.cyl(0.5, 0.7, BARK, 1.9, 0.35, -1.3, { r2: 0.42, seg: 12 });
  r.cyl(0.42, 0.04, 0xbcaaa4, 1.9, 0.71, -1.3, { seg: 12 }); // cut top with rings
  r.torus(0.25, 0.02, 0x8d6e47, 1.9, 0.73, -1.3, { rx: PI / 2, seg: 12 });
  r.ball(0.25, MOSS, 2.1, 0.7, -1.15, { sy: 0.5, seg: 8, rows: 5 });
  for (const [x, z] of [[-1.7, 0.9], [-1.95, 0.5], [-1.5, 1.25]]) {
    r.cyl(0.05, 0.25, 0xeeeeee, x, 0.22, z, { seg: 6 });
    dome(r, 0.15, 0.12, 0xc62828, x, 0.33, z, { seg: 10 });
  }
  if (level >= 2) for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2 + 0.5;
    r.box(0.08, 0.03, 0.3, glow, Math.cos(a) * 1.5, 0.14, Math.sin(a) * 1.5, { ry: -a }); // glowing runes in the moss
  }
  if (level >= 3) for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI * 2;
    flower(r, Math.cos(a) * 1.55, 0.14, Math.sin(a) * 1.55, [0xf48fb1, 0xffffff, 0xce93d8, 0xfff176][i % 4], 1.3);
  }
  r.done();
  h.tracer = RUNE;
  return own(h, 0);
}

// ------------------------------------------------------------------ Gold Mine

const ROCK = 0x8d8478;
const ROCK_DK = 0x6d655b;
const TIMBER = 0x7a5534;

/**
 * Gold Mine (0-3): a mine tunnel dug into a rock mound, with a timber frame, a lantern, rails
 * and a mine cart. The load in the cart changes with the level: Lv 0 rocks, Lv 1 Iron Deposits
 * (rusty iron ore), Lv 2 Gold Deposits (gold nuggets, and gold veins in the rock), Lv 3 Precious
 * Gems (gems and diamonds, and glowing crystals in the rock).
 */
export function makeGoldMine(level) {
  const u = makeThing();
  const k = kit(u, u.body, `goldMine${level}`);
  const lamp = glowMat(u, 0xffb74d);
  const nug = level >= 2 ? glowMat(u, 0xffd54f, 0.35) : null;
  const gemC = level >= 3 ? glowMat(u, 0x80deea, 0.6) : null;
  ground(k, 0x8a7a55);
  // the rock mound at the back
  const rocks = [[-1.2, 1.0, -1.3, 1.2], [0.2, 1.3, -1.5, 1.4], [1.4, 0.9, -1.2, 1.1], [-1.7, 0.6, -0.4, 0.8], [1.8, 0.55, -0.3, 0.75], [0.8, 1.9, -1.8, 0.8], [-0.6, 1.9, -1.8, 0.85]];
  rocks.forEach(([x, y, z, r], i) => k.ball(r, i % 2 ? ROCK : ROCK_DK, x, y, z, { sy: 0.85, seg: 9, rows: 6, flat: true }));
  // the tunnel mouth: a dark opening with a timber frame
  const fz = -0.35;
  k.box(1.5, 1.7, 0.6, 0x15110d, 0, 1.15, fz - 0.25);
  for (const s of [-1, 1]) {
    k.box(0.28, 2.1, 0.28, TIMBER, s * 0.85, 1.35, fz, { r: 0.04 }); // posts
    k.box(0.1, 0.5, 0.1, tone(TIMBER, 0.7), s * 0.62, 2.1, fz + 0.1, { rz: s * 0.8 }); // corner braces
  }
  k.box(2.2, 0.3, 0.34, TIMBER, 0, 2.45, fz, { r: 0.04 }); // lintel
  for (const s of [-1, 1]) k.ball(0.05, INK, s * 0.85, 2.45, fz + 0.18, { seg: 5, rows: 4 }); // bolts
  k.box(1.1, 0.36, 0.06, 0xc8a26b, 0, 2.85, fz + 0.06, { r: 0.03 }); // the sign board
  k.box(0.7, 0.1, 0.02, level >= 2 ? GOLD : 0x3e2723, 0, 2.85, fz + 0.1); // its painted mark
  for (const s of [-1, 1]) k.cyl(0.02, 0.3, 0x9e9e9e, s * 0.4, 2.65, fz + 0.06, { seg: 4 });
  // the lantern hanging from the lintel
  k.cyl(0.015, 0.25, INK, 0.6, 2.18, fz + 0.3, { seg: 4 });
  k.cyl(0.13, 0.04, INK, 0.6, 2.04, fz + 0.3, { seg: 8 });
  k.cyl(0.1, 0.22, lamp, 0.6, 1.91, fz + 0.3, { seg: 8 });
  k.cyl(0.13, 0.04, INK, 0.6, 1.78, fz + 0.3, { seg: 8 });
  // rails from the tunnel out to the front
  for (let i = 0; i < 7; i++) k.box(1.2, 0.08, 0.2, 0x5d4037, 0, 0.34, fz + 0.1 + i * 0.4); // ties
  for (const s of [-1, 1]) k.box(0.07, 0.1, 2.9, 0x78909c, s * 0.38, 0.42, fz + 1.3);
  // a pickaxe leaning on the frame, and a shovel
  k.cyl(0.04, 1.5, WOOD, -1.2, 0.95, fz + 0.4, { rz: -0.3, seg: 6 });
  k.tube([[-1.75, 1.6, fz + 0.4], [-1.42, 1.72, fz + 0.4], [-1.05, 1.6, fz + 0.4]], 0.05, STEEL, { seg: 8, sides: 5 });
  k.cyl(0.035, 1.3, WOOD, 1.25, 0.9, fz + 0.4, { rz: 0.25, seg: 6 });
  k.box(0.3, 0.38, 0.04, STEEL, 1.08, 0.28, fz + 0.4, { rz: 0.25, r: 0.015 });
  // the mine cart on the rails
  const cz = 1.15;
  k.slab(1.2, 0.7, 1.45, 0x6d4c41, 0, 0.95, cz, { bw: 0.82, bd: 0.85 });
  for (const s of [-1, 1]) {
    k.box(1.24, 0.08, 0.06, 0x37474f, 0, 1.25, cz + s * 0.73); // iron bands
    k.box(1.24, 0.08, 0.06, 0x37474f, 0, 0.7, cz + s * 0.62);
    for (const zz of [-0.4, 0.4]) {
      k.cyl(0.18, 0.08, 0x37474f, s * 0.42, 0.55, cz + zz, { axis: 'x', seg: 14 }); // wheels
      k.cyl(0.06, 0.1, 0x9e9e9e, s * 0.45, 0.55, cz + zz, { axis: 'x', seg: 8 }); // hubs
    }
  }
  k.box(0.1, 0.1, 0.4, 0x37474f, 0, 0.7, cz + 0.88); // the coupling
  // what is in the cart
  const load = [[-0.3, -0.35], [0.25, -0.3], [-0.05, 0.05], [0.3, 0.3], [-0.3, 0.35], [0.0, -0.05]];
  load.forEach(([x, z], i) => {
    const y = 1.3 + (i === 2 || i === 5 ? 0.15 : 0);
    if (level === 0) k.ball(0.22, i % 2 ? ROCK : ROCK_DK, x, y, cz + z, { seg: 6, rows: 4, flat: true });
    else if (level === 1) {
      k.ball(0.22, 0x5d4e44, x, y, cz + z, { seg: 6, rows: 4, flat: true }); // iron ore
      k.ball(0.08, 0xb5651d, x + 0.1, y + 0.12, cz + z + 0.08, { seg: 5, rows: 3 }); // rust spots
    } else if (level === 2) k.ball(0.2, i % 2 ? GOLD : nug, x, y, cz + z, { seg: 6, rows: 4, flat: true, sy: 0.8 }); // gold nuggets
    else {
      k.ball(0.18, i % 3 === 0 ? gemC : i % 3 === 1 ? 0xe53935 : 0x43a047, x, y + 0.05, cz + z, { seg: 4, rows: 2, sy: 1.4, flat: true }); // gems
      k.ball(0.12, nug, x + 0.12, y - 0.05, cz + z - 0.1, { seg: 6, rows: 4, flat: true });
    }
  });
  if (level >= 1) {
    // a pile of ore beside the tunnel
    for (const [x, z, r] of [[1.6, 0.6, 0.28], [1.9, 0.9, 0.24], [1.75, 0.85, 0.2], [1.45, 1.0, 0.22]]) k.ball(r, level >= 2 ? (r > 0.23 ? GOLD : nug) : 0x5d4e44, x, 0.3 + r * 0.7, z, { seg: 6, rows: 4, flat: true });
  }
  if (level >= 2) {
    // gold veins showing in the rock face
    for (const [x, y, a] of [[-1.3, 1.5, 0.6], [1.35, 1.35, -0.5], [0.4, 2.3, 0.2]]) k.box(0.5, 0.07, 0.05, nug, x, y, -0.25, { rz: a });
  }
  if (level >= 3) {
    // Precious Gems: crystals growing out of the rock and a diamond on the sign
    for (const [x, y, z, s, a] of [[-1.5, 1.4, -0.45, 1, 0.4], [-1.25, 1.7, -0.6, 0.7, -0.2], [1.5, 1.3, -0.4, 0.9, -0.4], [0.9, 2.5, -1.2, 0.8, 0.1]]) {
      k.cyl(0.14 * s, 0.6 * s, gemC, x, y, z, { r2: 0.01, seg: 6, rz: a, flat: true });
      k.cyl(0.1 * s, 0.4 * s, 0xb39ddb, x + 0.15, y - 0.1, z + 0.05, { r2: 0.01, seg: 6, rz: a - 0.5, flat: true });
    }
    k.ball(0.18, gemC, 0, 3.15, fz + 0.06, { seg: 4, rows: 2, sy: 1.3, flat: true });
  }
  k.done();
  u.static = true;
  return u;
}

// ------------------------------------------------------------------ Silo

/** A ribbed grain silo with a dome, a ladder and a vent (base at y). */
function grainSilo(k, x, z, r, hh, col, y = 0.3) {
  k.cyl(r, hh, col, x, y + hh / 2, z, { seg: 20 });
  const rings = Math.round(hh / 0.55);
  for (let i = 1; i < rings; i++) k.torus(r, 0.035, tone(col, 0.8), x, y + (i * hh) / rings, z, { rx: PI / 2, seg: 20 });
  k.cyl(r + 0.08, 0.2, 0x9e9e9e, x, y + 0.1, z, { seg: 20 }); // concrete foot
  k.ball(r * 1.03, 0x78909c, x, y + hh, z, { sy: 0.6, seg: 18, rows: 8 }); // the dome
  k.cyl(0.14, 0.25, 0x546e7a, x, y + hh + r * 0.62, z, { seg: 8 }); // vent
  dome(k, 0.2, 0.12, 0x546e7a, x, y + hh + r * 0.62 + 0.12, z, { seg: 8 });
  for (const d of [-0.16, 0.16]) k.box(0.04, hh - 0.2, 0.04, 0x37474f, x + d, y + hh / 2, z + r + 0.08); // ladder
  for (let yy = y + 0.4; yy < y + hh - 0.1; yy += 0.3) k.box(0.32, 0.03, 0.03, 0x37474f, x, yy, z + r + 0.08);
  k.torus(r + 0.12, 0.03, 0x37474f, x, y + hh - 0.05, z, { rx: PI / 2, seg: 20 }); // catwalk rail
}

/**
 * Silo (0-2): a tall round grain silo with a dome beside a small red barn. Lv 1 Wheat Stores:
 * sacks of grain and wheat sheaves. Lv 2 Iron Farm Tools: a second, taller silo joined by a
 * chute, a pitchfork, a scythe and an iron plough.
 */
export function makeSilo(level) {
  const u = makeThing();
  const k = kit(u, u.body, `silo${level}`);
  ground(k, 0x7cb342);
  // dirt yard in front
  k.box(3.6, 0.04, 1.6, 0x8d6e47, 0.2, 0.31, 1.3);
  // the silo
  grainSilo(k, 0.9, -0.8, 0.95, 4.6, 0xcfd8dc);
  if (level >= 2) {
    grainSilo(k, 2.0, 0.6, 0.65, 5.4, 0xb0bec5);
    k.tube([[2.0, 6.0, 0.6], [1.5, 6.1, 0.0], [0.9, 5.4, -0.8]], 0.08, 0x90a4ae, { seg: 10, sides: 6 }); // chute between them
  }
  // the barn
  const bx = -1.2;
  const bz = -0.5;
  const red = 0xb71c1c;
  const prof = [[-0.9, 0], [0.9, 0], [0.9, 1.2], [0.6, 1.8], [0, 2.1], [-0.6, 1.8], [-0.9, 1.2]];
  k.prism(prof, 1.6, red, bx, 0.3, bz, { ry: PI / 2 });
  for (let i = 2; i <= 5; i++) {
    const [ax, ay] = prof[i];
    const [cx, cy] = prof[i + 1];
    const a = Math.atan2(cy - ay, cx - ax);
    k.box(Math.hypot(cx - ax, cy - ay) + 0.12, 0.08, 1.8, 0x4e342e, bx + (ax + cx) / 2 + Math.sin(a) * 0.04, 0.3 + (ay + cy) / 2 - Math.cos(a) * 0.04, bz, { rz: a });
  }
  const fz = bz + 0.81;
  k.box(0.8, 1.0, 0.05, 0x8e1c1c, bx, 0.8, fz); // door
  k.box(0.86, 1.06, 0.03, 0xfafafa, bx, 0.8, fz - 0.01);
  for (const s of [-1, 1]) k.box(0.06, 1.25, 0.04, 0xfafafa, bx, 0.8, fz + 0.03, { rz: s * 0.68 });
  for (const s of [-1, 1]) k.box(0.08, 1.2, 0.05, 0xfafafa, bx + s * 0.86, 0.9, fz); // corner trim
  k.box(0.4, 0.35, 0.05, 0x3e2723, bx, 1.8, fz); // hay loft
  k.ball(0.15, 0xd4b24c, bx + 0.1, 1.75, fz + 0.04, { sz: 0.4, seg: 6, rows: 4 });
  // a fence along the front
  for (let i = 0; i < 6; i++) k.box(0.08, 0.55, 0.08, 0xbcaaa4, -2.0 + i * 0.75, 0.55, 2.0);
  for (const y of [0.5, 0.75]) k.box(3.8, 0.06, 0.04, 0xbcaaa4, -0.12, y, 2.0);
  if (level >= 1) {
    // Wheat Stores: sacks of grain and two wheat sheaves
    for (const [x, y, z] of [[-0.3, 0.3, 0.6], [0.15, 0.3, 0.65], [-0.08, 0.6, 0.62], [0.6, 0.3, 0.75]]) {
      k.box(0.4, 0.3, 0.55, 0xd7c49e, x, y + 0.15, z, { r: 0.1 });
      k.box(0.41, 0.06, 0.2, 0xa1887f, x, y + 0.3, z + 0.18); // tied top
    }
    for (const [x, z] of [[-2.0, 1.1], [-1.6, 1.3]]) {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * PI * 2;
        k.cyl(0.025, 0.9, 0xe0b84a, x + Math.cos(a) * 0.08, 0.75, z + Math.sin(a) * 0.08, { rx: Math.sin(a) * 0.12, rz: -Math.cos(a) * 0.12, seg: 4 });
        k.ball(0.06, 0xf0c95a, x + Math.cos(a) * 0.15, 1.24, z + Math.sin(a) * 0.15, { sy: 2, seg: 5, rows: 4 }); // ears of wheat
      }
      k.torus(0.12, 0.03, 0xa1887f, x, 0.75, z, { rx: PI / 2, seg: 10 }); // the tie
    }
  }
  if (level >= 2) {
    // Iron Farm Tools: a pitchfork and a scythe on the barn, an iron plough in the yard
    const IRON = 0x4a4f55;
    k.cyl(0.035, 1.7, WOOD, bx - 1.0, 1.15, fz - 0.2, { rz: 0.15, seg: 6 });
    k.box(0.36, 0.05, 0.05, IRON, bx - 1.12, 1.95, fz - 0.2, { rz: 0.15 });
    for (const d of [-0.15, 0, 0.15]) k.cyl(0.02, 0.4, IRON, bx - 1.12 + d - 0.03, 2.15, fz - 0.2, { rz: 0.15, r2: 0.005, seg: 4 });
    k.cyl(0.035, 1.6, WOOD, bx + 1.05, 1.1, fz + 0.1, { rz: -0.2, seg: 6 });
    k.tube([[bx + 1.2, 1.88, fz + 0.1], [bx + 1.6, 1.95, fz + 0.15], [bx + 1.9, 1.75, fz + 0.2]], 0.04, IRON, { seg: 8, sides: 4 }); // scythe blade
    // the plough: two handles, a beam and a curved iron blade
    const px = -0.4;
    const pz = 1.4;
    k.box(0.1, 0.1, 1.3, WOOD, px, 0.6, pz, { rx: 0.15 });
    for (const s of [-1, 1]) k.cyl(0.035, 0.9, WOOD, px + s * 0.2, 0.75, pz - 0.75, { rx: -0.8, rz: s * 0.15, seg: 6 });
    k.slab(0.1, 0.45, 0.5, IRON, px, 0.5, pz + 0.55, { td: 0.3, tz: 0.1, rz: 0.5 });
    k.cyl(0.18, 0.06, IRON, px, 0.5, pz + 0.85, { axis: 'x', seg: 12 }); // the coulter disc
  }
  k.done();
  u.static = true;
  return u;
}

// ------------------------------------------------------------------ Defender

const PLATE = 0xb8c2cc; // polished steel plate
const PLATE_DK = 0x6b7682;
const MAIL = 0x8f979e;
const MAIL_DK = 0x5f666c;
const BLUE = 0x1e5bb8;
const BLUE_DK = 0x123d7d;
const STONE = 0x9e9a92;
const STONE_DK = 0x7d7970;

/**
 * A heater shield on the left arm (arm space, facing +x like the Footman's): `s` is its size,
 * `steel` a steel face (else wood), with a blue field and a white tower badge.
 */
function heater(k, s, steel) {
  const X = 0.66;
  const Y = -1.1;
  const pts = [[-0.9, 0.85], [0.9, 0.85], [0.85, -0.3], [0, -1.6], [-0.85, -0.3]].map(([z, y]) => [z * s, y * s]);
  k.prism(pts, 0.16, steel ? 0xcfd8dc : WOOD, X, Y, 0.1, { bevel: 0.04 }); // body (its rim)
  k.prism(pts.map(([z, y]) => [z * 0.84, y * 0.86 - 0.02 * s]), 0.06, BLUE, X + 0.1, Y, 0.1); // the blue field
  if (!steel) for (const z of [-0.45, 0, 0.45]) k.box(0.03, 1.6 * s, 0.035, tone(WOOD, 0.7), X + 0.06, Y - 0.2 * s, 0.1 + z * s); // plank seams
  // a white tower badge with three merlons
  const bx = X + 0.15;
  k.box(0.04, 0.6 * s, 0.38 * s, 0xeceff1, bx, Y - 0.25 * s, 0.1);
  for (const d of [-1, 0, 1]) k.box(0.04, 0.14 * s, 0.1 * s, 0xeceff1, bx, Y + 0.12 * s, 0.1 + d * 0.14 * s);
  k.box(0.045, 0.2 * s, 0.1 * s, BLUE_DK, bx + 0.005, Y - 0.43 * s, 0.1); // its door
  if (steel) {
    k.box(0.05, 0.12 * s, 1.5 * s, PLATE_DK, X + 0.1, Y + 0.68 * s, 0.1); // a steel band across the top
    for (const [z, y] of [[-0.7, 0.68], [0.7, 0.68], [-0.65, -0.3], [0.65, -0.3], [0, -1.35]]) k.ball(0.05, PLATE_DK, X + 0.12, Y + y * s, 0.1 + z * s, { seg: 6, rows: 4 }); // rivets
  }
}

/** A curved horn sticking out of a boot (leg space, s = side). */
function bootHorn(k, s) {
  const c = 0xe8dcc0;
  k.cyl(0.11, 0.32, c, s * 0.62, -1.55, -0.1, { r2: 0.07, rz: s * -1.1, seg: 8 });
  k.cyl(0.07, 0.3, c, s * 0.82, -1.35, -0.12, { r2: 0.01, rz: s * -0.3, seg: 8 });
}

/**
 * A Defender unit (0-3): a flat-topped great helm, steel plate over chain mail, a blue cape,
 * horned boots, a sword and a heater shield: a small wooden one at Lv 0, then small, medium and
 * large steel ones.
 */
export function makeDefenderBody(level, key = `defender${level}`) {
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: MAIL, pants: MAIL_DK, arms: MAIL, face: 'helm' });
  const hd = wear(h, h.head, `${key}:head`);
  // the great helm: a flat-topped steel pot with an eye slit, a cross down the face and air holes
  hd.cyl(0.72, 1.3, PLATE, 0, 0.6, 0, { seg: 22 });
  hd.cyl(0.74, 0.1, PLATE_DK, 0, 1.27, 0, { seg: 22 }); // flat top
  hd.torus(0.73, 0.04, PLATE_DK, 0, -0.04, 0, { rx: PI / 2, seg: 22 });
  band(hd, 0.735, 0.03, 0.1, 1.7, INK, 0.72); // eye slit
  hd.box(0.14, 0.6, 0.05, PLATE_DK, 0, 0.32, 0.73); // the strip down the face
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) hd.cyl(0.03, 0.05, INK, 0.25 + j * 0.12, 0.28 + i * 0.12, 0.7, { axis: 'z', seg: 6 }); // air holes
  hd.cyl(0.745, 0.12, BLUE, 0, 1.05, 0, { seg: 22 }); // a blue band round the top
  if (level >= 2) hd.box(0.1, 0.32, 1.2, BLUE, 0, 1.45, -0.05, { r: 0.04 }); // a blue crest
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  cape(t, BLUE, 3.2, { clasp: PLATE });
  // chain mail underneath, showing at the hips and under the arms
  t.box(2.16, 1.9, 1.16, MAIL, 0, 0.02, 0, { r: 0.1 });
  t.box(2.22, 0.55, 1.22, MAIL, 0, -1.12, 0, { r: 0.06 });
  for (let i = 0; i < 3; i++) t.box(2.24, 0.035, 1.24, MAIL_DK, 0, -0.95 - i * 0.16, 0);
  // the steel breastplate with a ridge and plate bands (faulds) below it
  t.box(2.22, 1.35, 1.26, PLATE, 0, 0.35, 0, { r: 0.14 });
  t.slab(0.2, 1.2, 0.1, tone(PLATE, 1.08), 0, 0.35, 0.64, { tw: 0.6 });
  for (let i = 0; i < 2; i++) t.box(2.26 - i * 0.04, 0.22, 1.28, i ? PLATE_DK : PLATE, 0, -0.45 - i * 0.22, 0, { r: 0.06 });
  belt(t, LEATHER, 0x9e9e9e, -0.84);
  // round pauldrons
  for (const s of [-1, 1]) {
    t.ball(0.72, PLATE, s * 1.45, 0.82, 0, { sy: 0.62, seg: 14, rows: 8 });
    t.torus(0.64, 0.05, BLUE, s * 1.45, 0.7, 0, { rx: PI / 2, seg: 16 });
  }
  t.done();
  hands(h, key, null, MAIL, (a, s) => {
    gauntlet(a, PLATE, BLUE);
    if (s > 0) heater(a, [0.62, 0.72, 0.92, 1.18][level], level >= 1);
  });
  feet(h, key, PLATE_DK, (b) => {
    b.box(1.1, 0.75, 1.12, PLATE, 0, -1.0, 0.02, { r: 0.08 }); // greaves
    b.ball(0.3, PLATE, 0, -0.35, 0.5, { sz: 0.5, seg: 10, rows: 6 }); // knee cop
    for (const s of [-1, 1]) bootHorn(b, s);
  });
  holdSword(h, key, 1.9, 0.26, 0xdfe6ea, { guard: 0.8, grip: BLUE_DK, metal: 0x90a4ae, gem: BLUE });
  h.tracer = 0xeeeeee;
  return own(h, 0);
}

/** Crenellations round the top of a round tower (centre x, z, radius r, top y). */
function crenels(k, x, z, r, y, col, n) {
  k.cyl(r + 0.2, 0.3, col, x, y + 0.15, z, { seg: 24 }); // the overhanging rim
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2;
    k.box(0.42, 0.42, 0.3, col, x + Math.cos(a) * (r + 0.05), y + 0.5, z + Math.sin(a) * (r + 0.05), { ry: PI / 2 - a });
  }
}

/** A round stone tower with stone courses, arrow slits and crenellations (base at y 0.3). */
function stoneTower(k, x, z, r, hh, n) {
  k.cyl(r, hh, STONE, x, 0.3 + hh / 2, z, { seg: 24 });
  for (let i = 1; i < hh / 0.45; i++) k.torus(r + 0.005, 0.02, STONE_DK, x, 0.3 + i * 0.45, z, { rx: PI / 2, seg: 24 }); // courses
  for (let i = 0; i < 10; i++) {
    const a = i * 2.4;
    const y = 0.6 + ((i * 0.37) % 1) * (hh - 0.6);
    k.box(0.4, 0.22, 0.08, i % 2 ? STONE_DK : tone(STONE, 1.08), x + Math.cos(a) * r, 0.3 + y, z + Math.sin(a) * r, { ry: PI / 2 - a }); // odd stones
  }
  for (const a of [0.9, 2.3]) k.box(0.1, 0.5, 0.06, INK, x + Math.cos(a) * (r + 0.01), 0.3 + hh * 0.65, z + Math.sin(a) * (r + 0.01), { ry: PI / 2 - a }); // arrow slits
  crenels(k, x, z, r, 0.3 + hh, STONE, n);
}

/** A banner hanging flat on a wall facing +z (top centre at x, y, z). */
function banner(k, x, y, z, w, len, col, trim) {
  k.cyl(0.04, w + 0.2, trim, x, y, z, { axis: 'x', seg: 6 });
  k.prism([[0, 0], [0, -len], [w / 2, -len + 0.3], [w, -len], [w, 0]].map(([a, b]) => [a - w / 2, b]), 0.04, col, x, y - 0.02, z, { ry: -PI / 2 });
}

/**
 * Defender (0-3): the barracks, a round stone castle tower with crenellations, an iron-banded
 * door and blue banners. Lv 1 Lean Protein Meals: taller, with a blue flag on top. Lv 2 Call
 * to Arms: a stone wall and a second, smaller tower with a blue cone roof. Lv 3 Adrenaline Rush:
 * the main tower grows again and gets a blue roof and a weapon rack.
 */
export function makeDefender(level) {
  const u = makeThing();
  const k = kit(u, u.body, `defenderTower${level}`);
  ground(k, 0x7cb342);
  k.box(1.3, 0.05, 2.0, 0x9e9e9e, 0, 0.31, 1.3); // a stone path to the door
  const hh = [3.0, 3.6, 3.8, 4.4][level];
  const r = 1.35;
  const X = level >= 2 ? -0.4 : 0;
  stoneTower(k, X, -0.3, r, hh, 12);
  // the door with iron bands and an arch
  const dz = -0.3 + r;
  k.box(0.85, 1.25, 0.1, 0x6d4c41, X, 0.92, dz - 0.02);
  k.cyl(0.425, 0.1, 0x6d4c41, X, 1.55, dz - 0.02, { axis: 'z', seg: 14 });
  k.torus(0.5, 0.08, STONE_DK, X, 1.55, dz, { arc: PI, seg: 12 });
  for (const s of [-1, 1]) k.box(0.12, 1.25, 0.12, STONE_DK, X + s * 0.5, 0.92, dz);
  for (const y of [0.6, 1.2]) k.box(0.85, 0.06, 0.04, INK, X, y, dz + 0.04);
  k.ball(0.05, 0x9e9e9e, X + 0.3, 0.95, dz + 0.06, { seg: 5, rows: 4 }); // ring handle
  // blue banners either side of the door
  for (const s of [-1, 1]) {
    const a = PI / 2 + s * 0.55;
    const bx = X + Math.cos(a) * (r + 0.04);
    const bz = -0.3 + Math.sin(a) * (r + 0.04);
    const g = { ry: -s * 0.55 };
    k.cyl(0.035, 0.75, GOLD, bx, 0.3 + hh - 0.3, bz, { axis: 'x', seg: 6, ...g });
    k.slab(0.62, 1.5, 0.04, BLUE, bx, 0.3 + hh - 1.05, bz, { bw: 0.85, ...g });
    k.box(0.3, 0.3, 0.05, 0xeceff1, bx, 0.3 + hh - 0.85, bz, { ...g, rz: PI / 4 }); // a white diamond badge
  }
  if (level >= 1) {
    // a blue flag on a pole on top
    const top = 0.3 + hh + 0.3;
    k.cyl(0.05, 1.8, 0x5d4037, X, top + 0.9, -0.3, { seg: 6 });
    k.ball(0.08, GOLD, X, top + 1.82, -0.3, { seg: 8, rows: 5 });
    k.prism([[0, 0], [1.0, 0.25], [0, 0.6]], 0.03, BLUE, X, top + 1.15, -0.3, { ry: PI / 2 });
  }
  if (level >= 2) {
    // Call to Arms: a wall to a second, smaller tower with a blue cone roof
    const sx = 1.7;
    const sz = -0.7;
    const sh = 2.5;
    k.box(1.4, 1.6, 0.6, STONE, (X + sx) / 2 + 0.3, 1.1, -0.5);
    for (let i = 0; i < 3; i++) k.box(0.3, 0.35, 0.62, STONE, (X + sx) / 2 - 0.15 + i * 0.45, 2.05, -0.5); // merlons on the wall
    k.cyl(0.75, sh, STONE, sx, 0.3 + sh / 2, sz, { seg: 18 });
    for (let i = 1; i < sh / 0.45; i++) k.torus(0.755, 0.02, STONE_DK, sx, 0.3 + i * 0.45, sz, { rx: PI / 2, seg: 18 });
    k.cyl(0.95, 0.2, STONE_DK, sx, 0.3 + sh + 0.1, sz, { seg: 18 });
    k.cyl(1.0, 1.4, BLUE, sx, 0.3 + sh + 0.9, sz, { r2: 0.02, seg: 18 }); // cone roof
    k.ball(0.08, GOLD, sx, 0.3 + sh + 1.62, sz, { seg: 8, rows: 5 });
    k.box(0.08, 0.4, 0.06, INK, sx, 1.6, sz + 0.76); // arrow slit
  }
  if (level >= 3) {
    // Adrenaline Rush: a blue cone roof on the main tower and a weapon rack by the door
    k.cyl(r + 0.35, 1.9, BLUE, X, 0.3 + hh + 0.9 + 0.95, -0.3, { r2: 0.03, seg: 24 });
    k.cyl(r + 0.37, 0.1, BLUE_DK, X, 0.3 + hh + 0.95, -0.3, { seg: 24 });
    const rx = X - 1.5;
    const rz = 1.3;
    for (const s of [-1, 1]) k.box(0.08, 1.0, 0.08, WOOD, rx, 0.8, rz + s * 0.45);
    k.box(0.08, 0.08, 1.0, WOOD, rx, 1.2, rz);
    for (const d of [-0.25, 0.05, 0.3]) {
      k.box(0.05, 1.0, 0.12, 0xcfd8dc, rx + 0.08, 0.85, rz + d, { rz: 0.15 }); // swords
      k.box(0.07, 0.06, 0.28, GOLD, rx + 0.06, 1.38, rz + d);
    }
    k.prism([[-0.35, 0.35], [0.35, 0.35], [0.33, -0.1], [0, -0.55], [-0.33, -0.1]], 0.08, BLUE, rx - 0.12, 0.85, rz - 0.85, {}); // a shield against it
  }
  k.done();
  u.static = true;
  return u;
}

// ------------------------------------------------------------------ King

const SHINE = 0xdfe6ea; // shining steel
const SHINE_DK = 0x9aa5ae;
const ROYAL = 0x8e1b1b; // the crimson tabard and cape
const ERMINE = 0xf5f5f5;

/** A crown on the head (head space): a gold band, points with balls on top and gems. */
function crown(k, y, big, gem) {
  k.cyl(0.74, 0.28, GOLD, 0, y, 0, { seg: 22, open: false });
  k.torus(0.74, 0.04, tone(GOLD, 0.8), 0, y - 0.13, 0, { rx: PI / 2, seg: 22 });
  const n = big ? 8 : 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2;
    const x = Math.sin(a) * 0.72;
    const z = Math.cos(a) * 0.72;
    k.cyl(0.13, big ? 0.42 : 0.3, GOLD, x, y + (big ? 0.34 : 0.28), z, { r2: 0.02, seg: 6 });
    k.ball(0.06, GOLD, x, y + (big ? 0.58 : 0.46), z, { seg: 6, rows: 4 });
    k.ball(0.07, i % 2 ? 0x1e88e5 : gem, Math.sin(a) * 0.76, y, Math.cos(a) * 0.76, { seg: 6, rows: 4 }); // gems on the band
  }
  if (big) {
    // arches over the top and a cross on a ball
    for (const a of [0, PI / 2]) k.torus(0.62, 0.04, GOLD, 0, y + 0.2, 0, { arc: PI, ry: a, seg: 14 });
    dome(k, 0.6, 0.5, ROYAL, 0, y + 0.1, 0, { seg: 14 });
    k.ball(0.1, GOLD, 0, y + 0.86, 0, { seg: 8, rows: 5 });
    k.box(0.06, 0.24, 0.06, GOLD, 0, y + 1.05, 0);
    k.box(0.18, 0.06, 0.06, GOLD, 0, y + 1.07, 0);
  }
}

/** The insignia on the front of the tabard (torso space): a gold crown over a gold ring. */
function insignia(k, y, z) {
  k.torus(0.32, 0.04, GOLD, 0, y, z, { seg: 18 });
  k.box(0.38, 0.1, 0.03, GOLD, 0, y - 0.08, z + 0.01);
  for (const x of [-0.14, 0, 0.14]) k.cyl(0.05, x === 0 ? 0.24 : 0.18, GOLD, x, y + (x === 0 ? 0.08 : 0.05), z + 0.01, { r2: 0.005, seg: 4 });
}

/**
 * A King unit (0-4): a shining steel suit plated with gold, a crimson tabard with a gold crown
 * insignia, a beard and a giant sword with a black grip. More gold each level: Lv 1 gold
 * pauldrons, Lv 2 a crimson cape, gold knees and a gold crown, Lv 3 gold greaves, a bigger
 * sword and an ermine trim, Lv 4 Sword of Ashkanite: a big jewelled crown and a glowing blade.
 */
export function makeKingBody(level, key = `king${level}`) {
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: SHINE, pants: SHINE_DK, arms: SHINE, face: 'frown' });
  const gold = level >= 1 ? GOLD : 0xd4a017;
  // head: an open steel helm (Lv 0-1), then a crown; a full grey-brown beard
  const hd = wear(h, h.head, `${key}:head`);
  if (level < 2) {
    dome(hd, 0.76, 0.66, SHINE, 0, 0.85, 0, { seg: 18 });
    hd.cyl(0.765, 0.16, gold, 0, 0.92, 0, { seg: 22 }); // gold circlet
    hd.ball(0.08, 0xc62828, 0, 0.92, 0.77, { seg: 8, rows: 5 });
    band(hd, 0.74, 0.06, 0.7, 2.6, SHINE, 0.5, { ry: PI }); // cheek and neck guard
  } else {
    hair(hd, 0x6d5a4a);
    crown(hd, 1.05, level >= 4, level >= 4 ? glowMat(h, 0xff3d00) : 0xc62828);
  }
  hd.box(0.95, 0.45, 0.2, 0x6d5a4a, 0, 0.22, 0.58, { r: 0.08 }); // beard
  hd.box(0.6, 0.3, 0.18, 0x6d5a4a, 0, -0.05, 0.6, { r: 0.07 });
  hd.box(0.5, 0.08, 0.06, 0x5d4a3a, 0, 0.47, 0.66); // moustache
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  if (level >= 2) cape(t, ROYAL, 3.6, { clasp: GOLD, w: 2.4 });
  if (level >= 3) t.box(2.9, 0.4, 0.9, ERMINE, 0, 1.0, -0.3, { r: 0.15 }); // ermine collar
  if (level >= 3) for (const [x, z] of [[-1.0, 0.1], [-0.4, 0.18], [0.3, 0.18], [0.9, 0.1], [0, -0.7]]) t.box(0.06, 0.12, 0.04, INK, x, 1.05, z + 0.08);
  // the shining breastplate with gold trim
  t.box(2.24, 1.95, 1.26, SHINE, 0, 0.05, 0, { r: 0.14 });
  t.box(2.28, 0.1, 1.3, gold, 0, 0.98, 0); // gold collar edge
  t.box(2.28, 0.12, 1.3, gold, 0, -0.62, 0);
  for (let i = 0; i < 2; i++) t.box(2.3 - i * 0.04, 0.24, 1.32, i ? gold : SHINE, 0, -0.82 - i * 0.24, 0, { r: 0.06 }); // faulds
  // the crimson tabard down the front, with the gold insignia
  t.box(1.25, 2.9, 0.06, ROYAL, 0, -0.55, 0.66);
  for (const s of [-1, 1]) t.box(0.05, 2.9, 0.07, gold, s * 0.62, -0.55, 0.66); // gold edging
  t.box(1.25, 0.06, 0.07, gold, 0, -1.98, 0.66);
  insignia(t, 0.3, 0.7);
  belt(t, INK, gold, -0.6);
  // pauldrons: steel, then gold
  for (const s of [-1, 1]) {
    t.ball(0.78, level >= 1 ? gold : SHINE, s * 1.5, 0.85, 0, { sy: 0.62, seg: 14, rows: 8 });
    t.ball(0.68, level >= 1 ? SHINE : gold, s * 1.5, 0.72, 0, { sy: 0.5, seg: 14, rows: 8 });
    if (level >= 3) for (let i = 0; i < 3; i++) t.box(0.1, 0.12, 0.1, gold, s * (1.2 + i * 0.25), 1.28 - i * 0.05, 0, { r: 0.03 }); // gold studs
  }
  if (level >= 3) for (const s of [-1, 1]) t.slab(0.5, 1.2, 0.08, gold, s * 0.86, 0.3, 0.62, { tw: 0.6 }); // gold side plates
  t.done();
  hands(h, key, null, SHINE, (a) => {
    gauntlet(a, level >= 2 ? gold : SHINE, gold);
    a.torus(0.56, 0.05, gold, 0, -0.95, 0, { rx: PI / 2, seg: 14 });
  });
  feet(h, key, level >= 3 ? gold : SHINE_DK, (b) => {
    b.box(1.12, 0.8, 1.14, level >= 3 ? gold : SHINE, 0, -1.0, 0.02, { r: 0.08 }); // greaves
    b.ball(0.32, level >= 2 ? gold : SHINE, 0, -0.32, 0.5, { sz: 0.5, seg: 10, rows: 6 }); // knee cops
    b.box(1.14, 0.08, 1.16, gold, 0, -0.62, 0.02);
  });
  // the giant sword with a black grip; Sword of Ashkanite glows ember red
  const bl = level >= 3 ? 3.6 : 3.1;
  const o = { guard: 1.3, grip: INK, metal: gold, gem: 0xc62828 };
  if (level >= 4) o.segs = [glowMat(h, 0xffab40), glowMat(h, 0xff6e40), glowMat(h, 0xff3d00)];
  holdSword(h, key, bl, 0.46, level >= 4 ? 0xff6e40 : 0xeef2f5, o);
  h.tracer = level >= 4 ? 0xff6e40 : 0xffe082;
  return own(h, 0);
}

/**
 * King (0-4): the barracks, a royal pavilion on a stone dais with a throne before it and gold
 * trim. Lv 1 Master Duelist: a red carpet and banners. Lv 2 Rare Strength Elixirs: a table
 * of glowing elixirs. Lv 3 Grandiose Strikes: gold braziers and a taller pavilion. Lv 4 Sword of
 * Ashkanite: a glowing sword set in a stone by the throne.
 */
export function makeKing(level) {
  const u = makeThing();
  const k = kit(u, u.body, `kingTower${level}`);
  const fire = level >= 3 ? glowMat(u, 0xff9100) : null;
  const elix = level >= 2 ? [glowMat(u, 0xe040fb), glowMat(u, 0x40c4ff), glowMat(u, 0x69f0ae)] : null;
  const ash = level >= 4 ? glowMat(u, 0xff3d00) : null;
  ground(k, 0x7cb342);
  // the stone dais: two round steps
  k.cyl(2.0, 0.25, STONE, 0, 0.42, -0.3, { seg: 28 });
  k.cyl(1.7, 0.25, tone(STONE, 1.08), 0, 0.67, -0.3, { seg: 28 });
  k.torus(1.7, 0.04, GOLD, 0, 0.8, -0.3, { rx: PI / 2, seg: 28 });
  // the pavilion: striped round walls, a cone roof with scalloped edge and a gold crown on top
  const wh = level >= 3 ? 2.4 : 2.0;
  const pz = -0.6;
  const y0 = 0.8;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    k.box(0.68, wh, 0.06, i % 2 ? ROYAL : 0xf5e6c8, Math.cos(a) * 1.3, y0 + wh / 2, pz + Math.sin(a) * 1.3, { ry: PI / 2 - a });
  }
  k.box(0.7, wh * 0.75, 0.04, 0x3e1010, 0, y0 + wh * 0.375, pz + 1.33); // the open doorway
  const roofH = level >= 3 ? 1.9 : 1.6;
  k.cyl(1.65, roofH, ROYAL, 0, y0 + wh + roofH / 2, pz, { r2: 0.05, seg: 24 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * PI * 2;
    k.ball(0.2, i % 2 ? GOLD : ROYAL, Math.cos(a) * 1.58, y0 + wh - 0.05, pz + Math.sin(a) * 1.58, { sy: 0.7, sz: 0.4, seg: 6, rows: 4, ry: PI / 2 - a }); // scallops
  }
  k.torus(1.6, 0.05, GOLD, 0, y0 + wh + 0.05, pz, { rx: PI / 2, seg: 24 });
  const ty = y0 + wh + roofH;
  k.cyl(0.04, 0.6, GOLD, 0, ty + 0.25, pz, { seg: 6 });
  k.cyl(0.22, 0.14, GOLD, 0, ty + 0.55, pz, { seg: 12 }); // a small gold crown on top
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * PI * 2;
    k.cyl(0.05, 0.16, GOLD, Math.cos(a) * 0.2, ty + 0.7, pz + Math.sin(a) * 0.2, { r2: 0.01, seg: 4 });
  }
  k.prism([[0, 0], [0.7, 0.2], [0, 0.4]], 0.03, ROYAL, 0, ty + 0.85, pz, { ry: PI / 2 }); // pennant
  k.cyl(0.03, 0.5, GOLD, 0, ty + 0.85, pz, { seg: 5 });
  // the throne in front of the pavilion
  const tz = 1.0;
  k.box(1.0, 0.5, 0.8, GOLD, 0, 1.05, tz, { r: 0.06 }); // seat block
  k.box(0.9, 0.12, 0.7, ROYAL, 0, 1.36, tz, { r: 0.05 }); // cushion
  k.box(1.0, 1.4, 0.18, GOLD, 0, 1.6, tz - 0.4, { r: 0.06 }); // back
  k.box(0.7, 1.05, 0.04, ROYAL, 0, 1.6, tz - 0.3);
  k.ball(0.12, 0xc62828, 0, 2.15, tz - 0.29, { seg: 8, rows: 5 }); // a ruby on the back
  for (const s of [-1, 1]) {
    k.box(0.14, 0.4, 0.8, GOLD, s * 0.55, 1.45, tz, { r: 0.04 }); // arms
    k.ball(0.1, GOLD, s * 0.55, 1.68, tz + 0.35, { seg: 8, rows: 5 });
    k.cyl(0.06, 0.3, GOLD, s * 0.45, 2.4, tz - 0.4, { r2: 0.01, seg: 6 }); // finials
  }
  if (level >= 1) {
    // Master Duelist: a red carpet down the steps, two royal banners
    k.box(0.8, 0.03, 1.6, 0xb71c1c, 0, 0.32, 1.9);
    k.box(0.84, 0.032, 0.06, GOLD, 0, 0.32, 2.7);
    for (const s of [-1, 1]) {
      const bx = s * 1.75;
      k.cyl(0.05, 3.2, 0x5d4037, bx, 1.9, 1.2, { seg: 6 });
      k.ball(0.09, GOLD, bx, 3.55, 1.2, { seg: 8, rows: 5 });
      banner(k, bx, 3.3, 1.25, 0.6, 1.4, ROYAL, GOLD);
      k.box(0.25, 0.25, 0.05, GOLD, bx, 2.85, 1.28, { rz: PI / 4 });
    }
  }
  if (level >= 2) {
    // Rare Strength Elixirs: a small table of glowing bottles
    const ex = 1.75;
    const ez = -1.5;
    k.box(0.9, 0.06, 0.6, WOOD, ex, 1.0, ez);
    for (const [dx, dz] of [[-0.35, -0.22], [0.35, -0.22], [-0.35, 0.22], [0.35, 0.22]]) k.cyl(0.04, 0.68, WOOD, ex + dx, 0.64, ez + dz, { seg: 5 });
    elix.forEach((m, i) => {
      const x = ex - 0.25 + i * 0.25;
      k.ball(0.11, m, x, 1.14, ez, { seg: 10, rows: 7 });
      k.cyl(0.04, 0.14, 0xe0f7fa, x, 1.3, ez, { seg: 6 });
      k.cyl(0.045, 0.05, 0x8d6e47, x, 1.39, ez, { seg: 6 });
    });
  }
  if (level >= 3) {
    // Grandiose Strikes: gold braziers with fire on the dais
    for (const s of [-1, 1]) {
      const x = s * 1.15;
      k.cyl(0.07, 0.8, GOLD, x, 1.2, 1.4, { seg: 8 });
      k.cyl(0.28, 0.25, GOLD, x, 1.7, 1.4, { r2: 0.35, seg: 12 });
      k.cyl(0.25, 0.4, fire, x, 1.95, 1.4, { r2: 0.02, seg: 8 });
    }
  }
  if (level >= 4) {
    // Sword of Ashkanite: a glowing sword set in a stone beside the throne
    const sx = -1.0;
    const sz = 0.3;
    k.ball(0.45, STONE_DK, sx, 1.0, sz, { sy: 0.6, seg: 9, rows: 6, flat: true });
    k.box(0.08, 1.4, 0.3, ash, sx, 1.75, sz);
    k.box(0.12, 0.12, 0.8, GOLD, sx, 2.48, sz, { r: 0.04 }); // guard
    k.cyl(0.07, 0.45, INK, sx, 2.75, sz, { seg: 8 }); // black grip
    k.ball(0.1, GOLD, sx, 3.0, sz, { seg: 8, rows: 5 });
  }
  k.done();
  u.static = true;
  return u;
}

export const MODELS = {
  groveWarden: makeGroveWarden,
  goldMine: makeGoldMine,
  silo: makeSilo,
  defender: makeDefender,
  king: makeKing,
};

export const SUMMONS = {
  defenderUnit0: () => unitOf(makeDefenderBody(0), 0.6, 3.5),
  defenderUnit1: () => unitOf(makeDefenderBody(1), 0.6, 3.5),
  defenderUnit2: () => unitOf(makeDefenderBody(2), 0.6, 3.5),
  defenderUnit3: () => unitOf(makeDefenderBody(3), 0.6, 3.5),
  kingUnit0: () => unitOf(makeKingBody(0), 0.85, 5),
  kingUnit1: () => unitOf(makeKingBody(1), 0.85, 5),
  kingUnit2: () => unitOf(makeKingBody(2), 0.85, 5),
  kingUnit3: () => unitOf(makeKingBody(3), 0.85, 5),
  kingUnit4: () => unitOf(makeKingBody(4), 0.85, 5),
};
