// Tower models, file 2 of 12. Each makeX(level) builds one tower's look.
// In here:
// Sniper, Sniper Tactical, Sniper Classic, Enforcer, Warden, Mercenary, Grenadier, Grenadier Demo,
// Grenadier Assault, Frost, Rocketeer, Mortar, Flamethrower, Shotgunner, Plasma, Plasma Pulse.
// The list of which tower uses which builder is TOWER_MODELS in ../models.js.

import * as THREE from 'three';
import { boxGeo, makeHumanoid, part } from './kit.js';
import { glow, helmet, holdLongGun, setMuzzle } from './bits.js';

/** Sniper tower (cliff): very long rifle. Ghillie suit at Lv 5. */
export function makeSniper(level) {
  const ghillie = level >= 4;
  const h = makeHumanoid({ skin: 0xd2a679, shirt: 0x4e5b3a, pants: 0x3b4530, arms: 0x4e5b3a, face: 'soldier' });
  const { M } = h;
  const dark = M(0x1a1a1a);
  part(h.head, boxGeo(1.35, 0.4, 1.35), M(0x33402a), 0, 1.2, 0); // knit cap
  if (level >= 2) {
    // Spotter Scope: radio headset with a tall antenna
    part(h.head, boxGeo(0.15, 0.5, 0.45), dark, -0.68, 0.65, 0);
    part(h.head, boxGeo(0.08, 1.2, 0.08), dark, -0.72, 1.4, -0.25);
    // ...a tactical vest, and a spotting scope on a tripod beside them
    if (!ghillie) part(h.torso, boxGeo(2.15, 1.5, 1.15), M(0x2f3a24), 0, -0.1, 0);
    part(h.root, boxGeo(0.15, 2.4, 0.15), dark, 1.9, 1.2, 0.6);
    part(h.root, boxGeo(0.45, 0.45, 1.4), M(0x37474f), 1.9, 2.5, 0.8);
    part(h.root, boxGeo(0.35, 0.35, 0.06), M(0x4fc3f7), 1.9, 2.5, 1.52);
  }
  if (level >= 3) part(h.root, boxGeo(1.1, 0.6, 0.7), M(0x33402a), -1.9, 0.3, 0.6); // .50 ammo can
  if (ghillie) {
    // Ghillie suit: shaggy leafy chunks all over
    const leaves = [M(0x556b2f), M(0x6b8e23), M(0x3d5229), M(0x7a8b45)];
    let n = 0;
    const tuft = (parent, x, y, z, sz = 0.55) => part(parent, boxGeo(sz, sz * 0.8, sz), leaves[n++ % leaves.length], x, y, z);
    for (const x of [-0.75, 0, 0.75]) for (const y of [-0.6, 0.2, 0.9]) {
      tuft(h.torso, x, y, 0.52);
      tuft(h.torso, x, y, -0.52);
    }
    for (const x of [-0.5, 0.2, 0.6]) tuft(h.head, x, 1.45, (x * 7) % 0.6 - 0.2, 0.6);
    for (const arm of [h.rightArm, h.leftArm]) for (const y of [-0.5, -1.3]) tuft(arm, 0.45, y, 0, 0.45);
    for (const leg of [h.rightLeg, h.leftLeg]) tuft(leg, 0, -0.8, 0.45, 0.5);
  }
  const len = 3.4;
  const gun = holdLongGun(h, len, M(level >= 3 ? 0x263238 : 0x5d4037));
  const scope = level >= 1 ? 1.3 : 0.9;
  part(gun, boxGeo(0.26, scope, 0.32), dark, 0, -0.9, 0.38); // scope
  part(gun, boxGeo(0.3, 0.6, 0.4), M(0x3e2723), 0, 0.2, -0.05); // stock
  if (level >= 1) {
    // Steady Aim: a bipod under the barrel and a camo scarf
    for (const x of [-0.18, 0.18]) part(gun, boxGeo(0.08, 0.08, 0.9), dark, x, -len + 0.5, -0.5);
    part(h.head, boxGeo(1.26, 0.45, 0.1), M(0x6b7d3a), 0, 0.25, 0.62);
    if (!ghillie) part(h.torso, boxGeo(2.3, 1.0, 1.3), M(0x6b7d3a), 0, 0.6, 0); // camo poncho
  }
  if (level >= 3) part(gun, boxGeo(0.42, 0.45, 0.5), dark, 0, -len, 0); // muzzle brake on the .50
  if (ghillie) for (const y of [-0.6, -1.6, -2.5]) part(gun, boxGeo(0.45, 0.4, 0.5), M(0x556b2f), 0, y, -0.1);
  h.muzzles[0].position.y = -len - 0.3;
  h.tracer = 0xffffff;
  h.tracerWidth = level >= 3 ? 0.25 : undefined;
  return h;
}

/**
 * Tactical Sniper (alternate Sniper form): a modern operator in grey-blue gear with a shard
 * patch. Top path: Lv 2 headset + scope, Lv 3 Intervention heavy rifle, Lv 4 AP Bullets dark
 * hooded cloak (stealthy), Lv 5 Pathfinder armor plates. Bottom path (`bottom`): Lv 2-3 ammo
 * pouches, Lv 4 Marksman vest, Lv 5 red Laser Eye visor, Lv 6 glowing red Laser Barrett.
 */
