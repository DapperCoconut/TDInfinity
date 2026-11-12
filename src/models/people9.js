// Tower models: people, batch 9 (dressed with the vehicle kit in ../vehicles.js).
// In here: Shock Trooper, Trapper, Mine Layer (+bottom), Boomerang, Slime Trooper, Assassin, Brawler.
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.

import * as THREE from 'three';
import { antenna, glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import {
  GOLD, GUNMETAL, INK, LEATHER, STEEL, UP, WOOD, aimLong, armPatch, band, belt, canteen, collar, dome, fist, goggles,
  hair, headband, helmet, kneePad, muzzle, own, pack, pockets, pouch, sash, shardOf, vest, wear,
} from './people1.js';
import { nvg, shoulderPads } from './people2.js';
import { feet, glassMat, hands } from './people5.js';
import { neckScarf, satchel, shard } from './people6.js';
import { arc, coil, rubberGloves } from './people8.js';
import { spinner } from './machines5.js';

const PI = Math.PI;
const COPPER = 0xb87333;
const OLIVE = 0x33402a;

// ------------------------------------------------------------------ shared bits for this batch

/** A held thing in the right fist, built by `build(k)` (a kit in gun space). Returns the fist group. */
export function held(h, key, s, build) {
  const g = fist(h.rightArm, -1.9, s);
  const k = wear(h, g, `${key}:held`);
  build(k);
  k.done();
  return g;
}

/** Arm raised back for an overhand throw (the old thrower pose these towers had). */
export function overhand(h, right = -2.6, left = -0.8, swing = 1.8) {
  h.rightArm.rotation.set(right, 0, 0.2);
  h.leftArm.rotation.set(left, 0, -0.3);
  h.pose = { right, left, leftRecoil: 0 };
  h.swing = swing;
}

/** A spiky trap plate (gun space, spikes along -y): o.n spikes a side, o.len spike length, o.plate colour. */
export function spikePlate(k, o = {}) {
  const n = o.n ?? 3;
  const w = o.w ?? 0.95;
  k.box(w, 0.14, w, o.plate ?? WOOD, 0, -0.35, 0, { r: 0.04 });
  if (o.rim) k.box(w + 0.08, 0.08, w + 0.08, o.rim, 0, -0.3, 0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = (i - (n - 1) / 2) * (w / n);
      const z = (j - (n - 1) / 2) * (w / n);
      k.cyl(0.005, o.len ?? 0.32, o.spike ?? STEEL, x, -0.42 - (o.len ?? 0.32) / 2, z, { r2: 0.06, seg: 6 });
    }
  }
}

/** A bear trap lying flat (any space; centred on x, y, z, jaws open across x). */
export function bearTrap(k, x, y, z, s = 1, col = 0x78909c) {
  k.cyl(0.28 * s, 0.08, tone(col, 0.7), x, y, z, { seg: 14 }); // pan
  k.torus(0.62 * s, 0.05 * s, col, x, y, z, { rx: PI / 2, seg: 22 }); // frame ring
  for (const side of [-1, 1]) {
    // a jaw standing open: a half ring with teeth
    k.torus(0.6 * s, 0.045 * s, col, x, y + 0.05, z, { arc: PI, rz: 0, ry: side > 0 ? 0 : PI, rx: -side * 0.5 });
    for (let i = 1; i < 6; i++) {
      const a = (i / 6) * PI;
      const tx = Math.cos(a) * 0.6 * s;
      const ty = Math.sin(a) * 0.6 * s * Math.cos(0.5);
      const tz = -side * Math.sin(a) * 0.6 * s * Math.sin(0.5);
      k.cyl(0.05 * s, 0.16 * s, 0xcfd8dc, x + tx * (side > 0 ? 1 : -1), y + 0.05 + ty - 0.06, z + tz, { r2: 0.003, seg: 4 });
    }
  }
  for (const side of [-1, 1]) k.box(0.5 * s, 0.08 * s, 0.14 * s, tone(col, 0.8), x + side * 0.85 * s, y, z, { r: 0.03 }); // springs
}

/** A land mine (any space; a disc along y, its pressure plate up). o.r radius, o.body, o.stripe, o.light, o.handle. */
export function mine(k, x, y, z, o = {}) {
  const r = o.r ?? 0.5;
  const body = o.body ?? OLIVE;
  const d = o.flip ? -1 : 1; // flip: the pressure plate faces -y
  k.cyl(o.flip ? r * 0.92 : r, 0.24, body, x, y, z, { seg: 18, r2: o.flip ? r : r * 0.92 });
  k.torus(r * 0.98, 0.035, tone(body, 0.7), x, y - 0.08 * d, z, { rx: PI / 2, seg: 18 });
  k.cyl(r * 0.5, 0.08, tone(body, 0.82), x, y + 0.15 * d, z, { seg: 16 }); // pressure plate
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    k.box(0.04, 0.06, r * 0.28, tone(body, 0.7), x + Math.sin(a) * r * 0.7, y + 0.12 * d, z + Math.cos(a) * r * 0.7, { ry: a });
  }
  if (o.stripe) k.torus(r * 0.93, 0.04, o.stripe, x, y + 0.04 * d, z, { rx: PI / 2, seg: 18 });
  if (o.light) k.cyl(0.07, 0.06, o.light, x, y + 0.21 * d, z, { seg: 8 });
  if (o.handle) k.torus(0.18, 0.035, INK, x + r * 0.95, y, z, { arc: PI, rz: -PI / 2, seg: 10 });
}

/** A tesla tower beside the trooper (root space): concrete base, a lattice pylon, coil and a toroid on top. Returns the top y. */
function teslaTower(k, x, z, tall, bolt, big) {
  k.box(1.9, 0.4, 1.9, 0x9e9e9e, x, 0.2, z, { r: 0.06 });
  k.box(1.6, 0.06, 1.6, 0xfdd835, x, 0.42, z); // hazard rim
  k.box(1.4, 0.08, 1.4, 0x616161, x, 0.46, z);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    k.cyl(0.06, 0.08, INK, x + dx * 0.78, 0.44, z + dz * 0.78, { seg: 6 }); // anchor bolts
  }
  const legTop = tall * 0.6;
  const w0 = 0.62;
  const w1 = 0.3;
  const at = (t, dx, dz) => {
    const w = w0 + (w1 - w0) * t;
    return [x + dx * w, 0.5 + (legTop - 0.5) * t, z + dz * w];
  };
  const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const [dx, dz] of C) k.tube([at(0, dx, dz), at(1, dx, dz)], 0.06, 0x546e7a, { seg: 2, sides: 6 });
  const rungs = 4;
  for (let i = 0; i < rungs; i++) {
    const t0 = i / rungs;
    const t1 = (i + 1) / rungs;
    for (let c = 0; c < 4; c++) {
      const [ax, az] = C[c];
      const [bx, bz] = C[(c + 1) % 4];
      k.tube([at(t0, ax, az), at(t1, bx, bz)], 0.03, 0x607d8b, { seg: 2, sides: 4 }); // cross brace
      k.tube([at(t1, ax, az), at(t1, bx, bz)], 0.035, 0x607d8b, { seg: 2, sides: 4 }); // rung
    }
  }
  // the coil column above the pylon
  const ch = tall - legTop - 0.4;
  k.box(0.9, 0.12, 0.9, 0x455a64, x, legTop + 0.06, z, { r: 0.03 });
  coil(k, x, legTop + 0.12 + ch / 2, z, big ? 0.55 : 0.45, ch, Math.max(4, Math.round(ch / 0.22)));
  const top = tall;
  k.cyl(0.12, 0.4, STEEL, x, top - 0.2, z, { seg: 8 });
  k.torus(big ? 0.85 : 0.65, big ? 0.24 : 0.18, 0xb0bec5, x, top, z, { rx: PI / 2, seg: 22 }); // toroid
  k.ball(big ? 0.4 : 0.3, bolt, x, top + 0.15, z, { seg: 14, rows: 10 });
  const n = big ? 6 : 3;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2 + 0.4;
    const e = big ? 1.7 : 1.2;
    arc(k, [x, top + 0.15, z], [x + Math.sin(a) * e, top + 0.3 + (i % 2) * 0.4, z + Math.cos(a) * e], bolt, 0.18, i + 2);
  }
  return top;
}

