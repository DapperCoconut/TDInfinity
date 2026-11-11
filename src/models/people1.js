// Tower models: people, batch 1 (dressed with the vehicle kit in ../vehicles.js).
// In here: Scout, Classic Scout, Darter, Paintballer, Tweeter, Cowboy, Soldier.
// Each makeX(level) builds one tower's look; TOWER_MODELS in ../models.js says which tower uses which.
//
// People keep the blocky body from makeHumanoid (kit.js): that is the game's character style.
// What they wear and hold is built here from kit pieces (round helmets, pouches with flaps,
// straps, boots, guns with round barrels), merged so a whole outfit is a few draw calls.
// The helpers at the top are shared: later people batches import them from here.
//
// Spaces the helpers work in:
//   head  (h.head):  the head is a round block, radius 0.62, from y 0 to 1.22; the face looks
//                    along +z and the eyes sit at about y 0.7.
//   torso (h.torso): the chest block is 2 wide (x), 2 tall (y), 1 deep (z), centred on 0.
//   leg   (h.rightLeg / h.leftLeg): hangs from the hip along -y; the shoe is y -1.7 to -2.
//   gun   (a group at the fist, y -1.9 on an arm): the gun points along -y, +z is up while
//                    aiming, and the fist is the origin. Guns ride on top of the fist (UP).

import * as THREE from 'three';
import { antenna, glowMat, kit, tone } from '../vehicles.js';
import { bandGeo } from '../rig.js';
import { makeHumanoid } from './kit.js';

const PI = Math.PI;
export const INK = 0x16181a; // straps, buckles, gun metal shadows
export const GUNMETAL = 0x2a2d31;
export const STEEL = 0x50555c;
export const WOOD = 0x6b4a2f;
export const LEATHER = 0x5a3a22;
export const GOLD = 0xffc107;
export const UP = 0.32; // how high a gun's bore sits above the middle of the fist

// ------------------------------------------------------------------ shapes the kit lacks

/** Half an oval ball sitting on y (helmets, caps, hair): radius r, height h. */
export function dome(k, r, h, col, x, y, z, o = {}) {
  if (k._slot(col)) return;
  const g = new THREE.SphereGeometry(r, o.seg ?? 16, o.rows ?? 6, 0, PI * 2, 0, PI / 2);
  k._add(g, col, x, y, z, { ...o, sy: (h / r) * (o.sy ?? 1) });
}

/** A curved strip hugging the round head (visors, masks, headbands): radius r, centred on +z. */
export function band(k, r, thick, h, arc, col, y, o = {}) {
  if (k._slot(col)) return;
  k._add(bandGeo(r, thick, h, arc).clone(), col, 0, y, 0, o);
}

/** A kit on `parent` whose cached shape is named by `key` (tower, level and part). */
export const wear = (h, parent, key) => kit(h, parent, `p1:${key}`);

// ------------------------------------------------------------------ head gear (head space)

/** A round army helmet: shell, rim, a cloth band and chin straps. o.cover tints the band. */
export function helmet(k, col, o = {}) {
  const y = o.y ?? 0.92;
  dome(k, 0.76, 0.58, col, 0, y, 0);
  k.torus(0.75, 0.05, tone(col, 0.82), 0, y + 0.01, 0, { rx: PI / 2, seg: 20 });
  if (o.band !== false) k.cyl(0.745, 0.13, o.cover ?? tone(col, 0.7), 0, y + 0.18, 0, { seg: 20, r2: 0.71 });
  for (const s of [-1, 1]) {
    k.tube([[s * 0.66, y, -0.05], [s * 0.66, 0.5, 0.05], [s * 0.45, 0.12, 0.3]], 0.035, INK, { seg: 8, sides: 4 });
    k.box(0.08, 0.14, 0.14, INK, s * 0.68, y - 0.02, -0.05); // strap clip
  }
}

/** Goggles: a strap round the head (or helmet) and two round lenses in front. */
export function goggles(k, y, lens, o = {}) {
  const R = o.r ?? 0.66;
  const frame = o.frame ?? 0x263238;
  k.torus(R, 0.05, o.strap ?? INK, 0, y, 0, { rx: PI / 2, seg: 20 });
  for (const s of [-1, 1]) {
    const x = s * 0.24;
    const z = Math.sqrt(R * R - x * x) + 0.05;
    k.cyl(0.19, 0.12, frame, x, y, z, { axis: 'z', seg: 12 });
    k.cyl(0.15, 0.04, lens, x, y, z + 0.06, { axis: 'z', seg: 12 });
  }
  k.box(0.16, 0.08, 0.08, frame, 0, y, Math.sqrt(R * R - 0.01) + 0.04);
}

/** A ball cap: crown, button, peak (and an optional badge colour on the front). */
export function cap(k, col, o = {}) {
  const y = o.y ?? 0.95;
  dome(k, 0.69, 0.5, col, 0, y, 0);
  k.torus(0.68, 0.035, tone(col, 0.85), 0, y + 0.02, 0, { rx: PI / 2, seg: 20 });
  k.ball(0.07, tone(col, 0.8), 0, y + 0.5, 0, { seg: 8, rows: 5 });
  k.plan([[-0.5, 0], [0.5, 0], [0.42, 0.42], [0, 0.58], [-0.42, 0.42]], 0.06, o.peak ?? col, 0, y + 0.02, 0.5, { rx: -0.12 });
  for (const a of [-0.9, 0, 0.9]) k.box(0.03, 0.4, 0.02, tone(col, 0.8), Math.sin(a) * 0.5, y + 0.25, Math.cos(a) * 0.5, { ry: a, rx: -0.75 }); // seams
}

/** Short hair: a cap over the top of the head (0.7 wide and 0.44 tall so the round top never shows through). */
export function hair(k, col, o = {}) {
  dome(k, 0.7, Math.max(0.44, o.h ?? 0.44), col, 0, o.y ?? 0.93, o.z ?? -0.02);
  if (o.back !== false) band(k, 0.62, 0.05, 0.5, 2.4, col, 0.85, { ry: PI });
}

/** Sunglasses: two lenses, a bridge and arms back to the ears. */
export function shades(k, frame, lens, o = {}) {
  const y = o.y ?? 0.72;
  const w = o.w ?? 0.38;
  for (const s of [-1, 1]) {
    k.box(w + 0.06, 0.3, 0.06, frame, s * 0.25, y, 0.61, { ry: s * 0.25, r: 0.025 });
    k.box(w, 0.24, 0.04, lens, s * 0.25, y, 0.645, { ry: s * 0.25 });
    k.box(0.04, 0.05, 0.62, frame, s * 0.64, y + 0.06, 0.25);
  }
  k.box(0.14, 0.05, 0.05, frame, 0, y + 0.08, 0.64);
}

/** A radio headset: band over the head, round ear cups and a mic boom on the right. */
export function headset(k, col = 0x333333) {
  k.torus(0.7, 0.045, col, 0, 0.72, 0, { arc: PI, seg: 14 });
  for (const s of [-1, 1]) {
    k.cyl(0.24, 0.14, col, s * 0.68, 0.7, 0, { axis: 'x', seg: 12 });
    k.cyl(0.18, 0.05, tone(col, 0.6), s * 0.76, 0.7, 0, { axis: 'x', seg: 12 });
  }
  k.tube([[-0.72, 0.62, 0.05], [-0.62, 0.42, 0.4], [-0.32, 0.36, 0.62]], 0.03, col, { seg: 8, sides: 4 });
  k.ball(0.07, INK, -0.3, 0.36, 0.64, { seg: 8, rows: 5 });
}

/** A cloth headband with its knot tails at the back. */
export function headband(k, col, y = 1.0) {
  k.cyl(0.665, 0.18, col, 0, y, 0, { seg: 22, open: true });
  k.cyl(0.65, 0.18, col, 0, y, 0, { seg: 22 });
  k.box(0.18, 0.18, 0.14, tone(col, 0.85), 0.15, y, -0.68);
  for (const s of [-1, 1]) k.box(0.12, 0.4, 0.05, col, 0.15 + s * 0.12, y - 0.25, -0.72, { rz: s * 0.3 });
}

