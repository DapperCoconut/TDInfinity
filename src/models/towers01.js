// Tower models, file 1 of 12. Each makeX(level) builds one tower's look.
// In here:
// (Scout, Classic Scout, Tweeter, Soldier: people1.js; Marksman: people2.js; Commando: people3.js.) Gold Scout, Gold Commando, Plane,
// (Aviator, Phaser, Railgunner: people4.js.)
// The list of which tower uses which builder is TOWER_MODELS in ../models.js.

import * as THREE from 'three';
import { boxGeo, makeHumanoid, part } from './kit.js';
import { addHalo, addHandgun, addWings, glow, goldify } from './bits.js';

/** Minigun on an arm pivot: body + spinning barrel cluster. Returns { muzzle, barrels }. */
export function addMinigun(h, arm, bodyMat, barrelMat) {
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  arm.add(gun);
  part(gun, boxGeo(0.6, 1.0, 0.65), bodyMat, 0, -0.45, 0);
  part(gun, boxGeo(0.3, 0.45, 0.7), h.M(0x3a3a3a), 0, -0.2, -0.55); // ammo feed
  const barrels = new THREE.Group();
  barrels.position.set(0, -1.0, 0);
  gun.add(barrels);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    part(barrels, boxGeo(0.12, 1.5, 0.12), barrelMat, Math.cos(a) * 0.2, -0.75, Math.sin(a) * 0.2);
  }
  part(barrels, boxGeo(0.5, 0.1, 0.5), bodyMat, 0, -1.3, 0); // barrel clamp
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -2.5, 0);
  gun.add(muzzle);
  return { muzzle, barrels };
}

/**
 * Golden Scout (golden perk of the base Scout). Lv 2 yellow sunglasses, Lv 3 a big golden Desert
 * Eagle, Lv 4 a detective's trench coat and fedora with two pistols, Lv 5 AGENT AU: a gold suit,
 * halo, golden wings and twin laser pistols.
 */
export function makeGoldScout(level) {
  const au = level >= 4;
  const detective = level >= 3;
  const h = makeHumanoid(
    au
      ? { skin: 0xe0ac69, shirt: 0x8a6d1d, pants: 0x6b5416, arms: 0x8a6d1d, face: 'agent' }
      : detective
        ? { skin: 0xe0ac69, shirt: 0xb08d57, pants: 0x5d4a2a, arms: 0xb08d57, face: 'agent' }
        : { skin: 0xe0ac69, shirt: 0x6b7d3a, pants: 0x4b5320, arms: 0x6b7d3a, face: 'soldier' },
  );
  const { M } = h;

  if (detective) {
    // Gilded Detective: fedora and a long trench coat
    const hat = M(au ? 0x3a2c0a : 0x4e3b1f);
    part(h.head, boxGeo(1.9, 0.12, 1.9), hat, 0, 1.25, 0);
    part(h.head, boxGeo(1.25, 0.6, 1.25), hat, 0, 1.6, 0);
    part(h.torso, boxGeo(2.1, 1.7, 0.2), M(au ? 0x8a6d1d : 0xa07f4c), 0, -1.5, -0.45); // coat tails
    part(h.torso, boxGeo(0.2, 1.4, 0.07), M(au ? 0xfff3c4 : 0x5d1a1a), 0, 0.1, 0.53); // tie
  } else {
    const helm = M(0x556b2f);
    part(h.head, boxGeo(1.45, 0.55, 1.45), helm, 0, 1.3, 0);
    part(h.head, boxGeo(1.5, 0.12, 0.45), helm, 0, 1.05, 0.62); // brim
    if (level >= 1) part(h.torso, boxGeo(1.3, 1.4, 0.6), M(0x4b5320), 0, 0.1, -0.8); // pack
  }
  if (au) addWings(h, M(0xfff3c4));

  // Guns: a small gun, then one big Deagle (Lv 3), then two pistols (Lv 4), laser pistols at Lv 5.
  const muzzles = [];
  if (level >= 3) {
    const opts = { body: 0x2b2b2b, laser: au, trim: au ? 0xfff176 : null };
    muzzles.push(addHandgun(h, h.rightArm, opts), addHandgun(h, h.leftArm, opts));
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.08);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.08);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
  } else {
    const gun = new THREE.Group();
    gun.position.set(0, -1.9, 0);
    h.rightArm.add(gun);
    const deagle = level >= 2;
    const len = deagle ? 1.5 : 1.1;
    part(gun, boxGeo(deagle ? 0.42 : 0.32, len, deagle ? 0.5 : 0.42), M(0x2b2b2b), 0, -len / 2, 0);
    part(gun, boxGeo(0.3, 0.35, 0.65), M(0x1f1f1f), 0, -0.05, -0.35); // grip
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, -len, 0);
    gun.add(muzzle);
    muzzles.push(muzzle);
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
  }

  goldify(h);

  if (level >= 1) {
    // Epic Glasses: yellow sunglasses (they stay yellow, added after the gold recolour)
    part(h.head, boxGeo(1.25, 0.1, 0.08), M(0x3a2c0a), 0, 0.8, 0.63);
    part(h.head, boxGeo(0.42, 0.3, 0.07), glow(h, 0xffea00), -0.27, 0.66, 0.63);
    part(h.head, boxGeo(0.42, 0.3, 0.07), glow(h, 0xffea00), 0.27, 0.66, 0.63);
  }
  if (au) addHalo(h, 0xfff176);

  h.muzzles = muzzles;
  h.tracer = au ? 0xfff176 : 0xffd54f;
  return h;
}

