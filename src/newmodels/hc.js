import * as THREE from 'three';
import { boxGeo, part, glow, creature, cylGeo } from '../models.js';

// Hardcore mode enemy models (2026-11-09 spec, see hardcore.js). Every helper from models.js is
// only called inside functions (models.js imports this file, so the imports aren't ready at load).
// Characters face +Z. The humanoid kit (hcParts) dresses a makeZombie humanoid from def.hk; the
// creature makers build the non-human ones (def.model).

const GEO = new Map();
const geo = (key, make) => {
  let g = GEO.get(key);
  if (!g) GEO.set(key, (g = make()));
  return g;
};
const sphere = (r, w = 14, h = 10) => geo(`s${r}|${w}|${h}`, () => new THREE.SphereGeometry(r, w, h));
const torus = (r, t) => geo(`t${r}|${t}`, () => new THREE.TorusGeometry(r, t, 8, 24));
const octa = (r) => geo(`o${r}`, () => new THREE.OctahedronGeometry(r, 0));
const cone = (r, len, seg = 8) => geo(`c${r}|${len}|${seg}`, () => new THREE.ConeGeometry(r, len, seg));
const B = (p, w, h, d, m, x = 0, y = 0, z = 0) => part(p, boxGeo(w, h, d), m, x, y, z);

/** Material makers for a model: plain (cached per color), glowing, and see-through. */
function mats(h) {
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
  const S = (c, op = 0.35, glowing = false) => {
    const m = glowing ? glow(h, c) : h.M(c);
    m.transparent = true;
    m.opacity = op;
    m.depthWrite = false;
    m.userData.keepOpacity = op;
    return m;
  };
  return { P, G, S };
}

/** A blade (or handle) held in an arm group: the zombie pose points arms forward, so local +Z is up. */
function held(arm, len, w, m, up = 0.6) {
  return B(arm, w, w * 0.6, len, m, 0, -2.2, up + len / 2 - 0.5);
}

/**
 * Hardcore outfit kit for humanoid enemies (def.hk): every key is a piece of the look, mostly
 * with its color as the value. See the keys below.
 */
