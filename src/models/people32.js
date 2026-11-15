// Tower models: people, batch 32 (dressed with the vehicle kit in ../vehicles.js).
// In here: Tempest, Phantom, Vanguard and the Strawman (both modes).
// Like batches 26-31 these are plain faceless figures: only their gear tells them apart, with
// accents in one neon colour per tower (the Strawman: red in Vengeful mode, green in Benevolent).
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.
// The Golden Bandit needs nothing here: golden towers get the gold version of their form's model.

import { glowMat } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { dome, fist, muzzle, own, wear } from './people1.js';
import { shoulderPads } from './people2.js';
import { feet, hands, hood } from './people5.js';
import { cape } from './people18.js';

const PI = Math.PI;
const W = 0xffffff;
const W2 = 0xf2f2f2;
const W3 = 0xe4e4e4;

/** A plain white figure with no face. */
const blank = () => makeHumanoid({ skin: W, shirt: W, pants: W2, arms: W, face: 'none' });

// ------------------------------------------------------------------ Tempest (neon lightning blue)

export const TEMPEST_NEON = 0x00b0ff;

/** A giant gauntlet fist on an arm (arm space): plated cuff, a huge fist with knuckle studs and coils. */
function bigGauntlet(a, neon, o = {}) {
  const s = o.big ? 1.2 : 1;
  a.box(1.2 * s, 0.8, 1.2 * s, W2, 0, -1.0, 0, { r: 0.1 }); // cuff
  a.box(1.24 * s, 0.1, 1.24 * s, neon, 0, -0.7, 0);
  a.box(1.6 * s, 1.1 * s, 1.5 * s, W, 0, -1.85, 0, { r: 0.16 }); // the fist
  for (let i = 0; i < 4; i++) a.box(0.28 * s, 0.22, 0.28 * s, W3, (-0.54 + i * 0.36) * s, -2.4 * s + 0.1, 0.62 * s, { r: 0.05 }); // knuckles
  for (let i = 0; i < 4; i++) a.box(0.2 * s, 0.06, 0.2 * s, neon, (-0.54 + i * 0.36) * s, -2.5 * s + 0.08, 0.62 * s); // glowing studs
  a.box(0.08, 0.9 * s, 0.06, neon, 0, -1.85, 0.77 * s); // seam
  if (o.coils) for (const sx of [-1, 1]) {
    a.cyl(0.12, 0.7, W3, sx * 0.85 * s, -1.6, 0, { seg: 8 });
    for (let i = 0; i < 3; i++) a.torus(0.14, 0.035, neon, sx * 0.85 * s, -1.85 + i * 0.22, 0, { seg: 10 });
  }
}

/** Mechanical wings on the back (torso space): jointed white struts with neon-edged vanes. */
function mechWings(t, neon, o = {}) {
  const spread = o.wide ? 1.25 : 1;
  for (const sx of [-1, 1]) {
    t.box(0.5, 0.5, 0.5, W3, sx * 0.45, 0.6, -0.8, { r: 0.08 }); // shoulder joint
    t.tube([[sx * 0.5, 0.65, -0.85], [sx * 1.6 * spread, 1.5, -1.2], [sx * 2.6 * spread, 2.2, -1.3]], 0.1, W2, { seg: 10, sides: 6 }); // main strut
    t.ball(0.16, neon, sx * 1.6 * spread, 1.5, -1.2, { seg: 8, rows: 5 }); // elbow light
    const vanes = o.wide ? 5 : 4;
    for (let i = 0; i < vanes; i++) {
      const x = sx * (0.9 + i * 0.45) * spread;
      const y = 1.1 + i * 0.25 - i * i * 0.04;
      const len = 1.4 + i * 0.35;
      t.slab(0.32, len, 0.06, W, x, y - len / 2 + 0.3, -1.25 - i * 0.03, { rz: sx * (0.25 + i * 0.12) }); // vane
      t.box(0.05, len * 0.9, 0.07, neon, x + sx * 0.15, y - len / 2 + 0.3, -1.25 - i * 0.03, { rz: sx * (0.25 + i * 0.12) }); // neon edge
    }
  }
}

/**
 * Tempest (alternate Spiritual Advocate): a white armoured fighter with giant gauntlet fists and
 * mechanical wings, crackling with lightning (views.js: `sparks`). Lv 1 Thunder Break: a lightning
 * crest. Lv 2 Static Gauntlets: coils on the fists. Lv 3 Lightning Charge: tesla spires on the back.
 * Lv 4 Eye of The Storm: a storm halo. Lv 5 Flasharc: wider wings and bigger fists.
 */
