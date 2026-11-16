// Tower models, batch 40 (built with the vehicle kit in ../vehicles.js).
// In here: Hoplite (alternate Marksman: a Greek spearman), Great Cannon (alternate Railgunner: a
// huge iron cannon on a wheeled carriage), Crossbowman (alternate Archer: a hooded bowman with a
// heavy crossbow), Arcantech Commando (alternate Commando: a visored soldier with an arcane rifle),
// Cygor (alternate Noob Tuber: a one-eyed giant holding a boulder), Oathsworn Revenant (alternate
// Phaser: a skeleton knight in rusted armor with a ghost skull), Astrapomancer (alternate
// Grenadier: a storm mage with a copper staff) and Helloc (a crimson demon with a greatsword), plus
// his Spawn of Helloc unit.
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.
// SUMMONS maps unit models to builders; ./summons.js joins it with the other summons.

import { glowMat, kit, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { makeThing } from './bits.js';
import { GOLD, INK, LEATHER, STEEL, WOOD, belt, dome, fist, muzzle, own, rifle, wear } from './people1.js';
import { feet, hands, hood } from './people5.js';
import { cape, gauntlet } from './people18.js';
import { sword } from './people24.js';

const PI = Math.PI;
const BRONZE = 0xb0803a;
const CRIMSON = 0xa31515;

/** A long robe over the legs, flaring out to the hem (torso space). */
function robe(t, col, len, flare, hem) {
  t.slab(2.16, 1.1, 1.16, col, 0, -1.45, 0, { bw: 1.15, bd: 1.12 });
  t.slab(2.4, len, 1.3, col, 0, -2.0 - len / 2, 0, { bw: flare, bd: flare });
  if (hem != null) t.box(2.4 * flare + 0.08, 0.08, 1.3 * flare + 0.08, hem, 0, -2.0 - len + 0.04, 0);
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
  h.pose = { right: -PI / 2, left: -0.5, leftRecoil: 0 };
  h.swing = 1.8;
}

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

// ------------------------------------------------------------------ Hoplite

/**
 * Hoplite (0-3): a Greek spearman with no shield: a bronze helmet with a red crest, a bronze
 * cuirass over a red tunic, greaves and a long spear held ready to throw. Lv 1 a red cloak.
 * Lv 2 a taller crest and spare spears on his back. Lv 3 Demigod: gold armor and a glowing spear.
 */
export function makeHoplite(level) {
  const key = `hoplite${level}`;
  const metal = level >= 3 ? GOLD : BRONZE;
  const h = makeHumanoid({ skin: 0xd8a273, shirt: CRIMSON, pants: 0xd8a273, arms: 0xd8a273, face: 'frown' });
  const hd = wear(h, h.head, `${key}:head`);
  dome(hd, 0.8, 0.7, metal, 0, 0.85, 0, { seg: 18 }); // Corinthian helmet
  for (const s of [-1, 1]) hd.box(0.22, 0.75, 0.55, metal, s * 0.55, 0.35, 0.35, { r: 0.06 }); // cheek guards
  hd.box(0.16, 0.5, 0.12, metal, 0, 0.45, 0.72); // nose guard
  const crest = level >= 2 ? 1.0 : 0.75;
  hd.box(0.18, 0.45, 1.6 * crest, CRIMSON, 0, 1.55 + crest * 0.1, -0.05, { r: 0.08 }); // horsehair crest
  hd.box(0.1, 0.2, 1.4 * crest, metal, 0, 1.38, -0.05); // its holder
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  t.box(2.24, 1.9, 1.26, metal, 0, 0.1, 0, { r: 0.18 }); // cuirass
  t.box(1.0, 0.06, 0.08, tone(metal, 0.8), 0, 0.55, 0.64); // chest muscles
  t.box(0.06, 0.9, 0.08, tone(metal, 0.8), 0, 0.1, 0.64);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    t.box(0.42, 0.75, 0.08, i % 2 ? CRIMSON : LEATHER, Math.sin(a) * 1.02, -1.2, Math.cos(a) * 0.62, { ry: a }); // pteruges
  }
  belt(t, LEATHER, metal, -0.84);
  if (level >= 1) cape(t, CRIMSON, 2.8, { clasp: metal, w: 2.0 });
  if (level >= 2) for (const x of [-0.3, 0, 0.3]) t.cyl(0.05, 3.4, WOOD, x, 0.4, -0.75, { seg: 6, rz: 0.4 }); // spare spears
  t.done();
  hands(h, key, null, metal);
  feet(h, key, LEATHER, (b) => b.box(1.1, 1.2, 1.1, metal, 0, -0.9, 0.05, { r: 0.12 })); // greaves over sandals
  const g = fist(h.rightArm, -1.9, 1.0);
  const gk = wear(h, g, `${key}:spear`);
  gk.cyl(0.07, 5.2, WOOD, 0, 0, 0.6, { axis: 'z', seg: 7 });
  const head = level >= 3 ? glowMat(h, 0xffe082, 0.8) : metal;
  gk.cyl(0.16, 0.7, head, 0, 0, 3.55, { axis: 'z', r2: 0.01, seg: 6, flat: true }); // the point
  gk.cyl(0.1, 0.25, metal, 0, 0, -2.0, { axis: 'z', seg: 6 }); // butt spike
  gk.done();
  h.muzzles = [];
  muzzle(h, g, 0, 3.9);
  h.rightArm.rotation.set(-PI / 2 - 0.5, 0, -0.1); // raised, ready to throw
  h.leftArm.rotation.set(-PI / 2, 0, 0.3); // the free hand points at the target
  h.pose = { right: -PI / 2 - 0.5, left: -PI / 2, leftRecoil: 0 };
  h.tracer = 0xd7ccc8;
  return own(h);
}