// ------------------------------------------------------------------ Shock Trooper

/**
 * Shock Trooper (alternate Electroshocker form): a soldier with a lightning rifle. Lv 1 a longer
 * gun and charge cells on the belt, Lv 2 a coil backpack, Lv 3 the Tesla Tower: a navy uniform
 * and a copper coil pylon beside them, Lv 4 a solar panel on a mast with a turning radar dish,
 * Lv 5 a huge crackling coil.
 */
export function makeShockTrooper(level) {
  const tesla = level >= 3;
  const max = level >= 5;
  const shirt = tesla ? 0x283593 : 0x4e5b31;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x263238, arms: shirt, face: 'soldier' });
  const key = `p9shock${level}`;
  const bolt = glowMat(h, max ? 0xe1f5fe : 0x82b1ff);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  helmet(hd, tesla ? 0x1a237e : 0x3e4a2a, { cover: tesla ? 0x283593 : 0x4e5b31 });
  band(hd, 0.7, 0.08, 0.34, 2.1, 0x263238, 0.8); // visor frame
  band(hd, 0.74, 0.04, 0.2, 1.9, bolt, 0.8); // visor
  antenna(hd, 0.66, 1.05, -0.25, 0.7);
  hd.box(0.16, 0.3, 0.2, INK, 0.7, 0.85, -0.2, { r: 0.03 }); // ear radio
  t.box(0.36, 0.24, 0.04, shardOf(h), -0.55, 0.45, 0.58); // Dimension Shard badge
  collar(t, tone(shirt, 0.85));
  if (tesla) {
    vest(t, 0x1a237e, { pouches: 3, pouch: 0x283593 });
    shoulderPads(t, 0x1a237e, 0.55);
    // a lightning bolt on the chest
    t.box(0.12, 0.34, 0.04, 0xfdd835, 0.48, 0.66, 0.68, { rz: 0.4 });
    t.box(0.12, 0.34, 0.04, 0xfdd835, 0.42, 0.42, 0.68, { rz: 0.4 });
  } else {
    pockets(t, tone(shirt, 0.9));
    t.box(0.06, 1.5, 0.05, tone(shirt, 0.7), 0, -0.1, 0.56); // jacket seam
  }
  belt(t, 0x212121);
  if (level >= 1) for (const x of [-0.65, -0.3, 0.3, 0.65]) {
    t.cyl(0.12, 0.38, 0x37474f, x, -0.62, 0.68, { seg: 10 });
    t.cyl(0.13, 0.1, bolt, x, -0.56, 0.68, { seg: 10 });
  }
  if (level >= 2) {
    // a coil backpack: a frame with two coils and a capacitor between them
    t.box(1.4, 1.6, 0.42, 0x37474f, 0, 0.1, -0.78, { r: 0.08 });
    for (const s of [-1, 1]) {
      coil(t, s * 0.4, 0.3, -1.15, 0.3, 1.1, 6);
      t.cyl(0.12, 0.08, STEEL, s * 0.4, 0.9, -1.15, { seg: 10 });
      t.ball(0.12, bolt, s * 0.4, 1.02, -1.15, { seg: 10, rows: 7 });
    }
    t.cyl(0.14, 1.0, glassMat(h, 0xb3e5fc, 0.4), 0, 0.3, -1.05, { seg: 12 });
    t.cyl(0.08, 0.9, bolt, 0, 0.3, -1.05, { seg: 8 });
    arc(t, [-0.4, 1.02, -1.15], [0.4, 1.02, -1.15], bolt, 0.1, 3);
    for (const s of [-1, 1]) {
      t.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
      t.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
    }
    t.tube([[-0.5, -0.55, -0.9], [-1.0, -0.9, -0.4], [-1.15, -0.85, 0.2]], 0.06, 0x212121, { seg: 12, sides: 6 }); // cable
  }
  hd.done();
  t.done();
  hands(h, key, 0x212121, tone(shirt, 0.8), (a, s) => armPatch(a, s, tone(shirt, 0.8), s > 0 ? 0xfdd835 : null));
  feet(h, key, 0x1a1a1a, tesla ? kneePad : null);
  // the lightning rifle: stock, a receiver with copper windings, a capacitor tube and an emitter
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const len = [1.9, 2.1, 2.1, 2.3, 2.3, 2.5][level] ?? 2.5;
  const B = UP;
  const body = tesla ? 0x1a237e : 0x37474f;
  gk.box(0.22, 0.26, 0.5, INK, 0, 0.1, UP - 0.34, { rx: -0.3, r: 0.04 }); // grip
  gk.slab(0.26, 0.75, 0.34, body, 0, 0.62, UP - 0.06, { td: 1.4, tz: -0.06 }); // stock
  gk.box(0.28, 0.06, 0.48, INK, 0, 1.0, UP - 0.1);
  gk.box(0.36, 0.8, 0.44, body, 0, -0.05, B, { r: 0.06 }); // receiver
  gk.torus(0.1, 0.022, INK, 0, -0.12, UP - 0.22, { ry: PI / 2, seg: 10, arc: PI }); // trigger guard
  gk.cyl(0.22, 0.7, 0x455a64, 0, -0.75, B, { seg: 14 });
  for (let i = 0; i < 5; i++) gk.torus(0.22, 0.05, COPPER, 0, -0.47 - i * 0.14, B, { rx: PI / 2, seg: 14 });
  gk.cyl(0.08, len - 1.1, STEEL, 0, -1.1 - (len - 1.1) / 2, B, { seg: 10 }); // barrel
  for (let i = 0; i < 3; i++) gk.torus(0.13, 0.03, i === 2 ? bolt : 0x90a4ae, 0, -len + 0.15 + i * 0.12, B, { rx: PI / 2, seg: 12 });
  gk.cyl(0.16, 0.14, 0x263238, 0, -len + 0.03, B, { seg: 12, r2: 0.12 }); // emitter cup
  gk.ball(0.09, bolt, 0, -len - 0.02, B, { seg: 8, rows: 6 });
  gk.cyl(0.07, 0.6, bolt, 0, -0.2, B + 0.3, { seg: 8 }); // capacitor glow tube on top
  for (const y of [0.12, -0.52]) gk.cyl(0.1, 0.08, STEEL, 0, y, B + 0.3, { seg: 10 });
  gk.box(0.18, 0.2, 0.45, INK, 0, -0.95, UP - 0.3, { r: 0.04 }); // front grip
  if (level >= 1) gk.box(0.06, 0.4, 0.18, bolt, 0.2, -0.05, B); // charge meter
  gk.done();
  h.muzzles = [];
  muzzle(h, g, -len - 0.05, B);
  aimLong(h);
  if (tesla) {
    // the Tesla Tower, on the trooper's right
    const tall = max ? 6.2 : level >= 4 ? 5.4 : 4.6;
    const X = -2.3;
    const Z = -0.4;
    const k = wear(h, h.root, `${key}:tower`);
    teslaTower(k, X, Z, tall, bolt, max);
    k.tube([[X + 0.9, 0.12, Z + 0.2], [-1.5, 0.08, 0.0], [-0.8, 0.1, -0.6]], 0.07, 0x212121, { seg: 12, sides: 6 }); // ground cable
    const px = X - 0.3;
    const pz = Z + 1.35;
    if (level >= 4) {
      // Solar Radar: a solar panel on a mast, the radar dish on top
      k.cyl(0.07, 2.9, 0x546e7a, px, 1.45, pz, { seg: 8 });
      k.cyl(0.3, 0.12, 0x9e9e9e, px, 0.06, pz, { seg: 12 });
      k.box(1.5, 0.08, 1.0, 0x9e9e9e, px, 1.7, pz, { rx: -0.6, r: 0.02 });
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
        const v = (j - 0.5) * 0.47;
        k.box(0.44, 0.04, 0.42, 0x1a3a7a, px - 0.48 + i * 0.48, 1.7 + 0.04 * Math.cos(0.6) + v * Math.sin(0.6), pz - 0.04 * Math.sin(0.6) + v * Math.cos(0.6), { rx: -0.6 });
      }
    }
    k.done();
    if (level >= 4) {
      // the radar dish turns round and round on top of the mast
      const s = spinner(h, h.root, px, 2.9, pz);
      const r = wear(h, s, `${key}:radar`);
      r.cyl(0.14, 0.2, 0x455a64, 0, 0.1, 0, { seg: 12 });
      r.box(0.1, 0.5, 0.1, 0x546e7a, 0, 0.35, 0.1, { rx: 0.5 });
      r.cyl(0.12, 0.2, 0xeceff1, 0, 0.6, 0.25, { axis: 'z', seg: 20, r2: 0.65, rx: -0.4 }); // dish, facing +z and up
      r.torus(0.65, 0.03, 0x90a4ae, 0, 0.6 + 0.1 * Math.sin(0.4), 0.25 + 0.1 * Math.cos(0.4), { seg: 20, rx: -0.4 });
      r.cyl(0.03, 0.55, INK, 0, 0.7, 0.5, { axis: 'z', seg: 6, rx: -0.4 });
      r.ball(0.07, bolt, 0, 0.8, 0.75, { seg: 8, rows: 5 });
      r.done();
      h.idleSpin = 1.2;
    }
  }
  h.tracer = max ? 0xe1f5fe : 0x82b1ff;
  return own(h);
}

