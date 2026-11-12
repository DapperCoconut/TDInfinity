import * as THREE from 'three';
import { PARTS, antenna, glowMat, kit, muzzleAt, tone, turretAt, unitBase, wheelGeo } from './vehicles.js';
import { scaled } from './moreunits.js';

// The flying mechanical summons, built with the vehicle kit (vehicles.js): the Jet Trooper's
// prop plane, jets and big transports, the frost planes, the Sky-drones and the Bliss of
// Finality. They fly nose first along +z; their propellers, rotors and radars turn (u.spin: a
// list of { o, axis, rate } that UnitView keeps spinning).

const { GLASS, STEEL, GUN, DARK } = PARTS;
const PI = Math.PI;
const NAV_L = 0xff1744;
const NAV_R = 0x00e676;

/** A round body along z through stations [[z, r], ...] (tail to nose). o.sx / o.sy squash it. */
export function hullZ(k, st, col, x, y, o) {
  for (let i = 0; i < st.length - 1; i++) {
    const [z0, r0] = st[i];
    const [z1, r1] = st[i + 1];
    k.cyl(r0, z1 - z0, col, x, y, (z0 + z1) / 2, { axis: 'z', r2: r1, seg: o?.seg ?? 10, sx: o?.sx, sy: o?.sy });
  }
}

/** A see-through disc material (the blur of a turning propeller). One per model. */
function blurMat(u, color = 0xcfd8dc, op = 0.16) {
  if (!u.blur) {
    u.blur = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: op, depthWrite: false });
    u.blur.userData.keepOpacity = op;
    u.mats.push(u.blur);
  }
  return u.blur;
}

function spinner(u, parent, x, y, z, axis, rate) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  (u.spin ??= []).push({ o: g, axis, rate });
  return g;
}

/** A propeller facing +z that turns: spinner cone, `n` blades with painted tips and a blur disc. */
function prop(u, parent, x, y, z, R, n, o = {}) {
  const g = spinner(u, parent, x, y, z, 'z', o.rate ?? 34);
  const k = kit(u, g, `prop|${R}|${n}|${o.col ?? 0}|${o.tip ?? 0}|${o.cone ?? 0}`);
  const blur = blurMat(u);
  k.cyl(R * 0.17, R * 0.36, o.cone ?? STEEL, 0, 0, R * 0.1, { axis: 'z', r2: 0.02, seg: 8 });
  k.cyl(R * 0.19, R * 0.1, DARK, 0, 0, -R * 0.08, { axis: 'z', seg: 8 });
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2;
    k.box(R * 0.15, R * 0.8, 0.035, o.col ?? 0x1c1c1c, -Math.sin(a) * R * 0.5, Math.cos(a) * R * 0.5, 0, { rz: a });
    k.box(R * 0.13, R * 0.12, 0.04, o.tip ?? 0xfdd835, -Math.sin(a) * R * 0.94, Math.cos(a) * R * 0.94, 0, { rz: a });
  }
  k.cyl(R, 0.012, blur, 0, 0, 0, { axis: 'z', seg: 18 });
  k.done();
  return g;
}

/** A rotor lying flat that turns (drones): hub, two blades and a blur disc. */
function rotor(u, parent, x, y, z, R, dir) {
  const g = spinner(u, parent, x, y, z, 'y', dir * 46);
  const k = kit(u, g, `rotor|${R}`);
  const blur = blurMat(u);
  k.cyl(R * 0.13, 0.07, 0x101010, 0, 0.02, 0, { seg: 8 });
  k.box(R * 2, 0.016, R * 0.2, 0x202326, 0, 0.03, 0, { rz: 0.04 });
  for (const s of [-1, 1]) k.box(R * 0.16, 0.018, R * 0.2, 0xff6d00, s * R * 0.92, 0.03, 0);
  k.cyl(R, 0.01, blur, 0, 0.03, 0, { seg: 16 });
  k.done();
  return g;
}

/** A missile along +z: body, seeker nose and tail fins. */
export function missile(k, x, y, z, len, r, col = 0xe0e0e0, nose = 0x9e9e9e) {
  k.cyl(r, len * 0.8, col, x, y, z, { axis: 'z', seg: 8 });
  k.cyl(r, len * 0.2, nose, x, y, z + len * 0.5, { axis: 'z', r2: 0.01, seg: 8 });
  for (const rz of [0, PI / 2]) k.box(r * 4.4, 0.02, len * 0.18, tone(col, 0.6), x, y, z - len * 0.32, { rz });
  for (const rz of [PI / 4, -PI / 4]) k.box(r * 3, 0.02, len * 0.1, tone(col, 0.6), x, y, z + len * 0.2, { rz });
}

/** A bomb along +z with a coloured band and box fins. */
export function bomb(k, x, y, z, len, r, col = 0x263238, band = 0xfdd835) {
  hullZ(k, [[z - len * 0.5, r * 0.35], [z - len * 0.2, r], [z + len * 0.2, r], [z + len * 0.5, r * 0.2]], col, x, y, { seg: 8 });
  k.cyl(r * 1.03, len * 0.08, band, x, y, z + len * 0.12, { axis: 'z', seg: 8 });
  for (const rz of [0, PI / 2]) k.box(r * 2.4, 0.03, len * 0.2, tone(col, 0.7), x, y, z - len * 0.42, { rz });
}

/** A roundel lying flat on a wing. */
function roundel(k, x, y, z, r, a, b, o) {
  k.cyl(r, 0.012, a, x, y, z, { seg: 12, ...o });
  k.cyl(r * 0.55, 0.018, b, x, y, z, { seg: 10, ...o });
}

// ------------------------------------------------------------------ jets

