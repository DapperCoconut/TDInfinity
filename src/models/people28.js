// Tower models: people, batch 28 (dressed with the vehicle kit in ../vehicles.js).
// In here: Thief, Exterminator, Miner, Recon, Blaster, Programmer.
// Like batches 26-27 these are plain white figures with no face: only their gear tells them
// apart, white too, with accents in one neon colour per tower.
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.

import { glowMat } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { UP, aimLong, dome, fist, muzzle, own, wear } from './people1.js';
import { shoulderPads } from './people2.js';
import { feet, hands, hood } from './people5.js';
import { cape } from './people18.js';

const PI = Math.PI;
const W = 0xffffff;
const W2 = 0xf2f2f2;
const W3 = 0xe4e4e4;

/** A plain white figure with no face. */
const blank = () => makeHumanoid({ skin: W, shirt: W, pants: W2, arms: W, face: 'none' });

// ------------------------------------------------------------------ Thief (neon amber)

const THIEF_NEON = 0xffc400;

/** A white dagger in the fist (blade down -y). o.glow: a glowing blade. Returns the tip y. */
function whiteDagger(k, neon, o = {}) {
  k.cyl(0.08, 0.42, W3, 0, 0.1, 0, { seg: 8 }); // grip
  k.ball(0.1, neon, 0, 0.34, 0, { seg: 8, rows: 5 }); // pommel
  k.box(0.46, 0.08, 0.14, W2, 0, -0.15, 0, { r: 0.02 }); // crossguard
  const blade = [[0.08, 0], [0.07, -0.8], [0, -1.15], [-0.07, -0.8], [-0.08, 0]];
  k.prism(blade, 0.04, o.glow ? neon : W, 0, -0.2, 0);
  if (!o.glow) k.box(0.025, 0.75, 0.05, neon, 0, -0.55, 0.03); // neon edge
  return -1.35;
}

/**
 * Thief (alternate Cowboy): a white rogue in a hood and mask with a dagger. Lv 1 Crooked
 * Connections: a coin pouch. Lv 2 Pickpocket: a loot sack of neon coins on the back. Lv 3 Duel
 * Daggers: a second dagger. Lv 4 Hex Thief: glowing hex runes and glowing daggers. Lv 5
 * Dummybane: a tattered cloak and arm wraps.
 */