export function hcParts(h, def) {
  const k = def.hk;
  const { P, G, S } = mats(h);
  const { torso, head } = h;
  const arms = [h.rightArm, h.leftArm];
  const legs = [h.rightLeg, h.leftLeg];
  const limbs = [...arms, ...legs];
  const headBox = head.children[0];
  // ---- heads and faces
  if (k.skull) {
    const dark = P(0x3e3a30);
    for (const y of [0.45, 0.1, -0.25]) B(torso, 1.5, 0.12, 0.06, dark, 0, y, 0.52);
    B(torso, 0.14, 1.6, 0.06, dark, 0, 0.1, 0.53);
    for (const l of limbs) B(l, 1.02, 0.08, 1.02, dark, 0, -1, 0);
  }
  if (k.hood) B(head, 1.45, 1.45, 1.35, P(k.hood), 0, 0.7, -0.12);
  if (k.eyes) for (const s of [-1, 1]) B(head, 0.2, 0.2, 0.06, G(k.eyes), s * 0.27, 0.72, 0.64);
  if (k.fourEyes) for (const s of [-1, 1]) for (const y of [0.85, 0.55]) B(head, 0.16, 0.12, 0.06, G(k.fourEyes), s * 0.25, y, 0.64);
  if (k.sixEyes) for (const s of [-1, 1]) for (const y of [0.95, 0.72, 0.49]) B(head, 0.15, 0.1, 0.06, G(k.sixEyes), s * (0.18 + (y === 0.72 ? 0.12 : 0)), y, 0.66);
  if (k.visor) B(head, 1.05, 0.2, 0.08, G(k.visor), 0, 0.75, 0.64);
  if (k.mask) B(head, 1.25, 0.62, 0.1, P(k.mask), 0, 0.42, 0.65);
  if (k.breather) {
    B(head, 0.5, 0.4, 0.3, P(k.breather), 0, 0.35, 0.72);
    for (const s of [-1, 1]) B(head, 0.25, 0.25, 0.25, P(k.breather), s * 0.35, 0.35, 0.7);
  }
  if (k.faceHole) B(head, 0.5, 0.5, 0.06, P(0x050505), 0, 0.65, 0.64);
  if (k.bigEye) {
    headBox.visible = false;
    B(head, 1.25, 1.25, 1.25, P(0x111111), 0, 0.6, 0);
    part(head, sphere(0.48), P(0xfafafa), 0, 0.62, 0.42).scale.set(1, 1, 0.5);
    B(head, 0.5, 0.5, 0.06, G(k.bigEye), 0, 0.62, 0.66);
    B(head, 0.1, 0.38, 0.06, P(0x050505), 0, 0.62, 0.7);
  }
  if (k.lockHead) {
    headBox.visible = false;
    B(head, 1.7, 1.4, 1.3, G(k.lockHead, 0.35), 0, 0.75, 0);
    part(head, torus(0.55, 0.13), P(0x9e9e9e), 0, 1.6, 0);
    B(head, 0.3, 0.3, 0.06, G(0xd500f9), 0, 0.85, 0.68);
    B(head, 0.14, 0.45, 0.06, G(0xd500f9), 0, 0.55, 0.68);
  }
  if (k.pumpkin) {
    headBox.visible = false;
    B(head, 1.6, 1.4, 1.6, P(k.pumpkin), 0, 0.7, 0);
    B(head, 0.2, 0.4, 0.2, P(0x33691e), 0, 1.55, 0);
    for (const s of [-1, 1]) B(head, 0.3, 0.25, 0.06, G(0xffea00), s * 0.35, 0.9, 0.82);
    B(head, 0.9, 0.2, 0.06, G(0xffea00), 0, 0.4, 0.82);
    for (const [x, z] of [[-0.4, 0], [0.3, 0.2], [0, -0.3]]) B(head, 0.3, 0.6, 0.3, G(0xff6d00), x, 1.75, z);
  }
  if (k.flameHead) for (const [x, y, z, s] of [[0, 1.6, 0, 0.5], [-0.3, 1.45, 0.1, 0.35], [0.3, 1.5, -0.1, 0.35]]) B(head, s, s * 1.4, s, G(k.flameHead), x, y, z);
  if (k.horns) {
    for (const s of [-1, 1]) {
      const hm = P(k.horns);
      const a = B(head, 0.24, 0.7, 0.24, hm, s * 0.5, 1.45, 0);
      a.rotation.z = -s * 0.45;
      const b = B(head, 0.16, 0.45, 0.16, hm, s * 0.82, 1.85, 0);
      b.rotation.z = -s * 0.9;
    }
  }
  if (k.crown) {
    const c = G(k.crown, 0.35);
    B(head, 1.35, 0.25, 1.35, c, 0, 1.3, 0);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(head, 0.22, 0.4, 0.22, c, x * 0.55, 1.55, z * 0.55);
  }
  if (k.halo) part(head, torus(0.65, 0.08), G(k.halo), 0, 1.75, 0).rotation.x = Math.PI / 2;
  if (k.helmet) B(head, 1.4, 0.6, 1.4, P(k.helmet), 0, 1.25, 0);
  if (k.beakHelm) {
    B(head, 1.4, 0.7, 1.4, P(k.beakHelm), 0, 1.15, 0);
    B(head, 0.5, 0.35, 0.5, P(k.beakHelm), 0, 0.7, 0.8);
  }
  if (k.headset) {
    for (const s of [-1, 1]) B(head, 0.15, 0.45, 0.45, P(k.headset), s * 0.66, 0.65, 0);
    B(head, 0.08, 0.08, 0.5, P(k.headset), 0.62, 0.45, 0.45);
  }
  if (k.plume) B(head, 0.25, 0.7, 1.0, G(k.plume, 0.4), 0, 1.6, -0.1);
  if (k.wizardHat) {
    B(head, 1.8, 0.15, 1.8, P(k.wizardHat), 0, 1.25, 0);
    part(head, cone(0.6, 1.6), P(k.wizardHat), 0, 2.1, 0);
  }
  if (k.emperorHelm) {
    B(head, 1.5, 1.0, 1.5, P(k.emperorHelm), 0, 0.9, 0);
    for (const [x, hgt] of [[-0.55, 0.7], [-0.25, 0.9], [0, 1.1], [0.25, 0.9], [0.55, 0.7]]) B(head, 0.18, hgt, 0.18, P(k.emperorHelm), x, 1.4 + hgt / 2, 0.55);
  }
  if (k.xVisor) for (const s of [-1, 1]) B(head, 1.1, 0.14, 0.06, G(k.xVisor), 0, 0.7, 0.78).rotation.z = s * 0.6;
  if (k.hair) {
    B(head, 1.35, 0.5, 1.35, P(k.hair), 0, 1.25, -0.05);
    B(head, 1.35, 1.5, 0.3, P(k.hair), 0, 0.3, -0.65);
  }
  if (k.shards) for (const [x, z, r] of [[-0.3, 0, 0.3], [0.25, 0.2, -0.4], [0, -0.3, 0.1]]) B(head, 0.18, 0.7, 0.18, P(k.shards), x, 1.5, z).rotation.z = r;
  if (k.extraHeads) for (const s of [-1, 1]) {
    B(torso, 0.9, 0.9, 0.9, P(k.extraHeads), s * 1.35, 1.6, -0.1);
    for (const e of [-1, 1]) B(torso, 0.14, 0.14, 0.06, G(0xff1744), s * 1.35 + e * 0.2, 1.7, 0.36);
  }
  // ---- body
  if (k.armor) {
    const am = P(k.armor);
    B(torso, 2.25, 1.8, 1.2, am, 0, 0.1, 0);
    for (const s of [-1, 1]) B(torso, 1.0, 0.55, 1.3, am, s * 1.35, 1.0, 0);
    for (const l of limbs) B(l, 1.12, 0.9, 1.12, am, 0, -1.4, 0);
    if (k.trim) {
      const tm = G(k.trim, 0.5);
      for (const y of [0.6, -0.4]) B(torso, 2.27, 0.08, 1.22, tm, 0, y, 0);
      for (const l of limbs) B(l, 1.14, 0.08, 1.14, tm, 0, -1.1, 0);
    }
  }
  if (k.coat) {
    B(torso, 2.1, 2.0, 1.1, P(k.coat), 0, 0, 0);
    B(torso, 2.1, 1.0, 1.1, P(k.coat), 0, -1.4, 0);
  }
  if (k.glowShirt) {
    const gm = G(k.glowShirt, 0.6);
    B(torso, 2.04, 2.04, 1.04, S(k.glowShirt, 0.45, true), 0, 0, 0);
    for (const l of legs) B(l, 0.2, 1.8, 1.04, gm, 0, -1, 0);
  }
  if (k.robe) {
    for (const l of legs) l.visible = false;
    B(torso, 2.0, 2.4, 1.1, P(k.robe), 0, -2.2, 0);
  }
  if (k.ghostTail) {
    for (const l of legs) l.visible = false;
    const tm = S(k.ghostTail, 0.6);
    B(torso, 1.6, 1.0, 0.9, tm, 0, -1.4, 0);
    B(torso, 1.0, 0.9, 0.6, tm, 0, -2.2, -0.2);
  }
  if (k.cape) B(torso, 1.9, 3.2, 0.12, P(k.cape), 0, -0.6, -0.6);
  if (k.scarf) {
    B(torso, 2.1, 0.45, 1.15, P(k.scarf), 0, 0.85, 0);
    B(torso, 0.45, 1.2, 0.1, P(k.scarf), 0.5, 0.1, 0.58);
  }
  if (k.gem) B(torso, 0.45, 0.45, 0.08, G(k.gem), 0, 0.35, 0.62);
  if (k.rune) {
    B(torso, 0.7, 0.7, 0.06, G(k.rune), 0, 0.3, 0.62).rotation.z = Math.PI / 4;
    B(torso, 0.35, 0.35, 0.07, P(0x050505), 0, 0.3, 0.63).rotation.z = Math.PI / 4;
  }
  if (k.chestHole) B(torso, 0.7, 0.7, 0.06, P(0x050505), 0, 0.2, 0.52);
  if (k.spikes) for (const s of [-1, 1]) for (const z of [-0.25, 0.25]) B(torso, 0.22, 0.6, 0.22, P(k.spikes), s * 1.45, 1.4, z).rotation.z = -s * 0.4;
  if (k.crystals) {
    const cm = G(k.crystals, 0.6);
    for (const s of [-1, 1]) {
      part(torso, octa(0.35), cm, s * 1.3, 1.35, 0).scale.set(0.7, 1.6, 0.7);
      part(torso, octa(0.25), cm, s * 0.6, 1.2, -0.5).scale.set(0.7, 1.6, 0.7);
    }
  }
  if (k.veins) for (const [x, y, l, a] of [[-0.5, 0.3, 1, 0.4], [0.4, -0.2, 0.9, -0.5], [0.1, 0.6, 0.6, 0.1]]) B(torso, 0.08, l, 0.05, P(k.veins), x, y, 0.52).rotation.z = a;
  if (k.stitches) for (const [x, y] of [[-0.4, 0.4], [0.3, -0.2]]) for (let i = 0; i < 4; i++) B(torso, 0.06, 0.25, 0.05, P(k.stitches), x + i * 0.15, y, 0.52);
  if (k.bandages) for (const y of [0.6, 0.1, -0.4]) B(torso, 2.04, 0.18, 1.04, P(k.bandages), 0, y, 0).rotation.z = 0.12;
  if (k.chains || k.belts) {
    const cm = P(k.chains ?? k.belts);
    B(torso, 2.5, 0.16, 1.1, cm, 0, 0.2, 0).rotation.z = 0.7;
    B(torso, 2.5, 0.16, 1.1, cm, 0, -0.2, 0).rotation.z = -0.7;
    for (const a of arms) B(a, 1.04, 0.15, 1.04, cm, 0, -1.6, 0);
  }
  if (k.flowers) for (const [p, x, y] of [[torso, -0.6, 0.6], [torso, 0.5, -0.3], [torso, 0.1, 0.9], [h.leftArm, 0, -0.9], [h.rightLeg, 0, -0.6], [head, 0.4, 1.25]]) {
    B(p, 0.3, 0.3, 0.3, G(k.flowers, 0.5), x, y, p === torso ? 0.55 : 0.5);
  }
  if (k.vines) for (const l of limbs) for (const y of [-0.5, -1.3]) B(l, 1.04, 0.12, 1.04, P(k.vines), 0, y, 0).rotation.y = y;
  if (k.swarm) {
    const sm = P(k.swarm);
    for (let i = 0; i < 14; i++) {
      const p = [torso, ...limbs][i % 5];
      B(p, 0.25, 0.4, 0.25, sm, ((i * 37) % 9) / 9 - 0.45, p === torso ? ((i * 53) % 9) / 6 - 0.7 : -0.3 - ((i * 29) % 7) / 4, 0.55);
    }
  }
  if (k.manyEyes) for (let i = 0; i < 12; i++) {
    const p = [torso, head, ...limbs][i % 6];
    const x = ((i * 37) % 9) / 10 - 0.4;
    const y = p === head ? 0.4 + (i % 2) * 0.4 : p === torso ? ((i * 53) % 9) / 6 - 0.7 : -0.5 - ((i * 29) % 5) / 4;
    const z = p === head ? 0.62 : p === torso ? 0.52 : 0.52;
    B(p, 0.22, 0.18, 0.05, G(0xffffff, 0.3), x, y, z);
    B(p, 0.1, 0.1, 0.05, P(0x050505), x, y, z + 0.02);
  }
  if (k.mark) {
    // A question mark on the chest (Mystery).
    const mm = G(k.mark, k.mark === 0x111111 ? 0 : 0.6);
    B(torso, 0.6, 0.14, 0.06, mm, 0, 0.75, 0.53);
    B(torso, 0.14, 0.35, 0.06, mm, 0.25, 0.55, 0.53);
    B(torso, 0.14, 0.3, 0.06, mm, 0, 0.25, 0.53);
    B(torso, 0.14, 0.14, 0.06, mm, 0, -0.1, 0.53);
  }
  if (k.xMark) for (const s of [-1, 1]) B(torso, 1.2, 0.16, 0.06, G(k.xMark), 0, 0.2, 0.53).rotation.z = s * 0.75;
  if (k.sparks) for (const [x, y, z] of [[-1.5, 4.8, 0.5], [1.4, 3.6, -0.4], [-1.2, 2.4, -0.6], [1.6, 5.2, 0.3]]) B(h.body, 0.18, 0.18, 0.18, G(k.sparks), x, y, z);
  if (k.armless) for (const a of arms) a.visible = false;
  if (k.metalArm) B(h.leftArm, 1.15, 2.1, 1.15, P(k.metalArm), 0, -1, 0);
  if (k.fourArms) {
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(s * 1.4, 3.1, 0);
      g.rotation.x = -Math.PI / 2.2;
      h.body.add(g);
      B(g, 0.8, 1.8, 0.8, P(def.shirt), 0, -0.9, 0);
    }
  }
  if (k.fireHands) for (const a of arms) B(a, 0.7, 0.7, 0.7, G(k.fireHands), 0, -2.2, 0);
  if (k.bubble) part(h.body, sphere(3.2, 16, 12), S(k.bubble, 0.22, true), 0, 2.8, 0).scale.set(1, 1.15, 1);
  if (k.clear) for (const m of h.mats) {
    m.transparent = true;
    m.opacity = k.clear;
    m.depthWrite = false;
    m.userData.keepOpacity = k.clear;
  }
  // ---- carried things (right hand = rightArm, left = leftArm)
  const R = h.rightArm;
  const L = h.leftArm;
  if (k.dagger) held(R, 1.3, 0.22, G(k.dagger, 0.5));
  if (k.sword) held(R, 2.2, 0.25, P(k.sword));
  if (k.bigSword) held(R, 3.6, 0.4, k.swordGlow ? G(k.bigSword, 0.6) : P(k.bigSword));
  if (k.broadsword) {
    held(R, 4.5, 0.7, P(k.broadsword));
    B(R, 1.2, 0.3, 0.25, G(0xd500f9), 0, -2.2, 0.4);
  }
  if (k.knives) for (const a of arms) held(a, 1.6, 0.18, P(k.knives), 0.3);
  if (k.shield) B(L, 0.25, 2.2, 1.8, P(k.shield), 0.6, -1.4, 0.4);
  if (k.hammer) {
    held(R, 2.6, 0.2, P(0x5d4037));
    B(R, 1.4, 0.9, 0.9, P(k.hammer), 0, -2.2, 2.6);
  }
  if (k.axe) {
    held(R, 2.6, 0.2, P(0x5d4037));
    B(R, 0.15, 1.2, 1.1, P(k.axe), 0, -1.6, 2.4);
  }
  if (k.spear) {
    held(R, 4.2, 0.18, P(0x5d4037));
    part(R, cone(0.3, 1), G(k.spear, 0.6), 0, -2.2, 4.2).rotation.x = Math.PI / 2;
  }
  if (k.poleaxe) {
    held(R, 4.4, 0.2, P(k.poleaxe));
    B(R, 0.15, 1.4, 1.3, P(k.poleaxe), 0, -1.6, 4);
    B(R, 0.16, 0.3, 0.3, G(0xff1744), 0, -2.2, 3.4);
  }
  if (k.staff) {
    held(R, 3.4, 0.18, P(0x3e2723));
    part(R, sphere(0.35), G(k.staff), 0, -2.2, 3.4);
  }
  if (k.scythe) {
    held(R, 3.6, 0.16, P(0x3e2723));
    B(R, 0.12, 1.6, 0.25, P(k.scythe), 0, -1.4, 3.5);
  }
  if (k.book) B(L, 0.9, 0.3, 1.1, P(k.book), 0, -2.3, 0.2);
  if (k.gun) {
    held(R, 2.0, 0.3, P(k.gun), 0.2);
  }
  if (k.minigun) for (const x of [-0.2, 0.2]) B(L, 0.18, 0.18, 2.2, P(k.minigun), x, -2.2, 0.6);
  if (k.cannon) {
    B(L, 1.0, 1.0, 1.0, P(k.cannon), 0, -1.6, 0);
    B(L, 0.45, 0.45, 1.6, P(k.cannon), 0, -2.3, 0.6);
  }
  if (k.launcher) {
    B(torso, 0.8, 0.8, 2.4, P(k.launcher), 1.4, 1.5, -0.2);
    B(torso, 0.6, 0.6, 0.06, P(0x050505), 1.4, 1.5, 1.0);
  }
  // ---- on the back / above
  if (k.propeller) {
    B(torso, 0.2, 1.2, 0.2, P(0x424242), 0, 1.4, -0.6);
    B(torso, 3.4, 0.08, 0.35, P(k.propeller), 0, 2.05, -0.6);
    if (k.propeller2) B(torso, 0.35, 0.08, 3.4, P(k.propeller), 0, 2.07, -0.6);
  }
  if (k.jetpack) for (const s of [-1, 1]) {
    B(torso, 0.6, 1.4, 0.6, P(k.jetpack), s * 0.45, 0, -0.85);
    B(torso, 0.4, 0.3, 0.4, G(0xff6d00), s * 0.45, -0.85, -0.85);
  }
  if (k.backpack) {
    B(torso, 1.4, 1.6, 0.7, P(0x424242), 0, 0.1, -0.85);
    B(torso, 1.0, 0.4, 0.06, G(k.backpack), 0, 0.3, -1.22);
  }
  if (k.nuke) {
    B(torso, 0.8, 1.6, 0.8, P(0x424242), 0, 0.1, -0.9);
    B(torso, 0.82, 0.3, 0.82, G(k.nuke), 0, 0.3, -0.9);
  }
  if (k.tombstone) B(torso, 1.4, 2.2, 0.4, P(k.tombstone), 0, 0.6, -0.9);
  if (k.balloon) {
    B(h.body, 0.05, 2.4, 0.05, P(0xeeeeee), 0.8, 6.6, 0);
    part(h.body, sphere(1.1), G(k.balloon, 0.3), 0.8, 8.6, 0).scale.set(1, 1.15, 1);
  }
  if (k.pod) {
    part(h.body, sphere(1.6), G(k.pod, 0.6), 0, 7.6, 0).scale.set(1.2, 0.8, 1.2);
    for (const s of [-1, 1]) B(h.body, 0.08, 1.8, 0.08, G(k.pod, 0.4), s * 0.7, 5.8, 0);
  }
  if (def.wings && k.robe) for (const w of h.wings ?? []) w.scale.set(1.6, 1.5, 1); // Demise: huge ragged wings
}