// ------------------------------------------------------------------ body gear (torso space)

/** A pouch with a flap and a snap, its back flat against z. */
export function pouch(k, x, y, z, w, hh, col, d = 0.24) {
  k.box(w, hh, d, col, x, y, z + d / 2, { r: 0.03 });
  k.box(w * 1.06, hh * 0.32, d * 1.1, tone(col, 0.85), x, y + hh * 0.36, z + d / 2 + 0.01, { r: 0.02 });
  k.cyl(0.035, 0.03, INK, x, y + hh * 0.26, z + d + 0.03, { axis: 'z', seg: 6 });
}

/** A belt round the waist with a buckle (y: its height on the torso). */
export function belt(k, col, buckle = 0xb0b0b0, y = -0.84) {
  k.box(2.08, 0.26, 1.1, col, 0, y, 0, { r: 0.04 });
  k.box(0.36, 0.24, 0.06, buckle, 0, y, 0.56, { r: 0.02 });
  k.box(0.22, 0.12, 0.04, col, 0, y, 0.59);
}

/** A plate carrier: front and back plates, side band, shoulder straps and a row of mag pouches. */
export function vest(k, col, o = {}) {
  const dk = tone(col, 0.82);
  k.box(1.62, 1.25, 0.2, col, 0, 0.18, 0.56, { r: 0.06 });
  k.box(1.62, 1.35, 0.2, col, 0, 0.12, -0.56, { r: 0.06 });
  k.box(2.12, 0.62, 1.16, dk, 0, -0.4, 0, { r: 0.05 });
  for (const s of [-1, 1]) k.box(0.42, 0.16, 1.28, dk, s * 0.55, 0.99, 0, { r: 0.04 });
  for (let i = 0; i < 4; i++) k.box(1.5, 0.03, 0.04, tone(col, 0.65), 0, 0.68 - i * 0.16, 0.67); // webbing rows
  const n = o.pouches ?? 3;
  const pc = o.pouch ?? dk;
  for (let i = 0; i < n; i++) pouch(k, (i - (n - 1) / 2) * 0.5, -0.3, 0.66, 0.42, 0.5, pc);
  if (o.patch) k.box(0.36, 0.24, 0.03, o.patch, -0.45, 0.6, 0.67);
}

/** A backpack: rounded bag, top flap, side pockets and straps over the shoulders. */
export function pack(k, col, o = {}) {
  const w = o.w ?? 1.4;
  const hh = o.h ?? 1.45;
  const d = o.d ?? 0.6;
  const z = -0.5 - d / 2;
  k.box(w, hh, d, col, 0, o.y ?? 0, z, { r: 0.12 });
  k.box(w * 0.96, 0.4, d * 1.06, tone(col, 0.85), 0, (o.y ?? 0) + hh / 2 - 0.15, z, { r: 0.08 });
  for (const s of [-1, 1]) k.box(0.22, hh * 0.55, d * 0.7, tone(col, 0.9), s * (w / 2 + 0.08), (o.y ?? 0) - 0.15, z, { r: 0.05 });
  pouch(k, 0, (o.y ?? 0) - 0.25, z - d / 2 - 0.22, w * 0.6, hh * 0.38, tone(col, 0.92), 0.2);
  for (const s of [-1, 1]) {
    k.box(0.24, 0.1, 1.2, o.strap ?? INK, s * 0.5, 1.0, -0.05);
    k.box(0.24, 1.3, 0.06, o.strap ?? INK, s * 0.5, 0.32, 0.53);
  }
  if (o.roll) {
    k.cyl(0.22, w * 1.05, o.roll, 0, (o.y ?? 0) + hh / 2 + 0.2, z, { axis: 'x', seg: 10 });
    for (const s of [-1, 1]) k.cyl(0.235, 0.07, INK, s * w * 0.3, (o.y ?? 0) + hh / 2 + 0.2, z, { axis: 'x', seg: 10 });
  }
}

/** A field radio box (on a pack or belt) with knobs and a whip antenna. */
export function radio(k, x, y, z, col = 0x4b5320, tall = 1.8) {
  k.box(0.6, 0.75, 0.3, col, x, y, z, { r: 0.04 });
  k.box(0.4, 0.2, 0.04, INK, x, y + 0.15, z + 0.17);
  for (const dx of [-0.15, 0.15]) k.cyl(0.05, 0.08, INK, dx + x, y + 0.42, z, { seg: 8 });
  antenna(k, x + 0.18, y + 0.36, z, tall);
}

/** A shirt collar and a button line down the front. */
export function collar(k, col, o = {}) {
  for (const s of [-1, 1]) k.box(0.46, 0.2, 0.08, col, s * 0.24, 0.9, 0.53, { rz: s * -0.35 });
  if (o.buttons !== false) for (let i = 0; i < 4; i++) k.cyl(0.04, 0.03, o.button ?? tone(col, 0.6), 0, 0.6 - i * 0.42, 0.52, { axis: 'z', seg: 6 });
}

/** Two breast pockets with flaps and buttons. */
export function pockets(k, col) {
  for (const s of [-1, 1]) pouch(k, s * 0.5, 0.3, 0.5, 0.5, 0.45, col, 0.06);
}

/** A strap across the chest from one shoulder to the other hip (side 1: over the left shoulder). */
export function sash(k, col, side = 1, w = 0.28) {
  k.box(w, 2.5, 1.12, col, 0, 0, 0, { rz: side * 0.62 });
}

/** A canteen on the belt (x: which hip). */
export function canteen(k, x, col = 0x4b5320) {
  k.cyl(0.22, 0.5, col, x, -1.08, 0.12, { seg: 12 });
  k.cyl(0.08, 0.1, INK, x, -0.78, 0.12, { seg: 8 });
  k.box(0.08, 0.3, 0.46, INK, x, -0.9, 0.12);
}

// ------------------------------------------------------------------ legs and arms

/** Boots on a leg (`leg` space): shaft, toe cap, sole, laces. o.heel: cowboy heel. */
export function boots(k, col, o = {}) {
  k.box(1.06, 0.62, 1.08, col, 0, -1.66, 0.02, { r: 0.05 });
  k.box(1.04, 0.3, 0.3, tone(col, 0.85), 0, -1.86, 0.48, { r: 0.08 });
  k.box(1.1, 0.12, 1.2, o.sole ?? INK, 0, -1.96, 0.06);
  if (o.heel) k.box(1.0, 0.2, 0.3, o.sole ?? INK, 0, -2.06, -0.4);
  else for (let i = 0; i < 3; i++) k.box(0.4, 0.04, 0.04, tone(col, 0.6), 0, -1.48 - i * 0.12, 0.56);
  if (o.cuff) k.box(1.12, 0.14, 1.14, o.cuff, 0, -1.36, 0.02);
}

/** A knee pad (leg space). */
export function kneePad(k, col = INK) {
  k.box(0.86, 0.46, 0.2, col, 0, -0.98, 0.54, { r: 0.08 });
  k.box(0.9, 0.08, 0.1, tone(col, 0.7), 0, -0.98, 0.5);
}

/** A badge patch on the outer side of an upper arm (`side`: -1 right arm, 1 left arm). */
export function armPatch(k, side, col, mark) {
  k.box(0.05, 0.42, 0.42, col, side * 0.51, -0.42, 0, { r: 0.02 });
  if (mark != null) k.box(0.03, 0.18, 0.18, mark, side * 0.54, -0.42, 0);
}

/** A glove over the hand, with a cuff (arm space; the hand is y -1.64 to -2). */
export function glove(k, col) {
  k.box(1.05, 0.4, 1.05, col, 0, -1.82, 0, { r: 0.06 });
  k.box(1.08, 0.12, 1.08, tone(col, 0.75), 0, -1.6, 0);
}

// ------------------------------------------------------------------ guns (gun space)

