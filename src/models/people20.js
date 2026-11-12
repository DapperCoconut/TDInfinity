// Tower models: people, batch 20 (dressed with the vehicle kit in ../vehicles.js).
// In here: Raider (the pilot and its four planes), Plunder, Spectre, Planeswalker, Shock Commando,
// Void King, Ghostbuster.
// Each makeX(level) builds one tower's look; MODELS at the bottom says which tower uses which,
// and ../models.js lays it over TOWER_MODELS.
// The shared gear (helmets, vests, packs, guns) and the spaces it works in are in people1.js.

import * as THREE from 'three';
import { PARTS, antenna, glowMat, star, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import {
  GOLD, GUNMETAL, INK, LEATHER, STEEL, UP, WOOD, aimLong, armPatch, band, belt, boots, collar, dome, fist, glove,
  goggles, hair, headset, helmet, kneePad, muzzle, own, pouch, rifle, vest, wear,
} from './people1.js';
import { boltRifle, shoulderPads } from './people2.js';
import { balaclava } from './people3.js';
import { feet, glassMat, hands, hood } from './people5.js';
import { visor } from './people7.js';
import { arc, coil } from './people8.js';
import { crystal, lv, seeThrough, spinner } from './machines5.js';

const PI = Math.PI;
const GLASS = PARTS.GLASS;

// ------------------------------------------------------------------ shared bits for this batch

/** A round body along z through stations [[z, r], ...] (tail to nose). o.sx / o.sy squash it. */
function hullZ(k, st, col, x, y, o) {
  for (let i = 0; i < st.length - 1; i++) {
    const [z0, r0] = st[i];
    const [z1, r1] = st[i + 1];
    k.cyl(r0, z1 - z0, col, x, y, (z0 + z1) / 2, { axis: 'z', r2: r1, seg: o?.seg ?? 12, sx: o?.sx, sy: o?.sy });
  }
}

/** A missile along +z: body, nose cone and two sets of fins. */
function missileZ(k, x, y, z, len, r, col = 0xeceff1, nose = 0xe53935) {
  k.cyl(r, len * 0.78, col, x, y, z - len * 0.11, { axis: 'z', seg: 10 });
  k.cyl(r, len * 0.22, nose, x, y, z + len * 0.39, { axis: 'z', r2: 0.01, seg: 10 });
  for (const rz of [0, PI / 2]) k.box(r * 4.2, 0.02, len * 0.18, tone(col, 0.6), x, y, z - len * 0.4, { rz });
  for (const rz of [PI / 4, -PI / 4]) k.box(r * 2.8, 0.02, len * 0.1, tone(col, 0.6), x, y, z + len * 0.12, { rz });
}

/** A fat bomb along +z: round body, a coloured band and box fins. */
function bombZ(k, x, y, z, len, r, col = 0x37474f, bandCol = 0xfdd835) {
  hullZ(k, [[z - len * 0.5, r * 0.35], [z - len * 0.22, r], [z + len * 0.2, r], [z + len * 0.5, r * 0.2]], col, x, y, { seg: 10 });
  k.cyl(r * 1.03, len * 0.08, bandCol, x, y, z + len * 0.1, { axis: 'z', seg: 10 });
  for (const rz of [0, PI / 2]) k.box(r * 2.6, 0.03, len * 0.22, tone(col, 0.7), x, y, z - len * 0.42, { rz });
}

/** A crooked strip of light round a point (crackle around armour, cores). */
function sparks(k, x, y, z, r, n, mat, seed = 1) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2 + seed;
    const b = a + 0.9;
    arc(k, [x + Math.cos(a) * r, y + Math.sin(a * 3) * 0.3, z + Math.sin(a) * r], [x + Math.cos(b) * r, y + 0.4 + Math.cos(a * 2) * 0.3, z + Math.sin(b) * r], mat, 0.12, i + seed);
  }
}

// ------------------------------------------------------------------ Raider's planes

/** A propeller on the plane's nose (it turns about z: views.js spins userData.prop). */
function planeProp(h, bank, key, z, R, n, cone) {
  const g = new THREE.Group();
  g.position.set(0, 0, z);
  bank.add(g);
  const k = wear(h, g, `${key}:prop`);
  k.cyl(R * 0.2, R * 0.42, cone, 0, 0, R * 0.14, { axis: 'z', r2: 0.02, seg: 12 }); // spinner
  k.cyl(R * 0.22, R * 0.12, INK, 0, 0, -R * 0.08, { axis: 'z', seg: 12 });
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2;
    k.box(R * 0.17, R * 0.84, 0.05, 0x2b2118, -Math.sin(a) * R * 0.52, Math.cos(a) * R * 0.52, 0, { rz: a, r: 0.02 });
    k.box(R * 0.16, R * 0.12, 0.06, 0xfdd835, -Math.sin(a) * R * 0.92, Math.cos(a) * R * 0.92, 0, { rz: a });
  }
  k.cyl(R, 0.01, glassMat(h, 0xcfd8dc, 0.14), 0, 0, 0, { axis: 'z', seg: 20 }); // blur disc
  k.done();
  return g;
}

/** Prop fighter (Lv 0-1): olive drab, shark mouth, invasion stripes; Lv 1 rockets under the wings. */
function propFighter(h, k, bank, key, level, mz, ms) {
  const P = 0x556b2f;
  const line = tone(P, 0.66);
  hullZ(k, [[-2.7, 0.1], [-1.6, 0.4], [0.1, 0.66], [1.9, 0.7]], P, 0, 0, { sx: 0.9 });
  hullZ(k, [[1.9, 0.72], [2.5, 0.66], [2.62, 0.5]], tone(P, 0.82), 0, 0, { sx: 0.92 }); // cowling
  k.cyl(0.44, 0.06, 0x0b0c0d, 0, 0, 2.64, { axis: 'z', seg: 12 });
  for (const z of [-1.0, 0.4, 1.45]) k.torus(z < 0 ? 0.5 : 0.68, 0.014, line, 0, 0, z, { sx: 0.9, seg: 14 }); // panel lines
  hullZ(k, [[-1.5, 0.3], [0.3, 0.42], [1.5, 0.36]], tone(P, 1.3), 0, -0.36, { sx: 1.25, sy: 0.4 }); // pale belly
  for (const sd of [-1, 1]) {
    for (let i = 0; i < 3; i++) k.cyl(0.05, 0.22, 0x3a3d40, sd * 0.6, 0.12, 1.75 - i * 0.22, { axis: 'z', seg: 6 }); // exhaust stubs
    // shark mouth: a red grin with white teeth and an eye
    k.box(0.05, 0.34, 1.0, 0xc62828, sd * 0.55, -0.3, 2.05, { rz: -sd * 0.5 });
    k.box(0.06, 0.05, 1.0, 0xfafafa, sd * 0.6, -0.15, 2.05, { rz: -sd * 0.5 });
    for (let i = 0; i < 5; i++) k.cyl(0.0001, 0.14, 0xfafafa, sd * 0.58, -0.24, 1.66 + i * 0.19, { r2: 0.045, seg: 4, rz: -sd * 0.5 });
    k.ball(0.09, 0xfafafa, sd * 0.6, 0.06, 2.25, { seg: 8, rows: 6 });
    k.ball(0.05, INK, sd * 0.66, 0.06, 2.28, { seg: 6, rows: 4 });
    // low wings, invasion stripes, a star roundel, guns
    k.plan([[0, 1.35], [sd * 3.4, 1.05], [sd * 3.65, 0.82], [sd * 3.65, 0.3], [sd * 3.45, 0.1], [0, -0.35]], 0.15, P, 0, -0.42, 0, { bevel: 0.05 });
    [2.1, 2.35, 2.6, 2.85].forEach((x, i) => k.box(0.25, 0.17, 0.92, i % 2 ? INK : 0xfafafa, sd * x, -0.345, 0.56));
    k.cyl(0.34, 0.02, 0x1a237e, sd * 1.45, -0.26, 0.55, { seg: 18 });
    star(k, sd * 1.45, -0.255, 0.55, 0.28, 0xfafafa);
    k.box(1.6, 0.02, 0.04, line, sd * 1.7, -0.265, -0.02, { ry: sd * 0.12 }); // flap line
    k.box(0.08, 0.08, 0.08, sd < 0 ? 0xff1744 : 0x00e676, sd * 3.66, -0.35, 0.6);
    k.cyl(0.05, 0.7, GUNMETAL, sd * 1.25, -0.36, 1.5, { axis: 'z', seg: 6 });
    muzzle(h, bank, -0.36, 0, 0).position.set(sd * 1.25, -0.36, 1.9);
    if (level >= 1) for (const x of [1.85, 2.65]) {
      // Heavier Guns: rockets on rails under the wings
      k.box(0.06, 0.12, 0.9, INK, sd * x, -0.5, 0.5);
      k.cyl(0.1, 1.0, 0xbdbdbd, sd * x, -0.64, 0.45, { axis: 'z', seg: 10 });
      k.cyl(0.1, 0.25, 0xe53935, sd * x, -0.64, 1.07, { axis: 'z', r2: 0.01, seg: 10 });
      for (const rz of [0, PI / 2]) k.box(0.36, 0.02, 0.2, INK, sd * x, -0.64, 0.02, { rz });
      muzzle(h, bank, 0, 0, 0).position.set(sd * x, -0.64, 1.25);
      ms.push(h.muzzles.pop());
    }
    k.plan([[0, -1.9], [sd * 1.3, -2.1], [sd * 1.42, -2.3], [sd * 1.35, -2.6], [0, -2.75]], 0.09, P, 0, 0.05, 0, { bevel: 0.03 }); // tailplane
  }
  k.prism([[-2.85, 0], [-1.7, 0], [-2.15, 1.0], [-2.55, 1.2], [-2.85, 1.05]], 0.1, P, 0, 0.15, 0, { bevel: 0.03 }); // fin
  k.box(0.12, 0.25, 0.4, 0xfdd835, 0, 1.15, -2.55); // fin tip
  k.box(0.11, 0.9, 0.03, line, 0, 0.7, -2.5); // rudder hinge
  // bubble canopy on a sill, frame hoops, aerial mast
  k.box(0.8, 0.07, 1.8, tone(P, 0.8), 0, 0.52, 0.2, { r: 0.03 });
  k.ball(0.42, GLASS, 0, 0.58, 0.2, { sz: 2.0, seg: 14, rows: 8 });
  for (const z of [-0.15, 0.55]) k.torus(0.42, 0.025, tone(P, 0.8), 0, 0.58, z, { arc: PI, seg: 10, sx: 0.92, sy: 0.92 });
  k.cyl(0.015, 0.55, 0x111111, 0, 0.82, -0.95, { seg: 4, rx: -0.2 });
  mz.push(...h.muzzles.splice(0));
  return planeProp(h, bank, key, 2.72, 1.35, 3, 0xffd600);
}

