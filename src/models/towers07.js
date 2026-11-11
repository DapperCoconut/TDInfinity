// Tower models, file 7 of 12. Each makeX(level) builds one tower's look.
// In here:
// Necromancer, Engineer, Sentry, Grave, Hacker, Hologram, Slammer.
// (XWM Turret moved to machines7.js, John to people2.js, Accelerator and Laser Railgunner to people4.js.)
// The list of which tower uses which builder is TOWER_MODELS in ../models.js.

import * as THREE from 'three';
import { makeMechTurret } from '../newmodels/e.js';
import { makeEngDevice } from '../newmodels/i.js';
import { boxGeo, makeHumanoid, part, setOpacity } from './kit.js';
import { glow, glowThing, gunMuzzle, helmet, holdLongGun, makeThing, setMuzzle, turret } from './bits.js';
import { makeEnemy } from './enemy.js';

// ------------------------------------------------------------------ Necromancer, Engineer, Accelerator

/**
 * Necromancer: a hooded sorcerer with a skull staff. Lv 2 Soul Forge: green soul flames on the
 * staff, Lv 3 Skull Centrifuge: skulls spinning around it, Lv 4 Graveward: bone armor,
 * Lv 5 Apostle of Hades: a black-and-gold robe, a crown and a red glow.
 */
export function makeNecromancer(level) {
  const hades = level >= 4;
  const robe = hades ? 0x1a1a1a : level >= 3 ? 0x311b4a : 0x4a148c;
  const soul = hades ? 0xff1744 : level >= 1 ? 0x76ff03 : 0xb388ff;
  const h = makeHumanoid({ skin: 0xc8c3b4, shirt: robe, pants: robe, arms: robe, face: 'skull' });
  const { M } = h;
  // Hood and long robe
  const hood = M(hades ? 0x111111 : 0x2a0d4f);
  part(h.head, boxGeo(1.45, 1.4, 1.45), hood, 0, 0.68, -0.08);
  part(h.head, boxGeo(1.0, 0.25, 0.08), glow(h, soul), 0, 0.85, 0.7); // glowing eyes under the hood
  part(h.torso, boxGeo(2.3, 2.6, 1.3), M(robe), 0, -1.6, 0); // robe skirt
  if (hades) {
    part(h.torso, boxGeo(0.3, 2.6, 0.08), M(0xffc400), 0, -0.6, 0.66); // gold trim
    for (const x of [-0.45, 0, 0.45]) part(h.head, boxGeo(0.22, 0.55, 0.22), M(0xffc400), x, 1.6, 0); // crown
  }
  if (level >= 3) {
    // Graveward: bone shoulder guards and a rib-cage chest plate
    const bone = M(0xe8e4d0);
    for (const x of [-1.4, 1.4]) part(h.torso, boxGeo(0.9, 0.5, 1.3), bone, x, 1.0, 0);
    for (let i = 0; i < 3; i++) part(h.torso, boxGeo(1.6, 0.14, 0.08), bone, 0, 0.6 - i * 0.4, 0.55);
  }
  // Skull staff
  const len = hades ? 3.2 : 2.6;
  const staff = holdLongGun(h, len, M(hades ? 0x3e2723 : 0x4e342e));
  const skull = M(0xe8e4d0);
  part(staff, boxGeo(0.6, 0.6, 0.6), skull, 0, -len - 0.2, 0);
  part(staff, boxGeo(0.4, 0.15, 0.1), glow(h, soul), 0, -len - 0.2, 0.31);
  if (level >= 1) {
    // Soul Forge: soul flames around the skull
    for (const [x, z] of [[-0.35, 0], [0.35, 0], [0, -0.35]]) part(staff, boxGeo(0.18, 0.5, 0.18), glow(h, soul), x, -len - 0.5, z);
  }
  h.muzzles[0].position.y = -len - 0.5;
  if (level >= 2) {
    // Skull Centrifuge: skulls orbiting the necromancer
    const ring = new THREE.Group();
    ring.position.y = 3.2;
    h.body.add(ring);
    const n = hades ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      part(ring, boxGeo(0.5, 0.5, 0.5), skull, Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2);
      part(ring, boxGeo(0.3, 0.12, 0.1), glow(h, soul), Math.cos(a) * 2.2, 0.05, Math.sin(a) * 2.2 + 0.26);
    }
    h.spin = [ring];
    h.idleSpin = 2;
  }
  h.tracer = soul;
  h.tracerWidth = hades ? 0.35 : 0.25;
  return h;
}

