// Tower models, file 12 of 12. Each makeX(level) builds one tower's look.
// In here:
// Void Traitor, Psycho Slayer, Bubble Blower, Firecracker, Quarterer,
// Penetrator. (MLRS: machines3.js; Darter: people1.js.)
// The list of which tower uses which builder is TOWER_MODELS in ../models.js.

import * as THREE from 'three';
import { boxGeo, makeHumanoid, part } from './kit.js';
import { addHandgun, clearMat, cylGeo, glow, helmet, holdLongGun, inHand, setMuzzle } from './bits.js';

/**
 * Void Traitor (event): a dark knight with a glowing void sword. Lv 1 a longer blade, Lv 2 the
 * blade glows, Lv 3 an All Seeing Eye on the helm and chest, Lv 4 Void Armor with spiked shoulders,
 * Lv 5 the full Void Traitor: bigger, with wings, floating void rocks and an aura ring.
 */
export function makeVoidTraitor(level) {
  const full = level >= 5;
  const h = makeHumanoid({ skin: 0x9575cd, shirt: 0x1a0033, pants: 0x0b0014, arms: 0x311b92, face: 'none' });
  const { M } = h;
  const voidC = full ? 0xd500f9 : 0xaa00ff;
  const rune = glow(h, voidC);
  const plate = M(level >= 4 ? 0x120020 : 0x2a1a40);
  part(h.head, boxGeo(1.45, 1.45, 1.45), plate, 0, 0.65, 0); // helm
  part(h.head, boxGeo(1.0, 0.15, 0.1), rune, 0, 0.75, 0.74); // visor slit
  part(h.torso, boxGeo(2.2, 3.2 + level * 0.15, 0.12), M(0x1a0033), 0, -0.6, -0.6); // cape
  if (level >= 3) {
    part(h.head, boxGeo(0.35, 0.35, 0.1), glow(h, 0xff1744), 0, 1.05, 0.75); // All Seeing Eye
    part(h.torso, boxGeo(0.5, 0.5, 0.1), rune, 0, 0.4, 0.55);
  }
  if (level >= 4) {
    part(h.torso, boxGeo(2.2, 1.7, 1.2), plate, 0, 0.2, 0);
    for (const side of [-1, 1]) {
      part(h.torso, boxGeo(0.9, 0.6, 1.3), plate, side * 1.35, 1.1, 0);
      part(h.torso, boxGeo(0.25, 0.8, 0.25), rune, side * 1.5, 1.7, 0).rotation.z = side * -0.4; // spikes
    }
  }
  if (full) {
    for (const side of [-1, 1]) part(h.torso, boxGeo(2.8, 2.0, 0.12), M(0x0b0014), side * 1.8, 0.9, -0.75).rotation.z = side * 0.45; // wings
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      part(h.root, boxGeo(0.5, 0.45, 0.5), M(0x311b92), Math.cos(a) * 2.4, 4 + (i % 2) * 1.2, Math.sin(a) * 2.4).rotation.set(a, a, 0); // void rocks
    }
    const ring = part(h.root, cylGeo(2.8, 2.8, 0.06, 20), clearMat(h, voidC, 0.3), 0, 0.05, 0);
    ring.castShadow = false;
  }
  const sword = inHand(h);
  const bl = [2.0, 2.4, 2.6, 2.9, 3.2, 4.2][level];
  const bw = full ? 0.6 : 0.3 + level * 0.05;
  part(sword, boxGeo(0.25, 0.5, 0.25), M(0x111111), 0, -0.2, 0);
  part(sword, boxGeo(1.0 + level * 0.1, 0.14, 0.25), M(0x4a148c), 0, -0.45, 0);
  part(sword, boxGeo(bw, bl, 0.12), level >= 2 ? rune : M(0x5e35b1), 0, -0.5 - bl / 2, 0);
  setMuzzle(h, sword, 0, -0.5 - bl, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  h.leftArm.rotation.set(-0.3, 0, -0.2);
  h.pose = { right: -2.4, left: -0.3, leftRecoil: 0 };
  h.swing = 2;
  h.melee = true;
  h.tracer = voidC;
  if (full) h.body.scale.setScalar(1.2);
  return h;
}

// ---------------------------------------------------------------- event towers (wave 5)

