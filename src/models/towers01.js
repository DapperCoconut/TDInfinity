// Tower model pieces, file 1. What is left here:
// makePlane (the Aviator's plane, used by people4.js).
// Every tower is now built in machines1-8.js, people1-25.js, heroes1-3.js and cross1-3.js.

import * as THREE from 'three';
import { boxGeo, makeHumanoid, part } from './kit.js';
import { addHalo, addWings, glow, goldify } from './bits.js';

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

