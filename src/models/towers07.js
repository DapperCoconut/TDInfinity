// Tower models, file 7 of 12. Each makeX(level) builds one tower's look.
// In here:
// Necromancer, Engineer, Accelerator, Sentry, Grave, Hacker, Hologram, John, Juggernaut,
// Laser Railgunner, Slammer. (XWM Turret moved to machines7.js.)
// The list of which tower uses which builder is TOWER_MODELS in ../models.js.

import * as THREE from 'three';
import { makeMechTurret } from '../newmodels/e.js';
import { makeEngDevice } from '../newmodels/i.js';
import { boxGeo, makeHumanoid, part, setOpacity } from './kit.js';
import { addHandgun, glow, glowThing, gunMuzzle, helmet, holdLongGun, makeThing, setMuzzle, turret } from './bits.js';
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
 * Accelerator (alternate Phaser): a heavy suit with a plasma cannon. Lv 3 a second energy
 * canister, Lv 4 armor, Lv 5 a supercharger coil, Lv 6 a glowing gold-and-violet suit.
 */
export function makeAccelerator(level) {
  const vessel = level >= 5;
  const plasma = vessel ? 0xd500f9 : level >= 4 ? 0xff6d00 : 0x18ffff;
  const suitC = vessel ? 0x1a0033 : level >= 3 ? 0x263238 : 0xcfd8dc;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: suitC, pants: suitC, arms: suitC, face: 'soldier' });
  const { M } = h;
  const armor = M(vessel ? 0xffc400 : level >= 3 ? 0x455a64 : 0x90a4ae);
  part(h.head, boxGeo(1.45, 1.4, 1.45), armor, 0, 0.66, -0.03);
  part(h.head, boxGeo(1.25, 0.3, 0.08), glow(h, plasma), 0, 0.75, 0.7);
  part(h.torso, boxGeo(1.4, 1.8, 0.8), M(0x37474f), 0, 0, -0.9); // energy pack
  part(h.torso, boxGeo(0.35, 1.3, 0.1), glow(h, plasma), -0.35, 0, -1.32); // canister
  if (level >= 2) part(h.torso, boxGeo(0.35, 1.3, 0.1), glow(h, plasma), 0.35, 0, -1.32); // second canister
  if (level >= 3) {
    part(h.torso, boxGeo(2.2, 1.7, 1.2), armor, 0, 0.05, 0);
    for (const x of [-1.4, 1.4]) part(h.torso, boxGeo(0.85, 0.5, 1.35), armor, x, 1.0, 0);
  }
  if (vessel) for (const x of [-0.5, 0, 0.5]) part(h.head, boxGeo(0.2, 0.6, 0.2), M(0xffc400), x, 1.55, 0); // crest
  const len = level >= 4 ? 2.6 : 2.2;
  const gun = holdLongGun(h, len, M(vessel ? 0x311b92 : 0x37474f));
  part(gun, boxGeo(0.8, 1.0, 0.8), M(0x263238), 0, -0.5, 0); // breech
  const coils = level >= 4 ? 4 : 2;
  for (let i = 0; i < coils; i++) part(gun, boxGeo(0.7, 0.14, 0.7), glow(h, plasma), 0, -1.1 - i * 0.35, 0);
  part(gun, boxGeo(0.55, 0.3, 0.55), glow(h, plasma), 0, -len, 0);
  h.muzzles[0].position.y = -len - 0.2;
  h.tracer = plasma;
  h.tracerWidth = vessel ? 0.6 : level >= 3 ? 0.5 : 0.4;
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
 * John: a guy in a hoodie and jeans with a pistol. Top path: a vest at Lv 2, a silver Desert
 * Eagle at Lv 4, dual Deagles at Lv 5 and a glowing red rage headband at Lv 6. Bottom path: a
 * visor at Lv 2, a chef hat at Lv 3, an AK shotgun at Lv 4, armor at Lv 5, and at Lv 6 the
 * Slayer's axe on its back and a railgun on its shoulder.
 */
