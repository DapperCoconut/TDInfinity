// Tower models, file 9 of 12. Each makeX(level) builds one tower's look.
// In here:
// Elf, Hallowboomer, Sleeter, Snowballer, Huntsman, Archer, Knifer, Stunner,
// Harpoon Hunter, Operator, Breacher, Kingpin, Titan, Gladiator, Event Commando, Slasher,
// Frost Blaster, Flame Trooper, Goo Gunner, Cryo Blaster, Cryo Mortar, Bowmaster, Swarmer,
// Toxic Gunner, Sledger, Executioner. (Graveyard: machines3.js.)
// The list of which tower uses which builder is TOWER_MODELS in ../models.js.

import * as THREE from 'three';
import { boxGeo, makeHumanoid, part } from './kit.js';
import { glow, goldify, helmet, holdLongGun, present, pumpkin, setMuzzle } from './bits.js';
import { makeScout } from './people1.js';
import { makeShotgunner } from './towers02.js';
import { makeCrookBoss } from './towers06.js';
import { makeJuggernaut } from './towers07.js';

/**
 * Elf (event): green tunic, pointy ears and a striped hat, throwing presents. Lv 2 a sack of
 * presents, Lv 3 a headset, Lv 4 a bigger glowing present, Lv 5 a firework launcher on its back.
 */
export function makeElf(level) {
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: 0x2e7d32, pants: 0xc62828, arms: 0x2e7d32 });
  const { M } = h;
  const red = M(0xc62828);
  const white = M(0xfafafa);
  part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.6, 0); // belt
  part(h.torso, boxGeo(0.4, 0.35, 0.1), M(0xffd54f), 0, -0.6, 0.56); // buckle
  for (const x of [-0.7, 0.7]) part(h.head, boxGeo(0.15, 0.5, 0.25), M(0xf1c27d), x, 0.7, 0).rotation.z = x > 0 ? -0.5 : 0.5; // pointy ears
  // Striped hat with a bobble
  part(h.head, boxGeo(1.35, 0.3, 1.35), white, 0, 1.25, 0);
  for (let i = 0; i < 4; i++) part(h.head, boxGeo(1.0 - i * 0.22, 0.4, 1.0 - i * 0.22), i % 2 ? white : M(0x2e7d32), 0, 1.6 + i * 0.4, -0.1 - i * 0.12);
  part(h.head, boxGeo(0.35, 0.35, 0.35), white, 0, 3.2, -0.6);
  if (level >= 1) {
    // Rapid Reload: a sack of presents on its back
    part(h.torso, boxGeo(1.6, 1.8, 1.0), M(0x8d6e63), 0, 0.1, -1.0);
    present(h, h.torso, 0x1e88e5, 0xffeb3b, 0.55).position.set(-0.35, 1.2, -1.0);
    present(h, h.torso, 0xc62828, 0xfafafa, 0.5).position.set(0.4, 1.15, -0.9);
  }
  if (level >= 2) {
    // Elf Tech: headset with a mic
    part(h.head, boxGeo(1.4, 0.15, 0.2), M(0x212121), 0, 1.15, 0);
    for (const x of [-0.68, 0.68]) part(h.head, boxGeo(0.2, 0.5, 0.5), M(0x212121), x, 0.65, 0);
    part(h.head, boxGeo(0.1, 0.1, 0.6), M(0x212121), -0.6, 0.4, 0.4);
    part(h.head, boxGeo(0.18, 0.18, 0.18), glow(h, 0x76ff03), -0.6, 0.4, 0.72);
  }
  if (level >= 4) {
    // Fireworks: a rack of rockets on its back
    for (const [x, c] of [[-0.6, 0xff1744], [0, 0xffea00], [0.6, 0x2979ff]]) {
      part(h.torso, boxGeo(0.3, 1.6, 0.3), M(c), x, 1.6, -1.6);
      part(h.torso, boxGeo(0.2, 0.4, 0.2), white, x, 2.6, -1.6);
    }
  }
  // The present in the raised right hand.
  const hand = new THREE.Group();
  hand.position.set(0, -2.2, 0);
  h.rightArm.add(hand);
  const boom = level >= 3;
  const p = boom ? present(h, hand, 0xffd54f, 0xc62828, 0.8) : present(h, hand, 0xc62828, 0x43a047, 0.65);
  if (level >= 4) part(p, boxGeo(0.08, 0.5, 0.08), glow(h, 0xffeb3b), 0, 0.7, 0); // lit fuse
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-0.6, 0, -0.3);
  h.pose = { right: -2.8, left: -0.6, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = level >= 4 ? { color: 0xff1744, size: 0.6, arc: 5, glowing: true } : { color: boom ? 0xffd54f : 0xc62828, size: 0.55, arc: 4.5 };
  return h;
}

/**
 * Hallowboomer (event): a pumpkin-headed scarecrow throwing flaming pumpkins. Lv 2 glasses,
 * Lv 3 a rake and a pile of leaves, Lv 4 a jug of glowing pumpkin juice, Lv 5 a purple cape,
 * green flames and a crown of pumpkins.
 */
export function makeHallowboomer(level) {
  const spooky = level >= 4;
  const h = makeHumanoid({ skin: 0xef6c00, shirt: 0x6d4c41, pants: 0x37474f, arms: 0x6d4c41 });
  const { M } = h;
  // Hide the normal head behind a big pumpkin head.
  pumpkin(h, h.head, 1.6, spooky ? 0x76ff03 : 0xffab00).position.y = 0.7;
  part(h.torso, boxGeo(2.1, 0.25, 1.1), M(0x8d6e63), 0, -0.7, 0); // rope belt
  for (const x of [-0.6, 0.6]) part(h.torso, boxGeo(0.2, 0.5, 0.15), M(0xfbc02d), x, -1.05, 0.5); // straw
  if (level >= 1) {
    // Specs: round glasses on the pumpkin
    const frame = M(0x212121);
    for (const x of [-0.38, 0.38]) part(h.head, boxGeo(0.5, 0.4, 0.06), frame, x, 0.85, 0.85);
    part(h.head, boxGeo(0.3, 0.08, 0.06), frame, 0, 0.9, 0.85);
  }
  if (level >= 2) {
    // Raking Season: a rake on its back and leaves at its feet
    part(h.torso, boxGeo(0.15, 3.6, 0.15), M(0x795548), 0.6, 0.6, -0.65).rotation.z = 0.3;
    part(h.torso, boxGeo(1.2, 0.15, 0.3), M(0x616161), 1.15, 2.3, -0.65).rotation.z = 0.3;
    for (const [x, z, c] of [[-1.5, 1.2, 0xd84315], [1.6, 0.8, 0xffa000], [-1.0, -1.4, 0xbf360c], [1.3, -1.2, 0xf9a825]]) part(h.root, boxGeo(0.8, 0.12, 0.6), M(c), x, 0.06, z).rotation.y = x;
  }
  if (level >= 3) {
    // Pumpkin Juice: a glowing jug on the belt
    part(h.torso, boxGeo(0.6, 0.7, 0.6), M(0xeeeeee), -1.1, -0.9, 0.3);
    part(h.torso, boxGeo(0.45, 0.4, 0.45), glow(h, spooky ? 0x76ff03 : 0xff6d00), -1.1, -0.95, 0.35);
  }
  if (spooky) {
    // Spooky Rampage: a purple cape and a ring of little pumpkins
    part(h.torso, boxGeo(2.2, 3.0, 0.15), M(0x4a148c), 0, -0.6, -0.6);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      pumpkin(h, h.root, 0.6, 0x76ff03).position.set(Math.cos(a) * 1.9, 0.3, Math.sin(a) * 1.9);
    }
  }
  const hand = new THREE.Group();
  hand.position.set(0, -2.3, 0);
  h.rightArm.add(hand);
  const held = pumpkin(h, hand, level >= 2 ? 0.8 : 0.65, spooky ? 0x76ff03 : 0xffab00);
  part(held, boxGeo(0.25, 0.35, 0.25), glow(h, spooky ? 0x76ff03 : 0xff3d00), 0, 0.6, 0); // flame on top
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-0.8, 0, -0.3);
  h.pose = { right: -2.8, left: -0.8, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = { color: spooky ? 0x76ff03 : 0xef6c00, size: level >= 2 ? 0.7 : 0.55, arc: 5, glowing: true };
  return h;
}

