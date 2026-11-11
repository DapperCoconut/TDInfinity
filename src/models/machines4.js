// Tower models: machines, batch 4 (rebuilt with the vehicle kit in ../vehicles.js).
// In here: Shield Tower, Oil Derrick, Scout Heli, Combat Drone (and the Bottom paths of the
// Shield Tower, Oil Derrick and Combat Drone), Plantation, Focus, Ducky Nest, Trawler.
// Each makeX(level) builds one tower's look; TOWER_MODELS in ../models.js says which tower uses which.

import * as THREE from 'three';
import { antenna, barrel, bolts, crate, glowMat, hatch, jerry, kit, lamp, mgun, PARTS, tone } from '../vehicles.js';
import { clearMat, gunMuzzle, makeThing } from './bits.js';
import { dish, pad, ring, spinBarrels } from './machines1.js';
import { bag, drum, fence, flagPole, windowAt } from './machines2.js';
import { hull } from './machines3.js';

const { STEEL, GUN, DARK, GLASS } = PARTS;
const PI = Math.PI;
const HAZARD = 0xf2c12e;
const GOLD = 0xffc107;
const WOOD = 0x8d6e63;

// ------------------------------------------------------------------ small shared pieces

/** A regular outline with `n` corners and radius r, as [[x, z], ...] (a flat side faces +z when n is 8). */
function poly(n, r, turn = PI / n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2 + turn;
    out.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return out;
}

/** A see-through material that stays see-through when the tower fades (nets, halos). */
function seeThrough(u, color, opacity, lit = false) {
  const m = lit ? glowMat(u, color) : u.M(color);
  m.transparent = true;
  m.opacity = opacity;
  m.depthWrite = false;
  m.userData.keepOpacity = opacity;
  return m;
}

/** A spinning group at (x, y, z) on `parent` whose spin axis is `axis` ('y', 'x' or 'z'). Spins with u.spin. */
function spinner(u, parent, x, y, z, axis = 'y') {
  const mount = new THREE.Group();
  mount.position.set(x, y, z);
  if (axis === 'x') mount.rotation.z = -PI / 2;
  if (axis === 'z') mount.rotation.x = PI / 2;
  parent.add(mount);
  const g = new THREE.Group();
  mount.add(g);
  (u.spin ??= []).push(g);
  return g;
}

/** A rotor on `parent` at (x, y, z): a hub and `n` blades `len` long. It spins about its own y (heli.userData.rotors). */
function rotor(u, parent, key, x, y, z, n, len, w = 0.2, col = 0x2b2b2b, tip = HAZARD) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  const k = kit(u, g, `rotor:${key}:${n}:${len}:${w}`);
  k.cyl(w * 1.1, 0.14, DARK, 0, 0, 0, { seg: 10 });
  k.ball(w * 0.8, STEEL, 0, 0.08, 0, { seg: 8, rows: 5, sy: 0.6 });
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    k.box(w, 0.04, len, col, s * (len / 2 + w), 0, c * (len / 2 + w), { ry: a, rz: 0.06 });
    if (tip != null) k.box(w * 1.02, 0.05, len * 0.12, tip, s * (len * 0.94 + w), 0, c * (len * 0.94 + w), { ry: a });
  }
  k.done();
  return g;
}

/** A rocket pod along +z at (x, y, z): tube, nose ring, a ring of tube ends and a glowing tip. */
function rocketPod(k, u, x, y, z, r, len, col, tip = 0xff3d00) {
  k.cyl(r, len, col, x, y, z, { axis: 'z', seg: 12 });
  k.cyl(r, 0.18, tone(col, 0.7), x, y, z + len / 2 + 0.09, { axis: 'z', r2: r * 0.75, seg: 12 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    k.cyl(r * 0.17, 0.04, 0x0e0f10, x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, z + len / 2 + 0.19, { axis: 'z', seg: 5 });
  }
  k.cyl(r * 0.3, 0.05, glowMat(u, tip), x, y, z + len / 2 + 0.19, { axis: 'z', seg: 8 });
}

/** A wad of banknotes lying along x: green block with a paper band. */
function cash(k, x, y, z, ry = 0) {
  k.box(0.42, 0.1, 0.2, 0x2e7d32, x, y + 0.05, z, { ry });
  k.box(0.1, 0.11, 0.21, 0xf5f5f5, x, y + 0.05, z, { ry });
}

/** A gold bar: a trapezoid ingot along x. */
function goldBar(k, u, x, y, z, ry = 0) {
  k.slab(0.42, 0.14, 0.2, glowMat(u, GOLD, 0.35), x, y + 0.07, z, { tw: 0.8, td: 0.7, ry });
}

/** A US flag on a pole standing on y0, cloth along +z: seven stripes and a blue canton with dots for stars. */
function usFlag(k, x, y0, z, h, s = 1) {
  k.cyl(0.2, 0.14, DARK, x, y0 + 0.07, z, { seg: 10 });
  k.cyl(0.07, h, 0xcfd8dc, x, y0 + h / 2, z, { r2: 0.05, seg: 8 });
  k.ball(0.11, 0xc9a227, x, y0 + h + 0.06, z, { seg: 8, rows: 5 });
  const sh = 0.12 * s;
  for (let i = 0; i < 7; i++) {
    const y = y0 + h - 0.1 - i * sh;
    for (let j = 0; j < 3; j++) k.box(0.04, sh, 0.52 * s, i % 2 ? 0xfafafa : 0xc62828, x + Math.sin(j * 1.6) * 0.05, y, z + 0.3 * s + j * 0.5 * s, { ry: j % 2 ? 0.2 : -0.2 });
  }
  k.box(0.06, sh * 4, 0.62 * s, 0x1a237e, x + 0.01, y0 + h - 0.1 - sh * 1.5, z + 0.38 * s, { ry: -0.2 });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) k.box(0.07, 0.04, 0.04, 0xfafafa, x + 0.02, y0 + h - 0.05 - sh * 0.4 - i * sh * 1.1, z + 0.18 * s + j * 0.2 * s, { ry: -0.2 });
}

// ------------------------------------------------------------------ Shield Tower

/**
 * Shield Tower: a generator pylon under a see-through blue dome, with a glowing orb on top and a
 * ring that turns round the orb. Top path: dish antennas (Lv 1), capacitors (Lv 2), a bigger dome
 * (Lv 3), a yellow reboot coil (Lv 4), then orbiting hex panels and the biggest dome (Lv 5). Bottom
 * path: a repair arm (Lv 1), glowing side panels (Lv 2), Nano Shields: four emitter posts (Lv 3),
 * green heal crosses (Lv 4), then two rings turning over the orb (Lv 5).
 */
