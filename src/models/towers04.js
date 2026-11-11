// Tower models, file 4 of 12. Each makeX(level) builds one tower's look.
// In here:
// Soldier Classic, Soldier Ranger, Operator Tower, Operator, Machine Gunner, Frost Freezer,
// Boomerang, Slime, Assassin, Brawler, Militant, Laser Gunner, Hunter, Shotgunner Pump,
// Shotgunner Combat, Frost Ranger.
// The list of which tower uses which builder is TOWER_MODELS in ../models.js.

import * as THREE from 'three';
import { boxGeo, makeHumanoid, part } from './kit.js';
import { glow, helmet, holdLongGun, setMuzzle } from './bits.js';

/**
 * Classic Soldier (alternate Soldier form): a rifleman in a beret. Lv 2 adds webbing, Lv 3 a
 * helmet and goggles, Lv 4 a tactical vest, Lv 5 dark gear with a red-dot rifle.
 */
export function makeSoldierClassic(level) {
  const elite = level >= 4;
  const shirt = elite ? 0x263238 : 0x5d6b3a;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: elite ? 0x1c1c22 : 0x4b5320, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(0x262626);
  if (level >= 2) {
    helmet(h, elite ? 0x37474f : 0x556b2f);
    part(h.head, boxGeo(1.25, 0.3, 0.1), M(0x263238), 0, 0.68, 0.63); // goggles
  } else part(h.head, boxGeo(1.35, 0.3, 1.35), M(0x8e1b1b), 0.1, 1.3, 0); // beret
  if (level >= 1) {
    const web = M(0x3e2723);
    for (const side of [-1, 1]) part(h.torso, boxGeo(0.3, 2.5, 1.12), web, 0, 0, 0).rotation.z = side * 0.6;
  }
  if (level >= 3) {
    part(h.torso, boxGeo(2.15, 1.7, 1.15), M(elite ? 0x37474f : 0x4a5232), 0, 0.05, 0);
    for (const x of [-0.5, 0, 0.5]) part(h.torso, boxGeo(0.35, 0.4, 0.2), M(0x5d4037), x, -0.35, 0.65);
  }
  const gun = holdLongGun(h, 1.6, dark);
  part(gun, boxGeo(0.25, 0.45, 0.5), dark, 0, -0.55, -0.4); // mag
  part(gun, boxGeo(0.25, 0.5, 0.35), M(0x6d4c41), 0, 0.15, -0.05); // stock
  if (elite) part(gun, boxGeo(0.22, 0.3, 0.3), glow(h, 0xff1744), 0, -0.8, 0.32); // red dot
  h.tracer = elite ? 0xff8a65 : 0xffd54f;
  return h;
}

/**
 * Ranger (alternate Soldier form with two paths): a field ranger in a boonie hat with a rifle.
 * Top path: laser sight at Lv 1, scope at Lv 3, heavy barrel at Lv 4, a belt-fed LMG at Lv 5.
 * Bottom path: chest rig at Lv 3, grenades at Lv 4, an M203 tube and heavy armor at Lv 5.
 */
