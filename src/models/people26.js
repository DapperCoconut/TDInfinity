// Tower models: people, batch 26 (dressed with the vehicle kit in ../vehicles.js).
// In here: Poacher, Gunner, Future Sniper, Ninja.
// These towers are plain white figures with no face. Only their armor and weapons tell them
// apart: white too, with accents in one neon colour per tower.
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.

import { glowMat } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { UP, aimBoth, aimLong, band, dome, fist, muzzle, own, wear } from './people1.js';
import { feet, hands, hood } from './people5.js';
import { shoulderPads } from './people2.js';
import { cape, gauntlet } from './people18.js';

const PI = Math.PI;
// The whites: a few shades so parts still read apart.
const W = 0xffffff;
const W2 = 0xf2f2f2;
const W3 = 0xe4e4e4;

/** A plain white figure with no face. */
const blank = () => makeHumanoid({ skin: W, shirt: W, pants: W2, arms: W, face: 'none' });

// ------------------------------------------------------------------ Poacher (neon green)

const POACHER_NEON = 0x39ff14;

/**
 * A white bow in the left fist (gun space: it stands along z, the arrow points along -y): a
 * wrapped grip, two curved limbs, a string and a nocked arrow. `neon` lights the grip rings,
 * limb tips and the arrowhead; o.recurve curls the tips, o.power makes the string and whole
 * arrow glow. Returns the arrow tip y.
 */
function whiteBow(k, neon, o = {}) {
  const big = o.recurve ? 1.15 : 1;
  k.cyl(0.11, 0.6, W2, 0, 0, 0, { axis: 'z', seg: 10 }); // grip
  for (const zz of [-0.2, 0.2]) k.torus(0.115, 0.022, neon, 0, 0, zz, { seg: 10 });
  for (const s of [-1, 1]) {
    const e = 1.72 * big;
    k.tube([[0, 0, s * 0.28], [0, -0.22, s * 0.8 * big], [0, -0.14, s * 1.35 * big], [0, 0.1, s * e]], 0.075, W, { seg: 14, sides: 6 });
    if (o.recurve) k.tube([[0, 0.1, s * e], [0, -0.08, s * (e + 0.22)]], 0.05, W, { seg: 4, sides: 6 });
    k.ball(0.08, neon, 0, o.recurve ? -0.08 : 0.1, s * (o.recurve ? e + 0.22 : e), { seg: 8, rows: 5 });
    k.tube([[0, 0.1, s * e], [0, 0.95, 0]], 0.018, o.power ? neon : W3, { seg: 2, sides: 4, tension: 0 }); // string
  }
  k.box(0.08, 0.14, 0.12, W3, 0.1, -0.05, 0.14); // arrow rest
  const tip = -0.85;
  k.cyl(0.035, 0.95 - tip, o.power ? neon : W2, 0, (0.95 + tip) / 2, 0.12, { seg: 6 }); // shaft
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    k.box(0.02, 0.32, 0.12, W, Math.sin(a) * 0.06, 0.72, 0.12 + Math.cos(a) * 0.06, { ry: a }); // fletching
  }
  k.cyl(0.01, o.sharp ? 0.36 : 0.28, neon, 0, tip + (o.sharp ? 0.18 : 0.14), 0.12, { r2: o.sharp ? 0.11 : 0.09, seg: 8 }); // head
  return tip;
}

/**
 * Poacher: a white hunter with a hood and a bow. Lv 1 Quick Hands: archer's gloves and a bracer,
 * Lv 2 Sharp Arrows: a bigger quiver of neon-tipped arrows, Lv 3 Bullseye Support: a chest plate
 * with a neon bullseye and a hood visor, Lv 4 Vantage: shoulder plates and a cape, Lv 5 Arrows
 * of Power: gauntlets, a recurve bow and a glowing string and arrow.
 */
