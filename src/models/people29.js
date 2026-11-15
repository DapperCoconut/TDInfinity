// Tower models: people, batch 29 (dressed with the vehicle kit in ../vehicles.js).
// In here: Cyborg.
// Like batches 26-28 these are plain faceless figures: only their gear tells them apart, with
// accents in one neon colour per tower.
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.

import { glowMat } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { UP, aimLong, dome, fist, muzzle, own, wear } from './people1.js';
import { shoulderPads } from './people2.js';
import { feet, hands } from './people5.js';

const PI = Math.PI;
const W = 0xffffff;
const W2 = 0xf2f2f2;
const W3 = 0xe4e4e4;

/** A plain white figure with no face. */
const blank = () => makeHumanoid({ skin: W, shirt: W, pants: W2, arms: W, face: 'none' });

// ------------------------------------------------------------------ Cyborg (neon pale gold)

const CYBORG_NEON = 0xfff176;

/**
 * A heavy white burst rifle on the fist (gun space): a long boxy body, a vented barrel shroud and
 * a box magazine. o.big (Overclock+): a bigger magazine. o.howitzer (Magnum Howitzer+): a fat
 * howitzer tube under the barrel. o.belt (Reactor System+): a glowing feed belt instead of a
 * magazine. Returns the bore point [y, z].
 */
function whiteBurstRifle(k, neon, o = {}) {
  const U = UP;
  const len = 2.4;
  k.box(0.42, 1.3, 0.46, W, 0, -0.4, U, { r: 0.07 }); // receiver
  k.box(0.16, 1.1, 0.07, W3, 0, -0.45, U + 0.26); // top rail
  k.box(0.44, 0.9, 0.44, W2, 0, -1.45, U, { r: 0.09 }); // barrel shroud
  for (let i = 0; i < 4; i++) k.box(0.46, 0.06, 0.2, neon, 0, -1.15 - i * 0.2, U + 0.13); // vents
  k.cyl(0.09, 0.6, W3, 0, -2.1, U, { seg: 10 }); // barrel
  k.cyl(0.14, 0.2, W, 0, -len, U, { seg: 10 }); // muzzle
  k.box(0.24, 0.24, 0.52, W2, 0, 0.1, U - 0.38, { rx: -0.32, r: 0.04 }); // grip
  k.box(0.26, 0.6, 0.36, W2, 0, 0.5, U + 0.06, { r: 0.06 }); // stock
  if (o.belt) {
    k.box(0.3, 0.3, 0.3, W3, 0, -0.6, U - 0.36, { r: 0.05 }); // feed port
    for (let i = 0; i < 4; i++) k.box(0.22, 0.12, 0.14, neon, 0.18 + i * 0.12, -0.6 + i * 0.05, U - 0.5 - i * 0.12); // glowing belt
  } else {
    const ml = o.big ? 0.8 : 0.6;
    k.box(0.24, 0.32, ml, W2, 0, -0.65, U - 0.3 - ml / 2, { rx: 0.2, r: 0.03 }); // magazine
    k.box(0.26, 0.06, 0.1, neon, 0, -0.65, U - 0.3 - ml * 0.8);
  }
  if (o.howitzer) {
    k.cyl(0.2, 1.1, W, 0, -1.55, U - 0.42, { seg: 14 }); // howitzer tube
    k.cyl(0.15, 0.04, neon, 0, -2.12, U - 0.42, { seg: 14 });
    k.torus(0.22, 0.04, W3, 0, -1.2, U - 0.42, { rx: PI / 2, seg: 14 });
  }
  return [-len - 0.1, U];
}

/**
 * Cyborg (alternate Commando): a white cyborg soldier with one glowing eye slit, a ribbed robot
 * arm and a heavy burst rifle. Lv 1 Scanner: a scanner lens over the eye. Lv 2 Overclock: coolant
 * tubes on the back and a bigger magazine. Lv 3 Magnum Howitzer: the howitzer tube under the
 * barrel and shoulder pads. Lv 4 Reactor System: a glowing reactor on the back and a belt feed.
 * Lv 5 Cyber Augment: Jetstream: twin jet thrusters and a three-rocket pod on the shoulder.
 */
