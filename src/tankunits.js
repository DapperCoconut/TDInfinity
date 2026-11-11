import * as THREE from 'three';
import { PARTS, antenna, barrel, bedroll, bolts, crate, glowMat, hatch, jerry, kit, lamp, louvres, mgun, muzzleAt, periscope, shackle, smoke, star, tone, tracks, turretAt, unitBase } from './vehicles.js';

// Tracked summons (see vehicleunits.js for the wheeled ones): the Patrol tank, Rail Tank,
// Bradley, Abrams / M1X, the Behemoth family and the Void Tank. Each is a hull batch, a turret
// batch, and the moving track parts that `tracks` (vehicles.js) adds.

const { GLASS, STEEL, GUN, DARK } = PARTS;
const PI = Math.PI;
const RED = 0xc62828;
const AMBER = 0xffa000;
const LINK = 0x2a2c30;

/**
 * Tracks, belly and upper hull with a sloped glacis. `full` widens the hull over the tracks
 * (sponsons); otherwise the top run of the tracks is open with mudguards at both ends.
 * `skirt`: number of side-skirt panels. Returns helpers for placing things on the hull.
 */
export function trackedHull(u, k, parent, o) {
  const { L, x, tw, th, top, P, n = 5, glacis = 0.28, belt, full = false, skirt = 0 } = o;
  const hub = o.hub ?? tone(P, 0.8);
  const PD = tone(P, 0.72);
  const h2 = L / 2;
  const wi = x - tw / 2 - 0.05; // half width between the tracks
  const wo = x + tw / 2 + 0.08; // half width over the tracks
  tracks(u, k, parent, { x, len: L + 0.3, h: th, w: tw, n, hub, belt });
  k.box(wi * 2, th * 0.5, L * 0.84, tone(P, 0.5), 0, th * 0.6, 0); // belly
  const zg = h2 - L * glacis; // where the glacis starts
  k.prism([[-h2, th * 0.72], [-h2 + 0.1, top], [zg, top], [h2 - 0.1, th], [h2, th * 0.72], [h2 - 0.45, th * 0.42], [-h2 + 0.35, th * 0.42]], wi * 2 + 0.06, P, 0, 0, 0, { bevel: 0.04 });
  const ga = Math.atan2(top - th, h2 - 0.1 - zg);
  /** [y, z] of a point `f` of the way down the glacis, lifted `up` off its surface. */
  const gp = (f, up = 0) => [top + (th - top) * f + up * Math.cos(ga), zg + (h2 - 0.1 - zg) * f + up * Math.sin(ga)];
  if (full) {
    const y0 = th + 0.1;
    const zs = zg + ((h2 - 0.1 - zg) * (top - y0)) / (top - th);
    k.prism([[-h2, y0], [-h2 + 0.08, top], [zg, top], [zs, y0]], wo * 2, P, 0, 0, 0, { bevel: 0.05 }); // sponsons
    for (const s of [-1, 1]) k.box(tw + 0.16, 0.06, 0.6, PD, s * x, th + 0.02, h2 + 0.1, { rx: 0.55 }); // front mudflaps
  } else {
    for (const s of [-1, 1]) {
      k.box(tw * 0.4, 0.06, L * 0.92, PD, s * (wi + tw * 0.2), th + 0.14, 0); // fender strip
      k.box(tw + 0.12, 0.06, 0.8, PD, s * x, th + 0.14, h2 - 0.25); // mudguards
      k.box(tw + 0.12, 0.06, 0.5, PD, s * x, th - 0.01, h2 + 0.36, { rx: 0.65 });
      k.box(tw + 0.12, 0.06, 0.7, PD, s * x, th + 0.14, -h2 + 0.2);
      k.box(tw + 0.12, 0.06, 0.4, PD, s * x, th + 0.02, -h2 - 0.3, { rx: -0.65 });
    }
  }
  if (skirt) {
    const pl = (L + 0.1) / skirt;
    for (const s of [-1, 1]) for (let i = 0; i < skirt; i++) {
      const z = -h2 - 0.05 + (i + 0.5) * pl;
      k.box(0.1, th * 0.62, pl - 0.06, i % 2 ? PD : tone(P, 0.84), s * (wo + 0.03), th * 0.8, z);
      for (const f of [-0.3, 0.3]) k.box(0.05, 0.09, 0.09, tone(P, 0.5), s * (wo + 0.09), th * 1.02, z + f * pl);
    }
  }
  for (const s of [-1, 1]) {
    const [y, z] = gp(0.5, 0.17);
    lamp(k, s * (wi - 0.32), y, z, 0.15);
    k.torus(0.25, 0.028, PD, s * (wi - 0.32), y, z + 0.1, { seg: 8 }); // lamp guard
    shackle(k, s * (wi - 0.5), th * 0.6, h2 + 0.02, 1);
    shackle(k, s * (wi - 0.5), th * 0.62, -h2 - 0.02, -1);
    k.box(0.2, 0.12, 0.06, s < 0 ? RED : AMBER, s * (wi - 0.2), th * 0.92, -h2 - 0.02); // tail lights
  }
  return { gp, ga, wi, wo, zg, h2, PD };
}

/** A row of spare track links lying on the glacis. */
export function spareLinks(k, H, f, x0, n, w = 0.36) {
  const [y, z] = H.gp(f, 0.04);
  for (let i = 0; i < n; i++) k.box(w - 0.05, 0.07, 0.24, LINK, x0 + i * w, y, z, { rx: H.ga });
}