export function makePoacher(level) {
  const h = blank();
  const key = `poacher${level}`;
  const neon = glowMat(h, POACHER_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hood(hd, W2);
  if (level >= 3) hd.box(1.3, 0.14, 0.08, neon, 0, 0.72, 0.66, { r: 0.03 }); // visor band over the blank face
  // a light vest with a neon seam, and a belt
  t.box(2.14, 1.6, 1.14, W2, 0, 0.1, 0, { r: 0.12 });
  t.box(0.06, 1.5, 0.05, neon, 0, 0.1, 0.59);
  t.box(2.1, 0.24, 1.12, W3, 0, -0.84, 0, { r: 0.04 }); // belt
  t.box(0.3, 0.2, 0.06, neon, 0, -0.84, 0.58, { r: 0.02 }); // buckle
  t.box(0.34, 0.36, 0.3, W3, -0.6, -1.0, 0.56, { r: 0.05 }); // pouch
  if (level >= 3) {
    // Bullseye Support: a chest plate with a neon target
    t.box(1.5, 1.1, 0.16, W, 0, 0.35, 0.62, { r: 0.08 });
    t.torus(0.34, 0.04, neon, 0, 0.35, 0.72, { seg: 16 });
    t.torus(0.18, 0.035, neon, 0, 0.35, 0.72, { seg: 12 });
    t.cyl(0.07, 0.04, neon, 0, 0.35, 0.72, { axis: 'z', seg: 10 });
  }
  // a quiver on the back, its strap across the chest
  const many = level >= 2;
  t.box(0.22, 2.5, 1.12, W3, 0, 0, 0, { rz: -0.62 });
  t.cyl(many ? 0.36 : 0.3, 1.7, W, 0.5, 0.25, -0.9, { rz: 0.3, seg: 12 });
  for (const yy of [-0.45, 0.85]) t.torus(many ? 0.36 : 0.3, 0.04, neon, 0.5 - yy * 0.3, 0.25 + yy, -0.9, { rx: PI / 2, rz: 0.3, seg: 12 });
  const arrows = many ? [[-0.12, 0.08], [0.1, -0.06], [0, -0.16], [0.14, 0.1], [-0.05, -0.02], [0.2, -0.12]] : [[-0.1, 0.06], [0.08, -0.06], [0, -0.14], [0.12, 0.08]];
  for (const [dx, dz] of arrows) {
    const x = 0.24 + dx;
    t.cyl(0.03, 0.55, W2, x - 0.06, 1.3, -0.9 + dz, { rz: 0.3, seg: 5 });
    t.box(0.03, 0.26, 0.14, many ? neon : W, x - 0.12, 1.5, -0.9 + dz, { rz: 0.3 }); // fletching
  }
  if (level >= 4) {
    shoulderPads(t, W, 0.55);
    for (const s of [-1, 1]) t.box(0.6, 0.06, 0.06, neon, s * 1.45, 0.98, 0.42); // neon edges
    cape(t, W2, 2.4, { clasp: neon });
  }
  hd.done();
  t.done();
  hands(h, key, level >= 1 ? W3 : null, W2, (a, s) => {
    if (level >= 5) gauntlet(a, W, neon);
    else if (level >= 1 && s === 1) {
      a.cyl(0.58, 0.7, W, 0, -1.25, 0, { seg: 12, r2: 0.6 }); // bracer on the bow arm
      a.box(0.5, 0.06, 0.06, neon, 0, -1.25, 0.6);
    }
  });
  feet(h, key, W2, (b) => b.box(1.12, 0.1, 1.14, neon, 0, -1.3, 0.02)); // neon boot tops
  // the bow
  h.muzzles = [];
  const g = fist(h.leftArm, -1.9, 1.1);
  const gk = wear(h, g, `${key}:bow`);
  const tip = whiteBow(gk, neon, { recurve: level >= 5, sharp: level >= 2, power: level >= 5 });
  gk.done();
  muzzle(h, g, tip, 0.12);
  h.leftArm.rotation.set(-PI / 2, 0, 0.3);
  h.rightArm.rotation.set(-PI / 2, 0, -0.4);
  h.pose = { right: -PI / 2, left: -PI / 2, leftRecoil: 0 };
  h.tracer = POACHER_NEON;
  return own(h, 0);
}

// ------------------------------------------------------------------ Gunner (neon pink)

const GUNNER_NEON = 0xff1fce;

/**
 * A white rifle on the fist (gun space): receiver, rail, handguard with neon side strips, barrel,
 * grip, stock, a curved mag and a neon sight. o.scope adds a scope with a neon lens.
 * Returns the bore point [y, z].
 */
function whiteRifle(k, neon, o = {}) {
  const U = UP;
  const len = 2.15;
  k.box(0.3, 1.02, 0.34, W, 0, -0.31, U, { r: 0.04 }); // receiver
  k.box(0.14, 0.92, 0.06, W3, 0, -0.34, U + 0.2); // top rail
  for (let i = 0; i < 5; i++) k.box(0.18, 0.05, 0.05, W3, 0, -0.02 - i * 0.16, U + 0.24);
  k.box(0.32, 0.72, 0.32, W2, 0, -1.18, U - 0.01, { r: 0.07 }); // handguard
  for (const s of [-1, 1]) k.box(0.03, 0.6, 0.06, neon, s * 0.17, -1.18, U + 0.04); // neon strips
  k.cyl(0.06, 0.7, W3, 0, -1.8, U + 0.03, { seg: 10 }); // barrel
  k.cyl(0.09, 0.2, W2, 0, -len + 0.1, U + 0.03, { seg: 8 }); // flash hider
  k.box(0.22, 0.24, 0.52, W2, 0, 0.08, U - 0.36, { rx: -0.32, r: 0.04 }); // grip
  k.torus(0.1, 0.022, W3, 0, -0.16, U - 0.24, { ry: PI / 2, seg: 10, arc: PI }); // trigger guard
  k.box(0.2, 0.3, 0.62, W2, 0, -0.62, U - 0.44, { rx: 0.28, r: 0.03 }); // mag
  k.box(0.24, 0.62, 0.32, W2, 0, 0.5, U + 0.1, { r: 0.05 }); // stock
  k.box(0.26, 0.08, 0.4, W3, 0, 0.84, U + 0.08, { r: 0.02 });
  if (o.scope) {
    k.cyl(0.1, 0.8, W, 0, -0.35, U + 0.42, { seg: 12 });
    k.cyl(0.13, 0.16, W2, 0, -0.8, U + 0.42, { seg: 12 });
    k.cyl(0.1, 0.02, neon, 0, -0.89, U + 0.42, { seg: 12 }); // lens
    for (const y of [-0.6, -0.1]) k.box(0.12, 0.1, 0.18, W3, 0, y, U + 0.3);
  } else {
    k.box(0.16, 0.08, 0.14, W3, 0, 0.0, U + 0.3); // rear sight
    k.box(0.05, 0.1, 0.16, neon, 0, -1.5, U + 0.2); // neon front sight
  }
  return [-len, U + 0.03];
}

/**
 * A white burst pistol on the fist (gun space): slide with serrations, frame, grip, guard and a
 * neon stripe. o.ext (Rapidfire Assault): a longer slide, a compensator and an extended mag.
 * Returns the bore point [y, z].
 */
function whitePistol(k, neon, o = {}) {
  const len = o.ext ? 1.2 : 0.95;
  const U = 0.3;
  k.box(0.26, len, 0.28, W, 0, -len / 2 + 0.18, U + 0.06, { r: 0.03 }); // slide
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) k.box(0.02, 0.03, 0.18, W3, s * 0.135, 0.1 - i * 0.07, U + 0.08);
  k.box(0.24, len * 0.82, 0.16, W2, 0, -len * 0.41 + 0.16, U - 0.14); // frame
  k.box(0.24, 0.26, 0.56, W2, 0, 0.12, U - 0.38, { rx: -0.28, r: 0.04 }); // grip
  k.torus(0.09, 0.02, W3, 0, -0.12, U - 0.24, { ry: PI / 2, seg: 10, arc: PI });
  k.box(0.28, 0.06, 0.3, neon, 0, -len * 0.55, U + 0.06); // neon stripe
  k.box(0.16, 0.06, 0.08, W3, 0, 0.13, U + 0.22); // sights
  k.box(0.05, 0.06, 0.08, neon, 0, -len + 0.24, U + 0.22);
  let tip = -len + 0.18;
  if (o.ext) {
    k.box(0.3, 0.3, 0.32, W2, 0, tip - 0.14, U + 0.06, { r: 0.04 }); // compensator
    for (const s of [-1, 1]) k.box(0.03, 0.05, 0.16, neon, s * 0.16, tip - 0.14, U + 0.1);
    tip -= 0.28;
    k.box(0.2, 0.22, 0.5, W3, 0, 0.2, U - 0.85, { rx: -0.28, r: 0.03 }); // extended mag
  }
  return [tip, U + 0.06];
}

