// Tower models, file 8 of 12. Each makeX(level) builds one tower's look.
// In here:
// Ghost, Toxicnator, Saboteur, Paintballer. (Sentry, AA Turret and Tesla: machines1.js; Patrol Boat: machines3.js.)
// The list of which tower uses which builder is TOWER_MODELS in ../models.js.

import * as THREE from 'three';
import { boxGeo, makeHumanoid, part } from './kit.js';
import { glow, holdLongGun } from './bits.js';

/** Spinning minigun barrels along +Z inside `parent`; returns the spinning group. */
export function miniBarrels(u, parent, x, y, z, len, n, r, mat) {
  const mount = new THREE.Group();
  mount.position.set(x, y, z);
  mount.rotation.x = Math.PI / 2;
  parent.add(mount);
  const barrels = new THREE.Group();
  mount.add(barrels);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    part(barrels, boxGeo(0.1, len, 0.1), mat, Math.cos(a) * r, len / 2, Math.sin(a) * r);
  }
  (u.spin ??= []).push(barrels);
  return barrels;
}



/**
 * Ghost: a stealth operative in dark gear with a compact SMG. Top path: Lv 1 green eye-sensor
 * goggles, Lv 2 a longer magazine, Lv 3 a hooded stealth cloak, Lv 4 a drone dock on the back (the
 * C7 Drone circles overhead while its ability is on), Lv 5 X-Ghost armor with a glowing visor.
 * Bottom path: Lv 1 ammo pouches, Lv 2 a longer barrel, Lv 3 the Honey Badger rifle with a
 * suppressor, Lv 4 smoke grenades on the chest, Lv 5 heavy armor and a red visor.
 */
