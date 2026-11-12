import * as THREE from 'three';
import { boxGeo, part, makeHumanoid, makeThing, glow, helmet, setMuzzle, gunMuzzle, turret } from '../models.js';
import { wheel } from '../vehicles.js';

// New towers and units (set A). Characters face +Z; see makeHumanoid in models.js for proportions.

/** A gun group held in a hand, pointing along the arm (-Y local). */
function handGroup(arm) {
  const g = new THREE.Group();
  g.position.set(0, -1.9, 0);
  arm.add(g);
  return g;
}

/** An assault rifle in `arm`'s hand. Returns { gun, muzzle }. */
function rifle(h, arm, len, body, { stock = 0x3e2723, scope = false } = {}) {
  const { M } = h;
  const gun = handGroup(arm);
  part(gun, boxGeo(0.32, len, 0.42), body, 0, -len / 2, 0);
  part(gun, boxGeo(0.25, 0.45, 0.55), body, 0, -0.55, -0.42); // magazine
  part(gun, boxGeo(0.25, 0.5, 0.35), M(stock), 0, 0.15, -0.05); // stock
  part(gun, boxGeo(0.2, 0.3, 0.2), body, 0, -len + 0.25, 0.3); // front sight
  if (scope) part(gun, boxGeo(0.26, 0.7, 0.3), M(0x111111), 0, -0.7, 0.35);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -len, 0);
  gun.add(muzzle);
  return { gun, muzzle };
}

// ---------------------------------------------------------------------------------------------
// Rockety: a retro rocket trooper with a shoulder launcher.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Samurai
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Hired Gun
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Ducks (the duck units; the Ducky Nest building is in models/machines4.js)
// ---------------------------------------------------------------------------------------------

/**
 * A blocky duck facing +Z, built onto `parent`. Returns { head, leftLeg, rightLeg, wing } handles.
 * About 3.5 tall at s = 1.
 */
function duckShape(parent, M, { body = 0xffd600, wing = 0xfbc02d, beak = 0xff8f00, legs = true } = {}, s = 1) {
  const bodyM = M(body);
  const beakM = M(beak);
  const g = new THREE.Group();
  g.scale.setScalar(s);
  parent.add(g);
  part(g, boxGeo(1.6, 1.3, 2.0), bodyM, 0, 1.55, -0.1);
  part(g, boxGeo(1.0, 0.6, 0.5), bodyM, 0, 2.0, -1.3); // tail
  const wingM = M(wing);
  for (const x of [-0.85, 0.85]) part(g, boxGeo(0.15, 0.8, 1.3), wingM, x, 1.6, -0.2);
  const head = new THREE.Group();
  head.position.set(0, 2.2, 0.55);
  g.add(head);
  part(head, boxGeo(1.1, 1.1, 1.1), bodyM, 0, 0.55, 0);
  part(head, boxGeo(0.7, 0.25, 0.6), beakM, 0, 0.4, 0.8);
  const eye = M(0x111111);
  for (const x of [-0.3, 0.3]) part(head, boxGeo(0.15, 0.2, 0.05), eye, x, 0.75, 0.56);
  let leftLeg = null;
  let rightLeg = null;
  if (legs) {
    const leg = (x) => {
      const p = new THREE.Group();
      p.position.set(x, 0.9, 0);
      g.add(p);
      part(p, boxGeo(0.2, 0.8, 0.2), beakM, 0, -0.4, 0);
      part(p, boxGeo(0.5, 0.1, 0.6), beakM, 0, -0.85, 0.15);
      return p;
    };
    rightLeg = leg(-0.4);
    leftLeg = leg(0.4);
  }
  return { g, head, leftLeg, rightLeg };
}

// ---------------------------------------------------------------------------------------------
// Outlaw: female gunslinger with ghostly hands
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Liberator: dual assault rifles, red/white/blue
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Ruptor: heavy burst-cannon gunner
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------------------------

