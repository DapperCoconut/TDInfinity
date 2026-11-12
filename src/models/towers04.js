// Tower models, file 4 of 12. Each makeX(level) builds one tower's look.
// In here:
// (Classic Soldier, Ranger, Operator, Hunter: people2.js; Freezer and Cryo Ranger: people6.js;
// Pump and Combat Shotgunner: people8.js.) Machine Gunner, Boomerang, Slime, Assassin, Brawler.
// The list of which tower uses which builder is TOWER_MODELS in ../models.js.

import * as THREE from 'three';
import { boxGeo, makeHumanoid, part } from './kit.js';
import { glow, helmet, holdLongGun, setMuzzle } from './bits.js';

/**
 * Machine Gunner (alternate Gatling Gun form with two paths): a soldier behind a heavy machine gun
 * with sandbags. Top path: belt ammo at Lv 2, a Browning MG at Lv 3, twin barrels at Lv 4, an AA
 * turret shield at Lv 5. Bottom path: longer barrel at Lv 2, a glowing Laser MG from Lv 3 (cells
 * at Lv 4, an overcharged core and armor at Lv 5).
 */
export function makeMachineGunner(level, bottom = false) {
  const top = !bottom;
  const laser = bottom && level >= 3;
  const shirt = laser ? 0x263238 : 0x5d6b3a;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: laser ? 0x1c1f26 : 0x4b5320, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(laser ? 0x37474f : 0x2b2b2b);
  const beam = 0xff1744;
  helmet(h, laser ? 0x1c1f26 : 0x556b2f);
  if (laser) part(h.head, boxGeo(1.25, 0.3, 0.1), glow(h, beam), 0, 0.72, 0.64); // visor
  // Sandbags in front of its feet
  for (const x of [-0.9, 0, 0.9]) part(h.root, boxGeo(0.9, 0.55, 0.6), M(0xa1887f), x, 0.3, 1.4);
  if (bottom && level >= 5) {
    const plate = M(0x37474f);
    part(h.torso, boxGeo(0.7, 0.5, 1.3), plate, -1.35, 0.95, 0);
    part(h.torso, boxGeo(0.7, 0.5, 1.3), plate, 1.35, 0.95, 0);
    part(h.torso, boxGeo(0.6, 0.6, 0.15), glow(h, beam), 0, 0.3, 0.6); // overcharge core
  }
  const len = top && level >= 3 ? 2.1 : bottom && level >= 2 ? 2.2 : 1.9;
  const gun = holdLongGun(h, len, dark);
  part(gun, boxGeo(0.55, 0.7, 0.55), dark, 0, -0.2, 0); // heavy receiver
  part(gun, boxGeo(0.4, 0.5, 0.45), M(0x3e2723), 0, -0.55, -0.4); // ammo box
  if (top && level >= 2) part(gun, boxGeo(0.12, 0.6, 0.5), M(0xffb300), 0.32, -0.55, -0.1); // ammo belt
  if (top && level >= 4) part(gun, boxGeo(0.22, len * 0.8, 0.22), dark, 0.32, -len * 0.55, 0.05); // second barrel
  if (top && level >= 5) part(gun, boxGeo(1.4, 0.9, 0.12), M(0x546e7a), 0, -0.9, 0.5); // AA gun shield
  if (laser) {
    part(gun, boxGeo(0.3, len * 0.7, 0.3), glow(h, beam), 0, -len * 0.55, 0.2); // laser coil
    if (level >= 4) for (const x of [-0.32, 0.32]) part(gun, boxGeo(0.2, 0.4, 0.2), glow(h, 0x00e5ff), x, -0.35, -0.1); // laser cells
  }
  h.tracer = laser ? beam : 0xffd54f;
  if (laser) h.tracerWidth = 0.16;
  return h;
}
export const makeMachineGunnerBottom = (level) => makeMachineGunner(level, true);

/**
 * Boomerang tower: an outback thrower in a wide-brim hat. The boomerang gets a steel edge at
 * Lv 2, wraps at Lv 3, a second one on the back at Lv 4, and turns gold at Lv 5.
 */
