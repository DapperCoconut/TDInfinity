// Tower models: people, batch 2 (dressed with the vehicle kit in ../vehicles.js).
// In here: John (+bottom), Classic Soldier, Ranger (+bottom), Quarterer, Operator (+bottom),
// Marksman, Hunter.
// Each makeX(level) builds one tower's look; TOWER_MODELS in ../models.js says which tower uses which.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.

import { glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import {
  GOLD, GUNMETAL, INK, LEATHER, STEEL, UP, WOOD, aimBoth, aimLong, armPatch, band, belt, boots, canteen, cap,
  collar, dome, fist, glove, goggles, hair, headband, headset, helmet, kneePad, muzzle, own, pack, pistol, pockets,
  pouch, radio, rifle, sash, shades, shardOf, vest, wear,
} from './people1.js';

const PI = Math.PI;

// ------------------------------------------------------------------ shared bits for this batch

/** A boonie hat: soft crown, a cloth band and a wide floppy brim (head space). */
function boonie(k, col, o = {}) {
  const y = o.y ?? 0.98;
  dome(k, 0.72, 0.5, col, 0, y, 0);
  k.cyl(0.725, 0.14, tone(col, 0.75), 0, y + 0.08, 0, { seg: 20 });
  k.cyl(1.02, 0.06, col, 0, y, 0, { seg: 22, r2: 1.08 });
  for (const s of [-1, 1]) k.cyl(0.05, 0.03, tone(col, 0.6), s * 0.72, y + 0.2, 0, { axis: 'x', seg: 6 }); // vents
}

/** A beret tipped to one side, with a badge (head space). */
function beret(k, col, badge) {
  k.cyl(0.66, 0.12, tone(col, 0.7), 0, 1.0, 0, { seg: 20 });
  k.ball(0.78, col, 0.14, 1.14, -0.04, { sy: 0.3, seg: 18, rows: 8, rz: -0.18 });
  k.ball(0.06, tone(col, 0.6), 0.2, 1.38, -0.04, { seg: 6, rows: 4 });
  k.cyl(0.13, 0.05, badge, -0.32, 1.1, 0.6, { axis: 'z', seg: 10 });
}

/** Round wire glasses (head space). */
function specs(k, frame, lens, y = 0.72) {
  for (const s of [-1, 1]) {
    k.torus(0.15, 0.025, frame, s * 0.25, y, 0.63, { seg: 14 });
    k.cyl(0.14, 0.02, lens, s * 0.25, y, 0.62, { axis: 'z', seg: 14 });
    k.box(0.03, 0.03, 0.62, frame, s * 0.62, y + 0.03, 0.3);
  }
  k.box(0.18, 0.03, 0.03, frame, 0, y + 0.04, 0.64);
}

/** Night-vision goggles: a mount on the helmet front and two tubes (head space). up: flipped up. */
function nvg(k, lens, up = false) {
  const y = up ? 1.42 : 0.86;
  const z = up ? 0.6 : 0.82;
  k.box(0.34, 0.24, 0.16, INK, 0, 1.18, 0.72, { r: 0.03 }); // mount
  k.box(0.56, 0.22, 0.24, 0x263238, 0, y, z - 0.08, { r: 0.04, rx: up ? -0.8 : 0 });
  for (const s of [-1, 1]) {
    k.cyl(0.11, 0.3, 0x263238, s * 0.2, y, z + 0.08, { axis: 'z', seg: 12, rx: up ? -0.8 : 0 });
    if (!up) k.cyl(0.085, 0.02, lens, s * 0.2, y, z + 0.24, { axis: 'z', seg: 12 });
  }
}

/** A grenade on a chest strap (torso space). */
function grenade(k, x, y, z, col = 0x33691e) {
  k.ball(0.17, col, x, y, z, { sy: 1.2, seg: 10, rows: 7 });
  k.box(0.06, 0.24, 0.05, STEEL, x + 0.1, y + 0.1, z + 0.12);
  k.cyl(0.07, 0.08, STEEL, x, y + 0.22, z, { seg: 8 });
  k.torus(0.06, 0.015, 0xbdbdbd, x - 0.08, y + 0.26, z, { seg: 8 });
}

/** Rounded shoulder pads (torso space). */
function shoulderPads(k, col, r = 0.6) {
  for (const s of [-1, 1]) {
    k.ball(r, col, s * 1.45, 0.95, 0, { sy: 0.55, seg: 14, rows: 8 });
    k.box(0.5, 0.06, 0.9, tone(col, 0.7), s * 1.45, 0.78, 0);
  }
}

/** A long coat: back panel, side panels to the knees and lapels (torso space). */
function duster(k, col, o = {}) {
  k.slab(2.16, 2.7, 0.16, col, 0, -0.4, -0.6, { bw: 1.12 });
  for (const s of [-1, 1]) k.slab(0.26, 2.7, 1.12, col, s * 1.0, -0.4, 0, { bw: 1.25, bx: s * 0.03 });
  for (const s of [-1, 1]) k.box(0.24, 1.2, 0.08, tone(col, 0.85), s * 0.82, 0.35, 0.55, { rz: s * 0.15 });
  k.box(2.2, 0.32, 1.18, tone(col, 0.9), 0, 0.88, -0.02, { r: 0.08 }); // turned-up collar
  if (o.trim) for (const s of [-1, 1]) k.box(0.06, 2.6, 0.06, o.trim, s * 1.13, -0.4, 0.5);
}

/**
 * A bolt-action rifle on the fist: long wooden stock, round barrel, a bolt handle and the parts
 * in `o`: len, wood, metal, scope (its length, or false), lens, can (suppressor), brake, bipod.
 * Returns the bore point [y, z].
 */
function boltRifle(k, o = {}) {
  const len = o.len ?? 2.6;
  const wood = o.wood ?? WOOD;
  const metal = o.metal ?? GUNMETAL;
  const U = UP;
  const B = U + 0.08; // bore height
  k.box(0.28, 0.72, 0.4, wood, 0, 0.58, U - 0.08, { r: 0.07 }); // butt
  k.box(0.3, 0.08, 0.46, INK, 0, 0.96, U - 0.08, { r: 0.02 }); // butt pad
  k.box(0.08, 0.36, 0.14, tone(wood, 0.8), 0.15, 0.55, U + 0.04, { r: 0.03 }); // cheek rest
  k.box(0.22, 0.26, 0.5, wood, 0, 0.12, U - 0.32, { rx: -0.32, r: 0.05 }); // wrist and grip
  k.box(0.28, 1.25, 0.3, wood, 0, -0.68, U - 0.06, { r: 0.07 }); // fore-stock
  k.cyl(0.13, 0.75, metal, 0, -0.22, B, { seg: 12 }); // receiver
  k.cyl(0.03, 0.26, STEEL, 0.17, 0.02, B, { axis: 'x', seg: 6 }); // bolt handle
  k.ball(0.06, STEEL, 0.3, 0.02, B, { seg: 8, rows: 5 });
  k.torus(0.1, 0.022, INK, 0, -0.14, U - 0.24, { ry: PI / 2, seg: 10, arc: PI }); // trigger guard
  k.box(0.14, 0.3, 0.2, INK, 0, -0.3, U - 0.3, { r: 0.02 }); // magazine well
  const bl = len - 0.55;
  k.cyl(0.065, bl, STEEL, 0, -0.55 - bl / 2, B, { seg: 10, r2: 0.08 });
  k.torus(0.07, 0.02, INK, 0, -1.2, B - 0.06, { rx: PI / 2, seg: 10 }); // barrel band
  if (o.can) k.cyl(0.12, 0.7, INK, 0, -len + 0.35, B, { seg: 12 });
  else if (o.brake) {
    k.cyl(0.1, 0.24, INK, 0, -len + 0.12, B, { seg: 10 });
    for (const s of [-1, 1]) k.box(0.03, 0.14, 0.08, 0x050505, s * 0.09, -len + 0.12, B);
  } else k.cyl(0.08, 0.1, INK, 0, -len + 0.05, B, { seg: 8 });
  if (o.scope !== false) {
    const sl = o.scope ?? 1.0;
    const sy = -0.25;
    const sz = B + 0.36;
    k.cyl(0.1, sl, INK, 0, sy, sz, { seg: 12 });
    k.cyl(0.15, 0.24, INK, 0, sy - sl / 2 - 0.05, sz, { seg: 14, r2: 0.11 }); // front bell
    k.cyl(0.13, 0.2, INK, 0, sy + sl / 2 + 0.04, sz, { seg: 12, r2: 0.11 }); // eye piece
    k.cyl(0.12, 0.02, o.lens ?? 0x4fc3f7, 0, sy - sl / 2 - 0.18, sz, { seg: 14 });
    k.cyl(0.05, 0.12, INK, 0, sy, sz + 0.12, { seg: 8 }); // turrets
    k.cyl(0.05, 0.12, INK, 0.13, sy, sz, { axis: 'x', seg: 8 });
    for (const y of [sy - sl * 0.3, sy + sl * 0.3]) k.box(0.1, 0.1, 0.26, INK, 0, y, B + 0.2); // rings
  } else k.box(0.05, 0.08, 0.14, INK, 0, -len + 0.2, B + 0.12); // front sight
  if (o.bipod) {
    for (const s of [-1, 1]) {
      k.tube([[s * 0.06, -len + 0.75, B - 0.08], [s * 0.26, -len + 0.55, B - 0.75]], 0.025, INK, { seg: 4, sides: 5 });
      k.ball(0.04, INK, s * 0.26, -len + 0.55, B - 0.77, { seg: 6, rows: 4 });
    }
    k.box(0.16, 0.12, 0.12, INK, 0, -len + 0.75, B - 0.1);
  }
  return [-len, B];
}

// ------------------------------------------------------------------ John

/**
 * John: a guy in a hoodie and jeans with a pistol. Top path: a puffer vest at Lv 1, a silver
 * Desert Eagle at Lv 3, dual Deagles at Lv 4, a glowing red rage headband at Lv 5. Bottom path:
 * a visor at Lv 1, a chef hat at Lv 2, an AK shotgun at Lv 3, armor at Lv 4, and at Lv 5 the
 * Slayer's helmet, an axe on its back and a railgun on its shoulder.
 */
export function makeJohn(level, bottom = false) {
  const top = !bottom;
  const slayer = bottom && level >= 5;
  const rage = top && level >= 5;
  const shirt = slayer ? 0x263238 : 0x2e7d32;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x1e3a5f, arms: shirt, face: 'smile' });
  const key = `john${bottom ? 'B' : 'T'}${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const hood = tone(shirt, 0.75);
  // the hoodie: hood down round the neck, strings, a front pocket and a ribbed hem
  t.torus(0.62, 0.13, hood, 0, 1.0, -0.05, { rx: PI / 2, seg: 16, arc: PI, rz: PI });
  for (const s of [-1, 1]) {
    t.cyl(0.03, 0.55, 0xeeeeee, s * 0.2, 0.62, 0.53, { seg: 5 });
    t.ball(0.05, 0xeeeeee, s * 0.2, 0.33, 0.54, { seg: 6, rows: 4 });
  }
  t.slab(1.2, 0.55, 0.08, tone(shirt, 0.85), 0, -0.5, 0.52, { tw: 0.75 });
  t.box(2.04, 0.2, 1.04, tone(shirt, 0.8), 0, -0.9, 0);
  // messy hair (hidden under hats and the helmet)
  if (!(bottom && level >= 2)) {
    hair(hd, 0x4e342e, { h: 0.46 });
    for (const [x, z, r] of [[-0.3, 0.3, 0.4], [0.25, 0.35, -0.5], [0.05, -0.2, 0.2]]) hd.box(0.22, 0.3, 0.14, 0x4e342e, x, 1.32, z, { rx: -0.5, rz: r });
  }
  if (top && level >= 1) {
    // a puffer vest: quilted rows and a zip
    const pv = rage ? 0x3e2723 : 0x37474f;
    t.box(2.14, 1.78, 1.14, pv, 0, 0.06, 0, { r: 0.18 });
    for (let i = 0; i < 4; i++) t.box(2.18, 0.05, 1.18, tone(pv, 0.7), 0, 0.68 - i * 0.42, 0);
    t.box(0.06, 1.7, 0.04, 0x9e9e9e, 0, 0.06, 0.58);
    t.box(1.0, 0.24, 1.18, pv, 0, 0.95, 0, { r: 0.1 }); // collar
  }
  if (rage) {
    headband(hd, glowMat(h, 0xff1744), 1.0);
    for (const s of [-1, 1]) hd.box(0.26, 0.1, 0.04, glowMat(h, 0xff1744), s * 0.25, 0.72, 0.62);
  }
  if (bottom && level >= 1 && !slayer) {
    // a wrap-round visor
    band(hd, 0.66, 0.08, 0.3, 1.8, 0x212121, 0.72);
    band(hd, 0.7, 0.04, 0.18, 1.5, glowMat(h, 0x40c4ff), 0.72);
  }
  if (bottom && level >= 2 && !slayer) {
    // Chef Knowledge: a tall puffy chef hat
    hd.cyl(0.68, 0.42, 0xfafafa, 0, 1.12, 0, { seg: 20 });
    hd.cyl(0.66, 0.5, 0xffffff, 0, 1.55, 0, { seg: 20, r2: 0.8 });
    for (const [x, z] of [[-0.35, 0.2], [0.35, 0.2], [0, -0.35], [0, 0.35], [-0.3, -0.25], [0.3, -0.25]]) hd.ball(0.42, 0xffffff, x, 1.9, z, { seg: 10, rows: 7 });
  }
  if (bottom && level >= 4) {
    vest(t, 0x37474f, { pouches: 3, pouch: 0x455a64 });
    shoulderPads(t, 0x455a64, 0.55);
  }
  if (slayer) {
    // the Slayer: a green-visored helmet, an axe on the back, a railgun on the left shoulder
    dome(hd, 0.76, 0.72, 0x263238, 0, 0.74, 0);
    hd.cyl(0.76, 0.78, 0x263238, 0, 0.36, 0, { seg: 22 });
    band(hd, 0.77, 0.05, 0.26, 1.8, glowMat(h, 0x76ff03), 0.72);
    for (const s of [-1, 1]) hd.box(0.1, 0.5, 0.4, 0x37474f, s * 0.78, 0.65, -0.1, { r: 0.03 });
    const dx = -Math.sin(0.5);
    const dy = Math.cos(0.5);
    t.cyl(0.09, 2.8, 0x5d4037, 0.3, 0.1, -0.78, { seg: 8, rz: 0.5 });
    const ax = 0.3 + dx * 1.15;
    const ay = 0.1 + dy * 1.15;
    t.slab(0.95, 0.85, 0.1, 0xb0bec5, ax - 0.35, ay - 0.1, -0.78, { tw: 0.5, rz: 0.5 + PI / 2 });
    t.box(0.18, 0.3, 0.16, INK, ax, ay, -0.78, { rz: 0.5 });
    const g = glowMat(h, 0x29b6f6);
    t.box(0.3, 0.2, 0.6, INK, 1.25, 1.05, 0.0); // mount
    t.box(0.55, 0.5, 2.0, 0x212121, 1.25, 1.35, 0.4, { r: 0.08 });
    t.cyl(0.1, 0.5, STEEL, 1.25, 1.35, 1.6, { axis: 'z', seg: 10 });
    for (let i = 0; i < 3; i++) t.box(0.62, 0.56, 0.12, g, 1.25, 1.35, -0.2 + i * 0.55);
  }
  hd.done();
  t.done();
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    // sneakers with white soles, a seam down the jeans
    boots(b, slayer ? 0x212121 : 0xc62828, { sole: 0xf5f5f5, cuff: slayer ? null : 0xf5f5f5 });
    b.box(0.04, 1.2, 0.04, tone(0x1e3a5f, 1.25), 0.52, -0.7, 0);
    if (bottom && level >= 4) kneePad(b, 0x37474f);
    b.done();
  }
  h.muzzles = [];
  if (bottom && level >= 3) {
    // the AK Shotgun: an AK body with a drum and a fat barrel
    const g = fist(h.rightArm, -1.9, 1.2);
    const gk = wear(h, g, `${key}:gun`);
    const [y, z] = rifle(gk, { len: 2.1, furn: 0x6d4c41, mag: 'drum', optic: slayer ? 'dot' : 'iron', lens: 0x76ff03 });
    gk.cyl(0.11, 0.9, INK, 0, -1.6, z, { seg: 12 });
    gk.done();
    muzzle(h, g, y, z);
    aimLong(h);
    h.tracer = slayer ? 0x76ff03 : 0xffab40;
    return own(h);
  }
  const deagle = top && level >= 3;
  const opts = deagle
    ? { len: 1.2, body: 0xb0bec5, grip: 0x212121, trim: rage ? glowMat(h, 0xff1744) : null }
    : { len: 0.95 };
  for (const arm of top && level >= 4 ? [h.rightArm, h.leftArm] : [h.rightArm]) {
    const g = fist(arm, -1.9, 1.4);
    const gk = wear(h, g, `${key}:gun`);
    const [y, z] = pistol(gk, opts);
    gk.done();
    muzzle(h, g, y, z);
  }
  if (top && level >= 4) aimBoth(h);
  else aimLong(h);
  h.tracer = rage ? 0xff5252 : 0xffe066;
  return own(h, 0.3);
}
export const makeJohnBottom = (level) => makeJohn(level, true);

// ------------------------------------------------------------------ Classic Soldier

/**
 * Classic Soldier (alternate Soldier form): a rifleman in a red beret. Lv 1 webbing, Lv 2 a
 * helmet and goggles, Lv 3 a tactical vest, Lv 4 dark gear with a red-dot rifle.
 */
export function makeSoldierClassic(level) {
  const elite = level >= 4;
  const shirt = elite ? 0x263238 : 0x5d6b3a;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: elite ? 0x1c1c22 : 0x4b5320, arms: shirt, face: 'soldier' });
  const shard = shardOf(h);
  const key = `soldierClassic${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (level >= 2) {
    const hc = elite ? 0x37474f : 0x556b2f;
    helmet(hd, hc, { cover: tone(hc, 0.7) });
    goggles(hd, 1.22, elite ? 0xff5252 : 0x8d6e63, { r: 0.76, strap: tone(hc, 0.6) });
  } else {
    hair(hd, 0x3e2723, { h: 0.4 });
    beret(hd, 0x8e1b1b, shard);
  }
  collar(t, tone(shirt, 0.85));
  pockets(t, tone(shirt, 0.9));
  belt(t, 0x3e2723, 0x9e9e9e);
  canteen(t, 0.82, 0x4b5320);
  if (level >= 1) for (const s of [-1, 1]) sash(t, 0x3e2723, s, 0.26);
  if (level >= 3) {
    vest(t, elite ? 0x37474f : 0x4a5232, { pouches: 3, pouch: elite ? 0x263238 : 0x5d4037 });
    t.box(0.34, 0.34, 0.06, shard, 0.55, 0.5, 0.69);
    pack(t, elite ? 0x263238 : 0x4b5320, { w: 1.3, h: 1.3, d: 0.5 });
  } else t.box(0.34, 0.34, 0.05, shard, 0.5, 0.05, 0.53);
  hd.done();
  t.done();
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    boots(b, elite ? 0x111111 : 0x3e2723);
    if (level >= 3) kneePad(b, elite ? 0x212121 : 0x3b3f2a);
    b.done();
  }
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    armPatch(a, s, tone(shirt, 0.8), s > 0 ? 0x8e1b1b : 0xffd54f);
    if (elite) glove(a, 0x212121);
    a.done();
  }
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = rifle(gk, {
    len: 2.0, furn: elite ? 0x37474f : 0x6d4c41, mag: elite ? 'box' : 'curved', optic: elite ? 'dot' : 'iron',
    lens: 0xff1744, light: elite,
  });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = elite ? 0xff8a65 : 0xffd54f;
  return own(h);
}