export function makeTempest(level) {
  const h = blank();
  const key = `spiritTempest${level}`;
  const neon = glowMat(h, TEMPEST_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  dome(hd, 0.88, 0.7, W2, 0, 0.9, 0); // helmet
  hd.box(1.3, 0.12, 0.08, neon, 0, 0.62, 0.73, { r: 0.03 }); // visor
  if (level >= 1) {
    // a lightning-bolt crest
    hd.box(0.14, 0.5, 0.5, W3, 0, 1.55, 0, { r: 0.04 });
    hd.box(0.16, 0.45, 0.16, neon, 0, 1.7, 0.15, { rx: 0.5 });
    hd.box(0.16, 0.45, 0.16, neon, 0, 1.95, -0.05, { rx: -0.5 });
  }
  if (level >= 4) hd.torus(0.95, 0.05, neon, 0, 1.6, 0, { seg: 24 }); // storm halo
  t.box(2.3, 1.85, 1.3, W, 0, 0.1, 0, { r: 0.16 }); // chest plate
  // a neon lightning bolt on the chest
  t.box(0.2, 0.6, 0.06, neon, 0.1, 0.55, 0.68, { rz: -0.4 });
  t.box(0.5, 0.12, 0.06, neon, 0, 0.25, 0.68);
  t.box(0.2, 0.6, 0.06, neon, -0.1, -0.05, 0.68, { rz: -0.4 });
  t.box(2.35, 0.28, 1.35, W3, 0, -0.85, 0, { r: 0.05 }); // belt
  shoulderPads(t, W2, 0.7);
  mechWings(t, neon, { wide: level >= 5 });
  if (level >= 3) for (const sx of [-1, 1]) {
    // tesla spires between the wings
    t.cyl(0.14, 1.2, W3, sx * 0.35, 1.6, -0.9, { seg: 8 });
    t.ball(0.2, neon, sx * 0.35, 2.3, -0.9, { seg: 10, rows: 6 });
  }
  hd.done();
  t.done();
  hands(h, key, null, W2, (a) => bigGauntlet(a, neon, { coils: level >= 2, big: level >= 5 }));
  feet(h, key, W2, (b) => b.box(1.05, 0.45, 0.35, W3, 0, -0.6, 0.5, { r: 0.08 })); // knee plates
  h.muzzles = [];
  const g = fist(h.rightArm, -2.4, 1);
  muzzle(h, g, 0, 0);
  // fists up, ready to punch
  h.rightArm.rotation.set(-1.2, 0, 0.25);
  h.leftArm.rotation.set(-1.0, 0, -0.25);
  h.pose = { right: -1.2, left: -1.0, leftRecoil: 0 };
  h.swing = 1.4;
  h.melee = true;
  h.tracer = TEMPEST_NEON;
  h.root.scale.setScalar(1.1);
  const m = own(h, 0);
  m.sparks = TEMPEST_NEON; // views: little lightning arcs crackle round it
  return m;
}

// ------------------------------------------------------------------ Phantom (neon chartreuse)

const PHANTOM_NEON = 0xaeea00;

/** A ghostly blade in a fist (fist space, pointing down -y). o.saw: a spinning saw disc on it. */
function phantomBlade(k, neon, o = {}) {
  k.box(0.18, 0.5, 0.22, W3, 0, 0.1, 0, { r: 0.04 }); // grip
  k.box(0.7, 0.1, 0.3, W2, 0, -0.18, 0, { r: 0.03 }); // guard
  k.slab(0.36, 2.0, 0.06, W, 0, -1.25, 0, { bw: 0.3 }); // blade
  k.box(0.05, 1.8, 0.08, neon, 0, -1.2, 0); // glowing edge
  if (o.saw) {
    k.cyl(0.6, 0.06, W2, 0, -1.4, 0.12, { axis: 'z', seg: 16 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      k.box(0.14, 0.14, 0.05, neon, Math.cos(a) * 0.62, -1.4 + Math.sin(a) * 0.62, 0.12, { rz: a + PI / 4 }); // teeth
    }
  }
  return -2.2;
}

/**
 * Phantom: a white hooded wraith in a ragged cloak with two ghost blades. Lv 1 Spectral Form: a
 * glowing eye line. Lv 2 Razorblade Saw: saw discs on the blades. Lv 3 Delusion: shoulder spikes.
 * Lv 4 Shadow Phantasma: a tattered cape. Lv 5 Void Opus: a crown of spikes and a void halo.
 */
export function makePhantom(level) {
  const h = blank();
  const key = `phantom${level}`;
  const neon = glowMat(h, PHANTOM_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hood(hd, W2);
  if (level >= 1) hd.box(0.9, 0.08, 0.06, neon, 0, 0.66, 0.72, { r: 0.03 }); // eye line under the hood
  if (level >= 5) {
    for (let i = 0; i < 5; i++) hd.cyl(0.06, 0.5, neon, (i - 2) * 0.26, 1.5, 0.2, { r2: 0.01, seg: 5 }); // crown
    hd.torus(1.0, 0.04, neon, 0, 1.85, 0, { seg: 24 });
  }
  t.box(2.0, 1.75, 1.05, W, 0, 0.1, 0, { r: 0.1 }); // cloak top
  t.slab(2.2, 1.6, 1.15, W2, 0, -1.5, 0, { bw: 1.3 }); // ragged cloak skirt
  for (let i = 0; i < 6; i++) t.cyl(0.005, 0.5, W2, -0.95 + i * 0.38, -2.45, 0.2, { r2: 0.18, seg: 3 }); // rags
  t.box(0.07, 2.6, 0.05, neon, 0, -0.5, 0.6); // neon seam
  t.box(2.06, 0.22, 1.1, W3, 0, -0.84, 0, { r: 0.04 }); // belt
  if (level >= 3) {
    shoulderPads(t, W2, 0.5);
    for (const sx of [-1, 1]) t.cyl(0.1, 0.55, neon, sx * 1.2, 1.3, 0, { r2: 0.01, seg: 6, rz: -sx * 0.5 }); // spikes
  }
  if (level >= 4) cape(t, W2, 2.6, { w: 2.1, clasp: PHANTOM_NEON, tatter: true });
  hd.done();
  t.done();
  hands(h, key, W3, W2, null);
  feet(h, key, W2, null);
  h.muzzles = [];
  for (const arm of [h.rightArm, h.leftArm]) {
    const g = fist(arm, -1.9, 1);
    const gk = wear(h, g, `${key}:blade${arm === h.rightArm ? 'R' : 'L'}`);
    const y = phantomBlade(gk, neon, { saw: level >= 2 });
    gk.done();
    if (arm === h.rightArm) muzzle(h, g, y, 0);
  }
  h.rightArm.rotation.set(-1.1, 0, 0.35);
  h.leftArm.rotation.set(-0.7, 0, -0.45);
  h.pose = { right: -1.1, left: -0.7, leftRecoil: 0 };
  h.swing = 1.8;
  h.melee = true;
  h.tracer = PHANTOM_NEON;
  return own(h, 0);
}

// ------------------------------------------------------------------ Vanguard (neon light orange)

const VAN_NEON = 0xffab40;

/** A heavy cudgel in a fist (fist space, the head down -y). o.spikes: studs on the head. Returns the head's y. */
function cudgel(k, neon, o = {}) {
  k.cyl(0.12, 2.2, W3, 0, -0.6, 0, { seg: 8 }); // haft
  for (let i = 0; i < 3; i++) k.torus(0.14, 0.03, neon, 0, 0.2 - i * 0.3, 0, { seg: 8 });
  const y = -2.0;
  k.cyl(0.42, 1.0, W, 0, y, 0, { seg: 10 }); // head
  k.torus(0.44, 0.06, neon, 0, y + 0.3, 0, { seg: 12 });
  k.torus(0.44, 0.06, neon, 0, y - 0.3, 0, { seg: 12 });
  if (o.spikes) for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    k.cyl(0.08, 0.35, W2, Math.cos(a) * 0.5, y, Math.sin(a) * 0.5, { r2: 0.01, seg: 6, rz: -Math.cos(a) * PI / 2, rx: Math.sin(a) * PI / 2 });
  }
  return y;
}

/**
 * Vanguard (alternate Phantom): a white knight with a heavy cudgel and a round shield. Lv 1
 * Charged Smash: a charge core on the chest. Lv 2 Last Stand: the shield glows. Lv 3
 * Resuscitation: a heart lamp on the belt. Lv 4 Retaliation: a spiked cudgel. Lv 5 Retribution:
 * horns and a cape.
 */
export function makeVanguard(level) {
  const h = blank();
  const key = `phantomVanguard${level}`;
  const neon = glowMat(h, VAN_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  dome(hd, 0.9, 0.72, W2, 0, 0.9, 0); // great helm
  hd.box(1.3, 0.12, 0.08, neon, 0, 0.66, 0.74, { r: 0.03 }); // visor slit
  hd.box(0.12, 0.5, 0.08, W3, 0, 0.42, 0.75); // nose guard
  if (level >= 5) for (const sx of [-1, 1]) hd.cyl(0.15, 0.8, neon, sx * 0.75, 1.35, 0.1, { seg: 8, r2: 0.02, rz: -sx * 0.9 }); // horns
  t.box(2.4, 1.85, 1.35, W, 0, 0.1, 0, { r: 0.16 }); // breastplate
  t.box(2.45, 0.28, 1.4, W3, 0, -0.85, 0, { r: 0.05 }); // belt
  shoulderPads(t, W2, 0.75);
  if (level >= 1) {
    t.cyl(0.32, 0.1, W3, 0, 0.35, 0.7, { axis: 'z', seg: 14 }); // charge core
    t.cyl(0.22, 0.06, neon, 0, 0.35, 0.76, { axis: 'z', seg: 14 });
  }
  if (level >= 3) {
    t.box(0.4, 0.35, 0.3, W3, 0.75, -0.85, 0.6, { r: 0.05 }); // heart lamp
    t.ball(0.13, neon, 0.75, -0.85, 0.75, { seg: 8, rows: 6 });
  }
  if (level >= 5) cape(t, W2, 2.6, { w: 2.4, clasp: VAN_NEON, tatter: true });
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a, s) => {
    a.box(1.1, 0.6, 1.1, W2, 0, -1.1, 0, { r: 0.08 }); // gauntlet cuffs
    if (s > 0) {
      // the round shield on the left arm
      a.cyl(1.0, 0.16, W, 0.65, -1.2, 0, { axis: 'x', seg: 18 });
      a.torus(1.0, 0.07, level >= 2 ? neon : W3, 0.74, -1.2, 0, { ry: PI / 2, seg: 20 });
      a.ball(0.22, level >= 2 ? neon : W3, 0.8, -1.2, 0, { seg: 10, rows: 6 }); // boss
    }
  });
  feet(h, key, W2, (b) => b.box(1.1, 0.5, 0.4, W3, 0, -0.6, 0.5, { r: 0.08 }));
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:cudgel`);
  const y = cudgel(gk, neon, { spikes: level >= 4 });
  gk.done();
  muzzle(h, g, y, 0);
  h.rightArm.rotation.set(-2.6, 0, 0.2); // the cudgel up over the shoulder
  h.leftArm.rotation.set(-0.6, 0, -0.2);
  h.pose = { right: -2.6, left: -0.6, leftRecoil: 0 };
  h.swing = 2.0;
  h.melee = true;
  h.tracer = VAN_NEON;
  h.root.scale.setScalar(1.08);
  return own(h, 0);
}

// ------------------------------------------------------------------ Strawman (red / green)

const CROW_V = 0xff3d00; // The Vengeful
const CROW_B = 0x69f0ae; // The Benevolent

/**
 * Strawman (alternate Scarecrow): a white scarecrow strung on a pole, a wide hat, a patched coat
 * and straw tufts. Vengeful (red): a sickle, then glowing cracks, horns and a crow on the hat.
 * Benevolent (green): a lantern, then a flower crown and soft wisps. Higher levels add more.
 */
export function makeStrawman(level, mode) {
  const h = blank();
  const key = `scarecrowStrawman${mode}${level}`;
  const neon = glowMat(h, mode === 'v' ? CROW_V : CROW_B);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // a sack head with stitched eyes, and a wide hat
  hd.box(1.3, 1.25, 1.2, W2, 0, 0.6, 0, { r: 0.3 });
  for (const sx of [-1, 1]) hd.box(0.22, 0.08, 0.05, neon, sx * 0.3, 0.75, 0.62, { rz: sx * 0.6 }); // stitched eyes
  hd.box(0.6, 0.06, 0.05, neon, 0, 0.35, 0.62); // stitched mouth
  hd.cyl(1.25, 0.08, W3, 0, 1.25, 0, { seg: 18 }); // hat brim
  hd.cyl(0.6, 0.7, W, 0, 1.6, 0, { r2: 0.45, seg: 14, rz: 0.1 }); // hat crown
  hd.torus(0.6, 0.05, neon, 0, 1.32, 0, { seg: 16 }); // hat band
  if (mode === 'v' && level >= 4) for (const sx of [-1, 1]) hd.cyl(0.12, 0.7, neon, sx * 0.55, 2.0, 0, { r2: 0.01, seg: 6, rz: -sx * 0.5 }); // horns through the hat
  if (mode === 'b' && level >= 3) for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    hd.ball(0.12, neon, Math.cos(a) * 0.62, 1.38, Math.sin(a) * 0.62, { seg: 6, rows: 4 }); // flower crown
  }
  // patched coat with straw tufts
  t.box(2.1, 1.8, 1.1, W, 0, 0.1, 0, { r: 0.1 });
  t.box(0.5, 0.5, 0.06, W3, -0.5, 0.3, 0.58); // patch
  t.box(0.4, 0.4, 0.06, neon, 0.55, -0.3, 0.58); // neon patch
  t.box(2.15, 0.2, 1.15, W3, 0, -0.84, 0, { r: 0.04 }); // rope belt
  for (let i = 0; i < 7; i++) t.cyl(0.005, 0.45, W3, -0.9 + i * 0.3, -1.15, 0.45, { r2: 0.07, seg: 3, rx: PI }); // straw under the coat
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) t.cyl(0.005, 0.4, W3, sx * (0.3 + i * 0.15), 1.1, 0.4, { r2: 0.06, seg: 3 }); // straw at the collar
  if (level >= 3) shoulderPads(t, W2, 0.5);
  if (level >= 5) cape(t, W2, 2.4, { w: 2.0, clasp: CROW_V, tatter: true });
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => {
    for (let i = 0; i < 3; i++) a.cyl(0.005, 0.5, W3, -0.3 + i * 0.3, -1.4, 0, { r2: 0.07, seg: 3, rx: PI }); // straw hands
  });
  feet(h, key, W2, null);
  // the pole it hangs on, with a crossbar behind the arms
  const r = wear(h, h.root, `${key}:pole`);
  r.cyl(0.14, 6.5, W3, 0, 3.0, -0.8, { seg: 8 });
  r.box(5.2, 0.22, 0.22, W3, 0, 5.1, -0.8, { r: 0.04 });
  if (mode === 'v' && level >= 2) {
    // a crow perched on the crossbar
    r.box(0.5, 0.45, 0.8, W2, 2.0, 5.45, -0.8, { r: 0.12 });
    r.box(0.2, 0.1, 0.35, neon, 2.0, 5.5, -0.3, { r: 0.02 });
  }
  r.done();
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1);
  const gk = wear(h, g, `${key}:tool`);
  if (mode === 'v') {
    // a sickle
    gk.cyl(0.08, 1.4, W3, 0, -0.4, 0, { seg: 6 });
    gk.tube([[0, -1.1, 0], [0.4, -1.4, 0.3], [0.2, -1.5, 0.8], [-0.2, -1.3, 0.9]], 0.07, level >= 1 ? neon : W, { seg: 10, sides: 5 });
  } else {
    // a lantern
    gk.cyl(0.04, 0.6, W3, 0, -0.4, 0, { seg: 5 });
    gk.box(0.5, 0.6, 0.5, W2, 0, -0.95, 0, { r: 0.06 });
    gk.ball(0.18, neon, 0, -0.95, 0, { seg: 8, rows: 6 });
  }
  gk.done();
  muzzle(h, g, -1.3, 0);
  // arms out along the crossbar
  h.rightArm.rotation.set(0, 0, 1.35);
  h.leftArm.rotation.set(0, 0, -1.35);
  h.pose = { right: 0, left: 0, leftRecoil: 0 };
  h.tracer = mode === 'v' ? CROW_V : CROW_B;
  h.root.position.y += 0.6; // hangs a little off the ground
  return own(h, 0);
}

export const MODELS = {
  spiritTempest: makeTempest,
  phantom: makePhantom,
  phantomVanguard: makeVanguard,
  scarecrowStrawman: (level) => makeStrawman(level, 'v'),
  scarecrowStrawmanB: (level) => makeStrawman(level, 'b'),
};