/** Attack jet (Lv 2-3): two-tone grey, twin tails, a gold canopy; Lv 3 wingtip missiles and a targeting pod. */
function raiderJet(h, k, bank, level, mz, ms) {
  const P = 0x78909c;
  const D = 0x37474f;
  const line = tone(P, 0.62);
  const hh = 3.1;
  const r = 0.62;
  hullZ(k, [[-hh, r * 0.8], [-hh * 0.55, r], [hh * 0.3, r], [hh * 0.62, r * 0.72]], P, 0, 0, { sy: 0.88, seg: 14 });
  hullZ(k, [[hh * 0.62, r * 0.72], [hh * 0.92, r * 0.34], [hh * 1.12, 0.03]], D, 0, 0, { sy: 0.88, seg: 14 }); // radome
  k.cyl(0.02, 0.5, 0x111111, 0, 0, hh * 1.12 + 0.22, { axis: 'z', seg: 4 }); // pitot
  k.box(r * 0.8, r * 0.5, hh * 1.05, P, 0, r * 0.62, -hh * 0.36, { r: 0.08 }); // spine
  for (const z of [-hh * 0.5, -hh * 0.05, hh * 0.42]) k.torus(r, 0.014, line, 0, 0, z, { sy: 0.88, seg: 14 });
  k.box(r * 1.15, 0.08, r * 2.9, D, 0, r * 0.74, hh * 0.3, { r: 0.03 }); // canopy sill
  k.ball(r * 0.6, glowMat(h, 0xffb300, 0.5), 0, r * 0.8, hh * 0.3, { sz: 2.3, sy: 0.95, seg: 12, rows: 7 });
  k.box(r * 1.0, 0.035, 0.05, D, 0, r * 1.36, hh * 0.22); // canopy bow
  const xr = r * 0.55;
  const span = 3.3;
  const xt = xr + span;
  const z0 = hh * 0.18;
  const back = Math.tan(0.5) * span;
  const c = 2.3;
  for (const sd of [-1, 1]) {
    k.box(r * 0.72, r * 0.9, hh * 0.72, P, sd * r * 1.02, -r * 0.18, -hh * 0.02, { r: 0.06 }); // intakes
    k.box(r * 0.56, r * 0.72, 0.06, 0x08090a, sd * r * 1.02, -r * 0.18, hh * 0.34);
    k.box(r * 0.08, r * 0.8, 0.3, line, sd * r * 0.68, -r * 0.18, hh * 0.38); // splitter plate
    k.plan([[sd * xr, z0], [sd * xt, z0 - back], [sd * xt, z0 - back - c * 0.36], [sd * xr, z0 - c * 1.05]], 0.11, P, 0, -0.16, 0, { bevel: 0.04 });
    k.cyl(0.28, 0.02, D, sd * (xr + span * 0.55), -0.045, z0 - back * 0.55 - c * 0.4, { seg: 16 });
    star(k, sd * (xr + span * 0.55), -0.04, z0 - back * 0.55 - c * 0.4, 0.22, 0xfafafa);
    k.box(0.07, 0.07, 0.07, sd < 0 ? 0xff1744 : 0x00e676, sd * xt, -0.1, z0 - back - 0.05);
    k.plan([[sd * r * 0.5, -hh * 0.58], [sd * (r * 0.5 + 1.5), -hh * 0.86], [sd * (r * 0.5 + 1.5), -hh * 0.86 - 0.42], [sd * r * 0.5, -hh * 0.98]], 0.08, P, 0, 0, 0, { bevel: 0.03 }); // tailplane
    k.prism([[-hh * 0.98, 0], [-hh * 0.5, 0], [-hh * 0.8, 1.35], [-hh * 1.04, 1.35]], 0.07, D, sd * r * 0.72, r * 0.5, 0, { rz: -sd * 0.3, bevel: 0.02 }); // twin fins
    k.box(0.09, 0.2, 0.3, 0xffb300, sd * (r * 0.72 + 0.3), r * 0.5 + 0.98, -hh * 0.86, { rz: -sd * 0.3 });
    // a fuel tank under each wing
    k.box(0.08, 0.16, 0.6, D, sd * (xr + 1.4), -0.28, z0 - 1.6);
    hullZ(k, [[-0.75, 0.04], [-0.45, 0.17], [0.45, 0.17], [0.8, 0.03]], 0xb0bec5, sd * (xr + 1.4), -0.48, { seg: 10 });
    if (level >= 3) {
      // Targeting Pod: missiles on the wingtips
      k.box(0.06, 0.06, 1.0, D, sd * (xt + 0.03), -0.1, z0 - back - c * 0.18);
      missileZ(k, sd * (xt + 0.12), -0.1, z0 - back - c * 0.1, 1.4, 0.07);
      muzzle(h, bank, 0, 0, 0).position.set(sd * (xt + 0.12), -0.1, z0 - back - c * 0.1 + 0.75);
      ms.push(h.muzzles.pop());
    }
  }
  const burn = glowMat(h, 0xff9100);
  for (const x of [-r * 0.5, r * 0.5]) {
    const rn = r * 0.46;
    k.cyl(rn * 0.86, 0.5, 0x2a2c2e, x, 0, -hh - 0.2, { axis: 'z', r2: rn, seg: 12 });
    for (let i = 0; i < 8; i++) k.box(0.03, 0.03, 0.46, 0x151617, x + Math.cos((i * PI) / 4) * rn * 0.95, Math.sin((i * PI) / 4) * rn * 0.95, -hh - 0.2);
    k.cyl(rn * 0.72, 0.06, burn, x, 0, -hh - 0.4, { axis: 'z', seg: 12 });
  }
  if (level >= 3) {
    // the targeting pod under the belly: a pod with a turning ball and a red lens
    k.box(0.08, 0.2, 0.5, D, 0.35, -0.6, 0.6);
    hullZ(k, [[-0.6, 0.06], [-0.4, 0.17], [0.5, 0.17]], 0x546e7a, 0.35, -0.82, { seg: 10 });
    k.ball(0.17, INK, 0.35, -0.82, 0.55, { seg: 10, rows: 7 });
    k.cyl(0.08, 0.03, glowMat(h, 0xff1744), 0.35, -0.82, 0.71, { axis: 'z', seg: 10 });
  }
  for (const sd of [-1, 1]) {
    k.cyl(0.045, 0.7, GUNMETAL, sd * 0.36, -0.2, hh * 0.86, { axis: 'z', seg: 6 });
    mz.push(muzzle(h, bank, 0, 0, 0));
    h.muzzles.pop().position.set(sd * 0.36, -0.2, hh + 0.4);
  }
  return null;
}

/** Bomber (Lv 4): a long olive fuselage, a straight wing with four jet pods, gun turrets and bombs. */
function raiderBomber(h, k, bank, mz) {
  const P = 0x8d9a5b;
  const D = 0x4a5233;
  const line = tone(P, 0.66);
  hullZ(k, [[-4.0, 0.25], [-2.8, 0.66], [2.6, 0.78], [3.6, 0.7], [4.05, 0.45]], P, 0, 0, { sy: 0.95, seg: 16 });
  k.ball(0.46, GLASS, 0, 0, 4.05, { sz: 1.3, seg: 14, rows: 9 }); // glazed nose
  for (const a of [0, PI / 2]) k.torus(0.46, 0.02, D, 0, 0, 4.05, { ry: PI / 2, rz: a, sz: 1.3, seg: 14, arc: PI });
  for (const z of [-2.0, -0.4, 1.2, 2.8]) k.torus(0.76, 0.014, line, 0, 0, z, { sy: 0.95, seg: 16 });
  k.box(0.9, 0.3, 0.9, GLASS, 0, 0.66, 3.05, { r: 0.1 }); // cockpit windows
  k.box(0.94, 0.06, 0.06, D, 0, 0.8, 3.2);
  const burn = glowMat(h, 0xff9100);
  for (const sd of [-1, 1]) {
    k.plan([[sd * 0.6, 1.4], [sd * 5.2, 0.9], [sd * 5.45, 0.55], [sd * 5.3, 0.05], [sd * 0.6, -0.65]], 0.22, P, 0, 0.18, 0, { bevel: 0.06 });
    k.box(0.08, 0.08, 0.08, sd < 0 ? 0xff1744 : 0x00e676, sd * 5.45, 0.28, 0.5);
    k.cyl(0.32, 0.02, D, sd * 4.2, 0.41, 0.45, { seg: 16 });
    star(k, sd * 4.2, 0.42, 0.45, 0.26, 0xfafafa);
    for (const x of [1.8, 3.4]) {
      k.box(0.12, 0.3, 0.9, D, sd * x, 0.05, 0.6); // pylon
      hullZ(k, [[-0.8, 0.22], [-0.4, 0.34], [0.9, 0.36], [1.15, 0.3]], D, sd * x, -0.22, { seg: 12 });
      k.torus(0.3, 0.05, 0x9e9e9e, sd * x, -0.22, 1.15, { seg: 14 }); // intake lip
      k.cyl(0.26, 0.04, INK, sd * x, -0.22, 1.13, { axis: 'z', seg: 12 });
      k.cyl(0.18, 0.05, burn, sd * x, -0.22, -0.83, { axis: 'z', seg: 12 });
    }
    k.plan([[sd * 0.3, -3.0], [sd * 2.0, -3.35], [sd * 2.0, -3.75], [sd * 0.3, -3.9]], 0.12, P, 0, 0.3, 0, { bevel: 0.04 }); // tailplane
    // bombs on two racks under the belly
    k.box(0.12, 0.16, 3.0, INK, sd * 0.38, -0.78, -0.2);
    for (const z of [-1.2, 0, 1.2]) bombZ(k, sd * 0.38, -1.08, z - 0.2, 1.0, 0.24, 0x37474f);
  }
  k.prism([[-4.1, 0], [-2.7, 0], [-3.5, 1.9], [-4.15, 1.9]], 0.12, P, 0, 0.45, 0, { bevel: 0.04 }); // tall fin
  k.box(0.14, 0.3, 0.6, 0xfdd835, 0, 2.2, -3.85);
  // gun turrets: a dome on top and a tail stinger
  k.ball(0.38, GLASS, 0, 0.78, 0.9, { sy: 0.7, seg: 12, rows: 7 });
  k.cyl(0.4, 0.1, D, 0, 0.74, 0.9, { seg: 14 });
  for (const s of [-1, 1]) k.cyl(0.04, 0.8, GUNMETAL, s * 0.12, 0.95, 1.3, { axis: 'z', seg: 6 });
  k.ball(0.3, GLASS, 0, 0.05, -4.05, { seg: 12, rows: 7 });
  for (const s of [-1, 1]) k.cyl(0.04, 0.6, GUNMETAL, s * 0.1, 0.05, -4.45, { axis: 'z', seg: 6 });
  for (const sd of [-1, 1]) {
    k.cyl(0.05, 0.6, GUNMETAL, sd * 0.35, -0.45, 3.9, { axis: 'z', seg: 6 });
    mz.push(muzzle(h, bank, 0, 0, 0));
    h.muzzles.pop().position.set(sd * 0.35, -0.45, 4.25);
  }
}

/** Stealth bomber (Lv 5): a black flying wing with a sawtooth back edge and a nuke slung under it. */
function raiderStealth(h, k, bank, mz, ms) {
  const black = 0x15151c;
  const edge = 0x2a2a35;
  const red = glowMat(h, 0xff1744);
  const half = [[0, 3.0], [6.2, -0.6], [6.0, -1.15], [4.4, -0.25], [2.8, -1.45], [1.4, -0.6], [0, -1.6]];
  const pts = [...half, ...half.slice(1, -1).reverse().map(([x, z]) => [-x, z])];
  k.plan(pts, 0.36, black, 0, -0.2, 0, { bevel: 0.14 });
  k.ball(1.0, black, 0, 0.1, 0.5, { sx: 1.5, sy: 0.42, sz: 2.4, seg: 18, rows: 9 }); // centre hump
  for (const s of [-1, 1]) {
    k.box(0.36, 0.05, 0.3, 0x37474f, s * 0.25, 0.47, 1.75, { rx: -0.35, ry: s * 0.25 }); // cockpit windows
    k.box(0.75, 0.24, 0.95, edge, s * 1.3, 0.1, 0.2, { r: 0.1 }); // engine humps
    k.box(0.6, 0.08, 0.06, INK, s * 1.3, 0.16, 0.68); // intake slots
    k.box(0.9, 0.06, 0.22, red, s * 1.4, 0.04, -0.95); // exhaust slits
    k.box(3.4, 0.03, 0.05, edge, s * 3.1, 0.0, 1.0, { ry: s * 0.53 }); // leading edge line
    k.box(0.08, 0.06, 0.08, red, s * 6.1, -0.05, -0.85); // tip lights
  }
  k.box(0.8, 0.05, 0.12, red, 0, 0.38, 2.15);
  // the nuke: a fat bomb with fins, a yellow band and a glowing badge
  k.box(0.2, 0.5, 1.0, INK, 0, -0.55, 0);
  hullZ(k, [[-1.4, 0.18], [-0.9, 0.55], [0.9, 0.55], [1.45, 0.3], [1.65, 0.05]], 0x546e7a, 0, -1.1, { seg: 16 });
  k.cyl(0.57, 0.3, 0xffd600, 0, -1.1, 0.35, { axis: 'z', seg: 16 });
  for (const rz of [PI / 4, -PI / 4]) k.box(1.5, 0.05, 0.55, INK, 0, -1.1, -1.25, { rz });
  k.box(0.04, 0.38, 0.38, glowMat(h, 0xffd600), 0.56, -1.1, -0.3);
  for (const sd of [-1, 1]) {
    mz.push(muzzle(h, bank, 0, 0, 0));
    h.muzzles.pop().position.set(sd * 0.9, -0.3, 2.4);
  }
  ms.push(muzzle(h, bank, -1.1, 0, 0));
  h.muzzles.pop();
}