export function makeShieldTower(level, bottom = false) {
  const u = makeThing();
  const top = !bottom;
  const color = bottom && level >= 3 ? 0x18ffff : 0x40c4ff;
  const shine = glowMat(u, color);
  const key = `shield${level}${bottom ? 'B' : 'T'}`;
  const k = kit(u, u.body, key);
  const BASE = 0x455a64;
  // Base: an eight-sided plinth with a step, a glowing ring slot and four cable trays
  k.plan(poly(8, 1.75), 0.32, BASE, 0, 0, 0, { bevel: 0.06 });
  k.torus(1.42, 0.05, shine, 0, 0.33, 0, { rx: PI / 2, seg: 32 });
  k.plan(poly(8, 1.15), 0.2, 0x37474f, 0, 0.32, 0, { bevel: 0.05 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4;
    const c = Math.cos(a);
    const s = Math.sin(a);
    k.box(0.32, 0.1, 0.9, 0x263238, c * 1.2, 0.37, s * 1.2, { ry: PI / 2 - a });
    k.box(0.08, 0.04, 0.8, shine, c * 1.2, 0.43, s * 1.2, { ry: PI / 2 - a });
    k.cyl(0.07, 0.06, STEEL, c * 1.55, 0.35, s * 1.55, { seg: 6 }); // anchor bolts
  }
  // Pylon: a tapered eight-sided column with rails, glowing coil rings and dark collars
  const ph = 2.4 + level * 0.25;
  const y0 = 0.52;
  k.cyl(0.55, ph, 0x546e7a, 0, y0 + ph / 2, 0, { r2: 0.38, seg: 8, flat: true });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2;
    k.box(0.1, ph - 0.2, 0.12, 0x37474f, Math.cos(a) * 0.5, y0 + ph / 2, Math.sin(a) * 0.5, { ry: -a, rz: Math.cos(a) * 0.06, rx: -Math.sin(a) * 0.06 });
  }
  const coils = 2 + Math.min(level, 3);
  for (let i = 0; i < coils; i++) {
    const y = y0 + 0.4 + (i * (ph - 0.6)) / coils;
    const r = 0.56 - (0.17 * (y - y0)) / ph;
    k.torus(r + 0.06, 0.07, shine, 0, y, 0, { rx: PI / 2, seg: 16 });
    k.cyl(r + 0.03, 0.1, DARK, 0, y + 0.13, 0, { seg: 16 });
  }
  // The orb: a cup, three prongs and the glowing ball
  const orbY = y0 + ph + 0.5;
  k.cyl(0.42, 0.22, 0x37474f, 0, y0 + ph + 0.05, 0, { r2: 0.5, seg: 14 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    k.tube([[Math.cos(a) * 0.4, y0 + ph + 0.1, Math.sin(a) * 0.4], [Math.cos(a) * 0.6, orbY - 0.1, Math.sin(a) * 0.6], [Math.cos(a) * 0.42, orbY + 0.35, Math.sin(a) * 0.42]], 0.05, STEEL, { sides: 5 });
    k.ball(0.07, shine, Math.cos(a) * 0.42, orbY + 0.37, Math.sin(a) * 0.42, { seg: 6, rows: 4 });
  }
  k.ball(0.4, shine, 0, orbY, 0, { seg: 16, rows: 10 });
  gunMuzzle(u, u.body, 0, orbY, 0);

  if (top) {
    if (level >= 2) for (const x of [-1.1, 1.1]) {
      // Capacitors: ribbed cans with glowing caps and a cable to the pylon
      k.cyl(0.28, 1.0, 0x78909c, x, 0.92, 1.0, { seg: 14 });
      for (const y of [0.6, 0.9, 1.2]) k.torus(0.28, 0.035, 0x546e7a, x, y, 1.0, { rx: PI / 2, seg: 14 });
      k.cyl(0.2, 0.12, shine, x, 1.48, 1.0, { seg: 12 });
      k.tube([[x, 1.3, 0.78], [x * 0.6, 1.0, 0.55], [x * 0.35, 1.2, 0.2]], 0.04, 0x212121, { sides: 4 });
    }
    if (level >= 4) {
      // Reboot coil: a yellow glowing spiral round the pylon
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const a = i * 0.55;
        pts.push([Math.cos(a) * 0.72, 1.0 + i * 0.05, Math.sin(a) * 0.72]);
      }
      k.tube(pts, 0.06, glowMat(u, 0xffea00), { sides: 5, seg: 120, tension: 0.5 });
    }
    if (level >= 1) for (const sx of [-1, 1]) {
      k.cyl(0.07, 1.3, DARK, sx * 1.2, 1.0, -1.2, { seg: 6 });
      k.box(0.3, 0.2, 0.3, 0x37474f, sx * 1.2, 0.42, -1.2);
    }
  } else {
    if (level >= 1) {
      // Advanced Repairs: an orange robot arm with a two-finger claw
      const ax = 1.15;
      const az = 1.05;
      k.cyl(0.3, 0.2, DARK, ax, 0.42, az, { seg: 12 });
      k.cyl(0.2, 0.3, 0xffa000, ax, 0.65, az, { seg: 10 });
      k.tube([[ax, 0.7, az], [ax + 0.15, 1.5, az - 0.1], [ax - 0.25, 2.0, az - 0.35]], 0.1, 0xffa000, { sides: 8 });
      k.ball(0.14, DARK, ax + 0.15, 1.5, az - 0.1, { seg: 8, rows: 5 });
      k.box(0.2, 0.2, 0.26, DARK, ax - 0.3, 2.02, az - 0.4, { r: 0.04 });
      for (const s of [-1, 1]) k.box(0.05, 0.28, 0.06, STEEL, ax - 0.42, 1.95 + s * 0.06, az - 0.45 + s * 0.08, { rz: 0.6 });
      k.ball(0.05, glowMat(u, 0xff6d00), ax + 0.05, 0.8, az + 0.2, { seg: 6, rows: 4 });
    }
    if (level >= 2) for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2 + PI / 4;
      k.box(0.06, ph * 0.55, 0.32, shine, Math.cos(a) * 0.47, y0 + ph * 0.5, Math.sin(a) * 0.47, { ry: -a });
    }
    if (level >= 3) for (let i = 0; i < 4; i++) {
      // Nano Shields: four posts round the base with little cradled emitter orbs
      const a = (i / 4) * PI * 2 + PI / 4;
      const x = Math.cos(a) * 1.35;
      const z = Math.sin(a) * 1.35;
      k.cyl(0.14, 0.12, DARK, x, 0.38, z, { seg: 8 });
      k.cyl(0.07, 1.5, 0x37474f, x, 1.15, z, { seg: 8 });
      k.torus(0.22, 0.04, STEEL, x, 2.0, z, { rx: PI / 2, seg: 12 });
      k.ball(0.2, shine, x, 2.08, z, { seg: 10, rows: 7 });
    }
    if (level >= 4) {
      const green = glowMat(u, 0x69f0ae);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * PI * 2;
        const x = Math.cos(a) * 0.52;
        const z = Math.sin(a) * 0.52;
        k.box(0.06, 0.5, 0.16, green, x, 1.5, z, { ry: -a });
        k.box(0.06, 0.16, 0.5, green, x, 1.5, z, { ry: -a });
      }
    }
  }
  k.done();

  // A ring that turns slowly round the orb (and more on the Lv 5 upgrades)
  const sp = spinner(u, u.body, 0, orbY, 0);
  const s = kit(u, sp, `${key}:spin`);
  const tilt = PI / 2 + 0.35;
  s.torus(0.66, 0.045, 0x90a4ae, 0, 0, 0, { rx: tilt, seg: 24 });
  for (let i = 0; i < 3; i++) {
    // Lights on the ring (a point on the ring, turned by the same tilt)
    const a = (i / 3) * PI * 2;
    s.ball(0.07, shine, Math.cos(a) * 0.66, Math.sin(a) * 0.66 * Math.cos(tilt), Math.sin(a) * 0.66 * Math.sin(tilt), { seg: 6, rows: 4 });
  }
  if (level >= 5 && top) for (let i = 0; i < 6; i++) {
    // Orbiting hex panels with a glowing rim
    const a = (i / 6) * PI * 2;
    const x = Math.cos(a) * 1.9;
    const z = Math.sin(a) * 1.9;
    s.plan(poly(6, 0.45, 0), 0.06, 0xb3e5fc, x, -0.6, z, { rx: PI / 2, ry: PI / 2 - a });
    s.torus(0.42, 0.03, shine, x, -0.6, z, { ry: PI / 2 - a, seg: 6 });
  }
  if (level >= 5 && bottom) for (let i = 0; i < 2; i++) s.torus(1.2 - i * 0.3, 0.05, shine, 0, 0.7 + i * 0.4, 0, { rx: PI / 2, seg: 28 });
  s.done();
  if (top && level >= 1) for (const sx of [-1, 1]) dish(u, u.body, 'shielddish', sx * 1.2, 1.7, -1.2, 0.45, 0xeceff1, shine).rotation.set(0.7, sx * 0.5, 0);
  u.idleSpin = 1.2;

  // Dome: bigger with the Top path's shield upgrades
  const r = top ? [2.2, 2.2, 2.3, 2.7, 2.8, 3.2][level] : [2.2, 2.2, 2.3, 2.0, 2.2, 2.4][level];
  const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, PI * 2, 0, PI / 2), clearMat(u, color, 0.2));
  dome.position.y = 0.32;
  u.body.add(dome);
  u.medi = color; // links to the towers it shields, if the game draws them
  u.tracer = color;
  u.static = true;
  return u;
}
export const makeShieldTowerBottom = (level) => makeShieldTower(level, true);

// ------------------------------------------------------------------ Oil Derrick

/**
 * Oil Derrick: a yellow pumpjack on a skid. The crank and its counterweights turn all the time.
 * Top path: red gas cans (Lv 1), oil barrels (Lv 2), a lattice drill derrick (Lv 3), a pipeline
 * and storage tank (Lv 4), then black-and-gold tanks (Lv 5). Bottom path: a stack of bonds (Lv 1),
 * money crates (Lv 2), a cash machine (Lv 3), military crates and sandbags (Lv 4), then a big US
 * flag and a stack of gold bars (Lv 5).
 */
