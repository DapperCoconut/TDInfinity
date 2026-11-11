// Tower models, file 6 of 12. Each makeX(level) builds one tower's look.
// In here:
// Crook Boss, Minigunner, Ranger, Heli, Pursuit, Helicopter, Cryo Heli, Mobster, Heavy Factory,
// Behemoth Factory, War Machine Factory, Gatling, Turret, Mortar Classic, Merc Base.
// The list of which tower uses which builder is TOWER_MODELS in ../models.js.

import * as THREE from 'three';
import { boxGeo, makeHumanoid, part } from './kit.js';
import { addPistol, addTommyGun, fedora, glow, glowThing, gunMuzzle, helmet, holdLongGun, makeThing, setMuzzle, suit } from './bits.js';
import { makeUnit } from './units.js';

/**
 * Crook Boss: a gangster in a pinstripe suit and fedora. Lv 2 adds shades and a gold watch,
 * Lv 3 a second pistol, Lv 4 a tommy gun, Lv 5 (The Godfather) a white suit, a cigar, a red
 * rose and a gold tommy gun.
 */
export function makeCrookBoss(level) {
  const don = level >= 4;
  const cloth = don ? 0xeeeeee : 0x263238;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: cloth, pants: don ? 0xe0e0e0 : 0x1c2429, arms: cloth, face: 'soldier' });
  const { M } = h;
  suit(h, don ? 0x212121 : 0xfafafa, don ? 0xb71c1c : 0x8e0000);
  if (!don) {
    // pinstripes
    for (const x of [-0.75, -0.45, 0.45, 0.75]) part(h.torso, boxGeo(0.05, 1.95, 1.02), M(0x546e7a), x, 0, 0);
  }
  fedora(h, don ? 0xfafafa : 0x212121, don ? 0x212121 : 0x8e0000);
  if (level >= 1) {
    // Quick Getaway: dark shades and a gold watch
    part(h.head, boxGeo(1.2, 0.25, 0.08), M(0x111111), 0, 0.68, 0.62);
    part(h.leftArm, boxGeo(1.05, 0.25, 1.05), M(0xd4af37), 0, -1.5, 0);
  }
  if (don) {
    part(h.head, boxGeo(0.12, 0.12, 0.5), M(0x5d4037), 0.25, 0.25, 0.75); // cigar
    part(h.head, boxGeo(0.13, 0.13, 0.08), glow(h, 0xff6d00), 0.25, 0.25, 1.0);
    part(h.torso, boxGeo(0.3, 0.3, 0.12), M(0xd50000), 0.65, 0.6, 0.55); // rose
    part(h.torso, boxGeo(2.1, 0.2, 1.1), M(0xd4af37), 0, -0.85, 0); // gold belt
  }
  let muzzles;
  if (level >= 3) {
    // Tommy Goons: the boss himself carries a tommy gun (gold at The Godfather)
    muzzles = [addTommyGun(h, h.rightArm, don)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
    h.recoilScale = 0.4;
  } else if (level >= 2) {
    // Double Trouble: a pistol in each hand
    muzzles = [addPistol(h, h.rightArm, false), addPistol(h, h.leftArm, false)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.05);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
  } else {
    muzzles = [addPistol(h, h.rightArm, false)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
    h.leftArm.rotation.set(-0.3, 0, -0.15);
    h.pose = { right: -Math.PI / 2, left: -0.3, leftRecoil: 0 };
  }
  h.muzzles = muzzles;
  h.tracer = don ? 0xffd740 : 0xffca28;
  return h;
}

/**
 * Minigunner (alternate Commando form): a heavy gunner with one huge minigun held in both hands.
 * Lv 2 gloves and knee pads, Lv 3 a tech visor and ammo pack, Lv 4 armor and a bigger gun,
 * Lv 5 a futuristic suit with a glowing purple minigun.
 */
export function makeMinigunner(level) {
  const future = level >= 4;
  const shirt = future ? 0x1c1726 : 0x5d6b3a;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: future ? 0x14101c : 0x3e3a2a, arms: shirt, face: 'soldier' });
  const { M } = h;
  h.body.scale.setScalar(1.1); // a big guy for a big gun
  const shard = glow(h, 0xb388ff);
  const dark = M(0x212121);
  // Beanie with the shard emblem (a helmet once geared up)
  const hat = M(future ? 0x263238 : level >= 3 ? 0x4b5320 : 0x37474f);
  part(h.head, boxGeo(1.4, level >= 3 ? 0.55 : 0.45, 1.4), hat, 0, 1.25, 0);
  part(h.head, boxGeo(0.3, 0.3, 0.06), shard, 0, 1.25, 0.72);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, -0.55, 0.45, 0.52); // chest emblem
  if (level >= 1) {
    // Improved Handling: gloves and knee pads
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.05, 0.5, 1.05), dark, 0, -1.75, 0);
    for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.05, 0.4, 0.3), dark, 0, -1.2, 0.45);
  }
  if (level >= 2) {
    // Specialized Tech: a visor and an ammo backpack with a feed belt
    part(h.head, boxGeo(1.2, 0.3, 0.2), dark, 0, 0.72, 0.68);
    part(h.head, boxGeo(1.0, 0.18, 0.05), future ? shard : glow(h, 0x40c4ff), 0, 0.72, 0.79);
    part(h.torso, boxGeo(1.7, 1.9, 0.9), M(future ? 0x263238 : 0x4e4a3a), 0, 0, -0.95);
    part(h.torso, boxGeo(0.3, 0.3, 1.3), M(0xc9a227), 0.85, -0.6, -0.4);
  }
  if (level >= 3) {
    // Geared Up: armored vest and shoulder plates
    part(h.torso, boxGeo(2.2, 1.6, 1.2), M(future ? 0x2a2235 : 0x556b2f), 0, 0.1, 0);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.15, 0.6, 1.15), M(future ? 0x2a2235 : 0x4b5320), 0, -0.2, 0);
  }
  if (future) part(h.torso, boxGeo(0.5, 0.5, 0.1), shard, 0, 0.3, 0.62); // glowing core

  // One huge minigun on the right arm, the left hand on its carry handle.
  const big = level >= 3 ? 1.25 : 1.1;
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  gun.scale.setScalar(big);
  h.rightArm.add(gun);
  const body = M(future ? 0x37474f : 0x424242);
  part(gun, boxGeo(0.8, 1.2, 0.85), body, 0, -0.5, 0);
  part(gun, boxGeo(0.25, 0.8, 0.25), dark, 0, -0.5, 0.55); // carry handle
  part(gun, boxGeo(0.45, 0.5, 0.9), M(0x3a3a3a), 0, -0.2, -0.7); // ammo feed
  const barrels = new THREE.Group();
  barrels.position.set(0, -1.1, 0);
  gun.add(barrels);
  const barrelMat = future ? shard : M(0x1f1f1f);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    part(barrels, boxGeo(0.15, 1.9, 0.15), barrelMat, Math.cos(a) * 0.27, -0.95, Math.sin(a) * 0.27);
  }
  for (const y of [-0.4, -1.7]) part(barrels, boxGeo(0.7, 0.12, 0.7), body, 0, y, 0); // barrel clamps
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -3.1, 0);
  gun.add(muzzle);
  h.muzzles = [muzzle];
  h.spin = [barrels];
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.1 };
  h.recoilScale = 0.2;
  h.tracer = future ? 0xb388ff : 0xffd740;
  return h;
}

