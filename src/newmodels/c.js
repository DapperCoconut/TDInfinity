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

export const TOWER_MODELS_C = { planeswalker, shockCommando, orbit, voidPort, voidKing };

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
