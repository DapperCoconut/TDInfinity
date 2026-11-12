// Tower models: people, batch 10 (dressed with the vehicle kit in ../vehicles.js).
// In here: Crook Boss, Mobster (+bottom), Ghost (+bottom), Toxicnator (+bottom), Saboteur,
// Necromancer. (Field Barracks: its camp is in machines7.js; the guard on it is the summoned
// unit's own model.)
// Each makeX(level) builds one tower's look; MODELS at the bottom says which tower uses which,
// and ../models.js lays it over TOWER_MODELS.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.

import * as THREE from 'three';
import { glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import {
  GOLD, GUNMETAL, INK, LEATHER, STEEL, UP, WOOD, aimBoth, aimLong, band, belt, boots, dome, fist, goggles, kneePad, muzzle, own, pistol, pouch, rifle, sash, shades, shardOf, vest, wear,
} from './people1.js';
import { duster, grenade, shoulderPads } from './people2.js';
import { balaclava, bandolier, smg } from './people3.js';
import { feet, hands, hood } from './people5.js';
import { fuelTanks, gasMask } from './people7.js';

const PI = Math.PI;
const BONE = 0xe8e4d0;
const TOX = 0x76ff03;
const PURPLE = 0xe040fb;

// ------------------------------------------------------------------ gangster gear

/** A fedora: a wide brim dipped at the front, a pinched crown with a crease and a band (head space). */
function fedora(k, col, bandCol, o = {}) {
  const y = 1.12;
  k.cyl(1.0, 0.06, col, 0, y, 0.05, { seg: 26, sz: 0.9, rx: 0.07 }); // brim
  k.torus(0.98, 0.035, tone(col, 0.82), 0, y + 0.03, 0.05, { rx: PI / 2 + 0.07, seg: 26, sy: 0.9 }); // rolled edge
  k.cyl(0.66, 0.6, col, 0, y + 0.32, 0, { r2: 0.55, sz: 0.88, seg: 20 }); // crown
  k.box(0.12, 0.08, 0.78, tone(col, 0.7), 0, y + 0.61, -0.02); // crease on top
  for (const s of [-1, 1]) k.box(0.08, 0.3, 0.2, tone(col, 0.8), s * 0.24, y + 0.44, 0.42, { rz: s * 0.3 }); // front pinches
  k.cyl(0.67, 0.16, bandCol, 0, y + 0.12, 0, { r2: 0.65, sz: 0.88, seg: 20 }); // band
  k.box(0.06, 0.16, 0.24, tone(bandCol, 0.8), 0.66, y + 0.12, -0.12); // bow
  if (o.feather) k.box(0.04, 0.4, 0.12, o.feather, 0.67, y + 0.32, -0.18, { rz: -0.35 });
}

/** A baggy flat cap with a button, seams and a short peak (head space). */
function flatCap(k, col) {
  k.ball(0.78, col, 0, 1.08, 0.05, { sy: 0.32, seg: 18, rows: 8 });
  k.cyl(0.7, 0.16, tone(col, 0.85), 0, 1.0, 0, { seg: 20 });
  k.ball(0.07, tone(col, 0.75), 0, 1.33, 0.05, { seg: 8, rows: 5 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    k.box(0.03, 0.04, 0.42, tone(col, 0.7), Math.sin(a) * 0.3, 1.305, 0.05 + Math.cos(a) * 0.3, { ry: a, rx: 0.25 });
  }
  k.plan([[-0.5, 0], [0.5, 0], [0.42, 0.36], [0, 0.46], [-0.42, 0.36]], 0.06, tone(col, 0.9), 0, 0.98, 0.56, { rx: -0.12 });
}

/** A cigar in the corner of the mouth, with a band and a glowing end (head space). */
function cigar(k, ember) {
  k.cyl(0.065, 0.5, 0x5d4037, 0.22, 0.28, 0.86, { axis: 'z', seg: 8, rx: 0.12 });
  k.cyl(0.07, 0.06, GOLD, 0.22, 0.29, 0.72, { axis: 'z', seg: 8, rx: 0.12 });
  k.cyl(0.066, 0.05, ember, 0.22, 0.25, 1.12, { axis: 'z', seg: 8, rx: 0.12 });
}

/**
 * A suit jacket over the chest block (torso space): the shirt's V, a tie, lapels, buttons,
 * pocket flaps, a hem over the hips. o: shirt, tie, square (pocket square), stripe (pinstripes), vest.
 */
function suitJacket(t, col, o = {}) {
  const dk = tone(col, 0.82);
  t.slab(0.72, 1.3, 0.06, o.shirt ?? 0xfafafa, 0, 0.35, 0.52, { bw: 0.2 }); // shirt V
  t.box(0.18, 0.16, 0.08, o.tie, 0, 0.9, 0.56, { r: 0.03 }); // tie knot
  t.slab(0.2, 1.05, 0.05, o.tie, 0, 0.3, 0.56, { tw: 0.7, bw: 1.3 }); // tie
  for (const s of [-1, 1]) {
    t.box(0.3, 1.25, 0.07, dk, s * 0.32, 0.38, 0.54, { rz: -s * 0.21 }); // lapels
    t.box(0.18, 0.12, 0.07, dk, s * 0.5, 0.82, 0.55, { rz: s * 0.5 }); // lapel notch
    t.box(0.5, 0.09, 0.08, dk, s * 0.55, -0.6, 0.54); // hip pocket flaps
  }
  for (const y of [-0.42, -0.75]) t.cyl(0.05, 0.04, tone(col, 0.55), 0.1, y, 0.53, { axis: 'z', seg: 8 }); // buttons
  t.box(0.03, 0.75, 0.03, tone(col, 0.6), 0.03, -0.65, 0.52); // closing line
  t.box(0.4, 0.05, 0.04, dk, 0.6, 0.42, 0.52); // breast pocket
  if (o.square != null) {
    t.box(0.3, 0.1, 0.05, o.square, 0.6, 0.5, 0.53);
    for (const x of [0.5, 0.62, 0.72]) t.box(0.07, 0.1, 0.04, o.square, x, 0.57, 0.53, { rz: 0.785 });
  }
  if (o.stripe != null) for (const z of [0.505, -0.505]) for (const x of [-0.85, -0.65, 0.65, 0.85]) t.box(0.025, 1.96, 0.02, o.stripe, x, 0, z);
  if (o.vest != null) for (const s of [-1, 1]) t.box(0.12, 0.9, 0.05, o.vest, s * 0.2, 0.1, 0.53, { rz: -s * 0.15 }); // waistcoat edges
  t.slab(2.1, 0.42, 1.1, col, 0, -1.1, 0, { bw: 1.04, bd: 1.08 }); // jacket hem over the hips
  t.box(0.04, 0.42, 0.04, dk, 0, -1.1, -0.58); // back vent
}

/** Polished shoes with the trouser hem over them (and spats), the same on both legs. */
function shoes(h, key, col, o = {}) {
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    b.box(1.05, 0.32, 1.24, col, 0, -1.84, 0.1, { r: 0.09 });
    b.box(1.08, 0.08, 1.28, INK, 0, -1.97, 0.1);
    b.box(0.6, 0.03, 0.4, tone(col, 1.6), 0, -1.67, 0.35); // shine
    if (o.spat != null) b.box(1.1, 0.24, 1.12, o.spat, 0, -1.6, 0.04, { r: 0.05 });
    if (o.pants != null) {
      b.box(1.08, 0.12, 1.08, o.pants, 0, -1.6, 0); // hem
      b.box(0.03, 1.4, 0.03, tone(o.pants, 0.75), 0, -0.85, 0.51); // crease
    }
    b.done();
  }
}

/** Shirt cuffs at the wrists (and a gold watch on the left), so the hands read as hands. */
function cuffs(h, key, cuff, sleeve, watch) {
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    a.box(1.04, 0.16, 1.04, cuff, 0, -1.52, 0, { r: 0.03 });
    a.box(1.05, 0.06, 1.05, sleeve, 0, -1.42, 0);
    for (let i = 0; i < 2; i++) a.cyl(0.04, 0.03, tone(sleeve, 0.6), s * 0.53, -1.3 + i * 0.12, 0.2, { axis: 'x', seg: 6 }); // sleeve buttons
    if (watch != null && s > 0) {
      a.box(1.06, 0.14, 1.06, watch, 0, -1.25, 0, { r: 0.02 });
      a.cyl(0.16, 0.06, watch, 0.54, -1.25, 0, { axis: 'x', seg: 12 });
      a.cyl(0.12, 0.02, 0xfafafa, 0.58, -1.25, 0, { axis: 'x', seg: 12 });
    }
    a.done();
  }
}