/** A stowage rack of bent tube on the back of a turret, with kit lashed into it. */
export function bustle(g, w, y, z, d, col, P) {
  for (const h of [0, 0.36]) g.tube([[-w, y + h, z + 0.1], [-w, y + h, z - d], [w, y + h, z - d], [w, y + h, z + 0.1]], 0.035, col, { tension: 0.02, seg: 12 });
  for (const x of [-w, -w / 3, w / 3, w]) g.cyl(0.03, 0.4, col, x, y + 0.18, z - d, { seg: 5 });
  g.box(w * 2, 0.04, d, col, 0, y - 0.02, z - d / 2);
  bedroll(g, -w * 0.3, y + 0.2, z - d * 0.62, w * 1.1, 0.17);
  crate(g, w * 0.55, y + 0.17, z - d * 0.5, w * 0.6, 0.3, d * 0.7, tone(P, 0.82));
}

/** A commander's cupola with a hatch, vision blocks, and optionally a pintle machine gun (returns its muzzle point). */
export function cupola(g, x, y, z, r, col, mg = 0) {
  g.cyl(r, 0.26, col, x, y + 0.13, z, { seg: 12 });
  hatch(g, x, y + 0.26, z, r * 0.84, col);
  for (let i = 0; i < 5; i++) {
    const a = ((i - 2) * PI) / 3.4;
    g.box(0.2, 0.1, 0.05, 0x6fb7e6, x + Math.sin(a) * r, y + 0.17, z + Math.cos(a) * r, { ry: a });
  }
  if (!mg) return null;
  g.cyl(0.04, 0.4, GUN, x, y + 0.45, z + r * 0.85, { seg: 5 });
  mgun(g, x, y + 0.7, z + r * 0.5, mg);
  return [x, y + 0.72, z + r * 0.5 + mg];
}

// ------------------------------------------------------------------ Patrol tank

/** The Patrol's tank: a medium tank with a cast turret, long gun and a cupola machine gun. */
function tank() {
  const u = unitBase();
  const P = 0x556b2f;
  const PD = tone(P, 0.74);
  const L = 5.4;
  const th = 1.25;
  const top = 1.92;
  const k = kit(u, u.body, 'tank:b');
  const H = trackedHull(u, k, u.body, { L, x: 1.8, tw: 0.8, th, top, P, n: 5 });
  // glacis: driver's hood, bow gun, spare links, star
  let [y, z] = H.gp(0.3, 0.1);
  k.box(0.66, 0.26, 0.5, PD, -0.62, y, z, { rx: H.ga, r: 0.05 });
  k.box(0.44, 0.09, 0.04, 0x6fb7e6, -0.62, y + 0.03, z + 0.26, { rx: H.ga });
  [y, z] = H.gp(0.35, 0.05);
  k.ball(0.2, PD, 0.7, y, z, { seg: 8, rows: 6 });
  k.cyl(0.05, 0.6, GUN, 0.7, y - 0.06, z + 0.32, { axis: 'z', seg: 6, rx: 0.2 });
  spareLinks(k, H, 0.82, -0.9, 6);
  // deck: engine louvres, filler caps, tow cable, tools, fuel drums
  louvres(k, 0, top + 0.02, -2.1, 2.0, 0.9, 6);
  for (const s of [-1, 1]) {
    k.cyl(0.12, 0.06, PD, s * 0.75, top + 0.03, -1.45, { seg: 8 });
    k.cyl(0.11, 0.55, 0x3a2c22, s * 0.7, top - 0.3, -L / 2 - 0.22, { axis: 'z', seg: 8 }); // exhausts
    k.cyl(0.07, 0.04, 0x0e0f10, s * 0.7, top - 0.3, -L / 2 - 0.5, { axis: 'z', seg: 8 });
  }
  k.cyl(0.3, 2.2, PD, 0, top - 0.55, -L / 2 - 0.36, { axis: 'x', seg: 10 }); // fuel drum across the tail
  for (const x of [-0.7, 0.7]) k.cyl(0.32, 0.07, DARK, x, top - 0.55, -L / 2 - 0.36, { axis: 'x', seg: 10 });
  k.tube([[-1.2, top + 0.05, 1.0], [-1.28, top + 0.05, -0.4], [-1.2, top + 0.05, -1.5], [-0.9, top + 0.05, -1.75]], 0.04, 0x6b6f73, { seg: 14 }); // tow cable
  k.cyl(0.035, 1.4, 0x8d6e4a, 1.22, top + 0.05, -0.2, { axis: 'z', seg: 5 }); // shovel
  k.box(0.26, 0.04, 0.32, 0x33363a, 1.22, top + 0.05, 0.62);
  star(k, 0, ...H.gp(0.42, 0.012), 0.42, 0xf2f2f2, { rx: H.ga });
  k.done();
  const t = turretAt(u, u.body, top, -0.4);
  const g = kit(u, t, 'tank:t');
  g.cyl(1.2, 0.14, PD, 0, 0.07, 0, { seg: 16 }); // ring
  g.plan([[-0.7, 1.3], [0.7, 1.3], [1.25, 0.6], [1.3, -0.7], [0.9, -1.35], [-0.9, -1.35], [-1.3, -0.7], [-1.25, 0.6]], 0.95, P, 0, 0.12, 0, { bevel: 0.2, inset: 0.14 });
  g.box(1.1, 0.62, 0.34, PD, 0, 0.58, 1.3, { r: 0.1 }); // mantlet
  barrel(g, 0, 0.58, 1.4, 2.7, 0.17, 0x3a4520, { sleeve: true, brake: true });
  g.cyl(0.06, 0.5, GUN, 0.36, 0.62, 1.6, { axis: 'z', seg: 6 }); // coax
  lamp(g, -0.72, 0.95, 1.12, 0.15);
  const m = cupola(g, 0.52, 1.07, -0.35, 0.42, PD, 1.5);
  hatch(g, -0.55, 1.07, -0.3, 0.32, PD);
  periscope(g, -0.55, 1.07, 0.35, PD);
  bustle(g, 0.85, 0.42, -1.3, 0.62, DARK, P);
  for (const s of [-1, 1]) {
    smoke(g, s * 1.32, 0.72, 0.25, s, 3);
    star(g, s * 1.3, 0.62, -0.3, 0.3, 0xf2f2f2, { rz: -s * PI / 2, ry: s * 0.05 });
    g.torus(0.09, 0.03, DARK, s * 0.95, 1.1, 0.75, { ry: PI / 2, seg: 8 }); // lifting eyes
  }
  antenna(g, -0.95, 1.07, -1.0, 2.2);
  g.done();
  muzzleAt(u, t, 0, 0.58, 4.15, true);
  muzzleAt(u, t, ...m);
  u.height = 3.8;
  u.tracer = 0xffab40;
  return u;
}