export function makeCyborg(level) {
  const h = blank();
  const key = `commandoCyborg${level}`;
  const neon = glowMat(h, CYBORG_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  dome(hd, 0.82, 0.66, W2, 0, 0.88, 0); // helmet
  hd.box(1.3, 0.3, 0.14, W, 0, 0.45, 0.66, { r: 0.06 }); // face plate
  hd.box(1.0, 0.08, 0.05, neon, 0, 0.5, 0.74); // eye slit
  for (const sx of [-1, 1]) hd.cyl(0.2, 0.14, W3, sx * 0.84, 0.5, 0, { axis: 'x', seg: 12 }); // ear bolts
  if (level >= 1) {
    hd.cyl(0.16, 0.16, W, 0.4, 0.5, 0.78, { axis: 'z', seg: 12 }); // scanner lens
    hd.cyl(0.11, 0.03, neon, 0.4, 0.5, 0.87, { axis: 'z', seg: 12 });
    hd.box(0.05, 0.5, 0.05, W3, 0.7, 1.2, -0.1); // antenna
    hd.ball(0.06, neon, 0.7, 1.46, -0.1, { seg: 8, rows: 5 });
  }
  t.box(2.1, 1.7, 1.14, W2, 0, 0.1, 0, { r: 0.1 });
  t.box(1.6, 1.1, 0.22, W, 0, 0.25, 0.58, { r: 0.06 }); // chest plate
  for (let i = 0; i < 3; i++) t.box(1.2, 0.05, 0.04, W3, 0, -0.05 + i * 0.25, 0.7); // armor ribs
  t.cyl(0.16, 0.05, neon, 0, 0.5, 0.71, { axis: 'z', seg: 14 }); // chest light
  t.box(2.12, 0.24, 1.16, W3, 0, -0.84, 0, { r: 0.04 }); // belt
  t.box(0.32, 0.2, 0.06, neon, 0, -0.84, 0.59, { r: 0.02 });
  if (level >= 2) {
    for (const sx of [-1, 1]) {
      t.cyl(0.1, 1.3, W3, sx * 0.55, 0.15, -0.7, { seg: 8 }); // coolant tubes
      t.cyl(0.06, 1.0, neon, sx * 0.55, 0.15, -0.79, { seg: 8 });
    }
  }
  if (level >= 3) shoulderPads(t, W, 0.62);
  if (level >= 4) {
    t.box(1.3, 1.2, 0.5, W, 0, 0.2, -0.85, { r: 0.1 }); // reactor housing
    t.cyl(0.32, 0.12, neon, 0, 0.2, -1.12, { axis: 'z', seg: 18 }); // reactor core
    t.torus(0.4, 0.05, W3, 0, 0.2, -1.12, { seg: 18 });
  }
  if (level >= 5) {
    for (const sx of [-1, 1]) {
      t.cyl(0.24, 0.9, W2, sx * 0.85, -0.1, -1.0, { seg: 14 }); // jet thrusters
      t.cyl(0.18, 0.06, neon, sx * 0.85, -0.58, -1.0, { seg: 14 });
    }
    t.box(0.8, 0.55, 0.9, W, -1.45, 1.35, -0.1, { r: 0.08 }); // rocket pod
    for (let i = 0; i < 3; i++) t.cyl(0.11, 0.05, neon, -1.7 + i * 0.25, 1.35, 0.37, { axis: 'z', seg: 10 });
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => {
    for (let i = 0; i < 3; i++) a.torus(0.5, 0.05, i === 1 ? neon : W3, 0, -0.95 - i * 0.22, 0, { seg: 16 }); // robot arm rings
  });
  feet(h, key, W2, (b) => {
    b.box(0.6, 0.45, 0.24, W, 0, -0.95, 0.56, { r: 0.06 }); // knee plate
    if (level >= 3) b.box(0.62, 0.06, 0.26, neon, 0, -0.78, 0.57);
  });
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = whiteBurstRifle(gk, neon, { big: level >= 2, howitzer: level >= 3, belt: level >= 4 });
  gk.done();
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = CYBORG_NEON;
  return own(h, UP);
}

export const MODELS = {
  commandoCyborg: makeCyborg,
};
