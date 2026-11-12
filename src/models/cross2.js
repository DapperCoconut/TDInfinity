// Tower models: crosspath forms, batch 2 (dressed with the vehicle kit in ../vehicles.js).
// In here: Sharpshooter (Marksman), Market (Farm), Vulcan (Commando), Electricizer (Railgunner),
// Trapper (Trapper X) and Bugler (Commander).
// CROSS maps a crosspath root tower key to a builder (a, b) => model, where a is the Top path tier
// and b the Bottom path tier; ../models.js uses it before the older CROSS_MODELS in newmodels/e.js.
// Every Top tier and every Bottom tier adds its own pieces, so each combo looks different.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.

import * as THREE from 'three';
import { crate, glowMat, jerry, kit, tone } from '../vehicles.js';
import { makeThing } from './bits.js';
import { makeHumanoid } from './kit.js';
import {
  GOLD, GUNMETAL, INK, LEATHER, STEEL, UP, WOOD, aimLong, armPatch, band, belt, collar, cowboyHat, dome, fist,
  goggles, hair, headband, helmet, kneePad, muzzle, own, pack, pockets, pouch, sash, vest, wear,
} from './people1.js';
import { boltRifle, shoulderPads } from './people2.js';
import { bandana, bandolier } from './people3.js';
import { monocleCap, seatBehind } from './people4.js';
import { feet, hands } from './people5.js';
import { neckScarf } from './people6.js';
import { gasMask } from './people7.js';
import { arc, coil, rubberGloves } from './people8.js';
import { bearTrap, held, mine, overhand, spikePlate } from './people9.js';
import { epaulettes, medals } from './people11.js';
import { spinBarrels } from './machines1.js';
import { bag, drum, flagPole, windowAt } from './machines2.js';
import { spinner } from './machines5.js';

const PI = Math.PI;
const BRASS = 0xc9a227;

// ------------------------------------------------------------------ Sharpshooter

/** A Molotov on the belt (torso space): a green bottle with a label, a rag in the neck, maybe lit. */
function molotov(k, x, y, z, flame) {
  k.cyl(0.14, 0.34, 0x558b2f, x, y, z, { seg: 10 });
  k.cyl(0.14, 0.14, 0x558b2f, x, y + 0.24, z, { seg: 10, r2: 0.05 }); // shoulder
  k.cyl(0.05, 0.14, 0x558b2f, x, y + 0.38, z, { seg: 8 }); // neck
  k.box(0.2, 0.14, 0.04, 0xfff3e0, x, y - 0.02, z + 0.13); // label
  k.box(0.12, 0.18, 0.12, 0xd7ccc8, x, y + 0.5, z, { r: 0.03 }); // rag
  k.box(0.05, 0.24, 0.1, 0xbcaaa4, x + 0.08, y + 0.36, z + 0.06, { rz: 0.35 }); // rag tail
  if (flame) {
    k.cyl(0.08, 0.26, flame, x, y + 0.72, z, { seg: 6, r2: 0.001 });
    k.cyl(0.05, 0.16, flame, x + 0.06, y + 0.64, z, { seg: 6, r2: 0.001, rz: -0.4 });
  }
}

/**
 * Sharpshooter (Marksman crosspath): a rifleman with a bolt-action rifle and a round helmet.
 * Top: 1 Training (gloves, arm patches, a rank badge and a sling), 2 Precise Aiming (a scope and
 * goggles up on the helmet), 3 Rifle Mastery (a chest rig, a black rifle with a bipod and a brake),
 * 4 True Survivalist (green, a bandana and face paint, a survival pack with a machete, a long mag).
 * Bottom: 1 Molotov (two bottles on the belt, one lit), 2 Wall of Flames (a red fuel can and knee
 * pads), 3 Flaming Bullets (brown shirt, a strap of glowing rounds, hot rings on the barrel),
 * 4 Superhot Gun (a scarf, heat gloves and a glowing vented barrel).
 */
export function makeSharpshooter(a, b) {
  const surv = a >= 4;
  const hot = b >= 3;
  const shirt = surv ? 0x2e7d32 : hot ? 0x4e342e : 0x8d6e63;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x3e2723, arms: shirt, face: 'soldier' });
  const key = `x2sharp${a}${b}`;
  const fire = glowMat(h, 0xff6d00);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (surv) {
    hair(hd, 0x3e2723, { h: 0.4 });
    bandana(hd, 0x1b5e20);
    for (const s of [-1, 1]) for (const dy of [0, 0.1]) hd.box(0.22, 0.05, 0.04, 0x1b5e20, s * 0.3, 0.5 - dy, 0.6, { ry: s * 0.35 }); // face paint
  } else {
    helmet(hd, a >= 3 ? 0x5d4037 : 0x795548, { cover: a >= 1 ? 0x4e342e : undefined });
    if (a >= 2) goggles(hd, 1.12, 0x4fc3f7, { r: 0.78 }); // up on the helmet
  }
  collar(t, tone(shirt, 0.85));
  pockets(t, tone(shirt, 0.9));
  belt(t, 0x3e2723, 0x9e9e9e);
  if (a >= 1) {
    // Training: a rank badge on the chest
    t.cyl(0.13, 0.04, GOLD, -0.5, 0.72, 0.54, { axis: 'z', seg: 6 });
    t.cyl(0.07, 0.05, 0xc62828, -0.5, 0.72, 0.56, { axis: 'z', seg: 6 });
  }
  if (a >= 3 && !surv) vest(t, 0x6d5d3f, { pouches: 3 });
  if (surv) {
    pack(t, 0x33691e, { w: 1.4, h: 1.6, d: 0.7, roll: 0x5d4037 });
    // a machete strapped to the pack
    t.box(0.06, 1.1, 0.24, 0xb0bec5, 0.62, 0.35, -1.27, { rz: 0.35, r: 0.02 });
    t.box(0.1, 0.4, 0.14, 0x3e2723, 0.85, -0.25, -1.27, { rz: 0.35, r: 0.03 });
    bandolier(t, 1);
  }
  if (b >= 1) {
    molotov(t, 0.72, -1.12, 0.6, null);
    molotov(t, -0.72, -1.12, 0.6, fire);
  }
  if (b >= 2) {
    // Wall of Flames: a red fuel can on the hip
    jerry(t, -1.2, -0.75, -0.1, 0xc62828);
    t.box(0.2, 0.06, 0.5, 0xfdd835, -1.34, -0.75, -0.1);
  }
  if (hot) {
    // Flaming Bullets: a strap of glowing rounds
    sash(t, 0x3e2723, -1, 0.3);
    const rz = -0.62;
    for (let i = 0; i < 6; i++) {
      const s = -0.85 + i * 0.34;
      const x = -Math.sin(rz) * s;
      const y = Math.cos(rz) * s;
      t.cyl(0.06, 0.22, BRASS, x, y, 0.62, { rz: rz + PI / 2, seg: 6 });
      t.cyl(0.04, 0.1, fire, x + Math.cos(rz) * 0.15, y + Math.sin(rz) * 0.15, 0.62, { rz: rz + PI / 2, seg: 6, r2: 0.01 });
    }
  }
  if (b >= 4) neckScarf(t, 0xbf360c);
  hd.done();
  t.done();
  const glov = b >= 4 ? 0xff7043 : a >= 1 ? 0x5d4037 : null;
  hands(h, key, glov, tone(shirt, 0.8), (arm, s) => {
    if (a >= 1) armPatch(arm, s, tone(shirt, 0.75), s > 0 ? GOLD : 0xc62828);
  });
  feet(h, key, 0x3e2723, b >= 2 ? kneePad : null);
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = boltRifle(gk, {
    len: a >= 3 ? 2.95 : 2.6,
    wood: hot ? 0x3e2723 : a >= 3 ? 0x212121 : 0x5d4037,
    metal: b >= 4 ? 0x3a2a26 : GUNMETAL,
    scope: a >= 2 ? (a >= 3 ? 1.25 : 1.0) : false,
    lens: hot ? 0xff6d00 : 0x4fc3f7,
    brake: a >= 3,
    bipod: a === 3,
  });
  if (a >= 1) gk.tube([[0, 0.75, UP - 0.28], [0, -0.2, UP - 0.55], [0, -1.2, UP - 0.25]], 0.025, LEATHER, { seg: 8, sides: 4 }); // sling
  if (surv) gk.box(0.2, 0.32, 0.85, INK, 0, -0.32, UP - 0.62, { r: 0.03 }); // a long box mag for fast fire
  if (hot && b < 4) for (let i = 0; i < 3; i++) gk.torus(0.1, 0.035, fire, 0, -1.45 - i * 0.35, z, { rx: PI / 2, seg: 12 });
  if (b >= 4) {
    // Superhot Gun: a heat shroud glowing through dark fins
    gk.cyl(0.12, 1.15, glowMat(h, 0xff3d00), 0, -1.75, z, { seg: 12 });
    for (let i = 0; i < 6; i++) gk.torus(0.13, 0.035, 0x37474f, 0, -1.25 - i * 0.2, z, { rx: PI / 2, seg: 12 });
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = b >= 4 ? 0xff3d00 : hot ? 0xff6d00 : 0xffe082;
  return own(h);
}

// ------------------------------------------------------------------ Market

/** A "$" sign standing up, facing +z (any space; centred on x, y, z, `s` tall). */
function dollar(k, x, y, z, s, mat) {
  const w = s * 0.5;
  const t = s * 0.12;
  for (const f of [-0.5, 0, 0.5]) k.box(w, t, 0.06, mat, x, y + f * (s - t), z);
  k.box(t, s * 0.5, 0.06, mat, x - (w - t) / 2, y + s * 0.25, z);
  k.box(t, s * 0.5, 0.06, mat, x + (w - t) / 2, y - s * 0.25, z);
  k.box(t * 0.6, s * 1.25, 0.05, mat, x, y, z - 0.01);
}

