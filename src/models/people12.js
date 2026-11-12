// Tower models: people, batch 12 (dressed with the vehicle kit in ../vehicles.js).
// In here: DJ Booth, EDJ (+bottom), Anarchist, Machine Gunner (+bottom), Elf, Hallowboomer, Sleeter.
// Each makeX(level) builds one tower's look; MODELS at the bottom is laid over TOWER_MODELS in ../models.js.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.
// The DJs' records turn (spinner + h.idleSpin); DJ Booth keeps h.trackMats (views.js recolours them
// to the track playing). Helpers here: headphones, sleeves, platter, turntable, mixer, dollar,
// partyLight, gift, firework, pumpkin (a carved jack-o'-lantern), hmg (heavy MG), iceBlaster.

import * as THREE from 'three';
import { glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import {
  GOLD, GUNMETAL, INK, STEEL, UP, aimLong, armPatch, band, belt, collar, dome, fist, goggles, hair, headset, helmet,
  kneePad, muzzle, own, pack, pouch, radio, sash, shardOf, wear,
} from './people1.js';
import { beanie, smg } from './people3.js';
import { feet, glassMat, hands, hood } from './people5.js';
import { gasMask } from './people7.js';
import { bag } from './machines2.js';
import { crystal, speaker, spinner, truss } from './machines5.js';

const PI = Math.PI;
const BRASS = 0xc9a227;
const RED = 0xd32f2f;
const SNOW = 0xf5f7fa;
const TRACKS = [0xb388ff, 0x69f0ae, 0xff5252]; // DJ Booth: Purple, Green, Red tracks

// ------------------------------------------------------------------ shared bits for this batch

/** Big DJ headphones: a band over the head and round cups with a light ring (head space). */
function headphones(k, col, ring, o = {}) {
  const R = o.r ?? 0.8;
  k.torus(R, 0.07, col, 0, 0.7, 0, { arc: PI, seg: 18 });
  k.box(0.5, 0.1, 0.22, tone(col, 0.7), 0, 0.7 + R, 0, { r: 0.04 }); // padding on top
  for (const s of [-1, 1]) {
    k.cyl(0.36, 0.26, tone(col, 0.6), s * 0.74, 0.66, 0, { axis: 'x', seg: 18 }); // cushion
    k.cyl(0.34, 0.16, col, s * 0.9, 0.66, 0, { axis: 'x', seg: 18 }); // cup
    k.torus(0.26, 0.045, ring, s * 0.99, 0.66, 0, { ry: PI / 2, seg: 18 });
    k.cyl(0.12, 0.04, ring, s * 0.99, 0.66, 0, { axis: 'x', seg: 12 });
  }
}

/** T-shirt sleeves on bare arms (and gloves if `glov`), plus whatever `extra` adds to each arm. */
function sleeves(h, key, shirt, glov, extra) {
  hands(h, key, glov, tone(shirt, 0.85), (a, s) => {
    a.box(1.06, 0.66, 1.06, shirt, 0, -0.35, 0, { r: 0.05 });
    extra?.(a, s);
  });
}

/** A record that turns on the deck (a spinner, so it turns with u.spin / idleSpin). */
function platter(h, parent, key, x, y, z, r, label) {
  const g = spinner(h, parent, x, y, z);
  const k = wear(h, g, `${key}:platter`);
  k.cyl(r, 0.06, 0x111114, 0, 0, 0, { seg: 24 });
  for (const f of [0.5, 0.66, 0.82]) k.torus(r * f, 0.012, 0x2e2e36, 0, 0.03, 0, { rx: PI / 2, seg: 24 });
  k.cyl(r * 0.3, 0.07, label, 0, 0.01, 0, { seg: 16 });
  k.cyl(0.04, 0.16, 0xcfd8dc, 0, 0.05, 0, { seg: 6 });
  k.box(0.06, 0.08, r * 0.28, 0xeceff1, 0, 0.03, r * 0.8); // a mark so the turning shows
  k.done();
}

/** A turntable deck under a platter: base, pitch slider, start button and tone arm (any space). */
function turntable(k, x, y, z, w, d, light) {
  k.box(w, 0.18, d, 0x2a2a32, x, y, z, { r: 0.05 });
  k.box(w - 0.1, 0.03, d - 0.1, 0x3a3a44, x, y + 0.09, z);
  k.cyl(w * 0.42, 0.05, 0x1a1a1f, x - w * 0.06, y + 0.11, z, { seg: 22 }); // platter well
  k.box(0.08, 0.04, d * 0.5, INK, x + w * 0.42, y + 0.11, z + d * 0.05); // pitch slider track
  k.box(0.14, 0.06, 0.1, 0xb0bec5, x + w * 0.42, y + 0.14, z + d * 0.12);
  k.box(0.16, 0.05, 0.16, light, x - w * 0.4, y + 0.12, z + d * 0.38, { r: 0.02 }); // start
  k.cyl(0.08, 0.14, STEEL, x + w * 0.38, y + 0.17, z - d * 0.32, { seg: 10 }); // arm pivot
  k.tube([[x + w * 0.38, y + 0.24, z - d * 0.32], [x + w * 0.36, y + 0.24, z + d * 0.05], [x + w * 0.22, y + 0.2, z + d * 0.25]], 0.025, 0xcfd8dc, { seg: 8, sides: 5 });
  k.box(0.12, 0.05, 0.18, INK, x + w * 0.2, y + 0.18, z + d * 0.28, { ry: 0.5 });
}

/** A mixer: a sloped box with rows of knobs, three faders, a crossfader and level lights. */
function mixer(k, x, y, z, w, d, light) {
  k.slab(w, 0.22, d, 0x30303a, x, y, z, { tz: -0.04, td: 0.92 });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) k.cyl(0.05, 0.08, c === 1 ? 0xeceff1 : 0x9e9e9e, x + (c - 1) * w * 0.28, y + 0.14, z - d * 0.32 + r * 0.14, { seg: 8 });
  for (let c = 0; c < 3; c++) {
    k.box(0.04, 0.03, d * 0.3, INK, x + (c - 1) * w * 0.28, y + 0.12, z + d * 0.2);
    k.box(0.1, 0.06, 0.06, 0xeceff1, x + (c - 1) * w * 0.28, y + 0.15, z + d * 0.17 + c * 0.05);
  }
  k.box(w * 0.6, 0.03, 0.05, INK, x, y + 0.12, z + d * 0.42);
  k.box(0.08, 0.06, 0.1, 0xff7043, x + 0.05, y + 0.15, z + d * 0.42); // crossfader
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) k.box(0.05, 0.03, 0.04, light, x + s * w * 0.42, y + 0.13, z - d * 0.3 + i * 0.07);
}

/** A "$" sign made of glowing bars, facing +z (any space). */
function dollar(k, x, y, z, s, mat) {
  k.box(0.1 * s, 0.95 * s, 0.06, mat, x, y, z);
  for (const dy of [-0.3, 0, 0.3]) k.box(0.5 * s, 0.11 * s, 0.07, mat, x, y + dy * s, z + 0.01, { r: 0.02 });
  k.box(0.11 * s, 0.3 * s, 0.07, mat, x - 0.2 * s, y + 0.15 * s, z + 0.01);
  k.box(0.11 * s, 0.3 * s, 0.07, mat, x + 0.2 * s, y - 0.15 * s, z + 0.01);
}

/** A moving-head party light hanging under a truss: yoke, round can, glowing lens (any space). */
function partyLight(k, x, y, z, lens, tilt = 0.5) {
  k.box(0.5, 0.1, 0.18, INK, x, y - 0.05, z);
  for (const s of [-1, 1]) k.box(0.06, 0.4, 0.12, INK, x + s * 0.23, y - 0.3, z);
  k.cyl(0.18, 0.42, 0x263238, x, y - 0.42, z + 0.05, { axis: 'z', seg: 12, rx: tilt });
  k.cyl(0.15, 0.04, lens, x, y - 0.42 - Math.sin(tilt) * 0.22, z + 0.05 + Math.cos(tilt) * 0.22, { axis: 'z', seg: 12, rx: tilt });
}

/** A wrapped present centred on (x, y, z), s across: box, ribbon cross and a two-loop bow. */
export function gift(k, x, y, z, s, col, ribbon, o = {}) {
  const ry = o.ry ?? 0;
  k.box(s, s, s, col, x, y, z, { r: Math.min(0.06, s * 0.08), ry });
  k.box(s + 0.03, s + 0.03, s * 0.16, ribbon, x, y, z, { ry });
  k.box(s * 0.16, s + 0.03, s + 0.03, ribbon, x, y, z, { ry });
  for (const sx of [-1, 1]) k.torus(s * 0.16, s * 0.05, ribbon, x + sx * s * 0.14 * Math.cos(ry), y + s / 2 + s * 0.13, z - sx * s * 0.14 * Math.sin(ry), { ry: ry + PI / 2, rz: sx * 0.5, seg: 10 });
  k.ball(s * 0.07, ribbon, x, y + s / 2 + 0.03, z, { seg: 8, rows: 5 });
}

