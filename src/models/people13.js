// Tower models: people, batch 13 (dressed with the vehicle kit in ../vehicles.js).
// In here: Snowballer, Huntsman, Archer, Stunner, Harpoon Hunter, Gladiator, Commando (the
// event Commando, eventCommando).
// Each makeX(level) builds one tower's look; MODELS at the bottom is laid over TOWER_MODELS in
// ../models.js (they replaced the older box-built ones).
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.

import * as THREE from 'three';
import { antenna, glowMat, star, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import {
  GOLD, GUNMETAL, INK, LEATHER, STEEL, UP, WOOD, aimLong, band, belt, collar, dome, fist, glove, goggles, hair,
  headband, kneePad, muzzle, own, pack, pockets, pouch, rifle, sash, vest, wear,
} from './people1.js';
import { duster, shoulderPads } from './people2.js';
import { bandolier, beanie } from './people3.js';
import { feet, glassMat, hands, hood, peakedCap, riotHelmet } from './people5.js';
import { spinner } from './machines5.js';

const PI = Math.PI;
const SNOW = 0xf5f9ff;
const BRASS = 0xc9a227;
const CASH = 0x66bb6a;
const PAPER = 0xf5e6c8;

// ------------------------------------------------------------------ Snowballer

/** A knitted scarf round the neck with two striped tails and a fringe (torso space). */
function scarf(k, col, stripe) {
  k.torus(0.62, 0.19, col, 0, 0.94, 0, { rx: PI / 2, seg: 18 });
  for (const a of [-0.9, 0.9]) k.torus(0.62, 0.195, stripe, 0, 0.94, 0, { rx: PI / 2, rz: a, seg: 18, arc: 0.25 });
  for (const [x, len] of [[0.46, 1.15], [0.16, 0.85]]) {
    k.box(0.34, len, 0.1, col, x, 0.85 - len / 2, 0.62, { r: 0.04 });
    for (let i = 1; i < 3; i++) k.box(0.35, 0.09, 0.11, stripe, x, 0.85 - (len * i) / 3, 0.62);
    for (let i = 0; i < 4; i++) k.box(0.04, 0.16, 0.04, col, x - 0.12 + i * 0.08, 0.8 - len, 0.62); // fringe
  }
}

/** A snowball (any space): a lumpy white ball, icy (crystals) or a Death Ball (glow + spikes). */
function snowball(k, x, y, z, r, col, o = {}) {
  k.ball(r, col, x, y, z, { seg: 12, rows: 9 });
  if (o.icy) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      const e = i % 2 ? 0.5 : -0.4;
      const nx = Math.cos(a) * Math.cos(e);
      const ny = Math.sin(e);
      const nz = Math.sin(a) * Math.cos(e);
      k.cyl(r * 0.22, r * 0.55, o.icy, x + nx * r * 0.95, y + ny * r * 0.95, z + nz * r * 0.95, { seg: 5, r2: 0.0001, rx: Math.atan2(nz, ny), rz: -Math.atan2(nx, Math.hypot(ny, nz)) });
    }
  } else {
    for (const [dx, dy, dz] of [[0.6, 0.3, 0.4], [-0.5, -0.4, 0.5], [0.1, 0.6, -0.6]]) k.ball(r * 0.35, col, x + dx * r, y + dy * r, z + dz * r, { seg: 7, rows: 5 });
  }
}

/**
 * Snowballer (event): a kid in a puffer jacket, a bobble beanie and a striped scarf, throwing
 * snowballs. Lv 1 green mittens, Lv 2 a pile of snowballs at its feet and a spare in the other
 * hand, Lv 3 icy blue snowballs and ski goggles on the beanie, Lv 4 a giant glowing Death Ball
 * with ice shards circling it.
 */
