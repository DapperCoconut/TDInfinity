import * as THREE from 'three';
import {
  boxGeo,
  part,
  makeHumanoid,
  makeThing,
  glow,
  glowThing,
  holdLongGun,
  setMuzzle,
  gunMuzzle,
  turret,
  wheels,
  makeHeli,
  present,
  pumpkin,
  boxRow,
} from '../models.js';

// New towers and units (set D). Every helper from models.js is only called inside functions
// (models.js imports this file, so the imports are not ready at module load time).

/* ------------------------------------------------------------------ helpers */

/** A see-through material that keeps its see-through look (setOpacity respects keepOpacity). */
function iceMat(u, color, op = 0.8) {
  const m = u.M(color);
  m.transparent = true;
  m.opacity = op;
  m.depthWrite = false;
  m.userData.keepOpacity = op;
  return m;
}

/** A curling tentacle / cable: a chain of shrinking boxes, each bent a little more. */
function tentacle(parent, mat, tipMat, n, seg, curl, x, y, z, rotY = 0, lean = 0) {
  let g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.set(lean, rotY, 0);
  parent.add(g);
  for (let i = 0; i < n; i++) {
    const k = 1 - (i / n) * 0.55;
    const len = seg * k;
    part(g, boxGeo(0.32 * k, len, 0.32 * k), i === n - 1 ? tipMat : mat, 0, len / 2, 0);
    const next = new THREE.Group();
    next.position.y = len;
    next.rotation.x = curl;
    g.add(next);
    g = next;
  }
}

/** A small parked jet (for carriers), nose along +Z. */
function miniJet(u, parent, x, y, z, color, s = 0.4, rot = 0, glowC = null) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rot;
  g.scale.setScalar(s);
  parent.add(g);
  const body = u.M(color);
  const dark = u.M(0x37474f);
  part(g, boxGeo(1.0, 0.8, 4.6), body, 0, 0.5, 0);
  part(g, boxGeo(0.5, 0.5, 0.9), dark, 0, 0.45, 2.7);
  part(g, boxGeo(0.65, 0.4, 1.1), u.M(0x4fc3f7), 0, 1.0, 1.0);
  for (const side of [-1, 1]) {
    part(g, boxGeo(2.4, 0.12, 1.6), body, side * 1.5, 0.45, -0.3).rotation.y = side * 0.45;
    part(g, boxGeo(0.1, 1.0, 0.9), dark, side * 0.4, 1.2, -1.9).rotation.z = side * -0.3;
  }
  if (glowC != null) part(g, boxGeo(0.6, 0.6, 0.2), glowThing(u, glowC), 0, 0.5, -2.35);
  return g;
}

/** Humanoid units as a squad (same layout as makeUnit's squads). */
function squad(u, count, mk) {
  u.soldiers = [];
  for (let i = 0; i < count; i++) {
    const h = mk(i);
    h.root.scale.setScalar(0.6 * (h.size ?? 1));
    h.root.position.set(count === 1 ? 0 : (i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.soldiers.push(h);
    u.muzzles.push(h.muzzles[0]);
  }
  const h0 = u.soldiers[0];
  u.height = 3.5 * (h0.size ?? 1);
  u.tracer = h0.tracer;
  if (h0.projectile) u.projectile = h0.projectile;
  return u;
}

function newUnit() {
  const u = makeThing();
  u.wheels = [];
  return u;
}

/* ------------------------------------------------------------------ towers */

/**
 * Eldritch (0-5): a cosmic rail cannon on a cracked obsidian altar, wrapped in teal tentacle
 * cables. Longer rails and more glow every level; Lv 2 a watching eye, Lv 3 rune pillars, Lv 4
 * more tentacles and a second rail pair, Lv 5 a huge eye, a void core and a halo of shards.
 */
function eldritch(level) {
  const u = makeThing();
  const { M } = u;
  const teal = [0x1de9b6, 0x1de9b6, 0x00e5a0, 0x64ffda, 0x76ff03, 0xb2ff59][level];
  const glowM = glowThing(u, teal);
  const stone = M(0x1b1426);
  const dark = M(0x0d0a12);
  const flesh = M(level >= 4 ? 0x2e1a47 : 0x263238);
  // Altar base with glowing cracks
  part(u.body, boxGeo(4.4, 0.5, 4.4), stone, 0, 0.25, 0);
  part(u.body, boxGeo(3.2, 0.6, 3.2), M(0x2a2036), 0, 0.8, 0);
  for (const [x, z, r] of [[-1.2, 1.6, 0.4], [1.4, -1.0, -0.6], [0.3, 2.21, 0]]) part(u.body, boxGeo(1.2, 0.06, 0.12), glowM, x, 0.52, z).rotation.y = r;
  // Pedestal and cannon housing
  part(u.body, boxGeo(1.8, 1.4, 1.8), dark, 0, 1.8, 0);
  const len = 3.4 + level * 0.7;
  const gun = new THREE.Group();
  gun.position.set(0, 3.0, -0.4);
  u.body.add(gun);
  part(gun, boxGeo(2.0, 1.4, 2.4), stone, 0, 0, 0);
  part(gun, boxGeo(1.4, 0.3, 0.1), glowM, 0, 0.3, 1.21); // sigil slot
  const pairs = level >= 4 ? 2 : 1;
  for (let p = 0; p < pairs; p++) {
    const y = pairs > 1 ? (p ? 0.35 : -0.35) : 0;
    for (const x of [-0.4, 0.4]) {
      part(gun, boxGeo(0.22, 0.3, len), dark, x, y, 1.2 + len / 2);
      part(gun, boxGeo(0.08, 0.12, len - 0.2), glowM, x * 0.7, y, 1.2 + len / 2);
    }
  }
  // Coil rings along the rails
  const rings = 2 + level;
  for (let i = 0; i < rings; i++) part(gun, boxGeo(1.3, pairs > 1 ? 1.4 : 0.8, 0.16), i % 2 ? glowM : flesh, 0, 0, 1.6 + (i * (len - 0.6)) / rings);
  part(gun, boxGeo(0.4, 0.4, 0.3), glowM, 0, 0, 1.2 + len); // emitter
  // Tentacle cables writhing from the altar to the cannon
  const n = 2 + Math.min(level, 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.4;
    tentacle(u.body, flesh, glowM, 4 + (level >> 1), 0.7 + level * 0.06, 0.32, Math.cos(a) * 1.4, 1.1, Math.sin(a) * 1.4, -a + Math.PI / 2, -0.25);
  }
  if (level >= 1) {
    // Cables plugged into the housing
    for (const side of [-1, 1]) part(gun, boxGeo(0.3, 0.3, 1.8), flesh, side * 1.15, -0.3, -0.2);
  }
  if (level >= 2) {
    // A floating eye watching over the cannon
    const eye = new THREE.Group();
    eye.position.set(0, 5.2 + level * 0.2, -1.2);
    u.body.add(eye);
    part(eye, boxGeo(1.0, 1.0, 1.0), M(0xe0e0d0), 0, 0, 0);
    part(eye, boxGeo(0.6, 0.6, 0.06), glowM, 0, 0, 0.51);
    part(eye, boxGeo(0.25, 0.4, 0.08), M(0x050505), 0, 0, 0.55);
  }
  if (level >= 3) {
    // Rune pillars at the corners
    for (const [x, z] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]]) {
      part(u.body, boxGeo(0.5, 2.0, 0.5), stone, x, 1.5, z);
      part(u.body, boxGeo(0.52, 0.2, 0.52), glowM, x, 1.9, z);
      part(u.body, boxGeo(0.3, 0.3, 0.3), glowM, x, 2.7, z);
    }
  }
  if (level >= 5) {
    // Void core in the altar, a giant eye and a halo of floating shards
    part(u.body, boxGeo(1.0, 1.0, 1.0), glowThing(u, 0xd500f9), 0, 1.8, 0.95);
    const purple = glowThing(u, 0xaa00ff);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      part(u.body, boxGeo(0.35, 0.6, 0.35), i % 2 ? purple : glowM, Math.cos(a) * 2.4, 6.6, Math.sin(a) * 2.4 - 1.2).rotation.y = a;
    }
    part(u.body, boxGeo(1.6, 0.25, 0.1), glowM, 0, 6.2, -0.6); // eye lid glow
  }
  gunMuzzle(u, gun, 0, 0, 1.4 + len);
  u.tracer = teal;
  u.tracerWidth = 0.4 + level * 0.12;
  return u;
}