/** A Thompson gun (gun space): wood stock and grips, a drum mag, a finned barrel and a compensator. Returns [y, z]. */
function tommyGun(k, o = {}) {
  const metal = o.metal ?? GUNMETAL;
  const wood = o.wood ?? WOOD;
  const U = UP;
  k.slab(0.26, 0.8, 0.36, wood, 0, 0.6, U - 0.1, { td: 1.5, tz: -0.08 }); // stock
  k.box(0.28, 0.06, 0.56, INK, 0, 1.0, U - 0.15); // butt plate
  k.box(0.3, 1.0, 0.36, metal, 0, -0.3, U, { r: 0.04 }); // receiver
  k.box(0.04, 0.35, 0.12, INK, 0.16, -0.3, U + 0.05); // ejection port
  k.ball(0.07, tone(metal, 1.3), 0, -0.12, U + 0.22, { seg: 8, rows: 5 }); // cocking knob
  k.box(0.14, 0.1, 0.14, INK, 0, 0.12, U + 0.22); // rear sight
  k.box(0.22, 0.26, 0.5, wood, 0, 0.12, U - 0.38, { rx: -0.3, r: 0.05 }); // pistol grip
  k.torus(0.1, 0.022, INK, 0, -0.12, U - 0.24, { ry: PI / 2, seg: 10, arc: PI });
  // the drum, with rims, a hub and its winding key
  k.cyl(0.42, 0.24, tone(metal, 0.8), 0, -0.6, U - 0.52, { axis: 'x', seg: 22 });
  for (const s of [-1, 1]) k.cyl(0.44, 0.04, metal, s * 0.12, -0.6, U - 0.52, { axis: 'x', seg: 22 });
  k.cyl(0.12, 0.3, STEEL, 0, -0.6, U - 0.52, { axis: 'x', seg: 10 });
  k.box(0.06, 0.24, 0.06, STEEL, 0.17, -0.6, U - 0.52);
  // the barrel: cooling fins, a vertical fore grip and the compensator
  k.cyl(0.075, 1.15, STEEL, 0, -1.35, U + 0.02, { seg: 10 });
  for (let i = 0; i < 8; i++) k.torus(0.11, 0.025, metal, 0, -0.86 - i * 0.075, U + 0.02, { rx: PI / 2, seg: 12 });
  k.box(0.2, 0.22, 0.52, wood, 0, -1.0, U - 0.36, { rx: 0.25, r: 0.06 });
  for (let i = 0; i < 3; i++) k.box(0.22, 0.03, 0.04, tone(wood, 0.7), 0, -0.95 - i * 0.04, U - 0.25 - i * 0.12);
  k.box(0.18, 0.3, 0.2, metal, 0, -1.9, U + 0.02, { r: 0.03 }); // compensator
  for (const y of [-1.85, -1.95]) k.box(0.1, 0.03, 0.04, INK, 0, y, U + 0.12);
  k.box(0.04, 0.08, 0.12, INK, 0, -1.95, U + 0.17); // front sight
  if (o.trim != null) for (const y of [-0.0, -0.6]) k.box(0.32, 0.06, 0.38, o.trim, 0, y, U);
  return [-2.06, U + 0.02];
}

/** A Mac 10 (gun space): a boxy body, the long mag through the grip, a strap loop, a wire stock. Returns [y, z]. */
function mac10(k, o = {}) {
  const body = o.body ?? 0x263238;
  const U = UP;
  k.box(0.3, 0.95, 0.42, body, 0, -0.3, U, { r: 0.03 });
  k.box(0.04, 0.45, 0.12, INK, 0.16, -0.3, U + 0.06); // ejection port
  k.box(0.1, 0.12, 0.16, INK, 0, 0.0, U + 0.27); // cocking knob
  k.box(0.22, 0.26, 0.55, INK, 0, 0.02, U - 0.44, { r: 0.04 }); // grip
  k.box(0.17, 0.2, 0.42, 0x111111, 0, 0.02, U - 0.88); // mag poking out of the grip
  k.torus(0.1, 0.022, INK, 0, -0.22, U - 0.26, { ry: PI / 2, seg: 10, arc: PI });
  k.torus(0.08, 0.02, INK, 0, -0.65, U - 0.24, { ry: PI / 2, seg: 10 }); // strap loop
  for (const s of [-1, 1]) k.box(0.04, 0.5, 0.04, STEEL, s * 0.12, 0.35, U + 0.1); // folded wire stock
  k.box(0.28, 0.04, 0.12, STEEL, 0, 0.6, U + 0.1);
  let tip = -0.95;
  k.cyl(0.07, 0.25, STEEL, 0, -0.85, U + 0.04, { seg: 10 });
  if (o.can) {
    k.cyl(0.12, 0.85, INK, 0, -1.38, U + 0.04, { seg: 14 });
    for (let i = 0; i < 3; i++) k.torus(0.125, 0.015, 0x37474f, 0, -1.1 - i * 0.25, U + 0.04, { rx: PI / 2, seg: 12 });
    tip = -1.82;
  }
  return [tip, U + 0.04];
}

/** A briefcase of cash hanging from the fist (gun space, the arm down at the side). */
function briefcase(k, col, trim) {
  k.box(0.5, 1.0, 1.4, col, 0, -0.72, 0, { r: 0.06 });
  k.box(0.54, 0.06, 1.44, trim, 0, -0.24, 0); // brass edge along the top
  k.torus(0.18, 0.04, INK, 0, -0.15, 0, { ry: PI / 2, seg: 10, arc: PI }); // handle
  for (const z of [-0.4, 0.4]) k.box(0.42, 0.14, 0.18, trim, 0, -0.27, z, { r: 0.02 }); // latches
  for (const y of [-0.24, -1.2]) for (const z of [-0.68, 0.68]) k.box(0.42, 0.1, 0.1, trim, 0, y, z); // corners
  k.box(0.4, 0.04, 1.42, tone(col, 0.7), 0, -0.4, 0); // lid seam
  for (const z of [-0.45, -0.1, 0.25]) k.box(0.3, 0.14, 0.3, 0x2e7d32, 0, -0.3, z + 0.1, { rz: 0.2 }); // cash poking out
}

// ------------------------------------------------------------------ Crook Boss

/**
 * Crook Boss: a gangster in a pinstripe suit and a fedora. Lv 1 shades and a gold watch, Lv 2 a
 * pistol in each hand, Lv 3 a tommy gun, Lv 4 The Godfather: a white suit, a cigar, a red rose,
 * a gold belt and a gold tommy gun.
 */