/**
 * Ranger (alternate Railgunner form): a long-range marksman in a wide hat and duster coat.
 * Lv 2 a bandolier, Lv 3 a radio pack, Lv 4 an outlaw bandana and darker coat,
 * Lv 5 the Experimental Weapon of Destruction: a huge glowing purple cannon rifle.
 */
export function makeRanger(level) {
  const ewd = level >= 4;
  const outlaw = level >= 3;
  const coat = outlaw ? 0x3e2723 : 0x8d6e63;
  const h = makeHumanoid({ skin: 0xc68642, shirt: coat, pants: outlaw ? 0x212121 : 0x5d4037, arms: coat, face: 'soldier' });
  const { M } = h;
  const shard = glow(h, 0xb388ff);
  const dark = M(0x1a1a1a);
  // Wide-brim ranger hat with the shard band
  const hat = M(outlaw ? 0x212121 : 0x6d4c41);
  part(h.head, boxGeo(1.4, 0.55, 1.4), hat, 0, 1.35, 0);
  part(h.head, boxGeo(2.1, 0.1, 2.1), hat, 0, 1.08, 0);
  part(h.head, boxGeo(1.45, 0.15, 1.45), shard, 0, 1.15, 0);
  part(h.torso, boxGeo(2.15, 1.0, 1.2), M(outlaw ? 0x2b1d18 : 0x795548), 0, -0.6, 0); // duster coat tails
  if (level >= 1) {
    // Faster Reloading: a bandolier of big rounds
    const belt = part(h.torso, boxGeo(0.35, 2.2, 1.15), M(0x4e342e), 0, 0, 0);
    belt.rotation.z = -0.7;
    for (const y of [-0.5, 0, 0.5]) part(h.torso, boxGeo(0.14, 0.32, 0.14), M(0xd4af37), -y * 0.8, y, 0.62);
  }
  if (level >= 2) {
    // Intelligence Radio: a radio backpack with a tall antenna and a blinking light
    part(h.torso, boxGeo(1.4, 1.6, 0.7), M(0x455a64), 0, 0, -0.85);
    part(h.torso, boxGeo(0.1, 2.2, 0.1), dark, 0.5, 1.8, -0.9);
    part(h.torso, boxGeo(0.25, 0.25, 0.25), glow(h, 0xff5252), 0.5, 2.9, -0.9);
    part(h.head, boxGeo(0.15, 0.5, 0.45), dark, -0.68, 0.65, 0); // headset
  }
  if (outlaw) part(h.head, boxGeo(1.3, 0.45, 0.15), M(0x7f0000), 0, 0.4, 0.66); // bandana

  const len = ewd ? 4.2 : 3.6;
  const gun = holdLongGun(h, len, M(ewd ? 0x263238 : 0x5d4037));
  part(gun, boxGeo(0.26, 1.3, 0.32), dark, 0, -0.9, 0.38); // scope
  part(gun, boxGeo(0.35, 0.6, 0.45), M(ewd ? 0x1c1726 : 0x4e342e), 0, 0.2, -0.05); // stock
  if (ewd) {
    // Experimental Weapon of Destruction: a fat cannon barrel wrapped in glowing coils
    part(gun, boxGeo(0.75, 2.4, 0.75), M(0x37474f), 0, -len + 1.1, 0);
    for (let i = 0; i < 4; i++) part(gun, boxGeo(0.85, 0.12, 0.85), shard, 0, -len + 0.2 + i * 0.55, 0);
    part(gun, boxGeo(0.6, 0.8, 0.6), M(0x455a64), 0, -0.4, -0.45); // power cell
    part(gun, boxGeo(0.3, 0.5, 0.1), shard, 0, -0.4, -0.76);
  } else {
    part(gun, boxGeo(0.18, 0.6, 0.18), dark, 0, -len - 0.2, 0); // muzzle brake
  }
  h.muzzles[0].position.y = -len - 0.4;
  h.tracer = ewd ? 0xb388ff : 0xffe082;
  h.tracerWidth = ewd ? 0.4 : 0.28;
  return h;
}

// ------------------------------------------------------------------ Pursuit & Gatling Gun

/**
 * The Pursuit's helicopter (faces +Z). `bank` tilts, `prop` (main rotor) and `tail` (tail
 * rotor) spin. Lv 2 AP ammo, Lv 3 a radar dome, Lv 4 missile pods. Top path: a grey gunship
 * with a chin minigun (Lv 5) and a huge black-and-red Leviathan (Lv 6). Bottom path: a desert
 * gunship with a sensor ball and big pods (Lv 5), and a dark Demolition Gunship (Lv 6).
 */
