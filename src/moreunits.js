import * as THREE from 'three';
import { PARTS, antenna, axle, barrel, bedroll, bolts, crate, glowMat, grille, hatch, jerry, kit, lamp, louvres, mgun, mirror, muzzleAt, periscope, profile, shackle, smoke, star, tone, turretAt, unitBase, wheelGeo } from './vehicles.js';
import { bustle, cupola, spareLinks, trackedHull } from './tankunits.js';

// More mechanical summons built with the vehicle kit (vehicles.js): the light tanks (Airdropped
// Tank, Racer-base Tank and Scyther, Festive Tank), the rocket launchers (Missile Truck,
// Javelin), the Racer-base buggies and the Enforcement turret truck. The trains are in
// trainunits.js, the walkers and gold bots in botunits.js.

const { GLASS, STEEL, GUN, DARK } = PARTS;
const PI = Math.PI;
const RED = 0xc62828;
const AMBER = 0xffa000;
const WHITE = 0xf5f5f5;

/** A group on the unit's body that everything inside is scaled by. */
export function scaled(u, s) {
  const S = new THREE.Group();
  S.scale.setScalar(s);
  u.body.add(S);
  return S;
}

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

/** A see-through glowing block (void haze, flames). It stays see-through when the unit fades in or out. */
export function hazeBox(u, parent, w, h, d, color, op, x, y, z) {
  const m = glowMat(u, color);
  m.transparent = true;
  m.opacity = op;
  m.depthWrite = false;
  m.userData.keepOpacity = op;
  const mesh = new THREE.Mesh(UNIT_BOX, m);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

// ------------------------------------------------------------------ light tanks

const LIGHT_TANKS = {
  hgtank: { P: 0x4caf50, PD: 0x2e7d32, TP: 0x388e3c, gun: 0x1b5e20, s: 0.8, len: 2.5, drop: true, tracer: 0xffab40 },
  rbTank: { P: 0x556b2f, s: 0.86, len: 2.9, mg: true, tracer: 0xffab40 },
  rbScyther: { P: 0x1a237e, s: 0.96, len: 3.4, mg: true, glow: 0x00e676, armour: true, hub: 0x283593, tracer: 0x00e676 },
  bfestivetank: { P: 0xc62828, PD: 0x8e1c1c, TP: 0x1b5e20, s: 1.06, len: 3.1, festive: true, belt: 0x1f3d22, hub: 0xfafafa, tracer: 0xffd740 },
};

/**
 * The smaller tanks. hgtank: the Hallow Guard's bright green Airdropped Tank (white drop
 * markings, lifting rings, a packed parachute). rbTank: an olive tank with a cupola gun.
 * rbScyther: navy, skirted, green-lit, with scythe blades on the bow. bfestivetank: red and
 * green with snow, string lights, a wreath, presents and a candy-cane gun.
 */
function lightTank(model) {
  const o = LIGHT_TANKS[model];
  const u = unitBase();
  const { P, s } = o;
  const PD = o.PD ?? tone(P, 0.72);
  const TP = o.TP ?? P;
  const TD = tone(TP, 0.74);
  const G = o.glow ? glowMat(u, o.glow) : null;
  const S = scaled(u, s);
  const L = 5.0;
  const th = 1.15;
  const top = 1.75;
  const k = kit(u, S, model + ':b');
  const H = trackedHull(u, k, S, { L, x: 1.65, tw: 0.76, th, top, P, n: 5, full: !!o.armour, skirt: o.armour ? 5 : 0, belt: o.belt, hub: o.hub });
  // glacis: driver's hood and spare links
  let [y, z] = H.gp(0.28, 0.09);
  k.box(0.6, 0.22, 0.46, PD, -0.5, y, z, { rx: H.ga, r: 0.05 });
  k.box(0.4, 0.08, 0.04, 0x6fb7e6, -0.5, y + 0.03, z + 0.24, { rx: H.ga });
  if (!o.festive) spareLinks(k, H, 0.84, -0.72, 5);
  // engine deck: louvres, filler caps, exhausts, tow cable, shovel
  louvres(k, 0, top + 0.02, -L / 2 + 0.7, 1.8, 0.8, 5);
  for (const sx of [-1, 1]) {
    k.cyl(0.11, 0.05, PD, sx * 0.7, top + 0.03, -1.05, { seg: 8 });
    k.cyl(0.1, 0.5, 0x3a2c22, sx * 0.65, top - 0.28, -L / 2 - 0.2, { axis: 'z', seg: 8 });
    k.cyl(0.065, 0.04, 0x0e0f10, sx * 0.65, top - 0.28, -L / 2 - 0.46, { axis: 'z', seg: 8 });
  }
  k.tube([[-1.05, top + 0.05, 0.9], [-1.12, top + 0.05, -0.3], [-1.05, top + 0.05, -1.3]], 0.035, 0x6b6f73, { seg: 10 });
  k.cyl(0.03, 1.2, 0x8d6e4a, 1.08, top + 0.05, -0.2, { axis: 'z', seg: 5 });
  k.box(0.22, 0.04, 0.28, 0x33363a, 1.08, top + 0.05, 0.5);
  if (o.drop) {
    // drop markings, lifting rings on the corners, the parachute pack still strapped to the tail
    k.box(2.3, 0.03, 0.3, WHITE, 0, ...H.gp(0.62, 0.02), { rx: H.ga });
    for (const sx of [-1, 1]) for (const zz of [-L / 2 + 0.25, L / 2 - 1.3]) {
      k.box(0.16, 0.12, 0.16, PD, sx * 1.05, top + 0.06, zz);
      k.torus(0.13, 0.035, STEEL, sx * 1.05, top + 0.2, zz, { ry: PI / 2, seg: 8 });
    }
    k.box(1.5, 0.36, 0.62, 0xe8e4d8, 0, top - 0.22, -L / 2 - 0.3, { r: 0.12 });
    for (const x of [-0.45, 0.45]) k.box(0.1, 0.4, 0.66, 0xef6c00, x, top - 0.22, -L / 2 - 0.3);
    k.tube([[-0.6, top + 0.02, -L / 2 + 0.1], [-0.3, top + 0.1, -L / 2 - 0.1], [0.3, top + 0.1, -L / 2 - 0.1], [0.6, top + 0.02, -L / 2 + 0.1]], 0.025, 0xe8e4d8, { seg: 10 });
  } else if (!o.festive) {
    // fuel drum across the tail, jerrycans
    k.cyl(0.27, 2.0, PD, 0, top - 0.5, -L / 2 - 0.33, { axis: 'x', seg: 10 });
    for (const x of [-0.6, 0.6]) k.cyl(0.29, 0.07, DARK, x, top - 0.5, -L / 2 - 0.33, { axis: 'x', seg: 10 });
    jerry(k, 1.05, top + 0.33, -L / 2 + 0.5, tone(P, 0.82));
  }
  if (G) {
    // Scyther: lit skirts, armour tiles on the bow and a scythe blade on each front corner
    for (const sx of [-1, 1]) {
      k.box(0.06, 0.1, L * 0.72, G, sx * (H.wo + 0.09), th * 1.16, -0.1);
      k.prism([[0, 0.15], [0.7, 0], [1.45, 0.25], [1.95, 0.95], [1.35, 0.52], [0.7, 0.36], [0, 0.5]], 0.09, 0xcfd8dc, sx * (H.wo + 0.16), 0.55, L / 2 - 0.5);
      k.tube([[sx * (H.wo + 0.16), 0.7, L / 2 - 0.5], [sx * (H.wo + 0.16), 0.56, L / 2 + 0.2], [sx * (H.wo + 0.16), 0.8, L / 2 + 0.95], [sx * (H.wo + 0.16), 1.5, L / 2 + 1.45]], 0.035, G, { seg: 10, sides: 4 });
      k.cyl(0.2, 0.2, PD, sx * (H.wo + 0.12), 0.9, L / 2 - 0.4, { axis: 'x', seg: 8 });
    }
    [y, z] = H.gp(0.72, 0.04);
    for (const x of [-0.9, -0.3, 0.3, 0.9]) k.box(0.5, 0.08, 0.5, tone(P, 1.3), x, y, z, { rx: H.ga });
    k.box(0.4, 0.06, 1.4, G, 0, top + 0.02, -1.0);
  }
  if (o.festive) {
    // snow on the fenders and deck, a wreath on the bow, presents on the tail, lights along both sides
    const snow = 0xfafafa;
    for (const sx of [-1, 1]) {
      k.box(0.86, 0.12, L * 0.86, snow, sx * 1.65, th + 0.22, 0, { r: 0.06 });
      k.tube([[sx * (H.wi + 0.05), top - 0.1, -L / 2 + 0.2], [sx * (H.wi + 0.05), top - 0.24, -1.0], [sx * (H.wi + 0.05), top - 0.1, 0], [sx * (H.wi + 0.05), top - 0.22, 0.6]], 0.02, 0x16181a, { seg: 12, sides: 4 });
    }
    k.box(2.3, 0.06, 0.34, snow, 0, ...H.gp(0.12, 0.03), { rx: H.ga });
    [y, z] = H.gp(0.6, 0.12);
    k.torus(0.42, 0.13, 0x2e7d32, 0, y, z, { rx: H.ga - PI / 2, seg: 14 });
    k.box(0.36, 0.1, 0.16, 0xd32f2f, 0, y + 0.1, z + 0.36, { rx: H.ga });
    for (const [x, zz, c, w] of [[-0.75, -2.0, 0x1565c0, 0.6], [0, -2.1, 0x2e7d32, 0.7], [0.75, -2.0, 0xf9a825, 0.55]]) {
      k.box(w, w * 0.8, w, c, x, top + w * 0.4, zz, { r: 0.03 });
      k.box(w + 0.02, w * 0.8 + 0.02, 0.1, snow, x, top + w * 0.4, zz);
      k.box(0.1, w * 0.8 + 0.02, w + 0.02, snow, x, top + w * 0.4, zz);
      k.torus(0.1, 0.04, 0xd32f2f, x, top + w * 0.8 + 0.08, zz, { seg: 8 });
    }
    const bulbs = [0xff1744, 0xffd740, 0x40c4ff, 0x76ff03].map((c) => glowMat(u, c));
    for (const sx of [-1, 1]) for (let i = 0; i < 8; i++) k.ball(0.09, bulbs[(i + (sx > 0 ? 2 : 0)) % 4], sx * (H.wi + 0.07), top - 0.2 - (i % 2) * 0.06, -L / 2 + 0.35 + i * 0.4, { seg: 6, rows: 4 });
  }
  k.done();
  const t = turretAt(u, S, top, -0.3);
  const g = kit(u, t, model + ':t');
  const outline = [[-0.62, 1.15], [0.62, 1.15], [1.12, 0.52], [1.16, -0.62], [0.8, -1.2], [-0.8, -1.2], [-1.16, -0.62], [-1.12, 0.52]];
  g.cyl(1.08, 0.14, TD, 0, 0.07, 0, { seg: 16 });
  g.plan(outline, 0.84, TP, 0, 0.12, 0, { bevel: 0.18, inset: 0.13 });
  g.box(0.98, 0.56, 0.3, TD, 0, 0.52, 1.15, { r: 0.09 }); // mantlet
  const z0 = 1.25;
  const len = o.len;
  if (o.festive) {
    // candy-cane gun
    for (let i = 0; i < 10; i++) g.cyl(0.2, len / 10 + 0.01, i % 2 ? 0xfafafa : 0xd32f2f, 0, 0.52, z0 + ((i + 0.5) * len) / 10, { axis: 'z', seg: 10 });
    g.torus(0.22, 0.07, glowMat(u, 0xffd740), 0, 0.52, z0 + len, { seg: 10 });
  } else barrel(g, 0, 0.52, z0, len, 0.15, o.gun ?? tone(TP, 0.62), { sleeve: true, brake: true });
  g.cyl(0.05, 0.45, GUN, 0.33, 0.56, 1.4, { axis: 'z', seg: 6 }); // coax
  lamp(g, -0.64, 0.86, 1.0, 0.13);
  const roof = 0.96;
  const mg = cupola(g, 0.45, roof, -0.3, 0.38, TD, o.mg ? 1.35 : 0);
  hatch(g, -0.48, roof, -0.28, 0.3, TD);
  periscope(g, -0.48, roof, 0.32, TD);
  bustle(g, 0.76, 0.4, -1.16, 0.55, DARK, TP);
  for (const sx of [-1, 1]) {
    smoke(g, sx * 1.18, 0.66, 0.2, sx, 3);
    g.torus(0.08, 0.028, DARK, sx * 0.85, 0.99, 0.66, { ry: PI / 2, seg: 8 });
    if (o.drop) g.box(0.04, 0.56, 0.3, WHITE, sx * 1.13, 0.55, -0.1, { rz: sx * 0.2 }); // white ID stripes
  }
  antenna(g, -0.85, roof, -0.9, 2.0);
  if (G) {
    g.cyl(1.1, 0.05, G, 0, 0.17, 0, { seg: 16 });
    for (const f of [0.55, 0.7, 0.85]) g.torus(0.2, 0.04, G, 0, 0.52, z0 + len * f, { seg: 10 });
    g.box(0.4, 0.3, 0.4, TD, -0.5, roof + 0.15, 0.55, { r: 0.04 });
    g.box(0.28, 0.16, 0.04, G, -0.5, roof + 0.17, 0.76);
  }
  if (o.festive) {
    g.plan(outline.map(([a, b]) => [a * 0.82, b * 0.82]), 0.1, 0xfafafa, 0, roof - 0.02, 0, { bevel: 0.04 }); // snow cap
    star(g, -0.85, roof + 2.5, -1.0, 0.36, glowMat(u, 0xffd740), { rx: PI / 2 });
    for (const sx of [-1, 1]) g.box(0.5, 0.34, 0.14, 0xffc107, 0.3 + sx * 0.28, roof + 0.3, -1.05, { rz: sx * 0.5, r: 0.05 }); // bow
    g.box(0.18, 0.18, 0.18, 0xffa000, 0.3, roof + 0.26, -1.05);
    const bulbs = [0xff1744, 0xffd740, 0x40c4ff, 0x76ff03].map((c) => glowMat(u, c));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * PI * 2 + 0.3;
      g.ball(0.08, bulbs[i % 4], Math.sin(a) * 1.2, 0.3, Math.cos(a) * 1.22 - 0.02, { seg: 6, rows: 4 });
    }
  }
  g.done();
  const tip = z0 + len + 0.12;
  if (o.mg) {
    muzzleAt(u, t, 0, 0.52, tip, true);
    muzzleAt(u, t, ...mg);
  } else {
    muzzleAt(u, t, 0, 0.52, tip);
    u.cannon = u.muzzles[0];
  }
  u.height = (top + 1.75) * s;
  u.tracer = o.tracer;
  if (o.festive) u.projectile = { color: 0xc62828, size: 0.55 };
  return u;
}

