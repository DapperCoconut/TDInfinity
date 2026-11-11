// Tower models, file 1 of 12. Each makeX(level) builds one tower's look.
// In here:
// Scout, Scout Classic, Tweeter, Soldier, Marksman, Commando, Gold Scout, Gold Commando, Plane,
// Aviator, Phaser, Railgunner.
// The list of which tower uses which builder is TOWER_MODELS in ../models.js.

import * as THREE from 'three';
import { boxGeo, makeHumanoid, part } from './kit.js';
import { addHalo, addHandgun, addPistol, addWings, glow, goldify, holdLongGun } from './bits.js';

/** Scout tower model; the look changes with each upgrade level (0-4). */
export function makeScout(level) {
  const agent = level >= 4;
  const h = makeHumanoid(
    agent
      ? { skin: 0xe0ac69, shirt: 0x1c1c22, pants: 0x141418, arms: 0x1c1c22, face: 'agent' }
      : { skin: 0xe0ac69, shirt: level >= 2 ? 0x5a6b34 : 0x6b7d3a, pants: 0x4b5320, arms: 0x6b7d3a, face: 'soldier' },
  );
  const { M } = h;
  const dark = M(0x2b2b2b);

  if (agent) {
    part(h.head, boxGeo(1.3, 0.35, 1.3), M(0x1a1209), 0, 1.25, -0.02); // slick hair
    part(h.torso, boxGeo(0.6, 1.7, 0.05), M(0xffffff), 0, 0.15, 0.51); // white shirt
    part(h.torso, boxGeo(0.2, 1.4, 0.07), M(0x8b0000), 0, 0.1, 0.53); // tie
    part(h.head, boxGeo(0.12, 0.35, 0.12), dark, -0.66, 0.55, 0); // earpiece
  } else {
    const helmM = M(level >= 2 ? 0x3e4a2a : 0x556b2f);
    part(h.head, boxGeo(1.45, 0.55, 1.45), helmM, 0, 1.3, 0);
    part(h.head, boxGeo(1.5, 0.12, 0.45), helmM, 0, 1.05, 0.62); // brim
    if (level >= 1) {
      // Visibility: a radio backpack with a tall antenna
      part(h.torso, boxGeo(1.3, 1.4, 0.6), M(0x4b5320), 0, 0.1, -0.8);
      part(h.torso, boxGeo(0.08, 1.8, 0.08), M(0x212121), 0.45, 1.6, -0.9);
    }
    if (level >= 1) {
      // Visibility: goggles strapped to the helmet
      part(h.head, boxGeo(1.1, 0.32, 0.2), M(0x263238), 0, 1.35, 0.78);
      part(h.head, boxGeo(0.35, 0.22, 0.05), M(0x4fc3f7), -0.27, 1.35, 0.89);
      part(h.head, boxGeo(0.35, 0.22, 0.05), M(0x4fc3f7), 0.27, 1.35, 0.89);
    }
    if (level >= 3) {
      // Highest Cal: armored vest + bigger pack
      part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x2f3326), 0, 0.05, 0);
      part(h.torso, boxGeo(1.6, 1.7, 0.7), M(0x4a3b24), 0, 0, -0.95);
    }
  }

  // Gun hangs off the right arm pivot pointing along the arm (-Y local).
  const gunLen = agent ? 1.2 : level >= 2 ? 1.9 : 1.1;
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  h.rightArm.add(gun);
  part(gun, boxGeo(0.32, gunLen, 0.42), dark, 0, -gunLen / 2, 0);
  let muzzleY = -gunLen;
  if (agent) {
    part(gun, boxGeo(0.22, 0.8, 0.22), M(0x111111), 0, -gunLen - 0.4, 0); // silencer
    muzzleY -= 0.8;
  } else if (level >= 2) {
    part(gun, boxGeo(0.25, 0.4, 0.5), dark, 0, -0.55, -0.42); // magazine
    part(gun, boxGeo(0.25, 0.5, 0.35), M(0x5d4037), 0, 0.15, -0.05); // stock
  }
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, muzzleY, 0);
  gun.add(muzzle);

  // Aiming pose: both arms forward, left arm angled in to support the gun.
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  h.muzzles = [muzzle];
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
  h.tracer = agent ? 0xb3e5fc : 0xffe066;
  return h;
}

/**
 * Classic Scout (alternate Scout form): a ranger with a handgun. Every level adds gear:
 * Lv 2 ammo belt, Lv 3 shades + laser sight, Lv 4 helmet + plate carrier, Lv 5 akimbo handguns
 * and a long coat. A purple Dimension Shard emblem marks it as an alternate form.
 */