export function makeSoldierRanger(level, bottom = false) {
  const top = !bottom;
  const shirt = bottom && level >= 5 ? 0x3e4a2a : top && level >= 5 ? 0x2e3b2f : 0x6d7b4a;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: 0x4a3f2c, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(0x262626);
  if (bottom && level >= 5) helmet(h, 0x3b4530);
  else {
    part(h.head, boxGeo(1.4, 0.35, 1.4), M(0x7d8a55), 0, 1.25, 0); // boonie hat
    part(h.head, boxGeo(1.9, 0.1, 1.9), M(0x7d8a55), 0, 1.08, 0); // brim
  }
  if (top && level >= 3) part(h.head, boxGeo(1.25, 0.28, 0.1), M(0x263238), 0, 0.72, 0.64); // tactical glasses
  if (bottom && level >= 3) {
    // Assault chest rig with ammo pouches
    part(h.torso, boxGeo(2.15, 1.6, 1.15), M(0x4b5530), 0, 0.05, 0);
    for (const x of [-0.5, 0, 0.5]) part(h.torso, boxGeo(0.35, 0.4, 0.2), M(0x5d4037), x, -0.3, 0.65);
  }
  if (bottom && level >= 4) {
    // Grenades on the chest
    for (const x of [-0.55, 0.55]) part(h.torso, boxGeo(0.3, 0.35, 0.3), M(0x33691e), x, 0.5, 0.68);
  }
  if (bottom && level >= 5) {
    const plate = M(0x37422a);
    part(h.torso, boxGeo(0.7, 0.5, 1.3), plate, -1.35, 0.95, 0);
    part(h.torso, boxGeo(0.7, 0.5, 1.3), plate, 1.35, 0.95, 0);
  }
  const lmg = top && level >= 5;
  const heavy = top && level >= 4;
  const gun = holdLongGun(h, lmg ? 2.1 : heavy ? 1.9 : 1.6, dark);
  part(gun, boxGeo(0.25, 0.5, 0.35), M(0x6d4c41), 0, 0.15, -0.05); // stock
  if (lmg) part(gun, boxGeo(0.6, 0.6, 0.6), M(0x37474f), 0, -0.6, -0.45); // box magazine
  else part(gun, boxGeo(0.25, 0.45, 0.5), dark, 0, -0.55, -0.4); // mag
  if (top && level >= 1) part(gun, boxGeo(0.12, 0.12, 0.12), glow(h, 0xff1744), 0.18, -1.2, 0.2); // laser sight
  if (top && level >= 3) part(gun, boxGeo(0.22, 0.6, 0.25), M(0x212121), 0, -0.5, 0.3); // scope
  if (bottom && level >= 5) part(gun, boxGeo(0.34, 0.9, 0.34), M(0x263238), 0, -0.9, -0.38); // M203 tube
  h.tracer = heavy || (bottom && level >= 3) ? 0xffab40 : 0xffd54f;
  h.projectile = { color: bottom && level >= 5 ? 0xff6d00 : 0x33691e, size: 0.45, arc: 3.5 };
  return h;
}
export const makeSoldierRangerBottom = (level) => makeSoldierRanger(level, true);

/**
 * Operator (two paths): a tactical soldier in a plate carrier with a semi-auto rifle.
 * Top path: knee pads at Lv 1, a helmet with NVGs at Lv 2, an assault rifle at Lv 3, a black
 * Special Forces kit at Lv 4, a dark Ghost suit with a skull mask and glowing optics at Lv 5.
 * Bottom path: heavy armor at Lv 1, a UMP-45 at Lv 2, a radio pack at Lv 3, a burst rifle at
 * Lv 4, and an X-Captain beret with gold trim at Lv 5.
 */