export function makeCrookBoss(level) {
  const don = level >= 4;
  const cloth = don ? 0xeeeeee : 0x263238;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: cloth, pants: don ? 0xe0e0e0 : 0x1c2429, arms: cloth, face: 'soldier' });
  const key = `crookBoss${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  fedora(hd, don ? 0xfafafa : 0x212121, don ? 0x212121 : 0x8e0000);
  // slicked sideburns and a pencil moustache
  for (const s of [-1, 1]) hd.box(0.06, 0.3, 0.2, 0x1a1209, s * 0.63, 0.75, 0.15);
  hd.box(0.36, 0.06, 0.05, 0x1a1209, 0, 0.4, 0.63);
  if (level >= 1) shades(hd, don ? GOLD : 0x0a0a0a, 0x111111);
  if (don) cigar(hd, glowMat(h, 0xff6d00));
  suitJacket(t, cloth, {
    shirt: don ? 0x212121 : 0xfafafa, tie: don ? 0xb71c1c : 0x8e0000,
    square: don ? 0xb71c1c : 0xfafafa, stripe: don ? null : 0x546e7a,
  });
  if (don) {
    // a red rose on the lapel and a gold belt
    t.ball(0.14, 0xd50000, 0.62, 0.62, 0.6, { seg: 10, rows: 7 });
    t.box(0.04, 0.3, 0.04, 0x2e7d32, 0.62, 0.42, 0.58);
    t.box(2.12, 0.18, 1.12, GOLD, 0, -0.86, 0, { r: 0.03 });
    t.box(0.4, 0.26, 0.06, GOLD, 0, -0.86, 0.58, { r: 0.03 });
  } else belt(t, 0x111111, 0xb0b0b0);
  hd.done();
  t.done();
  cuffs(h, key, don ? 0x212121 : 0xfafafa, tone(cloth, 0.85), level >= 1 ? GOLD : null);
  shoes(h, key, don ? 0xfafafa : 0x111111, { pants: don ? 0xe0e0e0 : 0x1c2429, spat: don ? 0x212121 : level >= 1 ? 0xeeeeee : null });
  h.muzzles = [];
  if (level >= 3) {
    // Tommy Goons: the boss carries a tommy gun himself (gold at The Godfather)
    const g = fist(h.rightArm, -1.9, 1.2);
    const gk = wear(h, g, `${key}:gun`);
    const [y, z] = tommyGun(gk, don ? { metal: GOLD, wood: 0x4e342e } : {});
    gk.done();
    muzzle(h, g, y, z);
    aimLong(h);
    h.recoilScale = 0.4;
  } else {
    for (const arm of level >= 2 ? [h.rightArm, h.leftArm] : [h.rightArm]) {
      const g = fist(arm, -1.9, 1.3);
      const gk = wear(h, g, `${key}:gun`);
      const [y, z] = pistol(gk, { len: 1.0, body: 0x37474f, grip: 0x4e342e, trim: level >= 1 ? GOLD : null });
      gk.done();
      muzzle(h, g, y, z);
    }
    if (level >= 2) aimBoth(h);
    else {
      h.rightArm.rotation.set(-PI / 2, 0, 0.05);
      h.leftArm.rotation.set(-0.3, 0, -0.15);
      h.pose = { right: -PI / 2, left: -0.3, leftRecoil: 0 };
    }
  }
  h.tracer = don ? 0xffd740 : 0xffca28;
  return own(h, level >= 3 ? UP : 0.3);
}

// ------------------------------------------------------------------ Mobster

/**
 * Mobster: a gangster in a jacket and flat cap. Top path: a bullet bandolier (Lv 1), a cigar
 * (Lv 2), two Mac 10s (Lv 3), an armored vest and silenced Macs (Lv 4), then the Mafia Army: a
 * red suit, a fedora and a gold tommy gun (Lv 5). Bottom path: a long-barrel pistol (Lv 1),
 * tactical visors (Lv 2), a trench coat and fedora (Lv 3), a briefcase of cash (Lv 4), then the
 * Mafia Boss in a white suit with a gold pistol (Lv 5).
 */
export function makeMobster(level, bottom = false) {
  const top = !bottom;
  const boss = bottom && level >= 5;
  const army = top && level >= 5;
  const coat = boss ? 0xeeeeee : army ? 0x8e0000 : bottom && level >= 3 ? 0x5d4037 : 0x455a64;
  const pants = boss ? 0xe0e0e0 : 0x212121;
  const h = makeHumanoid({ skin: 0xd7a26b, shirt: coat, pants, arms: coat, face: 'soldier' });
  const key = `mobster${bottom ? 'B' : 'T'}${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // stubble along the jaw
  hd.box(0.9, 0.18, 0.04, tone(0xd7a26b, 0.75), 0, 0.2, 0.6);
  if (boss) fedora(hd, 0xfafafa, GOLD, { feather: 0xd32f2f });
  else if (army || (bottom && level >= 3)) fedora(hd, 0x212121, 0x8e0000);
  else flatCap(hd, 0x37474f);
  if ((top && level >= 2) || boss) cigar(hd, glowMat(h, 0xff6d00));
  if (bottom && level >= 2) {
    // Advanced Visors: a wrap-round visor with green lenses
    band(hd, 0.67, 0.07, 0.24, 2.0, INK, 0.74);
    band(hd, 0.74, 0.03, 0.2, 1.7, glowMat(h, 0x76ff03), 0.74);
  }
  suitJacket(t, coat, {
    shirt: boss ? 0x212121 : 0xeeeeee, tie: boss ? GOLD : army ? 0x111111 : 0x37474f,
    square: boss || army ? 0xfafafa : null, vest: army || boss ? null : 0x263238,
  });
  belt(t, 0x111111, boss ? GOLD : 0xb0b0b0);
  if (top && level >= 1 && !army) bandolier(t, 1, 0x3e2723);
  if (top && level >= 4) {
    // Upgraded Henchmen: an armored vest over the jacket
    vest(t, 0x424242, { pouches: 3, pouch: 0x303030 });
    if (army) shoulderPads(t, 0x5d0000, 0.55);
  }
  if (army) bandolier(t, -1, 0x3e2723);
  if (bottom && level >= 3) duster(t, boss ? 0xfafafa : 0x5d4037, { trim: boss ? GOLD : null });
  hd.done();
  t.done();
  cuffs(h, key, boss ? 0x212121 : 0xeeeeee, tone(coat, 0.85), boss ? GOLD : null);
  shoes(h, key, boss ? 0xfafafa : 0x1a1a1a, { pants, spat: boss ? 0x212121 : null });
  h.muzzles = [];
  if (army) {
    const g = fist(h.rightArm, -1.9, 1.2);
    const gk = wear(h, g, `${key}:gun`);
    const [y, z] = tommyGun(gk, { metal: GOLD, wood: 0x4e342e, trim: 0xb71c1c });
    gk.done();
    muzzle(h, g, y, z);
    aimLong(h);
    h.recoilScale = 0.4;
  } else if (top && level >= 3) {
    // Mac 10: an SMG in each hand (silenced from Lv 4)
    for (const arm of [h.rightArm, h.leftArm]) {
      const g = fist(arm, -1.9, 1.25);
      const gk = wear(h, g, `${key}:gun`);
      const [y, z] = mac10(gk, { can: level >= 4 });
      gk.done();
      muzzle(h, g, y, z);
    }
    aimBoth(h);
  } else {
    const g = fist(h.rightArm, -1.9, 1.3);
    const gk = wear(h, g, `${key}:gun`);
    const [y, z] = pistol(gk, bottom && level >= 1
      ? { len: 1.55, body: boss ? GOLD : 0x2b2b2b, grip: boss ? 0xfff8e1 : 0x4e342e, laser: level >= 2 ? glowMat(h, 0x76ff03) : null }
      : { len: 1.0, body: 0x37474f, grip: 0x4e342e });
    gk.done();
    muzzle(h, g, y, z);
    const down = bottom && level >= 4;
    if (down) {
      // Life Insurance: a briefcase of cash in the left hand
      const c = fist(h.leftArm, -1.9, 1);
      const ck = wear(h, c, `${key}:case`);
      briefcase(ck, boss ? 0xfafafa : 0x3e2723, boss ? GOLD : 0xb0b0b0);
      ck.done();
    }
    h.rightArm.rotation.set(-PI / 2, 0, 0.05);
    h.leftArm.rotation.set(down ? 0 : -0.3, 0, -0.15);
    h.pose = { right: -PI / 2, left: down ? 0 : -0.3, leftRecoil: 0 };
  }
  h.tracer = boss || army ? 0xffd740 : 0xffca28;
  return own(h, army ? UP : 0.3);
}
export const makeMobsterBottom = (level) => makeMobster(level, true);

