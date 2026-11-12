// Tower models: people, batch 16 (dressed with the vehicle kit in ../vehicles.js).
// In here: Hallow Punk, Harvester, Snowballer (Frost), Elementalist, Firework Technician,
// Biologist, Warlock (all event towers).
// MODELS at the bottom is laid over TOWER_MODELS in ../models.js, so these builders win.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.
// Helpers here: cloak (a cape from the shoulders), wings (bat / ember wings on the back), crow,
// bladeOf (a straight sword along -y), crescent (a curved blade), flowerPot, flask.
// Elementalist keeps h.modeGlow / h.modeTracer (views.js recolours them to fire or frost);
// Warlock's orbs, Elementalist's crystal halo and the Harvester's Lv 6 wisp ring turn
// (spinner + h.idleSpin).

import * as THREE from 'three';
import { glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import {
  GOLD, INK, STEEL, UP, WOOD, aimLong, band, belt, collar, dome, fist, goggles, hair, helmet, muzzle,
  own, pouch, sash, wear,
} from './people1.js';
import { shoulderPads } from './people2.js';
import { beanie } from './people3.js';
import { feet, glassMat, hands, hood } from './people5.js';
import { hardHat, neckScarf, throwPose } from './people6.js';
import { firework, pumpkin } from './people12.js';
import { crystal, spinner } from './machines5.js';

const PI = Math.PI;
const BONE = 0xe8e4d0;
const STRAW = 0xe1c16e;
const SNOW = 0xf5f7fa;
const TERRA = 0xb5653a;
const LEAF = 0x43a047;
const FIREWORK = [0xff1744, 0xffea00, 0x2979ff, 0x00e676, 0xd500f9];

// ------------------------------------------------------------------ shared bits for this batch

/** A cape from the shoulders down the back (torso space). o.lining, o.torn (a jagged hem), o.clasp. */
function cloak(k, col, len, o = {}) {
  const top = 1.0;
  k.slab(2.1, len, 0.08, col, 0, top - len / 2, -0.66, { bw: 1.25, bz: -0.25 });
  k.slab(2.0, len - 0.12, 0.04, o.lining ?? tone(col, 0.6), 0, top - len / 2 + 0.04, -0.6, { bw: 1.25, bz: -0.25 });
  k.box(2.2, 0.26, 0.3, tone(col, 0.85), 0, top - 0.02, -0.55, { r: 0.08 }); // rolled top
  const hem = top - len;
  if (o.torn) {
    for (let i = 0; i < 6; i++) {
      const x = -1.1 + i * 0.44;
      k.cyl(0.22, 0.45 + (i % 2) * 0.2, col, x, hem - 0.2 - (i % 2) * 0.1, -0.9, { seg: 3, r2: 0.01, rx: PI, sz: 0.25 });
    }
  }
  for (const s of [-1, 1]) {
    k.cyl(0.13, 0.08, o.clasp ?? GOLD, s * 0.8, 0.92, 0.53, { axis: 'z', seg: 10 });
    k.box(0.1, 0.24, 0.6, tone(col, 0.85), s * 1.0, 0.92, 0.2); // over the shoulder
  }
  k.tube([[-0.8, 0.9, 0.58], [0, 0.75, 0.62], [0.8, 0.9, 0.58]], 0.03, o.clasp ?? GOLD, { seg: 10, sides: 4 });
}

/**
 * Bat wings on the back (torso space): a membrane per side swept back, with bone struts along
 * the top and the fingers. `skin` the membrane, `bone` the struts (colours or glow materials).
 */
function wings(k, skin, bone, o = {}) {
  const sc = o.size ?? 1;
  const y0 = o.y ?? 0.45;
  const z0 = -0.72;
  const d = 0.4;
  const pts = [[0, 0], [0.4, 0.6], [1.3, 1.35], [2.2, 1.55], [2.7, 1.2], [2.35, 0.75], [2.25, 0.15], [1.85, 0.45], [1.6, -0.25], [1.25, 0.15], [0.9, -0.55], [0.55, -0.2]];
  for (const s of [-1, 1]) {
    const P = ([a, b]) => [s * 0.3 + s * a * sc * Math.cos(d), y0 + b * sc, z0 - a * sc * Math.sin(d)];
    k.prism(pts.map(([a, b]) => [s * a * sc, b * sc]), 0.05, skin, s * 0.3, y0, z0, { ry: PI / 2 + s * d });
    k.tube([[0, 0], [0.4, 0.62], [1.3, 1.38], [2.2, 1.58], [2.7, 1.22]].map(P), 0.06, bone, { seg: 16, sides: 5 });
    for (const f of [[2.35, 0.75], [2.25, 0.15], [1.6, -0.25], [0.9, -0.55]]) k.tube([[1.3, 1.38], f].map(P), 0.035, bone, { seg: 4, sides: 4, tension: 0 });
    const tip = P([2.72, 1.24]);
    k.cyl(0.07, 0.25, bone, tip[0], tip[1] + 0.1, tip[2], { seg: 5, r2: 0.005 }); // claw
  }
}

/** A crow standing on (x, y, z), s big, facing +z turned by ry (any space). */
function crow(k, x, y, z, s, ry = 0, col = 0x161616, eye = 0xffb300) {
  const R = (dx, dy, dz) => [x + dx * Math.cos(ry) + dz * Math.sin(ry), y + dy, z - dx * Math.sin(ry) + dz * Math.cos(ry)];
  k.ball(0.24 * s, col, ...R(0, 0.3 * s, 0), { sy: 0.85, sz: 1.35, ry, seg: 10, rows: 7 }); // body
  k.ball(0.16 * s, col, ...R(0, 0.55 * s, 0.24 * s), { seg: 10, rows: 7 }); // head
  k.cyl(0.07 * s, 0.22 * s, 0x3a3a3a, ...R(0, 0.53 * s, 0.44 * s), { axis: 'z', seg: 6, r2: 0.005, ry }); // beak
  for (const sx of [-1, 1]) {
    k.ball(0.035 * s, eye, ...R(sx * 0.1 * s, 0.6 * s, 0.34 * s), { seg: 6, rows: 4 });
    k.box(0.06 * s, 0.22 * s, 0.5 * s, tone(col, 1.4), ...R(sx * 0.22 * s, 0.33 * s, -0.04 * s), { ry: ry + sx * 0.1, rz: sx * 0.2 }); // wing
    k.cyl(0.02 * s, 0.25 * s, 0x5d4037, ...R(sx * 0.08 * s, 0.1 * s, 0), { seg: 4 }); // leg
  }
  k.box(0.2 * s, 0.05 * s, 0.4 * s, col, ...R(0, 0.25 * s, -0.42 * s), { ry, rx: -0.3 }); // tail
}

/** A straight sword on the fist pointing along -y (any space): grip, pommel, guard, a blade with a fuller. Returns the tip y. */
function bladeOf(k, len, w, steel, fuller, o = {}) {
  const guard = o.guard ?? STEEL;
  k.cyl(0.08, 0.5, o.grip ?? 0x4e342e, 0, 0.05, 0, { seg: 8 });
  for (let i = 0; i < 3; i++) k.torus(0.085, 0.02, tone(o.grip ?? 0x4e342e, 0.7), 0, -0.12 + i * 0.15, 0, { rx: PI / 2, seg: 8 });
  k.ball(0.13, guard, 0, 0.36, 0, { seg: 8, rows: 6 }); // pommel
  const gw = o.gw ?? 0.9;
  k.box(gw, 0.12, 0.2, guard, 0, -0.24, 0, { r: 0.04 }); // crossguard
  for (const s of [-1, 1]) k.cyl(0.08, 0.16, guard, s * gw / 2, -0.2, 0, { seg: 6, r2: 0.03, rz: s * 0.5 });
  const y0 = -0.3;
  k.prism([[-w / 2, 0], [w / 2, 0], [w / 2, -len + w], [0, -len], [-w / 2, -len + w]], 0.07, steel, 0, y0, 0, { ry: PI / 2 });
  k.box(Math.max(0.05, w * 0.18), len - w - 0.1, 0.09, fuller, 0, y0 - (len - w) / 2 - 0.05, 0);
  return y0 - len;
}

/**
 * A curved blade (sickle / scythe) in the y-z plane: from (y, z) it sweeps along +z, bending down
 * toward -y by `bend`, `w` wide at the root and sharp at the tip.
 */
function crescent(k, y, z, len, bend, w, col, x = 0, thick = 0.06) {
  const n = 8;
  const out = [];
  const inn = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const cz = len * t;
    const cy = -bend * t * t;
    const hw = (w / 2) * (1 - t * 0.92);
    out.push([cz, cy + hw]);
    inn.push([cz, cy - hw * 0.6]);
  }
  k.prism([...out, ...inn.reverse()], thick, col, x, y, z);
}

/** A clay flower pot standing on the ground at (x, z) (root space), with what grows in it. */
function flowerPot(k, x, z, kind, mats) {
  k.cyl(0.32, 0.55, TERRA, x, 0.28, z, { seg: 14, r2: 0.42 });
  k.torus(0.42, 0.06, tone(TERRA, 1.1), x, 0.56, z, { rx: PI / 2, seg: 16 });
  k.cyl(0.38, 0.04, 0x4e342e, x, 0.55, z, { seg: 14 }); // soil
  const stem = 0x388e3c;
  if (kind === 'sun') {
    k.tube([[x, 0.55, z], [x + 0.06, 1.1, z + 0.05], [x, 1.6, z + 0.1]], 0.045, stem, { seg: 10, sides: 5 });
    for (const s of [-1, 1]) k.ball(0.18, LEAF, x + s * 0.2, 1.0, z + 0.05, { sx: 1.5, sy: 0.25, seg: 8, rows: 5, rz: s * 0.4 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2;
      k.ball(0.13, 0xffd600, x + Math.cos(a) * 0.32, 1.72 + Math.sin(a) * 0.32, z + 0.14, { sx: 1.8, sy: 0.7, sz: 0.3, rz: a, seg: 8, rows: 5 });
    }
    k.cyl(0.2, 0.1, 0x5d4037, x, 1.72, z + 0.18, { axis: 'z', seg: 14 });
  } else if (kind === 'ivy') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      const tip = [x + Math.cos(a) * 0.45, 0.9 + (i % 2) * 0.35, z + Math.sin(a) * 0.45];
      k.tube([[x, 0.55, z], [x + Math.cos(a) * 0.2, 0.95, z + Math.sin(a) * 0.2], tip], 0.035, stem, { seg: 8, sides: 4 });
      k.ball(0.11, mats.ivy, ...tip, { seg: 8, rows: 5, sy: 0.5 });
    }
    k.ball(0.18, mats.ivy, x, 1.15, z, { seg: 10, rows: 7 });
  } else {
    // nightshade: drooping purple bells that glow
    k.tube([[x, 0.55, z], [x, 1.3, z], [x + 0.2, 1.5, z]], 0.04, 0x2e5d32, { seg: 8, sides: 4 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2 + 0.4;
      const bx = x + Math.cos(a) * 0.3;
      const bz = z + Math.sin(a) * 0.3;
      k.tube([[x, 1.25, z], [bx, 1.4, bz]], 0.025, 0x2e5d32, { seg: 4, sides: 4 });
      k.cyl(0.12, 0.2, mats.night, bx, 1.28, bz, { seg: 8, r2: 0.03 });
    }
    for (const s of [-1, 1]) k.ball(0.16, 0x2e5d32, x + s * 0.2, 0.9, z, { sx: 1.5, sy: 0.25, seg: 8, rows: 5, rz: s * 0.4 });
  }
}

