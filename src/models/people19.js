// Tower models: people, batch 19 (dressed with the vehicle kit in ../vehicles.js).
// In here: Rockety, Samurai, Hired Gun, Outlaw, Liberator, Ruptor, Spark.
// MODELS at the bottom is laid over TOWER_MODELS in ../models.js, so these win over the old
// builders in newmodels/a.js (the first six) and newmodels/b.js (Spark).
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.
// Moving parts: Outlaw's Lv 5 rune ring and Spark's orb spin (spinner + h.idleSpin); Outlaw's
// revolver twirls (h.twirl), as before.

import * as THREE from 'three';
import { antenna, glowMat, star, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import {
  GOLD, INK, LEATHER, STEEL, UP, WOOD, aimBoth, aimLong, band, belt, cap, collar, cowboyHat, dome, fist,
  goggles, hair, headband, helmet, kneePad, muzzle, own, pack, pouch, revolver, rifle, sash, shades, vest, wear,
} from './people1.js';
import { nvg, shoulderPads } from './people2.js';
import { feet, hands } from './people5.js';
import { visor } from './people7.js';
import { arc, coil } from './people8.js';
import { spinner } from './machines5.js';

const PI = Math.PI;

// ------------------------------------------------------------------ shared bits for this batch

/** See-through glowing material (ghost hands, auras): stays see-through when the tower fades. */
function ghostMat(h, color, op) {
  const m = glowMat(h, color);
  m.transparent = true;
  m.opacity = op;
  m.depthWrite = false;
  m.userData.keepOpacity = op;
  return m;
}

/** Boot legs with something extra per leg (like feet(), but a custom boot). */
function legs(h, key, build) {
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    build(b);
    b.done();
  }
}

// ------------------------------------------------------------------ Rockety

/**
 * A retro rocket tube in gun space (runs along -y above the fist): grey tube with red bands, a
 * flared back end, a finned warhead poking out. dz lifts it (for the stacked twin tube).
 * Returns the muzzle [y, z].
 */
function retroTube(k, o) {
  const r = o.r;
  const len = o.len;
  const z = UP + r - 0.05 + (o.dz ?? 0);
  const red = 0xd32f2f;
  k.cyl(r, len + 0.9, 0x9e9e9e, 0, (0.9 - len) / 2, z, { seg: 18 });
  for (let i = 0; i < 6; i++) k.box(0.02, len * 0.7, 0.02, 0x7a7a7a, Math.sin(i) * r, -len / 2, z + Math.cos(i) * r); // seams
  k.cyl(r + 0.05, 0.26, red, 0, -len + 0.25, z, { seg: 18 }); // front band
  k.cyl(r + 0.05, 0.2, red, 0, 0.15, z, { seg: 18 }); // middle band
  k.cyl(r + 0.02, 0.5, 0x37474f, 0, 0.7, z, { seg: 18, r2: r + 0.22 }); // flared back end
  k.cyl(r + 0.22, 0.06, INK, 0, 0.96, z, { seg: 18 });
  k.cyl(r * 0.8, 0.03, 0x050505, 0, -len - 0.01, z, { seg: 14 });
  // the warhead: a grey body, a red nose and little fins showing at the mouth
  const wr = r * 0.78;
  k.cyl(wr, 0.32, 0x607d8b, 0, -len - 0.16, z, { seg: 14 });
  k.cyl(0.05, 0.42, red, 0, -len - 0.53, z, { seg: 14, r2: wr });
  k.ball(0.06, red, 0, -len - 0.75, z, { seg: 8, rows: 5 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4;
    k.box(0.03, 0.22, 0.2, 0x455a64, Math.sin(a) * wr, -len + 0.05, z + Math.cos(a) * wr, { ry: a });
  }
  return [-len - 0.75, z];
}

/** Rockety (0-4): Lv 1 bigger rockets, Lv 2 a helmet with a red stripe, Lv 3 twin tubes, Lv 4 a fuze bomb on his back. */
export function makeRockety(level) {
  const shirt = 0x3f51b5;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x616161, arms: shirt, face: 'soldier' });
  const key = `p19rockety${level}`;
  const red = 0xd32f2f;
  const fuse = glowMat(h, 0xff9100);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (level >= 2) {
    helmet(hd, 0x78909c, { cover: red });
    goggles(hd, 1.3, 0xffd54f, { r: 0.77, strap: 0x5d4037, frame: 0x8d6e63 });
  } else {
    // a retro field cap with flight goggles pushed up on it
    hair(hd, 0x4e342e, { h: 0.36 });
    dome(hd, 0.72, 0.42, 0x757575, 0, 0.95, 0);
    hd.cyl(0.73, 0.16, 0x616161, 0, 1.02, 0, { seg: 22 });
    hd.plan([[-0.5, 0], [0.5, 0], [0.4, 0.38], [-0.4, 0.38]], 0.06, 0x424242, 0, 0.98, 0.52, { rx: -0.1 });
    for (const s of [-1, 1]) hd.box(0.08, 0.36, 0.3, 0x616161, s * 0.7, 0.82, 0.05, { r: 0.03 }); // ear flaps
    goggles(hd, 1.2, 0xffd54f, { r: 0.74, strap: 0x5d4037, frame: 0x8d6e63 });
  }
  // a flight jacket: collar, zip, a red patch, a belt with a gold buckle
  collar(t, tone(shirt, 0.8), { buttons: false });
  t.box(0.06, 1.7, 0.04, 0xbdbdbd, 0.1, 0.05, 0.52); // zip
  t.box(2.1, 0.22, 1.1, tone(shirt, 0.75), 0, -0.68, 0, { r: 0.04 }); // jacket waistband
  t.box(0.36, 0.36, 0.05, red, 0.55, 0.5, 0.53, { r: 0.03 });
  t.cyl(0.1, 0.03, 0xffd54f, 0.55, 0.5, 0.56, { axis: 'z', seg: 10 });
  belt(t, 0x5d4037, 0xffd54f);
  pouch(t, -0.6, -0.95, 0.52, 0.36, 0.34, 0x5d4037);
  if (level >= 4) {
    // a vintage round fuze bomb on a frame on his back, its fuze fizzing
    for (const s of [-1, 1]) {
      t.box(0.24, 0.1, 1.2, LEATHER, s * 0.5, 1.0, -0.05);
      t.box(0.24, 1.3, 0.06, LEATHER, s * 0.5, 0.32, 0.53);
      t.box(0.1, 1.9, 0.1, INK, s * 0.62, 0, -0.62);
    }
    t.box(1.4, 0.1, 0.6, INK, 0, -0.85, -0.95);
    t.ball(0.8, 0x212121, 0, 0.05, -1.35, { seg: 18, rows: 12 });
    t.torus(0.81, 0.05, 0x424242, 0, 0.05, -1.35, { rx: PI / 2, seg: 22 }); // seam
    t.cyl(0.24, 0.3, 0x9e9e9e, 0, 0.92, -1.35, { seg: 12 }); // fuze cap
    t.cyl(0.27, 0.06, INK, 0, 0.8, -1.35, { seg: 12 });
    t.tube([[0, 1.05, -1.35], [0.1, 1.35, -1.3], [-0.05, 1.6, -1.42], [0.1, 1.78, -1.38]], 0.04, 0xd7ccc8, { seg: 12, sides: 5 });
    t.ball(0.13, fuse, 0.1, 1.84, -1.38, { seg: 8, rows: 6 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      t.cyl(0.015, 0.22, fuse, 0.1 + Math.cos(a) * 0.15, 1.88 + Math.sin(a * 2) * 0.05, -1.38 + Math.sin(a) * 0.15, { rz: Math.cos(a), rx: Math.sin(a) });
    }
    t.box(0.5, 0.3, 0.04, 0xfafafa, 0, -0.1, -2.15, { rx: -0.1 }); // a painted label
  }
  hd.done();
  t.done();
  hands(h, key, 0x5d4037, tone(shirt, 0.75));
  feet(h, key, 0x263238, level >= 2 ? kneePad : null);
  // the launcher on the shoulder: one tube, two stacked from Lv 3
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const big = level >= 1;
  const r = big ? 0.4 : 0.33;
  const len = big ? 2.9 : 2.5;
  const tops = [retroTube(gk, { r, len })];
  if (level >= 3) tops.push(retroTube(gk, { r, len, dz: r * 2 + 0.06 }));
  const topZ = tops[tops.length - 1][1] + r;
  gk.box(0.22, 0.26, 0.55, INK, 0, 0.1, UP - 0.32, { rx: -0.3, r: 0.04 }); // grip
  gk.torus(0.1, 0.022, INK, 0, -0.14, UP - 0.22, { ry: PI / 2, seg: 10, arc: PI });
  gk.box(0.2, 0.22, 0.6, INK, 0, -1.3, UP - 0.25, { r: 0.04 }); // front grip
  gk.box(0.08, 0.2, 0.2, INK, 0, -len + 0.5, topZ + 0.08); // front sight post
  gk.torus(0.12, 0.025, INK, 0, -len + 0.5, topZ + 0.24, { seg: 12 });
  gk.box(0.3, 0.3, 0.36, 0x37474f, r + 0.15, -0.2, UP + r, { r: 0.04 }); // sight box
  gk.cyl(0.1, 0.04, 0xffd54f, r + 0.15, -0.37, UP + r, { seg: 10 });
  if (level >= 3) {
    // clamps holding the pair: a ring round each tube and a block between them
    for (const y of [-0.9, 0.35]) {
      for (const [, tz] of tops) gk.cyl(r + 0.035, 0.1, INK, 0, y, tz, { seg: 18 });
      gk.box(0.3, 0.1, 0.3, INK, 0, y, (tops[0][1] + tops[1][1]) / 2);
    }
  }
  gk.done();
  h.muzzles = [];
  for (const [y, z] of tops) muzzle(h, g, y, z);
  aimLong(h);
  h.pose.leftRecoil = 0.2;
  h.recoilScale = 1.3;
  h.projectile = { color: level >= 4 ? 0xd32f2f : 0x9e9e9e, size: big ? 1.2 : 1 };
  h.tracer = 0xff7043;
  return own(h);
}

