// Tower models: people, batch 22 (dressed with the vehicle kit in ../vehicles.js).
// In here: the wave 9 hero towers Maitake, Scientist, Voca, Quinn, Stella, Wafer and Sparks.
// MODELS at the bottom is laid over TOWER_MODELS in ../models.js, so these builders win.
// The shared gear (hair, gloves, fists, muzzles) and the spaces it works in are in people1.js.
// Their per-level looks used to be painted on by ../newmodels/blitzup.js (outfit colours, orbiting
// cubes, halos); those looks are built here now and blitzup.js no longer dresses these towers.
// Helpers here: drift (a group the views keep turning and bobbing, through h.drift), glowGlass
// (see-through glow: puddles, rainbows), potion (a round flask), toadstool, gumdrop, ornament.

import * as THREE from 'three';
import { glowMat, star, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { GOLD, INK, STEEL, WOOD, band, belt, dome, fist, goggles, hair, headband, muzzle, own, wear } from './people1.js';
import { labCoat } from './people11.js';
import { feet, glassMat, hands, hood } from './people5.js';
import { arc, coil } from './people8.js';
import { firework } from './people12.js';

const PI = Math.PI;
const IRON = 0x263238;
const PAINT = [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0x8e24aa];
const CANDY = [0xe53935, 0x43a047, 0xfdd835, 0x1e88e5];

// ------------------------------------------------------------------ shared bits for this batch

/** A group the views keep turning (speed) and bobbing (bob) - floating things that circle a hero. */
function drift(h, parent, y, speed = 0.8, bob = 0) {
  const g = new THREE.Group();
  g.position.y = y;
  Object.assign(g.userData, { speed, bob, y });
  parent.add(g);
  (h.drift ??= []).push(g);
  return g;
}

/** A see-through glowing material (puddles, rainbows) that stays see-through when the tower fades. */
function glowGlass(h, color, opacity, intensity = 0.7) {
  const m = glowMat(h, color, intensity);
  m.transparent = true;
  m.opacity = opacity;
  m.depthWrite = false;
  m.userData.keepOpacity = opacity;
  return m;
}

/** A round potion flask standing on (x, y, z): glass ball, juice, neck, cork (any space). */
function potion(k, x, y, z, r, juice, glass) {
  k.ball(r * 0.82, juice, x, y + r * 0.95, z, { seg: 12, rows: 8 });
  k.ball(r, glass, x, y + r, z, { seg: 14, rows: 10 });
  k.cyl(r * 0.32, r * 0.8, glass, x, y + r * 2.2, z, { seg: 10 });
  k.torus(r * 0.34, r * 0.08, glass, x, y + r * 2.55, z, { rx: PI / 2, seg: 10 });
  k.cyl(r * 0.3, r * 0.4, 0x8d6e63, x, y + r * 2.75, z, { seg: 8, r2: r * 0.36 });
}

/** A toadstool on the ground at (x, z): a pale stem with a ring and a spotted cap. */
function toadstool(k, x, z, s, cap, spot = 0xfafafa) {
  k.cyl(0.13 * s, 0.6 * s, 0xf1f8e9, x, 0.3 * s, z, { seg: 8, r2: 0.1 * s });
  k.cyl(0.18 * s, 0.05 * s, 0xdcedc8, x, 0.42 * s, z, { seg: 8, r2: 0.12 * s }); // ring
  dome(k, 0.36 * s, 0.24 * s, cap, x, 0.58 * s, z, { seg: 12 });
  k.cyl(0.36 * s, 0.04 * s, 0xe6ee9c, x, 0.58 * s, z, { seg: 12, r2: 0.12 * s }); // gills
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + s;
    k.ball(0.05 * s, spot, x + Math.cos(a) * 0.2 * s, 0.75 * s, z + Math.sin(a) * 0.2 * s, { seg: 6, rows: 4, sy: 0.5 });
  }
}

/** A gumdrop sitting on (x, y, z): a soft cone with a rounded top and sugar dots. */
function gumdrop(k, x, y, z, r, col, o = {}) {
  k.cyl(r, r * 0.9, col, x, y + r * 0.45, z, { seg: 12, r2: r * 0.72, ...o });
  dome(k, r * 0.72, r * 0.5, col, x, y + r * 0.9, z, { seg: 12 });
  for (let i = 0; i < 4; i++) {
    const a = i * 1.6;
    k.ball(r * 0.08, 0xffffff, x + Math.cos(a) * r * 0.62, y + r * (0.5 + (i % 2) * 0.35), z + Math.sin(a) * r * 0.62, { seg: 5, rows: 3 });
  }
}

/** A Christmas ornament centred on (x, y, z): a ball, a gold cap and a hanging loop. */
function ornament(k, x, y, z, r, col) {
  k.ball(r, col, x, y, z, { seg: 12, rows: 9 });
  k.torus(r * 0.9, r * 0.08, tone(0xffffff, 1), x, y, z, { rx: PI / 2, seg: 14 }); // white band
  k.cyl(r * 0.32, r * 0.3, GOLD, x, y + r * 1.0, z, { seg: 8 });
  k.torus(r * 0.16, r * 0.05, GOLD, x, y + r * 1.25, z, { seg: 8 });
}

// ------------------------------------------------------------------ Maitake

/**
 * Maitake (poison flask thrower): a pale blue mushroom witch with long black hair over one eye, a
 * laced dress with a frilled collar, striped stockings and pointy shoes; a purple potion tube in
 * the throwing hand and a caged blue orb in the other. Lv 1 a belt of potions, Lv 2 a moss-green
 * dress and a bubbling cauldron, Lv 3 flasks floating round her and glowing toadstools,
 * Lv 4 Fungal Queen: a night-purple dress with a toxic hem, a big spotted mushroom hat, a glowing
 * puddle and spores.
 */