export function makeHeli(h, level, bottom, look = null) {
  const { M } = h;
  const heli = new THREE.Group();
  const bank = new THREE.Group();
  heli.add(bank);
  const muzzles = [];
  const missiles = [];
  const point = (x, y, z, list) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    bank.add(m);
    list.push(m);
  };
  const top = level >= 4 && !bottom;
  const bot = level >= 4 && bottom;
  const big = level >= 5;
  // look: { color, trim } overrides the paint (Helicopter, the alternate Pursuit).
  const color = look?.color ?? (top ? (big ? 0x1c1c1c : 0x607d8b) : bot ? (big ? 0x263238 : 0xc2a46b) : 0x556b2f);
  const trimC = look?.trim ?? (top && big ? 0xd50000 : bot && big ? 0xff6d00 : 0x37474f);
  const body = M(color);
  const trim = big ? glow(h, trimC) : M(trimC);
  const dark = M(0x212121);
  if (big) bank.scale.setScalar(1.25);

  part(bank, boxGeo(2.2, 2.0, 4.2), body, 0, 0, 0.3); // cabin
  part(bank, boxGeo(1.8, 1.3, 1.2), body, 0, -0.2, 2.8); // nose
  part(bank, boxGeo(1.7, 0.9, 1.0), M(0x81d4fa), 0, 0.45, 2.4); // windscreen
  part(bank, boxGeo(0.7, 0.7, 4.5), body, 0, 0.4, -3.8); // tail boom
  part(bank, boxGeo(0.15, 1.6, 1.0), body, 0, 1.1, -5.9); // tail fin
  part(bank, boxGeo(1.8, 0.12, 0.6), body, 0, 0.4, -5.4); // tail wings
  part(bank, boxGeo(2.3, 0.15, 0.5), trim, 0, -0.4, 0.3); // stripe
  for (const x of [-0.9, 0.9]) part(bank, boxGeo(0.15, 0.15, 3.6), dark, x, -1.35, 0.4); // skids
  for (const x of [-0.9, 0.9]) for (const z of [-0.6, 1.4]) part(bank, boxGeo(0.12, 0.4, 0.12), dark, x, -1.1, z);

  // Main rotor on a mast, tail rotor on the fin.
  part(bank, boxGeo(0.4, 0.6, 0.4), dark, 0, 1.3, 0.3);
  const prop = new THREE.Group();
  prop.position.set(0, 1.65, 0.3);
  bank.add(prop);
  const bladeM = M(0x2b2b2b);
  for (let i = 0; i < (big ? 4 : 2); i++) part(prop, boxGeo(0.35, 0.08, 9), bladeM, 0, 0, 0).rotation.y = (i * Math.PI) / (big ? 4 : 2);
  const tail = new THREE.Group();
  tail.position.set(0.15, 1.1, -5.9);
  bank.add(tail);
  part(tail, boxGeo(0.08, 2.0, 0.25), bladeM, 0, 0, 0);
  part(tail, boxGeo(0.08, 0.25, 2.0), bladeM, 0, 0, 0);

  // Nose gun(s)
  const guns = top ? 2 : 1;
  const spin = [];
  for (let g = 0; g < guns; g++) {
    const x = guns > 1 ? (g ? 1.25 : -1.25) : 0;
    const y = guns > 1 ? -0.7 : -1.0;
    const gun = new THREE.Group();
    gun.position.set(x, y, 2.6);
    bank.add(gun);
    part(gun, boxGeo(0.5, 0.5, 0.7), dark, 0, 0, 0);
    if (top) {
      // Sky Shredder: spinning minigun barrels
      const barrels = new THREE.Group();
      barrels.position.set(0, 0, 0.4);
      barrels.rotation.x = Math.PI / 2;
      gun.add(barrels);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        part(barrels, boxGeo(0.09, 1.6, 0.09), big ? trim : dark, Math.cos(a) * 0.17, 0.8, Math.sin(a) * 0.17);
      }
      spin.push(barrels);
    } else part(gun, boxGeo(0.18, 0.18, 1.4), dark, 0, 0, 0.9);
    point(x, y, 3.9, muzzles);
  }
  h.spin = spin.length ? spin : null;

  if (level >= 1) {
    // AP Rounds: an ammo box and a belt feeding the gun
    part(bank, boxGeo(0.8, 0.6, 0.8), M(0x4e5b31), 1.2, -0.7, 1.6);
    part(bank, boxGeo(0.4, 0.15, 0.6), M(0xc9a227), 0.75, -0.9, 2.1);
  }
  if (level >= 2) {
    // Enhanced Radar: a radar dome over the cockpit and an antenna
    part(bank, boxGeo(1.0, 0.5, 1.0), M(0xeceff1), 0, 1.3, 1.6);
    part(bank, boxGeo(0.08, 1.2, 0.08), dark, -0.8, 1.5, -0.8);
    part(bank, boxGeo(0.25, 0.15, 0.08), glow(h, 0x76ff03), -0.8, 2.1, -0.8);
  }
  if (level >= 3) {
    // Air to Ground Missiles: stub wings with missile pods (more pods on the Bottom path)
    const pods = bot ? (big ? 3 : 2) : 1;
    for (const side of [-1, 1]) {
      part(bank, boxGeo(1.6 + pods * 0.4, 0.15, 0.9), body, side * (1.7 + pods * 0.2), -0.2, 0.2);
      for (let k = 0; k < pods; k++) {
        const x = side * (1.9 + k * 0.6);
        part(bank, boxGeo(0.45, 0.45, 1.6), M(bot ? 0x5d4037 : 0x37474f), x, -0.55, 0.3);
        part(bank, boxGeo(0.3, 0.3, 0.1), glow(h, 0xff3d00), x, -0.55, 1.12);
        point(x, -0.55, 1.2, missiles);
      }
    }
  }
  if (bot) {
    // Modified Payload: a sensor ball under the nose (hidden detection)
    part(bank, boxGeo(0.8, 0.8, 0.8), dark, 0, -1.1, 3.1);
    part(bank, boxGeo(0.4, 0.4, 0.1), glow(h, 0x00e5ff), 0, -1.1, 3.52);
  }
  const bay = new THREE.Object3D();
  bay.position.set(0, -1.2, 0.3);
  bank.add(bay);
  heli.userData = { bank, prop, tail, bay, missiles };
  return { heli, muzzles };
}