/** A group at the fist of `arm` for a held thing (its pointy end along -y), scaled by s so it reads from the game camera. */
export function fist(arm, y = -1.9, s = 1) {
  const g = new THREE.Group();
  g.position.set(0, y, 0);
  g.scale.setScalar(s);
  arm.add(g);
  return g;
}

/** A muzzle point on `parent`, added to the model's list. */
export function muzzle(h, parent, y, z = UP, x = 0) {
  const m = new THREE.Object3D();
  m.position.set(x, y, z);
  parent.add(m);
  (h.muzzles ??= []).push(m);
  return m;
}

/**
 * A rifle on the fist: receiver, handguard, round barrel and the parts in `o`.
 * o: len (fist to muzzle), body, furn (stock / handguard colour), mag ('curved' | 'box' | 'drum'
 * | false), stock (true / false), optic ('iron' | 'dot' | 'scope' | false), can (a suppressor),
 * light (a torch under the barrel), glow (a glowing material: energy rails instead of a mag).
 * Returns the bore point [y, z].
 */
export function rifle(k, o = {}) {
  const len = o.len ?? 2.2;
  const body = o.body ?? GUNMETAL;
  const furn = o.furn ?? body;
  const U = UP;
  const front = -0.82;
  const guardEnd = -Math.min(len - 0.35, 1.55);
  k.box(0.3, 1.02, 0.34, body, 0, -0.31, U, { r: 0.03 }); // receiver
  k.box(0.04, 0.3, 0.12, INK, 0.16, -0.35, U + 0.04); // ejection port
  k.box(0.14, 0.92, 0.06, INK, 0, -0.34, U + 0.2); // top rail
  for (let i = 0; i < 5; i++) k.box(0.18, 0.05, 0.05, INK, 0, -0.02 - i * 0.16, U + 0.24);
  k.box(0.32, front - guardEnd, 0.32, furn, 0, (front + guardEnd) / 2, U - 0.01, { r: 0.06 }); // handguard
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) k.box(0.03, 0.12, 0.08, INK, s * 0.165, front - 0.18 - i * 0.2, U); // vents
  const bl = len - -guardEnd;
  k.cyl(0.06, bl + 0.1, STEEL, 0, guardEnd - bl / 2 + 0.05, U + 0.03, { seg: 10 }); // barrel
  if (o.can) {
    k.cyl(0.11, 0.62, INK, 0, -len + 0.31, U + 0.03, { seg: 12 });
  } else {
    k.cyl(0.085, 0.2, INK, 0, -len + 0.1, U + 0.03, { seg: 8 }); // flash hider
    for (const s of [-1, 1]) k.box(0.02, 0.12, 0.05, 0x050505, s * 0.08, -len + 0.08, U + 0.03);
  }
  k.box(0.05, 0.1, 0.16, INK, 0, guardEnd - 0.06, U + 0.2); // front sight
  k.box(0.22, 0.24, 0.52, furn, 0, 0.08, U - 0.36, { rx: -0.32, r: 0.04 }); // pistol grip
  k.torus(0.1, 0.022, INK, 0, -0.16, U - 0.24, { ry: PI / 2, seg: 10, arc: PI }); // trigger guard
  if (o.mag !== false) {
    const mag = o.mag ?? 'curved';
    if (mag === 'drum') k.cyl(0.34, 0.26, INK, 0, -0.62, U - 0.48, { axis: 'x', seg: 14 });
    else k.box(0.2, 0.3, 0.62, INK, 0, mag === 'curved' ? -0.62 : -0.58, U - 0.44, { rx: mag === 'curved' ? 0.28 : 0.08, r: 0.03 });
  }
  if (o.stock !== false) {
    k.box(0.24, 0.62, 0.32, furn, 0, 0.5, U + 0.1, { r: 0.05 });
    k.box(0.26, 0.08, 0.4, INK, 0, 0.84, U + 0.08, { r: 0.02 });
  }
  const optic = o.optic ?? 'iron';
  if (optic === 'iron') k.box(0.16, 0.08, 0.14, INK, 0, 0.0, U + 0.3);
  if (optic === 'dot') {
    k.box(0.2, 0.32, 0.22, INK, 0, -0.3, U + 0.36, { r: 0.03 });
    k.cyl(0.07, 0.03, o.lens ?? 0xff5252, 0, -0.47, U + 0.39, { seg: 10 });
  }
  if (optic === 'scope') {
    k.cyl(0.1, 0.9, INK, 0, -0.35, U + 0.42, { seg: 12 });
    k.cyl(0.14, 0.2, INK, 0, -0.85, U + 0.42, { seg: 12 });
    k.cyl(0.13, 0.18, INK, 0, 0.12, U + 0.42, { seg: 12 });
    k.cyl(0.1, 0.02, o.lens ?? 0x4fc3f7, 0, -0.96, U + 0.42, { seg: 12 });
    for (const y of [-0.6, -0.1]) k.box(0.12, 0.1, 0.18, INK, 0, y, U + 0.3);
  }
  if (o.light) {
    k.cyl(0.08, 0.32, INK, 0.21, guardEnd + 0.25, U - 0.05, { seg: 10 });
    k.cyl(0.065, 0.02, 0xfff3b0, 0.21, guardEnd + 0.08, U - 0.05, { seg: 10 });
  }
  if (o.glow) {
    for (const s of [-1, 1]) k.box(0.06, front - guardEnd + 0.2, 0.08, o.glow, s * 0.17, (front + guardEnd) / 2, U + 0.08);
    k.cyl(0.11, 0.12, o.glow, 0, -len + 0.06, U + 0.03, { seg: 12 });
  }
  return [-len, U + 0.03];
}

/** A pistol on the fist: slide, frame, angled grip, guard and sights. o: len, body, grip, laser, trim, can. */
export function pistol(k, o = {}) {
  const len = o.len ?? 0.95;
  const body = o.body ?? GUNMETAL;
  const U = 0.3;
  k.box(0.26, len, 0.28, body, 0, -len / 2 + 0.18, U + 0.06, { r: 0.03 }); // slide
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) k.box(0.02, 0.03, 0.18, INK, s * 0.135, 0.1 - i * 0.07, U + 0.08);
  k.box(0.24, len * 0.82, 0.16, tone(body, 0.75), 0, -len * 0.41 + 0.16, U - 0.14); // frame
  k.box(0.24, 0.26, 0.56, o.grip ?? 0x1f1f1f, 0, 0.12, U - 0.38, { rx: -0.28, r: 0.04 }); // grip
  k.torus(0.09, 0.02, INK, 0, -0.12, U - 0.24, { ry: PI / 2, seg: 10, arc: PI });
  k.box(0.05, 0.06, 0.08, INK, 0, -len + 0.24, U + 0.22);
  k.box(0.16, 0.06, 0.08, INK, 0, 0.13, U + 0.22);
  k.cyl(0.05, 0.03, 0x050505, 0, -len + 0.17, U + 0.06, { seg: 8 });
  let tip = -len + 0.18;
  if (o.can) {
    k.cyl(0.1, 0.7, INK, 0, tip - 0.35, U + 0.06, { seg: 12 });
    tip -= 0.7;
  }
  if (o.trim) k.box(0.28, 0.08, 0.3, o.trim, 0, -len * 0.6, U + 0.06);
  if (o.laser) {
    k.box(0.2, 0.32, 0.18, INK, 0, -len * 0.6, U - 0.24, { r: 0.03 });
    k.cyl(0.04, 0.03, o.laser, 0, -len * 0.6 - 0.17, U - 0.24, { seg: 8 });
  }
  return [tip, U + 0.06];
}

