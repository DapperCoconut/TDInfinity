// Tower models, file 10 of 12. Each makeX(level) builds one tower's look.
// In here:
// Elf Camp, Relic, Jester, Cryomancer, Hallow Punk, Harvester, Snowballer Frost, Elementalist,
// Firework Tech, Biologist, Warlock, Spotlight Tech, Star Cannon, Artillery, Shock Trooper,
// Ice Breaker.
// The list of which tower uses which builder is TOWER_MODELS in ../models.js.

import * as THREE from 'three';
import { boxGeo, makeHumanoid, part } from './kit.js';
import { boxRow, glow, gunMuzzle, helmet, holdLongGun, inHand, makeThing, present, pumpkin, setMuzzle } from './bits.js';

/**
 * Elf Camp (event). Lv 1 a striped tent; Lv 2 a snow fort and a snowman; Lv 3 a log workshop with
 * a toy cannon; Lv 4 a gingerbread cookie factory with a smoking chimney and a lookout; Lv 5 a red
 * and gold toy fortress with towers, a present mountain, lights and a giant star.
 */
export function makeElfCamp(level) {
  const u = makeThing();
  const { M } = u;
  const snow = M(0xf5f9ff);
  const red = M(0xc62828);
  const green = M(0x2e7d32);
  const gold = M(0xffc107);
  part(u.body, boxGeo(4.6, 0.3, 4.6), level >= 4 ? M(0xe3f2fd) : snow, 0, 0.15, 0);
  if (level === 0) {
    // A striped tent
    for (const side of [-1, 1]) {
      const wall = part(u.body, boxGeo(0.15, 2.4, 2.6), side < 0 ? red : green, side * 0.75, 1.2, -0.4);
      wall.rotation.z = side * 0.55;
    }
    part(u.body, boxGeo(0.25, 0.25, 2.8), gold, 0, 2.25, -0.4);
    part(u.body, boxGeo(0.8, 1.0, 0.1), M(0x4e342e), 0, 0.7, 0.85);
  } else if (level <= 2) {
    // Log cabin (Lv 3: a workshop with a red roof)
    const wood = M(level >= 2 ? 0x8d5524 : 0xa1887f);
    part(u.body, boxGeo(2.6, 1.8, 2.0), wood, 0, 1.2, -0.6);
    for (const side of [-1, 1]) part(u.body, boxGeo(1.6, 0.25, 2.3), level >= 2 ? red : snow, side * 0.65, 2.4, -0.6).rotation.z = side * -0.6;
    part(u.body, boxGeo(0.7, 1.1, 0.1), M(0x4e342e), 0, 0.85, 0.42);
    part(u.body, boxGeo(0.5, 0.4, 0.08), glow(u, 0xffe082), 0.85, 1.4, 0.42);
  } else {
    // Lv 4: a gingerbread factory. Lv 5: a red and gold toy fortress.
    const fort = level >= 4;
    const wall = M(fort ? 0xb71c1c : 0xa0522d);
    const trim = fort ? gold : snow;
    part(u.body, boxGeo(3.4, 2.6, 2.4), wall, 0, 1.6, -0.8);
    part(u.body, boxGeo(3.6, 0.3, 2.6), trim, 0, 3.0, -0.8);
    boxRow(u.body, 5, 0.75, boxGeo(0.35, 0.4, 0.35), trim, 3.3, 0.35); // battlements / icing
    part(u.body, boxGeo(1.0, 1.4, 0.1), M(0x4e342e), 0, 0.9, 0.42);
    for (const x of [-1.1, 1.1]) part(u.body, boxGeo(0.6, 0.6, 0.08), glow(u, 0xffe082), x, 1.8, 0.42);
    part(u.body, boxGeo(0.7, 1.6, 0.7), M(0x5d4037), 1.1, 3.8, -1.4); // chimney
    part(u.body, boxGeo(0.5, 0.3, 0.5), glow(u, 0xff9100), 1.1, 4.7, -1.4); // oven glow
    if (fort) {
      for (const x of [-1.9, 1.9]) {
        part(u.body, boxGeo(1.0, 4.4, 1.0), red, x, 2.2, -1.6); // towers
        part(u.body, boxGeo(1.2, 0.3, 1.2), gold, x, 4.5, -1.6);
        part(u.body, boxGeo(0.5, 0.9, 0.5), green, x, 5.1, -1.6);
      }
      part(u.body, boxGeo(0.2, 2.0, 0.2), gold, 0, 4.3, -0.8); // flagpole with a star
      part(u.body, boxGeo(1.0, 1.0, 0.25), glow(u, 0xffea00), 0, 5.5, -0.8).rotation.z = Math.PI / 4;
    } else {
      part(u.body, boxGeo(0.25, 3.0, 0.25), M(0x8d5524), -1.9, 1.5, 1.6); // lookout post
      part(u.body, boxGeo(1.0, 0.2, 1.0), M(0x8d5524), -1.9, 3.0, 1.6);
    }
  }
  if (level >= 1) {
    // Snow fort wall and a snowman
    if (level < 4) boxRow(u.body, 4, 0.6, boxGeo(0.55, 0.55, 0.55), snow, 0.55, 1.9);
    part(u.body, boxGeo(0.9, 0.9, 0.9), snow, 1.8, 0.75, 1.0);
    part(u.body, boxGeo(0.6, 0.6, 0.6), snow, 1.8, 1.5, 1.0);
    part(u.body, boxGeo(0.12, 0.12, 0.35), M(0xff7043), 1.8, 1.5, 1.4);
    part(u.body, boxGeo(0.5, 0.4, 0.5), M(0x212121), 1.8, 1.95, 1.0);
  }
  if (level >= 2) {
    // A toy cannon (Lv 4+: two)
    for (const x of level >= 3 ? [-1.8, -0.9] : [-1.8]) {
      part(u.body, boxGeo(0.7, 0.4, 0.7), M(0x5d4037), x, 0.5, 1.0);
      part(u.body, boxGeo(0.35, 0.35, 1.1), M(level >= 3 ? 0xffc107 : 0x37474f), x, 0.85, 1.35).rotation.x = -0.3;
    }
  }
  if (level >= 4) {
    // A mountain of presents and Christmas lights
    for (const [x, y, z, c, r, s] of [[-1.4, 0.65, 0.1, 0x1e88e5, 0xffeb3b, 0.9], [1.6, 0.6, 0.4, 0x43a047, 0xfafafa, 0.8], [-1.6, 1.4, 0.2, 0xd500f9, 0xffd54f, 0.6], [1.4, 1.25, 0.5, 0xffd54f, 0xc62828, 0.6]]) {
      present(u, u.body, c, r, s).position.set(x, y, z);
    }
    for (let i = 0; i < 8; i++) part(u.body, boxGeo(0.18, 0.18, 0.18), glow(u, [0xff1744, 0x00e676, 0xffea00, 0x2979ff][i % 4]), -1.6 + i * 0.46, 2.75, 0.45);
  }
  gunMuzzle(u, u.body, 0, 1.0, 0.6);
  u.tracer = 0xffffff;
  return u;
}

/**
 * Relic (event). An ancient stone shrine with a floating relic crystal: Lv 1 a cracked altar,
 * Lv 2 armor plates, Lv 3 banners and pillars, Lv 4 a warden statue, Lv 5 a golden temple, and
 * Lv 6 a blazing sanctum with a huge orange crystal and a ring of fire runes.
 */
