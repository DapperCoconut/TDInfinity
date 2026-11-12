// Tower models: Tower Blitz heroes, batch 1 (rebuilt with the vehicle kit in ../vehicles.js).
// In here: Branch (plant monster), Mako (baby shark -> shark knight), Volt (lamp), Specter (ghost
// guitarist), Discount Dog, Dumpster Child.
// MODELS at the bottom is laid over TOWER_MODELS in ../models.js, so these win over the old
// builders in newmodels/f.js (Branch, Mako, Volt) and newmodels/g.js (the other three).
// Each tower's whole upgrade look is in here, also the part that used to come from blitzup.js
// (Branch's roots, leaf crown and orbit, Specter's notes, scarf and stage ring).
// Moving parts: orbits and rings turn through h.drift (as blitzup's did), Volt's Lv 5 arc crown
// spins (spinner + idleSpin), the Dumpster flame flickers round.

import * as THREE from 'three';
import { glowMat, kit, tone } from '../vehicles.js';
import { gunMuzzle, makeThing, setMuzzle } from './bits.js';
import { makeHumanoid } from './kit.js';
import { GOLD, INK, LEATHER, dome, fist, muzzle, own, wear } from './people1.js';
import { feet, hands } from './people5.js';
import { arc, coil } from './people8.js';
import { seeThrough, spinner } from './machines5.js';

const PI = Math.PI;
const WHITE = 0xfafafa;
const COPPER = 0xb87333;

// ------------------------------------------------------------------ small shared pieces

/** A group on `parent` at (x, y, z). */
function grp(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/** A group that keeps turning round y (and bobs): the views turn everything in `u.drift`. */
function drifter(u, parent, y, speed = 0.8, bob = 0) {
  const g = grp(parent, 0, y, 0);
  g.userData.speed = speed;
  g.userData.bob = bob;
  g.userData.y = y;
  (u.drift ??= []).push(g);
  return g;
}

const _eu = new THREE.Euler();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();

/** Kit rotation for: tip by rx (round x), then turn round y by ry (the kit takes XYZ angles). */
function tip(ry, rx, rz = 0) {
  _q.setFromEuler(_eu.set(rx, ry, rz, 'YXZ'));
  _eu.setFromQuaternion(_q, 'XYZ');
  return { rx: _eu.x, ry: _eu.y, rz: _eu.z };
}

/** Where local point (x, y, z) ends up after tip(ry, rx). */
function tipped(ry, rx, x, y, z) {
  return _v.set(x, y, z).applyEuler(_eu.set(rx, ry, 0, 'YXZ')).clone();
}

/**
 * A leaf (a thin oval) hanging from point p, swung out by `out` round y (0 = toward +z) and
 * tipped by `t` (positive = its far end goes outward and up, negative = outward and down).
 * Returns the leaf's middle and its outward face normal.
 */
function leaf(k, p, out, t, len, w, col, rib) {
  const down = t < 0;
  const o = tip(out, t);
  const c = tipped(out, t, 0, down ? -len / 2 : len / 2, 0).add(p);
  k.ball(0.5, col, c.x, c.y, c.z, { ...o, sx: w, sy: len, sz: 0.16, seg: 10, rows: 7 });
  const n = tipped(out, t, 0, 0, 1);
  if (rib != null) k.box(0.04, len * 0.86, 0.04, rib, c.x + n.x * 0.06, c.y + n.y * 0.06, c.z + n.z * 0.06, o);
  return { c, n };
}

/** A humanoid-shaped rig of empty groups (like newmodels/g.js rig()): creatures build their own shapes on it. */
function rig() {
  const u = makeThing();
  u.static = false;
  u.torso = grp(u.body, 0, 3, 0);
  u.head = grp(u.body, 0, 4, 0);
  u.rightArm = grp(u.body, -1.5, 4, 0);
  u.leftArm = grp(u.body, 1.5, 4, 0);
  u.rightLeg = grp(u.body, -0.5, 2, 0);
  u.leftLeg = grp(u.body, 0.5, 2, 0);
  u.pose = { right: 0, left: 0, leftRecoil: 0 };
  u.muzzles = [];
  return u;
}

/** Both arms' rest rotation and the matching view pose. */
function pose(h, right, left, rz = 0.1, lz = -0.1) {
  h.rightArm.rotation.set(right, 0, rz);
  h.leftArm.rotation.set(left, 0, lz);
  h.pose = { right, left, leftRecoil: 0 };
}

/** A group at the end of an arm; with `upright` (the arm's x rotation) it stays level. */
function hand(arm, y = -1.9, upright = null) {
  const g = grp(arm, 0, y, 0);
  if (upright != null) g.rotation.x = -upright;
  return g;
}

/** A "%" mark on a +z face at (x, y, z), s = its height. */
function percent(k, col, x, y, z, s = 1) {
  for (const d of [-1, 1]) k.torus(0.1 * s, 0.035 * s, col, x + d * 0.24 * s, y - d * 0.24 * s, z, { seg: 12 });
  k.box(0.09 * s, 0.95 * s, 0.05, col, x, y, z, { rz: -0.65 });
}

/** A flat sign board facing +z with a frame, nails and a % mark (centred on x, y, z). */
function saleSign(k, col, x, y, z, w = 1.6, ht = 1.15) {
  k.box(w + 0.12, ht + 0.12, 0.08, 0x5d4037, x, y, z - 0.04, { r: 0.03 });
  k.box(w, ht, 0.1, col, x, y, z, { r: 0.04 });
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) k.ball(0.04, 0x9e9e9e, x + sx * (w / 2 - 0.1), y + sy * (ht / 2 - 0.1), z + 0.06, { seg: 6, rows: 4 });
  percent(k, INK, x, y, z + 0.06, ht * 0.75);
}

// ------------------------------------------------------------------ Branch

/**
 * Branch (0-4): a plant monster with a round pinkish-brown head, a dark-green scarf and a skirt
 * of leaf fronds, spitting seeds from its mouth. Lv 1 more leaves on top and thorns, Lv 2 vine
 * arms with seed pods (extra muzzles) and roots spreading over the ground, Lv 3 flowers, a
 * bark-brown head and a crown of leaves, Lv 4 an ancient glowing tree spirit: bright leaves, a
 * pink bloom, glowing seed pods and leaves circling it.
 */
