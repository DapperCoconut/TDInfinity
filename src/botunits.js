import * as THREE from 'three';
import { PARTS, antenna, barrel, bolts, glowMat, hatch, kit, lamp, louvres, mgun, muzzleAt, periscope, tone, tracks, turretAt, unitBase, vcMat } from './vehicles.js';
import { mechLeg, minigun, pelvis, stack } from './mechunits.js';
import { scaled } from './moreunits.js';

// The humanoid combat mechs (Mecha Base's Mark 1 ... Ultimate, Enforcement Base's APM-Bot), the
// Golden Zed's gold bots and the Golden Cyber Tank, built with the vehicle kit (vehicles.js).

const { STEEL, GUN } = PARTS;
const PI = Math.PI;

// ------------------------------------------------------------------ combat mechs

const BIPEDS = {
  mech1: { s: 0.8, P: 0x8d9a6a, D: 0x4b5320, eye: 0xffc400, guns: 1 },
  mech2: { s: 0.95, P: 0x78909c, D: 0x37474f, eye: 0x00e5ff, guns: 1, pods: true },
  mech45: { s: 1.1, P: 0x5c6bc0, D: 0x283593, eye: 0x40c4ff, armor: 0x9fa8da, guns: 2, rotary: true },
  mech10: { s: 1.3, P: 0x263238, D: 0x111111, eye: 0xff1744, armor: 0x546e7a, guns: 2, rotary: true, pods: true },
  mechult: { s: 1.7, P: 0x1a1a2e, D: 0x0d0d14, eye: 0xffd740, armor: 0xffc107, guns: 2, rotary: true, pods: true, core: 0x00e5ff, crown: true },
  ebapm: { s: 0.95, P: 0x283593, D: 0x212121, eye: 0x2979ff, armor: 0xeceff1, police: true },
};

/**
 * A two-legged combat mech: armoured legs, a chest with a lit cockpit, a visored head, shoulder
 * guards, gun arms and a jump pack. mech1 has one gun arm and a fist; the later marks get a second
 * gun, rotary guns, shoulder missile pods, a reactor core and a crown. ebapm is the police one:
 * white armour, a big shoulder cannon, a rotary arm gun and red and blue lights.
 */
