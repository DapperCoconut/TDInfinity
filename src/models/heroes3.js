// Tower models: Tower Blitz heroes, batch 3 (rebuilt with the vehicle kit in ../vehicles.js).
// In here: Beebo (robot kid in a kart that drives round in a circle), Fracture (a living rock that
// throws crystal shards), Slime King (a crowned slime in a slime pool), El Goblino (a goblin who
// throws bear traps), Hayes (a scarecrow who calls crows).
// Each level's whole look is built here (outfit colours, signature pieces, the max-level effect
// and growth), so blitzup.js has no entry for these towers.
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.

import * as THREE from 'three';
import { glowMat, kit, lamp, tone, wheelGeo } from '../vehicles.js';
import { gunMuzzle, makeThing } from './bits.js';
import { crystal, lv, seeThrough, spinner } from './machines5.js';
import { crow, jack, strawTuft } from './machines8.js';

const PI = Math.PI;
const INK = 0x1a1a1a;

// ------------------------------------------------------------------ small shared pieces

/** A group on `parent` at (x, y, z), scaled by s and turned by ry. */
function grp(parent, x = 0, y = 0, z = 0, s = 1, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  g.rotation.y = ry;
  parent.add(g);
  return g;
}

/**
 * A group that keeps turning round y (speed) and bobbing (bob): animated by the views through
 * `u.drift` (driftFx in views.js), like the hero effects in blitzup.js.
 */
function drifter(u, parent, x, y, z, speed, bob = 0) {
  const g = grp(parent, x, y, z);
  g.userData.speed = speed;
  g.userData.bob = bob;
  g.userData.y = y;
  (u.drift ??= []).push(g);
  return g;
}

/** A small ice-cream cone standing on (x, y, z): waffle cone, `scoops` scoops, a cherry. Returns the top. */
function cone(k, x, y, z, s = 1, scoops = 1, cherry = true) {
  const WAFFLE = 0xd7a86e;
  k.cyl(0.05 * s, 0.7 * s, WAFFLE, x, y + 0.35 * s, z, { r2: 0.27 * s, seg: 10 });
  for (const f of [0.3, 0.55]) k.torus((0.055 + (0.22 * f) / 0.7) * s, 0.025 * s, tone(WAFFLE, 0.75), x, y + f * s, z, { rx: PI / 2, seg: 10 });
  k.torus(0.27 * s, 0.05 * s, tone(WAFFLE, 0.85), x, y + 0.7 * s, z, { rx: PI / 2, seg: 12 });
  const cols = [0xf48fb1, 0xa5d6a7, 0xfff3b0];
  let top = y + 0.7 * s;
  for (let i = 0; i < scoops; i++) {
    const r = (0.32 - i * 0.03) * s;
    const cy = top + r * 0.7;
    k.ball(r, cols[i % 3], x, cy, z, { sy: 0.9, seg: 12, rows: 8 });
    k.torus(r * 0.92, r * 0.18, tone(cols[i % 3], 0.92), x, cy - r * 0.5, z, { rx: PI / 2, seg: 12 }); // the scoop's melty rim
    top = cy + r * 0.75;
  }
  if (cherry) {
    k.ball(0.09 * s, 0xe53935, x, top + 0.05 * s, z, { seg: 8, rows: 6 });
    k.cyl(0.012 * s, 0.18 * s, 0x33691e, x + 0.03 * s, top + 0.2 * s, z, { rz: -0.3, seg: 4 });
  }
  return top;
}

/** An open bear trap lying flat on (x, y, z), `s` = scale: base plate, two jaws with teeth, a spring and a chain. */
function bearTrap(k, x, y, z, s = 1, col = 0x9e9e9e, ry = 0) {
  const c = Math.cos(ry);
  const sn = Math.sin(ry);
  const at = (dx, dz) => [x + dx * c + dz * sn, z - dx * sn + dz * c];
  const dark = tone(col, 0.6);
  k.cyl(0.18 * s, 0.06 * s, dark, x, y + 0.03 * s, z, { seg: 10 });
  k.cyl(0.08 * s, 0.05 * s, 0xc9a227, x, y + 0.08 * s, z, { seg: 8 }); // pressure pan
  k.box(0.9 * s, 0.05 * s, 0.1 * s, dark, x, y + 0.03 * s, z, { ry });
  k.torus(0.42 * s, 0.04 * s, col, x, y + 0.05 * s, z, { rx: PI / 2, seg: 18 }); // the two jaws, laid open
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    k.cyl(0.035 * s, 0.14 * s, 0xe0e0e0, x + Math.cos(a) * 0.42 * s, y + 0.12 * s, z + Math.sin(a) * 0.42 * s, { r2: 0, seg: 4 });
  }
  for (const sd of [-1, 1]) {
    const [px, pz] = at(sd * 0.58 * s, 0);
    k.torus(0.1 * s, 0.03 * s, dark, px, y + 0.06 * s, pz, { ry: ry + PI / 2, seg: 8 }); // springs
  }
  const [cx, cz] = at(0, -0.55 * s);
  const [ex, ez] = at(0.15 * s, -0.95 * s);
  for (let i = 0; i < 3; i++) k.torus(0.06 * s, 0.018 * s, dark, cx + (ex - cx) * (i / 2), y + 0.03 * s, cz + (ez - cz) * (i / 2), { ry: ry + (i % 2) * PI / 2, seg: 6 });
}

// ------------------------------------------------------------------ Beebo

const SUIT = 0x1a237e;
const SHOE = 0x66bb6a;
const HEAD = 0x42a5f5;

/** One wheel pair on a spinning axle (spins with u.spin), the axle along x at (0, r, z). */
function wheelPair(u, parent, key, z, r, w, half, rim) {
  const g = spinner(u, parent, 0, r, z, 'x');
  const k = kit(u, g, key);
  // In the spinner the axle is the group's own y: turn each wheel (axle along x) onto it.
  for (const s of [-1, 1]) k.geo(wheelGeo(r, w, s, { rim }), 0, s * half, 0, { rz: PI / 2 });
  k.cyl(r * 0.12, half * 2, 0x2a2d31, 0, 0, 0, { seg: 8 });
  k.done();
}

/**
 * The robot kid, seated (`seated`) or standing, built into group `c` (scale ~0.72). Returns the
 * group his raised right hand holds the ice cream in (the muzzle goes on its top).
 */
