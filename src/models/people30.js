// Tower models: people, batch 30 (dressed with the vehicle kit in ../vehicles.js).
// In here: Taser, Shinobi, Trickster.
// Like batches 26-29 these are plain faceless figures: only their gear tells them apart, with
// accents in one neon colour per tower.
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.

import { glowMat } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { UP, aimLong, dome, fist, goggles, muzzle, own, wear } from './people1.js';
import { shoulderPads } from './people2.js';
import { feet, hands } from './people5.js';
import { cape } from './people18.js';

const PI = Math.PI;
const W = 0xffffff;
const W2 = 0xf2f2f2;
const W3 = 0xe4e4e4;

/** A plain white figure with no face. */
const blank = () => makeHumanoid({ skin: W, shirt: W, pants: W2, arms: W, face: 'none' });

// ------------------------------------------------------------------ Taser (neon electric yellow)

const TASER_NEON = 0xeeff41;

/**
 * A white stun gun on the fist (gun space): a boxy body with a grip, two prong electrodes and
 * glowing charge bars. o.cannon (Lightning Cannon+): a longer barrel with coil rings. o.big
 * (Electroshock+): a fat capacitor on top. Returns the bore point [y, z].
 */
function whiteStunGun(k, neon, o = {}) {
  const U = UP;
  const len = o.cannon ? 2.2 : 1.5;
  k.box(0.4, 1.0, 0.5, W, 0, -0.35, U, { r: 0.1 }); // body
  k.box(0.06, 0.7, 0.08, neon, 0.21, -0.35, U + 0.05); // charge bars
  k.box(0.06, 0.7, 0.08, neon, -0.21, -0.35, U + 0.05);
  if (o.cannon) {
    k.cyl(0.16, len - 0.85, W2, 0, -0.85 - (len - 0.85) / 2, U, { seg: 12 }); // barrel
    for (let i = 0; i < 3; i++) k.torus(0.2, 0.04, neon, 0, -1.1 - i * 0.3, U, { rx: PI / 2, seg: 12 }); // coils
  } else k.box(0.36, 0.3, 0.4, W2, 0, -0.95, U, { r: 0.06 }); // nose
  for (const sx of [-1, 1]) {
    k.box(0.05, 0.25, 0.05, W3, sx * 0.1, -len - 0.05, U + 0.08); // prongs
    k.ball(0.05, neon, sx * 0.1, -len - 0.2, U + 0.08, { seg: 6, rows: 4 });
  }
  if (o.big) {
    k.cyl(0.18, 0.7, W2, 0, -0.35, U + 0.42, { rx: PI / 2, seg: 12 }); // capacitor
    k.cyl(0.19, 0.1, neon, 0, -0.35, U + 0.42, { rx: PI / 2, seg: 12 });
  }
  return [-len - 0.2, U + 0.08];
}

/**
 * Taser (alternate Tesla): a white lineman with a stun gun. Lv 1: goggles. Lv 2 Lightning
 * Cannon: a battery pack and a long coil barrel. Lv 3 Electroshock: shoulder coils and a
 * capacitor. Lv 4 Volt Link: an antenna dish on the pack. Lv 5 Thunder Storm: a storm halo and cape.
 */
export function makeTaser(level) {
  const h = blank();
  const key = `teslaTaser${level}`;
  const neon = glowMat(h, TASER_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  dome(hd, 0.82, 0.55, W2, 0, 0.95, 0); // hard hat
  hd.box(1.9, 0.08, 1.9, W2, 0, 0.95, 0.05, { r: 0.04 }); // brim
  hd.box(0.12, 0.5, 0.06, neon, 0, 1.25, 0.72, { rz: 0.5 }); // lightning stripe
  if (level >= 1) goggles(hd, 0.55, TASER_NEON, { frame: W3, strap: W3 });
  t.box(2.1, 1.8, 1.1, W, 0, 0.05, 0, { r: 0.12 }); // overalls
  t.box(0.5, 0.5, 0.06, W3, 0, 0.3, 0.57, { r: 0.04 }); // chest pocket
  t.box(0.1, 0.4, 0.05, neon, 0, 0.3, 0.61, { rz: 0.4 }); // bolt badge
  t.box(2.14, 0.24, 1.14, W3, 0, -0.84, 0, { r: 0.04 }); // tool belt
  for (const sx of [-1, 1]) t.box(0.3, 0.35, 0.3, W2, sx * 0.75, -1.0, 0.45, { r: 0.04 }); // pouches
  if (level >= 2) {
    t.box(1.3, 1.4, 0.6, W2, 0, 0.1, -0.85, { r: 0.08 }); // battery pack
    for (let i = 0; i < 3; i++) t.box(1.0, 0.1, 0.05, neon, 0, -0.3 + i * 0.35, -1.16); // charge level
    t.cyl(0.05, 1.2, W3, 0.55, -0.3, -0.5, { seg: 6, rz: 0.6 }); // cable to the gun
  }
  if (level >= 3) {
    shoulderPads(t, W2, 0.55);
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) t.torus(0.2, 0.045, neon, sx * 1.25, 0.95 + i * 0.13, 0, { rx: PI / 2, seg: 10 }); // shoulder coils
  }
  if (level >= 4) {
    t.cyl(0.04, 1.0, W3, -0.45, 1.25, -0.9, { seg: 6 }); // mast
    t.cyl(0.4, 0.08, W2, -0.45, 1.8, -0.9, { seg: 16, rx: 0.6 }); // link dish
    t.ball(0.08, neon, -0.45, 1.85, -0.75, { seg: 8, rows: 5 });
  }
  if (level >= 5) {
    hd.torus(0.95, 0.05, neon, 0, 1.75, 0, { seg: 24 }); // storm halo
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      hd.box(0.06, 0.3, 0.06, neon, Math.sin(a) * 0.95, 1.95, Math.cos(a) * 0.95, { rz: 0.4 }); // sparks
    }
    cape(t, W2, 2.4, { w: 2.1, clasp: TASER_NEON });
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => a.box(0.5, 0.12, 0.5, neon, 0, -1.2, 0, { r: 0.04 })); // rubber cuffs
  feet(h, key, W2, null);
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = whiteStunGun(gk, neon, { cannon: level >= 2, big: level >= 3 });
  gk.done();
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = TASER_NEON;
  return own(h, UP);
}