/** A six-shooter: round barrel with a rib, fluted cylinder, hammer and a curved grip. */
export function revolver(k, o = {}) {
  const metal = o.metal ?? 0x6d6d6d;
  const U = 0.3;
  k.cyl(0.075, 0.95, metal, 0, -0.62, U + 0.05, { seg: 10 }); // barrel
  k.box(0.06, 0.95, 0.06, tone(metal, 0.8), 0, -0.62, U + 0.14); // rib
  k.cyl(0.04, 0.75, tone(metal, 0.7), 0, -0.55, U - 0.08, { seg: 6 }); // ejector rod
  k.box(0.07, 0.07, 0.1, tone(metal, 0.7), 0, -1.05, U + 0.17); // front sight
  k.cyl(0.19, 0.32, metal, 0, -0.12, U, { seg: 12 }); // cylinder
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    k.box(0.05, 0.26, 0.05, tone(metal, 0.55), Math.sin(a) * 0.19, -0.12, U + Math.cos(a) * 0.19);
  }
  k.box(0.22, 0.42, 0.3, tone(metal, 0.85), 0, 0.12, U - 0.02); // frame
  k.box(0.08, 0.14, 0.12, tone(metal, 0.6), 0, 0.3, U + 0.18, { rx: 0.5 }); // hammer
  k.torus(0.1, 0.022, tone(metal, 0.6), 0, 0.0, U - 0.22, { ry: PI / 2, seg: 10, arc: PI });
  k.box(0.24, 0.28, 0.55, o.grip ?? WOOD, 0, 0.26, U - 0.38, { rx: -0.45, r: 0.06 }); // grip
  k.cyl(0.05, 0.03, 0x050505, 0, -1.1, U + 0.05, { seg: 8 });
  return [-1.12, U + 0.05];
}

/** Points the gun arm (right) forward with the left hand under the gun, as holdLongGun did. */
export function aimLong(h) {
  h.rightArm.rotation.set(-PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-PI / 2 + 0.1, 0, -0.5);
  h.pose = { right: -PI / 2, left: -PI / 2 + 0.1, leftRecoil: 0.25 };
}

/** Both arms straight forward (two handguns). */
export function aimBoth(h) {
  h.rightArm.rotation.set(-PI / 2, 0, 0.06);
  h.leftArm.rotation.set(-PI / 2, 0, -0.06);
  h.pose = { right: -PI / 2, left: -PI / 2, leftRecoil: 0.35 };
}

/** Marks a model whose guns are built here, so weapons.js leaves them as they are. */
export const own = (h, up = UP) => {
  h.ownGun = up;
  return h;
};

/** The purple Dimension Shard badge that marks alternate forms (a material for the kit). */
export const shardOf = (h) => glowMat(h, 0xb388ff);

// ------------------------------------------------------------------ Scout

/**
 * Scout: a helmeted rifleman. Lv 1 a radio pack and goggles, Lv 2 a full rifle with a stock and
 * a darker uniform, Lv 3 a plate carrier and a big pack, Lv 4 a secret agent in a black suit
 * with a silenced pistol.
 */
export function makeScout(level) {
  const agent = level >= 4;
  const olive = level >= 2 ? 0x5a6b34 : 0x6b7d3a;
  const h = makeHumanoid(
    agent
      ? { skin: 0xe0ac69, shirt: 0x1c1c22, pants: 0x141418, arms: 0x1c1c22, face: 'agent' }
      : { skin: 0xe0ac69, shirt: olive, pants: 0x4b5320, arms: olive, face: 'soldier' },
  );
  const key = `scout${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (agent) {
    hair(hd, 0x1a1209, { h: 0.36 });
    hd.box(0.05, 0.12, 0.3, 0x1a1209, 0.2, 1.2, 0.42, { rz: -0.4 }); // side part
    hd.cyl(0.08, 0.16, INK, -0.66, 0.6, 0.05, { axis: 'x', seg: 8 }); // earpiece
    hd.tube([[-0.68, 0.55, 0.05], [-0.7, 0.2, -0.1], [-0.55, -0.1, -0.2]], 0.02, 0xd0d0d0, { seg: 6, sides: 4 });
    // white shirt, red tie, jacket lapels and a pocket square
    t.box(0.62, 1.7, 0.05, 0xffffff, 0, 0.12, 0.52);
    t.box(0.2, 0.2, 0.08, 0x8b0000, 0, 0.88, 0.56);
    t.slab(0.24, 1.25, 0.06, 0x8b0000, 0, 0.12, 0.56, { tw: 0.8, bw: 1.2 });
    for (const s of [-1, 1]) t.box(0.36, 1.5, 0.08, 0x26262e, s * 0.42, 0.2, 0.55, { rz: s * 0.18 });
    t.box(0.3, 0.12, 0.05, 0xffffff, 0.55, 0.5, 0.56);
    t.box(2.06, 0.2, 1.06, 0x101012, 0, -0.84, 0);
  } else {
    helmet(hd, level >= 2 ? 0x3e4a2a : 0x556b2f, { cover: level >= 2 ? 0x6b5a3a : 0x3e4a2a });
    if (level >= 1) goggles(hd, 1.24, 0x4fc3f7, { r: 0.76, strap: 0x3e4a2a });
    collar(t, olive);
    pockets(t, tone(olive, 0.92));
    belt(t, 0x3e2723, 0x9e9e9e);
    canteen(t, 0.8);
    pouch(t, -0.6, -0.95, 0.52, 0.36, 0.34, 0x4b5320);
    if (level >= 3) {
      vest(t, 0x2f3326, { pouches: 3, patch: 0x556b2f });
      pack(t, 0x4a3b24, { w: 1.6, h: 1.6, d: 0.72, roll: 0x6b6247 });
      radio(t, 0.45, 0.65, -1.15, 0x4b5320, 1.6);
    } else if (level >= 1) {
      pack(t, 0x4b5320, { w: 1.3, h: 1.35, d: 0.55 });
      radio(t, 0.38, 0.5, -1.0, 0x3e4a2a, 1.7);
    }
  }
  t.done();
  hd.done();
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    boots(b, agent ? 0x0c0c0c : 0x3e2723, agent ? { sole: 0x050505 } : {});
    if (level >= 3 && !agent) kneePad(b, 0x2f3326);
    b.done();
  }
  if (!agent) {
    const a = wear(h, h.leftArm, `${key}:larm`);
    armPatch(a, 1, 0x3e4a2a, 0xffd54f);
    a.done();
  }
  const g = fist(h.rightArm, -1.9, agent ? 1.35 : 1.2);
  const gk = wear(h, g, `${key}:gun`);
  h.muzzles = [];
  const [y, z] = agent
    ? pistol(gk, { len: 1.0, can: true, body: 0x1b1b1f })
    : level >= 2
      ? rifle(gk, { len: 2.25, furn: 0x5d4037, mag: 'curved', optic: level >= 3 ? 'dot' : 'iron', light: level >= 3 })
      : rifle(gk, { len: 1.55, mag: 'box', stock: false, optic: false });
  gk.done();
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = agent ? 0xb3e5fc : 0xffe066;
  return own(h, agent ? 0.3 : UP);
}

// ------------------------------------------------------------------ Classic Scout

/**
 * Classic Scout (alternate Scout form): a ranger with a handgun. Lv 1 a belt of spare mags,
 * Lv 2 aviator shades and a laser sight, Lv 3 a helmet with purple goggles, a plate carrier,
 * knee pads and gloves, Lv 4 akimbo handguns, a long coat and a red scarf.
 * A purple Dimension Shard badge marks it as an alternate form.
 */
export function makeScoutClassic(level) {
  const akimbo = level >= 4;
  const geared = level >= 3;
  const shirt = akimbo ? 0x2a1f3d : geared ? 0x5d5040 : level >= 2 ? 0x6d4c41 : 0xc8a165;
  const h = makeHumanoid({ skin: 0xd9a066, shirt, pants: akimbo ? 0x1c1726 : 0x5d4037, arms: shirt, face: 'soldier' });
  const shard = shardOf(h);
  const key = `scoutClassic${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (geared) {
    const hc = akimbo ? 0x1c1726 : 0x4a4436;
    helmet(hd, hc, { cover: tone(hc, 0.7) });
    goggles(hd, 1.22, shard, { r: 0.76, strap: tone(hc, 0.6) });
    vest(t, akimbo ? 0x14101c : 0x3b3a2c, { pouches: 2 });
    t.box(0.34, 0.34, 0.06, shard, 0.55, 0.5, 0.69); // shard badge on the vest
  } else {
    cap(hd, 0xd84315);
    hd.box(0.26, 0.26, 0.05, shard, 0, 1.18, 0.64, { rx: -0.35 });
    collar(t, tone(shirt, 0.85));
    pockets(t, tone(shirt, 0.9));
    t.box(0.34, 0.34, 0.05, shard, 0.5, 0.05, 0.53);
  }
  if (level >= 1) {
    belt(t, 0x3e2723, 0xd4af37);
    for (const x of [-0.72, -0.4, 0.4, 0.72]) pouch(t, x, -0.78, 0.54, 0.24, 0.42, 0x212121, 0.16);
  }
  if (level >= 2) shades(hd, 0xd4af37, 0x111111, { y: 0.7 });
  if (akimbo) {
    // a long dark coat with tails and a red scarf
    for (const s of [-1, 1]) t.slab(0.95, 1.7, 0.16, 0x2a1f3d, s * 0.5, -1.5, -0.5, { bw: 1.15, bx: s * 0.06 });
    for (const s of [-1, 1]) t.box(0.22, 2.4, 1.1, 0x2a1f3d, s * 1.0, -0.6, 0);
    t.cyl(0.7, 0.36, 0xc62828, 0, 0.92, 0.02, { seg: 14, sx: 1.25, sz: 0.85 });
    t.box(0.36, 0.95, 0.1, 0xc62828, -0.45, 0.3, 0.6, { rz: 0.12 });
  }
  hd.done();
  t.done();
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    boots(b, akimbo ? 0x14101c : 0x4e342e);
    if (geared) kneePad(b, 0x212121);
    b.done();
  }
  if (geared) {
    for (const arm of [h.rightArm, h.leftArm]) {
      const gl = wear(h, arm, `${key}:glove`);
      glove(gl, 0x212121);
      gl.done();
    }
  }
  const gunOpts = { laser: level >= 2 ? 0xff1744 : null, trim: akimbo ? shard : null, body: akimbo ? 0x37474f : GUNMETAL };
  h.muzzles = [];
  for (const arm of akimbo ? [h.rightArm, h.leftArm] : [h.rightArm]) {
    const g = fist(arm, -1.9, 1.4);
    const gk = wear(h, g, `${key}:gun`);
    const [y, z] = pistol(gk, gunOpts);
    gk.done();
    muzzle(h, g, y, z);
  }
  if (akimbo) aimBoth(h);
  else aimLong(h); // one-handed, the left hand steadying the wrist
  h.tracer = akimbo ? 0xb388ff : 0xffe066;
  return own(h, 0.3);
}

