// Small pieces many models share: hand guns, glows, hats, halos and wings, turrets,
// round shapes (cylGeo) and the parts simple creatures are made of.

import * as THREE from 'three';
import { boxGeo, part } from './kit.js';

/** Small pistol on an arm pivot, pointing along the arm. Returns its muzzle. */
export function addPistol(h, arm, gold) {
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  arm.add(gun);
  part(gun, boxGeo(0.28, 0.9, 0.36), h.M(gold ? 0xc9a227 : 0x2b2b2b), 0, -0.45, 0);
  part(gun, boxGeo(0.24, 0.3, 0.55), h.M(0x1f1f1f), 0, -0.05, -0.3); // grip
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -0.9, 0);
  gun.add(muzzle);
  return muzzle;
}

/** Glowing (emissive) material for sci-fi parts. */
export function glow(h, color) {
  const m = h.M(color);
  m.userData.glow = color;
  m.emissive.setHex(color);
  m.emissiveIntensity = 0.8;
  return m;
}

/** Two-handed long gun on the right arm, with the standard aiming pose. Returns the gun group. */
export function holdLongGun(h, len, mat) {
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  h.rightArm.add(gun);
  part(gun, boxGeo(0.32, len, 0.42), mat, 0, -len / 2, 0);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -len, 0);
  gun.add(muzzle);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  h.muzzles = [muzzle];
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
  return gun;
}

/** A glowing halo floating over the head. */
export function addHalo(h, color) {
  const m = glow(h, color);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const seg = part(h.head, boxGeo(0.42, 0.12, 0.16), m, Math.cos(a) * 0.75, 2.05, Math.sin(a) * 0.75);
    seg.rotation.y = -a + Math.PI / 2;
  }
}

/** A pair of feathered wings on the back (two layers each side). */
export function addWings(h, mat) {
  for (const side of [-1, 1]) {
    const w = part(h.torso, boxGeo(0.2, 1.9, 2.2), mat, side * 0.75, 0.4, -1.3);
    w.rotation.set(0.25, side * 0.55, side * 0.35);
    const tip = part(h.torso, boxGeo(0.18, 1.3, 1.6), mat, side * 1.5, 1.2, -1.7);
    tip.rotation.set(0.35, side * 0.8, side * 0.6);
  }
}

/** A muzzle point on `parent` (local coords), registered as the model's only muzzle. */
export function setMuzzle(h, parent, x, y, z) {
  const m = new THREE.Object3D();
  m.position.set(x, y, z);
  parent.add(m);
  h.muzzles = [m];
  return m;
}

/** Simple helmet: dome + brim. */
export function helmet(h, color, brim = true) {
  const m = h.M(color);
  part(h.head, boxGeo(1.45, 0.55, 1.45), m, 0, 1.3, 0);
  if (brim) part(h.head, boxGeo(1.5, 0.12, 0.45), m, 0, 1.05, 0.62);
  return m;
}

// ------------------------------------------------------------------ units (spawned vehicles & squads)

/** Model holder for non-humanoid things (buildings, vehicles). Same shape as a humanoid's handles. */
export function makeThing() {
  const mats = [];
  const M = (color) => {
    const m = new THREE.MeshLambertMaterial({ color });
    mats.push(m);
    return m;
  };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  return { root, body, mats, M, muzzles: [], static: true };
}

/** A turret group on `u.body` at height y; units turn it toward their target. */
export function turret(u, y, z = 0) {
  const t = new THREE.Group();
  t.position.set(0, y, z);
  u.body.add(t);
  u.turret = t;
  return t;
}

export function gunMuzzle(u, parent, x, y, z) {
  const m = new THREE.Object3D();
  m.position.set(x, y, z);
  parent.add(m);
  u.muzzles.push(m);
  return m;
}

export const GOLD_SHEEN = 0x2e2000;
export const hsl = { h: 0, s: 0, l: 0 };
/**
 * Golden perk towers and goons: recolours a built model gold, keeping how light or dark each
 * part was (dark guns become deep gold, light parts pale gold). Glowing parts and textured
 * faces keep their own colours, and every gold part gets a faint warm sheen.
 */