export function makeMaitake(level) {
  const queen = level >= 4;
  const dress = [0x4a1942, 0x4a1942, 0x33691e, 0x33691e, 0x311b92][level];
  const trim = [0x38102f, 0x38102f, 0x1b5e20, 0x1b5e20, 0x1a1040][level];
  const skin = 0xb3e5fc;
  const h = makeHumanoid({ skin, shirt: dress, pants: 0x1a1a1a, arms: dress, face: 'smile' });
  const key = `p22mai${level}`;
  const tox = glowMat(h, 0x76ff03);
  const purple = glowMat(h, 0xaa00ff);
  const blue = glowMat(h, 0x40c4ff);
  const pink = glowMat(h, 0xff4081);
  const glass = glassMat(h, 0xe0f7fa, 0.4);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // long straight black hair: a fringe, a lock over her left eye, one curl on top
  const HAIR = 0x111111;
  hair(hd, HAIR, { h: 0.48, back: false });
  band(hd, 0.7, 0.1, 2.0, 3.4, HAIR, 0.15, { ry: PI }); // down the back and sides
  band(hd, 0.67, 0.07, 0.42, 1.9, HAIR, 1.0); // fringe
  hd.box(0.44, 0.78, 0.08, HAIR, 0.27, 0.62, 0.62, { r: 0.03, rz: -0.08 }); // the lock over one eye
  for (const s of [-1, 1]) hd.box(0.16, 1.5, 0.3, HAIR, s * 0.66, 0.2, 0.3, { r: 0.05 }); // strands framing the face
  hd.cyl(0.06, 0.05, glowMat(h, 0x40c4ff), -0.26, 0.7, 0.62, { axis: 'z', seg: 8, sy: 0.6 }); // the eye peeking out
  hd.tube([[0, 1.3, -0.05], [0.02, 1.55, 0.05], [0.16, 1.66, 0.22], [0.02, 1.68, 0.36], [-0.08, 1.56, 0.26]], 0.06, HAIR, { seg: 16, sides: 6 });
  if (level >= 2 && !queen) {
    // a little glowing mushroom hairpin
    hd.cyl(0.04, 0.25, 0xf1f8e9, -0.62, 1.12, 0.2, { seg: 6, rz: 0.5 });
    dome(hd, 0.17, 0.12, tox, -0.7, 1.22, 0.2, { seg: 10 });
  }
  if (queen) {
    // the Fungal Queen's mushroom hat: a wide spotted cap with gills and a frill
    const cap = 0x7b1fa2;
    hd.cyl(0.62, 0.3, 0x4a148c, 0, 1.3, 0, { seg: 18 });
    dome(hd, 1.45, 1.0, cap, 0, 1.48, 0, { seg: 26, rows: 9 });
    hd.cyl(1.45, 0.1, 0xce93d8, 0, 1.43, 0, { seg: 26, r2: 0.6 }); // gills underneath
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * PI * 2;
      hd.box(0.03, 0.06, 0.8, 0xab47bc, Math.sin(a) * 1.0, 1.41, Math.cos(a) * 1.0, { ry: a });
    }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * PI * 2;
      hd.ball(0.16, 0xce93d8, Math.sin(a) * 1.42, 1.44, Math.cos(a) * 1.42, { sy: 0.45, seg: 8, rows: 5 }); // frilly edge
    }
    for (const [a, e, r] of [[0.3, 0.35, 0.24], [1.6, 0.5, 0.2], [2.8, 0.3, 0.26], [4.0, 0.55, 0.18], [5.2, 0.35, 0.22], [0, 1.2, 0.26], [2.2, 1.0, 0.18]]) {
      hd.ball(r, 0xfafafa, Math.sin(a) * Math.cos(e) * 1.42, 1.48 + Math.sin(e) * 0.98, Math.cos(a) * Math.cos(e) * 1.42, { sy: 0.45, seg: 10, rows: 6, rx: Math.cos(a) * (PI / 2 - e), rz: -Math.sin(a) * (PI / 2 - e) });
    }
    for (let i = 0; i < 5; i++) hd.ball(0.07, tox, -1.1 + i * 0.5, 1.35 - (i % 2) * 0.12, 0.85 - Math.abs(i - 2) * 0.25, { seg: 6, rows: 4 }); // glowing drips
  }
  // a laced bodice, a frilled collar, a sash and a knee-length skirt with a jagged hem
  t.box(1.25, 1.35, 0.06, tone(dress, 1.3), 0, 0.05, 0.52, { r: 0.04 });
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) t.box(0.42, 0.04, 0.03, 0xd1c4e9, 0, 0.55 - i * 0.3, 0.56, { rz: s * 0.45 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    t.ball(0.22, trim, Math.sin(a) * 0.62, 1.02, Math.cos(a) * 0.42, { sy: 0.45, seg: 8, rows: 5, rx: Math.cos(a) * 0.5, rz: -Math.sin(a) * 0.5 });
  }
  t.box(2.16, 0.26, 1.14, trim, 0, -0.88, 0, { r: 0.05 });
  t.ball(0.16, trim, 0.45, -0.88, 0.6, { seg: 8, rows: 6 }); // sash knot
  for (const s of [-1, 1]) t.box(0.16, 0.6, 0.05, trim, 0.45 + s * 0.12, -1.25, 0.62, { rz: s * 0.2 });
  t.slab(2.18, 1.35, 1.16, dress, 0, -1.65, 0, { bw: 1.32, bd: 1.45 });
  t.slab(2.2, 0.08, 1.18, tone(dress, 0.75), 0, -1.6, 0, { bw: 1.3, bd: 1.42 }); // a pleat line
  const hemC = queen ? tox : trim;
  for (let i = 0; i < 8; i++) {
    const x = -1.25 + i * 0.36;
    for (const z of [0.82, -0.82]) t.cyl(0.18, 0.36, hemC, x, -2.42, z, { seg: 3, r2: 0.01, rx: PI, sz: 0.3 });
  }
  for (const s of [-1, 1]) for (const z of [-0.5, 0, 0.5]) t.cyl(0.18, 0.36, hemC, s * 1.42, -2.42, z, { seg: 3, r2: 0.01, rx: PI, sx: 0.3 });
  if (queen) t.slab(2.92, 0.1, 1.7, tox, 0, -2.3, 0, { bw: 1.0 }); // glowing hem band
  if (level >= 1) {
    // a belt of potion vials over the sash
    const juice = [tox, purple, blue, pink];
    for (let i = 0; i < 4; i++) {
      const x = -0.8 + i * 0.4 + (i >= 2 ? 0.25 : 0);
      t.cyl(0.11, 0.42, glass, x, -0.92, 0.66, { seg: 10 });
      t.cyl(0.09, 0.3, juice[i], x, -0.98, 0.66, { seg: 10 });
      t.cyl(0.07, 0.1, 0x8d6e63, x, -0.66, 0.66, { seg: 8 });
      t.box(0.24, 0.08, 0.06, 0x5d4037, x, -0.86, 0.6); // loop
    }
  }
  if (level >= 2) {
    // a ragged moss shawl over the shoulders
    t.box(2.3, 0.3, 1.3, tone(trim, 1.15), 0, 0.88, 0, { r: 0.12 });
    for (let i = 0; i < 6; i++) t.cyl(0.16, 0.42 + (i % 2) * 0.15, tone(trim, 1.15), -0.9 + i * 0.36, 0.55, 0.64, { seg: 3, r2: 0.01, rx: PI, sz: 0.3 });
    for (let i = 0; i < 6; i++) t.cyl(0.16, 0.5, tone(trim, 1.15), -0.9 + i * 0.36, 0.5, -0.64, { seg: 3, r2: 0.01, rx: PI, sz: 0.3 });
  }
  hd.done();
  t.done();
  // bell sleeves, striped stockings, pointy witch shoes
  hands(h, key, null, tone(dress, 0.8), (a) => {
    a.cyl(0.78, 0.5, tone(dress, 1.15), 0, -1.35, 0, { seg: 14, r2: 0.56 });
    a.torus(0.77, 0.04, trim, 0, -1.58, 0, { rx: PI / 2, seg: 16 });
  });
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    for (let i = 0; i < 4; i++) b.box(1.03, 0.14, 1.03, queen ? 0x76ff03 : 0x7b1fa2, 0, -0.6 - i * 0.3, 0);
    b.box(1.06, 0.34, 1.12, 0x212121, 0, -1.84, 0.04, { r: 0.06 });
    b.cyl(0.32, 0.55, 0x212121, 0, -1.86, 0.78, { axis: 'z', seg: 8, r2: 0.04 });
    b.tube([[0, -1.86, 1.0], [0, -1.7, 1.18], [0, -1.56, 1.1]], 0.04, 0x212121, { seg: 8, sides: 5 }); // curled toe
    b.box(0.34, 0.2, 0.06, GOLD, 0, -1.76, 0.6, { r: 0.02 }); // buckle
    b.done();
  }
  // the potion tube in the throwing hand (the muzzle) and a caged orb in the other
  const pot = fist(h.rightArm, -1.95, 1.15);
  const pk = wear(h, pot, `${key}:tube`);
  pk.cyl(0.16, 0.85, glass, 0, -0.5, 0, { seg: 12 });
  pk.ball(0.16, glass, 0, -0.93, 0, { seg: 12, rows: 8 });
  pk.cyl(0.13, 0.7, purple, 0, -0.58, 0, { seg: 12 });
  pk.ball(0.13, purple, 0, -0.93, 0, { seg: 10, rows: 6 });
  pk.torus(0.17, 0.035, glass, 0, -0.08, 0, { rx: PI / 2, seg: 12 });
  pk.cyl(0.14, 0.2, 0x8d6e63, 0, 0.0, 0, { seg: 8, r2: 0.17 }); // cork
  pk.box(0.2, 0.22, 0.04, 0xfff8e1, 0, -0.5, 0.16); // label
  pk.ball(0.05, 0x212121, 0, -0.47, 0.18, { seg: 6, rows: 4 }); // a tiny skull mark
  pk.done();
  muzzle(h, pot, -0.5, 0);
  const orb = fist(h.leftArm, -1.95, 1.1);
  const ok = wear(h, orb, `${key}:orb`);
  ok.ball(0.3, blue, 0, -0.38, 0, { seg: 14, rows: 10 });
  ok.torus(0.34, 0.03, STEEL, 0, -0.38, 0, { seg: 16 });
  ok.torus(0.34, 0.03, STEEL, 0, -0.38, 0, { ry: PI / 2, seg: 16 });
  ok.cyl(0.08, 0.12, STEEL, 0, -0.02, 0, { seg: 8 });
  ok.done();
  if (level >= 2) {
    // a bubbling cauldron on a little fire beside her
    const c = wear(h, h.root, `${key}:cauldron`);
    const cx = 2.4;
    const cz = 0.7;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2 + 0.3;
      c.cyl(0.07, 0.62, IRON, cx + Math.cos(a) * 0.62, 0.3, cz + Math.sin(a) * 0.62, { seg: 6, r2: 0.12 });
    }
    for (const r of [0.4, -0.5]) c.cyl(0.1, 1.1, 0x5d4037, cx, 0.12, cz, { axis: 'x', seg: 8, ry: r });
    for (const [x, z] of [[0.15, 0.1], [-0.2, -0.05], [0, -0.2]]) c.ball(0.1, glowMat(h, 0xff6d00), cx + x, 0.22, cz + z, { seg: 6, rows: 4 });
    c.ball(0.85, IRON, cx, 1.05, cz, { sy: 0.82, seg: 20, rows: 12 });
    c.torus(0.68, 0.1, 0x37474f, cx, 1.62, cz, { rx: PI / 2, seg: 22 });
    c.cyl(0.66, 0.06, tox, cx, 1.56, cz, { seg: 20 });
    for (const s of [-1, 1]) c.torus(0.16, 0.04, 0x37474f, cx + s * 0.86, 1.3, cz, { ry: PI / 2, seg: 10 });
    for (const [x, y, z, r] of [[0.2, 1.7, 0.1, 0.16], [-0.3, 1.82, -0.2, 0.12], [0.1, 2.02, -0.3, 0.09], [-0.1, 1.66, 0.3, 0.1]]) c.ball(r, tox, cx + x, y, cz + z, { seg: 8, rows: 6 });
    c.tube([[cx - 0.2, 1.4, cz - 0.1], [cx - 0.45, 1.85, cz - 0.2], [cx - 0.6, 2.3, cz - 0.25]], 0.04, WOOD, { seg: 8, sides: 5 }); // ladle
    c.done();
  }
  if (level >= 3) {
    // glowing toadstools round her feet, and four flasks floating round her
    const g = wear(h, h.root, `${key}:toads`);
    const caps = [tox, glowMat(h, 0xd500f9), glowMat(h, 0x00e5ff)];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2 + 0.3;
      const r = 2.2 + (i % 2) * 0.4;
      if (Math.abs(Math.cos(a) * r - 2.4) < 1.1 && Math.abs(Math.sin(a) * r - 0.7) < 1.1) continue; // not in the cauldron
      toadstool(g, Math.cos(a) * r, Math.sin(a) * r, 0.9 + (i % 3) * 0.3, caps[i % 3]);
    }
    g.done();
    const ring = drift(h, h.root, 3.4, 0.7, 0.25);
    const f = wear(h, ring, `${key}:flasks`);
    const juice = [purple, tox, blue, pink];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2 + PI / 4;
      potion(f, Math.cos(a) * 2.3, (i % 2) * 0.7, Math.sin(a) * 2.3, 0.24, juice[i], glass);
    }
    f.done();
  }
  if (queen) {
    // a glowing toxic puddle and spores drifting round her
    const p = wear(h, h.root, `${key}:puddle`);
    const goo = glowGlass(h, 0x64dd17, 0.5);
    p.cyl(1.8, 0.04, goo, 0, 0.03, 0, { seg: 28 });
    for (const [x, z, r] of [[1.6, 0.9, 0.5], [-1.4, -1.1, 0.6], [-0.4, 1.7, 0.4]]) p.cyl(r, 0.04, goo, x, 0.035, z, { seg: 16 });
    p.done();
    const spores = drift(h, h.root, 1.9, 0.9, 0.3);
    const s = wear(h, spores, `${key}:spores`);
    const sm = glowMat(h, 0xb2ff59);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      s.ball(0.12 + (i % 2) * 0.05, i % 2 ? tox : sm, Math.cos(a) * 1.3, (i % 3) * 0.5, Math.sin(a) * 1.3, { seg: 8, rows: 6 });
    }
    s.done();
  }
  h.body.scale.setScalar(queen ? 0.88 : 0.8);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -2.8, left: -1.0, leftRecoil: 0 };
  h.swing = 1.9;
  h.tracer = 0xaa00ff;
  h.projectile = { color: 0xaa00ff, size: queen ? 0.6 : 0.5, arc: 3.5, glowing: true };
  return own(h, 0);
}

// ------------------------------------------------------------------ Scientist

/**
 * Scientist: green skin, fluffy pink hair, round glasses, a lab coat over a tie and an electric
 * rod. Lv 1 goggles pushed up, Lv 2 a yellow hazmat coat and a generator pack with a cable to
 * the rod, Lv 3 a dark coat with glowing circuit lines, tesla coils on the pack and a longer
 * pronged rod, Lv 4 Lightning Staff: glowing hair, a rod in each hand, arcs between the coils,
 * plasma balls circling her and a lightning halo.
 */
