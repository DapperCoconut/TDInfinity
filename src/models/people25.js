// Tower models: people, batch 25 (dressed with the vehicle kit in ../vehicles.js).
// In here: Golden Scout (goldScoutBase), Golden Commando, Gold Commander: the golden perk towers
// that have their own looks (the other golden towers are the normal model run through goldify).
// Golden Scout and Golden Commando are built in plain colours and then turned gold with goldify
// (bits.js), as before; only their glowing parts keep their own colour. Gold Commander is built
// in his own gold, red and white, and models.js adds the goldFx sparkles (goldShine) on top.
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.

import * as THREE from 'three';
import { glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { goldify } from './bits.js';
import {
  INK, STEEL, UP, aimBoth, aimLong, armPatch, belt, boots, canteen, collar, dome, fist, glove, hair, helmet,
  kneePad, muzzle, own, pack, pistol, pockets, pouch, radio, shades, wear,
} from './people1.js';
import { duster, shoulderPads } from './people2.js';
import { ammoPack, armPlate, bandana, bandolier, core, minigun } from './people3.js';
import { feet, hands } from './people5.js';
import { cuffs, fedora, shoes, suitJacket } from './people10.js';
import { cape, gauntlet } from './people18.js';
import { featherWings, glowGlass, sword } from './people24.js';

const PI = Math.PI;
const RUBY = 0xff1744;

// ------------------------------------------------------------------ shared bits for this batch

/**
 * A big hand cannon in the Desert Eagle style (gun space): a tall slide with a flat top rib,
 * rear serrations, a long frame, a chunky grip with side panels, a hammer and sights.
 * o: len, body, grip, comp (a muzzle brake), laser (a glow material: energy strips, an emitter
 * ring and a laser sight). Returns the bore point [y, z].
 */
function deagle(k, o = {}) {
  const len = o.len ?? 1.3;
  const body = o.body ?? 0x9e9e9e;
  const grip = o.grip ?? 0x1f1f1f;
  const U = 0.3;
  const B = U + 0.08; // bore height
  const y0 = 0.22; // back of the slide
  k.box(0.3, len, 0.34, body, 0, y0 - len / 2, B, { r: 0.03 }); // slide
  k.box(0.1, len * 0.92, 0.05, tone(body, 0.75), 0, y0 - len / 2 - 0.02, B + 0.19); // top rib
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) k.box(0.02, 0.035, 0.22, INK, s * 0.155, y0 - 0.08 - i * 0.07, B + 0.04); // serrations
  for (const s of [-1, 1]) k.box(0.02, len * 0.45, 0.06, tone(body, 0.6), s * 0.155, y0 - len * 0.62, B - 0.04); // side flats
  k.box(0.28, len * 0.6, 0.18, tone(body, 0.82), 0, y0 - len * 0.62, U - 0.13, { r: 0.03 }); // frame and dust cover
  k.box(0.26, 0.36, 0.2, tone(body, 0.82), 0, 0.05, U - 0.13); // frame behind the guard
  k.box(0.3, 0.3, 0.66, grip, 0, 0.16, U - 0.44, { rx: -0.25, r: 0.05 }); // grip
  for (const s of [-1, 1]) k.box(0.02, 0.24, 0.5, tone(grip, 1.6), s * 0.16, 0.16, U - 0.46, { rx: -0.25 }); // grip panels
  k.box(0.28, 0.06, 0.32, tone(body, 0.7), 0, 0.24, U - 0.77, { rx: -0.25 }); // mag base
  k.torus(0.1, 0.024, tone(body, 0.7), 0, -0.14, U - 0.26, { ry: PI / 2, seg: 10, arc: PI }); // trigger guard
  k.box(0.04, 0.05, 0.14, INK, 0, -0.12, U - 0.22, { rx: 0.3 }); // trigger
  k.box(0.09, 0.14, 0.14, INK, 0, y0 + 0.08, B + 0.16, { rx: 0.45 }); // hammer
  k.box(0.18, 0.06, 0.08, INK, 0, y0 - 0.05, B + 0.24); // rear sight
  k.box(0.05, 0.08, 0.1, INK, 0, y0 - len + 0.08, B + 0.24); // front sight
  let tip = y0 - len;
  if (o.comp) {
    k.box(0.32, 0.3, 0.36, tone(body, 0.85), 0, tip - 0.14, B, { r: 0.04 }); // muzzle brake
    for (const s of [-1, 1]) for (const dy of [-0.08, -0.2]) k.box(0.03, 0.06, 0.2, INK, s * 0.165, tip + dy, B);
    tip -= 0.29;
  }
  k.cyl(0.07, 0.03, 0x050505, 0, tip - 0.005, B, { seg: 8 }); // bore
  if (o.laser) {
    for (const s of [-1, 1]) k.box(0.03, len * 0.7, 0.07, o.laser, s * 0.16, y0 - len * 0.5, B + 0.08); // energy strips
    k.torus(0.13, 0.03, o.laser, 0, tip - 0.02, B, { rx: PI / 2, seg: 14 }); // emitter ring
    k.box(0.2, 0.34, 0.18, INK, 0, y0 - len * 0.62, U - 0.33, { r: 0.03 }); // laser sight
    k.cyl(0.045, 0.03, o.laser, 0, y0 - len * 0.62 - 0.18, U - 0.33, { seg: 8 });
  }
  return [tip, B];
}

