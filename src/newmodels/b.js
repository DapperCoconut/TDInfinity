import * as THREE from 'three';
import { boxGeo, part, makeHumanoid, makeThing, glow, glowThing, helmet, holdLongGun, setMuzzle, gunMuzzle } from '../models.js';

// New towers and units (batch B): Spark, Raider, Plunder, Spectre (Buccaneer, Broadcaster, Stasis,
// Glowup: models/machines5.js; Trawler: models/machines4.js); Cutlass and Corsair pirate squads. Only call imported helpers inside functions
// (models.js imports this file).

// ---------------------------------------------------------------- Spark

// ---------------------------------------------------------------- Raider

// ---------------------------------------------------------------- Plunder

// ---------------------------------------------------------------- Spectre

// ---------------------------------------------------------------- Units

function pirate(shirt, bandana) {
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: 0x3e2723, arms: 0xd2a679, face: 'soldier' });
  for (const y of [-0.6, 0.2]) part(h.torso, boxGeo(2.04, 0.25, 1.04), h.M(0x1a237e), 0, y, 0);
  part(h.torso, boxGeo(2.05, 0.3, 1.05), h.M(0x4e342e), 0, -0.85, 0); // belt
  if (bandana) {
    part(h.head, boxGeo(1.3, 0.45, 1.3), h.M(bandana), 0, 1.15, 0);
    part(h.head, boxGeo(0.3, 0.5, 0.3), h.M(bandana), 0.3, 0.9, -0.75);
  }
  return h;
}

/** Cutlass pirate (melee squad member): red bandana, a curved sword raised to swing. */
function makeCutlassPirate() {
  const h = pirate(0xfafafa, 0xc62828);
  const { M } = h;
  part(h.head, boxGeo(0.36, 0.32, 0.08), M(0x111111), 0.28, 0.72, 0.64); // eyepatch
  const sword = new THREE.Group();
  sword.position.set(0, -1.9, 0);
  h.rightArm.add(sword);
  part(sword, boxGeo(0.5, 0.15, 0.5), M(0xc9a227), 0, 0, 0); // guard
  part(sword, boxGeo(0.12, 1.4, 0.3), M(0xcfd8dc), 0, -0.75, 0.05);
  const tip = part(sword, boxGeo(0.12, 0.6, 0.3), M(0xcfd8dc), 0, -1.65, 0.2);
  tip.rotation.x = 0.4;
  setMuzzle(h, sword, 0, -1.9, 0.3);
  h.rightArm.rotation.set(-2.4, 0, 0.1);
  h.pose = { right: -2.4, left: 0, leftRecoil: 0 };
  h.swing = 2;
  h.melee = true;
  return h;
}

/** Corsair (shooting squad member): tricorn hat and a long musket. */
function makeCorsairPirate() {
  const h = pirate(0x8e1b1b, null);
  const { M } = h;
  const hat = M(0x1a1a1a);
  part(h.head, boxGeo(1.3, 0.5, 1.3), hat, 0, 1.4, 0);
  part(h.head, boxGeo(1.9, 0.38, 0.2), hat, 0, 1.35, -0.7);
  for (const side of [-1, 1]) part(h.head, boxGeo(0.2, 0.38, 1.86), hat, side * 0.475, 1.35, 0.1).rotation.y = -side * 0.536;
  const gun = holdLongGun(h, 2.4, M(0x5d4037));
  part(gun, boxGeo(0.2, 1.6, 0.2), M(0x616161), 0, -1.6, 0.12); // barrel
  part(gun, boxGeo(0.3, 0.6, 0.45), M(0x4e342e), 0, 0.25, -0.05); // stock
  h.muzzles[0].position.z = 0.12;
  return h;
}

/** A squad of pirates, shaped like makeUnit's squads. */
function pirateSquad(make, count, tracer) {
  const u = makeThing();
  u.wheels = [];
  u.soldiers = [];
  for (let i = 0; i < count; i++) {
    const h = make();
    h.root.scale.setScalar(0.6);
    h.root.position.set(count === 1 ? 0 : (i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.soldiers.push(h);
    u.muzzles.push(h.muzzles[0]);
  }
  u.height = 3.5;
  u.tracer = tracer;
  return u;
}

const cutlass = (count = 1) => pirateSquad(makeCutlassPirate, count, 0xeceff1);
const corsair = (count = 1) => {
  const u = pirateSquad(makeCorsairPirate, count, 0xffab40);
  u.projectile = { color: 0x424242, size: 0.35 };
  return u;
};

export const TOWER_MODELS_B = {};
export const UNIT_MODELS_B = { cutlass, corsair };