/** A glowing ice gun for the Sleeter (len long). */
export function iceGun(h, len, color) {
  const gun = holdLongGun(h, len, h.M(0xeceff1));
  part(gun, boxGeo(0.5, 0.7, 0.6), h.M(0x546e7a), 0, -0.4, 0);
  part(gun, boxGeo(0.45, 0.3, 0.55), glow(h, color), 0, -len, 0);
  h.muzzles[0].position.y = -len - 0.2;
  return gun;
}

/**
 * Sleeter (event): a winter hero in a parka with an ice blaster. Lv 2 an ice crystal pack,
 * Lv 3 a radio, Lv 4 a big white gorilla-fur coat and bigger gun, Lv 5 a glowing hero cape and visor.
 */
export function makeSleeter(level) {
  const ice = 0x40c4ff;
  const gorilla = level >= 3;
  const coat = gorilla ? 0xeceff1 : 0x1565c0;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: coat, pants: 0x263238, arms: coat, face: 'soldier' });
  const { M } = h;
  part(h.head, boxGeo(1.45, 1.4, 1.45), M(gorilla ? 0xcfd8dc : 0x0d47a1), 0, 0.65, -0.05); // hood
  part(h.head, boxGeo(1.5, 0.3, 0.3), M(0xfafafa), 0, 1.2, 0.6); // fur trim
  if (level >= 1) {
    // Permafrost: a pack of ice crystals
    part(h.torso, boxGeo(1.3, 1.6, 0.7), M(0x90a4ae), 0, 0, -0.85);
    for (const x of [-0.35, 0.35]) part(h.torso, boxGeo(0.3, 0.9, 0.3), glow(h, ice), x, 1.1, -0.85);
  }
  if (level >= 2) {
    // Radio: antenna on the pack
    part(h.torso, boxGeo(0.08, 2.0, 0.08), M(0x212121), 0.55, 1.6, -0.9);
    part(h.torso, boxGeo(0.15, 0.15, 0.15), glow(h, 0xff1744), 0.55, 2.6, -0.9);
  }
  if (gorilla) {
    // Arctic Gorilla: bulky fur shoulders
    for (const side of [-1, 1]) part(h.torso, boxGeo(1.0, 0.8, 1.4), M(0xfafafa), side * 1.4, 0.9, 0);
    h.size = 1.1;
  }
  if (level >= 4) {
    // Subzero Hero: a glowing visor and an icy cape
    part(h.head, boxGeo(1.25, 0.35, 0.08), glow(h, ice), 0, 0.72, 0.72);
    part(h.torso, boxGeo(2.2, 3.0, 0.12), M(0x4fc3f7), 0, -0.6, -1.3);
  }
  iceGun(h, gorilla ? 2.3 : 1.8, ice);
  h.tracer = ice;
  h.tracerWidth = level >= 3 ? 0.35 : 0.25;
  return h;
}

/**
 * Snowballer (event): a kid in a beanie and scarf with a snowball. Lv 2 warm gloves, Lv 3 a
 * pile of snowballs, Lv 4 icy blue snowballs, Lv 5 a giant glowing Death Ball.
 */
export function makeSnowballer(level) {
  const h = makeHumanoid({ skin: 0xffcc80, shirt: 0xd32f2f, pants: 0x1a237e, arms: 0xd32f2f });
  const { M } = h;
  const icy = level >= 3;
  const ballColor = level >= 4 ? 0x7c4dff : icy ? 0x81d4fa : 0xfafafa;
  part(h.head, boxGeo(1.35, 0.55, 1.35), M(0x1e88e5), 0, 1.25, 0); // beanie
  part(h.head, boxGeo(0.4, 0.4, 0.4), M(0xfafafa), 0, 1.7, 0);
  part(h.torso, boxGeo(2.1, 0.4, 1.1), M(0xfbc02d), 0, 0.85, 0); // scarf
  part(h.torso, boxGeo(0.5, 1.2, 0.15), M(0xfbc02d), 0.5, 0.2, 0.6);
  if (level >= 1) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.1, 0.6, 1.1), M(0x43a047), 0, -1.75, 0); // warm gloves
  if (level >= 2) {
    // Thick Snow: a pile of snowballs at its feet
    const snow = M(ballColor);
    for (const [x, y, z] of [[1.5, 0.3, 0.8], [2.0, 0.3, 0.8], [1.75, 0.3, 1.3], [1.75, 0.75, 0.95]]) part(h.root, boxGeo(0.5, 0.5, 0.5), snow, x, y, z);
  }
  const hand = new THREE.Group();
  hand.position.set(0, -2.2, 0);
  h.rightArm.add(hand);
  const big = level >= 4;
  part(hand, boxGeo(big ? 0.9 : 0.6, big ? 0.9 : 0.6, big ? 0.9 : 0.6), big ? glow(h, ballColor) : M(ballColor), 0, -0.2, 0);
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-0.6, 0, -0.3);
  h.pose = { right: -2.8, left: -0.6, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = { color: ballColor, size: big ? 0.7 : 0.45, arc: 3, ...(big ? { glowing: true } : {}) };
  return h;
}

/**
 * Huntsman (event): a hunter in a brown coat and wide hat with a rifle. Lv 2 a laser sight,
 * Lv 3 a bounty-poster satchel, Lv 4 a second gun, Lv 5 a dark harvester coat with glowing trim.
 */
export function makeHuntsman(level) {
  const harvester = level >= 4;
  const coat = harvester ? 0x263238 : 0x6d4c41;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: coat, pants: 0x3e2723, arms: coat, face: 'agent' });
  const { M } = h;
  const hat = M(harvester ? 0x111111 : 0x4e342e);
  part(h.head, boxGeo(2.0, 0.12, 2.0), hat, 0, 1.25, 0); // wide brim
  part(h.head, boxGeo(1.3, 0.6, 1.3), hat, 0, 1.6, 0);
  part(h.head, boxGeo(1.32, 0.15, 1.32), M(harvester ? 0xd50000 : 0xbf8040), 0, 1.4, 0); // hat band
  part(h.torso, boxGeo(0.3, 2.3, 1.12), M(0x3e2723), 0, 0.1, 0).rotation.z = 0.6; // bandolier
  if (level >= 2) {
    // Payday: a satchel stuffed with cash
    part(h.torso, boxGeo(0.8, 0.8, 0.6), M(0x8d6e63), -1.2, -0.8, 0.2);
    part(h.torso, boxGeo(0.5, 0.3, 0.1), M(0x66bb6a), -1.2, -0.4, 0.5);
  }
  if (harvester) {
    // Harvester: a long coat and glowing red trim
    part(h.torso, boxGeo(2.15, 2.4, 1.15), M(0x1c2529), 0, -0.9, 0);
    part(h.torso, boxGeo(0.2, 2.4, 0.05), glow(h, 0xff1744), 0, -0.6, 0.6);
  }
  const len = level >= 1 ? 2.6 : 2.2;
  const gun = holdLongGun(h, len, M(0x3e2723));
  part(gun, boxGeo(0.36, 0.9, 0.5), M(0x5d4037), 0, 0.2, 0); // stock
  part(gun, boxGeo(0.2, len * 0.6, 0.2), M(0x424242), 0, -len * 0.7, 0.05); // barrel
  if (level >= 1) {
    // Longshot: a laser sight
    part(gun, boxGeo(0.2, 0.8, 0.2), M(0x212121), 0, -0.9, 0.3);
    part(gun, boxGeo(0.1, 0.1, 0.1), glow(h, 0xff1744), 0, -1.3, 0.3);
  }
  if (level >= 3) {
    // Double Tap: a second gun in the left hand
    const g2 = new THREE.Group();
    g2.position.set(0, -1.9, 0);
    h.leftArm.add(g2);
    part(g2, boxGeo(0.3, 1.8, 0.4), M(0x3e2723), 0, -0.9, 0);
    part(g2, boxGeo(0.18, 0.8, 0.18), M(0x424242), 0, -1.9, 0);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.1);
    h.pose.left = -Math.PI / 2;
  }
  h.tracer = harvester ? 0xff5252 : 0xffc107;
  return h;
}

