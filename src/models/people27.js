// Tower models: people, batch 27 (dressed with the vehicle kit in ../vehicles.js).
// In here: Priest, Farmer, Bandit, Eradicator, Shrapnel Grenadier, Warrior, Mage, Snowman, Infernus,
// Spearman.
// Like batch 26 these are plain white figures with no face: only their gear tells them apart,
// white too, with accents in one neon colour per tower. (The Mage is not one of them: it has
// normal colours.)
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.

import { glowMat } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { UP, aimLong, dome, fist, goggles, helmet, muzzle, own, wear } from './people1.js';
import { shoulderPads } from './people2.js';
import { throwPose } from './people6.js';
import { feet, hands, hood } from './people5.js';
import { cape } from './people18.js';

const PI = Math.PI;
const W = 0xffffff;
const W2 = 0xf2f2f2;
const W3 = 0xe4e4e4;

/** A plain white figure with no face. */
const blank = () => makeHumanoid({ skin: W, shirt: W, pants: W2, arms: W, face: 'none' });

// ------------------------------------------------------------------ Priest (neon teal)

const PRIEST_NEON = 0x1de9b6;

/**
 * Priest: a white cleric in a long robe with a staff topped by a glowing orb (its blessing link
 * comes from the orb). Lv 1 Lesser Blessing: a stole with neon trim. Lv 2 Holy Favor: a shoulder
 * mantle and a holy book on the belt. Lv 3 Divinity: a tall hat and a bigger staff head. Lv 4
 * Guardian Angel: a halo and white wings with neon edges.
 */
export function makePriest(level) {
  const h = blank();
  const key = `priest${level}`;
  const neon = glowMat(h, PRIEST_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (level >= 3) {
    // Divinity: a tall pointed hat with a neon cross
    hd.cyl(0.62, 1.1, W, 0, 1.35, 0, { seg: 16, r2: 0.25, sz: 0.7 });
    hd.cyl(0.64, 0.12, W3, 0, 0.86, 0, { seg: 16, sz: 0.72 });
    hd.box(0.08, 0.5, 0.04, neon, 0, 1.35, 0.48);
    hd.box(0.3, 0.08, 0.04, neon, 0, 1.45, 0.48);
  } else hood(hd, W2);
  if (level >= 4) {
    // Guardian Angel: a glowing halo
    hd.torus(0.6, 0.06, neon, 0, 2.15, -0.05, { rx: PI / 2, seg: 28 });
  }
  // a long robe with a rope belt
  t.box(2.1, 1.7, 1.14, W, 0, 0.1, 0, { r: 0.12 });
  t.slab(2.3, 1.9, 1.2, W2, 0, -1.6, 0, { bw: 1.3 }); // robe skirt down over the legs
  t.box(2.14, 0.16, 1.16, W3, 0, -0.78, 0, { r: 0.05 }); // rope belt
  for (const s of [-1, 1]) t.cyl(0.05, 0.7, W3, s * 0.25, -1.15, 0.6, { seg: 5 }); // belt tassels
  t.ball(0.09, neon, 0, -0.78, 0.6, { seg: 8, rows: 5 }); // belt knot
  if (level >= 1) {
    // Lesser Blessing: a stole hanging down the front with neon trim
    for (const s of [-1, 1]) {
      t.box(0.32, 2.3, 0.06, W, s * 0.38, -0.3, 0.6);
      t.box(0.06, 2.3, 0.07, neon, s * 0.52, -0.3, 0.61);
      t.box(0.24, 0.24, 0.07, neon, s * 0.38, -1.3, 0.62); // little crosses at the ends
    }
  }
  if (level >= 2) {
    // Holy Favor: a shoulder mantle and a book on the belt
    t.cyl(1.25, 0.5, W3, 0, 0.75, 0, { seg: 18, r2: 1.05, sz: 0.6 });
    t.cyl(1.26, 0.06, neon, 0, 0.52, 0, { seg: 18, sz: 0.6 });
    t.box(0.5, 0.62, 0.18, W2, 0.8, -1.05, 0.5, { r: 0.03 }); // book
    t.box(0.06, 0.3, 0.04, neon, 0.8, -1.05, 0.6);
  }
  if (level >= 4) {
    // Guardian Angel: two white wings with neon edges
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const len = 2.4 - i * 0.4;
        t.box(0.5, len, 0.08, i % 2 ? W3 : W, s * (0.9 + i * 0.35), 0.9 - i * 0.25, -0.75 - i * 0.05, { rz: s * (1.1 - i * 0.15), r: 0.04 });
      }
      t.box(0.08, 2.4, 0.1, neon, s * 1.15, 1.2, -0.74, { rz: s * 1.1 });
    }
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => {
    a.cyl(0.6, 0.9, W, 0, -1.1, 0, { seg: 12, r2: 0.75 }); // wide robe sleeves
    if (level >= 1) a.torus(0.74, 0.04, neon, 0, -1.55, 0, { seg: 14 });
  });
  feet(h, key, W2);
  // the staff, upright in the right fist, the orb on top
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.1);
  const gk = wear(h, g, `${key}:staff`);
  gk.cyl(0.08, 4.2, W2, 0, -0.3, 0, { seg: 10 });
  for (const yy of [0.3, -0.9]) gk.torus(0.1, 0.03, W3, 0, yy, 0, { seg: 10 });
  const top = -2.4;
  const big = level >= 3 ? 1.3 : 1;
  gk.torus(0.32 * big, 0.06, W, 0, top, 0, { seg: 18 }); // ring around the orb
  gk.ball(0.22 * big, neon, 0, top, 0, { seg: 12, rows: 8 }); // the glowing orb
  if (level >= 3) for (const s of [-1, 1]) gk.box(0.06, 0.5, 0.06, W3, s * 0.42, top - 0.2, 0, { rz: s * 0.5 }); // little wings on the head
  gk.done();
  muzzle(h, g, top, 0);
  h.rightArm.rotation.set(-0.9, 0, 0.15);
  h.leftArm.rotation.set(-0.5, 0, -0.2);
  h.pose = { right: -0.9, left: -0.5, leftRecoil: 0 };
  h.medi = PRIEST_NEON;
  h.tracer = PRIEST_NEON;
  return own(h, 0);
}

// ------------------------------------------------------------------ Farmer (neon lime)

const FARMER_NEON = 0xc6ff00;

/**
 * Farmer: a white farmer in a wide straw-style hat and overalls with a scythe. Lv 1 Plantation:
 * work gloves and a seed pouch. Lv 2 Farming Skillz: a basket of neon crops on the back. Lv 3
 * Farmers Organization: a bandana and a badge. Lv 4 Shadow Reaper of the Rice Dimension: a hooded
 * reaper cloak and a huge scythe with a glowing blade.
 */
