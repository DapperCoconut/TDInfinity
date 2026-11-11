import * as THREE from 'three';
import { boxGeo, part, makeHumanoid, makeThing, glow, glowThing, helmet, setMuzzle, gunMuzzle, wheels, turret, holdLongGun } from '../models.js';

// Wave 8 crosspath towers (set E). Tower makers take (top, bottom): how far each upgrade path
// has gone (see crosstowers.js), so a 4-2 Slinger looks different from a 2-4 one. Characters face +Z.

/** A gun group held in a hand, pointing along the arm (-Y local). */
function handGroup(arm) {
  const g = new THREE.Group();
  g.position.set(0, -1.9, 0);
  arm.add(g);
  return g;
}

/** Standard two-handed aiming pose. */
function aimPose(h, leftRecoil = 0.25) {
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil };
}

/** Boots and a belt (most soldiers). */
function boots(h, color = 0x263238, belt = 0x4e342e) {
  for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.05, 0.55, 1.15), h.M(color), 0, -1.72, 0.05);
  part(h.torso, boxGeo(2.05, 0.28, 1.05), h.M(belt), 0, -0.85, 0);
}

/** A cape hanging from the shoulders. */
function cape(h, color, long = 2.6) {
  const c = part(h.torso, boxGeo(2.0, long, 0.12), h.M(color), 0, 0.9 - long / 2, -0.58);
  c.rotation.x = 0.08;
  return c;
}

/** A small glowing badge on the chest. */
function badge(h, color, x = 0.55) {
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, color), x, 0.45, 0.53);
}

// ---------------------------------------------------------------------------------------------
// Slinger: a kid with a slingshot.
// ---------------------------------------------------------------------------------------------

export function makeSlinger(a, b) {
  const leader = a >= 4;
  const cysian = a >= 5;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: cysian ? 0x4a148c : leader ? 0x1565c0 : 0xef6c00, pants: 0x5d4037, arms: cysian ? 0x4a148c : leader ? 0x1565c0 : 0xef6c00, face: 'smile' });
  const { M } = h;
  h.body.scale.setScalar(0.85); // a kid
  // Cap (backwards), later a commander's beret, then a glowing Cysian visor
  if (cysian) {
    part(h.head, boxGeo(1.4, 0.45, 1.4), M(0x311b92), 0, 1.3, 0);
    part(h.head, boxGeo(1.25, 0.25, 0.1), glow(h, 0xe040fb), 0, 0.7, 0.64);
  } else if (leader) {
    part(h.head, boxGeo(1.4, 0.35, 1.4), M(0xc62828), 0, 1.3, -0.05);
    part(h.head, boxGeo(0.3, 0.3, 0.06), glow(h, 0xffd54f), 0.35, 1.32, 0.68);
  } else {
    const cap = M(0x1e88e5);
    part(h.head, boxGeo(1.32, 0.42, 1.32), cap, 0, 1.3, 0);
    part(h.head, boxGeo(1.0, 0.12, 0.6), cap, 0, 1.12, -0.85);
  }
  if (a >= 1) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.08, 0.5, 1.08), M(0x795548), 0, -1.75, 0); // Gloves
  if (a >= 2) part(h.head, boxGeo(0.2, 0.45, 0.35), M(0x212121), -0.68, 0.65, 0); // Earpiece
  if (a >= 3) badge(h, 0x76ff03); // 'Ranked Up
  if (leader) cape(h, cysian ? 0x7c4dff : 0xc62828, 2.4);
  if (cysian) {
    // Overclock: a glowing aura ring around its feet
    const ring = part(h.root, boxGeo(3.6, 0.08, 3.6), glowThing(h, 0xb388ff), 0, 0.1, 0);
    ring.material.transparent = true;
    ring.material.opacity = 0.35;
  }
  if (b >= 3) part(h.torso, boxGeo(0.8, 0.9, 0.6), M(0x6d4c41), -0.75, -0.6, 0.45); // stone pouch
  // The slingshot: a Y fork in the right hand, a band, and (Bottom 5) a mini trebuchet arm on its back.
  const g = handGroup(h.rightArm);
  const wood = M(b >= 4 ? 0x37474f : 0x8d6e63);
  part(g, boxGeo(0.22, 0.9, 0.22), wood, 0, -0.45, 0);
  for (const x of [-0.3, 0.3]) {
    const prong = part(g, boxGeo(0.18, 0.7, 0.18), wood, x, -1.1, 0);
    prong.rotation.z = x > 0 ? -0.35 : 0.35;
  }
  part(g, boxGeo(0.7, 0.06, 0.06), b >= 4 ? glow(h, 0xff6d00) : M(0xd7ccc8), 0, -1.4, 0.1); // band
  if (b >= 5) {
    const arm = part(h.torso, boxGeo(0.3, 3.2, 0.3), M(0x5d4037), 0.3, 1.0, -0.8);
    arm.rotation.x = -0.5;
    part(h.torso, boxGeo(0.9, 0.6, 0.9), M(0x424242), 0.3, 2.4, -1.6); // counterweight
  }
  setMuzzle(h, g, 0, -1.4, 0.1);
  aimPose(h);
  h.tracer = b >= 4 ? 0xff6d00 : 0xbdbdbd;
  return h;
}

// ---------------------------------------------------------------------------------------------
// Crossbower: a hooded hunter with a crossbow.
// ---------------------------------------------------------------------------------------------

export function makeCrossbower(a, b) {
  const winter = a >= 4;
  const poach = b >= 4;
  const coat = winter ? 0xeceff1 : poach ? 0x4a148c : b >= 3 ? 0x33691e : 0x5d4037;
  const h = makeHumanoid({ skin: 0xd7a36f, shirt: coat, pants: winter ? 0x90a4ae : 0x3e2723, arms: coat, face: 'soldier' });
  const { M } = h;
  boots(h, winter ? 0xb0bec5 : 0x3e2723);
  // Hood
  part(h.head, boxGeo(1.42, 1.0, 1.42), M(winter ? 0xffffff : poach ? 0x311b92 : 0x4e342e), 0, 0.95, -0.08);
  if (winter) for (const x of [-0.8, 0.8]) part(h.torso, boxGeo(0.4, 2.0, 1.1), M(0xfafafa), x, 0, 0); // fur trim
  if (a >= 1) part(h.head, boxGeo(1.25, 0.28, 0.1), glow(h, a >= 3 ? 0x40c4ff : 0xffca28), 0, 0.68, 0.64); // Goggles
  // Quiver on its back: poison-green / tri-color / purple bolts down the Bottom path
  part(h.torso, boxGeo(0.6, 1.6, 0.6), M(0x6d4c41), 0.55, 0.3, -0.75);
  const tips = poach ? [0xe040fb] : b >= 3 ? [0x76ff03, 0xff6d00, 0x40c4ff] : b >= 1 ? [0x76ff03] : [0xbdbdbd];
  tips.forEach((c, i) => part(h.torso, boxGeo(0.12, 0.5, 0.12), glow(h, c), 0.4 + i * 0.15, 1.25, -0.75));
  const len = b >= 3 ? 3.2 : 2.8;
  const gun = holdLongGun(h, len, M(a >= 2 ? 0x4e342e : 0x795548));
  const span = b >= 3 ? 3.4 : 2.8;
  for (const side of [-1, 1]) {
    const l = part(gun, boxGeo(span / 2, 0.2, 0.25), M(winter ? 0x90caf9 : b >= 3 ? 0x90a4ae : 0x6d4c41), (side * span) / 4, -len + 0.5, 0);
    l.rotation.z = side * 0.18;
  }
  part(gun, boxGeo(span * 0.95, 0.05, 0.05), a >= 3 ? glow(h, 0x40c4ff) : poach ? glow(h, 0xe040fb) : M(0xeeeeee), 0, -len + 0.85, 0);
  part(gun, boxGeo(0.12, 1.4, 0.12), a >= 3 ? glow(h, 0x80d8ff) : M(0xbdbdbd), 0, -len + 0.3, 0.25); // loaded bolt
  h.tracer = a >= 3 ? 0x80d8ff : poach ? 0xe040fb : b >= 1 ? 0x76ff03 : 0xd7ccc8;
  return h;
}