export function makeSniperTactical(level, bottom = false) {
  const top = !bottom;
  const cloak = top && level >= 4;
  const laser = bottom && level >= 5;
  const shirt = cloak ? 0x1b1f24 : 0x546e7a;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: cloak ? 0x15181c : 0x37474f, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(0x1a1a1a);
  const shard = glow(h, 0xb388ff);
  const red = glow(h, 0xff1744);

  // Ball cap (a hood once it's stealthy)
  const cap = M(cloak ? 0x111417 : 0x263238);
  part(h.head, boxGeo(1.4, 0.45, 1.4), cap, 0, 1.28, 0);
  if (cloak) {
    part(h.head, boxGeo(1.6, 1.4, 0.3), cap, 0, 0.8, -0.72);
    for (const x of [-0.78, 0.78]) part(h.head, boxGeo(0.12, 1.3, 1.5), cap, x, 0.75, 0);
    // Long dark cloak over the back
    part(h.torso, boxGeo(2.3, 2.4, 0.2), M(0x111417), 0, -0.4, -0.62);
  } else part(h.head, boxGeo(1.4, 0.1, 0.6), cap, 0, 1.08, 0.75);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, 0.55, 0.45, 0.52); // shoulder-patch emblem

  if (top && level >= 2) {
    // Enhanced Sight: headset with a little purple monocle
    part(h.head, boxGeo(0.15, 0.5, 0.45), dark, -0.68, 0.65, 0);
    part(h.head, boxGeo(0.3, 0.3, 0.12), shard, 0.28, 0.72, 0.72);
  }
  if (top && level >= 5) {
    // Pathfinder: heavy armor plates on chest and shoulders
    const plate = M(0x2b3238);
    part(h.torso, boxGeo(2.2, 1.6, 1.25), plate, 0, -0.05, 0);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.15, 0.6, 1.15), plate, 0, -0.2, 0);
    part(h.torso, boxGeo(0.5, 0.5, 0.06), shard, 0, 0.1, 0.64);
  }
  if (bottom && level >= 1) {
    // High Velocity / 160 GR Bullet: ammo pouches on the belt
    const n = level >= 2 ? 3 : 2;
    for (let k = 0; k < n; k++) part(h.torso, boxGeo(0.4, 0.45, 0.3), M(0x4e5b3a), -0.6 + k * 0.6, -0.85, 0.6);
  }
  if (bottom && level >= 3) part(h.torso, boxGeo(2.15, 1.5, 1.15), M(0x3a4750), 0, -0.1, 0); // Marksman vest
  if (bottom && level >= 4) {
    // Laser Eye: a red glowing eyepiece and a flare gun on the hip
    part(h.head, boxGeo(1.2, 0.25, 0.15), dark, 0, 0.72, 0.7);
    part(h.head, boxGeo(0.4, 0.25, 0.08), red, 0.27, 0.72, 0.79);
    part(h.root, boxGeo(0.3, 0.5, 0.7), M(0xff6f00), 1.4, 1.8, 0.3);
  }

  // Rifle: longer and heavier on the Top path, a glowing laser rifle at Laser Barrett
  const len = laser ? 4.2 : top && level >= 3 ? 4 : 3.4;
  const gun = holdLongGun(h, len, M(laser ? 0x212121 : cloak ? 0x15181c : 0x37474f));
  part(gun, boxGeo(0.26, level >= 1 ? 1.4 : 1.0, 0.32), dark, 0, -0.9, 0.38); // scope
  part(gun, boxGeo(0.3, 0.6, 0.4), M(0x263238), 0, 0.2, -0.05); // stock
  if (level >= 1) for (const x of [-0.18, 0.18]) part(gun, boxGeo(0.08, 0.08, 0.9), dark, x, -len + 0.5, -0.5); // bipod
  if (top && level >= 3) part(gun, boxGeo(0.42, 0.5, 0.5), dark, 0, -len, 0); // muzzle brake
  if (cloak) part(gun, boxGeo(0.08, len * 0.6, 0.08), shard, 0.2, -len * 0.45, 0.2);
  if (laser) {
    part(gun, boxGeo(0.12, len * 0.8, 0.12), red, 0.2, -len * 0.5, 0.15);
    part(gun, boxGeo(0.35, 0.35, 0.35), red, 0, -len, 0);
  }
  h.muzzles[0].position.y = -len - 0.3;
  h.tracer = laser ? 0xff1744 : 0xffffff;
  h.tracerWidth = laser || (top && level >= 3) ? 0.25 : undefined;
  return h;
}
export const makeSniperTacticalBottom = (level) => makeSniperTactical(level, true);

/**
 * Classic Sniper (alternate Sniper form): a desert marksman with a bolt-action rifle.
 * Lv 2 bandolier, Lv 3 vest + headset + shard goggles, Lv 4 helmet + ammo crate,
 * Lv 5 black Spec Ops kit with quad night-vision goggles and a purple-trimmed rifle.
 */
