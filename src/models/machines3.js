// Tower models: machines, batch 3 (rebuilt with the vehicle kit in ../vehicles.js).
// In here: Patrol Boat, Warship, MLRS, Star Cannon, Cryo Heli (its pad), Graveyard, Elf Camp, Relic.
// Each makeX(level) builds one tower's look; TOWER_MODELS in ../models.js says which tower uses which.
// Guns sit in their own groups so a shot kicks the gun, not the whole tower.

import * as THREE from 'three';
import { antenna, barrel, bolts, crate, glowMat, hatch, kit, lamp, mirror, PARTS, profile, star, tone, wheel } from '../vehicles.js';
import { gunMuzzle, makeThing } from './bits.js';
import { dish, ring } from './machines1.js';
import { makeHeli } from './machines2.js';

const { STEEL, GUN, DARK, GLASS } = PARTS;
const PI = Math.PI;
const GOLD = 0xffc107;
const WOOD = 0x6d4c41;
const SNOW = 0xf5f9ff;

// ------------------------------------------------------------------ small shared pieces

/** A boat's top-down outline [[x, z], ...]: square stern at -L/2, a pointed bow `bow` long at +L/2. */
function hullPts(L, W, bow) {
  const h = W / 2;
  const right = [[h * 0.86, -L / 2], [h, -L / 2 + 0.35], [h, L / 2 - bow], [h * 0.84, L / 2 - bow * 0.5], [h * 0.52, L / 2 - bow * 0.15], [0, L / 2]];
  const left = right.slice(0, -1).reverse().map(([x, z]) => [-x, z]);
  return [...right, ...left];
}

const scalePts = (pts, sx, sz = sx) => pts.map(([x, z]) => [x * sx, z * sz]);

/**
 * A boat hull from y0 (keel) up to the deck at y1, centred on z: a narrow bottom, a waterline
 * stripe, the flared sides, a deck, a rub rail and stanchions with a rail round the deck edge.
 */
export function hull(k, L, W, y0, y1, col, o) {
  const z = o.z ?? 0;
  const pts = hullPts(L, W, o.bow);
  k.plan(scalePts(pts, 0.78, 0.95), 0.35, tone(col, 0.7), 0, y0, z, { bevel: 0.1 });
  k.plan(scalePts(pts, 0.97, 0.99), 0.22, o.stripe, 0, y0 + 0.28, z);
  k.plan(pts, y1 - y0 - 0.45, col, 0, y0 + 0.45, z, { bevel: 0.06 });
  k.plan(scalePts(pts, 1.02, 1.01), 0.1, tone(col, 0.6), 0, y1 - 0.12, z); // rub rail
  k.plan(scalePts(pts, 0.92, 0.95), 0.06, o.deck, 0, y1 - 0.03, z);
  if (o.rail === false) return;
  // Stanchions and a rail along both sides from the stern to the bow
  const rp = scalePts(pts, 0.9, 0.93);
  const loop = rp.map(([x, zz]) => [x, y1 + 0.42, z + zz]);
  k.tube([...loop.slice(1, 6), ...loop.slice(6, 10)], 0.025, 0xcfd8dc, { sides: 4, seg: 30 });
  for (const [x, zz] of rp) if (zz < L / 2 - 0.3) k.cyl(0.025, 0.42, 0xcfd8dc, x, y1 + 0.21, z + zz, { seg: 4 });
}

/** A ship's turret group at (0, y, z) on `u.body`: faceted house, base ring and `n` barrels with muzzles. */
function shipTurret(u, y, z, n, len, r, size, col, key, aft = false) {
  const t = new THREE.Group();
  t.position.set(0, y, z);
  if (aft) t.rotation.y = PI; // aft turrets look back and do not fire the tracers
  u.body.add(t);
  const k = kit(u, t, `shipT:${key}:${n}:${len}:${r}:${size}:${col}`);
  const s = size;
  k.cyl(0.7 * s, 0.18, DARK, 0, 0.09, 0, { seg: 18 });
  k.plan([[-0.55 * s, -0.6 * s], [0.55 * s, -0.6 * s], [0.62 * s, 0.05 * s], [0.38 * s, 0.55 * s], [-0.38 * s, 0.55 * s], [-0.62 * s, 0.05 * s]], 0.6 * s, col, 0, 0.18, 0, { bevel: 0.08 });
  hatch(k, -0.2 * s, 0.18 + 0.6 * s, -0.25 * s, 0.14 * s, tone(col, 0.9));
  if (s >= 1.1) for (const sx of [-1, 1]) k.cyl(0.08 * s, 0.3, tone(col, 0.8), sx * 0.66 * s, 0.6 * s, -0.25 * s, { axis: 'x', seg: 8 }); // rangefinder ears
  const by = 0.18 + 0.32 * s;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.3 * s;
    k.cyl(r * 1.6, 0.22, 0x37474f, x, by, 0.55 * s, { axis: 'z', seg: 8 }); // blast bag
    barrel(k, x, by, 0.55 * s, len, r, GUN, { r2: r * 0.85, evac: 0.6 });
    if (!aft) gunMuzzle(u, t, x, by, 0.6 * s + len);
  }
  k.done();
  return t;
}

/** A sailor standing on a deck at (x, y, z). */
function sailor(k, x, y, z, ry = 0) {
  for (const sx of [-1, 1]) k.box(0.1, 0.32, 0.12, 0x0d47a1, x + sx * 0.07, y + 0.16, z, { ry });
  k.box(0.32, 0.36, 0.2, 0x1565c0, x, y + 0.5, z, { r: 0.05, ry });
  k.box(0.2, 0.08, 0.04, 0xfafafa, x, y + 0.62, z + 0.1, { ry }); // collar
  k.ball(0.13, 0xf1c27d, x, y + 0.8, z, { seg: 8, rows: 6 });
  k.cyl(0.13, 0.08, 0xfafafa, x, y + 0.92, z, { seg: 10 }); // sailor cap
}

/** A tapered missile box on a deck, pointing +z and tipped up by `tilt`, with `rows` x `cols` red noses. */
function missileBox(k, x, y, z, w, h, d, col, tilt, rows, cols, tip) {
  k.box(w, h, d, col, x, y, z, { r: 0.05, rx: -tilt });
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const ly = (i - (rows - 1) / 2) * (h / rows);
    const lx = (j - (cols - 1) / 2) * (w / cols);
    k.cyl(Math.min(w / cols, h / rows) * 0.32, 0.12, tip, x + lx, y + ly * c + (d / 2) * s, z + (d / 2) * c - ly * s, { axis: 'z', r2: 0.02, seg: 8, rx: -tilt });
  }
}

/** A flat five-point star `t` thick standing up and facing +z. */
function standingStar(k, x, y, z, r, col, t = 0.12) {
  const pts = [];
  for (let i = 0; i < 10; i++) pts.push([Math.sin((i * PI) / 5) * (i % 2 ? r * 0.42 : r), Math.cos((i * PI) / 5) * (i % 2 ? r * 0.42 : r)]);
  k.plan(pts, t, col, x, y, z, { rx: PI / 2, bevel: t * 0.3 });
}

/** A crystal: two six-sided cones point to point, standing on (x, y, z), `h` tall. */
function crystal(k, x, y, z, r, h, col) {
  k.cyl(r, h * 0.62, col, x, y + h * 0.38 + h * 0.31, z, { r2: 0, seg: 6, flat: true });
  k.cyl(0, h * 0.38, col, x, y + h * 0.19, z, { r2: r, seg: 6, flat: true });
}

// ------------------------------------------------------------------ Patrol Boat

/**
 * Patrol Boat: a grey gunboat on the water, facing +Z. Top path: Lv 1 an ammo box, Lv 2 a RHIB
 * with orange inflatable sides, Lv 3 the bigger Attack Boat with a cannon, Lv 4 twin cannons,
 * Lv 5 Hellfire missile pods on the cabin. Bottom path: Lv 1 a scoped Smart Gun, Lv 2 cooling
 * jackets on the barrel, Lv 3 a flamethrower with a fuel tank, Lv 4 the armored Monitor, Lv 5 twin
 * flame nozzles fed by big glowing Flame Tanks.
 */
