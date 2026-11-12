// Tower models: people, batch 21 (dressed with the vehicle kit in ../vehicles.js).
// In here: Gift Elf, Stormwing (the pilot and its storm fighter), Punkbuster, Cyberblade, and the
// hero towers Wizard, Chef and Yasuke.
// Each makeX(level) builds one tower's look; MODELS at the bottom says which tower uses which,
// and ../models.js lays it over TOWER_MODELS.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.
//
// The three hero towers still get blitzup.js on top, but only its effects now (orbiting lights,
// ground rings, growing at max level): their outfit colours and signature pieces per level are
// built here, because blitzup's paint() can not recolour kit pieces.
// Lv numbers in the comments are the level index the builders get (Lv 0 = the first look).

import * as THREE from 'three';
import { glowMat, tone } from '../vehicles.js';
import { bomb, hullZ, missile } from '../airunits.js';
import { makeHumanoid } from './kit.js';
import {
  GOLD, INK, STEEL, WOOD, band, belt, boots, collar, dome, fist, hair, muzzle, own, pouch, sash, shardOf, wear,
} from './people1.js';
import { shoulderPads } from './people2.js';
import { bombCart, flightHelmet, scarf, visorHelmet, wand } from './people4.js';
import { feet, glassMat, hands } from './people5.js';
import { arc } from './people8.js';
import { gift, pumpkin } from './people12.js';
import { limb } from './people15.js';
import { speaker, spinner } from './machines5.js';

const PI = Math.PI;
const SNOW = 0xfafafa;
const RED = 0xc62828;

// ------------------------------------------------------------------ shared bits for this batch

/** Melee pose: weapon raised over the shoulder, a swing brings it down in front. */
function meleePose(h, right, left, swing) {
  h.rightArm.rotation.set(right, 0, 0.2);
  h.leftArm.rotation.set(left, 0, -0.2);
  h.pose = { right, left, leftRecoil: 0 };
  h.swing = swing;
}

/** A held thing in the right fist, built by `build(k)` (a kit in gun space: it points along -y). */
function held(h, key, build, y = -1.9, s = 1) {
  const g = fist(h.rightArm, y, s);
  const k = wear(h, g, `${key}:held`);
  build(k);
  k.done();
  return g;
}

/**
 * A pointed hat as a bent cone: n rings from the brim at y up to a tip that leans along (dx, dz)
 * (head space). cols: a colour per ring (cycled). Returns the tip point.
 */
function bentCone(k, y, r, n, len, lean, cols, o = {}) {
  let p = [0, y, o.z ?? 0];
  const step = len / n;
  for (let i = 0; i < n; i++) {
    const a = (lean * i) / n;
    const r0 = r * (1 - i / n) + 0.04;
    const r1 = r * (1 - (i + 1) / n) + 0.04;
    const d = [Math.sin(a) * (o.dx ?? 1), Math.cos(a), Math.sin(a) * (o.dz ?? 0)];
    const q = [p[0] + d[0] * step, p[1] + d[1] * step, p[2] + d[2] * step];
    limb(k, p, q, r0, r1, cols[i % cols.length], 14);
    p = q;
  }
  return p;
}

/** A flat lightning bolt zigzag (x, y outline, `d` thick, facing +z), centred on (x, y, z). */
function boltShape(k, s, d, col, x, y, z, o = {}) {
  const pts = [[0.1, 0.5], [-0.25, 0.02], [0.02, 0.02], [-0.12, -0.5], [0.28, 0.08], [0.0, 0.08], [0.2, 0.5]];
  k.prism(pts.map(([a, b]) => [a * s, b * s]), d, col, x, y, z, { ry: PI / 2, ...o });
}

/** A Dimension Shard pin (alternate forms), a small glowing diamond facing +z. */
function shardPin(k, h, x, y, z) {
  k.box(0.2, 0.2, 0.05, shardOf(h), x, y, z, { rz: PI / 4 });
}

// ------------------------------------------------------------------ Gift Elf

/**
 * Gift Elf: a Christmas elf in a red tunic with white fur trim and a floppy green-and-red hat,
 * throwing presents. The gift sack on its back grows every level and holds one more present.
 * Lv 2 a candy cane on the belt, Lv 3 a jingle bell collar, Lv 4 a golden glowing present and a
 * star on the hat.
 */