export function makeSniperClassic(level) {
  const spec = level >= 4;
  const geared = level >= 2;
  const shirt = spec ? 0x1c1726 : 0xb89a6a;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: spec ? 0x14101c : 0x8d7a55, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(0x1a1a1a);
  const shard = glow(h, 0xb388ff);

  if (level >= 3) {
    // Frontlines Sniping: combat helmet (black at Spec Ops) and an ammo crate beside them
    const helm = M(spec ? 0x14101c : 0x6d6047);
    part(h.head, boxGeo(1.45, 0.55, 1.45), helm, 0, 1.3, 0);
    part(h.head, boxGeo(1.5, 0.12, 0.4), helm, 0, 1.05, 0.62);
    part(h.root, boxGeo(1.2, 0.7, 0.8), M(spec ? 0x263238 : 0x5d4c2e), -1.9, 0.35, 0.6);
    part(h.root, boxGeo(0.3, 0.3, 0.05), shard, -1.9, 0.4, 1.02);
  } else {
    // Wide-brim boonie hat with the shard emblem
    const hat = M(0xa1885a);
    part(h.head, boxGeo(1.38, 0.45, 1.38), hat, 0, 1.3, 0);
    part(h.head, boxGeo(1.9, 0.1, 1.9), hat, 0, 1.08, 0);
    part(h.head, boxGeo(0.3, 0.3, 0.06), shard, 0, 1.32, 0.7);
  }
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, 0.55, 0.45, 0.52); // shoulder-patch emblem
  if (level >= 1) {
    // Faster Reloading: a bandolier of rifle rounds across the chest
    const belt = part(h.torso, boxGeo(0.35, 2.2, 1.15), M(0x4e342e), 0, 0, 0);
    belt.rotation.z = 0.7;
    for (const y of [-0.5, 0, 0.5]) part(h.torso, boxGeo(0.12, 0.3, 0.12), M(0xd4af37), y * 0.8, y, 0.62);
  }
  if (geared) {
    // Geared Up: plate vest, radio headset and purple-lensed goggles
    part(h.torso, boxGeo(2.15, 1.5, 1.15), M(spec ? 0x0f0c14 : 0x6b5a3a), 0, -0.1, 0);
    part(h.head, boxGeo(0.15, 0.5, 0.45), dark, -0.68, 0.65, 0);
    part(h.head, boxGeo(0.08, 1.0, 0.08), dark, -0.72, 1.3, -0.25);
    if (!spec) {
      part(h.head, boxGeo(1.2, 0.3, 0.2), dark, 0, 0.72, 0.68);
      for (const x of [-0.27, 0.27]) part(h.head, boxGeo(0.36, 0.22, 0.05), shard, x, 0.72, 0.79);
    }
  }
  if (spec) {
    // Spec Ops: quad night-vision goggles glowing purple, knee pads and gloves
    part(h.head, boxGeo(1.0, 0.3, 0.3), dark, 0, 0.75, 0.72);
    for (const x of [-0.36, -0.12, 0.12, 0.36]) part(h.head, boxGeo(0.18, 0.18, 0.25), shard, x, 0.75, 0.95);
    const pad = M(0x212121);
    for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.05, 0.4, 0.3), pad, 0, -1.2, 0.45);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.05, 0.45, 1.05), pad, 0, -1.75, 0);
  }

  // Bolt-action rifle: wooden at first, black with purple trim at Spec Ops
  const len = level >= 3 ? 3.8 : 3.3;
  const gun = holdLongGun(h, len, M(spec ? 0x263238 : level >= 3 ? 0x37474f : 0x6d4c41));
  part(gun, boxGeo(0.26, level >= 2 ? 1.4 : 1.0, 0.32), dark, 0, -0.9, 0.38); // scope
  part(gun, boxGeo(0.3, 0.6, 0.4), M(spec ? 0x1c1726 : 0x4e342e), 0, 0.2, -0.05); // stock
  part(gun, boxGeo(0.35, 0.1, 0.1), M(0x9e9e9e), 0.2, -0.3, 0.2); // bolt handle
  if (level >= 2) for (const x of [-0.18, 0.18]) part(gun, boxGeo(0.08, 0.08, 0.9), dark, x, -len + 0.5, -0.5); // bipod
  if (level >= 3) part(gun, boxGeo(0.4, 0.5, 0.48), dark, 0, -len, 0); // suppressor
  if (spec) part(gun, boxGeo(0.08, len * 0.7, 0.08), shard, 0.2, -len * 0.45, 0.2);
  h.muzzles[0].position.y = -len - 0.3;
  h.tracer = spec ? 0xb388ff : 0xffe082;
  h.tracerWidth = level >= 3 ? 0.25 : undefined;
  return h;
}

