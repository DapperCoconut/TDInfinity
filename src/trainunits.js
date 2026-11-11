import * as THREE from 'three';
import { PARTS, axle, bolts, crate, glowMat, hatch, kit, lamp, mgun, muzzleAt, periscope, tone, turretAt, unitBase } from './vehicles.js';
import { rod } from './mechunits.js';
import { hazeBox } from './moreunits.js';

// Void Port's rail units, built with the vehicle kit (vehicles.js): the two mine carts, the
// steam engines and the armoured wagons, each in the normal and the Void livery.

const { GLASS, STEEL, GUN } = PARTS;
const PI = Math.PI;
const TRAIN = { body: 0x37474f, trim: 0x8e2b2b, brass: 0xc9a227, dark: 0x212121, wood: 0x6d4c33, bag: 0xb5a67a, glow: null };
const VOID_TRAIN = { body: 0x1a0033, trim: 0x311b92, brass: 0x4a148c, dark: 0x0b0014, wood: 0x24103d, bag: 0x3a2a55, glow: 0xd500f9 };

const TRAINS = {
  vgunner: { pal: TRAIN, kind: 'gun', build: cart },
  vmortar: { pal: TRAIN, kind: 'mortar', build: cart },
  vloco: { pal: TRAIN, build: loco },
  vvoidloco: { pal: VOID_TRAIN, build: loco },
  vgunwagon: { pal: TRAIN, kind: 'gun', build: wagon },
  vvoidgwagon: { pal: VOID_TRAIN, kind: 'gun', build: wagon },
  vmortarwagon: { pal: TRAIN, kind: 'mortar', build: wagon },
  vvoidmortar: { pal: VOID_TRAIN, kind: 'mortar', build: wagon },
};

/** Steel rail wheels (flanged, spoked look) on one axle. */
function railAxle(u, pal, half, z, r) {
  axle(u, u.body, half, r, z, r, 0.26, { tyre: 0x2a2d31, rim: pal.glow ? 0x5e35b1 : pal.trim, lugs: false });
}

/** Buffers and a coupling hook on the end of a frame at z (dir: +1 front, -1 rear). */
function coupling(k, pal, y, z, dir, half = 0.7) {
  for (const sx of [-1, 1]) {
    k.cyl(0.1, 0.34, pal.dark, sx * half, y, z + dir * 0.17, { axis: 'z', seg: 8 });
    k.cyl(0.2, 0.07, STEEL, sx * half, y, z + dir * 0.36, { axis: 'z', seg: 10 });
  }
  k.box(0.16, 0.16, 0.4, STEEL, 0, y - 0.05, z + dir * 0.2);
  k.torus(0.11, 0.04, STEEL, 0, y - 0.05, z + dir * 0.46, { rx: PI / 2, seg: 8 });
}

