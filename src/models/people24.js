// Tower models: people, batch 24 (dressed with the vehicle kit in ../vehicles.js).
// In here: Exterminator, Spiritual Advocate, Engineer (sentryEngineer), Void Traitor (traitor),
// Ice Apprentice (all wave-10 towers; the old builders are in newmodels/i.js).
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.

import * as THREE from 'three';
import { antenna, glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import {
  GOLD, GUNMETAL, INK, STEEL, UP, aimLong, band, belt, collar, dome, fist, goggles, hair, kneePad, muzzle, own,
  pack, pouch, wear,
} from './people1.js';
import { shoulderPads } from './people2.js';
import { feet, glassMat, hands, hood } from './people5.js';
import { hardHat, icicle } from './people6.js';
import { gasMask } from './people7.js';
import { cape, gauntlet } from './people18.js';
import { crystal, spinner } from './machines5.js';

const PI = Math.PI;
const ICE = 0x80d8ff;

// ------------------------------------------------------------------ shared bits for this batch

/** A glowing see-through material (wings, halos of light) that keeps its look when towers fade. */
export function glowGlass(h, color, op = 0.7) {
  const m = glowMat(h, color, 0.6);
  m.transparent = true;
  m.opacity = op;
  m.depthWrite = false;
  m.userData.keepOpacity = op;
  return m;
}

/** A feather outline: from the root (0, 0) out along angle a, `len` long and `w` wide, with a round tip. */
function featherPts(x0, y0, a, len, w) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const at = (u, v) => [x0 + c * u - s * v, y0 + s * u + c * v];
  return [at(0, -w * 0.35), at(len * 0.75, -w / 2), at(len * 0.93, -w * 0.3), at(len, 0), at(len * 0.93, w * 0.3), at(len * 0.75, w / 2), at(0, w * 0.35)];
}

/**
 * Feathered wings on the back (torso space): a bone along the top and a fan of long feathers
 * under it, with a row of short covert feathers over their roots. `mat` is the feather
 * material, `edge` the bone / covert colour. o.size scales them.
 */
export function featherWings(h, key, mat, edge, o = {}) {
  const sz = o.size ?? 1;
  for (const s of [-1, 1]) {
    const wg = new THREE.Group();
    wg.position.set(s * 0.45, 0.55, -0.72);
    wg.rotation.set(0.15, s * 0.45, 0);
    wg.scale.setScalar(sz);
    h.torso.add(wg);
    const k = wear(h, wg, `${key}:wing${s}`);
    const flat = (pts, z, col) => k.plan(pts.map(([x, y]) => [s * x, -y]), 0.06, col, 0, 0, z, { rx: PI / 2 });
    // long flight feathers fanning down from the bone
    const boneY = (x) => (x < 1.3 ? x * 0.96 : 1.25 + (x - 1.3) * 0.08);
    for (let i = 0; i < 6; i++) {
      const rx = 0.35 + i * 0.4;
      flat(featherPts(rx, boneY(rx), -1.3 + i * 0.15, 1.3 + i * 0.3, 0.42), -0.02 - i * 0.012, mat);
    }
    // the outer tip feathers sweep out and up
    flat(featherPts(2.4, 1.3, 0.3, 1.3, 0.38), -0.1, mat);
    flat(featherPts(2.3, 1.28, -0.25, 1.3, 0.38), -0.09, mat);
    // covert feathers over the roots
    for (let i = 0; i < 5; i++) {
      const rx = 0.3 + i * 0.48;
      flat(featherPts(rx, boneY(rx) + 0.05, -1.3 + i * 0.12, 0.75, 0.34), 0.05, edge);
    }
    // the bone along the top edge, with a joint
    k.tube([[0, 0, 0.02], [s * 1.3, 1.25, 0.06], [s * 2.5, 1.35, 0.02], [s * 3.1, 1.6, -0.02]], 0.07, edge, { seg: 12, sides: 6 });
    k.ball(0.12, edge, s * 1.3, 1.25, 0.06, { seg: 8, rows: 6 });
    k.done();
  }
}

/**
 * A straight sword (gun space, blade along -y, flat in y-z): a wrapped grip, a pommel, a guard
 * and a blade with a fuller and a pointed tip. `blade` is a colour or material; o.segs gives a
 * list of materials to stack along the blade instead (a glowing gradient). Returns the tip y.
 */
export function sword(k, bl, bw, blade, o = {}) {
  const metal = o.metal ?? 0x78909c;
  k.cyl(0.12, 0.6, o.grip ?? 0x263238, 0, 0.05, 0, { seg: 8 });
  for (let i = 0; i < 3; i++) k.torus(0.12, 0.022, INK, 0, 0.22 - i * 0.17, 0, { rx: PI / 2, seg: 8 });
  k.ball(0.17, metal, 0, 0.42, 0, { seg: 10, rows: 7 }); // pommel
  const gw = o.guard ?? 1.0;
  k.box(0.2, 0.16, gw, metal, 0, -0.33, 0, { r: 0.05 }); // guard
  for (const s of [-1, 1]) k.cyl(0.07, 0.25, metal, 0, -0.38, s * (gw / 2 + 0.06), { seg: 6, r2: 0.12, rx: s * 0.5 });
  k.cyl(0.1, 0.06, o.gem ?? 0x1e88e5, 0.1, -0.33, 0, { axis: 'x', seg: 10 });
  const body = bl * 0.84;
  const tipL = bl - body;
  const y0 = -0.42;
  if (o.segs) {
    const seg = body / o.segs.length;
    o.segs.forEach((m, i) => k.box(0.1, seg, bw, m, 0, y0 - seg * (i + 0.5), 0));
    k.slab(0.1, tipL, bw, o.segs[o.segs.length - 1], 0, y0 - body - tipL / 2, 0, { bd: 0.06 });
  } else {
    k.box(0.1, body, bw, blade, 0, y0 - body / 2, 0);
    k.slab(0.1, tipL, bw, blade, 0, y0 - body - tipL / 2, 0, { bd: 0.06 });
    for (const s of [-1, 1]) k.box(0.02, body * 0.85, bw * 0.22, tone(typeof blade === 'number' ? blade : 0x90a4ae, 0.75), s * 0.055, y0 - body * 0.45, 0); // fuller
    for (const s of [-1, 1]) k.box(0.11, body, 0.04, o.edge ?? 0xeceff1, 0, y0 - body / 2, s * (bw / 2 - 0.01)); // bright edges
  }
  return y0 - bl;
}

// ------------------------------------------------------------------ Exterminator

/** A tall gas canister (torso space, on the back): domed ends, bands, a glowing gauge window, a valve. */
function canister(k, x, y, z, r, hh, col, glow) {
  k.cyl(r, hh, col, x, y, z, { seg: 16 });
  for (const s of [-1, 1]) k.ball(r, col, x, y + (s * hh) / 2, z, { sy: 0.4, seg: 16, rows: 5 });
  for (const dy of [-0.32, 0.32]) k.cyl(r + 0.025, 0.09, INK, x, y + dy * hh, z, { seg: 16 });
  k.box(0.22, hh * 0.6, 0.05, INK, x, y, z - r + 0.02, { r: 0.02 }); // gauge frame
  k.box(0.12, hh * 0.52, 0.04, glow, x, y, z - r - 0.02);
  k.box(0.2, 0.14, 0.03, 0xffd600, x, y + hh * 0.42, z - r + 0.03); // warning label
  k.cyl(0.08, 0.22, STEEL, x, y + hh / 2 + r * 0.4 + 0.08, z, { seg: 8 });
  k.torus(0.12, 0.025, 0xc62828, x, y + hh / 2 + r * 0.4 + 0.2, z, { rx: PI / 2, seg: 10 }); // valve wheel
}