/** A big spinning cannon held in both hands: `n` barrels. Returns { muzzle, barrels }. */
export function addCannon(h, arm, bodyMat, barrelMat, n) {
  const gun = new THREE.Group();
  gun.position.set(-0.3, -1.9, 0);
  arm.add(gun);
  part(gun, boxGeo(0.95, 1.3, 1.0), bodyMat, 0, -0.55, 0);
  part(gun, boxGeo(0.45, 0.6, 1.0), h.M(0x3a3a3a), 0, -0.3, -0.8); // ammo feed
  const barrels = new THREE.Group();
  barrels.position.set(0, -1.2, 0);
  gun.add(barrels);
  const r = n > 6 ? 0.36 : 0.3;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    part(barrels, boxGeo(0.16, 2.0, 0.16), barrelMat, Math.cos(a) * r, -1.0, Math.sin(a) * r);
  }
  for (const y of [-0.3, -1.8]) part(barrels, boxGeo(0.85, 0.12, 0.85), bodyMat, 0, y, 0); // clamps
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -3.2, 0);
  gun.add(muzzle);
  return { muzzle, barrels };
}

/**
 * Golden Commando (golden perk of the base Commando). Lv 2 gold gloves, Lv 3 gold goggles,
 * Lv 4 a six-barrel Golden Heavy Cannon, Lv 5 an eight-barrel Golden Laser Cannon with golden
 * armor, wings and a halo.
 */
