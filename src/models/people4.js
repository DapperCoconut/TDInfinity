// Tower models: people, batch 4 (dressed with the vehicle kit in ../vehicles.js).
// In here: Aviator, Ace Pilot, Phaser, Accelerator, Railgunner, Ranger, Laser Railgunner (+bottom).
// Each makeX(level) builds one tower's look; TOWER_MODELS in ../models.js says which tower uses which.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.
// The planes the two pilots fly are still makePlane (towers01.js) and makeAcePlane (towers05.js).

import * as THREE from 'three';
import { antenna, barrel, glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { makePlane } from './towers01.js';
import { makeAcePlane } from './towers05.js';
import {
  GOLD, GUNMETAL, INK, LEATHER, STEEL, UP, aimLong, band, belt, boots, cap, collar, cowboyHat, dome, fist, glove,
  goggles, hair, headset, kneePad, muzzle, own, pack, pouch, radio, shardOf, wear,
} from './people1.js';
import { boltRifle, duster, shoulderPads } from './people2.js';
import { bandolier } from './people3.js';

const PI = Math.PI;

// ------------------------------------------------------------------ shared bits for this batch

/** An old leather flying cap: a snug crown, ear flaps, a chin strap and goggles up on the brow (head space). */
function leatherCap(k, col, lens) {
  dome(k, 0.7, 0.5, col, 0, 0.92, -0.02);
  band(k, 0.68, 0.06, 0.62, 3.4, col, 0.62, { ry: PI }); // round the back and sides
  for (const s of [-1, 1]) {
    k.box(0.16, 0.66, 0.6, col, s * 0.68, 0.42, 0.02, { r: 0.07 }); // ear flaps
    k.cyl(0.1, 0.04, tone(col, 0.7), s * 0.77, 0.5, 0.02, { axis: 'x', seg: 8 }); // ear studs
  }
  k.tube([[-0.68, 0.14, 0.12], [-0.4, -0.08, 0.42], [0.4, -0.08, 0.42], [0.68, 0.14, 0.12]], 0.035, tone(col, 0.7), { seg: 10, sides: 4 });
  for (let i = 0; i < 3; i++) k.box(0.03, 0.42, 0.03, tone(col, 0.75), -0.3 + i * 0.3, 1.18, 0.4 - Math.abs(i - 1) * 0.06, { rx: -0.9 }); // seams
  goggles(k, 1.06, lens, { r: 0.7, frame: 0x8d6e63, strap: tone(col, 0.7) });
}

/** A round flight helmet with a visor, ear pods and a ridge (head space). o.mask: an oxygen mask and hose. */
function flightHelmet(k, col, visor, o = {}) {
  dome(k, 0.78, 0.68, col, 0, 0.8, 0);
  k.cyl(0.78, 0.6, col, 0, 0.5, 0, { seg: 22, open: true });
  band(k, 0.8, 0.08, 0.12, 2.0, tone(col, 0.8), 1.08); // visor housing
  band(k, 0.8, 0.05, 0.38, 1.9, visor, 0.84); // visor
  for (const s of [-1, 1]) {
    k.cyl(0.24, 0.12, tone(col, 0.85), s * 0.8, 0.6, 0, { axis: 'x', seg: 14 }); // ear pods
    k.cyl(0.1, 0.04, INK, s * 0.87, 0.6, 0, { axis: 'x', seg: 8 });
  }
  k.box(0.14, 0.2, 1.1, tone(col, 0.85), 0, 1.5, -0.08, { r: 0.05 }); // ridge
  if (o.stripe != null) k.box(0.1, 0.06, 1.0, o.stripe, 0, 1.6, -0.08);
  if (o.mask) {
    k.cyl(0.26, 0.3, o.mask, 0, 0.36, 0.66, { axis: 'z', seg: 14, r2: 0.18 });
    k.cyl(0.1, 0.04, INK, 0, 0.36, 0.82, { axis: 'z', seg: 10 });
    for (const s of [-1, 1]) k.box(0.04, 0.04, 0.5, INK, s * 0.26, 0.42, 0.42); // mask straps
    k.tube([[0.05, 0.22, 0.72], [0.25, -0.05, 0.75], [0.4, -0.3, 0.62]], 0.05, 0x37474f, { seg: 10, sides: 6 }); // hose
  }
}

/** A sci-fi helmet: round shell, a wide glowing visor in a frame, ear pods and a crest (head space). */
export function visorHelmet(k, col, visor, o = {}) {
  dome(k, 0.77, 0.66, col, 0, 0.78, 0);
  k.cyl(0.77, 0.62, col, 0, 0.48, 0, { seg: 22, open: true });
  band(k, 0.79, 0.09, 0.42, 2.1, tone(col, 0.6), 0.74); // visor frame
  band(k, 0.875, 0.04, 0.26, 1.85, visor, 0.74); // visor (just outside the frame)
  k.cyl(0.62, 0.1, tone(col, 0.7), 0, 0.12, 0, { seg: 20 }); // neck seal
  for (const s of [-1, 1]) {
    k.box(0.16, 0.5, 0.36, tone(col, 0.8), s * 0.78, 0.66, -0.05, { r: 0.06 }); // ear pods
    k.box(0.04, 0.26, 0.06, visor, s * 0.87, 0.66, 0.06);
  }
  if (o.crest != null) k.box(0.12, 0.26, 0.9, o.crest, 0, 1.48, -0.06, { r: 0.04 });
}

/** A neck scarf with a knot and a tail blowing out to the side (torso space). */
function scarf(k, col) {
  k.torus(0.5, 0.15, col, 0, 1.0, 0.02, { rx: PI / 2, seg: 16 });
  k.ball(0.18, tone(col, 0.92), 0.32, 0.86, 0.52, { seg: 10, rows: 7 }); // knot
  k.tube([[0.34, 0.8, 0.58], [0.5, 0.3, 0.64], [0.62, -0.25, 0.6]], 0.11, col, { seg: 10, sides: 6 });
  k.tube([[-0.2, 0.98, -0.5], [-0.6, 0.95, -0.85], [-1.1, 1.1, -1.1]], 0.1, col, { seg: 10, sides: 6 }); // tail
}

/** A leather jacket: fur collar, zip, slanted pockets and a ribbed waistband (torso space). */
function jacket(k, col, fur, o = {}) {
  k.box(2.14, 0.38, 1.16, fur, 0, 0.86, 0, { r: 0.16 }); // fur collar
  for (const s of [-1, 1]) k.box(0.36, 0.7, 0.1, fur, s * 0.42, 0.45, 0.54, { rz: s * 0.28, r: 0.04 }); // fur lapels
  k.box(0.06, 1.5, 0.06, o.zip ?? 0xbdbdbd, 0.06, -0.15, 0.53); // zip
  for (const s of [-1, 1]) k.box(0.5, 0.1, 0.06, tone(col, 0.75), s * 0.55, -0.35, 0.53, { rz: s * -0.5 }); // pocket welts
  k.box(2.1, 0.24, 1.1, tone(col, 0.8), 0, -0.88, 0, { r: 0.04 }); // waistband
  for (let i = 0; i < 9; i++) k.box(0.03, 0.22, 0.03, tone(col, 0.6), -0.8 + i * 0.2, -0.88, 0.56); // ribs
}

/** A ground crew light wand held up in the fist (gun space: it points along -y). */
function wand(k, light) {
  k.cyl(0.08, 0.36, INK, 0, -0.05, 0.1, { seg: 8 });
  k.cyl(0.11, 0.08, 0x37474f, 0, -0.26, 0.1, { seg: 10 });
  k.cyl(0.1, 1.0, light, 0, -0.8, 0.1, { seg: 10, r2: 0.06 });
}

/** A low bomb trolley on the pad with two bombs on it (root space; x, z: where it stands). */
function bombCart(k, x, z, bomb = 0x37474f) {
  k.box(1.7, 0.1, 1.0, 0x5d4037, x, 0.42, z, { r: 0.03 }); // bed
  for (const s of [-1, 1]) k.box(1.7, 0.16, 0.08, 0x4e342e, x, 0.52, z + s * 0.48); // side rails
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    k.cyl(0.2, 0.12, 0x212121, x + sx * 0.6, 0.2, z + sz * 0.42, { axis: 'z', seg: 14 });
    k.cyl(0.08, 0.14, STEEL, x + sx * 0.6, 0.2, z + sz * 0.42, { axis: 'z', seg: 8 });
  }
  k.tube([[x - 0.85, 0.45, z], [x - 1.3, 0.62, z], [x - 1.45, 0.9, z]], 0.04, INK, { seg: 8, sides: 5 }); // tow bar
  k.box(0.08, 0.08, 0.5, INK, x - 1.45, 0.92, z);
  for (const bz of [-0.24, 0.24]) {
    k.cyl(0.21, 1.0, bomb, x + 0.05, 0.72, z + bz, { axis: 'x', seg: 14 });
    k.ball(0.21, bomb, x + 0.55, 0.72, z + bz, { sx: 1.5, seg: 12, rows: 8 }); // nose
    k.cyl(0.2, 0.32, bomb, x - 0.6, 0.72, z + bz, { axis: 'x', seg: 12, r2: 0.08 }); // tail cone
    k.torus(0.215, 0.03, 0xffca28, x + 0.3, 0.72, z + bz, { ry: PI / 2, seg: 16 }); // yellow band
    for (const a of [0, PI / 2]) k.box(0.3, 0.5, 0.04, tone(bomb, 0.8), x - 0.72, 0.72, z + bz, { rx: a }); // fins
  }
}

