// Summoned units: the soldiers, goons, skeletons and vehicles that towers send down the path.
// makeUnit(kind) picks the right one. Newer vehicles are built in ../vehicleunits.js and friends.

import * as THREE from 'three';
import { UNIT_MODELS_A } from '../newmodels/a.js';
import { UNIT_MODELS_B } from '../newmodels/b.js';
import { UNIT_MODELS_C } from '../newmodels/c.js';
import { UNIT_MODELS_D } from '../newmodels/d.js';
import { UNIT_MODELS_E } from '../newmodels/e.js';
import { UNIT_MODELS_F } from '../newmodels/f.js';
import { UNIT_MODELS_G } from '../newmodels/g.js';
import { UNIT_MODELS_H } from '../newmodels/h.js';
import { UNIT_MODELS_I } from '../newmodels/i.js';
import { axle, wheel } from '../vehicles.js';
import { VEHICLE_UNITS } from '../vehicleunits.js';
import { UNDEAD_MODELS, makeUndeadUnit } from './undead.js';
import { SUMMON_MODELS } from './summons.js';
import { boxGeo, makeHumanoid, part, setOpacity } from './kit.js';
import {
  addHalo, addPistol, addTommyGun, addWings, boxRow, fedora, glow, glowThing, goldify, gunMuzzle, helmet, holdLongGun,
  inHand, makeThing, present, setMuzzle, suit, turret,
} from './bits.js';

export function wheels(u, mat, xs, zs, y = 0.55, size = 1.1) {
  // Round wheels (vehicles.js): one spinning axle per pair, or single wheels when xs isn't a pair.
  const r = size / 2;
  const w = Math.min(0.6, size * 0.5);
  const hex = mat?.color?.getHex();
  const o = hex != null && (mat.userData.glow || hex > 0x303030) ? { tyre: hex } : undefined; // coloured tyres stay coloured
  const pair = xs.length === 2 && Math.abs(xs[0] + xs[1]) < 1e-6;
  for (const z of zs) {
    if (pair) axle(u, u.body, Math.abs(xs[0]), y, z, r, w, o);
    else for (const x of xs) wheel(u, u.body, x, y, z, r, w, o);
  }
}

/** A small soldier for squads. Look depends on the Barracks level. */
export function makeTrooper(model) {
  const look = {
    squad: { shirt: 0x6b7d3a, pants: 0x4b5320, helm: 0x556b2f },
    specops: { shirt: 0x263238, pants: 0x1c2429, helm: 0x212121, goggles: 0x76ff03 },
    legion: { shirt: 0x5d4037, pants: 0x3e2723, helm: 0x8d6e63, goggles: 0xffab40 },
    fortress: { shirt: 0x1a237e, pants: 0x0d1440, helm: 0x3949ab, goggles: 0x00e5ff, armor: true },
  }[model];
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: look.shirt, pants: look.pants, arms: look.shirt, face: 'soldier' });
  helmet(h, look.helm);
  if (look.goggles) part(h.head, boxGeo(1.1, 0.3, 0.15), glow(h, look.goggles), 0, 1.0, 0.68);
  if (look.armor) part(h.torso, boxGeo(2.2, 1.8, 1.2), h.M(0x3949ab), 0, 0.05, 0);
  holdLongGun(h, 1.5, h.M(0x262626));
  return h;
}

/**
 * A Field Barracks soldier: bscout / bscout2 / bscout3 (Scout, Rifleman, Assault Scout), bspec
 * (Spec Ops), brail (Rail Trooper), bm202 (M202 Trooper), briot (Rioter), bflame (Flamethrower).
 */
export function makeFieldSoldier(model) {
  const look = {
    bscout: { shirt: 0x8d9a5b, pants: 0x5d6b3a, helm: 0x6b7d3a },
    bscout2: { shirt: 0x6b7d3a, pants: 0x4b5320, helm: 0x556b2f },
    bscout3: { shirt: 0x7a6a4f, pants: 0x4e4231, helm: 0x5d4f3a, goggles: 0xffab40 },
    bspec: { shirt: 0x263238, pants: 0x1c2429, helm: 0x111111, goggles: 0x76ff03 },
    brail: { shirt: 0x37474f, pants: 0x263238, helm: 0xeceff1, goggles: 0x00e5ff, armor: 0x546e7a },
    bm202: { shirt: 0x6d5d3f, pants: 0x4e4231, helm: 0x5d4f3a },
    briot: { shirt: 0x1c2429, pants: 0x111111, helm: 0x212121 },
    bflame: { shirt: 0x5d4037, pants: 0x3e2723, helm: 0x424242, goggles: 0xff6d00, armor: 0x6d4c41 },
  }[model];
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: look.shirt, pants: look.pants, arms: look.shirt, face: 'soldier' });
  const { M } = h;
  helmet(h, look.helm, model !== 'briot');
  if (look.goggles) part(h.head, boxGeo(1.1, 0.3, 0.15), glow(h, look.goggles), 0, 1.0, 0.68);
  if (look.armor) part(h.torso, boxGeo(2.2, 1.8, 1.2), M(look.armor), 0, 0.05, 0);
  h.tracer = 0xffc107;
  if (model === 'briot') {
    // Rioter: visor, body armor and a big riot shield it shoves zombies with, plus a pistol
    part(h.head, boxGeo(1.25, 0.5, 0.1), M(0x80deea), 0, 0.7, 0.65);
    part(h.torso, boxGeo(2.2, 1.8, 1.2), M(0x37474f), 0, 0.05, 0);
    part(h.leftArm, boxGeo(0.15, 2.6, 2.0), M(0x90a4ae), 0.3, -1.6, 0.2);
    holdLongGun(h, 0.6, M(0x212121));
    h.leftArm.rotation.set(-0.8, 0, 0);
    h.size = 1.15;
  } else if (model === 'bm202') {
    // M202 Trooper: a boxy four-tube rocket launcher on the shoulder
    const gun = holdLongGun(h, 1.4, M(0x4b5320));
    for (const [x, z] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) part(gun, boxGeo(0.2, 0.08, 0.2), M(0x111111), x, -1.42, z);
    h.projectile = { color: 0xff6d00, size: 0.35, arc: 1.5 };
  } else if (model === 'bflame') {
    // Flamethrower: fuel tanks on the back and a nozzle with a pilot light
    for (const x of [-0.45, 0.45]) part(h.torso, boxGeo(0.6, 1.6, 0.6), M(0xc62828), x, 0.1, -0.95);
    holdLongGun(h, 1.3, M(0x424242));
    part(h.rightArm, boxGeo(0.2, 0.2, 0.2), glow(h, 0xff9100), 0, -3.25, 0);
    h.size = 1.1;
  } else if (model === 'brail') {
    // Rail Trooper: a long rail rifle with glowing coils
    const gun = holdLongGun(h, 2.0, M(0x263238));
    for (const y of [-0.6, -1.1, -1.6]) part(gun, boxGeo(0.4, 0.12, 0.5), glow(h, 0x00e5ff), 0, y, 0);
    h.tracer = 0x00e5ff;
    h.size = 1.15;
  } else holdLongGun(h, model === 'bspec' ? 1.7 : 1.5, M(model === 'bspec' ? 0x111111 : 0x262626));
  return h;
}

const GOONS = ['pistolgoon', 'tommygoon', 'dongoon', 'mgoon', 'mgoon2', 'mgoon3', 'agent', 'agent2', 'agent3'];

/**
 * Unit models, facing +Z. Returns { root, body, mats, turret?, muzzles, wheels, legs?, soldiers?, height }.
 * model: jeep, gunjeep, tank, humvee, humvee2, humvee3, lav25, railtank, m1, m2, m11, stryker, apc, missileapc,
 * afhumvee, afhumveetow, afhumveemissile, bradley, mrap, abrams, m1x, a squad (squad, specops, legion,
 * fortress) with `count` soldiers, or a Crook Boss goon (pistolgoon, tommygoon, dongoon).
 */
