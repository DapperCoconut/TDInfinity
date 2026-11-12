import * as THREE from 'three';
import { boxGeo, part, makeHumanoid, makeThing, glowThing } from '../models.js';
import { vcMat, wheelGeo } from '../vehicles.js';

// New towers and units (set H). Every helper from models.js is only called inside functions
// (models.js imports the newmodels files, so the imports are not ready at module load time).
// Characters face +Z; units walk / drive along +Z. Tower makers take level 0..4.

/* ------------------------------------------------------------------ helpers */

const B = (p, w, h, d, m, x = 0, y = 0, z = 0) => part(p, boxGeo(w, h, d), m, x, y, z);

/** Memoised material maker: one material per colour per model. */
function mm(u) {
  const cache = new Map();
  return (c) => {
    let m = cache.get(c);
    if (!m) {
      m = u.M(c);
      cache.set(c, m);
    }
    return m;
  };
}

/** A see-through material that keeps its see-through look (setOpacity respects keepOpacity). */
function clear(u, color, op = 0.6) {
  const m = u.M(color);
  m.transparent = true;
  m.opacity = op;
  m.depthWrite = false;
  m.userData.keepOpacity = op;
  return m;
}

/** An empty muzzle point on `parent`. */
function mz(parent, x, y, z) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

function group(parent, x = 0, y = 0, z = 0, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  parent.add(g);
  return g;
}

/** A rounded lump: a core box plus narrower, taller boxes that round off the corners. */
function blob(parent, mat, w, h, d, x = 0, y = 0, z = 0) {
  B(parent, w, h * 0.6, d, mat, x, y, z);
  B(parent, w * 0.85, h * 0.85, d * 0.85, mat, x, y, z);
  B(parent, w * 0.6, h, d * 0.6, mat, x, y, z);
}

/** Bands around a blob() at the given heights (relative to the blob centre). */
function blobBands(parent, mat, w, h, d, x, y, z, ys, t = 0.18) {
  const layers = [[w, h * 0.6, d], [w * 0.85, h * 0.85, d * 0.85], [w * 0.6, h, d * 0.6]];
  for (const by of ys)
    for (const [lw, lh, ld] of layers) if (Math.abs(by) + t / 2 < lh / 2) B(parent, lw + 0.04, t, ld + 0.04, mat, x, y + by, z);
}

/** A box with a dark outline rim (the doodle look of Stella's drawings). */
function inked(parent, w, h, d, mat, ink, x = 0, y = 0, z = 0) {
  const m = B(parent, w, h, d, mat, x, y, z);
  B(parent, w + 0.14, h + 0.14, d * 0.8, ink, x, y, z);
  return m;
}

function newUnit() {
  const u = makeThing();
  u.wheels = [];
  return u;
}

/** Humanoid units as a squad (same layout as makeUnit's squads). */
function squad(u, count, mk) {
  u.soldiers = [];
  for (let i = 0; i < count; i++) {
    const h = mk(i);
    h.root.scale.setScalar(0.6 * (h.size ?? 1));
    h.root.position.set(count === 1 ? 0 : (i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.soldiers.push(h);
    u.muzzles.push(h.muzzles[0]);
  }
  const h0 = u.soldiers[0];
  u.height = 3.5 * (h0.size ?? 1);
  u.tracer = h0.tracer;
  if (h0.projectile) u.projectile = h0.projectile;
  return u;
}

/** A group at the end of a humanoid arm (the arm points along local -Y). */
function inHand(arm, y = -2.1) {
  const g = new THREE.Group();
  g.position.set(0, y, 0);
  arm.add(g);
  return g;
}

/* ================================================================== 1. Oddport */

/**
 * An Oddport student: big white crescent-moon head with two tall black eyes, purple suit, red
 * tie, black trousers. i: 0 fists, 1 PK (slingshot), 2 Reese (medic satchel), 3 Sticky
 * (blowpipe), 4 Nelly (boxing gloves).
 */
export function student(i) {
  const h = makeHumanoid({ skin: 0xfafafa, shirt: 0x5e35b1, pants: 0x151515, arms: 0x5e35b1 });
  const M = mm(h);
  h.head.remove(h.head.children[0]);
  const white = M(0xfafafa);
  const ink = M(0x111111);
  // Crescent: an arc of blocks opening toward the character's left, thick in the middle.
  const cx = 0.55;
  const cy = 1.3;
  const R = 1.3;
  const n = 11;
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1);
    const a = ((50 + t * 260) * Math.PI) / 180;
    const th = 0.4 + 0.8 * Math.sin(t * Math.PI);
    const seg = B(h.head, th, 0.55, 1.0, white, cx + Math.cos(a) * (R - th / 2), cy + Math.sin(a) * (R - th / 2), 0);
    seg.rotation.z = a;
  }
  B(h.head, 1.0, 1.3, 1.0, white, -0.2, cy, 0); // flat face area
  // Two tall oval eyes
  for (const x of [-0.42, 0.02]) {
    B(h.head, 0.26, 0.6, 0.06, ink, x, cy + 0.05, 0.52);
    B(h.head, 0.16, 0.78, 0.06, ink, x, cy + 0.05, 0.52);
  }
  // Suit: shirt front, red tie, lapels, white hands
  B(h.torso, 0.55, 1.1, 0.06, white, 0, 0.4, 0.52);
  B(h.torso, 0.24, 0.9, 0.08, M(0xd32f2f), 0, 0.3, 0.55);
  B(h.torso, 0.3, 0.2, 0.09, M(0xb71c1c), 0, 0.8, 0.56);
  for (const s of [-1, 1]) B(h.torso, 0.25, 1.0, 0.07, M(0x4527a0), s * 0.42, 0.45, 0.53).rotation.z = s * 0.3;
  for (const arm of [h.leftArm, h.rightArm]) B(arm, 0.75, 0.4, 0.75, white, 0, -2.1, 0);
  for (const leg of [h.leftLeg, h.rightLeg]) B(leg, 1.05, 0.4, 1.2, M(0x3e2723), 0, -1.8, 0.08); // shoes
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-0.4, 0, -0.15);
  const hand = inHand(h.rightArm);
  if (i === 0) {
    // Bare fists, both up
    h.leftArm.rotation.set(-Math.PI / 2 + 0.25, 0, -0.2);
    B(hand, 0.85, 0.5, 0.85, white, 0, -0.1, 0);
    h.muzzles = [mz(hand, 0, -0.4, 0)];
    h.tracer = 0xfafafa;
  } else if (i === 1) {
    // PK: a wooden slingshot pointing forward
    const wood = M(0x8d6e63);
    B(hand, 0.18, 0.7, 0.18, wood, 0, -0.35, 0);
    for (const s of [-1, 1]) B(hand, 0.14, 0.5, 0.14, wood, s * 0.22, -0.85, 0).rotation.z = s * 0.4;
    B(hand, 0.55, 0.06, 0.06, M(0xc62828), 0, -1.05, -0.05); // band
    h.muzzles = [mz(hand, 0, -1.1, 0)];
    h.tracer = 0xbdbdbd;
    h.projectile = { color: 0x9e9e9e, size: 0.3 };
  } else if (i === 2) {
    // Reese: a white medic satchel with a red cross on the hip, strap across the chest
    B(h.torso, 0.25, 2.6, 1.08, M(0x795548), 0, 0, 0).rotation.z = 0.75;
    B(h.torso, 0.9, 0.8, 0.5, white, 1.2, -0.75, 0.15);
    B(h.torso, 0.5, 0.15, 0.06, M(0xe53935), 1.2, -0.75, 0.42);
    B(h.torso, 0.15, 0.5, 0.06, M(0xe53935), 1.2, -0.75, 0.42);
    B(hand, 0.5, 0.35, 0.3, M(0xe53935), 0, -0.25, 0); // a little first-aid kit
    h.muzzles = [mz(hand, 0, -0.4, 0)];
    h.tracer = 0x69f0ae;
  } else if (i === 3) {
    // Sticky: a long blowpipe
    B(hand, 0.18, 2.6, 0.18, M(0x6d8b3a), 0, -1.2, 0);
    B(hand, 0.24, 0.15, 0.24, M(0x33691e), 0, -2.5, 0);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.45);
    h.muzzles = [mz(hand, 0, -2.6, 0)];
    h.tracer = 0x8bc34a;
    h.projectile = { color: 0x8bc34a, size: 0.2 };
  } else {
    // Nelly: red boxing gloves
    h.leftArm.rotation.set(-Math.PI / 2 + 0.3, 0, -0.2);
    const glove = M(0xd32f2f);
    for (const arm of [h.leftArm, h.rightArm]) {
      B(arm, 1.05, 0.9, 1.05, glove, 0, -2.3, 0);
      B(arm, 0.9, 0.2, 0.9, white, 0, -1.8, 0); // cuff
    }
    h.muzzles = [mz(hand, 0, -0.7, 0)];
    h.tracer = 0xff5252;
  }
  return h;
}