/** Pursuit tower: a helipad with a little control hut, plus the helicopter the view flies around. */
export function makePursuitModel(level, bottom) {
  const u = makeThing();
  const { M } = u;
  part(u.body, boxGeo(4, 0.3, 4), M(0x757575), 0, 0.15, 0); // concrete pad
  const yellow = M(0xfdd835);
  part(u.body, boxGeo(0.35, 0.05, 2.0), yellow, -0.6, 0.32, 0); // the "H"
  part(u.body, boxGeo(0.35, 0.05, 2.0), yellow, 0.6, 0.32, 0);
  part(u.body, boxGeo(0.9, 0.05, 0.35), yellow, 0, 0.32, 0);
  for (const [x, z] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) part(u.body, boxGeo(0.25, 0.25, 0.25), glowThing(u, 0xff9100), x, 0.45, z);
  part(u.body, boxGeo(0.12, 2.6, 0.12), M(0xbdbdbd), 1.7, 1.6, -1.7); // windsock pole
  part(u.body, boxGeo(0.4, 0.4, 1.0), M(0xff6d00), 1.7, 2.7, -1.25);
  if (level >= 2) {
    // Radar: a dish beside the pad
    part(u.body, boxGeo(0.2, 1.2, 0.2), M(0x616161), -1.7, 0.9, -1.7);
    part(u.body, boxGeo(1.1, 0.8, 0.12), M(0xeceff1), -1.7, 1.7, -1.7).rotation.y = 0.7;
  }
  if (level >= 3) {
    // Missile rack
    for (const z of [1.2, 1.6]) part(u.body, boxGeo(1.2, 0.25, 0.25), M(0x37474f), -1.4, 0.5, z);
  }
  if (level >= 4) part(u.body, boxGeo(0.06, 0.8, 1.2), M(bottom ? 0xff6d00 : 0xd50000), 1.7, 2.2, -1.1); // path flag
  const { heli, muzzles } = makeHeli(u, level, bottom);
  u.plane = heli;
  u.heli = true;
  u.muzzles = muzzles;
  u.spin = u.spin ?? null;
  u.flyHeight = 13;
  u.tracer = level >= 5 && !bottom ? 0xff5252 : 0xffd740;
  return u;
}
export const makePursuit = (level) => makePursuitModel(level, false);

/**
 * Helicopter (alternate Pursuit form): a dark helipad with a fuel tank and hangar, plus the
 * helicopter. Top path: olive Huey (Lv 4), green Apache gunship (Lv 5), black-and-red War Apache
 * (Lv 6). Bottom path: grey AH-1Z Viper (Lv 4-5), then a black Stealth Comanche with purple trim.
 */
export function makeHelicopterModel(level, bottom) {
  const u = makeThing();
  const { M } = u;
  part(u.body, boxGeo(4.4, 0.3, 4.4), M(0x37474f), 0, 0.15, 0); // asphalt pad
  part(u.body, boxGeo(3.6, 0.04, 3.6), M(0x455a64), 0, 0.31, 0);
  const white = M(0xfafafa);
  part(u.body, boxGeo(0.35, 0.05, 2.0), white, -0.6, 0.34, 0); // the "H"
  part(u.body, boxGeo(0.35, 0.05, 2.0), white, 0.6, 0.34, 0);
  part(u.body, boxGeo(0.9, 0.05, 0.35), white, 0, 0.34, 0);
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) part(u.body, boxGeo(0.25, 0.25, 0.25), glowThing(u, 0xff1744), x, 0.45, z);
  part(u.body, boxGeo(0.9, 1.4, 0.9), M(0xc62828), 1.8, 1.0, -1.8); // fuel tank
  part(u.body, boxGeo(0.95, 0.15, 0.95), M(0x212121), 1.8, 1.75, -1.8);
  if (level >= 3) {
    // Rearm crates by the pad
    for (const z of [1.3, 1.9]) part(u.body, boxGeo(1.0, 0.45, 0.5), M(0x4e5b31), -1.7, 0.5, z);
  }
  if (level >= 1) part(u.body, boxGeo(0.06, 0.8, 1.2), M(bottom ? 0x546e7a : 0x2e7d32), -1.9, 1.2, -1.6); // path flag
  if (level >= 1) part(u.body, boxGeo(0.12, 1.9, 0.12), M(0xbdbdbd), -1.9, 1.0, -2.1);
  const big = level >= 5;
  const look = bottom
    ? { color: big ? 0x1a1a1a : 0x546e7a, trim: big ? 0xd500f9 : 0x263238 }
    : { color: big ? 0x1b1b1b : level >= 4 ? 0x33691e : 0x6b7d3a, trim: big ? 0xd50000 : 0x263238 };
  const { heli, muzzles } = makeHeli(u, level, bottom && level >= 3, look);
  u.plane = heli;
  u.heli = true;
  u.muzzles = muzzles;
  u.spin = u.spin ?? null;
  u.flyHeight = 13;
  u.tracer = big ? (bottom ? 0xea80fc : 0xff5252) : 0xffd740;
  return u;
}
export const makeHelicopter = (level) => makeHelicopterModel(level, false);

/**
 * Cryo Helicopter (event): a frosty helipad with an ice tank, plus a white-and-blue helicopter.
 * Lv 3 Cryo Missile pods (from makeHeli), Lv 4 a sensor ball and more pods, Lv 5 the big Mi-Ice
 * Hind with four rotor blades and glowing ice-blue trim.
 */
export function makeCryoHeli(level) {
  const u = makeThing();
  const { M } = u;
  const ice = 0x80d8ff;
  part(u.body, boxGeo(4.4, 0.3, 4.4), M(0xcfd8dc), 0, 0.15, 0); // frosted pad
  part(u.body, boxGeo(3.6, 0.04, 3.6), M(0xe1f5fe), 0, 0.31, 0);
  const blue = M(0x0288d1);
  part(u.body, boxGeo(0.35, 0.05, 2.0), blue, -0.6, 0.34, 0); // the "H"
  part(u.body, boxGeo(0.35, 0.05, 2.0), blue, 0.6, 0.34, 0);
  part(u.body, boxGeo(0.9, 0.05, 0.35), blue, 0, 0.34, 0);
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) part(u.body, boxGeo(0.25, 0.25, 0.25), glowThing(u, ice), x, 0.45, z);
  part(u.body, boxGeo(0.9, 1.6, 0.9), M(0xb0bec5), 1.8, 1.1, -1.8); // coolant tank
  part(u.body, boxGeo(0.6, 1.0, 0.1), glowThing(u, ice), 1.8, 1.1, -1.33);
  if (level >= 3) for (const z of [1.3, 1.9]) part(u.body, boxGeo(1.0, 0.45, 0.5), M(0x90a4ae), -1.7, 0.5, z); // missile crates
  const big = level >= 5;
  const { heli, muzzles } = makeHeli(u, level, true, { color: big ? 0x01579b : 0xeceff1, trim: big ? 0x40c4ff : 0x0288d1 });
  u.plane = heli;
  u.heli = true;
  u.muzzles = muzzles;
  u.spin = u.spin ?? null;
  u.flyHeight = 13;
  u.tracer = ice;
  u.tracerWidth = 0.35;
  return u;
}
export const makeHelicopterBottom = (level) => makeHelicopterModel(level, true);