/** Enforcer tower: a prison guard with a nightstick. Steel from Lv 2, flashlight from Lv 3, shock baton from Lv 4, riot gear at Lv 5. */
export function makeEnforcer(level) {
  const riot = level >= 4;
  const zap = level >= 3;
  const navy = 0x263859;
  const h = makeHumanoid({ skin: 0x8d5524, shirt: riot ? 0x1c1f26 : 0x5b7289, pants: riot ? 0x111318 : navy, arms: riot ? 0x1c1f26 : 0x5b7289, face: 'soldier' });
  const { M } = h;
  h.body.scale.setScalar(1.12); // a big guy
  part(h.torso, boxGeo(2.3, 1.9, 1.2), M(riot ? 0x23272f : 0x5b7289), 0, 0.1, 0); // bulky chest
  part(h.torso, boxGeo(0.35, 0.4, 0.06), M(0xffd54f), -0.55, 0.55, 0.62); // badge
  part(h.torso, boxGeo(1.0, 0.2, 0.05), M(0xfafafa), 0.45, 0.6, 0.62); // name tag
  part(h.torso, boxGeo(2.35, 0.3, 1.25), M(0x212121), 0, -0.85, 0); // duty belt
  // Ring of cell keys on the belt
  part(h.torso, boxGeo(0.4, 0.4, 0.1), M(0xbdbdbd), 0.8, -1.1, 0.64);
  for (const x of [0.7, 0.9]) part(h.torso, boxGeo(0.08, 0.4, 0.06), M(0xffd54f), x, -1.4, 0.66);
  if (!riot) {
    // Peaked guard cap
    part(h.head, boxGeo(1.4, 0.45, 1.4), M(navy), 0, 1.4, 0);
    part(h.head, boxGeo(1.4, 0.1, 0.55), M(0x111111), 0, 1.15, 0.72);
    part(h.head, boxGeo(0.35, 0.3, 0.06), M(0xffd54f), 0, 1.45, 0.72);
  }
  if (level >= 2) {
    // Cell Block Patrol: flashlight on the shoulder strap and a radio
    part(h.torso, boxGeo(0.3, 0.3, 0.7), M(0x212121), -0.85, 0.85, 0.5);
    part(h.torso, boxGeo(0.28, 0.28, 0.06), glow(h, 0xfff59d), -0.85, 0.85, 0.86);
    part(h.torso, boxGeo(0.35, 0.6, 0.25), M(0x212121), -0.95, -0.6, 0.55);
  }
  if (riot) {
    const black = M(0x1c1f26);
    part(h.head, boxGeo(1.5, 1.4, 1.5), black, 0, 0.7, -0.03); // riot helmet
    const visor = part(h.head, boxGeo(1.3, 0.8, 0.08), M(0x90caf9), 0, 0.55, 0.78);
    visor.material.transparent = true;
    visor.material.opacity = 0.6;
    part(h.torso, boxGeo(1.6, 0.35, 0.06), M(0xfdd835), 0, 0.15, 0.63); // "CORRECTIONS" stripe
    // Riot shield on the left arm, held in front
    const shield = part(h.leftArm, boxGeo(2.0, 0.15, 3.0), M(0x78909c), 0, -1.8, 0.6);
    shield.rotation.x = 0.1;
    part(shield, boxGeo(1.4, 0.05, 0.25), M(0xfafafa), 0, -0.1, 0.6);
  }

  // Nightstick held in the right hand, pointing along the arm.
  const stick = new THREE.Group();
  stick.position.set(0, -1.9, 0);
  h.rightArm.add(stick);
  part(stick, boxGeo(0.3, 0.6, 0.3), M(0x212121), 0, -0.2, 0); // grip
  part(stick, boxGeo(0.7, 0.12, 0.12), M(0x212121), 0.35, -0.45, 0); // side handle
  const len = level >= 1 ? 2.6 : 2.2; // the steel nightstick is longer
  part(stick, boxGeo(0.35, len, 0.35), zap ? M(0x263238) : level >= 1 ? M(0x9e9e9e) : M(0x6d4c41), 0, -0.5 - len / 2, 0);
  if (zap) {
    for (let i = 0; i < 3; i++) part(stick, boxGeo(0.42, 0.12, 0.42), glow(h, 0x40c4ff), 0, -0.9 - i * 0.6, 0);
    part(stick, boxGeo(0.45, 0.25, 0.45), glow(h, 0x40c4ff), 0, -0.5 - len, 0); // shock tip
  }
  setMuzzle(h, stick, 0, -0.5 - len, 0);

  // Nightstick raised overhead; a swing brings it down in front.
  h.rightArm.rotation.set(-2.6, 0, 0.15);
  h.leftArm.rotation.set(riot ? -1.3 : -0.25, 0, riot ? -0.2 : -0.1);
  h.pose = { right: -2.6, left: riot ? -1.3 : -0.25, leftRecoil: 0 };
  h.swing = 1.8;
  h.melee = true;
  h.tracer = zap ? 0x80d8ff : 0xffffff;
  return h;
}