/** One duck soldier (squad member). Returns a humanoid-like handle with root, legs, mats, muzzles. */
function makeDuck(model) {
  const d = makeThing();
  const { M } = d;
  const shape = duckShape(d.body, M);
  const { head } = shape;
  d.leftLeg = shape.leftLeg;
  d.rightLeg = shape.rightLeg;
  d.muzzles = [];
  const dark = M(0x262626);
  // Weapon group held under the right wing, pointing forward (+Z)
  const w = new THREE.Group();
  w.position.set(-0.95, 1.5, 0.4);
  shape.g.add(w);
  const muzzleAt = (x, y, z) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    w.add(m);
    d.muzzles.push(m);
  };
  d.size = 1;
  if (model === 'duckscout') {
    part(head, boxGeo(1.15, 0.3, 1.15), M(0x558b2f), 0, 1.2, 0); // scout cap
    part(head, boxGeo(1.0, 0.1, 0.5), M(0x33691e), 0, 1.1, 0.75);
    part(w, boxGeo(0.2, 0.3, 0.7), dark, 0, 0, 0.3); // pistol
    muzzleAt(0, 0, 0.7);
    d.tracer = 0xffe066;
  } else if (model === 'ducksoldier') {
    const hm = M(0x556b2f);
    part(head, boxGeo(1.25, 0.45, 1.25), hm, 0, 1.25, 0);
    part(head, boxGeo(1.3, 0.1, 0.4), hm, 0, 1.05, 0.65);
    part(shape.g, boxGeo(1.65, 0.8, 0.6), M(0x4b5320), 0, 1.7, -1.1); // tiny backpack
    part(w, boxGeo(0.2, 0.25, 1.4), dark, 0, 0, 0.5); // tiny rifle
    part(w, boxGeo(0.15, 0.3, 0.2), dark, 0, -0.25, 0.4);
    muzzleAt(0, 0, 1.2);
    d.tracer = 0xffc107;
  } else if (model === 'duckrail') {
    const cyan = glow(d, 0x18ffff);
    part(head, boxGeo(1.15, 0.25, 0.1), cyan, 0, 0.75, 0.58); // visor
    part(head, boxGeo(1.15, 0.3, 1.15), M(0x263238), 0, 1.2, 0);
    part(w, boxGeo(0.35, 0.35, 2.8), M(0x263238), 0, 0.1, 0.9);
    for (const x of [-0.2, 0.2]) part(w, boxGeo(0.08, 0.08, 2.4), cyan, x, 0.1, 1.0);
    part(w, boxGeo(0.45, 0.45, 0.15), cyan, 0, 0.1, 2.3);
    muzzleAt(0, 0.1, 2.4);
    d.tracer = 0x18ffff;
    d.size = 1.1;
  } else if (model === 'duckglad') {
    const bronze = M(0xc9a227);
    part(head, boxGeo(1.25, 0.6, 1.25), bronze, 0, 1.2, 0); // helmet
    part(head, boxGeo(0.2, 0.5, 1.1), M(0xc62828), 0, 1.7, -0.1); // crest
    part(shape.g, boxGeo(0.15, 1.1, 1.1), bronze, 0.95, 1.6, 0.2); // round-ish shield
    part(shape.g, boxGeo(0.18, 0.3, 0.3), M(0x8d6e63), 1.03, 1.6, 0.2);
    w.rotation.x = -0.5; // sword tilted up
    part(w, boxGeo(0.2, 0.2, 0.35), M(0x5d4037), 0, 0, 0); // hilt
    part(w, boxGeo(0.5, 0.1, 0.1), bronze, 0, 0, 0.2); // guard
    part(w, boxGeo(0.12, 0.25, 1.4), M(0xe0e0e0), 0, 0, 0.95); // blade
    muzzleAt(0, 0, 1.65);
    d.tracer = 0xffffff;
    d.size = 1.1;
  } else if (model === 'duckeng') {
    const hat = M(0xff8f00);
    part(head, boxGeo(1.2, 0.4, 1.2), hat, 0, 1.2, 0); // hard hat
    part(head, boxGeo(1.35, 0.1, 1.35), hat, 0, 1.02, 0.05);
    part(shape.g, boxGeo(1.7, 0.25, 2.1), M(0x5d4037), 0, 1.2, -0.1); // tool belt
    const steel = M(0x9e9e9e);
    part(w, boxGeo(0.15, 0.15, 1.0), steel, 0, 0, 0.4); // wrench handle
    part(w, boxGeo(0.15, 0.4, 0.2), steel, 0, 0.1, 0.95);
    part(w, boxGeo(0.15, 0.15, 0.2), steel, 0, 0.25, 1.05);
    muzzleAt(0, 0.1, 1.1);
    d.tracer = 0xffd54f;
  } else {
    muzzleAt(0, 0, 0.5);
    d.tracer = 0xffe066;
  }
  return d;
}