export function makeOperatorTower(level, bottom = false) {
  const top = !bottom;
  const ghost = top && level >= 5;
  const sf = top && level >= 4;
  const shirt = ghost ? 0x15171c : sf ? 0x22262b : bottom && level >= 5 ? 0x2f3a28 : 0x5b6640;
  const h = makeHumanoid({ skin: 0xc8956a, shirt, pants: ghost ? 0x101216 : sf ? 0x1b1e22 : 0x3e4430, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(0x212121);
  const vest = M(ghost ? 0x0c0d10 : sf ? 0x2b2f35 : 0x4a5233);
  part(h.torso, boxGeo(2.1, 1.5, 1.15), vest, 0, 0.1, 0); // plate carrier
  if (top && level >= 1) for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.4, 0.4, 0.2), M(0x3b4029), x, -0.35, 0.65); // pouches
  if (bottom && level >= 1) {
    // Heavy armor: shoulder plates and a thicker front plate
    const plate = M(0x39412b);
    part(h.torso, boxGeo(0.7, 0.45, 1.3), plate, -1.35, 0.95, 0);
    part(h.torso, boxGeo(0.7, 0.45, 1.3), plate, 1.35, 0.95, 0);
    part(h.torso, boxGeo(1.6, 1.0, 0.2), plate, 0, 0.2, 0.7);
  }
  if (bottom && level >= 3) {
    // Radio pack with an antenna (calls in the vehicles)
    part(h.torso, boxGeo(1.3, 1.3, 0.6), M(0x3b4029), 0, 0.1, -0.85);
    part(h.torso, boxGeo(0.08, 1.8, 0.08), dark, 0.45, 1.5, -0.95);
  }
  if (bottom && level >= 5) {
    // X-Captain: a beret with a gold badge, gold trim on the armor
    part(h.head, boxGeo(1.45, 0.3, 1.45), M(0x7b1f1f), 0, 1.2, -0.05);
    part(h.head, boxGeo(0.3, 0.3, 0.1), glow(h, 0xffd54f), 0.4, 1.25, 0.72);
    part(h.torso, boxGeo(2.15, 0.12, 1.2), M(0xc9a227), 0, 0.85, 0);
  } else if (ghost) {
    part(h.head, boxGeo(1.4, 1.4, 1.4), M(0x0c0d10), 0, 0.7, -0.03); // hood
    part(h.head, boxGeo(1.1, 0.5, 0.1), M(0xe0e0e0), 0, 0.35, 0.68); // skull mask
    for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.25, 0.25, 0.12), glow(h, 0x00e676), x, 0.8, 0.7); // optics
  } else if ((top && level >= 2) || (bottom && level >= 1)) {
    helmet(h, sf ? 0x1b1e22 : 0x4a5233);
    if (top && level >= 2) part(h.head, boxGeo(0.6, 0.35, 0.4), dark, 0, 1.25, 0.8); // NVGs
  } else {
    part(h.head, boxGeo(1.4, 0.3, 1.4), M(0x5b6640), 0, 1.2, 0); // cap
    part(h.head, boxGeo(1.0, 0.1, 0.5), M(0x5b6640), 0, 1.08, 0.75); // bill
  }
  if (sf && !ghost) part(h.head, boxGeo(1.3, 0.55, 0.1), M(0x111111), 0, 0.3, 0.66); // balaclava
  const smg = bottom && level === 2;
  const rifle = (top && level >= 3) || (bottom && level >= 3);
  const gun = holdLongGun(h, smg ? 1.2 : ghost ? 2.0 : rifle ? 1.8 : 1.5, ghost ? M(0x0b0b0b) : dark);
  part(gun, boxGeo(0.25, 0.5, 0.35), smg ? dark : M(0x5d4037), 0, 0.15, -0.05); // stock
  part(gun, boxGeo(0.25, smg ? 0.6 : 0.45, 0.45), dark, 0, -0.5, -0.4); // mag
  if (top && level >= 2) part(gun, boxGeo(0.22, 0.5, 0.25), M(0x263238), 0, -0.45, 0.3); // optic
  if (ghost) part(gun, boxGeo(0.36, 0.7, 0.36), M(0x1a1a1a), 0, -2.2, 0); // suppressor
  if (bottom && level >= 4) part(gun, boxGeo(0.2, 0.3, 0.2), glow(h, 0xff1744), 0.2, -1.0, 0.2); // laser
  h.tracer = ghost ? 0x00e676 : sf ? 0xffab40 : 0xffd54f;
  return h;
}
export const makeOperatorBottom = (level) => makeOperatorTower(level, true);

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
 * Freezer (alternate Frost Trooper form): a polar explorer with a Frost Ray gun. Lv 2 adds a
 * fur-trimmed hood, Lv 3 a scarf and backpack tank, Lv 4 armor plates, Lv 5 a glowing ice bow-gun.
 */
