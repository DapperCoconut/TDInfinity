// Tower models, file 2 of 12. Each makeX(level) builds one tower's look.
// In here:
// Rocketeer, Mortar, Flamethrower, Shotgunner, Plasma, Plasma Pulse.
// (Sniper, Sniper Tactical, Sniper Classic, Enforcer and Warden moved to people5.js;
// Grenadier, Demo, Assault and Frost to people6.js.)
// The list of which tower uses which builder is TOWER_MODELS in ../models.js.

import * as THREE from 'three';
import { boxGeo, makeHumanoid, part } from './kit.js';
import { glow, helmet, holdLongGun, setMuzzle } from './bits.js';

/** Rocketeer tower: rocket launcher, bazooka at Lv 4, plasma launcher at Lv 5. */
export function makeRocketeer(level) {
  const plasma = level >= 4;
  const bazooka = level >= 3;
  const h = makeHumanoid({ skin: 0xc68642, shirt: plasma ? 0x311b92 : 0x795548, pants: plasma ? 0x1a1a40 : 0x4e342e, arms: plasma ? 0x311b92 : 0x795548, face: 'soldier' });
  const { M } = h;
  helmet(h, plasma ? 0x212121 : 0x6d4c41);
  if (level >= 2) {
    // Scope: one-eyed targeting monocle
    part(h.head, boxGeo(0.4, 0.35, 0.3), M(0x212121), 0.28, 0.7, 0.68);
    part(h.head, boxGeo(0.25, 0.2, 0.05), glow(h, plasma ? 0xe040fb : 0xff5252), 0.28, 0.7, 0.84);
  }
  if (level >= 1) {
    // Backpack full of spare rockets
    part(h.torso, boxGeo(1.4, 1.6, 0.7), M(0x5d4037), 0, 0, -0.85);
    for (const x of [-0.35, 0.35]) part(h.torso, boxGeo(0.3, 0.5, 0.3), plasma ? glow(h, 0xd500f9) : M(0xe65100), x, 1.0, -0.85);
  }
  const w = bazooka ? 0.9 : 0.7;
  const len = bazooka ? 3.0 : 2.5;
  const tubeMat = M(plasma ? 0x4a148c : bazooka ? 0x556b2f : 0x616161);
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  h.rightArm.add(gun);
  part(gun, boxGeo(w, len, w), tubeMat, 0, -len / 2 + 0.6, 0); // tube sticks out behind the hand too
  part(gun, boxGeo(w + 0.15, 0.3, w + 0.15), M(0x212121), 0, -len + 0.6, 0); // front ring
  part(gun, boxGeo(0.3, 0.5, 0.3), M(0x212121), 0, -0.3, -0.4); // grip
  if (plasma) for (let i = 0; i < 3; i++) part(gun, boxGeo(w + 0.1, 0.15, w + 0.1), glow(h, 0xd500f9), 0, -0.4 - i * 0.6, 0);
  if (level >= 2) {
    // Scope: a big targeting sight on top of the tube, and a padded flak vest
    if (!plasma) part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x5d4037), 0, 0.05, 0);
    part(gun, boxGeo(0.4, 1.1, 0.45), M(0x212121), 0, -0.9, w / 2 + 0.25);
    part(gun, boxGeo(0.3, 0.06, 0.3), glow(h, plasma ? 0xe040fb : 0xff5252), 0, -1.47, w / 2 + 0.25);
  }
  setMuzzle(h, gun, 0, -len + 0.4, 0);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.2 };
  h.projectile = plasma ? { color: 0xe040fb, size: 1.4 } : bazooka ? { color: 0xff6d00, size: 1.2 } : { color: 0xff6d00, size: 1 };
  return h;
}

