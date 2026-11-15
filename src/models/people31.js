// Tower models: people, batch 31 (dressed with the vehicle kit in ../vehicles.js).
// In here: Hunter, Juggernaut, Soul Master, Toxicator, and the Soul Master's Revenants.
// Like batches 26-30 these are plain faceless figures: only their gear tells them apart, with
// accents in one neon colour per tower.
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.
// SUMMONS maps unit models to builders (summons.js reads it).

import * as THREE from 'three';
import { glowMat } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { makeThing } from './bits.js';
import { UP, aimLong, dome, fist, goggles, muzzle, own, wear } from './people1.js';
import { shoulderPads } from './people2.js';
import { feet, hands, hood } from './people5.js';
import { cape, gauntlet } from './people18.js';

const PI = Math.PI;
const W = 0xffffff;
const W2 = 0xf2f2f2;
const W3 = 0xe4e4e4;

/** A plain white figure with no face. */
const blank = () => makeHumanoid({ skin: W, shirt: W, pants: W2, arms: W, face: 'none' });

// ------------------------------------------------------------------ Hunter (neon deep teal)

const HUNTER_NEON = 0x00bfa5;

/**
 * A heavy white crossbow on the fist (gun space): stock, a long tiller, wide limbs with a string
 * and a bolt. o.pierce: a long glowing piercing bolt. o.scope: a scope on top. Returns the tip [y, z].
 */
function whiteCrossbow(k, neon, o = {}) {
  const U = UP;
  k.box(0.28, 0.8, 0.4, W2, 0, 0.5, U - 0.08, { r: 0.07 }); // stock
  k.box(0.22, 0.26, 0.5, W3, 0, 0.05, U - 0.34, { rx: -0.32, r: 0.05 }); // grip
  k.box(0.26, 2.2, 0.28, W, 0, -0.8, U, { r: 0.05 }); // tiller
  k.box(0.27, 0.1, 0.29, neon, 0, -0.4, U);
  for (const s of [-1, 1]) {
    k.tube([[0, -1.7, U], [s * 0.9, -1.55, U + 0.05], [s * 1.5, -1.3, U + 0.1]], 0.07, W2, { seg: 10, sides: 6 }); // limbs
    k.tube([[s * 1.5, -1.3, U + 0.1], [0, -0.3, U + 0.18]], 0.016, W3, { seg: 2, sides: 4, tension: 0 }); // string
    k.ball(0.07, neon, s * 1.5, -1.3, U + 0.1, { seg: 8, rows: 5 });
  }
  const tip = o.pierce ? -2.6 : -2.1;
  k.cyl(0.04, -0.3 - tip, o.pierce ? neon : W3, 0, (-0.3 + tip) / 2, U + 0.18, { seg: 6 }); // bolt
  k.cyl(0.01, 0.3, W, 0, tip + 0.15, U + 0.18, { r2: 0.1, seg: 8 }); // head
  if (o.scope) {
    k.cyl(0.1, 0.8, W3, 0, -0.5, U + 0.4, { seg: 10 });
    k.cyl(0.11, 0.04, neon, 0, -0.92, U + 0.4, { seg: 10 });
  }
  return [tip, U + 0.18];
}

/**
 * Hunter (alternate Archer): a white hooded hunter with a heavy crossbow. Lv 1 Hawkshot: a hawk
 * feather on the hood. Lv 2 Eagle Eye: goggles and a scope. Lv 3 Piercing Bolt: a quiver of
 * glowing bolts. Lv 4 Hunting Grounds: shoulder pads, a cape and a horn.
 */