export function makeFrostFreezer(level) {
  const coat = level >= 3 ? 0x1565c0 : 0x29b6f6;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: coat, pants: 0x37474f, arms: coat, face: 'soldier' });
  const { M } = h;
  const ice = 0x80d8ff;
  part(h.head, boxGeo(1.32, 0.45, 1.32), M(0xeceff1), 0, 1.3, 0); // wool cap
  if (level >= 1) {
    part(h.head, boxGeo(1.55, 1.5, 0.3), M(0xf5f5f5), 0, 0.65, -0.6); // fur hood back
    part(h.head, boxGeo(1.3, 0.3, 0.12), M(0x263238), 0, 0.8, 0.63); // snow goggles
    part(h.head, boxGeo(1.0, 0.2, 0.06), glow(h, 0x4fc3f7), 0, 0.8, 0.69);
  }
  if (level >= 2) {
    part(h.torso, boxGeo(2.1, 0.45, 1.15), M(0xc62828), 0, 0.85, 0); // scarf
    part(h.torso, boxGeo(1.2, 1.6, 0.7), M(0x90a4ae), 0, 0.1, -0.85); // coolant tank
    part(h.torso, boxGeo(0.8, 0.8, 0.1), glow(h, ice), 0, 0.2, -1.22);
  }
  if (level >= 3) {
    const plate = M(0xb0bec5);
    part(h.torso, boxGeo(0.7, 0.5, 1.3), plate, -1.35, 0.95, 0);
    part(h.torso, boxGeo(0.7, 0.5, 1.3), plate, 1.35, 0.95, 0);
  }
  const bow = level >= 4;
  const gun = holdLongGun(h, bow ? 1.9 : 1.5, M(bow ? 0xe1f5fe : 0x546e7a));
  part(gun, boxGeo(0.3, 0.5, 0.35), M(0x37474f), 0, 0.15, -0.05); // stock
  part(gun, boxGeo(0.42, 0.42, 0.42), glow(h, ice), 0, -0.4, 0.25); // ice crystal core
  if (bow) {
    // Ice bow arms across the front of the gun.
    const arm = glow(h, ice);
    part(gun, boxGeo(2.2, 0.15, 0.15), arm, 0, -1.4, 0).rotation.y = 0;
    part(gun, boxGeo(0.15, 0.15, 0.9), arm, -1.05, -1.4, -0.35);
    part(gun, boxGeo(0.15, 0.15, 0.9), arm, 1.05, -1.4, -0.35);
  }
  h.tracer = ice;
  h.tracerWidth = 0.22;
  return h;
}

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

/**
 * Militant (alternate Mercenary form): a guerrilla fighter in a bandana with a long rifle.
 * Lv 2 adds a radio pack, Lv 3 a chest rig, Lv 4 a boonie hat and bigger rifle, Lv 5 black
 * stealth gear with a suppressor and glowing sight.
 */
export function makeMilitant(level) {
  const stealth = level >= 4;
  const shirt = stealth ? 0x1b1f24 : 0x6d6a3a;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: stealth ? 0x15181c : 0x4e4a2a, arms: shirt, face: 'soldier' });
  const { M } = h;
  if (level >= 3 && !stealth) {
    const hat = M(0x5d5a32);
    part(h.head, boxGeo(1.9, 0.12, 1.9), hat, 0, 1.25, 0);
    part(h.head, boxGeo(1.3, 0.4, 1.3), hat, 0, 1.45, 0);
  } else part(h.head, boxGeo(1.32, 0.35, 1.32), M(stealth ? 0x263238 : 0xb71c1c), 0, 1.15, 0); // bandana
  if (stealth) part(h.head, boxGeo(1.25, 0.45, 0.1), M(0x111111), 0, 0.3, 0.62); // face wrap
  if (level >= 1) {
    part(h.torso, boxGeo(1.2, 1.4, 0.6), M(0x4b5320), 0, 0.1, -0.8); // radio pack
    part(h.torso, boxGeo(0.08, 1.6, 0.08), M(0x212121), -0.4, 1.5, -0.9); // antenna
  }
  if (level >= 2) {
    part(h.torso, boxGeo(2.1, 1.0, 1.15), M(stealth ? 0x263238 : 0x4a4628), 0, -0.2, 0); // chest rig
    for (const x of [-0.55, 0, 0.55]) part(h.torso, boxGeo(0.4, 0.45, 0.2), M(0x3e2723), x, -0.3, 0.62);
  }
  const dark = M(0x262626);
  const len = level >= 3 ? 2.1 : 1.8;
  const gun = holdLongGun(h, len, dark);
  part(gun, boxGeo(0.25, 0.5, 0.45), dark, 0, -0.6, -0.4); // mag
  part(gun, boxGeo(0.25, 0.5, 0.35), M(stealth ? 0x37474f : 0x6d4c41), 0, 0.15, -0.05); // stock
  if (stealth) {
    part(gun, boxGeo(0.22, 0.8, 0.22), M(0x111111), 0, -len - 0.4, 0); // suppressor
    h.muzzles[0].position.y = -len - 0.8;
    part(gun, boxGeo(0.22, 0.4, 0.28), glow(h, 0x76ff03), 0, -0.9, 0.34); // night sight
  }
  h.tracer = stealth ? 0xb2ff59 : 0xffd54f;
  return h;
}