function oddportUnit(n) {
  return () => squad(newUnit(), n, (i) => student(i));
}

/* ================================================================== 2. Slime King */

/** A glossy slime blob with a cute face (about 1.5*s tall), built onto `parent`. */
function slimeShape(u, M, parent, color, s, { blush = true } = {}) {
  const g = group(parent);
  const body = M(color);
  B(g, 1.6 * s, 0.7 * s, 1.5 * s, body, 0, 0.4 * s, 0);
  B(g, 1.3 * s, 1.1 * s, 1.2 * s, body, 0, 0.55 * s, 0);
  B(g, 0.9 * s, 1.4 * s, 0.8 * s, body, 0, 0.7 * s, 0);
  B(g, 0.3 * s, 0.2 * s, 0.3 * s, body, 0, 1.45 * s, 0);
  B(g, 0.2 * s, 0.35 * s, 0.05, M(0xffffff), 0.28 * s, 1.15 * s, 0.41 * s); // shine
  const ink = M(0x1a1a2e);
  for (const x of [-0.28, 0.28]) {
    B(g, 0.2 * s, 0.32 * s, 0.05, ink, x * s, 0.95 * s, 0.61 * s);
    B(g, 0.08 * s, 0.1 * s, 0.05, M(0xffffff), x * s + 0.04 * s, 1.03 * s, 0.63 * s);
  }
  B(g, 0.24 * s, 0.08 * s, 0.05, ink, 0, 0.66 * s, 0.76 * s); // mouth
  if (blush) for (const x of [-0.52, 0.52]) B(g, 0.24 * s, 0.1 * s, 0.05, M(0xf48fb1), x * s, 0.66 * s, 0.76 * s);
  return g;
}

/** A crown (base width w) at height y on `parent`, with optional flames on the points. */
function crown(u, M, parent, w, y, { gems = false, flames = 0 } = {}) {
  const gold = M(0xffc400);
  const t = w * 0.12;
  const h = w * 0.3;
  for (const s of [-1, 1]) {
    B(parent, w, h, t, gold, 0, y + h / 2, s * (w / 2 - t / 2));
    B(parent, t, h, w, gold, s * (w / 2 - t / 2), y + h / 2, 0);
  }
  const pts = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [0, -1], [-1, 0], [1, 0]];
  for (const [x, z] of pts) {
    const px = x * (w / 2 - t / 2);
    const pz = z * (w / 2 - t / 2);
    B(parent, t * 1.2, h * 0.9, t * 1.2, gold, px, y + h * 1.4, pz);
    B(parent, t * 0.8, t * 0.8, t * 0.8, gems ? M(0xe53935) : gold, px, y + h * 1.95, pz);
    if (flames) {
      const f1 = glowThing(u, 0xff6d00);
      const f2 = glowThing(u, 0xffea00);
      B(parent, t * 1.1, t * 2 * flames, t * 1.1, f1, px, y + h * 2.1 + t * flames, pz);
      B(parent, t * 0.6, t * 1.4 * flames, t * 0.6, f2, px, y + h * 2.2 + t * 1.3 * flames, pz);
    }
  }
  if (gems) for (const s of [-1, 1]) B(parent, t * 1.3, t * 1.3, 0.06, M(0x2979ff), s * w * 0.25, y + h / 2, w / 2 + 0.02);
}

function kslime() {
  const u = newUnit();
  const M = mm(u);
  slimeShape(u, M, u.body, 0x29b6f6, 1);
  u.muzzles.push(mz(u.body, 0, 0.6, 0.8));
  u.height = 1.5;
  u.tracer = 0x29b6f6;
  return u;
}