/** A static halo of light over the head (head space): a glowing ring with small beads on it. */
function halo(h, k, y, r, col) {
  const m = glowMat(h, col);
  k.torus(r, 0.06, m, 0, y, 0, { rx: PI / 2, seg: 30 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2 + PI / 8;
    k.ball(0.08, m, Math.cos(a) * r, y, Math.sin(a) * r, { seg: 6, rows: 4 });
  }
}

// ------------------------------------------------------------------ Golden Scout

/**
 * Golden Scout (golden perk of the Scout), all in gold. A helmeted scout with a pistol; Lv 1 Epic
 * Glasses: glowing yellow shades and a radio pack, Lv 2 Epic Deagle: a big hand cannon, Lv 3
 * Gilded Detective: a fedora, a trench coat and a tie, with two Deagles, Lv 4 AGENT AU: a gold
 * suit, an earpiece, feathered wings, a halo and twin laser pistols.
 */
export function makeGoldScout(level) {
  const au = level >= 4;
  const detective = level >= 3;
  const coat = 0xb08d57;
  const h = makeHumanoid(
    au
      ? { skin: 0xe0ac69, shirt: 0x8a6d1d, pants: 0x6b5416, arms: 0x8a6d1d, face: 'agent' }
      : detective
        ? { skin: 0xe0ac69, shirt: coat, pants: 0x5d4a2a, arms: coat, face: 'agent' }
        : { skin: 0xe0ac69, shirt: 0x6b7d3a, pants: 0x4b5320, arms: 0x6b7d3a, face: 'soldier' },
  );
  const key = `gscout${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const yellow = glowMat(h, 0xffea00); // Epic Glasses: they stay yellow after the gold
  if (au) {
    // AGENT AU: a gold suit, a dark fedora with a shining band, an earpiece
    hair(hd, 0x3a2c0a, { h: 0.36 });
    fedora(hd, 0x3a2c0a, glowMat(h, 0xfff176));
    hd.cyl(0.08, 0.16, INK, -0.66, 0.6, 0.05, { axis: 'x', seg: 8 }); // earpiece
    hd.tube([[-0.68, 0.55, 0.05], [-0.7, 0.2, -0.1], [-0.55, -0.1, -0.2]], 0.02, 0xd0d0d0, { seg: 6, sides: 4 });
    suitJacket(t, 0x8a6d1d, { shirt: 0xfff3c4, tie: 0x3a2c0a, square: 0xfff8e1 });
    t.box(2.06, 0.2, 1.06, 0x3a2c0a, 0, -0.84, 0); // belt line
    t.box(0.3, 0.16, 0.05, 0xfff3c4, 0, -0.84, 0.54); // buckle
    for (const s of [-1, 1]) t.box(0.34, 0.5, 0.2, 0x3a2c0a, s * 0.82, -1.0, 0.3, { r: 0.04 }); // twin holsters
  } else if (detective) {
    // Gilded Detective: a fedora, a long trench coat with a tied belt, a tie and a notebook
    hair(hd, 0x4e3b1f, { h: 0.36 });
    fedora(hd, 0x4e3b1f, 0x2b1d0e);
    t.slab(0.62, 1.2, 0.05, 0xf5f5f5, 0, 0.35, 0.52, { bw: 0.25 }); // shirt V
    t.box(0.18, 0.16, 0.08, 0x5d1a1a, 0, 0.9, 0.56, { r: 0.03 }); // tie knot
    t.slab(0.2, 1.0, 0.05, 0x5d1a1a, 0, 0.3, 0.56, { tw: 0.7, bw: 1.3 }); // tie
    duster(t, 0xa07f4c, { trim: 0x7a5f36 });
    for (const s of [-1, 1]) t.box(0.36, 1.4, 0.08, tone(0xa07f4c, 0.88), s * 0.5, 0.25, 0.55, { rz: s * 0.2 }); // coat fronts
    for (const s of [-1, 1]) for (const y of [0.1, -0.4]) t.cyl(0.05, 0.04, 0x3e2a14, s * 0.62, y, 0.6, { axis: 'z', seg: 8 }); // buttons
    t.box(2.2, 0.22, 1.18, 0x8a6a3c, 0, -0.84, 0, { r: 0.04 }); // coat belt
    t.box(0.28, 0.24, 0.06, 0xd4af37, -0.35, -0.84, 0.6, { r: 0.02 }); // buckle
    t.box(0.12, 0.55, 0.06, 0x8a6a3c, -0.15, -1.15, 0.6, { rz: 0.15 }); // belt end
    t.box(0.06, 0.4, 0.3, 0x3e2a14, 0.82, 0.3, 0.42, { r: 0.02 }); // notebook in the pocket
    t.box(0.04, 0.36, 0.26, 0xfafafa, 0.79, 0.3, 0.42);
  } else {
    helmet(hd, 0x556b2f, { cover: 0x3e4a2a });
    collar(t, 0x6b7d3a);
    pockets(t, tone(0x6b7d3a, 0.92));
    belt(t, 0x3e2723, 0x9e9e9e);
    canteen(t, 0.8);
    pouch(t, -0.6, -0.95, 0.52, 0.36, 0.34, 0x4b5320);
    t.box(0.26, 0.5, 0.36, 0x3e2723, -0.9, -1.05, 0.25, { r: 0.05 }); // holster
    if (level >= 1) {
      pack(t, 0x4b5320, { w: 1.3, h: 1.35, d: 0.55 });
      radio(t, 0.38, 0.5, -1.0, 0x3e4a2a, 1.7);
    }
    if (level >= 2) for (const x of [-0.3, 0.05]) pouch(t, x, -0.62, 0.53, 0.26, 0.4, 0x3e4a2a, 0.14); // spare Deagle mags
  }
  if (level >= 1) shades(hd, 0x3a2c0a, yellow, { y: 0.7, w: 0.42 });
  hd.done();
  t.done();
  if (au) featherWings(h, key, 0xfff3c4, 0xffe082, { size: 0.85 });
  if (detective) {
    shoes(h, key, au ? 0x2b1d0e : 0x3e2a14, { pants: au ? 0x6b5416 : 0x5d4a2a });
    cuffs(h, key, au ? 0xfff3c4 : 0xf5f5f5, au ? 0x8a6d1d : coat, au ? 0xffd54f : null);
  } else {
    for (const leg of [h.rightLeg, h.leftLeg]) {
      const b = wear(h, leg, `${key}:leg`);
      boots(b, 0x3e2723);
      if (level >= 2) kneePad(b, 0x3e4a2a);
      b.done();
    }
    hands(h, key, level >= 2 ? 0x2b2b2b : null, tone(0x6b7d3a, 0.85), (a, s) => {
      if (s > 0) armPatch(a, 1, 0x3e4a2a, 0xffd54f);
    });
  }
  // the guns: a pistol, then one big Deagle (Lv 2), two Deagles (Lv 3), two laser pistols (Lv 4)
  h.muzzles = [];
  const laser = au ? glowMat(h, 0xfff176) : null;
  const gunOpts = level >= 2
    ? { len: au ? 1.4 : 1.3, body: au ? 0x2b2b2b : 0x9e9e9e, grip: au ? 0xfff3c4 : 0x2b2b2b, comp: detective, laser }
    : null;
  for (const arm of detective ? [h.rightArm, h.leftArm] : [h.rightArm]) {
    const g = fist(arm, -1.9, level >= 2 ? 1.3 : 1.35);
    const gk = wear(h, g, `${key}:gun`);
    const [y, z] = level >= 2 ? deagle(gk, gunOpts) : pistol(gk, { len: 1.0, body: 0x2b2b2b, grip: 0x3e2723 });
    gk.done();
    muzzle(h, g, y, z);
  }
  if (detective) aimBoth(h);
  else aimLong(h);
  goldify(h);
  if (au) {
    // a halo over the fedora (added after the gold, so it keeps its light)
    const hk = wear(h, h.head, `${key}:halo`);
    halo(h, hk, 2.05, 0.72, 0xfff176);
    hk.done();
  }
  h.tracer = au ? 0xfff176 : 0xffd54f;
  return own(h, 0.3);
}

// ------------------------------------------------------------------ Golden Commando

/**
 * A heavy rotary cannon on the fist of `arm` (gun space), held in both hands: a big round
 * motor drum with cooling rings, an ammo box on the side feeding a belt into it, a carry
 * handle, a front grip and a shroud, and a ring of `n` barrels that spins while it fires (it
 * goes in h.spin). o: s, len, r, n, body, barrel (a colour or glow material), glow. Adds the muzzle.
 */
function heavyCannon(h, arm, key, o = {}) {
  const g = fist(arm, -1.9, o.s ?? 1.25);
  const k = wear(h, g, key);
  const body = o.body ?? 0x424242;
  const len = o.len ?? 1.9;
  const r = o.r ?? 0.3;
  const n = o.n ?? 6;
  const Z = UP + 0.16; // the spin axis height
  k.box(0.24, 0.28, 0.52, INK, 0, 0.14, Z - 0.5, { rx: -0.3, r: 0.04 }); // rear grip
  k.torus(0.1, 0.022, INK, 0, -0.1, Z - 0.38, { ry: PI / 2, seg: 10, arc: PI });
  k.cyl(0.46, 1.15, body, 0, -0.45, Z, { seg: 20 }); // motor drum
  k.cyl(0.38, 0.18, tone(body, 0.7), 0, 0.2, Z, { seg: 18 }); // back cap
  k.cyl(0.24, 0.08, INK, 0, 0.32, Z, { seg: 14 });
  for (const s of [-1, 1]) k.box(0.06, 0.5, 0.06, STEEL, s * 0.14, 0.32, Z + 0.1, { rx: 0.4 }); // spade handles
  for (let i = 0; i < 5; i++) k.torus(0.465, 0.03, tone(body, 0.6), 0, -0.05 - i * 0.2, Z, { rx: PI / 2, seg: 20 }); // cooling rings
  k.box(0.14, 0.9, 0.06, tone(body, 0.75), 0, -0.45, Z + 0.47); // top spine
  k.tube([[0, 0.1, Z + 0.46], [0, 0.0, Z + 0.9], [0, -0.85, Z + 0.9], [0, -0.95, Z + 0.46]], 0.06, INK, { seg: 10, sides: 6 }); // carry handle
  // the ammo box on the right side and the belt running up into the drum
  k.box(0.5, 0.7, 0.6, tone(body, 0.85), 0.62, -0.4, Z - 0.35, { r: 0.05 });
  k.box(0.54, 0.1, 0.64, tone(body, 0.65), 0.62, -0.06, Z - 0.35, { r: 0.02 }); // lid
  k.box(0.08, 0.2, 0.2, INK, 0.89, -0.4, Z - 0.35); // latch
  k.box(0.26, 0.46, 0.2, INK, 0.42, -0.42, Z - 0.02, { rz: 0.4, r: 0.03 }); // feed chute
  for (let i = 0; i < 4; i++) k.cyl(0.06, 0.26, 0xc9a227, 0.36 + i * 0.05, -0.28 - i * 0.1, Z + 0.06 + i * 0.03, { axis: 'x', seg: 6 });
  k.box(0.2, 0.22, 0.56, INK, 0, -0.95, Z - 0.55, { r: 0.04 }); // front grip (the left hand)
  k.cyl(r * 1.75, 0.24, tone(body, 0.85), 0, -1.12, Z, { seg: 18 }); // front bearing
  k.cyl(r * 1.55, 0.6, tone(body, 0.7), 0, -1.45, Z, { seg: 18, open: true, r2: r * 1.75 }); // shroud
  if (o.glow) {
    for (const y of [-0.25, -0.65]) k.torus(0.48, 0.045, o.glow, 0, y, Z, { rx: PI / 2, seg: 20 });
    for (const s of [-1, 1]) k.box(0.06, 0.7, 0.06, o.glow, s * 0.45, -0.45, Z + 0.12);
    k.box(0.3, 0.3, 0.05, o.glow, 0.62, -0.4, Z - 0.66); // power cell window on the box
  }
  k.done();
  const spin = new THREE.Group();
  spin.position.set(0, -1.2, Z);
  g.add(spin);
  const b = wear(h, spin, `${key}:barrels`);
  const col = o.barrel ?? 0x1f1f1f;
  b.cyl(r * 0.45, len, INK, 0, -len / 2, 0, { seg: 10 }); // spindle
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2;
    const bx = Math.cos(a) * r;
    const bz = Math.sin(a) * r;
    b.cyl(r * 0.28, len, col, bx, -len / 2, bz, { seg: 8 });
    b.cyl(r * 0.14, 0.03, 0x050505, bx, -len - 0.01, bz, { seg: 6 }); // bore
  }
  for (const f of [0.55, 0.97]) b.cyl(r * 1.45, 0.11, tone(STEEL, 0.75), 0, -len * f, 0, { seg: 16 }); // clamps
  b.done();
  (h.spin ??= []).push(spin);
  muzzle(h, g, -1.2 - len, Z);
  return g;
}

/**
 * Golden Commando (golden perk of the Commando), all in gold. A minigun gunner in a tank top
 * with a bandolier and a bandana; Lv 1 Grip: gloves and knee pads, Lv 2 Gold Goggles: glowing
 * yellow goggles and an ammo backpack, Lv 3 Golden Heavy Cannon: a big six-barrel cannon in
 * both hands, Lv 4 Golden Laser Cannon: eight glowing barrels, a chest plate with a glowing
 * core, shoulder pads, feathered wings and a halo.
 */
export function makeGoldCommando(level) {
  const heavy = level >= 3;
  const laser = level >= 4;
  const shirt = 0x556b2f;
  const h = makeHumanoid({ skin: 0xa0522d, shirt, pants: 0x3e3a2a, arms: 0xa0522d, face: 'soldier' });
  if (heavy) h.body.scale.setScalar(1.06);
  const key = `gcommando${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const light = glowMat(h, 0xfff176);
  bandana(hd, 0xc62828);
  // tank top: straps over the shoulders and a scoop neck
  for (const s of [-1, 1]) t.box(0.36, 0.2, 1.06, shirt, s * 0.62, 0.98, 0, { r: 0.04 });
  t.box(0.9, 0.08, 0.06, tone(shirt, 0.7), 0, 0.82, 0.52);
  bandolier(t, 1);
  belt(t, 0x3e2723, 0xb0b0b0);
  for (const x of [-0.75, 0.75]) pouch(t, x, -1.08, 0.5, 0.36, 0.34, 0x4e3b28, 0.16);
  if (level >= 2) {
    // Gold Goggles: chunky goggles with glowing yellow lenses, an ammo backpack
    hd.torus(0.67, 0.05, 0x8d6e1a, 0, 0.72, 0, { rx: PI / 2, seg: 20 });
    for (const s of [-1, 1]) {
      hd.cyl(0.21, 0.18, 0x8d6e1a, s * 0.26, 0.72, 0.6, { axis: 'z', seg: 14 });
      hd.cyl(0.16, 0.04, glowMat(h, 0xffea00), s * 0.26, 0.72, 0.7, { axis: 'z', seg: 14 });
      hd.torus(0.19, 0.03, tone(0x8d6e1a, 0.7), s * 0.26, 0.72, 0.69, { seg: 14 });
    }
    hd.box(0.16, 0.1, 0.1, 0x8d6e1a, 0, 0.72, 0.66);
    ammoPack(t, 0x3a3a3a, { glow: laser ? light : null, w: heavy ? 1.7 : 1.6, h: heavy ? 1.9 : 1.8 });
  }
  if (laser) {
    // Golden armour: a chest plate with a glowing core, plated belly, shoulder pads
    t.box(2.18, 1.4, 1.2, 0xb0b0b0, 0, 0.2, 0, { r: 0.16 });
    for (let i = 0; i < 2; i++) for (const s of [-1, 1]) t.box(0.7, 0.22, 0.12, 0x9a9a9a, s * 0.4, -0.55 - i * 0.26, 0.54, { r: 0.04 });
    for (const s of [-1, 1]) t.box(0.06, 1.1, 0.04, 0x7a7a7a, s * 0.62, 0.25, 0.61); // plate lines
    core(t, 0x8a8a8a, light);
    shoulderPads(t, 0xb0b0b0, 0.58);
  }
  hd.done();
  t.done();
  if (laser) featherWings(h, key, 0xfff3c4, 0xffe082, { size: 0.9 });
  feet(h, key, 0x4e3b28, (b) => {
    if (level >= 1) kneePad(b, 0xffd54f);
    if (laser) b.box(1.1, 0.7, 1.1, 0xb0b0b0, 0, -0.55, 0.02, { r: 0.1 }); // thigh plates
  });
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    if (level >= 1) glove(a, 0xffd54f);
    a.box(1.04, 0.14, 1.04, 0x3e2723, 0, -0.75, 0); // arm band
    if (laser) armPlate(a, 0xb0b0b0);
    a.done();
  }
  h.muzzles = [];
  if (heavy) {
    heavyCannon(h, h.rightArm, `${key}:cannon`, {
      n: laser ? 8 : 6, r: laser ? 0.33 : 0.3, len: laser ? 2.1 : 1.9,
      body: 0x424242, barrel: laser ? light : 0x1f1f1f, glow: laser ? light : null,
    });
    h.rightArm.rotation.set(-PI / 2, 0, 0.15);
    h.leftArm.rotation.set(-PI / 2, 0, -0.45);
    h.pose = { right: -PI / 2, left: -PI / 2, leftRecoil: 0.1 };
  } else {
    minigun(h, h.rightArm, `${key}:mg`, { s: 1.15, len: 1.45, body: 0x424242, barrel: 0x1f1f1f });
    h.rightArm.rotation.set(-PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-PI / 2 + 0.15, 0, -0.55);
    h.pose = { right: -PI / 2, left: -PI / 2 + 0.15, leftRecoil: 0.1 };
  }
  goldify(h);
  if (laser) {
    const hk = wear(h, h.head, `${key}:halo`);
    halo(h, hk, 1.9, 0.75, 0xfff176);
    hk.done();
  }
  h.recoilScale = 0.25; // big rotary guns barely kick
  h.tracer = laser ? 0xfff176 : 0xffd740;
  return own(h);
}

// ------------------------------------------------------------------ Gold Commander

/** A crowned golden helmet (head space): shell, brow band with crown points and rubies, cheek guards, nose guard and a white plume. */
function crownHelm(h, k, gold, pale) {
  const ruby = glowMat(h, RUBY);
  dome(k, 0.78, 0.62, gold, 0, 0.92, -0.02);
  k.cyl(0.79, 0.28, pale, 0, 1.02, -0.02, { seg: 24 }); // brow band
  k.torus(0.79, 0.04, tone(0xffc107, 0.75), 0, 0.88, -0.02, { rx: PI / 2, seg: 24 });
  for (let i = 0; i < 7; i++) {
    // crown points round the front and sides
    const a = -1.5 + i * 0.5;
    const x = Math.sin(a) * 0.8;
    const z = Math.cos(a) * 0.8 - 0.02;
    k.cyl(0.12, 0.38, gold, x, 1.34, z, { r2: 0.0, seg: 4, ry: a });
    k.ball(0.06, pale, x, 1.55, z, { seg: 6, rows: 4 });
  }
  k.cyl(0.11, 0.06, ruby, 0, 1.02, 0.8, { axis: 'z', seg: 10 }); // big ruby on the brow
  for (const s of [-1, 1]) k.cyl(0.06, 0.05, ruby, s * 0.56, 1.02, 0.57, { axis: 'z', seg: 8, ry: s * 0.78 });
  for (const s of [-1, 1]) k.box(0.12, 0.6, 0.5, gold, s * 0.72, 0.6, 0.15, { r: 0.04, rz: s * 0.08 }); // cheek guards
  k.box(0.1, 0.42, 0.08, gold, 0, 0.78, 0.8, { r: 0.02 }); // nose guard
  // the plume: a white crest from the front of the crown over the back
  k.box(0.12, 0.2, 0.5, pale, 0, 1.55, 0.0, { r: 0.04 }); // plume holder
  const P = 0xfafafa;
  for (let i = 0; i < 7; i++) {
    const a = 0.3 + i * 0.32;
    k.ball(0.26 - i * 0.015, i % 2 ? tone(P, 0.92) : P, 0, 1.6 + Math.sin(a) * 0.45, 0.35 - i * 0.2, { sx: 0.45, seg: 8, rows: 6 });
  }
  k.cyl(0.08, 0.7, P, 0, 1.6, -1.15, { r2: 0.2, rx: 0.5, seg: 6 }); // plume tail
}

/** The giant broadsword in its scabbard, across the back (a kit on its own group). */
function backSword(k, gold, pale) {
  k.box(0.62, 4.0, 0.22, 0x6d1414, 0, 0.0, 0, { r: 0.05 }); // scabbard
  for (const y of [-1.2, 0.0, 1.2]) k.box(0.68, 0.14, 0.26, gold, 0, y, 0, { r: 0.03 }); // bands
  k.cyl(0.31, 0.3, gold, 0, -2.1, 0, { r2: 0.31, seg: 4, sz: 0.38, ry: PI / 4 }); // chape
  k.box(1.4, 0.24, 0.3, gold, 0, 2.12, 0, { r: 0.06 }); // crossguard
  for (const s of [-1, 1]) k.ball(0.14, pale, s * 0.72, 2.12, 0, { seg: 8, rows: 6 });
  k.cyl(0.13, 0.8, 0x5d4037, 0, 2.62, 0, { seg: 8 }); // grip
  for (let i = 0; i < 4; i++) k.torus(0.13, 0.025, INK, 0, 2.35 + i * 0.18, 0, { rx: PI / 2, seg: 8 });
  k.ball(0.2, gold, 0, 3.1, 0, { seg: 10, rows: 7 }); // pommel
}

/**
 * Gold Commander: a general in golden plate armour with a red cape, a crowned helmet with a white
 * plume, a ruby on his chest and a giant golden broadsword sheathed on his back. Lv 1 Gold
 * Digging: a bag of gold coins and a small golden pickaxe on his belt; Lv 2 Call to Battle: the
 * broadsword comes out in his right hand during the ability (`goldSword`, shown by the view);
 * Lv 3 Deus Ex Machina: a holo-radio on his left wrist; Lv 4 Give them hell!: glowing golden
 * wings, a halo and the sword is always out, bigger and glowing.
 */
export function makeGoldCommander(level) {
  const h = makeHumanoid({ skin: 0xc68642, shirt: 0xd4a017, pants: 0x8d6e00, arms: 0xd4a017, face: 'soldier' });
  h.body.scale.setScalar(1.12);
  const big = level >= 4;
  const gold = 0xffc107;
  const pale = 0xffe082;
  const deep = 0xc79100;
  const red = 0xb71c1c;
  const ruby = glowMat(h, RUBY);
  const key = `gcommander${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  crownHelm(h, hd, gold, pale);
  // the armour: a breastplate with a raised ridge, the ruby in a sunburst setting, a gorget,
  // plated belly bands and tassets over the hips
  t.box(2.2, 1.25, 1.2, gold, 0, 0.35, 0, { r: 0.18 }); // breastplate
  t.box(0.12, 1.1, 0.06, pale, 0, 0.35, 0.61); // centre ridge
  for (const s of [-1, 1]) t.box(0.05, 0.9, 0.04, deep, s * 0.6, 0.38, 0.6, { rz: s * 0.12 }); // plate lines
  t.cyl(0.26, 0.1, pale, 0, 0.45, 0.62, { axis: 'z', seg: 16 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    t.box(0.06, 0.16, 0.04, pale, Math.sin(a) * 0.32, 0.45 + Math.cos(a) * 0.32, 0.63, { rz: -a });
  }
  t.cyl(0.17, 0.08, ruby, 0, 0.45, 0.68, { axis: 'z', seg: 12 }); // the ruby
  t.cyl(0.62, 0.22, pale, 0, 1.02, 0.02, { seg: 20, sx: 1.25, sz: 0.85 }); // gorget
  for (let i = 0; i < 3; i++) t.box(2.14 - i * 0.04, 0.2, 1.16, i % 2 ? deep : gold, 0, -0.42 - i * 0.2, 0, { r: 0.05 }); // belly bands
  t.box(2.1, 0.26, 1.12, 0x5d4037, 0, -1.0, 0, { r: 0.04 }); // belt
  t.box(0.46, 0.36, 0.08, gold, 0, -1.0, 0.58, { r: 0.04 }); // buckle
  t.cyl(0.08, 0.05, ruby, 0, -1.0, 0.63, { axis: 'z', seg: 8 });
  for (const s of [-1, 1]) {
    t.slab(0.8, 0.6, 0.12, gold, s * 0.5, -1.4, 0.56, { bw: 1.15, rx: -0.12 }); // tassets
    t.box(0.82, 0.06, 0.04, deep, s * 0.5, -1.25, 0.64);
  }
  shoulderPads(t, pale, 0.64);
  for (const s of [-1, 1]) t.torus(0.5, 0.05, gold, s * 1.45, 0.82, 0, { rx: PI / 2, seg: 16, sx: 1.1 }); // pauldron rims
  cape(t, red, 3.1, { clasp: gold, w: 2.1 });
  t.box(2.2, 0.1, 0.12, gold, 0, -2.08, -0.8, { r: 0.03 }); // gold hem on the cape
  if (level >= 1) {
    // Gold Digging: a sack of coins on the right hip and a small golden pickaxe on the left
    t.ball(0.36, 0x8d6e63, 0.95, -1.35, 0.35, { sy: 1.1, seg: 12, rows: 8 });
    t.cyl(0.14, 0.2, 0x6d4c41, 0.95, -0.95, 0.35, { seg: 8, r2: 0.2 });
    t.torus(0.14, 0.03, gold, 0.95, -1.02, 0.35, { rx: PI / 2, seg: 10 });
    for (const [x, y, z] of [[0.9, -0.86, 0.38], [1.02, -0.84, 0.3], [0.96, -0.8, 0.28]]) t.cyl(0.1, 0.03, gold, x, y, z, { seg: 10, rx: 0.3 });
    t.cyl(0.1, 0.03, gold, 0.95, -1.35, 0.72, { axis: 'z', seg: 10 }); // a coin printed on the sack
    t.cyl(0.05, 1.0, 0x6d4c41, -0.95, -1.35, 0.6, { seg: 8 }); // pickaxe handle
    t.tube([[-1.4, -0.95, 0.6], [-1.15, -0.82, 0.6], [-0.75, -0.82, 0.6], [-0.5, -0.95, 0.6]], 0.06, gold, { seg: 10, sides: 6 });
    t.box(0.14, 0.16, 0.16, deep, -0.95, -0.84, 0.6);
  }
  if (big) halo(h, hd, 2.3, 0.85, 0xfff59d); // Give them hell!: a halo over the plume
  hd.done();
  t.done();
  // the sheathed broadsword across the back (put away for good once he always holds it)
  if (!big) {
    const back = new THREE.Group();
    back.position.set(0, 0.1, -0.95);
    back.rotation.z = 0.5;
    h.torso.add(back);
    const bk = wear(h, back, `gcommander:back`);
    backSword(bk, gold, pale);
    bk.done();
  }
  if (big) {
    // Give them hell!: glowing golden wings
    featherWings(h, key, glowGlass(h, 0xffd54f, 0.8), pale, { size: 1.0 });
  }
  // arms: golden gauntlets and upper arm plates; Lv 3 a holo-radio on the left wrist
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    armPlate(a, pale);
    gauntlet(a, gold, deep);
    if (level >= 3 && s > 0) {
      a.box(1.14, 0.34, 1.14, 0x263238, 0, -1.08, 0, { r: 0.05 });
      a.box(0.06, 0.24, 0.5, glowMat(h, 0x00e5ff), 0.59, -1.08, 0); // screen
      a.cyl(0.03, 0.4, STEEL, 0.4, -0.75, 0.4, { seg: 6 }); // little antenna
      a.ball(0.05, glowMat(h, 0x00e5ff), 0.4, -0.53, 0.4, { seg: 6, rows: 4 });
    }
    a.done();
  }
  if (level >= 3) {
    // the hologram over the radio: a see-through cyan panel with a tank outline
    const holo = wear(h, h.leftArm, `${key}:holo`);
    const hm = glowGlass(h, 0x18ffff, 0.45);
    holo.box(0.04, 0.5, 0.6, hm, 0.8, -1.08, 0);
    holo.done();
  }
  feet(h, key, 0x5d4037, (b) => {
    b.box(1.1, 0.8, 1.12, gold, 0, -0.55, 0.02, { r: 0.1 }); // thigh plates
    b.ball(0.3, pale, 0, -1.05, 0.5, { sy: 0.8, seg: 10, rows: 6 }); // knee cops
    b.box(1.1, 0.42, 0.24, gold, 0, -1.38, 0.5, { r: 0.06 }); // greaves
  });
  // Call to Battle: the giant golden broadsword in his right hand (hidden until he pulls it out)
  h.muzzles = [];
  if (level >= 2) {
    const sw = fist(h.rightArm, -1.9, 1);
    const sk = wear(h, sw, `${key}:sword`);
    const segs = big ? [0xffd54f, 0xffe57f, 0xfff59d, 0xfffde7].map((c) => glowMat(h, c)) : null; // a blade that glows brighter to the tip
    sword(sk, big ? 6.4 : 5.0, 0.75, pale, { metal: gold, gem: ruby, grip: 0x5d4037, guard: 1.6, edge: 0xfff3c4, segs });
    sk.done();
    sw.visible = big;
    h.goldSword = sw;
  }
  // A raised fist when the sword is away; the sword arm swings down when he attacks.
  h.rightArm.rotation.set(big ? -2.2 : -0.4, 0, 0.1);
  h.leftArm.rotation.set(-0.3, 0, -0.1);
  h.pose = { right: big ? -2.2 : -0.4, left: -0.3, leftRecoil: 0 };
  h.swing = level >= 2 ? 1.6 : 0;
  h.swordRest = -0.4; // arm pose with the sword put away
  h.swordUp = -2.2; // arm pose with the sword out
  muzzle(h, h.rightArm, -2, 0);
  h.tracer = 0xffd54f;
  return own(h, 0);
}

export const MODELS = {
  goldScoutBase: makeGoldScout,
  goldCommando: makeGoldCommando,
  goldCommander: makeGoldCommander,
};