// ------------------------------------------------------------------ Great Cannon

const IRON = 0x2b2b2b;

/** A spoked wooden wheel with an iron tyre, its hub along x. */
function wheel(k, x, y, z, r) {
  k.torus(r, 0.12, IRON, x, y, z, { ry: PI / 2, seg: 24 });
  k.torus(r - 0.14, 0.09, WOOD, x, y, z, { ry: PI / 2, seg: 24 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI;
    k.box(0.1, r * 2 - 0.3, 0.1, tone(WOOD, 0.9), x, y, z, { rx: a });
  }
  k.cyl(0.24, 0.4, IRON, x, y, z, { axis: 'x', seg: 10 });
}

/**
 * Great Cannon (0-4): a huge black iron barrel on a wooden carriage with two big spoked wheels.
 * Lv 1 a powder keg. Lv 2 bronze bands. Lv 3 a stack of shells. Lv 4 King's Hammer: a longer,
 * fatter barrel with a gold crown at the breech and a glowing muzzle.
 */
export function makeGreatCannon(level) {
  const u = makeThing();
  const k = kit(u, u.body, `greatCannon${level}`);
  const band2 = level >= 2 ? BRONZE : 0x444444;
  k.slab(4.4, 0.3, 4.4, 0x6d6d6d, 0, 0.15, 0, { tw: 0.95, td: 0.95 }); // stone pad
  // the carriage: two cheeks and a trail to the ground behind
  for (const s of [-1, 1]) k.box(0.3, 1.0, 2.6, WOOD, s * 0.75, 1.3, 0.1, { rx: 0.15 });
  k.box(1.2, 0.35, 2.6, tone(WOOD, 0.85), 0, 0.7, -1.3, { rx: 0.25 }); // trail
  k.box(1.8, 0.3, 0.4, tone(WOOD, 0.85), 0, 1.0, 0.6); // axle bed
  for (const s of [-1, 1]) wheel(k, s * 1.15, 1.25, 0.4, 1.1);
  // the barrel, aimed a little up
  const L = level >= 4 ? 4.8 : 4.0;
  const R = level >= 4 ? 0.55 : 0.45;
  const y = 2.1;
  k.cyl(R + 0.15, 0.9, IRON, 0, y, -0.4, { axis: 'z', seg: 18 }); // breech
  k.ball(R + 0.15, IRON, 0, y, -0.85, { seg: 14, rows: 10 }); // cascabel
  k.ball(0.15, IRON, 0, y, -1.15, { seg: 8, rows: 6 });
  k.cyl(R + 0.05, L, IRON, 0, y, 0.05 + L / 2, { axis: 'z', r2: R - 0.05, seg: 18 });
  for (let i = 0; i < (level >= 2 ? 4 : 2); i++) k.cyl(R + 0.12, 0.14, band2, 0, y, 0.4 + i * (L / 4), { axis: 'z', seg: 18 }); // reinforcing bands
  k.cyl(R + 0.14, 0.4, IRON, 0, y, L + 0.05, { axis: 'z', seg: 18 }); // muzzle swell
  k.cyl(R - 0.12, 0.05, level >= 4 ? glowMat(u, 0xff6d00, 0.8) : INK, 0, y, L + 0.26, { axis: 'z', seg: 14 }); // the bore
  for (const s of [-1, 1]) k.cyl(0.14, 0.3, IRON, s * (R + 0.15), y, 0.3, { axis: 'x', seg: 8 }); // trunnions
  if (level >= 1) {
    k.cyl(0.4, 0.8, WOOD, -1.6, 0.7, -1.4, { seg: 12 }); // powder keg
    for (const yy of [0.45, 0.95]) k.torus(0.41, 0.04, IRON, -1.6, yy, -1.4, { rx: PI / 2, seg: 14 });
  }
  if (level >= 3) for (const [x, z] of [[1.5, -1.3], [1.9, -1.3], [1.7, -1.0], [1.7, -1.15]]) k.ball(0.22, INK, x, x === 1.7 && z === -1.15 ? 0.75 : 0.52, z, { seg: 10, rows: 8 }); // shells
  if (level >= 4) {
    k.cyl(0.4, 0.3, GOLD, 0, y + R + 0.3, -0.4, { seg: 8 }); // the crown on the breech
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      k.cyl(0.06, 0.3, GOLD, Math.cos(a) * 0.32, y + R + 0.55, -0.4 + Math.sin(a) * 0.32, { r2: 0.01, seg: 5 });
    }
  }
  k.done();
  muzzle(u, u.body, y, L + 0.3);
  u.tracer = 0x424242;
  return u;
}

