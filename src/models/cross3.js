// Tower models: crosspath forms, batch 3 (built with the vehicle kit in ../vehicles.js).
// In here: Recon Base (zedRecon), Elite (phaserElite), Businessman (cowboyBusinessman), Mechanic
// (engineerMechanic), Surveyor (ghostSurveyor), Lightbeamer (plasmaLightbeamer).
// CROSS maps a crosspath root tower key to a builder (a, b) => model, where a is the Top path tier
// and b the Bottom path tier; ../models.js uses it before the older CROSS_MODELS in newmodels/e.js.
// Every combo gets its own look: each Top tier and each Bottom tier adds its own pieces.
// The people keep the blocky body from makeHumanoid (kit.js); the shared gear and the spaces it
// works in are in people1.js. The Recon Base is a machine like the Zed hangar (machines2.js).
// Moving parts: the Recon Base radar dish and roof vents turn; the Surveyor's drones hover with
// spinning rotors (and its radar dish turns); the Mechanic's Chain Barrel and Forcefield ring, the
// Lightbeamer's Degradation ring and Prototype halo, the Elite's accelerator ring all spin
// (spinner + h.idleSpin; firing spins them faster).

import * as THREE from 'three';
import { antenna, barrel, bolts, crate, glowMat, grille, hatch, kit, lamp, louvres, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { makeThing } from './bits.js';
import { makeUnit } from './units.js';
import {
  GOLD, GUNMETAL, INK, LEATHER, STEEL, UP, aimLong, band, belt, cap, collar, dome, fist, goggles, hair, headset,
  kneePad, muzzle, own, pistol, pouch, shades, shardOf, vest, wear,
} from './people1.js';
import { shoulderPads } from './people2.js';
import { beamGun, cellPack, chestPlate, visorHelmet } from './people4.js';
import { feet, glassMat, hands } from './people5.js';
import { hardHat } from './people6.js';
import { arc, coil } from './people8.js';
import { cuffs, fedora, shoes, suitJacket } from './people10.js';
import { dish } from './machines1.js';
import { bag, drum, flagPole } from './machines2.js';
import { crystal, spinner } from './machines5.js';

const PI = Math.PI;
const HAZARD = 0xf2c12e;
const SANDBAG = 0xb59a72;
const CASH = 0x2e7d32;

/** The purple Dimension Shard badge every alternate form wears (torso space). */
function shard(h, t, x = -0.55, y = 0.62, z = 0.62) {
  t.box(0.34, 0.34, 0.06, shardOf(h), x, y, z);
  t.box(0.42, 0.42, 0.04, INK, x, y, z - 0.02);
}

// ------------------------------------------------------------------ Recon Base

/** Parks a summoned unit's model on `u.body`, scaled to fit inside `len` x `wide`. */
function parkFit(u, model, count, len, wide, x, y, z, ry = 0) {
  const v = makeUnit(model, count);
  v.root.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(v.root).getSize(new THREE.Vector3());
  const s = Math.min(len / Math.max(0.01, size.z), wide / Math.max(0.01, size.x));
  v.root.scale.setScalar(s);
  v.root.position.set(x, y, z);
  v.root.rotation.y = ry;
  u.body.add(v.root);
  u.mats.push(...v.mats);
  return v;
}

/**
 * Recon Base: a camouflaged block garage with an open door, a radar dish turning on the roof
 * and its vehicle parked inside, with the current Operative squad standing guard out front.
 * Top path: Lv 1 roof vents (they turn) and wall grilles, Lv 2 a wider door and a Ghoul ATV,
 * Lv 3 a missile launcher on the roof and a Ghoul M2, Lv 4 a tank, concrete barriers and a
 * camouflage net, Lv 5 Alien Warfare: dark walls, green light strips, a crystal antenna and a
 * Scyther tank. Bottom path: Lv 1 a flag, Lv 2 ammo crates and a weapon rack, Lv 3 a sandbag
 * wall and a dark SAS flag, Lv 4 a black Fireteam Solemn flag and a searchlight, Lv 5 a pink
 * Bliss of Finality beacon. The squad grows along the Bottom path.
 */
function makeRecon(a, b) {
  const u = makeThing();
  const alien = a >= 5;
  const bliss = b >= 5;
  const k = kit(u, u.body, `x3recon${a}${b}`);
  const wall = alien ? 0x2b343a : 0x6d7b5b;
  const roofC = alien ? 0x1c2328 : 0x4b5320;
  const green = alien ? glowMat(u, 0x00e676) : null;
  // the yard: a concrete pad with a kerb, a darker apron and hazard stripes at the door
  k.slab(4.2, 0.3, 4.2, 0x8d8d8d, 0, 0.15, 0, { tw: 0.97, td: 0.97 });
  k.box(3.2, 0.03, 1.7, 0x6f6f6f, 0, 0.31, 1.2);
  for (let i = 0; i < 8; i++) k.box(0.4, 0.03, 0.18, i % 2 ? 0x1a1a1a : HAZARD, -1.4 + i * 0.4, 0.32, 0.45);
  // the garage: hollow, with block walls, an open door and a flat roof
  const gw = 3.8;
  const gh = 2.6;
  const z0 = -2.0;
  const z1 = 0.3;
  const gz = (z0 + z1) / 2;
  const gd = z1 - z0;
  const yc = 0.3 + gh / 2;
  const dw = a >= 2 ? 3.0 : 2.3;
  const dh = 2.0;
  k.box(gw, gh, 0.22, wall, 0, yc, z0 + 0.11);
  for (const s of [-1, 1]) k.box(0.24, gh, gd, wall, s * (gw / 2 - 0.12), yc, gz);
  const pw = (gw - dw) / 2;
  for (const s of [-1, 1]) k.box(pw, gh, 0.24, wall, s * (dw / 2 + pw / 2), yc, z1 - 0.12);
  k.box(dw, gh - dh, 0.24, wall, 0, 0.3 + dh + (gh - dh) / 2, z1 - 0.12);
  k.box(gw - 0.5, 0.02, gd - 0.3, 0x4a4a4a, 0, 0.32, gz); // garage floor
  k.box(gw - 0.5, 0.04, gd - 0.3, tone(wall, 0.55), 0, 0.3 + gh - 0.03, gz); // ceiling
  k.box(1.2, 0.06, 0.12, glowMat(u, 0xfff3b0), 0, 0.3 + gh - 0.08, gz); // strip light
  // inside: a work bench and a tool board on the back wall
  k.box(1.4, 0.08, 0.5, 0x6d4c41, -0.9, 1.15, z0 + 0.5);
  for (const s of [-1, 1]) k.box(0.08, 0.85, 0.45, INK, -0.9 + s * 0.62, 0.72, z0 + 0.5);
  k.box(1.3, 0.8, 0.04, 0x8d6e63, -0.9, 1.9, z0 + 0.24);
  for (let i = 0; i < 4; i++) k.box(0.06, 0.4 + (i % 2) * 0.15, 0.04, STEEL, -1.35 + i * 0.3, 1.9, z0 + 0.27);
  drum(k, 1.35, 0.3, z0 + 0.5, alien ? 0x37474f : 0x4b5320, HAZARD);
  // outside: a plinth, mortar lines, camouflage patches and a door frame
  for (const s of [-1, 1]) {
    k.box(0.05, 0.3, gd + 0.02, tone(wall, 0.7), s * (gw / 2 + 0.01), 0.45, gz);
    for (let i = 1; i < 5; i++) k.box(0.04, 0.03, gd, tone(wall, 0.85), s * (gw / 2 + 0.01), 0.3 + i * 0.5, gz);
    if (!alien) {
      for (const [y, z, w, hh] of [[1.3, -1.4, 0.9, 0.6], [2.2, -0.3, 0.7, 0.4], [0.9, -0.2, 0.5, 0.5]]) {
        k.box(0.04, hh, w, tone(wall, 0.72), s * (gw / 2 + 0.02), y, z, { r: 0.015 });
      }
      k.box(0.04, 0.5, 0.6, 0x8d8a5b, s * (gw / 2 + 0.03), 1.8, -1.0, { r: 0.015 });
    }
  }
  for (const s of [-1, 1]) k.box(0.12, dh, 0.1, alien ? 0x111111 : 0x3e4a2e, s * (dw / 2 + 0.05), 0.3 + dh / 2, z1 + 0.04); // door frame
  k.cyl(0.2, dw + 0.15, tone(wall, 0.6), 0, 0.3 + dh + 0.1, z1 + 0.12, { axis: 'x', seg: 10 }); // rolled-up door
  if (alien) {
    for (const s of [-1, 1]) k.box(0.06, dh, 0.04, green, s * (dw / 2 + 0.12), 0.3 + dh / 2, z1 + 0.06);
    k.box(dw, 0.06, 0.04, green, 0, 0.3 + dh + 0.36, z1 + 0.02);
    for (const s of [-1, 1]) k.box(0.04, 0.06, gd - 0.4, green, s * (gw / 2 + 0.03), 1.6, gz);
  }
  // a name board over the door, a lamp and a number
  k.box(1.3, 0.34, 0.06, alien ? 0x111111 : 0x263238, 0, 0.3 + gh - 0.22, z1 + 0.04);
  k.box(1.0, 0.1, 0.03, alien ? green : glowMat(u, 0xffc400), 0, 0.3 + gh - 0.22, z1 + 0.08);
  lamp(k, 0, 0.3 + dh + 0.36, z1 + 0.06, 0.1, 0xfff3b0);
  // the roof: a slab with a lip, a hatch and a ladder down the side
  const ry = 0.3 + gh;
  k.slab(gw + 0.3, 0.24, gd + 0.3, roofC, 0, ry + 0.12, gz, { tw: 0.97, td: 0.95 });
  k.box(gw + 0.3, 0.14, 0.08, tone(roofC, 0.8), 0, ry + 0.3, z1 + 0.14);
  hatch(k, 0.8, ry + 0.24, -0.4, 0.26, tone(roofC, 1.15));
  for (const lz of [-1.75, -1.45]) k.cyl(0.035, gh + 0.4, STEEL, gw / 2 + 0.1, 0.3 + (gh + 0.4) / 2, lz, { seg: 6 });
  for (let i = 0; i < 6; i++) k.box(0.04, 0.04, 0.32, STEEL, gw / 2 + 0.1, 0.6 + i * 0.45, -1.6);
  // the radar mast at the back corner
  k.cyl(0.08, 1.3, STEEL, -1.4, ry + 0.9, -1.6, { seg: 8 });
  k.box(0.4, 0.3, 0.4, INK, -1.4, ry + 0.4, -1.6, { r: 0.04 });
  for (const s of [-1, 1]) k.tube([[-1.4, ry + 1.2, -1.6], [-1.4 + s * 0.5, ry + 0.25, -1.6 - 0.2]], 0.025, STEEL, { sides: 4, seg: 3 });
  antenna(k, 1.6, ry + 0.25, -1.75, 1.8);
  if (a >= 1) {
    // Garage Ventilation: louvred grilles on the front and roof vent turbines (they turn)
    for (const s of [-1, 1]) grille(k, s * (dw / 2 + pw / 2), 1.7, z1 + 0.02, pw * 0.6, 0.5, 4, alien ? 0x37474f : 0x5d6b4b, { h: true });
    louvres(k, -0.4, ry + 0.27, -1.4, 0.9, 0.7, 5, INK);
    for (const x of [-0.2, 0.5]) k.cyl(0.24, 0.2, STEEL, x, ry + 0.34, -0.9, { seg: 12 });
  }
  if (a >= 3) {
    // Ballistic Missiles: a tilted launcher box of six missiles on the roof
    const lx = -0.6;
    const lz = -0.2;
    k.box(0.9, 0.2, 0.9, INK, lx, ry + 0.35, lz, { r: 0.04 });
    k.box(1.0, 0.65, 1.3, alien ? 0x37474f : 0x55613f, lx, ry + 0.85, lz, { rx: -0.45, r: 0.05 });
    for (let i = 0; i < 6; i++) {
      const mx = lx - 0.3 + (i % 3) * 0.3;
      const my = (i < 3 ? -0.15 : 0.15);
      k.cyl(0.11, 0.14, alien ? green : 0xc62828, mx, ry + 0.85 + my * Math.cos(0.45) + 0.29, lz + 0.62 + my * 0.43, { axis: 'z', seg: 10, rx: -0.45 });
    }
  }
  if (a >= 4) {
    // Frontline Forces: a camouflage net over the roof and concrete barriers on the apron
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 3; j++) k.box(0.7, 0.05, 0.6, [0x556b2f, 0x6b7d3a, 0x4b5320][(i + j) % 3], -1.5 + i * 0.72, ry + 0.3 + ((i + j) % 2) * 0.05, -1.6 + j * 0.55, { ry: (i - j) * 0.2, r: 0.02 });
    }
    for (const s of [-1, 1]) {
      k.slab(0.5, 0.55, 0.9, 0xbdbdbd, s * 1.75, 0.58, 1.55, { tw: 0.4 });
      k.box(0.52, 0.06, 0.92, HAZARD, s * 1.75, 0.5, 1.55);
    }
  }
  if (alien) {
    // Alien Warfare: a crystal antenna on the roof
    k.cyl(0.35, 0.3, 0x263238, 1.2, ry + 0.4, 0.0, { seg: 8, r2: 0.25 });
    crystal(k, 1.2, ry + 0.55, 0.0, 0.2, 1.1, green);
  }
  if (b >= 1) flagPole(k, 1.95, 0.3, 1.9, 2.6, b >= 4 ? 0x111111 : b >= 3 ? 0x37474f : 0x2e7d32, b >= 4 ? 0xc62828 : b >= 3 ? 0xeceff1 : null);
  if (b >= 2) {
    // More Recruits: ammo crates and a rifle rack by the door
    crate(k, -1.65, 0.48, 1.7, 0.6, 0.36, 0.45, 0x4b5320);
    crate(k, -1.65, 0.84, 1.7, 0.5, 0.32, 0.4, 0x556b2f);
    k.box(0.08, 0.9, 0.7, 0x5d4037, -1.95, 0.8, 0.85);
    for (let i = 0; i < 3; i++) k.box(0.06, 0.9, 0.08, INK, -1.9, 0.82, 0.62 + i * 0.22, { rz: 0.1 });
  }
  if (b >= 3) {
    // Special Air Service: a sandbag wall in front of the squad
    for (let i = 0; i < 4; i++) {
      bag(k, 0.55, 0.36, 0.55 + i * 0.5, 0.3, 2.0, SANDBAG);
      if (i < 3) bag(k, 0.5, 0.34, 0.8 + i * 0.5, 0.62, 2.0, tone(SANDBAG, 1.08));
    }
  }
  if (b >= 4) {
    // Fireteam Solemn: a searchlight on the roof
    k.cyl(0.06, 0.6, STEEL, 1.5, ry + 0.55, -0.2, { seg: 6 });
    k.cyl(0.24, 0.4, INK, 1.5, ry + 0.95, -0.1, { axis: 'z', seg: 12, rx: -0.3 });
    k.cyl(0.2, 0.03, glowMat(u, 0xfff8e1), 1.5, ry + 1.0, 0.1, { axis: 'z', seg: 12, rx: -0.3 });
  }
  if (bliss) {
    // Bliss of Finality: a pink beacon over the door
    k.cyl(0.25, 0.3, INK, -1.4, ry + 0.4, 0.0, { seg: 10 });
    k.ball(0.28, glowMat(u, 0xff4081), -1.4, ry + 0.8, 0.0, { seg: 12, rows: 8 });
  }
  k.done();
  // the radar dish turns, and the vent turbines and the Bliss ring with it
  const sp = spinner(u, u.body, -1.4, ry + 1.55, -1.6);
  dish(u, sp, `x3recon:dish${alien ? 'A' : ''}`, 0, 0.05, 0, 0.55, alien ? 0x455a64 : 0xbdbdbd, glowMat(u, alien ? 0x00e676 : 0xff1744));
  if (a >= 1) {
    for (const x of [-0.2, 0.5]) {
      const v = spinner(u, u.body, x, ry + 0.44, -0.9);
      const vk = kit(u, v, 'x3recon:vent');
      vk.ball(0.26, STEEL, 0, 0.0, 0, { sy: 0.75, seg: 12, rows: 6 });
      for (let i = 0; i < 8; i++) vk.box(0.03, 0.3, 0.12, tone(STEEL, 0.7), Math.sin((i / 8) * PI * 2) * 0.25, 0.02, Math.cos((i / 8) * PI * 2) * 0.25, { ry: (i / 8) * PI * 2 + 0.5 });
      vk.done();
    }
  }
  if (bliss) {
    const r = spinner(u, u.body, -1.4, ry + 0.8, 0.0);
    const rk = kit(u, r, 'x3recon:bliss');
    rk.torus(0.5, 0.04, glowMat(u, 0xff80ab), 0, 0, 0, { rx: PI / 2 + 0.3, seg: 20 });
    rk.done();
  }
  u.idleSpin = 1.4;
  // the vehicle inside, the squad out front
  const ride = [null, null, b >= 3 ? 'rbPhantom' : 'rbGhoul', 'rbGhoul2', 'rbTank', 'rbScyther'][a];
  if (ride) parkFit(u, ride, 1, gd + 0.4, dw - 0.3, 0, 0.32, gz + 0.5);
  const team = ['rbOperative', 'rbOperative2', 'rbOperative2', 'rbPrivate', 'rbSolemn', 'rbSolemn'][b];
  const n = [1, 1, 2, 3, 4, 4][b];
  const v = makeUnit(team, n);
  v.root.scale.setScalar(0.42);
  v.root.position.set(ride ? 1.25 : 0.2, 0.3, ride ? 1.35 : 0.95);
  u.body.add(v.root);
  u.mats.push(...v.mats);
  u.height = 4;
  return u;
}

