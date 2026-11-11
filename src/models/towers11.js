// Tower models, file 11 of 12. Each makeX(level) builds one tower's look.
// In here:
// Shield Tower, Oil Derrick, Combat Medic, Refractor, Scout Heli, Noob Tuber, Stinger,
// Jet Trooper, Combat Drone. (Warship: machines3.js.)
// The list of which tower uses which builder is TOWER_MODELS in ../models.js.

import * as THREE from 'three';
import { boxGeo, makeHumanoid, part } from './kit.js';
import {
  addPistol, blurDisc, clearMat, cylPart, glow, glowThing, gunMuzzle, helmet, holdLongGun, makeThing, setMuzzle,
  usFlag,
} from './bits.js';

/**
 * Shield Tower: a generator pylon under a see-through blue dome. Top path: dish antennas (Lv 1),
 * capacitors (Lv 2), a bigger dome (Lv 3), a yellow reboot coil (Lv 4), then orbiting hex panels
 * and the biggest dome (Lv 5). Bottom path: a repair arm (Lv 1), glowing side panels (Lv 2),
 * Nano Shields: four small emitter orbs (Lv 3), green heal crosses (Lv 4), then rings (Lv 5).
 */
export function makeShieldTower(level, bottom = false) {
  const u = makeThing();
  const { M } = u;
  const top = !bottom;
  const color = bottom && level >= 3 ? 0x18ffff : 0x40c4ff;
  const shine = glowThing(u, color);
  const metal = M(0x546e7a);
  const dark = M(0x263238);
  part(u.body, boxGeo(3.2, 0.5, 3.2), M(0x455a64), 0, 0.25, 0);
  const ph = 2.4 + level * 0.25; // pylon height
  part(u.body, boxGeo(1.1, ph, 1.1), metal, 0, 0.5 + ph / 2, 0);
  for (let i = 0; i < 2 + Math.min(level, 3); i++) part(u.body, boxGeo(1.3, 0.15, 1.3), shine, 0, 0.9 + i * (ph / (2 + Math.min(level, 3))), 0); // coil rings
  const orbY = 0.5 + ph + 0.5;
  part(u.body, boxGeo(0.8, 0.8, 0.8), shine, 0, orbY, 0);
  setMuzzle(u, u.body, 0, orbY, 0);
  // Dome: bigger with the Top path's shield upgrades.
  const r = top ? [2.2, 2.2, 2.3, 2.7, 2.8, 3.2][level] : [2.2, 2.2, 2.3, 2.0, 2.2, 2.4][level];
  const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), clearMat(u, color, 0.22));
  dome.position.y = 0.5;
  u.body.add(dome);
  if (top) {
    if (level >= 1) for (const side of [-1, 1]) {
      part(u.body, boxGeo(0.1, 1.2, 0.1), dark, side * 1.2, 1.1, -1.2);
      part(u.body, boxGeo(0.7, 0.5, 0.1), M(0xeceff1), side * 1.2, 1.8, -1.2).rotation.y = side * 0.5;
    }
    if (level >= 2) for (const x of [-1.1, 1.1]) {
      cylPart(u.body, 0.3, 0.3, 1.0, M(0x78909c), x, 1.0, 1.0);
      part(u.body, boxGeo(0.2, 0.2, 0.2), shine, x, 1.6, 1.0);
    }
    if (level >= 4) {
      const coil = glowThing(u, 0xffea00);
      for (let i = 0; i < 4; i++) part(u.body, boxGeo(1.5, 0.12, 0.25), coil, 0, 1.2 + i * 0.5, 0).rotation.y = i * 0.8;
    }
    if (level >= 5) for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const p = part(u.body, boxGeo(0.9, 0.9, 0.1), shine, Math.cos(a) * 1.9, orbY - 0.6, Math.sin(a) * 1.9);
      p.rotation.y = -a + Math.PI / 2;
    }
  } else {
    if (level >= 1) {
      // Advanced Repairs: a little robot repair arm.
      part(u.body, boxGeo(0.25, 1.4, 0.25), M(0xffa000), 1.1, 1.2, 1.1).rotation.z = -0.4;
      part(u.body, boxGeo(0.4, 0.25, 0.4), dark, 1.4, 1.9, 1.1);
    }
    if (level >= 2) for (const side of [-1, 1]) part(u.body, boxGeo(0.08, ph * 0.6, 0.6), shine, side * 0.6, 0.5 + ph / 2, 0);
    if (level >= 3) for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      part(u.body, boxGeo(0.12, 1.6, 0.12), dark, Math.cos(a) * 1.3, 1.3, Math.sin(a) * 1.3);
      part(u.body, boxGeo(0.45, 0.45, 0.45), shine, Math.cos(a) * 1.3, 2.3, Math.sin(a) * 1.3);
    }
    if (level >= 4) {
      const green = glowThing(u, 0x69f0ae);
      for (const side of [-1, 1]) {
        part(u.body, boxGeo(0.08, 0.6, 0.2), green, side * 0.57, 1.4, 0);
        part(u.body, boxGeo(0.08, 0.2, 0.6), green, side * 0.57, 1.4, 0);
      }
    }
    if (level >= 5) for (let i = 0; i < 2; i++) part(u.body, boxGeo(2.6 - i * 0.6, 0.1, 2.6 - i * 0.6), shine, 0, orbY + 0.7 + i * 0.4, 0).rotation.y = i * 0.78;
  }
  u.medi = color; // links to the towers it shields, if the game draws them
  u.tracer = color;
  u.static = true;
  return u;
}
export const makeShieldTowerBottom = (level) => makeShieldTower(level, true);