/** Warden (alternate Enforcer): the prison warden in a khaki uniform and campaign hat. Night-vision at Lv 2, riot shield at Lv 5. */
export function makeWarden(level) {
  const riot = level >= 4;
  const khaki = 0xb59b6a;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: khaki, pants: 0x4e3b27, arms: khaki, face: 'soldier' });
  const { M } = h;
  part(h.torso, boxGeo(0.4, 0.45, 0.06), M(0xffd54f), -0.55, 0.55, 0.52); // star badge
  part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.85, 0); // leather belt
  part(h.torso, boxGeo(0.35, 0.25, 0.06), M(0xffd54f), 0, -0.85, 0.56); // buckle
  for (const x of [-0.75, 0.75]) part(h.torso, boxGeo(0.5, 0.15, 1.1), M(0x6d5a3a), x, 0.95, 0); // shoulder straps
  if (!riot) {
    // Wide-brimmed campaign hat
    const hat = M(0x6d5a3a);
    part(h.head, boxGeo(2.0, 0.12, 2.0), hat, 0, 1.25, 0);
    part(h.head, boxGeo(1.3, 0.55, 1.3), hat, 0, 1.55, 0);
    part(h.head, boxGeo(1.32, 0.12, 1.32), M(0x3e2723), 0, 1.33, 0);
  }
  if (level >= 1) {
    // Night Shift: night-vision monocle
    part(h.head, boxGeo(0.35, 0.35, 0.4), M(0x212121), 0.3, 0.7, 0.75);
    part(h.head, boxGeo(0.25, 0.25, 0.06), glow(h, 0x76ff03), 0.3, 0.7, 0.96);
  }
  if (level >= 3) part(h.torso, boxGeo(1.9, 1.5, 1.15), M(0x5d6b45), 0, 0.15, 0); // Stunning Blows: armored vest
  if (riot) {
    const dark = M(0x3e2723);
    part(h.head, boxGeo(1.45, 1.35, 1.45), dark, 0, 0.7, -0.03); // riot helmet
    const visor = part(h.head, boxGeo(1.3, 0.8, 0.08), M(0xffe0b2), 0, 0.55, 0.76);
    visor.material.transparent = true;
    visor.material.opacity = 0.55;
    const shield = part(h.leftArm, boxGeo(2.0, 0.15, 3.0), M(0x8d6e63), 0, -1.8, 0.6);
    shield.rotation.x = 0.1;
    part(shield, boxGeo(0.4, 0.06, 0.4), M(0xffd54f), 0, -0.1, 0.4); // gold star on the shield
  }

  // Baton: longer from Heavier Stick, glowing from Stunning Blows.
  const stick = new THREE.Group();
  stick.position.set(0, -1.9, 0);
  h.rightArm.add(stick);
  part(stick, boxGeo(0.3, 0.55, 0.3), M(0x3e2723), 0, -0.2, 0);
  const len = level >= 2 ? 2.7 : 2.1;
  const wide = level >= 2 ? 0.42 : 0.32;
  part(stick, boxGeo(wide, len, wide), M(level >= 2 ? 0x37474f : 0x5d4037), 0, -0.45 - len / 2, 0);
  if (level >= 3) for (let i = 0; i < 2; i++) part(stick, boxGeo(wide + 0.08, 0.14, wide + 0.08), glow(h, 0xffab00), 0, -1.2 - i * 0.8, 0);
  setMuzzle(h, stick, 0, -0.45 - len, 0);

  h.rightArm.rotation.set(-2.6, 0, 0.15);
  h.leftArm.rotation.set(riot ? -1.3 : -0.25, 0, riot ? -0.2 : -0.1);
  h.pose = { right: -2.6, left: riot ? -1.3 : -0.25, leftRecoil: 0 };
  h.swing = 1.8;
  h.melee = true;
  h.tracer = level >= 3 ? 0xffab00 : 0xffffff;
  return h;
}

/**
 * Mercenary tower: a private contractor with an assault rifle. Tan shirt and ball cap with shades;
 * Lv 2 laser sight, Lv 3 radio pack + headset, Lv 4 plate carrier, Lv 5 all-black kit, a
 * balaclava with a glowing visor and a bigger rifle with a drum mag.
 */
export function makeMercenary(level) {
  const elite = level >= 4;
  const h = makeHumanoid({ skin: 0xd8a47f, shirt: elite ? 0x1c1c1c : 0xc2a878, pants: elite ? 0x141414 : 0x3b3b3b, arms: elite ? 0x1c1c1c : 0xd8a47f, face: 'soldier' });
  const { M } = h;
  const dark = M(0x1f1f1f);
  if (elite) {
    // Balaclava + glowing visor
    part(h.head, boxGeo(1.3, 1.0, 1.3), M(0x111111), 0, 0.25, 0);
    part(h.head, boxGeo(1.1, 0.25, 0.08), glow(h, 0xff3d00), 0, 0.75, 0.66);
  } else {
    // Ball cap (brim forward) and sunglasses
    part(h.head, boxGeo(1.3, 0.35, 1.3), M(0x2e2e2e), 0, 1.4, 0);
    part(h.head, boxGeo(1.0, 0.1, 0.6), M(0x2e2e2e), 0, 1.25, 0.85);
    part(h.head, boxGeo(1.1, 0.2, 0.06), M(0x101010), 0, 0.75, 0.66);
  }
  // Chest rig with mag pouches
  part(h.torso, boxGeo(2.1, 0.9, 1.1), M(elite ? 0x2a2a2a : 0x5b5446), 0, -0.3, 0);
  for (const x of [-0.5, 0, 0.5]) part(h.torso, boxGeo(0.35, 0.5, 0.2), M(elite ? 0x333333 : 0x4a4438), x, -0.3, 0.62);
  if (level >= 2) {
    // Outside Support: radio pack with an antenna, headset on the cap
    part(h.torso, boxGeo(1.3, 1.5, 0.6), M(elite ? 0x262626 : 0x4e4a3e), 0, 0, -0.8);
    part(h.torso, boxGeo(0.08, 1.6, 0.08), dark, 0.45, 1.4, -0.85);
    part(h.head, boxGeo(0.12, 0.5, 0.4), dark, -0.68, 0.6, 0);
    part(h.head, boxGeo(0.08, 0.08, 0.5), dark, -0.62, 0.35, 0.35); // mic boom
  }
  if (level >= 3) {
    // Up-Skill: plate carrier and shoulder pads
    part(h.torso, boxGeo(2.15, 1.5, 1.15), M(elite ? 0x2b2b2b : 0x6b6450), 0, 0.2, 0);
    part(h.rightArm, boxGeo(1.05, 0.5, 1.05), M(elite ? 0x2b2b2b : 0x6b6450), 0, -0.2, 0);
    part(h.leftArm, boxGeo(1.05, 0.5, 1.05), M(elite ? 0x2b2b2b : 0x6b6450), 0, -0.2, 0);
  }
  const len = elite ? 2.4 : 2.0;
  const gun = holdLongGun(h, len, dark);
  part(gun, boxGeo(0.25, 0.5, 0.35), M(0x3a3a3a), 0, 0.2, -0.05); // stock
  part(gun, boxGeo(0.36, 0.5, 0.46), M(elite ? 0x2a2a2a : 0x6d5c42), 0, -len + 0.55, 0); // handguard
  if (elite) part(gun, boxGeo(0.5, 0.55, 0.55), M(0x333333), 0, -0.65, -0.45); // drum mag
  else part(gun, boxGeo(0.22, 0.45, 0.55), dark, 0, -0.65, -0.42).rotation.x = -0.25; // curved mag
  if (level >= 1) {
    // Lasers: laser sight box with a glowing beam
    const beamColor = elite ? 0xff3d00 : 0xff1744;
    part(gun, boxGeo(0.2, 0.4, 0.2), dark, 0.25, -len + 0.7, 0.1);
    part(gun, boxGeo(0.04, 1.4, 0.04), glow(h, beamColor), 0.25, -len - 0.2, 0.1);
    part(gun, boxGeo(0.25, 0.35, 0.3), dark, 0, -0.8, 0.36); // optic
  }
  h.tracer = elite ? 0xff6e40 : 0xffd54f;
  return h;
}