export function makeOilDerrick(level, bottom = false) {
  const u = makeThing();
  const top = !bottom;
  const key = `oil${level}${bottom ? 'B' : 'T'}`;
  const k = kit(u, u.body, key);
  const YEL = 0xfbc02d;
  pad(k, 4.0, 0.3, 0x7a7a7a, false);
  // Skid: two I-beams with cross members
  for (const sz of [-1, 1]) {
    k.box(3.2, 0.06, 0.24, 0x424242, 0.2, 0.33, sz * 0.45);
    k.box(3.2, 0.2, 0.06, 0x424242, 0.2, 0.44, sz * 0.45);
    k.box(3.2, 0.06, 0.24, 0x424242, 0.2, 0.55, sz * 0.45);
  }
  for (const x of [-1.2, -0.3, 0.6, 1.5]) k.box(0.14, 0.1, 1.0, 0x37474f, x, 0.6, 0);
  // Samson post: an A-frame of four legs up to a bearing
  const AX = 0.2;
  const AY = 3.0;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.tube([[AX + sx * 0.45, 0.62, sz * 0.48], [AX + sx * 0.05, AY - 0.15, sz * 0.12]], 0.08, YEL, { sides: 6, seg: 2 });
  for (const sz of [-1, 1]) k.box(0.7, 0.08, 0.08, tone(YEL, 0.85), AX, 1.6, sz * 0.32);
  k.box(0.4, 0.3, 0.4, DARK, AX, AY, 0, { r: 0.06 });
  k.cyl(0.08, 0.6, STEEL, AX, AY, 0, { axis: 'z', seg: 8 });
  // Walking beam (an I-beam) with the horsehead at the front
  const tilt = 0.06;
  k.box(3.2, 0.34, 0.12, YEL, 0.15, AY + 0.25, 0, { rz: tilt });
  for (const sy of [-1, 1]) k.box(3.2, 0.06, 0.34, tone(YEL, 0.9), 0.15, AY + 0.25 + sy * 0.17, 0, { rz: tilt });
  const hx = 1.72;
  const hy = AY + 0.25 + Math.sin(tilt) * 1.6;
  k.prism([[0, 0.25], [0.28, 0.2], [0.45, 0.0], [0.5, -0.35], [0.45, -0.7], [0.3, -0.95], [0.05, -1.05], [0, -0.6]], 0.42, YEL, hx, hy, 0, { ry: PI / 2, bevel: 0.05 });
  // Bridle: two cables down from the horsehead to a carrier bar, then the polished rod into the well
  const wx = hx + 0.48;
  for (const sz of [-1, 1]) k.tube([[wx, hy - 0.9, sz * 0.08], [wx, hy - 1.95, sz * 0.08]], 0.02, 0x212121, { sides: 3, seg: 2 });
  k.box(0.14, 0.08, 0.3, STEEL, wx, hy - 1.95, 0);
  k.cyl(0.035, 1.0, 0xcfd8dc, wx, hy - 2.45, 0, { seg: 6 });
  // Wellhead: flange, valve body, red hand wheels and an outlet pipe
  k.cyl(0.32, 0.12, 0x546e7a, wx, 0.36, 0, { seg: 12 });
  k.cyl(0.16, 0.7, 0x78909c, wx, 0.75, 0, { seg: 10 });
  k.box(0.36, 0.3, 0.36, 0x607d8b, wx, 0.85, 0, { r: 0.05 });
  for (const sz of [-1, 1]) {
    k.cyl(0.05, 0.2, STEEL, wx, 0.85, sz * 0.27, { axis: 'z', seg: 6 });
    k.torus(0.13, 0.03, 0xc62828, wx, 0.85, sz * 0.38, { seg: 12 });
  }
  k.tube([[wx, 0.65, 0], [wx - 0.1, 0.55, -0.5], [wx - 0.1, 0.42, -1.1]], 0.07, 0x546e7a, { sides: 6 });
  // Motor and belt guard behind the crank
  const CX = -1.0;
  const CY = 1.25;
  k.box(0.6, 0.55, 0.5, 0x37474f, CX, 0.9, 0, { r: 0.05 }); // gear box
  k.cyl(0.08, 1.2, STEEL, CX, CY, 0, { axis: 'z', seg: 8 }); // crank shaft
  k.box(0.75, 0.55, 0.55, 0x455a64, -1.65, 0.95, 0.35, { r: 0.08 }); // motor
  for (let i = 0; i < 4; i++) k.box(0.76, 0.03, 0.56, 0x263238, -1.65, 0.75 + i * 0.12, 0.35);
  k.slab(0.85, 0.75, 0.12, HAZARD, -1.3, 1.1, 0.68, { tw: 0.6, tx: 0.15 }); // belt guard
  // Pitman arms from the back of the beam down to the crank pins
  for (const sz of [-1, 1]) k.tube([[-1.35, AY + 0.15, sz * 0.12], [CX - 0.3, CY + 0.6, sz * 0.62], [CX - 0.5, CY, sz * 0.62]], 0.06, tone(YEL, 0.9), { sides: 6 });
  k.box(0.28, 0.2, 1.3, tone(YEL, 0.85), -1.35, AY + 0.1, 0); // equalizer bar
  k.box(0.04, 0.6, 0.6, 0xfafafa, 0.15, AY + 0.25, 0.08, { rz: tilt }); // a white panel with a black drop
  k.ball(0.12, 0x111111, 0.15, AY + 0.25, 0.11, { sz: 0.3, sy: 1.3, seg: 8, rows: 6 });

  if (top) {
    if (level >= 1) for (const x of [-0.75, -0.4]) jerry(k, x, 0.62, 1.7, 0xd32f2f);
    if (level >= 2) for (const [x, z] of [[1.0, 1.55], [1.62, 1.55], [1.31, 1.02]]) drum(k, x, 0.3, z, 0x1565c0, 0xfafafa);
    if (level >= 3) {
      // Oil Drill: a lattice derrick behind the pumpjack, crossbraced, with a crown block and a red light
      const H = level >= 5 ? 6 : 5;
      const dx = 0.7;
      const dz = -1.45;
      const b = 0.5;
      const t = 0.17;
      const at = (f) => b + (t - b) * f;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.tube([[dx + sx * b, 0.3, dz + sz * b], [dx + sx * t, 0.3 + H, dz + sz * t]], 0.05, 0x9e9e9e, { sides: 4, seg: 2 });
      const n = 5;
      for (let i = 0; i < n; i++) {
        const f0 = i / n;
        const f1 = (i + 1) / n;
        const ya = 0.3 + H * f0;
        const yb = 0.3 + H * f1;
        for (let side = 0; side < 4; side++) {
          const ax = side % 2 ? 1 : 0;
          const sgn = side < 2 ? 1 : -1;
          const p = (f, s) => (ax ? [dx + sgn * at(f), 0, dz + s * at(f)] : [dx + s * at(f), 0, dz + sgn * at(f)]);
          const A = p(f0, -1);
          const B = p(f1, 1);
          const C = p(f0, 1);
          const D = p(f1, -1);
          k.tube([[A[0], ya, A[2]], [B[0], yb, B[2]]], 0.025, 0xbdbdbd, { sides: 3, seg: 2 });
          k.tube([[C[0], ya, C[2]], [D[0], yb, D[2]]], 0.025, 0xbdbdbd, { sides: 3, seg: 2 });
          k.tube([[B[0], yb, B[2]], [D[0], yb, D[2]]], 0.03, 0x9e9e9e, { sides: 3, seg: 2 });
        }
      }
      k.box(0.7, 0.08, 0.7, 0x616161, dx, 0.3 + H * 0.55, dz); // monkey board
      k.box(0.5, 0.3, 0.5, 0xd32f2f, dx, 0.45 + H, dz, { r: 0.05 }); // crown block
      k.ball(0.1, glowMat(u, 0xff1744), dx, 0.7 + H, dz, { seg: 6, rows: 4 });
      k.cyl(0.03, H * 0.8, 0x424242, dx, 0.3 + H * 0.5, dz, { seg: 4 }); // drill line
    }
    if (level >= 4) {
      // Pipeline on little supports to a storage tank with a ladder and a vent
      const tc = level >= 5 ? 0x1a1a1a : 0xeceff1;
      const tx = -1.35;
      const tz = -1.35;
      k.tube([[wx - 0.1, 0.42, -1.1], [wx - 0.1, 0.45, -1.9], [tx + 0.5, 0.45, -1.9]], 0.08, 0x546e7a, { sides: 6, tension: 0 });
      for (const x of [1.4, 0.2, -0.6]) k.box(0.1, 0.15, 0.24, DARK, x, 0.37, -1.9);
      k.cyl(0.65, 1.6, tc, tx, 1.1, tz, { seg: 18 });
      k.cyl(0.67, 0.08, level >= 5 ? GOLD : 0x9e9e9e, tx, 1.9, tz, { r2: 0.3, seg: 18 });
      for (const y of [0.6, 1.1, 1.6]) k.torus(0.66, 0.03, level >= 5 ? GOLD : 0xb0bec5, tx, y, tz, { rx: PI / 2, seg: 18 });
      for (const dx of [-0.13, 0.13]) k.box(0.04, 1.6, 0.04, DARK, tx + 0.48 + dx, 1.1, tz + 0.48);
      for (let y = 0.45; y < 1.9; y += 0.22) k.box(0.3, 0.03, 0.03, DARK, tx + 0.48, y, tz + 0.48, { ry: -PI / 4 });
      k.cyl(0.06, 0.3, DARK, tx, 2.05, tz, { seg: 6 });
    }
    if (level >= 5) {
      // Big black-and-gold tank by the front corner
      const tx = -1.4;
      const tz = 1.35;
      k.cyl(0.6, 2.0, 0x1a1a1a, tx, 1.3, tz, { seg: 18 });
      k.ball(0.6, 0x1a1a1a, tx, 2.3, tz, { sy: 0.4, seg: 18, rows: 6 });
      for (const y of [0.5, 1.3, 2.1]) k.torus(0.61, 0.05, glowMat(u, GOLD, 0.4), tx, y, tz, { rx: PI / 2, seg: 18 });
      k.box(0.5, 0.5, 0.04, GOLD, tx, 1.3, tz + 0.6);
    }
  } else {
    if (level >= 1) for (let i = 0; i < 4; i++) {
      // Bonds: a stack of certificates with a ribbon
      k.box(0.7, 0.08, 0.45, i % 2 ? 0xc5e1a5 : 0xa5d6a7, -1.4, 0.34 + i * 0.09, 1.55, { ry: (i % 2) * 0.12 });
      if (i === 3) k.box(0.08, 0.38, 0.46, 0xc62828, -1.4, 0.48, 1.55);
    }
    if (level >= 2) for (const x of [0.9, 1.6]) {
      crate(k, x, 0.58, 1.5, 0.6, 0.5, 0.6, 0x8d6e63);
      for (let i = 0; i < 2; i++) cash(k, x, 0.83 + i * 0.1, 1.45 + (i % 2) * 0.12, (i % 2) * 0.3);
    }
    if (level >= 3) {
      // Cash Back: a cash machine with a green screen, keypad and slots
      const mx = -1.5;
      const mz = -1.4;
      k.box(0.85, 1.5, 0.65, 0x455a64, mx, 1.05, mz, { r: 0.06 });
      k.slab(0.8, 0.25, 0.4, 0x37474f, mx, 1.0, mz + 0.42, { td: 0.6, tz: -0.08 });
      k.box(0.55, 0.38, 0.04, glowMat(u, 0x76ff03, 0.6), mx, 1.45, mz + 0.34);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) k.box(0.09, 0.03, 0.08, 0xcfd8dc, mx - 0.12 + j * 0.12, 1.13, mz + 0.47 - i * 0.07);
      k.box(0.4, 0.05, 0.04, DARK, mx, 0.72, mz + 0.34);
      cash(k, mx, 0.68, mz + 0.38);
      k.box(0.9, 0.22, 0.7, glowMat(u, 0x2e7d32, 0.5), mx, 1.9, mz);
    }
    if (level >= 4) {
      for (const x of [0.55, 1.25]) {
        crate(k, x, 0.55, -1.45, 0.65, 0.5, 0.5, 0x4e5b31);
        k.box(0.3, 0.12, 0.02, 0xeeeeee, x, 0.55, -1.19);
      }
      for (let i = 0; i < 4; i++) bag(k, 0.68, 0.4, -1.4 + i * 0.72, 0.3, -1.85);
      for (let i = 0; i < 3; i++) bag(k, 0.68, 0.4, -1.05 + i * 0.72, 0.62, -1.85);
    }
    if (level >= 5) {
      usFlag(k, 1.7, 0.3, -0.7, 4.2, 1.1);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3 - i; j++) goldBar(k, u, -0.45 + j * 0.24 + i * 0.12, 0.3 + i * 0.14, 1.55, PI / 2);
    }
  }
  k.done();
  // The crank: two arms with heavy counterweights, turning about z
  const crank = spinner(u, u.body, CX, CY, 0, 'z');
  const c = kit(u, crank, 'oilcrank');
  for (const s of [-1, 1]) {
    c.box(0.95, 0.12, 0.22, 0x37474f, -0.25, s * 0.55, 0);
    c.cyl(0.42, 0.14, 0x37474f, -0.62, s * 0.55, 0, { seg: 14, sx: 1, sz: 1.3 });
    c.cyl(0.42, 0.04, HAZARD, -0.62, s * 0.63, 0, { seg: 14, sx: 0.4, sz: 0.5 });
    c.cyl(0.07, 0.2, STEEL, 0.15, s * 0.65, 0, { seg: 6 }); // crank pin
  }
  c.done();
  u.idleSpin = 1.6;
  u.muzzles = [];
  gunMuzzle(u, u.body, wx, 1.5, 0);
  u.tracer = 0x76ff03;
  u.static = true;
  return u;
}
export const makeOilDerrickBottom = (level) => makeOilDerrick(level, true);

// ------------------------------------------------------------------ Scout Heli

/**
 * The Scout Heli's little helicopter (faces +Z): a bubble nose, a door gun on each side, Lv 1 a
 * sight ball over the rotor (sees hidden enemies), Lv 2 a rocket pod on each stub wing, Lv 3 two,
 * Lv 4 a radar dome. Lv 5 the V-Osprey: a tilt-rotor with two big rotors on its wing tips.
 */