function beeboRider(u, c, level, seated) {
  const k = kit(u, c, `beeboRider${level}`);
  const eye = level >= 4 ? glowMat(u, 0x18ffff) : INK;
  const gem = glowMat(u, 0x00e676);
  const hip = seated ? 0 : 1.2;
  // Legs and big green shoes
  for (const s of [-1, 1]) {
    if (seated) {
      k.box(0.5, 0.45, 1.1, SUIT, s * 0.38, hip + 0.22, 0.45, { r: 0.15 });
      k.ball(0.32, SHOE, s * 0.38, hip + 0.12, 1.15, { sy: 0.7, sz: 1.3, seg: 10, rows: 7 });
    } else {
      k.cyl(0.26, 1.05, SUIT, s * 0.38, 0.72, 0, { r2: 0.28, seg: 10 });
      k.torus(0.26, 0.05, 0x283593, s * 0.38, 0.32, 0, { rx: PI / 2, seg: 12 });
      k.ball(0.32, SHOE, s * 0.38, 0.2, 0.12, { sy: 0.6, sz: 1.35, seg: 10, rows: 7 });
      k.box(0.6, 0.06, 0.95, 0xfafafa, s * 0.38, 0.04, 0.12, { r: 0.03 });
    }
  }
  // Jumpsuit: belt, zip, collar, a glowing badge and a pocket
  k.box(1.5, 1.6, 1.0, SUIT, 0, hip + 0.8, 0, { r: 0.3 });
  k.box(1.55, 0.2, 1.05, 0x283593, 0, hip + 0.22, 0, { r: 0.08 });
  k.box(0.3, 0.22, 0.08, 0xcfd8dc, 0, hip + 0.22, 0.53, { r: 0.03 });
  k.box(0.05, 1.1, 0.04, 0x9fa8da, 0.1, hip + 0.95, 0.51);
  k.torus(0.42, 0.1, 0x283593, 0, hip + 1.6, 0, { rx: PI / 2, seg: 14 });
  k.cyl(0.16, 0.05, gem, 0.45, hip + 1.15, 0.5, { axis: 'z', seg: 10 });
  k.box(0.38, 0.32, 0.05, 0x283593, -0.4, hip + 1.05, 0.5, { r: 0.03 });
  if (level >= 3) for (const x of [-0.55, -0.3]) k.box(0.1, 1.5, 1.03, 0xfafafa, x, hip + 0.8, 0); // racing stripes
  if (level >= 4) for (const s of [-1, 1]) {
    k.ball(0.36, 0x5e35b1, s * 0.82, hip + 1.5, 0, { sy: 0.55, seg: 10, rows: 6 }); // shoulder pads
    k.torus(0.3, 0.04, glowMat(u, 0x18ffff), s * 0.82, hip + 1.52, 0, { rx: PI / 2, seg: 12 });
  }
  // Round blue robot head with a screen face
  const hy = hip + 2.5;
  k.cyl(0.22, 0.4, 0x90a4ae, 0, hip + 1.8, 0, { seg: 8 });
  k.ball(0.9, HEAD, 0, hy, 0, { sy: 0.85, sz: 0.88, seg: 16, rows: 12 });
  k.box(1.36, 1.0, 0.1, 0x1565c0, 0, hy - 0.05, 0.7, { r: 0.12 });
  k.box(1.22, 0.86, 0.1, 0xe3f2fd, 0, hy - 0.05, 0.74, { r: 0.1 });
  for (const s of [-1, 1]) {
    k.ball(0.1, eye, s * 0.3, hy + 0.08, 0.8, { sy: 1.5, sz: 0.4, seg: 8, rows: 6 });
    k.ball(0.09, 0xf8bbd0, s * 0.45, hy - 0.2, 0.79, { sy: 0.6, sz: 0.3, seg: 6, rows: 4 });
    k.cyl(0.24, 0.25, 0x1e88e5, s * 0.9, hy, 0, { axis: 'x', seg: 12 }); // ear bolts
    k.cyl(0.14, 0.12, 0xbbdefb, s * 1.05, hy, 0, { axis: 'x', seg: 10 });
  }
  k.torus(0.16, 0.035, INK, 0, hy - 0.16, 0.8, { arc: PI, rz: PI, seg: 10 }); // smile
  k.box(1.0, 0.05, 0.05, tone(HEAD, 0.8), 0, hy + 0.55, 0.45, { rx: -0.6 }); // panel line
  // Antenna with a green gem
  k.cyl(0.05, 0.7, 0x90a4ae, 0, hy + 1.05, 0, { seg: 6 });
  k.ball(0.1, 0x90a4ae, 0, hy + 0.72, 0, { seg: 6, rows: 4 });
  k.cyl(0, 0.2, gem, 0, hy + 1.5, 0, { r2: 0.22, seg: 4 });
  k.cyl(0.22, 0.3, gem, 0, hy + 1.75, 0, { r2: 0, seg: 4 });
  if (level >= 3) {
    // Racing goggles pushed up on the forehead
    k.torus(0.82, 0.05, INK, 0, hy + 0.35, 0, { rx: PI / 2 - 0.15, seg: 20 });
    const lens = level >= 4 ? glowMat(u, 0x18ffff) : 0x80deea;
    for (const s of [-1, 1]) {
      k.cyl(0.2, 0.14, 0x37474f, s * 0.24, hy + 0.48, 0.66, { axis: 'z', rx: -0.5, seg: 12 });
      k.cyl(0.15, 0.05, lens, s * 0.24, hy + 0.52, 0.73, { axis: 'z', rx: -0.5, seg: 12 });
    }
  }
  // Arms: the right (-x) holds up an ice cream, the left steers (or hangs at its side)
  const sh = hip + 1.45;
  const hand = [-1.15, sh + 1.15, 0.35];
  k.tube([[-0.92, sh, 0], [-1.08, sh + 0.6, 0.18], hand], 0.21, SUIT, { sides: 8 });
  k.ball(0.28, SHOE, hand[0], hand[1], hand[2], { seg: 10, rows: 7 });
  const left = seated ? [0.35, 1.1, 1.45] : [1.05, sh - 1.15, 0.12];
  k.tube([[0.92, sh, 0], [(0.92 + left[0]) / 2 + 0.15, (sh + left[1]) / 2, (left[2]) / 2], left], 0.21, SUIT, { sides: 8 });
  k.ball(0.28, SHOE, left[0], left[1], left[2], { seg: 10, rows: 7 });
  k.done();
  // The ice cream it throws (one scoop more at Lv 2 and Lv 4)
  const ic = grp(c, hand[0], hand[1] + 0.12, hand[2]);
  const ck = kit(u, ic, `beeboCone${level}`);
  const top = cone(ck, 0, 0, 0, 1.15, 1 + (level >= 2) + (level >= 4));
  ck.done();
  return { ic, top };
}

/**
 * Beebo (0-4): a robot kid with a blue round head and a screen face, throwing ice creams. Lv 0 on
 * foot; Lv 1 a yellow scooter-kart; Lv 2 an ice-cream cooler behind the seat; Lv 3 a pink racing
 * kart with a spoiler, racing stripes and goggles; Lv 4 a purple hover kart with glowing pads, a
 * thruster and glowing eyes. The kart rides on `u.plane` (it circles the tower like an Aviator's
 * plane); its wheels spin (u.spin + idleSpin).
 */
