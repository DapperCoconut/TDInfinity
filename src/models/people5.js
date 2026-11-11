// Tower models: people, batch 5 (dressed with the vehicle kit in ../vehicles.js).
// In here: Sniper, Classic Sniper, Tactical Sniper (+bottom), Penetrator, Enforcer, Warden,
// Slammer (+bottom).
// Each makeX(level) builds one tower's look; TOWER_MODELS in ../models.js says which tower uses which.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.

import * as THREE from 'three';
import { antenna, crate, glowMat, star, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import {
  GOLD, GUNMETAL, INK, LEATHER, STEEL, UP, aimLong, armPatch, band, belt, boots, cap, collar, dome, fist, glove,
  goggles, hair, headband, headset, helmet, kneePad, muzzle, own, pockets, pouch, shardOf, vest, wear,
} from './people1.js';
import { boltRifle, boonie, shoulderPads } from './people2.js';
import { bandolier, beanie } from './people3.js';

const PI = Math.PI;
const frac = (v) => v - Math.floor(v);
const LEAF = [0x556b2f, 0x6b8e23, 0x3d5229, 0x7a8b45, 0x5d5a33];

// ------------------------------------------------------------------ shared bits for this batch

/** See-through material (visors, riot shield windows), kept on the model like glow parts. */
function glassMat(h, color, opacity = 0.55) {
  const m = new THREE.MeshLambertMaterial({ color, transparent: true, opacity, depthWrite: false });
  h.mats.push(m);
  return m;
}

/**
 * Ghillie strands: thin leafy cones hanging from each point [x, y, z, nx, nz], thick end up,
 * tipped out along (nx, nz) so the suit looks shaggy.
 */
function shag(k, pts, len = 0.55, r = 0.13, seed = 0) {
  pts.forEach(([x, y, z, nx = 0, nz = 1], i) => {
    const j = i + seed;
    const l = len * (0.7 + 0.6 * frac(j * 0.618));
    const wob = (frac(j * 0.37) - 0.5) * 0.5;
    k.cyl(0.025, l, LEAF[j % LEAF.length], x, y - l / 2 + 0.08, z, { r2: r, seg: 5, rx: nz * 0.35 + wob, rz: -nx * 0.35 + wob * 0.6 });
  });
}

/** Points on the chest block (front, back and sides) for ghillie strands. */
function torsoShag() {
  const p = [];
  for (const y of [0.85, 0.25, -0.35, -0.9]) {
    for (const x of [-0.75, -0.25, 0.25, 0.75]) {
      p.push([x + (y > 0 ? 0.1 : -0.1), y, 0.6, 0, 1]);
      p.push([x, y, -0.6, 0, -1]);
    }
    for (const s of [-1, 1]) p.push([s * 1.05, y, 0, s, 0]);
  }
  return p;
}

/** A hood over the head, open at the face, with a stiff peak (head space). */
function hood(k, col) {
  dome(k, 0.8, 0.62, col, 0, 0.86, -0.04);
  band(k, 0.76, 0.08, 0.95, 3.5, col, 0.42, { ry: PI }); // back and sides
  k.box(1.2, 0.12, 0.3, tone(col, 0.85), 0, 1.3, 0.6, { rx: 0.35, r: 0.04 }); // peak
  k.box(0.5, 0.5, 0.4, col, 0, 0.6, -0.8, { r: 0.12 }); // where it falls on the back
  for (const s of [-1, 1]) k.cyl(0.03, 0.4, tone(col, 0.6), s * 0.2, 0.0, 0.62, { seg: 5 }); // draw strings
}

/** Gloved hands with a sleeve band (so the rig sees the glove as a hand, not a held thing). */
function hands(h, key, glov, sleeve, extra) {
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    a.box(1.04, 0.16, 1.04, sleeve, 0, -0.7, 0, { r: 0.03 });
    if (glov != null) glove(a, glov);
    extra?.(a, s);
    a.done();
  }
}

/** Boots on both legs, plus whatever `extra` adds to each leg. */
function feet(h, key, col, extra) {
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    boots(b, col);
    extra?.(b);
    b.done();
  }
}

/** A spotting scope on a tripod beside the tower (root space; the ground is y 0). */
function spotter(k, x, z, body = 0x37474f, lens = 0x4fc3f7) {
  const top = 1.95;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2 + 0.4;
    k.tube([[x, top, z], [x + Math.sin(a) * 0.6, 0.02, z + Math.cos(a) * 0.6]], 0.045, INK, { seg: 2, sides: 5 });
    k.ball(0.06, INK, x + Math.sin(a) * 0.6, 0.04, z + Math.cos(a) * 0.6, { seg: 6, rows: 4 });
  }
  k.cyl(0.12, 0.3, INK, x, top + 0.05, z, { seg: 10 }); // head
  k.cyl(0.18, 1.1, body, x, top + 0.3, z + 0.1, { axis: 'z', seg: 14, r2: 0.25 });
  k.cyl(0.27, 0.12, INK, x, top + 0.3, z + 0.7, { axis: 'z', seg: 14 }); // sun shade
  k.cyl(0.23, 0.02, lens, x, top + 0.3, z + 0.77, { axis: 'z', seg: 14 });
  k.cyl(0.1, 0.45, INK, x, top + 0.45, z - 0.55, { axis: 'z', seg: 10, rx: 0.6 }); // eyepiece, angled up
  k.cyl(0.08, 0.2, tone(body, 0.7), x + 0.2, top + 0.3, z + 0.1, { axis: 'x', seg: 10 }); // focus knob
}

/** A .50 ammo can with a handle and a stencil (root space). */
function ammoCan(k, x, z, col = 0x4b5320) {
  k.box(0.55, 0.62, 0.95, col, x, 0.31, z, { r: 0.04 });
  k.box(0.6, 0.12, 1.0, tone(col, 0.8), x, 0.6, z, { r: 0.02 }); // lid
  k.torus(0.16, 0.03, INK, x, 0.68, z, { seg: 10, arc: PI, ry: PI / 2 }); // handle
  k.box(0.04, 0.16, 0.5, 0xffd54f, x + 0.28, 0.32, z); // stencil
  k.box(0.08, 0.2, 0.08, INK, x - 0.3, 0.5, z + 0.35); // latch
}

