// Tower models: people, batch 33 (dressed with the vehicle kit in ../vehicles.js).
// In here: Technomancer, Frostreaver, Artisan and its two buildings (Skirmisher, Atelier).
// Like batches 26-32 these are plain faceless figures: only their gear tells them apart, with
// accents in one neon colour per tower.
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.

import * as THREE from 'three';
import { PARTS, barrel, glowMat, kit } from '../vehicles.js';
import { gunMuzzle, makeThing } from './bits.js';
import { makeHumanoid } from './kit.js';
import { UP, aimLong, dome, fist, muzzle, own, pouch, rifle, wear } from './people1.js';
import { shoulderPads } from './people2.js';
import { feet, hands, hood } from './people5.js';
import { cape } from './people18.js';

const W = 0xffffff;
const W2 = 0xf2f2f2;
const W3 = 0xe4e4e4;

/** A plain white figure with no face. */
const blank = () => makeHumanoid({ skin: W, shirt: W, pants: W2, arms: W, face: 'none' });

// ------------------------------------------------------------------ Technomancer (neon aquamarine)

export const TECHNO_NEON = 0x00ffc8;

/**
 * Technomancer (alternate Hacker): a white hooded hacker with a visor and a smart rifle with glowing
 * rails. Lv 1 Improved Kit: a wrist computer and a sensor on the hood. Lv 2 Hologram: a backpack
 * projector with an emitter dish. Lv 3 Hijack: floating holo screens over the shoulders and cable
 * spines. Lv 4 Technological Wonder: a data halo, shoulder plates and a long coat.
 */
export function makeTechnomancer(level) {
  const h = blank();
  const key = `hackerTechnomancer${level}`;
  const neon = glowMat(h, TECHNO_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hood(hd, W2);
  hd.box(1.2, 0.16, 0.1, neon, 0, 0.62, 0.72, { r: 0.04 }); // visor
  if (level >= 1) {
    hd.box(0.22, 0.3, 0.22, W3, 0.62, 0.95, 0.1, { r: 0.04 }); // sensor
    hd.ball(0.07, neon, 0.62, 1.12, 0.1, { seg: 8, rows: 5 });
  }
  if (level >= 4) hd.torus(0.85, 0.045, neon, 0, 1.55, 0, { seg: 24 }); // data halo
  t.box(2.1, 1.8, 1.15, W, 0, 0.1, 0, { r: 0.12 }); // jacket
  t.box(0.08, 1.7, 0.05, neon, 0.35, 0.1, 0.6); // zip line
  t.box(2.15, 0.24, 1.2, W3, 0, -0.84, 0, { r: 0.04 }); // belt
  for (let i = 0; i < 3; i++) t.box(0.3, 0.06, 0.05, neon, -0.55, 0.55 - i * 0.18, 0.6); // code lines
  if (level >= 2) {
    // the hologram projector pack with an emitter dish on top
    t.box(1.5, 1.5, 0.6, W2, 0, 0.15, -0.85, { r: 0.1 });
    for (let i = 0; i < 4; i++) t.box(0.12, 0.12, 0.05, neon, -0.45 + i * 0.3, 0.6, -1.17);
    t.cyl(0.08, 0.6, W3, 0, 1.15, -0.85, { seg: 8 });
    t.cyl(0.45, 0.08, W, 0, 1.5, -0.85, { seg: 16, r2: 0.2 });
    t.ball(0.12, neon, 0, 1.6, -0.85, { seg: 10, rows: 6 });
  }
  if (level >= 3) {
    // holo screens floating over the shoulders, and cables from the pack
    for (const sx of [-1, 1]) {
      t.slab(0.75, 0.5, 0.03, neon, sx * 1.35, 1.25, 0.15, { ry: -sx * 0.5 });
      t.box(0.82, 0.04, 0.05, W, sx * 1.35, 1.52, 0.15, { ry: -sx * 0.5 });
      t.tube([[sx * 0.5, 0.0, -1.1], [sx * 0.9, -0.5, -0.9], [sx * 1.0, -0.8, -0.3]], 0.05, W3, { seg: 8, sides: 6 });
    }
  }
  if (level >= 4) {
    shoulderPads(t, W2, 0.6);
    cape(t, W2, 2.5, { w: 2.0, clasp: TECHNO_NEON });
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a, s) => {
    if (level >= 1 && s > 0) {
      a.box(0.65, 0.5, 0.65, W3, 0, -1.1, 0, { r: 0.06 }); // wrist computer
      a.box(0.5, 0.06, 0.4, neon, 0, -1.1, 0.34);
    }
  });
  feet(h, key, W2, null);
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = rifle(gk, { len: level >= 4 ? 2.6 : 2.2, body: W, furn: W2, mag: false, optic: level >= 1 ? 'dot' : 'iron', lens: TECHNO_NEON, glow: neon });
  gk.done();
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = TECHNO_NEON;
  return own(h, UP);
}