export function makeBranch(level) {
  const u = makeThing();
  const final = level >= 4;
  const k = kit(u, u.body, `h1:branch${level}`);
  const greens = final ? [0x1b5e20, 0x00a152, 0x00c853] : [0x2e7d32, 0x388e3c, 0x43a047];
  const RIB = 0x1b5e20;
  const pod = final ? glowMat(u, 0xc6ff00) : 0x827717;
  // A patch of dark soil with pebbles
  k.cyl(1.7, 0.16, 0x4e3b2a, 0, 0.08, 0, { r2: 1.5, seg: 20 });
  for (const [x, z] of [[1.3, 0.9], [-1.4, 0.6], [0.6, -1.4], [-0.8, -1.3]]) k.ball(0.12, 0x9e9e9e, x, 0.17, z, { sy: 0.6, seg: 7, rows: 5 });
  if (level >= 2) {
    // Roots creeping out over the ground
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2 + 0.5;
      const c = Math.cos(a);
      const s = Math.sin(a);
      k.tube([[c * 0.9, 0.35, s * 0.9], [c * 1.6, 0.18, s * 1.6], [c * 2.2, 0.1, s * 2.2 + 0.1], [c * 2.7, 0.05, s * 2.7]], 0.13, 0x5d4037, { seg: 10, sides: 6 });
      k.ball(0.1, 0x6d4c41, c * 2.7, 0.05, s * 2.7, { seg: 6, rows: 4 });
      k.tube([[c * 2.0, 0.12, s * 2.0], [c * 2.3 - s * 0.35, 0.05, s * 2.3 + c * 0.35]], 0.06, 0x5d4037, { seg: 3, sides: 5 }); // side rootlet
    }
  }
  // Dark core with three rings of hanging fronds
  k.cyl(0.95, 3.0, 0x1b5e20, 0, 1.6, 0, { r2: 0.7, seg: 16 });
  const rings = [[1.5, 1.0, 10, 0.45], [2.4, 0.9, 9, 0.4], [3.2, 0.75, 8, 0.35]];
  const blooms = [];
  rings.forEach(([y, r, n, t], ri) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2 + ri * 0.3;
      const p = new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r);
      const { c, n: nn } = leaf(k, p, a, -t, 1.6, 0.6, greens[(i + ri) % 3], RIB);
      if (level >= 1 && i % 2 === 0) {
        // a thorn sticking out of the frond
        const o = tip(a, -t + PI / 2);
        k.cyl(0.07, 0.3, 0xbcaaa4, c.x + nn.x * 0.2, c.y + nn.y * 0.2 - 0.2, c.z + nn.z * 0.2, { ...o, r2: 0, seg: 6 });
      }
      if (i % 3 === 0) blooms.push({ a, t, c, n: nn });
    }
  });
  if (level >= 3) {
    // Flowers bloom on the fronds
    for (const { a, t, c, n } of blooms) {
      const o = tip(a, -t);
      const f = c.clone().addScaledVector(n, 0.12);
      for (let j = 0; j < 5; j++) {
        const pa = (j / 5) * PI * 2;
        const d = tipped(a, -t, Math.cos(pa) * 0.17, Math.sin(pa) * 0.17, 0);
        k.ball(0.13, 0xf06292, f.x + d.x, f.y + d.y, f.z + d.z, { ...o, sz: 0.4, seg: 7, rows: 5 });
      }
      k.ball(0.09, 0xffeb3b, f.x + n.x * 0.05, f.y + n.y * 0.05, f.z + n.z * 0.05, { seg: 7, rows: 5 });
    }
  }
  // Thick scarf with a knot and a hanging end
  const SCARF = 0x1b5e20;
  k.torus(1.0, 0.3, SCARF, 0, 3.25, 0, { rx: PI / 2, seg: 22 });
  k.torus(1.02, 0.06, tone(SCARF, 0.75), 0, 3.25, 0, { rx: PI / 2, seg: 22 });
  k.ball(0.26, SCARF, 0.55, 3.18, 0.9, { seg: 10, rows: 7 });
  k.box(0.44, 1.1, 0.14, SCARF, 0.64, 2.55, 1.05, { rz: 0.15, rx: 0.15, r: 0.06 });
  for (let i = 0; i < 4; i++) k.box(0.06, 0.18, 0.06, tone(SCARF, 0.75), 0.5 + i * 0.1, 1.95 + i * 0.015, 1.13, { rz: 0.15 });
  // Round head: pinkish brown, bark brown from Lv 3
  const hy = 4.1;
  const HEAD = level >= 3 ? 0x6d4c41 : 0x7b4a52;
  k.ball(1.0, HEAD, 0, hy, 0, { sy: 0.9, sz: 0.92, seg: 20, rows: 14 });
  if (level >= 3) {
    // bark grooves round the sides and back
    for (const a of [1.15, 1.7, 2.3, 2.85, 3.45, 4.0, 4.6, 5.1]) k.box(0.07, 0.95, 0.05, tone(HEAD, 0.7), Math.sin(a) * 0.97, hy - 0.05 + Math.sin(a * 3) * 0.1, Math.cos(a) * 0.9, { ry: a });
  }
  for (const sx of [-1, 1]) {
    k.ball(0.14, INK, sx * 0.4, hy + 0.25, 0.78, { sy: 1.35, sz: 0.5, seg: 10, rows: 7 });
    k.ball(0.05, 0xffffff, sx * 0.4 + 0.05, hy + 0.33, 0.85, { seg: 6, rows: 4 });
    k.ball(0.13, 0xd88a96, sx * 0.62, hy - 0.05, 0.66, { sz: 0.4, seg: 8, rows: 5 }); // cheeks
  }
  k.ball(0.3, 0x3e1f24, 0, hy - 0.3, 0.79, { sy: 0.7, sz: 0.4, seg: 12, rows: 8 }); // mouth
  k.torus(0.3, 0.05, 0x9c6470, 0, hy - 0.3, 0.84, { sy: 0.7, seg: 16 }); // lips
  // Leaves on top (more from Lv 1)
  k.cyl(0.08, 0.5, 0x33691e, 0, hy + 0.95, 0, { r2: 0.06, seg: 6 });
  const tops = level >= 1 ? 4 : 2;
  for (let i = 0; i < tops; i++) leaf(k, new THREE.Vector3(0, hy + 1.15, 0), (i / tops) * PI * 2 + 0.4, 0.95, 1.1, 0.55, 0x66bb6a, 0x33691e);
  if (level >= 3) {
    // A crown of leaves round the top of the head (glowing at Lv 4)
    const crown = final ? glowMat(u, 0x00e676) : 0x2e7d32;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * PI * 2;
      leaf(k, new THREE.Vector3(Math.sin(a) * 0.62, hy + 0.62, Math.cos(a) * 0.58), a, 0.45, 0.95, 0.38, crown, final ? null : 0x1b5e20);
    }
  }
  if (final) {
    // A pink bloom inside the crown and glowing seed pods round the skirt
    const bloom = glowMat(u, 0xff80ab, 0.45);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2 + 0.2;
      leaf(k, new THREE.Vector3(Math.sin(a) * 0.25, hy + 0.85, Math.cos(a) * 0.25), a, 1.0, 0.8, 0.5, bloom);
    }
    k.ball(0.3, glowMat(u, 0xffeb3b), 0, hy + 1.0, 0, { sy: 0.6, seg: 10, rows: 7 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      k.ball(0.2, pod, Math.cos(a) * 1.6, 0.4, Math.sin(a) * 1.6, { sy: 1.2, seg: 8, rows: 6 });
    }
  }
  // Muzzles: the mouth first, then the pods on the vine arms
  gunMuzzle(u, u.body, 0, hy - 0.3, 1.2);
  if (level >= 2) {
    const vine = 0x558b2f;
    for (const s of [-1, 1]) {
      k.tube([[s * 0.85, 2.9, 0.3], [s * 1.35, 3.0, 0.9], [s * 1.62, 3.4, 1.6], [s * 1.6, 3.75, 2.2]], 0.16, vine, { seg: 16, sides: 7 });
      for (const [f, a] of [[0.35, 0.6], [0.7, -0.5]]) {
        const p = new THREE.Vector3(s * (0.85 + f * 0.8), 2.95 + f * 0.6, 0.3 + f * 1.8);
        leaf(k, p, s * PI * 0.5 + a, 0.7, 0.55, 0.3, 0x689f38);
      }
      k.tube([[s * 1.4, 3.1, 1.2], [s * 1.75, 3.35, 1.15], [s * 1.8, 3.6, 1.35], [s * 1.65, 3.55, 1.45]], 0.04, vine, { seg: 10, sides: 4 }); // curly tendril
      // The seed pod, in a cup of husk leaves
      k.ball(0.33, pod, s * 1.6, 3.98, 2.45, { sy: 1.15, sz: 1.05, seg: 12, rows: 9 });
      for (let j = 0; j < 4; j++) {
        const a = (j / 4) * PI * 2;
        k.ball(0.16, 0x33691e, s * 1.6 + Math.cos(a) * 0.22, 3.72, 2.3 + Math.sin(a) * 0.22, { sy: 1.6, sz: 0.5, ry: a, seg: 6, rows: 4 });
      }
      k.ball(0.1, 0x33241a, s * 1.6, 4.0, 2.78, { sz: 0.4, seg: 8, rows: 5 });
      gunMuzzle(u, u.body, s * 1.6, 4.0, 2.85);
    }
  }
  k.done();
  if (final) {
    // Glowing leaves circling the tree spirit
    const ring = drifter(u, u.root, 2.8, 0.7, 0.25);
    const ok = kit(u, ring, 'h1:branchOrbit');
    const cols = [0x69f0ae, 0xb9f6ca, 0xc6ff00].map((c) => glowMat(u, c));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      ok.ball(0.3, cols[i % 3], Math.cos(a) * 2.5, (i % 2) * 0.3, Math.sin(a) * 2.5, { sx: 0.5, sz: 0.15, ...tip(-a, 0.6, 0.4), seg: 8, rows: 5 });
    }
    ok.done();
    u.body.scale.setScalar(1.15);
  }
  u.tracer = 0x9ccc65;
  u.projectile = { color: final ? 0xc6ff00 : 0x827717, size: 0.4, glowing: final };
  return u;
}

// ------------------------------------------------------------------ Mako

const SHARK = 0x78909c;
const BELLY = 0xeceff1;

/** A shark's dorsal fin (a swept triangle) standing on (x, y, z). */
function fin(k, col, x, y, z, s = 1) {
  k.prism([[0.4 * s, 0], [-0.45 * s, 0], [-0.55 * s, 0.85 * s], [-0.35 * s, 0.75 * s]], 0.16 * s, col, x, y, z, { bevel: 0.04 });
}

/** A shark's upturned tail fin, its root at (x, y, z), pointing back (-z). */
function tailFin(k, col, x, y, z, s = 1) {
  k.prism([[0.1 * s, 0], [-0.55 * s, 0.75 * s], [-0.35 * s, 0.05 * s], [-0.5 * s, -0.45 * s]], 0.14 * s, col, x, y, z, { bevel: 0.03 });
}

/** The happy baby shark (about 1.5 tall, its middle at y + 0.7), with a dented pot for a helmet. */
function babyShark(k, y, pot) {
  k.ball(0.75, SHARK, 0, y + 0.7, 0, { sz: 1.08, seg: 18, rows: 12 });
  k.ball(0.6, BELLY, 0, y + 0.5, 0.36, { sy: 0.7, sz: 0.8, seg: 14, rows: 9 });
  for (const sx of [-1, 1]) {
    k.ball(0.11, INK, sx * 0.36, y + 0.95, 0.66, { sy: 1.25, sz: 0.6, seg: 8, rows: 6 });
    k.ball(0.04, 0xffffff, sx * 0.36 + 0.04, y + 1.02, 0.72, { seg: 5, rows: 4 });
    k.ball(0.09, 0xff8a80, sx * 0.55, y + 0.72, 0.62, { sz: 0.4, seg: 6, rows: 4 });
    k.ball(0.3, SHARK, sx * 0.72, y + 0.35, 0.15, { sx: 1.4, sy: 0.3, sz: 0.8, rz: sx * 0.5, seg: 8, rows: 5 }); // side fins
  }
  k.torus(0.2, 0.035, 0x37474f, 0, y + 0.72, 0.72, { arc: PI, rz: PI, seg: 10 }); // smile
  for (let i = 0; i < 3; i++) k.box(0.04, 0.22, 0.05, 0x546e7a, 0.66 - i * 0.04, y + 0.75, 0.25 - i * 0.12, { ry: 1.3 }); // gills
  fin(k, SHARK, 0, y + 1.3, pot ? -0.35 : -0.15, 0.85);
  tailFin(k, SHARK, 0, y + 0.85, -0.85, 1.1);
  if (pot) {
    // A dented cooking pot worn as a helmet, its handle sticking out
    const POT = 0x9e9e9e;
    k.cyl(0.66, 0.5, POT, 0.05, y + 1.5, 0.05, { r2: 0.62, seg: 18, rz: 0.12 });
    k.torus(0.67, 0.05, 0x757575, 0.08, y + 1.26, 0.05, { rx: PI / 2, rz: 0.12, seg: 18 });
    k.cyl(0.6, 0.05, 0xbdbdbd, 0.02, y + 1.76, 0.05, { seg: 18, rz: 0.12 });
    k.box(0.55, 0.12, 0.2, 0x424242, 0.92, y + 1.62, 0.05, { rz: 0.12, r: 0.04 }); // handle
    k.ball(0.18, 0xbdbdbd, -0.3, y + 1.55, 0.66, { sz: 0.3, rz: 0.5, seg: 8, rows: 5 }); // dent
  }
}

/**
 * Mako (0-4): a shark that grows into a knight (melee, slow huge splash hits). Lv 0 a happy baby
 * shark in a metal bucket, Lv 1 the bucket on legs and a dented pot helmet (both non-humanoid),
 * Lv 2 a small shark knight in leather with a helmet and short sword, Lv 3 steel armour, a kite
 * shield and a longer sword, Lv 4 a big dark-steel knight with a cape, a greatsword with a glowing
 * core, a glowing visor and splashes circling him.
 */