export function makeHunter(level) {
  const h = blank();
  const key = `archerHunter${level}`;
  const neon = glowMat(h, HUNTER_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hood(hd, W2);
  if (level >= 1) {
    hd.slab(0.06, 0.9, 0.3, W, 0.7, 1.2, -0.3, { rz: -0.5, bd: 0.1 }); // hawk feather
    hd.box(0.07, 0.8, 0.05, neon, 0.71, 1.2, -0.3, { rz: -0.5 });
  }
  if (level >= 2) goggles(hd, 0.55, HUNTER_NEON, { frame: W3, strap: W3 });
  t.box(2.12, 1.7, 1.12, W, 0, 0.1, 0, { r: 0.12 }); // coat
  t.box(0.06, 1.5, 0.05, neon, 0.35, 0.1, 0.58); // seam
  t.box(2.1, 0.24, 1.12, W3, 0, -0.84, 0, { r: 0.04 }); // belt
  for (const sx of [-1, 1]) t.box(0.32, 0.35, 0.3, W2, sx * 0.7, -1.0, 0.5, { r: 0.05 }); // pouches
  // a quiver of bolts on the back
  t.box(0.6, 1.6, 0.5, W3, 0.4, 0.3, -0.85, { rz: 0.25, r: 0.08 });
  for (let i = 0; i < 4; i++) t.cyl(0.04, 0.6, level >= 3 ? neon : W2, 0.15 + i * 0.12, 1.3, -0.85, { rz: 0.25, seg: 5 });
  if (level >= 4) {
    shoulderPads(t, W2, 0.55);
    cape(t, W2, 2.4, { clasp: HUNTER_NEON, tatter: true });
    t.cyl(0.15, 0.7, W3, -0.85, -0.9, 0.4, { r2: 0.05, rz: 1.2, seg: 8 }); // hunting horn
    t.torus(0.16, 0.03, neon, -0.6, -0.8, 0.4, { ry: PI / 2, seg: 10 });
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => a.box(0.5, 0.1, 0.5, neon, 0, -1.2, 0, { r: 0.04 })); // cuffs
  feet(h, key, W2, null);
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = whiteCrossbow(gk, neon, { pierce: level >= 3, scope: level >= 2 });
  gk.done();
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = HUNTER_NEON;
  h.tracerWidth = 2;
  return own(h, UP);
}

// ------------------------------------------------------------------ Juggernaut (neon blood red)

const JUG_NEON = 0xd50000;

/**
 * A giant white mace in the fist (the head along -y): a long grip, a flanged ball head with
 * spikes. o.big: a bigger head with a neon core ring. o.chain: Wrecking Ball, a chain ring.
 */
function giantMace(k, neon, o = {}) {
  k.cyl(0.13, 0.7, W3, 0, 0.1, 0, { seg: 10 }); // grip
  for (let i = 0; i < 3; i++) k.torus(0.14, 0.03, neon, 0, 0.3 - i * 0.2, 0, { seg: 10 });
  k.cyl(0.1, 2.4, W2, 0, -1.45, 0, { seg: 10 }); // shaft
  const r = o.big ? 0.95 : 0.75;
  const y = -2.65 - r * 0.6;
  k.ball(r, W, 0, y, 0, { seg: 14, rows: 10 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    k.box(0.12, r * 1.3, 0.5, W2, Math.cos(a) * r * 0.8, y, Math.sin(a) * r * 0.8, { ry: -a }); // flanges
    k.cyl(0.12, 0.45, W3, Math.cos(a) * r * 1.05, y + 0.25, Math.sin(a) * r * 1.05, { r2: 0.01, seg: 6, rz: -Math.cos(a) * 1.3, rx: Math.sin(a) * 1.3 }); // spikes
  }
  k.torus(r * 1.02, 0.06, neon, 0, y, 0, { rx: PI / 2, seg: 18 }); // neon band
  if (o.big) k.ball(r * 0.4, neon, 0, y - r * 0.85, 0, { seg: 10, rows: 7 }); // glowing tip
  if (o.chain) for (let i = 0; i < 3; i++) k.torus(0.16, 0.05, W3, 0, -0.5 - i * 0.28, 0, { ry: i % 2 ? PI / 2 : 0, seg: 10 }); // chain links
  return y;
}

/**
 * Juggernaut: a huge white armoured brute with a giant mace held up behind it. Lv 1 Crushing
 * Slam: a helmet crest and knee guards. Lv 2 Magnetic Field: a magnet coil on the back. Lv 3
 * Wrecking Ball: full plate, gauntlets, a chain on the mace. Lv 4 Sinking Obliteration: horns, a
 * bigger glowing mace and a cape.
 */
export function makeJuggernaut(level) {
  const h = blank();
  const key = `maceJuggernaut${level}`;
  const neon = glowMat(h, JUG_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  dome(hd, 0.9, 0.7, W2, 0, 0.9, 0); // helmet
  hd.box(1.4, 0.14, 0.08, neon, 0, 0.6, 0.74, { r: 0.03 }); // visor slit
  if (level >= 1) hd.box(0.18, 0.5, 1.4, W3, 0, 1.55, 0, { r: 0.06 }); // crest
  if (level >= 4) for (const sx of [-1, 1]) hd.cyl(0.16, 0.9, neon, sx * 0.75, 1.4, 0.1, { seg: 8, r2: 0.02, rz: -sx * 0.9 }); // horns
  t.box(2.5, 1.9, 1.4, W, 0, 0.1, 0, { r: 0.18 }); // big chest plate
  t.box(1.6, 0.9, 0.08, W3, 0, 0.35, 0.72, { r: 0.06 });
  t.box(0.5, 0.5, 0.06, neon, 0, 0.35, 0.77, { rz: PI / 4 }); // neon diamond
  t.box(2.55, 0.3, 1.45, W3, 0, -0.85, 0, { r: 0.05 }); // belt
  shoulderPads(t, W2, 0.8);
  if (level >= 2) {
    t.cyl(0.5, 1.2, W3, 0, 0.3, -0.95, { seg: 14 }); // magnet coil on the back
    for (let i = 0; i < 4; i++) t.torus(0.52, 0.05, neon, 0, -0.2 + i * 0.32, -0.95, { rx: PI / 2, seg: 14 });
  }
  if (level >= 3) for (const sx of [-1, 1]) t.box(0.7, 0.9, 1.3, W2, sx * 1.0, -1.25, 0, { r: 0.1 }); // tassets
  if (level >= 4) cape(t, W2, 2.6, { w: 2.5, clasp: JUG_NEON, tatter: true });
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => {
    if (level >= 3) gauntlet(a, W, neon);
    else a.box(0.6, 0.12, 0.6, neon, 0, -1.2, 0, { r: 0.04 });
  });
  feet(h, key, W2, (b) => {
    if (level >= 1) b.box(1.1, 0.5, 0.4, W3, 0, -0.6, 0.5, { r: 0.08 }); // knee guards
  });
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.3);
  const gk = wear(h, g, `${key}:gun`);
  const headY = giantMace(gk, neon, { big: level >= 4, chain: level >= 3 });
  gk.done();
  muzzle(h, g, headY, 0);
  // the mace rests up over the shoulder, its head behind it, until it slams down
  h.rightArm.rotation.set(-2.9, 0, 0.2);
  h.leftArm.rotation.set(-0.4, 0, -0.25);
  h.pose = { right: -2.9, left: -0.4, leftRecoil: 0 };
  h.swing = 2.2;
  h.melee = true;
  h.tracer = JUG_NEON;
  h.root.scale.setScalar(1.15); // a big one
  return own(h, 0);
}

// ------------------------------------------------------------------ Soul Master (neon lavender)

const SOUL_NEON = 0xb388ff;

/** A white staff in the fist (top along +y... held down -y): a long pole with a soul orb in a claw. */
function soulStaff(k, neon, o = {}) {
  k.cyl(0.09, 3.4, W2, 0, -0.6, 0, { seg: 8 });
  for (let i = 0; i < 3; i++) k.torus(0.11, 0.025, neon, 0, 0.6 - i * 0.25, 0, { seg: 8 });
  const y = 1.25;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2;
    k.cyl(0.04, 0.6, W3, Math.cos(a) * 0.2, y, Math.sin(a) * 0.2, { seg: 5, rz: -Math.cos(a) * 0.5, rx: Math.sin(a) * 0.5 }); // claw
  }
  k.ball(o.big ? 0.32 : 0.24, neon, 0, y + 0.3, 0, { seg: 12, rows: 8 });
  return y + 0.3;
}