// ------------------------------------------------------------------ Rail Tank

/** Rail Tank: an angular grey tank whose turret is mostly a railgun: twin rails, glowing coils, capacitor banks. */
function railtank() {
  const u = unitBase();
  const P = 0x37474f;
  const PD = tone(P, 0.7);
  const PL = 0x546e7a;
  const G = glowMat(u, 0x40c4ff);
  const L = 6.0;
  const th = 1.3;
  const top = 2.0;
  const k = kit(u, u.body, 'railtank:b');
  const H = trackedHull(u, k, u.body, { L, x: 2.0, tw: 0.9, th, top, P, n: 6, full: true, skirt: 5, hub: 0x455a64 });
  for (const s of [-1, 1]) {
    k.box(0.06, 0.12, L * 0.7, G, s * (H.wo + 0.09), th * 1.18, -0.2); // power line along the skirt
    k.box(0.9, 0.5, 1.5, PD, s * 1.75, top + 0.2, -1.9, { r: 0.06 }); // capacitor housings on the rear sponsons
    for (const z of [-2.35, -1.9, -1.45]) k.cyl(0.2, 0.3, G, s * 1.75, top + 0.5, z, { seg: 8 });
    k.box(0.5, 0.06, 1.2, G, s * 0.9, top + 0.02, 1.0); // deck strips
  }
  louvres(k, 0, top + 0.02, -2.4, 1.8, 0.9, 6);
  let [y, z] = H.gp(0.3, 0.06);
  k.box(1.2, 0.1, 0.5, PD, 0, y, z, { rx: H.ga }); // driver's visor block
  k.box(0.9, 0.06, 0.05, 0x6fb7e6, 0, y + 0.03, z + 0.24, { rx: H.ga });
  [y, z] = H.gp(0.75, 0.04);
  for (const x of [-1.1, -0.55, 0, 0.55, 1.1]) k.box(0.36, 0.08, 0.5, PL, x, y, z, { rx: H.ga }); // armour tiles
  k.done();
  const t = turretAt(u, u.body, top, -0.2);
  const g = kit(u, t, 'railtank:t');
  g.cyl(1.35, 0.16, PD, 0, 0.08, 0, { seg: 16 });
  g.plan([[-0.5, 1.9], [0.5, 1.9], [1.5, 0.3], [1.5, -1.3], [1.0, -1.9], [-1.0, -1.9], [-1.5, -1.3], [-1.5, 0.3]], 1.1, P, 0, 0.14, 0, { bevel: 0.26, inset: 0.2 });
  // the rail gun: two rails with the glowing channel between them
  const zr = 1.5;
  const len = 4.3;
  g.box(1.0, 1.0, 0.7, PD, 0, 0.72, zr + 0.1, { r: 0.08 }); // breech block
  for (const s of [-1, 1]) {
    g.box(0.16, 0.5, len, PL, s * 0.3, 0.72, zr + len / 2); // rails
    g.box(0.1, 0.62, 0.5, PD, s * 0.42, 0.72, zr + len - 0.3);
    for (let i = 0; i < 5; i++) g.box(0.05, 0.74, 0.12, PD, s * 0.4, 0.72, zr + 0.8 + i * 0.7); // cooling fins
  }
  g.box(0.26, 0.2, len - 0.3, G, 0, 0.72, zr + len / 2);
  for (let i = 0; i < 4; i++) g.torus(0.5, 0.06, G, 0, 0.72, zr + 0.7 + i * 1.0, { seg: 12 }); // coils
  // capacitor bank behind, cables forward
  g.box(2.2, 0.7, 0.9, PD, 0, 0.75, -1.7, { r: 0.06 });
  for (const x of [-0.75, -0.25, 0.25, 0.75]) {
    g.cyl(0.19, 0.5, 0x263238, x, 1.3, -1.7, { seg: 8 });
    g.cyl(0.2, 0.1, G, x, 1.3, -1.7, { seg: 8 });
  }
  for (const s of [-1, 1]) {
    g.tube([[s * 0.8, 1.2, -1.5], [s * 0.95, 1.38, -0.5], [s * 0.7, 1.3, 0.9], [s * 0.45, 0.95, 1.5]], 0.07, 0x16181a, { seg: 14 });
    // twin machine gun pods on the cheeks
    g.box(0.5, 0.42, 1.0, PD, s * 1.55, 0.62, 0.5, { r: 0.05 });
    for (const dy of [-0.08, 0.1]) g.cyl(0.05, 1.0, GUN, s * 1.55, 0.62 + dy, 1.4, { axis: 'z', seg: 6 });
    muzzleAt(u, t, s * 1.55, 0.64, 1.9);
  }
  hatch(g, 0.6, 1.24, -0.5, 0.36, PD);
  g.box(0.5, 0.36, 0.5, PD, -0.7, 1.4, 0.1, { r: 0.05 }); // sight head
  g.box(0.34, 0.2, 0.04, G, -0.7, 1.42, 0.36);
  antenna(g, 1.1, 1.24, -1.1, 2.0);
  g.done();
  muzzleAt(u, t, 0, 0.72, zr + len + 0.1, true);
  u.height = 4.2;
  u.tracer = 0x40c4ff;
  return u;
}

// ------------------------------------------------------------------ Bradley