export function makeScientist(level) {
  const top = level >= 4;
  const coatC = [0xfafafa, 0xfafafa, 0xfdd835, 0x263238, 0x263238][level];
  const skin = 0x9ccc65;
  const h = makeHumanoid({ skin, shirt: 0xb3e5fc, pants: 0x37474f, arms: coatC, face: 'smile' });
  const key = `p22sci${level}`;
  const zap = glowMat(h, 0xb388ff);
  const spark = glowMat(h, 0xea80fc);
  const glass = glassMat(h, 0xe1f5fe, 0.5);
  const hairC = top ? glowMat(h, 0xea80fc, 0.6) : 0xf48fb1;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // fluffy hair: a cap with puffs all round the top and back
  hair(hd, hairC, { h: 0.5 });
  for (const [x, y, z, r] of [[0, 1.42, -0.05, 0.4], [-0.45, 1.3, 0.05, 0.34], [0.45, 1.32, -0.05, 0.34], [-0.3, 1.38, 0.4, 0.28], [0.32, 1.4, 0.36, 0.26],
    [-0.62, 0.95, -0.25, 0.32], [0.62, 0.95, -0.25, 0.32], [-0.35, 1.0, -0.6, 0.36], [0.35, 1.05, -0.6, 0.36], [0, 0.65, -0.62, 0.34], [-0.55, 0.6, -0.4, 0.28], [0.55, 0.6, -0.4, 0.28]]) {
    hd.ball(r, hairC, x, y, z, { seg: 10, rows: 7 });
  }
  // round glasses
  for (const s of [-1, 1]) {
    hd.torus(0.19, 0.035, 0x37474f, s * 0.26, 0.72, 0.64, { seg: 16 });
    hd.cyl(0.17, 0.02, glass, s * 0.26, 0.72, 0.64, { axis: 'z', seg: 14 });
    hd.box(0.04, 0.04, 0.6, 0x37474f, s * 0.63, 0.76, 0.32);
  }
  hd.box(0.16, 0.04, 0.04, 0x37474f, 0, 0.76, 0.66);
  if (level >= 1) goggles(hd, 1.12, 0xffb300, { r: 0.73 }); // pushed up onto her head
  // a blue shirt, a dark tie, a coat with lapels and a pocket of pens
  t.box(0.26, 0.2, 0.08, IRON, 0, 0.85, 0.54, { r: 0.02 });
  t.slab(0.24, 1.3, 0.06, IRON, 0, 0.05, 0.53, { bw: 1.6 });
  labCoat(t, coatC, null);
  for (const s of [-1, 1]) t.box(0.5, 2.02, 0.08, coatC, s * 0.76, 0, 0.53);
  t.box(2.08, 2.04, 0.08, coatC, 0, 0, -0.53);
  for (const s of [-1, 1]) t.box(0.1, 2.04, 1.08, coatC, s * 1.0, 0, 0);
  t.box(0.42, 0.45, 0.04, tone(coatC, 0.9), 0.72, 0.3, 0.59);
  [0xe53935, 0x1e88e5, 0x212121].forEach((c, i) => t.cyl(0.035, 0.3, c, 0.6 + i * 0.1, 0.55, 0.6, { seg: 6 }));
  t.box(0.38, 0.22, 0.03, 0xfafafa, -0.72, 0.45, 0.59, { r: 0.02 }); // name badge
  t.box(0.24, 0.05, 0.02, 0x1e88e5, -0.72, 0.48, 0.61);
  for (let i = 0; i < 3; i++) t.cyl(0.05, 0.03, tone(coatC, 0.7), 0.5, 0.0 - i * 0.4, 0.58, { axis: 'z', seg: 8 });
  if (level >= 3) {
    // glowing circuit lines on the dark coat
    for (const s of [-1, 1]) {
      t.box(0.05, 1.5, 0.03, zap, s * 0.72, -0.25, 0.58);
      t.box(0.3, 0.05, 0.03, zap, s * 0.6, -1.0, 0.58);
      t.ball(0.06, zap, s * 0.72, 0.5, 0.59, { seg: 6, rows: 4 });
    }
    t.box(1.6, 0.05, 0.03, zap, 0, -1.6, -0.62);
  }
  if (level >= 2) {
    // a generator pack with a glowing window, dials and a cable down to the rod hand
    t.box(1.6, 1.8, 0.8, 0x546e7a, 0, 0.05, -0.95, { r: 0.12 });
    t.box(1.66, 0.12, 0.86, 0x37474f, 0, 0.75, -0.95);
    t.box(0.9, 0.5, 0.06, zap, 0, 0.3, -1.36, { r: 0.03 });
    for (const x of [-0.45, 0.45]) {
      t.cyl(0.15, 0.06, 0xffeb3b, x, -0.4, -1.37, { axis: 'z', seg: 12 });
      t.box(0.03, 0.12, 0.03, INK, x, -0.36, -1.41, { rz: 0.6 });
    }
    for (let i = 0; i < 4; i++) t.box(1.0, 0.04, 0.04, 0x37474f, 0, -0.62 - i * 0.1, -1.36); // vents
    for (const s of [-1, 1]) t.box(0.22, 0.12, 1.3, INK, s * 0.55, 0.98, -0.3); // shoulder straps
    t.tube([[-0.7, -0.75, -1.2], [-1.05, -1.0, -0.6], [-1.15, -1.0, 0.1]], 0.07, INK, { seg: 12, sides: 6 });
  }
  if (level >= 3) {
    // tesla coils on the pack (arcs crackle between them at Lv 4)
    for (const s of [-1, 1]) {
      t.cyl(0.24, 0.12, 0x37474f, s * 0.45, 1.0, -0.95, { seg: 12 });
      coil(t, s * 0.45, 1.55, -0.95, 0.22, 1.0, 6);
      t.torus(0.2, 0.08, STEEL, s * 0.45, 2.12, -0.95, { rx: PI / 2, seg: 14 });
      t.ball(0.17, zap, s * 0.45, 2.28, -0.95, { seg: 10, rows: 8 });
    }
    if (top) for (const seed of [1, 2, 3]) arc(t, [-0.35, 2.3, -0.95], [0.35, 2.3, -0.95], spark, 0.14, seed);
  }
  hd.done();
  t.done();
  hands(h, key, 0x7e57c2, tone(coatC, 0.88), (a) => a.box(1.08, 0.3, 1.08, tone(coatC, 0.95), 0, -1.38, 0, { r: 0.05 })); // gloves and rolled cuffs
  feet(h, key, 0x4e342e);
  // the electric rod (one in each hand at Lv 4)
  const len = level >= 3 ? 2.4 : 1.8;
  const rod = (arm) => {
    const g = fist(arm, -1.9, 1.0);
    const k = wear(h, g, `${key}:rod`);
    k.cyl(0.11, 0.55, 0x212121, 0, -0.05, 0, { seg: 10 }); // grip
    k.cyl(0.07, len, 0x37474f, 0, -len / 2 - 0.2, 0, { seg: 10 });
    const rings = level >= 3 ? 3 : 2;
    for (let i = 0; i < rings; i++) {
      k.cyl(0.2, 0.07, 0xeceff1, 0, -0.6 - i * 0.4, 0, { seg: 12 }); // insulator discs
      k.torus(0.13, 0.04, zap, 0, -0.68 - i * 0.4, 0, { rx: PI / 2, seg: 12 });
    }
    const tipS = level >= 3 ? 0.3 : 0.22;
    k.cyl(0.14, 0.18, 0xb87333, 0, -len - 0.12, 0, { seg: 10 });
    k.ball(tipS, zap, 0, -len - 0.2 - tipS * 0.6, 0, { seg: 4, rows: 2 }); // a cut crystal
    if (level >= 3) {
      for (const s of [-1, 1]) k.tube([[s * 0.1, -len - 0.1, 0], [s * 0.38, -len - 0.35, 0], [s * 0.3, -len - 0.75, 0]], 0.035, 0xb87333, { seg: 10, sides: 5 });
      arc(k, [-0.3, -len - 0.75, 0], [0.3, -len - 0.75, 0], spark, 0.1, 4);
    }
    k.done();
    muzzle(h, g, -len - 0.25, 0);
  };
  h.muzzles = [];
  rod(h.rightArm);
  if (top) {
    rod(h.leftArm);
    h.rightArm.rotation.set(-PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-PI / 2, 0, -0.1);
    h.pose = { right: -PI / 2, left: -PI / 2, leftRecoil: 0.35 };
    // plasma balls circling her and a lightning halo over her head
    const ring = drift(h, h.root, 3.4, 1.3, 0.3);
    const o = wear(h, ring, `${key}:plasma`);
    const pb = glowMat(h, 0x40c4ff);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2;
      const m = i % 2 ? zap : pb;
      o.ball(0.3, m, Math.cos(a) * 2.5, (i % 2) * 0.4, Math.sin(a) * 2.5, { seg: 12, rows: 8 });
      o.torus(0.42, 0.03, m, Math.cos(a) * 2.5, (i % 2) * 0.4, Math.sin(a) * 2.5, { rx: 0.7 + i, seg: 14 });
    }
    o.done();
    const halo = drift(h, h.body, 6.3, 0.7, 0.1);
    const hk = wear(h, halo, `${key}:halo`);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      const x = Math.cos(a) * 1.0;
      const z = Math.sin(a) * 1.0;
      hk.tube([[x, 0.25, z], [x * 1.08, 0.02, z * 1.08], [x * 0.92, 0.0, z * 0.92], [x, -0.25, z]], 0.05, pb, { seg: 4, sides: 4, tension: 0 }); // a zigzag bolt
    }
    hk.torus(1.0, 0.03, pb, 0, 0, 0, { rx: PI / 2, seg: 28 });
    hk.done();
    h.body.scale.setScalar(1.1);
  } else {
    h.rightArm.rotation.set(-PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-PI / 2 + 0.1, 0, -0.5);
    h.pose = { right: -PI / 2, left: -PI / 2 + 0.1, leftRecoil: 0.25 };
  }
  h.tracer = 0xb388ff;
  return own(h, 0);
}

// ------------------------------------------------------------------ Voca

/**
 * Voca (idol with fireworks, lobbed splash): a small girl with long light-pink hair, a star clip
 * and a blue bowtie. Lv 0 a striped skirt and a handheld firework, Lv 1 a blue top hat, white
 * tights and a sparkler, Lv 2 a bigger hat with a sash, a pink shirt with a puffy collar and a red
 * firework tube on her shoulder, Lv 3 Encore: a red shirt, a spiky skirt, gold shoulder pads and a
 * bigger tube, Lv 4 Grand Finale: a stage with lights, speakers and firework racks (more muzzles).
 */