// ---------------------------------------------------------------------------------------------
// Gunslinger: a wasteland gunner with a shotgun.
// ---------------------------------------------------------------------------------------------

export function makeGunslinger(a, b) {
  const ravager = b >= 4;
  const h = makeHumanoid({ skin: 0xc68642, shirt: ravager ? 0x3e2723 : 0x8d6e63, pants: 0x4e342e, arms: ravager ? 0x3e2723 : 0x8d6e63, face: 'soldier' });
  const { M } = h;
  boots(h);
  // Wide-brim hat
  const hat = M(ravager ? 0x212121 : 0x6d4c41);
  part(h.head, boxGeo(2.1, 0.12, 2.1), hat, 0, 1.25, 0);
  part(h.head, boxGeo(1.2, 0.5, 1.2), hat, 0, 1.5, 0);
  if (a >= 1) part(h.head, boxGeo(1.25, 0.25, 0.08), M(0x111111), 0, 0.7, 0.63); // Shades
  if (a >= 2) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.08, 0.5, 1.08), M(0x3e2723), 0, -1.75, 0); // Gloves
  if (a >= 4) {
    // Reinforcements: a radio on the shoulder
    part(h.torso, boxGeo(0.6, 0.8, 0.4), M(0x33691e), -0.8, 0.6, -0.4);
    part(h.torso, boxGeo(0.08, 1.2, 0.08), M(0x212121), -0.95, 1.5, -0.4);
  }
  if (b >= 2) part(h.torso, boxGeo(2.15, 0.3, 1.15), M(0xb71c1c), 0, 0.3, 0); // bandolier of AP shells
  if (ravager) {
    for (const x of [-1.1, 1.1]) part(h.torso, boxGeo(0.5, 0.5, 1.2), M(0x616161), x, 0.95, 0); // shoulder plates
    for (const x of [-1.1, 1.1]) part(h.torso, boxGeo(0.12, 0.45, 0.12), M(0xbdbdbd), x, 1.4, 0.2);
  }
  const len = a >= 3 ? 2.6 : 2.0;
  const gun = holdLongGun(h, len, M(0x37474f));
  part(gun, boxGeo(0.4, 0.6, 0.5), M(0x6d4c41), 0, -0.2, -0.05); // stock
  if (b >= 3) part(gun, boxGeo(0.32, len * 0.9, 0.42), M(0x263238), 0.3, -len / 2, 0); // second barrel pair
  if (ravager) part(gun, boxGeo(0.6, 0.6, 0.6), glow(h, 0xff6d00), 0, -len + 0.2, 0); // explosive muzzle
  if (a >= 3) part(gun, boxGeo(0.25, 0.8, 0.3), M(0x111111), 0, -0.9, 0.35); // Marksman scope
  h.tracer = ravager ? 0xff6d00 : 0xffd54f;
  return h;
}

// ---------------------------------------------------------------------------------------------
// Freezer X: a cryo trooper with a freeze-ray and tanks on its back.
// ---------------------------------------------------------------------------------------------

export function makeFreezerX(a, b) {
  const legend = a >= 4;
  const zero = b >= 4;
  const suit = legend ? 0x0d47a1 : zero ? 0xe0f7fa : 0x4fc3f7;
  const h = makeHumanoid({ skin: 0xffe0bd, shirt: suit, pants: 0x37474f, arms: suit, face: 'soldier' });
  const { M } = h;
  boots(h, 0xeceff1, 0x455a64);
  helmet(h, legend ? 0x1a237e : 0xb3e5fc, false);
  part(h.head, boxGeo(1.2, 0.35, 0.1), glow(h, legend ? 0x82b1ff : 0x18ffff), 0, 0.7, 0.64); // visor
  if (legend) for (const x of [-0.45, 0, 0.45]) part(h.head, boxGeo(0.2, 0.5, 0.2), glow(h, 0x82b1ff), x, 1.75, 0); // ice crown
  if (a >= 1) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.08, 0.5, 1.08), M(0xeceff1), 0, -1.75, 0);
  // Tanks: one, then two (Cooling Tanks), glowing at Absolute Zero
  const tanks = b >= 2 ? [-0.45, 0.45] : [0];
  for (const x of tanks) part(h.torso, boxGeo(0.6, 1.6, 0.6), zero ? glow(h, 0x80deea) : M(0x90a4ae), x, 0.2, -0.8);
  if (a >= 2) part(h.torso, boxGeo(2.1, 0.5, 1.1), M(0xffffff), 0, 1.1, 0); // snow on the shoulders
  const len = a >= 3 ? 2.6 : 2.0;
  const gun = holdLongGun(h, len, M(a >= 3 ? 0x455a64 : 0x78909c));
  if (a >= 3) part(gun, boxGeo(0.7, 0.7, 0.7), M(0x263238), 0, -len + 0.3, 0); // explosive launcher drum
  part(gun, boxGeo(0.45, 0.3, 0.45), glow(h, 0x18ffff), 0, -len, 0);
  if (b >= 3) part(gun, boxGeo(0.5, 0.5, 0.2), glow(h, 0xb2ebf2), 0, -0.9, 0.3);
  h.tracer = 0x80deea;
  return h;
}

// ---------------------------------------------------------------------------------------------
// Demolitionist: grenade launcher; rockets up the Top path, an airstrike radio down the Bottom.
// ---------------------------------------------------------------------------------------------

