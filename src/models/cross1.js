// Tower models: crosspath forms, batch 1 (dressed with the vehicle kit in ../vehicles.js).
// In here: Slinger (scoutSlinger), Crossbower (archerCrossbower), Gunslinger
// (shotgunnerGunslinger), Freezer (frostFreezerX), Demolitionist (grenadierDemolitionist),
// Sniper (sniperX).
// CROSS maps a crosspath root tower key to a builder (a, b) => model, where a is the Top path tier
// and b the Bottom path tier; ../models.js uses it before the older CROSS_MODELS in newmodels/e.js.
// Every Top tier and every Bottom tier adds its own pieces, so each combo looks different and
// higher tiers look stronger. The shared gear and the spaces it works in are in people1.js.
// Helpers here: kidCap (a cap worn backwards), sneakers, slingshot, crossbow, scattergun
// (a double / quad barrel shotgun), nadeSash (a strap of grenades), shells40 (40 mm shells on a
// strap). Moving parts: the Cysian Slinger's aura ring and Absolute Zero's frost ring turn
// (spinner + h.idleSpin).

import { glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import {
  GOLD, GUNMETAL, INK, LEATHER, STEEL, UP, WOOD, aimLong, band, belt, boots, collar, cowboyHat, dome, fist,
  goggles, hair, headset, helmet, kneePad, muzzle, own, pockets, pouch, radio, sash, shades, vest, wear,
} from './people1.js';
import { beret, boltRifle, grenade, nvg, shoulderPads } from './people2.js';
import { balaclava, bandolier, beanie } from './people3.js';
import { visorHelmet } from './people4.js';
import { feet, hands, hood } from './people5.js';
import { coolant, cryoGun, icicle, launcher, neckScarf, shard } from './people6.js';
import { tubeLauncher, visor } from './people7.js';
import { shellBelt, shellStrap } from './people8.js';
import { cape } from './people18.js';
import { spinner } from './machines5.js';

const PI = Math.PI;
const SNOW = 0xf5f9ff;
const BRASS = 0xc9a227;

// ------------------------------------------------------------------ Slinger

/** A ball cap worn backwards: crown, button, the peak over the neck and the strap on the forehead (head space). */
function kidCap(k, col, peak) {
  dome(k, 0.69, 0.5, col, 0, 0.95, 0);
  k.torus(0.68, 0.035, tone(col, 0.85), 0, 0.97, 0, { rx: PI / 2, seg: 20 });
  k.ball(0.07, tone(col, 0.8), 0, 1.45, 0, { seg: 8, rows: 5 });
  k.box(0.92, 0.06, 0.4, peak, 0, 0.98, -0.78, { rx: -0.12, r: 0.02 }); // peak over the neck
  k.cyl(0.46, 0.06, peak, 0, 0.955, -0.97, { seg: 16, sz: 0.45, rx: -0.12 });
  k.box(0.5, 0.16, 0.06, tone(col, 0.7), 0, 1.08, 0.64, { rx: -0.2 }); // snap strap
  for (const x of [-0.12, 0, 0.12]) k.cyl(0.03, 0.03, 0xfafafa, x, 1.08, 0.68, { axis: 'z', seg: 6 });
}

/** Sneakers and striped socks on a leg (leg space). */
function sneakers(k, col, stripe) {
  k.box(1.05, 0.45, 1.05, 0xfafafa, 0, -1.35, 0); // socks
  for (const y of [-1.2, -1.3]) k.box(1.07, 0.05, 1.07, stripe, 0, y, 0);
  k.box(1.08, 0.42, 1.2, col, 0, -1.76, 0.06, { r: 0.1 });
  k.box(1.12, 0.14, 1.28, 0xf5f5f5, 0, -1.94, 0.08, { r: 0.04 }); // sole
  k.box(0.9, 0.2, 0.2, 0xf5f5f5, 0, -1.8, 0.62, { r: 0.06 }); // toe cap
  for (let i = 0; i < 3; i++) k.box(0.42, 0.04, 0.04, 0xfafafa, 0, -1.58 - i * 0.1, 0.62); // laces
  for (const s of [-1, 1]) k.box(0.04, 0.22, 0.5, 0xfafafa, s * 0.55, -1.74, 0.1, { rz: s * 0.1 }); // side swoosh
}

/** A small earpiece with a mic on the right ear (head space). */
function earpiece(k, light) {
  k.cyl(0.17, 0.14, INK, -0.66, 0.7, 0, { axis: 'x', seg: 12 });
  k.cyl(0.08, 0.04, light, -0.74, 0.7, 0, { axis: 'x', seg: 10 });
  k.tube([[-0.7, 0.62, 0.05], [-0.62, 0.45, 0.4], [-0.35, 0.38, 0.6]], 0.025, INK, { seg: 8, sides: 4 });
  k.ball(0.06, INK, -0.33, 0.38, 0.62, { seg: 8, rows: 5 });
}

/**
 * A slingshot in the fist (gun space): the handle stands up out of the hand, the fork on top,
 * the band pulled back toward the kid with a stone in the pouch. o: wood, metal (bands and
 * caps: Stronger Materials), brace (a wrist brace: Pullback Strength), double (two bands),
 * loader (a stone magazine on the handle: Heavy Autoloader), band (colour or glow), stone,
 * glow (lines on a Cysian slingshot). Returns the muzzle [y, z].
 */
function slingshot(k, o) {
  const wood = o.wood;
  const metal = o.metal ?? tone(wood, 0.7);
  k.cyl(0.12, 1.1, wood, 0, 0, 0.1, { axis: 'z', seg: 10 }); // handle
  for (const z of [-0.2, 0.1, 0.4]) k.torus(0.125, 0.025, o.metal ?? LEATHER, 0, 0, z, { seg: 10 }); // grip wrap
  k.ball(0.15, wood, 0, 0, 0.66, { seg: 10, rows: 7 }); // crotch of the fork
  const tips = [];
  for (const s of [-1, 1]) {
    const tip = [s * 0.44, 0, 1.4];
    k.tube([[0, 0, 0.66], [s * 0.36, 0, 0.98], [s * 0.44, 0, 1.4]], 0.09, wood, { seg: 10, sides: 6 });
    k.cyl(0.11, 0.14, metal, tip[0], 0, tip[2], { axis: 'z', seg: 8 }); // prong cap
    if (o.metal) k.torus(0.1, 0.025, o.metal, s * 0.4, 0, 1.15, { seg: 8 });
    if (o.glow) k.box(0.04, 0.04, 0.5, o.glow, s * 0.4, -0.08, 1.08, { ry: s * 0.3 });
    tips.push(tip);
  }
  // the band, drawn back to the pouch
  const P = [0, 0.95, 1.32];
  for (const [x, , z] of tips) {
    k.tube([[x, 0, z - 0.05], [x * 0.4, 0.55, z - 0.04], [P[0], P[1], P[2]]], o.double ? 0.045 : 0.03, o.band, { seg: 6, sides: 4, tension: 0 });
    if (o.double) k.tube([[x, 0, z + 0.06], [x * 0.4, 0.55, z + 0.02], [P[0], P[1], P[2] + 0.06]], 0.03, o.band, { seg: 6, sides: 4, tension: 0 });
  }
  k.box(0.34, 0.16, 0.26, LEATHER, P[0], P[1], P[2], { r: 0.05 }); // pouch
  k.ball(0.13, o.stone, P[0], P[1] - 0.08, P[2] + 0.03, { seg: 8, rows: 6 });
  if (o.brace) {
    // a wrist brace down from the handle to rest on the forearm
    k.tube([[0, 0.02, -0.42], [0, 0.45, -0.62], [0, 1.0, -0.6]], 0.045, metal, { seg: 10, sides: 5 });
    k.box(0.5, 0.12, 0.16, metal, 0, 1.0, -0.58, { r: 0.03 });
  }
  if (o.loader) {
    // a tube magazine of stones on the side of the handle, feeding up to the fork
    k.cyl(0.13, 1.0, 0x546e7a, 0.24, 0, 0.2, { axis: 'z', seg: 10, open: true });
    for (let i = 0; i < 4; i++) k.ball(0.1, o.stone, 0.24, 0, -0.15 + i * 0.22, { seg: 7, rows: 5 });
    k.cyl(0.14, 0.08, INK, 0.24, 0, 0.72, { axis: 'z', seg: 10 });
    k.cyl(0.14, 0.08, INK, 0.24, 0, -0.32, { axis: 'z', seg: 10 });
  }
  return [-0.05, 1.32];
}

/**
 * Slinger: a kid in a backwards cap with a slingshot.
 * Top: 1 Gloves (fingerless gloves), 2 Earpiece, 3 'Ranked Up (a glowing rank badge and arm
 * stripes), 4 Faction Leader (a blue uniform, red beret, cape and gold shoulder boards), 5 Cysian
 * Overclock (a purple visor helmet, a cape with glowing clasps and a turning aura ring).
 * Bottom: 1 Stronger Materials (steel bands on the slingshot), 2 Pullback Strength (a double band
 * and a wrist brace), 3 Heavy Autoloader (a stone hopper on the back and a stone magazine on the
 * slingshot), 4 Volatile Bolts (glowing hot stones and band), 5 Bold Trebuchet (a little
 * trebuchet on its back).
 */
export function makeSlinger(a, b) {
  const leader = a >= 4;
  const cysian = a >= 5;
  const shirt = cysian ? 0x4a148c : leader ? 0x1565c0 : 0xef6c00;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt, pants: 0x5d4037, arms: shirt, face: 'smile' });
  h.body.scale.setScalar(0.85); // a kid
  const key = `xslinger${a}${b}`;
  const purple = cysian ? glowMat(h, 0xe040fb) : null;
  const green = glowMat(h, 0x76ff03);
  const hot = b >= 4 ? glowMat(h, 0xff6d00) : null;
  const stone = hot ?? (b >= 1 ? 0x78909c : 0x9e9e9e);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // head
  if (cysian) visorHelmet(hd, 0x311b92, purple, { crest: 0x7c4dff });
  else {
    hair(hd, 0x6d4c41, { h: 0.4 });
    if (leader) beret(hd, 0xc62828, GOLD);
    else kidCap(hd, 0x1e88e5, 0x1565c0);
  }
  if (a >= 2 && !cysian) earpiece(hd, green);
  // a T-shirt with a stripe, or the leader's uniform
  t.cyl(0.56, 0.12, tone(shirt, 0.8), 0, 0.98, 0, { seg: 18 }); // neck band
  if (leader) {
    collar(t, tone(shirt, 0.8), { button: GOLD });
    pockets(t, tone(shirt, 0.9));
    for (const s of [-1, 1]) {
      t.box(0.5, 0.08, 0.95, cysian ? 0x7c4dff : GOLD, s * 0.62, 1.02, 0, { r: 0.03 }); // shoulder boards
      for (let i = 0; i < 3; i++) t.box(0.04, 0.04, 0.8, cysian ? purple : 0xfff59d, s * (0.45 + i * 0.12), 1.07, 0);
    }
    cape(t, cysian ? 0x4a148c : 0xc62828, 2.2, { clasp: cysian ? purple : GOLD });
    if (cysian) {
      t.box(1.5, 1.1, 0.18, 0x311b92, 0, 0.3, 0.56, { r: 0.08 }); // chest plate
      t.cyl(0.22, 0.08, purple, 0, 0.35, 0.67, { axis: 'z', seg: 14 });
      for (const s of [-1, 1]) t.box(0.06, 0.8, 0.04, purple, s * 0.55, 0.3, 0.66);
    }
  } else {
    t.box(2.04, 0.3, 1.04, 0xfafafa, 0, 0.25, 0); // shirt stripe
    t.box(2.04, 0.08, 1.04, 0x1e88e5, 0, 0.05, 0);
  }
  belt(t, LEATHER, 0xb0b0b0);
  // a pouch of pebbles on the hip
  pouch(t, 0.62, -1.0, 0.52, 0.42, 0.4, 0x8d6e63, 0.2);
  for (const [x, c] of [[0.5, 0x9e9e9e], [0.7, 0x78909c]]) t.ball(0.08, hot ?? c, x, -0.74, 0.66, { seg: 7, rows: 5 });
  if (a >= 3) {
    // 'Ranked Up: a glowing rank badge
    t.cyl(0.2, 0.06, tone(shirt, 0.6), -0.5, 0.55, 0.53, { axis: 'z', seg: 14 });
    for (let i = 0; i < 2; i++) for (const s of [-1, 1]) t.box(0.2, 0.06, 0.04, green, -0.5 + s * 0.07, 0.62 - i * 0.12, 0.57, { rz: s * -0.6 });
  }
  if (b >= 3) {
    // Heavy Autoloader: a hopper of stones on the back
    t.box(1.3, 1.3, 0.6, 0x6d4c41, 0, 0.0, -0.82, { r: 0.1 });
    t.slab(1.3, 0.4, 0.6, 0x5d4037, 0, 0.85, -0.82, { tw: 1.25, td: 1.3 }); // funnel
    for (let i = 0; i < 6; i++) t.ball(0.14, i % 2 ? stone : 0x78909c, -0.45 + (i % 3) * 0.45, 1.05 + (i > 2 ? 0.08 : 0), -0.75 - (i > 2 ? 0.18 : 0), { seg: 7, rows: 5 });
    t.box(1.36, 0.1, 0.66, INK, 0, -0.3, -0.82);
    t.tube([[0.5, -0.5, -1.0], [0.9, -0.85, -0.6], [1.05, -0.9, 0.0]], 0.06, INK, { seg: 10, sides: 5 }); // feed hose
    for (const s of [-1, 1]) {
      t.box(0.22, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
      t.box(0.22, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
    }
    if (hot) for (const x of [-0.4, 0.4]) t.box(0.3, 0.3, 0.04, 0xffd600, x, -0.05, -1.13); // warning plates
  }
  if (b >= 5) {
    // Bold Trebuchet: an A-frame of beams, a throwing arm with a sling and a counterweight
    const z = -1.4;
    const wood = 0x8d6e63;
    t.box(1.5, 0.16, 1.0, tone(wood, 0.8), 0, -0.65, z - 0.1, { r: 0.03 }); // base
    for (const s of [-1, 1]) {
      t.box(0.16, 2.5, 0.16, wood, s * 0.6, 0.55, z + 0.2, { rx: -0.2, r: 0.03 });
      t.box(0.16, 2.5, 0.16, wood, s * 0.6, 0.55, z - 0.4, { rx: 0.2, r: 0.03 });
      t.cyl(0.1, 0.1, STEEL, s * 0.68, 1.75, z - 0.1, { axis: 'x', seg: 10 }); // axle caps
    }
    t.cyl(0.07, 1.3, STEEL, 0, 1.75, z - 0.1, { axis: 'x', seg: 8 }); // axle
    t.box(0.18, 2.1, 0.18, tone(wood, 0.9), 0, 2.55, z - 0.6, { rx: -0.55, r: 0.04 }); // throwing arm
    t.box(0.18, 0.7, 0.18, tone(wood, 0.9), 0, 1.45, z + 0.08, { rx: -0.55, r: 0.04 }); // short end
    t.box(0.62, 0.55, 0.55, 0x424242, 0, 1.0, z + 0.3, { r: 0.06 }); // counterweight
    t.box(0.66, 0.08, 0.6, INK, 0, 1.15, z + 0.3);
    t.tube([[0, 3.42, z - 1.1], [0, 3.15, z - 1.45], [0, 2.95, z - 1.5]], 0.025, 0xd7ccc8, { seg: 6, sides: 4 }); // sling
    t.box(0.34, 0.12, 0.34, LEATHER, 0, 2.85, z - 1.5, { r: 0.04 });
    t.ball(0.22, hot ?? 0x78909c, 0, 3.02, z - 1.5, { seg: 8, rows: 6 });
  }
  t.done();
  hd.done();
  hands(h, key, a >= 1 ? (cysian ? 0x311b92 : 0x795548) : null, tone(shirt, 0.8), (k, s) => {
    if (a >= 3 && s === 1) for (let i = 0; i < 2; i++) for (const d of [-1, 1]) k.box(0.04, 0.06, 0.26, green, 0.53, -0.32 - i * 0.14 + 0.04, d * 0.1, { rx: d * 0.5 }); // arm stripes
    if (b >= 2 && s === -1) k.cyl(0.57, 0.36, INK, 0, -1.3, 0, { seg: 12 }); // wrist guard
  });
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const k = wear(h, leg, `${key}:leg`);
    sneakers(k, cysian ? 0x311b92 : leader ? 0x0d47a1 : 0xd84315, leader ? 0xfafafa : 0x1e88e5);
    k.done();
  }
  if (cysian) {
    // the aura ring and its little crystals turn round the kid's feet
    const ring = spinner(h, h.root, 0, 0.12, 0);
    const r = wear(h, ring, `${key}:aura`);
    r.torus(1.9, 0.05, purple, 0, 0, 0, { rx: PI / 2, seg: 40 });
    r.torus(1.6, 0.025, purple, 0, 0, 0, { rx: PI / 2, seg: 36 });
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * PI * 2;
      shard(r, Math.sin(ang) * 1.9, 0.05, Math.cos(ang) * 1.9, 0.5, 0.1, purple);
    }
    r.done();
    h.idleSpin = 0.7;
  }
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = slingshot(gk, {
    wood: cysian ? 0x37474f : b >= 4 ? 0x4e342e : 0x8d6e63,
    metal: b >= 1 ? (cysian ? 0x7c4dff : 0x90a4ae) : null,
    brace: b >= 2,
    double: b >= 2,
    loader: b >= 3,
    band: hot ?? (cysian ? purple : 0xd7ccc8),
    stone,
    glow: purple,
  });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = b >= 4 ? 0xff6d00 : 0xbdbdbd;
  return own(h, 0);
}

