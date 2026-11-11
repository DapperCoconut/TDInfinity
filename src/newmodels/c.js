import * as THREE from 'three';
import { VEHICLE_UNITS } from '../vehicleunits.js';
import {
  boxGeo,
  part,
  makeHumanoid,
  makeThing,
  glow,
  glowThing,
  helmet,
  holdLongGun,
  setMuzzle,
  gunMuzzle,
  cylPart,
  cylGeo,
  cylGeoX,
  clearMat,
  addPistol,
  turret,
  wheels,
  inHand,
} from '../models.js';

// Only call the imported helpers inside functions: models.js imports this file (circular import).

/** A muzzle point on `parent`, added to the model's muzzle list. */
function addMuzzle(m, parent, x, y, z) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  parent.add(o);
  (m.muzzles ||= []).push(o);
  return o;
}

/** An ice / void crystal: a tall box with a smaller tip on top, tilted outward. */
function crystal(parent, mat, x, y, z, hgt, w, tilt = 0, yaw = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.set(Math.cos(yaw) * tilt, yaw, -Math.sin(yaw) * tilt);
  parent.add(g);
  part(g, boxGeo(w, hgt, w), mat, 0, hgt / 2, 0).rotation.y = Math.PI / 4;
  part(g, boxGeo(w * 0.55, hgt * 0.35, w * 0.55), mat, 0, hgt + hgt * 0.12, 0).rotation.y = Math.PI / 4;
  return g;
}