/**
 * Psycho Slayer (alternate event Commando form): a huge armored warrior with a Bolter gun and a
 * spiked mace. Lv 1 a sealed helmet, Lv 2 heavy chest armor, Lv 3 railguns on its back, Lv 4 a
 * white space suit with rocket pods, Lv 5 Psycho Warrior: black and red armor with a mortar tube.
 * A purple Dimension Shard marks the form.
 */
export function makePsychoSlayer(level) {
  const space = level === 4;
  const psycho = level >= 5;
  const armor = psycho ? 0x212121 : space ? 0xeceff1 : level >= 2 ? 0x455a64 : 0x5d6b3a;
  const trim = psycho ? 0xd50000 : space ? 0x1565c0 : 0xffb300;
  const h = makeHumanoid({ skin: 0xc68642, shirt: armor, pants: psycho ? 0x111111 : 0x37474f, arms: armor, face: 'soldier' });
  const { M } = h;
  const plate = M(armor);
  const trimM = M(trim);
  const eye = glow(h, psycho ? 0xff1744 : 0x76ff03);
  // Bulky armor: wide pauldrons, chest plate and big boots.
  for (const side of [-1, 1]) {
    part(h.torso, boxGeo(1.2, 0.9, 1.5), plate, side * 1.45, 0.95, 0);
    part(h.torso, boxGeo(1.25, 0.15, 1.55), trimM, side * 1.45, 1.42, 0);
  }
  part(h.torso, boxGeo(2.25, 1.6, 1.25), plate, 0, 0.25, 0);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.5, 0.65); // Dimension Shard
  for (const leg of [h.leftLeg, h.rightLeg]) part(leg, boxGeo(1.2, 0.8, 1.35), plate, 0, -1.6, 0.1);
  if (level >= 1) {
    part(h.head, boxGeo(1.45, 1.4, 1.45), plate, 0, 0.65, 0); // sealed helmet
    part(h.head, boxGeo(1.1, 0.25, 0.1), eye, 0, 0.72, 0.74);
  } else helmet(h, 0x3e4a2a);
  if (level >= 3) {
    // Railguns over the shoulders.
    for (const side of [-1, 1]) {
      part(h.torso, boxGeo(0.4, 0.4, 2.6), M(0x263238), side * 0.7, 1.6, -0.6);
      part(h.torso, boxGeo(0.45, 0.45, 0.2), glow(h, 0x40c4ff), side * 0.7, 1.6, 0.75);
    }
    part(h.torso, boxGeo(1.8, 1.4, 0.7), M(0x263238), 0, 0.3, -0.85); // power pack
  }
  if (level >= 4) {
    // Rocket pods on the back.
    for (const side of [-1, 1]) {
      part(h.torso, boxGeo(0.9, 0.9, 0.9), trimM, side * 1.3, 0.2, -0.9);
      for (const y of [0.0, 0.4]) part(h.torso, boxGeo(0.25, 0.25, 0.1), M(0x111111), side * 1.3, y, -0.42);
    }
  }
  if (psycho) {
    part(h.torso, boxGeo(0.8, 2.6, 0.8), M(0x424242), 0, 1.6, -1.0).rotation.x = -0.3; // mortar tube
    part(h.torso, boxGeo(0.9, 0.2, 0.9), eye, 0, 2.85, -1.4);
    for (const x of [-0.45, 0, 0.45]) part(h.head, boxGeo(0.2, 0.6, 0.2), trimM, x, 1.55, 0); // crest
  }
  // Bolter in the right hand, spiked mace in the left.
  const gun = holdLongGun(h, 2.2, M(0x263238));
  part(gun, boxGeo(0.6, 1.0, 0.75), trimM, 0, -0.7, 0);
  part(gun, boxGeo(0.5, 0.3, 0.55), M(0x111111), 0, -2.2, 0);
  const mace = new THREE.Group();
  mace.position.set(0, -1.9, 0);
  h.leftArm.add(mace);
  part(mace, boxGeo(0.25, 1.6, 0.25), M(0x5d4037), 0, -0.6, 0);
  part(mace, boxGeo(0.9, 0.9, 0.9), M(psycho ? 0x424242 : 0x78909c), 0, -1.6, 0);
  for (const [x, y, z] of [[0.55, -1.6, 0], [-0.55, -1.6, 0], [0, -1.6, 0.55], [0, -1.6, -0.55], [0, -2.15, 0]]) part(mace, boxGeo(0.2, 0.2, 0.2), trimM, x, y, z);
  h.leftArm.rotation.set(-0.5, 0, -0.3);
  h.pose = { right: -Math.PI / 2, left: -0.5, leftRecoil: 0.25 };
  h.root.scale.setScalar(1.25); // a big warrior
  h.tracer = psycho ? 0xff5252 : 0xffd740;
  h.tracerWidth = 0.22;
  return h;
}

