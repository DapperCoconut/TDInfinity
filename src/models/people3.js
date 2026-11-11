// Tower models: people, batch 3 (dressed with the vehicle kit in ../vehicles.js).
// In here: Mercenary, Militant, Laser Gunner (+bottom), Commando, Minigunner, Juggernaut (+bottom).
// Each makeX(level) builds one tower's look; TOWER_MODELS in ../models.js says which tower uses which.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.

import * as THREE from 'three';
import { glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import {
  GUNMETAL, INK, STEEL, UP, WOOD, aimBoth, aimLong, armPatch, band, belt, boots, cap, collar, dome, fist, glove,
  hair, headband, headset, kneePad, muzzle, own, pack, pouch, radio, rifle, sash, shades, shardOf, vest, wear,
} from './people1.js';
import { boonie, grenade, nvg, shoulderPads } from './people2.js';

const PI = Math.PI;
const BRASS = 0xc9a227;

// ------------------------------------------------------------------ shared bits for this batch

/** A bandana tied over the top of the head, with its knot and tails at the back (head space). */
function bandana(k, col) {
  dome(k, 0.7, 0.46, col, 0, 0.93, -0.02);
  k.cyl(0.67, 0.14, tone(col, 0.85), 0, 0.98, 0, { seg: 22 });
  k.ball(0.14, tone(col, 0.8), 0, 1.0, -0.7, { seg: 8, rows: 6 });
  for (const s of [-1, 1]) k.box(0.16, 0.5, 0.05, col, s * 0.12, 0.72, -0.72, { rz: s * 0.25 });
}

/** A knit beanie with a folded cuff and rib lines (head space). */
function beanie(k, col, tall = 0.62) {
  dome(k, 0.72, tall, col, 0, 0.9, 0);
  k.cyl(0.735, 0.24, tone(col, 0.82), 0, 1.0, 0, { seg: 22 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    k.box(0.03, 0.22, 0.03, tone(col, 0.65), Math.sin(a) * 0.74, 1.0, Math.cos(a) * 0.74, { ry: a });
  }
}

/** A balaclava over the whole head with a slit for the eyes (head space). */
function balaclava(k, col) {
  k.cyl(0.66, 0.9, col, 0, 0.48, 0, { seg: 22 });
  dome(k, 0.66, 0.42, col, 0, 0.93, 0);
  k.cyl(0.69, 0.16, tone(col, 0.8), 0, 0.1, 0, { seg: 22 }); // neck roll
}

/** A row of brass rounds on a strap that crosses the chest (torso space; side as in sash). */
export function bandolier(k, side, strap = 0x4e342e) {
  const rz = side * 0.62;
  k.box(0.3, 2.5, 1.12, strap, 0, 0, 0, { rz });
  for (let i = 0; i < 8; i++) {
    const t = -0.95 + i * 0.27;
    const x = -Math.sin(rz) * t;
    const y = Math.cos(rz) * t;
    k.cyl(0.06, 0.24, BRASS, x, y, 0.6, { rz: rz + PI / 2, seg: 6 });
    k.cyl(0.035, 0.08, 0x8d6e63, x + Math.cos(rz) * 0.15, y + Math.sin(rz) * 0.15, 0.6, { rz: rz + PI / 2, seg: 6 }); // bullet tips
  }
}

/** A round chest core light in a rim (torso space). */
function core(k, rim, light, r = 0.28) {
  k.cyl(r + 0.1, 0.12, rim, 0, 0.35, 0.6, { axis: 'z', seg: 16 });
  k.cyl(r, 0.08, light, 0, 0.35, 0.67, { axis: 'z', seg: 16 });
}

/** A big ammo can backpack with a frame, a lid and a brass belt looping out of the top. */
function ammoPack(k, col, o = {}) {
  const w = o.w ?? 1.6;
  const hh = o.h ?? 1.8;
  const z = -0.5 - 0.45;
  k.box(w, hh, 0.9, col, 0, 0, z, { r: 0.08 });
  k.box(w * 1.04, 0.2, 0.96, tone(col, 0.8), 0, hh / 2 - 0.05, z, { r: 0.04 }); // lid
  for (const s of [-1, 1]) k.box(0.1, hh * 0.9, 0.1, INK, s * (w / 2 + 0.05), 0, z - 0.2); // frame rails
  k.box(0.5, 0.18, 0.08, tone(col, 0.6), 0, hh / 2 - 0.2, z - 0.46); // latch
  if (o.glow) k.box(0.24, hh * 0.65, 0.06, o.glow, 0, -0.1, z - 0.47); // power strip
  for (const s of [-1, 1]) {
    k.box(0.26, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
    k.box(0.26, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
  }
  // the feed belt: brass rounds curving out of the lid towards the gun arm (right side, -x)
  if (o.belt !== false) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 6) * PI * 0.6;
      k.cyl(0.07, 0.28, BRASS, -0.35 - Math.sin(a) * 0.75, hh / 2 + 0.12 + Math.sin(a * 1.5) * 0.25, z + 0.2 + i * 0.12, { axis: 'x', seg: 6 });
    }
  }
}

/** Plain shoulder plates over the top of the upper arms (arm space). */
function armPlate(k, col) {
  k.box(1.14, 0.62, 1.14, col, 0, -0.32, 0, { r: 0.12 });
  k.box(1.18, 0.08, 1.18, tone(col, 0.7), 0, -0.62, 0);
}

/**
 * A minigun on the fist of `arm`: a round motor housing, spade grip, carry handle and an ammo
 * chute, and a ring of `n` barrels that spins while it fires (it goes in h.spin and spins about
 * its own y, the barrel line). o: s (scale), len (barrel length), r (barrel ring), n, body,
 * barrel (a colour or a glow material), glow (glow trim). Adds the muzzle.
 */
function minigun(h, arm, key, o = {}) {
  const g = fist(arm, -1.9, o.s ?? 1.2);
  const k = wear(h, g, key);
  const body = o.body ?? GUNMETAL;
  const len = o.len ?? 1.5;
  const r = o.r ?? 0.2;
  const Z = UP + 0.1; // the spin axis height
  k.box(0.22, 0.26, 0.5, INK, 0, 0.12, Z - 0.42, { rx: -0.3, r: 0.04 }); // grip
  k.torus(0.1, 0.022, INK, 0, -0.12, Z - 0.3, { ry: PI / 2, seg: 10, arc: PI }); // trigger guard
  k.cyl(0.32, 0.95, body, 0, -0.38, Z, { seg: 18 }); // motor housing
  k.cyl(0.26, 0.16, tone(body, 0.7), 0, 0.15, Z, { seg: 16 }); // back cap
  k.cyl(0.18, 0.06, INK, 0, 0.25, Z, { seg: 14 });
  for (let i = 0; i < 4; i++) k.torus(0.325, 0.025, tone(body, 0.6), 0, -0.1 - i * 0.2, Z, { rx: PI / 2, seg: 18 }); // cooling rings
  k.tube([[0, 0.05, Z + 0.3], [0, -0.05, Z + 0.68], [0, -0.7, Z + 0.68], [0, -0.82, Z + 0.3]], 0.05, INK, { seg: 8, sides: 6 }); // carry handle
  k.box(0.24, 0.55, 0.34, tone(body, 0.8), 0.36, -0.42, Z - 0.05, { r: 0.05 }); // ammo chute
  for (let i = 0; i < 4; i++) k.cyl(0.05, 0.2, BRASS, 0.42, -0.25 - i * 0.12, Z - 0.3 - i * 0.04, { axis: 'x', seg: 6 }); // rounds going in
  k.cyl(r * 1.9, 0.18, tone(body, 0.85), 0, -0.92, Z, { seg: 16 }); // front bearing
  if (o.glow) {
    k.torus(0.33, 0.04, o.glow, 0, -0.68, Z, { rx: PI / 2, seg: 18 });
    k.box(0.06, 0.5, 0.06, o.glow, -0.31, -0.38, Z + 0.1);
  }
  k.done();
  const spin = new THREE.Group();
  spin.position.set(0, -1.0, Z);
  g.add(spin);
  const b = wear(h, spin, `${key}:barrels`);
  const n = o.n ?? 6;
  const col = o.barrel ?? 0x1f1f1f;
  b.cyl(r * 0.5, len, INK, 0, -len / 2, 0, { seg: 8 }); // spindle
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2;
    const bx = Math.cos(a) * r;
    const bz = Math.sin(a) * r;
    b.cyl(r * 0.32, len, col, bx, -len / 2, bz, { seg: 8 });
    b.cyl(r * 0.16, 0.03, 0x050505, bx, -len - 0.01, bz, { seg: 6 }); // bore
  }
  for (const f of [0.35, 0.96]) b.cyl(r * 1.5, 0.09, tone(STEEL, 0.75), 0, -len * f, 0, { seg: 14 }); // clamps
  b.done();
  (h.spin ??= []).push(spin);
  muzzle(h, g, -1.0 - len, Z);
  return g;
}