// ------------------------------------------------------------------ rocket launchers

/** A box launcher of cols x rows rocket tubes facing +z, centred on (0, y, z) in kit `g`. */
function rocketPod(g, y, z, cols, rows, P, G) {
  const w = cols * 0.5 + 0.26;
  const h = rows * 0.5 + 0.26;
  const d = 2.4;
  const PD = tone(P, 0.7);
  g.box(w, h, d, P, 0, y, z, { r: 0.06 });
  for (const f of [-0.32, 0.08, 0.44]) g.box(w + 0.08, h + 0.08, 0.1, PD, 0, y, z + f * d); // bands
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const x = (c - (cols - 1) / 2) * 0.5;
    const yy = y + (r - (rows - 1) / 2) * 0.5;
    g.cyl(0.2, 0.06, 0x0e0f10, x, yy, z + d / 2 + 0.01, { axis: 'z', seg: 10 });
    g.cyl(0.14, 0.3, RED, x, yy, z + d / 2 + 0.12, { axis: 'z', r2: 0.02, seg: 8 }); // warheads
    g.cyl(0.17, 0.05, 0x0e0f10, x, yy, z - d / 2 - 0.02, { axis: 'z', seg: 8 }); // blast vents
  }
  for (const sx of [-1, 1]) {
    g.cyl(0.2, 0.16, PD, sx * (w / 2 + 0.06), y - h * 0.2, z - 0.3, { axis: 'x', seg: 10 }); // trunnions
    bolts(g, [sx * (w / 2 + 0.01), y + h * 0.3, z - 0.9], [sx * (w / 2 + 0.01), y + h * 0.3, z + 0.9], 5, PD);
  }
  if (G) {
    g.box(w * 0.7, 0.06, 0.08, G, 0, y + h / 2 + 0.02, z + d / 2 - 0.14);
    for (const sx of [-1, 1]) g.box(0.05, 0.1, d * 0.6, G, sx * (w / 2 + 0.01), y - h * 0.3, z + 0.2);
  }
}