// ------------------------------------------------------------------ Samurai

/** A katana in gun space: wrapped hilt, round guard, collar and a long blade with a pointed tip. Returns the tip y. */
function katana(k, len, blade, guard) {
  k.cyl(0.13, 0.95, 0x1a1a1a, 0, -0.05, 0, { seg: 10 }); // hilt
  for (let i = 0; i < 6; i++) k.torus(0.13, 0.025, 0x4a0e0e, 0, 0.35 - i * 0.15, 0, { rx: PI / 2 + (i % 2 ? 0.45 : -0.45), seg: 10 }); // wrap
  k.cyl(0.15, 0.08, guard, 0, 0.45, 0, { seg: 10 }); // pommel cap
  k.cyl(0.34, 0.07, guard, 0, -0.55, 0, { seg: 16, sz: 0.8 }); // tsuba
  k.torus(0.3, 0.02, INK, 0, -0.55, 0, { rx: PI / 2, seg: 16 });
  k.box(0.13, 0.14, 0.3, GOLD, 0, -0.65, 0.02); // collar
  k.slab(0.06, len, 0.3, blade, 0, -0.72 - len / 2, 0.02, { bd: 0.25, bz: 0.08 }); // blade
  for (const s of [-1, 1]) k.box(0.02, len * 0.7, 0.04, 0x90a4ae, s * 0.03, -0.72 - len * 0.35, -0.02); // the hamon line on each side
  return -0.72 - len;
}

/** Laced armour plates: a plate with rows of cord (any space; facing +z). */
function lamellar(k, w, hh, d, col, x, y, z, rows, cord, o = {}) {
  k.box(w, hh, d, col, x, y, z, { r: 0.04, ...o });
  for (let i = 0; i < rows; i++) {
    const yy = y + hh / 2 - ((i + 1) * hh) / (rows + 1);
    k.box(w + 0.02, 0.05, d + 0.02, tone(col, 0.6), x, yy, z, o);
    for (let j = 0; j < 4; j++) k.box(0.05, 0.1, 0.03, cord, x - w * 0.36 + (j * w * 0.72) / 3, yy, z + d / 2 + 0.01, o);
  }
}

/**
 * Samurai (0-4): red lacquered armour, a katana raised overhead. Lv 0 a headband and a
 * topknot, Lv 1 a horned kabuto, Lv 2 a face mask and shuriken in the belt, Lv 3 glowing gold
 * trim, Lv 4 a second sword in the left hand and glowing blades.
 */