/** A compact SMG (gun space): short body, folded stock, a mag, a front grip. o.glow: energy strip. Returns [tip, z]. */
function smg(k, o = {}) {
  const body = o.body ?? 0x263238;
  const U = UP;
  k.box(0.3, 1.1, 0.4, body, 0, -0.45, U, { r: 0.06 });
  k.box(0.14, 0.8, 0.06, INK, 0, -0.45, U + 0.23); // top rail
  k.box(0.22, 0.24, 0.5, INK, 0, 0.06, U - 0.36, { rx: -0.3, r: 0.04 }); // grip
  k.box(0.18, 0.26, 0.7, INK, 0, -0.38, U - 0.5, { r: 0.03 }); // mag
  k.box(0.16, 0.2, 0.36, INK, 0, -0.85, U - 0.3, { r: 0.03 }); // front grip
  k.tube([[0, 0.05, U + 0.1], [0, 0.45, U + 0.1], [0, 0.45, U - 0.2]], 0.035, INK, { seg: 6, sides: 5 }); // folded stock
  k.cyl(0.07, 0.3, STEEL, 0, -1.1, U + 0.04, { seg: 10 });
  if (o.glow) {
    for (const s of [-1, 1]) k.box(0.04, 0.8, 0.1, o.glow, s * 0.16, -0.5, U + 0.05);
    k.cyl(0.1, 0.08, o.glow, 0, -1.26, U + 0.04, { seg: 12 });
  }
  return [-1.3, U + 0.04];
}