/**
 * Oil Derrick: a pumpjack on a pad. Top path: red gas cans (Lv 1), oil barrels (Lv 2), a lattice
 * drill derrick (Lv 3), a pipeline and storage tank (Lv 4), then big black-and-gold tanks (Lv 5).
 * Bottom path: a stack of bonds (Lv 1), money crates (Lv 2), a cash machine (Lv 3), military
 * crates and sandbags (Lv 4), then a big US flag (Lv 5).
 */
export function makeOilDerrick(level, bottom = false) {
  const u = makeThing();
  const { M } = u;
  const top = !bottom;
  const steel = M(0x546e7a);
  const dark = M(0x212121);
  const yellow = M(0xfbc02d);
  part(u.body, boxGeo(4, 0.3, 4), M(0x6d6d6d), 0, 0.15, 0);
  part(u.body, boxGeo(2.6, 0.3, 1.0), M(0x424242), 0, 0.45, 0); // skid
  // Samson post (A-frame), walking beam with a horsehead, and the crank with its counterweight.
  for (const side of [-1, 1]) part(u.body, boxGeo(0.2, 2.6, 0.2), yellow, 0.2 * side, 1.7, side * 0.4).rotation.x = side * 0.18;
  const beam = new THREE.Group();
  beam.position.set(0, 3.0, 0);
  beam.rotation.z = 0.08;
  u.body.add(beam);
  part(beam, boxGeo(3.6, 0.35, 0.35), yellow, 0, 0, 0);
  part(beam, boxGeo(0.5, 1.1, 0.5), dark, 1.9, -0.3, 0); // horsehead
  part(beam, boxGeo(0.06, 2.4, 0.06), dark, 2.05, -1.5, 0); // bridle
  part(u.body, boxGeo(0.6, 0.5, 0.6), steel, 2.0, 0.55, 0); // wellhead
  part(u.body, boxGeo(0.25, 0.8, 0.25), M(0xc62828), 2.0, 1.0, 0);
  part(u.body, boxGeo(0.3, 1.6, 0.3), steel, -1.2, 1.2, 0); // pitman arm
  part(u.body, boxGeo(0.9, 0.9, 0.5), dark, -1.3, 1.0, 0.45); // counterweight
  part(u.body, boxGeo(0.9, 0.9, 0.5), dark, -1.3, 1.0, -0.45);
  part(u.body, boxGeo(1.0, 0.8, 0.8), M(0x37474f), -1.4, 0.7, 0); // motor
  setMuzzle(u, u.body, 2.0, 1.5, 0);
  if (top) {
    if (level >= 1) for (const x of [-1.5, -1.0]) part(u.body, boxGeo(0.4, 0.55, 0.25), M(0xd32f2f), x, 0.58, 1.6); // gas cans
    if (level >= 2) for (const [x, z] of [[1.3, 1.5], [1.75, 1.5], [1.5, 1.05]]) cylPart(u.body, 0.22, 0.22, 0.7, M(0x1565c0), x, 0.65, z); // barrels
    if (level >= 3) {
      // Oil Drill: a lattice derrick tower behind the pumpjack.
      const H = level >= 5 ? 6 : 5;
      for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
        const leg = part(u.body, boxGeo(0.12, H, 0.12), M(0x9e9e9e), x * (1 - 0.3), 0.3 + H / 2, -1.4 + z * (1 - 0.3));
        leg.rotation.set(z * 0.08, 0, -x * 0.08);
      }
      for (let i = 1; i < 5; i++) part(u.body, boxGeo(0.9 - i * 0.08, 0.08, 0.9 - i * 0.08), M(0x9e9e9e), 0, 0.3 + (H * i) / 5, -1.4);
      part(u.body, boxGeo(0.5, 0.3, 0.5), M(0xd32f2f), 0, 0.4 + H, -1.4);
    }
    if (level >= 4) {
      part(u.body, boxGeo(0.25, 0.25, 3.4), steel, 1.7, 0.45, -0.3); // pipeline
      cylPart(u.body, 0.7, 0.7, 1.6, M(0xeceff1), 1.4, 1.1, -1.4); // storage tank
    }
    if (level >= 5) {
      for (const x of [-1.5, 1.4]) {
        cylPart(u.body, 0.75, 0.75, 2.0, dark, x, 1.3, x < 0 ? 1.4 : -1.4);
        part(u.body, boxGeo(1.55, 0.2, 1.55), M(0xffc107), x, 1.6, x < 0 ? 1.4 : -1.4);
      }
    }
  } else {
    const cash = M(0x2e7d32);
    if (level >= 1) for (let i = 0; i < 3; i++) part(u.body, boxGeo(0.7, 0.12, 0.4), M(0xa5d6a7), -1.4, 0.36 + i * 0.13, 1.5); // bonds
    if (level >= 2) for (const x of [0.9, 1.6]) {
      part(u.body, boxGeo(0.6, 0.5, 0.6), M(0x8d6e63), x, 0.55, 1.5); // money crates
      part(u.body, boxGeo(0.5, 0.15, 0.5), cash, x, 0.87, 1.5);
    }
    if (level >= 3) {
      // Cash Back: a cash machine with a green screen.
      part(u.body, boxGeo(0.8, 1.4, 0.6), M(0x455a64), -1.5, 1.0, -1.4);
      part(u.body, boxGeo(0.5, 0.35, 0.05), glowThing(u, 0x76ff03), -1.5, 1.35, -1.08);
    }
    if (level >= 4) {
      for (const x of [0.6, 1.3]) part(u.body, boxGeo(0.65, 0.5, 0.5), M(0x4e5b31), x, 0.55, -1.5); // war crates
      for (let i = 0; i < 4; i++) part(u.body, boxGeo(0.7, 0.3, 0.4), M(0xa1887f), -1.6 + i * 0.75, 0.45, -1.85); // sandbags
    }
    if (level >= 5) {
      usFlag(u, u.body, 1.7, -0.6, 4.6, 1.1);
      part(u.body, boxGeo(0.9, 0.9, 0.9), M(0xffc107), -0.4, 0.75, 1.5); // gold stack
    }
  }
  u.tracer = 0x76ff03;
  u.static = true;
  return u;
}
export const makeOilDerrickBottom = (level) => makeOilDerrick(level, true);

