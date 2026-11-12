// Humanoid summons, batch 7 (see summons.js): the last of the old blocky humanoid units.
//   cutlass / corsair          Buccaneer pirates: a bandana-and-eyepatch sword pirate, a tricorn musketeer
//   ebenforcer / ebenforcerm   Enforcement Base: a police officer with a pistol, a riot officer with a pump gun
//   jpara                      Squadron paratrooper: jump helmet, harness, chute packs and a rifle
//   pfragger / procketeer      Punkbuster punks (mohawks, studded jackets): a grenade thrower, a rocket punk
//   pboogie                    the Boogieman: a tall shadow in a ragged hood and cloak, glowing eyes, claws
//   pnucleus                   Nucleus: a huge brute in a cracked hazmat suit with a glowing reactor
//   rbOperative / rbOperative2 / rbPrivate / rbSolemn   Recon Base squads
//   oddport1 ... oddport5      Oddport students (student(i) also stands at the Oddport tower's gate)
//   chaosToy / chaosClown      Chaos Jester: a wind-up toy soldier (its key turns), the Big Clown with a bubble cannon
// Bodies are makeHumanoid (kit.js); all they wear and hold is kit-built (people1.js explains the spaces).
// Squad layout, scale, tracers and projectiles are the same as the old builders in newmodels/b-e, h.

import * as THREE from 'three';
import { glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { makeThing } from './bits.js';
import {
  INK, STEEL, WOOD, LEATHER, GOLD, UP, dome, band, wear, helmet, goggles, pouch, belt, vest, pack, collar, pockets,
  sash, canteen, kneePad, fist, muzzle, rifle, pistol, aimLong, own,
} from './people1.js';
import { boltRifle, grenade, shoulderPads } from './people2.js';
import { bandana } from './people3.js';
import { feet, glassMat, hands, peakedCap, riotHelmet } from './people5.js';
import { throwPose } from './people6.js';
import { tubeLauncher, gasMask } from './people7.js';
import { shotgun } from './people8.js';
import { epaulettes } from './people11.js';
import { cape } from './people18.js';
import { tricorn } from './people20.js';

const PI = Math.PI;
const BRASS = 0xc9a227;

// ------------------------------------------------------------------ squads

/** `count` people (the first on the spot when alone), scaled 0.6 * size, as the old squads were. */
function squad(count, mk, scale = 0.6) {
  const u = makeThing();
  u.wheels = [];
  u.soldiers = [];
  const n = Math.max(1, count || 1);
  for (let i = 0; i < n; i++) {
    const h = mk(i);
    h.root.scale.setScalar(scale * (h.size ?? 1));
    h.root.position.set(n === 1 ? 0 : (i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.soldiers.push(h);
    u.muzzles.push(h.muzzles[0]);
    if (h.spinParts) (u.spin ??= []).push(...h.spinParts); // views.js turns these (UnitView.sync)
  }
  const h0 = u.soldiers[0];
  u.height = 3.5 * (h0.size ?? 1);
  u.tracer = h0.tracer;
  if (h0.projectile) u.projectile = h0.projectile;
  return u;
}

/** See-through glass that stays see-through when the unit fades in or out (kit.js setOpacity). */
function glass(h, color, op) {
  const m = glassMat(h, color, op);
  m.userData.keepOpacity = op;
  return m;
}

/** A thing held in the right fist, built by `build(k)`; returns the fist group. */
function hold(h, key, s, build) {
  const g = fist(h.rightArm, -1.9, s);
  const k = wear(h, g, `${key}:held`);
  const out = build(k);
  k.done();
  h.muzzles = [];
  if (out) muzzle(h, g, out[0], out[1]);
  return g;
}

/** A flat star outline [[x, z], ...] with `n` points (for plan()). */
const starPts = (n, r1, r2) => Array.from({ length: n * 2 }, (_, i) => {
  const a = (i / (n * 2)) * PI * 2;
  const r = i % 2 ? r2 : r1;
  return [Math.sin(a) * r, Math.cos(a) * r];
});

// ------------------------------------------------------------------ Buccaneer pirates

/** A pirate body: sash and belt round the waist, boots with folded tops; o.stripes, o.sleeve, o.torso. */
function pirate(key, shirt, o) {
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: 0x3e2723, arms: o.sleeve ?? 0xd2a679, face: 'soldier' });
  const t = wear(h, h.torso, `${key}:torso`);
  if (o.stripes != null) for (const y of [0.55, 0.05, -0.45]) t.box(2.04, 0.2, 1.04, o.stripes, 0, y, 0); // striped shirt
  // a cloth sash wound round the waist, its knot and two ends at the left hip, a belt over it
  t.box(2.1, 0.44, 1.1, o.sash, 0, -0.62, 0, { r: 0.06 });
  t.ball(0.17, tone(o.sash, 0.85), 0.72, -0.6, 0.52, { seg: 8, rows: 6 });
  for (const s of [0, 1]) t.box(0.18, 0.62, 0.06, o.sash, 0.66 + s * 0.16, -1.0, 0.55, { rz: 0.15 - s * 0.3 });
  belt(t, LEATHER, BRASS, -0.88);
  t.box(0.5, 0.36, 0.06, BRASS, 0, -0.88, 0.57, { r: 0.03 }); // big brass buckle
  o.torso?.(t);
  t.done();
  feet(h, key, 0x2b1d14, (b) => {
    b.box(1.16, 0.34, 1.16, 0x3a2a1e, 0, -1.28, 0.02, { r: 0.06 }); // folded boot tops
    b.box(0.3, 0.14, 0.08, BRASS, 0, -1.7, 0.58); // buckle
  });
  return h;
}

/** A curved cutlass in a fist kit (blade along -y, curving toward +z); returns the tip [y, z]. */
function cutlassBlade(k, steel) {
  k.cyl(0.1, 0.5, LEATHER, 0, 0.08, 0, { seg: 8 }); // grip
  for (let i = 0; i < 3; i++) k.torus(0.1, 0.02, INK, 0, 0.24 - i * 0.14, 0, { rx: PI / 2, seg: 8 });
  k.ball(0.13, BRASS, 0, 0.38, 0, { seg: 10, rows: 7 }); // pommel
  k.ball(0.32, BRASS, 0, -0.24, 0.05, { sy: 0.3, seg: 14, rows: 6 }); // shell guard
  k.tube([[0, 0.36, 0.05], [0, 0.3, 0.3], [0, 0.0, 0.38], [0, -0.22, 0.2]], 0.035, BRASS, { seg: 10, sides: 5 }); // knuckle bow
  let y = -0.3;
  let z = 0;
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = 0.04 + i * 0.07; // each piece leans a little more toward +z: the curve
    const len = 0.36;
    const w = 0.34 - i * 0.025;
    const cy = y - Math.cos(a) * len / 2;
    const cz = z + Math.sin(a) * len / 2;
    if (i < n - 1) k.box(0.07, len + 0.03, w, steel, 0, cy, cz - w / 2 + 0.1, { rx: -a });
    else k.slab(0.07, len + 0.03, w, steel, 0, cy, cz - w / 2 + 0.1, { rx: -a, bd: 0.1, bz: w * 0.45 }); // the tip
    if (i < n - 1) k.box(0.08, len, 0.04, 0xeceff1, 0, cy, cz - w + 0.1, { rx: -a }); // bright edge
    y -= Math.cos(a) * len;
    z += Math.sin(a) * len;
  }
  return [y, z];
}