/** The futuristic bug gun (gun space). Bigger and with more glowing rings each level. Returns the tip y. */
function bugGun(k, lv, body, glow, tank) {
  const len = [1.6, 1.7, 1.9, 2.2][lv];
  const U = UP;
  const cr = lv >= 2 ? 0.34 : 0.28;
  k.box(0.22, 0.26, 0.5, INK, 0, 0.1, U - 0.36, { rx: -0.3, r: 0.04 }); // grip
  k.torus(0.1, 0.022, INK, 0, -0.14, U - 0.24, { ry: PI / 2, seg: 10, arc: PI });
  k.box(0.4, 0.95, 0.46, body, 0, -0.2, U + 0.04, { r: 0.1 }); // receiver
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) k.box(0.03, 0.06, 0.26, INK, s * 0.21, -0.05 - i * 0.14, U + 0.06); // vents
  k.slab(0.3, 0.55, 0.4, tone(body, 0.8), 0, 0.5, U - 0.02, { td: 1.3, r: 0.04 }); // stock
  k.box(0.32, 0.08, 0.5, INK, 0, 0.8, U - 0.02);
  // the chamber: a fat round tank of bug spray with glowing rings round it
  k.cyl(cr, 0.75, 0x37474f, 0, -0.95, U + 0.05, { seg: 16 });
  for (let i = 0; i <= lv; i++) k.cyl(cr + 0.025, 0.06, glow, 0, -0.68 - i * 0.15, U + 0.05, { seg: 16 });
  // barrel, emitter and three prongs round the tip
  const bl = len - 1.32;
  k.cyl(0.11, bl, STEEL, 0, -1.32 - bl / 2, U + 0.05, { seg: 12 });
  k.cyl(0.14, 0.26, INK, 0, -len + 0.13, U + 0.05, { seg: 12, r2: 0.18 });
  k.cyl(0.12, 0.04, glow, 0, -len - 0.01, U + 0.05, { seg: 12 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    k.box(0.05, 0.36, 0.05, GUNMETAL, Math.sin(a) * 0.2, -len - 0.05, U + 0.05 + Math.cos(a) * 0.2);
  }
  // a top sight with a glowing lens and a power cell on the side
  k.box(0.16, 0.42, 0.18, INK, 0, -0.3, U + 0.35, { r: 0.03 });
  k.cyl(0.06, 0.02, glow, 0, -0.52, U + 0.38, { seg: 10 });
  k.box(0.14, 0.4, 0.26, tank, 0.26, -0.3, U - 0.04, { r: 0.04 });
  k.box(0.04, 0.3, 0.12, glow, 0.34, -0.3, U - 0.04);
  if (lv >= 3) {
    k.cyl(0.32, 0.3, tank, 0, -0.55, U - 0.5, { axis: 'x', seg: 16 }); // drum under the gun
    k.cyl(0.2, 0.32, glow, 0, -0.55, U - 0.5, { axis: 'x', seg: 12 });
  }
  return -len - 0.05;
}

/**
 * Exterminator (0-4): a dark blue and black outfit, a purple bandana, a canister on the back and a
 * futuristic bug gun. Lv 1 gloves and goggles; Lv 2 a second canister, shoulder pads and a bigger
 * gun; Lv 3 a respirator helmet, armor and an even bigger gun with a drum; Lv 4 red, with a huge
 * cannon on a fixed tripod.
 */