/** Builds the plane for a level: { plane, muzzles } with userData { bank, prop, bay, missiles } as views.js wants. */
function raiderPlane(h, key, level) {
  const plane = new THREE.Group();
  const bank = new THREE.Group();
  plane.add(bank);
  const mz = [];
  const ms = [];
  const saved = h.muzzles;
  h.muzzles = [];
  const k = wear(h, bank, `${key}:plane`);
  let prop = null;
  if (level <= 1) prop = propFighter(h, k, bank, key, level, mz, ms);
  else if (level <= 3) raiderJet(h, k, bank, level, mz, ms);
  else if (level === 4) raiderBomber(h, k, bank, mz);
  else raiderStealth(h, k, bank, mz, ms);
  k.done();
  h.muzzles = saved;
  const bay = new THREE.Object3D();
  bay.position.set(0, -0.9, 0);
  bank.add(bay);
  plane.userData = { bank, prop, bay, missiles: ms };
  return { plane, muzzles: mz };
}

// ------------------------------------------------------------------ Raider (the pilot)

/** A leather flying cap with ear flaps and goggles up on the brow (head space). */
function flyingCap(k, col, lens) {
  dome(k, 0.7, 0.5, col, 0, 0.92, -0.02);
  band(k, 0.68, 0.06, 0.62, 3.4, col, 0.62, { ry: PI });
  for (const s of [-1, 1]) {
    k.box(0.16, 0.66, 0.6, col, s * 0.68, 0.42, 0.02, { r: 0.07 }); // ear flaps
    k.cyl(0.1, 0.04, tone(col, 0.7), s * 0.77, 0.5, 0.02, { axis: 'x', seg: 8 });
  }
  k.tube([[-0.68, 0.14, 0.12], [-0.4, -0.08, 0.42], [0.4, -0.08, 0.42], [0.68, 0.14, 0.12]], 0.035, tone(col, 0.7), { seg: 10, sides: 4 });
  goggles(k, 1.06, lens, { r: 0.7, frame: 0x8d6e63, strap: tone(col, 0.7) });
}

/** A jet helmet: round shell, a visor, ear pods, a ridge and an oxygen mask with its hose (head space). */
function jetHelmet(k, col, visorMat, mask, stripe) {
  dome(k, 0.78, 0.68, col, 0, 0.8, 0);
  k.cyl(0.78, 0.6, col, 0, 0.5, 0, { seg: 22, open: true });
  band(k, 0.8, 0.08, 0.12, 2.0, tone(col, 0.8), 1.08); // visor housing
  band(k, 0.82, 0.05, 0.36, 1.9, visorMat, 0.85);
  for (const s of [-1, 1]) {
    k.cyl(0.24, 0.12, tone(col, 0.85), s * 0.8, 0.6, 0, { axis: 'x', seg: 14 });
    k.cyl(0.1, 0.04, INK, s * 0.87, 0.6, 0, { axis: 'x', seg: 8 });
  }
  k.torus(0.79, 0.05, stripe, 0, 0.8, 0, { arc: PI, ry: PI / 2, sy: 0.87, seg: 18 }); // stripe over the top
  k.cyl(0.26, 0.3, mask, 0, 0.36, 0.66, { axis: 'z', seg: 14, r2: 0.18 });
  k.cyl(0.1, 0.04, INK, 0, 0.36, 0.82, { axis: 'z', seg: 10 });
  for (const s of [-1, 1]) k.box(0.04, 0.04, 0.5, INK, s * 0.26, 0.42, 0.42);
  k.tube([[0.05, 0.22, 0.72], [0.25, -0.05, 0.75], [0.4, -0.3, 0.62]], 0.05, 0x37474f, { seg: 10, sides: 6 });
}

/** A Mae West life vest: two puffy lobes, a collar roll, a waist strap and red pull tabs (torso space). */
function lifeVest(k, col) {
  for (const s of [-1, 1]) {
    k.box(0.86, 1.05, 0.34, col, s * 0.46, 0.28, 0.58, { r: 0.16 });
    k.box(0.1, 0.2, 0.05, 0xc62828, s * 0.5, -0.32, 0.72); // pull tabs
    k.cyl(0.04, 0.12, INK, s * 0.5, -0.17, 0.72, { seg: 6 });
  }
  k.torus(0.52, 0.17, col, 0, 0.96, 0.04, { rx: PI / 2, seg: 18 });
  k.box(2.1, 0.16, 1.12, tone(col, 0.65), 0, -0.45, 0, { r: 0.04 }); // waist strap
  k.box(0.3, 0.22, 0.06, STEEL, 0, -0.45, 0.58, { r: 0.03 });
  for (let i = 0; i < 3; i++) k.box(0.7, 0.025, 0.03, tone(col, 0.75), -0.46, 0.55 - i * 0.28, 0.76); // seams
}

/** A low trolley on the pad (root space): rockets (Lv 1-3) or fat bombs (Lv 4-5) on a bed with wheels. */
function ammoTrolley(k, x, z, level) {
  k.box(1.9, 0.1, 1.1, 0x455a64, x, 0.42, z, { r: 0.03 });
  for (const s of [-1, 1]) k.box(1.9, 0.14, 0.08, 0x37474f, x, 0.52, z + s * 0.52);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    k.cyl(0.2, 0.12, 0x212121, x + sx * 0.65, 0.2, z + sz * 0.46, { axis: 'z', seg: 14 });
    k.cyl(0.08, 0.14, STEEL, x + sx * 0.65, 0.2, z + sz * 0.46, { axis: 'z', seg: 8 });
  }
  k.tube([[x - 0.95, 0.45, z], [x - 1.35, 0.6, z], [x - 1.5, 0.9, z]], 0.04, INK, { seg: 8, sides: 5 }); // tow bar
  if (level >= 4) {
    const col = level >= 5 ? 0x263238 : 0x37474f;
    for (const bz of [-0.26, 0.26]) bombZ(k, x, 0.75, z + bz, 1.4, 0.24, col, level >= 5 ? 0xffd600 : 0xfdd835);
  } else {
    const n = level >= 3 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const rz = z + (i - (n - 1) / 2) * 0.32;
      k.cyl(0.12, 1.3, 0xbdbdbd, x, 0.62, rz, { axis: 'x', seg: 10 });
      k.cyl(0.12, 0.3, 0xe53935, x + 0.8, 0.62, rz, { axis: 'x', seg: 10, r2: 0.01 });
      for (const a of [0, PI / 2]) k.box(0.2, 0.4, 0.03, INK, x - 0.6, 0.62, rz, { rx: a });
    }
  }
}

/** A windsock on a pole (root space): striped cone on a ring. */
function windsock(k, x, z) {
  k.cyl(0.06, 2.6, 0xfafafa, x, 1.3, z, { seg: 8 });
  k.cyl(0.18, 0.08, INK, x, 0.04, z, { seg: 10 });
  k.torus(0.24, 0.03, STEEL, x, 2.45, z + 0.25, { seg: 14 });
  for (let i = 0; i < 4; i++) k.cyl(0.24 - i * 0.04, 0.32, i % 2 ? 0xfafafa : 0xff6d00, x, 2.45 - i * 0.03, z + 0.42 + i * 0.32, { axis: 'z', seg: 12, r2: 0.2 - i * 0.04, open: true });
}

/**
 * Raider: an attack pilot on the runway pad who waves a light baton at the plane that circles the
 * tower. Lv 0-1 a leather flying cap and a yellow life vest; Lv 1 a trolley of rockets; Lv 2 a jet
 * helmet with a gold visor and runway lights; Lv 3 a windsock and more rockets; Lv 4 a trolley of
 * bombs; Lv 5 a black stealth suit, a red visor, a radiation patch and a nuke-yellow bomb trolley.
 * The plane: a prop fighter (Lv 0-1), a jet (Lv 2-3), a bomber (Lv 4), a stealth bomber (Lv 5).
 */
export function makeRaider(level) {
  level = lv(level);
  const jet = level >= 2;
  const stealth = level >= 5;
  const suit = stealth ? 0x1c1c24 : jet ? 0x4b5a30 : 0x6b7d3a;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: suit, pants: suit, arms: suit, face: 'soldier' });
  const key = `raider${level}`;
  const red = glowMat(h, 0xff1744);
  const light = glowMat(h, stealth ? 0xff1744 : 0xff6d00);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  if (jet) jetHelmet(hd, stealth ? 0x263238 : 0x556b2f, stealth ? red : 0xffb300, stealth ? 0x37474f : 0x546e7a, stealth ? 0xff1744 : 0xfdd835);
  else flyingCap(hd, 0x4e342e, 0xa5d6a7);
  // flight suit: zip, harness, pockets, a name tag
  t.box(0.06, 1.4, 0.05, 0xbdbdbd, -0.12, -0.05, 0.53);
  for (const s of [-1, 1]) t.box(0.24, 2.0, 1.14, INK, s * 0.62, 0.0, 0, { r: 0.03 });
  pouch(t, 0.62, -0.75, 0.52, 0.36, 0.3, tone(suit, 0.85), 0.08);
  lifeVest(t, stealth ? 0x37474f : 0xffb300);
  if (stealth) t.box(0.36, 0.36, 0.05, glowMat(h, 0xffd600), 0.5, 0.45, 0.76, { r: 0.04 }); // radiation patch
  else t.box(0.42, 0.18, 0.04, 0x795548, 0.5, 0.82, 0.76); // name tag
  belt(t, INK, 0x9e9e9e);
  hd.done();
  t.done();
  hands(h, key, stealth ? 0x212121 : LEATHER, tone(suit, 0.82), (a, s) => {
    if (s > 0) armPatch(a, 1, stealth ? 0x263238 : 0x1a237e, stealth ? 0xff1744 : 0xfafafa);
  });
  feet(h, key, stealth ? 0x0c0c0c : 0x3e2723, (b) => {
    b.box(0.55, 0.45, 0.12, tone(suit, 0.85), 0, -0.5, 0.53, { r: 0.04 }); // thigh pocket
    b.box(0.57, 0.12, 0.14, tone(suit, 0.7), 0, -0.33, 0.54, { r: 0.03 });
  });
  const r = wear(h, h.root, `${key}:pad`);
  if (level >= 1) ammoTrolley(r, 2.0, 0.8, level);
  if (level >= 3) windsock(r, -2.1, 0.6);
  if (jet) for (const x of [-1.9, 1.9]) {
    // runway edge lights
    r.cyl(0.14, 0.3, 0x37474f, x, 0.15, -1.2, { seg: 10 });
    r.ball(0.11, light, x, 0.34, -1.2, { seg: 8, rows: 6 });
  }
  r.done();
  // Waving the plane in: right arm high with a light baton, a second baton down in the left hand.
  for (const [arm, s] of [[h.rightArm, 1], [h.leftArm, -1]]) {
    const g = fist(arm, -1.9, 1);
    const w = wear(h, g, `${key}:baton`);
    w.cyl(0.09, 0.4, INK, 0, -0.05, 0, { seg: 8 });
    w.cyl(0.12, 0.08, 0x37474f, 0, -0.28, 0, { seg: 10 });
    w.cyl(0.1, 1.0, light, 0, -0.82, 0, { seg: 10, r2: 0.07 });
    w.done();
    if (s < 0) g.rotation.x = 0.3;
  }
  h.rightArm.rotation.set(PI * 0.85, 0, 0.25);
  h.pose = { right: PI * 0.85, left: 0, leftRecoil: 0 };
  const { plane, muzzles } = raiderPlane(h, key, level);
  h.plane = plane;
  h.muzzles = muzzles;
  h.flyHeight = level >= 4 ? 16 : 14;
  h.tracer = stealth ? 0xff1744 : 0xffd54f;
  return own(h);
}