/** Grenadier tower: throws grenades, dynamite at Lv 5. */
export function makeGrenadier(level) {
  const demo = level >= 4;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: demo ? 0x5d4037 : 0x6d7b4a, pants: 0x4b5530, arms: demo ? 0x5d4037 : 0x6d7b4a, face: 'soldier' });
  const { M } = h;
  helmet(h, demo ? 0xfbc02d : 0x556b2f, !demo);
  if (level >= 2) {
    // Keen Eye: goggles on the helmet
    part(h.head, boxGeo(1.3, 0.3, 0.2), M(0x263238), 0, 1.3, 0.75);
    part(h.head, boxGeo(0.35, 0.22, 0.05), M(0xffb74d), -0.27, 1.3, 0.86);
    part(h.head, boxGeo(0.35, 0.22, 0.05), M(0xffb74d), 0.27, 1.3, 0.86);
    part(h.torso, boxGeo(0.7, 0.8, 0.9), M(0x6d4c41), 1.15, -0.8, 0); // satchel
    part(h.torso, boxGeo(0.2, 2.3, 1.12), M(0x4e342e), 0, 0.1, 0).rotation.z = -0.6; // satchel strap
  }
  const nade = M(0x33691e);
  const tnt = M(0xc62828);
  if (level >= 1) {
    // Belt of grenades
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x4e342e), 0, -0.85, 0);
    for (const x of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.35, 0.4, 0.35), demo ? tnt : nade, x, -0.7, 0.62);
  }
  if (level >= 3) {
    const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), M(0x4e342e), 0, 0, 0);
    strap.rotation.z = 0.7;
    for (const t of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.35, 0.35, 0.3), demo ? tnt : nade, t * 0.75, t * -0.8, 0.65);
    // Double Pin: a second grenade ready in the left hand
    part(h.leftArm, demo ? boxGeo(0.3, 0.9, 0.3) : boxGeo(0.5, 0.6, 0.5), demo ? tnt : nade, 0, -2.3, 0);
  }
  // Grenade (or dynamite) held in the raised right hand.
  const hand = new THREE.Group();
  hand.position.set(0, -2.1, 0);
  h.rightArm.add(hand);
  if (demo) {
    part(hand, boxGeo(0.3, 0.9, 0.3), tnt, 0, -0.3, 0);
    part(hand, boxGeo(0.06, 0.4, 0.06), glow(h, 0xffeb3b), 0, -0.9, 0); // lit fuse
  } else {
    part(hand, boxGeo(0.5, 0.6, 0.5), nade, 0, -0.2, 0);
    part(hand, boxGeo(0.2, 0.2, 0.2), M(0x9e9e9e), 0, -0.6, 0); // pin
  }
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -2.8, left: -1.0, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = demo ? { color: 0xc62828, size: 0.4, arc: 4.5 } : { color: 0x33691e, size: 0.5, arc: 3.5 };
  return h;
}

/**
 * Demo Expert (alternate Grenadier form): a demolitions expert in a dark coat with a stubby
 * grenade launcher. Lv 2 adds a bandolier, Lv 3 goggles and a sticky-bomb pack, Lv 4 a drum
 * magazine, Lv 5 a heavy armored vest and a bigger barrel.
 */
