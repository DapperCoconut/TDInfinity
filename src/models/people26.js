// Tower models: people, batch 26 (dressed with the vehicle kit in ../vehicles.js).
// In here: Poacher.
// These towers are plain white figures with no face. Only their armor and weapons tell them
// apart: white too, with accents in one neon colour per tower.
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.

import { glowMat } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { fist, muzzle, own, wear } from './people1.js';
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

export const MODELS = {
  poacher: makePoacher,
};
