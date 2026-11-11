// Tower models: machines, batch 1 (rebuilt with the vehicle kit in ../vehicles.js).
// In here: Gatling, Turret, Sentry (and its bottom path), AA Turret (and its bottom path), Tesla.
// Each makeX(level) builds one tower's look; TOWER_MODELS in ../models.js says which tower uses which.
//
// Every piece is batched by the kit: a whole tower is a handful of meshes however many bolts it has.
// Kit keys name the tower, level and part, so the second tower of a kind costs nothing to build.

import * as THREE from 'three';
import { TOWERS } from '../config.js';
import { antenna, barrel, bolts, crate, glowMat, hatch, kit, louvres, PARTS, tone } from '../vehicles.js';
import { gunMuzzle, makeThing } from './bits.js';

const { STEEL, GUN, DARK } = PARTS;
const PI = Math.PI;
const BRASS = 0xc9a227;
const OLIVE = 0x5d6b3a;
const CONCRETE = 0x9e9e9e;
const HAZARD = 0xf2c12e;

/** A concrete pad with bevelled top edges, anchor bolts in the corners and hazard stripes along the front. */
function pad(k, w, h, col, stripes = true) {
  k.slab(w, h, w, col, 0, h / 2, 0, { tw: 1 - 0.18 / w, td: 1 - 0.18 / w });
  k.box(w - 0.5, 0.03, 0.05, tone(col, 0.8), 0, h + 0.005, w / 4); // expansion joints
  k.box(0.05, 0.03, w - 0.5, tone(col, 0.8), w / 4, h + 0.005, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * (w / 2 - 0.35);
    const z = sz * (w / 2 - 0.35);
    k.box(0.36, 0.06, 0.36, tone(col, 0.7), x, h + 0.02, z);
    k.cyl(0.07, 0.12, STEEL, x, h + 0.08, z, { seg: 6 });
  }
  if (!stripes) return;
  const n = Math.round(w / 0.5);
  for (let i = 0; i < n; i++) {
    k.box(w / n - 0.02, 0.2, 0.04, i % 2 ? 0x1a1a1a : HAZARD, -w / 2 + (i + 0.5) * (w / n), h * 0.55, w / 2 - 0.05, { rz: 0 });
  }
}

/** A swivel ring: a dark drum with a steel race and bolts round it. */
function ring(k, r, y, h) {
  k.cyl(r, h, DARK, 0, y, 0, { seg: 22 });
  k.torus(r - 0.04, 0.07, STEEL, 0, y + h / 2, 0, { rx: PI / 2, seg: 22 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * PI * 2;
    k.cyl(0.05, 0.06, STEEL, Math.cos(a) * (r - 0.18), y + h / 2 + 0.04, Math.sin(a) * (r - 0.18), { seg: 6 });
  }
}

/**
 * Spinning minigun barrels along +Z from (x, y, z): `n` barrels on a circle of radius `r`, with
 * clamps and a spindle. Spins while firing (u.spin). `col` is a colour or a glow material.
 */
function spinBarrels(u, parent, key, x, y, z, len, n, r, col = GUN, glow = null) {
  const mount = new THREE.Group();
  mount.position.set(x, y, z);
  mount.rotation.x = PI / 2;
  parent.add(mount);
  const spin = new THREE.Group();
  mount.add(spin);
  const k = kit(u, spin, key);
  k.cyl(r * 0.45, len, DARK, 0, len / 2, 0, { seg: 8 }); // spindle
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2;
    const bx = Math.cos(a) * r;
    const bz = Math.sin(a) * r;
    k.cyl(r * 0.32, len, glow && i % 3 === 0 ? glow : col, bx, len / 2, bz, { seg: 8 });
    k.cyl(r * 0.16, 0.03, 0x050505, bx, len + 0.012, bz, { seg: 6 }); // bore
  }
  for (const f of [0.08, 0.55, 0.94]) k.cyl(r * 1.42, len * 0.06, tone(STEEL, 0.75), 0, len * f, 0, { seg: 14 }); // clamps
  k.done();
  (u.spin ??= []).push(spin);
  return spin;
}

/** A belt of brass rounds hanging from (x, y, z), curving down and back. */
function ammoBelt(k, x, y, z, n, s = 1) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const py = y - i * 0.17 * s;
    const pz = z - i * 0.09 * s + Math.sin(i * 0.9) * 0.04;
    pts.push([x, py, pz]);
    k.cyl(0.055 * s, 0.34 * s, BRASS, x, py, pz, { axis: 'x', seg: 6 });
    k.cyl(0.03 * s, 0.05, 0xb08a1a, x + 0.18 * s, py, pz, { axis: 'x', seg: 5, r2: 0.012 }); // bullet tip
  }
  k.tube(pts, 0.035 * s, 0x2b2b2b, { sides: 4 });
}