/**
 * Archer (event): a hooded archer with a longbow and a quiver. Lv 3 heat-vision goggles, Lv 4
 * flaming arrows in the quiver, Lv 5 a dark leather coat and a crossbow.
 */
export function makeArcher(level) {
  const xbow = level >= 4;
  const coat = xbow ? 0x3e2723 : 0x2e7d32;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: coat, pants: 0x4e342e, arms: coat });
  const { M } = h;
  part(h.head, boxGeo(1.45, 1.4, 1.4), M(xbow ? 0x271a16 : 0x1b5e20), 0, 0.7, -0.08); // hood
  part(h.torso, boxGeo(0.25, 2.3, 1.12), M(0x5d4037), 0, 0.1, 0).rotation.z = -0.6; // quiver strap
  const flame = level >= 3;
  const quiver = part(h.torso, boxGeo(0.6, 1.6, 0.6), M(0x6d4c41), 0.5, 0.3, -0.85);
  quiver.rotation.z = 0.3;
  for (const x of [-0.12, 0.12]) part(quiver, boxGeo(0.1, 0.5, 0.1), flame ? glow(h, 0xff7043) : M(0xeeeeee), x, 1.0, 0); // fletching / burning tips
  if (level >= 2) {
    // Extra Sight: heat-vision goggles
    part(h.head, boxGeo(1.3, 0.3, 0.12), M(0x212121), 0, 0.75, 0.66);
    for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.3, 0.22, 0.06), glow(h, 0xff5252), x, 0.75, 0.73);
  }
  const wood = M(0x795548);
  if (xbow) {
    // Taste for Blood: a heavy crossbow held like a rifle
    const gun = holdLongGun(h, 2.2, wood);
    const arms = part(gun, boxGeo(2.4, 0.15, 0.2), M(0x424242), 0, -1.9, 0); // limbs
    arms.rotation.y = 0;
    part(gun, boxGeo(0.12, 1.4, 0.12), glow(h, 0xff7043), 0, -1.6, 0.2); // flaming bolt
  } else {
    // Longbow in the left hand, drawn with the right
    const bow = new THREE.Group();
    bow.position.set(0, -2.1, 0);
    h.leftArm.add(bow);
    part(bow, boxGeo(0.15, 0.15, 3.6), wood, 0, -0.2, 0);
    for (const z of [-1.7, 1.7]) part(bow, boxGeo(0.15, 0.5, 0.15), wood, 0, 0.0, z);
    setMuzzle(h, bow, 0, -0.3, 0);
    h.leftArm.rotation.set(-Math.PI / 2, 0, 0.3);
    h.rightArm.rotation.set(-Math.PI / 2, 0, -0.4);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0 };
  }
  h.blade = flame ? { color: 0xff7043, size: xbow ? 1.5 : 1.2 } : { color: 0x8d6e63, size: 1.2 };
  h.tracer = flame ? 0xff7043 : 0xd7ccc8;
  return h;
}

/**
 * Knifer (event): a masked knife fighter. Lv 3 a dark assassin outfit, Lv 4 a second knife and
 * a belt of throwing knives, Lv 5 the Flayer: blood-red trim and glowing red blades.
 */
export function makeKnifer(level) {
  const dark = level >= 2;
  const flayer = level >= 4;
  const shirt = flayer ? 0x1a0d0d : dark ? 0x212121 : 0x546e7a;
  const h = makeHumanoid({ skin: 0xd9a066, shirt, pants: dark ? 0x151515 : 0x37474f, arms: shirt, face: 'agent' });
  const { M } = h;
  part(h.head, boxGeo(1.32, 0.35, 1.32), M(flayer ? 0x8b0000 : dark ? 0x111111 : 0x37474f), 0, 1.15, 0); // bandana
  if (dark) part(h.head, boxGeo(1.25, 0.35, 0.1), M(0x111111), 0, 0.3, 0.62); // face mask
  if (flayer) part(h.torso, boxGeo(2.1, 0.3, 1.1), glow(h, 0xd50000), 0, -0.6, 0); // red sash
  if (level >= 3) for (const x of [-0.7, -0.35, 0, 0.35, 0.7]) part(h.torso, boxGeo(0.12, 0.5, 0.12), M(0xcfd8dc), x, -0.9, 0.6); // throwing knives
  const blade = flayer ? glow(h, 0xff1744) : M(0xcfd8dc);
  const len = flayer ? 1.8 : level >= 2 ? 1.5 : 1.3;
  const knife = (arm) => {
    const g = new THREE.Group();
    g.position.set(0, -1.9, 0);
    arm.add(g);
    part(g, boxGeo(0.25, 0.5, 0.25), M(0x3e2723), 0, -0.15, 0);
    part(g, boxGeo(0.1, len, 0.4), blade, 0, -0.4 - len / 2, 0);
    return g;
  };
  const right = knife(h.rightArm);
  setMuzzle(h, right, 0, -0.4 - len, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  if (level >= 3) {
    knife(h.leftArm); // Dual Wield
    h.leftArm.rotation.set(-2.0, 0, -0.2);
    h.pose = { right: -2.4, left: -2.0, leftRecoil: 0 };
  } else {
    h.leftArm.rotation.set(-0.6, 0, -0.3);
    h.pose = { right: -2.4, left: -0.6, leftRecoil: 0 };
  }
  h.swing = 1.7;
  h.melee = true;
  h.blade = { color: flayer ? 0xff1744 : 0xcfd8dc, size: 1 };
  h.tracer = flayer ? 0xff1744 : 0xffffff;
  return h;
}

/**
 * Stunner (event): a security guard with a taser. Lv 3 a heavy-duty battery pack, Lv 4 a riot
 * helmet, Lv 5 the Thunder God: a glowing storm-blue suit and a crackling staff.
 */
export function makeStunner(level) {
  const god = level >= 4;
  const shirt = god ? 0x1a237e : 0x37474f;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: god ? 0x0d1440 : 0x263238, arms: shirt, face: 'soldier' });
  const { M } = h;
  const zap = glow(h, god ? 0x82b1ff : 0xfff176);
  part(h.torso, boxGeo(2.35, 0.3, 1.25), M(0x212121), 0, -0.85, 0); // belt
  part(h.torso, boxGeo(1.0, 0.25, 0.06), M(0xfdd835), 0, 0.5, 0.62); // SECURITY stripe
  if (level >= 2) {
    // Heavy Duty: a battery pack with a cable
    part(h.torso, boxGeo(1.2, 1.4, 0.6), M(0x424242), 0, 0.1, -0.85);
    part(h.torso, boxGeo(0.5, 0.2, 0.08), zap, 0, 0.5, -1.18);
  }
  if (level >= 3) {
    part(h.head, boxGeo(1.5, 1.4, 1.5), M(god ? 0x283593 : 0x263238), 0, 0.7, -0.03); // helmet
    part(h.head, boxGeo(1.3, 0.35, 0.08), god ? zap : M(0x90caf9), 0, 0.6, 0.78); // visor
  } else part(h.head, boxGeo(1.4, 0.45, 1.4), M(0x263238), 0, 1.4, 0); // cap
  const hand = new THREE.Group();
  hand.position.set(0, -1.9, 0);
  h.rightArm.add(hand);
  if (god) {
    // Thunder God: a long staff with a glowing head
    part(hand, boxGeo(0.25, 3.2, 0.25), M(0x455a64), 0, -1.0, 0);
    part(hand, boxGeo(0.6, 0.6, 0.6), zap, 0, -2.7, 0);
    setMuzzle(h, hand, 0, -2.7, 0);
  } else {
    part(hand, boxGeo(0.35, 0.9, 0.5), M(0xfdd835), 0, -0.4, 0); // taser
    part(hand, boxGeo(0.2, 0.2, 0.2), zap, 0, -0.95, 0);
    setMuzzle(h, hand, 0, -1.0, 0);
  }
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-0.4, 0, -0.3);
  h.pose = { right: -Math.PI / 2, left: -0.4, leftRecoil: 0 };
  h.tracer = god ? 0x82b1ff : 0xfff176;
  h.tracerWidth = 0.15;
  return h;
}

