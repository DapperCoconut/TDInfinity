// Tower models, file 11 of 12. Each makeX(level) builds one tower's look.
// In here:
// Combat Medic, Refractor, Noob Tuber, Stinger, Jet Trooper.
// (Warship: machines3.js. Shield Tower, Oil Derrick, Scout Heli, Combat Drone: machines4.js.)
// The list of which tower uses which builder is TOWER_MODELS in ../models.js.

import * as THREE from 'three';
import { boxGeo, makeHumanoid, part } from './kit.js';
import {
  addPistol, blurDisc, clearMat, cylPart, glow, glowThing, gunMuzzle, helmet, holdLongGun, makeThing, setMuzzle,
} from './bits.js';

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