// ------------------------------------------------------------------ Ranger

/**
 * Ranger (alternate Soldier form with two paths): a field ranger in a boonie hat with a rifle.
 * Top path: a laser sight at Lv 1, tactical glasses and a scope at Lv 3, a heavy barrel at Lv 4,
 * a belt-fed LMG at Lv 5. Bottom path: a chest rig at Lv 3, grenades at Lv 4, a helmet, heavy
 * armour and an under-barrel launcher at Lv 5.
 */
export function makeSoldierRanger(level, bottom = false) {
  const top = !bottom;
  const lmg = top && level >= 5;
  const heavy = top && level >= 4;
  const armored = bottom && level >= 5;
  const shirt = armored ? 0x3e4a2a : lmg ? 0x2e3b2f : 0x6d7b4a;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: 0x4a3f2c, arms: shirt, face: 'soldier' });
  const shard = shardOf(h);
  const key = `ranger${bottom ? 'B' : 'T'}${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (armored) helmet(hd, 0x3b4530, { cover: 0x55603f });
  else {
    hair(hd, 0x5d4037, { h: 0.4 });
    boonie(hd, 0x7d8a55);
  }
  if (top && level >= 3) shades(hd, 0x263238, 0x37474f, { y: 0.7 });
  collar(t, tone(shirt, 0.85));
  pockets(t, tone(shirt, 0.9));
  belt(t, 0x4e342e, 0x9e9e9e);
  canteen(t, -0.82, 0x55603f);
  t.box(0.34, 0.34, 0.05, shard, 0.5, 0.05, 0.53);
  if (level >= 1) sash(t, 0x4e342e, 1, 0.26);
  if (level >= 2) pack(t, 0x55603f, { w: 1.3, h: 1.35, d: 0.55, roll: 0x6b5a3a });
  if (bottom && level >= 3) {
    // the assault chest rig
    vest(t, 0x4b5530, { pouches: 3, pouch: 0x5d4037 });
    t.box(0.34, 0.34, 0.06, shard, 0.55, 0.5, 0.69);
  }
  if (bottom && level >= 4) for (const x of [-0.55, 0.55]) grenade(t, x, 0.5, 0.84);
  if (armored) shoulderPads(t, 0x37422a);
  if (lmg) {
    // an ammo belt draped from the gun's box over the shoulder
    t.box(0.22, 2.6, 1.14, 0x5d4037, 0, 0, 0, { rz: -0.7 });
    for (let i = -3; i <= 3; i++) t.cyl(0.05, 0.22, GOLD, Math.sin(0.7) * i * 0.32, Math.cos(0.7) * i * 0.32, 0.62, { seg: 6, rz: -0.7 });
  }
  hd.done();
  t.done();
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    boots(b, 0x4e342e);
    if (level >= 3) kneePad(b, 0x3b3f2a);
    b.done();
  }
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    armPatch(a, s, tone(shirt, 0.8), 0x2e7d32);
    if (armored) a.box(1.1, 0.55, 1.1, 0x37422a, 0, -0.35, 0, { r: 0.1 });
    a.done();
  }
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const len = lmg ? 2.5 : heavy ? 2.35 : 2.05;
  const [y, z] = rifle(gk, {
    len, furn: lmg ? 0x37474f : 0x6d4c41, mag: lmg ? false : 'curved', optic: top && level >= 3 ? 'scope' : 'iron',
  });
  if (heavy) gk.cyl(0.1, 0.8, STEEL, 0, -len + 0.55, z, { seg: 12 }); // heavy barrel
  if (lmg) {
    // a box magazine, feed cover and a folded bipod
    gk.box(0.5, 0.55, 0.5, 0x37474f, 0.12, -0.55, UP - 0.42, { r: 0.05 });
    gk.box(0.36, 0.5, 0.12, INK, 0, -0.35, UP + 0.2);
    for (const s of [-1, 1]) gk.cyl(0.025, 0.6, INK, s * 0.08, -len + 0.85, z - 0.12, { seg: 5 });
    gk.cyl(0.05, 0.5, INK, 0, -0.95, UP + 0.32, { axis: 'x', seg: 6 }); // carry handle
  }
  if (top && level >= 1) {
    gk.box(0.14, 0.24, 0.14, INK, 0.22, -1.3, UP, { r: 0.02 });
    gk.cyl(0.04, 0.03, glowMat(h, 0xff1744), 0.22, -1.43, UP, { seg: 8 });
  }
  if (armored) {
    // the under-barrel grenade launcher
    gk.cyl(0.13, 0.9, 0x263238, 0, -1.25, UP - 0.26, { seg: 12 });
    gk.cyl(0.09, 0.02, INK, 0, -1.71, UP - 0.26, { seg: 12 });
    gk.box(0.1, 0.12, 0.2, INK, 0, -0.85, UP - 0.38);
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = heavy || (bottom && level >= 3) ? 0xffab40 : 0xffd54f;
  h.projectile = { color: armored ? 0xff6d00 : 0x33691e, size: 0.45, arc: 3.5 };
  return own(h);
}
export const makeSoldierRangerBottom = (level) => makeSoldierRanger(level, true);

// ------------------------------------------------------------------ Quarterer

/**
 * Quarterer (alternate Soldier form): a gunslinger with two pistols. Lv 1 fingerless gloves,
 * Lv 2 a bandana, Lv 3 shades, a gun belt and holsters, Lv 4 a long duster coat and drum-mag
 * pistols, Lv 5 a black coat with purple-trimmed guns.
 */
export function makeQuarterer(level) {
  const storm = level >= 5;
  const coat = level >= 4;
  const shirt = storm ? 0x1c1726 : coat ? 0x5d4037 : 0x546e7a;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: storm ? 0x14101c : 0x263238, arms: shirt, face: 'soldier' });
  const shard = shardOf(h);
  const key = `quarterer${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const rag = storm ? 0x4a148c : 0xb71c1c;
  if (level >= 2) {
    // a bandana over the hair, knotted at the back
    hair(hd, rag, { h: 0.48, back: false });
    for (let i = 0; i < 5; i++) hd.ball(0.04, 0xffffff, Math.sin(i * 1.3) * 0.6, 1.08 + (i % 2) * 0.12, Math.cos(i * 1.3) * 0.32, { seg: 6, rows: 4 });
    hd.ball(0.16, tone(rag, 0.85), 0.25, 1.0, -0.7, { seg: 8, rows: 6 });
    for (const s of [-1, 1]) hd.box(0.14, 0.45, 0.05, rag, 0.25 + s * 0.1, 0.72, -0.74, { rz: s * 0.3 });
  } else hair(hd, 0x1a1209, { h: 0.42 });
  if (level >= 3) shades(hd, 0x9e9e9e, 0x111111);
  collar(t, tone(shirt, 0.85), { button: 0xcfd8dc });
  t.box(0.34, 0.34, 0.05, shard, 0.55, 0.45, 0.53);
  if (level >= 3) {
    // a gun belt slung low with two holsters
    belt(t, 0x3e2723, 0xb0b0b0, -0.92);
    for (let i = -4; i <= 4; i++) if (Math.abs(i) > 0) t.cyl(0.05, 0.2, GOLD, i * 0.18, -0.92, 0.6, { seg: 6 });
    for (const s of [-1, 1]) {
      t.box(0.36, 0.75, 0.48, LEATHER, s * 1.18, -1.25, 0.1, { r: 0.06 });
      t.box(0.4, 0.14, 0.52, tone(LEATHER, 0.7), s * 1.18, -0.92, 0.1);
    }
  } else belt(t, 0x212121, 0x9e9e9e);
  if (coat) {
    duster(t, storm ? 0x14101c : 0x4e342e, { trim: storm ? shard : null });
    t.box(0.34, 0.34, 0.06, shard, 0.55, 0.45, 0.6);
  }
  hd.done();
  t.done();
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    boots(b, storm ? 0x111111 : 0x3e2723, { heel: coat });
    b.done();
  }
  if (level >= 1) {
    for (const arm of [h.rightArm, h.leftArm]) {
      const gl = wear(h, arm, `${key}:glove`);
      glove(gl, 0x212121);
      for (let i = -1; i <= 2; i++) gl.box(0.18, 0.12, 0.2, 0xc68642, i * 0.22 - 0.1, -2.04, 0.3); // bare fingertips
      gl.done();
    }
  }
  const opts = { len: 1.0, body: storm ? 0x37474f : GUNMETAL, trim: storm ? shard : null, laser: level >= 3 ? 0xff1744 : null };
  h.muzzles = [];
  for (const arm of [h.rightArm, h.leftArm]) {
    const g = fist(arm, -1.9, 1.35);
    const gk = wear(h, g, `${key}:gun`);
    const [y, z] = pistol(gk, opts);
    if (coat) {
      gk.cyl(0.3, 0.24, 0x424242, 0, 0.0, 0.3 - 0.62, { axis: 'x', seg: 14 });
      gk.cyl(0.1, 0.26, INK, 0, 0.0, 0.3 - 0.62, { axis: 'x', seg: 8 });
    }
    gk.done();
    muzzle(h, g, y, z);
  }
  aimBoth(h);
  h.tracer = storm ? 0xb388ff : 0xffe066;
  return own(h, 0.3);
}