export function makeBeebo(level) {
  level = lv(level, 4);
  const u = makeThing();
  const plane = new THREE.Group();
  const bank = new THREE.Group();
  plane.add(bank);
  let seatY = -0.39; // on foot: down on the parking spot (the plane flies 0.45 up)
  let seatZ = 0;
  if (level >= 1) {
    const hover = level >= 4;
    const fast = level >= 3;
    const body = hover ? 0x5e35b1 : fast ? 0xec407a : 0xffca28;
    const trim = hover ? glowMat(u, 0x00e5ff) : fast ? 0xfafafa : 0x1e88e5;
    const L = fast ? 3.8 : 3.2;
    const y = hover ? 0.9 : 0.55;
    const k = kit(u, bank, `beeboKart${level}`);
    // Tub, side stripe, floor pan, nose and bumper
    k.box(1.9, 0.12, L * 0.9, 0x263238, 0, y - 0.24, 0, { r: 0.05 });
    k.box(2.0, 0.5, L * 0.92, body, 0, y, -0.05, { r: 0.18 });
    k.box(2.04, 0.1, L * 0.8, trim, 0, y + 0.12, -0.05);
    k.slab(1.6, 0.42, 0.9, body, 0, y + 0.02, L / 2 + 0.3, { tw: 0.75, td: 0.8, tz: -0.05 });
    k.box(1.0, 0.08, 0.6, tone(body, 0.8), 0, y + 0.24, L / 2 + 0.2, { rx: 0.15 }); // bonnet line
    k.cyl(0.32, 0.04, 0xfafafa, 0, y + 0.12, L / 2 + 0.68, { axis: 'z', seg: 14 }); // number disc
    k.box(0.06, 0.32, 0.03, INK, 0, y + 0.12, L / 2 + 0.71);
    lamp(k, -0.52, y + 0.06, L / 2 + 0.62, 0.11);
    lamp(k, 0.52, y + 0.06, L / 2 + 0.62, 0.11);
    if (!hover) k.cyl(0.1, 1.9, 0x212121, 0, y - 0.12, L / 2 + 0.78, { axis: 'x', seg: 8 });
    if (fast) {
      k.box(2.3, 0.07, 0.55, trim, 0, y - 0.18, L / 2 + 0.85, { r: 0.03 }); // front wing
      for (const s of [-1, 1]) k.box(0.06, 0.25, 0.6, body, s * 1.15, y - 0.08, L / 2 + 0.85);
    }
    // Side pods with air scoops
    for (const s of [-1, 1]) {
      k.box(0.3, 0.36, L * 0.45, tone(body, 0.85), s * 1.05, y - 0.02, -0.1, { r: 0.1 });
      k.box(0.06, 0.18, 0.4, INK, s * 1.21, y + 0.02, L * 0.12);
    }
    // Bucket seat, dashboard with a gauge, steering column and wheel
    k.box(1.1, 0.2, 0.9, 0x263238, 0, y + 0.3, -0.35, { r: 0.08 });
    k.box(1.2, 1.0, 0.22, 0x263238, 0, y + 0.75, -0.62, { r: 0.1, rx: -0.12 });
    k.box(0.6, 0.35, 0.2, 0x37474f, 0, y + 1.35, -0.68, { r: 0.08 });
    k.box(1.4, 0.3, 0.3, 0x37474f, 0, y + 0.4, 1.2, { r: 0.08 });
    k.cyl(0.1, 0.04, glowMat(u, 0x76ff03), 0.4, y + 0.5, 1.05, { axis: 'z', rx: -0.4, seg: 10 });
    k.cyl(0.06, 0.8, 0x424242, 0, y + 0.75, 1.0, { rx: -0.6, seg: 6 });
    k.torus(0.3, 0.05, 0x212121, 0, y + 1.12, 0.76, { rx: 0.97, seg: 16 });
    k.box(0.5, 0.06, 0.06, 0x424242, 0, y + 1.12, 0.76, { rx: 0.97 });
    if (hover) {
      // Hover pads with glowing undersides, side fins and a big thruster
      const pad = glowMat(u, 0x00e5ff);
      for (const x of [-0.85, 0.85]) for (const z of [-1.2, 1.2]) {
        k.cyl(0.36, 0.3, 0x311b92, x, y - 0.38, z, { r2: 0.3, seg: 14 });
        k.torus(0.33, 0.05, 0x7e57c2, x, y - 0.5, z, { rx: PI / 2, seg: 14 });
        k.cyl(0.26, 0.05, pad, x, y - 0.55, z, { seg: 14 });
      }
      for (const s of [-1, 1]) k.slab(0.08, 0.6, 0.9, body, s * 0.85, y + 0.5, -L / 2 + 0.5, { td: 0.5, tz: -0.2 });
      k.cyl(0.38, 0.5, 0x311b92, 0, y + 0.05, -L / 2 - 0.15, { axis: 'z', r2: 0.32, seg: 14 });
      k.cyl(0.28, 0.06, glowMat(u, 0xff4081), 0, y + 0.05, -L / 2 - 0.42, { axis: 'z', seg: 14 });
      k.torus(0.3, 0.05, trim, 0, y + 0.05, -L / 2 - 0.38, { seg: 14 });
    } else {
      // Wheels on two spinning axles, with fenders over the front ones
      const rf = 0.43;
      const rr = fast ? 0.5 : 0.43;
      const wz = L / 2 - 0.5;
      const rim = fast ? 0xeeeeee : 0x1e88e5;
      wheelPair(u, bank, `beeboWheelF${level}`, wz, rf, 0.38, 1.15, rim);
      wheelPair(u, bank, `beeboWheelR${level}`, -wz, rr, 0.46, 1.15, rim);
      for (const s of [-1, 1]) k.torus(rf + 0.08, 0.06, tone(body, 0.8), s * 1.15, rf, wz, { ry: PI / 2, arc: PI * 0.8, rz: PI * 0.1, seg: 12 });
      for (const s of [-1, 1]) k.box(0.3, 0.12, 0.12, 0x424242, s * 0.95, rf, wz); // stub axles into the tub
    }
    if (fast) {
      // Spoiler behind the tub, and (wheels only) twin exhausts with hot tips
      for (const x of [-0.7, 0.7]) k.box(0.1, 0.9, 0.14, 0x212121, x, y + 0.6, -L / 2 - 0.05, { rx: -0.2 });
      k.box(2.3, 0.1, 0.6, body, 0, y + 1.08, -L / 2 - 0.15, { r: 0.04, rx: 0.12 });
      for (const s of [-1, 1]) k.box(0.08, 0.42, 0.68, trim, s * 1.18, y + 1.05, -L / 2 - 0.15, { r: 0.03 });
      if (!hover) for (const s of [-1, 1]) {
        k.cyl(0.11, 0.6, 0x9e9e9e, s * 0.45, y - 0.05, -L / 2 - 0.05, { axis: 'z', seg: 10 });
        k.cyl(0.08, 0.05, glowMat(u, 0xff9100), s * 0.45, y - 0.05, -L / 2 - 0.36, { axis: 'z', seg: 10 });
      }
    }
    if (level >= 2) {
      // Ice-cream cooler behind the seat: lid, handle, pink cone badges (and a cone on top when racing)
      const cz = -L / 2 + (fast ? 0.6 : 0.45);
      k.box(1.2, 0.75, 0.72, 0xeceff1, 0, y + 0.6, cz, { r: 0.1 });
      k.box(1.26, 0.16, 0.78, 0x29b6f6, 0, y + 1.02, cz, { r: 0.06 });
      k.torus(0.2, 0.04, 0x0277bd, 0, y + 1.1, cz, { arc: PI, seg: 10 });
      const badge = glowMat(u, 0xf48fb1);
      for (const s of [-1, 1]) {
        k.cyl(0.2, 0.04, badge, s * 0.61, y + 0.6, cz, { axis: 'x', seg: 12 });
        k.cyl(0.03, 0.18, 0xd7a86e, s * 0.64, y + 0.52, cz, { r2: 0.08, axis: 'x', rz: s * PI / 2, seg: 6 });
      }
      if (fast) cone(k, 0, y + 1.1, cz, 0.7, 2);
    }
    k.done();
    seatY = y + 0.4;
    seatZ = -0.1;
    if (!hover) u.idleSpin = 8;
  }
  const seat = grp(bank, 0, seatY, seatZ, 0.72);
  const { ic, top } = beeboRider(u, seat, level, level >= 1);
  gunMuzzle(u, ic, 0, top + 0.1, 0);
  // A parking spot on the pad, with an ice-cream sign
  const pk = kit(u, u.root, 'beeboPad');
  pk.box(3.4, 0.06, 3.4, 0x37474f, 0, 0.03, 0, { r: 0.02 });
  for (const x of [-1.6, 1.6]) pk.box(0.15, 0.03, 3.0, 0xfafafa, x, 0.07, 0);
  pk.box(3.0, 0.03, 0.15, 0xfafafa, 0, 0.07, -1.55);
  for (const [x, z] of [[-1.45, 1.6], [1.45, 1.6]]) pk.box(0.5, 0.12, 0.2, 0xffca28, x, 0.1, z, { r: 0.04 });
  pk.cyl(0.07, 1.8, 0x90a4ae, 1.9, 0.9, -1.9, { seg: 8 });
  pk.cyl(0.18, 0.1, 0x607d8b, 1.9, 0.05, -1.9, { seg: 10 });
  pk.cyl(0.5, 0.08, 0xfafafa, 1.9, 2.1, -1.9, { axis: 'z', seg: 18 });
  pk.torus(0.5, 0.06, 0xf48fb1, 1.9, 2.1, -1.9, { seg: 18 });
  cone(pk, 1.9, 1.85, -1.82, 0.5, 1);
  pk.done();
  const bay = new THREE.Object3D();
  bay.position.set(0, 1.5, 0);
  bank.add(bay);
  plane.userData = { bank, prop: null, bay, missiles: [] };
  u.static = true;
  u.plane = plane;
  u.flyHeight = 0.45;
  u.tracer = 0xf48fb1;
  u.projectile = { color: 0xf48fb1, size: 0.9 + level * 0.08 };
  return u;
}

// ------------------------------------------------------------------ Fracture

const ROCK = 0xe8dcc0;
const ROCK_D = 0xcfc3a5;

/** A creature rig: empty groups where makeHumanoid has meshes, so the views can swing its arms. */
function rig() {
  const u = makeThing();
  u.static = false;
  u.torso = grp(u.body, 0, 3, 0);
  u.head = grp(u.body, 0, 4, 0);
  u.rightArm = grp(u.body, -1.5, 4, 0);
  u.leftArm = grp(u.body, 1.5, 4, 0);
  u.rightLeg = grp(u.body, -0.5, 2, 0);
  u.leftLeg = grp(u.body, 0.5, 2, 0);
  u.pose = { right: 0, left: 0, leftRecoil: 0 };
  return u;
}

/** A point on the front of the Fracture's rock body (an ellipsoid), for cracks that sit on it. */
function onRock(x, y, back = false) {
  const R = 1.25;
  const f = Math.max(0, 1 - (x / R) ** 2 - (y / (R * 0.95)) ** 2);
  return [x, y, (back ? -1 : 1) * R * 0.82 * Math.sqrt(f) * 1.02];
}

/**
 * Fracture (0-4): a living chunk of pale stone with dark slanted eye holes, floating stubby arms
 * and round feet. Lv 1 orange crystals on its back; Lv 2 glowing shards floating at both hands;
 * Lv 3 glowing magma cracks and the crystals light up; Lv 4 a crystal crown and a ring of shards
 * circling it (u.drift).
 */