// ------------------------------------------------------------------ Plunder

/** A tricorn hat: a crown on a triangle of upturned brims, point to the front (head space). */
function tricorn(k, col, trim, o = {}) {
  const y = 1.0;
  k.cyl(0.68, 0.5, col, 0, y + 0.22, -0.02, { seg: 20, r2: 0.62 });
  dome(k, 0.62, 0.22, col, 0, y + 0.47, -0.02);
  k.cyl(0.69, 0.1, tone(col, 0.7), 0, y + 0.06, -0.02, { seg: 20 }); // hat band
  const tri = [[0, 1.4], [-1.3, -0.78], [1.3, -0.78]];
  k.plan(tri, 0.06, col, 0, y - 0.02, 0, { bevel: 0.02 });
  const cx = 0;
  const cz = (1.4 - 0.78 - 0.78) / 3;
  for (let i = 0; i < 3; i++) {
    const [ax, az] = tri[i];
    const [bx, bz] = tri[(i + 1) % 3];
    const len = Math.hypot(bx - ax, bz - az);
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    const ry = Math.atan2(bx - ax, bz - az);
    const out = Math.cos(ry) * (mx - cx) - Math.sin(ry) * (mz - cz) > 0 ? 1 : -1;
    k.box(0.07, 0.48, len, col, mx, y + 0.22, mz, { ry, rz: -out * 0.32, r: 0.03 });
    if (trim != null) k.box(0.09, 0.07, len * 0.96, trim, mx + Math.cos(ry) * out * 0.08, y + 0.46, mz - Math.sin(ry) * out * 0.08, { ry, rz: -out * 0.32 });
  }
  if (o.skull) {
    // a skull and crossbones on the front of the crown
    k.ball(0.13, 0xfafafa, 0, y + 0.3, 0.66, { sy: 0.9, seg: 10, rows: 7 });
    for (const s of [-1, 1]) {
      k.box(0.36, 0.05, 0.04, 0xfafafa, 0, y + 0.18, 0.68, { rz: s * 0.6 });
      k.ball(0.03, INK, s * 0.05, y + 0.32, 0.78, { seg: 6, rows: 4 });
    }
  }
  if (o.plume != null) {
    // a big curling feather plume
    k.tube([[0.45, y + 0.3, -0.3], [0.75, y + 0.8, -0.55], [0.6, y + 1.2, -0.95], [0.25, y + 1.15, -1.2]], 0.12, o.plume, { seg: 16, sides: 6 });
    k.tube([[0.45, y + 0.3, -0.25], [0.85, y + 0.55, -0.5], [0.95, y + 0.85, -0.85]], 0.08, tone(o.plume, 1.25), { seg: 12, sides: 6 });
  }
}

/** A flintlock blunderbuss on the fist (gun space): wooden stock, lock, brass barrel and a flared bell. */
function blunderbuss(k, o = {}) {
  const len = o.len ?? 1.9;
  const brass = o.brass ?? 0xb8860b;
  const wood = o.wood ?? 0x6d4c41;
  const bell = o.bell ?? 0.32;
  const U = UP;
  const B = U + 0.08;
  k.slab(0.26, 0.85, 0.36, wood, 0, 0.5, U - 0.14, { td: 1.6, tz: -0.12 }); // stock
  k.box(0.28, 0.08, 0.55, brass, 0, 0.94, U - 0.2, { r: 0.02 }); // butt plate
  k.box(0.22, 0.3, 0.28, wood, 0, 0.0, U - 0.12, { r: 0.05 }); // wrist
  k.box(0.26, len - 0.6, 0.24, wood, 0, -(len - 0.6) / 2 - 0.1, U - 0.04, { r: 0.05 }); // fore-stock
  k.cyl(0.09, len - 0.3, brass, 0, -(len - 0.3) / 2 - 0.1, B, { seg: 12, r2: 0.11 }); // barrel
  k.cyl(bell, 0.5, brass, 0, -len + 0.25, B, { seg: 16, r2: 0.1 }); // flared bell
  k.cyl(bell - 0.05, 0.02, 0x050505, 0, -len - 0.005, B, { seg: 16 });
  k.torus(bell - 0.02, 0.025, tone(brass, 0.7), 0, -len + 0.02, B, { rx: PI / 2, seg: 18 });
  for (const y of [-0.55, -1.05]) k.cyl(0.13, 0.06, tone(brass, 0.75), 0, y, B, { seg: 12 }); // bands
  k.cyl(0.025, len - 0.6, 0x3e2723, 0, -(len - 0.6) / 2 - 0.25, U - 0.17, { seg: 6 }); // ramrod
  // the lock: plate, hammer, frizzen and pan on the right side
  k.box(0.04, 0.45, 0.2, STEEL, -0.14, -0.1, B - 0.04, { r: 0.02 });
  k.box(0.05, 0.2, 0.06, STEEL, -0.17, 0.08, B + 0.12, { rx: 0.5 }); // hammer
  k.box(0.05, 0.1, 0.16, STEEL, -0.17, -0.22, B + 0.08); // frizzen
  k.torus(0.1, 0.022, brass, 0, -0.12, U - 0.26, { ry: PI / 2, seg: 10, arc: PI }); // trigger guard
  k.box(0.2, 0.22, 0.4, wood, 0, 0.14, U - 0.36, { rx: -0.35, r: 0.05 }); // grip
  return [-len, B];
}

/** A shovel on the back, across from shoulder to hip (torso space). */
function backShovel(k, blade) {
  const g = { rz: 0.5 };
  const z = -0.74;
  k.cyl(0.07, 2.8, 0x6d4c41, 0, 0.1, z, { seg: 8, ...g });
  k.slab(0.72, 0.85, 0.06, blade, 0.87, -1.5, z, { tw: 0.55, ...g }); // blade
  k.box(0.1, 0.4, 0.1, tone(blade, 0.7), 0.6, -1.0, z, g); // socket
  k.box(0.5, 0.12, 0.12, 0x4e342e, -0.69, 1.37, z, g); // D grip
  for (const y of [0.5, -0.4]) k.box(2.1, 0.1, 0.08, INK, 0, y, z + 0.08); // straps
}

/**
 * Plunder: a treasure-digging pirate with a flared blunderbuss, a tricorn hat and a shovel on his
 * back. Lv 1 Wider Spread: an eyepatch and a bigger bell; Lv 2 a spyglass and a sack of loot;
 * Lv 3 a red captain's coat with gold buttons and a skull on the hat; Lv 4 Pirate King: gold trim,
 * epaulettes, a feather plume, a gold shovel and a gold blunderbuss.
 */
export function makePlunder(level) {
  level = lv(level, 4);
  const captain = level >= 3;
  const king = level >= 4;
  const coat = 0x8e1b1b;
  const h = makeHumanoid({ skin: 0xd2a679, shirt: captain ? coat : 0xeeeeee, pants: 0x3e2723, arms: captain ? coat : 0xeeeeee, face: 'soldier' });
  const key = `plunder${level}`;
  const gold = king ? glowMat(h, 0xffc400, 0.5) : 0xc9a227;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  // a red bandana under the hat, a beard with two beaded braids, a gold earring
  hd.cyl(0.665, 0.22, 0xc62828, 0, 0.92, 0, { seg: 22 });
  hd.box(0.22, 0.2, 0.14, 0xb71c1c, 0.15, 0.9, -0.68);
  for (const s of [-1, 1]) hd.box(0.12, 0.4, 0.05, 0xc62828, 0.15 + s * 0.12, 0.65, -0.72, { rz: s * 0.3 });
  hd.box(0.95, 0.42, 0.22, 0x3e2723, 0, 0.16, 0.56, { r: 0.1 }); // beard
  hd.box(0.6, 0.1, 0.1, 0x3e2723, 0, 0.42, 0.66, { r: 0.04 }); // moustache
  for (const s of [-1, 1]) {
    hd.cyl(0.06, 0.32, 0x3e2723, s * 0.22, -0.12, 0.62, { seg: 6 }); // braids
    hd.ball(0.06, 0xc9a227, s * 0.22, -0.3, 0.62, { seg: 6, rows: 4 });
  }
  hd.torus(0.08, 0.02, 0xffc107, 0.66, 0.42, 0.05, { ry: PI / 2, seg: 10 }); // earring
  if (level >= 1) {
    // Wider Spread: an eyepatch over the right eye and its strap
    hd.cyl(0.17, 0.05, INK, -0.25, 0.72, 0.6, { axis: 'z', seg: 12 });
    hd.torus(0.64, 0.025, INK, 0, 0.82, 0, { rx: PI / 2 - 0.3, seg: 22 });
  }
  tricorn(hd, 0x1a1a1a, captain ? (king ? gold : 0xc9a227) : null, { skull: captain, plume: king ? 0xfafafa : null });
  if (!captain) {
    // a deckhand's striped shirt and an open leather waistcoat
    for (const y of [-0.55, 0.0, 0.55]) t.box(2.04, 0.18, 1.04, 0xc62828, 0, y, 0);
    for (const s of [-1, 1]) t.slab(0.55, 1.9, 0.08, 0x5d4037, s * 0.72, -0.05, 0.53, { tw: 0.8 });
    for (const s of [-1, 1]) t.box(0.28, 1.9, 1.08, 0x5d4037, s * 0.9, -0.05, 0, { r: 0.03 });
    t.box(1.6, 1.9, 0.08, 0x5d4037, 0, -0.05, -0.53);
  } else {
    // captain's coat: tails, lapels, a lace jabot and two rows of gold buttons
    t.slab(2.2, 1.6, 0.14, coat, 0, -1.6, -0.56, { bw: 1.12 });
    for (const s of [-1, 1]) {
      t.slab(0.3, 1.6, 1.1, coat, s * 1.0, -1.6, 0, { bw: 1.15 });
      t.box(0.36, 1.4, 0.08, tone(coat, 0.75), s * 0.42, 0.25, 0.54, { rz: s * 0.18, r: 0.03 }); // lapels
      for (let i = 0; i < 3; i++) t.ball(0.07, gold, s * 0.62, 0.35 - i * 0.42, 0.56, { seg: 8, rows: 5 });
    }
    t.box(0.55, 1.6, 0.05, 0xfafafa, 0, 0.1, 0.52);
    for (let i = 0; i < 3; i++) t.box(0.42 - i * 0.06, 0.16, 0.12, 0xfafafa, 0, 0.75 - i * 0.18, 0.58, { r: 0.05 }); // jabot ruffles
    if (king) {
      // Pirate King: gold epaulettes with fringe, a gold hem line
      for (const s of [-1, 1]) {
        t.ball(0.42, gold, s * 1.3, 1.0, 0, { sy: 0.35, seg: 14, rows: 6 });
        for (let i = 0; i < 6; i++) t.cyl(0.03, 0.3, gold, s * (1.05 + i * 0.1), 0.8, Math.sin(i) * 0.25, { seg: 4 });
      }
      t.box(2.3, 0.08, 0.16, gold, 0, -2.36, -0.56);
    }
  }
  // a wide sash, a belt and a big buckle, a powder horn on a cord
  t.box(2.1, 0.36, 1.1, captain ? (king ? 0x1a237e : 0x283593) : 0xb71c1c, 0, -0.62, 0, { r: 0.05 });
  t.cyl(0.14, 0.5, captain ? 0x283593 : 0xb71c1c, -0.75, -0.95, 0.5, { seg: 8, r2: 0.05 }); // sash tail
  t.box(2.08, 0.22, 1.12, LEATHER, 0, -0.9, 0, { r: 0.03 });
  t.box(0.4, 0.3, 0.06, captain ? gold : 0xc9a227, 0, -0.9, 0.58, { r: 0.04 });
  t.box(0.2, 0.14, 0.07, LEATHER, 0, -0.9, 0.6);
  t.box(0.12, 2.4, 1.12, LEATHER, 0, 0.05, 0, { rz: -0.6 }); // cross strap
  t.cyl(0.15, 0.7, 0xefe4c8, 0.85, -1.05, 0.3, { seg: 10, r2: 0.05, rz: 0.9 }); // powder horn
  t.cyl(0.155, 0.06, 0xc9a227, 0.95, -0.98, 0.3, { seg: 10, rz: 0.9 });
  if (level >= 2) {
    // a brass spyglass on the hip and a sack of loot with coins spilling out
    t.cyl(0.11, 0.8, 0xb8860b, -0.95, -1.05, 0.35, { seg: 12, r2: 0.08, rz: -0.25 });
    t.cyl(0.12, 0.08, 0x5d4037, -0.88, -0.75, 0.35, { seg: 12, rz: -0.25 });
    t.ball(0.45, 0x8d6e63, 1.2, -1.25, -0.2, { sy: 1.15, seg: 12, rows: 9 });
    t.cyl(0.18, 0.2, 0x6d4c41, 1.2, -0.75, -0.2, { seg: 10 });
    for (let i = 0; i < 4; i++) t.cyl(0.09, 0.03, glowMat(h, 0xffc400, 0.6), 1.05 + i * 0.1, -0.62 + (i % 2) * 0.05, -0.15 + i * 0.05, { seg: 10, rx: 0.4 * i });
  }
  backShovel(t, king ? 0xffc400 : 0x9e9e9e);
  hd.done();
  t.done();
  hands(h, key, null, captain ? tone(coat, 0.85) : 0xd6d6d6, captain ? (a) => a.box(1.12, 0.36, 1.12, king ? 0xffc400 : 0xfafafa, 0, -1.45, 0, { r: 0.05 }) : null);
  feet(h, key, 0x1a1a1a, (b) => b.box(1.14, 0.2, 1.16, 0x3e2723, 0, -1.3, 0.02, { r: 0.04 })); // boot cuffs
  const g = fist(h.rightArm, -1.9, 1.25);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = blunderbuss(gk, { len: captain ? 2.0 : 1.75, bell: level >= 1 ? 0.38 : 0.3, brass: king ? 0xffc400 : 0xb8860b, wood: king ? 0x4e342e : 0x6d4c41 });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.recoilScale = 1.6;
  h.tracer = king ? 0xffd740 : 0xffab40;
  return own(h);
}

