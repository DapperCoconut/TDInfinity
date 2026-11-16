// Tower models: people, batch 35 (dressed with the vehicle kit in ../vehicles.js).
// In here: Footman (the barracks tower: a Footman beside his tent) and its Footman units
// (footman0 ... footman3). Light armour: a chainmail shirt, leather sleeves and leather pants.
// The shield changes with the level: none, wooden, wooden with steel plating, spiked steel.
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.
// SUMMONS maps unit models to builders; ./summons.js joins it with the other summons.

import { tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { makeThing } from './bits.js';
import { INK, LEATHER, STEEL, WOOD, belt, fist, hair, muzzle, own, pouch, wear } from './people1.js';
import { feet, hands } from './people5.js';
import { sword } from './people24.js';

const PI = Math.PI;
const MAIL = 0x8f979e; // chainmail
const MAIL_DK = 0x5f666c;
const HIDE = 0x7a5230; // leather sleeves
const HIDE_DK = 0x4e3420; // leather pants
const CANVAS = 0xd8c7a0;
const CANVAS_DK = 0xb5a27a;

// ------------------------------------------------------------------ shields (left arm space, face along +x)

/** Level 1: a round wooden shield made of planks. Level 2 adds steel plating. */
function woodShield(k, plated) {
  const X = 0.66;
  k.cyl(0.95, 0.14, WOOD, X, -1.15, 0.1, { axis: 'x', seg: 20 });
  for (const z of [-0.55, -0.18, 0.18, 0.55]) k.box(0.03, 1.75 - Math.abs(z) * 0.9, 0.035, tone(WOOD, 0.7), X + 0.075, -1.15, 0.1 + z); // plank seams
  if (!plated) {
    k.ball(0.2, tone(WOOD, 0.85), X + 0.08, -1.15, 0.1, { sx: 0.5, seg: 10, rows: 6 }); // a wooden boss
    return;
  }
  k.torus(0.95, 0.06, STEEL, X + 0.02, -1.15, 0.1, { ry: PI / 2, seg: 24 }); // steel rim
  k.box(0.04, 1.8, 0.2, STEEL, X + 0.08, -1.15, 0.1); // steel bands across
  k.box(0.04, 0.2, 1.8, STEEL, X + 0.08, -1.15, 0.1);
  k.ball(0.24, 0x9aa3ab, X + 0.1, -1.15, 0.1, { sx: 0.55, seg: 12, rows: 7 }); // steel boss
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2 + PI / 8;
    k.ball(0.05, INK, X + 0.1, -1.15 + Math.sin(a) * 0.78, 0.1 + Math.cos(a) * 0.78, { seg: 6, rows: 4 }); // rivets
  }
}

/** Level 3: a heavy full steel shield with spikes. */
function steelShield(k) {
  const X = 0.66;
  const pts = [[-0.95, 0.85], [0.95, 0.85], [0.9, -0.3], [0, -1.75], [-0.9, -0.3]];
  k.prism(pts, 0.18, 0x9aa3ab, X, -1.1, 0.1, { bevel: 0.04 });
  k.prism(pts.map(([z, y]) => [z * 1.07, y * 1.05 + 0.02]), 0.1, STEEL, X - 0.06, -1.1, 0.1);
  k.box(0.04, 2.2, 0.16, MAIL_DK, X + 0.1, -1.4, 0.1); // a raised ridge down the middle
  k.box(0.04, 0.16, 1.7, MAIL_DK, X + 0.1, -0.75, 0.1);
  k.cyl(0.2, 0.65, 0xb0b8bf, X + 0.4, -0.85, 0.1, { axis: 'x', r2: 0.01, seg: 10 }); // the big spike
  for (const [y, z] of [[-0.35, -0.75], [-0.35, 0.95], [-2.4, 0.1]]) k.cyl(0.1, 0.35, 0xb0b8bf, X + 0.24, y, z, { axis: 'x', r2: 0.01, seg: 8 }); // corner spikes
}

// ------------------------------------------------------------------ the Footman

/** A short arming sword in the right fist, held out in front; the muzzle sits at its tip. */
function holdSword(h, key) {
  const g = fist(h.rightArm, -1.9, 1.0);
  g.rotation.x = -0.5;
  const k = wear(h, g, `${key}:blade`);
  const tip = sword(k, 1.7, 0.24, 0xcfd8dc, { guard: 0.7, grip: LEATHER, metal: 0x78909c, gem: 0x6d4c41 });
  k.done();
  h.muzzles = [];
  muzzle(h, g, tip, 0);
  h.rightArm.rotation.set(-PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-0.5, 0, -0.15);
  h.pose = { right: -PI / 2, left: -0.5, leftRecoil: 0 };
  h.swing = 1.8;
  h.melee = true;
}