/** A firework rocket standing on y: body, a band, a cone nose and a stick below (any space). */
export function firework(k, x, y, z, r, len, col, nose) {
  k.cyl(0.025, len * 0.8, 0x8d6e63, x + r * 0.9, y - len * 0.3, z, { seg: 5 }); // stick
  k.cyl(r, len, col, x, y + len / 2, z, { seg: 10 });
  k.cyl(r * 1.04, len * 0.14, 0xfafafa, x, y + len * 0.7, z, { seg: 10 });
  k.cyl(r * 1.05, len * 0.42, nose, x, y + len + len * 0.21, z, { seg: 10, r2: 0.01 });
  k.cyl(0.02, 0.18, 0x5d4037, x, y - 0.05, z, { seg: 4 }); // fuse
}

/**
 * A jack-o'-lantern: a ribbed body, a curly stem with a leaf, and a carved face (triangle eyes and
 * nose, a jagged grin) that glows. Centred on (x, y, z), r across half, facing +z.
 */
export function pumpkin(k, x, y, z, r, lit, o = {}) {
  const col = o.col ?? 0xef6c00;
  k.ball(r * 0.82, tone(col, 0.85), x, y, z, { sy: 0.85, seg: 14, rows: 9 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    k.ball(r * 0.55, i % 2 ? col : tone(col, 1.08), x + Math.cos(a) * r * 0.45, y, z + Math.sin(a) * r * 0.45, { sy: 1.2, seg: 12, rows: 8 });
  }
  const top = y + r * 0.72;
  k.cyl(r * 0.1, r * 0.4, 0x4e6b25, x, top + r * 0.12, z, { seg: 7, r2: r * 0.07, rz: 0.2 }); // stem
  if (o.vine !== false) {
    k.tube([[x, top + r * 0.05, z], [x + r * 0.3, top + r * 0.12, z + r * 0.1], [x + r * 0.42, top + r * 0.02, z - r * 0.12], [x + r * 0.3, top - r * 0.06, z - r * 0.25]], r * 0.025, 0x558b2f, { seg: 12, sides: 4 });
    k.box(r * 0.32, 0.03, r * 0.22, 0x558b2f, x - r * 0.25, top + r * 0.02, z + r * 0.05, { ry: 0.6, rz: 0.3 });
  }
  if (!lit) return;
  const f = z + r * 0.93;
  const ey = y + r * 0.2;
  for (const s of [-1, 1]) k.cyl(r * 0.2, r * 0.14, lit, x + s * r * 0.33, ey, f - r * 0.04, { axis: 'z', seg: 3, rz: s * 0.15 }); // eyes
  k.cyl(r * 0.09, r * 0.14, lit, x, y - r * 0.02, f + r * 0.02, { axis: 'z', seg: 3 }); // nose
  k.box(r * 0.8, r * 0.16, r * 0.12, lit, x, y - r * 0.32, f - r * 0.1, { rx: -0.1 }); // grin
  for (const dx of [-0.28, 0, 0.28]) k.box(r * 0.13, r * 0.12, r * 0.14, lit, x + dx * r, y - r * 0.22, f - r * 0.1); // top teeth gaps
  for (const s of [-1, 1]) k.box(r * 0.2, r * 0.12, r * 0.12, lit, x + s * r * 0.44, y - r * 0.22, f - r * 0.16, { rz: s * -0.5 }); // grin corners up
}

// ------------------------------------------------------------------ DJ Booth

/**
 * DJ Booth (alternate DJ form): a DJ in a backwards cap and big headphones behind a wide booth
 * with two turning records and a mixer. Everything in the track colour (h.trackMats) takes the
 * colour of the track playing. Lv 1 a laptop, Lv 2 a truss with party lights, Lv 3 a gold "$"
 * sign and a tip jar, Lv 4 a visualizer screen on posts, Lv 5 a hoodie and three laser poles.
 */
export function makeDJBooth(level) {
  const rave = level >= 5;
  const shirt = rave ? 0x311b92 : 0x212121;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: 0x37474f, arms: 0xc68642, face: 'smile' });
  const key = `djBooth${level}`;
  const tr = glowMat(h, TRACKS[0]);
  h.trackMats = [tr];
  const shard = shardOf(h);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x1a1209, { h: 0.4 });
  headphones(hd, 0x26262e, tr);
  // a T-shirt with the shard print, a chain and a belt
  t.box(0.7, 0.7, 0.04, tone(shirt, 1.6), 0, 0.3, 0.52, { r: 0.03 });
  t.box(0.36, 0.36, 0.05, shard, 0, 0.3, 0.54, { rz: PI / 4 });
  t.torus(0.5, 0.03, GOLD, 0, 0.8, 0.32, { rx: 1.1, seg: 18 });
  belt(t, 0x111111, 0xb0bec5);
  if (rave) {
    // a hoodie: hood down on the back, drawstrings and a front pocket
    t.box(1.7, 0.55, 0.5, tone(shirt, 0.85), 0, 0.92, -0.42, { r: 0.2 });
    for (const s of [-1, 1]) t.cyl(0.03, 0.55, 0xeeeeee, s * 0.2, 0.62, 0.53, { seg: 5 });
    t.slab(1.2, 0.5, 0.08, tone(shirt, 0.85), 0, -0.5, 0.52, { tw: 0.75 });
  }
  hd.done();
  t.done();
  // a backwards cap (the cap is built facing forward on a turned group)
  const back = new THREE.Group();
  back.rotation.y = PI;
  h.head.add(back);
  const c = wear(h, back, `${key}:cap`);
  dome(c, 0.69, 0.5, 0x7e57c2, 0, 0.95, 0);
  c.torus(0.68, 0.035, 0x5e35b1, 0, 0.97, 0, { rx: PI / 2, seg: 20 });
  c.plan([[-0.45, 0], [0.45, 0], [0.38, 0.4], [0, 0.52], [-0.38, 0.4]], 0.06, 0x5e35b1, 0, 0.97, 0.5, { rx: -0.12 });
  c.box(0.3, 0.12, 0.04, 0xeeeeee, 0, 1.08, -0.67); // the strap at the front
  c.done();
  sleeves(h, key, shirt, null, (a, s) => s > 0 && a.box(1.08, 0.22, 1.08, tr, 0, -1.35, 0)); // a light band
  feet(h, key, 0xeeeeee, (b) => b.box(1.12, 0.1, 1.24, 0x7e57c2, 0, -1.92, 0.06));

  // the booth: a wide desk with two turntables round a mixer
  const k = wear(h, h.root, `${key}:booth`);
  k.box(5.2, 2.3, 1.4, 0x1c1c24, 0, 1.15, 1.7, { r: 0.08 });
  k.box(5.0, 2.0, 0.06, 0x24242e, 0, 1.15, 2.41); // front panel
  for (const x of [-1.7, 1.7]) k.box(0.05, 2.0, 0.05, 0x101016, x, 1.15, 2.44); // panel lines
  for (const y of [1.75, 0.55]) k.box(5.0, 0.18, 0.05, tr, 0, y, 2.45);
  k.cyl(0.42, 0.06, 0x101016, 0, 1.15, 2.45, { axis: 'z', seg: 20 }); // the logo ring
  k.torus(0.36, 0.04, tr, 0, 1.15, 2.49, { seg: 20 });
  k.box(0.26, 0.26, 0.05, shard, 0, 1.15, 2.5, { rz: PI / 4 });
  k.box(5.4, 0.12, 1.6, 0x2a2a34, 0, 2.34, 1.7, { r: 0.04 }); // top
  k.box(5.4, 0.2, 1.6, 0x111116, 0, 0.1, 1.7); // kick plate
  for (const x of [-1.6, 1.6]) turntable(k, x, 2.48, 1.7, 1.3, 1.1, tr);
  mixer(k, 0, 2.5, 1.7, 1.0, 0.9, tr);
  k.tube([[-2.4, 2.3, 0.95], [-2.2, 1.0, 0.85], [-1.0, 0.3, 0.9]], 0.05, INK, { seg: 10, sides: 5 }); // cables round the back
  k.tube([[2.4, 2.3, 0.95], [2.3, 1.2, 0.85], [1.2, 0.25, 0.9]], 0.05, INK, { seg: 10, sides: 5 });
  if (level >= 1) {
    // Laptop Studio: an open laptop on a stand behind the mixer
    k.box(0.12, 0.4, 0.12, STEEL, 0, 2.66, 1.35);
    k.box(1.0, 0.05, 0.7, 0xb0bec5, 0, 2.88, 1.45, { rx: 0.2, r: 0.02 });
    k.box(1.0, 0.7, 0.05, 0xb0bec5, 0, 3.2, 1.1, { rx: -0.25, r: 0.02 });
    k.box(0.88, 0.58, 0.02, tr, 0, 3.2, 1.13, { rx: -0.25 });
  }
  if (level >= 3) {
    // Thrifty Music: a gold "$" on the front and a tip jar full of coins
    dollar(k, -1.0, 1.15, 2.47, 0.9, glowMat(h, 0xffd54f));
    dollar(k, 1.0, 1.15, 2.47, 0.9, glowMat(h, 0xffd54f));
    k.cyl(0.24, 0.5, 0x37474f, 2.3, 2.66, 2.1, { seg: 14, open: true });
    k.cyl(0.21, 0.3, GOLD, 2.3, 2.55, 2.1, { seg: 12 });
    k.torus(0.24, 0.03, 0x90a4ae, 2.3, 2.9, 2.1, { rx: PI / 2, seg: 14 });
  }
  // speaker stacks on both sides, taller every level
  const sp = [1.5, 2.0, 2.4, 2.8, 3.2, 3.6][level] ?? 3.6;
  for (const s of [-1, 1]) {
    speaker(k, s * 3.3, 0, 0.9, 1.4, sp * 0.62, tr);
    speaker(k, s * 3.3, sp * 0.62, 0.9, 1.1, sp * 0.38, tr);
  }
  if (level >= 2) {
    // Party Mode: a truss over the booth with party lights in the three track colours
    truss(k, [-2.7, 0, 2.3], [-2.7, 6, 2.3], 0.3, 0x9e9e9e);
    truss(k, [2.7, 0, 2.3], [2.7, 6, 2.3], 0.3, 0x9e9e9e);
    truss(k, [-2.85, 6, 2.3], [2.85, 6, 2.3], 0.3, 0x9e9e9e);
    for (const x of [-2.7, 2.7]) k.box(0.7, 0.08, 0.7, STEEL, x, 0.04, 2.3);
    TRACKS.forEach((col, i) => partyLight(k, (i - 1) * 1.6, 5.85, 2.3, glowMat(h, col), 0.6));
  }
  if (level >= 4) {
    // Audio Visualizer: a screen on two posts behind the DJ, with bars in the track colour
    for (const x of [-2.0, 2.0]) {
      k.cyl(0.1, 7.6, STEEL, x, 3.8, -1.5, { seg: 8 });
      k.box(0.6, 0.08, 0.6, STEEL, x, 0.04, -1.5);
    }
    k.box(4.6, 2.5, 0.25, 0x15151c, 0, 6.4, -1.4, { r: 0.06 });
    k.box(4.3, 2.2, 0.04, 0x0b0b10, 0, 6.4, -1.26);
    [0.6, 1.2, 1.8, 1.0, 1.6, 0.8, 1.3].forEach((bh, i) => k.box(0.4, bh, 0.05, tr, (i - 3) * 0.55, 5.45 + bh / 2, -1.23));
  }
  if (rave) {
    // Apocalypse Rave: a laser pole for every track, with beams fanning up
    TRACKS.forEach((col, i) => {
      const x = (i - 1) * 2.2;
      const m = glowMat(h, col);
      k.cyl(0.3, 0.2, INK, x, 0.1, -2.5, { seg: 12 });
      k.cyl(0.1, 8.5, STEEL, x, 4.35, -2.5, { seg: 8 });
      k.box(0.5, 0.45, 0.5, INK, x, 8.7, -2.5, { r: 0.06 });
      k.ball(0.22, m, x, 8.7, -2.2, { seg: 10, rows: 7 });
      for (const a of [-0.5, 0.5]) k.cyl(0.025, 3.0, m, x + Math.sin(a) * 1.5, 8.7 + Math.cos(a) * 1.5, -2.2, { seg: 4, rz: -a });
    });
  }
  k.done();
  for (const x of [-1.6, 1.6]) platter(h, h.root, key, x - 0.08, 2.62, 1.7, 0.48, tr);
  h.idleSpin = 3; // the records keep turning

  h.rightArm.rotation.set(-1.3, 0, 0.2);
  h.leftArm.rotation.set(-1.3, 0, -0.2);
  h.pose = { right: -1.3, left: -1.3, leftRecoil: 0 };
  h.bob = 0.2;
  h.muzzles = [];
  return own(h, 0);
}