export function makeFarmer(level) {
  const h = blank();
  const key = `farmer${level}`;
  const neon = glowMat(h, FARMER_NEON);
  const reaper = level >= 4;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (reaper) {
    hood(hd, W2);
    hd.cyl(0.9, 0.06, neon, 0, 0.45, -0.05, { seg: 20, r2: 0.86 }); // neon hood hem
  } else {
    // a wide flat hat with a neon band
    hd.cyl(1.35, 0.08, W2, 0, 1.0, 0, { seg: 24 });
    dome(hd, 0.72, 0.55, W, 0, 1.0, 0);
    hd.cyl(0.73, 0.12, neon, 0, 1.08, 0, { seg: 20 });
  }
  if (level >= 3 && !reaper) hd.box(1.4, 0.3, 0.1, W3, 0, 0.35, 0.62, { r: 0.05 }); // bandana
  // a shirt and overalls with straps and a bib pocket
  t.box(2.1, 1.6, 1.12, W, 0, 0.1, 0, { r: 0.1 });
  t.box(1.4, 1.1, 0.12, W2, 0, -0.25, 0.58, { r: 0.04 }); // bib
  t.box(0.6, 0.4, 0.06, W3, 0, -0.1, 0.65, { r: 0.03 }); // pocket
  for (const s of [-1, 1]) {
    t.box(0.22, 1.2, 0.08, W2, s * 0.55, 0.55, 0.58); // straps
    t.cyl(0.08, 0.06, neon, s * 0.55, 0.3, 0.63, { axis: 'z', seg: 8 }); // neon buttons
  }
  t.box(2.12, 0.26, 1.14, W2, 0, -0.85, 0, { r: 0.04 });
  if (level >= 1) {
    // Plantation: a seed pouch on the hip
    t.box(0.5, 0.5, 0.36, W3, -1.0, -0.85, 0.2, { r: 0.08 });
    t.box(0.52, 0.06, 0.38, neon, -1.0, -0.65, 0.2);
  }
  if (level >= 2 && !reaper) {
    // Farming Skillz: a basket of neon crops on the back
    t.cyl(0.65, 1.0, W3, 0, 0.1, -0.95, { seg: 14, r2: 0.55 });
    for (let i = 0; i < 6; i++) t.cyl(0.66, 0.04, W2, 0, -0.3 + i * 0.16, -0.95, { seg: 14 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      t.ball(0.2, neon, Math.cos(a) * 0.35, 0.7, -0.95 + Math.sin(a) * 0.35, { seg: 8, rows: 5 });
    }
    for (const s of [-1, 1]) t.box(0.12, 1.4, 0.06, W3, s * 0.6, 0.2, -0.6, { rz: s * 0.1 }); // basket straps
  }
  if (level >= 3) {
    // Farmers Organization: a badge
    t.cyl(0.18, 0.06, W, 0.5, 0.45, 0.64, { axis: 'z', seg: 12 });
    t.cyl(0.1, 0.07, neon, 0.5, 0.45, 0.66, { axis: 'z', seg: 10 });
  }
  if (reaper) {
    // Shadow Reaper: a long cloak over everything
    cape(t, W2, 2.8, { w: 2.4, tatter: true, clasp: FARMER_NEON });
    t.box(2.5, 0.06, 0.05, neon, 0, -1.78, -0.8);
  }
  hd.done();
  t.done();
  hands(h, key, level >= 1 ? W3 : null, W2, (a) => {
    if (level >= 1) a.box(0.5, 0.06, 0.06, neon, 0, -1.25, 0.6); // glove cuffs
  });
  feet(h, key, W3, (b) => b.box(1.12, 0.1, 1.14, neon, 0, -1.3, 0.02)); // neon boot tops
  // the scythe, held in both hands
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, reaper ? 1.25 : 1.1);
  const gk = wear(h, g, `${key}:scythe`);
  const len = reaper ? 4.0 : 3.6;
  gk.cyl(0.08, len, W2, 0, -len / 2 + 0.6, 0, { seg: 10 }); // handle
  gk.box(0.12, 0.3, 0.5, W3, 0, -0.9, 0.2, { r: 0.03 }); // side grip
  const hy = -len + 0.6;
  gk.box(0.2, 0.3, 0.3, W3, 0, hy, 0, { r: 0.04 });
  const blade = [[0, 0.1], [0.5, 0.2], [1.1, 0.1], [1.6, -0.2], [1.85, -0.55], [1.45, -0.25], [0.9, -0.08], [0.3, -0.1]].map(([z, y]) => [z * (reaper ? 1.3 : 1), -y * (reaper ? 1.3 : 1)]); // tip curves back down
  gk.prism(blade, 0.06, reaper ? neon : W, 0, hy, 0, { bevel: 0.01 });
  if (!reaper) gk.box(0.05, 0.05, 1.5, neon, 0, hy + 0.05, 0.8, { rx: -0.15 }); // neon edge
  gk.done();
  muzzle(h, g, hy, 1);
  h.rightArm.rotation.set(-1.2, 0, 0.2);
  h.leftArm.rotation.set(-1.0, 0, -0.5);
  h.pose = { right: -1.2, left: -1.0, leftRecoil: 0 };
  h.melee = true;
  h.tracer = FARMER_NEON;
  return own(h, 0);
}

// ------------------------------------------------------------------ Bandit (neon blue)

const BANDIT_NEON = 0x2979ff;

/** A white revolver on the fist (gun space). o.twin: two barrels. Returns the bore point [y, z]. */
function whiteRevolver(k, neon, o = {}) {
  const U = 0.3;
  const len = 1.1;
  k.box(0.24, 0.5, 0.3, W2, 0, -0.05, U, { r: 0.04 }); // frame
  k.cyl(0.18, 0.34, W3, 0, -0.1, U + 0.02, { seg: 12 }); // cylinder
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    k.cyl(0.04, 0.35, W, Math.cos(a) * 0.12, -0.1, U + 0.02 + Math.sin(a) * 0.12, { seg: 5 });
  }
  const barrels = o.twin ? [-0.07, 0.07] : [0];
  for (const x of barrels) k.cyl(0.06, len, W, x, -len / 2 - 0.2, U + 0.08, { seg: 10 });
  k.box(0.04, 0.8, 0.05, neon, 0, -0.65, U + 0.17); // neon rib along the top
  k.box(0.22, 0.24, 0.56, W3, 0, 0.22, U - 0.36, { rx: -0.4, r: 0.05 }); // grip
  k.torus(0.09, 0.02, W3, 0, -0.02, U - 0.22, { ry: PI / 2, seg: 10, arc: PI });
  return [-len - 0.2, U + 0.08];
}

/** A white sabre in the fist (blade down -y). o.glow: the whole blade glows. */
function whiteSabre(k, neon, o = {}) {
  k.cyl(0.08, 0.5, W3, 0, 0.1, 0, { seg: 8 }); // grip
  k.torus(0.2, 0.04, W2, 0, -0.2, 0.05, { ry: PI / 2, seg: 12, arc: PI }); // knuckle guard
  k.box(0.5, 0.08, 0.14, W2, 0, -0.2, 0); // crossguard
  const blade = [[0.06, 0], [0.06, -1.6], [0.0, -2.3], [-0.08, -1.7], [-0.06, 0]];
  k.prism(blade, 0.04, o.glow ? neon : W, 0, -0.25, 0);
  if (!o.glow) k.box(0.03, 1.5, 0.05, neon, 0, -1.05, 0.06); // neon edge
}