/**
 * Harpoon Hunter (event): a whaler in a yellow raincoat with a harpoon gun. Lv 2 a pressure
 * gauge, Lv 4 a titanium-plated gun, Lv 5 the Apex Predator: a dark coat and a huge launcher.
 */
export function makeHarpoonHunter(level) {
  const apex = level >= 4;
  const coat = apex ? 0x263238 : 0xfbc02d;
  const h = makeHumanoid({ skin: 0xffcc80, shirt: coat, pants: apex ? 0x1c2529 : 0x37474f, arms: coat });
  const { M } = h;
  const hat = M(apex ? 0x111111 : 0xf9a825);
  part(h.head, boxGeo(1.6, 0.12, 1.9), hat, 0, 1.25, -0.15); // sou'wester brim
  part(h.head, boxGeo(1.35, 0.5, 1.35), hat, 0, 1.5, 0);
  part(h.head, boxGeo(1.4, 0.35, 0.1), M(0x8d6e63), 0, 0.2, 0.62); // beard
  if (level >= 3) part(h.torso, boxGeo(2.15, 1.2, 1.2), M(0x78909c), 0, 0.3, 0); // titanium chest plate
  const metal = M(level >= 3 ? 0xb0bec5 : 0x5d4037);
  const len = apex ? 3.0 : 2.4;
  const gun = holdLongGun(h, len, metal);
  part(gun, boxGeo(0.5, 0.9, 0.6), M(0x424242), 0, -0.5, 0); // tank
  if (level >= 1) {
    // Pressure Gauge
    part(gun, boxGeo(0.4, 0.4, 0.15), M(0xfafafa), 0, -0.5, 0.38);
    part(gun, boxGeo(0.06, 0.25, 0.04), M(0xd32f2f), 0, -0.5, 0.47);
  }
  // The harpoon sticking out of the barrel
  part(gun, boxGeo(0.12, 1.0, 0.12), M(0x9e9e9e), 0, -len - 0.4, 0);
  part(gun, boxGeo(0.35, 0.35, 0.12), apex ? glow(h, 0xff1744) : M(0xbdbdbd), 0, -len - 0.95, 0);
  h.tracer = 0x9e9e9e;
  h.tracerWidth = apex ? 0.3 : 0.2;
  h.flight = { color: apex ? 0xff1744 : 0xbdbdbd, size: 1, arc: 0.8, long: true }; // the harpoon itself
  return h;
}

// ---------------------------------------------------------------- evolved towers
// Each evolved tower wears the look of the tower it evolved from, restyled, plus a glowing cyan
// "evolved" chest emblem so it is easy to tell apart.
const EVO_GLOW = 0x18ffff;

/** Recolours a humanoid's shirt, pants and arms (the first materials makeHumanoid makes). */
export function recolor(h, shirt, pants, arms = shirt) {
  h.mats[1].color.setHex(shirt);
  h.mats[2].color.setHex(pants);
  if (h.mats[3] !== h.mats[0]) h.mats[3].color.setHex(arms);
}

export function evoEmblem(h, color = EVO_GLOW, y = 0.45) {
  part(h.torso, boxGeo(0.4, 0.4, 0.06), glow(h, color), 0.55, y, 0.62);
}

/** Operator (evolved Scout): a black-ops soldier with night-vision goggles; a glowing visor from Lv 5. */
export function makeOperator(level) {
  const h = makeScout(Math.min(level, 3));
  const { M } = h;
  recolor(h, 0x1f2328, 0x15181c);
  evoEmblem(h);
  // Night-vision goggles flipped down over the helmet
  part(h.head, boxGeo(0.9, 0.3, 0.3), M(0x111111), 0, 0.95, 0.75);
  for (const x of [-0.22, 0.22]) part(h.head, boxGeo(0.22, 0.22, 0.25), glow(h, level >= 4 ? EVO_GLOW : 0x76ff03), x, 0.95, 0.95);
  if (level >= 1) part(h.torso, boxGeo(2.2, 1.6, 1.2), M(0x2e3440), 0, 0.05, 0); // Tactical Gear: plate carrier
  if (level >= 2) part(h.head, boxGeo(0.08, 1.2, 0.08), M(0x212121), -0.55, 1.6, -0.4); // radio antenna
  if (level >= 4) part(h.torso, boxGeo(2.25, 0.12, 1.25), glow(h, EVO_GLOW), 0, 0.6, 0); // sentinel light strip
  if (level >= 6) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.15, 0.12, 1.15), glow(h, EVO_GLOW), 0, -0.5, 0);
  h.tracer = level >= 4 ? EVO_GLOW : 0xffe066;
  return h;
}

/** Breacher (evolved Shotgunner): a navy SWAT officer. Top path: a headset; Bottom path: heavy armor. */
export function makeBreacher(level, bottom = false) {
  const h = makeShotgunner(4);
  const { M } = h;
  recolor(h, 0x0d1b2a, 0x0b1520);
  evoEmblem(h, EVO_GLOW, -0.3);
  part(h.torso, boxGeo(2.2, 0.35, 1.2), M(0xfafafa), 0, 0.55, 0); // "SWAT" chest band
  if (level >= 2) for (const x of [-0.6, -0.3]) part(h.torso, boxGeo(0.25, 0.35, 0.25), M(0x9e9e9e), x, -0.35, 0.68); // flashbangs
  if (level >= 5 && !bottom) {
    part(h.head, boxGeo(0.12, 0.5, 0.5), M(0x212121), -0.75, 0.6, 0); // Good Coms headset
    part(h.head, boxGeo(0.5, 0.1, 0.1), M(0x212121), -0.55, 0.4, 0.5);
  }
  if (level >= 5 && bottom) {
    part(h.torso, boxGeo(2.4, 1.9, 1.35), M(0x1b263b), 0, 0, 0); // Full Suit armor
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.25, 0.8, 1.25), M(0x1b263b), 0, -0.25, 0);
  }
  if (level >= 7) part(h.torso, boxGeo(0.7, 0.7, 0.08), glow(h, bottom ? 0x40c4ff : 0xff5252), 0, 0.15, 0.72);
  return h;
}

/** Kingpin (evolved Crook Boss): a purple-suited boss in a gold-banded hat with a gold chain. */
export function makeKingpin(level, bottom = false) {
  const h = makeCrookBoss(Math.min(level, 4));
  const { M } = h;
  const gold = M(0xd4af37);
  recolor(h, 0x311b92, 0x1a1040);
  evoEmblem(h);
  part(h.head, boxGeo(1.6, 0.14, 1.6), M(0x1a1040), 0, 1.25, 0); // hat
  part(h.head, boxGeo(1.25, 0.5, 1.25), M(0x1a1040), 0, 1.5, 0);
  part(h.head, boxGeo(1.27, 0.14, 1.27), gold, 0, 1.33, 0);
  if (level >= 2) part(h.torso, boxGeo(1.4, 0.18, 1.15), gold, 0, 0.9, 0); // gold chain
  if (level >= 4 && !bottom) part(h.torso, boxGeo(0.5, 0.5, 0.08), gold, 0, 0.2, 0.62); // bounty badge
  if (level >= 4 && bottom) part(h.torso, boxGeo(2.15, 0.25, 1.1), gold, 0, -0.7, 0); // syndicate belt
  if (level >= 6) goldify(h);
  return h;
}