// ------------------------------------------------------------------ Crossbower

/**
 * A crossbow on the fist (gun space): butt, tiller with a bolt groove, prod with its string drawn
 * to the latch, a stirrup at the front and a loaded bolt. o: len, span, wood, metal (fittings:
 * Refurbished Handle), limb (colour or material), string, head (bolt head), drip (a glow drop on
 * the head: poison), sight (glow lens of a homing sight), crank (an Arbalist's cranequin),
 * vial (a poison vial on the side). Returns the bolt tip [y, z].
 */
function crossbow(k, o) {
  const U = UP;
  const len = o.len;
  const P = -len + 0.4; // where the prod sits
  const nock = -0.4;
  k.box(0.28, 0.75, 0.4, o.wood, 0, 0.55, U - 0.08, { r: 0.07 }); // butt
  k.box(0.3, 0.08, 0.46, INK, 0, 0.94, U - 0.08, { r: 0.02 });
  k.box(0.26, len + 0.2, 0.26, o.wood, 0, (0.2 - len) / 2, U, { r: 0.05 }); // tiller
  k.box(0.08, len - 0.4, 0.03, INK, 0, -len / 2 - 0.1, U + 0.13); // bolt groove
  k.box(0.22, 0.26, 0.5, o.wood, 0, 0.05, U - 0.34, { rx: -0.32, r: 0.05 }); // grip
  k.torus(0.1, 0.022, INK, 0, -0.14, U - 0.24, { ry: PI / 2, seg: 10, arc: PI });
  k.box(0.2, 0.16, 0.18, INK, 0, nock, U + 0.18, { r: 0.03 }); // latch
  if (o.metal) {
    for (const y of [-0.1, -0.9, P + 0.3]) k.box(0.3, 0.1, 0.3, o.metal, 0, y, U, { r: 0.02 }); // fittings
    for (let i = 0; i < 3; i++) k.box(0.29, 0.04, 0.29, LEATHER, 0, 0.35 + i * 0.12, U - 0.08); // leather wrap
  }
  // the prod (bow) and its string
  k.box(0.42, 0.3, 0.36, o.metal ?? INK, 0, P, U, { r: 0.04 });
  const half = o.span / 2;
  for (const s of [-1, 1]) {
    const end = [s * half, P + 0.2, U];
    k.tube([[0, P, U], [s * half * 0.55, P - 0.12, U], end], o.crank ? 0.09 : 0.075, o.limb, { seg: 12, sides: 6 });
    k.ball(0.07, o.metal ?? INK, end[0], end[1], end[2], { seg: 8, rows: 5 });
    k.tube([end, [0, nock, U + 0.18]], 0.018, o.string, { seg: 2, sides: 4, tension: 0 });
  }
  k.torus(0.22, 0.03, o.metal ?? INK, 0, P - 0.35, U, { seg: 12 }); // stirrup
  // the bolt
  const tip = P - 0.45;
  k.cyl(0.035, nock - tip, 0xd7ccc8, 0, (nock + tip) / 2, U + 0.18, { seg: 6 });
  for (let i = 0; i < 2; i++) k.box(0.02, 0.24, 0.1, i ? 0xfafafa : 0xc62828, 0, nock - 0.18, U + 0.18 + (i ? 0.06 : -0.02), { ry: i * PI / 2 });
  k.cyl(0.01, 0.26, o.head, 0, tip + 0.13, U + 0.18, { r2: 0.09, seg: 8 });
  if (o.drip) k.ball(0.07, o.drip, 0, tip + 0.3, U + 0.18, { seg: 8, rows: 5 });
  if (o.sight) {
    k.box(0.18, 0.5, 0.2, INK, 0, -0.35, U + 0.45, { r: 0.03 });
    k.cyl(0.08, 0.03, o.sight, 0, -0.61, U + 0.45, { seg: 10 });
    k.box(0.06, 0.1, 0.14, INK, 0, -0.35, U + 0.3);
  }
  if (o.crank) {
    // a cranequin: a gear box on the butt with a crank handle
    k.cyl(0.2, 0.14, STEEL, 0.22, 0.35, U, { axis: 'x', seg: 14 });
    k.cyl(0.08, 0.2, INK, 0.36, 0.35, U, { axis: 'x', seg: 8 });
    k.tube([[0.4, 0.35, U], [0.45, 0.6, U + 0.2], [0.5, 0.62, U + 0.35]], 0.03, STEEL, { seg: 6, sides: 4 });
    k.ball(0.06, o.wood, 0.5, 0.62, U + 0.38, { seg: 6, rows: 4 });
  }
  if (o.vial) {
    k.cyl(0.08, 0.3, o.vial, -0.2, -0.75, U, { seg: 10 });
    k.cyl(0.05, 0.06, 0x8d6e63, -0.2, -0.57, U, { seg: 8 }); // cork
  }
  return [tip, U + 0.18];
}