/** Cutlass pirate (melee): red bandana, eyepatch, earring, stubble and a curved sword raised to swing. */
function cutlassPirate() {
  const key = 's7:cutlass';
  const h = pirate(key, 0xfafafa, { stripes: 0x1a237e, sash: 0xc62828 });
  const hd = wear(h, h.head, `${key}:head`);
  bandana(hd, 0xc62828);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * PI * 2 + 0.3;
    hd.ball(0.06, 0xfafafa, Math.sin(a) * 0.6, 1.08 + (i % 2) * 0.12, Math.cos(a) * 0.6 - 0.02, { seg: 6, rows: 4 }); // white dots
  }
  hd.torus(0.645, 0.025, INK, 0, 0.82, 0, { rx: PI / 2 + 0.22, seg: 22 }); // eyepatch strap
  hd.cyl(0.17, 0.06, INK, 0.25, 0.72, 0.58, { axis: 'z', seg: 12 }); // the patch on the left eye
  band(hd, 0.645, 0.04, 0.22, 1.7, 0x4e342e, 0.02); // stubble
  hd.torus(0.07, 0.022, GOLD, 0.64, 0.45, 0.05, { ry: PI / 2, seg: 10 }); // earring
  hd.done();
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    a.box(1.06, 0.5, 1.06, 0xfafafa, 0, -0.26, 0, { r: 0.04 }); // short sleeve
    a.box(1.08, 0.12, 1.08, 0x1a237e, 0, -0.4, 0);
    if (s < 0) a.box(1.08, 0.45, 1.08, LEATHER, 0, -1.3, 0, { r: 0.05 }); // leather bracer
    else a.box(0.05, 0.3, 0.3, 0x1e3a5f, 0.51, -0.95, 0.05); // an anchor tattoo
    a.done();
  }
  const g = fist(h.rightArm, -1.9, 1.15);
  const w = wear(h, g, `${key}:sword`);
  const [y, z] = cutlassBlade(w, 0xcfd8dc);
  w.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  h.rightArm.rotation.set(-2.4, 0, 0.1);
  h.pose = { right: -2.4, left: 0, leftRecoil: 0 };
  h.swing = 2;
  h.melee = true;
  h.tracer = 0xeceff1;
  return own(h);
}

/** A long flintlock musket (gun space): wooden stock almost to the muzzle, steel barrel, brass bands. */
function musket(k, len = 2.8) {
  const U = UP;
  const B = U + 0.06;
  k.slab(0.24, 0.8, 0.34, WOOD, 0, 0.5, U - 0.14, { td: 1.6, tz: -0.12 }); // butt
  k.box(0.26, 0.06, 0.52, BRASS, 0, 0.92, U - 0.2, { r: 0.02 }); // butt plate
  k.box(0.2, 0.3, 0.26, WOOD, 0, 0.0, U - 0.1, { r: 0.05 }); // wrist
  k.box(0.2, 0.22, 0.4, WOOD, 0, 0.12, U - 0.34, { rx: -0.35, r: 0.05 }); // grip
  k.box(0.22, len - 0.6, 0.2, WOOD, 0, -(len - 0.6) / 2 - 0.15, U - 0.02, { r: 0.05 }); // fore-stock
  k.cyl(0.06, len, STEEL, 0, -len / 2 + 0.05, B, { seg: 10 }); // barrel
  k.cyl(0.05, 0.02, 0x050505, 0, -len + 0.04, B, { seg: 10 });
  for (const y of [-0.85, -1.6, -2.25]) k.cyl(0.14, 0.07, BRASS, 0, y, U + 0.02, { seg: 10 }); // bands
  k.cyl(0.022, len - 0.5, 0x3e2723, 0, -(len - 0.5) / 2 - 0.2, U - 0.15, { seg: 6 }); // ramrod
  k.box(0.04, 0.1, 0.12, STEEL, 0, -len + 0.15, B + 0.08); // front sight
  // the lock on the right side: plate, hammer, frizzen
  k.box(0.04, 0.45, 0.2, STEEL, -0.13, -0.1, B - 0.04, { r: 0.02 });
  k.box(0.05, 0.2, 0.06, STEEL, -0.16, 0.08, B + 0.12, { rx: 0.5 });
  k.box(0.05, 0.1, 0.16, STEEL, -0.16, -0.22, B + 0.08);
  k.torus(0.1, 0.022, BRASS, 0, -0.12, U - 0.24, { ry: PI / 2, seg: 10, arc: PI }); // trigger guard
  return [-len + 0.05, B];
}

/** Corsair (shooter): tricorn, black beard, a red coat with gold trim over a cream waistcoat, a long musket. */
function corsairPirate() {
  const key = 's7:corsair';
  const coat = 0x8e1b1b;
  const h = pirate(key, coat, {
    sash: 0x1a237e,
    sleeve: coat,
    torso: (t) => {
      t.box(0.78, 1.5, 0.06, 0xefe6d0, 0, 0.25, 0.53); // waistcoat
      for (let i = 0; i < 4; i++) t.ball(0.05, GOLD, 0, 0.78 - i * 0.3, 0.57, { seg: 6, rows: 4 });
      for (const s of [-1, 1]) {
        t.box(0.12, 1.75, 0.08, BRASS, s * 0.45, 0.1, 0.55); // gold trim down the open front
        t.box(0.4, 0.5, 0.06, tone(coat, 0.8), s * 0.62, 0.7, 0.55, { rz: s * -0.3 }); // lapels
        t.box(0.5, 0.12, 0.08, BRASS, s * 0.62, -0.25, 0.55); // pocket flaps
      }
      t.slab(1.95, 1.2, 0.12, coat, 0, -1.5, -0.56, { bw: 1.12, bz: -0.12 }); // coat tails at the back
      t.box(0.08, 1.2, 0.04, BRASS, 0, -1.5, -0.64);
      sash(t, LEATHER, -1, 0.14); // powder horn strap
      t.cyl(0.13, 0.7, 0xefe6d0, 0.85, -0.55, 0.5, { r2: 0.04, rz: 1.1, seg: 10 }); // powder horn
      t.cyl(0.14, 0.08, BRASS, 0.55, -0.4, 0.5, { rz: 1.1, seg: 10 });
    },
  });
  const hd = wear(h, h.head, `${key}:head`);
  tricorn(hd, 0x1a1a1a, BRASS);
  band(hd, 0.645, 0.06, 0.32, 1.9, 0x1a1a1a, 0.0); // beard
  for (const s of [-1, 1]) hd.box(0.32, 0.08, 0.08, 0x1a1a1a, s * 0.15, 0.38, 0.6, { rz: s * 0.25 }); // moustache
  hd.done();
  hands(h, key, null, coat, (a) => {
    a.box(1.16, 0.45, 1.16, tone(coat, 0.75), 0, -1.32, 0, { r: 0.05 }); // turned-back cuffs
    a.box(1.18, 0.07, 1.18, BRASS, 0, -1.12, 0);
  });
  const g = fist(h.rightArm, -1.9, 1.2);
  const k = wear(h, g, `${key}:gun`);
  const [y, z] = musket(k);
  k.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = 0xffab40;
  h.projectile = { color: 0x424242, size: 0.35 };
  return own(h);
}

// ------------------------------------------------------------------ Enforcement Base