const JETS = {
  jfalcon: { s: 0.85, P: 0x9ea3a8, D: 0x43474b, fins: 1, sweep: 0.45, span: 3.2, chord: 1.9, stripe: 0xd32f2f, fly: 9, tracer: 0xffd740, tipMissiles: true },
  jraptor: { s: 1.0, P: 0x566f7b, D: 0x263238, fins: 2, sweep: 0.6, span: 3.2, chord: 2.4, canopy: 0xffb300, burner: 0xff6d00, intakes: true, fly: 10, tracer: 0xffab40 },
  jhardpoint: { s: 1.15, P: 0x6b7d3a, D: 0x3e4a22, fins: 2, sweep: 0.3, span: 3.6, chord: 1.9, fat: 1.4, bombs: true, intakes: true, fly: 10, tracer: 0xffab40, projectile: { color: 0x263238, size: 0.6 } },
  bnorthwind: { s: 1.0, P: 0xb3e5fc, D: 0x0288d1, fins: 2, sweep: 0.55, span: 3.2, chord: 1.9, canopy: 0x80deea, burner: 0x69f0ae, tipGlow: 0xb388ff, fly: 10, tracer: 0x80deea },
};

/** A jet fighter: round fuselage, radome, bubble canopy, swept wings, tail and stores. */
function jet(model) {
  const o = JETS[model];
  const u = unitBase();
  const S = scaled(u, o.s);
  const k = kit(u, S, model);
  const { P, D } = o;
  const L = 5.6;
  const h = L / 2;
  const r = (o.fat ?? 1.1) / 2;
  const line = tone(P, 0.62);
  const twin = o.fins === 2;
  // Fuselage, spine and radome
  hullZ(k, [[-h, r * 0.8], [-h * 0.55, r], [h * 0.3, r], [h * 0.62, r * 0.72]], P, 0, 0, { sy: 0.88 });
  hullZ(k, [[h * 0.62, r * 0.72], [h * 0.92, r * 0.34], [h * 1.14, 0.03]], D, 0, 0, { sy: 0.88 });
  k.cyl(0.02, 0.5, 0x111111, 0, 0, h * 1.14 + 0.22, { axis: 'z', seg: 4 }); // pitot
  k.box(r * 0.8, r * 0.5, L * 0.52, P, 0, r * 0.62, -h * 0.36, { r: 0.08 });
  for (const z of [-h * 0.5, -h * 0.05, h * 0.42]) k.torus(r * 1.0, 0.014, line, 0, 0, z, { sy: 0.88, seg: 12 }); // panel lines
  // Canopy on its sill
  k.box(r * 1.15, 0.08, r * 2.9, D, 0, r * 0.74, h * 0.3, { r: 0.03 });
  k.ball(r * 0.6, o.canopy ? glowMat(u, o.canopy, 0.6) : GLASS, 0, r * 0.8, h * 0.3, { sz: 2.3, sy: 0.95, seg: 10, rows: 6 });
  k.box(r * 1.0, 0.035, 0.05, D, 0, r * 1.36, h * 0.22); // canopy bow
  // Intakes along the cheeks
  if (o.intakes !== false) for (const sd of [-1, 1]) {
    k.box(r * 0.72, r * 0.9, L * 0.36, P, sd * r * 1.02, -r * 0.18, -h * 0.02, { r: 0.06 });
    k.box(r * 0.56, r * 0.72, 0.06, 0x08090a, sd * r * 1.02, -r * 0.18, -h * 0.02 + L * 0.18);
    k.box(r * 0.08, r * 0.8, 0.3, line, sd * r * 0.68, -r * 0.18, -h * 0.02 + L * 0.2); // splitter plate
  }
  // Swept wings with flaps, roundels, pylons and lights
  const xr = r * 0.55;
  const xt = xr + o.span;
  const z0 = h * 0.18;
  const back = Math.tan(o.sweep) * o.span;
  const c = o.chord;
  for (const sd of [-1, 1]) {
    k.plan([[sd * xr, z0], [sd * xt, z0 - back], [sd * xt, z0 - back - c * 0.36], [sd * xr, z0 - c * 1.05]], 0.11, P, 0, -0.16, 0, { bevel: 0.04 });
    const dz = c * 0.69 - back; // how far the trailing edge runs forward from root to tip
    k.box(Math.hypot(o.span, dz) * 0.62, 0.02, 0.05, line, sd * (xr + o.span * 0.5), -0.045, z0 - c * 1.05 + dz * 0.5 + c * 0.16, { ry: -sd * Math.atan2(dz, o.span) }); // flap line
    roundel(k, sd * (xr + o.span * 0.55), -0.045, z0 - back * 0.55 - c * 0.4, 0.26, o.stripe ?? D, 0xf5f5f5);
    k.box(0.07, 0.07, 0.07, sd < 0 ? NAV_L : NAV_R, sd * xt, -0.1, z0 - back - 0.05);
    const zs = z0 - back * 0.5 - c * 0.45;
    if (o.bombs) for (const i of [0, 1]) {
      const x = sd * (xr + 0.75 + i * 1.15);
      k.box(0.09, 0.22, 0.7, D, x, -0.3, zs + 0.15 - i * 0.2);
      bomb(k, x, -0.62, zs + 0.2 - i * 0.2, 1.5, 0.24);
    } else {
      k.box(0.08, 0.16, 0.6, D, sd * (xr + o.span * 0.5), -0.28, zs);
      missile(k, sd * (xr + o.span * 0.5), -0.42, zs + 0.1, 1.5, 0.075);
    }
    if (o.tipMissiles) {
      k.box(0.06, 0.06, 1.0, D, sd * (xt + 0.03), -0.1, z0 - back - c * 0.18);
      missile(k, sd * (xt + 0.12), -0.1, z0 - back - c * 0.1, 1.3, 0.06, 0xf5f5f5, 0xd32f2f);
    }
    if (o.tipGlow) k.box(0.14, 0.14, 1.6, glowMat(u, o.tipGlow), sd * (xt - 0.1), -0.08, z0 - back - c * 0.3);
    // Tailplane
    k.plan([[sd * r * 0.5, -h * 0.58], [sd * (r * 0.5 + 1.45), -h * 0.86], [sd * (r * 0.5 + 1.45), -h * 0.86 - 0.42], [sd * r * 0.5, -h * 0.98]], 0.08, P, 0, 0.0, 0, { bevel: 0.03 });
  }
  // Fins
  const fin = [[-h * 0.98, 0], [-h * 0.5, 0], [-h * 0.8, 1.3], [-h * 1.04, 1.3]];
  if (twin) for (const sd of [-1, 1]) {
    k.prism(fin, 0.07, D, sd * r * 0.72, r * 0.5, 0, { rz: -sd * 0.3, bevel: 0.02 });
    k.box(0.09, 0.2, 0.3, line, sd * (r * 0.72 + 0.3), r * 0.5 + 0.95, -h * 0.86, { rz: -sd * 0.3 });
  } else {
    k.prism(fin.map(([z, y]) => [z, y * 1.2]), 0.09, D, 0, r * 0.7, 0, { bevel: 0.02 });
    if (o.stripe) k.box(0.1, 0.22, 0.62, o.stripe, 0, r * 0.7 + 1.1, -h * 0.84);
  }
  if (o.stripe) k.cyl(r * 0.99, 0.2, o.stripe, 0, 0, -h * 0.7, { axis: 'z', sy: 0.88, seg: 10, r2: r * 0.94 });
  // Engines: nozzles with glowing burners
  const burn = glowMat(u, o.burner ?? 0xff9100);
  for (const x of twin ? [-r * 0.5, r * 0.5] : [0]) {
    const rn = twin ? r * 0.46 : r * 0.7;
    k.cyl(rn * 0.86, 0.5, 0x2a2c2e, x, 0, -h - 0.2, { axis: 'z', r2: rn, seg: 10 });
    for (let i = 0; i < 8; i++) k.box(0.03, 0.03, 0.46, 0x151617, x + Math.cos((i * PI) / 4) * rn * 0.95, Math.sin((i * PI) / 4) * rn * 0.95, -h - 0.2); // petals
    k.cyl(rn * 0.72, 0.06, burn, x, 0, -h - 0.4, { axis: 'z', seg: 10 });
  }
  // Nose guns
  for (const x of [-0.5, 0.5]) {
    k.cyl(0.045, 0.7, GUN, x * 0.72, -0.2, h * 0.86, { axis: 'z', seg: 6 });
    muzzleAt(u, S, x, -0.2, h + 0.4);
  }
  k.done();
  u.height = 1.6 * o.s;
  u.fly = o.fly;
  u.noTurn = true; // aircraft fly straight on; they don't swing round to shoot (views.js)
  u.tracer = o.tracer;
  if (o.projectile) u.projectile = o.projectile;
  return u;
}