// ------------------------------------------------------------------ Trapper

/**
 * Trapper: a backwoods trapper in a coonskin cap and a flannel shirt, throwing spike traps from
 * a big sack. Lv 1 a bandolier of spikes and steel spikes on the trap, Lv 2 a landmine satchel,
 * Lv 3 a bigger sack and a darker shirt, Lv 4 a bear trap strapped to the sack.
 */
export function makeTrapper(level) {
  const shirt = level >= 3 ? 0x4e342e : 0x6d4c41;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: 0x3e2723, arms: shirt, face: 'smile' });
  const key = `p9trapper${level}`;
  const fur = 0x8d6e63;
  const furDk = 0x4e342e;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // a coonskin cap with a ringed tail hanging down the back
  dome(hd, 0.78, 0.66, fur, 0, 0.9, 0);
  hd.cyl(0.78, 0.22, tone(fur, 0.85), 0, 0.98, 0, { seg: 22 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI * 2;
    hd.box(0.04, 0.24, 0.06, tone(fur, 0.6), Math.sin(a) * 0.79, 1.0, Math.cos(a) * 0.79, { ry: a }); // fur tufts
  }
  for (let i = 0; i < 7; i++) {
    const f = i / 6;
    hd.ball(0.2 - f * 0.07, i % 2 ? furDk : fur, 0.1 + f * 0.4, 1.05 - f * 1.05, -0.8 - Math.sin(f * PI) * 0.18, { seg: 10, rows: 7 });
  }
  // a bushy beard and moustache
  band(hd, 0.66, 0.12, 0.42, 1.9, 0x5d4037, 0.22);
  hd.box(0.56, 0.12, 0.14, 0x5d4037, 0, 0.47, 0.64, { r: 0.05 });
  // flannel: a checked pattern of darker lines over the shirt
  const plaid = tone(shirt, 0.65);
  for (const y of [0.55, 0.05, -0.45]) t.box(2.04, 0.08, 1.04, plaid, 0, y, 0);
  for (const x of [-0.6, 0, 0.6]) {
    t.box(0.08, 1.8, 0.02, plaid, x, 0, 0.51);
    t.box(0.08, 1.8, 0.02, plaid, x, 0, -0.51);
  }
  collar(t, tone(shirt, 0.8));
  belt(t, 0x3e2723, 0x9e9e9e);
  // a hunting knife and a coil of rope on the belt
  t.box(0.2, 0.6, 0.12, LEATHER, 0.75, -1.15, 0.56, { r: 0.04 });
  t.cyl(0.06, 0.25, WOOD, 0.75, -0.75, 0.6, { seg: 8 });
  t.torus(0.28, 0.07, 0xc8a165, -1.12, -0.85, 0.1, { ry: PI / 2, seg: 16 });
  if (level >= 1) {
    // a bandolier of spikes
    sash(t, 0x3e2723, -1, 0.3);
    const rz = -0.62;
    for (const u of [-0.75, -0.25, 0.25, 0.75]) {
      const x = -Math.sin(rz) * u;
      const y = Math.cos(rz) * u;
      t.box(0.24, 0.24, 0.1, 0x616161, x, y, 0.62, { r: 0.03 });
      t.cyl(0.004, 0.22, STEEL, x, y + 0.2, 0.66, { r2: 0.05, seg: 5, rz: PI }); // spike tip up
    }
  }
  if (level >= 2) {
    satchel(t, 0x4b5320, 1);
    mine(t, 1.12, -0.4, 0, { r: 0.28, body: OLIVE });
  }
  // the sack of traps on the back, with spikes poking out of the neck
  const s = level >= 3 ? 1.25 : 1;
  const sz = -0.55 - 0.7 * s;
  t.ball(0.8 * s, 0xa1887f, 0, -0.05, sz, { sy: 1.1, sz: 0.8, seg: 16, rows: 12 });
  for (const [px, py] of [[0.35, -0.35], [-0.3, 0.25]]) t.box(0.36 * s, 0.32 * s, 0.05, 0x8d6e63, px * s, py * s, sz - 0.62 * s, { r: 0.02 }); // patches
  t.cyl(0.28 * s, 0.3, 0xa1887f, 0, 0.8 * s, sz, { seg: 12, r2: 0.36 * s });
  t.torus(0.25 * s, 0.05, 0xc8a165, 0, 0.72 * s, sz, { rx: PI / 2, seg: 14 }); // tie
  for (const [dx, dz, rz] of [[-0.12, 0, 0.3], [0.1, 0.08, -0.25], [0, -0.1, 0]]) t.cyl(0.05, 0.5, STEEL, dx, 1.05 * s, sz + dz, { r2: 0.004, rz, seg: 5 });
  for (const sd of [-1, 1]) {
    t.box(0.22, 0.1, 1.0, 0xc8a165, sd * 0.5, 1.0, -0.15);
    t.box(0.22, 1.3, 0.06, 0xc8a165, sd * 0.5, 0.32, 0.53);
  }
  if (level >= 4) {
    // a bear trap strapped on the sack, jaws open
    bearTrap(t, 0, 0.1, sz - 0.78 * s, 0.85, 0x78909c);
    t.box(1.8, 0.1, 0.12, LEATHER, 0, 0.1, sz - 0.6 * s);
  }
  hd.done();
  t.done();
  hands(h, key, 0x6d4c41, tone(shirt, 0.8));
  feet(h, key, 0x4e342e, (b) => b.box(1.14, 0.22, 1.16, fur, 0, -1.34, 0.02, { r: 0.06 })); // fur boot cuffs
  const steel = level >= 1;
  const g = held(h, key, 1.1, (k) => spikePlate(k, {
    plate: level >= 3 ? 0x546e7a : WOOD, rim: level >= 3 ? 0xfdd835 : null,
    spike: steel ? 0xcfd8dc : 0x8d8d8d, len: steel ? 0.4 : 0.28, n: steel ? 3 : 2,
  }));
  h.muzzles = [];
  muzzle(h, g, -0.4, 0);
  overhand(h);
  h.projectile = { color: 0x8d6e63, size: 0.7, arc: 3 };
  return own(h, 0);
}