// ------------------------------------------------------------------ Shinobi (neon deep violet)

const SHIN_NEON = 0x6200ea;

/** A white katana in the fist (blade down -y). o.glow: the blade glows. */
function whiteKatana(k, neon, o = {}) {
  k.cyl(0.09, 0.6, W3, 0, 0.12, 0, { seg: 8 }); // wrapped grip
  for (let i = 0; i < 3; i++) k.box(0.2, 0.04, 0.2, neon, 0, 0.3 - i * 0.18, 0, { rz: 0.5 }); // wrap
  k.cyl(0.25, 0.06, W2, 0, -0.22, 0, { seg: 12 }); // round guard
  const bl = 2.2;
  const blade = o.glow ? neon : W;
  k.box(0.06, bl * 0.85, 0.2, blade, 0, -0.26 - bl * 0.425, 0.03);
  k.slab(0.06, bl * 0.15, 0.2, blade, 0, -0.26 - bl * 0.925, 0.03, { bd: 0.04 });
  if (!o.glow) k.box(0.07, bl * 0.8, 0.03, neon, 0, -0.26 - bl * 0.425, 0.14); // neon edge
  return -0.26 - bl;
}

/**
 * Shinobi (alternate Gladiator): a white swordsman with a katana and a sheath at the hip. Lv 1
 * Mental Focus: a neon headband. Lv 2 Sensing Weakness: a half mask. Lv 3 Bladestorm: a helmet
 * and shoulder plates. Lv 4 Demonblade: horns and a glowing blade. Lv 5: a long coat.
 */
export function makeShinobi(level) {
  const h = blank();
  const key = `gladiatorShinobi${level}`;
  const neon = glowMat(h, SHIN_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (level >= 1) {
    hd.box(1.7, 0.18, 1.7, neon, 0, 0.75, 0, { r: 0.05 }); // headband
    for (const sx of [-1, 1]) hd.box(0.12, 0.6, 0.06, neon, sx * 0.15, 0.45, -0.88, { rz: sx * 0.3 }); // tails
  }
  if (level >= 2) hd.box(1.66, 0.5, 1.66, W2, 0, 0.2, 0.02, { r: 0.12 }); // half mask
  if (level >= 3) {
    dome(hd, 0.9, 0.55, W2, 0, 0.95, 0); // helmet
    hd.box(2.0, 0.1, 1.2, W3, 0, 0.95, -0.2, { r: 0.04, rx: -0.2 }); // neck flap
    if (level >= 4) for (const sx of [-1, 1]) hd.cyl(0.12, 0.8, neon, sx * 0.5, 1.6, 0.3, { seg: 8, r2: 0.02, rz: -sx * 0.5 }); // horns
    else hd.box(0.6, 0.4, 0.06, neon, 0, 1.3, 0.85, { rz: PI / 4 }); // crest
  } else dome(hd, 0.8, 0.5, W, 0, 0.92, 0);
  t.box(2.0, 1.75, 1.05, W, 0, 0.1, 0, { r: 0.1 }); // robe
  t.box(0.9, 1.6, 0.05, W3, 0.25, 0.1, 0.54, { rz: -0.35 }); // robe fold
  t.box(2.06, 0.3, 1.1, neon, 0, -0.75, 0); // obi sash
  t.box(0.3, 0.5, 0.25, W3, -0.85, -1.0, 0.3, { rx: 0.3 }); // sheath mouth
  t.box(0.2, 1.8, 0.2, W2, -1.0, -1.6, -0.3, { rx: 0.9, r: 0.06 }); // sheath
  if (level >= 3) shoulderPads(t, W2, 0.6);
  if (level >= 5) cape(t, W2, 2.6, { w: 2.1, clasp: SHIN_NEON });
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => {
    if (level >= 2) a.box(0.46, 0.5, 0.46, W2, 0, -0.95, 0, { r: 0.08 }); // arm guards
  });
  feet(h, key, W2, null);
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const tipY = whiteKatana(gk, neon, { glow: level >= 4 });
  gk.done();
  muzzle(h, g, tipY, 0);
  h.rightArm.rotation.set(-2.2, 0, 0.15);
  h.leftArm.rotation.set(-0.5, 0, -0.2);
  h.pose = { right: -2.2, left: -0.5, leftRecoil: 0 };
  h.swing = 1.9;
  h.melee = true;
  h.tracer = SHIN_NEON;
  return own(h, 0);
}