// ------------------------------------------------------------------ EDJ

/**
 * EDJ (alternate DJ form with two paths): a DJ with long pink hair, headphones and a light-up
 * visor behind a small neon deck with one turning record. Top path (cyan): speakers taller every
 * level, Lv 2 a subwoofer, Lv 3 stage lights on poles, Lv 4 a smoke machine, Lv 5 gold lights
 * and trim. Bottom path (green): Lv 1 a sampler pad, Lv 2 a mic, Lv 3 a gold "$" sign, Lv 4 a
 * purple outfit, a cape and cat-ear headphones, Lv 5 a rave truss with three coloured lights.
 */
export function makeEDJ(level, bottom = false) {
  const top = !bottom;
  const cosplay = bottom && level >= 4;
  const gold = top && level >= 5;
  const shirt = cosplay ? 0x4a148c : 0x263238;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x212121, arms: 0xe0ac69, face: 'smile' });
  const key = `djEdj${bottom ? 'B' : 'T'}${level}`;
  const neon = glowMat(h, bottom ? 0x69f0ae : 0x00e5ff);
  const shard = shardOf(h);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // long pink hair down the back, a fringe and a high ponytail
  const pink = 0xd81b60;
  hair(hd, pink, { h: 0.46 });
  hd.box(1.3, 1.3, 0.3, pink, 0, 0.45, -0.58, { r: 0.12 });
  hd.box(0.95, 0.18, 0.22, tone(pink, 0.9), 0.12, 1.12, 0.52, { rx: -0.5, rz: 0.12, r: 0.06 });
  hd.ball(0.22, pink, 0, 1.22, -0.68, { seg: 10, rows: 7 });
  hd.cyl(0.2, 1.0, pink, 0, 0.78, -0.86, { seg: 10, r2: 0.1, rx: PI + 0.3 }); // the ponytail falling down the back
  hd.torus(0.19, 0.05, neon, 0, 1.18, -0.72, { rx: PI / 2 + 0.3, seg: 12 }); // hair tie
  headphones(hd, cosplay ? 0xf8bbd0 : 0x212121, neon, { r: 0.82 });
  if (cosplay) for (const s of [-1, 1]) hd.cyl(0.24, 0.42, 0xf8bbd0, s * 0.42, 1.68, 0, { seg: 3, r2: 0.01, rz: s * -0.35 }); // cat ears
  band(hd, 0.7, 0.05, 0.24, 1.9, neon, 0.62); // the visor
  // a cropped jacket over a top, with the shard on the chest
  for (const s of [-1, 1]) t.box(0.75, 1.5, 1.12, tone(shirt, 1.3), s * 0.66, 0.25, 0, { r: 0.08 });
  t.box(2.24, 0.16, 1.16, neon, 0, -0.5, 0); // light strip round the waist
  t.box(0.34, 0.34, 0.05, shard, -0.4, 0.4, 0.55, { rz: PI / 4 });
  belt(t, 0x111111, 0xb0bec5, -0.85);
  if (cosplay) {
    // Cosplay Party: a long purple cape with a gold clasp
    t.slab(2.1, 3.2, 0.1, 0x7b1fa2, 0, -0.75, -0.65, { tw: 0.95, bw: 1.3 });
    t.cyl(0.14, 0.08, GOLD, 0, 0.9, 0.58, { axis: 'z', seg: 12 });
  }
  hd.done();
  t.done();
  sleeves(h, key, tone(shirt, 1.3), null, (a) => a.box(1.08, 0.14, 1.08, neon, 0, -1.4, 0));
  feet(h, key, 0xfafafa, (b) => b.box(1.14, 0.14, 1.26, pink, 0, -1.9, 0.06));

  // a small deck: one turntable, a pad of lit buttons and a neon strip
  const k = wear(h, h.root, `${key}:deck`);
  k.box(2.7, 2.1, 1.0, 0x1c1c24, 0, 1.05, 1.5, { r: 0.08 });
  k.box(2.9, 0.12, 1.2, 0x2a2a34, 0, 2.16, 1.5, { r: 0.04 });
  k.box(2.6, 0.18, 0.05, neon, 0, 1.55, 2.02);
  k.box(2.6, 0.1, 0.05, neon, 0, 0.35, 2.02);
  k.box(0.3, 0.3, 0.05, shard, 0, 0.95, 2.03, { rz: PI / 4 });
  turntable(k, -0.6, 2.3, 1.5, 1.2, 1.0, neon);
  // a controller: a grid of lit pads and two knobs
  k.box(0.9, 0.14, 0.8, 0x30303a, 0.75, 2.29, 1.5, { r: 0.03 });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) k.box(0.18, 0.05, 0.18, (r + c) % 2 ? neon : 0x455a64, 0.55 + c * 0.22, 2.38, 1.3 + r * 0.22);
  if (bottom && level >= 1) {
    // Sound Effects: a sampler with a row of big round buttons
    k.box(1.0, 0.3, 0.5, 0x37474f, 1.85, 2.35, 1.5, { r: 0.04 });
    for (let i = 0; i < 4; i++) k.cyl(0.08, 0.06, i % 2 ? neon : 0xff4081, 1.5 + i * 0.23, 2.52, 1.5, { seg: 10 });
  }
  if (bottom && level >= 2) {
    // Nice Rhythm: a mic on a boom stand at the side of the deck
    k.cyl(0.25, 0.06, INK, -1.75, 0.03, 2.1, { seg: 12 });
    k.cyl(0.04, 3.2, STEEL, -1.75, 1.6, 2.1, { seg: 6 });
    k.tube([[-1.75, 3.2, 2.1], [-1.4, 3.6, 2.2], [-0.9, 3.9, 2.2]], 0.03, STEEL, { seg: 8, sides: 5 });
    k.cyl(0.09, 0.3, 0x212121, -0.8, 3.95, 2.2, { seg: 10, rz: 1.2 });
    k.ball(0.11, 0x9e9e9e, -0.65, 3.9, 2.2, { seg: 8, rows: 6 });
  }
  if (bottom && level >= 3) dollar(k, -0.75, 0.95, 2.04, 0.75, glowMat(h, 0xffd54f));
  // speakers: taller on the Top path
  const sp = top ? [1.2, 1.6, 1.8, 2.2, 2.5, 2.9][level] ?? 2.9 : 1.2 + level * 0.15;
  for (const s of [-1, 1]) speaker(k, s * 1.95, 0, 0.8, 0.95, sp, neon);
  if (top && level >= 2) {
    // Aggressive Tracks: a subwoofer on the ground in front
    k.box(1.3, 0.9, 0.9, 0x15151c, 1.7, 0.45, 2.3, { r: 0.06 });
    k.cyl(0.36, 0.08, 0x2a2a2a, 1.7, 0.45, 2.76, { axis: 'z', seg: 18 });
    k.cyl(0.3, 0.14, 0x1c1c1c, 1.7, 0.45, 2.72, { axis: 'z', seg: 16, r2: 0.1 });
    k.box(1.32, 0.06, 0.92, neon, 1.7, 0.9, 2.3);
  }
  if (top && level >= 3) {
    // Rally Call: stage lights on poles (gold at Showdown)
    const lamp = glowMat(h, gold ? 0xffd54f : 0x00e5ff);
    for (const s of [-1, 1]) {
      k.cyl(0.28, 0.12, INK, s * 2.7, 0.06, 0.2, { seg: 12 });
      k.cyl(0.08, 5.0, gold ? GOLD : 0x9e9e9e, s * 2.7, 2.5, 0.2, { seg: 8 });
      partyLight(k, s * 2.7, 5.3, 0.2, lamp, 0.7);
      k.box(0.6, 0.12, 0.3, gold ? GOLD : 0x9e9e9e, s * 2.7, 5.06, 0.2);
    }
  }
  if (top && level >= 4) {
    // Encore: a smoke machine puffing at the front
    k.box(0.9, 0.5, 0.6, 0x37474f, -1.6, 0.25, 2.3, { r: 0.05 });
    k.cyl(0.1, 0.2, INK, -1.6, 0.25, 2.65, { axis: 'z', seg: 10 });
    for (const [dx, dy, r] of [[0.1, 0.35, 0.22], [0.4, 0.5, 0.28], [0.75, 0.62, 0.32]]) k.ball(r, 0xe0e0e0, -1.6 + dx, dy, 2.85 + dx * 0.3, { seg: 10, rows: 7 });
  }
  if (gold) for (const s of [-1, 1]) k.box(0.99, 0.1, 0.94, GOLD, s * 1.95, sp + 0.05, 0.8); // gold trim on the speakers
  if (bottom && level >= 5) {
    // DJ Rave: a truss over the deck with three coloured lights
    truss(k, [-2.6, 0, 0.0], [-2.6, 5.8, 0.0], 0.28, 0x9e9e9e);
    truss(k, [2.6, 0, 0.0], [2.6, 5.8, 0.0], 0.28, 0x9e9e9e);
    truss(k, [-2.74, 5.8, 0.0], [2.74, 5.8, 0.0], 0.28, 0x9e9e9e);
    [0xff1744, 0x76ff03, 0x2979ff].forEach((c, i) => partyLight(k, (i - 1) * 1.3, 5.65, 0.0, glowMat(h, c), 0.8));
  }
  k.done();
  platter(h, h.root, key, -0.68, 2.44, 1.5, 0.44, neon);
  h.idleSpin = 3;

  h.rightArm.rotation.set(-1.3, 0, 0.2);
  h.leftArm.rotation.set(-1.3, 0, -0.2);
  h.pose = { right: -1.3, left: -1.3, leftRecoil: 0 };
  h.bob = 0.18;
  h.muzzles = [];
  return own(h, 0);
}
export const makeEDJBottom = (level) => makeEDJ(level, true);