export function makeGiftElf(level) {
  const skin = 0xf1c27d;
  const green = 0x2e7d32;
  const top = level >= 4;
  const h = makeHumanoid({ skin, shirt: RED, pants: 0x1b5e20, arms: RED, face: 'smile' });
  const key = `giftElf${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const gold = glowMat(h, 0xffd740);
  hair(hd, 0xa1662f, { h: 0.4 });
  for (const s of [-1, 1]) {
    hd.cyl(0.15, 0.6, skin, s * 0.86, 0.8, -0.02, { seg: 5, r2: 0.01, rz: -s * 1.15, sz: 0.5 }); // pointy ears
    hd.cyl(0.07, 0.35, 0xe8a87c, s * 0.82, 0.78, 0.02, { seg: 5, r2: 0.01, rz: -s * 1.15, sz: 0.4 });
  }
  // the floppy hat: a fur cuff, a cone of green and red bands flopping to the side, a bobble
  hd.cyl(0.76, 0.3, SNOW, 0, 1.05, 0, { seg: 22 });
  hd.torus(0.76, 0.06, 0xeeeeee, 0, 1.2, 0, { rx: PI / 2, seg: 22 });
  const tip = bentCone(hd, 1.18, 0.7, 6, 2.0, 1.9, [green, RED], { dx: 1, dz: -0.35 });
  hd.ball(0.22, top ? gold : SNOW, tip[0], tip[1], tip[2], { seg: 10, rows: 7 });
  if (top) {
    // a gold star on the hat front
    hd.cyl(0.24, 0.08, gold, 0, 1.3, 0.72, { axis: 'z', seg: 5 });
    hd.cyl(0.14, 0.1, GOLD, 0, 1.3, 0.74, { axis: 'z', seg: 5, rz: PI / 5 });
  }
  // the tunic: a white fur hem and collar, black belt with a gold buckle, gold buttons
  t.cyl(0.66, 0.34, SNOW, 0, -0.9, 0, { seg: 18, sx: 1.68, sz: 0.92 });
  t.cyl(0.62, 0.22, SNOW, 0, 0.95, 0, { seg: 18, sx: 1.2, sz: 0.85 });
  belt(t, 0x212121, GOLD, -0.5);
  t.box(0.24, 0.16, 0.06, 0x212121, 0, -0.5, 0.6); // buckle hole
  for (const y of [0.55, 0.15]) t.ball(0.08, GOLD, 0, y, 0.53, { seg: 8, rows: 5 });
  shardPin(t, h, 0.65, 0.45, 0.52);
  if (level >= 2) {
    // Naughty List: a candy cane hooked on the belt and a rolled list
    t.tube([[1.15, -1.3, 0.3], [1.15, -0.3, 0.3], [1.0, -0.05, 0.3], [0.82, -0.2, 0.3]], 0.1, 0xd32f2f, { seg: 16, sides: 8 });
    for (let i = 0; i < 5; i++) t.torus(0.1, 0.035, SNOW, 1.15, -1.2 + i * 0.2, 0.3, { rx: PI / 2 + 0.3, seg: 10 });
    t.cyl(0.14, 0.55, 0xfff8e1, -1.12, -0.7, 0.3, { seg: 10 });
    t.torus(0.15, 0.03, RED, -1.12, -0.7, 0.3, { rx: PI / 2, seg: 10 });
  }
  if (level >= 3) {
    // Stun Presents: a green collar with glowing jingle bells
    t.cyl(0.66, 0.2, green, 0, 0.78, 0, { seg: 18, sx: 1.6, sz: 0.88 });
    for (const x of [-0.55, 0, 0.55]) {
      t.ball(0.15, gold, x, 0.56, 0.62, { seg: 10, rows: 7 });
      t.box(0.2, 0.03, 0.04, 0x8d6e00, x, 0.52, 0.76);
    }
  }
  // the gift sack on the back, bigger every level, with one more present poking out each level
  const ss = 0.8 + level * 0.14;
  const sz = -0.55 - ss * 0.62;
  t.ball(ss, 0x8b1a1a, 0, 0.0 + ss * 0.2, sz, { sy: 1.05, sz: 0.7, seg: 16, rows: 10 });
  t.cyl(ss * 0.4, ss * 0.35, 0x8b1a1a, 0, ss * 1.15, sz, { seg: 12, r2: ss * 0.55 });
  t.torus(ss * 0.38, 0.06, 0xffd54f, 0, ss * 1.0, sz, { rx: PI / 2, seg: 14 });
  for (const s of [-1, 1]) t.box(0.18, 0.16, 1.2, 0xffd54f, s * 0.55, 0.98, -0.05); // shoulder ropes
  const gifts = [[0x1e88e5, 0xffeb3b], [0x43a047, RED], [0xffd54f, RED], [0x8e24aa, SNOW], [SNOW, 0x43a047]];
  for (let i = 0; i <= level; i++) {
    const [c, r] = gifts[i];
    const gs = 0.38 + level * 0.03;
    gift(t, (i - level / 2) * 0.42, ss * 1.35 + (i % 2) * 0.15, sz + (i % 2 ? 0.12 : -0.08), gs, c, r, { ry: i * 0.5 });
  }
  hd.done();
  t.done();
  hands(h, key, null, RED, (a) => a.box(1.1, 0.24, 1.1, SNOW, 0, -1.5, 0, { r: 0.08 })); // fur cuffs
  feet(h, key, 0x1b5e20, (b) => {
    // curly toes with a bell, fur cuff
    b.tube([[0, -1.9, 0.5], [0, -1.85, 0.85], [0, -1.6, 1.0], [0, -1.45, 0.85]], 0.13, 0x1b5e20, { seg: 12, sides: 8 });
    b.ball(0.12, GOLD, 0, -1.42, 0.78, { seg: 8, rows: 6 });
    b.box(1.12, 0.14, 1.14, SNOW, 0, -1.38, 0.02);
  });
  // the present in the raised right hand
  const ps = 0.6 + level * 0.08;
  const g = held(h, key, (k) => {
    gift(k, 0, -0.2, 0, ps, top ? 0xffc107 : 0x43a047, top ? RED : SNOW);
    if (top) for (const s of [-1, 1]) k.box(ps * 0.6, 0.04, 0.04, gold, s * ps * 0.3, -0.2 + ps * 0.5, ps * 0.5); // glowing seams
    if (top) k.ball(ps * 0.12, gold, 0, -0.2 + ps * 0.62, 0, { seg: 8, rows: 5 });
  }, -2.2);
  h.muzzles = [];
  muzzle(h, g, -0.3, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-0.6, 0, -0.3);
  h.pose = { right: -2.8, left: -0.6, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = top ? { color: 0xffc107, size: 0.65, arc: 5, glowing: true } : { color: 0x43a047, size: 0.5 + level * 0.03, arc: 4.5 };
  h.tracer = 0xffd740;
  return own(h, 0);
}

// ------------------------------------------------------------------ Stormwing

/**
 * The storm fighter: a grey jet (darker every level) with lightning stripes on the wings. It flies
 * nose first along +z. Lv 1 bomb racks, Lv 2 tesla wingtips, Lv 3 a second rack, missile pods
 * and twin engines, Lv 4 a glowing storm core on the spine with arcs over it.
 * Returns { plane, muzzles } with plane.userData { bank, prop, bay, missiles } for views.js.
 */
function stormJet(h, level) {
  const plane = new THREE.Group();
  const bank = new THREE.Group();
  plane.add(bank);
  bank.scale.setScalar(1 + level * 0.08);
  const k = wear(h, bank, `stormJet${level}`);
  const P = [0x78909c, 0x607d8b, 0x546e7a, 0x455a64, 0x37474f][level];
  const D = 0x263238;
  const line = tone(P, 0.7);
  const volt = glowMat(h, level >= 4 ? 0x80d8ff : 0xffeb3b);
  const r = 0.56;
  // fuselage, spine and dark nose
  hullZ(k, [[-2.9, r * 0.7], [-2.2, r], [1.2, r], [2.4, r * 0.75]], P, 0, 0, { sy: 0.9, seg: 14 });
  hullZ(k, [[2.4, r * 0.75], [3.3, r * 0.35], [3.9, 0.04]], D, 0, 0, { sy: 0.9, seg: 14 });
  k.cyl(0.02, 0.5, 0x111111, 0, 0, 4.1, { axis: 'z', seg: 4 }); // pitot
  k.box(r * 0.7, r * 0.5, 3.0, P, 0, r * 0.6, -1.0, { r: 0.08 }); // spine
  for (const z of [-1.6, -0.2, 1.6]) k.torus(r, 0.016, line, 0, 0, z, { sy: 0.9, seg: 14 }); // panel lines
  // canopy on its sill
  k.box(r * 1.1, 0.08, 1.7, D, 0, r * 0.72, 1.3, { r: 0.03 });
  k.ball(r * 0.62, glowMat(h, 0x4fc3f7, 0.6), 0, r * 0.82, 1.3, { sz: 2.2, seg: 12, rows: 7 });
  k.box(r * 1.0, 0.04, 0.06, D, 0, r * 1.36, 1.15); // canopy bow
  // a lightning stripe round the nose
  boltShape(k, 0.9, 0.04, volt, 0.55, 0.05, 2.0, { ry: 0.12 });
  boltShape(k, 0.9, 0.04, volt, -0.55, 0.05, 2.0, { ry: -0.12 });
  // swept wings with zigzag lightning on top, flaps, lights
  const xr = 0.45;
  for (const sd of [-1, 1]) {
    const xt = sd * 3.7;
    k.plan([[sd * xr, 1.0], [xt, -1.0], [xt, -1.6], [sd * xr, -1.4]], 0.14, P, 0, -0.2, 0, { bevel: 0.05 });
    k.tube([[sd * 0.9, -0.04, 0.4], [sd * 1.6, -0.04, 0.05], [sd * 1.75, -0.04, -0.35], [sd * 2.6, -0.04, -0.6], [sd * 2.75, -0.04, -0.95], [sd * 3.5, -0.04, -1.2]], 0.05, volt, { seg: 24, sides: 4, tension: 0 });
    k.box(2.6, 0.03, 0.06, line, sd * 2.0, -0.07, -1.38, { ry: sd * 0.08 }); // flap line
    k.box(0.08, 0.08, 0.08, sd < 0 ? 0xff1744 : 0x00e676, xt, -0.13, -1.05);
    // tailplanes and canted twin fins
    k.plan([[sd * 0.4, -2.0], [sd * 1.7, -2.5], [sd * 1.7, -2.9], [sd * 0.4, -2.9]], 0.08, P, 0, -0.05, 0, { bevel: 0.03 });
    k.prism([[-2.95, 0], [-2.0, 0], [-2.55, 1.3], [-2.95, 1.3]], 0.08, D, sd * 0.42, r * 0.45, 0, { rz: -sd * 0.3, bevel: 0.02 });
    boltShape(k, 0.6, 0.03, volt, sd * (0.42 + 0.3), r * 0.45 + 0.85, -2.6, { ry: 0, rz: -sd * 0.3 });
    if (level >= 1) {
      // Bomb Bay: racks under the wings, two from Lv 3
      for (let i = 0; i < (level >= 3 ? 2 : 1); i++) {
        const x = sd * (1.4 + i * 0.9);
        const z = -0.3 - i * 0.35;
        k.box(0.09, 0.22, 0.8, D, x, -0.36, z);
        bomb(k, x, -0.7, z, 1.3, 0.24, 0x37474f, level >= 4 ? 0x80d8ff : 0xffeb3b);
      }
    }
    if (level >= 2) {
      // Storm Radar: tesla rods on the wingtips with glowing tips
      k.cyl(0.08, 1.2, STEEL, xt, -0.12, -1.2, { axis: 'z', seg: 8 });
      for (let i = 0; i < 3; i++) k.torus(0.1, 0.03, 0xb87333, xt, -0.12, -0.8 - i * 0.2, { seg: 10 });
      k.ball(0.14, glowMat(h, 0x80d8ff), xt, -0.12, -0.5, { seg: 8, rows: 6 });
    }
    if (level >= 3) {
      // missile pods at the wing roots
      k.cyl(0.24, 1.4, D, sd * 0.95, -0.4, 0.5, { axis: 'z', seg: 12 });
      for (const [dx, dy] of [[-0.09, 0.09], [0.09, 0.09], [-0.09, -0.09], [0.09, -0.09]]) missile(k, sd * 0.95 + dx, -0.4 + dy, 1.05, 0.5, 0.05, 0xeeeeee, 0xff3d00);
    }
  }
  // engines: nozzles with glowing burners
  const burn = glowMat(h, 0x40c4ff);
  for (const x of level >= 3 ? [-0.3, 0.3] : [0]) {
    const rn = level >= 3 ? 0.28 : 0.4;
    k.cyl(rn * 0.86, 0.5, 0x2a2c2e, x, 0, -3.1, { axis: 'z', r2: rn, seg: 12 });
    k.cyl(rn * 0.72, 0.06, burn, x, 0, -3.36, { axis: 'z', seg: 12 });
  }
  if (level >= 4) {
    // Thunderhead: a storm core on the spine with arcs dancing over it
    k.cyl(0.32, 1.4, glassMat(h, 0xb3e5fc, 0.45), 0, r * 0.95, -0.9, { axis: 'z', seg: 14 });
    k.cyl(0.2, 1.2, glowMat(h, 0x80d8ff), 0, r * 0.95, -0.9, { axis: 'z', seg: 12 });
    for (const z of [-1.5, -0.3]) k.torus(0.33, 0.04, STEEL, 0, r * 0.95, z, { seg: 14 });
    for (let i = 0; i < 3; i++) arc(k, [0, r * 1.3, -1.4 + i * 0.5], [0, r * 2.2, -1.2 + i * 0.4], volt, 0.12, i + 1);
  }
  // nose guns
  for (const x of [-0.6, 0.6]) k.cyl(0.05, 0.7, 0x16181a, x, -0.2, 2.3, { axis: 'z', seg: 8 });
  k.done();
  const muzzles = [];
  const missiles = [];
  const point = (x, y, z, list) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    bank.add(m);
    list.push(m);
  };
  point(-0.6, -0.2, 2.65, muzzles);
  point(0.6, -0.2, 2.65, muzzles);
  if (level >= 3) for (const sd of [-1, 1]) point(sd * 0.95, -0.4, 1.4, missiles);
  const bay = new THREE.Object3D();
  bay.position.set(0, -0.8, 0);
  bank.add(bay);
  plane.userData = { bank, prop: null, bay, missiles };
  return { plane, muzzles };
}

/**
 * Stormwing: a storm pilot on a runway pad waving a light wand, plus its storm fighter flying
 * circles. Lv 1 a bomb cart and a belt, Lv 2 a radar dish that turns and a helmet antenna, Lv 3
 * shoulder pads and a second cart, Lv 4 blue lightning everywhere and a glowing storm rod.
 */
export function makeStormwing(level) {
  const suit = 0x455a64;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: suit, pants: 0x37474f, arms: suit, face: 'soldier' });
  const key = `stormwing${level}`;
  const boltHex = level >= 4 ? 0x80d8ff : 0xffeb3b;
  const volt = glowMat(h, boltHex);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  flightHelmet(hd, 0x607d8b, volt, { stripe: 0xffeb3b });
  boltShape(hd, 0.5, 0.06, volt, 0.6, 1.25, 0.2, { rz: -0.3, ry: PI / 2 + 0.9 });
  if (level >= 2) {
    hd.cyl(0.03, 0.9, INK, -0.72, 1.4, -0.2, { seg: 5 }); // antenna
    hd.ball(0.06, volt, -0.72, 1.86, -0.2, { seg: 6, rows: 4 });
  }
  // flight suit: zip, a harness, chest pockets and the lightning patch
  collar(t, tone(suit, 0.8), { buttons: false });
  t.box(0.06, 1.7, 0.05, 0xb0bec5, 0.08, -0.05, 0.53);
  for (const s of [-1, 1]) t.box(0.18, 2.0, 0.08, INK, s * 0.55, 0.05, 0.54);
  t.box(2.08, 0.16, 1.1, INK, 0, 0.35, 0);
  t.box(0.24, 0.22, 0.06, STEEL, 0, 0.35, 0.57, { r: 0.02 }); // harness buckle
  pouch(t, 0.62, -0.25, 0.5, 0.42, 0.42, tone(suit, 0.85), 0.08);
  t.cyl(0.24, 0.05, 0x263238, -0.55, -0.25, 0.53, { axis: 'z', seg: 14 });
  boltShape(t, 0.4, 0.04, volt, -0.55, -0.25, 0.56);
  if (level >= 1) belt(t, 0x212121, 0x9e9e9e, -0.84);
  if (level >= 3) shoulderPads(t, 0x263238, 0.5);
  t.box(1.1, 1.0, 0.36, 0x37474f, 0, 0.05, -0.68, { r: 0.08 }); // parachute pack
  t.box(1.0, 0.1, 0.38, INK, 0, -0.15, -0.68);
  hd.done();
  t.done();
  hands(h, key, 0x263238, tone(suit, 0.8));
  feet(h, key, 0x212121);
  // a light wand in the raised hand
  held(h, key, (k) => wand(k, volt));
  h.rightArm.rotation.set(PI * 0.85, 0, 0.25);
  h.pose = { right: PI * 0.85, left: 0, leftRecoil: 0 };
  // the runway pad with glowing stripes, a bomb cart from Lv 1, a radar dish from Lv 2
  const r = wear(h, h.root, `${key}:pad`);
  r.box(4.2, 0.1, 1.4, 0x37474f, 0, 0.05, -1.7, { r: 0.03 });
  r.box(4.24, 0.04, 0.08, 0x263238, 0, 0.1, -1.0);
  for (const x of [-1.4, -0.45, 0.5, 1.45]) r.box(0.55, 0.03, 0.18, volt, x, 0.11, -1.7);
  for (const x of [-2.05, 2.05]) r.cyl(0.08, 0.1, glowMat(h, 0xff9100), x, 0.14, -1.7, { seg: 8 });
  if (level >= 1) bombCart(r, 2.1, 0.6, level >= 4 ? 0x263238 : 0x37474f);
  if (level >= 3) bombCart(r, 2.1, 1.9, 0x37474f);
  if (level >= 2) {
    r.cyl(0.08, 2.4, STEEL, -2.1, 1.2, -1.7, { seg: 8 });
    r.box(0.5, 0.3, 0.4, 0x263238, -2.1, 0.15, -1.7, { r: 0.04 });
  }
  if (level >= 4) {
    // a storm rod: a copper-wound mast with a glowing ball
    r.cyl(0.07, 2.6, STEEL, 2.0, 1.3, -1.8, { seg: 8 });
    for (let i = 0; i < 6; i++) r.torus(0.13, 0.04, 0xb87333, 2.0, 1.2 + i * 0.2, -1.8, { rx: PI / 2, seg: 10 });
    r.ball(0.24, glowMat(h, 0x80d8ff), 2.0, 2.7, -1.8, { seg: 10, rows: 7 });
  }
  r.done();
  if (level >= 2) {
    const dish = spinner(h, h.root, -2.1, 2.4, -1.7);
    const dk = wear(h, dish, `${key}:dish`);
    dk.cyl(0.55, 0.2, 0xb0bec5, 0, 0.1, 0.12, { axis: 'z', r2: 0.1, seg: 16, rx: -0.4 });
    dk.cyl(0.03, 0.5, INK, 0, 0.15, 0.32, { axis: 'z', seg: 5, rx: -0.4 });
    dk.ball(0.06, volt, 0, 0.22, 0.56, { seg: 6, rows: 4 });
    dk.done();
    h.idleSpin = 1.2;
  }
  const { plane, muzzles } = stormJet(h, level);
  h.plane = plane;
  h.muzzles = muzzles;
  h.flyHeight = 13;
  h.tracer = boltHex;
  return own(h, 0);
}

// ------------------------------------------------------------------ Punkbuster

/**
 * Punkbuster: a pumpkin-headed punk on a little stage, with a purple mohawk, a studded black
 * jacket and a chunky launcher. Lv 1 speaker stacks, Lv 2 spiked bracers and a wallet chain,
 * Lv 3 a glowing launcher and mohawk, Lv 4 an amp wall, green pumpkin flames and a crown of fire.
 */
export function makePunkbuster(level) {
  const h = makeHumanoid({ skin: 0x4e342e, shirt: 0x1a1a1a, pants: 0x4a148c, arms: 0x1a1a1a });
  const key = `punkbuster${level}`;
  const flameHex = level >= 4 ? 0x76ff03 : 0xffab00;
  const lit = glowMat(h, flameHex);
  const neon = glowMat(h, 0xd500f9);
  const purple = level >= 3 ? neon : 0x8e24aa;
  const silver = 0xcfd8dc;
  const leather = 0x151515;
  h.body.position.y = 0.5;
  h.lift = 0.5;
  h.bob = 0.04;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  pumpkin(hd, 0, 0.66, 0, 0.9, lit);
  // a mohawk of purple spikes from the brow to the back
  const n = 4 + level;
  for (let i = 0; i < n; i++) {
    const z = 0.45 - (i * 1.1) / (n - 1);
    const hh = 0.55 + (i % 2) * 0.15 + level * 0.05;
    hd.cyl(0.13, hh, purple, 0, 1.38 + hh / 2, z, { seg: 6, r2: 0.01, rx: -0.25 - i * 0.05, sz: 1.6 });
  }
  if (level >= 4) {
    // a crown of green flames round the stem
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * PI * 2;
      hd.cyl(0.12, 0.45 + (i % 2) * 0.2, lit, Math.sin(a) * 0.5, 1.45, Math.cos(a) * 0.5, { seg: 6, r2: 0.01, rz: -Math.sin(a) * 0.3, rx: Math.cos(a) * 0.3 });
    }
  }
  // a studded leather jacket over a purple tee with a pumpkin print
  t.box(2.16, 2.04, 1.12, leather, 0, 0.0, 0, { r: 0.08 });
  t.box(0.75, 1.75, 0.06, 0x6a1b9a, 0, -0.05, 0.56);
  pumpkin(t, 0, 0.15, 0.56, 0.2, null, { vine: false });
  for (const s of [-1, 1]) {
    t.box(0.42, 1.2, 0.08, 0x262626, s * 0.5, 0.35, 0.58, { rz: s * 0.18 }); // lapels
    for (let i = 0; i < 3; i++) t.cyl(0.07, 0.18, silver, s * (0.62 + i * 0.18), 1.08, 0.1 - i * 0.12, { seg: 6, r2: 0.01 }); // shoulder spikes
    t.box(0.06, 1.4, 0.06, silver, s * 0.4, -0.15, 0.6); // zips
  }
  t.box(2.18, 0.26, 1.16, 0x5d4037, 0, -0.82, 0, { r: 0.04 }); // studded belt
  for (const x of [-0.75, -0.45, 0.45, 0.75]) t.cyl(0.05, 0.05, silver, x, -0.82, 0.59, { axis: 'z', seg: 6 });
  t.box(0.36, 0.22, 0.06, silver, 0, -0.82, 0.6, { r: 0.02 });
  t.cyl(0.1, 0.03, 0x37474f, -0.6, 0.6, 0.6, { axis: 'z', seg: 12 }); // pins
  t.cyl(0.08, 0.03, neon, 0.6, -0.4, 0.6, { axis: 'z', seg: 12 });
  shardPin(t, h, 0.55, 0.7, 0.6);
  if (level >= 2) {
    // Boogieman: a wallet chain looping to the back pocket
    t.tube([[0.6, -0.9, 0.6], [0.85, -1.25, 0.55], [1.05, -1.1, 0.2], [1.05, -0.9, -0.3]], 0.04, silver, { seg: 16, sides: 5 });
  }
  hd.done();
  t.done();
  hands(h, key, 0x212121, leather, (a, s) => {
    if (level < 2) return;
    // spiked bracers
    a.box(1.12, 0.5, 1.12, 0x212121, 0, -1.25, 0, { r: 0.06 });
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * PI * 2;
      a.cyl(0.07, 0.25, silver, Math.sin(ang) * 0.6, -1.25, Math.cos(ang) * 0.6, { seg: 6, r2: 0.01, rz: -Math.sin(ang) * PI / 2, rx: Math.cos(ang) * PI / 2 });
    }
  });
  feet(h, key, 0x1a1a1a, (b) => {
    b.box(1.14, 0.2, 1.24, 0x424242, 0, -1.98, 0.08, { r: 0.04 }); // platform soles
    for (const y of [-1.5, -1.7]) b.box(1.1, 0.07, 0.4, silver, 0, y, 0.4);
  });
  // the stage: a black deck with an orange glow strip and purple footlights
  const r = wear(h, h.root, `${key}:stage`);
  r.box(4.4, 0.5, 3.2, 0x212121, 0, 0.25, -0.2, { r: 0.06 });
  r.box(4.44, 0.08, 0.06, glowMat(h, 0xff6d00), 0, 0.42, 1.41);
  for (let i = 0; i < 8; i++) r.box(0.06, 0.42, 3.22, 0x2a2a2a, -2.0 + i * 0.57, 0.25, -0.2); // planks
  for (const x of [-1.5, 0, 1.5]) {
    r.box(0.5, 0.14, 0.2, 0x111111, x, 0.25, 1.42, { r: 0.03 });
    r.cyl(0.08, 0.04, neon, x, 0.25, 1.53, { axis: 'z', seg: 10 });
  }
  if (level >= 1) {
    // Double Trouble: speaker stacks at the back corners
    const edge = level >= 3 ? neon : glowMat(h, 0xff6d00);
    for (const x of [-1.75, 1.75]) {
      speaker(r, x, 0.5, -1.2, 0.95, 0.95, 0x2a2a2a);
      speaker(r, x, 1.45, -1.2, 0.95, 0.85, 0x2a2a2a);
      for (const y of [1.42, 2.27]) r.box(0.97, 0.05, 0.05, edge, x, y, -0.73); // glow strip on the top edge
    }
  }
  if (level >= 4) {
    // Nucleus: an amp wall with glowing purple cones and a mic stand
    r.box(2.4, 1.9, 0.6, 0x15151c, 0, 1.45, -1.55, { r: 0.05 });
    for (const x of [-0.6, 0.6]) for (const y of [0.95, 1.85]) {
      r.torus(0.32, 0.05, 0x37474f, x, y, -1.23, { seg: 16 });
      r.cyl(0.3, 0.05, neon, x, y, -1.25, { axis: 'z', seg: 16 });
      r.ball(0.1, 0x212121, x, y, -1.21, { seg: 8, rows: 5, sz: 0.5 });
    }
    r.box(2.44, 0.06, 0.06, lit, 0, 2.36, -1.24); // glow strip
    for (let i = 0; i < 6; i++) r.cyl(0.05, 0.05, i < 4 ? lit : 0xff1744, -1.0 + i * 0.25, 2.2, -1.23, { axis: 'z', seg: 8 }); // level lights
    r.cyl(0.35, 0.05, 0x212121, -1.0, 0.53, 0.9, { seg: 14 });
    r.cyl(0.03, 2.4, STEEL, -1.0, 1.7, 0.9, { seg: 6 });
    r.cyl(0.08, 0.3, 0x212121, -1.0, 2.95, 0.9, { seg: 8, rx: 0.5 });
  }
  r.done();
  // the launcher: an orange drum tube with a purple mouth ring and grips
  const len = 1.7 + level * 0.15;
  const U = 0.35;
  const g = held(h, key, (k) => {
    k.cyl(0.36, len * 0.75, 0xff6d00, 0, -len * 0.5, U, { seg: 14 });
    for (let i = 0; i < 3; i++) k.torus(0.37, 0.04, 0x37474f, 0, -len * 0.25 - i * len * 0.22, U, { rx: PI / 2, seg: 16 });
    k.cyl(0.42, 0.18, purple, 0, -len + 0.05, U, { seg: 14 });
    k.cyl(0.3, 0.2, 0x111111, 0, -len - 0.02, U, { seg: 14 });
    k.cyl(0.3, 0.4, 0x37474f, 0, 0.1, U, { seg: 12, r2: 0.22 });
    k.box(0.22, 0.26, 0.5, 0x212121, 0, 0.0, U - 0.4, { rx: -0.3, r: 0.04 }); // grip
    k.box(0.22, 0.26, 0.5, 0x212121, 0, -0.8, U - 0.4, { r: 0.04 }); // front grip
    k.box(0.14, 0.5, 0.2, INK, 0, -0.5, U + 0.42, { r: 0.03 }); // sight
    k.cyl(0.06, 0.03, neon, 0, -0.76, U + 0.42, { seg: 8 });
    pumpkin(k, 0.38, -len * 0.5, U, 0.17, null, { vine: false }); // pumpkin decal
    if (level >= 3) k.cyl(0.24, 0.12, lit, 0, -len - 0.1, U, { seg: 12 });
  }, -1.9, 1.2);
  h.muzzles = [];
  muzzle(h, g, -len - 0.2, U);
  h.rightArm.rotation.set(-PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-PI / 2 + 0.1, 0, -0.5);
  h.pose = { right: -PI / 2, left: -PI / 2 + 0.1, leftRecoil: 0.25 };
  h.tracer = level >= 3 ? 0xd500f9 : 0xff6d00;
  h.projectile = { color: level >= 4 ? 0x76ff03 : 0xff6d00, size: 0.55 + level * 0.04, arc: 4, ...(level >= 3 ? { glowing: true } : {}) };
  return own(h, U);
}

// ------------------------------------------------------------------ Cyberblade

/**
 * Cyberblade: a cyber swordsman in dark armour with neon seams and a glowing blade. Lv 1 a cape,
 * Lv 2 a longer blade, Lv 3 shoulder armour and purple neon, Lv 4 Prototype Archaic: red neon,
 * a big jagged blade, a horned crest and a glowing core in the chest.
 */
export function makeCyberblade(level) {
  const archaic = level >= 4;
  const plate = archaic ? 0x1a1a2e : 0x263238;
  const h = makeHumanoid({ skin: 0xb0bec5, shirt: plate, pants: 0x1a1a1a, arms: 0x37474f, face: 'soldier' });
  const key = `cyberblade${level}`;
  const neonHex = archaic ? 0xff1744 : level >= 3 ? 0xe040fb : 0x00e5ff;
  const neon = glowMat(h, neonHex);
  const dark = 0x15171a;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  visorHelmet(hd, 0x212121, neon, archaic ? { crest: 0x37474f } : {});
  hd.box(0.5, 0.08, 0.1, neon, 0, 0.3, 0.78, { r: 0.02 }); // mouth vent glow
  for (let i = 0; i < 3; i++) hd.box(0.4, 0.04, 0.06, dark, 0, 0.42 - i * 0.08 + 0.12, 0.8);
  if (archaic) {
    for (const s of [-1, 1]) {
      hd.tube([[s * 0.55, 1.15, 0.1], [s * 0.85, 1.55, -0.05], [s * 0.8, 2.0, -0.3]], 0.07, 0x37474f, { seg: 12, sides: 6 });
      hd.ball(0.06, neon, s * 0.8, 2.0, -0.3, { seg: 6, rows: 4 });
    }
  }
  shardPin(hd, h, 0.5, 1.15, 0.56);
  // armour: a sloped chest plate, an ab plate, neon seams and a spine with lights
  t.slab(1.9, 1.15, 0.24, plate, 0, 0.4, 0.58, { tw: 1.08, td: 0.8, r: 0.04 });
  t.box(1.4, 0.75, 0.16, tone(plate, 0.85), 0, -0.45, 0.55, { r: 0.05 });
  for (const y of [-0.3, -0.6]) t.box(1.42, 0.04, 0.18, dark, 0, y, 0.56);
  t.box(2.06, 0.06, 1.06, neon, 0, -0.05, 0);
  t.box(2.06, 0.06, 1.06, neon, 0, 0.62, 0);
  t.box(0.5, 1.6, 0.18, tone(plate, 0.8), 0, 0.1, -0.56, { r: 0.05 }); // spine housing
  for (let i = 0; i < 4; i++) t.box(0.18, 0.1, 0.06, neon, 0, 0.7 - i * 0.4, -0.66);
  belt(t, dark, STEEL, -0.86);
  if (archaic) {
    t.cyl(0.26, 0.12, 0x37474f, 0, 0.4, 0.73, { axis: 'z', seg: 16 });
    t.cyl(0.18, 0.1, neon, 0, 0.4, 0.78, { axis: 'z', seg: 12 }); // glowing core
  } else {
    t.box(0.3, 0.3, 0.06, neon, 0, 0.4, 0.72, { rz: PI / 4 });
  }
  if (level >= 1) {
    // a cape with a neon hem hanging from the shoulders
    t.slab(2.0, 3.0, 0.08, 0x1a1a1a, 0, -0.6, -0.72, { bw: 1.2, rx: 0.08 });
    t.box(2.36, 0.07, 0.1, neon, 0, -2.08, -0.84, { rx: 0.08 });
    for (const s of [-1, 1]) t.cyl(0.12, 0.1, STEEL, s * 0.85, 0.85, -0.62, { axis: 'z', seg: 10 });
  }
  if (level >= 3) {
    // Advanced Vision: layered shoulder armour with neon edges
    for (const s of [-1, 1]) {
      t.slab(0.95, 0.4, 1.2, 0x455a64, s * 1.45, 1.05, 0, { tw: 0.75, r: 0.04 });
      t.box(0.98, 0.05, 1.22, neon, s * 1.45, 0.86, 0);
      t.slab(0.8, 0.25, 1.0, 0x37474f, s * 1.55, 0.75, 0, { tw: 0.8 });
    }
  }
  hd.done();
  t.done();
  hands(h, key, dark, plate, (a) => {
    a.box(1.08, 0.7, 1.08, 0x37474f, 0, -1.2, 0, { r: 0.06 }); // forearm guard
    a.box(1.1, 0.05, 1.1, neon, 0, -1.0, 0); // glow kept above y -1.6 (rig.js)
  });
  feet(h, key, dark, (b) => {
    b.box(0.9, 0.5, 0.2, 0x37474f, 0, -0.95, 0.52, { r: 0.06 }); // knee plates
    b.box(0.5, 0.05, 0.05, neon, 0, -1.25, 0.6);
  });
  // the sword: wrapped hilt, guard, an emitter and a glowing blade (jagged and red at Lv 4)
  const len = archaic ? 3.6 : level >= 2 ? 3.0 : 2.4;
  const g = held(h, key, (k) => {
    k.cyl(0.12, 0.6, dark, 0, -0.25, 0, { seg: 8 });
    for (let i = 0; i < 4; i++) k.torus(0.125, 0.025, 0x455a64, 0, -0.05 - i * 0.13, 0, { rx: PI / 2, seg: 8 });
    k.ball(0.13, STEEL, 0, 0.1, 0, { seg: 8, rows: 6 }); // pommel
    k.box(0.72, 0.14, 0.32, 0x9e9e9e, 0, -0.62, 0, { r: 0.04 }); // guard
    for (const s of [-1, 1]) k.box(0.08, 0.08, 0.34, neon, s * 0.33, -0.62, 0);
    k.cyl(0.13, 0.25, 0x37474f, 0, -0.8, 0, { seg: 10, r2: 0.16 }); // emitter
    const w = archaic ? 0.5 : 0.34;
    k.slab(0.1, len, w, neon, 0, -0.9 - len / 2, 0, { bd: 0.25, bz: w * 0.3 });
    k.box(0.04, len * 0.92, 0.04, 0xe0f7fa, 0, -0.9 - len * 0.48, -w * 0.3); // bright core line
    if (archaic) for (let i = 0; i < 4; i++) k.cyl(0.07, 0.32, neon, 0, -1.4 - i * 0.6, w * 0.5, { seg: 4, r2: 0.01, rx: -PI / 2 - 0.5 });
  });
  // the blade sticks out of the fist forward, not down the arm: held low (the rest pose drops the
  // arm) it points ahead instead of into the ground, and in guard it points up and forward
  g.rotation.x = -1.9;
  h.muzzles = [];
  muzzle(h, g, -0.9 - len / 2, 0);
  h.rightArm.rotation.set(-1.2, 0, 0.1);
  h.leftArm.rotation.set(-0.4, 0, -0.3);
  h.pose = { right: -1.2, left: -0.4, leftRecoil: 0 };
  h.swing = 1.3;
  h.tracer = neonHex;
  return own(h, 0);
}

// ------------------------------------------------------------------ Wizard (hero)

const WIZ_ROBE = [0xb39ddb, 0xb39ddb, 0x5c6bc0, 0x3949ab, 0x1a237e];

/**
 * Wizard: a short round wizard in a long robe and a tall bent-tip hat, with round glasses and a
 * small wand. The robe goes lavender -> royal blue -> indigo -> midnight, with gold trim from
 * Lv 1. Lv 1 stars on the hat, Lv 2 an orb staff, Lv 3 a floating spell book and a rune ring at
 * its feet (spins), Lv 4 Archmage: a big glowing staff, a cream cape and stars on the robe.
 */
export function makeWizard(level) {
  const skin = 0xfff3b0;
  const robe = WIZ_ROBE[level];
  const trim = level >= 1 ? 0xffb300 : 0x7e57c2;
  const h = makeHumanoid({ skin, shirt: robe, pants: robe, arms: robe, hands: skin, face: 'soldier' });
  const key = `wizard${level}`;
  h.body.scale.set(0.95, 0.82, 0.95); // short and round
  const orbHex = level >= 4 ? 0xe040fb : 0xb388ff;
  const orb = glowMat(h, orbHex);
  const star = glowMat(h, 0xffeb3b);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const b = wear(h, h.body, `${key}:robe`);
  // round glasses and white bushy brows
  for (const s of [-1, 1]) {
    hd.torus(0.19, 0.035, 0x8d6e63, s * 0.27, 0.7, 0.64, { seg: 16 });
    hd.cyl(0.17, 0.02, glassMat(h, 0xe3f2fd, 0.4), s * 0.27, 0.7, 0.64, { axis: 'z', seg: 14 });
    hd.box(0.34, 0.08, 0.1, SNOW, s * 0.27, 0.95, 0.6, { rz: s * 0.15, r: 0.03 });
  }
  hd.box(0.16, 0.04, 0.04, 0x8d6e63, 0, 0.72, 0.67);
  // the hat: a wide brim, a trim band, a tall cone whose tip bends over
  hd.cyl(1.05, 0.08, robe, 0, 1.2, 0, { seg: 26 });
  hd.torus(1.05, 0.04, tone(robe, 0.8), 0, 1.2, 0, { rx: PI / 2, seg: 26 });
  hd.cyl(0.74, 0.22, trim, 0, 1.36, 0, { seg: 22 });
  const tip = bentCone(hd, 1.45, 0.68, 7, 2.3, 1.6, [robe], { dx: 1 });
  hd.ball(0.1, level >= 1 ? star : tone(robe, 0.8), tip[0], tip[1], tip[2], { seg: 8, rows: 5 });
  if (level >= 1) {
    for (const [x, y, z] of [[-0.3, 1.75, 0.5], [0.22, 2.25, 0.36], [-0.05, 2.7, 0.22]]) hd.cyl(0.12, 0.05, star, x, y, z, { axis: 'z', seg: 5, rx: -0.3 });
    hd.torus(0.14, 0.05, star, 0.35, 1.7, 0.56, { arc: PI * 1.3, seg: 10, rz: 0.8, rx: -0.3 }); // moon
  }
  // the robe: a long skirt flaring to the ground, a round belly, a sash and a star clasp
  b.cyl(1.3, 2.1, robe, 0, 1.05, 0, { r2: 1.08, seg: 22, sz: 0.68 });
  b.cyl(1.32, 0.25, trim, 0, 0.12, 0, { seg: 22, sz: 0.7 }); // hem
  t.ball(1.12, robe, 0, -0.25, 0.05, { sy: 0.85, sz: 0.68, seg: 18, rows: 10 });
  t.cyl(1.12, 0.26, trim, 0, -0.75, 0.05, { seg: 20, sz: 0.62 }); // sash
  t.cyl(0.16, 0.06, star, 0, -0.75, 0.75, { axis: 'z', seg: 5 });
  for (const s of [-1, 1]) t.box(0.3, 0.9, 0.08, trim, s * 0.32, 0.45, 0.56, { rz: s * 0.25 }); // collar trim
  if (level >= 4) {
    // Archmage: a cream cape with a gold clasp line, and stars on the robe
    t.slab(2.1, 3.4, 0.1, 0xfff8e1, 0, -0.8, -0.72, { bw: 1.35, rx: 0.08 });
    t.box(2.3, 0.22, 0.4, GOLD, 0, 0.9, -0.55, { r: 0.04 });
    for (const [x, y] of [[-0.6, 0.6], [0.5, 1.3], [-0.2, 1.9], [0.7, 0.3]]) b.cyl(0.1, 0.05, star, x, y, 0.82, { axis: 'z', seg: 5 });
  }
  shardPin(t, h, 0.55, 0.15, 0.62);
  hd.done();
  t.done();
  b.done();
  hands(h, key, null, robe, (a) => {
    a.cyl(0.62, 0.55, trim, 0, -1.35, 0, { r2: 0.56, seg: 16 }); // wide sleeve cuff
  });
  h.leftArm.rotation.set(-0.35, 0, -0.15);
  if (level < 2) {
    // a small wooden wand pointed at the target
    const g = held(h, key, (k) => {
      k.cyl(0.07, 1.1, WOOD, 0, -0.55, 0, { seg: 8, r2: 0.09 });
      k.torus(0.09, 0.025, GOLD, 0, -0.15, 0, { rx: PI / 2, seg: 8 });
      k.ball(0.11, level >= 1 ? star : 0xfff8e1, 0, -1.15, 0, { seg: 8, rows: 6 });
    });
    h.muzzles = [];
    muzzle(h, g, -1.25, 0);
    h.rightArm.rotation.set(-1.45, 0, 0.1);
    h.pose = { right: -1.45, left: -0.35, leftRecoil: 0 };
  } else {
    // a staff held upright with a glowing orb in a cradle on top
    const big = level >= 4;
    const len = big ? 4.8 : 3.8;
    const top = len - 1.2;
    const g = fist(h.rightArm);
    const staff = new THREE.Group();
    staff.rotation.x = 0.6; // cancels the arm's tilt so the staff stands upright
    g.add(staff);
    const k = wear(h, staff, `${key}:staff`);
    const wood = big ? 0x4a148c : WOOD;
    k.cyl(big ? 0.14 : 0.11, len, wood, 0, len / 2 - 1.2, 0, { seg: 8, r2: big ? 0.11 : 0.09 });
    for (const y of [0.4, top - 0.4]) k.torus(0.13, 0.03, GOLD, 0, y, 0, { rx: PI / 2, seg: 10 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2;
      k.tube([[0, top - 0.25, 0], [Math.cos(a) * 0.32, top + 0.15, Math.sin(a) * 0.32], [Math.cos(a) * 0.2, top + 0.75, Math.sin(a) * 0.2]], 0.04, big ? GOLD : WOOD, { seg: 10, sides: 5 });
    }
    const R = big ? 0.42 : 0.3;
    k.ball(R, orb, 0, top + 0.45, 0, { seg: 14, rows: 10 });
    if (big) {
      for (let i = 0; i < 3; i++) k.cyl(0.18, 0.08, orb, 0, top - 0.6 - i * 0.35, 0, { seg: 10 });
      k.torus(0.62, 0.025, glowMat(h, 0xea80fc), 0, top + 0.45, 0, { rx: 0.9, seg: 24 });
      k.torus(0.62, 0.025, glowMat(h, 0xea80fc), 0, top + 0.45, 0, { ry: 0.9, seg: 24 });
    }
    k.done();
    h.muzzles = [];
    muzzle(h, staff, top + 0.45, 0);
    h.rightArm.rotation.set(-0.6, 0, 0.15);
    h.pose = { right: -0.6, left: -0.35, leftRecoil: 0 };
  }
  if (level >= 3) {
    // a floating spell book beside him, open, with a glowing rune
    const book = new THREE.Group();
    book.position.set(2.0, 3.9, 0.6);
    book.rotation.set(0.5, -0.5, 0);
    h.body.add(book);
    const bk = wear(h, book, `${key}:book`);
    for (const s of [-1, 1]) {
      bk.box(0.62, 0.08, 0.95, 0x6a1b9a, s * 0.3, 0, 0, { rz: -s * 0.25, r: 0.02 });
      bk.box(0.56, 0.1, 0.88, 0xfff8e1, s * 0.28, 0.06, 0, { rz: -s * 0.25 });
      for (let i = 0; i < 3; i++) bk.box(0.36, 0.02, 0.04, 0x8d6e63, s * 0.28, 0.12, -0.25 + i * 0.2, { rz: -s * 0.25 });
    }
    bk.cyl(0.05, 0.98, GOLD, 0, -0.03, 0, { axis: 'z', seg: 6 }); // spine
    bk.cyl(0.13, 0.03, orb, 0.3, 0.16, 0, { seg: 6, rz: -0.25 });
    bk.done();
    // a rune ring at his feet: it spins slowly, and fast when he casts
    const runes = spinner(h, h.root, 0, 0.08, 0);
    const rk = wear(h, runes, `${key}:runes`);
    const ring = glowMat(h, orbHex, 0.7);
    rk.torus(2.1, 0.05, ring, 0, 0, 0, { rx: PI / 2, seg: 40 });
    rk.torus(1.75, 0.03, ring, 0, 0, 0, { rx: PI / 2, seg: 36 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2 + 0.4;
      rk.cyl(0.16, 0.05, ring, Math.cos(a) * 1.92, 0, Math.sin(a) * 1.92, { seg: i % 2 ? 3 : 4, ry: a });
    }
    rk.done();
    h.idleSpin = 0.8;
  }
  h.tracer = orbHex;
  return own(h, 0);
}

// ------------------------------------------------------------------ Chef (hero)

/**
 * Chef (melee): a chunky chef with a tall toque, sunglasses and a red neckerchief. His tool
 * changes every level: a giant spork, a frying pan, a cleaver, a rolling pin, then a meat
 * tenderizer. Lv 1 a blue striped apron and a towel, Lv 2 a charcoal head-chef jacket, Lv 3 gold
 * epaulettes, red wristbands and a knife rack on the back, Lv 4 a black-and-gold master chef with
 * a red apron and a gold toque.
 */
export function makeChef(level) {
  const skin = 0xd7a17b;
  const jacket = level >= 4 ? 0x1a1a1a : level >= 2 ? 0x37474f : SNOW;
  const toque = level >= 4 ? 0xffd54f : SNOW;
  const h = makeHumanoid({ skin, shirt: jacket, pants: 0x424242, arms: jacket, hands: skin, face: 'agent' });
  const key = `chef${level}`;
  h.body.scale.setScalar(1.05);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const btn = level >= 2 ? GOLD : 0x212121;
  // the toque: a pleated band and a puffy top
  hd.cyl(0.7, 0.5, toque, 0, 1.2, 0, { seg: 22, r2: 0.74 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    hd.box(0.05, 0.48, 0.04, tone(toque, 0.88), Math.sin(a) * 0.73, 1.22, Math.cos(a) * 0.73, { ry: a });
  }
  hd.ball(0.92, toque, 0, 1.85, 0, { sy: 0.62, seg: 18, rows: 10 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * PI * 2;
    hd.ball(0.42, toque, Math.sin(a) * 0.5, 2.05, Math.cos(a) * 0.5, { seg: 12, rows: 8 });
  }
  hd.ball(0.45, toque, 0, 2.25, 0, { seg: 12, rows: 8 });
  if (level >= 4) {
    hd.cyl(0.24, 0.06, glowMat(h, 0xffc400), 0, 1.25, 0.74, { axis: 'z', seg: 4 }); // gold badge
  }
  // a double-breasted jacket: a raised front panel, two rows of buttons, a red neckerchief
  t.box(2.3, 2.0, 1.25, jacket, 0, 0.0, 0, { r: 0.12 });
  t.slab(1.1, 1.7, 0.08, tone(jacket, 0.93), 0.25, -0.05, 0.64, { r: 0.02 });
  for (const y of [0.45, 0, -0.45]) for (const x of [-0.42, 0.55]) t.cyl(0.08, 0.05, btn, x, y, 0.69, { axis: 'z', seg: 10 });
  t.cyl(0.62, 0.3, RED, 0, 0.92, 0, { seg: 18, sx: 1.15, sz: 0.95 });
  t.cyl(0.3, 0.06, RED, 0, 0.6, 0.66, { axis: 'z', seg: 3, rz: PI });
  t.ball(0.13, tone(RED, 0.85), 0, 0.78, 0.66, { seg: 8, rows: 6 });
  shardPin(t, h, -0.75, 0.55, 0.64);
  if (level >= 1) {
    // Frying Pan: a blue striped apron (red at Lv 4) and a towel over the shoulder
    const ap = level >= 4 ? 0xb71c1c : 0x1565c0;
    t.box(1.7, 1.55, 0.06, ap, 0, -0.35, 0.68, { r: 0.02 });
    for (const x of [-0.45, 0, 0.45]) t.box(0.1, 1.55, 0.07, SNOW, x, -0.35, 0.68);
    t.box(2.4, 0.14, 1.32, ap, 0, -0.62, 0); // apron strings
    pouch(t, 0, -0.75, 0.71, 0.6, 0.35, tone(ap, 0.85), 0.06);
    t.box(0.5, 1.4, 0.1, 0x90caf9, 0.95, 0.3, 0.68, { rz: 0.2, r: 0.03 }); // towel
    for (const y of [0.85, -0.25]) t.box(0.52, 0.06, 0.11, SNOW, 0.95 + (y - 0.3) * -0.2, y, 0.68, { rz: 0.2 });
  }
  if (level >= 3) {
    // Rolling Pin: gold epaulettes and a knife rack on the back
    shoulderPads(t, 0xffc107, 0.55);
    t.box(1.6, 0.9, 0.2, 0x5d4037, 0, 0.2, -0.75, { r: 0.04 });
    for (const x of [-0.5, 0, 0.5]) {
      t.slab(0.22, 1.2, 0.04, 0xcfd8dc, x, 1.2, -0.8, { tw: 0.2 });
      t.box(0.16, 0.4, 0.16, 0x212121, x, 0.25, -0.82, { r: 0.03 });
      t.cyl(0.03, 0.04, GOLD, x, 0.25, -0.91, { axis: 'z', seg: 6 });
    }
  }
  hd.done();
  t.done();
  // big arms with rolled sleeves (red wristbands from Lv 3)
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    a.box(1.3, 1.2, 1.3, jacket, 0, -0.55, 0, { r: 0.1 });
    a.box(1.32, 0.22, 1.32, tone(jacket, 0.88), 0, -1.08, 0, { r: 0.06 }); // rolled cuff
    a.box(1.12, 0.6, 1.12, skin, 0, -1.45, 0, { r: 0.08 }); // forearm
    if (level >= 3) a.box(1.16, 0.2, 1.16, RED, 0, -1.3, 0, { r: 0.04 });
    a.done();
  }
  feet(h, key, 0x212121, (b) => b.box(1.08, 0.04, 0.3, SNOW, 0, -1.92, 0.5)); // kitchen clogs
  // his tool for this level
  const steel = 0xcfd8dc;
  const tips = [-3.0, -2.4, -2.4, -2.6, -2.7];
  const g = held(h, key, (k) => {
    if (level === 0) {
      // a giant spork
      k.cyl(0.11, 2.2, steel, 0, -1.0, 0, { seg: 8 });
      k.ball(0.5, steel, 0, -2.5, 0, { sz: 0.25, sy: 1.1, seg: 14, rows: 8 });
      for (const x of [-0.3, 0, 0.3]) k.cyl(0.07, 0.5, steel, x, -3.15, 0, { seg: 6, r2: 0.04, rx: PI });
    } else if (level === 1) {
      // a black frying pan
      k.cyl(0.13, 1.4, 0x212121, 0, -0.6, 0, { seg: 8 });
      k.cyl(0.95, 0.22, 0x212121, 0, -2.2, 0, { axis: 'z', seg: 22 });
      k.cyl(0.8, 0.06, 0x424242, 0, -2.2, 0.1, { axis: 'z', seg: 22 });
      k.ball(0.18, 0xffca28, 0.15, -2.15, 0.15, { sz: 0.3, seg: 10, rows: 6 }); // an egg yolk
      k.ball(0.38, SNOW, 0.1, -2.2, 0.12, { sz: 0.12, seg: 12, rows: 6 });
    } else if (level === 2) {
      // a cleaver
      k.cyl(0.14, 0.9, 0x5d4037, 0, -0.35, 0, { seg: 8 });
      for (const y of [-0.15, -0.5]) k.cyl(0.05, 0.3, steel, 0, y, 0, { axis: 'x', seg: 6 });
      k.box(0.1, 1.9, 1.3, steel, 0, -1.7, 0.4, { r: 0.03 });
      k.box(0.11, 1.9, 0.12, SNOW, 0, -1.7, 1.03);
      k.cyl(0.14, 0.12, 0x424242, 0, -1.0, 0.62, { axis: 'x', seg: 12 }); // hanging hole
    } else if (level === 3) {
      // a rolling pin
      k.cyl(0.13, 0.7, 0x8d6e63, 0, -0.3, 0, { seg: 10 });
      k.cyl(0.42, 1.9, 0xd7b98e, 0, -1.65, 0, { seg: 16 });
      for (const y of [-0.75, -2.55]) k.cyl(0.44, 0.06, 0xa1887f, 0, y, 0, { seg: 16 });
      k.cyl(0.13, 0.5, 0x8d6e63, 0, -2.85, 0, { seg: 10 });
      k.ball(0.18, 0x8d6e63, 0, -3.1, 0, { seg: 10, rows: 6 });
    } else {
      // a studded meat tenderizer with a glowing band
      k.cyl(0.15, 2.4, 0x6d4c41, 0, -1.1, 0, { seg: 8 });
      k.box(1.9, 1.1, 1.1, steel, 0, -2.7, 0, { r: 0.08 });
      for (const s of [-1, 1]) for (const y of [-0.3, 0, 0.3]) for (const z of [-0.3, 0, 0.3]) k.cyl(0.12, 0.18, 0x90a4ae, s * 1.02, -2.7 + y, z, { axis: 'x', seg: 4, r2: 0.01, rz: s > 0 ? 0 : PI });
      k.box(0.35, 1.14, 1.14, glowMat(h, 0xff6d00), 0, -2.7, 0);
    }
  });
  h.muzzles = [];
  muzzle(h, g, tips[level], 0);
  meleePose(h, -2.5, -0.8, 2.0);
  h.tracer = level >= 4 ? 0xff6d00 : 0xffffff;
  return own(h, 0);
}

// ------------------------------------------------------------------ Yasuke (hero)

/**
 * Yasuke (fast melee, half-dragon): a small fighter with pink horns and skin, a black top with a
 * white flame, pink leggings and tall boots. Lv 0 a wooden practice sword, Lv 1 a katana and a red
 * headband, Lv 2 dark-rose leggings, a second sword on the back and a scarf, Lv 3 dragon scales
 * and small wings, Lv 4 Dragon Blood: crimson clothes, big wings, a tail, glowing eyes and a
 * glowing orange katana.
 */
export function makeYasuke(level) {
  const skin = 0xf8bbd0;
  const blood = level >= 4;
  const top = blood ? 0x7f0000 : 0x212121;
  const legs = level >= 2 ? 0xad1457 : 0xf48fb1;
  const h = makeHumanoid({ skin, shirt: top, pants: legs, arms: skin, face: 'soldier' });
  const key = `yasuke${level}`;
  h.body.scale.setScalar(0.85);
  const black = blood ? 0x3e0000 : 0x1a1a1a;
  const horn = 0xff4081;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // dark hair with spiky bangs and side locks
  hair(hd, 0x1a1a1a, { h: 0.46 });
  for (const x of [-0.4, -0.13, 0.14, 0.4]) hd.cyl(0.14, 0.42, 0x1a1a1a, x, 1.05, 0.6, { seg: 4, r2: 0.01, rx: PI - 0.5, rz: x * 0.4 });
  for (const s of [-1, 1]) hd.box(0.16, 0.7, 0.4, 0x1a1a1a, s * 0.64, 0.75, 0.15, { r: 0.05 });
  hd.box(1.2, 0.9, 0.2, 0x1a1a1a, 0, 0.75, -0.6, { r: 0.08 }); // back hair
  // curved pink horns
  for (const s of [-1, 1]) {
    const pts = [[s * 0.4, 1.25, 0.05], [s * 0.6, 1.7, -0.05], [s * 0.66, 2.0, -0.3], [s * 0.6, 2.1, -0.55]];
    for (let i = 0; i < 3; i++) limb(hd, pts[i], pts[i + 1], 0.16 - i * 0.045, 0.12 - i * 0.045, horn, 8);
  }
  if (level >= 1) {
    // Katana: a red headband with long tails
    hd.cyl(0.665, 0.16, 0xd50000, 0, 1.0, 0, { seg: 22, open: true });
    hd.ball(0.12, 0xb71c1c, 0.2, 1.0, -0.66, { seg: 8, rows: 6 });
    for (const s of [-1, 1]) hd.tube([[0.2, 1.0, -0.7], [0.2 + s * 0.15, 0.7, -0.9], [0.25 + s * 0.3, 0.35, -1.0]], 0.05, 0xd50000, { seg: 10, sides: 4 });
  }
  if (blood) for (const x of [-0.27, 0.27]) hd.box(0.24, 0.1, 0.04, glowMat(h, 0xff6d00), x, 0.78, 0.63); // glowing eyes
  // a black top with a white flame on the chest and a magenta sash belt
  const flame = [[0, -0.35], [0.3, -0.2], [0.32, 0.12], [0.18, 0.0], [0.2, 0.32], [0.05, 0.15], [0.0, 0.45], [-0.12, 0.12], [-0.25, 0.25], [-0.3, -0.1]];
  t.prism(flame, 0.05, SNOW, 0, 0.15, 0.52, { ry: PI / 2 });
  t.cyl(0.62, 0.26, 0x880e4f, 0, -0.85, 0, { seg: 18, sx: 1.7, sz: 0.92 });
  t.box(0.3, 0.6, 0.06, 0x880e4f, 0.4, -1.2, 0.56, { rz: 0.15 }); // sash end
  shardPin(t, h, -0.6, 0.55, 0.52);
  if (level >= 2) {
    // Twin Blades: a second katana sheathed across the back, and a red scarf
    t.cyl(0.13, 2.8, 0x4a148c, 0, 0.2, -0.7, { seg: 8, rz: 0.7 });
    t.cyl(0.1, 0.7, black, -1.13, 1.54, -0.7, { seg: 8, rz: 0.7 });
    t.torus(0.18, 0.04, GOLD, -0.86, 1.22, -0.7, { seg: 10, rx: PI / 2, rz: 0.7 });
    scarf(t, 0xc62828);
  }
  if (level >= 3) {
    // Dragon Scales and wings: small at Lv 3, big at Lv 4
    const big = blood;
    const W = big ? 2.6 : 1.4;
    const H = big ? 2.0 : 1.2;
    const bone = 0x4a0e2b;
    const web = 0x880e4f;
    for (const s of [-1, 1]) {
      // each wing in its own group, swept back and tipped up a little
      const wg = new THREE.Group();
      wg.position.set(s * 0.3, 0.6, -0.62);
      wg.rotation.set(0, s * 0.5, s * 0.25);
      h.torso.add(wg);
      const w = wear(h, wg, `${key}:wing${s}`);
      const edge = [[0, 0.1], [s * W, H * 0.5], [s * W * 0.82, -H * 0.15], [s * W * 0.58, -H * 0.3], [s * W * 0.36, -H * 0.2], [s * W * 0.16, -H * 0.42], [0, -0.2]];
      w.prism(edge, 0.05, web, 0, 0, 0, { ry: PI / 2 });
      limb(w, [0, 0.1, 0], [s * W, H * 0.5, 0], 0.09, 0.05, bone); // top bone
      for (const i of [2, 3, 5]) limb(w, [s * W * 0.3, H * 0.2, 0], [edge[i][0], edge[i][1], 0], 0.05, 0.03, bone); // finger bones
      w.cyl(0.08, 0.3, horn, s * W, H * 0.5 + 0.18, 0, { seg: 5, r2: 0.01 }); // claw
      w.done();
    }
  }
  if (blood) {
    // a dragon tail with a spade tip
    const tail = [[0, -0.85, -0.45], [0, -1.25, -1.1], [0, -1.35, -1.8], [0, -1.1, -2.45], [0, -0.6, -2.75]];
    for (let i = 0; i < 4; i++) limb(t, tail[i], tail[i + 1], 0.24 - i * 0.04, 0.2 - i * 0.04, 0xf48fb1, 10);
    for (let i = 1; i < 4; i++) t.cyl(0.1, 0.25, horn, tail[i][0], tail[i][1] + 0.2 - i * 0.02, tail[i][2], { seg: 4, r2: 0.01 }); // spines
    t.cyl(0.3, 0.08, horn, 0, -0.45, -2.85, { seg: 4, rx: -0.5, sz: 1.4 }); // spade tip
  }
  hd.done();
  t.done();
  // short black sleeves and gloves; dragon scales on the arms from Lv 3
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    a.box(1.06, 0.6, 1.06, top, 0, -0.3, 0, { r: 0.06 });
    a.box(1.08, 0.12, 1.08, 0x880e4f, 0, -0.62, 0);
    a.box(1.06, 0.5, 1.06, black, 0, -1.78, 0, { r: 0.06 });
    a.box(1.1, 0.12, 1.1, tone(black, 1.6), 0, -1.5, 0);
    if (level >= 3) for (const [y, z] of [[-0.85, 0.25], [-1.05, -0.15], [-1.25, 0.25], [-0.95, 0.5]]) a.cyl(0.14, 0.12, 0xad1457, s * 0.53, y, z, { axis: 'x', seg: 6, rx: PI / 4 });
    a.done();
  }
  feet(h, key, 0x2b1d16, (b) => {
    b.box(1.08, 0.9, 1.1, 0x2b1d16, 0, -1.35, 0.02, { r: 0.06 }); // tall boots
    b.box(1.1, 0.1, 1.12, 0x880e4f, 0, -0.92, 0.02);
  });
  // the sword: a wooden practice sword, then a katana (glowing orange at Lv 4)
  const g = held(h, key, (k) => {
    if (level === 0) {
      k.cyl(0.12, 0.6, 0x6d4c41, 0, -0.2, 0, { seg: 8 });
      k.cyl(0.3, 0.08, 0x5d4037, 0, -0.55, 0, { seg: 12 });
      k.box(0.16, 1.8, 0.3, 0xc8a165, 0, -1.5, 0, { r: 0.06 });
      return;
    }
    const blade = blood ? glowMat(h, 0xff6d00) : 0xeceff1;
    k.cyl(0.11, 0.8, black, 0, -0.25, 0, { seg: 8 });
    for (let i = 0; i < 5; i++) k.box(0.18, 0.06, 0.24, 0xd50000, 0, 0.05 - i * 0.14, 0, { ry: i % 2 ? 0.6 : -0.6 }); // wrap
    k.cyl(0.3, 0.08, GOLD, 0, -0.68, 0, { seg: 10 }); // tsuba
    k.cyl(0.08, 0.15, GOLD, 0, -0.78, 0, { seg: 8 });
    // a curved blade: three slabs bending forward, a tip
    let y = -0.85;
    let z = 0;
    for (let i = 0; i < 3; i++) {
      const a = 0.06 + i * 0.07;
      const L = 0.82;
      k.box(0.07, L, 0.26, blade, 0, y - Math.cos(a) * L / 2, z + Math.sin(a) * L / 2, { rx: -a });
      if (!blood) k.box(0.075, L, 0.05, 0x9e9e9e, 0, y - Math.cos(a) * L / 2, z + Math.sin(a) * L / 2 - 0.1, { rx: -a });
      y -= Math.cos(a) * L;
      z += Math.sin(a) * L;
    }
    k.cyl(0.13, 0.35, blade, 0, y - 0.15, z + 0.06, { seg: 4, r2: 0.01, rx: PI - 0.3, sx: 0.3 });
  });
  h.muzzles = [];
  muzzle(h, g, level === 0 ? -2.4 : -3.2, 0);
  meleePose(h, -2.4, -0.9, 2.2);
  h.tracer = blood ? 0xff6d00 : 0xffffff;
  return own(h, 0);
}

export const MODELS = {
  giftElf: makeGiftElf,
  stormwing: makeStormwing,
  punkbuster: makePunkbuster,
  gladiatorCyberblade: makeCyberblade,
  scoutWizard: makeWizard,
  enforcerChef: makeChef,
  kniferYasuke: makeYasuke,
};
