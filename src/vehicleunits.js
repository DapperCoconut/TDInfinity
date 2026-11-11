import { PARTS, antenna, axle, barrel, bedroll, bolts, crate, glowMat, grille, hatch, jerry, kit, lamp, louvres, mgun, mirror, muzzleAt, periscope, profile, shackle, smoke, star, tone, tracks, turretAt, unitBase, wheelGeo } from './vehicles.js';
import { TANK_UNITS } from './tankunits.js';
import { MECH_UNITS } from './mechunits.js';
import { MORE_UNITS } from './moreunits.js';
import { BOT_UNITS } from './botunits.js';
import { TRAIN_UNITS } from './trainunits.js';
import { AIR_UNITS } from './airunits.js';

// The mechanical summons, built with the vehicle kit (vehicles.js): round wheels that spin,
// tracks that crawl, sloped hulls, and all the small things a real vehicle carries. makeUnit
// (models.js) looks a model up here first; each builder returns the usual unit model
// { root, body, mats, M, muzzles, wheels, turret?, cannon?, legs?, treads?, height, tracer }.
//
// To change how a vehicle looks, find its builder below (they are grouped by family) and check
// it in tools/viewer.html?kind=unit&q=<model>.

const { GLASS, STEEL, GUN, DARK } = PARTS;
const PI = Math.PI;
const RED = 0xc62828;
const AMBER = 0xffa000;
const LENS = 0xfff3b0;

// ------------------------------------------------------------------ jeeps