export function makeGhost(level, bottom = false) {
  const top = !bottom;
  const cloak = top && level >= 3;
  const xg = top && level >= 5;
  const heavy = bottom && level >= 5;
  const shirt = cloak ? 0x15181d : 0x2b3038;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: 0x1c1f24, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(0x111316);
  const green = glow(h, 0x76ff03);
  const red = glow(h, 0xff1744);
  // Balaclava wrapping the head (a hood once she's cloaked)
  const wrap = M(0x202328);
  part(h.head, boxGeo(1.3, 0.5, 1.3), wrap, 0, 1.15, 0);
  part(h.head, boxGeo(1.28, 0.45, 1.28), wrap, 0, 0.25, 0);
  if (cloak) {
    const hood = M(0x0e1013);
    part(h.head, boxGeo(1.5, 0.3, 1.5), hood, 0, 1.4, -0.05);
    part(h.head, boxGeo(1.5, 1.4, 0.25), hood, 0, 0.75, -0.7);
    for (const x of [-0.75, 0.75]) part(h.head, boxGeo(0.12, 1.3, 1.45), hood, x, 0.75, 0);
    part(h.torso, boxGeo(2.3, 2.5, 0.2), hood, 0, -0.45, -0.62); // cloak
    part(h.torso, boxGeo(0.1, 2.3, 0.08), glow(h, 0x4dd0e1), 1.1, -0.4, -0.72); // shimmering trim
  }
  if (top && level >= 1) {
    // Eye Sensor: goggles with green lenses
    part(h.head, boxGeo(1.25, 0.3, 0.2), dark, 0, 0.75, 0.68);
    for (const x of [-0.27, 0.27]) part(h.head, boxGeo(0.32, 0.22, 0.06), green, x, 0.75, 0.8);
  }
  if (top && level >= 4) {
    // Drone dock on the back
    part(h.torso, boxGeo(1.4, 1.2, 0.5), M(0x37474f), 0, 0.3, -0.8);
    part(h.torso, boxGeo(1.0, 0.12, 0.06), green, 0, 0.6, -1.06);
  }
  if (xg) {
    const plate = M(0x23282f);
    part(h.torso, boxGeo(2.2, 1.6, 1.2), plate, 0, 0, 0);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.15, 0.6, 1.15), plate, 0, -0.2, 0);
    part(h.head, boxGeo(1.3, 0.3, 0.1), green, 0, 0.75, 0.82); // visor
  }
  if (bottom && level >= 1) {
    const n = level >= 2 ? 3 : 2;
    for (let k = 0; k < n; k++) part(h.torso, boxGeo(0.4, 0.45, 0.3), M(0x3e4450), -0.6 + k * 0.6, -0.85, 0.6);
  }
  if (bottom && level >= 3) part(h.torso, boxGeo(2.15, 1.5, 1.15), M(0x30353d), 0, -0.05, 0); // plate carrier
  if (bottom && level >= 4) {
    // Ghost Grenades: smoke grenades on the chest
    for (const x of [-0.55, 0, 0.55]) part(h.torso, boxGeo(0.32, 0.5, 0.32), M(0x7e57c2), x, 0.45, 0.66);
  }
  if (heavy) {
    const plate = M(0x1a1d22);
    part(h.torso, boxGeo(2.3, 1.7, 1.25), plate, 0, 0.05, 0);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.2, 0.7, 1.2), plate, 0, -0.2, 0);
    part(h.head, boxGeo(1.3, 0.3, 0.1), red, 0, 0.75, 0.75);
    for (const x of [-0.55, 0, 0.55]) part(h.torso, boxGeo(0.32, 0.5, 0.32), M(0x7e57c2), x, 0.45, 0.72);
  }

  // Compact SMG; a longer rifle on the Bottom path (the Honey Badger from Lv 3).
  const len = bottom ? (level >= 3 ? 2.8 : level >= 2 ? 2.3 : 1.7) : 1.7;
  const gun = holdLongGun(h, len, M(bottom && level >= 3 ? 0x6d5d45 : 0x2b2b2b));
  part(gun, boxGeo(0.28, 0.4, 0.55), dark, 0, -0.5, -0.4); // magazine
  if (top && level >= 2) part(gun, boxGeo(0.26, 0.4, 0.4), dark, 0, -0.5, -0.85); // extended magazine
  part(gun, boxGeo(0.28, 0.5, 0.35), dark, 0, 0.2, -0.05); // stock
  if (bottom && level >= 3) {
    part(gun, boxGeo(0.3, 1.0, 0.3), dark, 0, -len - 0.5, 0); // suppressor
    part(gun, boxGeo(0.22, 0.7, 0.3), dark, 0, -1.0, 0.36); // sight
    h.muzzles[0].position.y = -len - 1.0;
  } else if (top && level >= 1) part(gun, boxGeo(0.06, len * 0.7, 0.06), green, 0.2, -len * 0.5, 0.2); // laser sight
  h.tracer = top && level >= 1 ? 0xccff90 : 0xffe066;

  if (top && level >= 4) {
    // C7 Drone: a little quadcopter (shown by the tower view while the ability is on).
    const drone = new THREE.Group();
    part(drone, boxGeo(1.0, 0.35, 1.0), M(xg ? 0x263238 : 0x37474f), 0, 0, 0);
    part(drone, boxGeo(0.3, 0.2, 0.15), green, 0, -0.1, 0.55); // camera eye
    const rotors = [];
    for (const [x, z] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]]) {
      part(drone, boxGeo(0.12, 0.12, 0.12), dark, x, 0.15, z);
      const r = new THREE.Group();
      r.position.set(x, 0.25, z);
      part(r, boxGeo(0.9, 0.04, 0.14), dark, 0, 0, 0);
      drone.add(r);
      rotors.push(r);
    }
    if (xg) part(drone, boxGeo(0.4, 0.3, 0.6), M(0x111316), 0, -0.3, 0); // X-Ghost: a gun pod
    drone.userData.rotors = rotors;
    drone.visible = false;
    h.root.add(drone);
    h.drone = drone;
  }
  return h;
}
export const makeGhostBottom = (level) => makeGhost(level, true);

/**
 * Toxicnator: a hazmat suit with a gas mask and a grenade launcher. Top path: Lv 1 a filter pack,
 * Lv 3 the MGL's big revolving drum, Lv 4 a speed-loader bandolier and goggles, Lv 5 glowing toxic
 * tanks on the back. Bottom path: Lv 1 shoulder pads, Lv 3 orange Anthrax canisters, Lv 4 an
 * acid-green visor, Lv 5 glowing Gamma Toxins tanks.
 */