/** Bradley: a tall boxy fighting vehicle with side skirts, a 25mm turret and a TOW launcher box. */
function bradley() {
  const u = unitBase();
  const P = 0x5b6640;
  const PD = 0x4a5434;
  const L = 5.8;
  const th = 1.2;
  const top = 2.25;
  const k = kit(u, u.body, 'bradley:b');
  const H = trackedHull(u, k, u.body, { L, x: 1.85, tw: 0.8, th, top, P, n: 6, full: true, skirt: 6, glacis: 0.36 });
  // glacis: big engine grille on the right, driver's hatch on the left, trim vane
  let [y, z] = H.gp(0.45, 0.03);
  k.box(1.5, 0.06, 1.2, PD, 0.75, y, z, { rx: H.ga });
  for (let i = 0; i < 6; i++) k.box(1.3, 0.04, 0.08, 0x16181a, 0.75, ...H.gp(0.2 + i * 0.1, 0.07), { rx: H.ga });
  [y, z] = H.gp(0.16, 0.05);
  k.cyl(0.4, 0.1, PD, -0.95, y, z, { seg: 12, rx: H.ga });
  for (const a of [-0.5, 0, 0.5]) k.box(0.22, 0.12, 0.05, 0x6fb7e6, -0.95 + a * 0.5, y + 0.1, z + 0.36 - Math.abs(a) * 0.12, { ry: a });
  k.box(3.4, 0.07, 0.9, PD, 0, ...H.gp(0.9, 0.06), { rx: H.ga }); // trim vane
  // rear: ramp with a door, stowage boxes, tail gear
  k.box(2.6, 1.3, 0.1, PD, 0, 1.5, -L / 2 - 0.03);
  k.box(0.8, 0.9, 0.05, tone(P, 0.85), 0.6, 1.5, -L / 2 - 0.1);
  k.box(0.08, 0.22, 0.06, DARK, 0.3, 1.5, -L / 2 - 0.14);
  for (const s of [-1, 1]) {
    crate(k, s * 1.75, top - 0.25, -L / 2 - 0.26, 1.0, 0.6, 0.46, tone(P, 0.85));
    k.box(0.7, 0.08, 2.6, PD, s * 1.85, top + 0.03, -1.3); // roof stowage rail
    for (const zz of [-2.2, -1.5]) jerry(k, s * 1.9, top + 0.38, zz, tone(P, 0.8));
    bolts(k, [s * (H.wo + 0.04), 1.95, -2.6], [s * (H.wo + 0.04), 1.95, 1.2], 9, tone(P, 0.55));
    k.cyl(0.07, 0.1, 0x16181a, s * (H.wo + 0.04), 1.75, -1.2, { axis: 'x', seg: 6 }); // firing ports
    k.cyl(0.07, 0.1, 0x16181a, s * (H.wo + 0.04), 1.75, -2.0, { axis: 'x', seg: 6 });
  }
  hatch(k, 0, top, -2.0, 0.5, PD); // troop hatch
  bedroll(k, 0, top + 0.2, -2.72, 2.0, 0.18);
  antenna(k, -1.5, top, -2.6, 2.4);
  k.done();
  const t = turretAt(u, u.body, top, -0.3);
  const g = kit(u, t, 'bradley:t');
  g.cyl(1.15, 0.14, PD, 0, 0.07, 0, { seg: 16 });
  g.plan([[-0.75, 1.25], [0.75, 1.25], [1.15, 0.5], [1.15, -0.9], [0.8, -1.3], [-0.8, -1.3], [-1.15, -0.9], [-1.15, 0.5]], 0.9, P, 0, 0.12, 0, { bevel: 0.14 });
  g.box(0.7, 0.5, 0.36, PD, -0.25, 0.55, 1.25, { r: 0.06 }); // gun mount
  barrel(g, -0.25, 0.55, 1.35, 2.3, 0.085, GUN, { r2: 0.07 });
  for (let i = 0; i < 4; i++) g.cyl(0.11, 0.1, 0x16181a, -0.25, 0.55, 3.1 + i * 0.16, { axis: 'z', seg: 8 }); // fluted muzzle
  g.cyl(0.05, 0.6, GUN, 0.15, 0.55, 1.6, { axis: 'z', seg: 6 }); // coax
  // TOW launcher: an armoured two-tube box on the left cheek
  g.box(0.62, 0.86, 1.7, PD, 1.46, 0.72, 0.1, { r: 0.05 });
  for (const dy of [-0.2, 0.2]) {
    g.cyl(0.17, 0.08, 0x16181a, 1.46, 0.72 + dy, 0.96, { axis: 'z', seg: 8 });
    g.cyl(0.1, 0.1, 0xd84315, 1.46, 0.72 + dy, 0.98, { axis: 'z', r2: 0.04, seg: 6 });
  }
  g.box(0.14, 0.3, 0.5, DARK, 1.12, 0.6, 0.0); // launcher arm
  // sights, hatches, smoke, stowage
  g.box(0.5, 0.4, 0.6, PD, 0.5, 1.2, 0.5, { r: 0.05 });
  g.box(0.36, 0.22, 0.04, 0x6fb7e6, 0.5, 1.22, 0.81);
  cupola(g, 0.45, 1.02, -0.45, 0.36, PD);
  hatch(g, -0.5, 1.02, -0.4, 0.33, PD);
  for (const s of [-1, 1]) smoke(g, s * 0.85, 0.5, 1.2, s, 2);
  bustle(g, 0.7, 0.4, -1.25, 0.5, DARK, P);
  antenna(g, -0.9, 1.02, -1.0, 2.0);
  g.done();
  muzzleAt(u, t, -0.25, 0.55, 3.75);
  muzzleAt(u, t, 1.46, 0.72, 1.05, true);
  u.height = 4.0;
  u.tracer = 0xffab40;
  return u;
}