export function makeSamurai(level) {
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: 0x8e1b1b, pants: 0x1a1a1a, arms: 0x1a1a1a, face: 'soldier' });
  const key = `p19samurai${level}`;
  const gold = level >= 3;
  const RED = 0xb71c1c;
  const trim = gold ? glowMat(h, 0xffc400) : 0x3e2723;
  const crest = gold ? trim : 0xc9a227;
  const cord = gold ? 0xffd54f : 0x1a237e;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // do (chest armour): a laced red plate front and back, a trim band at the top
  lamellar(t, 2.2, 1.55, 0.2, RED, 0, 0.2, 0.55, 3, cord);
  lamellar(t, 2.2, 1.55, 0.2, RED, 0, 0.2, -0.55, 3, cord);
  t.box(2.24, 1.55, 1.0, tone(RED, 0.8), 0, 0.2, 0, { r: 0.06 });
  t.box(2.28, 0.14, 1.34, trim, 0, 1.0, 0, { r: 0.04 });
  for (const s of [-1, 1]) t.box(0.3, 0.12, 1.3, 0x1a1a1a, s * 0.55, 1.05, 0); // shoulder cords
  // obi with its knot, and the kusazuri (skirt plates) hanging over the legs
  t.box(2.26, 0.3, 1.26, 0x3e2723, 0, -0.72, 0, { r: 0.04 });
  t.ball(0.17, 0x3e2723, 0.55, -0.72, 0.65, { seg: 8, rows: 6 });
  for (const s of [-1, 1]) t.box(0.14, 0.42, 0.05, 0x3e2723, 0.55 + s * 0.1, -0.98, 0.66, { rz: s * 0.25 });
  for (const x of [-0.72, 0, 0.72]) lamellar(t, 0.64, 0.8, 0.14, RED, x, -1.2, 0.6, 2, cord, { rx: -0.12 });
  for (const s of [-1, 1]) lamellar(t, 0.14, 0.8, 0.9, RED, s * 1.1, -1.2, 0, 1, cord, { rz: s * 0.1 });
  lamellar(t, 2.0, 0.8, 0.14, RED, 0, -1.2, -0.6, 2, cord, { rx: 0.12 });
  // the saya (scabbard) at the left hip, tipped back
  t.cyl(0.13, 2.6, 0x161616, 1.2, -1.0, -0.4, { seg: 10, rx: 1.0 });
  t.cyl(0.14, 0.12, crest, 1.2, -1.0 + Math.cos(1.0) * 1.3, -0.4 - Math.sin(1.0) * 1.3, { seg: 10, rx: 1.0 }); // end cap
  t.torus(0.15, 0.03, crest, 1.2, -1.0 - Math.cos(1.0) * 0.9, -0.4 + Math.sin(1.0) * 0.9, { seg: 12, rx: 1.0 + PI / 2 });
  if (level >= 2) {
    // shuriken tucked in the obi
    for (const x of [-0.75, -0.4]) {
      for (const a of [0, PI / 4]) t.cyl(0.18, 0.03, 0xb0bec5, x, -0.72, 0.66, { axis: 'z', seg: 4, rz: a });
      t.cyl(0.05, 0.05, INK, x, -0.72, 0.69, { axis: 'z', seg: 8 });
    }
  }
  if (level >= 1) {
    // kabuto: a ribbed black bowl, a flared neck guard in red rows, side flaps and a horned crest
    dome(hd, 0.78, 0.62, 0x161616, 0, 0.98, 0);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2;
      hd.box(0.04, 0.5, 0.04, 0x2a2a2a, Math.sin(a) * 0.6, 1.3, Math.cos(a) * 0.6, { ry: a, rx: Math.cos(a) * -0.6, rz: Math.sin(a) * 0.6 });
    }
    hd.cyl(0.12, 0.1, crest, 0, 1.6, 0, { seg: 10 }); // top ring
    for (let i = 0; i < 3; i++) {
      hd.cyl(0.8 + i * 0.12, 0.16, RED, 0, 0.92 - i * 0.18, -0.08, { seg: 22, r2: 0.78 + i * 0.12, open: true });
      hd.cyl(0.8 + i * 0.12 - 0.04, 0.16, tone(RED, 0.7), 0, 0.92 - i * 0.18, -0.08, { seg: 22, r2: 0.78 + i * 0.12 - 0.04, open: true });
    }
    for (const s of [-1, 1]) {
      hd.box(0.1, 0.45, 0.55, RED, s * 0.86, 1.05, 0.45, { ry: s * 0.6, r: 0.03 }); // fukigaeshi
      hd.box(0.12, 0.47, 0.06, trim, s * 0.95, 1.05, 0.68, { ry: s * 0.6 });
      hd.tube([[s * 0.2, 1.4, 0.72], [s * 0.45, 1.75, 0.78], [s * 0.55, 2.2, 0.72]], 0.06, crest, { seg: 10, sides: 6 }); // kuwagata horns
    }
    hd.cyl(0.18, 0.06, crest, 0, 1.38, 0.74, { axis: 'z', seg: 14 }); // crest disc
    hd.box(1.3, 0.1, 0.4, 0x161616, 0, 1.0, 0.66, { rx: -0.25, r: 0.03 }); // visor peak
  } else {
    hair(hd, 0x1a1a1a, { h: 0.4 });
    hd.cyl(0.13, 0.42, 0x1a1a1a, 0, 1.45, -0.2, { seg: 10, rx: -0.6 }); // topknot
    hd.cyl(0.15, 0.08, 0xfafafa, 0, 1.36, -0.12, { seg: 10, rx: -0.6 });
    headband(hd, 0xfafafa, 0.98);
    hd.cyl(0.12, 0.03, 0xc62828, 0, 0.98, 0.69, { axis: 'z', seg: 14 }); // red sun on the headband
  }
  if (level >= 2) {
    // menpo: a dark red face mask with a moustache and a throat guard
    band(hd, 0.67, 0.08, 0.5, 2.3, 0x4a0e0e, 0.22);
    hd.box(0.5, 0.08, 0.06, 0xeeeeee, 0, 0.42, 0.72, { r: 0.02 }); // moustache
    for (const s of [-1, 1]) hd.box(0.1, 0.04, 0.05, INK, s * 0.15, 0.28, 0.74);
    hd.cyl(0.7, 0.2, RED, 0, -0.05, 0, { seg: 20, r2: 0.65 });
  }
  hd.done();
  t.done();
  // sode (shoulder plates) on the upper arms, kote (armoured sleeves) and gloves
  hands(h, key, 0x1a1a1a, 0x1a1a1a, (a) => {
    lamellar(a, 1.25, 0.9, 1.25, RED, 0, -0.35, 0, 2, cord);
    a.box(1.28, 0.1, 1.28, trim, 0, -0.82, 0);
    for (let i = 0; i < 3; i++) a.box(1.08, 0.08, 1.08, 0x37474f, 0, -1.05 - i * 0.18, 0); // kote rings
  });
  legs(h, key, (b) => {
    b.box(1.04, 0.3, 1.04, 0x1a1a1a, 0, -1.8, 0.02, { r: 0.05 }); // tabi
    b.box(1.1, 0.08, 1.2, 0x8d6e63, 0, -1.97, 0.06); // straw sandal
    b.box(0.08, 0.04, 0.5, 0x4e342e, 0, -1.9, 0.35);
    b.box(0.9, 0.85, 0.16, RED, 0, -1.2, 0.55, { r: 0.05 }); // suneate (shin guard)
    for (let i = 0; i < 3; i++) b.box(0.08, 0.8, 0.04, tone(RED, 0.6), -0.3 + i * 0.3, -1.2, 0.64);
    kneePad(b, 0x1a1a1a);
  });
  const blade = level >= 4 ? glowMat(h, 0xffe0b2) : 0xe0e0e0;
  const guard = gold ? trim : 0x8d6e63;
  const len = level >= 1 ? 2.8 : 2.5;
  const g = fist(h.rightArm, -1.9, 1.05);
  const gk = wear(h, g, `${key}:sword`);
  const tip = katana(gk, len, blade, guard);
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tip, 0);
  h.rightArm.rotation.set(-2.6, 0, 0.15);
  if (level >= 4) {
    // the second sword in the left hand, held forward in guard
    const g2 = fist(h.leftArm, -1.9, 1.0);
    const k2 = wear(h, g2, `${key}:sword2`);
    katana(k2, 2.2, blade, guard);
    k2.done();
    h.leftArm.rotation.set(-1.3, 0, -0.3);
    h.pose = { right: -2.6, left: -1.3, leftRecoil: 0 };
  } else {
    h.leftArm.rotation.set(-0.4, 0, -0.15);
    h.pose = { right: -2.6, left: -0.4, leftRecoil: 0 };
  }
  h.swing = 1.9;
  h.melee = true;
  h.tracer = gold ? 0xffd54f : 0xffffff;
  return own(h, 0);
}