function biped(model) {
  const o = BIPEDS[model];
  const u = unitBase();
  const { P, D, s } = o;
  const A = o.armor ?? tone(P, 1.2);
  const AD = tone(A, 0.78);
  const E = glowMat(u, o.eye);
  const C = o.core ? glowMat(u, o.core) : E;
  const S = scaled(u, s * 0.88);
  const hipY = 3.0;
  const k = kit(u, S, model + ':b');
  pelvis(k, hipY, 1.3, 1.0, P, D);
  k.done();
  u.legs = [-1, 1].map((sx) => mechLeg(u, S, model + ':leg', sx * 1.3, hipY, { len: hipY, w: 1.0, P, D, G: E }));
  const t = turretAt(u, S, hipY + 0.85);
  const g = kit(u, t, model + ':t');
  // waist, belly, chest
  g.cyl(0.72, 0.5, D, 0, 0.25, 0, { seg: 10 });
  g.box(1.7, 0.6, 1.3, D, 0, 0.62, 0, { r: 0.08 });
  for (let i = 0; i < 3; i++) g.box(1.3, 0.07, 0.06, 0x0b0c0d, 0, 0.45 + i * 0.16, 0.66); // belly vents
  g.slab(3.0, 1.35, 2.0, P, 0, 1.55, 0.1, { bw: 0.6, bd: 0.76 });
  g.box(0.56, 0.86, 0.14, 0x0b0c0d, 0, 1.6, 1.06); // cockpit
  g.box(0.4, 0.4, 0.06, 0x6fb7e6, 0, 1.78, 1.13);
  g.cyl(0.2, 0.1, C, 0, 1.36, 1.13, { axis: 'z', seg: 10 }); // reactor
  g.torus(0.24, 0.05, AD, 0, 1.36, 1.15, { seg: 10 });
  for (const sx of [-1, 1]) {
    g.box(1.14, 0.9, 0.16, A, sx * 0.86, 1.68, 1.02, { ry: sx * 0.22, rx: -0.1, r: 0.04 }); // chest plates
    g.box(0.7, 0.07, 0.06, E, sx * 0.86, 1.3, 1.02, { ry: sx * 0.22 });
    bolts(g, [sx * 1.45, 1.2, -0.6], [sx * 1.45, 1.2, 0.7], 4, D, 0.05);
    for (let i = 0; i < 3; i++) g.box(0.06, 0.1, 0.9, 0x0b0c0d, sx * 1.3, 1.25 + i * 0.2, -0.2, { rz: sx * 0.3 }); // side vents
    // shoulders, shoulder guards, upper arms, elbows
    g.cyl(0.52, 0.7, D, sx * 1.8, 1.8, 0, { axis: 'x', seg: 10 });
    g.slab(1.25, 0.5, 1.8, A, sx * 2.1, 2.36, 0, { tw: 0.66, td: 0.72, tx: -sx * 0.12 });
    g.box(0.1, 0.36, 1.5, AD, sx * 2.72, 2.2, 0);
    g.box(0.72, 1.0, 0.8, P, sx * 2.15, 1.25, 0, { r: 0.07 });
    g.cyl(0.36, 0.86, D, sx * 2.15, 0.62, 0.12, { axis: 'x', seg: 10 });
    g.cyl(0.14, 0.94, STEEL, sx * 2.15, 0.62, 0.12, { axis: 'x', seg: 6 });
    // jump pack nozzles
    g.cyl(0.2, 0.5, 0x2a2c30, sx * 0.55, 0.78, -1.4, { r2: 0.32, seg: 8 });
    g.cyl(0.16, 0.05, E, sx * 0.55, 0.55, -1.4, { seg: 8 });
    stack(g, sx * 0.75, 2.2, -1.35, 0.7, 0.11);
  }
  g.box(1.5, 0.28, 1.3, D, 0, 2.34, 0, { r: 0.05 }); // collar
  g.box(2.0, 1.4, 0.8, D, 0, 1.55, -1.2, { r: 0.08 }); // jump pack
  g.box(1.5, 0.9, 0.1, tone(P, 0.8), 0, 1.65, -1.62);
  louvres(g, 0, 2.27, -1.2, 1.4, 0.5, 3);
  // head: a helmet with a lit visor, a crest and an aerial
  g.box(0.84, 0.6, 0.92, P, 0, 2.76, 0.16, { r: 0.1 });
  g.box(0.9, 0.2, 0.5, A, 0, 3.0, 0.1, { r: 0.05 });
  g.box(0.7, 0.16, 0.08, E, 0, 2.78, 0.63);
  g.box(0.16, 0.3, 0.14, AD, 0, 2.56, 0.6); // chin
  g.prism([[-0.4, 3.05], [-0.5, 3.4], [0.1, 3.3], [0.5, 3.05]], 0.12, A, 0, 0, 0.1);
  antenna(g, 0.36, 3.0, -0.2, 1.0);
  for (const sx of [-1, 1]) g.cyl(0.12, 0.1, D, sx * 0.46, 2.76, 0.1, { axis: 'x', seg: 8 });
  if (o.crown) {
    const spikes = [[0, 0.95], [-0.3, 0.7], [0.3, 0.7], [-0.56, 0.5], [0.56, 0.5]];
    for (const [x, h] of spikes) g.cyl(0.09, h, E, x, 3.1 + h / 2, -0.12 - Math.abs(x) * 0.3, { r2: 0.01, seg: 5 });
    g.box(1.3, 0.12, 0.2, A, 0, 3.12, -0.16);
    for (const sx of [-1, 1]) {
      // gold fins on the shoulders and back
      g.prism([[-1.3, 2.6], [-2.2, 4.0], [-1.6, 3.9], [-0.5, 2.6]], 0.12, A, sx * 2.1, 0, 0);
      g.prism([[-1.6, 1.4], [-2.9, 3.0], [-2.3, 3.0], [-1.6, 2.3]], 0.1, A, sx * 0.6, 0, 0);
      g.box(0.07, 0.07, 1.5, C, sx * 2.74, 2.4, 0);
    }
  }
  // arms
  const y = 0.5;
  const forearm = (sx) => {
    g.box(0.84, 0.84, 1.7, D, sx * 2.15, y, 0.9, { r: 0.08 });
    g.box(0.9, 0.2, 1.2, A, sx * 2.15, y + 0.5, 0.8, { r: 0.04 });
    g.box(0.07, 0.4, 0.9, 0x0b0c0d, sx * 2.58, y, 0.6);
  };
  const gunArm = (sx) => {
    forearm(sx);
    if (o.rotary) minigun(g, sx * 2.15, y, 1.7, 1.7, 0.2);
    else {
      barrel(g, sx * 2.15, y, 1.7, 1.7, 0.17, GUN, { sleeve: true, brake: true });
      g.box(0.3, 0.4, 0.5, 0x33363a, sx * 2.15, y - 0.56, 0.9); // magazine
    }
    g.torus(0.3, 0.05, E, sx * 2.15, y, 1.78, { seg: 10 });
    muzzleAt(u, t, sx * 2.15, y, 3.5);
  };
  const fist = (sx) => {
    forearm(sx);
    g.box(0.8, 0.76, 0.76, P, sx * 2.15, y, 2.1, { r: 0.12 });
    for (let i = 0; i < 4; i++) g.box(0.17, 0.22, 0.3, D, sx * 2.15 + (i - 1.5) * 0.19, y + 0.14, 2.52, { r: 0.04 });
    g.box(0.2, 0.3, 0.4, D, sx * 2.15 - sx * 0.46, y - 0.1, 2.2, { r: 0.05 });
  };
  if (o.police) {
    // rotary arm gun on the left, the heavy cannon over the right shoulder, lights on both shoulders
    forearm(-1);
    minigun(g, -2.15, y, 1.7, 1.5, 0.2);
    muzzleAt(u, t, -2.15, y, 3.3);
    fist(1);
    g.box(0.9, 0.8, 2.2, D, 2.1, 3.1, -0.1, { r: 0.08 });
    g.box(0.96, 0.24, 1.2, A, 2.1, 3.56, -0.2);
    barrel(g, 2.1, 3.1, 1.0, 2.6, 0.26, 0x2c2f33, { sleeve: true, brake: true });
    g.box(0.5, 0.5, 0.6, 0x33363a, 2.1, 3.1, -1.45, { r: 0.05 });
    g.cyl(0.3, 0.3, D, 2.1, 2.66, -0.1, { seg: 8 });
    muzzleAt(u, t, 2.1, 3.1, 3.75, true);
    g.box(0.5, 0.26, 0.4, glowMat(u, 0xff1744), -2.1, 2.76, 0.2, { r: 0.06 });
    g.box(0.5, 0.26, 0.4, glowMat(u, 0x2979ff), -2.1, 2.76, -0.3, { r: 0.06 });
    g.box(1.7, 0.2, 0.05, A, 0, 2.05, 1.07); // badge bar
    g.box(0.1, 1.1, 0.82, A, -2.53, 1.25, 0);
  } else {
    gunArm(1);
    if (o.guns > 1) gunArm(-1);
    else fist(-1);
  }
  if (o.pods) {
    // missile pods on the shoulders
    for (const sx of [-1, 1]) {
      g.box(1.0, 0.86, 1.5, tone(P, 0.75), sx * 2.1, 3.06, -0.1, { r: 0.07 });
      g.box(1.06, 0.1, 1.2, AD, sx * 2.1, 3.5, -0.1);
      for (const dx of [-0.24, 0.24]) for (const dy of [-0.2, 0.2]) {
        g.cyl(0.16, 0.06, 0x0b0c0d, sx * 2.1 + dx, 3.06 + dy, 0.66, { axis: 'z', seg: 8 });
        g.cyl(0.1, 0.16, 0xd84315, sx * 2.1 + dx, 3.06 + dy, 0.7, { axis: 'z', r2: 0.02, seg: 6 });
      }
    }
    if (o.guns > 1) muzzleAt(u, t, 2.1, 3.06, 0.9, true);
  }
  g.done();
  if (!u.cannon) u.cannon = u.muzzles[0];
  u.height = (o.pods || o.crown || o.police ? 7.0 : 6.3) * s;
  u.tracer = o.police ? 0x40c4ff : o.eye;
  u.tracerWidth = o.police ? 0.35 : 0.2 + s * 0.15;
  return u;
}