/** A crate of fruit (any space; its foot on y). */
function fruitCrate(k, x, y, z, fruit, w = 0.6) {
  k.box(w, 0.32, 0.45, 0x8d6e63, x, y + 0.16, z, { r: 0.02 });
  for (const f of [0.1, 0.24]) k.box(w + 0.02, 0.04, 0.47, 0x6d4c41, x, y + f, z);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    k.ball(0.1, tone(fruit, 1 - ((i + j) % 2) * 0.12), x + (i - 1) * w * 0.3, y + 0.36, z + (j - 0.5) * 0.2, { seg: 8, rows: 6 });
  }
}

/** A cash register (any space; its foot on y, facing +z). */
function register(k, x, y, z, col = 0x37474f, screen = 0x76ff03) {
  k.box(0.7, 0.24, 0.55, col, x, y + 0.12, z, { r: 0.04 }); // cash drawer
  k.slab(0.62, 0.22, 0.42, tone(col, 0.85), x, y + 0.35, z - 0.04, { td: 0.6, tz: -0.08 }); // keypad body
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) k.box(0.1, 0.03, 0.08, 0xeceff1, x - 0.15 + i * 0.15, y + 0.44 - j * 0.03, z + 0.06 - j * 0.07, { rx: 0.4 });
  k.box(0.4, 0.24, 0.06, INK, x, y + 0.6, z - 0.2, { r: 0.02 }); // display
  k.box(0.32, 0.12, 0.02, screen, x, y + 0.62, z - 0.165);
  k.box(0.24, 0.03, 0.06, 0xcfd8dc, x, y + 0.13, z + 0.28); // drawer handle
}

/** A string of pennants hanging between two points (any space). */
function bunting(k, p0, p1, n, sag = 0.25) {
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const f = i / 8;
    pts.push([p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f - Math.sin(f * PI) * sag, p0[2] + (p1[2] - p0[2]) * f]);
  }
  k.tube(pts, 0.015, 0xeeeeee, { sides: 3 });
  const cols = [0xe53935, 0xfdd835, 0x1e88e5, 0x43a047];
  const ry = Math.atan2(p1[0] - p0[0], p1[2] - p0[2]) - PI / 2;
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n;
    const px = p0[0] + (p1[0] - p0[0]) * f;
    const py = p0[1] + (p1[1] - p0[1]) * f - Math.sin(f * PI) * sag;
    const pz = p0[2] + (p1[2] - p0[2]) * f;
    k.prism([[-0.13, 0], [0.13, 0], [0, -0.3]], 0.02, cols[i % 4], px, py, pz, { ry: ry + PI / 2 });
  }
}

/** A balloon on a string tied at (x, y, z). */
function balloon(k, x, y, z, col, tall = 1.2, lean = 0) {
  k.tube([[x, y, z], [x + lean * 0.5, y + tall * 0.5, z], [x + lean, y + tall, z]], 0.01, 0xeeeeee, { sides: 3 });
  k.ball(0.22, col, x + lean, y + tall + 0.22, z, { seg: 12, rows: 9, sy: 1.2 });
  k.cyl(0.04, 0.06, tone(col, 0.8), x + lean, y + tall - 0.03, z, { seg: 6, r2: 0.02 });
}

/**
 * Market (Farm crosspath): a striped market stall on a paved square, with fruit on the counter.
 * Top: 1 Advertising (a lit sign over the stall and a sandwich board), 2 Extra Storage (a pallet
 * of crates and a barrel), 3 Small Business (the stall becomes a brick shop with a window, a door
 * and a rooftop billboard), 4 Government Agency (white stone, columns, steps, a pediment and a flag).
 * Bottom: 1 Cash Register, 2 Enthusiasm (bunting, balloons and an OPEN sign), 3 Banking (blue
 * awning, a vault door and a "$" sign), 4 Economic Boost (gold: bars, coins and a glowing sign).
 */