export function makeVoca(level) {
  const shirt = level >= 3 ? 0xe53935 : level >= 2 ? 0xf06292 : 0xfafafa;
  const skin = 0xffe0bd;
  const h = makeHumanoid({ skin, shirt, pants: level >= 1 ? 0xfafafa : skin, arms: skin, face: 'smile' });
  const key = `p22voca${level}`;
  const sun = glowMat(h, 0xffeb3b);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // long light-pink hair with bangs and two long locks in front of the shoulders
  const HAIR = 0xf8bbd0;
  hair(hd, HAIR, { h: 0.48, back: false });
  band(hd, 0.7, 0.1, 2.4, 3.6, HAIR, -0.05, { ry: PI });
  band(hd, 0.67, 0.07, 0.36, 2.0, HAIR, 1.02);
  for (const s of [-1, 1]) {
    hd.box(0.2, 1.7, 0.36, HAIR, s * 0.68, 0.05, 0.22, { r: 0.08 });
    hd.ball(0.14, HAIR, s * 0.68, -0.82, 0.22, { seg: 8, rows: 6, sy: 1.4 });
  }
  star(hd, 0.72, 1.0, 0.32, 0.22, sun, { rz: -PI / 2, ry: 0.4 }); // star clip
  if (level >= 1) {
    // a blue top hat with a star (taller with a pink sash from Lv 2)
    const big = level >= 2;
    const hatM = 0x1565c0;
    const ch = big ? 1.25 : 0.85;
    const r = big ? 0.6 : 0.5;
    const o = { rz: -0.12 };
    const hx = 0.12;
    hd.cyl(big ? 1.0 : 0.85, 0.1, hatM, hx, 1.22, 0, { seg: 22, ...o });
    hd.cyl(r, ch, hatM, hx + Math.sin(0.12) * ch * 0.5, 1.27 + ch / 2, 0, { seg: 20, r2: r * 1.06, ...o });
    hd.cyl(r * 1.02, 0.2, big ? 0xe91e63 : 0x0d47a1, hx + 0.03, 1.4, 0, { seg: 20, ...o });
    star(hd, hx + 0.06, 1.3 + ch * 0.55, r + 0.05, 0.2, sun, { rx: PI / 2, ...o });
    if (big) {
      hd.box(0.28, 0.9, 0.06, 0xe91e63, 0.35, 0.95, -0.66, { rz: 0.2, r: 0.02 }); // sash tail
      hd.ball(0.16, 0xe91e63, 0.55, 1.42, 0.4, { seg: 8, rows: 6 });
    }
  }
  // a blue bowtie, short puffed sleeves on the shirt
  const blue = 0x1e88e5;
  for (const s of [-1, 1]) t.cyl(s < 0 ? 0.2 : 0.06, 0.42, blue, s * 0.22, 0.82, 0.56, { axis: 'x', seg: 8, r2: s < 0 ? 0.06 : 0.2 });
  t.ball(0.1, tone(blue, 0.8), 0, 0.82, 0.6, { seg: 8, rows: 6 });
  // the skirt: a flared cone with stripes (spiky and red at Lv 3+)
  const skirt = level >= 3 ? 0xc62828 : level >= 1 ? 0xfafafa : 0xf48fb1;
  const stripe = level >= 3 ? 0x212121 : level >= 1 ? 0xe53935 : 0xfafafa;
  const R0 = 1.12;
  const R1 = 1.5;
  t.cyl(R1, 0.95, skirt, 0, -1.38, 0, { r2: R0, seg: 20, sz: 0.62 });
  for (const f of [0.25, 0.6]) {
    const rr = R1 + (R0 - R1) * f + 0.02;
    t.cyl(rr + 0.02 * 0.4, 0.12, stripe, 0, -1.85 + f * 0.95, 0, { r2: rr - 0.02, seg: 20, sz: 0.62 });
  }
  t.torus(R1, 0.06, stripe, 0, -1.86, 0, { rx: PI / 2, seg: 24, sy: 0.62 });
  if (level >= 3) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2;
      t.cyl(0.12, 0.38, 0x212121, Math.sin(a) * 1.5, -2.0, Math.cos(a) * 0.93, { seg: 4, r2: 0.01, rx: PI });
    }
  }
  if (level >= 2) {
    // a puffy white collar
    t.torus(0.6, 0.16, 0xfafafa, 0, 1.0, 0, { rx: PI / 2, seg: 18, sy: 0.7 });
    for (const s of [-1, 1]) t.box(0.5, 0.3, 0.08, 0xfafafa, s * 0.3, 0.75, 0.56, { r: 0.05, rz: s * 0.4 });
  }
  hd.done();
  t.done();
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    a.box(1.1, 0.62, 1.1, shirt, 0, -0.3, 0, { r: 0.12 });
    a.torus(0.53, 0.06, tone(shirt, 0.85), 0, -0.62, 0, { rx: PI / 2, seg: 16 });
    if (level >= 3) {
      a.ball(0.7, GOLD, 0, 0.02, 0, { sy: 0.45, seg: 14, rows: 8 }); // gold shoulder pads
      for (let i = 0; i < 5; i++) a.cyl(0.04, 0.3, GOLD, -0.4 + i * 0.2, -0.2, 0.62, { seg: 5 }); // fringe
    }
    a.box(1.06, 0.14, 1.06, 0xfafafa, 0, -1.58, 0, { r: 0.03 }); // wrist band
    a.done();
  }
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    b.box(1.06, 0.36, 1.14, 0x212121, 0, -1.83, 0.05, { r: 0.08 });
    b.box(1.08, 0.08, 0.3, 0x212121, 0, -1.6, 0.25); // strap
    b.cyl(0.05, 0.04, GOLD, -0.5, -1.6, 0.25, { axis: 'x', seg: 8 });
    b.torus(0.52, 0.06, 0xfafafa, 0, -1.55, 0, { rx: PI / 2, seg: 16, sz: 1.0 }); // frilly sock tops
    b.done();
  }
  // the firework she fires: in her hand at Lv 0-1, a tube on her shoulder from Lv 2
  h.muzzles = [];
  if (level <= 1) {
    const g = fist(h.rightArm, -1.9, 1.15);
    const up = new THREE.Group();
    up.rotation.x = PI; // things built along +y now point down the arm
    g.add(up);
    const k = wear(h, up, `${key}:hand`);
    if (level === 0) {
      firework(k, 0, 0.2, 0, 0.17, 0.75, 0xe53935, 0xffeb3b);
      k.done();
      muzzle(h, up, 1.3, 0);
    } else {
      k.cyl(0.025, 1.4, 0x9e9e9e, 0, 0.6, 0, { seg: 5 });
      k.cyl(0.08, 0.55, sun, 0, 1.15, 0, { seg: 8 });
      const sp = glowMat(h, 0xfff59d);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * PI * 2;
        k.cyl(0.02, 0.35, sp, Math.cos(a) * 0.2, 1.4 + (i % 2) * 0.1, Math.sin(a) * 0.2, { seg: 4, rz: Math.cos(a) * 0.9, rx: -Math.sin(a) * 0.9 });
      }
      k.done();
      muzzle(h, up, 1.45, 0);
    }
    h.rightArm.rotation.set(-2.8, 0, 0.2);
    h.leftArm.rotation.set(-0.4, 0, -0.4);
    h.pose = { right: -2.8, left: -0.4, leftRecoil: 0 };
  } else {
    const big = level >= 3;
    const r = big ? 0.42 : 0.35;
    const len = big ? 2.8 : 2.4;
    const tube = new THREE.Group();
    tube.position.set(-1.5, 1.35, -0.1);
    tube.rotation.x = 0.6;
    h.torso.add(tube);
    const k = wear(h, tube, `${key}:tube`);
    const bandM = level >= 4 ? sun : GOLD;
    k.cyl(r, len, 0xd32f2f, 0, len / 2 - 0.6, 0, { seg: 18 });
    for (const y of [-0.35, len * 0.35, len - 0.85]) k.torus(r + 0.02, 0.06, bandM, 0, y, 0, { rx: PI / 2, seg: 18 });
    k.cyl(r + 0.08, 0.3, 0x212121, 0, len - 0.6, 0, { seg: 18, r2: r + 0.12 });
    k.cyl(r * 0.7, 0.05, 0x3e2723, 0, len - 0.46, 0, { seg: 16 }); // the dark mouth
    k.cyl(r * 0.9, 0.25, 0x212121, 0, -0.72, 0, { seg: 16 }); // end cap
    star(k, 0, len * 0.1, r + 0.01, 0.2, sun, { rx: PI / 2 });
    star(k, 0, len * 0.55, -r - 0.04, 0.16, glowMat(h, 0x40c4ff), { rx: PI / 2 });
    k.tube([[0.1, -0.8, 0], [0.3, -1.0, 0.1], [0.25, -1.2, 0.3]], 0.025, 0x5d4037, { seg: 8, sides: 4 }); // fuse
    k.box(0.22, 0.5, 0.3, INK, 0, 0.4, -r - 0.1, { r: 0.04 }); // shoulder rest
    k.done();
    muzzle(h, tube, len - 0.3, 0);
    h.rightArm.rotation.set(-1.2, 0, 0.2);
    h.leftArm.rotation.set(-1.0, 0, -0.5);
    h.pose = { right: -1.2, left: -1.0, leftRecoil: 0 };
  }
  if (level >= 4) {
    // a small stage: lights along the front, speakers and firework racks at the back corners
    const s = wear(h, h.root, `${key}:stage`);
    s.box(4.6, 0.55, 3.6, 0x4a148c, 0, 0.28, 0, { r: 0.08 });
    s.box(4.7, 0.1, 3.7, GOLD, 0, 0.47, 0, { r: 0.03 });
    s.box(4.4, 0.06, 3.4, 0x6d4c41, 0, 0.57, 0); // the stage floor
    for (let i = 0; i < 7; i++) s.box(0.03, 0.02, 3.4, 0x4e342e, -1.8 + i * 0.6, 0.6, 0); // boards
    s.box(1.2, 0.25, 0.5, 0x4a148c, 0, 0.12, 2.0, { r: 0.04 }); // step
    const lights = [glowMat(h, 0xff4081), sun, glowMat(h, 0x40c4ff)];
    for (let i = 0; i < 9; i++) s.ball(0.1, lights[i % 3], -2.0 + i * 0.5, 0.3, 1.82, { seg: 8, rows: 6 });
    for (const x of [-1, 1]) {
      s.box(0.7, 1.0, 0.6, 0x212121, x * 1.9, 1.1, 1.3, { r: 0.05 });
      s.cyl(0.24, 0.05, 0x424242, x * 1.9, 1.25, 1.61, { axis: 'z', seg: 14 });
      s.cyl(0.12, 0.05, 0x424242, x * 1.9, 0.8, 1.61, { axis: 'z', seg: 12 });
      s.cyl(0.08, 0.06, 0x111111, x * 1.9, 1.25, 1.64, { axis: 'z', seg: 10 });
      // a firework rack: a crate with four rockets leaning out
      s.box(0.95, 0.75, 0.95, 0x37474f, x * 1.85, 0.98, -1.1, { r: 0.05 });
      for (const y of [0.8, 1.15]) s.box(1.0, 0.06, 1.0, 0x263238, x * 1.85, y, -1.1);
      for (const [dx, dz] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) {
        firework(s, x * 1.85 + dx, 1.4, -1.1 + dz, 0.11, 0.7, 0xd32f2f, lights[(dx > 0 ? 1 : 0) + (dz > 0 ? 1 : 0)]);
      }
    }
    s.done();
    for (const x of [-1, 1]) {
      const m = new THREE.Object3D();
      m.position.set(x * 1.85, 2.6, -0.7);
      h.root.add(m);
      h.muzzles.push(m);
    }
    h.lift = 0.6;
    h.bob = 0.04;
  }
  h.body.scale.setScalar(0.85);
  h.recoilScale = 0.4;
  h.tracer = 0xff4081;
  h.projectile = { color: level >= 4 ? 0xffd740 : 0xff4081, size: 0.6 + level * 0.08, arc: 16, glowing: true };
  return own(h, 0);
}

// ------------------------------------------------------------------ Quinn

/**
 * Quinn (plant archer, very long range): a light-green spotted plant girl with bulb hair, two
 * leaves and pink flower-bulb buns, a ragged tunic, a pendant and a small bow. Lv 1 a bandana,
 * a hunter outfit, boots, gloves and a yellow flower, Lv 2 a green hoodie with yellow flowers, a
 * belt, a quiver and a bigger pink-tipped bow, Lv 3 a mask and glowing yellow eyes, Lv 4 Spore
 * Archer: a huge vine bow, mushrooms round her feet and spores drifting round her.
 */