/**
 * Bandit (alternate Scout): a white outlaw in a wide hat with a revolver. Lv 1 Combat Ready:
 * a bandana over the face and a gun belt. Lv 2 Bladeworks: a sabre in the other hand. Lv 3
 * Twinshot: a double-barrel revolver and a neon hat band. Lv 4 Combat Mastery: a poncho and
 * bullet belt. Lv 5 Potential: a long coat and a glowing sabre.
 */
export function makeBandit(level) {
  const h = blank();
  const key = `bandit${level}`;
  const neon = glowMat(h, BANDIT_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // a wide hat with a dented crown
  hd.cyl(1.25, 0.08, W2, 0, 1.0, 0, { seg: 24, sz: 1.1 });
  hd.cyl(0.66, 0.6, W, 0, 1.3, 0, { seg: 18, r2: 0.6 });
  hd.box(0.5, 0.1, 0.9, W3, 0, 1.6, 0, { r: 0.05 }); // dent
  hd.cyl(0.67, level >= 3 ? 0.12 : 0.08, level >= 3 ? neon : W3, 0, 1.08, 0, { seg: 18 });
  if (level >= 1) {
    // a bandana over the lower face, tied behind
    hd.box(1.5, 0.5, 0.12, W2, 0, 0.35, 0.62, { r: 0.06 });
    hd.box(0.6, 0.1, 0.05, neon, 0, 0.22, 0.69);
    hd.box(0.3, 0.4, 0.1, W2, 0, 0.35, -0.7, { r: 0.05 });
  }
  // shirt, vest and a belt
  t.box(2.1, 1.6, 1.12, W, 0, 0.1, 0, { r: 0.1 });
  for (const s of [-1, 1]) t.box(0.75, 1.4, 0.1, W2, s * 0.6, 0.15, 0.58, { r: 0.04 }); // vest
  t.box(2.12, 0.26, 1.14, W3, 0, -0.85, 0, { r: 0.04 });
  t.box(0.36, 0.22, 0.06, neon, 0, -0.85, 0.59, { r: 0.02 }); // buckle
  if (level >= 1) {
    // a gun belt with a holster
    t.box(0.42, 0.7, 0.36, W2, 1.0, -1.15, 0.1, { r: 0.05 });
    for (let i = 0; i < 6; i++) t.cyl(0.05, 0.2, neon, -0.9 + i * 0.22, -0.85, 0.6, { seg: 6 });
  }
  if (level >= 4) {
    // Combat Mastery: a poncho over the shoulders and a bullet belt across the chest
    t.cyl(1.35, 1.0, W2, 0, 0.5, 0, { seg: 8, r2: 0.7, sz: 0.65 });
    for (let i = 0; i < 6; i++) t.box(0.16, 0.06, 0.05, neon, (i - 2.5) * 0.4, 0.02, 0.86);
    t.box(0.22, 2.3, 0.08, W3, 0, 0.1, 0.72, { rz: 0.6 });
  }
  if (level >= 5) {
    // Potential: a long coat behind, with a neon hem
    cape(t, W2, 2.6, { w: 2.3 });
    t.box(2.4, 0.06, 0.05, neon, 0, -1.6, -0.8);
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => {
    if (level >= 2) a.box(0.5, 0.06, 0.06, neon, 0, -1.25, 0.6); // glove cuffs
  });
  feet(h, key, W3, (b) => {
    b.box(1.12, 0.1, 1.14, neon, 0, -1.3, 0.02); // neon boot tops
    b.cyl(0.1, 0.06, W3, 0, -1.9, -0.6, { axis: 'z', seg: 8 }); // spurs
  });
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.25);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = whiteRevolver(gk, neon, { twin: level >= 3 });
  gk.done();
  muzzle(h, g, y, z);
  if (level >= 2) {
    const g2 = fist(h.leftArm, -1.9, 1.15);
    const sk = wear(h, g2, `${key}:sabre`);
    whiteSabre(sk, neon, { glow: level >= 5 });
    sk.done();
  }
  aimLong(h);
  if (level >= 2) h.leftArm.rotation.set(-0.6, 0, -0.35); // the sabre held low and ready
  h.tracer = BANDIT_NEON;
  return own(h, 0.3);
}

// ------------------------------------------------------------------ Eradicator (neon cyan)

const ERAD_NEON = 0x18ffff;

/** A white ray gun on the fist (gun space, barrel down -y). size grows it; prongs: a 3-prong tip. Returns the bore point [y, z]. */
function whiteRaygun(k, neon, size, prongs) {
  const U = 0.3;
  const len = 1.0 + size * 0.35;
  const r = 0.16 + size * 0.04;
  k.box(0.3 + size * 0.05, 0.6, 0.42, W2, 0, -0.05, U, { r: 0.06 }); // body
  k.cyl(r, len, W, 0, -len / 2 - 0.25, U + 0.08, { seg: 14 }); // barrel
  const coils = 2 + Math.min(3, size);
  for (let i = 0; i < coils; i++) k.torus(r + 0.04, 0.035, neon, 0, -0.45 - (i * (len - 0.3)) / coils, U + 0.08, { rx: PI / 2, seg: 14 }); // glowing coils
  if (prongs) {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2;
      k.box(0.07, 0.5, 0.07, W3, Math.cos(a) * (r + 0.05), -len - 0.4, U + 0.08 + Math.sin(a) * (r + 0.05), { r: 0.02 });
    }
    k.ball(0.13, neon, 0, -len - 0.45, U + 0.08);
  } else k.cyl(r * 0.6, 0.08, neon, 0, -len - 0.27, U + 0.08, { seg: 12 }); // glowing muzzle
  k.box(0.22, 0.24, 0.5, W3, 0, 0.22, U - 0.32, { rx: -0.35, r: 0.05 }); // grip
  if (size >= 2) k.box(0.18, 0.5, 0.3, W3, 0, -0.35, U + 0.4, { r: 0.05 }); // top sight
  return [-len - (prongs ? 0.65 : 0.3), U + 0.08];
}

/**
 * Eradicator: a white figure in a sleek suit with a ray gun. Lv 1 Powered Raygun: a longer gun
 * with more coils. Lv 2 Raysight: a neon visor band and a sight on the gun. Lv 3 Alpha Ray: a
 * power pack on the back. Lv 4 Beta Ray: a glowing chest core. Lv 5 Gamma Ray: armored
 * shoulders with neon coils. Lv 6 Ultra Ray: a three-prong emitter and a glowing ring on its back.
 */