// ------------------------------------------------------------------ Golden Zed's bots

const GOLD = 0xd4a017;
const PALE = 0xffd54f;
const GOLD_D = 0x8f6a0c;
const GOLD_DARK = 0x2b2b2b;

/**
 * Golden Zed's bots, gzed1 ... gzed5: a gold gun-bot on tracks. Each level adds to it: silver
 * tracks and arm cannons at 2, roof machine guns at 3, a giant rotary gun at 4, and at 5 it is
 * bigger with twin lasers, a halo and wings.
 */
function goldZed(model) {
  const n = Number(model.slice(4)) || 1;
  const u = unitBase();
  const s = n >= 5 ? 1.3 : 1;
  const N = glowMat(u, 0xffea00);
  const S = scaled(u, s);
  const vc = vcMat(u);
  vc.emissive.setHex(0x241900); // a warm sheen
  vc.userData.glow = 0x241900;
  const k = kit(u, S, model + ':b');
  tracks(u, k, S, { x: 1.7, len: 5.2, h: 1.4, w: 0.9, n: 4, hub: 0xb8860b, belt: n >= 2 ? 0x8f9499 : 0x1b1c1f });
  k.box(2.5, 0.8, 4.4, GOLD_DARK, 0, 0.85, 0, { r: 0.06 });
  k.prism([[-2.3, 0.9], [-2.3, 1.3], [1.6, 1.3], [2.4, 0.9]], 2.5, GOLD, 0, 0, 0, { bevel: 0.05 });
  k.box(1.6, 0.05, 0.8, PALE, 0, 1.13, 2.0, { rx: 0.46 });
  for (const sx of [-1, 1]) {
    k.box(1.06, 0.1, 5.3, GOLD, sx * 1.7, 1.5, 0, { r: 0.04 }); // track guards
    k.box(1.1, 0.05, 0.5, PALE, sx * 1.7, 1.57, 2.3);
    k.box(1.1, 0.05, 0.5, PALE, sx * 1.7, 1.57, -2.3);
    k.box(0.06, 0.07, 4.4, N, sx * 2.24, 1.5, 0);
    bolts(k, [sx * 2.22, 1.42, -2.4], [sx * 2.22, 1.42, 2.4], 9, GOLD_D, 0.05);
    lamp(k, sx * 0.8, 1.1, 2.3, 0.15);
    k.cyl(0.16, 0.4, GOLD_D, sx * 0.9, 1.1, -2.4, { axis: 'z', seg: 8 }); // exhausts
  }
  k.cyl(1.15, 0.2, GOLD_D, 0, 1.36, 0, { seg: 14 });
  k.done();
  const t = turretAt(u, S, 1.6);
  const g = kit(u, t, model + ':t');
  // torso: a chamfered gold box with pale panels, corner posts, a jewel and the lit eye slit
  g.box(3.2, 1.8, 3.2, GOLD, 0, 0.9, 0, { r: 0.12 });
  g.slab(3.0, 0.5, 3.0, PALE, 0, 2.0, 0, { tw: 0.8, td: 0.8 });
  g.box(2.4, 1.0, 0.16, PALE, 0, 0.75, 1.62, { r: 0.04 });
  g.box(2.0, 0.5, 0.14, 0x0b0c0d, 0, 1.42, 1.6);
  g.box(1.6, 0.26, 0.1, N, 0, 1.42, 1.66);
  g.cyl(0.3, 0.1, GOLD_D, 0, 0.72, 1.7, { axis: 'z', seg: 8 });
  g.ball(0.2, glowMat(u, 0xe53935, 0.5), 0, 0.72, 1.74, { seg: 6, rows: 4 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.cyl(0.16, 1.9, GOLD_D, sx * 1.56, 0.95, sz * 1.56, { seg: 8 });
      g.ball(0.2, PALE, sx * 1.56, 1.95, sz * 1.56, { seg: 6, rows: 4 });
    }
    bolts(g, [sx * 1.0, 0.4, 1.72], [sx * 1.0, 1.1, 1.72], 4, GOLD_D, 0.06);
    g.box(0.06, 1.2, 2.2, PALE, sx * 1.61, 0.9, 0, { r: 0.02 });
    for (let i = 0; i < 3; i++) g.box(0.08, 0.14, 1.2, 0x0b0c0d, sx * 1.64, 0.6 + i * 0.3, -0.3);
    g.box(0.5, 0.12, 0.06, N, sx * 0.9, 0.3, 1.71);
    stack(g, sx * 1.0, 1.9, -1.4, 1.1);
    g.torus(0.17, 0.04, PALE, sx * 1.0, 3.06, -1.4, { rx: PI / 2, seg: 8 });
  }
  g.box(2.2, 1.2, 0.7, GOLD_D, 0, 1.0, -1.8, { r: 0.06 });
  g.cyl(0.36, 1.8, PALE, 0, 0.7, -2.25, { axis: 'x', seg: 10 });
  for (const x of [-0.6, 0.6]) g.cyl(0.38, 0.08, GOLD_D, x, 0.7, -2.25, { axis: 'x', seg: 10 });
  louvres(g, 0, 1.63, -1.8, 1.8, 0.6, 4);
  // gun house on the roof
  const ry = 2.3;
  g.cyl(0.9, 0.2, GOLD_D, 0, ry, 0.1, { seg: 12 });
  g.plan([[-0.6, 1.2], [0.6, 1.2], [1.0, 0.5], [1.0, -0.8], [0.7, -1.1], [-0.7, -1.1], [-1.0, -0.8], [-1.0, 0.5]], 0.8, PALE, 0, ry + 0.1, 0.1, { bevel: 0.14, inset: 0.1 });
  g.box(2.06, 0.1, 1.5, N, 0, ry + 0.3, -0.05);
  hatch(g, -0.4, ry + 0.9, -0.3, 0.3, GOLD);
  periscope(g, 0.45, ry + 0.9, 0.5, GOLD_D);
  antenna(g, -0.75, ry + 0.9, -0.7, 1.6);
  const gy = ry + 0.5;
  if (n === 4) {
    // giant rotary gun: eight barrels round a spindle
    g.cyl(0.62, 1.2, GOLD_D, 0, gy, 1.7, { axis: 'z', seg: 12 });
    for (let i = 0; i < 8; i++) {
      const a = (i * PI) / 4;
      g.cyl(0.1, 3.4, GOLD_DARK, Math.cos(a) * 0.4, gy + Math.sin(a) * 0.4, 2.9, { axis: 'z', seg: 6 });
    }
    for (const z of [2.6, 3.6, 4.5]) g.cyl(0.56, 0.12, PALE, 0, gy, z, { axis: 'z', seg: 12 });
    g.torus(0.6, 0.06, N, 0, gy, 2.34, { seg: 12 });
    for (let i = 0; i < 4; i++) muzzleAt(u, t, Math.cos((i * PI) / 2) * 0.4, gy + Math.sin((i * PI) / 2) * 0.4, 4.7);
  } else if (n >= 5) {
    // twin lasers
    for (const x of [-0.55, 0.55]) {
      g.cyl(0.26, 1.0, GOLD_D, x, gy, 1.6, { axis: 'z', seg: 10 });
      g.cyl(0.15, 2.4, PALE, x, gy, 2.9, { axis: 'z', seg: 8 });
      for (const z of [2.3, 2.9, 3.5]) g.torus(0.2, 0.05, N, x, gy, z, { seg: 8 });
      g.cyl(0.2, 0.3, N, x, gy, 4.1, { axis: 'z', r2: 0.1, seg: 8 });
      muzzleAt(u, t, x, gy, 4.3);
    }
    g.box(1.4, 0.2, 0.4, GOLD, 0, gy, 2.0);
  } else {
    g.box(0.9, 0.6, 0.4, GOLD_D, 0, gy, 1.3, { r: 0.08 });
    barrel(g, 0, gy, 1.4, 2.7, 0.2, GOLD_D, { sleeve: true, brake: true });
    g.torus(0.26, 0.05, N, 0, gy, 2.9, { seg: 10 });
    muzzleAt(u, t, 0, gy, 4.2);
  }
  if (n >= 3) {
    // machine guns on the roof corners
    for (const x of [-0.8, 0.8]) {
      g.cyl(0.07, 0.3, GOLD_DARK, x, ry + 1.05, 0.2, { seg: 6 });
      mgun(g, x, ry + 1.3, -0.2, 1.7, { ammoCol: GOLD_D });
      muzzleAt(u, t, x, ry + 1.32, 1.52);
    }
  }
  for (const sx of [-1, 1]) g.cyl(0.5, 0.5, GOLD_D, sx * 1.75, 1.0, 0, { axis: 'x', seg: 10 }); // shoulders
  if (n >= 2) {
    // arm cannons
    for (const sx of [-1, 1]) {
      g.box(0.9, 0.9, 2.4, GOLD_D, sx * 2.2, 1.0, 0.5, { r: 0.08 });
      g.box(0.96, 0.3, 1.0, PALE, sx * 2.2, 1.5, 0.3);
      barrel(g, sx * 2.2, 1.0, 1.6, 1.3, 0.26, GOLD_DARK, { brake: true });
      g.torus(0.34, 0.06, N, sx * 2.2, 1.0, 1.9, { seg: 10 });
    }
    muzzleAt(u, t, 2.2, 1.0, 3.0, true);
  } else {
    // level 1 carries gold shields instead
    for (const sx of [-1, 1]) {
      g.box(0.6, 0.6, 1.2, GOLD_D, sx * 2.1, 1.0, 0.2);
      g.slab(0.2, 2.0, 2.2, PALE, sx * 2.5, 1.0, 0.5, { td: 0.8, bd: 0.8 });
      g.box(0.06, 0.3, 1.5, N, sx * 2.61, 1.0, 0.5);
    }
  }
  if (n >= 5) {
    // halo and wings
    g.torus(1.3, 0.09, glowMat(u, 0xffe57f), 0, ry + 2.3, 0, { rx: PI / 2, seg: 20 });
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) {
      g.box(0.6, 2.6 - i * 0.36, 0.1, i % 2 ? GOLD : PALE, sx * (2.0 + i * 0.62), 2.9 - i * 0.2, -2.0 - i * 0.05, { rz: -sx * (0.5 + i * 0.22), r: 0.04 });
    }
    g.box(1.6, 0.5, 0.3, GOLD_D, 0, 2.0, -2.0);
  }
  g.done();
  if (!u.cannon) u.cannon = u.muzzles[0];
  u.height = (n >= 5 ? 6.3 : n >= 3 ? 5.4 : 5.0) * s;
  u.tracer = n >= 4 ? 0xffea00 : 0xffd54f;
  if (n >= 5) u.tracerWidth = 0.4;
  return u;
}

