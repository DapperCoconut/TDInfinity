// Tower models, file 8 of 12. Each makeX(level) builds one tower's look.
// In here:
// Sentry Tower, AATurret, Patrol Boat, Ghost, Toxicnator, Tesla, Saboteur, Paintballer.
// The list of which tower uses which builder is TOWER_MODELS in ../models.js.

import * as THREE from 'three';
import { TOWERS } from '../config.js';
import { boxGeo, makeHumanoid, part } from './kit.js';
import { glow, glowThing, gunMuzzle, holdLongGun, makeThing } from './bits.js';

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
 * Sentry: a small gun on a tripod. Top path: a longer barrel at Lv 3, a bigger gun at Lv 4, sabot
 * ammo box at Lv 5 and a dark X-Sentry with glowing stripes at Lv 6. Bottom path: a scope at Lv 2,
 * a thicker barrel at Lv 3, then a minigun with a rocket pod (two pods and a big frame at Lv 6).
 */
export function makeSentryTower(level, bottom = false) {
  const u = makeThing();
  const { M } = u;
  const xs = !bottom && level >= 5;
  const xwm = bottom && level >= 5;
  const metal = M(xs ? 0x263238 : xwm ? 0x37474f : 0x78909c);
  const dark = M(0x212121);
  const accent = xs ? glowThing(u, 0x00e5ff) : xwm ? glowThing(u, 0xff6d00) : M(0xfbc02d);
  // Tripod
  part(u.body, boxGeo(0.5, 1.2, 0.5), metal, 0, 0.6, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = part(u.body, boxGeo(0.18, 0.18, 1.3), dark, Math.sin(a) * 0.55, 0.15, Math.cos(a) * 0.55);
    leg.rotation.y = a;
  }
  const gun = new THREE.Group();
  gun.position.set(0, 1.45, 0);
  gun.scale.setScalar(bottom ? (level >= 5 ? 1.35 : level >= 3 ? 1.15 : 1) : level >= 3 ? 1.2 : 1);
  u.body.add(gun);
  part(gun, boxGeo(0.8, 0.6, 1.1), metal, 0, 0, -0.1); // body
  part(gun, boxGeo(0.82, 0.08, 0.9), accent, 0, 0.32, -0.1); // stripe
  if (bottom && level >= 3) {
    miniBarrels(u, gun, 0, 0, 0.4, level >= 5 ? 1.8 : 1.5, 6, 0.16, dark);
    gunMuzzle(u, gun, 0, 0, level >= 5 ? 2.2 : 1.9);
    // Rocket pods on the side
    const pods = level >= 5 ? [-1, 1] : [1];
    for (const side of pods) {
      part(gun, boxGeo(0.5, 0.5, 0.9), M(0x4e5b31), side * 0.7, 0.1, 0);
      for (const oy of [-0.12, 0.12]) part(gun, boxGeo(0.16, 0.16, 0.05), xwm ? accent : dark, side * 0.7, 0.1 + oy, 0.46);
    }
    if (level >= 5) for (const side of [-1, 1]) part(u.body, boxGeo(0.15, 1.6, 0.15), metal, side * 0.9, 1.2, -0.5); // frame
    u.projectile = { color: 0xff7043, size: 0.35 };
    u.tracer = 0xffe066;
  } else {
    const len = !bottom && level >= 2 ? 1.6 : 1.1;
    const bw = (bottom && level >= 2) || (!bottom && level >= 3) ? 0.26 : 0.18;
    part(gun, boxGeo(bw, bw, len), dark, 0, 0.05, 0.45 + len / 2);
    if (!bottom && level >= 3) part(gun, boxGeo(0.34, 0.34, 0.25), dark, 0, 0.05, 0.45 + len); // muzzle brake
    gunMuzzle(u, gun, 0, 0.05, 0.6 + len);
    if (!bottom && level >= 4) part(gun, boxGeo(0.4, 0.35, 0.5), M(0x556b2f), -0.6, -0.1, -0.1); // sabot ammo box
    u.tracer = xs ? 0x00e5ff : 0xffe066;
  }
  if (bottom && level >= 1) part(gun, boxGeo(0.2, 0.2, 0.6), M(0x111111), 0, 0.42, 0.1); // optics
  u.static = true;
  return u;
}
export const makeSentryTowerBottom = (level) => makeSentryTower(level, true);

/**
 * AA Turret: a launcher on a turntable with a radar dish. Top path: one missile tube per missile
 * in its burst, in a bigger rack each level (white Patriot boxes at Lv 6). Bottom path: a bigger
 * radar at Lv 3, then a C-RAM: a white dome over a spinning gatling (two at Lv 5, bigger at Lv 6).
 */