// ------------------------------------------------------------------ creatures (def.model)

/** Tower Heroes Rune: a floating jagged black shard with a glowing purple rune and little squares around it. */
export function makeRuneModel(def) {
  const h = creature();
  const { P, G } = mats(h);
  const core = new THREE.Group();
  core.position.y = 2;
  h.body.add(core);
  const shard = part(core, octa(1), P(0x111111), 0, 0, 0);
  shard.scale.set(0.8, 1.5, 0.45);
  const g = G(def.skin);
  B(core, 0.55, 0.55, 0.06, g, 0, 0.1, 0.42).rotation.z = Math.PI / 4;
  if (def.glyph >= 2) {
    B(core, 0.08, 0.5, 0.07, P(0x111111), 0, 0.1, 0.45);
    B(core, 0.5, 0.08, 0.07, P(0x111111), 0, 0.1, 0.45);
  }
  if (def.glyph >= 3) for (let i = 0; i < 4; i++) B(core, 0.12, 0.45, 0.06, g, Math.cos((i * Math.PI) / 2) * 0.55, 0.1 + Math.sin((i * Math.PI) / 2) * 0.55, 0.38).rotation.z = (i * Math.PI) / 2;
  const bits = [];
  for (let i = 0; i < 4; i++) bits.push(B(core, 0.25, 0.25, 0.25, i % 2 ? g : P(0x1c1c1c), 0, 0, 0));
  h.anim = (phase, t) => {
    core.position.y = 2 + Math.sin(t * 2 + phase * 0.1) * 0.25;
    core.rotation.y = Math.sin(t * 0.8) * 0.4;
    bits.forEach((b, i) => {
      const a = t * 1.5 + (i * Math.PI) / 2;
      b.position.set(Math.cos(a) * 1.2, Math.sin(a * 1.3) * 0.5, Math.sin(a) * 0.6);
    });
  };
  return h;
}