/** Titan (evolved Minigunner): the Juggernaut's armor in gunmetal; a glowing core on the top tiers. */
export function makeTitan(level, bottom = false) {
  const h = makeJuggernaut(Math.min(level, 5), bottom);
  const { M } = h;
  evoEmblem(h);
  h.body.scale.setScalar(1.3);
  part(h.head, boxGeo(1.55, 0.14, 1.55), glow(h, EVO_GLOW), 0, 1.0, -0.05); // visor band
  if (level >= 4 && !bottom) part(h.torso, boxGeo(2.6, 2.4, 0.15), M(0x546e7a), 0, 0, -1.55); // Fortifier: a shield plate on the back
  if (level >= 4 && bottom) part(h.torso, boxGeo(0.6, 0.6, 0.1), glow(h, 0xff1744), 0, -0.5, 0.65); // special rounds
  if (level >= 7) part(h.torso, boxGeo(2.3, 0.15, 1.3), glow(h, bottom ? 0xff1744 : EVO_GLOW), 0, 0.95, 0);
  return h;
}

// ---------------------------------------------------------------- event towers (wave 2)

/** A one-handed melee weapon on `arm`: a grip, then a blade `len` long (returns the group). */
export function bladeIn(h, arm, len, bladeMat, wide = 0.45) {
  const g = new THREE.Group();
  g.position.set(0, -1.9, 0);
  arm.add(g);
  part(g, boxGeo(0.25, 0.6, 0.25), h.M(0x3e2723), 0, -0.2, 0);
  part(g, boxGeo(0.7, 0.15, 0.3), h.M(0x8d6e63), 0, -0.5, 0); // crossguard
  part(g, boxGeo(0.12, len, wide), bladeMat, 0, -0.55 - len / 2, 0);
  return g;
}

/**
 * Gladiator (event): an arena fighter with a sword and round shield. Lv 3 a plumed helmet, Lv 4 a
 * flaming sword, Lv 5 a centurion's red cape, Lv 6 the golden King of the Arena.
 */
export function makeGladiator(level) {
  const king = level >= 5;
  const h = makeHumanoid({ skin: 0xd9a066, shirt: king ? 0xffb300 : 0x8d6e63, pants: 0x5d4037, arms: 0xd9a066 });
  const { M } = h;
  const metal = M(king ? 0xffd54f : 0x9e9e9e);
  part(h.torso, boxGeo(2.1, 0.35, 1.1), M(0x4e342e), 0, -0.85, 0); // belt
  part(h.torso, boxGeo(1.0, 1.2, 0.08), metal, -0.4, 0.4, 0.52); // chest plate
  if (level >= 2) {
    part(h.head, boxGeo(1.45, 0.9, 1.45), metal, 0, 0.95, 0); // helmet
    part(h.head, boxGeo(0.3, 0.8, 1.4), M(king ? 0xd50000 : 0xc62828), 0, 1.7, 0); // plume
  }
  if (level >= 4) part(h.torso, boxGeo(2.2, 3.2, 0.12), M(king ? 0x7b1fa2 : 0xb71c1c), 0, -0.6, -0.6); // cape
  const fire = level >= 3;
  const sword = bladeIn(h, h.rightArm, king ? 2.4 : 2.0, fire ? glow(h, 0xff6d00) : M(0xe0e0e0));
  setMuzzle(h, sword, 0, -2.4, 0);
  // Round shield on the left arm
  const shield = part(h.leftArm, boxGeo(0.3, 1.8, 1.8), M(king ? 0xffca28 : 0x6d4c41), 0.6, -1.3, 0);
  part(shield, boxGeo(0.1, 0.5, 0.5), metal, 0.2, 0, 0);
  h.rightArm.rotation.set(-2.5, 0, 0.2);
  h.leftArm.rotation.set(-0.8, 0, -0.2);
  h.pose = { right: -2.5, left: -0.8, leftRecoil: 0 };
  h.swing = 2.0;
  h.melee = true;
  h.tracer = fire ? 0xff6d00 : 0xffffff;
  return h;
}

/**
 * Commando (event): a sci-fi trooper with a laser rifle. Lv 3 a visor (hidden detection), Lv 4 a
 * missile pack, Lv 5 heavy black armor with red lights.
 */
export function makeEventCommando(level) {
  const heavy = level >= 4;
  const shirt = heavy ? 0x212121 : 0x33691e;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: heavy ? 0x111111 : 0x1b5e20, arms: shirt, face: 'soldier' });
  const { M } = h;
  const light = heavy ? 0xff1744 : 0x76ff03;
  part(h.head, boxGeo(1.45, 0.6, 1.45), M(heavy ? 0x111111 : 0x2e4a1e), 0, 1.25, 0); // helmet
  if (level >= 2) part(h.head, boxGeo(1.3, 0.35, 0.08), glow(h, light), 0, 0.7, 0.66); // visor
  part(h.torso, boxGeo(2.15, 1.4, 1.15), M(heavy ? 0x263238 : 0x4b5320), 0, 0.3, 0); // vest
  if (level >= 3) {
    // Jericho Missiles: a missile pack on its back
    part(h.torso, boxGeo(1.6, 1.6, 0.8), M(0x37474f), 0, 0.3, -0.9);
    for (const x of [-0.45, 0, 0.45]) part(h.torso, boxGeo(0.3, 0.3, 0.3), M(0xd32f2f), x, 1.2, -0.9);
  }
  const len = heavy ? 2.8 : 2.4;
  const gun = holdLongGun(h, len, M(0x263238));
  part(gun, boxGeo(0.45, 0.8, 0.6), M(0x37474f), 0, -0.6, 0);
  part(gun, boxGeo(0.2, 0.6, 0.2), glow(h, light), 0, -len + 0.3, 0.1);
  h.tracer = light;
  h.tracerWidth = 0.18;
  return h;
}

/**
 * Slasher (alternate Knifer form): a hooded killer with a big knife. Lv 3 a blood-red outfit,
 * Lv 4 a jagged cleaver, Lv 5 dripping red blades. A purple Dimension Shard marks the form.
 */
export function makeSlasher(level) {
  const blood = level >= 2;
  const shirt = blood ? 0x4a0000 : 0x37474f;
  const h = makeHumanoid({ skin: 0xd9a066, shirt, pants: 0x1a1a1a, arms: shirt, face: 'agent' });
  const { M } = h;
  part(h.head, boxGeo(1.45, 1.4, 1.45), M(blood ? 0x2b0000 : 0x263238), 0, 0.7, -0.08); // hood
  part(h.head, boxGeo(1.2, 0.5, 0.1), M(0xeeeeee), 0, 0.55, 0.65); // mask
  for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.2, 0.12, 0.05), M(0x111111), x, 0.65, 0.71);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.45, 0.52); // Dimension Shard
  if (level >= 1) part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x111111), 0, -0.85, 0); // belt
  const bladeMat = level >= 4 ? glow(h, 0xd50000) : M(0xcfd8dc);
  const knife = bladeIn(h, h.rightArm, level >= 3 ? 2.0 : 1.5, bladeMat, level >= 3 ? 0.7 : 0.45);
  setMuzzle(h, knife, 0, -2.0, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  h.leftArm.rotation.set(-0.6, 0, -0.3);
  h.pose = { right: -2.4, left: -0.6, leftRecoil: 0 };
  h.swing = 1.8;
  h.melee = true;
  h.tracer = blood ? 0xd50000 : 0xffffff;
  return h;
}