export function makeUnit(model, count = 1) {
  if (VEHICLE_UNITS[model]) return VEHICLE_UNITS[model](model); // the mechanical summons: jeeps, trucks, tanks, mechs, trains (vehicleunits.js)
  if (UNDEAD_MODELS.includes(model)) return makeUndeadUnit(model); // Graveyard undead (undead.js)
  if (SUMMON_MODELS[model]) return SUMMON_MODELS[model](count); // kit-built humanoid summons (summons.js)
  const extra = UNIT_MODELS_A[model] ?? UNIT_MODELS_B[model] ?? UNIT_MODELS_C[model] ?? UNIT_MODELS_D[model] ?? UNIT_MODELS_E[model] ?? UNIT_MODELS_F[model] ?? UNIT_MODELS_G[model] ?? UNIT_MODELS_H[model] ?? UNIT_MODELS_I[model]; // wave 7-10 units
  if (extra) {
    const m = extra(count);
    if (model === 'chaosBall') m.bounce = m.body; // Chaos Jester's ball bounces along (views.js)
    return m;
  }
  if (model.startsWith('gold')) return goldify(makeUnit(model.slice(4), count)); // Golden Crook Boss goons
  const u = makeThing();
  u.wheels = [];
  const { M } = u;
  const goon = GOONS.includes(model);
  const merc = /^m(rifle|gren|riot|medic)\d*$/.test(model);
  const skel = model.startsWith('skel');
  const camp = model.startsWith('elf') || model.startsWith('plant') || model === 'iceturret' || model === 'iceshard' || model === 'bubblebuddy'; // Elf Camp / Biologist / Elementalist / Bubble Blower
  const field = /^b(scout\d?|spec|rail|m202|riot|flame)$/.test(model);
  const relic = model.startsWith('relic'); // Relic units
  if (field) {
    u.soldiers = [];
    for (let i = 0; i < count; i++) {
      const h = makeFieldSoldier(model);
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
  if (goon || merc || skel || camp || relic || ['squad', 'specops', 'legion', 'fortress'].includes(model)) {
    u.soldiers = [];
    for (let i = 0; i < count; i++) {
      const h = goon ? makeGoon(model) : merc ? makeMerc(model) : skel ? makeSkeleton(model) : camp ? makeCampUnit(model) : relic ? makeRelicUnit(model) : makeTrooper(model);
      h.root.scale.setScalar(0.6 * (h.size ?? 1));
      h.root.position.set((i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
      u.body.add(h.root);
      u.mats.push(...h.mats);
      u.soldiers.push(h);
      u.muzzles.push(h.muzzles[0]);
    }
    u.height = 3.5 * (u.soldiers[0].size ?? 1);
    if (relic) {
      u.soldiers[0].root.position.set(0, 0, 0);
      u.tracer = u.soldiers[0].tracer;
      if (model === 'relicseraph') u.fly = 5; // Seraphs float over the zombies
      return u;
    }
    if (camp) {
      // One elf or plant, standing on the spot (not off to the side like a squad member).
      u.soldiers[0].root.position.set(0, 0, 0);
      u.tracer = u.soldiers[0].tracer;
      u.projectile = u.soldiers[0].projectile;
      if (model === 'elfgift') u.fly = 7; // Gift Bombers fly over the path
      return u;
    }
    if (skel) {
      u.tracer = u.soldiers[0].tracer;
      return u;
    }
    u.tracer = model === 'fortress' || model === 'mrifle3' ? 0x00e5ff : model.startsWith('mriot') ? 0xb0bec5 : 0xffc107;
    if (merc) u.projectile = u.soldiers[0].projectile;
    return u;
  }
  if (model === 'goo' || model === 'biggoo') {
    // Goo Gunner puddle Goos: a wobbly green blob with two eyes (Big Goos are bigger).
    const s = model === 'biggoo' ? 1.6 : 1;
    const gooM = glowThing(u, 0x64dd17);
    part(u.body, boxGeo(1.6 * s, 1.1 * s, 1.6 * s), gooM, 0, 0.55 * s, 0);
    part(u.body, boxGeo(1.1 * s, 0.5 * s, 1.1 * s), gooM, 0, 1.3 * s, 0);
    for (const x of [-0.3, 0.3]) part(u.body, boxGeo(0.25 * s, 0.3 * s, 0.1), M(0x1b1b1b), x * s, 1.0 * s, 0.81 * s);
    gunMuzzle(u, u.body, 0, 0.8 * s, 0.8 * s);
    u.height = 1.8 * s;
    u.tracer = 0x76ff03;
    return u;
  }
  if (model === 'voidneuron' || model === 'voidempress') {
    // Void Traitor summons: one void creature on foot.
    const h = makeVoidSoldier(model);
    h.root.scale.setScalar(0.6 * h.size);
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.soldiers = [h];
    u.muzzles.push(h.muzzles[0]);
    u.height = 3.5 * h.size;
    u.tracer = h.tracer;
    return u;
  }
  if (model === 'voidtank') return makeVoidTank(u);
  const tire = M(0x1b1b1b);
  if (model === 'jeep' || model === 'gunjeep') {
    const paint = M(0x6b8e23);
    part(u.body, boxGeo(2.6, 1.0, 4.4), paint, 0, 1.2, 0);
    part(u.body, boxGeo(2.4, 0.9, 1.6), paint, 0, 2.1, -0.6); // cabin
    part(u.body, boxGeo(2.3, 0.7, 0.1), M(0x90caf9), 0, 2.1, 0.25); // windshield
    part(u.body, boxGeo(2.8, 0.4, 0.4), M(0x9e9e9e), 0, 1.0, 2.3); // spiked bumper
    for (const x of [-1, -0.33, 0.33, 1]) part(u.body, boxGeo(0.15, 0.15, 0.5), M(0xbdbdbd), x, 1.0, 2.7);
    part(u.body, boxGeo(0.5, 0.25, 0.1), M(0xfff59d), -0.8, 1.4, 2.21);
    part(u.body, boxGeo(0.5, 0.25, 0.1), M(0xfff59d), 0.8, 1.4, 2.21);
    wheels(u, tire, [-1.35, 1.35], [-1.4, 1.4]);
    if (model === 'gunjeep') {
      const t = turret(u, 2.6, -0.8);
      part(t, boxGeo(0.9, 0.6, 0.9), M(0x37474f), 0, 0.3, 0);
      part(t, boxGeo(0.25, 0.25, 1.8), M(0x212121), 0, 0.45, 0.9);
      gunMuzzle(u, t, 0, 0.45, 1.8);
    } else gunMuzzle(u, u.body, 0, 1.2, 2.4);
    u.height = 3.2;
    u.tracer = 0xffd54f;
  } else if (model === 'tank') {
    const paint = M(0x556b2f);
    part(u.body, boxGeo(3.4, 1.3, 5.2), paint, 0, 1.2, 0);
    for (const x of [-1.8, 1.8]) part(u.body, boxGeo(0.8, 1.2, 5.4), tire, x, 0.7, 0); // tracks
    const t = turret(u, 2.3);
    part(t, boxGeo(2.4, 1.0, 2.6), M(0x4b5a2a), 0, 0.5, -0.2);
    part(t, boxGeo(0.45, 0.45, 3.2), M(0x3a4520), 0, 0.55, 2.4); // cannon
    part(t, boxGeo(0.2, 0.2, 1.2), M(0x212121), 0.8, 1.2, 0.6); // machine gun
    u.cannon = gunMuzzle(u, t, 0, 0.55, 4.0);
    u.muzzles.pop(); // the cannon muzzle is separate from the gun muzzle
    gunMuzzle(u, t, 0.8, 1.2, 1.2);
    u.height = 3.8;
    u.tracer = 0xffab40;
  } else if (model === 'humvee' || model === 'humvee2' || model === 'humvee3') {
    // Military Base Humvees: wide, boxy, desert tan. Humvee 2+ gets armor plates, Humvee 3 a gun turret.
    const paint = M(0xc2a878);
    const armored = model !== 'humvee';
    part(u.body, boxGeo(3.0, 1.1, 4.8), paint, 0, 1.25, 0);
    part(u.body, boxGeo(2.8, 1.0, 2.2), paint, 0, 2.3, -0.5); // cabin
    part(u.body, boxGeo(2.6, 0.6, 0.1), M(0x90caf9), 0, 2.4, 0.62); // windshield
    part(u.body, boxGeo(3.1, 0.5, 0.5), M(0x5d4037), 0, 1.05, 2.5); // push bar
    part(u.body, boxGeo(0.5, 0.25, 0.1), M(0xfff59d), -0.9, 1.5, 2.41);
    part(u.body, boxGeo(0.5, 0.25, 0.1), M(0xfff59d), 0.9, 1.5, 2.41);
    if (armored) {
      const plate = M(0x8d7b5a);
      for (const x of [-1.55, 1.55]) part(u.body, boxGeo(0.12, 0.9, 3.6), plate, x, 1.5, -0.2);
      part(u.body, boxGeo(2.8, 0.15, 1.2), plate, 0, 1.85, 1.6); // hood plate
    }
    wheels(u, tire, [-1.5, 1.5], [-1.6, 1.6], 0.6, 1.2);
    if (model === 'humvee3') {
      const t = turret(u, 2.8, -0.6);
      part(t, boxGeo(1.4, 0.5, 1.4), M(0x6d5f45), 0, 0.25, 0); // ring
      part(t, boxGeo(1.2, 0.8, 0.12), M(0x6d5f45), 0, 0.7, 0.6); // gun shield
      part(t, boxGeo(0.25, 0.25, 1.9), M(0x212121), 0, 0.75, 1.1);
      gunMuzzle(u, t, 0, 0.75, 2.05);
    } else gunMuzzle(u, u.body, 0, 1.2, 2.8);
    u.height = 3.4;
    u.tracer = 0xffd54f;
  } else if (model === 'railtank') {
    // Railgun Tank: a dark heavy tank with a long glowing rail cannon and a coaxial gun.
    const paint = M(0x37474f);
    const rail = glow(u, 0x40c4ff);
    part(u.body, boxGeo(3.8, 1.4, 5.8), paint, 0, 1.3, 0);
    for (const x of [-2.0, 2.0]) part(u.body, boxGeo(0.9, 1.3, 6.0), tire, x, 0.7, 0); // tracks
    part(u.body, boxGeo(3.4, 0.4, 0.6), rail, 0, 1.4, 2.95); // glowing front strip
    const t = turret(u, 2.5);
    part(t, boxGeo(2.8, 1.1, 3.0), M(0x263238), 0, 0.55, -0.3);
    for (const x of [-0.35, 0.35]) part(t, boxGeo(0.22, 0.5, 4.4), M(0x455a64), x, 0.6, 2.8); // twin rails
    part(t, boxGeo(0.3, 0.3, 4.2), rail, 0, 0.6, 2.8); // charge between the rails
    u.cannon = gunMuzzle(u, t, 0, 0.6, 5.0);
    u.muzzles.pop();
    part(t, boxGeo(0.25, 0.25, 1.4), M(0x212121), 1.0, 1.3, 0.7);
    gunMuzzle(u, t, 1.0, 1.3, 1.4);
    part(t, boxGeo(0.25, 0.25, 1.4), M(0x212121), -1.0, 1.3, 0.7);
    gunMuzzle(u, t, -1.0, 1.3, 1.4);
    u.height = 4.2;
    u.tracer = 0x40c4ff;
  } else if (model === 'apc' || model === 'missileapc') {
    // Support Caravan APCs: eight-wheeled, sand colored. The Missile APC carries a launcher box.
    const paint = M(0xa1886b);
    part(u.body, boxGeo(3.0, 1.5, 5.8), paint, 0, 1.6, 0);
    part(u.body, boxGeo(3.0, 0.6, 1.2), paint, 0, 1.2, 3.1); // sloped nose
    part(u.body, boxGeo(2.4, 0.4, 0.1), M(0x90caf9), 0, 2.0, 2.95); // vision slit
    wheels(u, tire, [-1.55, 1.55], [-2.1, -0.7, 0.7, 2.1], 0.6, 1.2);
    const t = turret(u, 2.4, -0.4);
    part(t, boxGeo(1.3, 0.6, 1.3), M(0x7d6a52), 0, 0.3, 0);
    part(t, boxGeo(0.25, 0.25, 1.9), M(0x212121), 0, 0.45, 1.0);
    gunMuzzle(u, t, 0, 0.45, 2.0);
    if (model === 'missileapc') {
      const pod = part(t, boxGeo(1.6, 1.0, 2.0), M(0x5d4f3c), 0, 1.2, -0.4);
      for (const x of [-0.4, 0.4]) for (const y of [-0.2, 0.2]) part(pod, boxGeo(0.3, 0.3, 0.06), M(0xd84315), x, y, 1.02);
      u.cannon = gunMuzzle(u, t, 0, 1.2, 0.7);
      u.muzzles.pop(); // the missile pod fires separately from the gun
    }
    u.height = model === 'missileapc' ? 4.6 : 4;
    u.tracer = 0xffd54f;
  } else if (model === 'lav25') {
    // Operator X-Captain LAV-25: an eight-wheeled armored car, dark green, with a chain gun turret.
    const paint = M(0x4b5a36);
    part(u.body, boxGeo(3.1, 1.6, 6.0), paint, 0, 1.7, 0);
    part(u.body, boxGeo(3.1, 0.7, 1.4), paint, 0, 1.3, 3.2); // sloped nose
    part(u.body, boxGeo(2.6, 0.12, 0.1), M(0x90caf9), 0, 2.2, 3.05); // vision slit
    for (const x of [-1.6, 1.6]) part(u.body, boxGeo(0.12, 1.0, 5.0), M(0x3d4a2c), x, 1.9, 0); // side armor
    wheels(u, tire, [-1.6, 1.6], [-2.2, -0.75, 0.75, 2.2], 0.6, 1.2);
    const t = turret(u, 2.5, -0.3);
    part(t, boxGeo(2.0, 0.8, 1.8), M(0x3d4a2c), 0, 0.4, 0);
    part(t, boxGeo(0.3, 0.3, 2.6), M(0x212121), 0, 0.5, 1.9); // 25mm chain gun
    part(t, boxGeo(0.4, 0.4, 0.4), M(0x37474f), 0.8, 1.0, -0.3); // smoke launchers
    gunMuzzle(u, t, 0, 0.5, 3.2);
    u.height = 4.3;
    u.tracer = 0xffab40;
  } else if (model === 'stryker') {
    const paint = M(0x8d8f6a);
    part(u.body, boxGeo(3.0, 1.6, 5.6), paint, 0, 1.6, 0);
    part(u.body, boxGeo(3.0, 0.6, 1.4), paint, 0, 1.3, 3.0); // sloped nose
    wheels(u, tire, [-1.55, 1.55], [-2.1, -0.7, 0.7, 2.1], 0.6, 1.2);
    const t = turret(u, 2.4, -0.5);
    part(t, boxGeo(1.2, 0.7, 1.2), M(0x6b6d4a), 0, 0.35, 0);
    part(t, boxGeo(0.25, 0.25, 1.8), M(0x212121), 0, 0.45, 1.0);
    gunMuzzle(u, t, 0, 0.45, 1.9);
    u.height = 4;
    u.tracer = 0xffd54f;
  } else if (model.startsWith('afhumvee')) {
    // Armored Factory Humvees: dark green. afhumvee has a .50 cal, afhumveetow a TOW tube,
    // afhumveemissile a boxy missile turret.
    const paint = M(0x4e5b31);
    part(u.body, boxGeo(3.0, 1.1, 4.8), paint, 0, 1.25, 0);
    part(u.body, boxGeo(2.8, 1.0, 2.2), paint, 0, 2.3, -0.5); // cabin
    part(u.body, boxGeo(2.6, 0.6, 0.1), M(0x90caf9), 0, 2.4, 0.62); // windshield
    part(u.body, boxGeo(3.1, 0.5, 0.5), M(0x263238), 0, 1.05, 2.5); // push bar
    part(u.body, boxGeo(0.5, 0.25, 0.1), M(0xfff59d), -0.9, 1.5, 2.41);
    part(u.body, boxGeo(0.5, 0.25, 0.1), M(0xfff59d), 0.9, 1.5, 2.41);
    for (const x of [-1.55, 1.55]) part(u.body, boxGeo(0.12, 0.9, 3.6), M(0x3b4626), x, 1.5, -0.2); // side armor
    wheels(u, tire, [-1.5, 1.5], [-1.6, 1.6], 0.6, 1.2);
    const t = turret(u, 2.8, -0.6);
    part(t, boxGeo(1.4, 0.5, 1.4), M(0x3b4626), 0, 0.25, 0); // ring
    if (model === 'afhumvee') {
      part(t, boxGeo(1.2, 0.8, 0.12), M(0x3b4626), 0, 0.7, 0.6); // gun shield
      part(t, boxGeo(0.3, 0.3, 2.1), M(0x212121), 0, 0.75, 1.2); // .50 cal
      gunMuzzle(u, t, 0, 0.75, 2.25);
    } else if (model === 'afhumveetow') {
      part(t, boxGeo(0.5, 0.5, 2.6), M(0x5d6b3a), 0, 0.85, 0.6); // TOW tube
      part(t, boxGeo(0.35, 0.35, 0.06), M(0xd84315), 0, 0.85, 1.92);
      part(t, boxGeo(0.4, 0.3, 0.4), M(0x212121), 0.45, 0.9, 0.2); // sight
      u.cannon = gunMuzzle(u, t, 0, 0.85, 2.0);
    } else {
      const pod = part(t, boxGeo(1.8, 1.0, 1.6), M(0x37474f), 0, 1.0, 0); // missile turret
      for (const x of [-0.5, 0, 0.5]) for (const y of [-0.22, 0.22]) part(pod, boxGeo(0.3, 0.3, 0.06), M(0xd84315), x, y, 0.82);
      part(t, boxGeo(0.25, 0.6, 0.25), M(0x212121), 0, 1.75, -0.4); // radar mast
      part(t, boxGeo(0.9, 0.4, 0.08), M(0x90a4ae), 0, 2.1, -0.4);
      u.cannon = gunMuzzle(u, t, 0, 1.0, 0.9);
    }
    u.height = 3.8;
    u.tracer = 0xffd54f;
  } else if (model === 'bradley') {
    // M2 Bradley: a tracked IFV with a sloped front, a 25mm autocannon and a TOW box on the turret side.
    const paint = M(0x5b6640);
    part(u.body, boxGeo(3.4, 1.6, 5.6), paint, 0, 1.5, -0.1);
    part(u.body, boxGeo(3.4, 0.8, 1.2), paint, 0, 1.1, 3.0); // sloped nose
    for (const x of [-1.85, 1.85]) part(u.body, boxGeo(0.8, 1.2, 6.0), tire, x, 0.65, 0); // tracks
    for (const x of [-2.25, 2.25]) part(u.body, boxGeo(0.1, 0.9, 5.4), M(0x4a5434), x, 1.3, 0); // side skirts
    const t = turret(u, 2.6, -0.3);
    part(t, boxGeo(2.2, 0.9, 2.2), M(0x4a5434), 0, 0.45, 0);
    part(t, boxGeo(0.25, 0.25, 2.6), M(0x212121), -0.3, 0.5, 2.3); // 25mm
    gunMuzzle(u, t, -0.3, 0.5, 3.6);
    const tow = part(t, boxGeo(0.8, 0.7, 1.4), M(0x3b4626), 1.4, 0.7, 0.1); // TOW box
    part(tow, boxGeo(0.3, 0.3, 0.06), M(0xd84315), -0.15, 0, 0.72);
    part(tow, boxGeo(0.3, 0.3, 0.06), M(0xd84315), 0.15, 0, 0.72);
    u.cannon = gunMuzzle(u, t, 1.4, 0.7, 0.9);
    u.muzzles.pop();
    u.height = 4.0;
    u.tracer = 0xffab40;
  } else if (model === 'mrap') {
    // MRAP: tall, V-hulled, six big wheels, an autocannon on a remote turret.
    const paint = M(0xb59b6d);
    part(u.body, boxGeo(3.2, 1.2, 6.0), M(0x8d7b5a), 0, 1.4, 0); // V hull
    part(u.body, boxGeo(3.2, 1.8, 3.6), paint, 0, 2.9, -0.8); // crew box
    part(u.body, boxGeo(3.2, 1.2, 2.2), paint, 0, 2.6, 2.0); // engine
    part(u.body, boxGeo(2.6, 0.7, 0.1), M(0x90caf9), 0, 3.2, 1.02); // windshield
    part(u.body, boxGeo(3.4, 0.6, 0.4), M(0x424242), 0, 1.6, 3.15); // bumper
    wheels(u, tire, [-1.7, 1.7], [-2.0, 0, 2.0], 0.75, 1.5);
    const t = turret(u, 3.8, -1.0);
    part(t, boxGeo(1.3, 0.7, 1.3), M(0x6d5f45), 0, 0.35, 0);
    part(t, boxGeo(0.35, 0.35, 2.2), M(0x212121), 0, 0.45, 1.3); // autocannon
    gunMuzzle(u, t, 0, 0.45, 2.4);
    u.height = 5.0;
    u.tracer = 0xff9100;
  } else if (/^(behemoth\d?|mammoth|laserbehemoth\d?|walker\d?|warmachine\d?)$/.test(model)) {
    makeHeavyUnit(u, model, tire);
  } else if (model === 'abrams' || model === 'm1x') {
    // M1 Abrams: a long, flat, angular tank. M1X is darker, bigger, with a longer cannon and glowing trim.
    const x2 = model === 'm1x';
    const s = x2 ? 1.15 : 1;
    const paint = M(x2 ? 0x2e3b2a : 0xc8b58a);
    const dark = M(x2 ? 0x1f2a1c : 0xa8956b);
    part(u.body, boxGeo(3.8 * s, 1.2, 6.4 * s), paint, 0, 1.3, 0);
    part(u.body, boxGeo(3.8 * s, 0.6, 1.0), paint, 0, 1.0, 3.4 * s); // glacis
    for (const x of [-2.0, 2.0]) part(u.body, boxGeo(0.9, 1.2, 6.6 * s), tire, x * s, 0.65, 0); // tracks
    for (const x of [-2.5, 2.5]) part(u.body, boxGeo(0.1, 0.8, 6.0 * s), dark, x * s, 1.25, 0); // skirts
    const t = turret(u, 2.4, -0.4);
    part(t, boxGeo(3.0 * s, 0.9, 3.4 * s), dark, 0, 0.45, 0);
    part(t, boxGeo(2.2 * s, 0.5, 0.9), dark, 0, 0.45, 2.0 * s); // wedge front
    const len = x2 ? 5.2 : 4.2;
    part(t, boxGeo(0.4, 0.4, len), M(0x37474f), 0, 0.5, 1.7 + len / 2); // main gun
    if (x2) part(t, boxGeo(3.0 * s + 0.1, 0.15, 0.15), glow(u, 0x76ff03), 0, 0.6, 1.75 * s);
    u.cannon = gunMuzzle(u, t, 0, 0.5, 1.8 + len);
    u.muzzles.pop();
    part(t, boxGeo(0.2, 0.2, 1.3), M(0x212121), 0.9, 1.15, 0.6); // loader's MG
    gunMuzzle(u, t, 0.9, 1.15, 1.3);
    u.height = 4.0;
    u.tracer = x2 ? 0x76ff03 : 0xffab40;
  } else {
    // Zed vehicles: m1 is a tracked tank-bot, m2 and m11 are walking mechs.
    const mech = model !== 'm1';
    const big = model === 'm11';
    const paint = M(big ? 0x212121 : mech ? 0x546e7a : 0x6d4c41);
    const trim = big ? glow(u, 0xff1744) : glow(u, 0xffc400);
    let hipY = 1.3;
    if (mech) {
      u.legs = [];
      hipY = big ? 4.2 : 3.4;
      for (const x of [-1.3, 1.3]) {
        const leg = new THREE.Group();
        leg.position.set(x * (big ? 1.25 : 1), hipY, 0);
        u.body.add(leg);
        part(leg, boxGeo(big ? 1.3 : 1.0, hipY, big ? 1.4 : 1.1), paint, 0, -hipY / 2, 0);
        part(leg, boxGeo(big ? 1.8 : 1.4, 0.5, big ? 2.4 : 1.9), M(0x263238), 0, -hipY + 0.25, 0.3); // foot
        u.legs.push(leg);
      }
    } else {
      for (const x of [-1.7, 1.7]) part(u.body, boxGeo(0.9, 1.4, 5), tire, x, 0.7, 0);
    }
    const s = big ? 1.35 : 1;
    part(u.body, boxGeo(3.2 * s, 1.8 * s, 3.4 * s), paint, 0, hipY + 0.9 * s, 0); // hull / torso
    part(u.body, boxGeo(1.6 * s, 0.5 * s, 0.1), trim, 0, hipY + 1.3 * s, 1.71 * s); // eye slit
    const t = turret(u, hipY + 1.8 * s);
    part(t, boxGeo(1.8 * s, 0.9 * s, 2 * s), M(big ? 0x37474f : 0x795548), 0, 0.45 * s, 0);
    for (const x of [-0.5, 0.5]) {
      part(t, boxGeo(0.25, 0.25, 2.4 * s), M(0x212121), x * s, 0.45 * s, 1.6 * s);
      gunMuzzle(u, t, x * s, 0.45 * s, 2.8 * s);
    }
    // Arm cannon on the side (all Zed vehicles from Lv 3 have one; the M1 model shows it too).
    part(u.body, boxGeo(0.8 * s, 0.8 * s, 3 * s), M(0x424242), 2.1 * s, hipY + 0.9 * s, 0.6);
    part(u.body, boxGeo(0.5 * s, 0.5 * s, 0.1), trim, 2.1 * s, hipY + 0.9 * s, 2.15 * s);
    u.cannon = gunMuzzle(u, u.body, 2.1 * s, hipY + 0.9 * s, 2.2 * s);
    u.muzzles.pop(); // the cannon muzzle is separate from the gun muzzles
    u.height = hipY + 3.4 * s;
    u.tracer = big ? 0xff5252 : 0xffd54f;
  }
  return u;
}

/**
 * Behemoth Factory and War Machine Factory units, built onto `u`.
 * behemoth..behemoth4 / mammoth: giant tanks with a huge cannon (two barrels from behemoth4).
 * laserbehemoth / 2 / 3: white-blue, purple, then black-red tanks with a long railgun.
 * walker..walker5: Abrams Walkers, two-legged mechs with cannon arms (miniguns from walker3).
 * warmachine / 2 / 3: towering humanoid mechs with a flamethrower arm and a huge fist.
 */
export function makeHeavyUnit(u, model, tire) {
  const { M } = u;
  if (model.startsWith('behemoth') || model === 'mammoth' || model.startsWith('laserbehemoth')) {
    const laser = model.startsWith('laserbehemoth');
    const lv = laser ? Number(model.slice(13)) || 1 : model === 'mammoth' ? 5 : Number(model.slice(8)) || 0;
    const s = laser ? 1.35 + lv * 0.1 : model === 'mammoth' ? 2.0 : 1.3 + lv * 0.1;
    const paint = M(laser ? [0xeceff1, 0x4a148c, 0x1a1a1a][lv - 1] : [0x556b2f, 0x556b2f, 0x607d8b, 0x4e5b31, 0x263238, 0x1c1c1c][lv]);
    const dark = M(laser ? [0x90a4ae, 0x311b92, 0x0d0d0d][lv - 1] : 0x2e3b1f);
    const trim = laser ? glow(u, [0x40c4ff, 0xe040fb, 0xff1744][lv - 1]) : lv >= 4 ? glow(u, model === 'mammoth' ? 0xff3d00 : 0xffc400) : null;
    part(u.body, boxGeo(4.2 * s, 1.6 * s, 6.8 * s), paint, 0, 1.5 * s, 0); // hull
    part(u.body, boxGeo(4.2 * s, 0.7 * s, 1.2 * s), dark, 0, 1.0 * s, 3.8 * s); // ram plow
    for (const x of [-0.45, 0, 0.45]) part(u.body, boxGeo(0.2 * s, 0.9 * s, 0.6 * s), M(0x9e9e9e), x * 4 * s, 1.0 * s, 4.5 * s); // plow spikes
    for (const x of [-2.3, 2.3]) part(u.body, boxGeo(1.1 * s, 1.5 * s, 7.2 * s), tire, x * s, 0.75 * s, 0); // tracks
    if (lv >= 2 || laser) for (const x of [-2.9, 2.9]) part(u.body, boxGeo(0.15 * s, 1.0 * s, 6.4 * s), dark, x * s, 1.5 * s, 0); // side skirts
    if (trim) part(u.body, boxGeo(4.3 * s, 0.15 * s, 0.15 * s), trim, 0, 2.0 * s, 3.4 * s);
    const t = turret(u, 2.3 * s, -0.5 * s);
    part(t, boxGeo(3.2 * s, 1.3 * s, 3.6 * s), dark, 0, 0.65 * s, 0);
    if (laser) {
      // Railgun: two long rails with a glowing charge between them.
      const len = (6 + lv) * s;
      for (const x of [-0.35, 0.35]) part(t, boxGeo(0.25 * s, 0.55 * s, len), paint, x * s, 0.7 * s, 1.8 * s + len / 2);
      part(t, boxGeo(0.3 * s, 0.3 * s, len), trim, 0, 0.7 * s, 1.8 * s + len / 2);
      for (const z of [0.3, 0.6]) part(t, boxGeo(1.1 * s, 0.75 * s, 0.25 * s), dark, 0, 0.7 * s, 1.8 * s + len * z); // rail clamps
      gunMuzzle(u, t, 0, 0.7 * s, 1.9 * s + len);
      u.tracer = [0x40c4ff, 0xe040fb, 0xff1744][lv - 1];
      u.tracerWidth = 0.5;
    } else {
      const len = (lv >= 2 ? 5.5 : 4.5) * s;
      const xs = lv >= 4 ? [-0.6, 0.6] : [0];
      for (const x of xs) part(t, boxGeo(0.55 * s, 0.55 * s, len), M(0x37474f), x * s, 0.7 * s, 1.8 * s + len / 2);
      for (const x of xs) part(t, boxGeo(0.8 * s, 0.8 * s, 0.6 * s), M(0x212121), x * s, 0.7 * s, 1.8 * s + len); // muzzle brakes
      u.cannon = gunMuzzle(u, t, xs[0] * s, 0.7 * s, 2.2 * s + len);
      u.muzzles.pop();
      if (model === 'mammoth') {
        // Anti-air missile racks on the turret sides
        for (const x of [-1.9, 1.9]) {
          part(t, boxGeo(0.8 * s, 0.8 * s, 1.6 * s), M(0x37474f), x * s, 1.0 * s, -0.4 * s);
          part(t, boxGeo(0.6 * s, 0.6 * s, 0.1), glow(u, 0xff3d00), x * s, 1.0 * s, 0.45 * s);
        }
      }
      u.tracer = 0xffab40;
    }
    part(t, boxGeo(0.25, 0.25, 1.4), M(0x212121), 1.0 * s, 1.5 * s, 0.4 * s); // commander's MG
    if (!u.muzzles.length) gunMuzzle(u, t, 1.0 * s, 1.5 * s, 1.1 * s);
    u.height = 4.2 * s;
    return;
  }
  // Mechs
  const wm = model.startsWith('warmachine');
  const lv = wm ? Number(model.slice(10)) || 1 : Number(model.slice(6)) || 0;
  const s = wm ? 1.5 + lv * 0.2 : 1 + lv * 0.05;
  const paint = M(wm ? [0x37474f, 0x263238, 0x111111][lv - 1] : lv >= 5 ? 0x1c1c1c : 0xc8b58a);
  const dark = M(wm ? 0x1a1a1a : lv >= 5 ? 0x0d0d0d : 0x8d7b5a);
  const eye = glow(u, wm ? [0xff6d00, 0xff1744, 0xd500f9][lv - 1] : lv >= 5 ? 0x76ff03 : 0xffc400);
  const hipY = (wm ? 3.6 : 3.0) * s;
  u.legs = [];
  for (const x of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(x * 1.3 * s, hipY, 0);
    u.body.add(leg);
    part(leg, boxGeo(1.1 * s, hipY, 1.2 * s), paint, 0, -hipY / 2, 0);
    part(leg, boxGeo(1.3 * s, 0.7 * s, 1.0 * s), dark, 0, -hipY * 0.5, 0.35 * s); // knee armor
    part(leg, boxGeo(1.6 * s, 0.5 * s, 2.2 * s), dark, 0, -hipY + 0.25 * s, 0.3 * s); // foot
    u.legs.push(leg);
  }
  const torsoH = (wm ? 3.2 : 1.9) * s;
  const t = turret(u, hipY);
  part(t, boxGeo((wm ? 3.4 : 3.0) * s, torsoH, (wm ? 2.4 : 2.6) * s), paint, 0, torsoH / 2, 0);
  part(t, boxGeo(1.4 * s, 0.4 * s, 0.1), eye, 0, torsoH * (wm ? 0.8 : 0.6), (wm ? 1.21 : 1.31) * s); // visor
  if (wm) {
    // A head, shoulder pads, a flamethrower arm (right) and a huge fist (left).
    part(t, boxGeo(1.4 * s, 1.1 * s, 1.3 * s), dark, 0, torsoH + 0.55 * s, 0);
    part(t, boxGeo(1.0 * s, 0.25 * s, 0.1), eye, 0, torsoH + 0.6 * s, 0.66 * s);
    for (const x of [-1, 1]) part(t, boxGeo(1.4 * s, 0.8 * s, 1.8 * s), dark, x * 2.2 * s, torsoH - 0.2 * s, 0);
    part(t, boxGeo(1.0 * s, 2.8 * s, 1.0 * s), paint, 2.2 * s, torsoH - 1.8 * s, 0.3 * s); // right arm
    part(t, boxGeo(0.7 * s, 0.7 * s, 2.0 * s), M(0x424242), 2.2 * s, torsoH - 3.1 * s, 1.2 * s); // flamer nozzle
    part(t, boxGeo(0.5 * s, 0.5 * s, 0.1), glow(u, 0xff6d00), 2.2 * s, torsoH - 3.1 * s, 2.21 * s);
    gunMuzzle(u, t, 2.2 * s, torsoH - 3.1 * s, 2.3 * s);
    part(t, boxGeo(1.0 * s, 2.6 * s, 1.0 * s), paint, -2.2 * s, torsoH - 1.7 * s, 0.3 * s); // left arm
    part(t, boxGeo(1.6 * s, 1.6 * s, 1.6 * s), dark, -2.2 * s, torsoH - 3.4 * s, 0.6 * s); // fist
    u.cannon = gunMuzzle(u, t, -2.2 * s, torsoH - 3.4 * s, 1.5 * s);
    u.muzzles.pop();
    if (lv >= 3) for (const x of [-1, 1]) part(t, boxGeo(0.25 * s, 1.6 * s, 0.25 * s), eye, x * 0.9 * s, torsoH + 1.6 * s, -0.4 * s); // horns
    u.height = hipY + torsoH + 1.5 * s;
    u.tracer = 0xff6d00;
    return;
  }
  // Abrams Walker: cannon arms on both sides (minigun on the right from walker3, four miniguns at walker5).
  const cannons = lv >= 2 ? [-1, 1] : [-1];
  for (const x of cannons) {
    if (x > 0 && lv >= 3) continue; // the right arm is a minigun from Lv 3
    part(t, boxGeo(0.9 * s, 0.9 * s, 3.4 * s), dark, x * 2.0 * s, torsoH * 0.6, 0.9 * s);
    part(t, boxGeo(0.45 * s, 0.45 * s, 1.6 * s), M(0x37474f), x * 2.0 * s, torsoH * 0.6, 3.2 * s);
  }
  u.cannon = gunMuzzle(u, t, -2.0 * s, torsoH * 0.6, 4.0 * s);
  u.muzzles.pop();
  if (lv >= 3) {
    const guns = lv >= 5 ? [[2.0, 0.4], [2.0, 1.0], [2.6, 0.4], [2.6, 1.0]] : [[2.0, 0.6]];
    for (const [x, y] of guns) {
      part(t, boxGeo(0.4 * s, 0.4 * s, 2.6 * s), M(0x212121), x * s, torsoH * y, 1.2 * s);
      gunMuzzle(u, t, x * s, torsoH * y, 2.5 * s);
    }
  }
  if (lv >= 4) part(t, boxGeo(1.0 * s, 0.9 * s, 1.2 * s), M(0x37474f), 0, torsoH + 0.45 * s, -0.6 * s); // ammo pod
  u.height = hipY + torsoH + 0.8 * s;
  u.tracer = lv >= 5 ? 0x76ff03 : 0xffd54f;
}

/** A goon on foot: pistolgoon (flat cap, pistol), tommygoon (fedora, tommy gun), dongoon (bigger, red tie, armored vest). */
export function makeGoon(model) {
  if (model.startsWith('mgoon') || model.startsWith('agent')) return makeMobGoon(model);
  const tommy = model !== 'pistolgoon';
  const made = model === 'dongoon';
  const coat = made ? 0x1a1a1a : tommy ? 0x37474f : 0x5d4037;
  const h = makeHumanoid({ skin: 0xd7a26b, shirt: coat, pants: 0x212121, arms: coat, face: 'soldier' });
  suit(h, 0xeeeeee, made ? 0xd50000 : tommy ? 0x1a237e : 0x3e2723);
  if (tommy) fedora(h, made ? 0x111111 : 0x455a64, made ? 0xd50000 : 0x212121);
  else {
    const cap = h.M(0x795548);
    part(h.head, boxGeo(1.35, 0.35, 1.35), cap, 0, 1.3, 0); // flat cap
    part(h.head, boxGeo(1.2, 0.12, 0.5), cap, 0, 1.15, 0.75);
  }
  if (made) part(h.torso, boxGeo(2.15, 1.5, 1.12), h.M(0x424242), 0, 0.1, 0); // armored vest
  if (tommy) {
    h.muzzles = [addTommyGun(h, h.rightArm, false)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  } else {
    h.muzzles = [addPistol(h, h.rightArm, false)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
  }
  return h;
}

/**
 * Mobster helpers. mgoon: a street thug in a beanie with a pistol; mgoon2: a leather jacket and
 * a tommy gun; mgoon3: a red suit, fedora and a gold tommy gun. agent / agent2 / agent3: black
 * suits and shades with a pistol, then a tommy gun, then a gold one and a glowing earpiece.
 */
export function makeMobGoon(model) {
  const agent = model.startsWith('agent');
  const tier = Number(model.slice(-1)) || 1;
  const coat = agent ? 0x111111 : [0x4e342e, 0x3e2723, 0x8e0000][tier - 1];
  const h = makeHumanoid({ skin: 0xd7a26b, shirt: coat, pants: agent ? 0x111111 : 0x263238, arms: coat, face: 'soldier' });
  const { M } = h;
  suit(h, agent ? 0xfafafa : tier === 3 ? 0x111111 : 0x9e9e9e, agent ? 0x111111 : tier === 3 ? 0xd4af37 : 0x3e2723);
  if (agent) {
    part(h.head, boxGeo(1.2, 0.25, 0.08), M(0x050505), 0, 0.68, 0.62); // shades
    part(h.head, boxGeo(0.12, 0.3, 0.12), tier >= 3 ? glow(h, 0x40c4ff) : M(0x212121), 0.66, 0.5, 0); // earpiece
  } else if (tier === 1) {
    part(h.head, boxGeo(1.35, 0.5, 1.35), M(0x424242), 0, 1.25, 0); // beanie
  } else if (tier === 2) {
    part(h.head, boxGeo(1.35, 0.35, 1.35), M(0x212121), 0, 1.3, 0); // flat cap
    part(h.head, boxGeo(1.2, 0.12, 0.5), M(0x212121), 0, 1.15, 0.75);
  } else fedora(h, 0x111111, 0xd4af37);
  if (tier >= 2) {
    h.muzzles = [addTommyGun(h, h.rightArm, tier >= 3)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  } else {
    h.muzzles = [addPistol(h, h.rightArm, false)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
  }
  return h;
}

/**
 * A Mercenary Base unit on foot: mrifle / mgren / mriot / mmedic, with a number for the
 * upgraded look (mrifle2, mrifle3, mgren2, mriot2, mmedic2).
 */
export function makeMerc(model) {
  const kind = model.replace(/\d+$/, '');
  const tier = Number(model.match(/\d+$/)?.[0] ?? 1);
  const look = {
    mrifle: { shirt: [0x8d7b5a, 0x5d4037, 0x263238][tier - 1], pants: 0x3e2723 },
    mgren: { shirt: tier > 1 ? 0x3e2723 : 0x6d4c41, pants: 0x3e2723 },
    mriot: { shirt: tier > 1 ? 0x1a237e : 0x263238, pants: 0x1c2429 },
    mmedic: { shirt: 0xeceff1, pants: 0x546e7a },
  }[kind];
  const h = makeHumanoid({ skin: 0xd7a26b, shirt: look.shirt, pants: look.pants, arms: look.shirt, face: 'soldier' });
  const { M } = h;
  if (kind === 'mriot') {
    // Riot Guard: full helmet with visor, body armor, a big shield and a baton
    helmet(h, 0x212121, false);
    part(h.head, boxGeo(1.25, 0.5, 0.1), M(0x80deea), 0, 0.7, 0.65);
    part(h.torso, boxGeo(2.2, 1.8, 1.2), M(tier > 1 ? 0x283593 : 0x37474f), 0, 0.05, 0);
    const shield = part(h.leftArm, boxGeo(0.15, 2.4, 1.8), M(0x90a4ae), 0.3, -1.6, 0.2);
    shield.rotation.z = 0.1;
    part(h.rightArm, boxGeo(0.2, 1.2, 0.2), M(0x111111), 0, -2.3, 0);
    const m = new THREE.Object3D();
    m.position.set(0, -2.9, 0);
    h.rightArm.add(m);
    h.muzzles = [m];
    h.rightArm.rotation.set(-1.2, 0, 0.1);
    h.leftArm.rotation.set(-0.8, 0, 0);
    return h;
  }
  if (kind === 'mmedic') {
    // Field Medic: a white cap and armband with red crosses, and a medical bag
    const cap = M(0xfafafa);
    part(h.head, boxGeo(1.35, 0.35, 1.35), cap, 0, 1.3, 0);
    part(h.head, boxGeo(0.4, 0.12, 0.05), M(0xd50000), 0, 1.35, 0.69);
    part(h.head, boxGeo(0.12, 0.4, 0.05), M(0xd50000), 0, 1.35, 0.69);
    part(h.torso, boxGeo(0.5, 0.15, 0.05), M(0xd50000), 0, 0.4, 0.52);
    part(h.torso, boxGeo(0.15, 0.5, 0.05), M(0xd50000), 0, 0.4, 0.52);
    part(h.torso, boxGeo(1.2, 1.0, 0.6), M(0x1b5e20), 0, -0.2, -0.8); // bag
    if (tier > 1) part(h.head, boxGeo(1.1, 0.25, 0.1), glow(h, 0x69f0ae), 0, 0.7, 0.65);
    const m = new THREE.Object3D();
    m.position.set(0, -2, 0);
    h.rightArm.add(m);
    h.muzzles = [m];
    return h;
  }
  helmet(h, kind === 'mgren' ? 0x4e342e : [0x6b5d3f, 0x3e2723, 0x212121][tier - 1]);
  if (kind === 'mrifle' && tier > 1) part(h.head, boxGeo(1.1, 0.3, 0.15), glow(h, tier > 2 ? 0x00e5ff : 0x76ff03), 0, 1.0, 0.68); // goggles
  if (kind === 'mgren') {
    // Grenadier: a bandolier of grenades and a short launcher
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x4e342e), 0, 0.3, 0).rotation.z = 0.6;
    for (const x of [-0.5, 0, 0.5]) part(h.torso, boxGeo(0.25, 0.25, 0.25), M(tier > 1 ? 0xff6d00 : 0x33691e), x, 0.3 + x * 0.6, 0.56);
    holdLongGun(h, 1.0, M(0x37474f));
    h.projectile = { color: tier > 1 ? 0xff6d00 : 0x33691e, size: 0.4, arc: 4 };
  } else holdLongGun(h, tier > 2 ? 1.8 : 1.5, M(tier > 2 ? 0x263238 : 0x262626));
  return h;
}

/**
 * A skeleton raised by the Necromancer: skel, skelsword, skelsword2, skelknight, skelhallow,
 * skelexec. The Giant Skeleton and the Graveyard's undead are built in undead.js.
 */
export function makeSkeleton(model) {
  const bone = model === 'skelhallow' ? 0xb3e5fc : 0xe8e4d0;
  const h = makeHumanoid({ skin: bone, shirt: bone, pants: bone, arms: bone, face: 'skull' });
  const { M } = h;
  const dark = M(0x3e3a30);
  for (let i = 0; i < 3; i++) part(h.torso, boxGeo(1.6, 0.14, 0.06), dark, 0, 0.6 - i * 0.45, 0.52); // ribs
  const blade = (len, w, color) => {
    const g = new THREE.Group();
    g.position.set(0, -1.9, 0);
    h.rightArm.add(g);
    part(g, boxGeo(0.25, 0.5, 0.25), M(0x4e342e), 0, -0.2, 0); // grip
    part(g, boxGeo(0.8, 0.12, 0.25), M(0x757575), 0, -0.45, 0); // crossguard
    part(g, boxGeo(w, len, 0.15), color, 0, -0.5 - len / 2, 0);
    const m = new THREE.Object3D();
    m.position.set(0, -0.5 - len, 0);
    g.add(m);
    h.muzzles = [m];
  };
  h.rightArm.rotation.set(-1.2, 0, 0.1);
  h.leftArm.rotation.set(-0.5, 0, 0);
  h.tracer = 0xe0e0e0;
  if (model === 'skel') {
    // Plain skeleton: a bone club
    part(h.rightArm, boxGeo(0.3, 1.4, 0.3), M(0xd7ccc8), 0, -2.4, 0);
    const m = new THREE.Object3D();
    m.position.set(0, -3.1, 0);
    h.rightArm.add(m);
    h.muzzles = [m];
  } else if (model === 'skelsword' || model === 'skelsword2') {
    blade(1.6, 0.3, M(model === 'skelsword2' ? 0x90a4ae : 0x9e9e9e));
    if (model === 'skelsword2') part(h.head, boxGeo(1.3, 0.4, 1.3), M(0x546e7a), 0, 1.25, 0); // iron cap
  } else if (model === 'skelknight') {
    helmet(h, 0x607d8b, false);
    part(h.head, boxGeo(1.0, 0.15, 0.1), M(0x111111), 0, 0.8, 0.66); // visor slit
    part(h.torso, boxGeo(2.2, 1.8, 1.2), M(0x78909c), 0, 0.05, 0); // breastplate
    part(h.leftArm, boxGeo(0.2, 1.8, 1.4), M(0x37474f), 0.6, -1.4, 0.2); // shield
    blade(1.9, 0.35, M(0xb0bec5));
    h.tracer = 0xcfd8dc;
  } else if (model === 'skelhallow') {
    // Hallow Guard: ghostly blue bones in glowing armor with a halberd
    const ghost = glow(h, 0x40c4ff);
    part(h.torso, boxGeo(2.2, 1.8, 1.2), M(0x263238), 0, 0.05, 0);
    part(h.torso, boxGeo(0.5, 0.5, 0.08), ghost, 0, 0.4, 0.62);
    helmet(h, 0x263238, false);
    part(h.head, boxGeo(1.0, 0.2, 0.1), ghost, 0, 0.85, 0.67);
    const g = new THREE.Group();
    g.position.set(0, -1.9, 0);
    h.rightArm.add(g);
    part(g, boxGeo(0.2, 3.6, 0.2), M(0x3e2723), 0, -0.8, 0);
    part(g, boxGeo(0.15, 0.8, 0.9), ghost, 0, -2.4, 0.3); // axe head
    const m = new THREE.Object3D();
    m.position.set(0, -2.6, 0);
    g.add(m);
    h.muzzles = [m];
    h.size = 1.2;
    h.tracer = 0x40c4ff;
  } else {
    // Executioner: a black hood and a huge red-glowing axe
    part(h.head, boxGeo(1.4, 1.4, 1.4), M(0x111111), 0, 0.68, -0.1);
    part(h.head, boxGeo(0.9, 0.2, 0.08), glow(h, 0xff1744), 0, 0.85, 0.66);
    part(h.torso, boxGeo(2.2, 1.6, 1.15), M(0x212121), 0, 0, 0);
    const g = new THREE.Group();
    g.position.set(0, -1.9, 0);
    h.rightArm.add(g);
    part(g, boxGeo(0.25, 3.2, 0.25), M(0x3e2723), 0, -0.8, 0);
    part(g, boxGeo(0.2, 1.4, 1.6), M(0x424242), 0, -2.2, 0.6);
    part(g, boxGeo(0.22, 1.2, 0.15), glow(h, 0xff1744), 0, -2.2, 1.4);
    const m = new THREE.Object3D();
    m.position.set(0, -2.4, 0.8);
    g.add(m);
    h.muzzles = [m];
    h.size = 1.5;
    h.tracer = 0xff5252;
  }
  return h;
}

/**
 * Relic units (medieval): relicbandit / relicbandit1 (hooded sword fighters), reliczealot (a
 * white-and-gold knight), relicarcher, relicwarden (a huge armored fighter with a greatsword),
 * relicseraph (a winged angel with a halo), relicoverseer / relicphantom (huge faceless stone
 * guardians; the Phantom is a see-through ghost) and relicprime (the giant Overseer Prime).
 */
export function makeRelicUnit(model) {
  const look = {
    relicbandit: { skin: 0xe0ac69, shirt: 0x5d4037, pants: 0x3e2723 },
    relicbandit1: { skin: 0xe0ac69, shirt: 0x4a148c, pants: 0x311b92 },
    reliczealot: { skin: 0xd7ccc8, shirt: 0xeceff1, pants: 0x90a4ae },
    relicarcher: { skin: 0xe0ac69, shirt: 0x33691e, pants: 0x5d4037 },
    relicwarden: { skin: 0x9e9e9e, shirt: 0x546e7a, pants: 0x37474f },
    relicseraph: { skin: 0xffe0b2, shirt: 0xfffde7, pants: 0xfff9c4 },
    relicoverseer: { skin: 0x8d8d7a, shirt: 0x6d6a55, pants: 0x4e4b3c },
    relicphantom: { skin: 0x80deea, shirt: 0x4dd0e1, pants: 0x26c6da },
    relicprime: { skin: 0x5d5a48, shirt: 0x3e3b2e, pants: 0x2b281f },
  }[model];
  const h = makeHumanoid({ ...look, arms: look.shirt, face: model === 'relicseraph' || model === 'relicarcher' ? 'smile' : 'none' });
  const { M } = h;
  const steel = M(0xb0bec5);
  const gold = M(0xffc107);
  const hand = inHand(h);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.tracer = 0xeeeeee;
  h.size = 1;
  const sword = (len, mat) => part(hand, boxGeo(0.22, len, 0.12), mat, 0, -len / 2, 0);
  if (model === 'relicbandit' || model === 'relicbandit1') {
    part(h.head, boxGeo(1.35, 1.35, 1.35), M(look.shirt), 0, 0.68, -0.08); // hood
    part(h.head, boxGeo(1.25, 0.45, 0.1), M(0x212121), 0, 0.35, 0.64); // face mask
    sword(1.6, steel);
    h.size = 0.85;
  } else if (model === 'reliczealot') {
    part(h.head, boxGeo(1.4, 1.4, 1.4), steel, 0, 0.65, 0); // great helm
    part(h.head, boxGeo(1.0, 0.12, 0.1), M(0x212121), 0, 0.75, 0.71); // visor slit
    part(h.torso, boxGeo(0.5, 1.6, 0.08), M(0xc62828), 0, 0.1, 0.55); // red cross
    part(h.torso, boxGeo(1.4, 0.45, 0.08), M(0xc62828), 0, 0.4, 0.56);
    sword(2.2, steel);
    part(h.leftArm, boxGeo(0.25, 2.0, 1.6), M(0xeceff1), 0.6, -1.2, 0.3); // shield
    h.size = 1;
  } else if (model === 'relicarcher') {
    part(h.head, boxGeo(1.35, 0.5, 1.35), M(0x33691e), 0, 1.3, 0); // cap
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.1);
    part(inHand(h, h.leftArm), boxGeo(0.15, 0.2, 2.6), M(0x8d6e63), 0, 0, 0); // bow
    part(h.torso, boxGeo(0.6, 1.8, 0.6), M(0x6d4c41), 0.6, 0.2, -0.75); // quiver
    h.projectile = { color: 0x8d6e63, size: 0.25, arc: 1 };
    h.tracer = 0xbcaaa4;
    h.size = 0.9;
  } else if (model === 'relicwarden') {
    part(h.head, boxGeo(1.5, 1.5, 1.5), M(0x455a64), 0, 0.65, 0);
    part(h.head, boxGeo(1.1, 0.15, 0.1), glow(h, 0x40c4ff), 0, 0.7, 0.76); // glowing visor
    for (const x of [-1.3, 1.3]) part(h.torso, boxGeo(1.0, 0.7, 1.4), M(0x37474f), x, 1.0, 0); // pauldrons
    sword(3.4, M(0x90a4ae));
    h.tracer = 0x40c4ff;
    h.size = 1.5;
  } else if (model === 'relicseraph') {
    addHalo(h, 0xffeb3b);
    addWings(h, M(0xffffff));
    sword(2.6, glow(h, 0xfff176));
    h.tracer = 0xfff176;
    h.size = 1.1;
  } else {
    // Overseers: huge, faceless stone guardians with a glowing core. They only ram.
    const prime = model === 'relicprime';
    const core = glow(h, model === 'relicphantom' ? 0xe0f7fa : prime ? 0xff6d00 : 0xffd740);
    part(h.head, boxGeo(1.0, 0.25, 0.1), core, 0, 0.7, 0.62); // eye slit
    part(h.torso, boxGeo(0.8, 0.8, 0.1), core, 0, 0.3, 0.52);
    for (const x of [-1.4, 1.4]) part(h.torso, boxGeo(1.1, 0.9, 1.5), M(look.pants), x, 1.0, 0);
    h.rightArm.rotation.set(-0.3, 0, 0.1);
    if (prime) {
      // Overseer Prime: horns, claws and a fiery crown.
      for (const x of [-0.5, 0.5]) part(h.head, boxGeo(0.25, 1.0, 0.25), M(0x212121), x, 1.6, 0).rotation.z = x > 0 ? -0.4 : 0.4;
      for (const arm of [h.rightArm, h.leftArm]) for (const x of [-0.3, 0, 0.3]) part(arm, boxGeo(0.15, 0.8, 0.15), core, x, -2.3, 0.3);
      boxRow(h.head, 5, 0.3, boxGeo(0.2, 0.4, 0.2), core, 1.35, 0.5);
      h.tracer = 0xff6d00;
      h.size = 3.6;
    } else h.size = 2.4;
    if (model === 'relicphantom') setOpacity(h, 0.55);
  }
  setMuzzle(h, hand, 0, -1.2, 0);
  return h;
}

/**
 * Elf Camp elves (smaller, with pointy ears and a striped hat) and the Biologist's plants and the
 * Elementalist's Ice Turret, as units: elfbasic, elfsnow, elfcannon, elfbomb, elfguard, elfguard2,
 * elfgunner, elfgift, elfripped, plantsun, plantivy, plantnight, iceturret.
 */
export function makeCampUnit(model) {
  if (model.startsWith('plant') || model === 'iceturret' || model === 'iceshard') return makePlantUnit(model);
  if (model === 'bubblebuddy') return makeBubbleBuddy();
  const ripped = model === 'elfripped';
  const tunic = { elfguard: 0x1b5e20, elfguard2: 0x0d3b10, elfgunner: 0x33691e, elfbomb: 0xb71c1c, elfgift: 0xc62828 }[model] ?? 0x2e7d32;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: tunic, pants: 0xc62828, arms: ripped ? 0xf1c27d : tunic });
  const { M } = h;
  const white = M(0xfafafa);
  for (const x of [-0.7, 0.7]) part(h.head, boxGeo(0.15, 0.5, 0.25), M(0xf1c27d), x, 0.7, 0).rotation.z = x > 0 ? -0.5 : 0.5; // ears
  part(h.head, boxGeo(1.3, 0.3, 1.3), white, 0, 1.25, 0);
  part(h.head, boxGeo(0.9, 0.7, 0.9), M(0x2e7d32), 0, 1.7, -0.1);
  const hand = inHand(h);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-0.4, 0, -0.2);
  h.tracer = 0xffffff;
  h.size = 0.75;
  if (model === 'elfbasic') {
    h.rightArm.rotation.set(-0.4, 0, 0.1);
  } else if (model === 'elfsnow') {
    part(hand, boxGeo(0.5, 0.5, 0.5), white, 0, -0.3, 0);
    h.projectile = { color: 0xffffff, size: 0.4, arc: 2 };
  } else if (model === 'elfcannon' || model === 'elfgunner') {
    part(hand, boxGeo(0.35, 1.6, 0.4), M(model === 'elfgunner' ? 0x212121 : 0x5d4037), 0, -0.8, 0);
    if (model === 'elfcannon') part(hand, boxGeo(0.5, 0.4, 0.5), M(0x37474f), 0, -1.6, 0);
    else part(h.head, boxGeo(1.25, 0.25, 0.1), M(0x111111), 0, 0.85, 0.62); // shades
    h.tracer = 0xffd54f;
    setMuzzle(h, hand, 0, -1.6, 0);
    return h;
  } else if (model === 'elfbomb') {
    present(h, hand, 0xffd54f, 0xc62828, 0.7).position.y = -0.3;
    part(hand, boxGeo(0.08, 0.4, 0.08), glow(h, 0xff9100), 0, 0.2, 0);
  } else if (model === 'elfguard' || model === 'elfguard2') {
    part(hand, boxGeo(0.25, 1.8, 0.12), model === 'elfguard2' ? glow(h, 0xff1744) : M(0xd7a86e), 0, -1, 0); // cookie-cutter sword
    if (model === 'elfguard2') part(h.torso, boxGeo(2.1, 1.6, 1.15), M(0x78909c), 0, 0.2, 0); // armor
    h.size = 0.85;
  } else if (model === 'elfgift') {
    // Gift Bomber: rides a flying present sled
    present(h, h.body, 0xc62828, 0xffd54f, 1.6).position.set(0, 0.6, 0);
    part(h.body, boxGeo(2.2, 0.2, 3.0), M(0x8d6e63), 0, -0.2, 0);
    h.size = 0.9;
    h.projectile = { color: 0x43a047, size: 0.6, arc: 3 };
  } else if (ripped) {
    for (const side of [-1, 1]) part(h.torso, boxGeo(0.9, 0.9, 1.1), M(0xe0b070), side * 1.3, 0.9, 0); // huge shoulders
    part(h.torso, boxGeo(2.1, 0.4, 1.1), M(0x111111), 0, -0.6, 0);
    present(h, hand, 0x212121, 0xff1744, 1).position.y = -0.4;
    h.size = 1.5;
    h.projectile = { color: 0x212121, size: 0.9, arc: 4 };
  }
  setMuzzle(h, hand, 0, -0.4, 0);
  return h;
}

export function makePlantUnit(model) {
  const t = makeThing();
  const { M } = t;
  const stem = M(0x33691e);
  // Plants have no legs; the unit view still swings these when walking.
  t.leftLeg = new THREE.Object3D();
  t.rightLeg = new THREE.Object3D();
  t.root.add(t.leftLeg, t.rightLeg);
  const head = new THREE.Group();
  t.body.add(head);
  if (model === 'iceshard') {
    // Ice Breaker Ice Shard: a jagged block of glowing ice.
    const ice = glow(t, 0x80d8ff);
    part(t.body, boxGeo(2.6, 0.6, 2.6), M(0xb3e5fc), 0, 0.3, 0);
    part(t.body, boxGeo(1.6, 3.4, 1.6), ice, 0, 1.9, 0).rotation.set(0.15, 0.4, 0.1);
    part(t.body, boxGeo(0.9, 2.2, 0.9), M(0xe1f5fe), 0.9, 1.2, 0.4).rotation.set(0, 0.2, -0.35);
    part(t.body, boxGeo(0.8, 1.8, 0.8), M(0xe1f5fe), -0.9, 1.0, -0.3).rotation.set(0.2, 0, 0.4);
    head.position.y = 3.2;
    t.tracer = 0x80d8ff;
    t.size = 1.5;
  } else if (model === 'iceturret') {
    const ice = glow(t, 0x80d8ff);
    part(t.body, boxGeo(2, 0.8, 2), M(0xb3e5fc), 0, 0.4, 0);
    part(t.body, boxGeo(1.2, 1.6, 1.2), ice, 0, 1.6, 0);
    head.position.y = 2.6;
    part(head, boxGeo(0.5, 0.5, 1.8), M(0xe1f5fe), 0, 0, 0.8);
    t.tracer = 0x80d8ff;
    t.size = 1.4;
  } else if (model === 'plantsun') {
    part(t.body, boxGeo(0.35, 2.4, 0.35), stem, 0, 1.2, 0);
    for (const side of [-1, 1]) part(t.body, boxGeo(0.8, 0.12, 0.4), M(0x558b2f), side * 0.45, 1.0, 0).rotation.z = side * 0.4;
    head.position.y = 2.8;
    part(head, boxGeo(1.8, 1.8, 0.25), M(0xffd600), 0, 0, 0);
    part(head, boxGeo(1.0, 1.0, 0.3), M(0x5d4037), 0, 0, 0.05);
    t.tracer = 0xffee58;
    t.size = 1;
  } else if (model === 'plantivy') {
    const leaf = M(0x2e7d32);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      part(t.body, boxGeo(0.3, 1.6 + (i % 2) * 0.6, 0.3), leaf, Math.cos(a) * 0.5, 0.9, Math.sin(a) * 0.5).rotation.z = Math.cos(a) * 0.3;
    }
    head.position.y = 2.0;
    part(head, boxGeo(0.8, 0.8, 0.8), glow(t, 0x76ff03), 0, 0, 0);
    t.tracer = 0x76ff03;
    t.size = 1;
  } else {
    // Nightshade: a dark purple bloom
    part(t.body, boxGeo(0.35, 2.6, 0.35), M(0x1a237e), 0, 1.3, 0);
    head.position.y = 3.0;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      part(head, boxGeo(0.7, 0.2, 0.7), M(0x4a148c), Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55);
    }
    part(head, boxGeo(0.5, 0.5, 0.5), glow(t, 0xd500f9), 0, 0.1, 0);
    t.tracer = 0xd500f9;
    t.size = 1.1;
  }
  const m = new THREE.Object3D();
  m.position.set(0, 0, model === 'iceturret' ? 1.8 : 0.3);
  head.add(m);
  t.muzzles = [m];
  t.static = false;
  return t;
}