/**
 * The souls that fly round the Soul Master (views.js moves them: `orbs`). Up to 8, each a little
 * glowing wisp with a tail; only the first few are shown.
 */
function soulOrbs(h, n) {
  const g = new THREE.Group();
  const mat = glowMat(h, SOUL_NEON, 1);
  mat.transparent = true;
  mat.opacity = 0.85;
  mat.userData.keepOpacity = 0.85;
  const head = new THREE.SphereGeometry(0.55, 12, 8);
  const tail = new THREE.ConeGeometry(0.4, 1.4, 8);
  for (let i = 0; i < n; i++) {
    const s = new THREE.Group();
    const a = new THREE.Mesh(head, mat);
    const b = new THREE.Mesh(tail, mat);
    b.rotation.z = PI / 2;
    b.position.x = 0.8;
    s.add(a, b);
    s.position.y = 2.5;
    g.add(s);
  }
  return g;
}

/**
 * Soul Master (alternate Necromancer): a white hooded mage in a long robe with a soul staff.
 * Lv 1 Vengeful Spirits: a neon sash. Lv 2 Soul Gathering: a soul lantern on the belt. Lv 3 Dark
 * Essence: shoulder spikes. Lv 4 Soulstorm: a halo of wisps. Lv 5 Eternal Damnation: a crown and a cape.
 */