// ------------------------------------------------------------------ Darter

/**
 * Darter (free alternate Scout form): a kid in a hoodie throwing darts. Lv 1 a dart quiver on the
 * hip, Lv 2 a headband, Lv 3 goggles and fire-tipped darts, Lv 4 a jacket with glowing blue
 * shock darts. A purple Dimension Shard badge marks it as an alternate form.
 */
export function makeDarter(level) {
  const shock = level >= 4;
  const fire = level >= 3;
  const shirt = shock ? 0x1a237e : 0x00897b;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt, pants: 0x37474f, arms: shirt, face: 'soldier' });
  const shard = shardOf(h);
  const tipCol = shock ? glowMat(h, 0x40c4ff) : fire ? glowMat(h, 0xff7043) : 0x9e9e9e;
  const flights = shock ? 0x40c4ff : 0xffeb3b;
  const key = `darter${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const hood = shock ? 0x283593 : 0x00796b;
  hair(hd, 0x6d4c41, { h: 0.36 });
  hd.box(0.9, 0.16, 0.2, 0x6d4c41, 0.05, 1.12, 0.5, { rx: -0.5, rz: 0.1 }); // fringe
  // the hood bunched behind the neck, its drawstrings and the front pocket
  t.box(1.7, 0.55, 0.5, hood, 0, 0.92, -0.42, { r: 0.2 });
  t.torus(0.62, 0.12, hood, 0, 1.0, -0.05, { rx: PI / 2, seg: 16, arc: PI, rz: PI });
  for (const s of [-1, 1]) {
    t.cyl(0.03, 0.55, 0xeeeeee, s * 0.2, 0.62, 0.53, { seg: 5 });
    t.ball(0.05, 0xeeeeee, s * 0.2, 0.33, 0.54, { seg: 6, rows: 4 });
  }
  t.slab(1.2, 0.55, 0.08, tone(shirt, 0.85), 0, -0.5, 0.52, { tw: 0.75 });
  t.box(2.04, 0.2, 1.04, tone(shirt, 0.8), 0, -0.9, 0); // ribbed hem
  t.box(0.34, 0.34, 0.05, shard, 0.55, 0.45, 0.53);
  if (level >= 1) {
    // a quiver of darts on the right hip
    t.cyl(0.26, 1.0, LEATHER, -1.18, -0.55, 0, { seg: 12 });
    t.torus(0.26, 0.04, tone(LEATHER, 0.7), -1.18, -0.08, 0, { rx: PI / 2, seg: 12 });
    for (const [dx, dz] of [[-0.08, -0.08], [0.08, 0.06], [0, 0.12]]) {
      t.cyl(0.03, 0.5, 0x8d6e63, -1.18 + dx, 0.1, dz, { seg: 5 });
      t.box(0.16, 0.14, 0.02, flights, -1.18 + dx, 0.32, dz);
    }
    t.box(0.08, 1.5, 1.12, LEATHER, -0.6, -0.3, 0, { rz: -0.5 }); // strap
  }
  if (level >= 2) headband(hd, 0xc62828, 1.0);
  if (fire) goggles(hd, 0.72, shard, { frame: 0x263238 });
  if (shock) {
    // a zipped jacket over the hoodie, with a glowing zip
    for (const s of [-1, 1]) t.box(0.98, 1.85, 1.12, 0x0d1450, s * 0.53, 0.0, 0, { r: 0.05 });
    t.box(0.08, 1.7, 0.06, glowMat(h, 0x40c4ff), 0, 0.0, 0.58);
    for (const s of [-1, 1]) t.box(0.3, 0.5, 0.06, 0x0d1450, s * 0.35, 0.9, 0.55, { rz: s * -0.35 });
  }
  hd.done();
  t.done();
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    boots(b, 0xeeeeee, { sole: 0xc62828, cuff: 0xeeeeee });
    b.done();
  }
  // a dart held point-first in the raised right hand
  const g = fist(h.rightArm, -2.1);
  const dk = wear(h, g, `${key}:dart`);
  g.scale.setScalar(1.25);
  dk.cyl(0.05, 0.75, 0x8d6e63, 0, -0.2, 0, { seg: 6 });
  for (const ry of [0, PI / 2]) dk.prism([[-0.06, 0.12], [0.06, 0.12], [0.18, 0.42], [-0.18, 0.42]].map(([a, b]) => [a, b]), 0.02, flights, 0, 0, 0, { ry });
  dk.cyl(0.07, 0.12, INK, 0, -0.58, 0, { seg: 8 });
  dk.cyl(0.07, 0.32, tipCol, 0, -0.8, 0, { seg: 8, r2: 0.07, rx: PI });
  dk.done();
  h.muzzles = [];
  muzzle(h, g, -0.6, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -2.8, left: -1.0, leftRecoil: 0 };
  h.swing = 1.9;
  h.flight = { color: shock ? 0x40c4ff : fire ? 0xff7043 : 0xffeb3b, size: 0.25 };
  h.tracer = h.flight.color;
  return own(h, 0);
}

// ------------------------------------------------------------------ Paintballer

/**
 * Paintballer: a paintball player with a hopper-fed marker. Lv 1 a full mask with a tinted
 * visor, Lv 2 shoulder pads and a chest protector, Lv 3 a double-barrel marker, Lv 4 pink pro
 * gear with a harness of paint pods, Lv 5 a gold belt and gold marker (the champion).
 */
export function makePaintballer(level) {
  const pro = level >= 4;
  const champ = level >= 5;
  const shirt = pro ? 0xd81b60 : level >= 2 ? 0x3949ab : 0x43a047;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt, pants: pro ? 0x212121 : 0x5d4037, arms: shirt, face: 'soldier' });
  const key = `paintballer${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (level >= 1) {
    // full mask: a vented guard over the mouth, a wrap-round visor and a strap
    const shell = pro ? 0x111111 : 0x37474f;
    band(hd, 0.63, 0.12, 0.5, 1.9, shell, 0.32);
    for (let i = -2; i <= 2; i++) hd.box(0.06, 0.24, 0.05, INK, i * 0.13, 0.3, 0.76 - Math.abs(i) * 0.03);
    band(hd, 0.64, 0.1, 0.36, 1.7, pro ? 0xffd600 : 0x4fc3f7, 0.74);
    band(hd, 0.62, 0.14, 0.08, 2.1, shell, 0.94);
    band(hd, 0.62, 0.14, 0.08, 2.1, shell, 0.54);
    hd.torus(0.66, 0.05, 0x37474f, 0, 0.78, 0, { rx: PI / 2, seg: 20 });
    hair(hd, tone(shirt, 0.8), { back: false }); // cloth head wrap
  } else {
    cap(hd, 0xf57f17);
  }
  if (level >= 2) {
    // shoulder pads and a padded chest protector
    for (const s of [-1, 1]) t.box(0.95, 0.38, 1.24, 0x212121, s * 1.3, 0.98, 0, { r: 0.12 });
    t.box(1.9, 1.1, 0.22, 0x263238, 0, 0.45, 0.56, { r: 0.08 });
    for (let i = 0; i < 3; i++) t.box(1.7, 0.04, 0.05, 0x37474f, 0, 0.75 - i * 0.3, 0.68);
  } else {
    collar(t, tone(shirt, 0.8), { buttons: false });
    t.box(0.6, 0.5, 0.05, 0xffffff, 0, 0.3, 0.52); // team number patch
    t.box(0.12, 0.34, 0.03, tone(shirt, 0.6), 0, 0.3, 0.55);
  }
  // a pod pack on the belt (and a harness of pods at Lv 4)
  belt(t, champ ? GOLD : 0x212121, champ ? glowMat(h, 0xffea00) : 0x9e9e9e);
  t.box(1.3, 0.4, 0.5, 0x212121, 0, -0.8, -0.72, { r: 0.08 });
  const podCol = champ ? 0xffd600 : 0xeeeeee;
  for (const x of [-0.4, 0, 0.4]) {
    t.cyl(0.13, pro ? 1.2 : 0.6, podCol, x, pro ? -0.25 : -0.6, -0.72, { seg: 10 });
    t.cyl(0.14, 0.1, 0xff1744, x, pro ? 0.38 : -0.27, -0.72, { seg: 10 });
  }
  if (pro) for (const s of [-1, 1]) t.box(0.2, 1.8, 0.08, 0x212121, s * 0.5, 0.0, -0.52);
  if (champ) t.ball(0.32, 0x00e676, -0.45, 0.5, 0.45, { sz: 0.35, seg: 10 }); // a splash of paint
  hd.done();
  t.done();
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    boots(b, pro ? 0x212121 : 0xeeeeee, { sole: 0x424242 });
    if (level >= 2) kneePad(b, 0x212121);
    b.done();
  }
  if (level >= 2) {
    for (const arm of [h.rightArm, h.leftArm]) {
      const gl = wear(h, arm, `${key}:glove`);
      glove(gl, 0x263238);
      gl.done();
    }
  }
  // the marker: body, feed neck, round hopper, air tank under the stock and a long barrel
  const len = pro ? 2.3 : 2.0;
  const body = champ ? GOLD : 0x546e7a;
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const U = UP;
  gk.box(0.3, 0.95, 0.36, body, 0, -0.28, U, { r: 0.08 });
  gk.box(0.24, 0.26, 0.5, 0x212121, 0, 0.06, U - 0.36, { rx: -0.25, r: 0.04 });
  gk.torus(0.1, 0.022, INK, 0, -0.16, U - 0.24, { ry: PI / 2, seg: 10, arc: PI });
  gk.cyl(0.07, len - 0.6, STEEL, 0, -0.75 - (len - 0.75) / 2, U + 0.02, { seg: 10 });
  for (let i = 0; i < 4; i++) gk.box(0.02, 0.1, 0.04, INK, 0.07, -1.3 - i * 0.18, U + 0.02);
  gk.cyl(0.1, 0.12, INK, 0, -len + 0.06, U + 0.02, { seg: 10 });
  gk.cyl(0.07, 0.3, 0x212121, 0, -0.35, U + 0.3, { seg: 8 }); // feed neck
  const hop = pro ? 0x212121 : 0xb0bec5;
  gk.ball(0.4, hop, 0, -0.35, U + 0.72, { sy: 0.85, sx: 0.8, seg: 14, rows: 9 });
  gk.cyl(0.24, 0.1, 0xff1744, 0, -0.35, U + 1.06, { axis: 'z', seg: 12 });
  gk.cyl(0.17, 0.75, champ ? 0xffd600 : 0x37474f, 0, 0.62, U - 0.04, { seg: 12 }); // air tank as the stock
  gk.ball(0.17, champ ? 0xffd600 : 0x37474f, 0, 1.0, U - 0.04, { seg: 10, rows: 6 });
  gk.cyl(0.1, 0.12, STEEL, 0, 0.22, U - 0.04, { seg: 10 });
  if (level >= 3) {
    gk.cyl(0.07, len - 0.6, STEEL, 0.3, -0.75 - (len - 0.75) / 2, U + 0.02, { seg: 10 });
    gk.cyl(0.1, 0.12, INK, 0.3, -len + 0.06, U + 0.02, { seg: 10 });
    gk.box(0.36, 0.14, 0.14, body, 0.15, -0.8, U + 0.02);
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, -len, U + 0.02);
  if (level >= 3) muzzle(h, g, -len, U + 0.02, 0.3);
  aimLong(h);
  h.projectile = { color: [0xff1744, 0x2979ff, 0xffea00, 0x00e676, 0xd500f9][level % 5], size: 0.35, arc: 0.6 };
  return own(h);
}