/** Void Traitor summons: Neurons (small and fast), the Void Empress (tall, double-bladed sword). */
export function makeVoidSoldier(model) {
  const empress = model === 'voidempress';
  const h = makeHumanoid({ skin: 0x7e57c2, shirt: empress ? 0x1a0033 : 0x4a148c, pants: 0x0b0014, arms: empress ? 0x311b92 : 0x4a148c, face: 'none' });
  const { M } = h;
  const rune = glow(h, 0xd500f9);
  for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.22, 0.14, 0.05), rune, x, 0.7, 0.62); // glowing eyes
  const hand = inHand(h);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  if (empress) {
    for (let i = 0; i < 5; i++) part(h.head, boxGeo(0.18, 0.5 + (i === 2 ? 0.3 : 0), 0.18), rune, -0.5 + i * 0.25, 1.4, 0); // crown
    part(h.torso, boxGeo(2.3, 3.6, 0.12), M(0x311b92), 0, -0.8, -0.6); // gown/cape
    part(hand, boxGeo(0.2, 1.0, 0.2), M(0x111111), 0, 0, 0); // staff grip
    part(hand, boxGeo(0.25, 2.0, 0.12), rune, 0, 1.4, 0); // blade up
    part(hand, boxGeo(0.25, 2.0, 0.12), rune, 0, -1.4, 0); // blade down
    h.size = 1.5;
  } else {
    for (const side of [-1, 1]) part(h.head, boxGeo(0.15, 0.6, 0.15), rune, side * 0.45, 1.4, 0).rotation.z = side * -0.4; // antennae
    part(hand, boxGeo(0.2, 0.7, 0.2), rune, 0, -0.3, 0); // claw
    h.size = 0.7;
  }
  setMuzzle(h, hand, 0, -0.5, 0);
  h.tracer = 0xd500f9;
  return h;
}