export function makeDemolitionist(a, b) {
  const h = makeHumanoid({ skin: 0x8d5524, shirt: 0x556b2f, pants: 0x3e4a2a, arms: 0x556b2f, face: 'soldier' });
  const { M } = h;
  boots(h);
  helmet(h, a >= 3 ? 0x37474f : 0x4b5320);
  // Grenade bandolier
  part(h.torso, boxGeo(2.15, 0.3, 1.15), M(0x3e2723), 0, 0.3, 0);
  for (const x of [-0.6, -0.2, 0.2, 0.6]) part(h.torso, boxGeo(0.25, 0.3, 0.25), M(0x33691e), x, 0.3, 0.6);
  if (a >= 1) part(h.head, boxGeo(0.3, 0.3, 0.3), M(0xff1744), 0.4, 0.75, 0.65); // Ironsights red dot
  if (b >= 3) {
    // Airstrike radio pack with antenna
    part(h.torso, boxGeo(1.4, 1.5, 0.6), M(0x33691e), 0, 0.1, -0.8);
    part(h.torso, boxGeo(0.08, 1.8, 0.08), M(0x212121), 0.5, 1.5, -0.8);
    if (b >= 4) part(h.torso, boxGeo(0.25, 0.25, 0.25), glow(h, 0xff1744), 0.5, 2.4, -0.8);
  }
  if (a >= 3) {
    // Artilleryman / Bunker Buster: a rocket tube on the shoulder
    const big = a >= 4 ? 1.4 : 1;
    const g = new THREE.Group();
    g.position.set(-0.4, 1.6, 0);
    h.rightArm.add(g);
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0);
    const tube = part(h.torso, boxGeo(0.7 * big, 0.7 * big, 4 * big), M(a >= 4 ? 0x212121 : 0x4b5320), -1.2, 1.1, 0.4);
    part(h.torso, boxGeo(0.8 * big, 0.8 * big, 0.3), M(0xffab00), -1.2, 1.1, 0.4 + 2 * big);
    setMuzzle(h, h.torso, -1.2, 1.1, 0.4 + 2 * big);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.2, 0, -0.3);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.2, leftRecoil: 0.1 };
    tube.userData.big = big;
  } else {
    const gun = holdLongGun(h, b >= 3 ? 2.4 : 2.0, M(0x37474f));
    part(gun, boxGeo(0.8, 0.8, 0.8), M(b >= 3 ? 0x263238 : 0x4b5320), 0, -0.9, 0); // drum
  }
  h.projectile = 'grenade';
  h.tracer = 0xffab40;
  return h;
}

// ---------------------------------------------------------------------------------------------
// Cyberblade: a cyber swordsman (single path, level 0-4).
// ---------------------------------------------------------------------------------------------

export function makeCyberblade(level) {
  const archaic = level >= 4;
  const h = makeHumanoid({ skin: 0xb0bec5, shirt: archaic ? 0x1a1a2e : 0x263238, pants: 0x1a1a1a, arms: 0x37474f, face: 'soldier' });
  const { M } = h;
  boots(h, 0x111111, 0x111111);
  const neon = archaic ? 0xff1744 : level >= 3 ? 0xe040fb : 0x00e5ff;
  // Visor helmet with neon strip, armor seams
  part(h.head, boxGeo(1.4, 1.3, 1.4), M(0x212121), 0, 0.65, 0);
  part(h.head, boxGeo(1.25, 0.25, 0.08), glow(h, neon), 0, 0.72, 0.71);
  for (const y of [0.6, -0.2]) part(h.torso, boxGeo(2.05, 0.08, 1.05), glow(h, neon), 0, y, 0);
  if (level >= 1) cape(h, 0x1a1a1a, 2.2);
  if (level >= 3) for (const x of [-1.1, 1.1]) part(h.torso, boxGeo(0.5, 0.4, 1.2), M(0x455a64), x, 1.0, 0);
  // The sword: a long glowing blade (bigger and red at Prototype Archaic)
  const g = handGroup(h.rightArm);
  part(g, boxGeo(0.25, 0.6, 0.25), M(0x424242), 0, -0.3, 0);
  part(g, boxGeo(0.6, 0.12, 0.3), M(0x9e9e9e), 0, -0.65, 0);
  const len = archaic ? 3.6 : level >= 2 ? 3.0 : 2.4;
  part(g, boxGeo(0.14, len, archaic ? 0.5 : 0.35), glow(h, neon), 0, -0.7 - len / 2, 0);
  setMuzzle(h, g, 0, -0.7 - len / 2, 0);
  h.rightArm.rotation.set(-1.2, 0, 0.1);
  h.leftArm.rotation.set(-0.4, 0, -0.3);
  h.pose = { right: -1.2, left: -0.4, leftRecoil: 0 };
  h.swing = 1.3;
  h.tracer = neon;
  return h;
}

// ---------------------------------------------------------------------------------------------
// Sniper X: a marksman with a long rifle.
// ---------------------------------------------------------------------------------------------

export function makeSniperX(a, b) {
  const h = makeHumanoid({ skin: 0xd2a679, shirt: 0x37474f, pants: 0x263238, arms: 0x37474f, face: 'soldier' });
  const { M } = h;
  boots(h, 0x111111);
  part(h.head, boxGeo(1.42, 0.4, 1.42), M(0x263238), 0, 1.3, 0); // beanie
  if (b >= 1) {
    // Night Vision goggles (flipped down)
    part(h.head, boxGeo(1.0, 0.35, 0.3), M(0x212121), 0, 0.72, 0.7);
    for (const x of [-0.25, 0.25]) part(h.head, boxGeo(0.25, 0.25, 0.3), glow(h, 0x76ff03), x, 0.72, 0.85);
  }
  part(h.torso, boxGeo(2.1, 1.5, 1.1), M(0x455a64), 0, 0.15, 0); // vest
  const len = a >= 4 ? 4.6 : a >= 3 ? 4.2 : 3.6;
  const gun = holdLongGun(h, len, M(a >= 4 ? 0x212121 : 0x3e2723));
  part(gun, boxGeo(0.26, 1.2, 0.32), M(0x111111), 0, -1.1, 0.38); // scope
  if (a >= 3) part(gun, boxGeo(0.06, 0.06, 0.06), glow(h, 0xff1744), 0, -len + 0.3, 0.38); // laser sight
  if (b >= 3) part(gun, boxGeo(0.3, 0.6, 0.6), M(0x263238), 0, -0.8, -0.35); // magazine
  if (b >= 4) part(gun, boxGeo(0.4, 0.15, 0.15), M(0xbdbdbd), 0.25, -0.5, 0.2); // bolt handle
  if (a >= 4) part(gun, boxGeo(0.5, 0.4, 0.5), M(0x424242), 0, -len + 0.15, 0); // muzzle brake
  h.tracer = a >= 3 ? 0xff5252 : 0xffecb3;
  return h;
}

// ---------------------------------------------------------------------------------------------
// Sharpshooter: a rifleman; Molotovs and burning bullets down the Bottom path.
// ---------------------------------------------------------------------------------------------