/** A Footman at `level` (0-3): chainmail, leather sleeves and pants, a sword, and from level 1 a shield. */
export function makeFootmanBody(level, key = `footman${level}`) {
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: MAIL, pants: HIDE_DK, arms: HIDE, face: 'soldier' });
  const hd = wear(h, h.head, `${key}:head`);
  hair(hd, 0x5d4037);
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  // a chainmail shirt: rows of rings, a mail skirt over the hips and mail over the shoulders
  t.box(2.16, 1.9, 1.16, MAIL, 0, 0.02, 0, { r: 0.1 });
  for (let i = 0; i < 7; i++) t.box(2.19, 0.035, 1.19, MAIL_DK, 0, 0.85 - i * 0.26, 0);
  t.box(2.22, 0.5, 1.22, MAIL, 0, -1.12, 0, { r: 0.06 });
  t.box(2.24, 0.04, 1.24, MAIL_DK, 0, -1.36, 0);
  for (const sd of [-1, 1]) t.box(1.1, 0.42, 1.14, MAIL, sd * 1.45, 0.82, 0, { r: 0.08 });
  belt(t, LEATHER, 0x9e9e9e, -0.84);
  pouch(t, -0.7, -1.0, 0.56, 0.32, 0.3, LEATHER, 0.16);
  t.box(0.2, 0.75, 0.26, INK, 0.85, -1.2, 0.3, { r: 0.04, rz: -0.15 }); // the sword's sheath
  if (level >= 2) {
    // a leather strap across the chest
    t.box(0.22, 2.3, 0.06, LEATHER, 0, 0.05, 0.6, { rz: 0.72 });
    t.box(0.22, 2.3, 0.06, LEATHER, 0, 0.05, -0.6, { rz: -0.72 });
  }
  t.done();
  hands(h, key, HIDE_DK, tone(HIDE, 0.8), (a, s) => {
    // leather bracers with lacing
    a.cyl(0.56, 0.55, tone(HIDE, 0.85), 0, -1.25, 0, { seg: 12 });
    for (let i = 0; i < 2; i++) a.box(0.3, 0.03, 0.03, 0xd7ccc8, 0, -1.12 - i * 0.24, 0.57);
    if (s > 0 && level === 1) woodShield(a, false);
    if (s > 0 && level === 2) woodShield(a, true);
    if (s > 0 && level >= 3) steelShield(a);
  });
  feet(h, key, 0x3e2723, (b) => b.box(1.1, 0.4, 1.12, tone(HIDE_DK, 0.85), 0, -1.2, 0.02, { r: 0.05 })); // leather leg wraps
  holdSword(h, key);
  h.tracer = 0xeeeeee;
  return own(h, 0);
}

/** The tower: a Footman standing guard by his tent. Bigger Tent (level 2) makes it bigger; More Beds (level 3) adds bedrolls. */
export function makeFootman(level) {
  const h = makeFootmanBody(level, `footmanT${level}`);
  const k = wear(h, h.root, `footmanT${level}:tent`);
  const big = level >= 2;
  const w = big ? 2.3 : 1.8; // half width
  const ht = big ? 3.4 : 2.7;
  const len = big ? 4.2 : 3.2;
  const X = 2.4;
  const Z = -2.8;
  const tri = (s, dy = 0) => [[-w * s, dy], [w * s, dy], [0, ht * s + dy]];
  k.prism(tri(1), len, CANVAS, X, 0, Z, { ry: PI / 2 }); // the tent
  k.prism(tri(0.42), 0.05, tone(CANVAS_DK, 0.6), X, 0, Z + len / 2 + 0.03, { ry: PI / 2 }); // the open door
  for (const sd of [-1, 1]) k.box(0.06, ht * 0.45, 0.04, CANVAS_DK, X + sd * w * 0.38, ht * 0.2, Z + len / 2 + 0.06, { rz: sd * -0.6 }); // tied-back flaps
  k.cyl(0.07, len + 0.5, WOOD, X, ht + 0.03, Z, { axis: 'z', seg: 6 }); // ridge pole
  for (const zz of [-1, 1]) {
    k.cyl(0.07, ht + 0.35, WOOD, X, (ht + 0.35) / 2, Z + zz * (len / 2 + 0.2), { seg: 6 }); // end poles
    for (const sd of [-1, 1]) {
      k.tube([[X, ht, Z + zz * (len / 2 + 0.2)], [X + sd * (w + 0.7), 0.05, Z + zz * (len / 2 + 0.6)]], 0.025, 0xa1887f, { seg: 2, sides: 4 }); // guy ropes
      k.cyl(0.06, 0.35, WOOD, X + sd * (w + 0.7), 0.1, Z + zz * (len / 2 + 0.6), { seg: 5 }); // pegs
    }
  }
  // a pennant on a pole
  k.cyl(0.06, 4.4, WOOD, X + w + 0.6, 2.2, Z + len / 2, { seg: 6 });
  k.prism([[0, 0], [1.1, 0.3], [0, 0.6]], 0.03, 0xc62828, X + w + 0.6, 3.7, Z + len / 2, { ry: PI / 2 });
  if (level >= 3) {
    // More Beds: bedrolls laid out beside the tent
    for (let i = 0; i < 2; i++) {
      const bz = Z - 0.6 + i * 1.3;
      k.cyl(0.32, 2.2, i ? 0x6d4c41 : 0x5d6b3a, X - w - 1.0, 0.32, bz, { axis: 'x', seg: 12 });
      k.cyl(0.33, 0.12, LEATHER, X - w - 1.6, 0.32, bz, { axis: 'x', seg: 12 }); // straps
      k.cyl(0.33, 0.12, LEATHER, X - w - 0.4, 0.32, bz, { axis: 'x', seg: 12 });
    }
  }
  k.done();
  return h;
}

/** One Footman as a unit, scaled like the other summons. */
function footmanUnit(level) {
  const u = makeThing();
  u.wheels = [];
  u.soldiers = [];
  const h = makeFootmanBody(level);
  h.root.scale.setScalar(0.6);
  u.body.add(h.root);
  u.mats.push(...h.mats);
  u.soldiers.push(h);
  u.muzzles.push(h.muzzles[0]);
  u.height = 3.5;
  u.tracer = h.tracer;
  u.melee = true;
  return u;
}

export const MODELS = {
  footman: makeFootman,
};

export const SUMMONS = {
  footman0: () => footmanUnit(0),
  footman1: () => footmanUnit(1),
  footman2: () => footmanUnit(2),
  footman3: () => footmanUnit(3),
};