// ------------------------------------------------------------------ Mine Layer

/**
 * Mine Layer: a combat engineer in olive fatigues with a satchel of mines and one up in the
 * hand, ready to throw. Lv 1 a chest strap, Lv 2 a bigger satchel and a mine detector on the
 * pack. Top path: Lv 3 a claymore on the chest and night-vision goggles, Lv 4+ black AP gear and
 * a red-striped mine, Lv 5 a glowing mine. Bottom path: Lv 3 a big anti-tank mine with a
 * handle, Lv 4+ a thermite tank on the back that glows hotter at Lv 5 (X-Mine).
 */
export function makeMineLayer(level, bottom = false) {
  const top = !bottom;
  const ap = top && level >= 4;
  const therm = bottom && level >= 4;
  const cloth = ap ? 0x263238 : 0x556b2f;
  const h = makeHumanoid({ skin: 0xc68642, shirt: cloth, pants: ap ? 0x212121 : 0x4b5320, arms: cloth, face: 'soldier' });
  const key = `p9mine${bottom ? 'B' : 'T'}${level}`;
  const red = glowMat(h, 0xff1744);
  const heat = glowMat(h, level >= 5 ? 0xffea00 : 0xff6d00);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  helmet(hd, ap ? 0x212121 : 0x4b5320, { cover: ap ? 0x263238 : 0x556b2f });
  if (top && level >= 3) nvg(hd, glowMat(h, 0x76ff03));
  else if (therm) goggles(hd, 1.18, glowMat(h, 0xffab40), { r: 0.77 });
  collar(t, tone(cloth, 0.85));
  if (ap) vest(t, 0x212121, { pouches: 3, patch: 0xd50000 });
  else pockets(t, tone(cloth, 0.9));
  belt(t, 0x3e2723);
  canteen(t, -0.8);
  if (level >= 1) sash(t, 0x3e2723, 1, 0.26);
  // a satchel of mines on the hip, mines poking out of the top
  satchel(t, 0x6d5f3a, 1);
  const bag = level >= 2 ? 1.15 : 1;
  for (const dz of [-0.2, 0.2]) mine(t, 1.12, -0.38 * bag, dz, { r: 0.22, body: ap ? 0x212121 : OLIVE });
  if (top && level >= 3) {
    // a claymore strapped to the chest: curved face, "front" lines and folding legs
    t.slab(1.0, 0.6, 0.22, OLIVE, 0, 0.35, 0.72, { tw: 1.0, bw: 1.0 });
    t.box(0.7, 0.05, 0.02, 0xd7ccc8, 0, 0.45, 0.84);
    t.box(0.5, 0.05, 0.02, 0xd7ccc8, 0, 0.3, 0.84);
    for (const s of [-1, 1]) t.box(0.05, 0.4, 0.05, STEEL, s * 0.35, 0.0, 0.8, { rz: s * 0.4 });
    t.cyl(0.04, 0.12, INK, 0.2, 0.7, 0.75, { seg: 6 }); // det cap
  }
  if (therm) {
    // a thermite tank on a back frame, a glowing window down its side
    t.box(1.2, 1.7, 0.12, INK, 0, 0.1, -0.58);
    t.cyl(0.55, 1.8, 0x5d4037, 0, 0.1, -1.15, { seg: 18 });
    for (const sy of [-1, 1]) t.ball(0.55, 0x5d4037, 0, 0.1 + sy * 0.9, -1.15, { sy: 0.4, seg: 18, rows: 6 });
    for (const y of [-0.45, 0.65]) t.torus(0.56, 0.05, 0xfdd835, 0, y, -1.15, { rx: PI / 2, seg: 18 });
    t.box(0.3, 1.1, 0.12, heat, 0, 0.1, -1.68, { r: 0.04 });
    t.cyl(0.1, 0.25, STEEL, 0, 1.25, -1.15, { seg: 8 });
    t.cyl(0.14, 0.06, 0xd32f2f, 0, 1.4, -1.15, { seg: 10 });
    for (const s of [-1, 1]) {
      t.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
      t.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
    }
  } else {
    pack(t, ap ? 0x37474f : 0x6d5f3a, { w: 1.3, h: 1.3, roll: ap ? null : 0x4b5320 });
    if (level >= 2) {
      // a mine detector slung across the pack: shaft, arm cuff and the round search head
      t.cyl(0.05, 2.2, 0x9e9e9e, 0.1, 0.4, -1.32, { seg: 8, rz: 0.75 });
      t.cyl(0.32, 0.08, 0x37474f, -0.72, -0.35, -1.32, { axis: 'z', seg: 18, rz: 0.75 });
      t.torus(0.32, 0.04, 0xfdd835, -0.72, -0.35, -1.36, { seg: 18 });
      t.box(0.24, 0.3, 0.18, INK, 0.75, 1.1, -1.32, { r: 0.04, rz: 0.75 });
    }
  }
  hd.done();
  t.done();
  hands(h, key, 0x3e2723, tone(cloth, 0.8), (a, s) => (s < 0 && ap ? a.box(1.06, 0.22, 1.06, 0xd50000, 0, -0.45, 0) : null));
  feet(h, key, 0x2b2b2b, level >= 2 ? kneePad : null);
  // the mine held up in the right hand
  const big = bottom && level >= 3;
  const g = held(h, key, 1.1, (k) => mine(k, 0, -0.32, 0, {
    r: big ? 0.66 : 0.5,
    body: top && level >= 5 ? red : ap ? 0x212121 : OLIVE,
    stripe: ap ? 0xd50000 : therm ? 0xfdd835 : null,
    light: therm ? heat : red,
    handle: big,
    flip: true,
  }));
  h.muzzles = [];
  muzzle(h, g, -0.4, 0);
  overhand(h);
  h.projectile = { color: therm ? 0xff6d00 : ap ? 0x212121 : 0x33402a, size: big ? 0.9 : 0.75, arc: 3 };
  return own(h, 0);
}
export const makeMineLayerBottom = (level) => makeMineLayer(level, true);

// ------------------------------------------------------------------ Boomerang