// ------------------------------------------------------------------ Hired Gun

/**
 * Hired Gun (0-5): a contractor in tan with a rifle. Lv 0 a cap, shades and a sling, Lv 1 a
 * helmet, a plate carrier and a longer rifle, Lv 2 night vision, Lv 3 a drum mag, a scope and a
 * suppressor, Lv 4 heavy armour and a face guard, Lv 5 a radio pack that calls in support.
 */
export function makeHiredGun(level) {
  const tan = 0xc2a878;
  const h = makeHumanoid({ skin: 0xc68642, shirt: tan, pants: 0x3e3a2a, arms: tan, face: 'soldier' });
  const key = `p19hiredGun${level}`;
  const green = glowMat(h, 0x76ff03);
  const blink = glowMat(h, 0xff1744);
  const heavy = level >= 4;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (level >= 1) {
    helmet(hd, 0x8d7b5a, { cover: 0x1c1c1c });
    for (const s of [-1, 1]) hd.box(0.1, 0.12, 0.5, INK, s * 0.74, 1.1, 0, { r: 0.02 }); // side rails
    if (level >= 2) nvg(hd, green, level >= 4);
  } else {
    hair(hd, 0x1a1209, { h: 0.36 });
    cap(hd, 0x1c1c1c, { peak: 0x111111 });
    shades(hd, INK, 0x263238);
  }
  if (heavy) {
    // a face guard: a mandible plate over the mouth and jaw
    band(hd, 0.7, 0.1, 0.45, 2.6, 0x3b3f2a, 0.25);
    for (let i = 0; i < 3; i++) hd.box(0.06, 0.24, 0.04, INK, -0.2 + i * 0.2, 0.25, 0.74);
  }
  if (level >= 5) {
    // a headset cup and boom mic for the radio
    hd.cyl(0.24, 0.14, 0x333333, -0.8, 0.7, 0, { axis: 'x', seg: 12 });
    hd.tube([[-0.82, 0.62, 0.05], [-0.7, 0.42, 0.4], [-0.32, 0.36, 0.64]], 0.03, 0x333333, { seg: 8, sides: 4 });
    hd.ball(0.07, INK, -0.3, 0.36, 0.66, { seg: 8, rows: 5 });
  }
  collar(t, tone(tan, 0.85), { buttons: level === 0 });
  belt(t, 0x2b2b2b, 0x9e9e9e);
  pouch(t, 0.7, -0.95, 0.52, 0.34, 0.32, 0x4e4630);
  if (level === 0) sash(t, INK, -1, 0.2); // the rifle sling
  if (level >= 1) vest(t, heavy ? 0x3b3f2a : 0x2b2b2b, { pouches: 3, pouch: 0x4e4630, patch: 0x8d7b5a });
  if (heavy) {
    // heavy armour: a thick chest plate, pauldrons and a groin plate
    t.box(2.3, 1.2, 1.36, 0x3b3f2a, 0, 0.4, 0, { r: 0.14 });
    for (let i = 0; i < 3; i++) t.box(1.9, 0.04, 0.04, INK, 0, 0.75 - i * 0.25, 0.69);
    shoulderPads(t, 0x3b3f2a, 0.62);
    t.box(0.9, 0.7, 0.18, 0x3b3f2a, 0, -1.25, 0.6, { r: 0.06 });
  }
  if (level >= 5) {
    pack(t, 0x4b5320, { w: 1.5, h: 1.6, d: 0.7 });
    t.box(1.0, 0.36, 0.06, 0x263238, 0, 0.35, -1.56, { r: 0.03 }); // radio face
    for (let i = 0; i < 3; i++) t.cyl(0.06, 0.08, INK, -0.25 + i * 0.25, 0.35, -1.6, { axis: 'z', seg: 8 });
    t.ball(0.09, blink, 0.35, 0.35, -1.6, { seg: 8, rows: 5 });
    antenna(t, 0.5, 0.75, -0.9, 2.6);
    t.ball(0.12, blink, 0.5, 3.75, -1.05, { seg: 8, rows: 6 }); // light on the whip
  }
  hd.done();
  t.done();
  hands(h, key, INK, tone(tan, 0.8), heavy ? (a) => a.box(1.14, 0.6, 1.14, 0x3b3f2a, 0, -0.35, 0, { r: 0.1 }) : null);
  legs(h, key, (b) => {
    b.box(1.06, 0.62, 1.08, 0x1c1c1c, 0, -1.66, 0.02, { r: 0.05 });
    b.box(1.1, 0.12, 1.2, INK, 0, -1.96, 0.06);
    if (level >= 1) kneePad(b, 0x2b2b2b);
  });
  const tp = wear(h, h.leftLeg, `${key}:thigh`);
  pouch(tp, 0.52, -0.6, -0.2, 0.36, 0.5, 0x4e4630, 0.2); // thigh pouch
  tp.box(0.04, 0.12, 1.06, INK, 0.52, -0.45, 0);
  tp.done();
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = rifle(gk, {
    len: level >= 1 ? 2.25 : 1.9,
    body: heavy ? 0x2b2b2b : 0x1c1c1c,
    furn: 0x4e4630,
    mag: level >= 3 ? 'drum' : 'curved',
    optic: level >= 3 ? 'scope' : level >= 1 ? 'dot' : 'iron',
    can: level >= 3,
    light: level >= 2,
  });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = 0xffc107;
  return own(h);
}

// ------------------------------------------------------------------ Outlaw

/** A floating ghost hand (open palm, fingers up), its own kit on a group on h.body. */
function ghostHand(h, key, mat, x, y, z, s, tilt) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  g.rotation.z = tilt;
  h.body.add(g);
  const k = wear(h, g, `${key}:ghostHand`);
  k.box(0.8, 0.8, 0.26, mat, 0, 0, 0, { r: 0.1 });
  for (let i = 0; i < 4; i++) {
    const fx = -0.3 + i * 0.2;
    const fl = i === 1 || i === 2 ? 0.6 : 0.5;
    k.cyl(0.08, fl, mat, fx, 0.4 + fl / 2, 0, { seg: 8, r2: 0.07 });
    k.ball(0.075, mat, fx, 0.4 + fl, 0, { seg: 8, rows: 5 });
  }
  k.cyl(0.08, 0.42, mat, 0.5, 0.05, 0, { seg: 8, rz: -1.0 }); // thumb
  k.cyl(0.36, 0.7, mat, 0, -0.7, 0, { seg: 12, r2: 0.04, rx: PI }); // wispy wrist, fading to a point
  k.done();
  return g;
}

/**
 * Outlaw (0-5): a gunslinger with long hair, a wide hat and a poncho. Lv 1 a bandana mask, a
 * gun belt and a holster, Lv 2 two ghost hands at her shoulders, glowing eyes and hat band,
 * Lv 3 glowing poncho stripes, Lv 4 four ghost hands, Lv 5 dressed in black and violet with a
 * gold revolver, an aura and a rune ring that turns round her feet.
 */