export function makeScoutClassic(level) {
  const akimbo = level >= 4;
  const geared = level >= 3;
  const shirt = akimbo ? 0x2a1f3d : geared ? 0x5d5040 : level >= 2 ? 0x6d4c41 : 0xc8a165; // Lv 3: leather jacket
  const h = makeHumanoid({ skin: 0xd9a066, shirt, pants: akimbo ? 0x1c1726 : 0x5d4037, arms: shirt, face: 'soldier' });
  const { M } = h;
  const shard = glow(h, 0xb388ff);

  if (geared) {
    // Stronger Equipment: tactical helmet with purple goggles, plate carrier, knee pads, gloves
    const helm = M(akimbo ? 0x1c1726 : 0x4a4436);
    part(h.head, boxGeo(1.45, 0.55, 1.45), helm, 0, 1.3, 0);
    part(h.head, boxGeo(1.2, 0.3, 0.2), M(0x212121), 0, 1.3, 0.76);
    part(h.head, boxGeo(0.36, 0.22, 0.05), shard, -0.27, 1.3, 0.87);
    part(h.head, boxGeo(0.36, 0.22, 0.05), shard, 0.27, 1.3, 0.87);
    part(h.torso, boxGeo(2.15, 1.6, 1.15), M(akimbo ? 0x14101c : 0x3b3a2c), 0, 0.1, 0);
    for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.45, 0.45, 0.2), M(0x2b2b2b), x, -0.3, 0.65);
    const pad = M(0x212121);
    for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.05, 0.4, 0.3), pad, 0, -1.2, 0.45);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.05, 0.45, 1.05), pad, 0, -1.75, 0);
    part(h.torso, boxGeo(0.35, 0.35, 0.08), shard, 0.55, 0.45, 0.6); // shard emblem on the vest
  } else {
    // Red ball cap with the shard emblem
    const cap = M(0xd84315);
    part(h.head, boxGeo(1.32, 0.45, 1.32), cap, 0, 1.3, 0);
    part(h.head, boxGeo(1.1, 0.12, 0.7), cap, 0, 1.1, 0.85);
    part(h.head, boxGeo(0.3, 0.3, 0.06), shard, 0, 1.32, 0.67);
    part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, 0.55, 0.45, 0.52);
  }
  if (level >= 1) {
    // Faster Reloading: belt full of spare magazines
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.85, 0);
    for (const x of [-0.7, -0.35, 0.35, 0.7]) part(h.torso, boxGeo(0.25, 0.45, 0.25), M(0x212121), x, -0.75, 0.6);
  }
  if (level >= 2) {
    // Precise Aiming: aviator shades
    part(h.head, boxGeo(1.25, 0.1, 0.08), M(0xd4af37), 0, 0.8, 0.63);
    part(h.head, boxGeo(0.42, 0.3, 0.07), M(0x111111), -0.27, 0.66, 0.63);
    part(h.head, boxGeo(0.42, 0.3, 0.07), M(0x111111), 0.27, 0.66, 0.63);
  }
  if (akimbo) {
    // Akimbo Handguns: long dark coat tails and a red scarf
    part(h.torso, boxGeo(2.05, 1.6, 0.2), M(0x2a1f3d), 0, -1.5, -0.45);
    part(h.torso, boxGeo(1.7, 0.4, 1.2), M(0xc62828), 0, 0.85, 0.05);
    part(h.torso, boxGeo(0.4, 0.9, 0.1), M(0xc62828), -0.5, 0.3, 0.56);
  }

  const gunOpts = { laser: level >= 2, trim: akimbo ? 0xb388ff : null, body: akimbo ? 0x37474f : 0x2b2b2b };
  const muzzles = [addHandgun(h, h.rightArm, gunOpts)];
  if (akimbo) {
    muzzles.push(addHandgun(h, h.leftArm, gunOpts));
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.08);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.08);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
  } else {
    // One-handed, the left hand steadying the wrist
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
  }
  h.muzzles = muzzles;
  h.tracer = akimbo ? 0xb388ff : 0xffe066;
  return h;
}