/**
 * A beam gun on the fist (gun space): stock, chunky receiver, a round barrel housing with glowing
 * rings and an emitter tip. o: len, body, trim, glow (material), rings, scope, fat (a size factor
 * for the barrel parts). Returns the bore point [y, z].
 */
export function beamGun(k, o = {}) {
  const len = o.len ?? 1.9;
  const body = o.body ?? 0xeceff1;
  const trim = o.trim ?? 0x546e7a;
  const f = o.fat ?? 1;
  const U = UP;
  k.box(0.26, 0.6, 0.34, body, 0, 0.5, U + 0.04, { r: 0.08 }); // stock
  k.box(0.28, 0.08, 0.4, INK, 0, 0.82, U + 0.04, { r: 0.02 });
  k.box(0.38, 1.0, 0.48 * f, body, 0, -0.3, U, { r: 0.1 }); // receiver
  k.box(0.04, 0.5, 0.2, o.glow, 0.2, -0.3, U + 0.04); // side light
  k.box(0.22, 0.26, 0.5, INK, 0, 0.1, U - 0.38, { rx: -0.32, r: 0.04 }); // grip
  k.torus(0.1, 0.022, INK, 0, -0.14, U - 0.26, { ry: PI / 2, seg: 10, arc: PI });
  const bl = len - 0.85;
  k.cyl(0.15 * f, bl, trim, 0, -0.8 - bl / 2, U, { seg: 14, r2: 0.13 * f }); // barrel housing
  k.box(0.1, bl * 0.8, 0.1, INK, 0, -0.8 - bl * 0.45, U + 0.15 * f); // top rib
  const n = o.rings ?? 2;
  for (let i = 0; i < n; i++) k.torus(0.2 * f, 0.05 * f, o.glow, 0, -0.95 - i * (bl * 0.7) / Math.max(1, n - 1 || 1), U, { rx: PI / 2, seg: 16 });
  k.cyl(0.21 * f, 0.3, body, 0, -len + 0.15, U, { seg: 16, r2: 0.15 * f }); // emitter bell
  k.cyl(0.13 * f, 0.08, o.glow, 0, -len - 0.02, U, { seg: 14 });
  if (o.scope) {
    k.cyl(0.09, 0.6, INK, 0, -0.45, U + 0.42, { seg: 10 });
    k.cyl(0.08, 0.02, o.glow, 0, -0.76, U + 0.42, { seg: 10 });
    k.box(0.1, 0.1, 0.18, INK, 0, -0.45, U + 0.3);
  }
  return [-len - 0.05, U];
}

/**
 * A rail rifle on the fist (gun space): a long stock, a receiver and two rails with glowing coils
 * round them, the bolt channel glowing between. o: len, body, glow (material), coils, scope,
 * cell (a power cell). Returns the bore point [y, z].
 */