export function makeBoomerang(level) {
  const master = level >= 4;
  const h = makeHumanoid({ skin: 0xc68642, shirt: master ? 0x4e342e : 0xa1887f, pants: 0x5d4037, arms: 0xc68642, face: 'smile' });
  const { M } = h;
  const hat = M(master ? 0x3e2723 : 0x8d6e63);
  part(h.head, boxGeo(2.2, 0.15, 2.2), hat, 0, 1.25, 0); // brim
  part(h.head, boxGeo(1.3, 0.5, 1.3), hat, 0, 1.55, 0);
  if (master) part(h.head, boxGeo(1.35, 0.15, 1.35), M(0xffd54f), 0, 1.37, 0); // gold hat band
  part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.85, 0); // belt
  const color = master ? 0xffc107 : level >= 1 ? 0x90a4ae : 0x8d6e63;
  const wood = M(color);
  // A V-shaped boomerang held up and back in the throwing hand.
  const makeRang = (parent, y) => {
    const g = new THREE.Group();
    g.position.set(0, y, 0);
    parent.add(g);
    for (const a of [0.6, -0.6]) {
      const arm = part(g, boxGeo(0.25, 1.2, 0.4), wood, Math.sin(a) * 0.4, -Math.cos(a) * 0.4, 0);
      arm.rotation.z = a;
    }
    if (level >= 2) part(g, boxGeo(0.35, 0.35, 0.45), M(0xc62828), 0, 0, 0); // grip wrap
    return g;
  };
  const rang = makeRang(h.rightArm, -2.2);
  if (level >= 3) makeRang(h.torso, 0).position.set(0, 0.2, -0.6); // spare on the back
  setMuzzle(h, rang, 0, -0.4, 0);
  h.rightArm.rotation.set(-2.6, 0, 0.3);
  h.leftArm.rotation.set(-0.8, 0, -0.3);
  h.pose = { right: -2.6, left: -0.8, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = { color, size: master ? 1.25 : 1 };
  return h;
}

/**
 * Slime Trooper: a hazmat suit and a goo blaster with a slime tank. Lv 2 adds a bigger tank,
 * Lv 3 a gas mask, Lv 4 a second tank, Lv 5 a glowing explosive-goo cannon.
 */
export function makeSlime(level) {
  const suit = level >= 4 ? 0x33691e : 0xfdd835;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: suit, pants: suit, arms: suit, face: 'soldier' });
  const { M } = h;
  const goo = 0x76ff03;
  part(h.head, boxGeo(1.45, 1.45, 1.45), M(suit), 0, 0.68, -0.05); // hood
  const visor = part(h.head, boxGeo(1.1, 0.7, 0.08), M(0x90caf9), 0, 0.7, 0.72);
  visor.material.transparent = true;
  visor.material.opacity = 0.7;
  if (level >= 2) {
    part(h.head, boxGeo(0.6, 0.5, 0.4), M(0x263238), 0, 0.3, 0.85); // gas mask filter
  }
  const tank = (x, tall) => {
    part(h.torso, boxGeo(0.7, tall, 0.7), M(0x607d8b), x, 0.1, -0.85);
    part(h.torso, boxGeo(0.5, tall * 0.7, 0.1), glow(h, goo), x, 0.1, -1.22);
  };
  tank(level >= 3 ? -0.45 : 0, level >= 1 ? 1.8 : 1.3);
  if (level >= 3) tank(0.45, 1.8);
  const cannon = level >= 4;
  const gun = holdLongGun(h, cannon ? 1.6 : 1.3, M(0x455a64));
  part(gun, boxGeo(cannon ? 0.7 : 0.5, 0.3, cannon ? 0.7 : 0.5), glow(h, goo), 0, -(cannon ? 1.5 : 1.2), 0); // goo nozzle
  part(gun, boxGeo(0.5, 0.6, 0.5), glow(h, goo), 0, -0.3, -0.35); // canister
  h.tracer = goo;
  h.tracerWidth = 0.32;
  h.flight = { color: goo, size: cannon ? 0.75 : 0.6, arc: 1.2, glowing: true, blob: true }; // a glob of slime
  return h;
}

/**
 * Assassin: a hooded ninja with a knife. Lv 2 adds a sash, Lv 3 a mask and second blade on the
 * back, Lv 4 glowing purple trim, Lv 5 a belt of throwing knives and a long glowing blade.
 */