export function makeQuinn(level) {
  const skin = 0xc5e1a5;
  const shirt = [0xdcedc8, 0x689f38, 0x388e3c, 0x2e7d32, 0x1b5e20][level];
  const pants = [0xaed581, 0x558b2f, 0x33691e, 0x33691e, 0x263238][level];
  const h = makeHumanoid({ skin, shirt, pants, arms: level >= 2 ? shirt : skin, face: 'smile' });
  const key = `p22quinn${level}`;
  const eye = glowMat(h, 0xffeb3b);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const spot = 0x9ccc65;
  const bulb = 0x7cb342;
  const leaf = 0x558b2f;
  // spots on her cheeks
  for (const [x, y] of [[-0.42, 0.42], [0.45, 0.5], [0.3, 0.32]]) hd.ball(0.07, spot, x, y, Math.sqrt(0.39 - x * x) + 0.02, { seg: 6, rows: 4, sz: 0.3 });
  // bulb hair: a cap, a pointed bulb on top with two leaves, pink flower buns
  if (level >= 2) hood(hd, shirt);
  else hair(hd, bulb, { h: 0.55 });
  hd.ball(0.42, bulb, 0, 1.55, -0.02, { seg: 14, rows: 10, sy: 0.8 });
  hd.cyl(0.3, 0.45, bulb, 0, 1.95, -0.02, { seg: 12, r2: 0.03 });
  for (const s of [-1, 1]) hd.ball(0.2, leaf, s * 0.3, 2.1, 0, { sx: 1.8, sy: 0.2, seg: 10, rows: 5, rz: s * 0.5 });
  for (const s of [-1, 1]) {
    const x = s * (level >= 2 ? 0.86 : 0.8);
    hd.ball(0.3, 0xf48fb1, x, 1.28, -0.25, { seg: 12, rows: 9 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      hd.ball(0.13, 0xf06292, x + s * 0.12, 1.28 + Math.cos(a) * 0.24, -0.25 + Math.sin(a) * 0.24, { seg: 6, rows: 4, sx: 0.5 });
    }
    hd.ball(0.1, leaf, x - s * 0.1, 1.05, -0.3, { sx: 1.6, sy: 0.3, seg: 8, rows: 4, rz: s * 0.6 });
  }
  if (level < 2) band(hd, 0.68, 0.08, 0.8, 2.6, bulb, 0.65, { ry: PI }); // back of the hair
  if (level === 1) headband(hd, 0x2e7d32, 1.02);
  if (level >= 1) {
    // a yellow flower tucked in on top
    const fx = 0.5;
    const fy = 1.6;
    hd.ball(0.09, 0xff8f00, fx, fy, 0.45, { seg: 8, rows: 6 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      hd.ball(0.1, 0xffeb3b, fx + Math.cos(a) * 0.15, fy + Math.sin(a) * 0.15, 0.42, { seg: 6, rows: 4, sz: 0.4 });
    }
  }
  if (level >= 3) {
    // a leaf mask over the lower face and glowing yellow eyes
    band(hd, 0.66, 0.06, 0.46, 2.0, 0x1b5e20, 0.2);
    for (const s of [-1, 1]) hd.box(0.22, 0.1, 0.05, eye, s * 0.26, 0.74, 0.62, { rz: s * -0.15 });
  }
  // a pendant, a ragged tunic hem
  t.tube([[-0.35, 1.0, 0.45], [0, 0.55, 0.56], [0.35, 1.0, 0.45]], 0.025, 0x5d4037, { seg: 10, sides: 4 });
  t.cyl(0.14, 0.06, glowMat(h, 0x4fc3f7), 0, 0.5, 0.57, { axis: 'z', seg: 6 });
  for (let i = 0; i < 5; i++) {
    const x = -0.85 + i * 0.42;
    for (const z of [0.53, -0.53]) t.cyl(0.24, 0.4 + (i % 2) * 0.15, shirt, x, -1.12 - (i % 2) * 0.07, z, { seg: 3, r2: 0.01, rx: PI, sz: 0.25 });
  }
  for (const s of [-1, 1]) t.cyl(0.24, 0.45, shirt, s * 1.0, -1.15, 0, { seg: 3, r2: 0.01, rx: PI, sx: 0.25 });
  if (level >= 1) {
    // the hunter's jerkin: laced front and a strap
    for (let i = 0; i < 3; i++) t.box(0.3, 0.04, 0.03, 0x3e2723, 0, 0.6 - i * 0.3, 0.52, { rz: i % 2 ? 0.4 : -0.4 });
    t.box(0.22, 2.4, 1.12, 0x5d4037, 0, 0, 0, { rz: -0.62 });
  }
  if (level >= 2) {
    // yellow flowers on the hoodie, a belt and a quiver of pink-fletched arrows
    for (const [x, y] of [[-0.55, 0.5], [0.6, -0.1], [-0.3, -0.45], [0.75, 0.6]]) {
      t.ball(0.07, 0xff8f00, x, y, 0.53, { seg: 6, rows: 4 });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * PI * 2;
        t.ball(0.07, 0xffeb3b, x + Math.cos(a) * 0.11, y + Math.sin(a) * 0.11, 0.52, { seg: 6, rows: 4, sz: 0.4 });
      }
    }
    belt(t, 0x6d4c41, 0xffc107, -0.82);
    t.cyl(0.26, 1.7, 0x6d4c41, 0.45, 0.3, -0.8, { seg: 12, rz: -0.3 });
    t.torus(0.27, 0.04, 0x3e2723, 0.66, 0.95, -0.8, { rx: PI / 2, seg: 12, rz: -0.3 });
    for (const dx of [-0.08, 0.08]) {
      t.cyl(0.025, 0.6, 0xa1887f, 0.78 + dx, 1.3, -0.8 + dx, { seg: 5, rz: -0.3 });
      t.box(0.04, 0.24, 0.18, 0xf06292, 0.88 + dx, 1.55, -0.8 + dx, { rz: -0.3 });
    }
  }
  hd.done();
  t.done();
  if (level >= 1) {
    hands(h, key, 0x5d4037, level >= 2 ? tone(shirt, 0.85) : 0x5d4037);
    feet(h, key, 0x5d4037, (b) => b.box(1.12, 0.12, 1.14, 0x3e2723, 0, -1.4, 0.02));
  } else {
    // little leaf wraps on bare green arms and legs
    for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
      const a = wear(h, arm, `${key}:arm${s}`);
      a.box(1.04, 0.16, 1.04, spot, 0, -0.7, 0, { r: 0.03 });
      a.ball(0.18, leaf, 0, -0.62, 0.55, { sx: 1.6, sy: 0.3, seg: 8, rows: 4 });
      a.done();
    }
    feet(h, key, 0x6d4c41);
  }
  if (level >= 4) {
    // mushrooms round her feet and spores drifting round her
    const g = wear(h, h.root, `${key}:shrooms`);
    const glowCap = glowMat(h, 0x69f0ae);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2 + 0.6;
      toadstool(g, Math.cos(a) * 2.3, Math.sin(a) * 2.3, 1.1 + (i % 2) * 0.5, i % 2 ? 0xd84315 : glowCap);
    }
    g.done();
    const sp = drift(h, h.root, 2.6, 0.6, 0.35);
    const s = wear(h, sp, `${key}:spores`);
    const a1 = glowMat(h, 0xc6ff00);
    const a2 = glowMat(h, 0x69f0ae);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * PI * 2;
      s.ball(0.12, i % 2 ? a1 : a2, Math.cos(a) * 2.3, (i % 3) * 0.8, Math.sin(a) * 2.3, { seg: 8, rows: 6 });
    }
    s.done();
  }
  // the bow in the left hand. Fist space: -y is forward, +z is up, +y back toward her.
  const L = [1.0, 1.0, 1.3, 1.4, 1.9][level];
  const bg = fist(h.leftArm, -1.9, 1.2);
  const bk = wear(h, bg, `${key}:bow`);
  const wood = level >= 4 ? 0x3e2723 : 0x8d6e63;
  const tipZ = 0.3 + L;
  for (const s of [-1, 1]) {
    bk.tube([[0, 0, s * 0.25], [0, -0.14, s * (0.3 + L * 0.45)], [0, -0.05, s * (0.3 + L * 0.85)], [0, 0.2, s * tipZ]], 0.075, wood, { seg: 18, sides: 6 });
    if (level >= 2) bk.ball(0.12, 0xf06292, 0, 0.22, s * (tipZ + 0.05), { seg: 8, rows: 6 }); // pink tips
    if (level >= 4) {
      bk.tube([[0.08, -0.02, s * 0.3], [0.08, -0.18, s * (0.3 + L * 0.45)], [0.08, -0.1, s * (0.3 + L * 0.85)]], 0.03, glowMat(h, 0xc6ff00), { seg: 12, sides: 4 });
      for (const f of [0.35, 0.7]) bk.ball(0.1, 0x43a047, 0.1, -0.12, s * (0.3 + L * f), { sx: 0.3, sz: 1.8, seg: 8, rows: 4 });
    }
  }
  bk.cyl(0.11, 0.55, 0x3e2723, 0, 0, 0, { axis: 'z', seg: 10 }); // grip wrap
  for (const s of [-1, 1]) bk.tube([[0, 0.2, s * tipZ], [0, 0.6, 0]], 0.015, 0xeeeeee, { seg: 1, sides: 4 }); // string, drawn back
  bk.cyl(0.03, 1.65, 0xa1887f, 0, -0.2, 0, { seg: 6 }); // the nocked arrow
  for (const a of [0, 2.1, 4.2]) bk.box(0.02, 0.24, 0.12, 0xf06292, Math.sin(a) * 0.06, 0.48, Math.cos(a) * 0.06, { ry: a });
  bk.cyl(0.01, 0.25, level >= 3 ? eye : 0x9e9e9e, 0, -1.12, 0, { seg: 4, r2: 0.1 });
  bk.done();
  h.muzzles = [];
  muzzle(h, bg, -1.2, 0);
  h.leftArm.rotation.set(-PI / 2, 0, -0.1);
  h.rightArm.rotation.set(-1.45, 0, 0.35);
  h.pose = { right: -1.45, left: -PI / 2, leftRecoil: 0.1 };
  h.body.scale.setScalar(0.92);
  h.tracer = level >= 3 ? 0xffeb3b : 0xc6ff00;
  return own(h, 0);
}

// ------------------------------------------------------------------ Stella

/**
 * Stella (painter who draws helpers): a pale pink axolotl with feathery gills and a tail, a black
 * beret, a white smock with a black bow and a giant paintbrush. Lv 1 a palette, Lv 2 an easel and
 * paint splats on her smock, Lv 3 a pink beret, paint buckets and blobs of paint circling her,
 * Lv 4 Masterpiece: a big painting on the easel, a glowing brush and a rainbow arch behind her.
 */