export function makePatrolBoat(level, bottom = false) {
  const u = makeThing();
  const top = !bottom;
  const big = level >= 3;
  const monitor = bottom && level >= 4;
  const flames = bottom && level >= 3;
  const hullC = monitor ? 0x37474f : top && level >= 3 ? 0x546e7a : 0x78909c;
  const L = big ? 5 : 4.2;
  const W = big ? 2.5 : 2.1;
  const zc = -0.3;
  const DY = 0.55;
  const key = `pboat${level}${bottom ? 'B' : 'T'}`;
  const k = kit(u, u.body, key);
  hull(k, L, W, -0.45, DY, hullC, { z: zc, bow: 1.5, stripe: 0x1a1a1a, deck: monitor ? 0x455a64 : 0x9e9e9e });
  // Hull number and a white bow stripe
  for (const sx of [-1, 1]) {
    k.box(0.03, 0.18, 0.7, 0xfafafa, sx * (W / 2 + 0.005), 0.25, zc + L / 2 - 1.5, { ry: 0 });
    k.box(0.03, 0.22, 0.14, 0x212121, sx * (W / 2 + 0.01), 0.27, zc + 0.2);
    k.box(0.03, 0.22, 0.14, 0x212121, sx * (W / 2 + 0.01), 0.27, zc + 0.4);
  }
  // Cabin: a sloped white house with a raked windshield, side windows, a roof and a light bar
  const cabH = big ? 1.3 : 1.0;
  const cw = W - 0.6;
  const cz = zc - L / 2 + 1.35;
  const cabC = monitor ? 0x455a64 : 0xeceff1;
  k.slab(cw, cabH, 1.6, cabC, 0, DY + cabH / 2, cz, { tw: 0.9, td: 0.8, tz: -0.1 });
  const lean = Math.atan2(0.26, cabH);
  k.box(cw * 0.86, cabH * 0.42, 0.04, GLASS, 0, DY + cabH * 0.66, cz + 0.8 - 0.26 * 0.66 + 0.03, { rx: -lean });
  k.box(0.05, cabH * 0.44, 0.05, tone(cabC, 0.7), 0, DY + cabH * 0.66, cz + 0.8 - 0.26 * 0.66 + 0.05, { rx: -lean });
  const sl = Math.atan2(cw * 0.05, cabH);
  for (const sx of [-1, 1]) {
    k.box(0.04, cabH * 0.32, 0.9, GLASS, sx * (cw / 2 - cw * 0.035 + 0.02), DY + cabH * 0.66, cz + 0.05, { rz: sx * sl });
    // Life ring on the cabin side
    k.torus(0.22, 0.07, 0xff6d00, sx * (cw / 2 + 0.05), DY + cabH * 0.34, cz - 0.35, { ry: PI / 2, seg: 14 });
    for (const a of [0, PI / 2, PI, PI * 1.5]) k.box(0.05, 0.08, 0.15, 0xfafafa, sx * (cw / 2 + 0.05), DY + cabH * 0.34 + Math.sin(a) * 0.22, cz - 0.35 + Math.cos(a) * 0.22, { rx: a });
  }
  k.slab(cw * 0.98, 0.12, 1.42, tone(cabC, 0.85), 0, DY + cabH + 0.06, cz - 0.08, { tw: 0.95, td: 0.95 });
  // Light bar (blue and red), searchlight and a mast with a radar bar and whip aerials
  const ry = DY + cabH + 0.12;
  k.box(cw * 0.6, 0.1, 0.22, DARK, 0, ry + 0.05, cz + 0.4);
  k.box(cw * 0.25, 0.1, 0.18, glowMat(u, 0x2979ff), -cw * 0.15, ry + 0.14, cz + 0.4, { r: 0.04 });
  k.box(cw * 0.25, 0.1, 0.18, glowMat(u, 0xff1744), cw * 0.15, ry + 0.14, cz + 0.4, { r: 0.04 });
  k.cyl(0.14, 0.2, DARK, cw * 0.35, ry + 0.1, cz + 0.55, { axis: 'z', seg: 10 });
  k.cyl(0.11, 0.04, 0xfff3b0, cw * 0.35, ry + 0.1, cz + 0.66, { axis: 'z', seg: 10 });
  k.cyl(0.06, 0.9, DARK, 0, ry + 0.45, cz - 0.4, { seg: 6 });
  k.box(0.9, 0.08, 0.14, 0x37474f, 0, ry + 0.85, cz - 0.4);
  antenna(k, -cw * 0.35, ry, cz - 0.5, 0.9);
  antenna(k, cw * 0.35, ry, cz - 0.5, 0.7);
  // Navigation lights on the cabin corners (red to port, green to starboard)
  k.ball(0.07, glowMat(u, 0xff1744), -cw / 2, DY + cabH * 0.9, cz + 0.6, { seg: 6, rows: 4 });
  k.ball(0.07, glowMat(u, 0x00e676), cw / 2, DY + cabH * 0.9, cz + 0.6, { seg: 6, rows: 4 });
  // Twin outboard motors on the transom
  for (const sx of [-1, 1]) {
    const x = sx * 0.42;
    const z = zc - L / 2 - 0.2;
    k.cyl(0.06, 0.7, 0x37474f, x, -0.05, z, { seg: 6 });
    k.box(0.36, 0.55, 0.46, monitor ? 0x263238 : 0x212121, x, 0.55, z, { r: 0.12 });
    k.box(0.3, 0.06, 0.3, 0x9e9e9e, x, 0.84, z);
    k.box(0.32, 0.08, 0.06, glowMat(u, 0xff6d00, 0.4), x, 0.55, z - 0.24);
  }
  // Bow cleats and a pair of fenders hanging over the side
  for (const sx of [-1, 1]) {
    k.box(0.24, 0.06, 0.06, STEEL, sx * 0.3, DY + 0.08, zc + L / 2 - 0.6);
    k.cyl(0.1, 0.35, 0xfafafa, sx * (W / 2 + 0.08), 0.25, zc - 0.6, { seg: 8 });
  }
  if (top && level === 2) {
    // RHIB+: orange inflatable tubes along both sides
    for (const sx of [-1, 1]) {
      const pts = [[sx * (W / 2 + 0.12), 0.3, zc - L / 2 + 0.15], [sx * (W / 2 + 0.14), 0.3, zc + L / 2 - 1.5], [sx * (W / 2) * 0.82, 0.3, zc + L / 2 - 0.65], [sx * 0.25, 0.3, zc + L / 2 - 0.05]];
      k.tube(pts, 0.22, 0xff7043, { sides: 10, seg: 24 });
      k.ball(0.22, 0xff7043, pts[0][0], 0.3, pts[0][2], { seg: 10, rows: 6 });
      k.tube(pts.map(([x, y, z]) => [x * 1.02, y + 0.05, z]), 0.03, 0x37474f, { sides: 4, seg: 24 });
    }
  }
  if (monitor) {
    // Monitor: riveted armor plates along both sides, angled out
    for (const sx of [-1, 1]) {
      k.slab(0.16, 0.7, L - 1.2, 0x263238, sx * (W / 2 + 0.1), 0.35, zc - 0.2, { tx: -sx * 0.06, tw: 0.6 });
      bolts(k, [sx * (W / 2 + 0.17), 0.55, zc - L / 2 + 0.8], [sx * (W / 2 + 0.17), 0.55, zc + L / 2 - 1.2], 8, 0x546e7a, 0.035);
    }
    k.slab(cw + 0.12, 0.4, 0.1, 0x263238, 0, DY + cabH * 0.45, cz + 0.85); // windshield guard
  }
  if (top && level >= 5) {
    // Hellfire Missiles: a missile pod on each side of the cabin roof
    for (const sx of [-1, 1]) missileBox(k, sx * (cw / 2 + 0.1), ry + 0.3, cz - 0.1, 0.55, 0.55, 1.3, 0x37474f, 0.25, 2, 2, 0xe53935);
  }
  k.done();

  // The gun mount on the foredeck
  const head = new THREE.Group();
  head.position.set(0, DY, big ? 1.1 : 0.9);
  u.body.add(head);
  const g = kit(u, head, key + ':gun');
  ring(g, 0.5, 0.1, 0.2);
  if (flames) {
    // Flamethrower: nozzles on a pivot, hoses back to the fuel tanks behind them
    const tanks = level >= 5;
    const tankC = tanks ? glowMat(u, 0xff6d00) : 0xc62828;
    const xs = tanks ? [-0.38, 0.38] : [0];
    g.box(1.0, 0.5, 0.7, 0x424242, 0, 0.45, 0.1, { r: 0.08 });
    for (const x of xs) {
      g.cyl(0.18, 1.5, 0x424242, x, 0.55, 0.85, { axis: 'z', r2: 0.14, seg: 10 });
      for (const f of [0.35, 0.75, 1.15]) g.torus(0.17, 0.03, STEEL, x, 0.55, 0.3 + f, { seg: 10 });
      g.cyl(0.24, 0.3, DARK, x, 0.55, 1.65, { axis: 'z', r2: 0.2, seg: 10 });
      g.ball(0.05, glowMat(u, 0x40c4ff), x + 0.16, 0.66, 1.72, { seg: 6, rows: 4 }); // pilot light
      gunMuzzle(u, head, x, 0.55, 1.85);
    }
    const txs = tanks ? [-0.65, 0.65] : [0];
    for (const x of txs) {
      const r = tanks ? 0.5 : 0.38;
      g.cyl(r, 1.2, tankC, x, 0.1 + r, -1.0, { axis: 'z', seg: 14 });
      for (const sz of [-1, 1]) g.ball(r, tankC, x, 0.1 + r, -1.0 + sz * 0.6, { sz: 0.4, seg: 14, rows: 6 });
      for (const f of [-0.35, 0.35]) g.torus(r + 0.02, 0.03, DARK, x, 0.1 + r, -1.0 + f, { seg: 14 });
      g.cyl(0.06, 0.12, STEEL, x, 0.15 + 2 * r, -1.0, { seg: 6 });
      g.tube([[x, 0.15 + 2 * r, -1.0], [x * 0.6, 0.9, -0.4], [x * 0.5, 0.6, -0.1]], 0.05, 0x212121, { sides: 5 });
    }
    u.tracer = 0xff7043;
  } else {
    const cannon = top && level >= 3;
    const xs = top && level >= 4 ? [-0.32, 0.32] : [0];
    const r = cannon ? 0.15 : 0.09;
    const len = cannon ? 1.9 : 1.5;
    const hc = top && level >= 3 ? 0x455a64 : 0x37474f;
    g.cyl(0.12, 0.4, DARK, 0, 0.35, 0, { seg: 8 });
    g.box(xs.length > 1 ? 1.15 : 0.7, 0.5, 0.85, hc, 0, 0.75, -0.05, { r: 0.08 });
    g.slab(xs.length > 1 ? 1.4 : 1.0, 0.75, 0.08, tone(hc, 1.1), 0, 0.85, 0.42, { tw: 0.85 }); // gun shield
    for (const x of xs) {
      barrel(g, x, 0.75, 0.38, len, r, GUN, { brake: cannon, sleeve: bottom && level >= 2 });
      if (bottom && level >= 2) for (let i = 0; i < 4; i++) g.cyl(r + 0.08, 0.12, 0x90a4ae, x, 0.75, 0.7 + i * 0.25, { axis: 'z', seg: 10 }); // cooling fins
      gunMuzzle(u, head, x, 0.75, 0.45 + len);
    }
    for (const sx of [-1, 1]) g.box(0.06, 0.3, 0.06, 0x3b2a1c, sx * 0.18, 0.62, -0.55); // spade grips
    if (bottom && level >= 1) {
      // Smart Gun: a scope with lenses and a little screen
      g.cyl(0.09, 0.7, DARK, 0.2, 1.12, 0.1, { axis: 'z', seg: 10 });
      g.cyl(0.07, 0.03, glowMat(u, 0x76ff03), 0.2, 1.12, 0.46, { axis: 'z', seg: 10 });
      g.box(0.22, 0.16, 0.04, glowMat(u, 0x76ff03, 0.5), -0.2, 1.1, -0.4);
    }
    if (top && level >= 1) crate(g, -0.72, 0.38, -0.2, 0.45, 0.42, 0.55, 0x556b2f); // ammo box
    u.tracer = cannon ? 0xffab40 : 0xffe082;
    u.projectile = { color: 0xeceff1, size: 0.45 };
  }
  g.done();
  u.bob = 0.08; // rocks gently on the water
  return u;
}
export const makePatrolBoatBottom = (level) => makePatrolBoat(level, true);

// ------------------------------------------------------------------ Warship

/**
 * Warship (water only). Has to fit a small pool, so it grows mostly upward. Top path: a longer
 * barrel (Lv 1), a fatter gun (Lv 2), the Cruiser with a second turret (Lv 3), a missile turret
 * (Lv 4), then the Battleship: four triple-barrel turrets and mortars (Lv 5). Bottom path: a radar
 * dish (Lv 1), deck crew (Lv 2), the Frigate Carrier with a helipad and Tomahawk cells (Lv 3),
 * bigger missile boxes (Lv 4), then the dark Railgun Warship with a glowing railgun (Lv 5).
 */