/** A blocky mech (shared by the mech units and the Valkyr drop base). */
function buildMech(u, s, look) {
  const { M } = u;
  const paint = M(look.paint);
  const dark = M(look.dark);
  const eye = glowThing(u, look.eye);
  const hipY = 3.0 * s;
  u.legs = [];
  for (const x of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(x * 1.25 * s, hipY, 0);
    u.body.add(leg);
    part(leg, boxGeo(1.0 * s, hipY, 1.1 * s), paint, 0, -hipY / 2, 0);
    part(leg, boxGeo(1.25 * s, 0.7 * s, 0.9 * s), dark, 0, -hipY * 0.45, 0.35 * s); // knee
    part(leg, boxGeo(1.5 * s, 0.5 * s, 2.1 * s), dark, 0, -hipY + 0.25 * s, 0.3 * s); // foot
    if (look.armor) part(leg, boxGeo(1.15 * s, hipY * 0.4, 0.3 * s), M(look.armor), 0, -hipY * 0.75, 0.6 * s); // shin plate
    u.legs.push(leg);
  }
  part(u.body, boxGeo(2.6 * s, 0.6 * s, 1.4 * s), dark, 0, hipY, 0); // hips
  const torsoH = 2.1 * s;
  const t = turret(u, hipY + 0.2 * s);
  part(t, boxGeo(3.0 * s, torsoH, 2.4 * s), paint, 0, torsoH / 2, 0);
  if (look.armor) part(t, boxGeo(2.4 * s, torsoH * 0.6, 0.3 * s), M(look.armor), 0, torsoH * 0.45, 1.3 * s); // chest plate
  part(t, boxGeo(1.4 * s, 0.9 * s, 1.3 * s), dark, 0, torsoH + 0.45 * s, 0.2 * s); // head
  part(t, boxGeo(1.1 * s, 0.25 * s, 0.1), eye, 0, torsoH + 0.55 * s, 0.86 * s); // visor
  if (look.core) part(t, boxGeo(0.9 * s, 0.9 * s, 0.2 * s), glowThing(u, look.core), 0, torsoH * 0.5, 1.5 * s);
  const tip = (x) => {
    // Arm cannon on side x
    part(t, boxGeo(1.2 * s, 0.8 * s, 1.6 * s), dark, x * 2.0 * s, torsoH - 0.2 * s, 0); // shoulder
    part(t, boxGeo(0.9 * s, 1.8 * s, 0.9 * s), paint, x * 2.0 * s, torsoH - 1.4 * s, 0.1 * s); // arm
    const bl = 1.8 * s;
    part(t, boxGeo(0.6 * s, 0.6 * s, bl), M(0x263238), x * 2.0 * s, torsoH - 2.0 * s, 0.4 * s + bl / 2);
    part(t, boxGeo(0.4 * s, 0.4 * s, 0.1), eye, x * 2.0 * s, torsoH - 2.0 * s, 0.4 * s + bl + 0.02);
    gunMuzzle(u, t, x * 2.0 * s, torsoH - 2.0 * s, 0.5 * s + bl);
  };
  tip(-1);
  if (look.twin) tip(1);
  else {
    part(t, boxGeo(1.1 * s, 0.7 * s, 1.4 * s), dark, 2.0 * s, torsoH - 0.2 * s, 0);
    part(t, boxGeo(0.8 * s, 1.9 * s, 0.8 * s), paint, 2.0 * s, torsoH - 1.4 * s, 0.1 * s);
    part(t, boxGeo(1.0 * s, 0.9 * s, 1.0 * s), dark, 2.0 * s, torsoH - 2.5 * s, 0.2 * s); // fist
  }
  if (look.pods) {
    // Shoulder missile pods
    for (const x of [-1, 1]) {
      part(t, boxGeo(1.0 * s, 0.8 * s, 1.2 * s), M(0x37474f), x * 1.0 * s, torsoH + 0.6 * s, -0.7 * s);
      for (const dx of [-0.25, 0.25]) part(t, boxGeo(0.2 * s, 0.2 * s, 0.06), glowThing(u, 0xff3d00), (x * 1.0 + dx) * s, torsoH + 0.6 * s, -0.08 * s);
    }
  }
  if (look.crown) for (let i = -2; i <= 2; i++) part(t, boxGeo(0.25 * s, (0.5 + (2 - Math.abs(i)) * 0.25) * s, 0.25 * s), eye, i * 0.3 * s, torsoH + 1.1 * s, 0.2 * s);
  u.height = hipY + torsoH + 1.2 * s;
  return t;
}

const MECH_LOOKS = {
  mech1: { s: 0.8, paint: 0x8d9a6a, dark: 0x4b5320, eye: 0xffc400 },
  mech2: { s: 0.95, paint: 0x78909c, dark: 0x37474f, eye: 0x00e5ff, pods: true },
  mech45: { s: 1.1, paint: 0x5c6bc0, dark: 0x283593, eye: 0x40c4ff, armor: 0x9fa8da, twin: true },
  mech10: { s: 1.3, paint: 0x263238, dark: 0x111111, eye: 0xff1744, armor: 0x546e7a, twin: true, pods: true },
  mechult: { s: 1.7, paint: 0x1a1a2e, dark: 0x0d0d14, eye: 0xffd740, armor: 0xffc107, twin: true, pods: true, core: 0x00e5ff, crown: true },
};

/**
 * Valkyr (0-4): a mech drop base. A landing pad with a drop beacon and a hangar that grows each
 * level. Lv 1 floodlights, Lv 2 a mech parked on the pad, Lv 3 a radar dish and supply crates,
 * Lv 4 a huge hangar and a drop pod hovering over the pad on thrusters.
 */
function valkyr(level) {
  const u = makeThing();
  const { M } = u;
  const accent = level >= 4 ? 0x00e5ff : 0xffab00;
  part(u.body, boxGeo(4.6, 0.3, 4.6), M(0x616161), 0, 0.15, 0); // pad
  part(u.body, boxGeo(2.8, 0.05, 2.8), M(0x424242), 0, 0.33, 0.9);
  // Landing ring
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    part(u.body, boxGeo(0.3, 0.08, 0.3), glowThing(u, accent), Math.cos(a) * 1.2, 0.38, 0.9 + Math.sin(a) * 1.2);
  }
  // Hangar (back), bigger each level
  const hw = 2.4 + level * 0.45;
  const hh = 1.8 + level * 0.4;
  const wall = M([0x78909c, 0x607d8b, 0x546e7a, 0x455a64, 0x37474f][level]);
  part(u.body, boxGeo(hw, hh, 1.6), wall, 0, 0.3 + hh / 2, -1.45);
  part(u.body, boxGeo(hw + 0.3, 0.3, 1.9), M(0x263238), 0, 0.45 + hh, -1.45); // roof
  part(u.body, boxGeo(hw * 0.7, hh * 0.8, 0.1), M(0x212121), 0, 0.3 + hh * 0.4, -0.63); // door
  for (let i = 0; i < 3; i++) part(u.body, boxGeo(hw * 0.7, 0.08, 0.04), M(0x3e3e3e), 0, 0.5 + i * hh * 0.25, -0.57);
  part(u.body, boxGeo(hw * 0.7, 0.12, 0.06), glowThing(u, accent), 0, 0.3 + hh * 0.82, -0.58);
  // Drop beacon: a pole with a glowing light
  const bh = 2.4 + level * 0.4;
  part(u.body, boxGeo(0.25, bh, 0.25), M(0x9e9e9e), 1.95, 0.3 + bh / 2, 1.95);
  part(u.body, boxGeo(0.5, 0.5, 0.5), glowThing(u, level >= 2 ? 0xff1744 : 0xffd600), 1.95, 0.55 + bh, 1.95);
  if (level >= 1) {
    // Floodlights
    for (const x of [-1, 1]) {
      part(u.body, boxGeo(0.15, 1.6, 0.15), M(0x757575), x * 2.0, 1.1, 0.0);
      part(u.body, boxGeo(0.5, 0.35, 0.3), glowThing(u, 0xfff9c4), x * 2.0, 2.0, 0.1).rotation.x = 0.4;
    }
  }
  if (level >= 2) {
    // A mech parked on the pad
    const m = newUnit();
    buildMech(m, 1, level >= 4 ? MECH_LOOKS.mech45 : MECH_LOOKS.mech1);
    m.root.scale.setScalar(0.32);
    m.root.position.set(0, 0.35, 0.9);
    u.body.add(m.root);
    u.mats.push(...m.mats);
  }
  if (level >= 3) {
    // Radar dish on the roof and supply crates
    part(u.body, boxGeo(0.2, 1.0, 0.2), M(0x757575), -hw / 2 + 0.4, 1.0 + hh, -1.6);
    part(u.body, boxGeo(1.1, 0.8, 0.12), M(0xeceff1), -hw / 2 + 0.4, 1.7 + hh, -1.5).rotation.x = -0.5;
    for (const [x, y] of [[-1.9, 0.55], [-1.9, 1.05]]) part(u.body, boxGeo(0.6, 0.5, 0.6), M(0x4e5b31), x, y, 1.9);
  }
  if (level >= 4) {
    // A drop pod hovering above the pad on thrusters
    const pod = new THREE.Group();
    pod.position.set(0, 5.6, 0.9);
    u.body.add(pod);
    part(pod, boxGeo(1.4, 1.8, 1.4), M(0xcfd8dc), 0, 0, 0);
    part(pod, boxGeo(1.0, 0.6, 1.0), M(0x37474f), 0, 1.2, 0);
    part(pod, boxGeo(1.42, 0.2, 1.42), glowThing(u, accent), 0, 0.3, 0);
    for (const x of [-0.45, 0.45]) part(pod, boxGeo(0.4, 0.5, 0.4), glowThing(u, 0xff6d00), x, -1.1, 0);
    for (const side of [-1, 1]) part(pod, boxGeo(0.12, 1.2, 0.8), M(0x546e7a), side * 0.8, -0.5, 0).rotation.z = side * 0.3; // fins
  }
  return u;
}