// ------------------------------------------------------------------ Anarchist

/**
 * Anarchist (Versus): a hoodie, a beanie, a red bandana and a compact SMG. Lv 1 a red armband, a
 * spray can and a backpack of android parts, Lv 2 a gas mask and smoke grenades on a strap, Lv 3
 * a little robot buddy on the shoulder, Lv 4 No Mercy: a red jacket, a rack of fireworks on its
 * back and red tape on the gun.
 */
export function makeAnarchist(level) {
  const mercy = level >= 4;
  const jacket = mercy ? 0xb71c1c : 0x212121;
  const h = makeHumanoid({ skin: 0xd9a066, shirt: jacket, pants: 0x263238, arms: jacket, face: 'soldier' });
  const key = `anarchist${level}`;
  const eye = glowMat(h, 0x00e5ff);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  beanie(hd, 0x37474f);
  if (level >= 2) gasMask(hd, 0x424242, glowMat(h, 0xffa000));
  else {
    // a red bandana over the mouth, its point hanging down
    band(hd, 0.67, 0.06, 0.45, 2.6, RED, 0.3);
    hd.cyl(0.36, 0.06, RED, 0, 0.0, 0.6, { axis: 'z', seg: 3, rz: PI, sy: 0.9 });
    for (let i = 0; i < 3; i++) hd.ball(0.03, 0xfafafa, -0.25 + i * 0.25, 0.32, 0.68, { seg: 6, rows: 4 }); // print dots
  }
  // the hoodie: hood bunched at the back, drawstrings, front pocket, ribbed hem
  const hc = mercy ? 0x8e0000 : 0x2b2b2b;
  t.box(1.7, 0.6, 0.55, hc, 0, 0.92, -0.45, { r: 0.2 });
  t.torus(0.62, 0.12, hc, 0, 1.0, -0.05, { rx: PI / 2, seg: 16, arc: PI, rz: PI });
  for (const s of [-1, 1]) {
    t.cyl(0.03, 0.55, 0xeeeeee, s * 0.2, 0.62, 0.53, { seg: 5 });
    t.ball(0.05, 0xeeeeee, s * 0.2, 0.33, 0.54, { seg: 6, rows: 4 });
  }
  t.slab(1.2, 0.55, 0.08, tone(jacket, 0.8), 0, -0.5, 0.52, { tw: 0.75 });
  t.box(2.04, 0.2, 1.04, tone(jacket, 0.75), 0, -0.9, 0);
  // the anarchy patch: a red ring with an "A"
  t.cyl(0.3, 0.04, 0xfafafa, 0.5, 0.35, 0.52, { axis: 'z', seg: 16 });
  t.torus(0.27, 0.04, RED, 0.5, 0.35, 0.55, { seg: 16 });
  for (const s of [-1, 1]) t.box(0.05, 0.42, 0.03, RED, 0.5 + s * 0.08, 0.33, 0.55, { rz: s * -0.35 });
  t.box(0.2, 0.05, 0.03, RED, 0.5, 0.3, 0.55);
  if (level >= 1) {
    // Attrition: a spray can on the hip
    t.cyl(0.14, 0.5, 0x76ff03, -0.9, -0.75, 0.42, { seg: 10 });
    t.cyl(0.1, 0.1, 0xeeeeee, -0.9, -0.45, 0.42, { seg: 8 });
    t.box(0.06, 0.06, 0.08, INK, -0.9, -0.38, 0.5);
    if (!mercy) {
      // a backpack of android parts: an arm with a claw and a camera eye stick out of the top
      pack(t, 0x37474f, { w: 1.4, h: 1.45, d: 0.6 });
      t.tube([[0.3, 0.7, -0.85], [0.45, 1.4, -0.95], [0.75, 1.75, -0.9]], 0.07, 0x9e9e9e, { seg: 10, sides: 6 });
      for (const s of [-1, 1]) t.box(0.05, 0.25, 0.08, 0x757575, 0.78 + s * 0.08, 1.9, -0.9, { rz: s * 0.4 });
      t.box(0.4, 0.3, 0.3, 0xb0bec5, -0.35, 0.85, -0.85, { r: 0.05 });
      t.cyl(0.08, 0.06, eye, -0.35, 0.85, -0.69, { axis: 'z', seg: 10 });
    }
  }
  if (level >= 2) {
    // Smokes: a strap of smoke grenades across the chest and more on the belt
    sash(t, 0x5d4037, 1, 0.3);
    for (const v of [-0.55, 0, 0.55]) {
      const x = -Math.sin(0.62) * v;
      const y = Math.cos(0.62) * v;
      t.cyl(0.13, 0.36, 0x9e9e9e, x, y, 0.68, { seg: 10 });
      t.cyl(0.135, 0.06, 0x76ff03, x, y + 0.08, 0.68, { seg: 10 });
      t.torus(0.06, 0.015, 0xcfd8dc, x + 0.1, y + 0.2, 0.68, { seg: 8 });
    }
  }
  belt(t, 0x111111, 0x9e9e9e);
  if (level >= 2) for (const x of [-0.25, 0.25, 0.75]) {
    t.cyl(0.13, 0.4, 0x9e9e9e, x, -1.05, 0.66, { seg: 10 });
    t.cyl(0.135, 0.06, 0xb0bec5, x, -0.9, 0.66, { seg: 10 });
  }
  if (mercy) {
    // No Mercy: a rack of fireworks on its back
    t.box(1.7, 1.5, 0.35, 0x1a1a1a, 0, 0.15, -0.72, { r: 0.05 });
    for (const s of [-1, 1]) t.box(0.12, 2.3, 0.12, 0x1a1a1a, s * 0.78, 0.9, -0.95);
    t.box(1.7, 0.12, 0.5, 0x1a1a1a, 0, 1.0, -1.0);
    [0xffeb3b, 0x00e5ff, 0xff4081, 0x76ff03].forEach((c, i) => firework(t, -0.57 + i * 0.38, 1.1, -1.0, 0.13, 0.9, 0xeeeeee, c));
  }
  hd.done();
  t.done();
  if (level >= 3) {
    // Super Bots: a little robot buddy riding the left shoulder
    const bot = new THREE.Group();
    bot.position.set(1.5, 1.35, 0);
    h.torso.add(bot);
    const b = wear(h, bot, `${key}:bot`);
    b.box(0.75, 0.6, 0.65, 0xb0bec5, 0, 0.3, 0, { r: 0.14 });
    b.box(0.58, 0.22, 0.05, INK, 0, 0.36, 0.33, { r: 0.04 });
    for (const s of [-1, 1]) b.cyl(0.07, 0.04, eye, s * 0.14, 0.36, 0.36, { axis: 'z', seg: 10 });
    b.cyl(0.03, 0.4, INK, 0.15, 0.8, 0, { seg: 5 });
    b.ball(0.07, glowMat(h, 0xff1744), 0.15, 1.02, 0, { seg: 8, rows: 5 });
    for (const s of [-1, 1]) {
      b.cyl(0.11, 0.08, 0x78909c, s * 0.42, 0.3, 0, { axis: 'x', seg: 10 });
      b.box(0.1, 0.3, 0.12, 0x78909c, s * 0.22, -0.08, 0.1, { r: 0.03 }); // little legs
    }
    b.box(0.2, 0.06, 0.04, 0xff7043, 0, 0.12, 0.33); // a mouth light
    b.done();
  }
  sleeves(h, key, jacket, 0x1a1a1a, (a, s) => {
    if (s > 0 && level >= 1) a.box(1.08, 0.35, 1.08, RED, 0, -0.55, 0, { r: 0.04 }); // armband
  });
  feet(h, key, 0x263238, (b) => {
    b.box(1.12, 0.14, 1.24, 0xfafafa, 0, -1.9, 0.06); // white soles
    b.box(0.05, 0.3, 0.7, 0xfafafa, 0.54, -1.68, 0.1); // side stripe
  });
  const g = fist(h.rightArm, -1.9, 1.25);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = smg(gk, { body: 0x1f1f1f });
  if (mercy) for (const yy of [-0.95, -1.12]) gk.cyl(0.1, 0.07, RED, 0, yy, UP + 0.04, { seg: 10 }); // red tape
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = mercy ? 0xff5252 : 0xffd54f;
  return own(h);
}