export function makeGoldCommando(level) {
  const heavy = level >= 3;
  const laser = level >= 4;
  const h = makeHumanoid({ skin: 0xa0522d, shirt: 0x556b2f, pants: 0x3e3a2a, arms: 0xa0522d, face: 'soldier' });
  const { M } = h;
  const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), M(0x4e342e), 0, 0, 0);
  strap.rotation.z = -0.7;
  part(h.head, boxGeo(1.28, 0.25, 1.28), M(0xc62828), 0, 1.05, 0); // bandana
  part(h.head, boxGeo(0.3, 0.6, 0.15), M(0xc62828), 0.3, 0.75, -0.66);
  if (level >= 1) {
    // Grip: gold gloves and knee pads
    const glove = M(0xffd54f);
    part(h.rightArm, boxGeo(1.05, 0.5, 1.05), glove, 0, -1.75, 0);
    part(h.leftArm, boxGeo(1.05, 0.5, 1.05), glove, 0, -1.75, 0);
    part(h.rightLeg, boxGeo(1.05, 0.4, 0.3), glove, 0, -1.2, 0.45);
    part(h.leftLeg, boxGeo(1.05, 0.4, 0.3), glove, 0, -1.2, 0.45);
  }
  if (level >= 2) {
    // Gold Goggles
    part(h.head, boxGeo(1.3, 0.12, 1.3), M(0x8d6e1a), 0, 0.72, 0);
    part(h.head, boxGeo(0.4, 0.32, 0.35), M(0x8d6e1a), -0.28, 0.7, 0.72);
    part(h.head, boxGeo(0.4, 0.32, 0.35), M(0x8d6e1a), 0.28, 0.7, 0.72);
    part(h.head, boxGeo(0.25, 0.2, 0.05), glow(h, 0xffea00), -0.28, 0.7, 0.9);
    part(h.head, boxGeo(0.25, 0.2, 0.05), glow(h, 0xffea00), 0.28, 0.7, 0.9);
    part(h.torso, boxGeo(1.6, 1.8, 0.8), M(0x3a3a3a), 0, 0, -0.9); // ammo backpack
  }
  if (laser) {
    // Golden armor: chest plate, shoulder pads, wings and a halo
    part(h.torso, boxGeo(2.2, 1.7, 1.2), M(0xeeeeee), 0, 0.1, 0);
    part(h.torso, boxGeo(0.5, 0.5, 0.1), glow(h, 0xfff176), 0, 0.3, 0.62);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.15, 0.7, 1.15), M(0xeeeeee), 0, -0.25, 0);
    addWings(h, M(0xfff3c4));
  }

  const bodyMat = M(0x424242);
  const barrelMat = laser ? glow(h, 0xfff176) : M(0x1f1f1f);
  if (heavy) {
    // Heavy / Laser Cannon: one big spinning cannon held in both hands
    const c = addCannon(h, h.rightArm, bodyMat, barrelMat, laser ? 8 : 6);
    h.muzzles = [c.muzzle];
    h.spin = [c.barrels];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.15);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.45);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.1 };
  } else {
    const g = addMinigun(h, h.rightArm, bodyMat, barrelMat);
    h.muzzles = [g.muzzle];
    h.spin = [g.barrels];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.15, 0, -0.55);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.15, leftRecoil: 0.1 };
  }

  goldify(h);
  if (laser) addHalo(h, 0xfff176);

  h.recoilScale = 0.25;
  h.tracer = laser ? 0xfff176 : 0xffd740;
  return h;
}