/**
 * Mobster: a gangster in a vest and flat cap. Top path: an ammo belt (Lv 2), a cigar (Lv 3), two
 * Mac 10s (Lv 4), an armored vest (Lv 5), then a red suit and a gold tommy gun (Lv 6). Bottom
 * path: a long-barrel pistol (Lv 2), tactical visors (Lv 3), a trench coat and fedora (Lv 4),
 * a briefcase of cash (Lv 5), then the Mafia Boss in a white suit with a gold pistol (Lv 6).
 */
export function makeMobsterModel(level, bottom) {
  const boss = bottom && level >= 5;
  const army = !bottom && level >= 5;
  const coat = boss ? 0xeeeeee : army ? 0x8e0000 : bottom && level >= 3 ? 0x5d4037 : 0x455a64;
  const h = makeHumanoid({ skin: 0xd7a26b, shirt: coat, pants: boss ? 0xe0e0e0 : 0x212121, arms: coat, face: 'soldier' });
  const { M } = h;
  suit(h, boss ? 0x212121 : 0xeeeeee, boss ? 0xd4af37 : army ? 0x111111 : 0x37474f);
  if (boss || army || (bottom && level >= 3)) fedora(h, boss ? 0xfafafa : 0x212121, boss ? 0xd4af37 : 0x8e0000);
  else {
    const cap = M(0x37474f);
    part(h.head, boxGeo(1.35, 0.35, 1.35), cap, 0, 1.3, 0); // flat cap
    part(h.head, boxGeo(1.2, 0.12, 0.5), cap, 0, 1.15, 0.75);
  }
  if (!bottom && level >= 1) part(h.torso, boxGeo(0.3, 2.2, 1.12), M(0xc9a227), 0.5, 0.1, 0).rotation.z = 0.6; // ammo belt
  if (!bottom && level >= 2 || boss) {
    part(h.head, boxGeo(0.12, 0.12, 0.5), M(0x5d4037), 0.25, 0.25, 0.75); // cigar
    part(h.head, boxGeo(0.13, 0.13, 0.08), glow(h, 0xff6d00), 0.25, 0.25, 1.0);
  }
  if (!bottom && level >= 4) part(h.torso, boxGeo(2.15, 1.5, 1.12), M(0x424242), 0, 0.1, 0); // armored vest
  if (bottom && level >= 2) part(h.head, boxGeo(1.25, 0.3, 0.1), glow(h, 0x76ff03), 0, 0.7, 0.62); // tactical visors
  if (bottom && level >= 4) {
    // Life Insurance: a briefcase of cash in the left hand
    part(h.leftArm, boxGeo(0.4, 0.9, 1.2), M(boss ? 0xd4af37 : 0x3e2723), 0, -2.2, 0);
    part(h.leftArm, boxGeo(0.42, 0.3, 0.6), M(0x2e7d32), 0, -1.75, 0);
  }
  let muzzles;
  if (army) {
    muzzles = [addTommyGun(h, h.rightArm, true)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
    h.recoilScale = 0.4;
  } else if (!bottom && level >= 3) {
    // Mac 10: an SMG in each hand
    muzzles = [addPistol(h, h.rightArm, false), addPistol(h, h.leftArm, false)];
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(0.3, 0.6, 0.3), M(0x212121), 0, -2.6, 0.25); // magazines
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.05);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
  } else {
    muzzles = [addPistol(h, h.rightArm, boss)];
    if (bottom && level >= 1) {
      // Extended Barrel
      part(h.rightArm, boxGeo(0.2, 0.8, 0.2), M(boss ? 0xd4af37 : 0x2b2b2b), 0, -3.1, 0);
      muzzles[0].position.y -= 0.8;
    }
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
    h.leftArm.rotation.set(bottom && level >= 4 ? 0 : -0.3, 0, -0.15);
    h.pose = { right: -Math.PI / 2, left: bottom && level >= 4 ? 0 : -0.3, leftRecoil: 0 };
  }
  h.muzzles = muzzles;
  h.tracer = boss || army ? 0xffd740 : 0xffca28;
  return h;
}
export const makeMobster = (level) => makeMobsterModel(level, false);
export const makeMobsterBottom = (level) => makeMobsterModel(level, true);

/**
 * Behemoth Factory / War Machine Factory: a big steel hangar with warning stripes and the
 * factory's current unit parked out front. `kind` is 'behemoth' or 'war'.
 */
export function makeHeavyFactory(level, bottom, kind) {
  const u = makeThing();
  const { M } = u;
  const war = kind === 'war';
  part(u.body, boxGeo(4.6, 0.3, 4.6), M(0x616161), 0, 0.15, 0);
  const wall = M(war ? 0x37474f : 0x4e5b31);
  for (const x of [-2.1, 2.1]) part(u.body, boxGeo(0.4, war ? 4.6 : 3.8, 3.6), wall, x, war ? 2.3 : 1.9, -0.4);
  part(u.body, boxGeo(4.6, 0.5, 3.8), M(0x263238), 0, war ? 4.8 : 4.0, -0.4); // roof
  part(u.body, boxGeo(4.0, 0.3, 0.1), glow(u, war ? 0xff6d00 : 0xffc400), 0, war ? 4.45 : 3.65, 1.5);
  for (let i = 0; i < 5; i++) part(u.body, boxGeo(0.4, 0.3, 0.12), M(i % 2 ? 0x212121 : 0xfdd835), -1.6 + i * 0.8, 0.45, 2.2); // warning stripes
  part(u.body, boxGeo(0.7, 1.6, 0.7), M(0x455a64), 1.7, (war ? 5.0 : 4.2) + 0.8, -1.6); // smokestack
  if (level >= 1) part(u.body, boxGeo(0.06, 0.9, 1.3), M(bottom ? 0x1e88e5 : 0xd50000), -1.8, (war ? 5.6 : 4.8), -1.4); // path flag
  if (level >= 3) part(u.body, boxGeo(1.6, 0.6, 1.6), M(0x37474f), 0, (war ? 5.35 : 4.55), -0.6); // roof crane housing
  const model = war
    ? bottom && level >= 3 ? ['warmachine', 'warmachine2', 'warmachine3'][level - 3] : `walker${level >= 2 && !bottom ? level : ''}`
    : bottom && level >= 3 ? ['laserbehemoth', 'laserbehemoth2', 'laserbehemoth3'][level - 3] : ['behemoth', 'behemoth', 'behemoth2', 'behemoth3', 'behemoth4', 'mammoth'][bottom ? 0 : level];
  const v = makeUnit(model);
  const fit = 3.9 / Math.max(v.height, 3);
  v.root.scale.setScalar(Math.min(war ? 0.55 : model === 'mammoth' ? 0.3 : 0.4, fit));
  v.root.position.set(0, 0.3, 0.4);
  u.body.add(v.root);
  u.mats.push(...v.mats);
  return u;
}
export const makeBehemothFactory = (level) => makeHeavyFactory(level, false, 'behemoth');
export const makeBehemothFactoryBottom = (level) => makeHeavyFactory(level, true, 'behemoth');
export const makeWarMachineFactory = (level) => makeHeavyFactory(level, false, 'war');
export const makeWarMachineFactoryBottom = (level) => makeHeavyFactory(level, true, 'war');
export const makePursuitBottom = (level) => makePursuitModel(level, true);