export function makeSoulMaster(level) {
  const h = blank();
  const key = `necroSoulMaster${level}`;
  const neon = glowMat(h, SOUL_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hood(hd, W2);
  hd.box(1.0, 0.1, 0.06, neon, 0, 0.62, 0.72, { r: 0.03 }); // glowing eye line under the hood
  if (level >= 5) for (let i = 0; i < 5; i++) hd.cyl(0.06, 0.45, neon, (i - 2) * 0.28, 1.5, 0.25, { r2: 0.01, seg: 5 }); // crown
  t.box(2.0, 1.75, 1.05, W, 0, 0.1, 0, { r: 0.1 }); // robe top
  t.slab(2.2, 1.8, 1.2, W2, 0, -1.6, 0, { bw: 1.35 }); // long robe skirt
  t.box(0.08, 3.0, 0.05, neon, 0, -0.6, 0.6); // neon seam down the front
  if (level >= 1) t.box(0.3, 2.4, 1.12, neon, 0, 0.1, 0, { rz: 0.6 }); // sash
  t.box(2.06, 0.24, 1.1, W3, 0, -0.84, 0, { r: 0.04 }); // belt
  if (level >= 2) {
    t.box(0.35, 0.45, 0.35, W3, -0.8, -1.15, 0.45, { r: 0.05 }); // soul lantern
    t.ball(0.14, neon, -0.8, -1.15, 0.45, { seg: 8, rows: 6 });
  }
  if (level >= 3) {
    shoulderPads(t, W2, 0.55);
    for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) t.cyl(0.1, 0.5, W3, sx * (1.15 + i * 0.25), 1.25, 0, { r2: 0.01, seg: 6, rz: -sx * 0.4 }); // spikes
  }
  if (level >= 4) {
    hd.torus(0.95, 0.04, neon, 0, 1.75, 0, { seg: 24 }); // halo
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2;
      hd.ball(0.12, neon, Math.sin(a) * 0.95, 1.75, Math.cos(a) * 0.95, { seg: 6, rows: 4 });
    }
  }
  if (level >= 5) cape(t, W2, 2.8, { w: 2.1, clasp: SOUL_NEON, tatter: true });
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => a.box(0.55, 0.3, 0.55, W2, 0, -1.15, 0, { r: 0.08 })); // wide sleeves
  feet(h, key, W2, null);
  h.muzzles = [];
  const g = fist(h.leftArm, -1.9, 1.1);
  const gk = wear(h, g, `${key}:staff`);
  const y = soulStaff(gk, neon, { big: level >= 3 });
  gk.done();
  muzzle(h, g, y, 0);
  h.leftArm.rotation.set(-0.9, 0, -0.3);
  h.rightArm.rotation.set(-1.4, 0, 0.5); // the free hand reaches out, guiding the souls
  h.pose = { right: -1.4, left: -0.9, leftRecoil: 0 };
  h.tracer = SOUL_NEON;
  const m = own(h, 0);
  m.orbs = soulOrbs(h, 8);
  return m;
}