export function makeStella(level) {
  const skin = 0xf8c8d8;
  const h = makeHumanoid({ skin, shirt: 0xfafafa, pants: skin, arms: 0xfafafa, face: 'smile' });
  const key = `p22stella${level}`;
  const gill = 0xec6f9a;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // feathery gills, three a side, and a tilted beret
  for (const s of [-1, 1]) {
    for (const [y, r, l] of [[1.0, 0.55, 0.75], [0.72, 0.15, 0.7], [0.45, -0.25, 0.6]]) {
      const a = [s * 0.58, y, -0.1];
      const b = [s * (0.58 + Math.cos(r) * l), y + Math.sin(r) * l, -0.18];
      hd.tube([a, b], 0.07, gill, { seg: 1, sides: 6 });
      hd.ball(0.08, gill, ...b, { seg: 8, rows: 5 });
      for (let i = 1; i <= 3; i++) {
        const f = i / 3.4;
        const p = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
        for (const d of [-1, 1]) hd.cyl(0.04, 0.26, 0xf48fb1, p[0], p[1] + 0.12, p[2] + d * 0.06, { seg: 5, r2: 0.01, rx: d * 0.4 });
      }
    }
  }
  const beret = level >= 3 ? 0xd81b60 : 0x111111;
  hd.ball(0.8, beret, 0.1, 1.2, -0.02, { sy: 0.3, seg: 20, rows: 10, rz: -0.18 });
  hd.torus(0.66, 0.05, tone(beret, 0.8), 0.06, 1.12, -0.02, { rx: PI / 2, seg: 20, rz: -0.18 });
  hd.cyl(0.05, 0.18, beret, 0.08, 1.48, -0.02, { seg: 6, rz: -0.18 });
  if (level >= 4) star(hd, -0.42, 1.2, 0.66, 0.16, glowMat(h, 0xffd740), { rx: PI / 2 });
  // the smock: a flared hem over the hips, buttons, pockets and a black bow at the neck
  t.slab(2.2, 1.0, 1.16, 0xfafafa, 0, -1.45, 0, { bw: 1.2, bd: 1.3 });
  t.box(2.56, 0.08, 1.48, 0xe0e0e0, 0, -1.92, 0);
  for (const s of [-1, 1]) t.box(0.52, 0.42, 0.04, 0xeeeeee, s * 0.58, -1.35, 0.68, { r: 0.03, rx: -0.12 });
  for (let i = 0; i < 3; i++) t.cyl(0.06, 0.04, 0xbdbdbd, 0, 0.35 - i * 0.45, 0.52, { axis: 'z', seg: 8 });
  for (const s of [-1, 1]) t.ball(0.24, 0x111111, s * 0.25, 0.85, 0.56, { sx: 1.3, sy: 0.8, sz: 0.35, seg: 10, rows: 6 });
  t.ball(0.1, 0x111111, 0, 0.85, 0.6, { seg: 8, rows: 6 });
  for (const s of [-1, 1]) t.box(0.12, 0.4, 0.04, 0x111111, s * 0.12, 0.6, 0.57, { rz: s * 0.3 });
  const splats = level >= 2 ? 9 : 5;
  for (let i = 0; i < splats; i++) {
    const x = -0.75 + ((i * 0.37) % 1.5);
    const y = 0.4 - ((i * 0.53) % 1.0) * 2.1;
    t.ball(0.13 + (i % 3) * 0.04, PAINT[i % 5], x, y, 0.52, { sz: 0.15, sx: 1.2, seg: 8, rows: 5 });
  }
  // the axolotl tail: tapering out the back, with a fin along the top
  for (let i = 0; i < 5; i++) t.ball(0.36 - i * 0.06, skin, 0, -1.55 + i * 0.05, -0.75 - i * 0.32, { seg: 10, rows: 7, sy: 0.85 });
  t.prism([[-0.55, 0], [-2.1, 0.05], [-0.85, 0.42]], 0.06, gill, 0, -1.3, 0);
  hd.done();
  t.done();
  hands(h, key, null, 0xeeeeee, (a) => a.box(1.08, 0.28, 1.08, 0xeeeeee, 0, -1.4, 0, { r: 0.05 }));
  feet(h, key, 0x111111);
  // the giant paintbrush (the muzzle at its tip)
  const g = fist(h.rightArm, -1.9, 1.0);
  const bk = wear(h, g, `${key}:brush`);
  const paint = level >= 4 ? glowMat(h, 0xab47bc) : 0x8e24aa;
  bk.cyl(0.13, 2.4, 0x8d6e63, 0, -0.9, 0, { seg: 10, r2: 0.09 });
  bk.cyl(0.1, 0.12, 0xd32f2f, 0, 0.32, 0, { seg: 10 });
  for (const y of [-2.05, -2.3]) bk.torus(0.18, 0.03, 0x78909c, 0, y, 0, { rx: PI / 2, seg: 12 });
  bk.cyl(0.19, 0.4, 0xb0bec5, 0, -2.2, 0, { seg: 12, r2: 0.16 });
  bk.cyl(0.26, 0.45, 0xfff3e0, 0, -2.6, 0, { seg: 12, r2: 0.2 });
  bk.cyl(0.04, 0.45, paint, 0, -3.02, 0, { seg: 12, r2: 0.27 });
  bk.ball(0.12, paint, 0.15, -2.75, 0.1, { seg: 8, rows: 6, sy: 1.4 }); // a drip
  bk.done();
  h.muzzles = [];
  muzzle(h, g, -3.3, 0);
  if (level >= 1) {
    // a wooden palette with a thumb hole and dabs of paint
    const p = fist(h.leftArm, -2.05, 1.0);
    const pk = wear(h, p, `${key}:palette`);
    pk.plan([[-0.6, 0.0], [-0.45, 0.65], [0.1, 0.85], [0.6, 0.6], [0.65, 0.1], [0.2, -0.1], [0.05, 0.1], [-0.25, -0.1]], 0.08, 0xd7a86e, 0, -0.04, 0.1);
    pk.cyl(0.1, 0.1, 0x5d4037, -0.12, 0, 0.12, { seg: 10 });
    [[-0.38, 0.45], [-0.05, 0.62], [0.32, 0.55], [0.45, 0.25], [-0.4, 0.15]].forEach(([x, z], i) => pk.ball(0.12, PAINT[i], x, 0.05, z + 0.1, { sy: 0.4, seg: 8, rows: 5 }));
    pk.done();
  }
  if (level >= 2) {
    // the easel beside her (a big painting on it at Lv 4)
    const e = new THREE.Group();
    e.position.set(2.6, 0, -0.4);
    e.rotation.y = -0.4;
    h.body.add(e);
    const ek = wear(h, e, `${key}:easel`);
    for (const x of [-0.6, 0.6]) ek.tube([[x * 1.2, 0, 0.3], [x * 0.2, 4.0, 0.05]], 0.07, WOOD, { seg: 1, sides: 6 });
    ek.tube([[0, 0, -1.1], [0, 3.7, -0.05]], 0.07, WOOD, { seg: 1, sides: 6 });
    ek.box(1.7, 0.12, 0.32, WOOD, 0, 1.6, 0.22, { r: 0.03 });
    if (level >= 4) {
      ek.box(2.75, 2.25, 0.12, 0x8d6e63, 0, 2.75, 0.2, { r: 0.04 });
      ek.box(2.55, 2.05, 0.06, 0x81d4fa, 0, 2.75, 0.27);
      ek.cyl(0.32, 0.03, 0xffca28, 0.7, 3.3, 0.31, { axis: 'z', seg: 16 });
      ek.ball(1.1, 0x66bb6a, -0.4, 1.75, 0.27, { sz: 0.04, seg: 16, rows: 8 }); // hill
      ek.ball(0.8, 0x43a047, 0.7, 1.75, 0.28, { sz: 0.04, seg: 16, rows: 8 });
      ek.ball(0.35, 0x8e24aa, -0.6, 3.1, 0.3, { sz: 0.08, seg: 12, rows: 6 });
      ek.ball(0.25, 0xef5350, -0.2, 2.6, 0.3, { sz: 0.08, seg: 12, rows: 6 });
    } else {
      ek.box(1.5, 1.2, 0.1, 0xfafafa, 0, 2.3, 0.25);
      ek.box(1.6, 1.3, 0.06, 0x8d6e63, 0, 2.3, 0.2);
      ek.ball(0.3, 0x8e24aa, 0.2, 2.4, 0.3, { sz: 0.08, seg: 10, rows: 6 });
      ek.tube([[-0.5, 2.0, 0.31], [-0.1, 2.3, 0.31], [0.3, 2.0, 0.31]], 0.03, 0x29b6f6, { seg: 8, sides: 4 });
    }
    ek.done();
  }
  if (level >= 3) {
    // paint buckets at her feet, and blobs of paint circling her
    const b = wear(h, h.body, `${key}:buckets`);
    for (const [x, z, c] of [[-1.9, 1.2, 0x8e24aa], [-1.2, 1.8, 0x29b6f6], [-2.3, 0.3, 0xffca28]]) {
      b.cyl(0.32, 0.65, 0xb0bec5, x, 0.33, z, { seg: 14, r2: 0.36 });
      b.torus(0.36, 0.03, 0x78909c, x, 0.65, z, { rx: PI / 2, seg: 14 });
      b.cyl(0.34, 0.03, c, x, 0.62, z, { seg: 14 });
      b.torus(0.34, 0.02, 0x78909c, x, 0.65, z, { arc: PI, seg: 12, rz: -0.4 }); // handle
      b.ball(0.08, c, x + 0.2, 0.45, z + 0.32, { sy: 2.0, seg: 6, rows: 5 }); // drip
    }
    b.done();
    const ring = drift(h, h.root, 3.2, 0.8, 0.25);
    const rk = wear(h, ring, `${key}:blobs`);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      rk.ball(0.3, PAINT[i], Math.cos(a) * 2.4, (i % 2) * 0.4, Math.sin(a) * 2.4, { seg: 10, rows: 7, sy: 0.85 });
      rk.ball(0.12, PAINT[i], Math.cos(a + 0.18) * 2.4, (i % 2) * 0.4 - 0.25, Math.sin(a + 0.18) * 2.4, { seg: 6, rows: 4 });
    }
    rk.done();
  }
  if (level >= 4) {
    // a rainbow arch over her back
    const arch = new THREE.Group();
    arch.position.set(0, 2.4, -1.3);
    h.root.add(arch);
    const ak = wear(h, arch, `${key}:rainbow`);
    [0xe53935, 0xff9800, 0xfdd835, 0x43a047, 0x1e88e5, 0x8e24aa].forEach((c, i) => {
      ak.torus(3.0 - i * 0.2, 0.11, glowMat(h, c, 0.6), 0, 0, i % 2 ? 0.02 : 0, { arc: PI, seg: 30 });
    });
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) ak.ball(0.32 - i * 0.03, 0xfafafa, s * (2.5 + i * 0.22), 0.05 + (i % 2) * 0.15, 0.1, { seg: 10, rows: 7 }); // cloud ends
    ak.done();
    h.body.scale.setScalar(1.08);
  }
  h.rightArm.rotation.set(-2.2, 0, 0.15);
  h.leftArm.rotation.set(-0.7, 0, -0.25);
  h.pose = { right: -2.2, left: -0.7, leftRecoil: 0 };
  h.swing = 1.2;
  h.tracer = 0xab47bc;
  return own(h, 0);
}

// ------------------------------------------------------------------ Wafer

/**
 * Wafer (gingerbread fighter who throws ornaments): a gingerbread kid with an icing face, icing
 * trim, gumdrop buttons and a red backpack. Lv 1 an icing cap and a candy cane on the back, Lv 2
 * candy-cane shoulder pads and a bandolier of ornaments, Lv 3 a darker bake, gumdrop armour and
 * a gumdrop crown, Lv 4 Peppermint Knight: a chocolate bake, a peppermint shield, a sack of
 * glowing ornaments and sprinkles circling him.
 */