function scoutCraft(u, level) {
  const heli = new THREE.Group();
  const bank = new THREE.Group();
  heli.add(bank);
  const muzzles = [];
  const missiles = [];
  const point = (x, y, z, list) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    bank.add(m);
    list.push(m);
  };
  const key = `scout${level}`;
  const k = kit(u, bank, key);
  let prop = null;
  let tail = null;
  const rotors = [];
  if (level >= 5) {
    const C = 0x5f6b73;
    // V-Osprey: a long round-topped fuselage, a nose with a big cockpit and sponsons
    k.box(2.2, 2.0, 6.0, C, 0, 0, 0, { r: 0.6 });
    k.ball(1.05, C, 0, -0.15, 3.0, { sx: 1.0, sy: 0.9, sz: 1.3, seg: 16, rows: 10 });
    k.ball(0.95, GLASS, 0, 0.35, 3.0, { sx: 0.9, sy: 0.6, sz: 1.05, seg: 16, rows: 8 });
    k.cyl(0.12, 1.2, DARK, 0.5, 0.55, 4.4, { axis: 'z', r2: 0.05, seg: 6 }); // refuelling probe
    for (const sx of [-1, 1]) {
      k.box(0.6, 0.7, 2.6, tone(C, 0.9), sx * 1.25, -0.6, 0.2, { r: 0.25 }); // sponsons
      for (let i = 0; i < 4; i++) k.box(0.04, 0.32, 0.42, GLASS, sx * 1.11, 0.25, 1.6 - i * 0.75);
      k.cyl(0.18, 0.4, DARK, sx * 0.7, -1.2, 1.9, { axis: 'x', seg: 10 }); // wheels
    }
    // High wing with tilted-up engine nacelles on its tips
    k.slab(8.0, 0.25, 1.5, C, 0, 1.15, 0.3, { tw: 0.98, td: 0.8 });
    k.box(1.4, 0.4, 1.8, tone(C, 0.9), 0, 1.0, 0.3, { r: 0.15 });
    for (const x of [-4, 4]) {
      k.cyl(0.5, 2.0, C, x, 1.55, 0.3, { seg: 14 });
      k.ball(0.5, C, x, 0.55, 0.3, { seg: 14, rows: 6, sy: 0.6 });
      k.cyl(0.36, 0.12, DARK, x, 0.42, 0.3, { seg: 12 }); // exhaust
      k.cyl(0.52, 0.06, 0x37474f, x, 2.0, 0.3, { seg: 14 });
      rotors.push(rotor(u, bank, 'osprey', x, 2.7, 0.3, 3, 2.3, 0.28, 0x2b2b2b));
    }
    // Tail: a tailplane with twin fins and a loading ramp
    k.slab(3.2, 0.15, 1.1, C, 0, 0.6, -3.4, { tw: 0.85, td: 0.8 });
    for (const x of [-1.6, 1.6]) k.slab(0.15, 1.5, 1.0, C, x, 1.3, -3.45, { td: 0.6, tz: -0.2 });
    k.slab(1.8, 0.12, 1.6, tone(C, 0.8), 0, -0.6, -3.3, { rx: 0.3 }); // ramp
    // Bomb bay doors, nose guns and missile pods under the wing
    k.box(1.0, 0.1, 1.6, DARK, 0, -1.02, 0.2);
    k.box(0.04, 0.12, 1.6, 0x555555, 0, -1.04, 0.2);
    for (const x of [-0.8, 0.8]) {
      k.ball(0.22, DARK, x, -0.6, 3.6, { seg: 8, rows: 6 });
      barrel(k, x, -0.6, 3.7, 0.7, 0.06, GUN);
      point(x, -0.6, 4.45, muzzles);
    }
    for (const x of [-2.4, 2.4]) {
      k.box(0.1, 0.3, 0.6, DARK, x, 0.85, 0.5);
      rocketPod(k, u, x, 0.55, 0.5, 0.25, 1.5, 0x37474f);
      point(x, 0.55, 1.45, missiles);
    }
    k.ball(0.07, glowMat(u, 0xff1744), -4, 1.0, -0.5, { seg: 6, rows: 4 });
    k.ball(0.07, glowMat(u, 0x00e676), 4, 1.0, -0.5, { seg: 6, rows: 4 });
  } else {
    const C = 0x7d8a5a;
    // Body: a small rounded cabin, a big glass bubble nose and an engine hump
    k.box(1.7, 1.55, 2.5, C, 0, 0, 0.1, { r: 0.4 });
    k.ball(0.85, C, 0, -0.25, 1.4, { sx: 1.0, sy: 0.8, sz: 1.1, seg: 16, rows: 10 });
    k.ball(0.82, GLASS, 0, 0.18, 1.45, { sx: 0.95, sy: 0.85, sz: 1.08, seg: 16, rows: 10 });
    k.box(0.06, 0.06, 1.4, tone(C, 0.7), 0, 0.85, 1.35, { rx: 0.5 }); // canopy frame
    k.box(1.72, 0.18, 2.2, 0x3e4a2a, 0, -0.38, 0.1); // stripe
    k.box(1.1, 0.55, 1.6, tone(C, 0.9), 0, 0.98, -0.2, { r: 0.2 }); // engine hump
    k.cyl(0.18, 0.4, 0x3a3d40, 0, 1.0, -1.15, { axis: 'z', r2: 0.22, seg: 8 }); // exhaust
    for (const sx of [-1, 1]) {
      k.box(0.04, 0.9, 0.9, tone(C, 0.85), sx * 0.86, 0.05, 0.05); // door
      k.box(0.05, 0.4, 0.5, GLASS, sx * 0.87, 0.3, 0.05);
      // Skids
      k.tube([[sx * 0.8, -1.2, -1.1], [sx * 0.8, -1.2, 1.5], [sx * 0.8, -1.05, 1.9]], 0.06, DARK, { sides: 6 });
      for (const z of [-0.5, 1.0]) k.tube([[sx * 0.5, -0.65, z], [sx * 0.8, -1.2, z]], 0.05, DARK, { sides: 5, seg: 2 });
    }
    // Tail: a tapered boom, a fin with the tail rotor, a stabiliser
    k.cyl(0.18, 3.6, C, 0, 0.3, -2.9, { axis: 'z', r2: 0.42, seg: 12 });
    k.slab(0.1, 1.3, 0.8, C, 0, 0.85, -4.6, { td: 0.6, tz: -0.2 });
    k.slab(1.4, 0.08, 0.45, C, 0, 0.3, -4.0, { tw: 0.8 });
    k.ball(0.06, glowMat(u, 0xff1744), 0, 1.52, -4.8, { seg: 6, rows: 4 });
    // Rotor mast
    k.cyl(0.13, 0.55, DARK, 0, 1.45, 0.1, { seg: 8 });
    k.cyl(0.26, 0.1, STEEL, 0, 1.3, 0.1, { seg: 12 });
    prop = rotor(u, bank, 'scoutmain', 0, 1.75, 0.1, level >= 3 ? 4 : 2, 3.0, 0.26);
    tail = new THREE.Group();
    tail.position.set(0.1, 0.9, -4.7);
    bank.add(tail);
    const t = kit(u, tail, 'scouttail');
    t.cyl(0.1, 0.12, DARK, 0.04, 0, 0, { axis: 'x', seg: 8 });
    for (let i = 0; i < 2; i++) t.box(0.04, 1.2, 0.15, 0x2b2b2b, 0.08, 0, 0, { rx: (i * PI) / 2 });
    t.done();
    // Door gunners: a machine gun poking out of each side
    for (const sx of [-1, 1]) {
      k.box(0.3, 0.08, 0.08, DARK, sx * 0.95, -0.05, 0.3); // mount arm
      mgun(k, sx * 1.08, -0.1, 0.1, 1.1, { s: 0.8, ammoCol: 0x4b5a2a });
      point(sx * 1.08, -0.08, 1.25, muzzles);
    }
    if (level >= 1) {
      // Sight ball above the rotor on its own mast
      k.cyl(0.06, 0.45, DARK, 0, 2.1, 0.1, { seg: 6 });
      k.ball(0.3, 0x37474f, 0, 2.5, 0.1, { seg: 12, rows: 8 });
      k.box(0.36, 0.18, 0.06, glowMat(u, 0x76ff03), 0, 2.52, 0.38);
    }
    if (level >= 2) {
      const pods = level >= 3 ? 2 : 1;
      for (const sx of [-1, 1]) {
        const span = 0.6 + pods * 0.5;
        k.slab(span, 0.1, 0.6, C, sx * (0.85 + span / 2), -0.25, 0.1, { td: 0.7 });
        for (let j = 0; j < pods; j++) {
          const x = sx * (1.3 + j * 0.5);
          k.box(0.08, 0.2, 0.34, DARK, x, -0.38, 0.15);
          rocketPod(k, u, x, -0.62, 0.15, 0.2, 1.2, 0x37474f);
          point(x, -0.62, 0.95, missiles);
        }
      }
    }
    if (level >= 4) {
      // Radar dome on the engine hump and a whip aerial on the boom
      k.cyl(0.06, 0.25, DARK, 0, 1.35, -0.75, { seg: 6 });
      k.ball(0.38, 0xeceff1, 0, 1.55, -0.75, { sy: 0.6, seg: 12, rows: 8 });
      antenna(k, 0, 0.6, -2.4, 0.8);
    }
  }
  k.done();
  const bay = new THREE.Object3D();
  bay.position.set(0, -1.2, 0.2);
  bank.add(bay);
  heli.userData = { bank, prop, tail, bay, missiles, rotors };
  return { heli, muzzles };
}

/** Scout Heli tower: a square helipad with a white H, green corner lights, a windsock, fuel drums and a radio crate. */
export function makeScoutHeli(level) {
  const u = makeThing();
  const k = kit(u, u.body, `scoutpad${level}`);
  k.slab(3.8, 0.3, 3.8, 0x616161, 0, 0.15, 0, { tw: 0.97, td: 0.97 });
  k.box(3.2, 0.02, 3.2, 0x555555, 0, 0.31, 0);
  for (const sx of [-1, 1]) k.box(0.3, 0.04, 1.6, 0xfafafa, sx * 0.5, 0.33, 0);
  k.box(0.7, 0.04, 0.3, 0xfafafa, 0, 0.33, 0);
  for (let i = 0; i < 4; i++) {
    // Dashed edge marking
    const a = (i / 4) * PI * 2;
    for (let j = -2; j <= 2; j++) k.box(0.45, 0.03, 0.1, 0xfdd835, Math.cos(a) * 1.5 - Math.sin(a) * j * 0.65, 0.32, Math.sin(a) * 1.5 + Math.cos(a) * j * 0.65, { ry: -a + PI / 2 });
  }
  const lights = glowMat(u, 0x76ff03);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    k.cyl(0.12, 0.14, DARK, sx * 1.65, 0.37, sz * 1.65, { seg: 8 });
    k.ball(0.1, lights, sx * 1.65, 0.46, sz * 1.65, { seg: 6, rows: 4 });
  }
  // Windsock
  k.cyl(0.05, 2.2, 0xbdbdbd, -1.7, 1.4, -1.0, { seg: 6 });
  k.torus(0.17, 0.03, STEEL, -1.7, 2.4, -0.82, { seg: 10 });
  for (let i = 0; i < 4; i++) k.cyl(0.17 - i * 0.03, 0.22, i % 2 ? 0xfafafa : 0xff6d00, -1.7, 2.37 - i * 0.03, -0.7 + i * 0.22, { axis: 'z', r2: 0.17 - (i + 1) * 0.03, seg: 10, rx: 0.1 });
  // Fuel drums and a radio crate
  drum(k, 1.55, 0.3, -1.6, 0x4b5a2a, 0xfdd835);
  drum(k, 1.55, 0.3, -0.95, 0x4b5a2a, 0xfdd835);
  crate(k, -1.5, 0.52, 1.55, 0.6, 0.45, 0.45, 0x4e5b31);
  k.box(0.3, 0.16, 0.03, glowMat(u, 0x76ff03, 0.5), -1.5, 0.58, 1.79);
  antenna(k, -1.3, 0.75, 1.5, 1.0);
  k.done();
  const { heli, muzzles } = scoutCraft(u, level);
  u.plane = heli;
  u.heli = true;
  u.muzzles = muzzles;
  u.spin = null;
  u.flyHeight = 11;
  u.tracer = 0xffd740;
  u.projectile = { color: 0x424242, size: 0.6 };
  return u;
}

// ------------------------------------------------------------------ Combat Drone

/**
 * Combat Drone: a charging pad with a charger, plus a quadcopter the view hovers above it. Top
 * path: a longer barrel (Lv 1), an ammo box (Lv 2), a spinning gatling (Lv 3), rocket pods (Lv 4),
 * then the black X22 with red glow (Lv 5). Bottom path: a sensor camera (Lv 1), extra ammo (Lv 2),
 * then the Reaper Drone, a fixed-wing UAV with missiles (Lv 3), a spotter laser (Lv 4) and more
 * missiles (Lv 5).
 */