/** A round-bottom flask held by the neck, its body along -y (fist space). Returns the far end y. */
function flask(k, r, juice, glass) {
  k.cyl(0.13, 0.22, 0x8d6e63, 0, 0.15, 0, { seg: 10, r2: 0.15 }); // cork
  k.cyl(0.11, 0.45, glass, 0, -0.15, 0, { seg: 10 });
  k.torus(0.12, 0.03, glass, 0, 0.05, 0, { rx: PI / 2, seg: 10 }); // lip
  k.cyl(r, r * 1.3, glass, 0, -0.38 - r * 0.65, 0, { seg: 16, r2: 0.13 }); // cone
  k.cyl(r * 0.82, r * 0.9, juice, 0, -0.4 - r * 0.85, 0, { seg: 14, r2: 0.12 });
  k.cyl(r * 1.02, 0.06, glass, 0, -0.38 - r * 1.3, 0, { seg: 16 });
  for (let i = 0; i < 3; i++) k.ball(0.04 + i * 0.015, juice, (i - 1) * 0.08, -0.5 - i * 0.12, 0.05, { seg: 6, rows: 4 }); // bubbles
  return -0.42 - r * 1.3;
}

// ------------------------------------------------------------------ Hallow Punk

/**
 * Hallow Punk (Hallowboomer form): a punk in a studded leather jacket with pumpkin launchers on
 * the shoulders. Lv 1 an orange flame mohawk, Lv 2 Bewitching Blaze: a witch hat with a purple
 * fire band and spiked shoulder pads, Lv 3 Vengeful Missiles: a pink mohawk, chains and a
 * launcher on each shoulder, Lv 4 Queen of the Blood Ember: a crown, a red cape, ember wings and
 * skull launchers.
 */
export function makeHallowPunk(level) {
  const queen = level >= 3;
  const jacket = queen ? 0x3e0000 : 0x1c1c1c;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: queen ? 0x5d0000 : 0x37474f, pants: queen ? 0x4a0000 : 0x263238, arms: jacket });
  const key = `p16punk${level}`;
  const fireC = [0xff6d00, 0xb388ff, 0xd500f9, 0xff1744][level];
  const fire = glowMat(h, fireC);
  const stud = 0xcfd8dc;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // head: short dark hair, ear rings, and a flame mohawk (a witch hat at Lv 2)
  hair(hd, 0x1a1209, { h: 0.44 });
  for (const s of [-1, 1]) hd.torus(0.07, 0.02, stud, s * 0.64, 0.45, 0.05, { ry: PI / 2, seg: 8 });
  if (level !== 1) {
    hd.box(0.22, 0.12, 1.2, 0x1a1209, 0, 1.33, -0.05, { r: 0.05 });
    const n = 6;
    for (let i = 0; i < n; i++) {
      const z = 0.5 - i * 0.22;
      const len = (queen ? 0.4 : 0.55) + Math.sin((i / (n - 1)) * PI) * 0.3 + level * 0.05;
      hd.cyl(0.15, len, fire, 0, 1.35 + len / 2, z - len * 0.15, { seg: 6, r2: 0.01, sx: 0.45, rx: -0.3 });
    }
  } else {
    hd.cyl(1.05, 0.06, 0x212121, 0, 1.12, 0, { seg: 24 }); // brim
    hd.cyl(0.66, 0.85, 0x212121, 0, 1.55, 0, { seg: 18, r2: 0.38 });
    hd.cyl(0.4, 0.8, 0x212121, 0.15, 2.25, -0.12, { seg: 14, r2: 0.02, rz: -0.55, rx: -0.2 }); // bent tip
    hd.cyl(0.67, 0.16, fire, 0, 1.22, 0, { seg: 18, r2: 0.63 }); // flame band
    hd.box(0.22, 0.2, 0.06, GOLD, 0, 1.22, 0.66, { r: 0.02 }); // buckle
    for (let i = 0; i < 5; i++) {
      const a = -0.9 + i * 0.45;
      hd.cyl(0.07, 0.3, fire, Math.sin(a) * 0.66, 1.42, Math.cos(a) * 0.66, { seg: 5, r2: 0.005 }); // flickers
    }
  }
  if (queen) {
    // a gold crown with points and a blood gem
    hd.torus(0.7, 0.07, GOLD, 0, 1.12, 0, { rx: PI / 2, seg: 22 });
    hd.cyl(0.7, 0.2, GOLD, 0, 1.22, 0, { seg: 22, open: true });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      hd.cyl(0.09, 0.35 + (i % 2) * 0.15, GOLD, Math.sin(a) * 0.7, 1.45 + (i % 2) * 0.07, Math.cos(a) * 0.7, { seg: 4, r2: 0.005 });
    }
    hd.ball(0.13, fire, 0, 1.24, 0.74, { seg: 8, rows: 6 });
  }
  // a band shirt with a jack-o'-lantern print under an open leather jacket
  t.box(0.62, 0.55, 0.03, 0xef6c00, 0, 0.15, 0.51, { r: 0.08 });
  for (const s of [-1, 1]) t.cyl(0.07, 0.03, INK, s * 0.14, 0.24, 0.53, { axis: 'z', seg: 3 });
  t.box(0.36, 0.07, 0.03, INK, 0, 0.02, 0.53);
  for (const s of [-1, 1]) {
    t.box(0.58, 2.02, 0.1, jacket, s * 0.73, 0, 0.53, { r: 0.03 });
    t.box(0.08, 2.0, 0.04, 0x9e9e9e, s * 0.42, 0, 0.59); // zip
    t.box(0.32, 0.8, 0.06, tone(jacket, 1.5), s * 0.5, 0.58, 0.6, { rz: s * 0.35 }); // lapel
    for (let i = 0; i < 3; i++) t.ball(0.045, stud, s * (0.48 + i * 0.07), 0.82 - i * 0.2, 0.64, { seg: 6, rows: 4 });
    t.box(0.1, 2.0, 1.08, jacket, s * 1.02, 0, 0);
    t.box(0.42, 0.06, 0.04, tone(jacket, 1.5), s * 0.72, -0.35, 0.59); // pocket zip
  }
  t.box(2.08, 2.04, 0.1, jacket, 0, 0, -0.53);
  for (let i = 0; i < 5; i++) t.ball(0.05, stud, -0.6 + i * 0.3, 0.6, -0.6, { seg: 6, rows: 4 }); // studs across the back
  t.box(2.1, 0.2, 1.12, tone(jacket, 0.8), 0, -0.92, 0); // hem band
  belt(t, 0x111111, stud, -0.78);
  for (let i = 0; i < 7; i++) {
    const u = i / 6;
    t.torus(0.07, 0.022, stud, 0.35 + u * 0.7, -0.95 - Math.sin(u * PI) * 0.3, 0.62, { seg: 8, ry: i % 2 ? PI / 2 : 0 }); // wallet chain
  }
  if (level >= 1) {
    // spiked shoulder pads
    shoulderPads(t, 0x2b2b2b, 0.62);
    for (const s of [-1, 1]) for (const [dx, z] of [[-0.2, -0.3], [0.1, 0], [-0.2, 0.3]]) {
      t.cyl(0.1, 0.45, stud, s * (1.45 + dx), 1.32, z, { seg: 6, r2: 0.005, rz: -s * 0.25 });
    }
  }
  if (level >= 2) {
    // chains across the chest
    for (let i = 0; i < 11; i++) {
      const u = i / 10;
      t.torus(0.08, 0.025, 0x9e9e9e, -0.95 + u * 1.9, 0.85 - u * 1.5, 0.62, { seg: 8, rz: -0.67, ry: i % 2 ? PI / 2 : 0 });
    }
  }
  if (queen) {
    cloak(t, 0x8b0000, 3.9, { lining: 0x1a0000, torn: true });
    wings(t, fire, 0x2b0000, { size: 0.95, y: 0.55 });
    // a corset front laced in gold
    t.box(0.7, 1.2, 0.05, 0x7f0000, 0, -0.25, 0.52, { r: 0.05 });
    for (let i = 0; i < 4; i++) t.box(0.5, 0.04, 0.03, GOLD, 0, 0.2 - i * 0.28, 0.56, { rz: i % 2 ? 0.3 : -0.3 });
  }
  hd.done();
  t.done();
  hands(h, key, 0x111111, tone(jacket, 0.8), (a) => {
    a.box(1.1, 0.24, 1.1, 0x111111, 0, -1.4, 0, { r: 0.04 }); // spiked wrist band
    for (const z of [-0.3, 0.3]) a.cyl(0.06, 0.2, stud, 0, -1.4, z + Math.sign(z) * 0.62, { axis: 'z', seg: 5, r2: 0.005, rx: z < 0 ? PI : 0 });
  });
  feet(h, key, 0x111111, (b) => {
    for (const y of [-1.5, -1.68]) b.box(1.1, 0.07, 1.12, stud, 0, y, 0.02); // buckles
    b.box(1.12, 0.2, 1.24, 0x222222, 0, -1.92, 0.06, { r: 0.04 }); // thick soles
  });
  // the shoulder launchers (a second one from Lv 3): each rides on a shoulder mount and the
  // hand under it holds its pistol grip
  const len = 2.2 + level * 0.3;
  const r = 0.36 + level * 0.04;
  const Y = 5.15;
  const front = 2.1 + level * 0.1;
  const zc = front - len / 2;
  h.muzzles = [];
  for (const x of level >= 2 ? [-1.5, 1.5] : [-1.5]) {
    const g = new THREE.Group();
    g.position.set(x, Y, 0);
    h.body.add(g);
    const k = wear(h, g, `${key}:tube`);
    const tube = queen ? 0x1a1a1a : 0x37474f;
    k.cyl(r, len, tube, 0, 0, zc, { axis: 'z', seg: 16 });
    k.cyl(r * 1.25, 0.4, INK, 0, 0, zc - len / 2 - 0.15, { axis: 'z', seg: 16, r2: r * 0.95 }); // venturi
    for (const z of [zc - len * 0.3, zc + len * 0.05, zc + len * 0.4]) k.torus(r + 0.02, 0.045, level >= 2 ? fire : tone(tube, 1.4), 0, 0, z, { seg: 16 });
    k.box(0.36, 0.85, 0.5, tone(tube, 0.8), 0, -r - 0.38, 0.05, { r: 0.06 }); // shoulder mount
    k.box(0.5, 0.12, 0.7, INK, 0, -r - 0.02, 0.05);
    k.box(0.2, 0.55, 0.26, INK, 0, -r - 0.22, 1.75, { r: 0.05, rx: 0.15 }); // pistol grip
    k.torus(0.13, 0.025, INK, 0, -r - 0.12, 1.5, { ry: PI / 2, seg: 10, arc: PI, rx: PI }); // trigger guard
    k.box(0.06, 0.3, 0.2, INK, x < 0 ? 0.3 : -0.3, r * 0.5, zc + len * 0.2); // sight
    k.cyl(0.06, 0.04, fire, x < 0 ? 0.36 : -0.36, r * 0.5 + 0.08, zc + len * 0.2, { axis: 'x', seg: 8 });
    k.box(0.12, 0.08, 0.6, INK, 0, r + 0.02, zc); // top rail
    const pr = 0.5 + level * 0.06;
    const zf = front + pr * 0.65;
    if (queen) {
      // a skull on the muzzle with burning eyes
      k.ball(pr, BONE, 0, 0.05, zf, { seg: 14, rows: 10, sy: 0.95 });
      k.box(pr * 1.1, pr * 0.45, pr * 0.8, BONE, 0, -pr * 0.6, zf + pr * 0.2, { r: 0.08 }); // jaw
      for (const s of [-1, 1]) k.cyl(pr * 0.24, 0.1, fire, s * pr * 0.38, pr * 0.15, zf + pr * 0.88, { axis: 'z', seg: 10 });
      k.cyl(pr * 0.1, 0.1, INK, 0, -pr * 0.2, zf + pr * 0.94, { axis: 'z', seg: 3 });
      for (let i = 0; i < 5; i++) k.box(pr * 0.14, pr * 0.16, 0.06, 0xd7ccc8, (i - 2) * pr * 0.2, -pr * 0.45, zf + pr * 0.62);
    } else pumpkin(k, 0, 0, zf, pr, fire, { vine: false });
    k.done();
    if (x < 0) muzzle(h, g, 0, zf + pr);
  }
  const two = level >= 2;
  h.rightArm.rotation.set(-1.75, 0, 0.02);
  h.leftArm.rotation.set(two ? -1.75 : -1.2, 0, two ? -0.02 : -0.3);
  h.pose = { right: -1.75, left: two ? -1.75 : -1.2, leftRecoil: 0 };
  h.flight = { color: fireC, size: 0.7 + level * 0.15, arc: 0.8, glowing: true };
  h.tracer = fireC;
  return own(h, 0);
}