/**
 * Laser Gunner (alternate Mercenary form): a high-tech gunner in a cyan visor with a laser rifle.
 * Top path: a power pack, armor from Lv 3 and a big glowing laser minigun at Lv 5. Bottom path:
 * a sensor antenna, a compact SMG from Lv 3 and two SMGs at Lv 5.
 */
export function makeLaserGunner(level, bottom = false) {
  const top = !bottom;
  const armored = top && level >= 3;
  const shirt = armored ? 0xcfd8dc : 0x263238;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: armored ? 0x78909c : 0x1c2529, arms: shirt, face: 'soldier' });
  const { M } = h;
  const laser = 0x00e5ff;
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.45, 0.52); // Dimension Shard emblem
  if (armored) helmet(h, 0xeceff1, false);
  else part(h.head, boxGeo(1.35, 0.35, 1.35), M(0x37474f), 0, 1.2, 0);
  part(h.head, boxGeo(1.25, 0.3, 0.08), glow(h, laser), 0, 0.72, 0.68); // visor
  if (top && level >= 1) part(h.torso, boxGeo(1.4, 1.7, 0.7), M(0x37474f), 0, 0, -0.85); // power pack
  if (top && level >= 2) part(h.torso, boxGeo(0.3, 1.3, 0.1), glow(h, laser), 0, 0, -1.22);
  if (armored) {
    part(h.torso, boxGeo(2.2, 1.6, 1.2), M(0xb0bec5), 0, 0.1, 0);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.15, 0.6, 1.15), M(0x90a4ae), 0, -0.2, 0);
  }
  if (bottom && level >= 1) {
    part(h.torso, boxGeo(1.0, 1.2, 0.6), M(0x37474f), 0, 0.1, -0.8); // sensor pack
    part(h.torso, boxGeo(0.08, 1.6, 0.08), M(0x212121), 0.35, 1.4, -0.9);
    part(h.torso, boxGeo(0.25, 0.25, 0.25), glow(h, laser), 0.35, 2.25, -0.9);
  }
  if (bottom && level >= 3) {
    // SMG / Dual SMGs: compact laser guns, one in each hand at Lv 5.
    const smg = (arm) => {
      const gun = new THREE.Group();
      gun.position.set(0, -1.9, 0);
      arm.add(gun);
      part(gun, boxGeo(0.36, 1.3, 0.45), M(0x263238), 0, -0.65, 0);
      part(gun, boxGeo(0.4, 0.12, 0.5), glow(h, laser), 0, -0.9, 0);
      part(gun, boxGeo(0.25, 0.5, 0.3), M(0x111111), 0, -0.4, -0.35); // mag
      const muzzle = new THREE.Object3D();
      muzzle.position.set(0, -1.35, 0);
      gun.add(muzzle);
      return muzzle;
    };
    h.muzzles = [smg(h.rightArm)];
    if (level >= 5) {
      h.muzzles.push(smg(h.leftArm));
      h.rightArm.rotation.set(-Math.PI / 2, 0, 0.08);
      h.leftArm.rotation.set(-Math.PI / 2, 0, -0.08);
      h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
    } else {
      h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
      h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
      h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
    }
    h.tracer = laser;
    h.tracerWidth = 0.2;
    return h;
  }
  const mini = top && level >= 5;
  const len = mini ? 2.8 : top && level >= 3 ? 2.6 : 2.2;
  const gun = holdLongGun(h, len, M(armored ? 0x90a4ae : 0x263238));
  if (mini) {
    for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) part(gun, boxGeo(0.14, 1.2, 0.14), M(0x212121), x, -len - 0.5, z);
    part(gun, boxGeo(0.6, 0.6, 0.7), M(0x37474f), 0, -1.2, 0); // motor housing
    h.muzzles[0].position.y = -len - 1.1;
  }
  const coils = mini ? 4 : 3;
  for (let i = 0; i < coils; i++) part(gun, boxGeo(0.42, 0.1, 0.5), glow(h, laser), 0, -0.7 - i * 0.45, 0);
  part(gun, boxGeo(0.22, 0.6, 0.28), M(0x111111), 0, -0.6, 0.35); // sight
  h.tracer = laser;
  h.tracerWidth = mini ? 0.3 : 0.22;
  return h;
}
export const makeLaserGunnerBottom = (level) => makeLaserGunner(level, true);