/**
 * Engineer: hard hat, hi-vis vest and a rebar launcher. Lv 2 goggles, Lv 3 a radar dish on its
 * back, Lv 4 a converter backpack, Lv 5 heavy armor, Lv 6 a blueprint tablet and a glowing
 * visor, Lv 7 a red rocket launcher.
 */
export function makeEngineer(level) {
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: level >= 4 ? 0x455a64 : 0x5d6d7e, pants: 0x37474f, arms: level >= 4 ? 0x455a64 : 0x5d6d7e, face: 'soldier' });
  const { M } = h;
  helmet(h, level >= 6 ? 0xd32f2f : 0xfbc02d);
  part(h.torso, boxGeo(2.1, 1.9, 1.1), M(0xff6f00), 0, 0.05, 0); // hi-vis vest
  part(h.torso, boxGeo(2.15, 0.18, 1.15), M(0xe0e0e0), 0, 0.3, 0); // reflective strip
  if (level >= 1) part(h.head, boxGeo(1.1, 0.3, 0.15), glow(h, level >= 5 ? 0x00e5ff : 0xffab40), 0, 1.0, 0.68); // goggles
  part(h.torso, boxGeo(2.2, 0.3, 1.2), M(0x5d4037), 0, -0.85, 0); // tool belt
  part(h.torso, boxGeo(0.3, 0.5, 0.3), M(0x9e9e9e), 0.8, -1.1, 0.5); // wrench
  if (level >= 2) {
    // Makeshift Radar: a dish on a pole behind it
    part(h.torso, boxGeo(0.15, 2.2, 0.15), M(0x9e9e9e), -0.6, 1.6, -0.7);
    const dish = part(h.torso, boxGeo(1.2, 1.2, 0.15), M(0xbdbdbd), -0.6, 2.8, -0.7);
    dish.rotation.x = -0.5;
    part(h.torso, boxGeo(0.2, 0.2, 0.2), glow(h, 0xff1744), -0.6, 2.85, -0.55);
  }
  if (level >= 3) {
    // Auto Converter: a backpack full of scrap
    part(h.torso, boxGeo(1.5, 1.6, 0.8), M(0x795548), 0.2, -0.1, -0.9);
    part(h.torso, boxGeo(0.4, 0.4, 0.1), glow(h, 0x76ff03), 0.2, 0.2, -1.32);
  }
  if (level >= 4) {
    // Heavy Construction: armor plates
    for (const x of [-1.4, 1.4]) part(h.torso, boxGeo(0.8, 0.5, 1.3), M(0x607d8b), x, 1.0, 0);
  }
  if (level >= 5) part(h.leftArm, boxGeo(0.15, 0.9, 1.1), glow(h, 0x40c4ff), 0.55, -1.4, 0.3); // blueprint tablet
  const rocket = level >= 6;
  const len = rocket ? 2.0 : 1.8;
  const gun = holdLongGun(h, len, M(rocket ? 0xb71c1c : 0x616161));
  part(gun, boxGeo(0.55, 0.8, 0.6), M(rocket ? 0x7f0000 : 0x424242), 0, -0.4, 0); // receiver
  part(gun, boxGeo(rocket ? 0.6 : 0.2, 0.3, rocket ? 0.6 : 0.2), M(rocket ? 0x212121 : 0x8d6e63), 0, -len, 0); // muzzle / rebar tip
  h.muzzles[0].position.y = -len - 0.2;
  h.tracer = rocket ? 0xff7043 : 0xa1887f;
  h.flight = rocket ? { color: 0xff7043, size: 0.8, arc: 0.6 } : { color: 0x8d6e63, size: 0.7, arc: 0.4, long: true }; // rebar / splash rocket
  return h;
}

/**
 * Engineer sentry turret on a tripod. tier: 0-1 Sentry, 2-3 Rifle Sentry, 4-5 Minigun Sentry
 * (5 adds a shield), 6 War Machine Sentry with a rocket pod. `turret` turns, `muzzles[0]` fires.
 */