export function makeWafer(level) {
  const bake = [0xe8a46a, 0xe8a46a, 0xe8a46a, 0xc8783c, 0x6d3b1f][level];
  const h = makeHumanoid({ skin: bake, shirt: bake, pants: bake, arms: bake, face: 'blank' });
  h.head.children[0].material = h.M(bake); // no printed face: the icing face is built below
  const key = `p22wafer${level}`;
  const ICING = 0xfffaf0;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // the face: dark candy eyes, icing brows and smile, pink cheeks, freckles
  const fz = (x, y) => Math.sqrt(Math.max(0.01, 0.39 - x * x - (y - 0.61) ** 2 * 0.2)) + 0.02;
  for (const s of [-1, 1]) {
    hd.ball(0.11, 0x3e2723, s * 0.24, 0.76, fz(0.24, 0.76), { sy: 1.25, sz: 0.4, seg: 10, rows: 7 });
    hd.ball(0.035, 0xffffff, s * 0.24 + 0.04, 0.82, fz(0.24, 0.76) + 0.04, { seg: 6, rows: 4 });
    hd.tube([[s * 0.14, 0.96, fz(0.14, 0.96)], [s * 0.25, 1.0, fz(0.25, 1.0)], [s * 0.36, 0.96, fz(0.36, 0.96)]], 0.025, ICING, { seg: 8, sides: 4 });
    hd.ball(0.11, 0xef9a9a, s * 0.4, 0.5, fz(0.4, 0.5) - 0.02, { sz: 0.3, seg: 8, rows: 5 });
    for (const [fx, fy] of [[0.45, 0.62], [0.52, 0.55], [0.36, 0.6]]) hd.ball(0.025, 0x8d5524, s * fx, fy, fz(fx, fy), { seg: 5, rows: 3 });
  }
  const smile = [];
  for (let i = 0; i <= 6; i++) {
    const x = -0.24 + i * 0.08;
    const y = 0.42 - Math.sin((i / 6) * PI) * 0.1;
    smile.push([x, y, fz(x, y)]);
  }
  hd.tube(smile, 0.035, ICING, { seg: 18, sides: 5 });
  if (level >= 1) {
    // an icing cap on top with drips
    dome(hd, 0.66, 0.36, ICING, 0, 0.98, 0, { seg: 20 });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * PI * 2 + 0.2;
      const l = 0.12 + (i % 3) * 0.08;
      hd.cyl(0.07, l, ICING, Math.sin(a) * 0.63, 1.0 - l / 2, Math.cos(a) * 0.63, { seg: 6 });
      hd.ball(0.07, ICING, Math.sin(a) * 0.63, 1.0 - l, Math.cos(a) * 0.63, { seg: 6, rows: 4 });
    }
  } else {
    hd.ball(0.32, 0xffcc80, 0.15, 1.18, 0.2, { sx: 1.4, sy: 0.4, seg: 10, rows: 6, rz: -0.3 }); // a light swoop of icing hair
  }
  if (level >= 3) {
    // a crown of gumdrops
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      gumdrop(hd, Math.sin(a) * 0.4, 1.22, Math.cos(a) * 0.4, 0.2, [0xe53935, 0x43a047, 0xfdd835, 0x8e24aa, 0x1e88e5][i]);
    }
  }
  // icing zigzag at the collar and hem, gumdrop buttons, a red backpack
  const zig = (y, rx, rz, n, amp) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * PI * 2;
      pts.push([Math.sin(a) * rx, y + (i % 2 ? amp : -amp), Math.cos(a) * rz]);
    }
    return pts;
  };
  t.tube(zig(0.88, 1.06, 0.56, 24, 0.07), 0.04, ICING, { seg: 72, sides: 4, tension: 0 });
  t.tube(zig(-0.88, 1.06, 0.56, 24, 0.07), 0.04, ICING, { seg: 72, sides: 4, tension: 0 });
  [0xe53935, 0x43a047, 0xfdd835].forEach((c, i) => t.ball(0.15, c, 0, 0.4 - i * 0.5, 0.52, { sz: 0.55, seg: 10, rows: 7 }));
  t.box(1.3, 1.3, 0.55, 0xc62828, 0, 0.05, -0.8, { r: 0.12 });
  t.box(1.34, 0.45, 0.6, 0xb71c1c, 0, 0.5, -0.82, { r: 0.08 });
  t.box(0.9, 0.4, 0.12, 0xb71c1c, 0, -0.3, -1.1, { r: 0.05 });
  t.cyl(0.06, 0.04, GOLD, 0, 0.3, -1.13, { axis: 'z', seg: 8 });
  for (const s of [-1, 1]) t.box(0.2, 0.1, 1.2, 0x7f0000, s * 0.45, 0.98, -0.15);
  if (level >= 1) {
    // a candy cane on the back
    const cx = 0.35;
    const cz = -1.2;
    for (let i = 0; i < 7; i++) t.cyl(0.14, 0.36, i % 2 ? 0xfafafa : 0xe53935, cx - i * 0.04, -1.0 + i * 0.36, cz, { seg: 10, rz: 0.12 });
    for (let i = 0; i < 6; i++) t.torus(0.32, 0.14, i % 2 ? 0xfafafa : 0xe53935, cx - 0.56, 1.36, cz, { arc: PI / 6 + 0.02, rz: (i * PI) / 6, seg: 4 });
  }
  if (level >= 2) {
    // a bandolier of ornaments
    t.box(0.28, 2.5, 1.12, 0x6d4c41, 0, 0, 0, { rz: 0.7 });
    for (let i = 0; i < 4; i++) {
      const u = -0.75 + i * 0.5;
      ornament(t, u * 0.75, -u * 0.85 - 0.12, 0.68, 0.17, CANDY[i]);
    }
  }
  hd.done();
  t.done();
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    a.tube(zig(-1.55, 0.52, 0.52, 16, 0.06), 0.035, ICING, { seg: 48, sides: 4, tension: 0 });
    a.box(1.03, 0.08, 1.03, tone(bake, 0.85), 0, -0.7, 0); // a baked crease, so the rig keeps the hand
    if (level === 2) {
      // candy-cane shoulder pads
      a.ball(0.68, 0xfafafa, 0, 0.02, 0, { sy: 0.5, seg: 14, rows: 8 });
      for (const y of [0.12, -0.12]) a.torus(0.6 - Math.abs(y) * 0.6, 0.05, 0xe53935, 0, y + 0.08, 0, { rx: PI / 2, seg: 16 });
    }
    if (level >= 3) {
      // gumdrop armour
      gumdrop(a, 0, -0.15, 0, 0.62, s < 0 ? 0x43a047 : 0xe53935);
      a.cyl(0.66, 0.1, 0xfafafa, 0, -0.18, 0, { seg: 14 });
    }
    a.done();
  }
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    b.tube(zig(-1.5, 0.52, 0.52, 16, 0.06), 0.035, ICING, { seg: 48, sides: 4, tension: 0 });
    b.box(1.03, 0.08, 1.03, tone(bake, 0.85), 0, -0.6, 0);
    b.done();
  }
  if (level >= 4) {
    // a peppermint shield on the left arm, and a sack of glowing ornaments on the ground
    const sh = fist(h.leftArm, -1.6, 1.0);
    sh.rotation.x = 0.9;
    sh.position.z = 0.4;
    const sk = wear(h, sh, `${key}:shield`);
    sk.cyl(0.86, 0.2, 0xfafafa, 0, 0, 0.55, { axis: 'z', seg: 28 });
    for (let i = 0; i < 8; i += 2) {
      const a0 = (i / 8) * PI * 2;
      const a1 = ((i + 1) / 8) * PI * 2;
      const am = (a0 + a1) / 2;
      sk.plan([[0, 0], [Math.cos(a0) * 0.82, Math.sin(a0) * 0.82], [Math.cos(am + 0.2) * 0.84, Math.sin(am + 0.2) * 0.84], [Math.cos(a1 + 0.3) * 0.8, Math.sin(a1 + 0.3) * 0.8]], 0.04, 0xe53935, 0, 0, 0.64, { rx: PI / 2 });
    }
    sk.torus(0.86, 0.05, 0xe0e0e0, 0, 0, 0.55, { seg: 28 });
    sk.cyl(0.18, 0.08, 0xe53935, 0, 0, 0.68, { axis: 'z', seg: 14 });
    sk.done();
    const g = wear(h, h.root, `${key}:sack`);
    g.ball(0.75, 0x8d6e63, 1.95, 0.7, -0.8, { sy: 0.9, seg: 16, rows: 10 });
    g.cyl(0.25, 0.35, 0x8d6e63, 1.95, 1.45, -0.8, { seg: 12, r2: 0.4 });
    g.torus(0.24, 0.05, 0xc62828, 1.95, 1.35, -0.8, { rx: PI / 2, seg: 12 });
    for (let i = 0; i < 4; i++) ornament(g, 1.65 + (i % 2) * 0.6, 1.62 + (i >> 1) * 0.12, -0.55 - (i >> 1) * 0.45, 0.2, glowMat(h, CANDY[i], 0.6));
    g.done();
    const sp = drift(h, h.root, 2.3, 1.0, 0.25);
    const sk2 = wear(h, sp, `${key}:sprinkles`);
    const cols = [0xff4081, 0x40c4ff, 0xffeb3b, 0x69f0ae].map((c) => glowMat(h, c, 0.6));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2;
      sk2.cyl(0.07, 0.3, cols[i % 4], Math.cos(a) * 2.4, (i % 3) * 0.3, Math.sin(a) * 2.4, { seg: 6, rz: i * 0.9, rx: i * 0.6 });
    }
    sk2.done();
    h.body.scale.setScalar(1.12);
  }
  // the ornament in the throwing hand
  const th = fist(h.rightArm, -2.1, 1.0);
  const tk = wear(h, th, `${key}:throw`);
  ornament(tk, 0, -0.3, 0, 0.28, level >= 4 ? glowMat(h, 0xffd740) : 0xe53935);
  tk.done();
  h.muzzles = [];
  muzzle(h, th, -0.3, 0);
  const left = level >= 4 ? -0.9 : -0.8;
  h.rightArm.rotation.set(-2.7, 0, 0.2);
  h.leftArm.rotation.set(left, 0, -0.3);
  h.pose = { right: -2.7, left, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = { color: level >= 4 ? 0xffd740 : 0xe53935, size: 0.9 + level * 0.06 };
  h.tracer = 0xffd740;
  return own(h, 0);
}

// ------------------------------------------------------------------ Sparks

/**
 * Sparks Kilowatt (plasma bursts): a girl in a robo-suit with lilac bun hair, big red glasses and
 * a plasma blaster. Lv 1 a bigger blaster with an energy cell, Lv 2 a violet stage suit and a
 * rocket pod on her shoulder, Lv 3 a jet pack, a star hair clip and sparkles circling her,
 * Lv 4 Mech Suit: a gold idol suit with glowing lines, a mech arm with a heavy cannon and a halo
 * of stars.
 */