export function makeCombatDrone(level, bottom = false) {
  const u = makeThing();
  const top = !bottom;
  const key = `drone${level}${bottom ? 'B' : 'T'}`;
  const cyan = glowMat(u, 0x00e5ff);
  // The pad: a bevelled square, a glowing landing ring and corner bollards; a charger with a screen and a cable
  const k = kit(u, u.body, `${key}:pad`);
  k.slab(3.0, 0.4, 3.0, 0x37474f, 0, 0.2, 0, { tw: 0.95, td: 0.95 });
  k.plan(poly(6, 1.05, 0), 0.05, 0x263238, 0, 0.4, 0);
  k.torus(0.95, 0.04, cyan, 0, 0.45, 0, { rx: PI / 2, seg: 6 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    k.cyl(0.1, 0.35, HAZARD, sx * 1.3, 0.57, sz * 1.3, { seg: 8 });
    k.cyl(0.11, 0.06, DARK, sx * 1.3, 0.62, sz * 1.3, { seg: 8 });
  }
  k.box(0.75, 1.2, 0.45, 0x263238, 1.05, 1.0, -1.1, { r: 0.06 });
  k.box(0.5, 0.35, 0.03, cyan, 1.05, 1.25, -0.86);
  for (let i = 0; i < 3; i++) k.box(0.1, 0.06, 0.03, i ? 0x76ff03 : 0xff1744, 0.9 + i * 0.15, 0.85, -0.86);
  k.tube([[0.8, 0.5, -0.9], [0.5, 0.42, -0.6], [0.2, 0.43, -0.3]], 0.04, 0x111111, { sides: 4 });
  antenna(k, 1.25, 1.6, -1.2, 0.7);
  k.done();

  const heli = new THREE.Group();
  const bank = new THREE.Group();
  heli.add(bank);
  const muzzles = [];
  const missiles = [];
  const point = (x, y, z, list) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    bank.add(m);
    list.push(m);
  };
  const rotors = [];
  const d = kit(u, bank, key);
  const reaper = bottom && level >= 3;
  if (reaper) {
    const G = 0x9e9e9e;
    // Reaper: a slim body with a bulged nose, long thin wings, a V tail and a pusher propeller
    d.cyl(0.42, 4.4, G, 0, 0, 0, { axis: 'z', r2: 0.36, seg: 14 });
    d.ball(0.55, G, 0, 0.12, 2.2, { sx: 0.85, sy: 0.85, sz: 1.2, seg: 14, rows: 10 });
    d.cyl(0.42, 0.6, G, 0, 0, -2.4, { axis: 'z', r2: 0.18, seg: 14 });
    d.slab(8.0, 0.1, 0.8, G, 0, 0.18, 0.2, { tw: 0.98, td: 0.75 });
    for (const sx of [-1, 1]) {
      d.slab(1.7, 0.08, 0.65, G, sx * 0.7, 0.55, -2.0, { rz: sx * 0.6, td: 0.7 }); // V tail
      d.ball(0.05, glowMat(u, sx < 0 ? 0xff1744 : 0x00e676), sx * 4.0, 0.18, 0.2, { seg: 5, rows: 3 });
    }
    d.ball(0.3, DARK, 0, -0.5, 1.6, { seg: 10, rows: 8 }); // sensor ball
    d.cyl(0.13, 0.05, glowMat(u, level >= 4 ? 0xff1744 : 0x00e5ff), 0, -0.5, 1.9, { axis: 'z', seg: 10 });
    if (level >= 4) d.cyl(0.04, 0.1, glowMat(u, 0xff1744), 0.16, -0.62, 1.86, { axis: 'z', seg: 6 }); // spotter laser
    d.box(0.3, 0.08, 1.0, 0x37474f, 0, -0.38, -0.3); // belly
    antenna(d, 0, 0.3, -0.6, 0.4);
    const xs = level >= 5 ? [-2.6, -1.6, 1.6, 2.6] : [-1.6, 1.6];
    for (const x of xs) {
      d.box(0.08, 0.2, 0.5, DARK, x, 0.0, 0.3);
      d.cyl(0.11, 1.3, level >= 5 ? 0x37474f : 0x546e7a, x, -0.18, 0.3, { axis: 'z', seg: 10 });
      d.cyl(0.11, 0.2, 0xe53935, x, -0.18, 1.05, { axis: 'z', r2: 0.01, seg: 10 });
      for (let f = 0; f < 4; f++) d.box(0.02, 0.18, 0.2, 0x37474f, x, -0.18, -0.25, { rz: (f * PI) / 2 });
      point(x, -0.18, 1.2, muzzles);
    }
    missiles.push(...muzzles);
    // Pusher propeller: a rotor turned to face backward (it spins about z with the other rotors)
    const pusher = new THREE.Group();
    pusher.position.set(0, 0, -2.75);
    pusher.rotation.x = PI / 2;
    bank.add(pusher);
    rotors.push(rotor(u, pusher, 'reaperprop', 0, 0, 0, 3, 0.55, 0.12, 0x2b2b2b, null));
  } else {
    const x22 = top && level >= 5;
    const C = x22 ? 0x1a1a1a : 0x546e7a;
    const red = glowMat(u, 0xff1744);
    // Quadcopter: a rounded body with a canopy, four arms with motor pods, guarded rotors
    d.box(1.3, 0.5, 1.7, C, 0, 0, 0, { r: 0.2 });
    d.box(0.9, 0.25, 1.1, tone(C, 1.25), 0, 0.3, -0.05, { r: 0.12 });
    d.ball(0.12, x22 ? red : glowMat(u, 0x00e5ff), 0, 0.35, 0.55, { seg: 8, rows: 5 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * 1.1;
      const z = sz * 1.1;
      d.tube([[sx * 0.45, 0.05, sz * 0.55], [x, 0.15, z]], 0.08, DARK, { sides: 6, seg: 2 });
      d.cyl(0.17, 0.3, 0x37474f, x, 0.2, z, { seg: 10 });
      d.cyl(0.18, 0.05, x22 ? red : DARK, x, 0.33, z, { seg: 10 });
      d.torus(0.72, 0.035, x22 ? 0x2b2b2b : 0x78909c, x, 0.38, z, { rx: PI / 2, seg: 20 }); // prop guard
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * PI * 2 + PI / 6;
        d.box(0.6, 0.04, 0.04, 0x37474f, x + Math.cos(a) * 0.4, 0.37, z + Math.sin(a) * 0.4, { ry: -a });
      }
      d.ball(0.05, sz > 0 ? (sx < 0 ? glowMat(u, 0xff1744) : glowMat(u, 0x00e676)) : glowMat(u, 0xfafafa), x, 0.1, z + sz * 0.18, { seg: 5, rows: 3 });
      d.cyl(0.03, 0.35, DARK, sx * 0.45, -0.4, sz * 0.5, { seg: 4 }); // landing legs
      rotors.push(rotor(u, bank, x22 ? 'x22' : 'quad', x, 0.42, z, 2, 0.55, 0.13, 0x2b2b2b, x22 ? 0xff1744 : null));
    }
    if (x22) for (const sx of [-1, 1]) d.box(0.04, 0.12, 1.4, red, sx * 0.66, 0, 0);
    // Gun on a gimbal under the nose
    const gy = -0.45;
    const gz = 0.55;
    d.cyl(0.2, 0.2, DARK, 0, -0.3, gz, { seg: 10 });
    d.box(0.42, 0.38, 0.6, 0x263238, 0, gy, gz, { r: 0.08 });
    if (top && level >= 3) {
      spinBarrels(u, bank, `${key}:gat`, 0, gy, gz + 0.3, 1.2, 6, 0.12, GUN, x22 ? red : null);
      point(0, gy, gz + 1.6, muzzles);
    } else {
      const len = top && level >= 1 ? 1.3 : 0.85;
      barrel(d, 0, gy, gz + 0.3, len, 0.07, GUN, { sleeve: top && level >= 1, brake: top && level >= 1 });
      point(0, gy, gz + 0.35 + len, muzzles);
    }
    if (level >= 2) {
      crate(d, 0.55, -0.45, -0.3, 0.42, 0.34, 0.55, 0x4e5b31); // ammo box
      d.tube([[0.4, -0.35, -0.05], [0.25, -0.4, 0.3], [0.15, -0.45, 0.4]], 0.035, 0xc9a227, { sides: 4 });
    }
    if (bottom && level >= 1) {
      // Sensor camera on its own little gimbal at the back
      d.ball(0.24, DARK, 0, -0.42, -0.5, { seg: 10, rows: 7 });
      d.cyl(0.11, 0.05, glowMat(u, 0x00e5ff), 0, -0.42, -0.28, { axis: 'z', seg: 10 });
    }
    if (top && level >= 4) for (const sx of [-1, 1]) {
      d.box(0.5, 0.06, 0.2, DARK, sx * 0.65, -0.15, 0.1);
      rocketPod(d, u, sx * 0.95, -0.35, 0.2, 0.18, 1.0, 0x37474f);
      point(sx * 0.95, -0.35, 0.9, missiles);
    }
    if (x22) bank.scale.setScalar(1.25);
  }
  d.done();
  const bay = new THREE.Object3D();
  bay.position.set(0, -0.6, 0);
  bank.add(bay);
  heli.userData = { bank, prop: null, tail: null, bay, missiles, rotors };
  u.plane = heli;
  u.heli = true;
  u.muzzles = muzzles;
  u.spin = u.spin?.length ? u.spin : null;
  u.flyHeight = reaper ? 12 : 7;
  u.tracer = top && level >= 5 ? 0xff1744 : 0xffd740;
  if (top && level >= 5) u.tracerWidth = 0.3;
  u.projectile = { color: 0x9e9e9e, size: 0.5 };
  return u;
}
export const makeCombatDroneBottom = (level) => makeCombatDrone(level, true);

// ------------------------------------------------------------------ Plantation

/**
 * Plantation: rows of cotton in front of a farm building. Lv 0-1 a tool shed (a fence at Lv 1),
 * Lv 2 a red barn and a silo, Lv 3 a white plantation house with a porch and a silo, Lv 4 a water
 * tower and hay bales instead of the silo, Lv 5 golden fields, gold trim and a weathervane.
 */
