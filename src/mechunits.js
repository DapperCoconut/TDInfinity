import * as THREE from 'three';
import { PARTS, antenna, barrel, bedroll, bolts, crate, glowMat, hatch, kit, lamp, louvres, muzzleAt, smoke, tone, tracks, turretAt, unitBase } from './vehicles.js';

// Walking summons: the Zed bots (m1 on tracks, m2 and m11 on legs), Abrams Walkers and War
// Machines. A mech is: two leg groups that swing at the hip (u.legs, animated by UnitView), a
// pelvis, and a torso that is the unit's turret, so the whole upper body turns to face its target.

const { STEEL, GUN, DARK } = PARTS;
const PI = Math.PI;

/** A box from point a to point b (both [x, y, z], same x): limbs, struts. */
export function limb(k, w, d, a, b, col, o) {
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  k.box(w, Math.hypot(dy, dz), d, col, a[0], (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, { rx: Math.atan2(dz, dy), ...o });
}

/** A rod from a to b (same x). */
export function rod(k, r, a, b, col, seg = 6) {
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  k.cyl(r, Math.hypot(dy, dz), col, a[0], (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, { rx: Math.atan2(dz, dy), seg });
}

/**
 * One leg hanging from its hip pivot: hip joint, armoured thigh, knee, shin with a hydraulic ram,
 * ankle and a clawed foot. `len` is the hip height, `w` the leg's thickness. Returns the group.
 */
export function mechLeg(u, parent, key, x, hipY, { len, w, P, D, G }) {
  const leg = new THREE.Group();
  leg.position.set(x, hipY, 0);
  parent.add(leg);
  const k = kit(u, leg, key);
  const knee = [0, -len * 0.47, w * 0.42];
  const ank = [0, -len + w * 0.62, -w * 0.12];
  const PL = tone(P, 1.14);
  k.cyl(w * 0.62, w * 1.2, D, 0, 0, 0, { axis: 'x', seg: 12 }); // hip joint
  k.cyl(w * 0.3, w * 1.34, STEEL, 0, 0, 0, { axis: 'x', seg: 8 });
  limb(k, w * 0.9, w * 0.8, [0, 0, 0], knee, P, { r: 0.07 }); // thigh
  limb(k, w * 1.0, w * 0.2, [0, -len * 0.06, w * 0.48], [0, knee[1] * 0.86, knee[2] + w * 0.4], PL); // thigh plate
  bolts(k, [-w * 0.36, -len * 0.1, w * 0.62], [-w * 0.36, knee[1] * 0.8, knee[2] + w * 0.5], 3, D, 0.05);
  bolts(k, [w * 0.36, -len * 0.1, w * 0.62], [w * 0.36, knee[1] * 0.8, knee[2] + w * 0.5], 3, D, 0.05);
  k.cyl(w * 0.46, w * 1.1, D, ...knee, { axis: 'x', seg: 10 }); // knee
  k.cyl(w * 0.2, w * 1.22, G ?? STEEL, ...knee, { axis: 'x', seg: 8 });
  k.box(w * 0.94, w * 0.72, w * 0.26, PL, 0, knee[1], knee[2] + w * 0.52, { r: 0.05 }); // knee cap
  limb(k, w * 0.74, w * 0.66, knee, ank, P, { r: 0.06 }); // shin
  limb(k, w * 0.84, w * 0.18, [0, knee[1] - w * 0.5, knee[2] + w * 0.3], [0, ank[1] + w * 0.3, ank[2] + w * 0.42], PL); // shin guard
  // ram behind the knee
  const r0 = [0, knee[1] * 0.45, -w * 0.38];
  const r1 = [0, (knee[1] + ank[1]) / 2 - w * 0.1, knee[2] * 0.5 - w * 0.5];
  rod(k, w * 0.13, r0, [0, (r0[1] + r1[1]) / 2, (r0[2] + r1[2]) / 2], D, 8);
  rod(k, w * 0.07, r0, r1, 0xc4c8cc);
  k.cyl(w * 0.36, w * 0.96, D, ...ank, { axis: 'x', seg: 10 }); // ankle
  // foot: a wedge with two toes and a heel spur
  const y0 = -len;
  k.prism([[-w * 0.85, y0], [-w * 0.85, y0 + w * 0.3], [-w * 0.3, y0 + w * 0.62], [w * 0.5, y0 + w * 0.62], [w * 1.1, y0 + w * 0.3], [w * 1.1, y0]], w * 1.3, D, 0, 0, 0, { bevel: 0.05 });
  for (const s of [-1, 1]) {
    k.prism([[w * 0.9, y0], [w * 0.9, y0 + w * 0.36], [w * 1.45, y0 + w * 0.3], [w * 1.75, y0]], w * 0.5, P, s * w * 0.38, 0, 0, { bevel: 0.03 });
    k.cyl(w * 0.09, w * 0.6, 0xc4c8cc, s * w * 0.5, y0 + w * 0.75, w * 0.3, { seg: 6, rx: 0.5 }); // toe rams
  }
  k.box(w * 0.5, w * 0.24, w * 0.5, P, 0, y0 + w * 0.12, -w * 1.0);
  k.done();
  return leg;
}

/** Hips: a block between the legs with the axle the legs swing on and the ring the torso turns on. */
export function pelvis(k, y, half, w, P, D) {
  k.box(half * 2 - w * 0.9, w * 0.9, w * 1.3, D, 0, y, 0, { r: 0.08 });
  k.cyl(w * 0.24, half * 2 + w * 0.2, STEEL, 0, y, 0, { axis: 'x', seg: 8 });
  k.slab(half * 1.5, w * 0.7, w * 0.3, P, 0, y - w * 0.2, w * 0.72, { bw: 0.6 }); // groin plate
  k.slab(half * 1.5, w * 0.7, w * 0.3, P, 0, y - w * 0.2, -w * 0.72, { bw: 0.6 });
  k.cyl(w * 0.8, w * 0.36, D, 0, y + w * 0.55, 0, { seg: 14 }); // waist ring
  k.cyl(w * 0.6, w * 0.2, STEEL, 0, y + w * 0.75, 0, { seg: 12 });
}

/** A rotary gun: six barrels around a spindle, along +z from z0. */
export function minigun(g, x, y, z0, len, r = 0.2) {
  g.cyl(r * 1.5, len * 0.3, 0x2c2f33, x, y, z0 + len * 0.15, { axis: 'z', seg: 10 });
  for (let i = 0; i < 6; i++) {
    const a = (i * PI) / 3;
    g.cyl(r * 0.26, len, GUN, x + Math.cos(a) * r, y + Math.sin(a) * r, z0 + len / 2, { axis: 'z', seg: 5 });
  }
  for (const f of [0.5, 0.95]) g.cyl(r * 1.36, 0.08, 0x3a3d40, x, y, z0 + len * f, { axis: 'z', seg: 10 });
}

/** An exhaust stack with a rain cap, rising from (x, y, z). */
export function stack(k, x, y, z, h, r = 0.13) {
  k.cyl(r, h, 0x2a2c30, x, y + h / 2, z, { seg: 8 });
  k.cyl(r * 1.3, h * 0.4, 0x3a3d40, x, y + h * 0.55, z, { seg: 8 });
  k.box(r * 2.6, 0.04, r * 2.6, 0x2a2c30, x, y + h + 0.06, z, { rx: 0.45 });
}

// ------------------------------------------------------------------ Zed bots

/**
 * Zed's machines: M1 (a brown gun-bot on tracks), M2 (blue-grey walker) and M11 (big black
 * walker with red lights). Riveted box torso with an eye slit, twin guns on top, an arm cannon.
 */
function zed(model) {
  const u = unitBase();
  const mech = model !== 'm1';
  const big = model === 'm11';
  const P = big ? 0x212121 : mech ? 0x546e7a : 0x6d4c41;
  const D = big ? 0x0f0f10 : mech ? 0x37474f : 0x4e342e;
  const PL = big ? 0x37474f : mech ? 0x78909c : 0x8d6e63;
  const glowCol = big ? 0xff1744 : 0xffc400;
  const G = glowMat(u, glowCol);
  const s = big ? 1.35 : 1;
  const hipY = mech ? (big ? 4.2 : 3.4) : 1.3;
  const k = kit(u, u.body, model + ':b');
  if (mech) pelvis(k, hipY, 1.3 * (big ? 1.25 : 1), big ? 1.3 : 1.0, P, D);
  else {
    // tracked base
    tracks(u, k, u.body, { x: 1.7, len: 5.2, h: 1.4, w: 0.9, n: 4, hub: 0x5d4037 });
    k.box(2.5, 0.8, 4.4, D, 0, 0.85, 0, { r: 0.06 });
    k.prism([[-2.3, 0.9], [-2.3, 1.3], [1.6, 1.3], [2.4, 0.9]], 2.5, P, 0, 0, 0, { bevel: 0.05 });
    for (const sx of [-1, 1]) {
      k.box(1.0, 0.07, 0.9, P, sx * 1.7, 1.5, 2.1); // mudguards
      k.box(1.0, 0.07, 0.9, P, sx * 1.7, 1.5, -2.1);
      lamp(k, sx * 0.8, 1.1, 2.3, 0.15);
      for (let i = 0; i < 4; i++) k.box(0.3, 0.07, 0.3, i % 2 ? 0x16181a : 0xf9a825, sx * 0.9 + (i - 1.5) * 0.0, 1.32, -1.9 + i * 0.3); // hazard marks
    }
    k.cyl(1.1, 0.2, D, 0, 1.36, 0, { seg: 14 });
  }
  k.done();
  if (mech) u.legs = [-1, 1].map((sx) => mechLeg(u, u.body, model + ':leg', sx * 1.3 * (big ? 1.25 : 1), hipY, { len: hipY, w: big ? 1.3 : 1.0, P, D, G }));
  const t = turretAt(u, u.body, hipY + (mech ? (big ? 1.25 : 0.95) : 0.3));
  t.scale.setScalar(s);
  const g = kit(u, t, model + ':t');
  // torso: riveted box with a chamfered top, chest plate and the eye slit
  g.box(3.2, 1.8, 3.2, P, 0, 0.9, 0, { r: 0.12 });
  g.slab(3.0, 0.5, 3.0, PL, 0, 2.0, 0, { tw: 0.8, td: 0.8 });
  g.box(2.4, 1.0, 0.16, PL, 0, 0.75, 1.62, { r: 0.04 }); // chest plate
  g.box(2.0, 0.5, 0.14, 0x0b0c0d, 0, 1.42, 1.6);
  g.box(1.6, 0.26, 0.1, G, 0, 1.42, 1.66);
  for (const sx of [-1, 1]) {
    bolts(g, [sx * 1.0, 0.4, 1.72], [sx * 1.0, 1.1, 1.72], 4, D, 0.06);
    for (let i = 0; i < 3; i++) g.box(0.08, 0.14, 1.2, 0x0b0c0d, sx * 1.6, 0.7 + i * 0.3, -0.5); // side vents
    bolts(g, [sx * 1.62, 1.66, -1.3], [sx * 1.62, 1.66, 1.3], 6, D, 0.06);
    stack(g, sx * 1.0, 1.9, -1.4, 1.1);
    g.box(0.5, 0.12, 0.06, G, sx * 0.9, 0.3, 1.7); // chest lights
  }
  // back: engine block, fuel tank
  g.box(2.2, 1.2, 0.7, D, 0, 1.0, -1.8, { r: 0.06 });
  g.cyl(0.36, 1.8, 0x8d3a2b, 0, 0.7, -2.25, { axis: 'x', seg: 10 });
  for (const x of [-0.6, 0.6]) g.cyl(0.38, 0.08, DARK, x, 0.7, -2.25, { axis: 'x', seg: 10 });
  louvres(g, 0, 1.63, -1.8, 1.8, 0.6, 4);
  // twin guns on the roof
  g.cyl(0.8, 0.2, D, 0, 2.3, 0.2, { seg: 12 });
  g.box(1.7, 0.7, 1.6, PL, 0, 2.7, 0.2, { r: 0.08 });
  g.box(0.5, 0.3, 0.06, G, 0, 2.8, 1.02);
  for (const x of [-0.5, 0.5]) {
    barrel(g, x, 2.65, 0.9, 1.8, 0.1, GUN);
    g.cyl(0.15, 0.8, 0x2c2f33, x, 2.65, 1.5, { axis: 'z', seg: 8 });
  }
  antenna(g, -0.7, 3.05, -0.4, 1.6);
  // right arm: the cannon
  g.cyl(0.5, 0.5, D, 1.75, 1.0, 0, { axis: 'x', seg: 10 });
  g.box(0.9, 0.9, 2.4, D, 2.2, 1.0, 0.5, { r: 0.08 });
  g.box(0.96, 0.3, 1.0, PL, 2.2, 1.5, 0.3);
  barrel(g, 2.2, 1.0, 1.6, 1.1, 0.26, 0x2c2f33, { brake: true });
  g.torus(0.34, 0.06, G, 2.2, 1.0, 1.9, { seg: 10 });
  // left arm: a riveted shield
  g.cyl(0.5, 0.5, D, -1.75, 1.0, 0, { axis: 'x', seg: 10 });
  g.box(0.6, 0.6, 1.4, D, -2.1, 1.0, 0.3);
  g.slab(0.2, 2.2, 2.4, PL, -2.5, 1.0, 0.6, { tw: 1, td: 0.8, bd: 0.8 });
  bolts(g, [-2.62, 1.8, -0.2], [-2.62, 1.8, 1.4], 4, D, 0.07);
  bolts(g, [-2.62, 0.2, -0.2], [-2.62, 0.2, 1.4], 4, D, 0.07);
  g.box(0.06, 0.3, 1.6, G, -2.61, 1.0, 0.6);
  g.done();
  for (const x of [-0.5, 0.5]) muzzleAt(u, t, x, 2.65, 2.75);
  muzzleAt(u, t, 2.2, 1.0, 2.8, true);
  u.height = hipY + 3.4 * s;
  u.tracer = big ? 0xff5252 : 0xffd54f;
  return u;
}

// ------------------------------------------------------------------ Abrams Walkers

/**
 * Abrams Walker..5: a tank turret on two legs. A cannon arm on the left; from walker2 one on
 * the right too; from walker3 the right arm is a minigun (four of them at walker5, which is
 * black with green lights). walker4+ carries an ammo drum.
 */
function walker(model) {
  const u = unitBase();
  const lv = Number(model.slice(6)) || 0;
  const s = 1 + lv * 0.05;
  const elite = lv >= 5;
  const P = elite ? 0x1c1c1c : 0xc8b58a;
  const D = elite ? 0x0d0d0d : 0x8d7b5a;
  const PL = elite ? 0x33363a : 0xd9c9a3;
  const glowCol = elite ? 0x76ff03 : 0xffc400;
  const G = glowMat(u, glowCol);
  const S = new THREE.Group();
  S.scale.setScalar(s);
  u.body.add(S);
  const hipY = 3.0;
  const k = kit(u, S, model + ':b');
  pelvis(k, hipY, 1.3, 1.0, P, D);
  k.done();
  u.legs = [-1, 1].map((sx) => mechLeg(u, S, model + ':leg', sx * 1.3, hipY, { len: hipY, w: 1.0, P, D, G }));
  const t = turretAt(u, S, hipY + 0.85);
  const g = kit(u, t, model + ':t');
  // hull: a tub under a faceted tank turret
  g.slab(2.8, 0.7, 2.6, D, 0, 0.35, 0, { bw: 0.55, bd: 0.6 });
  g.plan([[-0.8, 1.7], [0.8, 1.7], [1.5, 0.7], [1.5, -1.0], [1.1, -1.6], [-1.1, -1.6], [-1.5, -1.0], [-1.5, 0.7]], 1.25, P, 0, 0.66, 0, { bevel: 0.2, inset: 0.13 });
  // cockpit glass and the sensor visor
  g.box(1.3, 0.5, 0.08, 0x0b0c0d, 0, 1.3, 1.62, { rx: -0.2 });
  g.box(1.1, 0.24, 0.06, G, 0, 1.3, 1.67, { rx: -0.2 });
  for (const sx of [-1, 1]) {
    g.box(0.5, 0.3, 0.06, 0x6fb7e6, sx * 1.05, 1.5, 1.28, { ry: sx * 0.62, rx: -0.15 });
    lamp(g, sx * 0.6, 0.85, 1.72, 0.14);
    smoke(g, sx * 1.52, 1.5, 0.5, sx, 3, tone(P, 0.6));
    g.cyl(0.5, 0.7, D, sx * 1.75, 1.15, 0, { axis: 'x', seg: 10 }); // shoulders
    stack(g, sx * 0.9, 1.7, -1.5, 1.0);
    bolts(g, [sx * 1.52, 0.9, -0.9], [sx * 1.52, 0.9, 0.6], 5, D, 0.05);
  }
  hatch(g, 0.5, 1.91, -0.2, 0.36, D);
  g.box(0.5, 0.3, 0.5, D, -0.5, 2.05, 0.3, { r: 0.05 }); // sight
  g.box(0.34, 0.16, 0.04, 0x6fb7e6, -0.5, 2.07, 0.56);
  louvres(g, 0, 1.93, -1.1, 1.4, 0.6, 4);
  g.tube([[-0.9, 1.3, -1.6], [-0.9, 1.3, -2.0], [0.9, 1.3, -2.0], [0.9, 1.3, -1.6]], 0.035, DARK, { tension: 0.02, seg: 12 });
  bedroll(g, 0, 1.45, -1.82, 1.5, 0.16);
  crate(g, 0, 1.0, -1.8, 1.4, 0.4, 0.4, tone(P, 0.85));
  antenna(g, -1.2, 1.91, -1.1, 2.2);
  if (lv >= 2) antenna(g, 1.2, 1.91, -1.2, 1.7);
  // arms
  const cannonArm = (sx) => {
    g.box(0.95, 0.95, 2.3, D, sx * 2.2, 1.15, 0.5, { r: 0.08 });
    g.box(1.0, 0.24, 1.4, PL, sx * 2.2, 1.7, 0.3);
    g.box(0.7, 0.7, 0.4, PL, sx * 2.2, 1.15, 1.7, { r: 0.06 });
    barrel(g, sx * 2.2, 1.15, 1.8, 2.3, 0.2, tone(D, 0.7), { sleeve: true, brake: true });
    for (let i = 0; i < 3; i++) g.box(0.08, 0.5, 0.2, 0x0b0c0d, sx * 2.69, 1.15, -0.2 + i * 0.4); // breech vents
  };
  cannonArm(-1);
  if (lv >= 3) {
    const guns = elite ? [[1.95, 0.8], [1.95, 1.5], [2.65, 0.8], [2.65, 1.5]] : [[2.2, 1.15]];
    g.box(elite ? 1.5 : 0.9, elite ? 1.5 : 0.9, 1.5, D, 2.3, 1.15, 0.1, { r: 0.08 });
    for (const [x, y] of guns) {
      minigun(g, x, y, 0.8, 1.9, elite ? 0.17 : 0.22);
      muzzleAt(u, t, x, y, 2.75);
    }
    if (lv >= 4) {
      // ammo drum on the back, belt chute to the gun
      g.cyl(0.6, 1.0, 0x37474f, 0.5, 2.3, -0.9, { axis: 'x', seg: 12 });
      g.cyl(0.64, 0.12, DARK, 0.5, 2.3, -0.9, { axis: 'x', seg: 12 });
      g.tube([[1.0, 2.3, -0.8], [1.9, 2.2, -0.6], [2.3, 1.8, -0.3]], 0.13, 0xc8a24a, { seg: 10, sides: 4 });
    }
  } else if (lv >= 2) cannonArm(1);
  else {
    // one-armed walkers carry a missile box on the other shoulder
    g.box(0.8, 0.9, 1.6, 0x37474f, 2.2, 1.25, 0.2, { r: 0.06 });
    for (const dy of [-0.2, 0.2]) g.cyl(0.16, 0.08, 0x101112, 2.2, 1.25 + dy, 1.02, { axis: 'z', seg: 8 });
    for (const dy of [-0.2, 0.2]) g.cyl(0.1, 0.14, 0xd84315, 2.2, 1.25 + dy, 1.05, { axis: 'z', r2: 0.03, seg: 6 });
  }
  g.done();
  muzzleAt(u, t, -2.2, 1.15, 4.2, true);
  u.height = (hipY + 1.9 + 0.8) * s;
  u.tracer = elite ? 0x76ff03 : 0xffd54f;
  return u;
}

// ------------------------------------------------------------------ War Machines

/**
 * War Machine / 2 / 3: towering humanoid mechs. Right arm: a flamethrower fed from tanks on the
 * back; left arm: a huge fist. Bigger and darker each level; spikes from 2, horns at 3.
 */
function warmachine(model) {
  const u = unitBase();
  const lv = Number(model.slice(10)) || 1;
  const s = 1.5 + lv * 0.2;
  const P = [0x37474f, 0x263238, 0x111111][lv - 1];
  const D = [0x1a1a1a, 0x121416, 0x050505][lv - 1];
  const PL = [0x546e7a, 0x37474f, 0x2a2a2a][lv - 1];
  const glowCol = [0xff6d00, 0xff1744, 0xd500f9][lv - 1];
  const G = glowMat(u, glowCol);
  const F = glowMat(u, 0xff6d00);
  const S = new THREE.Group();
  S.scale.setScalar(s);
  u.body.add(S);
  const hipY = 3.6;
  const k = kit(u, S, model + ':b');
  pelvis(k, hipY, 1.3, 1.1, P, D);
  for (const sx of [-1, 1]) k.slab(0.9, 1.1, 0.2, PL, sx * 1.3, hipY - 0.2, 0.75, { bw: 0.7, rx: -0.15 }); // hip skirts
  k.done();
  u.legs = [-1, 1].map((sx) => mechLeg(u, S, model + ':leg', sx * 1.3, hipY, { len: hipY, w: 1.1, P, D, G }));
  const t = turretAt(u, S, hipY + 0.95);
  const g = kit(u, t, model + ':t');
  // abdomen and chest
  g.box(1.8, 0.9, 1.4, D, 0, 0.45, 0, { r: 0.08 });
  for (let i = 0; i < 3; i++) g.box(1.9, 0.14, 1.5, P, 0, 0.2 + i * 0.26, 0); // flexible waist plates
  g.slab(3.4, 1.7, 2.3, P, 0, 1.75, 0, { bw: 0.62, bd: 0.8 });
  g.slab(1.4, 1.2, 0.3, PL, -0.8, 1.9, 1.12, { bw: 0.7, rx: 0.0 }); // chest plates
  g.slab(1.4, 1.2, 0.3, PL, 0.8, 1.9, 1.12, { bw: 0.7 });
  g.cyl(0.42, 0.3, D, 0, 1.6, 1.2, { axis: 'z', seg: 10 }); // reactor
  g.cyl(0.3, 0.34, G, 0, 1.6, 1.22, { axis: 'z', seg: 10 });
  g.torus(0.42, 0.07, STEEL, 0, 1.6, 1.36, { seg: 10 });
  g.box(3.0, 0.3, 2.0, D, 0, 2.7, 0); // collar
  // head: helmet, visor, jaw vents
  g.box(1.3, 1.0, 1.3, D, 0, 3.3, 0.05, { r: 0.12 });
  g.slab(1.36, 0.4, 1.36, P, 0, 3.86, 0.05, { tw: 0.7, td: 0.7 });
  g.box(1.0, 0.24, 0.1, G, 0, 3.4, 0.7);
  for (const x of [-0.3, 0, 0.3]) g.box(0.12, 0.3, 0.08, 0x0b0c0d, x, 3.0, 0.7);
  g.box(0.1, 0.6, 0.8, PL, 0, 4.1, -0.1); // crest
  if (lv >= 3) for (const sx of [-1, 1]) g.cyl(0.16, 1.5, G, sx * 0.8, 4.3, -0.3, { r2: 0.01, seg: 5, rz: -sx * 0.35 }); // horns
  // back: fuel tanks for the flamer, exhaust stacks
  for (const sx of [-1, 1]) {
    g.cyl(0.42, 1.7, 0xb23b22, sx * 0.55, 1.8, -1.45, { seg: 10 });
    g.ball(0.42, 0xb23b22, sx * 0.55, 2.65, -1.45, { seg: 10, rows: 6 });
    g.cyl(0.44, 0.1, DARK, sx * 0.55, 1.6, -1.45, { seg: 10 });
    g.cyl(0.44, 0.1, DARK, sx * 0.55, 2.2, -1.45, { seg: 10 });
    stack(g, sx * 1.3, 2.6, -1.0, 1.5, 0.16);
    // shoulders: big pads, spikes on the higher marks
    g.cyl(0.6, 0.8, D, sx * 2.0, 2.3, 0, { axis: 'x', seg: 10 });
    g.slab(1.6, 0.9, 2.0, P, sx * 2.35, 2.9, 0, { tw: 0.7, td: 0.75, tx: -sx * 0.15 });
    g.box(1.64, 0.14, 2.04, PL, sx * 2.35, 2.5, 0);
    bolts(g, [sx * 3.16, 2.75, -0.8], [sx * 3.16, 2.75, 0.8], 4, STEEL, 0.07);
    if (lv >= 2) for (const z of [-0.6, 0, 0.6]) g.cyl(0.14, 0.7, 0xc4c8cc, sx * 2.5, 3.6, z, { r2: 0.01, seg: 5, rz: -sx * 0.3 });
    // upper arms and elbows
    g.box(0.9, 1.5, 0.9, P, sx * 2.35, 1.5, 0.05, { r: 0.07 });
    g.cyl(0.5, 1.0, D, sx * 2.35, 0.6, 0.15, { axis: 'x', seg: 10 });
  }
  // right arm: flamethrower
  g.box(0.95, 0.95, 1.9, P, 2.35, 0.3, 0.95, { r: 0.08 });
  g.box(1.0, 0.3, 1.2, PL, 2.35, 0.82, 0.9);
  g.cyl(0.34, 1.3, 0x2c2f33, 2.35, 0.3, 2.3, { axis: 'z', seg: 10 });
  g.cyl(0.42, 0.3, 0x3a3d40, 2.35, 0.3, 2.85, { axis: 'z', seg: 10, r2: 0.5 });
  for (let i = 0; i < 3; i++) g.cyl(0.38, 0.06, DARK, 2.35, 0.3, 1.9 + i * 0.3, { axis: 'z', seg: 10 });
  g.cyl(0.24, 0.1, F, 2.35, 0.3, 3.0, { axis: 'z', seg: 8 }); // pilot flame
  g.cyl(0.06, 0.9, STEEL, 2.35, -0.2, 2.5, { axis: 'z', seg: 6 }); // igniter
  g.tube([[0.9, 2.3, -1.3], [1.9, 2.0, -1.2], [2.9, 1.2, -0.5], [2.9, 0.5, 0.4], [2.6, 0.4, 1.0]], 0.11, 0x16181a, { seg: 18 }); // fuel hose
  // left arm: the fist
  g.box(1.0, 1.0, 1.5, P, -2.35, 0.3, 0.8, { r: 0.08 });
  g.cyl(0.5, 0.3, D, -2.35, 0.3, 1.6, { axis: 'z', seg: 10 }); // wrist
  g.box(1.6, 1.6, 1.4, D, -2.35, 0.3, 2.4, { r: 0.14 });
  for (let i = 0; i < 4; i++) {
    g.box(0.34, 0.5, 0.5, PL, -2.35 + (i - 1.5) * 0.4, 0.75, 3.1, { r: 0.05 }); // knuckles
    g.box(0.34, 0.9, 0.36, P, -2.35 + (i - 1.5) * 0.4, 0.1, 3.15, { r: 0.05 }); // fingers
    if (lv >= 2) g.cyl(0.1, 0.4, 0xc4c8cc, -2.35 + (i - 1.5) * 0.4, 0.8, 3.5, { axis: 'z', r2: 0.01, seg: 5 });
  }
  g.box(0.4, 0.8, 0.5, P, -1.5, 0.2, 2.6, { r: 0.05 }); // thumb
  g.box(0.1, 0.5, 1.0, G, -3.16, 0.3, 2.4);
  g.done();
  muzzleAt(u, t, 2.35, 0.3, 3.1);
  muzzleAt(u, t, -2.35, 0.3, 3.3, true);
  u.height = (hipY + 3.2 + 1.5) * s;
  u.tracer = 0xff6d00;
  return u;
}

export const MECH_UNITS = {
  m1: zed, m2: zed, m11: zed,
  walker, walker2: walker, walker3: walker, walker4: walker, walker5: walker,
  warmachine, warmachine2: warmachine, warmachine3: warmachine,
};