/** Mortar tower (cliff): a soldier loading a mortar tube. */
export function makeMortar(level) {
  const doom = level >= 4;
  const h = makeHumanoid({ skin: 0x8d5524, shirt: 0x6b7d3a, pants: 0x4b5320, arms: 0x6b7d3a, face: 'soldier' });
  const { M } = h;
  helmet(h, 0x556b2f);
  if (level >= 1) {
    // Fast Loader: ear protectors and an open crate of ready shells beside the tube
    for (const x of [-0.7, 0.7]) part(h.head, boxGeo(0.25, 0.55, 0.55), M(0xff8f00), x, 0.6, 0);
    part(h.root, boxGeo(1.3, 0.7, 0.9), M(0x6d4c41), -2.0, 0.35, 1.0);
    for (const x of [-2.35, -2.0, -1.65]) part(h.root, boxGeo(0.25, 0.5, 0.25), M(doom ? 0x76ff03 : 0x37474f), x, 0.85, 1.0);
  }
  // Mortar tube in front of the soldier, tilted up toward the target.
  const mount = new THREE.Group();
  mount.position.set(0, 0, 2.2);
  h.root.add(mount);
  const steel = M(doom ? 0x37474f : 0x4a5a3a);
  part(mount, boxGeo(1.8, 0.2, 1.8), M(0x424242), 0, 0.1, 0); // base plate
  const w = level >= 2 ? 0.85 : 0.65;
  const len = level >= 2 ? 3.6 : 3.0;
  const tube = new THREE.Group();
  tube.position.set(0, 0.3, 0);
  tube.rotation.x = 0.5; // leans forward
  mount.add(tube);
  part(tube, boxGeo(w, len, w), steel, 0, len / 2, 0);
  part(tube, boxGeo(w + 0.2, 0.25, w + 0.2), M(0x212121), 0, len, 0);
  if (doom) for (let i = 0; i < 3; i++) part(tube, boxGeo(w + 0.12, 0.15, w + 0.12), glow(h, 0x76ff03), 0, 0.8 + i * 0.9, 0);
  for (const side of [-1, 1]) {
    const leg = part(mount, boxGeo(0.15, 2.2, 0.15), M(0x212121), side * 0.6, 1.0, 1.0); // bipod
    leg.rotation.set(-0.5, 0, side * 0.3);
  }
  setMuzzle(h, tube, 0, len + 0.3, 0);
  if (level >= 2) {
    // Sandbag wall
    const bag = M(0xa1887f);
    for (let i = 0; i < 5; i++) {
      const a = -1.2 + i * 0.6;
      part(h.root, boxGeo(1.3, 0.6, 0.7), bag, Math.sin(a) * 3.3, 0.3, 2.2 + Math.cos(a) * 1.6).rotation.y = a;
    }
  }
  if (level >= 3) {
    // Heavy Ordnance: stack of shells by the soldier's feet
    const shellM = doom ? glow(h, 0x76ff03) : M(0x37474f);
    part(h.root, boxGeo(1.4, 0.2, 1.0), M(0x5d4037), 1.9, 0.1, 0.2); // shell rack
    for (const x of [1.4, 1.75, 2.1, 2.45]) for (const z of [-0.05, 0.45]) part(h.root, boxGeo(0.3, 1.1, 0.3), shellM, x, 0.75, z);
    part(h.head, boxGeo(1.55, 0.35, 1.55), M(0x37474f), 0, 1.55, 0); // heavier helmet
  }
  // Holding a shell, ready to drop it in.
  const shell = part(h.rightArm, boxGeo(0.4, 0.8, 0.4), doom ? glow(h, 0x76ff03) : M(0x37474f), 0.6, -2.1, 0);
  shell.rotation.z = 0.3;
  h.rightArm.rotation.set(-1.0, 0, 0.3);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -1.0, left: -1.0, leftRecoil: 0 };
  h.recoilScale = 0.4;
  h.projectile = doom ? { color: 0x76ff03, size: 0.9, arc: 20, glowing: true } : { color: 0x37474f, size: 0.6, arc: 18 };
  return h;
}