// ------------------------------------------------------------------ Spectre

/** Spectre's drone: a quadcopter with rotors, a camera ball and skids; Lv 4+ a gun pod. Hidden until its ability is on. */
function spectreDrone(h, key, level, eye) {
  const drone = new THREE.Group();
  const s = level >= 4 ? 1.2 : 1;
  const body = level >= 4 ? 0x1a1a1a : 0x37474f;
  const k = wear(h, drone, `${key}:drone`);
  k.box(0.9 * s, 0.3, 1.1 * s, body, 0, 0, 0, { r: 0.1 });
  k.box(0.6 * s, 0.12, 0.7 * s, tone(body, 0.8), 0, 0.2, -0.05, { r: 0.05 });
  const arms = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (const [x, z] of arms) {
    k.box(0.12, 0.08, 1.15 * s, INK, x * 0.4 * s, 0.05, z * 0.4 * s, { ry: Math.atan2(x, z) });
    k.cyl(0.13, 0.22, INK, x * 0.8 * s, 0.12, z * 0.8 * s, { seg: 10 });
    k.cyl(0.06, 0.04, eye, x * 0.8 * s, -0.02, z * 0.8 * s, { seg: 8 });
  }
  k.ball(0.17, INK, 0, -0.22, 0.45 * s, { seg: 10, rows: 7 });
  k.cyl(0.08, 0.04, eye, 0, -0.22, 0.45 * s + 0.17, { axis: 'z', seg: 10 });
  for (const sd of [-1, 1]) {
    k.box(0.05, 0.3, 0.05, INK, sd * 0.35, -0.3, 0);
    k.cyl(0.04, 0.9, INK, sd * 0.35, -0.45, 0, { axis: 'z', seg: 6 });
  }
  if (level >= 4) {
    k.box(0.3, 0.24, 0.6, 0x111316, 0, -0.32, 0.05, { r: 0.04 });
    k.cyl(0.05, 0.45, STEEL, 0, -0.34, 0.55, { axis: 'z', seg: 8 });
  }
  k.done();
  const rotors = [];
  for (const [x, z] of arms) {
    const r = new THREE.Group();
    r.position.set(x * 0.8 * s, 0.26, z * 0.8 * s);
    drone.add(r);
    const rk = wear(h, r, `${key}:rotor`);
    rk.box(0.95 * s, 0.03, 0.12, 0x212121, 0, 0, 0, { r: 0.01 });
    rk.cyl(0.05, 0.06, STEEL, 0, 0.02, 0, { seg: 8 });
    rk.done();
    rotors.push(r);
  }
  drone.userData.rotors = rotors;
  drone.visible = false;
  h.root.add(drone);
  h.drone = drone;
}

/**
 * Spectre: a black-ops soldier with a burst rifle. Lv 1 a quad-rotor drone (out while the ability
 * is on) and a thigh holster; Lv 2 Hollow Points: quad-tube night vision and a weapon light; Lv 3
 * Defense Mode: a plate carrier, a suppressor and a scope; Lv 4 Support Mode: a darker suit, a cyan
 * visor and an armed drone; Lv 5 Phantom Ops: a red visor, an IR strobe and glowing arm bands.
 */
export function makeSpectre(level) {
  level = lv(level);
  const dark = level >= 4;
  const suit = dark ? 0x111316 : 0x263238;
  const h = makeHumanoid({ skin: 0xc68642, shirt: suit, pants: dark ? 0x0b0c0e : 0x1c2429, arms: suit, face: 'soldier' });
  const key = `spectre${level}`;
  const eyeC = level >= 5 ? 0xff1744 : dark ? 0x00e5ff : 0x76ff03;
  const eye = glowMat(h, eyeC);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  balaclava(hd, 0x1a1a1a);
  helmet(hd, dark ? 0x1a1a1a : 0x37474f, { cover: dark ? 0x111111 : 0x263238 });
  headset(hd, 0x222222);
  if (dark) visor(hd, eye);
  else if (level >= 2) {
    // quad-tube night vision on a mount
    hd.box(0.34, 0.24, 0.16, INK, 0, 1.18, 0.72, { r: 0.03 });
    hd.box(0.9, 0.26, 0.24, 0x263238, 0, 0.88, 0.76, { r: 0.05 });
    for (const x of [-0.36, -0.12, 0.12, 0.36]) {
      hd.cyl(0.1, 0.28, 0x263238, x, 0.88, 0.95, { axis: 'z', seg: 12 });
      hd.cyl(0.075, 0.02, eye, x, 0.88, 1.1, { axis: 'z', seg: 12 });
    }
  } else goggles(hd, 1.2, 0x37474f, { r: 0.77 });
  // plate carrier (Lv 3+) or a chest rig
  if (level >= 3) vest(t, dark ? 0x1c1f24 : 0x37474f, { pouches: 3, pouch: dark ? 0x15171a : 0x2b3238, patch: 0x111111 });
  else {
    t.box(1.5, 0.7, 0.22, 0x2b3238, 0, -0.1, 0.56, { r: 0.05 });
    for (const x of [-0.45, 0, 0.45]) pouch(t, x, -0.1, 0.66, 0.38, 0.45, 0x1e252a);
    for (const s of [-1, 1]) t.box(0.22, 1.6, 1.12, INK, s * 0.5, 0.3, 0, { r: 0.03 });
  }
  if (level >= 5) {
    t.box(0.3, 0.26, 0.12, INK, -0.62, 0.62, 0.72, { r: 0.04 }); // IR strobe
    t.cyl(0.08, 0.06, eye, -0.62, 0.62, 0.8, { axis: 'z', seg: 10 });
  }
  belt(t, INK, 0x424242);
  pouch(t, 0.75, -1.0, 0.5, 0.3, 0.3, 0x1e252a, 0.16);
  hd.done();
  t.done();
  hands(h, key, 0x151515, tone(suit, 0.8), (a, s) => {
    if (level >= 5) a.box(1.06, 0.12, 1.06, eye, 0, -0.6, 0); // glowing arm bands
    if (s > 0) armPatch(a, 1, 0x1a1a1a, eyeC);
  });
  feet(h, key, 0x111111, (b) => {
    if (level >= 3) kneePad(b, 0x1a1a1a);
    if (level >= 1) b.box(0.24, 0.6, 0.5, INK, 0.56, -0.55, 0.05, { r: 0.05 }); // thigh holster
  });
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = rifle(gk, {
    len: level >= 3 ? 2.35 : 2.0, body: 0x1c1c1c, furn: 0x2b2b2b, mag: 'box', optic: level >= 3 ? 'scope' : 'dot',
    lens: eyeC, can: level >= 3, light: level >= 2,
  });
  if (level >= 1) gk.box(0.06, 0.1, 0.08, eye, 0.12, -0.9, UP + 0.1); // laser
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  if (level >= 1) spectreDrone(h, key, level, eye);
  h.tracer = level >= 5 ? 0xff5252 : 0xffe066;
  return own(h);
}

// ------------------------------------------------------------------ Planeswalker

/**
 * Planeswalker (cliff sniper): a hooded wanderer in a long cloak with a very long scoped rifle and
 * mystic purple light. Lv 1 Farsight: a face scarf and a rune scope; Lv 2 Planar Rounds: glowing
 * rune bands round the barrel; Lv 3 Rift Walker: shoulder plates and rune shards circling overhead;
 * Lv 4 Walker of Planes: glowing eyes in the dark hood, a glowing hem and a rune circle underfoot.
 */
