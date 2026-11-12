import * as THREE from 'three';
import {
  boxGeo, part, makeHumanoid, makeThing, glow, glowThing, holdLongGun, setMuzzle, gunMuzzle, wheels, present, boxRow,
} from '../models.js';

// New towers and units (set D). Every helper from models.js is only called inside functions
// (models.js imports this file, so the imports are not ready at module load time).

/* ------------------------------------------------------------------ helpers */

/** A see-through material that keeps its see-through look (setOpacity respects keepOpacity). */
function iceMat(u, color, op = 0.8) {
  const m = u.M(color);
  m.transparent = true;
  m.opacity = op;
  m.depthWrite = false;
  m.userData.keepOpacity = op;
  return m;
}

/** Humanoid units as a squad (same layout as makeUnit's squads). */
function squad(u, count, mk) {
  u.soldiers = [];
  for (let i = 0; i < count; i++) {
    const h = mk(i);
    h.root.scale.setScalar(0.6 * (h.size ?? 1));
    h.root.position.set(count === 1 ? 0 : (i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.soldiers.push(h);
    u.muzzles.push(h.muzzles[0]);
  }
  const h0 = u.soldiers[0];
  u.height = 3.5 * (h0.size ?? 1);
  u.tracer = h0.tracer;
  if (h0.projectile) u.projectile = h0.projectile;
  return u;
}

function newUnit() {
  const u = makeThing();
  u.wheels = [];
  return u;
}

/* ------------------------------------------------------------------ towers */

/* ------------------------------------------------------------------ flying units */

// The Jet Trooper's planes and the Borealis frost planes are built with the vehicle kit (airunits.js).

function jpara(count = 1) {
  // Paratroopers: soldiers in jump gear with a packed chute and a rifle.
  const u = newUnit();
  return squad(u, count, () => {
    const h = makeHumanoid({ skin: 0xe0ac69, shirt: 0x556b2f, pants: 0x4b5a30, arms: 0x556b2f, face: 'soldier' });
    const { M } = h;
    part(h.head, boxGeo(1.45, 0.6, 1.45), M(0x4b5320), 0, 1.3, 0);
    part(h.head, boxGeo(1.3, 0.1, 0.1), M(0x212121), 0, 1.0, 0.66); // chin strap line
    part(h.torso, boxGeo(1.7, 1.6, 0.8), M(0x8d7b5a), 0, 0.1, -0.9); // chute pack
    part(h.torso, boxGeo(1.75, 0.2, 0.85), M(0x3e2723), 0, 0.5, -0.9);
    for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.2, 2.0, 0.1), M(0x3e2723), x, 0, 0.52); // harness
    holdLongGun(h, 1.8, M(0x2b2b2b));
    h.tracer = 0xffc107;
    return h;
  });
}

/* ------------------------------------------------------------------ punk units */

function punk(shirt, hair) {
  const h = makeHumanoid({ skin: 0xf1c27d, shirt, pants: 0x263238, arms: shirt });
  const { M } = h;
  for (let i = 0; i < 4; i++) part(h.head, boxGeo(0.22, 0.6, 0.3), M(hair), 0, 1.45, 0.45 - i * 0.32); // mohawk
  for (const x of [-1, 1]) part(h.torso, boxGeo(0.15, 0.3, 0.15), M(0xcfd8dc), x * 0.8, 1.1, 0); // spikes
  for (const leg of [h.leftLeg, h.rightLeg]) part(leg, boxGeo(1.1, 0.6, 1.15), M(0x111111), 0, -1.7, 0.05);
  return h;
}

function pfragger(count = 1) {
  const u = newUnit();
  return squad(u, count, () => {
    const h = punk(0x1a1a1a, 0x76ff03);
    const { M } = h;
    part(h.torso, boxGeo(2.1, 0.25, 1.1), M(0x4e5b31), 0, 0.3, 0).rotation.z = 0.5; // grenade bandolier
    const hand = new THREE.Group();
    hand.position.set(0, -2.2, 0);
    h.rightArm.add(hand);
    part(hand, boxGeo(0.55, 0.65, 0.55), M(0x33691e), 0, -0.2, 0);
    part(hand, boxGeo(0.15, 0.2, 0.15), glow(h, 0xff3d00), 0, 0.2, 0);
    setMuzzle(h, hand, 0, -0.3, 0);
    h.rightArm.rotation.set(-2.6, 0, 0.2);
    h.tracer = 0xffab40;
    h.projectile = { color: 0x33691e, size: 0.45, arc: 4 };
    return h;
  });
}