// ------------------------------------------------------------------ Crossbowman

/**
 * Crossbowman (0-3): a hooded bowman in a green-brown jerkin with a quiver of bolts and a heavy
 * iron crossbow. Lv 1 leather bracers. Lv 2 a mail shirt and a bigger prod. Lv 3 a steel prod
 * with a crank winder and a dark red hood.
 */
export function makeCrossbowman(level) {
  const key = `crossbowman${level}`;
  const cloth = 0x4e5b31;
  const h = makeHumanoid({ skin: 0xc68e63, shirt: cloth, pants: 0x3e2f23, arms: cloth, face: 'frown' });
  const hd = wear(h, h.head, `${key}:head`);
  hood(hd, level >= 3 ? 0x7b1e1e : 0x3b4a2a);
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  if (level >= 2) t.box(2.22, 1.0, 1.24, 0x8a8f94, 0, -0.35, 0, { r: 0.08 }); // mail shirt
  t.box(2.2, 1.6, 1.22, LEATHER, 0, 0.25, 0, { r: 0.1 }); // jerkin
  belt(t, INK, STEEL, -0.84);
  t.box(0.2, 2.8, 0.12, LEATHER, 0, 0.1, 0.62, { rz: 0.7 }); // quiver strap
  t.cyl(0.32, 1.6, LEATHER, 0.5, 0.4, -0.75, { seg: 10, rz: -0.3 }); // quiver
  for (let i = 0; i < 4; i++) t.cyl(0.04, 0.5, WOOD, 0.35 + i * 0.1, 1.35, -0.75, { seg: 4, rz: -0.3 });
  t.done();
  hands(h, key, null, cloth, level >= 1 ? (a) => a.box(1.08, 0.6, 1.08, LEATHER, 0, -1.1, 0, { r: 0.08 }) : null);
  feet(h, key, 0x3e2723);
  const g = fist(h.rightArm, -1.9, 1.0);
  const gk = wear(h, g, `${key}:xbow`);
  const prod = level >= 3 ? STEEL : level >= 2 ? 0x5d4037 : WOOD;
  gk.box(0.3, 0.3, 2.4, WOOD, 0, 0.1, 0.5, { r: 0.05 }); // stock
  gk.box(0.12, 0.08, 1.8, 0x5d5d5d, 0, 0.27, 0.8); // the groove
  const w = level >= 2 ? 2.4 : 2.0;
  for (const s of [-1, 1]) gk.box(w / 2, 0.14, 0.18, prod, s * w / 4, 0.15, 1.6 - Math.abs(s) * 0.05, { ry: s * 0.18 }); // the prod
  gk.cyl(0.02, w * 0.95, 0xeeeeee, 0, 0.27, 1.25, { axis: 'x', seg: 4 }); // string
  gk.cyl(0.04, 0.8, WOOD, 0, 0.32, 1.3, { axis: 'z', seg: 5 }); // the bolt
  gk.cyl(0.07, 0.15, STEEL, 0, 0.32, 1.75, { axis: 'z', r2: 0.01, seg: 5 });
  gk.box(0.18, 0.2, 0.18, IRON, 0, 0.12, 1.65); // stirrup
  if (level >= 3) gk.cyl(0.18, 0.2, STEEL, 0.25, 0.1, -0.4, { axis: 'x', seg: 10 }); // crank winder
  gk.done();
  h.muzzles = [];
  muzzle(h, g, 0.32, 1.9);
  h.rightArm.rotation.set(-PI / 2, 0, 0.05);
  h.leftArm.rotation.set(-PI / 2, 0, 0.45); // steadying the stock
  h.pose = { right: -PI / 2, left: -PI / 2, leftRecoil: 0 };
  h.tracer = 0xbcaaa4;
  return own(h);
}