export function makeSharpshooter(a, b) {
  const survivalist = a >= 4;
  const hot = b >= 4;
  const shirt = survivalist ? 0x2e7d32 : hot ? 0x4e342e : 0x8d6e63;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x3e2723, arms: shirt, face: 'soldier' });
  const { M } = h;
  boots(h);
  if (survivalist) {
    part(h.head, boxGeo(1.45, 0.4, 1.45), M(0x1b5e20), 0, 1.3, 0); // bandana
    part(h.torso, boxGeo(0.9, 1.4, 0.6), M(0x33691e), 0, 0.1, -0.8); // survival pack
  } else helmet(h, a >= 3 ? 0x5d4037 : 0x795548);
  if (a >= 1) badge(h, 0xffd54f);
  if (b >= 1) {
    // Molotovs on the belt
    for (const x of [-0.7, 0.7]) {
      part(h.torso, boxGeo(0.3, 0.55, 0.3), M(0x2e7d32), x, -0.65, 0.6);
      part(h.torso, boxGeo(0.12, 0.2, 0.12), glow(h, 0xff6d00), x, -0.3, 0.6);
    }
  }
  const len = a >= 3 ? 3.4 : 3.0;
  const gun = holdLongGun(h, len, M(hot ? 0xbf360c : 0x3e2723));
  if (a >= 2) part(gun, boxGeo(0.26, 0.9, 0.3), M(0x111111), 0, -1.0, 0.36); // scope
  if (b >= 3) part(gun, boxGeo(0.36, 0.6, 0.46), glow(h, hot ? 0xff3d00 : 0xff9100), 0, -len + 0.3, 0); // glowing barrel
  h.tracer = b >= 3 ? 0xff6d00 : 0xffe082;
  return h;
}

// ---------------------------------------------------------------------------------------------
// Market: a market stall that grows into a shop, an agency or a bank.
// ---------------------------------------------------------------------------------------------

export function makeMarket(a, b) {
  const u = makeThing();
  const { M } = u;
  const bank = b >= 3;
  const big = a >= 3;
  const wall = M(bank ? 0xeceff1 : big ? 0xffe0b2 : 0xbcaaa4);
  const w = big || bank ? 4.6 : 3.6;
  part(u.body, boxGeo(w, 0.3, 3.4), M(0x9e9e9e), 0, 0.15, 0); // floor
  part(u.body, boxGeo(w, 2.6, 0.3), wall, 0, 1.6, -1.5); // back wall
  for (const x of [-w / 2 + 0.15, w / 2 - 0.15]) part(u.body, boxGeo(0.3, 2.6, 3.0), wall, x, 1.6, 0);
  // Striped awning
  for (let i = 0; i < 6; i++) part(u.body, boxGeo(w / 6, 0.15, 1.6), M(i % 2 ? 0xffffff : bank ? 0x1565c0 : 0xd32f2f), -w / 2 + (i + 0.5) * (w / 6), 3.0, 1.0);
  part(u.body, boxGeo(w, 0.6, 0.5), M(0x8d6e63), 0, 0.9, 1.3); // counter
  // Goods on the counter: fruit crates, more of them up the Top path
  const crates = 2 + Math.min(4, a);
  for (let i = 0; i < crates; i++) {
    const x = -w / 2 + 0.6 + (i * (w - 1.2)) / Math.max(1, crates - 1);
    part(u.body, boxGeo(0.6, 0.4, 0.5), M(0x6d4c41), x, 1.4, 1.3);
    part(u.body, boxGeo(0.45, 0.2, 0.35), M([0xe53935, 0xffb300, 0x43a047][i % 3]), x, 1.65, 1.3);
  }
  if (a >= 1) {
    // Advertising: a sign on the roof
    part(u.body, boxGeo(w * 0.7, 0.9, 0.15), M(0xffd54f), 0, 3.7, 0);
    part(u.body, boxGeo(w * 0.5, 0.3, 0.05), glow(u, 0xff5722), 0, 3.7, 0.1);
  }
  if (a >= 2) for (const x of [-w / 2 - 0.5, w / 2 + 0.5]) part(u.body, boxGeo(0.8, 1.2, 0.8), M(0x795548), x, 0.6, -0.8); // Extra Storage
  if (a >= 4) {
    // Government Agency: columns and a flag
    for (const x of [-1.6, -0.5, 0.5, 1.6]) part(u.body, boxGeo(0.3, 2.6, 0.3), M(0xfafafa), x, 1.6, 1.9);
    part(u.body, boxGeo(0.1, 2.4, 0.1), M(0x9e9e9e), w / 2 - 0.2, 4.6, -1.2);
    part(u.body, boxGeo(1.0, 0.6, 0.05), M(0x1e88e5), w / 2 + 0.3, 5.5, -1.2);
  }
  if (b >= 1) part(u.body, boxGeo(0.7, 0.5, 0.5), M(0x37474f), w / 2 - 0.7, 1.35, 1.3); // Cash Register
  if (bank) {
    // Banking: a vault door in the back wall
    part(u.body, boxGeo(1.6, 1.6, 0.2), M(0x78909c), 0, 1.5, -1.3);
    part(u.body, boxGeo(0.6, 0.6, 0.1), glow(u, b >= 4 ? 0xffd54f : 0x90a4ae), 0, 1.5, -1.15);
  }
  u.height = 3.6;
  return u;
}

// ---------------------------------------------------------------------------------------------
// Vulcan: a mounted minigun with spinning barrels.
// ---------------------------------------------------------------------------------------------

export function makeVulcan(a, b) {
  const u = makeThing();
  const { M } = u;
  const plasma = b >= 4;
  const metal = M(b >= 3 ? 0x37474f : 0x546e7a);
  // Tripod and seat
  for (const ang of [0, 2.1, 4.2]) {
    const leg = part(u.body, boxGeo(0.3, 2.0, 0.3), M(0x424242), Math.sin(ang) * 0.9, 0.9, Math.cos(ang) * 0.9);
    leg.rotation.set(Math.cos(ang) * 0.4, 0, -Math.sin(ang) * 0.4);
  }
  part(u.body, boxGeo(1.6, 0.8, 1.6), metal, 0, 2.0, 0);
  if (b >= 2) for (const x of [-1.0, 1.0]) part(u.body, boxGeo(0.25, 1.5, 1.8), M(0x455a64), x, 2.3, 0.4); // Heavy Armor plates
  // Gun body and barrel clusters: two cannons at Double Tap
  const guns = a >= 3 ? [-0.55, 0.55] : [0];
  u.spin = [];
  for (const x of guns) {
    part(u.body, boxGeo(0.9, 0.9, 1.6), metal, x, 2.6, 0.6);
    const spin = new THREE.Group();
    spin.position.set(x, 2.6, 1.4);
    u.body.add(spin);
    const len = a >= 4 ? 2.4 : 1.9;
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      // Barrels along the group's local y; tilted so local y points along +Z, spinning (rotation.y) turns them.
      part(spin, boxGeo(0.14, len, 0.14), plasma ? glow(u, 0x7c4dff) : a >= 4 ? glow(u, 0x76ff03) : M(0x212121), Math.sin(ang) * 0.28, len / 2, Math.cos(ang) * 0.28);
    }
    spin.rotation.x = Math.PI / 2;
    u.spin.push(spin);
    gunMuzzle(u, u.body, x, 2.6, 1.4 + len);
  }
  if (plasma) part(u.body, boxGeo(1.0, 1.0, 1.0), glow(u, 0x7c4dff), 0, 2.6, -0.6); // Plasma Reactor core
  if (a >= 4) part(u.body, boxGeo(0.8, 0.8, 0.8), glow(u, 0x76ff03), 0, 2.6, -0.6); // radioactive ammo box
  // The gunner, seated behind it
  const h = makeHumanoid({ skin: 0xc68642, shirt: 0x3e4a2a, pants: 0x2e3b1f, arms: 0x3e4a2a, face: 'soldier' });
  h.root.scale.setScalar(0.7);
  h.root.position.set(0, 0.6, -1.4);
  h.rightArm.rotation.set(-1.3, 0, 0.2);
  h.leftArm.rotation.set(-1.3, 0, -0.2);
  u.body.add(h.root);
  u.mats.push(...h.mats);
  u.tracer = plasma ? 0xb388ff : a >= 4 ? 0x76ff03 : 0xffd54f;
  u.height = 3.2;
  return u;
}