export function makeMako(level) {
  if (level <= 1) return makeBucketShark(level);
  const armored = level >= 3;
  const big = level >= 4;
  const plate = big ? 0x546e7a : armored ? 0x90a4ae : 0x8d6e63;
  const h = makeHumanoid({ skin: SHARK, shirt: plate, pants: 0x455a64, arms: armored ? plate : SHARK, face: 'smile' });
  const key = `h1:mako${level}`;
  h.body.scale.setScalar([0, 0, 0.85, 1.0, 1.15][level]);
  const steel = big ? 0x607d8b : 0xb0bec5;
  const trim = big ? GOLD : armored ? 0x78909c : 0x5d4037;
  const visor = glowMat(h, 0x18ffff);
  // Shark head round the normal head: snout, white jaw, teeth, gills, a helmet and a fin through it
  const hd = wear(h, h.head, `${key}:head`);
  hd.ball(0.86, SHARK, 0, 0.62, 0.1, { sx: 0.95, sy: 0.85, sz: 1.05, seg: 18, rows: 12 });
  hd.ball(0.5, SHARK, 0, 0.6, 0.72, { sx: 1.15, sy: 0.65, sz: 0.75, seg: 14, rows: 9 });
  hd.ball(0.55, BELLY, 0, 0.3, 0.58, { sx: 1.15, sy: 0.45, sz: 0.85, seg: 14, rows: 9 });
  for (let i = -2; i <= 2; i++) hd.cyl(0, 0.14, 0xffffff, i * 0.13, 0.4 - Math.abs(i) * 0.02, 1.06 - i * i * 0.05, { r2: 0.05, seg: 5 }); // teeth
  for (const sx of [-1, 1]) {
    hd.ball(0.12, INK, sx * 0.48, 0.86, 0.74, { sy: 1.2, sz: 0.5, seg: 8, rows: 6 });
    hd.ball(0.04, 0xffffff, sx * 0.48 + 0.04, 0.93, 0.8, { seg: 5, rows: 4 });
    for (let i = 0; i < 3; i++) hd.box(0.05, 0.3, 0.05, 0x546e7a, sx * 0.8, 0.5, 0.0 - i * 0.16, { ry: sx * 0.2 }); // gills
  }
  const HELM = big ? 0x37474f : 0xb0bec5;
  dome(hd, 0.92, 0.6, HELM, 0, 0.98, 0.08);
  hd.torus(0.92, 0.06, tone(HELM, 0.8), 0, 0.98, 0.08, { rx: PI / 2, seg: 22 });
  for (const sx of [-1, 1]) hd.box(0.12, 0.6, 0.85, HELM, sx * 0.86, 0.78, 0.15, { r: 0.04, rz: sx * 0.08 }); // cheek guards
  hd.box(0.14, 0.42, 0.1, tone(HELM, 0.85), 0, 1.0, 0.96, { r: 0.03 }); // nasal guard
  if (armored) for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI * 2;
    hd.ball(0.045, trim, Math.sin(a) * 0.93, 1.03, 0.08 + Math.cos(a) * 0.93, { seg: 5, rows: 4 }); // rivets
  }
  if (big) {
    hd.box(1.3, 0.13, 0.08, visor, 0, 1.0, 0.92, { r: 0.03 });
    hd.torus(0.93, 0.04, GOLD, 0, 1.12, 0.08, { rx: PI / 2, seg: 22 });
  }
  fin(hd, SHARK, 0, 1.45, -0.05, 1);
  hd.done();
  // Torso: tail out the back, and leather (Lv 2) or steel plate (Lv 3+)
  const t = wear(h, h.torso, `${key}:torso`);
  t.cyl(0.38, 1.1, SHARK, 0, -0.75, -0.95, { r2: 0.14, rx: -1.25, seg: 12 });
  tailFin(t, SHARK, 0, -0.5, -1.45, 1.2);
  if (armored) {
    t.box(2.2, 1.6, 1.2, steel, 0, 0.1, 0, { r: 0.18 });
    t.slab(0.2, 1.4, 0.12, tone(steel, 1.1), 0, 0.15, 0.6, { tw: 1, bw: 0.6 }); // ridge
    t.prism([[0.0, 0], [-0.25, 0], [-0.55, 0.55], [-0.15, 0.45]], 0.06, BELLY, -0.28, -0.25, 0.63, { ry: -PI / 2 }); // fin emblem
    t.box(2.26, 0.12, 1.26, trim, 0, 0.88, 0, { r: 0.04 });
    for (let i = 0; i < 2; i++) t.box(2.24 - i * 0.04, 0.32, 1.24 - i * 0.04, tone(steel, 0.9 - i * 0.08), 0, -0.82 - i * 0.28, 0, { r: 0.06 }); // faulds
    t.box(2.28, 0.18, 1.28, LEATHER, 0, -0.68, 0, { r: 0.04 });
    t.box(0.3, 0.24, 0.08, GOLD, 0, -0.68, 0.65, { r: 0.03 });
  } else {
    t.box(2.12, 1.7, 1.12, 0x6d4c41, 0, 0.05, 0, { r: 0.15 }); // leather jerkin
    for (let i = 0; i < 4; i++) t.box(0.06, 0.04, 0.05, 0x3e2723, 0, 0.6 - i * 0.3, 0.57, { r: 0.01 }); // laces
    t.box(2.18, 0.26, 1.18, 0x5d4037, 0, -0.8, 0, { r: 0.04 });
    t.box(0.28, 0.22, 0.08, 0xbdbdbd, 0, -0.8, 0.6, { r: 0.03 });
    t.box(0.18, 2.3, 0.08, 0x4e342e, 0.1, 0.05, 0.6, { rz: 0.7 }); // sword belt across the chest
    t.box(0.4, 0.35, 0.22, 0x795548, -0.7, -0.6, 0.62, { r: 0.05 }); // pouch
  }
  if (big) {
    // A blue cape with a gold hem and clasps
    t.slab(2.3, 3.4, 0.1, 0x0d47a1, 0, -0.6, -0.68, { tw: 0.9, bw: 1.15 });
    t.box(2.62, 0.14, 0.12, GOLD, 0, -2.25, -0.68);
    for (const sx of [-1, 1]) t.ball(0.14, GOLD, sx * 0.9, 0.85, 0.5, { seg: 8, rows: 6 });
  }
  t.done();
  // Arms: gauntlets, pauldrons from Lv 3, and the shield on the left arm
  const glov = armored ? steel : 0x4e342e;
  hands(h, key, glov, armored ? tone(steel, 0.8) : 0x6d4c41, (a, s) => {
    if (armored) {
      a.ball(0.7, steel, s * 0.08, -0.15, 0, { sy: 0.6, seg: 14, rows: 8 });
      a.torus(0.66, 0.05, trim, s * 0.08, -0.35, 0, { rx: PI / 2, seg: 16 });
      for (let i = 0; i < 2; i++) a.box(1.08, 0.12, 1.08, tone(steel, 0.85), 0, -1.0 - i * 0.22, 0, { r: 0.03 });
    } else a.box(1.06, 0.3, 1.06, 0x6d4c41, 0, -0.25, 0, { r: 0.06 });
    if (armored && s === 1) {
      // Kite shield on the outer side of the left arm
      const sh = big ? 1.2 : 1.0;
      a.prism([[-0.9 * sh, 0.9 * sh], [0.9 * sh, 0.9 * sh], [0.9 * sh, 0], [0, -1.15 * sh], [-0.9 * sh, 0]], 0.2, 0x1565c0, 0.64, -1.3, 0, { bevel: 0.05 });
      a.tube([[0.75, -1.3 + 0.9 * sh, -0.9 * sh], [0.75, -1.3 + 0.9 * sh, 0.9 * sh], [0.75, -1.3, 0.9 * sh], [0.75, -1.3 - 1.15 * sh, 0], [0.75, -1.3, -0.9 * sh], [0.75, -1.3 + 0.9 * sh, -0.9 * sh]], 0.05, big ? GOLD : steel, { tension: 0, seg: 30, sides: 5 });
      a.prism([[0.25, 0], [-0.3, 0], [-0.4, 0.6], [-0.15, 0.55]], 0.06, BELLY, 0.77, -1.2, 0.05);
      a.ball(0.12, big ? GOLD : steel, 0.78, -1.0, 0, { sx: 0.5, seg: 8, rows: 6 }); // boss
    }
  });
  feet(h, key, 0x37474f, (b) => {
    if (!armored) return;
    b.box(0.95, 0.75, 0.2, steel, 0, -1.15, 0.5, { r: 0.06 });
    b.ball(0.22, tone(steel, 0.9), 0, -0.82, 0.58, { sx: 1.6, sz: 0.45, seg: 10, rows: 6 });
  });
  // Sword: short (Lv 2), longer (Lv 3), a greatsword with a glowing core (Lv 4)
  const len = [0, 0, 1.6, 2.2, 3.4][level];
  const wide = big ? 0.7 : 0.45;
  const g = fist(h.rightArm, -1.9, 1);
  const sk = wear(h, g, `${key}:sword`);
  const guard = big ? GOLD : armored ? 0x78909c : 0x8d6e63;
  sk.ball(0.13, guard, 0, 0.32, 0, { seg: 8, rows: 6 }); // pommel
  sk.cyl(0.09, 0.7, 0x3e2723, 0, -0.1, 0, { seg: 8 });
  for (let i = 0; i < 4; i++) sk.torus(0.095, 0.025, LEATHER, 0, 0.12 - i * 0.15, 0, { rx: PI / 2, seg: 8 });
  sk.box(0.26, 0.16, big ? 1.3 : 0.85, guard, 0, -0.52, 0, { r: 0.05 });
  for (const sz of [-1, 1]) sk.ball(0.1, guard, 0, -0.52, sz * (big ? 0.68 : 0.45), { seg: 8, rows: 6 });
  const BLADE = 0xe0e0e0;
  const bl = len * 0.86;
  sk.slab(0.12, bl, wide, BLADE, 0, -0.6 - bl / 2, 0, { bd: 0.85 });
  sk.box(0.14, bl * 0.8, 0.06, tone(BLADE, 0.8), 0, -0.6 - bl * 0.45, 0);
  sk.cyl(0, len - bl, BLADE, 0, -0.6 - bl - (len - bl) / 2, 0, { r2: (wide * 0.85) / 2, seg: 4, sx: 0.06 / ((wide * 0.85) / 2) });
  if (big) sk.box(0.15, bl * 0.8, 0.12, glowMat(h, 0x18ffff), 0, -0.6 - bl * 0.45, 0);
  sk.done();
  h.muzzles = [];
  muzzle(h, g, -0.6 - len, 0);
  // Melee pose: sword raised over the shoulder, a swing brings it down in front
  const right = big ? -2.7 : -2.5;
  const left = armored ? -0.9 : -0.6;
  h.rightArm.rotation.set(right, 0, 0.2);
  h.leftArm.rotation.set(left, 0, -0.2);
  h.pose = { right, left, leftRecoil: 0 };
  h.swing = 2.2;
  h.melee = true;
  if (big) {
    // Water splashes circling the Great Shark
    const ring = drifter(h, h.root, 0.5, 0.9, 0.2);
    const wk = kit(h, ring, 'h1:makoSplash');
    const drop = glowMat(h, 0x80d8ff, 0.6);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * PI * 2;
      wk.ball(0.22, drop, Math.cos(a) * 2.5, (i % 2) * 0.35, Math.sin(a) * 2.5, { sy: 1.4, seg: 8, rows: 6 });
    }
    wk.done();
  }
  h.tracer = big ? 0x18ffff : 0x80d8ff;
  return own(h, 0);
}