/**
 * Frost Blaster (alternate Sleeter form): a trooper in white snow gear with a long ice rifle.
 * Lv 2 goggles, Lv 4 a coolant tank, Lv 5 the Hyper Icer: icy armor and a huge cannon.
 */
export function makeFrostBlaster(level) {
  const ice = 0x80d8ff;
  const hyper = level >= 4;
  const coat = hyper ? 0x4fc3f7 : 0xeceff1;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: coat, pants: 0x90a4ae, arms: coat, face: 'soldier' });
  const { M } = h;
  part(h.head, boxGeo(1.45, 0.6, 1.45), M(hyper ? 0x0288d1 : 0xcfd8dc), 0, 1.25, 0); // helmet
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.45, 0.52); // Dimension Shard
  if (level >= 1) {
    part(h.head, boxGeo(1.3, 0.3, 0.12), M(0x263238), 0, 0.75, 0.66); // goggles
    for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.3, 0.22, 0.06), glow(h, ice), x, 0.75, 0.73);
  }
  if (level >= 3) {
    part(h.torso, boxGeo(1.0, 1.8, 0.8), M(0x90a4ae), 0, 0, -0.9); // coolant tank
    part(h.torso, boxGeo(0.4, 1.2, 0.1), glow(h, ice), 0, 0, -1.32);
  }
  if (hyper) for (const side of [-1, 1]) part(h.torso, boxGeo(0.9, 0.7, 1.3), glow(h, 0xb3e5fc), side * 1.4, 0.9, 0); // ice pauldrons
  iceGun(h, hyper ? 3.0 : 2.4, ice);
  h.tracer = ice;
  h.tracerWidth = hyper ? 0.35 : 0.2;
  return h;
}

/**
 * Flame Trooper (alternate Flamethrower form): a trooper in an orange fire suit with a long
 * flamethrower. Lv 2 a respirator, Lv 3 napalm tanks, Lv 4 an M3 flamethrower with armor plates,
 * Lv 5 the glowing black-and-orange Exo-Flame Suit.
 */
export function makeFlameTrooper(level) {
  const exo = level >= 5;
  const fire = 0xff6d00;
  const coat = exo ? 0x212121 : 0xe65100;
  const h = makeHumanoid({ skin: 0xd2a679, shirt: coat, pants: exo ? 0x1a1a1a : 0x4e342e, arms: coat, face: 'soldier' });
  const { M } = h;
  helmet(h, exo ? 0x37474f : 0x5d4037);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.45, 0.52); // Dimension Shard
  if (level >= 2) part(h.head, boxGeo(0.6, 0.55, 0.4), M(0x37474f), 0, 0.35, 0.75); // respirator
  part(h.head, boxGeo(1.2, 0.3, 0.08), exo ? glow(h, fire) : M(0xffa000), 0, 0.8, 0.66); // visor
  const tank = level >= 3 ? glow(h, fire) : M(0xbf360c);
  for (const x of level >= 3 ? [-0.45, 0.45] : [0]) part(h.torso, boxGeo(0.7, 2.0, 0.7), tank, x, 0.2, -0.85);
  if (level >= 4) for (const side of [-1, 1]) part(h.torso, boxGeo(0.8, 0.6, 1.2), M(exo ? 0x424242 : 0x6d4c41), side * 1.35, 0.9, 0); // shoulder plates
  if (exo) {
    part(h.torso, boxGeo(2.2, 1.0, 1.25), M(0x303030), 0, 0.4, 0); // exo-suit chest
    part(h.torso, boxGeo(0.9, 0.3, 0.06), glow(h, fire), 0, 0.5, 0.64);
  }
  const len = level >= 4 ? 2.6 : level >= 2 ? 2.2 : 1.8;
  const gun = holdLongGun(h, len, M(0x424242));
  part(gun, boxGeo(0.55, 0.3, 0.55), M(0x212121), 0, -len, 0); // nozzle
  part(gun, boxGeo(0.15, 0.15, 0.15), glow(h, fire), 0, -len - 0.2, 0.25); // pilot light
  part(gun, boxGeo(0.45, 0.6, 0.45), M(0xbf360c), 0, -0.4, -0.35); // fuel canister
  h.recoilScale = 0.1;
  return h;
}

/**
 * Goo Gunner (alternate Slime Trooper form): a lab worker in a green hazmat suit with a goo blaster.
 * Lv 2 a gas mask, Lv 3 the Glue Hose (a big goo tank and a hose nozzle), Lv 4 acid-yellow trim,
 * Lv 5 a second tank and a dripping goo crown.
 */
export function makeGooGunner(level) {
  const goo = 0x76ff03;
  const hose = level >= 3;
  const suit = level >= 4 ? 0x1b5e20 : 0x43a047;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: suit, pants: suit, arms: suit, face: 'soldier' });
  const { M } = h;
  part(h.head, boxGeo(1.45, 1.45, 1.45), M(suit), 0, 0.68, -0.05); // hood
  const visor = part(h.head, boxGeo(1.1, 0.7, 0.08), M(0xc5e1a5), 0, 0.7, 0.72);
  visor.material.transparent = true;
  visor.material.opacity = 0.7;
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.45, 0.52); // Dimension Shard
  if (level >= 2) part(h.head, boxGeo(0.6, 0.5, 0.4), M(0x263238), 0, 0.3, 0.85); // gas mask filter
  if (level >= 4) for (const y of [-0.5, 0.3]) part(h.torso, boxGeo(2.08, 0.18, 1.08), M(0xeeff41), 0, y, 0); // acid trim
  const tank = (x, tall) => {
    part(h.torso, boxGeo(0.8, tall, 0.8), M(0x546e7a), x, 0.1, -0.9);
    part(h.torso, boxGeo(0.6, tall * 0.7, 0.1), glow(h, goo), x, 0.1, -1.32);
  };
  tank(level >= 5 ? -0.5 : 0, hose ? 2.0 : 1.4);
  if (level >= 5) {
    tank(0.5, 2.0);
    for (const x of [-0.45, 0, 0.45]) part(h.head, boxGeo(0.3, 0.45, 0.3), glow(h, goo), x, 1.55, 0); // goo crown
  }
  const len = hose ? 1.8 : 1.3;
  const gun = holdLongGun(h, len, M(hose ? 0x2e7d32 : 0x455a64));
  part(gun, boxGeo(hose ? 0.35 : 0.55, 0.3, hose ? 0.35 : 0.55), glow(h, goo), 0, -len - 0.1, 0); // nozzle
  part(gun, boxGeo(0.5, 0.6, 0.5), glow(h, goo), 0, -0.3, -0.35); // canister
  h.tracer = goo;
  h.tracerWidth = hose ? 0.4 : 0.32;
  h.flight = { color: goo, size: 0.55, arc: 1.2, glowing: true, blob: true }; // a glob of goo
  return h;
}

/**
 * Cryo Blaster (alternate Frost Trooper with two paths): a trooper in pale blue snow gear with an
 * ice fan blaster. Top path: a bigger fan at Lv 2, a cryo tank at Lv 4, a swirling Snow Storm rig
 * at Lv 5. Bottom path: a long Cryo Rifle from Lv 3, overcharged tanks at Lv 4, Deep Freeze armor at Lv 5.
 */