/** Legs: boots (and knee pads), all the same on both legs. */
function legs(h, key, col, pad) {
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    boots(b, col);
    if (pad != null) kneePad(b, pad);
    b.done();
  }
}

// ------------------------------------------------------------------ Mercenary

/**
 * Mercenary: a private contractor with an assault rifle. A cap, shades and a chest rig; Lv 1 a
 * laser sight and red-dot, Lv 2 a radio pack and headset, Lv 3 a plate carrier and shoulder pads,
 * Lv 4 all-black kit, a balaclava with a glowing visor and a longer rifle with a drum mag.
 */
export function makeMercenary(level) {
  const elite = level >= 4;
  const shirt = elite ? 0x1c1c1c : 0xc2a878;
  const h = makeHumanoid({ skin: 0xd8a47f, shirt, pants: elite ? 0x141414 : 0x3b3b3b, arms: elite ? shirt : 0xd8a47f, face: 'soldier' });
  const key = `merc${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const rig = elite ? 0x2a2a2a : 0x5b5446;
  const orange = glowMat(h, 0xff3d00);
  if (elite) {
    balaclava(hd, 0x111111);
    band(hd, 0.68, 0.05, 0.22, 1.7, orange, 0.74);
  } else {
    cap(hd, 0x2e2e2e);
    shades(hd, 0x0a0a0a, 0x263238);
    collar(t, tone(shirt, 0.85));
  }
  // chest rig: a half vest with three mag pouches and a side pistol pouch
  t.box(2.1, 0.95, 1.14, rig, 0, -0.32, 0, { r: 0.06 });
  for (const s of [-1, 1]) t.box(0.3, 0.12, 1.24, INK, s * 0.55, 0.99, 0); // shoulder straps
  for (const s of [-1, 1]) t.box(0.3, 1.0, 0.06, INK, s * 0.55, 0.5, 0.56);
  for (const x of [-0.5, 0, 0.5]) pouch(t, x, -0.3, 0.57, 0.38, 0.55, tone(rig, 0.85));
  belt(t, INK, 0x757575);
  if (level >= 2) {
    // Outside Support: a radio pack and a headset
    pack(t, elite ? 0x262626 : 0x4e4a3e, { w: 1.3, h: 1.4, d: 0.55 });
    radio(t, 0.42, 0.55, -1.0, elite ? 0x333333 : 0x3e4a2a, 1.9);
    headset(hd, elite ? 0x222222 : 0x333333);
  }
  if (level >= 3) vest(t, elite ? 0x2b2b2b : 0x6b6450, { pouches: 3, pouch: tone(rig, 0.85), patch: elite ? 0xff3d00 : 0x37474f });
  hd.done();
  t.done();
  legs(h, key, elite ? 0x1a1a1a : 0x5d4a2f, level >= 3 ? (elite ? 0x2b2b2b : 0x6b6450) : null);
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    if (level >= 3) armPlate(a, elite ? 0x2b2b2b : 0x6b6450);
    else armPatch(a, s, 0x5b5446, 0xffd54f);
    glove(a, elite ? 0x111111 : 0x3e2723);
    a.done();
  }
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = rifle(gk, {
    len: elite ? 2.45 : 2.1, furn: elite ? 0x2a2a2a : 0x6d5c42, mag: elite ? 'drum' : 'curved',
    optic: level >= 1 ? 'dot' : 'iron', lens: elite ? 0xff3d00 : 0xff5252, light: level >= 3,
  });
  if (level >= 1) {
    // Lasers: a laser box under the handguard and its beam
    const beam = glowMat(h, elite ? 0xff3d00 : 0xff1744);
    gk.box(0.18, 0.36, 0.18, INK, 0.24, -1.2, UP - 0.02, { r: 0.03 });
    gk.cyl(0.02, 1.4, beam, 0.24, -2.1, UP - 0.02, { seg: 5 });
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = elite ? 0xff6e40 : 0xffd54f;
  return own(h);
}

// ------------------------------------------------------------------ Militant

/**
 * Militant (alternate Mercenary form): a guerrilla fighter with a wooden rifle. A red bandana;
 * Lv 1 a radio pack, Lv 2 a chest rig, Lv 3 a boonie hat and a longer rifle, Lv 4 black stealth
 * gear, a face wrap, a suppressor and a glowing green night sight.
 */
export function makeMilitant(level) {
  const stealth = level >= 4;
  const shirt = stealth ? 0x1b1f24 : 0x6d6a3a;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: stealth ? 0x15181c : 0x4e4a2a, arms: shirt, face: 'soldier' });
  const key = `militant${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const shard = shardOf(h);
  if (level >= 3 && !stealth) boonie(hd, 0x5d5a32);
  else bandana(hd, stealth ? 0x263238 : 0xb71c1c);
  if (stealth) {
    band(hd, 0.66, 0.06, 0.42, 2.4, 0x111111, 0.32); // face wrap
    band(hd, 0.67, 0.04, 0.06, 2.0, 0x263238, 0.55);
  }
  collar(t, tone(shirt, 0.85));
  t.box(0.34, 0.34, 0.06, shard, -0.55, 0.45, 0.53); // Dimension Shard badge
  for (let i = 0; i < 6; i++) t.box(0.03, 1.6, 0.03, tone(shirt, 0.82), -0.9 + i * 0.36, -0.1, 0.51); // tiger stripes
  belt(t, 0x3e2723, 0x9e9e9e);
  if (level >= 1) {
    pack(t, 0x4b5320, { w: 1.2, h: 1.35, d: 0.55, roll: stealth ? 0x263238 : 0x6d4c41 });
    radio(t, -0.4, 0.5, -1.0, 0x3e4a2a, 2.0);
  }
  if (level >= 2) {
    // chest rig: a band of three mag pouches and a grenade
    t.box(2.1, 0.9, 1.15, stealth ? 0x263238 : 0x4a4628, 0, -0.25, 0, { r: 0.05 });
    for (const x of [-0.55, 0, 0.55]) pouch(t, x, -0.3, 0.58, 0.4, 0.5, stealth ? 0x1c262b : 0x3e2723);
    for (const s of [-1, 1]) sash(t, stealth ? 0x1c262b : 0x3e2723, s, 0.2);
    grenade(t, 0.75, 0.35, 0.62, stealth ? 0x263238 : 0x33691e);
  }
  hd.done();
  t.done();
  legs(h, key, stealth ? 0x15181c : 0x3e2723, level >= 2 ? (stealth ? 0x263238 : 0x4a4628) : null);
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    a.box(1.06, 0.22, 1.06, tone(shirt, 0.8), 0, -1.2, 0, { r: 0.04 }); // rolled sleeves
    if (s > 0) a.box(0.05, 0.36, 0.36, shard, 0.54, -0.42, 0); // shard arm badge
    if (stealth) glove(a, 0x111111);
    a.done();
  }
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = rifle(gk, {
    len: level >= 3 ? 2.3 : 2.0, body: stealth ? 0x263238 : GUNMETAL, furn: stealth ? 0x37474f : WOOD,
    mag: 'curved', optic: stealth ? 'scope' : 'iron', lens: 0x76ff03, can: stealth,
  });
  if (stealth) gk.cyl(0.11, 0.03, glowMat(h, 0x76ff03), 0, -0.82, UP + 0.42, { seg: 12 }); // night sight glow
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = stealth ? 0xb2ff59 : 0xffd54f;
  return own(h);
}