/** Shared aircraft carrier (Squadron and Borealis). */
function carrier(u, level, look) {
  const { M } = u;
  const L = 6.4 + level * look.grow;
  const W = 2.6;
  const hh = 1.2;
  const hull = look.hull;
  const dark = M(0x212121);
  part(u.body, boxGeo(W, hh, L), hull, 0, hh / 2 - 0.4, -0.3);
  part(u.body, boxGeo(W + 0.04, 0.22, L + 0.02), look.waterline, 0, -0.4, -0.3);
  for (const side of [-1, 1]) part(u.body, boxGeo(W * 0.72, hh, 1.6), hull, side * W * 0.18, hh / 2 - 0.4, L / 2).rotation.y = side * 0.5;
  // Wide flight deck with an angled landing strip
  const dy = hh - 0.4;
  part(u.body, boxGeo(W + 0.8, 0.18, L + 0.4), look.deck, 0, dy + 0.09, -0.2);
  const ang = part(u.body, boxGeo(1.3, 0.16, L * 0.55), look.deck, -W / 2 - 0.3, dy + 0.08, -L * 0.1);
  ang.rotation.y = -0.15;
  // Deck markings
  for (let i = 0; i < 5; i++) part(u.body, boxGeo(0.12, 0.03, L * 0.12), look.line, -0.3, dy + 0.2, -L / 2 + 0.5 + i * (L / 5));
  part(u.body, boxGeo(0.08, 0.03, L * 0.75), look.edge, -W / 2 - 0.1, dy + 0.2, -0.3);
  // Island (starboard)
  const ix = W / 2 - 0.05;
  const iz = -L * 0.1;
  if (!look.fortress) {
    const ih = 1.4 + level * 0.15;
    part(u.body, boxGeo(0.8, ih, 1.8), look.island, ix, dy + 0.18 + ih / 2, iz);
    part(u.body, boxGeo(0.84, 0.25, 1.3), look.glass, ix, dy + 0.18 + ih * 0.8, iz + 0.1);
    part(u.body, boxGeo(0.12, 1.2, 0.12), dark, ix, dy + 0.18 + ih + 0.6, iz - 0.3);
    part(u.body, boxGeo(0.9, 0.08, 0.08), dark, ix, dy + 0.18 + ih + 0.9, iz - 0.3);
    if (level >= 2) part(u.body, boxGeo(0.9, 0.6, 0.1), M(0xeceff1), ix, dy + 0.18 + ih + 0.2, iz + 0.6).rotation.x = -0.4; // radar
  }
  // Parked jets
  const spots = [
    [-0.6, L * 0.32, 0],
    [0.5, L * 0.32, 0],
    [-0.6, L * 0.12, 0],
    [-0.9, -L * 0.25, -0.3],
    [0.3, -L * 0.36, 0.5],
    [-0.4, -L * 0.42, 0.2],
  ];
  const n = Math.min(spots.length, 1 + level);
  for (let i = 0; i < n; i++) {
    const [x, z, r] = spots[i];
    miniJet(u, u.body, x, dy + 0.18, z, look.jet(i), 0.32, r, look.burner);
  }
  // Bow gun
  const t = new THREE.Group();
  t.position.set(0, dy + 0.18, L / 2 - 0.2);
  u.body.add(t);
  part(t, boxGeo(0.7, 0.4, 0.7), look.island, 0, 0.2, 0);
  part(t, boxGeo(0.14, 0.14, 0.9), dark, 0, 0.3, 0.6);
  gunMuzzle(u, t, 0, 0.3, 1.1);
  return { L, W, dy };
}

/**
 * Squadron (0-5): an aircraft carrier with a flight deck, a control island and parked jets
 * (one more jet each level). Lv 3 catapult steam lights, Lv 4 point-defense guns, Lv 5 gold jets
 * and glowing deck lights.
 */
function squadron(level) {
  const u = makeThing();
  const { M } = u;
  const { L, W, dy } = carrier(u, level, {
    grow: 0.4,
    hull: M(level >= 5 ? 0x37474f : 0x607d8b),
    waterline: M(0x8e2b2b),
    deck: M(0x424242),
    line: M(0xfafafa),
    edge: M(0xfdd835),
    island: M(level >= 5 ? 0x455a64 : 0x78909c),
    glass: M(0x4fc3f7),
    jet: (i) => (level >= 5 && i < 2 ? 0xffc107 : 0x90a4ae),
    burner: level >= 3 ? 0xff9100 : null,
  });
  if (level >= 3) {
    // Catapult tracks with glowing shuttle lights
    for (const x of [-0.6, 0.5]) part(u.body, boxGeo(0.1, 0.04, L * 0.3), glowThing(u, 0x40c4ff), x, dy + 0.21, L * 0.28);
  }
  if (level >= 4) {
    // Point-defense guns on the deck corners
    for (const side of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(side * (W / 2 + 0.2), dy + 0.18, -L / 2 + 0.6);
      u.body.add(g);
      part(g, boxGeo(0.5, 0.5, 0.5), M(0xeceff1), 0, 0.25, 0);
      part(g, boxGeo(0.12, 0.12, 0.7), M(0x212121), 0, 0.3, 0.5);
      gunMuzzle(u, g, 0, 0.3, 0.9);
    }
  }
  if (level >= 5) {
    // Glowing deck edge lights
    const lit = glowThing(u, 0x76ff03);
    for (let i = 0; i < 6; i++) for (const side of [-1, 1]) part(u.body, boxGeo(0.12, 0.08, 0.12), lit, side * (W / 2 + 0.35), dy + 0.22, -L / 2 + 0.4 + i * (L / 6));
  }
  u.body.position.z = 0.3 - level * 0.05;
  u.tracer = 0xffd740;
  u.projectile = { color: 0x424242, size: 0.5 };
  u.static = true;
  u.bob = 0.06;
  return u;
}

/**
 * Borealis (0-4): an aircraft carrier carved from ice, with aurora-green and purple glow along
 * the hull and frosty planes on deck. Lv 2 an ice radar crystal, Lv 3 aurora masts, Lv 4 an ice
 * fortress on deck with a glowing crystal spire.
 */