/** A peaked guard / police cap: flat-topped crown, band, shiny peak and a badge (head space). */
function peakedCap(k, col, bandCol, badge) {
  k.cyl(0.72, 0.36, col, 0, 1.12, 0, { seg: 22, r2: 0.84 });
  k.cyl(0.84, 0.05, tone(col, 0.85), 0, 1.31, 0, { seg: 22 });
  k.cyl(0.74, 0.16, bandCol, 0, 1.02, 0, { seg: 22 });
  k.plan([[-0.5, 0], [0.5, 0], [0.42, 0.36], [0, 0.48], [-0.42, 0.36]], 0.05, 0x0d0d0d, 0, 0.94, 0.6, { rx: -0.2 });
  k.torus(0.74, 0.02, GOLD, 0, 1.1, 0, { rx: PI / 2, seg: 22, arc: 1.2, rz: PI / 2 - 0.6 }); // cord over the peak
  k.cyl(0.13, 0.05, badge, 0, 1.14, 0.78, { axis: 'z', seg: 10, rx: -0.15 });
}

/** A riot helmet: shell, neck guard and a see-through visor (head space). */
function riotHelmet(k, col, visor) {
  dome(k, 0.8, 0.7, col, 0, 0.8, -0.02);
  band(k, 0.78, 0.07, 0.75, 3.5, col, 0.48, { ry: PI }); // sides and back
  k.box(1.3, 0.32, 0.18, tone(col, 0.8), 0, 0.2, -0.78, { r: 0.05 }); // neck guard
  band(k, 0.82, 0.08, 0.14, 2.3, tone(col, 0.6), 0.96); // visor hinge
  band(k, 0.9, 0.04, 0.85, 2.3, visor, 0.48); // visor
  for (const s of [-1, 1]) k.cyl(0.1, 0.08, STEEL, s * 0.86, 0.9, 0.18, { axis: 'x', seg: 10 }); // hinge bolts
}

/**
 * A riot shield on the left arm (arm space): a curved slab facing along the arm, a window and a
 * stripe. `mark` is drawn in the middle (a material or colour, or null).
 */
function riotShield(k, col, window, stripe, mark) {
  k.box(2.0, 0.14, 3.0, col, 0, -1.8, 0.6, { r: 0.05, rx: 0.1 });
  k.box(2.1, 0.18, 0.12, INK, 0, -1.8, -0.9, { rx: 0.1 }); // rims
  k.box(2.1, 0.18, 0.12, INK, 0, -1.65, 2.1, { rx: 0.1 });
  for (const s of [-1, 1]) k.box(0.12, 0.18, 3.0, INK, s * 1.02, -1.8, 0.6, { rx: 0.1 });
  k.box(1.3, 0.04, 0.55, window, 0, -1.95, 1.55, { rx: 0.1 }); // window
  k.box(1.6, 0.04, 0.25, stripe, 0, -1.92, 0.75, { rx: 0.1 });
  if (mark != null) star(k, 0, -1.94, 0.2, 0.32, mark, { rx: 0.1 });
}

/** A baton on the fist: rubber grip, side handle (tonfa) and a shaft of `len` (gun space). Returns the tip y. */
function baton(k, len, col, o = {}) {
  const r = o.r ?? 0.15;
  k.cyl(r + 0.03, 0.62, 0x1f1f1f, 0, -0.15, 0, { seg: 10 }); // grip
  for (let i = 0; i < 4; i++) k.torus(r + 0.03, 0.02, INK, 0, 0.08 - i * 0.14, 0, { rx: PI / 2, seg: 10 });
  k.ball(r + 0.05, 0x1f1f1f, 0, 0.18, 0, { seg: 10, rows: 6 }); // pommel
  k.cyl(0.07, 0.6, 0x1f1f1f, 0.3, -0.5, 0, { axis: 'x', seg: 8 }); // side handle
  k.ball(0.09, 0x1f1f1f, 0.6, -0.5, 0, { seg: 8, rows: 5 });
  k.cyl(r, len, col, 0, -0.46 - len / 2, 0, { seg: 12, r2: r + 0.01 });
  k.ball(r, col, 0, -0.46 - len, 0, { seg: 10, rows: 6 });
  return -0.46 - len;
}

// ------------------------------------------------------------------ Sniper

/**
 * Sniper: a soldier lying up on a cliff with a long bolt-action rifle and a knit cap. Lv 1 a
 * bipod, a camo poncho and a face scarf, Lv 2 a radio headset, a vest and a spotting scope on a
 * tripod, Lv 3 a black .50 rifle with a muzzle brake and an ammo can, Lv 4 a ghillie suit.
 */