export function makeExterminator(level) {
  const lv = Math.min(level, 4);
  const redS = lv >= 4;
  const shirt = redS ? 0xb71c1c : 0x1a237e;
  const h = makeHumanoid({ skin: 0xd9a066, shirt, pants: redS ? 0x3e0000 : 0x111111, arms: redS ? 0x7f0000 : 0x0d1440, face: 'soldier' });
  const key = `p24ext${lv}`;
  const glowC = redS ? 0xff1744 : 0x76ff03;
  const glow = glowMat(h, glowC);
  const bandC = redS ? 0x4a148c : 0x8e24aa;
  const armor = redS ? 0x7f0000 : 0x263238;
  const tank = redS ? 0x212121 : 0x455a64;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (lv >= 3) {
    // a respirator helmet: a round shell, a brow light, ear plates and a gas mask
    dome(hd, 0.78, 0.62, armor, 0, 0.9, 0, { seg: 18 });
    hd.torus(0.77, 0.05, tone(armor, 0.7), 0, 0.92, 0, { rx: PI / 2, seg: 20 });
    hd.box(0.14, 0.2, 1.3, tone(armor, 0.8), 0, 1.47, -0.05, { r: 0.05 }); // ridge
    for (const s of [-1, 1]) hd.box(0.14, 0.5, 0.55, tone(armor, 0.85), s * 0.72, 0.75, -0.05, { r: 0.05 });
    hd.box(0.5, 0.08, 0.06, glow, 0, 1.2, 0.76);
    gasMask(hd, 0x37474f, glow);
    hd.tube([[0.25, 0.25, 0.85], [0.6, 0.0, 0.6], [0.75, -0.3, 0.1]], 0.05, INK, { seg: 8, sides: 5 }); // hose to the tank
  } else {
    // bandana: a tied cap and a mask over the nose and mouth
    dome(hd, 0.69, 0.46, bandC, 0, 0.95, 0, { seg: 16 });
    hd.torus(0.68, 0.04, tone(bandC, 0.8), 0, 0.96, 0, { rx: PI / 2, seg: 20 });
    hd.box(0.22, 0.2, 0.18, tone(bandC, 0.85), 0, 1.0, -0.7, { r: 0.05 }); // knot
    for (const s of [-1, 1]) hd.box(0.14, 0.5, 0.05, bandC, s * 0.12, 0.72, -0.74, { rz: s * 0.25 });
    band(hd, 0.64, 0.05, 0.42, 2.6, bandC, 0.36);
    hd.box(0.08, 0.3, 0.05, tone(bandC, 0.7), 0, 0.32, 0.68); // fold
    if (lv >= 1) goggles(hd, 0.86, glow, { r: 0.68 });
  }
  // tactical suit: collar zip, chest straps, a belt with pouches
  collar(t, tone(shirt, 0.8), { buttons: false });
  t.box(0.05, 1.5, 0.05, INK, 0, 0.1, 0.53); // zip
  for (const s of [-1, 1]) t.box(0.22, 1.9, 0.06, INK, s * 0.55, 0.1, 0.53);
  t.box(1.3, 0.16, 0.06, INK, 0, 0.35, 0.55);
  belt(t, 0x212121, 0x9e9e9e);
  for (const x of [-0.7, 0.7]) pouch(t, x, -1.05, 0.52, 0.38, 0.4, 0x263238, 0.2);
  pouch(t, 0.0, -1.08, 0.52, 0.3, 0.32, 0x263238, 0.2);
  t.box(0.36, 0.24, 0.03, glow, -0.5, 0.65, 0.57); // badge
  t.box(0.24, 0.12, 0.02, INK, -0.5, 0.65, 0.59);
  // canister(s) on a back frame, with a hose round to the gun hand
  t.box(1.8, 1.6, 0.12, INK, 0, 0.0, -0.58, { r: 0.04 });
  for (const s of [-1, 1]) t.box(0.24, 0.1, 1.2, INK, s * 0.55, 1.0, -0.05);
  const xs = lv >= 2 ? [-0.45, 0.45] : [0];
  for (const x of xs) canister(t, x, 0.05, -0.98, 0.34, 1.5, tank, glow);
  t.box(xs.length > 1 ? 1.3 : 0.6, 0.14, 0.14, STEEL, 0, -0.75, -0.98); // manifold
  t.tube([[xs[0], -0.85, -0.98], [-1.0, -1.0, -0.5], [-1.2, -0.6, 0.2]], 0.07, 0x212121, { seg: 12, sides: 6 });
  if (lv >= 2) {
    for (const s of [-1, 1]) {
      t.box(0.95, 0.5, 1.3, armor, s * 1.4, 0.98, 0, { r: 0.12 }); // shoulder pads
      t.box(0.97, 0.08, 1.32, glow, s * 1.4, 0.82, 0);
      for (const dz of [-0.35, 0.35]) t.cyl(0.04, 0.03, INK, s * 1.4, 1.24, dz, { seg: 6 });
    }
  }
  if (lv >= 3) {
    // armor: a breastplate with a glowing core, panel lines and side plates
    t.box(2.22, 1.5, 1.22, armor, 0, 0.25, 0, { r: 0.14 });
    t.box(1.4, 0.04, 0.04, INK, 0, 0.0, 0.62);
    for (const s of [-1, 1]) t.box(0.04, 0.9, 0.04, INK, s * 0.6, 0.35, 0.62);
    t.cyl(0.26, 0.08, INK, 0, 0.45, 0.62, { axis: 'z', seg: 16 });
    t.cyl(0.18, 0.06, glow, 0, 0.45, 0.67, { axis: 'z', seg: 16 });
    for (const s of [-1, 1]) t.box(0.3, 0.06, 0.03, glow, s * 0.75, 0.75, 0.62);
  }
  hd.done();
  t.done();
  hands(h, key, lv >= 1 ? 0x111111 : null, INK, (a) => {
    if (lv >= 2) a.box(1.1, 0.5, 1.1, armor, 0, -1.2, 0, { r: 0.08 }); // forearm guard
    if (lv >= 2) a.box(1.12, 0.06, 1.12, glow, 0, -1.0, 0);
  });
  feet(h, key, 0x212121, (b) => {
    if (lv >= 1) kneePad(b, armor);
    b.box(1.06, 0.08, 1.08, glow, 0, -1.38, 0.02);
  });
  h.muzzles = [];
  if (!redS) {
    const g = fist(h.rightArm, -1.9, 1.2);
    const gk = wear(h, g, `${key}:gun`);
    const tip = bugGun(gk, lv, 0x263238, glow, tank);
    gk.done();
    muzzle(h, g, tip, UP + 0.05);
    aimLong(h);
  } else {
    // Spooky Destruction: a huge cannon on a fixed tripod, gripped with both hands
    const k = wear(h, h.root, `${key}:cannon`);
    const red = 0x7f0000;
    const blk = 0x151515;
    k.cyl(1.3, 0.2, 0x212121, 0, 0.1, 2.4, { seg: 24 }); // base plate
    k.cyl(1.0, 0.1, 0x333333, 0, 0.25, 2.4, { seg: 24 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2 + PI / 6;
      k.tube([[0, 1.6, 2.4], [Math.sin(a) * 1.15, 0.3, 2.4 + Math.cos(a) * 1.15]], 0.09, blk, { seg: 2, sides: 6 });
    }
    k.cyl(0.32, 2.2, blk, 0, 1.4, 2.4, { seg: 14 }); // post
    k.cyl(0.5, 0.35, 0x37474f, 0, 2.55, 2.6, { seg: 16 }); // turntable
    // body: a rounded red housing with glowing stripes, vents and side tanks
    k.box(1.8, 1.4, 3.2, red, 0, 3.1, 3.0, { r: 0.22 });
    for (const s of [-1, 1]) {
      k.box(0.06, 0.24, 2.8, glow, s * 0.92, 3.25, 3.0);
      for (let i = 0; i < 4; i++) k.box(0.05, 0.6, 0.1, INK, s * 0.91, 2.85, 2.0 + i * 0.25);
      k.cyl(0.42, 1.5, tank, s * 1.25, 3.0, 2.6, { axis: 'z', seg: 16 }); // side tanks
      for (const dz of [-0.4, 0.4]) k.cyl(0.45, 0.08, INK, s * 1.25, 3.0, 2.6 + dz, { axis: 'z', seg: 16 });
      k.box(0.06, 0.2, 0.9, glow, s * 1.66, 3.0, 2.6);
      // handles back to the hands
      k.tube([[s * 0.6, 3.1, 1.5], [s * 0.6, 3.25, 1.0], [s * 0.6, 3.1, 1.25]], 0.06, blk, { seg: 6, sides: 5 });
      k.cyl(0.13, 0.65, 0x212121, s * 0.6, 3.3, 1.35, { seg: 10 }); // grips
      for (let i = 0; i < 3; i++) k.torus(0.13, 0.025, INK, s * 0.6, 3.1 + i * 0.2, 1.35, { rx: PI / 2, seg: 10 });
    }
    k.box(1.0, 0.1, 0.35, blk, 0, 3.0, 1.4); // crossbar
    k.box(0.36, 0.4, 0.9, INK, 0, 4.0, 2.8, { r: 0.06 }); // sight
    k.cyl(0.12, 0.03, glow, 0, 4.05, 3.26, { axis: 'z', seg: 12 });
    // the barrel: a fat shroud, cooling rings, a flared muzzle with a glowing core
    k.cyl(0.55, 2.8, blk, 0, 3.1, 5.9, { axis: 'z', seg: 20 });
    for (const z of [5.0, 5.7, 6.4]) {
      k.cyl(0.68, 0.18, glow, 0, 3.1, z, { axis: 'z', seg: 20 });
      k.cyl(0.64, 0.3, INK, 0, 3.1, z + 0.22, { axis: 'z', seg: 20 });
    }
    k.cyl(0.6, 0.4, blk, 0, 3.1, 7.3, { axis: 'z', seg: 20, r2: 0.82 });
    k.torus(0.72, 0.06, red, 0, 3.1, 7.5, { seg: 20 });
    k.cyl(0.4, 0.06, glow, 0, 3.1, 7.48, { axis: 'z', seg: 18 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      k.box(0.1, 0.1, 0.5, red, Math.cos(a) * 0.62, 3.1 + Math.sin(a) * 0.62, 6.95);
    }
    k.tube([[0.45, 2.4, 2.4], [0.9, 1.6, 1.0], [0.6, 1.8, -0.6]], 0.08, 0x212121, { seg: 10, sides: 6 }); // feed hose to the back tanks
    k.done();
    muzzle(h, h.root, 3.1, 7.55);
    h.rightArm.rotation.set(-PI / 2, 0, 0.3);
    h.leftArm.rotation.set(-PI / 2, 0, -0.3);
    h.pose = { right: -PI / 2, left: -PI / 2, leftRecoil: 0.3 };
    h.recoilScale = 0.3;
  }
  h.tracer = glowC;
  h.tracerWidth = 0.3 + lv * 0.06;
  return own(h);
}

// ------------------------------------------------------------------ Spiritual Advocate

/**
 * Spiritual Advocate (0-4): pale white skin, glowing blue eyes, a grey spiky crown with blue tips,
 * a grey jacket, blue pants and blue arm bands, and a sword. Lv 1 a blue sash; Lv 2 antlers, white
 * robes and a wider sword; Lv 3 plate armor; Lv 4 shoulder pads, ice-blue feathered wings, a
 * turning halo and a turquoise-to-white glowing blade.
 */
export function makeSpiritAdvocate(level) {
  const lv = Math.min(level, 4);
  const h = makeHumanoid({ skin: 0xf4f4f4, shirt: 0x757575, pants: 0x1e88e5, arms: 0x757575, face: 'none' });
  const key = `p24spirit${lv}`;
  const eye = glowMat(h, 0x40c4ff);
  const blueG = glowMat(h, 0x2979ff);
  const ice = glowMat(h, ICE);
  const grey = 0x9e9e9e;
  const plate = 0xb0bec5;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // glowing eyes
  for (const x of [-0.25, 0.25]) hd.box(0.22, 0.12, 0.06, eye, x, 0.7, 0.6, { ry: x * 0.6 });
  hair(hd, 0xb0bec5, { h: 0.36 });
  // spiky crown: a band with spikes and glowing blue tips
  hd.cyl(0.74, 0.28, grey, 0, 1.15, 0, { seg: 20 });
  hd.torus(0.74, 0.04, tone(grey, 0.7), 0, 1.02, 0, { rx: PI / 2, seg: 20 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    const x = Math.sin(a) * 0.66;
    const z = Math.cos(a) * 0.66;
    const tall = i % 2 ? 0.36 : 0.5;
    hd.cyl(0.11, tall, grey, x, 1.29 + tall / 2, z, { seg: 5, r2: 0.04 });
    hd.cyl(0.045, 0.2, blueG, x, 1.29 + tall + 0.08, z, { seg: 5, r2: 0.001 });
  }
  hd.cyl(0.09, 0.06, blueG, 0, 1.15, 0.75, { axis: 'z', seg: 10 }); // front gem
  if (lv >= 2) {
    // antlers: two branching horns
    const antler = 0xd7ccc8;
    for (const s of [-1, 1]) {
      hd.tube([[s * 0.5, 1.3, 0], [s * 0.75, 1.9, 0], [s * 1.2, 2.4, -0.1], [s * 1.35, 2.85, -0.15]], 0.07, antler, { seg: 12, sides: 6 });
      hd.tube([[s * 0.75, 1.9, 0], [s * 0.8, 2.4, 0.15], [s * 0.7, 2.75, 0.2]], 0.055, antler, { seg: 8, sides: 6 });
      hd.tube([[s * 1.2, 2.4, -0.1], [s * 1.6, 2.5, -0.1]], 0.05, antler, { seg: 4, sides: 6 });
    }
  }
  // grey jacket with lapels, buttons and blue piping
  for (const s of [-1, 1]) t.box(0.4, 1.8, 0.08, 0x616161, s * 0.45, 0.05, 0.52, { rz: s * 0.08 });
  for (let i = 0; i < 3; i++) t.cyl(0.05, 0.04, 0xcfd8dc, 0.12, 0.4 - i * 0.4, 0.54, { axis: 'z', seg: 8 });
  t.box(2.08, 0.24, 1.08, 0x424242, 0, -0.85, 0, { r: 0.04 });
  t.box(0.3, 0.26, 0.06, 0x1e88e5, 0, -0.85, 0.55, { r: 0.02 });
  t.box(2.1, 0.32, 1.12, tone(0x757575, 0.85), 0, 0.88, -0.02, { r: 0.1 }); // high collar
  if (lv >= 1) {
    // blue sash from the left shoulder to the right hip, with a clasp
    t.box(0.32, 2.5, 1.14, 0x1565c0, 0, 0, 0, { rz: 0.6 });
    t.cyl(0.13, 0.06, blueG, 0.35, 0.5, 0.6, { axis: 'z', seg: 10 });
  }
  if (lv >= 2) {
    // white robes falling from the waist, a blue panel down the front
    t.slab(2.14, 1.9, 1.14, 0xe0e0e0, 0, -1.9, 0, { bw: 1.2, bd: 1.15, tw: 1, td: 1 });
    t.box(0.42, 1.9, 0.08, 0x1e88e5, 0, -1.9, 0.66, { rx: -0.06 });
    t.box(2.6, 0.08, 1.35, 0x90caf9, 0, -2.82, 0, { r: 0.02 });
  }
  if (lv >= 3) {
    // a breastplate with a glowing gem
    t.box(2.2, 1.5, 1.2, plate, 0, 0.25, 0, { r: 0.16 });
    t.box(1.4, 0.05, 0.04, tone(plate, 0.7), 0, -0.1, 0.61);
    t.cyl(0.24, 0.08, 0x78909c, 0, 0.45, 0.6, { axis: 'z', seg: 6 });
    t.cyl(0.16, 0.06, ice, 0, 0.45, 0.65, { axis: 'z', seg: 6 });
  }
  if (lv >= 4) {
    // shoulder pads with ice trim
    for (const s of [-1, 1]) {
      dome(t, 0.62, 0.48, 0xcfd8dc, s * 1.42, 0.86, 0, { seg: 14 });
      t.torus(0.6, 0.05, ice, s * 1.42, 0.88, 0, { rx: PI / 2, seg: 16 });
      t.cyl(0.08, 0.5, ice, s * 1.6, 1.4, 0, { seg: 6, r2: 0.01, rz: s * -0.4 });
    }
  }
  hd.done();
  t.done();
  if (lv >= 4) {
    featherWings(h, key, glowGlass(h, 0xb3e5fc, 0.7), 0xe1f5fe, { size: 0.95 });
    // a halo that turns slowly over the crown
    const sp = spinner(h, h.head, 0, 2.25, 0);
    const hk = wear(h, sp, `${key}:halo`);
    hk.torus(0.75, 0.07, glowMat(h, 0xe0f7fa), 0, 0, 0, { rx: PI / 2, seg: 28 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      hk.cyl(0.07, 0.25, ice, Math.cos(a) * 0.75, 0.1, Math.sin(a) * 0.75, { seg: 5, r2: 0.001 });
    }
    hk.done();
    h.idleSpin = 0.8;
  }
  hands(h, key, lv >= 3 ? null : 0xeceff1, 0x1e88e5, (a) => {
    a.box(1.1, 0.25, 1.1, 0x1e88e5, 0, -0.55, 0, { r: 0.04 }); // arm band
    if (lv >= 3) gauntlet(a, plate, 0x1e88e5);
  });
  feet(h, key, lv >= 3 ? 0x90a4ae : 0x37474f, (b) => {
    if (lv >= 3) {
      b.box(1.08, 0.7, 0.2, plate, 0, -1.1, 0.5, { r: 0.06 }); // greave
      b.box(0.86, 0.38, 0.22, 0x78909c, 0, -0.85, 0.54, { r: 0.08 });
    }
  });
  // the sword
  const g = fist(h.rightArm, -1.9, 1);
  const sk = wear(h, g, `${key}:sword`);
  const bl = [2.0, 2.2, 2.7, 2.9, 3.4][lv];
  const bw = lv >= 2 ? 0.45 : 0.32;
  const segs = lv >= 4 ? [0x1de9b6, 0x64ffda, 0xa7ffeb, 0xe0f7fa, 0xffffff].map((c) => glowMat(h, c)) : null;
  const tip = sword(sk, bl, bw, 0xcfd8dc, { segs, guard: 1.0 + lv * 0.08, metal: lv >= 4 ? 0xb3e5fc : 0x78909c, gem: 0x2979ff });
  sk.done();
  h.muzzles = [];
  muzzle(h, g, tip, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  h.leftArm.rotation.set(-0.4, 0, -0.25);
  h.pose = { right: -2.4, left: -0.4, leftRecoil: 0 };
  h.swing = 1.9;
  h.melee = true;
  h.tracer = lv >= 4 ? 0x64ffda : 0x40c4ff;
  return own(h, 0);
}

// ------------------------------------------------------------------ Engineer (sentryEngineer)

/** An open-end wrench (gun space, along -y). */
function wrench(k, col = 0x9e9e9e) {
  k.box(0.14, 1.0, 0.24, col, 0, -0.35, 0, { r: 0.04 });
  k.box(0.16, 0.5, 0.18, tone(col, 0.7), 0, -0.1, 0, { r: 0.04 }); // grip
  k.torus(0.2, 0.08, col, 0, -0.95, 0, { ry: PI / 2, rz: PI / 2, seg: 12, arc: PI * 1.4 }); // jaw
  k.cyl(0.14, 0.14, col, 0, 0.18, 0, { axis: 'x', seg: 10 }); // ring end
}

/** A nailgun (gun space): housing, nose, a slanted nail strip, an air fitting. Returns the tip y. */
function nailgun(k, body, shell, glow) {
  const U = UP;
  k.box(0.22, 0.26, 0.5, INK, 0, 0.1, U - 0.34, { rx: -0.3, r: 0.04 }); // grip
  k.torus(0.1, 0.022, INK, 0, -0.14, U - 0.22, { ry: PI / 2, seg: 10, arc: PI });
  k.box(0.5, 0.95, 0.7, shell, 0, -0.38, U + 0.12, { r: 0.14 }); // housing
  k.box(0.52, 0.5, 0.05, INK, 0, -0.38, U + 0.48); // top cap
  k.cyl(0.18, 0.3, body, 0, 0.18, U + 0.12, { seg: 12 }); // back cap
  k.cyl(0.07, 0.25, STEEL, 0, 0.42, U + 0.02, { seg: 8 }); // air fitting
  k.cyl(0.12, 0.45, body, 0, -1.05, U + 0.05, { seg: 12, r2: 0.16 }); // nose
  k.box(0.2, 0.1, 0.3, INK, 0, -1.3, U + 0.05, { r: 0.03 }); // safety tip
  // the nail strip, slanted back under the nose, nail heads showing
  k.box(0.18, 0.95, 0.24, 0x616161, 0, -0.75, U - 0.3, { rx: 0.5, r: 0.03 });
  for (let i = 0; i < 6; i++) k.box(0.22, 0.04, 0.04, 0xbdbdbd, 0, -0.42 - i * 0.12, U - 0.12 - i * 0.065);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) k.cyl(0.03, 0.03, INK, s * 0.26, -0.1 - i * 0.25, U + 0.12, { axis: 'x', seg: 6 }); // screws
  if (glow) {
    for (const s of [-1, 1]) k.box(0.04, 0.6, 0.1, glow, s * 0.26, -0.4, U + 0.3);
    k.cyl(0.13, 0.04, glow, 0, -1.29, U + 0.05, { seg: 10 });
  }
  return -1.38;
}

/**
 * Engineer (sentryEngineer, 0-4): a worker in a light blue shirt, denim overalls, a black belt
 * with a gold buckle and an orange hard hat, with a nailgun and a wrench. Lv 1 welding goggles,
 * gloves and knee pads; Lv 2 an orange suit; Lv 3 a tool pack with a radio, belt pouches; Lv 4 a
 * dark red suit with neon red lines, a military backpack and a futuristic vest.
 */
export function makeSentryEngineer(level) {
  const lv = Math.min(level, 4);
  const red = lv >= 4;
  const orange = lv >= 2 && !red;
  const shirt = red ? 0x5d0f0f : orange ? 0xef6c00 : 0x81d4fa;
  const pants = red ? 0x3b0a0a : orange ? 0xe65100 : 0x1565c0;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants, arms: shirt, face: 'soldier' });
  const key = `p24eng${lv}`;
  const neon = glowMat(h, 0xff1744);
  const lamp = glowMat(h, red ? 0xff1744 : 0xfff3b0);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x5d4037, { h: 0.38 });
  hardHat(hd, red ? 0x212121 : 0xff9800, lamp);
  if (red) {
    band(hd, 0.79, 0.04, 0.08, 1.8, neon, 1.0); // neon strip round the hat
    for (const s of [-1, 1]) hd.box(0.06, 0.06, 0.5, neon, s * 0.12, 1.5, 0.2);
  }
  if (lv >= 1) {
    // welding goggles pushed up on the hat brim
    goggles(hd, 0.98, red ? neon : glowMat(h, 0x26c6da), { r: 0.78, frame: 0x212121 });
  }
  if (lv < 2) {
    // denim overalls: a bib with a pocket, straps with buttons
    collar(t, tone(shirt, 0.85), { buttons: false });
    t.box(1.5, 1.15, 0.08, 0x1565c0, 0, -0.28, 0.52, { r: 0.03 });
    t.box(0.6, 0.42, 0.05, 0x0d47a1, 0, -0.15, 0.57, { r: 0.02 });
    t.box(0.6, 0.04, 0.06, 0xffc107, 0, 0.06, 0.6); // pocket stitch
    t.cyl(0.035, 0.4, 0xd32f2f, 0.15, -0.05, 0.62, { seg: 6 }); // pencil
    for (const s of [-1, 1]) {
      t.box(0.25, 1.1, 0.06, 0x1565c0, s * 0.6, 0.48, 0.53);
      t.box(0.25, 1.4, 0.06, 0x1565c0, s * 0.6, 0.3, -0.53);
      t.cyl(0.07, 0.04, GOLD, s * 0.6, 0.25, 0.58, { axis: 'z', seg: 8 });
    }
  } else {
    // a coverall: zip, reflective bands, a name patch and chest pocket
    collar(t, tone(shirt, 0.8), { buttons: false });
    t.box(0.05, 1.7, 0.05, INK, 0, 0.0, 0.53);
    if (!red) {
      for (const y of [0.25]) t.box(2.06, 0.14, 1.06, 0xe0e0e0, 0, y, 0);
      t.box(0.42, 0.2, 0.04, 0xfafafa, 0.5, 0.55, 0.52);
    }
    pouch(t, -0.5, 0.55, 0.5, 0.42, 0.36, tone(shirt, 0.85), 0.06);
  }
  belt(t, 0x111111, GOLD);
  t.box(0.2, 0.12, 0.05, 0xffe082, 0, -0.84, 0.6); // buckle shine
  // tools on the belt: tape measure and a hammer loop
  t.cyl(0.16, 0.12, 0xfdd835, 0.75, -1.05, 0.5, { axis: 'z', seg: 12 });
  t.cyl(0.05, 0.6, 0x8d6e63, -0.95, -1.15, 0.45, { seg: 6 });
  t.box(0.32, 0.12, 0.12, STEEL, -0.95, -0.85, 0.45, { r: 0.03 });
  if (lv >= 3) {
    // tool pack (or a military backpack at Lv 4) with a radio and its glowing antenna tip
    pack(t, red ? 0x4b5320 : 0x795548, { w: 1.5, h: 1.6, d: 0.7, roll: red ? 0x3e4a1e : null });
    if (!red) {
      t.cyl(0.05, 0.9, 0x8d6e63, 0.45, 1.05, -0.95, { seg: 6 }); // hammer handle sticking out
      t.box(0.4, 0.14, 0.14, STEEL, 0.45, 1.5, -0.95, { r: 0.03 });
      t.box(0.1, 0.7, 0.2, 0x9e9e9e, 0.15, 1.0, -1.0, { rz: 0.2 }); // wrench
    }
    t.box(0.42, 0.6, 0.26, 0x424242, -0.55, 0.3, -1.4, { r: 0.04 }); // radio
    t.box(0.3, 0.14, 0.03, red ? neon : glowMat(h, 0x76ff03), -0.55, 0.42, -1.54);
    antenna(t, -0.55, 0.6, -1.4, 1.9);
    t.ball(0.1, red ? neon : glowMat(h, 0x76ff03), -0.55, 2.55, -1.4, { seg: 8, rows: 6 });
    for (const x of [-0.75, 0.75]) pouch(t, x, -1.05, 0.5, 0.36, 0.4, 0x6d4c41, 0.2);
  }
  if (red) {
    // futuristic vest: dark plates with neon lines, shoulder plates
    t.box(2.2, 1.55, 1.2, 0x263238, 0, 0.22, 0, { r: 0.14 });
    for (const x of [-0.5, 0.5]) t.box(0.08, 1.2, 0.05, neon, x, 0.2, 0.61);
    t.box(1.2, 0.08, 0.05, neon, 0, 0.75, 0.61);
    t.cyl(0.18, 0.06, 0x111111, 0, 0.3, 0.61, { axis: 'z', seg: 6 });
    t.cyl(0.11, 0.06, neon, 0, 0.3, 0.64, { axis: 'z', seg: 6 });
    shoulderPads(t, 0x263238, 0.58);
    for (const s of [-1, 1]) t.box(0.5, 0.05, 0.05, neon, s * 1.45, 1.1, 0.5);
  }
  hd.done();
  t.done();
  hands(h, key, lv >= 1 ? 0x5d4037 : null, tone(shirt, 0.8), (a) => {
    if (red) a.box(1.1, 0.08, 1.1, neon, 0, -1.2, 0);
  });
  feet(h, key, red ? 0x1a1a1a : 0x6d4c41, (b) => {
    if (lv >= 1) kneePad(b, 0x37474f);
    if (red) b.box(1.08, 0.08, 1.1, neon, 0, -0.5, 0.02);
    if (lv < 2) b.box(1.1, 0.16, 1.1, 0x0d47a1, 0, -1.3, 0.02, { r: 0.03 }); // rolled-up jeans
  });
  // wrench in the left hand, nailgun in the right
  const w = fist(h.leftArm, -1.9, 0.9);
  const wk = wear(h, w, `${key}:wrench`);
  wrench(wk, red ? 0x616161 : 0x9e9e9e);
  wk.done();
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const tip = nailgun(gk, red ? 0x212121 : 0x424242, red ? 0x7f0000 : 0xff9800, red ? neon : null);
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tip, UP + 0.05);
  aimLong(h);
  h.tracer = red ? 0xff1744 : 0xbdbdbd;
  return own(h);
}