// ------------------------------------------------------------------ Ghost

/** The C7 drone: a quadcopter with four spinning rotors, a camera and skids (hidden until its ability is on). */
function c7Drone(h, key, xg, green) {
  const drone = new THREE.Group();
  const body = xg ? 0x263238 : 0x37474f;
  const k = wear(h, drone, `${key}:drone`);
  k.box(0.9, 0.3, 1.1, body, 0, 0, 0, { r: 0.1 });
  k.box(0.6, 0.12, 0.7, tone(body, 0.8), 0, 0.2, -0.05, { r: 0.05 }); // battery
  for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
    k.box(0.12, 0.08, 1.15, INK, x / 2, 0.05, z / 2, { ry: Math.atan2(x, z) }); // arm
    k.cyl(0.13, 0.22, INK, x, 0.12, z, { seg: 10 }); // motor
    k.cyl(0.06, 0.04, green, x, -0.02, z, { seg: 8 }); // nav light
  }
  k.ball(0.17, INK, 0, -0.22, 0.45, { seg: 10, rows: 7 }); // camera ball
  k.cyl(0.08, 0.04, green, 0, -0.22, 0.62, { axis: 'z', seg: 10 });
  for (const s of [-1, 1]) {
    k.box(0.05, 0.3, 0.05, INK, s * 0.35, -0.3, 0);
    k.cyl(0.04, 0.9, INK, s * 0.35, -0.45, 0, { axis: 'z', seg: 6 }); // skid
  }
  if (xg) {
    k.box(0.3, 0.24, 0.6, 0x111316, 0, -0.32, 0.05, { r: 0.04 }); // X-Ghost gun pod
    k.cyl(0.05, 0.4, STEEL, 0, -0.34, 0.5, { axis: 'z', seg: 8 });
  }
  k.done();
  const rotors = [];
  for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
    const r = new THREE.Group();
    r.position.set(x, 0.26, z);
    drone.add(r);
    const rk = wear(h, r, `${key}:rotor`);
    rk.box(0.95, 0.03, 0.12, 0x212121, 0, 0, 0, { r: 0.01 });
    rk.cyl(0.05, 0.06, STEEL, 0, 0.02, 0, { seg: 8 });
    rk.done();
    rotors.push(r);
  }
  drone.userData.rotors = rotors;
  drone.visible = false;
  h.root.add(drone);
  h.drone = drone;
}

/**
 * Ghost: a stealth operative in dark gear with a compact SMG. Top path: Lv 1 green eye-sensor
 * goggles and a laser sight, Lv 2 a longer magazine, Lv 3 a hooded stealth cloak, Lv 4 a drone
 * dock on the back (the C7 Drone circles overhead while its ability is on), Lv 5 X-Ghost armor
 * with a glowing visor. Bottom path: Lv 1 ammo pouches, Lv 2 a longer barrel, Lv 3 the Honey
 * Badger rifle with a suppressor and a plate carrier, Lv 4 smoke grenades on the chest, Lv 5
 * heavy armor and a red visor.
 */
export function makeGhost(level, bottom = false) {
  const top = !bottom;
  const cloak = top && level >= 3;
  const xg = top && level >= 5;
  const heavy = bottom && level >= 5;
  const shirt = cloak ? 0x15181d : 0x2b3038;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: 0x1c1f24, arms: shirt, face: 'soldier' });
  const key = `ghost${bottom ? 'B' : 'T'}${level}`;
  const green = glowMat(h, 0x76ff03);
  const red = glowMat(h, 0xff1744);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  balaclava(hd, 0x202328);
  dome(hd, 0.7, 0.44, 0x202328, 0, 0.93, -0.02); // covers the round head top
  if (cloak) {
    hood(hd, 0x0e1013);
    // the stealth cloak: a cape from the shoulders with a shimmering edge
    t.slab(2.3, 2.9, 0.12, 0x0e1013, 0, -0.55, -0.62, { bw: 1.15 });
    for (const s of [-1, 1]) t.box(0.06, 2.8, 0.06, glowMat(h, 0x4dd0e1, 0.6), s * 1.2, -0.55, -0.66);
    t.box(2.3, 0.3, 1.2, 0x0e1013, 0, 0.92, -0.05, { r: 0.08 }); // shoulder fold
  } else {
    // a ponytail out of the back of the balaclava
    hd.tube([[0, 0.95, -0.62], [0, 0.7, -0.85], [0, 0.25, -0.82]], 0.13, 0x1a1209, { seg: 10, sides: 7 });
    hd.torus(0.12, 0.04, 0x37474f, 0, 0.9, -0.66, { seg: 10, rx: 0.4 });
  }
  if (xg) {
    // X-Ghost: a full visor with a glowing strip
    band(hd, 0.7, 0.07, 0.34, 2.1, 0x111316, 0.74);
    band(hd, 0.77, 0.03, 0.14, 1.8, green, 0.76);
  } else if (top && level >= 1) {
    // Eye Sensor: goggles with green lenses
    goggles(hd, 0.74, green, { r: 0.69, frame: 0x111316 });
    hd.box(0.18, 0.18, 0.14, INK, 0.36, 0.95, 0.6, { r: 0.03 }); // sensor box
    hd.cyl(0.04, 0.03, green, 0.36, 0.95, 0.68, { axis: 'z', seg: 8 });
  }
  if (heavy) {
    band(hd, 0.7, 0.07, 0.34, 2.1, 0x1a1d22, 0.74);
    band(hd, 0.77, 0.03, 0.14, 1.8, red, 0.76);
  }
  // a light chest rig, a belt with pouches and a knife on the left shoulder strap
  belt(t, INK, 0x37474f);
  for (const x of [-0.65, 0.65]) pouch(t, x, -1.0, 0.52, 0.34, 0.3, 0x4a515c, 0.18);
  t.box(0.1, 0.5, 0.08, INK, 0.5, 0.45, 0.58, { r: 0.02 }); // knife sheath
  t.box(0.08, 0.2, 0.06, 0x37474f, 0.5, 0.78, 0.58);
  if ((bottom && level >= 3) || xg || heavy) {
    const pc = heavy ? 0x1a1d22 : xg ? 0x23282f : 0x30353d;
    vest(t, pc, { pouches: bottom && level >= 1 ? 3 : 2, pouch: tone(pc, 0.85) });
  } else {
    for (const s of [-1, 1]) t.box(0.24, 2.0, 0.08, INK, s * 0.5, 0.05, 0.55); // harness straps
    t.box(1.2, 0.5, 0.18, 0x3a404a, 0, 0.25, 0.6, { r: 0.05 }); // chest rig
    const n = bottom && level >= 1 ? 3 : 2;
    for (let i = 0; i < n; i++) pouch(t, (i - (n - 1) / 2) * 0.4, 0.15, 0.68, 0.32, 0.36, 0x4a515c, 0.16);
  }
  if (bottom && level >= 4) for (const x of [-0.55, 0, 0.55]) grenade(t, x, 0.55, 0.8, 0x7e57c2); // Stealth Grenades
  if (xg || heavy) {
    shoulderPads(t, heavy ? 0x1a1d22 : 0x23282f, 0.55);
    for (const s of [-1, 1]) t.box(0.3, 0.06, 0.05, xg ? green : red, s * 0.45, 0.6, 0.8);
  }
  if (top && level >= 4) {
    // the drone dock on the back: a cradle with landing lights
    t.box(1.4, 1.2, 0.5, 0x37474f, 0, 0.3, -0.8, { r: 0.08 });
    t.box(1.5, 0.12, 0.7, INK, 0, 0.95, -0.85, { r: 0.03 });
    t.box(1.0, 0.08, 0.04, green, 0, 0.6, -1.06);
    for (const s of [-1, 1]) t.cyl(0.06, 0.04, green, s * 0.6, 1.02, -0.85, { seg: 8 });
    t.cyl(0.03, 0.6, INK, 0.55, 1.4, -0.75, { seg: 6 }); // antenna
  }
  hd.done();
  t.done();
  hands(h, key, 0x111316, tone(shirt, 0.8), xg || heavy ? (a) => a.box(1.1, 0.55, 1.1, heavy ? 0x1a1d22 : 0x23282f, 0, -0.35, 0, { r: 0.1 }) : null);
  for (const [leg, s] of [[h.rightLeg, -1], [h.leftLeg, 1]]) {
    const b = wear(h, leg, `${key}:leg${s}`);
    boots(b, 0x111316);
    if (level >= 2 || heavy) kneePad(b, 0x23282f);
    if (s < 0) {
      // a thigh holster with its pistol on the right leg
      b.box(0.24, 0.62, 0.55, INK, -0.6, -0.6, 0.05, { r: 0.04 });
      b.box(0.2, 0.26, 0.3, 0x2b2b2b, -0.6, -0.2, -0.05, { r: 0.03 });
      for (const y of [-0.45, -0.8]) b.box(1.06, 0.08, 1.06, INK, 0, y, 0);
    }
    b.done();
  }
  if (top && level >= 4) c7Drone(h, key, xg, green);
  // compact SMG on top; a longer rifle on the Bottom path (the Honey Badger from Lv 3)
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  let tip;
  if (bottom && level >= 2) {
    tip = rifle(gk, level >= 3
      ? { len: 2.3, body: 0x3a3a32, furn: 0x6d5d45, mag: 'curved', can: true, optic: 'dot', lens: heavy ? 0xff1744 : 0x76ff03 }
      : { len: 2.0, furn: 0x2b2b2b, mag: 'box', optic: 'iron' });
  } else {
    tip = smg(gk, {});
    if (top && level >= 2) gk.box(0.17, 0.24, 0.5, INK, 0, -0.38, UP - 1.05, { r: 0.03 }); // extended magazine
    if (top && level >= 1) {
      gk.box(0.14, 0.24, 0.16, INK, 0.2, -0.85, UP, { r: 0.03 }); // laser box
      gk.cyl(0.04, 0.03, green, 0.2, -0.98, UP, { seg: 8 });
    }
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tip[0], tip[1]);
  aimLong(h);
  h.tracer = top && level >= 1 ? 0xccff90 : 0xffe066;
  return own(h);
}
export const makeGhostBottom = (level) => makeGhost(level, true);