export function makeEradicator(level) {
  const h = blank();
  const key = `eradicator${level}`;
  const neon = glowMat(h, ERAD_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // a smooth white helmet
  hd.ball(0.82, W2, 0, 0.55, -0.05, { sy: 1.05, seg: 16, rows: 10 });
  hd.box(1.0, 0.12, 0.2, W3, 0, 0.1, 0.62, { r: 0.04 }); // chin guard
  if (level >= 2) hd.box(1.25, 0.16, 0.1, neon, 0, 0.62, 0.7, { r: 0.04 }); // Raysight visor
  // a sleek suit with neon seams
  t.box(2.0, 1.6, 1.1, W, 0, 0.1, 0, { r: 0.12 });
  t.box(0.08, 1.4, 0.05, neon, 0, 0.1, 0.57); // centre seam
  t.box(2.02, 0.24, 1.12, W3, 0, -0.85, 0, { r: 0.04 }); // belt
  if (level >= 3) {
    // Alpha Ray: a power pack on the back with two glowing cells
    t.box(1.4, 1.5, 0.6, W2, 0, 0.2, -0.82, { r: 0.1 });
    for (const x of [-0.35, 0.35]) t.cyl(0.18, 1.1, neon, x, 0.2, -1.15, { seg: 10 });
  }
  if (level >= 4) {
    // Beta Ray: a glowing core in the chest
    t.cyl(0.32, 0.12, W3, 0, 0.35, 0.58, { axis: 'z', seg: 16 });
    t.cyl(0.22, 0.14, neon, 0, 0.35, 0.62, { axis: 'z', seg: 16 });
  }
  if (level >= 5) {
    // Gamma Ray: armored shoulders ringed with neon
    for (const x of [-1, 1]) {
      t.ball(0.55, W2, x * 1.1, 0.75, 0, { sy: 0.7 });
      t.torus(0.5, 0.05, neon, x * 1.1, 0.68, 0, { rx: PI / 2, seg: 16 });
    }
  }
  if (level >= 6) {
    // Ultra Ray: a glowing ring floating behind the back
    t.torus(1.15, 0.08, neon, 0, 0.6, -1.35, { seg: 24 });
    t.torus(0.8, 0.05, W, 0, 0.6, -1.33, { seg: 20 });
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => {
    if (level >= 1) a.box(0.5, 0.06, 0.06, neon, 0, -1.25, 0.6); // glove cuffs
  });
  feet(h, key, W3, (b) => {
    b.box(1.12, 0.1, 1.14, neon, 0, -1.3, 0.02); // neon boot tops
  });
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.25);
  const gk = wear(h, g, `${key}:gun`);
  const size = level >= 6 ? 4 : level >= 4 ? 3 : level >= 1 ? Math.min(2, level) : 0;
  const [y, z] = whiteRaygun(gk, neon, size, level >= 6);
  gk.done();
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = ERAD_NEON;
  return own(h, 0.3);
}

// ------------------------------------------------------------------ Shrapnel Grenadier (neon violet)

const NADE_NEON = 0x7c4dff;

/** A white grenade in the fist (gun space) with a neon band and pin ring. Returns its top y. */
function whiteNade(k, neon, r = 0.3) {
  const y = -0.42;
  k.ball(r, W, 0, y, 0, { sy: 1.25, seg: 14, rows: 9 });
  for (let i = 0; i < 4; i++) k.torus(r, 0.02, W3, 0, y, 0, { ry: (i * PI) / 4, seg: 16, sy: 1.25 });
  k.torus(r * 1.01, 0.035, neon, 0, y, 0, { rx: PI / 2, seg: 16 });
  const top = y - r * 1.25;
  k.cyl(0.1, 0.16, W3, 0, top - 0.04, 0, { seg: 10 }); // fuze
  k.box(0.07, r * 1.7, 0.05, W2, 0, y - r * 0.35, r + 0.05, { rx: -0.08 }); // spoon
  k.torus(0.1, 0.02, neon, 0.16, top - 0.08, 0, { ry: PI / 2, seg: 12 }); // pin ring
  return top - 0.12;
}

/** A white grenade on the body (torso space), small, with a neon band. */
function beltNade(k, neon, x, y, z) {
  k.ball(0.16, W, x, y, z, { sy: 1.2, seg: 10, rows: 7 });
  k.torus(0.165, 0.02, neon, x, y, z, { rx: PI / 2, seg: 12 });
  k.cyl(0.06, 0.1, W3, x, y + 0.22, z, { seg: 8 });
}

/**
 * A white grenade launcher on the fist (gun space): stock, a six-shot drum with neon shells, a
 * fat barrel. o.heavy: a longer barrel with a muzzle brake and a glowing ring. Returns [y, z].
 */
function whiteLauncher(k, neon, o = {}) {
  const r = o.heavy ? 0.3 : 0.25;
  const len = o.heavy ? 2.3 : 1.95;
  const B = UP + 0.06;
  k.box(0.28, 0.8, 0.4, W2, 0, 0.5, UP - 0.08, { r: 0.07 }); // stock
  k.box(0.3, 0.1, 0.46, neon, 0, 0.92, UP - 0.08, { r: 0.02 }); // butt pad
  k.box(0.22, 0.26, 0.5, W3, 0, 0.08, UP - 0.34, { rx: -0.32, r: 0.05 }); // grip
  k.box(0.32, 0.5, 0.36, W, 0, -0.1, UP, { r: 0.04 }); // receiver
  k.cyl(0.42, 0.6, W2, 0, -0.62, B - 0.08, { seg: 18 }); // drum
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    k.cyl(0.1, 0.62, neon, Math.sin(a) * 0.27, -0.62, B - 0.08 + Math.cos(a) * 0.27, { seg: 8 });
  }
  if (o.spikes) {
    // Shrapnel: little blades round the drum
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      k.box(0.06, 0.2, 0.2, W3, Math.sin(a) * 0.47, -0.62, B - 0.08 + Math.cos(a) * 0.47, { ry: a, rx: PI / 4 });
    }
  }
  const b0 = -0.95;
  const bl = len + b0;
  k.cyl(r, bl, W, 0, b0 - bl / 2, B, { seg: 16 });
  k.cyl(r - 0.07, 0.04, 0x202020, 0, -len - 0.01, B, { seg: 14 }); // bore
  for (let i = 0; i < 3; i++) k.torus(r + 0.01, 0.02, W3, 0, b0 - 0.2 - i * 0.2, B, { rx: PI / 2, seg: 14 });
  k.box(0.2, 0.4, 0.1, W3, 0, -0.25, B + 0.44, { rx: -0.35 }); // leaf sight
  if (o.heavy) {
    k.cyl(r + 0.07, 0.3, W2, 0, -len + 0.15, B, { seg: 16 }); // muzzle brake
    for (const s of [-1, 1]) k.box(0.08, 0.16, 0.2, W3, s * (r + 0.08), -len + 0.15, B);
    k.cyl(r + 0.08, 0.06, neon, 0, -len + 0.36, B, { seg: 16 });
  }
  return [-len, B];
}

/**
 * Shrapnel Grenadier (alternate Grenadier form): a white soldier with a helmet throwing white
 * grenades. Lv 1 Heavy Impact: a grenade belt. Lv 2 Bigger Bombs: goggles and a bigger grenade.
 * Lv 3 Grenade Launcher: a drum launcher instead and a chest strap of grenades. Lv 4 Shrapnel
 * Explosives: shoulder plates and blades on the drum. Lv 5 Demolition: an armoured vest, a
 * heavy barrel and a backpack of glowing shells.
 */