export function makePlantation(level) {
  const u = makeThing();
  const golden = level >= 5;
  const k = kit(u, u.body, `plantation${level}`);
  k.slab(4.4, 0.3, 4.4, 0x6d4c41, 0, 0.15, 0, { tw: 0.98, td: 0.98 }); // soil
  if (golden) k.box(4.46, 0.08, 4.46, glowMat(u, 0xffb300, 0.4), 0, 0.28, 0);
  // Cotton rows: ridged furrows, stems with leaves, white bolls (gold at Lv 5)
  const rows = [2, 3, 3, 4, 4, 4][level];
  const ph = 0.45 + level * 0.12;
  const stem = golden ? 0xc9a227 : [0x7cb342, 0x689f38, 0x689f38, 0x558b2f, 0x558b2f][level];
  const boll = golden ? glowMat(u, 0xffd740, 0.5) : level >= 3 ? 0xfafafa : level >= 1 ? 0xc5e1a5 : null;
  for (let i = 0; i < rows; i++) {
    const z = 1.85 - i * 0.5;
    k.box(4.0, 0.12, 0.3, 0x4e342e, 0, 0.33, z, { r: 0.05 });
    for (let j = 0; j < 6; j++) {
      const x = -1.75 + j * 0.7 + (i % 2) * 0.15;
      k.cyl(0.035, ph, 0x5d4037, x, 0.36 + ph / 2, z, { seg: 5 });
      for (const s of [-1, 1]) k.ball(0.15, stem, x + s * 0.1, 0.36 + ph * (s > 0 ? 0.5 : 0.7), z, { sy: 0.45, seg: 6, rows: 4 });
      k.ball(0.17, stem, x, 0.36 + ph, z, { seg: 7, rows: 5 });
      if (boll != null) for (const [ox, oz] of [[0.1, 0.06], [-0.08, -0.06], [0, 0.12]]) k.ball(0.08, boll, x + ox, 0.42 + ph + 0.05, z + oz, { seg: 6, rows: 4 });
    }
  }
  const roofC = golden ? 0x5d4037 : 0x4e342e;
  if (level < 2) {
    // Tool shed: plank walls, a sloped roof, a door and a wheelbarrow
    const sx = -1.3;
    const sz = -1.4;
    k.box(1.4, 1.2, 1.2, WOOD, sx, 0.9, sz);
    for (let i = 0; i < 5; i++) k.box(0.03, 1.2, 1.22, tone(WOOD, 0.8), sx - 0.6 + i * 0.3, 0.9, sz);
    k.slab(1.65, 0.12, 1.5, roofC, sx, 1.6, sz, { rx: 0.18 });
    k.box(0.5, 0.85, 0.05, 0x4e342e, sx, 0.72, sz + 0.62);
    k.ball(0.04, 0xc9a227, sx + 0.17, 0.75, sz + 0.66, { seg: 5, rows: 3 });
    k.box(0.5, 0.2, 0.7, 0x78909c, -0.2, 0.62, -1.3, { r: 0.05 });
    k.cyl(0.13, 0.06, DARK, -0.2, 0.45, -0.88, { axis: 'x', seg: 10 });
    for (const s of [-1, 1]) k.cyl(0.025, 0.7, WOOD, -0.2 + s * 0.2, 0.62, -1.75, { axis: 'z', seg: 4, rx: -0.3 });
    if (level >= 1) fence(k, [-2.05, 2.15], [2.05, 2.15], 0.3, 0.6, 0xbcaaa4);
  } else if (level === 2) {
    // Red barn with a gambrel roof, a white cross door and a ribbed silo
    const bx = -0.9;
    const bz = -1.2;
    const prof = [[-1.1, 0], [1.1, 0], [1.1, 1.5], [0.72, 2.2], [0, 2.6], [-0.72, 2.2], [-1.1, 1.5]];
    k.prism(prof, 1.8, 0xc62828, bx, 0.3, bz, { ry: PI / 2 });
    for (let i = 2; i <= 5; i++) {
      const [ax, ay] = prof[i];
      const [cx, cy] = prof[i + 1];
      const a = Math.atan2(cy - ay, cx - ax);
      k.box(Math.hypot(cx - ax, cy - ay) + 0.14, 0.1, 2.05, roofC, bx + (ax + cx) / 2 + Math.sin(a) * 0.05, 0.3 + (ay + cy) / 2 - Math.cos(a) * 0.05, bz, { rz: a });
    }
    k.box(1.0, 1.2, 0.05, 0x8e1c1c, bx, 0.9, bz + 0.91);
    k.box(1.06, 1.26, 0.03, 0xfafafa, bx, 0.9, bz + 0.9);
    for (const s of [-1, 1]) k.box(0.08, 1.45, 0.04, 0xfafafa, bx, 0.9, bz + 0.94, { rz: s * 0.68 });
    k.box(0.5, 0.45, 0.05, 0x3e2723, bx, 2.1, bz + 0.91);
  } else {
    // Plantation house: white walls, a hipped roof, a columned porch, windows with shutters, a chimney
    const white = golden ? 0xfff8e1 : 0xf5f5f5;
    const hx = -0.6;
    const hz = -1.35;
    k.box(2.8, 2.5, 1.5, white, hx, 1.55, hz);
    for (let i = 0; i < 8; i++) k.box(2.82, 0.03, 1.52, tone(white, 0.9), hx, 0.5 + i * 0.3, hz); // siding
    k.slab(3.1, 0.9, 1.8, roofC, hx, 3.25, hz, { tw: 0.55, td: 0.2 });
    k.box(0.4, 1.0, 0.4, 0x8d6e63, hx + 1.0, 3.5, hz - 0.3);
    k.box(0.48, 0.1, 0.48, 0x5d4037, hx + 1.0, 4.0, hz - 0.3);
    k.box(3.0, 0.15, 0.85, WOOD, hx, 0.38, hz + 1.15); // porch floor
    for (let i = 0; i < 3; i++) k.box(1.0, 0.1, 0.25, WOOD, hx, 0.35 - i * 0.02, hz + 1.65 + i * 0.12);
    k.box(3.1, 0.15, 0.95, golden ? glowMat(u, 0xffc400, 0.4) : white, hx, 2.8, hz + 1.12); // porch roof
    for (const x of [-1.3, -0.45, 0.45, 1.3]) {
      k.cyl(0.11, 2.3, white, hx + x, 1.6, hz + 1.45, { r2: 0.09, seg: 10 });
      k.box(0.28, 0.1, 0.28, tone(white, 0.9), hx + x, 0.5, hz + 1.45);
      k.box(0.28, 0.1, 0.28, tone(white, 0.9), hx + x, 2.7, hz + 1.45);
    }
    for (let i = 0; i < 9; i++) k.box(0.04, 0.4, 0.04, white, hx - 1.35 + i * 0.34, 0.65, hz + 1.5); // railing
    k.box(2.75, 0.05, 0.05, white, hx, 0.86, hz + 1.5);
    for (const x of [-0.9, 0.9]) for (const y of [1.2, 2.3]) {
      windowAt(k, hx + x, y, hz + 0.76, 0.42, 0.55, 0xfafafa);
      for (const s of [-1, 1]) k.box(0.16, 0.6, 0.03, 0x2e5d3a, hx + x + s * 0.32, y, hz + 0.77);
    }
    k.box(0.6, 1.1, 0.05, 0x5d4037, hx, 0.95, hz + 0.77); // door
    k.box(0.7, 0.1, 0.07, white, hx, 1.55, hz + 0.78);
    if (level >= 4) {
      // Water tower on stilts with a ladder, and stacked hay bales
      const tx = 1.6;
      const tz = -1.5;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.cyl(0.07, 2.4, WOOD, tx + sx * 0.4, 1.5, tz + sz * 0.4, { seg: 6 });
      for (const sx of [-1, 1]) k.box(0.05, 0.05, 1.1, WOOD, tx + sx * 0.4, 1.4, tz, { rx: 0.7 });
      k.cyl(0.65, 1.1, golden ? 0xc9a227 : 0x8d6e63, tx, 3.25, tz, { seg: 16 });
      for (const y of [2.9, 3.6]) k.torus(0.66, 0.03, 0x424242, tx, y, tz, { rx: PI / 2, seg: 16 });
      k.cyl(0.72, 0.4, roofC, tx, 4.0, tz, { r2: 0.05, seg: 16 });
      k.cyl(0.05, 0.6, 0x424242, tx - 0.5, 2.5, tz + 0.4, { seg: 4, rz: 0.3 });
      const hay = golden ? 0xffd54f : 0xe6c35c;
      for (const [y, z] of [[0.55, -0.3], [0.55, 0.25], [1.05, 0.0]]) {
        k.box(0.75, 0.5, 0.5, hay, 1.6, y, z, { r: 0.08 });
        for (const f of [-0.2, 0.2]) k.box(0.77, 0.52, 0.03, 0xb08a2a, 1.6, y, z + f);
      }
    }
  }
  if (level >= 2 && level <= 3) {
    // Ribbed silo with a dome and a ladder
    const sx = 1.45;
    const sz = -1.35;
    k.cyl(0.6, 3.4, 0xb0bec5, sx, 2.0, sz, { seg: 18 });
    for (let i = 0; i < 6; i++) k.torus(0.6, 0.03, 0x90a4ae, sx, 0.6 + i * 0.6, sz, { rx: PI / 2, seg: 18 });
    k.ball(0.62, 0x78909c, sx, 3.7, sz, { seg: 16, rows: 8, sy: 0.7 });
    for (const dx of [-0.15, 0.15]) k.box(0.04, 3.3, 0.04, DARK, sx + dx, 1.95, sz + 0.64);
    for (let y = 0.6; y < 3.5; y += 0.3) k.box(0.3, 0.03, 0.03, DARK, sx, y, sz + 0.64);
  }
  if (golden) {
    // A golden weathervane on the roof
    const g = glowMat(u, 0xffc400, 0.6);
    k.cyl(0.04, 1.0, g, -0.6, 4.1, -1.35, { seg: 5 });
    k.box(0.7, 0.2, 0.05, g, -0.45, 4.5, -1.35);
    k.cyl(0.08, 0.2, g, -0.85, 4.5, -1.35, { axis: 'x', r2: 0.01, seg: 6 });
    for (const a of [0, PI / 2]) k.box(0.5, 0.03, 0.03, g, -0.6, 4.25, -1.35, { ry: a });
  }
  k.done();
  u.static = true;
  return u;
}

// ------------------------------------------------------------------ Focus

/**
 * Focus: a rapid-fire energy turret on a stand. More barrels, cooling fins and glow per level:
 * Lv 2 side struts and two barrels, Lv 3 coolant tanks at the back, Lv 4 three barrels, Lv 5
 * white-hot with a heat shimmer round the head.
 */
export function makeFocus(level) {
  const u = makeThing();
  const hot = level >= 5;
  const coreC = hot ? 0xf0fffc : [0x00e676, 0x1de9b6, 0x1de9b6, 0x00e5ff, 0x18ffff][level];
  const core = glowMat(u, coreC, 0.6 + level * 0.1);
  const metal = hot ? 0xcfd8dc : 0x546e7a;
  const k = kit(u, u.body, `focus${level}`);
  pad(k, 4.0, 0.45, 0x9e9e9e);
  ring(k, 1.15, 0.6, 0.3);
  // Stand: a tapered column with a glowing power line and side struts (Lv 2+)
  k.cyl(0.55, 1.5, metal, 0, 1.45, 0, { r2: 0.4, seg: 10 });
  k.box(0.1, 1.3, 0.06, core, 0, 1.45, 0.48, { rx: -0.1 });
  if (level >= 2) for (const s of [-1, 1]) k.slab(0.2, 1.4, 1.4, 0x263238, s * 0.6, 1.4, 0, { td: 0.5, tw: 0.8 });
  k.done();
  const head = new THREE.Group();
  head.position.set(0, 2.4, 0);
  u.body.add(head);
  const h = kit(u, head, `focus${level}:head`);
  const hw = 1.8 + Math.min(level, 4) * 0.15;
  h.cyl(0.45, 0.25, DARK, 0, 0.05, -0.2, { seg: 14 });
  h.box(hw, 1.25, 2.0, metal, 0, 0.6, -0.2, { r: 0.22 });
  h.box(hw * 0.6, 0.18, 1.1, core, 0, 1.26, -0.35, { r: 0.06 }); // core window
  for (const s of [-1, 1]) h.box(0.08, 0.2, 1.1, tone(metal, 0.7), s * hw * 0.32, 1.27, -0.35);
  // Cooling fins down both sides
  const fins = 2 + level;
  for (let i = 0; i < fins; i++) {
    const z = -1.0 + (1.6 * i) / Math.max(1, fins - 1);
    for (const s of [-1, 1]) h.box(0.4 + level * 0.05, 0.95, 0.07, hot ? 0xeceff1 : 0x263238, s * (hw / 2 + 0.18 + level * 0.025), 0.6, z);
  }
  // Barrels: an emitter block, a barrel with glowing focus rings and a glowing tip
  const n = [1, 1, 2, 2, 3, 3][level];
  const xs = n === 1 ? [0] : n === 2 ? [-0.45, 0.45] : [-0.65, 0, 0.65];
  const len = 2.2 + level * 0.2;
  for (const x of xs) {
    h.box(0.55, 0.55, 0.5, 0x263238, x, 0.6, 0.95, { r: 0.08 });
    h.cyl(0.14, len, metal, x, 0.6, 1.2 + len / 2, { axis: 'z', r2: 0.12, seg: 12 });
    for (let i = 0; i < 2 + Math.floor(level / 2); i++) h.torus(0.2, 0.05, core, x, 0.6, 1.5 + i * 0.45, { seg: 14 });
    h.cyl(0.2, 0.3, 0x263238, x, 0.6, 1.2 + len, { axis: 'z', r2: 0.24, seg: 12 });
    h.cyl(0.14, 0.05, core, x, 0.6, 1.36 + len, { axis: 'z', seg: 12 });
    gunMuzzle(u, head, x, 0.6, 1.4 + len);
  }
  if (level >= 3) {
    // Coolant tanks at the back with a glowing feed pipe
    for (const s of [-1, 1]) {
      h.cyl(0.26, 0.9, 0x37474f, s * 0.5, 0.6, -1.5, { seg: 12 });
      for (const y of [0.3, 0.9]) h.torus(0.26, 0.03, STEEL, s * 0.5, y, -1.5, { rx: PI / 2, seg: 12 });
    }
    h.cyl(0.06, 1.2, core, 0, 1.1, -1.5, { axis: 'x', seg: 8 });
  }
  h.done();
  if (hot) {
    // White-hot: a heat shimmer round the head
    const halo = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), seeThrough(u, 0xfffde7, 0.25, true));
    halo.scale.set(hw * 0.75, 1.0, 1.6);
    halo.position.set(0, 0.6, -0.1);
    halo.castShadow = false;
    head.add(halo);
  }
  u.static = true;
  u.tracer = hot ? 0xe0f7fa : 0x1de9b6;
  u.tracerWidth = 0.12 + level * 0.02;
  return u;
}