export function makeThief(level) {
  const h = blank();
  const key = `cowboyThief${level}`;
  const neon = glowMat(h, THIEF_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hood(hd, W2);
  hd.box(1.14, 0.46, 0.1, W3, 0, 0.3, 0.62, { r: 0.08 }); // mask over the lower face
  hd.box(0.9, 0.07, 0.05, neon, 0, 0.72, 0.64); // eye slit
  if (level >= 4) {
    // Hex Thief: a ring of glowing runes round the hood
    for (let i = 0; i < 5; i++) {
      const a = -PI / 2 + ((i - 2) / 4) * 1.6;
      hd.box(0.14, 0.2, 0.04, neon, Math.sin(a) * 0.82, 1.2, Math.cos(a) * 0.82 - 0.1, { ry: a });
    }
  }
  // a fitted shirt, a sash and crossed straps
  t.box(2.0, 1.7, 1.08, W, 0, 0.1, 0, { r: 0.12 });
  t.box(2.04, 0.24, 1.12, W3, 0, -0.84, 0, { r: 0.04 }); // sash
  t.box(0.32, 0.22, 0.06, neon, 0, -0.84, 0.57, { r: 0.02 }); // buckle
  t.box(0.2, 2.2, 1.12, W3, 0, 0.1, 0, { r: 0.04, rz: 0.65 }); // strap
  if (level >= 1) {
    // Crooked Connections: a coin pouch on the hip
    t.ball(0.32, W2, 0.95, -1.05, 0.25, { seg: 10, rows: 7, sy: 1.1 });
    t.cyl(0.14, 0.12, neon, 0.95, -0.72, 0.25, { seg: 8 });
  }
  if (level >= 2) {
    // Pickpocket: a loot sack on the back with neon coins spilling at the top
    t.ball(0.75, W2, 0, 0.1, -0.95, { seg: 14, rows: 10, sy: 1.15 });
    t.cyl(0.24, 0.2, W3, 0, 0.95, -0.95, { seg: 10 }); // tied neck
    for (let i = 0; i < 4; i++) t.cyl(0.13, 0.04, neon, -0.2 + i * 0.13, 1.1 + (i % 2) * 0.06, -0.95 + (i % 2 ? 0.1 : -0.05), { seg: 10, rx: 0.4 });
  }
  if (level >= 5) {
    // Dummybane: a tattered cloak with a neon hem
    cape(t, W2, 2.6, { w: 2.2, tatter: true, clasp: THIEF_NEON });
    t.box(2.3, 0.06, 0.05, neon, 0, -1.6, -0.82);
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => {
    if (level >= 5) for (let i = 0; i < 3; i++) a.box(0.5, 0.06, 0.06, neon, 0, -0.9 - i * 0.18, 0.6); // arm wraps
  });
  feet(h, key, W3, (b) => b.box(1.12, 0.1, 1.14, neon, 0, -1.3, 0.02));
  h.muzzles = [];
  const arms = level >= 3 ? [h.rightArm, h.leftArm] : [h.rightArm];
  for (const arm of arms) {
    const g = fist(arm, -1.9, 1.15);
    const gk = wear(h, g, `${key}:gun`);
    const tip = whiteDagger(gk, neon, { glow: level >= 4 });
    gk.done();
    muzzle(h, g, tip, 0);
  }
  h.rightArm.rotation.set(-1.3, 0, 0.2);
  h.leftArm.rotation.set(level >= 3 ? -1.0 : -0.5, 0, -0.35);
  h.pose = { right: -1.3, left: level >= 3 ? -1.0 : -0.5, leftRecoil: 0 };
  h.swing = 1.0;
  h.melee = true;
  h.tracer = THIEF_NEON;
  return own(h, 0);
}

// ------------------------------------------------------------------ Exterminator (neon emerald)

const EXT_NEON = 0x00e676;

/**
 * A white assault rifle on the fist (gun space). o.long: a longer barrel and a scope; o.twin
 * (Onrush): two barrels side by side with a drum mag. Returns the bore point [y, z].
 */
function whiteAssault(k, neon, o = {}) {
  const U = UP;
  const len = o.long ? 2.5 : 2.1;
  k.box(0.32, 1.1, 0.36, W, 0, -0.32, U, { r: 0.05 }); // receiver
  k.box(0.14, 1.0, 0.06, W3, 0, -0.36, U + 0.21); // top rail
  k.box(0.34, 0.8, 0.34, W2, 0, -1.25, U, { r: 0.07 }); // handguard
  for (const s of [-1, 1]) k.box(0.03, 0.66, 0.06, neon, s * 0.18, -1.25, U + 0.05); // neon strips
  const barrels = o.twin ? [-0.09, 0.09] : [0];
  for (const x of barrels) k.cyl(0.065, len - 1.5, W3, x, -1.65 - (len - 1.5) / 2 + 0.2, U + 0.03, { seg: 10 });
  k.cyl(0.11, 0.22, W2, 0, -len + 0.1, U + 0.03, { seg: 8, sz: o.twin ? 1.8 : 1 }); // muzzle brake
  k.box(0.22, 0.24, 0.52, W2, 0, 0.08, U - 0.36, { rx: -0.32, r: 0.04 }); // grip
  if (o.twin) {
    k.cyl(0.34, 0.3, W2, 0, -0.65, U - 0.5, { axis: 'x', seg: 16 }); // drum mag
    k.cyl(0.2, 0.32, neon, 0, -0.65, U - 0.5, { axis: 'x', seg: 12 });
  } else k.box(0.2, 0.3, 0.6, W2, 0, -0.62, U - 0.44, { rx: 0.25, r: 0.03 }); // mag
  k.box(0.24, 0.66, 0.34, W2, 0, 0.52, U + 0.08, { r: 0.05 }); // stock
  if (o.long) {
    k.cyl(0.1, 0.7, W, 0, -0.35, U + 0.42, { seg: 12 }); // scope
    k.cyl(0.1, 0.02, neon, 0, -0.71, U + 0.42, { seg: 12 });
  } else k.box(0.05, 0.1, 0.16, neon, 0, -1.55, U + 0.21); // neon front sight
  return [-len, U + 0.03];
}

/**
 * Exterminator (alternate Mercenary Base): a white mercenary with an assault rifle. Lv 1
 * Firepower: a neon-striped vest. Lv 2 Pursuit: a visor with a neon slit (hidden detection).
 * Lv 3 Assault: ammo pouches and knee pads. Lv 4 Exterminate: a longer scoped rifle. Lv 5
 * Emissary: shoulder pads and a radio pack with a beacon (Onslaught). Lv 6 Onrush: a twin-barrel
 * rifle with a drum and a short cape.
 */
export function makeExterminator(level) {
  const h = blank();
  const key = `mercenaryExterminator${level}`;
  const neon = glowMat(h, EXT_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // a combat helmet with a neon band
  dome(hd, 0.78, 0.6, W2, 0, 0.92, 0);
  hd.torus(0.77, 0.05, W3, 0, 0.93, 0, { rx: PI / 2, seg: 20 });
  hd.cyl(0.765, 0.1, neon, 0, 1.08, 0, { seg: 20, r2: 0.74 });
  if (level >= 2) {
    hd.box(1.32, 0.34, 0.12, W, 0, 0.72, 0.64, { r: 0.06 }); // visor
    hd.box(1.12, 0.07, 0.04, neon, 0, 0.72, 0.71);
  }
  t.box(2.14, 1.6, 1.14, W2, 0, 0.1, 0, { r: 0.1 });
  t.box(2.1, 0.24, 1.12, W3, 0, -0.84, 0, { r: 0.04 }); // belt
  t.box(0.32, 0.2, 0.06, neon, 0, -0.84, 0.58, { r: 0.02 });
  if (level >= 1) {
    // Firepower: a plate vest with a neon stripe
    t.box(1.66, 1.3, 0.22, W, 0, 0.16, 0.57, { r: 0.06 });
    t.box(1.66, 1.38, 0.22, W, 0, 0.12, -0.57, { r: 0.06 });
    t.box(1.2, 0.08, 0.05, neon, 0, 0.55, 0.69);
  }
  if (level >= 3) {
    for (let i = 0; i < 3; i++) {
      t.box(0.42, 0.48, 0.24, W2, (i - 1) * 0.5, -0.3, 0.8, { r: 0.03 }); // ammo pouches
      t.box(0.44, 0.07, 0.26, neon, (i - 1) * 0.5, -0.06, 0.81);
    }
  }
  if (level >= 5) {
    shoulderPads(t, W, 0.6);
    // Emissary: a radio pack with an antenna and a neon beacon
    t.box(1.3, 1.3, 0.6, W2, 0, 0.1, -0.95, { r: 0.08 });
    t.box(1.0, 0.1, 0.05, neon, 0, 0.35, -1.26);
    t.cyl(0.03, 1.2, W3, 0.45, 1.2, -1.0, { seg: 5 });
    t.ball(0.1, neon, 0.45, 1.82, -1.0, { seg: 8, rows: 5 });
  }
  if (level >= 6) {
    cape(t, W2, 1.8, { w: 2.1, clasp: EXT_NEON });
    t.box(2.2, 0.06, 0.05, neon, 0, -0.85, -0.85);
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => {
    if (level >= 4) a.box(0.5, 0.06, 0.04, neon, 0, -0.55, 0.55); // sleeve stripe
  });
  feet(h, key, W2, level >= 3 ? (b) => {
    b.box(0.6, 0.45, 0.24, W, 0, -0.95, 0.56, { r: 0.06 }); // knee pad
    b.box(0.62, 0.06, 0.26, neon, 0, -0.78, 0.57);
  } : null);
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = whiteAssault(gk, neon, { long: level >= 4, twin: level >= 6 });
  gk.done();
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = EXT_NEON;
  return own(h, UP);
}

// ------------------------------------------------------------------ Miner (neon azure)

const MINER_NEON = 0x40c4ff;

/** A white pickaxe in the fist (head at the bottom, -y). o.glow: a glowing head; o.drill: a drill bit. */
function whitePickaxe(k, neon, o = {}) {
  const len = 2.6;
  k.cyl(0.08, len, W3, 0, 0.6 - len / 2, 0, { seg: 10 }); // handle
  k.box(0.2, 0.3, 0.2, W2, 0, 0.55, 0, { r: 0.04 }); // grip wrap
  const hy = 0.6 - len;
  k.box(0.22, 0.28, 0.3, W2, 0, hy, 0, { r: 0.04 }); // head collar
  const head = o.glow ? neon : W;
  for (const s of [-1, 1]) {
    const pts = [[0, 0.12], [0.6, 0.1], [1.05, -0.08], [1.15, -0.2], [0.55, -0.06], [0, -0.12]].map(([zz, yy]) => [s * zz, yy]);
    k.prism(pts, 0.12, head, 0, hy, 0, { bevel: 0.01 });
  }
  if (!o.glow) k.box(0.14, 0.05, 1.6, neon, 0, hy + 0.12, 0); // neon top edge
  if (o.drill) for (let i = 0; i < 3; i++) k.torus(0.16 - i * 0.04, 0.03, neon, 0, hy - 0.25 - i * 0.12, 0, { rx: PI / 2, seg: 10 });
}

/**
 * Miner (alternate Farm): a white miner with a pickaxe. Lv 1 Excavation: overalls and a tool belt.
 * Lv 2 Mining Helmet: a hard hat with a neon headlamp. Lv 3 Better Pickaxe: a neon-lined pickaxe
 * head. Lv 4 Refined Minerals: a backpack of glowing crystals. Lv 5 Mining Industry: a glowing
 * pickaxe with a drill tip, ear protectors and shoulder lights.
 */
export function makeMiner(level) {
  const h = blank();
  const key = `farmMiner${level}`;
  const neon = glowMat(h, MINER_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (level >= 2) {
    // Mining Helmet: a hard hat with a brim and a neon lamp
    dome(hd, 0.8, 0.62, W2, 0, 0.92, 0);
    hd.cyl(0.95, 0.06, W3, 0, 0.93, 0.05, { seg: 22, sz: 1.1 });
    hd.box(0.12, 0.5, 0.12, W, 0, 1.25, 0, { r: 0.04 }); // ridge
    hd.cyl(0.18, 0.14, W, 0, 1.1, 0.72, { axis: 'z', seg: 12 }); // lamp
    hd.cyl(0.13, 0.04, neon, 0, 1.1, 0.8, { axis: 'z', seg: 12 });
  } else {
    // a knit cap
    dome(hd, 0.76, 0.62, W2, 0, 0.88, 0);
    hd.cyl(0.77, 0.16, W3, 0, 0.94, 0, { seg: 18 });
    hd.ball(0.14, neon, 0, 1.55, 0, { seg: 8, rows: 5 });
  }
  if (level >= 5) for (const s of [-1, 1]) hd.cyl(0.22, 0.16, W3, s * 0.8, 0.6, 0, { axis: 'x', seg: 12 }); // ear protectors
  t.box(2.1, 1.6, 1.12, W, 0, 0.1, 0, { r: 0.1 });
  if (level >= 1) {
    // Excavation: overalls and a tool belt with a neon buckle
    t.box(1.4, 1.1, 0.12, W2, 0, -0.25, 0.58, { r: 0.04 });
    for (const s of [-1, 1]) t.box(0.22, 1.2, 0.08, W2, s * 0.55, 0.55, 0.58);
    t.box(2.12, 0.26, 1.14, W3, 0, -0.85, 0, { r: 0.04 });
    t.box(0.34, 0.22, 0.06, neon, 0, -0.85, 0.59, { r: 0.02 });
    t.box(0.36, 0.5, 0.3, W2, -1.0, -1.05, 0.15, { r: 0.05 }); // tool pouch
  } else t.box(2.12, 0.22, 1.14, W3, 0, -0.85, 0, { r: 0.04 });
  if (level >= 4) {
    // Refined Minerals: a backpack frame with glowing crystals
    t.box(1.3, 1.4, 0.5, W2, 0, 0.1, -0.9, { r: 0.08 });
    for (const [x, y, s] of [[-0.35, 1.0, 1], [0.1, 1.15, 1.3], [0.45, 0.95, 0.9]]) {
      t.cyl(0.13 * s, 0.6 * s, neon, x, y, -0.95, { seg: 6, r2: 0.02 });
    }
  }
  if (level >= 5) {
    for (const s of [-1, 1]) {
      t.cyl(0.14, 0.12, W, s * 0.85, 0.7, 0.6, { axis: 'z', seg: 10 }); // shoulder lights
      t.cyl(0.1, 0.04, neon, s * 0.85, 0.7, 0.67, { axis: 'z', seg: 10 });
    }
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => {
    if (level >= 3) a.box(0.5, 0.06, 0.06, neon, 0, -1.25, 0.6); // glove cuffs
  });
  feet(h, key, W3, (b) => b.box(1.12, 0.1, 1.14, neon, 0, -1.3, 0.02));
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:pick`);
  whitePickaxe(gk, neon, { glow: level >= 5, drill: level >= 5 });
  if (level >= 3 && level < 5) gk.box(0.16, 0.08, 0.5, neon, 0, -2.0, 0); // Better Pickaxe: a neon band
  gk.done();
  muzzle(h, g, -2.0, 0.6);
  h.rightArm.rotation.set(-1.4, 0, 0.2);
  h.leftArm.rotation.set(-0.4, 0, -0.3);
  h.pose = { right: -1.4, left: -0.4, leftRecoil: 0 };
  h.melee = true;
  h.tracer = MINER_NEON;
  return own(h, 0);
}

// ------------------------------------------------------------------ Recon (neon orchid)

const RECON_NEON = 0xea80fc;

/**
 * A white pump shotgun on the fist (gun space). o.drum (Shotgun Barrage): a drum mag; o.long
 * (Expert Assassin): a longer barrel with a neon choke. Returns the bore point [y, z].
 */
function whiteShotgun(k, neon, o = {}) {
  const U = UP;
  const len = o.long ? 2.4 : 2.0;
  k.box(0.32, 0.8, 0.36, W, 0, -0.2, U, { r: 0.05 }); // receiver
  k.cyl(0.1, len - 0.6, W3, 0, -0.6 - (len - 0.6) / 2, U + 0.1, { seg: 12 }); // barrel
  k.cyl(0.08, len - 0.9, W2, 0, -0.6 - (len - 0.9) / 2, U - 0.1, { seg: 10 }); // tube under it
  k.box(0.3, 0.55, 0.3, W2, 0, -1.1, U - 0.06, { r: 0.08 }); // pump
  for (let i = 0; i < 4; i++) k.box(0.32, 0.04, 0.32, W3, 0, -0.9 - i * 0.13, U - 0.06);
  k.cyl(0.12, 0.12, neon, 0, -len + 0.06, U + 0.1, { seg: 12 }); // neon muzzle ring
  if (o.long) k.cyl(0.13, 0.25, W, 0, -len - 0.1, U + 0.1, { seg: 12 }); // choke
  k.box(0.22, 0.24, 0.5, W2, 0, 0.12, U - 0.36, { rx: -0.32, r: 0.04 }); // grip
  k.box(0.26, 0.7, 0.36, W2, 0, 0.55, U + 0.04, { r: 0.06 }); // stock
  k.box(0.27, 0.12, 0.37, neon, 0, 0.35, U + 0.04);
  if (o.drum) {
    k.cyl(0.36, 0.3, W2, 0, -0.35, U - 0.5, { axis: 'x', seg: 16 });
    k.cyl(0.22, 0.32, neon, 0, -0.35, U - 0.5, { axis: 'x', seg: 12 });
  }
  return [-len - (o.long ? 0.22 : 0), U + 0.1];
}

/**
 * Recon (alternate Shotgunner): a white scout with a pump shotgun. Lv 1 Faster Reload: a cap
 * and a shell holder on the stock. Lv 2 Radio Signal: a shoulder radio with an antenna. Lv 3
 * Heavy Shells: a bandolier of neon shells. Lv 4 Shotgun Barrage: a drum mag and knee pads.
 * Lv 5 Expert Assassin: a long coat, a longer barrel and a neon visor.
 */
export function makeRecon(level) {
  const h = blank();
  const key = `shotgunnerRecon${level}`;
  const neon = glowMat(h, RECON_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (level >= 1) {
    // a cap with a neon peak edge
    dome(hd, 0.77, 0.5, W2, 0, 0.95, 0);
    hd.box(0.9, 0.06, 0.6, W3, 0, 0.98, 0.75, { r: 0.03 });
    hd.box(0.9, 0.06, 0.05, neon, 0, 0.98, 1.05);
  } else hood(hd, W2);
  if (level >= 5) {
    hd.box(1.3, 0.28, 0.1, W, 0, 0.7, 0.64, { r: 0.05 }); // visor
    hd.box(1.1, 0.06, 0.04, neon, 0, 0.7, 0.7);
  }
  t.box(2.1, 1.6, 1.12, W2, 0, 0.1, 0, { r: 0.1 });
  t.box(2.12, 0.24, 1.14, W3, 0, -0.84, 0, { r: 0.04 });
  t.box(0.32, 0.2, 0.06, neon, 0, -0.84, 0.58, { r: 0.02 });
  if (level >= 2) {
    // Radio Signal: a radio on the shoulder strap
    t.box(0.4, 0.55, 0.24, W, 0.6, 0.55, 0.66, { r: 0.05 });
    t.box(0.3, 0.08, 0.05, neon, 0.6, 0.65, 0.79);
    t.cyl(0.025, 0.7, W3, 0.72, 1.1, 0.66, { seg: 5 });
  }
  if (level >= 3) {
    // Heavy Shells: a bandolier of shells across the chest
    t.box(0.26, 2.4, 0.1, W3, 0, 0.1, 0.62, { rz: -0.6 });
    for (let i = 0; i < 6; i++) {
      const d = -0.75 + i * 0.3;
      t.cyl(0.07, 0.2, neon, Math.sin(-0.6) * -d, 0.1 + Math.cos(-0.6) * d, 0.7, { seg: 6, rz: -0.6 });
    }
  }
  if (level >= 5) {
    cape(t, W2, 2.5, { w: 2.2 });
    t.box(2.3, 0.06, 0.05, neon, 0, -1.55, -0.8);
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => {
    if (level >= 3) a.box(0.5, 0.06, 0.04, neon, 0, -0.55, 0.55); // sleeve stripe
  });
  feet(h, key, W2, level >= 4 ? (b) => {
    b.box(0.6, 0.45, 0.24, W, 0, -0.95, 0.56, { r: 0.06 }); // knee pad
    b.box(0.62, 0.06, 0.26, neon, 0, -0.78, 0.57);
  } : null);
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = whiteShotgun(gk, neon, { drum: level >= 4, long: level >= 5 });
  if (level >= 1) for (let i = 0; i < 3; i++) gk.cyl(0.06, 0.2, neon, 0.15, 0.4 + i * 0.14, UP + 0.04, { axis: 'x', seg: 6 }); // shell holder
  gk.done();
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = RECON_NEON;
  return own(h, UP);
}

// ------------------------------------------------------------------ Blaster (neon raspberry)

const BLASTER_NEON = 0xf50057;

/**
 * A white energy blaster on the fist (gun space): a chunky body, glowing coils and an emitter.
 * o.cannon (Energy Cannon+): a wide cannon mouth and a power cell; o.mega: bigger, three coils
 * more. Returns the bore point [y, z].
 */
function whiteBlaster(k, neon, o = {}) {
  const U = UP;
  const w = o.mega ? 1.25 : 1;
  const len = o.mega ? 2.4 : o.cannon ? 2.1 : 1.8;
  k.box(0.38 * w, 1.0, 0.44 * w, W, 0, -0.35, U, { r: 0.08 }); // body
  k.box(0.2, 0.9, 0.08, W3, 0, -0.4, U + 0.25 * w); // top rib
  const coils = o.mega ? 5 : o.cannon ? 4 : 3;
  for (let i = 0; i < coils; i++) k.torus(0.2 * w, 0.045, i % 2 ? W3 : neon, 0, -0.95 - i * ((len - 1.25) / coils), U, { rx: PI / 2, seg: 14 }); // coils
  k.cyl(0.13 * w, len - 0.85, W2, 0, -0.85 - (len - 0.85) / 2, U, { seg: 12 }); // barrel
  const mouth = o.cannon ? 0.24 * w : 0.16;
  k.cyl(mouth, 0.22, W, 0, -len, U, { seg: 14, r2: mouth * 0.8 }); // emitter
  k.cyl(mouth * 0.7, 0.04, neon, 0, -len - 0.12, U, { seg: 14 }); // glowing core
  k.box(0.22, 0.24, 0.5, W2, 0, 0.1, U - 0.36, { rx: -0.32, r: 0.04 }); // grip
  k.box(0.24, 0.55, 0.32, W2, 0, 0.45, U + 0.06, { r: 0.06 }); // stock
  if (o.cannon) {
    k.box(0.3, 0.5, 0.3, W3, 0, -0.5, U - 0.42 * w, { r: 0.05 }); // power cell
    k.box(0.2, 0.36, 0.05, neon, 0, -0.5, U - 0.58 * w);
  }
  if (o.mega) for (const sx of [-1, 1]) k.box(0.06, 0.9, 0.3, W3, sx * 0.3, -0.4, U, { r: 0.02 }); // side fins
  return [-len - 0.12, U];
}

/**
 * Blaster (alternate Commando): a white trooper with an energy blaster. Lv 1 Ranged Blasting:
 * a long-range sight on the helmet. Lv 2 Enhanced Module: a visor with a neon slit (hidden
 * detection) and a module on the back. Lv 3 Energy Cannon: the cannon mouth and a power cell.
 * Lv 4 Supercharge: shoulder pads and glowing coil packs. Lv 5 Mega Blaster: a bigger gun and a cape.
 */
export function makeBlaster(level) {
  const h = blank();
  const key = `commandoBlaster${level}`;
  const neon = glowMat(h, BLASTER_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  dome(hd, 0.8, 0.62, W2, 0, 0.9, 0); // round helmet
  hd.box(0.2, 0.5, 0.9, W3, 0.78, 0.6, 0, { r: 0.05 }); // ear guard
  hd.ball(0.08, neon, 0.88, 0.7, 0.2, { seg: 8, rows: 5 });
  if (level >= 1) {
    hd.box(0.14, 0.14, 0.5, W, -0.82, 0.8, 0.35, { r: 0.03 }); // sight arm
    hd.cyl(0.06, 0.02, neon, -0.82, 0.8, 0.61, { axis: 'z', seg: 10 });
  }
  if (level >= 2) {
    hd.box(1.34, 0.32, 0.12, W, 0, 0.72, 0.64, { r: 0.06 }); // visor
    hd.box(1.12, 0.07, 0.04, neon, 0, 0.72, 0.71);
  }
  t.box(2.1, 1.6, 1.12, W2, 0, 0.1, 0, { r: 0.1 });
  t.box(2.12, 0.24, 1.14, W3, 0, -0.84, 0, { r: 0.04 }); // belt
  t.box(0.32, 0.2, 0.06, neon, 0, -0.84, 0.58, { r: 0.02 });
  t.box(1.5, 1.2, 0.2, W, 0, 0.2, 0.58, { r: 0.06 }); // chest plate
  t.cyl(0.18, 0.05, neon, 0, 0.3, 0.7, { axis: 'z', seg: 14 }); // chest core
  if (level >= 2) {
    t.box(1.2, 1.1, 0.5, W, 0, 0.15, -0.8, { r: 0.08 }); // module
    t.box(0.9, 0.08, 0.05, neon, 0, 0.35, -1.06);
  }
  if (level >= 4) {
    shoulderPads(t, W, 0.6);
    for (const sx of [-1, 1]) t.cyl(0.14, 0.7, neon, sx * 0.4, 0.2, -1.1, { seg: 10 }); // coil packs
  }
  if (level >= 5) {
    cape(t, W2, 1.9, { w: 2.1, clasp: BLASTER_NEON });
    t.box(2.2, 0.06, 0.05, neon, 0, -0.95, -0.85);
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => {
    if (level >= 3) a.box(0.5, 0.06, 0.04, neon, 0, -0.55, 0.55); // sleeve stripe
  });
  feet(h, key, W2, level >= 4 ? (b) => {
    b.box(0.6, 0.45, 0.24, W, 0, -0.95, 0.56, { r: 0.06 }); // knee pad
    b.box(0.62, 0.06, 0.26, neon, 0, -0.78, 0.57);
  } : null);
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = whiteBlaster(gk, neon, { cannon: level >= 3, mega: level >= 5 });
  gk.done();
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = BLASTER_NEON;
  return own(h, UP);
}

// ------------------------------------------------------------------ Programmer (neon code green)

const PROG_NEON = 0x00ff41;

/**
 * Programmer (alternate Commander): a white coder with a headset and a laptop held open in the
 * left hand, a small data pistol in the right. Lv 1 Initialize: a glowing laptop screen. Lv 2
 * Enhanced Interface: glasses with a neon lens line and a wrist pad. Lv 3 System Overdrive: a
 * server pack on the back with blinking lights. Lv 4 Amplifier: an antenna dish on the pack.
 * Lv 5 Final Protocol: a long coat with neon code lines.
 */
export function makeProgrammer(level) {
  const h = blank();
  const key = `commanderProgrammer${level}`;
  const neon = glowMat(h, PROG_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // a headset: band over the head, ear cups, a mic
  hd.torus(0.8, 0.06, W3, 0, 0.55, 0, { seg: 20, arc: PI });
  for (const sx of [-1, 1]) hd.cyl(0.26, 0.16, W, sx * 0.82, 0.55, 0, { axis: 'x', seg: 14 });
  hd.box(0.06, 0.06, 0.6, W3, 0.82, 0.3, 0.35);
  hd.ball(0.07, neon, 0.82, 0.3, 0.66, { seg: 8, rows: 5 });
  if (level >= 2) {
    hd.box(1.3, 0.22, 0.08, W, 0, 0.72, 0.64, { r: 0.04 }); // glasses
    hd.box(1.1, 0.04, 0.04, neon, 0, 0.72, 0.69);
  }
  t.box(2.1, 1.6, 1.12, W2, 0, 0.1, 0, { r: 0.1 }); // hoodie
  t.box(2.12, 0.24, 1.14, W3, 0, -0.84, 0, { r: 0.04 });
  t.box(0.9, 0.5, 0.1, W3, 0, -0.35, 0.58, { r: 0.04 }); // front pocket
  t.box(0.5, 0.06, 0.04, neon, 0, 0.5, 0.58); // logo line
  if (level >= 3) {
    // server pack with blinking lights
    t.box(1.3, 1.5, 0.6, W, 0, 0.1, -0.95, { r: 0.06 });
    for (let i = 0; i < 4; i++) {
      t.box(1.0, 0.04, 0.05, W3, 0, -0.45 + i * 0.35, -1.26);
      t.ball(0.05, neon, 0.38, -0.3 + i * 0.35, -1.27, { seg: 6, rows: 4 });
    }
  }
  if (level >= 4) {
    t.cyl(0.03, 0.8, W3, 0, 1.2, -0.95, { seg: 5 }); // antenna
    t.cyl(0.3, 0.06, W, 0, 1.62, -0.95, { seg: 14, rx: 0.5 }); // dish
    t.ball(0.07, neon, 0, 1.68, -0.9, { seg: 8, rows: 5 });
  }
  if (level >= 5) {
    cape(t, W2, 2.5, { w: 2.2 });
    for (let i = 0; i < 3; i++) t.box(0.06, 1.4 - i * 0.3, 0.04, neon, -0.6 + i * 0.6, -0.9, -0.82);
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a) => {
    if (level >= 2) {
      a.box(0.4, 0.2, 0.5, W, 0, -1.0, 0.1, { r: 0.04 }); // wrist pad
      a.box(0.3, 0.04, 0.4, neon, 0, -0.88, 0.1);
    }
  });
  feet(h, key, W2, null);
  // the laptop, held open in the left hand
  const lp = fist(h.leftArm, -1.9, 0.9);
  const lk = wear(h, lp, `${key}:laptop`);
  lk.box(1.1, 0.06, 0.75, W, 0, -0.1, 0.3, { r: 0.03 }); // base
  lk.box(1.1, 0.7, 0.05, W2, 0, 0.25, -0.05, { rx: -0.25, r: 0.03 }); // lid
  lk.box(0.95, 0.55, 0.02, level >= 1 ? neon : W3, 0, 0.25, -0.02, { rx: -0.25 }); // screen
  lk.done();
  // the data pistol in the right hand
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  gk.box(0.26, 0.8, 0.32, W, 0, -0.3, UP, { r: 0.05 });
  gk.cyl(0.08, 0.5, W3, 0, -0.9, UP + 0.04, { seg: 10 });
  gk.cyl(0.09, 0.04, neon, 0, -1.16, UP + 0.04, { seg: 10 });
  gk.box(0.2, 0.22, 0.45, W2, 0, 0.05, UP - 0.32, { rx: -0.3, r: 0.04 });
  gk.done();
  muzzle(h, g, -1.18, UP + 0.04);
  aimLong(h);
  h.tracer = PROG_NEON;
  return own(h, UP);
}

export const MODELS = {
  commandoBlaster: makeBlaster,
  commanderProgrammer: makeProgrammer,
  cowboyThief: makeThief,
  mercenaryExterminator: makeExterminator,
  farmMiner: makeMiner,
  shotgunnerRecon: makeRecon,
};