// ------------------------------------------------------------------ Frostreaver (neon blue on dark grey)

export const FROST_NEON = 0x1f51ff;
const D = 0x3a3d42; // dark grey armour (the user asked for dark grey, not white)
const D2 = 0x4a4d52;
const D3 = 0x5c6066;
const ICE = 0xb3e5fc;

/** A big frost sledgehammer (fist space, head down -y): dark haft with neon bands, an ice-crystal head. Returns the head y. */
function frostSledge(k, neon, o = {}) {
  const s = o.big ? 1.2 : 1;
  k.cyl(0.13, 3.0, D2, 0, -1.0, 0, { seg: 8 }); // haft
  for (let i = 0; i < 4; i++) k.torus(0.15, 0.035, neon, 0, 0.3 - i * 0.55, 0, { seg: 10 });
  const y = -2.7;
  k.box(1.9 * s, 0.95 * s, 0.95 * s, D, 0, y, 0, { r: 0.12 }); // head block
  for (const sx of [-1, 1]) {
    k.box(0.22, 1.05 * s, 1.05 * s, D3, sx * 0.95 * s, y, 0, { r: 0.05 }); // face plates
    k.box(0.06, 0.7 * s, 0.7 * s, neon, sx * 1.07 * s, y, 0); // glowing faces
  }
  k.box(1.95 * s, 0.08, 1.0 * s, neon, 0, y + 0.3 * s, 0); // neon band
  // ice crystals growing out of the head
  const n = o.crystals ?? 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    k.cyl(0.16, 0.8, ICE, Math.cos(a) * 0.4 * s, y + 0.55 * s, Math.sin(a) * 0.3 * s, { r2: 0.02, seg: 6, rx: Math.sin(a) * 0.4, rz: -Math.cos(a) * 0.4 });
  }
  return y;
}

/** The Ice Crystals that circle a Frostreaver (views.js moves them: `crystals`): 7 glowing shards. */
function iceCrystals(h) {
  const g = new THREE.Group();
  const mat = glowMat(h, 0x82b1ff, 0.9);
  const geo = new THREE.OctahedronGeometry(0.6, 0).scale(0.7, 1.5, 0.7);
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(geo, mat);
    m.visible = false;
    g.add(m);
  }
  return g;
}

/**
 * Frostreaver (alternate Sledger): a dark grey armoured ice knight with lots of neon blue lights and
 * a big frost sledgehammer. Lv 1 Subzero: Ice Crystals circle it (views.js) and a frost crest.
 * Lv 2 Elementalist: crystal shoulder spikes. Lv 3 Crystal Mastery: a bigger crystal hammer.
 * Lv 4 Saint Jay: a frost halo and a tattered cape. Lv 5 Icicle Zero: an icicle crown, a bigger
 * hammer and glowing chest core.
 */
