// Tower models: Tower Blitz heroes, batch 2 (rebuilt with the vehicle kit in ../vehicles.js).
// In here: Byte (a retro computer robot), Lure (a ghost cat in a clay pot), Soda Pop (a worried
// mouse), Hotdog Frank (a hotdog with corndog clubs), Bunny (an egg-throwing bunny).
// Each makeX(level) builds one tower's look, with its whole upgrade progression (rank colours,
// signature pieces, the max-level effect and growth) that newmodels/blitzup.js used to add.
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.

import * as THREE from 'three';
import { glowMat, kit, tone } from '../vehicles.js';
import { gunMuzzle, makeThing, setMuzzle } from './bits.js';
import { lv, spinner } from './machines5.js';

const PI = Math.PI;
const INK = 0x1a1a1a;
const WOOD = 0x8d6e63;
const PASTEL = [0xb2ebf2, 0xf8bbd0, 0xfff59d, 0xc5e1a5, 0xd1c4e9];

// ------------------------------------------------------------------ small shared pieces

/** A group on `parent` at (x, y, z), turned by (rx, ry, rz). */
function grp(parent, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.set(rx, ry, rz);
  parent.add(g);
  return g;
}

/**
 * A creature rig: makeThing() with empty groups where a person has a torso, head, arms and legs,
 * so the view still swings and kicks its arms (anim.js legacyTower).
 */
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

/** Sets both arms' rest rotation and the matching view pose. */
function pose(h, right, left, rz = 0.1, lz = -0.1, leftRecoil = 0) {
  h.rightArm.rotation.set(right, 0, rz);
  h.leftArm.rotation.set(left, 0, lz);
  h.pose = { right, left, leftRecoil };
}

/** A group at the end of an arm (things in it hang down -y). With `upright` = the arm's x turn, it stays level. */
function hand(arm, y = -1.9, upright = null) {
  const g = grp(arm, 0, y, 0);
  if (upright != null) g.rotation.x = -upright;
  return g;
}

/** A glowing see-through material that stays see-through when the tower fades. */
function ghost(u, color, op, intensity = 0.6) {
  const m = glowMat(u, color, intensity);
  m.transparent = true;
  m.opacity = op;
  m.depthWrite = false;
  m.userData.keepOpacity = op;
  return m;
}

/** A group that keeps turning (and bobbing): the views turn every group in `h.drift`. */
function drifter(h, parent, y, speed = 0.8, bob = 0) {
  const g = grp(parent, 0, y, 0);
  g.userData.speed = speed;
  g.userData.bob = bob;
  g.userData.y = y;
  (h.drift ??= []).push(g);
  return g;
}

/**
 * `n` things circling the tower at height y, radius r: make(k, x, z, i, a) draws each one with the
 * kit `k` at (x, 0, z). Returns the turning group.
 */
function orbit(h, key, y, r, n, make, speed = 0.9, bob = 0.25, parent = h.root) {
  const g = drifter(h, parent, y, speed, bob);
  const k = kit(h, g, key);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2;
    make(k, Math.cos(a) * r, Math.sin(a) * r, i, a);
  }
  k.done();
  return g;
}

/** A flat ring of glowing tiles on the ground (slowly turning). */
function groundRing(h, key, r, n, mat, speed = 0.4, w = 0.9) {
  return orbit(h, key, 0.07, r, n, (k, x, z, i, a) => k.box(w, 0.06, 0.24, mat, x, 0, z, { ry: -a + PI / 2 }), speed, 0);
}

/** Makes the model a bit bigger (the max-level hero form). */
function grow(h, f) {
  h.body.scale.multiplyScalar(f);
}

/** A soda can standing on (x, y, z), `s` = scale: coloured body, white label band, a ring-pull top. */
function can(k, col, x, y, z, s = 1, o = {}) {
  const r = 0.25 * s;
  const len = 0.75 * s;
  k.cyl(r, len, col, x, y, z, { seg: 12, ...o });
  k.cyl(r * 1.03, len * 0.28, 0xfafafa, x, y, z, { seg: 12, ...o });
  if (!o.rz && !o.rx) {
    k.cyl(r * 0.8, 0.06 * s, 0xcfd8dc, x, y + len / 2 + 0.02 * s, z, { r2: r * 0.7, seg: 12 });
    k.torus(r * 0.85, 0.025 * s, 0xb0bec5, x, y + len / 2, z, { rx: PI / 2, seg: 12 });
    k.box(0.1 * s, 0.02, 0.16 * s, 0x90a4ae, x, y + len / 2 + 0.06 * s, z + 0.05 * s);
  }
}

/** An egg of size s at (x, y, z): pastel shell with a white painted band and dots. */
function egg(k, col, x, y, z, s = 1, o = {}) {
  const r = 0.25 * s;
  k.ball(r, col, x, y, z, { sy: 1.3, seg: 12, rows: 9, ...o });
  if (o.rx || o.rz) return;
  k.torus(r * 0.99, 0.035 * s, 0xffffff, x, y - 0.02 * s, z, { rx: PI / 2, seg: 14 });
  for (const a of [0.3, 2.4, 4.4]) k.ball(0.04 * s, tone(col, 0.75), x + Math.cos(a) * r * 0.85, y + 0.17 * s, z + Math.sin(a) * r * 0.85, { seg: 5, rows: 3 });
}

/** A woven basket of radius r standing on (x, y, z), with a handle. */
function basket(k, r, x, y, z, handle = true) {
  const W = 0xbc8f5a;
  k.cyl(r * 0.8, r * 0.9, W, x, y + r * 0.45, z, { r2: r, seg: 14 });
  for (let i = 0; i < 3; i++) k.torus(r * (0.84 + i * 0.07), 0.035, tone(W, 0.78), x, y + r * (0.15 + i * 0.3), z, { rx: PI / 2, seg: 14 });
  k.torus(r * 1.0, 0.06, tone(W, 0.85), x, y + r * 0.9, z, { rx: PI / 2, seg: 14 });
  if (handle) k.torus(r * 0.85, 0.05, tone(W, 0.7), x, y + r * 0.9, z, { arc: PI, seg: 12 });
}

/** A spoked wooden wheel of radius r, its axle along x, centred on (x, y, z). */
function cartWheel(k, r, x, y, z, col = 0x6d4c41) {
  k.torus(r * 0.9, r * 0.12, col, x, y, z, { ry: PI / 2, seg: 16 });
  k.cyl(r * 0.22, r * 0.5, tone(col, 0.85), x, y, z, { axis: 'x', seg: 8 });
  for (let i = 0; i < 6; i++) k.box(r * 0.1, r * 1.7, r * 0.1, col, x, y, z, { rx: (i * PI) / 6 });
}

// ------------------------------------------------------------------ Byte

/**
 * Byte (0-4): a boxy retro computer robot on stubby legs, a striped screen with a happy face and a
 * black cable ending in a plug (the muzzle). Lv 1 an antenna, Lv 2 a silver case and a longer
 * coiled cable, Lv 3 a second cable (second muzzle), a keyboard and sparks circling it, Lv 4 a dark
 * chrome case with a purple screen and glowing trim, an electric ring on the ground, and it grows.
 * A cooling fan on its back always turns.
 */