export function makePlaneswalker(level) {
  level = lv(level, 4);
  const seer = level >= 4;
  const h = makeHumanoid({ skin: 0xc8a27a, shirt: 0x2a1a40, pants: 0x1a1028, arms: 0x2a1a40, face: seer ? 'none' : 'soldier' });
  const key = `planeswalker${level}`;
  const cloak = seer ? 0x1a0033 : 0x3a2660;
  const mystic = glowMat(h, seer ? 0xe040fb : 0xb388ff);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hood(hd, cloak);
  if (seer) {
    // a black void where the face was, with two glowing eyes
    band(hd, 0.63, 0.04, 0.9, 1.9, 0x0b0014, 0.6);
    for (const s of [-1, 1]) hd.box(0.26, 0.12, 0.05, glowMat(h, 0xff80ff), s * 0.25, 0.74, 0.66, { r: 0.03 });
  }
  if (level >= 1) {
    // Farsight: a face scarf up to the nose
    band(hd, 0.66, 0.06, 0.4, 2.2, 0x4a148c, 0.32);
    hd.box(0.4, 0.32, 0.06, 0x4a148c, 0.15, 0.06, 0.62, { rz: 0.3 });
  }
  // the long cloak down the back with a ragged hem, a clasp with a gem, a belt and satchel
  const lenC = 3.3 + level * 0.15;
  t.slab(2.3, lenC, 0.12, cloak, 0, 0.9 - lenC / 2, -0.62, { bw: 1.25 });
  for (let i = 0; i < 6; i++) t.cyl(0.2, 0.42, cloak, -1.2 + i * 0.48, 0.9 - lenC - 0.12, -0.64, { seg: 5, r2: 0.0001, rx: PI });
  if (seer) t.box(2.9, 0.07, 0.05, mystic, 0, 0.9 - lenC + 0.1, -0.69); // glowing hem
  for (const s of [-1, 1]) t.box(0.3, 0.3, 1.1, cloak, s * 0.95, 0.85, -0.05, { r: 0.08 }); // where it wraps the shoulders
  t.cyl(0.16, 0.08, 0xc9a227, 0, 0.8, 0.54, { axis: 'z', seg: 12 });
  t.ball(0.09, mystic, 0, 0.8, 0.6, { seg: 8, rows: 6 });
  for (const s of [-1, 1]) t.tube([[s * 0.14, 0.82, 0.55], [s * 0.6, 0.95, 0.4], [s * 0.85, 1.0, 0.0]], 0.04, 0xc9a227, { seg: 8, sides: 4 });
  t.box(2.1, 0.3, 1.1, 0x4e342e, 0, -0.85, 0, { r: 0.04 });
  t.box(0.36, 0.36, 0.08, 0xc9a227, 0, -0.85, 0.57, { r: 0.04 });
  t.ball(0.1, mystic, 0, -0.85, 0.62, { seg: 8, rows: 6 });
  t.box(0.6, 0.55, 0.3, 0x5d4037, 0.9, -1.2, 0.2, { r: 0.08 }); // satchel
  t.box(0.62, 0.22, 0.32, 0x4e342e, 0.9, -1.0, 0.2, { r: 0.04 });
  t.box(0.14, 2.4, 1.12, 0x4e342e, 0, 0.05, 0, { rz: 0.6 });
  if (level >= 3) {
    // Rift Walker: shoulder plates edged with light
    shoulderPads(t, 0x37474f, 0.58);
    for (const s of [-1, 1]) t.torus(0.5, 0.04, mystic, s * 1.45, 0.86, 0, { rx: PI / 2, seg: 18 });
  }
  hd.done();
  t.done();
  hands(h, key, 0x2a1a40, 0x4a148c, (a) => {
    a.box(1.1, 0.55, 1.1, 0x4e342e, 0, -1.25, 0, { r: 0.06 }); // wrapped bracers
    for (const y of [-1.1, -1.4]) a.box(1.12, 0.05, 1.12, 0x3e2723, 0, y, 0);
  });
  feet(h, key, 0x3e2723, (b) => {
    for (let i = 0; i < 3; i++) b.box(1.08, 0.06, 1.1, 0x5d4037, 0, -1.05 - i * 0.18, 0.02, { rz: (i - 1) * 0.1 }); // leg wraps
  });
  if (level >= 3) {
    // rune shards circling over the walker
    const sp = spinner(h, h.body, 0, 6.4, 0);
    const k = wear(h, sp, `${key}:shards`);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2;
      crystal(k, Math.cos(a) * 1.9, (i % 2) * 0.5, Math.sin(a) * 1.9, 0.18, 0.7, mystic, 0.3, a);
    }
    k.done();
    h.idleSpin = 0.7;
  }
  if (seer) {
    // a rune circle on the ground
    const r = wear(h, h.root, `${key}:circle`);
    r.cyl(2.2, 0.02, seeThrough(h, 0xe040fb, 0.22), 0, 0.03, 0, { seg: 32 });
    r.torus(2.2, 0.05, mystic, 0, 0.05, 0, { rx: PI / 2, seg: 36 });
    r.torus(1.6, 0.03, mystic, 0, 0.05, 0, { rx: PI / 2, seg: 30 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      r.box(0.28, 0.03, 0.12, mystic, Math.cos(a) * 1.9, 0.05, Math.sin(a) * 1.9, { ry: -a });
    }
    r.done();
  }
  // the very long rifle
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const len = 3.3 + level * 0.2;
  const [y, z] = boltRifle(gk, { len, wood: seer ? 0x1a1a1a : 0x3e2723, metal: seer ? 0x1a1a1a : GUNMETAL, scope: 1.2 + (level >= 1 ? 0.3 : 0), lens: level >= 1 ? mystic : 0x4fc3f7, bipod: true, brake: level >= 3 });
  if (level >= 2) for (let i = 0; i < 3; i++) gk.torus(0.12, 0.035, mystic, 0, -1.6 - i * (len - 2.2) / 3, UP + 0.08, { rx: PI / 2, seg: 14 }); // rune bands
  if (seer) crystal(gk, 0, -len - 0.05, UP + 0.08, 0.1, 0.4, mystic, PI, 0);
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y - (seer ? 0.35 : 0), z);
  aimLong(h);
  h.tracer = seer ? 0xe040fb : 0xce93d8;
  h.tracerWidth = level >= 3 ? 0.3 : undefined;
  return own(h);
}

// ------------------------------------------------------------------ Shock Commando

/** A shoulder missile pod (pod space: tubes point along +z): housing, tubes with missile tips, a mount arm. */
function shoulderPod(k, side, cols, rows, body, tip, o = {}) {
  const p = 0.4;
  const w = cols * p + 0.24;
  const hh = rows * p + 0.24;
  k.box(w, hh, 1.8, body, 0, 0, 0, { r: 0.08 });
  k.box(w + 0.06, hh + 0.06, 0.14, tone(body, 0.7), 0, 0, 0.84, { r: 0.04 }); // front frame
  k.box(w + 0.06, hh + 0.06, 0.14, tone(body, 0.7), 0, 0, -0.84, { r: 0.04 });
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = (i - (cols - 1) / 2) * p;
    const y = (j - (rows - 1) / 2) * p;
    k.cyl(0.15, 0.06, 0x111111, x, y, 0.92, { axis: 'z', seg: 12 });
    k.cyl(0.1, 0.2, tip, x, y, 0.92, { axis: 'z', seg: 10, r2: 0.02 });
  }
  for (const s of [-1, 1]) k.box(0.04, hh * 0.6, 1.3, tone(body, 0.6), s * (w / 2 + 0.02), 0, 0); // side ribs
  k.box(w * 0.7, 0.04, 1.2, tone(body, 0.6), 0, hh / 2 + 0.02, 0); // top rib
  k.box(0.35, 0.5, 0.4, INK, -side * 0.15, -hh / 2 - 0.2, -0.2, { r: 0.04 }); // mount
  k.cyl(0.12, 0.5, STEEL, -side * 0.15, -hh / 2 - 0.4, -0.2, { axis: 'x', seg: 10 }); // pivot
  for (let i = 0; i < 3; i++) k.box(w * 0.7, 0.04, 0.06, INK, 0, -hh / 2 + 0.15 + i * 0.12, -0.92); // exhaust grill
  if (o.sensor != null) {
    // Thermal Sights: a little sensor box on top with a lens
    k.box(0.3, 0.24, 0.4, INK, side * 0.1, hh / 2 + 0.14, 0.5, { r: 0.04 });
    k.cyl(0.08, 0.03, o.sensor, side * 0.1, hh / 2 + 0.14, 0.71, { axis: 'z', seg: 10 });
  }
  if (o.coil) for (const z of [-0.4, 0.2]) k.box(w + 0.08, hh + 0.08, 0.1, o.coil, 0, 0, z); // coil bands
}

/**
 * Shock Commando: a commando with a rifle and a missile pod on the shoulder. Lv 1 Bigger Warheads:
 * gloves and knee pads; Lv 2 Thermal Sights: a 2x2 pod with a sensor and a visor; Lv 3 Second Pod:
 * a pod on the other shoulder too; Lv 4 Shock Missile: blue tips, coil bands and a battery pack;
 * Lv 5 Storm Commando: heavy armour, pauldrons and blue arcs crackling round him.
 */
export function makeShockCommando(level) {
  level = lv(level);
  const shock = level >= 4;
  const heavy = level >= 5;
  const shirt = heavy ? 0x1c2833 : 0x4b5d3a;
  const h = makeHumanoid({ skin: 0xa0522d, shirt, pants: heavy ? 0x111827 : 0x3a3f2a, arms: shirt, face: 'soldier' });
  const key = `shockCommando${level}`;
  const zap = glowMat(h, 0x40c4ff);
  const podCol = heavy ? 0x263238 : 0x37474f;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  helmet(hd, heavy ? 0x263238 : 0x556b2f, { cover: heavy ? 0x1c2833 : 0x3e4a2a });
  if (level >= 2) visor(hd, shock ? zap : glowMat(h, 0xffab00, 0.6));
  else goggles(hd, 1.2, 0x80cbc4, { r: 0.77 });
  if (heavy) {
    // Storm armour: a jaw guard
    band(hd, 0.7, 0.08, 0.32, 2.0, 0x37474f, 0.22);
    for (const s of [-1, 1]) hd.box(0.05, 0.2, 0.04, zap, s * 0.25, 0.25, 0.72);
  }
  vest(t, heavy ? 0x37474f : 0x5d6b3a, { pouches: 3, patch: shock ? 0x0277bd : 0x3e4a2a });
  belt(t, INK, 0x9e9e9e);
  if (shock) {
    // a battery pack on the back with glowing cells and coils
    t.box(1.4, 1.6, 0.6, podCol, 0, -0.05, -0.85, { r: 0.08 });
    for (const x of [-0.38, 0, 0.38]) t.box(0.18, 1.2, 0.08, zap, x, -0.05, -1.17, { r: 0.03 });
    coil(t, -0.75, -0.2, -0.85, 0.25, 1.0, 4);
    coil(t, 0.75, -0.2, -0.85, 0.25, 1.0, 4);
    for (const s of [-1, 1]) t.tube([[s * 0.6, 0.55, -0.6], [s * 1.0, 1.25, -0.4], [s * 1.2, 1.35, -0.25]], 0.05, INK, { seg: 8, sides: 5 }); // cables to the pods
  }
  if (heavy) {
    shoulderPads(t, podCol, 0.62);
    t.cyl(0.25, 0.06, zap, 0, 0.35, 0.68, { axis: 'z', seg: 14 }); // chest core
    t.torus(0.27, 0.05, STEEL, 0, 0.35, 0.68, { seg: 14 });
  }
  hd.done();
  t.done();
  hands(h, key, level >= 1 ? 0x1f1f1f : null, tone(shirt, 0.8), heavy ? (a) => a.box(1.1, 0.6, 1.1, podCol, 0, -1.2, 0, { r: 0.08 }) : null);
  feet(h, key, 0x2b2b2b, (b) => {
    if (level >= 1) kneePad(b, 0x1f1f1f);
    if (heavy) b.box(1.1, 0.9, 0.3, podCol, 0, -1.3, 0.45, { r: 0.06 }); // shin guards
  });
  if (heavy) {
    // crackling arcs round the body
    const r = wear(h, h.root, `${key}:arcs`);
    sparks(r, 0, 2.6, 0, 1.9, 4, zap, 1);
    sparks(r, 0, 4.2, 0, 1.7, 3, zap, 2.5);
    r.done();
  }
  // the rifle for the pose (the shots come from the pods)
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  rifle(gk, { len: 2.0, body: 0x1f1f1f, mag: 'curved', optic: level >= 2 ? 'dot' : 'iron', lens: shock ? 0x40c4ff : 0xff5252 });
  gk.done();
  aimLong(h);
  h.muzzles = [];
  const cols = 2;
  const rows = level >= 2 ? 2 : 1;
  const sides = level >= 3 ? [-1, 1] : [-1];
  for (const side of sides) {
    const pod = new THREE.Group();
    pod.position.set(side * 1.25, 1.55, -0.1);
    pod.rotation.x = -0.15; // tilted slightly up
    h.torso.add(pod);
    const k = wear(h, pod, `${key}:pod${side}`);
    shoulderPod(k, side, cols, rows, podCol, shock ? zap : 0xe53935, { sensor: level >= 2 ? (shock ? zap : glowMat(h, 0xff3d00)) : null, coil: shock ? zap : null });
    k.done();
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const m = muzzle(h, pod, 0, 0, 0);
      m.position.set((i - (cols - 1) / 2) * 0.4, (j - (rows - 1) / 2) * 0.4, 1.05);
    }
  }
  h.recoilScale = 0.4;
  h.tracer = shock ? 0x40c4ff : 0xff7043;
  h.projectile = { color: shock ? 0x40c4ff : 0xeceff1, size: 0.45 };
  return own(h);
}