/** Flamethrower tower: fuel tanks and a nozzle; two nozzles at Lv 5. */
export function makeFlamethrower(level) {
  const twin = level >= 4;
  const suit = level >= 2;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: suit ? 0x9e9e9e : 0x5d4037, pants: suit ? 0x757575 : 0x3e2723, arms: suit ? 0x9e9e9e : 0x5d4037 });
  const { M } = h;
  // Gas mask with round lenses
  part(h.head, boxGeo(1.3, 1.3, 1.3), M(suit ? 0xbdbdbd : 0x424242), 0, 0.62, 0);
  part(h.head, boxGeo(0.4, 0.35, 0.08), M(0xffa000), -0.28, 0.75, 0.68);
  part(h.head, boxGeo(0.4, 0.35, 0.08), M(0xffa000), 0.28, 0.75, 0.68);
  part(h.head, boxGeo(0.5, 0.5, 0.4), M(0x212121), 0, 0.3, 0.75); // filter
  // Fuel tanks on the back
  const tank = M(level >= 3 ? 0xffa000 : 0xc62828);
  const tanks = twin ? [-0.6, -0.2, 0.2, 0.6] : level >= 1 ? [-0.6, 0, 0.6] : [-0.4, 0.4];
  const tankW = twin ? 0.38 : level >= 1 ? 0.5 : 0.6;
  const tankH = level >= 1 ? 2.4 : 1.9;
  for (const x of tanks) part(h.torso, boxGeo(tankW, tankH, 0.6), tank, x, level >= 1 ? 0.25 : 0, -0.85);
  if (level >= 1) part(h.torso, boxGeo(0.25, 0.25, 1.4), M(0x212121), -0.8, -0.6, -0.3); // hose
  const nozzle = (arm) => {
    const g = new THREE.Group();
    g.position.set(0, -1.9, 0);
    arm.add(g);
    part(g, boxGeo(0.4, 1.8, 0.45), M(0x37474f), 0, -0.9, 0);
    part(g, boxGeo(0.6, 0.3, 0.6), M(0x212121), 0, -1.8, 0);
    part(g, boxGeo(0.15, 0.15, 0.15), glow(h, 0xff9100), 0, -2.0, 0.2); // pilot light
    const m = new THREE.Object3D();
    m.position.set(0, -2.1, 0);
    g.add(m);
    return m;
  };
  h.muzzles = [nozzle(h.rightArm)];
  if (twin) {
    h.muzzles.push(nozzle(h.leftArm));
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.12);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.12);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.05 };
  } else {
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.15, 0, -0.5);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.15, leftRecoil: 0.05 };
  }
  h.recoilScale = 0.1;
  return h;
}

// ------------------------------------------------------------------ spread / multi-target towers

/** Shotgunner: pump shotgun. Dark hunter coat from Lv 2, shell bandolier from Lv 4, riot armor at Lv 5. */
export function makeShotgunner(level) {
  const night = level >= 1;
  const riot = level >= 4;
  const h = makeHumanoid({
    skin: 0xd2a679,
    shirt: riot ? 0x263238 : night ? 0x283044 : 0x8d6e63,
    pants: riot ? 0x1c2429 : night ? 0x1e2333 : 0x4e342e,
    arms: riot ? 0x263238 : night ? 0x283044 : 0x8d6e63,
    face: 'soldier',
  });
  const { M } = h;
  if (riot) {
    // Crowd Control: riot helmet with a visor and chest plate
    part(h.head, boxGeo(1.45, 1.35, 1.45), M(0x37474f), 0, 0.68, -0.03);
    const visor = part(h.head, boxGeo(1.25, 0.6, 0.08), M(0x90caf9), 0, 0.65, 0.74);
    visor.material.transparent = true;
    visor.material.opacity = 0.6;
    part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x455a64), 0, 0.05, 0);
  } else {
    // Wide-brim hunter hat (dark from Lv 2)
    const hat = M(night ? 0x1a1a1a : 0x6d4c41);
    part(h.head, boxGeo(2.0, 0.12, 2.0), hat, 0, 1.22, 0);
    part(h.head, boxGeo(1.3, 0.5, 1.3), hat, 0, 1.5, 0);
    if (night) part(h.head, boxGeo(1.32, 0.12, 1.32), M(0xc62828), 0, 1.3, 0); // hat band
  }
  if (level >= 2) {
    // Bolt Action: long coat tails
    part(h.torso, boxGeo(2.05, 2.0, 0.2), M(night ? 0x1e2333 : 0x5d4037), 0, -1.7, -0.45);
    part(h.torso, boxGeo(2.3, 0.5, 1.3), M(0x4e342e), 0, 0.85, 0); // coat collar / shoulder cape
  }
  if (level >= 3) {
    // Bandolier: a strap of red shells across the chest
    const strap = part(h.torso, boxGeo(0.35, 2.6, 1.12), M(0x4e342e), 0, 0, 0);
    strap.rotation.z = 0.75;
    for (const t of [-0.75, -0.25, 0.25, 0.75]) part(h.torso, boxGeo(0.18, 0.32, 0.15), M(0xd32f2f), t * 0.75, t * -0.8, 0.62);
  }
  const len = riot ? 1.9 : 1.6;
  const gun = holdLongGun(h, len, M(riot ? 0x212121 : 0x3e2723));
  part(gun, boxGeo(0.4, 0.5, 0.5), M(0x5d4037), 0, -0.9, 0.1); // pump grip
  part(gun, boxGeo(0.3, 0.5, 0.4), M(0x4e342e), 0, 0.2, -0.05); // stock
  if (riot) part(gun, boxGeo(0.45, 0.6, 0.6), M(0x424242), 0, -0.5, -0.45); // drum mag
  h.tracer = 0xffab40;
  return h;
}