// ------------------------------------------------------------------ Ducky Nest

/** A small wooden duck on `k` facing +z, standing on y (the Lv 4 Trojan duck). */
function woodDuck(k, x, y, z, s) {
  const W = 0xa1887f;
  k.ball(0.6 * s, W, x, y + 0.75 * s, z - 0.1 * s, { sx: 0.8, sz: 1.1, seg: 12, rows: 8 });
  k.slab(0.5 * s, 0.35 * s, 0.4 * s, W, x, y + 0.95 * s, z - 0.75 * s, { tw: 0.6, tz: -0.1 * s, rx: -0.4 }); // tail
  for (const sx of [-1, 1]) k.ball(0.3 * s, 0x8d6e63, x + sx * 0.45 * s, y + 0.8 * s, z - 0.15 * s, { sx: 0.3, sz: 1.2, seg: 8, rows: 5 });
  k.ball(0.38 * s, W, x, y + 1.45 * s, z + 0.35 * s, { seg: 10, rows: 7 });
  k.ball(0.2 * s, 0x795548, x, y + 1.38 * s, z + 0.72 * s, { sx: 1.1, sy: 0.4, sz: 1.2, seg: 8, rows: 5 });
  for (const sx of [-1, 1]) k.ball(0.05 * s, 0x3e2723, x + sx * 0.18 * s, y + 1.55 * s, z + 0.65 * s, { seg: 5, rows: 3 });
  for (let i = 0; i < 3; i++) k.box(0.03, 0.6 * s, 0.03, 0x6d4c41, x + (i - 1) * 0.25 * s, y + 0.75 * s, z + 0.32 * s, { rx: 0.3 }); // planks
}

/**
 * Ducky Nest: a nest of twigs round a concrete bunker painted with a yellow stripe, a duck peeking
 * out of the roof and eggs in the nest. Lv 1 an army cap and a flag, Lv 2 a radar dish, Lv 3 a rail
 * gun on the roof, Lv 4 a wooden Trojan duck on a cart, Lv 5 an engineer crane over the bunker.
 */
export function makeDuckyNest(level) {
  const u = makeThing();
  const YEL = 0xffd600;
  const BEAK = 0xff8f00;
  const k = kit(u, u.body, `duckynest${level}`);
  k.slab(4.4, 0.3, 4.4, 0x7cb342, 0, 0.15, 0, { tw: 0.98, td: 0.98 }); // grass
  // Nest: a thick ring of straw with criss-crossing twigs
  k.torus(1.75, 0.38, 0x8d6e63, 0, 0.45, 0, { rx: PI / 2, sy: 0.7, seg: 28 });
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * PI * 2;
    const r = 1.75 + Math.sin(i * 2.3) * 0.25;
    k.cyl(0.04, 1.0, i % 3 ? 0x6d4c41 : 0xa1887f, Math.cos(a) * r, 0.55 + (i % 2) * 0.12, Math.sin(a) * r, { seg: 4, axis: 'x', ry: -a - PI / 2 + (i % 2 ? 0.35 : -0.35), rz: i % 2 ? 0.15 : -0.15 }); // along the ring
  }
  // Bunker: rounded concrete with a yellow band, an overhanging roof slab, a gun slit and a back door
  k.box(2.4, 1.4, 2.0, 0x9e9e9e, 0, 1.0, -0.1, { r: 0.18 });
  k.box(2.44, 0.28, 2.04, YEL, 0, 1.25, -0.1, { r: 0.1 });
  k.slab(2.7, 0.25, 2.3, 0x757575, 0, 1.82, -0.1, { tw: 0.92, td: 0.92 });
  k.box(1.4, 0.22, 0.1, 0x111111, 0, 0.95, 0.9);
  k.box(1.6, 0.06, 0.2, 0x757575, 0, 1.1, 0.95);
  k.box(0.6, 0.9, 0.06, 0x5d4037, 0.5, 0.75, -1.12);
  bolts(k, [-1.0, 1.55, 0.92], [1.0, 1.55, 0.92], 6, 0x616161, 0.04);
  // Eggs in the nest, with speckles
  const eggs = Math.min(4, 1 + level);
  for (let i = 0; i < eggs; i++) {
    const x = -1.3 + i * 0.85;
    k.ball(0.24, 0xfafafa, x, 0.62, 1.45, { sy: 1.3, seg: 10, rows: 8 });
    for (const [ox, oy] of [[0.1, 0.1], [-0.08, -0.05], [0.04, -0.15]]) k.ball(0.03, 0xbcaaa4, x + ox, 0.62 + oy, 1.68, { seg: 4, rows: 3 });
  }
  // The duck peeking out of a hatch on the roof
  const dx = -0.5;
  const dy = 1.95;
  const dz = 0.4;
  k.cyl(0.6, 0.12, 0x616161, dx, dy, dz, { seg: 14 });
  k.ball(0.52, YEL, dx, dy + 0.5, dz, { seg: 14, rows: 10 });
  k.ball(0.28, BEAK, dx, dy + 0.35, dz + 0.5, { sx: 1.1, sy: 0.35, sz: 1.2, seg: 10, rows: 6 });
  for (const sx of [-1, 1]) {
    k.ball(0.1, 0xfafafa, dx + sx * 0.22, dy + 0.65, dz + 0.42, { seg: 8, rows: 5 });
    k.ball(0.05, 0x111111, dx + sx * 0.22, dy + 0.66, dz + 0.5, { seg: 6, rows: 4 });
  }
  if (level >= 1) {
    // Army cap and a flag
    k.ball(0.55, 0x556b2f, dx, dy + 0.7, dz, { sy: 0.55, seg: 14, rows: 6 });
    k.box(0.7, 0.05, 0.4, 0x4e5b31, dx, dy + 0.72, dz + 0.5);
    flagPole(k, -1.8, 0.3, -1.8, 3.3, YEL, BEAK);
  }
  if (level >= 3) {
    // Rail gun on the roof: a base, two glowing rails, coils and a muzzle block
    const cyanG = glowMat(u, 0x18ffff);
    const rx = 0.6;
    k.cyl(0.45, 0.15, DARK, rx, 2.02, -0.3, { seg: 16 });
    k.torus(0.42, 0.05, STEEL, rx, 2.1, -0.3, { rx: PI / 2, seg: 16 });
    k.box(0.8, 0.5, 0.9, 0x37474f, rx, 2.32, -0.3, { r: 0.08 });
    k.box(0.3, 0.3, 2.6, 0x263238, rx, 2.4, 0.9);
    for (const sx of [-1, 1]) k.box(0.07, 0.36, 2.3, cyanG, rx + sx * 0.18, 2.4, 0.95);
    for (const z of [0.3, 0.8, 1.3]) k.torus(0.26, 0.05, 0xb87333, rx, 2.4, z, { seg: 12 });
    k.box(0.5, 0.5, 0.2, 0x263238, rx, 2.4, 2.2);
    k.box(0.3, 0.3, 0.06, cyanG, rx, 2.4, 2.32);
    gunMuzzle(u, u.body, rx, 2.4, 2.35);
  }
  if (level >= 4) {
    // Trojan duck on a wooden cart with round wheels
    k.box(1.2, 0.15, 1.4, 0x5d4037, 1.45, 0.55, 1.35);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      k.cyl(0.2, 0.08, 0x4e342e, 1.45 + sx * 0.62, 0.42, 1.35 + sz * 0.5, { axis: 'x', seg: 12 });
      k.cyl(0.06, 0.1, 0x3e2723, 1.45 + sx * 0.64, 0.42, 1.35 + sz * 0.5, { axis: 'x', seg: 6 });
    }
    woodDuck(k, 1.45, 0.62, 1.35, 0.7);
  }
  if (level >= 5) {
    // Engineer crane: a lattice mast, a jib with a counterweight, a cab, a cable and hook, a beacon
    const CR = 0xffb300;
    const cx = -1.4;
    const cz = -1.1;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(0.07, 5.0, 0.07, CR, cx + sx * 0.22, 2.8, cz + sz * 0.22);
    for (let y = 0.6; y < 5.2; y += 0.5) for (const [a, b] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) {
      k.tube([[cx + a[0] * 0.22, y, cz + a[1] * 0.22], [cx + b[0] * 0.22, y + 0.5, cz + b[1] * 0.22]], 0.02, tone(CR, 0.8), { sides: 3, seg: 2 });
    }
    k.box(0.6, 0.55, 0.6, 0xfafafa, cx, 5.0, cz, { r: 0.06 });
    k.box(0.45, 0.3, 0.04, GLASS, cx, 5.05, cz + 0.31);
    k.box(0.4, 0.35, 4.0, CR, cx, 5.45, cz + 0.8);
    for (let i = 0; i < 8; i++) k.box(0.42, 0.04, 0.04, 0x424242, cx, 5.63, cz - 0.9 + i * 0.5);
    k.box(0.7, 0.6, 0.8, 0x424242, cx, 5.35, cz - 1.0);
    k.cyl(0.02, 1.8, 0x212121, cx, 4.45, cz + 2.6, { seg: 3 });
    k.box(0.35, 0.2, 0.2, 0x616161, cx, 3.5, cz + 2.6);
    k.torus(0.12, 0.03, 0x616161, cx, 3.3, cz + 2.6, { ry: PI / 2, seg: 8, arc: PI * 1.4 });
    k.ball(0.12, glowMat(u, 0xff6d00), cx, 5.75, cz, { seg: 6, rows: 4 });
  }
  k.done();
  if (level >= 2) {
    // Radar dish on a post, slowly sweeping round
    const r = kit(u, u.body, 'duckymast');
    r.cyl(0.25, 0.2, DARK, 1.8, 0.4, -1.6, { seg: 10 });
    r.cyl(0.07, 1.6, 0x424242, 1.8, 1.25, -1.6, { seg: 6 });
    r.done();
    const sp = spinner(u, u.body, 1.8, 2.05, -1.6);
    dish(u, sp, 'duckydish', 0, 0, 0, 0.6, 0xcfd8dc, glowMat(u, 0xff1744));
    u.idleSpin = 1.0;
  }
  u.static = true;
  return u;
}