/** A soldier squad unit (same shape makeUnit returns for squads). */
function squad(count, make) {
  const u = makeThing();
  u.wheels = [];
  u.soldiers = [];
  for (let i = 0; i < count; i++) {
    const h = make();
    h.root.scale.setScalar(0.6 * (h.size ?? 1));
    h.root.position.set(count === 1 ? 0 : (i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.soldiers.push(h);
    u.muzzles.push(h.muzzles[0]);
  }
  u.height = 3.5 * (u.soldiers[0].size ?? 1);
  u.tracer = u.soldiers[0].tracer;
  u.projectile = u.soldiers[0].projectile;
  return u;
}

/** Puts a unit model (scaled) into a building model. */
function parkUnit(u, unit, s, x, y, z, yaw = 0) {
  unit.root.scale.setScalar(s);
  unit.root.position.set(x, y, z);
  unit.root.rotation.y = yaw;
  u.body.add(unit.root);
  u.mats.push(...unit.mats);
  return unit;
}

// ================================================================== towers

/**
 * Glacier (cliff): a frost-crystal ice cannon on a block of glacier ice. More crystals every
 * level; Lv 2 twin barrels, Lv 3 a frost core and crystal shoulder spikes, Lv 4 a triple cannon
 * under a crown of glowing crystals.
 */
function glacier(level) {
  const u = makeThing();
  const { M } = u;
  const ice = M(0xb3e5fc);
  const deep = M(0x4fc3f7);
  const frost = glowThing(u, level >= 4 ? 0x84ffff : 0x80deea);
  frost.emissiveIntensity = 0.6;
  const steel = M(level >= 3 ? 0x546e7a : 0x78909c);
  // Glacier block base
  part(u.body, boxGeo(3.6, 1.2, 3.6), M(0xe1f5fe), 0, 0.6, 0);
  part(u.body, boxGeo(3.0, 0.6, 3.0), ice, 0, 1.5, 0);
  // Ring of crystals around the base, more each level
  const n = 3 + level * 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3;
    const hgt = 0.9 + ((i * 7) % 5) * 0.25 + level * 0.1;
    crystal(u.body, i % 3 === 0 ? deep : i % 3 === 1 ? ice : frost, Math.cos(a) * 1.6, 1.0, Math.sin(a) * 1.6, hgt, 0.45, 0.35, -a + Math.PI / 2);
  }
  // Turret: a rounded housing with the barrels pointing +Z
  const t = new THREE.Group();
  t.position.set(0, 1.8, 0);
  u.body.add(t);
  part(t, boxGeo(2.0, 0.4, 2.0), steel, 0, 0.2, 0);
  part(t, boxGeo(1.8, 1.4, 2.2), M(0x90a4ae), 0, 1.1, -0.1);
  part(t, boxGeo(1.9, 0.3, 2.3), ice, 0, 1.9, -0.1); // frosted roof
  part(t, boxGeo(0.9, 0.5, 0.1), frost, 0, 1.2, 1.01); // frost window
  // Coolant tank on the back
  part(t, cylGeo(0.5, 0.5, 1.4, 10), deep, 0, 1.1, -1.5).rotation.x = Math.PI / 2;
  const xs = level >= 4 ? [-0.55, 0, 0.55] : level >= 2 ? [-0.35, 0.35] : [0];
  const len = 2.2 + level * 0.3;
  const bw = level >= 4 ? 0.42 : 0.5;
  for (const x of xs) {
    part(t, boxGeo(bw, bw, len), steel, x, 1.0, 1.0 + len / 2);
    for (let i = 0; i < 2 + (level >= 3 ? 1 : 0); i++) part(t, boxGeo(bw + 0.15, bw + 0.15, 0.2), ice, x, 1.0, 1.4 + i * (len / 3)); // frost rings
    part(t, boxGeo(bw + 0.1, bw + 0.1, 0.3), frost, x, 1.0, 1.0 + len); // icy muzzle
    addMuzzle(u, t, x, 1.0, 1.3 + len);
  }
  if (level >= 1) {
    // Icicles hanging off the housing
    for (const x of [-0.7, -0.2, 0.3, 0.75]) part(t, boxGeo(0.15, 0.5, 0.15), ice, x, 0.5, 1.0);
  }
  if (level >= 3) {
    // Frost core + crystal spikes on the shoulders
    part(t, boxGeo(0.7, 0.7, 0.7), frost, 0, 2.4, -0.4).rotation.set(0.6, 0.6, 0);
    for (const side of [-1, 1]) crystal(t, deep, side * 1.0, 1.6, -0.3, 1.2, 0.35, 0.5, side * Math.PI / 2);
  }
  if (level >= 4) {
    // Crown of big glowing crystals behind the turret
    for (const [x, hgt] of [[-1.1, 2.0], [0, 2.8], [1.1, 2.0]]) crystal(u.body, frost, x, 1.8, -1.3, hgt, 0.55, 0.15, x > 0 ? Math.PI / 2 : x < 0 ? -Math.PI / 2 : 0);
    const halo = part(u.body, cylGeo(2.3, 2.3, 0.06, 20), clearMat(u, 0x84ffff, 0.25), 0, 1.25, 0);
    halo.castShadow = false;
  }
  u.static = true;
  u.bob = 0;
  u.tracer = 0x84ffff;
  u.projectile = { color: 0xe1f5fe, size: level >= 4 ? 0.8 : 0.6 };
  u.flight = { color: 0xb3e5fc, size: level >= 4 ? 0.9 : 0.7, arc: 0.3 }; // ice cubes
  return u;
}

/**
 * Enforcement Base: a security HQ with a light bar and a garage. Lv 1 radio mast and flag, Lv 2
 * barricades, Lv 3 a watchtower with a searchlight, Lv 4 a truck bay with an armored truck,
 * Lv 5 a robot hangar with a patrol mech.
 */
function enforcementBase(level) {
  const u = makeThing();
  const { M } = u;
  const navy = M(0x283593);
  const white = M(0xeceff1);
  const dark = M(0x263238);
  const red = glowThing(u, 0xff1744);
  const blue = glowThing(u, 0x2979ff);
  const x0 = level >= 4 ? -0.8 : 0; // make room for the side bays
  part(u.body, boxGeo(level >= 4 ? 5.2 : 4.2, 0.3, 4.2), M(0x9e9e9e), x0 * 0.6, 0.15, 0); // concrete
  // HQ building at the back
  part(u.body, boxGeo(3.4, 3.0, 2.0), navy, x0, 1.8, -1.0);
  part(u.body, boxGeo(3.5, 0.35, 2.1), white, x0, 2.4, -1.0); // white stripe
  part(u.body, boxGeo(3.7, 0.3, 2.3), dark, x0, 3.45, -1.0); // roof
  part(u.body, boxGeo(0.9, 1.5, 0.1), M(0x90caf9), x0 + 1.0, 1.1, 0.02); // glass door
  part(u.body, boxGeo(1.4, 0.4, 0.1), M(0xfdd835), x0 + 1.0, 2.0, 0.03); // badge sign
  // Garage door
  part(u.body, boxGeo(1.7, 1.8, 0.1), M(0x616161), x0 - 0.7, 1.2, 0.02);
  for (let i = 0; i < 4; i++) part(u.body, boxGeo(1.7, 0.06, 0.12), dark, x0 - 0.7, 0.5 + i * 0.45, 0.05);
  // Light bar on the roof
  part(u.body, boxGeo(1.6, 0.2, 0.5), dark, x0, 3.7, -0.6);
  part(u.body, boxGeo(0.7, 0.3, 0.45), red, x0 - 0.4, 3.9, -0.6);
  part(u.body, boxGeo(0.7, 0.3, 0.45), blue, x0 + 0.4, 3.9, -0.6);
  // A patrol car out front
  const car = new THREE.Group();
  car.position.set(x0 - 0.3, 0.3, 1.3);
  car.rotation.y = Math.PI / 2;
  u.body.add(car);
  part(car, boxGeo(2.2, 0.5, 1.1), white, 0, 0.45, 0);
  part(car, boxGeo(1.2, 0.45, 1.0), navy, -0.1, 0.9, 0);
  part(car, boxGeo(0.5, 0.15, 0.3), red, -0.1, 1.2, -0.2);
  part(car, boxGeo(0.5, 0.15, 0.3), blue, -0.1, 1.2, 0.2);
  for (const x of [-0.7, 0.7]) for (const z of [-0.55, 0.55]) part(car, boxGeo(0.45, 0.45, 0.15), M(0x111111), x, 0.22, z);
  if (level >= 1) {
    // Radio mast + flag
    part(u.body, boxGeo(0.12, 2.6, 0.12), M(0xbdbdbd), x0 - 1.4, 4.9, -1.6);
    part(u.body, boxGeo(0.6, 0.06, 0.06), M(0xbdbdbd), x0 - 1.4, 5.6, -1.6);
    part(u.body, boxGeo(0.05, 0.7, 1.1), navy, x0 + 1.5, 4.5, -1.5);
    part(u.body, boxGeo(0.1, 2.0, 0.1), M(0xbdbdbd), x0 + 1.5, 4.4, -2.0);
  }
  if (level >= 2) {
    // Striped barricades along the front
    for (const x of [-1.6, 1.6]) {
      part(u.body, boxGeo(1.0, 0.5, 0.2), white, x0 * 0.6 + x, 0.75, 1.9);
      for (const k of [-0.3, 0.1]) part(u.body, boxGeo(0.2, 0.52, 0.22), M(0xff6f00), x0 * 0.6 + x + k, 0.75, 1.9);
      for (const k of [-0.4, 0.4]) part(u.body, boxGeo(0.1, 0.6, 0.1), dark, x0 * 0.6 + x + k, 0.4, 1.9);
    }
  }
  if (level >= 3) {
    // Watchtower with a searchlight
    const wx = x0 + 1.4;
    for (const dx of [-0.35, 0.35]) for (const dz of [-0.35, 0.35]) part(u.body, boxGeo(0.12, 2.0, 0.12), dark, wx + dx, 4.6, -1.5 + dz);
    part(u.body, boxGeo(1.1, 0.15, 1.1), dark, wx, 5.6, -1.5);
    part(u.body, boxGeo(1.1, 0.4, 0.08), navy, wx, 5.85, -0.95);
    part(u.body, boxGeo(0.5, 0.5, 0.6), M(0x424242), wx, 6.0, -1.5).rotation.x = -0.4;
    part(u.body, boxGeo(0.4, 0.4, 0.05), glowThing(u, 0xfff9c4), wx, 6.13, -1.18).rotation.x = -0.4;
  }
  if (level >= 4) {
    // Truck bay on the right side, armored truck inside
    const bx = 1.9;
    part(u.body, boxGeo(0.15, 2.4, 3.6), navy, bx + 1.0, 1.5, -0.2);
    part(u.body, boxGeo(0.15, 2.4, 3.6), navy, bx - 1.0, 1.5, -0.2);
    part(u.body, boxGeo(2.3, 0.25, 3.8), dark, bx, 2.8, -0.2);
    part(u.body, boxGeo(2.0, 0.3, 0.12), M(0xfdd835), bx, 2.55, 1.6);
    parkUnit(u, veh('ebtruck'), 0.32, bx, 0.3, -0.1);
  }
  if (level >= 5) {
    // Robot hangar behind: a tall dark shed with a glowing door frame and a mech peeking out
    part(u.body, boxGeo(4.0, 0.3, 1.6), M(0x9e9e9e), 0, 0.15, -2.8);
    part(u.body, boxGeo(3.6, 4.2, 0.2), M(0x1a237e), 0, 2.4, -3.5);
    for (const x of [-1.8, 1.8]) part(u.body, boxGeo(0.25, 4.2, 1.4), M(0x1a237e), x, 2.4, -2.8);
    part(u.body, boxGeo(3.85, 0.3, 1.6), dark, 0, 4.6, -2.8);
    for (const x of [-1.6, 1.6]) part(u.body, boxGeo(0.1, 4.0, 0.1), blue, x, 2.3, -2.08);
    part(u.body, boxGeo(3.2, 0.1, 0.1), blue, 0, 4.35, -2.08);
    parkUnit(u, veh('ebapm'), 0.5, 0, 0.3, -2.7);
  }
  u.static = true;
  return u;
}

/**
 * Planeswalker (cliff sniper): a hooded wanderer in a long cloak with a very long scoped rifle and
 * mystic purple accents. Lv 1 a scarf and rune scope, Lv 2 glowing rune bands, Lv 3 shoulder
 * plates and floating rune shards, Lv 4 glowing eyes under the hood (hidden detection).
 */
function planeswalker(level) {
  const seer = level >= 4;
  const h = makeHumanoid({ skin: 0xc8a27a, shirt: 0x2a1a40, pants: 0x1a1028, arms: 0x2a1a40, face: seer ? 'none' : 'soldier' });
  const { M } = h;
  const cloak = M(seer ? 0x1a0033 : 0x3a2660);
  const mystic = glow(h, seer ? 0xe040fb : 0xb388ff);
  const metal = M(0x37474f);
  // Hood over the head, cloak down the back
  part(h.head, boxGeo(1.5, 0.45, 1.5), cloak, 0, 1.35, -0.05);
  for (const side of [-1, 1]) part(h.head, boxGeo(0.18, 1.2, 1.5), cloak, side * 0.72, 0.65, -0.05);
  part(h.head, boxGeo(1.5, 1.3, 0.2), cloak, 0, 0.7, -0.7);
  part(h.torso, boxGeo(2.3, 3.4 + level * 0.15, 0.15), cloak, 0, -0.7, -0.62);
  part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x4e342e), 0, -0.85, 0); // belt
  part(h.torso, boxGeo(0.35, 0.35, 0.1), mystic, 0, -0.85, 0.56); // belt gem
  if (level >= 1) part(h.head, boxGeo(1.3, 0.45, 0.12), M(0x4a148c), 0, 0.25, 0.62); // face scarf
  if (level >= 3) {
    for (const side of [-1, 1]) {
      part(h.torso, boxGeo(0.9, 0.5, 1.2), metal, side * 1.3, 1.05, 0); // shoulder plates
      part(h.torso, boxGeo(0.92, 0.08, 1.22), mystic, side * 1.3, 0.85, 0);
    }
    // Floating rune shards around the shooter
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      part(h.root, boxGeo(0.3, 0.55, 0.3), mystic, Math.cos(a) * 2.0, 4.6 + (i % 2) * 0.6, Math.sin(a) * 2.0).rotation.set(0.5, a, 0.5);
    }
  }
  if (seer) {
    // Glowing eyes in the shadow of the hood, glowing cloak hem
    part(h.head, boxGeo(1.22, 1.22, 0.04), M(0x0b0014), 0, 0.6, 0.6);
    for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.28, 0.16, 0.05), glow(h, 0xff80ff), x, 0.75, 0.64);
    part(h.torso, boxGeo(2.32, 0.12, 0.17), mystic, 0, -2.5, -0.62);
    const ring = part(h.root, cylGeo(2.2, 2.2, 0.05, 18), clearMat(h, 0xe040fb, 0.25), 0, 0.05, 0);
    ring.castShadow = false;
  }
  // The very long rifle
  const len = 4.0 + level * 0.25;
  const gun = holdLongGun(h, len, M(seer ? 0x1a1a1a : 0x2b2b2b));
  part(gun, boxGeo(0.35, 0.8, 0.45), M(0x3e2723), 0, 0.1, -0.05); // stock
  const scope = 1.2 + (level >= 1 ? 0.3 : 0);
  part(gun, boxGeo(0.28, scope, 0.32), metal, 0, -0.9, 0.4); // scope
  part(gun, boxGeo(0.3, 0.06, 0.34), level >= 1 ? mystic : metal, 0, -0.9 - scope / 2, 0.4); // scope lens
  for (const x of [-0.18, 0.18]) part(gun, boxGeo(0.08, 0.08, 0.9), metal, x, -len + 0.7, -0.5); // bipod
  if (level >= 2) for (let i = 0; i < 3; i++) part(gun, boxGeo(0.42, 0.12, 0.52), mystic, 0, -1.6 - i * (len - 2) / 3, 0); // rune bands
  if (level >= 3) part(gun, boxGeo(0.45, 0.5, 0.55), metal, 0, -len, 0); // muzzle brake
  if (seer) part(gun, boxGeo(0.2, 0.2, 0.2), mystic, 0, -len - 0.35, 0);
  h.muzzles[0].position.y = -len - 0.3;
  h.tracer = seer ? 0xe040fb : 0xce93d8;
  h.tracerWidth = level >= 3 ? 0.3 : undefined;
  return h;
}