// ------------------------------------------------------------------ Toxicnator and Saboteur

/** Toxic grenade launcher (gun space): stock, receiver, a fat barrel with a glowing band; o.drum: the MGL's revolving drum. Returns [y, z]. */
function toxLauncher(k, tox, o = {}) {
  const U = UP;
  const B = U + 0.06;
  const body = o.body ?? 0x37474f;
  k.box(0.26, 0.7, 0.38, 0x263238, 0, 0.5, U - 0.08, { r: 0.07 }); // stock
  k.box(0.28, 0.08, 0.44, INK, 0, 0.88, U - 0.08);
  k.box(0.22, 0.26, 0.5, INK, 0, 0.08, U - 0.34, { rx: -0.32, r: 0.04 }); // grip
  k.torus(0.1, 0.022, INK, 0, -0.16, U - 0.24, { ry: PI / 2, seg: 10, arc: PI });
  k.box(0.34, 0.55, 0.4, body, 0, -0.1, U, { r: 0.05 }); // receiver
  let b0 = -0.38;
  if (o.drum) {
    // the MGL's six-shot drum with its spring housing
    k.cyl(0.46, 0.65, tone(body, 1.2), 0, -0.7, B - 0.1, { seg: 18 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      k.cyl(0.12, 0.67, tox, Math.sin(a) * 0.3, -0.7, B - 0.1 + Math.cos(a) * 0.3, { seg: 8 });
    }
    k.cyl(0.1, 0.75, STEEL, 0, -0.7, B - 0.1, { seg: 8 });
    k.cyl(0.48, 0.06, INK, 0, -0.38, B - 0.1, { seg: 18 });
    b0 = -1.03;
  }
  const len = o.len ?? 2.0;
  const bl = len + b0;
  k.cyl(0.27, bl, 0x455a64, 0, b0 - bl / 2, B, { seg: 16 }); // fat barrel
  k.cyl(0.2, 0.04, 0x050505, 0, -len - 0.01, B, { seg: 14 }); // bore
  k.cyl(0.285, 0.12, tox, 0, -len + 0.2, B, { seg: 16 }); // glowing band
  for (let i = 0; i < 2; i++) k.torus(0.28, 0.02, INK, 0, b0 - 0.25 - i * 0.2, B, { rx: PI / 2, seg: 14 });
  k.box(0.18, 0.2, 0.45, INK, 0, b0 - 0.3, U - 0.28, { r: 0.04 }); // fore grip
  k.box(0.2, 0.36, 0.1, INK, 0, -0.2, B + 0.3, { rx: -0.35 }); // leaf sight
  // a glowing canister clipped on the side
  k.cyl(0.13, 0.5, tox, 0.32, -0.15, U + 0.02, { seg: 10 });
  for (const s of [-1, 1]) k.cyl(0.14, 0.06, STEEL, 0.32, -0.15 + s * 0.26, U + 0.02, { seg: 10 });
  return [-len, B];
}

/** A biohazard badge: a dark disc with three glowing rings (torso space, on the chest). */
function bioBadge(t, x, y, mat) {
  t.cyl(0.26, 0.04, INK, x, y, 0.53, { axis: 'z', seg: 16 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    t.torus(0.08, 0.025, mat, x + Math.sin(a) * 0.1, y + Math.cos(a) * 0.1, 0.56, { seg: 10 });
  }
  t.torus(0.18, 0.02, mat, x, y, 0.56, { seg: 16 });
}

/**
 * Toxicnator: a hazmat suit with a hood, a gas mask and a grenade launcher. Top path: Lv 1 a
 * filter pack, Lv 2 a belt of toxic grenades, Lv 3 the MGL's revolving drum, Lv 4 a speed-loader
 * bandolier and goggles on the hood, Lv 5 glowing toxic tanks on the back. Bottom path: Lv 1
 * shoulder pads, Lv 2 a dose canister with a gauge on the hip, Lv 3 orange Anthrax canisters,
 * Lv 4 acid-green mask lenses, Lv 5 glowing Gamma Toxins tanks.
 */
export function makeToxicnator(level, bottom = false) {
  const top = !bottom;
  const gamma = bottom && level >= 5;
  const suitC = gamma ? 0x3f5f22 : top && level >= 5 ? 0x9e9d24 : 0xc0ca33;
  const h = makeHumanoid({ skin: 0x8d6e63, shirt: suitC, pants: suitC, arms: suitC, face: 'soldier' });
  const key = `toxicnator${bottom ? 'B' : 'T'}${level}`;
  const tox = glowMat(h, gamma ? PURPLE : TOX);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hood(hd, suitC);
  gasMask(hd, 0x263238, bottom && level >= 4 ? tox : 0x80cbc4);
  for (const s of [-1, 1]) {
    // two side filters on the mask
    hd.cyl(0.18, 0.3, 0x455a64, s * 0.42, 0.25, 0.68, { axis: 'z', seg: 12, ry: s * 0.6 });
    hd.cyl(0.19, 0.05, INK, s * 0.5, 0.25, 0.8, { axis: 'z', seg: 12, ry: s * 0.6 });
  }
  if (top && level >= 4) goggles(hd, 1.2, tox, { r: 0.68, strap: 0x33691e }); // pushed up on the hood
  // the suit: a zip flap, taped seams, a hazard badge and a utility belt
  t.box(0.22, 1.9, 0.06, tone(suitC, 0.85), 0.1, 0, 0.52);
  t.box(0.05, 1.8, 0.03, STEEL, 0.03, 0, 0.55);
  t.box(2.08, 0.12, 1.08, tone(suitC, 0.75), 0, 0.92, 0); // collar tape
  bioBadge(t, -0.5, 0.45, tox);
  belt(t, 0x33691e, 0x9e9e9e);
  pouch(t, 0.62, -1.0, 0.52, 0.36, 0.32, 0x5d6b2f, 0.18);
  if (top && level >= 1 && level < 5) {
    // Toxic Research: a filter pack with two round filters
    t.box(1.3, 1.25, 0.5, 0x5d6b2f, 0, 0.2, -0.78, { r: 0.08 });
    for (const x of [-0.35, 0.35]) {
      t.cyl(0.26, 0.24, 0x455a64, x, 0.3, -1.12, { axis: 'z', seg: 14 });
      t.cyl(0.18, 0.04, INK, x, 0.3, -1.25, { axis: 'z', seg: 14 });
    }
    t.tube([[0, 0.85, -0.78], [0, 1.25, -0.55], [0, 1.15, -0.1]], 0.07, 0x212121, { seg: 10, sides: 6 }); // hose to the mask
  }
  if (top && level >= 2) for (const x of [-0.6, 0, 0.6]) {
    // Advanced Nades: toxic grenades on the belt
    t.ball(0.16, 0x33691e, x, -1.12, 0.66, { seg: 10, rows: 7, sy: 1.2 });
    t.cyl(0.165, 0.06, tox, x, -1.12, 0.66, { seg: 10 });
    t.cyl(0.07, 0.08, STEEL, x, -0.92, 0.66, { seg: 8 });
  }
  if (top && level >= 4) {
    // Speed Loader: a bandolier of toxic rounds
    sash(t, 0x4e342e, -1, 0.3);
    for (const v of [-0.6, 0, 0.6]) t.cyl(0.12, 0.3, tox, Math.sin(0.62) * v, Math.cos(0.62) * v, 0.66, { seg: 10, rz: -0.62 });
  }
  if (top && level >= 5) fuelTanks(t, [-0.42, 0.42], 0.32, 1.8, 0x33691e, { y: 0.1, stripe: tox });
  if (bottom && level >= 1) shoulderPads(t, 0x827717, 0.58);
  if (bottom && level >= 2) {
    // Higher Dose: a dose canister with a gauge on the right hip, and a line to the gun
    t.cyl(0.22, 0.6, 0xeceff1, -1.18, -0.75, 0.15, { seg: 12 });
    t.cyl(0.23, 0.1, tox, -1.18, -0.6, 0.15, { seg: 12 });
    t.cyl(0.14, 0.05, 0xfafafa, -1.3, -0.95, 0.38, { axis: 'z', seg: 12, ry: -0.5 });
    t.box(0.02, 0.1, 0.02, 0xd32f2f, -1.3, -0.93, 0.41, { rz: 0.6 });
  }
  if (bottom && level >= 3) {
    // Anthrax canisters (Gamma Toxins: purple and glowing)
    const can = gamma ? 0x4a148c : 0xef6c00;
    fuelTanks(t, [-0.42, 0.42], 0.3, 1.6, can, { y: 0.1, stripe: gamma ? tox : 0x212121 });
    for (const x of [-0.42, 0.42]) t.box(0.28, 0.28, 0.04, gamma ? tox : 0xfdd835, x, 0.1, -1.21); // warning labels
  }
  hd.done();
  t.done();
  hands(h, key, 0x212121, tone(suitC, 0.8), (a) => a.box(1.05, 0.1, 1.05, 0x212121, 0, -1.45, 0)); // taped gloves
  feet(h, key, 0x263238, (b) => b.box(1.1, 0.1, 1.1, 0x212121, 0, -1.3, 0.02)); // taped boots
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = toxLauncher(gk, tox, { drum: top && level >= 3, body: gamma ? 0x311b92 : 0x37474f });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.projectile = { color: gamma ? PURPLE : TOX, size: 0.5, arc: 3.5 };
  h.tracer = TOX;
  return own(h);
}
export const makeToxicnatorBottom = (level) => makeToxicnator(level, true);

/** A sawn-off shotgun (gun space): side-by-side barrels, a cut-down stock, a poison canister underneath. Returns [y, z]. */
function sawnOff(k, tox, o = {}) {
  const U = UP;
  const len = o.len ?? 1.6;
  const B = U + 0.05;
  k.box(0.24, 0.5, 0.5, WOOD, 0, 0.28, U - 0.25, { rx: -0.5, r: 0.07 }); // cut-down stock
  k.box(0.26, 0.06, 0.4, tone(WOOD, 0.6), 0, 0.5, U - 0.36, { rx: -0.5 });
  k.box(0.32, 0.55, 0.36, GUNMETAL, 0, -0.18, U, { r: 0.04 }); // action
  k.cyl(0.06, 0.38, STEEL, 0, -0.42, U - 0.1, { axis: 'x', seg: 8 }); // hinge pin
  for (const s of [-1, 1]) k.box(0.06, 0.12, 0.1, INK, s * 0.08, 0.06, U + 0.2, { rx: 0.4 }); // hammers
  k.torus(0.1, 0.022, INK, 0, -0.08, U - 0.24, { ry: PI / 2, seg: 10, arc: PI });
  const xs = o.wide ? [-0.2, 0, 0.2] : [-0.1, 0.1];
  const bl = len - 0.45;
  for (const x of xs) {
    k.cyl(0.1, bl, STEEL, x, -0.45 - bl / 2, B, { seg: 12 });
    k.cyl(0.065, 0.02, 0x050505, x, -len - 0.01, B, { seg: 10 });
  }
  k.box(0.05, bl, 0.06, tone(STEEL, 0.7), 0, -0.45 - bl / 2, B + 0.1); // rib
  k.box(0.32, 0.55, 0.2, WOOD, 0, -0.75, U - 0.12, { r: 0.05 }); // fore end
  for (const y of [-1.1, -1.35]) k.box(xs.length * 0.2 + 0.08, 0.08, 0.26, 0x9e9e9e, 0, y, B, { r: 0.02 }); // tape
  k.cyl(0.14, 0.55, tox, 0, -1.05, U - 0.25, { seg: 12 }); // poison canister
  for (const s of [-1, 1]) k.cyl(0.15, 0.06, STEEL, 0, -1.05 + s * 0.28, U - 0.25, { seg: 12 });
  if (o.drum) {
    k.cyl(0.34, 0.24, 0x546e7a, 0, -0.38, U - 0.5, { axis: 'x', seg: 18 });
    k.cyl(0.18, 0.26, tox, 0, -0.38, U - 0.5, { axis: 'x', seg: 14 });
  }
  return [-len, B];
}

/**
 * Saboteur (alternate Toxicnator): a hooded black-market operative with a sawn-off poison
 * shotgun and a purple shard emblem. Lv 1 a respirator, Lv 2 a toxic drum magazine and tanks on
 * the back, Lv 3 grenades on a bandolier, Lv 4 the Neural-Runner's glowing visor, darker gear
 * and a three-barrel gun.
 */
export function makeSaboteur(level) {
  const runner = level >= 4;
  const shirt = runner ? 0x1b1f2a : 0x2e3b2a;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: 0x1c1f24, arms: shirt, face: 'soldier' });
  const key = `saboteur${level}`;
  const tox = glowMat(h, runner ? PURPLE : TOX);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hood(hd, runner ? 0x14161c : 0x253022);
  if (level >= 1) {
    // Scam Artist: a half-face respirator with two filters
    band(hd, 0.66, 0.07, 0.42, 2.0, INK, 0.25);
    for (const s of [-1, 1]) {
      hd.cyl(0.15, 0.24, 0x455a64, s * 0.26, 0.22, 0.72, { axis: 'z', seg: 12, ry: s * 0.35 });
      hd.cyl(0.155, 0.04, tox, s * 0.29, 0.22, 0.83, { axis: 'z', seg: 12, ry: s * 0.35 });
    }
  }
  if (runner) {
    band(hd, 0.69, 0.06, 0.26, 2.0, INK, 0.74);
    band(hd, 0.75, 0.03, 0.12, 1.7, tox, 0.75);
    hd.box(0.2, 0.2, 0.3, 0x263238, -0.66, 0.74, 0.2, { r: 0.04 }); // neural jack
    hd.tube([[-0.68, 0.62, 0.05], [-0.8, 0.2, -0.3], [-0.6, -0.1, -0.5]], 0.04, tox, { seg: 8, sides: 5 });
  }
  // a short jacket with a high collar, the shard emblem, a bag strap and pockets
  t.box(2.16, 0.34, 1.16, tone(shirt, 0.8), 0, 0.88, -0.02, { r: 0.08 });
  t.box(0.05, 1.7, 0.04, STEEL, 0.08, -0.05, 0.53); // zip
  t.box(0.36, 0.36, 0.05, shardOf(h), 0.55, 0.55, 0.54, { rz: 0.785 });
  for (const s of [-1, 1]) pouch(t, s * 0.55, -0.55, 0.5, 0.4, 0.35, tone(shirt, 0.85), 0.1);
  belt(t, INK, 0x546e7a);
  if (level >= 2) fuelTanks(t, [-0.38, 0.38], 0.26, 1.4, runner ? 0x311b92 : 0x33691e, { y: 0.15, stripe: tox });
  if (level >= 3) {
    sash(t, 0x4e342e, -1, 0.28);
    for (const v of [-0.6, 0, 0.6]) grenade(t, Math.sin(0.62) * v, Math.cos(0.62) * v, 0.72, runner ? 0x8e24aa : 0x9ccc3c);
  } else {
    sash(t, LEATHER, 1, 0.2);
    t.box(0.35, 0.6, 0.7, LEATHER, -1.12, -0.85, 0.1, { r: 0.06 }); // black-market bag
  }
  hd.done();
  t.done();
  hands(h, key, INK, tone(shirt, 0.8), runner ? (a) => a.box(1.06, 0.06, 1.06, tox, 0, -1.2, 0) : null);
  feet(h, key, 0x1a1a1a, level >= 3 ? (b) => kneePad(b, 0x263238) : null);
  const g = fist(h.rightArm, -1.9, 1.25);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = sawnOff(gk, tox, { len: runner ? 1.9 : 1.6, wide: runner, drum: level >= 2 });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = runner ? 0xea80fc : 0x9ccc3c;
  return own(h);
}