export function makeShrapnelGrenadier(level) {
  const h = blank();
  const key = `grenadierShrapnel${level}`;
  const neon = glowMat(h, NADE_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  helmet(hd, W, { cover: level >= 3 ? neon : W3 });
  if (level >= 2) goggles(hd, 1.18, neon, { r: 0.77, frame: W3, strap: W2 });
  t.box(2.14, 1.8, 1.14, W, 0, 0.05, 0, { r: 0.1 }); // jacket
  t.box(0.06, 1.5, 0.05, W3, 0, -0.1, 0.58); // seam
  t.box(2.16, 0.24, 1.16, W3, 0, -0.86, 0, { r: 0.04 }); // belt
  t.box(0.34, 0.2, 0.06, neon, 0, -0.86, 0.6, { r: 0.02 }); // buckle
  if (level >= 1) for (const x of [-0.6, 0.6]) beltNade(t, neon, x, -0.55, 0.72);
  if (level >= 3) {
    // a strap of grenades across the chest
    t.box(0.28, 2.5, 1.18, W2, 0, 0, 0, { rz: 0.62 });
    for (const s of [-0.6, 0, 0.6]) beltNade(t, neon, -Math.sin(0.62) * s, Math.cos(0.62) * s, 0.74);
  }
  if (level >= 4) shoulderPads(t, W2, 0.62);
  if (level >= 5) {
    // an armoured vest with a neon stripe, and a backpack of glowing shells
    t.box(2.3, 1.3, 1.26, W2, 0, 0.2, 0, { r: 0.1 });
    t.box(2.32, 0.1, 1.28, neon, 0, -0.2, 0);
    t.box(1.4, 1.5, 0.5, W3, 0, 0.1, -0.85, { r: 0.08 });
    for (let i = 0; i < 4; i++) t.cyl(0.13, 0.5, neon, -0.45 + i * 0.3, 0.95, -0.85, { seg: 10 });
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => {
    if (level >= 4) a.box(0.5, 0.06, 0.06, neon, 0, -1.25, 0.6); // glove cuffs
  });
  feet(h, key, W3, (b) => b.box(1.12, 0.1, 1.14, neon, 0, -1.3, 0.02));
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  if (level >= 3) {
    const [y, z] = whiteLauncher(gk, neon, { spikes: level >= 4, heavy: level >= 5 });
    gk.done();
    muzzle(h, g, y, z);
    aimLong(h);
    h.projectile = { color: NADE_NEON, size: level >= 4 ? 0.55 : 0.45, arc: 3 };
  } else {
    const tip = whiteNade(gk, neon, level >= 2 ? 0.36 : 0.3);
    gk.done();
    muzzle(h, g, tip * 0.6, 0);
    throwPose(h);
    h.projectile = { color: 0xffffff, size: level >= 2 ? 0.55 : 0.5, arc: 3.5 };
  }
  h.tracer = NADE_NEON;
  return own(h, level >= 3 ? 0.3 : 0);
}

// ------------------------------------------------------------------ Warrior (neon ice blue)

const WARRIOR_NEON = 0x80d8ff;

/**
 * A white sword in the fist (blade down -y). o.wide: a broadsword blade; o.edge: neon edges;
 * o.glow: the whole blade glows. Returns the tip y.
 */
function whiteSword(k, neon, o = {}) {
  const bw = o.wide ? 0.42 : 0.3;
  const bl = o.wide ? 2.5 : 2.2;
  k.cyl(0.1, 0.55, W3, 0, 0.08, 0, { seg: 8 }); // grip
  for (let i = 0; i < 3; i++) k.torus(0.1, 0.02, W2, 0, 0.25 - i * 0.16, 0, { rx: PI / 2, seg: 8 });
  k.ball(0.15, o.glow ? neon : W2, 0, 0.42, 0, { seg: 10, rows: 7 }); // pommel
  k.box(0.18, 0.14, o.wide ? 1.1 : 0.9, W2, 0, -0.26, 0, { r: 0.04 }); // crossguard
  for (const sd of [-1, 1]) k.ball(0.08, neon, 0, -0.26, sd * (o.wide ? 0.58 : 0.48), { seg: 8, rows: 5 });
  const body = bl * 0.84;
  const tip = bl - body;
  const y0 = -0.33;
  const blade = o.glow ? neon : W;
  k.box(0.08, body, bw, blade, 0, y0 - body / 2, 0);
  k.slab(0.08, tip, bw, blade, 0, y0 - body - tip / 2, 0, { bd: 0.05 });
  if (!o.glow) k.box(0.1, body * 0.8, 0.05, W3, 0, y0 - body * 0.45, 0); // fuller
  if (o.edge && !o.glow) for (const sd of [-1, 1]) k.box(0.09, body, 0.035, neon, 0, y0 - body / 2, sd * (bw / 2 - 0.01));
  return y0 - bl;
}

/**
 * Warrior (alternate Enforcer): a white knight with a round helm and a sword. Lv 1 Broadsword:
 * a wider blade and shoulder plates. Lv 2 Sharpness: neon edges and a breastplate. Lv 3 Ethereal
 * Blade: the blade glows and a plume on the helm. Lv 4 Warrior Spirit: a second glowing sword
 * (Double Strike) and a long cape.
 */
export function makeWarrior(level) {
  const h = blank();
  const key = `enforcerWarrior${level}`;
  const neon = glowMat(h, WARRIOR_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // a round helm with a visor slit
  hd.box(1.3, 1.3, 1.3, W2, 0, 0.55, 0, { r: 0.3 });
  hd.box(1.0, 0.1, 0.06, neon, 0, 0.6, 0.66); // visor slit
  hd.box(0.08, 0.5, 0.06, W3, 0, 0.3, 0.67); // nose guard
  if (level >= 3) {
    // a neon plume on top
    hd.box(0.16, 0.3, 0.9, W3, 0, 1.3, 0, { r: 0.05 });
    hd.box(0.14, 0.4, 1.1, neon, 0, 1.6, -0.2, { r: 0.07, rx: -0.2 });
  }
  t.box(2.12, 1.8, 1.12, W, 0, 0.05, 0, { r: 0.1 }); // tunic
  t.box(2.16, 0.26, 1.16, W3, 0, -0.86, 0, { r: 0.04 }); // belt
  t.box(0.34, 0.22, 0.06, neon, 0, -0.86, 0.6, { r: 0.02 }); // buckle
  t.box(0.26, 0.9, 0.3, W3, -0.85, -1.2, 0.2, { r: 0.05, rz: 0.2 }); // scabbard
  if (level >= 1) shoulderPads(t, W2, 0.6);
  if (level >= 2) {
    // a breastplate with a neon line down the middle
    t.box(2.24, 1.3, 1.24, W2, 0, 0.25, 0, { r: 0.12 });
    t.box(0.08, 1.1, 0.05, neon, 0, 0.25, 0.64);
  }
  if (level >= 4) {
    cape(t, W2, 2.8, { w: 2.2 });
    t.box(2.3, 0.06, 0.05, neon, 0, -1.75, -0.8);
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => {
    if (level >= 2) a.box(0.5, 0.06, 0.06, neon, 0, -1.25, 0.6); // gauntlet cuffs
  });
  feet(h, key, W3, (b) => b.box(1.12, 0.1, 1.14, neon, 0, -1.3, 0.02));
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const tipY = whiteSword(gk, neon, { wide: level >= 1, edge: level >= 2, glow: level >= 3 });
  gk.done();
  muzzle(h, g, tipY, 0);
  if (level >= 4) {
    const g2 = fist(h.leftArm, -1.9, 1.15);
    const sk = wear(h, g2, `${key}:sword2`);
    whiteSword(sk, neon, { wide: true, glow: true });
    sk.done();
  }
  h.rightArm.rotation.set(-2.5, 0, 0.2);
  h.leftArm.rotation.set(level >= 4 ? -1.6 : -0.3, 0, -0.25);
  h.pose = { right: -2.5, left: level >= 4 ? -1.6 : -0.3, leftRecoil: 0 };
  h.swing = 2.0;
  h.melee = true;
  h.tracer = WARRIOR_NEON;
  return own(h, 0);
}

// ------------------------------------------------------------------ Mage (purple, normal colours)

const MAGE_GLOW = 0xd17bff;

/**
 * Mage: a wizard in a purple robe and a tall pointed hat with a wand. Lv 1 Wand Training: a
 * longer wand with a gold band. Lv 2 Arcana Amplifier: a glowing gem on the wand and a gem on the
 * hat. Lv 3 Enhanced Arcana: a spell book on the belt and glowing runes on the robe. Lv 4
 * Stormbringer: a shoulder cape and little storm clouds orbiting its hat. Lv 5 Ascendant of Magic:
 * a long staff with a big glowing crystal, a gold-trimmed hat and a long cape.
 */
export function makeMage(level) {
  const ROBE = 0x5e35b1;
  const ROBE2 = 0x4527a0;
  const GOLD = 0xffc107;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: ROBE, pants: ROBE2, arms: ROBE, face: 'smile' });
  const key = `mage${level}`;
  const glow = glowMat(h, MAGE_GLOW);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // the pointed hat: a wide brim and a cone that bends back at the top
  hd.cyl(1.15, 0.12, ROBE2, 0, 0.62, 0, { seg: 20 });
  hd.cyl(0.66, 1.1, ROBE, 0, 1.2, 0, { seg: 16, r2: 0.32 });
  hd.cyl(0.32, 0.6, ROBE, 0, 1.95, -0.12, { seg: 12, r2: 0.06, rx: -0.35 });
  hd.cyl(0.68, 0.14, level >= 5 ? GOLD : 0x311b92, 0, 0.76, 0, { seg: 16 }); // hat band
  if (level >= 2) hd.ball(0.13, glow, 0, 0.78, 0.66, { seg: 10, rows: 7 }); // gem on the band
  // a white beard
  hd.box(0.9, 0.55, 0.2, 0xeeeeee, 0, -0.42, 0.58, { r: 0.08 });
  hd.slab(0.7, 0.4, 0.18, 0xeeeeee, 0, -0.88, 0.56, { bw: 0.2 });
  // the robe: down over the legs, with a gold belt
  t.box(2.1, 1.8, 1.12, ROBE, 0, 0.05, 0, { r: 0.12 });
  t.slab(2.3, 1.9, 1.2, ROBE2, 0, -1.6, 0, { bw: 1.35 });
  t.box(2.14, 0.18, 1.16, GOLD, 0, -0.8, 0, { r: 0.05 }); // belt
  t.box(0.08, 1.6, 0.05, GOLD, 0, 0.1, 0.58); // trim down the front
  if (level >= 3) {
    // Enhanced Arcana: a spell book on the belt and glowing runes on the robe
    t.box(0.55, 0.68, 0.2, 0x6d4c41, -0.8, -1.08, 0.5, { r: 0.03 });
    t.box(0.06, 0.4, 0.05, glow, -0.8, -1.08, 0.61);
    for (const [x, y] of [[-0.55, 0.4], [0.55, 0.4], [-0.6, -1.7], [0.6, -1.7], [0, -2.2]]) t.box(0.18, 0.18, 0.05, glow, x, y, 0.62, { rz: PI / 4 });
  }
  if (level >= 4) cape(t, level >= 5 ? ROBE2 : 0x7e57c2, level >= 5 ? 3 : 1.6, { w: 2.2 });
  if (level >= 4) {
    // Stormbringer: little storm clouds with lightning around the hat
    for (const a of [0, 2.1, 4.2]) {
      const x = Math.sin(a) * 1.1;
      const z = Math.cos(a) * 1.1;
      for (const [ox, oy, r] of [[-0.15, 0, 0.2], [0.12, 0.05, 0.24], [0.02, 0.15, 0.18]]) hd.ball(r, 0x90a4ae, x + ox, 1.5 + oy, z, { seg: 8, rows: 6 });
      hd.box(0.06, 0.35, 0.05, glow, x, 1.2, z, { rz: 0.4 });
    }
  }
  hd.done();
  t.done();
  hands(h, key, 0xf1c27d, ROBE, (a) => {
    a.cyl(0.6, 0.9, ROBE, 0, -1.1, 0, { seg: 12, r2: 0.75 }); // wide sleeves
    a.torus(0.74, 0.05, GOLD, 0, -1.55, 0, { seg: 14 });
  });
  feet(h, key, 0x311b92);
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.1);
  const gk = wear(h, g, `${key}:wand`);
  let top;
  if (level >= 5) {
    // Ascendant of Magic: a tall staff with a big crystal held in prongs
    gk.cyl(0.09, 4.2, 0x5d4037, 0, -0.3, 0, { seg: 10 });
    for (const yy of [0.4, -0.8]) gk.torus(0.11, 0.03, GOLD, 0, yy, 0, { seg: 10 });
    top = -2.6;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2;
      gk.box(0.06, 0.6, 0.06, GOLD, Math.sin(a) * 0.22, top + 0.15, Math.cos(a) * 0.22, { rx: Math.cos(a) * 0.35, rz: -Math.sin(a) * 0.35 });
    }
    gk.cyl(0.24, 0.7, glow, 0, top - 0.1, 0, { seg: 6, r2: 0.02 });
    gk.cyl(0.24, 0.3, glow, 0, top + 0.3, 0, { seg: 6, r2: 0.02, rx: PI });
  } else {
    // a wand pointing forward
    const len = level >= 1 ? 1.6 : 1.2;
    gk.cyl(0.07, len, 0x6d4c41, 0, -len / 2, 0, { seg: 8, r2: 0.05 });
    if (level >= 1) gk.torus(0.08, 0.025, GOLD, 0, -0.25, 0, { seg: 10 });
    top = -len - 0.05;
    gk.ball(level >= 2 ? 0.15 : 0.09, level >= 2 ? glow : 0xffffff, 0, top, 0, { seg: 10, rows: 7 });
  }
  gk.done();
  muzzle(h, g, top, 0);
  const right = level >= 5 ? -0.9 : -1.5;
  h.rightArm.rotation.set(right, 0, 0.15);
  h.leftArm.rotation.set(-0.4, 0, -0.2);
  h.pose = { right, left: -0.4, leftRecoil: 0 };
  h.tracer = MAGE_GLOW;
  return own(h, 0);
}