/** Enforcer: a navy police officer with a cap and a pistol. Heavy (M): a riot officer with a pump gun. */
function enforcer(heavy) {
  const key = heavy ? 's7:ebm' : 's7:eb';
  const shirt = heavy ? 0x1a237e : 0x283593;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x111827, arms: shirt, face: 'soldier' });
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (heavy) {
    riotHelmet(hd, 0x0d1440, glass(h, 0x90caf9, 0.5));
    vest(t, 0x212121, { pouches: 3, pouch: 0x1a1a1a });
    t.box(1.2, 0.26, 0.04, 0xfdd835, 0, 0.62, 0.68); // the yellow POLICE strip, front and back
    t.box(1.2, 0.26, 0.04, 0xfdd835, 0, 0.5, -0.68);
    shoulderPads(t, 0x0d1440, 0.6);
    belt(t, INK, 0x9e9e9e);
    t.box(0.25, 0.4, 0.15, INK, -0.55, 0.85, 0.7, { r: 0.04 }); // shoulder radio
    feet(h, key, 0x111111, (b) => kneePad(b, 0x0d1440));
    hands(h, key, 0x111111, tone(shirt, 0.85), (a) => a.box(1.1, 0.5, 1.1, 0x0d1440, 0, -1.25, 0, { r: 0.05 }));
    hd.done();
    t.done();
    hold(h, key, 1.2, (k) => shotgun(k, { tac: true, light: 0xfff3b0, pump: 0x212121 }));
    aimLong(h);
    h.tracer = 0xffcc80;
    h.size = 1.1;
    return own(h);
  }
  peakedCap(hd, 0x1a237e, 0x111111, GOLD);
  collar(t, tone(shirt, 0.85), { button: 0xfdd835 });
  pockets(t, tone(shirt, 0.9));
  t.plan(starPts(6, 0.2, 0.1), 0.05, GOLD, 0.5, 0.42, 0.56, { rx: PI / 2 }); // chest badge
  t.box(0.36, 0.08, 0.04, 0xeceff1, -0.5, 0.62, 0.57); // name tag
  for (const s of [-1, 1]) t.box(0.38, 0.12, 1.05, tone(shirt, 0.8), s * 0.82, 0.96, 0); // shoulder straps
  t.box(0.25, 0.4, 0.15, INK, -0.55, 0.85, 0.62, { r: 0.04 }); // shoulder radio
  t.cyl(0.03, 0.3, INK, -0.48, 1.18, 0.62, { seg: 6 });
  // the duty belt: pouches, cuffs on the left hip and the empty holster on the right
  belt(t, INK, 0xb0b0b0);
  for (const x of [0.4, -0.4]) pouch(t, x, -0.84, 0.56, 0.26, 0.3, INK, 0.16);
  for (const dz of [-0.1, 0.1]) t.torus(0.1, 0.025, STEEL, 0.9, -1.05, 0.45 + dz, { ry: PI / 2, seg: 10 });
  t.box(0.28, 0.6, 0.42, INK, -1.1, -1.05, 0.1, { r: 0.05 });
  hd.done();
  t.done();
  feet(h, key, 0x111111);
  hands(h, key, null, tone(shirt, 0.85));
  hold(h, key, 1.2, (k) => pistol(k, { body: 0x2b2b2b, laser: 0xff1744 }));
  h.rightArm.rotation.set(-PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-PI / 2 + 0.2, 0, -0.5);
  h.pose = { right: -PI / 2, left: -PI / 2 + 0.2, leftRecoil: 0.2 };
  h.tracer = 0xffd54f;
  return own(h);
}

// ------------------------------------------------------------------ Squadron paratrooper

/** Paratrooper: jump helmet with goggles up, a harness, the main chute on the back, the reserve on the belly. */
function paratrooper() {
  const key = 's7:jpara';
  const shirt = 0x556b2f;
  const strap = 0x3e2723;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x4b5a30, arms: shirt, face: 'soldier' });
  const hd = wear(h, h.head, `${key}:head`);
  helmet(hd, 0x4b5320, { cover: 0x3b4220 });
  goggles(hd, 1.22, 0x8d6e63, { r: 0.76, strap: INK });
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  collar(t, tone(shirt, 0.85), { buttons: false });
  // harness: two straps down the chest, a chest strap with a quick-release box
  for (const s of [-1, 1]) t.box(0.2, 2.0, 0.08, strap, s * 0.45, 0.02, 0.56);
  t.box(1.3, 0.16, 0.08, strap, 0, 0.5, 0.6);
  t.cyl(0.18, 0.08, STEEL, 0, 0.5, 0.64, { axis: 'z', seg: 12 });
  // the reserve chute on the belly, its red pull handle
  t.box(1.15, 0.55, 0.4, 0x6b5d3f, 0, -0.42, 0.78, { r: 0.1 });
  t.box(1.17, 0.12, 0.42, tone(0x6b5d3f, 0.8), 0, -0.24, 0.78);
  t.box(0.3, 0.08, 0.08, 0xd50000, 0.3, -0.42, 1.0, { r: 0.03 });
  // the main chute on the back: a fat pack with a flap and a ripcord cable over the left shoulder
  t.box(1.7, 1.6, 0.8, 0x8d7b5a, 0, 0.05, -0.95, { r: 0.18 });
  t.box(1.72, 0.42, 0.84, 0x7a6a4c, 0, 0.72, -0.95, { r: 0.1 });
  for (const s of [-1, 1]) t.box(0.06, 1.2, 0.06, strap, s * 0.5, 0.0, -1.36);
  t.tube([[0.5, 0.75, -1.3], [0.62, 1.05, -0.6], [0.55, 0.95, 0.3], [0.45, 0.6, 0.62]], 0.035, 0x9e9e9e, { seg: 10, sides: 4 });
  for (const s of [-1, 1]) t.box(0.24, 0.1, 1.3, strap, s * 0.5, 1.0, -0.15); // straps over the shoulders
  belt(t, strap, 0x9e9e9e, -0.9);
  canteen(t, -0.85);
  hd.done();
  t.done();
  feet(h, key, 0x2b2b2b, (b) => {
    kneePad(b, 0x3b4220);
    b.box(1.1, 0.12, 1.1, strap, 0, -0.18, 0); // leg loops of the harness
    pouch(b, 0, -0.55, 0.5, 0.5, 0.45, tone(shirt, 0.85), 0.16); // cargo pocket
  });
  hands(h, key, 0x3e2723, tone(shirt, 0.85));
  hold(h, key, 1.25, (k) => rifle(k, { len: 2.1, furn: 0x3e2723, mag: 'curved', optic: 'iron' }));
  aimLong(h);
  h.tracer = 0xffc107;
  return own(h);
}

// ------------------------------------------------------------------ Punkbuster punks