export function makeRelic(level) {
  const u = makeThing();
  const { M } = u;
  const stone = M(level >= 4 ? 0xd7ccc8 : 0x9e9e8e);
  const dark = M(0x5d5a48);
  const gold = M(0xffc107);
  part(u.body, boxGeo(4.4, 0.5, 4.4), dark, 0, 0.25, 0);
  part(u.body, boxGeo(2.6, 1.6, 2.6), stone, 0, 1.3, 0); // altar
  if (level >= 1) for (const x of [-1.35, 1.35]) part(u.body, boxGeo(0.15, 1.2, 2.2), M(0x78909c), x, 1.3, 0); // armor plates
  if (level >= 2) {
    for (const [x, z] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) {
      part(u.body, boxGeo(0.6, 3.2, 0.6), stone, x, 2.1, z); // pillars
      if (level >= 4) part(u.body, boxGeo(0.8, 0.3, 0.8), gold, x, 3.8, z);
    }
    for (const x of [-1.8, 1.8]) part(u.body, boxGeo(0.08, 1.4, 0.9), M(0xc62828), x, 2.6, 1.3); // banners
  }
  if (level >= 3) {
    // A small warden statue behind the altar
    part(u.body, boxGeo(0.9, 2.0, 0.6), dark, 0, 3.1, -1.6);
    part(u.body, boxGeo(0.6, 0.6, 0.6), dark, 0, 4.4, -1.6);
    part(u.body, boxGeo(0.15, 2.6, 0.1), M(0x90a4ae), 0.7, 3.3, -1.4);
  }
  if (level >= 4) part(u.body, boxGeo(4.4, 0.3, 4.4), gold, 0, 4.1, 0); // temple roof ring
  const color = level >= 5 ? 0xff6d00 : level >= 4 ? 0xffd740 : 0x40c4ff;
  const size = 0.9 + level * 0.15;
  const crystal = part(u.body, boxGeo(size, size * 1.6, size), glow(u, color), 0, 3.0 + level * 0.1, 0);
  crystal.rotation.y = Math.PI / 4;
  if (level >= 5) for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    part(u.body, boxGeo(0.4, 0.1, 0.4), glow(u, 0xff9100), Math.cos(a) * 2.6, 0.55, Math.sin(a) * 2.6); // fire runes
  }
  gunMuzzle(u, u.body, 0, 3.0, 0);
  u.tracer = color;
  return u;
}

/**
 * Jester (event). Lv 1 purple and gold with a two-point hat; Lv 2 juggling balls and curled shoes;
 * Lv 3 icy blue motley with frost bells and ice bombs; Lv 4 toxic green with goggles and a bomb
 * bandolier; Lv 5 the Harlequin of Doom: black and red diamonds, a three-point hat, a mask, a
 * cape and a bomb in each hand.
 */
export function makeJester(level) {
  const doom = level >= 4;
  const [ca, cb] = [[0x7b1fa2, 0xffc107], [0x7b1fa2, 0xffc107], [0x1565c0, 0xe3f2fd], [0x2e7d32, 0x6a1b9a], [0x111111, 0xd50000]][level];
  const h = makeHumanoid({ skin: 0xffe0bd, shirt: ca, pants: cb, arms: cb });
  const { M } = h;
  const a = M(ca);
  const b = M(cb);
  part(h.torso, boxGeo(1.0, 2.02, 1.02), b, 0.5, 0, 0); // motley halves
  if (doom) for (const [x, y] of [[-0.5, 0.5], [0.5, -0.5]]) part(h.torso, boxGeo(0.6, 0.6, 1.04), a, x, y, 0).rotation.z = Math.PI / 4; // diamonds
  part(h.torso, boxGeo(2.4, 0.35, 1.3), M(doom ? 0x9e9e9e : 0xfafafa), 0, 1.0, 0); // ruff collar
  if (level >= 1) for (const leg of [h.leftLeg, h.rightLeg]) part(leg, boxGeo(1.0, 0.3, 1.8), a, 0, -1.9, 0.5); // curled shoes
  // Floppy hat: two points (Lv 5: three) with bells (frosty from Lv 3)
  const bell = level === 2 ? glow(h, 0x80d8ff) : level === 3 ? glow(h, 0x76ff03) : M(0xffeb3b);
  part(h.head, boxGeo(1.35, 0.35, 1.35), a, 0, 1.3, 0);
  for (const side of doom ? [-1, 0, 1] : [-1, 1]) {
    const tip = part(h.head, boxGeo(0.4, doom ? 1.7 : 1.3, 0.4), side < 0 ? a : b, side * 0.6, 1.9, side === 0 ? -0.3 : 0);
    tip.rotation.z = side * -0.7;
    part(h.head, boxGeo(0.3, 0.3, 0.3), bell, side * 1.2, side === 0 ? 2.8 : 2.25, side === 0 ? -0.3 : 0);
  }
  if (level >= 1) {
    // Juggling balls hovering over the head
    const balls = [0xff1744, 0x2979ff, 0xffea00, 0x00e676, 0xd500f9];
    for (let i = 0; i < (doom ? 5 : 3); i++) {
      const ang = (i / (doom ? 5 : 3)) * Math.PI;
      part(h.body, boxGeo(0.4, 0.4, 0.4), level >= 2 ? glow(h, balls[i]) : M(balls[i]), Math.cos(ang) * 1.6, 7.6 + Math.sin(ang) * 0.9, 0);
    }
  }
  if (level >= 2) boxRow(h.torso, 3, 0.5, boxGeo(0.4, 0.4, 0.4), glow(h, 0x80d8ff), -0.85, 0.62); // ice bombs on the belt
  if (level >= 3) {
    part(h.torso, boxGeo(2.6, 0.3, 1.15), M(0x4e342e), 0, 0.2, 0).rotation.z = 0.6; // bandolier
    boxRow(h.torso, 4, 0.45, boxGeo(0.3, 0.45, 0.3), glow(h, 0x76ff03), 0.4, 0.62); // poison vials
    part(h.head, boxGeo(1.25, 0.3, 0.1), M(0x263238), 0, 0.85, 0.63); // goggles
    for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.3, 0.22, 0.05), glow(h, 0x76ff03), x, 0.85, 0.69);
  }
  if (doom) {
    part(h.head, boxGeo(1.25, 0.75, 0.1), M(0xfafafa), 0, 0.6, 0.64); // mask
    for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.22, 0.18, 0.05), glow(h, 0xff1744), x, 0.75, 0.7);
    part(h.head, boxGeo(0.5, 0.1, 0.05), M(0x111111), 0, 0.35, 0.7);
    part(h.torso, boxGeo(2.4, 3.8, 0.15), M(0x6a0000), 0, -0.8, -0.62); // cape
    const left = inHand(h, h.leftArm);
    part(left, boxGeo(0.8, 0.8, 0.8), M(0x212121), 0, -0.35, 0);
    part(left, boxGeo(0.1, 0.5, 0.1), glow(h, 0xff1744), 0, 0.25, 0);
  }
  const hand = inHand(h);
  const bombColor = [0x212121, 0x212121, 0x0d47a1, 0x1b5e20, 0x311b92][level];
  part(hand, boxGeo(0.75 + level * 0.08, 0.75 + level * 0.08, 0.75 + level * 0.08), M(bombColor), 0, -0.3, 0);
  part(hand, boxGeo(0.08, 0.45, 0.08), glow(h, doom ? 0xff1744 : 0xff9100), 0, 0.3, 0);
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(doom ? -2.2 : -0.6, 0, -0.3);
  h.pose = { right: -2.8, left: doom ? -2.2 : -0.6, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = { color: bombColor === 0x212121 ? 0x4a148c : bombColor, size: 0.6 + level * 0.06, arc: 4, glowing: true };
  return h;
}

/**
 * Cryomancer (event). Lv 1 a parka and a small sprayer; Lv 2 a fur hood, goggles and gloves; Lv 3
 * twin tanks with hoses; Lv 4 the Ice Commando: helmet, vest and a frost cannon; Lv 5 Winter's
 * Fury: glowing ice armor, an icicle crown and a huge crystal cannon.
 */