/** A turntable with a yoke that carries a rocket pod tilted up; returns after adding the turret and its muzzle. */
function launcherTurret(u, parent, model, y, z, cols, rows, P, G) {
  const t = turretAt(u, parent, y, z);
  const w = cols * 0.5 + 0.26;
  const g = kit(u, t, model + ':t');
  const PD = tone(P, 0.66);
  g.cyl(0.95, 0.16, PD, 0, 0.08, 0, { seg: 14 });
  g.cyl(0.7, 0.14, STEEL, 0, 0.22, 0, { seg: 12 });
  g.box(w + 0.5, 0.2, 1.3, PD, 0, 0.36, -0.2, { r: 0.04 });
  for (const sx of [-1, 1]) {
    g.prism([[-0.9, 0.3], [-0.5, 1.25], [0.0, 1.25], [0.45, 0.3]], 0.16, PD, sx * (w / 2 + 0.2), 0, 0, { bevel: 0.03 }); // yoke
    g.cyl(0.07, 1.0, 0xc4c8cc, sx * 0.4, 0.75, 0.55, { seg: 6, rx: 0.75 }); // elevating rams
    g.cyl(0.1, 0.5, DARK, sx * 0.4, 0.55, 0.35, { seg: 6, rx: 0.75 });
  }
  g.box(0.5, 0.5, 0.4, PD, -(w / 2 + 0.55), 0.7, -0.5, { r: 0.04 }); // sight box
  g.box(0.3, 0.2, 0.04, 0x6fb7e6, -(w / 2 + 0.55), 0.74, -0.29);
  g.done();
  const pod = new THREE.Group();
  pod.position.set(0, 1.0, -0.3);
  pod.rotation.x = -0.3;
  t.add(pod);
  const h = rows * 0.5 + 0.26;
  const p = kit(u, pod, model + ':p');
  rocketPod(p, h / 2 - 0.1, 0.5, cols, rows, P, G);
  p.done();
  muzzleAt(u, pod, 0, h / 2 - 0.1, 1.9);
  return t;
}