// ------------------------------------------------------------------ Arcantech Commando

/**
 * Arcantech Commando (0-3): a soldier in dark plate with a full helmet and a glowing visor, and a
 * rifle with arcane runes and coils. Lv 1 more glow and shoulder plates. Lv 2 a power pack on the
 * back. Lv 3 Killing Machine: a longer barrel with three spinning coils and a bright cyan glow.
 */
export function makeArcantech(level) {
  const key = `arcantech${level}`;
  const plate = 0x37474f;
  const h = makeHumanoid({ skin: 0x8d6e63, shirt: plate, pants: 0x263238, arms: plate, face: 'none' });
  const arc = glowMat(h, 0x18ffff, 0.6 + level * 0.25);
  const hd = wear(h, h.head, `${key}:head`);
  dome(hd, 0.8, 0.82, plate, 0, 0.75, 0, { seg: 18 });
  hd.box(1.3, 0.85, 0.75, plate, 0, 0.45, 0.25, { r: 0.18 }); // face plate
  hd.box(1.12, 0.22, 0.1, arc, 0, 0.7, 0.62, { r: 0.05 }); // visor
  hd.box(0.1, 0.5, 0.1, arc, 0, 1.4, 0.35); // crest light
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  t.box(2.24, 1.9, 1.26, plate, 0, 0.1, 0, { r: 0.14 });
  t.box(0.5, 0.5, 0.08, arc, 0, 0.5, 0.64, { r: 0.1 }); // chest rune
  for (const s of [-1, 1]) t.box(0.08, 1.2, 0.08, arc, s * 0.7, 0.1, 0.64);
  belt(t, INK, 0x78909c, -0.84);
  if (level >= 1) for (const s of [-1, 1]) t.ball(0.72, tone(plate, 1.15), s * 1.5, 0.8, 0, { sy: 0.6, seg: 12, rows: 8 }); // shoulder plates
  if (level >= 2) {
    t.box(1.4, 1.5, 0.6, 0x263238, 0, 0.3, -0.9, { r: 0.1 }); // power pack
    t.cyl(0.25, 1.2, arc, 0, 0.3, -1.22, { seg: 10 }); // its glowing cell
  }
  t.done();
  hands(h, key, 0x212121, plate);
  feet(h, key, 0x212121, (b) => b.box(1.1, 0.8, 1.1, plate, 0, -1.0, 0.05, { r: 0.08 }));
  const g = fist(h.rightArm, -1.9, 1.1);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = rifle(gk, { len: level >= 3 ? 3.0 : 2.4, body: 0x263238, furn: 0x37474f, mag: 'box', stock: true, optic: level >= 1 ? 'scope' : 'iron' });
  for (let i = 0; i < (level >= 3 ? 3 : 2); i++) gk.torus(0.2, 0.05, arc, 0, y, 0.9 + i * 0.45, { seg: 14 }); // arcane coils
  gk.box(0.06, 0.06, 1.2, arc, 0.14, y - 0.1, 0.6); // rune line
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  h.tracer = 0x18ffff;
  return own(h);
}

// ------------------------------------------------------------------ Cygor

/**
 * Cygor (0-4): a hunched one-eyed giant, part minotaur: hooves, horns, a thick body, sharp teeth,
 * holding a big boulder in both hands over its head. Each level it is bigger, with longer horns;
 * Lv 2 a bone necklace, Lv 3 war paint, Lv 4 Apex: a glowing eye and a cracked, glowing boulder.
 */