export function makeCryoBlaster(level, bottom = false) {
  const ice = 0x80d8ff;
  const maxed = level >= 5;
  const coat = maxed ? (bottom ? 0x01579b : 0xe1f5fe) : 0xb3e5fc;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: coat, pants: 0x78909c, arms: coat, face: 'soldier' });
  const { M } = h;
  part(h.head, boxGeo(1.45, 0.6, 1.45), M(bottom && level >= 3 ? 0x0277bd : 0xeceff1), 0, 1.25, 0); // snow helmet
  part(h.head, boxGeo(1.3, 0.3, 0.12), M(0x263238), 0, 0.75, 0.66); // goggles
  for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.3, 0.22, 0.06), glow(h, ice), x, 0.75, 0.73);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.45, 0.52); // Dimension Shard
  const tanks = level >= 4 ? [-0.45, 0.45] : [0];
  for (const x of tanks) {
    part(h.torso, boxGeo(0.7, 1.8, 0.7), M(0x90a4ae), x, 0.1, -0.85);
    part(h.torso, boxGeo(0.4, 1.2, 0.1), glow(h, ice), x, 0.1, -1.22);
  }
  if (maxed) for (const side of [-1, 1]) part(h.torso, boxGeo(0.9, 0.7, 1.3), glow(h, bottom ? 0x40c4ff : 0xe1f5fe), side * 1.4, 0.9, 0); // ice pauldrons
  if (bottom && level >= 3) {
    // Cryo Rifle: a long ice rifle with a scope.
    const gun = iceGun(h, maxed ? 3.2 : 2.8, ice);
    part(gun, boxGeo(0.3, 0.9, 0.3), M(0x263238), 0, -1.0, 0.35); // scope
    h.tracerWidth = maxed ? 0.35 : 0.25;
  } else {
    // A stubby blaster with a fan cage on the end.
    const fan = level >= 2 && !bottom ? 1.2 : 0.9;
    const gun = holdLongGun(h, 1.4, M(0x546e7a));
    part(gun, boxGeo(fan, 0.3, fan), M(0xcfd8dc), 0, -1.45, 0); // fan cage
    part(gun, boxGeo(fan * 0.6, 0.12, fan * 0.6), glow(h, ice), 0, -1.6, 0);
    if (maxed) part(gun, boxGeo(fan * 1.3, 0.12, fan * 1.3), glow(h, 0xe1f5fe), 0, -1.75, 0); // Snow Storm ring
    h.tracerWidth = 0.3;
  }
  h.tracer = ice;
  return h;
}
export const makeCryoBlasterBottom = (level) => makeCryoBlaster(level, true);

/**
 * Cryo Mortar (alternate Harpoon Hunter form): a gunner in arctic white beside an icy mortar
 * tube. Lv 2 a wider tube, Lv 3 nitrogen tanks, Lv 4 a longer frosted tube, Lv 5 a huge glowing
 * ice cannon.
 */
export function makeCryoMortar(level) {
  const ice = 0x80d8ff;
  const nice = level >= 5;
  const coat = nice ? 0x0288d1 : 0xeceff1;
  const h = makeHumanoid({ skin: 0xffcc80, shirt: coat, pants: 0x90a4ae, arms: coat, face: 'soldier' });
  const { M } = h;
  helmet(h, nice ? 0x01579b : 0xb0bec5);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.45, 0.52); // Dimension Shard
  if (level >= 1) part(h.head, boxGeo(1.3, 0.3, 0.12), M(0x263238), 0, 0.75, 0.66); // goggles
  const mount = new THREE.Group();
  mount.position.set(0, 0, 2.3);
  h.root.add(mount);
  part(mount, boxGeo(2.0, 0.25, 2.0), M(0x607d8b), 0, 0.12, 0);
  const w = nice ? 1.4 : level >= 2 ? 1.0 : 0.8;
  const len = nice ? 4.6 : level >= 4 ? 4.0 : 3.2;
  const tube = new THREE.Group();
  tube.position.set(0, 0.35, 0);
  tube.rotation.x = 0.45;
  mount.add(tube);
  part(tube, boxGeo(w, len, w), M(nice ? 0x0277bd : 0x78909c), 0, len / 2, 0);
  part(tube, boxGeo(w + 0.25, 0.3, w + 0.25), glow(h, ice), 0, len, 0); // frosted rim
  if (level >= 4) for (const y of [0.9, 2.0]) part(tube, boxGeo(w + 0.15, 0.2, w + 0.15), glow(h, 0xe1f5fe), 0, y, 0); // frost bands
  for (const side of [-1, 1]) {
    const leg = part(mount, boxGeo(0.18, 2.4, 0.18), M(0x37474f), side * 0.7, 1.1, 1.1);
    leg.rotation.set(-0.5, 0, side * 0.3);
  }
  setMuzzle(h, tube, 0, len + 0.3, 0);
  if (level >= 3) for (const x of [1.6, 2.3]) { // nitrogen tanks
    part(h.root, boxGeo(0.6, 1.6, 0.6), M(0x90a4ae), x, 0.8, 0.3);
    part(h.root, boxGeo(0.4, 1.0, 0.1), glow(h, ice), x, 0.8, 0.62);
  }
  const shell = part(h.rightArm, boxGeo(0.45, 0.85, 0.45), glow(h, ice), 0.6, -2.1, 0);
  shell.rotation.z = 0.3;
  h.rightArm.rotation.set(-1.0, 0, 0.3);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -1.0, left: -1.0, leftRecoil: 0 };
  h.recoilScale = 0.4;
  h.projectile = { color: ice, size: nice ? 1.0 : 0.7, arc: 16, glowing: true };
  return h;
}

/**
 * Archer (Bowmaster form): a ranger in a long green cloak with a big recurve bow. Lv 3 goggles,
 * Lv 4 flaming arrows, Lv 5 powder kegs on its belt, Lv 6 a storm-blue cloak with sparks.
 */
export function makeBowmaster(level) {
  const storm = level >= 5;
  const coat = storm ? 0x1a237e : 0x33691e;
  const h = makeHumanoid({ skin: 0xffcc80, shirt: coat, pants: 0x3e2723, arms: coat });
  const { M } = h;
  part(h.head, boxGeo(1.45, 1.4, 1.4), M(storm ? 0x0d1440 : 0x1b5e20), 0, 0.7, -0.08); // hood
  part(h.torso, boxGeo(2.2, 3.0, 0.12), M(storm ? 0x283593 : 0x2e7d32), 0, -0.5, -0.6); // cloak
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.45, 0.52); // Dimension Shard
  const quiver = part(h.torso, boxGeo(0.6, 1.6, 0.6), M(0x6d4c41), 0.5, 0.3, -0.85);
  quiver.rotation.z = 0.3;
  const tip = level >= 3 ? glow(h, 0xff7043) : M(0xeeeeee);
  for (const x of [-0.12, 0.12]) part(quiver, boxGeo(0.1, 0.5, 0.1), tip, x, 1.0, 0);
  if (level >= 2) {
    part(h.head, boxGeo(1.3, 0.3, 0.12), M(0x212121), 0, 0.75, 0.66);
    for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.3, 0.22, 0.06), glow(h, 0xffd740), x, 0.75, 0.73);
  }
  if (level >= 4) for (const x of [-0.7, 0.7]) part(h.torso, boxGeo(0.5, 0.6, 0.5), M(0x5d4037), x, -1.2, 0.5); // powder kegs
  if (storm) part(h.torso, boxGeo(0.25, 0.25, 0.06), glow(h, 0x80d8ff), 0.5, 0.5, 0.53);
  const wood = M(storm ? 0x37474f : 0x795548);
  const bow = new THREE.Group();
  bow.position.set(0, -2.1, 0);
  h.leftArm.add(bow);
  part(bow, boxGeo(0.18, 0.18, 4.0), wood, 0, -0.2, 0);
  for (const z of [-1.9, 1.9]) part(bow, boxGeo(0.18, 0.6, 0.18), wood, 0, 0.1, z);
  setMuzzle(h, bow, 0, -0.3, 0);
  h.leftArm.rotation.set(-Math.PI / 2, 0, 0.3);
  h.rightArm.rotation.set(-Math.PI / 2, 0, -0.4);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0 };
  h.tracer = storm ? 0x80d8ff : level >= 3 ? 0xff7043 : 0xd7ccc8;
  return h;
}

/**
 * Swarmer (event): a beekeeper in a white suit and veiled hat with a hive blaster. Lv 3 a honey
 * tank, Lv 4 a grenade belt, Lv 5 a hive backpack, Lv 6 a black-and-gold suit.
 */