// ------------------------------------------------------------------ Machine Gunner

/**
 * A heavy machine gun on the fist (gun space): a long receiver with a feed cover, a perforated
 * barrel jacket, a carry handle, a hanging ammo can and a belt of rounds. o: len, body, twin
 * (two barrels side by side), fins (a finned Browning jacket), belt (brass belt into the gun),
 * shield (an AA gun shield and ring sight), laser (a glowing coil instead of a barrel), cells.
 * Returns the bore points [[x, y, z], ...].
 */
function hmg(k, o = {}) {
  const len = o.len ?? 2.0;
  const body = o.body ?? GUNMETAL;
  const U = UP + 0.04;
  k.box(0.44, 1.2, 0.48, body, 0, -0.3, U, { r: 0.05 }); // receiver
  k.box(0.46, 0.8, 0.1, tone(body, 0.8), 0, -0.4, U + 0.28, { r: 0.03 }); // feed cover
  k.box(0.1, 0.14, 0.12, INK, 0.2, -0.05, U + 0.3); // latch
  for (let i = 0; i < 4; i++) k.box(0.47, 0.04, 0.05, INK, 0, -0.1 - i * 0.18, U - 0.1); // side ribs
  k.box(0.3, 0.3, 0.32, tone(body, 0.75), 0, 0.42, U, { r: 0.04 }); // back plate
  k.box(0.22, 0.26, 0.5, INK, 0, 0.3, U - 0.36, { rx: -0.3, r: 0.04 }); // pistol grip
  k.torus(0.1, 0.022, INK, 0, 0.05, U - 0.24, { ry: PI / 2, seg: 10, arc: PI });
  k.tube([[0, 0.0, U + 0.33], [0, -0.1, U + 0.65], [0, -0.75, U + 0.65], [0, -0.85, U + 0.33]], 0.045, INK, { seg: 10, sides: 6 }); // carry handle
  k.box(0.08, 0.1, 0.18, INK, 0, -0.9, U + 0.42); // rear sight
  const xs = o.twin ? [-0.17, 0.17] : [0];
  const out = [];
  const jl = len - 0.9;
  for (const x of xs) {
    const jy = -0.9 - jl / 2;
    if (o.laser) {
      k.cyl(0.13, jl, 0x263238, x, jy, U, { seg: 12 });
      const n = Math.max(3, Math.round(jl / 0.22));
      for (let i = 0; i < n; i++) k.torus(0.15, 0.04, o.laser, x, -1.0 - (i * (jl - 0.2)) / n, U, { rx: PI / 2, seg: 14 });
      k.cyl(0.18, 0.2, INK, x, -len + 0.1, U, { seg: 14, r2: 0.12 });
      k.cyl(0.11, 0.04, o.laser, x, -len - 0.01, U, { seg: 12 });
    } else {
      k.cyl(0.13, jl, tone(body, 0.9), x, jy, U, { seg: 12, open: false }); // barrel jacket
      if (o.fins) for (let i = 0; i < Math.round(jl / 0.12); i++) k.torus(0.135, 0.03, tone(body, 0.7), x, -0.95 - i * 0.12, U, { rx: PI / 2, seg: 12 });
      else for (let i = 0; i < 4; i++) for (const a of [0, PI / 2, PI, -PI / 2]) k.box(0.05, 0.12, 0.05, 0x050505, x + Math.sin(a) * 0.13, -1.05 - i * jl * 0.2, U + Math.cos(a) * 0.13); // cooling holes
      k.cyl(0.06, 0.4, STEEL, x, -len - 0.1, U, { seg: 8 });
      k.cyl(0.1, 0.22, INK, x, -len - 0.38, U, { seg: 10, r2: 0.08 }); // flash hider
    }
    out.push([x, -len - (o.laser ? 0.05 : 0.5), U]);
  }
  k.box(0.06, 0.12, 0.18, INK, 0, -len + 0.15, U + 0.2); // front sight
  for (const s of [-1, 1]) k.tube([[s * 0.06, -len + 0.4, U - 0.12], [s * 0.12, -len + 1.0, U - 0.18]], 0.025, INK, { seg: 2, sides: 4 }); // folded bipod
  // the ammo can hanging on the left with its lid and handle
  k.box(0.32, 0.55, 0.5, o.can ?? 0x4b5320, 0.42, -0.3, U - 0.4, { r: 0.03 });
  k.box(0.34, 0.57, 0.08, tone(o.can ?? 0x4b5320, 0.8), 0.42, -0.3, U - 0.12);
  k.box(0.04, 0.3, 0.06, INK, 0.6, -0.3, U - 0.35);
  if (o.belt) {
    for (let i = 0; i < 5; i++) {
      const f = i / 4;
      k.cyl(0.045, 0.22, BRASS, 0.3 - f * 0.05, -0.15 - f * 0.25, U - 0.1 + f * 0.25, { axis: 'x', seg: 6 });
    }
  }
  if (o.cells) for (const s of [-1, 1]) {
    k.box(0.18, 0.45, 0.22, 0x37474f, s * 0.3, -0.45, U + 0.05, { r: 0.03 });
    k.box(0.12, 0.35, 0.05, o.cells, s * 0.37, -0.45, U + 0.05);
  }
  if (o.shield) {
    // an AA shield with a sight window and a ring sight on top
    k.slab(1.6, 1.1, 0.08, 0x546e7a, 0, -1.0, U + 0.1, { rx: PI / 2, tw: 0.8 });
    k.box(0.3, 0.05, 0.28, INK, 0, -1.02, U + 0.45);
    k.torus(0.3, 0.025, INK, 0, -0.6, U + 0.85, { rx: PI / 2, seg: 16 });
    k.box(0.04, 0.04, 0.6, INK, 0, -0.6, U + 0.55);
    for (const s of [-1, 1]) k.box(0.05, 0.05, 0.12, INK, s * 0.75, -1.0, U + 0.1);
  }
  return out;
}