/**
 * Combat Medic: a camo medic with a rifle, a red-cross helmet and armband. Top path: a drum mag
 * (Lv 1), a red-tip ammo belt (Lv 2), a Revive Pack backpack (Lv 3), defib paddles (Lv 4), then an
 * armored vest and green visor (Lv 5). Bottom path: med pouches (Lv 1), a big med bag (Lv 2), a
 * drone pack with a Medic Drone on it (Lv 3), an antenna (Lv 4), then a cyan visor and 2 drones (Lv 5).
 */
export function makeCombatMedic(level, bottom = false) {
  const top = !bottom;
  const h = makeHumanoid({ skin: 0xc68642, shirt: 0x5b6b3a, pants: 0x4e5b31, arms: 0x5b6b3a, face: 'soldier' });
  const { M } = h;
  const red = M(0xd32f2f);
  const white = M(0xfafafa);
  helmet(h, 0x556b2f);
  part(h.head, boxGeo(0.5, 0.5, 0.06), white, 0, 1.3, 0.74);
  part(h.head, boxGeo(0.4, 0.12, 0.07), red, 0, 1.3, 0.76);
  part(h.head, boxGeo(0.12, 0.4, 0.07), red, 0, 1.3, 0.76);
  part(h.leftArm, boxGeo(1.05, 0.45, 1.05), white, 0, -0.5, 0); // armband
  part(h.leftArm, boxGeo(1.07, 0.12, 0.3), red, 0, -0.5, 0);
  part(h.torso, boxGeo(0.6, 0.18, 0.06), red, 0.45, 0.45, 0.52);
  part(h.torso, boxGeo(0.18, 0.6, 0.06), red, 0.45, 0.45, 0.52);
  const dark = M(0x212121);
  const gun = holdLongGun(h, 2.0, dark);
  part(gun, boxGeo(0.4, 0.6, 0.5), M(0x37474f), 0, -0.4, 0);
  if (top) {
    if (level >= 1) cylPart(gun, 0.35, 0.35, 0.3, dark, 0, -0.9, -0.4).rotation.z = Math.PI / 2; // drum mag
    if (level >= 2) part(h.torso, boxGeo(0.28, 2.3, 1.12), M(0xc9a227), 0, 0.1, 0).rotation.z = -0.6; // ammo belt
    if (level >= 3) {
      // Revive Pack: a backpack with a glowing green cross.
      part(h.torso, boxGeo(1.4, 1.6, 0.7), M(0x33691e), 0, 0, -0.85);
      const g = glow(h, 0x69f0ae);
      part(h.torso, boxGeo(0.7, 0.2, 0.08), g, 0, 0.1, -1.22);
      part(h.torso, boxGeo(0.2, 0.7, 0.08), g, 0, 0.1, -1.22);
    }
    if (level >= 4) for (const x of [-0.7, 0.7]) part(h.torso, boxGeo(0.35, 0.5, 0.2), M(0xffeb3b), x, -0.6, 0.6); // defib paddles
    if (level >= 5) {
      part(h.torso, boxGeo(2.15, 1.6, 1.15), M(0x37412a), 0, 0.15, 0);
      part(h.head, boxGeo(1.2, 0.3, 0.1), glow(h, 0x69f0ae), 0, 0.7, 0.63);
    }
  } else {
    if (level >= 1) for (const x of [-0.6, 0]) part(h.torso, boxGeo(0.45, 0.45, 0.3), M(0x3e4a26), x, -0.7, 0.6); // pouches
    if (level >= 2) part(h.torso, boxGeo(0.8, 0.9, 1.0), red, 1.3, -0.8, 0); // med bag
    if (level >= 3) {
      // Medic Drone pack: a back frame with a little quadcopter docked on top.
      part(h.torso, boxGeo(1.4, 1.6, 0.6), M(0x455a64), 0, 0, -0.8);
      const drones = level >= 5 ? [-0.6, 0.6] : [0];
      for (const x of drones) {
        part(h.torso, boxGeo(0.6, 0.25, 0.6), white, x, 1.25, -0.8);
        part(h.torso, boxGeo(0.2, 0.06, 0.2), red, x, 1.4, -0.8);
        for (const [dx, dz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) blurDisc(h, h.torso, 0.22, x + dx, 1.4, -0.8 + dz);
      }
    }
    if (level >= 4) {
      part(h.torso, boxGeo(0.08, 1.4, 0.08), dark, -0.6, 1.4, -1.0);
      part(h.torso, boxGeo(0.2, 0.2, 0.2), glow(h, 0xff1744), -0.6, 2.1, -1.0);
    }
    if (level >= 5) part(h.head, boxGeo(1.2, 0.3, 0.1), glow(h, 0x18ffff), 0, 0.7, 0.63);
  }
  h.medi = 0x69f0ae;
  h.tracer = 0xffe082;
  return h;
}
export const makeCombatMedicBottom = (level) => makeCombatMedic(level, true);

/**
 * Refractor (alternate Phaser form): a white-and-gold armored gunner with a crystal laser emitter.
 * Top path: glowing cells (Lv 1), a chest fusion core (Lv 2), splitter prisms on the gun (Lv 3),
 * shoulder coils (Lv 4), then a halo of orbs (Lv 5). Bottom path: shoulder pads (Lv 1), a power
 * pack (Lv 2), a bigger red-gold cannon (Lv 3), a visor (Lv 4), then the huge Calamity cannon (Lv 5).
 * The Bottom path draws a steady beam (`beam`); the Top path fires thick golden tracers.
 */
export function makeRefractor(level, bottom = false) {
  const top = !bottom;
  const hot = bottom && level >= 3;
  const color = hot ? (level >= 5 ? 0xff1744 : 0xff6d00) : 0xffd740;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: 0xeceff1, pants: 0x90a4ae, arms: 0xeceff1, face: 'soldier' });
  const { M } = h;
  const gold = M(0xffc107);
  const beam = glow(h, color);
  part(h.head, boxGeo(1.4, 1.35, 1.4), gold, 0, 0.65, -0.03);
  part(h.head, boxGeo(1.2, 0.3, 0.08), beam, 0, 0.72, 0.68);
  part(h.torso, boxGeo(2.15, 1.4, 1.15), M(0xfafafa), 0, 0.3, 0);
  if (top) {
    if (level >= 1) for (let i = 0; i < 3; i++) part(h.torso, boxGeo(0.3, 1.2, 0.3), beam, -0.45 + i * 0.45, 0, -0.65);
    if (level >= 2) part(h.torso, boxGeo(0.6, 0.6, 0.1), beam, 0, 0.3, 0.6);
    if (level >= 4) for (const x of [-1.4, 1.4]) {
      part(h.torso, boxGeo(0.8, 0.45, 1.3), gold, x, 1.0, 0);
      part(h.torso, boxGeo(0.3, 0.6, 0.3), beam, x, 1.5, 0);
    }
    if (level >= 5) for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(h.head, boxGeo(0.25, 0.25, 0.25), beam, Math.cos(a) * 0.9, 1.8, Math.sin(a) * 0.9);
    }
  } else {
    if (level >= 1) for (const x of [-1.4, 1.4]) part(h.torso, boxGeo(0.8, 0.45, 1.3), gold, x, 1.0, 0);
    if (level >= 2) {
      part(h.torso, boxGeo(1.5, 1.7, 0.7), M(0x37474f), 0, 0, -0.85);
      part(h.torso, boxGeo(0.8, 0.8, 0.1), beam, 0, 0, -1.22);
    }
    if (level >= 4) part(h.head, boxGeo(1.3, 0.45, 0.1), beam, 0, 0.75, 0.7);
    if (level >= 5) for (const x of [-0.45, 0, 0.45]) part(h.head, boxGeo(0.2, 0.7, 0.2), gold, x, 1.6, 0); // crest
  }
  const len = hot ? (level >= 5 ? 3.0 : 2.5) : 2.0;
  const gun = holdLongGun(h, len, gold);
  const bw = hot ? 0.8 : 0.55;
  part(gun, boxGeo(bw, 0.8, bw), M(0xfafafa), 0, -0.4, 0);
  for (let i = 0; i < (hot ? 3 : 2); i++) part(gun, boxGeo(bw + 0.1, 0.12, bw + 0.1), beam, 0, -1.0 - i * 0.4, 0);
  const prism = part(gun, boxGeo(0.45, 0.45, 0.45), beam, 0, -len, 0); // crystal emitter
  prism.rotation.set(0.6, 0.6, 0);
  if (top && level >= 3) for (const x of [-0.35, 0.35]) part(gun, boxGeo(0.22, 0.22, 0.22), beam, x, -len + 0.3, 0).rotation.set(0.6, 0.6, 0);
  h.muzzles[0].position.y = -len - 0.25;
  h.tracer = color;
  if (bottom) h.beam = color;
  else h.tracerWidth = 0.3;
  return h;
}
export const makeRefractorBottom = (level) => makeRefractor(level, true);