// ------------------------------------------------------------------ Abrams and M1X

/** M1 Abrams (desert tan) and the bigger M1X (black-green, reactive armour bricks, green-glowing gun). */
function abrams(model) {
  const u = unitBase();
  const x2 = model === 'm1x';
  const P = x2 ? 0x2e3b2a : 0xc8b58a;
  const PD = x2 ? 0x1f2a1c : 0xa8956b;
  const G = x2 ? glowMat(u, 0x76ff03) : null;
  const S = new THREE.Group();
  S.scale.setScalar(x2 ? 1.14 : 1);
  u.body.add(S);
  const L = 6.6;
  const th = 1.2;
  const top = 1.85;
  const k = kit(u, S, model + ':b');
  const H = trackedHull(u, k, S, { L, x: 2.0, tw: 0.9, th, top, P, n: 7, full: true, skirt: 7, glacis: 0.3, hub: tone(P, 0.75) });
  // glacis: driver's hatch with three periscopes, lifting eyes
  let [y, z] = H.gp(0.12, 0.03);
  k.cyl(0.42, 0.08, PD, 0, y, z, { seg: 12, rx: H.ga });
  for (const a of [-0.6, 0, 0.6]) k.box(0.24, 0.1, 0.05, 0x6fb7e6, a * 0.55, y + 0.07, z + 0.4 - Math.abs(a) * 0.14, { ry: a, rx: H.ga });
  // engine deck: grilles, turbine exhaust, tail stowage
  for (const s of [-1, 1]) {
    louvres(k, s * 0.9, top + 0.02, -2.5, 1.3, 1.1, 6);
    k.box(1.3, 0.05, 0.07, PD, s * 0.9, top + 0.05, -1.9);
    k.box(0.9, 0.5, 0.12, 0x16181a, s * 0.8, 1.4, -L / 2 - 0.02); // exhaust grilles
    for (let i = 0; i < 4; i++) k.box(0.9, 0.04, 0.04, PD, s * 0.8, 1.22 + i * 0.12, -L / 2 - 0.09);
    k.tube([[s * 1.55, top + 0.05, 1.2], [s * 1.62, top + 0.05, 0], [s * 1.55, top + 0.05, -1.4]], 0.035, 0x6b6f73, { seg: 10 }); // tow cables
  }
  spareLinks(k, H, 0.8, -1.25, 8);
  if (x2) {
    for (const s of [-1, 1]) {
      for (let i = 0; i < 9; i++) k.box(0.12, 0.34, 0.6, i % 2 ? 0x3a4a35 : 0x27331f, s * (H.wo + 0.12), 1.05, -3.0 + i * 0.72); // reactive bricks on the skirts
      k.box(0.06, 0.1, L * 0.8, G, s * (H.wo + 0.06), 1.36, 0);
    }
    for (const x of [-1.2, -0.6, 0, 0.6, 1.2]) k.box(0.5, 0.1, 0.5, 0x3a4a35, x, ...H.gp(0.5, 0.05), { rx: H.ga });
  }
  k.done();
  const t = turretAt(u, S, top, -0.4);
  const g = kit(u, t, model + ':t');
  g.cyl(1.4, 0.12, PD, 0, 0.06, 0, { seg: 16 });
  // the wedge: wide flat turret with angled cheeks and a long bustle
  g.plan([[-0.75, 2.2], [0.75, 2.2], [1.8, 0.9], [1.85, -1.5], [1.45, -2.45], [-1.45, -2.45], [-1.85, -1.5], [-1.8, 0.9]], 0.86, P, 0, 0.1, 0, { bevel: 0.16, inset: 0.1 });
  g.box(1.0, 0.6, 0.5, PD, 0, 0.5, 2.15, { r: 0.08 }); // mantlet
  const len = x2 ? 4.6 : 3.9;
  barrel(g, 0, 0.5, 2.3, len, 0.2, x2 ? 0x1a1a1a : 0x8d7b5a, { sleeve: true, evac: 0.52, r2: 0.17 });
  if (x2) {
    for (const f of [0.75, 0.86, 0.97]) g.torus(0.26, 0.05, G, 0, 0.5, 2.3 + len * f, { seg: 10 });
    g.box(0.5, 0.12, 0.04, G, -0.7, 0.62, 1.86, { ry: -0.9 });
    g.box(0.5, 0.12, 0.04, G, 0.7, 0.62, 1.86, { ry: 0.9 });
  }
  g.cyl(0.05, 0.5, GUN, 0.42, 0.52, 2.4, { axis: 'z', seg: 6 }); // coax
  // roof: gunner's sight, commander's independent viewer, cupola with a .50, loader's gun
  g.box(0.55, 0.3, 0.6, PD, 0.7, 1.1, 1.0, { r: 0.05 });
  g.box(0.4, 0.18, 0.04, 0x6fb7e6, 0.7, 1.12, 1.31);
  g.cyl(0.24, 0.6, PD, -0.75, 1.26, 0.7, { seg: 10 });
  g.box(0.24, 0.3, 0.04, x2 ? G : 0x6fb7e6, -0.75, 1.36, 0.93);
  const m = cupola(g, 0.75, 0.96, -0.3, 0.44, PD, 1.6);
  hatch(g, -0.7, 0.96, -0.5, 0.36, PD);
  g.cyl(0.04, 0.3, GUN, -0.7, 1.2, -0.05, { seg: 5 });
  mgun(g, -0.7, 1.4, -0.3, 1.2, { s: 0.8 });
  for (const s of [-1, 1]) {
    g.box(0.9, 0.04, 0.7, PD, s * 0.7, 0.98, -1.75); // blow-out panels
    smoke(g, s * 1.86, 0.55, 0.2, s, 4, tone(P, 0.6));
    g.box(0.1, 0.5, 1.6, tone(P, 0.88), s * 1.9, 0.5, -1.3, { r: 0.03 }); // stowage boxes on the bustle sides
    antenna(g, s * 1.5, 0.96, -2.2, 2.4);
  }
  bustle(g, 1.3, 0.38, -2.45, 0.6, x2 ? 0x101510 : 0x6e6046, P);
  g.cyl(0.03, 0.6, DARK, 0, 1.26, -2.2, { seg: 5 }); // crosswind sensor
  g.cyl(0.07, 0.14, DARK, 0, 1.6, -2.2, { seg: 6 });
  if (x2) for (const s of [-1, 1]) for (let i = 0; i < 4; i++) g.box(0.12, 0.4, 0.5, i % 2 ? 0x3a4a35 : 0x27331f, s * (1.9 - (i > 2 ? 0 : 0)), 0.52, 0.85 - i * 0.56, { ry: 0 });
  g.done();
  muzzleAt(u, t, 0, 0.5, 2.3 + len + 0.1, true);
  muzzleAt(u, t, ...m);
  u.height = 4.0;
  u.tracer = x2 ? 0x76ff03 : 0xffab40;
  return u;
}