/** Patrol Jeep and Gun Jeep: an open-top army jeep. The Gun Jeep carries a .50 cal on a pedestal. */
function jeep(model) {
  const u = unitBase();
  const gun = model === 'gunjeep';
  const P = 0x6b8e23;
  const PD = tone(P, 0.72);
  const seat = 0x6e5a3a;
  const k = kit(u, u.body, model + ':b');
  k.box(1.7, 0.3, 4.1, DARK, 0, 0.8, 0); // frame
  k.box(0.5, 0.4, 0.9, 0x2e3134, 0, 0.72, 0.9); // gearbox
  // tub and hood, with wheel arches cut out of the sides
  k.prism(profile([[-2.2, 0.95], [-2.2, 1.5], [0.25, 1.5], [0.25, 1.95], [0.5, 2.0], [2.0, 1.83], [2.2, 1.7], [2.2, 0.95]]), 2.3, P, 0, 0, 0, { bevel: 0.05 });
  for (const s of [-1, 1]) {
    k.prism([[-2.2, 1.45], [-2.2, 1.98], [-1.05, 1.98], [-0.85, 1.62], [-0.05, 1.62], [0.25, 1.98], [0.25, 1.45]], 0.13, P, s * 1.12, 0, 0); // side wall with the door cut-out
    k.box(0.62, 0.07, 1.55, P, s * 1.42, 1.32, 1.4); // front wing
    k.box(0.62, 0.07, 0.6, P, s * 1.42, 1.16, 2.38, { rx: 0.6 });
    k.box(0.62, 0.07, 1.5, P, s * 1.42, 1.32, -1.4); // rear wing
    k.box(0.62, 0.07, 0.5, P, s * 1.42, 1.18, -2.32, { rx: -0.6 });
    k.box(0.5, 0.06, 1.1, PD, s * 1.42, 0.92, 0); // step
    lamp(k, s * 0.86, 1.38, 2.2, 0.2);
    k.box(0.14, 0.14, 0.06, s < 0 ? RED : AMBER, s * 0.95, 1.3, -2.23); // tail lights
    k.box(0.5, 0.24, 0.22, STEEL, s * 0.75, 0.98, -2.32); // bumperettes
    shackle(k, s * 0.95, 1.0, 2.6, 1);
    mirror(k, s * 1.12, 2.15, 0.3, s, PD);
    k.box(0.08, 0.86, 0.08, PD, s * 1.1, 2.4, 0.3, { rx: -0.2 }); // windscreen posts
  }
  k.box(2.3, 0.5, 0.12, P, 0, 1.73, -2.14); // tailgate
  k.box(2.24, 0.04, 0.5, PD, 0, 1.52, -1.85); // rear deck
  // hood: ridge, vents, latches and the star
  k.box(0.07, 0.04, 1.5, PD, 0, 1.93, 1.25, { rx: 0.11 });
  for (const s of [-1, 1]) for (const z of [0.9, 1.6]) k.box(0.1, 0.05, 0.16, DARK, s * 1.05, 1.9 - (z - 0.5) * 0.11, z);
  star(k, 0.55, 1.925, 1.25, 0.34, 0xf2f2f2, { rx: 0.11 });
  star(k, -0.55, 1.925, 1.25, 0.34, 0xf2f2f2, { rx: 0.11 });
  grille(k, 0, 1.36, 2.2, 1.25, 0.62, 7, P);
  k.box(0.2, 0.12, 0.1, DARK, -1.42, 1.44, 2.0); // blackout light on the wing
  // bumper with ram spikes
  k.box(2.95, 0.26, 0.24, STEEL, 0, 1.0, 2.45, { r: 0.04 });
  for (const x of [-1, -0.33, 0.33, 1]) k.cyl(0.12, 0.6, 0xc4c8cc, x, 1.0, 2.84, { axis: 'z', r2: 0.01, seg: 6 });
  // windscreen: frame, split glass
  k.box(2.28, 0.09, 0.09, PD, 0, 2.82, 0.215, { rx: -0.2 });
  k.box(2.28, 0.12, 0.12, PD, 0, 2.0, 0.38);
  k.box(0.07, 0.8, 0.07, PD, 0, 2.4, 0.3, { rx: -0.2 });
  k.box(2.12, 0.76, 0.04, GLASS, 0, 2.41, 0.3, { rx: -0.2 });
  // dashboard, wheel and seats
  k.box(2.1, 0.26, 0.2, DARK, 0, 1.82, 0.1);
  k.cyl(0.035, 0.6, DARK, -0.55, 1.9, -0.12, { seg: 5, rx: -1.0 });
  k.torus(0.26, 0.045, 0x101112, -0.55, 2.06, -0.38, { rx: -0.55, seg: 12 });
  k.cyl(0.03, 0.5, STEEL, 0.05, 1.75, -0.35, { seg: 5, rx: 0.3 }); // gear stick
  k.ball(0.07, 0x101112, 0.05, 1.98, -0.28, { seg: 6, rows: 4 });
  for (const s of [-1, 1]) {
    k.box(0.8, 0.2, 0.74, seat, s * 0.55, 1.62, -0.72, { r: 0.07 });
    k.box(0.8, 0.82, 0.17, seat, s * 0.55, 2.02, -1.12, { r: 0.07, rx: -0.12 });
  }
  // roll bar
  k.tube([[-1.06, 1.95, -1.32], [-1.06, 2.75, -1.36], [-0.8, 2.98, -1.38], [0.8, 2.98, -1.38], [1.06, 2.75, -1.36], [1.06, 1.95, -1.32]], 0.065, DARK, { seg: 20 });
  // the back: spare wheel, jerrycan, shovel and axe, aerial
  k.geo(wheelGeo(0.56, 0.4, 1, { rim: P }), 0.45, 1.62, -2.42, { ry: PI / 2 });
  jerry(k, -0.72, 1.5, -2.36, 0x55702a, { ry: PI / 2 });
  k.cyl(0.035, 1.5, 0x8d6e4a, -1.21, 1.3, -0.4, { axis: 'z', seg: 5 }); // shovel
  k.box(0.05, 0.24, 0.34, 0x33363a, -1.21, 1.3, 0.4);
  k.cyl(0.035, 1.0, 0x8d6e4a, 1.21, 1.3, -0.6, { axis: 'z', seg: 5 }); // axe
  k.box(0.05, 0.3, 0.16, 0x33363a, 1.21, 1.3, -0.1);
  antenna(k, 1.0, 1.98, -2.0, 2.0);
  if (!gun) {
    k.box(1.9, 0.2, 0.6, seat, 0, 1.62, -1.72, { r: 0.07 }); // rear bench
    bedroll(k, 0, 1.98, -1.95, 1.9, 0.2, 0x8a7d57); // folded canvas top
  } else {
    k.cyl(0.42, 0.08, DARK, 0, 1.54, -1.75, { seg: 10 }); // pedestal plate
    crate(k, 0.7, 1.7, -1.8, 0.5, 0.36, 0.7, 0x4b5a2a);
  }
  k.done();
  axle(u, u.body, 1.38, 0.62, 1.4, 0.62, 0.48);
  axle(u, u.body, 1.38, 0.62, -1.4, 0.62, 0.48);
  if (gun) {
    const t = turretAt(u, u.body, 1.55, -1.75);
    const g = kit(u, t, model + ':t');
    g.cyl(0.09, 1.1, DARK, 0, 0.55, 0, { seg: 8 });
    g.cyl(0.2, 0.12, 0x3a3d40, 0, 1.1, 0, { seg: 8 });
    g.box(0.34, 0.3, 0.34, 0x3a3d40, 0, 1.22, 0.05); // cradle
    mgun(g, 0, 1.45, -0.25, 2.0, { s: 1.15 });
    for (const s of [-1, 1]) g.box(0.5, 0.62, 0.05, 0x55702a, s * 0.42, 1.5, 0.45, { ry: s * -0.25 }); // gun shield
    g.done();
    muzzleAt(u, t, 0, 1.47, 1.8);
  } else muzzleAt(u, u.body, 0, 1.3, 2.6);
  u.height = 3.2;
  u.tracer = 0xffd54f;
  return u;
}

// ------------------------------------------------------------------ Humvees

/**
 * Military Base Humvees (desert tan; Humvee 2 is up-armoured, Humvee 3 has a gunner's turret)
 * and Armored Factory Humvees (dark green: .50 cal, TOW launcher or missile pod).
 */