export function makeAssassin(level) {
  const h = makeHumanoid({ skin: 0xd9a066, shirt: 0x1a1a24, pants: 0x14141c, arms: 0x1a1a24, face: 'agent' });
  const { M } = h;
  const cloth = M(0x22222e);
  part(h.head, boxGeo(1.45, 1.4, 1.4), cloth, 0, 0.7, -0.08); // hood
  part(h.head, boxGeo(1.25, 0.35, 0.1), M(0x111111), 0, 0.3, 0.62); // face mask
  const trim = level >= 3 ? glow(h, 0xb388ff) : M(0x8e1b1b);
  if (level >= 1) part(h.torso, boxGeo(2.1, 0.35, 1.1), trim, 0, -0.6, 0); // sash
  if (level >= 2) {
    const back = part(h.torso, boxGeo(0.2, 2.2, 0.2), M(0xb0bec5), 0, 0.3, -0.62); // spare blade
    back.rotation.z = 0.6;
  }
  if (level >= 4) for (const x of [-0.7, -0.35, 0.35, 0.7]) part(h.torso, boxGeo(0.12, 0.5, 0.12), M(0xcfd8dc), x, -0.3, 0.6);
  const knife = new THREE.Group();
  knife.position.set(0, -1.9, 0);
  h.rightArm.add(knife);
  part(knife, boxGeo(0.25, 0.5, 0.25), M(0x3e2723), 0, -0.15, 0); // handle
  const len = level >= 4 ? 1.9 : level >= 2 ? 1.4 : 1.0;
  part(knife, boxGeo(0.1, len, 0.35), level >= 4 ? glow(h, 0xb388ff) : M(0xcfd8dc), 0, -0.4 - len / 2, 0);
  setMuzzle(h, knife, 0, -0.4 - len, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  h.leftArm.rotation.set(-0.6, 0, -0.3);
  h.pose = { right: -2.4, left: -0.6, leftRecoil: 0 };
  h.swing = 1.7;
  h.melee = true;
  h.tracer = level >= 3 ? 0xb388ff : 0xffffff;
  return h;
}

/**
 * Brawler: a boxer in a tank top with big mechanical gauntlets, fists up in a guard. Lv 2 a
 * headband, Lv 3 heavier piston gauntlets, Lv 4 glowing orange knuckles, Lv 5 crackling blue
 * GALVAKNUCKLES with coils, Lv 6 (Boreas' Fury) icy white-blue gauntlets and a frost mantle.
 */
export function makeBrawler(level) {
  const boreas = level >= 5;
  const h = makeHumanoid({ skin: 0xc68642, shirt: boreas ? 0xeceff1 : 0xd32f2f, pants: boreas ? 0x1a237e : 0x263238, arms: 0xc68642, face: 'soldier' });
  const { M } = h;
  part(h.torso, boxGeo(2.1, 0.35, 1.1), M(boreas ? 0x4fc3f7 : 0xfdd835), 0, -0.85, 0); // champion belt
  part(h.torso, boxGeo(0.6, 0.4, 0.08), M(0xffd54f), 0, -0.85, 0.57); // belt plate
  if (level >= 1) part(h.head, boxGeo(1.3, 0.25, 1.3), M(boreas ? 0x81d4fa : 0xffffff), 0, 1.0, 0); // headband
  if (boreas) {
    // Frost mantle over the shoulders, with icy spikes.
    part(h.torso, boxGeo(2.4, 0.5, 1.4), M(0xb3e5fc), 0, 1.05, 0);
    for (const x of [-1.0, 1.0]) {
      const spike = part(h.torso, boxGeo(0.3, 0.9, 0.3), glow(h, 0x80d8ff), x, 1.6, 0);
      spike.rotation.z = x > 0 ? -0.4 : 0.4;
    }
  }
  const metal = M(boreas ? 0xe1f5fe : level >= 2 ? 0x546e7a : 0x78909c);
  const knuckle = level >= 4 ? glow(h, boreas ? 0x80d8ff : 0x40c4ff) : level >= 3 ? glow(h, 0xff9100) : M(0x37474f);
  const big = level >= 2 ? 1.25 : 1;
  const fists = [h.rightArm, h.leftArm].map((arm) => {
    const g = new THREE.Group();
    g.position.set(0, -1.9, 0);
    arm.add(g);
    part(g, boxGeo(1.15 * big, 0.5, 1.15 * big), M(0x37474f), 0, 0, 0); // cuff
    part(g, boxGeo(1.3 * big, 1.1 * big, 1.3 * big), metal, 0, -0.75 * big, 0); // the mechanical fist
    part(g, boxGeo(1.36 * big, 0.3, 0.5), knuckle, 0, -1.2 * big, 0.25); // knuckle plate
    if (level >= 2) for (const x of [-0.45, 0.45]) part(g, boxGeo(0.2, 0.9, 0.2), M(0x263238), x * big, -0.3, -0.7 * big); // pistons
    if (level >= 3) part(g, boxGeo(0.5, 0.5, 0.5), knuckle, 0, -0.2, -0.75 * big); // power core
    if (level >= 4) for (let i = 0; i < 2; i++) part(g, boxGeo(1.2 * big, 0.12, 1.2 * big), glow(h, boreas ? 0xe1f5fe : 0x40c4ff), 0, 0.15 + i * 0.3, 0); // coils
    return g;
  });
  setMuzzle(h, fists[0], 0, -1.4 * big, 0);
  // Fists up in a guard; each punch jabs one straight out.
  h.rightArm.rotation.set(-1.15, 0, 0.25);
  h.leftArm.rotation.set(-1.15, 0, -0.25);
  h.pose = { right: -1.15, left: -1.15, leftRecoil: 0 };
  h.swing = -0.5;
  h.punch = true;
  h.melee = true;
  h.tracer = boreas ? 0xb3e5fc : level >= 4 ? 0x40c4ff : level >= 3 ? 0xff9100 : 0xffffff;
  return h;
}

// ------------------------------------------------------------------ alternate forms & new towers (set 2)