// ------------------------------------------------------------------ Toxicator (neon toxic green)

const TOX_NEON = 0x76ff03;

/**
 * A big white toxic launcher on the fist (gun space): a fat barrel with a glowing bore, a canister
 * on top. o.nuke: a wider barrel with a hazard ring. o.twin: a second barrel. Returns the bore [y, z].
 */
function toxLauncher(k, neon, o = {}) {
  const U = UP;
  const r = o.nuke ? 0.38 : 0.3;
  k.box(0.3, 0.8, 0.42, W2, 0, 0.5, U - 0.08, { r: 0.07 }); // stock
  k.box(0.22, 0.26, 0.5, W3, 0, 0.05, U - 0.34, { rx: -0.32, r: 0.05 }); // grip
  k.box(0.42, 0.7, 0.5, W, 0, -0.2, U, { r: 0.06 }); // body
  k.cyl(r, 1.8, W, 0, -1.3, U + 0.05, { seg: 14 }); // barrel
  k.cyl(r * 0.7, 0.05, neon, 0, -2.2, U + 0.05, { seg: 12 }); // glowing bore
  k.torus(r + 0.02, 0.05, neon, 0, -1.6, U + 0.05, { rx: PI / 2, seg: 14 });
  if (o.nuke) for (let i = 0; i < 3; i++) k.box(0.12, 0.3, 0.05, 0x212121, Math.cos((i / 3) * PI * 2) * (r + 0.02), -1.0, U + 0.05 + Math.sin((i / 3) * PI * 2) * (r + 0.02), { ry: (i / 3) * PI * 2 }); // hazard marks
  if (o.twin) {
    k.cyl(r * 0.8, 1.6, W2, 0.55, -1.2, U + 0.05, { seg: 12 });
    k.cyl(r * 0.55, 0.05, neon, 0.55, -2.0, U + 0.05, { seg: 10 });
  }
  k.cyl(0.2, 0.7, W3, 0, -0.5, U + 0.5, { seg: 10 }); // canister
  k.cyl(0.16, 0.5, neon, 0, -0.5, U + 0.5, { seg: 10 });
  return [-2.2, U + 0.05];
}

/**
 * Toxicator (alternate Toxic Gunner): a white hazmat trooper with a toxic launcher and tanks on
 * the back. Lv 1 Toxic Battery: a battery pack. Lv 2 Corroding Toxicants: a gas mask. Lv 3
 * Acidmaw: bigger tanks and hoses. Lv 4 Miniature Nuke: a nuke barrel. Lv 5: twin barrels and a cape.
 */
export function makeToxicator(level) {
  const h = blank();
  const key = `toxicToxicator${level}`;
  const neon = glowMat(h, TOX_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  dome(hd, 0.85, 0.75, W2, 0, 0.85, 0); // hazmat hood
  hd.box(1.3, 0.5, 0.1, 0xccff90, 0, 0.55, 0.72, { r: 0.08 }); // visor
  if (level >= 2) {
    hd.cyl(0.25, 0.3, W3, 0, 0.1, 0.85, { axis: 'z', seg: 10 }); // gas mask filter
    hd.cyl(0.18, 0.05, neon, 0, 0.1, 1.0, { axis: 'z', seg: 10 });
  }
  t.box(2.15, 1.75, 1.15, W, 0, 0.1, 0, { r: 0.14 }); // hazmat suit
  t.box(0.6, 0.6, 0.06, W3, 0, 0.3, 0.6, { r: 0.04 });
  t.ball(0.15, neon, 0, 0.3, 0.64, { seg: 8, rows: 5 }); // hazard light
  t.box(2.18, 0.24, 1.18, W3, 0, -0.84, 0, { r: 0.04 }); // belt
  const big = level >= 3;
  for (const sx of [-1, 1]) {
    t.cyl(big ? 0.42 : 0.34, big ? 1.8 : 1.4, W2, sx * 0.48, 0.2, -0.9, { seg: 12 }); // tanks
    t.cyl(big ? 0.36 : 0.28, 0.8, neon, sx * 0.48, 0.2, -0.9 + (big ? 0.07 : 0.07), { seg: 12 }); // glowing window
  }
  if (big) t.tube([[0.5, -0.6, -0.9], [0.9, -0.9, -0.2], [1.0, -0.6, 0.4]], 0.06, neon, { seg: 8, sides: 6 }); // hose to the gun
  if (level >= 1) t.box(1.0, 0.5, 0.3, W3, 0, -0.5, -1.25, { r: 0.06 }); // battery
  if (level >= 1) t.box(0.7, 0.08, 0.05, neon, 0, -0.5, -1.41);
  if (level >= 4) shoulderPads(t, W2, 0.6);
  if (level >= 5) cape(t, W2, 2.4, { clasp: TOX_NEON });
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => a.box(0.55, 0.12, 0.55, neon, 0, -1.2, 0, { r: 0.04 }));
  feet(h, key, W2, (b) => b.box(1.12, 0.1, 1.14, neon, 0, -1.3, 0.02));
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.25);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = toxLauncher(gk, neon, { nuke: level >= 4, twin: level >= 5 });
  gk.done();
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = TOX_NEON;
  h.projectile = { color: TOX_NEON, size: 0.5, arc: 4 };
  return own(h, UP);
}