export function makeWarship(level, bottom = false) {
  const u = makeThing();
  const top = !bottom;
  const tier = level >= 5 ? 2 : level >= 3 ? 1 : 0;
  const L = [6, 7.2, 8.4][tier];
  const W = [2.4, 2.9, 3.4][tier];
  const rail = bottom && level >= 5;
  const battle = top && level >= 5;
  const hullC = rail ? 0x263238 : battle ? 0x455a64 : 0x78909c;
  const grey = rail ? 0x37474f : battle ? 0x607d8b : 0x90a4ae;
  const hh = [1.0, 1.3, 1.6][tier];
  const dy = hh - 0.4; // deck height
  const zc = -0.4;
  const key = `warship${level}${bottom ? 'B' : 'T'}`;
  const k = kit(u, u.body, key);
  hull(k, L, W, -0.5, dy, hullC, { z: zc, bow: L * 0.3, stripe: 0x8e2b2b, deck: 0x8d8d8d });
  // Hull details: portholes, a hull number, anchors and a jack staff on the bow
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 5 + tier; i++) k.cyl(0.06, 0.04, 0x1a1a1a, sx * (W / 2 + 0.005), dy - 0.35, zc - L / 2 + 0.7 + i * 0.6, { axis: 'x', seg: 8 });
    k.box(0.03, 0.4, 0.22, 0xfafafa, sx * (W / 2 * 0.9 + 0.02), dy - 0.3, zc + L / 2 - L * 0.24);
    k.box(0.03, 0.4, 0.22, 0xfafafa, sx * (W / 2 * 0.86 + 0.02), dy - 0.3, zc + L / 2 - L * 0.2);
    k.box(0.06, 0.28, 0.2, DARK, sx * (W / 2 * 0.7), dy - 0.2, zc + L / 2 - 0.9, { r: 0.03 }); // anchor
  }
  k.cyl(0.03, 0.8, DARK, 0, dy + 0.4, zc + L / 2 - 0.25, { seg: 4 });
  // Bridge: a stepped, raked superstructure with a window band and bridge wings
  const bh = [1.3, 2.0, 2.8][tier];
  const bz = -L * 0.18;
  k.slab(W * 0.62, bh, 1.9, grey, 0, dy + bh / 2, bz, { tw: 0.9, td: 0.85, tz: -0.08 });
  k.slab(W * 0.52, bh * 0.4, 1.35, grey, 0, dy + bh + bh * 0.2, bz - 0.12, { tw: 0.92, td: 0.85, tz: -0.06 });
  k.box(W * 0.5, bh * 0.14, 0.05, GLASS, 0, dy + bh * 1.26, bz + 0.47, { rx: -0.15 });
  for (const sx of [-1, 1]) {
    k.box(0.5, 0.08, 0.5, tone(grey, 0.9), sx * (W * 0.26 + 0.25), dy + bh * 1.05, bz + 0.25); // bridge wing
    for (let j = 0; j < 3; j++) k.box(0.04, 0.16, 0.22, 0x263238, sx * (W * 0.31 * 0.96 + 0.01), dy + bh * 0.55, bz - 0.5 + j * 0.5); // side windows
  }
  // Mast: a tripod with a yard, radar bar, lights and whips
  const mastH = 1.6 + tier * 0.8;
  const my = dy + bh * 1.4;
  const mz = bz - 0.25;
  for (const [ox, oz] of [[-0.35, -0.2], [0.35, -0.2], [0, 0.3]]) k.tube([[ox, my, mz + oz], [0, my + mastH, mz]], 0.05, DARK, { sides: 5 });
  k.cyl(0.04, 0.6, DARK, 0, my + mastH + 0.3, mz, { seg: 5 });
  k.box(1.4 + tier * 0.4, 0.07, 0.07, DARK, 0, my + mastH * 0.75, mz);
  k.box(0.9, 0.1, 0.18, 0x37474f, 0, my + mastH + 0.05, mz);
  k.ball(0.07, glowMat(u, 0xffffff), 0, my + mastH + 0.62, mz, { seg: 6, rows: 4 });
  for (const sx of [-1, 1]) k.cyl(0.015, 0.7, 0x121314, sx * (0.6 + tier * 0.2), my + mastH * 0.75 - 0.35, mz, { seg: 3 });
  if (!rail) {
    // Funnel: an oval stack with a black cap and two lifeboats on davits beside it
    const fh = 1.0 + tier * 0.4;
    k.cyl(0.45, fh, 0x37474f, 0, dy + fh / 2, bz - 1.55, { sx: (W * 0.16) / 0.45, seg: 14, r2: 0.42 });
    k.cyl(0.43, 0.2, 0x1a1a1a, 0, dy + fh + 0.08, bz - 1.55, { sx: (W * 0.16) / 0.45, seg: 14 });
    for (const sx of [-1, 1]) {
      k.ball(0.22, 0xff6d00, sx * (W / 2 - 0.3), dy + 0.55, bz - 1.5, { sz: 3, sy: 0.8, seg: 10, rows: 6 });
      k.ball(0.2, 0xfafafa, sx * (W / 2 - 0.3), dy + 0.66, bz - 1.5, { sz: 2.9, sy: 0.6, seg: 10, rows: 6 });
      for (const f of [-0.5, 0.5]) k.tube([[sx * (W / 2 - 0.55), dy, bz - 1.5 + f], [sx * (W / 2 - 0.5), dy + 0.95, bz - 1.5 + f], [sx * (W / 2 - 0.3), dy + 0.9, bz - 1.5 + f]], 0.03, STEEL, { sides: 4 });
    }
  }
  if (rail) {
    // Railgun Warship: stealthy angled hull plates and a sensor dome on the bridge
    for (const sx of [-1, 1]) {
      k.slab(0.2, hh * 0.8, L - 1.5, 0x1c2529, sx * (W / 2 + 0.05), dy - hh * 0.4, zc - 0.2, { tx: -sx * 0.12, tw: 0.5 });
    }
    k.ball(0.5, 0xeceff1, 0, my + 0.3, bz + 0.1, { seg: 14, rows: 8 });
    k.cyl(0.52, 0.1, DARK, 0, my + 0.05, bz + 0.1, { seg: 14 });
  } else if (battle) {
    // Barbettes under the raised turrets and mortar batteries along both sides
    for (const z of [L * 0.12, -L * 0.36]) k.cyl(0.85, 0.9, grey, 0, dy + 0.45, z, { seg: 18 });
    for (const sx of [-1, 1]) for (const z of [-0.6, 0.6]) {
      const x = sx * (W / 2 - 0.45);
      k.box(0.7, 0.4, 0.7, DARK, x, dy + 0.2, bz + z, { r: 0.05 });
      for (const ox of [-0.15, 0.15]) {
        k.cyl(0.09, 0.55, 0x424242, x + ox, dy + 0.65, bz + z, { seg: 8, rx: -0.3 });
        k.cyl(0.05, 0.03, 0x050505, x + ox, dy + 0.93, bz + z + 0.08, { seg: 6, rx: -0.3 });
      }
    }
  } else {
    if (top && level >= 3) k.cyl(0.8, 0.7, grey, 0, dy + 0.35, -L * 0.45, { seg: 18 }); // Cruiser: barbette aft
    if (top && level >= 4) for (const sx of [-1, 1]) missileBox(k, sx * (W / 2 - 0.5), dy + 0.6, bz + 0.2, 0.75, 0.65, 1.4, 0x37474f, 0.4, 2, 2, 0xe53935);
    if (bottom && level >= 2) for (const [x, z, r] of [[-0.7, 0.3, 0.3], [0.7, -0.2, -0.4], [0.6, L * 0.05 + 0.6, 0.8]]) sailor(k, x, dy, z, r);
    if (bottom && level >= 3) {
      // Frigate Carrier: a helipad on the stern and Tomahawk launch cells
      const hz = -L / 2 + 0.7 + zc + 0.4;
      k.box(W - 0.5, 0.06, 2.0, 0x424242, 0, dy + 0.06, hz);
      k.torus(0.75, 0.04, 0xfdd835, 0, dy + 0.1, hz, { rx: PI / 2, seg: 20 });
      for (const sx of [-1, 1]) k.box(0.16, 0.04, 0.9, 0xfafafa, sx * 0.28, dy + 0.11, hz);
      k.box(0.4, 0.04, 0.16, 0xfafafa, 0, dy + 0.11, hz);
      k.tube([[-(W / 2 - 0.25), dy + 0.15, hz - 1.0], [-(W / 2 - 0.25), dy + 0.15, hz + 1.0]], 0.03, STEEL, { sides: 4 });
      k.tube([[W / 2 - 0.25, dy + 0.15, hz - 1.0], [W / 2 - 0.25, dy + 0.15, hz + 1.0]], 0.03, STEEL, { sides: 4 });
      const cells = level >= 4 ? 3 : 2;
      k.box(0.95, 0.25, cells * 0.5 + 0.1, 0x546e7a, 0, dy + 0.12, L * 0.02 + (cells - 1) * 0.25);
      for (let i = 0; i < cells; i++) for (const x of [-0.22, 0.22]) {
        k.box(0.36, 0.04, 0.36, tone(0x546e7a, 0.8), x, dy + 0.26, L * 0.02 + i * 0.5);
        k.box(0.2, 0.03, 0.2, 0xe53935, x, dy + 0.29, L * 0.02 + i * 0.5);
      }
      if (level >= 4) {
        // Advanced Missiles: big armored box launchers beside the bridge with glowing noses
        const hot = glowMat(u, 0xff6d00);
        for (const sx of [-1, 1]) missileBox(k, sx * (W / 2 - 0.5), dy + 0.7, bz + 0.4, 0.85, 0.85, 1.7, 0x37474f, 0.35, 2, 2, hot);
      }
    }
  }
  k.done();

  // Guns
  if (rail) {
    const t = new THREE.Group();
    t.position.set(0, dy, L * 0.18);
    u.body.add(t);
    const g = kit(u, t, 'warshipRail');
    const glow = glowMat(u, 0x40c4ff);
    g.cyl(0.9, 0.2, DARK, 0, 0.1, -0.3, { seg: 18 });
    g.slab(1.8, 0.8, 2.2, 0x37474f, 0, 0.6, -0.3, { tw: 0.75, td: 0.85 });
    for (const sx of [-1, 1]) {
      g.box(0.2, 0.36, 4.6, DARK, sx * 0.3, 0.95, 2.0, { r: 0.04 });
      g.box(0.06, 0.12, 4.4, glow, sx * 0.2, 0.95, 2.0);
      g.box(0.3, 0.5, 0.6, 0x455a64, sx * 0.75, 0.75, -0.6, { r: 0.05 }); // capacitors
      g.box(0.04, 0.3, 0.4, glow, sx * 0.91, 0.75, -0.6);
    }
    for (let i = 0; i < 4; i++) g.torus(0.48, 0.09, 0x455a64, 0, 0.95, 0.5 + i * 1.0, { seg: 12 }); // field coils
    for (let i = 0; i < 4; i++) g.torus(0.48, 0.03, glow, 0, 0.95, 0.62 + i * 1.0, { seg: 12 });
    g.done();
    gunMuzzle(u, t, 0, 0.95, 4.4);
    u.tracer = 0x40c4ff;
    u.tracerWidth = 0.5;
  } else if (battle) {
    shipTurret(u, dy, L * 0.32, 3, 2.4, 0.15, 1.2, grey, 'b');
    shipTurret(u, dy + 0.9, L * 0.12, 3, 2.4, 0.15, 1.2, grey, 'b');
    shipTurret(u, dy, -L * 0.5, 3, 2.0, 0.15, 1.2, grey, 'b', true);
    shipTurret(u, dy + 0.9, -L * 0.36, 3, 2.0, 0.15, 1.2, grey, 'b', true);
    u.tracer = 0xffab40;
  } else {
    const len = top ? (level >= 1 ? 2.6 : 1.8) : 2.0;
    const r = top && level >= 2 ? 0.2 : 0.14;
    const n = bottom && level >= 3 ? 2 : 1;
    shipTurret(u, dy, L * 0.22, n, len, r, tier ? 1.15 : 1, grey, 'f');
    if (top && level >= 3) shipTurret(u, dy + 0.7, -L * 0.45, 2, 2.0, 0.15, 1.15, grey, 'a', true);
    if (bottom && level >= 1) dish(u, u.body, 'warshipDish', 0, my + mastH * 0.9, mz + 0.2, 0.45, 0xeceff1, glowMat(u, 0xff1744));
    u.tracer = 0xffab40;
  }
  if (tier === 2) u.body.position.z = -0.4; // keep the biggest ships centered in their pool
  u.projectile = { color: 0x424242, size: battle ? 0.8 : 0.6 };
  u.bob = 0.06; // rocks gently on the water
  return u;
}
export const makeWarshipBottom = (level) => makeWarship(level, true);