/** Tweeter tower model: pistol + blue bird. Look changes per level (0-4). */
export function makeTweeter(level) {
  const chit = level >= 4;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: chit ? 0xe3f2fd : 0x29b6f6, pants: 0x37474f, arms: chit ? 0xe3f2fd : 0x29b6f6 });
  const { M } = h;

  // Blue bird perched on the left shoulder (right hand holds the pistol).
  const bird = new THREE.Group();
  bird.position.set(1.5, 4.25, 0);
  h.body.add(bird);
  const blue = M(0x1e88e5);
  part(bird, boxGeo(0.5, 0.45, 0.7), blue, 0, 0, 0);
  part(bird, boxGeo(0.4, 0.4, 0.4), blue, 0, 0.35, 0.25);
  part(bird, boxGeo(0.14, 0.12, 0.25), M(0xffa000), 0, 0.33, 0.55); // beak
  part(bird, boxGeo(0.08, 0.1, 0.05), M(0x111111), 0.15, 0.42, 0.44); // eyes
  part(bird, boxGeo(0.08, 0.1, 0.05), M(0x111111), -0.15, 0.42, 0.44);
  part(bird, boxGeo(0.62, 0.25, 0.45), M(0x1565c0), 0, 0.02, -0.05); // wings
  part(bird, boxGeo(0.3, 0.1, 0.35), M(0x1565c0), 0, 0.05, -0.5); // tail
  h.bird = bird;

  if (level >= 1) {
    // Hater Shades: white lenses in a gold frame
    const gold = M(0xd4af37);
    part(h.head, boxGeo(1.25, 0.1, 0.08), gold, 0, 0.82, 0.63);
    part(h.head, boxGeo(0.45, 0.32, 0.06), gold, -0.28, 0.66, 0.62);
    part(h.head, boxGeo(0.45, 0.32, 0.06), gold, 0.28, 0.66, 0.62);
    part(h.head, boxGeo(0.37, 0.24, 0.07), M(0xfafafa), -0.28, 0.66, 0.63);
    part(h.head, boxGeo(0.37, 0.24, 0.07), M(0xfafafa), 0.28, 0.66, 0.63);
    // ...and a chunky gold chain
    part(h.torso, boxGeo(1.4, 0.18, 1.15), gold, 0, 0.9, 0);
    part(h.torso, boxGeo(0.4, 0.45, 0.1), gold, 0, 0.45, 0.56);
  }
  if (level >= 2) {
    // Stonk: top hat
    const black = M(0x161616);
    part(h.head, boxGeo(1.7, 0.1, 1.7), black, 0, 1.25, 0);
    part(h.head, boxGeo(1.1, 1.0, 1.1), black, 0, 1.8, 0);
    part(h.head, boxGeo(1.12, 0.18, 1.12), M(0x2e7d32), 0, 1.38, 0); // money-green band
  }

  const muzzles = [addPistol(h, h.rightArm, chit)];
  let pose;
  if (level >= 3) {
    // Dual Wield: second pistol in the left hand, both arms forward
    muzzles.push(addPistol(h, h.leftArm, chit));
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.05);
    pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
  } else {
    // One pistol; the left hand is free (and holds a phone at Stonk)
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
    h.leftArm.rotation.set(-0.9, 0, -0.25);
    pose = { right: -Math.PI / 2, left: -0.9, leftRecoil: 0 };
    if (level >= 2) {
      part(h.leftArm, boxGeo(0.12, 0.85, 0.5), M(0x212121), 0, -2.15, 0.45);
      part(h.leftArm, boxGeo(0.05, 0.7, 0.4), M(0x66ff99), -0.07, -2.15, 0.45); // screen: stonks
    }
  }

  if (chit) {
    // ChitChat: white wings on the back, standing on a cloud
    const wing = M(0xffffff);
    const lw = part(h.torso, boxGeo(0.2, 1.6, 1.6), wing, 0.6, 0.3, -1.1);
    const rw = part(h.torso, boxGeo(0.2, 1.6, 1.6), wing, -0.6, 0.3, -1.1);
    lw.rotation.set(0.2, 0.5, 0.3);
    rw.rotation.set(0.2, -0.5, -0.3);
    const cloud = M(0xf5f5f5);
    part(h.root, boxGeo(3.0, 0.7, 2.2), cloud, 0, 0.35, 0);
    part(h.root, boxGeo(1.6, 0.6, 1.6), cloud, -1.1, 0.55, 0.3);
    part(h.root, boxGeo(1.6, 0.6, 1.6), cloud, 1.1, 0.5, -0.3);
    h.lift = 0.7;
    h.body.position.y = h.lift;
  }

  h.muzzles = muzzles;
  h.pose = pose;
  h.tracer = chit ? 0x4fc3f7 : 0xffd54f;
  return h;
}

