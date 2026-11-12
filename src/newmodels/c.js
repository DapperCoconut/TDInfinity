import * as THREE from 'three';
import {
  boxGeo,
  part,
  makeHumanoid,
  makeThing,
  glow,
  helmet,
  holdLongGun,
  setMuzzle,
  cylGeo,
  clearMat,
  addPistol,
  wheels,
  inHand,
} from '../models.js';

// Only call the imported helpers inside functions: models.js imports this file (circular import).

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

// ================================================================== towers

export const TOWER_MODELS_C = {};

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

export const UNIT_MODELS_C = { ebenforcer, ebenforcerm };