// ------------------------------------------------------------------ MLRS

/**
 * MLRS (event): a six-wheeled rocket truck with a launcher box on the back that tilts up. Lv 1 a
 * second pod (12 tubes), Lv 2 a radar dish, Lv 3 red-tipped Heavy Missiles, Lv 4 a second radar,
 * Lv 5 Freedom Time: navy paint with red and white stripes and a star.
 */
export function makeMLRS(level) {
  const u = makeThing();
  const free = level >= 5;
  const paint = free ? 0x1a237e : 0x556b2f;
  const key = `mlrs${level}`;
  const k = kit(u, u.body, key);
  // Chassis: two frame rails, a deck, bumpers, fuel tanks and steps
  for (const sx of [-1, 1]) k.box(0.22, 0.4, 7.2, DARK, sx * 0.75, 0.95, 0);
  k.box(2.9, 0.18, 4.6, 0x37474f, 0, 1.25, -1.2);
  k.box(2.9, 0.35, 0.3, DARK, 0, 0.9, -3.65, { r: 0.05 });
  for (const sx of [-1, 1]) {
    k.box(0.22, 0.1, 0.1, glowMat(u, 0xff1744), sx * 1.2, 1.0, -3.81); // tail lights
    k.cyl(0.32, 1.1, 0x9e9e9e, sx * 1.1, 0.95, 1.0, { axis: 'z', seg: 12 }); // fuel tanks
    for (const f of [-0.35, 0.35]) k.torus(0.33, 0.025, DARK, sx * 1.1, 0.95, 1.0 + f, { seg: 12 });
  }
  // Mudguards over the wheels
  for (const z of [-2.4, -0.95]) for (const sx of [-1, 1]) {
    k.box(0.62, 0.06, 1.55, DARK, sx * 1.45, 1.42, z);
    k.box(0.62, 0.4, 0.06, DARK, sx * 1.45, 1.2, z - 0.76);
  }
  // Cab: a boxy forward cab with a raked windshield, grille, lamps, mirrors and a roof hatch
  k.prism(profile([[1.6, 1.1], [1.6, 3.55], [3.5, 3.45], [3.75, 2.4], [3.75, 1.1]], [[2.4, 0.78]], 0.65), 2.9, paint, 0, 0, 0, { bevel: 0.08 });
  k.box(2.4, 0.85, 0.05, GLASS, 0, 2.92, 3.64, { rx: -0.23 });
  k.box(0.06, 0.88, 0.07, tone(paint, 0.7), 0, 2.92, 3.66, { rx: -0.23 });
  for (const sx of [-1, 1]) {
    k.box(0.05, 0.6, 0.9, GLASS, sx * 1.451, 2.85, 2.95);
    k.box(0.05, 0.05, 0.6, tone(paint, 0.7), sx * 1.455, 2.2, 2.3); // door handle line
    mirror(k, sx * 1.45, 2.9, 3.5, sx);
    lamp(k, sx * 0.95, 1.75, 3.78, 0.16);
    k.box(0.22, 0.12, 0.05, glowMat(u, 0xffab00), sx * 1.25, 2.05, 3.78); // indicators
  }
  k.box(1.1, 0.6, 0.06, 0x16181a, 0, 1.75, 3.77);
  for (let i = 0; i < 5; i++) k.box(1.0, 0.05, 0.05, tone(paint, 0.7), 0, 1.53 + i * 0.11, 3.8);
  k.box(3.0, 0.3, 0.25, DARK, 0, 1.25, 3.9, { r: 0.05 }); // bumper
  hatch(k, 0.4, 3.52, 2.5, 0.28, tone(paint, 0.9));
  k.cyl(0.1, 0.14, DARK, -0.8, 3.6, 2.4, { seg: 8 });
  k.ball(0.09, glowMat(u, 0xffab00), -0.8, 3.72, 2.4, { seg: 6, rows: 4 }); // beacon
  if (free) star(k, 1.47, 2.3, 2.35, 0.32, 0xfafafa, { rz: -PI / 2 });
  if (free) star(k, -1.47, 2.3, 2.35, 0.32, 0xfafafa, { rz: PI / 2 });
  // Stabiliser jacks lowered at the back corners
  for (const sx of [-1, 1]) {
    k.box(0.2, 0.3, 0.2, DARK, sx * 1.3, 1.05, -3.3);
    k.cyl(0.08, 0.95, STEEL, sx * 1.3, 0.5, -3.3, { seg: 8 });
    k.cyl(0.25, 0.08, DARK, sx * 1.3, 0.04, -3.3, { seg: 12 });
  }
  // Turntable and elevation rams under the pod
  k.cyl(1.0, 0.3, DARK, 0, 1.5, -1.4, { seg: 20 });
  k.torus(0.95, 0.05, STEEL, 0, 1.66, -1.4, { rx: PI / 2, seg: 20 });
  for (const sx of [-1, 1]) {
    k.box(0.25, 0.7, 1.4, 0x37474f, sx * 0.8, 1.95, -1.4);
    k.tube([[sx * 0.6, 1.6, -0.2], [sx * 0.6, 2.4, 0.4]], 0.07, STEEL, { sides: 6 });
  }
  if (level >= 2) {
    // Radar: masts on the cab roof
    for (const x of level >= 4 ? [-0.8, 0.8] : [0]) {
      k.cyl(0.18, 0.12, DARK, x, 3.6, 2.2, { seg: 10 });
      k.cyl(0.06, 1.2, 0x37474f, x, 4.2, 2.2, { seg: 6 });
    }
  }
  k.done();
  for (const z of [-2.4, -0.95, 2.4]) for (const sx of [-1, 1]) wheel(u, u.body, sx * 1.45, 0.65, z, 0.65, 0.5);
  if (level >= 2) for (const x of level >= 4 ? [-0.8, 0.8] : [0]) dish(u, u.body, 'mlrsDish', x, 4.85, 2.2, 0.55, 0xcfd8dc, glowMat(u, 0xff1744));

  // The launcher: one or two pods of six tubes, tipped up toward the sky
  const pod = new THREE.Group();
  pod.position.set(0, 2.35, -1.4);
  pod.rotation.x = -0.6;
  u.body.add(pod);
  const p = kit(u, pod, `mlrsPod${level}`);
  const xs = level >= 1 ? [-0.75, 0.75] : [0];
  const tip = level >= 3 ? glowMat(u, 0xff3d00) : 0x8d6e63;
  for (const x of xs) {
    p.box(1.4, 1.1, 3.6, paint, x, 0.6, 0, { r: 0.06 });
    p.box(1.44, 0.08, 3.64, tone(paint, 0.75), x, 1.0, 0);
    p.box(1.44, 0.08, 3.64, tone(paint, 0.75), x, 0.2, 0);
    for (const sz of [-1, 1]) p.box(1.3, 0.1, 0.12, DARK, x, 1.2, sz * 1.4); // lifting bars
    p.box(1.3, 1.0, 0.06, 0x2b2b2b, x, 0.6, 1.79);
    for (let c = 0; c < 3; c++) for (let r = 0; r < 2; r++) {
      const tx = x - 0.4 + c * 0.4;
      const ty = 0.35 + r * 0.5;
      p.cyl(0.17, 0.08, DARK, tx, ty, 1.82, { axis: 'z', seg: 10 });
      p.cyl(0.13, 0.22, tip, tx, ty, 1.86, { axis: 'z', r2: 0.02, seg: 10 }); // rocket nose
    }
    if (free) for (let i = 0; i < 3; i++) p.box(1.45, 0.12, 3.62, i % 2 ? 0xffffff : 0xd50000, x, 0.42 + i * 0.16, 0);
    else p.box(0.04, 0.4, 1.2, 0xfafafa, x + 0.71 * Math.sign(x || 1), 0.6, -0.6); // stencil block
  }
  p.done();
  gunMuzzle(u, pod, 0, 0.6, 2.0);
  u.height = level >= 2 ? 5.5 : 4;
  u.projectile = { color: free ? 0xff1744 : 0xeceff1, size: level >= 3 ? 0.55 : 0.4, arc: 8 };
  u.tracer = 0xff7043;
  return u;
}

// ------------------------------------------------------------------ Star Cannon

/**
 * Star Cannon (event, cliff). Lv 1 a steel cannon on a turntable; Lv 2 solar battery packs and
 * panels; Lv 3 the Eclipsed Crew: a dark barrel with a sun-dish; Lv 4 Lunar Charges: deep blue with a
 * crescent moon and violet rings; Lv 5 Shot of the Century: a colossal gold barrel with capacitors
 * and a crown of stars.
 */