// ---------------------------------------------------------------------------------------------
// Electricizer: a huge electric cannon on a stand.
// ---------------------------------------------------------------------------------------------

export function makeElectricizer(a, b) {
  const u = makeThing();
  const { M } = u;
  const ship = a >= 5;
  const volt = b >= 5;
  const core = a >= 4 ? 0xff1744 : b >= 3 ? 0x40c4ff : 0xffea00;
  part(u.body, boxGeo(2.6, 0.6, 2.6), M(0x37474f), 0, 0.3, 0); // base
  part(u.body, boxGeo(1.0, 2.0, 1.0), M(0x455a64), 0, 1.5, 0); // stand
  const big = ship ? 1.6 : a >= 3 ? 1.25 : 1;
  const t = new THREE.Group();
  t.position.set(0, 2.9, 0);
  u.body.add(t);
  part(t, boxGeo(1.6 * big, 1.4 * big, 2.2 * big), M(ship ? 0x1a237e : 0x546e7a), 0, 0, 0);
  const len = (a >= 3 ? 4.2 : 3.4) * big;
  part(t, boxGeo(0.5 * big, 0.5 * big, len), M(0x263238), 0, 0, len / 2);
  // Coils along the barrel
  for (let i = 1; i <= 3; i++) part(t, boxGeo(0.8 * big, 0.8 * big, 0.2), glow(u, core), 0, 0, (i * len) / 4);
  part(t, boxGeo(0.9 * big, 0.9 * big, 0.9 * big), glow(u, core), 0, 0.2, -0.9 * big); // core
  if (a >= 1) part(t, boxGeo(0.3, 0.3, 1.0), M(0x111111), 0, 0.85 * big, 0.4); // Extra Range scope
  if (b >= 1) for (const s of [-1, 1]) {
    // Weighted Tripod legs
    const leg = part(u.body, boxGeo(0.3, 2.2, 0.3), M(0x424242), s * 1.3, 0.9, 0.9);
    leg.rotation.z = -s * 0.3;
  }
  if (b >= 3) for (const x of [-0.7, 0.7]) part(t, boxGeo(0.12, 1.6, 0.12), glow(u, 0x80d8ff), x * big, 1.0 * big, 0); // tesla prongs
  if (volt) part(t, boxGeo(2.0 * big, 0.2, 2.0 * big), glow(u, 0x18ffff), 0, -0.8 * big, 0);
  if (ship) for (const x of [-1.6, 1.6]) part(t, boxGeo(0.8, 0.8, 3.0), M(0x283593), x, 0, 0.6); // Starship Killer pods
  gunMuzzle(u, t, 0, 0, len);
  u.turret = t;
  u.tracer = core;
  u.height = 4.5 * big;
  return u;
}

// ---------------------------------------------------------------------------------------------
// Trapper X: a trapper with a sack of spikes (it throws, so it swings).
// ---------------------------------------------------------------------------------------------

export function makeTrapperX(a, b) {
  const perma = a >= 4;
  const mines = b >= 4;
  const h = makeHumanoid({ skin: 0xa1887f, shirt: perma ? 0x37474f : 0x6d4c41, pants: 0x3e2723, arms: perma ? 0x37474f : 0x6d4c41, face: 'soldier' });
  const { M } = h;
  boots(h);
  part(h.head, boxGeo(1.4, 0.45, 1.4), M(0x4e342e), 0, 1.3, 0); // cap
  if (a >= 1) part(h.head, boxGeo(1.25, 0.25, 0.08), glow(h, 0xffab00), 0, 0.72, 0.63); // piercing goggles
  // Sack over the shoulder
  part(h.torso, boxGeo(1.2, 1.6, 1.0), M(0xbcaaa4), -0.4, 0.6, -0.9);
  if (a >= 3) for (let i = 0; i < 3; i++) part(h.torso, boxGeo(0.12, 0.6, 0.12), glow(h, 0x40c4ff), -0.7 + i * 0.3, 1.6, -0.9); // Hi-Tec spikes
  if (b >= 3) part(h.torso, boxGeo(0.7, 0.9, 0.5), M(0x455a64), 0.8, -0.4, 0.5); // R&D kit
  if (mines) for (const x of [-0.4, 0.4]) part(h.torso, boxGeo(0.5, 0.2, 0.5), glow(h, 0xff1744), x, 0.4, 0.6);
  // A spike in the throwing hand
  const g = handGroup(h.rightArm);
  part(g, boxGeo(0.6, 0.15, 0.6), M(0x616161), 0, -0.1, 0);
  for (const [x, z] of [[-0.15, -0.15], [0.15, 0.15], [0.15, -0.15], [-0.15, 0.15]]) part(g, boxGeo(0.08, 0.4, 0.08), mines ? glow(h, 0xff1744) : M(0xbdbdbd), x, -0.35, z);
  setMuzzle(h, g, 0, -0.3, 0);
  h.rightArm.rotation.set(-0.3, 0, 0.1);
  h.leftArm.rotation.set(-0.2, 0, -0.2);
  h.pose = { right: -0.3, left: -0.2, leftRecoil: 0 };
  h.swing = -1.6;
  return h;
}

// ---------------------------------------------------------------------------------------------
// Bugler: a bugle player (snare drum on the Top path, a commander's cape on the Bottom).
// ---------------------------------------------------------------------------------------------

export function makeBugler(a, b) {
  const overseer = a >= 4;
  const coat = overseer ? 0x4a148c : 0x1565c0;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: coat, pants: 0x0d1b3e, arms: coat, face: 'smile' });
  const { M } = h;
  boots(h, 0x111111, 0x111111);
  // Shako hat with plume (Bottom 1)
  part(h.head, boxGeo(1.3, 1.0, 1.3), M(0x0d1b3e), 0, 1.55, 0);
  part(h.head, boxGeo(1.32, 0.15, 1.32), M(0xffd54f), 0, 1.15, 0);
  if (b >= 1) part(h.head, boxGeo(0.3, 0.9, 0.3), M(0xd32f2f), 0, 2.4, 0.2);
  for (const y of [0.6, 0.2, -0.2]) part(h.torso, boxGeo(0.2, 0.2, 0.06), M(0xffd54f), 0, y, 0.52); // buttons
  if (b >= 2) cape(h, 0xc62828, 2.6);
  if (b >= 3) badge(h, 0xffd54f, -0.55); // Unit Commander medal
  if (a >= 3) {
    // Snare drum on its hip
    part(h.torso, boxGeo(1.2, 0.7, 1.2), M(0xfafafa), 0.9, -0.9, 0.5);
    part(h.torso, boxGeo(1.25, 0.12, 1.25), M(0xc62828), 0.9, -0.55, 0.5);
  }
  if (overseer) part(h.head, boxGeo(1.2, 0.25, 0.1), glow(h, 0xe040fb), 0, 0.72, 0.64);
  // The bugle at its lips
  const g = handGroup(h.rightArm);
  const brass = a >= 2 ? glow(h, 0xffca28) : M(0xffb300);
  part(g, boxGeo(0.2, 1.2, 0.2), brass, 0, -0.4, 0);
  part(g, boxGeo(0.6, 0.4, 0.6), brass, 0, -1.1, 0);
  h.rightArm.rotation.set(-2.2, 0, 0.6);
  h.leftArm.rotation.set(-0.3, 0, -0.2);
  h.pose = { right: -2.2, left: -0.3, leftRecoil: 0 };
  setMuzzle(h, g, 0, -1.2, 0);
  h.static = true; // no recoil
  return h;
}