/**
 * Gatling Gun: a gun on a turret mount. Lv 2 an ammo belt, Lv 3 a drum magazine, Lv 4 a second
 * barrel and a scope, Lv 5 a real six-barrel Gatling, Lv 6 a sandbagged concrete fortress,
 * Lv 7 DOOM: black steel with glowing red vents and a huge barrel cluster.
 */
export function makeGatling(level) {
  const u = makeThing();
  const { M } = u;
  const doom = level >= 6;
  const metal = M(doom ? 0x1a1a1a : level >= 4 ? 0x455a64 : 0x5d6b3a);
  const dark = M(0x212121);
  const red = doom ? glowThing(u, 0xff1744) : null;
  if (level >= 5) {
    // Impenetrable Fortress: concrete walls with sandbags on top, open at the front
    const wall = M(doom ? 0x37373f : 0x9e9e9e);
    const bag = M(0xa1887f);
    part(u.body, boxGeo(4.2, 1.6, 0.6), wall, 0, 0.8, -1.8);
    for (const side of [-1, 1]) part(u.body, boxGeo(0.6, 1.6, 3.6), wall, side * 1.8, 0.8, 0);
    for (const x of [-1.4, -0.45, 0.45, 1.4]) part(u.body, boxGeo(0.9, 0.45, 0.7), bag, x, 1.8, -1.8);
    for (const side of [-1, 1]) for (const z of [-0.9, 0, 0.9]) part(u.body, boxGeo(0.7, 0.45, 0.85), bag, side * 1.8, 1.8, z);
    if (doom) for (const side of [-1, 1]) part(u.body, boxGeo(0.1, 0.3, 2.8), red, side * 1.5, 1.2, 0); // glowing vents
  }
  // Mount: a heavy tripod with a swivel post
  part(u.body, boxGeo(1.6, 0.3, 1.6), dark, 0, 0.15, 0);
  part(u.body, boxGeo(0.5, 1.8, 0.5), metal, 0, 1.1, 0);
  const gun = new THREE.Group();
  gun.position.set(0, 2.3, 0);
  u.body.add(gun);
  const size = level >= 6 ? 1.5 : level >= 4 ? 1.25 : 1;
  gun.scale.setScalar(size);
  part(gun, boxGeo(1.0, 0.9, 1.8), metal, 0, 0, -0.2); // receiver
  part(gun, boxGeo(0.25, 0.6, 0.3), dark, 0, -0.4, -1.0); // grip
  part(gun, boxGeo(1.6, 1.2, 0.12), M(doom ? 0x263238 : 0x6b7a4a), 0, 0.35, 0.75); // gun shield
  u.muzzles = [];
  const muzzle = (x, y, z) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    gun.add(m);
    u.muzzles.push(m);
  };
  if (level >= 4) {
    // Minigun Barrel: six spinning barrels (a big cluster of nine at DOOM)
    const barrels = new THREE.Group();
    barrels.position.set(0, 0, 0.7);
    barrels.rotation.x = Math.PI / 2;
    gun.add(barrels);
    const n = doom ? 9 : 6;
    const r = doom ? 0.4 : 0.3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      part(barrels, boxGeo(0.15, 2.8, 0.15), doom && i % 3 === 0 ? red : dark, Math.cos(a) * r, 1.4, Math.sin(a) * r);
    }
    for (const y of [0.4, 2.4]) part(barrels, boxGeo(r * 2 + 0.25, 0.15, r * 2 + 0.25), metal, 0, y, 0); // clamps
    u.spin = [barrels];
    muzzle(0, 0, 3.6);
  } else if (level >= 3) {
    // Extra Barrel: two barrels side by side
    for (const x of [-0.22, 0.22]) {
      part(gun, boxGeo(0.2, 0.2, 2.6), dark, x, 0.05, 1.9);
      muzzle(x, 0.05, 3.2);
    }
  } else {
    part(gun, boxGeo(0.25, 0.25, level >= 1 ? 2.8 : 2.2), dark, 0, 0.05, level >= 1 ? 2.0 : 1.7);
    part(gun, boxGeo(0.4, 0.4, 0.3), dark, 0, 0.05, level >= 1 ? 3.3 : 2.75); // muzzle brake
    muzzle(0, 0.05, level >= 1 ? 3.4 : 2.9);
  }
  if (level >= 1) {
    // Heavier Bullets: a brass ammo belt hanging off the side
    for (let i = 0; i < 4; i++) part(gun, boxGeo(0.12, 0.3, 0.12), M(0xc9a227), 0.6, -0.3 - i * 0.18, -0.1 + i * 0.12);
  }
  if (level >= 2) {
    // Bigger Magazine: a drum magazine
    part(gun, boxGeo(0.5, 1.1, 1.1), M(doom ? 0x37373f : 0x4e5b31), -0.75, -0.2, -0.2);
  }
  if (level >= 3) {
    // Scope (hidden detection)
    part(gun, boxGeo(0.25, 0.25, 0.9), dark, 0, 0.65, -0.2);
    part(gun, boxGeo(0.2, 0.2, 0.05), glowThing(u, doom ? 0xff1744 : 0x00e5ff), 0, 0.65, 0.26);
  }
  if (doom) part(gun, boxGeo(0.7, 0.2, 0.05), red, 0, 0.75, 0.82); // DOOM visor slit on the shield
  u.static = true;
  u.tracer = doom ? 0xff1744 : level >= 4 ? 0xffab40 : 0xffe066;
  u.tracerWidth = level >= 5 ? 0.2 : undefined;
  u.fpsHeight = 2.3 + 0.4 + (level >= 5 ? 0.8 : 0);
  return u;
}