// ------------------------------------------------------------------ Operator

/**
 * Operator (two paths): a tactical soldier in a plate carrier with a semi-auto rifle.
 * Top path: pouches and knee pads at Lv 1, a helmet with NVGs at Lv 2, an assault rifle at Lv 3,
 * a black Special Forces kit with a balaclava at Lv 4, a Ghost suit with a hood, skull mask and
 * glowing optics at Lv 5. Bottom path: heavy armour and a helmet at Lv 1, a UMP-45 at Lv 2, a
 * radio pack at Lv 3, a burst rifle with a laser at Lv 4, an X-Captain beret with gold trim at Lv 5.
 */
export function makeOperatorTower(level, bottom = false) {
  const top = !bottom;
  const ghost = top && level >= 5;
  const sf = top && level >= 4;
  const captain = bottom && level >= 5;
  const shirt = ghost ? 0x15171c : sf ? 0x22262b : captain ? 0x2f3a28 : 0x5b6640;
  const h = makeHumanoid({ skin: 0xc8956a, shirt, pants: ghost ? 0x101216 : sf ? 0x1b1e22 : 0x3e4430, arms: shirt, face: 'soldier' });
  const key = `operator${bottom ? 'B' : 'T'}${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const vc = ghost ? 0x0c0d10 : sf ? 0x2b2f35 : 0x4a5233;
  vest(t, vc, { pouches: top && level >= 1 ? 3 : 2, pouch: ghost ? 0x15171c : 0x3b4029, patch: captain ? GOLD : null });
  belt(t, INK, 0x757575);
  pouch(t, 0.75, -0.95, 0.52, 0.32, 0.34, tone(vc, 0.9));
  if (bottom && level >= 1) {
    // heavy armour: shoulder plates, a thick front plate and a groin flap
    shoulderPads(t, 0x39412b, 0.62);
    t.box(1.7, 1.05, 0.2, 0x39412b, 0, 0.25, 0.72, { r: 0.06 });
    t.box(0.7, 0.45, 0.12, 0x39412b, 0, -1.2, 0.55, { r: 0.04 });
  }
  if (bottom && level >= 3) {
    // the radio pack that calls in the vehicles
    pack(t, 0x3b4029, { w: 1.3, h: 1.3, d: 0.6 });
    radio(t, 0.45, 0.85, -1.12, 0x2f3a28, 2.4);
  }
  if (captain) {
    for (const s of [-1, 1]) t.box(0.5, 0.08, 1.0, GOLD, s * 1.45, 1.05, 0); // gold epaulettes
    t.box(2.2, 0.08, 1.2, GOLD, 0, 0.82, 0);
    hair(hd, 0x1a1209, { h: 0.4 });
    beret(hd, 0x7b1f1f, glowMat(h, 0xffd54f));
    shades(hd, GOLD, 0x111111);
  } else if (ghost) {
    // the Ghost: a deep hood, a skull mask and glowing optics
    dome(hd, 0.78, 0.82, 0x0c0d10, 0, 0.7, -0.04);
    hd.cyl(0.78, 0.7, 0x0c0d10, 0, 0.35, -0.04, { seg: 20, open: true });
    band(hd, 0.64, 0.06, 0.62, 2.2, 0xe0e0e0, 0.32);
    for (let i = -2; i <= 2; i++) hd.box(0.04, 0.2, 0.04, INK, i * 0.1, 0.22, 0.68);
    hd.box(0.6, 0.16, 0.06, INK, 0, 0.42, 0.66);
    const gl = glowMat(h, 0x00e676);
    for (const s of [-1, 1]) {
      hd.cyl(0.13, 0.22, 0x111111, s * 0.24, 0.78, 0.72, { axis: 'z', seg: 12 });
      hd.cyl(0.1, 0.02, gl, s * 0.24, 0.78, 0.84, { axis: 'z', seg: 12 });
    }
    hd.box(0.14, 0.08, 0.1, 0x111111, 0, 0.78, 0.72);
  } else if ((top && level >= 2) || bottom) {
    if (bottom && level < 1) {
      cap(hd, 0x5b6640);
    } else {
      const hc = sf ? 0x1b1e22 : 0x4a5233;
      helmet(hd, hc, { cover: tone(hc, 0.7), band: false });
      for (const s of [-1, 1]) hd.box(0.08, 0.14, 0.5, INK, s * 0.75, 1.05, 0); // side rails
      if (top) nvg(hd, glowMat(h, 0x76ff03), !sf);
      else headset(hd, 0x2f3a28);
    }
  } else {
    hair(hd, 0x3e2723, { h: 0.4 });
    cap(hd, 0x5b6640);
  }
  if (sf && !ghost) band(hd, 0.64, 0.06, 0.5, 2.4, 0x111111, 0.3); // balaclava
  hd.done();
  t.done();
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    boots(b, ghost || sf ? 0x0c0c0c : 0x3e2723);
    if ((top && level >= 1) || (bottom && level >= 1)) kneePad(b, ghost ? 0x0c0d10 : sf ? 0x212121 : 0x3b4029);
    if (ghost) b.box(0.4, 0.5, 0.2, 0x15171c, -0.52, -0.6, 0.1, { r: 0.04 }); // thigh holster
    b.done();
  }
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    glove(a, ghost || sf ? 0x111111 : 0x3b4029);
    if (!ghost) armPatch(a, s, tone(shirt, 0.8), captain ? GOLD : 0x9e9e9e);
    a.done();
  }
  const smg = bottom && level === 2;
  const big = (top && level >= 3) || (bottom && level >= 3);
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = rifle(gk, {
    len: smg ? 1.45 : ghost ? 2.3 : big ? 2.15 : 1.9,
    body: ghost ? 0x0b0b0b : GUNMETAL,
    furn: ghost || sf ? 0x1a1a1a : smg ? GUNMETAL : 0x5d4037,
    mag: smg ? 'box' : big ? 'curved' : 'box',
    stock: true,
    optic: ghost ? 'scope' : top && level >= 2 ? 'dot' : 'iron',
    lens: ghost ? 0x00e676 : 0xff5252,
    can: ghost,
    light: sf || (bottom && level >= 4),
  });
  if (bottom && level >= 4) {
    gk.box(0.14, 0.24, 0.14, INK, 0.22, -1.25, UP, { r: 0.02 });
    gk.cyl(0.04, 0.03, glowMat(h, 0xff1744), 0.22, -1.38, UP, { seg: 8 });
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = ghost ? 0x00e676 : sf ? 0xffab40 : 0xffd54f;
  return own(h);
}
export const makeOperatorBottom = (level) => makeOperatorTower(level, true);

// ------------------------------------------------------------------ Marksman

/**
 * Marksman: a sniper with a long bolt-action rifle. Lv 1 round specs and a spotter pack with a
 * rangefinder, Lv 2 a ghillie shawl and a bandolier, Lv 3 a black rifle with a big scope, a
 * bipod and a suppressor, Lv 4 the Cyber Hunter: a helmet with a red T-visor, armour, a cape
 * and a pulse rifle.
 */
export function makeMarksman(level) {
  const cyber = level >= 4;
  const tan = 0x8d7b55;
  const h = makeHumanoid(
    cyber
      ? { skin: 0x8d5524, shirt: 0x212121, pants: 0x151515, arms: 0x2c2c2c, face: 'soldier' }
      : { skin: 0x8d5524, shirt: tan, pants: 0x5a4d35, arms: tan, face: 'soldier' },
  );
  const key = `marksman${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const red = glowMat(h, 0xff1744);
  if (cyber) {
    const steel = 0x546e7a;
    dome(hd, 0.76, 0.74, steel, 0, 0.74, 0);
    hd.cyl(0.76, 0.78, steel, 0, 0.36, 0, { seg: 22 });
    hd.box(1.0, 0.18, 0.08, red, 0, 0.8, 0.75);
    hd.box(0.18, 0.5, 0.08, red, 0, 0.48, 0.75);
    hd.box(1.06, 0.26, 0.1, 0x37474f, 0, 0.8, 0.72);
    for (const s of [-1, 1]) hd.cyl(0.16, 0.14, 0x37474f, s * 0.78, 0.7, 0, { axis: 'x', seg: 12 });
    hd.box(0.06, 0.8, 0.06, INK, 0.8, 1.2, -0.1); // rangefinder stalk
    hd.box(0.2, 0.16, 0.2, red, 0.8, 1.62, -0.1);
    t.box(2.2, 1.55, 1.2, steel, 0, 0.2, 0, { r: 0.16 });
    for (let i = 0; i < 3; i++) t.box(1.4, 0.2, 0.1, tone(steel, 0.8), 0, -0.45 - i * 0.24, 0.55, { r: 0.04 });
    t.cyl(0.18, 0.08, red, 0.55, 0.5, 0.62, { axis: 'z', seg: 12 });
    shoulderPads(t, steel, 0.55);
    t.slab(2.0, 2.6, 0.1, 0x4a1010, 0, -0.65, -0.66, { bw: 1.3 }); // cape
    t.box(2.0, 0.2, 0.2, 0x37474f, 0, 0.88, -0.6); // cape clasp bar
    belt(t, 0x212121, 0xff1744);
  } else {
    hair(hd, 0x1a1209, { h: 0.4 });
    boonie(hd, 0x6b5d3f, { y: 1.0 });
    collar(t, tone(tan, 0.85));
    pockets(t, tone(tan, 0.9));
    belt(t, 0x4e342e, 0x9e9e9e);
    if (level >= 1) {
      specs(hd, 0x3e2723, 0xb3e5fc);
      // the spotter pack with a rangefinder on top
      pack(t, 0x6b5d3f, { w: 1.3, h: 1.45, d: 0.6 });
      t.box(0.5, 0.32, 0.65, 0x263238, 0.4, 0.95, -0.82, { r: 0.04 });
      for (const s of [-1, 1]) t.cyl(0.1, 0.12, INK, 0.4 + s * 0.13, 0.95, -0.44, { axis: 'z', seg: 10 });
    }
    if (level >= 2) {
      // a ghillie shawl of leafy tufts and a bandolier
      t.box(2.3, 0.5, 1.3, 0x556b2f, 0, 0.82, 0, { r: 0.12 });
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * PI * 2;
        t.box(0.3, 0.42, 0.08, i % 2 ? 0x556b2f : 0x6b8e23, Math.sin(a) * 1.12, 0.55, Math.cos(a) * 0.66, { ry: a, rx: 0.3 });
      }
      t.box(0.25, 2.4, 1.12, 0x4e342e, 0, 0, 0, { rz: 0.7 });
      for (let i = -2; i <= 2; i++) t.cyl(0.05, 0.22, GOLD, -Math.sin(0.7) * i * 0.36, Math.cos(0.7) * i * 0.36, 0.62, { seg: 6, rz: 0.7 });
    }
  }
  hd.done();
  t.done();
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    if (cyber) {
      b.box(1.08, 0.75, 1.12, 0x37474f, 0, -1.6, 0.02, { r: 0.1 });
      b.box(1.12, 0.14, 1.2, INK, 0, -1.96, 0.06);
      kneePad(b, 0x546e7a);
    } else boots(b, 0x4e342e);
    b.done();
  }
  if (level >= 2) {
    for (const arm of [h.rightArm, h.leftArm]) {
      const gl = wear(h, arm, `${key}:glove`);
      glove(gl, cyber ? 0x37474f : 0x5d4037);
      gl.done();
    }
  }
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const len = cyber ? 2.7 : level >= 3 ? 2.95 : 2.55;
  const [y, z] = boltRifle(gk, {
    len,
    wood: cyber ? 0x37474f : level >= 3 ? 0x212121 : 0x5d4037,
    scope: level >= 3 ? 1.25 : 1.0,
    lens: cyber ? 0xff1744 : 0x4fc3f7,
    can: level === 3,
    brake: cyber,
    bipod: level >= 3,
  });
  if (cyber) for (let i = 0; i < 3; i++) gk.torus(0.15, 0.05, red, 0, -1.1 - i * 0.42, z, { rx: PI / 2, seg: 14 }); // pulse coils
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = cyber ? 0xff1744 : 0xffffff;
  return own(h);
}