export function makeJohn(level, bottom = false) {
  const top = !bottom;
  const slayer = bottom && level >= 5;
  const shirt = slayer ? 0x263238 : 0x2e7d32;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x1e3a5f, arms: shirt, face: 'smile' });
  const { M } = h;
  // Hood down around the neck, and messy brown hair
  part(h.torso, boxGeo(1.7, 0.4, 1.2), M(slayer ? 0x1c262b : 0x1b5e20), 0, 0.95, -0.1);
  if (!(bottom && level >= 2)) part(h.head, boxGeo(1.3, 0.35, 1.3), M(0x4e342e), 0, 1.3, -0.02);
  if (top && level >= 1) part(h.torso, boxGeo(2.15, 1.6, 1.15), M(level >= 5 ? 0x3e2723 : 0x37474f), 0, 0.05, 0); // vest
  if (top && level >= 5) {
    // John Rage: a glowing red headband and red eyes
    part(h.head, boxGeo(1.3, 0.22, 1.3), glow(h, 0xff1744), 0, 1.0, 0);
    part(h.head, boxGeo(0.3, 0.15, 0.06), glow(h, 0xff1744), -0.28, 0.7, 0.62);
    part(h.head, boxGeo(0.3, 0.15, 0.06), glow(h, 0xff1744), 0.28, 0.7, 0.62);
  }
  if (bottom && level >= 1) {
    // Visor Upgrade
    part(h.head, boxGeo(1.3, 0.3, 0.12), M(0x212121), 0, 0.72, 0.64);
    part(h.head, boxGeo(1.1, 0.18, 0.06), glow(h, 0x40c4ff), 0, 0.72, 0.71);
  }
  if (bottom && level >= 2 && !slayer) {
    // Chef Knowledge: a tall white chef hat
    part(h.head, boxGeo(1.3, 0.3, 1.3), M(0xfafafa), 0, 1.3, 0);
    part(h.head, boxGeo(1.6, 0.9, 1.6), M(0xffffff), 0, 1.85, 0);
  }
  if (bottom && level >= 4) {
    part(h.torso, boxGeo(2.2, 1.7, 1.2), M(0x37474f), 0, 0.05, 0); // armor plates
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.15, 0.6, 1.15), M(0x455a64), 0, -0.2, 0);
  }
  if (slayer) {
    helmet(h, 0x263238, false);
    part(h.head, boxGeo(1.3, 0.25, 0.08), glow(h, 0x76ff03), 0, 0.72, 0.68);
    // Axe on its back
    const axe = part(h.torso, boxGeo(0.2, 2.8, 0.2), M(0x5d4037), 0.3, 0.1, -0.75);
    axe.rotation.z = 0.5;
    part(axe, boxGeo(0.12, 0.9, 1.0), M(0xb0bec5), 0, 1.15, -0.3);
    // Railgun on the left shoulder
    part(h.torso, boxGeo(0.5, 0.5, 2.4), M(0x212121), 1.2, 1.25, 0.4);
    for (let i = 0; i < 3; i++) part(h.torso, boxGeo(0.6, 0.6, 0.15), glow(h, 0x29b6f6), 1.2, 1.25, -0.2 + i * 0.6);
  }
  if (bottom && level >= 3) {
    // AK Shotgun: a rifle body with a drum mag
    const gun = holdLongGun(h, 1.9, M(0x3e2723));
    part(gun, boxGeo(0.36, 0.9, 0.46), M(0x212121), 0, -1.1, 0);
    part(gun, boxGeo(0.55, 0.55, 0.55), M(0x424242), 0, -0.6, 0.45);
    h.tracer = slayer ? 0x76ff03 : 0xffab40;
    return h;
  }
  const deagle = top && level >= 3;
  const opts = { body: deagle ? 0xb0bec5 : 0x2b2b2b, trim: top && level >= 5 ? 0xff1744 : null };
  const muzzles = [addHandgun(h, h.rightArm, opts)];
  if (top && level >= 4) {
    muzzles.push(addHandgun(h, h.leftArm, opts));
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.08);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.08);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
  } else {
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
  }
  h.muzzles = muzzles;
  h.tracer = top && level >= 5 ? 0xff5252 : 0xffe066;
  return h;
}
export const makeJohnBottom = (level) => makeJohn(level, true);