export function makeCygor(level) {
  const key = `cygor${level}`;
  const hide = 0x8d6e53;
  const h = makeHumanoid({ skin: hide, shirt: hide, pants: 0x5d4037, arms: hide, face: 'none' });
  const hd = wear(h, h.head, `${key}:head`);
  hd.box(1.3, 1.25, 1.25, hide, 0, 0.6, 0.1, { r: 0.25 }); // the big head
  hd.ball(0.38, 0xfafafa, 0, 0.8, 0.65, { seg: 14, rows: 10 }); // the one eye
  hd.ball(0.2, level >= 4 ? glowMat(h, 0xff3d00, 1.2) : 0xc62828, 0, 0.8, 0.95, { seg: 10, rows: 8 });
  hd.box(1.0, 0.12, 0.12, tone(hide, 0.7), 0, 1.15, 0.7, { r: 0.04 }); // heavy brow
  hd.box(0.9, 0.3, 0.2, 0x3e2723, 0, 0.15, 0.7); // mouth
  for (let i = 0; i < 5; i++) hd.cyl(0.06, 0.2, 0xfff8e1, -0.36 + i * 0.18, 0.28, 0.78, { r2: 0.01, seg: 4, rx: PI }); // teeth
  const hl = 0.7 + level * 0.15;
  for (const s of [-1, 1]) hd.tube([[s * 0.6, 1.1, 0], [s * (0.9 + hl * 0.4), 1.5, 0.1], [s * (1.0 + hl * 0.5), 1.6 + hl * 0.5, 0.4]], 0.12, 0xe8dcc0, { seg: 8, sides: 6 }); // horns
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  t.box(2.4, 2.0, 1.4, hide, 0, 0.1, 0, { r: 0.3 }); // thick body
  t.ball(1.0, tone(hide, 0.9), 0, 1.0, -0.6, { seg: 12, rows: 8 }); // the hunched back
  t.box(2.3, 0.7, 1.3, 0x5d4037, 0, -0.9, 0, { r: 0.1 }); // loincloth
  if (level >= 2) for (let i = 0; i < 6; i++) t.cyl(0.05, 0.3, 0xfff8e1, -0.6 + i * 0.24, 0.85, 0.7, { r2: 0.01, seg: 4, rx: PI }); // bone necklace
  if (level >= 3) for (const s of [-1, 1]) t.box(0.1, 0.9, 0.06, 0xc62828, s * 0.5, 0.2, 0.71, { rz: s * 0.4 }); // war paint
  t.done();
  hands(h, key, null, hide);
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    b.box(1.05, 0.45, 1.2, 0x212121, 0, -1.85, 0.08, { r: 0.08 }); // hooves
    b.box(0.08, 0.45, 0.2, hide, 0, -1.85, 0.68); // split hoof
    b.done();
  }
  // the boulder, held over the head in both hands
  const rock = level >= 4 ? 0x6d6058 : 0x8a8178;
  const g = fist(h.rightArm, -1.9, 1.0);
  const gk = wear(h, g, `${key}:rock`);
  const R = 1.0 + level * 0.12;
  gk.ball(R, rock, -1.4, -0.4, 0, { seg: 9, rows: 7 });
  for (let i = 0; i < 4; i++) gk.ball(R * 0.45, tone(rock, 0.85), -1.4 + Math.cos(i * 1.7) * R * 0.7, -0.4 + Math.sin(i * 2.3) * R * 0.5, Math.sin(i * 1.7) * R * 0.6, { seg: 6, rows: 5 }); // lumps
  if (level >= 4) for (let i = 0; i < 3; i++) gk.box(0.08, R * 1.4, 0.06, glowMat(h, 0xff6d00, 0.9), -1.4 + (i - 1) * 0.4, -0.4, R * 0.9, { rz: 0.4 * (i - 1) }); // glowing cracks
  gk.done();
  h.muzzles = [];
  muzzle(h, g, -0.4, 0);
  h.rightArm.rotation.set(-PI + 0.2, 0, 0.35);
  h.leftArm.rotation.set(-PI + 0.2, 0, -0.35);
  h.pose = { right: -PI + 0.2, left: -PI + 0.2, leftRecoil: 0 };
  h.tracer = 0x8a8178;
  h.root.scale.setScalar(1.1 + level * 0.06);
  return own(h);
}

// ------------------------------------------------------------------ Oathsworn Revenant

const BONE = 0xe8e0c8;
const RUST = 0x7a4a2a;

