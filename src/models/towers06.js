// Tower models, file 6 of 12. Each makeX(level) builds one tower's look.
// In here:
// Crook Boss, Mobster, Mortar Classic.
// (Pursuit, the helicopter makeHeli, the factories and Merc Base moved to machines2.js; Cryo Heli to machines3.js;
// the Attack Helicopter pad to machines7.js.)
// The list of which tower uses which builder is TOWER_MODELS in ../models.js.

import * as THREE from 'three';
import { boxGeo, makeHumanoid, part } from './kit.js';
import {
  addPistol, addTommyGun, fedora, glow, helmet, setMuzzle, suit,
} from './bits.js';

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