/**
 * Submerge (water): a submarine with a missile hatch deck. Bigger every level; Lv 1 dive planes,
 * Lv 2 more hatches, Lv 3 a periscope and a striped nuke silo, Lv 4 a sonar hump and more cells,
 * Lv 5 a big dark sub with a huge glowing missile raised out of the silo.
 */
function submerge(level) {
  const u = makeThing();
  const { M } = u;
  const dark5 = level >= 5;
  const L = [5.0, 5.4, 5.9, 6.4, 7.0, 8.2][level];
  const R = [0.85, 0.9, 1.0, 1.05, 1.15, 1.35][level];
  const hullC = M(dark5 ? 0x1a1a1a : level >= 3 ? 0x37474f : 0x455a64);
  const deck = M(dark5 ? 0x263238 : 0x546e7a);
  const black = M(0x111111);
  const hatchM = M(0x78909c);
  // Hull: a long cylinder along Z with tapered nose and tail, sitting low in the water
  const y = 0.2;
  part(u.body, cylGeoX(R, R, L, 12), hullC, 0, y, 0);
  part(u.body, cylGeoX(R * 0.25, R, 1.4, 12), hullC, 0, y, L / 2 + 0.7); // nose
  part(u.body, cylGeoX(R, R * 0.3, 1.6, 12), hullC, 0, y, -L / 2 - 0.8); // tail
  part(u.body, boxGeo(R * 1.4, 0.15, L * 0.9), deck, 0, y + R * 0.95, 0); // flat deck
  // Tail fins + propeller
  part(u.body, boxGeo(0.12, R * 1.8, 0.7), hullC, 0, y, -L / 2 - 1.3);
  part(u.body, boxGeo(R * 1.8, 0.12, 0.7), hullC, 0, y, -L / 2 - 1.3);
  part(u.body, boxGeo(1.0, 0.18, 0.12), black, 0, y, -L / 2 - 1.75).rotation.z = 0.6;
  // Conning tower (sail)
  const sz = L * 0.18;
  const sh = 1.2 + level * 0.12;
  part(u.body, boxGeo(0.8, sh, 1.8), hullC, 0, y + R + sh / 2, sz);
  part(u.body, boxGeo(0.82, 0.12, 0.6), M(0x4fc3f7), 0, y + R + sh - 0.25, sz + 0.65); // bridge windows
  if (level >= 1) for (const side of [-1, 1]) part(u.body, boxGeo(0.9, 0.1, 0.5), hullC, side * 0.8, y + R + sh * 0.6, sz); // dive planes
  // Missile hatch deck: rows of hatches behind the sail, a muzzle on each
  const cells = [2, 3, 4, 4, 5, 6][level];
  for (let i = 0; i < cells; i++) {
    for (const x of [-0.35, 0.35]) {
      const z = sz - 1.4 - i * 0.65;
      part(u.body, boxGeo(0.5, 0.12, 0.5), hatchM, x, y + R + 0.08, z);
      part(u.body, boxGeo(0.22, 0.04, 0.22), M(dark5 ? 0xff1744 : 0xe53935), x, y + R + 0.15, z);
      addMuzzle(u, u.body, x, y + R + 0.4, z);
    }
  }
  if (level >= 3) {
    // Periscope + nuke silo in front of the sail
    part(u.body, boxGeo(0.12, 1.4, 0.12), black, 0.15, y + R + sh + 0.7, sz - 0.3);
    part(u.body, boxGeo(0.14, 0.18, 0.4), black, 0.15, y + R + sh + 1.4, sz - 0.18);
    const siloZ = sz + 1.7;
    part(u.body, cylGeo(0.55, 0.6, 0.35, 12), M(0xfdd835), 0, y + R + 0.15, siloZ);
    for (let k = 0; k < 4; k++) part(u.body, boxGeo(0.14, 0.37, 1.1), black, -0.35 + k * 0.23, y + R + 0.15, siloZ).rotation.y = 0.7;
    part(u.body, cylGeo(0.4, 0.4, 0.38, 12), M(0x212121), 0, y + R + 0.17, siloZ);
    if (!dark5) part(u.body, boxGeo(0.25, 0.04, 0.25), glowThing(u, 0xff6d00), 0, y + R + 0.37, siloZ);
  }
  if (level >= 4) part(u.body, boxGeo(R * 1.2, 0.5, 1.2), deck, 0, y + R + 0.2, L / 2 - 0.4); // sonar hump
  if (dark5) {
    // The huge missile, raised out of the silo
    const siloZ = sz + 1.7;
    const red = glowThing(u, 0xff1744);
    part(u.body, cylGeo(0.32, 0.32, 3.0, 10), M(0xeceff1), 0, y + R + 1.8, siloZ);
    part(u.body, cylGeo(0.02, 0.32, 0.9, 10), red, 0, y + R + 3.75, siloZ);
    part(u.body, boxGeo(0.34, 0.25, 0.34), black, 0, y + R + 2.5, siloZ);
    for (const r of [0, Math.PI / 2]) part(u.body, boxGeo(1.0, 0.6, 0.06), M(0x424242), 0, y + R + 0.6, siloZ).rotation.y = r; // fins
    // Red glowing strip along the hull
    for (const side of [-1, 1]) part(u.body, boxGeo(0.05, 0.12, L * 0.8), red, side * R * 1.0, y + 0.2, 0);
    u.body.scale.setScalar(0.92);
  }
  u.static = true;
  u.bob = 0.05;
  u.tracer = dark5 ? 0xff1744 : 0xff7043;
  u.projectile = { color: 0xeceff1, size: dark5 ? 0.8 : 0.6 };
  return u;
}