// ------------------------------------------------------------------ Void King

/** A great helm with a T-shaped glowing slit, breathing holes and a spiked crown (head space). */
function greatHelm(k, plate, edge, glowM, crownH) {
  k.cyl(0.8, 1.0, plate, 0, 0.5, 0, { seg: 20 });
  dome(k, 0.8, 0.5, plate, 0, 1.0, 0);
  k.box(0.14, 1.3, 0.14, tone(plate, 1.4), 0, 0.65, 0.78, { r: 0.04 }); // front ridge
  band(k, 0.81, 0.04, 0.12, 1.5, glowM, 0.72); // eye slit
  k.box(0.1, 0.42, 0.05, glowM, 0, 0.42, 0.81); // mouth slit
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) k.cyl(0.03, 0.04, INK, s * (0.3 + i * 0.1), 0.3, 0.76 - i * 0.05, { axis: 'z', seg: 6 }); // breathing holes
  k.cyl(0.85, 0.12, edge, 0, 0.02, 0, { seg: 20 }); // neck rim
  // the crown: a band and a ring of spikes, the front one tallest
  k.cyl(0.86, 0.28, edge, 0, 1.3, 0, { seg: 20 });
  k.torus(0.86, 0.04, tone(edge, 1.5), 0, 1.44, 0, { rx: PI / 2, seg: 22 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    const hgt = i === 0 ? crownH * 1.5 : crownH;
    k.cyl(0.14, hgt, plate, Math.sin(a) * 0.8, 1.44 + hgt / 2, Math.cos(a) * 0.8, { seg: 6, r2: 0.0001 });
  }
  k.ball(0.14, glowM, 0, 1.3, 0.86, { seg: 10, rows: 7 }); // crown gem
}

/** A two-handed greatsword in the fist (gun space: the blade runs along -y). Returns the tip y. */
function greatsword(k, level, steel, glowM, edge) {
  const bl = [3.0, 3.4, 3.8, 4.2, 4.8][level];
  const bw = 0.5 + level * 0.06;
  k.cyl(0.13, 1.0, 0x0b0b0b, 0, 0.1, 0, { seg: 10 }); // long grip
  for (let i = 0; i < 4; i++) k.torus(0.13, 0.03, edge, 0, -0.25 + i * 0.22, 0, { rx: PI / 2, seg: 10 });
  k.ball(0.2, glowM, 0, 0.72, 0, { seg: 10, rows: 7 }); // pommel
  k.cyl(0.12, 0.12, edge, 0, 0.6, 0, { seg: 10 });
  const cg = 1.4 + level * 0.15;
  k.box(cg, 0.22, 0.32, edge, 0, -0.45, 0, { r: 0.06 }); // crossguard
  for (const s of [-1, 1]) k.cyl(0.13, 0.42, glowM, s * (cg / 2 + 0.1), -0.32, 0, { seg: 6, r2: 0.02, rz: -s * 0.4 });
  k.box(0.4, 0.3, 0.36, edge, 0, -0.6, 0, { r: 0.05 }); // ricasso block
  const by = -0.75 - bl / 2;
  k.box(bw, bl, 0.12, steel, 0, by, 0);
  k.box(bw + 0.12, bl, 0.05, tone(steel, 1.4), 0, by, 0); // bevelled edges
  k.box(0.12, bl * 0.9, 0.15, glowM, 0, by + 0.05 * bl, 0); // glowing fuller
  k.cyl(0.0001, 0.7, steel, 0, -0.75 - bl - 0.35, 0, { seg: 4, r2: bw / 2 + 0.06, sz: 0.2 }); // tip
  return -0.75 - bl - 0.6;
}

/** Rotation { rz, rx } that turns a piece's +y toward the direction u (unit length). */
function towards(u) {
  const rz = Math.asin(Math.max(-1, Math.min(1, -u[0])));
  return { rz, rx: Math.atan2(u[2], u[1]) };
}

/** Wings of light: a bone arcing up and out from each shoulder blade, feathers hanging from it (torso space). */
function voidWings(k, mat, edgeMat) {
  for (const s of [-1, 1]) {
    const bone = [[s * 0.45, 0.6, -0.72], [s * 1.5, 2.1, -1.2], [s * 2.9, 2.8, -1.55], [s * 3.6, 2.6, -1.7]];
    k.tube(bone, 0.1, 0x1c1c1c, { seg: 16, sides: 6 });
    k.ball(0.16, edgeMat, ...bone[3], { seg: 8, rows: 6 }); // wing tip claw light
    for (let i = 0; i < 7; i++) {
      const t = 0.12 + (i / 6) * 0.85;
      const seg = Math.min(2, Math.floor(t * 3));
      const f = t * 3 - seg;
      const a = bone[seg];
      const b = bone[seg + 1];
      const P = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
      const d = [s * (0.15 + t * 0.35), -1, -0.12];
      const n = Math.hypot(...d);
      const len = 1.3 + t * 1.7;
      const dir = d.map((v) => v / n);
      k.cyl(0.02, len, i % 2 ? edgeMat : mat, P[0] + dir[0] * len / 2, P[1] + dir[1] * len / 2, P[2] + dir[2] * len / 2, { seg: 4, r2: 0.24, sz: 0.3, ...towards(dir.map((v) => -v)) });
    }
  }
}

/**
 * Void King: a huge dark armoured king with a two-handed void greatsword. Lv 1 Void Lasers: a
 * crimson cape; Lv 2 Crimson Edge: spiked pauldrons and a glowing blade; Lv 3 Unshakable: a taller
 * crown and a void core in the chest; Lv 4 King of the Void: wings of void light, an aura on the
 * ground and void cubes circling him.
 */
export function makeVoidKing(level) {
  level = lv(level, 4);
  const ascended = level >= 4;
  const h = makeHumanoid({ skin: 0x212121, shirt: 0x111111, pants: 0x0b0b0b, arms: 0x1a1a1a, face: 'none' });
  const key = `voidKing${level}`;
  const crimson = glowMat(h, 0xff1744);
  const voidM = glowMat(h, 0xd500f9);
  const plate = 0x1c1c1c;
  const edge = 0x3a0a12;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  greatHelm(hd, plate, edge, crimson, level >= 3 ? 0.6 : 0.4);
  // breastplate, ab plates, gorget, tassets
  t.box(2.24, 1.5, 1.2, plate, 0, 0.3, 0, { r: 0.18 });
  t.slab(1.6, 0.5, 0.12, tone(plate, 1.3), 0, 0.7, 0.6, { bw: 0.6 }); // chest ridge
  for (let i = 0; i < 3; i++) t.box(1.9 - i * 0.12, 0.22, 1.14, i % 2 ? plate : tone(plate, 1.2), 0, -0.55 - i * 0.2, 0, { r: 0.06 });
  t.cyl(0.62, 0.3, edge, 0, 1.05, 0, { seg: 18 }); // gorget
  t.box(2.26, 0.3, 1.24, edge, 0, -1.05, 0, { r: 0.05 });
  t.box(0.5, 0.36, 0.08, crimson, 0, -1.05, 0.62, { r: 0.04 }); // belt jewel
  for (const s of [-1, 0, 1]) t.slab(0.62, 0.7, 0.12, plate, s * 0.66, -1.5, 0.56, { bw: 1.15, rx: -0.12 }); // tassets
  if (level >= 1) {
    // Void Lasers: a crimson cape with a ragged hem
    const lenC = 3.6 + level * 0.2;
    t.slab(2.3, lenC, 0.12, 0x7f0000, 0, 1.0 - lenC / 2, -0.66, { bw: 1.3 });
    for (let i = 0; i < 6; i++) t.cyl(0.2, 0.45, 0x7f0000, -1.25 + i * 0.5, 1.0 - lenC - 0.12, -0.68, { seg: 5, r2: 0.0001, rx: PI });
    for (const s of [-1, 1]) t.ball(0.16, crimson, s * 0.75, 0.95, 0.5, { seg: 8, rows: 6 }); // cape clasps
  }
  if (level >= 2) {
    // Crimson Edge: layered pauldrons with spikes
    for (const s of [-1, 1]) {
      t.ball(0.7, plate, s * 1.45, 1.0, 0, { sy: 0.55, seg: 16, rows: 8 });
      t.ball(0.6, tone(plate, 1.3), s * 1.55, 0.78, 0, { sy: 0.45, seg: 16, rows: 8 });
      t.torus(0.64, 0.04, edge, s * 1.45, 0.78, 0, { rx: PI / 2, seg: 18 });
      t.cyl(0.13, 0.75, crimson, s * 1.75, 1.55, 0, { seg: 6, r2: 0.0001, rz: -s * 0.5 });
      t.cyl(0.1, 0.55, plate, s * 1.45, 1.5, -0.35, { seg: 6, r2: 0.0001, rz: -s * 0.3 });
    }
  }
  if (level >= 3) {
    // Unshakable: a void core in the chest with crimson veins
    t.torus(0.3, 0.07, edge, 0, 0.35, 0.62, { seg: 16 });
    t.ball(0.26, voidM, 0, 0.35, 0.6, { seg: 12, rows: 8 });
    for (const s of [-1, 1]) arc(t, [s * 0.3, 0.4, 0.62], [s * 0.85, 0.85, 0.6], crimson, 0.08, s + 2);
    for (const s of [-1, 1]) arc(t, [s * 0.25, 0.15, 0.62], [s * 0.7, -0.4, 0.6], crimson, 0.08, s + 5);
  }
  if (ascended) voidWings(t, voidM, crimson);
  hd.done();
  t.done();
  hands(h, key, plate, edge, (a) => {
    a.box(1.12, 0.65, 1.12, plate, 0, -1.25, 0, { r: 0.08 }); // gauntlet cuffs
    a.box(1.14, 0.08, 1.14, edge, 0, -1.0, 0);
    a.box(1.1, 0.12, 1.1, edge, 0, -0.35, 0, { r: 0.03 }); // arm band
  });
  feet(h, key, plate, (b) => {
    b.box(1.12, 1.0, 1.12, plate, 0, -1.25, 0.04, { r: 0.08 }); // greaves
    b.ball(0.3, edge, 0, -0.65, 0.5, { seg: 10, rows: 7 }); // knee cop
  });
  if (ascended) {
    // King of the Void: an aura on the ground and void cubes circling him
    const r = wear(h, h.root, `${key}:aura`);
    r.cyl(3.0, 0.02, seeThrough(h, 0xff1744, 0.25), 0, 0.03, 0, { seg: 36 });
    r.torus(3.0, 0.06, crimson, 0, 0.05, 0, { rx: PI / 2, seg: 40 });
    r.torus(2.4, 0.04, voidM, 0, 0.05, 0, { rx: PI / 2, seg: 36 });
    r.done();
    const sp = spinner(h, h.body, 0, 4.2, 0);
    const k = wear(h, sp, `${key}:cubes`);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2 + 0.4;
      k.box(0.36, 0.36, 0.36, voidM, Math.cos(a) * 2.4, (i % 2) * 1.4, Math.sin(a) * 2.4, { rx: a, ry: a });
    }
    k.done();
    h.idleSpin = 0.6;
  }
  const g = fist(h.rightArm, -1.9, 1);
  const gk = wear(h, g, `${key}:sword`);
  const tip = greatsword(gk, level, level >= 2 ? 0x1a1a1a : 0x424242, level >= 2 ? voidM : crimson, edge);
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tip + 0.6, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.35);
  h.leftArm.rotation.set(-2.3, 0, -0.55); // both hands on the hilt
  h.pose = { right: -2.4, left: -2.3, leftRecoil: 0 };
  h.swing = 2;
  h.melee = true;
  h.tracer = ascended ? 0xd500f9 : 0xff1744;
  h.body.scale.setScalar(1.25 + level * 0.06);
  return own(h, 0);
}