/**
 * Turret: a heavy gun on a concrete pad. Lv 2 ammo crate and belt, Lv 3 a radar dish, Lv 4 a
 * second gun, Lv 5 armor plates and thicker barrels, Lv 6 the sleek XR-200 with glowing strips.
 */
export function makeTurret(level) {
  const u = makeThing();
  const { M } = u;
  const xr = level >= 5;
  const dual = level >= 3;
  const heavy = level >= 4;
  const metal = M(xr ? 0x263238 : heavy ? 0x4e5a3a : 0x5d6b3a);
  const dark = M(0x1c1c1c);
  const cyan = xr ? glowThing(u, 0x18ffff) : null;
  // Concrete pad and swivel ring
  part(u.body, boxGeo(4.4, 0.5, 4.4), M(xr ? 0x455a64 : 0x9e9e9e), 0, 0.25, 0);
  part(u.body, boxGeo(2.6, 0.5, 2.6), dark, 0, 0.75, 0);
  // Housing
  const head = new THREE.Group();
  head.position.set(0, 1.0, 0);
  u.body.add(head);
  const hw = xr ? 3.0 : 2.6;
  part(head, boxGeo(hw, 1.6, 2.8), metal, 0, 0.8, -0.1);
  part(head, boxGeo(hw - 0.4, 0.4, 1.8), M(xr ? 0x37474f : 0x6b7a4a), 0, 1.8, -0.3); // roof hatch
  if (xr) {
    part(head, boxGeo(hw + 0.05, 0.12, 2.4), cyan, 0, 1.1, -0.1); // glowing side strips
    part(head, boxGeo(1.6, 0.25, 0.08), cyan, 0, 1.3, 1.31); // visor slit
  }
  if (heavy) {
    // Even Heavier Ammo: armor plates on the sides
    for (const x of [-1, 1]) part(head, boxGeo(0.25, 1.4, 2.4), M(xr ? 0x1c262b : 0x3e4a2a), x * (hw / 2 + 0.12), 0.8, 0);
  }
  // Barrels
  const bw = heavy ? 0.42 : 0.32;
  const len = xr ? 4.2 : heavy ? 3.8 : 3.2;
  const xs = dual ? [-0.65, 0.65] : [0];
  for (const x of xs) {
    part(head, boxGeo(0.7, 0.7, 0.6), dark, x, 0.85, 1.5); // mantlet
    part(head, boxGeo(bw, bw, len), xr ? M(0x37474f) : dark, x, 0.85, 1.5 + len / 2);
    part(head, boxGeo(bw + 0.2, bw + 0.2, 0.4), xr ? cyan : dark, x, 0.85, 1.5 + len); // muzzle brake
    gunMuzzle(u, head, x, 0.85, 1.8 + len);
  }
  if (level >= 1) {
    // Stronger Ammunition: an ammo crate with a brass belt feeding the gun
    part(head, boxGeo(0.9, 0.8, 1.0), M(xr ? 0x212121 : 0x4e5b31), -hw / 2 - 0.5, 0.4, -0.4);
    for (let i = 0; i < 4; i++) part(head, boxGeo(0.14, 0.3, 0.14), M(0xc9a227), -hw / 2 - 0.2 + i * 0.12, 0.9 + i * 0.1, -0.4);
  }
  if (level >= 2) {
    // Radar: a dish on a mast at the back
    part(head, boxGeo(0.15, 1.4, 0.15), dark, 0.8, 2.4, -1.2);
    const dish = part(head, boxGeo(1.4, 1.0, 0.15), xr ? M(0x546e7a) : M(0xbdbdbd), 0.8, 3.2, -1.2);
    dish.rotation.x = -0.4;
    part(head, boxGeo(0.2, 0.2, 0.2), xr ? cyan : glowThing(u, 0xff1744), 0.8, 3.2, -1.05);
  }
  u.static = true;
  u.tracer = xr ? 0x18ffff : heavy ? 0xffab40 : 0xffe066;
  u.tracerWidth = xr ? 0.22 : heavy ? 0.18 : undefined;
  return u;
}

/**
 * Classic Mortar (alternate Mortar form): a gunner with a big mortar cannon behind sandbags.
 * Lv 2 ear protection, Lv 3 a wider tube, Lv 4 a bigger cannon, Lv 5 cluster warheads, Lv 6 the
 * City Buster with radioactive yellow shells. A purple Dimension Shard emblem marks it as an alternate form.
 */