export function makeSentry(tier) {
  if (tier >= 200) return makeEngDevice(tier - 200); // Sentry Engineer devices
  if (tier >= 100) return makeMechTurret(tier - 100); // Mechanic turrets
  const u = makeThing();
  const { M } = u;
  const metal = M(tier >= 6 ? 0x5d4037 : tier >= 4 ? 0x455a64 : tier >= 2 ? 0x556b2f : 0x757575);
  for (const a of [0, 2.1, 4.2]) {
    const leg = part(u.body, boxGeo(0.2, 1.6, 0.2), M(0x424242), Math.sin(a) * 0.6, 0.7, Math.cos(a) * 0.6);
    leg.rotation.set(Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4);
  }
  const t = turret(u, 1.5);
  const big = tier >= 4 ? 1.3 : 1;
  part(t, boxGeo(1.1 * big, 0.8 * big, 1.3 * big), metal, 0, 0.3, 0);
  part(t, boxGeo(0.5, 0.2, 0.1), glow(u, tier >= 6 ? 0xff1744 : 0x76ff03), 0, 0.5 * big, 0.66 * big); // sensor
  const barrel = tier >= 2 ? 1.6 : 1.0;
  if (tier >= 4) {
    for (const x of [-0.18, 0.18]) for (const y of [0.15, 0.45]) part(t, boxGeo(0.14, 0.14, barrel), M(0x212121), x, y, 0.65 * big + barrel / 2);
  } else part(t, boxGeo(0.2, 0.2, barrel), M(0x212121), 0, 0.3, 0.65 + barrel / 2);
  gunMuzzle(u, t, 0, 0.3, 0.65 * big + barrel);
  if (tier >= 5) {
    // Improved Blueprints: a shield plate in front
    const sh = part(t, boxGeo(1.8, 1.2, 0.1), glowThing(u, 0x40c4ff), 0, 0.4, 0.9 * big);
    sh.material.transparent = true;
    sh.material.opacity = 0.45;
  }
  if (tier >= 6) {
    const pod = part(t, boxGeo(0.8, 0.8, 1.2), M(0x3e2723), 0.95, 0.6, 0);
    for (const y of [-0.2, 0.2]) part(pod, boxGeo(0.25, 0.25, 0.06), M(0xff6d00), 0, y, 0.61);
    u.cannon = gunMuzzle(u, t, 0.95, 0.6, 0.7);
    u.muzzles.pop();
  }
  u.tracer = tier >= 6 ? 0xffab40 : tier >= 4 ? 0xffd54f : 0xffe082;
  u.height = 2.8;
  return u;
}

/** Necromancer gravestone. Level 2 is taller with green runes, level 3 dark stone with red ones. */
export function makeGrave(lvl) {
  const u = makeThing();
  const { M } = u;
  const stone = M(lvl >= 3 ? 0x37474f : lvl >= 2 ? 0x78909c : 0x9e9e9e);
  const hgt = lvl >= 2 ? 2.6 : 2;
  part(u.body, boxGeo(2.0, 0.3, 1.4), M(0x5d4037), 0, 0.12, 0.3); // dirt mound
  part(u.body, boxGeo(1.3, hgt, 0.4), stone, 0, hgt / 2, 0);
  part(u.body, boxGeo(0.9, 0.3, 0.42), stone, 0, hgt + 0.1, 0); // rounded top
  const rune = lvl >= 3 ? glowThing(u, 0xff1744) : lvl >= 2 ? glowThing(u, 0x76ff03) : M(0x616161);
  part(u.body, boxGeo(0.15, 0.9, 0.05), rune, 0, hgt * 0.6, 0.22); // cross
  part(u.body, boxGeo(0.6, 0.15, 0.05), rune, 0, hgt * 0.7, 0.22);
  return u;
}

/**
 * Hacker: a dark hoodie with the hood up, hacking from a smartphone (Lv 1-3), green visor from
 * Lv 3, a wrist gadget from Lv 4, a botnet antenna pack at Lv 5. Top path: a glowing violet
 * overclocked gadget. Bottom path: an open laptop held in both hands.
 */
