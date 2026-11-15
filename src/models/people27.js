// Tower models: people, batch 27 (dressed with the vehicle kit in ../vehicles.js).
// In here: Priest, Farmer, Bandit, Eradicator, Shrapnel Grenadier.
// Like batch 26 these are plain white figures with no face: only their gear tells them apart,
// white too, with accents in one neon colour per tower.
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
  const len = reaper ? 4.6 : 3.6;
  gk.cyl(0.08, len, W2, 0, -len / 2 + 0.6, 0, { seg: 10 }); // handle
  gk.box(0.12, 0.3, 0.5, W3, 0, -0.9, 0.2, { r: 0.03 }); // side grip
  const hy = -len + 0.6;
  gk.box(0.2, 0.3, 0.3, W3, 0, hy, 0, { r: 0.04 });
  const blade = [[0, 0.1], [0.5, 0.2], [1.1, 0.1], [1.6, -0.2], [1.85, -0.55], [1.45, -0.25], [0.9, -0.08], [0.3, -0.1]].map(([z, y]) => [z * (reaper ? 1.3 : 1), y * (reaper ? 1.3 : 1)]);
  gk.prism(blade, 0.06, reaper ? neon : W, 0, hy, 0, { bevel: 0.01 });
  if (!reaper) gk.box(0.05, 0.05, 1.5, neon, 0, hy - 0.05, 0.8, { rx: 0.15 }); // neon edge
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

export const MODELS = {
  eradicator: makeEradicator,
  priest: makePriest,
  farmer: makeFarmer,
  bandit: makeBandit,
  grenadierShrapnel: makeShrapnelGrenadier,
};