export function makeMarket(a, b) {
  const u = makeThing();
  const k = kit(u, u.body, `x2market${a}${b}`);
  const shop = a >= 3;
  const agency = a >= 4;
  const bank = b >= 3;
  const boost = b >= 4;
  const goldM = glowMat(u, 0xffd54f, 0.6);
  const lit = glowMat(u, bank ? 0x80d8ff : 0xffee58, 0.7);
  // the paved square
  k.slab(4.4, 0.3, 4.4, 0xbdbdbd, 0, 0.15, 0, { tw: 0.98, td: 0.98 });
  for (let i = -3; i <= 3; i++) {
    k.box(4.25, 0.02, 0.04, 0x9e9e9e, 0, 0.305, i * 0.6);
    k.box(0.04, 0.02, 4.25, 0x9e9e9e, i * 0.6, 0.305, 0);
  }
  const Y = 0.3;
  let counterY = 1.37; // where the register stands
  let counterX = 0.85;
  let counterZ = 0.75;
  if (!shop) {
    // ---- the stall: plank floor, back wall, four posts, a counter and a striped awning
    const W = 2.8;
    const red = bank ? 0x1565c0 : 0xd32f2f;
    k.box(W + 0.2, 0.12, 2.4, 0x8d6e63, 0, Y + 0.06, -0.2);
    k.box(W, 2.3, 0.14, 0xa1887f, 0, Y + 1.15, -1.33);
    for (let i = 1; i < 6; i++) k.box(0.03, 2.3, 0.02, 0x8d6e63, -W / 2 + i * (W / 6), Y + 1.15, -1.25);
    for (const sx of [-1, 1]) for (const z of [-1.33, 0.95]) {
      k.box(0.18, 2.75, 0.18, 0x6d4c41, sx * W / 2, Y + 1.38, z, { r: 0.03 });
      k.box(0.26, 0.1, 0.26, 0x4e342e, sx * W / 2, Y + 0.05, z);
    }
    k.box(W - 0.2, 0.85, 0.6, 0x8d6e63, 0, Y + 0.48, 0.75, { r: 0.04 }); // counter
    for (let i = 0; i < 3; i++) k.box(W - 0.18, 0.03, 0.02, 0x6d4c41, 0, Y + 0.2 + i * 0.25, 1.06);
    k.box(W, 0.1, 0.75, 0x5d4037, 0, Y + 0.95, 0.75, { r: 0.02 }); // counter top
    // shelves on the back wall with jars
    for (const sy of [1.25, 1.85]) {
      k.box(W - 0.3, 0.06, 0.32, 0x6d4c41, 0, Y + sy, -1.12);
      if (!bank) for (let i = 0; i < 5; i++) k.cyl(0.09, 0.24, [0xffb300, 0xe53935, 0x7cb342][(i + sy * 10) % 3 | 0], -0.9 + i * 0.45, Y + sy + 0.15, -1.1, { seg: 8 });
    }
    // the awning: stripes sloping down to the front, a scalloped edge
    const n = 8;
    const slope = Math.atan2(0.5, 2.5);
    for (let i = 0; i < n; i++) {
      const x = -W / 2 - 0.1 + (i + 0.5) * ((W + 0.2) / n);
      const c = i % 2 ? 0xfafafa : red;
      k.box((W + 0.2) / n + 0.005, 0.06, 2.6, c, x, Y + 2.55, -0.18, { rx: slope });
      k.box((W + 0.2) / n, 0.26, 0.05, c, x, Y + 2.2, 1.12, { r: 0.02 });
    }
    // fruit on the counter
    fruitCrate(k, -0.85, Y + 1.0, 0.75, 0xe53935);
    fruitCrate(k, -0.15, Y + 1.0, 0.75, 0xffb300);
    if (!bank) fruitCrate(k, 0.0, Y + 0.0, 1.45, 0x7cb342, 0.7);
    if (bank) {
      // Banking: a big safe out front with a round vault door, and money bags beside it
      const vx = -1.6;
      const vz = 1.5;
      const vy = Y + 0.72;
      k.box(0.95, 1.05, 0.85, 0x546e7a, vx, Y + 0.62, vz, { r: 0.06 });
      for (const sx of [-1, 1]) for (const dz of [-1, 1]) k.box(0.14, 0.1, 0.14, INK, vx + sx * 0.35, Y + 0.05, vz + dz * 0.3); // feet
      k.box(0.99, 0.08, 0.89, 0x455a64, vx, Y + 1.12, vz);
      k.cyl(0.38, 0.08, 0x78909c, vx, vy, vz + 0.45, { axis: 'z', seg: 20 });
      k.torus(0.38, 0.04, 0x37474f, vx, vy, vz + 0.49, { seg: 20 });
      for (let i = 0; i < 3; i++) k.box(0.5, 0.05, 0.05, boost ? goldM : 0xcfd8dc, vx, vy, vz + 0.55, { rz: (i * PI) / 3 }); // wheel spokes
      k.cyl(0.08, 0.1, boost ? goldM : 0xcfd8dc, vx, vy, vz + 0.55, { axis: 'z', seg: 10 });
      for (let i = 0; i < 8; i++) {
        const t = (i / 8) * PI * 2;
        k.cyl(0.03, 0.04, INK, vx + Math.cos(t) * 0.31, vy + Math.sin(t) * 0.31, vz + 0.5, { axis: 'z', seg: 6 }); // bolts
      }
      for (const dy of [-0.22, 0.22]) k.box(0.1, 0.14, 0.12, INK, vx - 0.42, vy + dy, vz + 0.45); // hinges
      k.cyl(0.08, 0.06, 0xfafafa, vx + 0.3, Y + 1.0, vz + 0.44, { axis: 'z', seg: 10 }); // dial
      for (const [x, z, s] of [[-0.95, 1.95, 0.9], [-1.95, 2.0, 0.7]]) {
        k.ball(0.26 * s, 0xd7ccc8, x, Y + 0.3 * s, z, { seg: 10, rows: 8, sy: 1.1 });
        k.cyl(0.08 * s, 0.14, 0xbcaaa4, x, Y + 0.62 * s, z, { seg: 8, r2: 0.12 * s });
        dollar(k, x, Y + 0.3 * s, z + 0.27 * s, 0.25 * s, 0x2e7d32);
      }
    }
    if (boost) {
      // Economic Boost: gold bars and a coin pile on a cart out front
      k.box(1.3, 0.12, 0.8, 0x6d4c41, 0.0, Y + 0.45, 1.6);
      for (const sx of [-1, 1]) k.cyl(0.2, 0.08, INK, sx * 0.55, Y + 0.2, 1.6, { axis: 'x', seg: 12 });
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) k.slab(0.36, 0.14, 0.2, goldM, -0.4 + i * 0.4, Y + 0.58, 1.5 + j * 0.24, { tw: 0.8, td: 0.7 });
      for (let i = 0; i < 2; i++) k.slab(0.36, 0.14, 0.2, goldM, -0.2 + i * 0.4, Y + 0.72, 1.62, { tw: 0.8, td: 0.7 });
      k.cyl(0.32, 0.25, goldM, 0.45, Y + 1.12, 0.75, { seg: 12, r2: 0.05 }); // coin pile on the counter
      for (let i = 0; i < 4; i++) k.cyl(0.1, 0.03, goldM, 0.2 + i * 0.12, Y + 1.02, 0.95 - i * 0.05, { seg: 10 });
    }
    if (a >= 1) {
      // Advertising: a lit sign above the stall
      for (const sx of [-1, 1]) k.box(0.1, 0.9, 0.1, 0x4e342e, sx * 1.0, Y + 3.05, -1.3);
      k.box(2.5, 0.8, 0.14, bank ? 0x0d47a1 : 0xfdd835, 0, Y + 3.5, -1.3, { r: 0.05 });
      k.box(2.6, 0.08, 0.2, 0x4e342e, 0, Y + 3.92, -1.3);
      if (bank) dollar(k, 0, Y + 3.5, -1.2, 0.55, boost ? goldM : lit);
      else for (let i = 0; i < 3; i++) k.box(0.5, 0.36, 0.03, lit, -0.75 + i * 0.75, Y + 3.5, -1.22, { r: 0.02 });
      for (let i = 0; i < 7; i++) k.ball(0.05, i % 2 ? lit : 0xfafafa, -1.2 + i * 0.4, Y + 3.98, -1.22, { seg: 6, rows: 4 }); // bulbs
    }
  } else {
    // ---- the shop: walls, a plinth, a flat roof with a parapet, a big window and a door
    const SW = 3.4;
    const SD = 2.3;
    const SH = 2.8;
    const sz = -0.8;
    const fz = sz + SD / 2; // the front wall
    const wall = agency ? 0xeceff1 : 0xb5523b;
    k.box(SW + 0.12, 0.3, SD + 0.12, agency ? 0xcfd8dc : 0x9e9e9e, 0, Y + 0.15, sz);
    k.box(SW, SH, SD, wall, 0, Y + 0.3 + SH / 2, sz);
    if (!agency) {
      for (let i = 1; i < 10; i++) k.box(SW + 0.02, 0.025, SD + 0.02, tone(wall, 0.8), 0, Y + 0.3 + i * (SH / 10), sz); // brick courses
    } else {
      for (let i = 1; i < 5; i++) k.box(SW + 0.02, 0.03, SD + 0.02, 0xcfd8dc, 0, Y + 0.3 + i * (SH / 5), sz); // stone courses
    }
    k.box(SW + 0.3, 0.2, SD + 0.3, agency ? 0xcfd8dc : 0x5d4037, 0, Y + SH + 0.4, sz);
    for (const sx of [-1, 1]) k.box(0.14, 0.3, SD + 0.3, tone(wall, 0.85), sx * (SW / 2 + 0.08), Y + SH + 0.65, sz); // parapet
    k.box(SW + 0.3, 0.3, 0.14, tone(wall, 0.85), 0, Y + SH + 0.65, sz - SD / 2 - 0.08);
    windowAt(k, -0.7, Y + 1.55, fz + 0.03, 1.5, 1.2, agency ? 0x90a4ae : 0xfafafa);
    k.box(0.85, 1.75, 0.06, agency ? 0x37474f : 0x2e7d32, 0.95, Y + 1.2, fz + 0.03); // door
    k.box(0.5, 0.6, 0.04, 0x9ecbe0, 0.95, Y + 1.55, fz + 0.07);
    k.ball(0.05, GOLD, 1.25, Y + 1.1, fz + 0.09, { seg: 6, rows: 4 });
    k.box(1.0, 0.1, 0.12, tone(wall, 0.8), 0.95, Y + 2.12, fz + 0.06);
    // goods behind the window
    for (let i = 0; i < 3; i++) k.cyl(0.13, 0.36, [0xffb300, 0xe53935, 0x7cb342][i], -1.15 + i * 0.45, Y + 1.15, fz - 0.15, { seg: 8 });
    // the rooftop billboard (Advertising)
    for (const sx of [-1, 1]) k.box(0.1, 0.9, 0.1, INK, sx * 1.1, Y + SH + 0.9, sz - 0.4);
    k.box(2.8, 0.9, 0.14, agency ? 0x1565c0 : 0xfdd835, 0, Y + SH + 1.6, sz - 0.4, { r: 0.05 });
    k.box(2.9, 0.08, 0.22, INK, 0, Y + SH + 2.08, sz - 0.4);
    for (let i = 0; i < 3; i++) k.box(0.6, 0.4, 0.03, agency ? glowMat(u, 0xffffff, 0.6) : lit, -0.85 + i * 0.85, Y + SH + 1.6, sz - 0.32, { r: 0.02 });
    if (!agency) {
      // an awning over the window and the door
      const n = 8;
      for (let i = 0; i < n; i++) {
        const x = -SW / 2 + (i + 0.5) * (SW / n);
        k.box(SW / n + 0.005, 0.05, 0.9, i % 2 ? 0xfafafa : 0x2e7d32, x, Y + 2.38, fz + 0.42, { rx: 0.45 });
        k.box(SW / n, 0.2, 0.04, i % 2 ? 0xfafafa : 0x2e7d32, x, Y + 2.1, fz + 0.83, { r: 0.02 });
      }
      // a fruit stand out front
      k.box(1.2, 0.08, 0.6, 0x6d4c41, -0.95, Y + 0.85, 1.25);
      for (const sx of [-1, 1]) for (const dz of [-1, 1]) k.box(0.07, 0.8, 0.07, 0x4e342e, -0.95 + sx * 0.52, Y + 0.42, 1.25 + dz * 0.24);
      fruitCrate(k, -1.2, Y + 0.89, 1.25, 0xe53935, 0.5);
      fruitCrate(k, -0.7, Y + 0.89, 1.25, 0xffb300, 0.5);
      counterY = Y + 0.89;
      counterX = -0.55;
      counterZ = 1.25;
    } else {
      // Government Agency: steps, four columns, an entablature and a pediment, a flag on the roof
      for (let i = 0; i < 3; i++) k.box(3.0 - i * 0.2, 0.15, 1.0 - i * 0.25, 0xe0e0e0, 0, Y + 0.075 + i * 0.15, fz + 0.55 - i * 0.12);
      for (const x of [-1.2, -0.4, 0.4, 1.2]) {
        k.cyl(0.16, 2.4, 0xfafafa, x, Y + 0.45 + 1.2, fz + 0.75, { seg: 12, r2: 0.14 });
        k.box(0.42, 0.12, 0.42, 0xe0e0e0, x, Y + 0.51, fz + 0.75);
        k.box(0.42, 0.14, 0.42, 0xe0e0e0, x, Y + 2.9, fz + 0.75);
      }
      k.box(3.2, 0.3, 1.1, 0xeceff1, 0, Y + 3.12, fz + 0.4);
      k.box(3.22, 0.06, 1.12, 0xcfd8dc, 0, Y + 3.0, fz + 0.4);
      k.prism([[-0.55, 0], [0.55, 0], [0, 0.55]], 3.2, 0xeceff1, 0, Y + 3.27, fz + 0.4, { ry: PI / 2 });
      k.prism([[-0.4, 0], [0.4, 0], [0, 0.38]], 0.04, 0xcfd8dc, 0, Y + 3.32, fz + 0.97, { ry: PI / 2 });
      k.cyl(0.14, 0.03, GOLD, 0, Y + 3.48, fz + 0.99, { axis: 'z', seg: 12 }); // seal
      flagPole(k, -1.3, Y + SH + 0.5, sz - 0.6, 2.0, 0x1e88e5, 0xfafafa);
      counterY = Y + 0.3;
      counterX = 1.55;
      counterZ = 1.55;
    }
  }
  if (a >= 1 && !bank) {
    // a sandwich board out front
    const sx = shop ? 1.75 : -1.75;
    for (const s of [-1, 1]) k.box(0.6, 0.85, 0.05, 0x5d4037, sx, Y + 0.42, 1.75 + s * 0.12, { rx: s * 0.18 });
    k.box(0.48, 0.6, 0.02, 0x263238, sx, Y + 0.45, 1.89, { rx: 0.18 });
    k.box(0.3, 0.06, 0.02, 0xfafafa, sx, Y + 0.55, 1.9, { rx: 0.18 });
    k.box(0.22, 0.06, 0.02, 0xfafafa, sx, Y + 0.42, 1.92, { rx: 0.18 });
  }
  if (a >= 2) {
    // Extra Storage: a pallet of crates and a barrel at the front corner
    const px = shop ? 1.55 : 1.65;
    const pz = shop ? 0.85 : 1.6;
    k.box(0.9, 0.12, 0.9, 0xa1887f, px, Y + 0.06, pz);
    for (const dx of [-0.3, 0, 0.3]) k.box(0.12, 0.1, 0.9, 0x6d4c41, px + dx, Y + 0.05, pz);
    crate(k, px - 0.18, Y + 0.32, pz - 0.1, 0.45, 0.4, 0.5, 0x8d6e63);
    crate(k, px + 0.2, Y + 0.32, pz + 0.12, 0.4, 0.4, 0.45, 0x795548);
    crate(k, px, Y + 0.72, pz, 0.4, 0.36, 0.42, 0xa1887f);
    if (!shop) drum(k, px - 0.05, Y, pz - 0.85, 0x1565c0, 0xfafafa);
  }
  if (b >= 1) register(k, counterX, counterY, counterZ, boost ? 0xb8860b : 0x37474f);
  if (b >= 2) {
    // Enthusiasm: bunting, balloons and a glowing OPEN sign
    if (shop) bunting(k, [-1.75, Y + 2.95, 0.4], [1.75, Y + 2.95, 0.4], 9, 0.2);
    else bunting(k, [-1.45, Y + 2.65, 1.0], [1.45, Y + 2.65, 1.0], 8, 0.22);
    const bx = shop ? -1.95 : 1.45;
    const bz = shop ? 0.6 : 1.0;
    balloon(k, bx, Y + 1.2, bz, 0xe53935, 1.1, -0.1);
    balloon(k, bx, Y + 1.2, bz, 0x1e88e5, 1.3, 0.25);
    balloon(k, bx, Y + 1.2, bz, 0xfdd835, 0.9, 0.05);
    const open = glowMat(u, 0xff4081, 0.9);
    const ox = shop ? -0.7 : -1.05;
    const oy = shop ? Y + 1.8 : Y + 2.05;
    const oz = shop ? 0.42 : -1.24;
    k.box(0.8, 0.32, 0.04, INK, ox, oy, oz, { r: 0.04 });
    k.box(0.68, 0.2, 0.02, open, ox, oy, oz + 0.03);
  }
  k.done();
  u.height = agency ? 4.3 : shop ? 4.0 : a >= 1 ? 4.2 : 3.2;
  return u;
}