/**
 * Gunner (alternate Soldier): a white soldier with a rifle. Lv 1 Precision: a helmet visor,
 * Lv 2 Shredder Bullets: a vest with neon ammo pouches, Lv 3 Marksman Eye: a scope on the rifle
 * and an ear sensor, Lv 4 Burst Pistols: two pistols and thigh holsters, Lv 5 Rapidfire
 * Assault: long pistols with compensators, shoulder plates and ammo belts.
 */
export function makeGunner(level) {
  const h = blank();
  const key = `gunner${level}`;
  const neon = glowMat(h, GUNNER_NEON);
  const pistols = level >= 4;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // a round white helmet with a neon band
  dome(hd, 0.76, 0.58, W2, 0, 0.92, 0);
  hd.torus(0.75, 0.05, W3, 0, 0.93, 0, { rx: PI / 2, seg: 20 });
  hd.cyl(0.745, 0.1, neon, 0, 1.08, 0, { seg: 20, r2: 0.72 });
  if (level >= 1) hd.box(1.3, 0.3, 0.1, W, 0, 0.75, 0.66, { r: 0.05 }); // visor
  if (level >= 1) hd.box(1.1, 0.06, 0.04, neon, 0, 0.75, 0.72); // visor slit
  if (level >= 3) {
    hd.cyl(0.16, 0.14, W, -0.76, 0.7, 0, { axis: 'x', seg: 12 }); // ear sensor
    hd.cyl(0.08, 0.04, neon, -0.84, 0.7, 0, { axis: 'x', seg: 10 });
    hd.cyl(0.025, 0.5, W3, -0.8, 1.0, 0, { seg: 5 }); // antenna
  }
  // a white uniform: collar, belt with a neon buckle, a pouch
  t.box(2.14, 1.6, 1.14, W2, 0, 0.1, 0, { r: 0.1 });
  t.box(2.1, 0.24, 1.12, W3, 0, -0.84, 0, { r: 0.04 });
  t.box(0.32, 0.2, 0.06, neon, 0, -0.84, 0.58, { r: 0.02 });
  if (level >= 2) {
    // a vest with neon-topped ammo pouches
    t.box(1.62, 1.25, 0.2, W, 0, 0.18, 0.56, { r: 0.06 });
    t.box(1.62, 1.35, 0.2, W, 0, 0.12, -0.56, { r: 0.06 });
    for (let i = 0; i < 3; i++) {
      t.box(0.42, 0.5, 0.24, W2, (i - 1) * 0.5, -0.3, 0.78, { r: 0.03 });
      t.box(0.44, 0.08, 0.26, neon, (i - 1) * 0.5, -0.04, 0.79);
    }
  }
  if (level >= 5) {
    for (const s of [-1, 1]) {
      t.ball(0.6, W, s * 1.45, 0.95, 0, { sy: 0.55, seg: 14, rows: 8 }); // shoulder plates
      t.box(0.5, 0.06, 0.9, neon, s * 1.45, 0.76, 0);
    }
    for (const s of [-1, 1]) {
      // crossed ammo belts with neon rounds
      t.box(0.24, 2.4, 0.08, W3, 0, 0.1, 0.7, { rz: s * 0.6 });
      for (let i = 0; i < 5; i++) t.box(0.1, 0.14, 0.08, neon, s * (-0.5 + i * 0.25) * 0.68, 0.1 + (-0.5 + i * 0.25) * 0.82, 0.76, { rz: s * 0.6 });
    }
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a, s) => {
    if (level >= 2) a.box(0.5, 0.06, 0.04, neon, 0, -0.55, 0.55); // sleeve stripe
  });
  feet(h, key, W2, pistols ? (b) => {
    b.box(0.5, 0.75, 0.4, W, 0.4, -0.5, 0.2, { r: 0.05 }); // thigh holster
    b.box(0.52, 0.06, 0.42, neon, 0.4, -0.25, 0.2);
  } : null);
  h.muzzles = [];
  if (pistols) {
    for (const arm of [h.rightArm, h.leftArm]) {
      const g = fist(arm, -1.9, 1.35);
      const gk = wear(h, g, `${key}:gun`);
      const [y, z] = whitePistol(gk, neon, { ext: level >= 5 });
      gk.done();
      muzzle(h, g, y, z);
    }
    aimBoth(h);
  } else {
    const g = fist(h.rightArm, -1.9, 1.2);
    const gk = wear(h, g, `${key}:gun`);
    const [y, z] = whiteRifle(gk, neon, { scope: level >= 3 });
    gk.done();
    muzzle(h, g, y, z);
    aimLong(h);
  }
  h.tracer = GUNNER_NEON;
  return own(h, pistols ? 0.3 : UP);
}