export function makeSniper(level) {
  const ghillie = level >= 4;
  const olive = 0x4e5b3a;
  const h = makeHumanoid({ skin: 0xd2a679, shirt: olive, pants: 0x3b4530, arms: olive, face: 'soldier' });
  const key = `sniper${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (ghillie) {
    // the hood of the ghillie suit, shaggy all round but the face
    dome(hd, 0.78, 0.62, 0x3d5229, 0, 0.88, -0.03);
    const p = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2;
      const front = Math.cos(a) > 0.55;
      p.push([Math.sin(a) * 0.72, front ? 1.45 : 1.3, Math.cos(a) * 0.72, Math.sin(a), Math.cos(a)]);
      if (!front) p.push([Math.sin(a) * 0.78, 0.85, Math.cos(a) * 0.78, Math.sin(a), Math.cos(a)]);
    }
    for (const x of [-0.3, 0.2]) p.push([x, 1.62, -0.1, 0, -0.3]);
    shag(hd, p, 0.6, 0.14);
  } else {
    hair(hd, 0x2b1d0e, { h: 0.4 });
    beanie(hd, 0x33402a, 0.55);
  }
  if (level >= 1) band(hd, 0.66, 0.06, 0.32, 2.3, 0x6b7d3a, 0.3); // a camo scarf over the mouth
  if (level >= 2) {
    headset(hd, 0x222222);
    antenna(hd, 0.78, 0.8, -0.25, 1.1);
  }
  collar(t, tone(olive, 0.82));
  pockets(t, tone(olive, 0.9));
  belt(t, 0x3e2723, 0x9e9e9e);
  if (ghillie) {
    t.box(2.24, 2.04, 1.22, 0x3d5229, 0, 0, 0, { r: 0.14 }); // the netting under the strands
    shag(t, torsoShag(), 0.7, 0.15, 3);
  } else {
    if (level >= 2) vest(t, 0x2f3a24, { pouches: 3, pouch: 0x3b4530 });
    if (level >= 1) {
      // a camo poncho over the shoulders
      t.slab(2.4, 0.9, 1.36, 0x6b7d3a, 0, 0.55, 0, { bw: 1.15 });
      for (const [x, y, z, c] of [[-0.6, 0.6, 0.69, 0x3e4a2a], [0.5, 0.4, 0.7, 0x8d7b55], [0.1, 0.8, 0.68, 0x3e4a2a], [-0.2, 0.3, -0.69, 0x8d7b55], [0.6, 0.7, -0.68, 0x3e4a2a]]) {
        t.box(0.44, 0.24, 0.04, c, x, y, z, { rz: x });
      }
      t.cyl(0.66, 0.18, 0x5a6b30, 0, 1.0, 0, { seg: 16 });
    }
  }
  hd.done();
  t.done();
  if (ghillie) {
    hands(h, key, 0x3e4a2a, 0x3d5229, (a, s) => shag(a, [[s * 0.55, -0.3, 0.2, s, 0], [s * 0.55, -0.9, -0.2, s, 0], [0, -0.5, 0.55, 0, 1], [0, -0.6, -0.55, 0, -1], [s * 0.5, -1.3, 0.3, s, 0.5]], 0.5, 0.12, 7));
    feet(h, key, 0x3e2723, (b) => shag(b, [[0.5, -0.3, 0.3, 1, 0.5], [-0.5, -0.5, 0.2, -1, 0.5], [0, -0.7, 0.55, 0, 1], [0, -0.4, -0.55, 0, -1]], 0.55, 0.13, 11));
  } else {
    if (level >= 1) hands(h, key, 0x3e4a2a, tone(olive, 0.8));
    feet(h, key, 0x3e2723, level >= 2 ? (b) => kneePad(b, 0x2f3a24) : null);
  }
  if (level >= 2) {
    const r = wear(h, h.root, `${key}:root`);
    spotter(r, 1.9, 0.6);
    if (level >= 3) ammoCan(r, -1.9, 0.6);
    r.done();
  }
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const heavy = level >= 3;
  const [y, z] = boltRifle(gk, {
    len: heavy ? 3.05 : 2.7,
    wood: heavy ? 0x263238 : 0x5d4037,
    metal: heavy ? 0x1c1f22 : GUNMETAL,
    scope: level >= 1 ? 1.2 : 0.85,
    brake: heavy,
    bipod: level >= 1,
  });
  if (ghillie) for (const [yy, i] of [[-0.6, 0], [-1.3, 1], [-2.0, 2]]) gk.ball(0.2, LEAF[i], 0, yy, UP - 0.05, { sx: 1.3, sy: 1.8, seg: 7, rows: 5 }); // leafy wraps
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = 0xffffff;
  h.tracerWidth = heavy ? 0.25 : undefined;
  return own(h);
}

// ------------------------------------------------------------------ Classic Sniper

/** Quad night-vision goggles: a mount on the helmet and four tubes (head space). */
function quadNvg(k, lens) {
  k.box(0.34, 0.24, 0.16, INK, 0, 1.18, 0.74, { r: 0.03 });
  k.box(1.0, 0.3, 0.26, 0x263238, 0, 0.84, 0.76, { r: 0.05 });
  for (const [x, ry] of [[-0.4, -0.35], [-0.14, -0.1], [0.14, 0.1], [0.4, 0.35]]) {
    k.cyl(0.1, 0.32, 0x263238, x, 0.84, 0.98, { axis: 'z', seg: 10, ry });
    k.cyl(0.08, 0.02, lens, x + Math.sin(ry) * 0.17, 0.84, 1.14, { axis: 'z', seg: 10, ry });
  }
}

/**
 * Classic Sniper (alternate Sniper form): a desert marksman with a wooden bolt-action rifle and a
 * boonie hat. Lv 1 a bandolier, Lv 2 a vest, a headset and purple-lensed goggles, Lv 3 a helmet,
 * a suppressor and an ammo crate, Lv 4 black Spec Ops kit with quad night-vision goggles.
 */
export function makeSniperClassic(level) {
  const spec = level >= 4;
  const shirt = spec ? 0x1c1726 : 0xb89a6a;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: spec ? 0x14101c : 0x8d7a55, arms: shirt, face: 'soldier' });
  const shard = shardOf(h);
  const key = `sniperC${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (level >= 3) {
    helmet(hd, spec ? 0x14101c : 0x6d6047, { cover: spec ? 0x231c30 : 0x8d7a55 });
  } else {
    hair(hd, 0x1a1209, { h: 0.4 });
    boonie(hd, 0xa1885a);
    hd.box(0.24, 0.24, 0.05, shard, 0, 1.08, 0.74);
  }
  if (level >= 2) {
    headset(hd, 0x222222);
    antenna(hd, 0.78, 0.8, -0.25, 0.9);
    if (!spec) goggles(hd, 0.72, shard, { frame: 0x3e2723 });
  }
  if (spec) quadNvg(hd, shard);
  collar(t, tone(shirt, 0.82));
  pockets(t, tone(shirt, 0.9));
  belt(t, spec ? INK : 0x4e342e, 0x9e9e9e);
  if (level >= 1) bandolier(t, 1, spec ? 0x231c30 : 0x4e342e);
  if (level >= 2) vest(t, spec ? 0x0f0c14 : 0x6b5a3a, { pouches: 2, pouch: spec ? 0x1c1726 : 0x5d4c2e, patch: shard });
  if (!spec) t.cyl(0.22, 0.5, 0x6b5a3a, -0.95, -1.08, 0.12, { seg: 12 }); // canteen
  hd.done();
  t.done();
  hands(h, key, level >= 2 ? (spec ? 0x111111 : 0x5d4037) : null, tone(shirt, 0.8), (a, s) => {
    if (s === 1) armPatch(a, s, tone(shirt, 0.75), shard);
  });
  feet(h, key, spec ? 0x111111 : 0x8d6e63, spec ? (b) => kneePad(b, 0x212121) : null);
  if (level >= 3) {
    const r = wear(h, h.root, `${key}:root`);
    crate(r, -1.9, 0.35, 0.6, 1.1, 0.7, 0.8, spec ? 0x263238 : 0x5d4c2e);
    r.box(0.3, 0.3, 0.04, shard, -1.9, 0.4, 1.02);
    r.done();
  }
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = boltRifle(gk, {
    len: level >= 3 ? 2.85 : 2.5,
    wood: spec ? 0x263238 : level >= 3 ? 0x4e342e : 0x8d5a2b,
    scope: level >= 2 ? 1.15 : 0.85,
    lens: spec ? shard : 0x4fc3f7,
    can: level >= 3,
    bipod: level >= 2,
  });
  if (spec) gk.box(0.04, 1.6, 0.06, shard, 0.15, -0.6, UP - 0.06); // purple trim along the stock
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = spec ? 0xb388ff : 0xffe082;
  h.tracerWidth = level >= 3 ? 0.25 : undefined;
  return own(h);
}

// ------------------------------------------------------------------ Tactical Sniper

/**
 * Tactical Sniper (alternate Sniper form): a modern operator in grey-blue gear with a shard
 * patch. Top path: Lv 2 a headset and a purple monocle, Lv 3 the long Intervention rifle, Lv 4
 * AP Bullets: a dark hooded cloak, Lv 5 Pathfinder armour. Bottom path: Lv 1-2 ammo pouches,
 * Lv 3 a Marksman vest, Lv 4 a red Laser Eye and a flare gun, Lv 5 a glowing red Laser Barrett.
 */
export function makeSniperTactical(level, bottom = false) {
  const top = !bottom;
  const cloak = top && level >= 4;
  const path = top && level >= 5;
  const laser = bottom && level >= 5;
  const shirt = cloak ? 0x1b1f24 : 0x546e7a;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: cloak ? 0x15181c : 0x37474f, arms: shirt, face: 'soldier' });
  const shard = shardOf(h);
  const red = glowMat(h, 0xff1744);
  const key = `sniperT${bottom ? 'b' : 't'}${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (cloak) hood(hd, 0x111417);
  else {
    hair(hd, 0x3e2723, { h: 0.4 });
    cap(hd, 0x263238);
    hd.box(0.22, 0.22, 0.05, shard, 0, 1.2, 0.62, { rx: -0.35 });
  }
  if (top && level >= 2) {
    headset(hd, 0x222222);
    hd.cyl(0.17, 0.12, INK, 0.25, 0.72, 0.66, { axis: 'z', seg: 12 }); // monocle
    hd.cyl(0.13, 0.03, shard, 0.25, 0.72, 0.73, { axis: 'z', seg: 12 });
  }
  if (bottom && level >= 4) {
    // Laser Eye: a dark eye band with a glowing red lens
    band(hd, 0.64, 0.06, 0.26, 1.7, INK, 0.72);
    hd.cyl(0.15, 0.06, red, 0.25, 0.72, 0.7, { axis: 'z', seg: 12 });
  }
  collar(t, tone(shirt, 0.8));
  belt(t, INK, 0x757575);
  if (bottom && level >= 1) for (let i = 0; i < (level >= 2 ? 3 : 2); i++) pouch(t, -0.6 + i * 0.6, -1.05, 0.56, 0.4, 0.42, 0x4e5b3a);
  if (bottom && level >= 3) vest(t, 0x3a4750, { pouches: 2, pouch: 0x2e3a42, patch: shard });
  if (bottom && level >= 4) {
    // a flare gun in a hip holster
    t.box(0.26, 0.6, 0.36, LEATHER, 1.12, -1.0, 0.15, { r: 0.04 });
    t.cyl(0.12, 0.62, 0xff6f00, 1.12, -0.72, 0.45, { axis: 'z', seg: 10 });
    t.box(0.18, 0.3, 0.2, 0xff6f00, 1.12, -0.85, 0.12, { r: 0.04 });
  }
  if (cloak) {
    // a long dark cloak over the back and shoulders
    t.slab(2.3, 2.9, 0.14, 0x111417, 0, -0.5, -0.64, { bw: 1.25 });
    t.box(2.3, 0.36, 1.24, 0x15181c, 0, 0.88, 0, { r: 0.1 });
    t.box(0.06, 2.4, 0.04, shard, -0.9, -0.5, -0.72);
  }
  if (path) {
    // Pathfinder: armour plates on chest and shoulders with a shard core
    t.box(2.2, 1.45, 1.22, 0x2b3238, 0, 0.2, 0, { r: 0.16 });
    for (let i = 0; i < 2; i++) t.box(2.14, 0.18, 1.18, 0x232a30, 0, -0.65 - i * 0.24, 0, { r: 0.05 });
    shoulderPads(t, 0x2b3238, 0.55);
    t.cyl(0.3, 0.1, 0x1b1f24, 0, 0.3, 0.62, { axis: 'z', seg: 16 });
    t.cyl(0.22, 0.06, shard, 0, 0.3, 0.68, { axis: 'z', seg: 16 });
  }
  hd.done();
  t.done();
  hands(h, key, cloak ? 0x0d0f12 : 0x263238, tone(shirt, 0.8), (a, s) => {
    if (s === 1 && !path) armPatch(a, s, tone(shirt, 0.75), shard);
  });
  feet(h, key, cloak ? 0x0d0f12 : 0x263238, (b) => kneePad(b, cloak ? 0x1b1f24 : 0x37474f));
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const len = laser ? 3.3 : top && level >= 3 ? 3.15 : 2.7;
  const [y, z] = boltRifle(gk, {
    len,
    wood: laser ? 0x212121 : cloak ? 0x15181c : 0x37474f,
    metal: laser ? 0x111111 : GUNMETAL,
    scope: level >= 1 ? 1.2 : 0.9,
    lens: laser ? red : cloak ? shard : 0x4fc3f7,
    brake: (top && level >= 3) || laser,
    bipod: level >= 1,
  });
  if (cloak) gk.box(0.04, 1.6, 0.06, shard, 0.15, -0.7, UP - 0.06);
  if (laser) {
    for (const s of [-1, 1]) gk.box(0.04, len - 1.2, 0.05, red, s * 0.12, -0.6 - (len - 1.2) / 2, z);
    for (let i = 0; i < 3; i++) gk.torus(0.11, 0.035, red, 0, -1.5 - i * 0.4, z, { rx: PI / 2, seg: 12 });
    gk.cyl(0.13, 0.08, red, 0, -len - 0.02, z, { seg: 12 });
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = laser ? 0xff1744 : 0xffffff;
  h.tracerWidth = laser || (top && level >= 3) ? 0.25 : undefined;
  return own(h);
}
export const makeSniperTacticalBottom = (level) => makeSniperTactical(level, true);

// ------------------------------------------------------------------ Penetrator

/**
 * Penetrator (alternate Sniper form): a crossbowman with a heavy bolt thrower. Lv 1 a quiver of
 * flaming bolts and a burning bolt loaded, Lv 2 a hood and bracers, Lv 3 a longer bow with steel
 * limbs and a foot stirrup, Lv 4 a dark siege crossbow with a scope and a purple glowing string.
 */
export function makePenetrator(level) {
  const siege = level >= 4;
  const shirt = siege ? 0x1c1726 : 0x33691e;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: siege ? 0x14101c : 0x3e2723, arms: shirt, face: 'soldier' });
  const shard = shardOf(h);
  const flame = glowMat(h, siege ? 0xb388ff : 0xff7043);
  const key = `penetrator${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (level >= 2) hood(hd, siege ? 0x14101c : 0x1b5e20);
  else {
    hair(hd, 0x5d4037, { h: 0.4 });
    cap(hd, 0x558b2f, { peak: 0x33691e });
    hd.box(0.22, 0.22, 0.05, shard, 0, 1.2, 0.62, { rx: -0.35 });
  }
  // a laced jerkin over the shirt
  t.box(2.1, 1.7, 1.12, siege ? 0x231c30 : 0x5d4037, 0, -0.05, 0, { r: 0.1 });
  for (let i = 0; i < 4; i++) t.box(0.36, 0.03, 0.03, 0xd7ccc8, 0, 0.55 - i * 0.3, 0.57, { rz: i % 2 ? 0.4 : -0.4 });
  t.box(0.32, 0.32, 0.05, shard, 0.55, 0.45, 0.58);
  belt(t, LEATHER, 0x9e9e9e);
  if (level >= 1) {
    // a quiver of flaming bolts on the back, on a strap across the chest
    t.cyl(0.28, 1.7, LEATHER, 0.5, 0.2, -0.85, { rz: 0.3, seg: 12 });
    t.torus(0.28, 0.04, tone(LEATHER, 0.6), 0.22, 1.1, -0.85, { rx: PI / 2, rz: 0.3, seg: 12 });
    for (const [dx, dz] of [[-0.08, 0.06], [0.1, -0.05], [0.0, -0.12]]) {
      const x = 0.22 + dx;
      t.cyl(0.03, 0.5, 0xd7ccc8, x - 0.06, 1.3, -0.85 + dz, { rz: 0.3, seg: 5 });
      t.ball(0.08, flame, x - 0.13, 1.56, -0.85 + dz, { sy: 1.5, seg: 7, rows: 5 });
    }
    t.box(0.22, 2.5, 1.12, LEATHER, 0, 0, 0, { rz: -0.62 }); // strap
  }
  hd.done();
  t.done();
  hands(h, key, level >= 2 ? 0x3e2723 : null, tone(shirt, 0.8), level >= 2 ? (a) => {
    // leather bracers with laces
    a.cyl(0.58, 0.62, siege ? 0x231c30 : 0x6d4c41, 0, -1.3, 0, { seg: 12, r2: 0.6 });
    for (let i = 0; i < 3; i++) a.box(0.3, 0.03, 0.03, 0xd7ccc8, 0, -1.1 - i * 0.18, 0.6);
  } : null);
  feet(h, key, siege ? 0x111111 : 0x4e342e);
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const len = level >= 2 ? 3.0 : 2.6;
  const span = level >= 3 ? 3.2 : 2.6;
  const wood = siege ? 0x263238 : level >= 3 ? 0x5d4037 : 0x795548;
  const metal = siege ? 0x1c1f22 : STEEL;
  const limb = level >= 3 ? 0x90a4ae : 0x6d4c41;
  const U = UP;
  const P = -len + 0.35; // where the bow sits
  const tipY = P + 0.55;
  const latch = -0.3;
  gk.box(0.3, 0.7, 0.42, wood, 0, 0.55, U - 0.06, { r: 0.07 }); // butt
  gk.box(0.32, 0.08, 0.46, INK, 0, 0.92, U - 0.06, { r: 0.02 });
  gk.box(0.26, 0.2 - P, 0.28, wood, 0, (0.2 + P) / 2, U, { r: 0.05 }); // tiller
  gk.box(0.12, 0.2 - P, 0.06, tone(wood, 0.7), 0, (0.2 + P) / 2, U + 0.15); // bolt groove
  gk.box(0.22, 0.26, 0.5, wood, 0, 0.05, U - 0.34, { rx: -0.32, r: 0.05 }); // grip
  gk.torus(0.1, 0.022, INK, 0, -0.14, U - 0.24, { ry: PI / 2, seg: 10, arc: PI }); // trigger guard
  gk.box(0.3, 0.3, 0.2, metal, 0, latch, U + 0.14, { r: 0.03 }); // latch
  gk.box(0.42, 0.34, 0.36, metal, 0, P, U, { r: 0.04 }); // bow block
  for (const s of [-1, 1]) {
    gk.tube([[0, P, U], [s * span * 0.26, P + 0.1, U], [s * span * 0.5, tipY, U]], 0.075, limb, { seg: 10, sides: 6 });
    gk.ball(0.09, metal, s * span * 0.5, tipY, U, { seg: 8, rows: 5 }); // limb tip
    gk.tube([[s * span * 0.5, tipY, U], [0, latch, U + 0.16]], 0.022, siege ? shard : 0xeeeeee, { seg: 2, sides: 4 }); // string
  }
  if (level >= 3) gk.torus(0.2, 0.035, metal, 0, P - 0.3, U, { seg: 10 }); // foot stirrup
  // the loaded bolt: shaft, fletching and a head (burning from Flaming Arrows)
  const tip = -len - 0.2;
  gk.cyl(0.035, latch - tip, 0xd7ccc8, 0, (latch + tip) / 2, U + 0.2, { seg: 6 });
  for (const s of [-1, 1]) gk.box(0.02, 0.26, 0.12, 0xc62828, s * 0.06, latch - 0.15, U + 0.24, { rz: s * 0.3 });
  gk.cyl(0.01, 0.26, STEEL, 0, tip + 0.13, U + 0.2, { r2: 0.08, seg: 8 });
  if (level >= 1) gk.ball(0.12, flame, 0, tip + 0.2, U + 0.2, { sy: 1.4, seg: 8, rows: 5 });
  if (siege) {
    gk.cyl(0.09, 0.8, INK, 0, -0.9, U + 0.5, { seg: 10 });
    gk.cyl(0.12, 0.16, INK, 0, -1.35, U + 0.5, { seg: 12 });
    gk.cyl(0.1, 0.02, shard, 0, -1.44, U + 0.5, { seg: 12 });
    for (const yy of [-1.1, -0.7]) gk.box(0.1, 0.08, 0.24, INK, 0, yy, U + 0.36);
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tip, U + 0.2);
  aimLong(h);
  h.tracer = siege ? 0xb388ff : 0xd7ccc8;
  return own(h);
}