/**
 * Shock Commando: a commando with a rifle and a shoulder missile pod. Lv 1 gloves and kneepads,
 * Lv 2 a bigger pod and a visor, Lv 3 a second pod on the other shoulder, Lv 4 Shock Missiles:
 * electric blue tips and coils, Lv 5 heavy armor crackling with blue arcs.
 */
function shockCommando(level) {
  const shock = level >= 4;
  const heavy = level >= 5;
  const h = makeHumanoid({ skin: 0xa0522d, shirt: heavy ? 0x1c2833 : 0x4b5d3a, pants: heavy ? 0x111827 : 0x3a3f2a, arms: heavy ? 0x1c2833 : 0xa0522d, face: 'soldier' });
  const { M } = h;
  const zap = glow(h, 0x40c4ff);
  const podM = M(heavy ? 0x263238 : 0x37474f);
  const dark = M(0x1f1f1f);
  helmet(h, heavy ? 0x263238 : 0x556b2f);
  part(h.torso, boxGeo(2.15, 1.5, 1.15), M(heavy ? 0x37474f : 0x5d6b3a), 0, 0.1, 0); // vest
  if (level >= 1) {
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.05, 0.5, 1.05), dark, 0, -1.75, 0);
    for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.05, 0.4, 0.3), dark, 0, -1.2, 0.45);
  }
  if (level >= 2) part(h.head, boxGeo(1.25, 0.3, 0.12), shock ? zap : M(0xffab00), 0, 0.75, 0.66); // visor
  if (shock) {
    part(h.torso, boxGeo(1.4, 1.6, 0.6), podM, 0, 0, -0.8); // battery pack
    for (const x of [-0.4, 0.4]) part(h.torso, boxGeo(0.2, 1.3, 0.1), zap, x, 0, -1.12);
  }
  if (heavy) {
    for (const side of [-1, 1]) part(h.torso, boxGeo(0.9, 0.6, 1.3), podM, side * 1.35, 1.0, 0); // pauldrons
    part(h.torso, boxGeo(0.5, 0.5, 0.1), zap, 0, 0.35, 0.6);
    // Crackling arcs around the body
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      part(h.root, boxGeo(0.08, 0.9, 0.08), zap, Math.cos(a) * 1.9, 2.5 + (i % 2) * 1.4, Math.sin(a) * 1.9).rotation.set(0.6 * (i % 2 ? 1 : -1), a, 0.5);
    }
  }
  // Rifle for the pose
  const gun = holdLongGun(h, 2.0, dark);
  part(gun, boxGeo(0.3, 0.4, 0.5), dark, 0, -0.7, -0.3); // magazine
  h.muzzles = [];
  // Missile pods on the shoulders (right first, left from Lv 3)
  const tubesY = level >= 2 ? [-0.25, 0.25] : [0];
  const tubesX = level >= 2 ? [-0.25, 0.25] : [-0.2, 0.2];
  const sides = level >= 3 ? [-1, 1] : [-1];
  for (const side of sides) {
    const pod = new THREE.Group();
    pod.position.set(side * 1.25, 1.55, -0.1);
    pod.rotation.x = -0.15; // tilted slightly up
    h.torso.add(pod);
    const w = level >= 2 ? 1.0 : 0.85;
    part(pod, boxGeo(w, tubesY.length * 0.5 + 0.2, 1.8), podM, 0, 0, 0);
    part(pod, boxGeo(0.35, 0.45, 0.35), dark, -side * 0.2, -0.45, -0.3); // mount
    for (const x of tubesX) for (const y of tubesY) {
      part(pod, boxGeo(0.3, 0.3, 0.06), M(0x111111), x, y, 0.91);
      part(pod, boxGeo(0.18, 0.18, 0.12), shock ? zap : M(0xe53935), x, y, 0.92); // missile tips
      addMuzzle(h, pod, x, y, 1.0);
    }
    if (shock) part(pod, boxGeo(w + 0.06, 0.1, 0.4), zap, 0, 0, -0.5); // coil band
  }
  h.recoilScale = 0.4;
  h.tracer = shock ? 0x40c4ff : 0xff7043;
  h.projectile = { color: shock ? 0x40c4ff : 0xeceff1, size: 0.45 };
  return h;
}