export function makeByte(level) {
  level = lv(level, 4);
  const u = makeThing();
  const top = level >= 4;
  const CASE = top ? 0x37474f : level >= 2 ? 0xcfd8dc : 0xf5ecd0;
  const CASED = top ? 0x263238 : level >= 2 ? 0x90a4ae : 0xe0d4b0;
  const scr = glowMat(u, top ? 0x4a148c : 0x1b5e20, top ? 0.6 : 0.3);
  const stripe = glowMat(u, top ? 0x7c4dff : 0x2e7d32, top ? 0.5 : 0.3);
  const face = glowMat(u, top ? 0xf3e5f5 : 0x76ff03);
  const red = glowMat(u, 0xff1744);
  const green = glowMat(u, 0x00e676);
  const trim = glowMat(u, 0xd500f9);
  const spark = glowMat(u, 0xffeb3b);
  const k = kit(u, u.body, `h2byte${level}`);
  // Stubby legs with bellows rings and wide feet
  for (const x of [-0.7, 0.7]) {
    k.box(0.85, 0.3, 1.15, 0x424242, x, 0.15, 0.15, { r: 0.1 });
    k.box(0.6, 0.06, 0.3, 0x616161, x, 0.32, 0.55);
    k.cyl(0.22, 0.65, 0x616161, x, 0.62, 0, { seg: 10 });
    for (const y of [0.45, 0.6, 0.75]) k.torus(0.24, 0.05, 0x4e4e4e, x, y, 0, { rx: PI / 2, seg: 12 });
  }
  // Base unit: a floppy drive, two buttons, a little rainbow badge, side vents, a seam
  k.box(2.9, 0.95, 2.4, CASE, 0, 1.4, 0, { r: 0.12 });
  k.box(2.94, 0.04, 2.44, CASED, 0, 1.12, 0);
  k.box(1.1, 0.26, 0.05, CASED, 0.55, 1.5, 1.2, { r: 0.02 });
  k.box(0.95, 0.07, 0.06, INK, 0.55, 1.5, 1.21);
  k.box(0.18, 0.1, 0.04, CASED, 0.95, 1.33, 1.21);
  k.cyl(0.07, 0.04, green, 0.2, 1.33, 1.21, { axis: 'z', seg: 8 });
  k.cyl(0.13, 0.08, red, -0.95, 1.42, 1.21, { axis: 'z', seg: 10 });
  k.cyl(0.13, 0.08, green, -0.6, 1.42, 1.21, { axis: 'z', seg: 10 });
  for (const x of [-0.95, -0.6]) k.torus(0.15, 0.03, CASED, x, 1.42, 1.2, { seg: 10 });
  [0xe53935, 0xff9800, 0xfdd835, 0x43a047, 0x1e88e5].forEach((c, i) => k.box(0.05, 0.22, 0.03, c, -0.25 + i * 0.06, 1.55, 1.21));
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) k.box(0.04, 0.08, 1.4, CASED, sx * 1.45, 1.25 + i * 0.13, -0.1);
  // Neck and the CRT monitor: a bezel with a tapered tube behind it
  k.cyl(0.55, 0.2, CASED, 0, 1.95, -0.2, { seg: 14 });
  k.box(1.6, 0.12, 1.4, CASE, 0, 2.06, -0.2, { r: 0.04 });
  k.box(2.7, 2.3, 1.2, CASE, 0, 3.15, 0.45, { r: 0.15 });
  k.cyl(1.0, 1.4, CASED, 0, 3.05, -0.8, { axis: 'z', r2: 1.55, seg: 4, rz: PI / 4 });
  for (let i = 0; i < 4; i++) k.box(1.0, 0.04, 0.08, tone(CASED, 0.8), 0, 3.85 - i * 0.02, -0.5 - i * 0.22, { rx: -0.35 });
  // Screen: dark frame, glass, scan lines, a happy face
  k.box(2.12, 1.72, 0.04, INK, 0, 3.2, 1.06);
  k.box(1.95, 1.55, 0.05, scr, 0, 3.2, 1.085);
  for (let i = 0; i < 5; i++) k.box(1.9, 0.05, 0.02, stripe, 0, 2.62 + i * 0.3, 1.115);
  for (const sx of [-1, 1]) k.box(0.22, 0.38, 0.03, face, sx * 0.42, 3.5, 1.125);
  k.torus(0.42, 0.06, face, 0, 3.0, 1.125, { arc: PI, rz: PI, seg: 12 });
  k.box(0.9, 0.08, 0.03, face, 0, 3.0, 1.125);
  for (const sx of [-1, 1]) k.box(0.14, 0.08, 0.03, face, sx * 0.72, 3.12, 1.125);
  // Under the screen: power light, two knobs, a speaker grille
  k.cyl(0.06, 0.04, green, -1.0, 2.17, 1.06, { axis: 'z', seg: 8 });
  for (const x of [0.75, 1.0]) k.cyl(0.08, 0.08, 0x757575, x, 2.17, 1.07, { axis: 'z', seg: 10 });
  for (let i = 0; i < 4; i++) k.box(0.04, 0.16, 0.03, CASED, -0.55 + i * 0.1, 2.17, 1.06);
  // Cooling fan housing on the back of the tube (the blades spin, below)
  k.torus(0.5, 0.06, CASED, 0, 3.05, -1.52, { seg: 16 });
  k.box(1.1, 0.06, 0.04, CASED, 0, 3.05, -1.54);
  k.box(0.06, 1.1, 0.04, CASED, 0, 3.05, -1.54);
  // Cables to plugs, coiled on the ground from Lv 2, a second one from Lv 3
  const coiled = level >= 2;
  const plugs = [];
  const cable = (sx) => {
    const x1 = sx * (coiled ? 2.0 : 1.85);
    const zEnd = coiled ? 2.6 : 2.1;
    const yEnd = coiled ? 1.2 : 0.9;
    k.tube([[sx * 1.4, 1.2, -0.5], [sx * 1.75, 1.0, -0.5], [sx * 1.85, 0.3, -0.2], [sx * 1.85, 0.12, 0.6], [x1, 0.15, zEnd - 0.9], [x1, yEnd * 0.6, zEnd - 0.55], [x1, yEnd, zEnd - 0.3]], 0.1, INK, { sides: 6 });
    k.cyl(0.16, 0.08, CASED, sx * 1.42, 1.2, -0.5, { axis: 'x', seg: 10 });
    if (coiled) for (let i = 0; i < 2; i++) k.torus(0.48 - i * 0.06, 0.09, INK, sx * 2.3, 0.12 + i * 0.15, -0.7, { rx: PI / 2, seg: 14 });
    k.cyl(0.14, 0.3, INK, x1, yEnd, zEnd - 0.42, { axis: 'z', r2: 0.2, seg: 10 });
    k.box(0.45, 0.45, 0.55, 0x9e9e9e, x1, yEnd, zEnd, { r: 0.06 });
    k.box(0.47, 0.06, 0.4, 0x757575, x1, yEnd + 0.1, zEnd);
    for (const px of [-0.12, 0.12]) k.box(0.08, 0.08, 0.3, 0xffd54f, x1 + px, yEnd, zEnd + 0.42);
    if (top) k.ball(0.14, spark, x1, yEnd, zEnd + 0.62, { seg: 4, rows: 2 });
    plugs.push([x1, yEnd, zEnd + 0.65]);
  };
  cable(-1);
  if (level >= 3) cable(1);
  if (level >= 1) {
    // Antenna (rabbit ears from Lv 3) with a red glowing tip
    k.cyl(0.18, 0.12, CASED, 0.8, 4.36, 0.2, { seg: 10 });
    const ears = level >= 3 ? [-0.25, 0.25] : [0];
    for (const rz of ears) {
      const tx = 0.8 - Math.sin(rz) * 1.3;
      const ty = 4.36 + Math.cos(rz) * 1.3;
      k.cyl(0.045, 1.3, 0x9e9e9e, (0.8 + tx) / 2, (4.36 + ty) / 2, 0.2, { rz, seg: 6 });
      k.ball(0.14, red, tx, ty + 0.05, 0.2, { seg: 8, rows: 6 });
    }
  }
  if (level >= 3) {
    // Keyboard on a stand in front
    k.box(0.3, 0.3, 0.6, CASED, 0, 1.4, 1.45);
    k.box(2.4, 0.22, 1.0, CASE, 0, 1.55, 2.1, { r: 0.06 });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) k.box(0.24, 0.08, 0.18, 0x5d5d5d, -0.9 + c * 0.3, 1.69, 1.76 + r * 0.22);
    k.box(1.2, 0.08, 0.16, 0x5d5d5d, 0, 1.69, 2.44);
  }
  if (top) {
    // Glowing purple trim round the bezel and the base
    for (const y of [2.02, 4.28]) k.box(2.5, 0.06, 0.06, trim, 0, y, 1.06);
    for (const sx of [-1, 1]) k.box(0.06, 2.1, 0.06, trim, sx * 1.33, 3.15, 1.0);
    k.box(2.6, 0.06, 0.04, trim, 0, 0.98, 1.21);
  }
  k.done();
  for (const [x, y, z] of plugs) gunMuzzle(u, u.body, x, y, z);
  // The fan blades
  const fan = spinner(u, u.body, 0, 3.05, -1.56, 'z');
  const fk = kit(u, fan, `h2byteFan${top ? 1 : 0}`);
  fk.cyl(0.13, 0.1, CASED, 0, 0, 0, { seg: 10 });
  for (let i = 0; i < 5; i++) fk.box(0.42, 0.03, 0.16, top ? 0x455a64 : 0x9e9e9e, Math.cos((i * 2 * PI) / 5) * 0.25, 0, Math.sin((i * 2 * PI) / 5) * 0.25, { ry: (-i * 2 * PI) / 5, rx: 0.4 });
  fk.done();
  u.idleSpin = 5;
  if (level >= 3) {
    // Sparks circling it: little zig-zag bolts
    const blue = glowMat(u, 0x40c4ff);
    orbit(u, `h2byteSparks`, 3.0, 2.2, 5, (sk, x, z, i, a) => {
      const m = i % 2 ? blue : spark;
      sk.box(0.08, 0.32, 0.08, m, x, 0.12, z, { rz: 0.5, ry: -a });
      sk.box(0.08, 0.32, 0.08, m, x, -0.12, z, { rz: -0.5, ry: -a });
      sk.ball(0.1, m, x, 0, z, { seg: 4, rows: 2 });
    }, 1.8, 0.25, u.body);
  }
  if (top) {
    groundRing(u, 'h2byteRing', 2.6, 12, glowMat(u, 0x7c4dff), 1.0, 0.8);
    grow(u, 1.1);
  }
  u.tracer = top ? 0xb388ff : 0x76ff03;
  return u;
}