/**
 * Crossbower: a hooded hunter with a crossbow and a quiver of bolts.
 * Top: 1 Goggles, 2 Refurbished Handle (dark wood, steel fittings, a leather-wrapped butt),
 * 3 Homing Arrows (a glowing homing sight, blue bolts and a blue string), 4 Winter Hunter (a white
 * fur coat and hood, icy limbs).
 * Bottom: 1 Poison Tipped (green bolt heads), 2 Stronger Poison (vials on the belt and the
 * crossbow), 3 Arbalist (a bigger crossbow with steel limbs and a crank, bolts in three colours,
 * a green coat), 4 Power Poacher (a purple coat with glowing trim and a mask, purple bolts).
 */
export function makeCrossbower(a, b) {
  const winter = a >= 4;
  const poach = b >= 4;
  const arb = b >= 3;
  const coat = winter ? 0xeceff1 : poach ? 0x4a148c : arb ? 0x33691e : 0x5d4037;
  const h = makeHumanoid({ skin: 0xd7a36f, shirt: coat, pants: winter ? 0x90a4ae : 0x3e2723, arms: coat, face: 'soldier' });
  const key = `xcrossbow${a}${b}`;
  const blue = glowMat(h, 0x40c4ff);
  const poison = glowMat(h, 0x76ff03);
  const fire = glowMat(h, 0xff6d00);
  const violet = poach ? glowMat(h, 0xe040fb) : null;
  const ice = winter ? glowMat(h, 0x90caf9, 0.5) : null;
  const tipCol = poach ? violet : a >= 3 ? blue : b >= 1 ? poison : STEEL;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // head: a hood (fur-lined in winter), goggles, a mask for the poacher
  hood(hd, winter ? 0xfafafa : poach ? 0x311b92 : 0x4e342e);
  if (winter) hd.torus(0.74, 0.14, 0xe0e0e0, 0, 0.42, 0.1, { rx: PI / 2 - 0.15, seg: 20 }); // fur ruff
  if (poach) band(hd, 0.66, 0.06, 0.34, 2.3, 0x311b92, 0.3);
  if (a >= 1) goggles(hd, 0.74, a >= 3 ? blue : glowMat(h, 0xffca28), { r: 0.67, frame: 0x3e2723 });
  if (a >= 3) {
    hd.box(0.16, 0.3, 0.3, INK, 0.7, 0.75, 0.15, { r: 0.04 }); // homing sensor by the ear
    hd.cyl(0.06, 0.03, blue, 0.79, 0.8, 0.2, { axis: 'x', seg: 8 });
  }
  // a tunic with a laced neck, a belt and a leather quiver strap
  t.box(2.14, 1.9, 1.14, tone(coat, 0.92), 0, 0.0, 0, { r: 0.12 });
  t.box(0.26, 0.6, 0.04, INK, 0, 0.62, 0.58);
  for (let i = 0; i < 2; i++) for (const s of [-1, 1]) t.box(0.34, 0.03, 0.03, 0xd7ccc8, 0, 0.82 - i * 0.24, 0.61, { rz: s * 0.5 });
  sash(t, LEATHER, -1, 0.24);
  belt(t, LEATHER, 0x9e9e9e, -0.82);
  pouch(t, -0.6, -1.0, 0.56, 0.36, 0.34, LEATHER, 0.16);
  if (winter) {
    // a fur coat: fur pelt over the shoulders, fur down the front and at the hem
    t.box(2.3, 0.4, 1.3, 0xf5f5f5, 0, 0.92, 0, { r: 0.15 });
    for (const s of [-1, 1]) t.box(0.3, 1.8, 0.14, 0xe0e0e0, s * 0.25, -0.05, 0.6, { r: 0.06 });
    t.box(2.24, 0.24, 1.24, 0xe0e0e0, 0, -1.0, 0, { r: 0.1 });
  }
  if (poach) {
    for (const s of [-1, 1]) t.box(0.06, 1.8, 0.06, violet, s * 1.1, -0.05, 0.5); // glowing trim
    t.box(0.5, 0.4, 0.06, 0x212121, 0.5, 0.45, 0.6, { r: 0.04 }); // poacher's badge
    t.cyl(0.12, 0.04, violet, 0.5, 0.45, 0.64, { axis: 'z', seg: 10 });
  }
  if (b >= 2) {
    // Stronger Poison: vials of poison on the belt
    for (const x of [0.3, 0.55, 0.8]) {
      t.cyl(0.08, 0.32, poach ? violet : poison, x, -1.08, 0.58, { seg: 10 });
      t.cyl(0.05, 0.08, 0x8d6e63, x, -0.88, 0.58, { seg: 8 });
      t.box(0.12, 0.1, 0.06, LEATHER, x, -0.98, 0.62);
    }
  }
  // the quiver of bolts on the back
  const qz = -0.85;
  t.box(0.6, 1.4, 0.45, LEATHER, 0.45, 0.15, qz, { r: 0.08, rz: 0.25 });
  t.box(0.64, 0.12, 0.49, tone(LEATHER, 0.7), 0.45 - 0.13, 0.65, qz, { rz: 0.25 });
  const heads = arb ? [poison, fire, blue] : [tipCol, tipCol, tipCol];
  heads.forEach((c, i) => {
    const x = 0.3 + i * 0.13;
    t.cyl(0.03, 0.6, 0xd7ccc8, x - 0.05, 1.05, qz + (i - 1) * 0.1, { rz: 0.25, seg: 5 });
    t.cyl(0.01, 0.22, poach ? violet : c, x - 0.13, 1.42, qz + (i - 1) * 0.1, { rz: 0.25, seg: 6, r2: 0.0001, rx: PI }); // heads up
  });
  hd.done();
  t.done();
  hands(h, key, winter ? 0xb0bec5 : 0x4e342e, winter ? 0xf5f5f5 : tone(coat, 0.75), (k, s) => {
    if (s === 1) {
      k.cyl(0.58, 0.6, poach ? 0x311b92 : 0x6d4c41, 0, -1.2, 0, { seg: 12, r2: 0.6 }); // bracer
      for (let i = 0; i < 3; i++) k.box(0.3, 0.03, 0.03, 0xd7ccc8, 0, -1.02 - i * 0.18, 0.6);
    }
  });
  feet(h, key, winter ? 0xb0bec5 : 0x3e2723, (k) => {
    k.box(1.12, 0.14, 1.14, winter ? 0xf5f5f5 : 0x6d4c41, 0, -1.3, 0.02); // boot turn-downs
    if (a >= 2) kneePad(k, poach ? 0x311b92 : 0x4e342e);
  });
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = crossbow(gk, {
    len: arb ? 2.4 : 2.1,
    span: arb ? 2.9 : 2.3,
    wood: a >= 2 ? 0x4e342e : 0x795548,
    metal: a >= 2 ? (poach ? 0x4a148c : 0x78909c) : null,
    limb: ice ?? (arb ? 0x90a4ae : 0x6d4c41),
    string: a >= 3 ? blue : poach ? violet : 0xeeeeee,
    head: a >= 3 ? blue : poach ? violet : STEEL,
    drip: b >= 1 ? (poach ? violet : poison) : null,
    sight: a >= 3 ? blue : null,
    crank: arb,
    vial: b >= 2 ? (poach ? violet : poison) : null,
  });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = a >= 3 ? 0x80d8ff : poach ? 0xe040fb : b >= 1 ? 0x76ff03 : 0xd7ccc8;
  return own(h, z);
}