export function makeOutlaw(level) {
  const big = level >= 5;
  const shirt = big ? 0x2a1238 : 0x5d2a36;
  const h = makeHumanoid({ skin: 0xe8b38a, shirt, pants: 0x3e2f2a, arms: shirt });
  const key = `p19outlaw${level}`;
  const purple = big ? 0xd500f9 : 0xb388ff;
  const pglow = glowMat(h, purple);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // long hair: a cap of hair, a fall down the back and locks at the sides
  const HAIR = 0x4a2511;
  hair(hd, HAIR, { h: 0.46 });
  hd.box(1.3, 1.6, 0.3, HAIR, 0, 0.35, -0.58, { r: 0.12 });
  for (const s of [-1, 1]) hd.box(0.16, 1.0, 0.5, HAIR, s * 0.64, 0.6, 0.15, { r: 0.06 });
  hd.cyl(0.18, 0.7, HAIR, 0, -0.6, -0.68, { seg: 10, r2: 0.3 }); // braid tip under the hat
  hd.torus(0.19, 0.05, 0xb71c1c, 0, -0.25, -0.68, { rx: PI / 2, seg: 12 });
  cowboyHat(hd, big ? 0x1a1a1a : 0x5d4037, level >= 2 ? pglow : 0xb71c1c);
  if (level >= 1) {
    // a bandana tied over the mouth, its point hanging down
    band(hd, 0.665, 0.06, 0.42, 3.4, big ? 0x4a148c : 0xb71c1c, 0.28);
    hd.box(0.4, 0.4, 0.05, big ? 0x4a148c : 0xb71c1c, 0, 0.08, 0.66, { rz: PI / 4, rx: 0.15 });
    for (let i = 0; i < 4; i++) hd.ball(0.03, 0xfafafa, -0.36 + i * 0.24, 0.3, 0.7, { seg: 6, rows: 4 }); // paisley dots
  }
  if (level >= 2) for (const s of [-1, 1]) hd.box(0.22, 0.1, 0.05, pglow, s * 0.25, 0.72, 0.63, { r: 0.02 }); // glowing eyes
  // a poncho over the shoulders, pointed front and back, with stripes and a fringe
  const PON = big ? 0x311b4f : 0xa1663a;
  const stripe = level >= 3 ? pglow : 0xffcc80;
  t.slab(2.4, 1.45, 1.34, PON, 0, 0.4, 0, { tw: 0.72, td: 0.9 });
  for (const zs of [1, -1]) t.box(1.0, 1.0, 0.1, PON, 0, -0.32, zs * 0.62, { rz: PI / 4 });
  for (const y of [0.0, -0.18]) t.box(2.42, 0.08, 1.36, stripe, 0, y, 0);
  for (const zs of [1, -1]) t.box(0.28, 0.28, 0.12, stripe, 0, -0.32, zs * 0.64, { rz: PI / 4 });
  for (let i = 0; i < 9; i++) {
    const x = -1.1 + i * 0.275;
    for (const zs of [1, -1]) t.cyl(0.03, 0.22, tone(PON, 0.8), x, -0.4 + Math.abs(x) * 0.25, zs * 0.66, { seg: 5 }); // fringe
  }
  t.cyl(0.42, 0.14, tone(PON, 0.7), 0, 1.15, 0, { seg: 16 }); // neck hole rim
  if (level >= 1) {
    // a gun belt with loops of bullets and a holster on the right hip
    belt(t, LEATHER, 0xc0c0c0, -0.88);
    for (let i = 0; i < 7; i++) t.cyl(0.05, 0.2, GOLD, -0.75 + i * 0.25, -0.88, 0.6, { seg: 6 });
    t.box(0.38, 0.8, 0.3, 0x4e342e, -1.12, -1.18, 0.12, { r: 0.05 });
    t.box(0.42, 0.14, 0.34, LEATHER, -1.12, -0.85, 0.12);
  } else belt(t, LEATHER, 0xc0c0c0, -0.88);
  if (big) {
    // a soft violet aura round her
    const aura = ghostMat(h, purple, 0.16);
    t.ball(1.9, aura, 0, 0.2, 0, { seg: 18, rows: 12, sy: 1.15 });
  }
  hd.done();
  t.done();
  hands(h, key, 0x3e2723, tone(shirt, 0.8));
  legs(h, key, (b) => {
    b.box(1.06, 0.8, 1.08, 0x3e2723, 0, -1.58, 0.02, { r: 0.05 });
    b.box(1.1, 0.12, 1.2, 0x2b1d14, 0, -1.96, 0.06);
    b.box(1.0, 0.2, 0.3, 0x2b1d14, 0, -2.06, -0.4); // heel
    b.box(1.12, 0.14, 1.14, tone(0x3e2723, 0.75), 0, -1.2, 0.02); // boot cuff
    b.torus(0.12, 0.03, 0xb0bec5, 0, -1.92, -0.62, { seg: 10 }); // spur
  });
  if (level >= 2) {
    const gm = ghostMat(h, purple, big ? 0.75 : 0.6);
    const s = big ? 1.4 : 1;
    ghostHand(h, key, gm, -2.4, 5.0, 0.6, s, 0.3);
    ghostHand(h, key, gm, 2.4, 5.0, 0.6, s, -0.3);
    if (level >= 4) {
      ghostHand(h, key, gm, -2.8, 3.1, -0.3, s, 0.6);
      ghostHand(h, key, gm, 2.8, 3.1, -0.3, s, -0.6);
    }
  }
  if (big) {
    // a rune ring that turns slowly round her feet
    const ring = spinner(h, h.body, 0, 0.12, 0);
    const rk = wear(h, ring, `${key}:ring`);
    const rm = ghostMat(h, purple, 0.55);
    rk.torus(2.2, 0.06, rm, 0, 0, 0, { rx: PI / 2, seg: 40 });
    rk.torus(1.9, 0.03, rm, 0, 0, 0, { rx: PI / 2, seg: 40 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      rk.box(0.34, 0.04, 0.22, rm, Math.cos(a) * 2.05, 0, Math.sin(a) * 2.05, { ry: -a + PI / 2 + (i % 2 ? 0.4 : 0) });
    }
    rk.done();
    h.idleSpin = 0.6;
  }
  const g = fist(h.rightArm, -1.9, 1.35);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = revolver(gk, { metal: big ? GOLD : 0x6d6d6d, grip: big ? 0xfff8e1 : WOOD });
  if (big) gk.torus(0.13, 0.04, pglow, 0, -1.0, UP - 0.02 + 0.05, { rx: PI / 2, seg: 14 }); // glowing muzzle ring
  gk.done();
  h.muzzles = [];
  g.userData.muzzle = muzzle(h, g, y, z);
  h.rightArm.rotation.set(-PI / 2, 0, 0.05);
  h.leftArm.rotation.set(-0.2, 0, -0.2);
  h.pose = { right: -PI / 2, left: -0.2, leftRecoil: 0 };
  h.twirl = [g];
  h.tracer = big ? 0xe040fb : level >= 2 ? 0xce93d8 : 0xffe066;
  return own(h, 0.3);
}

// ------------------------------------------------------------------ Liberator

/**
 * Liberator (0-4): red, white and blue with a rifle in each hand. Lv 1 a star bandana, Lv 2 a
 * striped vest, Lv 3 bigger rifles with red bands, a cape and glowing shoulder stars, Lv 4 an
 * oil barrel on his back.
 */
export function makeLiberator(level) {
  const BLUE = 0x1a3a8a;
  const RED = 0xc62828;
  const WHITE = 0xfafafa;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: BLUE, pants: RED, arms: WHITE, face: 'soldier' });
  const key = `p19liberator${level}`;
  const shine = glowMat(h, 0xfff59d);
  const flame = glowMat(h, 0xff6d00);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x6d4c41, { h: 0.4 });
  if (level >= 1) {
    headband(hd, BLUE, 1.0);
    for (const x of [-0.32, 0, 0.32]) {
      const zz = Math.sqrt(0.67 * 0.67 - x * x) + 0.005;
      star(hd, x, 1.0, zz, 0.08, WHITE, { rx: PI / 2, ry: Math.atan2(x, zz) });
    }
  }
  if (level >= 2) {
    // a striped vest: white with red stripes, a blue corner of stars, pouches
    t.box(2.14, 1.7, 1.14, WHITE, 0, 0.05, 0, { r: 0.08 });
    for (const y of [-0.55, -0.05, 0.45]) t.box(2.16, 0.24, 1.16, RED, 0, y, 0, { r: 0.04 });
    t.box(0.92, 0.72, 0.06, BLUE, -0.6, 0.55, 0.58, { r: 0.03 });
    for (const [x, y] of [[-0.85, 0.72], [-0.6, 0.72], [-0.35, 0.72], [-0.72, 0.42], [-0.48, 0.42]]) star(t, x, y, 0.62, 0.08, WHITE, { rx: PI / 2 });
    for (const x of [0.3, 0.75]) pouch(t, x, -0.4, 0.58, 0.38, 0.4, 0x37474f, 0.18);
  } else {
    // a blue shirt with a big white star
    collar(t, tone(BLUE, 0.8));
    star(t, 0, 0.3, 0.52, 0.42, level >= 3 ? shine : WHITE, { rx: PI / 2 });
  }
  belt(t, 0x3e2723, 0xffd54f);
  if (level >= 3) {
    // a red cape from the shoulders and a gold clasp
    t.slab(2.2, 3.0, 0.12, RED, 0, -0.45, -0.66, { tw: 0.92, bw: 1.15, bz: -0.2 });
    t.box(2.0, 0.2, 0.3, tone(RED, 0.8), 0, 1.0, -0.58, { r: 0.05 });
    for (const s of [-1, 1]) t.cyl(0.13, 0.06, GOLD, s * 0.75, 1.0, 0.56, { axis: 'z', seg: 12 });
  }
  if (level >= 4) {
    // an oil barrel on his back: ribs, a label with a flame and a bung cap
    const DRUM = 0x1a237e;
    t.cyl(0.72, 2.0, DRUM, 0, 0.1, -1.45, { seg: 22 });
    for (const y of [-0.5, 0.2, 0.9]) t.torus(0.73, 0.05, 0x0d1440, 0, y, -1.45, { rx: PI / 2, seg: 22 });
    t.cyl(0.74, 0.06, 0x0d1440, 0, 1.12, -1.45, { seg: 22 });
    t.box(0.95, 0.5, 0.05, WHITE, 0, -0.15, -2.16);
    t.cyl(0.14, 0.32, flame, 0, -0.16, -2.2, { axis: 'z', seg: 3, r2: 0.0, rz: 0 });
    t.cyl(0.16, 0.14, 0x424242, 0.35, 1.2, -1.45, { seg: 10 }); // bung
    for (const s of [-1, 1]) {
      t.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
      t.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
    }
    t.box(1.6, 0.12, 0.12, INK, 0, 0.0, -0.75);
  }
  hd.done();
  t.done();
  hands(h, key, 0x1a1a1a, 0xe0e0e0, level >= 3 ? (a, s) => star(a, s * 0.53, -0.42, 0, 0.2, shine, { rz: s * PI / 2 }) : null);
  legs(h, key, (b) => {
    for (const y of [-0.6, -1.0]) b.box(1.04, 0.2, 1.04, WHITE, 0, y, 0);
    b.box(1.06, 0.62, 1.08, 0x3e2723, 0, -1.66, 0.02, { r: 0.05 });
    b.box(1.1, 0.12, 1.2, INK, 0, -1.96, 0.06);
    b.box(1.08, 0.12, 1.1, 0xffd54f, 0, -1.4, 0.02); // boot band
  });
  const big = level >= 3;
  h.muzzles = [];
  for (const arm of [h.rightArm, h.leftArm]) {
    const g = fist(arm, -1.9, 1.15);
    const gk = wear(h, g, `${key}:gun`);
    const [y, z] = rifle(gk, { len: big ? 2.2 : 1.85, body: 0x262626, furn: big ? 0x37474f : 0x262626, mag: 'curved', optic: big ? 'dot' : 'iron' });
    if (big) gk.box(0.36, 0.16, 0.36, RED, 0, -1.25, UP, { r: 0.03 }); // red band round the handguard
    if (big) gk.box(0.04, 0.4, 0.06, WHITE, 0.17, -1.1, UP);
    gk.done();
    muzzle(h, g, y, z);
  }
  aimBoth(h);
  h.rightArm.rotation.z = 0.12;
  h.leftArm.rotation.z = -0.12;
  h.tracer = big ? 0xff8a80 : 0xffc107;
  return own(h);
}