function humvee(model) {
  const u = unitBase();
  const af = model.startsWith('af');
  const armored = af || model !== 'humvee';
  const P = af ? 0x4e5b31 : 0xc2a878;
  const PD = tone(P, 0.74);
  const PL = tone(P, 1.1);
  const plate = af ? 0x3b4626 : 0x8d7b5a;
  const k = kit(u, u.body, model + ':b');
  k.box(2.0, 0.34, 4.5, DARK, 0, 0.9, 0); // chassis
  k.box(0.7, 0.3, 3.0, 0x2e3134, 0, 0.72, 0); // drive shaft tunnel
  // body: low and wide, flat hood, arches for the big wheels
  k.prism(profile([[-2.4, 1.05], [-2.4, 1.85], [0.7, 1.85], [0.78, 1.92], [2.25, 1.78], [2.4, 1.62], [2.4, 1.05]], [[1.6, 0.86], [-1.6, 0.86]]), 2.96, P, 0, 0, 0, { bevel: 0.06 });
  // cab: sloped screen, tumblehome sides
  k.slab(2.84, 1.0, 2.3, P, 0, 2.35, -0.5, { tw: 0.86, td: 0.8, tz: -0.05 });
  k.box(2.5, 0.06, 1.9, PD, 0, 2.87, -0.55); // roof panel
  k.box(2.3, 0.64, 0.05, GLASS, 0, 2.38, 0.56, { rx: -0.2 }); // windscreen
  k.box(0.08, 0.7, 0.07, PD, 0, 2.38, 0.575, { rx: -0.2 });
  k.box(2.2, 0.5, 0.05, GLASS, 0, 2.4, -1.57, { rx: 0.2 }); // rear window
  for (const s of [-1, 1]) {
    for (const z of [-0.05, -1.05]) {
      k.box(0.05, 0.56, 0.78, GLASS, s * 1.325, 2.4, z, { rz: s * 0.19 }); // door windows
      k.box(0.05, 0.9, 0.9, PL, s * 1.495, 1.42, z - 0.02); // door panels
      k.box(0.07, 0.07, 0.2, DARK, s * 1.53, 1.7, z + 0.3); // handles
    }
    mirror(k, s * 1.45, 2.2, 0.5, s, PD);
    lamp(k, s * 0.98, 1.45, 2.4, 0.2);
    k.box(0.22, 0.12, 0.06, AMBER, s * 0.98, 1.16, 2.42);
    k.box(0.16, 0.3, 0.06, RED, s * 1.2, 1.5, -2.42); // tail lights
    k.box(0.5, 0.07, 1.3, PD, s * 1.3, 1.0, 0); // sill step
    shackle(k, s * 1.0, 1.05, 2.78, 1);
    shackle(k, s * 0.9, 1.1, -2.5, -1);
  }
  grille(k, 0, 1.42, 2.4, 1.3, 0.56, 8, P);
  // hood: louvres, intake, latches
  louvres(k, -0.5, 1.9, 1.5, 0.9, 0.9, 5);
  k.box(0.5, 0.16, 0.6, PD, 0.75, 1.92, 1.35, { r: 0.05 });
  k.cyl(0.11, 0.5, DARK, 1.2, 2.15, 0.85, { seg: 8 }); // snorkel
  k.cyl(0.15, 0.14, DARK, 1.2, 2.45, 0.85, { seg: 8 });
  // brush guard and bumper
  const bar = af ? 0x263238 : 0x5d4037;
  k.box(3.1, 0.3, 0.3, bar, 0, 1.05, 2.58, { r: 0.05 });
  for (const x of [-0.75, 0.75]) k.box(0.12, 1.0, 0.12, bar, x, 1.5, 2.66);
  for (const y of [1.55, 1.95]) k.box(1.62, 0.1, 0.1, bar, 0, y, 2.66);
  k.cyl(0.16, 0.6, STEEL, 0, 1.08, 2.76, { axis: 'x', seg: 8 }); // winch
  // rear deck: tailgate, cans, spare wheel
  k.box(2.9, 0.5, 0.1, PD, 0, 1.6, -2.42);
  k.box(1.1, 0.26, 0.2, bar, 0, 1.02, -2.5);
  jerry(k, -1.0, 2.17, -2.0, tone(P, 0.8));
  jerry(k, -0.68, 2.17, -2.0, tone(P, 0.8));
  k.geo(wheelGeo(0.6, 0.42, 1, { rim: P }), 0.55, 2.08, -2.05, { rz: PI / 2 }); // spare lying on the deck
  antenna(k, -1.25, 1.85, -2.2, 2.3);
  if (armored) {
    for (const s of [-1, 1]) {
      k.box(0.13, 0.95, 3.5, plate, s * 1.56, 1.5, -0.2, { r: 0.03 }); // side armour
      bolts(k, [s * 1.63, 1.86, -1.8], [s * 1.63, 1.86, 1.4], 7, tone(plate, 1.3));
      bolts(k, [s * 1.63, 1.14, -1.8], [s * 1.63, 1.14, 1.4], 7, tone(plate, 1.3));
      k.box(0.07, 0.3, 1.9, plate, s * 1.36, 2.72, -0.55, { rz: s * 0.19 }); // window armour
    }
    k.box(2.8, 0.1, 1.15, plate, 0, 1.9, 1.5, { rx: 0.09 }); // hood plate
    k.box(2.4, 0.22, 0.08, plate, 0, 2.78, 0.5, { rx: -0.2 }); // visor
  }
  const turreted = model === 'humvee3' || af;
  if (turreted) k.cyl(0.78, 0.14, DARK, 0, 2.93, -0.6, { seg: 14 }); // ring mount
  else {
    k.box(1.0, 0.3, 1.3, tone(P, 0.85), 0, 3.02, -0.7, { r: 0.08 }); // roof stowage
    bedroll(k, 0, 3.05, 0.1, 1.6, 0.16, 0x8a7d57);
  }
  k.done();
  axle(u, u.body, 1.52, 0.68, 1.6, 0.68, 0.56, { rim: tone(P, 0.8) });
  axle(u, u.body, 1.52, 0.68, -1.6, 0.68, 0.56, { rim: tone(P, 0.8) });
  if (turreted) {
    const t = turretAt(u, u.body, 2.8, -0.6);
    const g = kit(u, t, model + ':t');
    g.cyl(0.7, 0.3, plate, 0, 0.3, 0, { seg: 14 });
    g.cyl(0.5, 0.06, 0x16181a, 0, 0.46, 0, { seg: 12 }); // open hatch
    if (model === 'humvee3' || model === 'afhumvee') {
      // gunner's shield: front plate with a slot, two wings
      for (const s of [-1, 1]) {
        g.box(0.52, 0.8, 0.07, plate, s * 0.36, 0.82, 0.62);
        g.box(0.07, 0.7, 0.8, plate, s * 0.78, 0.78, 0.22, { ry: s * -0.3 });
      }
      g.box(0.24, 0.3, 0.3, DARK, 0, 0.6, 0.5); // cradle
      mgun(g, 0, 0.75, 0.1, model === 'afhumvee' ? 2.15 : 1.95, { s: 1.2, ammoCol: plate });
      muzzleAt(u, t, 0, 0.77, model === 'afhumvee' ? 2.25 : 2.05);
    } else if (model === 'afhumveetow') {
      g.cyl(0.12, 0.5, DARK, 0, 0.6, 0, { seg: 8 });
      g.cyl(0.28, 2.6, 0x5d6b3a, 0, 0.95, 0.6, { axis: 'z', seg: 10 }); // TOW tube
      g.cyl(0.33, 0.3, 0x3b4626, 0, 0.95, -0.55, { axis: 'z', seg: 10 });
      g.cyl(0.33, 0.2, 0x3b4626, 0, 0.95, 1.75, { axis: 'z', seg: 10 });
      g.cyl(0.2, 0.3, 0xd84315, 0, 0.95, 1.85, { axis: 'z', r2: 0.08, seg: 8 }); // missile nose
      g.box(0.4, 0.34, 0.6, GUN, 0.5, 1.0, 0.2, { r: 0.04 }); // sight
      g.cyl(0.12, 0.06, 0x6fb7e6, 0.5, 1.0, 0.52, { axis: 'z', seg: 8 });
      g.box(0.5, 0.5, 0.07, plate, -0.55, 0.85, 0.5);
      muzzleAt(u, t, 0, 0.95, 2.0, true);
    } else {
      g.cyl(0.14, 0.4, DARK, 0, 0.6, 0, { seg: 8 });
      g.box(1.8, 1.0, 1.6, 0x37474f, 0, 1.2, 0, { r: 0.08 }); // missile pod
      for (const x of [-0.5, 0, 0.5]) for (const y of [0.98, 1.42]) {
        g.cyl(0.19, 0.1, 0x16181a, x, y, 0.8, { axis: 'z', seg: 8 });
        g.cyl(0.14, 0.2, 0xd84315, x, y, 0.84, { axis: 'z', r2: 0.05, seg: 8 });
      }
      g.cyl(0.06, 0.7, GUN, 0, 2.0, -0.4, { seg: 6 }); // radar mast
      g.box(0.9, 0.42, 0.08, 0x90a4ae, 0, 2.4, -0.4, { r: 0.03 });
      g.box(0.2, 0.2, 0.2, GUN, 0, 2.4, -0.5);
      muzzleAt(u, t, 0, 1.2, 0.9, true);
    }
    g.done();
  } else muzzleAt(u, u.body, 0, 1.4, 2.8);
  u.height = af ? 3.8 : 3.4;
  u.tracer = 0xffd54f;
  return u;
}