/** A squad of `count` ducks, laid out like makeUnit lays out soldiers. */
function duckSquad(model, count) {
  const u = makeThing();
  u.static = false;
  u.wheels = [];
  u.soldiers = [];
  for (let i = 0; i < count; i++) {
    const d = makeDuck(model);
    d.root.scale.setScalar(0.75 * d.size);
    d.root.position.set(count === 1 ? 0 : (i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
    u.body.add(d.root);
    u.mats.push(...d.mats);
    u.soldiers.push(d);
    u.muzzles.push(d.muzzles[0]);
  }
  u.height = 2.8 * (u.soldiers[0]?.size ?? 1);
  u.tracer = u.soldiers[0]?.tracer ?? 0xffe066;
  return u;
}

/** A big wooden duck on wheels. */
function ducktrojan() {
  const u = makeThing();
  u.static = false;
  u.wheels = [];
  const { M } = u;
  const wood = M(0xa1887f);
  const plank = M(0x795548);
  part(u.body, boxGeo(3.0, 0.4, 4.4), plank, 0, 0.95, 0); // cart
  // Round wooden cart wheels on two axles (vehicle kit)
  for (const z of [-1.5, 1.5]) {
    part(u.body, boxGeo(3.3, 0.16, 0.16), M(0x3e2723), 0, 0.65, z);
    for (const x of [-1.72, 1.72]) wheel(u, u.body, x, 0.65, z, 0.65, 0.34, { tyre: 0x4e342e, rim: 0x8d6e63, lugs: false });
  }
  part(u.body, boxGeo(2.6, 2.2, 3.4), wood, 0, 2.25, -0.2); // body
  for (const y of [1.6, 2.3, 3.0]) part(u.body, boxGeo(2.62, 0.08, 3.42), plank, 0, y, -0.2); // plank seams
  part(u.body, boxGeo(1.6, 1.0, 0.8), wood, 0, 3.0, -2.2); // tail
  for (const x of [-1.35, 1.35]) part(u.body, boxGeo(0.15, 1.3, 2.2), plank, x, 2.4, -0.3); // wings
  part(u.body, boxGeo(1.0, 1.6, 1.0), wood, 0, 3.9, 1.1); // neck
  part(u.body, boxGeo(1.7, 1.7, 1.7), wood, 0, 5.2, 1.3); // head
  part(u.body, boxGeo(1.1, 0.4, 1.0), M(0xbf6a2b), 0, 4.95, 2.6); // beak
  for (const x of [-0.5, 0.5]) part(u.body, boxGeo(0.25, 0.3, 0.05), M(0x111111), x, 5.5, 2.17);
  part(u.body, boxGeo(0.7, 0.6, 0.06), M(0x3e2723), 0, 2.3, 1.52); // hatch
  gunMuzzle(u, u.body, 0, 4.95, 3.15);
  u.height = 6.2;
  u.tracer = 0xffd54f;
  return u;
}

/** A stationary duck-themed gun sentry: tripod, yellow housing with a duck face and a barrel. */
function ducksentry() {
  const u = makeThing();
  u.static = false;
  u.wheels = [];
  const { M } = u;
  const dark = M(0x37474f);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = part(u.body, boxGeo(0.2, 1.4, 0.2), dark, Math.sin(a) * 0.6, 0.6, Math.cos(a) * 0.6);
    leg.rotation.set(Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4);
  }
  part(u.body, boxGeo(0.6, 0.4, 0.6), dark, 0, 1.4, 0);
  const t = turret(u, 1.6);
  const yellow = M(0xffd600);
  part(t, boxGeo(1.4, 1.1, 1.4), yellow, 0, 0.55, 0);
  part(t, boxGeo(0.8, 0.25, 0.5), M(0xff8f00), 0, 0.45, 0.9); // beak
  for (const x of [-0.3, 0.3]) part(t, boxGeo(0.18, 0.22, 0.05), M(0x111111), x, 0.8, 0.71);
  part(t, boxGeo(1.0, 0.3, 0.3), yellow, 0, 0.9, -0.85); // tail
  part(t, boxGeo(0.25, 0.25, 1.4), M(0x212121), 0, 0.2, 1.2); // barrel under the beak
  gunMuzzle(u, t, 0, 0.2, 1.9);
  u.height = 3.0;
  u.tracer = 0xffc107;
  return u;
}

export const TOWER_MODELS_A = {
};

export const UNIT_MODELS_A = {
  duckscout: (count = 1) => duckSquad('duckscout', count),
  ducksoldier: (count = 1) => duckSquad('ducksoldier', count),
  duckrail: (count = 1) => duckSquad('duckrail', count),
  ducktrojan: () => ducktrojan(),
  duckglad: (count = 1) => duckSquad('duckglad', count),
  duckeng: (count = 1) => duckSquad('duckeng', count),
  ducksentry: () => ducksentry(),
};