// ------------------------------------------------------------------ Vulcan

/**
 * Vulcan (Commando crosspath): a gunner on a stool behind a minigun on a stand; its barrels spin
 * while it fires. Top: 1 Faster Spinup (a bigger motor with a glowing ring), 2 Quicker Rotations
 * (cooling fins and a second motor), 3 Double Tap (two guns side by side), 4 Radioactive Bullets
 * (glowing green barrels, a gas mask and a radioactive ammo can). Bottom: 1 Gloves (and a wrist
 * band), 2 Heavy Armor (a helmet, a vest and armour plates on the gun), 3 Better Structure (a dark
 * steel pedestal behind sandbags), 4 Plasma Reactor (a purple suit and a glowing reactor on the gun).
 */
export function makeVulcan(a, b) {
  const twin = a >= 3;
  const rad = a >= 4;
  const armor = b >= 2;
  const sturdy = b >= 3;
  const plasma = b >= 4;
  const shirt = plasma ? 0x2a2140 : 0x556b2f;
  const h = makeHumanoid({ skin: 0xa0522d, shirt, pants: plasma ? 0x15101f : 0x3e3a2a, arms: 0xa0522d, face: 'soldier' });
  const key = `x2vulcan${a}${b}`;
  const green = glowMat(h, 0x76ff03);
  const purple = glowMat(h, 0xb388ff);
  const amber = glowMat(h, 0xffab00);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x1b1b1b, { h: 0.44 });
  if (armor) helmet(hd, plasma ? 0x37304a : 0x4b5320);
  else headband(hd, 0xc62828, 1.0);
  if (rad) gasMask(hd, 0x37474f, green);
  // a tank top: straps over the shoulders and a scoop neck
  for (const s of [-1, 1]) t.box(0.36, 0.2, 1.06, shirt, s * 0.62, 0.98, 0, { r: 0.04 });
  t.box(0.9, 0.08, 0.06, tone(shirt, 0.7), 0, 0.82, 0.52);
  if (armor) {
    vest(t, plasma ? 0x37304a : 0x5d6b3a, { pouches: 2 });
    if (plasma) {
      t.cyl(0.24, 0.1, 0x4a3f63, 0, 0.45, 0.72, { axis: 'z', seg: 14 });
      t.cyl(0.17, 0.06, purple, 0, 0.45, 0.78, { axis: 'z', seg: 14 });
    }
  } else bandolier(t, 1);
  belt(t, 0x3e2723, 0xb0b0b0);
  hd.done();
  t.done();
  hands(h, key, b >= 1 ? 0x212121 : null, 0x3e2723);
  feet(h, key, plasma ? 0x15101f : 0x4e3b28, armor ? kneePad : null);
  const steel = plasma ? 0x37304a : sturdy ? 0x37474f : 0x546e7a;
  seatBehind(h, key, steel);
  // ---- the stand and the gun (root space, firing along +z)
  const mount = new THREE.Group();
  h.root.add(mount);
  const k = wear(h, mount, `${key}:mount`);
  const gy = 2.85; // the barrel line
  const gz = 1.8; // the back of the gun
  const sz = 2.6; // where the stand is
  if (sturdy) {
    // Better Structure: a bolted pedestal behind a crescent of sandbags
    k.cyl(0.95, 0.25, 0x455a64, 0, 0.13, sz, { seg: 18 });
    for (let i = 0; i < 8; i++) {
      const t2 = (i / 8) * PI * 2;
      k.cyl(0.06, 0.08, INK, Math.cos(t2) * 0.8, 0.29, sz + Math.sin(t2) * 0.8, { seg: 6 });
    }
    k.cyl(0.32, gy - 0.85, steel, 0, 0.25 + (gy - 0.85) / 2, sz, { seg: 14, r2: 0.24 });
    for (let i = 0; i < 4; i++) k.box(0.08, 0.7, 0.4, tone(steel, 0.8), Math.cos(i * PI / 2) * 0.3, 0.6, sz + Math.sin(i * PI / 2) * 0.3, { ry: -i * PI / 2 }); // gussets
    for (let i = 0; i < 5; i++) {
      const t2 = 0.25 * PI + (i / 4) * 0.5 * PI;
      bag(k, 0.7, 0.42, Math.cos(t2) * 1.35, 0, sz + 0.15 + Math.sin(t2) * 1.35, undefined, -t2 + PI / 2);
      if (i > 0 && i < 4) bag(k, 0.66, 0.4, Math.cos(t2 + 0.06) * 1.35, 0.32, sz + 0.15 + Math.sin(t2 + 0.06) * 1.35, undefined, -t2 + PI / 2);
    }
  } else {
    k.cyl(0.13, gy - 1.0, steel, 0, 0.5 + (gy - 1.0) / 2, sz, { seg: 10 });
    for (const t2 of [0, 2.1, 4.2]) {
      const sx = Math.sin(t2);
      const sw = Math.cos(t2);
      k.tube([[sx * 0.1, 1.05, sz + sw * 0.1], [sx * 1.0, 0.05, sz + sw * 1.0]], 0.07, steel, { seg: 4, sides: 6 });
      k.cyl(0.15, 0.06, INK, sx * 1.0, 0.03, sz + sw * 1.0, { seg: 10 });
    }
  }
  k.cyl(0.34, 0.2, tone(steel, 0.8), 0, gy - 0.6, sz, { seg: 16 }); // swivel
  k.box(twin ? 1.4 : 0.32, 0.36, 0.5, steel, 0, gy - 0.45, sz, { r: 0.05 }); // yoke
  k.done();
  // the gun, a little bigger than life, scaled about its back end so the grips stay at the hands
  const GS = 1.3;
  const gunG = new THREE.Group();
  gunG.position.set(0, gy * (1 - GS), gz * (1 - GS));
  gunG.scale.setScalar(GS);
  mount.add(gunG);
  const gk = wear(h, gunG, `${key}:gun`);
  const xs = twin ? [-0.5, 0.5] : [0];
  const len = rad ? 2.3 : 1.85;
  const barrelCol = rad ? green : plasma ? purple : 0x1f1f1f;
  const gunCol = plasma ? 0x4a3f63 : 0x424242;
  h.muzzles = [];
  for (const x of xs) {
    gk.box(0.68, 0.7, 1.2, gunCol, x, gy, gz + 0.6, { r: 0.1 }); // receiver
    for (let i = 0; i < 3; i++) gk.box(0.7, 0.04, 0.04, tone(gunCol, 0.7), x, gy + 0.2 - i * 0.2, gz + 1.21); // face lines
    gk.cyl(0.3, 0.25, tone(gunCol, 0.8), x, gy, gz + 1.32, { axis: 'z', seg: 16 }); // front bearing
    // the motor on top at the back
    const mr = a >= 1 ? 0.24 : 0.18;
    gk.cyl(mr, 0.55, 0x37474f, x, gy + 0.35 + mr * 0.6, gz + 0.35, { axis: 'z', seg: 14 });
    gk.cyl(mr * 0.7, 0.06, INK, x, gy + 0.35 + mr * 0.6, gz + 0.07, { axis: 'z', seg: 12 });
    if (a >= 1) gk.torus(mr + 0.01, 0.035, amber, x, gy + 0.35 + mr * 0.6, gz + 0.5, { seg: 14 });
    if (a >= 2) {
      // Quicker Rotations: cooling fins down both sides and a second motor
      for (let i = 0; i < 5; i++) for (const s of [-1, 1]) gk.box(0.1, 0.5, 0.05, tone(gunCol, 0.75), x + s * 0.38, gy, gz + 0.3 + i * 0.18);
      gk.cyl(0.14, 0.4, 0x37474f, x, gy - 0.42, gz + 0.5, { axis: 'z', seg: 12 });
    }
    const z0 = gz + 1.45;
    spinBarrels(h, gunG, `${key}:barrels`, x, gy, z0, len, 6, 0.2, barrelCol);
    const m = new THREE.Object3D();
    m.position.set(x, gy, z0 + len + 0.1);
    gunG.add(m);
    h.muzzles.push(m);
  }
  // spade grips behind the gun, where the hands are
  const hx = 0.85 / GS;
  gk.tube([[-hx, gy - 0.12, gz - 0.02], [-hx * 0.4, gy - 0.12, gz + 0.1], [hx * 0.4, gy - 0.12, gz + 0.1], [hx, gy - 0.12, gz - 0.02]], 0.05, INK, { seg: 10, sides: 6 });
  for (const s of [-1, 1]) {
    gk.cyl(0.08, 0.45, 0x212121, s * hx, gy - 0.12, gz - 0.02, { seg: 8 });
    gk.torus(0.08, 0.02, INK, s * hx, gy - 0.35, gz - 0.02, { rx: PI / 2, seg: 8 });
  }
  gk.box(0.14, 0.12, 0.2, 0xc62828, 0, gy + 0.02, gz + 0.02); // trigger paddle
  // ammo
  const canX = twin ? 1.3 : -0.78;
  for (const x of twin ? [-canX, canX] : [canX]) {
    const can = rad ? 0xfdd835 : 0x4b5320;
    gk.box(0.5, 0.6, 0.75, can, x, gy - 0.15, gz + 0.85, { r: 0.04 });
    gk.box(0.54, 0.1, 0.79, tone(can, 0.8), x, gy + 0.18, gz + 0.85, { r: 0.02 });
    if (rad) {
      // a radioactive mark: a glowing hub and three blades
      const fx = x + Math.sign(x) * 0.26;
      gk.cyl(0.06, 0.03, green, fx, gy - 0.12, gz + 0.85, { axis: 'x', seg: 10 });
      for (let i = 0; i < 3; i++) {
        const t2 = (i / 3) * PI * 2 + PI / 2;
        gk.box(0.03, 0.14, 0.12, INK, fx, gy - 0.12 + Math.sin(t2) * 0.14, gz + 0.85 + Math.cos(t2) * 0.14, { rx: -t2 });
      }
    } else gk.box(0.04, 0.16, 0.4, 0xffd54f, x + Math.sign(x) * 0.26, gy - 0.12, gz + 0.85);
    // the belt into the gun
    const ix = twin ? Math.sign(x) * 0.84 : -0.34;
    for (let i = 0; i < 5; i++) {
      const f = i / 4;
      gk.cyl(0.05, 0.22, rad ? green : BRASS, x + (ix - x) * f, gy + 0.22 + Math.sin(f * PI) * 0.12, gz + 0.85, { axis: 'x', seg: 6, rz: PI / 2 });
    }
  }
  if (armor) {
    // Heavy Armor: a gun shield with a sight slit, plates on the sides
    const w = twin ? 2.2 : 1.3;
    gk.box(w, 0.7, 0.1, steel, 0, gy + 0.55, gz + 1.25, { r: 0.03, rx: -0.25 });
    gk.box(0.4, 0.08, 0.12, INK, twin ? 0 : 0.35, gy + 0.6, gz + 1.27, { rx: -0.25 });
    for (const s of [-1, 1]) gk.box(0.1, 0.8, 0.9, steel, s * (twin ? 0.92 : 0.42), gy, gz + 0.75, { r: 0.03 });
  }
  if (plasma) {
    // Plasma Reactor: a glowing ball in a cage on top of the gun
    const ry = gy + 0.95;
    const rz = gz + 0.8;
    gk.cyl(0.32, 0.14, 0x37304a, 0, gy + 0.42, rz, { seg: 14 });
    gk.ball(0.3, purple, 0, ry, rz, { seg: 14, rows: 10 });
    for (let i = 0; i < 4; i++) {
      const t2 = (i / 4) * PI * 2 + PI / 4;
      gk.cyl(0.03, 0.75, 0x9e9e9e, Math.cos(t2) * 0.36, ry, rz + Math.sin(t2) * 0.36, { seg: 5 });
    }
    gk.torus(0.37, 0.04, 0x9e9e9e, 0, ry + 0.38, rz, { rx: PI / 2, seg: 16 });
    gk.torus(0.4, 0.035, purple, 0, ry, rz, { rx: PI / 2, seg: 16 });
    gk.tube([[0.25, ry - 0.2, rz - 0.2], [0.3, gy + 0.2, gz + 0.5], [0.25, gy + 0.2, gz + 1.2]], 0.04, purple, { seg: 10, sides: 5 });
  }
  gk.done();
  // both hands on the spade grips
  h.rightArm.rotation.set(-1.37, 0, 0.35);
  h.leftArm.rotation.set(-1.37, 0, -0.35);
  h.pose = { right: -1.37, left: -1.37, leftRecoil: 0.1 };
  h.recoilScale = 0.25;
  h.tracer = rad ? 0x76ff03 : plasma ? 0xb388ff : 0xffd54f;
  return own(h);
}