function railRifle(k, o = {}) {
  const len = o.len ?? 3.0;
  const body = o.body ?? 0x263238;
  const U = UP;
  k.box(0.26, 0.7, 0.36, body, 0, 0.55, U - 0.02, { r: 0.07 }); // stock
  k.box(0.28, 0.08, 0.44, INK, 0, 0.92, U - 0.02, { r: 0.02 });
  k.box(0.08, 0.34, 0.12, tone(body, 0.8), 0.14, 0.5, U + 0.12, { r: 0.03 }); // cheek rest
  k.box(0.34, 1.1, 0.44, body, 0, -0.3, U, { r: 0.07 }); // receiver
  k.box(0.22, 0.26, 0.5, INK, 0, 0.1, U - 0.38, { rx: -0.32, r: 0.04 }); // grip
  k.torus(0.1, 0.022, INK, 0, -0.14, U - 0.26, { ry: PI / 2, seg: 10, arc: PI });
  const rl = len - 0.85;
  const ry = -0.85 - rl / 2;
  for (const s of [-1, 1]) k.box(0.1, rl, 0.12, STEEL, 0, ry, U + s * 0.15, { r: 0.03 }); // rails
  k.box(0.04, rl, 0.06, o.glow, 0, ry, U); // the glowing channel between them
  const n = o.coils ?? 4;
  for (let i = 0; i < n; i++) {
    const y = -1.0 - (i * (rl - 0.4)) / Math.max(1, n - 1);
    k.box(0.32, 0.12, 0.5, tone(body, 0.85), 0, y, U, { r: 0.04 }); // coil clamp
    k.box(0.36, 0.06, 0.54, o.glow, 0, y, U); // coil glow
  }
  k.box(0.3, 0.16, 0.48, tone(body, 0.75), 0, -len + 0.08, U, { r: 0.04 }); // muzzle cap
  if (o.scope !== false) {
    k.cyl(0.1, 0.8, INK, 0, -0.35, U + 0.42, { seg: 12 });
    k.cyl(0.13, 0.18, INK, 0, -0.8, U + 0.42, { seg: 12 });
    k.cyl(0.1, 0.02, o.lens ?? o.glow, 0, -0.9, U + 0.42, { seg: 12 });
    for (const y of [-0.55, -0.1]) k.box(0.12, 0.1, 0.18, INK, 0, y, U + 0.3);
  }
  if (o.cell) {
    k.box(0.4, 0.6, 0.4, 0x455a64, 0, -0.25, U - 0.45, { r: 0.06 }); // power cell under the receiver
    k.box(0.06, 0.4, 0.06, o.glow, 0.21, -0.25, U - 0.45);
  }
  return [-len, U];
}

/**
 * A rail cannon mounted on the pad in front of the gunner (root space, firing along +z).
 * o: big (a heavy base instead of a tripod), base (its width), dual (two barrels), len, bw (barrel width), gy, gz,
 * steel, glow (material), core (a glowing block on top), shield. Adds its muzzle.
 */
function railMount(h, key, o) {
  const mount = new THREE.Group();
  h.root.add(mount);
  const k = wear(h, mount, `${key}:mount`);
  const { gy, gz, bw, len } = o;
  const steel = o.steel;
  if (o.big) {
    const b = o.base ?? 3.4;
    k.box(b, 1.4, b, steel, 0, 0.7, gz, { r: 0.2 }); // heavy base
    for (const s of [-1, 1]) k.box(0.16, 1.0, b * 0.88, tone(steel, 0.75), s * (b / 2 + 0.02), 0.7, gz); // side skirts
    k.cyl(b * 0.35, 0.5, tone(steel, 0.8), 0, 1.6, gz, { seg: 20 }); // turntable
    k.box(b * 0.65, gy - 1.85, b * 0.7, 0x263238, 0, (gy + 1.85) / 2 - 0.05, gz, { r: 0.12 }); // cradle
  } else {
    k.cyl(0.2, 2.1, steel, 0, 1.15, gz, { seg: 10 }); // post
    for (const a of [0, 2.1, 4.2]) {
      const sx = Math.sin(a);
      const sz = Math.cos(a);
      k.tube([[sx * 0.12, 1.0, gz + sz * 0.12], [sx * 1.0, 0.05, gz + sz * 1.0]], 0.08, steel, { seg: 4, sides: 6 }); // tripod legs
      k.cyl(0.16, 0.06, INK, sx * 1.0, 0.03, gz + sz * 1.0, { seg: 10 }); // feet
    }
    k.cyl(0.32, 0.2, tone(steel, 0.8), 0, 2.2, gz, { seg: 14 }); // swivel
  }
  const xs = o.dual ? [-bw * 0.8, bw * 0.8] : [0];
  const bwide = (o.dual ? bw * 2.6 : bw) + 0.5;
  k.box(bwide, bw + 0.4, 1.8, steel, 0, gy, gz, { r: 0.12 }); // breech
  k.box(bwide * 0.7, 0.2, 1.2, INK, 0, gy + bw / 2 + 0.25, gz - 0.1, { r: 0.04 }); // top hatch
  for (const s of [-1, 1]) k.box(0.1, 0.5, 0.5, o.glow, s * (bwide / 2 + 0.02), gy, gz - 0.2); // side lights
  for (const x of xs) {
    barrel(k, x, gy, gz + 0.9, len, bw * 0.42, 0x212121, { r2: bw * 0.4 });
    const n = o.coils ?? 4;
    for (let i = 0; i < n; i++) {
      const z = gz + 1.4 + (i * (len - 1.2)) / Math.max(1, n - 1);
      k.torus(bw * 0.55, bw * 0.1, o.glow, x, gy, z, { seg: 16 });
      k.cyl(bw * 0.5, 0.16, tone(steel, 0.8), x, gy, z - 0.18, { axis: 'z', seg: 14 });
    }
    k.cyl(bw * 0.5, 0.4, tone(steel, 0.7), x, gy, gz + 0.9 + len - 0.2, { axis: 'z', seg: 14 }); // muzzle collar
  }
  if (o.dual) k.box(bw * 1.2, bw * 0.3, len * 0.8, tone(steel, 0.8), 0, gy, gz + 0.9 + len * 0.45); // web between the barrels
  if (o.rails) for (const s of [-1, 1]) k.box(0.4, 0.4, len * 0.65, 0x212121, s * (bw * 0.75 + 0.2), gy + bw * 0.55, gz + 0.9 + len * 0.3, { r: 0.06 }); // side rails
  if (o.shield) {
    k.box(1.8, 1.2, 0.12, steel, 0, gy + 0.25, gz - 0.25, { r: 0.04 }); // gun shield
    k.box(0.5, 0.2, 0.14, INK, 0, gy + 0.6, gz - 0.25); // vision slit
  }
  if (o.core) {
    k.box(0.9, 0.9, 0.9, tone(steel, 0.7), 0, gy + bw * 0.5 + 0.45, gz, { r: 0.1 });
    k.ball(0.38, o.core, 0, gy + bw * 0.5 + 0.95, gz, { seg: 12, rows: 8 });
  }
  // handles the gunner holds
  for (const s of [-1, 1]) k.tube([[s * 0.5, gy - 0.1, gz - 0.85], [s * 0.6, gy - 0.3, gz - 1.25], [s * 0.6, gy - 0.6, gz - 1.25]], 0.06, INK, { seg: 8, sides: 6 });
  k.done();
  const m = new THREE.Object3D();
  m.position.set(0, gy, gz + 0.9 + len + 0.2);
  mount.add(m);
  h.muzzles = [m];
}