function borealis(level) {
  const u = makeThing();
  const { M } = u;
  const aurora = glowThing(u, 0x69f0ae);
  const violet = glowThing(u, 0xb388ff);
  const { L, W, dy } = carrier(u, level, {
    grow: 0.5,
    hull: iceMat(u, 0x81d4fa, 0.85),
    waterline: aurora,
    deck: M(0xe1f5fe),
    line: violet,
    edge: aurora,
    island: iceMat(u, 0xb3e5fc, 0.85),
    glass: glowThing(u, 0x80deea),
    fortress: level >= 4,
    jet: (i) => (i % 2 ? 0xe1f5fe : 0xb3e5fc),
    burner: 0x69f0ae,
  });
  // Aurora bands along the hull sides
  for (const side of [-1, 1]) {
    part(u.body, boxGeo(0.06, 0.12, L * 0.8), aurora, side * (W / 2 + 0.03), 0.35, -0.3);
    part(u.body, boxGeo(0.06, 0.12, L * 0.6), violet, side * (W / 2 + 0.03), 0.6, -0.1);
  }
  // Icicles under the deck overhang
  for (let i = 0; i < 4 + level; i++) for (const side of [-1, 1]) part(u.body, boxGeo(0.12, 0.4, 0.12), iceMat(u, 0xe1f5fe, 0.9), side * (W / 2 + 0.3), dy - 0.2, -L / 2 + 0.5 + i * (L / (4 + level)));
  if (level >= 2 && level < 4) {
    // Radar crystal above the island
    part(u.body, boxGeo(0.5, 0.9, 0.5), violet, W / 2 - 0.05, dy + 3.4, -L * 0.1).rotation.y = Math.PI / 4;
  }
  if (level >= 3) {
    // Aurora masts streaming light
    for (const z of [-L * 0.4, L * 0.05]) {
      part(u.body, boxGeo(0.12, 2.2, 0.12), M(0xeceff1), W / 2 + 0.3, dy + 1.2, z);
      part(u.body, boxGeo(0.06, 1.2, 0.8), aurora, W / 2 + 0.3, dy + 1.6, z - 0.45);
      part(u.body, boxGeo(0.06, 0.8, 0.8), violet, W / 2 + 0.3, dy + 1.0, z - 0.45);
    }
  }
  if (level >= 4) {
    // Ice fortress on the deck: walls, corner towers, a glowing crystal spire
    const fz = -L * 0.08;
    const fx = 0.6;
    const wallM = iceMat(u, 0xb3e5fc, 0.9);
    part(u.body, boxGeo(1.8, 1.0, 2.2), wallM, fx, dy + 0.7, fz);
    for (const [x, z] of [[-0.8, -1.0], [0.8, -1.0], [-0.8, 1.0], [0.8, 1.0]]) {
      part(u.body, boxGeo(0.55, 1.8, 0.55), wallM, fx + x, dy + 1.1, fz + z);
      part(u.body, boxGeo(0.65, 0.2, 0.65), M(0xe1f5fe), fx + x, dy + 2.1, fz + z);
      part(u.body, boxGeo(0.2, 0.2, 0.2), aurora, fx + x, dy + 2.3, fz + z);
    }
    part(u.body, boxGeo(0.9, 1.0, 0.9), wallM, fx, dy + 1.7, fz);
    part(u.body, boxGeo(0.45, 1.8, 0.45), violet, fx, dy + 3.0, fz).rotation.y = Math.PI / 4;
    part(u.body, boxGeo(0.25, 0.8, 0.25), aurora, fx, dy + 4.2, fz).rotation.y = Math.PI / 4;
  }
  u.body.position.z = 0.3 - level * 0.08;
  u.tracer = 0x69f0ae;
  u.projectile = { color: 0xb3e5fc, size: 0.55, glowing: true };
  u.static = true;
  u.bob = 0.06;
  return u;
}

/**
 * Splash (0-4): a water-bomber helicopter on a wet helipad (same rig as the Cryo Helicopter).
 * White-and-blue, with a water cannon under the nose; the helicopter grows each level, Lv 3 adds
 * missile pods, Lv 4 is the big four-blade deep-blue model with glowing trim.
 */
function splash(level) {
  const u = makeThing();
  const { M } = u;
  const water = 0x29b6f6;
  part(u.body, boxGeo(4.4, 0.3, 4.4), M(0x90a4ae), 0, 0.15, 0); // pad
  part(u.body, boxGeo(3.6, 0.04, 3.6), M(0xb3e5fc), 0, 0.31, 0);
  const white = M(0xfafafa);
  part(u.body, boxGeo(0.35, 0.05, 2.0), white, -0.6, 0.34, 0); // the "H"
  part(u.body, boxGeo(0.35, 0.05, 2.0), white, 0.6, 0.34, 0);
  part(u.body, boxGeo(0.9, 0.05, 0.35), white, 0, 0.34, 0);
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) part(u.body, boxGeo(0.25, 0.25, 0.25), glowThing(u, water), x, 0.45, z);
  // Water tower tank with a level gauge
  part(u.body, boxGeo(1.0, 1.4 + level * 0.2, 1.0), M(0x0277bd), 1.8, 1.0 + level * 0.1, -1.8);
  part(u.body, boxGeo(0.12, 1.0 + level * 0.2, 0.06), glowThing(u, 0x80d8ff), 1.8, 1.0 + level * 0.1, -1.27);
  if (level >= 2) for (const z of [1.3, 1.9]) part(u.body, boxGeo(1.0, 0.45, 0.5), M(0x4fc3f7), -1.7, 0.5, z); // water barrels
  const big = level >= 4;
  const hl = [0, 1, 2, 4, 5][level];
  const { heli, muzzles } = makeHeli(u, hl, true, { color: big ? 0x01579b : 0xfafafa, trim: big ? 0x40c4ff : 0x0288d1 });
  const bank = heli.userData.bank;
  bank.scale.setScalar([0.9, 0.97, 1.05, 1.15, 1.3][level]);
  // Water cannon under the nose, a belly tank and a hose
  part(bank, boxGeo(1.6, 0.8, 2.4), M(big ? 0x0288d1 : 0x1e88e5), 0, -1.6, 0.2); // belly tank
  part(bank, boxGeo(1.62, 0.15, 0.6), glowThing(u, water), 0, -1.45, 0.2);
  const cannon = new THREE.Group();
  cannon.position.set(0, -1.6, 2.2);
  bank.add(cannon);
  part(cannon, boxGeo(0.7, 0.7, 0.8), M(0x37474f), 0, 0, 0);
  const nl = 1.4 + level * 0.25;
  part(cannon, boxGeo(0.35, 0.35, nl), M(0xb0bec5), 0, 0, 0.4 + nl / 2);
  part(cannon, boxGeo(0.45, 0.45, 0.15), glowThing(u, water), 0, 0, 0.45 + nl);
  const m = new THREE.Object3D();
  m.position.set(0, 0, 0.6 + nl);
  cannon.add(m);
  u.plane = heli;
  u.heli = true;
  u.muzzles = [m, ...muzzles];
  u.spin = u.spin ?? null;
  u.flyHeight = 13;
  u.tracer = 0x4fc3f7;
  u.tracerWidth = 0.4 + level * 0.08;
  return u;
}

/**
 * Ghostbuster (0-5): a ghost hunter in an orange jumpsuit with a chunky green plasma pack and a
 * beam wand. Lv 1 goggles, Lv 2 a bigger pack with an antenna, Lv 3 a ghost trap on the belt,
 * Lv 4 shoulder emitters and a yellow-hot beam, Lv 5 a gold pack with big glowing tanks.
 */