/**
 * Hunter (alternate Marksman form): a woodsman in an orange cap with a hunting rifle.
 * Lv 2 a scope, Lv 3 a survival pack, Lv 4 a camo poncho and longer rifle, Lv 5 a dark
 * night-hunter outfit with glowing night-vision goggles.
 */
export function makeHunter(level) {
  const night = level >= 4;
  const shirt = night ? 0x212121 : level >= 3 ? 0x5a6b34 : 0x8b5a2b;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: night ? 0x1a1a1a : 0x4e3b26, arms: shirt, face: 'soldier' });
  const { M } = h;
  const cap = M(night ? 0x263238 : 0xff6f00);
  part(h.head, boxGeo(1.35, 0.4, 1.35), cap, 0, 1.25, 0);
  part(h.head, boxGeo(1.3, 0.12, 0.5), cap, 0, 1.08, 0.75); // peak
  if (night) {
    part(h.head, boxGeo(1.0, 0.35, 0.3), M(0x212121), 0, 0.75, 0.7);
    for (const x of [-0.25, 0.25]) part(h.head, boxGeo(0.25, 0.25, 0.1), glow(h, 0x76ff03), x, 0.75, 0.87);
  }
  if (level >= 2) {
    part(h.torso, boxGeo(1.4, 1.7, 0.7), M(0x6d4c41), 0, 0, -0.85); // survival pack
    part(h.torso, boxGeo(1.5, 0.4, 0.5), M(0x33691e), 0, 1.0, -0.85); // bedroll
  }
  if (level >= 3) {
    part(h.torso, boxGeo(2.3, 1.0, 1.3), M(night ? 0x2e3b2e : 0x556b2f), 0, 0.55, 0); // poncho
  }
  const len = level >= 3 ? 2.8 : 2.4;
  const wood = M(night ? 0x263238 : 0x6d4c41);
  const gun = holdLongGun(h, len, wood);
  const dark = M(0x1a1a1a);
  part(gun, boxGeo(0.14, 0.7, 0.14), dark, 0, -len - 0.3, 0); // barrel tip
  h.muzzles[0].position.y = -len - 0.6;
  if (level >= 1) part(gun, boxGeo(0.24, 1.0, 0.3), dark, 0, -0.9, 0.35); // scope
  h.tracer = night ? 0xb2ff59 : 0xfff59d;
  h.tracerWidth = level >= 2 ? 0.24 : undefined;
  return h;
}

/**
 * Pump Shotgunner (alternate Shotgunner form): an enforcer in a cap with a pump shotgun.
 * Lv 2 shell belt, Lv 3 a vest, Lv 4 a helmet and heavier gun, Lv 5 a tactical drum shotgun.
 */
export function makeShotgunnerPump(level) {
  const tac = level >= 4;
  const shirt = tac ? 0x1c2833 : 0x37474f;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: tac ? 0x111a22 : 0x263238, arms: shirt, face: 'agent' });
  const { M } = h;
  if (level >= 3) helmet(h, tac ? 0x0d1b2a : 0x263238);
  else {
    const cap = M(0x0d47a1);
    part(h.head, boxGeo(1.35, 0.4, 1.35), cap, 0, 1.25, 0);
    part(h.head, boxGeo(1.3, 0.12, 0.5), cap, 0, 1.08, 0.75);
  }
  if (level >= 1) {
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.85, 0);
    for (const x of [-0.7, -0.35, 0, 0.35, 0.7]) part(h.torso, boxGeo(0.15, 0.3, 0.15), M(0xd32f2f), x, -0.7, 0.6);
  }
  if (level >= 2) part(h.torso, boxGeo(2.15, 1.7, 1.15), M(tac ? 0x263238 : 0x455a64), 0, 0.05, 0); // vest
  const len = tac ? 2.0 : level >= 3 ? 1.8 : 1.6;
  const gun = holdLongGun(h, len, M(0x212121));
  part(gun, boxGeo(0.42, 0.5, 0.52), M(0x5d4037), 0, -0.9, 0.05); // pump
  part(gun, boxGeo(0.3, 0.5, 0.4), M(tac ? 0x37474f : 0x4e342e), 0, 0.2, -0.05); // stock
  if (tac) {
    part(gun, boxGeo(0.6, 0.6, 0.6), M(0x424242), 0, -0.45, -0.5); // drum
    part(gun, boxGeo(0.2, 0.25, 0.25), glow(h, 0xff1744), 0, -1.2, 0.34);
  }
  h.tracer = 0xffab40;
  return h;
}