/** Soldier tower: assault rifle, bursts. Look changes per level (0-4). */
export function makeSoldier(level) {
  const sup = level >= 4;
  const h = makeHumanoid(
    sup
      ? { skin: 0xc68642, shirt: 0x1a237e, pants: 0x0d1440, arms: 0x283593, face: 'soldier' }
      : { skin: 0xc68642, shirt: 0x7a6a45, pants: 0x4e4630, arms: 0x7a6a45, face: 'soldier' },
  );
  const { M } = h;
  const dark = M(0x262626);

  if (sup) {
    // Super Soldier: armored suit with a glowing chest core and visor helmet
    const armor = M(0x3949ab);
    part(h.torso, boxGeo(2.2, 1.8, 1.2), armor, 0, 0.05, 0);
    part(h.torso, boxGeo(0.5, 0.5, 0.1), glow(h, 0x00e5ff), 0, 0.3, 0.62);
    part(h.head, boxGeo(1.4, 1.35, 1.4), armor, 0, 0.62, -0.03);
    part(h.head, boxGeo(1.2, 0.35, 0.08), glow(h, 0x00e5ff), 0, 0.7, 0.68);
    part(h.torso, boxGeo(0.8, 0.45, 1.3), armor, -1.4, 1.0, 0); // shoulder pads
    part(h.torso, boxGeo(0.8, 0.45, 1.3), armor, 1.4, 1.0, 0);
  } else {
    // Buzz cut
    part(h.head, boxGeo(1.25, 0.2, 1.25), M(0x2b1d0e), 0, 1.25, 0);
    if (level >= 1) {
      // Shades: black sunglasses and chest webbing
      part(h.head, boxGeo(1.25, 0.32, 0.08), M(0x0a0a0a), 0, 0.68, 0.63);
      const web = M(0x3e2723);
      for (const side of [-1, 1]) part(h.torso, boxGeo(0.3, 2.5, 1.12), web, 0, 0, 0).rotation.z = side * 0.6;
    }
    if (level >= 2) {
      // Radio: headset band, ear cups and mic
      const band = M(0x333333);
      part(h.head, boxGeo(1.35, 0.15, 0.25), band, 0, 1.38, 0);
      part(h.head, boxGeo(0.15, 0.5, 0.45), band, -0.68, 0.65, 0);
      part(h.head, boxGeo(0.15, 0.5, 0.45), band, 0.68, 0.65, 0);
      part(h.head, boxGeo(0.08, 0.08, 0.55), band, -0.68, 0.4, 0.35);
      part(h.torso, boxGeo(1.4, 1.5, 0.65), M(0x4b5320), 0, 0, -0.85); // radio pack
      part(h.torso, boxGeo(0.08, 2.0, 0.08), band, -0.45, 1.6, -0.95); // antenna
    }
    if (level >= 3) {
      // Severe Training: tactical vest, red headband, ammo pouches
      part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x3b3f2a), 0, 0.05, 0);
      part(h.torso, boxGeo(0.45, 0.4, 0.2), M(0x5d4037), -0.5, -0.35, 0.65);
      part(h.torso, boxGeo(0.45, 0.4, 0.2), M(0x5d4037), 0.5, -0.35, 0.65);
      part(h.head, boxGeo(1.28, 0.18, 1.28), M(0xc62828), 0, 1.05, 0);
    }
  }

  const gun = holdLongGun(h, sup ? 1.7 : 1.6, sup ? M(0xeceff1) : dark);
  if (sup) {
    // Laser gun: glowing barrel rails and emitter
    part(gun, boxGeo(0.12, 1.4, 0.12), glow(h, 0x00e5ff), 0.18, -0.85, 0.12);
    part(gun, boxGeo(0.12, 1.4, 0.12), glow(h, 0x00e5ff), -0.18, -0.85, 0.12);
    part(gun, boxGeo(0.4, 0.2, 0.5), glow(h, 0x00e5ff), 0, -1.7, 0);
    h.tracer = 0x00e5ff;
  } else {
    part(gun, boxGeo(0.25, 0.45, 0.55), dark, 0, -0.55, -0.42); // curved mag
    part(gun, boxGeo(0.25, 0.5, 0.35), M(0x4e342e), 0, 0.15, -0.05); // stock
    part(gun, boxGeo(0.2, 0.35, 0.2), dark, 0, -0.9, 0.3); // sight
    h.tracer = 0xffc107;
  }
  return h;
}