// ------------------------------------------------------------------ prop planes

const PROPS = {
  jmerlin: { s: 0.8, P: 0x1e88e5, T: 0xfdd835, fly: 8, tracer: 0xffe082 },
  bbreeze: { s: 0.8, P: 0xeceff1, T: 0x4fc3f7, canopy: 0x80d8ff, fly: 8, tracer: 0x80d8ff },
  bornament: { s: 0.9, P: 0x2e7d32, T: 0xfafafa, baubles: [0xff1744, 0xffd740, 0x40c4ff, 0xd500f9], fly: 9, tracer: 0xffd740 },
};

/** A single-engine propeller fighter: cowling and turning propeller, low wings, bubble canopy, fixed gear. */
function propPlane(model) {
  const o = PROPS[model];
  const u = unitBase();
  const S = scaled(u, o.s);
  const k = kit(u, S, model);
  const { P, T } = o;
  const line = tone(P, 0.66);
  // Fuselage, cowling and exhaust stubs
  hullZ(k, [[-2.6, 0.1], [-1.5, 0.36], [0.2, 0.6], [1.75, 0.62]], P, 0, 0, { sx: 0.92 });
  hullZ(k, [[1.75, 0.65], [2.35, 0.6], [2.5, 0.5]], T, 0, 0, { sx: 0.95 });
  k.cyl(0.42, 0.06, 0x0b0c0d, 0, 0, 2.5, { axis: 'z', seg: 10 });
  for (const sd of [-1, 1]) for (const i of [0, 1, 2]) k.cyl(0.05, 0.22, 0x3a3d40, sd * 0.6, -0.08, 1.55 - i * 0.2, { axis: 'z', seg: 5, ry: sd * 0.6 });
  for (const z of [-0.9, 0.3, 1.2]) k.torus(z < 0 ? 0.43 : 0.61, 0.012, line, 0, 0, z, { sx: 0.92, seg: 12 });
  prop(u, S, 0, 0, 2.62, 1.3, 3, { cone: T });
  // Low wings with a little dihedral, a trim stripe, roundels and guns
  for (const sd of [-1, 1]) {
    k.plan([[0, 1.25], [sd * 3.25, 0.98], [sd * 3.5, 0.78], [sd * 3.5, 0.28], [sd * 3.3, 0.08], [0, -0.32]], 0.14, P, 0, -0.38, 0, { bevel: 0.05, rz: sd * 0.07 });
    k.box(0.4, 0.02, 0.95, T, sd * 2.75, -0.38 + 0.145 + 2.75 * 0.07, 0.55, { rz: sd * 0.07 });
    roundel(k, sd * 1.9, -0.38 + 0.15 + 1.9 * 0.07, 0.5, 0.3, T, P, { rz: sd * 0.07 });
    k.box(1.5, 0.02, 0.04, line, sd * 1.7, -0.38 + 0.147 + 1.7 * 0.07, -0.05, { rz: sd * 0.07, ry: sd * 0.1 }); // flap line
    k.box(0.07, 0.07, 0.07, sd < 0 ? NAV_L : NAV_R, sd * 3.5, -0.38 + 0.07 + 3.5 * 0.07, 0.55);
    k.cyl(0.05, 0.6, GUN, sd * 0.9, -0.27, 1.25, { axis: 'z', seg: 6 });
    muzzleAt(u, S, sd * 0.9, -0.2, 1.3);
    // Fixed landing gear: strut, spat and a round wheel
    k.cyl(0.05, 0.7, STEEL, sd * 1.15, -0.72, 0.62, { seg: 6 });
    k.box(0.2, 0.3, 0.62, T, sd * 1.15, -0.95, 0.62, { r: 0.08 });
    k.geo(wheelGeo(0.3, 0.2, sd, { lugs: false, rim: T }), sd * 1.15, -1.12, 0.62);
    // Tailplane
    k.plan([[0, -1.75], [sd * 1.2, -1.95], [sd * 1.32, -2.15], [sd * 1.25, -2.45], [0, -2.6]], 0.09, P, 0, 0.05, 0, { bevel: 0.03 });
  }
  k.prism([[-2.7, 0], [-1.55, 0], [-2.0, 0.95], [-2.4, 1.15], [-2.72, 1.0]], 0.1, T, 0, 0.12, 0, { bevel: 0.03 });
  k.box(0.11, 0.9, 0.03, line, 0, 0.6, -2.38); // rudder hinge
  k.geo(wheelGeo(0.13, 0.1, 1, { lugs: false }), 0, -0.42, -2.25);
  k.cyl(0.03, 0.3, STEEL, 0, -0.28, -2.2, { seg: 5 });
  // Bubble canopy with its frame, an aerial mast
  k.box(0.78, 0.07, 1.7, tone(P, 0.8), 0, 0.5, 0.25, { r: 0.03 });
  k.ball(0.4, o.canopy ? glowMat(u, o.canopy, 0.6) : GLASS, 0, 0.56, 0.25, { sz: 2.0, seg: 10, rows: 6 });
  for (const z of [-0.05, 0.6]) k.torus(0.4, 0.02, tone(P, 0.8), 0, 0.56, z, { arc: PI, seg: 8, sy: z > 0.3 ? 0.82 : 0.98, sx: z > 0.3 ? 0.82 : 0.98 });
  k.cyl(0.015, 0.5, 0x111111, 0, 0.75, -0.9, { seg: 4, rx: -0.2 });
  if (o.baubles) {
    // Ornament: glowing baubles hang under the wings
    o.baubles.forEach((col, i) => {
      const x = (i < 2 ? -1 : 1) * (1.4 + (i % 2) * 1.2);
      k.cyl(0.02, 0.4, 0xbdbdbd, x, -0.52, 0.4, { seg: 4 });
      k.cyl(0.07, 0.08, 0xd4af37, x, -0.7, 0.4, { seg: 6 });
      k.ball(0.26, glowMat(u, col), x, -0.96, 0.4, { seg: 10, rows: 7 });
    });
  }
  k.done();
  u.height = 1.6 * o.s;
  u.fly = o.fly;
  u.noTurn = true; // aircraft fly straight on; they don't swing round to shoot (views.js)
  u.tracer = o.tracer;
  return u;
}