/**
 * Bubble Blower (alternate Cryomancer form): a cheerful kid with a bubble wand. Lv 1 gloves, Lv 2
 * a chunky bubble gun with a soap tank, Lv 3 big muscles, Lv 4 a second tank, Lv 5 Super Bubble
 * Man: a cape and a bubble helmet. A purple Dimension Shard marks the form.
 */
export function makeBubbleBlower(level) {
  const shirt = [0x4fc3f7, 0x4fc3f7, 0x29b6f6, 0x0288d1, 0x0277bd, 0xec407a][level];
  const h = makeHumanoid({ skin: 0xf1c27d, shirt, pants: 0x3949ab, arms: level >= 3 ? 0xf1c27d : shirt });
  const { M } = h;
  const soap = glow(h, 0xb3e5fc);
  const pink = M(0xf48fb1);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.5, 0.52); // Dimension Shard
  part(h.head, boxGeo(1.3, 0.3, 1.3), M(0xffeb3b), 0, 1.25, 0); // cap
  part(h.head, boxGeo(1.3, 0.12, 0.6), M(0xffeb3b), 0, 1.15, 0.8); // cap brim
  if (level >= 1) for (const arm of [h.leftArm, h.rightArm]) part(arm, boxGeo(1.1, 0.6, 1.1), pink, 0, -1.8, 0); // gloves
  if (level >= 3) for (const arm of [h.leftArm, h.rightArm]) part(arm, boxGeo(1.25, 0.9, 1.25), M(0xf1c27d), 0, -0.6, 0); // big muscles
  const tanks = level >= 4 ? [-0.5, 0.5] : level >= 2 ? [0] : [];
  for (const x of tanks) {
    part(h.torso, boxGeo(0.75, 1.6, 0.75), M(0xe1f5fe), x, 0.1, -0.9);
    part(h.torso, boxGeo(0.6, 1.2, 0.1), soap, x, 0.1, -1.28);
  }
  let muzzle;
  if (level >= 2) {
    const gun = holdLongGun(h, 1.6 + (level >= 4 ? 0.4 : 0), pink);
    const len = 1.6 + (level >= 4 ? 0.4 : 0);
    part(gun, boxGeo(0.8, 0.8, 0.8), M(0x80deea), 0, -0.5, 0); // bubble chamber
    part(gun, boxGeo(0.6, 0.15, 0.6), soap, 0, -len, 0);
    muzzle = h.muzzles[0];
  } else {
    // A plain bubble wand: a stick with a ring on the end.
    const wand = new THREE.Group();
    wand.position.set(0, -1.9, 0);
    h.rightArm.add(wand);
    part(wand, boxGeo(0.15, 1.2, 0.15), pink, 0, -0.6, 0);
    for (const [x, y] of [[0.35, 0], [-0.35, 0], [0, 0.35], [0, -0.35]]) part(wand, boxGeo(0.2, 0.2, 0.12), soap, x, -1.55 + y, 0);
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-0.3, 0, -0.2);
    muzzle = setMuzzle(h, wand, 0, -1.6, 0);
    h.pose = { right: -Math.PI / 2, left: -0.3, leftRecoil: 0 };
  }
  if (level >= 5) {
    part(h.torso, boxGeo(2.0, 2.6, 0.12), M(0xf06292), 0, -0.3, -0.62); // cape
    const helm = part(h.head, new THREE.SphereGeometry(1.05, 12, 10), glow(h, 0xb3e5fc), 0, 0.6, 0); // bubble helmet
    helm.material.transparent = true;
    helm.material.opacity = 0.35;
    helm.castShadow = false;
  }
  h.muzzles = [muzzle];
  h.tracer = 0xb3e5fc;
  h.tracerWidth = 0.3;
  return h;
}