// ------------------------------------------------------------------ Harvester

/**
 * Harvester (event): a scarecrow with a burlap sack head and a staff topped by a glowing orb.
 * Lv 1 a straw hat, plaid shirt and rope belt, Lv 2 thorny vines, a thorny staff and a crow on
 * the hat, Lv 3 a taller pointed hat and a basket of lit pumpkins, Lv 4 green eyes and a sickle
 * on the staff, Lv 5 Cold-Hearted: frosty blue, icicles and a tattered cloak, Lv 6 a giant
 * reaper scythe, a lantern, a raven on the shoulder and a ring of cold wisps.
 */
export function makeHarvester(level) {
  const cold = level >= 4;
  const reaper = level >= 5;
  const shirt = cold ? 0x37474f : 0x8d3b2a;
  const h = makeHumanoid({ skin: 0xd7b377, shirt, pants: cold ? 0x263238 : 0x3e5a7a, arms: shirt, face: 'skull' });
  const key = `p16harvester${level}`;
  const eyeC = [0xff9100, 0xff9100, 0xff9100, 0x76ff03, 0x80d8ff, 0x00e5ff][level];
  const eye = glowMat(h, eyeC);
  const ice = glowMat(h, 0xe1f5fe);
  const straw = cold ? 0xb0bec5 : STRAW;
  const sack = cold ? 0x90a4ae : 0xc8a165;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // a burlap sack over the head, tied at the neck, with cut eyes and a stitched grin
  hd.cyl(0.69, 1.0, sack, 0, 0.5, 0, { seg: 18 });
  dome(hd, 0.69, 0.42, sack, 0, 1.0, 0);
  for (const y of [0.25, 0.55, 0.85]) hd.torus(0.69, 0.012, tone(sack, 0.8), 0, y, 0, { rx: PI / 2, seg: 18 }); // weave
  hd.torus(0.66, 0.06, 0x8d6e63, 0, 0.06, 0, { rx: PI / 2, seg: 18 }); // rope
  hd.cyl(0.6, 0.3, sack, 0, -0.12, 0, { seg: 14, r2: 0.68 }); // frayed flare under the rope
  const es = level >= 3 ? 0.17 : 0.13;
  for (const s of [-1, 1]) {
    hd.cyl(es + 0.04, 0.05, INK, s * 0.27, 0.72, 0.66, { axis: 'z', seg: 10, rz: s * 0.2 });
    hd.cyl(es, 0.06, eye, s * 0.27, 0.72, 0.69, { axis: 'z', seg: 10 });
  }
  hd.box(0.8, 0.05, 0.04, 0x3e2723, 0, 0.35, 0.69, { rz: 0.04 });
  for (let i = 0; i < 6; i++) hd.box(0.03, 0.16, 0.04, 0x3e2723, -0.33 + i * 0.13, 0.35, 0.7); // stitches
  // a straw hat (taller and pointed from Lv 3)
  const brim = level >= 1 ? 1.35 : 1.15;
  hd.cyl(brim, 0.06, straw, 0, 1.22, 0, { seg: 24 });
  hd.torus(brim, 0.04, tone(straw, 0.8), 0, 1.22, 0, { rx: PI / 2, seg: 24 });
  if (level >= 2) {
    hd.cyl(0.66, 0.7, straw, 0, 1.6, 0, { seg: 16, r2: 0.36 });
    hd.cyl(0.36, 0.75, straw, 0.18, 2.2, -0.05, { seg: 12, r2: 0.02, rz: -0.6 });
  } else {
    hd.cyl(0.64, 0.5, straw, 0, 1.48, 0, { seg: 16, r2: 0.56 });
    dome(hd, 0.56, 0.12, straw, 0, 1.72, 0);
  }
  hd.cyl(0.665, 0.14, cold ? 0x37474f : 0x6d1b10, 0, 1.33, 0, { seg: 16, r2: 0.64 }); // hat band
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2 + 0.2;
    hd.cyl(0.03, 0.3, straw, Math.sin(a) * (brim + 0.05), 1.2, Math.cos(a) * (brim + 0.05), { seg: 4, r2: 0.005, rx: Math.cos(a) * 1.3, rz: -Math.sin(a) * 1.3 }); // loose straws
  }
  hd.box(0.3, 0.3, 0.04, cold ? 0x263238 : 0x5d4037, -0.35, 1.5, 0.52, { rx: -0.3, rz: 0.2 }); // patch on the crown
  if (level >= 1) crow(hd, -0.85, 1.25, 0.1, 1.1, 0.6);
  if (cold) for (let i = 0; i < 7; i++) {
    const a = (i / 7) * PI * 2 + 0.3;
    hd.cyl(0.06, 0.4 + (i % 3) * 0.12, ice, Math.sin(a) * (brim - 0.1), 1.0 - (i % 3) * 0.06, Math.cos(a) * (brim - 0.1), { seg: 5, r2: 0.005, rx: PI }); // icicles
  }
  // a plaid shirt with patches, straw poking out and a rope belt
  if (!cold) {
    for (const y of [-0.5, 0.1, 0.65]) t.box(2.04, 0.1, 1.04, 0x5d1f15, 0, y, 0);
    for (const x of [-0.65, 0, 0.65]) t.box(0.1, 2.0, 1.04, 0x5d1f15, x, 0, 0);
  } else for (const y of [-0.5, 0.1, 0.65]) t.box(2.04, 0.06, 1.04, 0x263238, 0, y, 0);
  t.box(0.5, 0.45, 0.04, cold ? 0x546e7a : 0x3e5a7a, 0.5, -0.25, 0.52, { rz: 0.15 });
  for (let i = 0; i < 4; i++) t.box(0.03, 0.12, 0.03, 0xd7ccc8, 0.3 + i * 0.13, -0.02, 0.55);
  collar(t, tone(shirt, 0.8), { buttons: true });
  t.cyl(0.62, 0.16, 0xbcaaa4, 0, -0.78, 0, { seg: 18, sx: 1.72, sz: 0.92 });
  t.ball(0.13, 0xa1887f, -0.35, -0.78, 0.58, { seg: 8, rows: 6 });
  for (let i = 0; i < 9; i++) t.cyl(0.05, 0.42, straw, -0.95 + i * 0.24, -1.08, 0.5 - (i % 2) * 0.05, { seg: 4, r2: 0.012, rx: PI, rz: (i - 4) * 0.07 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * PI * 2;
    t.cyl(0.05, 0.38, straw, Math.sin(a) * 0.6, 1.05, Math.cos(a) * 0.4, { seg: 4, r2: 0.01, rz: -(PI / 2 - 0.6), ry: a - PI / 2 });
  }
  if (level >= 1) {
    // thorny vines wound round the body
    for (const [y, rz] of [[0.55, 0.25], [-0.25, -0.2]]) {
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const a = (i / 12) * PI * 2;
        pts.push([Math.sin(a) * 1.08, y + Math.sin(a) * rz, Math.cos(a) * 0.58]);
      }
      t.tube(pts, 0.06, cold ? 0x2e4a3a : 0x33691e, { seg: 40, sides: 5 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * PI * 2 + 0.3;
        t.cyl(0.04, 0.18, 0x1b3d0f, Math.sin(a) * 1.13, y + Math.sin(a) * rz + 0.05, Math.cos(a) * 0.62, { seg: 4, r2: 0.005, rz: -Math.sin(a) * 1.2, rx: Math.cos(a) * 1.2 });
      }
    }
  }
  if (cold) cloak(t, 0x263238, 3.4, { lining: 0x1c262b, torn: true, clasp: 0x90a4ae });
  if (reaper) crow(t, 1.35, 1.2, 0, 1.5, -0.4);
  hd.done();
  t.done();
  hands(h, key, cold ? 0x455a64 : 0x8d6e63, tone(shirt, 0.75), (a) => {
    for (let i = 0; i < 4; i++) a.cyl(0.05, 0.32, straw, -0.3 + i * 0.2, -1.5, 0.45 - (i % 2) * 0.9, { seg: 4, r2: 0.012, rx: PI + (i % 2 ? -0.5 : 0.5) });
  });
  feet(h, key, cold ? 0x263238 : 0x4e342e, (b) => {
    b.box(1.04, 0.3, 0.04, cold ? 0x37474f : 0x3e2723, 0.1, -1.0, 0.52); // patch
    for (let i = 0; i < 3; i++) b.cyl(0.05, 0.36, straw, -0.3 + i * 0.3, -1.3, 0.5, { seg: 4, r2: 0.012, rx: PI - 0.4 });
  });
  if (level >= 2) {
    // a woven basket of lit pumpkins at its feet
    const r = wear(h, h.root, `${key}:basket`);
    const bx = 1.65;
    const bz = 0.9;
    r.cyl(0.6, 0.65, 0x8d6e63, bx, 0.33, bz, { seg: 16, r2: 0.72 });
    for (const y of [0.15, 0.35, 0.55]) r.torus(0.62 + y * 0.15, 0.04, 0x6d4c41, bx, y, bz, { rx: PI / 2, seg: 16 });
    r.torus(0.74, 0.06, 0x5d4037, bx, 0.66, bz, { rx: PI / 2, seg: 16 });
    r.torus(0.6, 0.04, 0x5d4037, bx, 0.66, bz, { seg: 16, arc: PI }); // handle
    pumpkin(r, bx - 0.1, 0.85, bz + 0.1, 0.38, eye, { vine: false });
    pumpkin(r, bx + 0.25, 0.8, bz - 0.2, 0.28, null, { vine: false });
    pumpkin(r, bx - 0.9, 0.3, bz + 0.6, 0.3, eye, { vine: false }); // one fallen out
    r.done();
  }
  if (reaper) {
    // cold wisps that circle slowly round the body
    const ring = spinner(h, h.body, 0, 3.0, 0);
    const k = wear(h, ring, `${key}:wisps`);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2;
      k.ball(0.2, eye, Math.cos(a) * 2.2, Math.sin(i * 1.7) * 0.4, Math.sin(a) * 2.2, { seg: 8, rows: 6 });
      k.cyl(0.14, 0.45, eye, Math.cos(a) * 2.2, Math.sin(i * 1.7) * 0.4 + 0.3, Math.sin(a) * 2.2, { seg: 6, r2: 0.0 });
    }
    k.done();
    h.idleSpin = 0.6;
    // a lantern in the left hand
    const lg = fist(h.leftArm, -1.9, 1.1);
    const lk = wear(h, lg, `${key}:lantern`);
    lk.torus(0.2, 0.03, INK, 0, -0.2, 0, { seg: 10, arc: PI, rz: PI });
    lk.cyl(0.32, 0.12, 0x263238, 0, -0.45, 0, { seg: 8, r2: 0.12 });
    lk.cyl(0.26, 0.55, glassMat(h, 0xb3e5fc, 0.4), 0, -0.8, 0, { seg: 8 });
    lk.ball(0.16, eye, 0, -0.8, 0, { seg: 8, rows: 6 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2 + PI / 4;
      lk.box(0.05, 0.6, 0.05, 0x263238, Math.cos(a) * 0.27, -0.8, Math.sin(a) * 0.27);
    }
    lk.cyl(0.3, 0.1, 0x263238, 0, -1.12, 0, { seg: 8 });
    lk.done();
  }
  // the staff: a crooked pole with the orb on top (thorns, a sickle, then a reaper scythe)
  const g = fist(h.rightArm, -1.9, 1.0);
  const k = wear(h, g, `${key}:staff`);
  const top = reaper ? -3.4 : -2.6;
  const pole = cold ? 0x455a64 : 0x5d4037;
  k.tube([[0, 1.0, 0], [0.04, -0.4, 0.02], [-0.03, -1.6, 0], [0, top, 0]], 0.1, pole, { seg: 16, sides: 7 });
  k.cyl(0.13, 0.4, 0x8d6e63, 0, 0.05, 0, { seg: 8 }); // grip wrap
  for (const y of [top + 0.35, top + 0.6]) k.torus(0.12, 0.03, cold ? 0x90a4ae : 0x8d6e63, 0, y, 0, { rx: PI / 2, seg: 8 });
  // a cage of twigs holding the orb
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2;
    k.tube([[0, top + 0.1, 0], [Math.cos(a) * 0.32, top - 0.25, Math.sin(a) * 0.32], [Math.cos(a) * 0.12, top - 0.75, Math.sin(a) * 0.12]], 0.035, pole, { seg: 8, sides: 4 });
  }
  const orbR = reaper ? 0.42 : 0.3;
  k.ball(orbR, eye, 0, top - 0.32, 0, { seg: 14, rows: 10 });
  if (level >= 1) for (let i = 0; i < 6; i++) {
    const a = i * 2.1;
    k.cyl(0.04, 0.22, 0x33691e, Math.cos(a) * 0.1, -0.6 - i * 0.3, Math.sin(a) * 0.1, { seg: 4, r2: 0.005, rz: -Math.cos(a) * 1.3, rx: Math.sin(a) * 1.3 }); // thorns
  }
  if (level >= 3 && !reaper) crescent(k, top + 0.45, 0.05, 1.2, 0.5, 0.36, cold ? ice : 0x9e9e9e);
  if (reaper) {
    k.box(0.16, 0.3, 0.4, INK, 0, top + 0.5, 0.1, { r: 0.04 });
    crescent(k, top + 0.55, 0.1, 2.6, 1.3, 0.62, ice, 0, 0.08);
  }
  k.done();
  muzzle(h, g, top - 0.32, 0);
  h.rightArm.rotation.set(-1.9, 0, 0.1);
  h.leftArm.rotation.set(reaper ? -1.2 : -0.3, 0, -0.4);
  h.pose = { right: -1.9, left: reaper ? -1.2 : -0.3, leftRecoil: 0 };
  h.flight = { color: eyeC, size: 0.5 + level * 0.12, arc: 0.5, glowing: true };
  h.tracer = eyeC;
  if (reaper) h.body.scale.setScalar(1.15);
  return own(h, 0);
}