export function makeFrostreaver(level) {
  const h = makeHumanoid({ skin: D, shirt: D, pants: D2, arms: D, face: 'none' });
  const key = `sledgerFrostreaver${level}`;
  const neon = glowMat(h, FROST_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  dome(hd, 0.9, 0.74, D2, 0, 0.9, 0); // helm
  hd.box(1.3, 0.12, 0.08, neon, 0, 0.66, 0.75, { r: 0.03 }); // visor
  hd.box(0.1, 0.5, 0.08, neon, 0, 0.35, 0.76); // a neon line down the face plate
  if (level >= 1) {
    hd.box(0.14, 0.55, 0.7, D3, 0, 1.6, -0.05, { r: 0.04 }); // crest
    hd.box(0.06, 0.45, 0.6, neon, 0, 1.62, -0.05);
  }
  if (level >= 4) hd.torus(0.95, 0.05, neon, 0, 1.55, 0, { seg: 24 }); // frost halo
  if (level >= 5) for (let i = 0; i < 5; i++) hd.cyl(0.07, 0.6, ICE, (i - 2) * 0.28, 1.95, 0.15, { r2: 0.01, seg: 6 }); // icicle crown
  t.box(2.4, 1.85, 1.35, D, 0, 0.1, 0, { r: 0.16 }); // breastplate
  for (const sx of [-1, 1]) t.box(0.08, 1.4, 0.06, neon, sx * 0.55, 0.15, 0.69); // neon seams
  t.box(1.2, 0.08, 0.06, neon, 0, 0.75, 0.69);
  t.box(2.45, 0.28, 1.4, D3, 0, -0.85, 0, { r: 0.05 }); // belt
  t.box(0.5, 0.2, 0.06, neon, 0, -0.85, 0.72); // buckle light
  if (level >= 5) {
    t.cyl(0.34, 0.12, D3, 0, 0.3, 0.7, { axis: 'z', seg: 14 }); // chest core
    t.cyl(0.24, 0.08, neon, 0, 0.3, 0.77, { axis: 'z', seg: 14 });
  }
  shoulderPads(t, D2, 0.75);
  if (level >= 2) for (const sx of [-1, 1]) {
    t.cyl(0.13, 0.75, ICE, sx * 1.35, 1.45, 0, { r2: 0.01, seg: 6, rz: -sx * 0.45 }); // crystal spikes
    t.cyl(0.09, 0.5, ICE, sx * 1.5, 1.3, 0.3, { r2: 0.01, seg: 6, rz: -sx * 0.8 });
  }
  if (level >= 4) cape(t, D2, 2.6, { w: 2.3, clasp: FROST_NEON, tatter: true });
  hd.done();
  t.done();
  hands(h, key, D3, D2, (a) => {
    a.box(1.1, 0.6, 1.1, D2, 0, -1.1, 0, { r: 0.08 }); // gauntlet cuffs
    a.box(1.14, 0.08, 1.14, neon, 0, -0.85, 0);
  });
  feet(h, key, D2, (b) => {
    b.box(1.1, 0.5, 0.4, D3, 0, -0.6, 0.5, { r: 0.08 }); // knee plates
    b.box(0.6, 0.06, 0.06, neon, 0, -0.6, 0.71);
  });
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, level >= 3 ? 1.2 : 1.1);
  const gk = wear(h, g, `${key}:hammer`);
  const y = frostSledge(gk, neon, { big: level >= 3, crystals: level >= 5 ? 5 : level >= 3 ? 3 : 2 });
  gk.done();
  muzzle(h, g, y, 0);
  h.rightArm.rotation.set(-2.6, 0, 0.15);
  h.leftArm.rotation.set(-2.4, 0, -0.3);
  h.pose = { right: -2.6, left: -2.4, leftRecoil: 0 };
  h.swing = 2.2;
  h.melee = true;
  h.tracer = FROST_NEON;
  h.root.scale.setScalar(1.1);
  const m = own(h, 0);
  if (level >= 1) m.crystals = iceCrystals(h);
  return m;
}

// ------------------------------------------------------------------ Artisan (neon coral) and its buildings

export const ART_NEON = 0xff6e40;
const { STEEL, DARK } = PARTS;