/** A punk: a tall spiked mohawk, ear studs, an open studded leather jacket, platform boots. */
function punk(key, shirt, hairCol, o = {}) {
  const h = makeHumanoid({ skin: 0xf1c27d, shirt, pants: 0x263238, arms: shirt, face: 'frown' });
  const silver = 0xcfd8dc;
  const leather = 0x151515;
  const hd = wear(h, h.head, `${key}:head`);
  for (let i = 0; i < 6; i++) {
    const z = 0.5 - i * 0.2;
    const hh = 0.5 + (i % 2) * 0.14;
    const a = Math.asin(z / 0.66); // spikes stand out from the round head
    const by = 0.61 + Math.sqrt(0.62 * 0.62 - Math.min(0.38, z * z)) - 0.06;
    hd.cyl(0.12, hh, hairCol, 0, by + Math.cos(a) * hh / 2, z + Math.sin(a) * hh / 2, { seg: 6, r2: 0.01, rx: a, sz: 1.6 });
  }
  hd.box(0.2, 0.08, 0.9, tone(hairCol, 0.7), 0, 1.2, -0.05); // the mohawk's root
  for (const s of [-1, 1]) hd.ball(0.05, silver, s * 0.63, 0.55, 0.05, { seg: 6, rows: 4 }); // ear studs
  hd.ball(0.04, silver, 0.2, 0.92, 0.6, { seg: 6, rows: 4 }); // eyebrow ring
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  t.box(2.14, 2.02, 1.1, leather, 0, 0.0, 0, { r: 0.08 }); // jacket
  t.box(0.7, 1.8, 0.04, shirt, 0, -0.04, 0.56); // the shirt under it
  for (const s of [-1, 1]) {
    t.box(0.42, 1.1, 0.08, 0x262626, s * 0.52, 0.38, 0.58, { rz: s * 0.18 }); // lapels
    t.box(0.06, 1.4, 0.06, silver, s * 0.38, -0.15, 0.6); // zips
    for (let i = 0; i < 3; i++) t.cyl(0.07, 0.2, silver, s * (0.62 + i * 0.18), 1.09, 0.1 - i * 0.12, { seg: 6, r2: 0.01 }); // shoulder spikes
  }
  t.box(2.18, 0.26, 1.16, 0x5d4037, 0, -0.84, 0, { r: 0.04 }); // studded belt
  for (const x of [-0.75, -0.45, 0.45, 0.75]) t.cyl(0.05, 0.05, silver, x, -0.84, 0.59, { axis: 'z', seg: 6 });
  t.box(0.36, 0.22, 0.06, silver, 0, -0.84, 0.6, { r: 0.02 });
  t.cyl(0.1, 0.03, 0x37474f, -0.6, 0.6, 0.6, { axis: 'z', seg: 12 }); // badge pins
  t.cyl(0.08, 0.03, hairCol, 0.62, -0.4, 0.6, { axis: 'z', seg: 12 });
  t.tube([[0.6, -0.92, 0.6], [0.85, -1.25, 0.55], [1.05, -1.1, 0.2], [1.05, -0.9, -0.3]], 0.04, silver, { seg: 14, sides: 5 }); // wallet chain
  o.torso?.(t);
  t.done();
  hands(h, key, 0x212121, leather, (a) => {
    a.box(1.12, 0.45, 1.12, 0x212121, 0, -1.25, 0, { r: 0.06 }); // spiked bracers
    for (let i = 0; i < 4; i++) {
      const g = (i / 4) * PI * 2;
      a.cyl(0.06, 0.22, silver, Math.sin(g) * 0.6, -1.25, Math.cos(g) * 0.6, { seg: 6, r2: 0.01, rz: -Math.sin(g) * PI / 2, rx: Math.cos(g) * PI / 2 });
    }
  });
  feet(h, key, 0x1a1a1a, (b) => {
    b.box(1.14, 0.2, 1.24, 0x424242, 0, -1.98, 0.08, { r: 0.04 }); // platform soles
    for (const y of [-1.5, -1.7]) b.box(1.1, 0.07, 0.4, silver, 0, y, 0.4); // buckle straps
  });
  return h;
}

/** Fragger: black tee, green mohawk, a grenade bandolier, a lit grenade raised to throw. */
function fragger() {
  const key = 's7:pfragger';
  const nade = 0x33691e;
  const h = punk(key, 0x1a1a1a, 0x76ff03, {
    torso: (t) => {
      sash(t, 0x4e5b31, 1, 0.26);
      for (const s of [-0.45, 0, 0.45]) grenade(t, s, -s * 1.38 + 0.02, 0.62, nade);
    },
  });
  const spark = glowMat(h, 0xff3d00);
  hold(h, key, 1.3, (k) => {
    grenade(k, 0, -0.3, 0.1, nade);
    k.ball(0.08, spark, 0.1, -0.02, 0.1, { seg: 8, rows: 6 }); // the lit fuse
    return [-0.3, 0.1];
  });
  throwPose(h);
  h.tracer = 0xffab40;
  h.projectile = { color: nade, size: 0.45, arc: 4 };
  return own(h);
}

/** Rocketeer punk: purple tee, pink mohawk, a green rocket tube with a glowing warhead. */
function rocketPunk() {
  const key = 's7:procketeer';
  const h = punk(key, 0x4a148c, 0xff4081, {
    torso: (t) => {
      for (const x of [-0.3, 0.3]) t.cyl(0.16, 1.1, 0x33691e, x, 0.1, -0.75, { seg: 10 }); // spare rockets on the back
      for (const x of [-0.3, 0.3]) t.cyl(0.16, 0.3, 0xff6d00, x, 0.8, -0.75, { seg: 10, r2: 0.02 });
      t.box(0.9, 0.1, 0.3, INK, 0, 0.3, -0.75);
    },
  });
  const warhead = glowMat(h, 0xff3d00);
  hold(h, key, 1.15, (k) => tubeLauncher(k, { col: 0x33691e, len: 2.2, back: 0.8, venturi: true, bands: 0xff4081, warhead }));
  aimLong(h);
  h.tracer = 0xff6d00;
  h.projectile = { color: 0x33691e, size: 0.4 };
  return own(h);
}

/** Boogieman: a tall shadow in a pointed hood and a ragged robe, glowing eyes and grin, long claws. */
function boogieman() {
  const key = 's7:pboogie';
  const cloak = 0x1c1028;
  const h = makeHumanoid({ skin: 0x1a1a24, shirt: 0x12121a, pants: 0x12121a, arms: 0x12121a, face: 'void' });
  const eye = glowMat(h, 0xd500f9);
  const hd = wear(h, h.head, `${key}:head`);
  dome(hd, 0.84, 0.8, cloak, 0, 0.85, -0.08); // deep hood
  band(hd, 0.82, 0.1, 1.05, 3.6, cloak, 0.05, { ry: PI });
  hd.cyl(0.3, 0.9, cloak, 0, 1.75, -0.45, { r2: 0.0, rx: -0.75, seg: 8 }); // its drooping point
  band(hd, 0.86, 0.06, 0.16, 2.6, tone(cloak, 0.7), 1.3); // the hood's rim over the face
  for (const s of [-1, 1]) hd.box(0.24, 0.1, 0.05, eye, s * 0.22, 0.74, 0.6, { rz: s * 0.3 }); // slanted eyes
  hd.box(0.5, 0.05, 0.04, eye, 0, 0.36, 0.61); // grin
  for (let i = 0; i < 4; i++) hd.box(0.04, 0.1, 0.04, eye, -0.18 + i * 0.12, 0.38 + (i % 2) * 0.03, 0.62); // its teeth
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  cape(t, cloak, 3.4, { w: 2.3, tatter: true });
  t.slab(2.14, 2.6, 1.14, cloak, 0, -1.6, 0, { bw: 1.3, bd: 1.35 }); // the robe over the legs
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    t.cyl(0.005, 0.5 + (i % 3) * 0.15, cloak, Math.sin(a) * 1.25, -3.05 - (i % 3) * 0.07, Math.cos(a) * 0.68, { r2: 0.24, seg: 3 }); // ragged hem
  }
  t.box(2.2, 0.16, 1.18, 0x3a2a40, 0, -0.75, 0); // rope belt
  t.tube([[0.5, -0.8, 0.6], [0.55, -1.3, 0.62], [0.45, -1.7, 0.6]], 0.05, 0x3a2a40, { seg: 8, sides: 5 });
  t.ball(0.18, eye, 0.45, -1.8, 0.62, { seg: 8, rows: 6 }); // a little lantern-light at the rope end
  t.done();
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    a.cyl(0.72, 0.9, cloak, 0, -1.15, 0, { r2: 0.56, seg: 10, open: true }); // wide ragged sleeves
    a.cyl(0.7, 0.9, tone(cloak, 0.6), 0, -1.15, 0, { r2: 0.54, seg: 10 });
    a.done();
  }
  // claws: four long grey nails from each hand, hooked forward
  let tip = null;
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const g = fist(arm, -1.9);
    const c = wear(h, g, `${key}:claw${s}`);
    for (const x of [-0.33, -0.11, 0.11, 0.33]) {
      c.cyl(0.02, 0.9, 0x9e9e9e, x, -0.55, 0.12, { r2: 0.08, rx: 0.25, seg: 6 });
      c.cyl(0.08, 0.14, 0x2a2a34, x, -0.06, 0.0, { seg: 6 }); // knuckle
    }
    c.done();
    if (s < 0) tip = g;
  }
  h.muzzles = [];
  muzzle(h, tip, -1.0, 0.25);
  h.rightArm.rotation.set(-1.2, 0, 0.2);
  h.leftArm.rotation.set(-1.0, 0, -0.2);
  h.tracer = 0xd500f9;
  h.size = 1.25;
  return own(h);
}