function kslimeFire() {
  const u = newUnit();
  const M = mm(u);
  slimeShape(u, M, u.body, 0xff5722, 1.05, { blush: false });
  const f1 = glowThing(u, 0xff6d00);
  const f2 = glowThing(u, 0xffea00);
  for (const [x, z, h] of [[0, 0, 0.9], [-0.3, 0.1, 0.6], [0.3, -0.1, 0.65], [0.05, -0.3, 0.5]]) {
    B(u.body, 0.32, h, 0.32, f1, x, 1.5 + h / 2, z);
    B(u.body, 0.18, h * 0.6, 0.18, f2, x, 1.6 + h * 0.5, z + 0.08);
  }
  u.muzzles.push(mz(u.body, 0, 0.6, 0.8));
  u.height = 2.2;
  u.tracer = 0xff6d00;
  return u;
}

function slimeKingUnit() {
  const u = newUnit();
  const M = mm(u);
  const s = 4;
  const king = slimeShape(u, M, u.body, 0x1e88e5, s);
  B(king, 1.2 * s, 1.0 * s, 0.15, M(0xc62828), 0, 0.6 * s, -0.78 * s); // cape
  B(king, 1.3 * s, 0.25, 0.3, M(0xfafafa), 0, 1.1 * s, -0.7 * s); // ermine trim
  crown(u, M, king, 0.42 * s, 1.42 * s, { gems: true });
  u.muzzles.push(mz(u.body, 0, 2.0, 3.2));
  u.height = 6;
  u.tracer = 0x1e88e5;
  return u;
}

/* ================================================================== 3. Hayes */

/** A crow (about 1.3*s tall), nose along +Z. Spread wings are pivot groups at the shoulders. */
function crowShape(u, M, parent, s, spread) {
  const g = group(parent, 0, 0, 0, s);
  const black = M(0x1c1c22);
  const sheen = M(0x303550);
  B(g, 0.8, 0.7, 1.3, black, 0, 0.6, 0);
  B(g, 0.6, 0.6, 0.6, black, 0, 1.05, 0.6);
  B(g, 0.2, 0.18, 0.45, M(0x546e7a), 0, 1.0, 1.1); // beak
  for (const x of [-0.31, 0.31]) B(g, 0.06, 0.12, 0.12, M(0xffca28), x, 1.15, 0.75);
  const tail = B(g, 0.55, 0.1, 0.7, sheen, 0, 0.65, -0.9);
  tail.rotation.x = -0.3;
  const feet = M(0x424242);
  for (const x of [-0.18, 0.18]) B(g, 0.08, 0.3, 0.08, feet, x, 0.12, 0.05);
  let wings = null;
  if (spread) {
    wings = [];
    for (const side of [1, -1]) {
      // [left (+X), right (-X)]
      const w = group(g, side * 0.38, 0.8, 0);
      B(w, 1.2, 0.1, 0.8, black, side * 0.6, 0, 0);
      B(w, 0.7, 0.08, 0.6, sheen, side * 1.5, 0, -0.1);
      for (const z of [-0.25, 0, 0.25]) B(w, 0.35, 0.06, 0.16, black, side * 2.0, 0, z - 0.1);
      wings.push(w);
    }
  } else for (const x of [-0.43, 0.43]) B(g, 0.1, 0.5, 1.0, sheen, x, 0.65, -0.15);
  return { g, wings };
}

function hcrow() {
  const u = newUnit();
  const M = mm(u);
  const c = crowShape(u, M, u.body, 1.1, true);
  u.wings = c.wings;
  u.muzzles.push(mz(c.g, 0, 1.0, 1.35));
  u.height = 1.4;
  u.fly = 6;
  u.tracer = 0x212121;
  return u;
}

/* ================================================================== 4. Buzzer (the tower: machines8.js) */

/** A round fuzzy bee body (about 2*s tall) with stripes, a face and curly antennae. */
function beeShape(u, M, parent, s) {
  const g = group(parent, 0, 0, 0, s);
  const fur = M(0xd9822b);
  const black = M(0x1a1a1a);
  blob(g, fur, 2.0, 2.0, 1.9, 0, 1.0, 0);
  blobBands(g, black, 2.0, 2.0, 1.9, 0, 1.0, 0, [-0.55, -0.15], 0.2);
  for (const x of [-0.42, 0.42]) {
    B(g, 0.34, 0.46, 0.06, black, x, 1.35, 0.97);
    B(g, 0.12, 0.14, 0.06, M(0xffffff), x + 0.07, 1.47, 1.0);
  }
  B(g, 0.4, 0.08, 0.06, black, 0, 1.08, 0.97);
  for (const x of [-0.72, 0.72]) B(g, 0.22, 0.12, 0.06, M(0xff8a80), x, 1.12, 0.96);
  // Curly antennae
  for (const sd of [-1, 1]) {
    B(g, 0.08, 0.6, 0.08, black, sd * 0.35, 2.2, 0.3).rotation.z = -sd * 0.3;
    B(g, 0.3, 0.08, 0.08, black, sd * 0.6, 2.5, 0.3);
    B(g, 0.08, 0.25, 0.08, black, sd * 0.72, 2.4, 0.3);
    B(g, 0.16, 0.08, 0.08, black, sd * 0.64, 2.3, 0.3);
  }
  return g;
}

function bbee() {
  const u = newUnit();
  const M = mm(u);
  const b = beeShape(u, M, u.body, 0.45);
  B(b, 0.2, 0.2, 0.4, M(0x1a1a1a), 0, 0.8, -1.05); // stinger
  const wingM = clear(u, 0xe1f5fe, 0.65);
  u.wings = [];
  for (const sd of [1, -1]) {
    // [left (+X), right (-X)]
    const w = group(b, sd * 0.55, 1.75, -0.3);
    B(w, 1.3, 0.08, 0.8, wingM, sd * 0.65, 0, 0);
    u.wings.push(w);
  }
  u.muzzles.push(mz(b, 0, 0.8, 1.0));
  u.height = 1;
  u.fly = 3;
  u.tracer = 0xffd600;
  return u;
}

/* ================================================================== 5. Nuki Launcher (the tower: machines8.js) */