/** Mako Lv 0-1: the baby shark in a metal bucket (on stubby robot legs from Lv 1). */
function makeBucketShark(level) {
  const u = makeThing();
  const k = kit(u, u.body, `h1:mako${level}`);
  const lift = level >= 1 ? 1.0 : 0;
  const METAL = 0x455a64;
  if (lift) {
    for (const x of [-0.55, 0.55]) {
      k.cyl(0.24, 0.9, 0x37474f, x, 0.75, 0, { seg: 10 });
      k.ball(0.27, 0x546e7a, x, 0.6, 0, { seg: 10, rows: 7 }); // knee
      k.box(0.7, 0.32, 0.95, 0x212121, x, 0.18, 0.12, { r: 0.1 });
      k.box(0.74, 0.08, 1.0, INK, x, 0.03, 0.12);
    }
    k.box(1.6, 0.25, 0.7, 0x37474f, 0, 1.08, 0, { r: 0.08 }); // hip bar
  }
  // The bucket: tapered, with hoops, rivets, water inside and a handle tipped back
  k.cyl(1.0, 1.8, METAL, 0, lift + 0.9, 0, { r2: 1.15, seg: 24 });
  k.cyl(1.02, 0.08, 0x37474f, 0, lift + 0.04, 0, { seg: 24 });
  for (const [y, r] of [[0.4, 1.04], [1.4, 1.12]]) {
    k.torus(r, 0.05, 0x37474f, 0, lift + y, 0, { rx: PI / 2, seg: 24 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2 + 0.2;
      k.ball(0.04, 0x90a4ae, Math.sin(a) * (r + 0.04), lift + y, Math.cos(a) * (r + 0.04), { seg: 5, rows: 4 });
    }
  }
  k.torus(1.15, 0.07, 0x37474f, 0, lift + 1.8, 0, { rx: PI / 2, seg: 24 });
  k.cyl(1.08, 0.04, 0x4fc3f7, 0, lift + 1.6, 0, { seg: 24 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    k.torus(0.12, 0.025, 0xb3e5fc, Math.cos(a) * 0.95, lift + 1.63, Math.sin(a) * 0.95, { rx: PI / 2, seg: 8 }); // ripples
  }
  if (level >= 1) k.ball(0.25, 0x78909c, -0.85, lift + 0.7, 0.55, { sz: 0.25, ry: -0.6, seg: 8, rows: 5 }); // dent
  for (const sx of [-1, 1]) k.box(0.12, 0.25, 0.2, 0x263238, sx * 1.15, lift + 1.7, 0, { r: 0.03 }); // handle lugs
  k.torus(1.17, 0.05, 0x263238, 0, lift + 1.72, 0, { arc: PI, rx: -0.55, seg: 18 });
  babyShark(k, lift + 1.2, level >= 1);
  k.done();
  gunMuzzle(u, u.body, 0, lift + 1.9, 1.6);
  u.melee = true;
  u.tracer = 0x80d8ff;
  return u;
}

// ------------------------------------------------------------------ Volt

/** A small tesla coil standing on y0: post, copper windings, a top ring and a glowing tip. */
function teslaCoil(k, x, y0, z, hgt, spark) {
  k.cyl(0.26, 0.1, INK, x, y0 + 0.05, z, { seg: 12 });
  k.cyl(0.12, hgt, 0x616161, x, y0 + hgt / 2, z, { seg: 8 });
  coil(k, x, y0 + hgt * 0.5, z, 0.3, hgt * 0.65, Math.max(3, Math.round(hgt / 0.2)), 0x616161);
  k.torus(0.2, 0.05, 0x9e9e9e, x, y0 + hgt, z, { rx: PI / 2, seg: 12 });
  k.ball(0.2, spark, x, y0 + hgt + 0.15, z, { seg: 10, rows: 7 });
}

/**
 * Volt (0-4): a lit-up light bulb with a hollow-eyed face in a dark lamp base, a screw plate on
 * the front and a brown cord to a plug. Lv 1 a bigger bulb, copper windings and a small coil,
 * Lv 2 two tall coils with arcs to the bulb, Lv 3 a brighter bulb and a ring of coils linked by
 * arcs, Lv 4 a heavy bolted plinth and a crown of arcs over the bulb (spins, fast when it zaps).
 */
export function makeVolt(level) {
  const u = makeThing();
  const heavy = level >= 4;
  const k = kit(u, u.body, `h1:volt${level}`);
  const spark = glowMat(u, 0x80d8ff);
  const arcM = glowMat(u, 0xe1f5fe);
  let by = 0;
  if (heavy) {
    // Heavy plinth: bolts, hazard stripes and warning lamps
    k.box(3.6, 0.6, 3.2, 0x263238, 0, 0.3, 0, { r: 0.12 });
    k.slab(3.3, 0.08, 2.9, 0x37474f, 0, 0.62, 0, { tw: 0.97, td: 0.97 });
    for (const [x, z] of [[-1.6, 1.4], [1.6, 1.4], [-1.6, -1.4], [1.6, -1.4]]) {
      k.cyl(0.17, 0.12, 0x9e9e9e, x, 0.66, z, { seg: 6 });
      k.cyl(0.08, 0.06, 0x616161, x, 0.74, z, { seg: 6 });
    }
    for (let i = 0; i < 9; i++) k.box(0.18, 0.4, 0.04, i % 2 ? INK : 0xfdd835, -1.2 + i * 0.3, 0.3, 1.61, { rz: 0.6 });
    for (const sx of [-1, 1]) {
      k.cyl(0.14, 0.12, INK, sx * 1.6, 0.7, 0.4, { seg: 10 });
      k.ball(0.12, glowMat(u, 0xffab00), sx * 1.6, 0.8, 0.4, { sy: 0.8, seg: 8, rows: 6 });
    }
    by = 0.6;
  }
  const bw = heavy ? 2.8 : 2.2;
  const bh = heavy ? 1.8 : 1.4;
  const bd = heavy ? 2.3 : 1.8;
  // Lamp base: rounded body, a top cap, rubber feet, side vents
  k.box(bw, bh, bd, 0x424242, 0, by + bh / 2, 0, { r: 0.18 });
  k.slab(bw + 0.1, 0.22, bd + 0.1, 0x212121, 0, by + bh + 0.06, 0, { tw: 0.88, td: 0.88 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.cyl(0.18, 0.1, INK, sx * (bw / 2 - 0.3), by + 0.04, sz * (bd / 2 - 0.3), { seg: 10 });
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) k.box(0.04, 0.08, bd * 0.5, INK, sx * (bw / 2 + 0.005), by + bh * 0.4 + i * 0.2, 0);
  // Screw plate with a toggle switch
  const pz = bd / 2;
  k.box(1.0, 0.9, 0.08, 0x9e9e9e, 0, by + bh / 2, pz + 0.03, { r: 0.04 });
  for (const [x, y] of [[-0.35, 0.3], [0.35, 0.3], [-0.35, -0.3], [0.35, -0.3]]) {
    k.cyl(0.07, 0.05, 0x616161, x, by + bh / 2 + y, pz + 0.09, { axis: 'z', seg: 10 });
    k.box(0.12, 0.025, 0.02, INK, x, by + bh / 2 + y, pz + 0.12, { rz: 0.6 });
  }
  k.box(0.22, 0.32, 0.06, 0x616161, 0, by + bh / 2, pz + 0.09, { r: 0.02 });
  k.box(0.08, 0.22, 0.08, 0xeeeeee, 0, by + bh / 2 + 0.08, pz + 0.14, { rx: 0.5, r: 0.02 });
  // Cord out the back to a plug on the ground
  const cz = -bd / 2;
  k.cyl(0.14, 0.2, INK, 0, by + 0.5, cz - 0.08, { axis: 'z', seg: 8 });
  k.tube([[0, by + 0.5, cz - 0.1], [0, by + 0.45, cz - 0.5], [0.1, 0.15, cz - 0.85], [0.3, 0.1, cz - 1.4], [0.55, 0.12, cz - 1.8]], 0.1, 0x5d4037, { seg: 20, sides: 6 });
  k.box(0.4, 0.3, 0.45, 0x212121, 0.62, 0.17, cz - 2.0, { r: 0.05, ry: 0.3 });
  for (const sx of [-1, 1]) k.box(0.05, 0.14, 0.25, 0xbdbdbd, 0.62 + sx * 0.1 - 0.08, 0.17, cz - 2.3, { ry: 0.3 });
  // Socket: a ribbed metal collar (copper windings from Lv 1)
  const sy = by + bh + 0.17;
  k.cyl(0.55, 0.75, 0xbdbdbd, 0, sy + 0.37, 0, { r2: 0.5, seg: 18 });
  for (let i = 0; i < 4; i++) k.torus(0.54 - i * 0.012, 0.035, 0x9e9e9e, 0, sy + 0.1 + i * 0.17, 0, { rx: PI / 2, seg: 18 });
  if (level >= 1) for (let i = 0; i < 2; i++) k.torus(0.6, 0.06, COPPER, 0, sy + 0.22 + i * 0.24, 0, { rx: PI / 2, seg: 18 });
  // Coils
  if (level === 1) teslaCoil(k, bw / 2 + 0.35, 0, 0.4, 1.4, spark);
  const s = [1, 1.2, 1.25, 1.3, 1.4][level];
  const bulbY = sy + 0.72;
  if (level >= 2) {
    for (const sx of [-1, 1]) {
      const x = sx * (bw / 2 + 0.35);
      teslaCoil(k, x, by, 0, 2.8, spark);
      arc(k, [x, by + 2.95, 0], [sx * 1.15 * s, bulbY + 1.3 * s, 0.1], arcM, 0.15, sx + 3);
    }
  }
  if (level >= 3) {
    const tips = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2 + PI / 6;
      const x = Math.cos(a) * (heavy ? 1.95 : 1.9);
      const z = Math.sin(a) * (heavy ? 1.6 : 1.9);
      teslaCoil(k, x, by, z, 1.3, spark);
      tips.push([x, by + 1.45, z]);
    }
    for (let i = 0; i < 6; i++) arc(k, tips[i], tips[(i + 1) % 6], arcM, 0.14, i + 1);
  }
  k.done();
  // The bulb: a glowing globe with a hollow-eyed face, bigger every level
  const bulb = grp(u.body, 0, bulbY, 0);
  bulb.scale.setScalar(s);
  const glass = glowMat(u, level >= 3 ? 0xfff59d : 0xffee58, level >= 3 ? 1.15 : 0.8);
  const b = kit(u, bulb, 'h1:voltBulb');
  b.cyl(0.48, 0.62, glass, 0, 0.31, 0, { r2: 0.78, seg: 20 });
  b.ball(1.05, glass, 0, 1.55, 0, { sy: 1.08, seg: 24, rows: 16 });
  b.ball(0.14, glass, 0, 2.7, 0, { seg: 8, rows: 6 });
  const HOLE = 0x3e2723;
  for (const sx of [-1, 1]) b.ball(0.2, HOLE, sx * 0.4, 1.75, 0.92, { sy: 1.3, sz: 0.4, seg: 12, rows: 8 });
  b.ball(0.2, HOLE, 0, 1.15, 0.94, { sx: 1.3, sy: 0.45, sz: 0.4, seg: 12, rows: 8 });
  b.ball(0.18, glowMat(u, 0xffffff, 0.5), -0.55, 2.1, 0.72, { sx: 0.6, sy: 1.3, sz: 0.4, rz: 0.4, seg: 8, rows: 6 }); // shine
  b.done();
  const top = bulbY + 2.75 * s;
  gunMuzzle(u, u.body, 0, top + 0.1, 0);
  if (heavy) {
    // Crown of crackling arcs over the bulb
    const crown = spinner(u, u.body, 0, top - 0.6, 0);
    const c = kit(u, crown, 'h1:voltCrown');
    c.torus(1.15, 0.06, arcM, 0, 0, 0, { rx: PI / 2, seg: 24 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      const x = Math.cos(a);
      const z = Math.sin(a);
      arc(c, [x * 1.15, 0, z * 1.15], [x * 0.75, 1.4, z * 0.75], arcM, 0.2, i + 2);
      c.ball(0.13, spark, x * 0.75, 1.45, z * 0.75, { seg: 8, rows: 6 });
    }
    c.done();
    u.idleSpin = 1.0;
  }
  u.tracer = level >= 3 ? 0xfff9c4 : 0xffee58;
  return u;
}

// ------------------------------------------------------------------ Specter

/** An amp cabinet facing +z, its bottom middle at (x, y, z): grille, speaker cones, corners. */
function cab(k, x, y, z, w, ht, d, speakers) {
  k.box(w, ht, d, 0x1c1c1c, x, y + ht / 2, z, { r: 0.06 });
  k.box(w - 0.18, ht - 0.18, 0.04, 0x424242, x, y + ht / 2, z + d / 2 + 0.005);
  const n = speakers;
  const r = Math.min(w / n, ht) * 0.36;
  for (let i = 0; i < n; i++) {
    const sx = x + (i - (n - 1) / 2) * (w / n);
    k.cyl(r, 0.04, 0x2a2a2a, sx, y + ht / 2, z + d / 2 + 0.02, { axis: 'z', seg: 16 });
    k.cyl(r * 0.3, 0.06, 0x555555, sx, y + ht / 2, z + d / 2 + 0.03, { axis: 'z', seg: 10 });
  }
  for (const cx of [-1, 1]) for (const cy of [0, 1]) k.box(0.14, 0.14, d + 0.04, 0x9e9e9e, x + cx * (w / 2 - 0.05), y + 0.05 + cy * (ht - 0.1), z, { r: 0.03 });
}

/** An amp head on (x, y, z): a box with a row of knobs (lit at Lv 4) and a handle. */
function ampHead(k, x, y, z, w, d, knobs) {
  k.box(w, 0.5, d, 0x1c1c1c, x, y + 0.25, z, { r: 0.05 });
  k.box(w - 0.1, 0.16, 0.04, 0x8d6e63, x, y + 0.3, z + d / 2 + 0.005);
  for (let i = 0; i < 5; i++) k.cyl(0.05, 0.06, knobs, x - w * 0.35 + i * w * 0.15, y + 0.3, z + d / 2 + 0.04, { axis: 'z', seg: 8 });
  k.tube([[x - 0.3, y + 0.5, z], [x - 0.25, y + 0.62, z], [x + 0.25, y + 0.62, z], [x + 0.3, y + 0.5, z]], 0.04, INK, { seg: 8, sides: 4 });
}

/**
 * Specter (0-4): a sheet ghost rocking out on an electric guitar, with big headphones (support).
 * Lv 1 a small amp and music notes floating round him, Lv 2 an amp stack, a purple scarf, a
 * purple guitar and glowing notes, Lv 3 a pale-blue glow and a black flame guitar with glowing
 * strings, Lv 4 the headliner: a stage with two amp stacks and spotlights, and a ring of lights.
 */
export function makeSpecter(level) {
  const h = rig();
  const key = `h1:specter${level}`;
  const SHEET = level >= 3 ? 0xe0f7fa : 0xf7f7f7;
  const SHADE = tone(SHEET, 0.88);
  // Sheet body: a rounded top, a wavy hem, folds, the face and headphones
  const t = kit(h, h.torso, `${key}:body`);
  t.ball(1.2, SHEET, 0, 0.9, 0, { sy: 1.25, sz: 0.85, seg: 22, rows: 16 });
  t.cyl(1.22, 1.8, SHEET, 0, 0.0, 0, { r2: 1.2, sz: 0.85, seg: 22 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * PI * 2;
    const len = i % 2 ? 0.45 : 0.8;
    t.cyl(0, len, i % 2 ? SHADE : SHEET, Math.sin(a) * 1.0, -0.9 - len / 2, Math.cos(a) * 0.82, { r2: 0.42, seg: 8 });
  }
  for (const [x, a] of [[-0.75, 0.1], [0.7, -0.1], [-0.2, 0.05]]) t.ball(0.18, SHADE, x, -0.35, 0.95 - Math.abs(x) * 0.2, { sy: 3.2, sz: 0.4, rz: a, seg: 8, rows: 6 }); // folds
  // Squeezed-shut "> <" eyes, a little open mouth and blush
  for (const s of [-1, 1]) {
    t.box(0.42, 0.11, 0.06, INK, s * 0.45, 1.3, 1.0, { rz: 0.5 * s });
    t.box(0.42, 0.11, 0.06, INK, s * 0.45, 1.1, 1.0, { rz: -0.5 * s });
    t.ball(0.16, 0xffb3c6, s * 0.75, 0.85, 0.92, { sy: 0.6, sz: 0.3, seg: 8, rows: 5 });
  }
  t.ball(0.2, INK, 0, 0.72, 0.98, { sy: 0.75, sz: 0.4, seg: 10, rows: 7 });
  t.ball(0.1, 0xe57373, 0, 0.66, 1.03, { sy: 0.5, sz: 0.3, seg: 6, rows: 4 });
  // Big headphones
  t.torus(1.3, 0.09, INK, 0, 1.25, 0, { arc: PI, seg: 20 });
  t.box(0.5, 0.12, 0.3, 0x424242, 0, 2.55, 0, { r: 0.05 }); // pad
  for (const s of [-1, 1]) {
    t.cyl(0.48, 0.32, 0x111111, s * 1.22, 1.25, 0, { axis: 'x', seg: 16 });
    t.cyl(0.36, 0.06, level >= 2 ? glowMat(h, 0x18ffff) : 0x424242, s * 1.4, 1.25, 0, { axis: 'x', seg: 16 });
  }
  if (level >= 2) {
    // A purple scarf with a hanging end
    const PURPLE = 0x7b1fa2;
    t.torus(1.18, 0.17, PURPLE, 0, 0.3, 0, { rx: PI / 2, sy: 0.84, seg: 22 });
    t.box(0.36, 0.95, 0.1, PURPLE, -0.75, -0.2, 0.86, { rz: -0.15, r: 0.04 });
    for (let i = 0; i < 3; i++) t.box(0.06, 0.16, 0.05, tone(PURPLE, 0.7), -0.85 + i * 0.1, -0.72, 0.9, { rz: -0.15 });
  }
  t.done();
  // Guitar held across the front, neck up to his left
  const guitar = grp(h.body, -0.1, 2.75, 1.4);
  guitar.rotation.z = -0.6;
  const gk = kit(h, guitar, `${key}:guitar`);
  const BODY = level >= 3 ? 0x111111 : level >= 2 ? 0x7b1fa2 : 0xd32f2f;
  gk.ball(0.8, BODY, 0.05, -0.55, 0, { sy: 0.8, sz: 0.25, seg: 18, rows: 12 });
  gk.ball(0.6, BODY, -0.05, 0.0, 0, { sy: 0.85, sz: 0.33, seg: 16, rows: 10 });
  gk.ball(0.26, BODY, -0.5, 0.42, 0, { sy: 1.5, sz: 0.75, rz: 0.3, seg: 10, rows: 7 }); // horn
  gk.ball(0.55, WHITE, 0.15, -0.45, 0.13, { sx: 0.8, sy: 0.9, sz: 0.12, seg: 14, rows: 8 }); // pickguard
  for (const y of [-0.2, -0.55]) {
    gk.box(0.5, 0.14, 0.06, INK, 0, y, 0.21, { r: 0.02 });
    for (let i = 0; i < 4; i++) gk.ball(0.025, 0xbdbdbd, -0.18 + i * 0.12, y, 0.245, { seg: 4, rows: 3 });
  }
  gk.box(0.55, 0.12, 0.08, 0x9e9e9e, 0, -0.85, 0.21, { r: 0.02 }); // bridge
  for (let i = 0; i < 3; i++) gk.cyl(0.06, 0.06, GOLD, 0.45 + i * 0.1, -0.8 - i * 0.15, 0.22, { axis: 'z', seg: 8 }); // knobs
  gk.box(0.24, 2.0, 0.12, 0x6d4c41, 0, 1.25, 0, { r: 0.03 }); // neck
  gk.box(0.22, 1.9, 0.04, 0x3e2723, 0, 1.25, 0.075); // fretboard
  for (let i = 0; i < 9; i++) gk.box(0.22, 0.02, 0.02, 0xbdbdbd, 0, 0.4 + i * 0.2, 0.1);
  for (const y of [0.7, 1.1, 1.5]) gk.ball(0.03, WHITE, 0, y, 0.1, { seg: 4, rows: 3 });
  gk.slab(0.42, 0.55, 0.1, 0x3e2723, 0, 2.5, 0, { tw: 1.2, r: 0.02 }); // headstock
  for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) gk.cyl(0.04, 0.16, 0xbdbdbd, sx * 0.3, 2.35 + i * 0.25, 0, { axis: 'x', seg: 6 });
  const strings = level >= 3 ? glowMat(h, 0x40c4ff) : 0xcfd8dc;
  for (let i = 0; i < 4; i++) gk.box(0.015, 3.2, 0.015, strings, -0.06 + i * 0.04, 0.75, 0.13);
  if (level >= 3) {
    // Flame decals on the black body
    for (let i = 0; i < 5; i++) gk.ball(0.12, i % 2 ? 0xffd600 : 0xff6d00, -0.6 + i * 0.22, -0.75 + (i % 2) * 0.15, 0.17, { sy: 2.6, sz: 0.2, rz: 0.35, seg: 8, rows: 6 });
  }
  gk.tube([[-0.5, 0.6, -0.1], [-0.2, 1.4, -0.6], [0.6, 1.0, -1.0]], 0.05, INK, { seg: 10, sides: 4 }); // strap round the back
  gk.done();
  // Round floating hands: the strumming hand by the body, the fretting hand up the neck
  h.rightArm.position.set(-0.45, 2.55, 1.75);
  h.leftArm.position.set(0.75, 3.95, 1.65);
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = kit(h, arm, `${key}:hand${s}`);
    a.ball(0.32, SHEET, 0, 0, 0, { sy: 0.9, sz: 0.85, seg: 12, rows: 9 });
    a.ball(0.13, SHEET, s * -0.22, 0.1, 0.15, { seg: 8, rows: 6 }); // thumb
    a.done();
  }
  pose(h, 0, 0, 0, 0);
  // Amps: a small combo (Lv 1), a stack (Lv 2-3), two stacks on a stage (Lv 4)
  const rk = kit(h, h.root, `${key}:stage`);
  const knob = level >= 4 ? glowMat(h, 0xffd54f) : 0xffd54f;
  if (level === 1) {
    cab(rk, 1.85, 0, -0.2, 1.1, 0.9, 0.8, 1);
    ampHead(rk, 1.85, 0.9, -0.2, 1.1, 0.8, knob);
  } else if (level >= 2) {
    const y0 = level >= 4 ? 0.4 : 0;
    for (const sx of level >= 4 ? [-1, 1] : [1]) {
      const x = sx * 1.9;
      for (let i = 0; i < 2; i++) cab(rk, x, y0 + i * 1.18, -0.6, 1.3, 1.15, 0.9, 2);
      ampHead(rk, x, y0 + 2.36, -0.6, 1.35, 0.9, knob);
    }
  }
  if (level >= 4) {
    // A little stage of planks with a glowing front edge, and two spotlights on poles
    rk.box(4.4, 0.4, 3.6, 0x4e342e, 0, 0.2, 0, { r: 0.05 });
    for (let i = 0; i < 7; i++) rk.box(0.03, 0.02, 3.5, 0x3e2723, -1.9 + i * 0.63, 0.41, 0);
    rk.box(4.45, 0.12, 0.12, glowMat(h, 0xe040fb), 0, 0.32, 1.78);
    const lampGlow = glowMat(h, 0xfff59d);
    const beam = seeThrough(h, 0xfff59d, 0.18, true);
    for (const s of [-1, 1]) {
      const x = s * 1.9;
      rk.cyl(0.08, 3.3, INK, x, 2.05, 1.5, { seg: 8 });
      rk.cyl(0.25, 0.08, INK, x, 0.44, 1.5, { seg: 10 });
      const o = { rx: 0.5, rz: -s * 0.6 };
      const L = new THREE.Vector3(x, 3.7, 1.5);
      const down = new THREE.Vector3(0, -1, 0).applyEuler(new THREE.Euler(0.5, 0, -s * 0.6));
      rk.cyl(0.3, 0.6, 0x37474f, L.x, L.y, L.z, { ...o, r2: 0.22, seg: 12 });
      rk.torus(0.32, 0.05, INK, L.x, L.y, L.z, { ...o, rx: 0.5 + PI / 2, seg: 12 });
      const lens = L.clone().addScaledVector(down, 0.32);
      rk.cyl(0.24, 0.04, lampGlow, lens.x, lens.y, lens.z, { ...o, seg: 12 });
      const bc = L.clone().addScaledVector(down, 1.55);
      rk.cyl(0.7, 2.4, beam, bc.x, bc.y, bc.z, { ...o, r2: 0.22, seg: 14, open: true });
    }
  }
  rk.done();
  // Music notes floating round him (black, glowing from Lv 2)
  if (level >= 1) {
    const ring = drifter(h, h.root, 4.2, 0.6, 0.3);
    const nk = kit(h, ring, 'h1:specterNotes');
    const ink = level >= 2 ? glowMat(h, 0x18ffff) : glowMat(h, 0x212121, 0);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2;
      const x = Math.cos(a) * 2.2;
      const z = Math.sin(a) * 2.2;
      const ry = -a + PI / 2;
      nk.ball(0.17, ink, x, 0, z, { sx: 1.25, sz: 0.5, ry, rz: 0.4, seg: 8, rows: 6 });
      nk.box(0.06, 0.7, 0.06, ink, x + Math.cos(-ry) * 0.17, 0.35, z + Math.sin(-ry) * 0.17);
      if (i % 2) nk.box(0.3, 0.08, 0.06, ink, x + Math.cos(-ry) * 0.3, 0.66, z + Math.sin(-ry) * 0.3, { ry, rz: -0.3 });
    }
    nk.done();
  }
  if (level >= 4) {
    // A ring of stage lights on the ground, slowly turning
    const ring = drifter(h, h.root, 0.06, 0.5);
    const lk = kit(h, ring, 'h1:specterRing');
    const m = seeThrough(h, 0xe040fb, 0.85, true);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * PI * 2;
      lk.box(0.9, 0.06, 0.22, m, Math.cos(a) * 2.9, 0, Math.sin(a) * 2.9, { ry: -a + PI / 2 });
    }
    lk.done();
  }
  h.lift = level >= 4 ? 0.8 : 0.4;
  h.bob = 0.2;
  h.body.scale.setScalar(0.95);
  return h;
}