// ------------------------------------------------------------------ Ruptor

/**
 * Ruptor (0-5): a heavy gunner with a burst cannon that grows and glows brighter every level.
 * Lv 1 a helmet with an orange visor, Lv 2 side coils on the cannon, Lv 3 heavy armour, Lv 4 a
 * power pack feeding the cannon, Lv 5 a glowing visor and prongs at the muzzle.
 */
export function makeRuptor(level) {
  const h = makeHumanoid({ skin: 0xc68642, shirt: 0x212121, pants: 0x1a1a1a, arms: 0x2b2b2b, face: 'soldier' });
  const key = `p19ruptor${level}`;
  const ORANGE = 0xef6c00;
  const coreC = level >= 5 ? 0xffd180 : level >= 3 ? 0xffab40 : 0xff9100;
  const core = glowMat(h, coreC, 0.6 + level * 0.08);
  h.body.scale.setScalar(1 + level * 0.02);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (level >= 1) {
    helmet(hd, 0x263238, { cover: 0x1a1a1a });
    visor(hd, level >= 5 ? core : ORANGE);
    hd.box(0.14, 0.5, 0.1, ORANGE, 0, 1.3, 0.6, { rx: -0.6 }); // stripe up the front
  } else {
    hair(hd, 0x1a1209, { h: 0.36 });
    headband(hd, ORANGE, 1.0);
  }
  collar(t, 0x2b2b2b, { buttons: false });
  belt(t, ORANGE, 0x212121);
  t.box(2.3, 0.08, 1.2, 0x141414, 0, -1.0, 0);
  sash(t, ORANGE, 1, 0.3); // ammo strap
  for (let i = 0; i < 5; i++) {
    const u = -0.8 + i * 0.4;
    t.box(0.22, 0.16, 0.12, 0x141414, -Math.sin(0.62) * u, Math.cos(0.62) * u, 0.6, { rz: 0.62 }); // cells on the strap
    t.box(0.12, 0.06, 0.04, core, -Math.sin(0.62) * u, Math.cos(0.62) * u, 0.67, { rz: 0.62 });
  }
  if (level >= 3) {
    // heavy armour: a chest plate with orange stripes and big pauldrons
    t.box(2.32, 1.3, 1.36, 0x2b2b2b, 0, 0.4, 0, { r: 0.16 });
    t.box(2.34, 0.14, 1.38, ORANGE, 0, 0.5, 0);
    for (let i = 0; i < 4; i++) t.box(0.06, 0.4, 0.04, INK, -0.6 + i * 0.4, 0.2, 0.69);
    shoulderPads(t, 0x2b2b2b, 0.66);
    for (const s of [-1, 1]) t.box(0.9, 0.1, 1.0, ORANGE, s * 1.45, 0.72, 0);
  }
  if (level >= 4) {
    // a power pack on the back with a glowing window and a cable over to the cannon arm
    t.box(1.6, 1.8, 0.9, 0x141414, 0, 0.1, -1.05, { r: 0.1 });
    t.box(0.9, 1.0, 0.06, core, 0, 0.2, -1.52);
    for (let i = 0; i < 3; i++) t.box(1.0, 0.06, 0.08, 0x141414, 0, -0.1 + i * 0.3, -1.55);
    for (const s of [-1, 1]) t.cyl(0.14, 1.6, 0x37474f, s * 0.6, 0.1, -1.55, { seg: 10 });
    t.tube([[-0.7, 0.6, -1.0], [-1.1, 0.4, -0.6], [-1.15, -0.2, 0.0]], 0.07, core, { seg: 12, sides: 6 });
  }
  hd.done();
  t.done();
  hands(h, key, 0x141414, 0x1a1a1a, level >= 3 ? (a) => a.box(1.14, 0.55, 1.14, 0x2b2b2b, 0, -0.32, 0, { r: 0.1 }) : null);
  feet(h, key, 0x141414, (b) => {
    b.box(1.1, 0.14, 1.12, ORANGE, 0, -1.36, 0.02);
    if (level >= 2) kneePad(b, 0x2b2b2b);
  });
  // the burst cannon
  const L = 2.2 + level * 0.25;
  const R = 0.4 + level * 0.04;
  const cz = UP + 0.1;
  const g = fist(h.rightArm, -1.9, 1.0);
  const gk = wear(h, g, `${key}:gun`);
  gk.cyl(R, L, 0x37474f, 0, -L / 2 + 0.4, cz, { seg: 18 }); // body
  gk.cyl(R + 0.06, 0.25, ORANGE, 0, -0.1, cz, { seg: 18 });
  gk.cyl(R + 0.06, 0.25, ORANGE, 0, -L + 0.8, cz, { seg: 18 });
  gk.cyl(R + 0.1, 0.3, 0x263238, 0, 0.45, cz, { seg: 18, r2: R }); // back cap
  const cs = 0.3 + level * 0.07; // the glowing core window grows each level
  gk.box(R * 1.2, cs * 2, 0.1, core, 0, -L / 2 + 0.3, cz + R - 0.02, { r: 0.03 });
  gk.box(R * 1.35, cs * 2 + 0.14, 0.06, INK, 0, -L / 2 + 0.3, cz + R - 0.06);
  for (const s of [-1, 1]) gk.box(0.06, 0.6, 0.2, INK, s * (R + 0.02), -L / 2 + 0.7, cz, { r: 0.02 }); // vents
  const br = 0.22 + level * 0.02;
  gk.cyl(br, 0.6, 0x141414, 0, -L + 0.1, cz, { seg: 14 }); // barrel
  gk.cyl(br + 0.08, 0.14, core, 0, -L - 0.25, cz, { seg: 14 }); // muzzle ring
  gk.cyl(br * 0.7, 0.03, 0x050505, 0, -L - 0.33, cz, { seg: 12 });
  gk.box(0.24, 0.3, 0.55, 0x141414, 0, 0.0, cz - R - 0.15, { rx: -0.3, r: 0.04 }); // grip
  gk.box(0.2, 0.22, 0.5, 0x141414, 0, -L / 2, cz - R - 0.1, { r: 0.04 }); // front handle
  gk.box(0.16, 0.8, 0.16, 0x141414, 0, -0.4, cz + R + 0.06); // top rail
  if (level >= 2) {
    // side coils: glowing tubes along the barrel
    for (const s of [-1, 1]) {
      gk.cyl(0.07, L * 0.55, core, s * (R + 0.08), -L / 2 + 0.1, cz, { seg: 8 });
      for (let i = 0; i < 4; i++) gk.box(0.12, 0.06, 0.12, INK, s * (R + 0.08), -L * 0.3 - i * 0.3, cz);
    }
  }
  if (level >= 5) for (const s of [-1, 1]) gk.box(0.15, 0.9, 0.15, 0x141414, s * 0.42, -L - 0.4, cz, { r: 0.04 }); // prongs
  gk.done();
  h.muzzles = [];
  muzzle(h, g, -L - 0.4, cz);
  aimLong(h);
  h.pose.leftRecoil = 0.3;
  h.recoilScale = 1.5;
  h.projectile = { color: coreC, size: 0.55 + level * 0.07, glowing: true };
  h.tracer = 0xff9100;
  return own(h, cz);
}