// ------------------------------------------------------------------ Gunslinger

/**
 * A break-action scattergun on the fist (gun space): wooden stock, an action with hammers,
 * two barrels side by side (four at Quad-Barrel), a forend and a rib. o: len, n (2 or 4), wood,
 * metal, choke (flared muzzles: Bigger Blast), scope (Marksman), glow (Wasteland Ravager's hot
 * muzzle), saddle (a row of shells on the side). Returns the bore point [y, z].
 */
function scattergun(k, o) {
  const U = UP;
  const len = o.len;
  const B = U + 0.1;
  const metal = o.metal;
  const r = 0.08;
  const bores = o.n === 4 ? [[-r, B - r], [r, B - r], [-r, B + r], [r, B + r]] : [[-r, B], [r, B]];
  const top = Math.max(...bores.map((p) => p[1])) + r;
  const bottom = Math.min(...bores.map((p) => p[1])) - r;
  k.slab(0.26, 0.75, 0.34, o.wood, 0, 0.5, U - 0.12, { td: 1.5, tz: -0.08 }); // stock
  k.box(0.28, 0.06, 0.5, INK, 0, 0.88, U - 0.16);
  k.box(0.22, 0.3, 0.46, o.wood, 0, 0.1, U - 0.3, { rx: -0.35, r: 0.05 }); // wrist
  k.box(0.36, 0.55, 0.4, metal, 0, -0.2, U + 0.02, { r: 0.04 }); // action
  for (const s of [-1, 1]) k.box(0.06, 0.16, 0.08, INK, s * 0.09, 0.05, U + 0.26, { rx: 0.5 }); // hammers
  k.box(0.38, 0.3, 0.02, tone(metal, 1.3), 0, -0.2, U + 0.03, { r: 0.01 }); // engraving plate
  k.torus(0.1, 0.022, INK, 0, -0.14, U - 0.24, { ry: PI / 2, seg: 10, arc: PI });
  const bl = len - 0.45;
  for (const [x, z] of bores) {
    k.cyl(r, bl, STEEL, x, -0.45 - bl / 2, z, { seg: 10 });
    k.cyl(r - 0.025, 0.03, 0x050505, x, -len - 0.01, z, { seg: 8 });
    if (o.choke) k.cyl(r + 0.04, 0.2, INK, x, -len + 0.1, z, { seg: 10, r2: r + 0.01 }); // flared choke (wide end out)
  }
  k.box(0.06, bl, 0.04, INK, 0, -0.45 - bl / 2, top + 0.02); // rib
  k.ball(0.035, 0xe0e0e0, 0, -len + 0.08, top + 0.06, { seg: 6, rows: 4 }); // bead
  k.box(0.32, 0.75, 0.2, o.wood, 0, -0.85, bottom - 0.08, { r: 0.06 }); // forend
  for (const y of [-0.62, -len + 0.35]) k.box(0.36, 0.08, top - bottom + 0.06, INK, 0, y, (top + bottom) / 2); // barrel bands
  if (o.scope) {
    const sz = top + 0.3;
    k.cyl(0.1, 1.0, INK, 0, -0.45, sz, { seg: 12 });
    k.cyl(0.14, 0.22, INK, 0, -1.0, sz, { seg: 14, r2: 0.11 });
    k.cyl(0.12, 0.02, 0x4fc3f7, 0, -1.12, sz, { seg: 12 });
    k.cyl(0.13, 0.18, INK, 0, 0.12, sz, { seg: 12, r2: 0.1 });
    for (const y of [-0.75, -0.15]) k.box(0.1, 0.1, 0.26, INK, 0, y, top + 0.14);
  }
  if (o.saddle) {
    for (let i = 0; i < 4; i++) {
      k.cyl(0.065, 0.26, o.saddle, 0.23, -0.05 - i * 0.14, U, { axis: 'z', seg: 8 });
      k.cyl(0.07, 0.06, GOLD, 0.23, -0.05 - i * 0.14, U - 0.13, { axis: 'z', seg: 8 });
    }
    k.box(0.04, 0.6, 0.2, INK, 0.19, -0.26, U);
  }
  if (o.glow) {
    k.box(0.36, 0.2, top - bottom + 0.14, INK, 0, -len + 0.1, (top + bottom) / 2, { r: 0.04 }); // muzzle block
    k.box(0.3, 0.05, top - bottom + 0.08, o.glow, 0, -len - 0.01, (top + bottom) / 2);
    for (const s of [-1, 1]) k.box(0.04, 0.14, 0.06, o.glow, s * 0.19, -len + 0.1, (top + bottom) / 2);
  }
  return [-len, (top + bottom) / 2];
}