export function makeStarCannon(level) {
  const u = makeThing();
  const steel = [0x78909c, 0x607d8b, 0x263238, 0x1a237e, 0x0d0d2b][level];
  const starC = [0xffd740, 0xffab00, 0xff6d00, 0xb388ff, 0xffffff][level];
  const glow = glowMat(u, starC);
  const key = `starCannon${level}`;
  const k = kit(u, u.body, key);
  // Base: an eight-sided plinth with a step, bolts and a turntable
  const oct = (r) => Array.from({ length: 8 }, (_, i) => [Math.cos((i / 8) * PI * 2 + PI / 8) * r, Math.sin((i / 8) * PI * 2 + PI / 8) * r]);
  k.plan(oct(2.45), 0.35, 0x37474f, 0, 0, 0, { bevel: 0.06 });
  k.plan(oct(2.1), 0.3, 0x455a64, 0, 0.35, 0, { bevel: 0.06 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2 + PI / 8;
    k.cyl(0.07, 0.08, STEEL, Math.cos(a) * 1.85, 0.69, Math.sin(a) * 1.85, { seg: 6 });
  }
  const tr = 1.6 + level * 0.1;
  ring(k, tr, 0.85, 0.4);
  k.slab(tr * 1.6, 0.5, tr * 1.6, steel, 0, 1.3, 0, { tw: 0.85, td: 0.85 });
  // Carriage cheeks with trunnion caps
  const w = 1.4 + level * 0.25; // barrel width
  for (const sx of [-1, 1]) {
    k.slab(0.35, 1.5, 2.0, tone(steel, 1.15), sx * (w / 2 + 0.3), 2.2, -0.3, { td: 0.6, tz: 0.15 });
    k.cyl(0.38, 0.2, GOLD, sx * (w / 2 + 0.5), 2.6, -0.1, { axis: 'x', seg: 14 });
    k.cyl(0.18, 0.1, glow, sx * (w / 2 + 0.62), 2.6, -0.1, { axis: 'x', seg: 10 });
  }
  const charge = level >= 1 ? glowMat(u, 0x76ff03) : null;
  if (level >= 1) {
    // Solar-Flare Batteries: battery packs with glowing charge bars and a tilted solar panel
    for (const sx of [-1, 1]) {
      k.box(0.8, 1.1, 1.3, 0x33691e, sx * 1.75, 1.15, -1.25, { r: 0.06 });
      for (let i = 0; i < 3; i++) k.box(0.82, 0.12, 0.25, charge, sx * 1.75, 0.95 + i * 0.22, -0.95);
      for (const f of [-0.2, 0.2]) k.cyl(0.07, 0.12, f < 0 ? 0xc62828 : DARK, sx * 1.75, 1.76, -1.4 + f, { seg: 6 }); // terminals
    }
    k.tube([[0, 1.5, -1.3], [0, 2.6, -1.8]], 0.07, DARK, { sides: 6 });
    const tilt = -0.6;
    k.box(2.4, 0.08, 1.4, 0xb0bec5, 0, 2.95, -1.9, { rx: tilt });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      const lx = -0.88 + i * 0.59;
      const lz = -0.33 + j * 0.66;
      // a cell at (lx, 0.05, lz) on the panel, turned with it
      k.box(0.54, 0.04, 0.6, 0x1a237e, lx, 2.95 + 0.05 * Math.cos(tilt) - lz * Math.sin(tilt), -1.9 + 0.05 * Math.sin(tilt) + lz * Math.cos(tilt), { rx: tilt });
    }
  }
  if (level >= 2) {
    // Eclipsed Crew: a black sun-dish with a glowing corona behind the gun
    k.cyl(0.08, 1.8, DARK, 0, 3.4, -2.1, { seg: 6 });
    k.cyl(1.3, 0.18, 0x212121, 0, 4.6, -2.1, { axis: 'z', seg: 24 });
    k.torus(1.05, 0.12, glowMat(u, 0xff6d00), 0, 4.6, -1.98, { seg: 24 });
    const ray = glowMat(u, 0xffab00);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2;
      k.box(0.12, 0.42, 0.06, ray, Math.cos(a) * 1.42, 4.6 + Math.sin(a) * 1.42, -2.02, { rz: a - PI / 2 }); // rays
    }
    k.cyl(0.85, 0.1, 0x0a0a0a, 0, 4.6, -1.92, { axis: 'z', seg: 22 });
  }
  if (level >= 3) {
    // Lunar Charges: a glowing crescent moon over the dish
    k.torus(0.9, 0.22, glowMat(u, 0xe1f5fe), 0.4, 6.3, -2.1, { arc: PI * 1.15, rz: -PI * 0.08 + PI / 2, seg: 18 });
  }
  if (level >= 4) {
    // Shot of the Century: tall gold capacitors with glowing coils, and a crown of stars
    for (const sx of [-1, 1]) {
      k.cyl(0.42, 3.0, GOLD, sx * 2.0, 2.4, -0.2, { seg: 14 });
      for (let i = 0; i < 4; i++) k.torus(0.44, 0.06, glow, sx * 2.0, 1.3 + i * 0.65, -0.2, { rx: PI / 2, seg: 14 });
      k.cyl(0.5, 0.2, tone(GOLD, 0.7), sx * 2.0, 3.95, -0.2, { seg: 14 });
      k.cyl(0.08, 0.6, STEEL, sx * 2.0, 4.35, -0.2, { seg: 6 });
      k.ball(0.18, glow, sx * 2.0, 4.7, -0.2, { seg: 8, rows: 6 });
    }
  }
  k.done();

  // The barrel: its own group, so it kicks back when it fires
  const gun = new THREE.Group();
  gun.position.set(0, 2.6, 0);
  u.body.add(gun);
  const g = kit(u, gun, key + ':gun');
  const len = 4 + level * 0.9;
  const r = w / 2;
  const bc = level >= 4 ? GOLD : steel;
  g.box(w + 0.3, w + 0.2, 1.4, tone(bc, 0.85), 0, 0, -1.1, { r: 0.15 }); // breech
  g.cyl(r * 0.6, 0.2, DARK, 0, 0, -1.85, { axis: 'z', seg: 14 });
  g.cyl(r, len, bc, 0, 0, len / 2 - 1, { axis: 'z', r2: r * 0.8, seg: 20 });
  const rings = 2 + level;
  for (let i = 0; i < rings; i++) {
    const z = 0.2 + i * (len / rings);
    const rr = r * (1 - 0.2 * ((z + 1) / len)) + 0.08;
    g.torus(rr, 0.12, i === rings - 1 || i % 2 ? glow : GOLD, 0, 0, z, { seg: 20 });
  }
  g.cyl(r * 0.95, 0.4, tone(bc, 0.7), 0, 0, len - 1.1, { axis: 'z', seg: 20 }); // muzzle crown
  g.cyl(r * 0.62, 0.05, glow, 0, 0, len - 0.89, { axis: 'z', seg: 18 });
  standingStar(g, 0, w / 2 + 0.95, -1.0, 0.9, glow, 0.16); // star emblem on top
  if (level >= 4) for (let i = 0; i < 5; i++) standingStar(g, (i - 2) * 0.55, r + 0.3 + (i % 2) * 0.25, 0.4 + Math.abs(i - 2) * 0.1, 0.24, glow, 0.08); // crown
  g.done();
  gunMuzzle(u, gun, 0, 0, len - 0.9);
  u.tracer = starC;
  u.tracerWidth = 0.9 + level * 0.3;
  return u;
}

// ------------------------------------------------------------------ Cryo Heli

/**
 * Cryo Helicopter (event): a frosty helipad with an ice tank, plus a white-and-blue helicopter.
 * Lv 3 Cryo Missile pods (from makeHeli) and missile crates, Lv 5 the big Mi-Ice Hind with glowing
 * ice-blue trim.
 */
export function makeCryoHeli(level) {
  const u = makeThing();
  const ice = 0x80d8ff;
  const iceGlow = glowMat(u, ice);
  const k = kit(u, u.body, `cryopad${level}`);
  k.slab(4.2, 0.3, 4.2, 0xb0bec5, 0, 0.15, 0, { tw: 0.97, td: 0.97 });
  k.cyl(1.75, 0.03, 0xe1f5fe, 0, 0.31, 0, { seg: 28 });
  k.torus(1.55, 0.05, 0x0288d1, 0, 0.32, 0, { rx: PI / 2, seg: 28 });
  for (const sx of [-1, 1]) k.box(0.32, 0.04, 1.6, 0x0288d1, sx * 0.5, 0.33, 0);
  k.box(0.7, 0.04, 0.3, 0x0288d1, 0, 0.33, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2 + PI / 8;
    k.cyl(0.1, 0.12, DARK, Math.cos(a) * 1.92, 0.36, Math.sin(a) * 1.92, { seg: 8 });
    k.ball(0.08, iceGlow, Math.cos(a) * 1.92, 0.44, Math.sin(a) * 1.92, { seg: 6, rows: 4 });
  }
  // Frost: snow drifts and ice chunks round the edge
  for (const [x, z, s] of [[-1.9, -0.6, 0.5], [1.95, 0.5, 0.4], [-0.4, -1.95, 0.45], [0.9, 1.95, 0.35]]) {
    k.ball(s, 0xf5f9ff, x, 0.3, z, { sy: 0.35, seg: 10, rows: 6 });
    k.cyl(s * 0.35, s * 0.9, 0xb3e5fc, x + s * 0.3, 0.3 + s * 0.3, z, { r2: 0.02, seg: 5, flat: true, rz: 0.3 });
  }
  // Coolant tank: an upright frosted cylinder with rings, a glowing gauge and pipes into the pad
  const tx = 1.6;
  const tz = -1.6;
  k.cyl(0.5, 1.5, 0xcfd8dc, tx, 1.05, tz, { seg: 16 });
  k.ball(0.5, 0xcfd8dc, tx, 1.8, tz, { sy: 0.45, seg: 16, rows: 6 });
  for (const y of [0.55, 1.05, 1.55]) k.torus(0.51, 0.04, 0x90a4ae, tx, y, tz, { rx: PI / 2, seg: 16 });
  k.box(0.08, 0.9, 0.3, iceGlow, tx - 0.36, 1.05, tz + 0.36, { ry: -PI / 4 });
  k.cyl(0.06, 0.2, DARK, tx, 2.1, tz, { seg: 6 });
  k.tube([[tx - 0.4, 0.5, tz + 0.2], [tx - 0.9, 0.35, tz + 0.6], [tx - 1.3, 0.33, tz + 0.7]], 0.05, 0x0288d1, { sides: 5 });
  for (const sx of [-1, 1]) k.box(0.12, 0.3, 0.12, DARK, tx + sx * 0.38, 0.45, tz + 0.38);
  if (level >= 3) {
    // Missile crates by the pad
    crate(k, -1.6, 0.55, 1.3, 1.0, 0.45, 0.5, 0x90a4ae);
    crate(k, -1.6, 0.55, 1.9, 1.0, 0.45, 0.5, 0x90a4ae);
    crate(k, -1.6, 1.0, 1.6, 1.0, 0.45, 0.5, 0x78909c);
    for (const z of [1.3, 1.9]) k.box(0.4, 0.12, 0.02, iceGlow, -1.6, 0.6, z + 0.26);
  }
  k.done();
  const big = level >= 5;
  const { heli, muzzles } = makeHeli(u, level, true, { color: big ? 0x01579b : 0xeceff1, trim: big ? 0x40c4ff : 0x0288d1 });
  u.plane = heli;
  u.heli = true;
  u.muzzles = muzzles;
  u.spin = u.spin ?? null;
  u.flyHeight = 13;
  u.tracer = ice;
  u.tracerWidth = 0.35;
  return u;
}

// ------------------------------------------------------------------ Graveyard

/** A gravestone at (x, z) on ground y: 'round', 'cross' or 'spire', with an engraving and a mound in front. */
function grave(k, x, y, z, type, col, mound = true) {
  if (type === 'cross') {
    k.box(0.2, 1.2, 0.2, col, x, y + 0.6, z, { r: 0.03 });
    k.box(0.7, 0.2, 0.2, col, x, y + 0.85, z, { r: 0.03 });
    k.box(0.5, 0.15, 0.4, tone(col, 0.85), x, y + 0.07, z);
  } else if (type === 'spire') {
    k.box(0.6, 0.25, 0.6, tone(col, 0.85), x, y + 0.12, z);
    k.slab(0.42, 1.1, 0.42, col, x, y + 0.8, z, { tw: 0.6, td: 0.6 });
    k.cyl(0.18, 0.4, col, x, y + 1.55, z, { r2: 0, seg: 4, ry: PI / 4, flat: true });
  } else {
    k.box(0.8, 0.8, 0.22, col, x, y + 0.45, z);
    k.cyl(0.4, 0.22, col, x, y + 0.85, z, { axis: 'z', seg: 14 });
    k.box(0.9, 0.12, 0.32, tone(col, 0.85), x, y + 0.06, z);
    k.box(0.45, 0.05, 0.02, tone(col, 0.6), x, y + 0.75, z + 0.12); // engraving
    k.box(0.35, 0.05, 0.02, tone(col, 0.6), x, y + 0.6, z + 0.12);
    k.box(0.08, 0.3, 0.02, tone(col, 0.6), x, y + 0.95, z + 0.12);
    k.box(0.22, 0.06, 0.02, tone(col, 0.6), x, y + 1.0, z + 0.12);
  }
  k.ball(0.12, 0x558b2f, x - 0.3, y + 0.15, z + 0.05, { sy: 0.6, seg: 6, rows: 4 }); // moss
  if (mound) k.ball(0.5, 0x3e2723, x, y, z + 0.65, { sx: 0.8, sy: 0.25, sz: 1.3, seg: 10, rows: 6 });
}