// ------------------------------------------------------------------ Behemoths

/**
 * Behemoth Factory tanks. behemoth..behemoth4 and the mammoth: giant tanks with a dozer plow and
 * a huge cannon (two barrels from behemoth4, missile racks on the mammoth). laserbehemoth / 2 / 3:
 * the same hull in white-blue, purple, then black-red with a long laser emitter.
 */
function behemoth(model) {
  const u = unitBase();
  const laser = model.startsWith('laser');
  const mammoth = model === 'mammoth';
  const lv = mammoth ? 5 : Number(model.replace(/\D/g, '')) || (laser ? 1 : 0);
  const s = laser ? 1.35 + lv * 0.1 : mammoth ? 2.0 : 1.3 + lv * 0.1;
  const P = laser ? [0xeceff1, 0x4a148c, 0x1a1a1a][lv - 1] : [0x556b2f, 0x556b2f, 0x607d8b, 0x4e5b31, 0x263238, 0x1c1c1c][lv];
  const PD = laser ? [0x90a4ae, 0x311b92, 0x000000][lv - 1] : tone(P, 0.7);
  const PL = laser ? [0xcfd8dc, 0x6a1fb5, 0x2a2a2a][lv - 1] : lv >= 4 ? [0x37474f, 0x33363a][lv - 4] : tone(P, 1.18);
  const glowCol = laser ? [0x40c4ff, 0xe040fb, 0xff1744][lv - 1] : 0;
  const G = laser ? glowMat(u, glowCol) : null;
  const S = new THREE.Group();
  S.scale.setScalar(s);
  u.body.add(S);
  const L = 7.0;
  const th = 1.5;
  const top = 2.3;
  const k = kit(u, S, model + ':b');
  const armoured = lv >= 2 || laser;
  const H = trackedHull(u, k, S, { L, x: 2.3, tw: 1.1, th, top, P, n: 6, full: true, skirt: armoured ? 6 : 0, glacis: 0.26, hub: tone(P, laser && lv === 1 ? 0.6 : 0.78) });
  // dozer plow: a curved blade on two push arms, with spikes
  const zb = L / 2 + 0.75;
  k.prism([[0, 0.2], [0.3, 0.22], [0.42, 0.8], [0.36, 1.5], [0.56, 2.0], [0.3, 2.0], [0.1, 1.5], [0.02, 0.9]], 5.6, PD, 0, 0, zb, { bevel: 0.06 });
  for (const sx of [-1, 1]) {
    k.box(0.3, 0.3, 1.5, STEEL, sx * 1.5, 0.95, L / 2 + 0.2, { rx: 0.15 }); // push arms
    k.cyl(0.09, 1.2, 0xb0b5ba, sx * 1.5, 1.45, L / 2 + 0.25, { axis: 'z', seg: 6, rx: -0.35 }); // rams
    k.box(0.12, 1.8, 0.5, PD, sx * 2.8, 1.1, zb + 0.15); // blade end plates
  }
  for (const x of [-2.2, -1.1, 0, 1.1, 2.2]) k.cyl(0.2, 0.9, 0xcfd3d6, x, 0.55, zb + 0.75, { axis: 'z', r2: 0.01, seg: 6 }); // spikes
  for (let i = 0; i < 9; i++) k.box(0.6, 0.2, 0.07, i % 2 ? 0x16181a : 0xf9a825, -2.4 + i * 0.6, 1.9, zb + 0.56); // hazard stripe along the top of the blade
  // deck
  let [y, z] = H.gp(0.3, 0.08);
  k.box(1.0, 0.16, 0.6, PD, -0.9, y, z, { rx: H.ga, r: 0.04 }); // driver's hood
  k.box(0.7, 0.08, 0.04, laser ? G : 0x6fb7e6, -0.9, y + 0.02, z + 0.31, { rx: H.ga });
  for (const sx of [-1, 1]) {
    louvres(k, sx * 1.0, top + 0.02, -2.9, 1.5, 1.0, 6);
    crate(k, sx * 2.3, top + 0.2, -2.6, 1.0, 0.4, 1.3, tone(P, 0.85));
    if (lv >= 1) k.box(0.9, 0.1, 2.2, PL, sx * 2.25, top + 0.05, 0.6); // sponson armour
    if (lv >= 3 || laser) {
      // exhaust stacks
      k.cyl(0.17, 1.5, 0x2a2c30, sx * 1.9, top + 0.75, -3.2, { seg: 8 });
      k.cyl(0.21, 0.5, 0x3a3d40, sx * 1.9, top + 1.0, -3.2, { seg: 8 });
      k.box(0.36, 0.04, 0.36, 0x2a2c30, sx * 1.9, top + 1.56, -3.2, { rx: 0.4 });
    } else k.cyl(0.14, 0.7, 0x3a2c22, sx * 0.9, top - 0.4, -L / 2 - 0.3, { axis: 'z', seg: 8 });
    if (laser) {
      k.box(0.07, 0.14, L * 0.8, G, sx * (H.wo + 0.1), th * 1.2, 0); // power lines
      k.box(0.5, 0.06, 1.6, G, sx * 1.1, top + 0.03, 1.2);
    }
    if (armoured) bolts(k, [sx * (H.wo + 0.04), top - 0.2, -3.2], [sx * (H.wo + 0.04), top - 0.2, 1.4], 10, tone(P, 0.5), 0.05);
  }
  if (lv >= 1) spareLinks(k, H, 0.8, -1.3, 8, 0.38);
  k.tube([[-1.7, top + 0.05, 1.5], [-1.8, top + 0.05, 0.2], [-1.7, top + 0.05, -1.6]], 0.045, 0x6b6f73, { seg: 10 });
  k.done();
  const t = turretAt(u, S, top, -0.5);
  const g = kit(u, t, model + ':t');
  g.cyl(1.7, 0.16, PD, 0, 0.08, 0, { seg: 18 });
  g.plan([[-1.0, 2.0], [1.0, 2.0], [1.85, 0.9], [1.95, -1.3], [1.4, -2.2], [-1.4, -2.2], [-1.95, -1.3], [-1.85, 0.9]], 1.3, P, 0, 0.14, 0, { bevel: 0.24, inset: 0.18 });
  if (lv >= 1) for (const sx of [-1, 1]) {
    g.box(0.14, 0.8, 1.9, PL, sx * 1.98, 0.8, -0.2, { ry: sx * -0.05 }); // appliqué armour
    bolts(g, [sx * 2.06, 1.05, -1.0], [sx * 2.06, 1.05, 0.6], 5, tone(P, 0.5), 0.05);
  }
  let muzzleZ;
  if (laser) {
    // the laser: a long emitter in a cradle of rails, ringed with glowing coils
    const len = 6 + lv;
    g.box(1.5, 1.2, 1.0, PD, 0, 0.8, 1.9, { r: 0.1 });
    g.cyl(0.26, len, PL, 0, 0.8, 1.8 + len / 2, { axis: 'z', seg: 8 });
    for (const a of [0, (PI * 2) / 3, (PI * 4) / 3]) g.box(0.1, 0.16, len - 0.6, PD, Math.sin(a) * 0.46, 0.8 + Math.cos(a) * 0.46, 1.9 + len / 2, { rz: -a });
    for (let i = 0; i < len - 1; i++) g.torus(0.46, 0.07, G, 0, 0.8, 2.9 + i * 0.95, { seg: 12 });
    g.cyl(0.4, 0.5, PD, 0, 0.8, 1.8 + len - 0.1, { axis: 'z', seg: 10 });
    g.ball(0.3, G, 0, 0.8, 1.8 + len + 0.12, { seg: 8, rows: 6 });
    // reactor on the bustle, cables to the breech
    g.cyl(0.7, 1.1, PD, 0, 1.6, -1.3, { seg: 12 });
    g.cyl(0.74, 0.16, G, 0, 1.5, -1.3, { seg: 12 });
    g.cyl(0.74, 0.16, G, 0, 1.9, -1.3, { seg: 12 });
    for (const sx of [-1, 1]) {
      g.tube([[sx * 0.6, 1.7, -1.1], [sx * 1.0, 1.75, 0], [sx * 0.9, 1.5, 1.2], [sx * 0.6, 1.1, 1.8]], 0.09, 0x16181a, { seg: 14 });
      for (let i = 0; i < 4; i++) g.box(0.06, 0.6, 0.5, PD, sx * (1.2 + i * 0.16), 1.6, -1.7); // radiator fins
    }
    muzzleZ = 1.9 + len;
  } else {
    const len = lv >= 2 ? 5.5 : 4.5;
    const xs = lv >= 4 ? [-0.6, 0.6] : [0];
    g.box(lv >= 4 ? 2.2 : 1.4, 1.0, 0.6, PD, 0, 0.8, 1.95, { r: 0.1 }); // mantlet
    for (const x of xs) barrel(g, x, 0.8, 2.1, len, 0.3, tone(P, 0.55), { sleeve: true, brake: true, evac: lv >= 2 ? 0.6 : 0 });
    muzzleAt(u, t, xs[0], 0.8, 2.2 + len, true);
    g.cyl(0.07, 0.7, GUN, lv >= 4 ? 0 : 0.6, 1.0, 2.3, { axis: 'z', seg: 6 }); // coax
    if (mammoth) for (const sx of [-1, 1]) {
      // missile racks
      g.box(0.3, 0.6, 0.5, DARK, sx * 2.1, 1.3, -0.6);
      g.box(1.0, 1.0, 2.2, 0x37474f, sx * 2.6, 1.9, -0.5, { r: 0.06, rx: -0.2 });
      for (const dx of [-0.24, 0.24]) for (const dy of [-0.24, 0.24]) {
        g.cyl(0.19, 0.1, 0x101112, sx * 2.6 + dx, 2.12 + dy, 0.58, { axis: 'z', seg: 8, rx: -0.2 });
        g.cyl(0.13, 0.2, 0xd84315, sx * 2.6 + dx, 2.13 + dy, 0.6, { axis: 'z', r2: 0.04, seg: 6, rx: -0.2 });
      }
    }
  }
  const m = cupola(g, 0.9, 1.44, -0.5, 0.5, PD, laser ? 0 : 1.7);
  hatch(g, -0.9, 1.44, -0.3, 0.42, PD);
  periscope(g, -0.9, 1.44, 0.6, PD);
  for (const sx of [-1, 1]) smoke(g, sx * 1.95, 1.0, 1.1, sx, 3, tone(P, 0.55));
  if (!laser) bustle(g, 1.2, 0.5, -2.2, 0.7, DARK, P);
  antenna(g, -1.4, 1.44, -1.6, 2.6);
  if (lv >= 3) antenna(g, 1.4, 1.44, -1.7, 2.0);
  if (lv >= 2) {
    lamp(g, -1.2, 1.3, 1.6, 0.2); // searchlight
    g.box(0.6, 0.4, 0.6, PD, 0, 1.64, 0.6, { r: 0.05 });
    g.box(0.4, 0.2, 0.04, laser ? G : 0x6fb7e6, 0, 1.66, 0.91);
  }
  g.done();
  if (laser) {
    muzzleAt(u, t, 0, 0.8, muzzleZ);
    u.tracerWidth = 0.5;
  } else muzzleAt(u, t, ...m);
  u.height = 4.2 * s;
  u.tracer = laser ? glowCol : 0xffab40;
  return u;
}