export function makeAATurret(level, bottom = false) {
  const u = makeThing();
  const { M } = u;
  const olive = M(0x5d6b3a);
  const dark = M(0x212121);
  const white = M(0xeceff1);
  part(u.body, boxGeo(2.6, 0.4, 2.6), M(0x9e9e9e), 0, 0.2, 0);
  part(u.body, boxGeo(1.6, 0.5, 1.6), dark, 0, 0.65, 0);
  const head = new THREE.Group();
  head.position.set(0, 0.9, 0);
  u.body.add(head);
  // Radar dish on a mast at the back
  const big = bottom && level >= 2;
  part(head, boxGeo(0.15, big ? 1.8 : 1.2, 0.15), dark, 0, big ? 0.9 : 0.6, -1.0);
  const dish = part(head, boxGeo(big ? 1.4 : 0.9, big ? 0.9 : 0.6, 0.1), white, 0, big ? 1.8 : 1.2, -1.0);
  dish.rotation.x = -0.4;
  if (bottom && level >= 3) {
    const ram = level >= 4 ? [-0.55, 0.55] : [0];
    const size = level >= 5 ? 1.25 : 1;
    for (const x of ram) {
      part(head, boxGeo(0.9 * size, 1.1 * size, 1.0 * size), white, x, 0.7, 0.1); // dome
      miniBarrels(u, head, x, 0.5, 0.6, 1.6 * size, 6, 0.14 * size, dark);
      gunMuzzle(u, head, x, 0.5, 0.6 + 1.6 * size);
    }
    u.tracer = 0xffab40;
  } else {
    const burst = TOWERS[bottom ? 'aaTurretBottom' : 'aaTurret'].levels[level].burst || 1;
    const cols = Math.min(burst, 4);
    const rows = Math.ceil(burst / cols);
    const patriot = !bottom && level >= 5;
    const tube = patriot ? 0.55 : 0.4;
    const w = cols * tube + 0.3;
    const h = rows * tube + 0.3;
    const rack = new THREE.Group();
    rack.position.set(0, 0.6 + h / 2, 0.2);
    rack.rotation.x = -0.35; // tilted up to the sky
    head.add(rack);
    part(rack, boxGeo(w, h, patriot ? 2.4 : 1.6), patriot ? white : olive, 0, 0, 0);
    for (let i = 0; i < burst; i++) {
      const cx = ((i % cols) - (cols - 1) / 2) * tube;
      const cy = (Math.floor(i / cols) - (rows - 1) / 2) * tube;
      part(rack, boxGeo(tube - 0.1, tube - 0.1, 0.06), dark, cx, cy, patriot ? 1.21 : 0.81);
      if (!patriot) part(rack, boxGeo(0.12, 0.12, 0.2), M(0xe53935), cx, cy, 0.85); // missile tips
    }
    gunMuzzle(u, rack, 0, 0, patriot ? 1.3 : 0.9);
    for (const side of [-1, 1]) part(head, boxGeo(0.15, 0.9, 0.6), dark, side * (w / 2 + 0.1), 0.6, 0.2); // rack arms
    u.projectile = { color: 0xeceff1, size: patriot ? 0.55 : 0.4 };
    u.tracer = 0xffffff;
  }
  u.static = true;
  return u;
}
export const makeAATurretBottom = (level) => makeAATurret(level, true);

/**
 * Patrol Boat: a grey gunboat floating on the water, facing +Z. Top path: Lv 1 an ammo box,
 * Lv 2 a RHIB with orange inflatable sides, Lv 3 the bigger Attack Boat with an explosive cannon,
 * Lv 4 twin cannons, Lv 5 Hellfire missile pods on the cabin. Bottom path: Lv 1 a scoped Smart Gun,
 * Lv 2 cooling jackets on the barrel, Lv 3 a flamethrower with a fuel tank, Lv 4 the armored
 * Monitor, Lv 5 twin flame nozzles fed by big glowing Flame Tanks.
 */