// ------------------------------------------------------------------ Void Traitor (traitor)

/** A tiny green toy soldier stuck in the void (its own kit, shared by every one of them). */
function miniSoldier(h, parent, x, y, z, s, rx = 0, rz = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.set(rx, 0, rz);
  g.scale.setScalar(s);
  parent.add(g);
  const k = wear(h, g, 'p24:mini');
  const green = 0x558b2f;
  for (const sx of [-0.15, 0.15]) {
    k.box(0.25, 0.6, 0.25, green, sx, 0.3, 0, { r: 0.04 });
    k.box(0.26, 0.12, 0.32, 0x33691e, sx, 0.05, 0.03, { r: 0.03 });
  }
  k.box(0.6, 0.6, 0.36, green, 0, 0.9, 0, { r: 0.06 });
  k.box(0.62, 0.08, 0.38, 0x3e2723, 0, 0.66, 0);
  for (const sx of [-0.4, 0.4]) k.box(0.18, 0.55, 0.2, green, sx, 0.9, 0.05, { r: 0.04 });
  k.ball(0.17, 0xe0ac69, 0, 1.36, 0, { seg: 10, rows: 7 });
  dome(k, 0.21, 0.16, 0x33691e, 0, 1.4, 0, { seg: 12 });
  k.cyl(0.04, 0.6, 0x212121, 0.4, 0.75, 0.3, { axis: 'z', seg: 6 }); // tiny rifle
  k.done();
  return g;
}