// ------------------------------------------------------------------ Spark

/**
 * Spark (0-5): a spark engineer with a sparkle cannon whose tip fizzes yellow-white. Lv 1
 * goggles, Lv 2 a signal antenna on the spark pack (reveals hidden), Lv 3 a bigger coiled
 * cannon, Lv 4 a glittering coat, Lv 5 a huge crackling orb. The orb turns.
 */
export function makeSpark(level) {
  level = Math.max(0, Math.min(5, level | 0));
  const top = level >= 4;
  const shirt = top ? 0x311b92 : 0x4527a0;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt, pants: 0x263238, arms: shirt, face: 'smile' });
  const key = `p19spark${level}`;
  const sparkC = 0xfff59d;
  const white = glowMat(h, 0xfffde7);
  const yellow = glowMat(h, 0xffeb3b);
  const redTip = glowMat(h, 0xff5252);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // hair standing on end, as if he touched the cannon
  const HAIR = 0xffca28;
  hair(hd, HAIR, { h: 0.46 });
  for (const [x, z, lx, lz] of [[-0.35, 0.25, -0.5, 0.3], [0.3, -0.1, 0.4, -0.2], [0, 0.4, 0, 0.5], [-0.15, -0.35, -0.2, -0.5], [0.4, 0.3, 0.6, 0.3], [-0.45, -0.1, -0.7, 0]]) {
    hd.cyl(0.17, 0.6, HAIR, x, 1.55, z, { seg: 6, r2: 0.01, rz: -lx, rx: lz });
  }
  if (level >= 1) goggles(hd, 0.98, glowMat(h, 0xffe082), { strap: 0x3e2723, frame: 0x5d4037 });
  // a work jacket: collar, zip, tool pockets and a lightning patch
  collar(t, tone(shirt, 0.8), { buttons: false });
  t.box(0.06, 1.7, 0.04, 0xbdbdbd, 0, 0.05, 0.52);
  pouch(t, 0.55, 0.3, 0.5, 0.45, 0.4, tone(shirt, 0.85), 0.08);
  t.plan([[-0.08, -0.2], [0.12, -0.02], [0.0, 0.0], [0.1, 0.2], [-0.12, 0.02], [0.0, 0.0]], 0.04, yellow, -0.55, 0.3, 0.52, { rx: PI / 2 });
  belt(t, 0x3e2723, 0xb0bec5);
  for (const x of [0.55, 0.8]) t.box(0.08, 0.4, 0.08, STEEL, x, -1.1, 0.6); // screwdriver and wrench on the belt
  t.box(0.2, 0.12, 0.08, STEEL, 0.8, -0.88, 0.6);
  // the spark pack: a box with a glowing window, a little coil on top and a cable to the cannon
  t.box(1.4, 1.5, 0.6, 0x37474f, 0, 0.1, -0.82, { r: 0.1 });
  t.box(0.6, 0.6, 0.06, yellow, 0, 0.25, -1.13, { r: 0.04 });
  t.box(0.76, 0.76, 0.04, INK, 0, 0.25, -1.12);
  for (const s of [-1, 1]) t.box(0.12, 1.3, 0.1, INK, s * 0.62, 0.1, -1.14); // ribs
  coil(t, -0.4, 1.0, -0.82, 0.24, 0.45, 4);
  t.ball(0.12, white, -0.4, 1.3, -0.82, { seg: 8, rows: 6 });
  t.tube([[0.5, -0.4, -0.82], [0.95, -0.7, -0.5], [1.15, -0.6, 0.0]], 0.06, 0x212121, { seg: 10, sides: 5 });
  for (const s of [-1, 1]) {
    t.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
    t.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
  }
  if (level >= 2) {
    // the signal antenna: a mast with cross bars and a red light (it reveals hidden enemies)
    t.cyl(0.06, 2.6, 0x9e9e9e, 0.45, 2.15, -0.85, { seg: 6 });
    for (let i = 0; i < 3; i++) {
      const y = 1.6 + i * 0.6;
      t.box(0.7 - i * 0.18, 0.05, 0.05, 0x9e9e9e, 0.45, y, -0.85);
      for (const s of [-1, 1]) t.ball(0.04, 0x9e9e9e, 0.45 + s * (0.35 - i * 0.09), y, -0.85, { seg: 6, rows: 4 });
    }
    t.ball(0.15, redTip, 0.45, 3.5, -0.85, { seg: 10, rows: 7 });
  }
  if (top) {
    // a glittering coat with sparkly studs
    const COAT = 0x1a237e;
    t.slab(2.16, 2.7, 0.16, COAT, 0, -0.4, -0.6, { bw: 1.12 });
    for (const s of [-1, 1]) t.slab(0.26, 2.7, 1.12, COAT, s * 1.0, -0.4, 0, { bw: 1.25, bx: s * 0.03 });
    for (const s of [-1, 1]) t.box(0.24, 1.2, 0.08, tone(COAT, 0.8), s * 0.82, 0.35, 0.55, { rz: s * 0.15 });
    for (const [x, y, z] of [[-0.85, 0.5, 0.6], [0.85, 0.2, 0.6], [-1.12, -0.4, 0.2], [1.12, -1.0, 0.3], [-1.12, -1.3, -0.2], [1.12, 0.3, -0.3]]) {
      t.ball(0.07, white, x, y, z, { seg: 6, rows: 4 });
    }
  }
  hd.done();
  t.done();
  hands(h, key, 0xfbc02d, tone(shirt, 0.8));
  feet(h, key, 0x263238, level >= 3 ? kneePad : null);
  // the sparkle cannon
  const len = level >= 3 ? 2.1 : 1.6;
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const z = UP + 0.04;
  gk.cyl(0.22, len - 0.2, 0x455a64, 0, -len / 2 + 0.1, z, { seg: 14 }); // barrel body
  gk.box(0.36, 0.7, 0.42, 0x37474f, 0, 0.2, z - 0.02, { r: 0.06 }); // back block
  gk.box(0.38, 0.2, 0.2, yellow, 0, 0.2, z + 0.2); // charge light
  gk.box(0.22, 0.26, 0.52, INK, 0, 0.15, UP - 0.34, { rx: -0.3, r: 0.04 }); // grip
  gk.torus(0.1, 0.022, INK, 0, -0.12, UP - 0.22, { ry: PI / 2, seg: 10, arc: PI });
  const n = level >= 3 ? 3 : 1;
  for (let i = 0; i < n; i++) coil(gk, 0, -0.6 - i * 0.42, z, 0.36, 0.34, 3);
  for (const s of [-1, 1]) gk.box(0.08, 0.5, 0.08, STEEL, s * 0.2, -len - 0.05, z, { rz: s * -0.3 }); // emitter forks
  if (level >= 5) for (const s of [-1, 1]) gk.cyl(0.06, 1.0, yellow, s * 0.42, -len + 0.1, z, { seg: 8 }); // side prongs
  gk.done();
  // the orb at the tip, turning
  const oy = -len - (level >= 5 ? 0.75 : 0.35);
  const orb = spinner(h, g, 0, oy, z);
  const ok = wear(h, orb, `${key}:orb`);
  const s = [0.45, 0.5, 0.55, 0.65, 0.75, 1.3][level] * 0.6;
  ok.ball(s, white, 0, 0, 0, { seg: 10, rows: 8 });
  ok.ball(s * 1.18, yellow, 0, 0, 0, { seg: 6, rows: 3, flat: true, rx: 0.5 });
  const rays = level >= 5 ? 10 : 4 + level;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * PI * 2;
    const rl = s * (level >= 5 ? 1.6 : 1.1);
    const r = s + rl / 2;
    ok.cyl(0.05, rl, i % 2 ? white : yellow, Math.cos(a) * r, Math.sin(a * 2) * r * 0.4, Math.sin(a) * r, { seg: 5, r2: 0.0, rz: a - PI / 2, rx: Math.sin(a * 2) * 0.4 });
  }
  if (level >= 5) {
    // a cage of lightning round the orb
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2;
      arc(ok, [Math.cos(a) * s * 1.3, -s * 1.2, Math.sin(a) * s * 1.3], [Math.cos(a + 1.2) * s * 1.3, s * 1.2, Math.sin(a + 1.2) * s * 1.3], white, 0.2, i + 1);
    }
  }
  ok.done();
  h.idleSpin = 2;
  h.muzzles = [];
  muzzle(h, g, oy, z);
  aimLong(h);
  h.tracer = sparkC;
  h.projectile = { color: sparkC, size: level >= 5 ? 0.9 : 0.5 };
  return own(h, z);
}

export const MODELS = {
  rockety: makeRockety,
  samurai: makeSamurai,
  hiredGun: makeHiredGun,
  outlaw: makeOutlaw,
  liberator: makeLiberator,
  ruptor: makeRuptor,
  spark: makeSpark,
};
