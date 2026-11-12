// Tower model pieces, file 5. What is left here:
// makeAcePlane (the Ace Pilot's plane, used by people4.js).

import * as THREE from 'three';
import { boxGeo, makeHumanoid, part } from './kit.js';
import { cylGeo, glow, helmet, holdLongGun, setMuzzle } from './bits.js';

/** The Ace Pilot's plane (faces +Z): a yellow racer, a blue warbird, a grey jet from Lv 4, a gold jet at Lv 5. */
export function makeAcePlane(h, level) {
  const { M } = h;
  const plane = new THREE.Group();
  const bank = new THREE.Group();
  plane.add(bank);
  const muzzles = [];
  const muzzle = (x, y, z) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    bank.add(m);
    muzzles.push(m);
  };
  let prop = null;
  if (level <= 2) {
    const body = M(level >= 2 ? 0x1565c0 : 0xfbc02d);
    const trim = M(level >= 2 ? 0xfafafa : 0x212121);
    part(bank, boxGeo(1.1, 1.1, 4.4), body, 0, 0, 0);
    part(bank, boxGeo(6, 0.2, 1.3), body, 0, -0.2, 0.5); // wings
    for (const x of [-2.2, 2.2]) part(bank, boxGeo(0.6, 0.22, 1.32), trim, x, -0.2, 0.5); // wing tips
    part(bank, boxGeo(2.2, 0.15, 0.8), body, 0, 0.1, -1.9);
    part(bank, boxGeo(0.15, 1.0, 0.9), trim, 0, 0.65, -1.9);
    part(bank, boxGeo(0.8, 0.45, 1.0), M(0x90caf9), 0, 0.7, 0.4);
    part(bank, boxGeo(0.7, 0.7, 0.4), M(0xc62828), 0, 0, 2.3); // red nose
    prop = new THREE.Group();
    prop.position.set(0, 0, 2.55);
    bank.add(prop);
    part(prop, boxGeo(0.3, 2.4, 0.1), M(0x3e2723), 0, 0, 0);
    if (level >= 1) for (const x of [-1.8, 1.8]) part(bank, boxGeo(0.4, 0.4, 0.9), M(0x263238), x, -0.55, 0.5); // bombs
    muzzle(-0.8, -0.2, 1.4);
    muzzle(0.8, -0.2, 1.4);
  } else {
    const gold = level >= 4;
    const body = M(gold ? 0xffc107 : 0x78909c);
    const dark = M(gold ? 0x5d4037 : 0x37474f);
    part(bank, boxGeo(1.0, 0.9, 5.4), body, 0, 0, 0);
    part(bank, boxGeo(0.55, 0.55, 1.0), dark, 0, -0.05, 3.1);
    part(bank, boxGeo(0.75, 0.45, 1.3), M(0x4fc3f7), 0, 0.55, 1.1);
    for (const side of [-1, 1]) {
      const w = part(bank, boxGeo(3.0, 0.15, 1.8), body, side * 1.8, -0.1, -0.3);
      w.rotation.y = side * 0.5;
      part(bank, boxGeo(0.12, 1.1, 1.0), dark, side * 0.45, 0.75, -2.3).rotation.z = side * -0.3;
      part(bank, boxGeo(0.35, 0.35, 1.1), M(0x263238), side * 1.6, -0.45, 0.1); // bomb rack
    }
    part(bank, boxGeo(0.7, 0.7, 0.3), glow(h, gold ? 0xff3d00 : 0xff9100), 0, 0, -2.8);
    if (level >= 3) part(bank, boxGeo(0.5, 0.4, 0.5), glow(h, 0x00e5ff), 0, -0.6, 1.4); // spy camera
    muzzle(-0.55, -0.2, 2.4);
    muzzle(0.55, -0.2, 2.4);
  }
  const bay = new THREE.Object3D();
  bay.position.set(0, -0.8, 0);
  bank.add(bay);
  plane.userData = { bank, prop, bay, missiles: [] };
  return { plane, muzzles };
}