// ------------------------------------------------------------------ Necromancer

/** A small skull at (x, y, z) looking along (dx, dz): cranium, sockets with glowing eyes and a jaw (any space). */
function skullAt(k, x, y, z, r, dx, dz, eye) {
  const px = -dz;
  const pz = dx;
  k.ball(r, BONE, x, y, z, { seg: 12, rows: 9 });
  k.box(r * 1.1, r * 0.5, r * 1.1, BONE, x + dx * r * 0.35, y - r * 0.75, z + dz * r * 0.35, { ry: Math.atan2(dx, dz), r: r * 0.15 }); // jaw
  for (const s of [-1, 1]) k.ball(r * 0.24, eye, x + dx * r * 0.82 + px * s * r * 0.38, y + r * 0.05, z + dz * r * 0.82 + pz * s * r * 0.38, { seg: 8, rows: 6 });
  k.box(r * 0.16, r * 0.25, r * 0.1, 0x3e3a30, x + dx * r * 0.96, y - r * 0.3, z + dz * r * 0.96, { ry: Math.atan2(dx, dz) }); // nose
}

/**
 * Necromancer: a hooded sorcerer with a skull face and a skull staff. Lv 1 Soul Forge: green soul
 * flames round the staff's skull, Lv 2 Skull Centrifuge: skulls circling him, Lv 3 Graveward:
 * bone shoulder guards, a rib-cage chest plate and bone bracers, Lv 4 Apostle of Hades: a
 * black-and-gold robe, a gold crown, red soul fire and five skulls.
 */