/** Dark Matter: a glossy dark navy-black puddle blob with two glowing white slit eyes. */
export function makeBlobModel(def) {
  const h = creature();
  const { G } = mats(h);
  const m = h.M(def.skin);
  const blob = new THREE.Group();
  h.body.add(blob);
  part(blob, sphere(1.2), m, 0, 0.7, 0).scale.set(1.3, 0.65, 1.3);
  part(blob, sphere(0.8), m, 0, 1.25, 0).scale.set(1, 0.8, 1);
  for (const s of [-1, 1]) B(blob, 0.12, 0.38, 0.06, G(0xffffff), s * 0.28, 1.35, 0.72).rotation.z = s * 0.2;
  h.anim = (phase) => {
    const s = Math.sin(phase * 1.2);
    blob.scale.set(1 + s * 0.06, 1 - s * 0.08, 1 + s * 0.06);
  };
  return h;
}

/** Void Sentry: a round grey head with a black skull face on a ring of spiky metal legs (Cracked: a ghost rises out). */
export function makeSentryModel(def) {
  const h = creature();
  const { P, G, S } = mats(h);
  const grey = P(def.skin);
  const head = part(h.body, sphere(1.1), grey, 0, 2.1, 0);
  B(h.body, 0.9, 0.7, 0.1, P(0x111111), 0, 2.15, 1.05);
  for (const s of [-1, 1]) B(h.body, 0.22, 0.22, 0.06, P(0x9e9e9e), s * 0.22, 2.25, 1.11);
  const legs = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const leg = part(h.body, cone(0.18, 1.5), P(0x757575), Math.cos(a) * 1.1, 0.7, Math.sin(a) * 1.1);
    leg.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
    legs.push(leg);
  }
  let ghost = null;
  if (def.cracked) {
    head.scale.set(1, 0.8, 1);
    for (const [x, z] of [[-0.4, 0.3], [0.3, -0.2]]) B(h.body, 0.08, 0.7, 0.06, P(0x111111), x, 2.6, 0.95 + z * 0.2).rotation.z = x;
    ghost = new THREE.Group();
    ghost.position.y = 3.3;
    h.body.add(ghost);
    part(ghost, sphere(0.55), S(0x111111, 0.7), 0, 0, 0).scale.set(1, 1.3, 1);
    for (const s of [-1, 1]) B(ghost, 0.12, 0.14, 0.05, G(0xffffff), s * 0.18, 0.15, 0.5);
  }
  h.anim = (phase, t) => {
    h.body.position.y = Math.abs(Math.sin(phase)) * 0.15;
    legs.forEach((l, i) => (l.position.y = 0.7 + Math.max(0, Math.sin(phase * 2 + i)) * 0.2));
    if (ghost) ghost.position.y = 3.3 + Math.sin(t * 2) * 0.2;
  };
  return h;
}