export function makeCryomancer(level) {
  const fury = level >= 4;
  const commando = level >= 3;
  const coat = [0x81d4fa, 0x4fc3f7, 0x29b6f6, 0x37474f, 0x0d47a1][level];
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: coat, pants: commando ? 0x263238 : 0x546e7a, arms: coat });
  const { M } = h;
  const ice = glow(h, fury ? 0xb3e5fc : 0x80d8ff);
  const fur = M(0xeceff1);
  if (commando) {
    helmet(h, fury ? 0xe1f5fe : 0x455a64, false);
    part(h.torso, boxGeo(2.15, 1.7, 1.2), M(fury ? 0x81d4fa : 0x546e7a), 0, 0.2, 0); // vest / ice armor
  } else {
    part(h.head, boxGeo(1.45, 0.5, 1.45), M(coat), 0, 1.25, 0);
    if (level >= 1) part(h.head, boxGeo(1.6, 0.25, 1.6), fur, 0, 1.1, 0); // fur hood rim
  }
  part(h.torso, boxGeo(2.1, 0.3, 1.1), fur, 0, -0.9, 0); // fur trim
  if (level >= 1) {
    part(h.head, boxGeo(1.25, 0.32, 0.1), M(0x263238), 0, 0.85, 0.63); // goggles
    for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.35, 0.22, 0.05), ice, x, 0.85, 0.69);
    for (const arm of [h.leftArm, h.rightArm]) part(arm, boxGeo(1.1, 0.6, 1.1), fur, 0, -1.8, 0); // gloves
  }
  // Tanks: one small, then two big ones with hoses
  const tanks = level >= 2 ? [-0.5, 0.5] : [0];
  const tankH = level >= 2 ? 2.2 : 1.4;
  for (const x of tanks) {
    part(h.torso, boxGeo(0.75, tankH, 0.75), M(fury ? 0xe1f5fe : 0x90a4ae), x, 0.1, -0.9);
    part(h.torso, boxGeo(0.78, 0.2, 0.78), ice, x, 0.5, -0.9);
  }
  if (level >= 2) part(h.torso, boxGeo(0.2, 0.2, 1.6), M(0x37474f), -0.8, -0.6, -0.1); // hose
  if (fury) {
    for (const side of [-1, 1]) part(h.torso, boxGeo(0.7, 0.7, 1.3), ice, side * 1.3, 1.1, 0); // ice pauldrons
    for (const x of [-0.45, 0, 0.45]) part(h.head, boxGeo(0.22, 0.8, 0.22), ice, x, 1.9, 0.2); // icicle crown
  }
  const gun = holdLongGun(h, 1.4 + level * 0.35, M(commando ? 0x263238 : 0x546e7a));
  const len = 1.4 + level * 0.35;
  const ns = 0.4 + level * 0.12;
  part(gun, boxGeo(ns, 0.5, ns), ice, 0, -len, 0); // nozzle
  if (commando) for (const side of [-1, 1]) part(gun, boxGeo(0.15, len * 0.8, 0.15), ice, side * 0.3, -len * 0.5, 0); // cooling fins
  h.tracer = fury ? 0xe1f5fe : 0x80d8ff;
  h.tracerWidth = 0.25 + level * 0.08;
  return h;
}

/**
 * Hallow Punk (Hallowboomer form). Lv 1 an orange mohawk and a leather jacket with a pumpkin tube;
 * Lv 2 purple witch-fire, spiked shoulders and a witch hat; Lv 3 twin glowing launchers and chains;
 * Lv 4 the Queen of the Blood Ember: crown, blood-red cape, ember wings and a skull launcher.
 */
export function makeHallowPunk(level) {
  const queen = level >= 3;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: queen ? 0x3e0000 : 0x212121, pants: queen ? 0x4a0000 : 0x263238, arms: queen ? 0x3e0000 : 0x212121 });
  const { M } = h;
  const fireC = [0xff6d00, 0xb388ff, 0xd500f9, 0xff1744][level];
  const fire = glow(h, fireC);
  if (level !== 1) for (let i = 0; i < 4; i++) part(h.head, boxGeo(0.3, 0.55 + level * 0.15, 0.3), fire, 0, 1.4 + level * 0.07, 0.45 - i * 0.32); // mohawk
  boxRow(h.torso, 3, 0.5, boxGeo(0.15, 0.15, 0.08), M(0xb0bec5), 0.7, 0.53); // studs
  if (level >= 1) {
    for (const side of [-1, 1]) {
      part(h.torso, boxGeo(0.7, 0.4, 1.2), M(0x424242), side * 1.25, 1.1, 0);
      for (const z of [-0.3, 0.3]) part(h.torso, boxGeo(0.15, 0.5, 0.15), M(0xcfd8dc), side * 1.35, 1.5, z); // spikes
    }
  }
  if (level === 1) {
    // Witch hat with a purple flame band
    part(h.head, boxGeo(2.0, 0.15, 2.0), M(0x212121), 0, 1.25, 0);
    part(h.head, boxGeo(1.1, 1.0, 1.1), M(0x212121), 0, 1.8, 0);
    part(h.head, boxGeo(0.6, 0.9, 0.6), M(0x212121), 0.2, 2.6, -0.2).rotation.z = -0.4;
    part(h.head, boxGeo(1.15, 0.2, 1.15), fire, 0, 1.4, 0);
  }
  if (level >= 2) part(h.torso, boxGeo(2.6, 0.2, 1.15), M(0x9e9e9e), 0, 0.3, 0).rotation.z = -0.5; // chains
  if (queen) {
    const gold = M(0xffc107);
    part(h.head, boxGeo(1.4, 0.3, 1.4), gold, 0, 1.3, 0);
    for (const x of [-0.45, 0, 0.45]) part(h.head, boxGeo(0.22, 0.5, 0.22), gold, x, 1.6, 0.55);
    part(h.head, boxGeo(0.25, 0.25, 0.1), fire, 0, 1.55, 0.72);
    part(h.torso, boxGeo(2.4, 4.0, 0.15), M(0x8b0000), 0, -0.9, -0.62); // cape
    for (const side of [-1, 1]) {
      const wing = part(h.torso, boxGeo(2.4, 1.6, 0.12), fire, side * 1.6, 0.9, -0.75);
      wing.rotation.z = side * 0.4;
    }
  }
  // Shoulder launchers (Lv 3+: two)
  const len = 2.2 + level * 0.4;
  for (const x of level >= 2 ? [-1.5, 1.5] : [-1.5]) {
    const tube = new THREE.Group();
    tube.position.set(x, 4.6, 0);
    h.body.add(tube);
    part(tube, boxGeo(0.7 + level * 0.08, 0.7 + level * 0.08, len), M(queen ? 0x212121 : 0x37474f), 0, 0, 0.2);
    if (level >= 2) part(tube, boxGeo(0.8, 0.15, len * 0.6), fire, 0, 0.42, 0.2);
    if (queen) part(tube, boxGeo(1.0, 1.0, 1.0), M(0xe8e4d0), 0, 0, 0.2 + len / 2).add(new THREE.Object3D());
    else pumpkin(h, tube, 0.9, fireC).position.set(0, 0, 0.2 + len / 2);
    if (x < 0) {
      const m = new THREE.Object3D();
      m.position.set(0, 0, 0.7 + len / 2);
      tube.add(m);
      h.muzzles = [m];
    }
  }
  h.rightArm.rotation.set(-2.6, 0, 0.1);
  h.leftArm.rotation.set(level >= 2 ? -2.6 : -1.2, 0, level >= 2 ? -0.1 : -0.3);
  h.pose = { right: -2.6, left: level >= 2 ? -2.6 : -1.2, leftRecoil: 0 };
  h.flight = { color: fireC, size: 0.7 + level * 0.15, arc: 0.8, glowing: true };
  h.tracer = fireC;
  return h;
}

/**
 * Harvester (event). Lv 1 a plain scarecrow with a staff; Lv 2 thorny vines and crows; Lv 3 a
 * bigger hat and a basket of pumpkins; Lv 4 glowing green eyes and a sickle; Lv 5 frosty blue with
 * icicles and a tattered cloak; Lv 6 a giant reaper scythe, a lantern and a raven on its shoulder.
 */