export function makeFracture(level) {
  level = lv(level, 4);
  const h = rig();
  const crys = level >= 3 ? glowMat(h, 0xff9100) : 0xff9800;
  const shardM = glowMat(h, 0xffab40);
  const magma = glowMat(h, 0xff6d00);
  h.torso.position.y = 2.7;
  h.head = h.torso;
  // Rocky body: one big faceted boulder with smaller chunks stuck on
  const k = kit(h, h.torso, `fractureBody${level}`);
  k.ball(1.25, ROCK, 0, 0, 0, { sy: 0.95, sz: 0.82, seg: 9, rows: 7, flat: true });
  for (const [r, x, y, z, ry, c] of [
    [0.6, 0.8, 0.95, -0.25, 0.4, ROCK_D], [0.55, -0.95, 0.55, 0.05, 1.1, ROCK_D], [0.7, -0.1, 1.05, 0.0, 0.7, ROCK],
    [0.5, 0.6, -0.85, 0.5, 0.2, ROCK_D], [0.45, -0.7, -0.7, -0.5, 2.0, ROCK_D], [0.5, 1.0, -0.2, -0.3, 0.9, ROCK],
  ]) k.ball(r, c, x, y, z, { sy: 0.75, seg: 6, rows: 4, flat: true, ry, rx: 0.3 });
  // Brow ridge, slanted dark eye holes and a crack of a mouth
  k.ball(0.75, ROCK_D, 0, 0.62, 0.62, { sx: 1.4, sy: 0.35, sz: 0.6, seg: 6, rows: 4, flat: true });
  for (const s of [-1, 1]) {
    k.box(0.55, 0.3, 0.24, INK, s * 0.45, 0.32, 0.95, { rz: s * 0.35 });
    k.box(0.25, 0.2, 0.22, INK, s * 0.6, 0.18, 0.93, { rz: s * -0.3 });
  }
  k.tube([onRock(-0.3, -0.35), onRock(-0.1, -0.42), onRock(0.12, -0.36), onRock(0.3, -0.44)], 0.035, 0x6d6352, { sides: 4 });
  // Chips and scratches
  for (const [x, y] of [[-0.8, 0.1], [0.75, 0.25], [-0.5, -0.75], [0.85, -0.55]]) {
    const p = onRock(x, y);
    k.box(0.22, 0.05, 0.05, ROCK_D, p[0], p[1], p[2], { rz: x * 0.8 });
  }
  if (level >= 1) {
    // Orange crystals growing out of its back
    for (const [x, y, r, len, lean, dir] of [[-0.5, 0.6, 0.17, 1.0, 0.7, -1.9], [0.15, 0.85, 0.2, 1.2, 0.55, -1.5], [0.6, 0.3, 0.15, 0.85, 0.8, -1.1], [-0.15, 0.05, 0.14, 0.75, 0.9, -1.6]]) {
      const p = onRock(x, y, true);
      crystal(k, p[0], p[1], p[2] + 0.15, r, len, crys, lean, dir);
    }
  }
  if (level >= 3) {
    // Glowing magma cracks over the front and sides
    for (const pts of [[[-0.75, -0.05], [-0.55, -0.25], [-0.62, -0.5], [-0.4, -0.7]], [[0.45, 1.0], [0.6, 0.75], [0.8, 0.62], [0.95, 0.35]], [[0.25, -0.65], [0.38, -0.85], [0.3, -1.0]], [[-1.0, 0.3], [-1.1, 0.0], [-1.05, -0.3]]]) {
      k.tube(pts.map(([x, y]) => onRock(x, y)), 0.045, magma, { sides: 4 });
    }
    for (const s of [-1, 1]) k.tube([onRock(s * 1.15, 0.35, true), onRock(s * 1.2, -0.1, true), onRock(s * 1.1, -0.45, true)], 0.045, magma, { sides: 4 });
  }
  if (level >= 4) {
    // Crystal crown
    for (const [x, len, lean] of [[-0.75, 0.9, 0.4], [-0.38, 1.3, 0.2], [0, 1.7, 0], [0.4, 1.3, -0.2], [0.78, 0.9, -0.4]]) crystal(k, x, 1.05 - Math.abs(x) * 0.25, 0.1, 0.2, len, shardM, Math.abs(lean), lean > 0 ? PI : 0);
  }
  k.done();
  // Round feet (separate from the body) and a few pebbles round them
  const fk = kit(h, h.body, `fractureFeet${level >= 3 ? 1 : 0}`);
  for (const s of [-1, 1]) {
    fk.ball(0.5, ROCK_D, s * 0.65, 0.3, 0.15, { sy: 0.6, sz: 1.2, seg: 7, rows: 5, flat: true });
    fk.ball(0.18, ROCK, s * 0.62, 0.42, 0.65, { seg: 5, rows: 3, flat: true });
  }
  for (const [x, z, r] of [[1.5, 1.2, 0.2], [-1.4, 1.4, 0.15], [1.2, -1.3, 0.25], [-1.6, -0.8, 0.18], [0.3, 1.8, 0.12]]) fk.ball(r, ROCK_D, x, r * 0.5, z, { sy: 0.6, seg: 5, rows: 3, flat: true });
  if (level >= 3) for (const [x, z] of [[1.5, 1.2], [1.2, -1.3]]) crystal(fk, x + 0.1, 0.1, z, 0.08, 0.4, crys, 0.3, 0.5);
  fk.done();
  // Floating stubby arms (Lv 2+: a glowing shard hovers under each hand)
  h.rightArm.position.set(-1.75, 3.2, 0.2);
  h.leftArm.position.set(1.75, 3.2, 0.2);
  for (const arm of [h.rightArm, h.leftArm]) {
    const ak = kit(h, arm, `fractureArm${level >= 2 ? 1 : 0}`);
    ak.ball(0.38, ROCK, 0, -0.6, 0, { sy: 1.3, seg: 7, rows: 5, flat: true });
    ak.ball(0.3, ROCK_D, 0.05, -1.0, 0.08, { sy: 0.8, seg: 6, rows: 4, flat: true });
    ak.ball(0.18, ROCK_D, -0.1, -0.3, -0.2, { seg: 5, rows: 3, flat: true });
    if (level >= 2) crystal(ak, 0, -1.85, 0, 0.15, 0.7, shardM);
    ak.done();
  }
  if (level >= 4) {
    // A ring of shards circling it
    const ring = drifter(h, h.body, 0, 2.6, 0, 1.6, 0.2);
    const rk = kit(h, ring, 'fractureRing');
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2;
      crystal(rk, Math.cos(a) * 2.2, Math.sin(i * 2) * 0.4 - 0.4, Math.sin(a) * 2.2, 0.15, 0.8, shardM, 0.4, -a);
    }
    rk.done();
  }
  const th = grp(h.rightArm, 0, -0.65, 0);
  gunMuzzle(h, th, 0, level >= 2 ? -0.9 : -0.5, 0);
  h.rightArm.rotation.set(-2.6, 0, 0.2);
  h.leftArm.rotation.set(-0.6, 0, -0.3);
  h.pose = { right: -2.6, left: -0.6, leftRecoil: 0 };
  h.swing = 1.9;
  h.bob = 0.15;
  h.projectile = { color: 0xffab40, size: 0.9 + level * 0.1 };
  h.tracer = 0xffab40;
  return h;
}

// ------------------------------------------------------------------ Slime King

/** A glossy slime (about 1.3*s tall, facing +z) with a cute face. `shell`: a see-through jelly coat. */
function slime(k, col, s, shell, blush = true) {
  k.ball(0.8 * s, col, 0, 0.65 * s, 0, { sy: 0.82, sz: 0.94, seg: 18, rows: 12 });
  k.torus(0.74 * s, 0.13 * s, tone(col, 0.85), 0, 0.12 * s, 0, { rx: PI / 2, seg: 20 }); // melty foot
  k.cyl(0.2 * s, 0.3 * s, col, 0, 1.33 * s, -0.05 * s, { r2: 0, seg: 10, rx: -0.25 }); // the drip on top
  if (shell) k.ball(0.84 * s, shell, 0, 0.66 * s, 0, { sy: 0.82, sz: 0.94, seg: 18, rows: 12 });
  // Shine
  k.ball(0.13 * s, 0xffffff, 0.34 * s, 1.05 * s, 0.42 * s, { sx: 0.6, sy: 1.1, sz: 0.3, rz: -0.5, rx: -0.6, seg: 8, rows: 6 });
  k.ball(0.06 * s, 0xffffff, 0.48 * s, 0.86 * s, 0.56 * s, { sz: 0.4, seg: 6, rows: 4 });
  // Eyes with glints, a little smile, pink cheeks
  for (const sx of [-1, 1]) {
    k.ball(0.12 * s, 0x1a1a2e, sx * 0.26 * s, 0.82 * s, 0.68 * s, { sy: 1.4, sz: 0.4, seg: 10, rows: 8 });
    k.ball(0.04 * s, 0xffffff, sx * 0.26 * s + 0.04 * s, 0.9 * s, 0.73 * s, { seg: 6, rows: 4 });
    if (blush) k.ball(0.09 * s, 0xf48fb1, sx * 0.48 * s, 0.62 * s, 0.62 * s, { sy: 0.55, sz: 0.3, ry: sx * 0.6, seg: 8, rows: 5 });
  }
  k.torus(0.08 * s, 0.022 * s, 0x1a1a2e, 0, 0.66 * s, 0.75 * s, { arc: PI, rz: PI, seg: 10 });
}