/**
 * Firecracker (free alternate Grenadier form): a festive thrower with a red firecracker and a lit
 * fuse. Lv 1 a sash of firecrackers, Lv 2 a red cap, Lv 3 a second firecracker in the left hand,
 * Lv 4 goggles, Lv 5 a gold dragon-trim jacket and a bundle of three.
 */
export function makeFirecracker(level) {
  const finale = level >= 5;
  const shirt = finale ? 0xb71c1c : 0xe53935;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x212121, arms: shirt, face: 'soldier' });
  const { M } = h;
  const shard = glow(h, 0xb388ff);
  const red = M(0xd50000);
  const gold = M(0xffc107);
  const fuse = glow(h, 0xffeb3b);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, 0.55, 0.45, 0.52);
  const cracker = (parent, x, y) => {
    part(parent, boxGeo(0.28, 0.75, 0.28), red, x, y, 0);
    part(parent, boxGeo(0.3, 0.1, 0.3), gold, x, y + 0.3, 0);
    part(parent, boxGeo(0.05, 0.3, 0.05), fuse, x, y - 0.5, 0);
  };
  if (level >= 1) {
    const sash = part(h.torso, boxGeo(0.3, 2.5, 1.12), gold, 0, 0, 0);
    sash.rotation.z = -0.7;
    for (const t of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.22, 0.45, 0.22), red, t * 0.75, t * 0.8, 0.65);
  }
  if (level >= 2) {
    part(h.head, boxGeo(1.32, 0.45, 1.32), M(0xc62828), 0, 1.3, 0); // cap
    part(h.head, boxGeo(1.1, 0.12, 0.7), M(0xc62828), 0, 1.1, 0.85);
    part(h.head, boxGeo(0.3, 0.3, 0.06), shard, 0, 1.32, 0.67);
  }
  if (level >= 4) {
    part(h.head, boxGeo(1.25, 0.28, 0.2), M(0x263238), 0, 0.72, 0.68);
    for (const x of [-0.27, 0.27]) part(h.head, boxGeo(0.34, 0.2, 0.05), M(0xffb74d), x, 0.72, 0.79);
  }
  if (finale) {
    part(h.torso, boxGeo(2.15, 0.2, 1.15), gold, 0, 0.9, 0); // gold collar
    part(h.torso, boxGeo(2.15, 0.15, 1.15), gold, 0, -0.95, 0); // gold hem
    part(h.torso, boxGeo(0.5, 1.2, 0.05), gold, -0.45, 0.1, 0.58); // dragon trim
  }
  if (level >= 3) cracker(h.leftArm, 0, -2.3); // Double Pack: a second one ready
  const hand = new THREE.Group();
  hand.position.set(0, -2.1, 0);
  h.rightArm.add(hand);
  if (finale) for (const x of [-0.3, 0, 0.3]) cracker(hand, x, -0.2);
  else cracker(hand, 0, -0.2);
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -2.8, left: -1.0, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = { color: 0xd50000, size: 0.35, arc: 3 };
  return h;
}

/**
 * Quarterer (alternate Soldier form): a gunslinger with two pistols. Lv 1 fingerless gloves,
 * Lv 2 a bandana, Lv 3 shades and holsters, Lv 4 a long duster coat with drum-mag pistols,
 * Lv 5 a black coat with purple-trimmed guns.
 */