/**
 * Scout Helicopter: a small helipad, plus a little helicopter the view hovers around. Lv 1 a sensor
 * ball (stealth reveal), Lv 2 rocket pods, Lv 3 a second pair of pods, Lv 4 a radar dome, Lv 5 the
 * V-Osprey: a tilt-rotor with two big rotors on its wing tips and a bomb bay.
 */
export function makeScoutHeli(level) {
  const u = makeThing();
  const { M } = u;
  part(u.body, boxGeo(3.6, 0.3, 3.6), M(0x616161), 0, 0.15, 0);
  const white = M(0xfafafa);
  part(u.body, boxGeo(0.3, 0.05, 1.6), white, -0.5, 0.32, 0);
  part(u.body, boxGeo(0.3, 0.05, 1.6), white, 0.5, 0.32, 0);
  part(u.body, boxGeo(0.7, 0.05, 0.3), white, 0, 0.32, 0);
  for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) part(u.body, boxGeo(0.22, 0.22, 0.22), glowThing(u, 0x76ff03), x, 0.42, z);
  const heli = new THREE.Group();
  const bank = new THREE.Group();
  heli.add(bank);
  const muzzles = [];
  const missiles = [];
  const point = (x, y, z, list) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    bank.add(m);
    list.push(m);
  };
  const osprey = level >= 5;
  const body = M(osprey ? 0x5f6b73 : 0x7d8a5a);
  const dark = M(0x212121);
  const prop = new THREE.Group();
  let tail = null;
  if (osprey) {
    part(bank, boxGeo(2.2, 2.0, 6.0), body, 0, 0, 0);
    part(bank, boxGeo(1.8, 1.4, 1.4), body, 0, -0.1, 3.5); // nose
    part(bank, boxGeo(1.6, 0.8, 0.9), M(0x81d4fa), 0, 0.5, 3.4);
    part(bank, boxGeo(8.0, 0.25, 1.4), body, 0, 1.1, 0.3); // wing
    for (const x of [-4, 4]) {
      part(bank, boxGeo(0.8, 0.8, 2.0), body, x, 1.2, 0.3); // nacelles, tilted up
      blurDisc(u, bank, 2.6, x, 2.4, 0.3);
    }
    prop.position.set(-4, 2.3, 0.3);
    for (let i = 0; i < 3; i++) part(prop, boxGeo(0.25, 0.06, 5), M(0x2b2b2b), 0, 0, 0).rotation.y = (i * Math.PI) / 3;
    bank.add(prop);
    part(bank, boxGeo(3.0, 0.15, 1.0), body, 0, 0.6, -3.4); // tailplane
    for (const x of [-1.5, 1.5]) part(bank, boxGeo(0.15, 1.4, 0.9), body, x, 1.2, -3.4); // twin fins
    part(bank, boxGeo(1.0, 0.3, 1.4), dark, 0, -1.05, 0.2); // bomb bay
    for (const x of [-0.8, 0.8]) part(bank, boxGeo(0.3, 0.3, 0.3), dark, x, -0.6, 3.6);
    for (const x of [-0.8, 0.8]) point(x, -0.6, 4.0, muzzles);
    for (const x of [-1.3, 1.3]) {
      part(bank, boxGeo(0.45, 0.45, 1.6), M(0x37474f), x * 1.8, 0.8, 0.5);
      point(x * 1.8, 0.8, 1.4, missiles);
    }
  } else {
    part(bank, boxGeo(1.7, 1.6, 3.0), body, 0, 0, 0.2); // cabin
    part(bank, boxGeo(1.4, 1.1, 0.9), body, 0, -0.15, 2.0); // nose
    part(bank, boxGeo(1.3, 0.8, 0.8), M(0x81d4fa), 0, 0.35, 1.7);
    part(bank, boxGeo(0.55, 0.55, 3.6), body, 0, 0.35, -2.9); // tail boom
    part(bank, boxGeo(0.12, 1.2, 0.8), body, 0, 0.9, -4.6);
    for (const x of [-0.75, 0.75]) part(bank, boxGeo(0.12, 0.12, 2.8), dark, x, -1.1, 0.3); // skids
    part(bank, boxGeo(0.35, 0.5, 0.35), dark, 0, 1.05, 0.2);
    prop.position.set(0, 1.35, 0.2);
    for (let i = 0; i < 2; i++) part(prop, boxGeo(0.3, 0.06, 7), M(0x2b2b2b), 0, 0, 0).rotation.y = (i * Math.PI) / 2;
    bank.add(prop);
    tail = new THREE.Group();
    tail.position.set(0.12, 0.9, -4.6);
    bank.add(tail);
    part(tail, boxGeo(0.06, 1.5, 0.2), M(0x2b2b2b), 0, 0, 0);
    // Door gunners' rifles poking out of both sides.
    for (const side of [-1, 1]) {
      part(bank, boxGeo(0.12, 0.12, 1.2), dark, side * 1.0, -0.1, 0.6);
      point(side * 1.0, -0.1, 1.25, muzzles);
    }
    if (level >= 1) {
      part(bank, boxGeo(0.6, 0.6, 0.6), dark, 0, -0.85, 2.2); // sensor ball
      part(bank, boxGeo(0.3, 0.3, 0.08), glowThing(u, 0x76ff03), 0, -0.85, 2.52);
    }
    if (level >= 2) {
      const pods = level >= 3 ? 2 : 1;
      for (const side of [-1, 1]) {
        part(bank, boxGeo(1.0 + pods * 0.4, 0.12, 0.7), body, side * (1.2 + pods * 0.2), -0.3, 0.1);
        for (let k = 0; k < pods; k++) {
          const x = side * (1.4 + k * 0.5);
          part(bank, boxGeo(0.38, 0.38, 1.3), M(0x37474f), x, -0.6, 0.2);
          part(bank, boxGeo(0.26, 0.26, 0.08), glowThing(u, 0xff3d00), x, -0.6, 0.86);
          point(x, -0.6, 0.9, missiles);
        }
      }
    }
    if (level >= 4) {
      part(bank, boxGeo(0.9, 0.45, 0.9), M(0xeceff1), 0, 1.0, 1.3); // radar dome
      part(bank, boxGeo(0.08, 1.0, 0.08), dark, -0.6, 1.2, -0.8);
    }
  }
  const bay = new THREE.Object3D();
  bay.position.set(0, -1.2, 0.2);
  bank.add(bay);
  heli.userData = { bank, prop, tail, bay, missiles };
  u.plane = heli;
  u.heli = true;
  u.muzzles = muzzles;
  u.spin = null;
  u.flyHeight = 11;
  u.tracer = 0xffd740;
  u.projectile = { color: 0x424242, size: 0.6 };
  return u;
}