/** Sits the gunner on a stool behind the mounted gun, hands forward on the handles. */
function seatBehind(h, key, steel) {
  const k = wear(h, h.root, `${key}:seat`);
  k.cyl(0.18, 0.7, steel, 0, 0.35, -0.3, { seg: 10 });
  k.box(1.6, 0.3, 1.4, steel, 0, 0.82, -0.3, { r: 0.08 });
  k.box(1.5, 0.14, 1.3, 0x212121, 0, 1.0, -0.3, { r: 0.06 }); // cushion
  k.cyl(0.8, 0.08, tone(steel, 0.8), 0, 0.04, -0.3, { seg: 16 }); // foot
  k.done();
  h.lift = -0.9;
  h.bob = 0.02;
  h.body.position.y = h.lift;
  h.rightLeg.rotation.x = -PI / 2;
  h.leftLeg.rotation.x = -PI / 2;
}

/** Both arms forward onto a mounted gun's handles. */
function gripMount(h) {
  h.rightArm.rotation.set(-PI / 2 + 0.2, 0, 0.2);
  h.leftArm.rotation.set(-PI / 2 + 0.2, 0, -0.2);
  h.pose = { right: -PI / 2 + 0.2, left: -PI / 2 + 0.2, leftRecoil: 0.35 };
}

/** Gloved hands with a sleeve band (so the rig sees the glove as a hand, not a held thing). */
function arms(h, key, glov, sleeve, extra) {
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    a.box(1.04, 0.16, 1.04, sleeve, 0, -0.7, 0, { r: 0.03 });
    glove(a, glov);
    extra?.(a, s);
    a.done();
  }
}

/** Boots on both legs, plus whatever `extra` adds to each leg. */
function legs(h, key, col, extra) {
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    boots(b, col);
    extra?.(b);
    b.done();
  }
}

/** A thigh pocket with a zip (leg space). */
const thighPocket = (k, col) => {
  k.box(0.5, 0.5, 0.12, col, 0.1, -0.55, 0.53, { r: 0.04 });
  k.box(0.4, 0.04, 0.04, 0xbdbdbd, 0.1, -0.35, 0.6);
};

/** A small back pack of glowing cells in a frame (torso space): `n` cells across. */
export function cellPack(k, col, glow, n = 3, o = {}) {
  const w = o.w ?? 1.5;
  const z = -0.88;
  k.box(w, 1.7, 0.7, col, 0, 0, z, { r: 0.1 });
  k.box(w * 1.04, 0.18, 0.76, tone(col, 0.75), 0, 0.82, z, { r: 0.04 });
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * (w / (n + 0.4));
    k.cyl(0.15, 1.2, glow, x, 0, z - 0.4, { seg: 10 }); // cell
    for (const y of [-0.62, 0.62]) k.cyl(0.18, 0.12, INK, x, y, z - 0.4, { seg: 10 }); // caps
  }
  for (const s of [-1, 1]) {
    k.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
    k.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
  }
}

/** Chest armour: a rounded plate, belly bands and a glowing core (torso space). */
export function chestPlate(k, col, light, o = {}) {
  k.box(2.18, 1.3, 1.2, col, 0, 0.3, 0, { r: 0.16 });
  for (let i = 0; i < 3; i++) k.box(2.12, 0.18, 1.16, tone(col, 0.82), 0, -0.45 - i * 0.24, 0, { r: 0.05 });
  if (light) {
    k.cyl(o.r ?? 0.3, 0.12, tone(col, 0.6), 0, 0.35, 0.6, { axis: 'z', seg: 16 });
    k.cyl((o.r ?? 0.3) - 0.08, 0.08, light, 0, 0.35, 0.67, { axis: 'z', seg: 16 });
  }
}

// ------------------------------------------------------------------ Aviator

/**
 * Aviator: a pilot on the runway who waves a light wand at the plane circling overhead. Lv 0-2 a
 * leather flying cap with goggles, a fur-collared jacket and a white scarf; Lv 1 a trolley of
 * spare bombs; Lv 2 a radio headset; Lv 3 an olive flight suit and a jet helmet with an oxygen
 * mask; Lv 4 a dark space suit with a glowing purple visor.
 */