/**
 * Marauder (water): a sleek raider boat with a razor launcher on the bow. Lv 1 twin exhausts,
 * Lv 2 ram spikes, Lv 3 a sonar dish, Lv 4 a big harpoon gun, Lv 5 a dark red armored boat.
 */
function marauder(level) {
  const u = makeThing();
  const { M } = u;
  const armored = level >= 5;
  const L = [4.6, 4.8, 5.0, 5.3, 5.6, 6.2][level];
  const W = armored ? 2.6 : 2.2;
  const hullC = M(armored ? 0x5d0a0a : 0x37474f);
  const trim = armored ? glowThing(u, 0xff1744) : M(0xc62828);
  const dark = M(armored ? 0x1a1a1a : 0x212121);
  const steel = M(0x90a4ae);
  // Low hull with a long, sharp bow
  part(u.body, boxGeo(W, 0.7, L), hullC, 0, 0.05, -0.4);
  part(u.body, boxGeo(W + 0.04, 0.15, L + 0.02), dark, 0, -0.25, -0.4);
  for (const side of [-1, 1]) part(u.body, boxGeo(W * 0.62, 0.7, 2.0), hullC, side * W * 0.22, 0.05, L / 2 + 0.3).rotation.y = side * 0.42;
  for (const side of [-1, 1]) part(u.body, boxGeo(0.06, 0.12, L * 0.85), trim, side * (W / 2 + 0.02), 0.3, -0.5); // racing stripes
  part(u.body, boxGeo(W - 0.3, 0.08, L - 0.4), M(0x424242), 0, 0.44, -0.4); // deck
  // Low swept cockpit
  part(u.body, boxGeo(W - 0.7, 0.7, 1.5), dark, 0, 0.8, -L / 2 + 0.9);
  part(u.body, boxGeo(W - 0.75, 0.35, 0.6), M(armored ? 0xff5252 : 0x4fc3f7), 0, 1.0, -L / 2 + 1.7).rotation.x = -0.6;
  // Engines at the stern
  for (const x of level >= 1 ? [-0.5, 0.5] : [0]) {
    part(u.body, boxGeo(0.6, 0.6, 0.7), dark, x, 0.6, -L / 2 - 0.4);
    if (level >= 1) part(u.body, boxGeo(0.35, 0.35, 0.1), glowThing(u, armored ? 0xff1744 : 0xff9100), x, 0.6, -L / 2 - 0.76);
  }
  // Weapon head on the bow
  const head = new THREE.Group();
  head.position.set(0, 0.5, L / 2 - 1.4);
  u.body.add(head);
  part(head, boxGeo(1.0, 0.3, 1.0), dark, 0, 0.15, 0);
  if (level >= 4) {
    // Big harpoon gun
    part(head, boxGeo(1.0, 0.7, 1.2), M(armored ? 0x3e0d0d : 0x455a64), 0, 0.65, -0.1);
    part(head, boxGeo(0.35, 0.35, 2.6), dark, 0, 0.75, 1.6);
    part(head, boxGeo(0.12, 0.12, 1.2), steel, 0, 0.75, 3.2); // harpoon shaft
    part(head, boxGeo(0.45, 0.2, 0.4), armored ? trim : steel, 0, 0.75, 3.8); // barbed head
    part(head, boxGeo(0.5, 0.5, 0.5), M(0x5d4037), 0.75, 0.55, -0.4); // rope spool
    addMuzzle(u, head, 0, 0.75, 4.0);
    u.flight = { color: armored ? 0xff1744 : 0xbdbdbd, size: 1, arc: 0.5, long: true };
  } else {
    // Razor launcher: a magazine of spinning saw discs and a short launch rail
    part(head, boxGeo(0.9, 0.55, 1.0), M(0x455a64), 0, 0.55, -0.1);
    part(head, boxGeo(0.7, 0.12, 1.4), dark, 0, 0.6, 0.9); // launch rail
    for (let i = 0; i < 2 + Math.min(level, 2); i++) part(head, cylGeo(0.42, 0.42, 0.06, 12), steel, 0, 0.88 + i * 0.1, -0.1); // disc stack
    part(head, cylGeo(0.4, 0.4, 0.05, 12), steel, 0, 0.7, 1.3); // loaded disc
    addMuzzle(u, head, 0, 0.7, 1.8);
    u.flight = { color: 0xcfd8dc, size: 0.8, arc: 0.15 };
  }
  if (level >= 2) {
    // Ram spikes on the bow
    for (const x of [-0.5, 0, 0.5]) part(u.body, boxGeo(0.14, 0.14, 0.8), steel, x, 0.15, L / 2 + 1.1 - Math.abs(x) * 0.8);
  }
  if (level >= 3) {
    // Sonar dish on a mast behind the cockpit
    part(u.body, boxGeo(0.12, 1.2, 0.12), dark, 0, 1.6, -L / 2 + 0.4);
    const dish = part(u.body, cylGeo(0.6, 0.2, 0.2, 12), M(0xeceff1), 0, 2.3, -L / 2 + 0.4);
    dish.rotation.x = 1.0;
    part(u.body, boxGeo(0.12, 0.12, 0.12), armored ? trim : glowThing(u, 0x76ff03), 0, 2.45, -L / 2 + 0.6);
  }
  if (armored) {
    // Armor plating with spikes along the sides
    for (const side of [-1, 1]) {
      part(u.body, boxGeo(0.2, 0.6, L - 1), dark, side * (W / 2 + 0.1), 0.2, -0.5);
      for (const z of [-1.6, -0.4, 0.8]) part(u.body, boxGeo(0.4, 0.15, 0.15), steel, side * (W / 2 + 0.3), 0.3, z);
    }
    part(u.body, boxGeo(W - 0.6, 0.12, 1.3), dark, 0, 1.2, -L / 2 + 0.9); // armored canopy
  }
  u.static = true;
  u.bob = 0.08;
  u.tracer = armored ? 0xff1744 : 0xb0bec5;
  return u;
}

