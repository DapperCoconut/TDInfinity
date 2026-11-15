// Tower models: people, batch 29 (dressed with the vehicle kit in ../vehicles.js).
// In here: Cyborg, Incinerator, Smuggler.
// Like batches 26-28 these are plain faceless figures: only their gear tells them apart, with
// accents in one neon colour per tower.
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.

import { glowMat } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { UP, aimLong, dome, fist, muzzle, own, wear } from './people1.js';
import { shoulderPads } from './people2.js';
import { feet, hands } from './people5.js';
import { cape } from './people18.js';

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

// ------------------------------------------------------------------ Incinerator (dark gray, neon orange)

const INC_NEON = 0xff6d00;
const D1 = 0x4a4d52; // dark gray armor
const D2 = 0x3a3c40;
const D3 = 0x5c6066;

/**
 * A dark gray incinerator cannon on the fist (gun space): a wide body, a fuel line, a flared
 * nozzle with a glowing core. o.long (Long Range+): a longer barrel with cooling fins. o.mk2
 * (Mk2+): a second side tank. o.ash (Ashmaker): a huge nozzle with three glowing rings.
 * Returns the bore point [y, z].
 */
function incineratorCannon(k, neon, o = {}) {
  const U = UP;
  const len = o.ash ? 2.6 : o.long ? 2.4 : 1.9;
  k.box(0.5, 1.1, 0.52, D1, 0, -0.35, U, { r: 0.09 }); // body
  k.cyl(0.17, len - 0.9, D2, 0, -0.9 - (len - 0.9) / 2, U, { seg: 12 }); // barrel
  if (o.long) for (let i = 0; i < 4; i++) k.cyl(0.26, 0.06, D3, 0, -1.1 - i * 0.22, U, { seg: 12 }); // cooling fins
  const mouth = o.ash ? 0.36 : 0.26;
  k.cyl(mouth, 0.36, D3, 0, -len, U, { seg: 14, r2: mouth * 0.6 }); // flared nozzle
  k.cyl(mouth * 0.7, 0.04, neon, 0, -len - 0.2, U, { seg: 14 }); // glowing core
  if (o.ash) for (let i = 0; i < 3; i++) k.torus(0.22, 0.04, neon, 0, -1.2 - i * 0.35, U, { rx: PI / 2, seg: 14 });
  k.box(0.26, 0.24, 0.5, D2, 0, 0.1, U - 0.38, { rx: -0.32, r: 0.04 }); // grip
  k.cyl(0.07, 0.9, neon, 0.3, -0.5, U - 0.1, { seg: 8 }); // glowing fuel line
  k.cyl(0.2, 0.7, D3, 0, 0.15, U - 0.5, { seg: 12 }); // fuel canister
  if (o.mk2) k.cyl(0.18, 0.6, D3, -0.36, -0.4, U, { seg: 12 }); // side tank
  return [-len - 0.2, U];
}

/**
 * Incinerator (alternate Hallowboomer): a faceless figure in heavy dark gray armor with neon
 * orange lights and an incinerator cannon. Lv 1 Intense Flames: twin fuel tanks on the back.
 * Lv 2 Long Range Incineration: a longer finned barrel and a range sight. Lv 3 Incinerator Mk2:
 * big shoulder armor and a side tank. Lv 4 Immolation: glowing vents all over the armor. Lv 5
 * Ashmaker: smoke stacks on the back and a huge nozzle.
 */