// ------------------------------------------------------------------ Future Sniper (neon orange)

const SNIPER_NEON = 0xff7a00;

/**
 * A long white sniper rifle on the fist (gun space): receiver, a long fluted barrel, muzzle brake,
 * stock with a cheek rest, grip, box mag and a big scope with a neon lens. o.bipod (Lv 1+) folds
 * a bipod under the barrel; o.future (Lv 5) turns it into the Future Rifle: neon coils round the
 * barrel, a glowing energy cell for a mag and a glowing tip. Returns the bore point [y, z].
 */
function whiteSniper(k, neon, o = {}) {
  const U = UP;
  const len = o.future ? 3.3 : 3.0;
  k.box(0.3, 1.1, 0.36, W, 0, -0.3, U, { r: 0.05 }); // receiver
  k.cyl(0.075, len - 1.0, W3, 0, -0.85 - (len - 1.0) / 2, U + 0.04, { seg: 10 }); // barrel
  for (let i = 0; i < 3; i++) k.box(0.17, 0.42, 0.04, W2, 0, -1.2 - i * 0.5, U + 0.12); // fluting ribs
  k.box(0.22, 0.3, 0.2, W2, 0, -len + 0.15, U + 0.04, { r: 0.04 }); // muzzle brake
  for (const s of [-1, 1]) k.box(0.03, 0.06, 0.12, neon, s * 0.12, -len + 0.15, U + 0.04);
  k.box(0.22, 0.24, 0.52, W2, 0, 0.1, U - 0.36, { rx: -0.32, r: 0.04 }); // grip
  k.torus(0.1, 0.022, W3, 0, -0.14, U - 0.24, { ry: PI / 2, seg: 10, arc: PI }); // trigger guard
  k.box(0.26, 0.85, 0.36, W2, 0, 0.62, U - 0.02, { r: 0.06 }); // stock
  k.box(0.22, 0.42, 0.14, W, 0, 0.55, U + 0.22, { r: 0.04 }); // cheek rest
  k.box(0.28, 0.1, 0.5, W3, 0, 1.08, U - 0.04, { r: 0.03 }); // butt pad
  k.box(0.04, 0.6, 0.06, neon, 0.14, 0.62, U); // neon stock line
  // scope
  k.cyl(0.12, 1.1, W, 0, -0.3, U + 0.4, { seg: 14 });
  k.cyl(0.17, 0.26, W2, 0, -0.95, U + 0.4, { seg: 14 });
  k.cyl(0.14, 0.2, W2, 0, 0.32, U + 0.4, { seg: 14 });
  k.cyl(0.14, 0.02, neon, 0, -1.09, U + 0.4, { seg: 14 }); // lens
  k.cyl(0.07, 0.16, W3, 0, -0.3, U + 0.55, { seg: 8 }); // turret
  for (const y of [-0.6, 0.0]) k.box(0.14, 0.12, 0.2, W3, 0, y, U + 0.25);
  if (o.future) {
    // energy cell mag and neon coils round the barrel
    k.box(0.22, 0.4, 0.5, neon, 0, -0.55, U - 0.4, { r: 0.05 });
    k.box(0.26, 0.46, 0.1, W3, 0, -0.55, U - 0.66);
    for (let i = 0; i < 5; i++) k.torus(0.12, 0.025, neon, 0, -1.25 - i * 0.32, U + 0.04, { rx: PI / 2, seg: 10 });
    k.cyl(0.13, 0.4, W, 0, -len + 0.55, U + 0.04, { seg: 12 }); // emitter
    k.cyl(0.09, 0.05, neon, 0, -len - 0.02, U + 0.04, { seg: 10 });
  } else {
    k.box(0.2, 0.32, 0.4, W2, 0, -0.55, U - 0.3, { r: 0.03 }); // box mag
  }
  if (o.bipod) {
    k.box(0.2, 0.16, 0.12, W3, 0, -1.9, U - 0.08); // bipod mount
    for (const s of [-1, 1]) k.cyl(0.03, 0.8, W3, s * 0.08, -1.75, U - 0.12, { rx: PI / 2 - 0.15, seg: 6 }); // folded legs
  }
  return [-len - 0.05, U + 0.04];
}