/** A fluffy tanuki (about 2.2*s tall), facing +Z. */
function tanukiShape(u, M, parent, s, { elite = false, leaf = false } = {}) {
  const g = group(parent, 0, 0, 0, s);
  const fur = M(0xc99a86);
  const light = M(0xf3d9cc);
  const dark = M(0x3b2a26);
  for (const x of [-0.3, 0.3]) B(g, 0.38, 0.4, 0.45, dark, x, 0.2, 0.05);
  blob(g, fur, 1.15, 0.9, 0.95, 0, 0.8, 0);
  B(g, 0.65, 0.55, 0.06, light, 0, 0.75, 0.48);
  // Head
  B(g, 1.0, 0.8, 0.85, fur, 0, 1.55, 0.05);
  B(g, 1.25, 0.35, 0.7, fur, 0, 1.4, 0.05); // cheek fluff
  B(g, 0.92, 0.26, 0.06, dark, 0, 1.62, 0.49); // mask
  for (const x of [-0.2, 0.2]) B(g, 0.12, 0.12, 0.06, M(0xffffff), x, 1.64, 0.52);
  B(g, 0.42, 0.24, 0.12, light, 0, 1.36, 0.5);
  B(g, 0.14, 0.1, 0.06, dark, 0, 1.44, 0.57);
  B(g, 0.12, 0.05, 0.06, M(0x6d2f2f), 0, 1.3, 0.57);
  for (const x of [-0.36, 0.36]) {
    B(g, 0.28, 0.3, 0.16, fur, x, 2.08, 0);
    B(g, 0.16, 0.18, 0.17, dark, x, 2.28, 0);
  }
  // Big bushy tail with dark rings
  const tail = group(g, 0, 0.55, -0.45);
  tail.rotation.x = -0.5;
  B(tail, 0.6, 0.6, 1.3, fur, 0, 0, -0.6);
  B(tail, 0.7, 0.5, 1.0, fur, 0, 0, -0.6);
  for (const z of [-0.4, -0.85]) B(tail, 0.64, 0.64, 0.14, dark, 0, 0, z);
  B(tail, 0.5, 0.5, 0.2, dark, 0, 0, -1.3);
  // Fists up
  for (const x of [-0.6, 0.6]) B(g, 0.3, 0.3, 0.45, fur, x, 1.0, 0.35);
  if (elite) {
    const steel = M(0x78909c);
    B(g, 1.2, 0.6, 1.0, steel, 0, 0.9, 0);
    for (const x of [-0.65, 0.65]) B(g, 0.4, 0.3, 0.6, steel, x, 1.2, 0);
    B(g, 1.05, 0.15, 0.9, M(0xb71c1c), 0, 0.55, 0); // red sash
    // A stick held upright
    B(g, 0.12, 2.2, 0.12, M(0x6d4c41), -0.62, 1.1, 0.45);
  }
  if (leaf || elite) {
    const lf = B(g, 0.6, 0.08, 0.4, M(0x43a047), 0, 2.02, 0.05);
    lf.rotation.set(0.2, 0.5, 0.1);
    B(g, 0.06, 0.2, 0.06, M(0x2e7d32), 0, 2.12, 0.05);
  }
  return g;
}

function nuki() {
  const u = newUnit();
  const M = mm(u);
  const t = tanukiShape(u, M, u.body, 0.75);
  u.muzzles.push(mz(t, 0, 1.0, 0.6));
  u.height = 1.6;
  u.tracer = 0xc99a86;
  return u;
}

function nukiElite() {
  const u = newUnit();
  const M = mm(u);
  const t = tanukiShape(u, M, u.body, 0.85, { elite: true });
  u.muzzles.push(mz(t, -0.62, 2.2, 0.45));
  u.height = 1.9;
  u.tracer = 0xc99a86;
  return u;
}

/* ================================================================== 6. Stella */

/* ---- Stella's living drawings: flat bright colours with dark outline rims. */

function doodleUnit() {
  const u = newUnit();
  const M = mm(u);
  return { u, M, ink: M(0x1a1a1a) };
}

function sWuffle() {
  const { u, M, ink } = doodleUnit();
  const fur = M(0xffe082);
  const spot = M(0xff8a65);
  inked(u.body, 1.2, 0.8, 1.8, fur, ink, 0, 0.95, 0);
  for (const [x, z] of [[-0.4, 0.6], [0.4, 0.6], [-0.4, -0.6], [0.4, -0.6]]) inked(u.body, 0.32, 0.6, 0.32, fur, ink, x, 0.3, z);
  inked(u.body, 0.5, 0.4, 0.06, spot, ink, 0.3, 1.1, 0.0).rotation.y = Math.PI / 2;
  inked(u.body, 1.0, 0.9, 0.9, fur, ink, 0, 1.65, 0.95); // head
  inked(u.body, 0.5, 0.35, 0.3, M(0xfff8e1), ink, 0, 1.45, 1.5); // snout
  B(u.body, 0.2, 0.15, 0.08, ink, 0, 1.6, 1.66); // nose
  B(u.body, 0.2, 0.25, 0.1, M(0xf06292), 0, 1.22, 1.6); // tongue
  for (const x of [-0.25, 0.25]) B(u.body, 0.14, 0.2, 0.06, ink, x, 1.85, 1.41);
  for (const s of [-1, 1]) inked(u.body, 0.22, 0.7, 0.45, spot, ink, s * 0.6, 1.6, 0.9).rotation.z = s * 0.2; // floppy ears
  inked(u.body, 0.2, 0.7, 0.2, fur, ink, 0, 1.6, -0.95).rotation.x = -0.5; // tail
  u.muzzles.push(mz(u.body, 0, 1.4, 1.7));
  u.height = 2.1;
  u.tracer = 0xffe082;
  return u;
}

function sJem() {
  const { u, M, ink } = doodleUnit();
  const gem = M(0x00e5ff);
  const g = group(u.body, 0, 1.6, 0);
  const d = inked(g, 1.1, 1.1, 1.1, gem, ink);
  d.rotation.z = Math.PI / 4;
  inked(g, 0.5, 0.5, 1.15, M(0x84ffff), ink, 0, 0.35, 0).rotation.z = Math.PI / 4; // facet shine
  for (const x of [-0.22, 0.22]) B(g, 0.14, 0.24, 0.06, ink, x, 0.05, 0.6);
  B(g, 0.25, 0.06, 0.06, ink, 0, -0.2, 0.6);
  // Little blaster on a stubby arm
  inked(g, 0.5, 0.18, 0.18, gem, ink, -0.85, -0.1, 0.2);
  inked(g, 0.3, 0.3, 0.7, M(0xff4081), ink, -1.1, -0.1, 0.45);
  u.muzzles.push(mz(g, -1.1, -0.1, 0.85));
  B(u.body, 0.8, 0.06, 0.8, M(0x80deea), 0, 0.1, 0); // hover glow on the ground
  u.height = 2.5;
  u.tracer = 0x00e5ff;
  return u;
}