/**
 * Machine Gunner (alternate Gatling Gun form with two paths): a helmeted gunner behind a row of
 * sandbags with a heavy machine gun. Top: Lv 1 a heavier gun, Lv 2 a brass ammo belt and a
 * bandolier, Lv 3 a finned Browning MG, Lv 4 twin barrels, Lv 5 an AA shield and ring sight.
 * Bottom: Lv 1 cooling fins, Lv 2 a longer barrel, Lv 3 a glowing Laser MG and a visor, Lv 4
 * laser cells, Lv 5 an overcharge core and armour plates.
 */
export function makeMachineGunner(level, bottom = false) {
  const top = !bottom;
  const laser = bottom && level >= 3;
  const shirt = laser ? 0x263238 : 0x5d6b3a;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: laser ? 0x1c1f26 : 0x4b5320, arms: shirt, face: 'soldier' });
  const key = `gatlingMachine${bottom ? 'B' : 'T'}${level}`;
  const beam = glowMat(h, 0xff1744);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  helmet(hd, laser ? 0x1c1f26 : 0x556b2f, { cover: laser ? 0x37474f : 0x3e4a2a });
  if (laser) band(hd, 0.7, 0.05, 0.24, 1.9, beam, 0.72); // visor
  else goggles(hd, 1.22, 0x8d6e63, { r: 0.77, strap: 0x3e4a2a });
  collar(t, tone(shirt, 0.85));
  belt(t, 0x3e2723);
  pouch(t, -0.55, -0.98, 0.52, 0.4, 0.36, 0x4b5320);
  pouch(t, 0.55, -0.98, 0.52, 0.4, 0.36, 0x4b5320);
  if (top && level >= 2) {
    // a bandolier of big rounds across the chest
    t.box(0.32, 2.5, 1.12, 0x4e342e, 0, 0, 0, { rz: 0.62 });
    for (let i = 0; i < 7; i++) {
      const v = -0.85 + i * 0.28;
      t.cyl(0.075, 0.3, BRASS, -Math.sin(0.62) * v, Math.cos(0.62) * v, 0.62, { rz: 0.62 + PI / 2, seg: 6 });
    }
  }
  if (level >= 3 && top) t.box(2.2, 1.3, 1.18, 0x4b5530, 0, 0.35, 0, { r: 0.12 }); // flak vest
  if (bottom && level >= 5) {
    // Over Charge: armour plates on the shoulders and a glowing core
    for (const s of [-1, 1]) t.box(0.75, 0.5, 1.3, 0x37474f, s * 1.35, 0.95, 0, { r: 0.1 });
    t.cyl(0.38, 0.12, 0x37474f, 0, 0.3, 0.56, { axis: 'z', seg: 16 });
    t.cyl(0.28, 0.08, beam, 0, 0.3, 0.63, { axis: 'z', seg: 16 });
  }
  hd.done();
  t.done();
  hands(h, key, 0x3e2723, tone(shirt, 0.8), (a, s) => armPatch(a, s, tone(shirt, 0.8), s > 0 ? (laser ? 0xff1744 : 0xffd54f) : null));
  feet(h, key, 0x3e2723, level >= 2 ? kneePad : null);
  // sandbags in front of its feet, two rows
  const sb = wear(h, h.root, `${key}:bags`);
  for (const x of [-1.0, 0, 1.0]) bag(sb, 0.95, 0.6, x, 0, 1.45, 0xa1887f, x * 0.1);
  for (const x of [-0.5, 0.5]) bag(sb, 0.95, 0.6, x, 0.32, 1.45, 0x8d6e63, -x * 0.1);
  sb.done();
  const len = top ? (level >= 3 ? 2.3 : level >= 1 ? 2.1 : 1.95) : level >= 2 ? 2.4 : 2.0;
  const g = fist(h.rightArm, -1.9, 1.3);
  const gk = wear(h, g, `${key}:gun`);
  const bores = hmg(gk, {
    len,
    body: laser ? 0x37474f : GUNMETAL,
    belt: top && level >= 2,
    fins: (top && level >= 3) || (bottom && level >= 1 && !laser),
    twin: top && level >= 4,
    shield: top && level >= 5,
    laser: laser ? beam : null,
    cells: bottom && level >= 4 ? glowMat(h, 0x00e5ff) : null,
    can: laser ? 0x263238 : 0x4b5320,
  });
  gk.done();
  h.muzzles = [];
  for (const [x, y, z] of bores) muzzle(h, g, y, z, x);
  aimLong(h);
  h.tracer = laser ? 0xff1744 : 0xffd54f;
  if (laser) h.tracerWidth = 0.16;
  return own(h);
}
export const makeMachineGunnerBottom = (level) => makeMachineGunner(level, true);

// ------------------------------------------------------------------ Elf

/**
 * Elf (event): a green tunic with a jagged hem, pointy ears, curly shoes with bells and a long
 * striped hat, throwing presents. Lv 1 a sack of presents, Lv 2 a headset, Lv 3 a big gold
 * present, Lv 4 Fireworks: a rack of rockets on its back and a lit fuse on the present.
 */