/**
 * Future Sniper (alternate Sniper): a white marksman in a hood with a long scoped rifle.
 * Lv 1 Steady Aim: a bipod and knee pads, Lv 2 Hidden Sights: a neon eyepiece and a hood visor,
 * Lv 3 Marksman Bullets: a bandolier of neon rounds, Lv 4 Head Hunter: shoulder plates and a long
 * cape, Lv 5 Future Rifle: a helmet with a neon crest, gauntlets and the glowing Future Rifle.
 */
export function makeFutureSniper(level) {
  const h = blank();
  const key = `fsniper${level}`;
  const neon = glowMat(h, SNIPER_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (level >= 5) {
    // a sleek helmet with a neon crest and visor
    dome(hd, 0.78, 0.62, W, 0, 0.9, 0);
    hd.box(0.12, 0.2, 1.3, neon, 0, 1.52, -0.05, { r: 0.04 });
    hd.box(1.36, 0.26, 0.12, W2, 0, 0.74, 0.66, { r: 0.05 });
    hd.box(1.2, 0.07, 0.04, neon, 0, 0.74, 0.73);
  } else {
    hood(hd, W2);
    if (level >= 2) hd.box(1.3, 0.12, 0.08, W3, 0, 0.74, 0.66, { r: 0.03 }); // visor band
  }
  if (level >= 2) {
    // an eyepiece over the right eye
    hd.cyl(0.16, 0.22, W, 0.32, 0.74, 0.7, { axis: 'z', seg: 12 });
    hd.cyl(0.12, 0.03, neon, 0.32, 0.74, 0.82, { axis: 'z', seg: 12 });
  }
  // a long white coat with a neon seam, belt and pouches
  t.box(2.16, 1.62, 1.16, W2, 0, 0.1, 0, { r: 0.12 });
  t.box(0.06, 1.5, 0.05, neon, 0.3, 0.1, 0.6);
  t.box(2.12, 0.24, 1.14, W3, 0, -0.84, 0, { r: 0.04 });
  t.box(0.3, 0.2, 0.06, neon, 0, -0.84, 0.59, { r: 0.02 });
  for (const x of [-0.65, 0.65]) t.box(0.34, 0.36, 0.3, W3, x, -1.0, 0.56, { r: 0.05 });
  if (level >= 3) {
    // Marksman Bullets: a bandolier of glowing rounds
    t.box(0.26, 2.5, 0.1, W3, 0, 0.1, 0.62, { rz: 0.62 });
    for (let i = 0; i < 6; i++) {
      const f = -0.5 + i * 0.2;
      t.cyl(0.05, 0.22, neon, -f * 1.2, 0.1 + f * 1.48, 0.7, { rz: 0.62, seg: 6 });
    }
  }
  if (level >= 4) {
    shoulderPads(t, W, 0.55);
    for (const s of [-1, 1]) t.box(0.6, 0.06, 0.06, neon, s * 1.45, 0.98, 0.42);
    cape(t, W2, 2.8, { clasp: neon });
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => {
    if (level >= 5) gauntlet(a, W, neon);
  });
  feet(h, key, W2, (b) => {
    b.box(1.12, 0.1, 1.14, neon, 0, -1.3, 0.02); // neon boot tops
    if (level >= 1) b.box(0.7, 0.5, 0.25, W, 0, -0.75, 0.52, { r: 0.08 }); // knee pad
  });
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = whiteSniper(gk, neon, { bipod: level >= 1, future: level >= 5 });
  gk.done();
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = SNIPER_NEON;
  return own(h, UP);
}

// ------------------------------------------------------------------ Ninja (neon purple)

const NINJA_NEON = 0xbf00ff;

/**
 * A shuriken standing up in the x-y plane (thin along z), centred at (x, y, z) with points `r`
 * long: four blades with pointed tips around a round middle. `mid` colours the middle; o.glow
 * makes the blades neon too.
 */
function star(k, col, mid, x, y, z, r, o = {}) {
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + (o.turn ?? 0);
    const c = o.glow ?? col;
    k.box(r * 0.34, r * 0.7, 0.05, c, x + Math.sin(a) * r * 0.42, y + Math.cos(a) * r * 0.42, z, { rz: -a });
    k.box(r * 0.24, r * 0.24, 0.05, c, x + Math.sin(a) * r * 0.78, y + Math.cos(a) * r * 0.78, z, { rz: -a + PI / 4 }); // the tip
  }
  k.cyl(r * 0.24, 0.09, mid, x, y, z, { axis: 'z', seg: 12 });
  k.cyl(r * 0.08, 0.12, W3, x, y, z, { axis: 'z', seg: 8 }); // the hole
}