/**
 * Gunslinger: a wasteland gunner with a wide-brim hat and a break-action scattergun.
 * Top: 1 Shades, 2 Gloves, 3 Marksman (a longer gun with a scope), 4 Reinforcements (a radio on
 * the back with a handset and a flare pouch).
 * Bottom: 1 Bigger Blast (flared chokes), 2 AP Rounds (a shell bandolier), 3 Quad-Barrel (four
 * barrels and a second bandolier), 4 Wasteland Ravager (dark leathers, spiked shoulder plates, a
 * bandana mask and a glowing explosive muzzle).
 */
export function makeGunslinger(a, b) {
  const rav = b >= 4;
  const shirt = rav ? 0x3e2723 : 0x8d6e63;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: 0x4e342e, arms: shirt, face: 'soldier' });
  const key = `xgunsl${a}${b}`;
  const hot = rav ? glowMat(h, 0xff6d00) : null;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x3e2723, { h: 0.38 });
  cowboyHat(hd, rav ? 0x212121 : 0x6d4c41, rav ? 0xb71c1c : 0x3e2723);
  if (a >= 1) shades(hd, INK, 0x263238);
  if (rav) band(hd, 0.66, 0.06, 0.34, 2.3, 0x8b0000, 0.3); // bandana over the mouth
  // a shirt and a leather vest, a neck scarf
  collar(t, tone(shirt, 0.85));
  for (const s of [-1, 1]) {
    t.box(0.72, 1.7, 0.1, rav ? 0x1b1b1b : 0x5d4037, s * 0.66, 0.1, 0.54, { r: 0.04 }); // vest panels
    t.box(0.1, 1.7, 0.12, tone(rav ? 0x1b1b1b : 0x5d4037, 0.7), s * 0.33, 0.1, 0.55);
  }
  t.box(2.08, 1.8, 0.12, rav ? 0x1b1b1b : 0x5d4037, 0, 0.1, -0.54, { r: 0.04 }); // vest back
  neckScarf(t, rav ? 0x8b0000 : 0xa1887f);
  shellBelt(t, LEATHER, 3);
  if (b >= 2) shellStrap(t, 1, LEATHER);
  if (b >= 3) shellStrap(t, -1, LEATHER);
  if (a >= 4) {
    // Reinforcements: a field radio on the back, its handset clipped on the chest, and a flare pouch
    t.box(1.2, 1.3, 0.5, 0x4b5320, 0, 0.1, -0.85, { r: 0.08 });
    radio(t, 0.3, 0.35, -1.25, 0x33691e, 1.9);
    t.box(0.2, 0.4, 0.14, INK, -0.55, 0.55, 0.66, { r: 0.04 }); // handset
    t.tube([[-0.55, 0.35, 0.66], [-0.95, 0.0, 0.4], [-0.9, 0.2, -0.6]], 0.03, INK, { seg: 10, sides: 4 });
    pouch(t, 0.55, -0.4, 0.62, 0.38, 0.4, 0xc62828, 0.14);
    for (const s of [-1, 1]) {
      t.box(0.22, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
      t.box(0.22, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
    }
  }
  if (rav) {
    // spiked shoulder plates
    for (const s of [-1, 1]) {
      t.ball(0.6, 0x616161, s * 1.3, 0.95, 0, { sy: 0.5, seg: 14, rows: 8 });
      t.box(0.5, 0.06, 0.9, INK, s * 1.3, 0.78, 0);
      for (const dz of [-0.25, 0.2]) t.cyl(0.1, 0.45, 0xbdbdbd, s * 1.35, 1.38, dz, { seg: 6, r2: 0.005 });
    }
  }
  hd.done();
  t.done();
  hands(h, key, a >= 2 ? 0x3e2723 : null, tone(shirt, 0.8), rav ? (k, s) => k.cyl(0.58, 0.4, 0x616161, 0, -1.25, 0, { seg: 12 }) : null);
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const k = wear(h, leg, `${key}:leg`);
    boots(k, rav ? 0x1b1b1b : 0x5d4037, { heel: true });
    k.torus(0.12, 0.025, STEEL, 0, -1.86, -0.62, { ry: PI / 2, seg: 10 }); // spur
    k.cyl(0.07, 0.03, STEEL, 0, -1.86, -0.74, { axis: 'x', seg: 6 });
    if (rav) kneePad(k, 0x616161);
    k.done();
  }
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = scattergun(gk, {
    len: a >= 3 ? 2.5 : 2.0,
    n: b >= 3 ? 4 : 2,
    wood: rav ? 0x3e2723 : 0x6d4c41,
    metal: rav ? 0x212121 : 0x37474f,
    choke: b >= 1,
    scope: a >= 3,
    saddle: b >= 2 ? 0xb71c1c : null,
    glow: hot,
  });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = rav ? 0xff6d00 : 0xffd54f;
  return own(h, z);
}