/**
 * Noob Tuber (alternate Paintballer form): a classic noob with a grenade launcher. Lv 1 a grenade
 * bandolier, Lv 2 the MGL drum, Lv 3 red IR goggles and a scope. Lv 4 it mans a mounted 2x2-tube
 * launcher turret behind sandbags, and Lv 5 the X-Turret with nine tubes.
 */
export function makeNoobTuber(level) {
  if (level >= 4) {
    const u = makeThing();
    const { M } = u;
    const x5 = level >= 5;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(u.body, boxGeo(1.3, 0.6, 0.7), M(0xa1887f), Math.cos(a) * 1.7, 0.3, Math.sin(a) * 1.7).rotation.y = -a + Math.PI / 2; // sandbags
    }
    part(u.body, boxGeo(0.5, 1.6, 0.5), M(0x424242), 0, 0.8, 0.3); // mount
    const t = new THREE.Group();
    t.position.set(0, 1.9, 0.4);
    u.body.add(t);
    const n = x5 ? 3 : 2;
    const tubeM = M(x5 ? 0x263238 : 0x4e5b31);
    part(t, boxGeo(n * 0.5 + 0.3, n * 0.5 + 0.3, 1.2), M(x5 ? 0x37474f : 0x556b2f), 0, 0, 0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = (i - (n - 1) / 2) * 0.5;
      const y = (j - (n - 1) / 2) * 0.5;
      part(t, boxGeo(0.38, 0.38, 1.2), tubeM, x, y, 1.1);
      gunMuzzle(u, t, x, y, 1.75);
    }
    if (x5) part(t, boxGeo(n * 0.5 + 0.4, 0.15, 1.3), glowThing(u, 0xff6d00), 0, n * 0.25 + 0.2, 0);
    // The noob sits behind it.
    const h = makeHumanoid({ face: 'smile' });
    h.root.scale.setScalar(0.7);
    h.root.position.set(0, 0, -1.2);
    h.rightArm.rotation.x = -1.3;
    h.leftArm.rotation.x = -1.3;
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.tracer = 0xffab40;
    u.projectile = { color: 0x558b2f, size: 0.5 };
    u.static = true;
    return u;
  }
  const h = makeHumanoid({ face: 'smile' }); // the classic noob colors
  const { M } = h;
  const olive = M(0x4e5b31);
  const gun = holdLongGun(h, 1.6, olive);
  part(gun, boxGeo(0.55, 1.0, 0.6), olive, 0, -1.1, 0); // fat barrel
  part(gun, boxGeo(0.3, 0.5, 0.4), M(0x212121), 0, -0.2, 0.3); // grip
  if (level >= 1) {
    const strap = part(h.torso, boxGeo(0.25, 2.4, 1.12), M(0x5d4037), 0, 0, 0);
    strap.rotation.z = 0.7;
    for (let i = 0; i < 4; i++) part(h.torso, boxGeo(0.22, 0.3, 0.22), M(0x558b2f), -0.6 + i * 0.4, 0.5 - i * 0.35, 0.6);
  }
  if (level >= 2) cylPart(gun, 0.5, 0.5, 0.5, M(0x37474f), 0, -0.55, 0).rotation.z = Math.PI / 2; // MGL drum
  if (level >= 3) {
    part(h.head, boxGeo(1.25, 0.3, 0.1), glow(h, 0xff1744), 0, 0.7, 0.63); // IR goggles
    part(gun, boxGeo(0.22, 0.5, 0.3), M(0x212121), 0, -0.6, 0.45);
  }
  h.muzzles[0].position.y = -1.7;
  h.tracer = 0xffab40;
  h.projectile = { color: 0x558b2f, size: 0.45 };
  return h;
}