/** Seer / Eye / Void Eye / Grand Eye: a giant floating eyeball with a colored iris and slit pupil. */
export function makeEyeModel(def) {
  const h = creature();
  const { P, G, S } = mats(h);
  const core = new THREE.Group();
  core.position.y = 2.4;
  h.body.add(core);
  part(core, sphere(1.3, 18, 14), P(def.skin), 0, 0, 0);
  part(core, sphere(0.62, 14, 10), G(def.iris, 0.6), 0, 0, 0.95).scale.set(1, 1, 0.5);
  B(core, 0.16, 0.8, 0.1, P(0x050505), 0, 0, 1.28);
  if (def.veins) for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    B(core, 0.06, 0.7, 0.05, G(def.veins, 0.4), Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0.75).rotation.z = a + Math.PI / 2;
  }
  if (def.nerve) {
    // Eye (Ranked Up): its nerve still trails behind it.
    for (let i = 0; i < 4; i++) B(core, 0.3 - i * 0.05, 0.3 - i * 0.05, 0.6, P(0xc62828), 0, -0.1 * i, -1.4 - i * 0.5);
  }
  if (def.spiky) for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const sp = part(core, cone(0.22, 1.1), P(i % 3 ? 0x111111 : 0xff4081), Math.cos(a) * 1.35, Math.sin(a) * 1.35, -0.2);
    sp.rotation.z = a - Math.PI / 2;
  }
  const tents = [];
  if (def.tentacles) for (let i = 0; i < 5; i++) tents.push(B(core, 0.25, 2.2, 0.25, S(def.tentacles, 0.45, true), (i - 2) * 0.45, -2, -0.2));
  h.anim = (phase, t) => {
    core.position.y = 2.4 + Math.sin(t * 2 + phase * 0.05) * 0.3;
    core.rotation.y = Math.sin(t * 0.7) * 0.25;
    tents.forEach((x, i) => (x.rotation.x = Math.sin(t * 3 + i) * 0.4));
  };
  return h;
}

/** Skeleworm: a horned, fanged head (seg 'head') or one rib-spine segment of the worm's body. */
export function makeWormModel(def) {
  const h = creature();
  const { P, G } = mats(h);
  const bone = P(def.skin);
  const rib = P(def.rib);
  const g = new THREE.Group();
  h.body.add(g);
  if (def.seg === 'head') {
    part(g, sphere(1.1), bone, 0, 1.3, 0.2);
    B(g, 1.3, 0.3, 0.3, P(0x111111), 0, 1.0, 1.1);
    for (let i = -2; i <= 2; i++) B(g, 0.14, 0.3, 0.1, rib, i * 0.24, 0.95, 1.22);
    for (const s of [-1, 1]) {
      B(g, 0.2, 0.7, 0.2, rib, s * 0.6, 2.3, 0).rotation.z = -s * 0.5;
      B(g, 0.22, 0.22, 0.06, def.eyeC ? G(def.eyeC) : P(0x111111), s * 0.35, 1.6, 1.12);
    }
  } else {
    B(g, 0.5, 0.5, 2.4, bone, 0, 1.3, 0);
    for (const z of [-0.8, 0, 0.8]) for (const s of [-1, 1]) B(g, 1.1, 0.15, 0.15, rib, s * 0.55, 1.1, z).rotation.z = s * -0.6;
  }
  h.anim = (phase) => {
    g.position.y = Math.sin(phase * 1.4) * 0.25;
    g.rotation.y = Math.sin(phase) * 0.2;
  };
  return h;
}