/** A curved scimitar (gun space): its blade is a side profile, flat in y-z. Returns the tip y. */
function scimitar(k, blade, hilt) {
  k.cyl(0.12, 0.55, 0x111111, 0, 0.05, 0, { seg: 8 });
  k.ball(0.15, hilt, 0, 0.38, 0, { seg: 8, rows: 6 });
  k.box(0.18, 0.15, 0.9, hilt, 0, -0.32, 0, { r: 0.05 });
  for (const s of [-1, 1]) k.ball(0.09, hilt, 0, -0.32, s * 0.48, { seg: 8, rows: 6 });
  const pts = [[-0.18, -0.38], [0.2, -0.38], [0.26, -1.4], [0.45, -2.2], [0.82, -2.95], [0.32, -2.55], [0.02, -1.9], [-0.18, -1.2]];
  k.prism(pts, 0.1, blade, 0, 0, 0);
  k.tube([[0, -0.4, -0.16], [0, -1.3, -0.15], [0, -2.0, 0.08], [0, -2.5, 0.35]], 0.035, tone(0x9e9e9e, 0.6), { seg: 12, sides: 4 });
  return -2.95;
}

/**
 * Void Traitor (traitor, 0-4): a dark void figure wrapped in purple haze with tiny soldiers stuck
 * in it, growing every level. Lv 1 black equipment and void claws; Lv 2 dark red armor, a horned
 * helm and a scimitar; Lv 3 a purple crystal core, a cape and a glowing scimitar; Lv 4 neon
 * armor, blade wings, a greatsword and a shield.
 */