// ------------------------------------------------------------------ Golden Cyber Tank

const WHITE = new THREE.Color(0xffffff);
const mix = (hex, f) => new THREE.Color(hex).lerp(WHITE, f).getHex();

/** The Golden Cyber Tank: a gold hover tank on four thruster pads with neon trim. The ghost one is pale and see-through. */
function cyberTank(model) {
  const ghost = model === 'gcybertankghost';
  const u = unitBase();
  const c = (hex) => (ghost ? mix(hex, 0.5) : hex);
  const P = c(GOLD);
  const L = c(0xffe082);
  const PD = c(GOLD_D);
  const K = c(0x2b2b2b);
  const N = glowMat(u, ghost ? 0xffffff : 0x00e5ff, ghost ? 0.7 : 0.9);
  const T = glowMat(u, ghost ? 0xfff59d : 0xffea00, ghost ? 0.5 : 0.9);
  const k = kit(u, u.body, model + ':b');
  // wedge hull with a raised engine deck
  k.prism([[-2.8, 0.55], [-2.8, 1.3], [-2.3, 1.62], [0.8, 1.62], [2.85, 0.98], [3.0, 0.66], [2.6, 0.42], [-2.5, 0.42]], 3.4, P, 0, 0, 0, { bevel: 0.08 });
  k.slab(2.6, 0.26, 2.4, L, 0, 1.74, -1.2, { tw: 0.86, td: 0.9 });
  k.box(2.7, 0.06, 1.5, L, 0, 1.36, 1.8, { rx: 0.3 }); // nose plate
  k.box(0.2, 0.05, 1.7, N, 0, 1.4, 1.8, { rx: 0.3 });
  k.box(2.6, 0.12, 0.08, N, 0, 0.84, 2.94); // light strip
  louvres(k, 0, 1.88, -1.6, 1.6, 0.9, 5, PD);
  for (const sx of [-1, 1]) {
    k.slab(0.36, 0.66, 4.6, L, sx * 1.84, 0.82, -0.1, { bw: 0.4, td: 0.92, bd: 0.8 }); // skirts
    k.box(0.05, 0.08, 4.2, N, sx * 2.03, 1.0, -0.1);
    k.box(0.05, 0.06, 2.6, N, sx * 1.3, 1.64, -0.9);
    bolts(k, [sx * 1.72, 1.4, -2.4], [sx * 1.72, 1.4, 0.6], 7, PD, 0.05);
    // tail fins
    k.prism([[-2.7, 1.5], [-3.5, 2.7], [-2.9, 2.7], [-1.8, 1.62]], 0.12, P, sx * 1.25, 0, 0);
    k.box(0.14, 0.1, 0.62, N, sx * 1.25, 2.72, -3.2);
    // main thrusters at the back
    k.cyl(0.4, 0.6, K, sx * 0.8, 1.0, -2.95, { axis: 'z', r2: 0.3, seg: 10 });
    k.cyl(0.3, 0.05, T, sx * 0.8, 1.0, -3.26, { axis: 'z', seg: 10 });
    lamp(k, sx * 1.2, 1.12, 2.72, 0.14, N);
    // hover pads: housing, gold cap, glowing thruster and a ring under it
    for (const sz of [-1, 1]) {
      const x = sx * 1.95;
      const z = sz * 1.9 - 0.1;
      k.box(0.7, 0.24, 0.6, PD, sx * 1.6, 0.7, z);
      k.cyl(0.78, 0.36, K, x, 0.5, z, { seg: 14 });
      k.cyl(0.8, 0.2, P, x, 0.74, z, { r2: 0.5, seg: 14 });
      k.cyl(0.3, 0.1, L, x, 0.88, z, { seg: 10 });
      k.cyl(0.6, 0.06, T, x, 0.3, z, { seg: 14 });
      k.torus(0.72, 0.07, L, x, 0.3, z, { rx: PI / 2, seg: 16 });
      for (let i = 0; i < 4; i++) k.box(0.1, 0.2, 0.3, PD, x + Math.cos((i * PI) / 2 + 0.78) * 0.78, 0.5, z + Math.sin((i * PI) / 2 + 0.78) * 0.78, { ry: -(i * PI) / 2 - 0.78 + PI / 2 });
    }
  }
  hatch(k, -0.7, 1.62, 0.4, 0.3, PD);
  k.done();
  const t = turretAt(u, u.body, 1.87, -0.5);
  const g = kit(u, t, model + ':t');
  g.cyl(1.2, 0.14, PD, 0, 0.07, 0, { seg: 16 });
  g.cyl(1.24, 0.05, N, 0, 0.16, 0, { seg: 16 });
  g.plan([[-0.45, 1.6], [0.45, 1.6], [1.25, 0.5], [1.3, -0.9], [0.85, -1.4], [-0.85, -1.4], [-1.3, -0.9], [-1.25, 0.5]], 0.86, P, 0, 0.14, 0, { bevel: 0.2, inset: 0.16 });
  g.plan([[-0.3, 1.1], [0.3, 1.1], [0.8, 0.3], [0.8, -0.8], [-0.8, -0.8], [-0.8, 0.3]], 0.08, L, 0, 0.98, 0, { bevel: 0.03 });
  hatch(g, 0.4, 1.05, -0.3, 0.32, PD);
  g.box(0.4, 0.3, 0.4, PD, -0.45, 1.2, 0.2, { r: 0.05 }); // sensor
  g.box(0.3, 0.14, 0.04, N, -0.45, 1.22, 0.41);
  antenna(g, -0.8, 1.0, -1.0, 1.8);
  // main gun with neon rings
  g.box(0.9, 0.6, 0.5, PD, 0, 0.55, 1.5, { r: 0.1 });
  g.cyl(0.3, 1.2, PD, 0, 0.55, 2.3, { axis: 'z', seg: 10 });
  g.cyl(0.19, 3.4, K, 0, 0.55, 4.5, { axis: 'z', seg: 10 });
  for (const z of [3.2, 4.0, 4.8, 5.6]) g.torus(0.25, 0.05, N, 0, 0.55, z, { seg: 10 });
  g.cyl(0.28, 0.5, P, 0, 0.55, 6.0, { axis: 'z', seg: 10 });
  g.cyl(0.15, 0.04, N, 0, 0.55, 6.26, { axis: 'z', seg: 8 });
  // gun pods on both sides
  for (const sx of [-1, 1]) {
    g.box(0.5, 0.5, 1.5, L, sx * 1.5, 0.5, 0.5, { r: 0.08 });
    g.box(0.3, 0.2, 0.3, PD, sx * 1.22, 0.5, 0.3);
    barrel(g, sx * 1.5, 0.5, 1.2, 1.3, 0.09, K);
    g.cyl(0.14, 0.5, PD, sx * 1.5, 0.5, 1.6, { axis: 'z', seg: 8 });
    g.box(0.06, 0.1, 1.0, N, sx * 1.76, 0.5, 0.5);
    muzzleAt(u, t, sx * 1.5, 0.5, 2.55);
  }
  g.done();
  muzzleAt(u, t, 0, 0.55, 6.3, true);
  if (ghost) {
    for (const m of u.mats) {
      m.transparent = true;
      m.opacity = 0.45;
      m.depthWrite = false;
      m.userData.keepOpacity = 0.45;
    }
  }
  u.fly = 1.2;
  u.height = 3.6;
  u.tracer = ghost ? 0xfff9c4 : 0xffea00;
  return u;
}

export const BOT_UNITS = {
  mech1: biped, mech2: biped, mech45: biped, mech10: biped, mechult: biped, ebapm: biped,
  gzed1: goldZed, gzed2: goldZed, gzed3: goldZed, gzed4: goldZed, gzed5: goldZed,
  gcybertank: cyberTank, gcybertankghost: cyberTank,
};