/** An iron fence run from a to b ([x, z]): two rails and spear-topped pickets. */
function ironFence(k, a, b, y, h) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.round(len / 0.28));
  for (const f of [0.25, 0.85]) k.tube([[a[0], y + h * f, a[1]], [b[0], y + h * f, b[1]]], 0.03, 0x1a1a1a, { sides: 4, seg: 2 });
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a[0] + (b[0] - a[0]) * t;
    const z = a[1] + (b[1] - a[1]) * t;
    k.cyl(0.03, h, 0x1a1a1a, x, y + h / 2, z, { seg: 4 });
    k.cyl(0.06, 0.16, 0x1a1a1a, x, y + h + 0.08, z, { r2: 0, seg: 4 });
  }
}

/**
 * Graveyard (event spawner): a fenced patch of graves. Lv 2 more gravestones, Lv 3 a giant
 * cracked tomb, Lv 4 a crypt with glowing windows, Lv 5 a dead tree and Jack's crowned skull.
 */
export function makeGraveyard(level) {
  const u = makeThing();
  const stone = level >= 4 ? 0x607d8b : 0x9e9e9e;
  const green = glowMat(u, 0x76ff03);
  const k = kit(u, u.body, `graveyard${level}`);
  k.slab(4.4, 0.3, 4.4, 0x4e342e, 0, 0.15, 0, { tw: 0.97, td: 0.97 });
  for (let i = 0; i < 14; i++) {
    const a = i * 2.39;
    const r = 1.2 + (i % 4) * 0.25;
    k.ball(0.1 + (i % 3) * 0.04, i % 2 ? 0x33691e : 0x558b2f, Math.cos(a) * r, 0.3, Math.sin(a) * r, { sy: 0.6, seg: 6, rows: 4 }); // grass tufts
  }
  // Flagstone path from the gate
  for (let i = 0; i < 4; i++) k.box(0.55, 0.06, 0.4, i % 2 ? 0x8d8d8d : 0x7a7a7a, (i % 2) * 0.12 - 0.06, 0.32, 1.9 - i * 0.5, { ry: (i % 3) * 0.15 });
  // Iron fence on three sides and both sides of the gate, with stone gate posts and lanterns
  ironFence(k, [-2.1, -2.1], [2.1, -2.1], 0.3, 1.0);
  ironFence(k, [-2.1, -2.1], [-2.1, 2.1], 0.3, 1.0);
  ironFence(k, [2.1, -2.1], [2.1, 2.1], 0.3, 1.0);
  ironFence(k, [-2.1, 2.1], [-0.9, 2.1], 0.3, 1.0);
  ironFence(k, [0.9, 2.1], [2.1, 2.1], 0.3, 1.0);
  for (const sx of [-1, 1]) {
    k.box(0.4, 1.5, 0.4, 0x757575, sx * 0.75, 1.05, 2.1, { r: 0.04 });
    k.box(0.5, 0.12, 0.5, 0x616161, sx * 0.75, 1.86, 2.1);
    k.cyl(0.08, 0.1, 0x1a1a1a, sx * 0.75, 1.97, 2.1, { seg: 6 });
    k.box(0.26, 0.04, 0.26, 0x1a1a1a, sx * 0.75, 2.03, 2.1);
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.box(0.03, 0.3, 0.03, 0x1a1a1a, sx * 0.75 + ox * 0.11, 2.17, 2.1 + oz * 0.11);
    k.box(0.17, 0.24, 0.17, green, sx * 0.75, 2.17, 2.1);
    k.cyl(0.15, 0.12, 0x1a1a1a, sx * 0.75, 2.38, 2.1, { r2: 0.02, seg: 4, ry: PI / 4 });
  }
  const types = ['round', 'cross', 'round', 'spire'];
  const stones = [[-1.0, 0.6], [1.0, 0.6]];
  if (level >= 1) stones.push([-1.0, -0.6], [1.0, -0.6]);
  stones.forEach(([x, z], i) => grave(k, x, 0.3, z, types[i], stone));
  // Candles in front of the first graves
  for (const [x, z] of [[-0.6, 1.0], [1.35, 1.05]]) {
    k.cyl(0.05, 0.22, 0xfff8e1, x, 0.41, z, { seg: 6 });
    k.cyl(0.03, 0.08, green, x, 0.56, z, { r2: 0, seg: 5 });
  }
  if (level >= 2) {
    // Giant Skeleton: a big cracked tomb with a bony hand reaching out of it
    k.slab(1.4, 0.75, 2.2, stone, 0, 0.68, 0.2, { tw: 0.92, td: 0.95 });
    k.slab(1.55, 0.18, 2.35, tone(stone, 0.9), 0, 1.14, 0.2, { tw: 0.85, td: 0.9 });
    for (const [x, z, ry] of [[0.1, -0.2, 0.5], [0.3, 0.3, -0.4], [0.15, 0.75, 0.6]]) k.box(0.06, 0.22, 0.55, 0x1a1a1a, x, 1.15, z, { ry });
    k.box(0.08, 0.4, 0.04, 0x1a1a1a, 0.71, 0.75, 0.4, { rz: 0.4 });
    const bone = 0xe8e4d0;
    k.tube([[-0.25, 1.1, 0.9], [-0.35, 1.5, 1.05], [-0.45, 1.95, 1.0]], 0.08, bone, { sides: 6 });
    k.box(0.32, 0.12, 0.26, bone, -0.45, 2.02, 1.0, { r: 0.04 });
    for (let i = 0; i < 4; i++) k.cyl(0.035, 0.28, bone, -0.57 + i * 0.08, 2.2, 1.0 + (i - 1.5) * 0.03, { seg: 4, rz: (i - 1.5) * 0.15 });
  }
  if (level >= 3) {
    // Fallen Warriors: a crypt at the back with a pointed roof, columns and glowing windows
    const cz = -1.4;
    k.box(2.4, 2.0, 1.2, stone, 0, 1.3, cz, { r: 0.04 });
    k.box(2.6, 0.2, 1.4, tone(stone, 0.85), 0, 0.4, cz);
    k.prism([[-1.35, 0], [1.35, 0], [0, 0.85]], 1.5, 0x37474f, 0, 2.38, cz, { ry: PI / 2 });
    k.box(2.85, 0.14, 1.6, tone(stone, 0.8), 0, 2.32, cz);
    k.box(0.12, 0.6, 0.12, 0x616161, 0, 3.5, cz + 0.4);
    k.box(0.4, 0.12, 0.12, 0x616161, 0, 3.6, cz + 0.4);
    for (const sx of [-1, 1]) {
      k.cyl(0.14, 1.8, tone(stone, 1.1), sx * 0.55, 1.2, cz + 0.68, { seg: 10 });
      k.box(0.36, 0.14, 0.36, tone(stone, 0.9), sx * 0.55, 2.15, cz + 0.68);
      k.box(0.36, 0.5, 0.05, green, sx * 0.95, 1.5, cz + 0.62);
      k.cyl(0.18, 0.05, green, sx * 0.95, 1.75, cz + 0.62, { axis: 'z', seg: 10 });
    }
    k.box(0.75, 1.35, 0.06, 0x263238, 0, 1.0, cz + 0.62);
    for (const y of [0.6, 1.3]) k.box(0.8, 0.07, 0.04, 0x1a1a1a, 0, y, cz + 0.66);
    k.box(0.1, 0.1, 0.06, green, 0.25, 0.95, cz + 0.68); // keyhole glow
    // A sword stuck in the ground
    k.box(0.12, 1.4, 0.04, 0xb0bec5, 1.6, 0.95, 1.55, { rz: 0.08 });
    k.box(0.55, 0.1, 0.1, 0x5d4037, 1.63, 1.6, 1.55, { rz: 0.08 });
    k.cyl(0.05, 0.35, 0x3e2723, 1.65, 1.82, 1.55, { seg: 6, rz: 0.08 });
    k.ball(0.07, GOLD, 1.67, 2.02, 1.55, { seg: 6, rows: 4 });
  }
  if (level >= 4) {
    // Return of the King: a dead tree, and a crowned skull with glowing eyes over the crypt
    const bark = 0x3e2723;
    k.tube([[-1.6, 0.3, 1.4], [-1.55, 1.6, 1.38], [-1.7, 2.8, 1.45], [-1.6, 3.8, 1.4]], 0.18, bark, { sides: 7 });
    k.tube([[-1.6, 2.4, 1.4], [-1.1, 3.0, 1.3], [-0.7, 3.6, 1.4]], 0.08, bark, { sides: 5 });
    k.tube([[-1.65, 3.0, 1.45], [-2.0, 3.6, 1.3], [-2.0, 4.1, 1.5]], 0.07, bark, { sides: 5 });
    k.tube([[-1.6, 3.6, 1.4], [-1.3, 4.2, 1.6]], 0.05, bark, { sides: 4 });
    for (const sx of [-1, 1]) k.tube([[-1.6, 0.35, 1.4], [-1.6 + sx * 0.4, 0.3, 1.4 + sx * 0.2]], 0.07, bark, { sides: 4 }); // roots
    const sz = -1.4;
    k.ball(0.55, 0xe8e4d0, 0, 3.65, sz, { sy: 0.95, seg: 12, rows: 8 });
    k.box(0.6, 0.3, 0.5, 0xe8e4d0, 0, 3.2, sz + 0.15, { r: 0.08 });
    for (let i = 0; i < 4; i++) k.box(0.08, 0.1, 0.04, 0x9e9a88, -0.18 + i * 0.12, 3.22, sz + 0.41);
    for (const sx of [-1, 1]) {
      k.ball(0.15, 0x111111, sx * 0.2, 3.7, sz + 0.42, { sz: 0.4, seg: 8, rows: 5 });
      k.ball(0.07, green, sx * 0.2, 3.7, sz + 0.47, { seg: 6, rows: 4 });
    }
    k.cyl(0.06, 0.1, 0x111111, 0, 3.5, sz + 0.5, { seg: 3, rx: PI / 2 });
    k.cyl(0.48, 0.22, GOLD, 0, 4.2, sz, { seg: 16, open: false });
    const gem = glowMat(u, 0xff1744);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      k.cyl(0.08, 0.32, GOLD, Math.cos(a) * 0.45, 4.45, sz + Math.sin(a) * 0.45, { r2: 0.0, seg: 4 });
      if (i % 2 === 0) k.ball(0.06, gem, Math.cos(a) * 0.49, 4.2, sz + Math.sin(a) * 0.49, { seg: 6, rows: 4 });
    }
  }
  k.done();
  return u;
}

// ------------------------------------------------------------------ Elf Camp

/** A snowman at (x, z) on ground y: three snowballs, coal eyes, a carrot, a top hat, stick arms, a scarf. */
function snowman(k, x, y, z) {
  k.ball(0.48, SNOW, x, y + 0.42, z, { seg: 12, rows: 8 });
  k.ball(0.35, SNOW, x, y + 1.08, z, { seg: 12, rows: 8 });
  k.ball(0.26, SNOW, x, y + 1.58, z, { seg: 12, rows: 8 });
  for (const sx of [-1, 1]) k.ball(0.04, 0x111111, x + sx * 0.09, y + 1.65, z + 0.23, { seg: 5, rows: 4 });
  for (const f of [0.95, 1.12, 1.28]) k.ball(0.04, 0x111111, x, y + f, z + 0.34 - (f - 1.1) * 0.15, { seg: 5, rows: 4 });
  k.cyl(0.05, 0.3, 0xff7043, x, y + 1.57, z + 0.36, { axis: 'z', r2: 0.0, seg: 6 });
  k.cyl(0.3, 0.04, 0x111111, x, y + 1.8, z, { seg: 12 });
  k.cyl(0.2, 0.32, 0x111111, x, y + 1.97, z, { seg: 12 });
  k.cyl(0.205, 0.07, 0xc62828, x, y + 1.86, z, { seg: 12 });
  k.torus(0.25, 0.07, 0xc62828, x, y + 1.36, z, { rx: PI / 2, seg: 12 });
  k.box(0.12, 0.35, 0.06, 0xc62828, x + 0.12, y + 1.2, z + 0.25, { rz: 0.2 });
  for (const sx of [-1, 1]) k.tube([[x + sx * 0.3, y + 1.15, z], [x + sx * 0.65, y + 1.4, z], [x + sx * 0.78, y + 1.55, z + 0.05]], 0.025, 0x4e342e, { sides: 4 });
}