/**
 * Orbit: a ground station with a big upward dish and a small satellite hovering high above it
 * (the satellite is a child ~12 units up). More solar panels each level; Lv 2 a control
 * building antenna, Lv 3 a second ring of panels on the satellite, Lv 4 a plasma beam emitter,
 * Lv 5 a glowing ring around the satellite and a plasma-lit dish.
 */
function orbit(level) {
  const u = makeThing();
  const { M } = u;
  const white = M(0xeceff1);
  const grey = M(0x90a4ae);
  const dark = M(0x263238);
  const plasma = glowThing(u, level >= 5 ? 0xe040fb : 0xce93d8);
  const panelM = M(0x1a237e);
  part(u.body, boxGeo(4.2, 0.3, 4.2), M(0x9e9e9e), 0, 0.15, 0); // pad
  // Control building
  part(u.body, boxGeo(1.6, 1.4, 1.2), white, -1.2, 1.0, -1.3);
  part(u.body, boxGeo(1.2, 0.3, 0.06), plasma, -1.2, 1.2, -0.68);
  // Big dish on a pedestal, pointing up
  part(u.body, boxGeo(0.9, 1.4, 0.9), grey, 0.4, 1.0, 0.2);
  const dish = new THREE.Group();
  dish.position.set(0.4, 1.9, 0.2);
  dish.rotation.x = -0.25;
  u.body.add(dish);
  const dr = 1.5 + level * 0.08;
  part(dish, cylGeo(dr, dr * 0.35, 0.6, 16), white, 0, 0.3, 0);
  part(dish, cylGeo(dr * 0.85, dr * 0.85, 0.05, 16), level >= 5 ? plasma : M(0xcfd8dc), 0, 0.6, 0);
  for (const a of [0, 2.1, 4.2]) part(dish, boxGeo(0.06, 1.4, 0.06), dark, Math.cos(a) * 0.6, 1.1, Math.sin(a) * 0.6).rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4);
  part(dish, boxGeo(0.3, 0.3, 0.3), plasma, 0, 1.8, 0); // feed horn
  // Ground solar panels: one more per level
  for (let i = 0; i < level; i++) {
    const x = -1.7 + (i % 3) * 0.75;
    const z = 1.0 + Math.floor(i / 3) * 0.8;
    part(u.body, boxGeo(0.08, 0.5, 0.08), dark, x, 0.5, z);
    part(u.body, boxGeo(0.65, 0.05, 0.6), panelM, x, 0.78, z).rotation.x = -0.4;
  }
  if (level >= 2) {
    part(u.body, boxGeo(0.1, 1.8, 0.1), dark, -1.7, 2.6, -1.5);
    part(u.body, boxGeo(0.2, 0.2, 0.2), glowThing(u, 0xff1744), -1.7, 3.55, -1.5);
  }
  // Satellite, high in the sky
  const sat = new THREE.Group();
  sat.position.set(0, 12, 0);
  u.body.add(sat);
  u.satellite = sat;
  part(sat, boxGeo(1.0, 1.0, 1.4), M(0xffd54f), 0, 0, 0); // gold foil body
  part(sat, boxGeo(0.6, 0.3, 0.6), white, 0, 0.65, 0);
  const wings = level >= 3 ? 2 : 1;
  for (const side of [-1, 1]) {
    part(sat, boxGeo(0.6, 0.08, 0.08), dark, side * 0.8, 0, 0);
    for (let k = 0; k < wings; k++) {
      part(sat, boxGeo(1.1, 0.06, 0.9 + level * 0.06), panelM, side * (1.65 + k * 1.2), 0, 0);
      part(sat, boxGeo(0.06, 0.07, 0.9 + level * 0.06), white, side * (1.1 + k * 1.2), 0, 0);
    }
  }
  // Emitter underneath, angled toward the front
  part(sat, cylGeo(0.25, 0.4, 0.5, 10), grey, 0, -0.7, 0.3);
  part(sat, boxGeo(0.3, 0.1, 0.3), plasma, 0, -0.97, 0.3);
  addMuzzle(u, sat, 0, -1.1, 0.3);
  if (level >= 4) {
    for (const x of [-0.35, 0.35]) {
      part(sat, boxGeo(0.2, 0.8, 0.2), dark, x, -0.6, 0.6);
      part(sat, boxGeo(0.22, 0.12, 0.22), plasma, x, -1.0, 0.6);
      addMuzzle(u, sat, x, -1.1, 0.6);
    }
  }
  if (level >= 5) {
    const ring = part(sat, cylGeo(2.0, 2.0, 0.08, 20), clearMat(u, 0xe040fb, 0.35), 0, 0, 0);
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = false;
    // Faint link beam from dish to satellite
    const beam = part(u.body, boxGeo(0.12, 8.5, 0.12), clearMat(u, 0xf3e5f5, 0.25), 0.4, 7.0, 0.2);
    beam.castShadow = false;
  }
  u.static = true;
  u.tracer = 0xe040fb;
  u.tracerWidth = level >= 4 ? 0.6 : 0.4;
  return u;
}