/** Nucleus: a huge brute in a cracked yellow hazmat suit, a glowing reactor and fuel rods, giant fists. */
function nucleus() {
  const key = 's7:pnucleus';
  const suit = 0xfbc02d;
  const metal = 0x424242;
  const h = makeHumanoid({ skin: 0x9ccc65, shirt: 0xfdd835, pants: 0x827717, arms: suit, face: 'zombie' });
  const nuke = glowMat(h, 0x76ff03);
  const hd = wear(h, h.head, `${key}:head`);
  dome(hd, 0.78, 0.66, suit, 0, 0.9, -0.03); // hazmat hood
  band(hd, 0.76, 0.08, 0.85, 3.3, suit, 0.15, { ry: PI });
  gasMask(hd, metal, nuke);
  hd.box(0.05, 0.4, 0.04, INK, 0.4, 1.2, 0.5, { rz: 0.5 }); // a crack in the hood
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  t.box(2.5, 2.3, 1.4, suit, 0, 0.1, 0, { r: 0.18 }); // the bulky suit
  for (let i = 0; i < 8; i++) t.box(0.18, 0.4, 1.46, INK, -1.05 + i * 0.3, -0.78, 0, { rz: 0.6 }); // hazard stripes
  t.box(2.52, 0.06, 1.46, INK, 0, -0.56, 0);
  t.box(2.52, 0.06, 1.46, INK, 0, -1.0, 0);
  // the reactor in the chest: a steel ring, the green core and a black trefoil over it
  t.cyl(0.52, 0.2, metal, 0, 0.35, 0.72, { axis: 'z', seg: 18 });
  t.cyl(0.4, 0.06, nuke, 0, 0.35, 0.83, { axis: 'z', seg: 18 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    t.box(0.18, 0.24, 0.04, INK, Math.sin(a) * 0.2, 0.35 + Math.cos(a) * 0.2, 0.88, { rz: -a });
  }
  t.ball(0.07, INK, 0, 0.35, 0.87, { seg: 8, rows: 5 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    t.ball(0.04, STEEL, Math.sin(a) * 0.47, 0.35 + Math.cos(a) * 0.47, 0.83, { seg: 6, rows: 4 }); // bolts
  }
  for (const [x, y, rz] of [[-0.75, -0.15, 0.4], [0.8, 0.75, -0.5], [-0.6, 0.95, -0.3]]) t.box(0.06, 0.5, 0.04, nuke, x, y, 0.71, { rz }); // glowing cracks
  for (const s of [-1, 1]) {
    t.box(0.95, 0.6, 1.55, metal, s * 1.4, 1.05, 0, { r: 0.1 }); // shoulder plates
    for (const z of [-0.5, 0.5]) t.ball(0.06, STEEL, s * 1.4, 1.36, z, { seg: 6, rows: 4 });
  }
  // two fuel rods on the back in steel cages, a hose up to the mask
  for (const x of [-0.5, 0.5]) {
    t.cyl(0.2, 1.3, nuke, x, 0.35, -0.98, { seg: 12 });
    for (const y of [-0.4, 1.1]) t.cyl(0.28, 0.16, metal, x, y, -0.98, { seg: 12 });
    for (let j = 0; j < 4; j++) {
      const a = (j / 4) * PI * 2 + PI / 4;
      t.cyl(0.03, 1.4, metal, x + Math.sin(a) * 0.25, 0.35, -0.98 + Math.cos(a) * 0.25, { seg: 5 });
    }
  }
  t.tube([[0.5, 1.2, -0.98], [0.75, 1.5, -0.4], [0.45, 1.35, 0.4], [0.15, 1.45, 0.75]], 0.07, INK, { seg: 12, sides: 6 });
  t.done();
  hands(h, key, null, suit, (a) => a.box(1.2, 0.5, 1.2, metal, 0, -1.2, 0, { r: 0.06 }));
  feet(h, key, metal, (b) => b.box(1.14, 0.12, 1.14, INK, 0, -1.3, 0.02));
  // giant armoured fists
  let right = null;
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const g = fist(arm, -1.75);
    const f = wear(h, g, `${key}:fist${s}`);
    f.box(1.4, 1.0, 1.4, metal, 0, -0.25, 0, { r: 0.15 });
    for (let i = 0; i < 4; i++) f.box(0.28, 0.18, 0.3, tone(metal, 1.3), -0.45 + i * 0.3, -0.72, 0.4, { r: 0.05 }); // knuckle plates
    f.box(1.0, 0.06, 0.06, nuke, 0, -0.25, 0.72); // a glowing seam
    f.done();
    if (s < 0) right = g;
  }
  h.muzzles = [];
  muzzle(h, right, -0.8, 0);
  h.rightArm.rotation.set(-0.8, 0, 0.1);
  h.tracer = 0x76ff03;
  h.size = 1.8;
  return own(h);
}

// ------------------------------------------------------------------ Recon Base squads

/**
 * A Recon soldier. look: shirt, helmet, visor (a glowing visor band), gun ('rifle' | 'sniper' | 'tube'),
 * vk (a name for this look, so each look has its own cached shapes).
 */
function recon(model, look) {
  const key = `s7:${model}${look.vk ?? ''}`;
  const h = makeHumanoid({ skin: 0xc68642, shirt: look.shirt, pants: 0x263238, arms: look.shirt, face: 'soldier' });
  const hd = wear(h, h.head, `${key}:head`);
  helmet(hd, look.helmet, { cover: tone(look.helmet, 0.8) });
  if (look.visor != null) {
    band(hd, 0.74, 0.09, 0.32, 2.0, INK, 0.56); // visor frame
    band(hd, 0.8, 0.04, 0.2, 1.8, glowMat(h, look.visor), 0.62);
  } else {
    hd.box(0.3, 0.2, 0.15, INK, 0, 1.2, 0.68, { r: 0.03 }); // camera mount on the helmet
    hd.cyl(0.06, 0.12, 0x4fc3f7, 0, 1.2, 0.78, { axis: 'z', seg: 8 });
  }
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  vest(t, tone(look.shirt, 0.8), { pouches: 3 });
  belt(t, INK, 0x9e9e9e);
  pouch(t, 0.7, -0.95, 0.52, 0.34, 0.32, tone(look.shirt, 0.7));
  pack(t, tone(look.shirt, 0.75), { w: 1.2, h: 1.1, d: 0.42 });
  if (look.gun === 'tube') for (const x of [-0.35, 0.35]) t.cyl(0.14, 0.9, 0x4b5320, x, 1.0, -0.85, { seg: 10 }); // spare rockets over the pack
  t.done();
  feet(h, key, 0x212121, (b) => kneePad(b, tone(look.shirt, 0.7)));
  hands(h, key, 0x212121, tone(look.shirt, 0.85));
  const lens = look.visor ?? 0xff5252;
  if (look.gun === 'sniper') hold(h, key, 1.25, (k) => boltRifle(k, { len: 3.0, wood: 0x263238, metal: 0x1c1f22, brake: true }));
  else if (look.gun === 'tube') hold(h, key, 1.15, (k) => tubeLauncher(k, { col: 0x4b5320, len: 2.0, back: 0.7, warhead: 0x6d4c41 }));
  else hold(h, key, 1.25, (k) => rifle(k, { len: 2.2, body: 0x1c1f22, mag: 'box', optic: look.visor != null ? 'dot' : 'iron', lens, light: look.visor != null }));
  aimLong(h);
  h.tracer = 0xffe082;
  return own(h);
}

/** The Recon squads keep their old height (3.4) and tracer. */
function reconSquad(n, look, scale = 0.6) {
  const u = squad(n, (i) => recon(look(i).model, look(i)), scale);
  u.static = false;
  u.height = 3.4;
  return u;
}

const SOLEMN_VISOR = [0xff1744, 0x00e5ff, 0xffab00, 0x76ff03];

// ------------------------------------------------------------------ Oddport students

/** The crescent-moon head shared by every student (head space, built on the empty head group). */
function moonHead(h) {
  const hd = wear(h, h.head, 's7:moon');
  // the moon: an arc that is thick in the middle and thin at the tips, opening toward the student's left (+x)
  const cx = 0.55;
  const cy = 1.3;
  const R = 1.3;
  const n = 20;
  const outer = [];
  const inner = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const a = ((50 + t * 260) * PI) / 180;
    const th = 0.14 + 0.98 * Math.sin(t * PI);
    outer.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
    inner.push([cx + Math.cos(a) * (R - th), cy + Math.sin(a) * (R - th)]);
  }
  hd.prism([...outer, ...inner.reverse()], 1.0, 0xfafafa, 0, 0, 0, { ry: PI / 2, bevel: 0.1 });
  // two tall oval eyes with a shine, and little rosy cheeks
  for (const x of [-0.42, 0.02]) {
    hd.ball(0.15, 0x111111, x, cy + 0.05, 0.5, { sy: 2.4, sz: 0.4, seg: 10, rows: 8 });
    hd.ball(0.045, 0xffffff, x + 0.04, cy + 0.25, 0.56, { seg: 6, rows: 4 });
  }
  for (const x of [-0.6, 0.2]) hd.cyl(0.09, 0.02, 0xf8bbd0, x, cy - 0.35, 0.51, { axis: 'z', seg: 10 });
  hd.done();
}