export function makeIncinerator(level) {
  const h = makeHumanoid({ skin: D1, shirt: D1, pants: D2, arms: D1, face: 'none' });
  const key = `hallowboomerIncinerator${level}`;
  const neon = glowMat(h, INC_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  dome(hd, 0.86, 0.72, D1, 0, 0.84, 0); // heavy helmet
  hd.box(1.4, 0.5, 0.2, D2, 0, 0.45, 0.62, { r: 0.08 }); // face guard
  hd.box(1.1, 0.1, 0.05, neon, 0, 0.55, 0.73); // visor slit
  for (let i = 0; i < 3; i++) hd.box(0.08, 0.2, 0.05, D3, -0.3 + i * 0.3, 0.3, 0.73); // breather grille
  if (level >= 2) {
    hd.box(0.14, 0.14, 0.45, D3, -0.85, 0.75, 0.3, { r: 0.03 }); // range sight
    hd.cyl(0.06, 0.02, neon, -0.85, 0.75, 0.53, { axis: 'z', seg: 10 });
  }
  t.box(2.3, 1.8, 1.3, D1, 0, 0.1, 0, { r: 0.12 }); // armored body
  t.box(1.7, 1.2, 0.24, D3, 0, 0.25, 0.66, { r: 0.08 }); // chest plate
  t.box(1.2, 0.08, 0.05, neon, 0, 0.5, 0.79);
  t.box(2.32, 0.28, 1.32, D2, 0, -0.84, 0, { r: 0.05 }); // belt
  t.box(0.34, 0.2, 0.06, neon, 0, -0.84, 0.67, { r: 0.02 });
  const tanks = level >= 1 ? [-0.45, 0.45] : [0];
  for (const x of tanks) {
    t.cyl(0.32, 1.4, D3, x, 0.15, -0.9, { seg: 14 }); // fuel tanks
    t.cyl(0.33, 0.08, neon, x, 0.45, -0.9, { seg: 14 });
  }
  if (level >= 3) shoulderPads(t, D3, 0.72);
  if (level >= 4) {
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) t.box(0.05, 0.3, 0.05, neon, sx * (0.55 + i * 0.12), -0.3, 0.67); // vents
    for (const sx of [-1, 1]) t.box(0.06, 0.6, 0.4, neon, sx * 1.17, 0.1, 0); // side vents
  }
  if (level >= 5) {
    for (const sx of [-1, 1]) {
      t.cyl(0.16, 1.2, D2, sx * 0.85, 1.3, -0.75, { seg: 12 }); // smoke stacks
      t.cyl(0.12, 0.05, neon, sx * 0.85, 1.92, -0.75, { seg: 12 });
    }
  }
  hd.done();
  t.done();
  hands(h, key, D2, D3, (a) => {
    a.box(1.1, 0.5, 1.1, D3, 0, -0.35, 0, { r: 0.06 }); // arm plate
    if (level >= 4) a.box(0.5, 0.06, 0.04, neon, 0, -0.55, 0.57);
  });
  feet(h, key, D2, (b) => {
    b.box(0.66, 0.5, 0.26, D3, 0, -0.95, 0.56, { r: 0.06 }); // knee armor
    b.box(0.66, 0.06, 0.28, neon, 0, -0.78, 0.57);
  });
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = incineratorCannon(gk, neon, { long: level >= 2, mk2: level >= 3, ash: level >= 5 });
  gk.done();
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = INC_NEON;
  return own(h, UP);
}

// ------------------------------------------------------------------ Smuggler (neon salmon)

const SMUG_NEON = 0xff8a80;

/**
 * A white blunderbuss on the fist (gun space): a wooden-shaped stock, a long barrel that flares
 * into a wide bell. o.bomb (Blunderbomb+): a bigger bell and a drum of bomb shells. Returns the
 * bore point [y, z].
 */
function whiteBlunderbuss(k, neon, o = {}) {
  const U = UP;
  const len = o.bomb ? 2.3 : 2.1;
  k.box(0.3, 1.0, 0.34, W2, 0, -0.3, U, { r: 0.06 }); // lock and body
  k.cyl(0.1, len - 1.0, W, 0, -0.8 - (len - 1.0) / 2, U + 0.04, { seg: 12 }); // barrel
  k.torus(0.13, 0.03, neon, 0, -1.0, U + 0.04, { rx: PI / 2, seg: 12 }); // barrel band
  const bell = o.bomb ? 0.34 : 0.26;
  k.cyl(bell, 0.4, W3, 0, -len, U + 0.04, { seg: 16, r2: 0.12 }); // flared bell
  k.torus(bell, 0.035, neon, 0, -len - 0.2, U + 0.04, { rx: PI / 2, seg: 16 });
  k.box(0.22, 0.3, 0.5, W3, 0, 0.12, U - 0.34, { rx: -0.32, r: 0.04 }); // grip
  k.box(0.26, 0.8, 0.4, W2, 0, 0.6, U - 0.05, { r: 0.1 }); // stock
  k.box(0.05, 0.12, 0.2, neon, 0, -0.2, U + 0.24); // hammer
  if (o.bomb) {
    k.cyl(0.3, 0.3, W, 0, -0.55, U - 0.42, { axis: 'x', seg: 16 }); // shell drum
    for (let i = 0; i < 4; i++) k.ball(0.07, neon, 0.17, -0.55 + Math.cos(i * PI / 2) * 0.18, U - 0.42 + Math.sin(i * PI / 2) * 0.18, { seg: 8, rows: 5 });
  }
  return [-len - 0.2, U + 0.04];
}