// ------------------------------------------------------------------ Ghostbuster

/** The proton pack on a back frame: box, cyclotron with lights, power cells, bumper and the hose (torso space). */
function protonPack(k, col, plasma, o = {}) {
  const w = o.w ?? 1.7;
  const hh = o.h ?? 2.0;
  const z = -1.0;
  for (const s of [-1, 1]) k.box(0.12, hh + 0.5, 0.12, INK, s * 0.62, -0.05, -0.6); // frame rails
  k.box(1.4, 0.12, 0.12, INK, 0, hh / 2, -0.6);
  k.box(w, hh, 0.8, col, 0, 0.1, z, { r: 0.1 });
  k.box(w * 0.9, 0.24, 0.85, 0x546e7a, 0, -0.55, z, { r: 0.04 });
  // the cyclotron: a round drum at the bottom with four lights
  k.cyl(0.62, 0.3, 0x37474f, 0, -0.75, z - 0.38, { axis: 'z', seg: 22 });
  k.torus(0.62, 0.05, 0x9e9e9e, 0, -0.75, z - 0.53, { seg: 22 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4;
    k.cyl(0.13, 0.06, plasma, Math.cos(a) * 0.4, -0.75 + Math.sin(a) * 0.4, z - 0.55, { axis: 'z', seg: 10 });
  }
  // power cell column and a row of glowing bars
  k.box(0.3, hh * 0.55, 0.12, INK, 0.45, 0.4, z - 0.42, { r: 0.03 });
  const n = o.cells ?? 3;
  for (let i = 0; i < n; i++) k.box(0.2, 0.12, 0.05, plasma, 0.45, 0.1 + i * 0.18, z - 0.5);
  k.cyl(0.12, 0.8, 0x9e9e9e, -0.5, 0.45, z - 0.44, { seg: 10 }); // ion arm
  k.box(w + 0.1, 0.18, 0.4, 0x37474f, 0, -hh / 2 + 0.05, z - 0.3, { r: 0.04 }); // bumper
  for (const x of [-0.3, 0.1]) k.cyl(0.04, 0.6, 0xc62828, x, 0.6, z - 0.42, { seg: 6, rz: PI / 2 }); // wires
  // the ribbed hose from the pack down to the wand
  k.tube([[-0.7, -0.6, -0.6], [-1.15, -1.0, -0.1], [-1.15, -1.2, 0.5]], 0.11, 0x212121, { seg: 16, sides: 8 });
  for (let i = 0; i < 5; i++) k.torus(0.12, 0.025, 0x424242, -0.9 - i * 0.06, -0.75 - i * 0.1, -0.45 + i * 0.2, { seg: 10, rx: 0.9 });
}

/**
 * Ghostbuster: a ghost hunter in an orange jumpsuit with a proton pack and a beam wand. Lv 1 Ghost
 * Trap: a trap on the ground with its pedal; Lv 2 Proton Boost: a bigger pack with an aerial and
 * goggles; Lv 3 Long Stream: a longer wand; Lv 4 Overload Pack: shoulder emitters and a yellow-hot
 * beam; Lv 5 Total Protonic Reversal: a gold pack with two big glowing tanks.
 */
export function makeGhostbuster(level) {
  level = lv(level);
  const beam = [0x76ff03, 0x76ff03, 0x9cff57, 0xc6ff00, 0xeeff41, 0xffea00][level];
  const suit = 0xef6c00;
  const h = makeHumanoid({ skin: 0xd7a17b, shirt: suit, pants: 0xe65100, arms: suit, face: 'soldier' });
  const key = `ghostbuster${level}`;
  const plasma = glowMat(h, beam);
  const red = glowMat(h, 0xff1744);
  const packCol = level >= 5 ? 0xffc107 : 0x2e7d32;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hair(hd, 0x4e342e, { h: 0.5 });
  for (let i = 0; i < 4; i++) hd.cyl(0.12, 0.3, 0x4e342e, -0.3 + i * 0.2, 1.3, 0.35 - (i % 2) * 0.2, { seg: 5, r2: 0.01, rx: 0.5, rz: (i - 1.5) * 0.3 }); // messy tufts
  if (level >= 2) goggles(hd, level >= 4 ? 0.74 : 1.12, glowMat(h, 0xffd740, 0.6), { r: 0.7, frame: 0x37474f });
  // jumpsuit: collar, zip, name tag, the no-ghost badge, elbow pads, utility belt
  collar(t, tone(suit, 0.85), { buttons: false });
  t.box(0.06, 1.6, 0.05, 0xbdbdbd, 0, -0.05, 0.53);
  t.box(0.5, 0.18, 0.04, 0xfafafa, -0.5, 0.6, 0.53); // name tag
  t.cyl(0.24, 0.04, 0xfafafa, 0.55, 0.45, 0.53, { axis: 'z', seg: 18 }); // badge
  t.torus(0.2, 0.035, 0xd32f2f, 0.55, 0.45, 0.56, { seg: 18 });
  t.box(0.36, 0.05, 0.03, 0xd32f2f, 0.55, 0.45, 0.57, { rz: -0.7 });
  t.ball(0.09, 0xeceff1, 0.55, 0.47, 0.55, { sy: 1.3, seg: 8, rows: 6 }); // the little ghost
  for (const s of [-1, 1]) t.box(0.26, 2.0, 1.14, INK, s * 0.55, 0.05, 0, { r: 0.03 }); // pack straps
  belt(t, 0x3e2723, 0x9e9e9e);
  for (const x of [-0.7, 0.7]) pouch(t, x, -1.05, 0.52, 0.32, 0.3, 0x5d4037, 0.16);
  protonPack(t, packCol, plasma, { w: level >= 2 ? 1.95 : 1.7, h: level >= 2 ? 2.3 : 2.0, cells: 2 + Math.min(level, 3) });
  if (level >= 2) {
    // Proton Boost: an aerial with a blinking tip
    antenna(t, 0.7, 1.2, -1.05, 1.6);
    t.ball(0.13, red, 0.7, 2.85, -1.05, { seg: 8, rows: 6 });
  }
  if (level >= 4) {
    // Overload Pack: shoulder emitters
    for (const s of [-1, 1]) {
      t.box(0.7, 0.4, 1.2, 0x546e7a, s * 1.3, 1.05, 0, { r: 0.08 });
      t.cyl(0.16, 0.08, plasma, s * 1.3, 1.05, 0.62, { axis: 'z', seg: 12 });
      t.torus(0.18, 0.03, INK, s * 1.3, 1.05, 0.64, { seg: 12 });
    }
  }
  if (level >= 5) {
    // Total Protonic Reversal: two big glowing tanks on top of the pack
    const top = 1.15 + 0.15;
    for (const x of [-0.5, 0.5]) {
      t.cyl(0.3, 1.1, glassMat(h, beam, 0.5), x, top + 0.55, -1.0, { seg: 14 });
      t.cyl(0.16, 0.95, plasma, x, top + 0.55, -1.0, { seg: 10 });
      for (const y of [top, top + 1.1]) t.cyl(0.33, 0.1, 0xffc107, x, y, -1.0, { seg: 14 });
    }
    t.box(1.7, 0.14, 0.7, 0xffc107, 0, top + 1.18, -1.0, { r: 0.04 });
  }
  hd.done();
  t.done();
  hands(h, key, 0x212121, tone(suit, 0.85), (a, s) => {
    a.box(1.08, 0.38, 1.08, 0x5d4037, 0, -0.95, 0.05, { r: 0.08 }); // elbow pads
    if (s > 0) armPatch(a, 1, 0xfafafa, 0xd32f2f);
  });
  feet(h, key, 0x212121, (b) => b.box(0.22, 0.5, 0.5, tone(suit, 0.85), 0.55, -0.6, 0.05, { r: 0.04 })); // leg pockets
  if (level >= 1) {
    // Ghost Trap: on the ground, wired to a foot pedal
    const r = wear(h, h.root, `${key}:trap`);
    r.box(0.9, 0.36, 0.7, 0x37474f, 1.8, 0.2, 1.3, { r: 0.05 });
    for (const s of [-1, 1]) r.box(0.42, 0.12, 0.66, 0x546e7a, 1.8 + s * 0.22, 0.43, 1.3, { rz: s * 0.15 }); // doors
    r.box(0.86, 0.06, 0.1, glowMat(h, 0xffd740), 1.8, 0.24, 1.66);
    for (const s of [-1, 1]) r.box(0.08, 0.1, 0.5, 0x212121, 1.8 + s * 0.5, 0.12, 1.3); // wheels
    r.tube([[1.4, 0.06, 1.3], [1.0, 0.04, 1.1], [0.9, 0.04, 0.6]], 0.03, INK, { seg: 10, sides: 4 });
    r.box(0.3, 0.1, 0.4, 0xfdd835, 0.9, 0.06, 0.45, { r: 0.03 }); // pedal
    r.done();
  }
  // the beam wand
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, `${key}:gun`);
  const len = 1.5 + level * 0.12 + (level >= 3 ? 0.3 : 0);
  const U = UP;
  gk.box(0.42, 0.9, 0.5, 0x37474f, 0, -0.2, U, { r: 0.08 }); // body
  gk.box(0.44, 0.3, 0.52, packCol, 0, 0.1, U, { r: 0.05 });
  gk.box(0.06, 0.3, 0.12, red, 0.23, -0.2, U + 0.1); // status light
  gk.box(0.2, 0.26, 0.5, INK, 0, 0.1, U - 0.36, { rx: -0.3, r: 0.04 }); // grip
  gk.cyl(0.05, 0.45, 0xfdd835, 0, -0.6, U - 0.35, { axis: 'z', seg: 8 }); // yellow front handle
  gk.box(0.08, 0.3, 0.08, INK, 0, -0.6, U - 0.15);
  gk.cyl(0.13, len - 0.65, 0x546e7a, 0, -0.65 - (len - 0.65) / 2, U, { seg: 12 }); // barrel
  const rings = 1 + Math.ceil(level / 2);
  for (let i = 0; i < rings; i++) gk.torus(0.15, 0.04, plasma, 0, -0.8 - i * 0.28, U, { rx: PI / 2, seg: 14 });
  gk.cyl(0.18, 0.25, 0x37474f, 0, -len + 0.1, U, { seg: 14, r2: 0.14 }); // tip housing
  gk.cyl(0.11, 0.06, plasma, 0, -len - 0.04, U, { seg: 12 });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, -len - 0.1, U);
  aimLong(h);
  h.beam = beam;
  h.tracer = beam;
  return own(h);
}

export const MODELS = {
  raider: makeRaider,
  plunder: makePlunder,
  spectre: makeSpectre,
  planeswalker: makePlaneswalker,
  shockCommando: makeShockCommando,
  voidKing: makeVoidKing,
  ghostbuster: makeGhostbuster,
};