// ------------------------------------------------------------------ Enforcer

/**
 * Enforcer: a big prison guard with a nightstick. Lv 1 a longer steel nightstick, Lv 2 a
 * shoulder flashlight and a belt radio, Lv 3 a shock baton with glowing rings, Lv 4 riot gear:
 * helmet with a visor, a CORRECTIONS stripe, pads and a riot shield.
 */
export function makeEnforcer(level) {
  const riot = level >= 4;
  const zap = level >= 3;
  const navy = 0x263859;
  const shirt = riot ? 0x1c1f26 : 0x5b7289;
  const h = makeHumanoid({ skin: 0x8d5524, shirt, pants: riot ? 0x111318 : navy, arms: shirt, face: 'soldier' });
  h.body.scale.setScalar(1.12); // a big guy
  const blue = glowMat(h, 0x40c4ff);
  const lamp = glowMat(h, 0xfff59d);
  const key = `enforcer${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (riot) riotHelmet(hd, 0x1c1f26, glassMat(h, 0x90caf9, 0.5));
  else {
    hair(hd, 0x1a1209, { h: 0.36 });
    peakedCap(hd, navy, 0x111111, GOLD);
  }
  // a bulky uniform chest with pockets, shoulder straps, badge and name tag
  t.box(2.24, 1.85, 1.18, shirt, 0, 0.1, 0, { r: 0.14 });
  collar(t, tone(shirt, 0.85), { buttons: !riot });
  if (!riot) pockets(t, tone(shirt, 0.9));
  for (const s of [-1, 1]) t.box(0.44, 0.12, 1.2, tone(shirt, 0.75), s * 0.62, 1.02, 0, { r: 0.04 });
  star(t, -0.55, 0.55, 0.64, 0.2, GOLD, { rx: PI / 2 });
  t.cyl(0.24, 0.04, GOLD, -0.55, 0.55, 0.61, { axis: 'z', seg: 12 });
  t.box(0.7, 0.18, 0.04, 0xfafafa, 0.5, 0.62, 0.62);
  t.box(0.5, 0.05, 0.02, INK, 0.5, 0.62, 0.645);
  // duty belt: cuff case, key ring, baton loop
  belt(t, 0x212121, 0xb0b0b0, -0.88);
  t.box(2.3, 0.08, 1.24, 0x333333, 0, -0.98, 0);
  pouch(t, -0.55, -0.92, 0.6, 0.36, 0.34, 0x212121, 0.18);
  t.torus(0.18, 0.04, 0xbdbdbd, 0.8, -1.1, 0.66, { seg: 12 });
  for (const [x, rz] of [[0.72, 0.3], [0.88, -0.2], [0.8, 0.05]]) t.box(0.08, 0.36, 0.04, GOLD, x, -1.38, 0.68, { rz });
  if (level >= 2) {
    // Cell Block Patrol: a flashlight on the shoulder strap and a radio on the belt
    t.cyl(0.14, 0.6, 0x212121, -0.85, 0.85, 0.6, { axis: 'z', seg: 12, r2: 0.17 });
    t.cyl(0.14, 0.03, lamp, -0.85, 0.85, 0.91, { axis: 'z', seg: 12 });
    t.box(0.34, 0.6, 0.22, 0x212121, -1.0, -0.6, 0.55, { r: 0.04 });
    t.box(0.22, 0.2, 0.03, 0x37474f, -1.0, -0.5, 0.67);
    antenna(t, -0.92, -0.25, 0.55, 0.5);
  }
  if (riot) {
    t.box(1.7, 0.32, 0.05, 0xfdd835, 0, 0.15, 0.62); // CORRECTIONS stripe
    t.box(1.7, 0.32, 0.05, 0xfdd835, 0, 0.3, -0.62);
    shoulderPads(t, 0x23272f, 0.62);
  }
  hd.done();
  t.done();
  hands(h, key, riot || level >= 1 ? 0x1a1a1a : null, tone(shirt, 0.8), riot ? (a, s) => {
    a.box(1.1, 0.5, 0.3, 0x23272f, 0, -1.0, -0.55, { r: 0.08 }); // elbow pad
    if (s === 1) riotShield(a, 0x78909c, glassMat(h, 0xcfd8dc, 0.4), 0xfafafa, null);
  } : null);
  feet(h, key, 0x111111, riot ? (b) => {
    kneePad(b, 0x23272f);
    b.box(0.9, 0.7, 0.16, 0x23272f, 0, -1.35, 0.55, { r: 0.06 }); // shin guard
  } : null);
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const len = level >= 1 ? 2.5 : 2.1;
  const tipY = baton(gk, len, zap ? 0x263238 : level >= 1 ? 0x9e9e9e : 0x6d4c41, { r: level >= 1 ? 0.15 : 0.16 });
  if (zap) {
    for (let i = 0; i < 3; i++) gk.torus(0.17, 0.04, blue, 0, -0.95 - i * 0.55, 0, { rx: PI / 2, seg: 12 });
    gk.ball(0.22, blue, 0, tipY, 0, { seg: 10, rows: 7 });
    for (const s of [-1, 1]) gk.box(0.04, 0.24, 0.04, STEEL, s * 0.1, tipY - 0.2, 0); // prongs
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tipY, 0);
  // Nightstick raised overhead; a swing brings it down in front.
  h.rightArm.rotation.set(-2.6, 0, 0.15);
  h.leftArm.rotation.set(riot ? -1.3 : -0.25, 0, riot ? -0.2 : -0.1);
  h.pose = { right: -2.6, left: riot ? -1.3 : -0.25, leftRecoil: 0 };
  h.swing = 1.8;
  h.melee = true;
  h.tracer = zap ? 0x80d8ff : 0xffffff;
  return own(h, 0);
}

// ------------------------------------------------------------------ Warden

/** A campaign hat: wide flat brim and a crown pinched to four dents (head space). */
function campaignHat(k, col, bandCol) {
  k.cyl(1.05, 0.06, col, 0, 1.02, 0, { seg: 24 });
  k.torus(1.05, 0.03, tone(col, 0.8), 0, 1.02, 0, { rx: PI / 2, seg: 24 });
  k.cyl(0.68, 0.62, col, 0, 1.36, 0, { seg: 4, r2: 0.36, ry: PI / 4 });
  k.cyl(0.66, 0.14, bandCol, 0, 1.12, 0, { seg: 20 });
  k.ball(0.06, GOLD, 0, 1.12, 0.66, { seg: 8, rows: 5 }); // band acorn
}

/**
 * Warden (alternate Enforcer): the prison warden in khaki and a campaign hat. Lv 1 a night-vision
 * monocle, Lv 2 a heavier steel baton, Lv 3 an armoured vest and glowing bands on the baton, Lv 4
 * riot gear with an amber visor and a shield with a gold star.
 */
export function makeWarden(level) {
  const riot = level >= 4;
  const khaki = 0xb59b6a;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: khaki, pants: 0x4e3b27, arms: khaki, face: 'soldier' });
  const amber = glowMat(h, 0xffab00);
  const green = glowMat(h, 0x76ff03);
  const key = `warden${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (riot) riotHelmet(hd, 0x3e2723, glassMat(h, 0xffe0b2, 0.5));
  else {
    hair(hd, 0x4e342e, { h: 0.36 });
    campaignHat(hd, 0x6d5a3a, 0x3e2723);
    // a thick moustache
    hd.box(0.6, 0.14, 0.1, 0x4e342e, 0, 0.42, 0.62, { r: 0.04 });
  }
  if (level >= 1 && !riot) {
    // Night Shift: a night-vision monocle over the right eye
    hd.cyl(0.18, 0.3, 0x212121, 0.27, 0.72, 0.72, { axis: 'z', seg: 12 });
    hd.cyl(0.13, 0.03, green, 0.27, 0.72, 0.88, { axis: 'z', seg: 12 });
    hd.tube([[0.45, 0.72, 0.62], [0.66, 0.9, 0.2], [0.66, 1.0, -0.3]], 0.03, INK, { seg: 8, sides: 4 });
  }
  collar(t, tone(khaki, 0.82));
  pockets(t, tone(khaki, 0.9));
  for (const s of [-1, 1]) t.box(0.46, 0.12, 1.12, 0x6d5a3a, s * 0.62, 0.99, 0, { r: 0.04 }); // epaulettes
  star(t, -0.55, 0.62, 0.6, 0.24, GOLD, { rx: PI / 2 });
  belt(t, 0x3e2723, GOLD);
  t.box(0.1, 2.3, 1.12, 0x3e2723, 0, 0.05, 0, { rz: 0.62 }); // Sam Browne strap
  pouch(t, 0.6, -1.0, 0.56, 0.36, 0.36, 0x3e2723, 0.16);
  if (level >= 3) vest(t, 0x5d6b45, { pouches: 2, pouch: 0x4b5637, patch: 0xffd54f });
  if (riot) shoulderPads(t, 0x4e3b27, 0.6);
  hd.done();
  t.done();
  hands(h, key, level >= 2 ? 0x3e2723 : null, tone(khaki, 0.8), riot ? (a, s) => {
    a.box(1.1, 0.5, 0.3, 0x4e3b27, 0, -1.0, -0.55, { r: 0.08 });
    if (s === 1) riotShield(a, 0x8d6e63, glassMat(h, 0xffe0b2, 0.4), 0x3e2723, GOLD);
  } : null);
  feet(h, key, 0x3e2723, riot ? (b) => kneePad(b, 0x4e3b27) : (b) => b.box(1.1, 0.14, 1.12, 0x6d5a3a, 0, -1.36, 0.02));
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const heavy = level >= 2;
  const len = heavy ? 2.6 : 2.0;
  const tipY = baton(gk, len, heavy ? 0x37474f : 0x5d4037, { r: heavy ? 0.2 : 0.15 });
  if (level >= 3) for (let i = 0; i < 2; i++) gk.torus(0.22, 0.05, amber, 0, -1.2 - i * 0.8, 0, { rx: PI / 2, seg: 12 });
  if (heavy) gk.cyl(0.24, 0.3, STEEL, 0, tipY + 0.1, 0, { seg: 10 }); // steel cap
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tipY, 0);
  h.rightArm.rotation.set(-2.6, 0, 0.15);
  h.leftArm.rotation.set(riot ? -1.3 : -0.25, 0, riot ? -0.2 : -0.1);
  h.pose = { right: -2.6, left: riot ? -1.3 : -0.25, leftRecoil: 0 };
  h.swing = 1.8;
  h.melee = true;
  h.tracer = level >= 3 ? 0xffab00 : 0xffffff;
  return own(h, 0);
}