// ------------------------------------------------------------------ Snowman (neon spring green)

const SNOW_NEON = 0x00ffa3;

/**
 * Snowman (alternate Snowballer): a round white snow figure with a top hat, coal-style buttons
 * in neon, and a snowball in the hand. Lv 1: mittens. Lv 2 Cold Snap: a frosty belly ring.
 * Lv 3 Winter Scarf: a neon scarf. Lv 4 Frostbringer: ice spikes on the shoulders. Lv 5 Subzero:
 * an icicle crown on the hat. Lv 6 Endless Blizzard: a little snow cloud over its head.
 */
export function makeSnowman(level) {
  const h = blank();
  const key = `snowballerSnowman${level}`;
  const neon = glowMat(h, SNOW_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // a round snow head and a top hat with a neon band
  hd.ball(0.78, W, 0, 0.55, 0, { seg: 14, rows: 10 });
  hd.cyl(0.9, 0.08, W3, 0, 1.18, 0, { seg: 16 }); // brim
  hd.cyl(0.6, 0.85, W2, 0, 1.6, 0, { seg: 16 });
  hd.cyl(0.62, 0.16, neon, 0, 1.3, 0, { seg: 16 });
  if (level >= 5) for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    hd.box(0.1, 0.45, 0.1, neon, Math.sin(a) * 0.5, 2.2, Math.cos(a) * 0.5, { r: 0.03 });
  }
  if (level >= 6) {
    // a little snow cloud floating over the hat
    for (const [x, z, r] of [[0, 0, 0.55], [0.55, 0.1, 0.4], [-0.5, -0.1, 0.42], [0.1, -0.4, 0.38]]) hd.ball(r, W2, x, 3.1, z, { seg: 10, rows: 7 });
    for (const x of [-0.4, 0, 0.4]) hd.ball(0.07, neon, x, 2.6, 0.1, { seg: 6, rows: 4 });
  }
  // a round snow body with neon buttons
  t.ball(1.25, W, 0, -0.05, 0, { seg: 16, rows: 12 });
  for (const y of [0.55, 0.05, -0.45]) t.ball(0.12, neon, 0, y, 1.2, { seg: 8, rows: 6 });
  if (level >= 2) t.torus(1.2, 0.07, neon, 0, -0.55, 0, { rx: PI / 2, seg: 20 }); // frosty belly ring
  if (level >= 3) {
    // Winter Scarf: wrapped round the neck with one end hanging down the front
    t.torus(0.62, 0.2, neon, 0, 0.98, 0, { rx: PI / 2, seg: 16 });
    t.box(0.36, 1.0, 0.14, neon, 0.38, 0.45, 1.05, { r: 0.05, rz: 0.12 });
    for (const x of [0.28, 0.38, 0.48]) t.box(0.06, 0.18, 0.1, W2, x + 0.06, -0.12, 1.06);
  }
  if (level >= 4) for (const sd of [-1, 1]) {
    // Frostbringer: ice spikes on the shoulders
    for (const [dx, a] of [[0, 0], [0.25, 0.4], [-0.2, -0.4]]) t.box(0.14, 0.6, 0.14, W3, sd * (1.0 + dx * 0.4), 1.15, dx, { r: 0.03, rz: -sd * (0.5 + a * 0.3) });
    t.ball(0.12, neon, sd * 1.05, 1.0, 0, { seg: 8, rows: 6 });
  }
  hd.done();
  t.done();
  hands(h, key, level >= 1 ? W2 : W3, W2, (a) => {
    if (level >= 1) a.box(0.5, 0.06, 0.06, neon, 0, -1.25, 0.6); // mitten cuffs
  });
  feet(h, key, W3, (b) => b.box(1.12, 0.1, 1.14, neon, 0, -1.3, 0.02));
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const r = level >= 4 ? 0.42 : 0.34;
  gk.ball(r, W, 0, -r * 0.6, 0, { seg: 12, rows: 8 });
  if (level >= 2) gk.ball(r * 0.45, neon, 0, -r * 0.6, r * 0.75, { seg: 8, rows: 6 });
  gk.done();
  muzzle(h, g, -r * 0.6, 0);
  throwPose(h);
  h.projectile = { color: 0xffffff, size: level >= 4 ? 0.65 : 0.5, arc: 3.5 };
  h.tracer = SNOW_NEON;
  return own(h, 0);
}