/** A radar dish on top of `parent` at (x, y, z), tipped back to look up and forward. */
function dish(u, parent, key, x, y, z, r, col, light) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.x = 0.85;
  parent.add(g);
  const k = kit(u, g, key);
  k.cyl(r * 0.18, r * 0.35, tone(col, 0.85), 0, 0, 0, { r2: r, seg: 18 }); // the bowl, opening up
  k.cyl(r * 0.92, 0.03, tone(col, 0.55), 0, r * 0.18, 0, { seg: 18 }); // inside face
  k.torus(r * 0.55, 0.02, tone(col, 0.75), 0, r * 0.2, 0, { rx: PI / 2, seg: 16 }); // pressed ring
  k.torus(r, 0.04, tone(col, 0.9), 0, r * 0.18, 0, { rx: PI / 2, seg: 18 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    k.tube([[Math.cos(a) * r * 0.45, r * 0.2, Math.sin(a) * r * 0.45], [0, r * 0.75, 0]], 0.018, tone(col, 0.6), { sides: 4 });
  }
  k.cyl(0.07, 0.18, DARK, 0, r * 0.8, 0, { seg: 8 }); // feed horn
  if (light) k.ball(0.07, light, 0, r * 0.92, 0, { seg: 6, rows: 4 });
  k.done();
  return g;
}

// ------------------------------------------------------------------ Gatling

/**
 * Gatling: a heavy machine gun on a tripod behind a gun shield. Lv 1 a brass belt, Lv 2 a drum,
 * Lv 3 twin barrels and a scope, Lv 4 a six-barrel minigun, Lv 5 a sandbagged concrete fort,
 * Lv 6 (DOOM) black with red glow and nine barrels.
 */