function sSnow() {
  const { u, M, ink } = doodleUnit();
  const snow = M(0xfafafa);
  inked(u.body, 1.4, 1.1, 1.4, snow, ink, 0, 0.55, 0);
  inked(u.body, 1.1, 0.9, 1.1, snow, ink, 0, 1.55, 0);
  inked(u.body, 0.85, 0.8, 0.85, snow, ink, 0, 2.4, 0);
  for (const x of [-0.2, 0.2]) B(u.body, 0.12, 0.12, 0.06, ink, x, 2.55, 0.44);
  B(u.body, 0.14, 0.14, 0.5, M(0xff7043), 0, 2.4, 0.6); // carrot nose
  for (const y of [1.35, 1.7]) B(u.body, 0.12, 0.12, 0.06, ink, 0, y, 0.56); // coal buttons
  inked(u.body, 1.15, 0.22, 1.15, M(0xe53935), ink, 0, 2.0, 0); // scarf
  inked(u.body, 0.9, 0.12, 0.9, M(0x1e88e5), ink, 0, 2.85, 0); // bucket hat
  inked(u.body, 0.6, 0.4, 0.6, M(0x1e88e5), ink, 0, 3.05, 0);
  const twig = M(0x6d4c41);
  B(u.body, 0.9, 0.1, 0.1, twig, 0.95, 1.7, 0).rotation.z = 0.4;
  B(u.body, 0.1, 0.1, 0.9, twig, -0.65, 1.7, 0.4);
  inked(u.body, 0.35, 0.35, 0.35, snow, ink, -0.65, 1.75, 0.9); // snowball
  u.muzzles.push(mz(u.body, -0.65, 1.75, 1.1));
  u.height = 3.2;
  u.tracer = 0xe3f2fd;
  u.projectile = { color: 0xfafafa, size: 0.35, arc: 1 };
  return u;
}

function sDoug() {
  const { u, M, ink } = doodleUnit();
  const skin = M(0x9575cd);
  const dark = M(0x5e35b1);
  for (const x of [-0.65, 0.65]) inked(u.body, 0.8, 1.0, 0.9, dark, ink, x, 0.5, 0);
  inked(u.body, 2.4, 2.0, 1.6, skin, ink, 0, 2.0, 0);
  inked(u.body, 1.4, 0.9, 0.06, M(0xd1c4e9), ink, 0, 1.8, 0.82); // belly
  inked(u.body, 1.0, 0.8, 0.9, skin, ink, 0, 3.4, 0.2); // head
  for (const x of [-0.22, 0.22]) {
    B(u.body, 0.18, 0.14, 0.06, ink, x, 3.5, 0.66);
    B(u.body, 0.3, 0.07, 0.06, ink, x, 3.66, 0.66).rotation.z = x > 0 ? 0.4 : -0.4; // angry brows
  }
  B(u.body, 0.4, 0.08, 0.06, ink, 0, 3.2, 0.66);
  inked(u.body, 0.8, 1.6, 0.8, skin, ink, 1.6, 1.9, 0.2); // left arm
  inked(u.body, 1.1, 1.0, 1.1, skin, ink, 1.6, 0.9, 0.3); // big fist
  // Cannon arm
  const c = group(u.body, -1.6, 2.2, 0.2);
  inked(c, 0.9, 0.9, 0.9, dark, ink);
  inked(c, 0.7, 0.7, 2.0, M(0xffca28), ink, 0, 0, 1.2);
  inked(c, 0.9, 0.9, 0.3, M(0xff7043), ink, 0, 0, 2.2);
  u.muzzles.push(mz(c, 0, 0, 2.4));
  u.height = 4;
  u.tracer = 0xffca28;
  return u;
}

function sCrab() {
  const { u, M, ink } = doodleUnit();
  const shell = M(0xff5252);
  const metal = M(0x90a4ae);
  inked(u.body, 2.2, 0.9, 1.6, shell, ink, 0, 1.2, 0);
  for (const sd of [-1, 1]) {
    for (const z of [-0.5, 0, 0.5]) inked(u.body, 0.9, 0.18, 0.18, metal, ink, sd * 1.4, 0.65, z).rotation.z = sd * -0.7;
    // Claws
    inked(u.body, 0.25, 0.25, 0.9, metal, ink, sd * 1.0, 1.1, 1.1);
    inked(u.body, 0.6, 0.5, 0.6, shell, ink, sd * 1.05, 1.15, 1.6);
    B(u.body, 0.62, 0.12, 0.3, ink, sd * 1.05, 1.15, 1.8);
    // Eye stalks
    B(u.body, 0.12, 0.5, 0.12, metal, sd * 0.4, 1.85, 0.6);
    inked(u.body, 0.28, 0.28, 0.28, M(0xffffff), ink, sd * 0.4, 2.15, 0.6);
    B(u.body, 0.12, 0.12, 0.06, ink, sd * 0.4, 2.15, 0.76);
  }
  // Long cannon on a turret
  const t = group(u.body, 0, 1.75, -0.2);
  u.turret = t;
  inked(t, 1.0, 0.5, 1.0, M(0x546e7a), ink, 0, 0.2, 0);
  inked(t, 0.3, 0.3, 2.8, M(0x37474f), ink, 0, 0.3, 1.6);
  B(t, 0.4, 0.4, 0.2, M(0xffca28), 0, 0.3, 3.0);
  u.muzzles.push(mz(t, 0, 0.3, 3.1));
  u.height = 2.4;
  u.tracer = 0xff5252;
  return u;
}

/* ================================================================== 7. Kart Kid (the tower: machines8.js) */