/**
 * Smuggler (alternate DJ): a white rogue with a bandana mask and a blunderbuss. Lv 1 Plunder: a
 * loot crate on the back with neon coins. Lv 2 Concussion: a bandolier of glowing shells. Lv 3
 * Blunderbomb: the bigger bomb blunderbuss and a hat. Lv 4 Hunting Crew: a long coat and a crew
 * flag on a pole on the back.
 */
export function makeSmuggler(level) {
  const h = blank();
  const key = `djSmuggler${level}`;
  const neon = glowMat(h, SMUG_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hd.box(1.66, 0.42, 1.66, W2, 0, 0.3, 0.02, { r: 0.12 }); // bandana mask
  hd.box(1.0, 0.06, 0.05, neon, 0, 0.42, 0.85);
  hd.box(0.3, 0.5, 0.12, W2, 0.3, 0.05, -0.84, { rz: 0.3 }); // knot tails
  if (level >= 3) {
    hd.cyl(1.2, 0.12, W3, 0, 1.0, 0, { seg: 20 }); // hat brim
    hd.cyl(0.72, 0.6, W, 0, 1.35, 0, { seg: 18, r2: 0.62 }); // hat crown
    hd.cyl(0.74, 0.1, neon, 0, 1.1, 0, { seg: 18 }); // hat band
  } else dome(hd, 0.8, 0.5, W, 0, 0.92, 0); // cap
  t.box(2.1, 1.7, 1.1, W, 0, 0.1, 0, { r: 0.1 });
  t.box(0.5, 1.5, 0.08, W3, 0, 0.1, 0.56); // vest seam
  t.box(2.12, 0.24, 1.12, W3, 0, -0.84, 0, { r: 0.04 }); // belt
  t.box(0.3, 0.2, 0.06, neon, 0, -0.84, 0.57, { r: 0.02 });
  for (const sx of [-1, 1]) t.box(0.36, 0.34, 0.3, W2, sx * 0.7, -0.84, 0.55, { r: 0.05 }); // pouches
  if (level >= 1) {
    t.box(1.4, 1.1, 0.7, W2, 0, 0.1, -0.9, { r: 0.05 }); // loot crate
    for (const y of [-0.3, 0.5]) t.box(1.42, 0.08, 0.72, W3, 0, y, -0.9);
    for (let i = 0; i < 3; i++) t.cyl(0.14, 0.05, neon, -0.35 + i * 0.35, 0.7, -0.9, { seg: 12 }); // coins on top
  }
  if (level >= 2) {
    t.box(0.28, 2.3, 0.1, W3, -0.2, 0.1, 0.6, { rz: -0.62 }); // bandolier
    for (let i = 0; i < 5; i++) t.cyl(0.07, 0.2, neon, -0.75 + i * 0.27, -0.35 + i * 0.22, 0.68, { seg: 8, rz: -0.62 });
  }
  if (level >= 4) {
    cape(t, W2, 2.3, { w: 2.2, clasp: SMUG_NEON }); // long coat
    t.cyl(0.05, 2.6, W3, 0.75, 1.1, -1.0, { seg: 8 }); // flag pole
    t.box(0.9, 0.6, 0.04, neon, 1.22, 2.1, -1.0); // crew flag
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => {
    if (level >= 2) a.box(0.5, 0.06, 0.04, neon, 0, -0.55, 0.55); // sleeve stripe
  });
  feet(h, key, W2, null);
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = whiteBlunderbuss(gk, neon, { bomb: level >= 3 });
  gk.done();
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = SMUG_NEON;
  return own(h, UP);
}

export const MODELS = {
  djSmuggler: makeSmuggler,
  commandoCyborg: makeCyborg,
  hallowboomerIncinerator: makeIncinerator,
};