export function makeGatling(level) {
  const u = makeThing();
  const doom = level >= 6;
  const mini = level >= 4;
  const metal = doom ? 0x1f1f22 : mini ? 0x455a64 : OLIVE;
  const red = doom ? glowMat(u, 0xff1744) : null;
  const key = `gatling${level}`;
  const k = kit(u, u.body, key + ':base');
  if (level >= 5) {
    // Impenetrable Fortress: concrete walls with sandbags on top, open at the front
    const wall = doom ? 0x37373f : CONCRETE;
    const bag = doom ? 0x4a4040 : 0xb59a72;
    k.box(4.2, 1.6, 0.6, wall, 0, 0.8, -1.8, { r: 0.06 });
    for (const sx of [-1, 1]) k.box(0.6, 1.6, 3.6, wall, sx * 1.8, 0.8, 0, { r: 0.06 });
    for (const sx of [-1, 1]) for (const z of [-1.1, 0, 1.1]) k.box(0.62, 0.06, 0.04, tone(wall, 0.75), sx * 1.8, 0.9, z + 0.3); // form lines
    // Two staggered rows of sandbags
    for (let row = 0; row < 2; row++) {
      const y = 1.78 + row * 0.36;
      const off = row ? 0.45 : 0;
      for (let x = -1.6 + off; x <= 1.65; x += 0.9) k.box(0.86, 0.38, 0.62, tone(bag, row ? 1.05 : 0.95), x, y, -1.8, { r: 0.16 });
      for (const sx of [-1, 1]) for (let z = -1.15 + off; z <= 1.6; z += 0.9) k.box(0.62, 0.38, 0.86, tone(bag, row ? 1.05 : 0.95), sx * 1.8, y, z, { r: 0.16 });
    }
    k.box(0.5, 0.5, 0.5, 0x4b5a2a, 1.1, 0.25, -1.1, { r: 0.04 }); // ammo cans inside
    k.box(0.5, 0.5, 0.5, 0x4b5a2a, 1.1, 0.75, -1.1, { r: 0.04 });
    if (doom) for (const sx of [-1, 1]) k.box(0.08, 0.3, 2.8, red, sx * 1.48, 1.2, 0); // glowing vents
  }
  // Mount: a round foot plate, three tube legs and a swivel post
  k.cyl(0.95, 0.16, DARK, 0, 0.08, 0, { seg: 18 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    k.cyl(0.06, 0.06, STEEL, Math.cos(a) * 0.78, 0.19, Math.sin(a) * 0.78, { seg: 6 });
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2 + PI / 3;
    const fx = Math.sin(a) * 1.25;
    const fz = Math.cos(a) * 1.25;
    k.tube([[0, 1.3, 0], [fx * 0.6, 0.7, fz * 0.6], [fx, 0.12, fz]], 0.08, tone(metal, 0.8), { sides: 6 });
    k.box(0.3, 0.08, 0.3, DARK, fx, 0.05, fz);
  }
  k.cyl(0.24, 1.8, metal, 0, 1.1, 0, { r2: 0.19, seg: 12 });
  k.cyl(0.32, 0.22, DARK, 0, 1.96, 0, { seg: 12 });
  k.box(0.14, 0.3, 0.06, STEEL, 0.3, 1.8, 0, { rz: 0.3 }); // traverse lock lever
  k.done();

  const gun = new THREE.Group();
  gun.position.set(0, 2.3, 0);
  gun.scale.setScalar(level >= 6 ? 1.5 : level >= 4 ? 1.25 : 1);
  u.body.add(gun);
  const g = kit(u, gun, key + ':gun');
  // Cradle: a yoke on the post with pivot pins
  for (const sx of [-1, 1]) {
    g.box(0.14, 0.7, 0.55, DARK, sx * 0.6, -0.25, -0.15, { r: 0.04 });
    g.cyl(0.13, 0.12, STEEL, sx * 0.7, 0, -0.15, { axis: 'x', seg: 10 });
  }
  g.box(1.34, 0.14, 0.55, DARK, 0, -0.6, -0.15);
  // Receiver: rounded block, top cover, side panels, bolts and a cocking handle
  g.box(1.0, 0.9, 1.8, metal, 0, 0, -0.2, { r: 0.08 });
  g.box(0.86, 0.12, 1.5, tone(metal, 0.82), 0, 0.5, -0.3, { r: 0.03 });
  g.box(0.3, 0.08, 0.1, STEEL, 0, 0.58, -1.0); // cover latch
  for (const sx of [-1, 1]) {
    g.box(0.04, 0.6, 1.3, tone(metal, 0.88), sx * 0.51, 0, -0.25);
    bolts(g, [sx * 0.54, 0.24, -0.8], [sx * 0.54, 0.24, 0.3], 4, STEEL, 0.035);
    bolts(g, [sx * 0.54, -0.24, -0.8], [sx * 0.54, -0.24, 0.3], 4, STEEL, 0.035);
  }
  g.box(0.08, 0.12, 0.42, STEEL, 0.58, 0.12, 0.15);
  g.ball(0.08, DARK, 0.6, 0.12, 0.38, { seg: 6, rows: 4 });
  // Back plate, spade grips and the butterfly trigger
  g.box(0.9, 0.62, 0.1, DARK, 0, -0.05, -1.15, { r: 0.03 });
  for (const sx of [-1, 1]) {
    g.box(0.08, 0.08, 0.3, DARK, sx * 0.32, -0.05, -1.3);
    g.cyl(0.075, 0.44, 0x3b2a1c, sx * 0.32, -0.08, -1.45, { seg: 8 });
  }
  g.box(0.34, 0.06, 0.06, STEEL, 0, 0.06, -1.24);
  // Gun shield: a tapered plate with angled wings, a sight notch and a row of bolts
  const sh = doom ? 0x2a2f33 : tone(metal, 1.12);
  g.slab(1.6, 1.3, 0.12, sh, 0, 0.35, 0.78, { tw: 0.86 });
  for (const sx of [-1, 1]) g.slab(0.5, 1.2, 0.1, tone(sh, 0.9), sx * 0.98, 0.3, 0.68, { tw: 0.8, ry: sx * 0.45 });
  g.box(0.36, 0.16, 0.14, 0x111111, 0, 0.62, 0.8); // sight notch
  bolts(g, [-0.62, 0.92, 0.86], [0.62, 0.92, 0.86], 6, tone(sh, 0.7), 0.04);
  bolts(g, [-0.7, -0.2, 0.86], [0.7, -0.2, 0.86], 6, tone(sh, 0.7), 0.04);
  if (doom) g.box(0.7, 0.16, 0.04, red, 0, 0.78, 0.86); // DOOM visor slit
  if (mini) {
    // Minigun Barrel: a motor housing and spinning barrels (nine at DOOM)
    g.cyl(0.48, 0.5, DARK, 0, 0, 0.75, { axis: 'z', seg: 16 });
    g.torus(0.48, 0.05, STEEL, 0, 0, 0.98, { seg: 16 });
    g.box(0.3, 0.3, 0.5, tone(metal, 0.8), 0, -0.45, 0.6, { r: 0.04 }); // motor
    spinBarrels(u, gun, key + ':barrels', 0, 0, 0.95, 2.6, doom ? 9 : 6, doom ? 0.36 : 0.28, GUN, red);
    gunMuzzle(u, gun, 0, 0, 3.6);
  } else if (level >= 3) {
    // Extra Barrel: two jacketed barrels side by side
    for (const x of [-0.22, 0.22]) {
      g.cyl(0.15, 0.9, tone(metal, 0.7), x, 0.05, 1.3, { axis: 'z', seg: 10 });
      for (let i = 0; i < 4; i++) g.torus(0.15, 0.02, DARK, x, 0.05, 0.95 + i * 0.22, { seg: 10 });
      barrel(g, x, 0.05, 1.7, 1.45, 0.09, GUN, { brake: true });
      gunMuzzle(u, gun, x, 0.05, 3.2);
    }
  } else {
    // One barrel in a cooling jacket with a muzzle brake
    const len = level >= 1 ? 2.8 : 2.2;
    g.cyl(0.2, len * 0.45, tone(metal, 0.7), 0, 0.05, 0.85 + len * 0.22, { axis: 'z', seg: 12 });
    for (let i = 0; i < 6; i++) g.cyl(0.04, 0.02, 0x0e0f10, 0.2, 0.05, 0.95 + i * len * 0.07, { axis: 'x', seg: 5 }); // cooling holes
    for (let i = 0; i < 6; i++) g.cyl(0.04, 0.02, 0x0e0f10, -0.2, 0.05, 0.95 + i * len * 0.07, { axis: 'x', seg: 5 });
    barrel(g, 0, 0.05, 0.85, len, 0.11, GUN, { brake: true });
    gunMuzzle(u, gun, 0, 0.05, 0.95 + len);
  }
  if (level >= 1) ammoBelt(g, 0.62, -0.2, 0.1, 6); // Heavier Bullets: brass belt
  if (level >= 2) {
    // Bigger Magazine: a ribbed drum on the left
    const dc = doom ? 0x37373f : 0x4e5b31;
    g.cyl(0.58, 0.5, dc, -0.8, -0.2, -0.2, { axis: 'x', seg: 18 });
    for (const sx of [-0.56, -1.04]) g.torus(0.58, 0.04, tone(dc, 0.7), sx, -0.2, -0.2, { ry: PI / 2, seg: 18 });
    g.cyl(0.18, 0.06, STEEL, -1.06, -0.2, -0.2, { axis: 'x', seg: 10 }); // winding key
    g.box(0.06, 0.06, 0.3, STEEL, -1.1, -0.2, -0.2);
  }
  if (level >= 3) {
    // Scope (hidden detection): a tube on two rings, glowing lens
    g.cyl(0.13, 1.0, DARK, 0, 0.78, -0.2, { axis: 'z', seg: 10 });
    g.cyl(0.18, 0.2, DARK, 0, 0.78, 0.35, { axis: 'z', seg: 10 });
    for (const z of [-0.45, 0.05]) g.box(0.12, 0.2, 0.1, STEEL, 0, 0.62, z);
    g.cyl(0.15, 0.03, glowMat(u, doom ? 0xff1744 : 0x00e5ff), 0, 0.78, 0.46, { axis: 'z', seg: 10 });
  }
  g.done();
  u.static = true;
  u.tracer = doom ? 0xff1744 : level >= 4 ? 0xffab40 : 0xffe066;
  u.tracerWidth = level >= 5 ? 0.2 : undefined;
  u.fpsHeight = 2.3 + 0.4 + (level >= 5 ? 0.8 : 0);
  return u;
}

// ------------------------------------------------------------------ Turret

/**
 * Turret: an armoured gun house on a concrete pad. Lv 1 ammo crate and belt, Lv 2 a radar dish,
 * Lv 3 twin guns, Lv 4 side armour and fatter barrels, Lv 5 (XR) dark with cyan glow.
 */
export function makeTurret(level) {
  const u = makeThing();
  const xr = level >= 5;
  const dual = level >= 3;
  const heavy = level >= 4;
  const metal = xr ? 0x263238 : heavy ? 0x4e5a3a : OLIVE;
  const cyan = xr ? glowMat(u, 0x18ffff) : null;
  const key = `turret${level}`;
  const k = kit(u, u.body, key + ':base');
  pad(k, 4.4, 0.5, xr ? 0x455a64 : CONCRETE);
  ring(k, 1.35, 0.75, 0.5);
  k.done();

  const head = new THREE.Group();
  head.position.set(0, 1.0, 0);
  u.body.add(head);
  const h = kit(u, head, key + ':head');
  const hw = xr ? 3.0 : 2.6;
  // Gun house: a faceted outline with sloped front corners, a roof plate and a rear bustle
  const outline = [[-hw / 2, -1.5], [hw / 2, -1.5], [hw / 2, 0.6], [hw / 2 - 0.45, 1.3], [-hw / 2 + 0.45, 1.3], [-hw / 2, 0.6]];
  h.plan(outline, 1.6, metal, 0, 0, -0.1, { bevel: 0.14 });
  h.plan(outline.map(([x, z]) => [x * 0.86, z * 0.86]), 0.22, tone(metal, 0.85), 0, 1.6, -0.2, { bevel: 0.06 });
  h.box(hw - 0.6, 0.7, 0.6, tone(metal, 0.9), 0, 0.85, -1.85, { r: 0.06 }); // bustle
  louvres(h, 0, 1.22, -1.85, hw - 0.9, 0.5, 4);
  for (const sx of [-1, 1]) {
    h.box(0.04, 0.05, 2.1, tone(metal, 0.7), sx * (hw / 2 + 0.01), 1.1, -0.3); // weld seam
    bolts(h, [sx * (hw / 2 + 0.02), 0.25, -1.3], [sx * (hw / 2 + 0.02), 0.25, 0.4], 5, tone(metal, 0.65), 0.04);
    h.box(0.08, 0.14, 0.5, STEEL, sx * (hw / 2 + 0.04), 1.35, -1.0); // grab handles
  }
  hatch(h, -0.55, 1.82, -0.6, 0.42, tone(metal, 0.9));
  h.box(0.34, 0.22, 0.24, DARK, 0.6, 1.92, 0.3); // periscope
  h.box(0.26, 0.1, 0.03, 0x6fb7e6, 0.6, 1.95, 0.43);
  antenna(h, hw / 2 - 0.3, 1.8, -1.3, 2.0);
  if (xr) {
    for (const sx of [-1, 1]) h.box(0.06, 0.12, 2.4, cyan, sx * (hw / 2 + 0.03), 1.0, -0.2); // glowing side strips
    h.box(1.4, 0.2, 0.06, cyan, 0, 1.25, 1.21); // visor slit
  }
  if (heavy) {
    // Even Heavier Ammo: bolted armour plates on the sides
    for (const sx of [-1, 1]) {
      h.slab(0.22, 1.3, 2.3, xr ? 0x1c262b : 0x3e4a2a, sx * (hw / 2 + 0.14), 0.75, -0.2, { td: 0.9 });
      bolts(h, [sx * (hw / 2 + 0.26), 1.2, -1.1], [sx * (hw / 2 + 0.26), 1.2, 0.7], 4, STEEL, 0.045);
      bolts(h, [sx * (hw / 2 + 0.26), 0.3, -1.1], [sx * (hw / 2 + 0.26), 0.3, 0.7], 4, STEEL, 0.045);
    }
  }
  // Guns: a rounded mantlet and a barrel with sleeves and a brake
  const r = heavy ? 0.2 : 0.16;
  const len = xr ? 4.2 : heavy ? 3.8 : 3.2;
  for (const x of dual ? [-0.65, 0.65] : [0]) {
    h.box(0.8, 0.8, 0.5, DARK, x, 0.85, 1.25, { r: 0.12 });
    h.cyl(r * 1.6, 0.5, tone(DARK, 1.2), x, 0.85, 1.6, { axis: 'z', seg: 12 });
    barrel(h, x, 0.85, 1.5, len, r, xr ? 0x37474f : GUN, { sleeve: true, brake: !xr, evac: heavy ? 0.55 : 0 });
    if (xr) for (const f of [0.35, 0.7, 1]) h.torus(r * 1.35, 0.05, cyan, x, 0.85, 1.5 + len * f - 0.1, { seg: 12 });
    gunMuzzle(u, head, x, 0.85, 1.8 + len);
  }
  if (level >= 1) {
    // Stronger Ammunition: an ammo crate on the side with a brass belt feeding the gun
    crate(h, -hw / 2 - 0.5, 0.45, -0.4, 0.8, 0.8, 1.0, xr ? 0x212121 : 0x4e5b31);
    ammoBelt(h, -hw / 2 - 0.15, 1.15, -0.1, 4);
  }
  if (level >= 2) {
    // Radar: a dish on a mast at the back with a blinking light
    h.cyl(0.08, 1.4, DARK, 0.8, 2.4, -1.2, { seg: 8 });
    h.cyl(0.16, 0.2, STEEL, 0.8, 1.75, -1.2, { seg: 8 });
    dish(u, head, key + ':dish', 0.8, 3.15, -1.2, 0.75, xr ? 0x546e7a : 0xd5d8da, xr ? cyan : glowMat(u, 0xff1744));
  }
  h.done();
  u.static = true;
  u.tracer = xr ? 0x18ffff : heavy ? 0xffab40 : 0xffe066;
  u.tracerWidth = xr ? 0.22 : heavy ? 0.18 : undefined;
  return u;
}

// ------------------------------------------------------------------ Sentry

/**
 * Sentry: a small auto-gun on a tripod. Top path: longer barrel (Lv 2), bigger gun and brake
 * (Lv 3), sabot ammo box (Lv 4), XS dark with cyan (Lv 5). Bottom path: optics (Lv 1), fatter
 * barrel (Lv 2), minigun and rocket pod (Lv 3), XWM frame, twin pods and orange glow (Lv 5).
 */
export function makeSentryTower(level, bottom = false) {
  const u = makeThing();
  const xs = !bottom && level >= 5;
  const xwm = bottom && level >= 5;
  const metal = xs ? 0x263238 : xwm ? 0x37474f : 0x78909c;
  const accent = xs ? glowMat(u, 0x00e5ff) : xwm ? glowMat(u, 0xff6d00) : HAZARD;
  const key = `sentry${bottom ? 'B' : 'T'}${level}`;
  const k = kit(u, u.body, key + ':base');
  // Tripod: three tube legs with feet, a centre column and a pivot
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    const fx = Math.sin(a) * 0.95;
    const fz = Math.cos(a) * 0.95;
    k.tube([[0, 0.9, 0], [fx * 0.55, 0.5, fz * 0.55], [fx, 0.06, fz]], 0.06, DARK, { sides: 6 });
    k.cyl(0.13, 0.06, DARK, fx, 0.03, fz, { seg: 8 });
  }
  k.cyl(0.19, 1.15, metal, 0, 0.62, 0, { r2: 0.15, seg: 10 });
  k.cyl(0.24, 0.16, DARK, 0, 1.2, 0, { seg: 10 });
  k.box(0.32, 0.36, 0.14, tone(metal, 0.8), 0, 0.55, -0.22, { r: 0.03 }); // power box
  k.box(0.18, 0.06, 0.02, 0x4caf50, 0, 0.62, -0.3);
  k.tube([[0, 0.4, -0.25], [0.3, 0.12, -0.5], [0.8, 0.04, -0.7]], 0.025, 0x111111, { sides: 4 }); // power cable
  if (xwm) for (const sx of [-1, 1]) {
    k.box(0.15, 1.7, 0.15, metal, sx * 0.9, 0.85, -0.5);
    k.box(0.3, 0.06, 0.3, DARK, sx * 0.9, 0.03, -0.5);
  }
  k.done();

  const gun = new THREE.Group();
  gun.position.set(0, 1.45, 0);
  gun.scale.setScalar(bottom ? (level >= 5 ? 1.35 : level >= 3 ? 1.15 : 1) : level >= 3 ? 1.2 : 1);
  u.body.add(gun);
  const g = kit(u, gun, key + ':gun');
  // Gun body: rounded housing, a stripe, a sensor eye and side vents
  g.box(0.8, 0.6, 1.1, metal, 0, 0, -0.1, { r: 0.12 });
  g.box(0.82, 0.08, 0.9, accent, 0, 0.27, -0.1);
  g.box(0.7, 0.16, 0.06, DARK, 0, 0.12, 0.47); // face plate
  g.cyl(0.07, 0.04, glowMat(u, xs ? 0x00e5ff : 0xff1744), 0.22, 0.13, 0.5, { axis: 'z', seg: 8 }); // sensor eye
  for (const sx of [-1, 1]) {
    louvres(g, sx * 0.41, -0.05, -0.2, 0.02, 0.5, 3);
    g.cyl(0.1, 0.1, STEEL, sx * 0.42, 0, -0.1, { axis: 'x', seg: 8 }); // trunnions
  }
  g.box(0.2, 0.35, 0.25, DARK, 0, -0.35, -0.1); // yoke
  if (bottom && level >= 3) {
    // Minigun with rocket pods on the side
    g.cyl(0.24, 0.3, DARK, 0, 0, 0.5, { axis: 'z', seg: 12 });
    spinBarrels(u, gun, key + ':barrels', 0, 0, 0.6, level >= 5 ? 1.6 : 1.3, 6, 0.13);
    gunMuzzle(u, gun, 0, 0, level >= 5 ? 2.2 : 1.9);
    for (const sx of level >= 5 ? [-1, 1] : [1]) {
      g.box(0.5, 0.5, 0.9, 0x4e5b31, sx * 0.7, 0.1, 0, { r: 0.06 });
      for (const oy of [-0.12, 0.12]) for (const ox of [-0.12, 0.12]) {
        g.cyl(0.08, 0.05, DARK, sx * 0.7 + ox, 0.1 + oy, 0.46, { axis: 'z', seg: 8 });
        g.cyl(0.05, 0.12, xwm ? accent : 0xd84315, sx * 0.7 + ox, 0.1 + oy, 0.44, { axis: 'z', seg: 6, r2: 0.01 });
      }
      g.box(0.06, 0.12, 0.8, HAZARD, sx * 0.96, 0.1, 0);
    }
    u.projectile = { color: 0xff7043, size: 0.35 };
    u.tracer = 0xffe066;
  } else {
    const len = !bottom && level >= 2 ? 1.6 : 1.1;
    const r = (bottom && level >= 2) || (!bottom && level >= 3) ? 0.11 : 0.08;
    g.cyl(r * 1.7, 0.3, DARK, 0, 0.05, 0.55, { axis: 'z', seg: 10 });
    barrel(g, 0, 0.05, 0.45, len, r, GUN, { brake: !bottom && level >= 3, sleeve: len > 1.2 });
    gunMuzzle(u, gun, 0, 0.05, 0.6 + len);
    if (!bottom && level >= 4) {
      crate(g, -0.62, -0.1, -0.1, 0.36, 0.34, 0.5, 0x556b2f); // sabot ammo box
      ammoBelt(g, -0.45, 0.05, 0.12, 2, 0.7);
    }
    u.tracer = xs ? 0x00e5ff : 0xffe066;
  }
  if (bottom && level >= 1) {
    // Optics: a sensor tube on top
    g.cyl(0.11, 0.6, 0x111111, 0, 0.44, 0.1, { axis: 'z', seg: 10 });
    g.cyl(0.09, 0.03, glowMat(u, 0xff6d00), 0, 0.44, 0.41, { axis: 'z', seg: 10 });
  }
  g.done();
  u.static = true;
  return u;
}
export const makeSentryTowerBottom = (level) => makeSentryTower(level, true);