export function makeHarvester(level) {
  const cold = level >= 4;
  const h = makeHumanoid({ skin: 0xd7b377, shirt: cold ? 0x37474f : 0x8d3b2a, pants: cold ? 0x263238 : 0x3e5a7a, arms: 0xd7b377, face: 'skull' });
  const { M } = h;
  const eyeC = [0xff9100, 0xff9100, 0xff9100, 0x76ff03, 0x80d8ff, 0x00e5ff][level];
  const eye = glow(h, eyeC);
  const straw = M(cold ? 0xb0bec5 : 0xe1c16e);
  part(h.head, boxGeo(1.3, 1.3, 1.3), M(cold ? 0x90a4ae : 0xc8a165), 0, 0.6, 0); // sack head
  for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.25 + (level >= 3 ? 0.1 : 0), 0.25, 0.05), eye, x, 0.75, 0.66);
  part(h.head, boxGeo(0.8, 0.12, 0.05), M(0x3e2723), 0, 0.35, 0.66);
  const brim = level >= 2 ? 2.8 : 2.2;
  part(h.head, boxGeo(brim, 0.15, brim), straw, 0, 1.25, 0);
  part(h.head, boxGeo(1.2, level >= 2 ? 1.0 : 0.6, 1.2), straw, 0, level >= 2 ? 1.8 : 1.6, 0);
  if (level >= 2) part(h.head, boxGeo(0.2, 0.9, 0.2), straw, 0.2, 2.6, 0).rotation.z = -0.5; // pointy tip
  if (!cold) boxRow(h.torso, 3, 0.7, boxGeo(0.12, 2.04, 1.04), M(0x5d1f15), 0, 0); // plaid
  for (const [x, y] of [[-0.9, -1.1], [0.9, -1.1]]) part(h.torso, boxGeo(0.3, 0.5, 0.3), straw, x, y, 0.3); // straw tufts
  if (level >= 1) {
    // Vines wrapping the body, and a crow on the hat
    for (const y of [0.6, -0.2]) part(h.torso, boxGeo(2.1, 0.15, 1.1), M(0x33691e), 0, y, 0).rotation.z = 0.25;
    part(h.head, boxGeo(0.4, 0.4, 0.7), M(0x111111), -0.7, 1.55, 0);
    part(h.head, boxGeo(0.12, 0.12, 0.3), M(0xffb300), -0.7, 1.55, 0.45);
  }
  if (level >= 2) {
    // Pumpkin basket at its feet
    part(h.body, boxGeo(1.4, 0.7, 1.4), M(0x8d6e63), 1.6, 0.35, 0.8);
    pumpkin(h, h.body, 0.7, eyeC).position.set(1.6, 1.0, 0.8);
  }
  if (cold) {
    part(h.torso, boxGeo(2.3, 3.6, 0.12), M(0x263238), 0, -0.7, -0.6); // tattered cloak
    boxRow(h.head, 5, 0.6, boxGeo(0.15, 0.6, 0.15), glow(h, 0xe1f5fe), 0.95, 1.2); // icicles off the brim
  }
  const staff = inHand(h);
  const sl = level >= 5 ? 5 : 3.6;
  part(staff, boxGeo(0.22, sl, 0.22), M(cold ? 0x455a64 : 0x5d4037), 0, -0.8 - (sl - 3.6) / 2, 0);
  const orb = part(staff, boxGeo(0.7, 0.7, 0.7), eye, 0, -2.8, 0);
  if (level >= 1) for (const side of [-1, 1]) part(staff, boxGeo(0.1, 0.9, 0.1), M(0x33691e), side * 0.3, -2.4, 0).rotation.z = side * 0.6; // thorns
  if (level >= 3) part(staff, boxGeo(0.12, 0.3, 1.6), glow(h, eyeC), 0, -3.2, 0.7); // sickle blade
  if (level >= 5) {
    part(staff, boxGeo(0.15, 0.6, 3.2), glow(h, 0x00e5ff), 0, -4.2, 1.5); // reaper scythe
    orb.scale.setScalar(1.5);
    const lantern = inHand(h, h.leftArm);
    part(lantern, boxGeo(0.7, 0.9, 0.7), glow(h, 0x00e5ff), 0, -0.6, 0);
    part(h.torso, boxGeo(0.5, 0.5, 0.8), M(0x111111), 1.3, 1.4, 0); // raven
  }
  setMuzzle(h, staff, 0, -2.8, 0);
  h.rightArm.rotation.set(-1.9, 0, 0.1);
  h.leftArm.rotation.set(level >= 5 ? -1.2 : -0.3, 0, -0.4);
  h.pose = { right: -1.9, left: level >= 5 ? -1.2 : -0.3, leftRecoil: 0 };
  h.flight = { color: eyeC, size: 0.5 + level * 0.12, arc: 0.5, glowing: true };
  h.tracer = eyeC;
  if (level >= 5) h.body.scale.setScalar(1.15);
  return h;
}

/**
 * Snowballer (event, new). Lv 1 a kid in a red beanie throwing snowballs; Lv 2 snow goggles,
 * mittens and a longer scarf; Lv 3 an ice-blue parka and a bucket of snowballs; Lv 4 the Snowball
 * Cannon: an arctic helmet, armor and a big snowball cannon with an ammo hopper.
 */
export function makeSnowballerFrost(level) {
  const cannon = level >= 3;
  const coat = [0x1e88e5, 0x1e88e5, 0x4dd0e1, 0xeceff1][level];
  const h = makeHumanoid({ skin: 0xffcc80, shirt: coat, pants: cannon ? 0x546e7a : 0x283593, arms: coat });
  const { M } = h;
  const white = M(0xfafafa);
  if (cannon) {
    helmet(h, 0x90a4ae, false);
    part(h.torso, boxGeo(2.15, 1.6, 1.2), M(0x78909c), 0, 0.2, 0);
  } else {
    part(h.head, boxGeo(1.35, 0.6, 1.35), M(0xe53935), 0, 1.3, 0); // beanie
    part(h.head, boxGeo(0.4, 0.4, 0.4), white, 0, 1.75, 0);
  }
  part(h.torso, boxGeo(2.4, 0.5, 1.3), M(0xe53935), 0, 1.0, 0); // scarf
  if (level >= 1) {
    part(h.torso, boxGeo(0.5, 1.6, 0.15), M(0xe53935), 0.5, 0, 0.6); // scarf tail
    part(h.head, boxGeo(1.25, 0.3, 0.1), M(0x263238), 0, 0.85, 0.63);
    for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.35, 0.22, 0.05), M(0x90caf9), x, 0.85, 0.69);
    for (const arm of [h.leftArm, h.rightArm]) part(arm, boxGeo(1.1, 0.6, 1.1), M(0xe53935), 0, -1.8, 0); // mittens
  }
  if (level >= 2) {
    part(h.body, boxGeo(1.2, 1.0, 1.2), M(0x90caf9), 1.7, 0.5, 0.6); // bucket of snowballs
    for (const [x, z] of [[1.5, 0.4], [1.9, 0.8], [1.7, 0.6]]) part(h.body, boxGeo(0.45, 0.45, 0.45), white, x, 1.2, z);
  }
  if (cannon) {
    const gun = holdLongGun(h, 2.6, M(0x37474f));
    part(gun, boxGeo(1.0, 0.7, 1.0), white, 0, -2.5, 0);
    part(gun, boxGeo(0.9, 0.9, 0.9), M(0x90caf9), 0, -0.6, -0.7); // hopper
    part(gun, boxGeo(0.7, 0.4, 0.7), white, 0, -0.6, -1.1);
    h.projectile = { color: 0xffffff, size: 0.8, arc: 2 };
  } else {
    const hand = inHand(h);
    part(hand, boxGeo(0.5 + level * 0.1, 0.5 + level * 0.1, 0.5 + level * 0.1), level >= 2 ? glow(h, 0xe1f5fe) : white, 0, -0.3, 0);
    setMuzzle(h, hand, 0, -0.3, 0);
    h.rightArm.rotation.set(-2.8, 0, 0.2);
    h.leftArm.rotation.set(-0.6, 0, -0.3);
    h.pose = { right: -2.8, left: -0.6, leftRecoil: 0 };
    h.swing = 1.9;
    h.projectile = { color: 0xffffff, size: 0.45 + level * 0.08, arc: 3 };
  }
  return h;
}

/**
 * Elementalist (event). Lv 1 a robe split red and blue with a gauntlet; Lv 2 shoulder plates and
 * belt pouches; Lv 3 fire and frost tanks; Lv 4 glowing exhausts and a bigger gauntlet; Lv 5 full
 * armor with a crested helmet and a floating halo of fire and ice.
 */
