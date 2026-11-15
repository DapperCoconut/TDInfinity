// Tower models: people, batch 33 (dressed with the vehicle kit in ../vehicles.js).
// In here: Technomancer, Frostreaver.
// Like batches 26-32 these are plain faceless figures: only their gear tells them apart, with
// accents in one neon colour per tower.
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.

import * as THREE from 'three';
import { glowMat } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { UP, aimLong, dome, fist, muzzle, own, rifle, wear } from './people1.js';
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

export const MODELS = {
  sledgerFrostreaver: makeFrostreaver,
  hackerTechnomancer: makeTechnomancer,
};