// ------------------------------------------------------------------ Lure

/** A little floating wisp facing +z, at (x, y, z) in kit `k`. */
function wisp(k, mat, x, y, z, s = 1) {
  k.ball(0.4 * s, mat, x, y, z, { sy: 0.95, seg: 12, rows: 8 });
  k.cyl(0.3 * s, 0.6 * s, mat, x + 0.08 * s, y - 0.5 * s, z - 0.08 * s, { r2: 0, rz: PI - 0.4, seg: 8 });
  for (const sx of [-1, 1]) k.ball(0.06 * s, 0x004d40, x + sx * 0.15 * s, y + 0.06 * s, z + 0.37 * s, { sy: 1.5, seg: 6, rows: 4 });
}

/**
 * Lure (0-4): a ghost cat rising out of a dark green clay pot with a glowing rim, one paw raised.
 * Lv 1 a bigger pot with a glowing crack, Lv 2 glowing runes on the pot and rune stones round it,
 * Lv 3 the ghost turns violet and wisps circle it, Lv 4 a soul lantern on a post, a gold crown and
 * soul flames circling, and it grows.
 */
export function makeLure(level) {
  level = lv(level, 4);
  const h = rig();
  const violet = level >= 3;
  const bright = level >= 4;
  const cat = ghost(h, violet ? 0xd1c4e9 : 0xa7ffeb, bright ? 0.78 : 0.62, bright ? 0.85 : 0.5);
  const runeM = glowMat(h, violet ? 0xb388ff : 0x1de9b6);
  const rimM = glowMat(h, violet ? 0xb388ff : level >= 1 ? 0x64ffda : 0x1de9b6);
  const pinkM = glowMat(h, 0xf8bbd0, 0.5);
  const CLAY = 0x1f4d33;
  const CLAYD = 0x173a26;
  // The pot stands on the root, so it doesn't bob with the ghost
  const ps = [1, 1.15, 1.15, 1.2, 1.25][level];
  const pot = grp(h.root);
  pot.scale.setScalar(ps);
  const pk = kit(h, pot, `h2lurePot${level}`);
  pk.cyl(0.8, 0.3, CLAYD, 0, 0.15, 0, { r2: 0.72, seg: 18 });
  pk.ball(1.15, CLAY, 0, 1.0, 0, { sy: 0.72, seg: 20, rows: 12 });
  for (const y of [0.7, 1.3]) pk.torus(1.07, 0.05, CLAYD, 0, y, 0, { rx: PI / 2, seg: 22 });
  pk.cyl(0.92, 0.3, CLAY, 0, 1.75, 0, { r2: 1.02, seg: 20 });
  pk.torus(1.08, 0.15, CLAYD, 0, 1.9, 0, { rx: PI / 2, seg: 24 });
  pk.cyl(0.98, 0.05, rimM, 0, 1.86, 0, { seg: 20 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2 + 0.2;
    pk.box(0.12, 0.08, 0.06, tone(CLAY, 1.4), Math.cos(a) * 1.08, 1.0, Math.sin(a) * 1.08, { ry: -a + PI / 2 });
  }
  if (level >= 1) {
    pk.tube([[-0.5, 1.5, 0.83], [-0.33, 1.2, 1.02], [-0.5, 0.9, 1.1], [-0.4, 0.6, 0.95]], 0.045, rimM, { sides: 4 });
    pk.tube([[-0.33, 1.2, 1.02], [-0.12, 1.1, 1.1]], 0.035, rimM, { sides: 4 });
  }
  if (level >= 2) {
    // Runes carved into the pot's four sides
    for (const a of [0.5, PI / 2 + 0.3, PI + 0.3, -PI / 2 + 0.3]) {
      const at = (lx, ly) => [Math.sin(a) * 1.13 + Math.cos(a) * lx, 1.0 + ly, Math.cos(a) * 1.13 - Math.sin(a) * lx];
      pk.box(0.07, 0.5, 0.05, runeM, ...at(0, 0), { ry: a });
      pk.box(0.28, 0.07, 0.05, runeM, ...at(0.1, 0.12), { ry: a, rz: 0.5 });
      pk.box(0.24, 0.07, 0.05, runeM, ...at(-0.08, -0.15), { ry: a, rz: -0.5 });
    }
  }
  pk.done();
  if (level >= 2) {
    // Rune stones standing round the pot
    const rk = kit(h, h.root, `h2lureStones${violet ? 1 : 0}`);
    for (const a of [PI / 4, (3 * PI) / 4, (5 * PI) / 4, (7 * PI) / 4]) {
      const x = Math.cos(a) * 1.95;
      const z = Math.sin(a) * 1.95;
      const ry = PI / 2 - a;
      rk.box(0.55, 0.85, 0.28, 0x546e7a, x, 0.42, z, { r: 0.08, ry });
      rk.box(0.4, 0.12, 0.22, 0x455a64, x, 0.06, z, { ry });
      const fx = Math.cos(a) * 0.15;
      const fz = Math.sin(a) * 0.15;
      rk.box(0.06, 0.4, 0.04, runeM, x + fx, 0.5, z + fz, { ry });
      rk.box(0.22, 0.06, 0.04, runeM, x + fx, 0.55, z + fz, { ry, rz: 0.6 });
    }
    rk.done();
  }
  // The ghost cat, on the body (it bobs): a wispy column, body, head with pointed ears, a curly tail
  const base = 1.9 * ps;
  const ck = kit(h, h.body, `h2lureCat${level}`);
  ck.cyl(0.4, 0.9, cat, 0, base + 0.3, 0, { r2: 0.62, seg: 14 });
  for (let i = 0; i < 3; i++) ck.ball(0.2 - i * 0.04, cat, Math.cos(i * 2.1) * 0.5, base + 0.05 - i * 0.05, Math.sin(i * 2.1) * 0.5, { seg: 8, rows: 6 });
  ck.ball(0.78, cat, 0, base + 1.15, 0, { sy: 0.85, sz: 0.78, seg: 16, rows: 12 });
  ck.ball(0.88, cat, 0, base + 2.35, 0, { sy: 0.78, sz: 0.8, seg: 18, rows: 12 });
  const hy = base + 2.35;
  for (const s of [-1, 1]) {
    ck.cyl(0.3, 0.6, cat, s * 0.5, hy + 0.7, -0.05, { r2: 0.02, seg: 4, rz: -s * 0.35, ry: PI / 4 });
    ck.cyl(0.17, 0.4, pinkM, s * 0.47, hy + 0.66, 0.1, { r2: 0.01, seg: 4, rz: -s * 0.35, ry: PI / 4 });
    ck.ball(0.1, INK, s * 0.33, hy + 0.1, 0.63, { sy: 1.7, sz: 0.4, seg: 8, rows: 6 });
    ck.ball(0.035, 0xffffff, s * 0.33 - 0.03, hy + 0.18, 0.66, { seg: 5, rows: 3 });
    ck.ball(0.12, pinkM, s * 0.55, hy - 0.12, 0.5, { sz: 0.35, seg: 8, rows: 5 });
    for (const wy of [0.04, -0.08]) ck.box(0.62, 0.025, 0.025, INK, s * 0.85, hy - 0.08 + wy, 0.44, { rz: s * wy * 2 });
    ck.torus(0.07, 0.018, INK, s * 0.07, hy - 0.18, 0.69, { arc: PI, rz: PI, seg: 8 });
  }
  ck.ball(0.07, 0xf48fb1, 0, hy - 0.07, 0.7, { sx: 1.4, sz: 0.6, seg: 8, rows: 5 });
  ck.tube([[0.3, base + 0.8, -0.55], [0.8, base + 1.1, -0.85], [1.05, base + 1.7, -0.8], [0.85, base + 2.1, -0.6], [0.6, base + 2.0, -0.55]], 0.13, cat, { sides: 8 });
  if (bright) {
    // A gold crown between the ears
    const gold = glowMat(h, 0xffd54f, 0.6);
    const cy = hy + 0.62;
    ck.cyl(0.42, 0.22, gold, 0, cy, -0.02, { r2: 0.46, seg: 14 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      ck.cyl(0.08, 0.28, gold, Math.cos(a) * 0.4, cy + 0.24, -0.02 + Math.sin(a) * 0.4, { r2: 0, seg: 4 });
    }
    ck.ball(0.08, glowMat(h, 0xe040fb), 0, cy + 0.02, 0.44, { seg: 8, rows: 5 });
  }
  ck.done();
  // Paws: the right one raised
  h.rightArm.position.set(-0.85, base + 1.5, 0.25);
  h.leftArm.position.set(0.85, base + 1.4, 0.25);
  for (const arm of [h.rightArm, h.leftArm]) {
    const ak = kit(h, arm, `h2lurePaw${level}`);
    ak.ball(0.22, cat, 0, -0.35, 0, { sy: 1.9, seg: 10, rows: 8 });
    ak.ball(0.17, cat, 0, -0.72, 0.04, { seg: 8, rows: 6 });
    for (const x of [-0.08, 0.08]) ak.ball(0.04, pinkM, x, -0.86, 0.06, { seg: 5, rows: 3 });
    ak.done();
  }
  pose(h, -2.3, -0.5, 0.15, -0.2);
  if (violet) {
    // Wisps circling the ghost
    const wm = ghost(h, 0xe1bee7, 0.55, 0.7);
    orbit(h, `h2lureWisps${level}`, base + 2.2, 1.9, bright ? 4 : 3, (k, x, z, i, a) => wisp(k, wm, x, (i % 2) * 0.5, z, 0.85 - (i % 2) * 0.12), 0.6, 0.3, h.body);
  }
  if (bright) {
    // A soul lantern hanging from a little post
    const lk = kit(h, h.root, 'h2lureLantern');
    const lit = glowMat(h, 0x64ffda);
    lk.cyl(0.08, 2.6, 0x3e2723, -1.9, 1.3, 1.3, { seg: 8 });
    lk.box(0.3, 0.15, 0.3, 0x3e2723, -1.9, 0.07, 1.3);
    lk.box(0.65, 0.08, 0.1, 0x3e2723, -1.65, 2.55, 1.3);
    lk.cyl(0.02, 0.2, 0x212121, -1.4, 2.43, 1.3, { seg: 4 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      lk.box(0.05, 0.6, 0.05, 0x263238, -1.4 + Math.cos(a) * 0.3, 2.0, 1.3 + Math.sin(a) * 0.3);
    }
    lk.cyl(0.25, 0.52, lit, -1.4, 2.0, 1.3, { seg: 6 });
    lk.cyl(0.36, 0.22, 0x263238, -1.4, 2.4, 1.3, { r2: 0.08, seg: 6 });
    lk.cyl(0.33, 0.08, 0x263238, -1.4, 1.68, 1.3, { seg: 6 });
    lk.done();
    // Soul flames circling the tower
    const flames = [ghost(h, 0xb388ff, 0.8, 0.9), ghost(h, 0x18ffff, 0.8, 0.9)];
    orbit(h, 'h2lureFlames', 3.0, 2.3, 4, (k, x, z, i) => {
      k.ball(0.26, flames[i % 2], x, 0, z, { seg: 10, rows: 7 });
      k.cyl(0.24, 0.5, flames[i % 2], x, 0.32, z, { r2: 0, seg: 10 });
    }, 0.9, 0.25);
    grow(h, 1.1);
  }
  setMuzzle(h, h.body, 0, base + 2.15, 0.85);
  h.tracer = bright ? 0xa7ffeb : 0x64ffda;
  h.beam = h.tracer;
  h.bob = 0.2;
  return h;
}

// ------------------------------------------------------------------ Soda Pop

/**
 * Soda Pop (0-4): a worried lilac mouse who throws soda. Lv 1 a six-pack belt and a bandolier of
 * cans, Lv 2 a soda launcher and a red cap, Lv 3 a fizz tank on its back and a crate of soda at its
 * feet, Lv 4 a big soda cannon, a gold cap, fizz bubbles circling, and it grows.
 */
export function makeSodaPop(level) {
  level = lv(level, 4);
  const h = rig();
  const FUR = 0xb7a9c9;
  const FURD = 0x9a8cae;
  const PINK = 0xf8a5c2;
  const BELLY = 0xd8cfe4;
  const fizz = glowMat(h, 0xea80fc);
  const cans = [0xe53935, 0x43a047, 0x1e88e5, 0xff9800, 0x8e24aa];
  // Body, belly, a thin curly tail
  const tk = kit(h, h.torso, `h2sodaTorso${level}`);
  tk.box(1.7, 1.85, 1.0, FUR, 0, 0, 0, { r: 0.35 });
  tk.ball(0.6, BELLY, 0, -0.2, 0.38, { sy: 0.95, sz: 0.25, seg: 14, rows: 10 });
  if (level >= 1) {
    // Six-pack belt and a bandolier of cans across the chest
    tk.box(1.8, 0.25, 1.1, 0x6a1b9a, 0, -0.8, 0, { r: 0.08 });
    tk.box(0.3, 0.3, 0.06, 0xffd54f, 0, -0.8, 0.56, { r: 0.03 });
    for (let i = 0; i < 3; i++) for (const z of [0.68, -0.68]) if (i !== 1 || z < 0) can(tk, 0x8e24aa, -0.5 + i * 0.5, -0.75, z, 0.65);
    tk.box(0.3, 2.3, 0.08, 0x5d4037, 0, 0.05, 0.53, { rz: 0.7 });
    for (let i = 0; i < 4; i++) {
      const t = -0.8 + i * 0.52;
      can(tk, cans[i], -Math.sin(0.7) * t, 0.05 + Math.cos(0.7) * t, 0.68, 0.55, { rz: 0.7 });
    }
  }
  if (level >= 3) {
    // Fizz tank backpack: a purple tank with a see-through window, glowing bubbles and a hose
    tk.cyl(0.5, 1.3, 0x7b1fa2, 0, 0.2, -0.95, { seg: 14 });
    for (const y of [0.85, -0.45]) tk.ball(0.5, 0x7b1fa2, 0, y, -0.95, { sy: 0.35, seg: 14, rows: 6 });
    tk.box(0.28, 1.0, 0.06, 0xe1bee7, 0, 0.2, -1.43);
    for (const y of [-0.1, 0.25, 0.6]) tk.ball(0.08, fizz, (y - 0.25) * 0.3, y, -1.47, { seg: 6, rows: 4 });
    tk.cyl(0.1, 0.25, 0xcfd8dc, 0, 1.2, -0.95, { seg: 8 });
    tk.cyl(0.18, 0.06, 0xcfd8dc, 0, 1.12, -1.2, { axis: 'z', seg: 10 });
    for (const sx of [-1, 1]) tk.box(0.14, 1.5, 0.06, INK, sx * 0.5, 0.2, -0.5, { rx: 0.05 });
    tk.tube([[-0.35, -0.5, -1.15], [-0.85, -0.7, -0.8], [-1.0, -0.6, -0.2]], 0.08, 0x4a148c, { sides: 6 });
  }
  tk.done();
  const bk = kit(h, h.body, 'h2sodaTail');
  bk.tube([[0, 2.2, -0.45], [0.2, 2.3, -1.15], [0.6, 2.7, -1.7], [0.9, 3.3, -1.65], [0.8, 3.6, -1.35]], 0.07, PINK, { sides: 6 });
  bk.done();
  // Arms and legs: pink paws, long pink feet
  h.rightArm.position.x = -1.2;
  h.leftArm.position.x = 1.2;
  for (const arm of [h.rightArm, h.leftArm]) {
    const ak = kit(h, arm, 'h2sodaArm');
    ak.cyl(0.26, 1.5, FUR, 0, -0.75, 0, { r2: 0.3, seg: 10 });
    ak.ball(0.3, PINK, 0, -1.7, 0, { sy: 1.1, seg: 10, rows: 8 });
    ak.done();
  }
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const lk = kit(h, leg, 'h2sodaLeg');
    lk.cyl(0.3, 1.5, FURD, 0, -0.85, 0, { r2: 0.36, seg: 10 });
    lk.ball(0.34, PINK, 0, -1.82, 0.25, { sy: 0.5, sz: 1.6, seg: 12, rows: 8 });
    for (const x of [-0.15, 0, 0.15]) lk.ball(0.08, tone(PINK, 1.08), x, -1.8, 0.78, { seg: 6, rows: 4 });
    lk.done();
  }
  // Head: snout, worried eyes and brows, whiskers, big round ears, a tuft (a cap from Lv 2)
  const hk = kit(h, h.head, `h2sodaHead${level >= 2 ? (level >= 4 ? 2 : 1) : 0}`);
  hk.ball(0.75, FUR, 0, 0.62, 0, { sy: 0.85, sz: 0.85, seg: 16, rows: 12 });
  hk.ball(0.38, BELLY, 0, 0.36, 0.6, { sy: 0.7, sz: 0.8, seg: 12, rows: 8 });
  hk.ball(0.13, 0xf06292, 0, 0.47, 0.9, { sy: 0.8, seg: 8, rows: 6 });
  hk.torus(0.09, 0.025, INK, 0, 0.2, 0.83, { arc: PI, seg: 8 });
  for (const s of [-1, 1]) {
    hk.ball(0.12, INK, s * 0.3, 0.8, 0.55, { sy: 1.4, sz: 0.4, seg: 8, rows: 6 });
    hk.ball(0.04, 0xffffff, s * 0.3 - 0.04, 0.88, 0.59, { seg: 5, rows: 3 });
    hk.box(0.3, 0.06, 0.05, INK, s * 0.3, 1.04, 0.45, { rz: s * 0.4 });
    for (const wy of [0.04, -0.06]) hk.box(0.6, 0.025, 0.025, INK, s * 0.62, 0.38 + wy, 0.72, { rz: s * wy * 2 });
    hk.cyl(0.55, 0.14, FUR, s * 0.78, 1.35, -0.1, { axis: 'z', seg: 18, rz: s * 0.2 });
    hk.cyl(0.38, 0.06, PINK, s * 0.78, 1.35, -0.01, { axis: 'z', seg: 16 });
    hk.cyl(0.12, 0.06, 0xfadadd, s * 0.4, 0.55, 0.4, { axis: 'z', seg: 8, ry: s * 0.6 });
  }
  if (level >= 2) {
    const capC = level >= 4 ? 0xffc400 : 0xd32f2f;
    hk.ball(0.7, capC, 0, 1.05, 0, { sy: 0.5, seg: 16, rows: 8 });
    hk.box(0.95, 0.06, 0.6, capC, 0, 1.02, 0.78, { r: 0.025, rx: 0.12 });
    hk.cyl(0.08, 0.06, tone(capC, 0.7), 0, 1.4, 0, { seg: 8 });
    hk.box(0.36, 0.2, 0.04, 0xfafafa, 0, 1.2, 0.62, { rx: -0.5, r: 0.02 });
  } else {
    for (const [x, r] of [[-0.12, 0.4], [0.05, 0], [0.2, -0.4]]) hk.cyl(0.07, 0.4, FURD, x, 1.35, 0.15, { r2: 0.02, rz: r, seg: 6 });
  }
  hk.done();
  if (level >= 2) {
    // Soda launcher (a big soda cannon at Lv 4): purple tube, label band, chrome muzzle, a loaded can on top
    const big = level >= 4;
    const len = big ? 3.0 : 2.2;
    const w = big ? 1.0 : 0.65;
    const gun = hand(h.rightArm, -1.8);
    const gk = kit(h, gun, `h2sodaGun${big ? 1 : 0}`);
    gk.cyl(w / 2, len, 0x8e24aa, 0, -len / 2 + 0.5, 0, { seg: 14 });
    gk.cyl(w / 2 + 0.04, 0.4, 0xe1bee7, 0, -len / 2 + 0.3, 0, { seg: 14 });
    gk.cyl(w / 2 + 0.08, 0.22, 0xcfd8dc, 0, -len + 0.5, 0, { seg: 14 });
    gk.torus(w / 2 + 0.02, 0.05, 0x90a4ae, 0, -len + 0.4, 0, { rx: PI / 2, seg: 14 });
    gk.cyl(w * 0.36, 0.05, fizz, 0, -len + 0.38, 0, { seg: 12 });
    gk.ball(w / 2, 0x6a1b9a, 0, 0.5, 0, { sy: 0.4, seg: 14, rows: 6 });
    gk.box(0.25, 0.5, 0.3, 0x4a148c, 0, -0.1, -w / 2 - 0.1, { r: 0.05 });
    gk.cyl(0.14, 0.12, 0xfafafa, w / 2 + 0.04, -0.5, 0, { axis: 'x', seg: 10 }); // pressure gauge
    gk.box(0.03, 0.12, 0.02, 0xd32f2f, w / 2 + 0.11, -0.5, 0, { rx: 0.6 });
    can(gk, 0xe53935, 0, -0.5, w / 2 + 0.3, 0.8);
    for (const y of [-0.15, -0.85]) gk.box(0.12, 0.12, 0.3, 0x4a148c, 0, y, w / 2 + 0.12);
    if (big) {
      for (const sx of [-1, 1]) {
        gk.cyl(0.18, 1.3, 0xcfd8dc, sx * (w / 2 + 0.15), -1.2, 0, { seg: 10 });
        gk.ball(0.18, 0xcfd8dc, sx * (w / 2 + 0.15), -0.55, 0, { seg: 10, rows: 6 });
      }
      for (const y of [-1.4, -2.0]) gk.torus(w / 2 + 0.03, 0.04, fizz, 0, y, 0, { rx: PI / 2, seg: 14 });
    }
    gk.done();
    setMuzzle(h, gun, 0, -len + 0.3, 0);
    pose(h, -PI / 2, -PI / 2 + 0.15, 0.1, -0.5, 0.2);
  } else {
    const th = hand(h.rightArm, -2.0);
    const ck = kit(h, th, 'h2sodaCan');
    can(ck, 0x8e24aa, 0, -0.35, 0, 1.1);
    ck.done();
    setMuzzle(h, th, 0, -0.4, 0);
    pose(h, -2.8, -1.0, 0.2, -0.3);
    h.swing = 1.9;
  }
  if (level >= 3) {
    // A wooden crate of soda at its feet
    const cg = grp(h.root, -1.9, 0, 1.0, 0, 0.4);
    const xk = kit(h, cg, 'h2sodaCrate');
    xk.box(1.3, 0.7, 1.0, 0x8d6e63, 0, 0.35, 0, { r: 0.04 });
    for (const y of [0.15, 0.55]) for (const z of [-0.51, 0.51]) xk.box(1.32, 0.12, 0.04, 0x6d4c41, 0, y, z);
    for (const x of [-0.66, 0.66]) xk.box(0.06, 0.72, 1.04, 0x6d4c41, x, 0.35, 0);
    xk.box(0.5, 0.12, 0.04, 0x5d4037, 0, 0.35, 0.53);
    for (let i = 0; i < 6; i++) can(xk, cans[i % 5], -0.4 + (i % 3) * 0.4, 0.88, -0.2 + Math.floor(i / 3) * 0.4, 0.6);
    xk.done();
  }
  if (level >= 4) {
    // Fizz bubbles: a ring circling it and a few rising over the cannon
    const bub = [ghost(h, 0x80deea, 0.55, 0.6), ghost(h, 0xe0f7fa, 0.55, 0.6)];
    orbit(h, 'h2sodaBubbles', 2.0, 2.2, 9, (k, x, z, i) => {
      k.ball(0.18 + (i % 3) * 0.04, bub[i % 2], x, (i % 3) * 0.3, z, { seg: 10, rows: 7 });
    }, 0.7, 0.3);
    const fk = kit(h, h.body, 'h2sodaFloat');
    for (const [x, y, z, s] of [[-1.6, 4.4, 1.6, 0.35], [-0.6, 5.3, 2.6, 0.25], [-1.9, 5.5, 0.8, 0.3], [0.4, 4.7, 3.0, 0.2], [-1.2, 6.1, 2.0, 0.22]]) fk.ball(s / 2 + 0.05, bub[0], x, y, z, { seg: 10, rows: 7 });
    fk.done();
    grow(h, 1.1);
  }
  h.projectile = { color: 0x8e24aa, size: 0.8 + level * 0.1, arc: level >= 2 ? 3 : 4 };
  h.tracer = 0xea80fc;
  h.body.scale.multiplyScalar(0.88);
  return h;
}

// ------------------------------------------------------------------ Hotdog Frank

/** A corndog on a stick in kit `k` (hangs down -y from y0, size s). Returns the tip's y. */
function corndog(k, s, y0, drizzle) {
  const B = 0xd4892a;
  k.cyl(0.06, 0.75, 0xd7ccc8, 0, y0 - 0.25, 0, { seg: 6 });
  const len = 1.3 * s;
  const r = 0.26 * s;
  const mid = y0 - 0.55 - len / 2;
  k.cyl(r, len - 2 * r, B, 0, mid, 0, { seg: 12 });
  for (const sy of [-1, 1]) k.ball(r, B, 0, mid + sy * (len / 2 - r), 0, { seg: 12, rows: 6 });
  for (const f of [-0.25, 0.1, 0.4]) k.torus(r * 0.98, 0.03 * s, 0xb3661a, 0, mid + f * len * 0.6, 0, { rx: PI / 2, seg: 12 });
  if (drizzle) k.tube([[0.1, mid + len * 0.4, r * 0.95], [-r * 0.9, mid + len * 0.2, r * 0.3], [r * 0.9, mid, -r * 0.3], [-r * 0.9, mid - len * 0.2, r * 0.3], [0, mid - len * 0.35, r * 0.95]], 0.045 * s, 0xffd600, { sides: 5 });
  return mid - len / 2;
}

/** A squeeze bottle standing on (x, y, z): body, a cap and a pointed nozzle. */
function bottle(k, col, x, y, z, s = 1) {
  k.cyl(0.18 * s, 0.6 * s, col, x, y + 0.3 * s, z, { seg: 10 });
  k.ball(0.18 * s, col, x, y + 0.6 * s, z, { sy: 0.6, seg: 10, rows: 6 });
  k.cyl(0.1 * s, 0.12 * s, 0xfafafa, x, y + 0.74 * s, z, { seg: 8 });
  k.cyl(0.07 * s, 0.22 * s, col, x, y + 0.9 * s, z, { r2: 0.015, seg: 8 });
  k.cyl(0.185 * s, 0.14 * s, 0xfafafa, x, y + 0.3 * s, z, { seg: 10 });
}

/**
 * Hotdog Frank (0-4): a grinning hotdog in a bun on stubby legs, white cartoon gloves. Lv 1 a
 * corndog club, Lv 2 a condiment belt and two big squeeze bottles behind him, Lv 3 a red chef
 * bandana and a bigger corndog with mustard, Lv 4 a ninja hood, a corndog in each hand, a ring of
 * grill fire with embers circling, and he grows.
 */
export function makeFrank(level) {
  level = lv(level, 4);
  const h = rig();
  const BUN = 0xd9a35f;
  const BUND = 0xc08743;
  const DOG = 0xe57368;
  const CLOTH = 0x2b2b38;
  const ninja = level >= 4;
  h.torso.position.y = 2.6;
  const tk = kit(h, h.torso, `h2frank${level}`);
  // Bun halves with the sausage poking out both ends, a mustard squiggle on top
  tk.box(2.5, 1.0, 1.5, BUN, 0, 0.65, 0, { r: 0.3 });
  tk.box(2.5, 0.85, 1.5, BUND, 0, -0.5, 0, { r: 0.3 });
  for (const [x, z] of [[-0.8, 0.3], [-0.2, -0.35], [0.5, 0.4], [0.95, -0.2]]) tk.ball(0.05, 0xfff3e0, x, 1.15, z, { sy: 0.4, seg: 5, rows: 3 }); // sesame
  tk.cyl(0.42, 2.4, DOG, 0, 0.05, 0, { axis: 'x', seg: 16 });
  for (const s of [-1, 1]) {
    tk.ball(0.42, DOG, s * 1.25, 0.05, 0, { sx: 1.3, seg: 14, rows: 10 });
    for (const dx of [0.2, 0.4]) tk.torus(0.42 * Math.sqrt(1 - (dx / 0.546) ** 2), 0.025, tone(DOG, 0.8), s * (1.25 + dx), 0.05, 0, { ry: PI / 2, seg: 12 });
  }
  if (!ninja) {
    const pts = [];
    for (let i = 0; i < 9; i++) pts.push([-1.0 + i * 0.25, 1.17, i % 2 ? 0.28 : -0.28]);
    tk.tube(pts, 0.08, 0xffd600, { sides: 6, tension: 0.5 });
    // Big open grin and round eyes
    for (const s of [-1, 1]) {
      tk.ball(0.13, INK, s * 0.45, 0.85, 0.73, { sy: 1.3, sz: 0.4, seg: 8, rows: 6 });
      tk.ball(0.04, 0xffffff, s * 0.45 - 0.04, 0.93, 0.78, { seg: 5, rows: 3 });
      tk.ball(0.13, 0xf48fb1, s * 0.85, 0.55, 0.72, { sz: 0.3, seg: 8, rows: 5 });
    }
    tk.ball(0.42, 0x5d1414, 0, 0.47, 0.72, { sx: 1.2, sy: 0.55, sz: 0.15, seg: 14, rows: 8 });
    tk.box(0.72, 0.1, 0.05, 0xffffff, 0, 0.66, 0.76, { r: 0.02 });
    tk.ball(0.22, 0xf06292, 0, 0.36, 0.77, { sx: 1.3, sy: 0.45, sz: 0.25, seg: 10, rows: 6 });
  } else {
    // Dark ninja hood with an eye slit and angry eyes, tails behind
    tk.box(2.62, 1.12, 1.62, CLOTH, 0, 0.67, 0, { r: 0.32 });
    tk.box(1.5, 0.3, 0.05, BUN, 0, 0.83, 0.81, { r: 0.02 });
    for (const s of [-1, 1]) {
      tk.box(0.26, 0.13, 0.04, INK, s * 0.4, 0.82, 0.84, { rz: -s * 0.25 });
      tk.ball(0.03, 0xffffff, s * 0.36, 0.84, 0.86, { seg: 4, rows: 3 });
    }
    tk.box(2.66, 0.16, 1.66, 0xc62828, 0, 1.08, 0, { r: 0.06 });
    tk.box(0.3, 0.2, 0.05, 0xffd54f, 0, 1.08, 0.84, { r: 0.03 });
    tk.ball(0.16, 0xc62828, 0.5, 1.05, -0.86, { seg: 8, rows: 6 });
    for (const [x, r] of [[0.35, 0.4], [0.65, 0.7]]) tk.box(0.2, 1.0, 0.05, 0xc62828, x, 0.6, -1.0, { rx: r, rz: (x - 0.5) * 0.6 });
    for (const x of [-0.6, 0, 0.6]) tk.box(0.03, 0.03, 1.64, tone(CLOTH, 0.7), x, 1.18, 0);
  }
  if (level >= 2) {
    // Condiment belt with a mustard and a ketchup bottle in loops
    tk.box(2.6, 0.22, 1.6, 0x4e342e, 0, -0.55, 0, { r: 0.06 });
    tk.box(0.3, 0.26, 0.05, 0xffca28, 0, -0.55, 0.81);
    for (const [x, c] of [[-0.8, 0xffd600], [0.8, 0xe53935]]) {
      bottle(tk, c, x, -0.85, 0.88, 0.85);
      tk.box(0.42, 0.16, 0.06, 0x3e2723, x, -0.55, 0.84);
    }
  }
  if (level === 3) {
    // Red chef bandana with white dots and a knot behind
    const RED = 0xd32f2f;
    tk.box(2.56, 0.24, 1.56, RED, 0, 1.05, 0, { r: 0.08 });
    for (const x of [-0.9, -0.3, 0.3, 0.9]) tk.ball(0.05, 0xffffff, x, 1.05, 0.79, { sz: 0.4, seg: 5, rows: 3 });
    tk.ball(0.18, RED, 0.6, 1.0, -0.8, { seg: 8, rows: 6 });
    for (const r of [0.3, -0.2]) tk.box(0.2, 0.55, 0.06, RED, 0.6 + r, 0.75, -0.86, { rz: r });
  }
  tk.done();
  // Stubby legs with shoes, arms with white cartoon gloves
  h.rightLeg.position.set(-0.6, 1.6, 0);
  h.leftLeg.position.set(0.6, 1.6, 0);
  const SHOE = ninja ? CLOTH : 0x5d4037;
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const lk = kit(h, leg, `h2frankLeg${ninja ? 1 : 0}`);
    lk.cyl(0.24, 1.1, BUND, 0, -0.55, 0, { seg: 10 });
    lk.ball(0.38, SHOE, 0, -1.33, 0.12, { sy: 0.55, sz: 1.3, seg: 12, rows: 8 });
    lk.box(0.5, 0.06, 0.2, tone(SHOE, 0.7), 0, -1.12, 0.35);
    lk.done();
  }
  h.rightArm.position.set(-1.45, 2.85, 0.1);
  h.leftArm.position.set(1.45, 2.85, 0.1);
  for (const arm of [h.rightArm, h.leftArm]) {
    const ak = kit(h, arm, 'h2frankArm');
    ak.cyl(0.2, 0.75, BUND, 0, -0.4, 0, { seg: 10 });
    ak.torus(0.22, 0.07, 0xfafafa, 0, -0.75, 0, { rx: PI / 2, seg: 12 });
    ak.ball(0.32, 0xfafafa, 0, -1.0, 0, { sy: 0.95, seg: 12, rows: 8 });
    for (const x of [-0.1, 0.1]) ak.box(0.03, 0.25, 0.03, 0xbdbdbd, x, -1.0, 0.3);
    ak.ball(0.11, 0xfafafa, 0.28, -0.9, 0.1, { seg: 8, rows: 5 }); // thumb
    ak.done();
  }
  // Weapon: fists, then a corndog club (one in each hand at Lv 4)
  const rh = hand(h.rightArm, -1.0);
  rh.rotation.x = -1.19; // the club points up over the shoulder, and smashes forward on a swing
  let tip = -0.4;
  if (level >= 1) {
    const dk = kit(h, rh, `h2frankDog${level >= 3 ? 1 : 0}`);
    tip = corndog(dk, level >= 3 ? 1.4 : 1.0, -0.1, level >= 3);
    dk.done();
  }
  if (ninja) {
    const lh = hand(h.leftArm, -1.0);
    lh.rotation.x = -1.19;
    const dk = kit(h, lh, 'h2frankDog1');
    corndog(dk, 1.4, -0.1, true);
    dk.done();
  }
  if (level >= 2) {
    // Two big squeeze bottles standing behind him
    const sk = kit(h, h.root, 'h2frankBottles');
    for (const [x, c] of [[-1.45, 0xffd600], [1.45, 0xd50000]]) {
      bottle(sk, c, x, 0, -1.2, 1.5);
      sk.cyl(0.36, 0.08, 0x5d4037, x, 0.04, -1.2, { seg: 12 });
    }
    sk.done();
  }
  if (ninja) {
    groundRing(h, 'h2frankFire', 2.5, 12, glowMat(h, 0xff6d00), 0.7, 0.8);
    const em = [glowMat(h, 0xffab00), glowMat(h, 0xff3d00)];
    orbit(h, 'h2frankEmbers', 1.0, 2.4, 6, (k, x, z, i) => {
      k.ball(0.18, em[i % 2], x, 0, z, { seg: 8, rows: 6 });
      k.cyl(0.16, 0.35, em[i % 2], x, 0.22, z, { r2: 0, seg: 8 });
    }, 1.4, 0.25);
    grow(h, 1.1);
  }
  setMuzzle(h, rh, 0, tip, 0);
  pose(h, -2.3, ninja ? -1.3 : -0.5, 0.2, -0.3);
  h.swing = 1.8;
  h.melee = true;
  h.tracer = 0xffd600;
  return h;
}

// ------------------------------------------------------------------ Bunny

/**
 * Bunny (0-4): a white bunny with long ears who throws eggs. Lv 1 a basket of eggs in her other
 * paw, Lv 2 a pink vest, a slingshot and the basket on the ground, Lv 3 a wooden catapult beside
 * her and egg-shell shoulder pads, Lv 4 a gold vest, an egg bazooka, painted eggs circling her, and
 * she grows.
 */
export function makeBunny(level) {
  level = lv(level, 4);
  const h = rig();
  const FUR = 0xfafafa;
  const PINK = 0xf8bbd0;
  const tk = kit(h, h.torso, `h2bunnyTorso${level}`);
  tk.box(1.7, 1.8, 1.0, FUR, 0, 0, 0, { r: 0.4 });
  tk.ball(0.33, FUR, 0, -0.7, -0.55, { seg: 10, rows: 8 }); // tail puff
  if (level >= 2) {
    // Vest (pink, gold at Lv 4) open over the belly, with buttons and a pocket
    const V = level >= 4 ? 0xffc400 : 0xf06292;
    tk.box(1.78, 1.45, 1.08, V, 0, 0.2, 0, { r: 0.4 });
    tk.box(1.8, 0.1, 1.1, tone(V, 0.8), 0, -0.5, 0, { r: 0.04 });
    for (const sx of [-1, 1]) tk.box(0.06, 1.3, 0.04, 0xfafafa, sx * 0.42, 0.2, 0.55);
    for (const y of [0.55, 0.15]) tk.cyl(0.05, 0.04, 0xfafafa, 0.55, y, 0.55, { axis: 'z', seg: 8 });
    tk.box(0.3, 0.25, 0.04, tone(V, 0.85), -0.6, 0.0, 0.55);
  }
  tk.ball(0.55, PINK, 0, -0.2, 0.36, { sy: 1.0, sz: 0.36, seg: 14, rows: 10 }); // belly patch
  if (level >= 3) {
    // Egg-shell shoulder pads
    for (const [sx, c] of [[-1, 0xb2ebf2], [1, 0xf8bbd0]]) {
      tk.ball(0.45, c, sx * 1.2, 0.9, 0, { sy: 0.6, seg: 12, rows: 6 });
      tk.box(0.5, 0.06, 0.06, 0xffffff, sx * 1.2, 1.05, 0.38, { rz: 0.4 * sx });
    }
  }
  tk.done();
  h.rightArm.position.x = -1.2;
  h.leftArm.position.x = 1.2;
  for (const arm of [h.rightArm, h.leftArm]) {
    const ak = kit(h, arm, 'h2bunnyArm');
    ak.cyl(0.27, 1.5, FUR, 0, -0.75, 0, { r2: 0.3, seg: 10 });
    ak.ball(0.3, FUR, 0, -1.65, 0, { sy: 1.1, seg: 10, rows: 8 });
    ak.done();
  }
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const lk = kit(h, leg, 'h2bunnyLeg');
    lk.cyl(0.36, 1.4, FUR, 0, -0.85, 0, { r2: 0.42, seg: 10 });
    lk.ball(0.42, FUR, 0, -1.8, 0.3, { sy: 0.45, sz: 1.6, seg: 12, rows: 8 });
    lk.ball(0.18, PINK, 0, -1.64, 0.62, { sy: 0.25, sz: 1.1, seg: 8, rows: 5 });
    lk.done();
  }
  // Head: big round eyes, blush, a pink nose, long ears
  const hk = kit(h, h.head, 'h2bunnyHead');
  hk.ball(0.78, FUR, 0, 0.65, 0, { sy: 0.85, sz: 0.85, seg: 16, rows: 12 });
  for (const s of [-1, 1]) {
    hk.ball(0.21, INK, s * 0.36, 0.78, 0.55, { sz: 0.35, seg: 12, rows: 8 });
    hk.ball(0.06, 0xffffff, s * 0.36 - 0.07, 0.86, 0.62, { seg: 6, rows: 4 });
    hk.ball(0.15, PINK, s * 0.52, 0.45, 0.43, { sy: 0.55, sz: 0.3, seg: 8, rows: 5 });
    hk.ball(0.22, FUR, s * 0.14, 0.45, 0.58, { sy: 0.8, sz: 0.6, seg: 10, rows: 7 }); // cheeks
    for (const wy of [0.03, -0.06]) hk.box(0.5, 0.02, 0.02, 0xbdbdbd, s * 0.55, 0.45 + wy, 0.62, { rz: s * wy * 2 });
  }
  hk.ball(0.09, PINK, 0, 0.56, 0.72, { sx: 1.3, sy: 0.8, seg: 8, rows: 5 });
  hk.box(0.03, 0.1, 0.03, INK, 0, 0.46, 0.72);
  for (const s of [-1, 1]) hk.torus(0.05, 0.015, INK, s * 0.05, 0.4, 0.71, { arc: PI, rz: PI, seg: 8 });
  hk.box(0.14, 0.1, 0.03, 0xffffff, 0, 0.35, 0.68); // buck teeth
  hk.done();
  for (const s of [-1, 1]) {
    const ear = grp(h.head, s * 0.35, 1.2, -0.1, 0, 0, -s * 0.12);
    const ek = kit(h, ear, 'h2bunnyEar');
    ek.ball(0.22, FUR, 0, 0.9, 0, { sy: 4.3, sz: 0.6, seg: 10, rows: 10 });
    ek.ball(0.13, PINK, 0, 0.9, 0.08, { sy: 5.6, sz: 0.4, seg: 8, rows: 8 });
    ek.done();
  }
  if (level === 1) {
    // Basket of eggs in the left paw
    const b = hand(h.leftArm, -1.6, -0.6);
    const bk = kit(h, b, 'h2bunnyBasket');
    basket(bk, 0.5, 0, -0.75, 0.2);
    for (let i = 0; i < 3; i++) egg(bk, PASTEL[i], -0.25 + i * 0.25, -0.2, 0.2 + (i % 2) * 0.1, 0.65);
    bk.done();
  }
  if (level >= 2) {
    // The basket now sits on the ground
    const gk = kit(h, h.root, 'h2bunnyGroundBasket');
    basket(gk, 0.55, -1.9, 0, -0.9);
    for (let i = 0; i < 3; i++) egg(gk, PASTEL[i + 1], -2.15 + i * 0.25, 0.55, -0.9 + (i % 2) * 0.1, 0.65);
    gk.done();
  }
  let muzzleSet = false;
  if (level >= 3) {
    // A small wooden catapult beside her: base frame on wheels, uprights, a cross bar, an arm with a cup
    const cg = grp(h.root, 1.9, 0, 0.2);
    const ck = kit(h, cg, `h2bunnyCatapult${level}`);
    for (const x of [-0.5, 0.5]) ck.box(0.2, 0.22, 1.8, WOOD, x, 0.45, 0, { r: 0.03 });
    for (const z of [-0.6, 0.6]) ck.box(1.2, 0.2, 0.2, WOOD, 0, 0.45, z, { r: 0.03 });
    for (const x of [-0.68, 0.68]) for (const z of [-0.6, 0.6]) cartWheel(ck, 0.32, x, 0.33, z);
    for (const x of [-0.5, 0.5]) ck.box(0.18, 1.1, 0.18, WOOD, x, 1.05, -0.2, { r: 0.02 });
    ck.box(1.2, 0.18, 0.18, WOOD, 0, 1.6, -0.2, { r: 0.02 });
    ck.cyl(0.07, 1.0, 0x6d4c41, 0, 0.75, 0.15, { axis: 'x', seg: 8 });
    ck.torus(0.12, 0.05, 0x9e9e9e, 0, 0.75, 0.15, { ry: PI / 2, seg: 8 });
    ck.box(0.18, 0.18, 1.9, 0x6d4c41, 0, 1.15, -0.05, { rx: 0.6 });
    basket(ck, 0.3, 0, 1.55, -0.78, false);
    egg(ck, PASTEL[level === 3 ? 0 : 3], 0, 1.95, -0.78, 0.8);
    ck.box(0.1, 0.06, 0.6, 0x9e9e9e, 0, 1.6, -0.12, { rx: 0.6 }); // spring band
    ck.done();
    if (level === 3) {
      setMuzzle(h, cg, 0, 2.0, -0.78);
      muzzleSet = true;
    }
  }
  if (level >= 4) {
    // An egg bazooka on the shoulder: banded pastel tube with an egg-shaped launcher end
    const gun = hand(h.rightArm, -1.9);
    const gk = kit(h, gun, 'h2bunnyBazooka');
    gk.cyl(0.38, 2.4, 0xd1c4e9, 0, -0.9, 0, { seg: 14 });
    for (let i = 0; i < 3; i++) gk.cyl(0.41, 0.18, PASTEL[i], 0, -0.2 - i * 0.6, 0, { seg: 14 });
    gk.ball(0.68, 0xf8bbd0, 0, -2.6, 0, { sy: 1.15, seg: 16, rows: 12 });
    gk.torus(0.67, 0.08, 0xfff59d, 0, -2.5, 0, { rx: PI / 2, seg: 16 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      gk.ball(0.08, 0x80deea, Math.cos(a) * 0.62, -2.85, Math.sin(a) * 0.62, { seg: 6, rows: 4 });
    }
    gk.cyl(0.36, 0.2, 0x4a148c, 0, -3.35, 0, { seg: 12 });
    gk.torus(0.36, 0.05, 0xfff59d, 0, -3.42, 0, { rx: PI / 2, seg: 12 });
    gk.box(0.25, 0.5, 0.3, 0x7e57c2, 0, -0.6, -0.5, { r: 0.05 });
    gk.box(0.12, 0.4, 0.12, 0x7e57c2, 0, -1.2, 0.48);
    gk.cyl(0.08, 0.3, 0x4a148c, 0, -1.2, 0.6, { seg: 8 }); // sight
    gk.ball(0.38, 0xd1c4e9, 0, 0.3, 0, { sy: 0.5, seg: 12, rows: 6 });
    gk.done();
    setMuzzle(h, gun, 0, -3.45, 0);
    pose(h, -PI / 2, -PI / 2 + 0.1, 0.1, -0.5, 0.2);
    // Painted eggs circling her
    const eggs = [0xf48fb1, 0x80deea, 0xfff59d, 0xce93d8, 0xa5d6a7];
    orbit(h, 'h2bunnyEggs', 2.8, 2.4, 5, (k, x, z, i) => egg(k, eggs[i], x, 0, z, 1.4), 0.8, 0.3);
    grow(h, 1.1);
  } else if (level >= 2) {
    // Slingshot in the left paw, the right paw pulling back an egg
    const s = hand(h.leftArm, -1.9);
    const sk = kit(h, s, 'h2bunnySling');
    sk.cyl(0.09, 0.7, WOOD, 0, -0.3, 0, { seg: 8 });
    for (const x of [-0.25, 0.25]) {
      sk.tube([[0, -0.6, 0], [x, -0.65, 0.1], [x, -0.65, 0.6]], 0.07, WOOD, { sides: 6 });
      sk.torus(0.08, 0.025, 0x5d4037, x, -0.65, 0.5, { seg: 8 });
      sk.tube([[x, -0.65, 0.6], [x * 0.3, 0.1, 0.6], [0, 0.3, 0.6]], 0.03, 0xe53935, { sides: 4 });
    }
    for (let i = 0; i < 3; i++) sk.torus(0.1, 0.02, 0x5d4037, 0, -0.1 - i * 0.12, 0, { rx: PI / 2, seg: 8 });
    sk.box(0.3, 0.08, 0.22, 0x6d4c41, 0, 0.32, 0.6, { r: 0.02 }); // pouch
    egg(sk, PASTEL[1], 0, 0.42, 0.6, 0.65);
    sk.done();
    if (!muzzleSet) setMuzzle(h, s, 0, -0.7, 0.6);
    pose(h, -1.3, -PI / 2, 0.35, -0.25, 0.15);
  } else {
    // An egg in the throwing paw
    const th = hand(h.rightArm, -2.0);
    const ek = kit(h, th, `h2bunnyEgg${level}`);
    egg(ek, PASTEL[level === 1 ? 2 : 0], 0, -0.3, 0, 1.0);
    ek.done();
    setMuzzle(h, th, 0, -0.35, 0);
    pose(h, -2.8, level === 1 ? -0.6 : -0.8, 0.2, -0.3);
    h.swing = 1.9;
  }
  h.projectile = { color: PASTEL[level], size: [0.8, 0.85, 0.9, 1.1, 1.3][level], arc: level === 3 ? 6 : 3.5 };
  h.tracer = 0xf8bbd0;
  h.body.scale.multiplyScalar(0.88);
  return h;
}

export const MODELS = {
  electroByte: makeByte,
  ghostbusterLure: makeLure,
  grenadierSoda: makeSodaPop,
  assassinFrank: makeFrank,
  rocketeerBunny: makeBunny,
};