export function makeElementalist(level) {
  const armored = level >= 4;
  const h = makeHumanoid({ skin: 0xc68642, shirt: 0xb71c1c, pants: armored ? 0x37474f : 0x212121, arms: armored ? 0x546e7a : 0x1565c0 });
  const { M } = h;
  const fire = glow(h, 0xff6d00);
  const frost = glow(h, 0x40c4ff);
  part(h.torso, boxGeo(1.02, 2.02, 1.02), M(0x1565c0), -0.5, 0, 0);
  if (armored) {
    helmet(h, 0x455a64, false);
    for (let i = 0; i < 4; i++) part(h.head, boxGeo(0.2, 0.4, 0.3), i % 2 ? fire : frost, 0, 1.7, 0.45 - i * 0.3); // crest
    part(h.torso, boxGeo(2.15, 1.7, 1.2), M(0x546e7a), 0, 0.2, 0);
    part(h.torso, boxGeo(0.6, 0.6, 0.1), fire, 0.4, 0.4, 0.62);
    part(h.torso, boxGeo(0.6, 0.6, 0.1), frost, -0.4, 0.4, 0.62);
  } else part(h.head, boxGeo(1.4, 0.4, 1.4), M(0x212121), 0, 1.25, 0);
  part(h.head, boxGeo(1.2, 0.25, 0.1), glow(h, 0xffd740), 0, 0.85, 0.63);
  if (level >= 1) {
    part(h.torso, boxGeo(0.7, 0.5, 1.2), M(0xb71c1c), 1.25, 1.1, 0);
    part(h.torso, boxGeo(0.7, 0.5, 1.2), M(0x1565c0), -1.25, 1.1, 0);
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x5d4037), 0, -0.85, 0);
    boxRow(h.torso, 3, 0.55, boxGeo(0.4, 0.4, 0.3), M(0x795548), -0.85, 0.6); // pouches
  }
  if (level >= 2) {
    part(h.torso, boxGeo(0.65, 1.7, 0.65), fire, 0.45, 0.1, -0.85);
    part(h.torso, boxGeo(0.65, 1.7, 0.65), frost, -0.45, 0.1, -0.85);
  }
  if (level >= 3) {
    for (const [x, m] of [[0.45, fire], [-0.45, frost]]) {
      part(h.torso, boxGeo(0.35, 1.0, 0.35), M(0x424242), x, 1.4, -0.85);
      part(h.torso, boxGeo(0.38, 0.25, 0.38), m, x, 2.0, -0.85);
    }
  }
  if (armored) {
    // A halo of fire and frost crystals
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      part(h.body, boxGeo(0.35, 0.35, 0.35), i % 2 ? fire : frost, Math.cos(ang) * 1.3, 7.2, Math.sin(ang) * 1.3);
    }
  }
  const gl = 1.2 + level * 0.25;
  const gun = holdLongGun(h, gl, M(0x424242));
  const gs = 0.4 + level * 0.12;
  h.modeGlow = [part(gun, boxGeo(gs, gs, gs), glow(h, 0xff6d00), 0, -gl, 0)];
  if (level >= 3) h.modeGlow.push(part(gun, boxGeo(0.7, 0.2, 0.7), glow(h, 0xff6d00), 0, -gl * 0.5, 0));
  h.tracer = 0xff6d00;
  h.tracerWidth = 0.15 + level * 0.05;
  h.modeTracer = { fire: 0xff6d00, frost: 0x40c4ff };
  return h;
}

/**
 * Firework Technician (event). Lv 1 a hard hat and three rockets on its back; Lv 2 goggles and five
 * rockets; Lv 3 a launch rack beside it; Lv 4 a second rack and a crate of shells; Lv 5 The Finale:
 * a launch console, a giant rocket and lights everywhere.
 */
export function makeFireworkTech(level) {
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: level >= 4 ? 0x212121 : 0xff7043, pants: 0x1565c0, arms: level >= 4 ? 0x212121 : 0xff7043 });
  const { M } = h;
  const colors = [0xff1744, 0xffea00, 0x2979ff, 0x00e676, 0xd500f9];
  part(h.head, boxGeo(1.45, 0.45, 1.45), M(level >= 4 ? 0xffc107 : 0xffd600), 0, 1.25, 0);
  part(h.head, boxGeo(1.5, 0.1, 0.4), M(0xffd600), 0, 1.05, 0.62);
  part(h.torso, boxGeo(1.4, 1.2, 1.04), M(0x1565c0), 0, -0.4, 0);
  if (level >= 1) {
    part(h.head, boxGeo(1.25, 0.3, 0.1), M(0x263238), 0, 0.85, 0.63);
    for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.35, 0.22, 0.05), glow(h, 0xffab00), x, 0.85, 0.69);
  }
  const n = level >= 1 ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.42;
    part(h.torso, boxGeo(0.3, 1.4, 0.3), M(colors[i]), x, 1.2, -0.9);
    part(h.torso, boxGeo(0.2, 0.35, 0.2), M(0xfafafa), x, 2.05, -0.9);
  }
  // Launch racks on the ground beside it
  const rack = (x, z, tubes, big) => {
    part(h.body, boxGeo(1.6, 0.5, 1.2), M(0x5d4037), x, 0.25, z);
    for (let i = 0; i < tubes; i++) {
      const tx = x + ((i % 3) - 1) * 0.45;
      const tz = z + (Math.floor(i / 3) - 0.5) * 0.45;
      part(h.body, boxGeo(0.3, big ? 2.2 : 1.6, 0.3), M(colors[i % 5]), tx, big ? 1.6 : 1.3, tz).rotation.x = -0.2;
    }
  };
  if (level >= 2) rack(1.9, 0.6, 6, level >= 3);
  if (level >= 3) {
    rack(-1.9, 0.6, 6, true);
    part(h.body, boxGeo(1.2, 0.9, 0.9), M(0x8d6e63), 1.8, 0.45, -1.4); // crate of shells
    boxRow(h.body, 3, 0.35, boxGeo(0.25, 0.25, 0.25), M(0x212121), 1.0, -1.4);
  }
  if (level >= 4) {
    part(h.body, boxGeo(1.4, 1.0, 0.8), M(0x37474f), 0, 0.5, 1.8); // launch console
    boxRow(h.body, 4, 0.3, boxGeo(0.18, 0.12, 0.18), M(0x111111), 1.05, 1.8, colors.map((c) => glow(h, c)));
    part(h.body, boxGeo(0.9, 4.5, 0.9), M(0xff1744), -0.2, 2.6, -2.0); // the giant rocket
    part(h.body, boxGeo(0.6, 0.8, 0.6), M(0xfafafa), -0.2, 5.2, -2.0);
    for (const side of [-1, 1]) part(h.body, boxGeo(0.15, 1.0, 0.8), M(0xffc107), -0.2 + side * 0.5, 0.8, -2.0);
  }
  const hand = inHand(h);
  part(hand, boxGeo(0.25, 1.0, 0.25), M(0x5d4037), 0, -0.4, 0);
  part(hand, boxGeo(0.2 + level * 0.06, 0.2 + level * 0.06, 0.2 + level * 0.06), glow(h, 0xffab00), 0, -0.95, 0);
  setMuzzle(h, hand, 0, -1, 0);
  h.rightArm.rotation.set(-1.3, 0, 0.1);
  h.leftArm.rotation.set(-0.3, 0, -0.2);
  h.pose = { right: -1.3, left: -0.3, leftRecoil: 0 };
  return h;
}

/**
 * Biologist (event). Lv 1 a lab coat, a flask and a sunflower pot; Lv 2 an ivy pot and a clipboard;
 * Lv 3 goggles and a backpack sprayer; Lv 4 a flower crown and a nightshade pot; Lv 5 Botanical
 * Berserker: wrapped in vines, a huge flower on its back and glowing green.
 */
export function makeBiologist(level) {
  const berserk = level >= 4;
  const h = makeHumanoid({ skin: 0xffe0bd, shirt: berserk ? 0xc5e1a5 : 0xfafafa, pants: berserk ? 0x33691e : 0x455a64, arms: berserk ? 0xc5e1a5 : 0xfafafa });
  const { M } = h;
  const leaf = M(0x43a047);
  part(h.head, boxGeo(1.35, 0.35, 1.35), M(0x6d4c41), 0, 1.25, 0);
  part(h.torso, boxGeo(2.1, 1.4, 1.1), M(berserk ? 0xaed581 : 0xf5f5f5), 0, -1.4, 0); // coat tails
  const pot = (x, z, kind) => {
    part(h.body, boxGeo(0.8, 0.6, 0.8), M(0xa1887f), x, 0.3, z);
    part(h.body, boxGeo(0.25, 0.9, 0.25), leaf, x, 1.05, z);
    if (kind === 'sun') {
      part(h.body, boxGeo(0.8, 0.8, 0.15), M(0xffd600), x, 1.7, z);
      part(h.body, boxGeo(0.4, 0.4, 0.2), M(0x5d4037), x, 1.7, z);
    } else if (kind === 'ivy') part(h.body, boxGeo(0.5, 0.5, 0.5), glow(h, 0x76ff03), x, 1.6, z);
    else part(h.body, boxGeo(0.6, 0.3, 0.6), glow(h, 0xd500f9), x, 1.6, z);
  };
  pot(1.6, 1.2, 'sun');
  if (level >= 1) {
    pot(-1.6, 1.2, 'ivy');
    part(h.leftArm, boxGeo(0.15, 1.0, 0.8), M(0x8d6e63), 0.6, -1.6, 0.2); // clipboard
  }
  if (level >= 2) {
    part(h.head, boxGeo(1.25, 0.3, 0.1), M(0x263238), 0, 0.85, 0.63);
    for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.35, 0.22, 0.05), glow(h, 0x76ff03), x, 0.85, 0.69);
    part(h.torso, boxGeo(1.2, 1.6, 0.8), M(0x78909c), 0, 0.1, -0.9); // sprayer tank
    part(h.torso, boxGeo(1.25, 0.3, 0.85), glow(h, 0x76ff03), 0, 0.4, -0.9);
  }
  if (level >= 3) {
    pot(1.6, -1.2, 'night');
    for (let i = 0; i < 5; i++) part(h.head, boxGeo(0.3, 0.3, 0.3), M([0xffd600, 0xff4081, 0xffffff, 0xff9100, 0xd500f9][i]), (i - 2) * 0.32, 1.5, 0.3); // flower crown
  }
  if (berserk) {
    pot(-1.6, -1.2, 'sun');
    for (const side of [-1, 1]) part(h.torso, boxGeo(0.25, 2.4, 0.25), leaf, side * 0.7, 0, 0.55).rotation.z = side * 0.5; // vines
    for (const arm of [h.leftArm, h.rightArm]) part(arm, boxGeo(1.05, 0.25, 1.05), leaf, 0, -1, 0);
    // Huge flower on its back
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      part(h.torso, boxGeo(0.7, 0.7, 0.15), M(0xffd600), Math.cos(ang) * 1.1, 1.6 + Math.sin(ang) * 1.1, -1.4);
    }
    part(h.torso, boxGeo(1.0, 1.0, 0.25), M(0x5d4037), 0, 1.6, -1.4);
  }
  const hand = inHand(h);
  const fs = 0.5 + level * 0.1;
  part(hand, boxGeo(fs, fs * 1.4, fs), glow(h, berserk ? 0xb2ff59 : 0x76ff03), 0, -0.4, 0);
  part(hand, boxGeo(0.2, 0.3, 0.2), M(0xe0f2f1), 0, 0.05, 0);
  setMuzzle(h, hand, 0, -0.4, 0);
  h.rightArm.rotation.set(-1.4, 0, 0.1);
  h.leftArm.rotation.set(level >= 1 ? -1.0 : -0.3, 0, -0.2);
  h.pose = { right: -1.4, left: level >= 1 ? -1.0 : -0.3, leftRecoil: 0 };
  return h;
}