/** A mortar on its baseplate in turret kit `g`; adds the muzzle and the shell the unit lobs. */
function mortarOn(u, t, g, pal, s) {
  const G = pal.glow ? glowMat(u, pal.glow) : null;
  const a = [0, 0.16 * s, -0.12 * s];
  const b = [0, 1.64 * s, 0.9 * s];
  g.cyl(0.74 * s, 0.1 * s, pal.dark, 0, 0.05 * s, 0, { seg: 12 });
  g.cyl(0.5 * s, 0.08 * s, STEEL, 0, 0.13 * s, 0, { seg: 10 });
  g.ball(0.2 * s, pal.dark, a[0], a[1] + 0.04 * s, a[2], { seg: 8, rows: 5 });
  rod(g, 0.21 * s, a, b, 0x33363a, 10); // tube
  rod(g, 0.25 * s, a, [0, a[1] + (b[1] - a[1]) * 0.22, a[2] + (b[2] - a[2]) * 0.22], pal.dark, 10);
  g.torus(0.23 * s, 0.05 * s, pal.brass, 0, b[1], b[2], { rx: 0.6 - PI / 2, seg: 10 });
  g.torus(0.23 * s, 0.035 * s, pal.brass, 0, a[1] + (b[1] - a[1]) * 0.62, a[2] + (b[2] - a[2]) * 0.62, { rx: 0.6 - PI / 2, seg: 10 });
  if (G) g.ball(0.17 * s, G, 0, b[1] - 0.03 * s, b[2] - 0.02 * s, { seg: 6, rows: 4 });
  // bipod, traverse screw, sight
  const c = [0, a[1] + (b[1] - a[1]) * 0.62, a[2] + (b[2] - a[2]) * 0.62];
  for (const sx of [-1, 1]) g.tube([c, [sx * 0.62 * s, 0.1 * s, c[2] + 0.36 * s]], 0.04 * s, STEEL, { seg: 2 });
  g.cyl(0.03 * s, 0.9 * s, STEEL, 0, 0.42 * s, c[2] + 0.22 * s, { axis: 'x', seg: 5 });
  g.box(0.14 * s, 0.2 * s, 0.14 * s, pal.brass, -0.3 * s, c[1] + 0.1 * s, c[2]);
  // shells standing ready
  for (const [x, z] of [[0.52, -0.42], [0.3, -0.56], [-0.5, -0.46]]) {
    g.cyl(0.11 * s, 0.34 * s, pal.glow ? pal.trim : 0x4b5a2a, x * s, 0.3 * s, z * s, { seg: 8 });
    g.cyl(0.11 * s, 0.2 * s, G ?? pal.brass, x * s, 0.57 * s, z * s, { r2: 0.02, seg: 8 });
  }
  muzzleAt(u, t, 0, 1.66 * s, 0.92 * s);
  u.cannon = u.muzzles[0];
  u.projectile = { color: pal.glow ?? 0x424242, size: 0.6 * s };
  u.tracer = pal.glow ?? 0xffab40;
}

/** Void Port's mine carts: a riveted tub on four rail wheels carrying a shielded gun or a mortar. */
function cart(model, { pal, kind }) {
  const u = unitBase();
  const G = pal.glow ? glowMat(u, pal.glow) : null;
  const k = kit(u, u.body, model + ':b');
  k.box(1.7, 0.2, 3.0, pal.dark, 0, 0.74, 0); // frame
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    k.box(0.2, 0.34, 0.44, pal.dark, sx * 0.78, 0.54, sz * 0.8); // axle boxes
    k.box(0.1, 0.07, 0.8, STEEL, sx * 0.78, 0.78, sz * 0.8, { rx: sz * 0.1 }); // springs
  }
  // tub: tapered, with a rim, straps and rivets
  k.slab(2.2, 1.1, 2.6, pal.body, 0, 1.4, 0, { bw: 0.78, bd: 0.86 });
  k.box(1.96, 0.05, 2.36, tone(pal.body, 0.5), 0, 1.93, 0);
  for (const sx of [-1, 1]) {
    k.box(0.14, 0.12, 2.74, pal.trim, sx * 1.1, 1.96, 0);
    for (const z of [-0.8, 0, 0.8]) k.box(0.06, 1.1, 0.14, pal.brass, sx * 1.0, 1.4, z, { rz: -sx * 0.217 });
    bolts(k, [sx * 1.08, 1.76, -1.1], [sx * 1.08, 1.76, 1.1], 7, pal.brass, 0.05);
    k.box(0.5, 0.12, 0.14, pal.trim, sx * 0.86, 1.96, 1.3);
    k.box(0.5, 0.12, 0.14, pal.trim, sx * 0.86, 1.96, -1.3);
    k.box(0.1, 0.5, 0.1, pal.dark, sx * 0.86, 1.08, 1.3); // handles
  }
  k.box(2.2, 0.12, 0.14, pal.trim, 0, 1.96, 1.3);
  k.box(2.2, 0.12, 0.14, pal.trim, 0, 1.96, -1.3);
  for (const x of [-0.5, 0.5]) for (const sz of [-1, 1]) k.box(0.14, 1.1, 0.06, pal.brass, x, 1.4, sz * 1.2, { rx: sz * 0.16 });
  coupling(k, pal, 0.78, 1.5, 1, 0.55);
  coupling(k, pal, 0.78, -1.5, -1, 0.55);
  // lantern on the front
  k.box(0.24, 0.3, 0.2, pal.dark, 0, 1.5, 1.26);
  k.box(0.16, 0.18, 0.06, G ?? glowMat(u, 0xffc107), 0, 1.5, 1.38);
  if (G) for (const sx of [-1, 1]) k.box(0.05, 0.08, 2.0, G, sx * 0.9, 0.98, 0, { rz: -sx * 0.217 });
  k.done();
  for (const z of [-0.8, 0.8]) railAxle(u, pal, 0.95, z, 0.45);
  const t = turretAt(u, u.body, 1.96);
  const g = kit(u, t, model + ':t');
  if (kind === 'gun') {
    g.cyl(0.6, 0.1, pal.dark, 0, 0.05, 0, { seg: 12 });
    g.cyl(0.12, 0.5, STEEL, 0, 0.3, 0, { seg: 8 });
    g.box(0.3, 0.2, 0.36, pal.dark, 0, 0.58, 0.05);
    mgun(g, 0, 0.72, -0.35, 2.0, { s: 1.25, ammoCol: pal.trim });
    g.slab(1.3, 0.8, 0.08, pal.body, 0, 0.78, 0.5, { tw: 0.8 }); // gun shield
    g.box(0.36, 0.14, 0.1, 0x0b0c0d, -0.36, 0.92, 0.5);
    g.box(1.1, 0.07, 0.1, pal.brass, 0, 0.44, 0.52);
    if (G) g.box(0.7, 0.06, 0.1, G, 0, 1.12, 0.51);
    g.done();
    muzzleAt(u, t, 0, 0.75, 1.72);
    u.height = 3.2;
    u.tracer = pal.glow ?? 0xffd54f;
  } else {
    mortarOn(u, t, g, pal, 1);
    g.done();
    u.height = 3.7;
  }
  return u;
}