function ghostbuster(level) {
  const beam = [0x76ff03, 0x76ff03, 0x9cff57, 0xc6ff00, 0xeeff41, 0xffea00][level];
  const h = makeHumanoid({ skin: 0xd7a17b, shirt: 0xef6c00, pants: 0xe65100, arms: 0xef6c00 });
  const { M } = h;
  const plasma = glow(h, beam);
  const packC = level >= 5 ? M(0xffc107) : M(0x2e7d32);
  const metal = M(0x546e7a);
  // Jumpsuit details: belt, badge, boots
  part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.75, 0);
  part(h.torso, boxGeo(0.45, 0.45, 0.1), M(0xfafafa), 0.55, 0.45, 0.52);
  part(h.torso, boxGeo(0.3, 0.3, 0.12), plasma, 0.55, 0.45, 0.55);
  for (const leg of [h.leftLeg, h.rightLeg]) part(leg, boxGeo(1.1, 0.5, 1.15), M(0x212121), 0, -1.75, 0.05);
  // Short messy hair
  part(h.head, boxGeo(1.3, 0.35, 1.3), M(0x4e342e), 0, 1.3, -0.03);
  // Plasma pack
  const pw = 1.8 + (level >= 2 ? 0.3 : 0);
  const ph = 2.0 + (level >= 2 ? 0.4 : 0);
  part(h.torso, boxGeo(pw, ph, 1.0), packC, 0, 0.1, -1.0);
  part(h.torso, boxGeo(pw * 0.8, 0.3, 1.05), metal, 0, -0.6, -1.0);
  const cells = 2 + Math.min(level, 3);
  for (let i = 0; i < cells; i++) part(h.torso, boxGeo(0.22, ph * 0.5, 0.1), plasma, (i - (cells - 1) / 2) * 0.35, 0.3, -1.52);
  part(h.torso, boxGeo(0.6, 0.6, 0.6), metal, -pw / 2 + 0.2, -0.7, -1.0); // cyclotron cap
  part(h.torso, boxGeo(0.3, 0.3, 0.3), plasma, -pw / 2 + 0.2, -0.7, -0.68);
  // Hose from the pack to the wand
  part(h.torso, boxGeo(0.25, 0.25, 1.3), M(0x212121), -1.0, -0.7, -0.3);
  if (level >= 1) {
    // Goggles
    part(h.head, boxGeo(1.3, 0.15, 0.1), M(0x212121), 0, 0.85, 0.63);
    for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.38, 0.3, 0.1), glow(h, 0xffd740), x, 0.85, 0.68);
  }
  if (level >= 2) {
    // Antenna with a blinking tip
    part(h.torso, boxGeo(0.1, 1.6, 0.1), M(0x212121), pw / 2 - 0.2, 1.8, -1.0);
    part(h.torso, boxGeo(0.22, 0.22, 0.22), glow(h, 0xff1744), pw / 2 - 0.2, 2.65, -1.0);
  }
  if (level >= 3) {
    // Ghost trap on the belt
    part(h.torso, boxGeo(0.7, 0.4, 0.5), M(0x37474f), 1.2, -0.85, 0.3);
    part(h.torso, boxGeo(0.72, 0.08, 0.3), glow(h, 0xffd740), 1.2, -0.62, 0.3);
  }
  if (level >= 4) {
    // Shoulder emitters
    for (const x of [-1.3, 1.3]) {
      part(h.torso, boxGeo(0.7, 0.4, 1.2), metal, x, 1.05, 0);
      part(h.torso, boxGeo(0.3, 0.3, 0.1), plasma, x, 1.05, 0.62);
    }
  }
  if (level >= 5) {
    // Twin plasma tanks on top of the pack
    for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.55, 1.1, 0.55), plasma, x, ph / 2 + 0.6, -1.0);
    part(h.torso, boxGeo(1.6, 0.2, 0.7), M(0xffc107), 0, ph / 2 + 1.2, -1.0);
  }
  // Beam wand
  const len = 1.6 + level * 0.12;
  const gun = holdLongGun(h, len, M(0x37474f));
  part(gun, boxGeo(0.5, 0.6, 0.55), packC, 0, -0.3, 0);
  const rings = 1 + Math.ceil(level / 2);
  for (let i = 0; i < rings; i++) part(gun, boxGeo(0.5, 0.1, 0.55), plasma, 0, -0.8 - i * 0.3, 0);
  part(gun, boxGeo(0.4, 0.3, 0.45), plasma, 0, -len, 0);
  part(gun, boxGeo(0.15, 0.5, 0.3), M(0xfdd835), 0, -0.6, 0.35); // grip
  h.muzzles[0].position.y = -len - 0.15;
  h.beam = beam;
  h.tracer = beam;
  return h;
}

/**
 * Gift Elf (0-4): a Christmas elf in a red tunic with white fur trim, throwing presents. The gift
 * sack on its back grows every level. Lv 2 a candy cane, Lv 3 jingle bells, Lv 4 a golden glowing
 * present and a star on the hat.
 */
function giftElf(level) {
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: 0xc62828, pants: 0x1b5e20, arms: 0xc62828 });
  const { M } = h;
  const white = M(0xfafafa);
  const green = M(0x2e7d32);
  part(h.torso, boxGeo(2.1, 0.3, 1.1), white, 0, -0.85, 0); // fur hem
  part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x212121), 0, -0.45, 0); // belt
  part(h.torso, boxGeo(0.4, 0.35, 0.1), M(0xffd54f), 0, -0.45, 0.56);
  for (const leg of [h.leftLeg, h.rightLeg]) {
    part(leg, boxGeo(1.05, 0.5, 1.4), M(0x1b5e20), 0, -1.75, 0.2); // curly shoes
    part(leg, boxGeo(0.4, 0.4, 0.3), M(0xffd54f), 0, -1.45, 0.85);
  }
  for (const x of [-0.7, 0.7]) part(h.head, boxGeo(0.15, 0.5, 0.25), M(0xf1c27d), x, 0.7, 0).rotation.z = x > 0 ? -0.5 : 0.5;
  // Floppy hat: green cone with red bands and a white bobble
  part(h.head, boxGeo(1.35, 0.3, 1.35), white, 0, 1.25, 0);
  for (let i = 0; i < 4; i++) part(h.head, boxGeo(1.0 - i * 0.2, 0.42, 1.0 - i * 0.2), i % 2 ? M(0xc62828) : green, 0.1 * i, 1.6 + i * 0.38, -0.12 * i);
  part(h.head, boxGeo(0.38, 0.38, 0.38), level >= 4 ? glow(h, 0xffd740) : white, 0.45, 3.1, -0.5);
  // Gift sack, bigger every level
  const ss = 1.1 + level * 0.3;
  part(h.torso, boxGeo(ss * 1.2, ss * 1.3, ss * 0.85), M(0x8b1a1a), 0, 0.1 + ss * 0.15, -0.6 - ss * 0.45);
  part(h.torso, boxGeo(ss * 0.6, 0.2, ss * 0.5), M(0xffd54f), 0, 0.1 + ss * 0.8, -0.6 - ss * 0.45); // tie
  const gifts = [[0x1e88e5, 0xffeb3b], [0x43a047, 0xc62828], [0xffd54f, 0xc62828], [0x8e24aa, 0xfafafa], [0xfafafa, 0x43a047]];
  for (let i = 0; i <= level; i++) {
    const [c, r] = gifts[i];
    const g = present(h, h.torso, c, r, 0.45 + level * 0.04);
    g.position.set((i - level / 2) * 0.5, 0.35 + ss * 0.95 + (i % 2) * 0.2, -0.6 - ss * 0.45);
    g.rotation.y = i * 0.5;
  }
  if (level >= 2) {
    // Candy cane on the belt
    const red = M(0xd32f2f);
    for (let i = 0; i < 4; i++) part(h.torso, boxGeo(0.2, 0.3, 0.2), i % 2 ? red : white, 1.15, -0.5 - i * 0.3, 0.3);
    part(h.torso, boxGeo(0.4, 0.2, 0.2), red, 1.0, -0.3, 0.3);
  }
  if (level >= 3) {
    // Jingle bell collar
    part(h.torso, boxGeo(2.15, 0.3, 1.15), green, 0, 0.9, 0);
    for (const x of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.25, 0.25, 0.25), glow(h, 0xffd740), x, 0.65, 0.6);
  }
  // The present in the raised right hand
  const hand = new THREE.Group();
  hand.position.set(0, -2.2, 0);
  h.rightArm.add(hand);
  const top = level >= 4;
  const p = present(h, hand, top ? 0xffc107 : 0x43a047, top ? 0xc62828 : 0xfafafa, 0.6 + level * 0.1);
  if (top) part(p, boxGeo(0.7, 0.7, 0.7), glow(h, 0xffd740), 0, 0, 0);
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-0.6, 0, -0.3);
  h.pose = { right: -2.8, left: -0.6, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = top ? { color: 0xffc107, size: 0.65, arc: 5, glowing: true } : { color: 0x43a047, size: 0.5 + level * 0.03, arc: 4.5 };
  h.tracer = 0xffd740;
  return h;
}