/**
 * Warlock (event). Lv 1 a grey hooded robe and a plain sword; Lv 2 the Acolyte: a purple sash and
 * a floating spellbook; Lv 3 Forbidden Arts: glowing runes and orbiting orbs; Lv 4 Pact of the
 * Blade: a glowing blade; Lv 5 Eldritch Knight: plate armor and a horned helm; Lv 6 Abyss Walker:
 * black and violet, wings and a huge abyssal greatsword.
 */
export function makeWarlock(level) {
  const abyss = level >= 5;
  const knight = level >= 4;
  const magic = [0x40c4ff, 0x7c4dff, 0x7c4dff, 0xaa00ff, 0xaa00ff, 0xd500f9][level];
  const robe = [0x616161, 0x37474f, 0x263238, 0x1a1a2e, 0x1a1a2e, 0x0b0014][level];
  const h = makeHumanoid({ skin: 0xc8b6a6, shirt: robe, pants: 0x111111, arms: knight ? 0x546e7a : robe });
  const { M } = h;
  const rune = glow(h, magic);
  if (knight) {
    part(h.head, boxGeo(1.45, 1.4, 1.45), M(abyss ? 0x1a0033 : 0x455a64), 0, 0.65, 0); // helm
    part(h.head, boxGeo(1.0, 0.15, 0.1), rune, 0, 0.75, 0.74);
    for (const side of [-1, 1]) part(h.head, boxGeo(0.3, 1.2, 0.3), M(abyss ? 0x111111 : 0xd7ccc8), side * 0.8, 1.5, 0).rotation.z = side * -0.4; // horns
    part(h.torso, boxGeo(2.15, 1.7, 1.2), M(abyss ? 0x1a0033 : 0x546e7a), 0, 0.2, 0);
    for (const side of [-1, 1]) part(h.torso, boxGeo(0.8, 0.6, 1.3), M(abyss ? 0x311b92 : 0x78909c), side * 1.3, 1.1, 0);
  } else {
    part(h.head, boxGeo(1.45, 1.4, 1.35), M(robe), 0, 0.68, -0.08); // hood
    for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.22, 0.12, 0.05), rune, x, 0.75, 0.62);
  }
  part(h.torso, boxGeo(2.2, 3.2 + level * 0.15, 0.12), M(abyss ? 0x311b92 : robe), 0, -0.6, -0.6); // cloak
  if (level >= 1) {
    part(h.torso, boxGeo(2.6, 0.3, 1.15), M(0x6a1b9a), 0, 0.2, 0).rotation.z = 0.5; // sash
    const book = part(h.body, boxGeo(0.9, 0.2, 0.7), M(0x4a148c), 1.6, 5.4, 0.6); // floating spellbook
    part(book, boxGeo(0.5, 0.25, 0.4), rune, 0, 0.05, 0);
  }
  if (level >= 2) {
    boxRow(h.torso, 3, 0.5, boxGeo(0.3, 0.3, 0.06), rune, -0.3, 0.6); // runes
    for (let i = 0; i < (abyss ? 5 : 3); i++) {
      const ang = (i / (abyss ? 5 : 3)) * Math.PI * 2;
      part(h.body, boxGeo(0.35, 0.35, 0.35), rune, Math.cos(ang) * 1.9, 3.5 + (i % 2) * 0.8, Math.sin(ang) * 1.9); // orbs
    }
  }
  if (abyss) for (const side of [-1, 1]) part(h.torso, boxGeo(2.6, 1.8, 0.12), M(0x1a0033), side * 1.7, 0.9, -0.75).rotation.z = side * 0.45; // wings
  const sword = inHand(h);
  const bl = [2.0, 2.2, 2.4, 2.8, 3.2, 4.0][level];
  const bw = abyss ? 0.6 : 0.3 + level * 0.04;
  part(sword, boxGeo(0.25, 0.5, 0.25), M(0x4e342e), 0, -0.2, 0);
  part(sword, boxGeo(0.9 + level * 0.1, 0.12, 0.25), M(knight ? 0xffc107 : 0x9e9e9e), 0, -0.45, 0);
  part(sword, boxGeo(bw, bl, 0.12), level >= 3 ? rune : M(0xb0bec5), 0, -0.5 - bl / 2, 0);
  const cast = inHand(h, h.leftArm);
  part(cast, boxGeo(0.4 + level * 0.08, 0.4 + level * 0.08, 0.4 + level * 0.08), rune, 0, -0.2, 0);
  setMuzzle(h, cast, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  h.leftArm.rotation.set(-1.5, 0, -0.2);
  h.pose = { right: -2.4, left: -1.5, leftRecoil: 0 };
  h.swing = 2;
  h.tracer = magic;
  h.tracerWidth = 0.2 + level * 0.06;
  if (abyss) h.body.scale.setScalar(1.15);
  return h;
}

/**
 * Spotlight Tech (event, cliff). Lv 1 a stagehand with a headset and a small lamp; Lv 2 a tool belt
 * and cables; Lv 3 a safety hat (worn wrong) and a bigger lamp on a taller stand; Lv 4 a stage truss
 * with a second light; Lv 5 sunglasses, a gold lamp and a full lighting rig.
 */