/** Void Skull Ghost: a dark rocky horned skull with glowing spiral eyes, jagged teeth and purple flame. */
export function makeSkullModel(def) {
  const h = creature();
  const { P, G } = mats(h);
  const core = new THREE.Group();
  core.position.y = 2.4;
  h.body.add(core);
  B(core, 2, 1.7, 1.8, P(def.skin), 0, 0, 0);
  B(core, 1.6, 0.6, 1.5, P(def.skin), 0, -1.05, 0.1);
  for (const s of [-1, 1]) {
    B(core, 0.55, 0.55, 0.06, G(def.eyeC), s * 0.48, 0.15, 0.92);
    B(core, 0.25, 0.25, 0.07, P(0x111111), s * 0.48, 0.15, 0.94);
    B(core, 0.3, 1, 0.3, P(0x1c1a20), s * 0.9, 1.2, 0).rotation.z = -s * 0.5;
  }
  for (let i = -3; i <= 3; i++) B(core, 0.16, 0.3, 0.1, P(0xe0d6c0), i * 0.2, -0.7, 0.92);
  const fire = [];
  for (const [x, z, s] of [[0, 0, 0.6], [-0.35, 0.2, 0.4], [0.35, -0.2, 0.4]]) fire.push(B(core, s, s * 1.5, s, G(def.crystals ? 0x8c9eff : 0xaa00ff), x, 1.3, z));
  if (def.crystals) for (const s of [-1, 1]) part(core, octa(0.4), G(0xd500f9, 0.6), s * 1.1, 0.6, -0.3).scale.set(0.6, 1.6, 0.6);
  h.anim = (phase, t) => {
    core.position.y = 2.4 + Math.sin(t * 2.2 + phase * 0.05) * 0.3;
    fire.forEach((f, i) => (f.scale.y = 1 + Math.sin(t * 9 + i * 2) * 0.25));
  };
  return h;
}

/** Hooded reaper (Tower Heroes Reapers, Void Reaper): ragged cloak, glowing eyes, optional wings, horns and scythe. */
export function makeHcReaperModel(def) {
  const h = creature();
  const { P, G } = mats(h);
  const cloak = P(def.cloak);
  const float = new THREE.Group();
  h.body.add(float);
  part(float, cylGeo(0.75, 1.25, 2.6, 12), cloak, 0, 1.6, 0);
  const rags = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = part(float, boxGeo(0.45, 0.6 + (i % 3) * 0.15, 0.2), cloak, Math.sin(a) * 1.15, 0.35, Math.cos(a) * 1.15);
    r.rotation.y = a;
    rags.push(r);
  }
  part(float, sphere(0.85), P(def.hoodC), 0, 3.35, 0);
  B(float, 1.0, 0.9, 0.3, P(0x050505), 0, 3.4, 0.62);
  for (const s of [-1, 1]) B(float, 0.16, 0.16, 0.06, G(def.eyeC), s * 0.22, 3.45, 0.79);
  for (const s of [-1, 1]) B(float, 0.4, 1.4, 0.45, cloak, s * 0.95, 2.1, 0.1).rotation.z = s * 0.25;
  if (def.hornC) for (const s of [-1, 1]) {
    B(float, 0.22, 0.8, 0.22, P(def.hornC), s * 0.55, 4.1, 0).rotation.z = -s * 0.6;
    B(float, 0.16, 0.5, 0.16, P(def.hornC), s * 0.95, 4.5, 0.1).rotation.z = -s * 1.1;
  }
  const wings = [];
  if (def.wingC) for (const s of [-1, 1]) {
    const w = new THREE.Group();
    w.position.set(s * 0.4, 2.6, -0.5);
    float.add(w);
    B(w, 1.8, 1.2, 0.1, P(def.wingC), s * 0.9, 0, 0);
    B(w, 0.5, 0.7, 0.1, P(def.wingC), s * 1.7, -0.8, 0);
    wings.push([w, s]);
  }
  if (def.scythe) {
    B(float, 0.12, 3.6, 0.12, P(0x3e2723), 1.3, 2.2, 0.6);
    B(float, 1.6, 0.14, 0.25, P(def.scythe), 0.6, 3.9, 0.6);
  }
  h.anim = (phase, t) => {
    float.position.y = 0.25 + Math.sin(t * 2.2 + phase * 0.05) * 0.15;
    rags.forEach((r, i) => (r.rotation.x = Math.sin(t * 5 + i) * 0.25));
    for (const [w, s] of wings) w.rotation.y = s * Math.sin(t * 8) * 0.5;
  };
  return h;
}

/** Dark Golem: a navy rock golem with pointed ears and glowing purple slanted eyes (`spiky`: the Giant). */
export function makeDarkGolemModel(def) {
  const h = creature();
  const { P, G } = mats(h);
  const rock = P(def.skin);
  const dark = P(new THREE.Color(def.skin).multiplyScalar(0.7).getHex());
  B(h.body, 2.9, 2.5, 1.9, rock, 0, 3.6, 0);
  const head = B(h.body, 1.5, 1.2, 1.3, dark, 0, 5.4, 0.2);
  for (const s of [-1, 1]) {
    B(head, 0.4, 0.15, 0.06, G(def.eyeC), s * 0.33, 0.05, 0.66).rotation.z = s * 0.35;
    B(head, 0.3, 0.6, 0.3, dark, s * 0.55, 0.8, 0).rotation.z = -s * 0.3;
  }
  if (def.spiky) for (const [x, y, z] of [[-1.2, 4.9, 0], [1.2, 4.9, 0], [0, 5, -0.9], [-0.6, 4.3, -1], [0.6, 4.3, -1]]) part(h.body, cone(0.3, 1.1), dark, x, y, z);
  const limb = (x, y, w, len, m) => {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    h.body.add(p);
    B(p, w, len, w, m, 0, -len / 2, 0);
    B(p, w * 1.15, w * 0.7, w * 1.15, dark, 0, -len + w * 0.3, 0);
    return p;
  };
  const la = limb(2.0, 4.6, 1.2, 3.2, rock);
  const ra = limb(-2.0, 4.6, 1.2, 3.2, rock);
  const ll = limb(0.75, 2.35, 1.2, 2.2, dark);
  const rl = limb(-0.75, 2.35, 1.2, 2.2, dark);
  for (const [x, z] of [[-0.4, 0.3], [0.5, -0.2]]) B(h.body, 0.1, 0.9, 0.06, G(def.eyeC, 0.4), x, 3.7, 0.96 + z * 0.01).rotation.z = x;
  h.anim = (phase) => {
    const sw = Math.sin(phase * 0.8);
    ll.rotation.x = sw * 0.45;
    rl.rotation.x = -sw * 0.45;
    la.rotation.x = -sw * 0.35;
    ra.rotation.x = sw * 0.35;
    h.body.rotation.z = sw * 0.05;
  };
  return h;
}