/** The Aviator's plane (faces +Z). Its `bank` child is rolled by the view while turning. */
export function makePlane(h, level) {
  const { M } = h;
  const plane = new THREE.Group();
  const bank = new THREE.Group();
  plane.add(bank);
  const muzzles = [];
  const missiles = [];
  const muzzle = (x, y, z, list = muzzles) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    bank.add(m);
    list.push(m);
  };
  let prop = null;

  if (level <= 2) {
    // Propeller plane (red, or spy grey at Lv 3)
    const spy = level >= 2;
    const body = M(spy ? 0x78909c : 0xd32f2f);
    const trim = M(spy ? 0x37474f : 0xfafafa);
    part(bank, boxGeo(1.2, 1.2, 5), body, 0, 0, 0);
    part(bank, boxGeo(7, 0.2, 1.5), body, 0, -0.2, 0.4); // wings
    part(bank, boxGeo(7.05, 0.22, 0.4), trim, 0, -0.2, 0.2); // wing stripe
    part(bank, boxGeo(2.6, 0.15, 0.9), body, 0, 0.1, -2.2); // tail wings
    part(bank, boxGeo(0.15, 1.1, 1.0), body, 0, 0.7, -2.2); // tail fin
    part(bank, boxGeo(0.9, 0.5, 1.1), M(0x90caf9), 0, 0.75, 0.6); // cockpit glass
    part(bank, boxGeo(0.7, 0.7, 0.4), trim, 0, 0, 2.6); // nose cone
    prop = new THREE.Group();
    prop.position.set(0, 0, 2.85);
    bank.add(prop);
    part(prop, boxGeo(0.3, 2.6, 0.1), M(0x3e2723), 0, 0, 0);
    if (level >= 1) {
      // Bombs Away: bombs under the wings
      const bombM = M(0x263238);
      part(bank, boxGeo(0.4, 0.4, 1.0), bombM, -2, -0.6, 0.4);
      part(bank, boxGeo(0.4, 0.4, 1.0), bombM, 2, -0.6, 0.4);
    }
    if (spy) {
      // Spy Plane: camera pod and radar dish
      part(bank, boxGeo(0.6, 0.5, 0.6), M(0x212121), 0, -0.8, 1.3);
      part(bank, boxGeo(0.35, 0.3, 0.1), glow(h, 0x00e5ff), 0, -0.85, 1.62);
      part(bank, boxGeo(1.6, 0.12, 1.6), M(0xeceff1), 0, 1.15, -0.6);
    }
    muzzle(-0.9, -0.2, 1.2);
    muzzle(0.9, -0.2, 1.2);
  } else if (level === 3) {
    // Rapid Fire: grey fighter jet with swept wings and an afterburner
    const body = M(0x90a4ae);
    const dark = M(0x455a64);
    part(bank, boxGeo(1.1, 1.0, 6), body, 0, 0, 0);
    part(bank, boxGeo(0.6, 0.6, 1.2), dark, 0, -0.05, 3.5); // nose
    part(bank, boxGeo(0.8, 0.5, 1.4), M(0x4fc3f7), 0, 0.6, 1.3); // canopy
    for (const side of [-1, 1]) {
      const w = part(bank, boxGeo(3.4, 0.15, 2.0), body, side * 2.0, -0.1, -0.4);
      w.rotation.y = side * 0.45;
      const fin = part(bank, boxGeo(0.12, 1.2, 1.1), dark, side * 0.5, 0.8, -2.5);
      fin.rotation.z = side * -0.3;
      part(bank, boxGeo(1.4, 0.12, 0.8), body, side * 1.0, 0, -2.7); // tail wing
    }
    part(bank, boxGeo(0.8, 0.8, 0.3), glow(h, 0xff9100), 0, 0, -3.1); // afterburner
    muzzle(-0.6, -0.2, 2.6);
    muzzle(0.6, -0.2, 2.6);
  } else {
    // Space Craft: black stealth gunship (flying wing) with glowing trim and missile pods
    const black = M(0x1c1c24);
    const trim = glow(h, 0xb388ff);
    part(bank, boxGeo(2.2, 0.8, 5), black, 0, 0, 0);
    for (const side of [-1, 1]) {
      const w = part(bank, boxGeo(4.4, 0.3, 3.0), black, side * 2.6, -0.1, -0.7);
      w.rotation.y = side * 0.55;
      const edge = part(bank, boxGeo(4.4, 0.1, 0.15), trim, side * 2.95, 0, 0.6);
      edge.rotation.y = side * 0.55;
      part(bank, boxGeo(0.5, 0.5, 1.6), M(0x37474f), side * 2.2, -0.55, 0.2); // missile pod
      part(bank, boxGeo(0.3, 0.3, 0.1), glow(h, 0xff3d00), side * 2.2, -0.55, 1.02);
      muzzle(side * 2.2, -0.55, 1.1, missiles);
    }
    part(bank, boxGeo(1.4, 0.35, 1.5), glow(h, 0x7c4dff), 0, 0.5, 1.2); // canopy
    part(bank, boxGeo(1.6, 0.4, 0.2), trim, 0, 0, -2.55); // engine glow
    muzzle(-0.7, -0.3, 2.5);
    muzzle(0.7, -0.3, 2.5);
  }
  const bay = new THREE.Object3D();
  bay.position.set(0, -0.8, 0);
  bank.add(bay);
  plane.userData = { bank, prop, bay, missiles };
  return { plane, muzzles };
}