/**
 * Oathsworn Revenant (0-3): a skeleton knight in rusted plate and a torn black cape, with green
 * fire in its eyes, a rusted sword, and a ghostly skull floating over its shoulder. Lv 1 Souldrain:
 * green chains on its arms. Lv 2 Veil of Souls: a ghostly veil round the cape. Lv 3 Damnation: a
 * crown of green fire and the skull grows huge.
 */
export function makeOathsworn(level) {
  const key = `oathsworn${level}`;
  const h = makeHumanoid({ skin: BONE, shirt: RUST, pants: 0x3e2723, arms: BONE, face: 'none' });
  const soul = glowMat(h, 0x76ff03, 0.8 + level * 0.2);
  const ghost = glowMat(h, 0xb2ff59, 0.35);
  const hd = wear(h, h.head, `${key}:head`);
  hd.box(1.1, 1.1, 1.05, BONE, 0, 0.65, 0.05, { r: 0.3 }); // skull
  for (const x of [-0.25, 0.25]) {
    hd.box(0.3, 0.28, 0.1, INK, x, 0.75, 0.56, { r: 0.08 }); // eye sockets
    hd.ball(0.08, soul, x, 0.75, 0.6, { seg: 6, rows: 4 }); // green fire in them
  }
  hd.box(0.6, 0.12, 0.1, INK, 0, 0.3, 0.56); // teeth gap
  for (let i = 0; i < 5; i++) hd.box(0.08, 0.14, 0.06, BONE, -0.24 + i * 0.12, 0.3, 0.6);
  hd.box(0.86, 0.3, 0.9, RUST, 0, 1.25, 0.0, { r: 0.08 }); // broken helm rim
  if (level >= 3) for (let i = 0; i < 5; i++) hd.cyl(0.08, 0.45, soul, -0.4 + i * 0.2, 1.6, 0, { r2: 0.01, seg: 5 }); // crown of green fire
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  cape(t, 0x1b1b1b, 3.4, { clasp: RUST, w: 2.2 });
  t.box(2.24, 1.8, 1.26, RUST, 0, 0.15, 0, { r: 0.12 }); // rusted breastplate
  t.box(1.1, 1.2, 0.04, INK, 0, 0.2, 0.64); // a hole rusted through
  for (let i = 0; i < 4; i++) t.box(0.9, 0.08, 0.06, BONE, 0, 0.6 - i * 0.28, 0.67); // ribs showing in it
  for (const s of [-1, 1]) t.ball(0.7, tone(RUST, 0.9), s * 1.5, 0.8, 0, { sy: 0.55, seg: 12, rows: 8 });
  belt(t, INK, RUST, -0.84);
  if (level >= 2) t.slab(2.6, 3.2, 0.1, ghost, 0, -0.5, -0.85, { bw: 1.3 }); // veil of souls
  // the ghost skull over its left shoulder
  const sk = level >= 3 ? 0.75 : 0.5;
  t.ball(sk, ghost, 1.4, 2.4, -0.2, { seg: 12, rows: 9 });
  for (const x of [-0.18, 0.18]) t.ball(sk * 0.22, soul, 1.4 + x * sk * 2, 2.45, -0.2 + sk * 0.85, { seg: 6, rows: 4 });
  t.done();
  hands(h, key, null, RUST, (a) => {
    gauntlet(a, RUST, tone(RUST, 0.8));
    if (level >= 1) for (let i = 0; i < 3; i++) a.torus(0.58, 0.05, soul, 0, -0.3 - i * 0.25, 0, { rx: PI / 2 + 0.2, seg: 12 }); // soul chains
  });
  feet(h, key, RUST);
  holdSword(h, key, 3.0, 0.4, 0x6d5d4b, { guard: 1.1, grip: INK, metal: RUST, gem: 0x76ff03 });
  h.leftArm.rotation.set(-0.6, 0, -0.2);
  h.tracer = 0x76ff03;
  return own(h);
}

// ------------------------------------------------------------------ Astrapomancer

const COPPER = 0xb87333;

/**
 * Astrapomancer (0-3): a storm mage in a slate-blue robe and a pointed hood, with a copper staff
 * topped by a crackling ball of lightning. Lv 1 copper bracers. Lv 2 a storm cloud on the shoulders
 * and a bigger orb. Lv 3 Conduit: copper rods round the staff head and sparks all around.
 */