// ------------------------------------------------------------------ AA Turret

/**
 * AA Turret: a missile rack on a swivel with a radar dish. Top path: one more missile tube per
 * burst shot, Lv 5 white Patriot canisters. Bottom path: bigger radar (Lv 2), a domed minigun
 * (Lv 3), two of them (Lv 4), bigger (Lv 5).
 */
export function makeAATurret(level, bottom = false) {
  const u = makeThing();
  const key = `aa${bottom ? 'B' : 'T'}${level}`;
  const k = kit(u, u.body, key + ':base');
  pad(k, 2.6, 0.4, CONCRETE);
  ring(k, 0.85, 0.65, 0.5);
  k.done();

  const head = new THREE.Group();
  head.position.set(0, 0.9, 0);
  u.body.add(head);
  const h = kit(u, head, key + ':head');
  h.box(1.5, 0.35, 1.7, OLIVE, 0, 0.18, 0, { r: 0.06 }); // turntable deck
  bolts(h, [-0.6, 0.37, 0.75], [0.6, 0.37, 0.75], 4, STEEL, 0.04);
  h.box(0.5, 0.45, 0.4, tone(OLIVE, 0.85), 0.5, 0.55, -0.55, { r: 0.04 }); // control box
  h.box(0.3, 0.12, 0.02, 0x4caf50, 0.5, 0.62, -0.34);
  // Radar dish on a mast at the back
  const big = bottom && level >= 2;
  const mast = big ? 1.8 : 1.2;
  h.cyl(0.07, mast, DARK, 0, 0.35 + mast / 2, -1.0, { seg: 8 });
  h.box(0.2, 0.3, 0.2, DARK, 0, 0.45, -1.0);
  dish(u, head, key + ':dish', 0, 0.4 + mast, -1.0, big ? 0.75 : 0.5, 0xeceff1, glowMat(u, 0xff1744));
  if (bottom && level >= 3) {
    const size = level >= 5 ? 1.25 : 1;
    for (const x of level >= 4 ? [-0.55, 0.55] : [0]) {
      // A white dome with a minigun poking out of it
      h.ball(0.5 * size, 0xeceff1, x, 0.7, 0.1, { seg: 16, rows: 10 });
      h.cyl(0.5 * size, 0.2, tone(0xeceff1, 0.8), x, 0.35, 0.1, { seg: 16 });
      h.cyl(0.18 * size, 0.08, glowMat(u, 0xff6d00), x, 0.95 * size, 0.42 * size, { axis: 'z', seg: 10, rx: -0.6 }); // sensor
      h.cyl(0.2 * size, 0.3, DARK, x, 0.5, 0.55, { axis: 'z', seg: 10 });
      spinBarrels(u, head, `${key}:barrels${x}`, x, 0.5, 0.6, 1.6 * size, 6, 0.12 * size);
      gunMuzzle(u, head, x, 0.5, 0.6 + 1.6 * size);
    }
    u.tracer = 0xffab40;
  } else {
    const burst = TOWERS[bottom ? 'aaTurretBottom' : 'aaTurret'].levels[level].burst || 1;
    const cols = Math.min(burst, 4);
    const rows = Math.ceil(burst / cols);
    const patriot = !bottom && level >= 5;
    const tube = patriot ? 0.55 : 0.4;
    const w = cols * tube + 0.3;
    const hh = rows * tube + 0.3;
    const len = patriot ? 2.4 : 1.6;
    const rack = new THREE.Group();
    rack.position.set(0, 0.6 + hh / 2, 0.2);
    rack.rotation.x = -0.35; // tilted up to the sky
    head.add(rack);
    const r = kit(u, rack, key + ':rack');
    if (patriot) {
      // Patriot: square white canisters with ribs and caps
      r.box(w, hh, len, 0xeceff1, 0, 0, 0, { r: 0.05 });
      for (const f of [-0.4, 0, 0.4]) r.box(w + 0.04, hh + 0.04, 0.08, tone(0xeceff1, 0.85), 0, 0, f * len);
    } else {
      // A frame of round tubes
      r.box(w, 0.08, len, OLIVE, 0, -hh / 2, 0);
      r.box(w, 0.08, len, OLIVE, 0, hh / 2, 0);
      for (const f of [-0.42, 0.42]) {
        r.box(w + 0.06, hh + 0.06, 0.1, tone(OLIVE, 0.85), 0, 0, f * len);
      }
    }
    for (let i = 0; i < burst; i++) {
      const cx = ((i % cols) - (cols - 1) / 2) * tube;
      const cy = (Math.floor(i / cols) - (rows - 1) / 2) * tube;
      if (patriot) {
        r.box(tube - 0.1, tube - 0.1, 0.06, 0x263238, cx, cy, len / 2 + 0.01);
        r.cyl(0.08, 0.04, 0xe53935, cx, cy, len / 2 + 0.05, { axis: 'z', seg: 8 });
      } else {
        r.cyl(tube * 0.42, len, OLIVE, cx, cy, 0, { axis: 'z', seg: 12 });
        r.cyl(tube * 0.32, 0.04, 0x111111, cx, cy, len / 2 + 0.01, { axis: 'z', seg: 10 });
        r.cyl(tube * 0.3, 0.3, 0xe53935, cx, cy, len / 2 + 0.05, { axis: 'z', seg: 10, r2: 0.02 }); // missile nose
        r.cyl(tube * 0.31, 0.06, 0xeceff1, cx, cy, len / 2 - 0.06, { axis: 'z', seg: 10 });
      }
    }
    r.done();
    gunMuzzle(u, rack, 0, 0, len / 2 + 0.1);
    for (const sx of [-1, 1]) {
      h.box(0.15, 0.9, 0.6, DARK, sx * (w / 2 + 0.1), 0.6, 0.2, { r: 0.03 }); // rack arms
      h.cyl(0.14, 0.1, STEEL, sx * (w / 2 + 0.2), 0.6 + hh / 2, 0.2, { axis: 'x', seg: 10 });
    }
    u.projectile = { color: 0xeceff1, size: patriot ? 0.55 : 0.4 };
    u.tracer = 0xffffff;
  }
  h.done();
  u.static = true;
  return u;
}
export const makeAATurretBottom = (level) => makeAATurret(level, true);