export function makeMortarClassic(level) {
  const nuke = level >= 5;
  const coat = nuke ? 0x2b2b2b : 0x7a6a45;
  const h = makeHumanoid({ skin: 0xc68642, shirt: coat, pants: nuke ? 0x1a1a1a : 0x4e4630, arms: coat, face: 'soldier' });
  const { M } = h;
  const shard = glow(h, 0xb388ff);
  helmet(h, nuke ? 0x212121 : 0x5d5040);
  part(h.head, boxGeo(0.3, 0.3, 0.06), shard, 0, 1.32, 0.74); // shard emblem on the helmet
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, -0.55, 0.45, 0.52);
  if (level >= 1) for (const x of [-0.7, 0.7]) part(h.head, boxGeo(0.25, 0.55, 0.55), M(0x6a1b9a), x, 0.6, 0); // ear protectors
  if (nuke) part(h.torso, boxGeo(2.15, 1.6, 1.15), M(0xfbc02d), 0, 0.1, 0); // hazard vest
  // Cannon on a base plate in front of the gunner
  const mount = new THREE.Group();
  mount.position.set(0, 0, 2.3);
  h.root.add(mount);
  part(mount, boxGeo(2.0, 0.25, 2.0), M(0x424242), 0, 0.12, 0);
  const w = level >= 3 ? 1.15 : level >= 2 ? 0.95 : 0.75;
  const len = level >= 3 ? 4.0 : level >= 2 ? 3.4 : 3.0;
  const tube = new THREE.Group();
  tube.position.set(0, 0.35, 0);
  tube.rotation.x = 0.45;
  mount.add(tube);
  part(tube, boxGeo(w, len, w), M(nuke ? 0x37474f : 0x5d6b3a), 0, len / 2, 0);
  part(tube, boxGeo(w + 0.25, 0.3, w + 0.25), M(0x212121), 0, len, 0);
  if (level >= 3) for (const y of [0.9, 2.0]) part(tube, boxGeo(w + 0.15, 0.2, w + 0.15), M(0x212121), 0, y, 0); // reinforcing bands
  if (nuke) part(tube, boxGeo(w + 0.1, 0.5, w + 0.1), glow(h, 0xffd600), 0, len * 0.6, 0); // hazard stripe
  for (const side of [-1, 1]) {
    const leg = part(mount, boxGeo(0.18, 2.4, 0.18), M(0x212121), side * 0.7, 1.1, 1.1);
    leg.rotation.set(-0.5, 0, side * 0.3);
  }
  setMuzzle(h, tube, 0, len + 0.3, 0);
  // Sandbags in a half ring
  const bag = M(0xa1887f);
  for (let i = 0; i < 5; i++) {
    const a = -1.2 + i * 0.6;
    part(h.root, boxGeo(1.3, 0.6, 0.7), bag, Math.sin(a) * 3.4, 0.3, 2.3 + Math.cos(a) * 1.7).rotation.y = a;
  }
  if (level >= 4) {
    // Loaded Warhead: a rack of fat cluster shells
    const shellM = nuke ? glow(h, 0xffd600) : M(0x8d6e63);
    part(h.root, boxGeo(1.5, 0.2, 1.0), M(0x5d4037), 2.0, 0.1, 0.2);
    for (const x of [1.5, 2.0, 2.5]) for (const z of [-0.05, 0.45]) part(h.root, boxGeo(0.4, 1.0, 0.4), shellM, x, 0.7, z);
  }
  const shell = part(h.rightArm, boxGeo(0.45, 0.85, 0.45), nuke ? glow(h, 0xffd600) : M(0x5d4037), 0.6, -2.1, 0);
  shell.rotation.z = 0.3;
  h.rightArm.rotation.set(-1.0, 0, 0.3);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -1.0, left: -1.0, leftRecoil: 0 };
  h.recoilScale = 0.4;
  h.projectile = nuke ? { color: 0xffd600, size: 1.0, arc: 18, glowing: true } : { color: 0x5d4037, size: 0.7, arc: 16 };
  return h;
}

/**
 * Mercenary Base: a fenced compound with a tent and a flag. Lv 2 crates of grenades, Lv 3 a
 * second tent, Lv 4 a watchtower, Lv 5 riot shields on a rack, Lv 6 a helipad, Lv 7 armored walls.
 */
export function makeMercBase(level) {
  const u = makeThing();
  const { M } = u;
  const armored = level >= 6;
  part(u.body, boxGeo(4.6, 0.25, 4.6), M(0x8d7b5a), 0, 0.12, 0); // dirt yard
  // Fence posts (concrete walls at max level)
  const post = M(armored ? 0x607d8b : 0x5d4037);
  if (armored) {
    for (const side of [-1, 1]) part(u.body, boxGeo(0.4, 1.4, 4.4), post, side * 2.1, 0.8, 0);
    part(u.body, boxGeo(4.4, 1.4, 0.4), post, 0, 0.8, -2.1);
  } else {
    for (const x of [-2.1, 2.1]) for (const z of [-2.1, -0.7, 0.7, 2.1]) part(u.body, boxGeo(0.2, 1.0, 0.2), post, x, 0.6, z);
    for (const x of [-2.1, 2.1]) part(u.body, boxGeo(0.08, 0.1, 4.2), post, x, 0.9, 0);
  }
  // Tent
  const canvas = M(level >= 3 ? 0x3e4a2a : 0x6b7d3a);
  const tent = (x, z, s) => {
    const l = part(u.body, boxGeo(0.2, 2.6 * s, 2.6 * s), canvas, x - 0.75 * s, 1.1 * s, z);
    l.rotation.z = -0.6;
    const r = part(u.body, boxGeo(0.2, 2.6 * s, 2.6 * s), canvas, x + 0.75 * s, 1.1 * s, z);
    r.rotation.z = 0.6;
    part(u.body, boxGeo(0.9 * s, 1.6 * s, 0.1), M(0x212121), x, 0.8 * s, z + 1.25 * s);
  };
  tent(-0.6, -0.7, 1);
  if (level >= 2) tent(1.2, -0.9, 0.7);
  if (level >= 1) {
    // Explosive Experts: a crate of grenades
    part(u.body, boxGeo(0.9, 0.6, 0.7), M(0x4e5b31), 1.4, 0.55, 1.3);
    for (const x of [1.15, 1.4, 1.65]) part(u.body, boxGeo(0.2, 0.2, 0.2), M(0x33691e), x, 0.95, 1.3);
  }
  if (level >= 3) {
    // Improved Training: a watchtower with a gold star banner (the damage boost)
    for (const x of [-1.9, -1.1]) for (const z of [1.1, 1.9]) part(u.body, boxGeo(0.15, 3.2, 0.15), M(0x6d4c41), x, 1.6, z);
    part(u.body, boxGeo(1.2, 0.2, 1.2), M(0x795548), -1.5, 3.2, 1.5);
    part(u.body, boxGeo(0.6, 0.6, 0.05), glowThing(u, 0xffc400), -1.5, 3.8, 2.1);
  }
  if (level >= 4) {
    // Riot Control: riot shields leaning on a rack
    part(u.body, boxGeo(1.6, 0.12, 0.15), M(0x3e2723), 0.4, 1.2, 1.9);
    for (const x of [-0.1, 0.4, 0.9]) part(u.body, boxGeo(0.45, 1.0, 0.08), M(0x90a4ae), x, 0.75, 2.0).rotation.x = -0.15;
  }
  if (level >= 5) {
    // Air Transport: a helipad marking
    part(u.body, boxGeo(1.8, 0.05, 1.8), M(0x424242), 1.2, 0.28, 0.2);
    part(u.body, boxGeo(0.2, 0.06, 1.0), M(0xfafafa), 0.9, 0.3, 0.2);
    part(u.body, boxGeo(0.2, 0.06, 1.0), M(0xfafafa), 1.5, 0.3, 0.2);
    part(u.body, boxGeo(0.6, 0.06, 0.2), M(0xfafafa), 1.2, 0.3, 0.2);
  }
  // Flag
  part(u.body, boxGeo(0.15, 3.2, 0.15), M(0xbdbdbd), 1.9, 1.7, -1.9);
  part(u.body, boxGeo(0.05, 0.8, 1.2), M(armored ? 0xffc400 : 0xc62828), 1.9, 2.9, -1.3);
  return u;
}