// ------------------------------------------------------------------ Elite

/**
 * Elite (alternate Phaser form): an armoured plasma trooper with a visor helmet and a plasma
 * gun. Top path: Lv 1 Ventilation: heat-sink fins and exhausts on the back, Lv 2 Armor Plating:
 * a chest plate, shoulder pads and thigh armour, Lv 3 Plasma Rifle: a longer rifle fed by a hose,
 * Lv 4 Particle Accelerator: magenta plasma, coils down the barrel and a ring on the back that
 * turns. Bottom path: Lv 1 Cyborg Enhancements: a steel right arm and an eye implant, Lv 2 a
 * green bombardment launcher under the barrel, Lv 3 Master Design: a radiator on the gun and gold
 * trim, Lv 4 Immolator Overcharge: orange-red plasma and a glass immolator tank.
 */
function makeElite(a, b) {
  const accel = a >= 4;
  const immo = b >= 4;
  const plasmaC = immo ? 0xff3d00 : accel ? 0xe040fb : 0x00e5ff;
  const armor = immo ? 0x4e342e : accel ? 0x37474f : a >= 2 ? 0x455a64 : 0x546e7a;
  const h = makeHumanoid({ skin: 0x8d5524, shirt: 0x263238, pants: 0x1c262b, arms: 0x37474f, face: 'soldier' });
  const key = `x3elite${a}${b}`;
  const plasma = glowMat(h, plasmaC);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  visorHelmet(hd, armor, plasma, { crest: tone(armor, 0.75) });
  for (const s of [-1, 1]) hd.box(0.08, 0.3, 0.5, tone(armor, 0.7), s * 0.2, 1.42, -0.1, { r: 0.03, rz: s * 0.3 }); // elite fins
  if (b >= 1) {
    // Cyborg Enhancements: an eye implant on the right of the visor
    hd.cyl(0.16, 0.24, GUNMETAL, -0.5, 0.78, 0.66, { axis: 'z', seg: 12 });
    hd.cyl(0.1, 0.04, glowMat(h, 0xff1744), -0.5, 0.78, 0.79, { axis: 'z', seg: 10 });
    hd.tube([[-0.5, 0.78, 0.55], [-0.75, 0.6, 0.2], [-0.72, 0.3, -0.3]], 0.03, INK, { sides: 4 });
  }
  // armour: a light plate with a harness, then full plating
  if (a >= 2) {
    chestPlate(t, armor, plasma, { r: 0.28 });
    shoulderPads(t, tone(armor, 1.1), 0.64);
    for (const s of [-1, 1]) t.box(0.3, 0.05, 0.05, plasma, s * 1.45, 1.05, 0.45);
    shard(h, t, -0.62, 0.72, 0.64);
  } else {
    for (const s of [-1, 1]) t.box(0.24, 2.0, 0.08, INK, s * 0.5, 0.05, 0.55); // harness straps
    t.box(1.5, 1.0, 0.16, armor, 0, 0.35, 0.56, { r: 0.08 });
    t.box(1.0, 0.05, 0.04, plasma, 0, 0.2, 0.65);
    for (const x of [-0.45, 0.45]) pouch(t, x, -0.35, 0.52, 0.36, 0.36, 0x37474f, 0.16);
    shard(h, t, -0.5, 0.65, 0.66);
  }
  belt(t, INK, plasma);
  // the back: a cell pack, with heat sinks from Ventilation
  cellPack(t, 0x263238, plasma, a >= 3 ? 3 : 2, { w: 1.4 });
  if (a >= 1) {
    for (let i = 0; i < 5; i++) t.box(1.3, 0.04, 0.35, STEEL, 0, 0.95 + i * 0.09, -0.9);
    for (const s of [-1, 1]) {
      t.cyl(0.12, 0.6, GUNMETAL, s * 0.55, 1.2, -1.15, { seg: 10, rx: -0.3 });
      t.cyl(0.09, 0.04, plasma, s * 0.55, 1.5, -1.25, { seg: 10, rx: -0.3 });
    }
  }
  if (a >= 3) t.tube([[0.5, -0.5, -1.0], [1.15, -0.8, -0.4], [1.2, -0.9, 0.4]], 0.07, INK, { seg: 10, sides: 6 }); // feed hose
  if (immo) {
    // the immolator tank: a glass canister of orange plasma in a cage
    const z = -1.55;
    t.cyl(0.26, 1.3, glassMat(h, 0xff8a65, 0.5), 0, 0.1, z, { seg: 14 });
    t.cyl(0.14, 1.1, plasma, 0, 0.1, z, { seg: 10 });
    for (const y of [-0.6, 0.8]) t.cyl(0.3, 0.14, GUNMETAL, 0, y, z, { seg: 14 });
    for (let i = 0; i < 4; i++) t.box(0.04, 1.3, 0.04, INK, Math.sin(i * 1.57) * 0.28, 0.1, z + Math.cos(i * 1.57) * 0.28);
  }
  hd.done();
  t.done();
  if (accel) {
    // the accelerator ring on the back turns
    const r = spinner(h, h.torso, 0, 0.1, -1.45, 'z');
    const rk = wear(h, r, `${key}:ring`);
    rk.torus(0.85, 0.07, plasma, 0, 0, 0, { rx: PI / 2, seg: 24 });
    for (let i = 0; i < 6; i++) rk.box(0.18, 0.2, 0.18, GUNMETAL, Math.sin((i / 6) * PI * 2) * 0.85, 0, Math.cos((i / 6) * PI * 2) * 0.85, { r: 0.03 });
    rk.done();
    h.idleSpin = 2;
  }
  feet(h, key, 0x111111, (k) => {
    k.box(0.86, 0.5, 0.2, armor, 0, -0.95, 0.54, { r: 0.08 }); // knee guard
    if (a >= 2) k.box(1.1, 0.7, 1.1, armor, 0, -0.35, 0.02, { r: 0.12 }); // thigh armour
    k.box(0.06, 0.4, 0.04, plasma, 0.5, -0.6, 0.3);
  });
  hands(h, key, 0x111111, tone(armor, 0.85), (k, s) => {
    if (b >= 1 && s < 0) {
      // the cyborg arm: steel plates, pistons and glowing joint lines
      k.box(1.12, 0.75, 1.12, STEEL, 0, -0.35, 0, { r: 0.1 });
      k.box(1.1, 0.6, 1.1, tone(STEEL, 0.8), 0, -1.15, 0, { r: 0.08 });
      for (const y of [-0.78, -0.82]) k.box(1.14, 0.03, 1.14, glowMat(h, 0xff1744), 0, y, 0);
      for (const x of [-0.3, 0.3]) k.cyl(0.06, 0.6, INK, x, -1.0, 0.58, { seg: 6 });
    } else if (a >= 2) k.box(1.12, 0.6, 1.12, armor, 0, -0.3, 0, { r: 0.12 });
  });
  // the plasma gun: a carbine, a long rifle from Plasma Rifle
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const len = a >= 3 || immo ? 2.4 : 1.9;
  const [y, z] = beamGun(gk, {
    len, body: immo ? 0x3e2723 : 0x263238, trim: b >= 3 ? GOLD : 0x455a64, glow: plasma,
    rings: accel ? 4 : a >= 3 ? 3 : 2, scope: a >= 3 || b >= 3, fat: immo ? 1.3 : 1,
  });
  gk.box(0.5, 0.55, 0.6, 0x37474f, 0, -0.75, UP - 0.1, { r: 0.08 }); // plasma cell housing
  gk.box(0.52, 0.3, 0.3, plasma, 0, -0.75, UP - 0.2);
  if (accel) for (let i = 0; i < 3; i++) gk.torus(0.25, 0.05, plasma, 0, -1.25 - i * 0.32, UP, { rx: PI / 2, seg: 14 });
  if (b >= 2) {
    // Plasma Bombardment: a fat green launcher tube under the barrel
    gk.cyl(0.15, 0.9, GUNMETAL, 0, -1.25, UP - 0.32, { seg: 12 });
    gk.cyl(0.11, 0.06, glowMat(h, 0x76ff03), 0, -1.72, UP - 0.32, { seg: 10 });
    gk.box(0.12, 0.3, 0.2, INK, 0, -0.9, UP - 0.2);
  }
  if (b >= 3) {
    // Master Design: a finned radiator on the gun, so it never overheats
    for (let i = 0; i < 6; i++) gk.box(0.6, 0.05, 0.36, STEEL, 0, -0.25 - i * 0.1, UP + 0.32);
    gk.box(0.12, 0.6, 0.2, GOLD, 0.24, -0.3, UP);
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.beam = plasmaC;
  h.tracer = plasmaC;
  h.tracerWidth = immo || accel ? 0.4 : 0.3;
  return own(h);
}

// ------------------------------------------------------------------ Businessman

/** A case in the left hand (gun space, the arm down): a folio, then a hard case; straps, cash and gold from the Top path. */
function attache(k, a, h) {
  if (a < 1) {
    // a slim leather folio
    k.box(0.22, 0.85, 1.1, 0x5d4037, 0, -0.62, 0, { r: 0.04 });
    k.torus(0.15, 0.035, INK, 0, -0.17, 0, { ry: PI / 2, seg: 10, arc: PI });
    k.box(0.24, 0.08, 1.12, tone(0x5d4037, 0.75), 0, -0.6, 0);
    return;
  }
  const col = a >= 4 ? GOLD : 0x3e2723;
  const trim = a >= 4 ? 0xfff8e1 : 0xc9a227;
  k.box(0.5, 1.0, 1.4, col, 0, -0.72, 0, { r: 0.06 });
  k.box(0.54, 0.06, 1.44, trim, 0, -0.24, 0);
  k.torus(0.18, 0.04, INK, 0, -0.15, 0, { ry: PI / 2, seg: 10, arc: PI });
  for (const z of [-0.4, 0.4]) k.box(0.42, 0.14, 0.18, trim, 0, -0.27, z, { r: 0.02 });
  for (const y of [-0.24, -1.2]) for (const z of [-0.68, 0.68]) k.box(0.42, 0.1, 0.1, trim, 0, y, z);
  k.box(0.4, 0.04, 1.42, tone(col, 0.7), 0, -0.4, 0);
  if (a >= 2) for (const z of [-0.35, 0.35]) k.box(0.56, 1.02, 0.12, 0x212121, 0, -0.72, z); // Strapped for Cash
  if (a >= 3) for (const z of [-0.45, -0.1, 0.25]) k.box(0.3, 0.14, 0.3, glowMat(h, 0x69f0ae, 0.5), 0, -0.3, z + 0.1, { rz: 0.2 }); // cash poking out
}

/**
 * Businessman (alternate Cowboy form): a suit, a briefcase and a pistol. Top path: Lv 1 a hard
 * leather briefcase, Lv 2 a fedora, pinstripes and straps round the case, Lv 3 a gold watch, a
 * waistcoat and glowing cash in the case, Lv 4 Sleazy Operation: a purple suit, a gold chain,
 * a gold case and a gold pistol. Bottom path: Lv 1 AP rounds (red-tipped spare mags), Lv 2
 * shades and a shoulder holster, Lv 3 Discount Seeker: an earpiece and a glowing price tag,
 * Lv 4 The Omni: a black suit, a fedora, a cyan HUD lens and a silenced pistol with a laser.
 */
function makeBusinessman(a, b) {
  const sleazy = a >= 4;
  const omni = b >= 4;
  const suit = sleazy ? 0x4a148c : omni ? 0x1b1b1b : 0x37474f;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: suit, pants: suit, arms: suit, face: 'smile' });
  const key = `x3biz${a}${b}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x3e2723, { h: 0.46 });
  hd.box(0.5, 0.1, 0.5, tone(0x3e2723, 1.2), 0.2, 1.36, 0.1, { r: 0.04, rz: -0.2 }); // side part
  if (a >= 2 || omni) fedora(hd, sleazy ? 0x311b92 : 0x111111, sleazy ? GOLD : omni ? 0x00bcd4 : 0x8e0000);
  if (b >= 2) shades(hd, sleazy ? GOLD : 0x0a0a0a, 0x111111);
  if (b >= 3) {
    // an earpiece with a coiled wire down the collar
    hd.cyl(0.08, 0.1, 0x212121, -0.64, 0.62, 0.1, { axis: 'x', seg: 8 });
    hd.tube([[-0.64, 0.55, 0.1], [-0.6, 0.3, -0.05], [-0.5, 0.0, -0.1]], 0.02, 0xbdbdbd, { sides: 4 });
  }
  if (omni) {
    hd.box(0.06, 0.06, 0.3, INK, -0.55, 0.85, 0.5);
    hd.box(0.32, 0.26, 0.04, glowMat(h, 0x18ffff), -0.25, 0.74, 0.7); // HUD lens
  }
  suitJacket(t, suit, {
    shirt: sleazy ? 0x212121 : 0xfafafa, tie: sleazy ? GOLD : omni ? 0x00838f : 0xc62828,
    square: sleazy ? GOLD : a >= 1 ? 0xfafafa : null, stripe: a >= 2 && !omni ? tone(suit, 1.5) : null,
    vest: a >= 3 ? (sleazy ? GOLD : 0x5d4037) : null,
  });
  belt(t, 0x111111, sleazy ? GOLD : 0xb0b0b0);
  shard(h, t, -0.58, 0.45, 0.6);
  if (sleazy) {
    // a gold chain and gold cufflinks
    t.torus(0.6, 0.05, GOLD, 0, 0.75, 0.2, { rx: PI / 2 + 0.5, seg: 18, sx: 1.1 });
    t.ball(0.12, GOLD, 0, 0.42, 0.62, { seg: 8, rows: 6 });
  }
  if (a >= 2) for (const x of [0.55, 0.75]) t.box(0.16, 0.24, 0.06, CASH, x, 0.58, 0.53, { rz: 0.15 }); // bills in the breast pocket
  if (b >= 1) for (const x of [-0.75, -0.5]) {
    // AP rounds: spare mags on the belt with red tips
    t.box(0.2, 0.42, 0.18, INK, x, -1.0, 0.6, { r: 0.03 });
    t.box(0.12, 0.06, 0.12, 0xc62828, x, -0.76, 0.6);
  }
  if (b >= 2) {
    // a shoulder holster strap across the jacket
    t.box(0.2, 2.2, 1.12, LEATHER, 0, 0, 0, { rz: 0.62 });
    t.box(0.3, 0.6, 0.3, LEATHER, 0.95, -0.25, 0.25, { r: 0.04 });
  }
  if (b >= 3) {
    // Discount Seeker: a glowing price tag on the lapel
    t.plan([[-0.17, -0.11], [0.1, -0.11], [0.2, 0], [0.1, 0.11], [-0.17, 0.11]], 0.04, glowMat(h, 0xffd740, 0.6), 0.55, 0.0, 0.56, { rx: PI / 2 });
    t.cyl(0.03, 0.06, INK, 0.68, 0.0, 0.6, { axis: 'z', seg: 6 });
  }
  hd.done();
  t.done();
  cuffs(h, key, sleazy ? 0x212121 : 0xfafafa, tone(suit, 0.85), a >= 3 ? GOLD : null);
  shoes(h, key, sleazy ? 0x3e2723 : 0x111111, { pants: suit, spat: a >= 3 && !sleazy ? 0xeeeeee : null });
  // the case in the left hand, the pistol in the right
  const c = fist(h.leftArm, -1.9, 1.1);
  const ck = wear(h, c, `${key}:case`);
  attache(ck, a, h);
  ck.done();
  h.leftArm.rotation.set(0, 0, -0.1);
  const g = fist(h.rightArm, -1.9, 1.3);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = pistol(gk, {
    len: b >= 2 ? 1.1 : 0.95, body: sleazy ? GOLD : 0x2a2d31, grip: sleazy ? 0xfff8e1 : 0x3e2723,
    trim: b >= 1 ? 0xc62828 : null, laser: omni ? 0xff1744 : null, can: omni,
  });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  h.rightArm.rotation.set(-PI / 2, 0, 0.1);
  h.pose = { right: -PI / 2, left: 0, leftRecoil: 0 };
  h.tracer = sleazy ? 0xffd54f : 0xffe082;
  return own(h, 0.3);
}

// ------------------------------------------------------------------ Mechanic

/** A folded turret kit for the back (torso space, facing -z): legs, a body and a barrel. */
function turretKit(k, x, y, z, col, barrels, light) {
  for (const s of [-1, 1]) k.box(0.08, 1.1, 0.08, INK, x + s * 0.2, y - 0.2, z, { rz: s * 0.12 });
  k.box(0.7, 0.55, 0.5, col, x, y + 0.2, z - 0.05, { r: 0.08 });
  k.box(0.3, 0.12, 0.05, light, x, y + 0.32, z - 0.31);
  for (let i = 0; i < barrels; i++) {
    const bx = barrels === 1 ? x : x - 0.12 + (i % 2) * 0.24;
    k.cyl(0.07, 0.8, GUNMETAL, bx, y + 0.75, z - 0.05 - (i > 1 ? 0.14 : 0), { seg: 8 });
  }
}

/**
 * Mechanic (alternate Engineer form): orange shirt, blue overalls, a hard hat, a tool belt and a
 * nailgun. Top path: Lv 1 Attack Turret: a turret kit on the back, Lv 2 Rewritten AI: cyan AI
 * goggles and a tablet on the arm, Lv 3 Chain Barrel: a spinning barrel cluster and an ammo can,
 * Lv 4 Multi-Purpose Weaponry: a red multi-barrel turret kit and a rocket pod. Bottom path: Lv 1
 * Metallic Nails: a steel nail strip and nail boxes, Lv 2 Area of Denial: a longer barrel and a
 * range finder, Lv 3 a Tesla coil on the back with sparks, Lv 4 Forcefield Generator: glowing
 * emitters and a ring round the feet that turns.
 */
function makeMechanic(a, b) {
  const shirt = 0xef6c00;
  const denim = 0x1565c0;
  const h = makeHumanoid({ skin: 0xd9a066, shirt, pants: denim, arms: shirt, face: 'smile' });
  const key = `x3mech${a}${b}`;
  const cyan = glowMat(h, 0x00e5ff);
  const spark = glowMat(h, 0x80d8ff);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x6d4c41, { h: 0.4 });
  hardHat(hd, 0xffd600, glowMat(h, 0xfff3b0));
  hd.box(0.06, 0.24, 0.3, 0x6d4c41, 0.62, 0.55, 0.25); // sideburn
  hd.cyl(0.04, 0.4, 0xfdd835, 0.66, 0.8, 0.1, { seg: 6, rx: 0.2 }); // pencil behind the ear
  if (a >= 2) {
    // Rewritten AI: goggles with cyan lenses and a little sensor
    goggles(hd, 0.76, cyan, { r: 0.7 });
    hd.box(0.2, 0.16, 0.14, INK, -0.36, 0.98, 0.62, { r: 0.03 });
    hd.cyl(0.04, 0.03, cyan, -0.36, 0.98, 0.7, { axis: 'z', seg: 8 });
  }
  if (b >= 2) {
    // Area of Denial: a range finder clipped to the hat
    hd.box(0.18, 0.18, 0.5, INK, 0.72, 1.05, 0.25, { r: 0.04 });
    hd.cyl(0.07, 0.03, glowMat(h, 0xff1744), 0.72, 1.05, 0.51, { axis: 'z', seg: 8 });
  }
  // overalls: the bib, straps, brass buttons and the lower half over the hips
  t.box(2.08, 0.95, 1.1, denim, 0, -0.55, 0, { r: 0.05 });
  t.box(1.25, 1.0, 0.08, denim, 0, 0.35, 0.53, { r: 0.03 });
  pouch(t, 0, 0.35, 0.56, 0.6, 0.4, tone(denim, 0.85), 0.05);
  for (const s of [-1, 1]) {
    t.box(0.26, 0.1, 1.2, denim, s * 0.5, 1.0, -0.02);
    t.box(0.26, 1.7, 0.06, denim, s * 0.5, 0.2, -0.53);
    t.cyl(0.07, 0.04, 0xc9a227, s * 0.5, 0.78, 0.59, { axis: 'z', seg: 8 });
  }
  for (const s of [-1, 1]) t.box(0.03, 0.9, 0.03, 0xfdd835, s * 0.62, 0.35, 0.58); // stitching
  t.box(0.4, 0.2, 0.04, 0xfafafa, -0.6, 0.6, 0.53); // name patch
  t.box(0.3, 0.06, 0.02, 0xc62828, -0.6, 0.6, 0.56);
  shard(h, t, 0.62, 0.62, 0.53);
  // the tool belt: pouches, a wrench, a screwdriver and a tape measure
  belt(t, 0x5d4037, 0xb0b0b0, -0.92);
  for (const x of [-0.7, 0.7]) pouch(t, x, -1.1, 0.55, 0.42, 0.4, 0x6d4c41, 0.2);
  t.box(0.1, 0.6, 0.06, STEEL, 1.0, -1.15, 0.5, { rz: 0.15 });
  t.torus(0.1, 0.035, STEEL, 1.04, -0.83, 0.5, { seg: 10, arc: PI * 1.5 });
  t.cyl(0.05, 0.5, 0xc62828, -1.0, -1.05, 0.48, { seg: 6 });
  t.cyl(0.015, 0.3, STEEL, -1.0, -1.4, 0.48, { seg: 4 });
  t.cyl(0.16, 0.12, 0xfdd835, 0, -1.15, 0.6, { axis: 'z', seg: 12 });
  if (b >= 1) for (const x of [-0.35, 0.35]) {
    // Metallic Nails: boxes of nails on the belt
    t.box(0.3, 0.26, 0.2, 0x90a4ae, x, -0.66, 0.62, { r: 0.02 });
    t.box(0.22, 0.06, 0.04, INK, x, -0.62, 0.73);
  }
  // the back: a tool pack frame
  t.box(1.4, 1.5, 0.55, 0x546e7a, 0, 0.1, -0.8, { r: 0.08 });
  t.box(1.46, 0.14, 0.6, INK, 0, 0.75, -0.8);
  for (const s of [-1, 1]) t.box(0.2, 0.6, 0.4, 0x455a64, s * 0.8, -0.1, -0.8, { r: 0.04 });
  if (a >= 1) turretKit(t, a >= 4 ? 0.35 : 0, 0.0, -1.3, a >= 4 ? 0xc62828 : 0x757575, a >= 4 ? 4 : a >= 3 ? 2 : 1, glowMat(h, a >= 4 ? 0xff1744 : 0x76ff03));
  if (a >= 3) {
    // Chain Barrel: an ammo can and a belt
    t.box(0.5, 0.45, 0.4, 0x4b5320, -0.95, -0.45, -0.75, { r: 0.04 });
    t.box(0.3, 0.06, 0.1, 0xfdd835, -0.95, -0.3, -0.54);
    t.tube([[-0.9, -0.2, -0.55], [-1.15, -0.6, 0.0], [-1.1, -0.95, 0.4]], 0.06, GOLD, { seg: 10, sides: 5 });
  }
  if (a >= 4) {
    // Multi-Purpose Weaponry: a little rocket pod on the left of the pack
    t.box(0.5, 0.7, 0.5, 0x37474f, -0.45, 0.2, -1.25, { r: 0.05 });
    for (let i = 0; i < 4; i++) t.cyl(0.08, 0.08, 0xc62828, -0.57 + (i % 2) * 0.24, 0.57, -1.13 - Math.floor(i / 2) * 0.24, { seg: 8 });
  }
  if (b >= 3) {
    // a Tesla coil standing up from the pack, sparking
    coil(t, 0.55, 1.45, -0.95, 0.3, 0.9, 4);
    t.torus(0.26, 0.08, STEEL, 0.55, 1.98, -0.95, { rx: PI / 2, seg: 14 });
    t.ball(0.2, spark, 0.55, 2.2, -0.95, { seg: 12, rows: 8 });
    for (let i = 0; i < 3; i++) arc(t, [0.55, 2.2, -0.95], [0.55 + Math.sin(i * 2.1) * 0.55, 2.45 + i * 0.08, -0.95 + Math.cos(i * 2.1) * 0.55], spark, 0.1, i + 1);
  }
  if (b >= 4) {
    // Forcefield Generator: emitters on the shoulders
    for (const s of [-1, 1]) {
      t.cyl(0.18, 0.3, GUNMETAL, s * 1.25, 1.12, -0.1, { seg: 12 });
      t.ball(0.14, spark, s * 1.25, 1.32, -0.1, { seg: 10, rows: 6 });
    }
  }
  hd.done();
  t.done();
  hands(h, key, 0x8d6e63, tone(shirt, 0.8), (k, s) => {
    if (a >= 2 && s > 0) {
      // the AI tablet strapped to the left forearm
      k.box(0.18, 0.8, 1.0, 0x263238, 0.56, -1.2, 0.1, { r: 0.04 });
      k.box(0.04, 0.65, 0.85, cyan, 0.66, -1.2, 0.1);
    }
  });
  feet(h, key, 0x3e2723, (k) => {
    k.box(1.1, 0.2, 1.1, tone(denim, 0.85), 0, -1.32, 0.02); // rolled-up cuffs
    if (b >= 2) kneePad(k, 0x37474f);
  });
  if (b >= 4) {
    // the forcefield ring round the feet turns
    const r = spinner(h, h.root, 0, 0.12, 0);
    const rk = wear(h, r, `${key}:field`);
    rk.torus(2.0, 0.06, spark, 0, 0, 0, { rx: PI / 2, seg: 32 });
    rk.cyl(2.0, 0.02, glassMat(h, 0x40c4ff, 0.22), 0, -0.02, 0, { seg: 32 });
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * PI * 2;
      rk.box(0.3, 0.35, 0.3, GUNMETAL, Math.sin(ang) * 2.0, 0.12, Math.cos(ang) * 2.0, { r: 0.05, ry: ang });
      rk.ball(0.1, spark, Math.sin(ang) * 2.0, 0.36, Math.cos(ang) * 2.0, { seg: 8, rows: 5 });
    }
    rk.done();
  }
  // the nailgun: a yellow body, a slanted nail strip, a nose; a chain barrel from Lv 3
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const body = b >= 1 ? 0x455a64 : 0x616161;
  gk.box(0.42, 1.1, 0.5, body, 0, -0.45, UP, { r: 0.08 });
  gk.box(0.44, 0.5, 0.52, 0xffd600, 0, -0.25, UP + 0.02, { r: 0.08 });
  gk.box(0.24, 0.3, 0.55, INK, 0, 0.12, UP - 0.38, { rx: -0.3, r: 0.04 }); // grip
  gk.torus(0.1, 0.022, INK, 0, -0.12, UP - 0.24, { ry: PI / 2, seg: 10, arc: PI });
  gk.box(0.12, 0.9, 0.2, b >= 1 ? 0xb0bec5 : 0x8d6e63, 0, -0.55, UP - 0.38, { rx: 0.15 }); // nail strip
  for (let i = 0; i < 6; i++) gk.box(0.14, 0.03, 0.22, STEEL, 0, -0.2 - i * 0.12, UP - 0.38);
  gk.box(0.3, 0.12, 0.3, INK, 0, 0.15, UP + 0.05); // hose fitting
  let tip;
  if (a >= 3) {
    // Chain Barrel: a housing in front; the barrel cluster turns (below)
    gk.cyl(0.26, 0.2, GUNMETAL, 0, -1.05, UP, { seg: 14 });
    tip = -2.1;
  } else {
    const nose = b >= 2 ? 0.9 : 0.55;
    gk.cyl(0.13, nose, STEEL, 0, -1.0 - nose / 2, UP, { seg: 10 });
    gk.cyl(0.18, 0.12, INK, 0, -1.0 - nose, UP, { seg: 10 });
    tip = -1.06 - nose;
  }
  if (b >= 2) {
    gk.cyl(0.08, 0.5, INK, 0, -0.45, UP + 0.38, { seg: 10 }); // scope
    gk.box(0.08, 0.12, 0.14, INK, 0, -0.45, UP + 0.28);
  }
  gk.done();
  if (a >= 3) {
    const sp = spinner(h, g, 0, -1.6, UP);
    const bk = wear(h, sp, `x3mech:chain${a >= 4 ? 4 : 3}`);
    const n = a >= 4 ? 6 : 4;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * PI * 2;
      bk.cyl(0.06, 1.0, STEEL, Math.sin(ang) * 0.14, 0, Math.cos(ang) * 0.14, { seg: 8 });
    }
    for (const y of [-0.45, 0.35]) bk.cyl(0.22, 0.08, INK, 0, y, 0, { seg: 14 });
    bk.done();
    h.idleSpin = 0;
  }
  if (b >= 4) h.idleSpin = 1.5;
  h.muzzles = [];
  muzzle(h, g, tip, UP);
  aimLong(h);
  h.tracer = b >= 3 ? 0x80d8ff : 0xbdbdbd;
  return own(h);
}

// ------------------------------------------------------------------ Surveyor

/**
 * A hovering drone at (x, y, z) on h.body. kind: 'burst', 'm2', 'bomber', 'sentinel', 'radar',
 * 'cryo'. Its four rotors turn (spinner + h.idleSpin).
 */
function hoverDrone(h, kind, x, y, z, ry) {
  const d = new THREE.Group();
  d.position.set(x, y, z);
  d.rotation.y = ry;
  h.body.add(d);
  const look = {
    burst: { body: 0x546e7a, light: 0x76ff03 },
    m2: { body: 0x455a64, light: 0x76ff03 },
    bomber: { body: 0x6d4c41, light: 0xff6d00 },
    sentinel: { body: 0x212121, light: 0xff1744 },
    radar: { body: 0xcfd8dc, light: 0x40c4ff },
    cryo: { body: 0x80deea, light: 0x18ffff },
  }[kind];
  const lit = glowMat(h, look.light);
  const k = kit(h, d, `x3drone:${kind}`);
  const big = kind === 'sentinel' ? 1.2 : 1;
  k.box(0.8 * big, 0.3, 1.0 * big, look.body, 0, 0, 0, { r: 0.1 });
  k.box(0.55 * big, 0.12, 0.6 * big, tone(look.body, 0.8), 0, 0.2, -0.05, { r: 0.05 }); // battery
  for (const [px, pz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) {
    k.box(0.1, 0.07, 1.0, INK, (px * big) / 2, 0.05, (pz * big) / 2, { ry: Math.atan2(px, pz) });
    k.cyl(0.11, 0.2, INK, px * big, 0.12, pz * big, { seg: 10 });
    k.cyl(0.05, 0.04, lit, px * big, -0.02, pz * big, { seg: 8 });
  }
  k.ball(0.14, INK, 0, -0.2, 0.4 * big, { seg: 10, rows: 7 }); // camera
  k.cyl(0.07, 0.04, lit, 0, -0.2, 0.55 * big, { axis: 'z', seg: 10 });
  if (kind === 'burst' || kind === 'm2' || kind === 'sentinel') {
    const n = kind === 'burst' ? 1 : 2;
    for (let i = 0; i < n; i++) {
      const gx = n === 1 ? 0 : (i - 0.5) * 0.3;
      k.box(0.16, 0.16, 0.5, 0x111316, gx, -0.28, 0.1, { r: 0.03 });
      k.cyl(0.04, 0.45, STEEL, gx, -0.28, 0.55, { axis: 'z', seg: 8 });
    }
  }
  if (kind === 'bomber') for (const bx of [-0.25, 0, 0.25]) {
    k.cyl(0.09, 0.4, 0x37474f, bx, -0.3, 0, { axis: 'z', seg: 8 });
    k.cyl(0.09, 0.12, 0xff6d00, bx, -0.3, 0.24, { axis: 'z', seg: 8, r2: 0.01 });
  }
  if (kind === 'radar') {
    k.cyl(0.04, 0.3, INK, 0, 0.4, 0, { seg: 6 });
    k.cyl(0.32, 0.08, 0xeceff1, 0, 0.58, 0, { seg: 14, r2: 0.12, rx: 0.4 });
  }
  if (kind === 'cryo') k.ball(0.18, lit, 0, -0.3, 0, { seg: 10, rows: 7 });
  if (kind === 'sentinel') k.box(1.0, 0.06, 0.06, lit, 0, 0.0, 0.62);
  k.done();
  for (const [px, pz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) {
    const r = spinner(h, d, px * big, 0.25, pz * big);
    const rk = kit(h, r, 'x3drone:rotor');
    rk.box(0.8, 0.03, 0.1, 0x212121, 0, 0, 0, { r: 0.01 });
    rk.cyl(0.04, 0.06, STEEL, 0, 0.02, 0, { seg: 8 });
    rk.done();
  }
}

/**
 * Surveyor (alternate Ghost form): a drone operator with a cap, a headset, an antenna pack and
 * a controller held in both hands; its drones hover round its head. Top path: Lv 1 More Support:
 * a taller antenna, Lv 2 Stronger Drones: a big battery on the pack, Lv 3 Drone Warfare: a radar
 * dish on the pack (it turns), a HUD lens and a Radar Drone, Lv 4 Death Swarm: a cryo cell and a
 * Cryo Drone. Bottom path: Lv 1 a spare drone docked on the pack, Lv 2 M2 drones with twin guns,
 * Lv 3 a bomber badge, bombs on the belt and a Bomber Drone, Lv 4 Sentinel Drones and a red light.
 */
function makeSurveyor(a, b) {
  const shirt = 0x37474f;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x263238, arms: shirt, face: 'soldier' });
  const key = `x3surv${a}${b}`;
  const green = glowMat(h, 0x76ff03);
  const tip = glowMat(h, b >= 4 ? 0xff1744 : 0x76ff03);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  cap(hd, 0x212121, { peak: 0x111111 });
  hd.box(0.3, 0.2, 0.04, b >= 4 ? 0xc62828 : 0x76ff03, 0, 1.2, 0.66, { rx: -0.3 }); // cap badge
  headset(hd, 0x263238);
  if (a >= 3) {
    // a HUD lens on the left eye
    hd.box(0.06, 0.06, 0.4, INK, 0.5, 0.82, 0.45);
    hd.box(0.3, 0.24, 0.04, glowMat(h, 0x40c4ff), 0.25, 0.74, 0.68);
  }
  // a tactical vest with pouches, a drone-pilot patch and the shard
  vest(t, 0x455a64, { pouches: 2, pouch: 0x37474f });
  t.box(0.4, 0.3, 0.04, 0x263238, 0.45, 0.6, 0.68);
  t.box(0.24, 0.06, 0.02, green, 0.45, 0.6, 0.71);
  shard(h, t, -0.45, 0.62, 0.68);
  belt(t, INK, 0x37474f);
  if (b >= 3) {
    // Bomber Drones: an orange badge and little bombs on the belt
    t.cyl(0.16, 0.06, glowMat(h, 0xff6d00, 0.5), -0.45, 0.05, 0.7, { axis: 'z', seg: 12 });
    for (const x of [0.55, 0.85]) {
      t.cyl(0.1, 0.35, 0x37474f, x, -1.05, 0.62, { seg: 8 });
      t.cyl(0.1, 0.1, 0xff6d00, x, -1.27, 0.62, { seg: 8, r2: 0.01 });
    }
  }
  // the antenna pack: a radio box on a frame, a mast with a light
  const z = -0.85;
  t.box(1.4, 1.6, 0.7, 0x455a64, 0, 0.1, z, { r: 0.1 });
  t.box(1.0, 0.5, 0.05, 0x263238, 0, 0.3, z - 0.36);
  for (let i = 0; i < 3; i++) t.cyl(0.05, 0.04, i === 0 ? green : INK, -0.3 + i * 0.3, 0.3, z - 0.39, { axis: 'z', seg: 8 });
  for (const s of [-1, 1]) {
    t.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
    t.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, 0.55);
  }
  const mast = a >= 1 ? 2.8 : 1.8;
  t.cyl(0.05, mast, STEEL, 0.5, 0.9 + mast / 2, z, { seg: 6 });
  for (let i = 1; i < 4; i++) t.cyl(0.08, 0.06, INK, 0.5, 0.9 + (mast * i) / 4, z, { seg: 6 });
  t.ball(0.13, tip, 0.5, 0.95 + mast, z, { seg: 8, rows: 6 });
  if (a >= 2) {
    // Stronger Drones: a big battery on the side of the pack
    t.box(0.35, 1.2, 0.6, 0x263238, -0.9, 0.0, z, { r: 0.05 });
    for (let i = 0; i < 4; i++) t.box(0.05, 0.16, 0.4, i < 3 ? green : INK, -1.09, -0.4 + i * 0.25, z);
  }
  if (a >= 4) {
    // Death Swarm: a cryo cell
    t.cyl(0.2, 0.7, glowMat(h, 0x80deea), 0.9, -0.1, z, { seg: 12 });
    for (const y of [-0.5, 0.3]) t.cyl(0.24, 0.1, GUNMETAL, 0.9, y, z, { seg: 12 });
  }
  if (b >= 1) {
    // a spare drone docked flat on the back of the pack
    const dz = z - 0.55;
    t.box(0.9, 0.9, 0.25, 0x546e7a, 0, -0.1, dz, { r: 0.06 });
    for (const [px, py] of [[-0.5, 0.4], [0.5, 0.4], [-0.5, -0.6], [0.5, -0.6]]) t.cyl(0.18, 0.06, INK, px, py, dz - 0.1, { axis: 'z', seg: 12 });
    t.cyl(0.05, 0.04, green, 0, -0.1, dz - 0.14, { axis: 'z', seg: 8 });
  }
  hd.done();
  t.done();
  if (a >= 3) {
    const sp = spinner(h, h.torso, -0.4, 0.95, z);
    dish(h, sp, 'x3surv:dish', 0, 0.05, 0, 0.42, 0xeceff1, glowMat(h, 0x40c4ff));
  }
  hands(h, key, 0x111316, tone(shirt, 0.8));
  feet(h, key, 0x111316, (k) => kneePad(k, 0x263238));
  // the controller in both hands: two grips, sticks, a screen and an aerial
  const g = fist(h.rightArm, -1.9, 1.0);
  const gk = wear(h, g, `${key}:pad`);
  gk.box(1.3, 0.55, 0.3, 0x212121, 0.45, -0.25, 0.05, { r: 0.08 });
  for (const s of [-1, 1]) gk.box(0.32, 0.4, 0.35, 0x2b2b2b, 0.45 + s * 0.6, -0.05, 0.0, { r: 0.08 });
  gk.box(0.6, 0.38, 0.04, glowMat(h, 0x00e5ff), 0.45, -0.32, 0.22);
  for (const s of [-1, 1]) {
    gk.cyl(0.05, 0.12, INK, 0.45 + s * 0.48, -0.35, 0.26, { axis: 'z', seg: 8 });
    gk.ball(0.07, 0x424242, 0.45 + s * 0.48, -0.35, 0.33, { seg: 8, rows: 5 });
  }
  antenna(gk, 0.95, 0.0, 0.1, 0.6);
  gk.done();
  h.rightArm.rotation.set(-1.1, 0, 0.3);
  h.leftArm.rotation.set(-1.1, 0, -0.3);
  h.pose = { right: -1.1, left: -1.1, leftRecoil: 0 };
  h.muzzles = [];
  muzzle(h, g, -0.3, 0.2, 0.45);
  // the drones round its head
  const drones = [b >= 4 ? 'sentinel' : b >= 2 ? 'm2' : 'burst'];
  if (b >= 3) drones.push('bomber');
  if (a >= 3) drones.push('radar');
  if (a >= 4) drones.push('cryo');
  if (drones.length < 2 && (b >= 1 || a >= 1)) drones.push(drones[0]);
  const spots = [[1.9, 6.0, 0.6, 0.5], [-1.9, 6.4, 0.3, -0.5], [0.0, 7.1, -1.4, 0], [1.2, 7.0, -1.9, 0.3]];
  drones.forEach((kind, i) => hoverDrone(h, kind, ...spots[i]));
  h.idleSpin = 9;
  h.static = true;
  return own(h, 0);
}

// ------------------------------------------------------------------ Lightbeamer

/**
 * Lightbeamer (alternate Plasma form): a lab tech with a beam rifle. Top path: Lv 1 OSHA
 * Certified: a white hard hat and a hi-vis vest, Lv 2 Nanosuit: a dark suit with glowing seams
 * and a visor helmet, Lv 3 Stream of Energy: a longer rifle on a power cable from a generator
 * pack, Lv 4 Degradation Device: a pink beam and a ring round the barrel that turns, Lv 5 The
 * Prototype: white light, white and gold armour and a halo round the emitter. Bottom path: Lv 1
 * a focusing lens on the emitter, Lv 2 Finer Weapon: a scope and chrome trim, Lv 3 Avarian
 * Technology: green pellet cells on the back and a pellet drum, Lv 4 Impact Burst: bigger cells,
 * shoulder pads and a burst canister on the gun.
 */
function makeLightbeamer(a, b) {
  const proto = a >= 5;
  const nano = a >= 2;
  const pellets = b >= 3;
  const beamC = proto ? 0xffffff : a >= 4 ? 0xff4081 : pellets ? 0x76ff03 : 0xffee58;
  const shirt = proto ? 0xeceff1 : nano ? 0x455a64 : 0xeceff1;
  const h = makeHumanoid({ skin: 0xffe0bd, shirt, pants: nano && !proto ? 0x37474f : 0x90a4ae, arms: shirt, face: 'soldier' });
  const key = `x3beam${a}${b}`;
  const beam = glowMat(h, beamC);
  const green = glowMat(h, 0x76ff03);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const plate = proto ? 0xfafafa : 0x546e7a;
  if (nano) {
    visorHelmet(hd, proto ? 0xfafafa : 0x546e7a, beam, { crest: proto ? GOLD : 0x37474f });
  } else {
    hair(hd, 0xf9a825, { h: 0.48 });
    if (a >= 1) hardHat(hd, 0xfafafa, glowMat(h, 0xfff3b0));
    goggles(hd, 0.76, glowMat(h, 0xffee58), { r: 0.7 });
  }
  if (nano) {
    // Nanosuit: hex plates, glowing seams, a chest core
    chestPlate(t, plate, beam, { r: 0.26 });
    for (const s of [-1, 1]) t.box(0.05, 1.6, 0.04, beam, s * 0.85, 0.1, 0.61);
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) t.cyl(0.18, 0.05, tone(plate, 1.3), s * (0.25 + i * 0.25), -0.25, 0.6, { axis: 'z', seg: 6 });
    if (proto) {
      shoulderPads(t, GOLD, 0.62);
      t.box(2.2, 0.12, 1.22, GOLD, 0, 0.98, 0, { r: 0.03 });
    }
  } else {
    // a lab coat with a pocket and pens
    collar(t, 0xfafafa, { buttons: true });
    t.slab(2.16, 1.4, 0.14, 0xfafafa, 0, -1.3, -0.58, { bw: 1.08 });
    for (const s of [-1, 1]) t.slab(0.26, 1.4, 1.1, 0xfafafa, s * 1.0, -1.3, 0, { bw: 1.15 });
    pouch(t, 0.55, 0.35, 0.52, 0.45, 0.4, 0xe0e0e0, 0.06);
    for (const [x, c] of [[0.45, 0x1565c0], [0.6, 0xffb300]]) t.cyl(0.04, 0.35, c, x, 0.6, 0.6, { seg: 6 });
    if (a >= 1) {
      // OSHA Certified: a hi-vis vest with reflective bands
      t.box(2.16, 1.6, 1.14, 0xffab00, 0, 0.1, 0, { r: 0.1 });
      for (const y of [0.3, -0.3]) t.box(2.2, 0.14, 1.18, 0xe0e0e0, 0, y, 0);
      for (const s of [-1, 1]) t.box(0.14, 0.6, 0.05, 0xe0e0e0, s * 0.55, 0.75, 0.58);
    }
  }
  shard(h, t, -0.55, 0.6, nano ? 0.64 : a >= 1 ? 0.6 : 0.53);
  belt(t, INK, beam);
  // the back: a generator from Stream of Energy, pellet cells from Avarian Technology
  if (pellets) cellPack(t, 0x263238, green, b >= 4 ? 4 : 2, { w: b >= 4 ? 1.6 : 1.3 });
  else if (a >= 3) {
    t.box(1.5, 1.7, 0.75, proto ? 0xeceff1 : 0x37474f, 0, 0.0, -0.9, { r: 0.12 });
    t.cyl(0.3, 0.2, beam, 0, 0.2, -1.32, { axis: 'z', seg: 16 });
    t.torus(0.36, 0.06, GUNMETAL, 0, 0.2, -1.33, { seg: 16 });
    for (const s of [-1, 1]) t.box(0.12, 1.2, 0.12, beam, s * 0.6, 0.0, -1.27);
    for (const s of [-1, 1]) {
      t.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
      t.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, 0.55);
    }
  }
  if (a >= 3) t.tube([[-0.5, -0.5, -1.0], [-1.15, -0.85, -0.4], [-1.2, -0.95, 0.4]], 0.07, INK, { seg: 10, sides: 6 }); // power cable to the gun
  if (b >= 4) shoulderPads(t, 0x455a64, 0.58);
  hd.done();
  t.done();
  hands(h, key, nano ? 0x111111 : 0x90a4ae, tone(shirt, 0.85), nano ? (k) => k.box(0.05, 0.6, 0.04, beam, -0.53, -0.9, 0.2) : null);
  feet(h, key, nano ? 0x263238 : 0x455a64, nano ? (k) => k.box(0.86, 0.5, 0.2, plate, 0, -0.95, 0.54, { r: 0.08 }) : null);
  // the beam rifle
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const len = proto ? 2.7 : a >= 3 ? 2.5 : 2.1;
  const [y, z] = beamGun(gk, {
    len, body: proto ? 0xfafafa : 0xcfd8dc, trim: b >= 2 ? 0xb0bec5 : 0x546e7a, glow: beam,
    rings: a >= 4 ? 4 : 2, scope: b >= 2, fat: proto ? 1.3 : a >= 3 ? 1.15 : 1,
  });
  gk.box(0.55, 0.8, 0.55, proto ? GOLD : 0x78909c, 0, -0.5, UP, { r: 0.08 }); // power core housing
  gk.box(0.57, 0.5, 0.3, beam, 0, -0.5, UP + 0.05);
  if (b >= 1) gk.cyl(0.2, 0.12, glassMat(h, 0xe1f5fe, 0.6), 0, -len - 0.08, UP, { seg: 14 }); // focusing lens
  if (b >= 2) for (const s of [-1, 1]) gk.box(0.05, 1.0, 0.06, 0xeceff1, s * 0.2, -1.2, UP + 0.1);
  if (pellets) {
    // a pellet drum under the gun
    gk.cyl(0.32, 0.26, 0x263238, 0, -0.75, UP - 0.48, { axis: 'x', seg: 14 });
    gk.cyl(0.2, 0.28, green, 0, -0.75, UP - 0.48, { axis: 'x', seg: 12 });
  }
  if (b >= 4) {
    // Impact Burst: a burst canister on the side of the barrel
    gk.cyl(0.14, 0.6, glowMat(h, 0xb2ff59), 0.3, -1.3, UP, { seg: 10 });
    for (const yy of [-1.0, -1.6]) gk.cyl(0.17, 0.06, GUNMETAL, 0.3, yy, UP, { seg: 10 });
  }
  gk.done();
  if (a >= 4) {
    // Degradation Device: a ring of prongs round the barrel that turns; a halo at the Prototype
    const sp = spinner(h, g, 0, -len + 0.55, UP);
    const rk = wear(h, sp, `x3beam:ring${proto ? 5 : 4}`);
    const R = proto ? 0.5 : 0.36;
    rk.torus(R, 0.05, proto ? glowMat(h, 0xfff59d) : beam, 0, 0, 0, { rx: PI / 2, seg: 22 });
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * PI * 2;
      rk.box(0.08, 0.4, 0.08, proto ? GOLD : GUNMETAL, Math.sin(ang) * R, -0.15, Math.cos(ang) * R);
    }
    rk.done();
    h.idleSpin = 2;
  }
  h.muzzles = [];
  muzzle(h, g, y - (b >= 1 ? 0.1 : 0), z);
  aimLong(h);
  h.beam = beamC;
  h.tracer = beamC;
  h.tracerWidth = proto ? 0.5 : a >= 3 ? 0.35 : 0.25;
  return own(h);
}

export const CROSS = {
  zedRecon: makeRecon,
  phaserElite: makeElite,
  cowboyBusinessman: makeBusinessman,
  engineerMechanic: makeMechanic,
  ghostSurveyor: makeSurveyor,
  plasmaLightbeamer: makeLightbeamer,
};