export function makeTraitor(level) {
  const lv = Math.min(level, 4);
  const h = makeHumanoid({ skin: 0x1a0d26, shirt: 0x12001f, pants: 0x0b0014, arms: 0x1a0033, face: 'void' });
  const key = `p24traitor${lv}`;
  const voidG = glowMat(h, 0xaa00ff);
  const neon = glowMat(h, 0xe040fb);
  const armor = lv >= 4 ? 0x1a0033 : 0x5d0000;
  const black = 0x0a0a0a;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // void haze around the body, and wisps
  const haze = glassMat(h, 0x4a148c, 0.35);
  t.box(2.4, 2.3, 1.3, haze, 0, 0, 0, { r: 0.3 });
  for (const [x, y, z, r] of [[1.2, 0.8, -0.5, 0.3], [-1.1, -0.5, 0.4, 0.25], [0.6, -1.0, -0.6, 0.22], [-0.7, 1.0, -0.6, 0.2]]) t.ball(r, haze, x, y, z, { seg: 8, rows: 6 });
  // void cracks glowing through the chest
  t.box(0.06, 0.6, 0.04, voidG, -0.35, 0.2, 0.51, { rz: 0.4 });
  t.box(0.06, 0.4, 0.04, voidG, -0.2, -0.2, 0.51, { rz: -0.5 });
  if (lv >= 1) {
    belt(t, black, 0x4a148c, -0.85);
    if (lv < 2) shoulderPads(t, black, 0.5);
    hood(hd, black);
  }
  if (lv >= 2) {
    // dark armor: breastplate, spiked pauldrons, a horned helm
    t.box(2.2, 1.5, 1.2, armor, 0, 0.25, 0, { r: 0.14 });
    for (let i = 0; i < 2; i++) t.box(2.16, 0.12, 1.16, tone(armor, 1.5), 0, -0.5 - i * 0.16, 0, { r: 0.04 });
    for (const s of [-1, 1]) {
      dome(t, 0.62, 0.5, armor, s * 1.42, 0.9, 0, { seg: 14 });
      t.torus(0.6, 0.05, tone(armor, 0.6), s * 1.42, 0.92, 0, { rx: PI / 2, seg: 14 });
      t.cyl(0.13, 0.7, armor, s * 1.55, 1.6, 0, { seg: 6, r2: 0.01, rz: s * -0.4 });
    }
    dome(hd, 0.78, 0.55, armor, 0, 0.95, 0, { seg: 18 });
    hd.torus(0.77, 0.05, tone(armor, 0.6), 0, 0.96, 0, { rx: PI / 2, seg: 20 });
    hd.box(0.12, 0.2, 1.3, tone(armor, 0.7), 0, 1.48, 0, { r: 0.04 });
    for (const s of [-1, 1]) hd.tube([[s * 0.6, 1.25, 0], [s * 0.95, 1.55, -0.05], [s * 1.0, 2.0, -0.15]], 0.08, 0x1a1a1a, { seg: 10, sides: 6 }); // horns
  }
  if (lv >= 3) {
    // crystal core and a cape
    t.cyl(0.36, 0.08, INK, 0, 0.4, 0.6, { axis: 'z', seg: 6 });
    crystal(t, 0, 0.0, 0.66, 0.24, 0.85, glowMat(h, 0xd500f9));
    cape(t, 0x1a0033, 3.4, { clasp: neon, tatter: true });
  }
  if (lv >= 4) {
    for (const s of [-1, 1]) {
      t.box(0.06, 1.2, 0.04, neon, s * 0.75, 0.25, 0.61, { rz: s * 0.15 });
      t.torus(0.6, 0.04, neon, s * 1.42, 0.92, 0, { rx: PI / 2, seg: 14 });
    }
    band(hd, 0.8, 0.03, 0.06, 1.4, neon, 1.0);
  }
  // tiny soldiers stuck into it
  hd.done();
  t.done();
  const spots = [
    [h.torso, 0.6, 0.3, 0.5, -0.5, 0.3],
    [h.torso, -0.5, -0.5, 0.45, -0.7, -0.4],
    [h.torso, 0.2, 0.7, -0.5, 0.6, 0.2],
    [h.rightLeg, 0, -1.0, 0.5, -0.4, 0.5],
    [h.leftArm, 0.4, -1.0, 0.2, 0.2, -1.2],
  ];
  for (const [p, x, y, z, rx, rz] of spots.slice(0, 3 + Math.min(lv, 2))) miniSoldier(h, p, x, y, z, 0.55, rx, rz);
  if (lv >= 4) {
    // blade wings: long dark blades with neon edges, fanned behind the cape
    for (const s of [-1, 1]) {
      const wg = new THREE.Group();
      wg.position.set(s * 0.4, 0.7, -0.85);
      wg.rotation.y = s * 0.35;
      h.torso.add(wg);
      const wk = wear(h, wg, `${key}:wing${s}`);
      for (let i = 0; i < 4; i++) {
        const a = 0.55 - i * 0.32;
        const len = 3.0 - i * 0.35;
        const pts = featherPts(0.2, 0, a, len, 0.5).map(([x, y]) => [s * x, -y]);
        wk.plan(pts, 0.08, 0x0b0014, 0, 0, -i * 0.04, { rx: PI / 2 });
        const c = Math.cos(a);
        const sn = Math.sin(a);
        wk.tube([[s * 0.3, 0.05, -i * 0.04 + 0.05], [s * (0.2 + c * len * 0.95), sn * len * 0.95, -i * 0.04 + 0.05]], 0.035, neon, { seg: 2, sides: 4 });
      }
      wk.ball(0.2, armor, 0, 0, 0, { seg: 8, rows: 6 });
      wk.done();
    }
  }
  hands(h, key, lv >= 1 ? black : null, lv >= 1 ? black : 0x1a0033, (a, s) => {
    if (lv >= 2) gauntlet(a, armor, lv >= 4 ? neon : tone(armor, 0.6));
    if (lv >= 4 && s > 0) {
      // a void shield on the left forearm
      a.box(0.25, 2.2, 1.7, 0x1a0033, 0.7, -1.2, 0, { r: 0.1 });
      a.box(0.1, 1.9, 1.4, 0x311b92, 0.85, -1.2, 0, { r: 0.06 });
      a.box(0.06, 1.6, 0.12, neon, 0.92, -1.2, 0);
      a.box(0.06, 0.12, 1.2, neon, 0.92, -1.0, 0);
      a.cyl(0.25, 0.1, voidG, 0.95, -1.0, 0, { axis: 'x', seg: 6 });
    }
  });
  feet(h, key, lv >= 2 ? armor : black, (b) => {
    if (lv >= 2) b.box(1.08, 0.7, 0.2, armor, 0, -1.1, 0.5, { r: 0.06 });
    if (lv >= 4) b.box(0.05, 0.5, 0.04, neon, 0, -1.1, 0.62);
  });
  // the weapon: void claws, a scimitar, then a greatsword
  const g = fist(h.rightArm, -1.9, 1);
  const wk = wear(h, g, `${key}:weapon`);
  wk.box(0.3, 0.45, 0.3, 0x111111, 0, -0.15, 0, { r: 0.06 });
  let tip;
  if (lv < 2) {
    for (const z of [-0.22, 0, 0.22]) {
      wk.tube([[0, -0.3, z], [0, -0.8, z + 0.06], [0, -1.15, z + 0.25]], 0.05, voidG, { seg: 8, sides: 5 });
      wk.cyl(0.05, 0.25, voidG, 0, -1.25, z + 0.33, { seg: 5, r2: 0.001, rx: PI - 0.7 });
    }
    tip = -1.3;
  } else if (lv < 4) {
    tip = scimitar(wk, lv >= 3 ? voidG : 0x9e9e9e, 0x4a148c);
  } else {
    // greatsword: a wide dark blade with a neon core and a winged guard
    wk.cyl(0.13, 0.7, 0x111111, 0, 0.1, 0, { seg: 8 });
    wk.ball(0.18, 0x311b92, 0, 0.5, 0, { seg: 8, rows: 6 });
    wk.box(0.22, 0.22, 1.4, 0x311b92, 0, -0.38, 0, { r: 0.06 });
    for (const s of [-1, 1]) wk.cyl(0.1, 0.5, 0x311b92, 0, -0.25, s * 0.85, { seg: 5, r2: 0.01, rx: s * -0.9 });
    wk.box(0.14, 3.0, 0.62, 0x1a0033, 0, -2.0, 0);
    wk.slab(0.14, 0.6, 0.62, 0x1a0033, 0, -3.8, 0, { bd: 0.06 });
    wk.box(0.16, 2.9, 0.18, neon, 0, -2.0, 0);
    for (const s of [-1, 1]) wk.box(0.15, 3.0, 0.04, 0x7c4dff, 0, -2.0, s * 0.3);
    tip = -4.1;
  }
  wk.done();
  h.muzzles = [];
  muzzle(h, g, tip, 0);
  const left = lv >= 4 ? -1.0 : -0.3;
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  h.leftArm.rotation.set(left, 0, -0.25);
  h.pose = { right: -2.4, left, leftRecoil: 0 };
  h.swing = 2;
  h.melee = true;
  h.tracer = lv >= 4 ? 0xe040fb : 0xaa00ff;
  h.body.scale.setScalar(1 + lv * 0.06);
  return own(h, 0);
}