export function goldify(m) {
  for (const mat of m.mats) {
    if (mat.map || !mat.color) continue;
    if (mat.userData.vc) {
      // kit models keep their colours on the vertices: turn each one gold in the shader, the same way
      mat.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          {
            float l = 0.28 + 0.25 * (max(vColor.r, max(vColor.g, vColor.b)) + min(vColor.r, min(vColor.g, vColor.b)));
            float q = l < 0.5 ? l * 1.85 : l + 0.85 - l * 0.85;
            float p = 2.0 * l - q;
            diffuseColor.rgb = vec3(q, p + (q - p) * 0.75, p);
          }`);
      };
      mat.customProgramCacheKey = () => 'goldvc';
      mat.userData.glow = GOLD_SHEEN;
      mat.emissive.setHex(GOLD_SHEEN);
      continue;
    }
    if (mat.userData.glow) continue;
    mat.color.getHSL(hsl);
    mat.color.setHSL(0.125, 0.85, 0.28 + hsl.l * 0.5);
    mat.userData.glow = GOLD_SHEEN;
    mat.emissive?.setHex(GOLD_SHEEN);
  }
  return m;
}

// ------------------------------------------------------------------ Crook Boss and his goons

/** A tommy gun with a round drum magazine on `arm`. Returns its muzzle. */
export function addTommyGun(h, arm, gold = false) {
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  arm.add(gun);
  const wood = h.M(0x6d4c41);
  const metal = h.M(gold ? 0xd4af37 : 0x2b2b2b);
  part(gun, boxGeo(0.34, 1.7, 0.42), metal, 0, -0.75, 0); // receiver + barrel
  part(gun, boxGeo(0.4, 0.5, 0.4), metal, 0, -1.55, 0); // finned barrel shroud
  part(gun, boxGeo(0.3, 0.6, 0.5), wood, 0, 0.25, -0.15); // stock
  part(gun, boxGeo(0.24, 0.3, 0.45), wood, 0, -1.15, 0.3); // front grip
  part(gun, boxGeo(0.24, 0.3, 0.45), wood, 0, -0.35, -0.32); // pistol grip
  part(gun, boxGeo(0.25, 0.75, 0.75), metal, 0, -0.65, -0.55); // drum magazine
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -1.85, 0);
  gun.add(muzzle);
  return muzzle;
}

/** Fedora: crown + brim + band. */
export function fedora(h, color, band) {
  const m = h.M(color);
  part(h.head, boxGeo(1.9, 0.12, 1.9), m, 0, 1.22, 0); // brim
  part(h.head, boxGeo(1.3, 0.6, 1.25), m, 0, 1.55, 0); // crown
  part(h.head, boxGeo(1.32, 0.16, 1.27), h.M(band), 0, 1.33, 0); // band
}

/** Suit jacket lapels, shirt front and tie on the torso. */
export function suit(h, shirt, tie) {
  part(h.torso, boxGeo(0.7, 1.6, 0.08), h.M(shirt), 0, 0.15, 0.52); // shirt front
  part(h.torso, boxGeo(0.25, 1.3, 0.1), h.M(tie), 0, 0.2, 0.56); // tie
}

/** A glowing material for makeThing() models. */
export function glowThing(u, color) {
  const m = u.M(color);
  m.userData.glow = color;
  m.emissive.setHex(color);
  m.emissiveIntensity = 0.8;
  return m;
}

// ---------------------------------------------------------------- event towers

/** A present held in `parent` (box with a ribbon cross). Returns the group. */
export function present(h, parent, color, ribbon, size = 0.7) {
  const g = new THREE.Group();
  parent.add(g);
  part(g, boxGeo(size, size, size), h.M(color));
  const r = h.M(ribbon);
  part(g, boxGeo(size + 0.04, size + 0.04, 0.14), r);
  part(g, boxGeo(0.14, size + 0.04, size + 0.04), r);
  part(g, boxGeo(0.3, 0.18, 0.3), r, 0, size / 2 + 0.08, 0); // bow
  return g;
}

// ---------------------------------------------------------------- event towers (wave 3)

/** A tool or weapon group held in the right hand (hangs down the arm, so -y is "out of the hand"). */
export function inHand(h, arm = h.rightArm) {
  const g = new THREE.Group();
  g.position.set(0, -1.9, 0);
  arm.add(g);
  return g;
}

/** Small helper: a row of `n` boxes along x, centered, `gap` apart. */
export function boxRow(parent, n, gap, geo, mat, y, z, mats = null) {
  for (let i = 0; i < n; i++) part(parent, geo, mats ? mats[i % mats.length] : mat, (i - (n - 1) / 2) * gap, y, z);
}

// ---------------------------------------------------------------- wave 6 towers
// Warship, Shield Tower, Oil Derrick, Combat Medic, Refractor, Scout Helicopter, Noob Tuber,
// Stinger, Jet Trooper, Combat Drone and Void Traitor.

/** A see-through glowing material (shield domes, rotor blur, void auras). */
export function clearMat(u, color, opacity) {
  const m = glow(u, color);
  m.transparent = true;
  m.opacity = opacity;
  m.depthWrite = false;
  return m;
}

// ------------------------------------------------------------------ Easy mode creatures
// Each builder returns { root, body, mats, M, anim(phase, t) }: `anim` poses the model every
// frame (phase advances with walking speed, t is seconds). Creatures face +Z.

export function creature() {
  const mats = [];
  const M = (color, extra = null) => {
    const m = new THREE.MeshLambertMaterial({ color, ...extra });
    mats.push(m);
    return m;
  };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  return { root, body, mats, M };
}

const cylCache = new Map();
export function cylGeo(rt, rb, h, seg = 10) {
  const k = `${rt}|${rb}|${h}|${seg}`;
  let g = cylCache.get(k);
  if (!g) {
    g = new THREE.CylinderGeometry(rt, rb, h, seg);
    cylCache.set(k, g);
  }
  return g;
}

/** Two cartoon eyes on a front face at height y, depth z. */
export function eyes(h, parent, y, z, { spread = 0.4, size = 0.4, white = 0xffffff, pupil = 0x111111, glowing = false } = {}) {
  const wm = glowing ? glow(h, white) : h.M(white);
  const pm = h.M(pupil);
  for (const side of [-1, 1]) {
    part(parent, boxGeo(size, size, 0.1), wm, side * spread, y, z);
    if (!glowing) part(parent, boxGeo(size * 0.5, size * 0.5, 0.06), pm, side * spread, y - size * 0.1, z + 0.07);
  }
}

/** A gold crown sitting at height y, `w` wide. */
export function crown(h, parent, y, w) {
  const gold = glow(h, 0xffc400);
  gold.emissiveIntensity = 0.35;
  part(parent, boxGeo(w, w * 0.25, w), gold, 0, y, 0);
  const pt = w * 0.18;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [0, -1], [1, 0], [-1, 0]]) {
    part(parent, boxGeo(pt, pt * 2, pt), gold, x * (w / 2 - pt / 2), y + w * 0.2, z * (w / 2 - pt / 2));
  }
  part(parent, boxGeo(pt * 1.2, pt * 1.2, 0.08), glow(h, 0xe53935), 0, y, w / 2 + 0.03);
}

/** A cached cylinder lying on its side: its axis along z (cylGeoX) or x (cylGeoZ). Never rotate cached geometry in place. */
export function cylGeoX(rt, rb, h, seg = 10) {
  const k = `x|${rt}|${rb}|${h}|${seg}`;
  let g = cylCache.get(k);
  if (!g) cylCache.set(k, (g = new THREE.CylinderGeometry(rt, rb, h, seg).rotateX(Math.PI / 2)));
  return g;
}
export function cylGeoZ(rt, rb, h, seg = 10) {
  const k = `z|${rt}|${rb}|${h}|${seg}`;
  let g = cylCache.get(k);
  if (!g) cylCache.set(k, (g = new THREE.CylinderGeometry(rt, rb, h, seg).rotateZ(Math.PI / 2)));
  return g;
}