// ------------------------------------------------------------------ Void Tank

/** Void Tank: a tank grown out of void crystal: purple-black plates, glowing runes and shards, a single eye. */
function voidtank() {
  const u = unitBase();
  const P = 0x2a1040;
  const PD = 0x180828;
  const PL = 0x45206a;
  const G = glowMat(u, 0xd500f9);
  const L = 6.4;
  const th = 1.5;
  const top = 2.2;
  const k = kit(u, u.body, 'voidtank:b');
  const H = trackedHull(u, k, u.body, { L, x: 2.2, tw: 1.0, th, top, P, n: 5, full: true, hub: 0x3a1a58, belt: 0x120818 });
  for (const s of [-1, 1]) {
    k.box(0.08, 0.16, L * 0.8, G, s * (H.wo + 0.02), th + 0.3, -0.2); // rune line
    for (let i = 0; i < 5; i++) k.box(0.1, 0.4, 0.12, G, s * (H.wo + 0.03), th + 0.36, -2.4 + i * 1.1, { rx: i % 2 ? 0.5 : -0.5 });
    // crystal shards growing from the sponsons
    for (const [z, h, a] of [[-2.4, 1.3, 0.3], [-1.7, 0.8, -0.2], [1.0, 0.7, 0.25]]) {
      k.cyl(0.3, h, PL, s * 2.3, top + h / 2 - 0.1, z, { r2: 0.01, seg: 5, rz: -s * a, rx: a * 0.6 });
      k.cyl(0.14, h * 0.7, G, s * 2.0, top + h * 0.35 - 0.1, z + 0.3, { r2: 0.01, seg: 4, rz: -s * a * 2 });
    }
  }
  for (const x of [-1.2, -0.4, 0.4, 1.2]) k.cyl(0.22, 1.1, PD, x, ...H.gp(0.9, 0.3), { axis: 'z', r2: 0.01, seg: 5, rx: 0.1 }); // ram spikes
  let [y, z] = H.gp(0.4, 0.04);
  k.box(1.6, 0.06, 0.2, G, 0, y, z, { rx: H.ga });
  k.box(0.2, 0.06, 0.9, G, 0, y, z, { rx: H.ga });
  k.cyl(0.6, 0.08, G, 0, top + 0.03, -2.5, { seg: 6 }); // rune ring on the engine deck
  k.cyl(0.42, 0.1, PD, 0, top + 0.04, -2.5, { seg: 6 });
  k.done();
  const t = turretAt(u, u.body, top, -0.3);
  const g = kit(u, t, 'voidtank:t');
  g.cyl(1.5, 0.2, PD, 0, 0.1, 0, { seg: 8 });
  g.plan([[0, 2.1], [1.4, 0.8], [1.7, -0.9], [0.9, -1.9], [-0.9, -1.9], [-1.7, -0.9], [-1.4, 0.8]], 1.4, P, 0, 0.16, 0, { bevel: 0.5, inset: 0.4 });
  g.ball(0.42, G, 0, 1.0, 1.2, { seg: 10, rows: 8 }); // the eye
  g.torus(0.5, 0.1, PD, 0, 1.0, 1.25, { seg: 8, rx: -0.4 });
  // the gun: a dark barrel wrapped in three crystal prongs
  g.cyl(0.3, 3.0, PD, 0, 0.72, 3.2, { axis: 'z', seg: 6, r2: 0.22 });
  for (const a of [0, (PI * 2) / 3, (PI * 4) / 3]) g.cyl(0.16, 1.6, PL, Math.sin(a) * 0.36, 0.72 + Math.cos(a) * 0.36, 4.2, { axis: 'z', r2: 0.01, seg: 4 });
  g.cyl(0.14, 3.3, G, 0, 0.72, 3.3, { axis: 'z', seg: 6 });
  for (const zz of [2.2, 3.0, 3.8]) g.torus(0.36, 0.06, G, 0, 0.72, zz, { seg: 6 });
  for (const s of [-1, 1]) {
    g.cyl(0.3, 1.6, PL, s * 1.2, 2.0, -1.0, { r2: 0.01, seg: 5, rz: -s * 0.35, rx: -0.2 }); // horns
    g.cyl(0.15, 0.9, G, s * 0.7, 1.9, -1.3, { r2: 0.01, seg: 4, rz: -s * 0.2 });
    g.box(0.06, 0.5, 0.12, G, s * 1.5, 0.9, -0.3, { ry: s * 0.2 });
  }
  g.done();
  muzzleAt(u, t, 0, 0.72, 4.9);
  u.height = 4.6;
  u.tracer = 0xd500f9;
  return u;
}

export const TANK_UNITS = {
  tank, railtank, bradley, abrams, m1x: abrams, voidtank,
  behemoth, behemoth2: behemoth, behemoth3: behemoth, behemoth4: behemoth, mammoth: behemoth,
  laserbehemoth: behemoth, laserbehemoth2: behemoth, laserbehemoth3: behemoth,
};