/** A boomerang in gun space: a flat V whose elbow is in the fist, its arms reaching up along -y. */
export function boomerang(k, wood, edge, o = {}) {
  const L = o.len ?? 1.15;
  for (const s of [-1, 1]) {
    const a = s * 0.62;
    const cx = Math.sin(a) * L * 0.5;
    const cy = -0.15 - Math.cos(a) * L * 0.5;
    k.box(0.3, L, 0.1, wood, cx, cy, 0, { rz: a, r: 0.04 });
    const tx = Math.sin(a) * L;
    const ty = -0.15 - Math.cos(a) * L;
    k.cyl(0.15, 0.1, wood, tx, ty, 0, { axis: 'z', seg: 12 }); // round tip
    if (edge) k.box(0.05, L * 0.9, 0.06, edge, cx + Math.cos(a) * 0.15 * s, cy + Math.sin(a) * 0.15 * s, 0, { rz: a }); // steel edge
    if (o.dots) for (let i = 1; i < 4; i++) {
      const f = i / 4;
      k.cyl(0.045, 0.02, o.dots, Math.sin(a) * L * f, -0.15 - Math.cos(a) * L * f, 0.055, { axis: 'z', seg: 8 });
    }
  }
  k.cyl(0.2, 0.1, wood, 0, -0.15, 0, { axis: 'z', seg: 14 }); // elbow
  if (o.wrap) for (let i = 0; i < 3; i++) k.box(0.36, 0.06, 0.14, o.wrap, 0, -0.05 - i * 0.1, 0);
  if (o.gem) k.cyl(0.09, 0.04, o.gem, 0, -0.15, 0.06, { axis: 'z', seg: 8 });
}

/** A slouch hat: wide brim with the left side pinned up, a dented crown, a band and dangling corks (head space). */
function slouchHat(k, col, bandCol, corks) {
  k.cyl(1.05, 0.07, col, 0, 1.12, 0, { seg: 24 });
  k.box(0.14, 0.5, 1.3, col, 0.98, 1.36, 0, { rz: -0.25, r: 0.05 }); // pinned-up side
  k.cyl(0.12, 0.04, GOLD, 0.94, 1.32, 0.18, { axis: 'x', seg: 10 }); // the badge pinning it
  k.cyl(0.66, 0.55, col, 0, 1.42, 0, { seg: 18, r2: 0.56 });
  k.box(0.14, 0.12, 0.8, tone(col, 0.7), 0, 1.68, 0); // dent
  k.cyl(0.67, 0.16, bandCol, 0, 1.24, 0, { seg: 18 });
  if (corks) for (let i = 0; i < 5; i++) {
    const a = PI * 0.7 + (i / 4) * PI * 0.9;
    const x = Math.cos(a) * 0.95;
    const z = Math.sin(a) * 0.95;
    k.cyl(0.01, 0.3, 0x3e2723, x, 0.97, z, { seg: 3 });
    k.cyl(0.06, 0.14, 0xc8a165, x, 0.78, z, { seg: 8, r2: 0.05 });
  }
}

/**
 * Boomerang: an outback thrower in a slouch hat with corks. Lv 1 Steel Fang: a steel edge on the
 * boomerang, Lv 2 a red grip wrap and a leather vest, Lv 3 Twin Strike: a spare boomerang on the
 * back, Lv 4 Boomerang Master: a dark coat, a gold hat band and a gold boomerang, with more on
 * a rack on the back.
 */