/** Marksman tower: long-range rifle. Look changes per level (0-4). */
export function makeMarksman(level) {
  const cyber = level >= 4;
  const h = makeHumanoid(
    cyber
      ? { skin: 0x8d5524, shirt: 0x212121, pants: 0x151515, arms: 0x2c2c2c, face: 'soldier' }
      : { skin: 0x8d5524, shirt: 0x8d7b55, pants: 0x5a4d35, arms: 0x8d7b55, face: 'soldier' },
  );
  const { M } = h;

  if (cyber) {
    // Cyber Hunter: bounty-hunter helmet with a red T-visor, armor, cape
    const steel = M(0x546e7a);
    part(h.head, boxGeo(1.45, 1.45, 1.45), steel, 0, 0.62, 0);
    part(h.head, boxGeo(1.1, 0.22, 0.08), glow(h, 0xff1744), 0, 0.82, 0.74);
    part(h.head, boxGeo(0.22, 0.6, 0.08), glow(h, 0xff1744), 0, 0.5, 0.74);
    part(h.torso, boxGeo(2.2, 1.6, 1.2), steel, 0, 0.15, 0);
    part(h.torso, boxGeo(0.3, 0.3, 0.1), glow(h, 0xff1744), 0.55, 0.5, 0.62);
    part(h.torso, boxGeo(2.0, 2.4, 0.12), M(0x4a1010), 0, -0.4, -0.62); // cape
  } else {
    // Boonie hat
    const hat = M(0x6b5d3f);
    part(h.head, boxGeo(1.9, 0.12, 1.9), hat, 0, 1.25, 0);
    part(h.head, boxGeo(1.3, 0.4, 1.3), hat, 0, 1.45, 0);
    if (level >= 1) {
      // Specs: round glasses
      const frame = M(0x3e2723);
      part(h.head, boxGeo(0.4, 0.34, 0.06), frame, -0.28, 0.66, 0.62);
      part(h.head, boxGeo(0.4, 0.34, 0.06), frame, 0.28, 0.66, 0.62);
      part(h.head, boxGeo(0.3, 0.24, 0.07), M(0xb3e5fc), -0.28, 0.66, 0.63);
      part(h.head, boxGeo(0.3, 0.24, 0.07), M(0xb3e5fc), 0.28, 0.66, 0.63);
      // ...and a spotter pack with a rangefinder
      part(h.torso, boxGeo(1.3, 1.5, 0.6), M(0x6b5d3f), 0, 0, -0.8);
      part(h.torso, boxGeo(0.5, 0.35, 0.7), M(0x263238), 0.4, 1.0, -0.8);
    }
    if (level >= 2) {
      // Headshot Practice: ghillie shawl and bandolier
      part(h.torso, boxGeo(2.3, 0.8, 1.3), M(0x556b2f), 0, 0.7, 0);
      const strap = part(h.torso, boxGeo(0.25, 2.4, 1.12), M(0x4e342e), 0, 0, 0);
      strap.rotation.z = 0.7;
    }
  }

  const len = cyber ? 2.6 : level >= 3 ? 2.8 : 2.4;
  const gun = holdLongGun(h, len, cyber ? M(0x37474f) : level >= 3 ? M(0x212121) : M(0x5d4037));
  const dark = M(0x1a1a1a);
  if (cyber) {
    // Pulse rifle: glowing coils along the barrel
    for (let i = 0; i < 3; i++) part(gun, boxGeo(0.45, 0.15, 0.55), glow(h, 0xff1744), 0, -0.9 - i * 0.5, 0);
    part(gun, boxGeo(0.25, 0.7, 0.3), dark, 0, -0.9, 0.35); // scope
    h.tracer = 0xff1744;
  } else {
    part(gun, boxGeo(0.22, 0.9, 0.3), dark, 0, -0.8, 0.35); // scope
    part(gun, boxGeo(0.14, 0.6, 0.14), dark, 0, -len - 0.3, 0); // barrel tip
    h.muzzles[0].position.y = -len - 0.6;
    if (level >= 3) {
      // The Right Tools: bigger scope, bipod, suppressor
      part(gun, boxGeo(0.3, 0.3, 0.35), dark, 0, -0.35, 0.38);
      part(gun, boxGeo(0.3, 0.3, 0.35), dark, 0, -1.25, 0.38);
      part(gun, boxGeo(0.08, 0.08, 0.7), dark, 0.15, -len + 0.4, -0.45);
      part(gun, boxGeo(0.08, 0.08, 0.7), dark, -0.15, -len + 0.4, -0.45);
    }
    h.tracer = 0xffffff;
  }
  return h;
}

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