/** Racer base's Missile Truck: a six-wheeled army truck with a six-tube rocket pod on the bed. */
function rocketTruck(model) {
  const u = unitBase();
  const P = 0x6d7b5b;
  const PD = tone(P, 0.72);
  const S = scaled(u, 0.8);
  const k = kit(u, S, model + ':b');
  k.box(1.5, 0.3, 6.3, DARK, 0, 0.95, 0); // frame
  k.box(0.5, 0.4, 0.8, 0x2e3134, 0, 0.85, 1.2);
  k.cyl(0.07, 3.2, 0x2e3134, 0, 0.7, -0.7, { axis: 'z', seg: 6 }); // prop shaft
  // cab
  k.prism(profile([[1.15, 1.05], [1.15, 2.75], [2.3, 2.75], [2.72, 2.1], [3.15, 2.0], [3.15, 1.05]], [[2.15, 0.8]], 0.62), 2.4, P, 0, 0, 0, { bevel: 0.05 });
  k.box(2.0, 0.62, 0.04, GLASS, 0, 2.43, 2.54, { rx: -0.57 });
  k.box(0.07, 0.68, 0.07, PD, 0, 2.43, 2.55, { rx: -0.57 });
  k.box(2.2, 0.06, 1.0, PD, 0, 2.78, 1.72);
  hatch(k, 0.5, 2.8, 1.7, 0.32, PD);
  grille(k, 0, 1.55, 3.17, 1.3, 0.6, 7, PD);
  k.box(2.7, 0.3, 0.28, STEEL, 0, 1.0, 3.3, { r: 0.04 });
  star(k, 0, 2.06, 2.95, 0.3, WHITE, { rx: 0.23 });
  for (const sx of [-1, 1]) {
    k.box(0.04, 0.5, 0.75, GLASS, sx * 1.2, 2.35, 1.78);
    k.box(0.03, 1.15, 0.03, PD, sx * 1.21, 1.7, 1.32); // door seam
    k.box(0.05, 0.06, 0.2, DARK, sx * 1.22, 1.95, 1.55); // handle
    lamp(k, sx * 0.9, 1.55, 3.16, 0.16);
    k.box(0.16, 0.1, 0.06, AMBER, sx * 0.9, 1.25, 3.17);
    shackle(k, sx * 0.8, 1.0, 3.45, 1);
    mirror(k, sx * 1.2, 2.5, 2.25, sx, PD);
    k.box(0.4, 0.06, 0.7, PD, sx * 1.32, 1.02, 1.5); // step
    k.box(0.62, 0.07, 1.5, PD, sx * 1.22, 1.45, 2.15); // front wing
    // fuel tank and stowage box under the bed
    k.cyl(0.3, 1.0, 0x3a3d40, sx * 0.98, 0.92, 0.35, { axis: 'z', seg: 10 });
    for (const zz of [0.05, 0.65]) k.cyl(0.32, 0.06, STEEL, sx * 0.98, 0.92, zz, { axis: 'z', seg: 10 });
    // bed side rail, stakes, mudguard, mudflap, tail light
    k.box(0.08, 0.34, 4.0, P, sx * 1.22, 1.55, -1.25);
    for (const zz of [-3.1, -2.2, -1.3, -0.4, 0.5]) k.box(0.1, 0.44, 0.1, PD, sx * 1.24, 1.54, zz);
    k.box(0.62, 0.06, 2.5, PD, sx * 1.2, 1.3, -2.05);
    k.box(0.55, 0.5, 0.04, 0x16181a, sx * 1.15, 0.85, -3.3);
    k.box(0.2, 0.14, 0.06, sx < 0 ? RED : AMBER, sx * 0.95, 1.2, -3.3);
    k.cyl(0.08, 0.7, STEEL, sx * 1.1, 0.75, -3.1, { seg: 6 }); // stabiliser jacks
    k.cyl(0.2, 0.06, DARK, sx * 1.1, 0.4, -3.1, { seg: 8 });
  }
  k.box(2.5, 0.16, 4.0, tone(P, 0.6), 0, 1.33, -1.25); // bed
  k.box(2.5, 0.4, 0.1, P, 0, 1.58, -3.25); // tailgate
  k.box(2.5, 1.2, 0.1, PD, 0, 2.0, 0.78); // headboard
  k.geo(wheelGeo(0.58, 0.44, 1, { rim: P }), 0, 2.05, 0.98, { ry: PI / 2 }); // spare wheel
  k.cyl(0.09, 1.7, 0x2a2c30, 1.0, 2.2, 1.0, { seg: 8 }); // exhaust stack
  k.cyl(0.12, 0.6, 0x3a3d40, 1.0, 2.3, 1.0, { seg: 8 });
  jerry(k, -0.9, 1.72, 0.45, tone(P, 0.82));
  jerry(k, -0.58, 1.72, 0.45, tone(P, 0.82));
  crate(k, 0.7, 1.6, 0.35, 0.8, 0.4, 0.6, 0x4b5a2a);
  bedroll(k, 0, 1.56, -3.0, 1.8, 0.16);
  antenna(k, -1.0, 2.78, 1.3, 2.2);
  k.done();
  axle(u, S, 1.15, 0.6, 2.15, 0.6, 0.48);
  axle(u, S, 1.15, 0.6, -1.45, 0.6, 0.48);
  axle(u, S, 1.15, 0.6, -2.65, 0.6, 0.48);
  launcherTurret(u, S, model, 1.41, -1.5, 3, 2, tone(P, 0.86), null);
  u.height = 3.1;
  u.tracer = 0xffab40;
  return u;
}