/** Demon Slime: a black slime with two tall horns, angry purple eyes and a grimace (or a toothy grin). */
export function makeDemonSlimeModel(def) {
  const h = creature();
  const { P, G } = mats(h);
  const m = h.M(def.skin);
  const blob = new THREE.Group();
  h.body.add(blob);
  B(blob, 2.2, 1.4, 2.2, m, 0, 0.7, 0);
  B(blob, 1.7, 0.6, 1.7, m, 0, 1.7, 0);
  for (const s of [-1, 1]) {
    B(blob, 0.3, 1.1, 0.3, m, s * 0.6, 2.4, 0).rotation.z = -s * 0.25;
    B(blob, 0.4, 0.22, 0.06, G(def.eyeC), s * 0.45, 1.3, 1.12).rotation.z = s * -0.3;
  }
  if (def.grin) {
    B(blob, 1.3, 0.35, 0.06, G(def.eyeC, 0.5), 0, 0.75, 1.12);
    for (let i = -2; i <= 2; i++) B(blob, 0.14, 0.2, 0.07, P(0xffffff), i * 0.25, 0.85, 1.14);
  } else B(blob, 0.9, 0.1, 0.06, G(def.eyeC, 0.5), 0, 0.85, 1.12);
  h.anim = (phase) => {
    const s = Math.sin(phase * 1.3);
    blob.position.y = Math.max(0, s) * 0.5;
    blob.scale.set(1 - s * 0.07, 1 + s * 0.1, 1 - s * 0.07);
  };
  return h;
}

/** Wicky: a navy candle-shaped figure with a white flame on its wick, a belted vest and round blue hands. */
export function makeCandleModel(def) {
  const h = creature();
  const { P, G } = mats(h);
  const g = new THREE.Group();
  h.body.add(g);
  part(g, cylGeo(0.75, 0.85, 2.6, 12), P(def.skin), 0, 1.6, 0);
  part(g, cylGeo(0.8, 0.8, 0.9, 12), P(0x111111), 0, 1.2, 0);
  B(g, 1.7, 0.18, 1.7, P(0x5d4037), 0, 1.2, 0);
  for (const s of [-1, 1]) {
    B(g, 0.16, 0.16, 0.06, P(0xffffff), s * 0.25, 2.4, 0.78);
    part(g, sphere(0.3), P(0x1e88e5), s * 1.05, 1.5, 0.2);
  }
  const flame = part(g, octa(0.35), G(0xffffff, 1), 0, 3.3, 0);
  flame.scale.set(0.8, 1.6, 0.8);
  h.anim = (phase, t) => {
    g.position.y = Math.abs(Math.sin(phase)) * 0.2;
    flame.scale.y = 1.6 + Math.sin(t * 12) * 0.25;
  };
  return h;
}

/** TDX Zombie Drop Pod: a huge black teardrop pod with magenta lights. */
export function makePodModel() {
  const h = creature();
  const { P, G } = mats(h);
  const pod = part(h.body, sphere(1.3, 16, 12), P(0x111111), 0, 1.6, 0);
  pod.scale.set(1, 1.5, 1);
  part(h.body, cone(0.9, 1.6, 12), P(0x111111), 0, 3.9, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    B(h.body, 0.15, 1.6, 0.06, G(0xff00c8), Math.sin(a) * 1.28, 1.8, Math.cos(a) * 1.28).rotation.y = a;
  }
  h.anim = () => {};
  return h;
}

/** TDX Chariot Turret: a grey turret on a stand with a green ammo tank. */
export function makeTurretModel() {
  const h = creature();
  const { P } = mats(h);
  B(h.body, 1.6, 0.4, 1.6, P(0x424242), 0, 0.2, 0);
  B(h.body, 0.3, 1.2, 0.3, P(0x424242), 0, 0.9, 0);
  const top = new THREE.Group();
  top.position.y = 1.7;
  h.body.add(top);
  B(top, 1.1, 0.7, 1.1, P(0x616161), 0, 0, 0);
  B(top, 0.25, 0.25, 1.5, P(0x212121), 0, 0, 1);
  B(top, 0.5, 0.6, 0.5, P(0x689f38), -0.75, 0, -0.2);
  h.anim = (phase, t) => (top.rotation.y = Math.sin(t * 1.3) * 0.6);
  return h;
}

/** TDX X-Tank: a big black futuristic tank with magenta lights. */
export function makeXTankModel() {
  const h = creature();
  const { P, G } = mats(h);
  B(h.body, 3, 1, 4.2, P(0x111111), 0, 0.9, 0);
  for (const s of [-1, 1]) B(h.body, 0.7, 0.9, 4.4, P(0x212121), s * 1.7, 0.5, 0);
  const top = new THREE.Group();
  top.position.y = 1.8;
  h.body.add(top);
  B(top, 2, 0.8, 2, P(0x1c1c1c), 0, 0, -0.2);
  B(top, 0.35, 0.35, 2.6, P(0x111111), 0, 0, 1.9);
  for (const s of [-1, 1]) B(h.body, 0.08, 0.15, 3.6, G(0xff00c8), s * 1.52, 1.1, 0);
  B(top, 1.2, 0.1, 0.06, G(0xff00c8), 0, 0.2, 0.82);
  h.anim = (phase, t) => (top.rotation.y = Math.sin(t * 0.6) * 0.3);
  return h;
}