// ------------------------------------------------------------------ Snowballer

/**
 * Snowballer (event): a kid in a red beanie and scarf throwing snowballs. Lv 2 Snow Day: snow
 * goggles, red mittens and a long scarf, Lv 3 Frigid Temperatures: an ice-blue parka with a fur
 * hood and a bucket of snowballs, Lv 4 Snowball Cannon: an arctic helmet, armour and a snowball
 * cannon with a hopper full of snowballs.
 */
export function makeSnowballerFrost(level) {
  const cannon = level >= 3;
  const coat = [0x1e88e5, 0x1e88e5, 0x4dd0e1, 0xeceff1][level];
  const h = makeHumanoid({ skin: 0xffcc80, shirt: coat, pants: cannon ? 0x546e7a : 0x283593, arms: coat });
  const key = `p16snowballer${level}`;
  const frost = glowMat(h, 0xe1f5fe, 0.6);
  const red = 0xe53935;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (cannon) {
    helmet(hd, 0xcfd8dc, { cover: 0x90a4ae });
    goggles(hd, 0.74, glowMat(h, 0x80d8ff), { r: 0.7 });
    hd.box(1.0, 0.36, 0.12, 0x78909c, 0, 0.3, 0.64, { r: 0.05 }); // face guard
  } else {
    hair(hd, 0x5d4037, { h: 0.44 });
    beanie(hd, red, 0.62);
    hd.ball(0.22, SNOW, 0, 1.6, 0, { seg: 10, rows: 7 }); // pompom
    for (let i = 0; i < 5; i++) hd.box(0.08, 0.2, 0.04, SNOW, -0.4 + i * 0.2, 1.15, 0.7); // knit stripe
    if (level >= 1) goggles(hd, 0.76, glowMat(h, 0x90caf9, 0.4), { r: 0.7, frame: 0xeceff1 });
    for (const s of [-1, 1]) hd.ball(0.12, 0xff8a80, s * 0.36, 0.42, 0.56, { seg: 8, rows: 5, sz: 0.3 }); // cold cheeks
  }
  // coat: a zip and pockets; a puffy quilted parka with a fur hood from Lv 3
  t.box(0.06, 1.7, 0.05, 0xcfd8dc, 0, -0.05, 0.53);
  for (const s of [-1, 1]) pouch(t, s * 0.55, -0.45, 0.5, 0.5, 0.42, tone(coat, 0.85), 0.08);
  if (level >= 2) {
    for (const y of [-0.55, -0.05, 0.45]) t.box(2.12, 0.3, 1.12, tone(coat, 1.08), 0, y, 0, { r: 0.14 });
    t.torus(0.75, 0.22, SNOW, 0, 0.95, -0.15, { rx: PI / 2, seg: 18, sx: 1.2 }); // fur hood rim
    t.box(1.3, 0.9, 0.3, coat, 0, 0.55, -0.7, { r: 0.15 }); // hood down the back
  }
  if (cannon) {
    t.box(2.2, 1.4, 1.2, 0x78909c, 0, 0.25, 0, { r: 0.14 }); // armour
    for (const y of [0.55, 0.05]) t.box(2.24, 0.06, 1.24, 0x546e7a, 0, y, 0);
    shoulderPads(t, 0xcfd8dc, 0.6);
    t.cyl(0.25, 0.08, glowMat(h, 0x80d8ff), 0, 0.35, 0.61, { axis: 'z', seg: 14 }); // snowflake light
    for (let i = 0; i < 3; i++) t.box(0.05, 0.42, 0.04, SNOW, 0, 0.35, 0.66, { rz: (i * PI) / 3 });
  }
  belt(t, cannon ? INK : 0x37474f);
  neckScarf(t, red);
  if (level >= 1) {
    t.box(0.3, 1.5, 0.1, red, -0.42, -0.25, -0.62, { r: 0.04, rz: 0.08 }); // long tail down the back
    for (let i = 0; i < 4; i++) t.box(0.32, 0.06, 0.12, SNOW, -0.42 + i * 0.02, 0.3 - i * 0.35, -0.64, { rz: 0.08 });
  }
  hd.done();
  t.done();
  const mit = level >= 1 && !cannon ? red : cannon ? 0x455a64 : null;
  hands(h, key, mit, tone(coat, 0.8), (a) => {
    if (level >= 2) a.box(1.12, 0.2, 1.12, SNOW, 0, -1.5, 0, { r: 0.06 }); // fur cuffs
  });
  feet(h, key, cannon ? 0x37474f : 0x5d4037, (b) => {
    b.box(1.14, 0.18, 1.14, SNOW, 0, -1.35, 0.02, { r: 0.05 }); // fur tops
    b.box(1.1, 0.12, 1.22, INK, 0, -1.98, 0.06); // treads
  });
  if (level >= 2) {
    // a bucket of snowballs beside it, and a little snowdrift
    const r = wear(h, h.root, `${key}:bucket`);
    r.cyl(0.5, 0.75, 0x1e88e5, 1.75, 0.38, 0.6, { seg: 16, r2: 0.62 });
    r.torus(0.62, 0.04, 0x1565c0, 1.75, 0.75, 0.6, { rx: PI / 2, seg: 16 });
    r.torus(0.55, 0.025, STEEL, 1.75, 0.75, 0.6, { seg: 14, arc: PI, ry: 0.4 }); // handle
    for (const [x, z, y] of [[1.6, 0.45, 0.9], [1.9, 0.75, 0.88], [1.75, 0.6, 1.1], [1.55, 0.8, 0.86], [1.95, 0.4, 0.85]]) r.ball(0.24, SNOW, x, y, z, { seg: 10, rows: 7 });
    for (const [x, z, s] of [[-1.5, 1.0, 1], [-1.2, -1.3, 0.7], [1.4, -1.3, 0.8]]) r.ball(0.6 * s, SNOW, x, 0, z, { sy: 0.35, seg: 12, rows: 6 });
    r.done();
  }
  if (cannon) {
    // the snowball cannon: a fat barrel, a hopper of snowballs on top, a crank and a grip
    const g = fist(h.rightArm, -1.9, 1.15);
    const k = wear(h, g, `${key}:cannon`);
    const B = UP + 0.15;
    k.box(0.32, 0.5, 0.42, 0x37474f, 0, 0.42, UP - 0.04, { r: 0.06 }); // stock
    k.box(0.22, 0.26, 0.5, INK, 0, 0.1, UP - 0.36, { rx: -0.32, r: 0.04 });
    k.cyl(0.36, 1.2, 0x546e7a, 0, -0.45, B, { seg: 18 }); // chamber
    for (const y of [-0.1, -0.85]) k.torus(0.37, 0.05, 0x263238, 0, y, B, { rx: PI / 2, seg: 18 });
    k.cyl(0.3, 1.3, 0x90a4ae, 0, -1.7, B, { seg: 18 }); // barrel
    k.cyl(0.4, 0.3, 0x37474f, 0, -2.4, B, { seg: 18, r2: 0.32 }); // muzzle bell (wide end out)
    k.ball(0.3, SNOW, 0, -2.45, B, { seg: 12, rows: 8 }); // snowball in the mouth
    k.box(0.18, 0.18, 0.4, INK, 0, -0.95, UP - 0.25, { r: 0.04 }); // front grip
    // hopper on the outer side: a box with snowballs piled in, a chute into the chamber
    k.box(0.3, 0.2, 0.2, 0x37474f, -0.38, -0.5, B, { r: 0.04 });
    k.box(0.55, 0.6, 0.6, 0x78909c, -0.72, -0.5, B + 0.15, { r: 0.06 });
    k.box(0.59, 0.08, 0.64, 0x546e7a, -0.72, -0.5, B + 0.3);
    for (const [y, z] of [[-0.35, 0.5], [-0.62, 0.52], [-0.48, 0.62]]) k.ball(0.15, SNOW, -0.72, y, B + z, { seg: 8, rows: 6 });
    k.cyl(0.08, 0.12, INK, 0.42, -0.5, B, { axis: 'x', seg: 8 }); // crank
    k.box(0.06, 0.06, 0.35, INK, 0.48, -0.5, B + 0.15);
    k.cyl(0.05, 0.15, 0xe53935, 0.52, -0.5, B + 0.32, { axis: 'x', seg: 6 });
    k.cyl(0.12, 0.04, frost, 0, -1.2, B + 0.31, { seg: 10 }); // frost gauge
    k.done();
    h.muzzles = [];
    muzzle(h, g, -2.55, B);
    aimLong(h);
    h.projectile = { color: 0xffffff, size: 0.8, arc: 2 };
  } else {
    // a snowball (an icy one from Lv 3) in the raised hand
    const g = fist(h.rightArm, -2.2);
    const k = wear(h, g, `${key}:ball`);
    const s = 0.28 + level * 0.05;
    k.ball(s, level >= 2 ? frost : SNOW, 0, 0, 0, { seg: 12, rows: 9 });
    for (let i = 0; i < 4; i++) k.ball(s * 0.35, level >= 2 ? frost : 0xe3f2fd, Math.sin(i * 1.7) * s * 0.8, Math.cos(i * 2.3) * s * 0.6, Math.cos(i * 1.7) * s * 0.7, { seg: 6, rows: 4 }); // packed lumps
    k.done();
    h.muzzles = [];
    muzzle(h, g, 0, 0);
    throwPose(h);
    h.leftArm.rotation.set(-0.6, 0, -0.3);
    h.pose = { right: -2.8, left: -0.6, leftRecoil: 0 };
    h.projectile = { color: 0xffffff, size: 0.45 + level * 0.08, arc: 3 };
  }
  return own(h, cannon ? UP : 0);
}