/** A cardboard-box kart with the hooded kid in it. Returns { g, wheels }. */
function kartShape(u, M, parent, s, painted) {
  const g = group(parent, 0, 0, 0, s);
  const box = M(painted ? 0xe53935 : 0xc8a165);
  const tape = M(painted ? 0xfafafa : 0xe6d3a8);
  B(g, 1.8, 0.9, 2.6, box, 0, 0.8, 0);
  B(g, 1.6, 0.06, 2.4, M(painted ? 0x7f1010 : 0x8a6a3a), 0, 1.24, 0); // inside
  B(g, 0.3, 0.92, 2.62, tape, 0, 0.8, 0); // tape / racing stripe
  for (const sd of [-1, 1]) B(g, 0.06, 0.5, 2.2, box, sd * 0.95, 1.4, 0).rotation.z = sd * 0.5; // flaps
  if (!painted) B(g, 1.6, 0.06, 0.5, box, 0, 1.35, 1.45).rotation.x = 0.6;
  // Round wheels from the vehicle kit, on little axles
  const wheels = [];
  const ws = painted ? 0.85 : 0.7;
  for (const z of [-0.85, 0.85]) {
    B(g, 2.0, 0.1, 0.1, M(0x3a3d40), 0, ws / 2, z);
    for (const x of [-1.0, 1.0]) {
      const w = part(g, wheelGeo(ws / 2, 0.36, x, { rim: painted ? 0xffc400 : 0x9e9e9e, lugs: false }), vcMat(u), x, ws / 2, z);
      w.userData.r = (ws / 2) * s;
      wheels.push(w);
    }
  }
  // The kid: a white body and a tall pointed hood with a stitched scar
  const white = M(0xf5f5f5);
  B(g, 0.85, 0.6, 0.65, white, 0, 1.5, -0.3);
  const hood = group(g, 0, 1.75, -0.25);
  B(hood, 0.9, 0.75, 0.85, white, 0, 0.35, 0);
  B(hood, 0.65, 0.5, 0.62, white, 0, 0.95, -0.05);
  B(hood, 0.42, 0.45, 0.42, white, 0, 1.4, -0.12);
  const tipB = B(hood, 0.22, 0.45, 0.22, white, 0, 1.8, -0.22);
  tipB.rotation.x = -0.4;
  B(hood, 0.55, 0.45, 0.05, M(0x1a1a1a), 0, 0.35, 0.43); // face opening
  for (const x of [-0.13, 0.13]) B(hood, 0.1, 0.12, 0.05, M(0xffffff), x, 0.4, 0.45);
  const scar = M(0x8b1a1a);
  B(hood, 0.05, 0.45, 0.05, scar, 0.22, 0.95, 0.27).rotation.z = 0.25;
  for (const y of [0.8, 0.95, 1.1]) B(hood, 0.2, 0.04, 0.05, scar, 0.22 - (y - 0.95) * 0.25, y, 0.28);
  // Arms on a steering wheel
  for (const x of [-0.3, 0.3]) B(g, 0.2, 0.2, 0.6, white, x, 1.55, 0.2);
  B(g, 0.6, 0.5, 0.08, M(0x212121), 0, 1.55, 0.55);
  if (painted) {
    // Spoiler and twin exhausts
    for (const x of [-0.55, 0.55]) B(g, 0.1, 0.5, 0.1, M(0x212121), x, 1.45, -1.2);
    B(g, 1.9, 0.12, 0.5, M(0x212121), 0, 1.75, -1.25);
    for (const x of [-0.45, 0.45]) {
      B(g, 0.2, 0.2, 0.4, M(0xb0bec5), x, 0.6, -1.45);
      B(g, 0.16, 0.16, 0.1, glowThing(u, 0xff6d00), x, 0.6, -1.66);
    }
    B(g, 0.06, 0.5, 0.5, M(0xfafafa), 0.92, 0.85, 0.3); // number plate
    B(g, 0.07, 0.3, 0.08, M(0x111111), 0.94, 0.85, 0.3);
  }
  return { g, wheels };
}

function kartUnit(painted) {
  return () => {
    const u = newUnit();
    const M = mm(u);
    const k = kartShape(u, M, u.body, 1.1, painted);
    u.wheels.push(...k.wheels);
    u.muzzles.push(mz(k.g, 0, 0.8, 1.4));
    u.height = 3.6;
    u.tracer = painted ? 0xe53935 : 0xc8a165;
    return u;
  };
}

/* ================================================================== 8. El Goblino */

/* ================================================================== 9. Chaos Jester */