export function makeHacker(level, bottom = false) {
  const top = level >= 5 && !bottom;
  const laptop = level >= 5 && bottom;
  const code = top ? 0xd500f9 : 0x00e676;
  const hoodie = top ? 0x1a0033 : laptop ? 0x102027 : 0x263238;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: hoodie, pants: 0x212121, arms: hoodie, face: 'soldier' });
  const { M } = h;
  const dark = M(0x111111);
  part(h.head, boxGeo(1.45, 1.4, 1.3), M(hoodie), 0, 0.68, -0.12); // hood
  part(h.head, boxGeo(1.25, 0.25, 0.1), M(hoodie), 0, 1.28, 0.6); // hood brim
  part(h.torso, boxGeo(1.2, 0.5, 0.1), M(0x37474f), 0, -0.55, 0.52); // hoodie pocket
  part(h.torso, boxGeo(0.12, 0.7, 0.08), M(0xbdbdbd), -0.35, 0.55, 0.52); // drawstrings
  part(h.torso, boxGeo(0.12, 0.7, 0.08), M(0xbdbdbd), 0.35, 0.55, 0.52);
  if (level >= 1) {
    // Signal Booster: headphones
    part(h.head, boxGeo(1.6, 0.2, 0.25), dark, 0, 1.38, 0);
    for (const x of [-0.78, 0.78]) part(h.head, boxGeo(0.25, 0.55, 0.5), dark, x, 0.65, 0);
  }
  if (level >= 2) part(h.head, boxGeo(1.15, 0.28, 0.1), glow(h, code), 0, 0.82, 0.65); // 1337 visor
  if (level >= 4) {
    // Botnet: a server pack with an antenna and blinking lights
    part(h.torso, boxGeo(1.5, 1.7, 0.7), M(0x37474f), 0, 0, -0.85);
    for (const y of [-0.4, 0, 0.4]) part(h.torso, boxGeo(0.9, 0.1, 0.05), glow(h, code), 0, y, -1.22);
    part(h.torso, boxGeo(0.12, 1.8, 0.12), M(0x9e9e9e), 0.5, 1.6, -0.85);
    part(h.torso, boxGeo(0.28, 0.28, 0.28), glow(h, 0xff1744), 0.5, 2.55, -0.85);
  }
  const muzzle = new THREE.Object3D();
  if (laptop) {
    // Mainframe: an open laptop held out in front with both hands.
    h.rightArm.rotation.set(-1.2, 0, 0.35);
    h.leftArm.rotation.set(-1.2, 0, -0.35);
    h.pose = { right: -1.2, left: -1.2, leftRecoil: 0.05 };
    const lap = new THREE.Group();
    lap.position.set(0, 2.7, 1.9);
    h.body.add(lap);
    part(lap, boxGeo(2.2, 0.12, 1.5), M(0x455a64), 0, 0, 0); // base
    part(lap, boxGeo(2.0, 0.04, 0.9), dark, 0, 0.08, 0.2); // keyboard
    const lid = part(lap, boxGeo(2.2, 1.4, 0.1), M(0x455a64), 0, 0.68, -0.72);
    lid.rotation.x = -0.25;
    part(lid, boxGeo(2.0, 1.2, 0.04), glow(h, code), 0, 0, 0.06); // screen
    part(lid, boxGeo(0.35, 0.35, 0.05), M(0xeceff1), 0, 0, -0.07); // logo
    muzzle.position.set(0, 0.9, -0.5);
    lap.add(muzzle);
  } else {
    // Smartphone in the right hand (Lv 1-3), then a wrist gadget that shoots synapses.
    h.rightArm.rotation.set(-1.25, 0, 0.15);
    h.leftArm.rotation.set(-0.9, 0, -0.45);
    h.pose = { right: -1.25, left: -0.9, leftRecoil: 0.05 };
    if (level < 3) {
      const phone = part(h.rightArm, boxGeo(0.55, 0.12, 0.95), dark, 0, -2.05, 0.35);
      part(phone, boxGeo(0.45, 0.04, 0.8), glow(h, code), 0, 0.07, 0);
      muzzle.position.set(0, -2.1, 0.9);
    } else {
      const big = top ? 1.25 : 1;
      part(h.rightArm, boxGeo(1.15 * big, 0.7, 1.15 * big), M(top ? 0x311b92 : 0x37474f), 0, -1.35, 0); // gadget band
      part(h.rightArm, boxGeo(0.7, 0.12, 0.7), glow(h, code), 0, -1.35, 0.6 * big); // screen
      part(h.rightArm, boxGeo(0.3, 0.3, 0.3), glow(h, code), 0, -2.1, 0.45); // emitter
      if (top) for (const y of [-0.9, -1.8]) part(h.rightArm, boxGeo(1.2, 0.1, 1.2), glow(h, code), 0, y, 0); // overclock rings
      // The left hand holds a phone too.
      const phone = part(h.leftArm, boxGeo(0.55, 0.12, 0.95), dark, 0, -2.05, 0.35);
      part(phone, boxGeo(0.45, 0.04, 0.8), glow(h, code), 0, 0.07, 0);
      muzzle.position.set(0, -2.2, 0.45);
    }
    h.rightArm.add(muzzle);
  }
  h.muzzles = [muzzle];
  h.tracer = code;
  return h;
}
export const makeHackerBottom = (level) => makeHacker(level, true);