export function makeSwarmer(level) {
  const death = level >= 5;
  const suit = death ? 0x212121 : 0xfafafa;
  const h = makeHumanoid({ skin: 0xffcc80, shirt: suit, pants: suit, arms: suit });
  const { M } = h;
  const gold = M(0xffb300);
  part(h.head, boxGeo(2.0, 0.12, 2.0), M(death ? 0x111111 : 0xeeeeee), 0, 1.25, 0); // hat brim
  part(h.head, boxGeo(1.3, 0.5, 1.3), M(death ? 0x111111 : 0xeeeeee), 0, 1.55, 0);
  part(h.head, boxGeo(1.5, 1.1, 1.5), M(0x37474f), 0, 0.55, 0.02); // veil
  if (level >= 2) part(h.torso, boxGeo(0.9, 1.4, 0.7), gold, 0.6, 0, -0.85); // honey tank
  if (level >= 3) for (const x of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.4, 0.4, 0.4), M(0xfdd835), x, -0.9, 0.6); // bee grenades
  if (level >= 4) {
    // Beehive backpack
    part(h.torso, boxGeo(1.4, 1.8, 0.9), gold, -0.3, 0.2, -1.0);
    for (const y of [-0.4, 0.2, 0.8]) part(h.torso, boxGeo(1.45, 0.12, 0.95), M(0x6d4c41), -0.3, y, -1.0);
  }
  if (death) part(h.torso, boxGeo(2.1, 0.3, 1.1), gold, 0, 0.4, 0); // gold stripe
  const gun = holdLongGun(h, 2.0, M(0x795548));
  part(gun, boxGeo(0.7, 0.9, 0.8), gold, 0, -0.6, 0); // hive barrel
  part(gun, boxGeo(0.12, 0.6, 0.6), M(0x6d4c41), 0, -0.6, 0);
  h.projectile = { color: 0xfdd835, size: 0.35 };
  h.tracer = 0xfdd835;
  return h;
}

/**
 * Toxic Gunner (event): a hazmat trooper with a poison SMG. Lv 3 a toxic drum mag, Lv 4 a gas
 * mask with glowing filters, Lv 5 the nuclear suit with a minigun.
 */
export function makeToxicGunner(level) {
  const nuke = level >= 4;
  const suit = nuke ? 0x33691e : 0xfbc02d;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: suit, pants: suit, arms: suit, face: 'soldier' });
  const { M } = h;
  const tox = glow(h, 0x76ff03);
  part(h.head, boxGeo(1.45, 1.4, 1.45), M(nuke ? 0x1b5e20 : 0xf9a825), 0, 0.7, -0.05); // hood
  part(h.head, boxGeo(1.1, 0.5, 0.1), M(0x90caf9), 0, 0.75, 0.68); // visor
  if (level >= 3) for (const x of [-0.35, 0.35]) part(h.head, boxGeo(0.35, 0.35, 0.35), tox, x, 0.25, 0.7); // filters
  part(h.torso, boxGeo(0.8, 0.8, 0.06), M(0x212121), 0, 0.4, 0.52); // hazard sign
  part(h.torso, boxGeo(0.4, 0.4, 0.07), tox, 0, 0.4, 0.53);
  part(h.torso, boxGeo(1.0, 1.6, 0.7), M(0x616161), 0, 0, -0.85); // tank
  const len = nuke ? 2.6 : 1.8;
  const gun = holdLongGun(h, len, M(0x424242));
  if (level >= 2) part(gun, boxGeo(0.7, 0.7, 0.7), tox, 0.3, -0.7, 0.2); // drum mag
  if (nuke) part(gun, boxGeo(0.6, 1.2, 0.6), M(0x263238), 0, -len + 0.6, 0);
  h.tracer = 0x76ff03;
  h.tracerWidth = 0.12;
  return h;
}

/**
 * Sledger (event): a burly arctic worker with an ice sledgehammer. Lv 3 a bigger sledge, Lv 4
 * a frozen hammer head, Lv 5 fur armor, Lv 6 a huge glowing glacier hammer.
 */
export function makeSledger(level) {
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: 0x1565c0, pants: 0x263238, arms: 0x1565c0 });
  const { M } = h;
  const ice = 0x80d8ff;
  part(h.head, boxGeo(1.4, 0.5, 1.4), M(0x0d47a1), 0, 1.3, 0); // beanie
  part(h.head, boxGeo(1.3, 0.5, 0.2), M(0x6d4c41), 0, 0.15, 0.6); // beard
  if (level >= 4) for (const side of [-1, 1]) part(h.torso, boxGeo(1.0, 0.8, 1.4), M(0xfafafa), side * 1.4, 0.9, 0); // fur shoulders
  h.size = level >= 4 ? 1.1 : 1;
  const big = [1, 1, 1.15, 1.25, 1.4, 1.6][level];
  const ham = new THREE.Group();
  ham.position.set(0, -1.9, 0);
  ham.scale.setScalar(big);
  h.rightArm.add(ham);
  part(ham, boxGeo(0.28, 2.6, 0.28), M(0x5d4037), 0, -1.1, 0);
  const headMat = level >= 3 ? glow(h, ice) : M(0x90a4ae);
  part(ham, boxGeo(0.9, 0.9, 1.6), headMat, 0, -2.4, 0);
  if (level >= 5) for (const z of [-0.9, 0.9]) part(ham, boxGeo(0.6, 0.6, 0.4), glow(h, 0xe1f5fe), 0, -2.4, z);
  setMuzzle(h, ham, 0, -2.6, 0);
  h.rightArm.rotation.set(-2.6, 0, 0.15);
  h.leftArm.rotation.set(-2.4, 0, -0.3);
  h.pose = { right: -2.6, left: -2.4, leftRecoil: 0 };
  h.swing = 2.2;
  h.melee = true;
  h.tracer = ice;
  return h;
}

/**
 * Executioner (event): a hooded executioner with a big axe. Lv 3 a double-headed axe, Lv 4 a
 * ghostly cloak, Lv 5 shoulder spikes, Lv 6 the Judge: a glowing red axe.
 */
export function makeExecutioner(level) {
  const judge = level >= 5;
  const h = makeHumanoid({ skin: 0xd9a066, shirt: 0x212121, pants: 0x111111, arms: 0xd9a066 });
  const { M } = h;
  part(h.head, boxGeo(1.45, 1.45, 1.45), M(0x111111), 0, 0.68, -0.03); // executioner hood
  for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.25, 0.15, 0.05), level >= 3 ? glow(h, 0x7c4dff) : M(0xffffff), x, 0.7, 0.74);
  part(h.torso, boxGeo(2.1, 0.35, 1.1), M(0x4e342e), 0, -0.85, 0); // belt
  if (level >= 3) part(h.torso, boxGeo(2.2, 3.2, 0.12), M(0x311b92), 0, -0.6, -0.6); // ghostly cloak
  if (level >= 4) for (const side of [-1, 1]) part(h.torso, boxGeo(0.3, 0.8, 0.3), M(0x9e9e9e), side * 1.2, 1.3, 0); // spikes
  const axe = new THREE.Group();
  axe.position.set(0, -1.9, 0);
  h.rightArm.add(axe);
  part(axe, boxGeo(0.25, 2.6, 0.25), M(0x3e2723), 0, -1.1, 0);
  const headMat = judge ? glow(h, 0xff1744) : M(0x78909c);
  part(axe, boxGeo(0.15, 1.2, 1.1), headMat, 0, -2.1, 0.6);
  if (level >= 2) part(axe, boxGeo(0.15, 1.2, 1.1), headMat, 0, -2.1, -0.6); // double-headed
  setMuzzle(h, axe, 0, -2.2, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  h.leftArm.rotation.set(-0.6, 0, -0.3);
  h.pose = { right: -2.4, left: -0.6, leftRecoil: 0 };
  h.tracer = judge ? 0xff1744 : 0xb0bec5;
  h.tracerWidth = 0.3;
  return h;
}