// ------------------------------------------------------------------ transports

const TRANSPORTS = {
  // Airlifter: a huge cargo plane with a high wing, a T-tail and a cargo ramp it drops troops from
  jairlifter: { P: 0x90a4ae, D: 0x546e7a, L: 9, R: 1.18, span: 13, chord: 2.2, wz: 0.6, eng: [2.2, 4.2], fh: 2.5, ttail: 5, stripe: 0x1565c0, height: 3.4, fly: 12, tracer: 0xffe082 },
  // Tentative: a heavy gunship with cannons along its flank
  jtentative: { P: 0x37474f, D: 0x212121, L: 8, R: 1.06, span: 11, chord: 2.0, wz: 0.4, eng: [1.9, 3.8], fh: 2.2, tail: 4, guns: true, glass: 0xff5252, height: 3.2, fly: 11, tracer: 0xffab40, tracerWidth: 0.3 },
};

/** A four-engined transport: round fuselage with an upswept tail, high wing, turning propellers. */
function transport(model) {
  const o = TRANSPORTS[model];
  const u = unitBase();
  const g = u.body;
  const k = kit(u, g, model);
  const { P, D, L, R } = o;
  const h = L / 2;
  const line = tone(P, 0.66);
  const sy = 0.94;
  // Fuselage, nose and the upswept tail cone
  hullZ(k, [[-h * 0.5, R], [h * 0.8, R], [h + 0.45, R * 0.74], [h + 1.0, R * 0.36]], P, 0, 0, { seg: 12, sy });
  k.ball(R * 0.37, tone(D, 0.8), 0, 0, h + 1.0, { sy, seg: 10, rows: 6 });
  const lt = h * 0.5 + 1.1;
  k.cyl(R * 0.26, lt, P, 0, Math.sin(0.15) * lt * 0.5, -h * 0.5 - lt / 2 + 0.05, { axis: 'z', r2: R, seg: 12, sy, rx: -0.15 });
  for (const z of [-h * 0.35, h * 0.1, h * 0.55]) k.torus(R * 1.0, 0.016, line, 0, 0, z, { sy, seg: 14 });
  // Flight deck glazing, side windows, cheat line, door
  const glass = o.glass ? glowMat(u, o.glass, 0.7) : GLASS;
  k.box(R * 1.36, 0.36, 0.5, glass, 0, R * 0.46, h + 0.42, { rx: -0.55, r: 0.06 });
  for (const sd of [-1, 1]) {
    k.box(0.06, 0.3, 0.55, glass, sd * R * 0.8, R * 0.42, h + 0.12, { ry: sd * 0.35 });
    for (let i = 0; i < 5; i++) k.cyl(0.13, 0.05, 0x1c2a33, sd * R * 0.985, R * 0.22, h * 0.55 - i * (L * 0.16), { axis: 'x', seg: 8 });
    if (o.stripe) k.box(0.04, 0.16, h * 1.28, o.stripe, sd * R * 0.995, -R * 0.08, h * 0.15);
    k.box(0.04, R * 0.9, 0.7, line, sd * R * 0.99, -R * 0.2, h * 0.62); // crew door
    k.box(0.07, 0.07, 0.07, sd < 0 ? NAV_L : NAV_R, sd * o.span / 2, R * sy + 0.13, o.wz + o.chord * 0.1);
  }
  // High wing with its fairing, flaps and four engines
  const yw = R * sy;
  const sp = o.span / 2;
  const c = o.chord;
  k.plan([[-sp, o.wz + c * 0.2], [0, o.wz + c / 2], [sp, o.wz + c * 0.2], [sp, o.wz - c * 0.28], [0, o.wz - c / 2], [-sp, o.wz - c * 0.28]], 0.26, P, 0, yw, 0, { bevel: 0.09 });
  k.box(R * 1.5, 0.34, c * 1.25, P, 0, yw + 0.08, o.wz, { r: 0.12 });
  for (const sd of [-1, 1]) k.box(sp * 0.78, 0.02, 0.05, line, sd * sp * 0.55, yw + 0.262, o.wz - c * 0.3, { ry: sd * 0.035 });
  for (const sd of [-1, 1]) for (const ex of o.eng) {
    const x = sd * ex;
    const ye = yw - 0.42;
    const zf = o.wz + c / 2 + 0.75;
    hullZ(k, [[o.wz - c * 0.5, 0.16], [o.wz - c * 0.1, 0.38], [zf - 0.25, 0.4], [zf, 0.3]], D, x, ye, { seg: 10 });
    k.box(0.18, 0.3, c * 0.7, P, x, yw - 0.1, o.wz + 0.1);
    k.cyl(0.22, 0.05, 0x08090a, x, ye - 0.12, zf - 0.02, { axis: 'z', seg: 8, sy: 0.6 }); // chin intake
    k.cyl(0.1, 0.3, 0x2a2c2e, x + 0.3 * sd, ye - 0.1, o.wz - c * 0.2, { axis: 'z', seg: 6 }); // exhaust
    prop(u, g, x, ye, zf + 0.06, 0.92, 4, { rate: sd * 30, cone: tone(P, 0.8) });
  }
  // Tail: fin with a rudder, T-tail or low tailplane
  const fz = -h - 0.75;
  const fy = R * 0.62 + 0.2;
  k.prism([[fz, 0], [-h * 0.42, 0], [-h * 0.42 - 0.5, 0.5], [fz + 0.9, o.fh], [fz - 0.1, o.fh]], 0.2, P, 0, fy, 0, { bevel: 0.06 });
  k.box(0.22, o.fh * 0.8, 0.04, line, 0, fy + o.fh * 0.55, fz + 0.42);
  if (o.stripe) k.box(0.22, 0.3, 0.9, o.stripe, 0, fy + o.fh - 0.42, fz + 0.4);
  const ts = (o.ttail ?? o.tail) / 2;
  const ty = o.ttail ? fy + o.fh : R * 0.42;
  const tz = o.ttail ? fz + 0.4 : fz + 0.75;
  k.plan([[-ts, tz + 0.12], [0, tz + 0.72], [ts, tz + 0.12], [ts, tz - 0.42], [0, tz - 0.62], [-ts, tz - 0.42]], 0.16, P, 0, ty, 0, { bevel: 0.05 });
  if (o.ttail) hullZ(k, [[tz - 0.9, 0.05], [tz - 0.2, 0.17], [tz + 0.7, 0.17], [tz + 1.1, 0.04]], P, 0, ty + 0.08, { seg: 8 });
  // Aerials and the red beacon
  antenna(k, 0, yw + 0.2, h * 0.5, 0.7);
  k.box(0.04, 0.3, 0.5, D, 0, yw + 0.35, -h * 0.2);
  k.ball(0.09, 0xff1744, 0, yw + 0.3, o.wz - c * 0.2, { seg: 6, rows: 4 });
  if (o.guns) {
    // Gunship: three cannons out of the left flank, a sensor ball under the nose, flare racks
    for (const [z, len, rr] of [[1.5, 1.4, 0.11], [0, 2.0, 0.17], [-1.5, 1.2, 0.09]]) {
      k.box(0.3, 0.62, 0.62, D, R * 0.9, -0.4, z, { r: 0.08 });
      k.cyl(rr * 1.5, 0.3, 0x2a2c2e, R + 0.12, -0.4, z, { axis: 'x', seg: 8 });
      k.cyl(rr, len, GUN, R + len / 2, -0.4, z, { axis: 'x', r2: rr * 0.85, seg: 8 });
      if (rr > 0.15) k.cyl(rr * 1.5, 0.3, 0x0e0f10, R + len - 0.2, -0.4, z, { axis: 'x', seg: 8 });
      muzzleAt(u, g, R + 0.14 + len, -0.4, z);
    }
    k.cyl(0.2, 0.3, D, -0.6, -R * sy - 0.05, 3.6, { seg: 8 });
    k.ball(0.4, glowMat(u, 0x76ff03), -0.6, -R * sy - 0.32, 3.6, { seg: 10, rows: 7 });
    for (const sd of [-1, 1]) k.box(0.1, 0.4, 0.8, 0x15171a, sd * R * 0.96, -R * 0.55, -h * 0.55);
    k.cyl(0.06, 1.3, D, 0.35, R * 0.1, h + 1.5, { axis: 'z', seg: 5 }); // refuelling probe
  } else {
    // Cargo plane: gear sponsons with wheels, the open ramp under the tail
    for (const sd of [-1, 1]) {
      hullZ(k, [[-1.9, 0.18], [-1.1, 0.52], [1.0, 0.52], [1.7, 0.2]], D, sd * R * 0.98, -R * 0.72, { seg: 8, sy: 0.8 });
      for (const z of [-0.55, 0.45]) k.geo(wheelGeo(0.36, 0.3, sd, { lugs: false }), sd * R * 1.02, -R * 0.72 - 0.42, z);
    }
    k.box(R * 1.3, 0.1, 2.3, 0x37474f, 0, -R * 0.62, -h * 0.5 - 1.25, { rx: 0.2 });
    for (const sd of [-1, 1]) k.box(0.06, 0.06, 2.3, 0xfdd835, sd * R * 0.6, -R * 0.62 + 0.06, -h * 0.5 - 1.25, { rx: 0.2 });
    k.box(R * 1.2, R * 0.9, 0.08, 0x0e1114, 0, -R * 0.1, -h * 0.5 - 0.3); // the dark hold behind the ramp
    muzzleAt(u, g, 0, -1.0, -4.8); // drops from the cargo ramp
  }
  k.done();
  u.height = o.height;
  u.fly = o.fly;
  u.noTurn = true; // aircraft fly straight on; they don't swing round to shoot (views.js)
  u.tracer = o.tracer;
  if (o.tracerWidth) u.tracerWidth = o.tracerWidth;
  return u;
}