// ------------------------------------------------------------------ Infernus (neon ember)

const INF_NEON = 0xff4f00;

/** A white flame wand on the fist (blade down -y), with a neon pilot light. o.wide: a flared nozzle. Returns the tip y. */
function whiteFlameWand(k, neon, o = {}) {
  const len = o.len ?? 2.0;
  k.box(0.22, 0.26, 0.5, W3, 0, 0.1, UP - 0.32, { rx: -0.3, r: 0.04 }); // rear grip
  k.cyl(0.14, 0.7, W2, 0, -0.1, UP, { seg: 12 }); // valve body
  k.cyl(0.18, 0.08, neon, 0.2, -0.1, UP, { axis: 'x', seg: 10 }); // valve wheel
  k.cyl(0.08, len - 0.7, W, 0, -0.45 - (len - 0.7) / 2, UP, { seg: 10 }); // tube
  k.box(0.18, 0.2, 0.5, W3, 0, -0.9, UP - 0.3, { r: 0.04 }); // front grip
  const tip = -len;
  k.cyl(o.wide ? 0.36 : 0.18, 0.42, W2, 0, tip + 0.2, UP, { seg: 12, r2: o.wide ? 0.24 : 0.15 }); // nozzle
  k.torus(o.wide ? 0.34 : 0.17, 0.03, neon, 0, tip + 0.02, UP, { rx: PI / 2, seg: 14 }); // glowing rim
  k.ball(0.07, neon, 0.05, tip + 0.05, UP - 0.2, { seg: 8, rows: 6 }); // pilot light
  return tip - 0.1;
}

/**
 * Infernus (alternate Flamethrower): a white fire-suit with a domed hood, two white fuel tanks
 * with neon bands and a flame wand. Lv 1 Bigger Flames: a wide nozzle. Lv 2 Napalm Fire: a third
 * tank. Lv 3 Blazing Arson: shoulder plates with neon vents. Lv 4 The Furnace: a glowing furnace
 * core on the chest. Lv 5 Absolute Hellfire: horns of fire on the hood and a long coat.
 */