/** Void Port's steam engine: boiler, smokebox, flared stack, domes, cab, drivers with rods, a cow-catcher and a gun on the cab roof. */
function loco(model, { pal }) {
  const u = unitBase();
  const { body, trim, brass, dark } = pal;
  const G = pal.glow ? glowMat(u, pal.glow) : null;
  const lens = G ?? glowMat(u, 0xffe9a0, 0.9);
  const k = kit(u, u.body, model + ':b');
  k.box(2.0, 0.3, 7.0, dark, 0, 1.0, -0.1); // frame
  k.box(2.5, 0.36, 0.2, trim, 0, 1.0, 3.45); // buffer beam
  coupling(k, pal, 1.0, -3.6, -1);
  // boiler, bands, smokebox and its door
  k.cyl(1.0, 4.0, body, 0, 2.15, 1.0, { axis: 'z', seg: 16 });
  for (const z of [-0.7, 0.3, 1.3, 2.3]) k.cyl(1.03, 0.1, brass, 0, 2.15, z, { axis: 'z', seg: 16 });
  k.cyl(1.06, 0.7, dark, 0, 2.15, 3.05, { axis: 'z', seg: 16 });
  k.cyl(0.88, 0.14, tone(body, 0.75), 0, 2.15, 3.45, { axis: 'z', r2: 0.7, seg: 16 });
  k.torus(0.9, 0.05, brass, 0, 2.15, 3.4, { seg: 16 });
  k.box(1.5, 0.07, 0.05, STEEL, 0, 2.15, 3.54);
  k.ball(0.1, brass, 0, 2.15, 3.56, { seg: 6, rows: 4 });
  k.box(0.7, 0.24, 0.05, brass, 0, 1.5, 3.47); // number plate
  k.box(1.6, 0.5, 0.9, dark, 0, 1.3, 2.9); // saddle
  // headlamp
  k.box(0.5, 0.5, 0.44, dark, 0, 3.42, 3.1, { r: 0.05 });
  lamp(k, 0, 3.42, 3.33, 0.19, lens);
  // stack, steam dome, sand dome, bell, whistle
  k.cyl(0.3, 0.8, dark, 0, 3.5, 2.4, { seg: 10 });
  k.cyl(0.3, 0.6, dark, 0, 4.2, 2.4, { r2: 0.58, seg: 12 });
  k.torus(0.58, 0.06, brass, 0, 4.5, 2.4, { rx: PI / 2, seg: 12 });
  k.cyl(0.42, 0.4, brass, 0, 3.26, 1.1, { seg: 12 });
  k.ball(0.42, brass, 0, 3.44, 1.1, { seg: 10, rows: 6 });
  k.cyl(0.34, 0.36, trim, 0, 3.24, 0.0, { seg: 10 });
  k.cyl(0.36, 0.1, brass, 0, 3.46, 0.0, { r2: 0.2, seg: 10 });
  for (const sx of [-1, 1]) k.box(0.05, 0.4, 0.05, brass, sx * 0.2, 3.34, -0.6);
  k.box(0.5, 0.05, 0.05, brass, 0, 3.54, -0.6);
  k.cyl(0.17, 0.2, brass, 0, 3.36, -0.6, { r2: 0.08, seg: 8 });
  k.cyl(0.05, 0.4, brass, 0.5, 3.2, -0.95, { seg: 6 });
  k.cyl(0.08, 0.14, brass, 0.5, 3.44, -0.95, { seg: 6 });
  for (const sx of [-1, 1]) {
    // handrails, running boards, steam pipes
    k.tube([[sx * 0.84, 2.86, -1.2], [sx * 0.84, 2.86, 3.2]], 0.03, brass, { seg: 2 });
    for (const z of [-0.8, 0.6, 2.0, 3.1]) k.cyl(0.025, 0.2, brass, sx * 0.8, 2.78, z, { seg: 4, rz: -sx * 0.7 });
    k.box(0.5, 0.07, 4.6, trim, sx * 1.22, 1.36, 1.0);
    k.box(0.05, 0.14, 4.6, brass, sx * 1.46, 1.34, 1.0);
    k.tube([[sx * 0.4, 3.3, 1.1], [sx * 0.95, 2.6, 1.3], [sx * 1.1, 1.8, 2.4], [sx * 1.3, 1.5, 2.6]], 0.06, brass, { seg: 10 });
    // cylinders, piston rods, coupling rods
    k.cyl(0.36, 1.0, body, sx * 1.36, 1.12, 2.6, { axis: 'z', seg: 12 });
    for (const z of [2.08, 3.12]) k.cyl(0.38, 0.07, brass, sx * 1.36, 1.12, z, { axis: 'z', seg: 12 });
    k.cyl(0.05, 1.3, 0xc4c8cc, sx * 1.42, 1.12, 1.5, { axis: 'z', seg: 6 });
    k.box(0.1, 0.24, 0.3, STEEL, sx * 1.44, 1.05, 0.9);
    k.box(0.07, 0.14, 3.9, 0xc4c8cc, sx * 1.47, 0.6, -0.3);
    k.box(0.07, 0.1, 1.7, 0xc4c8cc, sx * 1.52, 0.82, 0.8, { rx: 0.27 });
    for (const z of [-2.2, -0.3, 1.6]) k.cyl(0.11, 0.1, STEEL, sx * 1.5, 0.6, z, { axis: 'x', seg: 8 });
    // cab windows, stripe, steps, lamps on the buffer beam
    k.box(0.05, 0.7, 0.96, GLASS, sx * 1.21, 3.0, -2.2);
    k.box(0.07, 0.07, 1.06, brass, sx * 1.22, 2.6, -2.2);
    k.box(0.05, 0.14, 1.9, brass, sx * 1.22, 2.3, -2.2);
    k.cyl(0.26, 0.06, GLASS, sx * 0.76, 3.12, -1.23, { axis: 'z', seg: 10 });
    k.torus(0.27, 0.035, brass, sx * 0.76, 3.12, -1.2, { seg: 10 });
    k.box(0.4, 0.06, 0.5, dark, sx * 1.3, 0.8, -2.9);
    k.box(0.05, 0.6, 0.05, dark, sx * 1.3, 1.1, -3.12);
    lamp(k, sx * 0.95, 1.32, 3.5, 0.11, lens);
    k.cyl(0.1, 0.34, dark, sx * 0.8, 1.0, 3.7, { axis: 'z', seg: 8 });
    k.cyl(0.2, 0.07, STEEL, sx * 0.8, 1.0, 3.88, { axis: 'z', seg: 10 });
  }
  // cab, roof, coal bunker
  k.box(2.4, 2.3, 1.9, body, 0, 2.5, -2.2, { r: 0.05 });
  k.slab(2.8, 0.24, 2.5, trim, 0, 3.74, -2.25, { tw: 0.78 });
  k.box(1.9, 0.06, 2.3, tone(trim, 0.7), 0, 3.87, -2.25);
  k.box(2.3, 1.3, 0.56, body, 0, 2.0, -3.42, { r: 0.04 });
  k.box(2.36, 0.1, 0.62, brass, 0, 2.66, -3.42);
  for (const [x, z, r] of [[-0.6, -3.4, 0.26], [0, -3.46, 0.3], [0.6, -3.38, 0.26], [0.3, -3.3, 0.2], [-0.3, -3.34, 0.22]]) k.ball(r, 0x0f0f10, x, 2.72, z, { seg: 5, rows: 3 });
  k.box(0.9, 0.3, 0.05, G ?? glowMat(u, 0xff6d00), 0, 1.36, -3.16); // firebox glow
  // cow-catcher: a pointed plate with slats up to the beam
  k.plan([[-1.2, 3.5], [1.2, 3.5], [0.14, 4.7], [-0.14, 4.7]], 0.12, trim, 0, 0.22, 0);
  for (const x of [-1.1, -0.66, -0.22, 0.22, 0.66, 1.1]) k.tube([[x, 1.0, 3.56], [x * 0.12, 0.3, 4.62]], 0.05, G ? pal.trim : brass, { seg: 2, sides: 4 });
  k.tube([[-1.16, 0.3, 3.56], [0, 0.3, 4.7], [1.16, 0.3, 3.56]], 0.06, STEEL, { seg: 8, tension: 0.02, sides: 4 });
  if (G) {
    // void fittings: horns on the cab roof and lit lines along the boiler
    for (const sx of [-1, 1]) {
      k.cyl(0.16, 1.0, G, sx * 1.0, 4.3, -2.2, { r2: 0.01, seg: 6, rz: -sx * 0.5 });
      k.box(0.05, 0.08, 4.4, G, sx * 1.49, 1.18, 1.0);
      k.box(0.05, 0.07, 3.6, G, sx * 0.72, 2.86, 1.0);
    }
    k.cyl(0.4, 0.06, G, 0, 4.47, 2.4, { seg: 10 });
  }
  k.done();
  for (const z of [-2.2, -0.3, 1.6]) railAxle(u, pal, 1.25, z, 0.75);
  axle(u, u.body, 1.15, 0.38, 3.0, 0.38, 0.2, { tyre: 0x2a2d31, rim: pal.glow ? 0x5e35b1 : pal.trim, lugs: false });
  if (G) {
    hazeBox(u, u.body, 0.8, 1.1, 0.8, pal.glow, 0.5, 0, 5.05, 2.4); // void fire in the stack
    hazeBox(u, u.body, 2.6, 0.3, 7.4, pal.glow, 0.3, 0, 0.3, 0); // haze under the engine
  }
  // gun on the cab roof
  const t = turretAt(u, u.body, 3.9, -2.2);
  const g = kit(u, t, model + ':t');
  g.cyl(0.62, 0.12, dark, 0, 0.06, 0, { seg: 12 });
  g.plan([[-0.4, 0.5], [0.4, 0.5], [0.6, 0], [0.4, -0.6], [-0.4, -0.6], [-0.6, 0]], 0.46, body, 0, 0.1, 0, { bevel: 0.08 });
  g.box(0.9, 0.1, 0.9, trim, 0, 0.58, -0.05, { r: 0.03 });
  mgun(g, 0.12, 0.36, 0.3, 1.5, { s: 1.1, ammo: false, sight: false });
  mgun(g, -0.12, 0.36, 0.3, 1.5, { s: 1.1, ammo: false, sight: false });
  if (G) g.box(0.5, 0.06, 0.05, G, 0, 0.5, 0.53);
  g.done();
  muzzleAt(u, t, 0, 0.38, 1.85);
  u.height = 4.9;
  u.tracer = pal.glow ?? 0xffd54f;
  return u;
}