// ------------------------------------------------------------------ Hunter

/**
 * Hunter (alternate Marksman form): a woodsman in a blaze-orange cap with a hunting rifle.
 * Lv 1 a scope, Lv 2 a survival pack and bedroll, Lv 3 a camo poncho and a longer rifle, Lv 4 a
 * dark night-hunter outfit with glowing night-vision goggles.
 */
export function makeHunter(level) {
  const night = level >= 4;
  const shirt = night ? 0x212121 : level >= 3 ? 0x5a6b34 : 0x8b5a2b;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: night ? 0x1a1a1a : 0x4e3b26, arms: shirt, face: 'soldier' });
  const shard = shardOf(h);
  const key = `hunter${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x6d4c41, { h: 0.4 });
  cap(hd, night ? 0x263238 : 0xff6f00);
  hd.box(0.26, 0.26, 0.05, shard, 0, 1.18, 0.64, { rx: -0.35 });
  if (night) {
    nvg(hd, glowMat(h, 0x76ff03));
  } else {
    // a short beard
    hd.box(0.9, 0.3, 0.12, 0x6d4c41, 0, 0.18, 0.58, { r: 0.05 });
    for (const s of [-1, 1]) hd.box(0.12, 0.4, 0.4, 0x6d4c41, s * 0.6, 0.35, 0.3);
  }
  if (!night && level < 3) {
    // a flannel shirt: dark check lines
    for (let i = 0; i < 4; i++) t.box(2.04, 0.06, 1.04, tone(shirt, 0.65), 0, 0.7 - i * 0.45, 0);
    for (const x of [-0.6, 0, 0.6]) t.box(0.06, 1.9, 1.04, tone(shirt, 0.65), x, 0, 0);
  }
  collar(t, tone(shirt, 0.8));
  belt(t, LEATHER, 0xb0b0b0);
  t.box(0.34, 0.34, 0.05, shard, 0.5, 0.05, 0.53);
  // a knife on the hip
  t.box(0.18, 0.55, 0.16, LEATHER, 0.85, -1.15, 0.45, { r: 0.04 });
  t.box(0.12, 0.25, 0.12, 0x3e2723, 0.85, -0.75, 0.45);
  if (level >= 2) {
    pack(t, night ? 0x263238 : 0x6d4c41, { w: 1.4, h: 1.6, d: 0.7, roll: night ? 0x37474f : 0x33691e });
    t.cyl(0.03, 1.0, STEEL, -0.75, 0.2, -1.1, { seg: 6 }); // tent pole
  }
  if (level >= 3) {
    // a camo poncho over the shoulders
    const pc = night ? 0x2e3b2e : 0x556b2f;
    t.slab(2.4, 1.1, 1.36, pc, 0, 0.45, 0, { bw: 1.2 });
    for (const [x, y, z, c] of [[-0.6, 0.6, 0.69, 0x3e4a2a], [0.5, 0.3, 0.7, 0x6d5d3a], [0.1, 0.75, 0.68, 0x3e4a2a], [-0.3, 0.2, 0.71, 0x6d5d3a]]) t.box(0.42, 0.24, 0.04, night ? tone(c, 0.6) : c, x, y, z, { rz: x });
    t.cyl(0.66, 0.2, tone(pc, 0.85), 0, 0.98, 0, { seg: 16 }); // neck hole hem
  }
  hd.done();
  t.done();
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    boots(b, night ? 0x111111 : 0x5d4037, { cuff: night ? null : 0x8d6e63 });
    b.done();
  }
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = boltRifle(gk, {
    len: level >= 3 ? 2.95 : 2.55,
    wood: night ? 0x263238 : 0x8d5a2b,
    scope: level >= 1 ? 0.9 : false,
    lens: night ? 0x76ff03 : 0x4fc3f7,
    brake: level >= 3,
  });
  // a leather sling under the rifle
  gk.tube([[0, 0.7, UP - 0.28], [0, -0.2, UP - 0.55], [0, -1.2, UP - 0.25]], 0.025, LEATHER, { seg: 8, sides: 4 });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = night ? 0xb2ff59 : 0xfff59d;
  h.tracerWidth = level >= 2 ? 0.24 : undefined;
  return own(h);
}