/** A wrapped present at (x, y, z) with size s: box, ribbon cross and a bow. */
function gift(k, x, y, z, s, col, ribbon, ry = 0) {
  k.box(s, s, s, col, x, y + s / 2, z, { r: 0.03, ry });
  k.box(s + 0.02, s + 0.02, 0.1, ribbon, x, y + s / 2, z, { ry });
  k.box(0.1, s + 0.02, s + 0.02, ribbon, x, y + s / 2, z, { ry });
  for (const sx of [-1, 1]) k.torus(0.1, 0.035, ribbon, x + sx * 0.08 * Math.cos(ry), y + s + 0.08, z - sx * 0.08 * Math.sin(ry), { ry: ry + PI / 2, seg: 8 });
}

/** A candy cane at (x, z) on ground y, h tall, with red stripes and a hook. */
function candyCane(k, x, y, z, h) {
  k.cyl(0.08, h, 0xfafafa, x, y + h / 2, z, { seg: 8 });
  for (let i = 0; i < Math.round(h / 0.22); i++) k.cyl(0.085, 0.07, 0xd50000, x, y + 0.1 + i * 0.22, z, { seg: 8, rz: 0.4 });
  k.torus(0.18, 0.08, 0xfafafa, x + 0.18, y + h, z, { arc: PI, seg: 10 });
  k.torus(0.18, 0.085, 0xd50000, x + 0.18, y + h, z, { arc: PI * 0.3, seg: 6 });
}

/**
 * Elf Camp (event). Lv 1 a striped tent; Lv 2 a log cabin, snow fort and snowman; Lv 3 a workshop
 * with a red roof and a toy cannon; Lv 4 a gingerbread cookie factory with a smoking chimney and a
 * lookout; Lv 5 a red and gold toy fortress with towers, a present mountain, lights and a star.
 */
export function makeElfCamp(level) {
  const u = makeThing();
  const warm = glowMat(u, 0xffe082);
  const k = kit(u, u.body, `elfCamp${level}`);
  k.slab(4.6, 0.3, 4.6, level >= 4 ? 0xe3f2fd : SNOW, 0, 0.15, 0, { tw: 0.97, td: 0.97 });
  for (const [x, z, s] of [[-2.0, -1.9, 0.6], [2.05, -0.2, 0.45], [-2.1, 0.6, 0.4], [0.4, 2.1, 0.35]]) k.ball(s, SNOW, x, 0.3, z, { sy: 0.35, seg: 10, rows: 6 }); // drifts
  if (level === 0) {
    // A striped tent: red and green panels on an A-frame with a gold ridge pole and a lantern
    const n = 6;
    for (let i = 0; i < n; i++) k.prism([[-1.0, 0], [1.0, 0], [0, 1.9]], 2.6 / n, i % 2 ? 0x2e7d32 : 0xc62828, 0, 0.3, -0.4 - 1.3 + (i + 0.5) * (2.6 / n), { ry: PI / 2 });
    k.cyl(0.06, 3.0, GOLD, 0, 2.22, -0.4, { axis: 'z', seg: 8 });
    k.prism([[-0.4, 0], [0.4, 0], [0, 1.15]], 0.05, 0x3e2723, 0, 0.3, 0.92, { ry: PI / 2 });
    k.cyl(0.07, 1.1, 0xc62828, 0.38, 0.75, 0.97, { seg: 6, rz: -0.35 });
    k.cyl(0.04, 0.4, DARK, 0.9, 1.2, 1.1, { seg: 6 });
    k.box(0.18, 0.24, 0.18, warm, 0.9, 1.0, 1.1, { r: 0.04 });
    // Campfire: a stone ring, crossed logs and a flame
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * PI * 2;
      k.ball(0.12, 0x757575, 1.3 + Math.cos(a) * 0.35, 0.34, 1.4 + Math.sin(a) * 0.35, { sy: 0.7, seg: 6, rows: 4 });
    }
    for (const ry of [0.4, -0.6]) k.cyl(0.07, 0.6, WOOD, 1.3, 0.4, 1.4, { axis: 'x', seg: 6, ry });
    k.cyl(0.18, 0.45, glowMat(u, 0xff9100), 1.3, 0.62, 1.4, { r2: 0, seg: 6 });
  } else if (level <= 2) {
    // A log cabin with a snowy (Lv 3: red) roof, a stone chimney and a glowing window
    const logC = level >= 2 ? 0x8d5524 : 0xa1887f;
    const cz = -0.6;
    for (let i = 0; i < 7; i++) {
      const y = 0.45 + i * 0.25;
      k.cyl(0.13, 2.9, tone(logC, i % 2 ? 0.92 : 1), 0, y, cz + 1.0, { axis: 'x', seg: 8 });
      k.cyl(0.13, 2.9, tone(logC, i % 2 ? 0.92 : 1), 0, y, cz - 1.0, { axis: 'x', seg: 8 });
      for (const sx of [-1, 1]) k.cyl(0.13, 2.3, tone(logC, i % 2 ? 1 : 0.92), sx * 1.3, y + 0.12, cz, { axis: 'z', seg: 8 });
    }
    k.prism([[-1.45, 0], [1.45, 0], [0, 0.9]], 2.3, logC, 0, 2.15, cz, { ry: PI / 2 }); // gables front and back
    const roof = level >= 2 ? 0xc62828 : 0x6d4c41;
    for (const sx of [-1, 1]) {
      const a = Math.atan2(0.9, 1.45);
      k.box(1.95, 0.14, 2.7, roof, sx * 0.72, 2.67, cz, { rz: -sx * a });
      k.box(1.9, 0.12, 2.6, SNOW, sx * 0.74, 2.78, cz, { rz: -sx * a });
    }
    k.box(0.75, 1.1, 0.08, 0x4e342e, 0, 0.9, cz + 1.14);
    k.ball(0.05, GOLD, 0.25, 0.9, cz + 1.2, { seg: 6, rows: 4 });
    k.torus(0.18, 0.06, 0x2e7d32, 0, 1.25, cz + 1.2, { seg: 12 }); // wreath
    k.box(0.5, 0.4, 0.06, warm, 0.85, 1.35, cz + 1.14);
    k.box(0.6, 0.05, 0.1, SNOW, 0.85, 1.12, cz + 1.18);
    k.box(0.5, 1.6, 0.5, 0x757575, -0.85, 2.7, cz - 0.4, { r: 0.04 });
    k.box(0.6, 0.12, 0.6, 0x616161, -0.85, 3.52, cz - 0.4);
    for (let i = 0; i < 3; i++) k.ball(0.18 + i * 0.06, 0xcfd8dc, -0.85 + i * 0.12, 3.75 + i * 0.35, cz - 0.4 - i * 0.1, { seg: 8, rows: 5 }); // smoke
  } else {
    // Lv 4: a gingerbread factory. Lv 5: a red and gold toy fortress.
    const fort = level >= 4;
    const wall = fort ? 0xb71c1c : 0xa0522d;
    const trim = fort ? GOLD : SNOW;
    const cz = -0.8;
    k.box(3.4, 2.6, 2.4, wall, 0, 1.6, cz, { r: 0.08 });
    k.box(3.6, 0.3, 2.6, trim, 0, 3.0, cz, { r: 0.06 });
    if (fort) for (let i = 0; i < 5; i++) k.box(0.4, 0.4, 0.35, trim, -1.5 + i * 0.75, 3.35, cz + 1.12); // battlements
    else {
      // Icing drips along the roof edge and gumdrops on top
      for (let i = 0; i < 9; i++) k.box(0.18, 0.2 + (i % 3) * 0.08, 0.06, SNOW, -1.6 + i * 0.4, 2.75 - (i % 3) * 0.04, cz + 1.22, { r: 0.05 });
      const gum = [0xff1744, 0x00e676, 0xffea00, 0x2979ff, 0xd500f9];
      for (let i = 0; i < 5; i++) k.ball(0.18, gum[i], -1.4 + i * 0.7, 3.2, cz + 0.9, { sy: 0.8, seg: 8, rows: 5 });
      for (let i = 0; i < 4; i++) k.cyl(0.14, 0.04, i % 2 ? 0xfafafa : 0xff1744, -1.2 + i * 0.8, 2.0, cz + 1.21, { axis: 'z', seg: 10 }); // candy buttons
    }
    k.box(1.0, 1.4, 0.08, 0x4e342e, 0, 1.0, cz + 1.2);
    k.cyl(0.5, 0.08, 0x4e342e, 0, 1.7, cz + 1.2, { axis: 'z', seg: 14 });
    for (const sx of [-1, 1]) {
      k.box(0.6, 0.6, 0.06, warm, sx * 1.1, 1.8, cz + 1.2);
      k.box(0.7, 0.08, 0.1, trim, sx * 1.1, 1.45, cz + 1.24);
      k.box(0.05, 0.6, 0.08, trim, sx * 1.1, 1.8, cz + 1.24);
    }
    k.box(0.7, 1.6, 0.7, 0x5d4037, 1.1, 3.8, cz - 0.6, { r: 0.04 });
    k.box(0.8, 0.15, 0.8, tone(0x5d4037, 0.8), 1.1, 4.6, cz - 0.6);
    k.box(0.5, 0.15, 0.5, glowMat(u, 0xff9100), 1.1, 4.62, cz - 0.6);
    for (let i = 0; i < 3; i++) k.ball(0.2 + i * 0.08, 0xcfd8dc, 1.1 + i * 0.15, 5.0 + i * 0.4, cz - 0.7 - i * 0.1, { seg: 8, rows: 5 });
    if (fort) {
      for (const sx of [-1, 1]) {
        const x = sx * 1.9;
        k.cyl(0.55, 4.4, 0xc62828, x, 2.5, cz - 0.8, { seg: 16 });
        k.torus(0.56, 0.06, GOLD, x, 1.2, cz - 0.8, { rx: PI / 2, seg: 16 });
        k.cyl(0.68, 0.25, GOLD, x, 4.75, cz - 0.8, { seg: 16 });
        k.cyl(0.66, 1.1, 0x2e7d32, x, 5.4, cz - 0.8, { r2: 0, seg: 16 });
        k.ball(0.12, GOLD, x, 6.0, cz - 0.8, { seg: 8, rows: 5 });
        k.box(0.3, 0.45, 0.06, warm, x, 3.3, cz - 0.25);
      }
      k.cyl(0.07, 2.0, GOLD, 0, 4.2, cz, { seg: 8 });
      standingStar(k, 0, 5.4, cz, 0.6, glowMat(u, 0xffea00), 0.14);
    } else {
      // Lookout post: a ladder up to a little platform with a rail
      for (const sx of [-1, 1]) k.cyl(0.08, 3.0, 0x8d5524, -1.9 + sx * 0.3, 1.8, 1.6, { seg: 6 });
      for (let i = 0; i < 6; i++) k.cyl(0.04, 0.6, 0x8d5524, -1.9, 0.6 + i * 0.4, 1.6, { axis: 'x', seg: 5 });
      k.box(1.0, 0.12, 1.0, 0x8d5524, -1.9, 3.3, 1.6);
      for (const [x, z] of [[-2.35, 1.15], [-1.45, 1.15], [-2.35, 2.05], [-1.45, 2.05]]) k.cyl(0.04, 0.5, 0x8d5524, x, 3.6, z, { seg: 5 });
      k.box(1.0, 0.06, 0.06, 0x8d5524, -1.9, 3.82, 2.05);
      candyCane(k, 1.9, 0.3, -1.9, 1.6);
      candyCane(k, -1.9, 0.3, -1.9, 1.3);
    }
  }
  if (level >= 1) {
    // Snow fort wall and a snowman
    if (level < 4) for (let i = 0; i < 4; i++) k.box(0.55, 0.5, 0.55, i % 2 ? SNOW : tone(SNOW, 0.95), -1.0 + i * 0.6, 0.55, 1.9, { r: 0.12 });
    snowman(k, 1.8, 0.3, 1.0);
  }
  if (level >= 2) {
    // A toy cannon (Lv 4+: two) on red wheels
    for (const x of level >= 3 ? [-1.85, -0.85] : [-1.85]) {
      k.box(0.5, 0.3, 0.8, 0x5d4037, x, 0.6, 0.95, { r: 0.04 });
      for (const sx of [-1, 1]) {
        k.cyl(0.3, 0.08, 0xc62828, x + sx * 0.3, 0.6, 0.95, { axis: 'x', seg: 12 });
        k.cyl(0.08, 0.1, GOLD, x + sx * 0.33, 0.6, 0.95, { axis: 'x', seg: 8 });
      }
      k.cyl(0.18, 1.1, level >= 3 ? GOLD : 0x37474f, x, 0.9, 1.25, { axis: 'z', r2: 0.15, seg: 12, rx: -0.3 });
      k.torus(0.18, 0.04, level >= 3 ? 0xc62828 : GOLD, x, 1.04, 1.75, { rx: -0.3, seg: 12 });
    }
  }
  if (level >= 4) {
    // A mountain of presents and a string of Christmas lights
    gift(k, -1.45, 0.3, 0.15, 0.85, 0x1e88e5, 0xffeb3b, 0.3);
    gift(k, 1.6, 0.3, 0.35, 0.75, 0x43a047, 0xfafafa, -0.2);
    gift(k, -1.55, 1.15, 0.15, 0.55, 0xd500f9, 0xffd54f, -0.4);
    gift(k, 1.45, 1.05, 0.4, 0.5, 0xffd54f, 0xc62828, 0.5);
    const pts = [];
    for (let i = 0; i <= 8; i++) pts.push([-1.7 + i * 0.425, 2.72 - Math.sin((i / 8) * PI * 4) * 0.08 - 0.06, 0.45]);
    k.tube(pts, 0.02, 0x1b5e20, { sides: 3 });
    const bulbs = [0xff1744, 0x00e676, 0xffea00, 0x2979ff].map((c) => glowMat(u, c));
    for (let i = 0; i <= 8; i++) k.ball(0.09, bulbs[i % 4], pts[i][0], pts[i][1] - 0.08, 0.45, { sy: 1.3, seg: 6, rows: 4 });
  }
  k.done();
  gunMuzzle(u, u.body, 0, 1.0, 0.6);
  u.tracer = 0xffffff;
  return u;
}