/** A white scrap shotgun (fist space, bore along -y): pump, wide barrel, scrap hopper on top. Returns [y, z]. */
function scrapGun(k, neon, o = {}) {
  const U = UP;
  k.box(0.34, 1.0, 0.36, W, 0, -0.3, U, { r: 0.04 }); // receiver
  k.cyl(0.12, 1.5, W3, 0, -1.4, U + 0.05, { seg: 10 }); // barrel
  k.cyl(0.15, 0.2, DARK, 0, -2.1, U + 0.05, { seg: 10 }); // muzzle
  k.cyl(0.14, 0.7, W2, 0, -1.15, U - 0.2, { seg: 10 }); // pump
  for (let i = 0; i < 3; i++) k.torus(0.15, 0.03, neon, 0, -0.95 - i * 0.2, U - 0.2, { seg: 10 });
  k.box(0.24, 0.26, 0.55, W2, 0, 0.12, U - 0.36, { rx: -0.3, r: 0.04 }); // grip
  k.box(0.26, 0.6, 0.3, W2, 0, 0.5, U + 0.05, { r: 0.05 }); // stock
  k.box(0.4, 0.45, 0.4, W3, 0, -0.35, U + 0.4, { r: 0.05 }); // scrap hopper
  k.box(0.3, 0.06, 0.3, neon, 0, -0.12, U + 0.4);
  if (o.big) for (const sx of [-1, 1]) k.cyl(0.07, 1.2, STEEL, sx * 0.2, -1.3, U + 0.12, { seg: 8 }); // twin rails
  return [-2.2, U + 0.05];
}

/**
 * Artisan (alternate Engineer): a white faceless builder with a hard hat, a scrap shotgun and a
 * wrench on the back. Lv 1 Scavenger: a scrap bag. Lv 2 Frontline Support: welding goggles and a
 * tool belt. Lv 3 Battle Ready: shoulder plates. Lv 4 Revisioned Blueprints: a blueprint tube and a
 * bigger gun. Lv 5 The Seventh Architect: a hovering helper drone and a coat.
 */