// ---------------------------------------------------------------------------------------------
// Recon Base: a garage with a radar dish.
// ---------------------------------------------------------------------------------------------

export function makeReconBase(a, b) {
  const u = makeThing();
  const { M } = u;
  const alien = a >= 5;
  const bliss = b >= 5;
  const wall = M(alien ? 0x263238 : 0x6d7b5b);
  part(u.body, boxGeo(5.0, 0.3, 4.4), M(0x757575), 0, 0.15, 0);
  part(u.body, boxGeo(4.6, 2.8, 4.0), wall, 0, 1.7, 0);
  part(u.body, boxGeo(4.8, 0.3, 4.2), M(0x424242), 0, 3.2, 0); // roof
  // Garage door (wider with vehicles), striped
  const door = a >= 2 ? 3.2 : 2.0;
  part(u.body, boxGeo(door, 2.0, 0.1), M(0x9e9e9e), 0, 1.3, 2.02);
  for (let i = 0; i < 4; i++) part(u.body, boxGeo(door, 0.06, 0.12), M(0x616161), 0, 0.5 + i * 0.5, 2.05);
  if (a >= 1) for (const x of [-2.0, 2.0]) part(u.body, boxGeo(0.4, 0.4, 0.2), M(0x212121), x, 2.6, 2.05); // vents
  // Radar dish on the roof
  part(u.body, boxGeo(0.2, 1.0, 0.2), M(0x9e9e9e), 1.4, 3.8, -1.0);
  const dish = part(u.body, boxGeo(1.4, 0.15, 1.4), M(0xeceff1), 1.4, 4.4, -1.0);
  dish.rotation.x = -0.5;
  if (a >= 3) for (let i = 0; i < 3; i++) part(u.body, boxGeo(0.25, 0.25, 1.2), M(0xc62828), -1.6 + i * 0.4, 3.5, -1.2); // missile rack
  if (b >= 1) part(u.body, boxGeo(0.1, 2.2, 0.1), M(0x9e9e9e), -2.0, 4.4, 1.6); // flagpole
  if (b >= 1) part(u.body, boxGeo(1.0, 0.6, 0.05), M(b >= 4 ? 0x212121 : 0x2e7d32), -1.5, 5.2, 1.6);
  if (b >= 3) part(u.body, boxGeo(1.4, 1.0, 1.4), M(0x5d6b4b), 0, 0.7, -2.9); // sandbags
  if (alien) part(u.body, boxGeo(4.0, 0.15, 0.15), glow(u, 0x00e676), 0, 2.9, 2.05);
  if (bliss) {
    const beacon = part(u.body, boxGeo(0.6, 0.6, 0.6), glow(u, 0xff4081), -1.2, 3.7, 0.6);
    beacon.rotation.y = 0.78;
  }
  u.height = 4;
  return u;
}

// ---------------------------------------------------------------------------------------------
// Elite: an armored plasma trooper.
// ---------------------------------------------------------------------------------------------

export function makeElite(a, b) {
  const accel = a >= 4;
  const immo = b >= 4;
  const plasma = immo ? 0xff3d00 : accel ? 0xe040fb : 0x00e5ff;
  const h = makeHumanoid({ skin: 0x8d5524, shirt: 0x263238, pants: 0x1c262b, arms: 0x37474f, face: 'soldier' });
  const { M } = h;
  boots(h, 0x111111, 0x263238);
  part(h.head, boxGeo(1.45, 1.35, 1.45), M(0x37474f), 0, 0.68, 0);
  part(h.head, boxGeo(1.25, 0.3, 0.08), glow(h, plasma), 0, 0.75, 0.73);
  if (a >= 2) part(h.torso, boxGeo(2.2, 1.7, 1.2), M(0x455a64), 0, 0.1, 0); // Armor Plating
  if (a >= 1) for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.35, 0.8, 0.3), M(0x616161), x, 0.3, -0.7); // vents
  if (b >= 1) part(h.rightArm, boxGeo(1.05, 1.2, 1.05), M(0x78909c), 0, -1.0, 0); // cyborg arm
  const len = a >= 3 || b >= 4 ? 3.0 : 2.4;
  const gun = holdLongGun(h, len, M(0x212121));
  part(gun, boxGeo(0.5, 0.8, 0.6), glow(h, plasma), 0, -0.9, 0); // plasma cell
  if (b >= 2) part(gun, boxGeo(0.45, 0.45, 0.45), glow(h, 0x76ff03), 0, -len + 0.25, 0);
  if (accel) for (let i = 0; i < 3; i++) part(gun, boxGeo(0.5, 0.1, 0.5), glow(h, plasma), 0, -1.4 - i * 0.4, 0);
  h.tracer = plasma;
  return h;
}

// ---------------------------------------------------------------------------------------------
// Businessman: a suit, a briefcase and a pistol.
// ---------------------------------------------------------------------------------------------

export function makeBusinessman(a, b) {
  const sleazy = a >= 4;
  const omni = b >= 4;
  const suit = sleazy ? 0x4a148c : omni ? 0x212121 : 0x37474f;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: suit, pants: suit, arms: suit, face: 'smile' });
  const { M } = h;
  boots(h, 0x111111, 0x111111);
  part(h.torso, boxGeo(0.6, 1.2, 0.06), M(0xffffff), 0, 0.3, 0.52); // shirt
  part(h.torso, boxGeo(0.25, 1.0, 0.08), M(sleazy ? 0xffd54f : 0xc62828), 0, 0.2, 0.56); // tie
  if (a >= 2 || omni) {
    part(h.head, boxGeo(1.5, 0.12, 1.5), M(0x111111), 0, 1.25, 0); // fedora
    part(h.head, boxGeo(1.15, 0.55, 1.15), M(0x111111), 0, 1.55, 0);
  }
  if (b >= 2) part(h.head, boxGeo(1.25, 0.22, 0.08), M(0x111111), 0, 0.7, 0.63); // shades
  if (sleazy) for (const x of [-0.4, 0.4]) part(h.torso, boxGeo(0.2, 0.2, 0.06), glow(h, 0xffd54f), x, 0.8, 0.55); // gold cufflinks
  // Briefcase in the left hand
  const bc = handGroup(h.leftArm);
  part(bc, boxGeo(0.4, 1.0, 1.3), M(a >= 1 ? 0x3e2723 : 0x5d4037), 0, -0.6, 0);
  if (a >= 3) part(bc, boxGeo(0.45, 0.2, 0.3), glow(h, 0x69f0ae), 0, -0.2, 0); // cash peeking out
  h.leftArm.rotation.set(0, 0, -0.1);
  // Pistol in the right hand
  const g = handGroup(h.rightArm);
  part(g, boxGeo(0.28, 0.9, 0.35), M(sleazy ? 0xffd54f : 0x212121), 0, -0.45, 0);
  part(g, boxGeo(0.25, 0.3, 0.5), M(0x3e2723), 0, -0.05, -0.15);
  setMuzzle(h, g, 0, -0.9, 0);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.pose = { right: -Math.PI / 2, left: 0, leftRecoil: 0 };
  h.tracer = sleazy ? 0xffd54f : 0xffe082;
  return h;
}