export function makeToxicnator(level, bottom = false) {
  const top = !bottom;
  const suitC = bottom && level >= 5 ? 0x3f5f22 : top && level >= 5 ? 0x9e9d24 : 0xc0ca33;
  const h = makeHumanoid({ skin: 0x8d6e63, shirt: suitC, pants: suitC, arms: suitC, face: 'soldier' });
  const { M } = h;
  const dark = M(0x212121);
  const tox = glow(h, bottom && level >= 5 ? 0xe040fb : 0x76ff03);
  // Hood and gas mask
  part(h.head, boxGeo(1.4, 1.35, 1.4), M(suitC), 0, 0.6, -0.03);
  part(h.head, boxGeo(1.1, 0.4, 0.15), M(0x263238), 0, 0.8, 0.7); // eye window
  for (const x of [-0.25, 0.25]) part(h.head, boxGeo(0.35, 0.28, 0.06), bottom && level >= 4 ? tox : M(0x80cbc4), x, 0.8, 0.79);
  part(h.head, boxGeo(0.6, 0.45, 0.4), dark, 0, 0.25, 0.82); // respirator
  for (const x of [-0.45, 0.45]) part(h.head, boxGeo(0.35, 0.35, 0.35), M(0x455a64), x, 0.2, 0.8); // filters

  if (top && level >= 1) part(h.torso, boxGeo(1.2, 1.2, 0.5), M(0x5d6b2f), 0, 0.2, -0.75); // filter pack
  if (top && level >= 4) {
    const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), M(0x4e342e), 0, 0, 0);
    strap.rotation.z = 0.7;
    for (const t of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.3, 0.3, 0.3), tox, t * 0.75, t * -0.8, 0.65);
  }
  if (top && level >= 5) {
    for (const x of [-0.45, 0.45]) {
      part(h.torso, boxGeo(0.6, 1.8, 0.6), M(0x33691e), x, 0.1, -1.1);
      part(h.torso, boxGeo(0.35, 1.3, 0.08), tox, x, 0.1, -1.42);
    }
  }
  if (bottom && level >= 1) for (const s of [-1, 1]) part(h.torso, boxGeo(0.8, 0.4, 1.25), M(0x827717), s * 1.4, 1.0, 0);
  if (bottom && level >= 3) {
    const can = M(level >= 5 ? 0x4a148c : 0xef6c00);
    for (const x of [-0.45, 0.45]) {
      part(h.torso, boxGeo(0.6, 1.6, 0.6), can, x, 0.1, -0.9);
      part(h.torso, boxGeo(0.3, 0.2, 0.3), dark, x, 1.0, -0.9);
    }
    if (level >= 5) for (const x of [-0.45, 0.45]) part(h.torso, boxGeo(0.35, 1.2, 0.08), tox, x, 0.1, -1.22);
  }

  // Grenade launcher: a short fat barrel; the MGL gets a big revolving drum.
  const gun = holdLongGun(h, 2, M(0x37474f));
  part(gun, boxGeo(0.55, 1.2, 0.55), dark, 0, -1.4, 0); // wide barrel
  const drum = top && level >= 3;
  part(gun, boxGeo(drum ? 0.95 : 0.6, drum ? 0.7 : 0.5, drum ? 0.95 : 0.6), drum ? M(0x546e7a) : dark, 0, -0.4, 0);
  if (drum) part(gun, boxGeo(0.3, 0.75, 0.3), tox, 0, -0.4, 0.45);
  part(gun, boxGeo(0.3, 0.5, 0.35), dark, 0, 0.2, -0.05); // stock
  h.muzzles[0].position.y = -2.1;
  h.projectile = { color: bottom && level >= 5 ? 0xe040fb : 0x76ff03, size: 0.5, arc: 3.5 };
  h.tracer = 0x76ff03;
  return h;
}
export const makeToxicnatorBottom = (level) => makeToxicnator(level, true);


/**
 * Saboteur (alternate Toxicnator): a hooded black-market operative with a sawn-off poison
 * shotgun. Lv 2 a respirator, Lv 3 a toxic drum magazine and tanks on the back, Lv 4 grenades
 * on a bandolier, Lv 5 the Neural-Runner's glowing visor and wider gun. A purple shard emblem.
 */