// ------------------------------------------------------------------ Tweeter

/** The Tweeter's little blue bird (bird space: it faces +z, sitting on y 0). */
function bird(k) {
  const blue = 0x1e88e5;
  const dk = 0x1565c0;
  k.ball(0.3, blue, 0, 0.05, 0, { sz: 1.25, seg: 12, rows: 8 });
  k.ball(0.24, 0xbbdefb, 0, -0.02, 0.12, { sz: 1.1, seg: 10, rows: 6 }); // pale belly
  k.ball(0.22, blue, 0, 0.36, 0.22, { seg: 12, rows: 8 });
  k.cyl(0.09, 0.2, 0xffa000, 0, 0.33, 0.48, { axis: 'z', r2: 0.0, seg: 8 });
  for (const s of [-1, 1]) {
    k.ball(0.045, 0x111111, s * 0.13, 0.42, 0.39, { seg: 6, rows: 4 });
    k.ball(0.22, dk, s * 0.24, 0.07, -0.05, { sx: 0.35, sz: 1.3, seg: 10, rows: 6 }); // wings
    k.cyl(0.025, 0.2, 0xffa000, s * 0.1, -0.3, 0.05, { seg: 5 }); // legs
  }
  k.box(0.3, 0.06, 0.4, dk, 0, 0.05, -0.5, { rx: -0.35 }); // tail
  k.ball(0.06, blue, 0, 0.6, 0.18, { seg: 6, rows: 4 }); // crest
}