// ------------------------------------------------------------------ Discount Dog

/**
 * Discount Dog (0-4): a floppy-eared dog with a lime bandana and sale signs (support: cheaper
 * upgrades). Lv 1 a yellow tee, a headband and a sale sign, Lv 2 an orange tee with a % print, a
 * cap and a name tag, Lv 3 a megaphone, a tool belt and a second sign in the ground, Lv 4 a red
 * zip hoodie with the hood up, a big megaphone, an arrow sign and gold coins circling him.
 */
export function makeDiscountDog(level) {
  const h = rig();
  const key = `h1:dog${level}`;
  const FUR = 0x9c8a74;
  const LIGHT = 0xd7c7ae;
  const DARK = 0x6d5d4b;
  const col = [0, 0xfdd835, 0xff9800, 0xff9800, 0xe53935][level];
  const big = level >= 4;
  h.rightArm.position.x = -1.3;
  h.leftArm.position.x = 1.3;
  // Body, shirt, bandana and tail
  const t = kit(h, h.torso, `${key}:torso`);
  t.box(1.8, 1.9, 1.1, FUR, 0, -0.05, 0, { r: 0.3 });
  t.ball(0.55, LIGHT, 0, -0.3, 0.45, { sy: 1.1, sz: 0.25, seg: 12, rows: 8 });
  if (level >= 1) {
    t.box(1.9, 1.45, 1.2, col, 0, -0.2, 0, { r: 0.25 });
    t.box(1.94, 0.1, 1.24, tone(col, 0.8), 0, -0.88, 0, { r: 0.04 }); // hem
    if (level >= 2 && !big) percent(t, WHITE, 0.05, -0.35, 0.61, 0.8);
    if (level >= 2 && !big) {
      // name tag on the chest
      t.box(0.45, 0.3, 0.04, WHITE, 0.55, 0.15, 0.61, { r: 0.03 });
      t.box(0.45, 0.08, 0.05, 0xe53935, 0.55, 0.26, 0.62);
    }
    if (big) {
      t.box(0.06, 1.45, 0.05, 0xcfd8dc, 0, -0.2, 0.62); // zipper
      t.box(0.14, 0.22, 0.08, 0xcfd8dc, 0, 0.35, 0.64, { r: 0.02 });
      t.box(1.1, 0.5, 0.05, tone(col, 0.85), 0, -0.6, 0.62, { r: 0.04 }); // pocket
      for (const sx of [-1, 1]) t.cyl(0.025, 0.45, WHITE, sx * 0.22, 0.45, 0.64, { seg: 5 }); // drawstrings
    }
    if (level >= 3) {
      // tool belt with a price gun and pouches
      t.box(1.96, 0.2, 1.26, LEATHER, 0, -0.78, 0, { r: 0.04 });
      t.box(0.24, 0.18, 0.06, GOLD, 0, -0.78, 0.64, { r: 0.02 });
      t.box(0.35, 0.35, 0.2, 0x795548, -0.65, -0.95, 0.6, { r: 0.04 });
      t.box(0.45, 0.25, 0.18, 0xe0e0e0, 0.68, -0.85, 0.65, { r: 0.04 }); // price gun
      t.box(0.12, 0.3, 0.12, INK, 0.68, -1.05, 0.65);
    }
  }
  const LIME = 0xaeea00;
  t.torus(0.82, 0.14, LIME, 0, 0.92, 0, { rx: PI / 2, sx: 1.12, sy: 0.75, seg: 20 });
  t.cyl(0.4, 0.06, LIME, 0, 0.6, 0.62, { axis: 'z', seg: 3 });
  t.ball(0.1, tone(LIME, 0.8), 0, 0.88, 0.66, { seg: 6, rows: 4 }); // knot
  t.tube([[0, -0.7, -0.5], [0, -0.75, -0.85], [0, -0.45, -1.1], [0.05, -0.1, -1.15]], 0.12, FUR, { seg: 12, sides: 6 });
  t.ball(0.14, LIGHT, 0.05, -0.05, -1.15, { seg: 8, rows: 6 });
  t.done();
  // Head: round, a light snout, nose, tongue, floppy ears; headband / cap / hood by level
  const hd = kit(h, h.head, `${key}:head`);
  hd.ball(0.75, FUR, 0, 0.7, 0, { sy: 0.87, sz: 0.87, seg: 18, rows: 12 });
  hd.ball(0.42, LIGHT, 0, 0.45, 0.55, { sx: 1.05, sy: 0.7, sz: 0.8, seg: 14, rows: 9 });
  hd.ball(0.16, INK, 0, 0.62, 0.88, { sx: 1.3, sy: 0.85, sz: 0.7, seg: 10, rows: 7 });
  hd.ball(0.04, 0xffffff, -0.06, 0.68, 0.98, { seg: 5, rows: 3 });
  hd.torus(0.14, 0.03, INK, 0, 0.36, 0.85, { arc: PI, rz: PI, seg: 10 });
  hd.ball(0.12, 0xf48fb1, 0.08, 0.2, 0.8, { sy: 1.3, sz: 0.5, seg: 8, rows: 6 }); // tongue
  for (const s of [-1, 1]) {
    hd.ball(0.11, INK, s * 0.33, 0.92, 0.6, { sy: 1.25, sz: 0.5, seg: 8, rows: 6 });
    hd.ball(0.04, 0xffffff, s * 0.33 - 0.04, 0.98, 0.65, { seg: 5, rows: 3 });
    hd.box(0.22, 0.05, 0.05, DARK, s * 0.33, 1.1, 0.58, { rz: s * -0.2 }); // brows
    hd.ball(0.36, DARK, s * 0.82, 0.55, -0.05, { sx: 0.35, sy: 1.5, sz: 0.85, rz: s * 0.18, seg: 10, rows: 8 }); // floppy ears
  }
  if (level === 1) hd.torus(0.64, 0.08, col, 0, 1.05, 0, { rx: PI / 2, sy: 0.88, seg: 18 });
  if (level === 2 || level === 3) {
    dome(hd, 0.72, 0.42, col, 0, 1.0, 0, { sz: 0.92 });
    hd.box(0.95, 0.06, 0.5, tone(col, 0.85), 0, 1.04, 0.78, { rx: -0.12, r: 0.03 });
    hd.ball(0.07, tone(col, 0.85), 0, 1.42, 0, { seg: 6, rows: 4 });
    hd.cyl(0.18, 0.04, WHITE, 0, 1.2, 0.6, { axis: 'z', rx: -0.45, seg: 12 });
  }
  if (big) {
    dome(hd, 0.92, 0.9, col, 0, 0.6, -0.32, { sz: 1.0 });
    hd.ball(0.85, col, 0, 0.55, -0.4, { sy: 0.8, sz: 0.7, seg: 14, rows: 9 });
    hd.torus(0.8, 0.12, 0xb71c1c, 0, 0.82, 0.38, { rx: -0.35, sy: 0.95, seg: 20 }); // hood rim
  }
  hd.done();
  // Arms and legs: fur with light paws; tee sleeves, or full hoodie sleeves at Lv 4
  for (const arm of [h.rightArm, h.leftArm]) {
    const a = kit(h, arm, `${key}:arm`);
    a.cyl(0.32, 1.6, big ? col : FUR, 0, -0.85, 0, { r2: 0.36, seg: 12 });
    a.ball(0.38, LIGHT, 0, -1.8, 0.03, { sy: 0.85, seg: 12, rows: 8 });
    for (const x of [-0.12, 0.12]) a.box(0.03, 0.15, 0.03, DARK, x, -2.05, 0.2);
    if (big) a.torus(0.34, 0.06, WHITE, 0, -1.55, 0, { rx: PI / 2, seg: 12 });
    else if (level >= 1) a.cyl(0.42, 0.55, col, 0, -0.28, 0, { r2: 0.44, seg: 12 });
    a.done();
  }
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = kit(h, leg, `${key}:leg`);
    b.cyl(0.36, 1.6, FUR, 0, -0.9, 0, { r2: 0.4, seg: 12 });
    if (level >= 1) b.cyl(0.44, 0.65, 0x455a64, 0, -0.3, 0, { r2: 0.45, seg: 12 }); // shorts
    b.ball(0.42, LIGHT, 0, -1.82, 0.18, { sx: 0.95, sy: 0.45, sz: 1.3, seg: 12, rows: 8 });
    for (const x of [-0.13, 0.13]) b.box(0.03, 0.1, 0.12, DARK, x, -1.8, 0.7);
    b.done();
  }
  // Signs and megaphones
  const signArm = -0.5;
  if (level >= 1) {
    const sh = hand(h.leftArm, -1.9, signArm);
    const sk = kit(h, sh, `${key}:sign`);
    sk.cyl(0.07, 2.6, 0x8d6e63, 0, 1.0, 0.05, { seg: 8 });
    sk.done();
    if (big) {
      // An arrow sign pointing down at the sign on the ground
      const ar = grp(sh, 0.3, 2.6, 0.1);
      ar.rotation.z = -0.9;
      const ak = kit(h, ar, `${key}:arrow`);
      ak.box(1.5, 0.6, 0.12, col, 0, 0, 0, { r: 0.04 });
      ak.cyl(0.62, 0.12, col, 0.85, 0, 0, { axis: 'z', seg: 3, rz: PI / 2 });
      ak.box(1.1, 0.1, 0.04, WHITE, -0.05, 0, 0.07);
      ak.box(1.56, 0.66, 0.06, 0x5d4037, 0, 0, -0.05, { r: 0.04 });
      ak.done();
    } else {
      const bk = kit(h, sh, `${key}:board`);
      saleSign(bk, col, 0, 2.55, 0.12);
      bk.done();
    }
  }
  if (level >= 3) {
    // Second sign planted in the ground
    const x = 2.0;
    const z = big ? 0.4 : -0.9;
    const gk = kit(h, h.root, `${key}:ground`);
    gk.cyl(0.07, 1.6, 0x8d6e63, x, 0.8, z, { seg: 8 });
    gk.ball(0.25, 0x6d4c41, x, 0.02, z, { sy: 0.3, seg: 8, rows: 5 });
    saleSign(gk, col, x, 1.9, z + 0.1, 1.3, 1.0);
    gk.done();
    const mh = hand(h.rightArm, -1.7);
    const mk = kit(h, mh, `${key}:mega`);
    const bell = big ? 0.7 : 0.5;
    const BODYC = big ? 0xc62828 : WHITE;
    const BELLC = big ? 0xe53935 : 0xeeeeee;
    mk.box(0.18, 0.4, 0.4, 0x37474f, 0, -0.1, -0.3, { r: 0.04 }); // grip
    mk.cyl(0.24, 0.55, BODYC, 0, -0.2, 0, { r2: 0.2, seg: 14 });
    mk.cyl(bell, 1.0, BELLC, 0, -0.95, 0, { r2: 0.24, seg: 18 });
    mk.torus(bell, 0.06, big ? WHITE : 0xe53935, 0, -1.45, 0, { rx: PI / 2, seg: 18 });
    mk.cyl(bell * 0.85, 0.02, 0x212121, 0, -1.44, 0, { seg: 18 });
    mk.torus(0.3, 0.04, big ? WHITE : 0xe53935, 0, -0.6, 0, { rx: PI / 2, seg: 14 });
    mk.done();
    pose(h, -1.75, signArm, 0.25, -0.15);
  } else if (level >= 1) pose(h, -0.25, signArm, 0.1, -0.15);
  else pose(h, -2.7, -0.2, 0.3, -0.1); // waving
  if (big) {
    // Gold coins circling over him
    const ring = drifter(h, h.root, 4.6, 0.8, 0.25);
    const ck = kit(h, ring, 'h1:dogCoins');
    const gold = glowMat(h, 0xffd54f, 0.6);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      const x = Math.cos(a) * 2.3;
      const z = Math.sin(a) * 2.3;
      ck.cyl(0.3, 0.08, gold, x, (i % 2) * 0.3, z, { axis: 'z', ry: -a, seg: 14 });
      ck.torus(0.27, 0.03, 0xffa000, x, (i % 2) * 0.3, z, { ry: -a, seg: 14 });
    }
    ck.done();
  }
  h.bob = 0.12;
  h.body.scale.setScalar(0.92);
  return h;
}