// ------------------------------------------------------------------ Tesla

/**
 * Tesla: a coil tower. Lv 1 a kite on a copper wire, Lv 2 taller with battery packs, Lv 3 gold
 * cooling fins and gold battery lights, Lv 4 (KIMAT) dark with prongs and a bigger ring.
 */
export function makeTesla(level) {
  const u = makeThing();
  const kimat = level >= 4;
  const bolt = kimat ? 0xe1f5fe : 0x80d8ff;
  const COPPER = 0xb87333;
  const spark = glowMat(u, bolt);
  const k = kit(u, u.body, `tesla${level}`);
  // Plinth: an eight-sided stone base in two steps with a bolted cap
  k.cyl(2.0, 0.6, 0x78909c, 0, 0.3, 0, { seg: 8, r2: 1.9 });
  k.cyl(1.45, 0.5, 0x546e7a, 0, 0.85, 0, { seg: 8, r2: 1.35 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2 + PI / 8;
    k.cyl(0.07, 0.08, STEEL, Math.cos(a) * 1.15, 1.12, Math.sin(a) * 1.15, { seg: 6 });
    k.box(0.5, 0.06, 0.04, HAZARD, Math.cos(a) * 1.92, 0.5, Math.sin(a) * 1.92, { ry: -a + PI / 2 });
  }
  // Column with copper windings, insulators at the bottom
  const tall = level >= 2 ? 6.6 : 6;
  const col = kimat ? 0x263238 : 0x37474f;
  k.cyl(0.5, tall, col, 0, 1.1 + tall / 2, 0, { seg: 14, r2: 0.42 });
  for (let i = 0; i < 3; i++) k.cyl(0.62 - i * 0.05, 0.12, 0xe8e2d0, 0, 1.25 + i * 0.2, 0, { seg: 14 }); // ceramic insulators
  const coilBot = 1.9;
  const coilTop = 1.1 + tall - 0.6;
  const turns = level >= 2 ? 18 : 14;
  for (let i = 0; i < turns; i++) {
    const y = coilBot + ((coilTop - coilBot) * i) / (turns - 1);
    k.torus(0.56 - (i / turns) * 0.07, 0.07, i % 2 ? COPPER : tone(COPPER, 0.85), 0, y, 0, { rx: PI / 2, seg: 16 });
  }
  for (const sx of [-1, 1]) k.box(0.08, coilTop - coilBot, 0.08, 0x222222, sx * 0.62, (coilTop + coilBot) / 2, 0); // binding strips
  // Crown: a big copper-grey doughnut (the toroid) with a glowing core
  const top = 1.1 + tall + 0.35;
  const ringR = kimat ? 1.6 : 1.3;
  k.cyl(0.36, 0.5, col, 0, top - 0.25, 0, { seg: 12 });
  k.torus(ringR, 0.34, kimat ? 0x37474f : 0xb0bec5, 0, top, 0, { rx: PI / 2, seg: 24 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2;
    k.cyl(0.06, ringR - 0.3, DARK, Math.cos(a) * ringR * 0.5, top, Math.sin(a) * ringR * 0.5, { axis: 'x', ry: -a, seg: 6 }); // spokes
  }
  k.ball(0.52, spark, 0, top + 0.2, 0, { seg: 14, rows: 10 });
  k.ball(0.62, 0x37474f, 0, top - 0.05, 0, { seg: 14, rows: 6, sy: 0.45 });
  if (kimat) for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4;
    k.cyl(0.12, 1.1, DARK, Math.cos(a) * ringR, top + 0.55, Math.sin(a) * ringR, { seg: 8, r2: 0.06 }); // prongs
    k.ball(0.17, spark, Math.cos(a) * ringR, top + 1.15, Math.sin(a) * ringR, { seg: 8, rows: 6 });
  }
  gunMuzzle(u, u.body, 0, top + 0.6, 0);
  if (level >= 1) {
    // Kite in the Wind: a diamond kite with a tail, tied to the crown by a copper wire
    const kx = -2.6;
    const ky = top + 3.2;
    const kz = -1.2;
    k.prism([[0, 0.85], [0.6, 0], [0, -0.95], [-0.6, 0]], 0.06, 0xe53935, kx, ky, kz, { ry: 0.4 + PI / 2, rz: 0.3 });
    k.box(0.04, 1.7, 0.04, 0x5d4037, kx, ky - 0.05, kz, { ry: 0.4, rx: 0.3 }); // spars
    k.box(1.15, 0.04, 0.04, 0x5d4037, kx, ky, kz, { ry: 0.4, rx: 0.3 });
    k.tube([[kx, ky - 0.9, kz], [kx - 0.3, ky - 1.5, kz + 0.2], [kx + 0.1, ky - 2.1, kz + 0.3]], 0.03, 0xffeb3b, { sides: 4 }); // tail
    k.tube([[-ringR * 0.8, top, -ringR * 0.4], [kx * 0.6, top + 1.5, kz * 0.6], [kx, ky - 0.6, kz]], 0.03, COPPER, { sides: 4 });
    k.ball(0.14, spark, kx * 0.6, top + 1.5, kz * 0.6, { seg: 6, rows: 4 });
  }
  if (level >= 2) {
    // Self-Sustaining Battery: four round battery packs around the base
    const cap = level >= 3 ? glowMat(u, 0xffd740) : spark;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2;
      const x = Math.cos(a) * 1.5;
      const z = Math.sin(a) * 1.5;
      k.cyl(0.36, 1.1, 0x455a64, x, 1.65, z, { seg: 12 });
      k.cyl(0.38, 0.12, 0x263238, x, 1.2, z, { seg: 12 });
      k.cyl(0.38, 0.12, 0x263238, x, 2.1, z, { seg: 12 });
      k.cyl(0.2, 0.14, cap, x, 2.25, z, { seg: 10 });
      k.box(0.3, 0.06, 0.08, 0xffffff, x + Math.cos(a) * 0.37, 1.7, z + Math.sin(a) * 0.37, { ry: -a + PI / 2 }); // + sign
      k.tube([[x * 0.75, 2.2, z * 0.75], [x * 0.5, 2.5, z * 0.5], [x * 0.38, 2.3, z * 0.38]], 0.035, 0x1a1a1a, { sides: 4 }); // cable to the column
    }
  }
  if (level >= 3) {
    // Auric Quantum Cooling Cell: gold fins around the middle of the column
    const gold = glowMat(u, 0xffc400, 0.5);
    const y = 1.1 + tall * 0.55;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2 + PI / 6;
      k.slab(0.36, 1.8, 0.08, 0xc9a227, Math.cos(a) * 0.78, y, Math.sin(a) * 0.78, { tw: 0.55, ry: -a + PI / 2 });
      k.box(0.05, 1.4, 0.1, gold, Math.cos(a) * 0.97, y, Math.sin(a) * 0.97, { ry: -a + PI / 2 }); // glowing edge
    }
    for (const dy of [-0.95, 0.95]) k.torus(0.72, 0.06, 0x8d6e1a, 0, y + dy, 0, { rx: PI / 2, seg: 18 });
  }
  k.done();
  u.tracer = bolt;
  u.static = true;
  return u;
}