/** Void Port's armoured wagons: a plank deck on two bogies with armoured sides, carrying a twin gun turret or a heavy mortar. */
function wagon(model, { pal, kind }) {
  const u = unitBase();
  const { body, trim, brass, dark } = pal;
  const G = pal.glow ? glowMat(u, pal.glow) : null;
  const k = kit(u, u.body, model + ':b');
  k.box(2.1, 0.3, 5.5, dark, 0, 1.0, 0); // frame
  k.box(0.3, 0.3, 4.4, tone(dark, 1.6), 0, 0.8, 0);
  coupling(k, pal, 1.0, 2.75, 1);
  coupling(k, pal, 1.0, -2.75, -1);
  // bogies
  for (const zc of [-1.7, 1.7]) {
    k.box(1.6, 0.2, 0.5, dark, 0, 0.72, zc);
    for (const sx of [-1, 1]) {
      k.box(0.12, 0.26, 1.7, dark, sx * 1.36, 0.5, zc, { r: 0.03 });
      k.cyl(0.1, 0.34, STEEL, sx * 1.36, 0.74, zc, { seg: 6 }); // spring
      for (const dz of [-0.56, 0.56]) k.cyl(0.14, 0.1, brass, sx * 1.42, 0.45, zc + dz, { axis: 'x', seg: 8 });
    }
  }
  // deck planks
  k.box(2.5, 0.14, 5.2, pal.wood, 0, 1.22, 0);
  for (let i = 0; i < 8; i++) k.box(2.5, 0.02, 0.04, tone(pal.wood, 0.6), 0, 1.3, -2.3 + i * 0.65);
  // armoured sides with straps, rivets and firing slits; lower ends
  for (const sx of [-1, 1]) {
    k.box(0.12, 0.74, 5.2, body, sx * 1.25, 1.66, 0);
    k.box(0.18, 0.09, 5.26, trim, sx * 1.25, 2.06, 0);
    for (const z of [-2.2, -1.1, 0, 1.1, 2.2]) k.box(0.05, 0.74, 0.16, brass, sx * 1.32, 1.66, z);
    bolts(k, [sx * 1.32, 1.9, -2.4], [sx * 1.32, 1.9, 2.4], 13, brass, 0.045);
    for (const z of [-1.65, -0.55, 0.55, 1.65]) k.box(0.06, 0.1, 0.5, 0x0b0c0d, sx * 1.32, 1.7, z);
    if (G) k.box(0.05, 0.07, 5.0, G, sx * 1.33, 1.4, 0);
    for (const sz of [-1, 1]) {
      k.box(0.9, 0.5, 0.12, body, sx * 0.74, 1.54, sz * 2.56);
      k.box(0.9, 0.08, 0.16, trim, sx * 0.74, 1.82, sz * 2.56);
      k.box(0.4, 0.06, 0.4, dark, sx * 1.1, 0.8, sz * 2.5); // steps
    }
    lamp(k, sx * 0.9, 1.0, 2.78, 0.1, G ?? 0xfff3b0);
  }
  // sandbags round the mount, stores at the back
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * PI * 2;
    if (Math.abs(Math.cos(a)) > 0.93 && Math.sin(a) > 0) continue;
    k.box(0.56, 0.24, 0.32, i % 2 ? pal.bag : tone(pal.bag, 0.88), Math.sin(a) * 0.98, 1.41, 0.4 + Math.cos(a) * 1.05, { ry: a, r: 0.1 });
  }
  crate(k, -0.6, 1.57, -2.0, 0.8, 0.56, 0.7, pal.glow ? trim : 0x4b5a2a);
  crate(k, 0.5, 1.5, -2.05, 0.7, 0.42, 0.6, pal.glow ? tone(trim, 0.8) : 0x7a5a36);
  k.cyl(0.26, 0.7, pal.glow ? brass : 0x8d3a2b, 0.85, 1.64, -1.3, { seg: 10 });
  k.cyl(0.28, 0.06, dark, 0.85, 1.84, -1.3, { seg: 10 });
  k.done();
  for (const zc of [-1.7, 1.7]) for (const dz of [-0.56, 0.56]) railAxle(u, pal, 1.2, zc + dz, 0.45);
  if (G) hazeBox(u, u.body, 2.4, 0.3, 5.6, pal.glow, 0.3, 0, 0.3, 0);
  const t = turretAt(u, u.body, 1.3, 0.4);
  const g = kit(u, t, model + ':t');
  if (kind === 'gun') {
    g.cyl(0.84, 0.16, dark, 0, 0.08, 0, { seg: 14 });
    g.plan([[-0.5, 0.86], [0.5, 0.86], [0.86, 0.3], [0.86, -0.6], [0.5, -0.9], [-0.5, -0.9], [-0.86, -0.6], [-0.86, 0.3]], 0.9, body, 0, 0.14, 0, { bevel: 0.14, inset: 0.1 });
    g.box(1.76, 0.1, 1.3, trim, 0, 0.5, -0.1);
    g.box(1.2, 0.6, 0.24, tone(body, 0.7), 0, 0.66, 0.86, { r: 0.06 }); // mantlet
    for (const x of [-0.25, 0.25]) {
      g.cyl(0.13, 0.7, 0x2c2f33, x, 0.66, 1.3, { axis: 'z', seg: 8 });
      g.cyl(0.075, 1.9, GUN, x, 0.66, 1.9, { axis: 'z', seg: 8 });
      g.cyl(0.11, 0.24, 0x0e0f10, x, 0.66, 2.76, { axis: 'z', seg: 8 });
      if (G) g.torus(0.12, 0.035, G, x, 0.66, 2.3, { seg: 8 });
      muzzleAt(u, t, x, 0.66, 2.9);
    }
    hatch(g, 0.3, 1.04, -0.3, 0.3, tone(body, 0.8));
    periscope(g, -0.4, 1.04, 0.3, tone(body, 0.8));
    bolts(g, [-0.88, 0.9, -0.5], [-0.88, 0.9, 0.2], 3, brass, 0.045);
    bolts(g, [0.88, 0.9, -0.5], [0.88, 0.9, 0.2], 3, brass, 0.045);
    if (G) g.box(0.6, 0.07, 0.05, G, 0, 0.92, 0.99);
    g.done();
    u.height = 3.4;
    u.tracer = pal.glow ?? 0xffd54f;
  } else {
    g.cyl(0.9, 0.12, dark, 0, 0.06, 0, { seg: 14 });
    const m = new THREE.Group();
    m.position.y = 0.12;
    t.add(m);
    const gm = kit(u, m, model + ':m');
    g.done();
    mortarOn(u, m, gm, pal, 1.3);
    gm.done();
    u.height = 3.9;
  }
  return u;
}

export const TRAIN_UNITS = Object.fromEntries(Object.keys(TRAINS).map((name) => [name, (model) => TRAINS[model].build(model, TRAINS[model])]));