export function makeSpotlightTech(level) {
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: 0x212121, pants: 0x212121, arms: 0x212121 });
  const { M } = h;
  const metal = M(0x424242);
  part(h.head, boxGeo(1.4, 0.15, 0.2), metal, 0, 1.25, 0);
  for (const x of [-0.68, 0.68]) part(h.head, boxGeo(0.2, 0.5, 0.5), metal, x, 0.65, 0);
  part(h.head, boxGeo(0.1, 0.1, 0.6), metal, -0.6, 0.4, 0.4);
  part(h.torso, boxGeo(0.8, 0.3, 0.06), M(0xffeb3b), 0, 0.5, 0.52); // CREW badge
  if (level >= 1) {
    part(h.torso, boxGeo(2.1, 0.35, 1.15), M(0x5d4037), 0, -0.85, 0); // tool belt
    boxRow(h.torso, 3, 0.55, boxGeo(0.3, 0.5, 0.3), M(0x9e9e9e), -1.1, 0.6);
    part(h.body, boxGeo(0.2, 0.2, 3.0), M(0x111111), -1.2, 0.1, 0.6); // cables on the floor
  }
  if (level >= 2) part(h.head, boxGeo(1.45, 0.45, 1.45), M(0xffa000), 0, 1.5, 0).rotation.z = 0.35; // crooked hard hat
  if (level >= 4) {
    part(h.head, boxGeo(1.25, 0.28, 0.1), M(0x111111), 0, 0.85, 0.63); // shades
    part(h.torso, boxGeo(2.04, 2.04, 1.04), M(0x311b92), 0, 0, 0); // crew jacket
    part(h.torso, boxGeo(0.8, 0.3, 0.06), M(0xffc107), 0, 0.5, 0.54);
  }
  const standH = level >= 2 ? 5.0 : 4.0;
  part(h.body, boxGeo(0.25, standH, 0.25), metal, -2.2, standH / 2, 0);
  for (const side of [-1, 1]) part(h.body, boxGeo(0.15, 0.15, 1.6), metal, -2.2 + side * 0.4, 0.1, 0).rotation.y = side * 0.6; // tripod feet
  if (level >= 3) {
    // Stage truss over its head with a second light
    for (const x of [-2.2, 2.2]) part(h.body, boxGeo(0.3, 6.5, 0.3), metal, x, 3.25, -1.5);
    part(h.body, boxGeo(4.7, 0.3, 0.3), metal, 0, 6.5, -1.5);
    part(h.body, boxGeo(0.9, 0.9, 1.2), M(0x37474f), 1.2, 5.9, -1.3);
    part(h.body, boxGeo(0.7, 0.7, 0.1), glow(h, 0xfff8e1), 1.2, 5.9, -0.68);
  }
  if (level >= 4) for (const x of [-1.4, -0.4, 0.6]) part(h.body, boxGeo(0.5, 0.5, 0.5), glow(h, [0xff1744, 0x2979ff, 0x00e676][Math.round(x + 1.4)] ?? 0xffffff), x, 6.1, -1.3);
  const lamp = new THREE.Group();
  lamp.position.set(-2.2, standH + 0.2, 0);
  h.body.add(lamp);
  const ls = [1.2, 1.4, 1.7, 1.9, 2.2][level];
  part(lamp, boxGeo(ls, ls, ls * 1.4), M(level >= 4 ? 0xffc107 : 0x37474f), 0, 0, 0);
  part(lamp, boxGeo(ls * 0.85, ls * 0.85, 0.1), glow(h, 0xfff8e1), 0, 0, ls * 0.72);
  if (level >= 2) for (const side of [-1, 1]) part(lamp, boxGeo(0.1, ls, ls * 0.6), M(0x212121), side * ls * 0.55, 0, ls * 0.8); // barn doors
  const m = new THREE.Object3D();
  m.position.set(0, 0, ls * 0.8);
  lamp.add(m);
  h.muzzles = [m];
  h.lamp = lamp;
  h.rightArm.rotation.set(-1.4, 0, 0.5);
  h.leftArm.rotation.set(-0.3, 0, -0.2);
  h.pose = { right: -1.4, left: -0.3, leftRecoil: 0 };
  h.spot = [0xfff8e1, 0xffe0b2, 0xffcc80, 0xffb74d, 0xffd740][level];
  return h;
}

/**
 * Star Cannon (event, cliff). Lv 1 a steel cannon on a turntable; Lv 2 solar battery packs and
 * panels; Lv 3 the Eclipsed Crew: a dark barrel with a sun-dish; Lv 4 Lunar Charges: deep blue with a
 * crescent moon and violet rings; Lv 5 Shot of the Century: a colossal gold barrel with capacitors
 * and a crown of stars.
 */
export function makeStarCannon(level) {
  const u = makeThing();
  const { M } = u;
  const steel = M([0x78909c, 0x607d8b, 0x263238, 0x1a237e, 0x0d0d2b][level]);
  const gold = M(0xffc107);
  const starC = [0xffd740, 0xffab00, 0xff6d00, 0xb388ff, 0xffffff][level];
  const star = glow(u, starC);
  part(u.body, boxGeo(4.6, 0.6, 4.6), M(0x37474f), 0, 0.3, 0);
  part(u.body, boxGeo(3.2 + level * 0.2, 1.0, 3.2 + level * 0.2), steel, 0, 1.1, 0);
  const len = 4 + level * 0.9;
  const w = 1.4 + level * 0.25;
  part(u.body, boxGeo(w, w, len), level >= 4 ? gold : steel, 0, 2.6, len / 2 - 1);
  const rings = 2 + level;
  for (let i = 0; i < rings; i++) part(u.body, boxGeo(w + 0.4, w + 0.4, 0.3), i === rings - 1 || i % 2 ? star : gold, 0, 2.6, 0.2 + i * (len / rings));
  part(u.body, boxGeo(2.2, 0.4, 0.4), star, 0, 4.0, -0.8); // star emblem
  part(u.body, boxGeo(0.4, 2.2, 0.4), star, 0, 4.0, -0.8);
  if (level >= 1) {
    for (const side of [-1, 1]) {
      part(u.body, boxGeo(0.8, 1.2, 1.4), M(0x33691e), side * 1.9, 1.2, -1.2); // battery packs
      part(u.body, boxGeo(0.82, 0.3, 1.42), glow(u, 0x76ff03), side * 1.9, 1.6, -1.2);
    }
    part(u.body, boxGeo(2.4, 0.1, 1.4), M(0x1a237e), 0, 3.0, -1.6).rotation.x = -0.6; // solar panel
  }
  if (level >= 2) {
    const dish = part(u.body, boxGeo(2.6, 2.6, 0.2), M(0x212121), 0, 4.6, -2.0);
    part(dish, boxGeo(1.6, 1.6, 0.1), glow(u, 0xff6d00), 0, 0, 0.12); // eclipse glow
    part(dish, boxGeo(1.3, 1.3, 0.12), M(0x111111), 0, 0, 0.18);
  }
  if (level >= 3) {
    // Crescent moon
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI / 2 + (i / 4) * Math.PI;
      part(u.body, boxGeo(0.5, 0.5, 0.3), glow(u, 0xe1f5fe), Math.cos(ang) * 1.2 + 0.4, 6.2 + Math.sin(ang) * 1.2, -2.0);
    }
  }
  if (level >= 4) {
    for (const side of [-1, 1]) {
      part(u.body, boxGeo(0.8, 3.2, 2.6), gold, side * 2.0, 2.6, -0.2); // capacitors
      boxRow(u.body, 3, 0.8, boxGeo(0.2, 0.2, 0.2), star, 4.3, -0.2);
    }
    for (let i = 0; i < 5; i++) part(u.body, boxGeo(0.45, 0.45, 0.45), star, (i - 2) * 0.7, 3.3 + w / 2 + (i % 2) * 0.4, 0.4); // crown of stars
  }
  gunMuzzle(u, u.body, 0, 2.6, len - 0.9);
  u.tracer = starC;
  u.tracerWidth = 0.9 + level * 0.3;
  return u;
}

/**
 * Artillery (alternate Mortar with two paths): a gunner beside a wheeled field howitzer. Top path:
 * a crew cap at Lv 1, a longer M119 barrel at Lv 2, a shell rack at Lv 3, fat shells at Lv 4 and
 * three barrels at Lv 5. Bottom path: HE shells at Lv 1, a heavier barrel at Lv 2, the big M198 at
 * Lv 3, an even longer barrel at Lv 4, and the grey Skyhawk with a radar dish at Lv 5.
 */