// ---------------------------------------------------------------------------------------------
// Mechanic: overalls, a toolbelt and a nailgun.
// ---------------------------------------------------------------------------------------------

export function makeMechanic(a, b) {
  const h = makeHumanoid({ skin: 0xd9a066, shirt: 0xef6c00, pants: 0x1565c0, arms: 0xef6c00, face: 'smile' });
  const { M } = h;
  boots(h, 0x3e2723, 0x5d4037);
  part(h.torso, boxGeo(2.05, 1.4, 1.05), M(0x1565c0), 0, -0.25, 0); // overall bib
  helmet(h, 0xffd600); // hard hat
  if (a >= 2) part(h.head, boxGeo(1.25, 0.25, 0.08), glow(h, 0x00e5ff), 0, 0.72, 0.63); // AI goggles
  // Toolbelt
  for (const x of [-0.7, 0, 0.7]) part(h.torso, boxGeo(0.35, 0.45, 0.3), M(0x6d4c41), x, -0.95, 0.6);
  // Backpack: a turret kit, a tesla coil down the Bottom path
  part(h.torso, boxGeo(1.4, 1.4, 0.7), M(0x546e7a), 0, 0.2, -0.85);
  if (b >= 3) part(h.torso, boxGeo(0.25, 1.4, 0.25), glow(h, 0x80d8ff), 0, 1.4, -0.85);
  if (b >= 4) {
    const f = part(h.root, boxGeo(3.6, 0.06, 3.6), glowThing(h, 0x40c4ff), 0, 0.1, 0);
    f.material.transparent = true;
    f.material.opacity = 0.3;
  }
  if (a >= 3) part(h.torso, boxGeo(0.5, 0.5, 0.5), M(0xc62828), 0.6, 0.9, -0.9); // ammo can
  const g = handGroup(h.rightArm);
  part(g, boxGeo(0.4, 1.1, 0.5), M(b >= 1 ? 0x455a64 : 0x616161), 0, -0.5, 0);
  part(g, boxGeo(0.35, 0.4, 0.6), M(0xffd600), 0, -0.1, -0.2);
  setMuzzle(h, g, 0, -1.1, 0);
  aimPose(h);
  h.tracer = 0xbdbdbd;
  return h;
}

// ---------------------------------------------------------------------------------------------
// Surveyor: a drone operator with a controller and an antenna pack.
// ---------------------------------------------------------------------------------------------

export function makeSurveyor(a, b) {
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: 0x37474f, pants: 0x263238, arms: 0x37474f, face: 'soldier' });
  const { M } = h;
  boots(h);
  part(h.head, boxGeo(1.42, 0.45, 1.42), M(0x212121), 0, 1.3, 0);
  part(h.head, boxGeo(0.25, 0.4, 0.4), M(0x212121), 0.7, 0.7, 0); // headset
  // Antenna pack: taller with Surveying Zone, a radar dish with Drone Intel
  part(h.torso, boxGeo(1.4, 1.6, 0.7), M(0x455a64), 0, 0.2, -0.85);
  part(h.torso, boxGeo(0.1, a >= 1 ? 2.8 : 1.8, 0.1), M(0x9e9e9e), 0.5, a >= 1 ? 2.3 : 1.8, -0.85);
  part(h.torso, boxGeo(0.25, 0.25, 0.25), glow(h, b >= 4 ? 0xff1744 : 0x76ff03), 0.5, a >= 1 ? 3.7 : 2.7, -0.85);
  if (a >= 3) {
    const d = part(h.torso, boxGeo(1.0, 0.1, 1.0), M(0xeceff1), -0.4, 1.4, -0.85);
    d.rotation.x = -0.6;
  }
  if (a >= 4) part(h.torso, boxGeo(0.5, 0.5, 0.5), glow(h, 0x80deea), -0.6, -0.3, -0.9); // cryo cell
  if (b >= 3) badge(h, 0xff6d00);
  // Controller in both hands
  const g = handGroup(h.rightArm);
  part(g, boxGeo(1.2, 0.3, 0.7), M(0x212121), 0.4, -0.2, 0);
  part(g, boxGeo(0.8, 0.05, 0.5), glow(h, 0x00e5ff), 0.4, -0.05, 0);
  h.rightArm.rotation.set(-1.1, 0, 0.3);
  h.leftArm.rotation.set(-1.1, 0, -0.3);
  h.pose = { right: -1.1, left: -1.1, leftRecoil: 0 };
  setMuzzle(h, g, 0, 0, 0);
  h.static = true;
  return h;
}

// ---------------------------------------------------------------------------------------------
// Lightbeamer: a high-tech beam gunner.
// ---------------------------------------------------------------------------------------------

export function makeLightbeamer(a, b) {
  const proto = a >= 5;
  const pellets = b >= 3;
  const beam = proto ? 0xffffff : a >= 4 ? 0xff4081 : pellets ? 0x76ff03 : 0xffee58;
  const h = makeHumanoid({ skin: 0xffe0bd, shirt: 0xeceff1, pants: 0x90a4ae, arms: 0xeceff1, face: 'soldier' });
  const { M } = h;
  boots(h, 0x455a64, 0x78909c);
  if (a >= 1) for (const x of [-0.6, 0.6]) part(h.torso, boxGeo(0.4, 1.8, 0.08), M(0xffab00), x, 0.1, 0.53); // OSHA hi-vis stripes
  if (a >= 2) part(h.torso, boxGeo(2.15, 1.9, 1.15), M(0x455a64), 0, 0.05, 0); // Nanosuit
  part(h.head, boxGeo(1.45, 1.35, 1.45), M(a >= 2 ? 0x37474f : 0xfafafa), 0, 0.68, 0);
  part(h.head, boxGeo(1.25, 0.35, 0.08), glow(h, beam), 0, 0.75, 0.73);
  if (pellets) for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.4, 0.4, 0.4), glow(h, 0x76ff03), x, 0.9, -0.7); // Avarian cells
  const len = a >= 3 ? 3.4 : 2.8;
  const gun = holdLongGun(h, len, M(0xcfd8dc));
  part(gun, boxGeo(0.6, 0.9, 0.6), glow(h, beam), 0, -1.0, 0);
  for (let i = 0; i < (a >= 4 ? 4 : 2); i++) part(gun, boxGeo(0.5, 0.1, 0.5), glow(h, beam), 0, -1.7 - i * 0.35, 0);
  if (proto) part(gun, boxGeo(1.0, 1.0, 1.0), glow(h, 0xe1f5fe), 0, -len + 0.4, 0);
  h.tracer = beam;
  return h;
}