// ------------------------------------------------------------------ eight-wheelers

const EIGHT = {
  apc: { P: 0xa1886b, zs: [-2.1, -0.7, 0.7, 2.1], gun: 'mg', height: 4, tracer: 0xffd54f },
  missileapc: { P: 0xa1886b, zs: [-2.1, -0.7, 0.7, 2.1], gun: 'mg', pod: true, height: 4.6, tracer: 0xffd54f },
  lav25: { P: 0x4b5a36, zs: [-2.2, -0.75, 0.75, 2.2], gun: 'chain', height: 4.3, tracer: 0xffab40 },
  stryker: { P: 0x8d8f6a, zs: [-2.1, -0.7, 0.7, 2.1], gun: 'rws', slat: true, height: 4, tracer: 0xffd54f },
};

/**
 * The 8x8 armoured cars: APC and Missile APC (tan, small machine gun turret, plus a missile pod),
 * LAV-25 (green, two-man turret with a 25mm chain gun) and Stryker (slat armour cage and a remote
 * weapon station).
 */
function eightWheeler(model) {
  const u = unitBase();
  const c = EIGHT[model];
  const P = c.P;
  const PD = tone(P, 0.72);
  const PL = tone(P, 1.1);
  const k = kit(u, u.body, model + ':b');
  // boat-shaped lower hull between the wheels, wider upper hull with chamfered edges
  k.prism([[-2.85, 0.8], [-2.9, 1.55], [2.6, 1.55], [2.95, 1.25], [2.5, 0.8]], 2.3, PD, 0, 0, 0);
  k.prism([[-2.9, 1.45], [-2.8, 2.4], [1.1, 2.4], [2.45, 1.95], [2.95, 1.45]], 3.1, P, 0, 0, 0, { bevel: 0.22 });
  for (const s of [-1, 1]) {
    k.box(0.4, 0.07, 5.7, PD, s * 1.58, 1.42, 0); // mudguard line
    for (const z of c.zs) {
      k.box(0.3, 0.3, 0.2, 0x2e3134, s * 1.2, 0.75, z); // hubs' swing arms
      k.cyl(0.07, 0.7, 0x55595e, s * 1.22, 1.05, z + 0.25, { seg: 6, rx: 0.5 }); // shock absorbers
    }
    // side: door, vision blocks, firing ports, grab rail
    k.box(0.05, 0.72, 0.8, PL, s * 1.56, 1.86, 0.0);
    k.box(0.07, 0.08, 0.2, DARK, s * 1.58, 1.86, 0.25);
    for (const z of [-2.0, -1.2, 1.0]) {
      k.box(0.05, 0.13, 0.32, 0x6fb7e6, s * 1.47, 2.27, z, { rz: s * 0.78 });
      k.cyl(0.07, 0.08, 0x16181a, s * 1.56, 1.95, z, { axis: 'x', seg: 6 });
    }
    k.tube([[s * 1.58, 2.12, -2.6], [s * 1.64, 2.14, -2.5], [s * 1.64, 2.14, -0.7], [s * 1.58, 2.12, -0.6]], 0.025, DARK, { tension: 0.02 });
    lamp(k, s * 1.05, 1.72, 2.74, 0.17);
    k.box(0.46, 0.34, 0.05, PD, s * 1.05, 1.72, 2.86, { r: 0.02 }); // lamp guard frame
    k.box(0.2, 0.12, 0.06, AMBER, s * 1.38, 1.6, 2.86);
    k.box(0.16, 0.3, 0.06, RED, s * 1.3, 1.9, -2.92);
    shackle(k, s * 0.9, 1.1, 2.9, 1);
    shackle(k, s * 0.9, 1.1, -2.92, -1);
    mirror(k, s * 1.4, 2.3, 1.5, s, PD);
  }
  k.box(2.4, 0.06, 0.62, PD, 0, 1.72, 2.72, { rx: 0.78 }); // trim vane
  k.box(0.1, 0.1, 0.5, DARK, 0, 1.3, 2.9); // winch fairlead
  // nose deck: driver's windows, hatches
  for (const x of [-0.75, 0.75]) {
    k.box(0.7, 0.05, 0.36, GLASS, x, 2.2, 1.78, { rx: 0.32 });
    k.box(0.8, 0.06, 0.1, PD, x, 2.3, 1.56, { rx: 0.32 });
  }
  hatch(k, -0.75, 2.4, 0.75, 0.36, PD);
  k.box(0.9, 0.06, 1.0, PD, 0.75, 2.42, 0.75); // engine hatch with a grille
  louvres(k, 0.75, 2.46, 0.75, 0.7, 0.8, 5);
  // muffler along the right side, with a heat shield
  k.cyl(0.15, 1.7, 0x3a2c22, 1.68, 2.08, -1.3, { axis: 'z', seg: 8 });
  k.box(0.05, 0.3, 1.3, 0x55595e, 1.82, 2.08, -1.3);
  k.cyl(0.07, 0.4, 0x16181a, 1.68, 2.2, -2.2, { seg: 6, rz: -0.6 });
  // roof and tail: troop hatches, stowage, door, spare wheel
  for (const x of [-0.6, 0.6]) {
    k.box(0.85, 0.06, 1.1, PD, x, 2.43, -2.0);
    k.box(0.06, 0.07, 0.3, DARK, x, 2.48, -1.6);
  }
  k.box(1.1, 1.0, 0.07, PL, 0.5, 1.8, -2.92);
  k.box(0.08, 0.2, 0.05, DARK, 0.1, 1.8, -2.97);
  k.geo(wheelGeo(0.6, 0.45, 1, { rim: tone(P, 0.8) }), -0.85, 1.85, -3.08, { ry: PI / 2 });
  bedroll(k, 0, 2.6, -2.72, 2.2, 0.17);
  jerry(k, -1.25, 2.72, -1.0, tone(P, 0.8));
  jerry(k, -1.25, 2.72, -0.6, tone(P, 0.8));
  k.cyl(0.035, 1.5, 0x8d6e4a, -1.3, 2.33, 0.3, { axis: 'z', seg: 5 }); // shovel
  antenna(k, 1.25, 2.4, -2.6, 2.4);
  antenna(k, -1.25, 2.4, -2.6, 1.8);
  if (model === 'lav25') for (const x of [-0.8, 0.8]) {
    // propellers for swimming
    k.cyl(0.26, 0.3, DARK, x, 1.0, -2.95, { axis: 'z', seg: 8, open: true });
    k.box(0.44, 0.06, 0.06, STEEL, x, 1.0, -2.95);
    k.box(0.06, 0.44, 0.06, STEEL, x, 1.0, -2.95);
  }
  if (c.slat) {
    // slat armour: a cage of bars standing off the hull
    const bar = tone(P, 0.55);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 6; i++) k.box(0.04, 0.05, 5.6, bar, s * 2.0, 1.3 + i * 0.2, -0.1);
      for (let i = 0; i < 6; i++) {
        k.box(0.05, 1.1, 0.05, bar, s * 2.0, 1.8, -2.85 + i * 1.1);
        k.box(0.4, 0.05, 0.05, bar, s * 1.8, 2.25, -2.85 + i * 1.1);
      }
    }
    for (let i = 0; i < 6; i++) {
      k.box(4.0, 0.05, 0.04, bar, 0, 1.3 + i * 0.2, -3.2);
      if (i < 3) k.box(3.4, 0.05, 0.04, bar, 0, 1.3 + i * 0.2, 3.1);
    }
    for (const x of [-1.6, 0, 1.6]) {
      k.box(0.05, 0.5, 0.05, bar, x, 1.5, 3.1);
      k.box(0.05, 0.05, 0.3, bar, x, 1.4, 2.95);
    }
  }
  k.done();
  for (const z of c.zs) axle(u, u.body, 1.5, 0.64, z, 0.64, 0.5, { rim: tone(P, 0.8) });
  const t = turretAt(u, u.body, 2.4, -0.45);
  const g = kit(u, t, model + ':t');
  g.cyl(0.95, 0.12, PD, 0, 0.06, 0, { seg: 14 });
  if (c.gun === 'mg') {
    g.cyl(0.88, 0.62, P, 0, 0.42, 0, { r2: 0.6, seg: 10 }); // conical turret
    hatch(g, 0, 0.73, -0.1, 0.4, PD);
    g.box(0.5, 0.4, 0.4, PD, 0, 0.42, 0.7, { r: 0.06 });
    barrel(g, 0, 0.42, 0.8, 1.5, 0.06, GUN);
    g.cyl(0.1, 0.8, 0x2c2f33, 0, 0.42, 1.3, { axis: 'z', seg: 8 }); // cooling jacket
    g.cyl(0.04, 0.5, GUN, 0.22, 0.42, 1.0, { axis: 'z', seg: 5 }); // coax
    lamp(g, -0.5, 0.75, 0.5, 0.15);
    for (const s of [-1, 1]) smoke(g, s * 0.85, 0.4, -0.3, s, 2);
    muzzleAt(u, t, 0, 0.42, 2.35);
    if (c.pod) {
      // missile pod on a mast behind the hatch
      g.cyl(0.12, 0.6, DARK, 0, 0.9, -0.55, { seg: 8 });
      g.box(1.5, 0.9, 1.5, 0x37474f, 0, 1.5, -0.4, { r: 0.07, rx: -0.15 });
      for (const x of [-0.36, 0.36]) for (const y of [-0.2, 0.2]) {
        g.cyl(0.19, 0.1, 0x101112, x, 1.62 + y, 0.33, { axis: 'z', seg: 8, rx: -0.15 });
        g.cyl(0.13, 0.2, 0xd84315, x, 1.63 + y, 0.36, { axis: 'z', r2: 0.04, seg: 6, rx: -0.15 });
      }
      g.box(0.3, 0.3, 0.4, GUN, 0.95, 1.5, -0.2, { r: 0.04 }); // seeker
      g.cyl(0.1, 0.05, 0x6fb7e6, 0.95, 1.5, 0.02, { axis: 'z', seg: 8 });
      muzzleAt(u, t, 0, 1.65, 0.5, true);
    }
  } else if (c.gun === 'chain') {
    g.plan([[-0.6, 1.2], [0.6, 1.2], [1.05, 0.4], [1.05, -0.8], [0.7, -1.2], [-0.7, -1.2], [-1.05, -0.8], [-1.05, 0.4]], 0.8, P, 0, 0.1, 0, { bevel: 0.14 });
    g.box(0.6, 0.46, 0.4, PD, 0, 0.5, 1.15, { r: 0.06 });
    barrel(g, 0, 0.5, 1.3, 2.1, 0.08, GUN, { r2: 0.065 });
    for (let i = 0; i < 4; i++) g.cyl(0.105, 0.09, 0x16181a, 0, 0.5, 2.9 + i * 0.15, { axis: 'z', seg: 8 }); // fluted muzzle
    g.cyl(0.045, 0.6, GUN, 0.3, 0.5, 1.5, { axis: 'z', seg: 5 }); // coax
    g.box(0.44, 0.3, 0.5, PD, -0.5, 1.05, 0.5, { r: 0.05 }); // gunner's sight
    g.box(0.3, 0.16, 0.04, 0x6fb7e6, -0.5, 1.07, 0.76);
    hatch(g, 0.45, 0.9, -0.3, 0.34, PD);
    hatch(g, -0.45, 0.9, -0.4, 0.3, PD);
    g.cyl(0.04, 0.3, GUN, 0.45, 1.15, 0.1, { seg: 5 });
    mgun(g, 0.45, 1.34, -0.2, 1.2, { s: 0.8 });
    for (const s of [-1, 1]) smoke(g, s * 1.05, 0.5, 0.75, s, 4);
    g.tube([[-0.7, 0.5, -1.2], [-0.7, 0.5, -1.6], [0.7, 0.5, -1.6], [0.7, 0.5, -1.2]], 0.03, DARK, { tension: 0.02, seg: 12 });
    bedroll(g, 0, 0.62, -1.42, 1.2, 0.15);
    antenna(g, -0.8, 0.9, -0.9, 2.0);
    muzzleAt(u, t, 0, 0.5, 3.5);
  } else {
    // remote weapon station
    g.cyl(0.5, 0.2, PD, 0, 0.2, 0, { seg: 10 });
    g.cyl(0.16, 0.5, DARK, 0, 0.5, 0, { seg: 8 });
    g.box(0.5, 0.5, 0.7, 0x55584a, 0, 0.85, 0, { r: 0.05 }); // cradle
    mgun(g, 0.38, 0.9, -0.3, 2.0, { s: 1.25, ammo: false });
    g.box(0.36, 0.44, 0.7, 0x4b5a2a, 0.75, 0.82, 0.1, { r: 0.04 }); // ammo box
    g.box(0.46, 0.5, 0.5, 0x3a3d40, -0.5, 0.95, 0.15, { r: 0.05 }); // sensor head
    g.cyl(0.13, 0.06, 0x6fb7e6, -0.6, 1.02, 0.42, { axis: 'z', seg: 8 });
    g.cyl(0.07, 0.06, 0xb71c1c, -0.4, 0.86, 0.42, { axis: 'z', seg: 6 });
    for (const s of [-1, 1]) smoke(g, s * 0.5, 0.3, -0.45, s, 2);
    hatch(g, 0, 0.0, -1.0, 0.32, PD);
    muzzleAt(u, t, 0.38, 0.93, 1.75);
  }
  g.done();
  u.height = c.height;
  u.tracer = c.tracer;
  return u;
}