export function makeElf(level) {
  const skin = 0xf1c27d;
  const green = 0x2e7d32;
  const h = makeHumanoid({ skin, shirt: green, pants: 0xc62828, arms: green, face: 'smile' });
  const key = `elf${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0xa1662f, { h: 0.4 });
  // pointy ears
  for (const s of [-1, 1]) {
    hd.cyl(0.15, 0.6, skin, s * 0.86, 0.8, -0.02, { seg: 5, r2: 0.01, rz: -s * 1.15, sz: 0.5 });
    hd.cyl(0.07, 0.35, 0xe8a87c, s * 0.82, 0.78, 0.02, { seg: 5, r2: 0.01, rz: -s * 1.15, sz: 0.4 });
  }
  // the hat: a fur cuff, a long cone of stripes leaning back, and a bobble
  hd.cyl(0.74, 0.26, SNOW, 0, 1.02, 0, { seg: 22 });
  let p = [0, 1.12, -0.02];
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = -0.15 - i * 0.22;
    const len = 0.42;
    const r0 = 0.68 * (1 - i / n) + 0.04;
    const r1 = 0.68 * (1 - (i + 1) / n) + 0.04;
    const d = [0, Math.cos(a), Math.sin(a)];
    hd.cyl(r0, len * 1.08, i % 2 ? SNOW : green, p[0], p[1] + (d[1] * len) / 2, p[2] + (d[2] * len) / 2, { r2: r1, rx: a, seg: 14 });
    p = [p[0], p[1] + d[1] * len, p[2] + d[2] * len];
  }
  hd.ball(0.2, SNOW, p[0], p[1], p[2], { seg: 10, rows: 7 });
  if (level >= 2) {
    // Elf Tech: a headset with a glowing mic
    headset(hd, 0x212121);
    hd.ball(0.09, glowMat(h, 0x76ff03), -0.3, 0.36, 0.66, { seg: 8, rows: 5 });
  }
  // the tunic: jagged hem below the belt, a pointed collar, gold buttons
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI * 2;
    t.cyl(0.26, 0.45, green, Math.sin(a) * 1.0, -1.1, Math.cos(a) * 0.55, { seg: 4, r2: 0.01, rx: PI, ry: a });
  }
  t.box(2.14, 0.3, 1.14, tone(green, 0.85), 0, -0.95, 0, { r: 0.05 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    t.cyl(0.18, 0.34, RED, Math.sin(a) * 0.72, 0.95, Math.cos(a) * 0.5, { seg: 4, r2: 0.01, rz: -(PI / 2 + 0.4), ry: a - PI / 2 }); // collar points
  }
  t.cyl(0.66, 0.16, RED, 0, 0.98, 0, { seg: 16, sz: 0.75 });
  belt(t, 0x3e2723, GOLD, -0.62);
  for (const y of [0.55, 0.15, -0.25]) t.ball(0.07, GOLD, 0, y, 0.53, { seg: 8, rows: 5 });
  if (level >= 1) {
    // Rapid Reload: a sack of presents over the back, tied with rope
    t.ball(0.9, 0x8d6e63, 0, 0.1, -1.15, { sy: 1.05, sz: 0.65, seg: 14, rows: 9 });
    t.cyl(0.34, 0.3, 0x8d6e63, 0, 1.05, -1.15, { seg: 12, r2: 0.48 });
    t.torus(0.32, 0.05, 0xd7ccc8, 0, 0.92, -1.15, { rx: PI / 2, seg: 14 });
    gift(t, -0.25, 1.35, -1.15, 0.5, 0x1e88e5, 0xffeb3b, { ry: 0.4 });
    gift(t, 0.3, 1.3, -1.05, 0.42, RED, SNOW, { ry: -0.3 });
    t.box(0.12, 2.3, 1.15, 0xd7ccc8, 0, 0.1, -0.05, { rz: 0.62 }); // rope over the shoulder
  }
  if (level >= 4) {
    // Fireworks: a rack of rockets on the back
    t.box(1.7, 0.14, 0.5, 0x5d4037, 0, 0.9, -1.7);
    for (const s of [-1, 1]) t.box(0.12, 1.6, 0.12, 0x5d4037, s * 0.8, 0.25, -1.6);
    [[-0.55, 0xff1744], [0, 0xffea00], [0.55, 0x2979ff]].forEach(([x, c]) => firework(t, x, 1.0, -1.7, 0.16, 1.1, c, SNOW));
  }
  hd.done();
  t.done();
  hands(h, key, null, SNOW, (a) => a.box(1.08, 0.2, 1.08, SNOW, 0, -1.5, 0));
  feet(h, key, 0x1b5e20, (b) => {
    // curly toes with a bell
    b.tube([[0, -1.9, 0.5], [0, -1.85, 0.85], [0, -1.6, 1.0], [0, -1.45, 0.85]], 0.13, 0x1b5e20, { seg: 12, sides: 8 });
    b.ball(0.12, GOLD, 0, -1.42, 0.78, { seg: 8, rows: 6 });
    b.box(1.12, 0.14, 1.14, SNOW, 0, -1.38, 0.02);
  });
  // the present in the raised right hand
  const boom = level >= 3;
  const g = fist(h.rightArm, -2.2);
  const gk = wear(h, g, `${key}:gift`);
  const s = boom ? 0.8 : 0.65;
  gift(gk, 0, -0.15, 0, s, boom ? 0xffd54f : RED, boom ? RED : 0x43a047);
  if (level >= 4) {
    gk.cyl(0.03, 0.4, 0x5d4037, 0.15, s / 2 + 0.05, 0.15, { seg: 5, rz: -0.4 });
    gk.ball(0.08, glowMat(h, 0xffeb3b), 0.25, s / 2 + 0.25, 0.15, { seg: 8, rows: 6 });
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, -0.3, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-0.6, 0, -0.3);
  h.pose = { right: -2.8, left: -0.6, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = level >= 4 ? { color: 0xff1744, size: 0.6, arc: 5, glowing: true } : { color: boom ? 0xffd54f : 0xc62828, size: 0.55, arc: 4.5 };
  return own(h, 0);
}

// ------------------------------------------------------------------ Hallowboomer

/**
 * Hallowboomer (event): a scarecrow with a carved pumpkin head throwing flaming pumpkins. A patched
 * flannel shirt, a rope belt and straw poking out. Lv 1 round glasses, Lv 2 a rake on its back
 * and leaves at its feet, Lv 3 a jug of glowing pumpkin juice, Lv 4 Spooky Rampage: green fire, a
 * tattered purple cape and a ring of little pumpkins.
 */
export function makeHallowboomer(level) {
  const spooky = level >= 4;
  const shirt = 0x6d4c41;
  const h = makeHumanoid({ skin: 0xef6c00, shirt, pants: 0x37474f, arms: shirt });
  const key = `hallowboomer${level}`;
  const lit = glowMat(h, spooky ? 0x76ff03 : 0xffab00);
  const fire = glowMat(h, spooky ? 0x76ff03 : 0xff3d00);
  const straw = 0xfbc02d;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  pumpkin(hd, 0, 0.66, 0, 0.9, lit);
  if (level >= 1) {
    // Specs: round glasses on the pumpkin
    for (const s of [-1, 1]) hd.torus(0.2, 0.035, INK, s * 0.3, 0.86, 0.9, { seg: 16 });
    hd.box(0.2, 0.04, 0.04, INK, 0, 0.88, 0.92);
    for (const s of [-1, 1]) hd.box(0.04, 0.04, 0.5, INK, s * 0.5, 0.88, 0.68);
  }
  // a flannel shirt: plaid lines, patches with stitches, straw at the collar
  for (const y of [-0.55, 0.0, 0.55]) t.box(2.04, 0.08, 1.04, tone(shirt, 0.7), 0, y, 0);
  for (const x of [-0.6, 0, 0.6]) t.box(0.08, 2.0, 1.04, tone(shirt, 0.75), x, 0, 0);
  t.box(0.5, 0.45, 0.04, 0x8d6e63, 0.5, 0.3, 0.52);
  t.box(0.4, 0.4, 0.04, 0x455a64, -0.5, -0.35, 0.52, { rz: 0.2 });
  for (let i = 0; i < 4; i++) t.box(0.04, 0.12, 0.03, 0xd7ccc8, 0.3 + i * 0.13, 0.52, 0.55);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * PI * 2;
    t.cyl(0.05, 0.4, straw, Math.sin(a) * 0.6, 1.05, Math.cos(a) * 0.4, { seg: 4, r2: 0.01, rz: -(PI / 2 - 0.6), ry: a - PI / 2 });
  }
  // a rope belt with a knot, and straw poking out below it
  t.cyl(0.62, 0.18, 0xbcaaa4, 0, -0.75, 0, { seg: 18, sx: 1.72, sz: 0.92 });
  t.ball(0.14, 0xa1887f, 0.3, -0.75, 0.58, { seg: 8, rows: 6 });
  for (const s of [-1, 1]) t.cyl(0.04, 0.45, 0xbcaaa4, 0.3 + s * 0.08, -1.0, 0.6, { seg: 5, rz: s * 0.2 });
  for (let i = 0; i < 8; i++) t.cyl(0.05, 0.45, straw, -0.9 + i * 0.26, -1.1, 0.52 - (i % 2) * 0.05, { seg: 4, r2: 0.012, rx: PI, rz: (i - 3.5) * 0.06 });
  if (level >= 2) {
    // Raking Season: a rake strapped across the back
    t.cyl(0.06, 4.0, 0x795548, 0.3, 0.5, -0.65, { seg: 6, rz: 0.35 });
    t.box(1.2, 0.14, 0.14, 0x616161, 0.3 - Math.sin(0.35) * 2.0, 0.5 + Math.cos(0.35) * 2.0, -0.65, { rz: 0.35 });
    for (let i = 0; i < 7; i++) t.box(0.04, 0.3, 0.04, 0x757575, 0.3 - Math.sin(0.35) * 2.0 + Math.cos(0.35) * (i - 3) * 0.17, 0.5 + Math.cos(0.35) * 2.0 + 0.2 + Math.sin(0.35) * (i - 3) * 0.17, -0.65, { rz: 0.35 });
  }
  if (level >= 3) {
    // Pumpkin Juice: a glass jug of glowing juice on the belt
    t.cyl(0.32, 0.6, glassMat(h, 0xeeeeee, 0.45), -1.15, -0.9, 0.3, { seg: 14 });
    t.cyl(0.27, 0.42, glowMat(h, spooky ? 0x76ff03 : 0xff6d00), -1.15, -0.98, 0.3, { seg: 12 });
    t.cyl(0.12, 0.25, glassMat(h, 0xeeeeee, 0.45), -1.15, -0.48, 0.3, { seg: 10 });
    t.cyl(0.13, 0.1, 0x5d4037, -1.15, -0.32, 0.3, { seg: 10 });
    t.torus(0.17, 0.04, 0xeeeeee, -1.42, -0.85, 0.3, { ry: PI / 2, seg: 10 });
  }
  if (spooky) {
    // Spooky Rampage: a tattered purple cape with a jagged hem
    t.slab(2.2, 2.8, 0.1, 0x4a148c, 0, -0.5, -0.62, { bw: 1.2 });
    for (let i = 0; i < 6; i++) t.cyl(0.24, 0.5, 0x4a148c, -1.1 + i * 0.44, -2.1, -0.62, { seg: 3, r2: 0.01, rx: PI, sz: 0.3 });
    t.box(2.2, 0.25, 0.25, 0x6a1b9a, 0, 0.9, -0.5, { r: 0.08 });
  }
  hd.done();
  t.done();
  hands(h, key, 0x8d6e63, tone(shirt, 0.75), (a) => {
    for (let i = 0; i < 4; i++) a.cyl(0.05, 0.35, straw, -0.3 + i * 0.2, -1.55, 0.45 - (i % 2) * 0.9, { seg: 4, r2: 0.012, rx: PI + (i % 2 ? -0.5 : 0.5) });
  });
  feet(h, key, 0x4e342e, (b) => {
    b.box(1.04, 0.3, 0.04, 0x3e2723, 0.1, -1.7, 0.55); // a patch
    for (let i = 0; i < 3; i++) b.cyl(0.05, 0.4, straw, -0.3 + i * 0.3, -1.25, 0.5, { seg: 4, r2: 0.012, rx: PI - 0.4 });
  });
  if (level >= 2) {
    // fallen leaves at its feet (and, at Spooky Rampage, a ring of little lit pumpkins)
    const r = wear(h, h.root, `${key}:ground`);
    [[-1.5, 1.2, 0xd84315], [1.6, 0.8, 0xffa000], [-1.0, -1.4, 0xbf360c], [1.3, -1.2, 0xf9a825], [0.4, 1.7, 0xe65100], [-1.8, -0.2, 0xffb300]].forEach(([x, z, c], i) => {
      r.ball(0.35, c, x, 0.04, z, { sy: 0.12, sx: 1.2, seg: 8, rows: 4, ry: i });
      r.box(0.05, 0.03, 0.5, tone(c, 0.7), x, 0.08, z, { ry: i });
    });
    if (spooky) for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2 + 0.3;
      pumpkin(r, Math.cos(a) * 2.0, 0.3, Math.sin(a) * 2.0, 0.34, lit, { vine: false });
    }
    r.done();
  }
  // the flaming pumpkin in the raised right hand
  const g = fist(h.rightArm, -2.3);
  const gk = wear(h, g, `${key}:held`);
  const ps = level >= 2 ? 0.45 : 0.37;
  pumpkin(gk, 0, 0, 0, ps, lit, { vine: false });
  gk.cyl(ps * 0.45, ps * 1.1, fire, 0, ps * 1.15, 0, { seg: 8, r2: 0.01 });
  gk.cyl(ps * 0.25, ps * 0.8, fire, ps * 0.3, ps * 0.95, 0.05, { seg: 6, r2: 0.01, rz: -0.3 });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, -0.3, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-0.8, 0, -0.3);
  h.pose = { right: -2.8, left: -0.8, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = { color: spooky ? 0x76ff03 : 0xef6c00, size: level >= 2 ? 0.7 : 0.55, arc: 5, glowing: true };
  return own(h, 0);
}

// ------------------------------------------------------------------ Sleeter

/**
 * An ice blaster on the fist (gun space): a white body with a glass tank of glowing ice on top,
 * frost coils, a front grip and a cluster of ice crystals at the muzzle. o: len, body, light,
 * big (a fatter body and a second tank). Returns the tip y.
 */
function iceBlaster(k, o = {}) {
  const len = o.len ?? 1.9;
  const body = o.body ?? 0xeceff1;
  const U = UP + 0.02;
  const R = o.big ? 0.3 : 0.24;
  k.box(0.3, 0.5, 0.4, tone(body, 0.75), 0, 0.42, U - 0.04, { r: 0.06 }); // stock
  k.cyl(R, 1.0, body, 0, -0.35, U, { seg: 16 });
  k.cyl(R + 0.02, 0.08, 0x546e7a, 0, 0.14, U, { seg: 16 });
  k.box(0.22, 0.26, 0.5, INK, 0, 0.12, U - 0.36, { rx: -0.32, r: 0.04 }); // grip
  k.torus(0.1, 0.022, INK, 0, -0.12, U - 0.24, { ry: PI / 2, seg: 10, arc: PI });
  k.box(0.18, 0.18, 0.4, INK, 0, -0.75, U - 0.3, { r: 0.04 }); // front grip
  // the glass tank of glowing ice on top
  for (const dx of o.big ? [-0.12, 0.12] : [0]) {
    k.cyl(0.13, 0.6, o.glass, dx, -0.35, U + R + 0.1, { seg: 12 });
    k.cyl(0.09, 0.5, o.light, dx, -0.35, U + R + 0.1, { seg: 10 });
    for (const y of [-0.05, -0.65]) k.cyl(0.14, 0.05, 0x546e7a, dx, y, U + R + 0.1, { seg: 12 });
  }
  const bl = len - 0.85;
  k.cyl(0.12, bl, tone(body, 0.85), 0, -0.85 - bl / 2, U, { seg: 12 });
  for (let i = 0; i < 3; i++) k.torus(0.15, 0.04, o.light, 0, -0.95 - i * (bl - 0.3) / 3, U, { rx: PI / 2, seg: 14 });
  k.cyl(0.2, 0.2, 0x546e7a, 0, -len + 0.1, U, { seg: 14 });
  // ice crystals growing out of the muzzle, pointing forward
  k.cyl(0.01, 0.45, o.light, 0, -len - 0.2, U, { seg: 6, r2: 0.13, flat: true });
  for (const [dx, dz] of [[0.14, 0.08], [-0.13, 0.06], [0, -0.14]]) k.cyl(0.01, 0.3, o.light, dx, -len - 0.08, U + dz, { seg: 6, r2: 0.08, flat: true, rz: dx * 2, rx: dz * -2 });
  return -len - 0.42;
}

/**
 * Sleeter (event): a winter hero in a puffy parka with a fur-trimmed hood and an ice blaster.
 * Lv 1 a pack of glowing ice crystals, Lv 2 a radio, Lv 3 Arctic Gorilla: a white fur coat, big
 * furry shoulders and a bigger blaster, Lv 4 Subzero Hero: a glowing visor and an icy cape.
 */
export function makeSleeter(level) {
  const gorilla = level >= 3;
  const hero = level >= 4;
  const coat = gorilla ? 0xeceff1 : 0x1565c0;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: coat, pants: 0x263238, arms: coat, face: 'soldier' });
  const key = `sleeter${level}`;
  const ice = glowMat(h, 0x40c4ff);
  const fur = gorilla ? 0xcfd8dc : SNOW;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hood(hd, gorilla ? 0xcfd8dc : 0x0d47a1);
  hd.torus(0.62, 0.15, fur, 0, 0.62, 0.42, { seg: 20, sy: 1.1 }); // fur round the face
  if (hero) band(hd, 0.7, 0.05, 0.26, 1.9, ice, 0.72); // visor
  else goggles(hd, 1.18, ice, { r: 0.82, strap: 0x263238 });
  // the parka: quilted rows, a zip with toggles, a fur hem
  for (const y of [0.7, 0.2, -0.3]) t.box(2.2, 0.42, 1.18, tone(coat, 0.95), 0, y, 0, { r: 0.16 });
  t.box(0.06, 1.7, 0.06, 0x90a4ae, 0, 0.0, 0.6);
  for (const y of [0.55, 0.05, -0.45]) t.box(0.2, 0.08, 0.06, 0x5d4037, 0.2, y, 0.62, { r: 0.02 });
  t.cyl(0.62, 0.3, fur, 0, -0.85, 0, { seg: 18, sx: 1.8, sz: 0.98 });
  if (level >= 1) {
    // Permafrost: a pack with glowing ice crystals growing out of it
    t.box(1.3, 1.5, 0.6, 0x90a4ae, 0, 0.0, -0.85, { r: 0.1 });
    t.box(1.34, 0.3, 0.64, 0x78909c, 0, 0.6, -0.85, { r: 0.06 });
    for (const s of [-1, 1]) {
      t.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
      t.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
    }
    crystal(t, -0.35, 0.7, -0.85, 0.16, 0.95, ice, 0.25, PI);
    crystal(t, 0.3, 0.7, -0.9, 0.14, 0.75, ice, 0.3, 0);
    crystal(t, 0, 0.7, -0.95, 0.18, 1.15, ice, 0.1, -PI / 2);
  }
  if (level >= 2) radio(t, 0.55, -0.25, -1.3, 0x37474f, 1.9); // Radio
  if (gorilla) {
    // Arctic Gorilla: big furry shoulders
    for (const s of [-1, 1]) {
      t.ball(0.7, SNOW, s * 1.2, 0.95, 0, { sy: 0.7, seg: 12, rows: 8 });
      for (let i = 0; i < 5; i++) t.cyl(0.08, 0.4, 0xffffff, s * (0.9 + i * 0.15), 0.6, -0.3 + i * 0.15, { seg: 4, r2: 0.01, rx: PI, rz: s * 0.3 });
    }
    h.size = 1.1;
  }
  if (hero) {
    // Subzero Hero: an icy cape with icicles along its hem
    t.slab(2.2, 3.0, 0.1, 0x4fc3f7, 0, -0.6, -1.3, { bw: 1.2 });
    t.box(2.0, 0.2, 0.3, 0x29b6f6, 0, 0.9, -1.2, { r: 0.06 });
    for (let i = 0; i < 6; i++) t.cyl(0.01, 0.4, ice, -1.1 + i * 0.44, -2.25, -1.3, { seg: 5, r2: 0.09 });
  }
  hd.done();
  t.done();
  hands(h, key, 0x1a237e, fur, (a) => a.box(1.1, 0.3, 1.1, fur, 0, -1.45, 0, { r: 0.1 }));
  feet(h, key, 0x3e2723, (b) => b.box(1.16, 0.3, 1.16, fur, 0, -1.35, 0.02, { r: 0.1 }));
  const g = fist(h.rightArm, -1.9, gorilla ? 1.3 : 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const tip = iceBlaster(gk, { len: gorilla ? 2.3 : 1.85, big: gorilla, light: ice, glass: glassMat(h, 0xe1f5fe, 0.4) });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tip, UP + 0.02);
  aimLong(h);
  h.tracer = 0x40c4ff;
  h.tracerWidth = level >= 3 ? 0.35 : 0.25;
  return own(h);
}

export const MODELS = {
  djBooth: makeDJBooth,
  djEdj: makeEDJ,
  djEdjBottom: makeEDJBottom,
  anarchist: makeAnarchist,
  gatlingMachine: makeMachineGunner,
  gatlingMachineBottom: makeMachineGunnerBottom,
  elf: makeElf,
  hallowboomer: makeHallowboomer,
  sleeter: makeSleeter,
};