/**
 * An Oddport student: crescent-moon head, purple blazer with a moon crest, white shirt, red tie, black
 * trousers. i: 0 fists, 1 PK (slingshot), 2 Reese (medic satchel), 3 Sticky (blowpipe), 4 Nelly (boxing gloves).
 */
export function student(i) {
  const key = `s7:student${i}`;
  const purple = 0x5e35b1;
  const white = 0xfafafa;
  const h = makeHumanoid({ skin: white, shirt: purple, pants: 0x151515, arms: purple, hands: white });
  h.head.remove(h.head.children[0]);
  moonHead(h);
  const t = wear(h, h.torso, `${key}:torso`);
  t.slab(0.62, 1.2, 0.06, white, 0, 0.42, 0.53, { bw: 0.3 }); // shirt front in the V of the blazer
  t.prism([[0, 0.98], [0.12, 0.88], [0.09, 0.2], [0, 0.05], [-0.09, 0.2], [-0.12, 0.88]], 0.06, 0xd32f2f, 0, 0, 0.58, { ry: PI / 2 }); // tie
  t.box(0.26, 0.16, 0.08, 0xb71c1c, 0, 0.88, 0.6, { r: 0.03 }); // its knot
  for (const s of [-1, 1]) t.box(0.26, 1.05, 0.07, 0x4527a0, s * 0.42, 0.45, 0.55, { rz: s * 0.3 }); // lapels
  t.box(0.36, 0.42, 0.04, 0x4527a0, 0.55, 0.15, 0.53, { r: 0.03 }); // breast pocket crest
  t.torus(0.1, 0.03, 0xffc400, 0.55, 0.15, 0.56, { arc: PI * 1.3, rz: PI * 0.2, seg: 10 }); // the moon on it
  for (const y of [-0.3, -0.62]) t.ball(0.05, 0xffc400, 0, y, 0.55, { seg: 6, rows: 4 }); // buttons
  if (i === 2) {
    // Reese: a white satchel with a red cross on the hip, its strap across the chest
    sash(t, 0x795548, -1, 0.22);
    t.box(0.9, 0.8, 0.45, white, 1.2, -0.75, 0.2, { r: 0.08 });
    t.box(0.92, 0.25, 0.48, 0xeeeeee, 1.2, -0.45, 0.2, { r: 0.04 });
    t.box(0.42, 0.13, 0.04, 0xe53935, 1.2, -0.8, 0.44);
    t.box(0.13, 0.42, 0.04, 0xe53935, 1.2, -0.8, 0.44);
  }
  if (i === 1) t.box(0.12, 0.6, 0.3, 0x8d6e63, -0.9, -0.9, 0.45); // PK: a pouch of pebbles on the belt
  t.done();
  feet(h, key, 0x3e2723, (b) => b.box(1.04, 0.1, 1.04, 0xfafafa, 0, -1.48, 0.02)); // white socks over brown shoes
  hands(h, key, null, 0x4527a0);
  h.rightArm.rotation.set(-PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-0.4, 0, -0.15);
  if (i === 0) {
    h.leftArm.rotation.set(-PI / 2 + 0.25, 0, -0.2); // bare fists, both up
    hold(h, key, 1, () => [-0.3, 0]);
    h.tracer = 0xfafafa;
  } else if (i === 1) {
    // PK: a wooden slingshot pointing forward, its band pulled back
    hold(h, key, 1.1, (k) => {
      const wood = 0x8d6e63;
      k.cyl(0.08, 0.6, wood, 0, -0.2, 0, { seg: 8 });
      for (const s of [-1, 1]) k.cyl(0.06, 0.55, wood, s * 0.2, -0.7, 0, { seg: 8, rz: s * 0.4 });
      for (const s of [-1, 1]) k.ball(0.07, tone(wood, 0.7), s * 0.33, -0.95, 0, { seg: 6, rows: 4 });
      for (const s of [-1, 1]) k.tube([[s * 0.33, -0.95, 0], [s * 0.15, -0.65, 0.2], [0, -0.45, 0.32]], 0.025, 0xc62828, { seg: 8, sides: 4 });
      k.box(0.18, 0.12, 0.1, 0x5d4037, 0, -0.42, 0.34); // the pouch with a pebble
      return [-1.05, 0];
    });
    h.tracer = 0xbdbdbd;
    h.projectile = { color: 0x9e9e9e, size: 0.3 };
  } else if (i === 2) {
    hold(h, key, 1, (k) => {
      // a little first-aid kit
      k.box(0.55, 0.38, 0.32, 0xe53935, 0, -0.25, 0, { r: 0.05 });
      k.box(0.2, 0.06, 0.04, white, 0, -0.25, 0.17);
      k.box(0.06, 0.2, 0.04, white, 0, -0.25, 0.17);
      k.box(0.3, 0.06, 0.06, INK, 0, -0.02, 0);
      return [-0.4, 0];
    });
    h.tracer = 0x69f0ae;
  } else if (i === 3) {
    // Sticky: a long bamboo blowpipe with a dart bag
    hold(h, key, 1, (k) => {
      k.cyl(0.09, 2.6, 0x6d8b3a, 0, -1.2, 0, { seg: 8 });
      for (const y of [-0.4, -1.1, -1.8]) k.cyl(0.11, 0.06, 0x4e6b2a, 0, y, 0, { seg: 8 }); // bamboo joints
      k.cyl(0.12, 0.15, 0x33691e, 0, -2.5, 0, { seg: 8 });
      return [-2.6, 0];
    });
    h.leftArm.rotation.set(-PI / 2 + 0.1, 0, -0.45);
    h.tracer = 0x8bc34a;
    h.projectile = { color: 0x8bc34a, size: 0.2 };
  } else {
    // Nelly: red boxing gloves with white cuffs, both up
    h.leftArm.rotation.set(-PI / 2 + 0.3, 0, -0.2);
    for (const [arm, s] of [[h.leftArm, 1], [h.rightArm, -1]]) {
      const g = fist(arm, -1.9);
      const k = wear(h, g, `${key}:glove${s}`);
      k.box(1.08, 0.3, 1.08, white, 0, 0.25, 0, { r: 0.06 });
      k.box(1.25, 0.95, 1.3, 0xd32f2f, 0, -0.3, 0.08, { r: 0.3 });
      k.box(0.5, 0.45, 0.5, 0xd32f2f, s * 0.5, -0.1, 0.4, { r: 0.18 }); // thumb
      k.done();
      if (s < 0) {
        h.muzzles = [];
        muzzle(h, g, -0.8, 0);
      }
    }
    h.tracer = 0xff5252;
  }
  return own(h);
}