/**
 * Combat Shotgunner (alternate Shotgunner, two paths). Top: Gloves, a Padded Vest, a Militant
 * beret, Advanced Goggles and a drum-fed AA-12 with a medkit. Bottom: a bandolier, an Officer's
 * cap, SWAT gear and the bulky DB-12.
 */
export function makeShotgunnerCombat(level, bottom = false) {
  const top = !bottom;
  const swat = bottom && level >= 4;
  const shirt = swat ? 0x1b1f24 : bottom && level >= 3 ? 0x1a237e : 0x556b2f;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: swat ? 0x15181c : 0x3e4a2a, arms: shirt, face: 'soldier' });
  const { M } = h;
  if (level >= 1) {
    if (top) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(0.95, 0.5, 0.95), M(0x212121), 0, -1.85, 0); // gloves
    else {
      const strap = part(h.torso, boxGeo(0.35, 2.6, 1.12), M(0x4e342e), 0, 0, 0);
      strap.rotation.z = -0.75;
    }
  }
  if (top && level >= 2) part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x6b7b3a), 0, 0.05, 0); // padded vest
  if (swat) {
    helmet(h, 0x111111);
    part(h.torso, boxGeo(2.2, 1.75, 1.2), M(0x263238), 0, 0.05, 0);
    const visor = part(h.head, boxGeo(1.25, 0.45, 0.08), M(0x90caf9), 0, 0.7, 0.74);
    visor.material.transparent = true;
    visor.material.opacity = 0.6;
  } else if (bottom && level >= 3) {
    // Officer: peaked cap with a gold badge
    part(h.head, boxGeo(1.4, 0.45, 1.4), M(0x0d1b4c), 0, 1.25, 0);
    part(h.head, boxGeo(1.3, 0.1, 0.5), M(0x111111), 0, 1.05, 0.75);
    part(h.head, boxGeo(0.25, 0.25, 0.06), glow(h, 0xffd54f), 0, 1.3, 0.72);
  } else if (top && level >= 3) {
    part(h.head, boxGeo(1.45, 0.35, 1.45), M(0x33691e), 0.1, 1.25, 0); // militant beret
  }
  if (top && level >= 4) {
    // Advanced Goggles
    part(h.head, boxGeo(1.25, 0.3, 0.12), M(0x212121), 0, 0.72, 0.64);
    part(h.head, boxGeo(0.4, 0.25, 0.06), glow(h, 0x76ff03), -0.28, 0.72, 0.71);
    part(h.head, boxGeo(0.4, 0.25, 0.06), glow(h, 0x76ff03), 0.28, 0.72, 0.71);
  }
  if (top && level >= 5) {
    // Health Pack on its back
    part(h.torso, boxGeo(1.2, 1.1, 0.5), M(0xeeeeee), 0, 0.1, -0.85);
    part(h.torso, boxGeo(0.7, 0.2, 0.06), M(0xd32f2f), 0, 0.1, -1.12);
    part(h.torso, boxGeo(0.2, 0.7, 0.06), M(0xd32f2f), 0, 0.1, -1.12);
  }
  const big = level >= 5;
  const gun = holdLongGun(h, big ? 2.0 : 1.6, M(0x212121));
  part(gun, boxGeo(0.42, 0.5, 0.52), M(0x5d4037), 0, -0.9, 0.05); // pump grip
  part(gun, boxGeo(0.3, 0.5, 0.4), M(0x4e342e), 0, 0.2, -0.05); // stock
  if (top && big) part(gun, boxGeo(0.65, 0.65, 0.65), M(0x424242), 0, -0.5, -0.5); // AA-12 drum
  if (bottom && big) {
    // DB-12: a chunky bullpup with twin tube magazines on top
    part(gun, boxGeo(0.6, 1.6, 0.7), M(0x263238), 0, -0.4, 0);
    for (const x of [-0.18, 0.18]) part(gun, boxGeo(0.2, 1.4, 0.2), M(0x37474f), x, -0.7, 0.42);
    part(gun, boxGeo(0.2, 0.25, 0.25), glow(h, 0x40c4ff), 0, -1.2, 0.34);
  }
  h.tracer = bottom && level >= 4 ? 0xffd740 : 0xffab40;
  return h;
}
export const makeShotgunnerCombatBottom = (level) => makeShotgunnerCombat(level, true);