// ------------------------------------------------------------------ Electricizer

/**
 * Electricizer (Railgunner crosspath): a gunner on a stool behind a big electric cannon. Top:
 * 1 Extra Range (a scope), 2 Extra Power (capacitor banks and a cell pack), 3 Mounted Rifle (a
 * longer, bigger barrel with side rails), 4 Experimental Death Cannon (dark, red core, a vented
 * shroud), 5 Starship Killer (huge and navy, missile pods and a charging ring that spins). Bottom:
 * 1 Weighted Tripod (legs with weight plates), 2 Greased Trigger (an oil can and an oiled grip),
 * 3 Electric Shock (blue core, two copper coils with an arc, rubber gloves), 4 Expert Ranger (a
 * wide hat and a cell bandolier), 5 Voltage Overdrive (cyan coils and a crackling ring underneath).
 */
export function makeElectricizer(a, b) {
  const rifle = a >= 3;
  const death = a >= 4;
  const ship = a >= 5;
  const shock = b >= 3;
  const ranger = b >= 4;
  const volt = b >= 5;
  const coreC = death ? 0xff1744 : shock ? 0x40c4ff : 0xffea00;
  const coilC = volt ? 0x18ffff : coreC;
  const shirt = ranger ? 0x5d4037 : 0x37474f;
  const h = makeHumanoid({ skin: 0x8d5524, shirt, pants: 0x263238, arms: shirt, face: 'soldier' });
  const key = `x2elec${a}${b}`;
  const core = glowMat(h, coreC);
  const coilM = glowMat(h, coilC);
  const blue = glowMat(h, 0x80d8ff);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (ranger) {
    hair(hd, 0x1a1209, { h: 0.38 });
    cowboyHat(hd, 0x3e2723, 0x263238);
    hd.box(0.24, 0.12, 0.04, blue, 0.35, 1.18, 0.62, { ry: -0.5 }); // a glowing hat band stud
  } else monocleCap(hd, 0x263238, coilM);
  collar(t, tone(shirt, 0.8), { buttons: false });
  t.box(0.06, 1.4, 0.05, INK, 0, -0.1, 0.53); // zip
  belt(t, LEATHER, 0x90a4ae);
  if (b >= 2) for (const x of [-0.6, 0.6]) pouch(t, x, -0.62, 0.55, 0.4, 0.42, 0x455a64); // tool pouches
  if (a >= 2) {
    // Extra Power: a pack of glowing cells
    pack(t, 0x263238, { w: 1.5, h: 1.6, d: 0.6 });
    for (const x of [-0.4, 0, 0.4]) {
      t.cyl(0.13, 0.5, coilM, x, 0.2, -1.42, { seg: 10 });
      t.cyl(0.15, 0.08, INK, x, 0.47, -1.42, { seg: 10 });
    }
  }
  if (ranger) {
    // a bandolier of glowing cells
    sash(t, 0x3e2723, 1, 0.3);
    for (const s of [-0.7, -0.25, 0.2, 0.65]) t.cyl(0.08, 0.22, coilM, -Math.sin(0.62) * s, Math.cos(0.62) * s, 0.63, { seg: 8, rz: 0.62 });
  }
  hd.done();
  t.done();
  if (shock) rubberGloves(h, key, 0xfdd835, tone(shirt, 0.8));
  else hands(h, key, 0x212121, tone(shirt, 0.8));
  feet(h, key, 0x212121, (bb) => kneePad(bb, 0x263238));
  const steel = ship ? 0x283593 : death ? 0x263238 : 0x546e7a;
  seatBehind(h, key, steel);
  // ---- the stand (root space)
  const mount = new THREE.Group();
  h.root.add(mount);
  const k = wear(h, mount, `${key}:stand`);
  const gy = 2.75;
  const sz = 1.9;
  k.cyl(0.24, gy - 1.0, tone(steel, 0.9), 0, 0.5 + (gy - 1.0) / 2, sz, { seg: 12 }); // post
  if (b >= 1) {
    // Weighted Tripod: splayed legs with round weight plates on the feet
    for (const t2 of [0.5, 2.6, 4.7]) {
      const sx = Math.sin(t2);
      const sw = Math.cos(t2);
      k.tube([[sx * 0.15, 1.3, sz + sw * 0.15], [sx * 1.35, 0.1, sz + sw * 1.35]], 0.09, steel, { seg: 4, sides: 6 });
      k.cyl(0.32, 0.12, 0x424242, sx * 1.35, 0.08, sz + sw * 1.35, { seg: 14 });
      k.cyl(0.26, 0.1, 0x616161, sx * 1.35, 0.19, sz + sw * 1.35, { seg: 14 });
      k.cyl(0.06, 0.08, 0xfdd835, sx * 1.35, 0.27, sz + sw * 1.35, { seg: 8 });
    }
  } else {
    k.box(1.8, 0.16, 0.3, tone(steel, 0.8), 0, 0.08, sz, { r: 0.04 });
    k.box(0.3, 0.16, 1.8, tone(steel, 0.8), 0, 0.08, sz, { r: 0.04 });
  }
  k.cyl(0.4, 0.22, tone(steel, 0.75), 0, gy - 0.55, sz, { seg: 16 }); // swivel
  if (volt) {
    // Voltage Overdrive: a crackling ring under the gun
    k.torus(1.0, 0.08, coilM, 0, 0.35, sz, { rx: PI / 2, seg: 24 });
    for (let i = 0; i < 6; i++) {
      const t2 = (i / 6) * PI * 2;
      arc(k, [Math.cos(t2) * 1.0, 0.35, sz + Math.sin(t2) * 1.0], [Math.cos(t2) * 0.3, gy - 0.7, sz + Math.sin(t2) * 0.3], coilM, 0.15, i + 1);
    }
  }
  if (b >= 2) {
    // Greased Trigger: an oil can by the stool
    k.cyl(0.18, 0.32, 0xc62828, 0.75, 0.16, -0.6, { seg: 12 });
    k.cyl(0.18, 0.12, 0xc62828, 0.75, 0.38, -0.6, { seg: 12, r2: 0.06 });
    k.cyl(0.025, 0.45, 0x9e9e9e, 0.75, 0.55, -0.45, { seg: 6, rx: 0.9 });
    k.torus(0.1, 0.025, INK, 0.75, 0.3, -0.8, { seg: 8, arc: PI });
  }
  k.done();
  // ---- the cannon, scaled up for the bigger Top tiers (it fires along +z)
  const big = ship ? 1.5 : death ? 1.3 : rifle ? 1.15 : 1;
  const gun = new THREE.Group();
  gun.position.set(0, gy, sz);
  gun.scale.setScalar(big);
  mount.add(gun);
  const c = wear(h, gun, `${key}:gun`);
  const body = ship ? 0x1a237e : death ? 0x263238 : 0x546e7a;
  const len = ship ? 3.6 : rifle ? 3.4 : 2.7;
  c.box(1.3, 1.05, 1.9, body, 0, 0, 0, { r: 0.14 }); // breech
  for (const s of [-1, 1]) c.box(0.06, 0.7, 1.4, tone(body, 0.75), s * 0.66, 0, 0); // side panels
  c.box(1.0, 0.12, 1.2, INK, 0, 0.55, -0.1, { r: 0.03 }); // top hatch
  for (const s of [-1, 1]) c.box(0.08, 0.4, 0.4, core, s * 0.67, 0.1, -0.45); // side lights
  // the core, in a cage at the back of the breech
  c.box(0.8, 0.12, 0.8, tone(body, 0.7), 0, 0.6, -0.5, { r: 0.03 });
  c.ball(0.3, core, 0, 0.92, -0.5, { seg: 12, rows: 8 });
  for (let i = 0; i < 4; i++) {
    const t2 = (i / 4) * PI * 2 + PI / 4;
    c.cyl(0.03, 0.62, STEEL, Math.cos(t2) * 0.34, 0.92, -0.5 + Math.sin(t2) * 0.34, { seg: 5 });
  }
  c.torus(0.34, 0.035, STEEL, 0, 1.22, -0.5, { rx: PI / 2, seg: 14 });
  // the barrel with coils round it
  const r = rifle ? 0.24 : 0.2;
  c.cyl(r, len, 0x212121, 0, 0, 0.95 + len / 2, { axis: 'z', seg: 14 });
  const n = ship ? 6 : rifle ? 5 : 4;
  for (let i = 0; i < n; i++) {
    const z = 1.3 + (i * (len - 0.7)) / (n - 1);
    c.torus(r + 0.17, 0.07, coilM, 0, 0, z, { seg: 16 });
    c.cyl(r + 0.12, 0.14, tone(body, 0.8), 0, 0, z - 0.16, { axis: 'z', seg: 14 });
  }
  c.cyl(r + 0.2, 0.4, tone(body, 0.8), 0, 0, 0.95 + len - 0.1, { axis: 'z', seg: 16, r2: r + 0.1 }); // emitter
  c.cyl(r + 0.05, 0.05, core, 0, 0, 0.95 + len + 0.12, { axis: 'z', seg: 14 });
  if (a >= 1) {
    // Extra Range: a scope on the left
    c.cyl(0.12, 0.9, INK, 0.5, 0.75, 0.3, { axis: 'z', seg: 12 });
    c.cyl(0.16, 0.2, INK, 0.5, 0.75, 0.82, { axis: 'z', seg: 12 });
    c.cyl(0.13, 0.02, coilM, 0.5, 0.75, 0.93, { axis: 'z', seg: 12 });
    c.box(0.12, 0.2, 0.14, INK, 0.5, 0.6, 0.3);
  }
  if (a >= 2) {
    // Extra Power: capacitor banks on both sides
    for (const s of [-1, 1]) for (const dz of [-0.4, 0.15]) {
      c.cyl(0.18, 0.7, 0x455a64, s * 0.85, 0.05, dz, { seg: 12 });
      c.cyl(0.12, 0.06, coilM, s * 0.85, 0.42, dz, { seg: 12 });
      c.torus(0.18, 0.025, INK, s * 0.85, -0.1, dz, { rx: PI / 2, seg: 12 });
    }
  }
  if (rifle) {
    // Mounted Rifle: rails along the barrel
    for (const s of [-1, 1]) {
      c.box(0.14, 0.18, len * 0.75, 0x212121, s * (r + 0.32), 0.12, 0.95 + len * 0.4, { r: 0.04 });
      c.box(0.04, 0.06, len * 0.7, coilM, s * (r + 0.4), 0.12, 0.95 + len * 0.4);
    }
  }
  if (death) {
    // Experimental Death Cannon: a vented shroud over the back of the barrel
    c.cyl(r + 0.3, 1.3, 0x37474f, 0, 0, 1.6, { axis: 'z', seg: 16 });
    for (let i = 0; i < 6; i++) c.box(0.06, 0.2, 1.0, core, Math.cos((i / 6) * PI * 2) * (r + 0.3), Math.sin((i / 6) * PI * 2) * (r + 0.3), 1.6, { rz: (i / 6) * PI * 2 });
  }
  if (ship) {
    // Starship Killer: missile pods on both sides
    for (const s of [-1, 1]) {
      c.box(0.75, 0.75, 2.6, 0x283593, s * 1.25, 0, 0.6, { r: 0.1 });
      for (const dy of [-0.18, 0.18]) for (const dx of [-0.18, 0.18]) {
        c.cyl(0.12, 0.1, INK, s * 1.25 + dx, dy, 1.92, { axis: 'z', seg: 10 });
        c.cyl(0.08, 0.05, 0xff5252, s * 1.25 + dx, dy, 1.96, { axis: 'z', seg: 8 });
      }
      c.box(0.06, 0.3, 2.0, 0xfdd835, s * 1.63, 0, 0.6);
    }
  }
  if (shock) {
    // Electric Shock: two copper coils on top with a spark between them
    for (const s of [-1, 1]) coil(c, s * 0.35, 0.95, 0.35, 0.18, 0.6, 5);
    for (const s of [-1, 1]) c.ball(0.1, coilM, s * 0.35, 1.32, 0.35, { seg: 8, rows: 6 });
    arc(c, [-0.35, 1.35, 0.35], [0.35, 1.35, 0.35], coilM, 0.1, 3);
  }
  c.done();
  if (ship) {
    // the charging ring at the muzzle spins
    const ring = spinner(h, gun, 0, 0, 0.95 + len - 0.2, 'z');
    const rk = wear(h, ring, `${key}:ring`);
    rk.torus(r + 0.55, 0.08, 0x3949ab, 0, 0, 0, { rx: PI / 2, seg: 24 });
    for (let i = 0; i < 6; i++) {
      const t2 = (i / 6) * PI * 2;
      rk.box(0.18, 0.2, 0.18, core, Math.cos(t2) * (r + 0.55), 0, Math.sin(t2) * (r + 0.55));
      rk.box(0.05, 0.05, r + 0.3, STEEL, Math.cos(t2) * (r + 0.3), 0, Math.sin(t2) * (r + 0.3), { ry: -t2 + PI / 2 });
    }
    rk.done();
    h.idleSpin = 2;
  }
  const m = new THREE.Object3D();
  m.position.set(0, 0, 0.95 + len + 0.2);
  gun.add(m);
  h.muzzles = [m];
  // handles where the hands are
  const hk = wear(h, mount, `${key}:grips`);
  for (const s of [-1, 1]) {
    hk.tube([[s * 0.45, gy - 0.2, sz - 0.6], [s * 0.85, gy - 0.12, 1.75]], 0.05, INK, { seg: 4, sides: 6 });
    hk.cyl(0.08, 0.4, b >= 2 ? 0x8d6e63 : 0x212121, s * 0.85, gy - 0.12, 1.75, { seg: 8 });
  }
  hk.done();
  h.rightArm.rotation.set(-1.37, 0, 0.35);
  h.leftArm.rotation.set(-1.37, 0, -0.35);
  h.pose = { right: -1.37, left: -1.37, leftRecoil: 0.35 };
  h.tracer = coilC;
  h.tracerWidth = 0.5 + a * 0.1;
  return own(h);
}