/** Racer base's Javelin: a dark tracked launcher with a nine-tube pod and green running lights. */
function javelin(model) {
  const u = unitBase();
  const P = 0x263238;
  const PD = tone(P, 0.7);
  const PL = 0x37474f;
  const G = glowMat(u, 0x00e676);
  const S = scaled(u, 0.85);
  const L = 5.6;
  const th = 1.1;
  const top = 1.6;
  const k = kit(u, S, model + ':b');
  const H = trackedHull(u, k, S, { L, x: 1.5, tw: 0.75, th, top, P, n: 6, full: true, skirt: 5, glacis: 0.18, hub: 0x37474f });
  // crew cab at the front: an armoured box with slit windows
  k.slab(2.7, 0.85, 1.5, PL, 0, top + 0.42, 1.5, { tw: 0.9, td: 0.78, tz: -0.12 });
  for (const x of [-0.62, 0.62]) k.box(0.85, 0.26, 0.05, 0x6fb7e6, x, top + 0.5, 2.15, { rx: -0.2 });
  k.box(0.5, 0.06, 0.06, G, 0, top + 0.2, 2.27);
  hatch(k, 0.55, top + 0.85, 1.4, 0.3, PD);
  periscope(k, -0.55, top + 0.85, 1.6, PD);
  for (const sx of [-1, 1]) {
    k.box(0.05, 0.26, 0.6, 0x6fb7e6, sx * 1.28, top + 0.5, 1.5, { rz: -sx * 0.07 });
    k.box(0.06, 0.1, L * 0.74, G, sx * (H.wo + 0.09), th * 1.16, -0.1);
    lamp(k, sx * 0.95, top + 0.95, 1.9, 0.12);
    k.cyl(0.09, 0.9, STEEL, sx * 1.55, 0.95, -L / 2 - 0.12, { seg: 6 }); // stabiliser jacks
    k.cyl(0.24, 0.07, DARK, sx * 1.55, 0.5, -L / 2 - 0.12, { seg: 8 });
    crate(k, sx * 1.5, top + 0.22, -2.2, 0.7, 0.4, 0.9, PL);
  }
  louvres(k, 0, top + 0.02, -2.35, 1.6, 0.7, 5);
  k.box(2.4, 0.5, 0.08, PD, 0, top + 0.25, 0.7, { rx: -0.3 }); // blast shield behind the cab
  antenna(k, -1.1, top + 0.85, 1.0, 2.4);
  k.cyl(0.05, 0.5, DARK, 1.0, top + 1.1, 1.0, { seg: 5 });
  k.cyl(0.3, 0.06, PL, 1.0, top + 1.38, 1.0, { seg: 10, rx: 0.5 }); // dish
  k.done();
  launcherTurret(u, S, model, top, -0.9, 3, 3, PL, G);
  u.height = 3.5;
  u.tracer = 0x00e676;
  return u;
}

// ------------------------------------------------------------------ buggies

const BUGGIES = {
  rbGhoul: { P: 0x8d6e63, len: 3.2 },
  rbGhoul2: { P: 0x6d4c41, len: 3.2, gun: 'mg' },
  rbPhantom: { P: 0x212121, len: 3.6, gun: 'light', glow: 0x7c4dff },
  rbLightstriker: { P: 0x263238, len: 3.8, gun: 'twin', glow: 0x00e676 },
};

/**
 * Racer base's buggies: a tube frame with a roll cage, bucket seats, an open engine in the back,
 * long-travel suspension and knobbly tyres (bigger at the rear). The Ghoul M2 carries a shielded
 * machine gun, the Phantom a small remote gun, the Lightstriker a twin energy gun.
 */