export function makeArtillery(level, bottom = false) {
  const sky = bottom && level >= 5;
  const coat = sky ? 0x37474f : 0x6b7d3a;
  const h = makeHumanoid({ skin: 0xc68642, shirt: coat, pants: sky ? 0x263238 : 0x4b5320, arms: coat, face: 'soldier' });
  const { M } = h;
  const shard = glow(h, 0xb388ff);
  helmet(h, sky ? 0x455a64 : 0x556b2f);
  part(h.head, boxGeo(0.3, 0.3, 0.06), shard, 0, 1.32, 0.74); // Dimension Shard emblem
  if (level >= 1) for (const x of [-0.7, 0.7]) part(h.head, boxGeo(0.25, 0.55, 0.55), M(0xff8f00), x, 0.6, 0); // ear protectors
  // The gun: a carriage on two wheels with a long barrel pointing up and forward.
  const gun = new THREE.Group();
  gun.position.set(1.6, 0, 2.2);
  h.root.add(gun);
  const steel = M(sky ? 0x78909c : 0x4a5a3a);
  const big = bottom ? [1, 1, 1.1, 1.3, 1.45, 1.6][level] : level >= 2 ? 1.1 : 1;
  gun.scale.setScalar(big);
  part(gun, boxGeo(1.6, 0.6, 1.4), steel, 0, 1.0, 0); // carriage
  for (const side of [-1, 1]) {
    part(gun, boxGeo(0.3, 1.4, 1.4), M(0x212121), side * 1.0, 0.7, 0); // wheels
    const trail = part(gun, boxGeo(0.25, 0.25, 2.6), steel, side * 0.45, 0.4, -1.4); // trail legs
    trail.rotation.y = side * 0.2;
  }
  part(gun, boxGeo(1.2, 1.0, 0.15), steel, 0, 1.6, 0.7); // gun shield
  const n = !bottom && level >= 5 ? 3 : 1;
  const len = bottom ? 4.2 : level >= 2 ? 4.4 : 3.8;
  const w = bottom && level >= 3 ? 0.6 : 0.45;
  const barrels = new THREE.Group();
  barrels.position.set(0, 1.4, 0.2);
  barrels.rotation.x = 0.9; // tilted up toward the sky
  gun.add(barrels);
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.55;
    part(barrels, boxGeo(w, len, w), M(sky ? 0x546e7a : 0x3e4a2a), x, len / 2, 0);
    part(barrels, boxGeo(w + 0.2, 0.35, w + 0.2), M(0x212121), x, len, 0); // muzzle brake
  }
  if (bottom && level >= 3) part(barrels, boxGeo(w + 0.25, 1.2, w + 0.25), steel, 0, 0.8, 0); // recoil cylinders
  setMuzzle(h, barrels, 0, len + 0.3, 0);
  if (sky) {
    // Skyhawk: a radar dish on a mast
    part(gun, boxGeo(0.15, 1.6, 0.15), M(0x263238), -0.7, 2.2, -0.6);
    part(gun, boxGeo(1.2, 1.2, 0.12), M(0xcfd8dc), -0.7, 3.1, -0.6).rotation.x = -0.5;
    part(gun, boxGeo(0.25, 0.25, 0.25), glow(h, 0xff1744), -0.7, 3.1, -0.45);
  }
  const shellM = bottom && level >= 1 ? M(0x8d6e63) : M(0x37474f);
  if ((!bottom && level >= 3) || (bottom && level >= 2)) {
    // A rack of ready shells
    part(h.root, boxGeo(1.6, 0.2, 1.0), M(0x5d4037), -2.0, 0.1, 0.4);
    for (const x of [-2.5, -2.0, -1.5]) for (const z of [0.15, 0.65]) part(h.root, boxGeo(0.35, 1.1, 0.35), shellM, x, 0.75, z);
  }
  const fat = (!bottom && level >= 4) || sky;
  const shell = part(h.rightArm, boxGeo(fat ? 0.55 : 0.4, 0.9, fat ? 0.55 : 0.4), shellM, 0.6, -2.1, 0);
  shell.rotation.z = 0.3;
  h.rightArm.rotation.set(-1.0, 0, 0.3);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -1.0, left: -1.0, leftRecoil: 0 };
  h.recoilScale = 0.4;
  h.projectile = sky ? { color: 0xff6d00, size: 1.1, arc: 26, glowing: true } : { color: 0x37474f, size: fat ? 0.9 : 0.7, arc: 24 };
  return h;
}

/**
 * Shock Trooper (alternate Electroshocker form): a soldier with a lightning gun. Lv 2 a coil
 * backpack, Lv 3 the Tesla Tower: a copper coil tower beside them, Lv 4 a solar radar dish on
 * it, Lv 5 a huge crackling coil.
 */
export function makeShockTrooper(level) {
  const bolt = level >= 5 ? 0xe1f5fe : 0x82b1ff;
  const shirt = level >= 3 ? 0x283593 : 0x4e5b31;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x263238, arms: shirt, face: 'soldier' });
  const { M } = h;
  helmet(h, level >= 3 ? 0x1a237e : 0x3e4a2a);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.45, 0.52); // Dimension Shard
  part(h.head, boxGeo(1.25, 0.3, 0.12), M(0x263238), 0, 0.8, 0.63);
  part(h.head, boxGeo(1.0, 0.18, 0.06), glow(h, bolt), 0, 0.8, 0.7); // visor
  if (level >= 2) {
    part(h.torso, boxGeo(1.0, 1.8, 0.7), M(0x455a64), 0, 0.3, -0.85); // coil pack
    for (let i = 0; i < 3; i++) part(h.torso, boxGeo(1.2, 0.15, 0.85), M(0xb87333), 0, -0.3 + i * 0.6, -0.85);
  }
  const gun = holdLongGun(h, level >= 1 ? 1.7 : 1.4, M(0x37474f));
  part(gun, boxGeo(0.55, 0.55, 0.55), M(0xb87333), 0, -0.5, 0); // copper coil
  part(gun, boxGeo(0.4, 0.3, 0.4), glow(h, bolt), 0, level >= 1 ? -1.7 : -1.4, 0);
  if (level >= 3) {
    // Tesla Tower: a copper coil on a pylon beside the trooper
    const tall = level >= 5 ? 6.2 : level >= 4 ? 5.4 : 4.6;
    part(h.root, boxGeo(1.6, 0.4, 1.6), M(0x424242), -2.2, 0.2, -0.4);
    part(h.root, boxGeo(0.6, tall, 0.6), M(0x546e7a), -2.2, tall / 2, -0.4);
    const rings = Math.floor(tall / 0.8);
    for (let i = 0; i < rings; i++) part(h.root, boxGeo(1.0, 0.18, 1.0), M(0xb87333), -2.2, 0.8 + i * 0.7, -0.4);
    part(h.root, boxGeo(1.3, 0.6, 1.3), glow(h, bolt), -2.2, tall + 0.3, -0.4); // the coil top
    if (level >= 4) part(h.root, boxGeo(1.4, 1.4, 0.12), M(0xfdd835), -2.2, tall - 0.8, 0.3).rotation.x = -0.4; // solar radar panel
  }
  h.tracer = bolt;
  return h;
}

/**
 * Ice Breaker (alternate Sledger form): a fighter in arctic gear with an ice pick. Lv 1 grip
 * wraps, Lv 2 a frosted pick, Lv 3 a crystal pick head, Lv 4 cryo fuel tanks, Lv 5 the glowing
 * X-Cryosuit.
 */
export function makeIceBreaker(level) {
  const suit = level >= 5;
  const ice = 0x80d8ff;
  const coat = suit ? 0x0288d1 : 0x4fc3f7;
  const h = makeHumanoid({ skin: 0xffcc80, shirt: coat, pants: suit ? 0x01579b : 0x37474f, arms: coat });
  const { M } = h;
  part(h.head, boxGeo(1.45, 0.5, 1.45), M(suit ? 0xe1f5fe : 0xfafafa), 0, 1.3, 0); // fur hat
  part(h.head, boxGeo(1.5, 0.35, 0.5), M(0x5d4037), 0, 1.45, -0.6); // ponytail
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.45, 0.52); // Dimension Shard
  if (level >= 4) for (const x of [-0.45, 0.45]) part(h.torso, boxGeo(0.5, 1.4, 0.5), M(0xb0bec5), x, 0.2, -0.85); // cryo tanks
  if (suit) {
    part(h.torso, boxGeo(2.2, 1.7, 1.2), glow(h, 0xb3e5fc), 0, 0.05, 0); // X-Cryosuit armor
    part(h.head, boxGeo(1.3, 0.35, 0.12), glow(h, ice), 0, 0.8, 0.66); // visor
  }
  const pick = inHand(h);
  pick.scale.setScalar([1, 1, 1.1, 1.2, 1.25, 1.4][level]);
  part(pick, boxGeo(0.25, 2.4, 0.25), M(level >= 1 ? 0x263238 : 0x5d4037), 0, -1.0, 0);
  const headMat = level >= 3 ? glow(h, ice) : level >= 2 ? M(0xb3e5fc) : M(0x90a4ae);
  part(pick, boxGeo(0.35, 0.4, 1.8), headMat, 0, -2.2, 0.3); // pick head
  part(pick, boxGeo(0.25, 0.25, 0.6), headMat, 0, -2.2, 1.3); // spike
  setMuzzle(h, pick, 0, -2.3, 0.6);
  h.rightArm.rotation.set(-2.6, 0, 0.15);
  h.leftArm.rotation.set(-2.4, 0, -0.3);
  h.pose = { right: -2.6, left: -2.4, leftRecoil: 0 };
  h.swing = 2.2;
  h.melee = true;
  h.tracer = ice;
  return h;
}