// ------------------------------------------------------------------ Trapper

/** A coonskin cap with fur tufts and a ringed tail down the back (head space). */
function coonCap(k, fur, dark) {
  dome(k, 0.78, 0.66, fur, 0, 0.9, 0);
  k.cyl(0.78, 0.22, tone(fur, 0.85), 0, 0.98, 0, { seg: 22 });
  for (let i = 0; i < 10; i++) {
    const t = (i / 10) * PI * 2;
    k.box(0.04, 0.24, 0.06, tone(fur, 0.6), Math.sin(t) * 0.79, 1.0, Math.cos(t) * 0.79, { ry: t });
  }
  for (let i = 0; i < 7; i++) {
    const f = i / 6;
    k.ball(0.2 - f * 0.07, i % 2 ? dark : fur, 0.1 + f * 0.4, 1.05 - f * 1.05, -0.8 - Math.sin(f * PI) * 0.18, { seg: 10, rows: 7 });
  }
}

/**
 * Trapper (Trapper X crosspath): a backwoods trapper in a coonskin cap with a sack of spike traps
 * on the back, throwing one. Top: 1 Defense Piercing (amber goggles on the cap), 2 Super Spikes (a
 * strap of steel spikes), 3 Hi-Tec Spikes (a darker shirt, a bigger sack with glowing blue spikes,
 * a tech trap), 4 Perma-spike (steel armour, shoulder plates and a bear trap on the sack). Bottom:
 * 1 Bigger Spikes (a bigger trap), 2 Gloves (yellow work gloves), 3 Research & Development (a
 * toolbox, a head lamp and a wrench), 4 Explosive Mines (mines on the hips and one in the hand).
 */