// ------------------------------------------------------------------ Trickster (neon scarlet)

const TRICK_NEON = 0xff1744;

/** A white throwing knife in the fist (blade down -y). */
function throwingKnife(k, neon) {
  k.cyl(0.08, 0.4, W3, 0, 0.05, 0, { seg: 8 }); // grip
  k.torus(0.1, 0.03, neon, 0, 0.3, 0, { seg: 10 }); // ring
  k.box(0.06, 0.8, 0.22, W, 0, -0.55, 0);
  k.slab(0.06, 0.25, 0.22, W, 0, -1.07, 0, { bd: 0.04 });
  k.box(0.07, 0.75, 0.03, neon, 0, -0.55, 0.11); // neon edge
  return -1.2;
}

/**
 * Trickster (alternate Jester): a white jester with a two-pointed hat and throwing knives. Lv 1
 * Scarlet Bane: neon bells. Lv 2 Smoke and Mirrors: a ruff collar and a fan of knives on the
 * belt. Lv 3 Butterfly Red: butterfly wings on the back. Lv 4 Our Scarlet Masks: a mask on the
 * hip and a cape. Lv 5 Oopsie Daisy!: a third hat point.
 */
export function makeTrickster(level) {
  const h = blank();
  const key = `jesterTrickster${level}`;
  const neon = glowMat(h, TRICK_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hd.box(1.7, 0.25, 1.7, W3, 0, 0.75, 0, { r: 0.08 }); // hat band
  const points = level >= 5 ? [-1, 0, 1] : [-1, 1];
  for (const sx of points) {
    const up = sx === 0;
    hd.cyl(0.38, 1.3, W2, sx * 0.55, up ? 1.55 : 1.3, up ? -0.1 : 0, { seg: 10, r2: 0.08, rz: -sx * 1.0, rx: up ? -0.3 : 0 }); // hat point
    hd.ball(0.16, level >= 1 ? neon : W3, sx * 1.15, up ? 2.15 : 1.75, up ? -0.3 : 0, { seg: 10, rows: 7 }); // bell
  }
  t.box(2.0, 1.75, 1.05, W, 0, 0.1, 0, { r: 0.1 }); // tunic
  for (let i = 0; i < 3; i++) t.box(0.22, 0.22, 0.05, neon, 0, 0.5 - i * 0.4, 0.55, { rz: PI / 4 }); // diamonds
  t.box(2.05, 0.24, 1.1, W3, 0, -0.84, 0, { r: 0.04 }); // belt
  if (level >= 2) {
    t.torus(0.85, 0.16, W2, 0, 0.95, 0, { rx: PI / 2, seg: 14 }); // ruff collar
    for (let i = 0; i < 4; i++) t.box(0.06, 0.45, 0.14, W, 0.4 + i * 0.15, -1.1, 0.5, { rz: -0.3 + i * 0.2 }); // knife fan
  }
  if (level >= 3) {
    for (const sx of [-1, 1]) {
      t.slab(0.06, 1.1, 0.9, W2, sx * 0.6, 0.5, -0.75, { rz: sx * 0.6, bd: 0.3 }); // wings
      t.box(0.07, 0.9, 0.05, neon, sx * 0.62, 0.5, -0.78, { rz: sx * 0.6 });
    }
  }
  if (level >= 4) {
    t.box(0.5, 0.4, 0.1, W2, -0.8, -1.0, 0.5, { r: 0.08 }); // spare mask
    t.box(0.35, 0.06, 0.05, neon, -0.8, -0.95, 0.56);
    cape(t, W2, 2.4, { w: 2.0, clasp: TRICK_NEON });
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => a.box(0.5, 0.1, 0.5, neon, 0, -1.2, 0, { r: 0.04 })); // cuffs
  feet(h, key, W2, null);
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.1);
  const gk = wear(h, g, `${key}:gun`);
  const tipY = throwingKnife(gk, neon);
  gk.done();
  muzzle(h, g, tipY, 0);
  const g2 = fist(h.leftArm, -1.9, 1.1);
  const sk = wear(h, g2, `${key}:knife2`);
  throwingKnife(sk, neon);
  sk.done();
  h.rightArm.rotation.set(-2.0, 0, 0.25);
  h.leftArm.rotation.set(-1.2, 0, -0.35);
  h.pose = { right: -2.0, left: -1.2, leftRecoil: 0 };
  h.swing = 1.5;
  h.tracer = TRICK_NEON;
  return own(h, 0);
}

export const MODELS = {
  teslaTaser: makeTaser,
  gladiatorShinobi: makeShinobi,
  jesterTrickster: makeTrickster,
};