/**
 * Cryo Ranger (alternate Sleeter with two paths): a ranger in a white-and-blue snow suit
 * with a frosty rifle. Top path: sensor eye at Lv 3, nitrogen tanks at Lv 4, an Ice LMG at Lv 5.
 * Bottom path: grenade belt at Lv 3, an underbarrel M203 at Lv 4, heavy frost armor at Lv 5.
 */
export function makeFrostRanger(level, bottom = false) {
  const top = !bottom;
  const suit = bottom && level >= 5 ? 0x0d47a1 : top && level >= 4 ? 0x01579b : 0xe3f2fd;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: suit, pants: 0x546e7a, arms: suit, face: 'soldier' });
  const { M } = h;
  const ice = 0x80d8ff;
  part(h.head, boxGeo(1.4, 0.4, 1.4), M(0x90caf9), 0, 1.25, 0); // knit cap
  part(h.torso, boxGeo(2.1, 0.35, 1.12), M(0x37474f), 0, -0.85, 0); // belt
  if (level >= 1) part(h.torso, boxGeo(2.1, 0.4, 1.15), M(0x4fc3f7), 0, 0.85, 0); // ice-blue scarf
  if (top && level >= 3) {
    // Stealth Sensor Eye: a glowing monocle scope over one eye
    part(h.head, boxGeo(0.5, 0.5, 0.2), M(0x263238), 0.3, 0.75, 0.66);
    part(h.head, boxGeo(0.32, 0.32, 0.06), glow(h, 0x18ffff), 0.3, 0.75, 0.77);
  }
  if (top && level >= 4) {
    // Nitrogen tanks on its back
    for (const x of [-0.4, 0.4]) part(h.torso, boxGeo(0.6, 1.6, 0.6), M(0xcfd8dc), x, 0.05, -0.85);
    part(h.torso, boxGeo(1.2, 0.2, 0.1), glow(h, ice), 0, 0.5, -1.17);
  }
  if (bottom && level >= 3) {
    // Grenade belt: frosty grenades across the chest
    const strap = part(h.torso, boxGeo(0.35, 2.6, 1.14), M(0x455a64), 0, 0, 0);
    strap.rotation.z = 0.75;
    for (const [x, y] of [[-0.45, -0.35], [0, 0.05], [0.45, 0.45]]) part(h.torso, boxGeo(0.3, 0.3, 0.2), glow(h, ice), x, y, 0.62);
  }
  if (bottom && level >= 5) {
    // Deep Freeze armor: icy shoulder plates and a helmet
    helmet(h, 0x1a237e);
    const plate = glow(h, 0xb3e5fc);
    part(h.torso, boxGeo(0.7, 0.5, 1.3), plate, -1.35, 0.95, 0);
    part(h.torso, boxGeo(0.7, 0.5, 1.3), plate, 1.35, 0.95, 0);
  }
  const lmg = top && level >= 5;
  const gun = holdLongGun(h, lmg ? 2.1 : level >= 2 ? 1.8 : 1.5, M(lmg ? 0x37474f : 0x546e7a));
  part(gun, boxGeo(0.3, 0.5, 0.35), M(0x37474f), 0, 0.15, -0.05); // stock
  part(gun, boxGeo(0.38, 0.38, 0.38), glow(h, ice), 0, -0.45, 0.25); // ice cell
  if (lmg) part(gun, boxGeo(0.6, 0.6, 0.6), M(0x263238), 0, -0.6, -0.45); // box magazine
  if (bottom && level >= 4) part(gun, boxGeo(0.34, 0.9, 0.34), M(0x263238), 0, -0.9, -0.38); // M203 tube
  h.tracer = ice;
  h.tracerWidth = 0.16;
  h.projectile = { color: 0x4fc3f7, size: 0.45, arc: 3.5, glowing: true };
  return h;
}
export const makeFrostRangerBottom = (level) => makeFrostRanger(level, true);