// ------------------------------------------------------------------ drones

const DRONES = {
  svBurst: { c: 0x78909c, size: 1, tier: 1 },
  svBurst2: { c: 0x546e7a, size: 1, tier: 2 },
  svBurst3: { c: 0x37474f, size: 1.15, tier: 3 },
  svBurst4: { c: 0x263238, size: 1.25, tier: 4 },
  svSentinel: { c: 0xb71c1c, size: 1.35, tier: 3, dome: true },
  svBomber: { c: 0x5d4037, size: 1.5, tier: 3, bomb: true },
  svCryo: { c: 0x0277bd, size: 1.2, tier: 2, cryo: true },
};

/** A quadcopter: shell, battery, four arms with motors and turning rotors, skids, a camera and its payload. */
function drone(model) {
  const o = DRONES[model];
  const u = unitBase();
  const S = scaled(u, o.size * 1.15);
  const k = kit(u, S, model);
  const c = o.c;
  const eye = glowMat(u, o.cryo ? 0x80deea : o.bomb ? 0xff6d00 : 0xff1744);
  // Shell, canopy, battery
  k.box(0.78, 0.26, 1.1, c, 0, 0, 0, { r: 0.1 });
  k.ball(0.36, tone(c, 1.25), 0, 0.1, 0.12, { sy: 0.5, sz: 1.2, seg: 10, rows: 6 });
  k.box(0.46, 0.14, 0.42, 0x17191b, 0, 0.2, -0.3, { r: 0.03 });
  k.box(0.3, 0.02, 0.12, 0xfdd835, 0, 0.275, -0.3);
  for (const sd of [-1, 1]) k.box(0.04, 0.1, 0.5, tone(c, 0.6), sd * 0.4, 0, 0); // side vents
  // Arms, motors, rotors and guards
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = sx * 0.8;
    const z = sz * 0.8;
    k.tube([[sx * 0.3, 0.02, sz * 0.4], [sx * 0.55, 0.06, sz * 0.6], [x, 0.06, z]], 0.05, 0x24272a, { seg: 6, sides: 6 });
    k.cyl(0.11, 0.2, 0x3a3d40, x, 0.1, z, { seg: 8 });
    k.cyl(0.07, 0.1, 0x17191b, x, -0.05, z, { seg: 6 });
    k.box(0.06, 0.04, 0.06, sz > 0 ? NAV_R : NAV_L, x, -0.11, z); // position LEDs
    rotor(u, S, x, 0.22, z, 0.5, sx * sz);
    if (o.tier >= 3) {
      k.torus(0.56, 0.022, tone(c, 0.8), x, 0.2, z, { rx: PI / 2, seg: 14 });
      k.box(0.03, 0.03, 0.56, tone(c, 0.8), x + sx * 0.0, 0.18, z - sz * 0.28, {});
    }
  }
  // Skids
  for (const sd of [-1, 1]) {
    k.tube([[sd * 0.3, -0.12, 0.3], [sd * 0.42, -0.4, 0.38], [sd * 0.42, -0.42, -0.38], [sd * 0.3, -0.12, -0.3]], 0.026, 0x17191b, { seg: 10, sides: 5, tension: 0.05 });
  }
  // Camera gimbal with its glowing eye, aerial
  k.cyl(0.07, 0.1, 0x17191b, 0, -0.16, 0.42, { seg: 6 });
  k.ball(0.15, 0x101214, 0, -0.26, 0.44, { seg: 8, rows: 6 });
  k.cyl(0.075, 0.05, eye, 0, -0.26, 0.58, { axis: 'z', seg: 8 });
  k.cyl(0.012, 0.5, 0x101010, -0.22, 0.4, -0.45, { seg: 4 });
  if (o.tier >= 4) for (const sd of [-1, 1]) k.box(0.05, 0.3, 0.9, tone(c, 1.5), sd * 0.43, 0.02, 0, { r: 0.02 }); // armour
  if (o.dome) {
    // Sentinel: a sensor dome on top
    k.cyl(0.2, 0.08, 0x17191b, 0, 0.3, 0.15, { seg: 10 });
    k.ball(0.19, eye, 0, 0.36, 0.15, { seg: 10, rows: 6 });
  }
  // Guns
  for (const x of o.tier >= 2 && !o.bomb && !o.cryo ? [-0.2, 0.2] : [0]) {
    k.box(0.1, 0.1, 0.34, GUN, x, -0.16, 0.2);
    k.cyl(0.035, 0.42, 0x0e0f10, x, -0.17, 0.5, { axis: 'z', seg: 6 });
  }
  if (o.bomb) for (const x of [-0.22, 0.22]) {
    k.box(0.06, 0.12, 0.2, 0x17191b, x, -0.2, -0.05);
    bomb(k, x, -0.4, -0.05, 0.75, 0.15);
  }
  if (o.cryo) {
    k.cyl(0.2, 0.55, glowMat(u, 0xb2ebf2), 0, -0.36, -0.08, { axis: 'z', seg: 10 });
    for (const z of [-0.3, 0.14]) k.torus(0.2, 0.025, 0xeceff1, 0, -0.36, z, { seg: 10 });
    k.cyl(0.05, 0.3, 0xeceff1, 0, -0.36, 0.33, { axis: 'z', r2: 0.1, seg: 6 });
  }
  k.done();
  muzzleAt(u, S, 0, -0.2, 0.62);
  u.fly = 5;
  u.height = 1;
  u.tracer = o.cryo ? 0x80deea : 0xffd54f;
  return u;
}