// ---------------------------------------------------------------------------------------------
// Units: Mercenary, Recon Base units and Surveyor drones.
// ---------------------------------------------------------------------------------------------

/** A small soldier for a squad (humanoid scaled down) with a gun pointing forward. */
function squadMember(look) {
  const h = makeHumanoid({ skin: look.skin ?? 0xc68642, shirt: look.shirt, pants: look.pants ?? 0x263238, arms: look.shirt, face: 'soldier' });
  const { M } = h;
  helmet(h, look.helmet ?? 0x37474f);
  if (look.visor) part(h.head, boxGeo(1.2, 0.3, 0.08), glow(h, look.visor), 0, 0.72, 0.64);
  const gun = holdLongGun(h, look.gun ?? 2.2, M(0x212121));
  if (look.tube) part(gun, boxGeo(0.6, 1.2, 0.6), M(0x4b5320), 0, -0.6, 0);
  return h;
}

function squad(count, look, scale = 0.6) {
  const u = makeThing();
  u.static = false;
  u.wheels = [];
  u.soldiers = [];
  for (let i = 0; i < count; i++) {
    const h = squadMember(look(i));
    h.root.scale.setScalar(scale);
    h.root.position.set(count === 1 ? 0 : (i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.soldiers.push(h);
    u.muzzles.push(h.muzzles[0]);
  }
  u.height = 3.4;
  u.tracer = 0xffe082;
  return u;
}

// The Sky-drones and the Bliss of Finality are built with the vehicle kit (airunits.js).

export const UNIT_MODELS_E = {
  gsMerc: (n = 1) => squad(n, () => ({ shirt: 0x6d4c41, helmet: 0x3e2723 })),
  rbOperative: (n = 1) => squad(n, () => ({ shirt: 0x556b2f, helmet: 0x4b5320 })),
  rbOperative2: (n = 1) => squad(n, () => ({ shirt: 0x37474f, helmet: 0x263238, visor: 0x76ff03 })),
  rbPrivate: (n = 1) => squad(n, () => ({ shirt: 0x1b5e20, helmet: 0x212121, visor: 0xffab00 })),
  rbSolemn: (n = 1) => squad(n, (i) => ({ shirt: 0x212121, helmet: 0x111111, visor: [0xff1744, 0x00e5ff, 0xffab00, 0x76ff03][i % 4], gun: i === 1 ? 3.2 : 2.2, tube: i === 3 }), 0.65),
};

// ---------------------------------------------------------------------------------------------
// Mechanic turrets (sentries): `kind` is the turret's model index (see crosstowers.js).
// ---------------------------------------------------------------------------------------------

const TURRET_LOOK = [
  { color: 0x757575, barrels: 1, len: 1.0, light: 0x76ff03 }, // M1
  { color: 0x546e7a, barrels: 1, len: 1.5, light: 0x00e5ff }, // M2
  { color: 0x455a64, barrels: 2, len: 1.6, light: 0xffab00 }, // M3
  { color: 0x263238, barrels: 4, len: 1.8, light: 0xff1744 }, // M4
  { color: 0x5d4037, barrels: 1, len: 1.2, light: 0xff6d00, big: true }, // Detonator
  { color: 0x4a148c, barrels: 1, len: 1.4, light: 0x76ff03, orb: true }, // Plasmator
  { color: 0x1b5e20, barrels: 1, len: 2.6, light: 0xffea00 }, // Hunter
  { color: 0x0277bd, tesla: true, light: 0x80d8ff }, // M1 Tesla
  { color: 0x01579b, tesla: true, light: 0x18ffff, big: true }, // M2 Tesla
];

export function makeMechTurret(kind) {
  const look = TURRET_LOOK[kind] ?? TURRET_LOOK[0];
  const u = makeThing();
  const { M } = u;
  for (const ang of [0, 2.1, 4.2]) {
    const leg = part(u.body, boxGeo(0.2, 1.4, 0.2), M(0x424242), Math.sin(ang) * 0.55, 0.6, Math.cos(ang) * 0.55);
    leg.rotation.set(Math.cos(ang) * 0.4, 0, -Math.sin(ang) * 0.4);
  }
  const t = turret(u, 1.35);
  const big = look.big ? 1.3 : 1;
  if (look.tesla) {
    // Tesla: a coil with a glowing orb on top
    part(t, boxGeo(0.8 * big, 0.5, 0.8 * big), M(look.color), 0, 0, 0);
    for (let i = 0; i < 3; i++) part(t, boxGeo(0.55 * big, 0.12, 0.55 * big), M(0xb87333), 0, 0.35 + i * 0.3, 0);
    part(t, boxGeo(0.6 * big, 0.6 * big, 0.6 * big), glow(u, look.light), 0, 1.4, 0);
    gunMuzzle(u, t, 0, 1.4, 0);
  } else {
    part(t, boxGeo(1.0 * big, 0.7 * big, 1.2 * big), M(look.color), 0, 0.25, 0);
    part(t, boxGeo(0.45, 0.18, 0.08), glow(u, look.light), 0, 0.45 * big, 0.62 * big);
    for (let i = 0; i < look.barrels; i++) {
      const x = look.barrels === 1 ? 0 : -0.18 + (i % 2) * 0.36;
      const y = 0.25 + (look.barrels === 4 ? (i < 2 ? -0.12 : 0.12) : 0);
      part(t, boxGeo(0.16, 0.16, look.len), M(0x212121), x, y, 0.6 * big + look.len / 2);
    }
    if (look.orb) part(t, boxGeo(0.4, 0.4, 0.4), glow(u, look.light), 0, 0.25, 0.6 * big + look.len);
    gunMuzzle(u, t, 0, 0.25, 0.6 * big + look.len);
  }
  u.tracer = look.light;
  u.height = 2.6;
  return u;
}

/** Tower model makers by crosspath form type, taking (top, bottom). */
export const CROSS_MODELS = {
  scoutSlinger: makeSlinger,
  archerCrossbower: makeCrossbower,
  shotgunnerGunslinger: makeGunslinger,
  frostFreezerX: makeFreezerX,
  grenadierDemolitionist: makeDemolitionist,
  sniperX: makeSniperX,
  marksmanSharpshooter: makeSharpshooter,
  farmMarket: makeMarket,
  commandoVulcan: makeVulcan,
  railgunnerElectricizer: makeElectricizer,
  trapperX: makeTrapperX,
  commanderBugler: makeBugler,
  zedRecon: makeReconBase,
  phaserElite: makeElite,
  cowboyBusinessman: makeBusinessman,
  engineerMechanic: makeMechanic,
  ghostSurveyor: makeSurveyor,
  plasmaLightbeamer: makeLightbeamer,
};

/** Plain-level tower models (no crosspathing). */
export const TOWER_MODELS_E = {
  gladiatorCyberblade: makeCyberblade,
};