export function makeGrenadierDemo(level) {
  const heavy = level >= 4;
  const coat = heavy ? 0x212121 : 0x263850;
  const h = makeHumanoid({ skin: 0x8d5524, shirt: coat, pants: 0x1c1c22, arms: coat, face: 'soldier' });
  const { M } = h;
  const dark = M(0x37474f);
  const brown = M(0x4e342e);
  const shell = M(0x1b1b1b);
  // Beanie
  part(h.head, boxGeo(1.32, 0.45, 1.32), M(heavy ? 0x111111 : 0x1a237e), 0, 1.3, 0);
  if (level >= 1) {
    const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), brown, 0, 0, 0);
    strap.rotation.z = -0.7;
    for (const t of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.32, 0.32, 0.3), shell, t * 0.75, t * 0.8, 0.65);
  }
  if (level >= 2) {
    part(h.head, boxGeo(1.3, 0.3, 0.2), M(0x263238), 0, 1.0, 0.72);
    part(h.head, boxGeo(0.35, 0.22, 0.05), glow(h, 0x4fc3f7), -0.27, 1.0, 0.83);
    part(h.head, boxGeo(0.35, 0.22, 0.05), glow(h, 0x4fc3f7), 0.27, 1.0, 0.83);
    // Pack of sticky charges on the back, with glowing lights.
    part(h.torso, boxGeo(1.4, 1.4, 0.6), dark, 0, 0.1, -0.85);
    for (const x of [-0.4, 0.4]) part(h.torso, boxGeo(0.2, 0.2, 0.1), glow(h, 0xff5252), x, 0.4, -1.18);
  }
  if (heavy) {
    part(h.torso, boxGeo(2.15, 1.6, 1.15), M(0x455a64), 0, 0.2, 0); // armored vest
    part(h.torso, boxGeo(0.5, 0.5, 0.5), M(0x455a64), -1.25, 0.85, 0); // shoulder pads
    part(h.torso, boxGeo(0.5, 0.5, 0.5), M(0x455a64), 1.25, 0.85, 0);
  }
  // Grenade launcher held forward in the right hand. In arm space the barrel runs along -y
  // (toward the target once the arm is raised) and +z is the top of the gun.
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  h.rightArm.add(gun);
  const bore = heavy ? 0.6 : 0.48;
  part(gun, boxGeo(bore, 1.6, bore), dark, 0, -0.6, 0); // barrel
  part(gun, boxGeo(0.22, 0.3, 0.6), brown, 0, 0.1, -0.4); // grip
  part(gun, boxGeo(0.3, 0.8, 0.3), brown, 0, 0.6, -0.05); // stock
  if (level >= 3) part(gun, boxGeo(0.8, 0.5, 0.8), M(0x5d4037), 0, -0.2, -0.1); // drum magazine
  if (heavy) part(gun, boxGeo(0.75, 0.2, 0.75), M(0xfbc02d), 0, -1.4, 0); // yellow muzzle ring
  setMuzzle(h, gun, 0, -1.5, 0);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
  h.projectile = { color: 0x1b1b1b, size: heavy ? 0.55 : 0.45, arc: 3 };
  return h;
}

/**
 * Assault Grenadier (alternate Grenadier with two paths). Top path: Lv 1 grenade belt, Lv 3
 * sensor goggles, Lv 4 a Stiel stick grenade in hand, Lv 5 an armored vest with napalm canisters.
 * Bottom path: Lv 1 belt, Lv 3 glowing blue shock grenades, Lv 4 a battery pack, Lv 5 dark
 * Shock Trooper armor with a glowing visor.
 */
export function makeGrenadierAssault(level, bottom = false) {
  const top = !bottom;
  const shock = bottom && level >= 3;
  const trooper = bottom && level >= 5;
  const shirt = trooper ? 0x1c2330 : top && level >= 5 ? 0x5d4f37 : 0x5b6b3c;
  const h = makeHumanoid({ skin: 0xd8a06a, shirt, pants: trooper ? 0x12161d : 0x3e4a2a, arms: shirt, face: 'soldier' });
  const { M } = h;
  const brown = M(0x4e342e);
  const nade = shock ? glow(h, 0x40c4ff) : M(0x33691e);
  helmet(h, trooper ? 0x111820 : 0x4b5d2e, !trooper);
  if (level >= 1) {
    part(h.torso, boxGeo(2.1, 0.3, 1.1), brown, 0, -0.85, 0); // belt
    for (const x of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.35, 0.4, 0.35), nade, x, -0.7, 0.62);
  }
  if (level >= 2) {
    const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), brown, 0, 0, 0);
    strap.rotation.z = top ? 0.7 : -0.7;
    for (const t of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.32, 0.32, 0.3), nade, t * 0.75, t * (top ? -0.8 : 0.8), 0.65);
  }
  if (top && level >= 3) {
    // Sensor goggles
    part(h.head, boxGeo(1.3, 0.3, 0.2), M(0x263238), 0, 1.0, 0.72);
    part(h.head, boxGeo(0.35, 0.22, 0.05), glow(h, 0xff7043), -0.27, 1.0, 0.83);
    part(h.head, boxGeo(0.35, 0.22, 0.05), glow(h, 0xff7043), 0.27, 1.0, 0.83);
  }
  if (top && level >= 5) {
    part(h.torso, boxGeo(2.15, 1.6, 1.15), M(0x6d5f45), 0, 0.2, 0); // armored vest
    // Napalm canisters on the back
    for (const x of [-0.4, 0.4]) {
      part(h.torso, boxGeo(0.55, 1.5, 0.55), M(0xbf360c), x, 0.1, -0.85);
      part(h.torso, boxGeo(0.3, 0.2, 0.3), glow(h, 0xffab40), x, 0.95, -0.85);
    }
  }
  if (bottom && level >= 4) {
    // Battery pack for the shock grenades
    part(h.torso, boxGeo(1.3, 1.3, 0.55), M(0x37474f), 0, 0.1, -0.85);
    part(h.torso, boxGeo(0.9, 0.18, 0.06), glow(h, 0x40c4ff), 0, 0.3, -1.14);
  }
  if (trooper) {
    part(h.torso, boxGeo(2.2, 1.7, 1.2), M(0x263040), 0, 0.15, 0); // armor
    part(h.torso, boxGeo(0.5, 0.5, 0.5), M(0x263040), -1.25, 0.85, 0);
    part(h.torso, boxGeo(0.5, 0.5, 0.5), M(0x263040), 1.25, 0.85, 0);
    part(h.head, boxGeo(1.25, 0.35, 0.08), glow(h, 0x40c4ff), 0, 0.75, 0.74); // visor
  }
  // Grenade held in the raised right hand: a Stiel stick grenade at Top Lv 4+.
  const hand = new THREE.Group();
  hand.position.set(0, -2.1, 0);
  h.rightArm.add(hand);
  const stiel = top && level >= 4;
  if (stiel) {
    part(hand, boxGeo(0.18, 0.9, 0.18), M(0x8d6e63), 0, -0.2, 0); // wooden handle
    part(hand, boxGeo(0.5, 0.5, 0.5), M(level >= 5 ? 0xbf360c : 0x455a64), 0, -0.85, 0); // head
  } else {
    part(hand, boxGeo(0.5, 0.6, 0.5), nade, 0, -0.2, 0);
    part(hand, boxGeo(0.2, 0.2, 0.2), M(0x9e9e9e), 0, -0.6, 0); // pin
  }
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -2.8, left: -1.0, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = shock ? { color: 0x40c4ff, size: 0.5, arc: 3.5 } : stiel ? { color: 0x455a64, size: 0.5, arc: 4 } : { color: 0x33691e, size: 0.5, arc: 3.5 };
  return h;
}
export const makeGrenadierAssaultBottom = (level) => makeGrenadierAssault(level, true);