export function makeAviator(level) {
  const jet = level >= 3;
  const space = level >= 4;
  const suit = space ? 0x1c1c24 : jet ? 0x5b6b3a : 0x6d4c41;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: suit, pants: space ? 0x1c1c24 : jet ? 0x4b5a30 : 0x5d4e37, arms: suit });
  const key = `aviator${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const light = glowMat(h, space ? 0xb388ff : 0xff6d00);
  if (jet) {
    const visor = space ? glowMat(h, 0xb388ff) : 0xffb300;
    flightHelmet(hd, space ? 0x263238 : 0xeceff1, visor, { mask: space ? 0x37474f : 0x546e7a, stripe: space ? 0x7c4dff : 0xd32f2f });
    // the flight suit: harness straps, a chest buckle, zip pockets and a name tag
    for (const s of [-1, 1]) t.box(0.26, 2.0, 1.14, INK, s * 0.48, 0.0, 0, { r: 0.03 });
    t.box(1.2, 0.22, 1.16, INK, 0, -0.55, 0, { r: 0.03 });
    t.box(0.34, 0.3, 0.08, STEEL, 0, -0.55, 0.6, { r: 0.04 }); // buckle
    t.box(0.06, 1.3, 0.05, 0xbdbdbd, -0.15, 0.0, 0.53); // zip
    t.box(0.5, 0.2, 0.04, space ? 0x7c4dff : 0x795548, 0.55, 0.55, 0.53); // name tag
    if (space) {
      t.box(0.8, 0.5, 0.14, 0x37474f, 0, 0.25, 0.58, { r: 0.05 }); // chest panel
      for (const x of [-0.22, 0, 0.22]) t.box(0.12, 0.12, 0.04, light, x, 0.25, 0.66);
      pack(t, 0x37474f, { w: 1.3, h: 1.4, d: 0.5 }); // life support
      for (const s of [-1, 1]) t.tube([[s * 0.5, 0.6, -0.9], [s * 0.85, 0.9, -0.2], [s * 0.6, 1.0, 0.3]], 0.06, 0x546e7a, { seg: 8, sides: 6 });
    } else {
      collar(t, tone(suit, 0.85), { buttons: false });
      for (const s of [-1, 1]) t.box(0.36, 0.24, 0.04, 0xd32f2f, s * 1.0, 0.65, 0.4, { ry: s * 0.6 }); // shoulder flags
    }
  } else {
    leatherCap(hd, 0x5d4037, 0x80deea);
    jacket(t, suit, 0xd7ccc8);
    scarf(t, 0xfafafa);
  }
  if (level >= 2) {
    // Spy Plane: a radio headset with an aerial
    if (!jet) headset(hd, 0x333333);
    antenna(hd, -0.8, 0.8, -0.15, 1.0);
  }
  belt(t, jet ? INK : LEATHER, 0xb0b0b0);
  hd.done();
  t.done();
  legs(h, key, space ? 0x263238 : jet ? 0x2b2b2b : 0x4e342e, jet ? (b) => thighPocket(b, tone(suit, 0.85)) : null);
  arms(h, key, space ? 0x37474f : jet ? 0x3e3e3e : LEATHER, jet ? tone(suit, 0.85) : tone(suit, 0.8));
  if (level >= 1) {
    // Bombs Away: a trolley of spare bombs beside the pilot
    const r = wear(h, h.root, `${key}:cart`);
    bombCart(r, 1.9, 0.8, space ? 0x311b92 : 0x37474f);
    r.done();
  }
  // Waving the plane in: right arm raised high with the light wand, left at the side.
  const g = fist(h.rightArm, -1.9, 1);
  const w = wear(h, g, `${key}:wand`);
  wand(w, light);
  w.done();
  h.rightArm.rotation.set(PI * 0.85, 0, 0.25);
  h.pose = { right: PI * 0.85, left: 0, leftRecoil: 0 };
  const { plane, muzzles } = makePlane(h, level);
  h.plane = plane;
  h.muzzles = muzzles;
  h.flyHeight = 14;
  h.tracer = space ? 0xb388ff : 0xffe082;
  return own(h);
}

// ------------------------------------------------------------------ Ace Pilot

/**
 * Ace Pilot (alternate Aviator form): a flying ace in a bomber jacket with a fur collar and a red
 * scarf, by a little striped runway. Lv 0-1 a leather cap with yellow goggles, Lv 1 gold ace
 * wings, Lv 2 a flight helmet with an orange visor, Lv 3 a radio aerial, Lv 4 a gold helmet.
 */
export function makeAviatorAce(level) {
  const jet = level >= 2;
  const jacketCol = 0x8d5524;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: jacketCol, pants: 0x3e4a5a, arms: jacketCol });
  const key = `ace${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const shard = shardOf(h);
  if (jet) flightHelmet(hd, level >= 4 ? GOLD : 0x546e7a, 0xff7043, { stripe: level >= 4 ? 0xd32f2f : 0xffd54f });
  else leatherCap(hd, 0x4e342e, 0xffe082);
  if (level >= 3) {
    headset(hd, 0x333333);
    antenna(hd, -0.8, 0.8, -0.15, 1.0);
  }
  jacket(t, jacketCol, 0xefebe9, { zip: 0xffd54f });
  scarf(t, 0xc62828);
  t.box(0.34, 0.34, 0.06, shard, 0.55, 0.15, 0.53);
  if (level >= 1) {
    // ace wings on the chest
    t.ball(0.13, GOLD, -0.5, 0.4, 0.56, { sz: 0.4, seg: 10, rows: 6 });
    for (const s of [-1, 1]) t.box(0.36, 0.1, 0.04, GOLD, -0.5 + s * 0.24, 0.42 + 0.02, 0.56, { rz: s * -0.2 });
  }
  belt(t, LEATHER, GOLD);
  hd.done();
  t.done();
  legs(h, key, 0x3e2723, (b) => b.box(1.1, 0.12, 1.12, 0x2b2b2b, 0, -1.36, 0.02));
  arms(h, key, LEATHER, tone(jacketCol, 0.75));
  // A small runway pad with stripes and lights at the ends.
  const r = wear(h, h.root, `${key}:pad`);
  r.box(3.6, 0.08, 1.0, 0x424242, 0, 0.04, -1.6, { r: 0.02 });
  for (const x of [-1.2, 0, 1.2]) r.box(0.6, 0.02, 0.18, 0xfafafa, x, 0.09, -1.6);
  for (const s of [-1, 1]) for (const z of [-1.95, -1.25]) {
    r.cyl(0.08, 0.14, INK, s * 1.75, 0.15, z, { seg: 8 });
    r.ball(0.08, glowMat(h, s < 0 ? 0x69f0ae : 0xff5252), s * 1.75, 0.25, z, { seg: 8, rows: 6 });
  }
  r.done();
  const g = fist(h.rightArm, -1.9, 1);
  const w = wear(h, g, `${key}:wand`);
  wand(w, glowMat(h, 0xff6d00));
  w.done();
  h.rightArm.rotation.set(PI * 0.85, 0, 0.25);
  h.pose = { right: PI * 0.85, left: 0, leftRecoil: 0 };
  const { plane, muzzles } = makeAcePlane(h, level);
  h.plane = plane;
  h.muzzles = muzzles;
  h.flyHeight = 12;
  h.tracer = level >= 4 ? 0xffab40 : 0xffe082;
  return own(h);
}

// ------------------------------------------------------------------ Phaser

/**
 * Phaser: a sci-fi trooper with a beam gun. Lv 0-2 white and grey with a blue beam, Lv 1
 * shoulder pads and a scope, Lv 2 a back pack of glowing cells, Lv 3 Death Ray: black armour,
 * a chest core and a red beam, Lv 4 Annihilation: purple and gold with a gold crest.
 */