// ------------------------------------------------------------------ Slammer

/**
 * Slammer (alternate Enforcer form): a strong woman with a big sledgehammer. Lv 1 lifting gloves,
 * Lv 2 a lifting belt, Lv 3 armour. Top path: the hammer grows each level, with a steel band
 * from Lv 3 and a fiery head at Lv 5. Bottom path: from Lv 3 a glowing blue Shock Hammer and a
 * battery pack. A purple Dimension Shard emblem marks it as an alternate form.
 */
export function makeSlammer(level, bottom = false) {
  const top = !bottom;
  const shock = bottom && level >= 3;
  const fire = top && level >= 5;
  const shirt = shock ? 0x0d47a1 : 0xad1457;
  const skin = 0xf1c27d;
  const h = makeHumanoid({ skin, shirt, pants: 0x37474f, arms: skin, face: 'smile' });
  const shard = shardOf(h);
  const blue = glowMat(h, 0x40c4ff);
  const hot = glowMat(h, 0xff6d00);
  const key = `slammer${bottom ? 'b' : 't'}${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // hair in a high ponytail, and a sweatband
  hair(hd, 0x6d4c41, { h: 0.46 });
  hd.cyl(0.13, 0.14, shock ? 0x40c4ff : 0xfafafa, 0, 1.18, -0.6, { seg: 10, rx: 0.7 });
  hd.tube([[0, 1.24, -0.66], [0, 1.2, -0.95], [0, 0.85, -1.05], [0, 0.45, -0.95]], 0.14, 0x6d4c41, { seg: 12, sides: 8 });
  hd.ball(0.12, 0x6d4c41, 0, 0.42, -0.94, { seg: 8, rows: 5 });
  headband(hd, shock ? 0x40c4ff : 0xfafafa, 1.0);
  // a tank top: straps over the shoulders and a hem
  for (const s of [-1, 1]) t.box(0.36, 0.1, 1.08, shirt, s * 0.55, 1.02, 0);
  t.box(2.06, 0.16, 1.06, tone(shirt, 0.8), 0, -0.55, 0);
  t.box(0.32, 0.32, 0.05, shard, -0.55, 0.45, 0.53);
  if (level >= 2) {
    // a wide lifting belt
    t.box(2.14, 0.46, 1.14, 0x3e2723, 0, -0.85, 0, { r: 0.06 });
    t.box(0.42, 0.3, 0.06, 0x9e9e9e, 0, -0.85, 0.58, { r: 0.03 });
  } else belt(t, 0x212121, 0x9e9e9e);
  if (level >= 3) {
    const plate = shock ? 0x1565c0 : 0x880e4f;
    t.box(2.18, 1.25, 1.2, plate, 0, 0.3, 0, { r: 0.16 });
    t.box(1.5, 0.12, 0.08, tone(plate, 0.7), 0, 0.3, 0.6);
    shoulderPads(t, plate, 0.55);
    t.box(0.32, 0.32, 0.05, shard, -0.55, 0.55, 0.62);
  }
  if (shock) {
    // a battery pack on the back with a glowing gauge
    t.box(1.4, 1.5, 0.6, 0x263238, 0, 0, -0.85, { r: 0.1 });
    for (const x of [-0.35, 0.35]) {
      t.cyl(0.16, 1.1, blue, x, 0, -1.2, { seg: 10 });
      for (const y of [-0.58, 0.58]) t.cyl(0.19, 0.1, INK, x, y, -1.2, { seg: 10 });
    }
    for (const s of [-1, 1]) t.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
  }
  hd.done();
  t.done();
  hands(h, key, level >= 1 ? 0x212121 : null, level >= 1 ? 0xfafafa : skin); // gloves with white wrist wraps
  feet(h, key, 0x37474f);
  // the sledgehammer, bigger each top-path level
  const big = top ? [1, 1, 1.15, 1.3, 1.45, 1.65][level] : 1 + level * 0.05;
  const g = fist(h.rightArm, -1.9, big * 1.1);
  const gk = wear(h, g, `${key}:gun`);
  const headCol = fire ? hot : shock ? 0x1e88e5 : 0x616161;
  const hy = -2.35;
  gk.cyl(0.11, 2.55, 0x8d6e63, 0, -0.98, 0, { seg: 8 }); // handle
  for (let i = 0; i < 4; i++) gk.torus(0.12, 0.025, INK, 0, 0.15 - i * 0.12, 0, { rx: PI / 2, seg: 8 }); // grip tape
  gk.ball(0.15, INK, 0, 0.3, 0, { seg: 8, rows: 5 });
  gk.cyl(0.17, 0.3, STEEL, 0, hy + 0.4, 0, { seg: 8 }); // collar
  gk.cyl(0.46, 1.5, headCol, 0, hy, 0, { axis: 'z', seg: 8 });
  for (const s of [-1, 1]) gk.cyl(0.5, 0.12, fire ? 0x3e2723 : shock ? blue : 0x424242, 0, hy, s * 0.72, { axis: 'z', seg: 8 }); // striking faces
  if (top && level >= 3) gk.cyl(0.5, 0.26, 0x212121, 0, hy, 0, { axis: 'z', seg: 8 }); // steel band
  if (shock) for (const s of [-1, 1]) gk.torus(0.5, 0.05, blue, 0, hy, s * 0.4, { seg: 12 });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, hy, 0);
  h.rightArm.rotation.set(-2.6, 0, 0.15);
  h.leftArm.rotation.set(-2.4, 0, -0.3);
  h.pose = { right: -2.6, left: -2.4, leftRecoil: 0 };
  h.swing = 2.2;
  h.melee = true;
  h.tracer = shock ? 0x40c4ff : fire ? 0xff6d00 : 0xffffff;
  return own(h, 0);
}
export const makeSlammerBottom = (level) => makeSlammer(level, true);