// ------------------------------------------------------------------ Chaos Jester units

/** Wind-up Toy: a toy soldier with a tall shako and plume, crossed white belts, a popgun and a turning key. */
function toySoldier() {
  const key = 's7:chaosToy';
  const gold = 0xffc400;
  const h = makeHumanoid({ skin: 0xffccbc, shirt: 0xd32f2f, pants: 0x1a237e, arms: 0xd32f2f, face: 'soldier' });
  const hd = wear(h, h.head, `${key}:head`);
  hd.cyl(0.66, 1.0, 0x111111, 0, 1.45, 0, { seg: 20, r2: 0.72 }); // shako
  hd.cyl(0.74, 0.08, gold, 0, 1.96, 0, { seg: 20 });
  hd.cyl(0.68, 0.1, gold, 0, 0.98, 0, { seg: 20 });
  hd.plan(starPts(8, 0.26, 0.16), 0.05, gold, 0, 1.42, 0.68, { rx: PI / 2 }); // plate badge
  hd.plan([[-0.5, 0], [0.5, 0], [0.4, 0.35], [-0.4, 0.35]], 0.05, 0x111111, 0, 0.95, 0.6, { rx: -0.2 }); // peak
  hd.cyl(0.05, 0.25, gold, 0, 2.1, 0.45, { seg: 6 });
  hd.ball(0.2, 0xfafafa, 0, 2.38, 0.45, { sy: 1.6, seg: 10, rows: 8 }); // plume
  hd.ball(0.1, 0xd32f2f, 0, 2.66, 0.45, { seg: 8, rows: 6 });
  for (const s of [-1, 1]) hd.tube([[s * 0.66, 1.0, 0], [s * 0.55, 0.4, 0.25], [0, 0.08, 0.5]], 0.03, gold, { seg: 8, sides: 4 }); // chin strap
  for (const s of [-1, 1]) hd.cyl(0.11, 0.03, 0xff8a80, s * 0.36, 0.42, 0.48, { axis: 'z', seg: 12 }); // painted cheeks
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  for (const s of [-1, 1]) t.box(0.26, 2.5, 1.12, 0xfafafa, 0, 0, 0, { rz: s * 0.62 }); // crossed belts
  t.ball(0.12, gold, 0, 0.0, 0.58, { seg: 8, rows: 6 }); // where they cross
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) t.ball(0.06, gold, s * 0.62, 0.6 - i * 0.5, 0.55, { seg: 6, rows: 4 }); // buttons
  epaulettes(t, gold);
  belt(t, 0x111111, gold);
  t.done();
  // the wind-up key in the back, on its own group so it can turn
  const kg = new THREE.Group();
  kg.position.set(0, 0.2, -0.5);
  h.torso.add(kg);
  const kk = wear(h, kg, `${key}:key`);
  kk.cyl(0.08, 0.6, gold, 0, 0, -0.3, { axis: 'z', seg: 8 });
  for (const s of [-1, 1]) kk.torus(0.26, 0.07, gold, s * 0.3, 0, -0.65, { seg: 14 });
  kk.box(0.3, 0.14, 0.14, gold, 0, 0, -0.65);
  kk.done();
  h.spinParts = [{ o: kg, axis: 'z', rate: 3 }];
  feet(h, key, 0x111111, (b) => {
    for (const s of [-1, 1]) b.box(0.06, 1.3, 0.24, gold, s * 0.51, -0.75, 0); // gold stripes down the trousers
    b.box(1.12, 0.12, 1.12, gold, 0, -1.34, 0.02);
  });
  hands(h, key, 0xfafafa, 0xd32f2f, (a) => a.box(1.08, 0.14, 1.08, gold, 0, -1.3, 0));
  hold(h, key, 1.15, (k) => {
    // a popgun: striped wooden barrel, a cork on a string
    k.box(0.26, 0.6, 0.34, 0xd32f2f, 0, 0.5, UP, { r: 0.06 }); // stock
    k.box(0.22, 0.26, 0.5, 0x8d6e63, 0, 0.1, UP - 0.32, { rx: -0.3, r: 0.04 }); // grip
    k.cyl(0.16, 1.5, 0x8d6e63, 0, -0.75, UP, { seg: 12 });
    for (const y of [-0.3, -0.75, -1.2]) k.cyl(0.17, 0.12, gold, 0, y, UP, { seg: 12 });
    k.cyl(0.2, 0.2, gold, 0, -1.55, UP, { seg: 12 });
    k.cyl(0.13, 0.25, 0xd7b46a, 0, -1.78, UP, { r2: 0.16, seg: 10 }); // cork
    k.tube([[0, -1.85, UP + 0.12], [0.2, -1.6, UP + 0.05], [0.18, -1.2, UP - 0.1]], 0.015, 0xfafafa, { seg: 8, sides: 4 });
    return [-1.95, UP];
  });
  aimLong(h);
  h.tracer = 0xd7b46a;
  h.projectile = { color: 0xd7b46a, size: 0.3 };
  return own(h);
}