// ------------------------------------------------------------------ Freezer

/**
 * Freezer: a cryo trooper with a freeze-ray and coolant on its back.
 * Top: 1 Gloves, 2 Extra Snow (snow piled on the shoulders and helmet, icicles), 3 Explosives (a
 * drum of frozen grenades under the barrel and frost grenades on the belt), 4 Living Legend (a
 * deep blue suit, ice shoulder plates and an ice crown).
 * Bottom: 1 Air Pressure (a pressure gauge on the gun and the chest), 2 Cooling Tanks (two
 * tanks), 3 Glacial Prowess (ice crystals on the tanks and the gun), 4 Absolute Zero (a white
 * suit, glowing tanks and a turning frost ring).
 */
export function makeFreezerX(a, b) {
  const legend = a >= 4;
  const zero = b >= 4;
  const suit = legend ? 0x0d47a1 : zero ? 0xe0f7fa : 0x4fc3f7;
  const h = makeHumanoid({ skin: 0xffe0bd, shirt: suit, pants: 0x37474f, arms: suit, face: 'soldier' });
  const key = `xfreezer${a}${b}`;
  const ice = glowMat(h, legend ? 0x82b1ff : 0x18ffff);
  const frost = glowMat(h, 0x80deea, zero ? 0.8 : 0.5);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  helmet(hd, legend ? 0x1a237e : 0xb3e5fc, { cover: legend ? 0x283593 : 0x81d4fa });
  visor(hd, ice);
  if (legend) {
    // an ice crown on the helmet
    for (const [x, hh] of [[-0.45, 0.4], [-0.22, 0.55], [0, 0.7], [0.22, 0.55], [0.45, 0.4]]) shard(hd, x, 1.32, 0.3 - Math.abs(x) * 0.3, hh, 0.09, ice);
    hd.torus(0.62, 0.05, 0x82b1ff, 0, 1.33, 0.05, { rx: PI / 2, seg: 20 });
  }
  if (a >= 2) for (const [x, z, r] of [[-0.3, -0.1, 0.28], [0.2, 0.15, 0.24], [0.35, -0.25, 0.2]]) hd.ball(r, SNOW, x, 1.42, z, { sy: 0.5, seg: 10, rows: 6 }); // snow on the helmet
  // a padded cryo suit: chest plate, insulated ribs, collar ring, belt
  t.box(1.6, 1.2, 0.2, legend ? 0x1a237e : 0xeceff1, 0, 0.25, 0.56, { r: 0.08 });
  for (let i = 0; i < 3; i++) t.box(2.06, 0.08, 1.06, tone(suit, 0.8), 0, -0.45 - i * 0.18, 0);
  t.cyl(0.6, 0.16, 0x90a4ae, 0, 0.98, 0, { seg: 18 });
  belt(t, 0x455a64, 0xb0bec5);
  pouch(t, 0.6, -0.95, 0.55, 0.36, 0.34, 0x546e7a, 0.18);
  if (b >= 1) {
    // Air Pressure: a gauge on the chest
    t.cyl(0.2, 0.08, 0xfafafa, -0.45, 0.4, 0.68, { axis: 'z', seg: 14 });
    t.torus(0.2, 0.03, STEEL, -0.45, 0.4, 0.72, { seg: 14 });
    t.box(0.03, 0.16, 0.02, 0xd32f2f, -0.45, 0.43, 0.73, { rz: -0.6 });
  }
  if (a >= 2) {
    // Extra Snow: snow heaped on the shoulders, icicles off the belt
    for (const s of [-1, 1]) for (const [dx, dz, r] of [[0, 0, 0.42], [0.25, 0.25, 0.3], [-0.2, -0.25, 0.3]]) t.ball(r, SNOW, s * (0.7 + dx), 1.05, dz, { sy: 0.55, seg: 10, rows: 6 });
    for (const x of [-0.7, -0.35, 0.3, 0.75]) icicle(t, x, -0.98, 0.58, 0.35 + Math.abs(x) * 0.2, frost);
  }
  if (a >= 3) for (const x of [-0.25, 0.1]) grenade(t, x, -0.62, 0.68, 0x80deea); // frost grenades
  if (legend) {
    shoulderPads(t, 0x1a237e, 0.62);
    for (const s of [-1, 1]) for (const dz of [-0.25, 0.2]) shard(t, s * 1.5, 1.2, dz, 0.5, 0.1, ice);
  }
  // coolant tanks: one, two at Cooling Tanks, glowing at Absolute Zero
  coolant(t, zero ? frost : 0x90a4ae, ice, { n: b >= 2 ? 2 : 1, r: 0.4, h: 1.35 });
  if (b >= 3) {
    // Glacial Prowess: ice crystals growing on the tanks
    const xs = b >= 2 ? [-0.44, 0.44] : [0];
    for (const x of xs) for (const [dx, hh] of [[-0.12, 0.5], [0.12, 0.35]]) shard(t, x + dx, 0.85, -0.95, hh, 0.09, ice);
  }
  hd.done();
  t.done();
  hands(h, key, a >= 1 ? 0xeceff1 : null, legend ? 0x283593 : 0xb0bec5, a >= 1 ? (k) => k.box(1.1, 0.14, 1.1, 0x90a4ae, 0, -1.5, 0) : null);
  feet(h, key, 0xeceff1, (k) => {
    k.box(1.12, 0.16, 1.12, 0x90a4ae, 0, -1.32, 0.02); // boot cuffs
    if (a >= 3) kneePad(k, legend ? 0x1a237e : 0x546e7a);
  });
  if (zero) {
    // Absolute Zero: a frost ring with snowflake crystals turning round its feet
    const ring = spinner(h, h.root, 0, 0.1, 0);
    const r = wear(h, ring, `${key}:ring`);
    r.torus(2.0, 0.05, frost, 0, 0, 0, { rx: PI / 2, seg: 40 });
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * PI * 2;
      shard(r, Math.sin(ang) * 2.0, 0.02, Math.cos(ang) * 2.0, i % 2 ? 0.35 : 0.6, 0.09, ice);
    }
    r.done();
    h.idleSpin = 0.5;
  }
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const len = a >= 3 ? 2.3 : 2.0;
  const tip = cryoGun(gk, {
    len,
    body: legend ? 0x283593 : a >= 3 ? 0x455a64 : 0x78909c,
    light: ice,
    coils: b >= 1 ? 3 : 2,
    crystal: b >= 3 ? ice : null,
    can: b >= 2,
  });
  if (b >= 1) {
    gk.cyl(0.13, 0.06, 0xfafafa, -0.3, -0.25, UP + 0.12, { axis: 'x', seg: 12 }); // pressure gauge
    gk.box(0.02, 0.12, 0.02, 0xd32f2f, -0.34, -0.23, UP + 0.14, { rx: 0.6 });
  }
  if (a >= 3) {
    // Explosives: a drum of frozen grenades under the barrel and its short launch tube
    gk.cyl(0.3, 0.5, INK, 0, -1.2, UP - 0.42, { seg: 16 });
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * PI * 2;
      gk.ball(0.09, frost, Math.sin(ang) * 0.19, -1.46, UP - 0.42 + Math.cos(ang) * 0.19, { seg: 6, rows: 4 });
    }
    gk.cyl(0.13, 0.55, 0x37474f, 0, -1.72, UP - 0.42, { seg: 12 });
    gk.box(0.1, 0.5, 0.14, INK, 0, -1.2, UP - 0.12);
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tip, UP + 0.02);
  aimLong(h);
  h.tracer = 0x80deea;
  h.tracerWidth = 0.22;
  return own(h);
}

