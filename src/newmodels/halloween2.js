import * as THREE from 'three';
import { boxGeo, part, glow, cylGeo } from '../models.js';

// Halloween Night 2 enemy looks (2026-11-11, see src/halloween2.js). makeZombie builds the humanoid
// body, then hw2Parts dresses it by `def.hw2`. The creatures (def.model 'h2...') are built in
// halloween2b.js. Helpers from models.js are only called inside functions (models.js imports this).
// Humanoid layout: torso box 2 x 2 x 1 centred at y 3, head group at y 4 (head box 1.2, centre
// 0.6 up), arm groups hang from y 4 (right arm at x -1.5), leg groups from y 2 (each limb 2 long,
// down local -y). Characters face +Z. With an arm swung forward (rotation.x = -PI/2), its local
// +Z points up, so a thing held in the hand sits near (0, -2.1, z).
// Looks with their own way of moving set `h.anim`; the rest get the rig's walk (visuals.js).

export { H2_CREATURES } from './halloween2b.js';

// ---------------------------------------------------------------- small kit (also used by halloween2b.js)

const GEO = new Map();
const geo = (key, make) => {
  let g = GEO.get(key);
  if (!g) GEO.set(key, (g = make()));
  return g;
};
export const sph = (r, w = 12, hh = 9) => geo(`s${r}|${w}|${hh}`, () => new THREE.SphereGeometry(r, w, hh));
export const cone = (r, len, seg = 8) => geo(`c${r}|${len}|${seg}`, () => new THREE.ConeGeometry(r, len, seg));
export const torus = (r, t, seg = 20) => geo(`t${r}|${t}|${seg}`, () => new THREE.TorusGeometry(r, t, 6, seg));
export const B = (p, w, h, d, m, x = 0, y = 0, z = 0) => part(p, boxGeo(w, h, d), m, x, y, z);
export const S = (p, r, m, x = 0, y = 0, z = 0) => part(p, sph(r), m, x, y, z);
export const C = (p, rt, rb, len, m, x = 0, y = 0, z = 0, seg = 10) => part(p, cylGeo(rt, rb, len, seg), m, x, y, z);
export const K = (p, r, len, m, x = 0, y = 0, z = 0, seg = 8) => part(p, cone(r, len, seg), m, x, y, z);
/** A new empty group inside `p`. */
export function grp(p, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  return g;
}

/** Material makers for one model: plain (one per color), glowing, and see-through. */
export function mats(h) {
  const plain = new Map();
  const glows = new Map();
  const P = (c) => {
    if (!plain.has(c)) plain.set(c, h.M(c));
    return plain.get(c);
  };
  const G = (c, i = 0.8) => {
    const k = `${c}|${i}`;
    if (!glows.has(k)) {
      const m = glow(h, c);
      m.emissiveIntensity = i;
      glows.set(k, m);
    }
    return glows.get(k);
  };
  const T = (c, op = 0.35) => {
    const m = h.M(c);
    m.transparent = true;
    m.opacity = op;
    m.depthWrite = false;
    m.userData.keepOpacity = op;
    return m;
  };
  return { P, G, T };
}

const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
/** A nail stuck in `p` at (x, y, z), its head pointing out along (dx, dy, dz). */
export function nail(p, m, x, y, z, dx, dy, dz, len = 0.7) {
  const g = grp(p, x, y, z);
  g.quaternion.setFromUnitVectors(_up, _dir.set(dx, dy, dz).normalize());
  B(g, 0.08, len, 0.08, m, 0, len / 2 - 0.2, 0);
  B(g, 0.24, 0.06, 0.24, m, 0, len - 0.2, 0);
  return g;
}

/** A round pumpkin made of lobes, centred in `p` at y. Returns its group. */
export function pumpkin(p, m, r, y = 0, rib = null) {
  const g = grp(p, 0, y, 0);
  S(g, r, m).scale.set(1, 0.82, 1);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    S(g, r * 0.6, i % 2 && rib ? rib : m, Math.sin(a) * r * 0.45, 0, Math.cos(a) * r * 0.45).scale.set(0.8, 1.3, 0.8);
  }
  return g;
}

/** A carved, glowing jack-o'-lantern face on the front of a pumpkin of size r. */
export function carvedFace(p, gm, r, y = 0, angry = false) {
  const z = r * 1.0;
  for (const s of [-1, 1]) {
    const e = B(p, r * 0.3, r * 0.3, 0.08, gm, s * r * 0.36, y + r * 0.22, z);
    e.rotation.z = Math.PI / 4 + (angry ? s * 0.35 : 0);
    if (angry) e.scale.set(1.3, 0.6, 1);
  }
  B(p, r * 0.18, r * 0.16, 0.08, gm, 0, y + 0.0, z).rotation.z = Math.PI / 4; // nose
  B(p, r * 0.95, r * 0.18, 0.08, gm, 0, y - r * 0.32, z - 0.02);
  for (const x of [-0.3, 0, 0.3]) B(p, r * 0.16, r * 0.14, 0.08, gm, x * r, y - r * 0.2, z - 0.02); // teeth gaps
}

// ---------------------------------------------------------------- walks

/** Walk the legs and pose the arms with `arms(sw, t)` (the views' usual humanoid walk). */
function walker(h, arms, stride = 0.6) {
  h.anim = (phase, t) => {
    const sw = Math.sin(phase) * stride;
    h.leftLeg.rotation.x = sw;
    h.rightLeg.rotation.x = -sw;
    arms(sw, t);
    h.body.position.y = Math.abs(Math.cos(phase)) * 0.12;
    h.body.rotation.z = Math.sin(phase * 0.5) * 0.06;
  };
}

/** Lean the top half forward by `a` round the hips, so the hips stay where they are. */
function lean(h, a) {
  h.upper.rotation.x = a;
  h.upper.position.set(0, 2 - 2 * Math.cos(a), -2 * Math.sin(a));
}

/** A hunched beast: leans forward, arms hang to the ground, head up. `more(sw, t)` adds extras. */
function beast(h, a, more = null) {
  lean(h, a);
  h.head.rotation.x = -a * 0.85;
  h.anim = (phase, t) => {
    const sw = Math.sin(phase);
    h.leftLeg.rotation.x = sw * 0.6;
    h.rightLeg.rotation.x = -sw * 0.6;
    h.rightArm.rotation.x = -a + sw * 0.55;
    h.leftArm.rotation.x = -a - sw * 0.55;
    h.body.position.y = Math.abs(Math.cos(phase)) * 0.18;
    h.upper.rotation.z = Math.sin(phase) * 0.05;
    more?.(sw, t, phase);
  };
}

// ---------------------------------------------------------------- shared outfits

/** A clown: painted face, nose, puffy hair, ruffle collar, pom-pom buttons, gloves and big shoes. */
function clown(h, X, o) {
  const { P, G } = X;
  const { torso, head } = h;
  const black = P(0x111111);
  const red = P(0xe53935);
  const white = P(0xffffff);
  // Face: diamond eyes, a round red nose and a big painted mouth.
  for (const s of [-1, 1]) {
    B(head, 0.34, 0.34, 0.04, P(o.paint), s * 0.26, 0.76, 0.6).rotation.z = Math.PI / 4;
    B(head, 0.13, 0.13, 0.06, black, s * 0.26, 0.76, 0.63);
  }
  S(head, 0.17, red, 0, 0.55, 0.68);
  const mouth = o.sad ? -1 : 1;
  B(head, 0.55, 0.1, 0.05, red, 0, 0.28, 0.61);
  for (const s of [-1, 1]) B(head, 0.24, 0.09, 0.05, red, s * 0.34, 0.28 + mouth * 0.07, 0.61).rotation.z = s * mouth * 0.6;
  if (o.sad) {
    B(head, 0.1, 0.22, 0.05, G(0x40c4ff, 0.6), -0.26, 0.48, 0.62); // a painted blue tear
    for (const s of [-1, 1]) B(head, 0.3, 0.06, 0.05, black, s * 0.26, 1.0, 0.61).rotation.z = s * 0.35; // sad brows
  }
  // Hair puffs on each side (the top stays bald under the hat).
  const hair = P(o.hair);
  for (const s of [-1, 1]) {
    S(head, 0.36, hair, s * 0.68, 0.85, -0.05);
    S(head, 0.3, hair, s * 0.6, 1.1, -0.3);
    S(head, 0.26, hair, s * 0.72, 0.55, -0.25);
  }
  if (o.swept) for (let i = 0; i < 4; i++) B(head, 0.3, 0.2, 0.9, hair, -0.45 + i * 0.3, 1.2 - (i % 2) * 0.08, -0.55).rotation.x = 0.35; // blown back
  // Hat.
  if (o.hat === 'cone') {
    K(head, 0.36, 0.9, P(o.hatC), 0.1, 1.6, 0).rotation.z = -0.15;
    S(head, 0.13, white, 0.17, 2.05, 0);
  } else if (o.hat === 'squash') {
    C(head, 0.5, 0.5, 0.42, P(o.hatC), 0.1, 1.38, 0).rotation.z = -0.25;
    C(head, 0.62, 0.62, 0.08, P(o.hatC), 0.06, 1.2, 0).rotation.z = -0.25;
    S(head, 0.12, P(0xffeb3b), 0.42, 1.5, 0.3); // a droopy flower
  }
  if (o.goggles) {
    B(head, 1.26, 0.16, 1.26, black, 0, 1.0, 0);
    for (const s of [-1, 1]) C(head, 0.2, 0.2, 0.14, G(o.goggles, 0.6), s * 0.26, 1.02, 0.62).rotation.x = Math.PI / 2;
  }
  // Ruffle collar in two colors.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = B(torso, 0.5, 0.3, 0.2, P(i % 2 ? o.ruff[0] : o.ruff[1]), Math.sin(a) * 0.95, 1.08, Math.cos(a) * 0.58);
    r.rotation.set(Math.cos(a) * 0.6, a, 0);
  }
  // Pom-pom buttons and polka dots.
  for (const [i, y] of [0.45, 0, -0.45].entries()) S(torso, 0.14, P(o.pom[i % o.pom.length]), 0, y, 0.52);
  const dot = P(o.dots);
  for (const [x, y] of [[-0.6, 0.5], [0.55, 0.2], [-0.45, -0.35], [0.65, -0.6], [-0.75, -0.75]]) B(torso, 0.22, 0.22, 0.04, dot, x, y, 0.51);
  // Puffy sleeves, white gloves and big floppy shoes.
  for (const a of [h.rightArm, h.leftArm]) {
    B(a, 1.12, 0.9, 1.12, P(h.shirtC), 0, -0.45, 0);
    B(a, 1.14, 0.42, 1.14, white, 0, -1.84, 0);
    B(a, 1.2, 0.16, 1.2, P(o.ruff[0]), 0, -1.58, 0);
  }
  for (const l of [h.rightLeg, h.leftLeg]) {
    B(l, 1.1, 0.5, 2.0, P(o.shoes), 0, -1.8, 0.45);
    if (o.stripe) B(l, 1.14, 0.12, 1.4, white, 0, -1.7, 0.4);
  }
}