/** Stormwing fighter: storm-grey jet with lightning stripes; bomb racks from Lv 1. */
function makeStormPlane(h, level) {
  const { M } = h;
  const plane = new THREE.Group();
  const bank = new THREE.Group();
  plane.add(bank);
  const muzzles = [];
  const missiles = [];
  const point = (x, y, z, list) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    bank.add(m);
    list.push(m);
  };
  bank.scale.setScalar(1 + level * 0.08);
  const body = M([0x78909c, 0x607d8b, 0x546e7a, 0x455a64, 0x263238][level]);
  const dark = M(0x263238);
  const bolt = glow(h, level >= 4 ? 0x80d8ff : 0xffeb3b);
  part(bank, boxGeo(1.1, 1.0, 5.8), body, 0, 0, 0);
  part(bank, boxGeo(0.6, 0.6, 1.1), dark, 0, -0.05, 3.4);
  part(bank, boxGeo(0.8, 0.45, 1.4), glow(h, 0x4fc3f7), 0, 0.6, 1.2);
  for (const side of [-1, 1]) {
    const w = part(bank, boxGeo(3.4, 0.15, 2.0), body, side * 2.0, -0.1, -0.4);
    w.rotation.y = side * 0.45;
    // Lightning zigzag along the wing
    for (let k = 0; k < 3; k++) part(bank, boxGeo(0.9, 0.05, 0.16), bolt, side * (1.0 + k * 0.8), 0.02, 0.15 - k * 0.45 + (k % 2) * 0.2).rotation.y = side * (k % 2 ? -0.7 : 0.7);
    part(bank, boxGeo(0.12, 1.2, 1.1), dark, side * 0.5, 0.8, -2.5).rotation.z = side * -0.3;
    part(bank, boxGeo(1.4, 0.12, 0.8), body, side * 1.0, 0, -2.7);
    if (level >= 1) {
      // Bomb racks
      const racks = level >= 3 ? 2 : 1;
      for (let r = 0; r < racks; r++) {
        part(bank, boxGeo(0.2, 0.15, 1.0), dark, side * (1.4 + r * 0.8), -0.25, -0.1 - r * 0.4);
        part(bank, boxGeo(0.4, 0.4, 1.0), M(0x37474f), side * (1.4 + r * 0.8), -0.55, -0.1 - r * 0.4);
        part(bank, boxGeo(0.42, 0.1, 0.2), bolt, side * (1.4 + r * 0.8), -0.55, -0.45 - r * 0.4);
      }
    }
    if (level >= 2) part(bank, boxGeo(0.2, 0.2, 1.0), glow(h, 0x80d8ff), side * 3.4, -0.1, -1.4); // tesla wingtips
    if (level >= 3) {
      part(bank, boxGeo(0.45, 0.45, 1.5), dark, side * 0.95, -0.35, 0.6); // missile pods
      part(bank, boxGeo(0.3, 0.3, 0.1), glow(h, 0xff3d00), side * 0.95, -0.35, 1.36);
      point(side * 0.95, -0.35, 1.4, missiles);
    }
  }
  // Nose lightning stripe
  part(bank, boxGeo(1.12, 0.12, 0.9), bolt, 0, 0.1, 2.2).rotation.y = 0.5;
  const engines = level >= 3 ? [-0.35, 0.35] : [0];
  for (const x of engines) part(bank, boxGeo(engines.length > 1 ? 0.5 : 0.75, 0.6, 0.3), glow(h, 0x40c4ff), x, 0, -3.0);
  if (level >= 4) {
    // Storm core on the spine with a crackling crown
    part(bank, boxGeo(0.7, 0.6, 1.6), glow(h, 0x80d8ff), 0, 0.75, -0.9);
    for (const z of [-1.4, -0.9, -0.4]) part(bank, boxGeo(0.08, 0.6, 0.08), bolt, 0, 1.25, z);
  }
  point(-0.6, -0.2, 2.6, muzzles);
  point(0.6, -0.2, 2.6, muzzles);
  const bay = new THREE.Object3D();
  bay.position.set(0, -0.8, 0);
  bank.add(bay);
  plane.userData = { bank, prop: null, bay, missiles };
  return { plane, muzzles };
}

/** Stormwing (0-4): a storm pilot on a runway pad, plus the storm fighter flying circles. */
function stormwing(level) {
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: 0x455a64, pants: 0x37474f, arms: 0x455a64 });
  const { M } = h;
  const bolt = level >= 4 ? 0x80d8ff : 0xffeb3b;
  part(h.head, boxGeo(1.45, 1.4, 1.45), M(0x607d8b), 0, 0.65, -0.03); // flight helmet
  part(h.head, boxGeo(1.2, 0.45, 0.08), glow(h, bolt), 0, 0.7, 0.7); // visor
  part(h.head, boxGeo(0.2, 0.7, 0.2), glow(h, bolt), 0, 1.35, 0).rotation.z = 0.5; // bolt crest
  part(h.torso, boxGeo(0.25, 1.0, 0.1), glow(h, bolt), -0.5, 0.2, 0.52).rotation.z = 0.4; // bolt patch
  if (level >= 1) part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x212121), 0, -0.7, 0);
  if (level >= 2) part(h.head, boxGeo(0.08, 0.9, 0.08), M(0x212121), -0.7, 1.6, -0.2);
  if (level >= 3) for (const x of [-1.4, 1.4]) part(h.torso, boxGeo(0.8, 0.4, 1.2), M(0x263238), x, 1.0, 0);
  // Runway pad with stripes, and a bomb cart from Lv 1
  part(h.root, boxGeo(3.8, 0.08, 1.1), M(0x37474f), 0, 0.04, -1.6);
  for (const x of [-1.2, 0, 1.2]) part(h.root, boxGeo(0.6, 0.1, 0.2), glow(h, bolt), x, 0.06, -1.6);
  if (level >= 1) {
    part(h.root, boxGeo(1.6, 0.5, 1.0), M(0x455a64), 1.9, 0.25, 0.8);
    for (const z of [0.55, 1.05]) part(h.root, boxGeo(1.2, 0.45, 0.45), M(0x263238), 1.9, 0.7, z);
  }
  h.rightArm.rotation.set(Math.PI * 0.85, 0, 0.25);
  h.pose = { right: Math.PI * 0.85, left: 0, leftRecoil: 0 };
  const { plane, muzzles } = makeStormPlane(h, level);
  h.plane = plane;
  h.muzzles = muzzles;
  h.flyHeight = 13;
  h.tracer = bolt;
  return h;
}

/**
 * Punkbuster (0-4): a pumpkin-headed punk brawler on a little stage, purple mohawk, spiked black
 * jacket and a chunky launcher. Lv 1 speakers, Lv 2 spiked bracers and a chain, Lv 3 a glowing
 * launcher, Lv 4 an amp wall, green pumpkin flames and a spiked crown.
 */