// ------------------------------------------------------------------ Laser Gunner

/**
 * Laser Gunner (alternate Mercenary form): a high-tech gunner with a cyan visor and a laser
 * rifle. Top path: a power pack at Lv 1 (glowing at Lv 2), white armour and a helmet from Lv 3
 * and a four-barrel laser minigun at Lv 5. Bottom path: a sensor pack with an antenna at Lv 1,
 * a laser SMG from Lv 3 and two SMGs at Lv 5.
 */
export function makeLaserGunner(level, bottom = false) {
  const top = !bottom;
  const armored = top && level >= 3;
  const shirt = armored ? 0xcfd8dc : 0x263238;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: armored ? 0x78909c : 0x1c2529, arms: shirt, face: 'soldier' });
  const key = `laserG${bottom ? 'B' : 'T'}${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const cyan = glowMat(h, 0x00e5ff);
  const shard = shardOf(h);
  t.box(0.34, 0.34, 0.06, shard, -0.55, 0.45, 0.53);
  if (armored) {
    dome(hd, 0.76, 0.66, 0xeceff1, 0, 0.78, 0);
    hd.cyl(0.76, 0.6, 0xeceff1, 0, 0.5, 0, { seg: 22, open: true });
    for (const s of [-1, 1]) hd.cyl(0.2, 0.12, 0xb0bec5, s * 0.78, 0.7, 0, { axis: 'x', seg: 12 }); // ear pods
    hd.box(0.1, 0.24, 0.7, 0xb0bec5, 0, 1.48, -0.05, { r: 0.04 }); // crest
  } else {
    hair(hd, 0x212121, { h: 0.44 });
    headset(hd, 0x37474f);
  }
  band(hd, 0.67, 0.07, 0.26, 1.8, 0x263238, 0.72); // visor frame
  band(hd, 0.7, 0.04, 0.16, 1.6, cyan, 0.72); // visor
  belt(t, INK, cyan);
  if (top && level >= 1) ammoPack(t, 0x37474f, { w: 1.4, h: 1.7, glow: level >= 2 ? cyan : null, belt: false });
  if (top && level >= 1) for (const s of [-1, 1]) t.tube([[s * 0.5, 0.75, -0.95], [s * 0.95, 0.2, -0.5], [s * 1.0, -0.5, 0.0]], 0.06, INK, { seg: 8, sides: 6 }); // power cables
  if (armored) {
    t.box(2.18, 1.3, 1.2, 0xb0bec5, 0, 0.3, 0, { r: 0.16 });
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) t.box(0.7, 0.22, 0.12, 0x90a4ae, s * 0.4, -0.45 - i * 0.26, 0.54, { r: 0.04 });
    core(t, 0x78909c, cyan, 0.22);
    shoulderPads(t, 0xcfd8dc, 0.58);
  } else {
    collar(t, 0x37474f, { buttons: false });
    t.box(1.0, 0.04, 0.04, cyan, 0, 0.3, 0.53); // light seam
  }
  if (bottom && level >= 1) {
    pack(t, 0x37474f, { w: 1.0, h: 1.2, d: 0.5 });
    t.cyl(0.04, 1.6, INK, 0.35, 1.3, -0.85, { seg: 6 });
    t.ball(0.14, cyan, 0.35, 2.15, -0.85, { seg: 10, rows: 6 });
    for (const y of [1.0, 1.5]) t.torus(0.12, 0.025, cyan, 0.35, y, -0.85, { rx: PI / 2, seg: 10 });
  }
  hd.done();
  t.done();
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    boots(b, armored ? 0x90a4ae : 0x212121);
    if (armored) b.box(0.9, 0.55, 0.2, 0xb0bec5, 0, -0.95, 0.54, { r: 0.08 });
    b.box(0.06, 0.5, 0.04, cyan, 0.5, -0.6, 0.3); // side stripe
    b.done();
  }
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    if (armored) a.box(1.08, 0.6, 1.08, 0xb0bec5, 0, -0.9, 0, { r: 0.1 });
    a.box(1.04, 0.14, 1.04, armored ? 0x90a4ae : 0x37474f, 0, -0.7, 0); // sleeve band (keeps the glove on the forearm, not "held")
    glove(a, armored ? 0x78909c : 0x111111);
    a.box(0.05, 0.08, 0.6, cyan, s * 0.54, -1.6, 0); // cuff light
    a.done();
  }
  h.muzzles = [];
  h.tracer = 0x00e5ff;
  if (bottom && level >= 3) {
    // SMG / Dual SMGs: compact laser guns, one in each hand at Lv 5
    const arms = level >= 5 ? [h.rightArm, h.leftArm] : [h.rightArm];
    for (const arm of arms) {
      const g = fist(arm, -1.9, 1.25);
      const gk = wear(h, g, `${key}:smg`);
      const [y, z] = smg(gk, { glow: cyan });
      gk.done();
      muzzle(h, g, y, z);
    }
    if (level >= 5) {
      aimBoth(h);
    } else {
      aimLong(h);
      h.pose.leftRecoil = 0.25;
    }
    h.tracerWidth = 0.2;
    return own(h);
  }
  const mini = top && level >= 5;
  if (mini) {
    minigun(h, h.rightArm, `${key}:mini`, { s: 1.25, len: 1.6, r: 0.18, n: 4, body: 0x90a4ae, barrel: 0x212121, glow: cyan });
  } else {
    const g = fist(h.rightArm, -1.9, 1.2);
    const gk = wear(h, g, `${key}:gun`);
    const len = armored ? 2.5 : 2.2;
    const [y, z] = rifle(gk, { len, body: armored ? 0x90a4ae : 0x263238, furn: armored ? 0xeceff1 : 0x37474f, mag: false, optic: 'dot', lens: 0x00e5ff, glow: cyan });
    for (let i = 0; i < 3; i++) gk.torus(0.22, 0.045, cyan, 0, -0.95 - i * 0.24, UP, { rx: PI / 2, seg: 14 }); // coils
    gk.box(0.3, 0.5, 0.36, 0x37474f, 0, -0.55, UP - 0.38, { r: 0.05 }); // power cell
    gk.box(0.06, 0.3, 0.06, cyan, 0.16, -0.55, UP - 0.38);
    gk.done();
    muzzle(h, g, y, z);
  }
  aimLong(h);
  h.tracerWidth = mini ? 0.3 : 0.22;
  return own(h);
}
export const makeLaserGunnerBottom = (level) => makeLaserGunner(level, true);

// ------------------------------------------------------------------ Commando

/**
 * Commando: a minigun gunner in a tank top with a bandolier and a red bandana. Lv 1 gloves and
 * knee pads, Lv 2 night-vision goggles and an ammo backpack, Lv 3 a second minigun, Lv 4 Laser
 * Wield: black armour with a red core and glowing red barrels.
 */
export function makeCommando(level) {
  const laser = level >= 4;
  const shirt = laser ? 0x1b1b1b : 0x556b2f;
  const h = makeHumanoid({ skin: 0xa0522d, shirt, pants: laser ? 0x111111 : 0x3e3a2a, arms: 0xa0522d, face: 'soldier' });
  const key = `commando${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const red = laser ? glowMat(h, 0xff1744) : 0xc62828;
  hair(hd, 0x1b1b1b, { h: 0.44 });
  headband(hd, red, 1.0);
  // tank top: straps over the shoulders and a scoop neck
  for (const s of [-1, 1]) t.box(0.36, 0.2, 1.06, shirt, s * 0.62, 0.98, 0, { r: 0.04 });
  t.box(0.9, 0.08, 0.06, tone(shirt, 0.7), 0, 0.82, 0.52);
  bandolier(t, 1);
  belt(t, 0x3e2723, 0xb0b0b0);
  if (level >= 2) {
    nvg(hd, glowMat(h, laser ? 0xff1744 : 0x76ff03), true);
    hd.torus(0.68, 0.05, INK, 0, 1.15, 0, { rx: PI / 2, seg: 20 }); // goggle strap
    ammoPack(t, laser ? 0x263238 : 0x3a3a3a, { glow: laser ? red : null });
  }
  if (laser) {
    // Laser Wield: an armoured chest plate with a glowing core
    t.box(2.16, 1.4, 1.18, 0x2b2b2b, 0, 0.2, 0, { r: 0.16 });
    for (let i = 0; i < 2; i++) for (const s of [-1, 1]) t.box(0.7, 0.22, 0.12, 0x37474f, s * 0.4, -0.55 - i * 0.26, 0.54, { r: 0.04 });
    core(t, 0x37474f, red);
    shoulderPads(t, 0x2b2b2b, 0.55);
  }
  hd.done();
  t.done();
  legs(h, key, laser ? 0x111111 : 0x4e3b28, level >= 1 ? 0x212121 : null);
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    if (level >= 1) glove(a, 0x212121);
    a.box(1.04, 0.14, 1.04, laser ? 0x37474f : 0x3e2723, 0, -0.75, 0); // arm band
    a.done();
  }
  h.muzzles = [];
  const o = { s: 1.15, len: 1.45, body: laser ? 0x37474f : 0x424242, barrel: laser ? red : 0x1f1f1f, glow: laser ? red : null };
  minigun(h, h.rightArm, `${key}:mg`, o);
  if (level >= 3) {
    minigun(h, h.leftArm, `${key}:mg`, o);
    h.rightArm.rotation.set(-PI / 2, 0, 0.12);
    h.leftArm.rotation.set(-PI / 2, 0, -0.12);
    h.pose = { right: -PI / 2, left: -PI / 2, leftRecoil: 0.15 };
  } else {
    h.rightArm.rotation.set(-PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-PI / 2 + 0.15, 0, -0.55);
    h.pose = { right: -PI / 2, left: -PI / 2 + 0.15, leftRecoil: 0.1 };
  }
  h.recoilScale = 0.25; // miniguns barely kick
  h.tracer = laser ? 0xff1744 : 0xffd740;
  return own(h);
}