/**
 * Stinger (alternate Marksman form): a soldier in desert camo with a rocket tube on his shoulder
 * and a handgun. Lv 1 a helmet, Lv 2 an IFF radar box on the tube, Lv 3 a bigger warhead, Lv 4 the
 * M202 Flash (a 2x2 tube box), Lv 5 the X-Stinger: one big launcher with glowing rings, and armor.
 */
export function makeStinger(level) {
  const x5 = level >= 5;
  const h = makeHumanoid({ skin: 0xd7a26b, shirt: x5 ? 0x37474f : 0xc2a878, pants: x5 ? 0x263238 : 0xa38f62, arms: x5 ? 0x37474f : 0xc2a878, face: 'soldier' });
  const { M } = h;
  if (level >= 1) helmet(h, x5 ? 0x263238 : 0x8d7b55);
  const tubeM = M(x5 ? 0x263238 : 0x556b2f);
  const launcher = new THREE.Group();
  launcher.position.set(-1.1, 4.6, 0.3); // on the right shoulder
  h.body.add(launcher);
  let len = 3.0;
  if (level === 4) {
    part(launcher, boxGeo(1.0, 1.0, 2.6), tubeM, 0, 0, 0.3);
    for (const x of [-0.25, 0.25]) for (const y of [-0.25, 0.25]) part(launcher, boxGeo(0.4, 0.4, 0.1), M(0x111111), x, y, 1.62);
    len = 2.6;
  } else {
    const r = x5 ? 0.45 : level >= 3 ? 0.32 : 0.26;
    len = x5 ? 3.6 : 3.0;
    part(launcher, boxGeo(r * 2, r * 2, len), tubeM, 0, 0, 0.3);
    part(launcher, boxGeo(r * 2 + 0.1, r * 2 + 0.1, 0.25), M(0x212121), 0, 0, 0.3 + len / 2);
    if (level >= 3) part(launcher, boxGeo(r * 1.6, r * 1.6, 0.1), glow(h, x5 ? 0x40c4ff : 0xff3d00), 0, 0, 0.3 + len / 2 + 0.15);
    if (x5) for (let i = 0; i < 3; i++) part(launcher, boxGeo(1.05, 1.05, 0.15), glow(h, 0x40c4ff), 0, 0, -0.6 + i * 0.8);
  }
  if (level >= 2) {
    part(launcher, boxGeo(0.5, 0.4, 0.6), M(0x37474f), 0.55, 0, 0.4); // IFF box
    part(launcher, boxGeo(0.06, 0.6, 0.06), M(0x212121), 0.55, 0.45, 0.4);
  }
  part(launcher, boxGeo(0.25, 0.5, 0.25), M(0x212121), 0, -0.5, 0.8); // grip
  setMuzzle(h, launcher, 0, 0, 0.3 + len / 2 + 0.3);
  if (x5) part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x455a64), 0, 0.15, 0); // armor
  addPistol(h, h.leftArm, false); // the close-range handgun
  h.rightArm.rotation.set(-2.6, 0, 0.1);
  h.leftArm.rotation.set(-1.4, 0, -0.1);
  h.pose = { right: -2.6, left: -1.4, leftRecoil: 0.3 };
  h.recoilScale = 0.4;
  h.tracer = 0xffab40;
  h.projectile = { color: 0xeceff1, size: 0.5 };
  return h;
}