/** Void Tank: a big dark purple armored tank with a glowing void cannon. */
export function makeVoidTank(u) {
  const { M } = u;
  const hull = M(0x2a1040);
  const rune = glowThing(u, 0xd500f9);
  const tire = M(0x111111);
  part(u.body, boxGeo(4.2, 1.6, 6.2), hull, 0, 1.4, 0);
  for (const x of [-2.2, 2.2]) part(u.body, boxGeo(1.0, 1.5, 6.6), tire, x, 0.8, 0); // tracks
  for (const x of [-2.75, 2.75]) part(u.body, boxGeo(0.06, 0.2, 5.6), rune, x, 1.0, 0);
  part(u.body, boxGeo(3.4, 0.4, 0.6), M(0x111111), 0, 1.0, 3.3); // ram plow
  const t = turret(u, 2.8);
  part(t, boxGeo(3.0, 1.2, 3.2), M(0x1a0033), 0, 0.6, -0.3);
  part(t, boxGeo(0.6, 0.6, 3.8), M(0x311b92), 0, 0.7, 2.8);
  part(t, boxGeo(0.7, 0.2, 3.0), rune, 0, 1.05, 2.6);
  for (const side of [-1, 1]) part(t, boxGeo(0.3, 0.9, 0.3), rune, side * 1.2, 1.5, -0.8).rotation.z = side * -0.4;
  gunMuzzle(u, t, 0, 0.7, 4.8);
  u.height = 4.6;
  u.tracer = 0xd500f9;
  return u;
}

/** Bubble Companion (Bubble Blower unit): a round little bubble person with a smile. */
export function makeBubbleBuddy() {
  const h = makeHumanoid({ skin: 0xb3e5fc, shirt: 0x81d4fa, pants: 0x4fc3f7, arms: 0x81d4fa });
  const bub = part(h.body, new THREE.SphereGeometry(2.4, 12, 10), glow(h, 0xe1f5fe), 0, 3.2, 0);
  bub.material.transparent = true;
  bub.material.opacity = 0.3;
  bub.castShadow = false;
  h.rightArm.rotation.set(-0.3, 0, 0.3);
  h.leftArm.rotation.set(-0.3, 0, -0.3);
  h.muzzles = [];
  h.tracer = 0xb3e5fc;
  h.size = 0.8;
  return h;
}