function punkbuster(level) {
  const h = makeHumanoid({ skin: 0x4e342e, shirt: 0x1a1a1a, pants: 0x4a148c, arms: 0x1a1a1a });
  const { M } = h;
  const orange = M(0xff6d00);
  const purple = level >= 3 ? glow(h, 0xd500f9) : M(0x8e24aa);
  const silver = M(0xcfd8dc);
  const flame = level >= 4 ? 0x76ff03 : 0xffab00;
  // Stage
  part(h.root, boxGeo(4.2, 0.5, 3.0), M(0x212121), 0, 0.25, -0.2);
  part(h.root, boxGeo(4.25, 0.12, 0.1), glow(h, 0xff6d00), 0, 0.4, 1.31);
  for (const x of [-1.4, 0, 1.4]) part(h.root, boxGeo(0.3, 0.12, 0.12), glow(h, 0xd500f9), x, 0.25, 1.31);
  h.body.position.y = 0.5;
  h.lift = 0.5;
  h.bob = 0.04;
  // Pumpkin head with a mohawk
  const pk = pumpkin(h, h.head, 1.5, flame);
  pk.position.set(0, 0.6, 0);
  const spikes = 4 + level;
  for (let i = 0; i < spikes; i++) part(h.head, boxGeo(0.2, 0.5 + (i % 2) * 0.2 + level * 0.06, 0.3), purple, 0, 1.55, 0.55 - (i * 1.2) / spikes);
  // Spiked jacket
  part(h.torso, boxGeo(2.1, 2.05, 1.1), M(0x111111), 0, 0, 0);
  part(h.torso, boxGeo(0.7, 1.6, 0.1), M(0x6a1b9a), 0, -0.1, 0.56); // shirt underneath
  part(h.torso, boxGeo(0.4, 0.4, 0.06), orange, 0, 0.1, 0.62); // pumpkin patch
  for (const x of [-1, 1]) for (let k = 0; k < 3; k++) part(h.torso, boxGeo(0.15, 0.35, 0.15), silver, x * (0.65 + k * 0.2), 1.15, 0);
  part(h.torso, boxGeo(2.1, 0.25, 1.15), M(0x5d4037), 0, -0.8, 0); // studded belt
  for (const x of [-0.6, -0.2, 0.2, 0.6]) part(h.torso, boxGeo(0.12, 0.12, 0.06), silver, x, -0.8, 0.6);
  for (const leg of [h.leftLeg, h.rightLeg]) part(leg, boxGeo(1.1, 0.7, 1.2), M(0x212121), 0, -1.65, 0.05); // boots
  if (level >= 1) {
    // Speaker stacks
    for (const x of [-1.8, 1.8]) {
      part(h.root, boxGeo(0.9, 1.4, 0.8), M(0x1a1a1a), x, 1.2, -1.1);
      for (const y of [0.85, 1.55]) part(h.root, boxGeo(0.5, 0.5, 0.06), M(0x424242), x, y, -0.68);
    }
  }
  if (level >= 2) {
    // Spiked bracers and a wallet chain
    for (const arm of [h.leftArm, h.rightArm]) {
      part(arm, boxGeo(1.15, 0.6, 1.15), M(0x212121), 0, -1.4, 0);
      for (const x of [-0.6, 0.6]) part(arm, boxGeo(0.25, 0.15, 0.15), silver, x, -1.4, 0);
    }
    for (let k = 0; k < 4; k++) part(h.torso, boxGeo(0.12, 0.12, 0.12), silver, 0.9 - k * 0.12, -1.0 - (k % 2) * 0.1, 0.56);
  }
  if (level >= 4) {
    // Amp wall and a spiked crown of flames
    part(h.root, boxGeo(3.8, 1.8, 0.7), M(0x1a1a1a), 0, 1.4, -1.6);
    boxRow(h.root, 4, 0.9, boxGeo(0.6, 0.6, 0.06), glow(h, 0xd500f9), 1.4, -1.23);
    for (let i = 0; i < 5; i++) part(h.head, boxGeo(0.22, 0.45, 0.22), glow(h, flame), (i - 2) * 0.32, 1.45, 0.55);
  }
  // Launcher (fires summons)
  const len = 1.7 + level * 0.15;
  const gun = holdLongGun(h, len, M(0x37474f));
  part(gun, boxGeo(0.7, len * 0.7, 0.75), orange, 0, -len * 0.55, 0); // drum tube
  part(gun, boxGeo(0.8, 0.15, 0.85), purple, 0, -len + 0.1, 0);
  part(gun, boxGeo(0.25, 0.5, 0.3), M(0x212121), 0, -0.4, 0.45); // grip
  if (level >= 3) part(gun, boxGeo(0.5, 0.5, 0.5), glow(h, flame), 0, -len - 0.05, 0);
  h.muzzles[0].position.y = -len - 0.2;
  h.tracer = level >= 3 ? 0xd500f9 : 0xff6d00;
  h.projectile = { color: level >= 4 ? 0x76ff03 : 0xff6d00, size: 0.55 + level * 0.04, arc: 4, ...(level >= 3 ? { glowing: true } : {}) };
  return h;
}

/* ------------------------------------------------------------------ flying units */

// The Jet Trooper's planes and the Borealis frost planes are built with the vehicle kit (airunits.js).

function jpara(count = 1) {
  // Paratroopers: soldiers in jump gear with a packed chute and a rifle.
  const u = newUnit();
  return squad(u, count, () => {
    const h = makeHumanoid({ skin: 0xe0ac69, shirt: 0x556b2f, pants: 0x4b5a30, arms: 0x556b2f, face: 'soldier' });
    const { M } = h;
    part(h.head, boxGeo(1.45, 0.6, 1.45), M(0x4b5320), 0, 1.3, 0);
    part(h.head, boxGeo(1.3, 0.1, 0.1), M(0x212121), 0, 1.0, 0.66); // chin strap line
    part(h.torso, boxGeo(1.7, 1.6, 0.8), M(0x8d7b5a), 0, 0.1, -0.9); // chute pack
    part(h.torso, boxGeo(1.75, 0.2, 0.85), M(0x3e2723), 0, 0.5, -0.9);
    for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.2, 2.0, 0.1), M(0x3e2723), x, 0, 0.52); // harness
    holdLongGun(h, 1.8, M(0x2b2b2b));
    h.tracer = 0xffc107;
    return h;
  });
}

/* ------------------------------------------------------------------ punk units */

function punk(shirt, hair) {
  const h = makeHumanoid({ skin: 0xf1c27d, shirt, pants: 0x263238, arms: shirt });
  const { M } = h;
  for (let i = 0; i < 4; i++) part(h.head, boxGeo(0.22, 0.6, 0.3), M(hair), 0, 1.45, 0.45 - i * 0.32); // mohawk
  for (const x of [-1, 1]) part(h.torso, boxGeo(0.15, 0.3, 0.15), M(0xcfd8dc), x * 0.8, 1.1, 0); // spikes
  for (const leg of [h.leftLeg, h.rightLeg]) part(leg, boxGeo(1.1, 0.6, 1.15), M(0x111111), 0, -1.7, 0.05);
  return h;
}

function pfragger(count = 1) {
  const u = newUnit();
  return squad(u, count, () => {
    const h = punk(0x1a1a1a, 0x76ff03);
    const { M } = h;
    part(h.torso, boxGeo(2.1, 0.25, 1.1), M(0x4e5b31), 0, 0.3, 0).rotation.z = 0.5; // grenade bandolier
    const hand = new THREE.Group();
    hand.position.set(0, -2.2, 0);
    h.rightArm.add(hand);
    part(hand, boxGeo(0.55, 0.65, 0.55), M(0x33691e), 0, -0.2, 0);
    part(hand, boxGeo(0.15, 0.2, 0.15), glow(h, 0xff3d00), 0, 0.2, 0);
    setMuzzle(h, hand, 0, -0.3, 0);
    h.rightArm.rotation.set(-2.6, 0, 0.2);
    h.tracer = 0xffab40;
    h.projectile = { color: 0x33691e, size: 0.45, arc: 4 };
    return h;
  });
}

function pboogie(count = 1) {
  // Boogeyman: a tall shadowy figure in a ragged cloak with long claws and glowing eyes.
  const u = newUnit();
  return squad(u, count, () => {
    const h = makeHumanoid({ skin: 0x1a1a24, shirt: 0x12121a, pants: 0x12121a, arms: 0x12121a, face: 'void' });
    const { M } = h;
    h.size = 1.25;
    part(h.torso, boxGeo(2.3, 3.4, 1.3), M(0x1c1028), 0, -0.6, -0.05); // cloak
    for (const x of [-0.9, -0.3, 0.3, 0.9]) part(h.torso, boxGeo(0.4, 0.5, 1.3), M(0x1c1028), x, -2.5 + (x > 0 ? 0.2 : 0), -0.05); // ragged hem
    part(h.head, boxGeo(1.5, 1.5, 1.5), M(0x1c1028), 0, 0.75, -0.15); // hood
    for (const x of [-0.25, 0.25]) part(h.head, boxGeo(0.25, 0.15, 0.08), glow(h, 0xd500f9), x, 0.7, 0.62);
    for (const arm of [h.leftArm, h.rightArm]) for (const x of [-0.3, 0, 0.3]) part(arm, boxGeo(0.12, 0.8, 0.12), M(0x9e9e9e), x, -2.3, 0.3); // claws
    const m = new THREE.Object3D();
    m.position.set(0, -2.5, 0.3);
    h.rightArm.add(m);
    h.muzzles = [m];
    h.rightArm.rotation.set(-1.2, 0, 0.2);
    h.leftArm.rotation.set(-1.0, 0, -0.2);
    h.tracer = 0xd500f9;
    return h;
  });
}

