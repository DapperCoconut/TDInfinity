// Humanoid summons, batch 4 (see summons.js): the Elf Camp elves and the Bubble Blower's
// Bubble Companion, dressed with the vehicle kit like the people towers (people1.js).
//   elfbasic   Elf: a candy cane in hand
//   elfsnow    Snowball Elf: a snowball to throw and a pouch of spares on the belt
//   elfcannon  Cannon Elf: a little wood-and-brass hand cannon
//   elfgunner  Gunner Elf: shades and a black toy-shop SMG
//   elfbomb    Bomb Elf: a red tunic and a present with a lit fuse
//   elfguard   Elf Guard: a gingerbread sword with icing and a round cookie shield
//   elfguard2  Elf Guard 2: steel chest plate, a helmet and a glowing red candy sword
//   elfgift    Gift Bomber: rides a flying sled with a big present on the back (u.fly)
//   elfripped  Ripped Elf: bare huge arms, a black tank top, a black present with a red ribbon
//   bubblebuddy Bubble Companion: a round little bubble person inside a big clear bubble
// The elves share one body (elfBody): pointy ears, a striped hat with a bobble, a tunic with a
// jagged hem, gold buttons and curly shoes with bells (the Elf tower's look, made smaller).
// Unit contract kept from makeCampUnit / makeBubbleBuddy in units.js: one unit on the spot,
// soldiers scaled 0.6 * size, height 3.5 * size, tracer and projectile from the soldier.

import * as THREE from 'three';
import { glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { makeThing } from './bits.js';
import { GOLD, INK, UP, belt, dome, fist, hair, helmet, muzzle, own, pouch, shades, wear } from './people1.js';
import { feet, hands } from './people5.js';
import { smg } from './people3.js';
import { gift } from './people12.js';

const PI = Math.PI;
const SKIN = 0xf1c27d;
const SNOW = 0xf5f7fa;
const RED = 0xc62828;
const GREEN = 0x2e7d32;
const BROWN = 0x8d5a2b;
const GINGER = 0xc68642;
const BUBBLE = 0xb3e5fc;

/** A see-through material that keeps its look when the unit fades (setOpacity reads keepOpacity). */
function clearMat(h, color, op) {
  const m = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: op, depthWrite: false });
  m.userData.keepOpacity = op;
  h.mats.push(m);
  return m;
}

// ------------------------------------------------------------------ the elf body

/** Tunic colours per elf (the old ones). */
const TUNIC = { elfguard: 0x1b5e20, elfguard2: 0x0d3b10, elfgunner: 0x33691e, elfbomb: 0xb71c1c, elfgift: RED };

/**
 * One elf: makeHumanoid plus ears, hat, tunic, belt and curly shoes. o.ripped: bare arms with big
 * muscles and a black tank top; o.helm: a steel helmet instead of the hat; o.plate: a chest plate.
 */