/** Plasma Trooper: holds a crackling plasma globe. Bigger globe each level, a giant bulb at Lv 5. */
export function makePlasma(level) {
  const doom = level >= 4;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: level >= 3 ? 0x4a148c : 0xeceff1, pants: level >= 3 ? 0x311b92 : 0x78909c, arms: level >= 3 ? 0x4a148c : 0xeceff1, face: 'soldier' });
  const { M } = h;
  const zap = level >= 2 ? 0xe040fb : 0x7c4dff;
  part(h.head, boxGeo(1.3, 0.4, 1.3), M(0x8e24aa), 0, 1.25, 0); // wild purple hair
  if (level >= 1) {
    // Safety Goggles
    part(h.head, boxGeo(1.25, 0.3, 0.12), M(0x212121), 0, 0.72, 0.64);
    part(h.head, boxGeo(0.4, 0.25, 0.06), glow(h, 0x80deea), -0.28, 0.72, 0.71);
    part(h.head, boxGeo(0.4, 0.25, 0.06), glow(h, 0x80deea), 0.28, 0.72, 0.71);
    // ...and thick yellow rubber gloves
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.1, 0.9, 1.1), M(0xfdd835), 0, -1.55, 0);
  }
  if (level >= 3) {
    // Plasma Tower: a Tesla coil backpack
    part(h.torso, boxGeo(1.2, 1.6, 0.6), M(0x37474f), 0, 0, -0.85);
    for (let i = 0; i < 3; i++) part(h.torso, boxGeo(0.7 - i * 0.15, 0.25, 0.7 - i * 0.15), M(0xb87333), 0, 1.0 + i * 0.35, -0.85);
    part(h.torso, boxGeo(0.45, 0.45, 0.45), glow(h, zap), 0, 2.2, -0.85);
  }
  // Globe held in front with both hands, on a little base.
  const holder = new THREE.Group();
  holder.position.set(0, 3.2, 1.6);
  h.body.add(holder);
  part(holder, boxGeo(0.7, 0.4, 0.7), M(0x263238), 0, -0.4, 0);
  const size = [0.9, 0.9, 1.1, 1.3, 1.5][level];
  const globe = part(holder, boxGeo(size, size, size), glow(h, zap), 0, size / 2 - 0.2, 0);
  globe.material.transparent = true;
  globe.material.opacity = 0.85;
  globe.rotation.y = 0.8;
  if (doom) {
    // Lightbulb of Doom: a giant glowing bulb floating overhead
    const bulb = part(h.body, boxGeo(1.6, 1.8, 1.6), glow(h, 0xfff59d), 0, 8.0, 0);
    bulb.rotation.y = 0.8;
    part(h.body, boxGeo(0.9, 0.6, 0.9), M(0x9e9e9e), 0, 6.9, 0);
  }
  setMuzzle(h, holder, 0, size / 2, 0);
  h.rightArm.rotation.set(-1.2, 0, 0.35);
  h.leftArm.rotation.set(-1.2, 0, -0.35);
  h.pose = { right: -1.2, left: -1.2, leftRecoil: 0.05 };
  h.recoilScale = 0.15;
  h.tracer = zap;
  h.tracerWidth = 0.18;
  return h;
}