/**
 * Juggernaut (alternate Commando form): a huge armored gunner with a minigun. Top path: heavier
 * armor and a longer barrel, orange HE glow at Lv 6. Bottom path: two miniguns from Lv 4 and a
 * cybernetic cyan glow from Lv 5. A purple Dimension Shard emblem marks it as an alternate form.
 */
export function makeJuggernaut(level, bottom = false) {
  const top = !bottom;
  const cyber = bottom && level >= 4;
  const shirt = cyber ? 0x1c262b : 0x4e342e;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: 0x2b2b2b, arms: shirt, face: 'soldier' });
  const { M } = h;
  h.body.scale.setScalar(1.2);
  const shard = glow(h, 0xb388ff);
  const dark = M(0x212121);
  const plate = M(cyber ? 0x263238 : top && level >= 5 ? 0x3e2723 : 0x5d4037);
  // Bomb-suit style helmet and chest plate
  part(h.head, boxGeo(1.5, 1.4, 1.5), plate, 0, 0.65, -0.05);
  part(h.head, boxGeo(1.2, 0.35, 0.08), cyber ? glow(h, 0x18ffff) : M(0x90a4ae), 0, 0.7, 0.72);
  part(h.torso, boxGeo(2.2, 1.8, 1.2), plate, 0, 0.05, 0);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, -0.55, 0.45, 0.62);
  if (level >= 1) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.1, 0.55, 1.1), dark, 0, -1.75, 0); // gloves
  if (level >= 2) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.2, 0.7, 1.2), plate, 0, -0.2, 0); // shoulder pads
  if (top && level >= 5) part(h.torso, boxGeo(0.6, 0.6, 0.1), glow(h, 0xff6d00), 0, 0.3, 0.62); // HE core
  if (cyber && level >= 4) part(h.torso, boxGeo(0.6, 0.6, 0.1), glow(h, 0x18ffff), 0, 0.3, 0.62);
  part(h.torso, boxGeo(1.6, 1.8, 0.9), M(0x3e3a2a), 0, 0, -1.0); // ammo backpack

  const dual = bottom && level >= 3;
  const barrelMat = top && level >= 5 ? glow(h, 0xff6d00) : cyber ? glow(h, 0x18ffff) : M(0x1f1f1f);
  const long = top && level >= 3 ? 2.4 : 1.9;
  const gunOn = (arm) => {
    const gun = new THREE.Group();
    gun.position.set(0, -1.9, 0);
    arm.add(gun);
    const body = M(0x424242);
    part(gun, boxGeo(0.8, 1.2, 0.85), body, 0, -0.5, 0);
    const barrels = new THREE.Group();
    barrels.position.set(0, -1.1, 0);
    gun.add(barrels);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(barrels, boxGeo(0.15, long, 0.15), barrelMat, Math.cos(a) * 0.27, -long / 2, Math.sin(a) * 0.27);
    }
    part(barrels, boxGeo(0.7, 0.12, 0.7), body, 0, -long + 0.2, 0);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, -1.2 - long, 0);
    gun.add(muzzle);
    return { muzzle, barrels };
  };
  const right = gunOn(h.rightArm);
  h.muzzles = [right.muzzle];
  h.spin = [right.barrels];
  if (dual) {
    const left = gunOn(h.leftArm);
    h.muzzles.push(left.muzzle);
    h.spin.push(left.barrels);
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.08);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.08);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.1 };
  } else {
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.1 };
  }
  h.recoilScale = 0.2;
  h.tracer = top && level >= 5 ? 0xff9100 : cyber ? 0x18ffff : 0xffd740;
  return h;
}
export const makeJuggernautBottom = (level) => makeJuggernaut(level, true);

/**
 * Laser Railgunner (alternate Railgunner form): a trooper with a red laser rail rifle. Top path:
 * Rail Trooper armor from Lv 4, a bigger glowing rifle at Lv 5-6. Bottom path: sits behind a
 * mounted laser turret from Lv 4, twin barrels at Lv 5 and the giant XRT-9000 at Lv 6.
 */