/** Big Clown: rainbow wig, red nose, painted smile, a polka-dot suit with a ruffle, a bubble tank and cannon. */
function bigClown() {
  const key = 's7:chaosClown';
  const h = makeHumanoid({ skin: 0xfafafa, shirt: 0xfdd835, pants: 0x7e57c2, arms: 0xfdd835, face: 'smile' });
  const hd = wear(h, h.head, `${key}:head`);
  hd.ball(0.2, 0xe53935, 0, 0.55, 0.68, { seg: 12, rows: 8 }); // red nose
  const wig = [[-0.62, 0.85, -0.05, 0xff7043], [0.62, 0.85, -0.05, 0x43a047], [-0.66, 0.5, -0.12, 0x1e88e5], [0.66, 0.5, -0.12, 0xec407a], [0, 1.2, -0.15, 0xffc400], [-0.38, 1.1, -0.35, 0x8e24aa], [0.38, 1.1, -0.35, 0x00acc1], [0, 0.85, -0.6, 0xff7043]];
  for (const [x, y, z, c] of wig) hd.ball(0.36, c, x, y, z, { seg: 10, rows: 7 });
  hd.cyl(0.25, 0.35, 0x111111, 0.15, 1.6, 0, { seg: 14, rz: -0.2 }); // tiny hat
  hd.cyl(0.38, 0.05, 0x111111, 0.12, 1.42, 0, { seg: 16, rz: -0.2 });
  hd.ball(0.09, 0xe53935, 0.38, 1.6, 0.12, { seg: 8, rows: 6 }); // its flower
  hd.torus(0.24, 0.05, 0xe53935, 0, 0.44, 0.58, { arc: PI, rz: PI, seg: 12 }); // painted smile
  for (const s of [-1, 1]) hd.box(0.13, 0.13, 0.03, 0x1e88e5, s * 0.24, 0.98, 0.5, { rz: PI / 4 }); // diamonds over the eyes
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  const dots = [[-0.5, 0.4, 0xe53935], [0.5, -0.3, 0x1e88e5], [-0.3, -0.55, 0x43a047], [0.45, 0.55, 0xec407a], [-0.65, -0.1, 0x8e24aa]];
  for (const [x, y, c] of dots) {
    t.cyl(0.17, 0.04, c, x, y, 0.52, { axis: 'z', seg: 12 });
    t.cyl(0.17, 0.04, c, -x, y, -0.52, { axis: 'z', seg: 12 });
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * PI * 2;
    t.ball(0.3, i % 2 ? 0xfafafa : 0xf8bbd0, Math.sin(a) * 0.95, 1.05, Math.cos(a) * 0.6, { sy: 0.5, seg: 8, rows: 5 }); // ruffle collar
  }
  for (const [y, c] of [[0.4, 0xe53935], [0.0, 0x1e88e5], [-0.4, 0x43a047]]) t.ball(0.14, c, 0, y, 0.56, { seg: 8, rows: 6 }); // pompom buttons
  // the bubble tank on the back (see-through, bubbles inside), its straps and the hose to the cannon
  const tank = glass(h, 0x80deea, 0.5);
  t.cyl(0.55, 1.4, tank, 0, 0.1, -1.0, { seg: 16 });
  for (const y of [-0.66, 0.86]) t.cyl(0.58, 0.16, 0x26c6da, 0, y, -1.0, { seg: 16 });
  for (const [x, y, r] of [[-0.2, -0.3, 0.16], [0.18, 0.05, 0.12], [-0.05, 0.4, 0.1], [0.22, -0.4, 0.09]]) t.ball(r, 0xe1f5fe, x, y, -1.0, { seg: 8, rows: 6 });
  for (const s of [-1, 1]) t.box(0.22, 0.1, 1.3, INK, s * 0.5, 1.0, -0.15);
  t.tube([[-0.4, 0.9, -1.0], [-1.2, 0.7, -0.6], [-1.4, 0.2, 0.0]], 0.07, 0xec407a, { seg: 12, sides: 6 });
  t.done();
  feet(h, key, 0xe53935, (b) => {
    b.ball(0.62, 0xe53935, 0, -1.78, 0.5, { sx: 0.92, sy: 0.55, sz: 1.5, seg: 14, rows: 8 }); // big clown shoes
    b.box(0.5, 0.4, 0.05, 0xffc400, 0.15, -0.6, 0.51); // a patch on the knee
  });
  hands(h, key, 0xfafafa, 0xfdd835, (a) => a.cyl(0.66, 0.2, 0xfafafa, 0, -1.45, 0, { seg: 14 })); // white gloves with frilly cuffs
  hold(h, key, 1.1, (k) => {
    const Z = UP + 0.1;
    k.cyl(0.32, 1.8, 0x26c6da, 0, -0.9, Z, { seg: 16 });
    for (const y of [-0.4, -0.9, -1.4]) k.torus(0.34, 0.05, 0xec407a, 0, y, Z, { rx: PI / 2, seg: 16 });
    k.cyl(0.55, 0.4, 0xec407a, 0, -1.95, Z, { r2: 0.32, seg: 16 }); // the flared mouth
    k.ball(0.4, glass(h, 0xb3e5fc, 0.55), 0, -2.45, Z, { seg: 12, rows: 9 }); // a bubble coming out
    k.box(0.22, 0.26, 0.5, 0xec407a, 0, 0.1, UP - 0.36, { rx: -0.3, r: 0.04 }); // grip
    k.cyl(0.2, 0.3, 0xffc400, 0, 0.1, Z, { seg: 12 }); // the hose fitting
    return [-2.5, Z];
  });
  aimLong(h);
  h.tracer = 0x80deea;
  h.projectile = { color: 0xb3e5fc, size: 0.6 };
  h.size = 1.4;
  return own(h);
}

// ------------------------------------------------------------------ the table

const students = (n) => () => squad(n, (i) => student(i));

export const SUMMONS = {
  cutlass: (count = 1) => squad(count, cutlassPirate),
  corsair: (count = 1) => squad(count, corsairPirate),
  ebenforcer: (count = 1) => squad(count, () => enforcer(false)),
  ebenforcerm: (count = 1) => squad(count, () => enforcer(true)),
  jpara: (count = 1) => squad(count, paratrooper),
  pfragger: (count = 1) => squad(count, fragger),
  pboogie: (count = 1) => squad(count, boogieman),
  procketeer: (count = 1) => squad(count, rocketPunk),
  pnucleus: (count = 1) => squad(count, nucleus),
  rbOperative: (n = 1) => reconSquad(n, () => ({ model: 'rbOperative', shirt: 0x556b2f, helmet: 0x4b5320 })),
  rbOperative2: (n = 1) => reconSquad(n, () => ({ model: 'rbOperative2', shirt: 0x37474f, helmet: 0x263238, visor: 0x76ff03 })),
  rbPrivate: (n = 1) => reconSquad(n, () => ({ model: 'rbPrivate', shirt: 0x1b5e20, helmet: 0x212121, visor: 0xffab00 })),
  rbSolemn: (n = 1) => reconSquad(n, (i) => ({
    model: 'rbSolemn', vk: i % 4, shirt: 0x212121, helmet: 0x111111, visor: SOLEMN_VISOR[i % 4],
    gun: i === 1 ? 'sniper' : i === 3 ? 'tube' : 'rifle',
  }), 0.65),
  oddport1: students(1),
  oddport2: students(2),
  oddport3: students(3),
  oddport4: students(4),
  oddport5: students(5),
  chaosToy: () => squad(1, toySoldier),
  chaosClown: () => squad(1, bigClown),
};