function pboogie(count = 1) {
  // Boogeyman: a tall shadowy figure in a ragged cloak with long claws and glowing eyes.
  const u = newUnit();
  return squad(u, count, () => {
    const h = makeHumanoid({ skin: 0x1a1a24, shirt: 0x12121a, pants: 0x12121a, arms: 0x12121a, face: 'void' });
    const { M } = h;
    h.size = 1.25;
    part(h.torso, boxGeo(2.3, 3.4, 1.3), M(0x1c1028), 0, -0.6, -0.05); // cloak
    for (const x of [-0.9, -0.3, 0.3, 0.9]) part(h.torso, boxGeo(0.4, 0.5, 1.3), M(0x1c1028), x, -2.5 + (x > 0 ? 0.2 : 0), -0.05); // ragged hem
    part(h.head, boxGeo(1.5, 1.5, 1.5), M(0x1c1028), 0, 0.75, -0.15); // hood
    for (const x of [-0.25, 0.25]) part(h.head, boxGeo(0.25, 0.15, 0.08), glow(h, 0xd500f9), x, 0.7, 0.62);
    for (const arm of [h.leftArm, h.rightArm]) for (const x of [-0.3, 0, 0.3]) part(arm, boxGeo(0.12, 0.8, 0.12), M(0x9e9e9e), x, -2.3, 0.3); // claws
    const m = new THREE.Object3D();
    m.position.set(0, -2.5, 0.3);
    h.rightArm.add(m);
    h.muzzles = [m];
    h.rightArm.rotation.set(-1.2, 0, 0.2);
    h.leftArm.rotation.set(-1.0, 0, -0.2);
    h.tracer = 0xd500f9;
    return h;
  });
}

function procketeer(count = 1) {
  const u = newUnit();
  return squad(u, count, () => {
    const h = punk(0x4a148c, 0xff4081);
    const { M } = h;
    // Shoulder rocket launcher
    const tube = new THREE.Group();
    tube.position.set(-1.5, 1.3, 0);
    h.torso.add(tube);
    part(tube, boxGeo(0.6, 0.6, 2.6), M(0x33691e), 0, 0, 0.2);
    part(tube, boxGeo(0.7, 0.7, 0.2), M(0x212121), 0, 0, 1.5);
    part(tube, boxGeo(0.35, 0.35, 0.1), glow(h, 0xff3d00), 0, 0, 1.6);
    part(tube, boxGeo(0.3, 0.4, 0.3), M(0x212121), 0, -0.45, 0.3);
    const m = new THREE.Object3D();
    m.position.set(0, 0, 1.7);
    tube.add(m);
    h.muzzles = [m];
    h.rightArm.rotation.set(-1.4, 0, 0);
    h.tracer = 0xff6d00;
    h.projectile = { color: 0x33691e, size: 0.4 };
    return h;
  });
}

function pnucleus(count = 1) {
  // Nucleus: a huge brute in a cracked hazmat suit with a glowing reactor in his chest.
  const u = newUnit();
  return squad(u, count, () => {
    const h = makeHumanoid({ skin: 0x9ccc65, shirt: 0xfdd835, pants: 0x827717, arms: 0x9ccc65, face: 'zombie' });
    const { M } = h;
    h.size = 1.8;
    const nuke = glow(h, 0x76ff03);
    part(h.torso, boxGeo(2.5, 2.3, 1.4), M(0xfbc02d), 0, 0.1, 0); // bulky suit
    part(h.torso, boxGeo(1.0, 1.0, 0.2), nuke, 0, 0.3, 0.75); // reactor core
    part(h.torso, boxGeo(0.4, 0.4, 0.1), M(0x212121), 0, 0.3, 0.87);
    for (const x of [-1, 1]) part(h.torso, boxGeo(0.9, 0.6, 1.5), M(0x424242), x * 1.4, 1.0, 0); // shoulder plates
    for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.5, 1.4, 0.5), nuke, x, 0.4, -0.95); // fuel rods
    part(h.head, boxGeo(0.9, 0.3, 0.1), nuke, 0, 0.75, 0.62); // glowing eyes band
    for (const arm of [h.leftArm, h.rightArm]) part(arm, boxGeo(1.3, 0.9, 1.3), M(0x424242), 0, -1.7, 0); // huge fists
    const m = new THREE.Object3D();
    m.position.set(0, -2.3, 0.2);
    h.rightArm.add(m);
    h.muzzles = [m];
    h.rightArm.rotation.set(-0.8, 0, 0.1);
    h.tracer = 0x76ff03;
    return h;
  });
}

/* ------------------------------------------------------------------ Borealis units */