/** Frost Trooper tower: ice gun with a coolant tank. */
export function makeFrost(level) {
  const ice = 0x80d8ff;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: 0xe3f2fd, pants: 0x90caf9, arms: 0xe3f2fd, face: 'soldier' });
  const { M } = h;
  const white = M(0xfafafa);
  part(h.head, boxGeo(1.45, 1.4, 1.45), white, 0, 0.65, -0.03); // hood
  part(h.head, boxGeo(1.2, 0.4, 0.08), glow(h, ice), 0, 0.7, 0.7); // visor
  const big = level >= 3;
  part(h.torso, boxGeo(big ? 1.5 : 1.1, big ? 2.0 : 1.7, 0.8), M(0x90a4ae), 0, 0, -0.9); // coolant tank
  part(h.torso, boxGeo(0.3, big ? 1.6 : 1.3, 0.1), glow(h, ice), 0, 0, big ? -1.32 : -1.32);
  if (level >= 1) {
    // Deep Freeze: frosty shoulder pads with icicles
    for (const side of [-1, 1]) {
      part(h.torso, boxGeo(0.8, 0.45, 1.3), white, side * 1.4, 1.0, 0);
      part(h.torso, boxGeo(0.15, 0.5, 0.15), M(0xb3e5fc), side * 1.6, 0.6, 0.4);
    }
  }
  if (level >= 2) {
    // Frostbite: spiky ice gauntlets
    const iceM = glow(h, 0x4fc3f7);
    for (const arm of [h.rightArm, h.leftArm]) {
      part(arm, boxGeo(1.1, 0.6, 1.1), iceM, 0, -1.6, 0);
      part(arm, boxGeo(0.2, 0.6, 0.2), M(0xe1f5fe), 0.55, -1.3, 0);
    }
  }
  if (level >= 4) {
    // Blizzard: crown of ice crystals
    const crystal = glow(h, 0xb3e5fc);
    for (const [x, hgt] of [[-0.45, 0.5], [0, 0.8], [0.45, 0.5]]) part(h.head, boxGeo(0.25, hgt, 0.25), crystal, x, 1.4 + hgt / 2, 0);
    part(h.torso, boxGeo(2.2, 2.6, 0.15), M(0xe1f5fe), 0, -0.5, -1.35); // snowy cape
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(h.root, boxGeo(0.5, 0.8 + (i % 2) * 0.6, 0.5), crystal, Math.cos(a) * 1.7, 0.5, Math.sin(a) * 1.7).rotation.y = a;
    }
  }
  const len = level >= 3 ? 2.1 : 1.8;
  const gun = holdLongGun(h, len, M(0xeceff1));
  part(gun, boxGeo(0.5, 0.6, 0.55), M(0x78909c), 0, -0.3, 0);
  for (let i = 0; i < (level >= 2 ? 3 : 2); i++) part(gun, boxGeo(0.5, 0.12, 0.55), glow(h, ice), 0, -0.9 - i * 0.35, 0);
  part(gun, boxGeo(0.45, 0.25, 0.5), glow(h, ice), 0, -len, 0); // nozzle
  h.muzzles[0].position.y = -len - 0.15;
  h.tracer = ice;
  h.tracerWidth = 0.3;
  return h;
}

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