/** A top hat on the head (head space). */
function topHat(k, col, bandCol) {
  k.cyl(0.92, 0.07, col, 0, 1.2, 0, { seg: 22 });
  k.cyl(0.58, 0.95, col, 0, 1.7, 0, { seg: 20, r2: 0.62 });
  k.cyl(0.6, 0.2, bandCol, 0, 1.36, 0, { seg: 20 });
}

/**
 * Tweeter: pistol and a little blue bird on the left shoulder. Lv 1 gold-framed shades and a gold
 * chain, Lv 2 a top hat and a phone in the free hand, Lv 3 a second pistol, Lv 4 dressed in white
 * with feathered wings, standing on a cloud.
 */
export function makeTweeter(level) {
  const chit = level >= 4;
  const shirt = chit ? 0xe3f2fd : 0x29b6f6;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt, pants: 0x37474f, arms: shirt });
  const gold = 0xd4af37;
  const key = `tweeter${level}`;
  const b = new THREE.Group();
  b.position.set(1.5, 4.55, 0);
  h.body.add(b);
  const bk = wear(h, b, 'tweeter:bird');
  bird(bk);
  bk.done();
  h.bird = b;

  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0xfdd835, { h: 0.38 });
  hd.box(0.7, 0.18, 0.3, 0xfdd835, 0.15, 1.2, 0.45, { rx: -0.6, rz: 0.2 }); // swoosh
  collar(t, chit ? 0xffffff : 0x0288d1, { button: 0xffffff });
  t.box(0.5, 0.36, 0.06, 0xffffff, -0.5, 0.35, 0.52); // the bird logo patch
  t.ball(0.1, 0x1e88e5, -0.5, 0.35, 0.56, { sx: 1.3, sz: 0.4, seg: 8, rows: 5 });
  belt(t, 0x212121, gold);
  if (level >= 1) {
    shades(hd, gold, 0xfafafa, { y: 0.7, w: 0.42 });
    // a chunky gold chain and pendant
    for (let i = 0; i < 9; i++) {
      const a = -1.25 + (i / 8) * 2.5;
      t.torus(0.07, 0.025, gold, Math.sin(a) * 0.62, 0.95 - Math.cos(a) * 0.3 + 0.3 - Math.abs(Math.sin(a)) * 0.05, 0.53 + 0.02, { ry: i % 2 ? PI / 2 : 0, seg: 8 });
    }
    t.box(0.3, 0.36, 0.06, gold, 0, 0.32, 0.56, { r: 0.03 });
  }
  if (level >= 2) topHat(hd, 0x161616, 0x2e7d32);
  if (chit) {
    // feathered wings on the back: three long feathers a side, fanned out
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        t.box(0.16, 1.7 - i * 0.3, 0.42, 0xffffff, s * (0.6 + i * 0.35), 0.5 - i * 0.15, -0.75 - i * 0.1, { rz: s * (0.4 + i * 0.25), ry: s * 0.4, r: 0.07 });
      }
    }
    const c = wear(h, h.root, 'tweeter:cloud');
    for (const [x, y, z, r] of [[0, 0.4, 0, 1.0], [-1.1, 0.45, 0.3, 0.8], [1.1, 0.4, -0.3, 0.8], [0.3, 0.5, 0.8, 0.7], [-0.4, 0.5, -0.8, 0.7]]) c.ball(r, 0xf5f5f5, x, y, z, { sy: 0.5, seg: 12, rows: 6 });
    c.done();
    h.lift = 0.7;
    h.body.position.y = h.lift;
  }
  hd.done();
  t.done();
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const lk = wear(h, leg, `${key}:leg`);
    boots(lk, 0xffffff, { sole: 0x1e88e5 });
    lk.done();
  }
  const pistolOpts = { body: chit ? 0xc9a227 : GUNMETAL, grip: chit ? 0xfff8e1 : 0x1f1f1f, len: 0.85 };
  h.muzzles = [];
  for (const arm of level >= 3 ? [h.rightArm, h.leftArm] : [h.rightArm]) {
    const g = fist(arm, -1.9, 1.4);
    const gk = wear(h, g, `${key}:gun`);
    const [y, z] = pistol(gk, pistolOpts);
    gk.done();
    muzzle(h, g, y, z);
  }
  if (level >= 3) aimBoth(h);
  else {
    // one pistol; the left hand is free (and holds a phone from Lv 2)
    h.rightArm.rotation.set(-PI / 2, 0, 0.05);
    h.leftArm.rotation.set(-0.9, 0, -0.25);
    h.pose = { right: -PI / 2, left: -0.9, leftRecoil: 0 };
    if (level >= 2) {
      const p = fist(h.leftArm, -2.15);
      const pk = wear(h, p, 'tweeter:phone');
      pk.box(0.1, 0.85, 0.48, 0x212121, 0, 0, 0.45, { r: 0.04 });
      pk.box(0.03, 0.72, 0.4, glowMat(h, 0x66ff99, 0.6), -0.06, 0, 0.45);
      pk.done();
    }
  }
  h.tracer = chit ? 0x4fc3f7 : 0xffd54f;
  return own(h, 0.3);
}

// ------------------------------------------------------------------ Cowboy

/** A cowboy hat (head space): wide brim curled up at the sides, pinched crown and a band. */
function cowboyHat(k, col, bandCol) {
  k.cyl(1.05, 0.07, col, 0, 1.12, 0, { seg: 24, sz: 0.88 });
  for (const s of [-1, 1]) k.box(0.18, 0.3, 1.5, col, s * 0.98, 1.24, 0, { rz: s * -0.55, r: 0.04 });
  k.cyl(0.6, 0.62, col, 0, 1.45, 0, { seg: 18, r2: 0.5, sz: 0.9 });
  k.box(0.12, 0.12, 0.9, tone(col, 0.7), 0, 1.74, 0); // the dent in the top
  k.cyl(0.61, 0.15, bandCol, 0, 1.22, 0, { seg: 18, sz: 0.9 });
}

/**
 * Cowboy: hat, neckerchief and a revolver. Lv 2 a lucky horseshoe on the belt, Lv 3 a long duster
 * and a gold star, Lv 4 a second revolver and a bandolier, Lv 5 dressed all in black as an outlaw
 * with a red mask and gold six-shooters.
 */