export function makePatrolBoat(level, bottom = false) {
  const u = makeThing();
  const { M } = u;
  const top = !bottom;
  const big = level >= 3; // Attack Boat / Flamethrower and up have a bigger hull
  const monitor = bottom && level >= 4;
  const hullC = M(monitor ? 0x37474f : top && level >= 3 ? 0x546e7a : 0x78909c);
  const deck = M(monitor ? 0x455a64 : 0x9e9e9e);
  const dark = M(0x212121);
  const white = M(0xeceff1);
  const L = big ? 5 : 4.2; // hull length
  const W = big ? 2.5 : 2.1;
  // Hull: a long box with a pointed bow (two angled boxes) and a dark waterline stripe.
  part(u.body, boxGeo(W, 0.8, L), hullC, 0, 0.1, -0.3);
  part(u.body, boxGeo(W + 0.04, 0.18, L + 0.02), dark, 0, -0.2, -0.3);
  for (const side of [-1, 1]) {
    const b = part(u.body, boxGeo(W * 0.72, 0.8, 1.3), hullC, side * W * 0.18, 0.1, L / 2 + 0.2);
    b.rotation.y = side * 0.5;
  }
  part(u.body, boxGeo(W - 0.3, 0.1, L - 0.4), deck, 0, 0.55, -0.3);
  // RHIB+: orange inflatable tubes along both sides.
  if (top && level === 2) for (const side of [-1, 1]) part(u.body, boxGeo(0.45, 0.45, L - 0.4), M(0xff7043), side * (W / 2 + 0.15), 0.3, -0.3);
  // Monitor: armor plates along the sides.
  if (monitor) for (const side of [-1, 1]) part(u.body, boxGeo(0.25, 0.7, L - 0.8), M(0x263238), side * (W / 2 + 0.1), 0.4, -0.3);
  // Cabin at the back with windows.
  const cabH = big ? 1.3 : 1.0;
  part(u.body, boxGeo(W - 0.6, cabH, 1.6), monitor ? M(0x455a64) : white, 0, 0.6 + cabH / 2, -L / 2 + 0.6);
  part(u.body, boxGeo(W - 0.5, 0.3, 0.08), M(0x4fc3f7), 0, 0.6 + cabH * 0.7, -L / 2 + 1.42);
  part(u.body, boxGeo(0.1, 0.9, 0.1), dark, 0, 0.6 + cabH + 0.45, -L / 2 + 0.4); // radio mast
  // Gun mount on the bow, on a turret group that holds the weapons.
  const head = new THREE.Group();
  head.position.set(0, 0.6, big ? 1.1 : 0.9);
  u.body.add(head);
  part(head, boxGeo(1.0, 0.35, 1.0), dark, 0, 0.18, 0);
  const flames = bottom && level >= 3;
  if (flames) {
    // Flamethrower: nozzles on the bow fed by fuel tanks behind them.
    const tanks = level >= 5;
    const tankMat = tanks ? glowThing(u, 0xff6d00) : M(0xc62828);
    const nozzles = tanks ? [-0.4, 0.4] : [0];
    for (const x of nozzles) {
      part(head, boxGeo(0.35, 0.35, 1.6), M(0x424242), x, 0.55, 0.7);
      part(head, boxGeo(0.5, 0.5, 0.3), dark, x, 0.55, 1.55);
      gunMuzzle(u, head, x, 0.55, 1.75);
    }
    const tankXs = tanks ? [-0.7, 0.7] : [0];
    for (const x of tankXs) {
      const r = tanks ? 0.55 : 0.4;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.4, 10), tankMat);
      t.rotation.x = Math.PI / 2;
      t.position.set(x, 0.6 + r, -1.0);
      t.castShadow = true;
      head.add(t);
    }
    u.tracer = 0xff7043;
  } else {
    const cannon = top && level >= 3;
    const xs = top && level >= 4 ? [-0.35, 0.35] : [0];
    const bw = cannon ? 0.3 : 0.18;
    const len = cannon ? 2.0 : 1.6;
    part(head, boxGeo(xs.length > 1 ? 1.2 : 0.7, 0.55, 0.8), M(0x37474f), 0, 0.6, 0); // gun housing
    for (const x of xs) {
      part(head, boxGeo(bw, bw, len), dark, x, 0.65, 0.4 + len / 2);
      // Cooling Barrels: ribbed jackets along the barrel.
      if (bottom && level >= 2) for (let i = 0; i < 3; i++) part(head, boxGeo(bw + 0.14, bw + 0.14, 0.18), M(0x90a4ae), x, 0.65, 0.7 + i * 0.4);
      gunMuzzle(u, head, x, 0.65, 0.5 + len);
    }
    if (bottom && level >= 1) part(head, boxGeo(0.16, 0.2, 0.7), dark, 0, 1.0, 0.3); // Smart Gun scope
    if (top && level >= 1) part(head, boxGeo(0.6, 0.45, 0.5), M(0x556b2f), -0.7, 0.4, -0.2); // ammo box
    u.tracer = cannon ? 0xffab40 : 0xffe082;
    u.projectile = { color: 0xeceff1, size: 0.45 };
  }
  // Hellfire Missiles: a missile pod on each side of the cabin.
  if (top && level >= 5) {
    for (const side of [-1, 1]) {
      const pod = part(u.body, boxGeo(0.6, 0.6, 1.4), M(0x37474f), side * (W / 2 - 0.1), 0.6 + cabH + 0.1, -L / 2 + 0.7);
      pod.rotation.x = -0.25;
      for (const y of [-0.13, 0.13]) part(u.body, boxGeo(0.18, 0.18, 0.1), M(0xe53935), side * (W / 2 - 0.1), 0.6 + cabH + 0.1 + y, -L / 2 + 1.45);
    }
  }
  u.static = true;
  u.bob = 0.08; // rocks gently on the water
  return u;
}
export const makePatrolBoatBottom = (level) => makePatrolBoat(level, true);

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
 * Tesla: a big Tesla coil on a stone plinth (it doesn't turn; bolts leap from the crown).
 * Lv 2 a kite flying from a copper wire, Lv 3 battery packs around the base, Lv 4 a gold
 * Auric cooling cell around the column, Lv 5 Kimat's Bite: a dark column with a blazing crown.
 */
export function makeTesla(level) {
  const u = makeThing();
  const { M } = u;
  const kimat = level >= 4;
  const bolt = kimat ? 0xe1f5fe : 0x80d8ff;
  const copper = M(0xb87333);
  const dark = M(0x263238);
  const spark = glowThing(u, bolt);
  // Plinth and column
  part(u.body, boxGeo(3.6, 0.6, 3.6), M(0x78909c), 0, 0.3, 0);
  part(u.body, boxGeo(2.6, 0.5, 2.6), M(0x546e7a), 0, 0.85, 0);
  const tall = level >= 2 ? 6.6 : 6;
  part(u.body, boxGeo(1.1, tall, 1.1), kimat ? dark : M(0x37474f), 0, 1.1 + tall / 2, 0);
  // Copper windings up the column
  const rings = level >= 2 ? 8 : 6;
  for (let i = 0; i < rings; i++) part(u.body, boxGeo(1.35, 0.18, 1.35), copper, 0, 1.6 + (i * (tall - 1.2)) / (rings - 1), 0);
  // Crown: a flat ring of boxes (the toroid) with a glowing core
  const top = 1.1 + tall + 0.35;
  const ringR = kimat ? 1.6 : 1.3;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const seg = part(u.body, boxGeo(1.0, 0.55, 0.6), kimat ? M(0x37474f) : M(0xb0bec5), Math.cos(a) * ringR, top, Math.sin(a) * ringR);
    seg.rotation.y = -a + Math.PI / 2;
  }
  part(u.body, boxGeo(0.9, 0.9, 0.9), spark, 0, top + 0.2, 0);
  if (kimat) for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    part(u.body, boxGeo(0.25, 1.1, 0.25), spark, Math.cos(a) * ringR, top + 0.8, Math.sin(a) * ringR); // prongs
  }
  gunMuzzle(u, u.body, 0, top + 0.6, 0);
  if (level >= 1) {
    // Kite in the Wind: a kite on a copper wire, tied to the crown
    const kite = part(u.body, boxGeo(1.4, 1.4, 0.1), M(0xe53935), -2.6, top + 3.2, -1.2);
    kite.rotation.set(0.3, 0.4, Math.PI / 4);
    const wire = part(u.body, boxGeo(0.06, 0.06, 4.3), copper, -1.3, top + 1.6, -0.6);
    wire.lookAt(-2.6, top + 3.2, -1.2);
    part(u.body, boxGeo(0.2, 0.2, 0.2), spark, -2.6, top + 2.3, -1.2);
  }
  if (level >= 2) {
    // Self-Sustaining Battery: battery packs on each side of the plinth
    for (const [x, z] of [[1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]]) {
      part(u.body, boxGeo(0.8, 1.2, 0.8), M(0x455a64), x, 1.2, z);
      part(u.body, boxGeo(0.5, 0.2, 0.5), level >= 3 ? glowThing(u, 0xffd740) : spark, x, 1.9, z);
    }
  }
  if (level >= 3) {
    // Auric Quantum Cooling Cell: gold fins around the middle of the column
    const gold = glowThing(u, 0xffc400);
    gold.emissiveIntensity = 0.35;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const fin = part(u.body, boxGeo(0.25, 2.2, 1.2), gold, Math.cos(a) * 0.85, 1.1 + tall * 0.55, Math.sin(a) * 0.85);
      fin.rotation.y = -a;
    }
  }
  u.tracer = bolt;
  u.static = true;
  return u;
}

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