/** Commando tower: minigun (two at Lv 4). Look changes per level (0-4). */
export function makeCommando(level) {
  const laser = level >= 4;
  const h = makeHumanoid(
    laser
      ? { skin: 0xa0522d, shirt: 0x1b1b1b, pants: 0x111111, arms: 0xa0522d, face: 'soldier' }
      : { skin: 0xa0522d, shirt: 0x556b2f, pants: 0x3e3a2a, arms: 0xa0522d, face: 'soldier' },
  );
  const { M } = h;
  // Muscle tank top with a bandolier, red bandana
  const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), M(0x4e342e), 0, 0, 0);
  strap.rotation.z = -0.7;
  part(h.head, boxGeo(1.28, 0.25, 1.28), M(laser ? 0xff1744 : 0xc62828), 0, 1.05, 0);
  part(h.head, boxGeo(0.3, 0.6, 0.15), M(laser ? 0xff1744 : 0xc62828), 0.3, 0.75, -0.66); // bandana tails
  if (level >= 1) {
    // Handling: fingerless gloves + knee pads
    const glove = M(0x212121);
    part(h.rightArm, boxGeo(1.05, 0.5, 1.05), glove, 0, -1.75, 0);
    part(h.leftArm, boxGeo(1.05, 0.5, 1.05), glove, 0, -1.75, 0);
    part(h.rightLeg, boxGeo(1.05, 0.4, 0.3), glove, 0, -1.2, 0.45);
    part(h.leftLeg, boxGeo(1.05, 0.4, 0.3), glove, 0, -1.2, 0.45);
  }
  if (level >= 2) {
    // Goggles: tactical night-vision goggles
    part(h.head, boxGeo(1.3, 0.12, 1.3), M(0x263238), 0, 0.72, 0);
    part(h.head, boxGeo(0.4, 0.32, 0.35), M(0x263238), -0.28, 0.7, 0.72);
    part(h.head, boxGeo(0.4, 0.32, 0.35), M(0x263238), 0.28, 0.7, 0.72);
    part(h.head, boxGeo(0.25, 0.2, 0.05), glow(h, laser ? 0xff1744 : 0x76ff03), -0.28, 0.7, 0.9);
    part(h.head, boxGeo(0.25, 0.2, 0.05), glow(h, laser ? 0xff1744 : 0x76ff03), 0.28, 0.7, 0.9);
    part(h.torso, boxGeo(1.6, 1.8, 0.8), M(0x3a3a3a), 0, 0, -0.9); // ammo backpack
    part(h.torso, boxGeo(0.3, 0.3, 1.2), M(0xc9a227), -0.85, -0.6, -0.4); // feed belt
  }
  if (laser) {
    // Laser Wield: armored chest plate with a glowing core
    part(h.torso, boxGeo(2.15, 1.6, 1.15), M(0x2b2b2b), 0, 0.1, 0);
    part(h.torso, boxGeo(0.5, 0.5, 0.1), glow(h, 0xff1744), 0, 0.3, 0.6);
  }

  const bodyMat = M(laser ? 0x37474f : 0x424242);
  const barrelMat = laser ? glow(h, 0xff1744) : M(0x1f1f1f);
  const right = addMinigun(h, h.rightArm, bodyMat, barrelMat);
  h.muzzles = [right.muzzle];
  h.spin = [right.barrels];
  if (level >= 3) {
    const left = addMinigun(h, h.leftArm, bodyMat, barrelMat);
    h.muzzles.push(left.muzzle);
    h.spin.push(left.barrels);
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.12);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.12);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.15 };
  } else {
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.15, 0, -0.55);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.15, leftRecoil: 0.1 };
  }
  h.recoilScale = 0.25; // miniguns barely kick
  h.tracer = laser ? 0xff1744 : 0xffd740;
  return h;
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

/** Aviator tower: a pilot on the runway pad, plus a plane the view flies in circles. */
export function makeAviator(level) {
  const jet = level >= 3;
  const space = level >= 4;
  const h = makeHumanoid(
    space
      ? { skin: 0xf1c27d, shirt: 0x1c1c24, pants: 0x1c1c24, arms: 0x1c1c24 }
      : jet
        ? { skin: 0xf1c27d, shirt: 0x5b6b3a, pants: 0x4b5a30, arms: 0x5b6b3a }
        : { skin: 0xf1c27d, shirt: 0x6d4c41, pants: 0x5d4e37, arms: 0x6d4c41 },
  );
  const { M } = h;
  if (jet) {
    // Flight helmet with a visor
    part(h.head, boxGeo(1.45, 1.4, 1.45), M(space ? 0x263238 : 0xeceff1), 0, 0.65, -0.03);
    part(h.head, boxGeo(1.2, 0.45, 0.08), space ? glow(h, 0xb388ff) : M(0xffb300), 0, 0.7, 0.7);
  } else {
    // Leather aviator cap with goggles, white scarf
    const cap = M(0x5d4037);
    part(h.head, boxGeo(1.35, 0.6, 1.35), cap, 0, 1.0, -0.02);
    part(h.head, boxGeo(0.3, 0.6, 0.6), cap, -0.66, 0.5, 0);
    part(h.head, boxGeo(0.3, 0.6, 0.6), cap, 0.66, 0.5, 0);
    part(h.head, boxGeo(1.3, 0.12, 0.1), M(0x3e2723), 0, 1.05, 0.66);
    part(h.head, boxGeo(0.4, 0.3, 0.08), M(0x80deea), -0.28, 1.05, 0.7);
    part(h.head, boxGeo(0.4, 0.3, 0.08), M(0x80deea), 0.28, 1.05, 0.7);
    part(h.torso, boxGeo(1.6, 0.4, 1.2), M(0xfafafa), 0, 0.85, 0.05); // scarf
    part(h.torso, boxGeo(0.4, 1.0, 0.1), M(0xfafafa), 0.5, 0.2, 0.55);
  }
  if (level >= 1) {
    // Bombs Away: a cart of spare bombs on the runway
    part(h.root, boxGeo(1.6, 0.5, 1.0), M(0x5d4037), 1.9, 0.25, 0.8);
    for (const z of [0.55, 1.05]) part(h.root, boxGeo(1.2, 0.45, 0.45), M(0x263238), 1.9, 0.7, z);
  }
  if (level >= 2) {
    // Spy Plane: radio headset (antenna)
    part(h.head, boxGeo(0.08, 0.9, 0.08), M(0x212121), -0.7, 1.6, -0.2);
  }
  // Waving the plane in: right arm raised high, left at the side.
  h.rightArm.rotation.set(Math.PI * 0.85, 0, 0.25);
  h.pose = { right: Math.PI * 0.85, left: 0, leftRecoil: 0 };
  const { plane, muzzles } = makePlane(h, level);
  h.plane = plane;
  h.muzzles = muzzles;
  h.flyHeight = 14;
  h.tracer = space ? 0xb388ff : 0xffe082;
  return h;
}