// ------------------------------------------------------------------ Bliss of Finality

/** Bliss of Finality: a huge mining warship hovering high above the path, a railgun turret under its bow. */
function blissShip(model) {
  const u = unitBase();
  const g = u.body;
  const k = kit(u, g, model);
  const HULL = 0x37474f;
  const DECK = 0x455a64;
  const POD = 0x263238;
  const cyan = glowMat(u, 0x40c4ff);
  const pink = glowMat(u, 0xff4081);
  const rail = glowMat(u, 0x18ffff);
  // Hull: a long wedge-bowed body on a keel
  k.prism([[-5.5, -0.8], [-5.5, 0.8], [3.2, 0.8], [5.7, 0.15], [5.7, -0.3], [3.6, -0.8]], 5.0, HULL, 0, 0, 0, { bevel: 0.3 });
  k.slab(3.2, 0.55, 8.2, POD, 0, -1.05, -0.6, { bw: 0.55, bd: 0.85 });
  for (const z of [-4.2, -2.4, -0.6, 1.2, 2.8]) k.box(5.02, 0.05, 0.06, 0x263238, 0, 0.81, z); // deck plates
  for (const sd of [-1, 1]) {
    k.box(0.06, 0.3, 9.2, 0xfdd835, sd * 2.5, 0.35, -0.9); // hazard stripe
    for (let i = 0; i < 6; i++) k.box(0.07, 0.22, 0.4, cyan, sd * 2.5, -0.15, -4.4 + i * 1.5); // portholes
    k.box(0.07, 0.07, 0.07, sd < 0 ? NAV_L : NAV_R, sd * 2.5, 0.9, 3.0);
  }
  // Mining maw at the bow: two prongs, grinder drum and the collector glow
  for (const sd of [-1, 1]) {
    k.prism([[4.6, -0.55], [4.6, 0.3], [7.3, -0.05], [7.3, -0.4]], 0.7, POD, sd * 1.5, 0, 0, { bevel: 0.1 });
    k.box(0.3, 0.3, 0.5, 0xfdd835, sd * 1.5, -0.2, 7.3);
  }
  k.cyl(0.42, 2.2, 0x6d7478, 0, -0.2, 6.3, { axis: 'x', seg: 10 });
  for (let i = 0; i < 6; i++) for (const a of [0, 1, 2, 3]) k.box(0.16, 0.16, 0.16, 0xb0bec5, -0.9 + i * 0.36, -0.2 + Math.sin((a * PI) / 2 + i) * 0.45, 6.3 + Math.cos((a * PI) / 2 + i) * 0.45, { rx: (a * PI) / 2 + i });
  k.box(2.0, 0.5, 0.1, pink, 0, -0.15, 5.72);
  // Outrigger engine pods on pylons
  for (const sd of [-1, 1]) {
    k.box(1.25, 1.25, 8.0, POD, sd * 3.2, -0.2, 0, { r: 0.28 });
    k.slab(1.0, 0.7, 1.6, tone(POD, 1.3), sd * 3.2, -0.2, 4.5, { tw: 0.5, td: 1 });
    k.box(0.9, 0.9, 0.08, 0x08090a, sd * 3.2, -0.2, 4.02);
    for (const z of [-2.2, 1.4]) k.box(1.2, 0.4, 1.6, HULL, sd * 2.4, -0.1, z);
    k.cyl(0.5, 0.5, 0x1a1c1e, sd * 3.2, -0.2, -4.15, { axis: 'z', r2: 0.58, seg: 10 });
    k.cyl(0.44, 0.06, pink, sd * 3.2, -0.2, -4.42, { axis: 'z', seg: 10 });
    k.prism([[-3.6, 0], [-1.6, 0], [-2.6, 0.9], [-3.7, 0.9]], 0.12, HULL, sd * 3.2, 0.42, 0, { bevel: 0.03 });
    for (const z of [-2.8, -0.8, 1.2, 3.2]) k.torus(0.64, 0.03, 0x1a1c1e, sd * 3.2, -0.2, z, { seg: 4, rz: PI / 4 });
    k.box(0.06, 0.2, 6.5, cyan, sd * 3.84, -0.2, 0);
  }
  // Main engines
  for (const x of [-1.6, 1.6]) {
    k.cyl(0.62, 0.6, 0x1a1c1e, x, 0, -5.7, { axis: 'z', r2: 0.72, seg: 12 });
    k.cyl(0.56, 0.06, pink, x, 0, -6.02, { axis: 'z', seg: 12 });
  }
  k.box(1.2, 0.6, 0.5, 0x1a1c1e, 0, 0, -5.6);
  // Superstructure: deck house, bridge with a window band, mast and funnel
  k.slab(3.4, 1.0, 6.0, DECK, 0, 1.3, -1.5, { tw: 0.86, td: 0.92 });
  k.slab(1.9, 1.0, 2.2, 0x546e7a, 0, 2.3, -2.7, { tw: 0.82, td: 0.85 });
  k.box(1.66, 0.3, 0.08, cyan, 0, 2.38, -1.66, { rx: -0.14 });
  for (const sd of [-1, 1]) k.box(0.08, 0.3, 1.5, cyan, sd * 0.87, 2.38, -2.7, { rz: sd * 0.14 });
  k.box(1.3, 0.12, 1.5, 0x263238, 0, 2.86, -2.7);
  k.cyl(0.05, 1.3, 0x1a1c1e, 0.4, 3.5, -3.2, { seg: 5 });
  k.box(0.5, 0.04, 0.04, 0x1a1c1e, 0.4, 3.8, -3.2);
  k.ball(0.07, 0xff1744, 0.4, 4.18, -3.2, { seg: 6, rows: 4 });
  antenna(k, -0.5, 2.9, -3.3, 1.1);
  k.cyl(0.36, 0.9, 0x263238, 0, 2.2, -4.0, { r2: 0.28, seg: 10 });
  k.cyl(0.24, 0.05, 0x08090a, 0, 2.66, -4.0, { seg: 10 });
  // Ore hoppers and a crane on the fore deck
  for (const [x, z, col] of [[-1.2, 1.3, 0xbf360c], [0.1, 1.5, 0x1565c0], [1.3, 1.2, 0x2e7d32], [-0.5, 2.7, 0x6d4c41]]) {
    k.box(1.0, 0.7, 1.1, col, x, 1.17, z, { r: 0.04 });
    for (const dz of [-0.3, 0, 0.3]) k.box(1.02, 0.6, 0.05, tone(col, 0.7), x, 1.17, z + dz);
  }
  k.cyl(0.14, 1.1, 0xfdd835, 1.6, 1.35, 3.2, { seg: 8 });
  k.tube([[1.6, 1.9, 3.2], [1.2, 2.4, 3.8], [0.6, 2.5, 4.6]], 0.07, 0xfdd835, { seg: 8 });
  k.cyl(0.015, 0.8, 0x101010, 0.6, 2.1, 4.6, { seg: 4 });
  k.box(0.2, 0.14, 0.2, 0x3a3d40, 0.6, 1.66, 4.6);
  // Turning radar on the bridge
  const radar = spinner(u, g, 0, 2.95, -2.4, 'y', 1.6);
  const kr = kit(u, radar, `${model}:radar`);
  kr.cyl(0.07, 0.3, 0x1a1c1e, 0, 0.15, 0, { seg: 6 });
  kr.box(1.3, 0.34, 0.06, 0xb0bec5, 0, 0.42, 0, { rx: -0.12 });
  kr.box(1.34, 0.05, 0.1, 0x3a3d40, 0, 0.26, 0);
  kr.done();
  // Miniguns under the pods
  for (const x of [-2.6, 2.6]) {
    k.box(0.3, 0.3, 0.5, 0x1a1c1e, x, -0.82, 3.6);
    for (let i = 0; i < 4; i++) k.cyl(0.03, 0.9, 0x0e0f10, x + Math.cos((i * PI) / 2) * 0.06, -0.82 + Math.sin((i * PI) / 2) * 0.06, 4.2, { axis: 'z', seg: 5 });
    muzzleAt(u, g, x, -0.6, 4.5);
  }
  k.done();
  // The railgun turret under the bow
  const t = turretAt(u, g, -1.0, 2.5);
  const kt = kit(u, t, `${model}:t`);
  kt.cyl(0.8, 0.3, 0x1a1c1e, 0, 0.2, 0, { seg: 12 });
  kt.slab(1.5, 0.8, 1.9, 0x212121, 0, -0.3, 0.1, { bw: 0.8, bd: 0.8 });
  for (const sd of [-1, 1]) {
    kt.box(0.12, 0.3, 4.8, 0x2a2c2e, sd * 0.22, -0.3, 3.0);
    for (let i = 0; i < 5; i++) kt.box(0.62, 0.4, 0.16, 0x455a64, 0, -0.3, 1.2 + i * 0.95);
  }
  kt.box(0.22, 0.22, 4.9, rail, 0, -0.3, 3.0);
  kt.box(0.5, 0.5, 0.3, 0x1a1c1e, 0, -0.3, 5.45);
  kt.done();
  muzzleAt(u, t, 0, -0.3, 5.6, true);
  u.fly = 14;
  u.height = 2;
  u.tracer = 0x18ffff;
  return u;
}

export const AIR_UNITS = {
  jmerlin: propPlane, bbreeze: propPlane, bornament: propPlane,
  jfalcon: jet, jraptor: jet, jhardpoint: jet, bnorthwind: jet,
  jairlifter: transport, jtentative: transport,
  svBurst: drone, svBurst2: drone, svBurst3: drone, svBurst4: drone, svSentinel: drone, svBomber: drone, svCryo: drone,
  rbBliss: blissShip,
};