function buggy(model) {
  const o = BUGGIES[model];
  const u = unitBase();
  const { P, len } = o;
  const PD = tone(P, 0.7);
  const PL = tone(P, 1.25);
  const G = o.glow ? glowMat(u, o.glow) : null;
  const h = len / 2;
  const za = len / 3;
  const k = kit(u, u.body, model + ':b');
  // frame rails, skid pan, nose and tub
  for (const sx of [-1, 1]) k.tube([[sx * 0.6, 0.66, -h + 0.05], [sx * 0.7, 0.56, -za * 0.4], [sx * 0.7, 0.56, za * 0.5], [sx * 0.45, 0.72, h - 0.05]], 0.06, DARK, { seg: 12 });
  k.box(1.3, 0.06, len * 0.72, 0x2e3134, 0, 0.5, 0);
  k.prism([[-h * 0.5, 0.55], [-h * 0.5, 1.2], [0.2, 1.2], [h * 0.6, 1.02], [h - 0.12, 0.84], [h, 0.7], [h - 0.15, 0.55]], 1.36, P, 0, 0, 0, { bevel: 0.06 });
  k.box(0.3, 0.03, h * 0.9, PL, 0, 1.12, h * 0.42, { rx: 0.22 }); // hood stripe
  k.box(1.5, 0.12, 0.2, STEEL, 0, 0.62, h + 0.08, { r: 0.04 }); // nerf bar
  k.tube([[-0.6, 0.62, h + 0.05], [-0.5, 1.0, h + 0.14], [0.5, 1.0, h + 0.14], [0.6, 0.62, h + 0.05]], 0.045, STEEL, { seg: 12 });
  k.box(1.2, 0.04, 0.5, 0x3a3d40, 0, 0.5, h - 0.1, { rx: -0.5 }); // skid plate
  for (const sx of [-1, 1]) {
    lamp(k, sx * 0.4, 0.92, h - 0.06, 0.13, G ?? 0xfff3b0);
    k.box(0.05, 0.5, len * 0.42, PD, sx * 0.69, 0.95, -0.1); // side panels
    k.box(0.07, 0.07, len * 0.5, G ?? PL, sx * 0.72, 0.62, 0); // sill
    // seats
    k.box(0.5, 0.16, 0.56, 0x1c1c1e, sx * 0.34, 0.92, -0.3, { r: 0.06 });
    k.box(0.5, 0.74, 0.14, 0x1c1c1e, sx * 0.34, 1.3, -0.6, { r: 0.06, rx: -0.15 });
    k.box(0.3, 0.2, 0.1, 0x1c1c1e, sx * 0.34, 1.72, -0.66);
    // suspension: wishbones and coil-over shocks at each corner
    for (const [zz, r] of [[za, 0.54], [-za, 0.62]]) {
      k.cyl(0.035, 0.6, STEEL, sx * 0.9, r * 0.8, zz + 0.16, { axis: 'x', seg: 5 });
      k.cyl(0.035, 0.6, STEEL, sx * 0.9, r * 0.8, zz - 0.16, { axis: 'x', seg: 5 });
      k.cyl(0.03, 0.62, STEEL, sx * 0.9, r * 1.35, zz, { axis: 'x', seg: 5 });
      k.cyl(0.075, 0.6, G ?? 0xd84315, sx * 0.82, 1.02, zz, { seg: 8, rz: sx * 0.75 });
      k.cyl(0.045, 0.78, 0xc4c8cc, sx * 0.82, 1.02, zz, { seg: 6, rz: sx * 0.75 });
      k.box(0.46, 0.05, r * 1.5, P, sx * 1.14, r * 2 + 0.14, zz, { r: 0.02 }); // cycle wing
      k.box(0.05, 0.3, 0.05, DARK, sx * 0.98, r * 2 - 0.02, zz);
    }
  }
  // roll cage: front and rear hoops, roof bars, rear stays, a mesh roof and a light bar
  const zr = -h * 0.48;
  k.tube([[-0.68, 1.15, 0.55], [-0.62, 1.98, 0.12], [0.62, 1.98, 0.12], [0.68, 1.15, 0.55]], 0.055, DARK, { seg: 16, tension: 0.05 });
  k.tube([[-0.68, 1.15, zr], [-0.64, 2.04, zr + 0.06], [0.64, 2.04, zr + 0.06], [0.68, 1.15, zr]], 0.055, DARK, { seg: 16, tension: 0.05 });
  for (const sx of [-1, 1]) {
    k.tube([[sx * 0.62, 1.98, 0.12], [sx * 0.64, 2.04, zr + 0.06]], 0.05, DARK, { seg: 2 });
    k.tube([[sx * 0.64, 2.04, zr + 0.06], [sx * 0.56, 1.2, -h + 0.12]], 0.05, DARK, { seg: 2 });
    k.tube([[sx * 0.68, 1.2, zr], [sx * 0.64, 1.95, 0.1]], 0.035, DARK, { seg: 2 }); // door bar
  }
  k.box(1.2, 0.04, 0.12 - zr, PD, 0, 2.06, (0.12 + zr) / 2 + 0.03);
  for (const x of [-0.42, -0.14, 0.14, 0.42]) lamp(k, x, 2.16, 0.2, 0.1, G ?? 0xfff3b0);
  k.box(1.2, 0.07, 0.1, DARK, 0, 2.1, 0.12);
  // dash and steering wheel
  k.box(1.2, 0.22, 0.14, DARK, 0, 1.24, 0.3);
  k.cyl(0.03, 0.44, DARK, -0.34, 1.3, 0.12, { seg: 5, rx: -1.05 });
  k.torus(0.2, 0.04, 0x101112, -0.34, 1.4, -0.06, { rx: -0.5, seg: 12 });
  // engine: block, heads, air filter, belt, fan shroud, exhausts, fuel cell
  const ze = -h * 0.72;
  k.box(0.76, 0.46, 0.8, 0x4a4e52, 0, 0.92, ze, { r: 0.05 });
  for (const sx of [-1, 1]) {
    k.box(0.3, 0.2, 0.74, o.glow ? PD : 0xb23b22, sx * 0.34, 1.2, ze, { rz: -sx * 0.5, r: 0.04 }); // valve covers
    k.tube([[sx * 0.44, 1.0, ze + 0.2], [sx * 0.62, 0.95, ze - 0.2], [sx * 0.56, 1.1, -h - 0.1], [sx * 0.5, 1.5, -h - 0.28]], 0.06, 0xb0b5ba, { seg: 12 });
    k.cyl(0.08, 0.3, 0x2a2c30, sx * 0.49, 1.56, -h - 0.31, { seg: 6, rx: -0.4 });
  }
  k.cyl(0.24, 0.22, 0xc4c8cc, 0, 1.42, ze + 0.1, { seg: 10 }); // air filter
  k.cyl(0.26, 0.05, DARK, 0, 1.55, ze + 0.1, { seg: 10 });
  k.torus(0.3, 0.035, DARK, 0, 0.95, ze - 0.46, { seg: 12 }); // fan shroud
  for (let i = 0; i < 3; i++) k.box(0.56, 0.08, 0.02, 0x3a3d40, 0, 0.95, ze - 0.46, { rz: (i * PI) / 3 });
  k.box(0.9, 0.34, 0.36, 0x33363a, 0, 1.28, zr - 0.18, { r: 0.05 }); // fuel cell
  k.cyl(0.07, 0.08, RED, 0.3, 1.48, zr - 0.18, { seg: 6 });
  for (const sx of [-1, 1]) k.box(0.12, 0.1, 0.05, sx < 0 ? RED : AMBER, sx * 0.5, 0.8, -h - 0.02);
  if (!o.gun) k.geo(wheelGeo(0.46, 0.36, 1, { rim: PL }), 0, 1.84, zr - 0.5, { ry: PI / 2, rx: 0 }); // spare
  antenna(k, 0.6, 2.04, zr + 0.06, 1.8, 0.2);
  if (G) {
    k.box(1.0, 0.04, len * 0.6, G, 0, 0.46, 0); // underglow
    k.box(0.9, 0.05, 0.06, G, 0, 0.8, h - 0.03);
  }
  k.done();
  axle(u, u.body, 1.14, 0.54, za, 0.54, 0.42, { rim: G ? PL : 0x8a9096 });
  axle(u, u.body, 1.16, 0.62, -za, 0.62, 0.52, { rim: G ? PL : 0x8a9096 });
  if (o.gun) {
    const t = turretAt(u, u.body, 2.08, (0.12 + zr) / 2);
    const g = kit(u, t, model + ':t');
    g.cyl(0.36, 0.08, DARK, 0, 0.04, 0, { seg: 12 });
    g.cyl(0.07, 0.36, DARK, 0, 0.22, 0, { seg: 6 });
    g.box(0.26, 0.2, 0.3, 0x3a3d40, 0, 0.42, 0.02);
    if (o.gun === 'twin') {
      g.box(0.7, 0.34, 0.8, PD, 0, 0.56, 0, { r: 0.06 });
      for (const sx of [-1, 1]) {
        barrel(g, sx * 0.2, 0.56, 0.3, 1.3, 0.07, GUN);
        g.cyl(0.11, 0.5, 0x2c2f33, sx * 0.2, 0.56, 0.7, { axis: 'z', seg: 8 });
        g.torus(0.1, 0.03, G, sx * 0.2, 0.56, 1.45, { seg: 8 });
        muzzleAt(u, t, sx * 0.2, 0.56, 1.65);
      }
      g.box(0.4, 0.1, 0.04, G, 0, 0.66, 0.41);
    } else {
      mgun(g, 0, 0.6, -0.4, 1.7, { s: o.gun === 'mg' ? 1.05 : 0.8, ammo: o.gun === 'mg' });
      if (o.gun === 'mg') for (const sx of [-1, 1]) g.box(0.42, 0.56, 0.05, PD, sx * 0.36, 0.66, 0.3, { ry: sx * -0.25 }); // gun shield
      else g.box(0.2, 0.12, 0.04, G, 0, 0.8, 0.1);
      muzzleAt(u, t, 0, 0.62, 1.32);
    }
    g.done();
  }
  u.height = o.gun ? 2.8 : 2.3;
  u.tracer = o.gun === 'twin' ? 0x00e676 : 0xffd54f;
  return u;
}