// ------------------------------------------------------------------ Dumpster Child

/**
 * Dumpster Child (0-4): a pink face peeking out of a ribbed trash can, its lid tipped on his head
 * and on fire (damage over time). Lv 1 a bigger fire, dents and a bent rim, Lv 2 garbage bags,
 * junk and flies, Lv 3 glowing toxic ribs and a leaking toxic drum, Lv 4 purple fire, a hidden eye
 * on the can and a sludge puddle with bubbles circling it.
 */
export function makeDumpster(level) {
  const u = makeThing();
  const final = level >= 4;
  const k = kit(u, u.body, `h1:dumpster${level}`);
  const CAN = 0x1e1e1e;
  const RIB = 0x333333;
  const toxicHex = final ? 0xd500f9 : 0x76ff03;
  const toxic = glowMat(u, toxicHex);
  // Ribbed round can, wider at the top
  k.cyl(1.15, 2.4, CAN, 0, 1.3, 0, { r2: 1.3, seg: 24 });
  k.torus(1.16, 0.08, RIB, 0, 0.14, 0, { rx: PI / 2, seg: 24 });
  for (const [y, r] of [[0.55, 1.19], [2.05, 1.28]]) k.torus(r, 0.06, RIB, 0, y, 0, { rx: PI / 2, seg: 24 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * PI * 2 + PI / 16;
    k.box(0.16, 2.0, 0.1, level >= 3 && i % 2 === 0 ? toxic : RIB, Math.sin(a) * 1.27, 1.3, Math.cos(a) * 1.27, { ...tip(a, 0.0625), r: 0.03 });
  }
  k.torus(1.32, 0.14, RIB, 0, 2.52, 0, { rx: PI / 2, seg: 24 }); // rim
  k.cyl(1.22, 0.05, level >= 3 ? toxic : 0x0a0a0a, 0, 2.5, 0, { seg: 24 }); // inside (glows from Lv 3)
  for (const s of [-1, 1]) k.tube([[s * 1.28, 2.25, -0.3], [s * 1.46, 2.25, -0.25], [s * 1.46, 2.25, 0.25], [s * 1.28, 2.25, 0.3]], 0.05, RIB, { seg: 10, sides: 5, tension: 0 });
  if (level >= 1) {
    // Dents and a bent bit of rim
    k.ball(0.3, 0x4a4a4a, -0.6, 0.75, 1.1, { sz: 0.25, ry: -0.5, rz: 0.4, seg: 10, rows: 6 });
    k.ball(0.3, 0x4a4a4a, 1.18, 1.7, -0.45, { sx: 0.25, rx: 0.5, seg: 10, rows: 6 });
    k.box(0.45, 0.08, 0.35, 0x2a2a2a, 0.95, 2.66, -0.95, { ry: 0.8, rz: 0.4 });
  }
  // Round pink face poking out of the top, little hands gripping the rim
  const PINK = 0xf8bbd0;
  k.ball(0.85, PINK, 0, 3.15, 0, { sy: 0.85, sz: 0.9, seg: 18, rows: 12 });
  for (const s of [-1, 1]) {
    k.ball(0.12, INK, s * 0.33, 3.35, 0.7, { sy: 1.3, sz: 0.5, seg: 8, rows: 6 });
    k.ball(0.04, 0xffffff, s * 0.33 - 0.04, 3.42, 0.75, { seg: 5, rows: 3 });
    k.ball(0.13, 0xf06292, s * 0.55, 3.05, 0.62, { sy: 0.6, sz: 0.4, seg: 8, rows: 5 });
    const hx = s * 0.62;
    k.ball(0.2, PINK, hx, 2.6, 1.2, { sy: 0.8, sz: 0.8, seg: 10, rows: 7 });
    for (let f = 0; f < 3; f++) k.ball(0.07, PINK, hx - 0.12 + f * 0.12, 2.7, 1.34, { sy: 1.6, seg: 6, rows: 4 });
  }
  k.ball(0.24, 0x4a148c, 0, 2.97, 0.7, { sx: 1.2, sy: 0.5, sz: 0.35, seg: 10, rows: 7 }); // grin
  k.box(0.1, 0.07, 0.05, WHITE, 0.08, 3.0, 0.78); // tooth
  if (level >= 2) {
    // Garbage bags, a banana peel and a crushed soda can
    for (const [x, z, s, c] of [[-1.85, 0.9, 1, 0x263238], [-1.75, -1.0, 0.9, 0x2e3b2e], [1.8, 1.0, 0.8, 0x2e3b2e]]) {
      k.ball(0.58 * s, c, x, 0.5 * s, z, { sy: 0.88, seg: 12, rows: 9 });
      k.ball(0.32 * s, tone(c, 1.2), x + 0.15 * s, 0.6 * s, z + 0.35 * s, { sx: 0.3, sy: 1.0, sz: 0.4, seg: 6, rows: 4 }); // crease
      k.ball(0.15 * s, c, x, 1.0 * s, z, { seg: 8, rows: 6 });
      for (const d of [-1, 1]) k.cyl(0.08 * s, 0.3 * s, c, x + d * 0.12 * s, 1.18 * s, z, { r2: 0.0, rz: -d * 0.6, seg: 5 });
    }
    for (let i = 0; i < 3; i++) k.ball(0.14, 0xfdd835, 0.9 + Math.cos(i * 2.1) * 0.15, 0.05, 1.9 + Math.sin(i * 2.1) * 0.15, { sx: 0.4, sy: 0.2, sz: 1.3, ry: i * 2.1, seg: 6, rows: 4 });
    k.cyl(0.14, 0.4, 0xe53935, -0.9, 0.12, 1.85, { axis: 'x', ry: 0.6, sx: 0.8, seg: 10 });
  }
  if (level >= 3) {
    // A leaking toxic drum
    const dx = 1.85;
    const dz = -1.3;
    k.cyl(0.48, 1.4, 0xfbc02d, dx, 0.7, dz, { seg: 16 });
    for (const y of [0.35, 1.05]) k.torus(0.49, 0.04, 0x5d4037, dx, y, dz, { rx: PI / 2, seg: 16 });
    k.torus(0.46, 0.05, 0xc49000, dx, 1.4, dz, { rx: PI / 2, seg: 16 });
    k.cyl(0.4, 0.04, toxic, dx, 1.42, dz, { seg: 16 });
    k.cyl(0.24, 0.04, INK, dx - 0.15, 0.75, dz + 0.45, { axis: 'z', ry: -0.3, seg: 4 }); // hazard mark
    k.ball(0.07, toxic, dx - 0.15, 0.75, dz + 0.5, { seg: 6, rows: 4 });
    k.ball(0.1, toxic, dx - 0.35, 0.95, dz + 0.36, { sy: 2.5, sz: 0.5, seg: 6, rows: 4 }); // drip
    k.cyl(0.35, 0.03, toxic, dx - 0.5, 0.02, dz + 0.65, { sx: 1.4, seg: 12 }); // puddle
  }
  if (final) {
    // The hidden eye on the can, and a sludge puddle
    k.ball(0.45, 0xf3e5f5, 0, 1.35, 1.27, { sy: 0.65, sz: 0.35, seg: 14, rows: 9 });
    k.ball(0.2, toxic, 0, 1.35, 1.38, { sz: 0.3, seg: 10, rows: 7 });
    k.box(0.07, 0.24, 0.04, 0x000000, 0, 1.35, 1.45);
    k.torus(0.45, 0.05, INK, 0, 1.35, 1.3, { sy: 0.65, seg: 16 });
    const sludge = glowMat(u, 0x9c27b0, 0.4);
    for (const [x, z, r] of [[-0.2, 1.75, 1.0], [-1.3, 1.2, 0.7], [0.7, 2.1, 0.5]]) k.cyl(r, 0.05, sludge, x, 0.03, z, { sx: 1.4, seg: 16 });
    k.ball(0.25, glowMat(u, 0x76ff03), 0.6, 0.06, 1.95, { sy: 0.2, sx: 1.6, seg: 10, rows: 5 });
  }
  k.done();
  // Tipped lid on his head, on fire
  const lid = grp(u.body, 0.2, 4.0, -0.1);
  lid.rotation.set(-0.15, 0, -0.35);
  const lk = kit(u, lid, `h1:dumpsterLid${level >= 1 ? 1 : 0}`);
  lk.cyl(1.35, 0.16, CAN, 0, 0, 0, { seg: 24 });
  lk.torus(1.35, 0.08, RIB, 0, 0, 0, { rx: PI / 2, seg: 24 });
  dome(lk, 1.2, 0.22, RIB, 0, 0.08, 0, { seg: 20 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    lk.box(0.06, 0.04, 0.9, 0x2a2a2a, Math.sin(a) * 0.75, 0.2, Math.cos(a) * 0.75, { ry: a, rx: -0.2 });
  }
  lk.tube([[-0.4, 0.25, 0], [-0.35, 0.5, 0], [0.35, 0.5, 0], [0.4, 0.25, 0]], 0.07, RIB, { seg: 10, sides: 6 });
  if (level >= 1) lk.ball(0.2, 0x2a2a2a, 0.6, 0.18, 0.5, { sy: 0.3, seg: 8, rows: 5 });
  lk.done();
  const flame = grp(lid, 0, 0.3, 0);
  flame.rotation.set(0.15, 0, 0.35); // stays upright
  flame.scale.setScalar([1, 1.35, 1.45, 1.55, 1.7][level]);
  const fl = drifter(u, flame, 0, 1.4, 0.05);
  const fk = kit(u, fl, 'h1:dumpsterFlame');
  const A = glowMat(u, 0xff6d00);
  const B = glowMat(u, final ? 0xe040fb : 0xffab00);
  const C = glowMat(u, final ? 0xea80fc : 0xffea00);
  const D = glowMat(u, 0xff3d00);
  fk.ball(0.7, A, 0, 0.3, 0, { sy: 0.55, seg: 12, rows: 8 });
  fk.cyl(0.55, 1.2, B, 0.1, 0.9, -0.05, { r2: 0, seg: 9 });
  fk.cyl(0.32, 0.9, C, -0.05, 1.45, 0.05, { r2: 0, seg: 8, rz: 0.1 });
  fk.cyl(0.24, 0.65, D, 0.5, 0.75, 0.4, { r2: 0, rz: -0.35, seg: 7 });
  fk.cyl(0.22, 0.6, D, -0.5, 0.65, -0.45, { r2: 0, rz: 0.35, rx: -0.2, seg: 7 });
  fk.cyl(0.2, 0.55, B, -0.4, 0.7, 0.45, { r2: 0, rz: 0.3, rx: 0.3, seg: 7 });
  for (const [x, y, z] of [[0.3, 1.9, 0.2], [-0.35, 1.6, -0.2], [0.1, 2.2, -0.1]]) fk.ball(0.08, C, x, y, z, { seg: 6, rows: 4 }); // embers
  fk.done();
  if (level >= 2) {
    // Flies buzzing round the can
    const ring = drifter(u, u.root, 3.6, 2.2, 0.3);
    const flk = kit(u, ring, 'h1:dumpsterFlies');
    const wing = seeThrough(u, 0xe1f5fe, 0.6);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2;
      const x = Math.cos(a) * 1.9;
      const z = Math.sin(a) * 1.9;
      const y = (i - 1) * 0.35;
      flk.ball(0.09, INK, x, y, z, { sz: 1.4, ry: -a, seg: 6, rows: 4 });
      for (const d of [-1, 1]) flk.ball(0.08, wing, x, y + 0.07, z, { sx: 1.4, sy: 0.2, ry: -a + d * 0.6, seg: 6, rows: 3 });
    }
    flk.done();
  }
  if (final) {
    // Toxic bubbles circling the can
    const ring = drifter(u, u.root, 1.0, 0.6, 0.3);
    const bk = kit(u, ring, 'h1:dumpsterBubbles');
    const bub = [seeThrough(u, 0xd500f9, 0.7, true), seeThrough(u, 0x76ff03, 0.7, true)];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      bk.ball(0.18 + (i % 3) * 0.06, bub[i % 2], Math.cos(a) * 2.3, (i % 2) * 0.5, Math.sin(a) * 2.3, { seg: 10, rows: 7 });
    }
    bk.done();
  }
  u.muzzles = [];
  setMuzzle(u, u.body, 0, 3.1, 1.0);
  u.tracer = final ? 0xe040fb : 0xff9100;
  u.bob = 0.05;
  return u;
}

export const MODELS = {
  sparkBranch: makeBranch,
  brawlerMako: makeMako,
  teslaVolt: makeVolt,
  commanderSpecter: makeSpecter,
  djDiscount: makeDiscountDog,
  flamethrowerDumpster: makeDumpster,
};