export function makeAstrapomancer(level) {
  const key = `astrapomancer${level}`;
  const cloth = 0x37475a;
  const h = makeHumanoid({ skin: 0xe0b48a, shirt: cloth, pants: cloth, arms: cloth, face: 'frown' });
  const zap = glowMat(h, 0x80d8ff, 0.9 + level * 0.2);
  const hd = wear(h, h.head, `${key}:head`);
  hood(hd, 0x2c3a4c);
  hd.cyl(0.55, 1.2, 0x2c3a4c, 0, 1.6, -0.1, { r2: 0.02, seg: 10, rx: -0.3 }); // pointed tip
  hd.box(0.9, 0.5, 0.15, 0xeceff1, 0, 0.0, 0.6, { r: 0.1 }); // white beard
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  robe(t, cloth, 1.3, 1.25, COPPER);
  belt(t, LEATHER, COPPER, -0.84);
  for (let i = 0; i < 3; i++) t.box(0.06, 0.4, 0.06, zap, -0.4 + i * 0.4, 0.4, 0.64, { rz: (i - 1) * 0.6 }); // lightning stitching
  if (level >= 2) for (let i = 0; i < 5; i++) t.ball(0.4, 0x546e7a, -1.0 + i * 0.5, 1.25, -0.3, { seg: 8, rows: 6 }); // storm cloud
  t.done();
  hands(h, key, null, cloth, level >= 1 ? (a) => a.box(1.08, 0.45, 1.08, COPPER, 0, -1.05, 0, { r: 0.06 }) : null);
  feet(h, key, 0x263238);
  // the copper staff, upright in the right hand, an orb of lightning on top
  const g = fist(h.rightArm, -1.9, 1.0);
  const gk = wear(h, g, `${key}:staff`);
  gk.cyl(0.08, 4.4, COPPER, 0, 0.6, 0, { seg: 8 });
  gk.torus(0.32, 0.06, COPPER, 0, 2.9, 0, { seg: 14 });
  const orb = level >= 2 ? 0.34 : 0.26;
  gk.ball(orb, zap, 0, 2.9, 0, { seg: 12, rows: 9 });
  for (let i = 0; i < 4; i++) gk.box(0.04, 0.5, 0.04, zap, Math.cos(i * 1.6) * 0.3, 2.9 + Math.sin(i * 2.1) * 0.2, Math.sin(i * 1.6) * 0.3, { rz: i * 0.9 }); // crackles
  if (level >= 3) for (let i = 0; i < 4; i++) gk.cyl(0.04, 0.9, COPPER, Math.cos(i * PI / 2) * 0.45, 2.8, Math.sin(i * PI / 2) * 0.45, { seg: 5 }); // conduit rods
  gk.done();
  h.muzzles = [];
  muzzle(h, g, 2.9, 0);
  h.rightArm.rotation.set(-0.9, 0, 0.1);
  h.leftArm.rotation.set(-PI / 2, 0, 0.3); // the casting hand
  h.pose = { right: -0.9, left: -PI / 2, leftRecoil: 0 };
  h.tracer = 0x80d8ff;
  return own(h);
}

// ------------------------------------------------------------------ Helloc

const DEMON = 0x9b1b1b;
const SPIKE = 0x1a1a1a;

/**
 * Helloc's body: crimson skin with spikes, black arm spikes, horns wrapped in red chains, yellow
 * chains swirling round him, wings that can't fly and the greatsword Defender's Fall glowing red.
 * `level` 0-4 adds more spikes, chains and glow. `spawn`: the smaller Spawn of Helloc (no wings).
 */