export function makeLaserRailgunner(level, bottom = false) {
  const top = !bottom;
  const trooper = top && level >= 3;
  const shirt = trooper ? 0xeceff1 : 0x37474f;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: trooper ? 0x90a4ae : 0x263238, arms: shirt, face: 'soldier' });
  const { M } = h;
  const laser = 0xff1744;
  const shard = glow(h, 0xb388ff);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, -0.55, 0.45, 0.52);
  if (trooper) {
    helmet(h, 0xeceff1, false);
    part(h.head, boxGeo(1.25, 0.35, 0.08), glow(h, laser), 0, 0.72, 0.7);
    part(h.torso, boxGeo(2.2, 1.7, 1.2), M(0xcfd8dc), 0, 0.05, 0);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.15, 0.6, 1.15), M(0xb0bec5), 0, -0.2, 0);
  } else {
    part(h.head, boxGeo(1.35, 0.35, 1.35), M(0x263238), 0, 1.2, 0);
    part(h.head, boxGeo(0.35, 0.3, 0.1), glow(h, laser), -0.28, 0.7, 0.62); // targeting monocle
  }
  if (level >= 1) part(h.torso, boxGeo(1.5, 1.8, 0.7), M(0x263238), 0, 0, -0.85); // cooling / power pack
  if (level >= 2) part(h.torso, boxGeo(0.35, 1.4, 0.1), glow(h, laser), 0, 0, -1.22);

  if (top || level < 3) {
    const len = top && level >= 4 ? 3.6 : 3.0;
    const gun = holdLongGun(h, len, M(trooper ? 0xb0bec5 : 0x263238));
    const coils = top && level >= 4 ? 5 : 4;
    for (let i = 0; i < coils; i++) part(gun, boxGeo(0.45, 0.1, 0.55), glow(h, laser), 0, -0.8 - i * 0.5, 0);
    part(gun, boxGeo(0.22, 0.8, 0.3), M(0x111111), 0, -0.7, 0.35); // scope
    h.muzzles[0].position.y = -len - 0.1;
    h.tracer = laser;
    h.tracerWidth = top && level >= 4 ? 0.5 : 0.35;
    return h;
  }

  // Sentry / Dual Barrels / XRT-9000: a mounted laser cannon on the root.
  const xrt = level >= 5;
  const dual = level >= 4;
  const mount = new THREE.Group();
  h.root.add(mount);
  const steel = M(xrt ? 0x263238 : 0x546e7a);
  const barrelLen = xrt ? 8 : 5.5;
  const bw = xrt ? 1.3 : 0.6;
  const gy = xrt ? 3.2 : 2.7;
  const gz = xrt ? 1.8 : 1.2;
  part(mount, boxGeo(xrt ? 3.6 : 2.4, 1.6, xrt ? 3.6 : 2.4), steel, 0, 0.8, gz);
  part(mount, boxGeo(bw * (dual ? 2.4 : 1) + 0.6, bw + 0.6, 1.8), steel, 0, gy, gz);
  const xs = dual && !xrt ? [-0.5, 0.5] : [0];
  for (const x of xs) {
    part(mount, boxGeo(bw, bw, barrelLen), M(0x212121), x, gy, gz + barrelLen / 2 + 0.5);
    for (let i = 0; i < 5; i++) part(mount, boxGeo(bw + 0.25, bw + 0.25, 0.25), glow(h, laser), x, gy, gz + 1.3 + i * ((barrelLen - 1) / 5));
  }
  if (xrt) part(mount, boxGeo(0.8, 0.8, 0.8), shard, 0, gy + bw, gz); // XRT core
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, gy, gz + barrelLen + 0.6);
  mount.add(muzzle);
  h.muzzles = [muzzle];
  part(h.root, boxGeo(1.6, 1.0, 1.4), steel, 0, 0.5, -0.3); // seat
  h.lift = -0.9;
  h.bob = 0.02;
  h.body.position.y = h.lift;
  h.rightLeg.rotation.x = -Math.PI / 2;
  h.leftLeg.rotation.x = -Math.PI / 2;
  h.rightArm.rotation.set(-Math.PI / 2 + 0.2, 0, 0.2);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.2, 0, -0.2);
  h.pose = { right: -Math.PI / 2 + 0.2, left: -Math.PI / 2 + 0.2, leftRecoil: 0.35 };
  h.tracer = laser;
  h.tracerWidth = xrt ? 1.2 : 0.6;
  return h;
}
export const makeLaserRailgunnerBottom = (level) => makeLaserRailgunner(level, true);

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