/** Long robe skirt hanging from the torso (it keeps the legs mostly hidden). */
function robe(h, m, len = 2.4, wide = 1.35) {
  return C(h.torso, 0.98, wide, len, m, 0, -0.75 - len / 2 + 0.4, 0, 12);
}

/** Sleeves over both arms. */
function sleeves(h, m, len = 1.5, w = 1.08) {
  for (const a of [h.rightArm, h.leftArm]) B(a, w, len, w, m, 0, -len / 2, 0);
}

/** Bandage wraps in three shades over a box part. */
function wraps(p, shades, w, d, y0, y1, rows, n) {
  for (let i = 0; i < rows; i++) {
    const y = y0 + ((y1 - y0) * (i + 0.5)) / rows;
    for (let j = 0; j < 3; j++) {
      const m = shades[(n.v++ * 7 + j) % 3];
      const x = (j - 1) * (w / 3) + (j === 1 && i % 2 ? w / 6 : 0);
      B(p, w / 3 + 0.05, (y1 - y0) / rows - 0.03, d + 0.06, m, x, y, 0).rotation.z = ((i + j) % 2 ? 1 : -1) * 0.05;
    }
  }
}

const shade = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();

// ---------------------------------------------------------------- the looks

export function hw2Parts(h, def) {
  const X = mats(h);
  const { P, G } = X;
  const { torso, head } = h;
  const R = h.rightArm;
  const L = h.leftArm;
  const arms = [R, L];
  const legs = [h.rightLeg, h.leftLeg];
  const headBox = head.children[0];
  h.shirtC = def.shirt;
  const black = P(0x111111);
  const steel = P(0x9aa0a6);
  const wood = P(0x6d4c41);
  const look = def.hw2;

  if (look === 'clown') {
    clown(h, X, { paint: 0x29b6f6, hair: 0xff5722, hat: 'cone', hatC: 0xe53935, ruff: [0xe53935, 0xffffff], pom: [0xe53935, 0x1e88e5, 0x43a047], dots: 0xe53935, shoes: 0xe53935 });
  }

  if (look === 'sadClown') {
    clown(h, X, { sad: true, paint: 0x7986cb, hair: 0x1e88e5, hat: 'squash', hatC: 0x455a64, ruff: [0x5c6bc0, 0xb0bec5], pom: [0x90a4ae], dots: 0x3949ab, shoes: 0x37474f });
    // Patches on the trousers, and a sad droop to the head.
    B(h.leftLeg, 0.55, 0.5, 0.06, P(0x8d6e63), 0.1, -0.8, 0.52);
    B(h.rightLeg, 0.45, 0.45, 0.06, P(0xffb300), 0, -1.2, 0.52);
    head.rotation.x = 0.2;
  }

  if (look === 'speedClown') {
    clown(h, X, { paint: 0xd500f9, hair: 0x00e676, swept: true, goggles: 0xffea00, ruff: [0x00e676, 0xd500f9], pom: [0xffea00], dots: 0xd500f9, shoes: 0x00c853, stripe: true });
    // A lightning bolt on the shirt and a scarf blowing out behind.
    const bolt = G(0xffea00, 0.5);
    B(torso, 0.22, 0.7, 0.05, bolt, 0.1, 0.25, 0.53).rotation.z = 0.5;
    B(torso, 0.22, 0.7, 0.05, bolt, -0.05, -0.25, 0.53).rotation.z = 0.5;
    B(torso, 0.5, 0.18, 0.05, bolt, 0.02, 0, 0.53);
    const scarf = P(0xd500f9);
    B(torso, 2.1, 0.35, 1.15, scarf, 0, 0.85, 0);
    B(torso, 0.4, 0.25, 1.6, scarf, 0.5, 0.75, -1.2).rotation.x = 0.25;
  }

  if (look === 'ringmaster') {
    // Black top hat with a red band, a curly moustache, a red tailcoat with gold buttons and
    // epaulettes, white gloves, a whip in one hand and a cane in the other.
    const red = P(def.shirt);
    const gold = P(0xffc107);
    const white = P(0xffffff);
    const hat = grp(head, 0.05, 1.22, -0.02);
    hat.rotation.z = -0.08;
    C(hat, 0.92, 0.92, 0.1, black, 0, 0, 0, 16);
    C(hat, 0.6, 0.62, 1.3, black, 0, 0.7, 0, 16);
    C(hat, 0.63, 0.64, 0.26, red, 0, 0.2, 0, 16);
    B(hat, 0.2, 0.2, 0.06, gold, 0, 0.2, 0.64);
    for (const s of [-1, 1]) {
      B(head, 0.24, 0.24, 0.05, white, s * 0.26, 0.78, 0.6);
      B(head, 0.12, 0.14, 0.06, black, s * 0.26, 0.76, 0.63);
      B(head, 0.34, 0.08, 0.05, black, s * 0.26, 1.0, 0.61).rotation.z = -s * 0.25;
      // Curly moustache.
      B(head, 0.38, 0.12, 0.08, black, s * 0.2, 0.42, 0.64).rotation.z = s * 0.25;
      B(head, 0.12, 0.2, 0.08, black, s * 0.42, 0.5, 0.64);
    }
    B(head, 0.4, 0.08, 0.05, P(0x5d1010), 0, 0.27, 0.61); // grin
    // Coat: black waistcoat front, gold buttons, bow tie, tails and epaulettes.
    B(torso, 0.7, 1.9, 0.06, black, 0, -0.05, 0.51);
    for (const s of [-1, 1]) for (const y of [0.4, -0.05, -0.5]) S(torso, 0.09, gold, s * 0.52, y, 0.53);
    B(torso, 0.5, 0.18, 0.08, white, 0, 0.88, 0.53);
    for (const s of [-1, 1]) B(torso, 0.2, 0.22, 0.1, red, s * 0.18, 0.88, 0.57).rotation.z = s * 0.4;
    B(torso, 2.06, 0.18, 1.06, gold, 0, -0.95, 0); // gold hem
    for (const s of [-1, 1]) {
      const tail = B(torso, 0.85, 2.1, 0.12, red, s * 0.45, -1.9, -0.48);
      tail.rotation.x = 0.12;
      B(torso, 0.85, 0.12, 0.13, gold, s * 0.45, -2.9, -0.36);
    }
    for (const a of arms) {
      B(a, 1.08, 1.5, 1.08, red, 0, -0.75, 0);
      B(a, 1.12, 0.22, 1.12, gold, 0, -1.45, 0);
      B(a, 1.12, 0.4, 1.12, white, 0, -1.82, 0);
      B(a, 1.3, 0.3, 1.3, gold, 0, -0.05, 0); // epaulette
      for (const x of [-0.45, -0.15, 0.15, 0.45]) B(a, 0.1, 0.35, 0.1, gold, x, -0.3, 0.6);
    }
    // Whip: a short handle and a lash curling down to the ground.
    B(R, 0.2, 0.2, 1.0, P(0x3e2723), 0, -2.1, 0.4);
    let px = 0;
    for (let i = 0; i < 6; i++) {
      const seg = B(R, 0.1, 0.1, 0.6, P(0x5d4037), px, -2.1 - i * 0.3, -0.2 - i * 0.45);
      seg.rotation.x = -0.6;
      px += 0.06;
    }
    // Cane: black stick with a gold knob.
    B(L, 0.14, 0.14, 2.6, black, 0, -2.1, -0.9);
    S(L, 0.2, gold, 0, -2.1, 0.45);
  }

  if (look === 'jackBot') {
    // A big robot with a burning jack-o'-lantern head, a glowing core and a spinning minigun arm.
    headBox.visible = false;
    const metal = P(0x546e7a);
    const dark = P(0x263238);
    const orange = G(0xff9100, 0.9);
    const pk = pumpkin(head, P(def.skin), 1.2, 0.95, P(shade(def.skin, 0.8)));
    carvedFace(pk, G(0xffea00, 1), 1.2, 0, true);
    C(pk, 0.12, 0.16, 0.5, P(0x33691e), 0, 1.15, 0);
    for (const [x, z, s] of [[-0.3, 0, 0.35], [0.25, 0.15, 0.3], [0, -0.25, 0.4]]) B(pk, s, s * 1.6, s, G(0xff6d00, 0.9), x, 1.4, z);
    C(head, 0.55, 0.65, 0.35, dark, 0, -0.05, 0, 12); // neck ring
    // Chest armor with a round glowing core and vents.
    B(torso, 2.5, 2.2, 1.4, metal, 0, 0.05, 0);
    B(torso, 2.6, 0.3, 1.5, dark, 0, -1.0, 0);
    C(torso, 0.42, 0.42, 0.2, dark, 0, 0.25, 0.72, 16).rotation.x = Math.PI / 2;
    C(torso, 0.3, 0.3, 0.22, orange, 0, 0.25, 0.75, 16).rotation.x = Math.PI / 2;
    for (const y of [-0.35, -0.55]) for (const s of [-1, 1]) B(torso, 0.5, 0.08, 0.08, dark, s * 0.6, y, 0.71);
    for (const [x, y] of [[-1.05, 0.9], [1.05, 0.9], [-1.05, -0.8], [1.05, -0.8]]) S(torso, 0.08, dark, x, y, 0.71);
    // Exhaust pipes on the back with an orange glow.
    for (const s of [-1, 1]) {
      C(torso, 0.2, 0.2, 1.4, dark, s * 0.6, 1.0, -0.8);
      C(torso, 0.14, 0.14, 0.1, orange, s * 0.6, 1.72, -0.8);
    }
    for (const a of arms) {
      B(a, 1.5, 1.0, 1.5, metal, 0, -0.15, 0); // shoulder
      B(a, 1.15, 1.6, 1.15, dark, 0, -1.0, 0);
    }
    // Right hand: three metal claw fingers.
    for (const x of [-0.35, 0, 0.35]) B(R, 0.22, 0.7, 0.3, steel, x, -2.15, 0.25);
    // Left arm: the minigun (barrels point forward along the arm).
    B(L, 1.3, 1.2, 1.3, dark, 0, -2.0, 0);
    B(L, 0.6, 0.9, 0.5, P(0xc8a000), 0.85, -1.9, 0.2); // ammo box
    const spin = grp(L, 0, -3.3, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      C(spin, 0.11, 0.11, 2.2, steel, Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3, 8);
    }
    C(spin, 0.48, 0.48, 0.2, dark, 0, -0.75, 0, 12);
    C(spin, 0.48, 0.48, 0.2, dark, 0, 0.6, 0, 12);
    C(spin, 0.14, 0.14, 0.1, orange, 0, -1.12, 0);
    // Legs: plated, with knee pads and wide feet.
    for (const l of legs) {
      B(l, 1.2, 1.9, 1.2, metal, 0, -0.95, 0);
      B(l, 0.8, 0.5, 0.3, dark, 0, -0.9, 0.62);
      B(l, 1.35, 0.45, 1.8, dark, 0, -1.85, 0.25);
    }
    h.anim = (phase, t) => {
      const sw = Math.sin(phase) * 0.45;
      h.leftLeg.rotation.x = sw;
      h.rightLeg.rotation.x = -sw;
      R.rotation.x = -0.35 - sw * 0.5;
      L.rotation.x = -Math.PI / 2 + Math.sin(t * 1.3) * 0.08;
      spin.rotation.y = t * 14;
      head.rotation.y = Math.sin(t * 0.9) * 0.35;
      h.body.position.y = Math.abs(Math.cos(phase)) * 0.2;
      h.body.rotation.z = Math.sin(phase) * 0.04;
    };
  }

  if (look === 'mummy') {
    // Pale bandages wrapped in rows, two dim eyes in a dark gap, a loose end trailing.
    const shades = [def.skin, shade(def.skin, 0.85), shade(def.skin, 1.08) & 0xffffff].map((c) => P(c));
    const n = { v: 0 };
    wraps(torso, shades, 2, 1, -1, 1, 5, n);
    for (const l of [...arms, ...legs]) wraps(l, shades, 1, 1, -2, 0, 4, n);
    wraps(head, shades, 1.2, 1.2, 0, 1.2, 3, n);
    B(head, 0.9, 0.22, 0.08, P(0x2a1e16), 0, 0.72, 0.65);
    for (const s of [-1, 1]) B(head, 0.14, 0.12, 0.06, G(0x76ff03, 0.8), s * 0.24, 0.72, 0.69);
    B(L, 0.3, 1.2, 0.08, shades[2], 0.3, -2.2, -0.3).rotation.z = 0.3;
    B(torso, 0.3, 1.0, 0.08, shades[1], -0.6, -1.3, 0.52).rotation.z = -0.2;
  }

  if (look === 'scarecrow') {
    // Burlap sack head with button eyes and a stitched grin, a floppy straw hat, straw poking out
    // of the sleeves, collar and trouser legs, and patches on the shirt.
    const sack = P(0xc8a165);
    const straw = P(0xfbc02d);
    const straw2 = P(0xe0a020);
    headBox.visible = false;
    B(head, 1.3, 1.3, 1.25, sack, 0, 0.62, 0);
    C(head, 0.55, 0.55, 0.16, P(0x5d4037), 0, 0.02, 0, 10); // rope round the neck
    for (const s of [-1, 1]) C(head, 0.14, 0.14, 0.06, black, s * 0.28, 0.8, 0.64).rotation.x = Math.PI / 2;
    K(head, 0.12, 0.25, P(0xff7043), 0, 0.55, 0.72, 4).rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) B(head, 0.14, 0.05, 0.05, black, -0.38 + i * 0.15, 0.3 + (i % 2) * 0.05, 0.64).rotation.z = (i % 2 ? 1 : -1) * 0.5;
    const hat = grp(head, 0, 1.3, 0);
    hat.rotation.set(-0.1, 0, 0.15);
    C(hat, 1.25, 1.3, 0.1, straw2, 0, 0, 0, 14);
    C(hat, 0.55, 0.68, 0.65, straw2, 0, 0.35, 0, 12);
    C(hat, 0.69, 0.69, 0.14, P(0xc62828), 0, 0.12, 0, 12);
    const tufts = (p, y, n, out = 0.5) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const t = B(p, 0.1, out + (i % 3) * 0.15, 0.1, i % 2 ? straw : straw2, Math.sin(a) * 0.42, y, Math.cos(a) * 0.42);
        t.rotation.set(Math.cos(a) * 0.7, 0, -Math.sin(a) * 0.7);
      }
    };
    for (const a of arms) tufts(a, -2.0, 6);
    for (const l of legs) tufts(l, -1.6, 6, 0.4);
    tufts(head, 0.05, 8, 0.35);
    // Plaid lines, patches and a rope belt.
    const line = P(shade(def.shirt, 0.6));
    for (const y of [0.55, 0.05, -0.45]) B(torso, 2.04, 0.08, 1.04, line, 0, y, 0);
    for (const x of [-0.5, 0.5]) B(torso, 0.08, 2.0, 1.04, line, x, 0, 0);
    B(torso, 0.55, 0.5, 0.06, P(0x7cb342), 0.45, -0.3, 0.53);
    B(torso, 0.45, 0.4, 0.06, P(0xef6c00), -0.5, 0.45, 0.53);
    B(torso, 2.08, 0.18, 1.08, P(0x8d6e63), 0, -0.85, 0);
    B(h.leftLeg, 0.5, 0.45, 0.06, P(0xa1887f), 0, -0.6, 0.52);
  }

  if (look === 'demon') {
    // Curved horns, burning eyes, fangs, folded bat wings, a pointed tail and hooves.
    const horn = P(0x2a1a14);
    for (const s of [-1, 1]) {
      B(head, 0.3, 0.6, 0.3, horn, s * 0.45, 1.35, 0.1).rotation.z = -s * 0.4;
      B(head, 0.22, 0.5, 0.22, horn, s * 0.68, 1.75, 0.05).rotation.z = -s * 0.1;
      B(head, 0.14, 0.35, 0.14, horn, s * 0.68, 2.1, -0.05).rotation.z = s * 0.35;
      B(head, 0.24, 0.12, 0.06, G(0xffd600, 1), s * 0.26, 0.74, 0.62).rotation.z = s * -0.3;
      B(head, 0.08, 0.16, 0.06, P(0xffffff), s * 0.14, 0.24, 0.62);
    }
    B(head, 0.55, 0.1, 0.05, black, 0, 0.32, 0.61);
    const wing = P(0x1a0826);
    for (const s of [-1, 1]) {
      const w = grp(torso, s * 0.5, 0.6, -0.55);
      w.rotation.y = s * 0.5;
      B(w, 0.15, 1.8, 0.15, horn, s * 0.3, 0.2, 0).rotation.z = -s * 0.4;
      B(w, 1.1, 1.6, 0.06, wing, s * 0.6, -0.3, 0);
      B(w, 0.5, 0.6, 0.06, wing, s * 1.0, -1.25, 0);
    }
    let tz = -0.55;
    for (let i = 0; i < 5; i++) {
      const seg = B(torso, 0.16, 0.16, 0.55, P(def.skin), 0, -1.0 - i * 0.12 + (i > 2 ? (i - 2) * 0.35 : 0), (tz -= 0.45));
      seg.rotation.x = i > 2 ? 0.7 : -0.2;
    }
    K(torso, 0.25, 0.45, horn, 0, -0.5, tz - 0.25, 4).rotation.x = -0.9;
    B(torso, 2.04, 0.3, 1.04, P(0x120414), 0, -0.85, 0);
    S(torso, 0.15, G(0xff3d00, 0.6), 0, -0.85, 0.53);
    for (const l of legs) B(l, 1.06, 0.55, 1.1, horn, 0, -1.78, 0.05);
    for (const a of arms) for (const x of [-0.3, 0, 0.3]) K(a, 0.08, 0.35, P(0xeeeeee), x, -2.15, 0.35, 4).rotation.x = Math.PI;
  }

  if (look === 'ghost') {
    // A floating sheet ghost: round top, ragged hem, big black eyes and an open mouth.
    const sheet = P(def.skin);
    const face = P(0x202428);
    headBox.visible = false;
    S(head, 0.85, sheet, 0, 0.7, 0).scale.set(1, 1.08, 1);
    for (const s of [-1, 1]) B(head, 0.26, 0.4, 0.06, face, s * 0.3, 0.82, 0.8);
    B(head, 0.32, 0.36, 0.06, face, 0, 0.32, 0.82);
    C(torso, 0.95, 1.55, 3.0, sheet, 0, -0.55, 0, 14);
    const hem = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = B(torso, 0.7, 0.6 + (i % 3) * 0.2, 0.15, sheet, Math.sin(a) * 1.45, -2.2, Math.cos(a) * 1.45);
      r.rotation.y = a;
      hem.push(r);
    }
    R.position.x = -1.05;
    L.position.x = 1.05;
    for (const a of arms) {
      a.children[0].visible = false;
      B(a, 0.95, 1.6, 0.95, sheet, 0, -0.8, 0);
      B(a, 0.7, 0.6, 0.25, sheet, 0, -1.8, 0.2);
    }
    for (const l of legs) l.children[0].visible = false;
    h.anim = (phase, t) => {
      h.body.position.y = 1.2 + Math.sin(t * 2.2 + phase * 0.1) * 0.35;
      h.body.rotation.z = Math.sin(t * 1.6) * 0.07;
      h.body.rotation.x = 0.12;
      R.rotation.x = -1.4 + Math.sin(t * 2.4) * 0.15;
      L.rotation.x = -1.4 + Math.sin(t * 2.4 + 1.5) * 0.15;
      hem.forEach((r, i) => (r.rotation.x = Math.sin(t * 5 + i) * 0.3));
      head.rotation.z = Math.sin(t * 1.3) * 0.12;
    };
  }

  if (look === 'vampire') {
    // Slicked hair with a widow's peak, red eyes and fangs, a tall-collared cape lined in red.
    const red = P(0xb71c1c);
    const white = P(0xf5f5f5);
    B(head, 1.28, 0.4, 1.28, black, 0, 1.08, -0.02);
    B(head, 0.36, 0.36, 0.06, black, 0, 0.92, 0.61).rotation.z = Math.PI / 4;
    B(head, 1.28, 1.0, 0.3, black, 0, 0.7, -0.5);
    for (const s of [-1, 1]) {
      B(head, 0.2, 0.12, 0.06, G(0xff1744, 1), s * 0.26, 0.74, 0.62);
      B(head, 0.3, 0.07, 0.05, black, s * 0.26, 0.9, 0.61).rotation.z = s * 0.35;
      B(head, 0.07, 0.16, 0.05, white, s * 0.12, 0.24, 0.62);
    }
    B(head, 0.4, 0.06, 0.05, P(0x4a0000), 0, 0.31, 0.61);
    // White shirt front with a red gem, black waistcoat.
    B(torso, 0.55, 1.6, 0.06, white, 0, 0.15, 0.51);
    B(torso, 0.25, 0.25, 0.08, G(0xd50000, 0.6), 0, 0.75, 0.55).rotation.z = Math.PI / 4;
    for (const s of [-1, 1]) B(torso, 0.25, 1.4, 0.07, P(0x2a2a2a), s * 0.38, 0.0, 0.52).rotation.z = s * 0.15;
    // Cape: black outside, red inside, collar standing up behind the head.
    B(torso, 2.4, 3.8, 0.12, black, 0, -1.05, -0.64);
    B(torso, 2.2, 3.6, 0.06, red, 0, -1.05, -0.56);
    for (const s of [-1, 1]) {
      const col = B(torso, 0.9, 1.1, 0.1, black, s * 0.62, 1.45, -0.35);
      col.rotation.set(-0.2, s * 0.5, s * 0.25);
      const lin = B(torso, 0.8, 1.0, 0.04, red, s * 0.6, 1.45, -0.28);
      lin.rotation.copy(col.rotation);
    }
    sleeves(h, black);
  }

  if (look === 'witch') {
    // Crooked pointy hat, long hair, a hooked nose with a wart, a dress, and she rides a broom.
    const hatM = P(0x1a1a2e);
    const purple = P(0x7b1fa2);
    const hair = P(0x212121);
    const hat = grp(head, 0, 1.25, 0);
    hat.rotation.z = 0.08;
    C(hat, 1.2, 1.2, 0.1, hatM, 0, 0, 0, 16);
    C(hat, 0.48, 0.65, 0.75, hatM, 0, 0.4, 0, 12);
    C(hat, 0.66, 0.66, 0.2, purple, 0, 0.12, 0, 12);
    B(hat, 0.28, 0.24, 0.06, P(0xffc107), 0, 0.12, 0.66);
    const tip = K(hat, 0.48, 1.3, hatM, 0.2, 1.35, 0, 12);
    tip.rotation.z = -0.4;
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) B(head, 0.25, 1.4 + i * 0.2, 0.25, hair, s * (0.55 + i * 0.05), 0.15 - i * 0.1, -0.2 - i * 0.2);
    B(head, 1.25, 1.5, 0.3, hair, 0, 0.2, -0.55);
    B(head, 0.2, 0.2, 0.5, P(def.skin), 0, 0.55, 0.8).rotation.x = 0.35;
    S(head, 0.07, P(0x558b2f), 0.08, 0.5, 1.0);
    for (const s of [-1, 1]) B(head, 0.18, 0.12, 0.06, G(0xffeb3b, 0.9), s * 0.26, 0.76, 0.62);
    B(head, 0.5, 0.08, 0.05, P(0x1b1b1b), 0, 0.28, 0.61).rotation.z = 0.15;
    const dress = robe(h, P(def.shirt), 2.0, 1.25);
    dress.scale.z = 0.9;
    for (const a of arms) {
      B(a, 1.25, 1.2, 1.25, P(def.shirt), 0, -0.9, 0);
      B(a, 1.3, 0.12, 1.3, purple, 0, -1.45, 0);
    }
    B(torso, 2.05, 0.2, 1.05, purple, 0, -0.8, 0);
    for (const l of legs) B(l, 1.0, 0.4, 1.4, black, 0, -1.85, 0.25);
    // The broom, under her, front end up.
    const broom = grp(h.body, 0, 1.95, 0.2);
    broom.rotation.x = -0.15;
    C(broom, 0.1, 0.12, 5.0, wood, 0, 0, 0.3, 6).rotation.x = Math.PI / 2;
    C(broom, 0.18, 0.6, 1.5, P(0xc9a227), 0, 0, -2.6, 10).rotation.x = -Math.PI / 2;
    C(broom, 0.22, 0.22, 0.18, P(0x8d6e63), 0, 0, -1.95, 8).rotation.x = Math.PI / 2;
    h.anim = (phase, t) => {
      const bob = Math.sin(t * 2.5 + phase * 0.05) * 0.25;
      h.body.position.y = 1.4 + bob;
      h.body.rotation.x = -0.08 + Math.sin(t * 2.5) * 0.04;
      h.body.rotation.z = Math.sin(t * 1.7) * 0.06;
      h.leftLeg.rotation.x = -1.2;
      h.rightLeg.rotation.x = -1.2;
      h.leftLeg.rotation.z = 0.25;
      h.rightLeg.rotation.z = -0.25;
      R.rotation.x = -0.65;
      L.rotation.x = -0.55 + Math.sin(t * 4) * 0.05;
      head.rotation.y = Math.sin(t * 1.1) * 0.25;
    };
  }

  if (look === 'frank') {
    // Flat-top hair, bolts in the neck, stitches on the forehead, a torn jacket and big boots.
    // Walks stiffly with both arms straight out.
    B(head, 1.3, 0.38, 1.3, black, 0, 1.18, 0);
    for (const x of [-0.45, -0.15, 0.15, 0.45]) B(head, 0.3, 0.2, 0.08, black, x, 0.98 - (x === -0.15 ? 0.06 : 0), 0.62);
    for (const s of [-1, 1]) {
      C(head, 0.12, 0.12, 0.4, steel, s * 0.72, 0.15, 0, 8).rotation.z = Math.PI / 2;
      C(head, 0.18, 0.18, 0.1, steel, s * 0.9, 0.15, 0, 8).rotation.z = Math.PI / 2;
      B(head, 0.24, 0.1, 0.06, P(0xcddc39), s * 0.26, 0.72, 0.62);
    }
    B(head, 1.0, 0.14, 0.08, P(0x33691e), 0, 0.84, 0.63); // heavy brow
    B(head, 0.8, 0.05, 0.05, black, -0.05, 1.0, 0.6);
    for (let i = 0; i < 5; i++) B(head, 0.04, 0.16, 0.05, black, -0.4 + i * 0.18, 1.0, 0.61);
    B(head, 0.05, 0.4, 0.05, black, 0.4, 0.4, 0.61).rotation.z = 0.3; // cheek scar
    B(head, 0.5, 0.07, 0.05, black, 0, 0.3, 0.61);
    const jacket = P(def.shirt);
    for (const s of [-1, 1]) B(torso, 0.5, 2.0, 1.08, P(0x37474f), s * 0.78, 0, 0);
    for (const a of arms) {
      B(a, 1.1, 1.0, 1.1, jacket, 0, -0.5, 0);
      for (const x of [-0.35, 0.05, 0.35]) B(a, 0.3, 0.25, 1.12, jacket, x, -1.1, 0);
    }
    for (const l of legs) B(l, 1.18, 0.7, 1.35, black, 0, -1.75, 0.1);
    walker(h, (sw, t) => {
      R.rotation.x = -Math.PI / 2 + sw * 0.1;
      L.rotation.x = -Math.PI / 2 - sw * 0.1;
      head.rotation.z = Math.sin(t * 1.5) * 0.06;
    }, 0.38);
  }

  if (look === 'swamp') {
    // Mossy swamp hulk: moss clumps, hanging weeds, glowing eyes and muddy feet.
    const moss = [P(0x33691e), P(0x558b2f), P(0x1b5e20)];
    B(torso, 2.4, 2.2, 1.3, moss[0], 0, 0.05, 0);
    for (const [x, y, z, r] of [[-0.8, 1.0, 0, 0.6], [0.8, 1.05, 0, 0.6], [0, 1.1, -0.4, 0.55], [-0.5, -0.4, 0.5, 0.4], [0.6, 0.2, 0.55, 0.35], [0, -0.8, -0.6, 0.5]]) S(torso, r, moss[(x * 10 + y * 3) & 1 ? 1 : 2], x, y, z);
    for (const [x, y, z, r] of [[0, 1.25, 0, 0.6], [-0.45, 1.05, -0.2, 0.4], [0.5, 1.1, -0.15, 0.42], [0, 0.9, -0.55, 0.5]]) S(head, r, moss[1], x, y, z);
    for (const s of [-1, 1]) B(head, 0.24, 0.14, 0.06, G(0xc6ff00, 1), s * 0.26, 0.72, 0.62);
    B(head, 0.6, 0.18, 0.06, P(0x0b2b0b), 0, 0.3, 0.61);
    for (const a of arms) {
      B(a, 1.25, 1.7, 1.25, moss[0], 0, -0.85, 0);
      for (const x of [-0.4, 0.1, 0.45]) B(a, 0.12, 0.9 + Math.abs(x), 0.12, moss[2], x, -1.6, 0.5);
    }
    for (const l of legs) {
      B(l, 1.12, 1.0, 1.12, moss[2], 0, -0.6, 0);
      B(l, 1.2, 0.5, 1.25, P(0x4e342e), 0, -1.8, 0.05);
    }
    for (const x of [-0.7, 0, 0.6]) B(torso, 0.14, 1.0, 0.14, moss[1], x, -1.3, 0.55);
  }

  if (look === 'jaxe') {
    // Pumpkin-headed brute: a burning jack-o'-lantern head, a ragged black coat with straps, a
    // spiked shoulder pad and a huge axe.
    headBox.visible = false;
    const pk = pumpkin(head, P(def.skin), 0.9, 0.75, P(shade(def.skin, 0.8)));
    carvedFace(pk, G(0xffea00, 1), 0.9, 0, true);
    C(pk, 0.1, 0.14, 0.45, P(0x33691e), 0, 0.85, 0);
    for (const [x, z, s] of [[-0.3, 0, 0.32], [0.25, 0.15, 0.28], [0, -0.25, 0.38]]) B(pk, s, s * 1.6, s, G(0xff6d00, 0.9), x, 1.05, z);
    const strap = P(0x4e342e);
    const buckle = P(0xb0bec5);
    B(torso, 0.35, 2.6, 1.06, strap, 0, 0, 0).rotation.z = 0.7;
    B(torso, 0.3, 0.3, 0.08, buckle, 0.05, 0.05, 0.56);
    B(torso, 2.06, 0.3, 1.06, strap, 0, -0.85, 0);
    for (const x of [-0.7, -0.2, 0.3, 0.75]) B(torso, 0.35, 0.6, 0.08, P(def.shirt), x, -1.25, 0.45).rotation.z = x * 0.3;
    const pad = B(R, 1.4, 0.7, 1.4, P(0x37474f), 0, -0.1, 0);
    for (const [x, z] of [[-0.4, 0], [0, 0.35], [0, -0.35]]) K(R, 0.15, 0.6, steel, x, 0.45, z, 6);
    pad.rotation.z = 0.15;
    for (const a of arms) B(a, 1.1, 0.5, 1.1, strap, 0, -1.4, 0);
    // The axe: long handle, a big blade forward and a spike behind.
    B(R, 0.22, 0.22, 5.0, P(0x3e2723), 0, -2.1, 1.0);
    B(R, 0.14, 2.0, 1.6, steel, 0, -3.15, 3.0);
    B(R, 0.16, 0.25, 1.9, P(0xcfd8dc), 0, -4.15, 3.0);
    K(R, 0.18, 0.8, steel, 0, -1.4, 3.0, 4).rotation.x = Math.PI / 2;
    B(R, 0.3, 0.3, 0.5, P(0x212121), 0, -2.1, 3.0);
  }

  if (look === 'villager') {
    // Angry villager: a cloth cap, suspenders, a pitchfork and a burning torch.
    C(head, 0.66, 0.66, 0.3, P(0x5d4037), 0, 1.18, -0.02, 12);
    B(head, 0.9, 0.08, 0.45, P(0x4e342e), 0, 1.05, 0.55);
    for (const s of [-1, 1]) B(head, 0.32, 0.08, 0.05, black, s * 0.25, 0.92, 0.61).rotation.z = s * 0.4;
    for (const s of [-1, 1]) B(torso, 0.2, 2.0, 1.06, P(0x3e2723), s * 0.5, 0, 0);
    B(torso, 1.2, 1.3, 0.06, P(0xd7ccc8), 0, -0.4, 0.52); // apron
    sleeves(h, P(def.shirt), 1.0);
    // Pitchfork (right): a long pole, a crossbar and three tines.
    B(R, 0.16, 0.16, 5.2, wood, 0, -2.1, 1.1);
    B(R, 0.9, 0.14, 0.14, steel, 0, -2.1, 3.65);
    for (const x of [-0.4, 0, 0.4]) B(R, 0.1, 0.1, 0.9, steel, x, -2.1, 4.1);
    // Torch (left): a short handle with a cloth wrap and a flame.
    B(L, 0.18, 0.18, 1.6, wood, 0, -2.1, 0.6);
    B(L, 0.3, 0.3, 0.35, P(0x8d6e63), 0, -2.1, 1.35);
    B(L, 0.42, 0.42, 0.6, G(0xff9100, 1), 0, -2.1, 1.75);
    B(L, 0.22, 0.22, 0.4, G(0xffea00, 1), 0, -2.1, 2.15);
  }

  if (look === 'psycho') {
    // Wild hair, staring eyes, a blood-spattered shirt and a big knife.
    const hair = P(0x3e2723);
    for (const [x, z, r] of [[-0.4, 0, -0.5], [0, -0.2, 0.2], [0.4, 0.1, 0.6], [-0.2, -0.5, -0.3], [0.3, -0.5, 0.4]]) B(head, 0.3, 0.6, 0.3, hair, x, 1.3, z).rotation.z = r;
    for (const s of [-1, 1]) {
      B(head, 0.3, 0.3, 0.05, P(0xffffff), s * 0.26, 0.76, 0.6);
      B(head, 0.08, 0.08, 0.06, black, s * 0.26, 0.76, 0.63);
    }
    B(head, 0.6, 0.12, 0.05, P(0x5d1010), 0, 0.3, 0.61);
    for (let i = 0; i < 4; i++) B(head, 0.08, 0.1, 0.06, P(0xffffff), -0.22 + i * 0.15, 0.3, 0.62);
    const blood = P(0x8b0000);
    for (const [x, y, s] of [[-0.5, 0.4, 0.4], [0.3, -0.2, 0.5], [0.6, 0.6, 0.25], [-0.2, -0.6, 0.3], [0.1, 0.2, 0.18]]) B(torso, s, s * 0.8, 0.05, blood, x, y, 0.52).rotation.z = x;
    B(h.leftLeg, 0.35, 0.3, 0.05, blood, 0.1, -0.7, 0.52);
    // Knife: dark handle, a long steel blade pointing up.
    B(R, 0.2, 0.25, 0.6, black, 0, -2.1, 0.3);
    B(R, 0.4, 0.08, 0.1, steel, 0, -2.1, 0.62);
    B(R, 0.08, 0.3, 1.2, P(0xe0e0e0), 0, -2.1, 1.25);
    // A second knife in the belt.
    B(torso, 2.04, 0.18, 1.04, black, 0, -0.9, 0);
    B(torso, 0.08, 0.6, 0.2, steel, 0.6, -1.25, 0.52);
  }

  if (look === 'mrSaw') {
    // A stitched leather mask, a stained butcher's apron and a big chainsaw.
    const leather = P(0xa1887f);
    B(head, 1.26, 1.0, 0.12, leather, 0, 0.6, 0.58);
    for (const s of [-1, 1]) B(head, 0.24, 0.16, 0.06, black, s * 0.26, 0.76, 0.66);
    B(head, 0.5, 0.1, 0.06, black, 0, 0.3, 0.66);
    for (let i = 0; i < 4; i++) B(head, 0.04, 0.9, 0.04, P(0x4e342e), -0.45 + i * 0.3, 0.6, 0.65);
    B(head, 1.3, 0.5, 1.3, P(0x3e2723), 0, 1.15, -0.05); // hair
    const apron = P(0xd7ccc8);
    B(torso, 1.6, 2.6, 0.06, apron, 0, -0.6, 0.52);
    for (const [x, y] of [[-0.3, 0.2], [0.4, -0.5], [-0.2, -1.4]]) B(torso, 0.4, 0.3, 0.05, P(0x6d1b1b), x, y, 0.56);
    for (const s of [-1, 1]) B(torso, 0.12, 1.0, 1.04, apron, s * 0.6, 0.6, 0);
    // Chainsaw: motor in the hands, the bar sticking out forward with teeth along it.
    B(R, 0.8, 0.9, 1.0, P(0xff9800), 0.4, -2.3, 0.2);
    B(R, 0.6, 0.15, 0.6, black, 0.4, -2.0, 0.85); // top handle
    B(R, 0.16, 0.6, 0.6, black, 0.4, -2.8, 0.2);
    B(R, 0.12, 0.45, 2.6, P(0xb0bec5), 0.4, -2.3, 1.95); // the bar points up
    for (let i = 0; i < 7; i++) for (const y of [-2.56, -2.04]) B(R, 0.14, 0.1, 0.14, P(0x37474f), 0.4, y, 0.95 + i * 0.33);
  }

  if (look === 'prowler') {
    // A hunched wolf-beast: snout, ears, glowing eyes, a furry back, claws and a bushy tail.
    const fur = P(def.skin);
    const dark = P(shade(def.skin, 0.65));
    B(head, 0.62, 0.5, 0.75, fur, 0, 0.35, 0.9);
    B(head, 0.25, 0.18, 0.1, black, 0, 0.5, 1.3);
    for (const s of [-1, 1]) {
      K(head, 0.22, 0.6, dark, s * 0.4, 1.4, -0.05, 4);
      B(head, 0.22, 0.1, 0.06, G(0xffd600, 1), s * 0.28, 0.8, 0.62).rotation.z = s * -0.3;
      B(head, 0.06, 0.16, 0.06, P(0xffffff), s * 0.15, 0.12, 1.2);
    }
    for (let i = 0; i < 5; i++) K(torso, 0.22, 0.6, dark, 0, 0.9 - i * 0.45, -0.55, 4).rotation.x = -1.2;
    for (const s of [-1, 1]) S(torso, 0.5, dark, s * 0.85, 0.85, -0.1);
    for (const a of arms) {
      a.scale.y = 1.45;
      B(a, 1.15, 1.2, 1.15, dark, 0, -0.6, 0);
      for (const x of [-0.3, 0, 0.3]) K(a, 0.08, 0.35, P(0xeeeeee), x, -2.15, 0.4, 4).rotation.x = Math.PI * 0.7;
    }
    const tail = grp(h.body, 0, 2.1, -0.6);
    for (let i = 0; i < 4; i++) S(tail, 0.3 - i * 0.03, i % 2 ? dark : fur, 0, i * 0.1, -i * 0.42);
    beast(h, 0.8, (sw, t) => {
      tail.rotation.y = Math.sin(t * 4) * 0.4;
      tail.rotation.x = -0.4 + sw * 0.1;
    });
  }

  if (look === 'psycop') {
    // A creepy cop: peaked cap with a badge, dark glasses, a badge on the chest, radio, belt and baton.
    const navy = P(def.shirt);
    const gold = P(0xffc107);
    B(head, 1.3, 0.35, 1.3, navy, 0, 1.25, 0);
    B(head, 1.42, 0.16, 1.42, navy, 0, 1.45, 0.02);
    B(head, 1.1, 0.07, 0.45, black, 0, 1.08, 0.75).rotation.x = 0.15;
    B(head, 0.26, 0.26, 0.06, gold, 0, 1.3, 0.67);
    B(head, 1.0, 0.22, 0.06, black, 0, 0.75, 0.63);
    for (const s of [-1, 1]) B(head, 0.1, 0.06, 0.06, P(0x90caf9), s * 0.3, 0.8, 0.67);
    B(head, 0.6, 0.06, 0.05, P(0x5d1010), 0, 0.3, 0.61).rotation.z = 0.1;
    for (let i = 0; i < 5; i++) B(head, 0.08, 0.08, 0.06, P(0xffffff), -0.2 + i * 0.1, 0.3 + (i - 2) * 0.012, 0.62);
    const star = G(0xffd54f, 0.4);
    B(torso, 0.3, 0.3, 0.06, star, 0.5, 0.45, 0.52).rotation.z = Math.PI / 4;
    B(torso, 0.3, 0.3, 0.06, star, 0.5, 0.45, 0.52);
    B(torso, 0.25, 0.8, 0.05, black, 0, 0.3, 0.52); // tie
    B(torso, 0.3, 0.45, 0.25, black, -0.65, 0.75, 0.55); // radio
    B(torso, 0.05, 0.3, 0.05, black, -0.55, 1.05, 0.6);
    B(torso, 2.06, 0.25, 1.06, black, 0, -0.85, 0);
    for (const x of [-0.6, 0.2, 0.7]) B(torso, 0.3, 0.32, 0.2, black, x, -0.85, 0.58);
    B(torso, 0.12, 0.12, 0.08, gold, -0.2, -0.85, 0.55);
    sleeves(h, navy, 1.0);
    B(R, 0.18, 0.18, 2.0, black, 0, -2.1, 0.8);
    B(R, 0.12, 0.6, 0.12, black, 0, -1.8, 0.25);
  }

  if (look === 'judge') {
    // A curly white wig, a long black robe with a white collar, a gavel and a big bell.
    const wig = P(0xeeeeee);
    for (const s of [-1, 1]) for (const [y, z] of [[1.0, -0.1], [0.65, -0.15], [0.3, -0.2], [-0.05, -0.25]]) S(head, 0.28, wig, s * 0.66, y, z);
    for (const x of [-0.4, 0, 0.4]) S(head, 0.3, wig, x, 1.2, -0.05);
    for (const x of [-0.35, 0.35]) S(head, 0.28, wig, x, 0.9, -0.6);
    for (const s of [-1, 1]) {
      B(head, 0.2, 0.1, 0.05, black, s * 0.26, 0.74, 0.61);
      B(head, 0.34, 0.07, 0.05, black, s * 0.26, 0.92, 0.61).rotation.z = -s * 0.3;
    }
    B(head, 0.45, 0.07, 0.05, black, 0, 0.3, 0.61);
    robe(h, P(def.shirt), 2.6, 1.4);
    B(torso, 0.5, 0.7, 0.08, P(0xffffff), 0, 0.6, 0.53);
    for (const s of [-1, 1]) B(torso, 0.1, 2.0, 0.06, P(0x7b1fa2), s * 0.45, -0.2, 0.52);
    for (const a of arms) B(a, 1.3, 1.6, 1.3, P(def.shirt), 0, -0.85, 0);
    // Gavel (right): handle up, head across the top.
    B(R, 0.14, 0.14, 1.4, wood, 0, -2.1, 0.6);
    C(R, 0.25, 0.25, 0.8, P(0x5d4037), 0, -2.1, 1.35, 10).rotation.z = Math.PI / 2;
    // Bell (left): a gold bell hanging under the hand.
    B(L, 0.14, 0.14, 0.6, wood, 0, -2.1, 0.0);
    C(L, 0.2, 0.55, 0.75, P(0xffc107), 0, -2.1, -0.65, 12).rotation.x = Math.PI / 2;
    S(L, 0.12, P(0x8d6e63), 0, -2.1, -1.08);
  }

  if (look === 'executioner') {
    // A pointed black hood with eye holes, leather straps on a bare chest, and a huge axe.
    headBox.visible = false;
    const hood = P(0x161616);
    B(head, 1.3, 1.3, 1.3, hood, 0, 0.62, 0);
    K(head, 0.62, 0.9, hood, 0, 1.65, -0.05, 4).rotation.y = Math.PI / 4;
    for (const s of [-1, 1]) {
      B(head, 0.3, 0.2, 0.06, P(0x000000), s * 0.27, 0.74, 0.66);
      B(head, 0.1, 0.1, 0.06, G(0xff1744, 1), s * 0.27, 0.74, 0.68);
    }
    B(torso, 1.9, 1.2, 0.06, P(def.skin), 0, 0.35, 0.51); // bare chest
    const strap = P(0x4e342e);
    for (const s of [-1, 1]) B(torso, 0.25, 2.5, 1.06, strap, 0, 0, 0).rotation.z = s * 0.65;
    B(torso, 2.08, 0.35, 1.08, strap, 0, -0.85, 0);
    B(torso, 0.4, 0.35, 0.1, P(0x9e9e9e), 0, -0.85, 0.55);
    for (const a of arms) B(a, 1.12, 0.6, 1.12, strap, 0, -1.4, 0);
    // The axe: long handle, huge half-moon blade.
    B(R, 0.22, 0.22, 5.2, P(0x3e2723), 0, -2.1, 1.2);
    B(R, 0.14, 2.0, 2.0, steel, 0, -3.1, 3.2);
    B(R, 0.12, 1.2, 2.6, steel, 0, -3.7, 3.2);
    B(R, 0.16, 0.3, 2.4, P(0xcfd8dc), 0, -4.3, 3.2);
    for (const z of [2.2, 4.2]) B(R, 0.17, 0.3, 0.3, P(0x6d1b1b), 0, -3.4, z);
  }

  if (look === 'worker') {
    // Yellow hard hat, hi-vis vest with shiny stripes, a tool belt and a big wrench.
    const yel = P(0xffd600);
    const shine = G(0xe0e0e0, 0.35);
    S(head, 0.72, yel, 0, 1.1, 0).scale.set(1, 0.6, 1);
    C(head, 0.85, 0.85, 0.08, yel, 0, 1.0, 0.08, 14);
    B(head, 0.15, 0.2, 1.3, yel, 0, 1.45, 0);
    for (const y of [-0.3, 0.25]) B(torso, 2.06, 0.18, 1.06, shine, 0, y, 0);
    for (const s of [-1, 1]) B(torso, 0.18, 2.0, 1.06, shine, s * 0.5, 0, 0);
    sleeves(h, P(0x1565c0), 1.0);
    B(torso, 2.1, 0.3, 1.1, P(0x6d4c41), 0, -0.9, 0);
    for (const x of [-0.7, 0.6]) B(torso, 0.4, 0.45, 0.3, P(0x795548), x, -1.1, 0.55);
    B(torso, 0.1, 0.6, 0.1, steel, 0.6, -1.2, 0.7);
    for (const a of arms) B(a, 1.12, 0.45, 1.12, P(0xfbc02d), 0, -1.82, 0); // gloves
    for (const l of legs) B(l, 1.1, 0.5, 1.25, P(0x5d4037), 0, -1.8, 0.1);
    // Wrench.
    B(R, 0.22, 0.12, 2.0, steel, 0, -2.1, 0.8);
    B(R, 0.6, 0.18, 0.3, steel, 0, -2.1, 1.85);
    for (const s of [-1, 1]) B(R, 0.16, 0.18, 0.4, steel, s * 0.22, -2.1, 2.1);
  }

  if (look === 'nailHead') {
    // A pale head full of nails, sunken eyes, stitches, more nails in the shoulders.
    const iron = P(0x78909c);
    for (const s of [-1, 1]) {
      B(head, 0.3, 0.26, 0.05, P(0x1a1a1a), s * 0.26, 0.74, 0.61);
      B(head, 0.08, 0.08, 0.06, G(0x80d8ff, 1), s * 0.26, 0.74, 0.63);
    }
    B(head, 0.5, 0.06, 0.05, black, 0, 0.3, 0.61);
    for (let i = 0; i < 4; i++) B(head, 0.04, 0.16, 0.05, black, -0.18 + i * 0.12, 0.3, 0.62);
    let n = 0;
    for (let i = 0; i < 18; i++) {
      const u = (i * 2.399) % (Math.PI * 2); // spread round the head
      const v = 0.25 + ((i * 0.37) % 1) * 1.0;
      const dx = Math.sin(u);
      const dz = Math.cos(u);
      if (dz > 0.6 && v < 0.95) continue; // keep the face clear
      nail(head, iron, dx * 0.55, 0.3 + v * 0.75, dz * 0.55, dx, 0.5 + v * 0.5, dz, 0.6 + (n++ % 3) * 0.15);
    }
    for (const [x, y, z, dx] of [[-0.8, 1.0, 0.1, -0.5], [0.85, 0.95, -0.1, 0.5], [-0.3, 0.6, 0.5, 0], [0.4, -0.2, 0.5, 0.2]]) nail(torso, iron, x, y, z, dx, z > 0 ? 0.3 : 1, z > 0 ? 1 : 0.2, 0.6);
    B(torso, 0.5, 0.5, 0.06, G(0x4fc3f7, 0.5), 0, 0.2, 0.52).rotation.z = Math.PI / 4; // shield mark
    for (const x of [-0.6, 0.5]) B(torso, 0.4, 0.3, 0.05, P(0x263238), x, -0.6, 0.52).rotation.z = x;
  }

  if (look === 'predator') {
    // Corrupted Predator: a long-jawed head with four purple eyes, back spines, glowing purple
    // cracks, claws and a long tail. Stalks hunched over.
    const dark = P(def.skin);
    const purp = P(def.shirt);
    const vein = G(0xd500f9, 0.9);
    headBox.visible = false;
    B(head, 1.2, 0.9, 1.6, dark, 0, 0.75, 0.25);
    B(head, 1.0, 0.6, 0.6, purp, 0, 1.1, -0.2);
    const jaw = grp(head, 0, 0.35, -0.2);
    B(jaw, 1.0, 0.3, 1.5, dark, 0, -0.1, 0.65);
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) {
      K(head, 0.06, 0.25, P(0xeeeeee), s * 0.42, 0.25, 0.4 + i * 0.22, 4).rotation.x = Math.PI;
      K(jaw, 0.06, 0.22, P(0xeeeeee), s * 0.38, 0.12, 0.25 + i * 0.22, 4);
    }
    for (const s of [-1, 1]) for (const y of [0.95, 0.75]) B(head, 0.18, 0.1, 0.06, vein, s * (y > 0.8 ? 0.3 : 0.4), y, 1.06);
    for (let i = 0; i < 6; i++) K(torso, 0.2, 0.9 - i * 0.08, purp, 0, 1.0 - i * 0.4, -0.55, 4).rotation.x = -1.1;
    for (const s of [-1, 1]) K(torso, 0.25, 0.9, purp, s * 1.05, 1.2, 0, 5).rotation.z = -s * 0.5;
    for (const [x, y, r] of [[-0.4, 0.3, 0.6], [0.3, -0.3, -0.5], [0.5, 0.5, 0.3]]) B(torso, 0.08, 0.8, 0.05, vein, x, y, 0.52).rotation.z = r;
    for (const a of arms) {
      B(a, 1.15, 1.6, 1.15, purp, 0, -0.8, 0);
      B(a, 0.06, 1.0, 1.17, vein, 0.3, -1.0, 0);
      for (const x of [-0.35, 0, 0.35]) K(a, 0.1, 0.6, P(0xe0e0e0), x, -2.3, 0.3, 4).rotation.x = Math.PI * 0.7;
    }
    for (const l of legs) for (const x of [-0.3, 0.3]) K(l, 0.1, 0.4, P(0xe0e0e0), x, -1.9, 0.65, 4).rotation.x = Math.PI / 2;
    const tail = grp(h.body, 0, 2.2, -0.5);
    for (let i = 0; i < 6; i++) B(tail, 0.5 - i * 0.06, 0.5 - i * 0.06, 0.6, i % 2 ? purp : dark, 0, -i * 0.12, -i * 0.5);
    K(tail, 0.2, 0.6, vein, 0, -0.75, -3.2, 4).rotation.x = -Math.PI / 2;
    beast(h, 0.5, (sw, t) => {
      tail.rotation.y = Math.sin(t * 2.5) * 0.35;
      jaw.rotation.x = 0.15 + Math.max(0, Math.sin(t * 1.7)) * 0.35;
    });
  }

  if (look === 'vile') {
    // Twitching Vile: thin and stretched, long neck, a crooked open mouth, and it jerks about.
    const rag = P(def.shirt);
    torso.scale.x = 0.7;
    for (const l of [...arms, ...legs]) l.scale.set(0.55, 1.15, 0.55);
    R.position.x = -1.05;
    L.position.x = 1.05;
    head.position.y = 4.55;
    B(torso, 0.35, 0.7, 0.35, P(def.skin), 0, 1.25, 0); // neck
    for (const s of [-1, 1]) {
      B(head, 0.28, 0.22, 0.06, black, s * 0.26, 0.75, 0.61);
      B(head, 0.08, 0.08, 0.06, G(0xe0f7fa, 1), s * 0.26 + 0.04, 0.76, 0.64);
    }
    B(head, 0.4, 0.45, 0.06, P(0x1a0505), 0.05, 0.28, 0.61).rotation.z = 0.25;
    for (let i = 0; i < 4; i++) K(torso, 0.12, 0.4, P(0xbdbdbd), 0, 0.8 - i * 0.45, -0.52, 4).rotation.x = -1.3;
    for (const [x, w] of [[-0.55, 0.4], [0.05, 0.35], [0.55, 0.4]]) B(torso, w, 0.5, 1.04, rag, x, -1.2, 0).rotation.z = x * 0.4;
    h.anim = (phase, t) => {
      const sw = Math.sin(phase);
      const j = (k) => Math.sin(t * 37 + k) * Math.sin(t * 5.3 + k * 2); // twitch
      const snap = Math.floor(t * 5) % 7; // sudden head snaps
      h.leftLeg.rotation.x = sw * 0.9;
      h.rightLeg.rotation.x = -sw * 0.9;
      R.rotation.x = -0.4 - sw * 0.7 + j(1) * 0.4;
      L.rotation.x = -0.4 + sw * 0.7 + j(2) * 0.4;
      R.rotation.z = -0.2 + j(3) * 0.3;
      L.rotation.z = 0.2 + j(4) * 0.3;
      head.rotation.z = (snap === 2 ? 0.7 : snap === 5 ? -0.5 : 0.15) + j(5) * 0.15;
      head.rotation.x = j(6) * 0.2;
      lean(h, 0.35 + j(7) * 0.08);
      h.body.position.y = Math.abs(Math.cos(phase)) * 0.2;
    };
  }

  if (look === 'dreadKnight') {
    // Dark plate armor: a horned helm with a red eye slit, layered shoulder plates, a tattered
    // cape and a greatsword.
    const plate = P(0x2b2f36);
    const edge = P(0x4a148c);
    const redG = G(0xff1744, 1);
    B(head, 1.4, 1.45, 1.4, plate, 0, 0.64, 0);
    B(head, 1.0, 0.14, 0.06, redG, 0, 0.78, 0.71);
    B(head, 0.12, 1.0, 0.1, plate, 0, 0.75, 0.74);
    for (const s of [-1, 1]) {
      B(head, 0.25, 0.7, 0.25, black, s * 0.75, 1.5, 0).rotation.z = -s * 0.6;
      B(head, 0.18, 0.5, 0.18, black, s * 1.05, 1.95, 0).rotation.z = -s * 0.15;
    }
    B(torso, 2.3, 2.1, 1.3, plate, 0, 0.05, 0);
    B(torso, 0.25, 1.9, 0.1, edge, 0, 0.05, 0.66);
    B(torso, 2.32, 0.15, 1.32, edge, 0, -0.95, 0);
    for (const a of arms) {
      B(a, 1.5, 0.6, 1.5, plate, 0, 0.0, 0);
      B(a, 1.4, 0.4, 1.4, edge, 0, -0.45, 0);
      B(a, 1.2, 0.8, 1.2, plate, 0, -1.6, 0);
      K(a, 0.18, 0.6, black, 0, 0.55, 0, 4);
    }
    for (const l of legs) {
      B(l, 1.15, 0.9, 1.15, plate, 0, -1.3, 0);
      B(l, 0.6, 0.4, 0.2, edge, 0, -0.6, 0.6);
    }
    for (const x of [-0.6, 0, 0.6]) B(torso, 0.6, 3.2 - Math.abs(x), 0.08, P(0x1a1a1a), x, -1.4 + Math.abs(x) / 2, -0.7);
    // Greatsword: long dark blade with a red glow line.
    B(R, 0.2, 0.2, 0.9, P(0x3e2723), 0, -2.1, 0.2);
    B(R, 1.0, 0.18, 0.18, black, 0, -2.1, 0.7);
    B(R, 0.12, 0.45, 3.4, P(0x37474f), 0, -2.1, 2.5);
    B(R, 0.14, 0.08, 3.0, redG, 0, -2.1, 2.4);
  }

  if (look === 'heretic') {
    // A hooded priest in a long magenta robe with gold trim, glowing eyes and a ringed staff.
    const robeM = P(def.shirt);
    const gold = P(0xffc107);
    const purpG = G(0xea80fc, 1);
    B(head, 1.5, 1.55, 1.4, robeM, 0, 0.72, -0.1);
    B(head, 1.0, 0.95, 0.1, P(0x0a0a0a), 0, 0.6, 0.62);
    for (const s of [-1, 1]) B(head, 0.16, 0.12, 0.06, purpG, s * 0.24, 0.72, 0.67);
    K(head, 0.5, 0.7, robeM, 0, 1.6, -0.35, 6).rotation.x = -0.4;
    robe(h, robeM, 2.7, 1.45);
    B(torso, 0.3, 2.0, 0.07, gold, 0, 0, 0.52);
    C(torso, 1.47, 1.47, 0.15, gold, 0, -3.25, 0, 12);
    for (const s of [-1, 1]) B(torso, 0.5, 2.0, 0.06, P(0x311b92), s * 0.6, 0.1, 0.52); // stole
    for (const a of arms) {
      B(a, 1.35, 1.7, 1.35, robeM, 0, -0.85, 0);
      B(a, 1.4, 0.15, 1.4, gold, 0, -1.7, 0);
    }
    // Staff: tall dark pole with a gold ring and a glowing orb.
    B(R, 0.18, 0.18, 6.0, P(0x2a1a10), 0, -2.1, 0.8);
    const ring = part(R, torus(0.6, 0.08), gold, 0, -2.1, 4.4);
    ring.rotation.y = Math.PI / 2;
    S(R, 0.3, purpG, 0, -2.1, 4.4);
  }

  if (look === 'nailGolem') {
    // A big stone golem studded with nails, glowing cracks and heavy fists.
    const rock = P(def.skin);
    const dark = P(shade(def.skin, 0.7));
    const iron = P(0x90a4ae);
    const crack = G(0xff6d00, 0.8);
    headBox.visible = false;
    B(head, 1.2, 1.0, 1.1, rock, 0, 0.45, 0.1);
    B(head, 0.8, 0.12, 0.06, crack, 0, 0.55, 0.67);
    B(torso, 2.7, 2.4, 1.6, rock, 0, 0.1, 0);
    B(torso, 1.4, 1.0, 1.7, dark, 0.5, 0.6, 0);
    B(torso, 1.0, 0.8, 1.7, dark, -0.6, -0.6, 0);
    for (const [x, y, r] of [[-0.4, 0.4, 0.5], [0.6, -0.4, -0.6], [0, -0.9, 0.1]]) B(torso, 0.08, 0.9, 0.06, crack, x, y, 0.82).rotation.z = r;
    for (const a of arms) {
      B(a, 1.5, 1.8, 1.5, rock, 0, -0.9, 0);
      B(a, 1.7, 0.9, 1.7, dark, 0, -1.95, 0);
    }
    for (const l of legs) B(l, 1.3, 2.0, 1.3, rock, 0, -1.0, 0);
    let n = 0;
    for (let i = 0; i < 14; i++) {
      const u = (i * 2.4) % (Math.PI * 2);
      const y = -0.9 + ((i * 0.43) % 1) * 2.0;
      nail(torso, iron, Math.sin(u) * 1.2, y, Math.cos(u) * 0.75, Math.sin(u), 0.2, Math.cos(u), 0.7 + (n++ % 3) * 0.15);
    }
    for (const a of arms) for (const [x, y, z] of [[0, 0.1, 0.5], [0.5, -1.0, 0], [-0.5, -1.6, 0.4]]) nail(a, iron, x * 1.2, y, z * 1.4, x || 0.1, 0.6, z || 0.4, 0.7);
    for (const [x, z] of [[-0.4, 0], [0.3, 0.2], [0, -0.4]]) nail(head, iron, x, 0.95, z, x, 1, z, 0.6);
  }
}