/**
 * Pulse Trooper (alternate Plasma Trooper form): a technician in a cyan suit holding a pulse
 * emitter disc out in front. Lv 2 capacitor packs, Lv 3 a visor and amplifier dish, Lv 4 a
 * filament coil backpack, Lv 5 twin Sweeper laser pods, Lv 6 a glowing Arc Reactor and halo.
 */
export function makePlasmaPulse(level) {
  const arc = level >= 5;
  const suit = level >= 4 ? 0x0d2b45 : 0x00838f;
  const h = makeHumanoid({ skin: 0xc68642, shirt: suit, pants: level >= 4 ? 0x0a1a2a : 0x006064, arms: suit, face: 'soldier' });
  const { M } = h;
  const zap = arc ? 0x84ffff : 0x40c4ff;
  const shard = glow(h, 0xb388ff);
  part(h.head, boxGeo(1.3, 0.35, 1.3), M(0x263238), 0, 1.22, 0); // cap
  part(h.torso, boxGeo(0.35, 0.35, 0.08), shard, -0.55, 0.45, 0.52); // Dimension Shard emblem
  if (level >= 1) {
    // Capacitor Boost: glowing capacitor cells on the belt
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x37474f), 0, -0.85, 0);
    for (const x of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.3, 0.45, 0.3), glow(h, zap), x, -0.75, 0.62);
  }
  if (level >= 2) {
    // Pulse Amplifier: a visor and a little dish on the shoulder
    part(h.head, boxGeo(1.25, 0.32, 0.12), glow(h, zap), 0, 0.72, 0.64);
    part(h.torso, boxGeo(0.2, 0.6, 0.2), M(0x90a4ae), 0.8, 1.3, 0);
    part(h.torso, boxGeo(0.8, 0.12, 0.8), M(0xb0bec5), 0.8, 1.65, 0);
  }
  if (level >= 3) {
    // Charged Filament: a coil backpack with glowing filament rods
    part(h.torso, boxGeo(1.3, 1.6, 0.6), M(0x263238), 0, 0, -0.85);
    for (const x of [-0.4, 0.4]) {
      part(h.torso, boxGeo(0.15, 1.4, 0.15), glow(h, zap), x, 1.4, -0.85);
      part(h.torso, boxGeo(0.35, 0.2, 0.35), M(0xb87333), x, 0.8, -0.85);
    }
  }
  if (level >= 4) {
    // Sweeper: twin laser pods on the shoulders
    for (const x of [-1.25, 1.25]) {
      part(h.torso, boxGeo(0.6, 0.5, 1.0), M(0x37474f), x, 1.25, 0);
      part(h.torso, boxGeo(0.25, 0.25, 0.1), glow(h, 0xff1744), x, 1.25, 0.52);
    }
  }
  if (arc) {
    // Arc Reactor: a bright chest core and a halo ring floating overhead
    part(h.torso, boxGeo(0.7, 0.7, 0.12), glow(h, 0xffffff), 0, 0.35, 0.52);
    part(h.torso, boxGeo(1.0, 1.0, 0.06), glow(h, zap), 0, 0.35, 0.5);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      part(h.body, boxGeo(0.4, 0.15, 0.4), glow(h, zap), Math.cos(a) * 1.4, 6.6, Math.sin(a) * 1.4);
    }
  }
  // Pulse emitter: a flat disc held out in front with both hands, glowing core in the middle.
  const holder = new THREE.Group();
  holder.position.set(0, 3.0, 1.6);
  h.body.add(holder);
  const size = [1.0, 1.1, 1.2, 1.3, 1.4, 1.6][level];
  part(holder, boxGeo(size, 0.25, size), M(0x455a64), 0, 0, 0);
  const core = part(holder, boxGeo(size * 0.55, 0.35, size * 0.55), glow(h, zap), 0, 0.08, 0);
  core.rotation.y = 0.8;
  setMuzzle(h, holder, 0, 0.3, 0);
  h.rightArm.rotation.set(-1.1, 0, 0.3);
  h.leftArm.rotation.set(-1.1, 0, -0.3);
  h.pose = { right: -1.1, left: -1.1, leftRecoil: 0.05 };
  h.recoilScale = 0.12;
  h.tracer = zap;
  return h;
}