// ------------------------------------------------------------------ Demolitionist

/** A strap of grenades across the chest (torso space; side as in sash). */
function nadeSash(k, side, col, nade) {
  sash(k, col, side, 0.3);
  const rz = side * 0.62;
  for (const s of [-0.7, -0.25, 0.2, 0.65]) grenade(k, -Math.sin(rz) * s, Math.cos(rz) * s, 0.72, nade);
}

/** 40 mm shells on a strap across the chest (torso space; side as in sash). */
function shells40(k, side, strap, tip) {
  const rz = side * 0.62;
  k.box(0.32, 2.5, 1.12, strap, 0, 0, 0, { rz });
  for (let i = 0; i < 5; i++) {
    const s = -0.85 + i * 0.42;
    const x = -Math.sin(rz) * s;
    const y = Math.cos(rz) * s;
    k.cyl(0.13, 0.3, BRASS, x, y, 0.64, { rz: rz + PI / 2, seg: 10 });
    k.ball(0.12, tip, x + Math.cos(rz) * 0.17, y + Math.sin(rz) * 0.17, 0.64, { seg: 8, rows: 6 });
  }
}

/**
 * Demolitionist: a helmeted soldier with a 40 mm grenade launcher; a rocket tube up the Top path
 * and an airstrike radio down the Bottom.
 * Top: 1 Ironsights (a red-dot sight), 2 Big Blasts (a heavy barrel, goggles on the helmet),
 * 3 Artilleryman (a rocket tube and two spare rockets on the back), 4 Bunker Buster (a huge black
 * tube with a fat warhead and an armoured vest).
 * Bottom: 1 Gloves, 2 Strong Shells (a strap of 40 mm shells), 3 Lock and Load (a drum launcher, a
 * radio pack and a headset), 4 Strike Force One (a vest, a glowing beacon on the antenna,
 * binoculars and a red smoke grenade).
 */