function procketeer(count = 1) {
  const u = newUnit();
  return squad(u, count, () => {
    const h = punk(0x4a148c, 0xff4081);
    const { M } = h;
    // Shoulder rocket launcher
    const tube = new THREE.Group();
    tube.position.set(-1.5, 1.3, 0);
    h.torso.add(tube);
    part(tube, boxGeo(0.6, 0.6, 2.6), M(0x33691e), 0, 0, 0.2);
    part(tube, boxGeo(0.7, 0.7, 0.2), M(0x212121), 0, 0, 1.5);
    part(tube, boxGeo(0.35, 0.35, 0.1), glow(h, 0xff3d00), 0, 0, 1.6);
    part(tube, boxGeo(0.3, 0.4, 0.3), M(0x212121), 0, -0.45, 0.3);
    const m = new THREE.Object3D();
    m.position.set(0, 0, 1.7);
    tube.add(m);
    h.muzzles = [m];
    h.rightArm.rotation.set(-1.4, 0, 0);
    h.tracer = 0xff6d00;
    h.projectile = { color: 0x33691e, size: 0.4 };
    return h;
  });
}

function pnucleus(count = 1) {
  // Nucleus: a huge brute in a cracked hazmat suit with a glowing reactor in his chest.
  const u = newUnit();
  return squad(u, count, () => {
    const h = makeHumanoid({ skin: 0x9ccc65, shirt: 0xfdd835, pants: 0x827717, arms: 0x9ccc65, face: 'zombie' });
    const { M } = h;
    h.size = 1.8;
    const nuke = glow(h, 0x76ff03);
    part(h.torso, boxGeo(2.5, 2.3, 1.4), M(0xfbc02d), 0, 0.1, 0); // bulky suit
    part(h.torso, boxGeo(1.0, 1.0, 0.2), nuke, 0, 0.3, 0.75); // reactor core
    part(h.torso, boxGeo(0.4, 0.4, 0.1), M(0x212121), 0, 0.3, 0.87);
    for (const x of [-1, 1]) part(h.torso, boxGeo(0.9, 0.6, 1.5), M(0x424242), x * 1.4, 1.0, 0); // shoulder plates
    for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.5, 1.4, 0.5), nuke, x, 0.4, -0.95); // fuel rods
    part(h.head, boxGeo(0.9, 0.3, 0.1), nuke, 0, 0.75, 0.62); // glowing eyes band
    for (const arm of [h.leftArm, h.rightArm]) part(arm, boxGeo(1.3, 0.9, 1.3), M(0x424242), 0, -1.7, 0); // huge fists
    const m = new THREE.Object3D();
    m.position.set(0, -2.3, 0.2);
    h.rightArm.add(m);
    h.muzzles = [m];
    h.rightArm.rotation.set(-0.8, 0, 0.1);
    h.tracer = 0x76ff03;
    return h;
  });
}

/* ------------------------------------------------------------------ Borealis units */

function bsleigh() {
  // Sleigh: a flying red-and-gold sleigh pulled by two blocky reindeer, gift pile on the back.
  const u = newUnit();
  const { M } = u;
  const g = u.body;
  const red = M(0xc62828);
  const gold = M(0xffc107);
  part(g, boxGeo(2.2, 1.2, 3.2), red, 0, 0.6, -1.0);
  part(g, boxGeo(2.2, 1.0, 0.6), red, 0, 1.0, 0.7); // curled front
  part(g, boxGeo(2.3, 0.15, 3.3), gold, 0, 1.25, -1.0);
  for (const x of [-1.0, 1.0]) {
    part(g, boxGeo(0.15, 0.15, 4.0), glowThing(u, 0x80d8ff), x, -0.2, -0.6); // glowing runners
    part(g, boxGeo(0.15, 0.5, 0.15), gold, x, 0.1, 1.2);
  }
  part(g, boxGeo(1.6, 0.8, 1.2), M(0x1b5e20), 0, 1.6, -1.6); // gift pile
  part(g, boxGeo(0.7, 0.7, 0.7), M(0x1e88e5), -0.4, 2.2, -1.4);
  part(g, boxGeo(0.6, 0.6, 0.6), M(0xffd740), 0.45, 2.1, -1.8);
  // Reindeer
  for (const x of [-0.7, 0.7]) {
    const b = M(0x795548);
    part(g, boxGeo(0.7, 0.8, 1.8), b, x, 0.8, 3.0);
    for (const dz of [-0.6, 0.6]) part(g, boxGeo(0.2, 0.7, 0.2), b, x, 0.1, 3.0 + dz);
    part(g, boxGeo(0.5, 0.5, 0.7), b, x, 1.4, 4.0);
    part(g, boxGeo(0.18, 0.18, 0.1), glowThing(u, 0xff1744), x, 1.35, 4.38); // red nose
    part(g, boxGeo(0.6, 0.5, 0.08), M(0xd7ccc8), x, 1.9, 3.9); // antlers
    part(g, boxGeo(0.06, 0.06, 1.6), gold, x, 0.9, 1.6); // reins
  }
  gunMuzzle(u, g, 0, 1.0, 1.1);
  u.height = 2.6;
  u.fly = 9;
  u.noTurn = true; // aircraft fly straight on; they don't swing round to shoot (views.js)
  u.tracer = 0xffd740;
  u.projectile = { color: 0xc62828, size: 0.5 };
  return u;
}

function bfortress() {
  // Ice Fortress: a floating castle of ice on a hover base, with crystal cannons.
  const u = newUnit();
  const { M } = u;
  const g = u.body;
  const ice = iceMat(u, 0x81d4fa, 0.9);
  const wall = M(0xb3e5fc);
  const aurora = glowThing(u, 0x69f0ae);
  const violet = glowThing(u, 0xb388ff);
  part(g, boxGeo(5, 1.2, 5), ice, 0, 0, 0); // floating base
  part(g, boxGeo(3.4, 1.0, 3.4), ice, 0, -1.0, 0);
  part(g, boxGeo(1.6, 1.0, 1.6), violet, 0, -1.8, 0); // hover crystal
  part(g, boxGeo(4.4, 1.6, 4.4), wall, 0, 1.4, 0);
  for (const [x, z] of [[-2.1, -2.1], [2.1, -2.1], [-2.1, 2.1], [2.1, 2.1]]) {
    part(g, boxGeo(1.1, 3.2, 1.1), wall, x, 2.0, z);
    part(g, boxGeo(1.3, 0.3, 1.3), M(0xe1f5fe), x, 3.7, z);
    part(g, boxGeo(0.4, 0.4, 0.4), aurora, x, 4.1, z);
  }
  part(g, boxGeo(2.2, 2.6, 2.2), wall, 0, 3.4, 0); // keep
  part(g, boxGeo(0.8, 2.4, 0.8), violet, 0, 5.8, 0).rotation.y = Math.PI / 4;
  part(g, boxGeo(4.5, 0.2, 0.1), aurora, 0, 1.6, 2.21);
  // Crystal cannons on the front
  for (const x of [-1.1, 1.1]) {
    part(g, boxGeo(0.5, 0.5, 1.8), M(0x0288d1), x, 1.4, 2.8);
    part(g, boxGeo(0.35, 0.35, 0.2), aurora, x, 1.4, 3.75);
    gunMuzzle(u, g, x, 1.4, 3.9);
  }
  u.height = 6;
  u.fly = 12;
  u.noTurn = true; // aircraft fly straight on; they don't swing round to shoot (views.js)
  u.tracer = 0x69f0ae;
  u.tracerWidth = 0.35;
  return u;
}

/* ------------------------------------------------------------------ exports */

export const TOWER_MODELS_D = { eldritch, valkyr, squadron, splash, ghostbuster, giftElf, stormwing, punkbuster, borealis };

export const UNIT_MODELS_D = {
  jpara,
  pfragger,
  pboogie,
  procketeer,
  pnucleus,
  bsleigh,
  bfortress,
};