export function makeBoomerang(level) {
  const master = level >= 4;
  const shirt = master ? 0x4e342e : 0xa1887f;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: 0x5d4037, arms: 0xc68642, face: 'smile' });
  const key = `p9rang${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x3e2723, { h: 0.38 });
  slouchHat(hd, master ? 0x3e2723 : 0x8d6e63, master ? GOLD : 0x3e2723, !master);
  neckScarf(t, master ? 0x7b1fa2 : 0xc62828);
  collar(t, tone(shirt, 0.85), { buttons: false });
  pockets(t, tone(shirt, 0.88));
  for (let i = 0; i < 4; i++) t.cyl(0.04, 0.03, tone(shirt, 0.55), 0, 0.15 - i * 0.3, 0.52, { axis: 'z', seg: 6 }); // buttons
  if (level >= 2) {
    // a leather vest, open at the front
    for (const s of [-1, 1]) t.box(0.7, 1.8, 1.1, master ? 0x212121 : LEATHER, s * 0.68, 0.05, 0, { r: 0.08 });
    t.box(2.08, 1.8, 0.14, master ? 0x212121 : LEATHER, 0, 0.05, -0.5, { r: 0.05 });
    for (const s of [-1, 1]) t.cyl(0.05, 0.04, master ? GOLD : 0xbdbdbd, s * 0.4, -0.1, 0.57, { axis: 'z', seg: 8 });
  }
  belt(t, 0x3e2723, master ? GOLD : 0xb0b0b0);
  canteen(t, -0.85, 0x9e9e9e);
  t.box(0.2, 0.55, 0.12, LEATHER, 0.8, -1.12, 0.52, { r: 0.04 }); // knife sheath
  t.cyl(0.07, 0.25, WOOD, 0.8, -0.75, 0.55, { seg: 8 });
  const wood = master ? GOLD : level >= 1 ? 0x90a4ae : 0x8d6e63;
  const edge = level >= 1 ? (master ? 0xfff8e1 : 0xcfd8dc) : null;
  if (level >= 3) {
    // spare boomerangs on the back: one at Twin Strike, a fanned rack of three for the master
    const n = master ? 3 : 1;
    t.box(0.5, 0.5, 0.12, LEATHER, 0, -0.45, -0.6, { r: 0.04 });
    for (let i = 0; i < n; i++) {
      const a = (i - (n - 1) / 2) * 0.5;
      const L = 1.2;
      const col = i === 1 || n === 1 ? wood : 0x8d6e63;
      for (const s of [-1, 1]) {
        const b = a + s * 0.62;
        t.box(0.3, L, 0.1, col, Math.sin(b) * L * 0.5, -0.5 + Math.cos(b) * L * 0.5, -0.7 - i * 0.03, { rz: -b, r: 0.04 });
        t.cyl(0.15, 0.1, col, Math.sin(b) * L, -0.5 + Math.cos(b) * L, -0.7 - i * 0.03, { axis: 'z', seg: 12 });
      }
      t.cyl(0.2, 0.1, col, 0, -0.5, -0.7 - i * 0.03, { axis: 'z', seg: 12 });
    }
    t.box(1.6, 0.12, 0.06, LEATHER, 0, 0.1, -0.78); // strap holding them
  }
  hd.done();
  t.done();
  hands(h, key, null, tone(shirt, 0.9), (a) => a.box(1.08, 0.3, 1.08, shirt, 0, -0.55, 0, { r: 0.06 })); // rolled-up sleeves
  feet(h, key, 0x6d4c41, (b) => b.box(1.1, 0.14, 1.12, 0xbcaaa4, 0, -1.33, 0.02)); // socks
  const g = held(h, key, 1.15, (k) => boomerang(k, wood, edge, {
    wrap: level >= 2 ? 0xc62828 : null, gem: master ? 0x7b1fa2 : null, dots: level === 0 ? 0xfafafa : null, len: master ? 1.3 : 1.15,
  }));
  h.muzzles = [];
  muzzle(h, g, -0.5, 0);
  overhand(h, -2.6, -0.8, 1.9);
  h.projectile = { color: wood, size: master ? 1.25 : 1 };
  return own(h, 0);
}

// ------------------------------------------------------------------ Slime Trooper

/** A glass goo tank: metal caps, a see-through bottle with glowing goo inside (torso space). */
function gooTank(h, k, x, tall, goo) {
  const z = -0.95;
  k.cyl(0.4, 0.18, 0x607d8b, x, -0.1 - tall / 2, z, { seg: 16 });
  k.cyl(0.36, tall, glassMat(h, 0xc5e1a5, 0.35), x, -0.1, z, { seg: 16 });
  k.cyl(0.29, tall * 0.8, goo, x, -0.1 - tall * 0.08, z, { seg: 14 });
  k.cyl(0.4, 0.18, 0x607d8b, x, -0.1 + tall / 2, z, { seg: 16 });
  k.ball(0.38, 0x607d8b, x, -0.01 + tall / 2, z, { sy: 0.4, seg: 16, rows: 6 });
  k.cyl(0.08, 0.2, STEEL, x, 0.18 + tall / 2, z, { seg: 8 });
  k.cyl(0.14, 0.05, 0xd32f2f, x, 0.3 + tall / 2, z, { seg: 10 });
  for (const s of [-1, 1]) k.box(0.05, tall, 0.06, 0x607d8b, x + s * 0.36, -0.1, z); // cage bars
}

/**
 * Slime Trooper: a hazmat suit and a goo blaster fed from glass tanks of glowing slime. Lv 1 a
 * taller tank, Lv 2 filter cans on the hood, Lv 3 a second tank, Lv 4 Explosive Goo: a green
 * suit and a fat bell-mouthed goo cannon with hazard stripes.
 */
export function makeSlime(level) {
  const cannon = level >= 4;
  const suit = cannon ? 0x33691e : 0xfdd835;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: suit, pants: suit, arms: suit, face: 'soldier' });
  const key = `p9slime${level}`;
  const goo = glowMat(h, 0x76ff03);
  const dk = tone(suit, 0.75);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // the hazmat hood: a full cover with a wide clear face window
  dome(hd, 0.8, 0.66, suit, 0, 0.92, -0.02);
  band(hd, 0.78, 0.12, 1.0, 3.6, suit, 0.42, { ry: PI });
  band(hd, 0.76, 0.06, 0.12, 2.7, dk, 1.0); // window frame top
  band(hd, 0.76, 0.06, 0.12, 2.7, dk, 0.12); // and bottom
  band(hd, 0.75, 0.03, 0.8, 2.6, glassMat(h, 0x90caf9, 0.4), 0.56); // window
  hd.cyl(0.7, 0.25, suit, 0, -0.05, 0, { seg: 20 }); // neck seal
  if (level >= 2) for (const s of [-1, 1]) {
    hd.cyl(0.2, 0.3, 0x263238, s * 0.5, 0.25, 0.72, { axis: 'z', seg: 14, ry: s * 0.5 });
    hd.cyl(0.17, 0.04, 0x616161, s * 0.58, 0.25, 0.86, { axis: 'z', seg: 14, ry: s * 0.5 });
  }
  // the suit: zip, taped seams, a biohazard badge, belt
  t.box(0.1, 1.7, 0.06, 0x9e9e9e, 0, -0.05, 0.52);
  for (const y of [0.9, -0.95]) t.box(2.06, 0.12, 1.06, dk, 0, y, 0);
  t.cyl(0.3, 0.04, 0xfdd835, -0.55, 0.4, 0.53, { axis: 'z', seg: 18 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    t.torus(0.1, 0.03, INK, -0.55 + Math.sin(a) * 0.1, 0.4 + Math.cos(a) * 0.1, 0.56, { seg: 12, arc: PI * 1.6, rz: -a - PI * 0.3 });
  }
  t.ball(0.05, INK, -0.55, 0.4, 0.56, { seg: 6, rows: 4 });
  belt(t, 0x37474f, 0x9e9e9e);
  pouch(t, 0.6, -0.6, 0.6, 0.45, 0.4, 0x37474f, 0.2);
  // goo tanks on a back frame, with a hose round to the gun hand
  t.box(1.5, 1.8, 0.12, 0x455a64, 0, 0.0, -0.58, { r: 0.04 });
  const tall = level >= 1 ? 1.8 : 1.3;
  const xs = level >= 3 ? [-0.42, 0.42] : [0];
  for (const x of xs) gooTank(h, t, x, tall, goo);
  for (const s of [-1, 1]) {
    t.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
    t.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
  }
  t.tube([[xs[0], -0.1 - tall / 2 - 0.05, -0.95], [-1.0, -1.0, -0.45], [-1.25, -0.75, 0.2]], 0.08, 0x212121, { seg: 12, sides: 6 });
  hd.done();
  t.done();
  rubberGloves(h, key, 0x263238, dk);
  feet(h, key, 0x263238, (b) => b.box(1.12, 0.14, 1.14, 0xfdd835, 0, -1.38, 0.02)); // tape at the boot top
  // the goo blaster: a fat body, a glass goo canister on top, a nozzle that flares at the front
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const len = cannon ? 2.3 : 1.9;
  const r = cannon ? 0.3 : 0.22;
  const B = UP + 0.04;
  const body = cannon ? 0x37474f : 0x455a64;
  gk.box(0.22, 0.26, 0.5, INK, 0, 0.1, UP - 0.34, { rx: -0.3, r: 0.04 });
  gk.box(0.4, 0.9, 0.46, body, 0, 0.05, B, { r: 0.1 }); // body
  gk.cyl(r, len - 0.9, body, 0, -0.4 - (len - 0.9) / 2, B, { seg: 14 });
  for (let i = 0; i < 3; i++) gk.torus(r + 0.01, 0.03, INK, 0, -0.55 - i * 0.25, B, { rx: PI / 2, seg: 14 });
  if (cannon) for (const y of [-0.68, -1.18]) gk.cyl(r + 0.02, 0.1, 0xfdd835, 0, y, B, { seg: 14 }); // hazard bands
  gk.cyl((r + 0.02) * (cannon ? 1.9 : 1.5), 0.32, cannon ? 0x263238 : 0x37474f, 0, -len + 0.12, B, { seg: 16, r2: r + 0.02 }); // flared nozzle
  gk.cyl(r * (cannon ? 1.6 : 1.25), 0.04, goo, 0, -len - 0.03, B, { seg: 14 }); // goo in the mouth
  for (const [dx, dl] of [[0.1, 0.18], [-0.08, 0.12]]) gk.ball(0.06, goo, dx, -len + 0.08, B - r * 1.3 - dl / 2, { sy: 1.6, seg: 8, rows: 5 }); // drips
  // the canister standing up on top of the body
  gk.cyl(0.2, 0.08, STEEL, 0, -0.1, B + 0.27, { axis: 'z', seg: 14 });
  gk.cyl(0.18, 0.5, glassMat(h, 0xc5e1a5, 0.35), 0, -0.1, B + 0.56, { axis: 'z', seg: 14 });
  gk.cyl(0.14, 0.4, goo, 0, -0.1, B + 0.52, { axis: 'z', seg: 12 });
  gk.cyl(0.2, 0.08, STEEL, 0, -0.1, B + 0.83, { axis: 'z', seg: 14 });
  gk.box(0.18, 0.2, 0.45, INK, 0, -0.95, UP - 0.32, { r: 0.04 }); // front grip
  gk.box(0.28, 0.5, 0.3, 0x263238, 0, 0.7, B - 0.05, { r: 0.06 }); // butt
  gk.done();
  h.muzzles = [];
  muzzle(h, g, -len - 0.05, B);
  aimLong(h);
  h.tracer = 0x76ff03;
  h.tracerWidth = 0.32;
  h.flight = { color: 0x76ff03, size: cannon ? 0.75 : 0.6, arc: 1.2, glowing: true, blob: true }; // a glob of slime
  return own(h);
}

// ------------------------------------------------------------------ Assassin

/** A tanto in gun space: wrapped hilt, round guard and a blade of `len` along -y. Returns the tip y. */
function tanto(k, len, blade, o = {}) {
  k.cyl(0.13, 0.62, 0x212121, 0, 0.0, 0, { seg: 10 }); // hilt
  for (let i = 0; i < 4; i++) k.torus(0.13, 0.025, o.wrap ?? 0x8e1b1b, 0, 0.22 - i * 0.14, 0, { rx: PI / 2 + (i % 2 ? 0.4 : -0.4), seg: 10 });
  k.cyl(0.15, 0.08, GOLD, 0, 0.33, 0, { seg: 10 }); // pommel cap
  k.cyl(0.28, 0.06, o.guard ?? 0x424242, 0, -0.33, 0, { seg: 14, sz: 0.75 }); // guard
  k.box(0.14, 0.12, 0.3, GOLD, 0, -0.4, 0); // collar
  k.slab(0.06, len, 0.3, blade, 0, -0.46 - len / 2, 0.02, { bd: 0.12, bz: 0.1 }); // blade, pointed at the tip
  k.box(0.08, len * 0.85, 0.04, tone(o.spine ?? 0x90a4ae, 1), 0, -0.46 - len * 0.45, -0.13); // spine
  return -0.46 - len;
}

/**
 * Assassin: a hooded ninja with a short blade. Lv 1 a red sash and arm guards, Lv 2 a katana on
 * the back and a longer blade, Lv 3 glowing purple trim, Lv 4 Blade Storm: a strap of kunai and
 * a long glowing blade.
 */
export function makeAssassin(level) {
  const h = makeHumanoid({ skin: 0xd9a066, shirt: 0x1a1a24, pants: 0x14141c, arms: 0x1a1a24, face: 'agent' });
  const key = `p9assassin${level}`;
  const cloth = 0x22222e;
  const purple = glowMat(h, 0xb388ff);
  const trim = level >= 3 ? purple : 0x8e1b1b;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // a ninja hood wrapped round the head, the face masked below the eyes
  dome(hd, 0.76, 0.74, cloth, 0, 0.84, 0);
  band(hd, 0.74, 0.1, 0.84, 4.2, cloth, 0.42, { ry: PI });
  band(hd, 0.72, 0.1, 0.24, 2.3, cloth, 1.0); // brow
  band(hd, 0.7, 0.1, 0.44, 2.4, 0x111111, 0.3); // face mask
  hd.box(0.5, 0.06, 0.04, tone(cloth, 0.7), 0, 0.42, 0.72); // mask fold
  hd.ball(0.16, cloth, 0, 0.9, -0.76, { seg: 10, rows: 7 }); // knot
  for (const s of [-1, 1]) hd.box(0.14, 0.6, 0.05, level >= 3 ? purple : cloth, s * 0.12, 0.55, -0.78, { rz: s * 0.3, r: 0.02 }); // tails
  if (level >= 3) band(hd, 0.75, 0.04, 0.06, 2.3, purple, 1.12); // trim
  // a wrap jacket: crossed lapels and a sash
  for (const s of [-1, 1]) t.box(0.22, 1.5, 0.06, level >= 3 ? purple : tone(cloth, 0.8), s * 0.18, 0.35, 0.53, { rz: s * 0.55 });
  t.box(2.06, 0.32, 1.06, level >= 1 ? trim : 0x111111, 0, -0.7, 0); // sash
  t.ball(0.16, level >= 1 ? trim : 0x111111, 0.6, -0.7, 0.55, { seg: 8, rows: 6 });
  for (const s of [-1, 1]) t.box(0.14, 0.5, 0.05, level >= 1 ? trim : 0x111111, 0.6 + s * 0.1, -1.0, 0.57, { rz: s * 0.2 });
  // shuriken on the belt
  for (const x of [-0.55, -0.25]) {
    t.cyl(0.14, 0.03, 0x9e9e9e, x, -0.7, 0.55, { axis: 'z', seg: 4 });
    t.cyl(0.14, 0.03, 0x9e9e9e, x, -0.7, 0.55, { axis: 'z', seg: 4, rz: PI / 4 });
    t.cyl(0.04, 0.04, INK, x, -0.7, 0.57, { axis: 'z', seg: 6 });
  }
  if (level >= 2) {
    // a katana slung across the back: scabbard, guard and a wrapped hilt over the right shoulder
    const rz = -0.7;
    const dx = Math.sin(-rz);
    const dy = Math.cos(rz);
    t.cyl(0.11, 2.4, 0x111111, 0, 0.0, -0.66, { seg: 10, rz });
    t.cyl(0.115, 0.08, GOLD, -dx * 1.18, -dy * 1.18, -0.66, { seg: 10, rz }); // tip cap
    t.cyl(0.22, 0.06, 0x424242, dx * 1.22, dy * 1.22, -0.66, { seg: 12, rz });
    t.cyl(0.1, 0.7, 0x212121, dx * 1.6, dy * 1.6, -0.66, { seg: 8, rz });
    for (let i = 0; i < 3; i++) t.torus(0.1, 0.025, trim, dx * (1.4 + i * 0.18), dy * (1.4 + i * 0.18), -0.66, { rx: PI / 2, rz, seg: 8 });
    t.box(0.12, 2.4, 1.1, 0x111111, 0, 0, 0, { rz: 0.62 }); // sling
  }
  if (level >= 4) {
    // Blade Storm: a strap of kunai across the chest
    sash(t, 0x111111, -1, 0.26);
    for (const u of [-0.6, -0.2, 0.2, 0.6]) {
      const x = Math.sin(0.62) * u;
      const y = Math.cos(0.62) * u;
      t.cyl(0.05, 0.22, 0x212121, x, y, 0.63, { seg: 6 });
      t.torus(0.06, 0.02, 0x9e9e9e, x, y + 0.15, 0.63, { seg: 8 });
      t.cyl(0.004, 0.28, 0xcfd8dc, x, y - 0.25, 0.63, { r2: 0.07, seg: 4 });
    }
  }
  hd.done();
  t.done();
  hands(h, key, 0x111111, 0x111111, (a) => {
    for (let i = 0; i < 3; i++) a.box(1.06, 0.06, 1.06, 0x2c2c38, 0, -1.0 - i * 0.18, 0); // arm wraps
    if (level >= 1) a.box(0.3, 0.7, 1.08, 0x37474f, 0, -1.15, 0, { r: 0.05 }); // arm guard
  });
  feet(h, key, 0x111111, (b) => {
    for (let i = 0; i < 3; i++) b.box(1.04, 0.06, 1.06, 0x2c2c38, 0, -0.9 - i * 0.18, 0); // leg wraps
    b.box(0.06, 0.3, 0.32, 0x2c2c38, 0.12, -1.85, 0.48); // split toe
  });
  const g = fist(h.rightArm, -1.9, 1.05);
  const gk = wear(h, g, `${key}:gun`);
  const len = level >= 4 ? 1.9 : level >= 2 ? 1.4 : 1.0;
  const tip = tanto(gk, len, level >= 4 ? purple : 0xcfd8dc, { wrap: level >= 1 ? 0x8e1b1b : 0x37474f, guard: level >= 3 ? 0x311b92 : 0x424242 });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tip, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  h.leftArm.rotation.set(-0.6, 0, -0.3);
  h.pose = { right: -2.4, left: -0.6, leftRecoil: 0 };
  h.swing = 1.7;
  h.melee = true;
  h.tracer = level >= 3 ? 0xb388ff : 0xffffff;
  return own(h, 0);
}

// ------------------------------------------------------------------ Brawler

/**
 * Brawler: a boxer in a red tank top with big mechanical gauntlets, fists up in a guard. Lv 1 a
 * headband, Lv 2 bigger gauntlets with pistons, Lv 3 Pack a Punch: glowing orange knuckles and a
 * power core, Lv 4 GALVAKNUCKLES: crackling blue knuckles and coils, Lv 5 Boreas' Fury: icy
 * white-blue gauntlets with ice spikes and a frost mantle.
 */
export function makeBrawler(level) {
  const boreas = level >= 5;
  const galva = level >= 4;
  const shirt = boreas ? 0xeceff1 : 0xd32f2f;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: boreas ? 0x1a237e : 0x263238, arms: 0xc68642, face: 'soldier' });
  const key = `p9brawler${level}`;
  const ice = glowMat(h, 0x80d8ff);
  const blue = glowMat(h, 0x40c4ff);
  const knuckle = boreas ? ice : galva ? blue : level >= 3 ? glowMat(h, 0xff9100) : 0x37474f;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, boreas ? 0xeceff1 : 0x1a1209, { h: 0.34 });
  if (level >= 1) headband(hd, boreas ? 0x81d4fa : 0xfafafa);
  // a tank top: the arms stay bare, a stripe down each side
  for (const s of [-1, 1]) t.box(0.08, 2.0, 1.04, boreas ? 0x4fc3f7 : 0xfafafa, s * 0.98, 0, 0);
  t.box(0.7, 0.2, 0.05, tone(shirt, 0.75), 0, 0.92, 0.51, { r: 0.03 }); // neckline
  // a champion belt: big gold plate with a gem, side plates
  t.box(2.12, 0.42, 1.12, 0x3e2723, 0, -0.85, 0, { r: 0.05 });
  t.cyl(0.36, 0.08, boreas ? 0x4fc3f7 : GOLD, 0, -0.85, 0.58, { axis: 'z', seg: 18 });
  t.cyl(0.26, 0.04, tone(boreas ? 0x4fc3f7 : GOLD, 0.8), 0, -0.85, 0.63, { axis: 'z', seg: 18 });
  t.cyl(0.1, 0.05, boreas ? ice : 0xd32f2f, 0, -0.85, 0.66, { axis: 'z', seg: 10 });
  for (const s of [-1, 1]) t.box(0.36, 0.3, 0.06, boreas ? 0x4fc3f7 : GOLD, s * 0.62, -0.85, 0.56, { r: 0.03 });
  if (boreas) {
    // a frost mantle over the shoulders with ice spikes
    t.torus(0.95, 0.32, 0xe1f5fe, 0, 1.0, 0, { rx: PI / 2, seg: 20, sx: 1.25 });
    for (const s of [-1, 1]) for (const [dx, h0, lean] of [[0.9, 0.9, 0.4], [1.25, 0.7, 0.7], [0.55, 0.6, 0.2]]) {
      shard(t, s * dx, 1.1, -0.1, h0, 0.13, ice, { rz: -s * lean });
    }
  }
  hd.done();
  t.done();
  // boxing shorts trim and high boxing boots
  feet(h, key, boreas ? 0x1a237e : 0xb71c1c, (b) => {
    b.box(1.06, 0.18, 1.06, boreas ? 0x4fc3f7 : 0xfafafa, 0, -0.3, 0); // shorts hem
    b.box(1.08, 0.5, 1.1, boreas ? 0x1a237e : 0xb71c1c, 0, -1.2, 0.02, { r: 0.05 }); // high tops
    for (let i = 0; i < 4; i++) b.box(0.4, 0.04, 0.04, 0xfafafa, 0, -1.05 - i * 0.14, 0.58);
  });
  // the gauntlets, one on each fist
  const big = level >= 2 ? 1.25 : 1;
  const metal = boreas ? 0xe1f5fe : level >= 2 ? 0x546e7a : 0x78909c;
  const fists = [h.rightArm, h.leftArm].map((arm, i) => {
    const g = fist(arm, -1.9, big);
    const k = wear(h, g, `${key}:fist${i}`);
    k.cyl(0.6, 0.55, 0x37474f, 0, 0.45, 0, { seg: 16, r2: 0.56 }); // forearm cuff
    k.box(0.75, 0.5, 0.2, metal, 0, 0.5, 0.56, { r: 0.05 }); // top plate
    for (const y of [0.25, 0.7]) k.torus(0.6, 0.04, INK, 0, y, 0, { rx: PI / 2, seg: 16 });
    k.box(1.2, 1.0, 1.2, metal, 0, -0.45, 0, { r: 0.16 }); // the fist
    for (let j = 0; j < 4; j++) {
      const x = (j - 1.5) * 0.28;
      k.box(0.24, 0.18, 0.5, knuckle, x, -0.98, 0.18, { r: 0.05 }); // knuckles
      k.box(0.22, 0.04, 0.9, INK, x + 0.14, -0.7, 0.1); // finger grooves
    }
    k.box(0.35, 0.5, 0.3, tone(metal, 0.85), (i ? 1 : -1) * 0.6, -0.5, 0.35, { r: 0.08 }); // thumb
    if (level >= 2) for (const x of [-0.35, 0.35]) {
      k.cyl(0.09, 0.6, 0x263238, x, 0.35, -0.62, { seg: 8 }); // pistons
      k.cyl(0.05, 0.5, 0xcfd8dc, x, -0.1, -0.62, { seg: 8 });
    }
    if (level >= 3) {
      k.cyl(0.24, 0.12, INK, 0, 0.45, -0.6, { axis: 'z', seg: 14 });
      k.cyl(0.18, 0.06, knuckle, 0, 0.45, -0.68, { axis: 'z', seg: 14 }); // power core
    }
    if (galva) for (let j = 0; j < 3; j++) k.torus(0.64, 0.05, boreas ? ice : COPPER, 0, 0.15 + j * 0.2, 0, { rx: PI / 2, seg: 16 }); // coils
    if (galva && !boreas) for (let j = 0; j < 2; j++) arc(k, [-0.5, -0.98, 0.3 + j * 0.1], [0.5, -0.98, 0.25 - j * 0.1], blue, 0.08, j + 1 + i * 2);
    if (boreas) for (let j = 0; j < 3; j++) shard(k, (j - 1) * 0.35, -1.05, 0.2, 0.45, 0.08, ice, { rz: PI });
    k.done();
    return g;
  });
  h.muzzles = [];
  muzzle(h, fists[0], -1.1, 0);
  // fists up in a guard; each punch jabs one straight out
  h.rightArm.rotation.set(-1.15, 0, 0.25);
  h.leftArm.rotation.set(-1.15, 0, -0.25);
  h.pose = { right: -1.15, left: -1.15, leftRecoil: 0 };
  h.swing = -0.5;
  h.punch = true;
  h.melee = true;
  h.tracer = boreas ? 0xb3e5fc : galva ? 0x40c4ff : level >= 3 ? 0xff9100 : 0xffffff;
  return own(h, 0);
}

export const MODELS = {
  electroTrooper: makeShockTrooper,
  trapper: makeTrapper,
  mineLayer: makeMineLayer,
  mineLayerBottom: makeMineLayerBottom,
  boomerang: makeBoomerang,
  slime: makeSlime,
  assassin: makeAssassin,
  brawler: makeBrawler,
};