export function makeDemolitionist(a, b) {
  const arty = a >= 3;
  const buster = a >= 4;
  const radioOp = b >= 3;
  const sfo = b >= 4;
  const shirt = 0x556b2f;
  const h = makeHumanoid({ skin: 0x8d5524, shirt, pants: 0x3e4a2a, arms: shirt, face: 'soldier' });
  const key = `xdemo${a}${b}`;
  const red = glowMat(h, 0xff1744);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  helmet(hd, arty ? 0x37474f : 0x4b5320, { cover: arty ? 0x263238 : 0x3e4a2a });
  if (a >= 2) goggles(hd, 1.18, 0xffb74d, { r: 0.77 });
  if (radioOp) headset(hd, 0x2b2b2b);
  if (sfo) shades(hd, INK, 0x37474f);
  collar(t, tone(shirt, 0.85));
  pockets(t, tone(shirt, 0.9));
  nadeSash(t, -1, 0x3e2723, 0x33691e);
  belt(t, 0x3e2723, 0x9e9e9e);
  pouch(t, -0.6, -0.95, 0.55, 0.38, 0.36, 0x3e4a2a, 0.2);
  pouch(t, 0.6, -0.95, 0.55, 0.38, 0.36, 0x3e4a2a, 0.2);
  if (b >= 2) shells40(t, 1, 0x4e342e, sfo ? 0xb71c1c : 0x455a64);
  if (buster || sfo) vest(t, buster ? 0x263238 : 0x3e4a2a, { pouches: 3, pouch: buster ? 0x37474f : 0x4b5320 });
  if (buster) shoulderPads(t, 0x263238, 0.6);
  if (arty) {
    // two spare rockets in a frame on the back
    t.box(1.3, 1.5, 0.2, 0x3e2723, 0, -0.1, -0.66, { r: 0.04 });
    t.box(1.4, 0.16, 0.6, INK, 0, -0.85, -0.95, { r: 0.04 });
    for (const x of [-0.32, 0.32]) {
      const r = buster ? 0.24 : 0.19;
      t.cyl(r, 1.3, buster ? 0x37474f : 0x4b5320, x, -0.1, -1.0, { seg: 12 });
      t.cyl(r, 0.5, 0xffab00, x, 0.8, -1.0, { seg: 12, r2: 0.02 });
      t.box(0.03, 0.3, r * 2.6, INK, x, -0.6, -1.0);
    }
    t.box(1.4, 0.12, 0.12, INK, 0, 0.3, -1.25);
    for (const s of [-1, 1]) {
      t.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
      t.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
    }
  }
  if (radioOp) {
    // Lock and Load: a big airstrike radio pack, its handset on a curly cord
    t.box(1.4, 1.55, 0.62, 0x33691e, 0, 0.05, -0.85, { r: 0.08 });
    t.box(1.2, 0.5, 0.06, INK, 0, 0.35, -1.17, { r: 0.02 });
    for (let i = 0; i < 4; i++) t.cyl(0.06, 0.08, i % 2 ? 0xffd54f : STEEL, -0.4 + i * 0.27, 0.35, -1.21, { axis: 'z', seg: 8 });
    t.box(0.9, 0.3, 0.1, 0x263238, 0, -0.35, -1.17, { r: 0.03 });
    t.cyl(0.03, 2.2, INK, 0.5, 1.9, -0.85, { seg: 6, r2: 0.015 }); // whip antenna
    t.ball(0.09, sfo ? red : INK, 0.5, 3.02, -0.85, { seg: 8, rows: 6 }); // beacon
    if (sfo) t.cyl(0.14, 0.06, red, 0.5, 2.9, -0.85, { seg: 10 });
    t.box(0.2, 0.4, 0.14, INK, -0.55, 0.55, 0.66, { r: 0.04 }); // handset
    t.tube([[-0.55, 0.35, 0.66], [-1.0, 0.0, 0.3], [-0.6, 0.2, -0.6]], 0.03, INK, { seg: 10, sides: 4 });
    for (const s of [-1, 1]) {
      t.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
      t.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
    }
  }
  if (sfo) {
    // binoculars on the chest and a red smoke grenade for marking the strike
    for (const s of [-1, 1]) t.cyl(0.13, 0.4, 0x263238, s * 0.16, 0.55, 0.78, { seg: 12 });
    t.box(0.14, 0.2, 0.1, INK, 0, 0.55, 0.78);
    t.cyl(0.13, 0.36, 0xb71c1c, 0.75, -0.55, 0.72, { seg: 12 });
    t.cyl(0.08, 0.08, STEEL, 0.75, -0.33, 0.72, { seg: 8 });
    t.box(0.4, 0.26, 0.04, 0xfafafa, -0.45, 0.62, 0.79); // Strike Force patch
    t.box(0.2, 0.1, 0.02, 0xb71c1c, -0.45, 0.62, 0.81);
  }
  hd.done();
  t.done();
  hands(h, key, b >= 1 ? 0x3e2723 : null, tone(shirt, 0.8));
  feet(h, key, 0x263238, a >= 2 || b >= 2 ? kneePad : null);
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  let y;
  let z;
  if (arty) {
    [y, z] = tubeLauncher(gk, {
      r: buster ? 0.46 : 0.36, len: buster ? 3.1 : 2.7, back: 0.8,
      col: buster ? 0x212121 : 0x4b5320, venturi: true, scope: red, grip: true,
      warhead: buster ? 0x37474f : 0xffab00, fat: buster,
    });
    if (buster) for (const yy of [-1.2, -1.9]) gk.cyl(0.5, 0.12, 0xffab00, 0, yy, z, { seg: 18 }); // yellow danger bands
  } else {
    [y, z] = launcher(gk, { drum: radioOp, heavy: a >= 2 });
    if (a >= 1) {
      // Ironsights: a red-dot sight on top
      gk.box(0.2, 0.4, 0.24, INK, 0, -0.45, z + 0.42, { r: 0.04 });
      gk.cyl(0.08, 0.03, red, 0, -0.66, z + 0.45, { seg: 10 });
      gk.box(0.12, 0.3, 0.12, INK, 0, -0.45, z + 0.27);
    }
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.projectile = 'grenade';
  h.tracer = 0xffab40;
  return own(h);
}

// ------------------------------------------------------------------ Sniper

/**
 * Sniper: a quiet marksman in a dark beanie and vest with a bolt-action rifle.
 * Top: 1 Big Bullets (a bandolier of big rounds and rounds on the stock), 2 Heavy Calibre (a
 * longer barrel with a muzzle brake), 3 Fatal Precision (a red laser sight and a rangefinder on
 * the head), 4 Heavy Impact (a huge black anti-materiel rifle, a balaclava and a crate of rounds).
 * Bottom: 1 Night Vision (green night-vision goggles), 2 Faster Firing (a box magazine), 3 Semi
 * Auto (a long magazine, a rail and a spare mag pouch on the leg), 4 Straight Bolt Pull (a
 * straight-pull bolt, a headset and a suppressor shroud).
 */
export function makeSniperX(a, b) {
  const heavy = a >= 4;
  const shirt = 0x37474f;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: 0x263238, arms: shirt, face: 'soldier' });
  const key = `xsniper${a}${b}`;
  const laser = glowMat(h, 0xff1744);
  const nv = glowMat(h, 0x76ff03);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (heavy) balaclava(hd, 0x1a1a1a);
  else hair(hd, 0x2b1d0e, { h: 0.4 });
  beanie(hd, heavy ? 0x111111 : 0x263238, 0.55);
  if (b >= 1) nvg(hd, nv);
  if (b >= 4) headset(hd, 0x222222);
  if (a >= 3) {
    // a laser rangefinder over the left eye
    hd.box(0.26, 0.24, 0.3, INK, 0.3, 0.74, 0.72, { r: 0.04 });
    hd.cyl(0.08, 0.03, laser, 0.3, 0.74, 0.88, { axis: 'z', seg: 10 });
    hd.box(0.08, 0.08, 0.5, INK, 0.62, 0.85, 0.42);
  }
  collar(t, tone(shirt, 0.82));
  vest(t, heavy ? 0x263238 : 0x455a64, { pouches: b >= 2 ? 4 : 3, pouch: heavy ? 0x212121 : 0x37474f });
  belt(t, 0x1c1c1c, 0x9e9e9e);
  if (a >= 1) bandolier(t, 1, 0x3e2723);
  if (b >= 4) radio(t, 0.75, 0.55, -0.7, 0x263238, 1.4);
  if (heavy) shoulderPads(t, 0x263238, 0.55);
  hd.done();
  t.done();
  hands(h, key, 0x1a1a1a, tone(shirt, 0.8));
  feet(h, key, 0x111111, (k) => {
    if (b >= 2) kneePad(k, 0x263238);
    if (b >= 3) pouch(k, 0, -0.55, 0.5, 0.42, 0.5, 0x37474f, 0.16); // thigh mag pouch
  });
  if (a >= 2) {
    // a crate of big rounds by its feet
    const r = wear(h, h.root, `${key}:root`);
    const x = -1.9;
    r.box(0.7, 0.55, 1.0, heavy ? 0x263238 : 0x4b5320, x, 0.28, 0.6, { r: 0.04 });
    r.box(0.74, 0.1, 1.04, INK, x, 0.55, 0.6, { r: 0.02 });
    r.box(0.04, 0.16, 0.5, 0xffd54f, x + 0.36, 0.3, 0.6);
    if (heavy) for (let i = 0; i < 4; i++) r.cyl(0.07, 0.5, BRASS, x - 0.2 + (i % 2) * 0.4, 0.82, 0.35 + Math.floor(i / 2) * 0.5, { seg: 8 });
    r.done();
  }
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const len = heavy ? 3.3 : a >= 2 ? 3.0 : 2.75;
  const [y, z] = boltRifle(gk, {
    len,
    wood: heavy ? 0x1c1c1c : a >= 2 ? 0x37474f : 0x3e2723,
    metal: heavy ? 0x15171a : GUNMETAL,
    scope: a >= 2 ? 1.3 : 1.1,
    lens: a >= 3 ? 0xff5252 : 0x4fc3f7,
    brake: a >= 2 && b < 4,
    can: b >= 4,
    bipod: a >= 2 || b >= 3,
  });
  if (a >= 1) for (let i = 0; i < 3; i++) gk.cyl(0.06, 0.34, BRASS, 0.18, 0.4 + i * 0.13, UP + 0.05, { axis: 'z', seg: 8 }); // spare big rounds on the stock
  if (heavy) {
    gk.cyl(0.11, len - 1.4, 0x15171a, 0, -0.9 - (len - 1.4) / 2, z, { seg: 12 }); // heavy barrel
    if (b < 4) {
      gk.box(0.32, 0.36, 0.28, INK, 0, -len + 0.18, z, { r: 0.03 }); // big muzzle brake
      for (const s of [-1, 1]) for (const yy of [-0.08, 0.08]) gk.box(0.04, 0.08, 0.16, 0x050505, s * 0.16, -len + 0.18 + yy, z);
    }
  }
  if (a >= 3) {
    // Fatal Precision: a laser sight under the barrel and its red beam
    gk.box(0.16, 0.36, 0.16, INK, 0, -1.55, z - 0.22, { r: 0.03 });
    gk.cyl(0.05, 0.03, laser, 0, -1.74, z - 0.22, { seg: 8 });
    gk.cyl(0.012, 2.4, laser, 0, -1.74 - 1.2, z - 0.22, { seg: 4 });
  }
  if (b >= 2) {
    // Faster Firing: a box magazine (a long one at Semi Auto)
    const ml = b >= 3 ? 0.75 : 0.5;
    gk.box(0.2, 0.32, ml, INK, 0, -0.35, UP - 0.3 - ml / 2, { r: 0.03, rx: 0.12 });
  }
  if (b >= 3) {
    gk.box(0.14, 1.0, 0.06, INK, 0, -0.45, z + 0.2); // rail
    gk.box(0.06, 0.12, 0.08, STEEL, -0.17, -0.1, z); // charging handle
  }
  if (b >= 4) {
    // Straight Bolt Pull: a straight-back bolt with a big knob
    gk.box(0.06, 0.4, 0.08, STEEL, 0.17, 0.15, z);
    gk.ball(0.09, STEEL, 0.2, 0.36, z, { seg: 8, rows: 6 });
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = a >= 3 ? 0xff5252 : 0xffecb3;
  h.tracerWidth = heavy ? 0.25 : undefined;
  return own(h);
}

export const CROSS = {
  scoutSlinger: makeSlinger,
  archerCrossbower: makeCrossbower,
  shotgunnerGunslinger: makeGunslinger,
  frostFreezerX: makeFreezerX,
  grenadierDemolitionist: makeDemolitionist,
  sniperX: makeSniperX,
};