export function makeQuarterer(level) {
  const storm = level >= 5;
  const coat = level >= 4;
  const shirt = storm ? 0x1c1726 : coat ? 0x5d4037 : 0x546e7a;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: storm ? 0x14101c : 0x263238, arms: shirt, face: 'soldier' });
  const { M } = h;
  const shard = glow(h, 0xb388ff);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, 0.55, 0.45, 0.52);
  if (level >= 1) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.05, 0.45, 1.05), M(0x212121), 0, -1.75, 0); // gloves
  if (level >= 2) {
    part(h.head, boxGeo(1.32, 0.35, 1.32), M(storm ? 0x4a148c : 0xb71c1c), 0, 1.2, 0); // bandana
    part(h.head, boxGeo(0.3, 0.5, 0.2), M(storm ? 0x4a148c : 0xb71c1c), 0.3, 1.0, -0.72); // knot
  }
  if (level >= 3) {
    part(h.head, boxGeo(1.25, 0.1, 0.08), M(0x9e9e9e), 0, 0.8, 0.63);
    for (const x of [-0.27, 0.27]) part(h.head, boxGeo(0.42, 0.3, 0.07), M(0x111111), x, 0.66, 0.63);
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.85, 0); // gun belt
    for (const x of [-1.1, 1.1]) part(h.torso, boxGeo(0.35, 0.7, 0.5), M(0x3e2723), x, -1.2, 0.1); // holsters
  }
  if (coat) {
    part(h.torso, boxGeo(2.05, 1.8, 0.2), M(storm ? 0x14101c : 0x4e342e), 0, -1.6, -0.45); // duster tails
    part(h.torso, boxGeo(2.2, 0.35, 1.2), M(storm ? 0x14101c : 0x4e342e), 0, 0.85, 0); // collar
  }
  const gunOpts = { body: storm ? 0x37474f : 0x2b2b2b, trim: storm ? 0xb388ff : null, laser: level >= 3 };
  const muzzles = [addHandgun(h, h.rightArm, gunOpts), addHandgun(h, h.leftArm, gunOpts)];
  if (coat) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(0.45, 0.45, 0.45), M(0x424242), 0, -2.5, -0.35); // drum mags
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.08);
  h.leftArm.rotation.set(-Math.PI / 2, 0, -0.08);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
  h.muzzles = muzzles;
  h.tracer = storm ? 0xb388ff : 0xffe066;
  return h;
}

/**
 * Penetrator (alternate Sniper form): a crossbowman with a heavy bolt thrower. Lv 1 a quiver of
 * flaming bolts, Lv 2 a hood and bracers, Lv 3 a longer bow with steel limbs, Lv 4 a dark
 * siege crossbow with purple-glowing string.
 */
export function makePenetrator(level) {
  const siege = level >= 4;
  const shirt = siege ? 0x1c1726 : 0x33691e;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: siege ? 0x14101c : 0x3e2723, arms: shirt, face: 'soldier' });
  const { M } = h;
  const shard = glow(h, 0xb388ff);
  const wood = M(siege ? 0x263238 : level >= 3 ? 0x5d4037 : 0x795548);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, 0.55, 0.45, 0.52);
  if (level >= 1) {
    // Quiver of flaming bolts on the back
    part(h.torso, boxGeo(0.6, 1.6, 0.5), M(0x4e342e), 0.5, 0.2, -0.85).rotation.z = 0.3;
    for (const x of [0.35, 0.6]) part(h.torso, boxGeo(0.1, 0.35, 0.1), glow(h, 0xff7043), x + 0.25, 1.1, -0.85);
  }
  if (level >= 2) {
    const hood = M(siege ? 0x14101c : 0x1b5e20);
    part(h.head, boxGeo(1.4, 1.35, 1.4), hood, 0, 0.65, -0.08);
    part(h.head, boxGeo(0.6, 0.4, 0.4), hood, 0, 1.3, -0.65);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.05, 0.6, 1.05), M(0x6d4c41), 0, -1.5, 0); // bracers
  } else {
    part(h.head, boxGeo(1.38, 0.45, 1.38), M(0x558b2f), 0, 1.3, 0); // cap
    part(h.head, boxGeo(0.3, 0.3, 0.06), shard, 0, 1.32, 0.7);
  }
  // The crossbow: a stock along the arm with limbs across its front end.
  const len = level >= 2 ? 3.2 : 2.8;
  const gun = holdLongGun(h, len, wood);
  const span = level >= 3 ? 3.4 : 2.8;
  const limb = M(level >= 3 ? 0x90a4ae : 0x6d4c41);
  for (const side of [-1, 1]) {
    const l = part(gun, boxGeo(span / 2, 0.2, 0.25), limb, (side * span) / 4, -len + 0.5, 0);
    l.rotation.z = side * 0.18;
  }
  part(gun, boxGeo(span * 0.95, 0.05, 0.05), siege ? glow(h, 0xb388ff) : M(0xeeeeee), 0, -len + 0.85, 0); // string
  part(gun, boxGeo(0.12, 1.4, 0.12), M(0xbdbdbd), 0, -len + 0.3, 0.25); // loaded bolt
  part(gun, boxGeo(0.3, 0.6, 0.4), wood, 0, 0.2, -0.05); // butt
  if (siege) part(gun, boxGeo(0.26, 1.2, 0.32), M(0x1a1a1a), 0, -1.2, 0.38); // scope
  h.tracer = siege ? 0xb388ff : 0xd7ccc8;
  return h;
}