/**
 * Jet Trooper: a launch pad, plus a soldier with a jetpack that the view hovers above it (like a
 * helicopter, so it can fly wherever the sim puts it). Top path: a longer mag (Lv 1), bigger
 * thrusters (Lv 2), a sensor visor (Lv 3), an ammo belt (Lv 4), then white-blue Air Defender armor
 * with wings (Lv 5). Bottom path: an antenna (Lv 1), a heavy vest (Lv 2), an orange explosive-ammo
 * rifle (Lv 3), fuel tanks for fire rounds (Lv 4), then the black-red X-Jet Suit with wings (Lv 5).
 */
export function makeJetTrooper(level, bottom = false) {
  const u = makeThing();
  const { M } = u;
  const top = !bottom;
  const x5 = level >= 5;
  part(u.body, boxGeo(3.2, 0.3, 3.2), M(0x455a64), 0, 0.15, 0);
  for (const z of [-0.6, 0.4]) part(u.body, boxGeo(1.2, 0.05, 0.3), M(0xfdd835), 0, 0.32, z).rotation.y = 0.0;
  for (const [x, z] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) part(u.body, boxGeo(0.2, 0.2, 0.2), glowThing(u, 0xff9100), x, 0.4, z);
  const suit = x5 ? (top ? 0xeceff1 : 0x1a1a1a) : 0x546e7a;
  const h = makeHumanoid({ skin: 0xc68642, shirt: suit, pants: x5 ? (top ? 0x1565c0 : 0x111111) : 0x37474f, arms: suit, face: 'soldier' });
  u.mats.push(...h.mats);
  const hm = h.M;
  const accent = x5 ? (top ? 0x40c4ff : 0xff1744) : 0xff9100;
  helmet(h, x5 ? (top ? 0x1565c0 : 0x212121) : 0x37474f, false);
  // Jetpack with two nozzles and flames.
  part(h.torso, boxGeo(1.4, 1.6, 0.8), hm(0x78909c), 0, 0.1, -0.9);
  const big = (top && level >= 2) || x5;
  for (const x of [-0.45, 0.45]) {
    part(h.torso, boxGeo(big ? 0.55 : 0.4, 0.5, big ? 0.55 : 0.4), hm(0x37474f), x, -0.9, -0.9);
    part(h.torso, boxGeo(0.35, big ? 1.4 : 0.9, 0.35), clearMat(h, accent === 0xff1744 ? 0xff6d00 : 0xffab40, 0.75), x, big ? -1.9 : -1.6, -0.9);
  }
  const gun = holdLongGun(h, 1.8, hm(bottom && level >= 3 ? 0xe65100 : 0x212121));
  part(gun, boxGeo(0.4, 0.6, 0.5), hm(0x37474f), 0, -0.4, 0);
  if (top) {
    if (level >= 1) part(gun, boxGeo(0.3, 0.6, 0.35), hm(0x212121), 0, -0.7, -0.35);
    if (level >= 3) part(h.head, boxGeo(1.2, 0.3, 0.1), glow(h, 0x76ff03), 0, 0.7, 0.63);
    if (level >= 4) part(h.torso, boxGeo(0.28, 2.3, 1.12), hm(0xc9a227), 0, 0.1, 0).rotation.z = 0.6;
  } else {
    if (level >= 1) part(h.head, boxGeo(0.08, 1.0, 0.08), hm(0x212121), 0.55, 1.5, -0.3);
    if (level >= 2) part(h.torso, boxGeo(2.15, 1.6, 1.15), hm(0x4e5b31), 0, 0.15, 0);
    if (level >= 3) part(gun, boxGeo(0.45, 0.7, 0.45), hm(0x424242), 0, -1.1, -0.35); // under-barrel launcher
    if (level >= 4) for (const x of [-0.85, 0.85]) cylPart(h.torso, 0.22, 0.22, 1.2, glow(h, 0xff6d00), x, 0.1, -0.9);
  }
  if (x5) {
    part(h.head, boxGeo(1.25, 0.3, 0.1), glow(h, accent), 0, 0.7, 0.63);
    for (const side of [-1, 1]) part(h.torso, boxGeo(2.4, 0.15, 1.0), hm(top ? 0xb0bec5 : 0x212121), side * 1.8, 0.4, -0.9).rotation.z = side * -0.25; // wings
  }
  h.leftLeg.rotation.x = 0.25; // legs dangle
  h.rightLeg.rotation.x = 0.1;
  const heli = new THREE.Group();
  const bank = new THREE.Group();
  heli.add(bank);
  h.root.position.y = -2.5;
  bank.add(h.root);
  const prop = new THREE.Object3D(); // nothing spins
  bank.add(prop);
  const bay = new THREE.Object3D();
  bay.position.set(0, -2.5, 0);
  bank.add(bay);
  heli.userData = { bank, prop, tail: null, bay, missiles: [] };
  u.plane = heli;
  u.heli = true;
  u.muzzles = h.muzzles;
  u.spin = null;
  u.flyHeight = 8;
  u.tracer = bottom && level >= 3 ? 0xff6d00 : 0xffd740;
  return u;
}
export const makeJetTrooperBottom = (level) => makeJetTrooper(level, true);

/**
 * Combat Drone: a charging pad, plus a quadcopter the view hovers above it. Top path: a longer AR
 * barrel (Lv 1), an ammo box (Lv 2), a spinning gatling (Lv 3), rocket pods (Lv 4), then the black
 * X22 with red glow (Lv 5). Bottom path: a sensor camera (Lv 1), extra ammo (Lv 2), then the Reaper
 * Drone, a fixed-wing UAV with missiles (Lv 3), a spotter laser (Lv 4) and P.A.V.E missiles (Lv 5).
 */