export function makeSaboteur(level) {
  const shirt = level >= 4 ? 0x1b1f2a : 0x2e3b2a;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: 0x1c1f24, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(0x111316);
  const tox = glow(h, level >= 4 ? 0xe040fb : 0x76ff03);
  // Hood
  part(h.head, boxGeo(1.4, 1.35, 1.35), M(level >= 4 ? 0x14161c : 0x253022), 0, 0.68, -0.08);
  part(h.torso, boxGeo(0.4, 0.4, 0.06), glow(h, 0xb388ff), 0.6, 0.6, 0.55); // Dimension Shard emblem
  if (level >= 1) {
    part(h.head, boxGeo(0.7, 0.4, 0.3), dark, 0, 0.25, 0.72); // respirator
    for (const x of [-0.35, 0.35]) part(h.head, boxGeo(0.25, 0.25, 0.25), M(0x455a64), x, 0.2, 0.75);
  }
  if (level >= 4) part(h.head, boxGeo(1.15, 0.25, 0.08), tox, 0, 0.8, 0.7); // Neural-Runner visor
  if (level >= 2) {
    for (const x of [-0.4, 0.4]) {
      part(h.torso, boxGeo(0.5, 1.5, 0.5), M(0x33691e), x, 0.1, -0.85);
      part(h.torso, boxGeo(0.3, 1.0, 0.06), tox, x, 0.1, -1.12);
    }
  }
  if (level >= 3) {
    const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), M(0x4e342e), 0, 0, 0);
    strap.rotation.z = -0.7;
    for (const t of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.32, 0.32, 0.32), M(level >= 4 ? 0x8e24aa : 0x9ccc3c), t * -0.75, t * -0.8, 0.65);
  }
  // Sawn-off shotgun with a poison canister under the barrel
  const len = level >= 4 ? 1.9 : 1.6;
  const gun = holdLongGun(h, len, M(0x3e2723));
  part(gun, boxGeo(level >= 4 ? 0.6 : 0.42, 0.9, 0.42), dark, 0, -len + 0.45, 0); // barrels
  part(gun, boxGeo(0.35, 0.6, 0.35), tox, 0, -0.9, 0.3);
  if (level >= 2) part(gun, boxGeo(0.7, 0.5, 0.7), M(0x546e7a), 0, -0.4, 0.15); // drum
  h.tracer = level >= 4 ? 0xea80fc : 0x9ccc3c;
  return h;
}

/** Paintballer: a paintball player with a hopper-fed marker. Look changes per level (0-5). */
export function makePaintballer(level) {
  const pro = level >= 4;
  const shirt = pro ? 0xd81b60 : level >= 2 ? 0x3949ab : 0x43a047;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt, pants: pro ? 0x212121 : 0x5d4037, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(0x212121);
  if (level >= 1) {
    // Paintball Gear: full mask with a tinted visor
    part(h.head, boxGeo(1.45, 0.6, 0.25), M(pro ? 0x111111 : 0x37474f), 0, 0.2, 0.7);
    part(h.head, boxGeo(1.2, 0.35, 0.08), M(pro ? 0xffd600 : 0x4fc3f7), 0, 0.75, 0.78);
    part(h.head, boxGeo(1.5, 0.2, 1.5), M(0x37474f), 0, 0.75, 0); // strap
  } else {
    part(h.head, boxGeo(1.45, 0.4, 1.45), M(0xf57f17), 0, 1.25, 0); // cap
    part(h.head, boxGeo(1.2, 0.12, 0.6), M(0xf57f17), 0, 1.08, 0.85); // brim
  }
  if (level >= 2) {
    // Shoulder Pads
    for (const x of [-1.3, 1.3]) part(h.torso, boxGeo(0.9, 0.35, 1.2), dark, x, 1.0, 0);
    part(h.torso, boxGeo(2.15, 1.2, 1.15), M(0x263238), 0, 0.4, 0); // chest protector
  }
  if (pro) {
    // Competitive Gear: a harness of paint pods on the back
    const pod = M(level >= 5 ? 0xffd600 : 0xeeeeee);
    for (const x of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.35, 1.2, 0.35), pod, x, 0, -0.8);
  }
  if (level >= 5) {
    // Paintball Champion: a gold belt and a splash of paint on the chest
    part(h.torso, boxGeo(2.15, 0.35, 1.15), M(0xffc400), 0, -0.85, 0);
    part(h.torso, boxGeo(0.7, 0.3, 0.1), glow(h, 0xffea00), 0, -0.85, 0.6);
    part(h.torso, boxGeo(0.6, 0.6, 0.06), M(0x00e676), -0.4, 0.5, 0.6);
  }
  const len = pro ? 1.8 : 1.5;
  const gun = holdLongGun(h, len, M(level >= 5 ? 0xffc400 : 0x546e7a));
  // Hopper on top of the marker
  part(gun, boxGeo(0.6, 0.6, 0.6), M(pro ? 0x212121 : 0xb0bec5), 0, -0.5, 0.5);
  part(gun, boxGeo(0.45, 0.25, 0.45), M(0xff1744), 0, -0.5, 0.85);
  part(gun, boxGeo(0.3, 0.8, 0.35), dark, 0, -0.35, -0.4); // air tank
  if (level >= 3) {
    // Double Barrel Gun: a second barrel beside the first
    part(gun, boxGeo(0.28, len, 0.3), M(0x546e7a), 0.32, -len / 2, 0);
    const m2 = new THREE.Object3D();
    m2.position.set(0.32, -len, 0);
    gun.add(m2);
    h.muzzles.push(m2);
  }
  h.projectile = { color: [0xff1744, 0x2979ff, 0xffea00, 0x00e676, 0xd500f9][level % 5], size: 0.35, arc: 0.6 };
  return h;
}