/**
 * Void Port: a dark purple station platform with rails and a glowing void portal arch. Lv 1
 * lamps, Lv 2 void crystals, Lv 3 a parked locomotive, Lv 4 a bigger arch with runes and a gun
 * wagon, Lv 5 a void-glowing train and a swirling portal.
 */
function voidPort(level) {
  const u = makeThing();
  const { M } = u;
  const stone = M(0x2a1a40);
  const dark = M(0x120020);
  const rune = glowThing(u, level >= 5 ? 0xd500f9 : 0xaa00ff);
  const railM = M(0x78909c);
  part(u.body, boxGeo(4.4, 0.3, 4.4), stone, 0, 0.15, 0); // base
  // Rails along Z with sleepers
  for (let i = 0; i < 7; i++) part(u.body, boxGeo(2.0, 0.12, 0.3), M(0x3e2723), 0.6, 0.36, -2.0 + i * 0.66);
  for (const x of [0.15, 1.05]) part(u.body, boxGeo(0.12, 0.12, 4.6), railM, x, 0.48, 0);
  // Platform on the left with a canopy
  part(u.body, boxGeo(1.4, 0.6, 3.8), dark, -1.4, 0.6, 0);
  part(u.body, boxGeo(1.42, 0.06, 3.82), rune, -1.4, 0.92, 0); // platform edge glow
  for (const z of [-1.4, 1.4]) part(u.body, boxGeo(0.15, 2.4, 0.15), dark, -1.8, 2.1, z);
  part(u.body, boxGeo(1.8, 0.2, 3.6), stone, -1.5, 3.3, 0).rotation.z = 0.12;
  // Portal arch over the rails at the back
  const ah = level >= 4 ? 4.2 : 3.4;
  const az = -1.8;
  for (const x of [-0.7, 1.9]) part(u.body, boxGeo(0.5, ah, 0.6), stone, x, 0.3 + ah / 2, az);
  part(u.body, boxGeo(3.1, 0.5, 0.6), stone, 0.6, 0.3 + ah, az);
  const veil = part(u.body, boxGeo(2.1, ah - 0.3, 0.08), clearMat(u, 0x7c4dff, level >= 5 ? 0.6 : 0.45), 0.6, 0.3 + (ah - 0.3) / 2, az);
  veil.castShadow = false;
  for (const x of [-0.45, 1.65]) part(u.body, boxGeo(0.06, ah - 0.4, 0.62), rune, x, 0.3 + ah / 2, az); // inner glow strips
  if (level >= 1) {
    for (const z of [-0.6, 1.6]) {
      part(u.body, boxGeo(0.1, 1.4, 0.1), dark, -0.8, 1.6, z);
      part(u.body, boxGeo(0.3, 0.3, 0.3), rune, -0.8, 2.4, z);
    }
  }
  if (level >= 2) {
    for (const [x, z, hgt] of [[-1.9, -2.0, 1.2], [2.0, 1.8, 1.0], [2.0, -0.6, 1.4]]) crystal(u.body, rune, x, 0.3, z, hgt, 0.35, 0.25, x);
  }
  if (level >= 4) {
    // Rune blocks on the arch and a crest
    part(u.body, boxGeo(0.6, 0.6, 0.2), rune, 0.6, 0.3 + ah + 0.55, az);
    for (const x of [-0.7, 1.9]) part(u.body, boxGeo(0.3, 0.6, 0.3), rune, x, 0.3 + ah + 0.5, az).rotation.y = Math.PI / 4;
  }
  if (level >= 5) {
    // Swirl ring in the portal
    const ring = part(u.body, cylGeo(1.1, 1.1, 0.1, 18), clearMat(u, 0xd500f9, 0.5), 0.6, 0.3 + ah / 2, az + 0.08);
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = false;
  }
  if (level >= 3) {
    // Parked train on the rails (half out of the portal)
    const loco = veh(level >= 5 ? 'vvoidloco' : 'vloco');
    parkUnit(u, loco, 0.4, 0.6, 0.45, level >= 4 ? 1.0 : 0.3);
    if (level >= 4) parkUnit(u, veh(level >= 5 ? 'vvoidgwagon' : 'vgunwagon'), 0.4, 0.6, 0.45, -1.4);
  }
  u.static = true;
  return u;
}

/**
 * Void King: a huge dark armored king with a two-handed void greatsword. Lv 1 a crimson cape,
 * Lv 2 spiked pauldrons and a glowing blade, Lv 3 a taller crown and a void core in the chest,
 * Lv 4 glowing void wings and an aura.
 */