export function makeNecromancer(level) {
  const hades = level >= 4;
  const robe = hades ? 0x1a1a1a : level >= 3 ? 0x311b4a : 0x4a148c;
  const h = makeHumanoid({ skin: 0xc8c3b4, shirt: robe, pants: robe, arms: robe, face: 'skull' });
  const key = `necromancer${level}`;
  const soul = glowMat(h, hades ? 0xff1744 : level >= 1 ? TOX : 0xb388ff);
  const trim = hades ? GOLD : 0x7e57c2;
  const hood0 = hades ? 0x111111 : 0x2a0d4f;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hood(hd, hood0);
  hd.cyl(0.36, 0.7, hood0, 0, 1.38, -0.45, { seg: 10, r2: 0.02, rx: -1.0 }); // the hood's droopy point
  hd.box(1.25, 0.1, 0.32, trim, 0, 1.36, 0.62, { rx: 0.35, r: 0.03 }); // trim on the peak
  for (const s of [-1, 1]) hd.cyl(0.07, 0.04, soul, s * 0.22, 0.72, 0.6, { axis: 'z', seg: 8 }); // glowing eyes in the sockets
  if (hades) {
    // a gold crown over the hood
    hd.torus(0.72, 0.06, GOLD, 0, 1.48, 0, { rx: PI / 2, seg: 22 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      hd.cyl(0.09, 0.42, GOLD, Math.sin(a) * 0.7, 1.7, Math.cos(a) * 0.7, { seg: 6, r2: 0.01 });
    }
    hd.ball(0.1, soul, 0, 1.55, 0.74, { seg: 8, rows: 6 });
  }
  // the robe: open front with trim, a rope belt with a skull buckle, a mantle and a long skirt
  t.slab(2.26, 2.2, 1.2, robe, 0, -1.85, 0, { tw: 0.95, bw: 1.25, bd: 1.35 }); // skirt over the legs
  for (const s of [-1, 1]) {
    t.box(0.12, 1.8, 0.06, trim, s * 0.2, 0.05, 0.53); // trim down the front
    t.box(0.12, 2.14, 0.05, trim, s * 0.24, -1.85, 0.72, { rx: -0.1 });
  }
  t.box(2.6, 0.4, 1.4, tone(robe, 0.85), 0, 0.85, -0.02, { r: 0.12 }); // mantle over the shoulders
  t.box(2.62, 0.08, 1.42, trim, 0, 0.66, -0.02);
  t.slab(2.2, 3.7, 0.12, tone(robe, 0.8), 0, -1.05, -0.64, { bw: 1.2, bz: -0.3 }); // cape down the back
  t.torus(1.12, 0.07, 0x8d6e63, 0, -0.85, 0, { rx: PI / 2, seg: 22, sy: 0.62 }); // rope belt
  skullAt(t, 0, -0.85, 0.62, 0.17, 0, 1, soul);
  for (const x of [-0.3, 0.3]) t.cyl(0.04, 0.7, 0x8d6e63, x, -1.25, 0.66, { seg: 6 }); // rope tails
  // a spell book hanging on the hip
  t.box(0.24, 0.6, 0.48, 0x3e2723, 1.15, -1.2, 0.1, { r: 0.04 });
  t.box(0.26, 0.5, 0.06, trim, 1.15, -1.2, 0.36);
  if (level >= 3) {
    // Graveward: bone shoulder guards with spikes, ribs over the chest
    for (const s of [-1, 1]) {
      t.ball(0.62, BONE, s * 1.45, 1.0, 0, { sy: 0.5, seg: 14, rows: 8 });
      for (let i = 0; i < 3; i++) t.torus(0.5 - i * 0.12, 0.04, tone(BONE, 0.8), s * 1.45, 1.06 + i * 0.08, 0, { rx: PI / 2, seg: 14 });
      for (const z of [-0.25, 0.25]) t.cyl(0.08, 0.45, BONE, s * 1.65, 1.35, z, { seg: 6, r2: 0.005, rz: -s * 0.5 });
    }
    t.box(0.14, 1.1, 0.1, BONE, 0, 0.25, 0.58, { r: 0.04 }); // breastbone
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) t.box(0.75, 0.1, 0.08, BONE, s * 0.43, 0.6 - i * 0.3, 0.58, { rz: s * -0.22, r: 0.03 });
  }
  hd.done();
  t.done();
  // wide sleeves with a trimmed cuff (bone bracers from Lv 3), bony hands
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    a.cyl(0.86, 0.55, robe, 0, -1.22, 0, { seg: 14, r2: 0.72 });
    a.cyl(0.88, 0.08, trim, 0, -1.47, 0, { seg: 14 });
    if (level >= 3) for (const y of [-0.5, -0.8]) a.box(1.08, 0.12, 1.08, BONE, 0, y, 0, { r: 0.03 });
    a.done();
  }
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    b.box(1.04, 0.3, 1.2, 0x1a1a1a, 0, -1.86, 0.1, { r: 0.08 }); // pointed slippers
    b.cyl(0.12, 0.3, 0x1a1a1a, 0, -1.9, 0.78, { axis: 'z', seg: 8, r2: 0.01 });
    b.done();
  }
  // the skull staff: a gnarled shaft, bindings, claws round a big skull
  const len = hades ? 3.2 : 2.6;
  const g = fist(h.rightArm, -1.9, 1);
  const k = wear(h, g, `${key}:staff`);
  const wood = hades ? 0x3e2723 : 0x4e342e;
  k.tube([[0, 0.8, 0], [0.05, 0.1, 0.03], [-0.04, -len * 0.4, -0.02], [0.05, -len * 0.75, 0.03], [0, -len + 0.15, 0]], 0.09, wood, { seg: 18, sides: 7 });
  for (const f of [0.25, 0.55]) k.ball(0.12, tone(wood, 0.8), 0.04, -len * f, 0.02, { seg: 8, rows: 6 }); // knots
  for (let i = 0; i < 3; i++) k.torus(0.11, 0.03, hades ? GOLD : 0x8d6e63, 0, -len + 0.3 + i * 0.1, 0, { rx: PI / 2, seg: 10 });
  const c = -len - 0.35;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2 + 0.5;
    k.tube([[0, -len + 0.15, 0], [Math.sin(a) * 0.38, -len - 0.15, Math.cos(a) * 0.38], [Math.sin(a) * 0.28, c - 0.3, Math.cos(a) * 0.28]], 0.04, hades ? GOLD : BONE, { seg: 8, sides: 5 });
  }
  // the big skull looks down the staff (at the enemy), its jaw underneath
  k.ball(0.36, BONE, 0, c, 0.04, { seg: 14, rows: 10 });
  for (const s of [-1, 1]) {
    k.ball(0.1, 0x2a2620, s * 0.14, c - 0.3, 0.1, { seg: 8, rows: 6 }); // socket
    k.ball(0.075, soul, s * 0.14, c - 0.34, 0.1, { seg: 8, rows: 6 }); // eye
  }
  k.box(0.08, 0.06, 0.1, 0x2a2620, 0, c - 0.36, -0.04); // nose
  k.box(0.38, 0.24, 0.22, BONE, 0, c - 0.16, -0.26, { r: 0.05 }); // jaw
  for (let i = 0; i < 4; i++) k.box(0.06, 0.04, 0.08, 0xfafafa, -0.12 + i * 0.08, c - 0.3, -0.17); // teeth
  if (level >= 1) {
    // Soul Forge: soul flames flickering round the skull
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      k.cyl(0.13, 0.55, soul, Math.sin(a) * 0.36, c - 0.1, Math.cos(a) * 0.36, { seg: 6, r2: 0.005, rx: Math.cos(a) * -0.5 - 0.3, rz: Math.sin(a) * 0.5 });
    }
  }
  k.done();
  h.muzzles = [];
  muzzle(h, g, c - 0.4, 0);
  h.rightArm.rotation.set(-PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-PI / 2 + 0.1, 0, -0.5);
  h.pose = { right: -PI / 2, left: -PI / 2 + 0.1, leftRecoil: 0.25 };
  if (level >= 2) {
    // Skull Centrifuge: skulls circling him (they never stop)
    const ring = new THREE.Group();
    ring.position.y = 3.2;
    h.body.add(ring);
    const rk = wear(h, ring, `${key}:ring`);
    const n = hades ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2;
      const x = Math.cos(a) * 2.2;
      const z = Math.sin(a) * 2.2;
      skullAt(rk, x, 0, z, 0.3, Math.cos(a), Math.sin(a), soul);
      rk.cyl(0.18, 0.7, soul, x - Math.sin(a) * 0.35, 0.05, z + Math.cos(a) * 0.35, { seg: 6, r2: 0.005, axis: 'z', ry: -a }); // soul trail
    }
    rk.done();
    h.spin = [ring];
    h.idleSpin = 2;
  }
  h.tracer = hades ? 0xff1744 : level >= 1 ? TOX : 0xb388ff;
  h.tracerWidth = hades ? 0.35 : 0.25;
  return own(h, 0);
}

export const MODELS = {
  crookBoss: makeCrookBoss,
  mobster: (level) => makeMobster(level),
  mobsterBottom: makeMobsterBottom,
  ghost: (level) => makeGhost(level),
  ghostBottom: makeGhostBottom,
  toxicnator: (level) => makeToxicnator(level),
  toxicnatorBottom: makeToxicnatorBottom,
  toxicnatorSaboteur: makeSaboteur,
  necromancer: makeNecromancer,
};

// Shared with later batches (people17).
export { cigar, cuffs, fedora, flatCap, shoes, suitJacket, tommyGun };