// ------------------------------------------------------------------ Elementalist

/**
 * Elementalist (event): a battle mage in a tunic split red and blue, firing fire or frost from a
 * gauntlet cannon. Lv 2 Elemental Armory: shoulder plates and a belt of pouches, Lv 3
 * Experimental Tech: a fire tank and a frost tank on the back, Lv 4 Improved Exhaust Systems:
 * glowing exhaust stacks and a bigger gauntlet, Lv 5 Frost Fire Specialist: armour, a crested
 * helmet and a halo of fire and ice crystals that turns.
 * The gauntlet's core (h.modeGlow) and the shots take the colour of the chosen element.
 */
export function makeElementalist(level) {
  const armored = level >= 4;
  const h = makeHumanoid({ skin: 0xc68642, shirt: 0xb71c1c, pants: armored ? 0x37474f : 0x212121, arms: armored ? 0x546e7a : 0x1565c0 });
  const key = `p16elementalist${level}`;
  const fire = glowMat(h, 0xff6d00);
  const frost = glowMat(h, 0x40c4ff);
  const mode = glowMat(h, 0xff6d00); // recoloured by views.js to the chosen element
  const gold = glowMat(h, 0xffd740, 0.6);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // the blue half of the tunic, with a gold seam down the middle
  t.box(1.02, 2.03, 1.03, 0x1565c0, -0.5, 0, 0);
  t.box(0.08, 2.05, 1.05, GOLD, 0, 0, 0);
  if (armored) {
    helmet(hd, 0x455a64, { cover: 0x37474f, band: false });
    for (let i = 0; i < 5; i++) hd.box(0.14, 0.3 + (i === 2 ? 0.15 : 0), 0.28, i % 2 ? fire : frost, 0, 1.62, 0.5 - i * 0.26, { r: 0.04 }); // crest
    band(hd, 0.8, 0.06, 0.18, 1.8, gold, 0.7); // visor
    t.box(2.2, 1.6, 1.18, 0x546e7a, 0, 0.2, 0, { r: 0.14 }); // breastplate
    for (const [x, m] of [[0.45, fire], [-0.45, frost]]) {
      t.cyl(0.3, 0.08, 0x37474f, x, 0.45, 0.6, { axis: 'z', seg: 16 });
      t.cyl(0.22, 0.06, m, x, 0.45, 0.66, { axis: 'z', seg: 6 }); // element emblems
    }
    for (const y of [-0.15, -0.4]) t.box(2.24, 0.06, 1.22, 0x37474f, 0, y, 0);
  } else {
    hair(hd, 0x1a1209, { h: 0.44 });
    beanie(hd, 0x212121, 0.5);
    band(hd, 0.72, 0.05, 0.2, 1.8, gold, 0.72); // gold visor band
  }
  collar(t, 0x5d4037, { buttons: false });
  if (level >= 1) {
    // shoulder plates (red / blue) and a belt of pouches
    for (const [s, c] of [[1, 0xb71c1c], [-1, 0x1565c0]]) {
      t.ball(0.62, c, s * 1.45, 0.95, 0, { sy: 0.5, seg: 14, rows: 8 });
      t.box(0.5, 0.06, 0.9, tone(c, 0.7), s * 1.45, 0.78, 0);
      t.ball(0.1, s > 0 ? fire : frost, s * 1.45, 1.27, 0, { seg: 8, rows: 6 });
    }
    belt(t, 0x5d4037, GOLD);
    for (const x of [-0.6, 0.6]) pouch(t, x, -0.95, 0.52, 0.4, 0.38, 0x795548, 0.2);
    for (const [x, m] of [[-0.95, frost], [0.95, fire]]) {
      t.cyl(0.11, 0.32, glassMat(h, 0xeeeeee, 0.4), x, -0.95, 0.4, { seg: 10 }); // vials
      t.cyl(0.08, 0.24, m, x, -0.98, 0.4, { seg: 8 });
    }
  } else belt(t, 0x5d4037, GOLD);
  if (level >= 2) {
    // a fire tank and a frost tank on a back frame
    t.box(1.5, 1.6, 0.2, 0x424242, 0, 0.1, -0.62, { r: 0.05 });
    for (const [x, m, c] of [[0.42, fire, 0xbf360c], [-0.42, frost, 0x01579b]]) {
      t.cyl(0.3, 1.5, glassMat(h, 0xeeeeee, 0.35), x, 0.1, -0.95, { seg: 14 });
      t.cyl(0.24, 1.2, m, x, 0.0, -0.95, { seg: 12 });
      for (const y of [-0.68, 0.88]) t.cyl(0.33, 0.14, c, x, y, -0.95, { seg: 14 });
      t.cyl(0.08, 0.2, STEEL, x, 1.02, -0.95, { seg: 8 });
    }
    t.tube([[0.42, -0.7, -0.95], [0.2, -1.0, -0.6], [-1.0, -0.95, -0.2], [-1.25, -0.6, 0.2]], 0.06, 0x263238, { seg: 14, sides: 6 }); // feed hose
  }
  if (level >= 3) {
    // exhaust stacks over the tanks, glowing at the mouth
    for (const [x, m] of [[0.42, fire], [-0.42, frost]]) {
      t.cyl(0.14, 1.0, 0x37474f, x, 1.55, -0.95, { seg: 10 });
      t.torus(0.15, 0.04, STEEL, x, 1.3, -0.95, { rx: PI / 2, seg: 10 });
      t.cyl(0.2, 0.2, 0x212121, x, 2.1, -0.95, { seg: 10, r2: 0.24 });
      t.cyl(0.17, 0.05, m, x, 2.21, -0.95, { seg: 10 });
    }
  }
  hd.done();
  t.done();
  hands(h, key, armored ? 0x37474f : 0x3e2723, armored ? 0x37474f : tone(0x1565c0, 0.8), (a, s) => {
    if (armored) a.box(1.1, 0.5, 1.1, 0x455a64, 0, -0.35, 0, { r: 0.1 }); // arm plates
    if (level >= 1) a.box(1.08, 0.12, 1.08, s < 0 ? 0xb71c1c : 0x1565c0, 0, -1.2, 0);
  });
  feet(h, key, armored ? 0x37474f : 0x3e2723, armored ? (b) => b.box(0.9, 0.6, 0.2, 0x455a64, 0, -0.95, 0.52, { r: 0.08 }) : null);
  if (armored) {
    // a halo of fire and ice crystals that turns over the head
    const halo = spinner(h, h.body, 0, 6.9, 0);
    const k = wear(h, halo, `${key}:halo`);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      crystal(k, Math.cos(a) * 1.35, -0.25, Math.sin(a) * 1.35, 0.14, 0.55, i % 2 ? fire : frost);
    }
    k.torus(1.35, 0.03, gold, 0, 0, 0, { rx: PI / 2, seg: 32 });
    k.done();
    h.idleSpin = 0.7;
  }
  // the gauntlet cannon: a round body with fire and frost canisters, a vented barrel and a core
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gauntlet`);
  const len = 1.5 + level * 0.18;
  const bw = 0.24 + level * 0.03;
  const B = UP + 0.02;
  gk.box(0.22, 0.26, 0.5, INK, 0, 0.1, UP - 0.36, { rx: -0.32, r: 0.04 });
  gk.box(0.5, 0.6, 0.5, 0x424242, 0, 0.3, B, { r: 0.1 }); // the gauntlet cuff
  gk.cyl(bw, 1.0, 0x424242, 0, -0.35, B, { seg: 16 });
  for (const [x, m] of [[bw + 0.1, fire], [-bw - 0.1, frost]]) {
    gk.cyl(0.11, 0.7, 0x616161, x, -0.3, B, { seg: 10 });
    gk.cyl(0.09, 0.4, m, x, -0.3, B, { seg: 8 });
  }
  gk.cyl(bw * 0.6, len - 0.8, 0x37474f, 0, -0.85 - (len - 0.8) / 2, B, { seg: 12 });
  for (let i = 0; i < 3; i++) gk.box(bw * 1.4, 0.05, bw * 1.4, INK, 0, -0.95 - i * 0.18, B); // cooling fins
  gk.cyl(bw * 1.2, 0.3, 0x212121, 0, -len + 0.1, B, { seg: 16, r2: bw * 0.8 }); // nozzle (wide end out)
  gk.ball(bw * 0.75, mode, 0, -len - 0.05, B, { seg: 12, rows: 9 }); // the core
  if (level >= 3) gk.torus(bw * 0.95, 0.05, mode, 0, -0.35, B, { rx: PI / 2, seg: 16 });
  const meshes = gk.done();
  h.muzzles = [];
  muzzle(h, g, -len - 0.1, B);
  aimLong(h);
  h.modeGlow = meshes.filter((m) => m.material === mode);
  h.tracer = 0xff6d00;
  h.tracerWidth = 0.15 + level * 0.05;
  h.modeTracer = { fire: 0xff6d00, frost: 0x40c4ff };
  return own(h);
}

// ------------------------------------------------------------------ Firework Technician

/**
 * Firework Technician (event): a technician in a hard hat and blue overalls, with rockets on the
 * back and a lighter stick. Lv 2 Pyrotechnics: goggles and five rockets, Lv 3 Bigger Boom: a
 * launch rack beside it, Lv 4 Light the Sky: a second rack and a crate of shells, Lv 5 The
 * Finale: a black shirt, a launch console, a giant rocket on a stand and strings of lights.
 */
export function makeFireworkTech(level) {
  const finale = level >= 4;
  const shirt = finale ? 0x212121 : 0xff7043;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x1565c0, arms: shirt });
  const key = `p16firework${level}`;
  const spark = glowMat(h, 0xffab00);
  const lights = FIREWORK.map((c) => glowMat(h, c, 0.7));
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x3e2723, { h: 0.44 });
  hardHat(hd, finale ? GOLD : 0xffd600, spark);
  if (level >= 1) goggles(hd, 0.74, glowMat(h, 0xffab00, 0.5), { r: 0.7 });
  hd.box(0.06, 0.18, 0.22, 0xff1744, -0.66, 0.5, 0.05, { r: 0.02 }); // ear plug
  hd.box(0.06, 0.18, 0.22, 0xff1744, 0.66, 0.5, 0.05, { r: 0.02 });
  // blue overalls: a bib with a pocket, straps with buttons
  t.box(1.3, 1.2, 0.06, 0x1565c0, 0, -0.45, 0.52, { r: 0.03 });
  pouch(t, 0, -0.3, 0.55, 0.5, 0.4, 0x0d47a1, 0.05);
  for (const s of [-1, 1]) {
    t.box(0.22, 2.1, 0.06, 0x1565c0, s * 0.5, 0.2, 0.53, { rz: s * 0.05 });
    t.box(0.22, 2.1, 0.06, 0x1565c0, s * 0.5, 0.2, -0.53);
    t.box(0.22, 0.08, 1.12, 0x1565c0, s * 0.5, 1.02, 0);
    t.cyl(0.07, 0.04, GOLD, s * 0.5, 0.18, 0.57, { axis: 'z', seg: 8 });
  }
  t.box(2.08, 0.7, 1.08, 0x1565c0, 0, -0.68, 0, { r: 0.05 });
  for (const [x, c] of [[0.18, 0xd32f2f], [0.3, 0x212121]]) t.cyl(0.035, 0.35, c, x, -0.05, 0.6, { seg: 6 }); // pens
  if (finale) for (let i = 0; i < 5; i++) t.ball(0.07, lights[i], -0.8 + i * 0.4, 0.75 - Math.sin((i / 4) * PI) * 0.2, 0.55, { seg: 6, rows: 4 }); // a string of lights
  // rockets in a quiver on the back
  const n = level >= 1 ? 5 : 3;
  t.box(n * 0.36 + 0.2, 1.0, 0.5, 0x6d4c41, 0, -0.1, -0.8, { r: 0.06 });
  t.box(n * 0.36 + 0.24, 0.12, 0.54, 0x4e342e, 0, 0.35, -0.8);
  for (let i = 0; i < n; i++) firework(t, (i - (n - 1) / 2) * 0.36, 0.0, -0.8, 0.13, 1.3 + (i % 2) * 0.2, FIREWORK[i], 0xfafafa);
  for (const s of [-1, 1]) {
    t.box(0.22, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
    t.box(0.22, 1.3, 0.06, INK, s * 0.75, 0.32, 0.53);
  }
  hd.done();
  t.done();
  hands(h, key, 0xffb300, tone(shirt, 0.85));
  feet(h, key, 0x5d4037, (b) => b.box(1.04, 0.14, 0.3, STEEL, 0, -1.72, 0.48));
  if (level >= 2) {
    // launch racks on the ground: a crate with angled tubes
    const r = wear(h, h.root, `${key}:racks`);
    const rack = (x, z, big, ry) => {
      r.box(1.7, 0.5, 1.3, 0x5d4037, x, 0.25, z, { r: 0.05, ry });
      for (const y of [0.1, 0.4]) r.box(1.74, 0.06, 1.34, 0x3e2723, x, y, z, { ry });
      for (let i = 0; i < 6; i++) {
        const dx = ((i % 3) - 1) * 0.48;
        const dz = (Math.floor(i / 3) - 0.5) * 0.5;
        const tx = x + dx * Math.cos(ry) + dz * Math.sin(ry);
        const tz = z - dx * Math.sin(ry) + dz * Math.cos(ry);
        const hh = big ? 1.9 : 1.4;
        r.cyl(0.17, hh, 0x37474f, tx, 0.5 + hh / 2, tz, { seg: 10, rx: -0.15 });
        r.cyl(0.18, 0.12, FIREWORK[i % 5], tx, 0.5 + hh - 0.1, tz - 0.12, { seg: 10, rx: -0.15 });
        r.cyl(0.12, 0.3, FIREWORK[(i + 2) % 5], tx, 0.5 + hh + 0.12, tz - 0.17, { seg: 8, r2: 0.01, rx: -0.15 }); // nose peeking out
      }
      r.tube([[x - 0.8, 0.5, z + 0.6], [x - 0.3, 0.15, z + 1.2], [0, 0.05, 0.6]], 0.03, 0x212121, { seg: 10, sides: 4 }); // fuse wire
    };
    rack(1.95, 0.6, level >= 3, -0.25);
    if (level >= 3) {
      rack(-1.95, 0.6, true, 0.25);
      // a crate of round shells
      r.box(1.3, 0.8, 0.9, 0x8d6e63, 1.8, 0.4, -1.4, { r: 0.04 });
      for (const y of [0.15, 0.65]) r.box(1.34, 0.08, 0.94, 0x6d4c41, 1.8, y, -1.4);
      for (let i = 0; i < 3; i++) {
        r.ball(0.2, 0x212121, 1.4 + i * 0.4, 0.95, -1.4, { seg: 10, rows: 7 });
        r.cyl(0.03, 0.2, 0x8d6e63, 1.4 + i * 0.4, 1.2, -1.4, { seg: 4 });
      }
      r.box(0.6, 0.25, 0.03, 0xffd600, 1.8, 0.4, -0.94); // DANGER label
    }
    if (finale) {
      // the launch console and the giant rocket on its stand
      r.box(1.5, 0.9, 0.8, 0x37474f, 0, 0.45, 1.85, { r: 0.06 });
      r.slab(1.5, 0.3, 0.8, 0x455a64, 0, 1.05, 1.85, { td: 0.6, tz: -0.15 });
      for (let i = 0; i < 4; i++) r.cyl(0.08, 0.08, lights[i], -0.48 + i * 0.32, 1.22, 1.85, { seg: 8 });
      r.cyl(0.14, 0.12, lights[0], 0.45, 1.0, 2.26, { axis: 'z', seg: 10 }); // the big red button
      r.box(0.3, 0.22, 0.04, 0x80deea, -0.4, 0.75, 2.26);
      // giant rocket
      const rx = -0.3;
      const rz = -2.2;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * PI * 2 + 0.5;
        r.tube([[rx + Math.cos(a) * 0.9, 0, rz + Math.sin(a) * 0.9], [rx + Math.cos(a) * 0.5, 1.6, rz + Math.sin(a) * 0.5]], 0.05, STEEL, { seg: 2, sides: 5 });
      }
      r.torus(0.52, 0.05, STEEL, rx, 1.6, rz, { rx: PI / 2, seg: 16 });
      r.cyl(0.48, 4.0, 0xff1744, rx, 3.0, rz, { seg: 16 });
      for (const y of [1.6, 2.6, 3.6]) r.cyl(0.5, 0.18, y === 2.6 ? 0xfafafa : GOLD, rx, y, rz, { seg: 16 });
      r.cyl(0.5, 1.0, 0xfafafa, rx, 5.5, rz, { seg: 16, r2: 0.02 });
      r.ball(0.12, lights[1], rx, 6.0, rz, { seg: 8, rows: 6 });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * PI * 2;
        r.prism([[0, 0], [0.6, 0], [0, 1.0]], 0.06, GOLD, rx + Math.cos(a) * 0.48, 1.0, rz + Math.sin(a) * 0.48, { ry: -a + PI / 2 });
      }
      r.cyl(0.3, 0.3, INK, rx, 0.85, rz, { seg: 12, r2: 0.4 }); // nozzle
      for (let i = 0; i < 8; i++) r.ball(0.08, lights[i % 5], -2.6 + i * 0.75, 2.55 + Math.sin(i) * 0.1, -2.2 + Math.abs(i - 3.5) * 0.15, { seg: 6, rows: 4 });
      r.tube([[-2.6, 2.6, -1.7], [-1.1, 2.4, -2.2], [0.5, 2.6, -2.3], [2.6, 2.7, -1.7]], 0.02, 0x212121, { seg: 16, sides: 4 });
    }
    r.done();
  }
  // a lighter stick with a burning tip
  const g = fist(h.rightArm, -1.9, 1.1);
  const k = wear(h, g, `${key}:lighter`);
  k.cyl(0.09, 1.1, WOOD, 0, -0.35, 0, { seg: 8 });
  k.cyl(0.11, 0.3, 0x3e2723, 0, 0.05, 0, { seg: 8 });
  k.torus(0.1, 0.03, STEEL, 0, -0.88, 0, { rx: PI / 2, seg: 8 });
  k.cyl(0.06, 0.2, 0x212121, 0, -1.0, 0, { seg: 6 }); // wick
  const fs = 0.14 + level * 0.04;
  k.ball(fs, spark, 0, -1.15, 0, { seg: 10, rows: 7 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * PI * 2;
    k.box(0.03, 0.03, fs * 2.2, spark, Math.cos(a) * fs, -1.15 - Math.sin(a) * fs * 0.5, Math.sin(a) * fs, { ry: a, rx: 0.6 }); // sparks
  }
  k.done();
  h.muzzles = [];
  muzzle(h, g, -1.15, 0);
  h.rightArm.rotation.set(-1.3, 0, 0.1);
  h.leftArm.rotation.set(-0.3, 0, -0.2);
  h.pose = { right: -1.3, left: -0.3, leftRecoil: 0 };
  return own(h, 0);
}

// ------------------------------------------------------------------ Biologist

/**
 * Biologist (event): a scientist in a lab coat with a glowing flask and pots of plants round
 * it. Lv 1 a sunflower pot, Lv 2 Bio Chemistry: an ivy pot and a clipboard, Lv 3 Scientific
 * Breakthrough: goggles and a sprayer tank, Lv 4 Flower Power: a flower crown and a nightshade
 * pot, Lv 5 Botanical Berserker: a green coat wrapped in vines and a huge flower on the back.
 */
export function makeBiologist(level) {
  const berserk = level >= 4;
  const coat = berserk ? 0xc5e1a5 : 0xfafafa;
  const h = makeHumanoid({ skin: 0xffe0bd, shirt: berserk ? 0x689f38 : 0x80cbc4, pants: berserk ? 0x33691e : 0x455a64, arms: coat });
  const key = `p16biologist${level}`;
  const goo = glowMat(h, berserk ? 0xb2ff59 : 0x76ff03);
  const mats = { ivy: glowMat(h, 0x76ff03, 0.6), night: glowMat(h, 0xd500f9, 0.7) };
  const glass = glassMat(h, 0xe0f7fa, 0.45);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x6d4c41, { h: 0.5 });
  hd.ball(0.22, 0x6d4c41, -0.35, 1.25, 0.2, { seg: 8, rows: 6 }); // a messy tuft
  if (level >= 2) goggles(hd, 0.76, glowMat(h, 0x76ff03, 0.5), { r: 0.7 });
  if (level >= 3) {
    // flower crown: a twig ring with flowers
    hd.torus(0.7, 0.05, 0x558b2f, 0, 1.18, 0, { rx: PI / 2, seg: 22 });
    [0xffd600, 0xff4081, 0xffffff, 0xff9100, 0xd500f9, 0x40c4ff].forEach((c, i) => {
      const a = -1.3 + i * 0.52;
      const x = Math.sin(a) * 0.72;
      const z = Math.cos(a) * 0.72;
      for (let p = 0; p < 5; p++) {
        const b = (p / 5) * PI * 2;
        hd.ball(0.07, c, x + Math.cos(b) * 0.08, 1.24 + Math.sin(b) * 0.08, z + 0.02, { seg: 6, rows: 4, sz: 0.5 });
      }
      hd.ball(0.05, 0xffeb3b, x, 1.24, z + 0.05, { seg: 6, rows: 4 });
    });
  }
  // the lab coat: open front over a shirt, lapels, pockets with pens, long tails
  for (const s of [-1, 1]) {
    t.box(0.65, 2.02, 0.08, coat, s * 0.7, 0, 0.52, { r: 0.03 });
    t.box(0.28, 0.75, 0.05, tone(coat, 0.92), s * 0.45, 0.6, 0.57, { rz: s * 0.3 });
    t.box(0.08, 2.02, 1.04, coat, s * 1.0, 0, 0);
  }
  t.box(2.02, 2.02, 0.08, coat, 0, 0, -0.52);
  t.box(0.36, 0.55, 0.06, 0x37474f, 0, 0.55, 0.51); // tie
  pouch(t, 0.7, 0.3, 0.56, 0.42, 0.4, tone(coat, 0.9), 0.05);
  for (const [x, c] of [[0.6, 0x1565c0], [0.75, 0xd32f2f]]) t.cyl(0.035, 0.35, c, x, 0.5, 0.64, { seg: 6 });
  t.box(0.36, 0.24, 0.03, 0x90caf9, -0.7, 0.45, 0.57); // name badge
  t.slab(2.1, 1.3, 0.1, coat, 0, -1.6, -0.56, { bw: 1.12 });
  for (const s of [-1, 1]) t.slab(0.6, 1.3, 0.1, coat, s * 0.72, -1.6, 0.55, { bw: 1.12, bx: s * 0.05 });
  if (level >= 2) {
    // a sprayer tank with a pump handle and a hose
    t.cyl(0.42, 1.4, 0x78909c, 0, 0.0, -0.95, { seg: 16 });
    for (const s of [-1, 1]) t.ball(0.42, 0x78909c, 0, s * 0.7, -0.95, { sy: 0.35, seg: 16, rows: 6 });
    t.cyl(0.44, 0.22, goo, 0, 0.25, -0.95, { seg: 16 });
    t.cyl(0.05, 0.6, STEEL, 0.25, 1.05, -0.95, { seg: 6 });
    t.box(0.4, 0.08, 0.08, INK, 0.25, 1.35, -0.95);
    t.tube([[0, -0.75, -0.95], [-0.8, -1.0, -0.5], [-1.25, -0.6, 0.2]], 0.05, 0x388e3c, { seg: 12, sides: 6 });
    for (const s of [-1, 1]) {
      t.box(0.2, 0.1, 1.2, INK, s * 0.4, 1.0, -0.05);
      t.box(0.2, 1.2, 0.06, INK, s * 0.4, 0.35, 0.57);
    }
  }
  if (berserk) {
    // vines wound round the body and a huge sunflower on the back
    for (const [y, rz] of [[0.5, 0.3], [-0.4, -0.25]]) {
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const a = (i / 12) * PI * 2;
        pts.push([Math.sin(a) * 1.1, y + Math.sin(a) * rz, Math.cos(a) * 0.62]);
      }
      t.tube(pts, 0.07, 0x2e7d32, { seg: 40, sides: 5 });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * PI * 2 + 0.5;
        t.ball(0.14, LEAF, Math.sin(a) * 1.15, y + Math.sin(a) * rz, Math.cos(a) * 0.68, { sx: 1.5, sy: 0.3, seg: 8, rows: 5, ry: a, rz: 0.5 });
      }
    }
    t.cyl(0.08, 1.4, 0x388e3c, 0, 1.3, -1.45, { seg: 8 });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * PI * 2;
      t.ball(0.3, i % 2 ? 0xffd600 : 0xffc400, Math.cos(a) * 0.95, 2.0 + Math.sin(a) * 0.95, -1.5, { sx: 2.0, sy: 0.75, sz: 0.25, rz: a, seg: 8, rows: 5 });
    }
    t.cyl(0.62, 0.2, 0x5d4037, 0, 2.0, -1.42, { axis: 'z', seg: 18 });
    for (let i = 0; i < 6; i++) t.ball(0.07, 0x3e2723, Math.cos(i) * 0.35, 2.0 + Math.sin(i) * 0.35, -1.3, { seg: 6, rows: 4 });
  }
  hd.done();
  t.done();
  hands(h, key, 0x26a69a, tone(coat, 0.9), (a) => {
    if (berserk) a.tube([[0.5, -0.3, 0.3], [-0.5, -0.6, 0.4], [-0.5, -1.0, -0.4], [0.5, -1.3, -0.3]], 0.05, 0x2e7d32, { seg: 16, sides: 5 });
  });
  feet(h, key, 0x37474f);
  // pots of plants on the ground round it
  const r = wear(h, h.root, `${key}:pots`);
  flowerPot(r, 1.6, 1.2, 'sun', mats);
  if (level >= 1) flowerPot(r, -1.6, 1.2, 'ivy', mats);
  if (level >= 3) flowerPot(r, 1.6, -1.2, 'night', mats);
  if (berserk) flowerPot(r, -1.6, -1.2, 'sun', mats);
  r.done();
  if (level >= 1) {
    // a clipboard in the left hand
    const cg = fist(h.leftArm, -1.9, 1.0);
    const ck = wear(h, cg, `${key}:clipboard`);
    ck.box(0.1, 1.1, 0.8, 0x8d6e63, 0.1, -0.35, 0.3, { r: 0.03 });
    ck.box(0.04, 0.95, 0.65, 0xfafafa, 0.17, -0.38, 0.3);
    for (let i = 0; i < 5; i++) ck.box(0.02, 0.05, 0.45, 0x90a4ae, 0.2, -0.05 - i * 0.15, 0.3);
    ck.box(0.12, 0.12, 0.3, STEEL, 0.12, 0.18, 0.3, { r: 0.02 });
    ck.done();
  }
  // the flask, held by its neck
  const g = fist(h.rightArm, -1.9, 1.1);
  const k = wear(h, g, `${key}:flask`);
  const tip = flask(k, 0.3 + level * 0.05, goo, glass);
  k.done();
  h.muzzles = [];
  muzzle(h, g, tip, 0);
  h.rightArm.rotation.set(-1.4, 0, 0.1);
  h.leftArm.rotation.set(level >= 1 ? -1.0 : -0.3, 0, -0.2);
  h.pose = { right: -1.4, left: level >= 1 ? -1.0 : -0.3, leftRecoil: 0 };
  return own(h, 0);
}

// ------------------------------------------------------------------ Warlock

/**
 * Warlock (event): a hooded swordsman who casts from the left hand. Lv 1 a grey robe and a plain
 * sword, Lv 2 Acolyte: a purple sash and a floating spellbook, Lv 3 Forbidden Arts: glowing runes
 * and orbs that circle it, Lv 4 Pact of the Blade: a glowing blade, Lv 5 Eldritch Knight: plate
 * armour and a horned helm, Lv 6 Abyss Walker: black and violet, bat wings and a huge abyssal
 * greatsword.
 */
export function makeWarlock(level) {
  const abyss = level >= 5;
  const knight = level >= 4;
  const magicC = [0x40c4ff, 0x7c4dff, 0x7c4dff, 0xaa00ff, 0xaa00ff, 0xd500f9][level];
  const robe = [0x616161, 0x37474f, 0x263238, 0x1a1a2e, 0x1a1a2e, 0x0b0014][level];
  const plate = abyss ? 0x1a0033 : 0x546e7a;
  const h = makeHumanoid({ skin: 0xc8b6a6, shirt: robe, pants: 0x111111, arms: knight ? plate : robe, face: 'agent' });
  const key = `p16warlock${level}`;
  const rune = glowMat(h, magicC);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (knight) {
    // a closed horned helm with a glowing eye slit
    dome(hd, 0.78, 0.5, plate, 0, 1.0, 0);
    hd.cyl(0.78, 1.02, plate, 0, 0.5, 0, { seg: 20 });
    band(hd, 0.8, 0.06, 0.12, 1.4, rune, 0.72); // eye slit
    hd.box(0.16, 0.7, 0.14, tone(plate, 1.3), 0, 0.85, 0.76, { r: 0.04 }); // nose guard
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) hd.box(0.06, 0.06, 0.06, INK, s * 0.2, 0.25 + i * 0.1, 0.78); // breaths
    hd.box(0.18, 0.2, 1.3, tone(plate, 1.2), 0, 1.47, -0.05, { r: 0.06 }); // ridge
    const horn = abyss ? 0x111111 : 0xd7ccc8;
    for (const s of [-1, 1]) {
      hd.tube([[s * 0.65, 1.0, 0], [s * 1.0, 1.35, -0.05], [s * 1.1, 1.85, 0.1], [s * 0.95, 2.2, 0.25]], 0.12, horn, { seg: 16, sides: 7 });
      hd.cyl(0.1, 0.25, horn, s * 0.95, 2.3, 0.28, { seg: 6, r2: 0.005, rz: s * 0.4 });
    }
    // breastplate, tassets and pauldrons
    t.box(2.2, 1.7, 1.2, plate, 0, 0.2, 0, { r: 0.16 });
    t.box(0.12, 1.5, 0.08, tone(plate, 1.3), 0, 0.25, 0.62);
    for (const y of [-0.2, -0.55]) t.box(2.24, 0.06, 1.24, tone(plate, 0.7), 0, y, 0);
    t.cyl(0.25, 0.06, rune, 0, 0.55, 0.61, { axis: 'z', seg: 6 }); // pact sigil
    for (const s of [-1, 1]) {
      t.ball(0.7, abyss ? 0x311b92 : 0x78909c, s * 1.45, 0.95, 0, { sy: 0.55, seg: 16, rows: 8 });
      t.box(0.55, 0.08, 1.0, INK, s * 1.45, 0.75, 0);
      t.torus(0.5, 0.04, abyss ? rune : GOLD, s * 1.45, 1.05, 0, { rx: PI / 2, seg: 16 });
      t.box(0.7, 0.6, 0.12, plate, s * 0.55, -1.25, 0.56, { r: 0.04 }); // tassets
    }
  } else {
    hood(hd, robe);
    hd.box(1.1, 0.3, 0.06, tone(robe, 0.4), 0, 1.0, 0.6, { rx: 0.3 }); // shadow under the peak
    for (const s of [-1, 1]) hd.cyl(0.06, 0.04, rune, s * 0.25, 0.72, 0.64, { axis: 'z', seg: 8 }); // eye glints
  }
  // the robe: crossed front panels, a rope belt and long tails over the legs
  if (!knight) {
    for (const s of [-1, 1]) t.box(1.1, 2.02, 0.06, tone(robe, 1.15), s * 0.38, 0, 0.53, { rz: s * 0.06 });
    t.box(2.1, 0.2, 1.1, 0x5d4037, 0, -0.8, 0, { r: 0.04 });
    t.ball(0.12, 0x5d4037, 0.35, -0.8, 0.58, { seg: 8, rows: 6 });
    for (const s of [-1, 1]) t.cyl(0.04, 0.6, 0x5d4037, 0.35 + s * 0.08, -1.1, 0.6, { seg: 5, rz: s * 0.15 });
  }
  t.slab(2.1, 1.6, 0.1, robe, 0, -1.75, -0.56, { bw: 1.15 });
  for (const s of [-1, 1]) t.slab(0.65, 1.6, 0.1, robe, s * 0.72, -1.75, 0.56, { bw: 1.15, bx: s * 0.05 });
  cloak(t, abyss ? 0x311b92 : robe, 3.2 + level * 0.15, { lining: abyss ? 0x0b0014 : tone(robe, 0.6), torn: level >= 2, clasp: knight ? GOLD : STEEL });
  if (level >= 1) {
    sash(t, 0x6a1b9a, 1, 0.3);
    t.box(0.3, 0.3, 0.08, GOLD, 0.45, 0.65, 0.6, { r: 0.04, rz: 0.62 });
  }
  if (level >= 2) for (let i = 0; i < 3; i++) t.torus(0.12, 0.03, rune, -0.5 + i * 0.5, -0.3, 0.6, { seg: 10 }); // runes on the front
  if (abyss) wings(t, 0x1a0033, rune, { size: 1.05, y: 0.5 });
  hd.done();
  t.done();
  hands(h, key, knight ? tone(plate, 1.2) : 0x3e2723, knight ? tone(plate, 0.8) : tone(robe, 0.8), (a) => {
    a.box(1.12, 0.45, 1.12, knight ? tone(plate, 1.1) : tone(robe, 1.1), 0, -1.3, 0, { r: 0.08 }); // wide cuffs / vambraces
    if (level >= 2) a.box(1.14, 0.06, 1.14, rune, 0, -1.15, 0);
  });
  feet(h, key, knight ? plate : 0x212121, knight ? (b) => b.box(0.9, 0.55, 0.2, tone(plate, 1.2), 0, -0.95, 0.52, { r: 0.08 }) : null);
  if (level >= 1) {
    // the floating spellbook beside it
    const b = wear(h, h.body, `${key}:book`);
    const bx = 1.7;
    const by = 5.4;
    const bz = 0.8;
    b.box(0.95, 0.12, 0.75, 0x4a148c, bx, by - 0.12, bz, { r: 0.03, rz: 0.15 });
    b.box(0.9, 0.18, 0.7, 0xfff8e1, bx, by, bz, { rz: 0.15 });
    b.box(0.95, 0.06, 0.75, 0x4a148c, bx - 0.4, by + 0.3, bz, { r: 0.02, rz: 1.2 }); // open cover
    b.cyl(0.16, 0.04, rune, bx, by + 0.1, bz, { seg: 6, rz: 0.15 });
    for (let i = 0; i < 3; i++) b.box(0.4, 0.01, 0.04, 0x8d6e63, bx + 0.05, by + 0.1, bz - 0.2 + i * 0.2, { rz: 0.15 });
    b.done();
  }
  if (level >= 2) {
    // orbs that circle round it
    const ring = spinner(h, h.body, 0, 3.6, 0);
    const k = wear(h, ring, `${key}:orbs`);
    const n = abyss ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2;
      const x = Math.cos(a) * 2.0;
      const z = Math.sin(a) * 2.0;
      const y = (i % 2) * 0.8 - 0.3;
      k.ball(0.2, rune, x, y, z, { seg: 10, rows: 7 });
      k.torus(0.3, 0.025, rune, x, y, z, { rx: 0.6 + i, seg: 12 });
    }
    k.done();
    h.idleSpin = 0.9;
  }
  // the sword in the right hand (a glowing pact blade from Lv 4, a greatsword at Lv 6)
  const g = fist(h.rightArm, -1.9, 1.0);
  const sk = wear(h, g, `${key}:sword`);
  const bl = [2.0, 2.2, 2.4, 2.8, 3.2, 4.0][level];
  const bw = abyss ? 0.6 : 0.3 + level * 0.04;
  bladeOf(sk, bl, bw, level >= 3 ? (abyss ? 0x1a0033 : 0x263238) : 0xb0bec5, level >= 3 ? rune : 0x78909c, {
    guard: knight ? GOLD : STEEL, grip: abyss ? 0x311b92 : 0x4e342e, gw: 0.9 + level * 0.1,
  });
  if (abyss) for (let i = 0; i < 4; i++) for (const s of [-1, 1]) sk.cyl(0.07, 0.3, 0x1a0033, s * 0.33, -0.9 - i * 0.7, 0, { seg: 4, r2: 0.005, rz: s * -1.2 }); // barbs
  sk.done();
  // the casting hand: a glowing orb with a ring of runes round it
  const c = fist(h.leftArm, -1.9, 1.0);
  const ck = wear(h, c, `${key}:cast`);
  const cr = 0.22 + level * 0.04;
  ck.ball(cr, rune, 0, -0.3, 0, { seg: 12, rows: 9 });
  ck.torus(cr + 0.15, 0.03, rune, 0, -0.3, 0, { rx: 0.5, seg: 16 });
  if (level >= 3) ck.torus(cr + 0.25, 0.025, rune, 0, -0.3, 0, { ry: 0.9, seg: 16 });
  ck.done();
  h.muzzles = [];
  muzzle(h, c, -0.3, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  h.leftArm.rotation.set(-1.5, 0, -0.2);
  h.pose = { right: -2.4, left: -1.5, leftRecoil: 0 };
  h.swing = 2;
  h.tracer = magicC;
  h.tracerWidth = 0.2 + level * 0.06;
  if (abyss) h.body.scale.setScalar(1.15);
  return own(h, 0);
}

export const MODELS = {
  hallowboomerPunk: makeHallowPunk,
  harvester: makeHarvester,
  snowballerFrost: makeSnowballerFrost,
  elementalist: makeElementalist,
  fireworkTech: makeFireworkTech,
  biologist: makeBiologist,
  warlock: makeWarlock,
};