// ------------------------------------------------------------------ Minigunner

/**
 * Minigunner (alternate Commando form): a big gunner with one huge minigun. A beanie with the
 * shard badge; Lv 1 gloves and knee pads, Lv 2 a visor and an ammo backpack, Lv 3 a vest, a
 * helmet, shoulder plates and a bigger gun, Lv 4 a dark future suit with a glowing purple minigun.
 */
export function makeMinigunner(level) {
  const future = level >= 4;
  const shirt = future ? 0x1c1726 : 0x5d6b3a;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: future ? 0x14101c : 0x3e3a2a, arms: shirt, face: 'soldier' });
  h.body.scale.setScalar(1.1); // a big guy for a big gun
  const key = `minigunner${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const shard = shardOf(h);
  const armor = future ? 0x2a2235 : 0x556b2f;
  if (level >= 3) {
    dome(hd, 0.78, 0.62, future ? 0x263238 : 0x4b5320, 0, 0.9, 0);
    hd.torus(0.77, 0.05, INK, 0, 0.91, 0, { rx: PI / 2, seg: 20 });
    for (const s of [-1, 1]) hd.box(0.1, 0.4, 0.4, INK, s * 0.75, 0.75, 0, { r: 0.03 }); // ear guards
  } else beanie(hd, 0x37474f);
  hd.box(0.3, 0.3, 0.06, shard, 0, 1.18, 0.72, { rx: -0.3 }); // shard badge on the hat
  t.box(0.34, 0.34, 0.06, shard, -0.55, 0.45, 0.53);
  collar(t, tone(shirt, 0.85), { buttons: false });
  belt(t, INK, 0x9e9e9e);
  if (level >= 2) {
    band(hd, 0.67, 0.07, 0.26, 1.8, INK, 0.72); // visor frame
    band(hd, 0.7, 0.04, 0.16, 1.6, future ? shard : glowMat(h, 0x40c4ff), 0.72);
    ammoPack(t, future ? 0x263238 : 0x4e4a3a, { glow: future ? shard : null });
  }
  if (level >= 3) {
    vest(t, armor, { pouches: 3, pouch: tone(armor, 0.8) });
    t.box(0.34, 0.34, 0.06, shard, -0.45, 0.6, 0.68);
  }
  if (future) core(t, 0x37474f, shard);
  hd.done();
  t.done();
  legs(h, key, future ? 0x14101c : 0x4e3b28, level >= 1 ? 0x212121 : null);
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    if (level >= 3) armPlate(a, future ? 0x2a2235 : 0x4b5320);
    else a.box(1.04, 0.14, 1.04, tone(shirt, 0.75), 0, -0.7, 0); // sleeve hem (an arm kit with only a glove counts as a held item)
    if (level >= 1) glove(a, 0x212121);
    a.done();
  }
  h.muzzles = [];
  const big = level >= 3 ? 1.4 : 1.25;
  minigun(h, h.rightArm, `${key}:mg`, {
    s: big, len: 1.8, r: 0.24, body: future ? 0x37474f : 0x424242, barrel: future ? shard : 0x1f1f1f, glow: future ? shard : null,
  });
  h.rightArm.rotation.set(-PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-PI / 2 + 0.1, 0, -0.5);
  h.pose = { right: -PI / 2, left: -PI / 2 + 0.1, leftRecoil: 0.1 };
  h.recoilScale = 0.2;
  h.tracer = future ? 0xb388ff : 0xffd740;
  return own(h);
}

// ------------------------------------------------------------------ Juggernaut

/**
 * Juggernaut (alternate Commando form): a huge gunner in a bomb suit with a minigun. Top path:
 * longer barrels from Lv 3 and an orange HE glow at Lv 5. Bottom path: two miniguns from Lv 3
 * and a cybernetic cyan glow from Lv 4. A purple Dimension Shard badge marks it as an alternate form.
 */
export function makeJuggernaut(level, bottom = false) {
  const top = !bottom;
  const cyber = bottom && level >= 4;
  const he = top && level >= 5;
  const shirt = cyber ? 0x1c262b : 0x4e342e;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: 0x2b2b2b, arms: shirt, face: 'soldier' });
  h.body.scale.setScalar(1.2);
  const key = `jugg${bottom ? 'B' : 'T'}${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const shard = shardOf(h);
  const plate = cyber ? 0x263238 : he ? 0x3e2723 : 0x5d4037;
  const light = he ? glowMat(h, 0xff6d00) : cyber ? glowMat(h, 0x18ffff) : null;
  // the bomb-suit helmet: a big round shell, a flat face window and a thick neck collar
  dome(hd, 0.82, 0.8, plate, 0, 0.7, -0.04);
  hd.cyl(0.82, 0.72, plate, 0, 0.34, -0.04, { seg: 24 });
  hd.torus(0.8, 0.14, tone(plate, 0.75), 0, 0.0, -0.04, { rx: PI / 2, seg: 22 });
  hd.box(1.0, 0.5, 0.1, tone(plate, 0.6), 0, 0.72, 0.76, { r: 0.06 }); // window frame
  hd.box(0.86, 0.36, 0.06, light ?? 0x90a4ae, 0, 0.72, 0.81); // window
  for (const s of [-1, 1]) hd.cyl(0.16, 0.14, tone(plate, 0.7), s * 0.84, 0.6, -0.04, { axis: 'x', seg: 12 }); // vents
  hd.box(0.12, 0.3, 0.9, tone(plate, 0.8), 0, 1.5, -0.1, { r: 0.04 }); // crest
  // the armoured suit: a thick chest plate, ribbed belly and a groin flap
  t.box(2.24, 1.3, 1.24, plate, 0, 0.32, 0, { r: 0.2 });
  for (let i = 0; i < 3; i++) t.box(2.18, 0.2, 1.2, tone(plate, 0.82), 0, -0.45 - i * 0.24, 0, { r: 0.06 });
  t.box(0.8, 0.5, 0.14, tone(plate, 0.8), 0, -1.05, 0.55, { r: 0.05 });
  t.box(0.34, 0.34, 0.06, shard, -0.55, 0.55, 0.64);
  if (light) core(t, tone(plate, 0.6), light, 0.3);
  ammoPack(t, 0x3e3a2a, { glow: light });
  if (level >= 2) shoulderPads(t, plate, 0.68);
  hd.done();
  t.done();
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    boots(b, 0x212121);
    b.box(1.1, 1.0, 1.1, plate, 0, -0.75, 0.02, { r: 0.12 }); // thigh armour
    b.box(0.9, 0.5, 0.22, tone(plate, 0.8), 0, -1.0, 0.56, { r: 0.08 });
    b.done();
  }
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    armPlate(a, plate);
    a.box(1.1, 0.5, 1.1, tone(plate, 0.85), 0, -1.1, 0, { r: 0.08 }); // forearm guard
    if (level >= 1) glove(a, 0x212121);
    a.done();
  }
  h.muzzles = [];
  const dual = bottom && level >= 3;
  const o = {
    s: 1.25, len: top && level >= 3 ? 2.1 : 1.6, r: 0.24, body: 0x424242,
    barrel: light ?? 0x1f1f1f, glow: light,
  };
  minigun(h, h.rightArm, `${key}:mg`, o);
  if (dual) {
    minigun(h, h.leftArm, `${key}:mg`, o);
    h.rightArm.rotation.set(-PI / 2, 0, 0.08);
    h.leftArm.rotation.set(-PI / 2, 0, -0.08);
    h.pose = { right: -PI / 2, left: -PI / 2, leftRecoil: 0.1 };
  } else {
    h.rightArm.rotation.set(-PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-PI / 2 + 0.1, 0, -0.5);
    h.pose = { right: -PI / 2, left: -PI / 2 + 0.1, leftRecoil: 0.1 };
  }
  h.recoilScale = 0.2;
  h.tracer = he ? 0xff9100 : cyber ? 0x18ffff : 0xffd740;
  return own(h);
}
export const makeJuggernautBottom = (level) => makeJuggernaut(level, true);