function bsleigh() {
  // Sleigh: a flying red-and-gold sleigh pulled by two blocky reindeer, gift pile on the back.
  const u = newUnit();
  const { M } = u;
  const g = u.body;
  const red = M(0xc62828);
  const gold = M(0xffc107);
  part(g, boxGeo(2.2, 1.2, 3.2), red, 0, 0.6, -1.0);
  part(g, boxGeo(2.2, 1.0, 0.6), red, 0, 1.0, 0.7); // curled front
  part(g, boxGeo(2.3, 0.15, 3.3), gold, 0, 1.25, -1.0);
  for (const x of [-1.0, 1.0]) {
    part(g, boxGeo(0.15, 0.15, 4.0), glowThing(u, 0x80d8ff), x, -0.2, -0.6); // glowing runners
    part(g, boxGeo(0.15, 0.5, 0.15), gold, x, 0.1, 1.2);
  }
  part(g, boxGeo(1.6, 0.8, 1.2), M(0x1b5e20), 0, 1.6, -1.6); // gift pile
  part(g, boxGeo(0.7, 0.7, 0.7), M(0x1e88e5), -0.4, 2.2, -1.4);
  part(g, boxGeo(0.6, 0.6, 0.6), M(0xffd740), 0.45, 2.1, -1.8);
  // Reindeer
  for (const x of [-0.7, 0.7]) {
    const b = M(0x795548);
    part(g, boxGeo(0.7, 0.8, 1.8), b, x, 0.8, 3.0);
    for (const dz of [-0.6, 0.6]) part(g, boxGeo(0.2, 0.7, 0.2), b, x, 0.1, 3.0 + dz);
    part(g, boxGeo(0.5, 0.5, 0.7), b, x, 1.4, 4.0);
    part(g, boxGeo(0.18, 0.18, 0.1), glowThing(u, 0xff1744), x, 1.35, 4.38); // red nose
    part(g, boxGeo(0.6, 0.5, 0.08), M(0xd7ccc8), x, 1.9, 3.9); // antlers
    part(g, boxGeo(0.06, 0.06, 1.6), gold, x, 0.9, 1.6); // reins
  }
  gunMuzzle(u, g, 0, 1.0, 1.1);
  u.height = 2.6;
  u.fly = 9;
  u.noTurn = true; // aircraft fly straight on; they don't swing round to shoot (views.js)
  u.tracer = 0xffd740;
  u.projectile = { color: 0xc62828, size: 0.5 };
  return u;
}

function bfortress() {
  // Ice Fortress: a floating castle of ice on a hover base, with crystal cannons.
  const u = newUnit();
  const { M } = u;
  const g = u.body;
  const ice = iceMat(u, 0x81d4fa, 0.9);
  const wall = M(0xb3e5fc);
  const aurora = glowThing(u, 0x69f0ae);
  const violet = glowThing(u, 0xb388ff);
  part(g, boxGeo(5, 1.2, 5), ice, 0, 0, 0); // floating base
  part(g, boxGeo(3.4, 1.0, 3.4), ice, 0, -1.0, 0);
  part(g, boxGeo(1.6, 1.0, 1.6), violet, 0, -1.8, 0); // hover crystal
  part(g, boxGeo(4.4, 1.6, 4.4), wall, 0, 1.4, 0);
  for (const [x, z] of [[-2.1, -2.1], [2.1, -2.1], [-2.1, 2.1], [2.1, 2.1]]) {
    part(g, boxGeo(1.1, 3.2, 1.1), wall, x, 2.0, z);
    part(g, boxGeo(1.3, 0.3, 1.3), M(0xe1f5fe), x, 3.7, z);
    part(g, boxGeo(0.4, 0.4, 0.4), aurora, x, 4.1, z);
  }
  part(g, boxGeo(2.2, 2.6, 2.2), wall, 0, 3.4, 0); // keep
  part(g, boxGeo(0.8, 2.4, 0.8), violet, 0, 5.8, 0).rotation.y = Math.PI / 4;
  part(g, boxGeo(4.5, 0.2, 0.1), aurora, 0, 1.6, 2.21);
  // Crystal cannons on the front
  for (const x of [-1.1, 1.1]) {
    part(g, boxGeo(0.5, 0.5, 1.8), M(0x0288d1), x, 1.4, 2.8);
    part(g, boxGeo(0.35, 0.35, 0.2), aurora, x, 1.4, 3.75);
    gunMuzzle(u, g, x, 1.4, 3.9);
  }
  u.height = 6;
  u.fly = 12;
  u.noTurn = true; // aircraft fly straight on; they don't swing round to shoot (views.js)
  u.tracer = 0x69f0ae;
  u.tracerWidth = 0.35;
  return u;
}

/* ------------------------------------------------------------------ exports */

export const TOWER_MODELS_D = {};

export const UNIT_MODELS_D = {
  jpara,
  pfragger,
  pboogie,
  procketeer,
  pnucleus,
  bsleigh,
  bfortress,
};