export function makeCombatDrone(level, bottom = false) {
  const u = makeThing();
  const { M } = u;
  const top = !bottom;
  part(u.body, boxGeo(3.0, 0.4, 3.0), M(0x37474f), 0, 0.2, 0);
  part(u.body, boxGeo(2.0, 0.06, 2.0), glowThing(u, 0x00e5ff), 0, 0.42, 0);
  part(u.body, boxGeo(0.8, 1.2, 0.5), M(0x263238), 1.2, 0.9, -1.2); // charger
  const heli = new THREE.Group();
  const bank = new THREE.Group();
  heli.add(bank);
  const muzzles = [];
  const missiles = [];
  const point = (x, y, z, list) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    bank.add(m);
    list.push(m);
  };
  const dark = M(0x212121);
  const prop = new THREE.Object3D();
  bank.add(prop);
  const spin = [];
  const reaper = bottom && level >= 3;
  if (reaper) {
    const grey = M(0x9e9e9e);
    part(bank, boxGeo(0.9, 0.8, 4.4), grey, 0, 0, 0); // fuselage
    part(bank, boxGeo(0.8, 0.6, 0.8), grey, 0, 0.2, 2.4); // bulbous nose
    part(bank, boxGeo(8.0, 0.12, 0.8), grey, 0, 0.2, 0.2); // long thin wings
    for (const side of [-1, 1]) part(bank, boxGeo(1.6, 0.1, 0.6), grey, side * 0.7, 0.5, -2.0).rotation.z = side * 0.6; // V tail
    blurDisc(u, bank, 0.8, 0, 0, -2.3).rotation.x = Math.PI / 2; // pusher prop
    part(bank, boxGeo(0.5, 0.5, 0.5), dark, 0, -0.55, 1.6); // sensor ball
    part(bank, boxGeo(0.25, 0.25, 0.06), glowThing(u, level >= 4 ? 0xff1744 : 0x00e5ff), 0, -0.55, 1.86);
    for (const x of [-1.6, 1.6, ...(level >= 5 ? [-2.6, 2.6] : [])]) {
      part(bank, boxGeo(0.25, 0.25, 1.4), M(level >= 5 ? 0x37474f : 0x546e7a), x, -0.15, 0.3);
      part(bank, boxGeo(0.2, 0.2, 0.06), glowThing(u, 0xff3d00), x, -0.15, 1.02);
      point(x, -0.15, 1.05, muzzles);
    }
    missiles.push(...muzzles);
  } else {
    const x22 = top && level >= 5;
    const body = M(x22 ? 0x1a1a1a : 0x546e7a);
    part(bank, boxGeo(1.4, 0.6, 1.8), body, 0, 0, 0);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      part(bank, boxGeo(0.15, 0.15, 1.5), dark, x * 0.55, 0.1, z * 0.55).rotation.y = x * z * -Math.PI / 4; // arms
      part(bank, boxGeo(0.3, 0.3, 0.3), dark, x * 1.1, 0.2, z * 1.1);
      blurDisc(u, bank, 0.75, x * 1.1, 0.4, z * 1.1);
    }
    if (x22) for (const x of [-0.71, 0.71]) part(bank, boxGeo(0.05, 0.2, 1.6), glowThing(u, 0xff1744), x, 0, 0);
    const gun = new THREE.Group();
    gun.position.set(0, -0.5, 0.6);
    bank.add(gun);
    part(gun, boxGeo(0.4, 0.4, 0.6), dark, 0, 0, 0);
    if (top && level >= 3) {
      const barrels = new THREE.Group();
      barrels.position.set(0, 0, 0.3);
      barrels.rotation.x = Math.PI / 2;
      gun.add(barrels);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        part(barrels, boxGeo(0.07, 1.3, 0.07), x22 ? glowThing(u, 0xff1744) : dark, Math.cos(a) * 0.13, 0.65, Math.sin(a) * 0.13);
      }
      spin.push(barrels);
      point(0, -0.5, 2.2, muzzles);
    } else {
      const len = top && level >= 1 ? 1.4 : 0.9;
      part(gun, boxGeo(0.14, 0.14, len), dark, 0, 0, 0.3 + len / 2);
      point(0, -0.5, 0.9 + len, muzzles);
    }
    if (level >= 2) part(bank, boxGeo(0.5, 0.4, 0.6), M(0x4e5b31), 0.6, -0.45, -0.3); // ammo box
    if (bottom && level >= 1) {
      part(bank, boxGeo(0.4, 0.4, 0.4), dark, 0, -0.5, -0.5);
      part(bank, boxGeo(0.2, 0.2, 0.06), glowThing(u, 0x00e5ff), 0, -0.5, -0.28);
    }
    if (top && level >= 4) for (const side of [-1, 1]) {
      part(bank, boxGeo(0.4, 0.4, 1.1), M(0x37474f), side * 0.95, -0.35, 0.2);
      part(bank, boxGeo(0.3, 0.3, 0.06), glowThing(u, 0xff3d00), side * 0.95, -0.35, 0.78);
      point(side * 0.95, -0.35, 0.8, missiles);
    }
    if (x22) bank.scale.setScalar(1.25);
  }
  const bay = new THREE.Object3D();
  bay.position.set(0, -0.6, 0);
  bank.add(bay);
  heli.userData = { bank, prop, tail: null, bay, missiles };
  u.plane = heli;
  u.heli = true;
  u.muzzles = muzzles;
  u.spin = spin.length ? spin : null;
  u.flyHeight = reaper ? 12 : 7;
  u.tracer = top && level >= 5 ? 0xff1744 : 0xffd740;
  if (top && level >= 5) u.tracerWidth = 0.3;
  u.projectile = { color: 0x9e9e9e, size: 0.5 };
  return u;
}
export const makeCombatDroneBottom = (level) => makeCombatDrone(level, true);