// ------------------------------------------------------------------ Revenants (Soul Master summons)

/**
 * A Revenant: a pale ghost knight in tattered white with lavender glow. strong: the Stronger
 * Revenant, in plate with a sword.
 */
function revenant(strong) {
  const h = makeHumanoid({ skin: W3, shirt: W2, pants: W3, arms: W3, face: 'none' });
  const key = strong ? 'revenant2' : 'revenant';
  const neon = glowMat(h, SOUL_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hood(hd, W2);
  hd.box(1.0, 0.12, 0.06, neon, 0, 0.62, 0.72, { r: 0.03 }); // glowing eyes
  t.box(2.0, 1.7, 1.05, W2, 0, 0.1, 0, { r: 0.1 });
  t.slab(2.1, 1.4, 1.1, W3, 0, -1.4, 0, { bw: 1.3 }); // ragged robe
  t.box(0.5, 0.5, 0.06, neon, 0, 0.3, 0.56, { rz: PI / 4 }); // soul mark
  if (strong) {
    shoulderPads(t, W, 0.6);
    t.box(1.6, 1.1, 0.14, W, 0, 0.35, 0.6, { r: 0.08 }); // breastplate
    cape(t, W2, 2.2, { clasp: SOUL_NEON, tatter: true });
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, null);
  feet(h, key, W2, null);
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.1);
  const gk = wear(h, g, `${key}:held`);
  let tipY;
  if (strong) {
    gk.cyl(0.08, 0.5, W3, 0, 0.1, 0, { seg: 8 });
    gk.box(0.7, 0.1, 0.2, neon, 0, -0.2, 0);
    gk.box(0.1, 2.0, 0.24, W, 0, -1.25, 0); // sword
    tipY = -2.3;
  } else {
    gk.ball(0.3, neon, 0, -0.3, 0.2, { seg: 10, rows: 7 }); // a soul orb in the hand
    tipY = -0.3;
  }
  gk.done();
  muzzle(h, g, tipY, 0);
  h.rightArm.rotation.set(-1.2, 0, 0.2);
  h.leftArm.rotation.set(-0.3, 0, -0.2);
  h.tracer = SOUL_NEON;
  return h;
}

/** A unit (makeThing) holding one Revenant. */
function revenantUnit(strong) {
  const u = makeThing();
  u.wheels = [];
  u.soldiers = [];
  const h = revenant(strong);
  h.root.scale.setScalar(0.6 * (strong ? 1.15 : 1));
  u.body.add(h.root);
  u.mats.push(...h.mats);
  u.soldiers.push(h);
  u.muzzles.push(h.muzzles[0]);
  u.height = 3.5;
  u.tracer = SOUL_NEON;
  return u;
}

export const MODELS = {
  archerHunter: makeHunter,
  maceJuggernaut: makeJuggernaut,
  necroSoulMaster: makeSoulMaster,
  toxicToxicator: makeToxicator,
};

export const SUMMONS = {
  revenant: () => revenantUnit(false),
  revenant2: () => revenantUnit(true),
};