/** TDX drones (Attack / Healing Drone): a flying body with two rotors and a glowing eye. */
export function makeHcDroneModel(def) {
  const h = creature();
  const { P, G } = mats(h);
  const g = new THREE.Group();
  g.position.y = 1.5;
  h.body.add(g);
  B(g, 1.6, 0.7, 1.4, P(def.skin), 0, 0, 0);
  B(g, 0.4, 0.3, 0.06, G(def.heal ? 0x69f0ae : 0xff1744), 0, 0, 0.72);
  const rotors = [];
  for (const s of [-1, 1]) {
    B(g, 0.9, 0.12, 0.2, P(0x424242), s * 1.1, 0.2, 0);
    rotors.push(B(g, 1.6, 0.05, 0.2, P(0x9e9e9e), s * 1.6, 0.35, 0));
  }
  h.anim = (phase, t) => {
    g.position.y = 1.5 + Math.sin(t * 3) * 0.2;
    rotors.forEach((r) => (r.rotation.y = t * 25));
  };
  return h;
}

/** Void Portal: a big purple circle portal standing on the path. */
export function makePortalModel(def) {
  const h = creature();
  const { G, S } = mats(h);
  const ring = part(h.body, torus(1.8, 0.25), G(def.skin, 0.7), 0, 2.2, 0);
  const inner = part(h.body, geo('portalDisc', () => new THREE.CircleGeometry(1.7, 24)), S(0x4a148c, 0.6, true), 0, 2.2, 0);
  inner.material.side = THREE.DoubleSide;
  h.anim = (phase, t) => {
    ring.rotation.z = t * 1.5;
    inner.scale.setScalar(0.9 + Math.sin(t * 3) * 0.08);
  };
  return h;
}

/** Mandrake / Nightshade: a walking bush of purple flowers with crystals on top (`legs`: on two legs). */
export function makeBushModel(def) {
  const h = creature();
  const { P, G } = mats(h);
  const g = new THREE.Group();
  h.body.add(g);
  const leaf = P(0x33691e);
  part(g, sphere(1.2), leaf, 0, def.legs ? 2.2 : 1.3, 0);
  for (const [x, y, z] of [[-0.8, 0.2, 0.5], [0.8, 0.3, 0.3], [0, 0.6, 0.9], [0.4, 0.9, -0.6], [-0.5, 0.8, -0.3]]) B(g, 0.4, 0.4, 0.4, G(def.skin, 0.5), x, (def.legs ? 2.2 : 1.3) + y, z);
  for (const [x, z] of [[0, 0], [-0.4, 0.2], [0.35, -0.2]]) part(g, octa(0.3), G(0xd500f9, 0.7), x, (def.legs ? 3.5 : 2.6), z).scale.set(0.6, 1.6, 0.6);
  const legs = [];
  if (def.legs) for (const s of [-1, 1]) legs.push(B(g, 0.35, 1.3, 0.35, P(0x3e2723), s * 0.45, 0.65, 0));
  h.anim = (phase) => {
    g.position.y = Math.abs(Math.sin(phase)) * 0.15;
    legs.forEach((l, i) => (l.rotation.x = Math.sin(phase + i * Math.PI) * 0.5));
  };
  return h;
}

/** Crystalian: a black stone body with purple crystal spikes, white eyes and a glowing gem in its chest. */
export function makeCrystalianModel() {
  const h = creature();
  const { P, G } = mats(h);
  const stone = P(0x111111);
  const g = new THREE.Group();
  h.body.add(g);
  B(g, 2.4, 2.6, 1.6, stone, 0, 3.2, 0);
  const head = B(g, 1.3, 1.2, 1.2, stone, 0, 5.1, 0);
  for (const s of [-1, 1]) B(head, 0.25, 0.25, 0.06, G(0xffffff), s * 0.28, 0.05, 0.62);
  B(g, 0.6, 0.6, 0.08, G(0xd500f9), 0, 3.5, 0.82);
  for (const [x, y, z, r] of [[-1.3, 4.4, 0, 0.5], [1.3, 4.4, 0, -0.5], [0, 5.9, 0, 0], [-0.6, 4.6, -0.8, 0.3], [0.7, 4.2, -0.8, -0.3], [0, 3.8, -0.9, 0]]) {
    const c = part(g, octa(0.4), G(0xaa00ff, 0.7), x, y, z);
    c.scale.set(0.6, 1.9, 0.6);
    c.rotation.z = r;
  }
  const limbs = [];
  for (const [x, y, len] of [[-1.7, 4.3, 2.6], [1.7, 4.3, 2.6], [-0.6, 1.9, 1.9], [0.6, 1.9, 1.9]]) {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    g.add(p);
    B(p, 0.9, len, 0.9, stone, 0, -len / 2, 0);
    limbs.push(p);
  }
  h.anim = (phase) => {
    const sw = Math.sin(phase * 0.8);
    limbs[2].rotation.x = sw * 0.4;
    limbs[3].rotation.x = -sw * 0.4;
    limbs[0].rotation.x = -sw * 0.3;
    limbs[1].rotation.x = sw * 0.3;
  };
  return h;
}

export const HC_CREATURES = {
  hcRune: makeRuneModel,
  hcBlob: makeBlobModel,
  hcSentry: makeSentryModel,
  hcEye: makeEyeModel,
  hcWorm: makeWormModel,
  hcSkull: makeSkullModel,
  hcReaper: makeHcReaperModel,
  hcGolem: makeDarkGolemModel,
  hcSlime: makeDemonSlimeModel,
  hcCandle: makeCandleModel,
  hcPod: makePodModel,
  hcTurret: makeTurretModel,
  hcXTank: makeXTankModel,
  hcDrone: makeHcDroneModel,
  hcPortal: makePortalModel,
  hcBush: makeBushModel,
  hcCrystalian: makeCrystalianModel,
};