export function makeInfernus(level) {
  const h = blank();
  const key = `flamethrowerInfernus${level}`;
  const neon = glowMat(h, INF_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // a domed fire hood with a wide neon visor
  hd.box(1.36, 1.36, 1.36, W2, 0, 0.55, 0, { r: 0.4 });
  hd.box(1.0, 0.34, 0.08, neon, 0, 0.62, 0.66, { r: 0.08 });
  hd.cyl(0.16, 0.2, W3, 0, 0.12, 0.66, { axis: 'z', seg: 10 }); // breather
  if (level >= 5) for (const sd of [-1, 1]) hd.cyl(0.14, 0.75, neon, sd * 0.55, 1.6, 0, { seg: 8, r2: 0.01, rz: sd * -0.4 });
  t.box(2.2, 1.9, 1.18, W, 0, 0.05, 0, { r: 0.12 }); // suit
  for (const y of [-0.55, 0.3]) t.box(2.24, 0.12, 1.22, W3, 0, y, 0); // reflective bands
  t.box(2.22, 0.22, 1.2, W3, 0, -0.88, 0, { r: 0.04 }); // belt
  t.box(0.3, 0.2, 0.06, neon, 0, -0.88, 0.61, { r: 0.02 });
  if (level >= 3) {
    shoulderPads(t, W2, 0.62);
    for (const sd of [-1, 1]) for (const dz of [-0.2, 0, 0.2]) t.box(0.3, 0.05, 0.08, neon, sd * 1.12, 1.15, dz);
  }
  if (level >= 4) {
    // The Furnace: a round grate on the chest with a glowing core
    t.cyl(0.42, 0.14, W3, 0, 0.35, 0.62, { axis: 'z', seg: 16 });
    t.cyl(0.3, 0.16, neon, 0, 0.35, 0.64, { axis: 'z', seg: 16 });
    for (const dx of [-0.16, 0, 0.16]) t.box(0.05, 0.6, 0.06, W2, dx, 0.35, 0.72);
  }
  if (level >= 5) cape(t, W2, 2.6, { w: 2.2 });
  const xs = level >= 2 ? [-0.6, 0, 0.6] : [-0.38, 0.38];
  for (const x of xs) {
    t.cyl(0.3, 1.7, W2, x, 0.2, -0.95, { seg: 14 });
    for (const sd of [-1, 1]) t.ball(0.3, W2, x, 0.2 + sd * 0.85, -0.95, { sy: 0.45, seg: 14, rows: 5 });
    t.cyl(0.31, 0.14, neon, x, 0.45, -0.95, { seg: 14 });
    t.cyl(0.07, 0.2, W3, x, 1.2, -0.95, { seg: 8 });
  }
  t.box(xs.length * 0.6 + 0.2, 1.5, 0.12, W3, 0, 0.2, -0.62); // back plate
  t.tube([[-0.3, -0.65, -0.95], [-1.0, -1.0, -0.4], [-1.25, -0.7, 0.2]], 0.07, W3, { seg: 12, sides: 6 }); // hose
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => a.box(0.5, 0.06, 0.06, neon, 0, -1.25, 0.6));
  feet(h, key, W3, (b) => b.box(1.12, 0.1, 1.14, neon, 0, -1.3, 0.02));
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const tip = whiteFlameWand(gk, neon, { len: level >= 3 ? 2.2 : 1.9, wide: level >= 1 });
  gk.done();
  muzzle(h, g, tip, UP);
  h.rightArm.rotation.set(-PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-PI / 2 + 0.15, 0, -0.5);
  h.pose = { right: -PI / 2, left: -PI / 2 + 0.15, leftRecoil: 0.05 };
  h.recoilScale = 0.1;
  h.tracer = INF_NEON;
  return own(h, 0);
}

// ------------------------------------------------------------------ Spearman (neon rose)

const SPEAR_NEON = 0xff80ab;

/** A long white spear in the fist (point down -y). o.barb: side barbs; o.glow: a glowing head. Returns the tip y. */
function whiteSpear(k, neon, o = {}) {
  const len = o.len ?? 3.6;
  k.cyl(0.08, len, W2, 0, 0.9 - len / 2, 0, { seg: 10 }); // shaft
  k.cyl(0.1, 0.14, W3, 0, 0.9, 0, { seg: 10 }); // butt cap
  for (let i = 0; i < 3; i++) k.torus(0.09, 0.02, neon, 0, 0.3 - i * 0.14, 0, { rx: PI / 2, seg: 8 }); // grip wraps
  const y0 = 0.9 - len;
  k.cyl(0.11, 0.16, W3, 0, y0, 0, { seg: 10 }); // collar
  const head = o.glow ? neon : W;
  k.slab(0.06, 0.9, 0.34, head, 0, y0 - 0.5, 0, { bd: 0.04 }); // leaf blade
  if (!o.glow) k.box(0.07, 0.6, 0.04, neon, 0, y0 - 0.4, 0); // neon line down the blade
  if (o.barb) for (const sd of [-1, 1]) k.box(0.05, 0.36, 0.08, head, 0, y0 - 0.15, sd * 0.22, { rx: sd * 0.6 });
  return y0 - 0.95;
}

/**
 * Spearman (alternate Assassin): a white figure in a hood and mask with a long spear. Lv 1 Steel
 * Tip: a neon-lined spearhead. Lv 2 Spear Rush: a light chest wrap and arm bands. Lv 3 Piercing
 * Thorn: barbs on the spear and a neon eye slit. Lv 4 Striking Spear: a longer spear and shoulder
 * guard. Lv 5 Vicious Cyclone: a glowing spearhead, rings round the shaft and a scarf.
 */
export function makeSpearman(level) {
  const h = blank();
  const key = `assassinSpearman${level}`;
  const neon = glowMat(h, SPEAR_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hood(hd, W2);
  hd.box(1.12, 0.5, 0.1, W3, 0, 0.32, 0.62, { r: 0.08 }); // mask
  if (level >= 3) hd.box(0.9, 0.08, 0.05, neon, 0, 0.72, 0.64); // eye slit
  t.box(2.0, 1.8, 1.1, W, 0, 0.05, 0, { r: 0.12 });
  t.box(2.04, 0.22, 1.14, W3, 0, -0.86, 0, { r: 0.04 }); // sash
  t.box(0.3, 0.7, 0.06, neon, 0.6, -1.2, 0.58, { r: 0.02, rz: 0.15 }); // sash tail
  if (level >= 2) {
    // a chest wrap across the body
    t.box(0.3, 2.3, 1.16, W3, 0, 0.1, 0, { r: 0.05, rz: 0.7 });
    t.box(0.08, 2.0, 0.04, neon, 0, 0.1, 0.6, { rz: 0.7 });
  }
  if (level >= 4) {
    shoulderPads(t, W2, 0.58);
    t.box(0.5, 0.06, 0.06, neon, 1.05, 1.0, 0.45);
  }
  if (level >= 5) {
    // a long scarf blowing behind
    t.torus(0.6, 0.18, neon, 0, 0.98, 0, { rx: PI / 2, seg: 16 });
    t.box(0.34, 1.4, 0.12, neon, -0.3, 0.3, -0.75, { r: 0.05, rx: 0.35 });
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => {
    if (level >= 2) a.box(0.5, 0.06, 0.06, neon, 0, -1.25, 0.6); // arm bands
  });
  feet(h, key, W3, (b) => b.box(1.12, 0.1, 1.14, neon, 0, -1.3, 0.02));
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const tipY = whiteSpear(gk, neon, { len: level >= 4 ? 4.2 : 3.6, barb: level >= 3, glow: level >= 5 });
  if (level >= 5) for (const y of [-0.9, -1.6]) gk.torus(0.24, 0.03, neon, 0, y, 0, { rx: PI / 2, seg: 14 });
  gk.done();
  muzzle(h, g, tipY, 0);
  h.rightArm.rotation.set(-PI / 2, 0, 0.15);
  h.leftArm.rotation.set(-1.2, 0, -0.35);
  h.pose = { right: -PI / 2, left: -1.2, leftRecoil: 0 };
  h.swing = 1.2;
  h.melee = true;
  h.tracer = SPEAR_NEON;
  return own(h, 0);
}

export const MODELS = {
  eradicator: makeEradicator,
  priest: makePriest,
  farmer: makeFarmer,
  bandit: makeBandit,
  grenadierShrapnel: makeShrapnelGrenadier,
  enforcerWarrior: makeWarrior,
  snowballerSnowman: makeSnowman,
  flamethrowerInfernus: makeInfernus,
  assassinSpearman: makeSpearman,
  mage: makeMage,
};