// ------------------------------------------------------------------ Ice Apprentice

/**
 * Ice Apprentice (0-4): a young mage with a staff, a light blue ice tunic with cracks and a frozen
 * see-through cape with icicles. Lv 1 short sleeves and dark gloves; Lv 2 a light blue top hat,
 * a suit and a silver staff with prongs; Lv 3 a bigger crystal with shards circling it; Lv 4
 * light blue feathered wings.
 */
export function makeIceApprentice(level) {
  const lv = Math.min(level, 4);
  const suit = lv >= 2;
  const h = makeHumanoid({ skin: 0xf1d4c0, shirt: suit ? 0x4fc3f7 : 0xb3e5fc, pants: suit ? 0x0288d1 : 0x81d4fa, arms: suit ? 0x4fc3f7 : null, face: 'smile' });
  const key = `p24ice${lv}`;
  const iceG = glowMat(h, ICE);
  const frost = glassMat(h, 0xb3e5fc, 0.7);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // ice cracks on the chest
  for (const [x, y, r] of [[-0.5, 0.4, 0.3], [0.4, -0.3, -0.4], [-0.3, -0.5, 0.9]]) t.box(0.5, 0.06, 0.04, 0xe1f5fe, x, y, 0.51, { rz: r });
  // the frozen cape with an icicle hem
  t.slab(2.3, 3.3, 0.12, frost, 0, -0.65, -0.64, { bw: 1.15, bz: -0.12 });
  t.box(2.5, 0.3, 0.7, frost, 0, 0.95, -0.28, { r: 0.12 });
  for (let i = 0; i < 6; i++) icicle(t, -1.1 + i * 0.44, -2.28, -0.74, 0.35 + (i % 2) * 0.25, frost);
  if (suit) {
    // a suit: white shirt front, dark tie, lapels, buttons
    t.box(0.62, 1.6, 0.05, 0xfafafa, 0, 0.15, 0.51);
    t.box(0.2, 0.2, 0.08, 0x01579b, 0, 0.85, 0.55);
    t.slab(0.2, 1.1, 0.06, 0x01579b, 0, 0.2, 0.55, { tw: 0.8, bw: 1.3 });
    for (const s of [-1, 1]) t.box(0.34, 1.45, 0.08, 0x29b6f6, s * 0.45, 0.3, 0.53, { rz: s * 0.22 });
    for (let i = 0; i < 2; i++) t.cyl(0.05, 0.04, 0xe1f5fe, 0.42, -0.3 - i * 0.3, 0.55, { axis: 'z', seg: 8 });
    t.box(2.08, 0.22, 1.08, 0x01579b, 0, -0.85, 0, { r: 0.04 });
    // a light blue top hat with a ribbon and a glowing snowflake pin
    hair(hd, 0x6d4c41, { h: 0.38 });
    hd.cyl(0.98, 0.08, 0x81d4fa, 0, 1.18, 0, { seg: 22 });
    hd.cyl(0.62, 1.05, 0x81d4fa, 0, 1.72, 0, { seg: 20, r2: 0.66 });
    hd.cyl(0.64, 0.2, 0x0277bd, 0, 1.33, 0, { seg: 20 });
    for (let i = 0; i < 3; i++) hd.box(0.05, 0.3, 0.04, iceG, 0.35, 1.35, 0.63, { rz: (i * PI) / 3 });
  } else {
    // a frost hood and a rope belt
    hood(hd, 0xb3e5fc);
    t.box(2.08, 0.18, 1.08, 0xe1f5fe, 0, -0.85, 0, { r: 0.04 });
    for (const s of [-1, 1]) t.cyl(0.04, 0.5, 0xe1f5fe, 0.2 + s * 0.1, -1.15, 0.56, { seg: 5 });
    t.cyl(0.1, 0.06, iceG, 0, 0.75, 0.52, { axis: 'z', seg: 6 }); // clasp gem
  }
  hd.done();
  t.done();
  if (lv >= 4) featherWings(h, key, glowGlass(h, 0x81d4fa, 0.75), 0xe1f5fe, { size: 0.9 });
  hands(h, key, lv >= 1 ? 0x263238 : null, suit ? 0x4fc3f7 : 0xb3e5fc, (a) => {
    if (lv === 1) a.box(1.1, 0.75, 1.1, 0xb3e5fc, 0, -0.35, 0, { r: 0.05 }); // short sleeves
    a.box(1.08, 0.08, 1.08, 0xe1f5fe, 0, -0.95, 0);
  });
  feet(h, key, suit ? 0x01579b : 0x4fc3f7, (b) => {
    b.box(0.5, 0.06, 0.04, 0xe1f5fe, 0.1, -0.6, 0.52, { rz: 0.5 }); // a crack on the leg
  });
  // the staff, held upright in the right hand
  h.rightArm.rotation.set(-0.9, 0, 0.1);
  h.leftArm.rotation.set(-0.3, 0, -0.15);
  h.pose = { right: -0.9, left: -0.3, leftRecoil: 0 };
  const hand = fist(h.rightArm, -1.9, 1);
  const staff = new THREE.Group();
  staff.rotation.x = 0.9;
  hand.add(staff);
  const sk = wear(h, staff, `${key}:staff`);
  const wood = suit ? 0xcfd8dc : 0x6d4c41;
  sk.cyl(0.1, 4.0, wood, 0, 0.5, 0, { seg: 8 });
  for (const y of [-1.4, 0.3, 1.8]) sk.cyl(0.13, 0.12, suit ? 0x90a4ae : 0x3e2723, 0, y, 0, { seg: 8 });
  sk.cyl(0.14, 0.2, suit ? 0x90a4ae : 0x5d4037, 0, -1.55, 0, { seg: 8, r2: 0.1 }); // foot cap
  const cs = lv >= 3 ? 0.75 : suit ? 0.6 : 0.45;
  const top = 2.5;
  sk.cyl(0.12, 0.2, suit ? 0x90a4ae : 0x5d4037, 0, top, 0, { seg: 8, r2: 0.2 }); // cup under the crystal
  if (suit) {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2;
      sk.tube([[Math.cos(a) * 0.15, top, Math.sin(a) * 0.15], [Math.cos(a) * 0.38, top + 0.4, Math.sin(a) * 0.38], [Math.cos(a) * 0.22, top + 0.9, Math.sin(a) * 0.22]], 0.04, 0xcfd8dc, { seg: 8, sides: 5 }); // prongs
    }
  } else {
    sk.tube([[0.1, top - 0.1, 0], [0.3, top + 0.3, 0], [0.12, top + 0.6, 0.05]], 0.05, wood, { seg: 8, sides: 5 }); // a twisted twig
  }
  crystal(sk, 0, top + 0.05, 0, cs * 0.55, cs * 2.0, iceG);
  for (const s of [-1, 1]) crystal(sk, s * 0.15, top + 0.1, 0.05, cs * 0.22, cs * 0.9, iceG, 0.5, s > 0 ? 0 : PI);
  sk.done();
  const cy = top + 0.05 + cs;
  if (lv >= 3) {
    // shards circling the crystal
    const sp = spinner(h, staff, 0, cy, 0);
    const ok = wear(h, sp, `${key}:orbit`);
    const pale = glowMat(h, 0xe1f5fe);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2;
      crystal(ok, Math.cos(a) * 0.85, -0.2, Math.sin(a) * 0.85, 0.12, 0.45, pale);
    }
    ok.done();
    h.idleSpin = 1.5;
  }
  h.muzzles = [];
  muzzle(h, staff, cy, 0);
  h.tracer = ICE;
  h.tracerWidth = 0.3;
  return own(h, 0);
}

export const MODELS = {
  exterminator: makeExterminator,
  spiritAdvocate: makeSpiritAdvocate,
  sentryEngineer: makeSentryEngineer,
  traitor: makeTraitor,
  iceApprentice: makeIceApprentice,
};