/**
 * Ninja: a white masked ninja in a wrapped hood with long scarf tails, throwing shurikens.
 * Lv 1 Ninja Training: neon arm wraps and a headband. Lv 2 Dummyjitsu: a chest strap with 3 saved
 * shurikens and a pouch. Lv 3 Lightweight Shurikens: light shoulder guards and longer scarf
 * tails. Lv 4 Jonin: a chest plate and a neon forehead plate. Lv 5 Rayedge Shurikens: gauntlets,
 * 5 glowing shurikens on the strap and a glowing star in its hand.
 */
export function makeNinja(level) {
  const h = blank();
  const key = `ninja${level}`;
  const neon = glowMat(h, NINJA_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // a wrapped hood and a face mask, with a neon slit where the eyes would be
  dome(hd, 0.8, 0.64, W2, 0, 0.88, -0.02);
  band(hd, 0.76, 0.1, 0.62, 3.0, W3, 0.36); // the mask over the lower face
  hd.box(1.12, 0.08, 0.06, neon, 0, 0.78, 0.72, { r: 0.02 }); // eye slit
  if (level >= 1) {
    // a headband tied at the back, its ends flying
    hd.cyl(0.79, 0.14, level >= 4 ? W : W3, 0, 1.08, 0, { seg: 22 });
    hd.ball(0.13, W3, 0, 1.08, -0.78, { seg: 8, rows: 6 });
    for (const sd of [-1, 1]) hd.box(0.14, 0.6, 0.04, neon, sd * 0.14, 0.86, -0.82, { rz: sd * 0.4, rx: -0.3 });
  }
  if (level >= 4) {
    // Jonin: a forehead plate with a neon mark
    hd.box(0.62, 0.3, 0.1, W, 0, 1.08, 0.78, { r: 0.04 });
    hd.box(0.3, 0.06, 0.04, neon, 0, 1.08, 0.84);
  }
  // a wrapped jacket, crossed at the front, with a sash belt
  t.box(2.14, 1.62, 1.14, W2, 0, 0.1, 0, { r: 0.12 });
  t.box(0.12, 1.3, 0.05, W3, -0.15, 0.3, 0.59, { rz: 0.45 }); // the crossed fold
  t.box(0.06, 1.25, 0.05, neon, -0.08, 0.3, 0.6, { rz: 0.45 });
  t.box(2.16, 0.32, 1.16, W3, 0, -0.82, 0, { r: 0.05 }); // sash
  t.ball(0.16, W, 0.55, -0.82, 0.6, { seg: 10, rows: 6 }); // its knot
  for (const sd of [-1, 1]) t.box(0.14, 0.55, 0.05, neon, 0.55 + sd * 0.1, -1.15, 0.62, { rz: sd * 0.25 });
  // a scarf with long tails streaming out behind
  const tail = level >= 3 ? 1.5 : 1;
  t.torus(0.62, 0.14, W, 0, 0.98, 0, { rx: PI / 2, seg: 18 });
  for (const sd of [-1, 1]) {
    t.tube([[sd * 0.2, 0.95, -0.6], [sd * 0.45, 0.8, -1.0 * tail], [sd * 0.75, 0.95, -1.5 * tail]], 0.09, W2, { seg: 10, sides: 6 });
    t.ball(0.07, neon, sd * 0.75, 0.95, -1.5 * tail, { seg: 6, rows: 4 });
  }
  if (level >= 2) {
    // Dummyjitsu: a strap across the chest holding saved shurikens, and a pouch
    t.box(0.24, 2.5, 0.08, W3, 0, 0.1, 0.62, { rz: -0.62 });
    const n = level >= 5 ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const f = (i - (n - 1) / 2) * (level >= 5 ? 0.2 : 0.3);
      star(t, W, neon, f * 1.2, 0.1 + f * 1.48, 0.7, 0.2, level >= 5 ? { glow: neon, turn: 0.4 } : { turn: 0.4 });
    }
    t.box(0.4, 0.36, 0.3, W, -0.62, -1.0, 0.56, { r: 0.05 }); // pouch
    t.box(0.42, 0.06, 0.32, neon, -0.62, -0.84, 0.56);
  }
  if (level >= 3) {
    // light shoulder guards with neon edges
    for (const sd of [-1, 1]) {
      t.box(0.75, 0.16, 1.1, W, sd * 1.35, 0.92, 0, { rz: sd * -0.35, r: 0.05 });
      t.box(0.75, 0.05, 0.05, neon, sd * 1.37, 0.85, 0.56, { rz: sd * -0.35 });
    }
  }
  if (level >= 4) {
    // Jonin: a chest plate over the jacket
    t.box(1.5, 0.9, 0.14, W, 0, 0.42, 0.64, { r: 0.08 });
    t.box(1.3, 0.05, 0.04, neon, 0, 0.1, 0.72);
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => {
    if (level >= 5) gauntlet(a, W, neon);
    else if (level >= 1) {
      // Ninja Training: wrapped forearms with neon bands
      a.cyl(0.56, 0.7, W, 0, -1.25, 0, { seg: 12, r2: 0.58 });
      for (const yy of [-1.05, -1.45]) a.torus(0.58, 0.035, neon, 0, yy, 0, { seg: 14 });
    }
  });
  feet(h, key, W2, (b) => {
    b.box(1.12, 0.1, 1.14, neon, 0, -1.3, 0.02); // neon boot tops
    b.cyl(0.55, 0.5, W3, 0, -0.85, 0, { seg: 12 }); // shin wraps
  });
  // a shuriken in the throwing hand (gun space: the throw goes along -y)
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.1);
  const gk = wear(h, g, `${key}:star`);
  star(gk, W, neon, 0, -0.45, UP * 0.5, level >= 5 ? 0.42 : 0.34, level >= 5 ? { glow: neon } : {});
  gk.done();
  muzzle(h, g, -0.45, UP * 0.5);
  // the other hand ready with the next one
  const g2 = fist(h.leftArm, -1.9, 1.1);
  const gk2 = wear(h, g2, `${key}:star2`);
  star(gk2, W, neon, 0, -0.35, UP * 0.5, 0.28);
  gk2.done();
  h.rightArm.rotation.set(-PI / 2, 0, -0.15);
  h.leftArm.rotation.set(-PI / 2 + 0.5, 0, 0.35);
  h.pose = { right: -PI / 2, left: -PI / 2 + 0.5, leftRecoil: 0 };
  h.tracer = NINJA_NEON;
  return own(h, 0);
}

export const MODELS = {
  poacher: makePoacher,
  soldierGunner: makeGunner,
  sniperFuture: makeFutureSniper,
  ninja: makeNinja,
};