export function makeTrapperX(a, b) {
  const hitec = a >= 3;
  const perma = a >= 4;
  const rnd = b >= 3;
  const mines = b >= 4;
  const shirt = perma ? 0x455a64 : hitec ? 0x4e342e : 0x6d4c41;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: 0x3e2723, arms: shirt, face: 'smile' });
  const key = `x2trap${a}${b}`;
  const amber = glowMat(h, 0xffab00);
  const blue = glowMat(h, 0x40c4ff);
  const red = glowMat(h, 0xff1744);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  coonCap(hd, 0x8d6e63, 0x4e342e);
  if (a >= 1) goggles(hd, 1.04, amber, { r: 0.84, frame: 0x4e342e });
  if (rnd) {
    // a head lamp on the cap
    hd.box(0.3, 0.22, 0.16, INK, -0.35, 1.3, 0.72, { r: 0.04, ry: 0.4 });
    hd.cyl(0.08, 0.03, glowMat(h, 0xfff3b0), -0.39, 1.3, 0.8, { axis: 'z', seg: 10, ry: 0.4 });
  }
  // a bushy beard and moustache
  band(hd, 0.66, 0.12, 0.42, 1.9, 0x5d4037, 0.22);
  hd.box(0.56, 0.12, 0.14, 0x5d4037, 0, 0.47, 0.64, { r: 0.05 });
  if (perma) {
    // Perma-spike: steel armour with rivets and shoulder plates
    t.box(2.2, 1.45, 1.18, 0x78909c, 0, 0.2, 0, { r: 0.14 });
    for (let i = 0; i < 2; i++) t.box(2.14, 0.18, 1.14, 0x607d8b, 0, -0.62 - i * 0.22, 0, { r: 0.04 });
    for (const x of [-0.75, -0.25, 0.25, 0.75]) t.ball(0.05, 0x455a64, x, 0.82, 0.6, { seg: 6, rows: 4 });
    shoulderPads(t, 0x607d8b, 0.6);
  } else {
    const plaid = tone(shirt, 0.65);
    for (const y of [0.55, 0.05, -0.45]) t.box(2.04, 0.08, 1.04, plaid, 0, y, 0);
    for (const x of [-0.6, 0, 0.6]) {
      t.box(0.08, 1.8, 0.02, plaid, x, 0, 0.51);
      t.box(0.08, 1.8, 0.02, plaid, x, 0, -0.51);
    }
    collar(t, tone(shirt, 0.8));
  }
  belt(t, 0x3e2723, 0x9e9e9e);
  t.box(0.2, 0.6, 0.12, LEATHER, 0.75, -1.15, 0.56, { r: 0.04 }); // hunting knife
  t.cyl(0.06, 0.25, WOOD, 0.75, -0.75, 0.6, { seg: 8 });
  if (!mines) t.torus(0.28, 0.07, 0xc8a165, -1.12, -0.85, 0.1, { ry: PI / 2, seg: 16 }); // coil of rope
  if (a >= 2) {
    // Super Spikes: a strap of steel spikes
    sash(t, 0x3e2723, -1, 0.3);
    const rz = -0.62;
    for (const s of [-0.75, -0.25, 0.25, 0.75]) {
      const x = -Math.sin(rz) * s;
      const y = Math.cos(rz) * s;
      t.box(0.24, 0.24, 0.1, 0x616161, x, y, 0.62, { r: 0.03 });
      t.cyl(0.004, 0.22, hitec ? blue : 0xcfd8dc, x, y + 0.2, 0.66, { r2: 0.05, seg: 5, rz: PI });
    }
  }
  if (rnd) {
    // Research & Development: a toolbox on the hip with a wrench
    t.box(0.42, 0.45, 0.9, 0xc62828, 1.2, -0.85, 0.05, { r: 0.04 });
    t.box(0.44, 0.08, 0.92, 0x8e1c1c, 1.2, -0.66, 0.05);
    t.torus(0.15, 0.03, INK, 1.2, -0.58, 0.05, { arc: PI, ry: PI / 2, seg: 10 });
    t.box(0.06, 0.6, 0.12, 0x9e9e9e, 1.43, -0.75, 0.3, { rz: -0.2 });
    t.torus(0.08, 0.03, 0x9e9e9e, 1.37, -0.45, 0.3, { arc: PI * 1.5, ry: PI / 2, seg: 8 });
  }
  if (mines) for (const s of [-1, 1]) mine(t, s * 1.15, -0.45, 0.05, { r: 0.3, light: red, stripe: 0xfdd835 });
  // the sack of traps on the back, with spikes poking out of the neck
  const s = hitec ? 1.2 : 1;
  const sz = -0.55 - 0.7 * s;
  t.ball(0.8 * s, perma ? 0x8d8d8d : 0xa1887f, 0, -0.05, sz, { sy: 1.1, sz: 0.8, seg: 16, rows: 12 });
  for (const [px, py] of [[0.35, -0.35], [-0.3, 0.25]]) t.box(0.36 * s, 0.32 * s, 0.05, 0x8d6e63, px * s, py * s, sz - 0.62 * s, { r: 0.02 });
  t.cyl(0.28 * s, 0.3, 0xa1887f, 0, 0.8 * s, sz, { seg: 12, r2: 0.36 * s });
  t.torus(0.25 * s, 0.05, 0xc8a165, 0, 0.72 * s, sz, { rx: PI / 2, seg: 14 });
  for (const [dx, dz, rz] of [[-0.12, 0, 0.3], [0.1, 0.08, -0.25], [0, -0.1, 0], [0.18, -0.12, -0.45]]) t.cyl(0.05, 0.5, hitec ? blue : STEEL, dx, 1.05 * s, sz + dz, { r2: 0.004, rz, seg: 5 });
  if (hitec) t.torus(0.62 * s, 0.03, blue, 0, -0.05, sz, { seg: 18, sy: 1.1 }); // a glowing seam
  for (const sd of [-1, 1]) {
    t.box(0.22, 0.1, 1.0, 0xc8a165, sd * 0.5, 1.0, -0.15);
    t.box(0.22, 1.3, 0.06, 0xc8a165, sd * 0.5, 0.32, 0.53);
  }
  if (perma) {
    bearTrap(t, 0, 0.1, sz - 0.78 * s, 0.85, 0x78909c);
    t.box(1.8, 0.1, 0.12, LEATHER, 0, 0.1, sz - 0.6 * s);
  }
  hd.done();
  t.done();
  hands(h, key, b >= 2 ? 0xf9a825 : null, tone(shirt, 0.8));
  feet(h, key, 0x4e342e, (bb) => bb.box(1.14, 0.22, 1.16, 0x8d6e63, 0, -1.34, 0.02, { r: 0.06 })); // fur boot cuffs
  const g = held(h, key, 1.1, (k) => {
    if (mines) mine(k, 0, -0.45, 0, { r: 0.45, light: red, stripe: 0xfdd835, handle: true, flip: true });
    else spikePlate(k, {
      plate: perma ? 0x546e7a : hitec ? 0x37474f : WOOD,
      rim: hitec ? 0x40c4ff : a >= 1 ? 0xffab00 : null,
      spike: hitec ? blue : a >= 2 ? 0xcfd8dc : 0x8d8d8d,
      len: b >= 1 ? 0.42 : 0.3,
      n: b >= 1 ? 3 : 2,
      w: b >= 1 ? 1.15 : 0.95,
    });
  });
  if (rnd) {
    // R&D: a wrench in the other hand
    const w = fist(h.leftArm, -1.9, 1);
    const wk = wear(h, w, `${key}:wrench`);
    wk.box(0.12, 0.9, 0.08, 0x9e9e9e, 0, -0.35, 0, { r: 0.02 });
    wk.torus(0.12, 0.04, 0x9e9e9e, 0, -0.85, 0, { arc: PI * 1.4, rz: -PI * 0.2, seg: 10 });
    wk.done();
  }
  h.muzzles = [];
  muzzle(h, g, -0.4, 0);
  overhand(h);
  h.projectile = { color: mines ? 0xff1744 : hitec ? 0x40c4ff : 0x8d6e63, size: 0.7, arc: 3 };
  return own(h, 0);
}

// ------------------------------------------------------------------ Bugler

/** A tall shako hat: a crown that flares up, a top, a gold band, a badge, a peak and a chin strap. */
function shako(k, col, trim) {
  k.cyl(0.66, 0.95, col, 0, 1.35, 0, { seg: 20, r2: 0.74 });
  k.cyl(0.74, 0.06, tone(col, 0.8), 0, 1.84, 0, { seg: 20 });
  k.cyl(0.665, 0.12, trim, 0, 0.98, 0, { seg: 20 });
  k.torus(0.74, 0.025, trim, 0, 1.8, 0, { rx: PI / 2, seg: 20 });
  k.plan([[-0.22, 0], [0.22, 0], [0.25, 0.3], [0, 0.42], [-0.25, 0.3]], 0.04, trim, 0, 1.25, 0.7, { rx: -PI / 2 - 0.08 }); // badge
  k.plan([[-0.5, 0], [0.5, 0], [0.42, 0.36], [0, 0.48], [-0.42, 0.36]], 0.05, 0x0d0d0d, 0, 0.92, 0.6, { rx: -0.25 }); // peak
  k.tube([[-0.66, 0.95, 0.05], [-0.5, 0.25, 0.45], [0.5, 0.25, 0.45], [0.66, 0.95, 0.05]], 0.03, trim, { seg: 12, sides: 4 }); // chin strap
}

/**
 * A bugle along +z from the lips (z -0.68) to the bell: a lead pipe, a loop under it and the bell
 * pipe flaring out at the front. o: bell (radius), valves (a trumpet's three valves), rim (a
 * material for the bell's rim). Returns the bell's y, z.
 */