function chaosToy() {
  return squad(newUnit(), 1, () => {
    const h = makeHumanoid({ skin: 0xffccbc, shirt: 0xd32f2f, pants: 0x1a237e, arms: 0xd32f2f, face: 'soldier' });
    const M = mm(h);
    const gold = M(0xffc400);
    // Tall shako hat with a plume
    B(h.head, 1.25, 1.1, 1.25, M(0x111111), 0, 1.7, 0);
    B(h.head, 0.4, 0.4, 0.06, gold, 0, 1.6, 0.64);
    B(h.head, 0.2, 0.6, 0.2, M(0xfafafa), 0, 2.5, 0.3);
    B(h.head, 1.3, 0.12, 0.5, M(0x111111), 0, 1.15, 0.6); // visor
    for (const x of [-0.4, 0.4]) B(h.head, 0.2, 0.15, 0.05, M(0xff8a80), x, 0.4, 0.61); // painted cheeks
    // Crossed white belts and gold buttons
    for (const sd of [-1, 1]) B(h.torso, 0.25, 2.6, 1.06, M(0xfafafa), 0, 0, 0).rotation.z = sd * 0.7;
    for (const y of [-0.5, 0, 0.5]) B(h.torso, 0.15, 0.15, 0.06, gold, 0, y, 0.55);
    for (const leg of [h.leftLeg, h.rightLeg]) B(leg, 1.05, 0.5, 1.15, M(0x111111), 0, -1.75, 0.05);
    // Wind-up key on the back
    B(h.torso, 0.2, 0.2, 0.8, gold, 0, 0.2, -0.9);
    B(h.torso, 1.4, 0.2, 0.15, gold, 0, 0.2, -1.35);
    for (const sd of [-1, 1]) {
      B(h.torso, 0.15, 0.8, 0.15, gold, sd * 0.7, 0.2, -1.35);
      B(h.torso, 0.5, 0.15, 0.15, gold, sd * 0.45, 0.55, -1.35);
      B(h.torso, 0.5, 0.15, 0.15, gold, sd * 0.45, -0.15, -1.35);
    }
    // Popgun with a cork
    const gun = inHand(h.rightArm, -1.9);
    B(gun, 0.3, 1.6, 0.36, M(0x8d6e63), 0, -0.8, 0);
    B(gun, 0.4, 0.3, 0.45, gold, 0, -1.55, 0);
    B(gun, 0.26, 0.25, 0.26, M(0xd7b46a), 0, -1.8, 0); // cork
    h.muzzles = [mz(gun, 0, -1.95, 0)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
    h.tracer = 0xd7b46a;
    h.projectile = { color: 0xd7b46a, size: 0.3 };
    return h;
  });
}

function chaosBall() {
  const u = newUnit();
  const M = mm(u);
  const g = group(u.body, 0, 1.3, 0);
  blob(g, M(0xfafafa), 2.6, 2.6, 2.6);
  const cols = [0xe53935, 0x1e88e5, 0xffc400];
  [-0.9, -0.3, 0.3, 0.9].forEach((y, i) => blobBands(g, M(cols[i % 3]), 2.6, 2.6, 2.6, 0, 0, 0, [y], 0.28));
  // Face (on top of the stripes)
  const ink = M(0x1a1a1a);
  for (const x of [-0.45, 0.45]) {
    B(g, 0.4, 0.45, 0.06, M(0xffffff), x, 0.4, 1.33);
    B(g, 0.2, 0.28, 0.06, ink, x, 0.38, 1.36);
  }
  B(g, 1.0, 0.3, 0.06, M(0x4a0d1e), 0, -0.3, 1.33);
  for (const sd of [-1, 1]) B(g, 0.25, 0.12, 0.06, M(0x4a0d1e), sd * 0.55, -0.15, 1.33).rotation.z = sd * 0.5;
  for (let i = 0; i < 5; i++) B(g, 0.13, 0.12, 0.06, M(0xffffff), -0.3 + i * 0.15, -0.2, 1.36);
  B(g, 0.4, 0.4, 0.4, glowThing(u, 0xffea00), 0, 1.4, 0).rotation.set(0, Math.PI / 4, Math.PI / 4); // star on top
  u.muzzles.push(mz(g, 0, 0, 1.4));
  u.height = 2.8;
  u.tracer = 0xe53935;
  return u;
}

function chaosClown() {
  return squad(newUnit(), 1, () => {
    const h = makeHumanoid({ skin: 0xfafafa, shirt: 0xfdd835, pants: 0x7e57c2, arms: 0xfdd835, face: 'smile' });
    const M = mm(h);
    h.size = 1.4;
    B(h.head, 0.4, 0.4, 0.3, M(0xe53935), 0, 0.5, 0.7); // red nose
    // Rainbow wig tufts
    for (const [x, y, c] of [[-0.75, 0.9, 0xff7043], [0.75, 0.9, 0x43a047], [-0.75, 0.5, 0x1e88e5], [0.75, 0.5, 0xec407a], [0, 1.35, 0xffc400]])
      B(h.head, 0.5, 0.5, 0.9, M(c), x, y, -0.05);
    B(h.head, 0.5, 0.3, 0.5, M(0x111111), 0, 1.7, 0); // tiny hat
    // Polka dots and a ruffle collar
    for (const [x, y, c] of [[-0.5, 0.4, 0xe53935], [0.5, -0.3, 0x1e88e5], [-0.3, -0.6, 0x43a047], [0.4, 0.6, 0xec407a]])
      B(h.torso, 0.3, 0.3, 0.06, M(c), x, y, 0.52);
    B(h.torso, 2.5, 0.35, 1.4, M(0xfafafa), 0, 1.0, 0);
    for (const leg of [h.leftLeg, h.rightLeg]) B(leg, 1.2, 0.5, 2.0, M(0xe53935), 0, -1.75, 0.5); // big shoes
    // Bubble tank on the back
    B(h.torso, 1.2, 1.6, 0.7, M(0x26c6da), 0, 0, -0.85);
    B(h.torso, 0.5, 0.5, 0.06, clear(h, 0xe1f5fe, 0.7), 0, 0.3, -1.22);
    // Bubble cannon
    const gun = inHand(h.rightArm, -1.9);
    B(gun, 0.6, 2.0, 0.6, M(0x26c6da), 0, -1.0, 0);
    B(gun, 0.9, 0.4, 0.9, M(0xec407a), 0, -2.1, 0);
    B(gun, 0.7, 0.7, 0.7, clear(h, 0xb3e5fc, 0.55), 0, -2.6, 0); // bubble
    h.muzzles = [mz(gun, 0, -2.4, 0)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
    h.tracer = 0x80deea;
    h.projectile = { color: 0xb3e5fc, size: 0.6 };
    return h;
  });
}

/* ------------------------------------------------------------------ exports */

export const TOWER_MODELS_H = {
};

export const UNIT_MODELS_H = {
  oddport1: oddportUnit(1),
  oddport2: oddportUnit(2),
  oddport3: oddportUnit(3),
  oddport4: oddportUnit(4),
  oddport5: oddportUnit(5),
  kslime,
  kslimeFire,
  slimeKingUnit,
  hcrow,
  bbee,
  nuki,
  nukiElite,
  sWuffle,
  sJem,
  sSnow,
  sDoug,
  sCrab,
  kart: kartUnit(false),
  kart2: kartUnit(true),
  chaosToy,
  chaosBall,
  chaosClown,
};

/** The old blocky Chaos Jester: the Last Laugh JESTER boss (jester.js) is built on it. The tower itself is people23.js. */
export function jesterChaos(level) {
  const h = makeHumanoid({ skin: 0xfafafa, shirt: 0xfafafa, pants: 0xec407a, arms: 0xf8bbd0 });
  const M = mm(h);
  h.head.remove(h.head.children[0]);
  const pink = M(0xec407a);
  const pale = M(0xfafafa);
  const ink = M(0x1a1a1a);
  // Round white face
  blob(h.head, pale, 1.8, 1.7, 1.5, 0, 0.9, 0);
  for (const sd of [-1, 1]) {
    B(h.head, 0.45, 0.14, 0.06, ink, sd * 0.38, 1.15, 0.78).rotation.z = sd * 0.35; // slanted eyes
    B(h.head, 0.18, 0.18, 0.06, pink, sd * 0.62, 0.62, 0.77).rotation.z = Math.PI / 4; // cheek diamonds
  }
  B(h.head, 1.15, 0.36, 0.06, M(0x4a0d1e), 0, 0.62, 0.78); // wide grin
  for (const sd of [-1, 1]) B(h.head, 0.25, 0.12, 0.06, M(0x4a0d1e), sd * 0.62, 0.76, 0.78).rotation.z = sd * 0.5;
  for (let i = 0; i < 7; i++) B(h.head, 0.12, 0.12, 0.06, pale, -0.45 + i * 0.15, 0.73, 0.8);
  for (let i = 0; i < 6; i++) B(h.head, 0.12, 0.1, 0.06, pale, -0.38 + i * 0.15, 0.5, 0.8);
  // Floppy pink-and-white hat with drooping bell tips
  const gold = M(0xffc400);
  for (let i = 0; i < 6; i++) B(h.head, 0.32, 0.3, 1.62, i % 2 ? pale : pink, -0.8 + i * 0.32, 1.78, 0);
  B(h.head, 1.6, 0.5, 1.3, pink, 0, 2.1, -0.05);
  for (const sd of [-1, 1]) {
    const m = sd < 0 ? pink : pale;
    B(h.head, 0.55, 0.45, 0.5, m, sd * 0.95, 2.25, 0).rotation.z = -sd * 0.9;
    B(h.head, 0.42, 0.55, 0.42, m, sd * 1.35, 1.95, 0).rotation.z = -sd * 0.3;
    B(h.head, 0.32, 0.55, 0.32, m, sd * 1.45, 1.5, 0.05);
    B(h.head, 0.3, 0.3, 0.3, gold, sd * 1.45, 1.1, 0.05);
  }
  B(h.head, 0.45, 0.5, 0.6, pale, 0, 2.3, -0.75).rotation.x = 0.8;
  B(h.head, 0.35, 0.5, 0.35, pink, 0, 1.95, -1.05);
  B(h.head, 0.28, 0.28, 0.28, gold, 0, 1.6, -1.1);
  // Frilly pink ruffle collar
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = B(h.torso, 0.7, 0.35, 0.35, i % 2 ? pink : M(0xf48fb1), Math.sin(a) * 0.95, 1.05, Math.cos(a) * 0.6);
    r.rotation.set(0.3, a, 0);
  }
  // Pink diamonds on the white suit, a pink sleeve and a white leg for motley
  for (const [x, y] of [[-0.5, 0.3], [0.5, 0.3], [0, -0.4]]) B(h.torso, 0.5, 0.5, 1.04, pink, x, y, 0).rotation.z = Math.PI / 4;
  B(h.leftLeg, 1.02, 2.0, 1.02, pale, 0, -1, 0);
  for (const leg of [h.leftLeg, h.rightLeg]) {
    B(leg, 1.0, 0.3, 1.6, pink, 0, -1.9, 0.4); // curly shoes
    B(leg, 0.3, 0.4, 0.3, pink, 0, -1.65, 1.2);
    B(leg, 0.25, 0.25, 0.25, gold, 0, -1.35, 1.2);
  }
  // Juggled items arcing over his head
  const items = [
    (p) => B(p, 0.65, 0.65, 0.12, glowThing(h, 0xffc400), 0, 0, 0), // gold coin
    (p) => B(p, 0.5, 0.5, 0.5, pale, 0, 0, 0), // white ball
  ];
  if (level >= 1) {
    items.push((p) => B(p, 0.45, 0.6, 0.06, M(0xe53935), 0, 0, 0).rotation.z = 0.3); // a card
    items.push((p) => B(p, 0.45, 0.45, 0.45, glowThing(h, 0xe040fb), 0, 0, 0).rotation.set(0.6, 0.6, 0)); // a magic cube
  }
  if (level >= 4) items.push((p) => B(p, 0.5, 0.5, 0.5, glowThing(h, 0x00e5ff), 0, 0, 0));
  items.forEach((mk, i) => {
    const a = (i / Math.max(1, items.length - 1)) * Math.PI;
    const g = group(h.body, Math.cos(a) * 1.9, 8.4 + Math.sin(a) * 0.9, 0.4);
    mk(g);
  });
  if (level >= 2) {
    // A pair of big dice
    for (const [x, z, r] of [[1.9, 1.3, 0.3], [2.4, 0.4, -0.5]]) {
      const d = group(h.body, x, 0.4, z);
      d.rotation.y = r;
      B(d, 0.8, 0.8, 0.8, pale, 0, 0, 0);
      B(d, 0.15, 0.15, 0.06, ink, 0, 0, 0.41);
      for (const sx of [-0.22, 0.22]) B(d, 0.12, 0.12, 0.06, ink, sx, 0.22 * Math.sign(sx), 0.41);
      B(d, 0.15, 0.06, 0.15, M(0xe53935), 0, 0.41, 0);
    }
  }
  if (level >= 3) {
    // Wheel of fortune behind him
    const w = group(h.body, 0, 5.2, -1.6);
    B(h.body, 0.3, 4.0, 0.3, M(0x6d4c41), 0, 2.4, -1.75);
    const cols = [0xe53935, 0xffc400, 0x1e88e5, 0x43a047, 0xec407a, 0x8e24aa, 0xff7043, 0x00acc1];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const s = B(w, 0.85, 1.5, 0.15, M(cols[i]), Math.sin(a) * 0.75, Math.cos(a) * 0.75, 0);
      s.rotation.z = -a;
    }
    B(w, 3.2, 0.15, 0.2, gold, 0, 0, -0.05);
    B(w, 0.15, 3.2, 0.2, gold, 0, 0, -0.05);
    B(w, 0.5, 0.5, 0.3, gold, 0, 0, 0.1);
    B(w, 0.3, 0.45, 0.1, M(0x212121), 0, 1.75, 0.12); // pointer
  }
  if (level >= 4) {
    // Jack-in-the-box stage: he springs out of a striped box
    h.lift = 2.0;
    h.bob = 0.08;
    const box = group(h.root);
    for (let i = 0; i < 5; i++) B(box, 0.7, 2.0, 3.4, M(i % 2 ? 0xfafafa : 0xec407a), -1.4 + i * 0.7, 1.0, 0);
    B(box, 3.5, 0.15, 3.5, gold, 0, 2.0, 0);
    const lid = B(box, 3.4, 0.15, 3.4, M(0xec407a), 0, 2.8, -2.2);
    lid.rotation.x = -1.2;
    B(box, 0.3, 0.15, 0.15, M(0x9e9e9e), 1.8, 1.2, 0.4); // crank axle
    B(box, 0.15, 0.6, 0.15, M(0x9e9e9e), 1.85, 1.4, 0.4);
    B(box, 0.3, 0.2, 0.2, gold, 1.85, 1.75, 0.4);
    for (const x of [-1.4, 1.4]) B(box, 0.3, 0.3, 0.3, glowThing(h, 0xfff176), x, 2.2, 1.6); // stage lights
  }
  const hand = inHand(h.rightArm);
  B(hand, 0.45, 0.45, 0.45, glowThing(h, 0xff4081), 0, -0.3, 0);
  h.muzzles = [mz(hand, 0, -0.3, 0)];
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-2.4, 0, -0.3);
  h.pose = { right: -2.8, left: -2.4, leftRecoil: 0 };
  h.swing = 1.9;
  h.tracer = 0xff4081;
  h.projectile = { color: 0xff4081, size: 0.6, arc: 4, glowing: true };
  return h;
}