// ------------------------------------------------------------------ Relic

/**
 * Relic (event). An ancient stone shrine with a floating relic crystal: Lv 1 a cracked altar,
 * Lv 2 bronze shields, Lv 3 pillars and banners (Knights), Lv 4 a warden statue, Lv 5 a golden
 * temple, and Lv 6 a blazing sanctum with a huge orange crystal, braziers and a ring of fire runes.
 */
export function makeRelic(level) {
  const u = makeThing();
  const stone = level >= 4 ? 0xd7ccc8 : 0x9e9e8e;
  const dark = 0x5d5a48;
  const color = level >= 5 ? 0xff6d00 : level >= 4 ? 0xffd740 : 0x40c4ff;
  const shine = glowMat(u, color);
  const k = kit(u, u.body, `relic${level}`);
  // Stepped platform with stairs at the front
  k.slab(4.4, 0.3, 4.4, dark, 0, 0.15, 0, { tw: 0.97, td: 0.97 });
  k.slab(3.6, 0.25, 3.6, tone(dark, 1.15), 0, 0.42, 0, { tw: 0.97, td: 0.97 });
  for (let i = 0; i < 3; i++) k.box(1.4, 0.18, 0.3, tone(dark, 1.1 + i * 0.05), 0, 0.09 + i * 0.18, 2.0 - i * 0.22);
  // Altar: a tapered block with a carved band, runes and a cracked top
  k.slab(2.4, 1.3, 2.4, stone, 0, 1.2, 0, { tw: 0.82, td: 0.82 });
  k.box(2.2, 0.16, 2.2, tone(stone, 0.8), 0, 1.1, 0);
  k.slab(2.2, 0.22, 2.2, tone(stone, 1.08), 0, 1.96, 0, { tw: 0.92, td: 0.92 });
  for (const ry of [0, PI / 2, PI, PI * 1.5]) {
    const nx = Math.sin(ry);
    const nz = Math.cos(ry);
    for (const f of [-0.45, 0, 0.45]) k.box(0.16, 0.22, 0.04, shine, nx * 1.02 + nz * f, 1.45, nz * 1.02 - nx * f, { ry });
  }
  k.box(0.05, 0.05, 1.2, 0x2a2a20, 0.3, 2.08, 0.1, { ry: 0.5 }); // crack
  if (level >= 1) {
    // Armor: round bronze shields with a boss on each side of the altar
    for (const sx of [-1, 1]) {
      k.cyl(0.55, 0.1, 0x8d6e63, sx * 1.12, 1.35, 0, { axis: 'x', seg: 16 });
      k.torus(0.55, 0.05, GOLD, sx * 1.17, 1.35, 0, { ry: PI / 2, seg: 16 });
      k.ball(0.14, GOLD, sx * 1.18, 1.35, 0, { seg: 8, rows: 5 });
    }
  }
  if (level >= 2) {
    // Knights: four columns with capitals, and red banners hung between the front pair
    for (const [x, z] of [[-1.75, -1.75], [1.75, -1.75], [-1.75, 1.75], [1.75, 1.75]]) {
      k.box(0.7, 0.25, 0.7, tone(stone, 0.9), x, 0.67, z);
      k.cyl(0.26, 3.0, stone, x, 2.3, z, { seg: 12, r2: 0.22 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * PI * 2;
        k.box(0.04, 2.8, 0.06, tone(stone, 0.85), x + Math.cos(a) * 0.24, 2.3, z + Math.sin(a) * 0.24, { ry: -a }); // flutes
      }
      k.box(0.7, 0.25, 0.7, tone(stone, 0.9), x, 3.92, z);
      if (level >= 4) k.box(0.8, 0.12, 0.8, GOLD, x, 4.1, z);
    }
    for (const sx of [-1, 1]) {
      k.cyl(0.04, 1.2, GOLD, sx * 1.75, 3.35, 1.3, { axis: 'z', seg: 6 });
      k.box(0.06, 1.5, 0.9, 0xc62828, sx * 1.75, 2.55, 1.3);
      k.box(0.07, 0.1, 0.9, GOLD, sx * 1.75, 1.85, 1.3);
      k.box(0.07, 0.35, 0.35, GOLD, sx * 1.75, 2.75, 1.3, { rx: PI / 4 }); // emblem
    }
  }
  if (level >= 3) {
    // Warden: a hooded stone statue holding a sword, behind the altar
    const sc = tone(dark, 1.2);
    k.box(1.0, 0.5, 0.8, tone(stone, 0.85), 0, 0.8, -1.55);
    k.slab(0.95, 2.0, 0.6, sc, 0, 2.05, -1.55, { tw: 0.65, td: 0.8 });
    k.ball(0.32, sc, 0, 3.3, -1.55, { seg: 10, rows: 7 });
    k.slab(0.75, 0.5, 0.65, tone(sc, 0.85), 0, 3.42, -1.6, { tw: 0.4, td: 0.5, tz: -0.08 }); // hood
    k.box(0.4, 0.12, 0.05, shine, 0, 3.3, -1.27); // eyes
    k.box(0.12, 2.4, 0.08, 0x90a4ae, 0, 1.9, -1.15);
    k.box(0.6, 0.12, 0.14, sc, 0, 3.0, -1.15);
    k.cyl(0.06, 0.3, sc, 0, 3.2, -1.15, { seg: 6 });
  }
  if (level >= 4) {
    // Relic Army: a golden temple frame and a stepped gold roof crown above the pillars
    for (const sx of [-1, 1]) {
      k.box(4.1, 0.3, 0.6, GOLD, 0, 4.3, sx * 1.75);
      k.box(0.6, 0.3, 4.1, GOLD, sx * 1.75, 4.3, 0);
    }
    for (let i = 0; i < 3; i++) {
      const s = 3.2 - i * 0.9;
      for (const sx of [-1, 1]) {
        k.box(s, 0.18, 0.18, tone(GOLD, 0.9 + i * 0.05), 0, 4.55 + i * 0.22, sx * s / 2);
        k.box(0.18, 0.18, s, tone(GOLD, 0.9 + i * 0.05), sx * s / 2, 4.55 + i * 0.22, 0);
      }
    }
  }
  if (level >= 5) {
    // Overseer & Seraph: a ring of fire runes on the ground and braziers on the front columns
    const rune = glowMat(u, 0xff9100);
    const fire = glowMat(u, 0xff6d00);
    const core = glowMat(u, 0xffea00);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2;
      k.box(0.36, 0.06, 0.18, rune, Math.cos(a) * 2.05, 0.57, Math.sin(a) * 2.05, { ry: -a });
    }
    for (const [x, z] of [[-1.75, 1.75], [1.75, 1.75]]) {
      k.cyl(0.32, 0.25, 0x3e2723, x, 4.6, z, { r2: 0.4, seg: 12 });
      k.cyl(0.3, 0.6, fire, x, 5.0, z, { r2: 0, seg: 7 });
      k.cyl(0.16, 0.45, core, x, 5.0, z, { r2: 0, seg: 6 });
    }
  }
  // The relic crystal: floating over the altar inside a glowing halo, with little shards around it
  const size = 0.9 + level * 0.15;
  const cy = 2.4 + level * 0.1;
  crystal(k, 0, cy, 0, size * 0.55, size * 1.8, shine);
  k.torus(size * 0.75, 0.04, shine, 0, cy + size * 0.75, 0, { rx: PI / 2 - 0.25, seg: 24 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2 + 0.4;
    crystal(k, Math.cos(a) * size * 1.0, cy + 0.4 + i * 0.25, Math.sin(a) * size * 1.0, 0.1, 0.36, shine);
  }
  k.done();
  gunMuzzle(u, u.body, 0, cy + size * 0.8, 0);
  u.tracer = color;
  return u;
}