// ------------------------------------------------------------------ Enforcement turret truck

/** Enforcement Base's Turret Truck: a navy six-wheeled armoured police truck with a light bar, a ram bumper and a shielded roof gun. */
function policeTruck(model) {
  const u = unitBase();
  const P = 0x1a237e;
  const PD = 0x12195c;
  const PL = 0x283593;
  const R = glowMat(u, 0xff1744);
  const B = glowMat(u, 0x2979ff);
  const k = kit(u, u.body, model + ':b');
  k.box(1.7, 0.3, 6.2, DARK, 0, 0.9, 0.4); // frame
  k.slab(2.2, 0.4, 5.4, 0x16181a, 0, 0.82, 0.3, { bw: 0.5 }); // V belly
  k.prism(profile([[-2.75, 0.95], [-2.75, 2.4], [-2.55, 2.6], [1.65, 2.6], [2.2, 1.98], [3.6, 1.84], [3.75, 1.5], [3.75, 0.95]], [[2.75, 0.84], [0.2, 0.84], [-1.75, 0.84]], 0.66), 2.8, P, 0, 0, 0, { bevel: 0.07 });
  // white stripe, roof rim, windscreen with a centre post and wire guard
  for (const sx of [-1, 1]) {
    k.box(0.03, 0.26, 4.3, WHITE, sx * 1.41, 1.86, -0.55);
    k.box(0.03, 0.08, 4.3, 0x90caf9, sx * 1.41, 1.66, -0.55);
  }
  k.box(2.4, 0.26, 0.03, WHITE, 0, 1.86, -2.76);
  k.box(2.3, 0.6, 0.04, GLASS, 0, 2.3, 1.95, { rx: -0.72 });
  k.box(0.08, 0.66, 0.08, PD, 0, 2.3, 1.96, { rx: -0.72 });
  for (let i = 0; i < 4; i++) k.box(2.3, 0.025, 0.025, 0x16181a, 0, 2.1 + i * 0.13, 2.13 - i * 0.115);
  for (const sx of [-1, 1]) {
    // armoured side windows with slats, doors, steps, gun ports, rivets
    k.box(0.04, 0.42, 0.8, GLASS, sx * 1.41, 2.25, 1.0);
    for (const zz of [-0.4, -1.3, -2.1]) {
      k.box(0.04, 0.3, 0.5, GLASS, sx * 1.41, 2.25, zz);
      k.box(0.06, 0.05, 0.56, PD, sx * 1.42, 2.25, zz);
      k.cyl(0.07, 0.08, 0x0e0f10, sx * 1.42, 1.5, zz, { axis: 'x', seg: 6 });
    }
    k.box(0.03, 1.5, 0.03, PD, sx * 1.42, 1.75, 0.5);
    k.box(0.03, 1.5, 0.03, PD, sx * 1.42, 1.75, 1.5);
    k.box(0.05, 0.06, 0.22, STEEL, sx * 1.43, 1.9, 0.72);
    k.box(0.44, 0.06, 1.6, DARK, sx * 1.5, 0.98, -0.78); // running board
    bolts(k, [sx * 1.41, 2.5, -2.5], [sx * 1.41, 2.5, 1.4], 10, PL);
    mirror(k, sx * 1.4, 2.35, 1.75, sx, PD);
    // nose: lamps, indicators, wings
    lamp(k, sx * 0.95, 1.5, 3.76, 0.17);
    k.box(0.2, 0.1, 0.06, AMBER, sx * 0.95, 1.24, 3.76);
    k.box(0.5, 0.07, 1.5, PD, sx * 1.3, 1.52, 2.75);
    k.box(0.2, 0.14, 0.06, sx < 0 ? RED : AMBER, sx * 1.1, 1.3, -2.77);
    shackle(k, sx * 0.9, 0.98, 4.1, 1);
  }
  grille(k, 0, 1.45, 3.77, 1.3, 0.56, 7, PL);
  louvres(k, 0, 1.94, 2.9, 1.6, 0.8, 5);
  // ram bumper: a plate with a bull bar
  k.box(3.0, 0.4, 0.3, 0x3a3d40, 0, 1.0, 3.95, { r: 0.05 });
  k.slab(2.4, 0.9, 0.12, 0x2a2c30, 0, 1.35, 4.12, { tw: 0.9 });
  for (const x of [-0.8, 0, 0.8]) k.box(0.1, 0.9, 0.16, STEEL, x, 1.35, 4.2);
  for (let i = 0; i < 6; i++) k.box(0.2, 0.42, 0.04, i % 2 ? 0x16181a : 0xf9a825, -1.25 + i * 0.5, 1.0, 4.11); // hazard stripes
  // roof: light bar, siren, hatch ring, aerials, rear ladder and doors
  k.box(1.9, 0.12, 0.5, DARK, 0, 2.66, 1.25);
  k.box(0.8, 0.26, 0.42, R, -0.5, 2.84, 1.25, { r: 0.06 });
  k.box(0.8, 0.26, 0.42, B, 0.5, 2.84, 1.25, { r: 0.06 });
  k.box(0.16, 0.28, 0.44, 0xeceff1, 0, 2.84, 1.25);
  k.cyl(0.2, 0.4, STEEL, -0.95, 2.78, 0.6, { axis: 'z', r2: 0.1, seg: 8 }); // siren horn
  k.cyl(0.8, 0.1, PD, 0, 2.65, -0.6, { seg: 14 });
  antenna(k, 1.15, 2.6, -2.3, 2.2);
  antenna(k, -1.15, 2.6, -2.3, 1.5);
  k.box(0.04, 1.2, 0.04, PD, 0, 1.75, -2.77);
  for (const x of [-0.6, 0.6]) k.box(0.06, 0.2, 0.06, STEEL, x, 1.8, -2.8);
  for (const sx of [-1, 1]) k.box(0.05, 1.3, 0.05, STEEL, sx * 0.25 + 0.95, 1.7, -2.82);
  for (let i = 0; i < 4; i++) k.box(0.5, 0.05, 0.05, STEEL, 0.95, 1.2 + i * 0.34, -2.82);
  k.box(2.2, 0.12, 0.4, DARK, 0, 0.9, -2.95); // rear step
  k.done();
  for (const z of [2.75, 0.2, -1.75]) axle(u, u.body, 1.32, 0.66, z, 0.66, 0.54, { rim: 0x3a3d40 });
  const t = turretAt(u, u.body, 2.7, -0.6);
  const g = kit(u, t, model + ':t');
  g.cyl(0.72, 0.16, DARK, 0, 0.08, 0, { seg: 14 });
  g.plan([[-0.5, 0.6], [0.5, 0.6], [0.72, 0], [0.5, -0.7], [-0.5, -0.7], [-0.72, 0]], 0.5, PL, 0, 0.12, 0, { bevel: 0.1 });
  g.slab(1.5, 0.74, 0.1, P, 0, 0.62, 0.7, { tw: 0.86 }); // gun shield
  g.box(0.5, 0.12, 0.04, 0x6fb7e6, -0.4, 0.8, 0.76);
  g.box(1.3, 0.1, 0.03, WHITE, 0, 0.36, 0.76);
  mgun(g, 0.1, 0.56, 0.3, 2.0, { s: 1.25, ammoCol: 0x263238 });
  lamp(g, -0.5, 0.75, 0.3, 0.14, 0xe3f2fd);
  hatch(g, 0, 0.62, -0.25, 0.3, PD);
  g.done();
  muzzleAt(u, t, 0.1, 0.59, 2.3);
  u.height = 3.9;
  u.tracer = 0xffd54f;
  return u;
}

export const MORE_UNITS = {
  hgtank: lightTank, rbTank: lightTank, rbScyther: lightTank, bfestivetank: lightTank,
  rbTruck: rocketTruck, rbJavelin: javelin,
  rbGhoul: buggy, rbGhoul2: buggy, rbPhantom: buggy, rbLightstriker: buggy,
  ebtruck: policeTruck,
};