/** Phaser tower: sci-fi trooper with a beam gun. Look changes per level (0-4). */
export function makePhaser(level) {
  const ray = level >= 3;
  const anni = level >= 4;
  const beam = anni ? 0xd500f9 : ray ? 0xff1744 : 0x40c4ff;
  const h = makeHumanoid(
    anni
      ? { skin: 0xe0ac69, shirt: 0x4a148c, pants: 0x311b92, arms: 0x4a148c, face: 'soldier' }
      : ray
        ? { skin: 0xe0ac69, shirt: 0x212121, pants: 0x1a1a1a, arms: 0x212121, face: 'soldier' }
        : { skin: 0xe0ac69, shirt: 0xeceff1, pants: 0x90a4ae, arms: 0xeceff1, face: 'soldier' },
  );
  const { M } = h;
  const armor = M(anni ? 0xffc400 : ray ? 0x424242 : 0xb0bec5);
  // Visor helmet
  part(h.head, boxGeo(1.4, 1.35, 1.4), armor, 0, 0.65, -0.03);
  part(h.head, boxGeo(1.2, 0.35, 0.08), glow(h, beam), 0, 0.72, 0.68);
  if (level >= 1) {
    // Handling: shoulder pads
    part(h.torso, boxGeo(0.8, 0.45, 1.3), armor, -1.4, 1.0, 0);
    part(h.torso, boxGeo(0.8, 0.45, 1.3), armor, 1.4, 1.0, 0);
  }
  if (level >= 2) {
    // Extra Juice: power pack with glowing cells
    part(h.torso, boxGeo(1.5, 1.7, 0.7), M(0x37474f), 0, 0, -0.85);
    for (let i = 0; i < 3; i++) part(h.torso, boxGeo(0.3, 1.2, 0.1), glow(h, beam), -0.45 + i * 0.45, 0, -1.22);
  }
  if (ray) {
    part(h.torso, boxGeo(2.2, 1.7, 1.2), armor, 0, 0.05, 0);
    part(h.torso, boxGeo(0.55, 0.55, 0.1), glow(h, beam), 0, 0.3, 0.62);
  }
  if (anni) {
    // Annihilation: crown-like crest on the helmet
    for (const x of [-0.45, 0, 0.45]) part(h.head, boxGeo(0.2, 0.6, 0.2), M(0xffc400), x, 1.55, 0);
  }

  const len = anni ? 2.4 : ray ? 2.1 : 1.8;
  const gun = holdLongGun(h, len, M(anni ? 0x311b92 : ray ? 0x263238 : 0xeceff1));
  part(gun, boxGeo(0.5, 0.7, 0.55), M(0x546e7a), 0, -0.3, 0); // receiver
  const rings = anni ? 4 : 2;
  for (let i = 0; i < rings; i++) part(gun, boxGeo(0.55, 0.12, 0.6), glow(h, beam), 0, -0.9 - i * 0.35, 0);
  part(gun, boxGeo(0.45, 0.25, 0.5), glow(h, beam), 0, -len, 0); // emitter
  if (level >= 1) part(gun, boxGeo(0.22, 0.6, 0.3), M(0x212121), 0, -0.8, 0.35); // scope
  h.muzzles[0].position.y = -len - 0.15;
  h.beam = beam;
  h.tracer = beam;
  return h;
}