export function makeSnowballer(level) {
  const icy = level >= 3;
  const death = level >= 4;
  const jacket = 0xd32f2f;
  const ballColor = death ? 0x7c4dff : icy ? 0x81d4fa : 0xfafafa;
  const h = makeHumanoid({ skin: 0xffcc80, shirt: jacket, pants: 0x1a237e, arms: jacket, face: 'smile' });
  const key = `snowballer${level}`;
  const ice = glowMat(h, 0xb3e5fc, 0.5);
  const dark = glowMat(h, 0x7c4dff);
  const ballMat = death ? dark : ballColor;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  beanie(hd, 0x1e88e5, 0.6);
  hd.cyl(0.74, 0.1, 0xfafafa, 0, 1.2, 0, { seg: 22 }); // a white stripe
  hd.ball(0.24, 0xfafafa, 0, 1.55, 0, { seg: 10, rows: 8 }); // bobble
  if (icy) goggles(hd, 1.14, glassMat(h, 0x80d8ff, 0.7), { r: 0.75, frame: 0xfafafa, strap: 0x1e88e5 });
  // a puffer jacket: quilted rings, a zip, slanted pockets and a hem
  t.box(2.24, 1.96, 1.2, jacket, 0, 0.02, 0, { r: 0.22 });
  for (const y of [0.5, 0, -0.5]) t.box(2.26, 0.06, 1.22, tone(jacket, 0.72), 0, y, 0, { r: 0.03 });
  t.box(0.06, 1.8, 0.05, 0xe0e0e0, 0, -0.05, 0.62);
  t.box(0.1, 0.18, 0.05, 0xe0e0e0, 0.08, 0.7, 0.64, { r: 0.02 }); // zip pull
  for (const s of [-1, 1]) t.box(0.42, 0.07, 0.05, tone(jacket, 0.6), s * 0.6, -0.5, 0.62, { rz: s * 0.5 });
  t.box(2.28, 0.16, 1.24, tone(jacket, 0.8), 0, -0.92, 0, { r: 0.05 });
  scarf(t, 0xfbc02d, 0xc62828);
  if (level >= 2) {
    // Thick Snow: a pouch of snowballs on the hip
    pouch(t, -0.7, -0.62, 0.62, 0.5, 0.4, 0x1565c0, 0.2);
    snowball(t, -0.7, -0.32, 0.72, 0.13, death ? dark : ballColor);
  }
  hd.done();
  t.done();
  hands(h, key, level >= 1 ? 0x43a047 : null, tone(jacket, 0.72), (a) => {
    a.box(1.08, 0.06, 1.08, tone(jacket, 0.72), 0, -0.3, 0); // puffer sleeve rings
    a.box(1.08, 0.06, 1.08, tone(jacket, 0.72), 0, -1.1, 0);
    if (level >= 1) for (let i = 0; i < 4; i++) a.box(0.08, 0.2, 1.1, 0xfafafa, -0.45 + i * 0.3, -1.6, 0); // knit cuff
  });
  feet(h, key, 0x5d4037, (b) => {
    b.box(1.16, 0.22, 1.18, 0xeeeeee, 0, -1.32, 0.02, { r: 0.08 }); // fur cuff
    kneePad(b, 0x283593);
  });
  if (level >= 2) {
    // a pile of snowballs on a snow mound at its feet
    const p = wear(h, h.root, `${key}:pile`);
    p.cyl(0.95, 0.24, SNOW, 1.9, 0.12, 0.9, { seg: 18, r2: 0.62 });
    dome(p, 0.6, 0.18, SNOW, 1.9, 0.24, 0.9);
    for (const [x, y, z] of [[1.62, 0.55, 0.72], [2.18, 0.55, 0.72], [1.9, 0.55, 1.2], [1.9, 0.98, 0.88]]) snowball(p, x, y, z, 0.28, ballMat, { icy: icy && !death ? ice : null });
    p.done();
    const sp = fist(h.leftArm, -1.9, 1.1);
    const sk = wear(h, sp, `${key}:spare`);
    snowball(sk, 0, -0.32, 0, 0.26, ballMat, { icy: icy && !death ? ice : null });
    sk.done();
  }
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:ball`);
  if (death) {
    gk.ball(0.52, dark, 0, -0.5, 0, { seg: 16, rows: 12 });
    gk.ball(0.58, glassMat(h, 0xb388ff, 0.35), 0, -0.5, 0, { seg: 16, rows: 12 }); // frosty shell
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      gk.cyl(0.1, 0.45, ice, Math.cos(a) * 0.55, -0.5 + (i % 2 ? 0.2 : -0.2), Math.sin(a) * 0.55, { seg: 5, r2: 0.0001, rz: -PI / 2, ry: -a });
    }
  } else snowball(gk, 0, -0.32, 0, 0.32, ballColor, { icy: icy ? ice : null });
  gk.done();
  if (death) {
    // ice shards circling the Death Ball
    const ring = spinner(h, g, 0, -0.5, 0);
    const rk = wear(h, ring, `${key}:orbit`);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2;
      rk.cyl(0.08, 0.3, ice, Math.cos(a) * 0.95, 0.12, Math.sin(a) * 0.95, { seg: 5, r2: 0.0001 });
      rk.cyl(0.08, 0.15, ice, Math.cos(a) * 0.95, -0.1, Math.sin(a) * 0.95, { seg: 5, r2: 0.08 });
    }
    rk.done();
    h.idleSpin = 2.5;
  }
  h.muzzles = [];
  muzzle(h, g, death ? -0.5 : -0.32, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-0.6, 0, -0.3);
  h.pose = { right: -2.8, left: -0.6, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = { color: ballColor, size: death ? 0.7 : 0.45, arc: 3, ...(death ? { glowing: true } : {}) };
  return own(h, 0);
}

// ------------------------------------------------------------------ Huntsman

/** A hunter's hat: flat round brim, rounded crown, a band and a feather (head space). */
function hunterHat(k, col, bandCol, feather) {
  k.cyl(1.1, 0.07, col, 0, 1.08, 0, { seg: 26 });
  k.torus(1.1, 0.035, tone(col, 0.8), 0, 1.08, 0, { rx: PI / 2, seg: 26 });
  k.cyl(0.66, 0.52, col, 0, 1.36, 0, { seg: 20, r2: 0.58 });
  dome(k, 0.58, 0.2, col, 0, 1.62, 0);
  k.box(0.1, 0.08, 0.7, tone(col, 0.7), 0, 1.8, 0); // dent
  k.cyl(0.67, 0.16, bandCol, 0, 1.2, 0, { seg: 20 });
  if (feather != null) {
    k.box(0.05, 0.75, 0.2, feather, 0.66, 1.5, -0.25, { rz: -0.35, rx: -0.3, r: 0.02 });
    k.cyl(0.015, 0.8, 0xeeeeee, 0.67, 1.5, -0.25, { rz: -0.35, rx: -0.3, seg: 4 }); // quill
  }
}

/**
 * A lever-action rifle on the fist (gun space): wooden stock, a brass-plated receiver, the lever
 * loop, an eight-sided barrel over a tube magazine. o: len, wood, metal, laser (a glow material:
 * a laser box under the barrel), short (a cut-down stock). Returns the bore point [y, z].
 */
function leverRifle(k, o = {}) {
  const len = o.len ?? 2.4;
  const wood = o.wood ?? WOOD;
  const metal = o.metal ?? GUNMETAL;
  const U = UP;
  const B = U + 0.06;
  if (o.short) k.box(0.24, 0.35, 0.36, wood, 0, 0.38, U - 0.16, { r: 0.07 });
  else {
    k.slab(0.28, 0.75, 0.38, wood, 0, 0.56, U - 0.1, { td: 1.25, tz: -0.05 }); // butt
    k.box(0.3, 0.08, 0.48, INK, 0, 0.96, U - 0.12, { r: 0.02 });
  }
  k.box(0.22, 0.3, 0.34, wood, 0, 0.16, U - 0.18, { rx: -0.3, r: 0.05 }); // wrist
  k.box(0.3, 0.7, 0.36, metal, 0, -0.25, U - 0.02, { r: 0.04 }); // receiver
  for (const s of [-1, 1]) k.box(0.02, 0.4, 0.2, o.plate ?? BRASS, s * 0.16, -0.25, U - 0.04); // side plates
  k.torus(0.16, 0.03, metal, 0, 0.02, U - 0.34, { ry: PI / 2, seg: 12 }); // lever loop
  k.cyl(0.07, len - 0.6, metal, 0, -0.6 - (len - 0.6) / 2, B, { seg: 8 }); // eight-sided barrel
  k.cyl(0.055, len - 1.0, tone(metal, 0.8), 0, -0.6 - (len - 1.0) / 2, B - 0.14, { seg: 10 }); // tube magazine
  k.box(0.26, 0.85, 0.26, wood, 0, -0.95, U - 0.1, { r: 0.06 }); // fore-end
  k.torus(0.1, 0.025, metal, 0, -len + 0.35, B - 0.07, { rx: PI / 2, seg: 10 }); // barrel band
  k.box(0.04, 0.1, 0.12, INK, 0, -len + 0.1, B + 0.1); // front sight
  k.box(0.14, 0.06, 0.12, INK, 0, -0.65, B + 0.1); // rear sight
  k.cyl(0.075, 0.04, 0x050505, 0, -len - 0.01, B, { seg: 8 });
  for (const y of [0.7, -1.3]) k.torus(0.06, 0.02, INK, 0, y, U - 0.32, { ry: PI / 2, seg: 8 }); // sling swivels
  if (o.laser) {
    k.box(0.06, 0.6, 0.1, INK, 0.14, -1.1, B - 0.04); // mount
    k.box(0.18, 0.5, 0.18, INK, 0.24, -1.2, B - 0.04, { r: 0.03 });
    k.cyl(0.05, 0.03, o.laser, 0.24, -1.46, B - 0.04, { seg: 8 });
    k.box(0.04, 0.06, 0.06, 0x37474f, 0.34, -1.1, B); // switch
  }
  return [-len, B];
}

/** A satchel on the left hip stuffed with cash bundles and a rolled bounty poster (torso space). */
function cashSatchel(k, col) {
  sash(k, tone(col, 0.7), -1, 0.2);
  const x = 1.12;
  k.box(0.38, 0.8, 0.95, col, x, -0.8, 0, { r: 0.08 });
  for (const [z, ry] of [[-0.2, 0.2], [0.15, -0.15]]) {
    k.box(0.16, 0.3, 0.32, CASH, x, -0.32, z, { ry });
    k.box(0.17, 0.08, 0.33, 0xfafafa, x, -0.32, z, { ry }); // paper band
  }
  k.cyl(0.08, 0.5, PAPER, x - 0.02, -0.25, 0.32, { seg: 8, rz: 0.15 }); // the poster
  k.box(0.42, 0.3, 0.98, tone(col, 0.85), x, -0.5, 0, { r: 0.05, rz: -0.25 }); // flap, left open
  k.box(0.44, 0.08, 0.1, 0xb0b0b0, x, -0.75, 0.3);
}

/**
 * Huntsman (event): a hunter in a brown jacket and a wide hat with a lever-action rifle. Lv 1
 * Longshot: a laser sight, Lv 2 Payday: a satchel full of cash and a bounty poster, Lv 3 Double
 * Tap: a cut-down second rifle in the left hand, Lv 4 Harvester: a dark long coat with a glowing
 * red trim, a face scarf and a scythe on its back.
 */
export function makeHuntsman(level) {
  const harvester = level >= 4;
  const coat = harvester ? 0x263238 : 0x6d4c41;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: coat, pants: 0x3e2723, arms: coat, face: 'agent' });
  const key = `huntsman${level}`;
  const red = glowMat(h, 0xff1744);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x3e2723, { h: 0.38 });
  hunterHat(hd, harvester ? 0x111111 : 0x4e342e, harvester ? red : 0xbf8040, harvester ? null : 0x8d1c1c);
  if (harvester) band(hd, 0.68, 0.06, 0.42, 2.6, 0x3b0d0d, 0.3); // face scarf
  // a hunting jacket: front panels, toggles, a leather shooting patch on the right shoulder
  t.box(2.2, 1.9, 1.18, coat, 0, 0.05, 0, { r: 0.14 });
  collar(t, tone(coat, 0.8), { buttons: false });
  for (let i = 0; i < 3; i++) t.cyl(0.05, 0.22, BRASS, 0.12, 0.5 - i * 0.4, 0.62, { rz: PI / 2, seg: 6 }); // toggles
  t.box(0.04, 1.7, 0.04, tone(coat, 0.7), 0.0, 0.0, 0.6);
  t.box(0.6, 0.8, 0.06, harvester ? 0x1c2529 : LEATHER, -0.62, 0.45, 0.6, { r: 0.04 }); // shooting patch
  for (const s of [-1, 1]) pouch(t, s * 0.6, -0.45, 0.58, 0.5, 0.42, tone(coat, 0.85), 0.12);
  bandolier(t, 1, 0x3e2723);
  belt(t, 0x3e2723, BRASS);
  t.box(0.16, 0.6, 0.26, LEATHER, -0.9, -1.15, 0.3, { r: 0.04 }); // knife sheath
  t.box(0.1, 0.2, 0.12, 0x8d6e63, -0.9, -0.78, 0.3);
  if (level >= 2) cashSatchel(t, 0x8d6e63);
  if (harvester) {
    // Harvester: a long coat with a red trim and a scythe across the back
    duster(t, 0x1c2529, { trim: red });
    t.cyl(0.07, 3.6, 0x3e2723, 0, 0.5, -0.82, { rz: 0.7, seg: 8 });
    t.tube([[-1.15, 1.9, -0.86], [-0.6, 2.35, -0.86], [0.3, 2.3, -0.86], [0.9, 1.85, -0.86]], 0.07, 0x90a4ae, { seg: 16, sides: 4 });
    t.tube([[-1.05, 1.86, -0.86], [-0.5, 2.18, -0.86], [0.3, 2.14, -0.86], [0.85, 1.83, -0.86]], 0.03, red, { seg: 16, sides: 4 }); // glowing edge
  }
  hd.done();
  t.done();
  hands(h, key, 0x4e342e, tone(coat, 0.75));
  feet(h, key, 0x3e2723, (b) => b.box(1.12, 0.5, 1.14, harvester ? 0x1c2529 : 0x5d4037, 0, -1.2, 0.02, { r: 0.05 })); // gaiters
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = leverRifle(gk, { len: level >= 1 ? 2.6 : 2.2, metal: harvester ? 0x1c1f22 : GUNMETAL, wood: harvester ? 0x3b2a20 : WOOD, plate: harvester ? red : BRASS, laser: level >= 1 ? red : null });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  if (level >= 3) {
    // Double Tap: a cut-down rifle in the left hand
    const g2 = fist(h.leftArm, -1.9, 1.15);
    const k2 = wear(h, g2, `${key}:gun2`);
    const [y2, z2] = leverRifle(k2, { len: 1.7, short: true, metal: harvester ? 0x1c1f22 : GUNMETAL, wood: harvester ? 0x3b2a20 : WOOD, plate: harvester ? red : BRASS });
    k2.done();
    muzzle(h, g2, y2, z2);
    h.leftArm.rotation.set(-PI / 2, 0, -0.1);
    h.pose.left = -PI / 2;
  }
  h.tracer = harvester ? 0xff5252 : 0xffc107;
  return own(h);
}

// ------------------------------------------------------------------ Archer

/**
 * A bow in the left fist (gun space: it stands along z, the arrow points along -y): wrapped grip,
 * two curved limbs, the string pulled back and a nocked arrow. o: wood, tips, wrap, flame.
 * Returns the arrow tip y.
 */
export function bow(k, o) {
  const wood = o.wood;
  k.cyl(0.11, 0.6, o.wrap, 0, 0, 0, { axis: 'z', seg: 10 }); // grip
  for (const zz of [-0.2, 0, 0.2]) k.torus(0.115, 0.02, tone(o.wrap, 0.7), 0, 0, zz, { seg: 10 });
  for (const s of [-1, 1]) {
    k.tube([[0, 0, s * 0.28], [0, -0.22, s * 0.8], [0, -0.14, s * 1.35], [0, 0.1, s * 1.72]], 0.075, wood, { seg: 14, sides: 6 });
    if (o.recurve) k.tube([[0, 0.1, s * 1.72], [0, -0.05, s * 1.92]], 0.05, wood, { seg: 4, sides: 6 }); // tips curl away
    k.ball(0.07, o.tips, 0, o.recurve ? -0.05 : 0.1, s * (o.recurve ? 1.92 : 1.72), { seg: 8, rows: 5 });
    k.tube([[0, 0.1, s * 1.72], [0, 0.95, 0]], 0.018, 0xeeeeee, { seg: 2, sides: 4, tension: 0 }); // string
  }
  k.box(0.08, 0.14, 0.12, tone(o.wrap, 0.6), 0.1, -0.05, 0.14); // arrow rest
  // the arrow: shaft, fletching at the nock, a head at the front
  const tip = -0.85;
  k.cyl(0.035, 0.95 - tip, 0xd7ccc8, 0, (0.95 + tip) / 2, 0.12, { seg: 6 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    k.box(0.02, 0.32, 0.12, i ? 0xfafafa : 0xc62828, Math.sin(a) * 0.06, 0.72, 0.12 + Math.cos(a) * 0.06, { ry: a });
  }
  k.cyl(0.01, 0.28, STEEL, 0, tip + 0.14, 0.12, { r2: 0.09, seg: 8 });
  if (o.flame) {
    k.ball(0.15, o.flame, 0, tip + 0.18, 0.12, { sy: 1.5, seg: 8, rows: 6 });
    k.cyl(0.09, 0.3, o.flame, 0, tip + 0.4, 0.2, { seg: 6, r2: 0.0001, rx: 0.4 });
  }
  return tip;
}

/**
 * A repeating crossbow on the fist (gun space): a dark tiller, a box magazine of bolts on top
 * with a cocking lever, steel recurve limbs and a flaming bolt. Returns the bolt tip [y, z].
 */
function repeater(k, wood, metal, trim, flame) {
  const U = UP;
  k.box(0.28, 0.75, 0.4, wood, 0, 0.55, U - 0.08, { r: 0.07 }); // butt
  k.box(0.3, 0.08, 0.46, INK, 0, 0.94, U - 0.08, { r: 0.02 });
  k.box(0.26, 2.3, 0.28, wood, 0, -0.85, U, { r: 0.05 }); // tiller
  k.box(0.27, 0.12, 0.29, trim, 0, -0.3, U); // blood-red bands
  k.box(0.27, 0.12, 0.29, trim, 0, -1.4, U);
  k.box(0.22, 0.26, 0.5, wood, 0, 0.05, U - 0.34, { rx: -0.32, r: 0.05 }); // grip
  k.torus(0.1, 0.022, INK, 0, -0.14, U - 0.24, { ry: PI / 2, seg: 10, arc: PI });
  // the bolt magazine and its lever
  k.box(0.3, 1.0, 0.42, tone(wood, 1.2), 0, -0.75, U + 0.34, { r: 0.04 });
  for (let i = 0; i < 3; i++) k.cyl(0.03, 0.9, 0xd7ccc8, -0.08 + i * 0.08, -0.75, U + 0.6, { seg: 5 });
  k.tube([[0.18, -1.2, U + 0.3], [0.2, -0.6, U + 0.75], [0.2, 0.2, U + 0.6]], 0.04, metal, { seg: 10, sides: 5 });
  k.ball(0.07, metal, 0.18, -1.2, U + 0.3, { seg: 8, rows: 5 }); // lever pivot
  // the bow
  const P = -1.95;
  k.box(0.4, 0.3, 0.34, metal, 0, P, U, { r: 0.04 });
  for (const s of [-1, 1]) {
    k.tube([[0, P, U], [s * 0.7, P - 0.12, U], [s * 1.2, P + 0.15, U], [s * 1.35, P + 0.02, U]], 0.06, metal, { seg: 12, sides: 6 });
    k.tube([[s * 1.2, P + 0.15, U], [0, -0.55, U + 0.16]], 0.02, 0xeeeeee, { seg: 2, sides: 4, tension: 0 });
  }
  const tip = -2.45;
  k.cyl(0.035, 1.9, 0xd7ccc8, 0, tip + 0.95, U + 0.18, { seg: 6 });
  k.cyl(0.01, 0.24, STEEL, 0, tip + 0.12, U + 0.18, { r2: 0.08, seg: 8 });
  k.ball(0.13, flame, 0, tip + 0.18, U + 0.18, { sy: 1.4, seg: 8, rows: 5 });
  return [tip, U + 0.18];
}

/**
 * Archer (event): a hooded archer in green with a longbow and a quiver. Lv 1 Quick Hand: a leather
 * bracer and an archer's glove, Lv 2 Extra Sight: heat-vision goggles and a recurve bow, Lv 3
 * Flaming Arrows: burning arrows, Lv 4 Taste for Blood: a dark leather coat with blood-red trim
 * and a repeating crossbow.
 */
export function makeArcher(level) {
  const xbow = level >= 4;
  const flameOn = level >= 3;
  const coat = xbow ? 0x3e2723 : 0x2e7d32;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: coat, pants: 0x4e342e, arms: coat });
  const key = `archer${level}`;
  const flame = glowMat(h, 0xff7043);
  const blood = xbow ? glowMat(h, 0xb71c1c, 0.5) : null;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hood(hd, xbow ? 0x271a16 : 0x1b5e20);
  if (level >= 2) goggles(hd, 0.74, glowMat(h, 0xff5252), { r: 0.67, frame: 0x212121 });
  // a tunic with a laced neck, leaf-cut hem and a leather belt with a pouch
  t.box(2.16, 1.9, 1.16, xbow ? 0x2b1d18 : 0x33691e, 0, 0.0, 0, { r: 0.12 });
  t.box(0.26, 0.6, 0.04, INK, 0, 0.62, 0.59);
  for (let i = 0; i < 2; i++) for (const s of [-1, 1]) t.box(0.34, 0.03, 0.03, 0xd7ccc8, 0, 0.82 - i * 0.24, 0.62, { rz: s * 0.5 }); // crossed laces
  for (let i = 0; i < 7; i++) t.plan([[-0.15, 0], [0.15, 0], [0, 0.22]], 0.05, xbow ? 0x2b1d18 : 0x33691e, -0.9 + i * 0.3, -1.12, 0.56, { rx: -PI / 2 }); // leaf points
  belt(t, LEATHER, 0x9e9e9e, -0.82);
  pouch(t, -0.6, -1.0, 0.56, 0.36, 0.34, LEATHER, 0.16);
  if (xbow) {
    duster(t, 0x3e2723, { trim: blood });
    for (const s of [-1, 1]) t.box(0.06, 0.6, 0.06, blood, s * 0.35, 0.45, 0.62); // red lacing
    // a case of spare bolts on the right hip
    t.box(0.3, 0.9, 0.4, LEATHER, -1.12, -0.85, 0.15, { r: 0.05 });
    for (let i = 0; i < 3; i++) t.cyl(0.03, 0.4, 0xd7ccc8, -1.12, -0.25, 0.05 + i * 0.1, { seg: 5 });
  } else {
    // a quiver on the back, its strap across the chest
    t.box(0.22, 2.5, 1.12, LEATHER, 0, 0, 0, { rz: -0.62 });
    t.cyl(0.3, 1.7, 0x6d4c41, 0.5, 0.25, -0.88, { rz: 0.3, seg: 12 });
    for (const yy of [-0.45, 0.85]) t.torus(0.3, 0.04, tone(0x6d4c41, 0.6), 0.5 - yy * 0.3, 0.25 + yy, -0.88, { rx: PI / 2, rz: 0.3, seg: 12 });
    for (const [dx, dz, i] of [[-0.1, 0.06, 0], [0.08, -0.06, 1], [0.0, -0.14, 2], [0.12, 0.08, 3]]) {
      const x = 0.24 + dx;
      t.cyl(0.03, 0.55, 0xd7ccc8, x - 0.06, 1.3, -0.88 + dz, { rz: 0.3, seg: 5 });
      if (flameOn && i % 2) t.ball(0.1, flame, x - 0.15, 1.6, -0.88 + dz, { sy: 1.5, seg: 7, rows: 5 }); // burning tips
      else t.box(0.03, 0.26, 0.14, i % 2 ? 0xfafafa : 0xc62828, x - 0.12, 1.5, -0.88 + dz, { rz: 0.3 }); // fletching
    }
  }
  hd.done();
  t.done();
  hands(h, key, level >= 1 ? 0x5d4037 : null, tone(coat, 0.75), level >= 1 ? (a, s) => {
    if (s === 1) {
      // a leather bracer on the bow arm
      a.cyl(0.58, 0.7, 0x6d4c41, 0, -1.25, 0, { seg: 12, r2: 0.6 });
      for (let i = 0; i < 3; i++) a.box(0.3, 0.03, 0.03, 0xd7ccc8, 0, -1.05 - i * 0.2, 0.6);
    }
  } : null);
  feet(h, key, xbow ? 0x1a1a1a : 0x4e342e, (b) => b.box(1.12, 0.12, 1.14, xbow ? 0x2b1d18 : 0x6d4c41, 0, -1.3, 0.02)); // boot turn-downs
  h.muzzles = [];
  if (xbow) {
    const g = fist(h.rightArm, -1.9, 1.15);
    const gk = wear(h, g, `${key}:gun`);
    const [y, z] = repeater(gk, 0x2b1d18, 0x37474f, blood, flame);
    gk.done();
    muzzle(h, g, y, z);
    aimLong(h);
  } else {
    const g = fist(h.leftArm, -1.9, 1.1);
    const gk = wear(h, g, `${key}:bow`);
    const tip = bow(gk, { wood: level >= 2 ? 0x4e342e : 0x795548, tips: level >= 2 ? 0xb0bec5 : 0x5d4037, wrap: level >= 1 ? 0x2e7d32 : LEATHER, recurve: level >= 2, flame: flameOn ? flame : null });
    gk.done();
    muzzle(h, g, tip, 0.12);
    h.leftArm.rotation.set(-PI / 2, 0, 0.3);
    h.rightArm.rotation.set(-PI / 2, 0, -0.4);
    h.pose = { right: -PI / 2, left: -PI / 2, leftRecoil: 0 };
  }
  h.blade = flameOn ? { color: 0xff7043, size: xbow ? 1.5 : 1.2 } : { color: 0x8d6e63, size: 1.2 };
  h.tracer = flameOn ? 0xff7043 : 0xd7ccc8;
  return own(h, xbow ? UP : 0);
}

// ------------------------------------------------------------------ Stunner

/** A taser on the fist (gun space): a yellow body, black cartridge with prongs, laser. Returns the prong y. */
function taser(k, s, zap, laser) {
  const U = 0.28;
  k.box(0.24, 0.26, 0.55, 0x212121, 0, 0.12, U - 0.36, { rx: -0.28, r: 0.04 }); // grip
  for (let i = 0; i < 3; i++) k.box(0.25, 0.03, 0.4, INK, 0, 0.05 + i * 0.07, U - 0.36, { rx: -0.28 });
  k.box(0.3, 0.8 * s, 0.36, 0xfdd835, 0, -0.3 * s + 0.1, U + 0.02, { r: 0.06 }); // body
  k.box(0.32, 0.06, 0.38, INK, 0, -0.1, U + 0.02); // stripe
  const f = -0.7 * s;
  k.box(0.34, 0.32, 0.4, 0x212121, 0, f, U + 0.02, { r: 0.04 }); // cartridge
  for (const x of [-0.08, 0.08]) {
    k.box(0.05, 0.16, 0.05, STEEL, x, f - 0.22, U + 0.06);
    k.ball(0.04, zap, x, f - 0.3, U + 0.06, { seg: 6, rows: 4 });
  }
  k.torus(0.09, 0.02, INK, 0, -0.1, U - 0.22, { ry: PI / 2, seg: 10, arc: PI }); // trigger guard
  k.box(0.12, 0.2, 0.12, INK, 0, -0.45 * s, U - 0.2, { r: 0.02 }); // laser
  k.cyl(0.03, 0.02, laser, 0, -0.45 * s - 0.11, U - 0.2, { seg: 6 });
  k.box(0.14, 0.06, 0.06, 0x76ff03, 0, 0.0, U + 0.21); // charge light
  return f - 0.32;
}

/** A lightning bolt (side profile in z, y) for the Thunder God's helmet wings. */
const BOLT = [[0.1, 0], [-0.15, 0.4], [0.0, 0.4], [-0.3, 0.85], [0.15, 0.32], [0.0, 0.32], [0.25, 0]];

/**
 * Stunner (event): a security guard with a taser. Lv 1 Bigger Zap: a bigger taser and spare
 * cartridges, Lv 2 Heavy Duty: a battery pack on the back, Lv 3 Peacekeeper: a riot helmet and a
 * vest, Lv 4 Thunder God: a storm-blue suit, a winged helmet and a staff whose sparks circle it.
 */
export function makeStunner(level) {
  const god = level >= 4;
  const shirt = god ? 0x1a237e : 0x37474f;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: god ? 0x0d1440 : 0x263238, arms: shirt, face: 'soldier' });
  const key = `stunner${level}`;
  const zap = glowMat(h, god ? 0x82b1ff : 0xfff176);
  const laser = glowMat(h, 0xff1744);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (god) {
    dome(hd, 0.8, 0.7, 0x283593, 0, 0.8, -0.02);
    band(hd, 0.78, 0.07, 0.75, 3.5, 0x283593, 0.48, { ry: PI });
    band(hd, 0.86, 0.05, 0.28, 2.2, zap, 0.74); // glowing visor
    hd.box(0.16, 0.12, 1.3, 0x5c6bc0, 0, 1.52, -0.05, { r: 0.04 });
    for (const s of [-1, 1]) hd.prism(BOLT, 0.08, zap, s * 0.82, 0.85, -0.1);
  } else if (level >= 3) riotHelmet(hd, 0x263238, glassMat(h, 0x90caf9, 0.5));
  else {
    hair(hd, 0x1a1209, { h: 0.36 });
    peakedCap(hd, 0x263238, 0x111111, GOLD);
  }
  // a guard's uniform shirt: collar, pockets, epaulettes, a badge, name tag and SECURITY stripes
  t.box(2.2, 1.85, 1.16, shirt, 0, 0.08, 0, { r: 0.12 });
  collar(t, tone(shirt, 0.82));
  pockets(t, tone(shirt, 0.9));
  for (const s of [-1, 1]) t.box(0.44, 0.12, 1.18, tone(shirt, 0.72), s * 0.62, 1.0, 0, { r: 0.04 });
  t.plan([[-0.18, 0.2], [0.18, 0.2], [0.18, -0.05], [0, -0.22], [-0.18, -0.05]], 0.05, GOLD, -0.5, 0.62, 0.6, { rx: PI / 2 }); // badge
  t.box(0.6, 0.16, 0.04, 0xfafafa, 0.5, 0.65, 0.6);
  t.box(1.7, 0.28, 0.04, 0xfdd835, 0, 0.35, -0.6); // SECURITY on the back
  for (let i = 0; i < 6; i++) t.box(0.12, 0.14, 0.02, INK, -0.55 + i * 0.22, 0.35, -0.625);
  belt(t, 0x212121, 0xb0b0b0, -0.86);
  pouch(t, 0.55, -0.88, 0.58, 0.34, 0.32, 0x212121, 0.16); // cuff case
  t.cyl(0.1, 0.55, 0x212121, -1.1, -1.0, 0.2, { seg: 10 }); // flashlight
  t.cyl(0.13, 0.12, 0x212121, -1.1, -0.68, 0.2, { seg: 10 });
  if (level >= 1) for (const x of [-0.55, -0.15]) {
    t.box(0.3, 0.32, 0.18, 0xfdd835, x, -0.9, 0.62, { r: 0.04 }); // spare cartridges
    t.box(0.31, 0.08, 0.19, INK, x, -0.82, 0.62);
  }
  if (level >= 2) {
    // Heavy Duty: a battery pack with a charge bar and a coiled cable to the belt
    t.box(1.3, 1.5, 0.55, 0x424242, 0, 0.1, -0.85, { r: 0.08 });
    t.box(1.1, 0.12, 0.6, 0x212121, 0, 0.55, -0.85);
    for (let i = 0; i < 4; i++) t.box(0.18, 0.28, 0.06, zap, -0.3 + i * 0.2, 0.15, -1.14);
    for (const x of [-0.45, 0.45]) t.cyl(0.08, 0.18, 0xd32f2f, x, 0.92, -0.85, { seg: 8 }); // terminals
    for (let i = 0; i < 5; i++) t.torus(0.12, 0.03, INK, -1.0, -0.2 - i * 0.12, -0.6, { rx: PI / 2, seg: 10 });
    for (const s of [-1, 1]) t.box(0.22, 1.3, 0.06, INK, s * 0.5, 0.32, 0.6);
  }
  if (level >= 3 && !god) vest(t, 0x263238, { pouches: 2, pouch: 0x1c2429, patch: 0xfdd835 });
  if (god) {
    // a storm suit: a glowing lightning bolt across the chest and shoulder plates
    t.box(2.24, 1.3, 1.2, 0x283593, 0, 0.3, 0, { r: 0.14 });
    t.prism(BOLT.map(([a, b]) => [a * 1.6, b * 1.6 - 0.6]), 0.05, zap, 0, 0.1, 0.62, { ry: PI / 2 });
    shoulderPads(t, 0x303f9f, 0.62);
  }
  hd.done();
  t.done();
  hands(h, key, god ? 0x0d1440 : 0x212121, tone(shirt, 0.78), god ? (a) => {
    for (let i = 0; i < 2; i++) a.torus(0.56, 0.04, zap, 0, -1.2 - i * 0.2, 0, { rx: PI / 2, seg: 14 }); // glowing bracers
  } : null);
  feet(h, key, 0x111111, level >= 3 ? kneePad : null);
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  let tipY;
  if (god) {
    // the Thunder God's staff: a long shaft, copper coils and a forked head round a glowing orb
    tipY = -2.9;
    gk.cyl(0.1, 3.4, 0x455a64, 0, -1.0, 0, { seg: 10 });
    gk.ball(0.16, 0x5c6bc0, 0, 0.72, 0, { seg: 10, rows: 7 });
    for (let i = 0; i < 4; i++) gk.torus(0.13, 0.035, 0xb87333, 0, -1.2 - i * 0.12, 0, { rx: PI / 2, seg: 10 });
    gk.cyl(0.16, 0.3, 0x283593, 0, -2.45, 0, { seg: 12, r2: 0.12 });
    for (const s of [-1, 1]) gk.tube([[0, -2.55, 0], [s * 0.45, -2.75, 0], [s * 0.35, -3.2, 0], [s * 0.1, -3.4, 0]], 0.05, 0x7986cb, { seg: 12, sides: 5 });
    gk.ball(0.3, zap, 0, tipY, 0, { seg: 14, rows: 10 });
    gk.ball(0.4, glassMat(h, 0x82b1ff, 0.25), 0, tipY, 0, { seg: 14, rows: 10 });
    gk.done();
    const ring = spinner(h, g, 0, tipY, 0);
    const rk = wear(h, ring, `${key}:sparks`);
    rk.torus(0.65, 0.025, zap, 0, 0, 0, { rx: PI / 2, seg: 28 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2;
      rk.ball(0.09, zap, Math.cos(a) * 0.65, 0, Math.sin(a) * 0.65, { seg: 8, rows: 5 });
    }
    rk.done();
    h.idleSpin = 3;
  } else {
    tipY = taser(gk, level >= 1 ? 1.2 : 1, zap, laser);
    gk.done();
  }
  h.muzzles = [];
  muzzle(h, g, tipY, god ? 0 : 0.34);
  h.rightArm.rotation.set(-PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-0.4, 0, -0.3);
  h.pose = { right: -PI / 2, left: -0.4, leftRecoil: 0 };
  h.tracer = god ? 0x82b1ff : 0xfff176;
  h.tracerWidth = 0.15;
  return own(h, god ? 0 : 0.28);
}

// ------------------------------------------------------------------ Harpoon Hunter

/** A sou'wester rain hat: round crown, a brim longer at the back, chin ties (head space). */
function souwester(k, col) {
  dome(k, 0.76, 0.6, col, 0, 0.95, 0);
  k.cyl(0.9, 0.07, col, 0, 1.0, -0.14, { seg: 24, sz: 1.18, rx: 0.16 });
  k.torus(0.75, 0.04, tone(col, 0.8), 0, 1.0, 0, { rx: PI / 2, seg: 20 });
  for (const s of [-1, 1]) k.tube([[s * 0.68, 0.95, 0.05], [s * 0.58, 0.4, 0.2], [s * 0.2, 0.0, 0.45]], 0.03, tone(col, 0.7), { seg: 8, sides: 4 });
}

/**
 * A harpoon gun on the fist (gun space): stock, a round receiver, an air tank under a fat barrel,
 * a rope reel, and the barbed harpoon sticking out. o: len, metal, wood, tank, gauge, scope, twin,
 * head (the harpoon head colour or a glow material). Returns the harpoon tip [y, z].
 */
function harpoonGun(k, o) {
  const len = o.len;
  const metal = o.metal;
  const U = UP;
  const B = U + 0.08;
  k.box(0.28, 0.75, 0.4, o.wood, 0, 0.55, U - 0.1, { r: 0.07 }); // stock
  k.box(0.3, 0.08, 0.46, INK, 0, 0.94, U - 0.1, { r: 0.02 });
  k.box(0.22, 0.26, 0.5, o.wood, 0, 0.1, U - 0.34, { rx: -0.3, r: 0.05 }); // grip
  k.torus(0.1, 0.022, INK, 0, -0.14, U - 0.24, { ry: PI / 2, seg: 10, arc: PI });
  k.cyl(0.19, 0.7, metal, 0, -0.15, B, { seg: 14 }); // receiver
  k.cyl(0.2, 0.08, INK, 0, 0.2, B, { seg: 14 });
  const xs = o.twin ? [-0.16, 0.16] : [0];
  for (const x of xs) {
    k.cyl(0.18, 1.0, o.tank, x, -0.75, U - 0.24, { seg: 14 }); // air tank
    for (const s of [-1, 1]) k.ball(0.18, o.tank, x, -0.75 + s * 0.5, U - 0.24, { sy: 0.4, seg: 14, rows: 5 });
    for (const y of [-0.45, -1.05]) k.torus(0.185, 0.025, INK, x, y, U - 0.24, { rx: PI / 2, seg: 14 });
  }
  const bl = len - 0.5;
  k.cyl(0.12, bl, metal, 0, -0.5 - bl / 2, B, { seg: 14 }); // barrel
  k.cyl(0.16, 0.14, INK, 0, -len + 0.07, B, { seg: 14 }); // muzzle ring
  k.box(0.08, bl - 0.2, 0.06, INK, 0, -0.5 - bl / 2, B + 0.13); // top rail
  // the rope reel on the right side and the rope out to the harpoon
  k.cyl(0.24, 0.16, 0x5d4037, -0.32, -0.3, U - 0.02, { axis: 'x', seg: 14 });
  k.torus(0.17, 0.06, 0xd7b98a, -0.32, -0.3, U - 0.02, { ry: PI / 2, seg: 14 });
  k.cyl(0.04, 0.3, STEEL, -0.16, -0.3, U - 0.02, { axis: 'x', seg: 6 });
  k.tube([[-0.34, -0.36, U - 0.18], [-0.3, -1.0, U - 0.42], [-0.15, -len + 0.3, B - 0.2], [-0.04, -len - 0.2, B - 0.04]], 0.025, 0xd7b98a, { seg: 16, sides: 4 });
  if (o.gauge) {
    k.cyl(0.16, 0.1, INK, 0.22, -0.75, U - 0.24, { axis: 'x', seg: 14 });
    k.cyl(0.13, 0.02, 0xfafafa, 0.28, -0.75, U - 0.24, { axis: 'x', seg: 14 });
    k.box(0.02, 0.18, 0.03, 0xd32f2f, 0.29, -0.72, U - 0.2, { rx: 0.5 });
  }
  if (o.scope) {
    const sz = B + 0.38;
    k.cyl(0.1, 0.9, INK, 0, -0.4, sz, { seg: 12 });
    k.cyl(0.14, 0.2, INK, 0, -0.9, sz, { seg: 12, r2: 0.11 });
    k.cyl(0.11, 0.02, 0x4fc3f7, 0, -1.01, sz, { seg: 12 });
    for (const y of [-0.65, -0.15]) k.box(0.1, 0.1, 0.28, INK, 0, y, B + 0.2);
  }
  // the harpoon: shaft, a barbed head and a tail ring for the rope
  const tip = -len - 0.85;
  k.cyl(0.05, 1.1, STEEL, 0, -len - 0.2, B, { seg: 8 });
  k.cyl(0.0001, 0.4, o.head, 0, tip + 0.2, B, { r2: 0.15, seg: 10 });
  for (const s of [-1, 1]) k.box(0.04, 0.3, 0.06, o.head, s * 0.13, tip + 0.48, B, { rz: s * 0.5 }); // barbs
  k.torus(0.07, 0.02, STEEL, 0, -len - 0.2, B - 0.07, { seg: 8 });
  return [tip, B];
}

/**
 * Harpoon Hunter (event): a bearded whaler in a yellow raincoat and a sou'wester with a harpoon
 * gun. Lv 1 Pressure Gauge on the gun, Lv 2 Precision: a scope and a coil of rope on the
 * shoulder, Lv 3 Titanium Enforced: a steel chest plate and a titanium gun, Lv 4 Apex Predator: a
 * dark coat, a shark-tooth necklace and a huge twin-tank launcher with a glowing red head.
 */
export function makeHarpoonHunter(level) {
  const apex = level >= 4;
  const ti = level >= 3;
  const coat = apex ? 0x263238 : 0xfbc02d;
  const h = makeHumanoid({ skin: 0xffcc80, shirt: coat, pants: apex ? 0x1c2529 : 0x37474f, arms: coat });
  const key = `harpoonHunter${level}`;
  const red = glowMat(h, 0xff1744);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  souwester(hd, apex ? 0x111111 : 0xf9a825);
  // a big beard and a moustache
  const beard = 0x8d6e63;
  hd.box(1.1, 0.42, 0.3, beard, 0, 0.22, 0.48, { r: 0.12 });
  hd.box(0.8, 0.3, 0.26, beard, 0, -0.02, 0.48, { r: 0.1 });
  hd.box(0.56, 0.12, 0.1, tone(beard, 0.85), 0, 0.46, 0.62, { r: 0.04 });
  // a raincoat: toggles on rope loops, big flapped pockets, a storm flap
  t.box(2.24, 1.95, 1.2, coat, 0, 0.02, 0, { r: 0.16 });
  t.box(0.3, 1.8, 0.06, tone(coat, 0.85), 0.2, 0.0, 0.6, { r: 0.03 });
  for (let i = 0; i < 4; i++) {
    t.cyl(0.05, 0.24, 0x795548, 0.2, 0.65 - i * 0.42, 0.66, { rz: PI / 2, seg: 6 }); // toggles
    t.box(0.22, 0.03, 0.03, INK, 0.0, 0.65 - i * 0.42, 0.64);
  }
  for (const s of [-1, 1]) pouch(t, s * 0.62, -0.55, 0.58, 0.55, 0.5, tone(coat, 0.88), 0.14);
  t.box(2.28, 0.14, 1.24, tone(coat, 0.8), 0, -0.92, 0, { r: 0.05 }); // hem
  if (level >= 2) {
    // Precision: a coil of rope slung on the back
    for (let i = 0; i < 4; i++) t.torus(0.5 + i * 0.03, 0.055, i % 2 ? 0xc8a878 : 0xd7b98a, 0.1, 0.1, -0.68 - i * 0.05, { seg: 20 });
    t.box(0.2, 1.2, 0.08, INK, 0.1, 0.1, -0.85); // its strap
  }
  if (ti) {
    // a spare harpoon strapped across the back
    t.cyl(0.05, 3.0, STEEL, 0, 0.2, -0.95, { rz: -0.9, seg: 8 });
    t.cyl(0.0001, 0.35, apex ? red : 0xbdbdbd, 1.32, 1.12, -0.95, { r2: 0.13, seg: 10, rz: -0.9 + PI });
  }
  if (ti) {
    // Titanium Enforced: a steel chest plate with rivets
    t.slab(1.9, 1.3, 0.2, 0x90a4ae, 0, 0.3, 0.64, { tw: 0.9, r: 0.05 });
    for (const [x, y] of [[-0.75, 0.85], [0.75, 0.85], [-0.75, -0.25], [0.75, -0.25]]) t.ball(0.05, 0xcfd8dc, x, y, 0.76, { seg: 6, rows: 4 });
    for (const s of [-1, 1]) t.box(0.24, 0.1, 1.24, 0x607d8b, s * 0.55, 1.0, 0);
  }
  if (apex) {
    // Apex Predator: a shark-tooth necklace
    t.torus(0.58, 0.025, INK, 0, 0.85, 0.15, { rx: PI / 2 - 0.35, seg: 20, arc: PI, rz: PI });
    for (let i = 0; i < 5; i++) {
      const a = PI * (0.2 + i * 0.15);
      t.cyl(0.0001, 0.2, 0xfafafa, Math.cos(a) * 0.5, 0.82 - Math.sin(a) * 0.12, 0.58 + Math.sin(a) * 0.06, { r2: 0.07, seg: 4 });
    }
  }
  hd.done();
  t.done();
  hands(h, key, apex ? 0x1c2529 : 0xff8f00, tone(coat, 0.8));
  feet(h, key, apex ? 0x111111 : 0xf9a825, (b) => b.box(1.14, 0.6, 1.14, apex ? 0x1c1c1c : 0xffb300, 0, -1.2, 0.02, { r: 0.06 })); // tall rubber boots
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = harpoonGun(gk, {
    len: apex ? 2.9 : 2.3,
    metal: apex ? 0x263238 : ti ? 0xb0bec5 : 0x5d4037,
    wood: apex ? 0x1c1c1c : WOOD,
    tank: apex ? 0x37474f : ti ? 0x78909c : 0x424242,
    gauge: level >= 1,
    scope: level >= 2,
    twin: apex,
    head: apex ? red : 0xbdbdbd,
  });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = 0x9e9e9e;
  h.tracerWidth = apex ? 0.3 : 0.2;
  h.flight = { color: apex ? 0xff1744 : 0xbdbdbd, size: 1, arc: 0.8, long: true }; // the harpoon itself
  return own(h);
}

// ------------------------------------------------------------------ Gladiator

/** A gladius on the fist (gun space): pommel, ringed grip, guard and a tapered blade. Returns the tip y. */
function gladius(k, len, blade, metal, flame) {
  k.ball(0.17, metal, 0, 0.32, 0, { seg: 10, rows: 7 }); // pommel
  k.cyl(0.11, 0.5, 0x4e342e, 0, 0.0, 0, { seg: 10 }); // grip
  for (let i = 0; i < 3; i++) k.torus(0.115, 0.025, metal, 0, 0.15 - i * 0.15, 0, { rx: PI / 2, seg: 10 });
  k.box(0.62, 0.14, 0.34, metal, 0, -0.32, 0, { r: 0.05 }); // guard
  const y0 = -0.39;
  k.slab(0.1, len, 0.42, blade, 0, y0 - len / 2, 0, { bd: 0.08, bw: 0.6 }); // blade, narrowing to the point
  k.box(0.13, len * 0.75, 0.06, tone(typeof blade === 'number' ? blade : 0xffab40, 0.8), 0, y0 - len * 0.4, 0); // fuller
  if (flame) {
    for (let i = 0; i < 5; i++) {
      const y = y0 - 0.3 - i * (len - 0.5) / 4;
      for (const s of [-1, 1]) k.cyl(0.08, 0.35, flame, 0, y, s * 0.24, { r2: 0.0001, seg: 5, rx: s * 0.5 });
    }
  }
  return y0 - len;
}

/** A crested gladiator helmet: bowl, brim, cheek guards, a brow band and a plume (head space). */
function crestHelm(k, metal, plume, o = {}) {
  dome(k, 0.78, 0.72, metal, 0, 0.82, -0.02);
  k.cyl(0.98, 0.06, metal, 0, 0.82, -0.05, { seg: 24, sz: 1.08 });
  k.torus(0.78, 0.04, tone(metal, 0.75), 0, 0.98, -0.02, { rx: PI / 2, seg: 22 });
  for (const s of [-1, 1]) {
    k.box(0.1, 0.62, 0.55, metal, s * 0.7, 0.45, 0.22, { r: 0.04, rz: s * 0.08 }); // cheek guards
    k.ball(0.05, tone(metal, 0.7), s * 0.76, 0.6, 0.3, { seg: 6, rows: 4 });
  }
  k.box(0.2, 0.22, 1.35, tone(metal, 0.85), 0, 1.55, -0.05, { r: 0.05 }); // crest ridge
  for (let i = 0; i < 7; i++) {
    const zz = 0.6 - i * 0.22;
    k.box(0.22, 0.5 - Math.abs(i - 3) * 0.04, 0.26, plume, 0, 1.85 - Math.abs(i - 3) * 0.04, zz, { r: 0.08, rx: (i - 3) * -0.18 });
  }
  if (o.laurel) for (const s of [-1, 1]) for (let i = 0; i < 5; i++) k.box(0.06, 0.12, 0.26, o.laurel, s * 0.79, 1.05 + i * 0.04, 0.35 - i * 0.2, { rx: 0.5, ry: s * 0.2 });
}

/**
 * Gladiator (event): an arena fighter with a gladius, a round shield, a segmented arm guard and
 * sandals. Lv 1 Arena Conditioning: a shoulder guard and studded wrist wraps, Lv 2 Warrior's
 * Call: a crested helmet with a red plume, Lv 3 Champion's Flame: a flaming sword, Lv 4 Centurion:
 * banded armour and a red cape, Lv 5 King of the Arena: gold armour, a laurel and a purple cape.
 */
export function makeGladiator(level) {
  const king = level >= 5;
  const skin = 0xd9a066;
  const h = makeHumanoid({ skin, shirt: king ? 0xffb300 : 0x8d6e63, pants: 0x5d4037, arms: skin, face: 'frown' });
  const key = `gladiator${level}`;
  const metal = king ? GOLD : 0x9e9e9e;
  const fire = level >= 3 ? glowMat(h, 0xff6d00) : null;
  const leather = 0x6d4c41;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (level >= 2) crestHelm(hd, metal, king ? 0x6a1b9a : 0xc62828, { laurel: king ? 0x9ccc65 : null });
  else {
    hair(hd, 0x2b1b10, { h: 0.4 });
    headband(hd, 0xc62828, 1.0);
  }
  // a tunic under a leather harness with a round disc where the straps cross
  t.box(2.14, 1.85, 1.14, king ? 0xffb300 : 0x8d6e63, 0, 0.0, 0, { r: 0.1 });
  for (const s of [-1, 1]) sash(t, leather, s, 0.24);
  t.cyl(0.24, 0.08, metal, 0, 0.0, 0.64, { axis: 'z', seg: 16 });
  t.cyl(0.12, 0.04, tone(metal, 0.75), 0, 0.0, 0.69, { axis: 'z', seg: 12 });
  // a wide studded belt and an apron of leather strips
  t.box(2.18, 0.4, 1.18, leather, 0, -0.82, 0, { r: 0.05 });
  for (let i = 0; i < 7; i++) t.ball(0.05, metal, -0.75 + i * 0.25, -0.82, 0.6, { seg: 6, rows: 4 });
  for (let i = 0; i < 4; i++) {
    const x = -0.45 + i * 0.3;
    t.box(0.24, 0.5, 0.05, tone(leather, 0.9), x, -1.2, 0.58, { r: 0.02 });
    t.box(0.24, 0.08, 0.06, metal, x, -1.42, 0.58);
  }
  if (level >= 1) {
    // Arena Conditioning: a curved shoulder guard over the left shoulder
    t.ball(0.66, metal, 1.42, 0.95, 0, { sy: 0.5, seg: 16, rows: 8 });
    t.slab(0.12, 0.32, 1.1, metal, 0.95, 1.38, 0, { tw: 0.8, rz: -0.25 }); // a low neck flange
    for (const zz of [-0.35, 0, 0.35]) t.ball(0.05, tone(metal, 0.7), 1.42, 1.27, zz, { seg: 6, rows: 4 });
  }
  if (level >= 4) {
    // Centurion: banded armour, shoulder plates, medals and a cape
    for (let i = 0; i < 5; i++) t.box(2.22, 0.22, 1.2, metal, 0, 0.65 - i * 0.28, 0, { r: 0.06 });
    shoulderPads(t, metal, 0.58);
    for (const x of [-0.5, 0, 0.5]) t.cyl(0.13, 0.05, GOLD, x, 0.35, 0.68, { axis: 'z', seg: 12 });
    const cape = king ? 0x6a1b9a : 0xb71c1c;
    t.slab(2.0, 3.3, 0.1, cape, 0, -0.75, -0.68, { tw: 0.9, bw: 1.25, bd: 1.5, bz: -0.1 });
    for (const x of [-0.6, 0, 0.6]) t.box(0.08, 3.0, 0.06, tone(cape, 0.75), x * 1.1, -0.9, -0.76);
    for (const s of [-1, 1]) t.cyl(0.14, 0.06, GOLD, s * 0.8, 0.9, 0.6, { axis: 'z', seg: 12 }); // cape clasps
  }
  hd.done();
  t.done();
  // arms: a segmented manica on the sword arm, wraps on the shield arm, the shield
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    if (s < 0) {
      a.box(1.04, 1.3, 1.04, leather, 0, -0.85, 0, { r: 0.04 }); // padding under the plates
      for (let i = 0; i < 5; i++) a.box(1.1, 0.2, 1.1, i % 2 ? tone(metal, 0.85) : metal, 0, -0.3 - i * 0.24, 0, { r: 0.05 });
      a.box(1.08, 0.3, 1.08, leather, 0, -1.45, 0, { r: 0.04 });
    } else {
      a.box(1.06, 0.18, 1.06, leather, 0, -0.7, 0, { r: 0.03 });
      a.cyl(0.57, 0.5, leather, 0, -1.35, 0, { seg: 12 });
      // the round shield: wood (gold for the King), a rim, a boss and studs
      const sy = -2.05;
      const face = king ? 0xffca28 : 0x6d4c41;
      a.cyl(1.05, 0.12, face, 0, sy, 0, { seg: 26 });
      a.torus(1.05, 0.06, metal, 0, sy, 0, { rx: PI / 2, seg: 26 });
      a.torus(0.7, 0.03, king ? 0xb71c1c : 0xc62828, 0, sy - 0.07, 0, { rx: PI / 2, seg: 22 });
      dome(a, 0.28, 0.2, metal, 0, sy - 0.06, 0, { rx: PI });
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * PI * 2;
        a.ball(0.05, metal, Math.cos(ang) * 0.88, sy - 0.07, Math.sin(ang) * 0.88, { seg: 6, rows: 4 });
      }
      if (king) star(a, 0, sy - 0.07, 0, 0.45, 0xb71c1c, { rx: PI });
    }
    if (level >= 1) for (let i = 0; i < 2; i++) a.box(1.08, 0.08, 1.08, metal, 0, -1.35 - i * 0.18, 0); // wrist studs
    a.done();
  }
  // legs: sandals with straps up the shin and a greave on the left leg
  for (const [leg, s] of [[h.rightLeg, -1], [h.leftLeg, 1]]) {
    const b = wear(h, leg, `${key}:leg${s}`);
    b.box(1.1, 0.12, 1.2, LEATHER, 0, -1.96, 0.06);
    for (let i = 0; i < 4; i++) b.box(1.08, 0.07, 1.1, leather, 0, -1.78 + i * 0.16, 0.02);
    if (s > 0 || level >= 4) {
      b.box(0.92, 0.75, 0.22, metal, 0, -1.2, 0.5, { r: 0.08 }); // greave
      b.box(0.9, 0.06, 0.1, tone(metal, 0.7), 0, -0.85, 0.6);
    }
    b.done();
  }
  const g = fist(h.rightArm, -1.9, 1.1);
  const gk = wear(h, g, `${key}:gun`);
  const tipY = gladius(gk, king ? 2.3 : 1.95, fire ?? 0xe0e0e0, metal, fire);
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tipY, 0);
  h.rightArm.rotation.set(-2.5, 0, 0.2);
  h.leftArm.rotation.set(-1.2, 0, -0.2);
  h.pose = { right: -2.5, left: -1.2, leftRecoil: 0 };
  h.swing = 2.0;
  h.melee = true;
  h.tracer = fire ? 0xff6d00 : 0xffffff;
  return own(h, 0);
}

// ------------------------------------------------------------------ Commando (event)

/** A sci-fi helmet: shell, sides, neck guard, a visor band and ear pods, one with an antenna (head space). */
function sciHelmet(k, col, visor) {
  dome(k, 0.8, 0.72, col, 0, 0.82, -0.02);
  band(k, 0.79, 0.08, 0.72, 3.4, col, 0.46, { ry: PI });
  k.box(1.3, 0.3, 0.2, tone(col, 0.8), 0, 0.2, -0.78, { r: 0.05 });
  band(k, 0.86, 0.05, 0.3, 2.2, visor, 0.74);
  band(k, 0.83, 0.07, 0.12, 2.3, tone(col, 0.7), 0.94); // visor brow
  k.box(0.16, 0.1, 1.2, tone(col, 0.8), 0, 1.53, -0.05, { r: 0.04 });
  for (const s of [-1, 1]) {
    k.cyl(0.22, 0.16, tone(col, 0.8), s * 0.82, 0.72, 0, { axis: 'x', seg: 14 });
    k.cyl(0.1, 0.04, INK, s * 0.91, 0.72, 0, { axis: 'x', seg: 10 });
  }
  antenna(k, 0.88, 0.9, -0.12, 0.7);
}

/** A missile pod on the back: a box with rows of tubes opening upward, red noses showing (torso space). */
function missilePod(k, col, cols, rows) {
  const w = cols * 0.4 + 0.25;
  const d = rows * 0.4 + 0.2;
  const z = -0.6 - d / 2;
  k.box(w, 1.5, d, col, 0, 0.35, z, { r: 0.08 });
  k.box(w + 0.04, 0.12, d + 0.04, tone(col, 0.7), 0, -0.2, z);
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const x = (c - (cols - 1) / 2) * 0.4;
    const zz = z + (r - (rows - 1) / 2) * 0.4;
    k.cyl(0.16, 0.1, INK, x, 1.12, zz, { seg: 12 });
    k.cyl(0.12, 0.25, 0xd32f2f, x, 1.2, zz, { seg: 10, r2: 0.0001 });
  }
  k.box(0.5, 0.24, 0.04, 0xfdd835, 0, 0.55, z - d / 2 - 0.02); // warning stripe
  for (const s of [-1, 1]) {
    k.box(0.22, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
    k.box(0.22, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
  }
}

/**
 * Commando (event): a sci-fi trooper in green armour with a laser rifle. Lv 1 Recon Mission: a
 * comms pack with an antenna, Lv 2 Titanium Rounds: a glowing visor and a scope, Lv 3 Jericho
 * Missiles: a missile pod on the back, Lv 4 Death & Taxes: heavy black armour with red lights,
 * a bigger pod and a longer rifle.
 */
export function makeEventCommando(level) {
  const heavy = level >= 4;
  const shirt = heavy ? 0x212121 : 0x33691e;
  const armor = heavy ? 0x263238 : 0x4b5320;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: heavy ? 0x111111 : 0x1b5e20, arms: shirt, face: 'soldier' });
  const key = `eventCommando${level}`;
  const light = glowMat(h, heavy ? 0xff1744 : 0x76ff03);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  sciHelmet(hd, heavy ? 0x111111 : 0x2e4a1e, level >= 2 ? light : glassMat(h, 0x263238, 0.8));
  // armour: a sloped chest plate, a back plate, ab plates, shoulder pads, light strips
  t.slab(1.9, 1.25, 0.24, armor, 0, 0.35, 0.58, { tw: 0.9 });
  t.box(1.8, 1.4, 0.2, armor, 0, 0.2, -0.58, { r: 0.06 });
  t.box(2.14, 0.5, 1.16, tone(armor, 0.8), 0, -0.4, 0, { r: 0.05 });
  for (const s of [-1, 1]) for (const y of [-0.3, -0.62]) t.box(0.5, 0.26, 0.1, tone(armor, 1.15), s * 0.3, y, 0.6, { r: 0.04 });
  shoulderPads(t, armor, heavy ? 0.66 : 0.58);
  for (const s of [-1, 1]) t.box(0.5, 0.05, 0.05, light, s * 0.45, 0.75, 0.72);
  t.cyl(0.14, 0.05, light, 0.5, 0.4, 0.71, { axis: 'z', seg: 12 });
  belt(t, 0x263238, 0x90a4ae, -0.88);
  for (const x of [-0.6, -0.3, 0.3, 0.6]) {
    t.cyl(0.1, 0.32, 0x37474f, x, -0.88, 0.66, { seg: 10 }); // energy cells
    t.cyl(0.105, 0.08, light, x, -0.8, 0.66, { seg: 10 });
  }
  if (level === 1 || level === 2) {
    // Recon Mission: a comms pack with an antenna
    pack(t, 0x3e4a2e, { w: 1.25, h: 1.25, d: 0.5 });
    antenna(t, -0.45, 0.6, -1.05, 1.4);
  }
  if (level >= 3) missilePod(t, heavy ? 0x212121 : 0x37474f, heavy ? 3 : 3, heavy ? 2 : 1);
  if (heavy) {
    // Death & Taxes: heavier plates with red lights
    for (const s of [-1, 1]) {
      t.box(0.12, 1.2, 0.12, light, s * 1.12, 0.1, 0.3);
      t.box(0.4, 0.4, 0.06, 0x37474f, s * 0.55, 0.5, 0.74, { r: 0.04 });
    }
    t.cyl(0.3, 0.14, 0x37474f, 0, 0.4, 0.74, { axis: 'z', seg: 16 });
    t.cyl(0.2, 0.05, light, 0, 0.4, 0.82, { axis: 'z', seg: 16 });
  }
  hd.done();
  t.done();
  hands(h, key, 0x212121, tone(shirt, 0.75), (a) => {
    a.box(1.1, 0.5, 0.3, armor, 0, -1.0, -0.55, { r: 0.08 }); // elbow pad
    a.box(1.08, 0.5, 1.08, tone(armor, 0.9), 0, -1.3, 0, { r: 0.06 }); // vambrace
    a.box(0.3, 0.05, 0.05, light, 0, -1.2, 0.56);
  });
  feet(h, key, 0x1a1a1a, (b) => {
    kneePad(b, armor);
    b.box(0.9, 0.6, 0.16, armor, 0, -1.3, 0.55, { r: 0.06 }); // shin guard
  });
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const len = heavy ? 2.8 : 2.4;
  const [y, z] = rifle(gk, { len, body: 0x263238, furn: 0x37474f, mag: false, optic: level >= 2 ? 'scope' : 'dot', lens: light, glow: light });
  // an energy cell where the magazine goes, and cooling fins
  gk.box(0.24, 0.5, 0.42, 0x37474f, 0, -0.6, UP - 0.42, { r: 0.04 });
  gk.box(0.25, 0.3, 0.08, light, 0, -0.6, UP - 0.48);
  for (let i = 0; i < 4; i++) gk.box(0.42, 0.05, 0.22, INK, 0, -1.0 - i * 0.12, UP + 0.02);
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = heavy ? 0xff1744 : 0x76ff03;
  h.tracerWidth = 0.18;
  return own(h);
}

export const MODELS = {
  snowballer: makeSnowballer,
  huntsman: makeHuntsman,
  archer: makeArcher,
  stunner: makeStunner,
  harpoonHunter: makeHarpoonHunter,
  gladiator: makeGladiator,
  eventCommando: makeEventCommando,
};