// ------------------------------------------------------------------ Trawler

/**
 * Trawler (water): a fishing boat with a wheelhouse forward and a net crane aft. Longer hull and
 * more nets each level, Lv 2 a radar bar, Lv 3 a funnel and nets out on both sides, Lv 4 a weather
 * radar dome, Lv 5 a big dark-blue industrial trawler with an orange gantry and two nets.
 */
export function makeTrawler(level) {
  level = Math.max(0, Math.min(5, level | 0));
  const u = makeThing();
  const ind = level >= 5;
  const L = [4.4, 5.0, 5.6, 6.2, 6.8, 8.0][level];
  const W = [2.0, 2.2, 2.4, 2.6, 2.8, 3.3][level];
  const hh = [0.9, 1.0, 1.1, 1.2, 1.3, 1.6][level];
  const hullC = ind ? 0x1a3a5c : level >= 3 ? 0x1565c0 : 0xc62828;
  const trim = ind ? 0xff6d00 : 0xeceff1;
  const zc = -0.3;
  const dy = hh - 0.4;
  const key = `trawler${level}`;
  const k = kit(u, u.body, key);
  hull(k, L, W, -0.45, dy, hullC, { z: zc, bow: W * 0.75, stripe: trim, deck: 0x8d6e63, rail: false });
  // Bulwarks along both sides with scuppers, and a raised bow
  for (const sx of [-1, 1]) {
    k.box(0.1, 0.35, L - W * 0.75 - 0.2, trim, sx * (W / 2 - 0.06), dy + 0.17, zc - W * 0.37);
    for (let i = 0; i < 4; i++) k.box(0.12, 0.08, 0.2, 0x263238, sx * (W / 2 - 0.06), dy + 0.04, zc - L / 2 + 0.8 + i * 0.8);
    k.box(0.04, 0.18, 0.3, 0xfafafa, sx * (W / 2 + 0.01), dy - 0.2, zc + L / 2 - W * 0.9); // hull number
  }
  k.slab(W * 0.55, 0.35, W * 0.5, trim, 0, dy + 0.17, zc + L / 2 - W * 0.45, { td: 0.4, tz: 0.1 });
  // Wheelhouse: windows all round, a roof with an overhang, a mast and lights
  const whH = [1.0, 1.1, 1.2, 1.3, 1.4, 1.9][level];
  const wz = zc + L * 0.18;
  const ww = W * 0.62;
  k.box(ww, whH, 1.5, 0xeceff1, 0, dy + whH / 2, wz, { r: 0.06 });
  k.box(ww * 0.88, whH * 0.3, 0.04, GLASS, 0, dy + whH * 0.72, wz + 0.76);
  for (const sx of [-1, 1]) {
    k.box(0.04, whH * 0.3, 1.0, GLASS, sx * (ww / 2 + 0.01), dy + whH * 0.72, wz);
    k.box(0.05, whH * 0.55, 0.45, tone(0xeceff1, 0.85), sx * (ww / 2 + 0.01), dy + whH * 0.35, wz - 0.45); // door
    k.torus(0.18, 0.06, 0xff6d00, sx * (ww / 2 + 0.06), dy + whH * 0.4, wz + 0.25, { ry: PI / 2, seg: 12 }); // life ring
  }
  k.slab(ww + 0.2, 0.12, 1.75, hullC, 0, dy + whH + 0.06, wz + 0.05, { tw: 0.95, td: 0.95 });
  const roof = dy + whH + 0.12;
  k.cyl(0.05, 1.2, DARK, 0.25, roof + 0.6, wz - 0.4, { seg: 6 });
  antenna(k, -0.35, roof, wz - 0.5, 0.9);
  lamp(k, -0.3, roof + 0.15, wz + 0.65, 0.12, 0xfff59d);
  lamp(k, 0.3, roof + 0.15, wz + 0.65, 0.12, 0xfff59d);
  k.ball(0.07, glowMat(u, 0xff1744), -ww / 2, dy + whH * 0.95, wz + 0.7, { seg: 6, rows: 4 });
  k.ball(0.07, glowMat(u, 0x00e676), ww / 2, dy + whH * 0.95, wz + 0.7, { seg: 6, rows: 4 });
  if (level >= 2) k.box(1.0, 0.08, 0.18, DARK, 0.25, roof + 1.2, wz - 0.4); // radar bar
  if (level >= 3) {
    // Funnel with a black top
    k.cyl(0.26, 1.0, ind ? 0x263238 : 0x37474f, W * 0.2, roof + 0.4, wz - 0.6, { r2: 0.22, seg: 12 });
    k.cyl(0.24, 0.2, 0x111111, W * 0.2, roof + 0.98, wz - 0.6, { seg: 12 });
  }
  if (level >= 4) {
    // Weather radar dome on a stand
    k.cyl(0.12, 0.5, 0x9e9e9e, -0.4, roof + 0.25, wz - 0.2, { seg: 8 });
    k.cyl(0.5, 0.45, 0xfafafa, -0.4, roof + 0.7, wz - 0.2, { r2: 0.55, seg: 16 });
    k.ball(0.55, 0xfafafa, -0.4, roof + 0.92, wz - 0.2, { sy: 0.6, seg: 16, rows: 6 });
  }
  // Nets: piles of green net with orange floats on the aft deck
  const piles = [1, 1, 2, 2, 3, 4][level];
  for (let i = 0; i < piles; i++) {
    const x = (i % 2 ? 1 : -1) * W * 0.2 * (piles > 1 ? 1 : 0);
    const z = zc - L * 0.08 - Math.floor(i / 2) * 1.0;
    k.ball(0.5, i % 2 ? 0x1b5e20 : 0x2e7d32, x, dy + 0.1, z, { sy: 0.5, sz: 0.85, seg: 10, rows: 6 });
    for (const [ox, oz] of [[0.3, 0.2], [-0.25, -0.15], [0.05, -0.3]]) k.ball(0.09, 0xff9800, x + ox, dy + 0.3, z + oz, { seg: 6, rows: 4 });
  }
  // Net drum at the stern on two stands
  const drumZ = zc - L / 2 + 0.9;
  k.cyl(0.4, W * 0.55, 0x2e7d32, 0, dy + 0.55, drumZ, { axis: 'x', seg: 14 });
  for (const sx of [-1, 1]) {
    k.cyl(0.55, 0.06, DARK, sx * W * 0.28, dy + 0.55, drumZ, { axis: 'x', seg: 14 });
    k.slab(0.12, 0.6, 0.6, DARK, sx * W * 0.32, dy + 0.3, drumZ, { td: 0.5 });
  }
  k.done();

  // Crane boom (Lv 5: a gantry) over the stern, with a net hanging off it
  const crane = new THREE.Group();
  crane.position.set(0, dy, zc - L / 2 + 0.4);
  u.body.add(crane);
  const c = kit(u, crane, `${key}:crane`);
  const net = seeThrough(u, 0x43a047, 0.75);
  const CR = ind ? 0xff6d00 : 0xfbc02d;
  const hangNet = (x, y, z, w, h) => {
    c.box(w, h, 0.45, net, x, y, z, { r: 0.12 });
    for (const f of [-0.25, 0.25]) c.box(w + 0.03, 0.05, 0.48, 0x1b5e20, x, y + f * h, z);
    for (const sx of [-1, 1]) c.ball(0.09, 0xff9800, x + (sx * w) / 2, y + h / 2, z, { seg: 6, rows: 4 });
    c.cyl(0.02, 0.6, 0x212121, x, y + h / 2 + 0.3, z, { seg: 3 });
  };
  if (ind) {
    for (const sx of [-1, 1]) {
      c.box(0.3, 3.2, 0.3, CR, sx * (W / 2 - 0.3), 1.5, -0.2, { rx: -0.25 });
      c.box(0.5, 0.15, 0.5, DARK, sx * (W / 2 - 0.3), 0.05, 0.15);
    }
    c.box(W - 0.2, 0.35, 0.35, CR, 0, 3.0, -0.6, { r: 0.05 });
    for (const x of [-0.7, 0.7]) {
      c.cyl(0.15, 0.2, DARK, x, 2.75, -0.6, { axis: 'x', seg: 10 }); // block
      hangNet(x, 1.4, -0.65, 0.9, 1.2);
      gunMuzzle(u, crane, x, 1.4, -0.7);
    }
  } else {
    const ch = [1.8, 2.0, 2.2, 2.4, 2.6][level];
    c.cyl(0.13, ch, CR, 0, ch / 2, 0.3, { seg: 10 });
    c.cyl(0.25, 0.15, DARK, 0, 0.08, 0.3, { seg: 12 });
    c.cyl(0.07, 1.9, CR, 0, ch - 0.3, -0.35, { axis: 'z', seg: 8, rx: 0.35 });
    c.cyl(0.1, 0.12, DARK, 0, ch - 0.6, -1.2, { axis: 'x', seg: 8 }); // block
    const nw = level >= 2 ? 1.0 : 0.75;
    hangNet(0, ch - 1.4, -1.15, nw, 0.9);
    gunMuzzle(u, crane, 0, ch - 1.4, -1.2);
  }
  c.done();
  if (!ind && level >= 1) {
    // Outrigger poles with nets out on the water (both sides from Lv 3)
    const o = kit(u, u.body, `${key}:out`);
    for (const sx of level >= 3 ? [-1, 1] : [1]) {
      const x = sx * (W / 2);
      const z = zc - L * 0.15;
      o.tube([[x, dy + 0.2, z], [x + sx * 0.8, dy + 1.6, z], [x + sx * 1.3, dy + 1.4, z - 0.1]], 0.05, DARK, { sides: 5 });
      o.cyl(0.015, 0.8, 0x212121, x + sx * 1.3, dy + 1.0, z - 0.1, { seg: 3 });
      o.box(0.5, 0.6, 1.4, net, x + sx * 1.3, dy + 0.35, z - 0.1, { r: 0.12 });
      o.ball(0.1, 0xff9800, x + sx * 1.3, dy + 0.68, z + 0.5, { seg: 6, rows: 4 });
    }
    o.done();
  }
  if (ind) u.body.position.z = 0.6;
  u.tracer = 0x66bb6a;
  u.projectile = { color: 0x43a047, size: 0.6 };
  u.static = true;
  u.bob = 0.08;
  return u;
}