export function makeSparks(level) {
  const mech = level >= 4;
  const pal = mech ? [0xffc400, 0xff6d00, 0xffab00, 0xc51162] : level >= 2 ? [0x7c4dff, 0x4527a0, 0x651fff, 0x311b92] : [0xec407a, 0xad1457, 0xc2185b, 0x880e4f];
  const [shirt, pants, magenta, deep] = pal;
  const h = makeHumanoid({ skin: 0xf8bbd0, shirt, pants, arms: shirt, face: 'smile' });
  const key = `p22sparks${level}`;
  const plasma = glowMat(h, 0xff4fd8);
  const bolt = 0xb0bec5;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // lilac hair with bangs and two puffy buns
  const HAIR = 0xce93d8;
  hair(hd, HAIR, { h: 0.5 });
  band(hd, 0.67, 0.07, 0.3, 2.0, HAIR, 1.05);
  for (const s of [-1, 1]) {
    hd.ball(0.4, HAIR, s * 0.62, 1.5, -0.12, { seg: 14, rows: 10 });
    hd.torus(0.3, 0.06, magenta, s * 0.55, 1.3, -0.1, { rx: PI / 2, rz: s * 0.6, seg: 14 });
  }
  if (level >= 3) star(hd, 0.66, 1.05, 0.25, 0.24, glowMat(h, 0xffeb3b), { rz: -PI / 2, ry: 0.4 });
  // big round red glasses
  const glass = glassMat(h, 0xffebee, 0.5);
  for (const s of [-1, 1]) {
    hd.torus(0.22, 0.05, 0xe53935, s * 0.28, 0.72, 0.64, { seg: 16 });
    hd.cyl(0.2, 0.02, glass, s * 0.28, 0.72, 0.64, { axis: 'z', seg: 14 });
    hd.box(0.04, 0.05, 0.6, 0xe53935, s * 0.63, 0.76, 0.32);
  }
  hd.box(0.14, 0.06, 0.06, 0xe53935, 0, 0.76, 0.67);
  // the robo-suit: a chest plate with a glowing core, bolts, panel lines and a belt
  t.box(1.6, 1.05, 0.16, magenta, 0, 0.3, 0.55, { r: 0.06 });
  t.box(1.3, 0.04, 0.03, tone(magenta, 0.7), 0, 0.05, 0.64);
  for (const [x, y] of [[-0.66, 0.7], [0.66, 0.7], [-0.66, -0.1], [0.66, -0.1]]) t.cyl(0.07, 0.05, bolt, x, y, 0.64, { axis: 'z', seg: 6 });
  t.cyl(0.22, 0.06, bolt, 0, 0.4, 0.64, { axis: 'z', seg: 16 });
  t.cyl(0.16, 0.05, plasma, 0, 0.4, 0.67, { axis: 'z', seg: 16 });
  t.box(2.12, 0.3, 1.12, deep, 0, -0.85, 0, { r: 0.05 });
  t.box(0.42, 0.26, 0.06, bolt, 0, -0.85, 0.58, { r: 0.03 });
  for (const s of [-1, 1]) t.box(0.3, 0.2, 0.16, deep, s * 0.65, -0.85, 0.62, { r: 0.03 }); // belt pouches
  t.box(1.6, 1.4, 0.14, magenta, 0, 0.1, -0.56, { r: 0.06 }); // back plate
  if (mech) {
    // glowing suit lines
    for (const s of [-1, 1]) t.box(0.06, 1.8, 0.03, plasma, s * 0.86, 0, 0.53);
    t.box(1.5, 0.06, 0.03, plasma, 0, -0.3, 0.64);
  }
  if (level >= 2) {
    // a rocket pod on the left shoulder
    t.box(0.95, 0.85, 1.25, deep, 1.3, 1.45, -0.1, { r: 0.08 });
    t.box(0.6, 0.25, 0.6, 0x37474f, 1.3, 0.98, -0.1, { r: 0.04 }); // mount
    for (const [x, y] of [[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.2], [0.22, 0.2]]) {
      t.cyl(0.15, 0.06, INK, 1.3 + x, 1.45 + y, 0.53, { axis: 'z', seg: 12 });
      t.cyl(0.1, 0.08, glowMat(h, 0xff9100), 1.3 + x, 1.45 + y, 0.5, { axis: 'z', seg: 10, r2: 0.02 });
    }
  }
  if (level >= 3) {
    // a jet pack: a tank between two thrusters with glowing nozzles
    t.box(1.0, 1.4, 0.5, 0x90a4ae, 0, 0.15, -0.85, { r: 0.12 });
    for (const s of [-1, 1]) {
      t.cyl(0.26, 1.5, magenta, s * 0.6, 0.05, -1.05, { seg: 14 });
      dome(t, 0.26, 0.25, magenta, s * 0.6, 0.8, -1.05);
      t.cyl(0.2, 0.3, 0x37474f, s * 0.6, -0.85, -1.05, { seg: 14, r2: 0.26 });
      t.cyl(0.16, 0.06, glowMat(h, 0x40c4ff), s * 0.6, -1.0, -1.05, { seg: 14 });
      t.prism([[0, 0], [-0.5, -0.3], [-0.5, 0.2], [0, 0.5]], 0.05, deep, s * 0.88, -0.6, -1.05, { ry: PI / 2 }); // fins
    }
  }
  hd.done();
  t.done();
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    a.ball(0.68, magenta, 0, -0.05, 0, { sy: 0.55, seg: 14, rows: 8 });
    a.cyl(0.08, 0.05, bolt, s * 0.6, -0.15, 0.3, { axis: 'x', seg: 6 });
    a.box(1.1, 0.5, 1.1, deep, 0, -1.3, 0, { r: 0.06 }); // gauntlet
    a.box(1.12, 0.06, 1.12, mech ? plasma : bolt, 0, -1.1, 0);
    a.box(1.06, 0.38, 1.06, deep, 0, -1.8, 0, { r: 0.06 });
    if (mech && s < 0) {
      // the mech arm: armour plates over the whole right arm
      a.box(1.45, 1.4, 1.45, 0x78909c, 0, -0.9, 0, { r: 0.12 });
      a.box(1.5, 0.08, 1.5, 0x546e7a, 0, -0.55, 0);
      for (const z of [-0.74, 0.74]) a.cyl(0.08, 0.05, bolt, 0, -0.6, z, { axis: 'z', seg: 6 });
      a.cyl(0.18, 0.4, 0x37474f, 0, -0.2, -0.78, { axis: 'z', seg: 10 }); // hydraulic
    }
    a.done();
  }
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    b.box(1.2, 0.8, 1.3, deep, 0, -1.6, 0.08, { r: 0.1 });
    b.box(1.24, 0.18, 1.38, bolt, 0, -1.92, 0.08, { r: 0.04 });
    b.box(0.85, 0.42, 0.18, magenta, 0, -0.95, 0.52, { r: 0.06 }); // knee plate
    b.cyl(0.07, 0.05, bolt, 0, -1.45, 0.75, { axis: 'z', seg: 6 });
    if (mech) b.box(0.06, 1.0, 0.03, plasma, 0, -0.45, 0.52);
    b.done();
  }
  // the plasma blaster (a heavy cannon on the mech arm at Lv 4). Gun space: -y forward, +z up.
  const len = [1.5, 1.9, 2.0, 2.2, 2.6][level];
  const w = [0.45, 0.6, 0.6, 0.65, 0.9][level];
  const g = fist(h.rightArm, -1.9, 1.0);
  const k = wear(h, g, `${key}:gun`);
  const body = mech ? 0x546e7a : 0xf3e5f5;
  const z = 0.22;
  k.box(w, len - 0.4, w + 0.1, body, 0, -len / 2 + 0.1, z, { r: 0.08 });
  k.cyl(w * 0.3, 0.6, 0x37474f, 0, -len + 0.05, z, { seg: 12 });
  const rings = 2 + Math.min(level, 2);
  for (let i = 0; i < rings; i++) k.torus(w * 0.42, 0.05, plasma, 0, -0.35 - i * ((len - 0.9) / rings), z, { rx: PI / 2, seg: 14, sz: 1.2 });
  k.cyl(w * 0.36, 0.2, plasma, 0, -len - 0.3, z, { seg: 14, r2: w * 0.3 });
  k.box(0.24, 0.3, 0.55, 0x37474f, 0, 0.0, z - 0.4, { rx: -0.25, r: 0.04 }); // grip
  k.box(w * 0.5, 0.5, 0.12, tone(body, 0.8), 0, -0.2, z + w / 2 + 0.08, { r: 0.03 }); // top sight
  if (level >= 1) {
    k.cyl(0.17, 0.85, glassMat(h, 0xf8bbd0, 0.5), 0, -0.75, z + w / 2 + 0.22, { seg: 12 }); // energy cell
    k.cyl(0.12, 0.75, plasma, 0, -0.75, z + w / 2 + 0.22, { seg: 10 });
    for (const y of [-0.33, -1.17]) k.cyl(0.19, 0.08, 0x37474f, 0, y, z + w / 2 + 0.22, { seg: 12 });
  }
  if (mech) {
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) k.box(0.04, 0.12, 0.6, INK, s * (w / 2 + 0.02), -0.6 - i * 0.25, z); // vents
    k.box(w + 0.2, 0.3, w + 0.3, 0x37474f, 0, -len + 0.4, z, { r: 0.05 });
  }
  k.done();
  h.muzzles = [];
  muzzle(h, g, -len - 0.4, z);
  if (level >= 3) {
    // sparkles circling her (a halo of stars at Lv 4)
    const ring = drift(h, h.root, 2.3, 1.2, 0.25);
    const rk = wear(h, ring, `${key}:sparkles`);
    const cols = [0xffeb3b, 0xff80ab, 0x80d8ff].map((c) => glowMat(h, c));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      star(rk, Math.cos(a) * 3.0, (i % 2) * 0.5, Math.sin(a) * 3.0, 0.24, cols[i % 3], { rx: PI / 2, ry: -a });
    }
    rk.done();
  }
  if (mech) {
    const halo = drift(h, h.body, 6.2, 0.7, 0.12);
    const hk = wear(h, halo, `${key}:halo`);
    const gold = glowMat(h, 0xffeb3b);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      star(hk, Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15, 0.26, gold, { rx: PI / 2, ry: -a + PI / 2 });
    }
    hk.torus(1.15, 0.03, gold, 0, 0, 0, { rx: PI / 2, seg: 28 });
    hk.done();
    h.body.scale.setScalar(1.1);
  }
  h.rightArm.rotation.set(-PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-PI / 2 + 0.1, 0, -0.5);
  h.pose = { right: -PI / 2, left: -PI / 2 + 0.1, leftRecoil: 0.25 };
  h.tracer = 0xff4fd8;
  h.projectile = { color: 0xff4fd8, size: 0.8 + level * 0.1 };
  return own(h, 0);
}

export const MODELS = {
  toxicnatorMaitake: makeMaitake,
  railgunnerScientist: makeScientist,
  mortarVoca: makeVoca,
  sniperQuinn: makeQuinn,
  engineerStella: makeStella,
  warlockWafer: makeWafer,
  soldierSparks: makeSparks,
};