export function makePhaser(level) {
  const ray = level >= 3;
  const anni = level >= 4;
  const beamC = anni ? 0xd500f9 : ray ? 0xff1744 : 0x40c4ff;
  const suit = anni ? 0x4a148c : ray ? 0x212121 : 0xeceff1;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: suit, pants: anni ? 0x311b92 : ray ? 0x1a1a1a : 0x90a4ae, arms: suit, face: 'soldier' });
  const key = `phaser${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const beam = glowMat(h, beamC);
  const armor = anni ? GOLD : ray ? 0x424242 : 0xb0bec5;
  visorHelmet(hd, armor, beam, { crest: anni ? null : tone(armor, 0.8) });
  if (anni) for (const x of [-0.42, 0, 0.42]) hd.box(0.16, 0.6 - Math.abs(x) * 0.5, 0.5, GOLD, x, 1.6 - Math.abs(x) * 0.3, -0.05, { r: 0.05, rz: -x * 0.6 }); // crest fins
  if (ray) chestPlate(t, armor, beam);
  else {
    t.box(1.5, 1.0, 0.16, armor, 0, 0.35, 0.54, { r: 0.08 }); // light chest plate
    t.box(1.0, 0.05, 0.04, beam, 0, 0.2, 0.63); // light seam
  }
  if (level >= 1) shoulderPads(t, armor, 0.6);
  if (level >= 2) cellPack(t, 0x37474f, beam, 3);
  belt(t, INK, beam);
  hd.done();
  t.done();
  legs(h, key, ray ? 0x212121 : 0x78909c, (b) => {
    b.box(0.86, 0.5, 0.2, armor, 0, -0.95, 0.54, { r: 0.08 }); // knee guard
    b.box(0.06, 0.5, 0.04, beam, 0.5, -0.6, 0.3);
  });
  arms(h, key, ray ? 0x111111 : 0x546e7a, tone(armor, 0.85), (a, s) => a.box(0.05, 0.08, 0.6, beam, s * 0.54, -1.58, 0));
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = beamGun(gk, {
    len: anni ? 2.2 : ray ? 2.0 : 1.75, body: anni ? 0x311b92 : ray ? 0x263238 : 0xeceff1, trim: anni ? GOLD : 0x546e7a,
    glow: beam, rings: anni ? 4 : 2, scope: level >= 1,
  });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.beam = beamC;
  h.tracer = beamC;
  return own(h);
}

// ------------------------------------------------------------------ Accelerator

/**
 * Accelerator (alternate Phaser form): a heavy suit with a plasma cannon and glass energy
 * canisters on the back. Lv 2 a second canister, Lv 3 Powerhouse Armor, Lv 4 Supercharger: an
 * orange glow and a longer cannon with more coils, Lv 5 Vessel: violet and gold with a crest.
 */
export function makeAccelerator(level) {
  const vessel = level >= 5;
  const plasmaC = vessel ? 0xd500f9 : level >= 4 ? 0xff6d00 : 0x18ffff;
  const suit = vessel ? 0x1a0033 : level >= 3 ? 0x263238 : 0xcfd8dc;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: suit, pants: suit, arms: suit, face: 'soldier' });
  const key = `accel${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const plasma = glowMat(h, plasmaC);
  const armor = vessel ? GOLD : level >= 3 ? 0x455a64 : 0x90a4ae;
  t.box(0.34, 0.34, 0.06, shardOf(h), -0.55, 0.62, 0.62);
  visorHelmet(hd, armor, plasma, { crest: vessel ? null : tone(armor, 0.75) });
  hd.cyl(0.08, 0.5, INK, -0.55, 1.3, -0.35, { seg: 6 }); // sensor stalk
  hd.ball(0.1, plasma, -0.55, 1.58, -0.35, { seg: 8, rows: 6 });
  if (vessel) for (const x of [-0.42, 0, 0.42]) hd.box(0.16, 0.6 - Math.abs(x) * 0.5, 0.5, GOLD, x, 1.6 - Math.abs(x) * 0.3, -0.05, { r: 0.05, rz: -x * 0.6 });
  // the energy pack: a frame with one or two glass canisters
  const z = -0.92;
  t.box(1.5, 1.85, 0.75, 0x37474f, 0, 0, z, { r: 0.12 });
  for (const x of level >= 2 ? [-0.36, 0.36] : [0]) {
    t.cyl(0.25, 1.3, plasma, x, 0.05, z - 0.48, { seg: 14 });
    for (const y of [-0.7, 0.8]) t.cyl(0.3, 0.16, GUNMETAL, x, y, z - 0.48, { seg: 14 });
    for (let i = 0; i < 4; i++) t.box(0.04, 1.3, 0.04, INK, x + Math.sin(i * 1.57) * 0.27, 0.05, z - 0.48 + Math.cos(i * 1.57) * 0.27); // cage bars
  }
  for (const s of [-1, 1]) {
    t.box(0.26, 0.12, 1.24, INK, s * 0.5, 1.0, -0.05);
    t.box(0.26, 1.3, 0.06, INK, s * 0.5, 0.32, 0.55);
  }
  t.tube([[-0.6, -0.6, -1.0], [-1.05, -0.9, -0.4], [-1.1, -1.0, 0.3]], 0.07, INK, { seg: 10, sides: 6 }); // feed hose to the gun hand
  if (level >= 3) {
    chestPlate(t, armor, plasma, { r: 0.26 });
    shoulderPads(t, armor, 0.68);
  } else {
    collar(t, tone(suit, 0.8), { buttons: false });
    t.box(1.4, 0.9, 0.14, armor, 0, 0.35, 0.53, { r: 0.08 });
  }
  belt(t, INK, plasma);
  hd.done();
  t.done();
  legs(h, key, level >= 3 ? 0x263238 : 0x607d8b, (b) => {
    b.box(1.0, 0.6, 0.22, armor, 0, -0.95, 0.55, { r: 0.08 });
    if (level >= 3) b.box(1.1, 0.7, 1.1, armor, 0, -0.35, 0.02, { r: 0.12 }); // thigh armour
  });
  arms(h, key, 0x263238, tone(armor, 0.85), (a) => {
    if (level >= 3) a.box(1.12, 0.6, 1.12, armor, 0, -0.3, 0, { r: 0.12 });
  });
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, gz] = beamGun(gk, {
    len: level >= 4 ? 2.5 : 2.1, body: vessel ? 0x311b92 : 0x37474f, trim: vessel ? GOLD : 0x263238,
    glow: plasma, rings: level >= 4 ? 4 : 2, fat: 1.7,
  });
  gk.box(0.6, 0.7, 0.6, 0x263238, 0, -0.45, UP - 0.1, { r: 0.1 }); // breech block
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, gz);
  aimLong(h);
  h.tracer = plasmaC;
  h.tracerWidth = vessel ? 0.6 : level >= 3 ? 0.5 : 0.4;
  return own(h);
}