export function makeCowboy(level) {
  const outlaw = level >= 5;
  const shirt = outlaw ? 0x212121 : 0xc0703a;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: outlaw ? 0x263238 : 0x3f6aa8, arms: shirt });
  const key = `cowboy${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  cowboyHat(hd, outlaw ? 0x111111 : 0x8d5a2b, outlaw ? 0xc62828 : 0x3e2723);
  const red = 0xd32f2f;
  if (outlaw) {
    band(hd, 0.63, 0.06, 0.5, 3.6, red, 0.3); // a mask over the face
    hd.box(0.3, 0.35, 0.08, red, 0, 0.0, 0.62, { rx: 0.2 });
  }
  // a western shirt: yoke stripes, snap buttons
  for (const s of [-1, 1]) t.box(0.85, 0.12, 0.05, tone(shirt, 0.75), s * 0.5, 0.55, 0.52, { rz: s * 0.25 });
  for (let i = 0; i < 4; i++) t.cyl(0.045, 0.03, 0xeeeeee, 0, 0.55 - i * 0.38, 0.52, { axis: 'z', seg: 6 });
  if (level >= 1 && !outlaw) {
    // neckerchief: a knotted triangle
    t.prism([[-0.5, 0], [0.5, 0], [0, -0.55]].map(([a, b]) => [a, b]), 0.06, red, 0, 0.95, 0.53, { ry: PI / 2 });
    t.torus(0.55, 0.07, red, 0, 0.96, 0.0, { rx: PI / 2, seg: 16, sz: 0.9 });
  }
  // a wide belt with a big buckle and a holster on the right hip
  t.box(2.08, 0.3, 1.1, 0x3e2723, 0, -0.84, 0, { r: 0.04 });
  t.box(0.5, 0.36, 0.06, 0xffd54f, 0, -0.84, 0.57, { r: 0.04 });
  t.box(0.3, 0.2, 0.04, 0xb8860b, 0, -0.84, 0.61);
  t.box(0.36, 0.75, 0.3, LEATHER, -1.12, -1.15, 0.1, { r: 0.05 });
  if (level >= 2) t.torus(0.17, 0.045, 0xb0bec5, 0.7, -1.2, 0.6, { arc: PI * 1.4, rz: -PI * 0.2, seg: 10 }); // lucky horseshoe
  if (level >= 3) {
    // a long duster coat: back panel, side panels, lapels, and a gold star
    const coat = outlaw ? 0x1b1b1b : 0x795548;
    t.slab(2.16, 2.7, 0.16, coat, 0, -0.4, -0.6, { bw: 1.12 });
    for (const s of [-1, 1]) t.slab(0.26, 2.7, 1.12, coat, s * 1.0, -0.4, 0, { bw: 1.25, bx: s * 0.03 });
    for (const s of [-1, 1]) t.box(0.24, 1.2, 0.08, tone(coat, 0.85), s * 0.82, 0.35, 0.55, { rz: s * 0.15 });
    t.plan([...Array(10)].map((_, i) => [Math.sin((i * PI) / 5) * (i % 2 ? 0.08 : 0.2), Math.cos((i * PI) / 5) * (i % 2 ? 0.08 : 0.2)]), 0.05, glowMat(h, 0xffd54f, 0.5), -0.55, 0.45, 0.54, { rx: PI / 2 });
  }
  if (level >= 4) {
    // a bandolier of bullets across the chest
    t.box(0.3, 2.6, 1.14, 0x5d4037, 0, 0, 0, { rz: 0.7 });
    for (let i = -2; i <= 2; i++) t.cyl(0.05, 0.22, GOLD, Math.sin(-0.7) * i * -0.4, Math.cos(0.7) * i * 0.4, 0.62, { seg: 6, rz: 0.7 });
  }
  hd.done();
  t.done();
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    boots(b, 0x4e342e, { heel: true, sole: 0x2b1d14 });
    b.box(1.12, 0.62, 0.08, 0x3e2723, 0, -1.6, 0.56); // stitched boot front
    b.torus(0.12, 0.03, 0xb0bec5, 0, -1.92, -0.62, { seg: 10 }); // spur
    b.done();
  }
  const metal = outlaw ? GOLD : 0x6d6d6d;
  const guns = [];
  h.muzzles = [];
  for (const arm of level >= 4 ? [h.rightArm, h.leftArm] : [h.rightArm]) {
    const g = fist(arm, -1.9, 1.35);
    const gk = wear(h, g, `${key}:gun`);
    const [y, z] = revolver(gk, { metal, grip: outlaw ? 0xfff8e1 : WOOD });
    gk.done();
    g.userData.muzzle = muzzle(h, g, y, z);
    guns.push(g);
  }
  h.rightArm.rotation.set(-PI / 2, 0, 0.05);
  if (level >= 4) aimBoth(h);
  else {
    h.leftArm.rotation.set(-0.15, 0, -0.15); // thumb in the belt
    h.pose = { right: -PI / 2, left: -0.15, leftRecoil: 0 };
  }
  h.twirl = guns;
  h.tracer = outlaw ? 0xffc107 : 0xffe066;
  return own(h, 0.3);
}

// ------------------------------------------------------------------ Soldier

/**
 * Soldier: an assault rifle that fires bursts. Lv 1 shades and chest webbing, Lv 2 a headset and
 * a radio pack, Lv 3 a plate carrier with pouches and a red headband, Lv 4 the Super Soldier:
 * blue armour, a visor helmet, a glowing chest core and a laser rifle.
 */
export function makeSoldier(level) {
  const sup = level >= 4;
  const tan = 0x7a6a45;
  const h = makeHumanoid(
    sup
      ? { skin: 0xc68642, shirt: 0x1a237e, pants: 0x0d1440, arms: 0x283593, face: 'soldier' }
      : { skin: 0xc68642, shirt: tan, pants: 0x4e4630, arms: tan, face: 'soldier' },
  );
  const key = `soldier${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const cyan = glowMat(h, 0x00e5ff);
  if (sup) {
    // armour: rounded chest and back plates, ab plates, big shoulder pads, a glowing core
    const armor = 0x3949ab;
    t.box(2.16, 1.2, 1.18, armor, 0, 0.35, 0, { r: 0.18 });
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) t.box(0.7, 0.24, 0.12, tone(armor, 0.85), s * 0.4, -0.4 - i * 0.28, 0.54, { r: 0.04 });
    for (const s of [-1, 1]) {
      t.ball(0.62, armor, s * 1.45, 0.95, 0, { sy: 0.55, seg: 14, rows: 8 });
      t.box(0.5, 0.06, 0.9, tone(armor, 0.7), s * 1.45, 0.75, 0);
    }
    t.cyl(0.3, 0.14, tone(armor, 0.6), 0, 0.4, 0.62, { axis: 'z', seg: 14 });
    t.cyl(0.2, 0.1, cyan, 0, 0.4, 0.7, { axis: 'z', seg: 14 });
    belt(t, 0x1a237e, cyan);
    // the helmet: a full round shell with a glowing visor and an ear fin
    dome(hd, 0.74, 0.7, armor, 0, 0.75, 0);
    hd.cyl(0.74, 0.8, armor, 0, 0.36, 0, { seg: 22 });
    band(hd, 0.74, 0.06, 0.32, 1.9, cyan, 0.72);
    for (const s of [-1, 1]) hd.box(0.08, 0.4, 0.5, tone(armor, 0.7), s * 0.76, 0.7, -0.05, { r: 0.03 });
    hd.box(0.08, 0.3, 0.7, tone(armor, 0.8), 0, 1.45, -0.1, { r: 0.03 });
  } else {
    hair(hd, 0x2b1d0e, { h: 0.38 });
    collar(t, tone(tan, 0.85));
    pockets(t, tone(tan, 0.9));
    belt(t, 0x3e2723, 0x9e9e9e);
    canteen(t, 0.82, 0x5d5a3a);
    if (level >= 1) {
      shades(hd, 0x0a0a0a, 0x1a1a1a);
      // chest webbing: crossing straps
      for (const s of [-1, 1]) sash(t, 0x3e2723, s, 0.26);
    }
    if (level >= 2) {
      headset(hd);
      pack(t, 0x4b5320, { w: 1.4, h: 1.5, d: 0.6 });
      radio(t, -0.4, 0.55, -1.08, 0x3e4a2a, 2.0);
    }
    if (level >= 3) {
      vest(t, 0x3b3f2a, { pouches: 3, pouch: 0x5d4037, patch: 0xc62828 });
      headband(hd, 0xc62828, 1.0);
    }
  }
  hd.done();
  t.done();
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    if (sup) {
      b.box(1.08, 0.75, 1.12, 0x3949ab, 0, -1.6, 0.02, { r: 0.1 });
      b.box(1.12, 0.14, 1.2, INK, 0, -1.96, 0.06);
      b.box(0.9, 0.55, 0.2, 0x3949ab, 0, -0.95, 0.54, { r: 0.08 });
    } else {
      boots(b, 0x5d4a2f);
      if (level >= 3) kneePad(b, 0x3b3f2a);
    }
    b.done();
  }
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    if (sup) a.box(1.08, 0.6, 1.08, 0x3949ab, 0, -0.4, 0, { r: 0.1 });
    else armPatch(a, s, tone(tan, 0.8), s > 0 ? 0xc62828 : 0xffd54f);
    a.done();
  }
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = sup
    ? rifle(gk, { len: 2.15, body: 0xeceff1, furn: 0xb0bec5, mag: false, optic: 'dot', lens: 0x00e5ff, glow: cyan })
    : rifle(gk, { len: 2.15, furn: 0x4e342e, mag: 'curved', optic: level >= 2 ? 'dot' : 'iron', light: level >= 3 });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = sup ? 0x00e5ff : 0xffc107;
  return own(h);
}