function voidKing(level) {
  const ascended = level >= 4;
  const h = makeHumanoid({ skin: 0x212121, shirt: 0x111111, pants: 0x0b0b0b, arms: 0x1a1a1a, face: 'none' });
  const { M } = h;
  const crimson = glow(h, 0xff1744);
  const voidC = glow(h, 0xd500f9);
  const plate = M(0x1c1c1c);
  const edge = M(0x3a0a12);
  // Great helm with a glowing visor
  part(h.head, boxGeo(1.5, 1.5, 1.5), plate, 0, 0.65, 0);
  part(h.head, boxGeo(1.0, 0.14, 0.1), crimson, 0, 0.7, 0.76);
  part(h.head, boxGeo(0.12, 0.6, 0.1), crimson, 0, 0.4, 0.76);
  // Crown: black band with crimson spikes
  const crownH = level >= 3 ? 0.9 : 0.6;
  part(h.head, boxGeo(1.6, 0.3, 1.6), edge, 0, 1.45, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [0, -1], [1, 0], [-1, 0]]) {
    part(h.head, boxGeo(0.25, x === 0 && z === 1 ? crownH * 1.4 : crownH, 0.25), plate, x * 0.68, 1.6 + crownH / 2, z * 0.68);
  }
  part(h.head, boxGeo(0.3, 0.3, 0.08), crimson, 0, 1.45, 0.82); // crown gem
  // Armor: breastplate, belt, greaves
  part(h.torso, boxGeo(2.2, 1.8, 1.2), plate, 0, 0.15, 0);
  part(h.torso, boxGeo(2.25, 0.35, 1.25), edge, 0, -0.85, 0);
  for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.1, 1.0, 1.1), plate, 0, -1.4, 0.05);
  if (level >= 1) part(h.torso, boxGeo(2.3, 3.6 + level * 0.2, 0.12), M(0x7f0000), 0, -0.8, -0.65); // crimson cape
  if (level >= 2) {
    for (const side of [-1, 1]) {
      part(h.torso, boxGeo(1.0, 0.7, 1.4), plate, side * 1.4, 1.1, 0);
      part(h.torso, boxGeo(0.22, 0.8, 0.22), crimson, side * 1.6, 1.7, 0).rotation.z = side * -0.5; // spikes
      part(h.torso, boxGeo(0.22, 0.6, 0.22), plate, side * 1.4, 1.65, -0.4).rotation.z = side * -0.3;
    }
  }
  if (level >= 3) {
    part(h.torso, boxGeo(0.6, 0.6, 0.1), voidC, 0, 0.35, 0.62); // void core
    for (const x of [-0.6, 0.6]) part(h.torso, boxGeo(0.1, 1.2, 0.1), crimson, x, 0.15, 0.62);
  }
  if (ascended) {
    // Glowing void wings and an aura
    for (const side of [-1, 1]) {
      const w = part(h.torso, boxGeo(0.2, 2.6, 2.8), voidC, side * 1.0, 0.8, -1.4);
      w.rotation.set(0.25, side * 0.6, side * 0.45);
      const tip = part(h.torso, boxGeo(0.18, 1.8, 2.0), crimson, side * 2.0, 1.9, -1.9);
      tip.rotation.set(0.35, side * 0.9, side * 0.75);
    }
    const aura = part(h.root, cylGeo(3.0, 3.0, 0.06, 20), clearMat(h, 0xff1744, 0.3), 0, 0.05, 0);
    aura.castShadow = false;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      part(h.root, boxGeo(0.4, 0.4, 0.4), voidC, Math.cos(a) * 2.6, 3.5 + (i % 2) * 1.5, Math.sin(a) * 2.6).rotation.set(a, a, 0);
    }
  }
  // Two-handed greatsword
  const sword = inHand(h);
  const bl = [3.0, 3.4, 3.8, 4.2, 4.8][level];
  const bw = 0.5 + level * 0.06;
  part(sword, boxGeo(0.28, 1.0, 0.28), M(0x0b0b0b), 0, 0.1, 0); // long grip
  part(sword, boxGeo(0.4, 0.4, 0.4), crimson, 0, 0.7, 0); // pommel
  part(sword, boxGeo(1.4 + level * 0.15, 0.22, 0.32), edge, 0, -0.45, 0); // crossguard
  for (const side of [-1, 1]) part(sword, boxGeo(0.2, 0.45, 0.3), crimson, side * (0.75 + level * 0.075), -0.35, 0);
  part(sword, boxGeo(bw, bl, 0.14), level >= 2 ? M(0x1a1a1a) : M(0x424242), 0, -0.6 - bl / 2, 0);
  part(sword, boxGeo(0.12, bl * 0.9, 0.16), level >= 2 ? voidC : crimson, 0, -0.6 - bl / 2, 0); // fuller glow
  setMuzzle(h, sword, 0, -0.6 - bl, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.35);
  h.leftArm.rotation.set(-2.3, 0, -0.55); // both hands on the hilt
  h.pose = { right: -2.4, left: -2.3, leftRecoil: 0 };
  h.swing = 2;
  h.melee = true;
  h.tracer = ascended ? 0xd500f9 : 0xff1744;
  h.body.scale.setScalar(1.25 + level * 0.06);
  return h;
}

export const TOWER_MODELS_C = { glacier, enforcementBase, planeswalker, submerge, shockCommando, marauder, orbit, voidPort, voidKing };

// ================================================================== units

/** Enforcement Base enforcer: a navy uniform, cap and pistol. */
function makeEnforcerSoldier(heavy) {
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: heavy ? 0x1a237e : 0x283593, pants: 0x111827, arms: heavy ? 0x1a237e : 0x283593, face: 'soldier' });
  const { M } = h;
  if (heavy) {
    helmet(h, 0x0d1440, false);
    part(h.head, boxGeo(1.3, 0.4, 0.12), M(0x90caf9), 0, 0.75, 0.68); // visor
    part(h.torso, boxGeo(2.2, 1.7, 1.2), M(0x212121), 0, 0.1, 0); // armored vest
    part(h.torso, boxGeo(1.2, 0.3, 0.05), M(0xfdd835), 0, 0.5, 0.62); // vest label
    const gun = holdLongGun(h, 1.8, M(0x2b2b2b));
    part(gun, boxGeo(0.35, 0.6, 0.5), M(0x5d4037), 0, -0.6, 0.05); // pump
    h.tracer = 0xffcc80;
    h.size = 1.1;
  } else {
    part(h.head, boxGeo(1.35, 0.3, 1.35), M(0x1a237e), 0, 1.3, 0); // cap
    part(h.head, boxGeo(1.35, 0.1, 0.5), M(0x111111), 0, 1.15, 0.65); // visor
    part(h.head, boxGeo(0.3, 0.25, 0.05), M(0xfdd835), 0, 1.35, 0.68); // cap badge
    part(h.torso, boxGeo(0.35, 0.4, 0.05), M(0xfdd835), 0.55, 0.5, 0.52); // chest badge
    part(h.torso, boxGeo(2.1, 0.25, 1.1), M(0x111111), 0, -0.85, 0); // duty belt
    const muzzle = addPistol(h, h.rightArm, false);
    h.muzzles = [muzzle];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.2, 0, -0.5);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.2, leftRecoil: 0.2 };
    h.tracer = 0xffd54f;
  }
  return h;
}

const ebenforcer = (count = 1) => squad(count, () => makeEnforcerSoldier(false));
const ebenforcerm = (count = 1) => squad(count, () => makeEnforcerSoldier(true));

// The Turret Truck, the APM-Bot and Void Port's carts and trains are built with the vehicle kit
// (moreunits.js, botunits.js, trainunits.js); makeUnit finds them through VEHICLE_UNITS.
const veh = (model) => VEHICLE_UNITS[model](model);

export const UNIT_MODELS_C = { ebenforcer, ebenforcerm };