// ------------------------------------------------------------------ Railgunner

/** The cap with a glowing targeting monocle both railgunners wear (head space). */
function monocleCap(k, col, lens) {
  cap(k, col);
  k.torus(0.17, 0.04, INK, -0.26, 0.7, 0.66, { seg: 14 });
  k.cyl(0.14, 0.04, lens, -0.26, 0.7, 0.67, { axis: 'z', seg: 14 });
  k.box(0.12, 0.3, 0.12, INK, -0.56, 0.78, 0.4, { r: 0.03 }); // the arm to the ear
  k.box(0.2, 0.24, 0.3, INK, -0.66, 0.85, 0.15, { r: 0.04 });
}

/**
 * Railgunner: a rail rifle with glowing coils, then a mounted gun. A cap with a glowing monocle;
 * Lv 1 battery pouches on the belt, Lv 2 a capacitor pack and a power cell on the rifle, Lv 3
 * Sentry: seated behind a rail cannon on a tripod, Lv 4 Next Generation Warfare: a huge cannon on
 * a heavy base with side rails.
 */
export function makeRailgunner(level) {
  const sentry = level >= 3;
  const ngw = level >= 4;
  const shirt = 0x37474f;
  const h = makeHumanoid({ skin: 0x8d5524, shirt, pants: 0x263238, arms: shirt, face: 'soldier' });
  const key = `rail${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const coilC = 0x29b6f6;
  const coil = glowMat(h, coilC);
  monocleCap(hd, 0x263238, coil);
  collar(t, tone(shirt, 0.8), { buttons: false });
  t.box(0.06, 1.4, 0.05, INK, 0, -0.1, 0.53); // zip
  belt(t, LEATHER, 0x90a4ae);
  if (level >= 1) {
    // Faster Reloading: battery pouches on the belt
    for (const x of [-0.6, 0, 0.6]) {
      pouch(t, x, -0.62, 0.55, 0.4, 0.42, 0x455a64);
      t.box(0.24, 0.05, 0.04, coil, x, -0.72, 0.8);
    }
  }
  if (level >= 2) {
    // Extra Juice: a capacitor pack with a glow strip and two big capacitors on top
    pack(t, 0x263238, { w: 1.5, h: 1.7, d: 0.65 });
    t.box(0.3, 1.3, 0.06, coil, 0, -0.05, -1.36);
    for (const x of [-0.4, 0.4]) {
      t.cyl(0.2, 0.6, 0x455a64, x, 1.15, -0.85, { seg: 12 });
      t.cyl(0.12, 0.06, coil, x, 1.48, -0.85, { seg: 12 });
    }
  }
  hd.done();
  t.done();
  legs(h, key, 0x212121, (b) => kneePad(b, 0x263238));
  arms(h, key, 0x212121, tone(shirt, 0.8));
  if (!sentry) {
    const g = fist(h.rightArm, -1.9, 1.15);
    const gk = wear(h, g, `${key}:gun`);
    const [y, z] = railRifle(gk, { len: 2.8, glow: coil, coils: 4, cell: level >= 2 });
    gk.done();
    h.muzzles = [];
    muzzle(h, g, y, z);
    aimLong(h);
    h.tracer = coilC;
    h.tracerWidth = 0.35;
    return own(h);
  }
  // Sentry / Next Generation Warfare: a mounted gun on the pad (turns with the tower).
  const steel = ngw ? 0x37474f : 0x546e7a;
  railMount(h, key, {
    big: ngw, len: ngw ? 7 : 5, bw: ngw ? 1.2 : 0.6, gy: ngw ? 3.0 : 2.7, gz: ngw ? 1.8 : 1.2,
    steel, glow: coil, coils: ngw ? 6 : 4, rails: ngw, shield: !ngw,
  });
  if (!ngw) seatBehind(h, key, steel);
  gripMount(h);
  h.tracer = ngw ? 0x00e5ff : coilC;
  h.tracerWidth = ngw ? 0.9 : 0.55;
  return own(h);
}

// ------------------------------------------------------------------ Ranger

/**
 * Ranger (alternate Railgunner form): a long-range marksman in a wide hat with a purple shard
 * band and a duster coat. Lv 1 a bandolier of big rounds, Lv 2 a radio pack with a blinking
 * light and a headset, Lv 3 an outlaw: dark coat and a red bandana over the face, Lv 4 the
 * Experimental Weapon of Destruction: a fat cannon rifle wrapped in glowing purple coils.
 */
export function makeRanger(level) {
  const ewd = level >= 4;
  const outlaw = level >= 3;
  const coat = outlaw ? 0x3e2723 : 0x8d6e63;
  const h = makeHumanoid({ skin: 0xc68642, shirt: coat, pants: outlaw ? 0x212121 : 0x5d4037, arms: coat, face: 'soldier' });
  const key = `ranger${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const shard = shardOf(h);
  cowboyHat(hd, outlaw ? 0x212121 : 0x6d4c41, shard);
  hair(hd, 0x3e2723, { h: 0.44 });
  if (outlaw) {
    band(hd, 0.66, 0.06, 0.42, 2.3, 0x8b0000, 0.36); // bandana over the face
    hd.box(0.36, 0.36, 0.05, 0x8b0000, 0, 0.14, 0.58, { rz: PI / 4 }); // its point under the chin
  }
  duster(t, outlaw ? 0x2b1d18 : 0x795548, { trim: outlaw ? 0x8b0000 : null });
  collar(t, 0xd7ccc8, { buttons: true, button: 0x5d4037 });
  belt(t, LEATHER, 0xb0b0b0);
  if (level >= 1) bandolier(t, 1, 0x4e342e);
  if (level >= 2) {
    // Intelligence Radio: a radio pack, a tall aerial with a blinking light, a headset
    pack(t, 0x455a64, { w: 1.3, h: 1.5, d: 0.6 });
    radio(t, 0.45, 0.9, -1.05, 0x37474f, 2.2);
    t.ball(0.14, glowMat(h, 0xff5252), 0.63, 3.4, -1.05, { seg: 8, rows: 6 });
    headset(hd, 0x222222);
  }
  hd.done();
  t.done();
  legs(h, key, outlaw ? 0x1a1a1a : 0x4e342e, (b) => b.box(1.12, 0.14, 1.14, 0x3e2723, 0, -1.36, 0.02));
  arms(h, key, LEATHER, tone(coat, 0.8));
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  let y;
  let z;
  if (ewd) {
    // Experimental Weapon of Destruction: a stock and scope from the rifle, a fat coiled cannon barrel
    [y, z] = boltRifle(gk, { len: 1.2, wood: 0x1c1726, metal: 0x263238, scope: 1.1, lens: 0xb388ff });
    const B = UP + 0.08;
    gk.cyl(0.32, 2.2, 0x37474f, 0, -1.2 - 1.1, B, { seg: 16, r2: 0.28 }); // cannon barrel
    for (let i = 0; i < 4; i++) {
      gk.torus(0.36, 0.06, shard, 0, -1.5 - i * 0.55, B, { rx: PI / 2, seg: 18 });
      gk.cyl(0.35, 0.1, 0x263238, 0, -1.65 - i * 0.55, B, { seg: 16 });
    }
    gk.cyl(0.36, 0.3, 0x263238, 0, -3.5, B, { seg: 16, r2: 0.3 }); // muzzle
    gk.cyl(0.2, 0.04, shard, 0, -3.66, B, { seg: 14 });
    gk.box(0.5, 0.7, 0.5, 0x455a64, 0, -0.5, B - 0.5, { r: 0.08 }); // power cell
    gk.box(0.06, 0.5, 0.06, shard, 0.26, -0.5, B - 0.5);
    y = -3.7;
    z = B;
  } else {
    [y, z] = boltRifle(gk, { len: 3.1, scope: 1.2, brake: true, lens: 0xb388ff, bipod: level >= 2 });
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = ewd ? 0xb388ff : 0xffe082;
  h.tracerWidth = ewd ? 0.4 : 0.28;
  return own(h);
}

// ------------------------------------------------------------------ Laser Railgunner

/**
 * Laser Railgunner (alternate Railgunner form): a trooper with a red laser rail rifle. Lv 1 a
 * cooling pack, Lv 2 a glow strip on it. Top path: Rail Trooper white armour and a helmet with a
 * red visor from Lv 3, a longer rifle with five coils at Lv 4, a glowing chest core and shoulder
 * pads at Lv 5. Bottom path: seated behind a mounted laser cannon from Lv 3, twin barrels at
 * Lv 4 and the giant XRT-9000 with a shard core at Lv 5.
 */
export function makeLaserRailgunner(level, bottom = false) {
  const top = !bottom;
  const trooper = top && level >= 3;
  const shirt = trooper ? 0xeceff1 : 0x37474f;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: trooper ? 0x90a4ae : 0x263238, arms: shirt, face: 'soldier' });
  const key = `lrail${bottom ? 'B' : 'T'}${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const laserC = 0xff1744;
  const laser = glowMat(h, laserC);
  const shard = shardOf(h);
  t.box(0.34, 0.34, 0.06, shard, -0.55, 0.45, trooper ? 0.62 : 0.53);
  if (trooper) {
    visorHelmet(hd, 0xeceff1, laser, { crest: 0xb0bec5 });
    chestPlate(t, 0xcfd8dc, level >= 5 ? laser : null);
    if (level >= 5) shoulderPads(t, 0xeceff1, 0.62);
  } else {
    monocleCap(hd, 0x263238, laser);
    collar(t, tone(shirt, 0.8), { buttons: false });
    t.box(0.06, 1.4, 0.05, INK, 0, -0.1, 0.53); // zip
  }
  if (level >= 1) {
    // Cooling Cells / Proto Ammo: a cooling pack with fins
    t.box(1.5, 1.8, 0.7, 0x263238, 0, 0, -0.88, { r: 0.1 });
    for (let i = 0; i < 5; i++) t.box(1.3, 0.06, 0.12, 0x455a64, 0, -0.6 + i * 0.3, -1.28);
    for (const s of [-1, 1]) {
      t.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
      t.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, trooper ? 0.62 : 0.53);
    }
  }
  if (level >= 2) t.box(0.3, 1.5, 0.06, laser, 0, 0, -1.36); // glow strip
  belt(t, INK, laser);
  hd.done();
  t.done();
  legs(h, key, trooper ? 0x90a4ae : 0x212121, (b) => {
    if (trooper) b.box(0.9, 0.55, 0.2, 0xb0bec5, 0, -0.95, 0.54, { r: 0.08 });
    else kneePad(b, 0x263238);
    b.box(0.06, 0.5, 0.04, laser, 0.5, -0.6, 0.3);
  });
  arms(h, key, trooper ? 0x78909c : 0x111111, trooper ? 0xb0bec5 : tone(shirt, 0.8), (a) => {
    if (trooper) a.box(1.12, 0.6, 1.12, 0xb0bec5, 0, -0.3, 0, { r: 0.12 });
  });
  if (top || level < 3) {
    const big = top && level >= 4;
    const g = fist(h.rightArm, -1.9, 1.15);
    const gk = wear(h, g, `${key}:gun`);
    const [y, z] = railRifle(gk, { len: big ? 3.3 : 2.8, body: trooper ? 0xb0bec5 : 0x263238, glow: laser, coils: big ? 5 : 4, cell: level >= 2 });
    gk.done();
    h.muzzles = [];
    muzzle(h, g, y, z);
    aimLong(h);
    h.tracer = laserC;
    h.tracerWidth = big ? 0.5 : 0.35;
    return own(h);
  }
  // Sentry / Dual Barrels / XRT-9000: a mounted laser cannon on the pad.
  const xrt = level >= 5;
  const steel = xrt ? 0x263238 : 0x546e7a;
  railMount(h, key, {
    big: true, base: xrt ? 3.6 : 2.4, dual: level === 4, len: xrt ? 8 : 5.5, bw: xrt ? 1.3 : 0.6, gy: xrt ? 3.2 : 2.7, gz: xrt ? 1.8 : 1.2,
    steel, glow: laser, coils: 5, core: xrt ? shard : null, rails: xrt,
  });
  seatBehind(h, key, steel);
  gripMount(h);
  h.tracer = laserC;
  h.tracerWidth = xrt ? 1.2 : 0.6;
  return own(h);
}
export const makeLaserRailgunnerBottom = (level) => makeLaserRailgunner(level, true);