/**
 * Hacker hologram: a converted zombie rebuilt in see-through glowing cyan. It walks like a unit
 * (`walk` legs are swung by the view).
 */
export function makeHologram(def) {
  const h = makeEnemy(def);
  for (const m of h.mats) {
    m.color?.setHex(0x00bcd4);
    if (m.map) m.map = null;
    m.userData.glow = 0x00838f;
    m.emissive?.setHex(0x00838f);
    m.needsUpdate = true;
  }
  setOpacity(h, 0.55);
  h.root.scale.setScalar(def.scale ?? 1);
  if (h.leftLeg && h.rightLeg) h.walk = [h.leftLeg, h.rightLeg];
  if (h.leftArm && h.rightArm) h.leftArm.rotation.x = h.rightArm.rotation.x = -Math.PI / 2; // zombie arms out
  h.muzzles = [];
  h.wheels = [];
  h.height = (def.h ?? 5.2) * (def.scale ?? 1);
  h.holo = true;
  return h;
}

/**
 * Slammer (alternate Enforcer form): a strong woman with a big sledgehammer. Top path: a bigger,
 * heavier hammer (fiery at Lv 6). Bottom path: a glowing blue Shock Hammer from Lv 4 with a
 * battery pack. A purple Dimension Shard emblem marks it as an alternate form.
 */
export function makeSlammer(level, bottom = false) {
  const top = !bottom;
  const shock = bottom && level >= 3;
  const shirt = shock ? 0x0d47a1 : 0xad1457;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt, pants: 0x37474f, arms: 0xf1c27d, face: 'smile' });
  const { M } = h;
  const shard = glow(h, 0xb388ff);
  // Ponytail and a headband
  part(h.head, boxGeo(1.3, 0.4, 1.3), M(0x6d4c41), 0, 1.3, -0.02);
  part(h.head, boxGeo(0.5, 1.0, 0.5), M(0x6d4c41), 0, 0.9, -0.85);
  part(h.head, boxGeo(1.3, 0.2, 1.3), M(shock ? 0x40c4ff : 0xffffff), 0, 1.05, 0);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, -0.55, 0.45, 0.52);
  if (level >= 1) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.05, 0.5, 1.05), M(0x212121), 0, -1.75, 0); // gloves
  if (level >= 2) part(h.torso, boxGeo(2.1, 0.35, 1.1), M(0x3e2723), 0, -0.85, 0); // lifting belt
  if (level >= 3) part(h.torso, boxGeo(2.15, 1.5, 1.15), M(shock ? 0x1565c0 : 0x880e4f), 0, 0.15, 0); // armor
  if (shock) {
    part(h.torso, boxGeo(1.3, 1.4, 0.6), M(0x263238), 0, 0, -0.8); // battery pack
    part(h.torso, boxGeo(0.3, 1.0, 0.1), glow(h, 0x40c4ff), 0, 0, -1.12);
  }
  // Sledgehammer
  const big = top ? [1, 1, 1.15, 1.3, 1.45, 1.65][level] : 1 + level * 0.05;
  const ham = new THREE.Group();
  ham.position.set(0, -1.9, 0);
  ham.scale.setScalar(big);
  h.rightArm.add(ham);
  part(ham, boxGeo(0.28, 2.6, 0.28), M(0x5d4037), 0, -1.1, 0);
  const headMat = top && level >= 5 ? glow(h, 0xff6d00) : shock ? M(0x1e88e5) : M(0x616161);
  part(ham, boxGeo(0.9, 0.9, 1.6), headMat, 0, -2.4, 0);
  if (shock) for (const z of [-0.6, 0.6]) part(ham, boxGeo(1.0, 0.2, 0.2), glow(h, 0x80d8ff), 0, -2.4, z);
  if (top && level >= 3) part(ham, boxGeo(1.0, 1.0, 0.2), M(0x212121), 0, -2.4, 0); // steel band
  setMuzzle(h, ham, 0, -2.6, 0);
  h.rightArm.rotation.set(-2.6, 0, 0.15);
  h.leftArm.rotation.set(-2.4, 0, -0.3);
  h.pose = { right: -2.6, left: -2.4, leftRecoil: 0 };
  h.swing = 2.2;
  h.melee = true;
  h.tracer = shock ? 0x40c4ff : top && level >= 5 ? 0xff6d00 : 0xffffff;
  return h;
}
export const makeSlammerBottom = (level) => makeSlammer(level, true);