export function makeArtisan(level) {
  const h = blank();
  const key = `engineerArtisan${level}`;
  const neon = glowMat(h, ART_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  dome(hd, 0.92, 0.6, W2, 0, 1.0, 0); // hard hat
  hd.box(2.0, 0.08, 2.0, W2, 0, 1.0, 0.1, { r: 0.04 }); // brim
  hd.box(0.2, 0.55, 1.6, W3, 0, 1.25, 0, { r: 0.04 }); // ridge
  hd.box(0.3, 0.2, 0.06, neon, 0, 1.25, 0.82); // lamp
  if (level >= 2) {
    hd.box(1.25, 0.32, 0.12, W3, 0, 0.62, 0.72, { r: 0.05 }); // welding goggles
    for (const sx of [-1, 1]) hd.cyl(0.13, 0.06, neon, sx * 0.3, 0.62, 0.79, { axis: 'z', seg: 10 });
  }
  t.box(2.1, 1.8, 1.15, W, 0, 0.1, 0, { r: 0.12 }); // overalls
  for (const sx of [-1, 1]) t.box(0.18, 1.7, 0.05, W3, sx * 0.55, 0.15, 0.6); // straps
  t.box(0.8, 0.06, 0.05, neon, 0, 0.4, 0.61); // chest stripe
  t.box(2.15, 0.26, 1.2, W3, 0, -0.84, 0, { r: 0.04 }); // belt
  // a big wrench across the back
  t.box(0.2, 2.2, 0.14, W3, 0.2, 0.2, -0.7, { rz: 0.6 });
  t.box(0.6, 0.35, 0.16, W2, 0.85, 1.1, -0.7, { rz: 0.6, r: 0.04 });
  if (level >= 1) t.box(0.9, 0.9, 0.6, W2, -0.5, -0.1, -0.85, { r: 0.18 }); // scrap bag
  if (level >= 2) for (let i = 0; i < 3; i++) pouch(t, -0.7 + i * 0.7, -0.84, 0.62, 0.36, 0.3, W2); // tool belt
  if (level >= 3) shoulderPads(t, W2, 0.6);
  if (level >= 4) {
    t.cyl(0.18, 1.6, W2, -0.75, 0.6, -0.95, { seg: 10, rz: -0.3 }); // blueprint tube
    t.torus(0.19, 0.03, neon, -0.75, 0.6, -0.95, { seg: 10, rz: -0.3 });
  }
  if (level >= 5) {
    cape(t, W2, 2.4, { w: 2.0, clasp: ART_NEON });
    // a little helper drone hovering over the shoulder
    t.box(0.6, 0.22, 0.6, W, 1.4, 2.4, -0.2, { r: 0.08 });
    t.cyl(0.12, 0.05, neon, 1.4, 2.25, -0.2, { seg: 10 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) t.cyl(0.18, 0.03, W3, 1.4 + sx * 0.42, 2.55, -0.2 + sz * 0.42, { seg: 10 });
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, null);
  feet(h, key, W2, (b) => b.box(1.0, 0.4, 0.35, W3, 0, -0.6, 0.5, { r: 0.08 }));
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = scrapGun(gk, neon, { big: level >= 4 });
  gk.done();
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = ART_NEON;
  return own(h, UP);
}

/**
 * Skirmisher (Artisan building): a white tripod turret with a sensor head. Lv 1 Smart Targeting: a
 * radar dish. Lv 2 Armor Piercing Rounds: a longer, heavier barrel and armour plates. Lv 3
 * Annihilator Core: twin barrels, a glowing core and rocket pods.
 */
export function makeSkirmisher(level) {
  const u = makeThing();
  const neon = glowMat(u, ART_NEON);
  const key = `artisanSkirmisher${level}`;
  const k = kit(u, u.body, `${key}:base`);
  k.cyl(0.9, 0.16, W3, 0, 0.08, 0, { seg: 18 }); // foot plate
  k.torus(0.9, 0.04, neon, 0, 0.17, 0, { seg: 24 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const fx = Math.sin(a) * 1.2;
    const fz = Math.cos(a) * 1.2;
    k.tube([[0, 1.2, 0], [fx * 0.6, 0.6, fz * 0.6], [fx, 0.1, fz]], 0.08, W2, { sides: 6 }); // legs
    k.box(0.3, 0.08, 0.3, DARK, fx, 0.05, fz);
  }
  k.cyl(0.22, 1.4, W, 0, 0.9, 0, { r2: 0.18, seg: 12 }); // post
  k.cyl(0.36, 0.2, DARK, 0, 1.6, 0, { seg: 12 });
  k.done();
  const head = new THREE.Group();
  head.position.set(0, 1.95, 0);
  head.scale.setScalar(level >= 2 ? 1.2 : 1);
  u.body.add(head);
  const g = kit(u, head, `${key}:head`);
  g.box(1.1, 0.7, 1.2, W, 0, 0, 0, { r: 0.12 }); // housing
  g.box(0.7, 0.18, 0.06, neon, 0, 0.12, 0.62); // sensor slit
  g.box(1.14, 0.06, 1.24, W3, 0, -0.2, 0);
  const len = level >= 2 ? 1.6 : 1.1;
  const xs = level >= 3 ? [-0.2, 0.2] : [0];
  for (const x of xs) {
    barrel(g, x, 0, 0.55, len, 0.09, STEEL, { brake: level >= 2 });
    gunMuzzle(u, head, x, 0, 0.6 + len);
  }
  if (level >= 1) {
    g.cyl(0.05, 0.4, W3, 0, 0.5, -0.3, { seg: 6 }); // radar mast
    g.cyl(0.3, 0.06, W2, 0, 0.75, -0.3, { seg: 14, rx: 0.5 });
    g.ball(0.06, neon, 0, 0.8, -0.2, { seg: 6, rows: 4 });
  }
  if (level >= 2) for (const sx of [-1, 1]) g.box(0.12, 0.6, 1.0, W2, sx * 0.62, 0, 0.05, { r: 0.04 }); // armour plates
  if (level >= 3) {
    g.cyl(0.22, 0.1, neon, 0, 0, -0.62, { axis: 'z', seg: 12 }); // glowing core at the back
    for (const sx of [-1, 1]) {
      g.box(0.45, 0.45, 0.8, W3, sx * 0.85, 0.35, 0, { r: 0.06 }); // rocket pods
      for (const y of [0.25, 0.45]) g.cyl(0.07, 0.04, neon, sx * 0.85, y, 0.41, { axis: 'z', seg: 8 });
    }
  }
  g.done();
  u.static = true;
  u.tracer = ART_NEON;
  return u;
}

/**
 * Atelier (Artisan building): a white workshop station: a raised deck with an anvil, a crane arm
 * and a glowing pulse emitter. Lv 1 Quick Fix: tool racks. Lv 2 Full Charge: battery cells. Lv 3
 * Prime Purifier: a taller emitter with rings.
 */
export function makeAtelier(level) {
  const u = makeThing();
  const neon = glowMat(u, ART_NEON);
  const k = kit(u, u.body, `artisanAtelier${level}`);
  k.box(3.0, 0.5, 3.0, W2, 0, 0.25, 0, { r: 0.08 }); // deck
  k.box(3.04, 0.06, 3.04, neon, 0, 0.45, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(0.3, 0.6, 0.3, DARK, sx * 1.3, 0.3, sz * 1.3); // feet
  // the anvil
  k.box(0.9, 0.4, 0.5, W3, -0.6, 0.7, 0.5, { r: 0.04 });
  k.box(1.3, 0.35, 0.6, W, -0.6, 1.05, 0.5, { r: 0.05 });
  k.cyl(0.18, 0.5, W, -1.35, 1.05, 0.5, { axis: 'x', seg: 8, r2: 0.04 });
  // the crane arm
  k.cyl(0.14, 2.2, W3, 1.0, 1.6, -0.9, { seg: 10 });
  k.tube([[1.0, 2.7, -0.9], [0.5, 3.0, -0.3], [-0.2, 2.8, 0.3]], 0.08, W2, { sides: 6 });
  k.box(0.3, 0.3, 0.3, DARK, -0.2, 2.55, 0.3);
  // the pulse emitter
  const tall = level >= 3 ? 1.6 : 1.0;
  k.cyl(0.35, tall, W, 0.6, 0.5 + tall / 2, 0.6, { seg: 14 });
  k.ball(0.3, neon, 0.6, 0.6 + tall, 0.6, { seg: 12, rows: 8 });
  if (level >= 3) for (let i = 0; i < 2; i++) k.torus(0.45, 0.04, neon, 0.6, 1.0 + i * 0.6, 0.6, { seg: 18 });
  if (level >= 1) {
    k.box(0.1, 1.2, 1.2, W3, -1.4, 1.1, -0.6); // tool rack
    for (let i = 0; i < 3; i++) k.box(0.08, 0.6, 0.12, DARK, -1.33, 1.1, -1.0 + i * 0.4);
  }
  if (level >= 2) for (let i = 0; i < 3; i++) {
    k.cyl(0.18, 0.6, W, -0.2 + i * 0.45, 0.8, -1.0, { seg: 10 }); // battery cells
    k.cyl(0.19, 0.08, neon, -0.2 + i * 0.45, 0.95, -1.0, { seg: 10 });
  }
  k.done();
  u.static = true;
  u.tracer = ART_NEON;
  return u;
}

export const MODELS = {
  engineerArtisan: makeArtisan,
  artisanSkirmisher: makeSkirmisher,
  artisanAtelier: makeAtelier,
  sledgerFrostreaver: makeFrostreaver,
  hackerTechnomancer: makeTechnomancer,
};