/** Railgunner tower: rail rifle, then a mounted Sentry, then a heavy cannon (levels 0-4). */
export function makeRailgunner(level) {
  const sentry = level >= 3;
  const ngw = level >= 4;
  const h = makeHumanoid({ skin: 0x8d5524, shirt: 0x37474f, pants: 0x263238, arms: 0x37474f, face: 'soldier' });
  const { M } = h;
  const coil = 0x29b6f6;
  // Cap with a glowing targeting monocle
  part(h.head, boxGeo(1.35, 0.35, 1.35), M(0x263238), 0, 1.2, 0);
  part(h.head, boxGeo(1.4, 0.1, 0.5), M(0x263238), 0, 1.05, 0.6);
  part(h.head, boxGeo(0.35, 0.3, 0.1), glow(h, coil), -0.28, 0.7, 0.62);
  if (level >= 1) {
    // Faster Reloading: battery pouches on a belt
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x4e342e), 0, -0.85, 0);
    for (const x of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.4, 0.45, 0.25), M(0x455a64), x, -0.75, 0.6);
  }
  if (level >= 2) {
    // Extra Juice: capacitor backpack
    part(h.torso, boxGeo(1.5, 1.8, 0.7), M(0x263238), 0, 0, -0.85);
    part(h.torso, boxGeo(0.35, 1.4, 0.1), glow(h, coil), 0, 0, -1.22);
  }

  if (!sentry) {
    const len = 3.0;
    const gun = holdLongGun(h, len, M(0x263238));
    for (let i = 0; i < 4; i++) part(gun, boxGeo(0.45, 0.1, 0.55), glow(h, coil), 0, -0.8 - i * 0.5, 0);
    part(gun, boxGeo(0.22, 0.8, 0.3), M(0x111111), 0, -0.7, 0.35); // scope
    if (level >= 2) part(gun, boxGeo(0.5, 0.7, 0.5), M(0x455a64), 0, -0.2, -0.3); // power cell
    h.muzzles[0].position.y = -len - 0.1;
    h.tracer = coil;
    h.tracerWidth = 0.35;
    return h;
  }

  // Sentry / Next Generation Warfare: a mounted gun on the root (turns with the tower).
  const mount = new THREE.Group();
  h.root.add(mount);
  const steel = M(ngw ? 0x37474f : 0x546e7a);
  const barrelLen = ngw ? 7 : 5;
  const bw = ngw ? 1.2 : 0.6;
  const gy = ngw ? 3.0 : 2.7;
  const gz = ngw ? 1.8 : 1.2;
  if (ngw) {
    part(mount, boxGeo(3.4, 1.6, 3.4), steel, 0, 0.8, gz); // heavy base
    part(mount, boxGeo(2.4, 1.2, 2.6), M(0x263238), 0, 2.2, gz);
  } else {
    part(mount, boxGeo(0.4, 2.2, 0.4), steel, 0, 1.1, gz); // tripod post
    for (const a of [0, 2.1, 4.2]) {
      const leg = part(mount, boxGeo(0.25, 1.6, 0.25), steel, Math.sin(a) * 0.6, 0.6, gz + Math.cos(a) * 0.6);
      leg.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5);
    }
  }
  part(mount, boxGeo(bw + 0.5, bw + 0.4, 1.6), steel, 0, gy, gz); // breech
  part(mount, boxGeo(bw, bw, barrelLen), M(0x212121), 0, gy, gz + barrelLen / 2 + 0.5);
  const coils = ngw ? 6 : 4;
  for (let i = 0; i < coils; i++) part(mount, boxGeo(bw + 0.25, bw + 0.25, 0.25), glow(h, coil), 0, gy, gz + 1.3 + i * ((barrelLen - 1) / coils));
  if (ngw) {
    part(mount, boxGeo(0.5, 0.5, 4), M(0x212121), bw * 0.7, gy + 0.6, gz + 2.5); // side rails
    part(mount, boxGeo(0.5, 0.5, 4), M(0x212121), -bw * 0.7, gy + 0.6, gz + 2.5);
  } else {
    part(mount, boxGeo(1.6, 1.0, 0.15), steel, 0, gy + 0.2, gz - 0.2); // gun shield
  }
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, gy, gz + barrelLen + 0.6);
  mount.add(muzzle);
  h.muzzles = [muzzle];

  if (!ngw) {
    // Seated behind the turret: lower the body, legs forward, on a little seat.
    part(h.root, boxGeo(1.6, 1.0, 1.4), steel, 0, 0.5, -0.3);
    h.lift = -0.9;
    h.bob = 0.02;
    h.body.position.y = h.lift;
    h.rightLeg.rotation.x = -Math.PI / 2;
    h.leftLeg.rotation.x = -Math.PI / 2;
  }
  h.rightArm.rotation.set(-Math.PI / 2 + 0.2, 0, 0.2);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.2, 0, -0.2);
  h.pose = { right: -Math.PI / 2 + 0.2, left: -Math.PI / 2 + 0.2, leftRecoil: 0.35 };
  h.tracer = ngw ? 0x00e5ff : coil;
  h.tracerWidth = ngw ? 0.9 : 0.55;
  return h;
}