function bugle(k, brass, o = {}) {
  const bell = o.bell ?? 0.32;
  k.cyl(0.04, 0.12, brass, 0, 0, -0.66, { axis: 'z', seg: 8, r2: 0.09 }); // mouthpiece
  k.cyl(0.04, 1.1, brass, 0, 0, -0.05, { axis: 'z', seg: 8 }); // lead pipe
  k.tube([[0, 0, 0.45], [0, -0.04, 0.62], [0, -0.2, 0.7], [0, -0.36, 0.62], [0, -0.38, 0.45]], 0.045, brass, { seg: 12, sides: 6 });
  k.cyl(0.045, 0.85, brass, 0, -0.38, 0.03, { axis: 'z', seg: 8 }); // the pipe back
  k.tube([[0, -0.38, -0.38], [0, -0.32, -0.5], [0, -0.22, -0.52], [0, -0.18, -0.38]], 0.045, brass, { seg: 10, sides: 6 });
  const by = -0.18;
  k.cyl(0.05, 1.1, brass, 0, by, 0.17, { axis: 'z', seg: 8, r2: 0.09 }); // bell pipe
  k.cyl(0.09, 0.45, brass, 0, by, 0.94, { axis: 'z', seg: 16, r2: bell }); // the bell
  k.torus(bell, 0.03, o.rim ?? tone(brass, 0.8), 0, by, 1.17, { seg: 18 });
  k.cyl(bell - 0.03, 0.02, 0x3e2a00, 0, by, 1.15, { axis: 'z', seg: 16 });
  for (const z of [-0.25, 0.3]) k.box(0.05, 0.22, 0.05, brass, 0, -0.09, z); // braces
  if (o.valves) {
    for (let i = 0; i < 3; i++) {
      const z = -0.25 + i * 0.16;
      k.cyl(0.06, 0.42, brass, 0, 0.05, z, { seg: 10 });
      k.cyl(0.05, 0.06, 0xfff8e1, 0, 0.3, z, { seg: 10 });
    }
  }
  return [by, 1.2];
}

/**
 * Bugler (Commander crosspath): a marching-band bugler in a blue jacket and a tall shako. Top:
 * 1 Louder Calls (a bigger bell), 2 Better Firerate (a shiny trumpet with valves), 3 Snare Drums
 * (a snare drum on the hip and a drumstick), 4 Cysian Overseer (a purple jacket, a glowing visor,
 * a glowing bell rim and a sigil). Bottom: 1 Plume (a red plume on the shako), 2 Cape (a red
 * cape), 3 Unit Commander (gold shoulder boards, medals and a pennant on the bugle), 4 Directed
 * Power (a glowing marshal's baton held up and a gold cord).
 */
export function makeBugler(a, b) {
  const over = a >= 4;
  const coat = over ? 0x4a148c : 0x1565c0;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: coat, pants: 0x0d1b3e, arms: coat, face: 'smile' });
  const key = `x2bugle${a}${b}`;
  const violet = glowMat(h, 0xe040fb);
  const goldM = glowMat(h, 0xffd54f, 0.6);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x6d4c41, { h: 0.36 });
  shako(hd, 0x0d1b3e, GOLD);
  if (b >= 1) {
    // Plume: a red feather plume on the front of the shako
    hd.cyl(0.05, 0.3, GOLD, 0, 1.98, 0.5, { seg: 8 });
    for (let i = 0; i < 4; i++) hd.ball(0.16 - i * 0.025, i % 2 ? 0xb71c1c : 0xd32f2f, 0, 2.15 + i * 0.18, 0.5 - i * 0.04, { seg: 10, rows: 7, sy: 1.3 });
  }
  if (over) band(hd, 0.645, 0.06, 0.18, 1.7, violet, 0.62); // the Overseer's visor
  // the band jacket: a standing collar, gold frogging across the chest, white cross belts
  t.cyl(0.6, 0.22, tone(coat, 0.8), 0, 1.05, 0, { seg: 18 });
  for (let i = 0; i < 4; i++) {
    const y = 0.6 - i * 0.32;
    t.box(1.0, 0.06, 0.04, GOLD, 0, y, 0.52);
    for (const s of [-1, 1]) t.ball(0.06, GOLD, s * 0.5, y, 0.53, { seg: 6, rows: 4 });
  }
  for (const s of [-1, 1]) t.box(0.22, 2.5, 1.12, 0xfafafa, 0, 0, 0, { rz: s * 0.62 });
  t.cyl(0.12, 0.05, GOLD, 0, 0.0, 0.58, { axis: 'z', seg: 10 }); // where the belts cross
  belt(t, 0xfafafa, GOLD);
  if (over) {
    t.cyl(0.2, 0.05, violet, 0.55, 0.65, 0.54, { axis: 'z', seg: 6 }); // the Cysian sigil
    t.cyl(0.1, 0.06, 0x4a148c, 0.55, 0.65, 0.56, { axis: 'z', seg: 6 });
  }
  if (b >= 2) {
    // Cape: a red cape from a gold clasp bar
    t.slab(2.0, 2.7, 0.1, 0xc62828, 0, -0.55, -0.62, { bw: 1.3 });
    t.box(2.0, 0.18, 0.2, GOLD, 0, 0.88, -0.56, { r: 0.04 });
  }
  if (b >= 3) {
    epaulettes(t, 0xffd54f);
    medals(t, [0xe53935, 0xfdd835, 0x43a047], -0.85, 0.3);
  }
  if (b >= 4) t.tube([[0.9, 0.95, 0.4], [0.75, 0.4, 0.6], [0.3, 0.2, 0.6], [0.55, 0.65, 0.6], [0.9, 0.95, 0.4]], 0.04, goldM, { seg: 20, sides: 5 }); // gold cord
  if (a >= 3) {
    // Snare Drums: a snare drum on the left hip on a sling
    const dx = 1.15;
    const dy = -1.2;
    const dz = 0.55;
    t.cyl(0.55, 0.42, 0xfafafa, dx, dy, dz, { seg: 20 });
    for (const f of [-1, 1]) t.cyl(0.58, 0.07, over ? 0x4a148c : 0xc62828, dx, dy + f * 0.21, dz, { seg: 20 });
    t.cyl(0.52, 0.02, 0xf5f5f5, dx, dy + 0.25, dz, { seg: 20 });
    for (let i = 0; i < 8; i++) {
      const tt = (i / 8) * PI * 2;
      t.box(0.03, 0.42, 0.03, 0xcfd8dc, dx + Math.cos(tt) * 0.58, dy, dz + Math.sin(tt) * 0.58); // tension rods
    }
    t.box(0.18, 2.6, 1.14, 0xfafafa, 0, 0, 0, { rz: 0.62 }); // sling
  }
  hd.done();
  t.done();
  hands(h, key, 0xfafafa, tone(coat, 0.8), (arm) => arm.box(1.08, 0.12, 1.08, GOLD, 0, -1.45, 0)); // white gloves, gold cuffs
  feet(h, key, 0x111111, (bb) => bb.box(1.1, 0.35, 1.14, 0xfafafa, 0, -1.55, 0.02, { r: 0.04 })); // white spats
  // the bugle at the lips: the right fist is just in front of the mouth, and a group there
  // undoes the arm's turn so the bugle can point straight ahead
  const rx = -1.88;
  const rz = 0.76;
  h.rightArm.rotation.set(rx, 0, rz);
  const g = fist(h.rightArm, -1.9, 1);
  const level = new THREE.Group();
  level.quaternion.setFromEuler(new THREE.Euler(rx, 0, rz)).invert();
  g.add(level);
  const aim = new THREE.Group();
  aim.position.set(0.19, 0.02, 0.2); // scaled about the mouthpiece, which stays at the lips
  aim.rotation.y = -0.05;
  aim.scale.setScalar(1.3);
  level.add(aim);
  const bk = wear(h, aim, `${key}:bugle`);
  const brass = a >= 2 ? 0xffd54f : 0xffb300;
  const [by, bz] = bugle(bk, brass, { bell: a >= 1 ? 0.42 : 0.32, valves: a >= 2, rim: over ? violet : a >= 2 ? goldM : null });
  if (b >= 3) {
    // a red pennant with gold fringe hangs from the bugle
    bk.box(0.04, 0.55, 0.7, 0xc62828, 0, by - 0.35, 0.25);
    bk.box(0.05, 0.06, 0.72, GOLD, 0, by - 0.64, 0.25);
    bk.box(0.05, 0.25, 0.25, GOLD, 0, by - 0.35, 0.25, { rx: PI / 4 });
  }
  bk.done();
  h.muzzles = [];
  muzzle(h, aim, by, bz);
  // the left hand: a drumstick over the drum, a baton held up, or a hand on the hip
  let left = -0.25;
  if (a >= 3) {
    left = -0.75;
    const sg = fist(h.leftArm, -1.9, 1);
    const sk = wear(h, sg, `${key}:stick`);
    sk.cyl(0.045, 1.0, 0xd7b98e, 0, -0.45, 0.15, { seg: 8, r2: 0.03, rx: 0.4 });
    sk.ball(0.06, 0xd7b98e, 0, -0.92, 0.34, { seg: 6, rows: 4 });
    sk.done();
  } else if (b >= 4) {
    left = -2.3;
    const sg = fist(h.leftArm, -1.9, 1);
    const sk = wear(h, sg, `${key}:baton`);
    sk.cyl(0.09, 1.3, 0x1a237e, 0, -0.55, 0, { seg: 10 });
    for (const y of [0.08, -1.15]) sk.cyl(0.12, 0.14, goldM, 0, y, 0, { seg: 10 });
    sk.ball(0.17, goldM, 0, -1.3, 0, { seg: 10, rows: 7 });
    sk.done();
  }
  h.leftArm.rotation.set(left, 0, -0.2);
  h.pose = { right: rx, left, leftRecoil: 0 };
  h.static = true; // no recoil
  return own(h, 0);
}

export const CROSS = {
  marksmanSharpshooter: makeSharpshooter,
  farmMarket: makeMarket,
  commandoVulcan: makeVulcan,
  railgunnerElectricizer: makeElectricizer,
  trapperX: makeTrapperX,
  commanderBugler: makeBugler,
};