/** A gold crown, band radius r, standing on (x, y, z): points with balls, gems, and flames (`flame` = size). */
function crown(k, r, x, y, z, gems, flame, fl) {
  const GOLD = 0xffc400;
  const h = r * 0.55;
  k.cyl(r, h, GOLD, x, y + h / 2, z, { r2: r * 1.08, seg: 16, open: true });
  k.cyl(r * 0.96, h * 0.95, tone(GOLD, 0.7), x, y + h / 2, z, { r2: r * 1.04, seg: 16, open: true });
  k.torus(r, r * 0.07, 0xffa000, x, y + 0.02, z, { rx: PI / 2, seg: 16 });
  k.torus(r * 1.08, r * 0.06, 0xffa000, x, y + h, z, { rx: PI / 2, seg: 16 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2 + PI / 2;
    const px = x + Math.cos(a) * r * 1.06;
    const pz = z + Math.sin(a) * r * 1.06;
    k.cyl(r * 0.16, r * 0.5, GOLD, px, y + h + r * 0.25, pz, { r2: 0.0, seg: 6 });
    k.ball(r * 0.09, gems && i % 2 ? 0xe53935 : GOLD, px, y + h + r * 0.52, pz, { seg: 6, rows: 4 });
    if (flame) {
      k.cyl(r * 0.12 * flame, r * 0.55 * flame, fl[0], px, y + h + r * (0.6 + 0.27 * flame), pz, { r2: 0, seg: 6 });
      k.cyl(r * 0.07 * flame, r * 0.35 * flame, fl[1], px, y + h + r * (0.6 + 0.2 * flame), pz, { r2: 0, seg: 5 });
    }
  }
  if (gems) for (const a of [PI / 2, PI / 2 + 0.9, PI / 2 - 0.9]) {
    k.ball(r * 0.13, a === PI / 2 ? 0x2979ff : 0x00c853, x + Math.cos(a) * r * 1.07, y + h / 2, z + Math.sin(a) * r * 1.07, { sz: 0.5, ry: -a + PI / 2, seg: 8, rows: 6 });
  }
}

/**
 * Slime King (0-4): a glossy blue slime with a gold crown, sitting in a pool of slime. Lv 1 a
 * bigger crown with jewels; Lv 2 a gem scepter beside him and flames on the crown points; Lv 3
 * bigger flames and little slimes bobbing in the pool (one on fire); Lv 4 a royal throne behind
 * him, a purple cape with ermine trim and a purple scepter gem. He grows a little every level.
 */
export function makeSlimeKing(level) {
  level = lv(level, 4);
  const u = makeThing();
  const pool = seeThrough(u, 0x4fc3f7, 0.75);
  const jelly = seeThrough(u, 0x90caf9, 0.28);
  const fl = [glowMat(u, 0xff6d00), glowMat(u, 0xffea00)];
  const k = kit(u, u.body, `slimeKingBase${level}`);
  // A round stone rim round the slime pool, with drips over its edge
  k.cyl(2.35, 0.25, 0x5d4037, 0, 0.125, 0, { seg: 24 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * PI * 2;
    k.ball(0.32, i % 2 ? 0x8d8a85 : 0x757575, Math.cos(a) * 2.15, 0.32, Math.sin(a) * 2.15, { sy: 0.6, seg: 7, rows: 5, flat: true, ry: a });
  }
  k.cyl(1.98, 0.12, pool, 0, 0.32, 0, { seg: 24 });
  for (const a of [0.4, 1.9, 3.1, 4.4, 5.6]) k.ball(0.14, 0x4fc3f7, Math.cos(a) * 2.2, 0.48, Math.sin(a) * 2.2, { sy: 0.5, seg: 6, rows: 4 });
  for (const [x, z, r] of [[1.0, 1.4, 0.18], [-1.3, 0.9, 0.12], [0.4, -1.5, 0.15]]) k.torus(r, 0.03, 0xb3e5fc, x, 0.39, z, { rx: PI / 2, seg: 10 }); // ripples
  if (level >= 2) {
    // A gem scepter planted beside him (the gem is its own turning piece)
    const sx = 1.8;
    const sz = 0.9;
    k.cyl(0.09, 3.2, 0xffc400, sx, 1.9, sz, { seg: 8 });
    for (const y of [1.0, 2.0, 3.0]) k.torus(0.11, 0.04, 0xffa000, sx, y, sz, { rx: PI / 2, seg: 10 });
    k.cyl(0.12, 0.25, 0xffc400, sx, 3.55, sz, { r2: 0.28, seg: 10 });
    k.ball(0.12, 0xffc400, sx, 0.4, sz, { seg: 8, rows: 6 });
  }
  if (level >= 4) {
    // The royal throne behind him
    const RED = 0xb71c1c;
    const GOLD = 0xffc400;
    k.box(3.6, 4.4, 0.5, RED, 0, 2.6, -2.0, { r: 0.2 });
    k.box(3.0, 3.6, 0.1, tone(RED, 0.8), 0, 2.7, -1.72, { r: 0.05 });
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) k.ball(0.06, GOLD, -0.9 + i * 0.9, 1.4 + j * 0.85, -1.66, { seg: 6, rows: 4 }); // buttons
    k.tube([[-1.85, 4.6, -1.95], [-1.0, 5.2, -1.95], [0, 5.45, -1.95], [1.0, 5.2, -1.95], [1.85, 4.6, -1.95]], 0.14, GOLD, { sides: 8 });
    for (const x of [-1.9, 1.9]) {
      k.cyl(0.2, 5.0, GOLD, x, 2.5, -1.95, { seg: 10 });
      k.ball(0.3, GOLD, x, 5.1, -1.95, { seg: 10, rows: 7 });
      k.box(0.5, 1.2, 2.4, RED, x, 1.1, -0.7, { r: 0.15 }); // armrests
      k.box(0.6, 0.15, 2.5, GOLD, x, 1.75, -0.7, { r: 0.05 });
      k.ball(0.18, GOLD, x, 1.85, 0.55, { seg: 8, rows: 6 });
    }
    k.ball(0.32, glowMat(u, 0x00e5ff), 0, 4.75, -1.68, { sz: 0.5, seg: 6, rows: 4, flat: true });
    k.torus(0.36, 0.06, GOLD, 0, 4.75, -1.68, { seg: 14 });
  }
  k.done();
  // The king himself
  const s = 2.4 + level * 0.12;
  const king = grp(u.body, 0, 0.3, 0);
  const kk = kit(u, king, `slimeKing${level}`);
  slime(kk, 0x2196f3, s, jelly);
  const cr = (0.75 + level * 0.12) * s * 0.55 * 0.5;
  crown(kk, cr, 0, 1.2 * s, -0.05 * s, level >= 1, level >= 3 ? 1.6 : level >= 2 ? 1 : 0, fl);
  if (level >= 4) {
    // Purple cape with an ermine collar
    kk.slab(1.6 * s, 0.95 * s, 0.1, 0x6a1b9a, 0, 0.62 * s, -0.78 * s, { tw: 0.75, rx: 0.12 });
    kk.slab(1.5 * s, 0.9 * s, 0.06, 0x8e24aa, 0, 0.62 * s, -0.73 * s, { tw: 0.75, rx: 0.12 });
    kk.box(1.25 * s, 0.1 * s, 0.14, 0xfafafa, 0, 1.08 * s, -0.68 * s, { r: 0.04, rx: 0.12 }); // ermine trim
    for (let i = 0; i < 5; i++) kk.ball(0.025 * s, INK, (i - 2) * 0.24 * s, 1.08 * s, -0.6 * s, { sy: 1.6, sz: 0.5, seg: 4, rows: 3 });
  }
  kk.done();
  if (level >= 2) {
    // The scepter's gem turns slowly and bobs
    const gem = drifter(u, u.body, 1.8, 4.0, 0.9, 1.2, 0.08);
    const gk = kit(u, gem, `slimeGem${level >= 4 ? 1 : 0}`);
    const gm = glowMat(u, level >= 4 ? 0xe040fb : 0x00e5ff);
    gk.cyl(0, 0.3, gm, 0, -0.15, 0, { r2: 0.3, seg: 6, flat: true });
    gk.cyl(0.3, 0.45, gm, 0, 0.22, 0, { r2: 0, seg: 6, flat: true });
    gk.done();
  }
  if (level >= 3) {
    // Little slimes bobbing in the pool: two blue, one on fire
    for (const [x, z, c, sp] of [[-1.75, 1.45, 0x64b5f6, 0.5], [1.85, 1.3, 0x64b5f6, -0.6], [-2.0, -0.9, 0xff7043, 0.7]]) {
      const g = drifter(u, u.body, x, 0.45, z, sp, 0.06); // on the stone rim
      const sk = kit(u, g, `slimeLittle${c}`);
      slime(sk, c, 0.45, null, c !== 0xff7043);
      if (c === 0xff7043) for (const [fx, fz, fh] of [[0, 0, 0.45], [-0.12, 0.05, 0.3], [0.12, -0.05, 0.32]]) {
        sk.cyl(0.1, fh, fl[0], fx, 0.6 + fh / 2, fz, { r2: 0, seg: 6 });
        sk.cyl(0.05, fh * 0.6, fl[1], fx, 0.58 + fh * 0.3, fz + 0.04, { r2: 0, seg: 5 });
      }
      sk.done();
    }
  }
  gunMuzzle(u, u.body, 0, 1.0, 2.2);
  return u;
}

// ------------------------------------------------------------------ El Goblino

const GOB = 0x8b1e1e;
const GOB_D = 0x5d1010;
const BONE = 0xeeeeee;

/** A big round yellow eye with a black pupil and a glint, facing +z. */
function goblinEye(k, x, y, z, r) {
  k.ball(r * 1.15, GOB_D, x, y, z - 0.05, { sz: 0.4, seg: 12, rows: 8 }); // dark socket rim
  k.ball(r, 0xffe600, x, y, z, { sz: 0.45, seg: 14, rows: 10 });
  k.ball(r * 0.45, 0x111111, x, y - r * 0.05, z + r * 0.32, { sz: 0.4, seg: 10, rows: 6 });
  k.ball(r * 0.14, 0xffffff, x + r * 0.15, y + r * 0.2, z + r * 0.45, { seg: 6, rows: 4 });
}

/** A skull on a stake standing on (x, 0, z). */
function skullStake(k, x, z) {
  k.cyl(0.08, 1.8, 0x6d4c41, x, 0.9, z, { seg: 6 });
  k.ball(0.26, BONE, x, 1.95, z, { sy: 0.95, seg: 10, rows: 7 });
  k.box(0.32, 0.18, 0.28, BONE, x, 1.75, z + 0.05, { r: 0.05 });
  for (const s of [-1, 1]) k.ball(0.07, INK, x + s * 0.1, 1.98, z + 0.22, { sz: 0.5, seg: 6, rows: 4 });
  k.cyl(0.03, 0.08, INK, x, 1.86, z + 0.24, { axis: 'z', seg: 3 });
  for (let i = 0; i < 4; i++) k.box(0.04, 0.06, 0.04, 0x9e9e9e, x - 0.09 + i * 0.06, 1.7, z + 0.2);
}

/**
 * El Goblino (0-4): a dark red goblin hunched on a rock, huge pointed ears, big round yellow
 * eyes, an open bear trap held up in one hand. Lv 1 a sack of traps and skull stakes; Lv 2 a
 * wooden cross charm and a gold ear ring; Lv 3 a lantern on a post and bear traps scattered
 * round him; Lv 4 a dark bog with glowing mushrooms, a bigger sack, a meat hook, and green
 * will-o'-wisps circling him (u.drift); he grows a bit.
 */
export function makeGoblino(level) {
  level = lv(level, 4);
  const u = makeThing();
  const bog = level >= 4;
  const k = kit(u, u.body, `goblinoBase${level}`);
  // Ground, grass tufts, pebbles and the rock seat
  k.slab(4.4, 0.25, 4.4, bog ? 0x2e2416 : 0x5d4f3a, 0, 0.125, 0, { tw: 0.97, td: 0.97 });
  for (const [x, z] of [[-1.6, 1.5], [1.7, 1.6], [-1.8, -1.4], [0.9, -1.9], [-0.6, 1.9]]) {
    for (let i = 0; i < 4; i++) k.cyl(0.05, 0.45, bog ? 0x33691e : 0x558b2f, x + (i - 1.5) * 0.08, 0.45, z + (i % 2) * 0.06, { r2: 0, seg: 4, rz: (i - 1.5) * 0.25 });
  }
  for (const [x, z, r] of [[1.2, 0.6, 0.12], [-1.1, 1.0, 0.1], [0.5, 1.7, 0.14]]) k.ball(r, 0x6d6d6d, x, 0.27, z, { sy: 0.6, seg: 5, rows: 3, flat: true });
  k.ball(1.1, 0x757575, 0, 0.55, -0.3, { sx: 1.05, sy: 0.4, sz: 0.85, seg: 8, rows: 5, flat: true });
  k.ball(0.5, 0x616161, 0.7, 0.45, -0.85, { sy: 0.6, seg: 6, rows: 4, flat: true });
  if (bog) {
    // Dark bog puddles and glowing mushrooms
    const pool = seeThrough(u, 0x1b5e20, 0.6);
    for (const [x, z, r] of [[1.2, 1.4, 0.7], [-1.5, 0.3, 0.55]]) k.cyl(r, 0.04, pool, x, 0.27, z, { seg: 14 });
    const cap = glowMat(u, 0x76ff03);
    for (const [x, z, s] of [[-1.3, 1.9, 1], [1.4, -1.9, 0.8], [-2.0, 0.2, 0.7], [1.9, 0.3, 0.6]]) {
      k.cyl(0.08 * s, 0.5 * s, 0xf1f8e9, x, 0.25 + 0.25 * s, z, { r2: 0.06 * s, seg: 6 });
      k.ball(0.3 * s, cap, x, 0.5 + 0.25 * s, z, { sy: 0.5, seg: 10, rows: 5 });
    }
  }
  if (level >= 1) {
    skullStake(k, -1.9, -1.3);
    skullStake(k, 1.9, -1.3);
  }
  if (level >= 3) {
    // Bear traps scattered round him, and a lantern hanging from a crooked post
    bearTrap(k, -1.6, 0.25, 1.6, 1, 0x9e9e9e, 0.4);
    bearTrap(k, 1.7, 0.25, 1.4, 1, 0x9e9e9e, -0.6);
    bearTrap(k, 0.1, 0.25, 2.0, 0.9, 0x9e9e9e, 1.2);
    const WOOD = 0x5d4037;
    k.tube([[-1.8, 0.2, 0.6], [-1.85, 1.4, 0.6], [-1.75, 2.6, 0.6]], 0.07, WOOD, { sides: 6 });
    k.tube([[-1.78, 2.55, 0.6], [-1.55, 2.65, 0.6], [-1.35, 2.6, 0.6]], 0.05, WOOD, { sides: 6 });
    k.cyl(0.015, 0.25, 0x424242, -1.4, 2.43, 0.6, { seg: 4 });
    k.cyl(0.12, 0.12, 0x212121, -1.4, 2.27, 0.6, { r2: 0.05, seg: 8 });
    k.torus(0.08, 0.02, 0x212121, -1.4, 2.38, 0.6, { seg: 8 });
    k.cyl(0.15, 0.36, glowMat(u, 0xffb300), -1.4, 2.0, 0.6, { seg: 8 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2 + PI / 4;
      k.cyl(0.02, 0.38, 0x212121, -1.4 + Math.cos(a) * 0.15, 2.0, 0.6 + Math.sin(a) * 0.15, { seg: 4 });
    }
    k.cyl(0.17, 0.08, 0x212121, -1.4, 1.79, 0.6, { seg: 8 });
  }
  if (bog) {
    // A meat hook on a bent pole
    const WOOD = 0x6d4c41;
    k.tube([[-1.5, 0.2, -1.6], [-1.5, 2.5, -1.6], [-1.4, 4.0, -1.6], [-0.9, 4.2, -1.6], [-0.3, 4.15, -1.6]], 0.1, WOOD, { sides: 6 });
    for (let i = 0; i < 4; i++) k.torus(0.06, 0.018, 0x616161, -0.3, 4.0 - i * 0.13, -1.6, { ry: (i % 2) * PI / 2, seg: 6 });
    k.torus(0.15, 0.03, 0x9e9e9e, -0.3, 3.3, -1.6, { arc: PI * 1.4, rz: PI * 0.8, seg: 10 });
    k.ball(0.32, 0xc62828, -0.3, 2.9, -1.6, { sx: 0.95, sy: 0.85, sz: 0.75, seg: 10, rows: 7 });
    k.ball(0.22, 0xe57373, -0.2, 2.95, -1.4, { sz: 0.4, seg: 8, rows: 5 });
    k.cyl(0.06, 0.55, 0xf5f5dc, -0.3, 2.55, -1.6, { seg: 6 });
    k.ball(0.09, 0xf5f5dc, -0.36, 2.28, -1.6, { seg: 6, rows: 4 });
    k.ball(0.09, 0xf5f5dc, -0.24, 2.28, -1.6, { seg: 6, rows: 4 });
  }
  if (level >= 1) {
    // Sack of traps (bigger at Lv 4), jaws poking out of the top
    const s = bog ? 1.45 : 1;
    const x = 1.7;
    const z = -0.9;
    k.ball(0.55 * s, 0xa1887f, x, 0.25 + 0.5 * s, z, { sy: 1.0, seg: 12, rows: 8 });
    k.ball(0.35 * s, 0x8d6e63, x, 0.25 + 0.95 * s, z, { sy: 0.6, seg: 10, rows: 6 });
    k.torus(0.2 * s, 0.05 * s, 0x5d4037, x, 0.25 + 1.0 * s, z, { rx: PI / 2, seg: 10 });
    k.box(0.15 * s, 0.12 * s, 0.05, 0x6d4c41, x - 0.2 * s, 0.25 + 0.5 * s, z + 0.52 * s, { r: 0.02 }); // patch
    k.torus(0.22 * s, 0.03 * s, 0x9e9e9e, x, 0.25 + 1.25 * s, z, { arc: PI, seg: 10 });
    for (let i = 0; i < 4; i++) k.cyl(0.025 * s, 0.1 * s, 0xe0e0e0, x - 0.17 * s + i * 0.11 * s, 0.25 + 1.3 * s, z, { r2: 0, seg: 4, rx: PI });
  }
  k.done();
  // The goblin, sitting hunched over
  const g = grp(u.body, 0, 0.7, 0);
  const b = kit(u, g, `goblino${level}`);
  for (const sd of [-1, 1]) {
    b.ball(0.35, GOB, sd * 0.55, 0.35, 0.4, { sz: 1.7, seg: 10, rows: 7 }); // thighs
    b.cyl(0.22, 0.95, GOB, sd * 0.6, 0.0, 1.0, { r2: 0.25, seg: 8, rx: 0.1 }); // shins
    b.ball(0.35, GOB_D, sd * 0.6, -0.4, 1.3, { sy: 0.4, sz: 1.5, seg: 10, rows: 6 }); // big feet
    for (const dx of [-0.2, 0, 0.2]) b.cyl(0.06, 0.2, 0xe0e0c0, sd * 0.6 + dx, -0.42, 1.85, { r2: 0, axis: 'z', seg: 4 });
    b.ball(0.2, GOB_D, sd * 0.6, 0.45, 1.0, { seg: 8, rows: 5 }); // knobbly knees
  }
  // Hunched torso with a bumpy spine, a loincloth on a rope belt
  b.ball(0.85, GOB, 0, 1.25, -0.1, { sx: 1.0, sy: 1.0, sz: 0.75, rx: 0.4, seg: 14, rows: 10 });
  b.ball(0.55, tone(GOB, 1.15), 0, 1.05, 0.38, { sy: 1.0, sz: 0.4, rx: 0.4, seg: 10, rows: 7 }); // belly
  b.ball(0.6, GOB_D, 0, 1.75, -0.55, { sy: 0.8, sz: 0.6, rx: 0.4, seg: 10, rows: 7 }); // hunched back
  for (let i = 0; i < 4; i++) b.cyl(0.08, 0.2, GOB_D, 0, 1.15 + i * 0.25, -0.95 + i * 0.12, { r2: 0, seg: 5, rx: -0.9 });
  b.cyl(0.85, 0.4, 0x6d4c41, 0, 0.55, -0.05, { r2: 0.82, seg: 14 });
  b.slab(0.7, 0.6, 0.08, 0x6d4c41, 0, 0.3, 0.75, { tw: 1.3, rx: -0.2 });
  b.torus(0.82, 0.05, 0x8d6e63, 0, 0.72, -0.05, { rx: PI / 2, seg: 16 });
  if (level >= 2) {
    // A wooden cross charm on a cord
    b.tube([[-0.5, 2.05, 0.2], [-0.35, 1.6, 0.55], [-0.2, 1.45, 0.66], [0.1, 1.6, 0.6], [0.45, 2.05, 0.2]], 0.025, 0x3e2723, { sides: 4 });
    b.box(0.1, 0.45, 0.08, 0xa1887f, -0.2, 1.3, 0.7, { rx: 0.4 });
    b.box(0.3, 0.1, 0.08, 0xa1887f, -0.2, 1.38, 0.73, { rx: 0.4 });
  }
  // Head, low and forward: brow, huge eyes, a snout, a fanged grin, enormous ears
  const hx = 0;
  const hy = 2.1;
  const hz = 0.55;
  b.ball(0.72, GOB, hx, hy, hz, { sx: 1.0, sy: 0.78, sz: 0.8, seg: 14, rows: 10 });
  b.ball(0.65, GOB_D, hx, hy + 0.42, hz - 0.08, { sx: 0.95, sy: 0.35, sz: 0.8, seg: 12, rows: 6 }); // brow ridge
  goblinEye(b, hx - 0.32, hy + 0.1, hz + 0.5, 0.26);
  goblinEye(b, hx + 0.32, hy + 0.1, hz + 0.5, 0.26);
  b.ball(0.13, GOB_D, hx, hy - 0.15, hz + 0.6, { sy: 0.8, seg: 8, rows: 6 }); // nose
  b.box(0.5, 0.1, 0.1, 0x2a0505, hx, hy - 0.36, hz + 0.5, { r: 0.04 });
  for (const x of [-0.16, 0.16]) b.cyl(0.04, 0.16, 0xfafafa, hx + x, hy - 0.45, hz + 0.53, { r2: 0, rx: PI, seg: 4 });
  for (const sd of [-1, 1]) {
    // Huge pointed ears: a flat cone outside, a pink cone inside
    const ex = hx + sd * 1.25;
    const o = { axis: 'x', sz: 0.3, rz: sd * 0.35, seg: 10 };
    b.cyl(sd < 0 ? 0.02 : 0.34, 1.3, GOB, ex, hy + 0.15 + 0.2, hz - 0.1, { ...o, r2: sd < 0 ? 0.34 : 0.02 });
    b.cyl(sd < 0 ? 0.01 : 0.24, 1.0, 0xc2185b, ex - sd * 0.1, hy + 0.15 + 0.17, hz - 0.03, { ...o, r2: sd < 0 ? 0.24 : 0.01 });
    if (level >= 2 && sd > 0) b.torus(0.13, 0.03, 0xffc107, ex - 0.25, hy + 0.12, hz - 0.1, { ry: PI / 2, seg: 10 });
  }
  // Left hand on its knee
  b.tube([[0.75, 1.75, -0.05], [0.9, 1.25, 0.45], [0.8, 0.85, 0.95]], 0.17, GOB, { sides: 8 });
  b.ball(0.22, GOB_D, 0.8, 0.8, 1.05, { sy: 0.7, seg: 8, rows: 6 });
  for (const dx of [-0.1, 0, 0.1]) b.cyl(0.035, 0.15, 0xe0e0c0, 0.8 + dx, 0.68, 1.22, { r2: 0, rx: 2.2, seg: 4 });
  b.done();
  // Right arm raised, holding up an open trap
  const arm = grp(g, -0.95, 1.6, 0.2);
  arm.rotation.set(-0.9, -0.35, 0);
  const ak = kit(u, arm, `goblinoArm${level}`);
  ak.cyl(0.18, 1.1, GOB, 0, 0, 0.5, { axis: 'z', r2: 0.15, seg: 8 });
  ak.ball(0.24, GOB_D, 0, 0, 1.12, { sz: 0.8, seg: 8, rows: 6 });
  for (const dx of [-0.12, 0, 0.12]) ak.cyl(0.035, 0.18, 0xe0e0c0, dx, 0.18, 1.2, { r2: 0, seg: 4 });
  bearTrap(ak, 0, 0.26, 1.25, 0.55, level >= 3 ? 0xb0bec5 : 0x9e9e9e);
  ak.done();
  gunMuzzle(u, arm, 0, 0.5, 1.3);
  if (bog) {
    // Green will-o'-wisps circling him
    const ring = drifter(u, u.root, 0, 2.6, 0, 0.6, 0.25);
    const wk = kit(u, ring, 'goblinoWisps');
    const core = glowMat(u, 0x76ff03);
    const halo = seeThrough(u, 0x00e676, 0.4, true);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2;
      const x = Math.cos(a) * 2.4;
      const z = Math.sin(a) * 2.4;
      const y = (i % 2) * 0.32;
      wk.ball(0.16, core, x, y, z, { seg: 8, rows: 6 });
      wk.ball(0.3, halo, x, y, z, { seg: 10, rows: 7 });
      wk.cyl(0, 0.45, halo, x, y - 0.38, z, { r2: 0.2, seg: 8, rx: PI });
    }
    wk.done();
    u.body.scale.setScalar(1.08);
  }
  u.projectile = { color: 0x9e9e9e, size: 0.6, arc: 3 };
  u.tracer = 0x9e9e9e;
  return u;
}

// ------------------------------------------------------------------ Hayes

/**
 * Hayes (0-4): a scarecrow on a wooden post, arms out along the crossbar, a stitched sack head
 * and a wide brown hat, an orange tunic under an open brown coat. Lv 1 a crow on its arm and a
 * patch; Lv 2 a pumpkin at its feet; Lv 3 a lantern on its arm, a purple vest and a gold hat
 * band; Lv 4 a darker coat, four crows, glowing pumpkins, a green fog ring on the ground and
 * jack-o'-lantern lights floating round it (u.drift); it grows a bit.
 */
export function makeHayes(level) {
  level = lv(level, 4);
  const u = makeThing();
  const STRAW = 0xe6c35c;
  const WOOD = 0x6d4c41;
  const coat = level >= 4 ? 0x4e342e : 0x795548;
  const tunic = level >= 3 ? 0x6a1b9a : 0xef6c00;
  const k = kit(u, u.body, `hayes${level}`);
  // Grass, straw piles, and a pitchfork stuck in the ground
  k.slab(4.4, 0.25, 4.4, 0x6d8b3a, 0, 0.125, 0, { tw: 0.97, td: 0.97 });
  for (const [x, z] of [[-1.4, 1.2], [1.3, 1.5], [1.6, -1.2], [-1.2, -1.5]]) {
    k.ball(0.45, STRAW, x, 0.28, z, { sy: 0.35, sz: 0.75, seg: 10, rows: 5 });
    for (let i = 0; i < 4; i++) k.cyl(0.03, 0.35, i % 2 ? STRAW : 0xd4ae45, x + (i - 1.5) * 0.15, 0.38, z, { r2: 0, seg: 4, rz: (i - 1.5) * 0.5 });
  }
  k.cyl(0.05, 2.6, 0x8d6e63, 1.75, 1.3, 0.2, { rz: -0.2, seg: 6 });
  k.box(0.5, 0.06, 0.06, 0x9e9e9e, 2.0, 2.55, 0.2, { rz: -0.2 });
  for (let i = 0; i < 3; i++) k.cyl(0.025, 0.5, 0x9e9e9e, 1.88 + i * 0.13, 2.85, 0.2, { r2: 0.0, rz: -0.2, seg: 4 });
  // Post and crossbar, lashed with rope
  k.cyl(0.18, 6.0, WOOD, 0, 3.0, -0.3, { seg: 8 });
  k.cyl(0.15, 4.6, WOOD, 0, 4.4, -0.3, { axis: 'x', seg: 8 });
  for (const rz of [0.7, -0.7]) k.box(0.45, 0.06, 0.06, 0xa1887f, 0, 4.4, -0.1, { rz });
  // Tunic under an open coat, a rope belt and a straw hem
  k.box(1.5, 1.9, 0.9, tunic, 0, 3.7, 0, { r: 0.2 });
  if (level >= 3) for (const x of [-0.2, 0.2]) k.ball(0.06, 0xffc107, x, 3.9, 0.47, { seg: 6, rows: 4 }); // vest buttons
  for (const s of [-1, 1]) {
    k.box(0.48, 2.2, 1.0, coat, s * 0.62, 3.55, 0, { r: 0.12 });
    k.slab(0.3, 0.9, 0.06, tone(coat, 0.8), s * 0.45, 4.15, 0.52, { tw: 0.4, rz: s * 0.25 }); // lapels
    k.box(0.32, 0.25, 0.05, tone(coat, 0.85), s * 0.62, 3.0, 0.52, { r: 0.02 }); // pockets
  }
  k.box(1.6, 2.2, 0.15, coat, 0, 3.55, -0.5, { r: 0.05 });
  k.torus(0.78, 0.06, 0x3e2723, 0, 3.0, 0, { rx: PI / 2, sz: 0.62, seg: 18 });
  k.box(0.12, 0.35, 0.05, 0x3e2723, 0.2, 2.82, 0.5, { rz: 0.2 });
  for (let i = 0; i < 6; i++) strawTuft(k, -0.6 + i * 0.24, 2.5, 0.1 + (i % 2) * 0.15, (i - 2.5) * 0.1, -1);
  if (level >= 1) {
    // A purple patch on the coat with white stitches
    k.box(0.38, 0.38, 0.05, 0x8e24aa, -0.6, 3.3, 0.52, { r: 0.02 });
    for (let i = 0; i < 4; i++) k.box(0.03, 0.1, 0.03, 0xfafafa, -0.74 + i * 0.09, 3.49, 0.55);
  }
  // Sleeves along the crossbar, straw out of the cuffs
  for (const s of [-1, 1]) {
    k.cyl(0.33, 1.9, coat, s * 1.6, 4.4, -0.05, { axis: 'x', r2: 0.36, seg: 10 });
    k.torus(0.34, 0.06, tone(coat, 0.75), s * 2.5, 4.4, -0.05, { ry: PI / 2, seg: 12 });
    strawTuft(k, s * 2.65, 4.4, -0.05, s, 0);
  }
  // Head: a beige sack tied at the neck, stitched eyes and smile
  const SACK = 0xe8d6b0;
  k.ball(0.66, SACK, 0, 5.3, 0, { sy: 0.95, sz: 0.88, seg: 14, rows: 10 });
  k.cyl(0.3, 0.3, tone(SACK, 0.9), 0, 4.75, 0, { r2: 0.22, seg: 10 });
  k.torus(0.25, 0.05, 0xa1887f, 0, 4.78, 0, { rx: PI / 2, seg: 12 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2;
    k.cyl(0, 0.25, tone(SACK, 0.9), Math.cos(a) * 0.3, 4.62, Math.sin(a) * 0.3, { r2: 0.06, rx: -Math.sin(a) * 0.5, rz: Math.cos(a) * 0.5, seg: 4 });
  }
  const ink = 0x2b1d14;
  for (const x of [-0.24, 0.24]) {
    k.ball(0.1, ink, x, 5.42, 0.54, { sz: 0.4, seg: 8, rows: 6 });
    for (const r of [0.6, -0.6]) k.box(0.03, 0.22, 0.03, ink, x, 5.42, 0.58, { rz: r }); // cross stitches round the eyes
  }
  k.torus(0.25, 0.03, ink, 0, 5.22, 0.5, { arc: PI * 0.8, rz: PI * 1.1, rx: -0.3, seg: 12 }); // the smile
  for (let i = 0; i < 5; i++) {
    const a = PI * 1.2 + (i / 4) * PI * 0.6;
    k.box(0.025, 0.12, 0.03, ink, Math.cos(a) * 0.25, 5.22 + Math.sin(a) * 0.25, 0.55);
  }
  k.box(0.04, 0.4, 0.03, 0x8d6e63, 0.42, 5.55, 0.4, { rz: 0.4, ry: 0.6 }); // a seam
  // Wide floppy hat with straw poking out under the brim
  const HAT = 0x5d4037;
  k.cyl(1.25, 0.1, HAT, 0, 5.92, 0, { r2: 1.15, seg: 20 });
  k.torus(1.2, 0.06, tone(HAT, 0.85), 0, 5.9, 0, { rx: PI / 2, seg: 20 });
  k.cyl(0.6, 0.75, HAT, 0, 6.32, 0, { r2: 0.5, seg: 14 });
  k.box(0.5, 0.1, 0.9, tone(HAT, 0.8), 0, 6.68, 0, { r: 0.05 }); // the dent
  k.cyl(0.62, 0.18, level >= 3 ? 0xffc400 : 0x8d6e63, 0, 6.05, 0, { seg: 14 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * PI * 2;
    k.cyl(0, 0.4, STRAW, Math.cos(a) * 0.6, 5.72, Math.sin(a) * 0.55, { r2: 0.04, rx: -Math.sin(a) * 0.6, rz: Math.cos(a) * 0.6, seg: 4 });
  }
  if (level >= 2) jack(k, 0.9, 0.95, 0.7, 1.0, level >= 4 ? glowMat(u, 0xffab00) : 0x3e2723);
  if (level >= 4) jack(k, 0.6, -1.0, 0.55, 1.3, glowMat(u, 0xffab00));
  if (level >= 3) {
    // A lantern hanging from the right arm
    k.cyl(0.015, 0.55, 0x424242, -2.2, 3.95, -0.05, { seg: 4 });
    k.torus(0.1, 0.025, 0x212121, -2.2, 3.62, -0.05, { seg: 8 });
    k.cyl(0.24, 0.14, 0x212121, -2.2, 3.48, -0.05, { r2: 0.08, seg: 8 });
    k.cyl(0.18, 0.45, glowMat(u, 0xffb300), -2.2, 3.18, -0.05, { seg: 8 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2 + PI / 4;
      k.cyl(0.025, 0.47, 0x212121, -2.2 + Math.cos(a) * 0.19, 3.18, -0.05 + Math.sin(a) * 0.19, { seg: 4 });
    }
    k.cyl(0.22, 0.1, 0x212121, -2.2, 2.92, -0.05, { seg: 8 });
  }
  k.done();
  // Crows perched on the arms and the hat
  const crows = level >= 4 ? [[1.9, 4.7, 0, 0], [-1.5, 4.7, 0, PI], [0.2, 6.75, 0, 0.5], [-2.5, 4.7, 0, 0.3]] : level >= 1 ? [[1.9, 4.7, 0, 0]] : [];
  for (const [x, y, z, r] of crows) {
    const ck = kit(u, grp(u.body, x, y, z, 1, r), 'hayesCrow');
    crow(ck, 0, 0, 0, 0.55);
    ck.done();
  }
  if (level >= 4) {
    // A green fog ring on the ground and jack-o'-lantern lights floating round it
    const fog = drifter(u, u.root, 0, 0.3, 0, 0.3);
    const fk = kit(u, fog, 'hayesFog');
    const fm = seeThrough(u, 0x76ff03, 0.3, true);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * PI * 2;
      fk.ball(0.32, fm, Math.cos(a) * 3.6, (i % 3) * 0.08, Math.sin(a) * 3.6, { sx: 1.5, sy: 0.35, ry: -a + PI / 2, seg: 8, rows: 5 });
    }
    fk.done();
    const lights = drifter(u, u.root, 0, 4.6, 0, 0.5, 0.35);
    const lk = kit(u, lights, 'hayesLights');
    const lit = glowMat(u, 0xffd740);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2;
      jack(lk, 0.6, Math.cos(a) * 2.8, (i % 2) * 0.3, Math.sin(a) * 2.8, lit);
    }
    lk.done();
    u.body.scale.setScalar(1.08);
  }
  gunMuzzle(u, u.body, 0, 6.8, 0);
  return u;
}

export const MODELS = {
  aviatorBeebo: makeBeebo,
  marksmanFracture: makeFracture,
  patrolSlime: makeSlimeKing,
  trapperGoblino: makeGoblino,
  hayes: makeHayes,
};