function makeHellocBody(level, key, spawn = false) {
  const h = makeHumanoid({ skin: DEMON, shirt: DEMON, pants: 0x3a0a0a, arms: DEMON, face: 'none' });
  const ember = glowMat(h, 0xff1744, 0.7 + level * 0.15);
  const chain = glowMat(h, 0xffea00, 0.7);
  const hd = wear(h, h.head, `${key}:head`);
  hd.box(1.15, 1.15, 1.1, DEMON, 0, 0.6, 0.05, { r: 0.25 });
  for (const x of [-0.26, 0.26]) hd.box(0.28, 0.1, 0.08, chain, x, 0.75, 0.6, { rz: x > 0 ? -0.3 : 0.3 }); // burning eyes
  hd.box(0.8, 0.14, 0.08, INK, 0, 0.3, 0.58);
  for (let i = 0; i < 4; i++) hd.cyl(0.05, 0.16, 0xfff8e1, -0.24 + i * 0.16, 0.26, 0.6, { r2: 0.01, seg: 4, rx: PI }); // fangs
  for (const s of [-1, 1]) {
    hd.tube([[s * 0.5, 1.1, 0], [s * 1.0, 1.6, -0.2], [s * 1.1, 2.3, 0.1]], 0.14, SPIKE, { seg: 8, sides: 6 }); // horns
    for (let i = 0; i < 3; i++) hd.torus(0.17, 0.04, CRIMSON, s * (0.7 + i * 0.13), 1.3 + i * 0.25, -0.1, { seg: 10, rz: s * 0.6 }); // red chains round them
  }
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  t.box(2.3, 1.95, 1.3, DEMON, 0, 0.1, 0, { r: 0.2 });
  for (let i = 0; i < 3; i++) t.box(0.8, 0.07, 0.06, tone(DEMON, 0.7), 0, 0.5 - i * 0.3, 0.66); // ridges
  belt(t, INK, CRIMSON, -0.84);
  const n = spawn ? 3 : 4 + level;
  for (let i = 0; i < n; i++) t.cyl(0.13, 0.7, SPIKE, -0.6 + (i / Math.max(1, n - 1)) * 1.2, 0.9, -0.65, { r2: 0.01, seg: 5, rx: -0.6 }); // back spikes
  for (const s of [-1, 1]) t.cyl(0.16, 0.6, CRIMSON, s * 1.5, 1.2, 0, { r2: 0.01, seg: 5, rz: -s * 0.3 }); // crimson shoulder spikes
  if (!spawn) {
    // wings that can't fly: a bony arm and torn membranes each side
    for (const s of [-1, 1]) {
      t.tube([[s * 0.5, 0.8, -0.7], [s * 1.8, 2.0, -1.0], [s * 3.0, 1.4, -1.1]], 0.1, SPIKE, { seg: 10, sides: 6 });
      for (let i = 0; i < 3; i++) t.box(0.75, 1.6 - i * 0.35, 0.05, 0x5a0d0d, s * (1.2 + i * 0.65), 0.9 - i * 0.1, -0.95, { rz: s * (0.25 + i * 0.15) });
    }
    // the yellow chains swirling round him
    for (let i = 0; i < 1 + Math.min(2, level); i++) t.torus(2.0 + i * 0.3, 0.05, chain, 0, -0.4 + i * 0.6, 0, { rx: PI / 2 + 0.3 - i * 0.25, seg: 28 });
  }
  t.done();
  hands(h, key, null, DEMON, (a) => {
    for (let i = 0; i < 3; i++) a.cyl(0.1, 0.45, SPIKE, -0.55, -0.2 - i * 0.35, 0, { r2: 0.01, seg: 5, rz: PI / 2 }); // black arm spikes
  });
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    b.box(1.05, 0.5, 1.25, SPIKE, 0, -1.8, 0.1, { r: 0.1 }); // clawed feet
    for (const x of [-0.3, 0, 0.3]) b.cyl(0.08, 0.3, 0xe0e0e0, x, -1.9, 0.78, { r2: 0.01, seg: 4, rx: PI / 2 });
    b.done();
  }
  // Defender's Fall: a black greatsword with a red glowing blade
  const segs = [glowMat(h, 0xff5252), ember, glowMat(h, 0xd50000)];
  holdSword(h, key, spawn ? 2.6 : 3.4 + level * 0.1, spawn ? 0.42 : 0.55, 0xff1744, { guard: 1.5, grip: INK, metal: SPIKE, gem: 0xffea00, segs });
  h.leftArm.rotation.set(-0.4, 0, -0.3);
  h.tracer = 0xff1744;
  h.melee = true;
  return h;
}

/** Helloc (0-4): see makeHellocBody. He crouches when he isn't swinging. */
export function makeHelloc(level) {
  const h = makeHellocBody(level, `helloc${level}`);
  h.root.scale.setScalar(1.2);
  return own(h, 0);
}

export const MODELS = {
  hoplite: makeHoplite,
  greatCannon: makeGreatCannon,
  crossbowman: makeCrossbowman,
  arcantech: makeArcantech,
  cygor: makeCygor,
  oathsworn: makeOathsworn,
  astrapomancer: makeAstrapomancer,
  helloc: makeHelloc,
};

export const SUMMONS = {
  hellocSpawn: () => unitOf(makeHellocBody(0, 'hellocSpawn', true), 0.8, 4.5),
};