function elfBody(model, o = {}) {
  const tunic = TUNIC[model] ?? GREEN;
  const ripped = !!o.ripped;
  const h = makeHumanoid({ skin: SKIN, shirt: ripped ? 0x1c1c1c : tunic, pants: RED, arms: ripped ? SKIN : tunic, face: 'smile' });
  const key = `sum4:${model}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0xa1662f, { h: 0.4 });
  // pointy ears
  for (const s of [-1, 1]) {
    hd.cyl(0.15, 0.6, SKIN, s * 0.86, 0.8, -0.02, { seg: 5, r2: 0.01, rz: -s * 1.15, sz: 0.5 });
    hd.cyl(0.07, 0.35, 0xe8a87c, s * 0.82, 0.78, 0.02, { seg: 5, r2: 0.01, rz: -s * 1.15, sz: 0.4 });
  }
  if (o.helm) {
    helmet(hd, 0x90a4ae, { cover: 0x0d3b10 });
    hd.box(0.14, 0.5, 0.14, glowMat(h, 0xff1744), 0, 1.6, 0, { r: 0.04 }); // a red crest
  } else {
    // the hat: a fur cuff, a short cone of stripes leaning back, and a bobble
    hd.cyl(0.74, 0.26, SNOW, 0, 1.02, 0, { seg: 22 });
    let p = [0, 1.12, -0.02];
    const n = 5;
    for (let i = 0; i < n; i++) {
      const a = -0.2 - i * 0.26;
      const len = 0.4;
      const r0 = 0.68 * (1 - i / n) + 0.05;
      const r1 = 0.68 * (1 - (i + 1) / n) + 0.05;
      hd.cyl(r0, len * 1.08, i % 2 ? SNOW : GREEN, 0, p[1] + (Math.cos(a) * len) / 2, p[2] + (Math.sin(a) * len) / 2, { r2: r1, rx: a, seg: 14 });
      p = [0, p[1] + Math.cos(a) * len, p[2] + Math.sin(a) * len];
    }
    hd.ball(0.2, SNOW, 0, p[1], p[2], { seg: 10, rows: 7 });
  }
  if (ripped) {
    // a black tank top with straps, a gold chain, and a jagged green hem peeking out under it
    for (const s of [-1, 1]) t.box(0.5, 0.32, 1.04, SKIN, s * 0.78, 0.86, 0, { r: 0.06 }); // bare shoulders
    t.box(1.0, 0.24, 0.04, SKIN, 0, 0.88, 0.51); // neck opening
    t.torus(0.5, 0.04, GOLD, 0, 0.62, 0.38, { rx: 1.2, seg: 16, arc: PI, rz: PI });
  } else {
    // the tunic: jagged hem, a pointed collar, gold buttons
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * PI * 2;
      t.cyl(0.26, 0.45, tunic, Math.sin(a) * 1.0, -1.1, Math.cos(a) * 0.55, { seg: 4, r2: 0.01, rx: PI, ry: a });
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      t.cyl(0.18, 0.34, o.collar ?? RED, Math.sin(a) * 0.72, 0.95, Math.cos(a) * 0.5, { seg: 4, r2: 0.01, rz: -(PI / 2 + 0.4), ry: a - PI / 2 });
    }
    t.cyl(0.66, 0.16, o.collar ?? RED, 0, 0.98, 0, { seg: 16, sz: 0.75 });
    if (!o.plate) for (const y of [0.55, 0.15, -0.25]) t.ball(0.07, GOLD, 0, y, 0.53, { seg: 8, rows: 5 });
  }
  t.box(2.14, 0.3, 1.14, tone(tunic, 0.85), 0, -0.95, 0, { r: 0.05 });
  belt(t, 0x3e2723, GOLD, -0.62);
  if (o.plate) {
    // a steel chest plate with rivets, a back plate and shoulder guards
    t.box(1.8, 1.3, 0.22, 0x90a4ae, 0, 0.25, 0.58, { r: 0.08 });
    t.box(1.8, 1.3, 0.2, 0x78909c, 0, 0.25, -0.58, { r: 0.08 });
    t.box(0.4, 0.6, 0.06, 0x0d3b10, 0, 0.3, 0.7, { r: 0.03 }); // a tree crest
    t.cyl(0.18, 0.3, GOLD, 0, 0.62, 0.72, { seg: 3, r2: 0.01 });
    for (const [x, y] of [[-0.75, 0.75], [0.75, 0.75], [-0.75, -0.25], [0.75, -0.25]]) t.ball(0.05, 0xcfd8dc, x, y, 0.7, { seg: 6, rows: 4 });
    for (const s of [-1, 1]) dome(t, 0.6, 0.4, 0x90a4ae, s * 1.0, 0.85, 0, { sz: 0.95 });
  }
  o.torso?.(t, h);
  hd.done();
  t.done();
  hands(h, key, null, ripped ? SKIN : SNOW, (a, s) => {
    if (ripped) {
      a.ball(0.5, SKIN, s * 0.16, -0.5, 0.2, { sy: 0.85, seg: 12, rows: 8 }); // big shoulders
      a.ball(0.38, tone(SKIN, 0.95), s * 0.1, -1.1, 0.25, { sy: 0.8, seg: 10, rows: 7 }); // forearms
      a.box(1.1, 0.16, 1.1, INK, 0, -1.55, 0, { r: 0.04 }); // wrist bands
    } else a.box(1.08, 0.2, 1.08, SNOW, 0, -1.5, 0, { r: 0.04 }); // fur cuffs
  });
  feet(h, key, o.boot ?? 0x1b5e20, (b) => {
    // curly toes with a bell
    const col = o.boot ?? 0x1b5e20;
    b.tube([[0, -1.9, 0.5], [0, -1.85, 0.85], [0, -1.6, 1.0], [0, -1.45, 0.85]], 0.13, col, { seg: 12, sides: 8 });
    b.ball(0.12, GOLD, 0, -1.42, 0.78, { seg: 8, rows: 6 });
    b.box(1.12, 0.14, 1.14, SNOW, 0, -1.38, 0.02);
  });
  h.muzzles = [];
  h.tracer = 0xffffff;
  h.size = 0.75;
  return { h, key };
}

/** The arms: right forward (holding out), left down by the side (old makeCampUnit pose). */
function holdOut(h, right = -PI / 2, left = -0.4) {
  h.rightArm.rotation.set(right, 0, 0.1);
  h.leftArm.rotation.set(left, 0, -0.2);
  h.pose = { right, left, leftRecoil: 0 };
}

// ------------------------------------------------------------------ the elves

function elfBasic() {
  const { h, key } = elfBody('elfbasic');
  // a striped candy cane, hook up
  const g = fist(h.rightArm, -1.9, 1.3);
  const k = wear(h, g, `${key}:cane`);
  for (let i = 0; i < 6; i++) k.cyl(0.09, 0.2, i % 2 ? RED : SNOW, 0, 0.5 - i * 0.2, 0, { seg: 8 });
  k.torus(0.22, 0.09, SNOW, 0, 0.6, 0.22, { ry: PI / 2, seg: 12, arc: PI, rz: PI / 2 });
  k.torus(0.22, 0.095, RED, 0, 0.6, 0.22, { ry: PI / 2, seg: 12, arc: PI * 0.35, rz: PI / 2 + 1 });
  k.done();
  muzzle(h, g, -0.4, 0);
  holdOut(h, -0.4, -0.4);
  return h;
}

function elfSnow() {
  const { h, key } = elfBody('elfsnow', {
    torso: (t) => {
      // a pouch of spare snowballs on the hip
      pouch(t, 0.7, -0.95, 0.5, 0.5, 0.42, 0x6d4c41, 0.22);
      for (const [x, z] of [[0.6, 0.62], [0.8, 0.6]]) t.ball(0.13, SNOW, x, -0.62, z, { seg: 8, rows: 6 });
    },
  });
  const g = fist(h.rightArm, -1.9, 1.3);
  const k = wear(h, g, `${key}:ball`);
  k.ball(0.3, SNOW, 0, -0.3, 0, { seg: 12, rows: 9 });
  k.ball(0.12, 0xe3f2fd, 0.18, -0.4, 0.15, { seg: 6, rows: 4 }); // a lump
  k.done();
  muzzle(h, g, -0.4, 0);
  holdOut(h);
  h.projectile = { color: 0xffffff, size: 0.4, arc: 2 };
  return h;
}

function elfCannon() {
  const { h, key } = elfBody('elfcannon', {
    torso: (t) => {
      // a powder horn and a little cannonball pouch
      t.cyl(0.14, 0.7, 0xe0c9a6, -0.75, -0.85, 0.5, { seg: 8, r2: 0.05, rz: 0.9 });
      t.cyl(0.15, 0.08, BROWN, -0.47, -0.65, 0.5, { seg: 8, rz: 0.9 });
      pouch(t, 0.7, -0.95, 0.5, 0.46, 0.4, 0x5d4037, 0.22);
    },
  });
  // a short wooden hand cannon with brass bands: barrel along -y
  const g = fist(h.rightArm, -1.9, 1.3);
  const k = wear(h, g, `${key}:cannon`);
  const U = UP;
  k.box(0.3, 0.9, 0.3, BROWN, 0, 0.1, U - 0.12, { r: 0.06 }); // stock over the fist
  k.cyl(0.2, 1.3, 0x37474f, 0, -0.85, U, { seg: 14, r2: 0.16 }); // barrel
  for (const y of [-0.35, -0.95, -1.45]) k.cyl(0.215, 0.08, GOLD, 0, y, U, { seg: 14 }); // brass bands
  k.cyl(0.25, 0.16, 0x263238, 0, -1.55, U, { seg: 14 }); // muzzle ring
  k.cyl(0.13, 0.03, INK, 0, -1.64, U, { seg: 10 }); // bore
  k.ball(0.06, 0x5d4037, 0, -0.2, U + 0.2, { seg: 6, rows: 4 }); // touch hole
  k.done();
  muzzle(h, g, -1.6, U);
  holdOut(h);
  h.tracer = 0xffd54f;
  return own(h);
}

function elfGunner() {
  const { h, key } = elfBody('elfgunner', {
    torso: (t) => {
      for (const x of [-0.45, 0.45]) pouch(t, x, -0.2, 0.5, 0.36, 0.42, 0x1b1b1b, 0.18); // mag pouches
      t.box(0.24, 2.4, 1.12, INK, 0, 0, 0, { rz: 0.62 }); // sling strap
    },
  });
  const hd = wear(h, h.head, `${key}:shades`);
  shades(hd, 0x111111, 0x263238);
  hd.done();
  const g = fist(h.rightArm, -1.9, 1.3);
  const k = wear(h, g, `${key}:gun`);
  const [tip, z] = smg(k, { body: 0x212121 });
  k.box(0.32, 0.1, 0.42, RED, 0, -0.45, UP + 0.02, { r: 0.02 }); // a red toy-shop stripe
  k.done();
  muzzle(h, g, tip, z);
  holdOut(h);
  h.tracer = 0xffd54f;
  return own(h);
}

function elfBomb() {
  const { h, key } = elfBody('elfbomb', {
    collar: 0x1b5e20,
    torso: (t) => {
      // a bandolier of little firecracker sticks
      t.box(0.26, 2.5, 1.12, 0x3e2723, 0, 0, 0, { rz: -0.62 });
      for (let i = 0; i < 4; i++) t.cyl(0.07, 0.3, i % 2 ? 0xffd54f : RED, -0.55 + i * 0.32, 0.55 - i * 0.37, 0.6, { seg: 8, rz: -0.62 });
    },
  });
  const g = fist(h.rightArm, -1.9, 1.3);
  const k = wear(h, g, `${key}:bomb`);
  gift(k, 0, -0.3, 0, 0.7, 0xffd54f, RED);
  k.tube([[0.15, 0.05, 0.1], [0.25, 0.25, 0.15], [0.2, 0.42, 0.1]], 0.03, 0x5d4037, { seg: 6, sides: 4 }); // fuse
  k.ball(0.09, glowMat(h, 0xff9100), 0.2, 0.47, 0.1, { seg: 8, rows: 6 }); // the spark
  k.done();
  muzzle(h, g, -0.4, 0);
  holdOut(h);
  return h;
}

/** A gingerbread sword (gun space, blade along -y): icing zigzag, candy buttons. */
function cookieSword(k, blade, icing) {
  k.cyl(0.11, 0.5, 0x5d4037, 0, 0.1, 0, { seg: 8 }); // grip
  k.ball(0.16, RED, 0, 0.4, 0, { seg: 10, rows: 7 }); // gumdrop pommel
  k.box(0.2, 0.16, 0.8, GINGER, 0, -0.22, 0, { r: 0.07 }); // guard
  for (const s of [-1, 1]) k.ball(0.1, icing, 0, -0.22, s * 0.42, { seg: 8, rows: 5 });
  k.box(0.14, 1.5, 0.32, blade, 0, -1.05, 0, { r: 0.05 });
  k.slab(0.14, 0.3, 0.32, blade, 0, -1.95, 0, { bd: 0.06 });
  for (let i = 0; i < 6; i++) k.box(0.16, 0.24, 0.04, icing, 0, -0.45 - i * 0.24, (i % 2 ? 1 : -1) * 0.07, { rx: (i % 2 ? 1 : -1) * 0.6 }); // icing zigzag
  return -2.1;
}

function elfGuard(model) {
  const two = model === 'elfguard2';
  const { h, key } = elfBody(model, { helm: two, plate: two, boot: two ? 0x37474f : undefined });
  // the sword
  const g = fist(h.rightArm, -1.9, 1.3);
  const k = wear(h, g, `${key}:sword`);
  if (two) {
    const blade = glowMat(h, 0xff1744);
    cookieSword(k, blade, glowMat(h, 0xffcdd2, 0.6));
  } else cookieSword(k, GINGER, SNOW);
  k.done();
  // a round cookie shield on the left arm
  const sk = wear(h, h.leftArm, `${key}:shield`);
  const sc = two ? 0x90a4ae : GINGER;
  sk.cyl(0.75, 0.16, sc, 0.62, -1.1, 0, { axis: 'x', seg: 20 });
  sk.torus(0.72, 0.06, two ? 0x546e7a : SNOW, 0.72, -1.1, 0, { ry: PI / 2, seg: 20 });
  if (two) sk.box(0.06, 0.5, 0.5, glowMat(h, 0xff1744), 0.72, -1.1, 0, { rx: PI / 4 });
  else for (const [y, z] of [[-0.85, 0.2], [-1.3, -0.25], [-1.0, -0.3], [-1.3, 0.25]]) sk.ball(0.08, [RED, GREEN][(y * 10) & 1], 0.72, y, z, { seg: 6, rows: 4 }); // candy bits
  sk.done();
  muzzle(h, g, -1.0, 0);
  holdOut(h, -PI / 2, -0.6);
  h.size = 0.85;
  return h;
}

function elfGift() {
  const { h, key } = elfBody('elfgift');
  // the flying sled under the elf: a red tub, gold trim, curly runners and a big present behind
  const k = wear(h, h.body, `${key}:sled`);
  k.box(2.3, 0.5, 3.0, 0xb71c1c, 0, 0.1, -0.1, { r: 0.12 });
  k.box(2.4, 0.1, 3.1, GOLD, 0, 0.38, -0.1, { r: 0.04 });
  k.box(2.1, 0.06, 2.8, 0x5d4037, 0, 0.36, -0.1); // floor
  for (const s of [-1, 1]) {
    k.tube([[s * 1.0, -0.15, -1.6], [s * 1.0, -0.3, -0.5], [s * 1.0, -0.3, 1.2], [s * 1.0, 0.0, 1.8], [s * 1.0, 0.45, 1.75]], 0.07, GOLD, { seg: 16, sides: 6 });
    for (const z of [-0.9, 0.9]) k.box(0.08, 0.3, 0.08, GOLD, s * 1.0, -0.15, z);
  }
  gift(k, 0, 1.25, -1.0, 1.4, 0x43a047, 0xffd54f, { ry: 0.15 });
  gift(k, 0.75, 0.75, 0.9, 0.6, 0x1e88e5, SNOW, { ry: -0.4 });
  k.done();
  // a green present ready to drop
  const g = fist(h.rightArm, -1.9, 1.3);
  const gk = wear(h, g, `${key}:drop`);
  gift(gk, 0, -0.3, 0, 0.6, 0x43a047, RED);
  gk.done();
  muzzle(h, g, -0.4, 0);
  holdOut(h, -2.6, -0.4);
  h.size = 0.9;
  h.projectile = { color: 0x43a047, size: 0.6, arc: 3 };
  return h;
}

function elfRipped() {
  const { h, key } = elfBody('elfripped', { ripped: true });
  const g = fist(h.rightArm, -1.9, 1.3);
  const k = wear(h, g, `${key}:gift`);
  gift(k, 0, -0.4, 0, 1.0, 0x212121, 0xff1744);
  k.done();
  muzzle(h, g, -0.4, 0);
  holdOut(h);
  h.size = 1.5;
  h.projectile = { color: 0x212121, size: 0.9, arc: 4 };
  return h;
}

// ------------------------------------------------------------------ Bubble Companion

function bubbleBuddy() {
  const h = makeHumanoid({ skin: BUBBLE, shirt: 0x81d4fa, pants: 0x4fc3f7, arms: 0x81d4fa, face: 'smile' });
  const key = 'sum4:bubblebuddy';
  const soap = glowMat(h, 0xe1f5fe, 0.5);
  const film = clearMat(h, 0xe1f5fe, 0.28);
  const hd = wear(h, h.head, `${key}:head`);
  // a round soapy top and cheeks
  dome(hd, 0.68, 0.5, 0x81d4fa, 0, 0.95, 0);
  for (const [x, z, r] of [[-0.3, 0.1, 0.14], [0.25, -0.2, 0.12], [0, 0.3, 0.1]]) hd.ball(r, soap, x, 1.38, z, { seg: 8, rows: 6 }); // foam on top
  for (const s of [-1, 1]) hd.box(0.16, 0.08, 0.03, 0xf48fb1, s * 0.35, 0.5, 0.63, { r: 0.02 }); // cheeks
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  t.cyl(0.4, 0.06, 0xfafafa, 0, 0.3, 0.52, { axis: 'z', seg: 20 }); // a bubble badge
  t.torus(0.4, 0.05, 0x4fc3f7, 0, 0.3, 0.55, { seg: 20 });
  for (const [x, y, r] of [[-0.12, 0.22, 0.13], [0.12, 0.42, 0.09]]) t.ball(r, soap, x, y, 0.56, { seg: 8, rows: 6 });
  belt(t, 0x0288d1, 0xfafafa);
  t.done();
  hands(h, key, 0xf06292, 0x4fc3f7);
  feet(h, key, 0x0288d1);
  // the big bubble round the whole buddy, with a shine and little bubbles floating by
  const bk = wear(h, h.body, `${key}:bubble`);
  bk.ball(2.4, film, 0, 3.2, 0, { seg: 22, rows: 16 });
  bk.torus(1.4, 0.06, soap, -0.9, 4.6, 1.1, { arc: 1.2, rx: -0.5, ry: -0.6, seg: 14 }); // shine streak
  bk.ball(0.18, soap, -1.2, 4.9, 1.2, { seg: 8, rows: 6 });
  for (const [x, y, z, r] of [[2.6, 4.8, 0.6, 0.3], [-2.5, 2.2, -0.4, 0.22], [1.9, 1.0, -1.4, 0.18]]) bk.ball(r, film, x, y, z, { seg: 12, rows: 9 });
  bk.done();
  h.rightArm.rotation.set(-0.3, 0, 0.3);
  h.leftArm.rotation.set(-0.3, 0, -0.3);
  h.muzzles = [];
  h.tracer = BUBBLE;
  h.size = 0.8;
  return h;
}

// ------------------------------------------------------------------ the unit

/** One elf (or the bubble buddy) standing on the spot, as makeUnit's camp branch made it. */
function campUnit(model, build, count) {
  const u = makeThing();
  u.wheels = [];
  u.soldiers = [];
  for (let i = 0; i < count; i++) {
    const h = build(model);
    h.root.scale.setScalar(0.6 * (h.size ?? 1));
    h.root.position.set((i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.soldiers.push(h);
    u.muzzles.push(h.muzzles[0]);
  }
  u.height = 3.5 * (u.soldiers[0].size ?? 1);
  u.soldiers[0].root.position.set(0, 0, 0);
  u.tracer = u.soldiers[0].tracer;
  u.projectile = u.soldiers[0].projectile;
  if (model === 'elfgift') u.fly = 7; // Gift Bombers fly over the path
  return u;
}

const ELVES = {
  elfbasic: elfBasic,
  elfsnow: elfSnow,
  elfcannon: elfCannon,
  elfbomb: elfBomb,
  elfguard: elfGuard,
  elfgunner: elfGunner,
  elfguard2: elfGuard,
  elfgift: elfGift,
  elfripped: elfRipped,
  bubblebuddy: bubbleBuddy,
};

export const SUMMONS = Object.fromEntries(Object.entries(ELVES).map(([m, build]) => [m, (count = 1) => campUnit(m, build, count)]));