// ------------------------------------------------------------------ MRAP

/** MRAP: a tall mine-proof truck: V-shaped hull, armoured cab windows, six big wheels, a remote gun on the roof. */
function mrap() {
  const u = unitBase();
  const P = 0xb59b6d;
  const PD = 0x8d7b5a;
  const PL = tone(P, 1.08);
  const k = kit(u, u.body, 'mrap:b');
  k.slab(3.0, 1.0, 6.0, PD, 0, 1.4, 0, { bw: 0.42 }); // the V hull
  k.box(1.0, 0.3, 5.4, 0x2e3134, 0, 0.85, 0);
  k.slab(3.2, 1.9, 3.8, P, 0, 2.85, -0.9, { tw: 0.9, td: 0.94 }); // crew box
  k.slab(3.0, 1.15, 2.1, P, 0, 2.47, 2.05, { tw: 0.86, td: 0.9, tz: -0.08 }); // engine hood
  k.box(2.9, 0.06, 3.4, PD, 0, 3.82, -0.9); // roof plate
  // windscreen and side windows: thick glass in heavy frames
  for (const x of [-0.72, 0.72]) {
    k.box(1.3, 0.8, 0.1, PD, x, 3.15, 1.0, { rx: -0.1 });
    k.box(1.1, 0.6, 0.1, GLASS, x, 3.15, 1.04, { rx: -0.1 });
  }
  for (const s of [-1, 1]) {
    for (const z of [0.2, -0.9, -2.0]) {
      k.box(0.1, 0.62, 0.8, PD, s * 1.56, 3.2, z, { rz: s * 0.085 });
      k.box(0.1, 0.44, 0.62, GLASS, s * 1.6, 3.2, z, { rz: s * 0.085 });
      k.cyl(0.06, 0.08, 0x16181a, s * 1.63, 2.7, z, { axis: 'x', seg: 6 }); // gun ports
    }
    k.box(0.06, 1.3, 1.0, PL, s * 1.62, 2.6, 0.2, { rz: s * 0.085 }); // cab door
    k.box(0.08, 0.08, 0.24, DARK, s * 1.66, 2.6, -0.1);
    for (const y of [1.2, 1.6]) k.box(0.4, 0.06, 0.8, DARK, s * 1.7, y, 0.2); // steps
    k.box(0.5, 0.6, 1.7, tone(P, 0.85), s * 1.5, 1.75, -1.6, { r: 0.04 }); // side lockers
    bolts(k, [s * 1.77, 1.95, -2.3], [s * 1.77, 1.95, -0.9], 4, DARK);
    k.box(0.75, 0.08, 1.6, PD, s * 1.7, 1.62, 2.0); // front wings
    k.box(0.75, 0.08, 0.5, PD, s * 1.7, 1.5, 2.95, { rx: 0.5 });
    k.box(0.75, 0.08, 3.4, PD, s * 1.7, 1.62, -1.0); // rear wings
    lamp(k, s * 1.05, 2.2, 3.1, 0.2);
    k.box(0.2, 0.14, 0.06, AMBER, s * 1.3, 1.9, 3.1);
    k.box(0.16, 0.36, 0.06, RED, s * 1.3, 2.3, -2.85);
    mirror(k, s * 1.5, 3.2, 1.1, s, PD);
    shackle(k, s * 1.0, 1.25, 3.42, 1);
    antenna(k, s * 1.35, 3.85, -2.5, 2.2);
    k.cyl(0.06, 0.6, DARK, s * 1.2, 4.1, 0.8, { seg: 6 }); // jammer aerials
    k.cyl(0.1, 0.3, 0x3a3d40, s * 1.2, 4.3, 0.8, { seg: 6 });
  }
  grille(k, 0, 2.3, 3.1, 1.5, 0.9, 5, PD, { h: true });
  k.box(3.3, 0.4, 0.3, DARK, 0, 1.3, 3.25, { r: 0.05 }); // bumper
  k.cyl(0.18, 0.7, STEEL, 0, 1.36, 3.42, { axis: 'x', seg: 8 }); // winch
  louvres(k, 0, 3.07, 2.2, 1.6, 1.0, 5);
  k.cyl(0.11, 1.6, 0x2a2c30, 1.66, 3.0, 1.2, { seg: 8 }); // exhaust stack
  k.cyl(0.14, 0.7, 0x55595e, 1.66, 3.0, 1.2, { seg: 8 });
  // tail: door, ladder, spare wheel, cans
  k.box(1.2, 1.5, 0.08, PL, 0.5, 2.7, -2.82);
  k.box(0.6, 0.34, 0.06, GLASS, 0.5, 3.15, -2.86);
  k.box(0.08, 0.24, 0.06, DARK, 0.05, 2.7, -2.88);
  for (const x of [0.2, 0.8]) k.box(0.06, 1.0, 0.06, DARK, x, 1.6, -3.1);
  for (const y of [1.3, 1.7]) k.box(0.7, 0.06, 0.2, DARK, 0.5, y, -3.1);
  k.geo(wheelGeo(0.78, 0.5, 1, { rim: PD }), -0.85, 2.6, -3.0, { ry: PI / 2 });
  jerry(k, -1.35, 4.15, -1.6, tone(P, 0.8));
  jerry(k, -1.35, 4.15, -1.2, tone(P, 0.8));
  crate(k, 1.0, 4.03, -2.0, 0.9, 0.36, 1.2, tone(P, 0.85));
  bedroll(k, 0, 4.0, -2.55, 2.4, 0.16);
  k.cyl(0.6, 0.12, DARK, 0, 3.9, -1.0, { seg: 12 }); // turret ring
  k.done();
  for (const z of [-2, 0, 2]) axle(u, u.body, 1.68, 0.78, z, 0.78, 0.6, { rim: PD });
  const t = turretAt(u, u.body, 3.9, -1.0);
  const g = kit(u, t, 'mrap:t');
  g.cyl(0.5, 0.2, PD, 0, 0.16, 0, { seg: 10 });
  g.cyl(0.14, 0.5, DARK, 0, 0.45, 0, { seg: 8 });
  g.box(0.5, 0.5, 0.7, 0x55584a, 0, 0.8, 0, { r: 0.05 });
  mgun(g, 0.38, 0.85, -0.3, 2.3, { s: 1.3, ammo: false });
  g.box(0.36, 0.44, 0.7, 0x4b5a2a, 0.75, 0.78, 0.1, { r: 0.04 });
  g.box(0.46, 0.5, 0.5, 0x3a3d40, -0.5, 0.9, 0.15, { r: 0.05 });
  g.cyl(0.13, 0.06, 0x6fb7e6, -0.6, 0.97, 0.42, { axis: 'z', seg: 8 });
  for (const s of [-1, 1]) g.box(0.06, 0.6, 0.9, PD, s * 1.0, 0.7, 0, { ry: s * -0.15 }); // side shields
  g.done();
  muzzleAt(u, t, 0.38, 0.88, 2.05);
  u.height = 5.0;
  u.tracer = 0xff9100;
  return u;
}

export const VEHICLE_UNITS = {
  ...TANK_UNITS,
  ...MECH_UNITS,
  ...MORE_UNITS,
  ...BOT_UNITS,
  ...TRAIN_UNITS,
  ...AIR_UNITS,
  apc: eightWheeler, missileapc: eightWheeler, lav25: eightWheeler, stryker: eightWheeler, mrap,
  jeep, gunjeep: jeep,
  humvee, humvee2: humvee, humvee3: humvee, afhumvee: humvee, afhumveetow: humvee, afhumveemissile: humvee,
};
