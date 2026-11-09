import * as THREE from 'three';
import { TOWERS } from './config.js';
// Wave 7 tower and unit models live in their own files (they import helpers from here).
import { TOWER_MODELS_A, UNIT_MODELS_A } from './newmodels/a.js';
import { TOWER_MODELS_B, UNIT_MODELS_B } from './newmodels/b.js';
import { TOWER_MODELS_C, UNIT_MODELS_C } from './newmodels/c.js';
import { TOWER_MODELS_D, UNIT_MODELS_D } from './newmodels/d.js';
import { CROSS_MODELS, TOWER_MODELS_E, UNIT_MODELS_E, makeMechTurret } from './newmodels/e.js';
import { TOWER_MODELS_F, UNIT_MODELS_F } from './newmodels/f.js';
import { TOWER_MODELS_G, UNIT_MODELS_G } from './newmodels/g.js';
import { TOWER_MODELS_H, UNIT_MODELS_H } from './newmodels/h.js';
import { TOWER_MODELS_I, UNIT_MODELS_I, makeEngDevice } from './newmodels/i.js';

// Blocky humanoid proportions (in world units, ~5.2 tall):
// legs 1x2x1, torso 2x2x1, arms 1x2x1, head 1.2 cube. Characters face +Z.

const geoCache = new Map();
export function boxGeo(w, h, d) {
  const k = `${w}|${h}|${d}`;
  let g = geoCache.get(k);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    geoCache.set(k, g);
  }
  return g;
}

export function part(parent, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

const faceCache = new Map();
export function faceTexture(skin, style) {
  const key = `${skin}|${style}`;
  if (faceCache.has(key)) return faceCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#' + new THREE.Color(skin).getHexString();
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#111';
  switch (style) {
    case 'zombie':
      g.fillStyle = '#f4f4dc';
      g.fillRect(13, 20, 13, 11);
      g.fillRect(38, 22, 12, 9);
      g.fillStyle = '#c62828';
      g.fillRect(17, 23, 5, 5);
      g.fillRect(42, 24, 5, 4);
      g.fillStyle = '#2a1a1a';
      g.fillRect(17, 41, 30, 9);
      g.fillStyle = '#eee';
      g.fillRect(20, 41, 4, 4);
      g.fillRect(29, 41, 4, 3);
      g.fillRect(39, 41, 4, 4);
      break;
    case 'goblin':
      // Yellow eyes with slit pupils and a toothy grin.
      g.fillStyle = '#fff176';
      g.fillRect(12, 20, 14, 10);
      g.fillRect(38, 20, 14, 10);
      g.fillStyle = '#111';
      g.fillRect(18, 21, 3, 8);
      g.fillRect(44, 21, 3, 8);
      g.fillStyle = '#3e2723';
      g.fillRect(14, 40, 36, 10);
      g.fillStyle = '#fafafa';
      for (const x of [16, 24, 32, 40]) g.fillRect(x, 40, 5, 4);
      g.fillRect(20, 46, 4, 4);
      g.fillRect(38, 46, 4, 4);
      break;
    case 'agent':
      g.fillRect(9, 21, 46, 4);
      g.fillRect(11, 23, 18, 11);
      g.fillRect(35, 23, 18, 11);
      g.fillStyle = '#5a6a7a';
      g.fillRect(14, 25, 6, 3);
      g.fillRect(38, 25, 6, 3);
      g.fillStyle = '#111';
      g.fillRect(24, 46, 16, 3);
      break;
    case 'skull':
      // Skeleton: dark eye sockets, a nose hole and a row of teeth.
      g.fillStyle = '#1a1a1a';
      g.fillRect(12, 18, 15, 14);
      g.fillRect(37, 18, 15, 14);
      g.fillRect(29, 34, 6, 6);
      g.fillRect(16, 44, 32, 8);
      g.fillStyle = '#e8e4d0';
      for (const x of [18, 25, 32, 39]) g.fillRect(x, 45, 4, 6);
      break;
    case 'crystal': {
      // Expert mode crystal creatures: no face at all, just lighter facets.
      g.fillStyle = 'rgba(255,255,255,0.22)';
      g.beginPath();
      g.moveTo(0, 0); g.lineTo(30, 0); g.lineTo(0, 34); g.closePath(); g.fill();
      g.beginPath();
      g.moveTo(64, 30); g.lineTo(64, 64); g.lineTo(26, 64); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.12)';
      g.beginPath();
      g.moveTo(30, 0); g.lineTo(64, 0); g.lineTo(64, 30); g.lineTo(26, 64); g.lineTo(0, 64); g.lineTo(0, 34); g.closePath(); g.fill();
      break;
    }
    case 'overlord':
      // The Overlord: a smooth white mask with two angry black eye slits.
      g.fillStyle = '#111';
      g.beginPath();
      g.moveTo(10, 28); g.lineTo(28, 34); g.lineTo(27, 42); g.lineTo(16, 40); g.closePath(); g.fill();
      g.beginPath();
      g.moveTo(54, 28); g.lineTo(36, 34); g.lineTo(37, 42); g.lineTo(48, 40); g.closePath(); g.fill();
      break;
    case 'fallen':
      // Hard mode Fallen: a black face with glowing blue cracks and cyan eyes.
      g.strokeStyle = '#29b6f6';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(6, 4); g.lineTo(18, 14); g.lineTo(14, 24);
      g.moveTo(58, 56); g.lineTo(46, 46); g.lineTo(50, 36);
      g.moveTo(34, 64); g.lineTo(30, 52);
      g.stroke();
      g.fillStyle = '#84ffff';
      g.fillRect(14, 28, 12, 6);
      g.fillRect(38, 28, 12, 6);
      break;
    case 'fallenSkull':
      // Fallen skeletons: a skull with light-blue flames in its eye sockets.
      g.fillStyle = '#1a1a1a';
      g.fillRect(12, 18, 15, 14);
      g.fillRect(37, 18, 15, 14);
      g.fillRect(29, 34, 6, 6);
      g.fillRect(16, 44, 32, 8);
      g.fillStyle = '#4fc3f7';
      g.fillRect(16, 21, 7, 8);
      g.fillRect(41, 21, 7, 8);
      g.fillStyle = '#e0f7fa';
      g.fillRect(18, 24, 3, 3);
      g.fillRect(43, 24, 3, 3);
      break;
    case 'fallenKing':
      // The Fallen King: a dark visor with two glowing cyan eyes.
      g.fillStyle = '#263238';
      g.fillRect(0, 22, 64, 18);
      g.fillStyle = '#18ffff';
      g.fillRect(12, 28, 14, 6);
      g.fillRect(38, 28, 14, 6);
      break;
    case 'helm':
      // A closed knight's helmet: a dark eye slit and breathing holes.
      g.fillStyle = '#212121';
      g.fillRect(6, 26, 52, 7);
      for (const x of [20, 28, 36, 44]) g.fillRect(x, 44, 3, 8);
      break;
    case 'paper':
      // Breakers: paper dolls with drawn-on dot eyes and a stitched smile.
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(0, 10, 64, 6);
      g.fillStyle = '#111';
      g.fillRect(16, 24, 8, 8);
      g.fillRect(40, 24, 8, 8);
      g.fillRect(18, 44, 28, 3);
      for (const x of [20, 28, 36, 44]) g.fillRect(x, 41, 2, 9);
      break;
    case 'void':
      // Void beings: a dark face split by glowing magenta cracks, with two slit eyes.
      g.strokeStyle = '#d500f9';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(4, 8); g.lineTo(16, 16); g.lineTo(12, 26);
      g.moveTo(60, 50); g.lineTo(48, 44); g.lineTo(52, 34);
      g.moveTo(30, 64); g.lineTo(34, 52); g.lineTo(28, 46);
      g.stroke();
      g.fillStyle = '#ff80ff';
      g.fillRect(12, 30, 14, 5);
      g.fillRect(38, 30, 14, 5);
      break;
    case 'voidKing':
      // VOID: no face at all, only crimson cracks running across the black.
      g.strokeStyle = '#c2185b';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(0, 14); g.lineTo(18, 22); g.lineTo(14, 36); g.lineTo(26, 46);
      g.moveTo(64, 10); g.lineTo(46, 24); g.lineTo(50, 38); g.lineTo(38, 52); g.lineTo(42, 64);
      g.moveTo(30, 0); g.lineTo(34, 12); g.lineTo(28, 20);
      g.stroke();
      g.strokeStyle = '#ff4081';
      g.lineWidth = 1.5;
      g.stroke();
      break;
    case 'beholder':
      // The Beholder: a pitch-black face in its hood with two glowing white eyes.
      g.fillStyle = '#050505';
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(12, 22, 16, 12);
      g.fillRect(36, 22, 16, 12);
      g.fillStyle = '#ffffff';
      g.fillRect(15, 24, 10, 8);
      g.fillRect(39, 24, 10, 8);
      break;
    // Insane mode (2026-11-09) faces.
    case 'frown': // Swordsmen, Soldiers, Ninjas...: angry brows and a frown
      g.fillRect(18, 25, 7, 8);
      g.fillRect(39, 25, 7, 8);
      g.fillRect(15, 20, 12, 3);
      g.fillRect(37, 20, 12, 3);
      g.lineWidth = 3;
      g.strokeStyle = '#111';
      g.beginPath();
      g.arc(32, 52, 10, 1.15 * Math.PI, 1.85 * Math.PI);
      g.stroke();
      break;
    case 'sad': // Prompter: drooping eyes and a sad mouth
      g.fillRect(18, 27, 7, 7);
      g.fillRect(39, 27, 7, 7);
      g.fillRect(16, 22, 10, 3);
      g.fillRect(38, 22, 10, 3);
      g.lineWidth = 3;
      g.strokeStyle = '#111';
      g.beginPath();
      g.arc(32, 54, 9, 1.15 * Math.PI, 1.85 * Math.PI);
      g.stroke();
      break;
    case 'eyepatch': // Raygunner: a black mask over the eyes and an eyepatch
      g.fillStyle = '#111';
      g.fillRect(4, 20, 56, 16);
      g.fillStyle = '#eceff1';
      g.fillRect(40, 25, 8, 6);
      g.fillStyle = '#000';
      g.fillRect(12, 18, 16, 20);
      g.fillRect(4, 14, 56, 3);
      break;
    case 'halfMetal': // Sprinter M5: the left half of the face is metal with a blue eye
      g.fillStyle = '#90a4ae';
      g.fillRect(32, 0, 32, 64);
      g.fillStyle = '#111';
      g.fillRect(18, 25, 7, 8);
      g.fillStyle = '#40c4ff';
      g.fillRect(39, 25, 8, 7);
      g.fillStyle = '#546e7a';
      g.fillRect(32, 0, 2, 64);
      g.fillStyle = '#111';
      g.fillRect(22, 45, 20, 3);
      break;
    case 'welder': // Engineer: a dark welding mask with a green window
      g.fillStyle = '#263238';
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#00e676';
      g.fillRect(10, 24, 44, 10);
      break;
    case 'indigo': // Vengeful: black with glowing indigo eyes
      g.fillStyle = '#0a0a0a';
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#651fff';
      g.fillRect(14, 26, 12, 6);
      g.fillRect(38, 26, 12, 6);
      break;
    case 'flameEye': // Hellspeed: charred, with one flaming eye
      g.fillStyle = '#0d0d0d';
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#ff6d00';
      g.fillRect(38, 22, 12, 10);
      g.fillStyle = '#ffd740';
      g.fillRect(41, 25, 6, 5);
      g.fillStyle = '#331100';
      g.fillRect(16, 27, 9, 4);
      break;
    // Expert mode (2026-11-09) faces.
    case 'blank': // cracked figures, Vio enemies, time beings: no face, just a faint crack
      g.strokeStyle = 'rgba(0,0,0,0.25)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(8, 6); g.lineTo(20, 18); g.lineTo(16, 30);
      g.stroke();
      break;
    case 'visor': // Cloaker Bot: a purple visor stripe
    case 'visorRed': // Armoured / Shield / Flag Bots: a red glowing visor
      g.fillStyle = '#263238';
      g.fillRect(4, 20, 56, 18);
      g.fillStyle = style === 'visor' ? '#b388ff' : '#ff1744';
      g.fillRect(8, 25, 48, 7);
      break;
    case 'goggles': // Vio Gunner, Doomelist: round pink goggles
      g.fillStyle = '#ff4fa3';
      g.beginPath(); g.arc(20, 30, 10, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(44, 30, 10, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffd6ec';
      g.beginPath(); g.arc(20, 30, 5, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(44, 30, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#212121';
      g.fillRect(28, 28, 8, 4);
      break;
    case 'hoodPurple': // Rebirther, Scarlets: a dark face in a hood with purple eyes
      g.fillStyle = '#0a0a0a';
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#d500f9';
      g.fillRect(15, 26, 10, 6);
      g.fillRect(39, 26, 10, 6);
      break;
    case 'angel': // Death Angel: pale, red eyes, blood-stained
      g.fillStyle = '#b71c1c';
      g.fillRect(16, 26, 9, 6);
      g.fillRect(39, 26, 9, 6);
      g.fillStyle = 'rgba(183,28,28,0.6)';
      g.fillRect(40, 34, 4, 14);
      g.fillRect(10, 48, 12, 4);
      break;
    case 'soldier':
      g.fillRect(18, 25, 7, 9);
      g.fillRect(39, 25, 7, 9);
      g.fillRect(15, 21, 12, 3);
      g.fillRect(37, 21, 12, 3);
      g.fillRect(22, 45, 20, 3);
      break;
    default: // classic smile
      g.fillRect(19, 21, 7, 11);
      g.fillRect(38, 21, 7, 11);
      g.lineWidth = 4;
      g.strokeStyle = '#111';
      g.beginPath();
      g.arc(32, 34, 13, 0.2 * Math.PI, 0.8 * Math.PI);
      g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  faceCache.set(key, t);
  return t;
}

/**
 * Builds a blocky humanoid. Limbs are pivot groups at shoulder/hip so rotating
 * `rotation.x` swings them. Returns handles to every part plus the list of
 * materials (for tinting, transparency and disposal).
 */
export function makeHumanoid({ skin = 0xf5cd30, shirt = 0x1e88e5, pants = 0x43a047, arms = null, face = 'smile' } = {}) {
  const mats = [];
  const M = (color, map = null) => {
    const m = new THREE.MeshLambertMaterial({ color, map });
    mats.push(m);
    return m;
  };
  const skinM = M(skin);
  const shirtM = M(shirt);
  const pantsM = M(pants);
  const armM = arms == null ? skinM : M(arms);
  const faceM = M(0xffffff, faceTexture(skin, face));

  const root = new THREE.Group();
  const body = new THREE.Group(); // pivot at the feet; used for bobbing / falling over
  root.add(body);

  const torso = part(body, boxGeo(2, 2, 1), shirtM, 0, 3, 0);
  const head = new THREE.Group();
  head.position.y = 4;
  body.add(head);
  // BoxGeometry face order: +x, -x, +y, -y, +z (front), -z
  part(head, boxGeo(1.2, 1.2, 1.2), [skinM, skinM, skinM, skinM, faceM, skinM], 0, 0.6, 0);

  const limb = (x, y, m) => {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    body.add(p);
    part(p, boxGeo(1, 2, 1), m, 0, -1, 0);
    return p;
  };
  // Facing +Z, the character's right side is -X.
  const rightArm = limb(-1.5, 4, armM);
  const leftArm = limb(1.5, 4, armM);
  const rightLeg = limb(-0.5, 2, pantsM);
  const leftLeg = limb(0.5, 2, pantsM);

  return { root, body, torso, head, rightArm, leftArm, rightLeg, leftLeg, mats, M };
}

export function setOpacity(h, opacity) {
  for (const m of h.mats) {
    if (m.userData.keepOpacity) {
      // See-through on purpose (void haze, ghosts): stays see-through, and fades along with the rest.
      m.opacity = m.userData.keepOpacity * opacity;
      continue;
    }
    m.transparent = opacity < 1;
    m.opacity = opacity;
    m.depthWrite = opacity >= 1;
  }
}

/** Tints every material (0 = back to normal: glowing parts keep their glow). */
export function setEmissive(h, hex) {
  for (const m of h.mats) m.emissive.setHex(hex || m.userData.glow || 0);
}

/** Scout tower model; the look changes with each upgrade level (0-4). */
export function makeScout(level) {
  const agent = level >= 4;
  const h = makeHumanoid(
    agent
      ? { skin: 0xe0ac69, shirt: 0x1c1c22, pants: 0x141418, arms: 0x1c1c22, face: 'agent' }
      : { skin: 0xe0ac69, shirt: level >= 2 ? 0x5a6b34 : 0x6b7d3a, pants: 0x4b5320, arms: 0x6b7d3a, face: 'soldier' },
  );
  const { M } = h;
  const dark = M(0x2b2b2b);

  if (agent) {
    part(h.head, boxGeo(1.3, 0.35, 1.3), M(0x1a1209), 0, 1.25, -0.02); // slick hair
    part(h.torso, boxGeo(0.6, 1.7, 0.05), M(0xffffff), 0, 0.15, 0.51); // white shirt
    part(h.torso, boxGeo(0.2, 1.4, 0.07), M(0x8b0000), 0, 0.1, 0.53); // tie
    part(h.head, boxGeo(0.12, 0.35, 0.12), dark, -0.66, 0.55, 0); // earpiece
  } else {
    const helmM = M(level >= 2 ? 0x3e4a2a : 0x556b2f);
    part(h.head, boxGeo(1.45, 0.55, 1.45), helmM, 0, 1.3, 0);
    part(h.head, boxGeo(1.5, 0.12, 0.45), helmM, 0, 1.05, 0.62); // brim
    if (level >= 1) {
      // Visibility: a radio backpack with a tall antenna
      part(h.torso, boxGeo(1.3, 1.4, 0.6), M(0x4b5320), 0, 0.1, -0.8);
      part(h.torso, boxGeo(0.08, 1.8, 0.08), M(0x212121), 0.45, 1.6, -0.9);
    }
    if (level >= 1) {
      // Visibility: goggles strapped to the helmet
      part(h.head, boxGeo(1.1, 0.32, 0.2), M(0x263238), 0, 1.35, 0.78);
      part(h.head, boxGeo(0.35, 0.22, 0.05), M(0x4fc3f7), -0.27, 1.35, 0.89);
      part(h.head, boxGeo(0.35, 0.22, 0.05), M(0x4fc3f7), 0.27, 1.35, 0.89);
    }
    if (level >= 3) {
      // Highest Cal: armored vest + bigger pack
      part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x2f3326), 0, 0.05, 0);
      part(h.torso, boxGeo(1.6, 1.7, 0.7), M(0x4a3b24), 0, 0, -0.95);
    }
  }

  // Gun hangs off the right arm pivot pointing along the arm (-Y local).
  const gunLen = agent ? 1.2 : level >= 2 ? 1.9 : 1.1;
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  h.rightArm.add(gun);
  part(gun, boxGeo(0.32, gunLen, 0.42), dark, 0, -gunLen / 2, 0);
  let muzzleY = -gunLen;
  if (agent) {
    part(gun, boxGeo(0.22, 0.8, 0.22), M(0x111111), 0, -gunLen - 0.4, 0); // silencer
    muzzleY -= 0.8;
  } else if (level >= 2) {
    part(gun, boxGeo(0.25, 0.4, 0.5), dark, 0, -0.55, -0.42); // magazine
    part(gun, boxGeo(0.25, 0.5, 0.35), M(0x5d4037), 0, 0.15, -0.05); // stock
  }
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, muzzleY, 0);
  gun.add(muzzle);

  // Aiming pose: both arms forward, left arm angled in to support the gun.
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  h.muzzles = [muzzle];
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
  h.tracer = agent ? 0xb3e5fc : 0xffe066;
  return h;
}

/** Handgun on an arm pivot, pointing along the arm. Optional laser sight. Returns its muzzle. */
export function addHandgun(h, arm, { body = 0x2b2b2b, laser = false, trim = null } = {}) {
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  arm.add(gun);
  part(gun, boxGeo(0.3, 1.0, 0.38), h.M(body), 0, -0.5, 0); // slide
  part(gun, boxGeo(0.26, 0.32, 0.6), h.M(0x1f1f1f), 0, -0.05, -0.32); // grip
  if (trim) part(gun, boxGeo(0.34, 0.12, 0.42), glow(h, trim), 0, -0.75, 0);
  if (laser) {
    part(gun, boxGeo(0.2, 0.35, 0.2), h.M(0x212121), 0, -0.7, 0.3);
    part(gun, boxGeo(0.08, 0.06, 0.08), glow(h, 0xff1744), 0, -0.9, 0.3);
  }
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -1.0, 0);
  gun.add(muzzle);
  return muzzle;
}

/**
 * Classic Scout (alternate Scout form): a ranger with a handgun. Every level adds gear:
 * Lv 2 ammo belt, Lv 3 shades + laser sight, Lv 4 helmet + plate carrier, Lv 5 akimbo handguns
 * and a long coat. A purple Dimension Shard emblem marks it as an alternate form.
 */
export function makeScoutClassic(level) {
  const akimbo = level >= 4;
  const geared = level >= 3;
  const shirt = akimbo ? 0x2a1f3d : geared ? 0x5d5040 : level >= 2 ? 0x6d4c41 : 0xc8a165; // Lv 3: leather jacket
  const h = makeHumanoid({ skin: 0xd9a066, shirt, pants: akimbo ? 0x1c1726 : 0x5d4037, arms: shirt, face: 'soldier' });
  const { M } = h;
  const shard = glow(h, 0xb388ff);

  if (geared) {
    // Stronger Equipment: tactical helmet with purple goggles, plate carrier, knee pads, gloves
    const helm = M(akimbo ? 0x1c1726 : 0x4a4436);
    part(h.head, boxGeo(1.45, 0.55, 1.45), helm, 0, 1.3, 0);
    part(h.head, boxGeo(1.2, 0.3, 0.2), M(0x212121), 0, 1.3, 0.76);
    part(h.head, boxGeo(0.36, 0.22, 0.05), shard, -0.27, 1.3, 0.87);
    part(h.head, boxGeo(0.36, 0.22, 0.05), shard, 0.27, 1.3, 0.87);
    part(h.torso, boxGeo(2.15, 1.6, 1.15), M(akimbo ? 0x14101c : 0x3b3a2c), 0, 0.1, 0);
    for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.45, 0.45, 0.2), M(0x2b2b2b), x, -0.3, 0.65);
    const pad = M(0x212121);
    for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.05, 0.4, 0.3), pad, 0, -1.2, 0.45);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.05, 0.45, 1.05), pad, 0, -1.75, 0);
    part(h.torso, boxGeo(0.35, 0.35, 0.08), shard, 0.55, 0.45, 0.6); // shard emblem on the vest
  } else {
    // Red ball cap with the shard emblem
    const cap = M(0xd84315);
    part(h.head, boxGeo(1.32, 0.45, 1.32), cap, 0, 1.3, 0);
    part(h.head, boxGeo(1.1, 0.12, 0.7), cap, 0, 1.1, 0.85);
    part(h.head, boxGeo(0.3, 0.3, 0.06), shard, 0, 1.32, 0.67);
    part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, 0.55, 0.45, 0.52);
  }
  if (level >= 1) {
    // Faster Reloading: belt full of spare magazines
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.85, 0);
    for (const x of [-0.7, -0.35, 0.35, 0.7]) part(h.torso, boxGeo(0.25, 0.45, 0.25), M(0x212121), x, -0.75, 0.6);
  }
  if (level >= 2) {
    // Precise Aiming: aviator shades
    part(h.head, boxGeo(1.25, 0.1, 0.08), M(0xd4af37), 0, 0.8, 0.63);
    part(h.head, boxGeo(0.42, 0.3, 0.07), M(0x111111), -0.27, 0.66, 0.63);
    part(h.head, boxGeo(0.42, 0.3, 0.07), M(0x111111), 0.27, 0.66, 0.63);
  }
  if (akimbo) {
    // Akimbo Handguns: long dark coat tails and a red scarf
    part(h.torso, boxGeo(2.05, 1.6, 0.2), M(0x2a1f3d), 0, -1.5, -0.45);
    part(h.torso, boxGeo(1.7, 0.4, 1.2), M(0xc62828), 0, 0.85, 0.05);
    part(h.torso, boxGeo(0.4, 0.9, 0.1), M(0xc62828), -0.5, 0.3, 0.56);
  }

  const gunOpts = { laser: level >= 2, trim: akimbo ? 0xb388ff : null, body: akimbo ? 0x37474f : 0x2b2b2b };
  const muzzles = [addHandgun(h, h.rightArm, gunOpts)];
  if (akimbo) {
    muzzles.push(addHandgun(h, h.leftArm, gunOpts));
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.08);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.08);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
  } else {
    // One-handed, the left hand steadying the wrist
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
  }
  h.muzzles = muzzles;
  h.tracer = akimbo ? 0xb388ff : 0xffe066;
  return h;
}

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

/** Tweeter tower model: pistol + blue bird. Look changes per level (0-4). */
export function makeTweeter(level) {
  const chit = level >= 4;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: chit ? 0xe3f2fd : 0x29b6f6, pants: 0x37474f, arms: chit ? 0xe3f2fd : 0x29b6f6 });
  const { M } = h;

  // Blue bird perched on the left shoulder (right hand holds the pistol).
  const bird = new THREE.Group();
  bird.position.set(1.5, 4.25, 0);
  h.body.add(bird);
  const blue = M(0x1e88e5);
  part(bird, boxGeo(0.5, 0.45, 0.7), blue, 0, 0, 0);
  part(bird, boxGeo(0.4, 0.4, 0.4), blue, 0, 0.35, 0.25);
  part(bird, boxGeo(0.14, 0.12, 0.25), M(0xffa000), 0, 0.33, 0.55); // beak
  part(bird, boxGeo(0.08, 0.1, 0.05), M(0x111111), 0.15, 0.42, 0.44); // eyes
  part(bird, boxGeo(0.08, 0.1, 0.05), M(0x111111), -0.15, 0.42, 0.44);
  part(bird, boxGeo(0.62, 0.25, 0.45), M(0x1565c0), 0, 0.02, -0.05); // wings
  part(bird, boxGeo(0.3, 0.1, 0.35), M(0x1565c0), 0, 0.05, -0.5); // tail
  h.bird = bird;

  if (level >= 1) {
    // Hater Shades: white lenses in a gold frame
    const gold = M(0xd4af37);
    part(h.head, boxGeo(1.25, 0.1, 0.08), gold, 0, 0.82, 0.63);
    part(h.head, boxGeo(0.45, 0.32, 0.06), gold, -0.28, 0.66, 0.62);
    part(h.head, boxGeo(0.45, 0.32, 0.06), gold, 0.28, 0.66, 0.62);
    part(h.head, boxGeo(0.37, 0.24, 0.07), M(0xfafafa), -0.28, 0.66, 0.63);
    part(h.head, boxGeo(0.37, 0.24, 0.07), M(0xfafafa), 0.28, 0.66, 0.63);
    // ...and a chunky gold chain
    part(h.torso, boxGeo(1.4, 0.18, 1.15), gold, 0, 0.9, 0);
    part(h.torso, boxGeo(0.4, 0.45, 0.1), gold, 0, 0.45, 0.56);
  }
  if (level >= 2) {
    // Stonk: top hat
    const black = M(0x161616);
    part(h.head, boxGeo(1.7, 0.1, 1.7), black, 0, 1.25, 0);
    part(h.head, boxGeo(1.1, 1.0, 1.1), black, 0, 1.8, 0);
    part(h.head, boxGeo(1.12, 0.18, 1.12), M(0x2e7d32), 0, 1.38, 0); // money-green band
  }

  const muzzles = [addPistol(h, h.rightArm, chit)];
  let pose;
  if (level >= 3) {
    // Dual Wield: second pistol in the left hand, both arms forward
    muzzles.push(addPistol(h, h.leftArm, chit));
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.05);
    pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
  } else {
    // One pistol; the left hand is free (and holds a phone at Stonk)
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
    h.leftArm.rotation.set(-0.9, 0, -0.25);
    pose = { right: -Math.PI / 2, left: -0.9, leftRecoil: 0 };
    if (level >= 2) {
      part(h.leftArm, boxGeo(0.12, 0.85, 0.5), M(0x212121), 0, -2.15, 0.45);
      part(h.leftArm, boxGeo(0.05, 0.7, 0.4), M(0x66ff99), -0.07, -2.15, 0.45); // screen: stonks
    }
  }

  if (chit) {
    // ChitChat: white wings on the back, standing on a cloud
    const wing = M(0xffffff);
    const lw = part(h.torso, boxGeo(0.2, 1.6, 1.6), wing, 0.6, 0.3, -1.1);
    const rw = part(h.torso, boxGeo(0.2, 1.6, 1.6), wing, -0.6, 0.3, -1.1);
    lw.rotation.set(0.2, 0.5, 0.3);
    rw.rotation.set(0.2, -0.5, -0.3);
    const cloud = M(0xf5f5f5);
    part(h.root, boxGeo(3.0, 0.7, 2.2), cloud, 0, 0.35, 0);
    part(h.root, boxGeo(1.6, 0.6, 1.6), cloud, -1.1, 0.55, 0.3);
    part(h.root, boxGeo(1.6, 0.6, 1.6), cloud, 1.1, 0.5, -0.3);
    h.lift = 0.7;
    h.body.position.y = h.lift;
  }

  h.muzzles = muzzles;
  h.pose = pose;
  h.tracer = chit ? 0x4fc3f7 : 0xffd54f;
  return h;
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

/** Soldier tower: assault rifle, bursts. Look changes per level (0-4). */
export function makeSoldier(level) {
  const sup = level >= 4;
  const h = makeHumanoid(
    sup
      ? { skin: 0xc68642, shirt: 0x1a237e, pants: 0x0d1440, arms: 0x283593, face: 'soldier' }
      : { skin: 0xc68642, shirt: 0x7a6a45, pants: 0x4e4630, arms: 0x7a6a45, face: 'soldier' },
  );
  const { M } = h;
  const dark = M(0x262626);

  if (sup) {
    // Super Soldier: armored suit with a glowing chest core and visor helmet
    const armor = M(0x3949ab);
    part(h.torso, boxGeo(2.2, 1.8, 1.2), armor, 0, 0.05, 0);
    part(h.torso, boxGeo(0.5, 0.5, 0.1), glow(h, 0x00e5ff), 0, 0.3, 0.62);
    part(h.head, boxGeo(1.4, 1.35, 1.4), armor, 0, 0.62, -0.03);
    part(h.head, boxGeo(1.2, 0.35, 0.08), glow(h, 0x00e5ff), 0, 0.7, 0.68);
    part(h.torso, boxGeo(0.8, 0.45, 1.3), armor, -1.4, 1.0, 0); // shoulder pads
    part(h.torso, boxGeo(0.8, 0.45, 1.3), armor, 1.4, 1.0, 0);
  } else {
    // Buzz cut
    part(h.head, boxGeo(1.25, 0.2, 1.25), M(0x2b1d0e), 0, 1.25, 0);
    if (level >= 1) {
      // Shades: black sunglasses and chest webbing
      part(h.head, boxGeo(1.25, 0.32, 0.08), M(0x0a0a0a), 0, 0.68, 0.63);
      const web = M(0x3e2723);
      for (const side of [-1, 1]) part(h.torso, boxGeo(0.3, 2.5, 1.12), web, 0, 0, 0).rotation.z = side * 0.6;
    }
    if (level >= 2) {
      // Radio: headset band, ear cups and mic
      const band = M(0x333333);
      part(h.head, boxGeo(1.35, 0.15, 0.25), band, 0, 1.38, 0);
      part(h.head, boxGeo(0.15, 0.5, 0.45), band, -0.68, 0.65, 0);
      part(h.head, boxGeo(0.15, 0.5, 0.45), band, 0.68, 0.65, 0);
      part(h.head, boxGeo(0.08, 0.08, 0.55), band, -0.68, 0.4, 0.35);
      part(h.torso, boxGeo(1.4, 1.5, 0.65), M(0x4b5320), 0, 0, -0.85); // radio pack
      part(h.torso, boxGeo(0.08, 2.0, 0.08), band, -0.45, 1.6, -0.95); // antenna
    }
    if (level >= 3) {
      // Severe Training: tactical vest, red headband, ammo pouches
      part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x3b3f2a), 0, 0.05, 0);
      part(h.torso, boxGeo(0.45, 0.4, 0.2), M(0x5d4037), -0.5, -0.35, 0.65);
      part(h.torso, boxGeo(0.45, 0.4, 0.2), M(0x5d4037), 0.5, -0.35, 0.65);
      part(h.head, boxGeo(1.28, 0.18, 1.28), M(0xc62828), 0, 1.05, 0);
    }
  }

  const gun = holdLongGun(h, sup ? 1.7 : 1.6, sup ? M(0xeceff1) : dark);
  if (sup) {
    // Laser gun: glowing barrel rails and emitter
    part(gun, boxGeo(0.12, 1.4, 0.12), glow(h, 0x00e5ff), 0.18, -0.85, 0.12);
    part(gun, boxGeo(0.12, 1.4, 0.12), glow(h, 0x00e5ff), -0.18, -0.85, 0.12);
    part(gun, boxGeo(0.4, 0.2, 0.5), glow(h, 0x00e5ff), 0, -1.7, 0);
    h.tracer = 0x00e5ff;
  } else {
    part(gun, boxGeo(0.25, 0.45, 0.55), dark, 0, -0.55, -0.42); // curved mag
    part(gun, boxGeo(0.25, 0.5, 0.35), M(0x4e342e), 0, 0.15, -0.05); // stock
    part(gun, boxGeo(0.2, 0.35, 0.2), dark, 0, -0.9, 0.3); // sight
    h.tracer = 0xffc107;
  }
  return h;
}

/** Marksman tower: long-range rifle. Look changes per level (0-4). */
export function makeMarksman(level) {
  const cyber = level >= 4;
  const h = makeHumanoid(
    cyber
      ? { skin: 0x8d5524, shirt: 0x212121, pants: 0x151515, arms: 0x2c2c2c, face: 'soldier' }
      : { skin: 0x8d5524, shirt: 0x8d7b55, pants: 0x5a4d35, arms: 0x8d7b55, face: 'soldier' },
  );
  const { M } = h;

  if (cyber) {
    // Cyber Hunter: bounty-hunter helmet with a red T-visor, armor, cape
    const steel = M(0x546e7a);
    part(h.head, boxGeo(1.45, 1.45, 1.45), steel, 0, 0.62, 0);
    part(h.head, boxGeo(1.1, 0.22, 0.08), glow(h, 0xff1744), 0, 0.82, 0.74);
    part(h.head, boxGeo(0.22, 0.6, 0.08), glow(h, 0xff1744), 0, 0.5, 0.74);
    part(h.torso, boxGeo(2.2, 1.6, 1.2), steel, 0, 0.15, 0);
    part(h.torso, boxGeo(0.3, 0.3, 0.1), glow(h, 0xff1744), 0.55, 0.5, 0.62);
    part(h.torso, boxGeo(2.0, 2.4, 0.12), M(0x4a1010), 0, -0.4, -0.62); // cape
  } else {
    // Boonie hat
    const hat = M(0x6b5d3f);
    part(h.head, boxGeo(1.9, 0.12, 1.9), hat, 0, 1.25, 0);
    part(h.head, boxGeo(1.3, 0.4, 1.3), hat, 0, 1.45, 0);
    if (level >= 1) {
      // Specs: round glasses
      const frame = M(0x3e2723);
      part(h.head, boxGeo(0.4, 0.34, 0.06), frame, -0.28, 0.66, 0.62);
      part(h.head, boxGeo(0.4, 0.34, 0.06), frame, 0.28, 0.66, 0.62);
      part(h.head, boxGeo(0.3, 0.24, 0.07), M(0xb3e5fc), -0.28, 0.66, 0.63);
      part(h.head, boxGeo(0.3, 0.24, 0.07), M(0xb3e5fc), 0.28, 0.66, 0.63);
      // ...and a spotter pack with a rangefinder
      part(h.torso, boxGeo(1.3, 1.5, 0.6), M(0x6b5d3f), 0, 0, -0.8);
      part(h.torso, boxGeo(0.5, 0.35, 0.7), M(0x263238), 0.4, 1.0, -0.8);
    }
    if (level >= 2) {
      // Headshot Practice: ghillie shawl and bandolier
      part(h.torso, boxGeo(2.3, 0.8, 1.3), M(0x556b2f), 0, 0.7, 0);
      const strap = part(h.torso, boxGeo(0.25, 2.4, 1.12), M(0x4e342e), 0, 0, 0);
      strap.rotation.z = 0.7;
    }
  }

  const len = cyber ? 2.6 : level >= 3 ? 2.8 : 2.4;
  const gun = holdLongGun(h, len, cyber ? M(0x37474f) : level >= 3 ? M(0x212121) : M(0x5d4037));
  const dark = M(0x1a1a1a);
  if (cyber) {
    // Pulse rifle: glowing coils along the barrel
    for (let i = 0; i < 3; i++) part(gun, boxGeo(0.45, 0.15, 0.55), glow(h, 0xff1744), 0, -0.9 - i * 0.5, 0);
    part(gun, boxGeo(0.25, 0.7, 0.3), dark, 0, -0.9, 0.35); // scope
    h.tracer = 0xff1744;
  } else {
    part(gun, boxGeo(0.22, 0.9, 0.3), dark, 0, -0.8, 0.35); // scope
    part(gun, boxGeo(0.14, 0.6, 0.14), dark, 0, -len - 0.3, 0); // barrel tip
    h.muzzles[0].position.y = -len - 0.6;
    if (level >= 3) {
      // The Right Tools: bigger scope, bipod, suppressor
      part(gun, boxGeo(0.3, 0.3, 0.35), dark, 0, -0.35, 0.38);
      part(gun, boxGeo(0.3, 0.3, 0.35), dark, 0, -1.25, 0.38);
      part(gun, boxGeo(0.08, 0.08, 0.7), dark, 0.15, -len + 0.4, -0.45);
      part(gun, boxGeo(0.08, 0.08, 0.7), dark, -0.15, -len + 0.4, -0.45);
    }
    h.tracer = 0xffffff;
  }
  return h;
}

/** Minigun on an arm pivot: body + spinning barrel cluster. Returns { muzzle, barrels }. */
export function addMinigun(h, arm, bodyMat, barrelMat) {
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  arm.add(gun);
  part(gun, boxGeo(0.6, 1.0, 0.65), bodyMat, 0, -0.45, 0);
  part(gun, boxGeo(0.3, 0.45, 0.7), h.M(0x3a3a3a), 0, -0.2, -0.55); // ammo feed
  const barrels = new THREE.Group();
  barrels.position.set(0, -1.0, 0);
  gun.add(barrels);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    part(barrels, boxGeo(0.12, 1.5, 0.12), barrelMat, Math.cos(a) * 0.2, -0.75, Math.sin(a) * 0.2);
  }
  part(barrels, boxGeo(0.5, 0.1, 0.5), bodyMat, 0, -1.3, 0); // barrel clamp
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -2.5, 0);
  gun.add(muzzle);
  return { muzzle, barrels };
}

/** Commando tower: minigun (two at Lv 4). Look changes per level (0-4). */
export function makeCommando(level) {
  const laser = level >= 4;
  const h = makeHumanoid(
    laser
      ? { skin: 0xa0522d, shirt: 0x1b1b1b, pants: 0x111111, arms: 0xa0522d, face: 'soldier' }
      : { skin: 0xa0522d, shirt: 0x556b2f, pants: 0x3e3a2a, arms: 0xa0522d, face: 'soldier' },
  );
  const { M } = h;
  // Muscle tank top with a bandolier, red bandana
  const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), M(0x4e342e), 0, 0, 0);
  strap.rotation.z = -0.7;
  part(h.head, boxGeo(1.28, 0.25, 1.28), M(laser ? 0xff1744 : 0xc62828), 0, 1.05, 0);
  part(h.head, boxGeo(0.3, 0.6, 0.15), M(laser ? 0xff1744 : 0xc62828), 0.3, 0.75, -0.66); // bandana tails
  if (level >= 1) {
    // Handling: fingerless gloves + knee pads
    const glove = M(0x212121);
    part(h.rightArm, boxGeo(1.05, 0.5, 1.05), glove, 0, -1.75, 0);
    part(h.leftArm, boxGeo(1.05, 0.5, 1.05), glove, 0, -1.75, 0);
    part(h.rightLeg, boxGeo(1.05, 0.4, 0.3), glove, 0, -1.2, 0.45);
    part(h.leftLeg, boxGeo(1.05, 0.4, 0.3), glove, 0, -1.2, 0.45);
  }
  if (level >= 2) {
    // Goggles: tactical night-vision goggles
    part(h.head, boxGeo(1.3, 0.12, 1.3), M(0x263238), 0, 0.72, 0);
    part(h.head, boxGeo(0.4, 0.32, 0.35), M(0x263238), -0.28, 0.7, 0.72);
    part(h.head, boxGeo(0.4, 0.32, 0.35), M(0x263238), 0.28, 0.7, 0.72);
    part(h.head, boxGeo(0.25, 0.2, 0.05), glow(h, laser ? 0xff1744 : 0x76ff03), -0.28, 0.7, 0.9);
    part(h.head, boxGeo(0.25, 0.2, 0.05), glow(h, laser ? 0xff1744 : 0x76ff03), 0.28, 0.7, 0.9);
    part(h.torso, boxGeo(1.6, 1.8, 0.8), M(0x3a3a3a), 0, 0, -0.9); // ammo backpack
    part(h.torso, boxGeo(0.3, 0.3, 1.2), M(0xc9a227), -0.85, -0.6, -0.4); // feed belt
  }
  if (laser) {
    // Laser Wield: armored chest plate with a glowing core
    part(h.torso, boxGeo(2.15, 1.6, 1.15), M(0x2b2b2b), 0, 0.1, 0);
    part(h.torso, boxGeo(0.5, 0.5, 0.1), glow(h, 0xff1744), 0, 0.3, 0.6);
  }

  const bodyMat = M(laser ? 0x37474f : 0x424242);
  const barrelMat = laser ? glow(h, 0xff1744) : M(0x1f1f1f);
  const right = addMinigun(h, h.rightArm, bodyMat, barrelMat);
  h.muzzles = [right.muzzle];
  h.spin = [right.barrels];
  if (level >= 3) {
    const left = addMinigun(h, h.leftArm, bodyMat, barrelMat);
    h.muzzles.push(left.muzzle);
    h.spin.push(left.barrels);
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.12);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.12);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.15 };
  } else {
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.15, 0, -0.55);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.15, leftRecoil: 0.1 };
  }
  h.recoilScale = 0.25; // miniguns barely kick
  h.tracer = laser ? 0xff1744 : 0xffd740;
  return h;
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

/**
 * Golden Scout (golden perk of the base Scout). Lv 2 yellow sunglasses, Lv 3 a big golden Desert
 * Eagle, Lv 4 a detective's trench coat and fedora with two pistols, Lv 5 AGENT AU: a gold suit,
 * halo, golden wings and twin laser pistols.
 */
export function makeGoldScout(level) {
  const au = level >= 4;
  const detective = level >= 3;
  const h = makeHumanoid(
    au
      ? { skin: 0xe0ac69, shirt: 0x8a6d1d, pants: 0x6b5416, arms: 0x8a6d1d, face: 'agent' }
      : detective
        ? { skin: 0xe0ac69, shirt: 0xb08d57, pants: 0x5d4a2a, arms: 0xb08d57, face: 'agent' }
        : { skin: 0xe0ac69, shirt: 0x6b7d3a, pants: 0x4b5320, arms: 0x6b7d3a, face: 'soldier' },
  );
  const { M } = h;

  if (detective) {
    // Gilded Detective: fedora and a long trench coat
    const hat = M(au ? 0x3a2c0a : 0x4e3b1f);
    part(h.head, boxGeo(1.9, 0.12, 1.9), hat, 0, 1.25, 0);
    part(h.head, boxGeo(1.25, 0.6, 1.25), hat, 0, 1.6, 0);
    part(h.torso, boxGeo(2.1, 1.7, 0.2), M(au ? 0x8a6d1d : 0xa07f4c), 0, -1.5, -0.45); // coat tails
    part(h.torso, boxGeo(0.2, 1.4, 0.07), M(au ? 0xfff3c4 : 0x5d1a1a), 0, 0.1, 0.53); // tie
  } else {
    const helm = M(0x556b2f);
    part(h.head, boxGeo(1.45, 0.55, 1.45), helm, 0, 1.3, 0);
    part(h.head, boxGeo(1.5, 0.12, 0.45), helm, 0, 1.05, 0.62); // brim
    if (level >= 1) part(h.torso, boxGeo(1.3, 1.4, 0.6), M(0x4b5320), 0, 0.1, -0.8); // pack
  }
  if (au) addWings(h, M(0xfff3c4));

  // Guns: a small gun, then one big Deagle (Lv 3), then two pistols (Lv 4), laser pistols at Lv 5.
  const muzzles = [];
  if (level >= 3) {
    const opts = { body: 0x2b2b2b, laser: au, trim: au ? 0xfff176 : null };
    muzzles.push(addHandgun(h, h.rightArm, opts), addHandgun(h, h.leftArm, opts));
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.08);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.08);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
  } else {
    const gun = new THREE.Group();
    gun.position.set(0, -1.9, 0);
    h.rightArm.add(gun);
    const deagle = level >= 2;
    const len = deagle ? 1.5 : 1.1;
    part(gun, boxGeo(deagle ? 0.42 : 0.32, len, deagle ? 0.5 : 0.42), M(0x2b2b2b), 0, -len / 2, 0);
    part(gun, boxGeo(0.3, 0.35, 0.65), M(0x1f1f1f), 0, -0.05, -0.35); // grip
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, -len, 0);
    gun.add(muzzle);
    muzzles.push(muzzle);
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
  }

  goldify(h);

  if (level >= 1) {
    // Epic Glasses: yellow sunglasses (they stay yellow, added after the gold recolour)
    part(h.head, boxGeo(1.25, 0.1, 0.08), M(0x3a2c0a), 0, 0.8, 0.63);
    part(h.head, boxGeo(0.42, 0.3, 0.07), glow(h, 0xffea00), -0.27, 0.66, 0.63);
    part(h.head, boxGeo(0.42, 0.3, 0.07), glow(h, 0xffea00), 0.27, 0.66, 0.63);
  }
  if (au) addHalo(h, 0xfff176);

  h.muzzles = muzzles;
  h.tracer = au ? 0xfff176 : 0xffd54f;
  return h;
}

/** A big spinning cannon held in both hands: `n` barrels. Returns { muzzle, barrels }. */
export function addCannon(h, arm, bodyMat, barrelMat, n) {
  const gun = new THREE.Group();
  gun.position.set(-0.3, -1.9, 0);
  arm.add(gun);
  part(gun, boxGeo(0.95, 1.3, 1.0), bodyMat, 0, -0.55, 0);
  part(gun, boxGeo(0.45, 0.6, 1.0), h.M(0x3a3a3a), 0, -0.3, -0.8); // ammo feed
  const barrels = new THREE.Group();
  barrels.position.set(0, -1.2, 0);
  gun.add(barrels);
  const r = n > 6 ? 0.36 : 0.3;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    part(barrels, boxGeo(0.16, 2.0, 0.16), barrelMat, Math.cos(a) * r, -1.0, Math.sin(a) * r);
  }
  for (const y of [-0.3, -1.8]) part(barrels, boxGeo(0.85, 0.12, 0.85), bodyMat, 0, y, 0); // clamps
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -3.2, 0);
  gun.add(muzzle);
  return { muzzle, barrels };
}

/**
 * Golden Commando (golden perk of the base Commando). Lv 2 gold gloves, Lv 3 gold goggles,
 * Lv 4 a six-barrel Golden Heavy Cannon, Lv 5 an eight-barrel Golden Laser Cannon with golden
 * armor, wings and a halo.
 */
export function makeGoldCommando(level) {
  const heavy = level >= 3;
  const laser = level >= 4;
  const h = makeHumanoid({ skin: 0xa0522d, shirt: 0x556b2f, pants: 0x3e3a2a, arms: 0xa0522d, face: 'soldier' });
  const { M } = h;
  const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), M(0x4e342e), 0, 0, 0);
  strap.rotation.z = -0.7;
  part(h.head, boxGeo(1.28, 0.25, 1.28), M(0xc62828), 0, 1.05, 0); // bandana
  part(h.head, boxGeo(0.3, 0.6, 0.15), M(0xc62828), 0.3, 0.75, -0.66);
  if (level >= 1) {
    // Grip: gold gloves and knee pads
    const glove = M(0xffd54f);
    part(h.rightArm, boxGeo(1.05, 0.5, 1.05), glove, 0, -1.75, 0);
    part(h.leftArm, boxGeo(1.05, 0.5, 1.05), glove, 0, -1.75, 0);
    part(h.rightLeg, boxGeo(1.05, 0.4, 0.3), glove, 0, -1.2, 0.45);
    part(h.leftLeg, boxGeo(1.05, 0.4, 0.3), glove, 0, -1.2, 0.45);
  }
  if (level >= 2) {
    // Gold Goggles
    part(h.head, boxGeo(1.3, 0.12, 1.3), M(0x8d6e1a), 0, 0.72, 0);
    part(h.head, boxGeo(0.4, 0.32, 0.35), M(0x8d6e1a), -0.28, 0.7, 0.72);
    part(h.head, boxGeo(0.4, 0.32, 0.35), M(0x8d6e1a), 0.28, 0.7, 0.72);
    part(h.head, boxGeo(0.25, 0.2, 0.05), glow(h, 0xffea00), -0.28, 0.7, 0.9);
    part(h.head, boxGeo(0.25, 0.2, 0.05), glow(h, 0xffea00), 0.28, 0.7, 0.9);
    part(h.torso, boxGeo(1.6, 1.8, 0.8), M(0x3a3a3a), 0, 0, -0.9); // ammo backpack
  }
  if (laser) {
    // Golden armor: chest plate, shoulder pads, wings and a halo
    part(h.torso, boxGeo(2.2, 1.7, 1.2), M(0xeeeeee), 0, 0.1, 0);
    part(h.torso, boxGeo(0.5, 0.5, 0.1), glow(h, 0xfff176), 0, 0.3, 0.62);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.15, 0.7, 1.15), M(0xeeeeee), 0, -0.25, 0);
    addWings(h, M(0xfff3c4));
  }

  const bodyMat = M(0x424242);
  const barrelMat = laser ? glow(h, 0xfff176) : M(0x1f1f1f);
  if (heavy) {
    // Heavy / Laser Cannon: one big spinning cannon held in both hands
    const c = addCannon(h, h.rightArm, bodyMat, barrelMat, laser ? 8 : 6);
    h.muzzles = [c.muzzle];
    h.spin = [c.barrels];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.15);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.45);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.1 };
  } else {
    const g = addMinigun(h, h.rightArm, bodyMat, barrelMat);
    h.muzzles = [g.muzzle];
    h.spin = [g.barrels];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.15, 0, -0.55);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.15, leftRecoil: 0.1 };
  }

  goldify(h);
  if (laser) addHalo(h, 0xfff176);

  h.recoilScale = 0.25;
  h.tracer = laser ? 0xfff176 : 0xffd740;
  return h;
}

/** The Aviator's plane (faces +Z). Its `bank` child is rolled by the view while turning. */
export function makePlane(h, level) {
  const { M } = h;
  const plane = new THREE.Group();
  const bank = new THREE.Group();
  plane.add(bank);
  const muzzles = [];
  const missiles = [];
  const muzzle = (x, y, z, list = muzzles) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    bank.add(m);
    list.push(m);
  };
  let prop = null;

  if (level <= 2) {
    // Propeller plane (red, or spy grey at Lv 3)
    const spy = level >= 2;
    const body = M(spy ? 0x78909c : 0xd32f2f);
    const trim = M(spy ? 0x37474f : 0xfafafa);
    part(bank, boxGeo(1.2, 1.2, 5), body, 0, 0, 0);
    part(bank, boxGeo(7, 0.2, 1.5), body, 0, -0.2, 0.4); // wings
    part(bank, boxGeo(7.05, 0.22, 0.4), trim, 0, -0.2, 0.2); // wing stripe
    part(bank, boxGeo(2.6, 0.15, 0.9), body, 0, 0.1, -2.2); // tail wings
    part(bank, boxGeo(0.15, 1.1, 1.0), body, 0, 0.7, -2.2); // tail fin
    part(bank, boxGeo(0.9, 0.5, 1.1), M(0x90caf9), 0, 0.75, 0.6); // cockpit glass
    part(bank, boxGeo(0.7, 0.7, 0.4), trim, 0, 0, 2.6); // nose cone
    prop = new THREE.Group();
    prop.position.set(0, 0, 2.85);
    bank.add(prop);
    part(prop, boxGeo(0.3, 2.6, 0.1), M(0x3e2723), 0, 0, 0);
    if (level >= 1) {
      // Bombs Away: bombs under the wings
      const bombM = M(0x263238);
      part(bank, boxGeo(0.4, 0.4, 1.0), bombM, -2, -0.6, 0.4);
      part(bank, boxGeo(0.4, 0.4, 1.0), bombM, 2, -0.6, 0.4);
    }
    if (spy) {
      // Spy Plane: camera pod and radar dish
      part(bank, boxGeo(0.6, 0.5, 0.6), M(0x212121), 0, -0.8, 1.3);
      part(bank, boxGeo(0.35, 0.3, 0.1), glow(h, 0x00e5ff), 0, -0.85, 1.62);
      part(bank, boxGeo(1.6, 0.12, 1.6), M(0xeceff1), 0, 1.15, -0.6);
    }
    muzzle(-0.9, -0.2, 1.2);
    muzzle(0.9, -0.2, 1.2);
  } else if (level === 3) {
    // Rapid Fire: grey fighter jet with swept wings and an afterburner
    const body = M(0x90a4ae);
    const dark = M(0x455a64);
    part(bank, boxGeo(1.1, 1.0, 6), body, 0, 0, 0);
    part(bank, boxGeo(0.6, 0.6, 1.2), dark, 0, -0.05, 3.5); // nose
    part(bank, boxGeo(0.8, 0.5, 1.4), M(0x4fc3f7), 0, 0.6, 1.3); // canopy
    for (const side of [-1, 1]) {
      const w = part(bank, boxGeo(3.4, 0.15, 2.0), body, side * 2.0, -0.1, -0.4);
      w.rotation.y = side * 0.45;
      const fin = part(bank, boxGeo(0.12, 1.2, 1.1), dark, side * 0.5, 0.8, -2.5);
      fin.rotation.z = side * -0.3;
      part(bank, boxGeo(1.4, 0.12, 0.8), body, side * 1.0, 0, -2.7); // tail wing
    }
    part(bank, boxGeo(0.8, 0.8, 0.3), glow(h, 0xff9100), 0, 0, -3.1); // afterburner
    muzzle(-0.6, -0.2, 2.6);
    muzzle(0.6, -0.2, 2.6);
  } else {
    // Space Craft: black stealth gunship (flying wing) with glowing trim and missile pods
    const black = M(0x1c1c24);
    const trim = glow(h, 0xb388ff);
    part(bank, boxGeo(2.2, 0.8, 5), black, 0, 0, 0);
    for (const side of [-1, 1]) {
      const w = part(bank, boxGeo(4.4, 0.3, 3.0), black, side * 2.6, -0.1, -0.7);
      w.rotation.y = side * 0.55;
      const edge = part(bank, boxGeo(4.4, 0.1, 0.15), trim, side * 2.95, 0, 0.6);
      edge.rotation.y = side * 0.55;
      part(bank, boxGeo(0.5, 0.5, 1.6), M(0x37474f), side * 2.2, -0.55, 0.2); // missile pod
      part(bank, boxGeo(0.3, 0.3, 0.1), glow(h, 0xff3d00), side * 2.2, -0.55, 1.02);
      muzzle(side * 2.2, -0.55, 1.1, missiles);
    }
    part(bank, boxGeo(1.4, 0.35, 1.5), glow(h, 0x7c4dff), 0, 0.5, 1.2); // canopy
    part(bank, boxGeo(1.6, 0.4, 0.2), trim, 0, 0, -2.55); // engine glow
    muzzle(-0.7, -0.3, 2.5);
    muzzle(0.7, -0.3, 2.5);
  }
  const bay = new THREE.Object3D();
  bay.position.set(0, -0.8, 0);
  bank.add(bay);
  plane.userData = { bank, prop, bay, missiles };
  return { plane, muzzles };
}

/** Aviator tower: a pilot on the runway pad, plus a plane the view flies in circles. */
export function makeAviator(level) {
  const jet = level >= 3;
  const space = level >= 4;
  const h = makeHumanoid(
    space
      ? { skin: 0xf1c27d, shirt: 0x1c1c24, pants: 0x1c1c24, arms: 0x1c1c24 }
      : jet
        ? { skin: 0xf1c27d, shirt: 0x5b6b3a, pants: 0x4b5a30, arms: 0x5b6b3a }
        : { skin: 0xf1c27d, shirt: 0x6d4c41, pants: 0x5d4e37, arms: 0x6d4c41 },
  );
  const { M } = h;
  if (jet) {
    // Flight helmet with a visor
    part(h.head, boxGeo(1.45, 1.4, 1.45), M(space ? 0x263238 : 0xeceff1), 0, 0.65, -0.03);
    part(h.head, boxGeo(1.2, 0.45, 0.08), space ? glow(h, 0xb388ff) : M(0xffb300), 0, 0.7, 0.7);
  } else {
    // Leather aviator cap with goggles, white scarf
    const cap = M(0x5d4037);
    part(h.head, boxGeo(1.35, 0.6, 1.35), cap, 0, 1.0, -0.02);
    part(h.head, boxGeo(0.3, 0.6, 0.6), cap, -0.66, 0.5, 0);
    part(h.head, boxGeo(0.3, 0.6, 0.6), cap, 0.66, 0.5, 0);
    part(h.head, boxGeo(1.3, 0.12, 0.1), M(0x3e2723), 0, 1.05, 0.66);
    part(h.head, boxGeo(0.4, 0.3, 0.08), M(0x80deea), -0.28, 1.05, 0.7);
    part(h.head, boxGeo(0.4, 0.3, 0.08), M(0x80deea), 0.28, 1.05, 0.7);
    part(h.torso, boxGeo(1.6, 0.4, 1.2), M(0xfafafa), 0, 0.85, 0.05); // scarf
    part(h.torso, boxGeo(0.4, 1.0, 0.1), M(0xfafafa), 0.5, 0.2, 0.55);
  }
  if (level >= 1) {
    // Bombs Away: a cart of spare bombs on the runway
    part(h.root, boxGeo(1.6, 0.5, 1.0), M(0x5d4037), 1.9, 0.25, 0.8);
    for (const z of [0.55, 1.05]) part(h.root, boxGeo(1.2, 0.45, 0.45), M(0x263238), 1.9, 0.7, z);
  }
  if (level >= 2) {
    // Spy Plane: radio headset (antenna)
    part(h.head, boxGeo(0.08, 0.9, 0.08), M(0x212121), -0.7, 1.6, -0.2);
  }
  // Waving the plane in: right arm raised high, left at the side.
  h.rightArm.rotation.set(Math.PI * 0.85, 0, 0.25);
  h.pose = { right: Math.PI * 0.85, left: 0, leftRecoil: 0 };
  const { plane, muzzles } = makePlane(h, level);
  h.plane = plane;
  h.muzzles = muzzles;
  h.flyHeight = 14;
  h.tracer = space ? 0xb388ff : 0xffe082;
  return h;
}

/** Phaser tower: sci-fi trooper with a beam gun. Look changes per level (0-4). */
export function makePhaser(level) {
  const ray = level >= 3;
  const anni = level >= 4;
  const beam = anni ? 0xd500f9 : ray ? 0xff1744 : 0x40c4ff;
  const h = makeHumanoid(
    anni
      ? { skin: 0xe0ac69, shirt: 0x4a148c, pants: 0x311b92, arms: 0x4a148c, face: 'soldier' }
      : ray
        ? { skin: 0xe0ac69, shirt: 0x212121, pants: 0x1a1a1a, arms: 0x212121, face: 'soldier' }
        : { skin: 0xe0ac69, shirt: 0xeceff1, pants: 0x90a4ae, arms: 0xeceff1, face: 'soldier' },
  );
  const { M } = h;
  const armor = M(anni ? 0xffc400 : ray ? 0x424242 : 0xb0bec5);
  // Visor helmet
  part(h.head, boxGeo(1.4, 1.35, 1.4), armor, 0, 0.65, -0.03);
  part(h.head, boxGeo(1.2, 0.35, 0.08), glow(h, beam), 0, 0.72, 0.68);
  if (level >= 1) {
    // Handling: shoulder pads
    part(h.torso, boxGeo(0.8, 0.45, 1.3), armor, -1.4, 1.0, 0);
    part(h.torso, boxGeo(0.8, 0.45, 1.3), armor, 1.4, 1.0, 0);
  }
  if (level >= 2) {
    // Extra Juice: power pack with glowing cells
    part(h.torso, boxGeo(1.5, 1.7, 0.7), M(0x37474f), 0, 0, -0.85);
    for (let i = 0; i < 3; i++) part(h.torso, boxGeo(0.3, 1.2, 0.1), glow(h, beam), -0.45 + i * 0.45, 0, -1.22);
  }
  if (ray) {
    part(h.torso, boxGeo(2.2, 1.7, 1.2), armor, 0, 0.05, 0);
    part(h.torso, boxGeo(0.55, 0.55, 0.1), glow(h, beam), 0, 0.3, 0.62);
  }
  if (anni) {
    // Annihilation: crown-like crest on the helmet
    for (const x of [-0.45, 0, 0.45]) part(h.head, boxGeo(0.2, 0.6, 0.2), M(0xffc400), x, 1.55, 0);
  }

  const len = anni ? 2.4 : ray ? 2.1 : 1.8;
  const gun = holdLongGun(h, len, M(anni ? 0x311b92 : ray ? 0x263238 : 0xeceff1));
  part(gun, boxGeo(0.5, 0.7, 0.55), M(0x546e7a), 0, -0.3, 0); // receiver
  const rings = anni ? 4 : 2;
  for (let i = 0; i < rings; i++) part(gun, boxGeo(0.55, 0.12, 0.6), glow(h, beam), 0, -0.9 - i * 0.35, 0);
  part(gun, boxGeo(0.45, 0.25, 0.5), glow(h, beam), 0, -len, 0); // emitter
  if (level >= 1) part(gun, boxGeo(0.22, 0.6, 0.3), M(0x212121), 0, -0.8, 0.35); // scope
  h.muzzles[0].position.y = -len - 0.15;
  h.beam = beam;
  h.tracer = beam;
  return h;
}

/** Railgunner tower: rail rifle, then a mounted Sentry, then a heavy cannon (levels 0-4). */
export function makeRailgunner(level) {
  const sentry = level >= 3;
  const ngw = level >= 4;
  const h = makeHumanoid({ skin: 0x8d5524, shirt: 0x37474f, pants: 0x263238, arms: 0x37474f, face: 'soldier' });
  const { M } = h;
  const coil = 0x29b6f6;
  // Cap with a glowing targeting monocle
  part(h.head, boxGeo(1.35, 0.35, 1.35), M(0x263238), 0, 1.2, 0);
  part(h.head, boxGeo(1.4, 0.1, 0.5), M(0x263238), 0, 1.05, 0.6);
  part(h.head, boxGeo(0.35, 0.3, 0.1), glow(h, coil), -0.28, 0.7, 0.62);
  if (level >= 1) {
    // Faster Reloading: battery pouches on a belt
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x4e342e), 0, -0.85, 0);
    for (const x of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.4, 0.45, 0.25), M(0x455a64), x, -0.75, 0.6);
  }
  if (level >= 2) {
    // Extra Juice: capacitor backpack
    part(h.torso, boxGeo(1.5, 1.8, 0.7), M(0x263238), 0, 0, -0.85);
    part(h.torso, boxGeo(0.35, 1.4, 0.1), glow(h, coil), 0, 0, -1.22);
  }

  if (!sentry) {
    const len = 3.0;
    const gun = holdLongGun(h, len, M(0x263238));
    for (let i = 0; i < 4; i++) part(gun, boxGeo(0.45, 0.1, 0.55), glow(h, coil), 0, -0.8 - i * 0.5, 0);
    part(gun, boxGeo(0.22, 0.8, 0.3), M(0x111111), 0, -0.7, 0.35); // scope
    if (level >= 2) part(gun, boxGeo(0.5, 0.7, 0.5), M(0x455a64), 0, -0.2, -0.3); // power cell
    h.muzzles[0].position.y = -len - 0.1;
    h.tracer = coil;
    h.tracerWidth = 0.35;
    return h;
  }

  // Sentry / Next Generation Warfare: a mounted gun on the root (turns with the tower).
  const mount = new THREE.Group();
  h.root.add(mount);
  const steel = M(ngw ? 0x37474f : 0x546e7a);
  const barrelLen = ngw ? 7 : 5;
  const bw = ngw ? 1.2 : 0.6;
  const gy = ngw ? 3.0 : 2.7;
  const gz = ngw ? 1.8 : 1.2;
  if (ngw) {
    part(mount, boxGeo(3.4, 1.6, 3.4), steel, 0, 0.8, gz); // heavy base
    part(mount, boxGeo(2.4, 1.2, 2.6), M(0x263238), 0, 2.2, gz);
  } else {
    part(mount, boxGeo(0.4, 2.2, 0.4), steel, 0, 1.1, gz); // tripod post
    for (const a of [0, 2.1, 4.2]) {
      const leg = part(mount, boxGeo(0.25, 1.6, 0.25), steel, Math.sin(a) * 0.6, 0.6, gz + Math.cos(a) * 0.6);
      leg.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5);
    }
  }
  part(mount, boxGeo(bw + 0.5, bw + 0.4, 1.6), steel, 0, gy, gz); // breech
  part(mount, boxGeo(bw, bw, barrelLen), M(0x212121), 0, gy, gz + barrelLen / 2 + 0.5);
  const coils = ngw ? 6 : 4;
  for (let i = 0; i < coils; i++) part(mount, boxGeo(bw + 0.25, bw + 0.25, 0.25), glow(h, coil), 0, gy, gz + 1.3 + i * ((barrelLen - 1) / coils));
  if (ngw) {
    part(mount, boxGeo(0.5, 0.5, 4), M(0x212121), bw * 0.7, gy + 0.6, gz + 2.5); // side rails
    part(mount, boxGeo(0.5, 0.5, 4), M(0x212121), -bw * 0.7, gy + 0.6, gz + 2.5);
  } else {
    part(mount, boxGeo(1.6, 1.0, 0.15), steel, 0, gy + 0.2, gz - 0.2); // gun shield
  }
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, gy, gz + barrelLen + 0.6);
  mount.add(muzzle);
  h.muzzles = [muzzle];

  if (!ngw) {
    // Seated behind the turret: lower the body, legs forward, on a little seat.
    part(h.root, boxGeo(1.6, 1.0, 1.4), steel, 0, 0.5, -0.3);
    h.lift = -0.9;
    h.bob = 0.02;
    h.body.position.y = h.lift;
    h.rightLeg.rotation.x = -Math.PI / 2;
    h.leftLeg.rotation.x = -Math.PI / 2;
  }
  h.rightArm.rotation.set(-Math.PI / 2 + 0.2, 0, 0.2);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.2, 0, -0.2);
  h.pose = { right: -Math.PI / 2 + 0.2, left: -Math.PI / 2 + 0.2, leftRecoil: 0.35 };
  h.tracer = ngw ? 0x00e5ff : coil;
  h.tracerWidth = ngw ? 0.9 : 0.55;
  return h;
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

/** Sniper tower (cliff): very long rifle. Ghillie suit at Lv 5. */
export function makeSniper(level) {
  const ghillie = level >= 4;
  const h = makeHumanoid({ skin: 0xd2a679, shirt: 0x4e5b3a, pants: 0x3b4530, arms: 0x4e5b3a, face: 'soldier' });
  const { M } = h;
  const dark = M(0x1a1a1a);
  part(h.head, boxGeo(1.35, 0.4, 1.35), M(0x33402a), 0, 1.2, 0); // knit cap
  if (level >= 2) {
    // Spotter Scope: radio headset with a tall antenna
    part(h.head, boxGeo(0.15, 0.5, 0.45), dark, -0.68, 0.65, 0);
    part(h.head, boxGeo(0.08, 1.2, 0.08), dark, -0.72, 1.4, -0.25);
    // ...a tactical vest, and a spotting scope on a tripod beside them
    if (!ghillie) part(h.torso, boxGeo(2.15, 1.5, 1.15), M(0x2f3a24), 0, -0.1, 0);
    part(h.root, boxGeo(0.15, 2.4, 0.15), dark, 1.9, 1.2, 0.6);
    part(h.root, boxGeo(0.45, 0.45, 1.4), M(0x37474f), 1.9, 2.5, 0.8);
    part(h.root, boxGeo(0.35, 0.35, 0.06), M(0x4fc3f7), 1.9, 2.5, 1.52);
  }
  if (level >= 3) part(h.root, boxGeo(1.1, 0.6, 0.7), M(0x33402a), -1.9, 0.3, 0.6); // .50 ammo can
  if (ghillie) {
    // Ghillie suit: shaggy leafy chunks all over
    const leaves = [M(0x556b2f), M(0x6b8e23), M(0x3d5229), M(0x7a8b45)];
    let n = 0;
    const tuft = (parent, x, y, z, sz = 0.55) => part(parent, boxGeo(sz, sz * 0.8, sz), leaves[n++ % leaves.length], x, y, z);
    for (const x of [-0.75, 0, 0.75]) for (const y of [-0.6, 0.2, 0.9]) {
      tuft(h.torso, x, y, 0.52);
      tuft(h.torso, x, y, -0.52);
    }
    for (const x of [-0.5, 0.2, 0.6]) tuft(h.head, x, 1.45, (x * 7) % 0.6 - 0.2, 0.6);
    for (const arm of [h.rightArm, h.leftArm]) for (const y of [-0.5, -1.3]) tuft(arm, 0.45, y, 0, 0.45);
    for (const leg of [h.rightLeg, h.leftLeg]) tuft(leg, 0, -0.8, 0.45, 0.5);
  }
  const len = 3.4;
  const gun = holdLongGun(h, len, M(level >= 3 ? 0x263238 : 0x5d4037));
  const scope = level >= 1 ? 1.3 : 0.9;
  part(gun, boxGeo(0.26, scope, 0.32), dark, 0, -0.9, 0.38); // scope
  part(gun, boxGeo(0.3, 0.6, 0.4), M(0x3e2723), 0, 0.2, -0.05); // stock
  if (level >= 1) {
    // Steady Aim: a bipod under the barrel and a camo scarf
    for (const x of [-0.18, 0.18]) part(gun, boxGeo(0.08, 0.08, 0.9), dark, x, -len + 0.5, -0.5);
    part(h.head, boxGeo(1.26, 0.45, 0.1), M(0x6b7d3a), 0, 0.25, 0.62);
    if (!ghillie) part(h.torso, boxGeo(2.3, 1.0, 1.3), M(0x6b7d3a), 0, 0.6, 0); // camo poncho
  }
  if (level >= 3) part(gun, boxGeo(0.42, 0.45, 0.5), dark, 0, -len, 0); // muzzle brake on the .50
  if (ghillie) for (const y of [-0.6, -1.6, -2.5]) part(gun, boxGeo(0.45, 0.4, 0.5), M(0x556b2f), 0, y, -0.1);
  h.muzzles[0].position.y = -len - 0.3;
  h.tracer = 0xffffff;
  h.tracerWidth = level >= 3 ? 0.25 : undefined;
  return h;
}

/**
 * Tactical Sniper (alternate Sniper form): a modern operator in grey-blue gear with a shard
 * patch. Top path: Lv 2 headset + scope, Lv 3 Intervention heavy rifle, Lv 4 AP Bullets dark
 * hooded cloak (stealthy), Lv 5 Pathfinder armor plates. Bottom path (`bottom`): Lv 2-3 ammo
 * pouches, Lv 4 Marksman vest, Lv 5 red Laser Eye visor, Lv 6 glowing red Laser Barrett.
 */
export function makeSniperTactical(level, bottom = false) {
  const top = !bottom;
  const cloak = top && level >= 4;
  const laser = bottom && level >= 5;
  const shirt = cloak ? 0x1b1f24 : 0x546e7a;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: cloak ? 0x15181c : 0x37474f, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(0x1a1a1a);
  const shard = glow(h, 0xb388ff);
  const red = glow(h, 0xff1744);

  // Ball cap (a hood once it's stealthy)
  const cap = M(cloak ? 0x111417 : 0x263238);
  part(h.head, boxGeo(1.4, 0.45, 1.4), cap, 0, 1.28, 0);
  if (cloak) {
    part(h.head, boxGeo(1.6, 1.4, 0.3), cap, 0, 0.8, -0.72);
    for (const x of [-0.78, 0.78]) part(h.head, boxGeo(0.12, 1.3, 1.5), cap, x, 0.75, 0);
    // Long dark cloak over the back
    part(h.torso, boxGeo(2.3, 2.4, 0.2), M(0x111417), 0, -0.4, -0.62);
  } else part(h.head, boxGeo(1.4, 0.1, 0.6), cap, 0, 1.08, 0.75);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, 0.55, 0.45, 0.52); // shoulder-patch emblem

  if (top && level >= 2) {
    // Enhanced Sight: headset with a little purple monocle
    part(h.head, boxGeo(0.15, 0.5, 0.45), dark, -0.68, 0.65, 0);
    part(h.head, boxGeo(0.3, 0.3, 0.12), shard, 0.28, 0.72, 0.72);
  }
  if (top && level >= 5) {
    // Pathfinder: heavy armor plates on chest and shoulders
    const plate = M(0x2b3238);
    part(h.torso, boxGeo(2.2, 1.6, 1.25), plate, 0, -0.05, 0);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.15, 0.6, 1.15), plate, 0, -0.2, 0);
    part(h.torso, boxGeo(0.5, 0.5, 0.06), shard, 0, 0.1, 0.64);
  }
  if (bottom && level >= 1) {
    // High Velocity / 160 GR Bullet: ammo pouches on the belt
    const n = level >= 2 ? 3 : 2;
    for (let k = 0; k < n; k++) part(h.torso, boxGeo(0.4, 0.45, 0.3), M(0x4e5b3a), -0.6 + k * 0.6, -0.85, 0.6);
  }
  if (bottom && level >= 3) part(h.torso, boxGeo(2.15, 1.5, 1.15), M(0x3a4750), 0, -0.1, 0); // Marksman vest
  if (bottom && level >= 4) {
    // Laser Eye: a red glowing eyepiece and a flare gun on the hip
    part(h.head, boxGeo(1.2, 0.25, 0.15), dark, 0, 0.72, 0.7);
    part(h.head, boxGeo(0.4, 0.25, 0.08), red, 0.27, 0.72, 0.79);
    part(h.root, boxGeo(0.3, 0.5, 0.7), M(0xff6f00), 1.4, 1.8, 0.3);
  }

  // Rifle: longer and heavier on the Top path, a glowing laser rifle at Laser Barrett
  const len = laser ? 4.2 : top && level >= 3 ? 4 : 3.4;
  const gun = holdLongGun(h, len, M(laser ? 0x212121 : cloak ? 0x15181c : 0x37474f));
  part(gun, boxGeo(0.26, level >= 1 ? 1.4 : 1.0, 0.32), dark, 0, -0.9, 0.38); // scope
  part(gun, boxGeo(0.3, 0.6, 0.4), M(0x263238), 0, 0.2, -0.05); // stock
  if (level >= 1) for (const x of [-0.18, 0.18]) part(gun, boxGeo(0.08, 0.08, 0.9), dark, x, -len + 0.5, -0.5); // bipod
  if (top && level >= 3) part(gun, boxGeo(0.42, 0.5, 0.5), dark, 0, -len, 0); // muzzle brake
  if (cloak) part(gun, boxGeo(0.08, len * 0.6, 0.08), shard, 0.2, -len * 0.45, 0.2);
  if (laser) {
    part(gun, boxGeo(0.12, len * 0.8, 0.12), red, 0.2, -len * 0.5, 0.15);
    part(gun, boxGeo(0.35, 0.35, 0.35), red, 0, -len, 0);
  }
  h.muzzles[0].position.y = -len - 0.3;
  h.tracer = laser ? 0xff1744 : 0xffffff;
  h.tracerWidth = laser || (top && level >= 3) ? 0.25 : undefined;
  return h;
}
const makeSniperTacticalBottom = (level) => makeSniperTactical(level, true);

/**
 * Classic Sniper (alternate Sniper form): a desert marksman with a bolt-action rifle.
 * Lv 2 bandolier, Lv 3 vest + headset + shard goggles, Lv 4 helmet + ammo crate,
 * Lv 5 black Spec Ops kit with quad night-vision goggles and a purple-trimmed rifle.
 */
export function makeSniperClassic(level) {
  const spec = level >= 4;
  const geared = level >= 2;
  const shirt = spec ? 0x1c1726 : 0xb89a6a;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: spec ? 0x14101c : 0x8d7a55, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(0x1a1a1a);
  const shard = glow(h, 0xb388ff);

  if (level >= 3) {
    // Frontlines Sniping: combat helmet (black at Spec Ops) and an ammo crate beside them
    const helm = M(spec ? 0x14101c : 0x6d6047);
    part(h.head, boxGeo(1.45, 0.55, 1.45), helm, 0, 1.3, 0);
    part(h.head, boxGeo(1.5, 0.12, 0.4), helm, 0, 1.05, 0.62);
    part(h.root, boxGeo(1.2, 0.7, 0.8), M(spec ? 0x263238 : 0x5d4c2e), -1.9, 0.35, 0.6);
    part(h.root, boxGeo(0.3, 0.3, 0.05), shard, -1.9, 0.4, 1.02);
  } else {
    // Wide-brim boonie hat with the shard emblem
    const hat = M(0xa1885a);
    part(h.head, boxGeo(1.38, 0.45, 1.38), hat, 0, 1.3, 0);
    part(h.head, boxGeo(1.9, 0.1, 1.9), hat, 0, 1.08, 0);
    part(h.head, boxGeo(0.3, 0.3, 0.06), shard, 0, 1.32, 0.7);
  }
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, 0.55, 0.45, 0.52); // shoulder-patch emblem
  if (level >= 1) {
    // Faster Reloading: a bandolier of rifle rounds across the chest
    const belt = part(h.torso, boxGeo(0.35, 2.2, 1.15), M(0x4e342e), 0, 0, 0);
    belt.rotation.z = 0.7;
    for (const y of [-0.5, 0, 0.5]) part(h.torso, boxGeo(0.12, 0.3, 0.12), M(0xd4af37), y * 0.8, y, 0.62);
  }
  if (geared) {
    // Geared Up: plate vest, radio headset and purple-lensed goggles
    part(h.torso, boxGeo(2.15, 1.5, 1.15), M(spec ? 0x0f0c14 : 0x6b5a3a), 0, -0.1, 0);
    part(h.head, boxGeo(0.15, 0.5, 0.45), dark, -0.68, 0.65, 0);
    part(h.head, boxGeo(0.08, 1.0, 0.08), dark, -0.72, 1.3, -0.25);
    if (!spec) {
      part(h.head, boxGeo(1.2, 0.3, 0.2), dark, 0, 0.72, 0.68);
      for (const x of [-0.27, 0.27]) part(h.head, boxGeo(0.36, 0.22, 0.05), shard, x, 0.72, 0.79);
    }
  }
  if (spec) {
    // Spec Ops: quad night-vision goggles glowing purple, knee pads and gloves
    part(h.head, boxGeo(1.0, 0.3, 0.3), dark, 0, 0.75, 0.72);
    for (const x of [-0.36, -0.12, 0.12, 0.36]) part(h.head, boxGeo(0.18, 0.18, 0.25), shard, x, 0.75, 0.95);
    const pad = M(0x212121);
    for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.05, 0.4, 0.3), pad, 0, -1.2, 0.45);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.05, 0.45, 1.05), pad, 0, -1.75, 0);
  }

  // Bolt-action rifle: wooden at first, black with purple trim at Spec Ops
  const len = level >= 3 ? 3.8 : 3.3;
  const gun = holdLongGun(h, len, M(spec ? 0x263238 : level >= 3 ? 0x37474f : 0x6d4c41));
  part(gun, boxGeo(0.26, level >= 2 ? 1.4 : 1.0, 0.32), dark, 0, -0.9, 0.38); // scope
  part(gun, boxGeo(0.3, 0.6, 0.4), M(spec ? 0x1c1726 : 0x4e342e), 0, 0.2, -0.05); // stock
  part(gun, boxGeo(0.35, 0.1, 0.1), M(0x9e9e9e), 0.2, -0.3, 0.2); // bolt handle
  if (level >= 2) for (const x of [-0.18, 0.18]) part(gun, boxGeo(0.08, 0.08, 0.9), dark, x, -len + 0.5, -0.5); // bipod
  if (level >= 3) part(gun, boxGeo(0.4, 0.5, 0.48), dark, 0, -len, 0); // suppressor
  if (spec) part(gun, boxGeo(0.08, len * 0.7, 0.08), shard, 0.2, -len * 0.45, 0.2);
  h.muzzles[0].position.y = -len - 0.3;
  h.tracer = spec ? 0xb388ff : 0xffe082;
  h.tracerWidth = level >= 3 ? 0.25 : undefined;
  return h;
}

/** Enforcer tower: a prison guard with a nightstick. Steel from Lv 2, flashlight from Lv 3, shock baton from Lv 4, riot gear at Lv 5. */
export function makeEnforcer(level) {
  const riot = level >= 4;
  const zap = level >= 3;
  const navy = 0x263859;
  const h = makeHumanoid({ skin: 0x8d5524, shirt: riot ? 0x1c1f26 : 0x5b7289, pants: riot ? 0x111318 : navy, arms: riot ? 0x1c1f26 : 0x5b7289, face: 'soldier' });
  const { M } = h;
  h.body.scale.setScalar(1.12); // a big guy
  part(h.torso, boxGeo(2.3, 1.9, 1.2), M(riot ? 0x23272f : 0x5b7289), 0, 0.1, 0); // bulky chest
  part(h.torso, boxGeo(0.35, 0.4, 0.06), M(0xffd54f), -0.55, 0.55, 0.62); // badge
  part(h.torso, boxGeo(1.0, 0.2, 0.05), M(0xfafafa), 0.45, 0.6, 0.62); // name tag
  part(h.torso, boxGeo(2.35, 0.3, 1.25), M(0x212121), 0, -0.85, 0); // duty belt
  // Ring of cell keys on the belt
  part(h.torso, boxGeo(0.4, 0.4, 0.1), M(0xbdbdbd), 0.8, -1.1, 0.64);
  for (const x of [0.7, 0.9]) part(h.torso, boxGeo(0.08, 0.4, 0.06), M(0xffd54f), x, -1.4, 0.66);
  if (!riot) {
    // Peaked guard cap
    part(h.head, boxGeo(1.4, 0.45, 1.4), M(navy), 0, 1.4, 0);
    part(h.head, boxGeo(1.4, 0.1, 0.55), M(0x111111), 0, 1.15, 0.72);
    part(h.head, boxGeo(0.35, 0.3, 0.06), M(0xffd54f), 0, 1.45, 0.72);
  }
  if (level >= 2) {
    // Cell Block Patrol: flashlight on the shoulder strap and a radio
    part(h.torso, boxGeo(0.3, 0.3, 0.7), M(0x212121), -0.85, 0.85, 0.5);
    part(h.torso, boxGeo(0.28, 0.28, 0.06), glow(h, 0xfff59d), -0.85, 0.85, 0.86);
    part(h.torso, boxGeo(0.35, 0.6, 0.25), M(0x212121), -0.95, -0.6, 0.55);
  }
  if (riot) {
    const black = M(0x1c1f26);
    part(h.head, boxGeo(1.5, 1.4, 1.5), black, 0, 0.7, -0.03); // riot helmet
    const visor = part(h.head, boxGeo(1.3, 0.8, 0.08), M(0x90caf9), 0, 0.55, 0.78);
    visor.material.transparent = true;
    visor.material.opacity = 0.6;
    part(h.torso, boxGeo(1.6, 0.35, 0.06), M(0xfdd835), 0, 0.15, 0.63); // "CORRECTIONS" stripe
    // Riot shield on the left arm, held in front
    const shield = part(h.leftArm, boxGeo(2.0, 0.15, 3.0), M(0x78909c), 0, -1.8, 0.6);
    shield.rotation.x = 0.1;
    part(shield, boxGeo(1.4, 0.05, 0.25), M(0xfafafa), 0, -0.1, 0.6);
  }

  // Nightstick held in the right hand, pointing along the arm.
  const stick = new THREE.Group();
  stick.position.set(0, -1.9, 0);
  h.rightArm.add(stick);
  part(stick, boxGeo(0.3, 0.6, 0.3), M(0x212121), 0, -0.2, 0); // grip
  part(stick, boxGeo(0.7, 0.12, 0.12), M(0x212121), 0.35, -0.45, 0); // side handle
  const len = level >= 1 ? 2.6 : 2.2; // the steel nightstick is longer
  part(stick, boxGeo(0.35, len, 0.35), zap ? M(0x263238) : level >= 1 ? M(0x9e9e9e) : M(0x6d4c41), 0, -0.5 - len / 2, 0);
  if (zap) {
    for (let i = 0; i < 3; i++) part(stick, boxGeo(0.42, 0.12, 0.42), glow(h, 0x40c4ff), 0, -0.9 - i * 0.6, 0);
    part(stick, boxGeo(0.45, 0.25, 0.45), glow(h, 0x40c4ff), 0, -0.5 - len, 0); // shock tip
  }
  setMuzzle(h, stick, 0, -0.5 - len, 0);

  // Nightstick raised overhead; a swing brings it down in front.
  h.rightArm.rotation.set(-2.6, 0, 0.15);
  h.leftArm.rotation.set(riot ? -1.3 : -0.25, 0, riot ? -0.2 : -0.1);
  h.pose = { right: -2.6, left: riot ? -1.3 : -0.25, leftRecoil: 0 };
  h.swing = 1.8;
  h.melee = true;
  h.tracer = zap ? 0x80d8ff : 0xffffff;
  return h;
}

/** Warden (alternate Enforcer): the prison warden in a khaki uniform and campaign hat. Night-vision at Lv 2, riot shield at Lv 5. */
export function makeWarden(level) {
  const riot = level >= 4;
  const khaki = 0xb59b6a;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: khaki, pants: 0x4e3b27, arms: khaki, face: 'soldier' });
  const { M } = h;
  part(h.torso, boxGeo(0.4, 0.45, 0.06), M(0xffd54f), -0.55, 0.55, 0.52); // star badge
  part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.85, 0); // leather belt
  part(h.torso, boxGeo(0.35, 0.25, 0.06), M(0xffd54f), 0, -0.85, 0.56); // buckle
  for (const x of [-0.75, 0.75]) part(h.torso, boxGeo(0.5, 0.15, 1.1), M(0x6d5a3a), x, 0.95, 0); // shoulder straps
  if (!riot) {
    // Wide-brimmed campaign hat
    const hat = M(0x6d5a3a);
    part(h.head, boxGeo(2.0, 0.12, 2.0), hat, 0, 1.25, 0);
    part(h.head, boxGeo(1.3, 0.55, 1.3), hat, 0, 1.55, 0);
    part(h.head, boxGeo(1.32, 0.12, 1.32), M(0x3e2723), 0, 1.33, 0);
  }
  if (level >= 1) {
    // Night Shift: night-vision monocle
    part(h.head, boxGeo(0.35, 0.35, 0.4), M(0x212121), 0.3, 0.7, 0.75);
    part(h.head, boxGeo(0.25, 0.25, 0.06), glow(h, 0x76ff03), 0.3, 0.7, 0.96);
  }
  if (level >= 3) part(h.torso, boxGeo(1.9, 1.5, 1.15), M(0x5d6b45), 0, 0.15, 0); // Stunning Blows: armored vest
  if (riot) {
    const dark = M(0x3e2723);
    part(h.head, boxGeo(1.45, 1.35, 1.45), dark, 0, 0.7, -0.03); // riot helmet
    const visor = part(h.head, boxGeo(1.3, 0.8, 0.08), M(0xffe0b2), 0, 0.55, 0.76);
    visor.material.transparent = true;
    visor.material.opacity = 0.55;
    const shield = part(h.leftArm, boxGeo(2.0, 0.15, 3.0), M(0x8d6e63), 0, -1.8, 0.6);
    shield.rotation.x = 0.1;
    part(shield, boxGeo(0.4, 0.06, 0.4), M(0xffd54f), 0, -0.1, 0.4); // gold star on the shield
  }

  // Baton: longer from Heavier Stick, glowing from Stunning Blows.
  const stick = new THREE.Group();
  stick.position.set(0, -1.9, 0);
  h.rightArm.add(stick);
  part(stick, boxGeo(0.3, 0.55, 0.3), M(0x3e2723), 0, -0.2, 0);
  const len = level >= 2 ? 2.7 : 2.1;
  const wide = level >= 2 ? 0.42 : 0.32;
  part(stick, boxGeo(wide, len, wide), M(level >= 2 ? 0x37474f : 0x5d4037), 0, -0.45 - len / 2, 0);
  if (level >= 3) for (let i = 0; i < 2; i++) part(stick, boxGeo(wide + 0.08, 0.14, wide + 0.08), glow(h, 0xffab00), 0, -1.2 - i * 0.8, 0);
  setMuzzle(h, stick, 0, -0.45 - len, 0);

  h.rightArm.rotation.set(-2.6, 0, 0.15);
  h.leftArm.rotation.set(riot ? -1.3 : -0.25, 0, riot ? -0.2 : -0.1);
  h.pose = { right: -2.6, left: riot ? -1.3 : -0.25, leftRecoil: 0 };
  h.swing = 1.8;
  h.melee = true;
  h.tracer = level >= 3 ? 0xffab00 : 0xffffff;
  return h;
}

/**
 * Mercenary tower: a private contractor with an assault rifle. Tan shirt and ball cap with shades;
 * Lv 2 laser sight, Lv 3 radio pack + headset, Lv 4 plate carrier, Lv 5 all-black kit, a
 * balaclava with a glowing visor and a bigger rifle with a drum mag.
 */
export function makeMercenary(level) {
  const elite = level >= 4;
  const h = makeHumanoid({ skin: 0xd8a47f, shirt: elite ? 0x1c1c1c : 0xc2a878, pants: elite ? 0x141414 : 0x3b3b3b, arms: elite ? 0x1c1c1c : 0xd8a47f, face: 'soldier' });
  const { M } = h;
  const dark = M(0x1f1f1f);
  if (elite) {
    // Balaclava + glowing visor
    part(h.head, boxGeo(1.3, 1.0, 1.3), M(0x111111), 0, 0.25, 0);
    part(h.head, boxGeo(1.1, 0.25, 0.08), glow(h, 0xff3d00), 0, 0.75, 0.66);
  } else {
    // Ball cap (brim forward) and sunglasses
    part(h.head, boxGeo(1.3, 0.35, 1.3), M(0x2e2e2e), 0, 1.4, 0);
    part(h.head, boxGeo(1.0, 0.1, 0.6), M(0x2e2e2e), 0, 1.25, 0.85);
    part(h.head, boxGeo(1.1, 0.2, 0.06), M(0x101010), 0, 0.75, 0.66);
  }
  // Chest rig with mag pouches
  part(h.torso, boxGeo(2.1, 0.9, 1.1), M(elite ? 0x2a2a2a : 0x5b5446), 0, -0.3, 0);
  for (const x of [-0.5, 0, 0.5]) part(h.torso, boxGeo(0.35, 0.5, 0.2), M(elite ? 0x333333 : 0x4a4438), x, -0.3, 0.62);
  if (level >= 2) {
    // Outside Support: radio pack with an antenna, headset on the cap
    part(h.torso, boxGeo(1.3, 1.5, 0.6), M(elite ? 0x262626 : 0x4e4a3e), 0, 0, -0.8);
    part(h.torso, boxGeo(0.08, 1.6, 0.08), dark, 0.45, 1.4, -0.85);
    part(h.head, boxGeo(0.12, 0.5, 0.4), dark, -0.68, 0.6, 0);
    part(h.head, boxGeo(0.08, 0.08, 0.5), dark, -0.62, 0.35, 0.35); // mic boom
  }
  if (level >= 3) {
    // Up-Skill: plate carrier and shoulder pads
    part(h.torso, boxGeo(2.15, 1.5, 1.15), M(elite ? 0x2b2b2b : 0x6b6450), 0, 0.2, 0);
    part(h.rightArm, boxGeo(1.05, 0.5, 1.05), M(elite ? 0x2b2b2b : 0x6b6450), 0, -0.2, 0);
    part(h.leftArm, boxGeo(1.05, 0.5, 1.05), M(elite ? 0x2b2b2b : 0x6b6450), 0, -0.2, 0);
  }
  const len = elite ? 2.4 : 2.0;
  const gun = holdLongGun(h, len, dark);
  part(gun, boxGeo(0.25, 0.5, 0.35), M(0x3a3a3a), 0, 0.2, -0.05); // stock
  part(gun, boxGeo(0.36, 0.5, 0.46), M(elite ? 0x2a2a2a : 0x6d5c42), 0, -len + 0.55, 0); // handguard
  if (elite) part(gun, boxGeo(0.5, 0.55, 0.55), M(0x333333), 0, -0.65, -0.45); // drum mag
  else part(gun, boxGeo(0.22, 0.45, 0.55), dark, 0, -0.65, -0.42).rotation.x = -0.25; // curved mag
  if (level >= 1) {
    // Lasers: laser sight box with a glowing beam
    const beamColor = elite ? 0xff3d00 : 0xff1744;
    part(gun, boxGeo(0.2, 0.4, 0.2), dark, 0.25, -len + 0.7, 0.1);
    part(gun, boxGeo(0.04, 1.4, 0.04), glow(h, beamColor), 0.25, -len - 0.2, 0.1);
    part(gun, boxGeo(0.25, 0.35, 0.3), dark, 0, -0.8, 0.36); // optic
  }
  h.tracer = elite ? 0xff6e40 : 0xffd54f;
  return h;
}

/** Grenadier tower: throws grenades, dynamite at Lv 5. */
export function makeGrenadier(level) {
  const demo = level >= 4;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: demo ? 0x5d4037 : 0x6d7b4a, pants: 0x4b5530, arms: demo ? 0x5d4037 : 0x6d7b4a, face: 'soldier' });
  const { M } = h;
  helmet(h, demo ? 0xfbc02d : 0x556b2f, !demo);
  if (level >= 2) {
    // Keen Eye: goggles on the helmet
    part(h.head, boxGeo(1.3, 0.3, 0.2), M(0x263238), 0, 1.3, 0.75);
    part(h.head, boxGeo(0.35, 0.22, 0.05), M(0xffb74d), -0.27, 1.3, 0.86);
    part(h.head, boxGeo(0.35, 0.22, 0.05), M(0xffb74d), 0.27, 1.3, 0.86);
    part(h.torso, boxGeo(0.7, 0.8, 0.9), M(0x6d4c41), 1.15, -0.8, 0); // satchel
    part(h.torso, boxGeo(0.2, 2.3, 1.12), M(0x4e342e), 0, 0.1, 0).rotation.z = -0.6; // satchel strap
  }
  const nade = M(0x33691e);
  const tnt = M(0xc62828);
  if (level >= 1) {
    // Belt of grenades
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x4e342e), 0, -0.85, 0);
    for (const x of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.35, 0.4, 0.35), demo ? tnt : nade, x, -0.7, 0.62);
  }
  if (level >= 3) {
    const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), M(0x4e342e), 0, 0, 0);
    strap.rotation.z = 0.7;
    for (const t of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.35, 0.35, 0.3), demo ? tnt : nade, t * 0.75, t * -0.8, 0.65);
    // Double Pin: a second grenade ready in the left hand
    part(h.leftArm, demo ? boxGeo(0.3, 0.9, 0.3) : boxGeo(0.5, 0.6, 0.5), demo ? tnt : nade, 0, -2.3, 0);
  }
  // Grenade (or dynamite) held in the raised right hand.
  const hand = new THREE.Group();
  hand.position.set(0, -2.1, 0);
  h.rightArm.add(hand);
  if (demo) {
    part(hand, boxGeo(0.3, 0.9, 0.3), tnt, 0, -0.3, 0);
    part(hand, boxGeo(0.06, 0.4, 0.06), glow(h, 0xffeb3b), 0, -0.9, 0); // lit fuse
  } else {
    part(hand, boxGeo(0.5, 0.6, 0.5), nade, 0, -0.2, 0);
    part(hand, boxGeo(0.2, 0.2, 0.2), M(0x9e9e9e), 0, -0.6, 0); // pin
  }
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -2.8, left: -1.0, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = demo ? { color: 0xc62828, size: 0.4, arc: 4.5 } : { color: 0x33691e, size: 0.5, arc: 3.5 };
  return h;
}

/**
 * Demo Expert (alternate Grenadier form): a demolitions expert in a dark coat with a stubby
 * grenade launcher. Lv 2 adds a bandolier, Lv 3 goggles and a sticky-bomb pack, Lv 4 a drum
 * magazine, Lv 5 a heavy armored vest and a bigger barrel.
 */
export function makeGrenadierDemo(level) {
  const heavy = level >= 4;
  const coat = heavy ? 0x212121 : 0x263850;
  const h = makeHumanoid({ skin: 0x8d5524, shirt: coat, pants: 0x1c1c22, arms: coat, face: 'soldier' });
  const { M } = h;
  const dark = M(0x37474f);
  const brown = M(0x4e342e);
  const shell = M(0x1b1b1b);
  // Beanie
  part(h.head, boxGeo(1.32, 0.45, 1.32), M(heavy ? 0x111111 : 0x1a237e), 0, 1.3, 0);
  if (level >= 1) {
    const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), brown, 0, 0, 0);
    strap.rotation.z = -0.7;
    for (const t of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.32, 0.32, 0.3), shell, t * 0.75, t * 0.8, 0.65);
  }
  if (level >= 2) {
    part(h.head, boxGeo(1.3, 0.3, 0.2), M(0x263238), 0, 1.0, 0.72);
    part(h.head, boxGeo(0.35, 0.22, 0.05), glow(h, 0x4fc3f7), -0.27, 1.0, 0.83);
    part(h.head, boxGeo(0.35, 0.22, 0.05), glow(h, 0x4fc3f7), 0.27, 1.0, 0.83);
    // Pack of sticky charges on the back, with glowing lights.
    part(h.torso, boxGeo(1.4, 1.4, 0.6), dark, 0, 0.1, -0.85);
    for (const x of [-0.4, 0.4]) part(h.torso, boxGeo(0.2, 0.2, 0.1), glow(h, 0xff5252), x, 0.4, -1.18);
  }
  if (heavy) {
    part(h.torso, boxGeo(2.15, 1.6, 1.15), M(0x455a64), 0, 0.2, 0); // armored vest
    part(h.torso, boxGeo(0.5, 0.5, 0.5), M(0x455a64), -1.25, 0.85, 0); // shoulder pads
    part(h.torso, boxGeo(0.5, 0.5, 0.5), M(0x455a64), 1.25, 0.85, 0);
  }
  // Grenade launcher held forward in the right hand. In arm space the barrel runs along -y
  // (toward the target once the arm is raised) and +z is the top of the gun.
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  h.rightArm.add(gun);
  const bore = heavy ? 0.6 : 0.48;
  part(gun, boxGeo(bore, 1.6, bore), dark, 0, -0.6, 0); // barrel
  part(gun, boxGeo(0.22, 0.3, 0.6), brown, 0, 0.1, -0.4); // grip
  part(gun, boxGeo(0.3, 0.8, 0.3), brown, 0, 0.6, -0.05); // stock
  if (level >= 3) part(gun, boxGeo(0.8, 0.5, 0.8), M(0x5d4037), 0, -0.2, -0.1); // drum magazine
  if (heavy) part(gun, boxGeo(0.75, 0.2, 0.75), M(0xfbc02d), 0, -1.4, 0); // yellow muzzle ring
  setMuzzle(h, gun, 0, -1.5, 0);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
  h.projectile = { color: 0x1b1b1b, size: heavy ? 0.55 : 0.45, arc: 3 };
  return h;
}

/**
 * Assault Grenadier (alternate Grenadier with two paths). Top path: Lv 1 grenade belt, Lv 3
 * sensor goggles, Lv 4 a Stiel stick grenade in hand, Lv 5 an armored vest with napalm canisters.
 * Bottom path: Lv 1 belt, Lv 3 glowing blue shock grenades, Lv 4 a battery pack, Lv 5 dark
 * Shock Trooper armor with a glowing visor.
 */
export function makeGrenadierAssault(level, bottom = false) {
  const top = !bottom;
  const shock = bottom && level >= 3;
  const trooper = bottom && level >= 5;
  const shirt = trooper ? 0x1c2330 : top && level >= 5 ? 0x5d4f37 : 0x5b6b3c;
  const h = makeHumanoid({ skin: 0xd8a06a, shirt, pants: trooper ? 0x12161d : 0x3e4a2a, arms: shirt, face: 'soldier' });
  const { M } = h;
  const brown = M(0x4e342e);
  const nade = shock ? glow(h, 0x40c4ff) : M(0x33691e);
  helmet(h, trooper ? 0x111820 : 0x4b5d2e, !trooper);
  if (level >= 1) {
    part(h.torso, boxGeo(2.1, 0.3, 1.1), brown, 0, -0.85, 0); // belt
    for (const x of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.35, 0.4, 0.35), nade, x, -0.7, 0.62);
  }
  if (level >= 2) {
    const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), brown, 0, 0, 0);
    strap.rotation.z = top ? 0.7 : -0.7;
    for (const t of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.32, 0.32, 0.3), nade, t * 0.75, t * (top ? -0.8 : 0.8), 0.65);
  }
  if (top && level >= 3) {
    // Sensor goggles
    part(h.head, boxGeo(1.3, 0.3, 0.2), M(0x263238), 0, 1.0, 0.72);
    part(h.head, boxGeo(0.35, 0.22, 0.05), glow(h, 0xff7043), -0.27, 1.0, 0.83);
    part(h.head, boxGeo(0.35, 0.22, 0.05), glow(h, 0xff7043), 0.27, 1.0, 0.83);
  }
  if (top && level >= 5) {
    part(h.torso, boxGeo(2.15, 1.6, 1.15), M(0x6d5f45), 0, 0.2, 0); // armored vest
    // Napalm canisters on the back
    for (const x of [-0.4, 0.4]) {
      part(h.torso, boxGeo(0.55, 1.5, 0.55), M(0xbf360c), x, 0.1, -0.85);
      part(h.torso, boxGeo(0.3, 0.2, 0.3), glow(h, 0xffab40), x, 0.95, -0.85);
    }
  }
  if (bottom && level >= 4) {
    // Battery pack for the shock grenades
    part(h.torso, boxGeo(1.3, 1.3, 0.55), M(0x37474f), 0, 0.1, -0.85);
    part(h.torso, boxGeo(0.9, 0.18, 0.06), glow(h, 0x40c4ff), 0, 0.3, -1.14);
  }
  if (trooper) {
    part(h.torso, boxGeo(2.2, 1.7, 1.2), M(0x263040), 0, 0.15, 0); // armor
    part(h.torso, boxGeo(0.5, 0.5, 0.5), M(0x263040), -1.25, 0.85, 0);
    part(h.torso, boxGeo(0.5, 0.5, 0.5), M(0x263040), 1.25, 0.85, 0);
    part(h.head, boxGeo(1.25, 0.35, 0.08), glow(h, 0x40c4ff), 0, 0.75, 0.74); // visor
  }
  // Grenade held in the raised right hand: a Stiel stick grenade at Top Lv 4+.
  const hand = new THREE.Group();
  hand.position.set(0, -2.1, 0);
  h.rightArm.add(hand);
  const stiel = top && level >= 4;
  if (stiel) {
    part(hand, boxGeo(0.18, 0.9, 0.18), M(0x8d6e63), 0, -0.2, 0); // wooden handle
    part(hand, boxGeo(0.5, 0.5, 0.5), M(level >= 5 ? 0xbf360c : 0x455a64), 0, -0.85, 0); // head
  } else {
    part(hand, boxGeo(0.5, 0.6, 0.5), nade, 0, -0.2, 0);
    part(hand, boxGeo(0.2, 0.2, 0.2), M(0x9e9e9e), 0, -0.6, 0); // pin
  }
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -2.8, left: -1.0, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = shock ? { color: 0x40c4ff, size: 0.5, arc: 3.5 } : stiel ? { color: 0x455a64, size: 0.5, arc: 4 } : { color: 0x33691e, size: 0.5, arc: 3.5 };
  return h;
}
const makeGrenadierAssaultBottom = (level) => makeGrenadierAssault(level, true);

/** Frost Trooper tower: ice gun with a coolant tank. */
export function makeFrost(level) {
  const ice = 0x80d8ff;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: 0xe3f2fd, pants: 0x90caf9, arms: 0xe3f2fd, face: 'soldier' });
  const { M } = h;
  const white = M(0xfafafa);
  part(h.head, boxGeo(1.45, 1.4, 1.45), white, 0, 0.65, -0.03); // hood
  part(h.head, boxGeo(1.2, 0.4, 0.08), glow(h, ice), 0, 0.7, 0.7); // visor
  const big = level >= 3;
  part(h.torso, boxGeo(big ? 1.5 : 1.1, big ? 2.0 : 1.7, 0.8), M(0x90a4ae), 0, 0, -0.9); // coolant tank
  part(h.torso, boxGeo(0.3, big ? 1.6 : 1.3, 0.1), glow(h, ice), 0, 0, big ? -1.32 : -1.32);
  if (level >= 1) {
    // Deep Freeze: frosty shoulder pads with icicles
    for (const side of [-1, 1]) {
      part(h.torso, boxGeo(0.8, 0.45, 1.3), white, side * 1.4, 1.0, 0);
      part(h.torso, boxGeo(0.15, 0.5, 0.15), M(0xb3e5fc), side * 1.6, 0.6, 0.4);
    }
  }
  if (level >= 2) {
    // Frostbite: spiky ice gauntlets
    const iceM = glow(h, 0x4fc3f7);
    for (const arm of [h.rightArm, h.leftArm]) {
      part(arm, boxGeo(1.1, 0.6, 1.1), iceM, 0, -1.6, 0);
      part(arm, boxGeo(0.2, 0.6, 0.2), M(0xe1f5fe), 0.55, -1.3, 0);
    }
  }
  if (level >= 4) {
    // Blizzard: crown of ice crystals
    const crystal = glow(h, 0xb3e5fc);
    for (const [x, hgt] of [[-0.45, 0.5], [0, 0.8], [0.45, 0.5]]) part(h.head, boxGeo(0.25, hgt, 0.25), crystal, x, 1.4 + hgt / 2, 0);
    part(h.torso, boxGeo(2.2, 2.6, 0.15), M(0xe1f5fe), 0, -0.5, -1.35); // snowy cape
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(h.root, boxGeo(0.5, 0.8 + (i % 2) * 0.6, 0.5), crystal, Math.cos(a) * 1.7, 0.5, Math.sin(a) * 1.7).rotation.y = a;
    }
  }
  const len = level >= 3 ? 2.1 : 1.8;
  const gun = holdLongGun(h, len, M(0xeceff1));
  part(gun, boxGeo(0.5, 0.6, 0.55), M(0x78909c), 0, -0.3, 0);
  for (let i = 0; i < (level >= 2 ? 3 : 2); i++) part(gun, boxGeo(0.5, 0.12, 0.55), glow(h, ice), 0, -0.9 - i * 0.35, 0);
  part(gun, boxGeo(0.45, 0.25, 0.5), glow(h, ice), 0, -len, 0); // nozzle
  h.muzzles[0].position.y = -len - 0.15;
  h.tracer = ice;
  h.tracerWidth = 0.3;
  return h;
}

/** Rocketeer tower: rocket launcher, bazooka at Lv 4, plasma launcher at Lv 5. */
export function makeRocketeer(level) {
  const plasma = level >= 4;
  const bazooka = level >= 3;
  const h = makeHumanoid({ skin: 0xc68642, shirt: plasma ? 0x311b92 : 0x795548, pants: plasma ? 0x1a1a40 : 0x4e342e, arms: plasma ? 0x311b92 : 0x795548, face: 'soldier' });
  const { M } = h;
  helmet(h, plasma ? 0x212121 : 0x6d4c41);
  if (level >= 2) {
    // Scope: one-eyed targeting monocle
    part(h.head, boxGeo(0.4, 0.35, 0.3), M(0x212121), 0.28, 0.7, 0.68);
    part(h.head, boxGeo(0.25, 0.2, 0.05), glow(h, plasma ? 0xe040fb : 0xff5252), 0.28, 0.7, 0.84);
  }
  if (level >= 1) {
    // Backpack full of spare rockets
    part(h.torso, boxGeo(1.4, 1.6, 0.7), M(0x5d4037), 0, 0, -0.85);
    for (const x of [-0.35, 0.35]) part(h.torso, boxGeo(0.3, 0.5, 0.3), plasma ? glow(h, 0xd500f9) : M(0xe65100), x, 1.0, -0.85);
  }
  const w = bazooka ? 0.9 : 0.7;
  const len = bazooka ? 3.0 : 2.5;
  const tubeMat = M(plasma ? 0x4a148c : bazooka ? 0x556b2f : 0x616161);
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  h.rightArm.add(gun);
  part(gun, boxGeo(w, len, w), tubeMat, 0, -len / 2 + 0.6, 0); // tube sticks out behind the hand too
  part(gun, boxGeo(w + 0.15, 0.3, w + 0.15), M(0x212121), 0, -len + 0.6, 0); // front ring
  part(gun, boxGeo(0.3, 0.5, 0.3), M(0x212121), 0, -0.3, -0.4); // grip
  if (plasma) for (let i = 0; i < 3; i++) part(gun, boxGeo(w + 0.1, 0.15, w + 0.1), glow(h, 0xd500f9), 0, -0.4 - i * 0.6, 0);
  if (level >= 2) {
    // Scope: a big targeting sight on top of the tube, and a padded flak vest
    if (!plasma) part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x5d4037), 0, 0.05, 0);
    part(gun, boxGeo(0.4, 1.1, 0.45), M(0x212121), 0, -0.9, w / 2 + 0.25);
    part(gun, boxGeo(0.3, 0.06, 0.3), glow(h, plasma ? 0xe040fb : 0xff5252), 0, -1.47, w / 2 + 0.25);
  }
  setMuzzle(h, gun, 0, -len + 0.4, 0);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.2 };
  h.projectile = plasma ? { color: 0xe040fb, size: 1.4 } : bazooka ? { color: 0xff6d00, size: 1.2 } : { color: 0xff6d00, size: 1 };
  return h;
}

/** Mortar tower (cliff): a soldier loading a mortar tube. */
export function makeMortar(level) {
  const doom = level >= 4;
  const h = makeHumanoid({ skin: 0x8d5524, shirt: 0x6b7d3a, pants: 0x4b5320, arms: 0x6b7d3a, face: 'soldier' });
  const { M } = h;
  helmet(h, 0x556b2f);
  if (level >= 1) {
    // Fast Loader: ear protectors and an open crate of ready shells beside the tube
    for (const x of [-0.7, 0.7]) part(h.head, boxGeo(0.25, 0.55, 0.55), M(0xff8f00), x, 0.6, 0);
    part(h.root, boxGeo(1.3, 0.7, 0.9), M(0x6d4c41), -2.0, 0.35, 1.0);
    for (const x of [-2.35, -2.0, -1.65]) part(h.root, boxGeo(0.25, 0.5, 0.25), M(doom ? 0x76ff03 : 0x37474f), x, 0.85, 1.0);
  }
  // Mortar tube in front of the soldier, tilted up toward the target.
  const mount = new THREE.Group();
  mount.position.set(0, 0, 2.2);
  h.root.add(mount);
  const steel = M(doom ? 0x37474f : 0x4a5a3a);
  part(mount, boxGeo(1.8, 0.2, 1.8), M(0x424242), 0, 0.1, 0); // base plate
  const w = level >= 2 ? 0.85 : 0.65;
  const len = level >= 2 ? 3.6 : 3.0;
  const tube = new THREE.Group();
  tube.position.set(0, 0.3, 0);
  tube.rotation.x = 0.5; // leans forward
  mount.add(tube);
  part(tube, boxGeo(w, len, w), steel, 0, len / 2, 0);
  part(tube, boxGeo(w + 0.2, 0.25, w + 0.2), M(0x212121), 0, len, 0);
  if (doom) for (let i = 0; i < 3; i++) part(tube, boxGeo(w + 0.12, 0.15, w + 0.12), glow(h, 0x76ff03), 0, 0.8 + i * 0.9, 0);
  for (const side of [-1, 1]) {
    const leg = part(mount, boxGeo(0.15, 2.2, 0.15), M(0x212121), side * 0.6, 1.0, 1.0); // bipod
    leg.rotation.set(-0.5, 0, side * 0.3);
  }
  setMuzzle(h, tube, 0, len + 0.3, 0);
  if (level >= 2) {
    // Sandbag wall
    const bag = M(0xa1887f);
    for (let i = 0; i < 5; i++) {
      const a = -1.2 + i * 0.6;
      part(h.root, boxGeo(1.3, 0.6, 0.7), bag, Math.sin(a) * 3.3, 0.3, 2.2 + Math.cos(a) * 1.6).rotation.y = a;
    }
  }
  if (level >= 3) {
    // Heavy Ordnance: stack of shells by the soldier's feet
    const shellM = doom ? glow(h, 0x76ff03) : M(0x37474f);
    part(h.root, boxGeo(1.4, 0.2, 1.0), M(0x5d4037), 1.9, 0.1, 0.2); // shell rack
    for (const x of [1.4, 1.75, 2.1, 2.45]) for (const z of [-0.05, 0.45]) part(h.root, boxGeo(0.3, 1.1, 0.3), shellM, x, 0.75, z);
    part(h.head, boxGeo(1.55, 0.35, 1.55), M(0x37474f), 0, 1.55, 0); // heavier helmet
  }
  // Holding a shell, ready to drop it in.
  const shell = part(h.rightArm, boxGeo(0.4, 0.8, 0.4), doom ? glow(h, 0x76ff03) : M(0x37474f), 0.6, -2.1, 0);
  shell.rotation.z = 0.3;
  h.rightArm.rotation.set(-1.0, 0, 0.3);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -1.0, left: -1.0, leftRecoil: 0 };
  h.recoilScale = 0.4;
  h.projectile = doom ? { color: 0x76ff03, size: 0.9, arc: 20, glowing: true } : { color: 0x37474f, size: 0.6, arc: 18 };
  return h;
}

/** Flamethrower tower: fuel tanks and a nozzle; two nozzles at Lv 5. */
export function makeFlamethrower(level) {
  const twin = level >= 4;
  const suit = level >= 2;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: suit ? 0x9e9e9e : 0x5d4037, pants: suit ? 0x757575 : 0x3e2723, arms: suit ? 0x9e9e9e : 0x5d4037 });
  const { M } = h;
  // Gas mask with round lenses
  part(h.head, boxGeo(1.3, 1.3, 1.3), M(suit ? 0xbdbdbd : 0x424242), 0, 0.62, 0);
  part(h.head, boxGeo(0.4, 0.35, 0.08), M(0xffa000), -0.28, 0.75, 0.68);
  part(h.head, boxGeo(0.4, 0.35, 0.08), M(0xffa000), 0.28, 0.75, 0.68);
  part(h.head, boxGeo(0.5, 0.5, 0.4), M(0x212121), 0, 0.3, 0.75); // filter
  // Fuel tanks on the back
  const tank = M(level >= 3 ? 0xffa000 : 0xc62828);
  const tanks = twin ? [-0.6, -0.2, 0.2, 0.6] : level >= 1 ? [-0.6, 0, 0.6] : [-0.4, 0.4];
  const tankW = twin ? 0.38 : level >= 1 ? 0.5 : 0.6;
  const tankH = level >= 1 ? 2.4 : 1.9;
  for (const x of tanks) part(h.torso, boxGeo(tankW, tankH, 0.6), tank, x, level >= 1 ? 0.25 : 0, -0.85);
  if (level >= 1) part(h.torso, boxGeo(0.25, 0.25, 1.4), M(0x212121), -0.8, -0.6, -0.3); // hose
  const nozzle = (arm) => {
    const g = new THREE.Group();
    g.position.set(0, -1.9, 0);
    arm.add(g);
    part(g, boxGeo(0.4, 1.8, 0.45), M(0x37474f), 0, -0.9, 0);
    part(g, boxGeo(0.6, 0.3, 0.6), M(0x212121), 0, -1.8, 0);
    part(g, boxGeo(0.15, 0.15, 0.15), glow(h, 0xff9100), 0, -2.0, 0.2); // pilot light
    const m = new THREE.Object3D();
    m.position.set(0, -2.1, 0);
    g.add(m);
    return m;
  };
  h.muzzles = [nozzle(h.rightArm)];
  if (twin) {
    h.muzzles.push(nozzle(h.leftArm));
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.12);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.12);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.05 };
  } else {
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.15, 0, -0.5);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.15, leftRecoil: 0.05 };
  }
  h.recoilScale = 0.1;
  return h;
}

// ------------------------------------------------------------------ spread / multi-target towers

/** Shotgunner: pump shotgun. Dark hunter coat from Lv 2, shell bandolier from Lv 4, riot armor at Lv 5. */
export function makeShotgunner(level) {
  const night = level >= 1;
  const riot = level >= 4;
  const h = makeHumanoid({
    skin: 0xd2a679,
    shirt: riot ? 0x263238 : night ? 0x283044 : 0x8d6e63,
    pants: riot ? 0x1c2429 : night ? 0x1e2333 : 0x4e342e,
    arms: riot ? 0x263238 : night ? 0x283044 : 0x8d6e63,
    face: 'soldier',
  });
  const { M } = h;
  if (riot) {
    // Crowd Control: riot helmet with a visor and chest plate
    part(h.head, boxGeo(1.45, 1.35, 1.45), M(0x37474f), 0, 0.68, -0.03);
    const visor = part(h.head, boxGeo(1.25, 0.6, 0.08), M(0x90caf9), 0, 0.65, 0.74);
    visor.material.transparent = true;
    visor.material.opacity = 0.6;
    part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x455a64), 0, 0.05, 0);
  } else {
    // Wide-brim hunter hat (dark from Lv 2)
    const hat = M(night ? 0x1a1a1a : 0x6d4c41);
    part(h.head, boxGeo(2.0, 0.12, 2.0), hat, 0, 1.22, 0);
    part(h.head, boxGeo(1.3, 0.5, 1.3), hat, 0, 1.5, 0);
    if (night) part(h.head, boxGeo(1.32, 0.12, 1.32), M(0xc62828), 0, 1.3, 0); // hat band
  }
  if (level >= 2) {
    // Bolt Action: long coat tails
    part(h.torso, boxGeo(2.05, 2.0, 0.2), M(night ? 0x1e2333 : 0x5d4037), 0, -1.7, -0.45);
    part(h.torso, boxGeo(2.3, 0.5, 1.3), M(0x4e342e), 0, 0.85, 0); // coat collar / shoulder cape
  }
  if (level >= 3) {
    // Bandolier: a strap of red shells across the chest
    const strap = part(h.torso, boxGeo(0.35, 2.6, 1.12), M(0x4e342e), 0, 0, 0);
    strap.rotation.z = 0.75;
    for (const t of [-0.75, -0.25, 0.25, 0.75]) part(h.torso, boxGeo(0.18, 0.32, 0.15), M(0xd32f2f), t * 0.75, t * -0.8, 0.62);
  }
  const len = riot ? 1.9 : 1.6;
  const gun = holdLongGun(h, len, M(riot ? 0x212121 : 0x3e2723));
  part(gun, boxGeo(0.4, 0.5, 0.5), M(0x5d4037), 0, -0.9, 0.1); // pump grip
  part(gun, boxGeo(0.3, 0.5, 0.4), M(0x4e342e), 0, 0.2, -0.05); // stock
  if (riot) part(gun, boxGeo(0.45, 0.6, 0.6), M(0x424242), 0, -0.5, -0.45); // drum mag
  h.tracer = 0xffab40;
  return h;
}

/** Plasma Trooper: holds a crackling plasma globe. Bigger globe each level, a giant bulb at Lv 5. */
export function makePlasma(level) {
  const doom = level >= 4;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: level >= 3 ? 0x4a148c : 0xeceff1, pants: level >= 3 ? 0x311b92 : 0x78909c, arms: level >= 3 ? 0x4a148c : 0xeceff1, face: 'soldier' });
  const { M } = h;
  const zap = level >= 2 ? 0xe040fb : 0x7c4dff;
  part(h.head, boxGeo(1.3, 0.4, 1.3), M(0x8e24aa), 0, 1.25, 0); // wild purple hair
  if (level >= 1) {
    // Safety Goggles
    part(h.head, boxGeo(1.25, 0.3, 0.12), M(0x212121), 0, 0.72, 0.64);
    part(h.head, boxGeo(0.4, 0.25, 0.06), glow(h, 0x80deea), -0.28, 0.72, 0.71);
    part(h.head, boxGeo(0.4, 0.25, 0.06), glow(h, 0x80deea), 0.28, 0.72, 0.71);
    // ...and thick yellow rubber gloves
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.1, 0.9, 1.1), M(0xfdd835), 0, -1.55, 0);
  }
  if (level >= 3) {
    // Plasma Tower: a Tesla coil backpack
    part(h.torso, boxGeo(1.2, 1.6, 0.6), M(0x37474f), 0, 0, -0.85);
    for (let i = 0; i < 3; i++) part(h.torso, boxGeo(0.7 - i * 0.15, 0.25, 0.7 - i * 0.15), M(0xb87333), 0, 1.0 + i * 0.35, -0.85);
    part(h.torso, boxGeo(0.45, 0.45, 0.45), glow(h, zap), 0, 2.2, -0.85);
  }
  // Globe held in front with both hands, on a little base.
  const holder = new THREE.Group();
  holder.position.set(0, 3.2, 1.6);
  h.body.add(holder);
  part(holder, boxGeo(0.7, 0.4, 0.7), M(0x263238), 0, -0.4, 0);
  const size = [0.9, 0.9, 1.1, 1.3, 1.5][level];
  const globe = part(holder, boxGeo(size, size, size), glow(h, zap), 0, size / 2 - 0.2, 0);
  globe.material.transparent = true;
  globe.material.opacity = 0.85;
  globe.rotation.y = 0.8;
  if (doom) {
    // Lightbulb of Doom: a giant glowing bulb floating overhead
    const bulb = part(h.body, boxGeo(1.6, 1.8, 1.6), glow(h, 0xfff59d), 0, 8.0, 0);
    bulb.rotation.y = 0.8;
    part(h.body, boxGeo(0.9, 0.6, 0.9), M(0x9e9e9e), 0, 6.9, 0);
  }
  setMuzzle(h, holder, 0, size / 2, 0);
  h.rightArm.rotation.set(-1.2, 0, 0.35);
  h.leftArm.rotation.set(-1.2, 0, -0.35);
  h.pose = { right: -1.2, left: -1.2, leftRecoil: 0.05 };
  h.recoilScale = 0.15;
  h.tracer = zap;
  h.tracerWidth = 0.18;
  return h;
}

/**
 * Pulse Trooper (alternate Plasma Trooper form): a technician in a cyan suit holding a pulse
 * emitter disc out in front. Lv 2 capacitor packs, Lv 3 a visor and amplifier dish, Lv 4 a
 * filament coil backpack, Lv 5 twin Sweeper laser pods, Lv 6 a glowing Arc Reactor and halo.
 */
export function makePlasmaPulse(level) {
  const arc = level >= 5;
  const suit = level >= 4 ? 0x0d2b45 : 0x00838f;
  const h = makeHumanoid({ skin: 0xc68642, shirt: suit, pants: level >= 4 ? 0x0a1a2a : 0x006064, arms: suit, face: 'soldier' });
  const { M } = h;
  const zap = arc ? 0x84ffff : 0x40c4ff;
  const shard = glow(h, 0xb388ff);
  part(h.head, boxGeo(1.3, 0.35, 1.3), M(0x263238), 0, 1.22, 0); // cap
  part(h.torso, boxGeo(0.35, 0.35, 0.08), shard, -0.55, 0.45, 0.52); // Dimension Shard emblem
  if (level >= 1) {
    // Capacitor Boost: glowing capacitor cells on the belt
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x37474f), 0, -0.85, 0);
    for (const x of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.3, 0.45, 0.3), glow(h, zap), x, -0.75, 0.62);
  }
  if (level >= 2) {
    // Pulse Amplifier: a visor and a little dish on the shoulder
    part(h.head, boxGeo(1.25, 0.32, 0.12), glow(h, zap), 0, 0.72, 0.64);
    part(h.torso, boxGeo(0.2, 0.6, 0.2), M(0x90a4ae), 0.8, 1.3, 0);
    part(h.torso, boxGeo(0.8, 0.12, 0.8), M(0xb0bec5), 0.8, 1.65, 0);
  }
  if (level >= 3) {
    // Charged Filament: a coil backpack with glowing filament rods
    part(h.torso, boxGeo(1.3, 1.6, 0.6), M(0x263238), 0, 0, -0.85);
    for (const x of [-0.4, 0.4]) {
      part(h.torso, boxGeo(0.15, 1.4, 0.15), glow(h, zap), x, 1.4, -0.85);
      part(h.torso, boxGeo(0.35, 0.2, 0.35), M(0xb87333), x, 0.8, -0.85);
    }
  }
  if (level >= 4) {
    // Sweeper: twin laser pods on the shoulders
    for (const x of [-1.25, 1.25]) {
      part(h.torso, boxGeo(0.6, 0.5, 1.0), M(0x37474f), x, 1.25, 0);
      part(h.torso, boxGeo(0.25, 0.25, 0.1), glow(h, 0xff1744), x, 1.25, 0.52);
    }
  }
  if (arc) {
    // Arc Reactor: a bright chest core and a halo ring floating overhead
    part(h.torso, boxGeo(0.7, 0.7, 0.12), glow(h, 0xffffff), 0, 0.35, 0.52);
    part(h.torso, boxGeo(1.0, 1.0, 0.06), glow(h, zap), 0, 0.35, 0.5);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      part(h.body, boxGeo(0.4, 0.15, 0.4), glow(h, zap), Math.cos(a) * 1.4, 6.6, Math.sin(a) * 1.4);
    }
  }
  // Pulse emitter: a flat disc held out in front with both hands, glowing core in the middle.
  const holder = new THREE.Group();
  holder.position.set(0, 3.0, 1.6);
  h.body.add(holder);
  const size = [1.0, 1.1, 1.2, 1.3, 1.4, 1.6][level];
  part(holder, boxGeo(size, 0.25, size), M(0x455a64), 0, 0, 0);
  const core = part(holder, boxGeo(size * 0.55, 0.35, size * 0.55), glow(h, zap), 0, 0.08, 0);
  core.rotation.y = 0.8;
  setMuzzle(h, holder, 0, 0.3, 0);
  h.rightArm.rotation.set(-1.1, 0, 0.3);
  h.leftArm.rotation.set(-1.1, 0, -0.3);
  h.pose = { right: -1.1, left: -1.1, leftRecoil: 0.05 };
  h.recoilScale = 0.12;
  h.tracer = zap;
  return h;
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

export function wheels(u, mat, xs, zs, y = 0.55, size = 1.1) {
  for (const x of xs) for (const z of zs) u.wheels.push(part(u.body, boxGeo(0.6, size, size), mat, x, y, z));
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

/** A small soldier for squads. Look depends on the Barracks level. */
export function makeTrooper(model) {
  const look = {
    squad: { shirt: 0x6b7d3a, pants: 0x4b5320, helm: 0x556b2f },
    specops: { shirt: 0x263238, pants: 0x1c2429, helm: 0x212121, goggles: 0x76ff03 },
    legion: { shirt: 0x5d4037, pants: 0x3e2723, helm: 0x8d6e63, goggles: 0xffab40 },
    fortress: { shirt: 0x1a237e, pants: 0x0d1440, helm: 0x3949ab, goggles: 0x00e5ff, armor: true },
  }[model];
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: look.shirt, pants: look.pants, arms: look.shirt, face: 'soldier' });
  helmet(h, look.helm);
  if (look.goggles) part(h.head, boxGeo(1.1, 0.3, 0.15), glow(h, look.goggles), 0, 1.0, 0.68);
  if (look.armor) part(h.torso, boxGeo(2.2, 1.8, 1.2), h.M(0x3949ab), 0, 0.05, 0);
  holdLongGun(h, 1.5, h.M(0x262626));
  return h;
}

/**
 * A Field Barracks soldier: bscout / bscout2 / bscout3 (Scout, Rifleman, Assault Scout), bspec
 * (Spec Ops), brail (Rail Trooper), bm202 (M202 Trooper), briot (Rioter), bflame (Flamethrower).
 */
export function makeFieldSoldier(model) {
  const look = {
    bscout: { shirt: 0x8d9a5b, pants: 0x5d6b3a, helm: 0x6b7d3a },
    bscout2: { shirt: 0x6b7d3a, pants: 0x4b5320, helm: 0x556b2f },
    bscout3: { shirt: 0x7a6a4f, pants: 0x4e4231, helm: 0x5d4f3a, goggles: 0xffab40 },
    bspec: { shirt: 0x263238, pants: 0x1c2429, helm: 0x111111, goggles: 0x76ff03 },
    brail: { shirt: 0x37474f, pants: 0x263238, helm: 0xeceff1, goggles: 0x00e5ff, armor: 0x546e7a },
    bm202: { shirt: 0x6d5d3f, pants: 0x4e4231, helm: 0x5d4f3a },
    briot: { shirt: 0x1c2429, pants: 0x111111, helm: 0x212121 },
    bflame: { shirt: 0x5d4037, pants: 0x3e2723, helm: 0x424242, goggles: 0xff6d00, armor: 0x6d4c41 },
  }[model];
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: look.shirt, pants: look.pants, arms: look.shirt, face: 'soldier' });
  const { M } = h;
  helmet(h, look.helm, model !== 'briot');
  if (look.goggles) part(h.head, boxGeo(1.1, 0.3, 0.15), glow(h, look.goggles), 0, 1.0, 0.68);
  if (look.armor) part(h.torso, boxGeo(2.2, 1.8, 1.2), M(look.armor), 0, 0.05, 0);
  h.tracer = 0xffc107;
  if (model === 'briot') {
    // Rioter: visor, body armor and a big riot shield it shoves zombies with, plus a pistol
    part(h.head, boxGeo(1.25, 0.5, 0.1), M(0x80deea), 0, 0.7, 0.65);
    part(h.torso, boxGeo(2.2, 1.8, 1.2), M(0x37474f), 0, 0.05, 0);
    part(h.leftArm, boxGeo(0.15, 2.6, 2.0), M(0x90a4ae), 0.3, -1.6, 0.2);
    holdLongGun(h, 0.6, M(0x212121));
    h.leftArm.rotation.set(-0.8, 0, 0);
    h.size = 1.15;
  } else if (model === 'bm202') {
    // M202 Trooper: a boxy four-tube rocket launcher on the shoulder
    const gun = holdLongGun(h, 1.4, M(0x4b5320));
    for (const [x, z] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) part(gun, boxGeo(0.2, 0.08, 0.2), M(0x111111), x, -1.42, z);
    h.projectile = { color: 0xff6d00, size: 0.35, arc: 1.5 };
  } else if (model === 'bflame') {
    // Flamethrower: fuel tanks on the back and a nozzle with a pilot light
    for (const x of [-0.45, 0.45]) part(h.torso, boxGeo(0.6, 1.6, 0.6), M(0xc62828), x, 0.1, -0.95);
    holdLongGun(h, 1.3, M(0x424242));
    part(h.rightArm, boxGeo(0.2, 0.2, 0.2), glow(h, 0xff9100), 0, -3.25, 0);
    h.size = 1.1;
  } else if (model === 'brail') {
    // Rail Trooper: a long rail rifle with glowing coils
    const gun = holdLongGun(h, 2.0, M(0x263238));
    for (const y of [-0.6, -1.1, -1.6]) part(gun, boxGeo(0.4, 0.12, 0.5), glow(h, 0x00e5ff), 0, y, 0);
    h.tracer = 0x00e5ff;
    h.size = 1.15;
  } else holdLongGun(h, model === 'bspec' ? 1.7 : 1.5, M(model === 'bspec' ? 0x111111 : 0x262626));
  return h;
}

const GOONS = ['pistolgoon', 'tommygoon', 'dongoon', 'mgoon', 'mgoon2', 'mgoon3', 'agent', 'agent2', 'agent3'];

const GOLD_SHEEN = 0x2e2000;
const hsl = { h: 0, s: 0, l: 0 };
/**
 * Golden perk towers and goons: recolours a built model gold, keeping how light or dark each
 * part was (dark guns become deep gold, light parts pale gold). Glowing parts and textured
 * faces keep their own colours, and every gold part gets a faint warm sheen.
 */
export function goldify(m) {
  for (const mat of m.mats) {
    if (mat.map || mat.userData.glow || !mat.color) continue;
    mat.color.getHSL(hsl);
    mat.color.setHSL(0.125, 0.85, 0.28 + hsl.l * 0.5);
    mat.userData.glow = GOLD_SHEEN;
    mat.emissive?.setHex(GOLD_SHEEN);
  }
  return m;
}

/**
 * Unit models, facing +Z. Returns { root, body, mats, turret?, muzzles, wheels, legs?, soldiers?, height }.
 * model: jeep, gunjeep, tank, humvee, humvee2, humvee3, lav25, railtank, m1, m2, m11, stryker, apc, missileapc,
 * afhumvee, afhumveetow, afhumveemissile, bradley, mrap, abrams, m1x, a squad (squad, specops, legion,
 * fortress) with `count` soldiers, or a Crook Boss goon (pistolgoon, tommygoon, dongoon).
 */
export function makeUnit(model, count = 1) {
  const extra = UNIT_MODELS_A[model] ?? UNIT_MODELS_B[model] ?? UNIT_MODELS_C[model] ?? UNIT_MODELS_D[model] ?? UNIT_MODELS_E[model] ?? UNIT_MODELS_F[model] ?? UNIT_MODELS_G[model] ?? UNIT_MODELS_H[model] ?? UNIT_MODELS_I[model]; // wave 7-10 units
  if (extra) {
    const m = extra(count);
    if (model === 'chaosBall') m.bounce = m.body; // Chaos Jester's ball bounces along (views.js)
    return m;
  }
  if (model.startsWith('gold')) return goldify(makeUnit(model.slice(4), count)); // Golden Crook Boss goons
  const u = makeThing();
  u.wheels = [];
  const { M } = u;
  const goon = GOONS.includes(model);
  const merc = /^m(rifle|gren|riot|medic)\d*$/.test(model);
  const skel = model.startsWith('skel');
  const camp = model.startsWith('elf') || model.startsWith('plant') || model === 'iceturret' || model === 'iceshard' || model === 'bubblebuddy'; // Elf Camp / Biologist / Elementalist / Bubble Blower
  const field = /^b(scout\d?|spec|rail|m202|riot|flame)$/.test(model);
  const relic = model.startsWith('relic'); // Relic units
  if (field) {
    u.soldiers = [];
    for (let i = 0; i < count; i++) {
      const h = makeFieldSoldier(model);
      h.root.scale.setScalar(0.6 * (h.size ?? 1));
      h.root.position.set(count === 1 ? 0 : (i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
      u.body.add(h.root);
      u.mats.push(...h.mats);
      u.soldiers.push(h);
      u.muzzles.push(h.muzzles[0]);
    }
    u.height = 3.5 * (u.soldiers[0].size ?? 1);
    u.tracer = u.soldiers[0].tracer;
    u.projectile = u.soldiers[0].projectile;
    return u;
  }
  if (goon || merc || skel || camp || relic || ['squad', 'specops', 'legion', 'fortress'].includes(model)) {
    u.soldiers = [];
    for (let i = 0; i < count; i++) {
      const h = goon ? makeGoon(model) : merc ? makeMerc(model) : skel ? makeSkeleton(model) : camp ? makeCampUnit(model) : relic ? makeRelicUnit(model) : makeTrooper(model);
      h.root.scale.setScalar(0.6 * (h.size ?? 1));
      h.root.position.set((i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
      u.body.add(h.root);
      u.mats.push(...h.mats);
      u.soldiers.push(h);
      u.muzzles.push(h.muzzles[0]);
    }
    u.height = 3.5 * (u.soldiers[0].size ?? 1);
    if (relic) {
      u.soldiers[0].root.position.set(0, 0, 0);
      u.tracer = u.soldiers[0].tracer;
      if (model === 'relicseraph') u.fly = 5; // Seraphs float over the zombies
      return u;
    }
    if (camp) {
      // One elf or plant, standing on the spot (not off to the side like a squad member).
      u.soldiers[0].root.position.set(0, 0, 0);
      u.tracer = u.soldiers[0].tracer;
      u.projectile = u.soldiers[0].projectile;
      if (model === 'elfgift') u.fly = 7; // Gift Bombers fly over the path
      return u;
    }
    if (skel) {
      u.tracer = u.soldiers[0].tracer;
      return u;
    }
    u.tracer = model === 'fortress' || model === 'mrifle3' ? 0x00e5ff : model.startsWith('mriot') ? 0xb0bec5 : 0xffc107;
    if (merc) u.projectile = u.soldiers[0].projectile;
    return u;
  }
  if (model === 'goo' || model === 'biggoo') {
    // Goo Gunner puddle Goos: a wobbly green blob with two eyes (Big Goos are bigger).
    const s = model === 'biggoo' ? 1.6 : 1;
    const gooM = glowThing(u, 0x64dd17);
    part(u.body, boxGeo(1.6 * s, 1.1 * s, 1.6 * s), gooM, 0, 0.55 * s, 0);
    part(u.body, boxGeo(1.1 * s, 0.5 * s, 1.1 * s), gooM, 0, 1.3 * s, 0);
    for (const x of [-0.3, 0.3]) part(u.body, boxGeo(0.25 * s, 0.3 * s, 0.1), M(0x1b1b1b), x * s, 1.0 * s, 0.81 * s);
    gunMuzzle(u, u.body, 0, 0.8 * s, 0.8 * s);
    u.height = 1.8 * s;
    u.tracer = 0x76ff03;
    return u;
  }
  if (model === 'voidneuron' || model === 'voidempress') {
    // Void Traitor summons: one void creature on foot.
    const h = makeVoidSoldier(model);
    h.root.scale.setScalar(0.6 * h.size);
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.soldiers = [h];
    u.muzzles.push(h.muzzles[0]);
    u.height = 3.5 * h.size;
    u.tracer = h.tracer;
    return u;
  }
  if (model === 'voidtank') return makeVoidTank(u);
  const tire = M(0x1b1b1b);
  if (model === 'jeep' || model === 'gunjeep') {
    const paint = M(0x6b8e23);
    part(u.body, boxGeo(2.6, 1.0, 4.4), paint, 0, 1.2, 0);
    part(u.body, boxGeo(2.4, 0.9, 1.6), paint, 0, 2.1, -0.6); // cabin
    part(u.body, boxGeo(2.3, 0.7, 0.1), M(0x90caf9), 0, 2.1, 0.25); // windshield
    part(u.body, boxGeo(2.8, 0.4, 0.4), M(0x9e9e9e), 0, 1.0, 2.3); // spiked bumper
    for (const x of [-1, -0.33, 0.33, 1]) part(u.body, boxGeo(0.15, 0.15, 0.5), M(0xbdbdbd), x, 1.0, 2.7);
    part(u.body, boxGeo(0.5, 0.25, 0.1), M(0xfff59d), -0.8, 1.4, 2.21);
    part(u.body, boxGeo(0.5, 0.25, 0.1), M(0xfff59d), 0.8, 1.4, 2.21);
    wheels(u, tire, [-1.35, 1.35], [-1.4, 1.4]);
    if (model === 'gunjeep') {
      const t = turret(u, 2.6, -0.8);
      part(t, boxGeo(0.9, 0.6, 0.9), M(0x37474f), 0, 0.3, 0);
      part(t, boxGeo(0.25, 0.25, 1.8), M(0x212121), 0, 0.45, 0.9);
      gunMuzzle(u, t, 0, 0.45, 1.8);
    } else gunMuzzle(u, u.body, 0, 1.2, 2.4);
    u.height = 3.2;
    u.tracer = 0xffd54f;
  } else if (model === 'tank') {
    const paint = M(0x556b2f);
    part(u.body, boxGeo(3.4, 1.3, 5.2), paint, 0, 1.2, 0);
    for (const x of [-1.8, 1.8]) part(u.body, boxGeo(0.8, 1.2, 5.4), tire, x, 0.7, 0); // tracks
    const t = turret(u, 2.3);
    part(t, boxGeo(2.4, 1.0, 2.6), M(0x4b5a2a), 0, 0.5, -0.2);
    part(t, boxGeo(0.45, 0.45, 3.2), M(0x3a4520), 0, 0.55, 2.4); // cannon
    part(t, boxGeo(0.2, 0.2, 1.2), M(0x212121), 0.8, 1.2, 0.6); // machine gun
    u.cannon = gunMuzzle(u, t, 0, 0.55, 4.0);
    u.muzzles.pop(); // the cannon muzzle is separate from the gun muzzle
    gunMuzzle(u, t, 0.8, 1.2, 1.2);
    u.height = 3.8;
    u.tracer = 0xffab40;
  } else if (model === 'humvee' || model === 'humvee2' || model === 'humvee3') {
    // Military Base Humvees: wide, boxy, desert tan. Humvee 2+ gets armor plates, Humvee 3 a gun turret.
    const paint = M(0xc2a878);
    const armored = model !== 'humvee';
    part(u.body, boxGeo(3.0, 1.1, 4.8), paint, 0, 1.25, 0);
    part(u.body, boxGeo(2.8, 1.0, 2.2), paint, 0, 2.3, -0.5); // cabin
    part(u.body, boxGeo(2.6, 0.6, 0.1), M(0x90caf9), 0, 2.4, 0.62); // windshield
    part(u.body, boxGeo(3.1, 0.5, 0.5), M(0x5d4037), 0, 1.05, 2.5); // push bar
    part(u.body, boxGeo(0.5, 0.25, 0.1), M(0xfff59d), -0.9, 1.5, 2.41);
    part(u.body, boxGeo(0.5, 0.25, 0.1), M(0xfff59d), 0.9, 1.5, 2.41);
    if (armored) {
      const plate = M(0x8d7b5a);
      for (const x of [-1.55, 1.55]) part(u.body, boxGeo(0.12, 0.9, 3.6), plate, x, 1.5, -0.2);
      part(u.body, boxGeo(2.8, 0.15, 1.2), plate, 0, 1.85, 1.6); // hood plate
    }
    wheels(u, tire, [-1.5, 1.5], [-1.6, 1.6], 0.6, 1.2);
    if (model === 'humvee3') {
      const t = turret(u, 2.8, -0.6);
      part(t, boxGeo(1.4, 0.5, 1.4), M(0x6d5f45), 0, 0.25, 0); // ring
      part(t, boxGeo(1.2, 0.8, 0.12), M(0x6d5f45), 0, 0.7, 0.6); // gun shield
      part(t, boxGeo(0.25, 0.25, 1.9), M(0x212121), 0, 0.75, 1.1);
      gunMuzzle(u, t, 0, 0.75, 2.05);
    } else gunMuzzle(u, u.body, 0, 1.2, 2.8);
    u.height = 3.4;
    u.tracer = 0xffd54f;
  } else if (model === 'railtank') {
    // Railgun Tank: a dark heavy tank with a long glowing rail cannon and a coaxial gun.
    const paint = M(0x37474f);
    const rail = glow(u, 0x40c4ff);
    part(u.body, boxGeo(3.8, 1.4, 5.8), paint, 0, 1.3, 0);
    for (const x of [-2.0, 2.0]) part(u.body, boxGeo(0.9, 1.3, 6.0), tire, x, 0.7, 0); // tracks
    part(u.body, boxGeo(3.4, 0.4, 0.6), rail, 0, 1.4, 2.95); // glowing front strip
    const t = turret(u, 2.5);
    part(t, boxGeo(2.8, 1.1, 3.0), M(0x263238), 0, 0.55, -0.3);
    for (const x of [-0.35, 0.35]) part(t, boxGeo(0.22, 0.5, 4.4), M(0x455a64), x, 0.6, 2.8); // twin rails
    part(t, boxGeo(0.3, 0.3, 4.2), rail, 0, 0.6, 2.8); // charge between the rails
    u.cannon = gunMuzzle(u, t, 0, 0.6, 5.0);
    u.muzzles.pop();
    part(t, boxGeo(0.25, 0.25, 1.4), M(0x212121), 1.0, 1.3, 0.7);
    gunMuzzle(u, t, 1.0, 1.3, 1.4);
    part(t, boxGeo(0.25, 0.25, 1.4), M(0x212121), -1.0, 1.3, 0.7);
    gunMuzzle(u, t, -1.0, 1.3, 1.4);
    u.height = 4.2;
    u.tracer = 0x40c4ff;
  } else if (model === 'apc' || model === 'missileapc') {
    // Support Caravan APCs: eight-wheeled, sand colored. The Missile APC carries a launcher box.
    const paint = M(0xa1886b);
    part(u.body, boxGeo(3.0, 1.5, 5.8), paint, 0, 1.6, 0);
    part(u.body, boxGeo(3.0, 0.6, 1.2), paint, 0, 1.2, 3.1); // sloped nose
    part(u.body, boxGeo(2.4, 0.4, 0.1), M(0x90caf9), 0, 2.0, 2.95); // vision slit
    wheels(u, tire, [-1.55, 1.55], [-2.1, -0.7, 0.7, 2.1], 0.6, 1.2);
    const t = turret(u, 2.4, -0.4);
    part(t, boxGeo(1.3, 0.6, 1.3), M(0x7d6a52), 0, 0.3, 0);
    part(t, boxGeo(0.25, 0.25, 1.9), M(0x212121), 0, 0.45, 1.0);
    gunMuzzle(u, t, 0, 0.45, 2.0);
    if (model === 'missileapc') {
      const pod = part(t, boxGeo(1.6, 1.0, 2.0), M(0x5d4f3c), 0, 1.2, -0.4);
      for (const x of [-0.4, 0.4]) for (const y of [-0.2, 0.2]) part(pod, boxGeo(0.3, 0.3, 0.06), M(0xd84315), x, y, 1.02);
      u.cannon = gunMuzzle(u, t, 0, 1.2, 0.7);
      u.muzzles.pop(); // the missile pod fires separately from the gun
    }
    u.height = model === 'missileapc' ? 4.6 : 4;
    u.tracer = 0xffd54f;
  } else if (model === 'lav25') {
    // Operator X-Captain LAV-25: an eight-wheeled armored car, dark green, with a chain gun turret.
    const paint = M(0x4b5a36);
    part(u.body, boxGeo(3.1, 1.6, 6.0), paint, 0, 1.7, 0);
    part(u.body, boxGeo(3.1, 0.7, 1.4), paint, 0, 1.3, 3.2); // sloped nose
    part(u.body, boxGeo(2.6, 0.12, 0.1), M(0x90caf9), 0, 2.2, 3.05); // vision slit
    for (const x of [-1.6, 1.6]) part(u.body, boxGeo(0.12, 1.0, 5.0), M(0x3d4a2c), x, 1.9, 0); // side armor
    wheels(u, tire, [-1.6, 1.6], [-2.2, -0.75, 0.75, 2.2], 0.6, 1.2);
    const t = turret(u, 2.5, -0.3);
    part(t, boxGeo(2.0, 0.8, 1.8), M(0x3d4a2c), 0, 0.4, 0);
    part(t, boxGeo(0.3, 0.3, 2.6), M(0x212121), 0, 0.5, 1.9); // 25mm chain gun
    part(t, boxGeo(0.4, 0.4, 0.4), M(0x37474f), 0.8, 1.0, -0.3); // smoke launchers
    gunMuzzle(u, t, 0, 0.5, 3.2);
    u.height = 4.3;
    u.tracer = 0xffab40;
  } else if (model === 'stryker') {
    const paint = M(0x8d8f6a);
    part(u.body, boxGeo(3.0, 1.6, 5.6), paint, 0, 1.6, 0);
    part(u.body, boxGeo(3.0, 0.6, 1.4), paint, 0, 1.3, 3.0); // sloped nose
    wheels(u, tire, [-1.55, 1.55], [-2.1, -0.7, 0.7, 2.1], 0.6, 1.2);
    const t = turret(u, 2.4, -0.5);
    part(t, boxGeo(1.2, 0.7, 1.2), M(0x6b6d4a), 0, 0.35, 0);
    part(t, boxGeo(0.25, 0.25, 1.8), M(0x212121), 0, 0.45, 1.0);
    gunMuzzle(u, t, 0, 0.45, 1.9);
    u.height = 4;
    u.tracer = 0xffd54f;
  } else if (model.startsWith('afhumvee')) {
    // Armored Factory Humvees: dark green. afhumvee has a .50 cal, afhumveetow a TOW tube,
    // afhumveemissile a boxy missile turret.
    const paint = M(0x4e5b31);
    part(u.body, boxGeo(3.0, 1.1, 4.8), paint, 0, 1.25, 0);
    part(u.body, boxGeo(2.8, 1.0, 2.2), paint, 0, 2.3, -0.5); // cabin
    part(u.body, boxGeo(2.6, 0.6, 0.1), M(0x90caf9), 0, 2.4, 0.62); // windshield
    part(u.body, boxGeo(3.1, 0.5, 0.5), M(0x263238), 0, 1.05, 2.5); // push bar
    part(u.body, boxGeo(0.5, 0.25, 0.1), M(0xfff59d), -0.9, 1.5, 2.41);
    part(u.body, boxGeo(0.5, 0.25, 0.1), M(0xfff59d), 0.9, 1.5, 2.41);
    for (const x of [-1.55, 1.55]) part(u.body, boxGeo(0.12, 0.9, 3.6), M(0x3b4626), x, 1.5, -0.2); // side armor
    wheels(u, tire, [-1.5, 1.5], [-1.6, 1.6], 0.6, 1.2);
    const t = turret(u, 2.8, -0.6);
    part(t, boxGeo(1.4, 0.5, 1.4), M(0x3b4626), 0, 0.25, 0); // ring
    if (model === 'afhumvee') {
      part(t, boxGeo(1.2, 0.8, 0.12), M(0x3b4626), 0, 0.7, 0.6); // gun shield
      part(t, boxGeo(0.3, 0.3, 2.1), M(0x212121), 0, 0.75, 1.2); // .50 cal
      gunMuzzle(u, t, 0, 0.75, 2.25);
    } else if (model === 'afhumveetow') {
      part(t, boxGeo(0.5, 0.5, 2.6), M(0x5d6b3a), 0, 0.85, 0.6); // TOW tube
      part(t, boxGeo(0.35, 0.35, 0.06), M(0xd84315), 0, 0.85, 1.92);
      part(t, boxGeo(0.4, 0.3, 0.4), M(0x212121), 0.45, 0.9, 0.2); // sight
      u.cannon = gunMuzzle(u, t, 0, 0.85, 2.0);
    } else {
      const pod = part(t, boxGeo(1.8, 1.0, 1.6), M(0x37474f), 0, 1.0, 0); // missile turret
      for (const x of [-0.5, 0, 0.5]) for (const y of [-0.22, 0.22]) part(pod, boxGeo(0.3, 0.3, 0.06), M(0xd84315), x, y, 0.82);
      part(t, boxGeo(0.25, 0.6, 0.25), M(0x212121), 0, 1.75, -0.4); // radar mast
      part(t, boxGeo(0.9, 0.4, 0.08), M(0x90a4ae), 0, 2.1, -0.4);
      u.cannon = gunMuzzle(u, t, 0, 1.0, 0.9);
    }
    u.height = 3.8;
    u.tracer = 0xffd54f;
  } else if (model === 'bradley') {
    // M2 Bradley: a tracked IFV with a sloped front, a 25mm autocannon and a TOW box on the turret side.
    const paint = M(0x5b6640);
    part(u.body, boxGeo(3.4, 1.6, 5.6), paint, 0, 1.5, -0.1);
    part(u.body, boxGeo(3.4, 0.8, 1.2), paint, 0, 1.1, 3.0); // sloped nose
    for (const x of [-1.85, 1.85]) part(u.body, boxGeo(0.8, 1.2, 6.0), tire, x, 0.65, 0); // tracks
    for (const x of [-2.25, 2.25]) part(u.body, boxGeo(0.1, 0.9, 5.4), M(0x4a5434), x, 1.3, 0); // side skirts
    const t = turret(u, 2.6, -0.3);
    part(t, boxGeo(2.2, 0.9, 2.2), M(0x4a5434), 0, 0.45, 0);
    part(t, boxGeo(0.25, 0.25, 2.6), M(0x212121), -0.3, 0.5, 2.3); // 25mm
    gunMuzzle(u, t, -0.3, 0.5, 3.6);
    const tow = part(t, boxGeo(0.8, 0.7, 1.4), M(0x3b4626), 1.4, 0.7, 0.1); // TOW box
    part(tow, boxGeo(0.3, 0.3, 0.06), M(0xd84315), -0.15, 0, 0.72);
    part(tow, boxGeo(0.3, 0.3, 0.06), M(0xd84315), 0.15, 0, 0.72);
    u.cannon = gunMuzzle(u, t, 1.4, 0.7, 0.9);
    u.muzzles.pop();
    u.height = 4.0;
    u.tracer = 0xffab40;
  } else if (model === 'mrap') {
    // MRAP: tall, V-hulled, six big wheels, an autocannon on a remote turret.
    const paint = M(0xb59b6d);
    part(u.body, boxGeo(3.2, 1.2, 6.0), M(0x8d7b5a), 0, 1.4, 0); // V hull
    part(u.body, boxGeo(3.2, 1.8, 3.6), paint, 0, 2.9, -0.8); // crew box
    part(u.body, boxGeo(3.2, 1.2, 2.2), paint, 0, 2.6, 2.0); // engine
    part(u.body, boxGeo(2.6, 0.7, 0.1), M(0x90caf9), 0, 3.2, 1.02); // windshield
    part(u.body, boxGeo(3.4, 0.6, 0.4), M(0x424242), 0, 1.6, 3.15); // bumper
    wheels(u, tire, [-1.7, 1.7], [-2.0, 0, 2.0], 0.75, 1.5);
    const t = turret(u, 3.8, -1.0);
    part(t, boxGeo(1.3, 0.7, 1.3), M(0x6d5f45), 0, 0.35, 0);
    part(t, boxGeo(0.35, 0.35, 2.2), M(0x212121), 0, 0.45, 1.3); // autocannon
    gunMuzzle(u, t, 0, 0.45, 2.4);
    u.height = 5.0;
    u.tracer = 0xff9100;
  } else if (/^(behemoth\d?|mammoth|laserbehemoth\d?|walker\d?|warmachine\d?)$/.test(model)) {
    makeHeavyUnit(u, model, tire);
  } else if (model === 'abrams' || model === 'm1x') {
    // M1 Abrams: a long, flat, angular tank. M1X is darker, bigger, with a longer cannon and glowing trim.
    const x2 = model === 'm1x';
    const s = x2 ? 1.15 : 1;
    const paint = M(x2 ? 0x2e3b2a : 0xc8b58a);
    const dark = M(x2 ? 0x1f2a1c : 0xa8956b);
    part(u.body, boxGeo(3.8 * s, 1.2, 6.4 * s), paint, 0, 1.3, 0);
    part(u.body, boxGeo(3.8 * s, 0.6, 1.0), paint, 0, 1.0, 3.4 * s); // glacis
    for (const x of [-2.0, 2.0]) part(u.body, boxGeo(0.9, 1.2, 6.6 * s), tire, x * s, 0.65, 0); // tracks
    for (const x of [-2.5, 2.5]) part(u.body, boxGeo(0.1, 0.8, 6.0 * s), dark, x * s, 1.25, 0); // skirts
    const t = turret(u, 2.4, -0.4);
    part(t, boxGeo(3.0 * s, 0.9, 3.4 * s), dark, 0, 0.45, 0);
    part(t, boxGeo(2.2 * s, 0.5, 0.9), dark, 0, 0.45, 2.0 * s); // wedge front
    const len = x2 ? 5.2 : 4.2;
    part(t, boxGeo(0.4, 0.4, len), M(0x37474f), 0, 0.5, 1.7 + len / 2); // main gun
    if (x2) part(t, boxGeo(3.0 * s + 0.1, 0.15, 0.15), glow(u, 0x76ff03), 0, 0.6, 1.75 * s);
    u.cannon = gunMuzzle(u, t, 0, 0.5, 1.8 + len);
    u.muzzles.pop();
    part(t, boxGeo(0.2, 0.2, 1.3), M(0x212121), 0.9, 1.15, 0.6); // loader's MG
    gunMuzzle(u, t, 0.9, 1.15, 1.3);
    u.height = 4.0;
    u.tracer = x2 ? 0x76ff03 : 0xffab40;
  } else {
    // Zed vehicles: m1 is a tracked tank-bot, m2 and m11 are walking mechs.
    const mech = model !== 'm1';
    const big = model === 'm11';
    const paint = M(big ? 0x212121 : mech ? 0x546e7a : 0x6d4c41);
    const trim = big ? glow(u, 0xff1744) : glow(u, 0xffc400);
    let hipY = 1.3;
    if (mech) {
      u.legs = [];
      hipY = big ? 4.2 : 3.4;
      for (const x of [-1.3, 1.3]) {
        const leg = new THREE.Group();
        leg.position.set(x * (big ? 1.25 : 1), hipY, 0);
        u.body.add(leg);
        part(leg, boxGeo(big ? 1.3 : 1.0, hipY, big ? 1.4 : 1.1), paint, 0, -hipY / 2, 0);
        part(leg, boxGeo(big ? 1.8 : 1.4, 0.5, big ? 2.4 : 1.9), M(0x263238), 0, -hipY + 0.25, 0.3); // foot
        u.legs.push(leg);
      }
    } else {
      for (const x of [-1.7, 1.7]) part(u.body, boxGeo(0.9, 1.4, 5), tire, x, 0.7, 0);
    }
    const s = big ? 1.35 : 1;
    part(u.body, boxGeo(3.2 * s, 1.8 * s, 3.4 * s), paint, 0, hipY + 0.9 * s, 0); // hull / torso
    part(u.body, boxGeo(1.6 * s, 0.5 * s, 0.1), trim, 0, hipY + 1.3 * s, 1.71 * s); // eye slit
    const t = turret(u, hipY + 1.8 * s);
    part(t, boxGeo(1.8 * s, 0.9 * s, 2 * s), M(big ? 0x37474f : 0x795548), 0, 0.45 * s, 0);
    for (const x of [-0.5, 0.5]) {
      part(t, boxGeo(0.25, 0.25, 2.4 * s), M(0x212121), x * s, 0.45 * s, 1.6 * s);
      gunMuzzle(u, t, x * s, 0.45 * s, 2.8 * s);
    }
    // Arm cannon on the side (all Zed vehicles from Lv 3 have one; the M1 model shows it too).
    part(u.body, boxGeo(0.8 * s, 0.8 * s, 3 * s), M(0x424242), 2.1 * s, hipY + 0.9 * s, 0.6);
    part(u.body, boxGeo(0.5 * s, 0.5 * s, 0.1), trim, 2.1 * s, hipY + 0.9 * s, 2.15 * s);
    u.cannon = gunMuzzle(u, u.body, 2.1 * s, hipY + 0.9 * s, 2.2 * s);
    u.muzzles.pop(); // the cannon muzzle is separate from the gun muzzles
    u.height = hipY + 3.4 * s;
    u.tracer = big ? 0xff5252 : 0xffd54f;
  }
  return u;
}

/**
 * Behemoth Factory and War Machine Factory units, built onto `u`.
 * behemoth..behemoth4 / mammoth: giant tanks with a huge cannon (two barrels from behemoth4).
 * laserbehemoth / 2 / 3: white-blue, purple, then black-red tanks with a long railgun.
 * walker..walker5: Abrams Walkers, two-legged mechs with cannon arms (miniguns from walker3).
 * warmachine / 2 / 3: towering humanoid mechs with a flamethrower arm and a huge fist.
 */
export function makeHeavyUnit(u, model, tire) {
  const { M } = u;
  if (model.startsWith('behemoth') || model === 'mammoth' || model.startsWith('laserbehemoth')) {
    const laser = model.startsWith('laserbehemoth');
    const lv = laser ? Number(model.slice(13)) || 1 : model === 'mammoth' ? 5 : Number(model.slice(8)) || 0;
    const s = laser ? 1.35 + lv * 0.1 : model === 'mammoth' ? 2.0 : 1.3 + lv * 0.1;
    const paint = M(laser ? [0xeceff1, 0x4a148c, 0x1a1a1a][lv - 1] : [0x556b2f, 0x556b2f, 0x607d8b, 0x4e5b31, 0x263238, 0x1c1c1c][lv]);
    const dark = M(laser ? [0x90a4ae, 0x311b92, 0x0d0d0d][lv - 1] : 0x2e3b1f);
    const trim = laser ? glow(u, [0x40c4ff, 0xe040fb, 0xff1744][lv - 1]) : lv >= 4 ? glow(u, model === 'mammoth' ? 0xff3d00 : 0xffc400) : null;
    part(u.body, boxGeo(4.2 * s, 1.6 * s, 6.8 * s), paint, 0, 1.5 * s, 0); // hull
    part(u.body, boxGeo(4.2 * s, 0.7 * s, 1.2 * s), dark, 0, 1.0 * s, 3.8 * s); // ram plow
    for (const x of [-0.45, 0, 0.45]) part(u.body, boxGeo(0.2 * s, 0.9 * s, 0.6 * s), M(0x9e9e9e), x * 4 * s, 1.0 * s, 4.5 * s); // plow spikes
    for (const x of [-2.3, 2.3]) part(u.body, boxGeo(1.1 * s, 1.5 * s, 7.2 * s), tire, x * s, 0.75 * s, 0); // tracks
    if (lv >= 2 || laser) for (const x of [-2.9, 2.9]) part(u.body, boxGeo(0.15 * s, 1.0 * s, 6.4 * s), dark, x * s, 1.5 * s, 0); // side skirts
    if (trim) part(u.body, boxGeo(4.3 * s, 0.15 * s, 0.15 * s), trim, 0, 2.0 * s, 3.4 * s);
    const t = turret(u, 2.3 * s, -0.5 * s);
    part(t, boxGeo(3.2 * s, 1.3 * s, 3.6 * s), dark, 0, 0.65 * s, 0);
    if (laser) {
      // Railgun: two long rails with a glowing charge between them.
      const len = (6 + lv) * s;
      for (const x of [-0.35, 0.35]) part(t, boxGeo(0.25 * s, 0.55 * s, len), paint, x * s, 0.7 * s, 1.8 * s + len / 2);
      part(t, boxGeo(0.3 * s, 0.3 * s, len), trim, 0, 0.7 * s, 1.8 * s + len / 2);
      for (const z of [0.3, 0.6]) part(t, boxGeo(1.1 * s, 0.75 * s, 0.25 * s), dark, 0, 0.7 * s, 1.8 * s + len * z); // rail clamps
      gunMuzzle(u, t, 0, 0.7 * s, 1.9 * s + len);
      u.tracer = [0x40c4ff, 0xe040fb, 0xff1744][lv - 1];
      u.tracerWidth = 0.5;
    } else {
      const len = (lv >= 2 ? 5.5 : 4.5) * s;
      const xs = lv >= 4 ? [-0.6, 0.6] : [0];
      for (const x of xs) part(t, boxGeo(0.55 * s, 0.55 * s, len), M(0x37474f), x * s, 0.7 * s, 1.8 * s + len / 2);
      for (const x of xs) part(t, boxGeo(0.8 * s, 0.8 * s, 0.6 * s), M(0x212121), x * s, 0.7 * s, 1.8 * s + len); // muzzle brakes
      u.cannon = gunMuzzle(u, t, xs[0] * s, 0.7 * s, 2.2 * s + len);
      u.muzzles.pop();
      if (model === 'mammoth') {
        // Anti-air missile racks on the turret sides
        for (const x of [-1.9, 1.9]) {
          part(t, boxGeo(0.8 * s, 0.8 * s, 1.6 * s), M(0x37474f), x * s, 1.0 * s, -0.4 * s);
          part(t, boxGeo(0.6 * s, 0.6 * s, 0.1), glow(u, 0xff3d00), x * s, 1.0 * s, 0.45 * s);
        }
      }
      u.tracer = 0xffab40;
    }
    part(t, boxGeo(0.25, 0.25, 1.4), M(0x212121), 1.0 * s, 1.5 * s, 0.4 * s); // commander's MG
    if (!u.muzzles.length) gunMuzzle(u, t, 1.0 * s, 1.5 * s, 1.1 * s);
    u.height = 4.2 * s;
    return;
  }
  // Mechs
  const wm = model.startsWith('warmachine');
  const lv = wm ? Number(model.slice(10)) || 1 : Number(model.slice(6)) || 0;
  const s = wm ? 1.5 + lv * 0.2 : 1 + lv * 0.05;
  const paint = M(wm ? [0x37474f, 0x263238, 0x111111][lv - 1] : lv >= 5 ? 0x1c1c1c : 0xc8b58a);
  const dark = M(wm ? 0x1a1a1a : lv >= 5 ? 0x0d0d0d : 0x8d7b5a);
  const eye = glow(u, wm ? [0xff6d00, 0xff1744, 0xd500f9][lv - 1] : lv >= 5 ? 0x76ff03 : 0xffc400);
  const hipY = (wm ? 3.6 : 3.0) * s;
  u.legs = [];
  for (const x of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(x * 1.3 * s, hipY, 0);
    u.body.add(leg);
    part(leg, boxGeo(1.1 * s, hipY, 1.2 * s), paint, 0, -hipY / 2, 0);
    part(leg, boxGeo(1.3 * s, 0.7 * s, 1.0 * s), dark, 0, -hipY * 0.5, 0.35 * s); // knee armor
    part(leg, boxGeo(1.6 * s, 0.5 * s, 2.2 * s), dark, 0, -hipY + 0.25 * s, 0.3 * s); // foot
    u.legs.push(leg);
  }
  const torsoH = (wm ? 3.2 : 1.9) * s;
  const t = turret(u, hipY);
  part(t, boxGeo((wm ? 3.4 : 3.0) * s, torsoH, (wm ? 2.4 : 2.6) * s), paint, 0, torsoH / 2, 0);
  part(t, boxGeo(1.4 * s, 0.4 * s, 0.1), eye, 0, torsoH * (wm ? 0.8 : 0.6), (wm ? 1.21 : 1.31) * s); // visor
  if (wm) {
    // A head, shoulder pads, a flamethrower arm (right) and a huge fist (left).
    part(t, boxGeo(1.4 * s, 1.1 * s, 1.3 * s), dark, 0, torsoH + 0.55 * s, 0);
    part(t, boxGeo(1.0 * s, 0.25 * s, 0.1), eye, 0, torsoH + 0.6 * s, 0.66 * s);
    for (const x of [-1, 1]) part(t, boxGeo(1.4 * s, 0.8 * s, 1.8 * s), dark, x * 2.2 * s, torsoH - 0.2 * s, 0);
    part(t, boxGeo(1.0 * s, 2.8 * s, 1.0 * s), paint, 2.2 * s, torsoH - 1.8 * s, 0.3 * s); // right arm
    part(t, boxGeo(0.7 * s, 0.7 * s, 2.0 * s), M(0x424242), 2.2 * s, torsoH - 3.1 * s, 1.2 * s); // flamer nozzle
    part(t, boxGeo(0.5 * s, 0.5 * s, 0.1), glow(u, 0xff6d00), 2.2 * s, torsoH - 3.1 * s, 2.21 * s);
    gunMuzzle(u, t, 2.2 * s, torsoH - 3.1 * s, 2.3 * s);
    part(t, boxGeo(1.0 * s, 2.6 * s, 1.0 * s), paint, -2.2 * s, torsoH - 1.7 * s, 0.3 * s); // left arm
    part(t, boxGeo(1.6 * s, 1.6 * s, 1.6 * s), dark, -2.2 * s, torsoH - 3.4 * s, 0.6 * s); // fist
    u.cannon = gunMuzzle(u, t, -2.2 * s, torsoH - 3.4 * s, 1.5 * s);
    u.muzzles.pop();
    if (lv >= 3) for (const x of [-1, 1]) part(t, boxGeo(0.25 * s, 1.6 * s, 0.25 * s), eye, x * 0.9 * s, torsoH + 1.6 * s, -0.4 * s); // horns
    u.height = hipY + torsoH + 1.5 * s;
    u.tracer = 0xff6d00;
    return;
  }
  // Abrams Walker: cannon arms on both sides (minigun on the right from walker3, four miniguns at walker5).
  const cannons = lv >= 2 ? [-1, 1] : [-1];
  for (const x of cannons) {
    if (x > 0 && lv >= 3) continue; // the right arm is a minigun from Lv 3
    part(t, boxGeo(0.9 * s, 0.9 * s, 3.4 * s), dark, x * 2.0 * s, torsoH * 0.6, 0.9 * s);
    part(t, boxGeo(0.45 * s, 0.45 * s, 1.6 * s), M(0x37474f), x * 2.0 * s, torsoH * 0.6, 3.2 * s);
  }
  u.cannon = gunMuzzle(u, t, -2.0 * s, torsoH * 0.6, 4.0 * s);
  u.muzzles.pop();
  if (lv >= 3) {
    const guns = lv >= 5 ? [[2.0, 0.4], [2.0, 1.0], [2.6, 0.4], [2.6, 1.0]] : [[2.0, 0.6]];
    for (const [x, y] of guns) {
      part(t, boxGeo(0.4 * s, 0.4 * s, 2.6 * s), M(0x212121), x * s, torsoH * y, 1.2 * s);
      gunMuzzle(u, t, x * s, torsoH * y, 2.5 * s);
    }
  }
  if (lv >= 4) part(t, boxGeo(1.0 * s, 0.9 * s, 1.2 * s), M(0x37474f), 0, torsoH + 0.45 * s, -0.6 * s); // ammo pod
  u.height = hipY + torsoH + 0.8 * s;
  u.tracer = lv >= 5 ? 0x76ff03 : 0xffd54f;
}

// ------------------------------------------------------------------ spawner, income and support towers

/** Patrol: a garage with a flag and its current vehicle parked out front. */
export function makePatrol(level) {
  const u = makeThing();
  const { M } = u;
  part(u.body, boxGeo(4, 0.3, 4), M(0x9e9e9e), 0, 0.15, 0); // concrete
  part(u.body, boxGeo(3.6, 3.0, 2.0), M(0x8d6e63), 0, 1.8, -1.0); // garage
  part(u.body, boxGeo(3.9, 0.3, 2.3), M(0x5d4037), 0, 3.4, -1.0); // roof
  part(u.body, boxGeo(2.6, 2.2, 0.1), M(0x616161), 0, 1.4, 0.02); // door
  for (let i = 0; i < 4; i++) part(u.body, boxGeo(2.6, 0.08, 0.12), M(0x424242), 0, 0.6 + i * 0.5, 0.05);
  part(u.body, boxGeo(0.15, 3.5, 0.15), M(0xbdbdbd), 1.7, 4.8, -1.8); // flag pole
  part(u.body, boxGeo(0.05, 0.9, 1.4), M(0x1e88e5), 1.7, 6.0, -1.1);
  const car = makeUnit(level >= 4 ? 'tank' : level >= 3 ? 'gunjeep' : 'jeep');
  car.root.scale.setScalar(0.42);
  car.root.position.set(0, 0.3, 1.2);
  car.root.rotation.y = Math.PI / 2;
  u.body.add(car.root);
  u.mats.push(...car.mats);
  if (level >= 1) {
    // Spiked Bumper: a spiked barrier and a big bumper bolted above the door
    const spikeM = M(0xbdbdbd);
    part(u.body, boxGeo(3.6, 0.35, 0.3), M(0x424242), 0, 2.75, 0.2);
    for (const x of [-1.4, -0.7, 0, 0.7, 1.4]) part(u.body, boxGeo(0.18, 0.18, 0.6), spikeM, x, 2.75, 0.55);
    part(u.body, boxGeo(0.3, 0.3, 0.9), spikeM, 1.7, 0.45, 1.6).rotation.y = 0.6;
    part(u.body, boxGeo(0.3, 0.3, 0.9), spikeM, 1.7, 0.45, 1.6).rotation.y = -0.6;
  }
  if (level >= 2) {
    // Suicide Mission: explosive drums and hazard stripes on the door
    for (const [x, z] of [[-1.6, 1.4], [-1.6, 0.7], [-1.0, 1.6]]) part(u.body, boxGeo(0.6, 0.9, 0.6), M(0xc62828), x, 0.75, z);
    for (let i = 0; i < 4; i++) part(u.body, boxGeo(0.5, 2.2, 0.05), M(0xfdd835), -0.95 + i * 0.65, 1.4, 0.1);
  }
  if (level >= 3) {
    // Mounted Gunner: a sandbagged machine-gun nest on the roof
    const bag = M(0xa1887f);
    for (const x of [-1.2, 0, 1.2]) part(u.body, boxGeo(1.1, 0.5, 0.6), bag, x, 3.8, -0.3);
    part(u.body, boxGeo(0.35, 0.35, 1.6), M(0x212121), 0, 4.2, 0.2);
  }
  return u;
}

/**
 * Military Base (alternate Patrol form): a concrete compound with a hangar and its current
 * vehicle parked out front. Lv 2 adds barbed-wire fencing, Lv 3 a sandbag gun nest, Lv 4 a
 * radar dish for the Airstrike, Lv 5 a glowing railgun charging station.
 */
/**
 * Armored Factory: a big corrugated factory hall with a smokestack and its current vehicle on the
 * ramp. Top path adds a TOW crate, then a missile rack and a Bradley parked beside it; Bottom path
 * adds a training banner, then an MRAP / Abrams parked beside it.
 */
export function makeArmoredFactoryWith(level, bottom) {
  const u = makeThing();
  const { M } = u;
  part(u.body, boxGeo(4.8, 0.3, 4.8), M(0x757575), 0, 0.15, 0); // concrete pad
  part(u.body, boxGeo(4.4, 3.0, 2.2), M(0x546e7a), 0, 1.8, -1.2); // hall
  for (let i = 0; i < 6; i++) part(u.body, boxGeo(0.08, 2.9, 0.06), M(0x455a64), -1.9 + i * 0.76, 1.8, -0.08); // corrugation
  part(u.body, boxGeo(4.7, 0.35, 2.5), M(0x37474f), 0, 3.45, -1.2); // roof
  part(u.body, boxGeo(2.8, 2.2, 0.1), M(0x263238), 0, 1.4, -0.05); // door
  for (let i = 0; i < 5; i++) part(u.body, boxGeo(0.35, 0.12, 0.06), M(i % 2 ? 0x212121 : 0xffc400), -1.4 + i * 0.7, 2.65, -0.01); // hazard stripe
  part(u.body, boxGeo(0.7, 2.6, 0.7), M(0x8d6e63), 1.7, 4.6, -1.8); // smokestack
  part(u.body, boxGeo(0.8, 0.2, 0.8), M(0x424242), 1.7, 5.95, -1.8);
  part(u.body, boxGeo(2.6, 0.12, 1.8), M(0x9e9e9e), 0, 0.36, 1.2); // ramp
  const top = !bottom;
  const main = top ? ['afhumvee', 'afhumvee', 'afhumveetow', 'afhumveetow', 'afhumveemissile', 'afhumveemissile'][level] : 'afhumvee';
  const car = makeUnit(main ?? 'afhumvee');
  car.root.scale.setScalar(0.4);
  car.root.position.set(bottom && level >= 3 ? -1.1 : 0, 0.4, 1.3);
  car.root.rotation.y = Math.PI / 2;
  u.body.add(car.root);
  u.mats.push(...car.mats);
  const side = top ? (level >= 5 ? 'bradley' : null) : level >= 5 ? 'm1x' : level >= 4 ? 'abrams' : level >= 3 ? 'mrap' : null;
  if (side) {
    const v = makeUnit(side);
    v.root.scale.setScalar(0.33);
    v.root.position.set(top ? -1.6 : 1.2, 0.3, top ? 1.1 : 1.3);
    if (top) v.root.rotation.y = Math.PI / 2;
    u.body.add(v.root);
    u.mats.push(...v.mats);
  }
  if (level >= 1 && top) {
    // 50 Cal+: ammo crates by the door
    for (const [x, y] of [[1.8, 0.55], [1.8, 1.05], [1.35, 0.55]]) part(u.body, boxGeo(0.5, 0.45, 0.7), M(0x5d6b3a), x, y, 0.4);
  }
  if (level >= 3 && top) {
    // TOW Missile Upgrade: a missile rack on the roof
    for (const x of [-1.2, -0.6, 0]) part(u.body, boxGeo(0.25, 0.25, 1.6), M(0xeceff1), x, 3.8, -1.2);
  }
  if (level >= 4 && top) part(u.body, boxGeo(1.0, 0.6, 0.15), glow(u, 0xff1744), -1.2, 4.4, -0.6); // radar panel
  if (bottom && level >= 1) {
    // Vehicle / Veteran Training: a banner (gold with veterans)
    part(u.body, boxGeo(0.12, 1.4, 0.9), M(level >= 2 ? 0xffc400 : 0x2e7d32), -2.25, 2.0, -0.6);
  }
  if (bottom && level >= 4) part(u.body, boxGeo(4.5, 0.25, 0.25), glow(u, level >= 5 ? 0x76ff03 : 0xff9100), 0, 3.15, 0.0); // hall lights
  return u;
}
export const makeArmoredFactory = (level) => makeArmoredFactoryWith(level, false);
export const makeArmoredFactoryBottom = (level) => makeArmoredFactoryWith(level, true);

export function makeMilitaryBase(level) {
  const u = makeThing();
  const { M } = u;
  part(u.body, boxGeo(4.6, 0.3, 4.6), M(0x8d8d8d), 0, 0.15, 0); // concrete pad
  part(u.body, boxGeo(4.0, 2.8, 2.0), M(0x6b6b4e), 0, 1.7, -1.2); // hangar
  part(u.body, boxGeo(4.3, 0.35, 2.3), M(0x4a4a36), 0, 3.25, -1.2); // roof
  part(u.body, boxGeo(2.8, 2.2, 0.1), M(0x3e3e30), 0, 1.4, -0.18); // door
  part(u.body, boxGeo(1.6, 0.5, 0.06), M(0xfafafa), 0, 2.85, -0.14); // sign
  part(u.body, boxGeo(0.6, 0.3, 0.07), M(0x2e7d32), 0, 2.85, -0.12);
  part(u.body, boxGeo(0.15, 3.8, 0.15), M(0xbdbdbd), -2.0, 2.0, -2.0); // flag pole
  part(u.body, boxGeo(0.05, 0.9, 1.4), M(0x2e7d32), -2.0, 3.4, -1.3);
  const car = makeUnit(['humvee', 'humvee', 'humvee2', 'humvee3', 'tank', 'railtank'][level] ?? 'humvee');
  car.root.scale.setScalar(0.4);
  car.root.position.set(0, 0.3, 1.3);
  car.root.rotation.y = Math.PI / 2;
  u.body.add(car.root);
  u.mats.push(...car.mats);
  if (level >= 1) {
    // Barbed Wire: fence posts along the front corners with wire strands
    const post = M(0x5d4037);
    const wire = M(0x9e9e9e);
    for (const x of [-2.15, 2.15]) {
      for (const z of [-0.3, 0.9, 2.1]) part(u.body, boxGeo(0.15, 1.2, 0.15), post, x, 0.9, z);
      for (const y of [0.7, 1.1, 1.45]) part(u.body, boxGeo(0.05, 0.05, 2.5), wire, x, y, 0.9);
    }
  }
  if (level >= 2) {
    // Armor Plating: spare armor plates leaning on the hangar
    for (const x of [1.4, 1.75]) part(u.body, boxGeo(0.12, 1.4, 0.9), M(0x8d7b5a), x, 1.0, 0.2).rotation.z = 0.15;
  }
  if (level >= 3) {
    // Mounted Gunner: a sandbagged gun nest on the roof
    const bag = M(0xa1887f);
    for (const x of [-1.3, 0, 1.3]) part(u.body, boxGeo(1.2, 0.5, 0.6), bag, x, 3.65, -0.5);
    part(u.body, boxGeo(0.3, 0.3, 1.5), M(0x212121), 0, 4.05, -0.1);
  }
  if (level >= 4) {
    // Tank / Airstrike: a radar mast with a dish
    part(u.body, boxGeo(0.2, 1.8, 0.2), M(0x757575), 1.5, 4.3, -1.8);
    const dish = part(u.body, boxGeo(1.4, 1.0, 0.15), M(0xe0e0e0), 1.5, 5.3, -1.6);
    dish.rotation.x = -0.5;
    part(u.body, boxGeo(0.2, 0.2, 0.2), glow(u, 0xff1744), 1.5, 5.9, -1.8);
  }
  if (level >= 5) {
    // Railgun Tank: a charging pylon with glowing coils
    const coil = glow(u, 0x40c4ff);
    part(u.body, boxGeo(0.6, 2.4, 0.6), M(0x37474f), -1.7, 1.5, 1.8);
    for (const y of [0.9, 1.6, 2.3]) part(u.body, boxGeo(0.8, 0.15, 0.8), coil, -1.7, y, 1.8);
  }
  return u;
}

/** Barracks: a tent with sandbags; becomes a stone fort at Lv 5. */
export function makeBarracks(level) {
  const u = makeThing();
  const { M } = u;
  const fort = level >= 4;
  if (fort) {
    const stone = M(0x78909c);
    part(u.body, boxGeo(3.8, 3.2, 3.4), stone, 0, 1.6, -0.2);
    for (const x of [-1.6, -0.55, 0.55, 1.6]) part(u.body, boxGeo(0.6, 0.6, 3.4), stone, x, 3.5, -0.2); // battlements
    part(u.body, boxGeo(1.4, 2.0, 0.1), M(0x3e2723), 0, 1.0, 1.52);
  } else {
    const canvas = M([0x6b7d3a, 0xc2a878, 0x37474f, 0x7b1f1f][level]); // olive, desert tan, spec-ops grey, legion red
    const l = part(u.body, boxGeo(0.2, 3.4, 3.6), canvas, -1.0, 1.4, -0.2);
    l.rotation.z = -0.6;
    const r = part(u.body, boxGeo(0.2, 3.4, 3.6), canvas, 1.0, 1.4, -0.2);
    r.rotation.z = 0.6;
    part(u.body, boxGeo(1.2, 2.2, 0.1), M(0x212121), 0, 1.1, 1.5); // dark entrance
  }
  const bag = M(0xc2a878);
  for (const x of [-1.6, -0.8, 0.8, 1.6]) part(u.body, boxGeo(0.75, 0.45, 0.6), bag, x, 0.25, 1.8);
  if (level >= 1) for (const x of [-1.2, 1.2]) part(u.body, boxGeo(0.75, 0.45, 0.6), bag, x, 0.7, 1.8);
  if (level >= 3) {
    // Legion: a weapons rack and a crate of gear out front
    part(u.body, boxGeo(0.9, 0.7, 0.7), M(0x5d4037), 1.6, 0.35, 0.8);
    part(u.body, boxGeo(1.6, 0.15, 0.2), M(0x3e2723), -0.2, 1.3, 2.3);
    for (const x of [-0.7, -0.2, 0.3]) part(u.body, boxGeo(0.15, 1.4, 0.15), M(0x212121), x, 0.95, 2.4);
  }
  part(u.body, boxGeo(0.15, 3.0, 0.15), M(0xbdbdbd), -1.7, fort ? 5.2 : 3.0, -1.5);
  part(u.body, boxGeo(0.05, 0.8, 1.2), M(level >= 3 ? 0xffb300 : level >= 2 ? 0x212121 : 0xc62828), -1.7, fort ? 6.2 : 4.0, -0.9);
  return u;
}

/**
 * Field Barracks: a sandbagged canvas outpost with a flagpole and a Scout on guard. Top path adds
 * an ammo crate, a radio mast, then a glowing rail charging rack; Bottom path adds a training
 * dummy, then a rocket crate, a riot shield rack and red fuel barrels.
 */
export function makeFieldBarracksWith(level, bottom) {
  const u = makeThing();
  const { M } = u;
  part(u.body, boxGeo(4.6, 0.25, 4.6), M(0x8d7b5a), 0, 0.12, 0); // dirt pad
  const canvas = M(bottom ? [0x8d9a5b, 0x8d9a5b, 0x8d9a5b, 0x7a6a4f, 0x5d4037, 0x4e342e][level] : [0x8d9a5b, 0x8d9a5b, 0x6b7d3a, 0x7a6a4f, 0x37474f, 0x263238][level]);
  const l = part(u.body, boxGeo(0.2, 3.0, 3.0), canvas, -0.9, 1.3, -0.8);
  l.rotation.z = -0.65;
  const r = part(u.body, boxGeo(0.2, 3.0, 3.0), canvas, 0.9, 1.3, -0.8);
  r.rotation.z = 0.65;
  part(u.body, boxGeo(1.0, 1.9, 0.1), M(0x212121), 0, 0.95, 0.68); // entrance
  const bag = M(0xc2a878);
  for (const x of [-1.8, -1.05, 1.05, 1.8]) part(u.body, boxGeo(0.7, 0.42, 0.55), bag, x, 0.45, 1.6);
  for (const z of [0.2, 0.9]) for (const x of [-2.0, 2.0]) part(u.body, boxGeo(0.55, 0.42, 0.7), bag, x, 0.45, z);
  part(u.body, boxGeo(0.12, 3.4, 0.12), M(0xbdbdbd), 1.8, 1.9, -1.8); // flag pole
  part(u.body, boxGeo(0.05, 0.7, 1.1), M(level >= 4 ? 0xffc400 : bottom ? 0xc62828 : 0x1e88e5), 1.8, 3.25, -1.2);
  const look = bottom ? 'bscout' : ['bscout', 'bscout', 'bscout2', 'bscout3', 'bspec', 'bspec'][level];
  const guard = makeUnit(look);
  guard.root.scale.setScalar(0.75);
  guard.root.position.set(-1.0, 0.25, 1.0);
  u.body.add(guard.root);
  u.mats.push(...guard.mats);
  if (!bottom) {
    if (level >= 1) part(u.body, boxGeo(0.8, 0.6, 0.6), M(0x5d6b3a), 1.3, 0.55, 0.6); // ammo crate
    if (level >= 3) {
      part(u.body, boxGeo(0.1, 3.0, 0.1), M(0x424242), -1.9, 1.7, -1.9); // radio mast
      part(u.body, boxGeo(0.3, 0.3, 0.3), glow(u, 0xff1744), -1.9, 3.3, -1.9);
    }
    if (level >= 5) {
      part(u.body, boxGeo(1.6, 1.4, 0.4), M(0x37474f), 0.4, 0.95, -2.2); // rail charging rack
      for (const x of [-0.1, 0.4, 0.9]) part(u.body, boxGeo(0.12, 1.0, 0.1), glow(u, 0x00e5ff), x, 1.0, -1.98);
    }
  } else {
    if (level >= 1) {
      // Troop Training: a straw training dummy (gold-topped with Veteran Training)
      part(u.body, boxGeo(0.12, 1.4, 0.12), M(0x5d4037), 1.4, 0.95, 0.6);
      part(u.body, boxGeo(0.6, 0.7, 0.4), M(0xd7b46a), 1.4, 1.4, 0.6);
      part(u.body, boxGeo(0.4, 0.4, 0.4), M(level >= 2 ? 0xffc400 : 0xd7b46a), 1.4, 2.0, 0.6);
    }
    if (level >= 3) part(u.body, boxGeo(1.0, 0.5, 0.6), M(0x4b5320), -1.5, 0.5, -1.9); // rocket crate
    if (level >= 4) for (const x of [-0.3, 0.2]) part(u.body, boxGeo(0.12, 1.5, 0.9), M(0x90a4ae), x, 0.95, -2.1); // riot shields
    if (level >= 5) for (const x of [1.0, 1.55]) part(u.body, boxGeo(0.5, 0.9, 0.5), M(0xc62828), x, 0.7, -1.7); // fuel barrels
  }
  return u;
}
export const makeFieldBarracks = (level) => makeFieldBarracksWith(level, false);
export const makeFieldBarracksBottom = (level) => makeFieldBarracksWith(level, true);

/** Zed: a hangar with its vehicle (M1, then mechs) standing guard. */
export function makeZed(level) {
  const u = makeThing();
  const { M } = u;
  part(u.body, boxGeo(4.2, 0.3, 4.2), M(0x616161), 0, 0.15, 0);
  for (const x of [-1.95, 1.95]) part(u.body, boxGeo(0.3, 3.6, 3.6), M(0x455a64), x, 1.8, -0.2);
  part(u.body, boxGeo(4.2, 0.4, 3.6), M(0x37474f), 0, 3.7, -0.2);
  part(u.body, boxGeo(3.0, 0.3, 0.1), glow(u, 0xffc400), 0, 3.5, 1.6);
  if (level >= 1) {
    // Spiked Tracks: spiked rails along the hangar floor
    const spikeM = M(0xbdbdbd);
    for (const x of [-1.5, 1.5]) {
      part(u.body, boxGeo(0.3, 0.3, 3.4), M(0x424242), x, 0.45, 0.1);
      for (const z of [-1.2, -0.4, 0.4, 1.2]) part(u.body, boxGeo(0.3, 0.8, 0.3), spikeM, x, 1.0, z);
    }
  }
  if (level >= 2) {
    // Arm Cannon: a cannon turret mounted on the hangar roof
    part(u.body, boxGeo(1.4, 0.8, 1.4), M(0x546e7a), 0, 4.3, -0.4);
    part(u.body, boxGeo(0.4, 0.4, 2.2), M(0x263238), 0, 4.4, 0.9);
    part(u.body, boxGeo(0.5, 0.5, 0.15), glow(u, 0xff6d00), 0, 4.4, 2.0);
  }
  const v = makeUnit(['m1', 'm1', 'm1', 'm2', 'm11'][level]);
  v.root.scale.setScalar(level >= 4 ? 0.42 : level >= 3 ? 0.5 : 0.6);
  v.root.position.set(0, 0.3, 0.2);
  u.body.add(v.root);
  u.mats.push(...v.mats);
  return u;
}

/** Farm: crop rows and a barn; more crops, a silo, an orchard, then glowing fruit. */
export function makeFarm(level) {
  const u = makeThing();
  const { M } = u;
  part(u.body, boxGeo(4.2, 0.3, 4.2), M(0x6d4c41), 0, 0.15, 0); // soil
  const barnM = M(0xc62828);
  part(u.body, boxGeo(2.2, 2.0, 1.8), barnM, -0.9, 1.3, -1.1);
  const roof = M(0x4e342e);
  const r1 = part(u.body, boxGeo(1.4, 0.2, 2.0), roof, -1.45, 2.6, -1.1);
  r1.rotation.z = 0.6;
  const r2 = part(u.body, boxGeo(1.4, 0.2, 2.0), roof, -0.35, 2.6, -1.1);
  r2.rotation.z = -0.6;
  part(u.body, boxGeo(0.9, 1.2, 0.1), M(0xfafafa), -0.9, 0.9, -0.18);
  const crop = M(level >= 4 ? 0xffeb3b : level >= 2 ? 0x8bc34a : 0x689f38);
  const rows = Math.min(4, 2 + level);
  for (let i = 0; i < rows; i++) for (let j = 0; j < 3; j++) part(u.body, boxGeo(0.45, 0.6 + level * 0.1, 0.45), crop, -1.6 + j * 0.8, 0.6, 0.3 + i * 0.5);
  if (level >= 2) {
    // Plantation: a silo
    part(u.body, boxGeo(1.1, 3.6, 1.1), M(0xb0bec5), 1.4, 2.1, -1.3);
    part(u.body, boxGeo(1.2, 0.5, 1.2), M(0x78909c), 1.4, 4.1, -1.3);
  }
  if (level >= 3) {
    // Orchard: little fruit trees
    for (const z of [0.4, 1.5]) {
      part(u.body, boxGeo(0.25, 1.0, 0.25), M(0x5d4037), 1.5, 0.8, z);
      part(u.body, boxGeo(0.9, 0.9, 0.9), M(0x388e3c), 1.5, 1.7, z);
      part(u.body, boxGeo(0.2, 0.2, 0.2), level >= 4 ? glow(u, 0x00e5ff) : M(0xff5252), 1.5, 1.6, z + 0.5);
    }
  }
  return u;
}

/** Commander: officer with a cap and pistol. Medals at Lv 2, megaphone at Lv 3, radio at Lv 4, gold at Lv 5. */
export function makeCommander(level) {
  const gold = level >= 4;
  const coat = gold ? 0xfafafa : 0x33691e; // Airstrike: white dress uniform
  const h = makeHumanoid({ skin: 0xc68642, shirt: coat, pants: gold ? 0x1a237e : 0x263238, arms: coat, face: 'soldier' });
  const { M } = h;
  h.body.scale.setScalar(1.05);
  if (level >= 1) part(h.torso, boxGeo(2.05, 1.6, 0.2), M(gold ? 0xeeeeee : 0x2e5e18), 0, -1.6, -0.45); // Drilling: long coat tails
  // Peaked officer cap
  part(h.head, boxGeo(1.4, 0.45, 1.4), M(0x1b5e20), 0, 1.4, 0);
  part(h.head, boxGeo(1.4, 0.1, 0.5), M(0x111111), 0, 1.15, 0.7);
  part(h.head, boxGeo(0.4, 0.3, 0.06), gold ? glow(h, 0xffd54f) : M(0xffd54f), 0, 1.45, 0.72);
  part(h.torso, boxGeo(0.5, 0.15, 1.1), M(0xffd54f), -0.75, 0.95, 0); // epaulettes
  part(h.torso, boxGeo(0.5, 0.15, 1.1), M(0xffd54f), 0.75, 0.95, 0);
  if (level >= 1) for (const x of [0.4, 0.7]) part(h.torso, boxGeo(0.2, 0.3, 0.06), M(x > 0.5 ? 0xe53935 : 0x1e88e5), x, 0.4, 0.52);
  if (level >= 2) {
    // Call to Arms: megaphone held in the left hand
    const mega = new THREE.Group();
    mega.position.set(0, -1.9, 0);
    h.leftArm.add(mega);
    part(mega, boxGeo(0.5, 0.9, 0.5), M(0xfafafa), 0, -0.3, 0);
    part(mega, boxGeo(0.9, 0.3, 0.9), M(0xe53935), 0, -0.85, 0);
  }
  if (level >= 3) {
    // Organized Militia: radio pack with an antenna
    part(h.torso, boxGeo(1.3, 1.5, 0.6), M(0x4b5320), 0, 0, -0.85);
    part(h.torso, boxGeo(0.08, 2.0, 0.08), M(0x212121), 0.45, 1.6, -0.95);
  }
  if (gold) part(h.torso, boxGeo(2.1, 0.25, 1.1), M(0xffd54f), 0, -0.85, 0); // golden belt
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  h.rightArm.add(gun);
  part(gun, boxGeo(0.3, 0.7, 0.35), M(gold ? 0xffd54f : 0x212121), 0, -0.3, 0);
  setMuzzle(h, gun, 0, -0.7, 0);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
  h.leftArm.rotation.set(level >= 2 ? -2.4 : -0.2, 0, -0.1);
  h.pose = { right: -Math.PI / 2, left: level >= 2 ? -2.4 : -0.2, leftRecoil: 0 };
  h.tracer = gold ? 0xffd54f : 0xffe066;
  return h;
}

/**
 * Gold Commander: a general in golden plate armour with a red cape, a crowned helmet with a white
 * plume and a giant golden broadsword sheathed on his back. Lv 1 a bag of gold coins and a small
 * golden pickaxe on his belt; Lv 2 the broadsword comes out in his right hand during Call to Battle
 * (`goldSword`, shown by the view); Lv 3 a holo-radio on his left wrist; Lv 4 golden wings, a halo
 * and the sword is always out, bigger and glowing.
 */
export function makeGoldCommander(level) {
  const h = makeHumanoid({ skin: 0xc68642, shirt: 0xd4a017, pants: 0x8d6e00, arms: 0xd4a017, face: 'soldier' });
  const { M } = h;
  const gold = M(0xffc107);
  const pale = M(0xffe082);
  const red = M(0xb71c1c);
  h.body.scale.setScalar(1.12);
  // Armour plates
  part(h.torso, boxGeo(2.15, 1.2, 1.15), gold, 0, 0.35, 0); // breastplate
  part(h.torso, boxGeo(0.3, 0.3, 0.08), glow(h, 0xff1744), 0, 0.45, 0.6); // ruby on the chest
  for (const x of [-1, 1]) part(h.torso, boxGeo(0.8, 0.35, 1.3), pale, x * 0.95, 0.95, 0); // pauldrons
  part(h.torso, boxGeo(2.1, 0.25, 1.1), M(0x5d4037), 0, -0.85, 0); // belt
  part(h.torso, boxGeo(0.45, 0.35, 0.1), gold, 0, -0.85, 0.56); // buckle
  // Cape
  part(h.torso, boxGeo(2.0, 3.0, 0.15), red, 0, -0.6, -0.62);
  // Crowned helmet with a plume
  part(h.head, boxGeo(1.35, 0.6, 1.35), gold, 0, 1.2, 0);
  for (const [x, z] of [[-0.5, 0.5], [0, 0.55], [0.5, 0.5], [-0.55, 0], [0.55, 0]]) part(h.head, boxGeo(0.2, 0.35, 0.2), gold, x, 1.65, z);
  part(h.head, boxGeo(0.25, 0.9, 1.1), M(0xfafafa), 0, 1.9, -0.2); // plume
  // The giant broadsword on his back (sheathed)
  const back = new THREE.Group();
  back.position.set(0, 0, -0.75);
  back.rotation.z = 0.5;
  h.torso.add(back);
  part(back, boxGeo(0.5, 4.2, 0.14), pale, 0, 0.2, 0);
  part(back, boxGeo(1.3, 0.25, 0.3), gold, 0, 2.35, 0);
  part(back, boxGeo(0.25, 0.8, 0.25), M(0x5d4037), 0, 2.85, 0);
  if (level >= 1) {
    // Gold Digging: a coin bag and a pickaxe on his belt
    part(h.torso, boxGeo(0.6, 0.6, 0.5), M(0x8d6e63), 0.85, -1.2, 0.35);
    part(h.torso, boxGeo(0.25, 0.12, 0.25), gold, 0.85, -0.85, 0.35);
    part(h.torso, boxGeo(0.12, 1.0, 0.12), M(0x6d4c41), -0.85, -1.3, 0.55);
    part(h.torso, boxGeo(0.8, 0.15, 0.15), gold, -0.85, -0.85, 0.55);
  }
  if (level >= 3) {
    // Holo-radio on his left wrist (calls in the cyber tank)
    part(h.leftArm, boxGeo(1.1, 0.4, 1.1), M(0x263238), 0, -1.6, 0);
    part(h.leftArm, boxGeo(0.7, 0.08, 0.7), glow(h, 0x00e5ff), 0, -1.38, 0);
  }
  // Call to Battle: the giant golden broadsword in his right hand (hidden until he pulls it out).
  const big = level >= 4;
  const sword = new THREE.Group();
  sword.position.set(0, -1.9, 0);
  h.rightArm.add(sword);
  const blade = big ? glow(h, 0xffe57f) : pale;
  part(sword, boxGeo(0.35, 0.8, 0.35), M(0x5d4037), 0, -0.1, 0); // grip
  part(sword, boxGeo(1.6, 0.3, 0.4), gold, 0, -0.55, 0); // crossguard
  part(sword, boxGeo(0.25, 0.25, 0.25), glow(h, 0xff1744), 0, -0.55, 0.22);
  part(sword, boxGeo(0.75, big ? 6.5 : 5, 0.18), blade, 0, big ? -3.95 : -3.2, 0);
  part(sword, boxGeo(0.12, big ? 6.2 : 4.7, 0.2), gold, 0, big ? -3.95 : -3.2, 0); // fuller
  sword.visible = big;
  if (level >= 2) h.goldSword = sword;
  else h.rightArm.remove(sword);
  back.visible = !big;
  if (big) {
    // Give them hell!: golden wings and a halo
    const wing = glow(h, 0xffd54f);
    for (const x of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const f = part(h.torso, boxGeo(0.25, 2.4 - i * 0.5, 0.6), wing, x * (1.1 + i * 0.55), 1.0 + i * 0.25, -0.9);
        f.rotation.z = x * (0.7 + i * 0.25);
      }
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      part(h.head, boxGeo(0.35, 0.1, 0.12), glow(h, 0xfff59d), Math.cos(a) * 0.9, 2.6, Math.sin(a) * 0.9).rotation.y = -a + Math.PI / 2;
    }
  }
  // A raised fist when the sword is away; the sword arm swings down when he attacks.
  h.rightArm.rotation.set(big ? -2.2 : -0.4, 0, 0.1);
  h.leftArm.rotation.set(-0.3, 0, -0.1);
  h.pose = { right: big ? -2.2 : -0.4, left: -0.3, leftRecoil: 0 };
  h.swing = level >= 2 ? 1.6 : 0;
  h.swordRest = -0.4; // arm pose with the sword put away
  h.swordUp = -2.2; // arm pose with the sword out
  setMuzzle(h, h.rightArm, 0, -2, 0);
  h.tracer = 0xffd54f;
  return h;
}

const STAR_GEO = new THREE.OctahedronGeometry(0.22, 0);
const MIST_GEO = new THREE.IcosahedronGeometry(1, 1);
const tint = new THREE.Color();
const hsl2 = { h: 0, s: 0, l: 0 };
/**
 * Golden perk looks (goldtowers.js `goldFx`): recolours the model at levels listed in `fx.tints`
 * (ruby, diamond...; two colours alternate between parts), then adds a golden mist around its
 * feet and star particles floating around it (`m.goldFx`, animated by the view).
 */
export function goldShine(m, fx, level) {
  const colors = fx.tints?.[level];
  if (colors) {
    let i = 0;
    for (const mat of m.mats) {
      if (mat.map || !mat.color) continue;
      if (mat.userData.glow && mat.userData.glow !== GOLD_SHEEN) continue; // its own glowing parts stay
      tint.setHex(colors[i++ % colors.length]).getHSL(hsl2);
      mat.color.getHSL(hsl);
      mat.color.setHSL(hsl2.h, Math.max(0.65, hsl2.s * 0.95), 0.2 + hsl.l * 0.55);
      const sheen = tint.multiplyScalar(0.16).getHex();
      mat.userData.glow = sheen;
      mat.emissive?.setHex(sheen);
    }
  }
  m.root.updateMatrixWorld(true);
  const top = Math.min(10, Math.max(3, new THREE.Box3().setFromObject(m.root).max.y)); // (Orbit: not up to its satellite)
  const fxg = new THREE.Group();
  const mistColor = colors ? colors[0] : 0xffe082;
  const mistMat = new THREE.MeshBasicMaterial({ color: mistColor, transparent: true, opacity: 0.16, depthWrite: false });
  mistMat.userData.keepOpacity = 0.16;
  mistMat.userData.glow = mistColor;
  m.mats.push(mistMat);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const puff = new THREE.Mesh(MIST_GEO, mistMat);
    puff.scale.set(1.3, 0.45, 1.3);
    puff.position.set(Math.cos(a) * 1.6, 0.5, Math.sin(a) * 1.6);
    puff.castShadow = false;
    fxg.add(puff);
  }
  const starMats = [0xfff59d, 0xffffff, colors ? colors[colors.length - 1] : 0xffd740].map((c) => {
    const sm = new THREE.MeshBasicMaterial({ color: c });
    sm.userData.glow = c;
    m.mats.push(sm);
    return sm;
  });
  const stars = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3;
    const st = new THREE.Mesh(STAR_GEO, starMats[i % 3]);
    const r = 1.8 + ((i * 0.37) % 0.6);
    st.userData.y = 1 + ((i * 0.618) % 1) * (top - 0.5);
    st.userData.p = i * 1.7;
    st.position.set(Math.cos(a) * r, st.userData.y, Math.sin(a) * r);
    st.scale.set(1, 1.8, 1);
    st.castShadow = false;
    stars.push(st);
    fxg.add(st);
  }
  fxg.userData.stars = stars;
  m.root.add(fxg);
  m.goldFx = fxg;
  return m;
}

/** Classic Commander: a field officer in a beret. Binoculars from Lv 2, megaphone from Lv 3, medals at Lv 4, radio at Lv 5. */
export function makeCommanderClassic(level) {
  const coat = 0x7a6a45;
  const h = makeHumanoid({ skin: 0x8d5524, shirt: coat, pants: 0x4b4129, arms: coat, face: 'soldier' });
  const { M } = h;
  h.body.scale.setScalar(1.05);
  // Beret with a gold badge
  part(h.head, boxGeo(1.45, 0.35, 1.45), M(0x8e0000), 0, 1.3, -0.05);
  part(h.head, boxGeo(0.7, 0.3, 0.7), M(0x8e0000), -0.35, 1.45, 0);
  part(h.head, boxGeo(0.3, 0.3, 0.06), M(0xffd54f), 0.3, 1.3, 0.7);
  part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.85, 0); // belt
  if (level >= 1) {
    // Leadership: binoculars around the neck
    part(h.torso, boxGeo(0.7, 0.35, 0.3), M(0x212121), 0, 0.6, 0.62);
  }
  if (level >= 2) {
    // Call to Arms: megaphone held in the left hand
    const mega = new THREE.Group();
    mega.position.set(0, -1.9, 0);
    h.leftArm.add(mega);
    part(mega, boxGeo(0.5, 0.9, 0.5), M(0xfdd835), 0, -0.3, 0);
    part(mega, boxGeo(0.9, 0.3, 0.9), M(0x212121), 0, -0.85, 0);
  }
  if (level >= 3) for (const [x, c] of [[0.35, 0xe53935], [0.6, 0x43a047], [0.85, 0xfdd835]]) part(h.torso, boxGeo(0.2, 0.3, 0.06), M(c), x, 0.35, 0.52); // medals
  if (level >= 4) {
    // Strength in Numbers: radio pack to call the caravan
    part(h.torso, boxGeo(1.3, 1.5, 0.6), M(0x4b5320), 0, 0, -0.85);
    part(h.torso, boxGeo(0.08, 2.0, 0.08), M(0x212121), -0.45, 1.6, -0.95);
    part(h.torso, boxGeo(0.2, 0.2, 0.2), glow(h, 0xff1744), -0.45, 2.6, -0.95);
  }
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  h.rightArm.add(gun);
  part(gun, boxGeo(0.3, 0.7, 0.35), M(0x212121), 0, -0.3, 0);
  setMuzzle(h, gun, 0, -0.7, 0);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
  h.leftArm.rotation.set(level >= 2 ? -2.4 : -0.2, 0, -0.1);
  h.pose = { right: -Math.PI / 2, left: level >= 2 ? -2.4 : -0.2, leftRecoil: 0 };
  h.tracer = 0xffe066;
  return h;
}

/** Six-shooter in the hand of `arm`. Returns the gun group (it twirls around x after a cash shot). */
export function addRevolver(h, arm, gold) {
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  arm.add(gun);
  const metal = h.M(gold ? 0xffc107 : 0x5d5d5d);
  part(gun, boxGeo(0.16, 1.1, 0.16), metal, 0, -0.6, 0.05); // barrel
  part(gun, boxGeo(0.34, 0.4, 0.34), metal, 0, -0.15, 0.05); // cylinder
  part(gun, boxGeo(0.24, 0.32, 0.55), h.M(gold ? 0xfff8e1 : 0x6d4c41), 0, 0.05, -0.3); // wooden (or ivory) grip
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -1.15, 0.05);
  gun.add(muzzle);
  gun.userData.muzzle = muzzle;
  return gun;
}

/**
 * Cowboy: hat, neckerchief and a revolver. Lv 2 a lucky horseshoe on the belt, Lv 3 a long duster
 * and a gold star, Lv 4 a second revolver and a bandolier, Lv 5 dressed all in black as an outlaw
 * with a red mask and gold six-shooters.
 */
export function makeCowboy(level) {
  const outlaw = level >= 5;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: outlaw ? 0x212121 : 0xc0703a, pants: outlaw ? 0x263238 : 0x3f6aa8, arms: outlaw ? 0x212121 : 0xc0703a });
  const { M } = h;
  // Cowboy hat: wide brim, tall crown and a band.
  const hat = M(outlaw ? 0x111111 : 0x8d5a2b);
  part(h.head, boxGeo(2.2, 0.12, 2.0), hat, 0, 1.25, 0);
  part(h.head, boxGeo(1.25, 0.65, 1.15), hat, 0, 1.6, 0);
  part(h.head, boxGeo(1.28, 0.16, 1.18), M(outlaw ? 0xc62828 : 0x3e2723), 0, 1.35, 0);
  // Boots and belt.
  for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.05, 0.7, 1.15), M(0x4e342e), 0, -1.7, 0.05);
  part(h.torso, boxGeo(2.05, 0.3, 1.05), M(0x3e2723), 0, -0.85, 0);
  part(h.torso, boxGeo(0.45, 0.35, 0.1), M(0xffd54f), 0, -0.85, 0.53); // buckle
  // Neckerchief (a mask over the face when outlawed).
  const red = M(0xd32f2f);
  if (outlaw) part(h.head, boxGeo(1.24, 0.5, 1.24), red, 0, 0.3, 0.01);
  else if (level >= 1) part(h.torso, boxGeo(1.1, 0.4, 0.15), red, 0, 0.85, 0.55);
  if (level >= 2) {
    // Lucky Shot: a horseshoe hanging from the belt
    const shoe = M(0xb0bec5);
    part(h.torso, boxGeo(0.12, 0.45, 0.08), shoe, 0.55, -1.15, 0.55);
    part(h.torso, boxGeo(0.12, 0.45, 0.08), shoe, 0.85, -1.15, 0.55);
    part(h.torso, boxGeo(0.42, 0.12, 0.08), shoe, 0.7, -1.35, 0.55);
  }
  if (level >= 3) {
    // Deadly Precision: a long duster and a gold star
    const coat = M(outlaw ? 0x1b1b1b : 0x795548);
    part(h.torso, boxGeo(2.15, 2.6, 0.2), coat, 0, -0.35, -0.6);
    for (const x of [-0.95, 0.95]) part(h.torso, boxGeo(0.25, 2.6, 1.1), coat, x, -0.35, 0);
    part(h.torso, boxGeo(0.3, 0.3, 0.06), glow(h, 0xffd54f), -0.55, 0.45, 0.53);
  }
  if (level >= 4) {
    // Double Tap: a bandolier across the chest
    const band = part(h.torso, boxGeo(0.3, 2.6, 1.08), M(0x5d4037), 0, 0, 0);
    band.rotation.z = 0.7;
    for (let i = -2; i <= 2; i++) part(band, boxGeo(0.34, 0.14, 0.1), M(0xffc107), 0, i * 0.4, 0.55);
  }
  const guns = [addRevolver(h, h.rightArm, outlaw)];
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
  if (level >= 4) {
    guns.push(addRevolver(h, h.leftArm, outlaw));
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.05);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
  } else {
    h.leftArm.rotation.set(-0.15, 0, -0.15); // thumb in the belt
    h.pose = { right: -Math.PI / 2, left: -0.15, leftRecoil: 0 };
  }
  h.muzzles = guns.map((g) => g.userData.muzzle);
  h.twirl = guns;
  h.tracer = outlaw ? 0xffc107 : 0xffe066;
  return h;
}

/** DJ: behind a turntable booth with speakers that grow each level. Neon party lights at Lv 5. */
export function makeDJ(level) {
  const rave = level >= 4;
  const h = makeHumanoid({ skin: 0x8d5524, shirt: rave ? 0x6a1b9a : 0xfafafa, pants: 0x212121, arms: 0x8d5524, face: 'smile' });
  const { M } = h;
  // Headphones and cap
  part(h.head, boxGeo(1.35, 0.15, 0.25), M(0x212121), 0, 1.38, 0);
  for (const x of [-0.7, 0.7]) part(h.head, boxGeo(0.25, 0.6, 0.6), M(rave ? 0xe040fb : 0x1e88e5), x, 0.6, 0);
  part(h.head, boxGeo(1.3, 0.3, 1.3), M(0xffeb3b), 0, 1.2, 0);
  // Booth in front with two turntables
  const booth = M(0x263238);
  part(h.root, boxGeo(3.6, 2.4, 1.2), booth, 0, 1.2, 1.6);
  for (const x of [-0.9, 0.9]) {
    part(h.root, boxGeo(1.1, 0.12, 1.0), M(0x111111), x, 2.46, 1.6);
    part(h.root, boxGeo(0.3, 0.14, 0.3), M(0xe53935), x, 2.52, 1.6);
  }
  part(h.root, boxGeo(3.4, 0.3, 0.06), glow(h, rave ? 0xe040fb : 0x00e5ff), 0, 1.6, 2.22);
  // Speakers on both sides
  const sp = [1.3, 1.7, 2.1, 2.5, 2.9][level];
  if (level >= 2) {
    // Thrifty: a glowing "$" sale sign on the booth
    part(h.root, boxGeo(1.2, 0.9, 0.1), M(0x1b5e20), 0, 3.0, 2.0);
    part(h.root, boxGeo(0.18, 0.7, 0.06), glow(h, 0xffd54f), 0, 3.0, 2.07);
    part(h.root, boxGeo(0.6, 0.14, 0.06), glow(h, 0xffd54f), 0, 3.15, 2.08);
    part(h.root, boxGeo(0.6, 0.14, 0.06), glow(h, 0xffd54f), 0, 2.85, 2.08);
  }
  for (const x of [-1, 1]) {
    part(h.root, boxGeo(1.1, sp, 1.0), M(0x111111), x * 2.4, sp / 2, 0.6);
    part(h.root, boxGeo(0.7, 0.7, 0.06), M(0x424242), x * 2.4, sp * 0.65, 1.12);
    if (level >= 2) part(h.root, boxGeo(0.4, 0.4, 0.06), glow(h, 0xffd54f), x * 2.4, sp * 0.25, 1.12); // Thrifty: gold tweeter
  }
  if (rave) for (const x of [-1.2, 0, 1.2]) part(h.root, boxGeo(0.35, 0.35, 0.35), glow(h, [0xff1744, 0x76ff03, 0x2979ff][x / 1.2 + 1]), x, 6.4, 0.6);
  h.rightArm.rotation.set(-1.3, 0, 0.2);
  h.leftArm.rotation.set(-1.3, 0, -0.2);
  h.pose = { right: -1.3, left: -1.3, leftRecoil: 0 };
  h.bob = 0.18; // grooving to the music
  h.muzzles = [];
  return h;
}

/**
 * DJ Booth (alternate DJ form): a DJ behind a wide booth and speaker stacks. The glowing strips
 * (h.trackMats) take the color of the track playing. Lv 2 a laptop, Lv 3 party lights, Lv 4 a
 * gold "$" sign, Lv 5 a visualizer screen, Lv 6 three laser poles (one per track).
 */
export function makeDJBooth(level) {
  const h = makeHumanoid({ skin: 0xc68642, shirt: level >= 5 ? 0x311b92 : 0x212121, pants: 0x37474f, arms: 0xc68642, face: 'smile' });
  const { M } = h;
  const track = (color = 0xb388ff) => {
    const m = glow(h, color);
    (h.trackMats ||= []).push(m);
    return m;
  };
  // Big headphones and a backwards cap with the purple shard emblem.
  part(h.head, boxGeo(1.35, 0.15, 0.25), M(0x212121), 0, 1.38, 0);
  for (const x of [-0.7, 0.7]) part(h.head, boxGeo(0.25, 0.65, 0.65), track(), x, 0.6, 0);
  part(h.head, boxGeo(1.3, 0.3, 1.3), M(0x7e57c2), 0, 1.2, 0);
  part(h.head, boxGeo(0.4, 0.3, 0.7), M(0x7e57c2), 0, 1.15, -0.9);
  part(h.head, boxGeo(0.3, 0.2, 0.05), glow(h, 0xb388ff), 0, 1.25, 0.66);
  // The booth: wide, with a mixer between two turntables.
  part(h.root, boxGeo(5.2, 2.4, 1.4), M(0x1c1c24), 0, 1.2, 1.7);
  part(h.root, boxGeo(5.0, 0.25, 0.06), track(), 0, 1.7, 2.42);
  part(h.root, boxGeo(5.0, 0.25, 0.06), track(), 0, 0.6, 2.42);
  for (const x of [-1.6, 1.6]) {
    part(h.root, boxGeo(1.2, 0.12, 1.1), M(0x111111), x, 2.46, 1.7);
    part(h.root, boxGeo(0.35, 0.14, 0.35), track(), x, 2.53, 1.7);
  }
  part(h.root, boxGeo(1.0, 0.18, 0.9), M(0x424242), 0, 2.5, 1.7);
  if (level >= 1) {
    // Laptop Studio: an open laptop on the mixer
    part(h.root, boxGeo(1.0, 0.06, 0.7), M(0xb0bec5), 0, 2.62, 1.6);
    const lid = part(h.root, boxGeo(1.0, 0.7, 0.05), M(0xb0bec5), 0, 2.95, 1.25);
    lid.rotation.x = -0.25;
    part(lid, boxGeo(0.85, 0.55, 0.02), track(), 0, 0, 0.03);
  }
  // Speaker stacks on both sides, taller every level.
  const sp = [1.5, 2.0, 2.4, 2.8, 3.2, 3.6][level];
  for (const x of [-1, 1]) {
    part(h.root, boxGeo(1.3, sp, 1.2), M(0x111111), x * 3.3, sp / 2, 0.9);
    part(h.root, boxGeo(0.8, 0.8, 0.06), M(0x424242), x * 3.3, sp * 0.68, 1.52);
    part(h.root, boxGeo(0.45, 0.45, 0.07), track(), x * 3.3, sp * 0.25, 1.52);
  }
  if (level >= 2) {
    // Party Mode: a truss with party lights over the booth
    const truss = M(0x9e9e9e);
    for (const x of [-2.6, 2.6]) part(h.root, boxGeo(0.2, 6, 0.2), truss, x, 3, 2.2);
    part(h.root, boxGeo(5.4, 0.2, 0.2), truss, 0, 6, 2.2);
    [0xb388ff, 0x69f0ae, 0xff5252].forEach((c, i) => part(h.root, boxGeo(0.4, 0.4, 0.4), glow(h, c), (i - 1) * 1.6, 5.7, 2.2));
  }
  if (level >= 3) {
    // Thrifty Music: a gold "$" sign on the front
    part(h.root, boxGeo(0.18, 0.75, 0.06), glow(h, 0xffd54f), 0, 1.15, 2.45);
    for (const y of [0.9, 1.15, 1.4]) part(h.root, boxGeo(0.55, 0.12, 0.06), glow(h, 0xffd54f), 0, y, 2.46);
  }
  if (level >= 4) {
    // Audio Visualizer: a screen behind the DJ with bouncing bars
    part(h.root, boxGeo(4.4, 2.4, 0.2), M(0x111111), 0, 6.4, -1.4);
    for (let i = 0; i < 7; i++) {
      const bh = [0.6, 1.2, 1.8, 1.0, 1.6, 0.8, 1.3][i];
      part(h.root, boxGeo(0.4, bh, 0.06), track(), (i - 3) * 0.55, 5.4 + bh / 2, -1.28);
    }
  }
  if (level >= 5) {
    // Apocalypse Rave: a laser pole for every track
    [0xb388ff, 0x69f0ae, 0xff5252].forEach((c, i) => {
      const x = (i - 1) * 2.2;
      part(h.root, boxGeo(0.25, 8.5, 0.25), glow(h, c), x, 4.25, -2.4);
      part(h.root, boxGeo(0.6, 0.6, 0.6), glow(h, c), x, 8.8, -2.4);
    });
  }
  h.rightArm.rotation.set(-1.3, 0, 0.2);
  h.leftArm.rotation.set(-1.3, 0, -0.2);
  h.pose = { right: -1.3, left: -1.3, leftRecoil: 0 };
  h.bob = 0.2;
  h.muzzles = [];
  return h;
}

/**
 * Anarchist (Versus): hoodie, red bandana and a compact SMG. Lv 3 adds smoke grenades on the belt,
 * Lv 4 a little robot buddy on its shoulder, Lv 5 a red jacket with a rack of fireworks on its back.
 */
export function makeAnarchist(level) {
  const jacket = level >= 4 ? 0xb71c1c : 0x212121;
  const h = makeHumanoid({ skin: 0xd9a066, shirt: jacket, pants: 0x263238, arms: jacket, face: 'soldier' });
  const { M } = h;
  const dark = M(0x1a1a1a);
  const red = M(0xd32f2f);
  part(h.head, boxGeo(1.3, 0.5, 1.3), M(0x37474f), 0, 1.25, 0); // beanie
  part(h.head, boxGeo(1.28, 0.5, 0.1), red, 0, 0.3, 0.62); // bandana over the mouth
  part(h.head, boxGeo(0.5, 0.35, 0.1), red, 0, 0.0, 0.6);
  part(h.torso, boxGeo(1.7, 0.6, 0.6), M(level >= 4 ? 0x8e0000 : 0x2b2b2b), 0, 1.0, -0.7); // hood
  // Anarchy "A" patch on the chest.
  part(h.torso, boxGeo(0.6, 0.6, 0.06), red, 0.45, 0.3, 0.53);
  if (level >= 1) {
    // Attrition: a red armband and a spray can on the belt.
    part(h.leftArm, boxGeo(1.05, 0.35, 1.05), red, 0, -0.6, 0);
    part(h.torso, boxGeo(0.28, 0.55, 0.28), M(0x76ff03), -0.85, -0.7, 0.45);
    part(h.torso, boxGeo(0.18, 0.12, 0.18), dark, -0.85, -0.38, 0.45);
    if (level < 4) part(h.torso, boxGeo(1.4, 1.5, 0.6), M(0x37474f), 0, -0.1, -0.85); // backpack of android parts
  }
  if (level >= 2) {
    // Smoke grenades on the belt.
    for (const x of [-0.6, -0.15, 0.3]) part(h.torso, boxGeo(0.3, 0.45, 0.3), M(0x9e9e9e), x, -0.85, 0.6);
    // ...a strap of smoke bombs across the chest, and a gas mask
    part(h.torso, boxGeo(0.35, 2.6, 1.14), M(0x5d4037), 0, 0, 0).rotation.z = -0.7;
    for (const t of [-0.5, 0, 0.5]) part(h.torso, boxGeo(0.35, 0.35, 0.3), M(0x9e9e9e), -t * 0.75, t * -0.8, 0.65);
    part(h.head, boxGeo(1.32, 0.8, 0.2), M(0x424242), 0, 0.5, 0.62);
    for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.35, 0.3, 0.08), M(0xffa000), x, 0.7, 0.74);
    part(h.head, boxGeo(0.5, 0.5, 0.45), M(0x212121), 0, 0.25, 0.85);
  }
  if (level >= 3) {
    // Robot buddy on the left shoulder.
    const bot = new THREE.Group();
    bot.position.set(1.5, 1.4, 0);
    h.torso.add(bot);
    bot.scale.setScalar(1.4);
    part(bot, boxGeo(0.7, 0.7, 0.7), M(0xb0bec5), 0, 0, 0);
    part(bot, boxGeo(0.5, 0.15, 0.08), glow(h, 0x00e5ff), 0, 0.08, 0.36);
    part(bot, boxGeo(0.08, 0.4, 0.08), dark, 0, 0.55, 0);
  }
  if (level >= 4) {
    // Fireworks rack on the back.
    part(h.torso, boxGeo(1.6, 1.4, 0.4), dark, 0, 0.2, -0.75);
    const colors = [0xffeb3b, 0x00e5ff, 0xff4081, 0x76ff03];
    for (let i = 0; i < 4; i++) {
      part(h.torso, boxGeo(0.28, 1.2, 0.28), M(0xeeeeee), -0.55 + i * 0.37, 1.3, -0.8);
      part(h.torso, boxGeo(0.3, 0.3, 0.3), glow(h, colors[i]), -0.55 + i * 0.37, 2.0, -0.8);
    }
  }
  const gun = holdLongGun(h, 1.1, dark);
  part(gun, boxGeo(0.22, 0.5, 0.3), dark, 0, -0.4, -0.35); // mag
  if (level >= 4) part(gun, boxGeo(0.36, 0.25, 0.46), red, 0, -0.9, 0); // red-taped barrel
  h.tracer = level >= 4 ? 0xff5252 : 0xffd54f;
  return h;
}

/**
 * Classic Soldier (alternate Soldier form): a rifleman in a beret. Lv 2 adds webbing, Lv 3 a
 * helmet and goggles, Lv 4 a tactical vest, Lv 5 dark gear with a red-dot rifle.
 */
export function makeSoldierClassic(level) {
  const elite = level >= 4;
  const shirt = elite ? 0x263238 : 0x5d6b3a;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: elite ? 0x1c1c22 : 0x4b5320, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(0x262626);
  if (level >= 2) {
    helmet(h, elite ? 0x37474f : 0x556b2f);
    part(h.head, boxGeo(1.25, 0.3, 0.1), M(0x263238), 0, 0.68, 0.63); // goggles
  } else part(h.head, boxGeo(1.35, 0.3, 1.35), M(0x8e1b1b), 0.1, 1.3, 0); // beret
  if (level >= 1) {
    const web = M(0x3e2723);
    for (const side of [-1, 1]) part(h.torso, boxGeo(0.3, 2.5, 1.12), web, 0, 0, 0).rotation.z = side * 0.6;
  }
  if (level >= 3) {
    part(h.torso, boxGeo(2.15, 1.7, 1.15), M(elite ? 0x37474f : 0x4a5232), 0, 0.05, 0);
    for (const x of [-0.5, 0, 0.5]) part(h.torso, boxGeo(0.35, 0.4, 0.2), M(0x5d4037), x, -0.35, 0.65);
  }
  const gun = holdLongGun(h, 1.6, dark);
  part(gun, boxGeo(0.25, 0.45, 0.5), dark, 0, -0.55, -0.4); // mag
  part(gun, boxGeo(0.25, 0.5, 0.35), M(0x6d4c41), 0, 0.15, -0.05); // stock
  if (elite) part(gun, boxGeo(0.22, 0.3, 0.3), glow(h, 0xff1744), 0, -0.8, 0.32); // red dot
  h.tracer = elite ? 0xff8a65 : 0xffd54f;
  return h;
}

/**
 * Ranger (alternate Soldier form with two paths): a field ranger in a boonie hat with a rifle.
 * Top path: laser sight at Lv 1, scope at Lv 3, heavy barrel at Lv 4, a belt-fed LMG at Lv 5.
 * Bottom path: chest rig at Lv 3, grenades at Lv 4, an M203 tube and heavy armor at Lv 5.
 */
export function makeSoldierRanger(level, bottom = false) {
  const top = !bottom;
  const shirt = bottom && level >= 5 ? 0x3e4a2a : top && level >= 5 ? 0x2e3b2f : 0x6d7b4a;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: 0x4a3f2c, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(0x262626);
  if (bottom && level >= 5) helmet(h, 0x3b4530);
  else {
    part(h.head, boxGeo(1.4, 0.35, 1.4), M(0x7d8a55), 0, 1.25, 0); // boonie hat
    part(h.head, boxGeo(1.9, 0.1, 1.9), M(0x7d8a55), 0, 1.08, 0); // brim
  }
  if (top && level >= 3) part(h.head, boxGeo(1.25, 0.28, 0.1), M(0x263238), 0, 0.72, 0.64); // tactical glasses
  if (bottom && level >= 3) {
    // Assault chest rig with ammo pouches
    part(h.torso, boxGeo(2.15, 1.6, 1.15), M(0x4b5530), 0, 0.05, 0);
    for (const x of [-0.5, 0, 0.5]) part(h.torso, boxGeo(0.35, 0.4, 0.2), M(0x5d4037), x, -0.3, 0.65);
  }
  if (bottom && level >= 4) {
    // Grenades on the chest
    for (const x of [-0.55, 0.55]) part(h.torso, boxGeo(0.3, 0.35, 0.3), M(0x33691e), x, 0.5, 0.68);
  }
  if (bottom && level >= 5) {
    const plate = M(0x37422a);
    part(h.torso, boxGeo(0.7, 0.5, 1.3), plate, -1.35, 0.95, 0);
    part(h.torso, boxGeo(0.7, 0.5, 1.3), plate, 1.35, 0.95, 0);
  }
  const lmg = top && level >= 5;
  const heavy = top && level >= 4;
  const gun = holdLongGun(h, lmg ? 2.1 : heavy ? 1.9 : 1.6, dark);
  part(gun, boxGeo(0.25, 0.5, 0.35), M(0x6d4c41), 0, 0.15, -0.05); // stock
  if (lmg) part(gun, boxGeo(0.6, 0.6, 0.6), M(0x37474f), 0, -0.6, -0.45); // box magazine
  else part(gun, boxGeo(0.25, 0.45, 0.5), dark, 0, -0.55, -0.4); // mag
  if (top && level >= 1) part(gun, boxGeo(0.12, 0.12, 0.12), glow(h, 0xff1744), 0.18, -1.2, 0.2); // laser sight
  if (top && level >= 3) part(gun, boxGeo(0.22, 0.6, 0.25), M(0x212121), 0, -0.5, 0.3); // scope
  if (bottom && level >= 5) part(gun, boxGeo(0.34, 0.9, 0.34), M(0x263238), 0, -0.9, -0.38); // M203 tube
  h.tracer = heavy || (bottom && level >= 3) ? 0xffab40 : 0xffd54f;
  h.projectile = { color: bottom && level >= 5 ? 0xff6d00 : 0x33691e, size: 0.45, arc: 3.5 };
  return h;
}
const makeSoldierRangerBottom = (level) => makeSoldierRanger(level, true);

/**
 * Operator (two paths): a tactical soldier in a plate carrier with a semi-auto rifle.
 * Top path: knee pads at Lv 1, a helmet with NVGs at Lv 2, an assault rifle at Lv 3, a black
 * Special Forces kit at Lv 4, a dark Ghost suit with a skull mask and glowing optics at Lv 5.
 * Bottom path: heavy armor at Lv 1, a UMP-45 at Lv 2, a radio pack at Lv 3, a burst rifle at
 * Lv 4, and an X-Captain beret with gold trim at Lv 5.
 */
export function makeOperatorTower(level, bottom = false) {
  const top = !bottom;
  const ghost = top && level >= 5;
  const sf = top && level >= 4;
  const shirt = ghost ? 0x15171c : sf ? 0x22262b : bottom && level >= 5 ? 0x2f3a28 : 0x5b6640;
  const h = makeHumanoid({ skin: 0xc8956a, shirt, pants: ghost ? 0x101216 : sf ? 0x1b1e22 : 0x3e4430, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(0x212121);
  const vest = M(ghost ? 0x0c0d10 : sf ? 0x2b2f35 : 0x4a5233);
  part(h.torso, boxGeo(2.1, 1.5, 1.15), vest, 0, 0.1, 0); // plate carrier
  if (top && level >= 1) for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.4, 0.4, 0.2), M(0x3b4029), x, -0.35, 0.65); // pouches
  if (bottom && level >= 1) {
    // Heavy armor: shoulder plates and a thicker front plate
    const plate = M(0x39412b);
    part(h.torso, boxGeo(0.7, 0.45, 1.3), plate, -1.35, 0.95, 0);
    part(h.torso, boxGeo(0.7, 0.45, 1.3), plate, 1.35, 0.95, 0);
    part(h.torso, boxGeo(1.6, 1.0, 0.2), plate, 0, 0.2, 0.7);
  }
  if (bottom && level >= 3) {
    // Radio pack with an antenna (calls in the vehicles)
    part(h.torso, boxGeo(1.3, 1.3, 0.6), M(0x3b4029), 0, 0.1, -0.85);
    part(h.torso, boxGeo(0.08, 1.8, 0.08), dark, 0.45, 1.5, -0.95);
  }
  if (bottom && level >= 5) {
    // X-Captain: a beret with a gold badge, gold trim on the armor
    part(h.head, boxGeo(1.45, 0.3, 1.45), M(0x7b1f1f), 0, 1.2, -0.05);
    part(h.head, boxGeo(0.3, 0.3, 0.1), glow(h, 0xffd54f), 0.4, 1.25, 0.72);
    part(h.torso, boxGeo(2.15, 0.12, 1.2), M(0xc9a227), 0, 0.85, 0);
  } else if (ghost) {
    part(h.head, boxGeo(1.4, 1.4, 1.4), M(0x0c0d10), 0, 0.7, -0.03); // hood
    part(h.head, boxGeo(1.1, 0.5, 0.1), M(0xe0e0e0), 0, 0.35, 0.68); // skull mask
    for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.25, 0.25, 0.12), glow(h, 0x00e676), x, 0.8, 0.7); // optics
  } else if ((top && level >= 2) || (bottom && level >= 1)) {
    helmet(h, sf ? 0x1b1e22 : 0x4a5233);
    if (top && level >= 2) part(h.head, boxGeo(0.6, 0.35, 0.4), dark, 0, 1.25, 0.8); // NVGs
  } else {
    part(h.head, boxGeo(1.4, 0.3, 1.4), M(0x5b6640), 0, 1.2, 0); // cap
    part(h.head, boxGeo(1.0, 0.1, 0.5), M(0x5b6640), 0, 1.08, 0.75); // bill
  }
  if (sf && !ghost) part(h.head, boxGeo(1.3, 0.55, 0.1), M(0x111111), 0, 0.3, 0.66); // balaclava
  const smg = bottom && level === 2;
  const rifle = (top && level >= 3) || (bottom && level >= 3);
  const gun = holdLongGun(h, smg ? 1.2 : ghost ? 2.0 : rifle ? 1.8 : 1.5, ghost ? M(0x0b0b0b) : dark);
  part(gun, boxGeo(0.25, 0.5, 0.35), smg ? dark : M(0x5d4037), 0, 0.15, -0.05); // stock
  part(gun, boxGeo(0.25, smg ? 0.6 : 0.45, 0.45), dark, 0, -0.5, -0.4); // mag
  if (top && level >= 2) part(gun, boxGeo(0.22, 0.5, 0.25), M(0x263238), 0, -0.45, 0.3); // optic
  if (ghost) part(gun, boxGeo(0.36, 0.7, 0.36), M(0x1a1a1a), 0, -2.2, 0); // suppressor
  if (bottom && level >= 4) part(gun, boxGeo(0.2, 0.3, 0.2), glow(h, 0xff1744), 0.2, -1.0, 0.2); // laser
  h.tracer = ghost ? 0x00e676 : sf ? 0xffab40 : 0xffd54f;
  return h;
}
const makeOperatorBottom = (level) => makeOperatorTower(level, true);

/**
 * Machine Gunner (alternate Gatling Gun form with two paths): a soldier behind a heavy machine gun
 * with sandbags. Top path: belt ammo at Lv 2, a Browning MG at Lv 3, twin barrels at Lv 4, an AA
 * turret shield at Lv 5. Bottom path: longer barrel at Lv 2, a glowing Laser MG from Lv 3 (cells
 * at Lv 4, an overcharged core and armor at Lv 5).
 */
export function makeMachineGunner(level, bottom = false) {
  const top = !bottom;
  const laser = bottom && level >= 3;
  const shirt = laser ? 0x263238 : 0x5d6b3a;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: laser ? 0x1c1f26 : 0x4b5320, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(laser ? 0x37474f : 0x2b2b2b);
  const beam = 0xff1744;
  helmet(h, laser ? 0x1c1f26 : 0x556b2f);
  if (laser) part(h.head, boxGeo(1.25, 0.3, 0.1), glow(h, beam), 0, 0.72, 0.64); // visor
  // Sandbags in front of its feet
  for (const x of [-0.9, 0, 0.9]) part(h.root, boxGeo(0.9, 0.55, 0.6), M(0xa1887f), x, 0.3, 1.4);
  if (bottom && level >= 5) {
    const plate = M(0x37474f);
    part(h.torso, boxGeo(0.7, 0.5, 1.3), plate, -1.35, 0.95, 0);
    part(h.torso, boxGeo(0.7, 0.5, 1.3), plate, 1.35, 0.95, 0);
    part(h.torso, boxGeo(0.6, 0.6, 0.15), glow(h, beam), 0, 0.3, 0.6); // overcharge core
  }
  const len = top && level >= 3 ? 2.1 : bottom && level >= 2 ? 2.2 : 1.9;
  const gun = holdLongGun(h, len, dark);
  part(gun, boxGeo(0.55, 0.7, 0.55), dark, 0, -0.2, 0); // heavy receiver
  part(gun, boxGeo(0.4, 0.5, 0.45), M(0x3e2723), 0, -0.55, -0.4); // ammo box
  if (top && level >= 2) part(gun, boxGeo(0.12, 0.6, 0.5), M(0xffb300), 0.32, -0.55, -0.1); // ammo belt
  if (top && level >= 4) part(gun, boxGeo(0.22, len * 0.8, 0.22), dark, 0.32, -len * 0.55, 0.05); // second barrel
  if (top && level >= 5) part(gun, boxGeo(1.4, 0.9, 0.12), M(0x546e7a), 0, -0.9, 0.5); // AA gun shield
  if (laser) {
    part(gun, boxGeo(0.3, len * 0.7, 0.3), glow(h, beam), 0, -len * 0.55, 0.2); // laser coil
    if (level >= 4) for (const x of [-0.32, 0.32]) part(gun, boxGeo(0.2, 0.4, 0.2), glow(h, 0x00e5ff), x, -0.35, -0.1); // laser cells
  }
  h.tracer = laser ? beam : 0xffd54f;
  if (laser) h.tracerWidth = 0.16;
  return h;
}
const makeMachineGunnerBottom = (level) => makeMachineGunner(level, true);

/**
 * Freezer (alternate Frost Trooper form): a polar explorer with a Frost Ray gun. Lv 2 adds a
 * fur-trimmed hood, Lv 3 a scarf and backpack tank, Lv 4 armor plates, Lv 5 a glowing ice bow-gun.
 */
export function makeFrostFreezer(level) {
  const coat = level >= 3 ? 0x1565c0 : 0x29b6f6;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: coat, pants: 0x37474f, arms: coat, face: 'soldier' });
  const { M } = h;
  const ice = 0x80d8ff;
  part(h.head, boxGeo(1.32, 0.45, 1.32), M(0xeceff1), 0, 1.3, 0); // wool cap
  if (level >= 1) {
    part(h.head, boxGeo(1.55, 1.5, 0.3), M(0xf5f5f5), 0, 0.65, -0.6); // fur hood back
    part(h.head, boxGeo(1.3, 0.3, 0.12), M(0x263238), 0, 0.8, 0.63); // snow goggles
    part(h.head, boxGeo(1.0, 0.2, 0.06), glow(h, 0x4fc3f7), 0, 0.8, 0.69);
  }
  if (level >= 2) {
    part(h.torso, boxGeo(2.1, 0.45, 1.15), M(0xc62828), 0, 0.85, 0); // scarf
    part(h.torso, boxGeo(1.2, 1.6, 0.7), M(0x90a4ae), 0, 0.1, -0.85); // coolant tank
    part(h.torso, boxGeo(0.8, 0.8, 0.1), glow(h, ice), 0, 0.2, -1.22);
  }
  if (level >= 3) {
    const plate = M(0xb0bec5);
    part(h.torso, boxGeo(0.7, 0.5, 1.3), plate, -1.35, 0.95, 0);
    part(h.torso, boxGeo(0.7, 0.5, 1.3), plate, 1.35, 0.95, 0);
  }
  const bow = level >= 4;
  const gun = holdLongGun(h, bow ? 1.9 : 1.5, M(bow ? 0xe1f5fe : 0x546e7a));
  part(gun, boxGeo(0.3, 0.5, 0.35), M(0x37474f), 0, 0.15, -0.05); // stock
  part(gun, boxGeo(0.42, 0.42, 0.42), glow(h, ice), 0, -0.4, 0.25); // ice crystal core
  if (bow) {
    // Ice bow arms across the front of the gun.
    const arm = glow(h, ice);
    part(gun, boxGeo(2.2, 0.15, 0.15), arm, 0, -1.4, 0).rotation.y = 0;
    part(gun, boxGeo(0.15, 0.15, 0.9), arm, -1.05, -1.4, -0.35);
    part(gun, boxGeo(0.15, 0.15, 0.9), arm, 1.05, -1.4, -0.35);
  }
  h.tracer = ice;
  h.tracerWidth = 0.22;
  return h;
}

/**
 * Boomerang tower: an outback thrower in a wide-brim hat. The boomerang gets a steel edge at
 * Lv 2, wraps at Lv 3, a second one on the back at Lv 4, and turns gold at Lv 5.
 */
export function makeBoomerang(level) {
  const master = level >= 4;
  const h = makeHumanoid({ skin: 0xc68642, shirt: master ? 0x4e342e : 0xa1887f, pants: 0x5d4037, arms: 0xc68642, face: 'smile' });
  const { M } = h;
  const hat = M(master ? 0x3e2723 : 0x8d6e63);
  part(h.head, boxGeo(2.2, 0.15, 2.2), hat, 0, 1.25, 0); // brim
  part(h.head, boxGeo(1.3, 0.5, 1.3), hat, 0, 1.55, 0);
  if (master) part(h.head, boxGeo(1.35, 0.15, 1.35), M(0xffd54f), 0, 1.37, 0); // gold hat band
  part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.85, 0); // belt
  const color = master ? 0xffc107 : level >= 1 ? 0x90a4ae : 0x8d6e63;
  const wood = M(color);
  // A V-shaped boomerang held up and back in the throwing hand.
  const makeRang = (parent, y) => {
    const g = new THREE.Group();
    g.position.set(0, y, 0);
    parent.add(g);
    for (const a of [0.6, -0.6]) {
      const arm = part(g, boxGeo(0.25, 1.2, 0.4), wood, Math.sin(a) * 0.4, -Math.cos(a) * 0.4, 0);
      arm.rotation.z = a;
    }
    if (level >= 2) part(g, boxGeo(0.35, 0.35, 0.45), M(0xc62828), 0, 0, 0); // grip wrap
    return g;
  };
  const rang = makeRang(h.rightArm, -2.2);
  if (level >= 3) makeRang(h.torso, 0).position.set(0, 0.2, -0.6); // spare on the back
  setMuzzle(h, rang, 0, -0.4, 0);
  h.rightArm.rotation.set(-2.6, 0, 0.3);
  h.leftArm.rotation.set(-0.8, 0, -0.3);
  h.pose = { right: -2.6, left: -0.8, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = { color, size: master ? 1.25 : 1 };
  return h;
}

/**
 * Slime Trooper: a hazmat suit and a goo blaster with a slime tank. Lv 2 adds a bigger tank,
 * Lv 3 a gas mask, Lv 4 a second tank, Lv 5 a glowing explosive-goo cannon.
 */
export function makeSlime(level) {
  const suit = level >= 4 ? 0x33691e : 0xfdd835;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: suit, pants: suit, arms: suit, face: 'soldier' });
  const { M } = h;
  const goo = 0x76ff03;
  part(h.head, boxGeo(1.45, 1.45, 1.45), M(suit), 0, 0.68, -0.05); // hood
  const visor = part(h.head, boxGeo(1.1, 0.7, 0.08), M(0x90caf9), 0, 0.7, 0.72);
  visor.material.transparent = true;
  visor.material.opacity = 0.7;
  if (level >= 2) {
    part(h.head, boxGeo(0.6, 0.5, 0.4), M(0x263238), 0, 0.3, 0.85); // gas mask filter
  }
  const tank = (x, tall) => {
    part(h.torso, boxGeo(0.7, tall, 0.7), M(0x607d8b), x, 0.1, -0.85);
    part(h.torso, boxGeo(0.5, tall * 0.7, 0.1), glow(h, goo), x, 0.1, -1.22);
  };
  tank(level >= 3 ? -0.45 : 0, level >= 1 ? 1.8 : 1.3);
  if (level >= 3) tank(0.45, 1.8);
  const cannon = level >= 4;
  const gun = holdLongGun(h, cannon ? 1.6 : 1.3, M(0x455a64));
  part(gun, boxGeo(cannon ? 0.7 : 0.5, 0.3, cannon ? 0.7 : 0.5), glow(h, goo), 0, -(cannon ? 1.5 : 1.2), 0); // goo nozzle
  part(gun, boxGeo(0.5, 0.6, 0.5), glow(h, goo), 0, -0.3, -0.35); // canister
  h.tracer = goo;
  h.tracerWidth = 0.32;
  h.flight = { color: goo, size: cannon ? 0.75 : 0.6, arc: 1.2, glowing: true, blob: true }; // a glob of slime
  return h;
}

/**
 * Assassin: a hooded ninja with a knife. Lv 2 adds a sash, Lv 3 a mask and second blade on the
 * back, Lv 4 glowing purple trim, Lv 5 a belt of throwing knives and a long glowing blade.
 */
export function makeAssassin(level) {
  const h = makeHumanoid({ skin: 0xd9a066, shirt: 0x1a1a24, pants: 0x14141c, arms: 0x1a1a24, face: 'agent' });
  const { M } = h;
  const cloth = M(0x22222e);
  part(h.head, boxGeo(1.45, 1.4, 1.4), cloth, 0, 0.7, -0.08); // hood
  part(h.head, boxGeo(1.25, 0.35, 0.1), M(0x111111), 0, 0.3, 0.62); // face mask
  const trim = level >= 3 ? glow(h, 0xb388ff) : M(0x8e1b1b);
  if (level >= 1) part(h.torso, boxGeo(2.1, 0.35, 1.1), trim, 0, -0.6, 0); // sash
  if (level >= 2) {
    const back = part(h.torso, boxGeo(0.2, 2.2, 0.2), M(0xb0bec5), 0, 0.3, -0.62); // spare blade
    back.rotation.z = 0.6;
  }
  if (level >= 4) for (const x of [-0.7, -0.35, 0.35, 0.7]) part(h.torso, boxGeo(0.12, 0.5, 0.12), M(0xcfd8dc), x, -0.3, 0.6);
  const knife = new THREE.Group();
  knife.position.set(0, -1.9, 0);
  h.rightArm.add(knife);
  part(knife, boxGeo(0.25, 0.5, 0.25), M(0x3e2723), 0, -0.15, 0); // handle
  const len = level >= 4 ? 1.9 : level >= 2 ? 1.4 : 1.0;
  part(knife, boxGeo(0.1, len, 0.35), level >= 4 ? glow(h, 0xb388ff) : M(0xcfd8dc), 0, -0.4 - len / 2, 0);
  setMuzzle(h, knife, 0, -0.4 - len, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  h.leftArm.rotation.set(-0.6, 0, -0.3);
  h.pose = { right: -2.4, left: -0.6, leftRecoil: 0 };
  h.swing = 1.7;
  h.melee = true;
  h.tracer = level >= 3 ? 0xb388ff : 0xffffff;
  return h;
}

/**
 * Brawler: a boxer in a tank top with big mechanical gauntlets, fists up in a guard. Lv 2 a
 * headband, Lv 3 heavier piston gauntlets, Lv 4 glowing orange knuckles, Lv 5 crackling blue
 * GALVAKNUCKLES with coils, Lv 6 (Boreas' Fury) icy white-blue gauntlets and a frost mantle.
 */
export function makeBrawler(level) {
  const boreas = level >= 5;
  const h = makeHumanoid({ skin: 0xc68642, shirt: boreas ? 0xeceff1 : 0xd32f2f, pants: boreas ? 0x1a237e : 0x263238, arms: 0xc68642, face: 'soldier' });
  const { M } = h;
  part(h.torso, boxGeo(2.1, 0.35, 1.1), M(boreas ? 0x4fc3f7 : 0xfdd835), 0, -0.85, 0); // champion belt
  part(h.torso, boxGeo(0.6, 0.4, 0.08), M(0xffd54f), 0, -0.85, 0.57); // belt plate
  if (level >= 1) part(h.head, boxGeo(1.3, 0.25, 1.3), M(boreas ? 0x81d4fa : 0xffffff), 0, 1.0, 0); // headband
  if (boreas) {
    // Frost mantle over the shoulders, with icy spikes.
    part(h.torso, boxGeo(2.4, 0.5, 1.4), M(0xb3e5fc), 0, 1.05, 0);
    for (const x of [-1.0, 1.0]) {
      const spike = part(h.torso, boxGeo(0.3, 0.9, 0.3), glow(h, 0x80d8ff), x, 1.6, 0);
      spike.rotation.z = x > 0 ? -0.4 : 0.4;
    }
  }
  const metal = M(boreas ? 0xe1f5fe : level >= 2 ? 0x546e7a : 0x78909c);
  const knuckle = level >= 4 ? glow(h, boreas ? 0x80d8ff : 0x40c4ff) : level >= 3 ? glow(h, 0xff9100) : M(0x37474f);
  const big = level >= 2 ? 1.25 : 1;
  const fists = [h.rightArm, h.leftArm].map((arm) => {
    const g = new THREE.Group();
    g.position.set(0, -1.9, 0);
    arm.add(g);
    part(g, boxGeo(1.15 * big, 0.5, 1.15 * big), M(0x37474f), 0, 0, 0); // cuff
    part(g, boxGeo(1.3 * big, 1.1 * big, 1.3 * big), metal, 0, -0.75 * big, 0); // the mechanical fist
    part(g, boxGeo(1.36 * big, 0.3, 0.5), knuckle, 0, -1.2 * big, 0.25); // knuckle plate
    if (level >= 2) for (const x of [-0.45, 0.45]) part(g, boxGeo(0.2, 0.9, 0.2), M(0x263238), x * big, -0.3, -0.7 * big); // pistons
    if (level >= 3) part(g, boxGeo(0.5, 0.5, 0.5), knuckle, 0, -0.2, -0.75 * big); // power core
    if (level >= 4) for (let i = 0; i < 2; i++) part(g, boxGeo(1.2 * big, 0.12, 1.2 * big), glow(h, boreas ? 0xe1f5fe : 0x40c4ff), 0, 0.15 + i * 0.3, 0); // coils
    return g;
  });
  setMuzzle(h, fists[0], 0, -1.4 * big, 0);
  // Fists up in a guard; each punch jabs one straight out.
  h.rightArm.rotation.set(-1.15, 0, 0.25);
  h.leftArm.rotation.set(-1.15, 0, -0.25);
  h.pose = { right: -1.15, left: -1.15, leftRecoil: 0 };
  h.swing = -0.5;
  h.punch = true;
  h.melee = true;
  h.tracer = boreas ? 0xb3e5fc : level >= 4 ? 0x40c4ff : level >= 3 ? 0xff9100 : 0xffffff;
  return h;
}

// ------------------------------------------------------------------ alternate forms & new towers (set 2)

/**
 * Militant (alternate Mercenary form): a guerrilla fighter in a bandana with a long rifle.
 * Lv 2 adds a radio pack, Lv 3 a chest rig, Lv 4 a boonie hat and bigger rifle, Lv 5 black
 * stealth gear with a suppressor and glowing sight.
 */
export function makeMilitant(level) {
  const stealth = level >= 4;
  const shirt = stealth ? 0x1b1f24 : 0x6d6a3a;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: stealth ? 0x15181c : 0x4e4a2a, arms: shirt, face: 'soldier' });
  const { M } = h;
  if (level >= 3 && !stealth) {
    const hat = M(0x5d5a32);
    part(h.head, boxGeo(1.9, 0.12, 1.9), hat, 0, 1.25, 0);
    part(h.head, boxGeo(1.3, 0.4, 1.3), hat, 0, 1.45, 0);
  } else part(h.head, boxGeo(1.32, 0.35, 1.32), M(stealth ? 0x263238 : 0xb71c1c), 0, 1.15, 0); // bandana
  if (stealth) part(h.head, boxGeo(1.25, 0.45, 0.1), M(0x111111), 0, 0.3, 0.62); // face wrap
  if (level >= 1) {
    part(h.torso, boxGeo(1.2, 1.4, 0.6), M(0x4b5320), 0, 0.1, -0.8); // radio pack
    part(h.torso, boxGeo(0.08, 1.6, 0.08), M(0x212121), -0.4, 1.5, -0.9); // antenna
  }
  if (level >= 2) {
    part(h.torso, boxGeo(2.1, 1.0, 1.15), M(stealth ? 0x263238 : 0x4a4628), 0, -0.2, 0); // chest rig
    for (const x of [-0.55, 0, 0.55]) part(h.torso, boxGeo(0.4, 0.45, 0.2), M(0x3e2723), x, -0.3, 0.62);
  }
  const dark = M(0x262626);
  const len = level >= 3 ? 2.1 : 1.8;
  const gun = holdLongGun(h, len, dark);
  part(gun, boxGeo(0.25, 0.5, 0.45), dark, 0, -0.6, -0.4); // mag
  part(gun, boxGeo(0.25, 0.5, 0.35), M(stealth ? 0x37474f : 0x6d4c41), 0, 0.15, -0.05); // stock
  if (stealth) {
    part(gun, boxGeo(0.22, 0.8, 0.22), M(0x111111), 0, -len - 0.4, 0); // suppressor
    h.muzzles[0].position.y = -len - 0.8;
    part(gun, boxGeo(0.22, 0.4, 0.28), glow(h, 0x76ff03), 0, -0.9, 0.34); // night sight
  }
  h.tracer = stealth ? 0xb2ff59 : 0xffd54f;
  return h;
}

/**
 * Laser Gunner (alternate Mercenary form): a high-tech gunner in a cyan visor with a laser rifle.
 * Top path: a power pack, armor from Lv 3 and a big glowing laser minigun at Lv 5. Bottom path:
 * a sensor antenna, a compact SMG from Lv 3 and two SMGs at Lv 5.
 */
export function makeLaserGunner(level, bottom = false) {
  const top = !bottom;
  const armored = top && level >= 3;
  const shirt = armored ? 0xcfd8dc : 0x263238;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: armored ? 0x78909c : 0x1c2529, arms: shirt, face: 'soldier' });
  const { M } = h;
  const laser = 0x00e5ff;
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.45, 0.52); // Dimension Shard emblem
  if (armored) helmet(h, 0xeceff1, false);
  else part(h.head, boxGeo(1.35, 0.35, 1.35), M(0x37474f), 0, 1.2, 0);
  part(h.head, boxGeo(1.25, 0.3, 0.08), glow(h, laser), 0, 0.72, 0.68); // visor
  if (top && level >= 1) part(h.torso, boxGeo(1.4, 1.7, 0.7), M(0x37474f), 0, 0, -0.85); // power pack
  if (top && level >= 2) part(h.torso, boxGeo(0.3, 1.3, 0.1), glow(h, laser), 0, 0, -1.22);
  if (armored) {
    part(h.torso, boxGeo(2.2, 1.6, 1.2), M(0xb0bec5), 0, 0.1, 0);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.15, 0.6, 1.15), M(0x90a4ae), 0, -0.2, 0);
  }
  if (bottom && level >= 1) {
    part(h.torso, boxGeo(1.0, 1.2, 0.6), M(0x37474f), 0, 0.1, -0.8); // sensor pack
    part(h.torso, boxGeo(0.08, 1.6, 0.08), M(0x212121), 0.35, 1.4, -0.9);
    part(h.torso, boxGeo(0.25, 0.25, 0.25), glow(h, laser), 0.35, 2.25, -0.9);
  }
  if (bottom && level >= 3) {
    // SMG / Dual SMGs: compact laser guns, one in each hand at Lv 5.
    const smg = (arm) => {
      const gun = new THREE.Group();
      gun.position.set(0, -1.9, 0);
      arm.add(gun);
      part(gun, boxGeo(0.36, 1.3, 0.45), M(0x263238), 0, -0.65, 0);
      part(gun, boxGeo(0.4, 0.12, 0.5), glow(h, laser), 0, -0.9, 0);
      part(gun, boxGeo(0.25, 0.5, 0.3), M(0x111111), 0, -0.4, -0.35); // mag
      const muzzle = new THREE.Object3D();
      muzzle.position.set(0, -1.35, 0);
      gun.add(muzzle);
      return muzzle;
    };
    h.muzzles = [smg(h.rightArm)];
    if (level >= 5) {
      h.muzzles.push(smg(h.leftArm));
      h.rightArm.rotation.set(-Math.PI / 2, 0, 0.08);
      h.leftArm.rotation.set(-Math.PI / 2, 0, -0.08);
      h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
    } else {
      h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
      h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
      h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
    }
    h.tracer = laser;
    h.tracerWidth = 0.2;
    return h;
  }
  const mini = top && level >= 5;
  const len = mini ? 2.8 : top && level >= 3 ? 2.6 : 2.2;
  const gun = holdLongGun(h, len, M(armored ? 0x90a4ae : 0x263238));
  if (mini) {
    for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) part(gun, boxGeo(0.14, 1.2, 0.14), M(0x212121), x, -len - 0.5, z);
    part(gun, boxGeo(0.6, 0.6, 0.7), M(0x37474f), 0, -1.2, 0); // motor housing
    h.muzzles[0].position.y = -len - 1.1;
  }
  const coils = mini ? 4 : 3;
  for (let i = 0; i < coils; i++) part(gun, boxGeo(0.42, 0.1, 0.5), glow(h, laser), 0, -0.7 - i * 0.45, 0);
  part(gun, boxGeo(0.22, 0.6, 0.28), M(0x111111), 0, -0.6, 0.35); // sight
  h.tracer = laser;
  h.tracerWidth = mini ? 0.3 : 0.22;
  return h;
}
const makeLaserGunnerBottom = (level) => makeLaserGunner(level, true);

/**
 * Hunter (alternate Marksman form): a woodsman in an orange cap with a hunting rifle.
 * Lv 2 a scope, Lv 3 a survival pack, Lv 4 a camo poncho and longer rifle, Lv 5 a dark
 * night-hunter outfit with glowing night-vision goggles.
 */
export function makeHunter(level) {
  const night = level >= 4;
  const shirt = night ? 0x212121 : level >= 3 ? 0x5a6b34 : 0x8b5a2b;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: night ? 0x1a1a1a : 0x4e3b26, arms: shirt, face: 'soldier' });
  const { M } = h;
  const cap = M(night ? 0x263238 : 0xff6f00);
  part(h.head, boxGeo(1.35, 0.4, 1.35), cap, 0, 1.25, 0);
  part(h.head, boxGeo(1.3, 0.12, 0.5), cap, 0, 1.08, 0.75); // peak
  if (night) {
    part(h.head, boxGeo(1.0, 0.35, 0.3), M(0x212121), 0, 0.75, 0.7);
    for (const x of [-0.25, 0.25]) part(h.head, boxGeo(0.25, 0.25, 0.1), glow(h, 0x76ff03), x, 0.75, 0.87);
  }
  if (level >= 2) {
    part(h.torso, boxGeo(1.4, 1.7, 0.7), M(0x6d4c41), 0, 0, -0.85); // survival pack
    part(h.torso, boxGeo(1.5, 0.4, 0.5), M(0x33691e), 0, 1.0, -0.85); // bedroll
  }
  if (level >= 3) {
    part(h.torso, boxGeo(2.3, 1.0, 1.3), M(night ? 0x2e3b2e : 0x556b2f), 0, 0.55, 0); // poncho
  }
  const len = level >= 3 ? 2.8 : 2.4;
  const wood = M(night ? 0x263238 : 0x6d4c41);
  const gun = holdLongGun(h, len, wood);
  const dark = M(0x1a1a1a);
  part(gun, boxGeo(0.14, 0.7, 0.14), dark, 0, -len - 0.3, 0); // barrel tip
  h.muzzles[0].position.y = -len - 0.6;
  if (level >= 1) part(gun, boxGeo(0.24, 1.0, 0.3), dark, 0, -0.9, 0.35); // scope
  h.tracer = night ? 0xb2ff59 : 0xfff59d;
  h.tracerWidth = level >= 2 ? 0.24 : undefined;
  return h;
}

/**
 * Pump Shotgunner (alternate Shotgunner form): an enforcer in a cap with a pump shotgun.
 * Lv 2 shell belt, Lv 3 a vest, Lv 4 a helmet and heavier gun, Lv 5 a tactical drum shotgun.
 */
export function makeShotgunnerPump(level) {
  const tac = level >= 4;
  const shirt = tac ? 0x1c2833 : 0x37474f;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: tac ? 0x111a22 : 0x263238, arms: shirt, face: 'agent' });
  const { M } = h;
  if (level >= 3) helmet(h, tac ? 0x0d1b2a : 0x263238);
  else {
    const cap = M(0x0d47a1);
    part(h.head, boxGeo(1.35, 0.4, 1.35), cap, 0, 1.25, 0);
    part(h.head, boxGeo(1.3, 0.12, 0.5), cap, 0, 1.08, 0.75);
  }
  if (level >= 1) {
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.85, 0);
    for (const x of [-0.7, -0.35, 0, 0.35, 0.7]) part(h.torso, boxGeo(0.15, 0.3, 0.15), M(0xd32f2f), x, -0.7, 0.6);
  }
  if (level >= 2) part(h.torso, boxGeo(2.15, 1.7, 1.15), M(tac ? 0x263238 : 0x455a64), 0, 0.05, 0); // vest
  const len = tac ? 2.0 : level >= 3 ? 1.8 : 1.6;
  const gun = holdLongGun(h, len, M(0x212121));
  part(gun, boxGeo(0.42, 0.5, 0.52), M(0x5d4037), 0, -0.9, 0.05); // pump
  part(gun, boxGeo(0.3, 0.5, 0.4), M(tac ? 0x37474f : 0x4e342e), 0, 0.2, -0.05); // stock
  if (tac) {
    part(gun, boxGeo(0.6, 0.6, 0.6), M(0x424242), 0, -0.45, -0.5); // drum
    part(gun, boxGeo(0.2, 0.25, 0.25), glow(h, 0xff1744), 0, -1.2, 0.34);
  }
  h.tracer = 0xffab40;
  return h;
}

/**
 * Combat Shotgunner (alternate Shotgunner, two paths). Top: Gloves, a Padded Vest, a Militant
 * beret, Advanced Goggles and a drum-fed AA-12 with a medkit. Bottom: a bandolier, an Officer's
 * cap, SWAT gear and the bulky DB-12.
 */
export function makeShotgunnerCombat(level, bottom = false) {
  const top = !bottom;
  const swat = bottom && level >= 4;
  const shirt = swat ? 0x1b1f24 : bottom && level >= 3 ? 0x1a237e : 0x556b2f;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: swat ? 0x15181c : 0x3e4a2a, arms: shirt, face: 'soldier' });
  const { M } = h;
  if (level >= 1) {
    if (top) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(0.95, 0.5, 0.95), M(0x212121), 0, -1.85, 0); // gloves
    else {
      const strap = part(h.torso, boxGeo(0.35, 2.6, 1.12), M(0x4e342e), 0, 0, 0);
      strap.rotation.z = -0.75;
    }
  }
  if (top && level >= 2) part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x6b7b3a), 0, 0.05, 0); // padded vest
  if (swat) {
    helmet(h, 0x111111);
    part(h.torso, boxGeo(2.2, 1.75, 1.2), M(0x263238), 0, 0.05, 0);
    const visor = part(h.head, boxGeo(1.25, 0.45, 0.08), M(0x90caf9), 0, 0.7, 0.74);
    visor.material.transparent = true;
    visor.material.opacity = 0.6;
  } else if (bottom && level >= 3) {
    // Officer: peaked cap with a gold badge
    part(h.head, boxGeo(1.4, 0.45, 1.4), M(0x0d1b4c), 0, 1.25, 0);
    part(h.head, boxGeo(1.3, 0.1, 0.5), M(0x111111), 0, 1.05, 0.75);
    part(h.head, boxGeo(0.25, 0.25, 0.06), glow(h, 0xffd54f), 0, 1.3, 0.72);
  } else if (top && level >= 3) {
    part(h.head, boxGeo(1.45, 0.35, 1.45), M(0x33691e), 0.1, 1.25, 0); // militant beret
  }
  if (top && level >= 4) {
    // Advanced Goggles
    part(h.head, boxGeo(1.25, 0.3, 0.12), M(0x212121), 0, 0.72, 0.64);
    part(h.head, boxGeo(0.4, 0.25, 0.06), glow(h, 0x76ff03), -0.28, 0.72, 0.71);
    part(h.head, boxGeo(0.4, 0.25, 0.06), glow(h, 0x76ff03), 0.28, 0.72, 0.71);
  }
  if (top && level >= 5) {
    // Health Pack on its back
    part(h.torso, boxGeo(1.2, 1.1, 0.5), M(0xeeeeee), 0, 0.1, -0.85);
    part(h.torso, boxGeo(0.7, 0.2, 0.06), M(0xd32f2f), 0, 0.1, -1.12);
    part(h.torso, boxGeo(0.2, 0.7, 0.06), M(0xd32f2f), 0, 0.1, -1.12);
  }
  const big = level >= 5;
  const gun = holdLongGun(h, big ? 2.0 : 1.6, M(0x212121));
  part(gun, boxGeo(0.42, 0.5, 0.52), M(0x5d4037), 0, -0.9, 0.05); // pump grip
  part(gun, boxGeo(0.3, 0.5, 0.4), M(0x4e342e), 0, 0.2, -0.05); // stock
  if (top && big) part(gun, boxGeo(0.65, 0.65, 0.65), M(0x424242), 0, -0.5, -0.5); // AA-12 drum
  if (bottom && big) {
    // DB-12: a chunky bullpup with twin tube magazines on top
    part(gun, boxGeo(0.6, 1.6, 0.7), M(0x263238), 0, -0.4, 0);
    for (const x of [-0.18, 0.18]) part(gun, boxGeo(0.2, 1.4, 0.2), M(0x37474f), x, -0.7, 0.42);
    part(gun, boxGeo(0.2, 0.25, 0.25), glow(h, 0x40c4ff), 0, -1.2, 0.34);
  }
  h.tracer = bottom && level >= 4 ? 0xffd740 : 0xffab40;
  return h;
}
const makeShotgunnerCombatBottom = (level) => makeShotgunnerCombat(level, true);

/**
 * Cryo Ranger (alternate Sleeter with two paths): a ranger in a white-and-blue snow suit
 * with a frosty rifle. Top path: sensor eye at Lv 3, nitrogen tanks at Lv 4, an Ice LMG at Lv 5.
 * Bottom path: grenade belt at Lv 3, an underbarrel M203 at Lv 4, heavy frost armor at Lv 5.
 */
export function makeFrostRanger(level, bottom = false) {
  const top = !bottom;
  const suit = bottom && level >= 5 ? 0x0d47a1 : top && level >= 4 ? 0x01579b : 0xe3f2fd;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: suit, pants: 0x546e7a, arms: suit, face: 'soldier' });
  const { M } = h;
  const ice = 0x80d8ff;
  part(h.head, boxGeo(1.4, 0.4, 1.4), M(0x90caf9), 0, 1.25, 0); // knit cap
  part(h.torso, boxGeo(2.1, 0.35, 1.12), M(0x37474f), 0, -0.85, 0); // belt
  if (level >= 1) part(h.torso, boxGeo(2.1, 0.4, 1.15), M(0x4fc3f7), 0, 0.85, 0); // ice-blue scarf
  if (top && level >= 3) {
    // Stealth Sensor Eye: a glowing monocle scope over one eye
    part(h.head, boxGeo(0.5, 0.5, 0.2), M(0x263238), 0.3, 0.75, 0.66);
    part(h.head, boxGeo(0.32, 0.32, 0.06), glow(h, 0x18ffff), 0.3, 0.75, 0.77);
  }
  if (top && level >= 4) {
    // Nitrogen tanks on its back
    for (const x of [-0.4, 0.4]) part(h.torso, boxGeo(0.6, 1.6, 0.6), M(0xcfd8dc), x, 0.05, -0.85);
    part(h.torso, boxGeo(1.2, 0.2, 0.1), glow(h, ice), 0, 0.5, -1.17);
  }
  if (bottom && level >= 3) {
    // Grenade belt: frosty grenades across the chest
    const strap = part(h.torso, boxGeo(0.35, 2.6, 1.14), M(0x455a64), 0, 0, 0);
    strap.rotation.z = 0.75;
    for (const [x, y] of [[-0.45, -0.35], [0, 0.05], [0.45, 0.45]]) part(h.torso, boxGeo(0.3, 0.3, 0.2), glow(h, ice), x, y, 0.62);
  }
  if (bottom && level >= 5) {
    // Deep Freeze armor: icy shoulder plates and a helmet
    helmet(h, 0x1a237e);
    const plate = glow(h, 0xb3e5fc);
    part(h.torso, boxGeo(0.7, 0.5, 1.3), plate, -1.35, 0.95, 0);
    part(h.torso, boxGeo(0.7, 0.5, 1.3), plate, 1.35, 0.95, 0);
  }
  const lmg = top && level >= 5;
  const gun = holdLongGun(h, lmg ? 2.1 : level >= 2 ? 1.8 : 1.5, M(lmg ? 0x37474f : 0x546e7a));
  part(gun, boxGeo(0.3, 0.5, 0.35), M(0x37474f), 0, 0.15, -0.05); // stock
  part(gun, boxGeo(0.38, 0.38, 0.38), glow(h, ice), 0, -0.45, 0.25); // ice cell
  if (lmg) part(gun, boxGeo(0.6, 0.6, 0.6), M(0x263238), 0, -0.6, -0.45); // box magazine
  if (bottom && level >= 4) part(gun, boxGeo(0.34, 0.9, 0.34), M(0x263238), 0, -0.9, -0.38); // M203 tube
  h.tracer = ice;
  h.tracerWidth = 0.16;
  h.projectile = { color: 0x4fc3f7, size: 0.45, arc: 3.5, glowing: true };
  return h;
}
const makeFrostRangerBottom = (level) => makeFrostRanger(level, true);

/**
 * Pyromancer (alternate Flamethrower form): a firefighter-turned-arsonist in a red coat.
 * Lv 2 a respirator and fuel tank, Lv 3 hazard stripes and a second tank, Lv 4 a heavy suit,
 * Lv 5 a blazing horned helmet and glowing napalm tanks.
 */
export function makePyromancer(level) {
  const maniac = level >= 4;
  const coat = maniac ? 0x3e2723 : 0xb71c1c;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: coat, pants: 0x212121, arms: coat, face: 'soldier' });
  const { M } = h;
  const fire = 0xff6d00;
  part(h.head, boxGeo(1.45, 0.55, 1.45), M(maniac ? 0x212121 : 0xfdd835), 0, 1.3, 0); // fire helmet
  part(h.head, boxGeo(1.6, 0.12, 1.7), M(maniac ? 0x212121 : 0xfdd835), 0, 1.05, -0.1); // brim
  if (maniac) for (const x of [-0.6, 0.6]) part(h.head, boxGeo(0.2, 0.7, 0.2), glow(h, fire), x, 1.8, 0); // horns
  if (level >= 1) {
    part(h.head, boxGeo(0.6, 0.55, 0.4), M(0x37474f), 0, 0.35, 0.75); // respirator
    part(h.head, boxGeo(1.2, 0.35, 0.08), M(0xffa000), 0, 0.8, 0.66); // visor
  }
  if (level >= 2) for (const y of [-0.5, 0.3]) part(h.torso, boxGeo(2.08, 0.18, 1.08), M(0xffeb3b), 0, y, 0); // hazard stripes
  const tank = maniac ? glow(h, fire) : M(0xc62828);
  const tanks = level >= 2 ? [-0.45, 0.45] : [0];
  for (const x of tanks) part(h.torso, boxGeo(0.7, 2.0, 0.7), tank, x, 0.2, -0.85);
  if (level >= 3) part(h.torso, boxGeo(2.2, 1.0, 1.2), M(0x5d4037), 0, 0.6, 0); // heavy suit shoulders
  const g = new THREE.Group();
  g.position.set(0, -1.9, 0);
  h.rightArm.add(g);
  part(g, boxGeo(0.4, 1.5, 0.45), M(0x424242), 0, -0.75, 0);
  part(g, boxGeo(0.55, 0.3, 0.55), M(0x212121), 0, -1.55, 0);
  part(g, boxGeo(0.15, 0.15, 0.15), glow(h, fire), 0, -1.75, 0.2); // pilot light
  setMuzzle(h, g, 0, -1.85, 0);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.15, 0, -0.5);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.15, leftRecoil: 0.05 };
  h.recoilScale = 0.1;
  return h;
}

/** The Ace Pilot's plane (faces +Z): a yellow racer, a blue warbird, a grey jet from Lv 4, a gold jet at Lv 5. */
export function makeAcePlane(h, level) {
  const { M } = h;
  const plane = new THREE.Group();
  const bank = new THREE.Group();
  plane.add(bank);
  const muzzles = [];
  const muzzle = (x, y, z) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    bank.add(m);
    muzzles.push(m);
  };
  let prop = null;
  if (level <= 2) {
    const body = M(level >= 2 ? 0x1565c0 : 0xfbc02d);
    const trim = M(level >= 2 ? 0xfafafa : 0x212121);
    part(bank, boxGeo(1.1, 1.1, 4.4), body, 0, 0, 0);
    part(bank, boxGeo(6, 0.2, 1.3), body, 0, -0.2, 0.5); // wings
    for (const x of [-2.2, 2.2]) part(bank, boxGeo(0.6, 0.22, 1.32), trim, x, -0.2, 0.5); // wing tips
    part(bank, boxGeo(2.2, 0.15, 0.8), body, 0, 0.1, -1.9);
    part(bank, boxGeo(0.15, 1.0, 0.9), trim, 0, 0.65, -1.9);
    part(bank, boxGeo(0.8, 0.45, 1.0), M(0x90caf9), 0, 0.7, 0.4);
    part(bank, boxGeo(0.7, 0.7, 0.4), M(0xc62828), 0, 0, 2.3); // red nose
    prop = new THREE.Group();
    prop.position.set(0, 0, 2.55);
    bank.add(prop);
    part(prop, boxGeo(0.3, 2.4, 0.1), M(0x3e2723), 0, 0, 0);
    if (level >= 1) for (const x of [-1.8, 1.8]) part(bank, boxGeo(0.4, 0.4, 0.9), M(0x263238), x, -0.55, 0.5); // bombs
    muzzle(-0.8, -0.2, 1.4);
    muzzle(0.8, -0.2, 1.4);
  } else {
    const gold = level >= 4;
    const body = M(gold ? 0xffc107 : 0x78909c);
    const dark = M(gold ? 0x5d4037 : 0x37474f);
    part(bank, boxGeo(1.0, 0.9, 5.4), body, 0, 0, 0);
    part(bank, boxGeo(0.55, 0.55, 1.0), dark, 0, -0.05, 3.1);
    part(bank, boxGeo(0.75, 0.45, 1.3), M(0x4fc3f7), 0, 0.55, 1.1);
    for (const side of [-1, 1]) {
      const w = part(bank, boxGeo(3.0, 0.15, 1.8), body, side * 1.8, -0.1, -0.3);
      w.rotation.y = side * 0.5;
      part(bank, boxGeo(0.12, 1.1, 1.0), dark, side * 0.45, 0.75, -2.3).rotation.z = side * -0.3;
      part(bank, boxGeo(0.35, 0.35, 1.1), M(0x263238), side * 1.6, -0.45, 0.1); // bomb rack
    }
    part(bank, boxGeo(0.7, 0.7, 0.3), glow(h, gold ? 0xff3d00 : 0xff9100), 0, 0, -2.8);
    if (level >= 3) part(bank, boxGeo(0.5, 0.4, 0.5), glow(h, 0x00e5ff), 0, -0.6, 1.4); // spy camera
    muzzle(-0.55, -0.2, 2.4);
    muzzle(0.55, -0.2, 2.4);
  }
  const bay = new THREE.Object3D();
  bay.position.set(0, -0.8, 0);
  bank.add(bay);
  plane.userData = { bank, prop, bay, missiles: [] };
  return { plane, muzzles };
}

/** Ace Pilot (alternate Aviator form): a flying ace in a bomber jacket, flight helmet from Lv 3. */
export function makeAviatorAce(level) {
  const jet = level >= 2;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: 0x8d5524, pants: 0x3e4a5a, arms: 0x8d5524 });
  const { M } = h;
  if (jet) {
    part(h.head, boxGeo(1.45, 1.4, 1.45), M(level >= 4 ? 0xffc107 : 0x546e7a), 0, 0.65, -0.03);
    part(h.head, boxGeo(1.2, 0.45, 0.08), M(0xff7043), 0, 0.7, 0.7);
  } else {
    const cap = M(0x4e342e);
    part(h.head, boxGeo(1.35, 0.6, 1.35), cap, 0, 1.0, -0.02);
    part(h.head, boxGeo(1.3, 0.12, 0.1), M(0x3e2723), 0, 1.05, 0.66);
    for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.4, 0.3, 0.08), M(0xffe082), x, 1.05, 0.7);
  }
  part(h.torso, boxGeo(2.15, 0.45, 1.15), M(0xefebe9), 0, 0.85, 0); // fur collar
  if (level >= 1) part(h.torso, boxGeo(0.5, 0.5, 0.1), M(0xffd54f), -0.5, 0.2, 0.52); // ace badge
  if (level >= 3) part(h.head, boxGeo(0.08, 0.9, 0.08), M(0x212121), -0.7, 1.6, -0.2); // radio antenna
  // A small runway pad with stripes.
  part(h.root, boxGeo(3.6, 0.08, 1.0), M(0x424242), 0, 0.04, -1.6);
  for (const x of [-1.2, 0, 1.2]) part(h.root, boxGeo(0.6, 0.1, 0.2), M(0xfafafa), x, 0.06, -1.6);
  h.rightArm.rotation.set(Math.PI * 0.85, 0, 0.25);
  h.pose = { right: Math.PI * 0.85, left: 0, leftRecoil: 0 };
  const { plane, muzzles } = makeAcePlane(h, level);
  h.plane = plane;
  h.muzzles = muzzles;
  h.flyHeight = 12;
  h.tracer = level >= 4 ? 0xffab40 : 0xffe082;
  return h;
}

/**
 * Medic: a field medic in a white coat with a medi gun. Lv 2 a med bag, Lv 3 a big-brain
 * headset, Lv 4 a backpack tank, Lv 5 a gold-trimmed coat. Draws beams to shielded towers.
 */
export function makeMedic(level) {
  const doc = level >= 4;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: 0xfafafa, pants: doc ? 0x1a237e : 0x546e7a, arms: 0xfafafa, face: 'smile' });
  const { M } = h;
  const red = M(0xd32f2f);
  // Red cross on the chest and the cap.
  part(h.torso, boxGeo(0.7, 0.22, 0.06), red, 0.4, 0.4, 0.52);
  part(h.torso, boxGeo(0.22, 0.7, 0.06), red, 0.4, 0.4, 0.52);
  part(h.head, boxGeo(1.32, 0.4, 1.32), M(0xfafafa), 0, 1.25, 0);
  part(h.head, boxGeo(0.4, 0.12, 0.06), red, 0, 1.3, 0.67);
  part(h.head, boxGeo(0.12, 0.4, 0.06), red, 0, 1.3, 0.67);
  if (level >= 1) {
    part(h.torso, boxGeo(0.8, 0.8, 0.9), M(0xc62828), -1.2, -0.8, 0); // med bag
    part(h.torso, boxGeo(0.2, 2.3, 1.12), M(0x5d4037), 0, 0.1, 0).rotation.z = 0.6;
  }
  if (level >= 2) {
    part(h.head, boxGeo(1.5, 0.15, 0.15), M(0x212121), 0, 1.0, 0); // headset band
    part(h.head, boxGeo(0.45, 0.45, 0.2), glow(h, 0xff4081), 0, 1.65, 0); // brain light
  }
  if (level >= 3) {
    part(h.torso, boxGeo(1.2, 1.8, 0.7), M(0xb0bec5), 0, 0.1, -0.85); // medi tank
    part(h.torso, boxGeo(0.8, 1.2, 0.1), glow(h, 0xff5252), 0, 0.1, -1.22);
  }
  if (doc) for (const x of [-1.03, 1.03]) part(h.torso, boxGeo(0.1, 2, 1.05), M(0xffd54f), x, 0, 0); // gold trim
  const gun = holdLongGun(h, 1.3, M(0xeceff1));
  part(gun, boxGeo(0.45, 0.45, 0.5), red, 0, -0.5, 0.05);
  part(gun, boxGeo(0.3, 0.3, 0.3), glow(h, 0xff8a80), 0, -1.35, 0);
  h.muzzles[0].position.y = -1.45;
  h.medi = 0xff8a80;
  h.tracer = 0xff8a80;
  return h;
}

/**
 * Medigun Medic (alternate Medic form): a medic in a red coat with a backpack tank and a medigun.
 * Top path: the tank and gun grow, then glow blue (Uber). Bottom path: a longer nozzle and an
 * antenna, then a red glow (Kritz). A purple Dimension Shard emblem marks it.
 */
export function makeMedicBeam(level, bottom = false) {
  const charged = level >= 4;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: 0xb71c1c, pants: 0x37474f, arms: 0xfafafa, face: 'smile' });
  const { M } = h;
  const white = M(0xfafafa);
  const accent = charged ? (bottom ? 0xff1744 : 0x448aff) : 0xff8a80;
  // White cross on the coat, glasses and slicked-back hair.
  part(h.torso, boxGeo(0.7, 0.22, 0.06), white, 0.4, 0.4, 0.52);
  part(h.torso, boxGeo(0.22, 0.7, 0.06), white, 0.4, 0.4, 0.52);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.5, 0.45, 0.52);
  part(h.head, boxGeo(1.3, 0.35, 1.3), M(0x3e2723), 0, 1.2, -0.05);
  part(h.head, boxGeo(1.1, 0.2, 0.08), M(0x90a4ae), 0, 0.55, 0.66);
  // Backpack tank, bigger on the Top path.
  const tank = !bottom ? [1, 1.1, 1.2, 1.35, 1.5, 1.7][level] : 1;
  part(h.torso, boxGeo(1.2 * tank, 1.8 * tank, 0.7), M(0x78909c), 0, 0.1, -0.85);
  part(h.torso, boxGeo(0.8 * tank, 1.2 * tank, 0.1), glow(h, accent), 0, 0.1, -1.22);
  if (level >= 2) part(h.torso, boxGeo(0.3, 0.3, 1.0), M(0x212121), 0.75, 0.6, -0.4); // hose
  if (bottom && level >= 3) {
    // Longer Range: an antenna on the backpack
    part(h.torso, boxGeo(0.12, 2.2, 0.12), M(0x9e9e9e), -0.4, 1.9, -0.85);
    part(h.torso, boxGeo(0.3, 0.3, 0.3), glow(h, accent), -0.4, 3.05, -0.85);
  }
  if (charged) for (const x of [-1.03, 1.03]) part(h.torso, boxGeo(0.1, 2, 1.05), glow(h, accent), x, 0, 0);
  if (!bottom && level >= 5) part(h.head, boxGeo(1.5, 0.15, 1.5), glow(h, 0x82b1ff), 0, 1.5, 0); // Max Uber halo
  const gun = holdLongGun(h, bottom ? 1.3 + level * 0.12 : 1.3, M(0xeceff1));
  part(gun, boxGeo(0.5, 0.5, 0.55), M(0xc62828), 0, -0.5, 0.05);
  part(gun, boxGeo(0.32, 0.32, 0.32), glow(h, accent), 0, -1.35 - (bottom ? level * 0.12 : 0), 0);
  h.muzzles[0].position.y = -1.45 - (bottom ? level * 0.12 : 0);
  h.medi = 0xff8a80;
  h.tracer = 0xff8a80;
  return h;
}
const makeMedicBeamBottom = (level) => makeMedicBeam(level, true);

/**
 * EDJ (alternate DJ form): a DJ with a light-up visor behind a small neon deck. Top path: more
 * speakers and stage lights (gold at Showdown). Bottom path: a "$" sign, then a costume cape
 * (Cosplay Party) and rave lights (DJ Rave). A purple Dimension Shard emblem marks her.
 */
export function makeEDJ(level, bottom = false) {
  const neon = bottom ? 0x69f0ae : 0x00e5ff;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: bottom && level >= 4 ? 0x4a148c : 0x263238, pants: 0x212121, arms: 0xe0ac69, face: 'smile' });
  const { M } = h;
  // Long hair, headphones and a glowing visor.
  part(h.head, boxGeo(1.35, 0.45, 1.35), M(0xd81b60), 0, 1.2, -0.02);
  part(h.head, boxGeo(1.3, 1.2, 0.35), M(0xd81b60), 0, 0.5, -0.65);
  for (const x of [-0.7, 0.7]) part(h.head, boxGeo(0.25, 0.55, 0.55), M(0x212121), x, 0.6, 0);
  part(h.head, boxGeo(1.2, 0.25, 0.08), glow(h, neon), 0, 0.75, 0.66);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.5, 0.45, 0.52);
  // A small deck with one turntable and a neon strip.
  part(h.root, boxGeo(2.6, 2.2, 1.0), M(0x1c1c24), 0, 1.1, 1.5);
  part(h.root, boxGeo(1.0, 0.12, 0.9), M(0x111111), -0.6, 2.26, 1.5);
  part(h.root, boxGeo(0.3, 0.14, 0.3), glow(h, neon), -0.6, 2.32, 1.5);
  part(h.root, boxGeo(0.8, 0.16, 0.7), M(0x424242), 0.7, 2.28, 1.5);
  part(h.root, boxGeo(2.5, 0.2, 0.06), glow(h, neon), 0, 1.5, 2.02);
  // Speakers, more and taller on the Top path.
  const sp = !bottom ? [1.2, 1.6, 1.8, 2.2, 2.5, 2.9][level] : 1.2 + level * 0.15;
  for (const x of [-1, 1]) {
    part(h.root, boxGeo(0.9, sp, 0.9), M(0x111111), x * 1.9, sp / 2, 0.8);
    part(h.root, boxGeo(0.55, 0.55, 0.06), glow(h, neon), x * 1.9, sp * 0.65, 1.26);
  }
  if (!bottom && level >= 3) {
    // Rally Call: stage lights on poles
    const lightC = level >= 5 ? 0xffd54f : neon;
    for (const x of [-2.6, 2.6]) {
      part(h.root, boxGeo(0.18, 5, 0.18), M(0x9e9e9e), x, 2.5, 0.2);
      part(h.root, boxGeo(0.5, 0.4, 0.5), glow(h, lightC), x, 5.1, 0.2);
    }
  }
  if (bottom && level >= 3) {
    // Budget Costs: a gold "$" sign on the deck
    part(h.root, boxGeo(0.16, 0.7, 0.06), glow(h, 0xffd54f), 0, 0.9, 2.04);
    for (const y of [0.65, 0.9, 1.15]) part(h.root, boxGeo(0.5, 0.11, 0.06), glow(h, 0xffd54f), 0, y, 2.05);
  }
  if (bottom && level >= 4) part(h.torso, boxGeo(1.8, 2.2, 0.12), M(0x7b1fa2), 0, -0.3, -0.62); // Cosplay Party: a cape
  if (bottom && level >= 5) for (const x of [-1.2, 0, 1.2]) part(h.root, boxGeo(0.35, 0.35, 0.35), glow(h, [0xff1744, 0x76ff03, 0x2979ff][x / 1.2 + 1]), x, 6, 0.4);
  h.rightArm.rotation.set(-1.3, 0, 0.2);
  h.leftArm.rotation.set(-1.3, 0, -0.2);
  h.pose = { right: -1.3, left: -1.3, leftRecoil: 0 };
  h.bob = 0.18;
  h.muzzles = [];
  return h;
}
const makeEDJBottom = (level) => makeEDJ(level, true);

/** Fruit Farm (alternate Farm form): a new crop each level: carrots, wheat, trees, apples, glowing space fruit. */
export function makeFarmFruit(level) {
  const u = makeThing();
  const { M } = u;
  part(u.body, boxGeo(4.2, 0.3, 4.2), M(0x795548), 0, 0.15, 0); // soil
  // A little farmhouse with a blue roof.
  part(u.body, boxGeo(1.8, 1.6, 1.6), M(0xfff8e1), -1.1, 1.1, -1.2);
  const roof = M(0x1565c0);
  part(u.body, boxGeo(1.2, 0.2, 1.8), roof, -1.55, 2.2, -1.2).rotation.z = 0.6;
  part(u.body, boxGeo(1.2, 0.2, 1.8), roof, -0.65, 2.2, -1.2).rotation.z = -0.6;
  part(u.body, boxGeo(0.5, 0.8, 0.1), M(0x6d4c41), -1.1, 0.7, -0.38);
  // Fence posts.
  for (const x of [-1.9, -0.6, 0.7, 1.9]) part(u.body, boxGeo(0.15, 0.6, 0.15), M(0xa1887f), x, 0.55, 1.95);
  part(u.body, boxGeo(4.0, 0.12, 0.08), M(0xa1887f), 0, 0.7, 1.95);
  if (level <= 1) {
    // Carrots (Lv 1) or wheat (Lv 2) in rows
    const leaf = M(level ? 0xfbc02d : 0x43a047);
    const root = M(0xff7043);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
      const x = -1.5 + j * 0.8;
      const z = 0.1 + i * 0.6;
      part(u.body, boxGeo(0.25, level ? 0.9 : 0.4, 0.25), leaf, x, level ? 0.75 : 0.5, z);
      if (!level) part(u.body, boxGeo(0.2, 0.15, 0.2), root, x, 0.32, z);
    }
  } else {
    // Trees (Lv 3), apple trees (Lv 4) or space fruit trees (Lv 5).
    const fruit = level >= 4 ? glow(u, 0xd500f9) : M(0xe53935);
    const leaves = M(level >= 4 ? 0x1de9b6 : 0x2e7d32);
    for (const [x, z] of [[-1.2, 0.6], [0.2, 1.2], [1.4, 0.4], [1.3, -1.2]]) {
      part(u.body, boxGeo(0.3, 1.2, 0.3), M(0x5d4037), x, 0.9, z);
      part(u.body, boxGeo(1.0, 1.0, 1.0), leaves, x, 1.9, z);
      if (level >= 3) for (const [ox, oz] of [[0.5, 0], [-0.3, 0.5], [0, -0.5]]) part(u.body, boxGeo(0.25, 0.25, 0.25), fruit, x + ox, 1.8, z + oz);
    }
  }
  return u;
}

/**
 * Airdrop Farm (alternate Farm form): a concrete helipad with a big H, a little control hut and a
 * windsock. Top path: a landing light ring (Lv 2), a red-cross medical tent (Lv 3), a bank vault
 * (Lv 4) and a radar dish with flashing beacons (Lv 5). Bottom path: piles of cash crates that
 * grow every level, gold bars at Lv 4 and taller piles for Double Crates.
 */
export function makeFarmAirdrop(level, bottom = false) {
  const u = makeThing();
  const { M } = u;
  part(u.body, boxGeo(4.4, 0.3, 4.4), M(0x9e9e9e), 0, 0.15, 0); // concrete pad
  part(u.body, boxGeo(3.4, 0.04, 3.4), M(0xffc107), 0, 0.32, 0.3); // yellow landing square
  part(u.body, boxGeo(3.0, 0.05, 3.0), M(0x9e9e9e), 0, 0.34, 0.3);
  const white = M(0xfafafa);
  for (const x of [-0.6, 0.6]) part(u.body, boxGeo(0.3, 0.06, 1.8), white, x, 0.37, 0.3); // the H
  part(u.body, boxGeo(1.2, 0.06, 0.3), white, 0, 0.37, 0.3);
  // Control hut and windsock in the back corner.
  part(u.body, boxGeo(1.1, 1.1, 0.9), M(0x546e7a), -1.55, 0.85, -1.65);
  part(u.body, boxGeo(0.8, 0.3, 0.05), M(0x81d4fa), -1.55, 1.05, -1.18);
  part(u.body, boxGeo(0.1, 2.2, 0.1), M(0x616161), 1.9, 1.4, -1.9);
  part(u.body, boxGeo(0.25, 0.25, 0.9), M(0xff6d00), 1.9, 2.35, -1.4);
  const crate = (x, z, y = 0.65, sz = 0.7) => {
    part(u.body, boxGeo(sz, sz * 0.8, sz), M(0x8d6e63), x, y, z);
    part(u.body, boxGeo(sz + 0.04, 0.12, sz * 0.3), M(0x43a047), x, y, z); // cash band
  };
  if (!bottom) {
    if (level >= 1) for (const [x, z] of [[-1.8, 1.9], [1.8, 1.9], [-1.8, -0.6], [1.8, -0.6]]) part(u.body, boxGeo(0.2, 0.2, 0.2), glow(u, 0x76ff03), x, 0.4, z);
    if (level >= 2) crate(1.2, 1.3);
    if (level >= 3) {
      // Medical Aid: a white tent with a red cross.
      part(u.body, boxGeo(1.2, 1.0, 1.0), white, -0.2, 0.8, -1.7);
      part(u.body, boxGeo(0.5, 0.15, 0.04), M(0xd32f2f), -0.2, 0.9, -1.18);
      part(u.body, boxGeo(0.15, 0.5, 0.04), M(0xd32f2f), -0.2, 0.9, -1.18);
    }
    if (level >= 4) {
      // Tower Economics: a little bank vault with a gold $ sign.
      part(u.body, boxGeo(0.9, 1.3, 0.9), M(0x455a64), 1.0, 0.95, -1.6);
      part(u.body, boxGeo(0.5, 0.5, 0.05), glow(u, 0xffd54f), 1.0, 1.0, -1.13);
    }
    if (level >= 5) {
      // Emergency Airdrop: radar dish on the hut and red beacons.
      part(u.body, boxGeo(0.12, 0.6, 0.12), M(0x616161), -1.55, 1.7, -1.65);
      const dish = part(u.body, boxGeo(1.0, 0.1, 1.0), M(0xeceff1), -1.55, 2.05, -1.65);
      dish.rotation.x = 0.6;
      for (const [x, z] of [[-2.1, 2.1], [2.1, 2.1]]) part(u.body, boxGeo(0.25, 0.25, 0.25), glow(u, 0xff1744), x, 0.45, z);
    }
  } else {
    // More crates every level.
    const spots = [[1.4, 1.6], [1.4, 0.8], [-1.4, 1.6], [-1.4, 0.8], [0.6, -1.4]];
    for (let i = 0; i < Math.min(level, spots.length); i++) crate(spots[i][0], spots[i][1]);
    if (level >= 3) crate(1.4, 1.6, 1.25, 0.6);
    if (level >= 4) for (const x of [-0.2, 0.15]) part(u.body, boxGeo(0.3, 0.2, 0.6), glow(u, 0xffd54f), x, 0.45, -1.5); // gold bars
    if (level >= 5) {
      // Double Crates: the piles get taller.
      crate(-1.4, 0.8, 1.25, 0.6);
      crate(-1.4, 1.6, 1.25, 0.6);
    }
  }
  return u;
}
const makeFarmAirdropBottom = (level) => makeFarmAirdrop(level, true);

/**
 * Electroshocker: a lineman with a shock gun and coil pack. Lv 2 rubber gloves and goggles,
 * Lv 3 a Faraday vest, Lv 4 a big Tesla coil pack, Lv 5 a crackling Zeus cannon.
 */
export function makeElectro(level) {
  const zeus = level >= 4;
  const shirt = zeus ? 0x1a237e : 0xf9a825;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x37474f, arms: level >= 1 ? 0x212121 : shirt, face: 'soldier' });
  const { M } = h;
  const bolt = zeus ? 0xe1f5fe : 0x80d8ff;
  helmet(h, zeus ? 0x283593 : 0xfdd835);
  if (level >= 1) {
    part(h.head, boxGeo(1.25, 0.3, 0.12), M(0x263238), 0, 0.8, 0.63);
    part(h.head, boxGeo(1.0, 0.18, 0.06), glow(h, bolt), 0, 0.8, 0.7);
  }
  if (level >= 2) {
    // Faraday's Vest: a metal mesh vest
    part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x90a4ae), 0, 0.05, 0);
    for (const y of [-0.5, 0, 0.5]) part(h.torso, boxGeo(2.18, 0.06, 1.18), M(0x546e7a), 0, y, 0);
  }
  // Coil pack on the back, taller each level.
  const coil = level >= 3 ? 2.6 : 1.6;
  part(h.torso, boxGeo(1.0, coil, 0.7), M(0x455a64), 0, 0.2 + (coil - 1.6) / 2, -0.85);
  for (let i = 0; i < (level >= 3 ? 4 : 2); i++) part(h.torso, boxGeo(1.2, 0.15, 0.85), M(0xb87333), 0, -0.3 + i * 0.6, -0.85);
  part(h.torso, boxGeo(0.4, 0.4, 0.4), glow(h, bolt), 0, 0.4 + coil, -0.85);
  const gun = holdLongGun(h, zeus ? 1.9 : 1.4, M(zeus ? 0x283593 : 0x424242));
  part(gun, boxGeo(0.5, 0.5, 0.5), M(0xb87333), 0, -0.5, 0); // copper coil
  part(gun, boxGeo(zeus ? 0.6 : 0.4, 0.3, zeus ? 0.6 : 0.4), glow(h, bolt), 0, zeus ? -1.9 : -1.4, 0);
  if (zeus) for (const s of [-1, 1]) part(gun, boxGeo(0.12, 0.8, 0.12), glow(h, bolt), s * 0.35, -1.6, 0);
  h.tracer = bolt;
  return h;
}

/**
 * Missile Rocketeer (alternate Rocketeer form): a heavy weapons trooper with a big tube.
 * Lv 2 a rocket pack, Lv 3 a helmet visor and vest, Lv 4 a heavier launcher, Lv 5 a quad
 * missile pod.
 */
export function makeRocketeerMissile(level) {
  const quad = level >= 4;
  const shirt = quad ? 0x263238 : 0x5d6b3a;
  const h = makeHumanoid({ skin: 0x8d5524, shirt, pants: quad ? 0x1c2429 : 0x3e4a2a, arms: shirt, face: 'soldier' });
  const { M } = h;
  helmet(h, quad ? 0x37474f : 0x4b5320);
  if (level >= 2) {
    part(h.head, boxGeo(1.2, 0.4, 0.08), M(0xff8f00), 0, 0.75, 0.7); // visor
    part(h.torso, boxGeo(2.15, 1.7, 1.15), M(quad ? 0x37474f : 0x4a5232), 0, 0.05, 0);
  }
  if (level >= 1) {
    part(h.torso, boxGeo(1.5, 1.7, 0.7), M(0x4e342e), 0, 0, -0.85);
    for (const x of [-0.4, 0, 0.4]) part(h.torso, boxGeo(0.3, 0.6, 0.3), M(0xeceff1), x, 1.1, -0.85);
  }
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  h.rightArm.add(gun);
  if (quad) {
    // Quad launcher: four tubes in a box.
    part(gun, boxGeo(1.4, 2.6, 1.4), M(0x37474f), 0, -0.8, 0);
    for (const x of [-0.35, 0.35]) for (const z of [-0.35, 0.35]) part(gun, boxGeo(0.5, 0.1, 0.5), glow(h, 0xff3d00), x, -2.12, z);
    setMuzzle(h, gun, 0, -2.2, 0);
  } else {
    const w = level >= 3 ? 1.0 : 0.8;
    const len = level >= 3 ? 3.2 : 2.7;
    part(gun, boxGeo(w, len, w), M(level >= 3 ? 0x33691e : 0x616161), 0, -len / 2 + 0.6, 0);
    part(gun, boxGeo(w + 0.2, 0.35, w + 0.2), M(0x212121), 0, -len + 0.6, 0);
    if (level >= 2) part(gun, boxGeo(0.4, 1.0, 0.4), M(0x212121), 0, -0.8, w / 2 + 0.25);
    setMuzzle(h, gun, 0, -len + 0.4, 0);
  }
  part(gun, boxGeo(0.3, 0.5, 0.3), M(0x212121), 0, -0.3, -0.5); // grip
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.2 };
  h.projectile = quad ? { color: 0xeceff1, size: 0.9 } : { color: 0xff6d00, size: level >= 3 ? 1.3 : 1.1 };
  return h;
}

/**
 * Missile Trooper (alternate Rocketeer form with two paths): a desert-camo trooper with a
 * shoulder launcher. Top path: Lv 1 orange HE warhead, Lv 2 an optic sight, Lv 3 the longer
 * SMAW+ with a visor, Lv 4 a fat warhead, Lv 5 the olive Javelin tube with its sight unit.
 * Bottom path: Lv 1-2 gloves and a rocket bandolier, Lv 3 the green M2 Carl with a front grip,
 * Lv 4 a wider bore, Lv 5 a six-tube MRL pod.
 */
export function makeRocketeerTrooper(level, bottom = false) {
  const top = !bottom;
  const jav = top && level >= 5;
  const mrl = bottom && level >= 5;
  const shirt = mrl ? 0x3b3f2a : jav ? 0x6b5d3f : 0xa08c62;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: mrl ? 0x262a1b : 0x7a6a48, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(0x212121);
  helmet(h, mrl ? 0x2e3322 : 0x8a7a55);
  if ((top && level >= 3) || mrl) part(h.head, boxGeo(1.2, 0.4, 0.08), M(mrl ? 0x76ff03 : 0x4fc3f7), 0, 0.75, 0.7); // visor
  if (level >= 3) part(h.torso, boxGeo(2.15, 1.7, 1.15), M(mrl ? 0x2e3322 : 0x6d6046), 0, 0.05, 0); // vest
  if (bottom && level >= 1) {
    // Gloves, then a bandolier of spare rockets.
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(0.62, 0.45, 0.62), dark, 0, -2.0, 0);
    if (level >= 2) {
      const strap = part(h.torso, boxGeo(0.3, 2.5, 1.18), M(0x4e342e), 0, 0, 0);
      strap.rotation.z = -0.7;
      for (const t of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.25, 0.25, 0.35), M(0xff6d00), t * -0.75, t * -0.8, 0.68);
    }
  }
  // Spare rocket on the back.
  part(h.torso, boxGeo(0.45, 1.6, 0.45), M(0x5d5d4a), 0.5, 0.2, -0.75);
  part(h.torso, boxGeo(0.35, 0.4, 0.35), M(level >= 1 && top ? 0xff6d00 : 0x9e9e9e), 0.5, 1.15, -0.75);

  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  h.rightArm.add(gun);
  if (mrl) {
    // MRL: a 2x3 pod of rocket tubes.
    part(gun, boxGeo(1.7, 2.6, 1.15), M(0x3b3f2a), 0, -0.9, 0);
    for (const x of [-0.5, 0, 0.5]) for (const z of [-0.27, 0.27]) part(gun, boxGeo(0.38, 0.1, 0.38), glow(h, 0xff3d00), x, -2.22, z);
    setMuzzle(h, gun, 0, -2.3, 0);
  } else if (jav) {
    // Javelin: a thick olive tube with the command launch unit on the side.
    part(gun, boxGeo(1.15, 3.6, 1.15), M(0x556b2f), 0, -1.2, 0);
    for (const y of [0.4, -2.8]) part(gun, boxGeo(1.35, 0.35, 1.35), M(0x3d4d21), 0, y, 0);
    part(gun, boxGeo(0.9, 0.9, 0.7), M(0x333333), 0.95, -0.4, 0.2); // launch unit
    part(gun, boxGeo(0.3, 0.3, 0.12), glow(h, 0xff1744), 0.95, -0.4, 0.58);
    setMuzzle(h, gun, 0, -3.0, 0);
  } else {
    const carl = bottom && level >= 3;
    const w = carl ? (level >= 4 ? 1.05 : 0.9) : top && level >= 4 ? 0.9 : 0.75;
    const len = carl ? 3.0 : top && level >= 3 ? 3.2 : 2.6;
    part(gun, boxGeo(w, len, w), M(carl ? 0x2e7d32 : 0x6d6046), 0, -len / 2 + 0.6, 0);
    part(gun, boxGeo(w + 0.2, 0.35, w + 0.2), dark, 0, -len + 0.6, 0);
    if (carl) {
      part(gun, boxGeo(w + 0.25, 0.5, w + 0.25), M(0x1b5e20), 0, 0.4, 0); // venturi
      part(gun, boxGeo(0.25, 0.25, 0.7), dark, 0, -1.2, w / 2 + 0.3); // front grip
    } else if (top && level >= 1) {
      // A warhead poking out of the tube (fatter at Lv 4).
      const hw = level >= 4 ? 0.85 : 0.55;
      part(gun, boxGeo(hw, 0.5, hw), M(0xff6d00), 0, -len + 0.35, 0);
    }
    if (top && level >= 2) part(gun, boxGeo(0.35, 0.9, 0.35), dark, 0, -0.9, w / 2 + 0.2); // optic sight
    setMuzzle(h, gun, 0, -len + 0.3, 0);
  }
  part(gun, boxGeo(0.3, 0.5, 0.3), dark, 0, -0.3, -0.5); // grip
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.2 };
  h.projectile = mrl ? { color: 0xffab40, size: 0.75 } : jav ? { color: 0xeceff1, size: 1.3 } : { color: 0xff6d00, size: level >= 3 ? 1.2 : 1.0 };
  return h;
}
export const makeRocketeerTrooperBottom = (level) => makeRocketeerTrooper(level, true);

/**
 * Trapper: a backwoods trapper in a fur hat with a sack of traps. Lv 2 a spike bandolier,
 * Lv 3 a landmine satchel, Lv 4 a bigger pack, Lv 5 a bear trap on the back.
 */
export function makeTrapper(level) {
  const h = makeHumanoid({ skin: 0xd2a679, shirt: level >= 3 ? 0x4e342e : 0x6d4c41, pants: 0x3e2723, arms: 0x8d6e63, face: 'smile' });
  const { M } = h;
  const fur = M(0x8d6e63);
  part(h.head, boxGeo(1.45, 0.75, 1.45), fur, 0, 1.4, 0); // fur hat
  part(h.head, boxGeo(0.35, 0.35, 1.0), M(0x5d4037), 0, 1.3, -1.0); // tail
  const metal = M(0x90a4ae);
  if (level >= 1) {
    const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), M(0x3e2723), 0, 0, 0);
    strap.rotation.z = 0.7;
    for (const t of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.25, 0.25, 0.3), metal, t * 0.75, t * -0.8, 0.65);
  }
  // Sack on the back, bigger at Lv 4.
  const sack = level >= 3 ? 1.9 : 1.4;
  part(h.torso, boxGeo(sack, sack, 0.8), M(0xa1887f), 0, 0.1, -0.9);
  if (level >= 2) part(h.torso, boxGeo(0.9, 0.7, 0.8), M(0x33402a), 1.25, -0.8, 0); // landmine satchel
  if (level >= 4) {
    // Bear trap strapped to the sack
    part(h.torso, boxGeo(1.5, 0.2, 0.2), metal, 0, 0.6, -1.4);
    part(h.torso, boxGeo(1.5, 0.2, 0.2), metal, 0, -0.4, -1.4);
    for (const x of [-0.6, -0.2, 0.2, 0.6]) part(h.torso, boxGeo(0.12, 0.3, 0.12), metal, x, 0.4, -1.45);
  }
  // A spike trap held in the raised right hand.
  const hand = new THREE.Group();
  hand.position.set(0, -2.1, 0);
  h.rightArm.add(hand);
  part(hand, boxGeo(0.9, 0.15, 0.9), M(0x5d4037), 0, -0.2, 0);
  for (const x of [-0.25, 0.25]) part(hand, boxGeo(0.12, 0.35, 0.12), metal, x, -0.4, 0);
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.6, 0, 0.2);
  h.leftArm.rotation.set(-0.8, 0, -0.3);
  h.pose = { right: -2.6, left: -0.8, leftRecoil: 0 };
  h.swing = 1.8;
  h.projectile = { color: 0x8d6e63, size: 0.7, arc: 3 };
  return h;
}


/**
 * Mine Layer: a combat engineer in olive fatigues and a helmet, holding a mine to throw, with a
 * satchel of mines. Top path: Lv 3 a claymore on the chest and a visor, Lv 4+ black AP gear
 * with a red-striped mine, Lv 5 a glowing mine. Bottom path: Lv 3 a bigger anti-tank mine,
 * Lv 4+ a thermite tank on the back that glows hotter at Lv 5 (X-Mine).
 */
export function makeMineLayer(level, bottom = false) {
  const top = !bottom;
  const ap = top && level >= 4;
  const cloth = ap ? 0x263238 : 0x556b2f;
  const h = makeHumanoid({ skin: 0xc68642, shirt: cloth, pants: ap ? 0x212121 : 0x4b5320, arms: cloth, face: 'soldier' });
  const { M } = h;
  const olive = M(0x33402a);
  const metal = M(0x78909c);
  part(h.head, boxGeo(1.45, 0.55, 1.45), M(ap ? 0x212121 : 0x4b5320), 0, 1.3, 0); // helmet
  if (top && level >= 3) part(h.head, boxGeo(1.2, 0.25, 0.1), glow(h, 0x76ff03), 0, 0.85, 0.66); // night-vision visor
  // Satchel of mines on the hip, bigger from Lv 2.
  const bag = level >= 2 ? 1.0 : 0.8;
  part(h.torso, boxGeo(bag, bag * 0.8, 0.8), M(0x6d5f3a), 1.25, -0.8, 0);
  for (const x of [-0.3, 0.3]) part(h.torso, boxGeo(0.45, 0.2, 0.45), olive, 1.25 + x * 0.4, -0.25, 0); // mines poking out
  if (level >= 1) {
    const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), M(0x3e2723), 0, 0, 0);
    strap.rotation.z = -0.7;
  }
  if (top && level >= 3) {
    // Claymore strapped to the chest
    part(h.torso, boxGeo(1.0, 0.6, 0.25), olive, 0, 0.3, 0.6);
    for (const x of [-0.35, 0.35]) part(h.torso, boxGeo(0.08, 0.3, 0.08), metal, x, -0.1, 0.62);
  }
  if (bottom && level >= 4) {
    // Thermite tank on the back with a glowing core
    part(h.torso, cylGeo(0.55, 0.55, 1.9), M(0x5d4037), 0, 0.1, -0.95);
    part(h.torso, boxGeo(0.35, 1.2, 0.2), glow(h, level >= 5 ? 0xffea00 : 0xff6d00), 0, 0.1, -1.5);
  } else part(h.torso, boxGeo(1.3, 1.3, 0.7), M(0x6d5f3a), 0, 0.1, -0.85); // pack
  // The mine held up in the right hand, ready to throw.
  const hand = new THREE.Group();
  hand.position.set(0, -2.1, 0);
  h.rightArm.add(hand);
  const big = bottom && level >= 3;
  const mineM = level >= 5 && top ? glow(h, 0xff1744) : ap ? M(0x212121) : olive;
  part(hand, cylGeo(big ? 0.65 : 0.5, big ? 0.7 : 0.55, 0.28, 12), mineM, 0, -0.25, 0);
  if (ap) part(hand, cylGeo(0.52, 0.52, 0.06, 12), M(0xd50000), 0, -0.08, 0); // AP stripe
  part(hand, boxGeo(0.18, 0.12, 0.18), glow(h, bottom && level >= 4 ? 0xff9100 : 0xff1744), 0, -0.05, 0); // arming light
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.6, 0, 0.2);
  h.leftArm.rotation.set(-0.8, 0, -0.3);
  h.pose = { right: -2.6, left: -0.8, leftRecoil: 0 };
  h.swing = 1.8;
  h.projectile = { color: bottom && level >= 4 ? 0xff6d00 : ap ? 0x212121 : 0x33402a, size: big ? 0.9 : 0.75, arc: 3 };
  return h;
}
const makeMineLayerBottom = (level) => makeMineLayer(level, true);

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

/**
 * Crook Boss: a gangster in a pinstripe suit and fedora. Lv 2 adds shades and a gold watch,
 * Lv 3 a second pistol, Lv 4 a tommy gun, Lv 5 (The Godfather) a white suit, a cigar, a red
 * rose and a gold tommy gun.
 */
export function makeCrookBoss(level) {
  const don = level >= 4;
  const cloth = don ? 0xeeeeee : 0x263238;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: cloth, pants: don ? 0xe0e0e0 : 0x1c2429, arms: cloth, face: 'soldier' });
  const { M } = h;
  suit(h, don ? 0x212121 : 0xfafafa, don ? 0xb71c1c : 0x8e0000);
  if (!don) {
    // pinstripes
    for (const x of [-0.75, -0.45, 0.45, 0.75]) part(h.torso, boxGeo(0.05, 1.95, 1.02), M(0x546e7a), x, 0, 0);
  }
  fedora(h, don ? 0xfafafa : 0x212121, don ? 0x212121 : 0x8e0000);
  if (level >= 1) {
    // Quick Getaway: dark shades and a gold watch
    part(h.head, boxGeo(1.2, 0.25, 0.08), M(0x111111), 0, 0.68, 0.62);
    part(h.leftArm, boxGeo(1.05, 0.25, 1.05), M(0xd4af37), 0, -1.5, 0);
  }
  if (don) {
    part(h.head, boxGeo(0.12, 0.12, 0.5), M(0x5d4037), 0.25, 0.25, 0.75); // cigar
    part(h.head, boxGeo(0.13, 0.13, 0.08), glow(h, 0xff6d00), 0.25, 0.25, 1.0);
    part(h.torso, boxGeo(0.3, 0.3, 0.12), M(0xd50000), 0.65, 0.6, 0.55); // rose
    part(h.torso, boxGeo(2.1, 0.2, 1.1), M(0xd4af37), 0, -0.85, 0); // gold belt
  }
  let muzzles;
  if (level >= 3) {
    // Tommy Goons: the boss himself carries a tommy gun (gold at The Godfather)
    muzzles = [addTommyGun(h, h.rightArm, don)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
    h.recoilScale = 0.4;
  } else if (level >= 2) {
    // Double Trouble: a pistol in each hand
    muzzles = [addPistol(h, h.rightArm, false), addPistol(h, h.leftArm, false)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.05);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
  } else {
    muzzles = [addPistol(h, h.rightArm, false)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
    h.leftArm.rotation.set(-0.3, 0, -0.15);
    h.pose = { right: -Math.PI / 2, left: -0.3, leftRecoil: 0 };
  }
  h.muzzles = muzzles;
  h.tracer = don ? 0xffd740 : 0xffca28;
  return h;
}

/** A goon on foot: pistolgoon (flat cap, pistol), tommygoon (fedora, tommy gun), dongoon (bigger, red tie, armored vest). */
export function makeGoon(model) {
  if (model.startsWith('mgoon') || model.startsWith('agent')) return makeMobGoon(model);
  const tommy = model !== 'pistolgoon';
  const made = model === 'dongoon';
  const coat = made ? 0x1a1a1a : tommy ? 0x37474f : 0x5d4037;
  const h = makeHumanoid({ skin: 0xd7a26b, shirt: coat, pants: 0x212121, arms: coat, face: 'soldier' });
  suit(h, 0xeeeeee, made ? 0xd50000 : tommy ? 0x1a237e : 0x3e2723);
  if (tommy) fedora(h, made ? 0x111111 : 0x455a64, made ? 0xd50000 : 0x212121);
  else {
    const cap = h.M(0x795548);
    part(h.head, boxGeo(1.35, 0.35, 1.35), cap, 0, 1.3, 0); // flat cap
    part(h.head, boxGeo(1.2, 0.12, 0.5), cap, 0, 1.15, 0.75);
  }
  if (made) part(h.torso, boxGeo(2.15, 1.5, 1.12), h.M(0x424242), 0, 0.1, 0); // armored vest
  if (tommy) {
    h.muzzles = [addTommyGun(h, h.rightArm, false)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  } else {
    h.muzzles = [addPistol(h, h.rightArm, false)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
  }
  return h;
}

/**
 * Mobster helpers. mgoon: a street thug in a beanie with a pistol; mgoon2: a leather jacket and
 * a tommy gun; mgoon3: a red suit, fedora and a gold tommy gun. agent / agent2 / agent3: black
 * suits and shades with a pistol, then a tommy gun, then a gold one and a glowing earpiece.
 */
export function makeMobGoon(model) {
  const agent = model.startsWith('agent');
  const tier = Number(model.slice(-1)) || 1;
  const coat = agent ? 0x111111 : [0x4e342e, 0x3e2723, 0x8e0000][tier - 1];
  const h = makeHumanoid({ skin: 0xd7a26b, shirt: coat, pants: agent ? 0x111111 : 0x263238, arms: coat, face: 'soldier' });
  const { M } = h;
  suit(h, agent ? 0xfafafa : tier === 3 ? 0x111111 : 0x9e9e9e, agent ? 0x111111 : tier === 3 ? 0xd4af37 : 0x3e2723);
  if (agent) {
    part(h.head, boxGeo(1.2, 0.25, 0.08), M(0x050505), 0, 0.68, 0.62); // shades
    part(h.head, boxGeo(0.12, 0.3, 0.12), tier >= 3 ? glow(h, 0x40c4ff) : M(0x212121), 0.66, 0.5, 0); // earpiece
  } else if (tier === 1) {
    part(h.head, boxGeo(1.35, 0.5, 1.35), M(0x424242), 0, 1.25, 0); // beanie
  } else if (tier === 2) {
    part(h.head, boxGeo(1.35, 0.35, 1.35), M(0x212121), 0, 1.3, 0); // flat cap
    part(h.head, boxGeo(1.2, 0.12, 0.5), M(0x212121), 0, 1.15, 0.75);
  } else fedora(h, 0x111111, 0xd4af37);
  if (tier >= 2) {
    h.muzzles = [addTommyGun(h, h.rightArm, tier >= 3)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  } else {
    h.muzzles = [addPistol(h, h.rightArm, false)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
  }
  return h;
}

/**
 * Minigunner (alternate Commando form): a heavy gunner with one huge minigun held in both hands.
 * Lv 2 gloves and knee pads, Lv 3 a tech visor and ammo pack, Lv 4 armor and a bigger gun,
 * Lv 5 a futuristic suit with a glowing purple minigun.
 */
export function makeMinigunner(level) {
  const future = level >= 4;
  const shirt = future ? 0x1c1726 : 0x5d6b3a;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: future ? 0x14101c : 0x3e3a2a, arms: shirt, face: 'soldier' });
  const { M } = h;
  h.body.scale.setScalar(1.1); // a big guy for a big gun
  const shard = glow(h, 0xb388ff);
  const dark = M(0x212121);
  // Beanie with the shard emblem (a helmet once geared up)
  const hat = M(future ? 0x263238 : level >= 3 ? 0x4b5320 : 0x37474f);
  part(h.head, boxGeo(1.4, level >= 3 ? 0.55 : 0.45, 1.4), hat, 0, 1.25, 0);
  part(h.head, boxGeo(0.3, 0.3, 0.06), shard, 0, 1.25, 0.72);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, -0.55, 0.45, 0.52); // chest emblem
  if (level >= 1) {
    // Improved Handling: gloves and knee pads
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.05, 0.5, 1.05), dark, 0, -1.75, 0);
    for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.05, 0.4, 0.3), dark, 0, -1.2, 0.45);
  }
  if (level >= 2) {
    // Specialized Tech: a visor and an ammo backpack with a feed belt
    part(h.head, boxGeo(1.2, 0.3, 0.2), dark, 0, 0.72, 0.68);
    part(h.head, boxGeo(1.0, 0.18, 0.05), future ? shard : glow(h, 0x40c4ff), 0, 0.72, 0.79);
    part(h.torso, boxGeo(1.7, 1.9, 0.9), M(future ? 0x263238 : 0x4e4a3a), 0, 0, -0.95);
    part(h.torso, boxGeo(0.3, 0.3, 1.3), M(0xc9a227), 0.85, -0.6, -0.4);
  }
  if (level >= 3) {
    // Geared Up: armored vest and shoulder plates
    part(h.torso, boxGeo(2.2, 1.6, 1.2), M(future ? 0x2a2235 : 0x556b2f), 0, 0.1, 0);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.15, 0.6, 1.15), M(future ? 0x2a2235 : 0x4b5320), 0, -0.2, 0);
  }
  if (future) part(h.torso, boxGeo(0.5, 0.5, 0.1), shard, 0, 0.3, 0.62); // glowing core

  // One huge minigun on the right arm, the left hand on its carry handle.
  const big = level >= 3 ? 1.25 : 1.1;
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  gun.scale.setScalar(big);
  h.rightArm.add(gun);
  const body = M(future ? 0x37474f : 0x424242);
  part(gun, boxGeo(0.8, 1.2, 0.85), body, 0, -0.5, 0);
  part(gun, boxGeo(0.25, 0.8, 0.25), dark, 0, -0.5, 0.55); // carry handle
  part(gun, boxGeo(0.45, 0.5, 0.9), M(0x3a3a3a), 0, -0.2, -0.7); // ammo feed
  const barrels = new THREE.Group();
  barrels.position.set(0, -1.1, 0);
  gun.add(barrels);
  const barrelMat = future ? shard : M(0x1f1f1f);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    part(barrels, boxGeo(0.15, 1.9, 0.15), barrelMat, Math.cos(a) * 0.27, -0.95, Math.sin(a) * 0.27);
  }
  for (const y of [-0.4, -1.7]) part(barrels, boxGeo(0.7, 0.12, 0.7), body, 0, y, 0); // barrel clamps
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -3.1, 0);
  gun.add(muzzle);
  h.muzzles = [muzzle];
  h.spin = [barrels];
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.1 };
  h.recoilScale = 0.2;
  h.tracer = future ? 0xb388ff : 0xffd740;
  return h;
}

/**
 * Ranger (alternate Railgunner form): a long-range marksman in a wide hat and duster coat.
 * Lv 2 a bandolier, Lv 3 a radio pack, Lv 4 an outlaw bandana and darker coat,
 * Lv 5 the Experimental Weapon of Destruction: a huge glowing purple cannon rifle.
 */
export function makeRanger(level) {
  const ewd = level >= 4;
  const outlaw = level >= 3;
  const coat = outlaw ? 0x3e2723 : 0x8d6e63;
  const h = makeHumanoid({ skin: 0xc68642, shirt: coat, pants: outlaw ? 0x212121 : 0x5d4037, arms: coat, face: 'soldier' });
  const { M } = h;
  const shard = glow(h, 0xb388ff);
  const dark = M(0x1a1a1a);
  // Wide-brim ranger hat with the shard band
  const hat = M(outlaw ? 0x212121 : 0x6d4c41);
  part(h.head, boxGeo(1.4, 0.55, 1.4), hat, 0, 1.35, 0);
  part(h.head, boxGeo(2.1, 0.1, 2.1), hat, 0, 1.08, 0);
  part(h.head, boxGeo(1.45, 0.15, 1.45), shard, 0, 1.15, 0);
  part(h.torso, boxGeo(2.15, 1.0, 1.2), M(outlaw ? 0x2b1d18 : 0x795548), 0, -0.6, 0); // duster coat tails
  if (level >= 1) {
    // Faster Reloading: a bandolier of big rounds
    const belt = part(h.torso, boxGeo(0.35, 2.2, 1.15), M(0x4e342e), 0, 0, 0);
    belt.rotation.z = -0.7;
    for (const y of [-0.5, 0, 0.5]) part(h.torso, boxGeo(0.14, 0.32, 0.14), M(0xd4af37), -y * 0.8, y, 0.62);
  }
  if (level >= 2) {
    // Intelligence Radio: a radio backpack with a tall antenna and a blinking light
    part(h.torso, boxGeo(1.4, 1.6, 0.7), M(0x455a64), 0, 0, -0.85);
    part(h.torso, boxGeo(0.1, 2.2, 0.1), dark, 0.5, 1.8, -0.9);
    part(h.torso, boxGeo(0.25, 0.25, 0.25), glow(h, 0xff5252), 0.5, 2.9, -0.9);
    part(h.head, boxGeo(0.15, 0.5, 0.45), dark, -0.68, 0.65, 0); // headset
  }
  if (outlaw) part(h.head, boxGeo(1.3, 0.45, 0.15), M(0x7f0000), 0, 0.4, 0.66); // bandana

  const len = ewd ? 4.2 : 3.6;
  const gun = holdLongGun(h, len, M(ewd ? 0x263238 : 0x5d4037));
  part(gun, boxGeo(0.26, 1.3, 0.32), dark, 0, -0.9, 0.38); // scope
  part(gun, boxGeo(0.35, 0.6, 0.45), M(ewd ? 0x1c1726 : 0x4e342e), 0, 0.2, -0.05); // stock
  if (ewd) {
    // Experimental Weapon of Destruction: a fat cannon barrel wrapped in glowing coils
    part(gun, boxGeo(0.75, 2.4, 0.75), M(0x37474f), 0, -len + 1.1, 0);
    for (let i = 0; i < 4; i++) part(gun, boxGeo(0.85, 0.12, 0.85), shard, 0, -len + 0.2 + i * 0.55, 0);
    part(gun, boxGeo(0.6, 0.8, 0.6), M(0x455a64), 0, -0.4, -0.45); // power cell
    part(gun, boxGeo(0.3, 0.5, 0.1), shard, 0, -0.4, -0.76);
  } else {
    part(gun, boxGeo(0.18, 0.6, 0.18), dark, 0, -len - 0.2, 0); // muzzle brake
  }
  h.muzzles[0].position.y = -len - 0.4;
  h.tracer = ewd ? 0xb388ff : 0xffe082;
  h.tracerWidth = ewd ? 0.4 : 0.28;
  return h;
}

// ------------------------------------------------------------------ Pursuit & Gatling Gun

/**
 * The Pursuit's helicopter (faces +Z). `bank` tilts, `prop` (main rotor) and `tail` (tail
 * rotor) spin. Lv 2 AP ammo, Lv 3 a radar dome, Lv 4 missile pods. Top path: a grey gunship
 * with a chin minigun (Lv 5) and a huge black-and-red Leviathan (Lv 6). Bottom path: a desert
 * gunship with a sensor ball and big pods (Lv 5), and a dark Demolition Gunship (Lv 6).
 */
export function makeHeli(h, level, bottom, look = null) {
  const { M } = h;
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
  const top = level >= 4 && !bottom;
  const bot = level >= 4 && bottom;
  const big = level >= 5;
  // look: { color, trim } overrides the paint (Helicopter, the alternate Pursuit).
  const color = look?.color ?? (top ? (big ? 0x1c1c1c : 0x607d8b) : bot ? (big ? 0x263238 : 0xc2a46b) : 0x556b2f);
  const trimC = look?.trim ?? (top && big ? 0xd50000 : bot && big ? 0xff6d00 : 0x37474f);
  const body = M(color);
  const trim = big ? glow(h, trimC) : M(trimC);
  const dark = M(0x212121);
  if (big) bank.scale.setScalar(1.25);

  part(bank, boxGeo(2.2, 2.0, 4.2), body, 0, 0, 0.3); // cabin
  part(bank, boxGeo(1.8, 1.3, 1.2), body, 0, -0.2, 2.8); // nose
  part(bank, boxGeo(1.7, 0.9, 1.0), M(0x81d4fa), 0, 0.45, 2.4); // windscreen
  part(bank, boxGeo(0.7, 0.7, 4.5), body, 0, 0.4, -3.8); // tail boom
  part(bank, boxGeo(0.15, 1.6, 1.0), body, 0, 1.1, -5.9); // tail fin
  part(bank, boxGeo(1.8, 0.12, 0.6), body, 0, 0.4, -5.4); // tail wings
  part(bank, boxGeo(2.3, 0.15, 0.5), trim, 0, -0.4, 0.3); // stripe
  for (const x of [-0.9, 0.9]) part(bank, boxGeo(0.15, 0.15, 3.6), dark, x, -1.35, 0.4); // skids
  for (const x of [-0.9, 0.9]) for (const z of [-0.6, 1.4]) part(bank, boxGeo(0.12, 0.4, 0.12), dark, x, -1.1, z);

  // Main rotor on a mast, tail rotor on the fin.
  part(bank, boxGeo(0.4, 0.6, 0.4), dark, 0, 1.3, 0.3);
  const prop = new THREE.Group();
  prop.position.set(0, 1.65, 0.3);
  bank.add(prop);
  const bladeM = M(0x2b2b2b);
  for (let i = 0; i < (big ? 4 : 2); i++) part(prop, boxGeo(0.35, 0.08, 9), bladeM, 0, 0, 0).rotation.y = (i * Math.PI) / (big ? 4 : 2);
  const tail = new THREE.Group();
  tail.position.set(0.15, 1.1, -5.9);
  bank.add(tail);
  part(tail, boxGeo(0.08, 2.0, 0.25), bladeM, 0, 0, 0);
  part(tail, boxGeo(0.08, 0.25, 2.0), bladeM, 0, 0, 0);

  // Nose gun(s)
  const guns = top ? 2 : 1;
  const spin = [];
  for (let g = 0; g < guns; g++) {
    const x = guns > 1 ? (g ? 1.25 : -1.25) : 0;
    const y = guns > 1 ? -0.7 : -1.0;
    const gun = new THREE.Group();
    gun.position.set(x, y, 2.6);
    bank.add(gun);
    part(gun, boxGeo(0.5, 0.5, 0.7), dark, 0, 0, 0);
    if (top) {
      // Sky Shredder: spinning minigun barrels
      const barrels = new THREE.Group();
      barrels.position.set(0, 0, 0.4);
      barrels.rotation.x = Math.PI / 2;
      gun.add(barrels);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        part(barrels, boxGeo(0.09, 1.6, 0.09), big ? trim : dark, Math.cos(a) * 0.17, 0.8, Math.sin(a) * 0.17);
      }
      spin.push(barrels);
    } else part(gun, boxGeo(0.18, 0.18, 1.4), dark, 0, 0, 0.9);
    point(x, y, 3.9, muzzles);
  }
  h.spin = spin.length ? spin : null;

  if (level >= 1) {
    // AP Rounds: an ammo box and a belt feeding the gun
    part(bank, boxGeo(0.8, 0.6, 0.8), M(0x4e5b31), 1.2, -0.7, 1.6);
    part(bank, boxGeo(0.4, 0.15, 0.6), M(0xc9a227), 0.75, -0.9, 2.1);
  }
  if (level >= 2) {
    // Enhanced Radar: a radar dome over the cockpit and an antenna
    part(bank, boxGeo(1.0, 0.5, 1.0), M(0xeceff1), 0, 1.3, 1.6);
    part(bank, boxGeo(0.08, 1.2, 0.08), dark, -0.8, 1.5, -0.8);
    part(bank, boxGeo(0.25, 0.15, 0.08), glow(h, 0x76ff03), -0.8, 2.1, -0.8);
  }
  if (level >= 3) {
    // Air to Ground Missiles: stub wings with missile pods (more pods on the Bottom path)
    const pods = bot ? (big ? 3 : 2) : 1;
    for (const side of [-1, 1]) {
      part(bank, boxGeo(1.6 + pods * 0.4, 0.15, 0.9), body, side * (1.7 + pods * 0.2), -0.2, 0.2);
      for (let k = 0; k < pods; k++) {
        const x = side * (1.9 + k * 0.6);
        part(bank, boxGeo(0.45, 0.45, 1.6), M(bot ? 0x5d4037 : 0x37474f), x, -0.55, 0.3);
        part(bank, boxGeo(0.3, 0.3, 0.1), glow(h, 0xff3d00), x, -0.55, 1.12);
        point(x, -0.55, 1.2, missiles);
      }
    }
  }
  if (bot) {
    // Modified Payload: a sensor ball under the nose (hidden detection)
    part(bank, boxGeo(0.8, 0.8, 0.8), dark, 0, -1.1, 3.1);
    part(bank, boxGeo(0.4, 0.4, 0.1), glow(h, 0x00e5ff), 0, -1.1, 3.52);
  }
  const bay = new THREE.Object3D();
  bay.position.set(0, -1.2, 0.3);
  bank.add(bay);
  heli.userData = { bank, prop, tail, bay, missiles };
  return { heli, muzzles };
}

/** Pursuit tower: a helipad with a little control hut, plus the helicopter the view flies around. */
export function makePursuitModel(level, bottom) {
  const u = makeThing();
  const { M } = u;
  part(u.body, boxGeo(4, 0.3, 4), M(0x757575), 0, 0.15, 0); // concrete pad
  const yellow = M(0xfdd835);
  part(u.body, boxGeo(0.35, 0.05, 2.0), yellow, -0.6, 0.32, 0); // the "H"
  part(u.body, boxGeo(0.35, 0.05, 2.0), yellow, 0.6, 0.32, 0);
  part(u.body, boxGeo(0.9, 0.05, 0.35), yellow, 0, 0.32, 0);
  for (const [x, z] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) part(u.body, boxGeo(0.25, 0.25, 0.25), glowThing(u, 0xff9100), x, 0.45, z);
  part(u.body, boxGeo(0.12, 2.6, 0.12), M(0xbdbdbd), 1.7, 1.6, -1.7); // windsock pole
  part(u.body, boxGeo(0.4, 0.4, 1.0), M(0xff6d00), 1.7, 2.7, -1.25);
  if (level >= 2) {
    // Radar: a dish beside the pad
    part(u.body, boxGeo(0.2, 1.2, 0.2), M(0x616161), -1.7, 0.9, -1.7);
    part(u.body, boxGeo(1.1, 0.8, 0.12), M(0xeceff1), -1.7, 1.7, -1.7).rotation.y = 0.7;
  }
  if (level >= 3) {
    // Missile rack
    for (const z of [1.2, 1.6]) part(u.body, boxGeo(1.2, 0.25, 0.25), M(0x37474f), -1.4, 0.5, z);
  }
  if (level >= 4) part(u.body, boxGeo(0.06, 0.8, 1.2), M(bottom ? 0xff6d00 : 0xd50000), 1.7, 2.2, -1.1); // path flag
  const { heli, muzzles } = makeHeli(u, level, bottom);
  u.plane = heli;
  u.heli = true;
  u.muzzles = muzzles;
  u.spin = u.spin ?? null;
  u.flyHeight = 13;
  u.tracer = level >= 5 && !bottom ? 0xff5252 : 0xffd740;
  return u;
}
export const makePursuit = (level) => makePursuitModel(level, false);

/**
 * Helicopter (alternate Pursuit form): a dark helipad with a fuel tank and hangar, plus the
 * helicopter. Top path: olive Huey (Lv 4), green Apache gunship (Lv 5), black-and-red War Apache
 * (Lv 6). Bottom path: grey AH-1Z Viper (Lv 4-5), then a black Stealth Comanche with purple trim.
 */
export function makeHelicopterModel(level, bottom) {
  const u = makeThing();
  const { M } = u;
  part(u.body, boxGeo(4.4, 0.3, 4.4), M(0x37474f), 0, 0.15, 0); // asphalt pad
  part(u.body, boxGeo(3.6, 0.04, 3.6), M(0x455a64), 0, 0.31, 0);
  const white = M(0xfafafa);
  part(u.body, boxGeo(0.35, 0.05, 2.0), white, -0.6, 0.34, 0); // the "H"
  part(u.body, boxGeo(0.35, 0.05, 2.0), white, 0.6, 0.34, 0);
  part(u.body, boxGeo(0.9, 0.05, 0.35), white, 0, 0.34, 0);
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) part(u.body, boxGeo(0.25, 0.25, 0.25), glowThing(u, 0xff1744), x, 0.45, z);
  part(u.body, boxGeo(0.9, 1.4, 0.9), M(0xc62828), 1.8, 1.0, -1.8); // fuel tank
  part(u.body, boxGeo(0.95, 0.15, 0.95), M(0x212121), 1.8, 1.75, -1.8);
  if (level >= 3) {
    // Rearm crates by the pad
    for (const z of [1.3, 1.9]) part(u.body, boxGeo(1.0, 0.45, 0.5), M(0x4e5b31), -1.7, 0.5, z);
  }
  if (level >= 1) part(u.body, boxGeo(0.06, 0.8, 1.2), M(bottom ? 0x546e7a : 0x2e7d32), -1.9, 1.2, -1.6); // path flag
  if (level >= 1) part(u.body, boxGeo(0.12, 1.9, 0.12), M(0xbdbdbd), -1.9, 1.0, -2.1);
  const big = level >= 5;
  const look = bottom
    ? { color: big ? 0x1a1a1a : 0x546e7a, trim: big ? 0xd500f9 : 0x263238 }
    : { color: big ? 0x1b1b1b : level >= 4 ? 0x33691e : 0x6b7d3a, trim: big ? 0xd50000 : 0x263238 };
  const { heli, muzzles } = makeHeli(u, level, bottom && level >= 3, look);
  u.plane = heli;
  u.heli = true;
  u.muzzles = muzzles;
  u.spin = u.spin ?? null;
  u.flyHeight = 13;
  u.tracer = big ? (bottom ? 0xea80fc : 0xff5252) : 0xffd740;
  return u;
}
export const makeHelicopter = (level) => makeHelicopterModel(level, false);

/**
 * Cryo Helicopter (event): a frosty helipad with an ice tank, plus a white-and-blue helicopter.
 * Lv 3 Cryo Missile pods (from makeHeli), Lv 4 a sensor ball and more pods, Lv 5 the big Mi-Ice
 * Hind with four rotor blades and glowing ice-blue trim.
 */
export function makeCryoHeli(level) {
  const u = makeThing();
  const { M } = u;
  const ice = 0x80d8ff;
  part(u.body, boxGeo(4.4, 0.3, 4.4), M(0xcfd8dc), 0, 0.15, 0); // frosted pad
  part(u.body, boxGeo(3.6, 0.04, 3.6), M(0xe1f5fe), 0, 0.31, 0);
  const blue = M(0x0288d1);
  part(u.body, boxGeo(0.35, 0.05, 2.0), blue, -0.6, 0.34, 0); // the "H"
  part(u.body, boxGeo(0.35, 0.05, 2.0), blue, 0.6, 0.34, 0);
  part(u.body, boxGeo(0.9, 0.05, 0.35), blue, 0, 0.34, 0);
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) part(u.body, boxGeo(0.25, 0.25, 0.25), glowThing(u, ice), x, 0.45, z);
  part(u.body, boxGeo(0.9, 1.6, 0.9), M(0xb0bec5), 1.8, 1.1, -1.8); // coolant tank
  part(u.body, boxGeo(0.6, 1.0, 0.1), glowThing(u, ice), 1.8, 1.1, -1.33);
  if (level >= 3) for (const z of [1.3, 1.9]) part(u.body, boxGeo(1.0, 0.45, 0.5), M(0x90a4ae), -1.7, 0.5, z); // missile crates
  const big = level >= 5;
  const { heli, muzzles } = makeHeli(u, level, true, { color: big ? 0x01579b : 0xeceff1, trim: big ? 0x40c4ff : 0x0288d1 });
  u.plane = heli;
  u.heli = true;
  u.muzzles = muzzles;
  u.spin = u.spin ?? null;
  u.flyHeight = 13;
  u.tracer = ice;
  u.tracerWidth = 0.35;
  return u;
}
export const makeHelicopterBottom = (level) => makeHelicopterModel(level, true);

/**
 * Mobster: a gangster in a vest and flat cap. Top path: an ammo belt (Lv 2), a cigar (Lv 3), two
 * Mac 10s (Lv 4), an armored vest (Lv 5), then a red suit and a gold tommy gun (Lv 6). Bottom
 * path: a long-barrel pistol (Lv 2), tactical visors (Lv 3), a trench coat and fedora (Lv 4),
 * a briefcase of cash (Lv 5), then the Mafia Boss in a white suit with a gold pistol (Lv 6).
 */
export function makeMobsterModel(level, bottom) {
  const boss = bottom && level >= 5;
  const army = !bottom && level >= 5;
  const coat = boss ? 0xeeeeee : army ? 0x8e0000 : bottom && level >= 3 ? 0x5d4037 : 0x455a64;
  const h = makeHumanoid({ skin: 0xd7a26b, shirt: coat, pants: boss ? 0xe0e0e0 : 0x212121, arms: coat, face: 'soldier' });
  const { M } = h;
  suit(h, boss ? 0x212121 : 0xeeeeee, boss ? 0xd4af37 : army ? 0x111111 : 0x37474f);
  if (boss || army || (bottom && level >= 3)) fedora(h, boss ? 0xfafafa : 0x212121, boss ? 0xd4af37 : 0x8e0000);
  else {
    const cap = M(0x37474f);
    part(h.head, boxGeo(1.35, 0.35, 1.35), cap, 0, 1.3, 0); // flat cap
    part(h.head, boxGeo(1.2, 0.12, 0.5), cap, 0, 1.15, 0.75);
  }
  if (!bottom && level >= 1) part(h.torso, boxGeo(0.3, 2.2, 1.12), M(0xc9a227), 0.5, 0.1, 0).rotation.z = 0.6; // ammo belt
  if (!bottom && level >= 2 || boss) {
    part(h.head, boxGeo(0.12, 0.12, 0.5), M(0x5d4037), 0.25, 0.25, 0.75); // cigar
    part(h.head, boxGeo(0.13, 0.13, 0.08), glow(h, 0xff6d00), 0.25, 0.25, 1.0);
  }
  if (!bottom && level >= 4) part(h.torso, boxGeo(2.15, 1.5, 1.12), M(0x424242), 0, 0.1, 0); // armored vest
  if (bottom && level >= 2) part(h.head, boxGeo(1.25, 0.3, 0.1), glow(h, 0x76ff03), 0, 0.7, 0.62); // tactical visors
  if (bottom && level >= 4) {
    // Life Insurance: a briefcase of cash in the left hand
    part(h.leftArm, boxGeo(0.4, 0.9, 1.2), M(boss ? 0xd4af37 : 0x3e2723), 0, -2.2, 0);
    part(h.leftArm, boxGeo(0.42, 0.3, 0.6), M(0x2e7d32), 0, -1.75, 0);
  }
  let muzzles;
  if (army) {
    muzzles = [addTommyGun(h, h.rightArm, true)];
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
    h.recoilScale = 0.4;
  } else if (!bottom && level >= 3) {
    // Mac 10: an SMG in each hand
    muzzles = [addPistol(h, h.rightArm, false), addPistol(h, h.leftArm, false)];
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(0.3, 0.6, 0.3), M(0x212121), 0, -2.6, 0.25); // magazines
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.05);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
  } else {
    muzzles = [addPistol(h, h.rightArm, boss)];
    if (bottom && level >= 1) {
      // Extended Barrel
      part(h.rightArm, boxGeo(0.2, 0.8, 0.2), M(boss ? 0xd4af37 : 0x2b2b2b), 0, -3.1, 0);
      muzzles[0].position.y -= 0.8;
    }
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
    h.leftArm.rotation.set(bottom && level >= 4 ? 0 : -0.3, 0, -0.15);
    h.pose = { right: -Math.PI / 2, left: bottom && level >= 4 ? 0 : -0.3, leftRecoil: 0 };
  }
  h.muzzles = muzzles;
  h.tracer = boss || army ? 0xffd740 : 0xffca28;
  return h;
}
export const makeMobster = (level) => makeMobsterModel(level, false);
export const makeMobsterBottom = (level) => makeMobsterModel(level, true);

/**
 * Behemoth Factory / War Machine Factory: a big steel hangar with warning stripes and the
 * factory's current unit parked out front. `kind` is 'behemoth' or 'war'.
 */
export function makeHeavyFactory(level, bottom, kind) {
  const u = makeThing();
  const { M } = u;
  const war = kind === 'war';
  part(u.body, boxGeo(4.6, 0.3, 4.6), M(0x616161), 0, 0.15, 0);
  const wall = M(war ? 0x37474f : 0x4e5b31);
  for (const x of [-2.1, 2.1]) part(u.body, boxGeo(0.4, war ? 4.6 : 3.8, 3.6), wall, x, war ? 2.3 : 1.9, -0.4);
  part(u.body, boxGeo(4.6, 0.5, 3.8), M(0x263238), 0, war ? 4.8 : 4.0, -0.4); // roof
  part(u.body, boxGeo(4.0, 0.3, 0.1), glow(u, war ? 0xff6d00 : 0xffc400), 0, war ? 4.45 : 3.65, 1.5);
  for (let i = 0; i < 5; i++) part(u.body, boxGeo(0.4, 0.3, 0.12), M(i % 2 ? 0x212121 : 0xfdd835), -1.6 + i * 0.8, 0.45, 2.2); // warning stripes
  part(u.body, boxGeo(0.7, 1.6, 0.7), M(0x455a64), 1.7, (war ? 5.0 : 4.2) + 0.8, -1.6); // smokestack
  if (level >= 1) part(u.body, boxGeo(0.06, 0.9, 1.3), M(bottom ? 0x1e88e5 : 0xd50000), -1.8, (war ? 5.6 : 4.8), -1.4); // path flag
  if (level >= 3) part(u.body, boxGeo(1.6, 0.6, 1.6), M(0x37474f), 0, (war ? 5.35 : 4.55), -0.6); // roof crane housing
  const model = war
    ? bottom && level >= 3 ? ['warmachine', 'warmachine2', 'warmachine3'][level - 3] : `walker${level >= 2 && !bottom ? level : ''}`
    : bottom && level >= 3 ? ['laserbehemoth', 'laserbehemoth2', 'laserbehemoth3'][level - 3] : ['behemoth', 'behemoth', 'behemoth2', 'behemoth3', 'behemoth4', 'mammoth'][bottom ? 0 : level];
  const v = makeUnit(model);
  const fit = 3.9 / Math.max(v.height, 3);
  v.root.scale.setScalar(Math.min(war ? 0.55 : model === 'mammoth' ? 0.3 : 0.4, fit));
  v.root.position.set(0, 0.3, 0.4);
  u.body.add(v.root);
  u.mats.push(...v.mats);
  return u;
}
export const makeBehemothFactory = (level) => makeHeavyFactory(level, false, 'behemoth');
export const makeBehemothFactoryBottom = (level) => makeHeavyFactory(level, true, 'behemoth');
export const makeWarMachineFactory = (level) => makeHeavyFactory(level, false, 'war');
export const makeWarMachineFactoryBottom = (level) => makeHeavyFactory(level, true, 'war');
export const makePursuitBottom = (level) => makePursuitModel(level, true);

/**
 * Gatling Gun: a gun on a turret mount. Lv 2 an ammo belt, Lv 3 a drum magazine, Lv 4 a second
 * barrel and a scope, Lv 5 a real six-barrel Gatling, Lv 6 a sandbagged concrete fortress,
 * Lv 7 DOOM: black steel with glowing red vents and a huge barrel cluster.
 */
export function makeGatling(level) {
  const u = makeThing();
  const { M } = u;
  const doom = level >= 6;
  const metal = M(doom ? 0x1a1a1a : level >= 4 ? 0x455a64 : 0x5d6b3a);
  const dark = M(0x212121);
  const red = doom ? glowThing(u, 0xff1744) : null;
  if (level >= 5) {
    // Impenetrable Fortress: concrete walls with sandbags on top, open at the front
    const wall = M(doom ? 0x37373f : 0x9e9e9e);
    const bag = M(0xa1887f);
    part(u.body, boxGeo(4.2, 1.6, 0.6), wall, 0, 0.8, -1.8);
    for (const side of [-1, 1]) part(u.body, boxGeo(0.6, 1.6, 3.6), wall, side * 1.8, 0.8, 0);
    for (const x of [-1.4, -0.45, 0.45, 1.4]) part(u.body, boxGeo(0.9, 0.45, 0.7), bag, x, 1.8, -1.8);
    for (const side of [-1, 1]) for (const z of [-0.9, 0, 0.9]) part(u.body, boxGeo(0.7, 0.45, 0.85), bag, side * 1.8, 1.8, z);
    if (doom) for (const side of [-1, 1]) part(u.body, boxGeo(0.1, 0.3, 2.8), red, side * 1.5, 1.2, 0); // glowing vents
  }
  // Mount: a heavy tripod with a swivel post
  part(u.body, boxGeo(1.6, 0.3, 1.6), dark, 0, 0.15, 0);
  part(u.body, boxGeo(0.5, 1.8, 0.5), metal, 0, 1.1, 0);
  const gun = new THREE.Group();
  gun.position.set(0, 2.3, 0);
  u.body.add(gun);
  const size = level >= 6 ? 1.5 : level >= 4 ? 1.25 : 1;
  gun.scale.setScalar(size);
  part(gun, boxGeo(1.0, 0.9, 1.8), metal, 0, 0, -0.2); // receiver
  part(gun, boxGeo(0.25, 0.6, 0.3), dark, 0, -0.4, -1.0); // grip
  part(gun, boxGeo(1.6, 1.2, 0.12), M(doom ? 0x263238 : 0x6b7a4a), 0, 0.35, 0.75); // gun shield
  u.muzzles = [];
  const muzzle = (x, y, z) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    gun.add(m);
    u.muzzles.push(m);
  };
  if (level >= 4) {
    // Minigun Barrel: six spinning barrels (a big cluster of nine at DOOM)
    const barrels = new THREE.Group();
    barrels.position.set(0, 0, 0.7);
    barrels.rotation.x = Math.PI / 2;
    gun.add(barrels);
    const n = doom ? 9 : 6;
    const r = doom ? 0.4 : 0.3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      part(barrels, boxGeo(0.15, 2.8, 0.15), doom && i % 3 === 0 ? red : dark, Math.cos(a) * r, 1.4, Math.sin(a) * r);
    }
    for (const y of [0.4, 2.4]) part(barrels, boxGeo(r * 2 + 0.25, 0.15, r * 2 + 0.25), metal, 0, y, 0); // clamps
    u.spin = [barrels];
    muzzle(0, 0, 3.6);
  } else if (level >= 3) {
    // Extra Barrel: two barrels side by side
    for (const x of [-0.22, 0.22]) {
      part(gun, boxGeo(0.2, 0.2, 2.6), dark, x, 0.05, 1.9);
      muzzle(x, 0.05, 3.2);
    }
  } else {
    part(gun, boxGeo(0.25, 0.25, level >= 1 ? 2.8 : 2.2), dark, 0, 0.05, level >= 1 ? 2.0 : 1.7);
    part(gun, boxGeo(0.4, 0.4, 0.3), dark, 0, 0.05, level >= 1 ? 3.3 : 2.75); // muzzle brake
    muzzle(0, 0.05, level >= 1 ? 3.4 : 2.9);
  }
  if (level >= 1) {
    // Heavier Bullets: a brass ammo belt hanging off the side
    for (let i = 0; i < 4; i++) part(gun, boxGeo(0.12, 0.3, 0.12), M(0xc9a227), 0.6, -0.3 - i * 0.18, -0.1 + i * 0.12);
  }
  if (level >= 2) {
    // Bigger Magazine: a drum magazine
    part(gun, boxGeo(0.5, 1.1, 1.1), M(doom ? 0x37373f : 0x4e5b31), -0.75, -0.2, -0.2);
  }
  if (level >= 3) {
    // Scope (hidden detection)
    part(gun, boxGeo(0.25, 0.25, 0.9), dark, 0, 0.65, -0.2);
    part(gun, boxGeo(0.2, 0.2, 0.05), glowThing(u, doom ? 0xff1744 : 0x00e5ff), 0, 0.65, 0.26);
  }
  if (doom) part(gun, boxGeo(0.7, 0.2, 0.05), red, 0, 0.75, 0.82); // DOOM visor slit on the shield
  u.static = true;
  u.tracer = doom ? 0xff1744 : level >= 4 ? 0xffab40 : 0xffe066;
  u.tracerWidth = level >= 5 ? 0.2 : undefined;
  u.fpsHeight = 2.3 + 0.4 + (level >= 5 ? 0.8 : 0);
  return u;
}

/**
 * Turret: a heavy gun on a concrete pad. Lv 2 ammo crate and belt, Lv 3 a radar dish, Lv 4 a
 * second gun, Lv 5 armor plates and thicker barrels, Lv 6 the sleek XR-200 with glowing strips.
 */
export function makeTurret(level) {
  const u = makeThing();
  const { M } = u;
  const xr = level >= 5;
  const dual = level >= 3;
  const heavy = level >= 4;
  const metal = M(xr ? 0x263238 : heavy ? 0x4e5a3a : 0x5d6b3a);
  const dark = M(0x1c1c1c);
  const cyan = xr ? glowThing(u, 0x18ffff) : null;
  // Concrete pad and swivel ring
  part(u.body, boxGeo(4.4, 0.5, 4.4), M(xr ? 0x455a64 : 0x9e9e9e), 0, 0.25, 0);
  part(u.body, boxGeo(2.6, 0.5, 2.6), dark, 0, 0.75, 0);
  // Housing
  const head = new THREE.Group();
  head.position.set(0, 1.0, 0);
  u.body.add(head);
  const hw = xr ? 3.0 : 2.6;
  part(head, boxGeo(hw, 1.6, 2.8), metal, 0, 0.8, -0.1);
  part(head, boxGeo(hw - 0.4, 0.4, 1.8), M(xr ? 0x37474f : 0x6b7a4a), 0, 1.8, -0.3); // roof hatch
  if (xr) {
    part(head, boxGeo(hw + 0.05, 0.12, 2.4), cyan, 0, 1.1, -0.1); // glowing side strips
    part(head, boxGeo(1.6, 0.25, 0.08), cyan, 0, 1.3, 1.31); // visor slit
  }
  if (heavy) {
    // Even Heavier Ammo: armor plates on the sides
    for (const x of [-1, 1]) part(head, boxGeo(0.25, 1.4, 2.4), M(xr ? 0x1c262b : 0x3e4a2a), x * (hw / 2 + 0.12), 0.8, 0);
  }
  // Barrels
  const bw = heavy ? 0.42 : 0.32;
  const len = xr ? 4.2 : heavy ? 3.8 : 3.2;
  const xs = dual ? [-0.65, 0.65] : [0];
  for (const x of xs) {
    part(head, boxGeo(0.7, 0.7, 0.6), dark, x, 0.85, 1.5); // mantlet
    part(head, boxGeo(bw, bw, len), xr ? M(0x37474f) : dark, x, 0.85, 1.5 + len / 2);
    part(head, boxGeo(bw + 0.2, bw + 0.2, 0.4), xr ? cyan : dark, x, 0.85, 1.5 + len); // muzzle brake
    gunMuzzle(u, head, x, 0.85, 1.8 + len);
  }
  if (level >= 1) {
    // Stronger Ammunition: an ammo crate with a brass belt feeding the gun
    part(head, boxGeo(0.9, 0.8, 1.0), M(xr ? 0x212121 : 0x4e5b31), -hw / 2 - 0.5, 0.4, -0.4);
    for (let i = 0; i < 4; i++) part(head, boxGeo(0.14, 0.3, 0.14), M(0xc9a227), -hw / 2 - 0.2 + i * 0.12, 0.9 + i * 0.1, -0.4);
  }
  if (level >= 2) {
    // Radar: a dish on a mast at the back
    part(head, boxGeo(0.15, 1.4, 0.15), dark, 0.8, 2.4, -1.2);
    const dish = part(head, boxGeo(1.4, 1.0, 0.15), xr ? M(0x546e7a) : M(0xbdbdbd), 0.8, 3.2, -1.2);
    dish.rotation.x = -0.4;
    part(head, boxGeo(0.2, 0.2, 0.2), xr ? cyan : glowThing(u, 0xff1744), 0.8, 3.2, -1.05);
  }
  u.static = true;
  u.tracer = xr ? 0x18ffff : heavy ? 0xffab40 : 0xffe066;
  u.tracerWidth = xr ? 0.22 : heavy ? 0.18 : undefined;
  return u;
}

/**
 * Classic Mortar (alternate Mortar form): a gunner with a big mortar cannon behind sandbags.
 * Lv 2 ear protection, Lv 3 a wider tube, Lv 4 a bigger cannon, Lv 5 cluster warheads, Lv 6 the
 * City Buster with radioactive yellow shells. A purple Dimension Shard emblem marks it as an alternate form.
 */
export function makeMortarClassic(level) {
  const nuke = level >= 5;
  const coat = nuke ? 0x2b2b2b : 0x7a6a45;
  const h = makeHumanoid({ skin: 0xc68642, shirt: coat, pants: nuke ? 0x1a1a1a : 0x4e4630, arms: coat, face: 'soldier' });
  const { M } = h;
  const shard = glow(h, 0xb388ff);
  helmet(h, nuke ? 0x212121 : 0x5d5040);
  part(h.head, boxGeo(0.3, 0.3, 0.06), shard, 0, 1.32, 0.74); // shard emblem on the helmet
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, -0.55, 0.45, 0.52);
  if (level >= 1) for (const x of [-0.7, 0.7]) part(h.head, boxGeo(0.25, 0.55, 0.55), M(0x6a1b9a), x, 0.6, 0); // ear protectors
  if (nuke) part(h.torso, boxGeo(2.15, 1.6, 1.15), M(0xfbc02d), 0, 0.1, 0); // hazard vest
  // Cannon on a base plate in front of the gunner
  const mount = new THREE.Group();
  mount.position.set(0, 0, 2.3);
  h.root.add(mount);
  part(mount, boxGeo(2.0, 0.25, 2.0), M(0x424242), 0, 0.12, 0);
  const w = level >= 3 ? 1.15 : level >= 2 ? 0.95 : 0.75;
  const len = level >= 3 ? 4.0 : level >= 2 ? 3.4 : 3.0;
  const tube = new THREE.Group();
  tube.position.set(0, 0.35, 0);
  tube.rotation.x = 0.45;
  mount.add(tube);
  part(tube, boxGeo(w, len, w), M(nuke ? 0x37474f : 0x5d6b3a), 0, len / 2, 0);
  part(tube, boxGeo(w + 0.25, 0.3, w + 0.25), M(0x212121), 0, len, 0);
  if (level >= 3) for (const y of [0.9, 2.0]) part(tube, boxGeo(w + 0.15, 0.2, w + 0.15), M(0x212121), 0, y, 0); // reinforcing bands
  if (nuke) part(tube, boxGeo(w + 0.1, 0.5, w + 0.1), glow(h, 0xffd600), 0, len * 0.6, 0); // hazard stripe
  for (const side of [-1, 1]) {
    const leg = part(mount, boxGeo(0.18, 2.4, 0.18), M(0x212121), side * 0.7, 1.1, 1.1);
    leg.rotation.set(-0.5, 0, side * 0.3);
  }
  setMuzzle(h, tube, 0, len + 0.3, 0);
  // Sandbags in a half ring
  const bag = M(0xa1887f);
  for (let i = 0; i < 5; i++) {
    const a = -1.2 + i * 0.6;
    part(h.root, boxGeo(1.3, 0.6, 0.7), bag, Math.sin(a) * 3.4, 0.3, 2.3 + Math.cos(a) * 1.7).rotation.y = a;
  }
  if (level >= 4) {
    // Loaded Warhead: a rack of fat cluster shells
    const shellM = nuke ? glow(h, 0xffd600) : M(0x8d6e63);
    part(h.root, boxGeo(1.5, 0.2, 1.0), M(0x5d4037), 2.0, 0.1, 0.2);
    for (const x of [1.5, 2.0, 2.5]) for (const z of [-0.05, 0.45]) part(h.root, boxGeo(0.4, 1.0, 0.4), shellM, x, 0.7, z);
  }
  const shell = part(h.rightArm, boxGeo(0.45, 0.85, 0.45), nuke ? glow(h, 0xffd600) : M(0x5d4037), 0.6, -2.1, 0);
  shell.rotation.z = 0.3;
  h.rightArm.rotation.set(-1.0, 0, 0.3);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -1.0, left: -1.0, leftRecoil: 0 };
  h.recoilScale = 0.4;
  h.projectile = nuke ? { color: 0xffd600, size: 1.0, arc: 18, glowing: true } : { color: 0x5d4037, size: 0.7, arc: 16 };
  return h;
}

/**
 * Mercenary Base: a fenced compound with a tent and a flag. Lv 2 crates of grenades, Lv 3 a
 * second tent, Lv 4 a watchtower, Lv 5 riot shields on a rack, Lv 6 a helipad, Lv 7 armored walls.
 */
export function makeMercBase(level) {
  const u = makeThing();
  const { M } = u;
  const armored = level >= 6;
  part(u.body, boxGeo(4.6, 0.25, 4.6), M(0x8d7b5a), 0, 0.12, 0); // dirt yard
  // Fence posts (concrete walls at max level)
  const post = M(armored ? 0x607d8b : 0x5d4037);
  if (armored) {
    for (const side of [-1, 1]) part(u.body, boxGeo(0.4, 1.4, 4.4), post, side * 2.1, 0.8, 0);
    part(u.body, boxGeo(4.4, 1.4, 0.4), post, 0, 0.8, -2.1);
  } else {
    for (const x of [-2.1, 2.1]) for (const z of [-2.1, -0.7, 0.7, 2.1]) part(u.body, boxGeo(0.2, 1.0, 0.2), post, x, 0.6, z);
    for (const x of [-2.1, 2.1]) part(u.body, boxGeo(0.08, 0.1, 4.2), post, x, 0.9, 0);
  }
  // Tent
  const canvas = M(level >= 3 ? 0x3e4a2a : 0x6b7d3a);
  const tent = (x, z, s) => {
    const l = part(u.body, boxGeo(0.2, 2.6 * s, 2.6 * s), canvas, x - 0.75 * s, 1.1 * s, z);
    l.rotation.z = -0.6;
    const r = part(u.body, boxGeo(0.2, 2.6 * s, 2.6 * s), canvas, x + 0.75 * s, 1.1 * s, z);
    r.rotation.z = 0.6;
    part(u.body, boxGeo(0.9 * s, 1.6 * s, 0.1), M(0x212121), x, 0.8 * s, z + 1.25 * s);
  };
  tent(-0.6, -0.7, 1);
  if (level >= 2) tent(1.2, -0.9, 0.7);
  if (level >= 1) {
    // Explosive Experts: a crate of grenades
    part(u.body, boxGeo(0.9, 0.6, 0.7), M(0x4e5b31), 1.4, 0.55, 1.3);
    for (const x of [1.15, 1.4, 1.65]) part(u.body, boxGeo(0.2, 0.2, 0.2), M(0x33691e), x, 0.95, 1.3);
  }
  if (level >= 3) {
    // Improved Training: a watchtower with a gold star banner (the damage boost)
    for (const x of [-1.9, -1.1]) for (const z of [1.1, 1.9]) part(u.body, boxGeo(0.15, 3.2, 0.15), M(0x6d4c41), x, 1.6, z);
    part(u.body, boxGeo(1.2, 0.2, 1.2), M(0x795548), -1.5, 3.2, 1.5);
    part(u.body, boxGeo(0.6, 0.6, 0.05), glowThing(u, 0xffc400), -1.5, 3.8, 2.1);
  }
  if (level >= 4) {
    // Riot Control: riot shields leaning on a rack
    part(u.body, boxGeo(1.6, 0.12, 0.15), M(0x3e2723), 0.4, 1.2, 1.9);
    for (const x of [-0.1, 0.4, 0.9]) part(u.body, boxGeo(0.45, 1.0, 0.08), M(0x90a4ae), x, 0.75, 2.0).rotation.x = -0.15;
  }
  if (level >= 5) {
    // Air Transport: a helipad marking
    part(u.body, boxGeo(1.8, 0.05, 1.8), M(0x424242), 1.2, 0.28, 0.2);
    part(u.body, boxGeo(0.2, 0.06, 1.0), M(0xfafafa), 0.9, 0.3, 0.2);
    part(u.body, boxGeo(0.2, 0.06, 1.0), M(0xfafafa), 1.5, 0.3, 0.2);
    part(u.body, boxGeo(0.6, 0.06, 0.2), M(0xfafafa), 1.2, 0.3, 0.2);
  }
  // Flag
  part(u.body, boxGeo(0.15, 3.2, 0.15), M(0xbdbdbd), 1.9, 1.7, -1.9);
  part(u.body, boxGeo(0.05, 0.8, 1.2), M(armored ? 0xffc400 : 0xc62828), 1.9, 2.9, -1.3);
  return u;
}

/**
 * A Mercenary Base unit on foot: mrifle / mgren / mriot / mmedic, with a number for the
 * upgraded look (mrifle2, mrifle3, mgren2, mriot2, mmedic2).
 */
export function makeMerc(model) {
  const kind = model.replace(/\d+$/, '');
  const tier = Number(model.match(/\d+$/)?.[0] ?? 1);
  const look = {
    mrifle: { shirt: [0x8d7b5a, 0x5d4037, 0x263238][tier - 1], pants: 0x3e2723 },
    mgren: { shirt: tier > 1 ? 0x3e2723 : 0x6d4c41, pants: 0x3e2723 },
    mriot: { shirt: tier > 1 ? 0x1a237e : 0x263238, pants: 0x1c2429 },
    mmedic: { shirt: 0xeceff1, pants: 0x546e7a },
  }[kind];
  const h = makeHumanoid({ skin: 0xd7a26b, shirt: look.shirt, pants: look.pants, arms: look.shirt, face: 'soldier' });
  const { M } = h;
  if (kind === 'mriot') {
    // Riot Guard: full helmet with visor, body armor, a big shield and a baton
    helmet(h, 0x212121, false);
    part(h.head, boxGeo(1.25, 0.5, 0.1), M(0x80deea), 0, 0.7, 0.65);
    part(h.torso, boxGeo(2.2, 1.8, 1.2), M(tier > 1 ? 0x283593 : 0x37474f), 0, 0.05, 0);
    const shield = part(h.leftArm, boxGeo(0.15, 2.4, 1.8), M(0x90a4ae), 0.3, -1.6, 0.2);
    shield.rotation.z = 0.1;
    part(h.rightArm, boxGeo(0.2, 1.2, 0.2), M(0x111111), 0, -2.3, 0);
    const m = new THREE.Object3D();
    m.position.set(0, -2.9, 0);
    h.rightArm.add(m);
    h.muzzles = [m];
    h.rightArm.rotation.set(-1.2, 0, 0.1);
    h.leftArm.rotation.set(-0.8, 0, 0);
    return h;
  }
  if (kind === 'mmedic') {
    // Field Medic: a white cap and armband with red crosses, and a medical bag
    const cap = M(0xfafafa);
    part(h.head, boxGeo(1.35, 0.35, 1.35), cap, 0, 1.3, 0);
    part(h.head, boxGeo(0.4, 0.12, 0.05), M(0xd50000), 0, 1.35, 0.69);
    part(h.head, boxGeo(0.12, 0.4, 0.05), M(0xd50000), 0, 1.35, 0.69);
    part(h.torso, boxGeo(0.5, 0.15, 0.05), M(0xd50000), 0, 0.4, 0.52);
    part(h.torso, boxGeo(0.15, 0.5, 0.05), M(0xd50000), 0, 0.4, 0.52);
    part(h.torso, boxGeo(1.2, 1.0, 0.6), M(0x1b5e20), 0, -0.2, -0.8); // bag
    if (tier > 1) part(h.head, boxGeo(1.1, 0.25, 0.1), glow(h, 0x69f0ae), 0, 0.7, 0.65);
    const m = new THREE.Object3D();
    m.position.set(0, -2, 0);
    h.rightArm.add(m);
    h.muzzles = [m];
    return h;
  }
  helmet(h, kind === 'mgren' ? 0x4e342e : [0x6b5d3f, 0x3e2723, 0x212121][tier - 1]);
  if (kind === 'mrifle' && tier > 1) part(h.head, boxGeo(1.1, 0.3, 0.15), glow(h, tier > 2 ? 0x00e5ff : 0x76ff03), 0, 1.0, 0.68); // goggles
  if (kind === 'mgren') {
    // Grenadier: a bandolier of grenades and a short launcher
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x4e342e), 0, 0.3, 0).rotation.z = 0.6;
    for (const x of [-0.5, 0, 0.5]) part(h.torso, boxGeo(0.25, 0.25, 0.25), M(tier > 1 ? 0xff6d00 : 0x33691e), x, 0.3 + x * 0.6, 0.56);
    holdLongGun(h, 1.0, M(0x37474f));
    h.projectile = { color: tier > 1 ? 0xff6d00 : 0x33691e, size: 0.4, arc: 4 };
  } else holdLongGun(h, tier > 2 ? 1.8 : 1.5, M(tier > 2 ? 0x263238 : 0x262626));
  return h;
}

// ------------------------------------------------------------------ Necromancer, Engineer, Accelerator

/**
 * Necromancer: a hooded sorcerer with a skull staff. Lv 2 Soul Forge: green soul flames on the
 * staff, Lv 3 Skull Centrifuge: skulls spinning around it, Lv 4 Graveward: bone armor,
 * Lv 5 Apostle of Hades: a black-and-gold robe, a crown and a red glow.
 */
export function makeNecromancer(level) {
  const hades = level >= 4;
  const robe = hades ? 0x1a1a1a : level >= 3 ? 0x311b4a : 0x4a148c;
  const soul = hades ? 0xff1744 : level >= 1 ? 0x76ff03 : 0xb388ff;
  const h = makeHumanoid({ skin: 0xc8c3b4, shirt: robe, pants: robe, arms: robe, face: 'skull' });
  const { M } = h;
  // Hood and long robe
  const hood = M(hades ? 0x111111 : 0x2a0d4f);
  part(h.head, boxGeo(1.45, 1.4, 1.45), hood, 0, 0.68, -0.08);
  part(h.head, boxGeo(1.0, 0.25, 0.08), glow(h, soul), 0, 0.85, 0.7); // glowing eyes under the hood
  part(h.torso, boxGeo(2.3, 2.6, 1.3), M(robe), 0, -1.6, 0); // robe skirt
  if (hades) {
    part(h.torso, boxGeo(0.3, 2.6, 0.08), M(0xffc400), 0, -0.6, 0.66); // gold trim
    for (const x of [-0.45, 0, 0.45]) part(h.head, boxGeo(0.22, 0.55, 0.22), M(0xffc400), x, 1.6, 0); // crown
  }
  if (level >= 3) {
    // Graveward: bone shoulder guards and a rib-cage chest plate
    const bone = M(0xe8e4d0);
    for (const x of [-1.4, 1.4]) part(h.torso, boxGeo(0.9, 0.5, 1.3), bone, x, 1.0, 0);
    for (let i = 0; i < 3; i++) part(h.torso, boxGeo(1.6, 0.14, 0.08), bone, 0, 0.6 - i * 0.4, 0.55);
  }
  // Skull staff
  const len = hades ? 3.2 : 2.6;
  const staff = holdLongGun(h, len, M(hades ? 0x3e2723 : 0x4e342e));
  const skull = M(0xe8e4d0);
  part(staff, boxGeo(0.6, 0.6, 0.6), skull, 0, -len - 0.2, 0);
  part(staff, boxGeo(0.4, 0.15, 0.1), glow(h, soul), 0, -len - 0.2, 0.31);
  if (level >= 1) {
    // Soul Forge: soul flames around the skull
    for (const [x, z] of [[-0.35, 0], [0.35, 0], [0, -0.35]]) part(staff, boxGeo(0.18, 0.5, 0.18), glow(h, soul), x, -len - 0.5, z);
  }
  h.muzzles[0].position.y = -len - 0.5;
  if (level >= 2) {
    // Skull Centrifuge: skulls orbiting the necromancer
    const ring = new THREE.Group();
    ring.position.y = 3.2;
    h.body.add(ring);
    const n = hades ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      part(ring, boxGeo(0.5, 0.5, 0.5), skull, Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2);
      part(ring, boxGeo(0.3, 0.12, 0.1), glow(h, soul), Math.cos(a) * 2.2, 0.05, Math.sin(a) * 2.2 + 0.26);
    }
    h.spin = [ring];
    h.idleSpin = 2;
  }
  h.tracer = soul;
  h.tracerWidth = hades ? 0.35 : 0.25;
  return h;
}

/**
 * A skeleton raised by the Necromancer: skel, skelsword, skelsword2, skelgiant, skelknight,
 * skelhallow, skelexec. Graveyard (event) undead: skelmini, skelcursed, skelgiantcursed,
 * skelhaunted, skelhallowknight, skeljack.
 */
export function makeSkeleton(model) {
  const cursed = model === 'skelcursed' || model === 'skelgiantcursed';
  const bone = model === 'skelhallow' ? 0xb3e5fc : cursed ? 0xb39ddb : model === 'skelhaunted' ? 0xa5d6a7 : 0xe8e4d0;
  const h = makeHumanoid({ skin: bone, shirt: bone, pants: bone, arms: bone, face: 'skull' });
  const { M } = h;
  const dark = M(0x3e3a30);
  for (let i = 0; i < 3; i++) part(h.torso, boxGeo(1.6, 0.14, 0.06), dark, 0, 0.6 - i * 0.45, 0.52); // ribs
  const blade = (len, w, color) => {
    const g = new THREE.Group();
    g.position.set(0, -1.9, 0);
    h.rightArm.add(g);
    part(g, boxGeo(0.25, 0.5, 0.25), M(0x4e342e), 0, -0.2, 0); // grip
    part(g, boxGeo(0.8, 0.12, 0.25), M(0x757575), 0, -0.45, 0); // crossguard
    part(g, boxGeo(w, len, 0.15), color, 0, -0.5 - len / 2, 0);
    const m = new THREE.Object3D();
    m.position.set(0, -0.5 - len, 0);
    g.add(m);
    h.muzzles = [m];
  };
  h.rightArm.rotation.set(-1.2, 0, 0.1);
  h.leftArm.rotation.set(-0.5, 0, 0);
  h.tracer = 0xe0e0e0;
  if (model === 'skelmini' || model === 'skelcursed') {
    // Graveyard Skeleton: small and unarmed (Cursed ones glow purple)
    if (cursed) part(h.head, boxGeo(1.0, 0.2, 0.08), glow(h, 0xd500f9), 0, 0.75, 0.62);
    h.rightArm.rotation.set(-1.4, 0, 0.1);
    h.leftArm.rotation.set(-1.4, 0, -0.1);
    const m = new THREE.Object3D();
    m.position.set(0, -2.2, 0);
    h.rightArm.add(m);
    h.muzzles = [m];
    h.size = 0.8;
  } else if (model === 'skelgiantcursed') {
    part(h.torso, boxGeo(2.4, 0.5, 1.3), M(0x311b92), 0, -0.8, 0);
    part(h.rightArm, boxGeo(0.7, 2.2, 0.7), glow(h, 0x7c4dff), 0, -2.8, 0);
    part(h.head, boxGeo(1.0, 0.2, 0.08), glow(h, 0xd500f9), 0, 0.75, 0.62);
    const m = new THREE.Object3D();
    m.position.set(0, -3.9, 0);
    h.rightArm.add(m);
    h.muzzles = [m];
    h.size = 1.9;
  } else if (model === 'skelhaunted' || model === 'skelhallowknight') {
    // Haunted Knight (green ghost-fire) / Hallow Knight (orange, bigger): armor and a sword
    const hallow = model === 'skelhallowknight';
    const fire = glow(h, hallow ? 0xff9100 : 0x76ff03);
    helmet(h, hallow ? 0x212121 : 0x455a64, false);
    part(h.head, boxGeo(1.0, 0.18, 0.1), fire, 0, 0.8, 0.66);
    part(h.torso, boxGeo(2.2, 1.8, 1.2), M(hallow ? 0x263238 : 0x546e7a), 0, 0.05, 0);
    part(h.torso, boxGeo(0.5, 0.5, 0.08), fire, 0, 0.4, 0.62);
    blade(hallow ? 2.2 : 1.8, 0.35, fire);
    h.tracer = hallow ? 0xff9100 : 0x76ff03;
    h.size = hallow ? 1.3 : 1.1;
  } else if (model === 'skeljack') {
    // Jack: a towering pumpkin-headed king with a crown and a glowing scythe
    part(h.head, boxGeo(1.6, 1.4, 1.6), M(0xef6c00), 0, 0.7, 0);
    for (const x of [-0.35, 0.35]) part(h.head, boxGeo(0.3, 0.25, 0.05), glow(h, 0xffab00), x, 0.85, 0.81);
    part(h.head, boxGeo(0.9, 0.15, 0.05), glow(h, 0xffab00), 0, 0.4, 0.81);
    const gold = M(0xffc107);
    part(h.head, boxGeo(1.4, 0.3, 1.4), gold, 0, 1.55, 0);
    for (const x of [-0.5, 0, 0.5]) part(h.head, boxGeo(0.25, 0.45, 0.25), gold, x, 1.9, 0.55);
    part(h.torso, boxGeo(2.3, 3.2, 0.15), M(0x4a148c), 0, -0.6, -0.6); // royal cape
    const g = new THREE.Group();
    g.position.set(0, -1.9, 0);
    h.rightArm.add(g);
    part(g, boxGeo(0.25, 4.0, 0.25), M(0x212121), 0, -1.0, 0);
    part(g, boxGeo(0.15, 0.3, 2.2), glow(h, 0xff9100), 0, -3.0, 1.0); // scythe blade
    const m = new THREE.Object3D();
    m.position.set(0, -3.0, 1.2);
    g.add(m);
    h.muzzles = [m];
    h.size = 2.4;
    h.tracer = 0xff9100;
  } else if (model === 'skel') {
    // Plain skeleton: a bone club
    part(h.rightArm, boxGeo(0.3, 1.4, 0.3), M(0xd7ccc8), 0, -2.4, 0);
    const m = new THREE.Object3D();
    m.position.set(0, -3.1, 0);
    h.rightArm.add(m);
    h.muzzles = [m];
  } else if (model === 'skelsword' || model === 'skelsword2') {
    blade(1.6, 0.3, M(model === 'skelsword2' ? 0x90a4ae : 0x9e9e9e));
    if (model === 'skelsword2') part(h.head, boxGeo(1.3, 0.4, 1.3), M(0x546e7a), 0, 1.25, 0); // iron cap
  } else if (model === 'skelknight') {
    helmet(h, 0x607d8b, false);
    part(h.head, boxGeo(1.0, 0.15, 0.1), M(0x111111), 0, 0.8, 0.66); // visor slit
    part(h.torso, boxGeo(2.2, 1.8, 1.2), M(0x78909c), 0, 0.05, 0); // breastplate
    part(h.leftArm, boxGeo(0.2, 1.8, 1.4), M(0x37474f), 0.6, -1.4, 0.2); // shield
    blade(1.9, 0.35, M(0xb0bec5));
    h.tracer = 0xcfd8dc;
  } else if (model === 'skelhallow') {
    // Hallow Guard: ghostly blue bones in glowing armor with a halberd
    const ghost = glow(h, 0x40c4ff);
    part(h.torso, boxGeo(2.2, 1.8, 1.2), M(0x263238), 0, 0.05, 0);
    part(h.torso, boxGeo(0.5, 0.5, 0.08), ghost, 0, 0.4, 0.62);
    helmet(h, 0x263238, false);
    part(h.head, boxGeo(1.0, 0.2, 0.1), ghost, 0, 0.85, 0.67);
    const g = new THREE.Group();
    g.position.set(0, -1.9, 0);
    h.rightArm.add(g);
    part(g, boxGeo(0.2, 3.6, 0.2), M(0x3e2723), 0, -0.8, 0);
    part(g, boxGeo(0.15, 0.8, 0.9), ghost, 0, -2.4, 0.3); // axe head
    const m = new THREE.Object3D();
    m.position.set(0, -2.6, 0);
    g.add(m);
    h.muzzles = [m];
    h.size = 1.2;
    h.tracer = 0x40c4ff;
  } else if (model === 'skelgiant') {
    part(h.torso, boxGeo(2.4, 0.5, 1.3), M(0x5d4037), 0, -0.8, 0); // belt
    part(h.rightArm, boxGeo(0.7, 2.2, 0.7), M(0x8d6e63), 0, -2.8, 0); // big bone club
    const m = new THREE.Object3D();
    m.position.set(0, -3.9, 0);
    h.rightArm.add(m);
    h.muzzles = [m];
    h.size = 1.9;
  } else {
    // Executioner: a black hood and a huge red-glowing axe
    part(h.head, boxGeo(1.4, 1.4, 1.4), M(0x111111), 0, 0.68, -0.1);
    part(h.head, boxGeo(0.9, 0.2, 0.08), glow(h, 0xff1744), 0, 0.85, 0.66);
    part(h.torso, boxGeo(2.2, 1.6, 1.15), M(0x212121), 0, 0, 0);
    const g = new THREE.Group();
    g.position.set(0, -1.9, 0);
    h.rightArm.add(g);
    part(g, boxGeo(0.25, 3.2, 0.25), M(0x3e2723), 0, -0.8, 0);
    part(g, boxGeo(0.2, 1.4, 1.6), M(0x424242), 0, -2.2, 0.6);
    part(g, boxGeo(0.22, 1.2, 0.15), glow(h, 0xff1744), 0, -2.2, 1.4);
    const m = new THREE.Object3D();
    m.position.set(0, -2.4, 0.8);
    g.add(m);
    h.muzzles = [m];
    h.size = 1.5;
    h.tracer = 0xff5252;
  }
  return h;
}

/**
 * Engineer: hard hat, hi-vis vest and a rebar launcher. Lv 2 goggles, Lv 3 a radar dish on its
 * back, Lv 4 a converter backpack, Lv 5 heavy armor, Lv 6 a blueprint tablet and a glowing
 * visor, Lv 7 a red rocket launcher.
 */
export function makeEngineer(level) {
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: level >= 4 ? 0x455a64 : 0x5d6d7e, pants: 0x37474f, arms: level >= 4 ? 0x455a64 : 0x5d6d7e, face: 'soldier' });
  const { M } = h;
  helmet(h, level >= 6 ? 0xd32f2f : 0xfbc02d);
  part(h.torso, boxGeo(2.1, 1.9, 1.1), M(0xff6f00), 0, 0.05, 0); // hi-vis vest
  part(h.torso, boxGeo(2.15, 0.18, 1.15), M(0xe0e0e0), 0, 0.3, 0); // reflective strip
  if (level >= 1) part(h.head, boxGeo(1.1, 0.3, 0.15), glow(h, level >= 5 ? 0x00e5ff : 0xffab40), 0, 1.0, 0.68); // goggles
  part(h.torso, boxGeo(2.2, 0.3, 1.2), M(0x5d4037), 0, -0.85, 0); // tool belt
  part(h.torso, boxGeo(0.3, 0.5, 0.3), M(0x9e9e9e), 0.8, -1.1, 0.5); // wrench
  if (level >= 2) {
    // Makeshift Radar: a dish on a pole behind it
    part(h.torso, boxGeo(0.15, 2.2, 0.15), M(0x9e9e9e), -0.6, 1.6, -0.7);
    const dish = part(h.torso, boxGeo(1.2, 1.2, 0.15), M(0xbdbdbd), -0.6, 2.8, -0.7);
    dish.rotation.x = -0.5;
    part(h.torso, boxGeo(0.2, 0.2, 0.2), glow(h, 0xff1744), -0.6, 2.85, -0.55);
  }
  if (level >= 3) {
    // Auto Converter: a backpack full of scrap
    part(h.torso, boxGeo(1.5, 1.6, 0.8), M(0x795548), 0.2, -0.1, -0.9);
    part(h.torso, boxGeo(0.4, 0.4, 0.1), glow(h, 0x76ff03), 0.2, 0.2, -1.32);
  }
  if (level >= 4) {
    // Heavy Construction: armor plates
    for (const x of [-1.4, 1.4]) part(h.torso, boxGeo(0.8, 0.5, 1.3), M(0x607d8b), x, 1.0, 0);
  }
  if (level >= 5) part(h.leftArm, boxGeo(0.15, 0.9, 1.1), glow(h, 0x40c4ff), 0.55, -1.4, 0.3); // blueprint tablet
  const rocket = level >= 6;
  const len = rocket ? 2.0 : 1.8;
  const gun = holdLongGun(h, len, M(rocket ? 0xb71c1c : 0x616161));
  part(gun, boxGeo(0.55, 0.8, 0.6), M(rocket ? 0x7f0000 : 0x424242), 0, -0.4, 0); // receiver
  part(gun, boxGeo(rocket ? 0.6 : 0.2, 0.3, rocket ? 0.6 : 0.2), M(rocket ? 0x212121 : 0x8d6e63), 0, -len, 0); // muzzle / rebar tip
  h.muzzles[0].position.y = -len - 0.2;
  h.tracer = rocket ? 0xff7043 : 0xa1887f;
  h.flight = rocket ? { color: 0xff7043, size: 0.8, arc: 0.6 } : { color: 0x8d6e63, size: 0.7, arc: 0.4, long: true }; // rebar / splash rocket
  return h;
}

/**
 * Accelerator (alternate Phaser): a heavy suit with a plasma cannon. Lv 3 a second energy
 * canister, Lv 4 armor, Lv 5 a supercharger coil, Lv 6 a glowing gold-and-violet suit.
 */
export function makeAccelerator(level) {
  const vessel = level >= 5;
  const plasma = vessel ? 0xd500f9 : level >= 4 ? 0xff6d00 : 0x18ffff;
  const suitC = vessel ? 0x1a0033 : level >= 3 ? 0x263238 : 0xcfd8dc;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: suitC, pants: suitC, arms: suitC, face: 'soldier' });
  const { M } = h;
  const armor = M(vessel ? 0xffc400 : level >= 3 ? 0x455a64 : 0x90a4ae);
  part(h.head, boxGeo(1.45, 1.4, 1.45), armor, 0, 0.66, -0.03);
  part(h.head, boxGeo(1.25, 0.3, 0.08), glow(h, plasma), 0, 0.75, 0.7);
  part(h.torso, boxGeo(1.4, 1.8, 0.8), M(0x37474f), 0, 0, -0.9); // energy pack
  part(h.torso, boxGeo(0.35, 1.3, 0.1), glow(h, plasma), -0.35, 0, -1.32); // canister
  if (level >= 2) part(h.torso, boxGeo(0.35, 1.3, 0.1), glow(h, plasma), 0.35, 0, -1.32); // second canister
  if (level >= 3) {
    part(h.torso, boxGeo(2.2, 1.7, 1.2), armor, 0, 0.05, 0);
    for (const x of [-1.4, 1.4]) part(h.torso, boxGeo(0.85, 0.5, 1.35), armor, x, 1.0, 0);
  }
  if (vessel) for (const x of [-0.5, 0, 0.5]) part(h.head, boxGeo(0.2, 0.6, 0.2), M(0xffc400), x, 1.55, 0); // crest
  const len = level >= 4 ? 2.6 : 2.2;
  const gun = holdLongGun(h, len, M(vessel ? 0x311b92 : 0x37474f));
  part(gun, boxGeo(0.8, 1.0, 0.8), M(0x263238), 0, -0.5, 0); // breech
  const coils = level >= 4 ? 4 : 2;
  for (let i = 0; i < coils; i++) part(gun, boxGeo(0.7, 0.14, 0.7), glow(h, plasma), 0, -1.1 - i * 0.35, 0);
  part(gun, boxGeo(0.55, 0.3, 0.55), glow(h, plasma), 0, -len, 0);
  h.muzzles[0].position.y = -len - 0.2;
  h.tracer = plasma;
  h.tracerWidth = vessel ? 0.6 : level >= 3 ? 0.5 : 0.4;
  return h;
}

/**
 * Engineer sentry turret on a tripod. tier: 0-1 Sentry, 2-3 Rifle Sentry, 4-5 Minigun Sentry
 * (5 adds a shield), 6 War Machine Sentry with a rocket pod. `turret` turns, `muzzles[0]` fires.
 */
export function makeSentry(tier) {
  if (tier >= 200) return makeEngDevice(tier - 200); // Sentry Engineer devices
  if (tier >= 100) return makeMechTurret(tier - 100); // Mechanic turrets
  const u = makeThing();
  const { M } = u;
  const metal = M(tier >= 6 ? 0x5d4037 : tier >= 4 ? 0x455a64 : tier >= 2 ? 0x556b2f : 0x757575);
  for (const a of [0, 2.1, 4.2]) {
    const leg = part(u.body, boxGeo(0.2, 1.6, 0.2), M(0x424242), Math.sin(a) * 0.6, 0.7, Math.cos(a) * 0.6);
    leg.rotation.set(Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4);
  }
  const t = turret(u, 1.5);
  const big = tier >= 4 ? 1.3 : 1;
  part(t, boxGeo(1.1 * big, 0.8 * big, 1.3 * big), metal, 0, 0.3, 0);
  part(t, boxGeo(0.5, 0.2, 0.1), glow(u, tier >= 6 ? 0xff1744 : 0x76ff03), 0, 0.5 * big, 0.66 * big); // sensor
  const barrel = tier >= 2 ? 1.6 : 1.0;
  if (tier >= 4) {
    for (const x of [-0.18, 0.18]) for (const y of [0.15, 0.45]) part(t, boxGeo(0.14, 0.14, barrel), M(0x212121), x, y, 0.65 * big + barrel / 2);
  } else part(t, boxGeo(0.2, 0.2, barrel), M(0x212121), 0, 0.3, 0.65 + barrel / 2);
  gunMuzzle(u, t, 0, 0.3, 0.65 * big + barrel);
  if (tier >= 5) {
    // Improved Blueprints: a shield plate in front
    const sh = part(t, boxGeo(1.8, 1.2, 0.1), glowThing(u, 0x40c4ff), 0, 0.4, 0.9 * big);
    sh.material.transparent = true;
    sh.material.opacity = 0.45;
  }
  if (tier >= 6) {
    const pod = part(t, boxGeo(0.8, 0.8, 1.2), M(0x3e2723), 0.95, 0.6, 0);
    for (const y of [-0.2, 0.2]) part(pod, boxGeo(0.25, 0.25, 0.06), M(0xff6d00), 0, y, 0.61);
    u.cannon = gunMuzzle(u, t, 0.95, 0.6, 0.7);
    u.muzzles.pop();
  }
  u.tracer = tier >= 6 ? 0xffab40 : tier >= 4 ? 0xffd54f : 0xffe082;
  u.height = 2.8;
  return u;
}

/** Necromancer gravestone. Level 2 is taller with green runes, level 3 dark stone with red ones. */
export function makeGrave(lvl) {
  const u = makeThing();
  const { M } = u;
  const stone = M(lvl >= 3 ? 0x37474f : lvl >= 2 ? 0x78909c : 0x9e9e9e);
  const hgt = lvl >= 2 ? 2.6 : 2;
  part(u.body, boxGeo(2.0, 0.3, 1.4), M(0x5d4037), 0, 0.12, 0.3); // dirt mound
  part(u.body, boxGeo(1.3, hgt, 0.4), stone, 0, hgt / 2, 0);
  part(u.body, boxGeo(0.9, 0.3, 0.42), stone, 0, hgt + 0.1, 0); // rounded top
  const rune = lvl >= 3 ? glowThing(u, 0xff1744) : lvl >= 2 ? glowThing(u, 0x76ff03) : M(0x616161);
  part(u.body, boxGeo(0.15, 0.9, 0.05), rune, 0, hgt * 0.6, 0.22); // cross
  part(u.body, boxGeo(0.6, 0.15, 0.05), rune, 0, hgt * 0.7, 0.22);
  return u;
}

/**
 * Hacker: a dark hoodie with the hood up, hacking from a smartphone (Lv 1-3), green visor from
 * Lv 3, a wrist gadget from Lv 4, a botnet antenna pack at Lv 5. Top path: a glowing violet
 * overclocked gadget. Bottom path: an open laptop held in both hands.
 */
export function makeHacker(level, bottom = false) {
  const top = level >= 5 && !bottom;
  const laptop = level >= 5 && bottom;
  const code = top ? 0xd500f9 : 0x00e676;
  const hoodie = top ? 0x1a0033 : laptop ? 0x102027 : 0x263238;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: hoodie, pants: 0x212121, arms: hoodie, face: 'soldier' });
  const { M } = h;
  const dark = M(0x111111);
  part(h.head, boxGeo(1.45, 1.4, 1.3), M(hoodie), 0, 0.68, -0.12); // hood
  part(h.head, boxGeo(1.25, 0.25, 0.1), M(hoodie), 0, 1.28, 0.6); // hood brim
  part(h.torso, boxGeo(1.2, 0.5, 0.1), M(0x37474f), 0, -0.55, 0.52); // hoodie pocket
  part(h.torso, boxGeo(0.12, 0.7, 0.08), M(0xbdbdbd), -0.35, 0.55, 0.52); // drawstrings
  part(h.torso, boxGeo(0.12, 0.7, 0.08), M(0xbdbdbd), 0.35, 0.55, 0.52);
  if (level >= 1) {
    // Signal Booster: headphones
    part(h.head, boxGeo(1.6, 0.2, 0.25), dark, 0, 1.38, 0);
    for (const x of [-0.78, 0.78]) part(h.head, boxGeo(0.25, 0.55, 0.5), dark, x, 0.65, 0);
  }
  if (level >= 2) part(h.head, boxGeo(1.15, 0.28, 0.1), glow(h, code), 0, 0.82, 0.65); // 1337 visor
  if (level >= 4) {
    // Botnet: a server pack with an antenna and blinking lights
    part(h.torso, boxGeo(1.5, 1.7, 0.7), M(0x37474f), 0, 0, -0.85);
    for (const y of [-0.4, 0, 0.4]) part(h.torso, boxGeo(0.9, 0.1, 0.05), glow(h, code), 0, y, -1.22);
    part(h.torso, boxGeo(0.12, 1.8, 0.12), M(0x9e9e9e), 0.5, 1.6, -0.85);
    part(h.torso, boxGeo(0.28, 0.28, 0.28), glow(h, 0xff1744), 0.5, 2.55, -0.85);
  }
  const muzzle = new THREE.Object3D();
  if (laptop) {
    // Mainframe: an open laptop held out in front with both hands.
    h.rightArm.rotation.set(-1.2, 0, 0.35);
    h.leftArm.rotation.set(-1.2, 0, -0.35);
    h.pose = { right: -1.2, left: -1.2, leftRecoil: 0.05 };
    const lap = new THREE.Group();
    lap.position.set(0, 2.7, 1.9);
    h.body.add(lap);
    part(lap, boxGeo(2.2, 0.12, 1.5), M(0x455a64), 0, 0, 0); // base
    part(lap, boxGeo(2.0, 0.04, 0.9), dark, 0, 0.08, 0.2); // keyboard
    const lid = part(lap, boxGeo(2.2, 1.4, 0.1), M(0x455a64), 0, 0.68, -0.72);
    lid.rotation.x = -0.25;
    part(lid, boxGeo(2.0, 1.2, 0.04), glow(h, code), 0, 0, 0.06); // screen
    part(lid, boxGeo(0.35, 0.35, 0.05), M(0xeceff1), 0, 0, -0.07); // logo
    muzzle.position.set(0, 0.9, -0.5);
    lap.add(muzzle);
  } else {
    // Smartphone in the right hand (Lv 1-3), then a wrist gadget that shoots synapses.
    h.rightArm.rotation.set(-1.25, 0, 0.15);
    h.leftArm.rotation.set(-0.9, 0, -0.45);
    h.pose = { right: -1.25, left: -0.9, leftRecoil: 0.05 };
    if (level < 3) {
      const phone = part(h.rightArm, boxGeo(0.55, 0.12, 0.95), dark, 0, -2.05, 0.35);
      part(phone, boxGeo(0.45, 0.04, 0.8), glow(h, code), 0, 0.07, 0);
      muzzle.position.set(0, -2.1, 0.9);
    } else {
      const big = top ? 1.25 : 1;
      part(h.rightArm, boxGeo(1.15 * big, 0.7, 1.15 * big), M(top ? 0x311b92 : 0x37474f), 0, -1.35, 0); // gadget band
      part(h.rightArm, boxGeo(0.7, 0.12, 0.7), glow(h, code), 0, -1.35, 0.6 * big); // screen
      part(h.rightArm, boxGeo(0.3, 0.3, 0.3), glow(h, code), 0, -2.1, 0.45); // emitter
      if (top) for (const y of [-0.9, -1.8]) part(h.rightArm, boxGeo(1.2, 0.1, 1.2), glow(h, code), 0, y, 0); // overclock rings
      // The left hand holds a phone too.
      const phone = part(h.leftArm, boxGeo(0.55, 0.12, 0.95), dark, 0, -2.05, 0.35);
      part(phone, boxGeo(0.45, 0.04, 0.8), glow(h, code), 0, 0.07, 0);
      muzzle.position.set(0, -2.2, 0.45);
    }
    h.rightArm.add(muzzle);
  }
  h.muzzles = [muzzle];
  h.tracer = code;
  return h;
}
export const makeHackerBottom = (level) => makeHacker(level, true);

/**
 * Hacker hologram: a converted zombie rebuilt in see-through glowing cyan. It walks like a unit
 * (`walk` legs are swung by the view).
 */
export function makeHologram(def) {
  const h = makeEnemy(def);
  for (const m of h.mats) {
    m.color?.setHex(0x00bcd4);
    if (m.map) m.map = null;
    m.userData.glow = 0x00838f;
    m.emissive?.setHex(0x00838f);
    m.needsUpdate = true;
  }
  setOpacity(h, 0.55);
  h.root.scale.setScalar(def.scale ?? 1);
  if (h.leftLeg && h.rightLeg) h.walk = [h.leftLeg, h.rightLeg];
  if (h.leftArm && h.rightArm) h.leftArm.rotation.x = h.rightArm.rotation.x = -Math.PI / 2; // zombie arms out
  h.muzzles = [];
  h.wheels = [];
  h.height = (def.h ?? 5.2) * (def.scale ?? 1);
  h.holo = true;
  return h;
}

/** A glowing material for makeThing() models. */
export function glowThing(u, color) {
  const m = u.M(color);
  m.userData.glow = color;
  m.emissive.setHex(color);
  m.emissiveIntensity = 0.8;
  return m;
}

/**
 * John: a guy in a hoodie and jeans with a pistol. Top path: a vest at Lv 2, a silver Desert
 * Eagle at Lv 4, dual Deagles at Lv 5 and a glowing red rage headband at Lv 6. Bottom path: a
 * visor at Lv 2, a chef hat at Lv 3, an AK shotgun at Lv 4, armor at Lv 5, and at Lv 6 the
 * Slayer's axe on its back and a railgun on its shoulder.
 */
export function makeJohn(level, bottom = false) {
  const top = !bottom;
  const slayer = bottom && level >= 5;
  const shirt = slayer ? 0x263238 : 0x2e7d32;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x1e3a5f, arms: shirt, face: 'smile' });
  const { M } = h;
  // Hood down around the neck, and messy brown hair
  part(h.torso, boxGeo(1.7, 0.4, 1.2), M(slayer ? 0x1c262b : 0x1b5e20), 0, 0.95, -0.1);
  if (!(bottom && level >= 2)) part(h.head, boxGeo(1.3, 0.35, 1.3), M(0x4e342e), 0, 1.3, -0.02);
  if (top && level >= 1) part(h.torso, boxGeo(2.15, 1.6, 1.15), M(level >= 5 ? 0x3e2723 : 0x37474f), 0, 0.05, 0); // vest
  if (top && level >= 5) {
    // John Rage: a glowing red headband and red eyes
    part(h.head, boxGeo(1.3, 0.22, 1.3), glow(h, 0xff1744), 0, 1.0, 0);
    part(h.head, boxGeo(0.3, 0.15, 0.06), glow(h, 0xff1744), -0.28, 0.7, 0.62);
    part(h.head, boxGeo(0.3, 0.15, 0.06), glow(h, 0xff1744), 0.28, 0.7, 0.62);
  }
  if (bottom && level >= 1) {
    // Visor Upgrade
    part(h.head, boxGeo(1.3, 0.3, 0.12), M(0x212121), 0, 0.72, 0.64);
    part(h.head, boxGeo(1.1, 0.18, 0.06), glow(h, 0x40c4ff), 0, 0.72, 0.71);
  }
  if (bottom && level >= 2 && !slayer) {
    // Chef Knowledge: a tall white chef hat
    part(h.head, boxGeo(1.3, 0.3, 1.3), M(0xfafafa), 0, 1.3, 0);
    part(h.head, boxGeo(1.6, 0.9, 1.6), M(0xffffff), 0, 1.85, 0);
  }
  if (bottom && level >= 4) {
    part(h.torso, boxGeo(2.2, 1.7, 1.2), M(0x37474f), 0, 0.05, 0); // armor plates
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.15, 0.6, 1.15), M(0x455a64), 0, -0.2, 0);
  }
  if (slayer) {
    helmet(h, 0x263238, false);
    part(h.head, boxGeo(1.3, 0.25, 0.08), glow(h, 0x76ff03), 0, 0.72, 0.68);
    // Axe on its back
    const axe = part(h.torso, boxGeo(0.2, 2.8, 0.2), M(0x5d4037), 0.3, 0.1, -0.75);
    axe.rotation.z = 0.5;
    part(axe, boxGeo(0.12, 0.9, 1.0), M(0xb0bec5), 0, 1.15, -0.3);
    // Railgun on the left shoulder
    part(h.torso, boxGeo(0.5, 0.5, 2.4), M(0x212121), 1.2, 1.25, 0.4);
    for (let i = 0; i < 3; i++) part(h.torso, boxGeo(0.6, 0.6, 0.15), glow(h, 0x29b6f6), 1.2, 1.25, -0.2 + i * 0.6);
  }
  if (bottom && level >= 3) {
    // AK Shotgun: a rifle body with a drum mag
    const gun = holdLongGun(h, 1.9, M(0x3e2723));
    part(gun, boxGeo(0.36, 0.9, 0.46), M(0x212121), 0, -1.1, 0);
    part(gun, boxGeo(0.55, 0.55, 0.55), M(0x424242), 0, -0.6, 0.45);
    h.tracer = slayer ? 0x76ff03 : 0xffab40;
    return h;
  }
  const deagle = top && level >= 3;
  const opts = { body: deagle ? 0xb0bec5 : 0x2b2b2b, trim: top && level >= 5 ? 0xff1744 : null };
  const muzzles = [addHandgun(h, h.rightArm, opts)];
  if (top && level >= 4) {
    muzzles.push(addHandgun(h, h.leftArm, opts));
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.08);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.08);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
  } else {
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.25 };
  }
  h.muzzles = muzzles;
  h.tracer = top && level >= 5 ? 0xff5252 : 0xffe066;
  return h;
}
const makeJohnBottom = (level) => makeJohn(level, true);

/**
 * Juggernaut (alternate Commando form): a huge armored gunner with a minigun. Top path: heavier
 * armor and a longer barrel, orange HE glow at Lv 6. Bottom path: two miniguns from Lv 4 and a
 * cybernetic cyan glow from Lv 5. A purple Dimension Shard emblem marks it as an alternate form.
 */
export function makeJuggernaut(level, bottom = false) {
  const top = !bottom;
  const cyber = bottom && level >= 4;
  const shirt = cyber ? 0x1c262b : 0x4e342e;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: 0x2b2b2b, arms: shirt, face: 'soldier' });
  const { M } = h;
  h.body.scale.setScalar(1.2);
  const shard = glow(h, 0xb388ff);
  const dark = M(0x212121);
  const plate = M(cyber ? 0x263238 : top && level >= 5 ? 0x3e2723 : 0x5d4037);
  // Bomb-suit style helmet and chest plate
  part(h.head, boxGeo(1.5, 1.4, 1.5), plate, 0, 0.65, -0.05);
  part(h.head, boxGeo(1.2, 0.35, 0.08), cyber ? glow(h, 0x18ffff) : M(0x90a4ae), 0, 0.7, 0.72);
  part(h.torso, boxGeo(2.2, 1.8, 1.2), plate, 0, 0.05, 0);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, -0.55, 0.45, 0.62);
  if (level >= 1) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.1, 0.55, 1.1), dark, 0, -1.75, 0); // gloves
  if (level >= 2) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.2, 0.7, 1.2), plate, 0, -0.2, 0); // shoulder pads
  if (top && level >= 5) part(h.torso, boxGeo(0.6, 0.6, 0.1), glow(h, 0xff6d00), 0, 0.3, 0.62); // HE core
  if (cyber && level >= 4) part(h.torso, boxGeo(0.6, 0.6, 0.1), glow(h, 0x18ffff), 0, 0.3, 0.62);
  part(h.torso, boxGeo(1.6, 1.8, 0.9), M(0x3e3a2a), 0, 0, -1.0); // ammo backpack

  const dual = bottom && level >= 3;
  const barrelMat = top && level >= 5 ? glow(h, 0xff6d00) : cyber ? glow(h, 0x18ffff) : M(0x1f1f1f);
  const long = top && level >= 3 ? 2.4 : 1.9;
  const gunOn = (arm) => {
    const gun = new THREE.Group();
    gun.position.set(0, -1.9, 0);
    arm.add(gun);
    const body = M(0x424242);
    part(gun, boxGeo(0.8, 1.2, 0.85), body, 0, -0.5, 0);
    const barrels = new THREE.Group();
    barrels.position.set(0, -1.1, 0);
    gun.add(barrels);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(barrels, boxGeo(0.15, long, 0.15), barrelMat, Math.cos(a) * 0.27, -long / 2, Math.sin(a) * 0.27);
    }
    part(barrels, boxGeo(0.7, 0.12, 0.7), body, 0, -long + 0.2, 0);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, -1.2 - long, 0);
    gun.add(muzzle);
    return { muzzle, barrels };
  };
  const right = gunOn(h.rightArm);
  h.muzzles = [right.muzzle];
  h.spin = [right.barrels];
  if (dual) {
    const left = gunOn(h.leftArm);
    h.muzzles.push(left.muzzle);
    h.spin.push(left.barrels);
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.08);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.08);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.1 };
  } else {
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil: 0.1 };
  }
  h.recoilScale = 0.2;
  h.tracer = top && level >= 5 ? 0xff9100 : cyber ? 0x18ffff : 0xffd740;
  return h;
}
const makeJuggernautBottom = (level) => makeJuggernaut(level, true);

/**
 * Laser Railgunner (alternate Railgunner form): a trooper with a red laser rail rifle. Top path:
 * Rail Trooper armor from Lv 4, a bigger glowing rifle at Lv 5-6. Bottom path: sits behind a
 * mounted laser turret from Lv 4, twin barrels at Lv 5 and the giant XRT-9000 at Lv 6.
 */
export function makeLaserRailgunner(level, bottom = false) {
  const top = !bottom;
  const trooper = top && level >= 3;
  const shirt = trooper ? 0xeceff1 : 0x37474f;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: trooper ? 0x90a4ae : 0x263238, arms: shirt, face: 'soldier' });
  const { M } = h;
  const laser = 0xff1744;
  const shard = glow(h, 0xb388ff);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, -0.55, 0.45, 0.52);
  if (trooper) {
    helmet(h, 0xeceff1, false);
    part(h.head, boxGeo(1.25, 0.35, 0.08), glow(h, laser), 0, 0.72, 0.7);
    part(h.torso, boxGeo(2.2, 1.7, 1.2), M(0xcfd8dc), 0, 0.05, 0);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.15, 0.6, 1.15), M(0xb0bec5), 0, -0.2, 0);
  } else {
    part(h.head, boxGeo(1.35, 0.35, 1.35), M(0x263238), 0, 1.2, 0);
    part(h.head, boxGeo(0.35, 0.3, 0.1), glow(h, laser), -0.28, 0.7, 0.62); // targeting monocle
  }
  if (level >= 1) part(h.torso, boxGeo(1.5, 1.8, 0.7), M(0x263238), 0, 0, -0.85); // cooling / power pack
  if (level >= 2) part(h.torso, boxGeo(0.35, 1.4, 0.1), glow(h, laser), 0, 0, -1.22);

  if (top || level < 3) {
    const len = top && level >= 4 ? 3.6 : 3.0;
    const gun = holdLongGun(h, len, M(trooper ? 0xb0bec5 : 0x263238));
    const coils = top && level >= 4 ? 5 : 4;
    for (let i = 0; i < coils; i++) part(gun, boxGeo(0.45, 0.1, 0.55), glow(h, laser), 0, -0.8 - i * 0.5, 0);
    part(gun, boxGeo(0.22, 0.8, 0.3), M(0x111111), 0, -0.7, 0.35); // scope
    h.muzzles[0].position.y = -len - 0.1;
    h.tracer = laser;
    h.tracerWidth = top && level >= 4 ? 0.5 : 0.35;
    return h;
  }

  // Sentry / Dual Barrels / XRT-9000: a mounted laser cannon on the root.
  const xrt = level >= 5;
  const dual = level >= 4;
  const mount = new THREE.Group();
  h.root.add(mount);
  const steel = M(xrt ? 0x263238 : 0x546e7a);
  const barrelLen = xrt ? 8 : 5.5;
  const bw = xrt ? 1.3 : 0.6;
  const gy = xrt ? 3.2 : 2.7;
  const gz = xrt ? 1.8 : 1.2;
  part(mount, boxGeo(xrt ? 3.6 : 2.4, 1.6, xrt ? 3.6 : 2.4), steel, 0, 0.8, gz);
  part(mount, boxGeo(bw * (dual ? 2.4 : 1) + 0.6, bw + 0.6, 1.8), steel, 0, gy, gz);
  const xs = dual && !xrt ? [-0.5, 0.5] : [0];
  for (const x of xs) {
    part(mount, boxGeo(bw, bw, barrelLen), M(0x212121), x, gy, gz + barrelLen / 2 + 0.5);
    for (let i = 0; i < 5; i++) part(mount, boxGeo(bw + 0.25, bw + 0.25, 0.25), glow(h, laser), x, gy, gz + 1.3 + i * ((barrelLen - 1) / 5));
  }
  if (xrt) part(mount, boxGeo(0.8, 0.8, 0.8), shard, 0, gy + bw, gz); // XRT core
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, gy, gz + barrelLen + 0.6);
  mount.add(muzzle);
  h.muzzles = [muzzle];
  part(h.root, boxGeo(1.6, 1.0, 1.4), steel, 0, 0.5, -0.3); // seat
  h.lift = -0.9;
  h.bob = 0.02;
  h.body.position.y = h.lift;
  h.rightLeg.rotation.x = -Math.PI / 2;
  h.leftLeg.rotation.x = -Math.PI / 2;
  h.rightArm.rotation.set(-Math.PI / 2 + 0.2, 0, 0.2);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.2, 0, -0.2);
  h.pose = { right: -Math.PI / 2 + 0.2, left: -Math.PI / 2 + 0.2, leftRecoil: 0.35 };
  h.tracer = laser;
  h.tracerWidth = xrt ? 1.2 : 0.6;
  return h;
}
const makeLaserRailgunnerBottom = (level) => makeLaserRailgunner(level, true);

/**
 * Slammer (alternate Enforcer form): a strong woman with a big sledgehammer. Top path: a bigger,
 * heavier hammer (fiery at Lv 6). Bottom path: a glowing blue Shock Hammer from Lv 4 with a
 * battery pack. A purple Dimension Shard emblem marks it as an alternate form.
 */
export function makeSlammer(level, bottom = false) {
  const top = !bottom;
  const shock = bottom && level >= 3;
  const shirt = shock ? 0x0d47a1 : 0xad1457;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt, pants: 0x37474f, arms: 0xf1c27d, face: 'smile' });
  const { M } = h;
  const shard = glow(h, 0xb388ff);
  // Ponytail and a headband
  part(h.head, boxGeo(1.3, 0.4, 1.3), M(0x6d4c41), 0, 1.3, -0.02);
  part(h.head, boxGeo(0.5, 1.0, 0.5), M(0x6d4c41), 0, 0.9, -0.85);
  part(h.head, boxGeo(1.3, 0.2, 1.3), M(shock ? 0x40c4ff : 0xffffff), 0, 1.05, 0);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, -0.55, 0.45, 0.52);
  if (level >= 1) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.05, 0.5, 1.05), M(0x212121), 0, -1.75, 0); // gloves
  if (level >= 2) part(h.torso, boxGeo(2.1, 0.35, 1.1), M(0x3e2723), 0, -0.85, 0); // lifting belt
  if (level >= 3) part(h.torso, boxGeo(2.15, 1.5, 1.15), M(shock ? 0x1565c0 : 0x880e4f), 0, 0.15, 0); // armor
  if (shock) {
    part(h.torso, boxGeo(1.3, 1.4, 0.6), M(0x263238), 0, 0, -0.8); // battery pack
    part(h.torso, boxGeo(0.3, 1.0, 0.1), glow(h, 0x40c4ff), 0, 0, -1.12);
  }
  // Sledgehammer
  const big = top ? [1, 1, 1.15, 1.3, 1.45, 1.65][level] : 1 + level * 0.05;
  const ham = new THREE.Group();
  ham.position.set(0, -1.9, 0);
  ham.scale.setScalar(big);
  h.rightArm.add(ham);
  part(ham, boxGeo(0.28, 2.6, 0.28), M(0x5d4037), 0, -1.1, 0);
  const headMat = top && level >= 5 ? glow(h, 0xff6d00) : shock ? M(0x1e88e5) : M(0x616161);
  part(ham, boxGeo(0.9, 0.9, 1.6), headMat, 0, -2.4, 0);
  if (shock) for (const z of [-0.6, 0.6]) part(ham, boxGeo(1.0, 0.2, 0.2), glow(h, 0x80d8ff), 0, -2.4, z);
  if (top && level >= 3) part(ham, boxGeo(1.0, 1.0, 0.2), M(0x212121), 0, -2.4, 0); // steel band
  setMuzzle(h, ham, 0, -2.6, 0);
  h.rightArm.rotation.set(-2.6, 0, 0.15);
  h.leftArm.rotation.set(-2.4, 0, -0.3);
  h.pose = { right: -2.6, left: -2.4, leftRecoil: 0 };
  h.swing = 2.2;
  h.melee = true;
  h.tracer = shock ? 0x40c4ff : top && level >= 5 ? 0xff6d00 : 0xffffff;
  return h;
}
const makeSlammerBottom = (level) => makeSlammer(level, true);

/**
 * XWM Turret (alternate Turret form): a big walker-style gun pod with a pilot in the cockpit.
 * Top path: a long gun, then 2 and 4 spinning miniguns. Bottom path: a heavier barrel, then
 * rocket launchers and finally huge missile pods. A purple Dimension Shard emblem marks it.
 */
export function makeXwm(level, bottom = false) {
  const u = makeThing();
  const { M } = u;
  const top = !bottom;
  const metal = M(level >= 5 ? 0x37474f : 0x607d8b);
  const dark = M(0x1c1c1c);
  const shard = glowThing(u, 0xb388ff);
  // Legs and base
  part(u.body, boxGeo(4.6, 0.5, 4.6), M(0x9e9e9e), 0, 0.25, 0);
  for (const x of [-1.4, 1.4]) part(u.body, boxGeo(0.8, 2.2, 1.2), metal, x, 1.5, 0);
  // Cockpit pod
  const head = new THREE.Group();
  head.position.set(0, 2.6, 0);
  u.body.add(head);
  part(head, boxGeo(3.0, 2.0, 3.0), metal, 0, 1.0, 0);
  const glass = part(head, boxGeo(1.8, 0.8, 0.1), M(0x80d8ff), 0, 1.4, 1.52);
  glass.material.transparent = true;
  glass.material.opacity = 0.7;
  part(head, boxGeo(0.6, 0.6, 0.6), M(0xe0ac69), 0, 1.3, 1.0); // pilot's head behind the glass
  part(head, boxGeo(0.4, 0.4, 0.06), shard, 1.1, 0.5, 1.52);
  if (level >= 1) for (const x of [-1, 1]) part(head, boxGeo(0.25, 1.6, 2.6), M(0x455a64), x * 1.62, 1.0, 0); // armor
  const muzzleZ = (len) => 1.5 + len;
  if (top) {
    if (level < 3) {
      const len = level >= 2 ? 4 : 3;
      const bw = level >= 1 ? 0.45 : 0.35;
      for (const x of [-1.9, 1.9]) {
        part(head, boxGeo(bw, bw, len), dark, x, 0.9, 1.5 + len / 2 - 0.5);
        gunMuzzle(u, head, x, 0.9, muzzleZ(len) - 0.3);
      }
    } else {
      // Dual / Quad / Super Quad Miniguns
      u.spin = [];
      const xs = level >= 4 ? [-2.0, -1.4, 1.4, 2.0] : [-1.9, 1.9];
      const len = level >= 5 ? 3.6 : 3;
      for (const x of xs) {
        // Barrels run along the group's Y axis (views spin it around Y), tipped forward to +Z.
        const mount = new THREE.Group();
        mount.position.set(x, 0.9, 1.5);
        mount.rotation.x = Math.PI / 2;
        head.add(mount);
        const barrels = new THREE.Group();
        mount.add(barrels);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          part(barrels, boxGeo(0.12, len, 0.12), level >= 5 ? glowThing(u, 0x18ffff) : dark, Math.cos(a) * 0.22, len / 2, Math.sin(a) * 0.22);
        }
        u.spin.push(barrels);
        gunMuzzle(u, head, x, 0.9, muzzleZ(len));
      }
    }
    u.tracer = level >= 5 ? 0x18ffff : 0xffe066;
  } else if (level < 3) {
    const len = 3 + level * 0.5;
    const bw = 0.4 + level * 0.12;
    for (const x of [-1.9, 1.9]) {
      part(head, boxGeo(bw, bw, len), dark, x, 0.9, 1.5 + len / 2 - 0.5);
      gunMuzzle(u, head, x, 0.9, muzzleZ(len) - 0.3);
    }
    u.tracer = 0xffab40;
  } else {
    // Rocket Launchers / Missile Pods: boxes of tubes on each side
    const pod = level >= 4 ? 2.0 : 1.4;
    for (const x of [-1, 1]) {
      const px = x * (1.5 + pod / 2);
      part(head, boxGeo(pod, pod, 2.2), level >= 5 ? M(0x263238) : M(0x4e5b31), px, 1.0, 0.3);
      const n = level >= 4 ? 3 : 2;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const ox = px + (i - (n - 1) / 2) * (pod / n);
        const oy = 1.0 + (j - (n - 1) / 2) * (pod / n);
        part(head, boxGeo(pod / n - 0.12, pod / n - 0.12, 0.1), level >= 5 ? glowThing(u, 0xff3d00) : dark, ox, oy, 1.42);
      }
      gunMuzzle(u, head, px, 1.0, 1.6);
    }
    u.projectile = { color: 0xff7043, size: level >= 5 ? 0.6 : 0.45 };
    u.tracer = 0xff7043;
  }
  u.static = true;
  return u;
}
const makeXwmBottom = (level) => makeXwm(level, true);

/** Spinning minigun barrels along +Z inside `parent`; returns the spinning group. */
export function miniBarrels(u, parent, x, y, z, len, n, r, mat) {
  const mount = new THREE.Group();
  mount.position.set(x, y, z);
  mount.rotation.x = Math.PI / 2;
  parent.add(mount);
  const barrels = new THREE.Group();
  mount.add(barrels);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    part(barrels, boxGeo(0.1, len, 0.1), mat, Math.cos(a) * r, len / 2, Math.sin(a) * r);
  }
  (u.spin ??= []).push(barrels);
  return barrels;
}

/**
 * Sentry: a small gun on a tripod. Top path: a longer barrel at Lv 3, a bigger gun at Lv 4, sabot
 * ammo box at Lv 5 and a dark X-Sentry with glowing stripes at Lv 6. Bottom path: a scope at Lv 2,
 * a thicker barrel at Lv 3, then a minigun with a rocket pod (two pods and a big frame at Lv 6).
 */
export function makeSentryTower(level, bottom = false) {
  const u = makeThing();
  const { M } = u;
  const xs = !bottom && level >= 5;
  const xwm = bottom && level >= 5;
  const metal = M(xs ? 0x263238 : xwm ? 0x37474f : 0x78909c);
  const dark = M(0x212121);
  const accent = xs ? glowThing(u, 0x00e5ff) : xwm ? glowThing(u, 0xff6d00) : M(0xfbc02d);
  // Tripod
  part(u.body, boxGeo(0.5, 1.2, 0.5), metal, 0, 0.6, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = part(u.body, boxGeo(0.18, 0.18, 1.3), dark, Math.sin(a) * 0.55, 0.15, Math.cos(a) * 0.55);
    leg.rotation.y = a;
  }
  const gun = new THREE.Group();
  gun.position.set(0, 1.45, 0);
  gun.scale.setScalar(bottom ? (level >= 5 ? 1.35 : level >= 3 ? 1.15 : 1) : level >= 3 ? 1.2 : 1);
  u.body.add(gun);
  part(gun, boxGeo(0.8, 0.6, 1.1), metal, 0, 0, -0.1); // body
  part(gun, boxGeo(0.82, 0.08, 0.9), accent, 0, 0.32, -0.1); // stripe
  if (bottom && level >= 3) {
    miniBarrels(u, gun, 0, 0, 0.4, level >= 5 ? 1.8 : 1.5, 6, 0.16, dark);
    gunMuzzle(u, gun, 0, 0, level >= 5 ? 2.2 : 1.9);
    // Rocket pods on the side
    const pods = level >= 5 ? [-1, 1] : [1];
    for (const side of pods) {
      part(gun, boxGeo(0.5, 0.5, 0.9), M(0x4e5b31), side * 0.7, 0.1, 0);
      for (const oy of [-0.12, 0.12]) part(gun, boxGeo(0.16, 0.16, 0.05), xwm ? accent : dark, side * 0.7, 0.1 + oy, 0.46);
    }
    if (level >= 5) for (const side of [-1, 1]) part(u.body, boxGeo(0.15, 1.6, 0.15), metal, side * 0.9, 1.2, -0.5); // frame
    u.projectile = { color: 0xff7043, size: 0.35 };
    u.tracer = 0xffe066;
  } else {
    const len = !bottom && level >= 2 ? 1.6 : 1.1;
    const bw = (bottom && level >= 2) || (!bottom && level >= 3) ? 0.26 : 0.18;
    part(gun, boxGeo(bw, bw, len), dark, 0, 0.05, 0.45 + len / 2);
    if (!bottom && level >= 3) part(gun, boxGeo(0.34, 0.34, 0.25), dark, 0, 0.05, 0.45 + len); // muzzle brake
    gunMuzzle(u, gun, 0, 0.05, 0.6 + len);
    if (!bottom && level >= 4) part(gun, boxGeo(0.4, 0.35, 0.5), M(0x556b2f), -0.6, -0.1, -0.1); // sabot ammo box
    u.tracer = xs ? 0x00e5ff : 0xffe066;
  }
  if (bottom && level >= 1) part(gun, boxGeo(0.2, 0.2, 0.6), M(0x111111), 0, 0.42, 0.1); // optics
  u.static = true;
  return u;
}
const makeSentryTowerBottom = (level) => makeSentryTower(level, true);

/**
 * AA Turret: a launcher on a turntable with a radar dish. Top path: one missile tube per missile
 * in its burst, in a bigger rack each level (white Patriot boxes at Lv 6). Bottom path: a bigger
 * radar at Lv 3, then a C-RAM: a white dome over a spinning gatling (two at Lv 5, bigger at Lv 6).
 */
export function makeAATurret(level, bottom = false) {
  const u = makeThing();
  const { M } = u;
  const olive = M(0x5d6b3a);
  const dark = M(0x212121);
  const white = M(0xeceff1);
  part(u.body, boxGeo(2.6, 0.4, 2.6), M(0x9e9e9e), 0, 0.2, 0);
  part(u.body, boxGeo(1.6, 0.5, 1.6), dark, 0, 0.65, 0);
  const head = new THREE.Group();
  head.position.set(0, 0.9, 0);
  u.body.add(head);
  // Radar dish on a mast at the back
  const big = bottom && level >= 2;
  part(head, boxGeo(0.15, big ? 1.8 : 1.2, 0.15), dark, 0, big ? 0.9 : 0.6, -1.0);
  const dish = part(head, boxGeo(big ? 1.4 : 0.9, big ? 0.9 : 0.6, 0.1), white, 0, big ? 1.8 : 1.2, -1.0);
  dish.rotation.x = -0.4;
  if (bottom && level >= 3) {
    const ram = level >= 4 ? [-0.55, 0.55] : [0];
    const size = level >= 5 ? 1.25 : 1;
    for (const x of ram) {
      part(head, boxGeo(0.9 * size, 1.1 * size, 1.0 * size), white, x, 0.7, 0.1); // dome
      miniBarrels(u, head, x, 0.5, 0.6, 1.6 * size, 6, 0.14 * size, dark);
      gunMuzzle(u, head, x, 0.5, 0.6 + 1.6 * size);
    }
    u.tracer = 0xffab40;
  } else {
    const burst = TOWERS[bottom ? 'aaTurretBottom' : 'aaTurret'].levels[level].burst || 1;
    const cols = Math.min(burst, 4);
    const rows = Math.ceil(burst / cols);
    const patriot = !bottom && level >= 5;
    const tube = patriot ? 0.55 : 0.4;
    const w = cols * tube + 0.3;
    const h = rows * tube + 0.3;
    const rack = new THREE.Group();
    rack.position.set(0, 0.6 + h / 2, 0.2);
    rack.rotation.x = -0.35; // tilted up to the sky
    head.add(rack);
    part(rack, boxGeo(w, h, patriot ? 2.4 : 1.6), patriot ? white : olive, 0, 0, 0);
    for (let i = 0; i < burst; i++) {
      const cx = ((i % cols) - (cols - 1) / 2) * tube;
      const cy = (Math.floor(i / cols) - (rows - 1) / 2) * tube;
      part(rack, boxGeo(tube - 0.1, tube - 0.1, 0.06), dark, cx, cy, patriot ? 1.21 : 0.81);
      if (!patriot) part(rack, boxGeo(0.12, 0.12, 0.2), M(0xe53935), cx, cy, 0.85); // missile tips
    }
    gunMuzzle(u, rack, 0, 0, patriot ? 1.3 : 0.9);
    for (const side of [-1, 1]) part(head, boxGeo(0.15, 0.9, 0.6), dark, side * (w / 2 + 0.1), 0.6, 0.2); // rack arms
    u.projectile = { color: 0xeceff1, size: patriot ? 0.55 : 0.4 };
    u.tracer = 0xffffff;
  }
  u.static = true;
  return u;
}
const makeAATurretBottom = (level) => makeAATurret(level, true);

/**
 * Patrol Boat: a grey gunboat floating on the water, facing +Z. Top path: Lv 1 an ammo box,
 * Lv 2 a RHIB with orange inflatable sides, Lv 3 the bigger Attack Boat with an explosive cannon,
 * Lv 4 twin cannons, Lv 5 Hellfire missile pods on the cabin. Bottom path: Lv 1 a scoped Smart Gun,
 * Lv 2 cooling jackets on the barrel, Lv 3 a flamethrower with a fuel tank, Lv 4 the armored
 * Monitor, Lv 5 twin flame nozzles fed by big glowing Flame Tanks.
 */
export function makePatrolBoat(level, bottom = false) {
  const u = makeThing();
  const { M } = u;
  const top = !bottom;
  const big = level >= 3; // Attack Boat / Flamethrower and up have a bigger hull
  const monitor = bottom && level >= 4;
  const hullC = M(monitor ? 0x37474f : top && level >= 3 ? 0x546e7a : 0x78909c);
  const deck = M(monitor ? 0x455a64 : 0x9e9e9e);
  const dark = M(0x212121);
  const white = M(0xeceff1);
  const L = big ? 5 : 4.2; // hull length
  const W = big ? 2.5 : 2.1;
  // Hull: a long box with a pointed bow (two angled boxes) and a dark waterline stripe.
  part(u.body, boxGeo(W, 0.8, L), hullC, 0, 0.1, -0.3);
  part(u.body, boxGeo(W + 0.04, 0.18, L + 0.02), dark, 0, -0.2, -0.3);
  for (const side of [-1, 1]) {
    const b = part(u.body, boxGeo(W * 0.72, 0.8, 1.3), hullC, side * W * 0.18, 0.1, L / 2 + 0.2);
    b.rotation.y = side * 0.5;
  }
  part(u.body, boxGeo(W - 0.3, 0.1, L - 0.4), deck, 0, 0.55, -0.3);
  // RHIB+: orange inflatable tubes along both sides.
  if (top && level === 2) for (const side of [-1, 1]) part(u.body, boxGeo(0.45, 0.45, L - 0.4), M(0xff7043), side * (W / 2 + 0.15), 0.3, -0.3);
  // Monitor: armor plates along the sides.
  if (monitor) for (const side of [-1, 1]) part(u.body, boxGeo(0.25, 0.7, L - 0.8), M(0x263238), side * (W / 2 + 0.1), 0.4, -0.3);
  // Cabin at the back with windows.
  const cabH = big ? 1.3 : 1.0;
  part(u.body, boxGeo(W - 0.6, cabH, 1.6), monitor ? M(0x455a64) : white, 0, 0.6 + cabH / 2, -L / 2 + 0.6);
  part(u.body, boxGeo(W - 0.5, 0.3, 0.08), M(0x4fc3f7), 0, 0.6 + cabH * 0.7, -L / 2 + 1.42);
  part(u.body, boxGeo(0.1, 0.9, 0.1), dark, 0, 0.6 + cabH + 0.45, -L / 2 + 0.4); // radio mast
  // Gun mount on the bow, on a turret group that holds the weapons.
  const head = new THREE.Group();
  head.position.set(0, 0.6, big ? 1.1 : 0.9);
  u.body.add(head);
  part(head, boxGeo(1.0, 0.35, 1.0), dark, 0, 0.18, 0);
  const flames = bottom && level >= 3;
  if (flames) {
    // Flamethrower: nozzles on the bow fed by fuel tanks behind them.
    const tanks = level >= 5;
    const tankMat = tanks ? glowThing(u, 0xff6d00) : M(0xc62828);
    const nozzles = tanks ? [-0.4, 0.4] : [0];
    for (const x of nozzles) {
      part(head, boxGeo(0.35, 0.35, 1.6), M(0x424242), x, 0.55, 0.7);
      part(head, boxGeo(0.5, 0.5, 0.3), dark, x, 0.55, 1.55);
      gunMuzzle(u, head, x, 0.55, 1.75);
    }
    const tankXs = tanks ? [-0.7, 0.7] : [0];
    for (const x of tankXs) {
      const r = tanks ? 0.55 : 0.4;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.4, 10), tankMat);
      t.rotation.x = Math.PI / 2;
      t.position.set(x, 0.6 + r, -1.0);
      t.castShadow = true;
      head.add(t);
    }
    u.tracer = 0xff7043;
  } else {
    const cannon = top && level >= 3;
    const xs = top && level >= 4 ? [-0.35, 0.35] : [0];
    const bw = cannon ? 0.3 : 0.18;
    const len = cannon ? 2.0 : 1.6;
    part(head, boxGeo(xs.length > 1 ? 1.2 : 0.7, 0.55, 0.8), M(0x37474f), 0, 0.6, 0); // gun housing
    for (const x of xs) {
      part(head, boxGeo(bw, bw, len), dark, x, 0.65, 0.4 + len / 2);
      // Cooling Barrels: ribbed jackets along the barrel.
      if (bottom && level >= 2) for (let i = 0; i < 3; i++) part(head, boxGeo(bw + 0.14, bw + 0.14, 0.18), M(0x90a4ae), x, 0.65, 0.7 + i * 0.4);
      gunMuzzle(u, head, x, 0.65, 0.5 + len);
    }
    if (bottom && level >= 1) part(head, boxGeo(0.16, 0.2, 0.7), dark, 0, 1.0, 0.3); // Smart Gun scope
    if (top && level >= 1) part(head, boxGeo(0.6, 0.45, 0.5), M(0x556b2f), -0.7, 0.4, -0.2); // ammo box
    u.tracer = cannon ? 0xffab40 : 0xffe082;
    u.projectile = { color: 0xeceff1, size: 0.45 };
  }
  // Hellfire Missiles: a missile pod on each side of the cabin.
  if (top && level >= 5) {
    for (const side of [-1, 1]) {
      const pod = part(u.body, boxGeo(0.6, 0.6, 1.4), M(0x37474f), side * (W / 2 - 0.1), 0.6 + cabH + 0.1, -L / 2 + 0.7);
      pod.rotation.x = -0.25;
      for (const y of [-0.13, 0.13]) part(u.body, boxGeo(0.18, 0.18, 0.1), M(0xe53935), side * (W / 2 - 0.1), 0.6 + cabH + 0.1 + y, -L / 2 + 1.45);
    }
  }
  u.static = true;
  u.bob = 0.08; // rocks gently on the water
  return u;
}
const makePatrolBoatBottom = (level) => makePatrolBoat(level, true);

/**
 * Ghost: a stealth operative in dark gear with a compact SMG. Top path: Lv 1 green eye-sensor
 * goggles, Lv 2 a longer magazine, Lv 3 a hooded stealth cloak, Lv 4 a drone dock on the back (the
 * C7 Drone circles overhead while its ability is on), Lv 5 X-Ghost armor with a glowing visor.
 * Bottom path: Lv 1 ammo pouches, Lv 2 a longer barrel, Lv 3 the Honey Badger rifle with a
 * suppressor, Lv 4 smoke grenades on the chest, Lv 5 heavy armor and a red visor.
 */
export function makeGhost(level, bottom = false) {
  const top = !bottom;
  const cloak = top && level >= 3;
  const xg = top && level >= 5;
  const heavy = bottom && level >= 5;
  const shirt = cloak ? 0x15181d : 0x2b3038;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: 0x1c1f24, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(0x111316);
  const green = glow(h, 0x76ff03);
  const red = glow(h, 0xff1744);
  // Balaclava wrapping the head (a hood once she's cloaked)
  const wrap = M(0x202328);
  part(h.head, boxGeo(1.3, 0.5, 1.3), wrap, 0, 1.15, 0);
  part(h.head, boxGeo(1.28, 0.45, 1.28), wrap, 0, 0.25, 0);
  if (cloak) {
    const hood = M(0x0e1013);
    part(h.head, boxGeo(1.5, 0.3, 1.5), hood, 0, 1.4, -0.05);
    part(h.head, boxGeo(1.5, 1.4, 0.25), hood, 0, 0.75, -0.7);
    for (const x of [-0.75, 0.75]) part(h.head, boxGeo(0.12, 1.3, 1.45), hood, x, 0.75, 0);
    part(h.torso, boxGeo(2.3, 2.5, 0.2), hood, 0, -0.45, -0.62); // cloak
    part(h.torso, boxGeo(0.1, 2.3, 0.08), glow(h, 0x4dd0e1), 1.1, -0.4, -0.72); // shimmering trim
  }
  if (top && level >= 1) {
    // Eye Sensor: goggles with green lenses
    part(h.head, boxGeo(1.25, 0.3, 0.2), dark, 0, 0.75, 0.68);
    for (const x of [-0.27, 0.27]) part(h.head, boxGeo(0.32, 0.22, 0.06), green, x, 0.75, 0.8);
  }
  if (top && level >= 4) {
    // Drone dock on the back
    part(h.torso, boxGeo(1.4, 1.2, 0.5), M(0x37474f), 0, 0.3, -0.8);
    part(h.torso, boxGeo(1.0, 0.12, 0.06), green, 0, 0.6, -1.06);
  }
  if (xg) {
    const plate = M(0x23282f);
    part(h.torso, boxGeo(2.2, 1.6, 1.2), plate, 0, 0, 0);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.15, 0.6, 1.15), plate, 0, -0.2, 0);
    part(h.head, boxGeo(1.3, 0.3, 0.1), green, 0, 0.75, 0.82); // visor
  }
  if (bottom && level >= 1) {
    const n = level >= 2 ? 3 : 2;
    for (let k = 0; k < n; k++) part(h.torso, boxGeo(0.4, 0.45, 0.3), M(0x3e4450), -0.6 + k * 0.6, -0.85, 0.6);
  }
  if (bottom && level >= 3) part(h.torso, boxGeo(2.15, 1.5, 1.15), M(0x30353d), 0, -0.05, 0); // plate carrier
  if (bottom && level >= 4) {
    // Ghost Grenades: smoke grenades on the chest
    for (const x of [-0.55, 0, 0.55]) part(h.torso, boxGeo(0.32, 0.5, 0.32), M(0x7e57c2), x, 0.45, 0.66);
  }
  if (heavy) {
    const plate = M(0x1a1d22);
    part(h.torso, boxGeo(2.3, 1.7, 1.25), plate, 0, 0.05, 0);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.2, 0.7, 1.2), plate, 0, -0.2, 0);
    part(h.head, boxGeo(1.3, 0.3, 0.1), red, 0, 0.75, 0.75);
    for (const x of [-0.55, 0, 0.55]) part(h.torso, boxGeo(0.32, 0.5, 0.32), M(0x7e57c2), x, 0.45, 0.72);
  }

  // Compact SMG; a longer rifle on the Bottom path (the Honey Badger from Lv 3).
  const len = bottom ? (level >= 3 ? 2.8 : level >= 2 ? 2.3 : 1.7) : 1.7;
  const gun = holdLongGun(h, len, M(bottom && level >= 3 ? 0x6d5d45 : 0x2b2b2b));
  part(gun, boxGeo(0.28, 0.4, 0.55), dark, 0, -0.5, -0.4); // magazine
  if (top && level >= 2) part(gun, boxGeo(0.26, 0.4, 0.4), dark, 0, -0.5, -0.85); // extended magazine
  part(gun, boxGeo(0.28, 0.5, 0.35), dark, 0, 0.2, -0.05); // stock
  if (bottom && level >= 3) {
    part(gun, boxGeo(0.3, 1.0, 0.3), dark, 0, -len - 0.5, 0); // suppressor
    part(gun, boxGeo(0.22, 0.7, 0.3), dark, 0, -1.0, 0.36); // sight
    h.muzzles[0].position.y = -len - 1.0;
  } else if (top && level >= 1) part(gun, boxGeo(0.06, len * 0.7, 0.06), green, 0.2, -len * 0.5, 0.2); // laser sight
  h.tracer = top && level >= 1 ? 0xccff90 : 0xffe066;

  if (top && level >= 4) {
    // C7 Drone: a little quadcopter (shown by the tower view while the ability is on).
    const drone = new THREE.Group();
    part(drone, boxGeo(1.0, 0.35, 1.0), M(xg ? 0x263238 : 0x37474f), 0, 0, 0);
    part(drone, boxGeo(0.3, 0.2, 0.15), green, 0, -0.1, 0.55); // camera eye
    const rotors = [];
    for (const [x, z] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]]) {
      part(drone, boxGeo(0.12, 0.12, 0.12), dark, x, 0.15, z);
      const r = new THREE.Group();
      r.position.set(x, 0.25, z);
      part(r, boxGeo(0.9, 0.04, 0.14), dark, 0, 0, 0);
      drone.add(r);
      rotors.push(r);
    }
    if (xg) part(drone, boxGeo(0.4, 0.3, 0.6), M(0x111316), 0, -0.3, 0); // X-Ghost: a gun pod
    drone.userData.rotors = rotors;
    drone.visible = false;
    h.root.add(drone);
    h.drone = drone;
  }
  return h;
}
const makeGhostBottom = (level) => makeGhost(level, true);

/**
 * Toxicnator: a hazmat suit with a gas mask and a grenade launcher. Top path: Lv 1 a filter pack,
 * Lv 3 the MGL's big revolving drum, Lv 4 a speed-loader bandolier and goggles, Lv 5 glowing toxic
 * tanks on the back. Bottom path: Lv 1 shoulder pads, Lv 3 orange Anthrax canisters, Lv 4 an
 * acid-green visor, Lv 5 glowing Gamma Toxins tanks.
 */
export function makeToxicnator(level, bottom = false) {
  const top = !bottom;
  const suitC = bottom && level >= 5 ? 0x3f5f22 : top && level >= 5 ? 0x9e9d24 : 0xc0ca33;
  const h = makeHumanoid({ skin: 0x8d6e63, shirt: suitC, pants: suitC, arms: suitC, face: 'soldier' });
  const { M } = h;
  const dark = M(0x212121);
  const tox = glow(h, bottom && level >= 5 ? 0xe040fb : 0x76ff03);
  // Hood and gas mask
  part(h.head, boxGeo(1.4, 1.35, 1.4), M(suitC), 0, 0.6, -0.03);
  part(h.head, boxGeo(1.1, 0.4, 0.15), M(0x263238), 0, 0.8, 0.7); // eye window
  for (const x of [-0.25, 0.25]) part(h.head, boxGeo(0.35, 0.28, 0.06), bottom && level >= 4 ? tox : M(0x80cbc4), x, 0.8, 0.79);
  part(h.head, boxGeo(0.6, 0.45, 0.4), dark, 0, 0.25, 0.82); // respirator
  for (const x of [-0.45, 0.45]) part(h.head, boxGeo(0.35, 0.35, 0.35), M(0x455a64), x, 0.2, 0.8); // filters

  if (top && level >= 1) part(h.torso, boxGeo(1.2, 1.2, 0.5), M(0x5d6b2f), 0, 0.2, -0.75); // filter pack
  if (top && level >= 4) {
    const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), M(0x4e342e), 0, 0, 0);
    strap.rotation.z = 0.7;
    for (const t of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.3, 0.3, 0.3), tox, t * 0.75, t * -0.8, 0.65);
  }
  if (top && level >= 5) {
    for (const x of [-0.45, 0.45]) {
      part(h.torso, boxGeo(0.6, 1.8, 0.6), M(0x33691e), x, 0.1, -1.1);
      part(h.torso, boxGeo(0.35, 1.3, 0.08), tox, x, 0.1, -1.42);
    }
  }
  if (bottom && level >= 1) for (const s of [-1, 1]) part(h.torso, boxGeo(0.8, 0.4, 1.25), M(0x827717), s * 1.4, 1.0, 0);
  if (bottom && level >= 3) {
    const can = M(level >= 5 ? 0x4a148c : 0xef6c00);
    for (const x of [-0.45, 0.45]) {
      part(h.torso, boxGeo(0.6, 1.6, 0.6), can, x, 0.1, -0.9);
      part(h.torso, boxGeo(0.3, 0.2, 0.3), dark, x, 1.0, -0.9);
    }
    if (level >= 5) for (const x of [-0.45, 0.45]) part(h.torso, boxGeo(0.35, 1.2, 0.08), tox, x, 0.1, -1.22);
  }

  // Grenade launcher: a short fat barrel; the MGL gets a big revolving drum.
  const gun = holdLongGun(h, 2, M(0x37474f));
  part(gun, boxGeo(0.55, 1.2, 0.55), dark, 0, -1.4, 0); // wide barrel
  const drum = top && level >= 3;
  part(gun, boxGeo(drum ? 0.95 : 0.6, drum ? 0.7 : 0.5, drum ? 0.95 : 0.6), drum ? M(0x546e7a) : dark, 0, -0.4, 0);
  if (drum) part(gun, boxGeo(0.3, 0.75, 0.3), tox, 0, -0.4, 0.45);
  part(gun, boxGeo(0.3, 0.5, 0.35), dark, 0, 0.2, -0.05); // stock
  h.muzzles[0].position.y = -2.1;
  h.projectile = { color: bottom && level >= 5 ? 0xe040fb : 0x76ff03, size: 0.5, arc: 3.5 };
  h.tracer = 0x76ff03;
  return h;
}
const makeToxicnatorBottom = (level) => makeToxicnator(level, true);

/**
 * Tesla: a big Tesla coil on a stone plinth (it doesn't turn; bolts leap from the crown).
 * Lv 2 a kite flying from a copper wire, Lv 3 battery packs around the base, Lv 4 a gold
 * Auric cooling cell around the column, Lv 5 Kimat's Bite: a dark column with a blazing crown.
 */
export function makeTesla(level) {
  const u = makeThing();
  const { M } = u;
  const kimat = level >= 4;
  const bolt = kimat ? 0xe1f5fe : 0x80d8ff;
  const copper = M(0xb87333);
  const dark = M(0x263238);
  const spark = glowThing(u, bolt);
  // Plinth and column
  part(u.body, boxGeo(3.6, 0.6, 3.6), M(0x78909c), 0, 0.3, 0);
  part(u.body, boxGeo(2.6, 0.5, 2.6), M(0x546e7a), 0, 0.85, 0);
  const tall = level >= 2 ? 6.6 : 6;
  part(u.body, boxGeo(1.1, tall, 1.1), kimat ? dark : M(0x37474f), 0, 1.1 + tall / 2, 0);
  // Copper windings up the column
  const rings = level >= 2 ? 8 : 6;
  for (let i = 0; i < rings; i++) part(u.body, boxGeo(1.35, 0.18, 1.35), copper, 0, 1.6 + (i * (tall - 1.2)) / (rings - 1), 0);
  // Crown: a flat ring of boxes (the toroid) with a glowing core
  const top = 1.1 + tall + 0.35;
  const ringR = kimat ? 1.6 : 1.3;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const seg = part(u.body, boxGeo(1.0, 0.55, 0.6), kimat ? M(0x37474f) : M(0xb0bec5), Math.cos(a) * ringR, top, Math.sin(a) * ringR);
    seg.rotation.y = -a + Math.PI / 2;
  }
  part(u.body, boxGeo(0.9, 0.9, 0.9), spark, 0, top + 0.2, 0);
  if (kimat) for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    part(u.body, boxGeo(0.25, 1.1, 0.25), spark, Math.cos(a) * ringR, top + 0.8, Math.sin(a) * ringR); // prongs
  }
  gunMuzzle(u, u.body, 0, top + 0.6, 0);
  if (level >= 1) {
    // Kite in the Wind: a kite on a copper wire, tied to the crown
    const kite = part(u.body, boxGeo(1.4, 1.4, 0.1), M(0xe53935), -2.6, top + 3.2, -1.2);
    kite.rotation.set(0.3, 0.4, Math.PI / 4);
    const wire = part(u.body, boxGeo(0.06, 0.06, 4.3), copper, -1.3, top + 1.6, -0.6);
    wire.lookAt(-2.6, top + 3.2, -1.2);
    part(u.body, boxGeo(0.2, 0.2, 0.2), spark, -2.6, top + 2.3, -1.2);
  }
  if (level >= 2) {
    // Self-Sustaining Battery: battery packs on each side of the plinth
    for (const [x, z] of [[1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]]) {
      part(u.body, boxGeo(0.8, 1.2, 0.8), M(0x455a64), x, 1.2, z);
      part(u.body, boxGeo(0.5, 0.2, 0.5), level >= 3 ? glowThing(u, 0xffd740) : spark, x, 1.9, z);
    }
  }
  if (level >= 3) {
    // Auric Quantum Cooling Cell: gold fins around the middle of the column
    const gold = glowThing(u, 0xffc400);
    gold.emissiveIntensity = 0.35;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const fin = part(u.body, boxGeo(0.25, 2.2, 1.2), gold, Math.cos(a) * 0.85, 1.1 + tall * 0.55, Math.sin(a) * 0.85);
      fin.rotation.y = -a;
    }
  }
  u.tracer = bolt;
  u.static = true;
  return u;
}

/**
 * Saboteur (alternate Toxicnator): a hooded black-market operative with a sawn-off poison
 * shotgun. Lv 2 a respirator, Lv 3 a toxic drum magazine and tanks on the back, Lv 4 grenades
 * on a bandolier, Lv 5 the Neural-Runner's glowing visor and wider gun. A purple shard emblem.
 */
export function makeSaboteur(level) {
  const shirt = level >= 4 ? 0x1b1f2a : 0x2e3b2a;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: 0x1c1f24, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(0x111316);
  const tox = glow(h, level >= 4 ? 0xe040fb : 0x76ff03);
  // Hood
  part(h.head, boxGeo(1.4, 1.35, 1.35), M(level >= 4 ? 0x14161c : 0x253022), 0, 0.68, -0.08);
  part(h.torso, boxGeo(0.4, 0.4, 0.06), glow(h, 0xb388ff), 0.6, 0.6, 0.55); // Dimension Shard emblem
  if (level >= 1) {
    part(h.head, boxGeo(0.7, 0.4, 0.3), dark, 0, 0.25, 0.72); // respirator
    for (const x of [-0.35, 0.35]) part(h.head, boxGeo(0.25, 0.25, 0.25), M(0x455a64), x, 0.2, 0.75);
  }
  if (level >= 4) part(h.head, boxGeo(1.15, 0.25, 0.08), tox, 0, 0.8, 0.7); // Neural-Runner visor
  if (level >= 2) {
    for (const x of [-0.4, 0.4]) {
      part(h.torso, boxGeo(0.5, 1.5, 0.5), M(0x33691e), x, 0.1, -0.85);
      part(h.torso, boxGeo(0.3, 1.0, 0.06), tox, x, 0.1, -1.12);
    }
  }
  if (level >= 3) {
    const strap = part(h.torso, boxGeo(0.3, 2.5, 1.12), M(0x4e342e), 0, 0, 0);
    strap.rotation.z = -0.7;
    for (const t of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.32, 0.32, 0.32), M(level >= 4 ? 0x8e24aa : 0x9ccc3c), t * -0.75, t * -0.8, 0.65);
  }
  // Sawn-off shotgun with a poison canister under the barrel
  const len = level >= 4 ? 1.9 : 1.6;
  const gun = holdLongGun(h, len, M(0x3e2723));
  part(gun, boxGeo(level >= 4 ? 0.6 : 0.42, 0.9, 0.42), dark, 0, -len + 0.45, 0); // barrels
  part(gun, boxGeo(0.35, 0.6, 0.35), tox, 0, -0.9, 0.3);
  if (level >= 2) part(gun, boxGeo(0.7, 0.5, 0.7), M(0x546e7a), 0, -0.4, 0.15); // drum
  h.tracer = level >= 4 ? 0xea80fc : 0x9ccc3c;
  return h;
}

/** Paintballer: a paintball player with a hopper-fed marker. Look changes per level (0-5). */
export function makePaintballer(level) {
  const pro = level >= 4;
  const shirt = pro ? 0xd81b60 : level >= 2 ? 0x3949ab : 0x43a047;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt, pants: pro ? 0x212121 : 0x5d4037, arms: shirt, face: 'soldier' });
  const { M } = h;
  const dark = M(0x212121);
  if (level >= 1) {
    // Paintball Gear: full mask with a tinted visor
    part(h.head, boxGeo(1.45, 0.6, 0.25), M(pro ? 0x111111 : 0x37474f), 0, 0.2, 0.7);
    part(h.head, boxGeo(1.2, 0.35, 0.08), M(pro ? 0xffd600 : 0x4fc3f7), 0, 0.75, 0.78);
    part(h.head, boxGeo(1.5, 0.2, 1.5), M(0x37474f), 0, 0.75, 0); // strap
  } else {
    part(h.head, boxGeo(1.45, 0.4, 1.45), M(0xf57f17), 0, 1.25, 0); // cap
    part(h.head, boxGeo(1.2, 0.12, 0.6), M(0xf57f17), 0, 1.08, 0.85); // brim
  }
  if (level >= 2) {
    // Shoulder Pads
    for (const x of [-1.3, 1.3]) part(h.torso, boxGeo(0.9, 0.35, 1.2), dark, x, 1.0, 0);
    part(h.torso, boxGeo(2.15, 1.2, 1.15), M(0x263238), 0, 0.4, 0); // chest protector
  }
  if (pro) {
    // Competitive Gear: a harness of paint pods on the back
    const pod = M(level >= 5 ? 0xffd600 : 0xeeeeee);
    for (const x of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.35, 1.2, 0.35), pod, x, 0, -0.8);
  }
  if (level >= 5) {
    // Paintball Champion: a gold belt and a splash of paint on the chest
    part(h.torso, boxGeo(2.15, 0.35, 1.15), M(0xffc400), 0, -0.85, 0);
    part(h.torso, boxGeo(0.7, 0.3, 0.1), glow(h, 0xffea00), 0, -0.85, 0.6);
    part(h.torso, boxGeo(0.6, 0.6, 0.06), M(0x00e676), -0.4, 0.5, 0.6);
  }
  const len = pro ? 1.8 : 1.5;
  const gun = holdLongGun(h, len, M(level >= 5 ? 0xffc400 : 0x546e7a));
  // Hopper on top of the marker
  part(gun, boxGeo(0.6, 0.6, 0.6), M(pro ? 0x212121 : 0xb0bec5), 0, -0.5, 0.5);
  part(gun, boxGeo(0.45, 0.25, 0.45), M(0xff1744), 0, -0.5, 0.85);
  part(gun, boxGeo(0.3, 0.8, 0.35), dark, 0, -0.35, -0.4); // air tank
  if (level >= 3) {
    // Double Barrel Gun: a second barrel beside the first
    part(gun, boxGeo(0.28, len, 0.3), M(0x546e7a), 0.32, -len / 2, 0);
    const m2 = new THREE.Object3D();
    m2.position.set(0.32, -len, 0);
    gun.add(m2);
    h.muzzles.push(m2);
  }
  h.projectile = { color: [0xff1744, 0x2979ff, 0xffea00, 0x00e676, 0xd500f9][level % 5], size: 0.35, arc: 0.6 };
  return h;
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

/**
 * Elf (event): green tunic, pointy ears and a striped hat, throwing presents. Lv 2 a sack of
 * presents, Lv 3 a headset, Lv 4 a bigger glowing present, Lv 5 a firework launcher on its back.
 */
export function makeElf(level) {
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: 0x2e7d32, pants: 0xc62828, arms: 0x2e7d32 });
  const { M } = h;
  const red = M(0xc62828);
  const white = M(0xfafafa);
  part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.6, 0); // belt
  part(h.torso, boxGeo(0.4, 0.35, 0.1), M(0xffd54f), 0, -0.6, 0.56); // buckle
  for (const x of [-0.7, 0.7]) part(h.head, boxGeo(0.15, 0.5, 0.25), M(0xf1c27d), x, 0.7, 0).rotation.z = x > 0 ? -0.5 : 0.5; // pointy ears
  // Striped hat with a bobble
  part(h.head, boxGeo(1.35, 0.3, 1.35), white, 0, 1.25, 0);
  for (let i = 0; i < 4; i++) part(h.head, boxGeo(1.0 - i * 0.22, 0.4, 1.0 - i * 0.22), i % 2 ? white : M(0x2e7d32), 0, 1.6 + i * 0.4, -0.1 - i * 0.12);
  part(h.head, boxGeo(0.35, 0.35, 0.35), white, 0, 3.2, -0.6);
  if (level >= 1) {
    // Rapid Reload: a sack of presents on its back
    part(h.torso, boxGeo(1.6, 1.8, 1.0), M(0x8d6e63), 0, 0.1, -1.0);
    present(h, h.torso, 0x1e88e5, 0xffeb3b, 0.55).position.set(-0.35, 1.2, -1.0);
    present(h, h.torso, 0xc62828, 0xfafafa, 0.5).position.set(0.4, 1.15, -0.9);
  }
  if (level >= 2) {
    // Elf Tech: headset with a mic
    part(h.head, boxGeo(1.4, 0.15, 0.2), M(0x212121), 0, 1.15, 0);
    for (const x of [-0.68, 0.68]) part(h.head, boxGeo(0.2, 0.5, 0.5), M(0x212121), x, 0.65, 0);
    part(h.head, boxGeo(0.1, 0.1, 0.6), M(0x212121), -0.6, 0.4, 0.4);
    part(h.head, boxGeo(0.18, 0.18, 0.18), glow(h, 0x76ff03), -0.6, 0.4, 0.72);
  }
  if (level >= 4) {
    // Fireworks: a rack of rockets on its back
    for (const [x, c] of [[-0.6, 0xff1744], [0, 0xffea00], [0.6, 0x2979ff]]) {
      part(h.torso, boxGeo(0.3, 1.6, 0.3), M(c), x, 1.6, -1.6);
      part(h.torso, boxGeo(0.2, 0.4, 0.2), white, x, 2.6, -1.6);
    }
  }
  // The present in the raised right hand.
  const hand = new THREE.Group();
  hand.position.set(0, -2.2, 0);
  h.rightArm.add(hand);
  const boom = level >= 3;
  const p = boom ? present(h, hand, 0xffd54f, 0xc62828, 0.8) : present(h, hand, 0xc62828, 0x43a047, 0.65);
  if (level >= 4) part(p, boxGeo(0.08, 0.5, 0.08), glow(h, 0xffeb3b), 0, 0.7, 0); // lit fuse
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-0.6, 0, -0.3);
  h.pose = { right: -2.8, left: -0.6, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = level >= 4 ? { color: 0xff1744, size: 0.6, arc: 5, glowing: true } : { color: boom ? 0xffd54f : 0xc62828, size: 0.55, arc: 4.5 };
  return h;
}

/** A jack-o'-lantern (box with a glowing face) in `parent`. */
export function pumpkin(h, parent, size, glowColor = 0xffab00) {
  const g = new THREE.Group();
  parent.add(g);
  part(g, boxGeo(size, size * 0.85, size), h.M(0xef6c00));
  part(g, boxGeo(size * 0.15, size * 0.3, size * 0.15), h.M(0x33691e), 0, size * 0.55, 0); // stem
  const lit = glow(h, glowColor);
  for (const x of [-0.22, 0.22]) part(g, boxGeo(size * 0.18, size * 0.15, 0.05), lit, x * size, size * 0.12, size / 2 + 0.01);
  part(g, boxGeo(size * 0.55, size * 0.1, 0.05), lit, 0, -size * 0.18, size / 2 + 0.01);
  return g;
}

/**
 * Hallowboomer (event): a pumpkin-headed scarecrow throwing flaming pumpkins. Lv 2 glasses,
 * Lv 3 a rake and a pile of leaves, Lv 4 a jug of glowing pumpkin juice, Lv 5 a purple cape,
 * green flames and a crown of pumpkins.
 */
export function makeHallowboomer(level) {
  const spooky = level >= 4;
  const h = makeHumanoid({ skin: 0xef6c00, shirt: 0x6d4c41, pants: 0x37474f, arms: 0x6d4c41 });
  const { M } = h;
  // Hide the normal head behind a big pumpkin head.
  pumpkin(h, h.head, 1.6, spooky ? 0x76ff03 : 0xffab00).position.y = 0.7;
  part(h.torso, boxGeo(2.1, 0.25, 1.1), M(0x8d6e63), 0, -0.7, 0); // rope belt
  for (const x of [-0.6, 0.6]) part(h.torso, boxGeo(0.2, 0.5, 0.15), M(0xfbc02d), x, -1.05, 0.5); // straw
  if (level >= 1) {
    // Specs: round glasses on the pumpkin
    const frame = M(0x212121);
    for (const x of [-0.38, 0.38]) part(h.head, boxGeo(0.5, 0.4, 0.06), frame, x, 0.85, 0.85);
    part(h.head, boxGeo(0.3, 0.08, 0.06), frame, 0, 0.9, 0.85);
  }
  if (level >= 2) {
    // Raking Season: a rake on its back and leaves at its feet
    part(h.torso, boxGeo(0.15, 3.6, 0.15), M(0x795548), 0.6, 0.6, -0.65).rotation.z = 0.3;
    part(h.torso, boxGeo(1.2, 0.15, 0.3), M(0x616161), 1.15, 2.3, -0.65).rotation.z = 0.3;
    for (const [x, z, c] of [[-1.5, 1.2, 0xd84315], [1.6, 0.8, 0xffa000], [-1.0, -1.4, 0xbf360c], [1.3, -1.2, 0xf9a825]]) part(h.root, boxGeo(0.8, 0.12, 0.6), M(c), x, 0.06, z).rotation.y = x;
  }
  if (level >= 3) {
    // Pumpkin Juice: a glowing jug on the belt
    part(h.torso, boxGeo(0.6, 0.7, 0.6), M(0xeeeeee), -1.1, -0.9, 0.3);
    part(h.torso, boxGeo(0.45, 0.4, 0.45), glow(h, spooky ? 0x76ff03 : 0xff6d00), -1.1, -0.95, 0.35);
  }
  if (spooky) {
    // Spooky Rampage: a purple cape and a ring of little pumpkins
    part(h.torso, boxGeo(2.2, 3.0, 0.15), M(0x4a148c), 0, -0.6, -0.6);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      pumpkin(h, h.root, 0.6, 0x76ff03).position.set(Math.cos(a) * 1.9, 0.3, Math.sin(a) * 1.9);
    }
  }
  const hand = new THREE.Group();
  hand.position.set(0, -2.3, 0);
  h.rightArm.add(hand);
  const held = pumpkin(h, hand, level >= 2 ? 0.8 : 0.65, spooky ? 0x76ff03 : 0xffab00);
  part(held, boxGeo(0.25, 0.35, 0.25), glow(h, spooky ? 0x76ff03 : 0xff3d00), 0, 0.6, 0); // flame on top
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-0.8, 0, -0.3);
  h.pose = { right: -2.8, left: -0.8, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = { color: spooky ? 0x76ff03 : 0xef6c00, size: level >= 2 ? 0.7 : 0.55, arc: 5, glowing: true };
  return h;
}

/**
 * Graveyard (event spawner): a fenced patch of graves. Lv 2 more gravestones, Lv 3 a giant
 * cracked tomb, Lv 4 a crypt with glowing windows, Lv 5 a dead tree and Jack's throne-tomb.
 */
export function makeGraveyard(level) {
  const u = makeThing();
  const { M } = u;
  const dirt = M(0x4e342e);
  const stone = M(level >= 4 ? 0x455a64 : 0x9e9e9e);
  const iron = M(0x212121);
  part(u.body, boxGeo(4.4, 0.3, 4.4), dirt, 0, 0.15, 0);
  // Iron fence posts around the edge, with a gap at the front
  for (let i = -2; i <= 2; i++) {
    for (const [x, z] of [[i, -2.1], [-2.1, i], [2.1, i]]) part(u.body, boxGeo(0.12, 1.2, 0.12), iron, x, 0.9, z);
    if (Math.abs(i) === 2) part(u.body, boxGeo(0.12, 1.2, 0.12), iron, i, 0.9, 2.1);
  }
  for (const [x, z, w, d] of [[0, -2.1, 4.2, 0.08], [-2.1, 0, 0.08, 4.2], [2.1, 0, 0.08, 4.2]]) part(u.body, boxGeo(w, 0.08, d), iron, x, 1.3, z);
  const stones = [[-1.0, 0.6], [1.0, 0.6]];
  if (level >= 1) stones.push([-1.0, -0.6], [1.0, -0.6]);
  for (const [x, z] of stones) {
    part(u.body, boxGeo(0.8, 1.1, 0.25), stone, x, 0.85, z);
    part(u.body, boxGeo(0.8, 0.1, 1.1), M(0x3e2723), x, 0.32, z + 0.6); // mound
  }
  if (level >= 2) {
    // Giant Skeleton: a big cracked tomb in the middle
    part(u.body, boxGeo(1.4, 0.8, 2.2), stone, 0, 0.7, 0.2);
    part(u.body, boxGeo(0.1, 0.82, 1.4), iron, 0.2, 0.71, 0.3).rotation.y = 0.4; // crack
    part(u.body, boxGeo(0.3, 1.3, 0.3), M(0xe8e4d0), -0.3, 1.2, 1.0).rotation.z = 0.5; // bony hand
  }
  if (level >= 3) {
    // Fallen Warriors: a small crypt at the back with glowing windows and a sword in the ground
    part(u.body, boxGeo(2.4, 2.0, 1.2), stone, 0, 1.3, -1.4);
    part(u.body, boxGeo(2.7, 0.4, 1.5), M(0x37474f), 0, 2.5, -1.4);
    for (const x of [-0.6, 0.6]) part(u.body, boxGeo(0.35, 0.6, 0.05), glow(u, 0x76ff03), x, 1.5, -0.78);
    part(u.body, boxGeo(0.15, 1.6, 0.08), M(0xb0bec5), 1.6, 1.0, 1.6);
    part(u.body, boxGeo(0.6, 0.12, 0.1), M(0x5d4037), 1.6, 1.4, 1.6);
  }
  if (level >= 4) {
    // Return of the King: a dead tree and a crowned skull above the crypt
    const bark = M(0x3e2723);
    part(u.body, boxGeo(0.4, 3.8, 0.4), bark, -1.6, 2.2, 1.4);
    part(u.body, boxGeo(1.4, 0.25, 0.25), bark, -1.1, 3.5, 1.4).rotation.z = 0.5;
    part(u.body, boxGeo(0.25, 1.2, 0.25), bark, -2.0, 3.6, 1.4).rotation.z = 0.6;
    part(u.body, boxGeo(0.9, 0.9, 0.9), M(0xe8e4d0), 0, 3.2, -1.4);
    for (const x of [-0.2, 0.2]) part(u.body, boxGeo(0.2, 0.2, 0.05), glow(u, 0x76ff03), x, 3.25, -0.94);
    const gold = M(0xffc107);
    part(u.body, boxGeo(1.0, 0.25, 1.0), gold, 0, 3.75, -1.4);
    for (const x of [-0.35, 0, 0.35]) part(u.body, boxGeo(0.18, 0.35, 0.18), gold, x, 4.0, -1.0);
  }
  return u;
}

/** A glowing ice gun for the Sleeter (len long). */
export function iceGun(h, len, color) {
  const gun = holdLongGun(h, len, h.M(0xeceff1));
  part(gun, boxGeo(0.5, 0.7, 0.6), h.M(0x546e7a), 0, -0.4, 0);
  part(gun, boxGeo(0.45, 0.3, 0.55), glow(h, color), 0, -len, 0);
  h.muzzles[0].position.y = -len - 0.2;
  return gun;
}

/**
 * Sleeter (event): a winter hero in a parka with an ice blaster. Lv 2 an ice crystal pack,
 * Lv 3 a radio, Lv 4 a big white gorilla-fur coat and bigger gun, Lv 5 a glowing hero cape and visor.
 */
export function makeSleeter(level) {
  const ice = 0x40c4ff;
  const gorilla = level >= 3;
  const coat = gorilla ? 0xeceff1 : 0x1565c0;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: coat, pants: 0x263238, arms: coat, face: 'soldier' });
  const { M } = h;
  part(h.head, boxGeo(1.45, 1.4, 1.45), M(gorilla ? 0xcfd8dc : 0x0d47a1), 0, 0.65, -0.05); // hood
  part(h.head, boxGeo(1.5, 0.3, 0.3), M(0xfafafa), 0, 1.2, 0.6); // fur trim
  if (level >= 1) {
    // Permafrost: a pack of ice crystals
    part(h.torso, boxGeo(1.3, 1.6, 0.7), M(0x90a4ae), 0, 0, -0.85);
    for (const x of [-0.35, 0.35]) part(h.torso, boxGeo(0.3, 0.9, 0.3), glow(h, ice), x, 1.1, -0.85);
  }
  if (level >= 2) {
    // Radio: antenna on the pack
    part(h.torso, boxGeo(0.08, 2.0, 0.08), M(0x212121), 0.55, 1.6, -0.9);
    part(h.torso, boxGeo(0.15, 0.15, 0.15), glow(h, 0xff1744), 0.55, 2.6, -0.9);
  }
  if (gorilla) {
    // Arctic Gorilla: bulky fur shoulders
    for (const side of [-1, 1]) part(h.torso, boxGeo(1.0, 0.8, 1.4), M(0xfafafa), side * 1.4, 0.9, 0);
    h.size = 1.1;
  }
  if (level >= 4) {
    // Subzero Hero: a glowing visor and an icy cape
    part(h.head, boxGeo(1.25, 0.35, 0.08), glow(h, ice), 0, 0.72, 0.72);
    part(h.torso, boxGeo(2.2, 3.0, 0.12), M(0x4fc3f7), 0, -0.6, -1.3);
  }
  iceGun(h, gorilla ? 2.3 : 1.8, ice);
  h.tracer = ice;
  h.tracerWidth = level >= 3 ? 0.35 : 0.25;
  return h;
}

/**
 * Snowballer (event): a kid in a beanie and scarf with a snowball. Lv 2 warm gloves, Lv 3 a
 * pile of snowballs, Lv 4 icy blue snowballs, Lv 5 a giant glowing Death Ball.
 */
export function makeSnowballer(level) {
  const h = makeHumanoid({ skin: 0xffcc80, shirt: 0xd32f2f, pants: 0x1a237e, arms: 0xd32f2f });
  const { M } = h;
  const icy = level >= 3;
  const ballColor = level >= 4 ? 0x7c4dff : icy ? 0x81d4fa : 0xfafafa;
  part(h.head, boxGeo(1.35, 0.55, 1.35), M(0x1e88e5), 0, 1.25, 0); // beanie
  part(h.head, boxGeo(0.4, 0.4, 0.4), M(0xfafafa), 0, 1.7, 0);
  part(h.torso, boxGeo(2.1, 0.4, 1.1), M(0xfbc02d), 0, 0.85, 0); // scarf
  part(h.torso, boxGeo(0.5, 1.2, 0.15), M(0xfbc02d), 0.5, 0.2, 0.6);
  if (level >= 1) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.1, 0.6, 1.1), M(0x43a047), 0, -1.75, 0); // warm gloves
  if (level >= 2) {
    // Thick Snow: a pile of snowballs at its feet
    const snow = M(ballColor);
    for (const [x, y, z] of [[1.5, 0.3, 0.8], [2.0, 0.3, 0.8], [1.75, 0.3, 1.3], [1.75, 0.75, 0.95]]) part(h.root, boxGeo(0.5, 0.5, 0.5), snow, x, y, z);
  }
  const hand = new THREE.Group();
  hand.position.set(0, -2.2, 0);
  h.rightArm.add(hand);
  const big = level >= 4;
  part(hand, boxGeo(big ? 0.9 : 0.6, big ? 0.9 : 0.6, big ? 0.9 : 0.6), big ? glow(h, ballColor) : M(ballColor), 0, -0.2, 0);
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-0.6, 0, -0.3);
  h.pose = { right: -2.8, left: -0.6, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = { color: ballColor, size: big ? 0.7 : 0.45, arc: 3, ...(big ? { glowing: true } : {}) };
  return h;
}

/**
 * Huntsman (event): a hunter in a brown coat and wide hat with a rifle. Lv 2 a laser sight,
 * Lv 3 a bounty-poster satchel, Lv 4 a second gun, Lv 5 a dark harvester coat with glowing trim.
 */
export function makeHuntsman(level) {
  const harvester = level >= 4;
  const coat = harvester ? 0x263238 : 0x6d4c41;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: coat, pants: 0x3e2723, arms: coat, face: 'agent' });
  const { M } = h;
  const hat = M(harvester ? 0x111111 : 0x4e342e);
  part(h.head, boxGeo(2.0, 0.12, 2.0), hat, 0, 1.25, 0); // wide brim
  part(h.head, boxGeo(1.3, 0.6, 1.3), hat, 0, 1.6, 0);
  part(h.head, boxGeo(1.32, 0.15, 1.32), M(harvester ? 0xd50000 : 0xbf8040), 0, 1.4, 0); // hat band
  part(h.torso, boxGeo(0.3, 2.3, 1.12), M(0x3e2723), 0, 0.1, 0).rotation.z = 0.6; // bandolier
  if (level >= 2) {
    // Payday: a satchel stuffed with cash
    part(h.torso, boxGeo(0.8, 0.8, 0.6), M(0x8d6e63), -1.2, -0.8, 0.2);
    part(h.torso, boxGeo(0.5, 0.3, 0.1), M(0x66bb6a), -1.2, -0.4, 0.5);
  }
  if (harvester) {
    // Harvester: a long coat and glowing red trim
    part(h.torso, boxGeo(2.15, 2.4, 1.15), M(0x1c2529), 0, -0.9, 0);
    part(h.torso, boxGeo(0.2, 2.4, 0.05), glow(h, 0xff1744), 0, -0.6, 0.6);
  }
  const len = level >= 1 ? 2.6 : 2.2;
  const gun = holdLongGun(h, len, M(0x3e2723));
  part(gun, boxGeo(0.36, 0.9, 0.5), M(0x5d4037), 0, 0.2, 0); // stock
  part(gun, boxGeo(0.2, len * 0.6, 0.2), M(0x424242), 0, -len * 0.7, 0.05); // barrel
  if (level >= 1) {
    // Longshot: a laser sight
    part(gun, boxGeo(0.2, 0.8, 0.2), M(0x212121), 0, -0.9, 0.3);
    part(gun, boxGeo(0.1, 0.1, 0.1), glow(h, 0xff1744), 0, -1.3, 0.3);
  }
  if (level >= 3) {
    // Double Tap: a second gun in the left hand
    const g2 = new THREE.Group();
    g2.position.set(0, -1.9, 0);
    h.leftArm.add(g2);
    part(g2, boxGeo(0.3, 1.8, 0.4), M(0x3e2723), 0, -0.9, 0);
    part(g2, boxGeo(0.18, 0.8, 0.18), M(0x424242), 0, -1.9, 0);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.1);
    h.pose.left = -Math.PI / 2;
  }
  h.tracer = harvester ? 0xff5252 : 0xffc107;
  return h;
}

/**
 * Archer (event): a hooded archer with a longbow and a quiver. Lv 3 heat-vision goggles, Lv 4
 * flaming arrows in the quiver, Lv 5 a dark leather coat and a crossbow.
 */
export function makeArcher(level) {
  const xbow = level >= 4;
  const coat = xbow ? 0x3e2723 : 0x2e7d32;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: coat, pants: 0x4e342e, arms: coat });
  const { M } = h;
  part(h.head, boxGeo(1.45, 1.4, 1.4), M(xbow ? 0x271a16 : 0x1b5e20), 0, 0.7, -0.08); // hood
  part(h.torso, boxGeo(0.25, 2.3, 1.12), M(0x5d4037), 0, 0.1, 0).rotation.z = -0.6; // quiver strap
  const flame = level >= 3;
  const quiver = part(h.torso, boxGeo(0.6, 1.6, 0.6), M(0x6d4c41), 0.5, 0.3, -0.85);
  quiver.rotation.z = 0.3;
  for (const x of [-0.12, 0.12]) part(quiver, boxGeo(0.1, 0.5, 0.1), flame ? glow(h, 0xff7043) : M(0xeeeeee), x, 1.0, 0); // fletching / burning tips
  if (level >= 2) {
    // Extra Sight: heat-vision goggles
    part(h.head, boxGeo(1.3, 0.3, 0.12), M(0x212121), 0, 0.75, 0.66);
    for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.3, 0.22, 0.06), glow(h, 0xff5252), x, 0.75, 0.73);
  }
  const wood = M(0x795548);
  if (xbow) {
    // Taste for Blood: a heavy crossbow held like a rifle
    const gun = holdLongGun(h, 2.2, wood);
    const arms = part(gun, boxGeo(2.4, 0.15, 0.2), M(0x424242), 0, -1.9, 0); // limbs
    arms.rotation.y = 0;
    part(gun, boxGeo(0.12, 1.4, 0.12), glow(h, 0xff7043), 0, -1.6, 0.2); // flaming bolt
  } else {
    // Longbow in the left hand, drawn with the right
    const bow = new THREE.Group();
    bow.position.set(0, -2.1, 0);
    h.leftArm.add(bow);
    part(bow, boxGeo(0.15, 0.15, 3.6), wood, 0, -0.2, 0);
    for (const z of [-1.7, 1.7]) part(bow, boxGeo(0.15, 0.5, 0.15), wood, 0, 0.0, z);
    setMuzzle(h, bow, 0, -0.3, 0);
    h.leftArm.rotation.set(-Math.PI / 2, 0, 0.3);
    h.rightArm.rotation.set(-Math.PI / 2, 0, -0.4);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0 };
  }
  h.blade = flame ? { color: 0xff7043, size: xbow ? 1.5 : 1.2 } : { color: 0x8d6e63, size: 1.2 };
  h.tracer = flame ? 0xff7043 : 0xd7ccc8;
  return h;
}

/**
 * Knifer (event): a masked knife fighter. Lv 3 a dark assassin outfit, Lv 4 a second knife and
 * a belt of throwing knives, Lv 5 the Flayer: blood-red trim and glowing red blades.
 */
export function makeKnifer(level) {
  const dark = level >= 2;
  const flayer = level >= 4;
  const shirt = flayer ? 0x1a0d0d : dark ? 0x212121 : 0x546e7a;
  const h = makeHumanoid({ skin: 0xd9a066, shirt, pants: dark ? 0x151515 : 0x37474f, arms: shirt, face: 'agent' });
  const { M } = h;
  part(h.head, boxGeo(1.32, 0.35, 1.32), M(flayer ? 0x8b0000 : dark ? 0x111111 : 0x37474f), 0, 1.15, 0); // bandana
  if (dark) part(h.head, boxGeo(1.25, 0.35, 0.1), M(0x111111), 0, 0.3, 0.62); // face mask
  if (flayer) part(h.torso, boxGeo(2.1, 0.3, 1.1), glow(h, 0xd50000), 0, -0.6, 0); // red sash
  if (level >= 3) for (const x of [-0.7, -0.35, 0, 0.35, 0.7]) part(h.torso, boxGeo(0.12, 0.5, 0.12), M(0xcfd8dc), x, -0.9, 0.6); // throwing knives
  const blade = flayer ? glow(h, 0xff1744) : M(0xcfd8dc);
  const len = flayer ? 1.8 : level >= 2 ? 1.5 : 1.3;
  const knife = (arm) => {
    const g = new THREE.Group();
    g.position.set(0, -1.9, 0);
    arm.add(g);
    part(g, boxGeo(0.25, 0.5, 0.25), M(0x3e2723), 0, -0.15, 0);
    part(g, boxGeo(0.1, len, 0.4), blade, 0, -0.4 - len / 2, 0);
    return g;
  };
  const right = knife(h.rightArm);
  setMuzzle(h, right, 0, -0.4 - len, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  if (level >= 3) {
    knife(h.leftArm); // Dual Wield
    h.leftArm.rotation.set(-2.0, 0, -0.2);
    h.pose = { right: -2.4, left: -2.0, leftRecoil: 0 };
  } else {
    h.leftArm.rotation.set(-0.6, 0, -0.3);
    h.pose = { right: -2.4, left: -0.6, leftRecoil: 0 };
  }
  h.swing = 1.7;
  h.melee = true;
  h.blade = { color: flayer ? 0xff1744 : 0xcfd8dc, size: 1 };
  h.tracer = flayer ? 0xff1744 : 0xffffff;
  return h;
}

/**
 * Stunner (event): a security guard with a taser. Lv 3 a heavy-duty battery pack, Lv 4 a riot
 * helmet, Lv 5 the Thunder God: a glowing storm-blue suit and a crackling staff.
 */
export function makeStunner(level) {
  const god = level >= 4;
  const shirt = god ? 0x1a237e : 0x37474f;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: god ? 0x0d1440 : 0x263238, arms: shirt, face: 'soldier' });
  const { M } = h;
  const zap = glow(h, god ? 0x82b1ff : 0xfff176);
  part(h.torso, boxGeo(2.35, 0.3, 1.25), M(0x212121), 0, -0.85, 0); // belt
  part(h.torso, boxGeo(1.0, 0.25, 0.06), M(0xfdd835), 0, 0.5, 0.62); // SECURITY stripe
  if (level >= 2) {
    // Heavy Duty: a battery pack with a cable
    part(h.torso, boxGeo(1.2, 1.4, 0.6), M(0x424242), 0, 0.1, -0.85);
    part(h.torso, boxGeo(0.5, 0.2, 0.08), zap, 0, 0.5, -1.18);
  }
  if (level >= 3) {
    part(h.head, boxGeo(1.5, 1.4, 1.5), M(god ? 0x283593 : 0x263238), 0, 0.7, -0.03); // helmet
    part(h.head, boxGeo(1.3, 0.35, 0.08), god ? zap : M(0x90caf9), 0, 0.6, 0.78); // visor
  } else part(h.head, boxGeo(1.4, 0.45, 1.4), M(0x263238), 0, 1.4, 0); // cap
  const hand = new THREE.Group();
  hand.position.set(0, -1.9, 0);
  h.rightArm.add(hand);
  if (god) {
    // Thunder God: a long staff with a glowing head
    part(hand, boxGeo(0.25, 3.2, 0.25), M(0x455a64), 0, -1.0, 0);
    part(hand, boxGeo(0.6, 0.6, 0.6), zap, 0, -2.7, 0);
    setMuzzle(h, hand, 0, -2.7, 0);
  } else {
    part(hand, boxGeo(0.35, 0.9, 0.5), M(0xfdd835), 0, -0.4, 0); // taser
    part(hand, boxGeo(0.2, 0.2, 0.2), zap, 0, -0.95, 0);
    setMuzzle(h, hand, 0, -1.0, 0);
  }
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-0.4, 0, -0.3);
  h.pose = { right: -Math.PI / 2, left: -0.4, leftRecoil: 0 };
  h.tracer = god ? 0x82b1ff : 0xfff176;
  h.tracerWidth = 0.15;
  return h;
}

/**
 * Harpoon Hunter (event): a whaler in a yellow raincoat with a harpoon gun. Lv 2 a pressure
 * gauge, Lv 4 a titanium-plated gun, Lv 5 the Apex Predator: a dark coat and a huge launcher.
 */
export function makeHarpoonHunter(level) {
  const apex = level >= 4;
  const coat = apex ? 0x263238 : 0xfbc02d;
  const h = makeHumanoid({ skin: 0xffcc80, shirt: coat, pants: apex ? 0x1c2529 : 0x37474f, arms: coat });
  const { M } = h;
  const hat = M(apex ? 0x111111 : 0xf9a825);
  part(h.head, boxGeo(1.6, 0.12, 1.9), hat, 0, 1.25, -0.15); // sou'wester brim
  part(h.head, boxGeo(1.35, 0.5, 1.35), hat, 0, 1.5, 0);
  part(h.head, boxGeo(1.4, 0.35, 0.1), M(0x8d6e63), 0, 0.2, 0.62); // beard
  if (level >= 3) part(h.torso, boxGeo(2.15, 1.2, 1.2), M(0x78909c), 0, 0.3, 0); // titanium chest plate
  const metal = M(level >= 3 ? 0xb0bec5 : 0x5d4037);
  const len = apex ? 3.0 : 2.4;
  const gun = holdLongGun(h, len, metal);
  part(gun, boxGeo(0.5, 0.9, 0.6), M(0x424242), 0, -0.5, 0); // tank
  if (level >= 1) {
    // Pressure Gauge
    part(gun, boxGeo(0.4, 0.4, 0.15), M(0xfafafa), 0, -0.5, 0.38);
    part(gun, boxGeo(0.06, 0.25, 0.04), M(0xd32f2f), 0, -0.5, 0.47);
  }
  // The harpoon sticking out of the barrel
  part(gun, boxGeo(0.12, 1.0, 0.12), M(0x9e9e9e), 0, -len - 0.4, 0);
  part(gun, boxGeo(0.35, 0.35, 0.12), apex ? glow(h, 0xff1744) : M(0xbdbdbd), 0, -len - 0.95, 0);
  h.tracer = 0x9e9e9e;
  h.tracerWidth = apex ? 0.3 : 0.2;
  h.flight = { color: apex ? 0xff1744 : 0xbdbdbd, size: 1, arc: 0.8, long: true }; // the harpoon itself
  return h;
}

// ---------------------------------------------------------------- evolved towers
// Each evolved tower wears the look of the tower it evolved from, restyled, plus a glowing cyan
// "evolved" chest emblem so it is easy to tell apart.
const EVO_GLOW = 0x18ffff;

/** Recolours a humanoid's shirt, pants and arms (the first materials makeHumanoid makes). */
export function recolor(h, shirt, pants, arms = shirt) {
  h.mats[1].color.setHex(shirt);
  h.mats[2].color.setHex(pants);
  if (h.mats[3] !== h.mats[0]) h.mats[3].color.setHex(arms);
}

export function evoEmblem(h, color = EVO_GLOW, y = 0.45) {
  part(h.torso, boxGeo(0.4, 0.4, 0.06), glow(h, color), 0.55, y, 0.62);
}

/** Operator (evolved Scout): a black-ops soldier with night-vision goggles; a glowing visor from Lv 5. */
export function makeOperator(level) {
  const h = makeScout(Math.min(level, 3));
  const { M } = h;
  recolor(h, 0x1f2328, 0x15181c);
  evoEmblem(h);
  // Night-vision goggles flipped down over the helmet
  part(h.head, boxGeo(0.9, 0.3, 0.3), M(0x111111), 0, 0.95, 0.75);
  for (const x of [-0.22, 0.22]) part(h.head, boxGeo(0.22, 0.22, 0.25), glow(h, level >= 4 ? EVO_GLOW : 0x76ff03), x, 0.95, 0.95);
  if (level >= 1) part(h.torso, boxGeo(2.2, 1.6, 1.2), M(0x2e3440), 0, 0.05, 0); // Tactical Gear: plate carrier
  if (level >= 2) part(h.head, boxGeo(0.08, 1.2, 0.08), M(0x212121), -0.55, 1.6, -0.4); // radio antenna
  if (level >= 4) part(h.torso, boxGeo(2.25, 0.12, 1.25), glow(h, EVO_GLOW), 0, 0.6, 0); // sentinel light strip
  if (level >= 6) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.15, 0.12, 1.15), glow(h, EVO_GLOW), 0, -0.5, 0);
  h.tracer = level >= 4 ? EVO_GLOW : 0xffe066;
  return h;
}

/** Breacher (evolved Shotgunner): a navy SWAT officer. Top path: a headset; Bottom path: heavy armor. */
export function makeBreacher(level, bottom = false) {
  const h = makeShotgunner(4);
  const { M } = h;
  recolor(h, 0x0d1b2a, 0x0b1520);
  evoEmblem(h, EVO_GLOW, -0.3);
  part(h.torso, boxGeo(2.2, 0.35, 1.2), M(0xfafafa), 0, 0.55, 0); // "SWAT" chest band
  if (level >= 2) for (const x of [-0.6, -0.3]) part(h.torso, boxGeo(0.25, 0.35, 0.25), M(0x9e9e9e), x, -0.35, 0.68); // flashbangs
  if (level >= 5 && !bottom) {
    part(h.head, boxGeo(0.12, 0.5, 0.5), M(0x212121), -0.75, 0.6, 0); // Good Coms headset
    part(h.head, boxGeo(0.5, 0.1, 0.1), M(0x212121), -0.55, 0.4, 0.5);
  }
  if (level >= 5 && bottom) {
    part(h.torso, boxGeo(2.4, 1.9, 1.35), M(0x1b263b), 0, 0, 0); // Full Suit armor
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.25, 0.8, 1.25), M(0x1b263b), 0, -0.25, 0);
  }
  if (level >= 7) part(h.torso, boxGeo(0.7, 0.7, 0.08), glow(h, bottom ? 0x40c4ff : 0xff5252), 0, 0.15, 0.72);
  return h;
}

/** Kingpin (evolved Crook Boss): a purple-suited boss in a gold-banded hat with a gold chain. */
export function makeKingpin(level, bottom = false) {
  const h = makeCrookBoss(Math.min(level, 4));
  const { M } = h;
  const gold = M(0xd4af37);
  recolor(h, 0x311b92, 0x1a1040);
  evoEmblem(h);
  part(h.head, boxGeo(1.6, 0.14, 1.6), M(0x1a1040), 0, 1.25, 0); // hat
  part(h.head, boxGeo(1.25, 0.5, 1.25), M(0x1a1040), 0, 1.5, 0);
  part(h.head, boxGeo(1.27, 0.14, 1.27), gold, 0, 1.33, 0);
  if (level >= 2) part(h.torso, boxGeo(1.4, 0.18, 1.15), gold, 0, 0.9, 0); // gold chain
  if (level >= 4 && !bottom) part(h.torso, boxGeo(0.5, 0.5, 0.08), gold, 0, 0.2, 0.62); // bounty badge
  if (level >= 4 && bottom) part(h.torso, boxGeo(2.15, 0.25, 1.1), gold, 0, -0.7, 0); // syndicate belt
  if (level >= 6) goldify(h);
  return h;
}

/** Titan (evolved Minigunner): the Juggernaut's armor in gunmetal; a glowing core on the top tiers. */
export function makeTitan(level, bottom = false) {
  const h = makeJuggernaut(Math.min(level, 5), bottom);
  const { M } = h;
  evoEmblem(h);
  h.body.scale.setScalar(1.3);
  part(h.head, boxGeo(1.55, 0.14, 1.55), glow(h, EVO_GLOW), 0, 1.0, -0.05); // visor band
  if (level >= 4 && !bottom) part(h.torso, boxGeo(2.6, 2.4, 0.15), M(0x546e7a), 0, 0, -1.55); // Fortifier: a shield plate on the back
  if (level >= 4 && bottom) part(h.torso, boxGeo(0.6, 0.6, 0.1), glow(h, 0xff1744), 0, -0.5, 0.65); // special rounds
  if (level >= 7) part(h.torso, boxGeo(2.3, 0.15, 1.3), glow(h, bottom ? 0xff1744 : EVO_GLOW), 0, 0.95, 0);
  return h;
}

// ---------------------------------------------------------------- event towers (wave 2)

/** A one-handed melee weapon on `arm`: a grip, then a blade `len` long (returns the group). */
export function bladeIn(h, arm, len, bladeMat, wide = 0.45) {
  const g = new THREE.Group();
  g.position.set(0, -1.9, 0);
  arm.add(g);
  part(g, boxGeo(0.25, 0.6, 0.25), h.M(0x3e2723), 0, -0.2, 0);
  part(g, boxGeo(0.7, 0.15, 0.3), h.M(0x8d6e63), 0, -0.5, 0); // crossguard
  part(g, boxGeo(0.12, len, wide), bladeMat, 0, -0.55 - len / 2, 0);
  return g;
}

/**
 * Gladiator (event): an arena fighter with a sword and round shield. Lv 3 a plumed helmet, Lv 4 a
 * flaming sword, Lv 5 a centurion's red cape, Lv 6 the golden King of the Arena.
 */
export function makeGladiator(level) {
  const king = level >= 5;
  const h = makeHumanoid({ skin: 0xd9a066, shirt: king ? 0xffb300 : 0x8d6e63, pants: 0x5d4037, arms: 0xd9a066 });
  const { M } = h;
  const metal = M(king ? 0xffd54f : 0x9e9e9e);
  part(h.torso, boxGeo(2.1, 0.35, 1.1), M(0x4e342e), 0, -0.85, 0); // belt
  part(h.torso, boxGeo(1.0, 1.2, 0.08), metal, -0.4, 0.4, 0.52); // chest plate
  if (level >= 2) {
    part(h.head, boxGeo(1.45, 0.9, 1.45), metal, 0, 0.95, 0); // helmet
    part(h.head, boxGeo(0.3, 0.8, 1.4), M(king ? 0xd50000 : 0xc62828), 0, 1.7, 0); // plume
  }
  if (level >= 4) part(h.torso, boxGeo(2.2, 3.2, 0.12), M(king ? 0x7b1fa2 : 0xb71c1c), 0, -0.6, -0.6); // cape
  const fire = level >= 3;
  const sword = bladeIn(h, h.rightArm, king ? 2.4 : 2.0, fire ? glow(h, 0xff6d00) : M(0xe0e0e0));
  setMuzzle(h, sword, 0, -2.4, 0);
  // Round shield on the left arm
  const shield = part(h.leftArm, boxGeo(0.3, 1.8, 1.8), M(king ? 0xffca28 : 0x6d4c41), 0.6, -1.3, 0);
  part(shield, boxGeo(0.1, 0.5, 0.5), metal, 0.2, 0, 0);
  h.rightArm.rotation.set(-2.5, 0, 0.2);
  h.leftArm.rotation.set(-0.8, 0, -0.2);
  h.pose = { right: -2.5, left: -0.8, leftRecoil: 0 };
  h.swing = 2.0;
  h.melee = true;
  h.tracer = fire ? 0xff6d00 : 0xffffff;
  return h;
}

/**
 * Commando (event): a sci-fi trooper with a laser rifle. Lv 3 a visor (hidden detection), Lv 4 a
 * missile pack, Lv 5 heavy black armor with red lights.
 */
export function makeEventCommando(level) {
  const heavy = level >= 4;
  const shirt = heavy ? 0x212121 : 0x33691e;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: heavy ? 0x111111 : 0x1b5e20, arms: shirt, face: 'soldier' });
  const { M } = h;
  const light = heavy ? 0xff1744 : 0x76ff03;
  part(h.head, boxGeo(1.45, 0.6, 1.45), M(heavy ? 0x111111 : 0x2e4a1e), 0, 1.25, 0); // helmet
  if (level >= 2) part(h.head, boxGeo(1.3, 0.35, 0.08), glow(h, light), 0, 0.7, 0.66); // visor
  part(h.torso, boxGeo(2.15, 1.4, 1.15), M(heavy ? 0x263238 : 0x4b5320), 0, 0.3, 0); // vest
  if (level >= 3) {
    // Jericho Missiles: a missile pack on its back
    part(h.torso, boxGeo(1.6, 1.6, 0.8), M(0x37474f), 0, 0.3, -0.9);
    for (const x of [-0.45, 0, 0.45]) part(h.torso, boxGeo(0.3, 0.3, 0.3), M(0xd32f2f), x, 1.2, -0.9);
  }
  const len = heavy ? 2.8 : 2.4;
  const gun = holdLongGun(h, len, M(0x263238));
  part(gun, boxGeo(0.45, 0.8, 0.6), M(0x37474f), 0, -0.6, 0);
  part(gun, boxGeo(0.2, 0.6, 0.2), glow(h, light), 0, -len + 0.3, 0.1);
  h.tracer = light;
  h.tracerWidth = 0.18;
  return h;
}

/**
 * Slasher (alternate Knifer form): a hooded killer with a big knife. Lv 3 a blood-red outfit,
 * Lv 4 a jagged cleaver, Lv 5 dripping red blades. A purple Dimension Shard marks the form.
 */
export function makeSlasher(level) {
  const blood = level >= 2;
  const shirt = blood ? 0x4a0000 : 0x37474f;
  const h = makeHumanoid({ skin: 0xd9a066, shirt, pants: 0x1a1a1a, arms: shirt, face: 'agent' });
  const { M } = h;
  part(h.head, boxGeo(1.45, 1.4, 1.45), M(blood ? 0x2b0000 : 0x263238), 0, 0.7, -0.08); // hood
  part(h.head, boxGeo(1.2, 0.5, 0.1), M(0xeeeeee), 0, 0.55, 0.65); // mask
  for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.2, 0.12, 0.05), M(0x111111), x, 0.65, 0.71);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.45, 0.52); // Dimension Shard
  if (level >= 1) part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x111111), 0, -0.85, 0); // belt
  const bladeMat = level >= 4 ? glow(h, 0xd50000) : M(0xcfd8dc);
  const knife = bladeIn(h, h.rightArm, level >= 3 ? 2.0 : 1.5, bladeMat, level >= 3 ? 0.7 : 0.45);
  setMuzzle(h, knife, 0, -2.0, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  h.leftArm.rotation.set(-0.6, 0, -0.3);
  h.pose = { right: -2.4, left: -0.6, leftRecoil: 0 };
  h.swing = 1.8;
  h.melee = true;
  h.tracer = blood ? 0xd50000 : 0xffffff;
  return h;
}

/**
 * Frost Blaster (alternate Sleeter form): a trooper in white snow gear with a long ice rifle.
 * Lv 2 goggles, Lv 4 a coolant tank, Lv 5 the Hyper Icer: icy armor and a huge cannon.
 */
export function makeFrostBlaster(level) {
  const ice = 0x80d8ff;
  const hyper = level >= 4;
  const coat = hyper ? 0x4fc3f7 : 0xeceff1;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: coat, pants: 0x90a4ae, arms: coat, face: 'soldier' });
  const { M } = h;
  part(h.head, boxGeo(1.45, 0.6, 1.45), M(hyper ? 0x0288d1 : 0xcfd8dc), 0, 1.25, 0); // helmet
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.45, 0.52); // Dimension Shard
  if (level >= 1) {
    part(h.head, boxGeo(1.3, 0.3, 0.12), M(0x263238), 0, 0.75, 0.66); // goggles
    for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.3, 0.22, 0.06), glow(h, ice), x, 0.75, 0.73);
  }
  if (level >= 3) {
    part(h.torso, boxGeo(1.0, 1.8, 0.8), M(0x90a4ae), 0, 0, -0.9); // coolant tank
    part(h.torso, boxGeo(0.4, 1.2, 0.1), glow(h, ice), 0, 0, -1.32);
  }
  if (hyper) for (const side of [-1, 1]) part(h.torso, boxGeo(0.9, 0.7, 1.3), glow(h, 0xb3e5fc), side * 1.4, 0.9, 0); // ice pauldrons
  iceGun(h, hyper ? 3.0 : 2.4, ice);
  h.tracer = ice;
  h.tracerWidth = hyper ? 0.35 : 0.2;
  return h;
}

/**
 * Flame Trooper (alternate Flamethrower form): a trooper in an orange fire suit with a long
 * flamethrower. Lv 2 a respirator, Lv 3 napalm tanks, Lv 4 an M3 flamethrower with armor plates,
 * Lv 5 the glowing black-and-orange Exo-Flame Suit.
 */
export function makeFlameTrooper(level) {
  const exo = level >= 5;
  const fire = 0xff6d00;
  const coat = exo ? 0x212121 : 0xe65100;
  const h = makeHumanoid({ skin: 0xd2a679, shirt: coat, pants: exo ? 0x1a1a1a : 0x4e342e, arms: coat, face: 'soldier' });
  const { M } = h;
  helmet(h, exo ? 0x37474f : 0x5d4037);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.45, 0.52); // Dimension Shard
  if (level >= 2) part(h.head, boxGeo(0.6, 0.55, 0.4), M(0x37474f), 0, 0.35, 0.75); // respirator
  part(h.head, boxGeo(1.2, 0.3, 0.08), exo ? glow(h, fire) : M(0xffa000), 0, 0.8, 0.66); // visor
  const tank = level >= 3 ? glow(h, fire) : M(0xbf360c);
  for (const x of level >= 3 ? [-0.45, 0.45] : [0]) part(h.torso, boxGeo(0.7, 2.0, 0.7), tank, x, 0.2, -0.85);
  if (level >= 4) for (const side of [-1, 1]) part(h.torso, boxGeo(0.8, 0.6, 1.2), M(exo ? 0x424242 : 0x6d4c41), side * 1.35, 0.9, 0); // shoulder plates
  if (exo) {
    part(h.torso, boxGeo(2.2, 1.0, 1.25), M(0x303030), 0, 0.4, 0); // exo-suit chest
    part(h.torso, boxGeo(0.9, 0.3, 0.06), glow(h, fire), 0, 0.5, 0.64);
  }
  const len = level >= 4 ? 2.6 : level >= 2 ? 2.2 : 1.8;
  const gun = holdLongGun(h, len, M(0x424242));
  part(gun, boxGeo(0.55, 0.3, 0.55), M(0x212121), 0, -len, 0); // nozzle
  part(gun, boxGeo(0.15, 0.15, 0.15), glow(h, fire), 0, -len - 0.2, 0.25); // pilot light
  part(gun, boxGeo(0.45, 0.6, 0.45), M(0xbf360c), 0, -0.4, -0.35); // fuel canister
  h.recoilScale = 0.1;
  return h;
}

/**
 * Goo Gunner (alternate Slime Trooper form): a lab worker in a green hazmat suit with a goo blaster.
 * Lv 2 a gas mask, Lv 3 the Glue Hose (a big goo tank and a hose nozzle), Lv 4 acid-yellow trim,
 * Lv 5 a second tank and a dripping goo crown.
 */
export function makeGooGunner(level) {
  const goo = 0x76ff03;
  const hose = level >= 3;
  const suit = level >= 4 ? 0x1b5e20 : 0x43a047;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: suit, pants: suit, arms: suit, face: 'soldier' });
  const { M } = h;
  part(h.head, boxGeo(1.45, 1.45, 1.45), M(suit), 0, 0.68, -0.05); // hood
  const visor = part(h.head, boxGeo(1.1, 0.7, 0.08), M(0xc5e1a5), 0, 0.7, 0.72);
  visor.material.transparent = true;
  visor.material.opacity = 0.7;
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.45, 0.52); // Dimension Shard
  if (level >= 2) part(h.head, boxGeo(0.6, 0.5, 0.4), M(0x263238), 0, 0.3, 0.85); // gas mask filter
  if (level >= 4) for (const y of [-0.5, 0.3]) part(h.torso, boxGeo(2.08, 0.18, 1.08), M(0xeeff41), 0, y, 0); // acid trim
  const tank = (x, tall) => {
    part(h.torso, boxGeo(0.8, tall, 0.8), M(0x546e7a), x, 0.1, -0.9);
    part(h.torso, boxGeo(0.6, tall * 0.7, 0.1), glow(h, goo), x, 0.1, -1.32);
  };
  tank(level >= 5 ? -0.5 : 0, hose ? 2.0 : 1.4);
  if (level >= 5) {
    tank(0.5, 2.0);
    for (const x of [-0.45, 0, 0.45]) part(h.head, boxGeo(0.3, 0.45, 0.3), glow(h, goo), x, 1.55, 0); // goo crown
  }
  const len = hose ? 1.8 : 1.3;
  const gun = holdLongGun(h, len, M(hose ? 0x2e7d32 : 0x455a64));
  part(gun, boxGeo(hose ? 0.35 : 0.55, 0.3, hose ? 0.35 : 0.55), glow(h, goo), 0, -len - 0.1, 0); // nozzle
  part(gun, boxGeo(0.5, 0.6, 0.5), glow(h, goo), 0, -0.3, -0.35); // canister
  h.tracer = goo;
  h.tracerWidth = hose ? 0.4 : 0.32;
  h.flight = { color: goo, size: 0.55, arc: 1.2, glowing: true, blob: true }; // a glob of goo
  return h;
}

/**
 * Cryo Blaster (alternate Frost Trooper with two paths): a trooper in pale blue snow gear with an
 * ice fan blaster. Top path: a bigger fan at Lv 2, a cryo tank at Lv 4, a swirling Snow Storm rig
 * at Lv 5. Bottom path: a long Cryo Rifle from Lv 3, overcharged tanks at Lv 4, Deep Freeze armor at Lv 5.
 */
export function makeCryoBlaster(level, bottom = false) {
  const ice = 0x80d8ff;
  const maxed = level >= 5;
  const coat = maxed ? (bottom ? 0x01579b : 0xe1f5fe) : 0xb3e5fc;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: coat, pants: 0x78909c, arms: coat, face: 'soldier' });
  const { M } = h;
  part(h.head, boxGeo(1.45, 0.6, 1.45), M(bottom && level >= 3 ? 0x0277bd : 0xeceff1), 0, 1.25, 0); // snow helmet
  part(h.head, boxGeo(1.3, 0.3, 0.12), M(0x263238), 0, 0.75, 0.66); // goggles
  for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.3, 0.22, 0.06), glow(h, ice), x, 0.75, 0.73);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.45, 0.52); // Dimension Shard
  const tanks = level >= 4 ? [-0.45, 0.45] : [0];
  for (const x of tanks) {
    part(h.torso, boxGeo(0.7, 1.8, 0.7), M(0x90a4ae), x, 0.1, -0.85);
    part(h.torso, boxGeo(0.4, 1.2, 0.1), glow(h, ice), x, 0.1, -1.22);
  }
  if (maxed) for (const side of [-1, 1]) part(h.torso, boxGeo(0.9, 0.7, 1.3), glow(h, bottom ? 0x40c4ff : 0xe1f5fe), side * 1.4, 0.9, 0); // ice pauldrons
  if (bottom && level >= 3) {
    // Cryo Rifle: a long ice rifle with a scope.
    const gun = iceGun(h, maxed ? 3.2 : 2.8, ice);
    part(gun, boxGeo(0.3, 0.9, 0.3), M(0x263238), 0, -1.0, 0.35); // scope
    h.tracerWidth = maxed ? 0.35 : 0.25;
  } else {
    // A stubby blaster with a fan cage on the end.
    const fan = level >= 2 && !bottom ? 1.2 : 0.9;
    const gun = holdLongGun(h, 1.4, M(0x546e7a));
    part(gun, boxGeo(fan, 0.3, fan), M(0xcfd8dc), 0, -1.45, 0); // fan cage
    part(gun, boxGeo(fan * 0.6, 0.12, fan * 0.6), glow(h, ice), 0, -1.6, 0);
    if (maxed) part(gun, boxGeo(fan * 1.3, 0.12, fan * 1.3), glow(h, 0xe1f5fe), 0, -1.75, 0); // Snow Storm ring
    h.tracerWidth = 0.3;
  }
  h.tracer = ice;
  return h;
}
export const makeCryoBlasterBottom = (level) => makeCryoBlaster(level, true);

/**
 * Cryo Mortar (alternate Harpoon Hunter form): a gunner in arctic white beside an icy mortar
 * tube. Lv 2 a wider tube, Lv 3 nitrogen tanks, Lv 4 a longer frosted tube, Lv 5 a huge glowing
 * ice cannon.
 */
export function makeCryoMortar(level) {
  const ice = 0x80d8ff;
  const nice = level >= 5;
  const coat = nice ? 0x0288d1 : 0xeceff1;
  const h = makeHumanoid({ skin: 0xffcc80, shirt: coat, pants: 0x90a4ae, arms: coat, face: 'soldier' });
  const { M } = h;
  helmet(h, nice ? 0x01579b : 0xb0bec5);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.45, 0.52); // Dimension Shard
  if (level >= 1) part(h.head, boxGeo(1.3, 0.3, 0.12), M(0x263238), 0, 0.75, 0.66); // goggles
  const mount = new THREE.Group();
  mount.position.set(0, 0, 2.3);
  h.root.add(mount);
  part(mount, boxGeo(2.0, 0.25, 2.0), M(0x607d8b), 0, 0.12, 0);
  const w = nice ? 1.4 : level >= 2 ? 1.0 : 0.8;
  const len = nice ? 4.6 : level >= 4 ? 4.0 : 3.2;
  const tube = new THREE.Group();
  tube.position.set(0, 0.35, 0);
  tube.rotation.x = 0.45;
  mount.add(tube);
  part(tube, boxGeo(w, len, w), M(nice ? 0x0277bd : 0x78909c), 0, len / 2, 0);
  part(tube, boxGeo(w + 0.25, 0.3, w + 0.25), glow(h, ice), 0, len, 0); // frosted rim
  if (level >= 4) for (const y of [0.9, 2.0]) part(tube, boxGeo(w + 0.15, 0.2, w + 0.15), glow(h, 0xe1f5fe), 0, y, 0); // frost bands
  for (const side of [-1, 1]) {
    const leg = part(mount, boxGeo(0.18, 2.4, 0.18), M(0x37474f), side * 0.7, 1.1, 1.1);
    leg.rotation.set(-0.5, 0, side * 0.3);
  }
  setMuzzle(h, tube, 0, len + 0.3, 0);
  if (level >= 3) for (const x of [1.6, 2.3]) { // nitrogen tanks
    part(h.root, boxGeo(0.6, 1.6, 0.6), M(0x90a4ae), x, 0.8, 0.3);
    part(h.root, boxGeo(0.4, 1.0, 0.1), glow(h, ice), x, 0.8, 0.62);
  }
  const shell = part(h.rightArm, boxGeo(0.45, 0.85, 0.45), glow(h, ice), 0.6, -2.1, 0);
  shell.rotation.z = 0.3;
  h.rightArm.rotation.set(-1.0, 0, 0.3);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -1.0, left: -1.0, leftRecoil: 0 };
  h.recoilScale = 0.4;
  h.projectile = { color: ice, size: nice ? 1.0 : 0.7, arc: 16, glowing: true };
  return h;
}

/**
 * Archer (Bowmaster form): a ranger in a long green cloak with a big recurve bow. Lv 3 goggles,
 * Lv 4 flaming arrows, Lv 5 powder kegs on its belt, Lv 6 a storm-blue cloak with sparks.
 */
export function makeBowmaster(level) {
  const storm = level >= 5;
  const coat = storm ? 0x1a237e : 0x33691e;
  const h = makeHumanoid({ skin: 0xffcc80, shirt: coat, pants: 0x3e2723, arms: coat });
  const { M } = h;
  part(h.head, boxGeo(1.45, 1.4, 1.4), M(storm ? 0x0d1440 : 0x1b5e20), 0, 0.7, -0.08); // hood
  part(h.torso, boxGeo(2.2, 3.0, 0.12), M(storm ? 0x283593 : 0x2e7d32), 0, -0.5, -0.6); // cloak
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.45, 0.52); // Dimension Shard
  const quiver = part(h.torso, boxGeo(0.6, 1.6, 0.6), M(0x6d4c41), 0.5, 0.3, -0.85);
  quiver.rotation.z = 0.3;
  const tip = level >= 3 ? glow(h, 0xff7043) : M(0xeeeeee);
  for (const x of [-0.12, 0.12]) part(quiver, boxGeo(0.1, 0.5, 0.1), tip, x, 1.0, 0);
  if (level >= 2) {
    part(h.head, boxGeo(1.3, 0.3, 0.12), M(0x212121), 0, 0.75, 0.66);
    for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.3, 0.22, 0.06), glow(h, 0xffd740), x, 0.75, 0.73);
  }
  if (level >= 4) for (const x of [-0.7, 0.7]) part(h.torso, boxGeo(0.5, 0.6, 0.5), M(0x5d4037), x, -1.2, 0.5); // powder kegs
  if (storm) part(h.torso, boxGeo(0.25, 0.25, 0.06), glow(h, 0x80d8ff), 0.5, 0.5, 0.53);
  const wood = M(storm ? 0x37474f : 0x795548);
  const bow = new THREE.Group();
  bow.position.set(0, -2.1, 0);
  h.leftArm.add(bow);
  part(bow, boxGeo(0.18, 0.18, 4.0), wood, 0, -0.2, 0);
  for (const z of [-1.9, 1.9]) part(bow, boxGeo(0.18, 0.6, 0.18), wood, 0, 0.1, z);
  setMuzzle(h, bow, 0, -0.3, 0);
  h.leftArm.rotation.set(-Math.PI / 2, 0, 0.3);
  h.rightArm.rotation.set(-Math.PI / 2, 0, -0.4);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0 };
  h.tracer = storm ? 0x80d8ff : level >= 3 ? 0xff7043 : 0xd7ccc8;
  return h;
}

/**
 * Swarmer (event): a beekeeper in a white suit and veiled hat with a hive blaster. Lv 3 a honey
 * tank, Lv 4 a grenade belt, Lv 5 a hive backpack, Lv 6 a black-and-gold suit.
 */
export function makeSwarmer(level) {
  const death = level >= 5;
  const suit = death ? 0x212121 : 0xfafafa;
  const h = makeHumanoid({ skin: 0xffcc80, shirt: suit, pants: suit, arms: suit });
  const { M } = h;
  const gold = M(0xffb300);
  part(h.head, boxGeo(2.0, 0.12, 2.0), M(death ? 0x111111 : 0xeeeeee), 0, 1.25, 0); // hat brim
  part(h.head, boxGeo(1.3, 0.5, 1.3), M(death ? 0x111111 : 0xeeeeee), 0, 1.55, 0);
  part(h.head, boxGeo(1.5, 1.1, 1.5), M(0x37474f), 0, 0.55, 0.02); // veil
  if (level >= 2) part(h.torso, boxGeo(0.9, 1.4, 0.7), gold, 0.6, 0, -0.85); // honey tank
  if (level >= 3) for (const x of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.4, 0.4, 0.4), M(0xfdd835), x, -0.9, 0.6); // bee grenades
  if (level >= 4) {
    // Beehive backpack
    part(h.torso, boxGeo(1.4, 1.8, 0.9), gold, -0.3, 0.2, -1.0);
    for (const y of [-0.4, 0.2, 0.8]) part(h.torso, boxGeo(1.45, 0.12, 0.95), M(0x6d4c41), -0.3, y, -1.0);
  }
  if (death) part(h.torso, boxGeo(2.1, 0.3, 1.1), gold, 0, 0.4, 0); // gold stripe
  const gun = holdLongGun(h, 2.0, M(0x795548));
  part(gun, boxGeo(0.7, 0.9, 0.8), gold, 0, -0.6, 0); // hive barrel
  part(gun, boxGeo(0.12, 0.6, 0.6), M(0x6d4c41), 0, -0.6, 0);
  h.projectile = { color: 0xfdd835, size: 0.35 };
  h.tracer = 0xfdd835;
  return h;
}

/**
 * Toxic Gunner (event): a hazmat trooper with a poison SMG. Lv 3 a toxic drum mag, Lv 4 a gas
 * mask with glowing filters, Lv 5 the nuclear suit with a minigun.
 */
export function makeToxicGunner(level) {
  const nuke = level >= 4;
  const suit = nuke ? 0x33691e : 0xfbc02d;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: suit, pants: suit, arms: suit, face: 'soldier' });
  const { M } = h;
  const tox = glow(h, 0x76ff03);
  part(h.head, boxGeo(1.45, 1.4, 1.45), M(nuke ? 0x1b5e20 : 0xf9a825), 0, 0.7, -0.05); // hood
  part(h.head, boxGeo(1.1, 0.5, 0.1), M(0x90caf9), 0, 0.75, 0.68); // visor
  if (level >= 3) for (const x of [-0.35, 0.35]) part(h.head, boxGeo(0.35, 0.35, 0.35), tox, x, 0.25, 0.7); // filters
  part(h.torso, boxGeo(0.8, 0.8, 0.06), M(0x212121), 0, 0.4, 0.52); // hazard sign
  part(h.torso, boxGeo(0.4, 0.4, 0.07), tox, 0, 0.4, 0.53);
  part(h.torso, boxGeo(1.0, 1.6, 0.7), M(0x616161), 0, 0, -0.85); // tank
  const len = nuke ? 2.6 : 1.8;
  const gun = holdLongGun(h, len, M(0x424242));
  if (level >= 2) part(gun, boxGeo(0.7, 0.7, 0.7), tox, 0.3, -0.7, 0.2); // drum mag
  if (nuke) part(gun, boxGeo(0.6, 1.2, 0.6), M(0x263238), 0, -len + 0.6, 0);
  h.tracer = 0x76ff03;
  h.tracerWidth = 0.12;
  return h;
}

/**
 * Sledger (event): a burly arctic worker with an ice sledgehammer. Lv 3 a bigger sledge, Lv 4
 * a frozen hammer head, Lv 5 fur armor, Lv 6 a huge glowing glacier hammer.
 */
export function makeSledger(level) {
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: 0x1565c0, pants: 0x263238, arms: 0x1565c0 });
  const { M } = h;
  const ice = 0x80d8ff;
  part(h.head, boxGeo(1.4, 0.5, 1.4), M(0x0d47a1), 0, 1.3, 0); // beanie
  part(h.head, boxGeo(1.3, 0.5, 0.2), M(0x6d4c41), 0, 0.15, 0.6); // beard
  if (level >= 4) for (const side of [-1, 1]) part(h.torso, boxGeo(1.0, 0.8, 1.4), M(0xfafafa), side * 1.4, 0.9, 0); // fur shoulders
  h.size = level >= 4 ? 1.1 : 1;
  const big = [1, 1, 1.15, 1.25, 1.4, 1.6][level];
  const ham = new THREE.Group();
  ham.position.set(0, -1.9, 0);
  ham.scale.setScalar(big);
  h.rightArm.add(ham);
  part(ham, boxGeo(0.28, 2.6, 0.28), M(0x5d4037), 0, -1.1, 0);
  const headMat = level >= 3 ? glow(h, ice) : M(0x90a4ae);
  part(ham, boxGeo(0.9, 0.9, 1.6), headMat, 0, -2.4, 0);
  if (level >= 5) for (const z of [-0.9, 0.9]) part(ham, boxGeo(0.6, 0.6, 0.4), glow(h, 0xe1f5fe), 0, -2.4, z);
  setMuzzle(h, ham, 0, -2.6, 0);
  h.rightArm.rotation.set(-2.6, 0, 0.15);
  h.leftArm.rotation.set(-2.4, 0, -0.3);
  h.pose = { right: -2.6, left: -2.4, leftRecoil: 0 };
  h.swing = 2.2;
  h.melee = true;
  h.tracer = ice;
  return h;
}

/**
 * Executioner (event): a hooded executioner with a big axe. Lv 3 a double-headed axe, Lv 4 a
 * ghostly cloak, Lv 5 shoulder spikes, Lv 6 the Judge: a glowing red axe.
 */
export function makeExecutioner(level) {
  const judge = level >= 5;
  const h = makeHumanoid({ skin: 0xd9a066, shirt: 0x212121, pants: 0x111111, arms: 0xd9a066 });
  const { M } = h;
  part(h.head, boxGeo(1.45, 1.45, 1.45), M(0x111111), 0, 0.68, -0.03); // executioner hood
  for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.25, 0.15, 0.05), level >= 3 ? glow(h, 0x7c4dff) : M(0xffffff), x, 0.7, 0.74);
  part(h.torso, boxGeo(2.1, 0.35, 1.1), M(0x4e342e), 0, -0.85, 0); // belt
  if (level >= 3) part(h.torso, boxGeo(2.2, 3.2, 0.12), M(0x311b92), 0, -0.6, -0.6); // ghostly cloak
  if (level >= 4) for (const side of [-1, 1]) part(h.torso, boxGeo(0.3, 0.8, 0.3), M(0x9e9e9e), side * 1.2, 1.3, 0); // spikes
  const axe = new THREE.Group();
  axe.position.set(0, -1.9, 0);
  h.rightArm.add(axe);
  part(axe, boxGeo(0.25, 2.6, 0.25), M(0x3e2723), 0, -1.1, 0);
  const headMat = judge ? glow(h, 0xff1744) : M(0x78909c);
  part(axe, boxGeo(0.15, 1.2, 1.1), headMat, 0, -2.1, 0.6);
  if (level >= 2) part(axe, boxGeo(0.15, 1.2, 1.1), headMat, 0, -2.1, -0.6); // double-headed
  setMuzzle(h, axe, 0, -2.2, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  h.leftArm.rotation.set(-0.6, 0, -0.3);
  h.pose = { right: -2.4, left: -0.6, leftRecoil: 0 };
  h.tracer = judge ? 0xff1744 : 0xb0bec5;
  h.tracerWidth = 0.3;
  return h;
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

/**
 * Elf Camp (event). Lv 1 a striped tent; Lv 2 a snow fort and a snowman; Lv 3 a log workshop with
 * a toy cannon; Lv 4 a gingerbread cookie factory with a smoking chimney and a lookout; Lv 5 a red
 * and gold toy fortress with towers, a present mountain, lights and a giant star.
 */
export function makeElfCamp(level) {
  const u = makeThing();
  const { M } = u;
  const snow = M(0xf5f9ff);
  const red = M(0xc62828);
  const green = M(0x2e7d32);
  const gold = M(0xffc107);
  part(u.body, boxGeo(4.6, 0.3, 4.6), level >= 4 ? M(0xe3f2fd) : snow, 0, 0.15, 0);
  if (level === 0) {
    // A striped tent
    for (const side of [-1, 1]) {
      const wall = part(u.body, boxGeo(0.15, 2.4, 2.6), side < 0 ? red : green, side * 0.75, 1.2, -0.4);
      wall.rotation.z = side * 0.55;
    }
    part(u.body, boxGeo(0.25, 0.25, 2.8), gold, 0, 2.25, -0.4);
    part(u.body, boxGeo(0.8, 1.0, 0.1), M(0x4e342e), 0, 0.7, 0.85);
  } else if (level <= 2) {
    // Log cabin (Lv 3: a workshop with a red roof)
    const wood = M(level >= 2 ? 0x8d5524 : 0xa1887f);
    part(u.body, boxGeo(2.6, 1.8, 2.0), wood, 0, 1.2, -0.6);
    for (const side of [-1, 1]) part(u.body, boxGeo(1.6, 0.25, 2.3), level >= 2 ? red : snow, side * 0.65, 2.4, -0.6).rotation.z = side * -0.6;
    part(u.body, boxGeo(0.7, 1.1, 0.1), M(0x4e342e), 0, 0.85, 0.42);
    part(u.body, boxGeo(0.5, 0.4, 0.08), glow(u, 0xffe082), 0.85, 1.4, 0.42);
  } else {
    // Lv 4: a gingerbread factory. Lv 5: a red and gold toy fortress.
    const fort = level >= 4;
    const wall = M(fort ? 0xb71c1c : 0xa0522d);
    const trim = fort ? gold : snow;
    part(u.body, boxGeo(3.4, 2.6, 2.4), wall, 0, 1.6, -0.8);
    part(u.body, boxGeo(3.6, 0.3, 2.6), trim, 0, 3.0, -0.8);
    boxRow(u.body, 5, 0.75, boxGeo(0.35, 0.4, 0.35), trim, 3.3, 0.35); // battlements / icing
    part(u.body, boxGeo(1.0, 1.4, 0.1), M(0x4e342e), 0, 0.9, 0.42);
    for (const x of [-1.1, 1.1]) part(u.body, boxGeo(0.6, 0.6, 0.08), glow(u, 0xffe082), x, 1.8, 0.42);
    part(u.body, boxGeo(0.7, 1.6, 0.7), M(0x5d4037), 1.1, 3.8, -1.4); // chimney
    part(u.body, boxGeo(0.5, 0.3, 0.5), glow(u, 0xff9100), 1.1, 4.7, -1.4); // oven glow
    if (fort) {
      for (const x of [-1.9, 1.9]) {
        part(u.body, boxGeo(1.0, 4.4, 1.0), red, x, 2.2, -1.6); // towers
        part(u.body, boxGeo(1.2, 0.3, 1.2), gold, x, 4.5, -1.6);
        part(u.body, boxGeo(0.5, 0.9, 0.5), green, x, 5.1, -1.6);
      }
      part(u.body, boxGeo(0.2, 2.0, 0.2), gold, 0, 4.3, -0.8); // flagpole with a star
      part(u.body, boxGeo(1.0, 1.0, 0.25), glow(u, 0xffea00), 0, 5.5, -0.8).rotation.z = Math.PI / 4;
    } else {
      part(u.body, boxGeo(0.25, 3.0, 0.25), M(0x8d5524), -1.9, 1.5, 1.6); // lookout post
      part(u.body, boxGeo(1.0, 0.2, 1.0), M(0x8d5524), -1.9, 3.0, 1.6);
    }
  }
  if (level >= 1) {
    // Snow fort wall and a snowman
    if (level < 4) boxRow(u.body, 4, 0.6, boxGeo(0.55, 0.55, 0.55), snow, 0.55, 1.9);
    part(u.body, boxGeo(0.9, 0.9, 0.9), snow, 1.8, 0.75, 1.0);
    part(u.body, boxGeo(0.6, 0.6, 0.6), snow, 1.8, 1.5, 1.0);
    part(u.body, boxGeo(0.12, 0.12, 0.35), M(0xff7043), 1.8, 1.5, 1.4);
    part(u.body, boxGeo(0.5, 0.4, 0.5), M(0x212121), 1.8, 1.95, 1.0);
  }
  if (level >= 2) {
    // A toy cannon (Lv 4+: two)
    for (const x of level >= 3 ? [-1.8, -0.9] : [-1.8]) {
      part(u.body, boxGeo(0.7, 0.4, 0.7), M(0x5d4037), x, 0.5, 1.0);
      part(u.body, boxGeo(0.35, 0.35, 1.1), M(level >= 3 ? 0xffc107 : 0x37474f), x, 0.85, 1.35).rotation.x = -0.3;
    }
  }
  if (level >= 4) {
    // A mountain of presents and Christmas lights
    for (const [x, y, z, c, r, s] of [[-1.4, 0.65, 0.1, 0x1e88e5, 0xffeb3b, 0.9], [1.6, 0.6, 0.4, 0x43a047, 0xfafafa, 0.8], [-1.6, 1.4, 0.2, 0xd500f9, 0xffd54f, 0.6], [1.4, 1.25, 0.5, 0xffd54f, 0xc62828, 0.6]]) {
      present(u, u.body, c, r, s).position.set(x, y, z);
    }
    for (let i = 0; i < 8; i++) part(u.body, boxGeo(0.18, 0.18, 0.18), glow(u, [0xff1744, 0x00e676, 0xffea00, 0x2979ff][i % 4]), -1.6 + i * 0.46, 2.75, 0.45);
  }
  gunMuzzle(u, u.body, 0, 1.0, 0.6);
  u.tracer = 0xffffff;
  return u;
}

/**
 * Relic units (medieval): relicbandit / relicbandit1 (hooded sword fighters), reliczealot (a
 * white-and-gold knight), relicarcher, relicwarden (a huge armored fighter with a greatsword),
 * relicseraph (a winged angel with a halo), relicoverseer / relicphantom (huge faceless stone
 * guardians; the Phantom is a see-through ghost) and relicprime (the giant Overseer Prime).
 */
export function makeRelicUnit(model) {
  const look = {
    relicbandit: { skin: 0xe0ac69, shirt: 0x5d4037, pants: 0x3e2723 },
    relicbandit1: { skin: 0xe0ac69, shirt: 0x4a148c, pants: 0x311b92 },
    reliczealot: { skin: 0xd7ccc8, shirt: 0xeceff1, pants: 0x90a4ae },
    relicarcher: { skin: 0xe0ac69, shirt: 0x33691e, pants: 0x5d4037 },
    relicwarden: { skin: 0x9e9e9e, shirt: 0x546e7a, pants: 0x37474f },
    relicseraph: { skin: 0xffe0b2, shirt: 0xfffde7, pants: 0xfff9c4 },
    relicoverseer: { skin: 0x8d8d7a, shirt: 0x6d6a55, pants: 0x4e4b3c },
    relicphantom: { skin: 0x80deea, shirt: 0x4dd0e1, pants: 0x26c6da },
    relicprime: { skin: 0x5d5a48, shirt: 0x3e3b2e, pants: 0x2b281f },
  }[model];
  const h = makeHumanoid({ ...look, arms: look.shirt, face: model === 'relicseraph' || model === 'relicarcher' ? 'smile' : 'none' });
  const { M } = h;
  const steel = M(0xb0bec5);
  const gold = M(0xffc107);
  const hand = inHand(h);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.tracer = 0xeeeeee;
  h.size = 1;
  const sword = (len, mat) => part(hand, boxGeo(0.22, len, 0.12), mat, 0, -len / 2, 0);
  if (model === 'relicbandit' || model === 'relicbandit1') {
    part(h.head, boxGeo(1.35, 1.35, 1.35), M(look.shirt), 0, 0.68, -0.08); // hood
    part(h.head, boxGeo(1.25, 0.45, 0.1), M(0x212121), 0, 0.35, 0.64); // face mask
    sword(1.6, steel);
    h.size = 0.85;
  } else if (model === 'reliczealot') {
    part(h.head, boxGeo(1.4, 1.4, 1.4), steel, 0, 0.65, 0); // great helm
    part(h.head, boxGeo(1.0, 0.12, 0.1), M(0x212121), 0, 0.75, 0.71); // visor slit
    part(h.torso, boxGeo(0.5, 1.6, 0.08), M(0xc62828), 0, 0.1, 0.55); // red cross
    part(h.torso, boxGeo(1.4, 0.45, 0.08), M(0xc62828), 0, 0.4, 0.56);
    sword(2.2, steel);
    part(h.leftArm, boxGeo(0.25, 2.0, 1.6), M(0xeceff1), 0.6, -1.2, 0.3); // shield
    h.size = 1;
  } else if (model === 'relicarcher') {
    part(h.head, boxGeo(1.35, 0.5, 1.35), M(0x33691e), 0, 1.3, 0); // cap
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.1);
    part(inHand(h, h.leftArm), boxGeo(0.15, 0.2, 2.6), M(0x8d6e63), 0, 0, 0); // bow
    part(h.torso, boxGeo(0.6, 1.8, 0.6), M(0x6d4c41), 0.6, 0.2, -0.75); // quiver
    h.projectile = { color: 0x8d6e63, size: 0.25, arc: 1 };
    h.tracer = 0xbcaaa4;
    h.size = 0.9;
  } else if (model === 'relicwarden') {
    part(h.head, boxGeo(1.5, 1.5, 1.5), M(0x455a64), 0, 0.65, 0);
    part(h.head, boxGeo(1.1, 0.15, 0.1), glow(h, 0x40c4ff), 0, 0.7, 0.76); // glowing visor
    for (const x of [-1.3, 1.3]) part(h.torso, boxGeo(1.0, 0.7, 1.4), M(0x37474f), x, 1.0, 0); // pauldrons
    sword(3.4, M(0x90a4ae));
    h.tracer = 0x40c4ff;
    h.size = 1.5;
  } else if (model === 'relicseraph') {
    addHalo(h, 0xffeb3b);
    addWings(h, M(0xffffff));
    sword(2.6, glow(h, 0xfff176));
    h.tracer = 0xfff176;
    h.size = 1.1;
  } else {
    // Overseers: huge, faceless stone guardians with a glowing core. They only ram.
    const prime = model === 'relicprime';
    const core = glow(h, model === 'relicphantom' ? 0xe0f7fa : prime ? 0xff6d00 : 0xffd740);
    part(h.head, boxGeo(1.0, 0.25, 0.1), core, 0, 0.7, 0.62); // eye slit
    part(h.torso, boxGeo(0.8, 0.8, 0.1), core, 0, 0.3, 0.52);
    for (const x of [-1.4, 1.4]) part(h.torso, boxGeo(1.1, 0.9, 1.5), M(look.pants), x, 1.0, 0);
    h.rightArm.rotation.set(-0.3, 0, 0.1);
    if (prime) {
      // Overseer Prime: horns, claws and a fiery crown.
      for (const x of [-0.5, 0.5]) part(h.head, boxGeo(0.25, 1.0, 0.25), M(0x212121), x, 1.6, 0).rotation.z = x > 0 ? -0.4 : 0.4;
      for (const arm of [h.rightArm, h.leftArm]) for (const x of [-0.3, 0, 0.3]) part(arm, boxGeo(0.15, 0.8, 0.15), core, x, -2.3, 0.3);
      boxRow(h.head, 5, 0.3, boxGeo(0.2, 0.4, 0.2), core, 1.35, 0.5);
      h.tracer = 0xff6d00;
      h.size = 3.6;
    } else h.size = 2.4;
    if (model === 'relicphantom') setOpacity(h, 0.55);
  }
  setMuzzle(h, hand, 0, -1.2, 0);
  return h;
}

/**
 * Relic (event). An ancient stone shrine with a floating relic crystal: Lv 1 a cracked altar,
 * Lv 2 armor plates, Lv 3 banners and pillars, Lv 4 a warden statue, Lv 5 a golden temple, and
 * Lv 6 a blazing sanctum with a huge orange crystal and a ring of fire runes.
 */
export function makeRelic(level) {
  const u = makeThing();
  const { M } = u;
  const stone = M(level >= 4 ? 0xd7ccc8 : 0x9e9e8e);
  const dark = M(0x5d5a48);
  const gold = M(0xffc107);
  part(u.body, boxGeo(4.4, 0.5, 4.4), dark, 0, 0.25, 0);
  part(u.body, boxGeo(2.6, 1.6, 2.6), stone, 0, 1.3, 0); // altar
  if (level >= 1) for (const x of [-1.35, 1.35]) part(u.body, boxGeo(0.15, 1.2, 2.2), M(0x78909c), x, 1.3, 0); // armor plates
  if (level >= 2) {
    for (const [x, z] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) {
      part(u.body, boxGeo(0.6, 3.2, 0.6), stone, x, 2.1, z); // pillars
      if (level >= 4) part(u.body, boxGeo(0.8, 0.3, 0.8), gold, x, 3.8, z);
    }
    for (const x of [-1.8, 1.8]) part(u.body, boxGeo(0.08, 1.4, 0.9), M(0xc62828), x, 2.6, 1.3); // banners
  }
  if (level >= 3) {
    // A small warden statue behind the altar
    part(u.body, boxGeo(0.9, 2.0, 0.6), dark, 0, 3.1, -1.6);
    part(u.body, boxGeo(0.6, 0.6, 0.6), dark, 0, 4.4, -1.6);
    part(u.body, boxGeo(0.15, 2.6, 0.1), M(0x90a4ae), 0.7, 3.3, -1.4);
  }
  if (level >= 4) part(u.body, boxGeo(4.4, 0.3, 4.4), gold, 0, 4.1, 0); // temple roof ring
  const color = level >= 5 ? 0xff6d00 : level >= 4 ? 0xffd740 : 0x40c4ff;
  const size = 0.9 + level * 0.15;
  const crystal = part(u.body, boxGeo(size, size * 1.6, size), glow(u, color), 0, 3.0 + level * 0.1, 0);
  crystal.rotation.y = Math.PI / 4;
  if (level >= 5) for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    part(u.body, boxGeo(0.4, 0.1, 0.4), glow(u, 0xff9100), Math.cos(a) * 2.6, 0.55, Math.sin(a) * 2.6); // fire runes
  }
  gunMuzzle(u, u.body, 0, 3.0, 0);
  u.tracer = color;
  return u;
}

/**
 * Jester (event). Lv 1 purple and gold with a two-point hat; Lv 2 juggling balls and curled shoes;
 * Lv 3 icy blue motley with frost bells and ice bombs; Lv 4 toxic green with goggles and a bomb
 * bandolier; Lv 5 the Harlequin of Doom: black and red diamonds, a three-point hat, a mask, a
 * cape and a bomb in each hand.
 */
export function makeJester(level) {
  const doom = level >= 4;
  const [ca, cb] = [[0x7b1fa2, 0xffc107], [0x7b1fa2, 0xffc107], [0x1565c0, 0xe3f2fd], [0x2e7d32, 0x6a1b9a], [0x111111, 0xd50000]][level];
  const h = makeHumanoid({ skin: 0xffe0bd, shirt: ca, pants: cb, arms: cb });
  const { M } = h;
  const a = M(ca);
  const b = M(cb);
  part(h.torso, boxGeo(1.0, 2.02, 1.02), b, 0.5, 0, 0); // motley halves
  if (doom) for (const [x, y] of [[-0.5, 0.5], [0.5, -0.5]]) part(h.torso, boxGeo(0.6, 0.6, 1.04), a, x, y, 0).rotation.z = Math.PI / 4; // diamonds
  part(h.torso, boxGeo(2.4, 0.35, 1.3), M(doom ? 0x9e9e9e : 0xfafafa), 0, 1.0, 0); // ruff collar
  if (level >= 1) for (const leg of [h.leftLeg, h.rightLeg]) part(leg, boxGeo(1.0, 0.3, 1.8), a, 0, -1.9, 0.5); // curled shoes
  // Floppy hat: two points (Lv 5: three) with bells (frosty from Lv 3)
  const bell = level === 2 ? glow(h, 0x80d8ff) : level === 3 ? glow(h, 0x76ff03) : M(0xffeb3b);
  part(h.head, boxGeo(1.35, 0.35, 1.35), a, 0, 1.3, 0);
  for (const side of doom ? [-1, 0, 1] : [-1, 1]) {
    const tip = part(h.head, boxGeo(0.4, doom ? 1.7 : 1.3, 0.4), side < 0 ? a : b, side * 0.6, 1.9, side === 0 ? -0.3 : 0);
    tip.rotation.z = side * -0.7;
    part(h.head, boxGeo(0.3, 0.3, 0.3), bell, side * 1.2, side === 0 ? 2.8 : 2.25, side === 0 ? -0.3 : 0);
  }
  if (level >= 1) {
    // Juggling balls hovering over the head
    const balls = [0xff1744, 0x2979ff, 0xffea00, 0x00e676, 0xd500f9];
    for (let i = 0; i < (doom ? 5 : 3); i++) {
      const ang = (i / (doom ? 5 : 3)) * Math.PI;
      part(h.body, boxGeo(0.4, 0.4, 0.4), level >= 2 ? glow(h, balls[i]) : M(balls[i]), Math.cos(ang) * 1.6, 7.6 + Math.sin(ang) * 0.9, 0);
    }
  }
  if (level >= 2) boxRow(h.torso, 3, 0.5, boxGeo(0.4, 0.4, 0.4), glow(h, 0x80d8ff), -0.85, 0.62); // ice bombs on the belt
  if (level >= 3) {
    part(h.torso, boxGeo(2.6, 0.3, 1.15), M(0x4e342e), 0, 0.2, 0).rotation.z = 0.6; // bandolier
    boxRow(h.torso, 4, 0.45, boxGeo(0.3, 0.45, 0.3), glow(h, 0x76ff03), 0.4, 0.62); // poison vials
    part(h.head, boxGeo(1.25, 0.3, 0.1), M(0x263238), 0, 0.85, 0.63); // goggles
    for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.3, 0.22, 0.05), glow(h, 0x76ff03), x, 0.85, 0.69);
  }
  if (doom) {
    part(h.head, boxGeo(1.25, 0.75, 0.1), M(0xfafafa), 0, 0.6, 0.64); // mask
    for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.22, 0.18, 0.05), glow(h, 0xff1744), x, 0.75, 0.7);
    part(h.head, boxGeo(0.5, 0.1, 0.05), M(0x111111), 0, 0.35, 0.7);
    part(h.torso, boxGeo(2.4, 3.8, 0.15), M(0x6a0000), 0, -0.8, -0.62); // cape
    const left = inHand(h, h.leftArm);
    part(left, boxGeo(0.8, 0.8, 0.8), M(0x212121), 0, -0.35, 0);
    part(left, boxGeo(0.1, 0.5, 0.1), glow(h, 0xff1744), 0, 0.25, 0);
  }
  const hand = inHand(h);
  const bombColor = [0x212121, 0x212121, 0x0d47a1, 0x1b5e20, 0x311b92][level];
  part(hand, boxGeo(0.75 + level * 0.08, 0.75 + level * 0.08, 0.75 + level * 0.08), M(bombColor), 0, -0.3, 0);
  part(hand, boxGeo(0.08, 0.45, 0.08), glow(h, doom ? 0xff1744 : 0xff9100), 0, 0.3, 0);
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(doom ? -2.2 : -0.6, 0, -0.3);
  h.pose = { right: -2.8, left: doom ? -2.2 : -0.6, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = { color: bombColor === 0x212121 ? 0x4a148c : bombColor, size: 0.6 + level * 0.06, arc: 4, glowing: true };
  return h;
}

/**
 * Cryomancer (event). Lv 1 a parka and a small sprayer; Lv 2 a fur hood, goggles and gloves; Lv 3
 * twin tanks with hoses; Lv 4 the Ice Commando: helmet, vest and a frost cannon; Lv 5 Winter's
 * Fury: glowing ice armor, an icicle crown and a huge crystal cannon.
 */
export function makeCryomancer(level) {
  const fury = level >= 4;
  const commando = level >= 3;
  const coat = [0x81d4fa, 0x4fc3f7, 0x29b6f6, 0x37474f, 0x0d47a1][level];
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: coat, pants: commando ? 0x263238 : 0x546e7a, arms: coat });
  const { M } = h;
  const ice = glow(h, fury ? 0xb3e5fc : 0x80d8ff);
  const fur = M(0xeceff1);
  if (commando) {
    helmet(h, fury ? 0xe1f5fe : 0x455a64, false);
    part(h.torso, boxGeo(2.15, 1.7, 1.2), M(fury ? 0x81d4fa : 0x546e7a), 0, 0.2, 0); // vest / ice armor
  } else {
    part(h.head, boxGeo(1.45, 0.5, 1.45), M(coat), 0, 1.25, 0);
    if (level >= 1) part(h.head, boxGeo(1.6, 0.25, 1.6), fur, 0, 1.1, 0); // fur hood rim
  }
  part(h.torso, boxGeo(2.1, 0.3, 1.1), fur, 0, -0.9, 0); // fur trim
  if (level >= 1) {
    part(h.head, boxGeo(1.25, 0.32, 0.1), M(0x263238), 0, 0.85, 0.63); // goggles
    for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.35, 0.22, 0.05), ice, x, 0.85, 0.69);
    for (const arm of [h.leftArm, h.rightArm]) part(arm, boxGeo(1.1, 0.6, 1.1), fur, 0, -1.8, 0); // gloves
  }
  // Tanks: one small, then two big ones with hoses
  const tanks = level >= 2 ? [-0.5, 0.5] : [0];
  const tankH = level >= 2 ? 2.2 : 1.4;
  for (const x of tanks) {
    part(h.torso, boxGeo(0.75, tankH, 0.75), M(fury ? 0xe1f5fe : 0x90a4ae), x, 0.1, -0.9);
    part(h.torso, boxGeo(0.78, 0.2, 0.78), ice, x, 0.5, -0.9);
  }
  if (level >= 2) part(h.torso, boxGeo(0.2, 0.2, 1.6), M(0x37474f), -0.8, -0.6, -0.1); // hose
  if (fury) {
    for (const side of [-1, 1]) part(h.torso, boxGeo(0.7, 0.7, 1.3), ice, side * 1.3, 1.1, 0); // ice pauldrons
    for (const x of [-0.45, 0, 0.45]) part(h.head, boxGeo(0.22, 0.8, 0.22), ice, x, 1.9, 0.2); // icicle crown
  }
  const gun = holdLongGun(h, 1.4 + level * 0.35, M(commando ? 0x263238 : 0x546e7a));
  const len = 1.4 + level * 0.35;
  const ns = 0.4 + level * 0.12;
  part(gun, boxGeo(ns, 0.5, ns), ice, 0, -len, 0); // nozzle
  if (commando) for (const side of [-1, 1]) part(gun, boxGeo(0.15, len * 0.8, 0.15), ice, side * 0.3, -len * 0.5, 0); // cooling fins
  h.tracer = fury ? 0xe1f5fe : 0x80d8ff;
  h.tracerWidth = 0.25 + level * 0.08;
  return h;
}

/**
 * Hallow Punk (Hallowboomer form). Lv 1 an orange mohawk and a leather jacket with a pumpkin tube;
 * Lv 2 purple witch-fire, spiked shoulders and a witch hat; Lv 3 twin glowing launchers and chains;
 * Lv 4 the Queen of the Blood Ember: crown, blood-red cape, ember wings and a skull launcher.
 */
export function makeHallowPunk(level) {
  const queen = level >= 3;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: queen ? 0x3e0000 : 0x212121, pants: queen ? 0x4a0000 : 0x263238, arms: queen ? 0x3e0000 : 0x212121 });
  const { M } = h;
  const fireC = [0xff6d00, 0xb388ff, 0xd500f9, 0xff1744][level];
  const fire = glow(h, fireC);
  if (level !== 1) for (let i = 0; i < 4; i++) part(h.head, boxGeo(0.3, 0.55 + level * 0.15, 0.3), fire, 0, 1.4 + level * 0.07, 0.45 - i * 0.32); // mohawk
  boxRow(h.torso, 3, 0.5, boxGeo(0.15, 0.15, 0.08), M(0xb0bec5), 0.7, 0.53); // studs
  if (level >= 1) {
    for (const side of [-1, 1]) {
      part(h.torso, boxGeo(0.7, 0.4, 1.2), M(0x424242), side * 1.25, 1.1, 0);
      for (const z of [-0.3, 0.3]) part(h.torso, boxGeo(0.15, 0.5, 0.15), M(0xcfd8dc), side * 1.35, 1.5, z); // spikes
    }
  }
  if (level === 1) {
    // Witch hat with a purple flame band
    part(h.head, boxGeo(2.0, 0.15, 2.0), M(0x212121), 0, 1.25, 0);
    part(h.head, boxGeo(1.1, 1.0, 1.1), M(0x212121), 0, 1.8, 0);
    part(h.head, boxGeo(0.6, 0.9, 0.6), M(0x212121), 0.2, 2.6, -0.2).rotation.z = -0.4;
    part(h.head, boxGeo(1.15, 0.2, 1.15), fire, 0, 1.4, 0);
  }
  if (level >= 2) part(h.torso, boxGeo(2.6, 0.2, 1.15), M(0x9e9e9e), 0, 0.3, 0).rotation.z = -0.5; // chains
  if (queen) {
    const gold = M(0xffc107);
    part(h.head, boxGeo(1.4, 0.3, 1.4), gold, 0, 1.3, 0);
    for (const x of [-0.45, 0, 0.45]) part(h.head, boxGeo(0.22, 0.5, 0.22), gold, x, 1.6, 0.55);
    part(h.head, boxGeo(0.25, 0.25, 0.1), fire, 0, 1.55, 0.72);
    part(h.torso, boxGeo(2.4, 4.0, 0.15), M(0x8b0000), 0, -0.9, -0.62); // cape
    for (const side of [-1, 1]) {
      const wing = part(h.torso, boxGeo(2.4, 1.6, 0.12), fire, side * 1.6, 0.9, -0.75);
      wing.rotation.z = side * 0.4;
    }
  }
  // Shoulder launchers (Lv 3+: two)
  const len = 2.2 + level * 0.4;
  for (const x of level >= 2 ? [-1.5, 1.5] : [-1.5]) {
    const tube = new THREE.Group();
    tube.position.set(x, 4.6, 0);
    h.body.add(tube);
    part(tube, boxGeo(0.7 + level * 0.08, 0.7 + level * 0.08, len), M(queen ? 0x212121 : 0x37474f), 0, 0, 0.2);
    if (level >= 2) part(tube, boxGeo(0.8, 0.15, len * 0.6), fire, 0, 0.42, 0.2);
    if (queen) part(tube, boxGeo(1.0, 1.0, 1.0), M(0xe8e4d0), 0, 0, 0.2 + len / 2).add(new THREE.Object3D());
    else pumpkin(h, tube, 0.9, fireC).position.set(0, 0, 0.2 + len / 2);
    if (x < 0) {
      const m = new THREE.Object3D();
      m.position.set(0, 0, 0.7 + len / 2);
      tube.add(m);
      h.muzzles = [m];
    }
  }
  h.rightArm.rotation.set(-2.6, 0, 0.1);
  h.leftArm.rotation.set(level >= 2 ? -2.6 : -1.2, 0, level >= 2 ? -0.1 : -0.3);
  h.pose = { right: -2.6, left: level >= 2 ? -2.6 : -1.2, leftRecoil: 0 };
  h.flight = { color: fireC, size: 0.7 + level * 0.15, arc: 0.8, glowing: true };
  h.tracer = fireC;
  return h;
}

/**
 * Harvester (event). Lv 1 a plain scarecrow with a staff; Lv 2 thorny vines and crows; Lv 3 a
 * bigger hat and a basket of pumpkins; Lv 4 glowing green eyes and a sickle; Lv 5 frosty blue with
 * icicles and a tattered cloak; Lv 6 a giant reaper scythe, a lantern and a raven on its shoulder.
 */
export function makeHarvester(level) {
  const cold = level >= 4;
  const h = makeHumanoid({ skin: 0xd7b377, shirt: cold ? 0x37474f : 0x8d3b2a, pants: cold ? 0x263238 : 0x3e5a7a, arms: 0xd7b377, face: 'skull' });
  const { M } = h;
  const eyeC = [0xff9100, 0xff9100, 0xff9100, 0x76ff03, 0x80d8ff, 0x00e5ff][level];
  const eye = glow(h, eyeC);
  const straw = M(cold ? 0xb0bec5 : 0xe1c16e);
  part(h.head, boxGeo(1.3, 1.3, 1.3), M(cold ? 0x90a4ae : 0xc8a165), 0, 0.6, 0); // sack head
  for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.25 + (level >= 3 ? 0.1 : 0), 0.25, 0.05), eye, x, 0.75, 0.66);
  part(h.head, boxGeo(0.8, 0.12, 0.05), M(0x3e2723), 0, 0.35, 0.66);
  const brim = level >= 2 ? 2.8 : 2.2;
  part(h.head, boxGeo(brim, 0.15, brim), straw, 0, 1.25, 0);
  part(h.head, boxGeo(1.2, level >= 2 ? 1.0 : 0.6, 1.2), straw, 0, level >= 2 ? 1.8 : 1.6, 0);
  if (level >= 2) part(h.head, boxGeo(0.2, 0.9, 0.2), straw, 0.2, 2.6, 0).rotation.z = -0.5; // pointy tip
  if (!cold) boxRow(h.torso, 3, 0.7, boxGeo(0.12, 2.04, 1.04), M(0x5d1f15), 0, 0); // plaid
  for (const [x, y] of [[-0.9, -1.1], [0.9, -1.1]]) part(h.torso, boxGeo(0.3, 0.5, 0.3), straw, x, y, 0.3); // straw tufts
  if (level >= 1) {
    // Vines wrapping the body, and a crow on the hat
    for (const y of [0.6, -0.2]) part(h.torso, boxGeo(2.1, 0.15, 1.1), M(0x33691e), 0, y, 0).rotation.z = 0.25;
    part(h.head, boxGeo(0.4, 0.4, 0.7), M(0x111111), -0.7, 1.55, 0);
    part(h.head, boxGeo(0.12, 0.12, 0.3), M(0xffb300), -0.7, 1.55, 0.45);
  }
  if (level >= 2) {
    // Pumpkin basket at its feet
    part(h.body, boxGeo(1.4, 0.7, 1.4), M(0x8d6e63), 1.6, 0.35, 0.8);
    pumpkin(h, h.body, 0.7, eyeC).position.set(1.6, 1.0, 0.8);
  }
  if (cold) {
    part(h.torso, boxGeo(2.3, 3.6, 0.12), M(0x263238), 0, -0.7, -0.6); // tattered cloak
    boxRow(h.head, 5, 0.6, boxGeo(0.15, 0.6, 0.15), glow(h, 0xe1f5fe), 0.95, 1.2); // icicles off the brim
  }
  const staff = inHand(h);
  const sl = level >= 5 ? 5 : 3.6;
  part(staff, boxGeo(0.22, sl, 0.22), M(cold ? 0x455a64 : 0x5d4037), 0, -0.8 - (sl - 3.6) / 2, 0);
  const orb = part(staff, boxGeo(0.7, 0.7, 0.7), eye, 0, -2.8, 0);
  if (level >= 1) for (const side of [-1, 1]) part(staff, boxGeo(0.1, 0.9, 0.1), M(0x33691e), side * 0.3, -2.4, 0).rotation.z = side * 0.6; // thorns
  if (level >= 3) part(staff, boxGeo(0.12, 0.3, 1.6), glow(h, eyeC), 0, -3.2, 0.7); // sickle blade
  if (level >= 5) {
    part(staff, boxGeo(0.15, 0.6, 3.2), glow(h, 0x00e5ff), 0, -4.2, 1.5); // reaper scythe
    orb.scale.setScalar(1.5);
    const lantern = inHand(h, h.leftArm);
    part(lantern, boxGeo(0.7, 0.9, 0.7), glow(h, 0x00e5ff), 0, -0.6, 0);
    part(h.torso, boxGeo(0.5, 0.5, 0.8), M(0x111111), 1.3, 1.4, 0); // raven
  }
  setMuzzle(h, staff, 0, -2.8, 0);
  h.rightArm.rotation.set(-1.9, 0, 0.1);
  h.leftArm.rotation.set(level >= 5 ? -1.2 : -0.3, 0, -0.4);
  h.pose = { right: -1.9, left: level >= 5 ? -1.2 : -0.3, leftRecoil: 0 };
  h.flight = { color: eyeC, size: 0.5 + level * 0.12, arc: 0.5, glowing: true };
  h.tracer = eyeC;
  if (level >= 5) h.body.scale.setScalar(1.15);
  return h;
}

/**
 * Snowballer (event, new). Lv 1 a kid in a red beanie throwing snowballs; Lv 2 snow goggles,
 * mittens and a longer scarf; Lv 3 an ice-blue parka and a bucket of snowballs; Lv 4 the Snowball
 * Cannon: an arctic helmet, armor and a big snowball cannon with an ammo hopper.
 */
export function makeSnowballerFrost(level) {
  const cannon = level >= 3;
  const coat = [0x1e88e5, 0x1e88e5, 0x4dd0e1, 0xeceff1][level];
  const h = makeHumanoid({ skin: 0xffcc80, shirt: coat, pants: cannon ? 0x546e7a : 0x283593, arms: coat });
  const { M } = h;
  const white = M(0xfafafa);
  if (cannon) {
    helmet(h, 0x90a4ae, false);
    part(h.torso, boxGeo(2.15, 1.6, 1.2), M(0x78909c), 0, 0.2, 0);
  } else {
    part(h.head, boxGeo(1.35, 0.6, 1.35), M(0xe53935), 0, 1.3, 0); // beanie
    part(h.head, boxGeo(0.4, 0.4, 0.4), white, 0, 1.75, 0);
  }
  part(h.torso, boxGeo(2.4, 0.5, 1.3), M(0xe53935), 0, 1.0, 0); // scarf
  if (level >= 1) {
    part(h.torso, boxGeo(0.5, 1.6, 0.15), M(0xe53935), 0.5, 0, 0.6); // scarf tail
    part(h.head, boxGeo(1.25, 0.3, 0.1), M(0x263238), 0, 0.85, 0.63);
    for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.35, 0.22, 0.05), M(0x90caf9), x, 0.85, 0.69);
    for (const arm of [h.leftArm, h.rightArm]) part(arm, boxGeo(1.1, 0.6, 1.1), M(0xe53935), 0, -1.8, 0); // mittens
  }
  if (level >= 2) {
    part(h.body, boxGeo(1.2, 1.0, 1.2), M(0x90caf9), 1.7, 0.5, 0.6); // bucket of snowballs
    for (const [x, z] of [[1.5, 0.4], [1.9, 0.8], [1.7, 0.6]]) part(h.body, boxGeo(0.45, 0.45, 0.45), white, x, 1.2, z);
  }
  if (cannon) {
    const gun = holdLongGun(h, 2.6, M(0x37474f));
    part(gun, boxGeo(1.0, 0.7, 1.0), white, 0, -2.5, 0);
    part(gun, boxGeo(0.9, 0.9, 0.9), M(0x90caf9), 0, -0.6, -0.7); // hopper
    part(gun, boxGeo(0.7, 0.4, 0.7), white, 0, -0.6, -1.1);
    h.projectile = { color: 0xffffff, size: 0.8, arc: 2 };
  } else {
    const hand = inHand(h);
    part(hand, boxGeo(0.5 + level * 0.1, 0.5 + level * 0.1, 0.5 + level * 0.1), level >= 2 ? glow(h, 0xe1f5fe) : white, 0, -0.3, 0);
    setMuzzle(h, hand, 0, -0.3, 0);
    h.rightArm.rotation.set(-2.8, 0, 0.2);
    h.leftArm.rotation.set(-0.6, 0, -0.3);
    h.pose = { right: -2.8, left: -0.6, leftRecoil: 0 };
    h.swing = 1.9;
    h.projectile = { color: 0xffffff, size: 0.45 + level * 0.08, arc: 3 };
  }
  return h;
}

/**
 * Elementalist (event). Lv 1 a robe split red and blue with a gauntlet; Lv 2 shoulder plates and
 * belt pouches; Lv 3 fire and frost tanks; Lv 4 glowing exhausts and a bigger gauntlet; Lv 5 full
 * armor with a crested helmet and a floating halo of fire and ice.
 */
export function makeElementalist(level) {
  const armored = level >= 4;
  const h = makeHumanoid({ skin: 0xc68642, shirt: 0xb71c1c, pants: armored ? 0x37474f : 0x212121, arms: armored ? 0x546e7a : 0x1565c0 });
  const { M } = h;
  const fire = glow(h, 0xff6d00);
  const frost = glow(h, 0x40c4ff);
  part(h.torso, boxGeo(1.02, 2.02, 1.02), M(0x1565c0), -0.5, 0, 0);
  if (armored) {
    helmet(h, 0x455a64, false);
    for (let i = 0; i < 4; i++) part(h.head, boxGeo(0.2, 0.4, 0.3), i % 2 ? fire : frost, 0, 1.7, 0.45 - i * 0.3); // crest
    part(h.torso, boxGeo(2.15, 1.7, 1.2), M(0x546e7a), 0, 0.2, 0);
    part(h.torso, boxGeo(0.6, 0.6, 0.1), fire, 0.4, 0.4, 0.62);
    part(h.torso, boxGeo(0.6, 0.6, 0.1), frost, -0.4, 0.4, 0.62);
  } else part(h.head, boxGeo(1.4, 0.4, 1.4), M(0x212121), 0, 1.25, 0);
  part(h.head, boxGeo(1.2, 0.25, 0.1), glow(h, 0xffd740), 0, 0.85, 0.63);
  if (level >= 1) {
    part(h.torso, boxGeo(0.7, 0.5, 1.2), M(0xb71c1c), 1.25, 1.1, 0);
    part(h.torso, boxGeo(0.7, 0.5, 1.2), M(0x1565c0), -1.25, 1.1, 0);
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x5d4037), 0, -0.85, 0);
    boxRow(h.torso, 3, 0.55, boxGeo(0.4, 0.4, 0.3), M(0x795548), -0.85, 0.6); // pouches
  }
  if (level >= 2) {
    part(h.torso, boxGeo(0.65, 1.7, 0.65), fire, 0.45, 0.1, -0.85);
    part(h.torso, boxGeo(0.65, 1.7, 0.65), frost, -0.45, 0.1, -0.85);
  }
  if (level >= 3) {
    for (const [x, m] of [[0.45, fire], [-0.45, frost]]) {
      part(h.torso, boxGeo(0.35, 1.0, 0.35), M(0x424242), x, 1.4, -0.85);
      part(h.torso, boxGeo(0.38, 0.25, 0.38), m, x, 2.0, -0.85);
    }
  }
  if (armored) {
    // A halo of fire and frost crystals
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      part(h.body, boxGeo(0.35, 0.35, 0.35), i % 2 ? fire : frost, Math.cos(ang) * 1.3, 7.2, Math.sin(ang) * 1.3);
    }
  }
  const gl = 1.2 + level * 0.25;
  const gun = holdLongGun(h, gl, M(0x424242));
  const gs = 0.4 + level * 0.12;
  h.modeGlow = [part(gun, boxGeo(gs, gs, gs), glow(h, 0xff6d00), 0, -gl, 0)];
  if (level >= 3) h.modeGlow.push(part(gun, boxGeo(0.7, 0.2, 0.7), glow(h, 0xff6d00), 0, -gl * 0.5, 0));
  h.tracer = 0xff6d00;
  h.tracerWidth = 0.15 + level * 0.05;
  h.modeTracer = { fire: 0xff6d00, frost: 0x40c4ff };
  return h;
}

/**
 * Firework Technician (event). Lv 1 a hard hat and three rockets on its back; Lv 2 goggles and five
 * rockets; Lv 3 a launch rack beside it; Lv 4 a second rack and a crate of shells; Lv 5 The Finale:
 * a launch console, a giant rocket and lights everywhere.
 */
export function makeFireworkTech(level) {
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: level >= 4 ? 0x212121 : 0xff7043, pants: 0x1565c0, arms: level >= 4 ? 0x212121 : 0xff7043 });
  const { M } = h;
  const colors = [0xff1744, 0xffea00, 0x2979ff, 0x00e676, 0xd500f9];
  part(h.head, boxGeo(1.45, 0.45, 1.45), M(level >= 4 ? 0xffc107 : 0xffd600), 0, 1.25, 0);
  part(h.head, boxGeo(1.5, 0.1, 0.4), M(0xffd600), 0, 1.05, 0.62);
  part(h.torso, boxGeo(1.4, 1.2, 1.04), M(0x1565c0), 0, -0.4, 0);
  if (level >= 1) {
    part(h.head, boxGeo(1.25, 0.3, 0.1), M(0x263238), 0, 0.85, 0.63);
    for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.35, 0.22, 0.05), glow(h, 0xffab00), x, 0.85, 0.69);
  }
  const n = level >= 1 ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.42;
    part(h.torso, boxGeo(0.3, 1.4, 0.3), M(colors[i]), x, 1.2, -0.9);
    part(h.torso, boxGeo(0.2, 0.35, 0.2), M(0xfafafa), x, 2.05, -0.9);
  }
  // Launch racks on the ground beside it
  const rack = (x, z, tubes, big) => {
    part(h.body, boxGeo(1.6, 0.5, 1.2), M(0x5d4037), x, 0.25, z);
    for (let i = 0; i < tubes; i++) {
      const tx = x + ((i % 3) - 1) * 0.45;
      const tz = z + (Math.floor(i / 3) - 0.5) * 0.45;
      part(h.body, boxGeo(0.3, big ? 2.2 : 1.6, 0.3), M(colors[i % 5]), tx, big ? 1.6 : 1.3, tz).rotation.x = -0.2;
    }
  };
  if (level >= 2) rack(1.9, 0.6, 6, level >= 3);
  if (level >= 3) {
    rack(-1.9, 0.6, 6, true);
    part(h.body, boxGeo(1.2, 0.9, 0.9), M(0x8d6e63), 1.8, 0.45, -1.4); // crate of shells
    boxRow(h.body, 3, 0.35, boxGeo(0.25, 0.25, 0.25), M(0x212121), 1.0, -1.4);
  }
  if (level >= 4) {
    part(h.body, boxGeo(1.4, 1.0, 0.8), M(0x37474f), 0, 0.5, 1.8); // launch console
    boxRow(h.body, 4, 0.3, boxGeo(0.18, 0.12, 0.18), M(0x111111), 1.05, 1.8, colors.map((c) => glow(h, c)));
    part(h.body, boxGeo(0.9, 4.5, 0.9), M(0xff1744), -0.2, 2.6, -2.0); // the giant rocket
    part(h.body, boxGeo(0.6, 0.8, 0.6), M(0xfafafa), -0.2, 5.2, -2.0);
    for (const side of [-1, 1]) part(h.body, boxGeo(0.15, 1.0, 0.8), M(0xffc107), -0.2 + side * 0.5, 0.8, -2.0);
  }
  const hand = inHand(h);
  part(hand, boxGeo(0.25, 1.0, 0.25), M(0x5d4037), 0, -0.4, 0);
  part(hand, boxGeo(0.2 + level * 0.06, 0.2 + level * 0.06, 0.2 + level * 0.06), glow(h, 0xffab00), 0, -0.95, 0);
  setMuzzle(h, hand, 0, -1, 0);
  h.rightArm.rotation.set(-1.3, 0, 0.1);
  h.leftArm.rotation.set(-0.3, 0, -0.2);
  h.pose = { right: -1.3, left: -0.3, leftRecoil: 0 };
  return h;
}

/**
 * Biologist (event). Lv 1 a lab coat, a flask and a sunflower pot; Lv 2 an ivy pot and a clipboard;
 * Lv 3 goggles and a backpack sprayer; Lv 4 a flower crown and a nightshade pot; Lv 5 Botanical
 * Berserker: wrapped in vines, a huge flower on its back and glowing green.
 */
export function makeBiologist(level) {
  const berserk = level >= 4;
  const h = makeHumanoid({ skin: 0xffe0bd, shirt: berserk ? 0xc5e1a5 : 0xfafafa, pants: berserk ? 0x33691e : 0x455a64, arms: berserk ? 0xc5e1a5 : 0xfafafa });
  const { M } = h;
  const leaf = M(0x43a047);
  part(h.head, boxGeo(1.35, 0.35, 1.35), M(0x6d4c41), 0, 1.25, 0);
  part(h.torso, boxGeo(2.1, 1.4, 1.1), M(berserk ? 0xaed581 : 0xf5f5f5), 0, -1.4, 0); // coat tails
  const pot = (x, z, kind) => {
    part(h.body, boxGeo(0.8, 0.6, 0.8), M(0xa1887f), x, 0.3, z);
    part(h.body, boxGeo(0.25, 0.9, 0.25), leaf, x, 1.05, z);
    if (kind === 'sun') {
      part(h.body, boxGeo(0.8, 0.8, 0.15), M(0xffd600), x, 1.7, z);
      part(h.body, boxGeo(0.4, 0.4, 0.2), M(0x5d4037), x, 1.7, z);
    } else if (kind === 'ivy') part(h.body, boxGeo(0.5, 0.5, 0.5), glow(h, 0x76ff03), x, 1.6, z);
    else part(h.body, boxGeo(0.6, 0.3, 0.6), glow(h, 0xd500f9), x, 1.6, z);
  };
  pot(1.6, 1.2, 'sun');
  if (level >= 1) {
    pot(-1.6, 1.2, 'ivy');
    part(h.leftArm, boxGeo(0.15, 1.0, 0.8), M(0x8d6e63), 0.6, -1.6, 0.2); // clipboard
  }
  if (level >= 2) {
    part(h.head, boxGeo(1.25, 0.3, 0.1), M(0x263238), 0, 0.85, 0.63);
    for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.35, 0.22, 0.05), glow(h, 0x76ff03), x, 0.85, 0.69);
    part(h.torso, boxGeo(1.2, 1.6, 0.8), M(0x78909c), 0, 0.1, -0.9); // sprayer tank
    part(h.torso, boxGeo(1.25, 0.3, 0.85), glow(h, 0x76ff03), 0, 0.4, -0.9);
  }
  if (level >= 3) {
    pot(1.6, -1.2, 'night');
    for (let i = 0; i < 5; i++) part(h.head, boxGeo(0.3, 0.3, 0.3), M([0xffd600, 0xff4081, 0xffffff, 0xff9100, 0xd500f9][i]), (i - 2) * 0.32, 1.5, 0.3); // flower crown
  }
  if (berserk) {
    pot(-1.6, -1.2, 'sun');
    for (const side of [-1, 1]) part(h.torso, boxGeo(0.25, 2.4, 0.25), leaf, side * 0.7, 0, 0.55).rotation.z = side * 0.5; // vines
    for (const arm of [h.leftArm, h.rightArm]) part(arm, boxGeo(1.05, 0.25, 1.05), leaf, 0, -1, 0);
    // Huge flower on its back
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      part(h.torso, boxGeo(0.7, 0.7, 0.15), M(0xffd600), Math.cos(ang) * 1.1, 1.6 + Math.sin(ang) * 1.1, -1.4);
    }
    part(h.torso, boxGeo(1.0, 1.0, 0.25), M(0x5d4037), 0, 1.6, -1.4);
  }
  const hand = inHand(h);
  const fs = 0.5 + level * 0.1;
  part(hand, boxGeo(fs, fs * 1.4, fs), glow(h, berserk ? 0xb2ff59 : 0x76ff03), 0, -0.4, 0);
  part(hand, boxGeo(0.2, 0.3, 0.2), M(0xe0f2f1), 0, 0.05, 0);
  setMuzzle(h, hand, 0, -0.4, 0);
  h.rightArm.rotation.set(-1.4, 0, 0.1);
  h.leftArm.rotation.set(level >= 1 ? -1.0 : -0.3, 0, -0.2);
  h.pose = { right: -1.4, left: level >= 1 ? -1.0 : -0.3, leftRecoil: 0 };
  return h;
}

/**
 * Warlock (event). Lv 1 a grey hooded robe and a plain sword; Lv 2 the Acolyte: a purple sash and
 * a floating spellbook; Lv 3 Forbidden Arts: glowing runes and orbiting orbs; Lv 4 Pact of the
 * Blade: a glowing blade; Lv 5 Eldritch Knight: plate armor and a horned helm; Lv 6 Abyss Walker:
 * black and violet, wings and a huge abyssal greatsword.
 */
export function makeWarlock(level) {
  const abyss = level >= 5;
  const knight = level >= 4;
  const magic = [0x40c4ff, 0x7c4dff, 0x7c4dff, 0xaa00ff, 0xaa00ff, 0xd500f9][level];
  const robe = [0x616161, 0x37474f, 0x263238, 0x1a1a2e, 0x1a1a2e, 0x0b0014][level];
  const h = makeHumanoid({ skin: 0xc8b6a6, shirt: robe, pants: 0x111111, arms: knight ? 0x546e7a : robe });
  const { M } = h;
  const rune = glow(h, magic);
  if (knight) {
    part(h.head, boxGeo(1.45, 1.4, 1.45), M(abyss ? 0x1a0033 : 0x455a64), 0, 0.65, 0); // helm
    part(h.head, boxGeo(1.0, 0.15, 0.1), rune, 0, 0.75, 0.74);
    for (const side of [-1, 1]) part(h.head, boxGeo(0.3, 1.2, 0.3), M(abyss ? 0x111111 : 0xd7ccc8), side * 0.8, 1.5, 0).rotation.z = side * -0.4; // horns
    part(h.torso, boxGeo(2.15, 1.7, 1.2), M(abyss ? 0x1a0033 : 0x546e7a), 0, 0.2, 0);
    for (const side of [-1, 1]) part(h.torso, boxGeo(0.8, 0.6, 1.3), M(abyss ? 0x311b92 : 0x78909c), side * 1.3, 1.1, 0);
  } else {
    part(h.head, boxGeo(1.45, 1.4, 1.35), M(robe), 0, 0.68, -0.08); // hood
    for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.22, 0.12, 0.05), rune, x, 0.75, 0.62);
  }
  part(h.torso, boxGeo(2.2, 3.2 + level * 0.15, 0.12), M(abyss ? 0x311b92 : robe), 0, -0.6, -0.6); // cloak
  if (level >= 1) {
    part(h.torso, boxGeo(2.6, 0.3, 1.15), M(0x6a1b9a), 0, 0.2, 0).rotation.z = 0.5; // sash
    const book = part(h.body, boxGeo(0.9, 0.2, 0.7), M(0x4a148c), 1.6, 5.4, 0.6); // floating spellbook
    part(book, boxGeo(0.5, 0.25, 0.4), rune, 0, 0.05, 0);
  }
  if (level >= 2) {
    boxRow(h.torso, 3, 0.5, boxGeo(0.3, 0.3, 0.06), rune, -0.3, 0.6); // runes
    for (let i = 0; i < (abyss ? 5 : 3); i++) {
      const ang = (i / (abyss ? 5 : 3)) * Math.PI * 2;
      part(h.body, boxGeo(0.35, 0.35, 0.35), rune, Math.cos(ang) * 1.9, 3.5 + (i % 2) * 0.8, Math.sin(ang) * 1.9); // orbs
    }
  }
  if (abyss) for (const side of [-1, 1]) part(h.torso, boxGeo(2.6, 1.8, 0.12), M(0x1a0033), side * 1.7, 0.9, -0.75).rotation.z = side * 0.45; // wings
  const sword = inHand(h);
  const bl = [2.0, 2.2, 2.4, 2.8, 3.2, 4.0][level];
  const bw = abyss ? 0.6 : 0.3 + level * 0.04;
  part(sword, boxGeo(0.25, 0.5, 0.25), M(0x4e342e), 0, -0.2, 0);
  part(sword, boxGeo(0.9 + level * 0.1, 0.12, 0.25), M(knight ? 0xffc107 : 0x9e9e9e), 0, -0.45, 0);
  part(sword, boxGeo(bw, bl, 0.12), level >= 3 ? rune : M(0xb0bec5), 0, -0.5 - bl / 2, 0);
  const cast = inHand(h, h.leftArm);
  part(cast, boxGeo(0.4 + level * 0.08, 0.4 + level * 0.08, 0.4 + level * 0.08), rune, 0, -0.2, 0);
  setMuzzle(h, cast, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  h.leftArm.rotation.set(-1.5, 0, -0.2);
  h.pose = { right: -2.4, left: -1.5, leftRecoil: 0 };
  h.swing = 2;
  h.tracer = magic;
  h.tracerWidth = 0.2 + level * 0.06;
  if (abyss) h.body.scale.setScalar(1.15);
  return h;
}

/**
 * Spotlight Tech (event, cliff). Lv 1 a stagehand with a headset and a small lamp; Lv 2 a tool belt
 * and cables; Lv 3 a safety hat (worn wrong) and a bigger lamp on a taller stand; Lv 4 a stage truss
 * with a second light; Lv 5 sunglasses, a gold lamp and a full lighting rig.
 */
export function makeSpotlightTech(level) {
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: 0x212121, pants: 0x212121, arms: 0x212121 });
  const { M } = h;
  const metal = M(0x424242);
  part(h.head, boxGeo(1.4, 0.15, 0.2), metal, 0, 1.25, 0);
  for (const x of [-0.68, 0.68]) part(h.head, boxGeo(0.2, 0.5, 0.5), metal, x, 0.65, 0);
  part(h.head, boxGeo(0.1, 0.1, 0.6), metal, -0.6, 0.4, 0.4);
  part(h.torso, boxGeo(0.8, 0.3, 0.06), M(0xffeb3b), 0, 0.5, 0.52); // CREW badge
  if (level >= 1) {
    part(h.torso, boxGeo(2.1, 0.35, 1.15), M(0x5d4037), 0, -0.85, 0); // tool belt
    boxRow(h.torso, 3, 0.55, boxGeo(0.3, 0.5, 0.3), M(0x9e9e9e), -1.1, 0.6);
    part(h.body, boxGeo(0.2, 0.2, 3.0), M(0x111111), -1.2, 0.1, 0.6); // cables on the floor
  }
  if (level >= 2) part(h.head, boxGeo(1.45, 0.45, 1.45), M(0xffa000), 0, 1.5, 0).rotation.z = 0.35; // crooked hard hat
  if (level >= 4) {
    part(h.head, boxGeo(1.25, 0.28, 0.1), M(0x111111), 0, 0.85, 0.63); // shades
    part(h.torso, boxGeo(2.04, 2.04, 1.04), M(0x311b92), 0, 0, 0); // crew jacket
    part(h.torso, boxGeo(0.8, 0.3, 0.06), M(0xffc107), 0, 0.5, 0.54);
  }
  const standH = level >= 2 ? 5.0 : 4.0;
  part(h.body, boxGeo(0.25, standH, 0.25), metal, -2.2, standH / 2, 0);
  for (const side of [-1, 1]) part(h.body, boxGeo(0.15, 0.15, 1.6), metal, -2.2 + side * 0.4, 0.1, 0).rotation.y = side * 0.6; // tripod feet
  if (level >= 3) {
    // Stage truss over its head with a second light
    for (const x of [-2.2, 2.2]) part(h.body, boxGeo(0.3, 6.5, 0.3), metal, x, 3.25, -1.5);
    part(h.body, boxGeo(4.7, 0.3, 0.3), metal, 0, 6.5, -1.5);
    part(h.body, boxGeo(0.9, 0.9, 1.2), M(0x37474f), 1.2, 5.9, -1.3);
    part(h.body, boxGeo(0.7, 0.7, 0.1), glow(h, 0xfff8e1), 1.2, 5.9, -0.68);
  }
  if (level >= 4) for (const x of [-1.4, -0.4, 0.6]) part(h.body, boxGeo(0.5, 0.5, 0.5), glow(h, [0xff1744, 0x2979ff, 0x00e676][Math.round(x + 1.4)] ?? 0xffffff), x, 6.1, -1.3);
  const lamp = new THREE.Group();
  lamp.position.set(-2.2, standH + 0.2, 0);
  h.body.add(lamp);
  const ls = [1.2, 1.4, 1.7, 1.9, 2.2][level];
  part(lamp, boxGeo(ls, ls, ls * 1.4), M(level >= 4 ? 0xffc107 : 0x37474f), 0, 0, 0);
  part(lamp, boxGeo(ls * 0.85, ls * 0.85, 0.1), glow(h, 0xfff8e1), 0, 0, ls * 0.72);
  if (level >= 2) for (const side of [-1, 1]) part(lamp, boxGeo(0.1, ls, ls * 0.6), M(0x212121), side * ls * 0.55, 0, ls * 0.8); // barn doors
  const m = new THREE.Object3D();
  m.position.set(0, 0, ls * 0.8);
  lamp.add(m);
  h.muzzles = [m];
  h.lamp = lamp;
  h.rightArm.rotation.set(-1.4, 0, 0.5);
  h.leftArm.rotation.set(-0.3, 0, -0.2);
  h.pose = { right: -1.4, left: -0.3, leftRecoil: 0 };
  h.spot = [0xfff8e1, 0xffe0b2, 0xffcc80, 0xffb74d, 0xffd740][level];
  return h;
}

/**
 * Star Cannon (event, cliff). Lv 1 a steel cannon on a turntable; Lv 2 solar battery packs and
 * panels; Lv 3 the Eclipsed Crew: a dark barrel with a sun-dish; Lv 4 Lunar Charges: deep blue with a
 * crescent moon and violet rings; Lv 5 Shot of the Century: a colossal gold barrel with capacitors
 * and a crown of stars.
 */
export function makeStarCannon(level) {
  const u = makeThing();
  const { M } = u;
  const steel = M([0x78909c, 0x607d8b, 0x263238, 0x1a237e, 0x0d0d2b][level]);
  const gold = M(0xffc107);
  const starC = [0xffd740, 0xffab00, 0xff6d00, 0xb388ff, 0xffffff][level];
  const star = glow(u, starC);
  part(u.body, boxGeo(4.6, 0.6, 4.6), M(0x37474f), 0, 0.3, 0);
  part(u.body, boxGeo(3.2 + level * 0.2, 1.0, 3.2 + level * 0.2), steel, 0, 1.1, 0);
  const len = 4 + level * 0.9;
  const w = 1.4 + level * 0.25;
  part(u.body, boxGeo(w, w, len), level >= 4 ? gold : steel, 0, 2.6, len / 2 - 1);
  const rings = 2 + level;
  for (let i = 0; i < rings; i++) part(u.body, boxGeo(w + 0.4, w + 0.4, 0.3), i === rings - 1 || i % 2 ? star : gold, 0, 2.6, 0.2 + i * (len / rings));
  part(u.body, boxGeo(2.2, 0.4, 0.4), star, 0, 4.0, -0.8); // star emblem
  part(u.body, boxGeo(0.4, 2.2, 0.4), star, 0, 4.0, -0.8);
  if (level >= 1) {
    for (const side of [-1, 1]) {
      part(u.body, boxGeo(0.8, 1.2, 1.4), M(0x33691e), side * 1.9, 1.2, -1.2); // battery packs
      part(u.body, boxGeo(0.82, 0.3, 1.42), glow(u, 0x76ff03), side * 1.9, 1.6, -1.2);
    }
    part(u.body, boxGeo(2.4, 0.1, 1.4), M(0x1a237e), 0, 3.0, -1.6).rotation.x = -0.6; // solar panel
  }
  if (level >= 2) {
    const dish = part(u.body, boxGeo(2.6, 2.6, 0.2), M(0x212121), 0, 4.6, -2.0);
    part(dish, boxGeo(1.6, 1.6, 0.1), glow(u, 0xff6d00), 0, 0, 0.12); // eclipse glow
    part(dish, boxGeo(1.3, 1.3, 0.12), M(0x111111), 0, 0, 0.18);
  }
  if (level >= 3) {
    // Crescent moon
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI / 2 + (i / 4) * Math.PI;
      part(u.body, boxGeo(0.5, 0.5, 0.3), glow(u, 0xe1f5fe), Math.cos(ang) * 1.2 + 0.4, 6.2 + Math.sin(ang) * 1.2, -2.0);
    }
  }
  if (level >= 4) {
    for (const side of [-1, 1]) {
      part(u.body, boxGeo(0.8, 3.2, 2.6), gold, side * 2.0, 2.6, -0.2); // capacitors
      boxRow(u.body, 3, 0.8, boxGeo(0.2, 0.2, 0.2), star, 4.3, -0.2);
    }
    for (let i = 0; i < 5; i++) part(u.body, boxGeo(0.45, 0.45, 0.45), star, (i - 2) * 0.7, 3.3 + w / 2 + (i % 2) * 0.4, 0.4); // crown of stars
  }
  gunMuzzle(u, u.body, 0, 2.6, len - 0.9);
  u.tracer = starC;
  u.tracerWidth = 0.9 + level * 0.3;
  return u;
}

/**
 * Elf Camp elves (smaller, with pointy ears and a striped hat) and the Biologist's plants and the
 * Elementalist's Ice Turret, as units: elfbasic, elfsnow, elfcannon, elfbomb, elfguard, elfguard2,
 * elfgunner, elfgift, elfripped, plantsun, plantivy, plantnight, iceturret.
 */
export function makeCampUnit(model) {
  if (model.startsWith('plant') || model === 'iceturret' || model === 'iceshard') return makePlantUnit(model);
  if (model === 'bubblebuddy') return makeBubbleBuddy();
  const ripped = model === 'elfripped';
  const tunic = { elfguard: 0x1b5e20, elfguard2: 0x0d3b10, elfgunner: 0x33691e, elfbomb: 0xb71c1c, elfgift: 0xc62828 }[model] ?? 0x2e7d32;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: tunic, pants: 0xc62828, arms: ripped ? 0xf1c27d : tunic });
  const { M } = h;
  const white = M(0xfafafa);
  for (const x of [-0.7, 0.7]) part(h.head, boxGeo(0.15, 0.5, 0.25), M(0xf1c27d), x, 0.7, 0).rotation.z = x > 0 ? -0.5 : 0.5; // ears
  part(h.head, boxGeo(1.3, 0.3, 1.3), white, 0, 1.25, 0);
  part(h.head, boxGeo(0.9, 0.7, 0.9), M(0x2e7d32), 0, 1.7, -0.1);
  const hand = inHand(h);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-0.4, 0, -0.2);
  h.tracer = 0xffffff;
  h.size = 0.75;
  if (model === 'elfbasic') {
    h.rightArm.rotation.set(-0.4, 0, 0.1);
  } else if (model === 'elfsnow') {
    part(hand, boxGeo(0.5, 0.5, 0.5), white, 0, -0.3, 0);
    h.projectile = { color: 0xffffff, size: 0.4, arc: 2 };
  } else if (model === 'elfcannon' || model === 'elfgunner') {
    part(hand, boxGeo(0.35, 1.6, 0.4), M(model === 'elfgunner' ? 0x212121 : 0x5d4037), 0, -0.8, 0);
    if (model === 'elfcannon') part(hand, boxGeo(0.5, 0.4, 0.5), M(0x37474f), 0, -1.6, 0);
    else part(h.head, boxGeo(1.25, 0.25, 0.1), M(0x111111), 0, 0.85, 0.62); // shades
    h.tracer = 0xffd54f;
    setMuzzle(h, hand, 0, -1.6, 0);
    return h;
  } else if (model === 'elfbomb') {
    present(h, hand, 0xffd54f, 0xc62828, 0.7).position.y = -0.3;
    part(hand, boxGeo(0.08, 0.4, 0.08), glow(h, 0xff9100), 0, 0.2, 0);
  } else if (model === 'elfguard' || model === 'elfguard2') {
    part(hand, boxGeo(0.25, 1.8, 0.12), model === 'elfguard2' ? glow(h, 0xff1744) : M(0xd7a86e), 0, -1, 0); // cookie-cutter sword
    if (model === 'elfguard2') part(h.torso, boxGeo(2.1, 1.6, 1.15), M(0x78909c), 0, 0.2, 0); // armor
    h.size = 0.85;
  } else if (model === 'elfgift') {
    // Gift Bomber: rides a flying present sled
    present(h, h.body, 0xc62828, 0xffd54f, 1.6).position.set(0, 0.6, 0);
    part(h.body, boxGeo(2.2, 0.2, 3.0), M(0x8d6e63), 0, -0.2, 0);
    h.size = 0.9;
    h.projectile = { color: 0x43a047, size: 0.6, arc: 3 };
  } else if (ripped) {
    for (const side of [-1, 1]) part(h.torso, boxGeo(0.9, 0.9, 1.1), M(0xe0b070), side * 1.3, 0.9, 0); // huge shoulders
    part(h.torso, boxGeo(2.1, 0.4, 1.1), M(0x111111), 0, -0.6, 0);
    present(h, hand, 0x212121, 0xff1744, 1).position.y = -0.4;
    h.size = 1.5;
    h.projectile = { color: 0x212121, size: 0.9, arc: 4 };
  }
  setMuzzle(h, hand, 0, -0.4, 0);
  return h;
}

export function makePlantUnit(model) {
  const t = makeThing();
  const { M } = t;
  const stem = M(0x33691e);
  // Plants have no legs; the unit view still swings these when walking.
  t.leftLeg = new THREE.Object3D();
  t.rightLeg = new THREE.Object3D();
  t.root.add(t.leftLeg, t.rightLeg);
  const head = new THREE.Group();
  t.body.add(head);
  if (model === 'iceshard') {
    // Ice Breaker Ice Shard: a jagged block of glowing ice.
    const ice = glow(t, 0x80d8ff);
    part(t.body, boxGeo(2.6, 0.6, 2.6), M(0xb3e5fc), 0, 0.3, 0);
    part(t.body, boxGeo(1.6, 3.4, 1.6), ice, 0, 1.9, 0).rotation.set(0.15, 0.4, 0.1);
    part(t.body, boxGeo(0.9, 2.2, 0.9), M(0xe1f5fe), 0.9, 1.2, 0.4).rotation.set(0, 0.2, -0.35);
    part(t.body, boxGeo(0.8, 1.8, 0.8), M(0xe1f5fe), -0.9, 1.0, -0.3).rotation.set(0.2, 0, 0.4);
    head.position.y = 3.2;
    t.tracer = 0x80d8ff;
    t.size = 1.5;
  } else if (model === 'iceturret') {
    const ice = glow(t, 0x80d8ff);
    part(t.body, boxGeo(2, 0.8, 2), M(0xb3e5fc), 0, 0.4, 0);
    part(t.body, boxGeo(1.2, 1.6, 1.2), ice, 0, 1.6, 0);
    head.position.y = 2.6;
    part(head, boxGeo(0.5, 0.5, 1.8), M(0xe1f5fe), 0, 0, 0.8);
    t.tracer = 0x80d8ff;
    t.size = 1.4;
  } else if (model === 'plantsun') {
    part(t.body, boxGeo(0.35, 2.4, 0.35), stem, 0, 1.2, 0);
    for (const side of [-1, 1]) part(t.body, boxGeo(0.8, 0.12, 0.4), M(0x558b2f), side * 0.45, 1.0, 0).rotation.z = side * 0.4;
    head.position.y = 2.8;
    part(head, boxGeo(1.8, 1.8, 0.25), M(0xffd600), 0, 0, 0);
    part(head, boxGeo(1.0, 1.0, 0.3), M(0x5d4037), 0, 0, 0.05);
    t.tracer = 0xffee58;
    t.size = 1;
  } else if (model === 'plantivy') {
    const leaf = M(0x2e7d32);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      part(t.body, boxGeo(0.3, 1.6 + (i % 2) * 0.6, 0.3), leaf, Math.cos(a) * 0.5, 0.9, Math.sin(a) * 0.5).rotation.z = Math.cos(a) * 0.3;
    }
    head.position.y = 2.0;
    part(head, boxGeo(0.8, 0.8, 0.8), glow(t, 0x76ff03), 0, 0, 0);
    t.tracer = 0x76ff03;
    t.size = 1;
  } else {
    // Nightshade: a dark purple bloom
    part(t.body, boxGeo(0.35, 2.6, 0.35), M(0x1a237e), 0, 1.3, 0);
    head.position.y = 3.0;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      part(head, boxGeo(0.7, 0.2, 0.7), M(0x4a148c), Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55);
    }
    part(head, boxGeo(0.5, 0.5, 0.5), glow(t, 0xd500f9), 0, 0.1, 0);
    t.tracer = 0xd500f9;
    t.size = 1.1;
  }
  const m = new THREE.Object3D();
  m.position.set(0, 0, model === 'iceturret' ? 1.8 : 0.3);
  head.add(m);
  t.muzzles = [m];
  t.static = false;
  return t;
}

/**
 * Artillery (alternate Mortar with two paths): a gunner beside a wheeled field howitzer. Top path:
 * a crew cap at Lv 1, a longer M119 barrel at Lv 2, a shell rack at Lv 3, fat shells at Lv 4 and
 * three barrels at Lv 5. Bottom path: HE shells at Lv 1, a heavier barrel at Lv 2, the big M198 at
 * Lv 3, an even longer barrel at Lv 4, and the grey Skyhawk with a radar dish at Lv 5.
 */
export function makeArtillery(level, bottom = false) {
  const sky = bottom && level >= 5;
  const coat = sky ? 0x37474f : 0x6b7d3a;
  const h = makeHumanoid({ skin: 0xc68642, shirt: coat, pants: sky ? 0x263238 : 0x4b5320, arms: coat, face: 'soldier' });
  const { M } = h;
  const shard = glow(h, 0xb388ff);
  helmet(h, sky ? 0x455a64 : 0x556b2f);
  part(h.head, boxGeo(0.3, 0.3, 0.06), shard, 0, 1.32, 0.74); // Dimension Shard emblem
  if (level >= 1) for (const x of [-0.7, 0.7]) part(h.head, boxGeo(0.25, 0.55, 0.55), M(0xff8f00), x, 0.6, 0); // ear protectors
  // The gun: a carriage on two wheels with a long barrel pointing up and forward.
  const gun = new THREE.Group();
  gun.position.set(1.6, 0, 2.2);
  h.root.add(gun);
  const steel = M(sky ? 0x78909c : 0x4a5a3a);
  const big = bottom ? [1, 1, 1.1, 1.3, 1.45, 1.6][level] : level >= 2 ? 1.1 : 1;
  gun.scale.setScalar(big);
  part(gun, boxGeo(1.6, 0.6, 1.4), steel, 0, 1.0, 0); // carriage
  for (const side of [-1, 1]) {
    part(gun, boxGeo(0.3, 1.4, 1.4), M(0x212121), side * 1.0, 0.7, 0); // wheels
    const trail = part(gun, boxGeo(0.25, 0.25, 2.6), steel, side * 0.45, 0.4, -1.4); // trail legs
    trail.rotation.y = side * 0.2;
  }
  part(gun, boxGeo(1.2, 1.0, 0.15), steel, 0, 1.6, 0.7); // gun shield
  const n = !bottom && level >= 5 ? 3 : 1;
  const len = bottom ? 4.2 : level >= 2 ? 4.4 : 3.8;
  const w = bottom && level >= 3 ? 0.6 : 0.45;
  const barrels = new THREE.Group();
  barrels.position.set(0, 1.4, 0.2);
  barrels.rotation.x = 0.9; // tilted up toward the sky
  gun.add(barrels);
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.55;
    part(barrels, boxGeo(w, len, w), M(sky ? 0x546e7a : 0x3e4a2a), x, len / 2, 0);
    part(barrels, boxGeo(w + 0.2, 0.35, w + 0.2), M(0x212121), x, len, 0); // muzzle brake
  }
  if (bottom && level >= 3) part(barrels, boxGeo(w + 0.25, 1.2, w + 0.25), steel, 0, 0.8, 0); // recoil cylinders
  setMuzzle(h, barrels, 0, len + 0.3, 0);
  if (sky) {
    // Skyhawk: a radar dish on a mast
    part(gun, boxGeo(0.15, 1.6, 0.15), M(0x263238), -0.7, 2.2, -0.6);
    part(gun, boxGeo(1.2, 1.2, 0.12), M(0xcfd8dc), -0.7, 3.1, -0.6).rotation.x = -0.5;
    part(gun, boxGeo(0.25, 0.25, 0.25), glow(h, 0xff1744), -0.7, 3.1, -0.45);
  }
  const shellM = bottom && level >= 1 ? M(0x8d6e63) : M(0x37474f);
  if ((!bottom && level >= 3) || (bottom && level >= 2)) {
    // A rack of ready shells
    part(h.root, boxGeo(1.6, 0.2, 1.0), M(0x5d4037), -2.0, 0.1, 0.4);
    for (const x of [-2.5, -2.0, -1.5]) for (const z of [0.15, 0.65]) part(h.root, boxGeo(0.35, 1.1, 0.35), shellM, x, 0.75, z);
  }
  const fat = (!bottom && level >= 4) || sky;
  const shell = part(h.rightArm, boxGeo(fat ? 0.55 : 0.4, 0.9, fat ? 0.55 : 0.4), shellM, 0.6, -2.1, 0);
  shell.rotation.z = 0.3;
  h.rightArm.rotation.set(-1.0, 0, 0.3);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -1.0, left: -1.0, leftRecoil: 0 };
  h.recoilScale = 0.4;
  h.projectile = sky ? { color: 0xff6d00, size: 1.1, arc: 26, glowing: true } : { color: 0x37474f, size: fat ? 0.9 : 0.7, arc: 24 };
  return h;
}

/**
 * Shock Trooper (alternate Electroshocker form): a soldier with a lightning gun. Lv 2 a coil
 * backpack, Lv 3 the Tesla Tower: a copper coil tower beside them, Lv 4 a solar radar dish on
 * it, Lv 5 a huge crackling coil.
 */
export function makeShockTrooper(level) {
  const bolt = level >= 5 ? 0xe1f5fe : 0x82b1ff;
  const shirt = level >= 3 ? 0x283593 : 0x4e5b31;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x263238, arms: shirt, face: 'soldier' });
  const { M } = h;
  helmet(h, level >= 3 ? 0x1a237e : 0x3e4a2a);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.45, 0.52); // Dimension Shard
  part(h.head, boxGeo(1.25, 0.3, 0.12), M(0x263238), 0, 0.8, 0.63);
  part(h.head, boxGeo(1.0, 0.18, 0.06), glow(h, bolt), 0, 0.8, 0.7); // visor
  if (level >= 2) {
    part(h.torso, boxGeo(1.0, 1.8, 0.7), M(0x455a64), 0, 0.3, -0.85); // coil pack
    for (let i = 0; i < 3; i++) part(h.torso, boxGeo(1.2, 0.15, 0.85), M(0xb87333), 0, -0.3 + i * 0.6, -0.85);
  }
  const gun = holdLongGun(h, level >= 1 ? 1.7 : 1.4, M(0x37474f));
  part(gun, boxGeo(0.55, 0.55, 0.55), M(0xb87333), 0, -0.5, 0); // copper coil
  part(gun, boxGeo(0.4, 0.3, 0.4), glow(h, bolt), 0, level >= 1 ? -1.7 : -1.4, 0);
  if (level >= 3) {
    // Tesla Tower: a copper coil on a pylon beside the trooper
    const tall = level >= 5 ? 6.2 : level >= 4 ? 5.4 : 4.6;
    part(h.root, boxGeo(1.6, 0.4, 1.6), M(0x424242), -2.2, 0.2, -0.4);
    part(h.root, boxGeo(0.6, tall, 0.6), M(0x546e7a), -2.2, tall / 2, -0.4);
    const rings = Math.floor(tall / 0.8);
    for (let i = 0; i < rings; i++) part(h.root, boxGeo(1.0, 0.18, 1.0), M(0xb87333), -2.2, 0.8 + i * 0.7, -0.4);
    part(h.root, boxGeo(1.3, 0.6, 1.3), glow(h, bolt), -2.2, tall + 0.3, -0.4); // the coil top
    if (level >= 4) part(h.root, boxGeo(1.4, 1.4, 0.12), M(0xfdd835), -2.2, tall - 0.8, 0.3).rotation.x = -0.4; // solar radar panel
  }
  h.tracer = bolt;
  return h;
}

/**
 * Ice Breaker (alternate Sledger form): a fighter in arctic gear with an ice pick. Lv 1 grip
 * wraps, Lv 2 a frosted pick, Lv 3 a crystal pick head, Lv 4 cryo fuel tanks, Lv 5 the glowing
 * X-Cryosuit.
 */
export function makeIceBreaker(level) {
  const suit = level >= 5;
  const ice = 0x80d8ff;
  const coat = suit ? 0x0288d1 : 0x4fc3f7;
  const h = makeHumanoid({ skin: 0xffcc80, shirt: coat, pants: suit ? 0x01579b : 0x37474f, arms: coat });
  const { M } = h;
  part(h.head, boxGeo(1.45, 0.5, 1.45), M(suit ? 0xe1f5fe : 0xfafafa), 0, 1.3, 0); // fur hat
  part(h.head, boxGeo(1.5, 0.35, 0.5), M(0x5d4037), 0, 1.45, -0.6); // ponytail
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.45, 0.52); // Dimension Shard
  if (level >= 4) for (const x of [-0.45, 0.45]) part(h.torso, boxGeo(0.5, 1.4, 0.5), M(0xb0bec5), x, 0.2, -0.85); // cryo tanks
  if (suit) {
    part(h.torso, boxGeo(2.2, 1.7, 1.2), glow(h, 0xb3e5fc), 0, 0.05, 0); // X-Cryosuit armor
    part(h.head, boxGeo(1.3, 0.35, 0.12), glow(h, ice), 0, 0.8, 0.66); // visor
  }
  const pick = inHand(h);
  pick.scale.setScalar([1, 1, 1.1, 1.2, 1.25, 1.4][level]);
  part(pick, boxGeo(0.25, 2.4, 0.25), M(level >= 1 ? 0x263238 : 0x5d4037), 0, -1.0, 0);
  const headMat = level >= 3 ? glow(h, ice) : level >= 2 ? M(0xb3e5fc) : M(0x90a4ae);
  part(pick, boxGeo(0.35, 0.4, 1.8), headMat, 0, -2.2, 0.3); // pick head
  part(pick, boxGeo(0.25, 0.25, 0.6), headMat, 0, -2.2, 1.3); // spike
  setMuzzle(h, pick, 0, -2.3, 0.6);
  h.rightArm.rotation.set(-2.6, 0, 0.15);
  h.leftArm.rotation.set(-2.4, 0, -0.3);
  h.pose = { right: -2.6, left: -2.4, leftRecoil: 0 };
  h.swing = 2.2;
  h.melee = true;
  h.tracer = ice;
  return h;
}

// ---------------------------------------------------------------- wave 6 towers
// Warship, Shield Tower, Oil Derrick, Combat Medic, Refractor, Scout Helicopter, Noob Tuber,
// Stinger, Jet Trooper, Combat Drone and Void Traitor.

/** A cylinder part (y axis). */
export function cylPart(parent, rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 10) {
  return part(parent, cylGeo(rt, rb, h, seg), mat, x, y, z);
}

/** A see-through glowing material (shield domes, rotor blur, void auras). */
export function clearMat(u, color, opacity) {
  const m = glow(u, color);
  m.transparent = true;
  m.opacity = opacity;
  m.depthWrite = false;
  return m;
}

/** A spinning-rotor blur: a thin see-through disc. */
export function blurDisc(u, parent, r, x, y, z) {
  const d = part(parent, cylGeo(r, r, 0.05, 16), clearMat(u, 0x9e9e9e, 0.3), x, y, z);
  d.castShadow = false;
  return d;
}

/** A small US flag on a pole (Oil Derrick Bottom path). */
export function usFlag(u, parent, x, z, poleH, s = 1) {
  const { M } = u;
  part(parent, boxGeo(0.12, poleH, 0.12), M(0xbdbdbd), x, poleH / 2, z);
  const red = M(0xc62828);
  const white = M(0xfafafa);
  for (let i = 0; i < 7; i++) part(parent, boxGeo(0.05, 0.14 * s, 1.6 * s), i % 2 ? white : red, x, poleH - 0.1 - i * 0.14 * s, z + 0.85 * s);
  part(parent, boxGeo(0.07, 0.56 * s, 0.7 * s), M(0x1a237e), x, poleH - 0.38 * s, z + 0.4 * s);
}

/**
 * Warship (water only). Has to fit a small pool, so it grows mostly upward. Top path: a longer
 * barrel (Lv 1), a fatter gun (Lv 2), the Cruiser with a second turret (Lv 3), a missile turret
 * (Lv 4), then the Battleship: four triple-barrel turrets and mortars (Lv 5). Bottom path: a radar
 * mast (Lv 1), deck crew (Lv 2), the Frigate Carrier with a helipad and Tomahawk cells (Lv 3),
 * bigger missile boxes (Lv 4), then the dark Railgun Warship with a glowing railgun (Lv 5).
 */
export function makeWarship(level, bottom = false) {
  const u = makeThing();
  const { M } = u;
  const top = !bottom;
  const tier = level >= 5 ? 2 : level >= 3 ? 1 : 0;
  const L = [6, 7.2, 8.4][tier];
  const W = [2.4, 2.9, 3.4][tier];
  const rail = bottom && level >= 5;
  const battle = top && level >= 5;
  const hullC = M(rail ? 0x263238 : battle ? 0x455a64 : 0x78909c);
  const grey = M(rail ? 0x37474f : battle ? 0x607d8b : 0x90a4ae);
  const deck = M(0x8d8d8d);
  const dark = M(0x212121);
  const hh = [1.0, 1.3, 1.6][tier]; // hull height
  // Hull with a pointed bow, a red waterline and the deck.
  part(u.body, boxGeo(W, hh, L), hullC, 0, hh / 2 - 0.4, -0.4);
  part(u.body, boxGeo(W + 0.04, 0.25, L + 0.02), M(0x8e2b2b), 0, -0.4, -0.4);
  for (const side of [-1, 1]) part(u.body, boxGeo(W * 0.72, hh, 1.8), hullC, side * W * 0.18, hh / 2 - 0.4, L / 2 + 0.1).rotation.y = side * 0.5;
  const dy = hh - 0.4; // deck height
  part(u.body, boxGeo(W - 0.3, 0.1, L - 0.3), deck, 0, dy + 0.05, -0.4);
  // Bridge tower, funnel and mast: taller on bigger ships.
  const bh = [1.3, 2.0, 2.8][tier];
  const bz = -L * 0.18;
  part(u.body, boxGeo(W * 0.6, bh, 1.8), grey, 0, dy + bh / 2, bz);
  part(u.body, boxGeo(W * 0.5, bh * 0.4, 1.3), grey, 0, dy + bh + bh * 0.2, bz - 0.1);
  part(u.body, boxGeo(W * 0.52, 0.25, 0.08), M(0x4fc3f7), 0, dy + bh + bh * 0.25, bz + 0.56);
  const mastH = 1.6 + tier * 0.8;
  part(u.body, boxGeo(0.15, mastH, 0.15), dark, 0, dy + bh * 1.4 + mastH / 2, bz - 0.2);
  part(u.body, boxGeo(1.4 + tier * 0.4, 0.1, 0.1), dark, 0, dy + bh * 1.4 + mastH * 0.7, bz - 0.2);
  if (!rail) part(u.body, boxGeo(W * 0.32, 1.0 + tier * 0.4, 0.9), M(0x37474f), 0, dy + (1.0 + tier * 0.4) / 2, bz - 1.5); // funnel
  // Gun turrets: a group on the deck with `barrels` barrels, muzzles at their tips.
  const gunTurret = (z, y, barrels, len, bw, size = 1) => {
    const t = new THREE.Group();
    t.position.set(0, y, z);
    u.body.add(t);
    part(t, boxGeo(1.3 * size, 0.4, 1.3 * size), grey, 0, 0.2, 0);
    part(t, boxGeo(1.15 * size, 0.55 * size, 1.0 * size), grey, 0, 0.65, -0.1);
    for (let i = 0; i < barrels; i++) {
      const x = (i - (barrels - 1) / 2) * 0.32 * size;
      part(t, boxGeo(bw, bw, len), dark, x, 0.65, 0.3 + len / 2);
      gunMuzzle(u, t, x, 0.65, 0.4 + len);
    }
    return t;
  };
  if (rail) {
    // Railgun: two glowing rails on a long armored mount.
    const t = new THREE.Group();
    t.position.set(0, dy, L * 0.18);
    u.body.add(t);
    part(t, boxGeo(1.8, 0.8, 2.2), grey, 0, 0.4, -0.3);
    const rails = glowThing(u, 0x40c4ff);
    for (const x of [-0.3, 0.3]) part(t, boxGeo(0.18, 0.35, 4.6), dark, x, 0.95, 2.0);
    for (const x of [-0.3, 0.3]) part(t, boxGeo(0.06, 0.12, 4.4), rails, x, 1.15, 2.0);
    for (let i = 0; i < 4; i++) part(t, boxGeo(0.9, 0.6, 0.18), M(0x455a64), 0, 0.95, 0.5 + i * 1.0); // field coils
    gunMuzzle(u, t, 0, 0.95, 4.4);
    // Stealthy angled hull plates and a sensor dome.
    for (const side of [-1, 1]) part(u.body, boxGeo(0.2, hh * 0.8, L - 1.5), M(0x1c2529), side * (W / 2 + 0.05), dy - hh * 0.4, -0.6).rotation.z = side * 0.25;
    part(u.body, boxGeo(1.0, 1.0, 1.0), M(0xeceff1), 0, dy + bh * 1.4 + 0.4, bz + 0.2);
    u.tracer = 0x40c4ff;
    u.tracerWidth = 0.5;
  } else if (battle) {
    // Battleship: four triple turrets, two forward and two aft (the inner ones raised).
    gunTurret(L * 0.32, dy, 3, 2.4, 0.3, 1.2);
    gunTurret(L * 0.12, dy + 0.9, 3, 2.4, 0.3, 1.2);
    part(u.body, boxGeo(1.5, 0.9, 1.5), grey, 0, dy + 0.45, L * 0.12);
    gunTurret(-L * 0.5, dy, 3, 2.0, 0.3, 1.2);
    gunTurret(-L * 0.36, dy + 0.9, 3, 2.0, 0.3, 1.2);
    part(u.body, boxGeo(1.5, 0.9, 1.5), grey, 0, dy + 0.45, -L * 0.36);
    // Mortar batteries along both sides.
    for (const side of [-1, 1]) for (const z of [-0.6, 0.6]) {
      part(u.body, boxGeo(0.7, 0.5, 0.7), dark, side * (W / 2 - 0.45), dy + 0.25, bz + z);
      for (const k of [-0.15, 0.15]) part(u.body, boxGeo(0.14, 0.5, 0.14), M(0x424242), side * (W / 2 - 0.45) + k, dy + 0.7, bz + z);
    }
    u.tracer = 0xffab40;
  } else {
    const len = top ? (level >= 1 ? 2.6 : 1.8) : 2.0;
    const bw = top && level >= 2 ? 0.4 : 0.28;
    const barrels = bottom && level >= 3 ? 2 : 1;
    gunTurret(L * 0.22, dy, barrels, len, bw, tier ? 1.15 : 1);
    if (top && level >= 3) {
      // Cruiser: a raised second turret aft.
      part(u.body, boxGeo(1.4, 0.7, 1.4), grey, 0, dy + 0.35, -L * 0.45);
      gunTurret(-L * 0.45, dy + 0.7, 2, 2.0, 0.3, 1.15);
    }
    if (top && level >= 4) {
      // Missile Turret: an angled launcher box with red-tipped missiles beside the bridge.
      for (const side of [-1, 1]) {
        const box = part(u.body, boxGeo(0.8, 0.7, 1.5), M(0x37474f), side * (W / 2 - 0.5), dy + 0.6, bz + 0.2);
        box.rotation.x = -0.4;
        for (const y of [-0.15, 0.15]) part(u.body, boxGeo(0.2, 0.2, 0.1), M(0xe53935), side * (W / 2 - 0.5), dy + 0.9 + y, bz + 0.95);
      }
    }
    if (bottom && level >= 1) {
      // Precision Targeting: a radar dish on the mast.
      part(u.body, boxGeo(1.2, 0.7, 0.1), M(0xeceff1), 0, dy + bh * 1.4 + mastH + 0.3, bz - 0.2).rotation.y = 0.6;
    }
    if (bottom && level >= 2) {
      // Crew Training: sailors on deck.
      for (const [x, z] of [[-0.7, 0.3], [0.7, -0.2], [0.6, L * 0.05]]) {
        part(u.body, boxGeo(0.35, 0.6, 0.3), M(0x1565c0), x, dy + 0.4, z);
        part(u.body, boxGeo(0.3, 0.3, 0.3), M(0xf1c27d), x, dy + 0.85, z);
        part(u.body, boxGeo(0.32, 0.1, 0.32), M(0xfafafa), x, dy + 1.03, z);
      }
    }
    if (bottom && level >= 3) {
      // Frigate Carrier: a helipad on the stern and Tomahawk launch cells.
      part(u.body, boxGeo(W - 0.5, 0.08, 2.2), M(0x424242), 0, dy + 0.12, -L / 2 + 0.7);
      const white = M(0xfafafa);
      part(u.body, boxGeo(0.2, 0.05, 1.1), white, -0.35, dy + 0.18, -L / 2 + 0.7);
      part(u.body, boxGeo(0.2, 0.05, 1.1), white, 0.35, dy + 0.18, -L / 2 + 0.7);
      part(u.body, boxGeo(0.5, 0.05, 0.2), white, 0, dy + 0.18, -L / 2 + 0.7);
      const cells = level >= 4 ? 3 : 2;
      for (let i = 0; i < cells; i++) for (const x of [-0.35, 0.35]) {
        part(u.body, boxGeo(0.55, 0.3, 0.55), M(0x546e7a), x, dy + 0.15, L * 0.02 + i * 0.6);
        part(u.body, boxGeo(0.3, 0.05, 0.3), M(0xe53935), x, dy + 0.32, L * 0.02 + i * 0.6);
      }
      if (level >= 4) for (const side of [-1, 1]) {
        // Advanced Missiles: big armored box launchers beside the bridge.
        const box = part(u.body, boxGeo(0.9, 0.9, 1.8), M(0x37474f), side * (W / 2 - 0.5), dy + 0.7, bz + 0.4);
        box.rotation.x = -0.35;
        part(u.body, boxGeo(0.5, 0.5, 0.1), glowThing(u, 0xff6d00), side * (W / 2 - 0.5), dy + 1.05, bz + 1.3);
      }
    }
    u.tracer = 0xffab40;
  }
  if (tier === 2) u.body.position.z = -0.4; // keep the biggest ships centered in their pool
  u.projectile = { color: 0x424242, size: battle ? 0.8 : 0.6 };
  u.static = true;
  u.bob = 0.06; // rocks gently on the water
  return u;
}
const makeWarshipBottom = (level) => makeWarship(level, true);

/**
 * Shield Tower: a generator pylon under a see-through blue dome. Top path: dish antennas (Lv 1),
 * capacitors (Lv 2), a bigger dome (Lv 3), a yellow reboot coil (Lv 4), then orbiting hex panels
 * and the biggest dome (Lv 5). Bottom path: a repair arm (Lv 1), glowing side panels (Lv 2),
 * Nano Shields: four small emitter orbs (Lv 3), green heal crosses (Lv 4), then rings (Lv 5).
 */
export function makeShieldTower(level, bottom = false) {
  const u = makeThing();
  const { M } = u;
  const top = !bottom;
  const color = bottom && level >= 3 ? 0x18ffff : 0x40c4ff;
  const shine = glowThing(u, color);
  const metal = M(0x546e7a);
  const dark = M(0x263238);
  part(u.body, boxGeo(3.2, 0.5, 3.2), M(0x455a64), 0, 0.25, 0);
  const ph = 2.4 + level * 0.25; // pylon height
  part(u.body, boxGeo(1.1, ph, 1.1), metal, 0, 0.5 + ph / 2, 0);
  for (let i = 0; i < 2 + Math.min(level, 3); i++) part(u.body, boxGeo(1.3, 0.15, 1.3), shine, 0, 0.9 + i * (ph / (2 + Math.min(level, 3))), 0); // coil rings
  const orbY = 0.5 + ph + 0.5;
  part(u.body, boxGeo(0.8, 0.8, 0.8), shine, 0, orbY, 0);
  setMuzzle(u, u.body, 0, orbY, 0);
  // Dome: bigger with the Top path's shield upgrades.
  const r = top ? [2.2, 2.2, 2.3, 2.7, 2.8, 3.2][level] : [2.2, 2.2, 2.3, 2.0, 2.2, 2.4][level];
  const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), clearMat(u, color, 0.22));
  dome.position.y = 0.5;
  u.body.add(dome);
  if (top) {
    if (level >= 1) for (const side of [-1, 1]) {
      part(u.body, boxGeo(0.1, 1.2, 0.1), dark, side * 1.2, 1.1, -1.2);
      part(u.body, boxGeo(0.7, 0.5, 0.1), M(0xeceff1), side * 1.2, 1.8, -1.2).rotation.y = side * 0.5;
    }
    if (level >= 2) for (const x of [-1.1, 1.1]) {
      cylPart(u.body, 0.3, 0.3, 1.0, M(0x78909c), x, 1.0, 1.0);
      part(u.body, boxGeo(0.2, 0.2, 0.2), shine, x, 1.6, 1.0);
    }
    if (level >= 4) {
      const coil = glowThing(u, 0xffea00);
      for (let i = 0; i < 4; i++) part(u.body, boxGeo(1.5, 0.12, 0.25), coil, 0, 1.2 + i * 0.5, 0).rotation.y = i * 0.8;
    }
    if (level >= 5) for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const p = part(u.body, boxGeo(0.9, 0.9, 0.1), shine, Math.cos(a) * 1.9, orbY - 0.6, Math.sin(a) * 1.9);
      p.rotation.y = -a + Math.PI / 2;
    }
  } else {
    if (level >= 1) {
      // Advanced Repairs: a little robot repair arm.
      part(u.body, boxGeo(0.25, 1.4, 0.25), M(0xffa000), 1.1, 1.2, 1.1).rotation.z = -0.4;
      part(u.body, boxGeo(0.4, 0.25, 0.4), dark, 1.4, 1.9, 1.1);
    }
    if (level >= 2) for (const side of [-1, 1]) part(u.body, boxGeo(0.08, ph * 0.6, 0.6), shine, side * 0.6, 0.5 + ph / 2, 0);
    if (level >= 3) for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      part(u.body, boxGeo(0.12, 1.6, 0.12), dark, Math.cos(a) * 1.3, 1.3, Math.sin(a) * 1.3);
      part(u.body, boxGeo(0.45, 0.45, 0.45), shine, Math.cos(a) * 1.3, 2.3, Math.sin(a) * 1.3);
    }
    if (level >= 4) {
      const green = glowThing(u, 0x69f0ae);
      for (const side of [-1, 1]) {
        part(u.body, boxGeo(0.08, 0.6, 0.2), green, side * 0.57, 1.4, 0);
        part(u.body, boxGeo(0.08, 0.2, 0.6), green, side * 0.57, 1.4, 0);
      }
    }
    if (level >= 5) for (let i = 0; i < 2; i++) part(u.body, boxGeo(2.6 - i * 0.6, 0.1, 2.6 - i * 0.6), shine, 0, orbY + 0.7 + i * 0.4, 0).rotation.y = i * 0.78;
  }
  u.medi = color; // links to the towers it shields, if the game draws them
  u.tracer = color;
  u.static = true;
  return u;
}
const makeShieldTowerBottom = (level) => makeShieldTower(level, true);

/**
 * Oil Derrick: a pumpjack on a pad. Top path: red gas cans (Lv 1), oil barrels (Lv 2), a lattice
 * drill derrick (Lv 3), a pipeline and storage tank (Lv 4), then big black-and-gold tanks (Lv 5).
 * Bottom path: a stack of bonds (Lv 1), money crates (Lv 2), a cash machine (Lv 3), military
 * crates and sandbags (Lv 4), then a big US flag (Lv 5).
 */
export function makeOilDerrick(level, bottom = false) {
  const u = makeThing();
  const { M } = u;
  const top = !bottom;
  const steel = M(0x546e7a);
  const dark = M(0x212121);
  const yellow = M(0xfbc02d);
  part(u.body, boxGeo(4, 0.3, 4), M(0x6d6d6d), 0, 0.15, 0);
  part(u.body, boxGeo(2.6, 0.3, 1.0), M(0x424242), 0, 0.45, 0); // skid
  // Samson post (A-frame), walking beam with a horsehead, and the crank with its counterweight.
  for (const side of [-1, 1]) part(u.body, boxGeo(0.2, 2.6, 0.2), yellow, 0.2 * side, 1.7, side * 0.4).rotation.x = side * 0.18;
  const beam = new THREE.Group();
  beam.position.set(0, 3.0, 0);
  beam.rotation.z = 0.08;
  u.body.add(beam);
  part(beam, boxGeo(3.6, 0.35, 0.35), yellow, 0, 0, 0);
  part(beam, boxGeo(0.5, 1.1, 0.5), dark, 1.9, -0.3, 0); // horsehead
  part(beam, boxGeo(0.06, 2.4, 0.06), dark, 2.05, -1.5, 0); // bridle
  part(u.body, boxGeo(0.6, 0.5, 0.6), steel, 2.0, 0.55, 0); // wellhead
  part(u.body, boxGeo(0.25, 0.8, 0.25), M(0xc62828), 2.0, 1.0, 0);
  part(u.body, boxGeo(0.3, 1.6, 0.3), steel, -1.2, 1.2, 0); // pitman arm
  part(u.body, boxGeo(0.9, 0.9, 0.5), dark, -1.3, 1.0, 0.45); // counterweight
  part(u.body, boxGeo(0.9, 0.9, 0.5), dark, -1.3, 1.0, -0.45);
  part(u.body, boxGeo(1.0, 0.8, 0.8), M(0x37474f), -1.4, 0.7, 0); // motor
  setMuzzle(u, u.body, 2.0, 1.5, 0);
  if (top) {
    if (level >= 1) for (const x of [-1.5, -1.0]) part(u.body, boxGeo(0.4, 0.55, 0.25), M(0xd32f2f), x, 0.58, 1.6); // gas cans
    if (level >= 2) for (const [x, z] of [[1.3, 1.5], [1.75, 1.5], [1.5, 1.05]]) cylPart(u.body, 0.22, 0.22, 0.7, M(0x1565c0), x, 0.65, z); // barrels
    if (level >= 3) {
      // Oil Drill: a lattice derrick tower behind the pumpjack.
      const H = level >= 5 ? 6 : 5;
      for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
        const leg = part(u.body, boxGeo(0.12, H, 0.12), M(0x9e9e9e), x * (1 - 0.3), 0.3 + H / 2, -1.4 + z * (1 - 0.3));
        leg.rotation.set(z * 0.08, 0, -x * 0.08);
      }
      for (let i = 1; i < 5; i++) part(u.body, boxGeo(0.9 - i * 0.08, 0.08, 0.9 - i * 0.08), M(0x9e9e9e), 0, 0.3 + (H * i) / 5, -1.4);
      part(u.body, boxGeo(0.5, 0.3, 0.5), M(0xd32f2f), 0, 0.4 + H, -1.4);
    }
    if (level >= 4) {
      part(u.body, boxGeo(0.25, 0.25, 3.4), steel, 1.7, 0.45, -0.3); // pipeline
      cylPart(u.body, 0.7, 0.7, 1.6, M(0xeceff1), 1.4, 1.1, -1.4); // storage tank
    }
    if (level >= 5) {
      for (const x of [-1.5, 1.4]) {
        cylPart(u.body, 0.75, 0.75, 2.0, dark, x, 1.3, x < 0 ? 1.4 : -1.4);
        part(u.body, boxGeo(1.55, 0.2, 1.55), M(0xffc107), x, 1.6, x < 0 ? 1.4 : -1.4);
      }
    }
  } else {
    const cash = M(0x2e7d32);
    if (level >= 1) for (let i = 0; i < 3; i++) part(u.body, boxGeo(0.7, 0.12, 0.4), M(0xa5d6a7), -1.4, 0.36 + i * 0.13, 1.5); // bonds
    if (level >= 2) for (const x of [0.9, 1.6]) {
      part(u.body, boxGeo(0.6, 0.5, 0.6), M(0x8d6e63), x, 0.55, 1.5); // money crates
      part(u.body, boxGeo(0.5, 0.15, 0.5), cash, x, 0.87, 1.5);
    }
    if (level >= 3) {
      // Cash Back: a cash machine with a green screen.
      part(u.body, boxGeo(0.8, 1.4, 0.6), M(0x455a64), -1.5, 1.0, -1.4);
      part(u.body, boxGeo(0.5, 0.35, 0.05), glowThing(u, 0x76ff03), -1.5, 1.35, -1.08);
    }
    if (level >= 4) {
      for (const x of [0.6, 1.3]) part(u.body, boxGeo(0.65, 0.5, 0.5), M(0x4e5b31), x, 0.55, -1.5); // war crates
      for (let i = 0; i < 4; i++) part(u.body, boxGeo(0.7, 0.3, 0.4), M(0xa1887f), -1.6 + i * 0.75, 0.45, -1.85); // sandbags
    }
    if (level >= 5) {
      usFlag(u, u.body, 1.7, -0.6, 4.6, 1.1);
      part(u.body, boxGeo(0.9, 0.9, 0.9), M(0xffc107), -0.4, 0.75, 1.5); // gold stack
    }
  }
  u.tracer = 0x76ff03;
  u.static = true;
  return u;
}
const makeOilDerrickBottom = (level) => makeOilDerrick(level, true);

/**
 * Combat Medic: a camo medic with a rifle, a red-cross helmet and armband. Top path: a drum mag
 * (Lv 1), a red-tip ammo belt (Lv 2), a Revive Pack backpack (Lv 3), defib paddles (Lv 4), then an
 * armored vest and green visor (Lv 5). Bottom path: med pouches (Lv 1), a big med bag (Lv 2), a
 * drone pack with a Medic Drone on it (Lv 3), an antenna (Lv 4), then a cyan visor and 2 drones (Lv 5).
 */
export function makeCombatMedic(level, bottom = false) {
  const top = !bottom;
  const h = makeHumanoid({ skin: 0xc68642, shirt: 0x5b6b3a, pants: 0x4e5b31, arms: 0x5b6b3a, face: 'soldier' });
  const { M } = h;
  const red = M(0xd32f2f);
  const white = M(0xfafafa);
  helmet(h, 0x556b2f);
  part(h.head, boxGeo(0.5, 0.5, 0.06), white, 0, 1.3, 0.74);
  part(h.head, boxGeo(0.4, 0.12, 0.07), red, 0, 1.3, 0.76);
  part(h.head, boxGeo(0.12, 0.4, 0.07), red, 0, 1.3, 0.76);
  part(h.leftArm, boxGeo(1.05, 0.45, 1.05), white, 0, -0.5, 0); // armband
  part(h.leftArm, boxGeo(1.07, 0.12, 0.3), red, 0, -0.5, 0);
  part(h.torso, boxGeo(0.6, 0.18, 0.06), red, 0.45, 0.45, 0.52);
  part(h.torso, boxGeo(0.18, 0.6, 0.06), red, 0.45, 0.45, 0.52);
  const dark = M(0x212121);
  const gun = holdLongGun(h, 2.0, dark);
  part(gun, boxGeo(0.4, 0.6, 0.5), M(0x37474f), 0, -0.4, 0);
  if (top) {
    if (level >= 1) cylPart(gun, 0.35, 0.35, 0.3, dark, 0, -0.9, -0.4).rotation.z = Math.PI / 2; // drum mag
    if (level >= 2) part(h.torso, boxGeo(0.28, 2.3, 1.12), M(0xc9a227), 0, 0.1, 0).rotation.z = -0.6; // ammo belt
    if (level >= 3) {
      // Revive Pack: a backpack with a glowing green cross.
      part(h.torso, boxGeo(1.4, 1.6, 0.7), M(0x33691e), 0, 0, -0.85);
      const g = glow(h, 0x69f0ae);
      part(h.torso, boxGeo(0.7, 0.2, 0.08), g, 0, 0.1, -1.22);
      part(h.torso, boxGeo(0.2, 0.7, 0.08), g, 0, 0.1, -1.22);
    }
    if (level >= 4) for (const x of [-0.7, 0.7]) part(h.torso, boxGeo(0.35, 0.5, 0.2), M(0xffeb3b), x, -0.6, 0.6); // defib paddles
    if (level >= 5) {
      part(h.torso, boxGeo(2.15, 1.6, 1.15), M(0x37412a), 0, 0.15, 0);
      part(h.head, boxGeo(1.2, 0.3, 0.1), glow(h, 0x69f0ae), 0, 0.7, 0.63);
    }
  } else {
    if (level >= 1) for (const x of [-0.6, 0]) part(h.torso, boxGeo(0.45, 0.45, 0.3), M(0x3e4a26), x, -0.7, 0.6); // pouches
    if (level >= 2) part(h.torso, boxGeo(0.8, 0.9, 1.0), red, 1.3, -0.8, 0); // med bag
    if (level >= 3) {
      // Medic Drone pack: a back frame with a little quadcopter docked on top.
      part(h.torso, boxGeo(1.4, 1.6, 0.6), M(0x455a64), 0, 0, -0.8);
      const drones = level >= 5 ? [-0.6, 0.6] : [0];
      for (const x of drones) {
        part(h.torso, boxGeo(0.6, 0.25, 0.6), white, x, 1.25, -0.8);
        part(h.torso, boxGeo(0.2, 0.06, 0.2), red, x, 1.4, -0.8);
        for (const [dx, dz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) blurDisc(h, h.torso, 0.22, x + dx, 1.4, -0.8 + dz);
      }
    }
    if (level >= 4) {
      part(h.torso, boxGeo(0.08, 1.4, 0.08), dark, -0.6, 1.4, -1.0);
      part(h.torso, boxGeo(0.2, 0.2, 0.2), glow(h, 0xff1744), -0.6, 2.1, -1.0);
    }
    if (level >= 5) part(h.head, boxGeo(1.2, 0.3, 0.1), glow(h, 0x18ffff), 0, 0.7, 0.63);
  }
  h.medi = 0x69f0ae;
  h.tracer = 0xffe082;
  return h;
}
const makeCombatMedicBottom = (level) => makeCombatMedic(level, true);

/**
 * Refractor (alternate Phaser form): a white-and-gold armored gunner with a crystal laser emitter.
 * Top path: glowing cells (Lv 1), a chest fusion core (Lv 2), splitter prisms on the gun (Lv 3),
 * shoulder coils (Lv 4), then a halo of orbs (Lv 5). Bottom path: shoulder pads (Lv 1), a power
 * pack (Lv 2), a bigger red-gold cannon (Lv 3), a visor (Lv 4), then the huge Calamity cannon (Lv 5).
 * The Bottom path draws a steady beam (`beam`); the Top path fires thick golden tracers.
 */
export function makeRefractor(level, bottom = false) {
  const top = !bottom;
  const hot = bottom && level >= 3;
  const color = hot ? (level >= 5 ? 0xff1744 : 0xff6d00) : 0xffd740;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: 0xeceff1, pants: 0x90a4ae, arms: 0xeceff1, face: 'soldier' });
  const { M } = h;
  const gold = M(0xffc107);
  const beam = glow(h, color);
  part(h.head, boxGeo(1.4, 1.35, 1.4), gold, 0, 0.65, -0.03);
  part(h.head, boxGeo(1.2, 0.3, 0.08), beam, 0, 0.72, 0.68);
  part(h.torso, boxGeo(2.15, 1.4, 1.15), M(0xfafafa), 0, 0.3, 0);
  if (top) {
    if (level >= 1) for (let i = 0; i < 3; i++) part(h.torso, boxGeo(0.3, 1.2, 0.3), beam, -0.45 + i * 0.45, 0, -0.65);
    if (level >= 2) part(h.torso, boxGeo(0.6, 0.6, 0.1), beam, 0, 0.3, 0.6);
    if (level >= 4) for (const x of [-1.4, 1.4]) {
      part(h.torso, boxGeo(0.8, 0.45, 1.3), gold, x, 1.0, 0);
      part(h.torso, boxGeo(0.3, 0.6, 0.3), beam, x, 1.5, 0);
    }
    if (level >= 5) for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(h.head, boxGeo(0.25, 0.25, 0.25), beam, Math.cos(a) * 0.9, 1.8, Math.sin(a) * 0.9);
    }
  } else {
    if (level >= 1) for (const x of [-1.4, 1.4]) part(h.torso, boxGeo(0.8, 0.45, 1.3), gold, x, 1.0, 0);
    if (level >= 2) {
      part(h.torso, boxGeo(1.5, 1.7, 0.7), M(0x37474f), 0, 0, -0.85);
      part(h.torso, boxGeo(0.8, 0.8, 0.1), beam, 0, 0, -1.22);
    }
    if (level >= 4) part(h.head, boxGeo(1.3, 0.45, 0.1), beam, 0, 0.75, 0.7);
    if (level >= 5) for (const x of [-0.45, 0, 0.45]) part(h.head, boxGeo(0.2, 0.7, 0.2), gold, x, 1.6, 0); // crest
  }
  const len = hot ? (level >= 5 ? 3.0 : 2.5) : 2.0;
  const gun = holdLongGun(h, len, gold);
  const bw = hot ? 0.8 : 0.55;
  part(gun, boxGeo(bw, 0.8, bw), M(0xfafafa), 0, -0.4, 0);
  for (let i = 0; i < (hot ? 3 : 2); i++) part(gun, boxGeo(bw + 0.1, 0.12, bw + 0.1), beam, 0, -1.0 - i * 0.4, 0);
  const prism = part(gun, boxGeo(0.45, 0.45, 0.45), beam, 0, -len, 0); // crystal emitter
  prism.rotation.set(0.6, 0.6, 0);
  if (top && level >= 3) for (const x of [-0.35, 0.35]) part(gun, boxGeo(0.22, 0.22, 0.22), beam, x, -len + 0.3, 0).rotation.set(0.6, 0.6, 0);
  h.muzzles[0].position.y = -len - 0.25;
  h.tracer = color;
  if (bottom) h.beam = color;
  else h.tracerWidth = 0.3;
  return h;
}
const makeRefractorBottom = (level) => makeRefractor(level, true);

/**
 * Scout Helicopter: a small helipad, plus a little helicopter the view hovers around. Lv 1 a sensor
 * ball (stealth reveal), Lv 2 rocket pods, Lv 3 a second pair of pods, Lv 4 a radar dome, Lv 5 the
 * V-Osprey: a tilt-rotor with two big rotors on its wing tips and a bomb bay.
 */
export function makeScoutHeli(level) {
  const u = makeThing();
  const { M } = u;
  part(u.body, boxGeo(3.6, 0.3, 3.6), M(0x616161), 0, 0.15, 0);
  const white = M(0xfafafa);
  part(u.body, boxGeo(0.3, 0.05, 1.6), white, -0.5, 0.32, 0);
  part(u.body, boxGeo(0.3, 0.05, 1.6), white, 0.5, 0.32, 0);
  part(u.body, boxGeo(0.7, 0.05, 0.3), white, 0, 0.32, 0);
  for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) part(u.body, boxGeo(0.22, 0.22, 0.22), glowThing(u, 0x76ff03), x, 0.42, z);
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
  const osprey = level >= 5;
  const body = M(osprey ? 0x5f6b73 : 0x7d8a5a);
  const dark = M(0x212121);
  const prop = new THREE.Group();
  let tail = null;
  if (osprey) {
    part(bank, boxGeo(2.2, 2.0, 6.0), body, 0, 0, 0);
    part(bank, boxGeo(1.8, 1.4, 1.4), body, 0, -0.1, 3.5); // nose
    part(bank, boxGeo(1.6, 0.8, 0.9), M(0x81d4fa), 0, 0.5, 3.4);
    part(bank, boxGeo(8.0, 0.25, 1.4), body, 0, 1.1, 0.3); // wing
    for (const x of [-4, 4]) {
      part(bank, boxGeo(0.8, 0.8, 2.0), body, x, 1.2, 0.3); // nacelles, tilted up
      blurDisc(u, bank, 2.6, x, 2.4, 0.3);
    }
    prop.position.set(-4, 2.3, 0.3);
    for (let i = 0; i < 3; i++) part(prop, boxGeo(0.25, 0.06, 5), M(0x2b2b2b), 0, 0, 0).rotation.y = (i * Math.PI) / 3;
    bank.add(prop);
    part(bank, boxGeo(3.0, 0.15, 1.0), body, 0, 0.6, -3.4); // tailplane
    for (const x of [-1.5, 1.5]) part(bank, boxGeo(0.15, 1.4, 0.9), body, x, 1.2, -3.4); // twin fins
    part(bank, boxGeo(1.0, 0.3, 1.4), dark, 0, -1.05, 0.2); // bomb bay
    for (const x of [-0.8, 0.8]) part(bank, boxGeo(0.3, 0.3, 0.3), dark, x, -0.6, 3.6);
    for (const x of [-0.8, 0.8]) point(x, -0.6, 4.0, muzzles);
    for (const x of [-1.3, 1.3]) {
      part(bank, boxGeo(0.45, 0.45, 1.6), M(0x37474f), x * 1.8, 0.8, 0.5);
      point(x * 1.8, 0.8, 1.4, missiles);
    }
  } else {
    part(bank, boxGeo(1.7, 1.6, 3.0), body, 0, 0, 0.2); // cabin
    part(bank, boxGeo(1.4, 1.1, 0.9), body, 0, -0.15, 2.0); // nose
    part(bank, boxGeo(1.3, 0.8, 0.8), M(0x81d4fa), 0, 0.35, 1.7);
    part(bank, boxGeo(0.55, 0.55, 3.6), body, 0, 0.35, -2.9); // tail boom
    part(bank, boxGeo(0.12, 1.2, 0.8), body, 0, 0.9, -4.6);
    for (const x of [-0.75, 0.75]) part(bank, boxGeo(0.12, 0.12, 2.8), dark, x, -1.1, 0.3); // skids
    part(bank, boxGeo(0.35, 0.5, 0.35), dark, 0, 1.05, 0.2);
    prop.position.set(0, 1.35, 0.2);
    for (let i = 0; i < 2; i++) part(prop, boxGeo(0.3, 0.06, 7), M(0x2b2b2b), 0, 0, 0).rotation.y = (i * Math.PI) / 2;
    bank.add(prop);
    tail = new THREE.Group();
    tail.position.set(0.12, 0.9, -4.6);
    bank.add(tail);
    part(tail, boxGeo(0.06, 1.5, 0.2), M(0x2b2b2b), 0, 0, 0);
    // Door gunners' rifles poking out of both sides.
    for (const side of [-1, 1]) {
      part(bank, boxGeo(0.12, 0.12, 1.2), dark, side * 1.0, -0.1, 0.6);
      point(side * 1.0, -0.1, 1.25, muzzles);
    }
    if (level >= 1) {
      part(bank, boxGeo(0.6, 0.6, 0.6), dark, 0, -0.85, 2.2); // sensor ball
      part(bank, boxGeo(0.3, 0.3, 0.08), glowThing(u, 0x76ff03), 0, -0.85, 2.52);
    }
    if (level >= 2) {
      const pods = level >= 3 ? 2 : 1;
      for (const side of [-1, 1]) {
        part(bank, boxGeo(1.0 + pods * 0.4, 0.12, 0.7), body, side * (1.2 + pods * 0.2), -0.3, 0.1);
        for (let k = 0; k < pods; k++) {
          const x = side * (1.4 + k * 0.5);
          part(bank, boxGeo(0.38, 0.38, 1.3), M(0x37474f), x, -0.6, 0.2);
          part(bank, boxGeo(0.26, 0.26, 0.08), glowThing(u, 0xff3d00), x, -0.6, 0.86);
          point(x, -0.6, 0.9, missiles);
        }
      }
    }
    if (level >= 4) {
      part(bank, boxGeo(0.9, 0.45, 0.9), M(0xeceff1), 0, 1.0, 1.3); // radar dome
      part(bank, boxGeo(0.08, 1.0, 0.08), dark, -0.6, 1.2, -0.8);
    }
  }
  const bay = new THREE.Object3D();
  bay.position.set(0, -1.2, 0.2);
  bank.add(bay);
  heli.userData = { bank, prop, tail, bay, missiles };
  u.plane = heli;
  u.heli = true;
  u.muzzles = muzzles;
  u.spin = null;
  u.flyHeight = 11;
  u.tracer = 0xffd740;
  u.projectile = { color: 0x424242, size: 0.6 };
  return u;
}

/**
 * Noob Tuber (alternate Paintballer form): a classic noob with a grenade launcher. Lv 1 a grenade
 * bandolier, Lv 2 the MGL drum, Lv 3 red IR goggles and a scope. Lv 4 it mans a mounted 2x2-tube
 * launcher turret behind sandbags, and Lv 5 the X-Turret with nine tubes.
 */
export function makeNoobTuber(level) {
  if (level >= 4) {
    const u = makeThing();
    const { M } = u;
    const x5 = level >= 5;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(u.body, boxGeo(1.3, 0.6, 0.7), M(0xa1887f), Math.cos(a) * 1.7, 0.3, Math.sin(a) * 1.7).rotation.y = -a + Math.PI / 2; // sandbags
    }
    part(u.body, boxGeo(0.5, 1.6, 0.5), M(0x424242), 0, 0.8, 0.3); // mount
    const t = new THREE.Group();
    t.position.set(0, 1.9, 0.4);
    u.body.add(t);
    const n = x5 ? 3 : 2;
    const tubeM = M(x5 ? 0x263238 : 0x4e5b31);
    part(t, boxGeo(n * 0.5 + 0.3, n * 0.5 + 0.3, 1.2), M(x5 ? 0x37474f : 0x556b2f), 0, 0, 0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = (i - (n - 1) / 2) * 0.5;
      const y = (j - (n - 1) / 2) * 0.5;
      part(t, boxGeo(0.38, 0.38, 1.2), tubeM, x, y, 1.1);
      gunMuzzle(u, t, x, y, 1.75);
    }
    if (x5) part(t, boxGeo(n * 0.5 + 0.4, 0.15, 1.3), glowThing(u, 0xff6d00), 0, n * 0.25 + 0.2, 0);
    // The noob sits behind it.
    const h = makeHumanoid({ face: 'smile' });
    h.root.scale.setScalar(0.7);
    h.root.position.set(0, 0, -1.2);
    h.rightArm.rotation.x = -1.3;
    h.leftArm.rotation.x = -1.3;
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.tracer = 0xffab40;
    u.projectile = { color: 0x558b2f, size: 0.5 };
    u.static = true;
    return u;
  }
  const h = makeHumanoid({ face: 'smile' }); // the classic noob colors
  const { M } = h;
  const olive = M(0x4e5b31);
  const gun = holdLongGun(h, 1.6, olive);
  part(gun, boxGeo(0.55, 1.0, 0.6), olive, 0, -1.1, 0); // fat barrel
  part(gun, boxGeo(0.3, 0.5, 0.4), M(0x212121), 0, -0.2, 0.3); // grip
  if (level >= 1) {
    const strap = part(h.torso, boxGeo(0.25, 2.4, 1.12), M(0x5d4037), 0, 0, 0);
    strap.rotation.z = 0.7;
    for (let i = 0; i < 4; i++) part(h.torso, boxGeo(0.22, 0.3, 0.22), M(0x558b2f), -0.6 + i * 0.4, 0.5 - i * 0.35, 0.6);
  }
  if (level >= 2) cylPart(gun, 0.5, 0.5, 0.5, M(0x37474f), 0, -0.55, 0).rotation.z = Math.PI / 2; // MGL drum
  if (level >= 3) {
    part(h.head, boxGeo(1.25, 0.3, 0.1), glow(h, 0xff1744), 0, 0.7, 0.63); // IR goggles
    part(gun, boxGeo(0.22, 0.5, 0.3), M(0x212121), 0, -0.6, 0.45);
  }
  h.muzzles[0].position.y = -1.7;
  h.tracer = 0xffab40;
  h.projectile = { color: 0x558b2f, size: 0.45 };
  return h;
}

/**
 * Stinger (alternate Marksman form): a soldier in desert camo with a rocket tube on his shoulder
 * and a handgun. Lv 1 a helmet, Lv 2 an IFF radar box on the tube, Lv 3 a bigger warhead, Lv 4 the
 * M202 Flash (a 2x2 tube box), Lv 5 the X-Stinger: one big launcher with glowing rings, and armor.
 */
export function makeStinger(level) {
  const x5 = level >= 5;
  const h = makeHumanoid({ skin: 0xd7a26b, shirt: x5 ? 0x37474f : 0xc2a878, pants: x5 ? 0x263238 : 0xa38f62, arms: x5 ? 0x37474f : 0xc2a878, face: 'soldier' });
  const { M } = h;
  if (level >= 1) helmet(h, x5 ? 0x263238 : 0x8d7b55);
  const tubeM = M(x5 ? 0x263238 : 0x556b2f);
  const launcher = new THREE.Group();
  launcher.position.set(-1.1, 4.6, 0.3); // on the right shoulder
  h.body.add(launcher);
  let len = 3.0;
  if (level === 4) {
    part(launcher, boxGeo(1.0, 1.0, 2.6), tubeM, 0, 0, 0.3);
    for (const x of [-0.25, 0.25]) for (const y of [-0.25, 0.25]) part(launcher, boxGeo(0.4, 0.4, 0.1), M(0x111111), x, y, 1.62);
    len = 2.6;
  } else {
    const r = x5 ? 0.45 : level >= 3 ? 0.32 : 0.26;
    len = x5 ? 3.6 : 3.0;
    part(launcher, boxGeo(r * 2, r * 2, len), tubeM, 0, 0, 0.3);
    part(launcher, boxGeo(r * 2 + 0.1, r * 2 + 0.1, 0.25), M(0x212121), 0, 0, 0.3 + len / 2);
    if (level >= 3) part(launcher, boxGeo(r * 1.6, r * 1.6, 0.1), glow(h, x5 ? 0x40c4ff : 0xff3d00), 0, 0, 0.3 + len / 2 + 0.15);
    if (x5) for (let i = 0; i < 3; i++) part(launcher, boxGeo(1.05, 1.05, 0.15), glow(h, 0x40c4ff), 0, 0, -0.6 + i * 0.8);
  }
  if (level >= 2) {
    part(launcher, boxGeo(0.5, 0.4, 0.6), M(0x37474f), 0.55, 0, 0.4); // IFF box
    part(launcher, boxGeo(0.06, 0.6, 0.06), M(0x212121), 0.55, 0.45, 0.4);
  }
  part(launcher, boxGeo(0.25, 0.5, 0.25), M(0x212121), 0, -0.5, 0.8); // grip
  setMuzzle(h, launcher, 0, 0, 0.3 + len / 2 + 0.3);
  if (x5) part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x455a64), 0, 0.15, 0); // armor
  addPistol(h, h.leftArm, false); // the close-range handgun
  h.rightArm.rotation.set(-2.6, 0, 0.1);
  h.leftArm.rotation.set(-1.4, 0, -0.1);
  h.pose = { right: -2.6, left: -1.4, leftRecoil: 0.3 };
  h.recoilScale = 0.4;
  h.tracer = 0xffab40;
  h.projectile = { color: 0xeceff1, size: 0.5 };
  return h;
}

/**
 * Jet Trooper: a launch pad, plus a soldier with a jetpack that the view hovers above it (like a
 * helicopter, so it can fly wherever the sim puts it). Top path: a longer mag (Lv 1), bigger
 * thrusters (Lv 2), a sensor visor (Lv 3), an ammo belt (Lv 4), then white-blue Air Defender armor
 * with wings (Lv 5). Bottom path: an antenna (Lv 1), a heavy vest (Lv 2), an orange explosive-ammo
 * rifle (Lv 3), fuel tanks for fire rounds (Lv 4), then the black-red X-Jet Suit with wings (Lv 5).
 */
export function makeJetTrooper(level, bottom = false) {
  const u = makeThing();
  const { M } = u;
  const top = !bottom;
  const x5 = level >= 5;
  part(u.body, boxGeo(3.2, 0.3, 3.2), M(0x455a64), 0, 0.15, 0);
  for (const z of [-0.6, 0.4]) part(u.body, boxGeo(1.2, 0.05, 0.3), M(0xfdd835), 0, 0.32, z).rotation.y = 0.0;
  for (const [x, z] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) part(u.body, boxGeo(0.2, 0.2, 0.2), glowThing(u, 0xff9100), x, 0.4, z);
  const suit = x5 ? (top ? 0xeceff1 : 0x1a1a1a) : 0x546e7a;
  const h = makeHumanoid({ skin: 0xc68642, shirt: suit, pants: x5 ? (top ? 0x1565c0 : 0x111111) : 0x37474f, arms: suit, face: 'soldier' });
  u.mats.push(...h.mats);
  const hm = h.M;
  const accent = x5 ? (top ? 0x40c4ff : 0xff1744) : 0xff9100;
  helmet(h, x5 ? (top ? 0x1565c0 : 0x212121) : 0x37474f, false);
  // Jetpack with two nozzles and flames.
  part(h.torso, boxGeo(1.4, 1.6, 0.8), hm(0x78909c), 0, 0.1, -0.9);
  const big = (top && level >= 2) || x5;
  for (const x of [-0.45, 0.45]) {
    part(h.torso, boxGeo(big ? 0.55 : 0.4, 0.5, big ? 0.55 : 0.4), hm(0x37474f), x, -0.9, -0.9);
    part(h.torso, boxGeo(0.35, big ? 1.4 : 0.9, 0.35), clearMat(h, accent === 0xff1744 ? 0xff6d00 : 0xffab40, 0.75), x, big ? -1.9 : -1.6, -0.9);
  }
  const gun = holdLongGun(h, 1.8, hm(bottom && level >= 3 ? 0xe65100 : 0x212121));
  part(gun, boxGeo(0.4, 0.6, 0.5), hm(0x37474f), 0, -0.4, 0);
  if (top) {
    if (level >= 1) part(gun, boxGeo(0.3, 0.6, 0.35), hm(0x212121), 0, -0.7, -0.35);
    if (level >= 3) part(h.head, boxGeo(1.2, 0.3, 0.1), glow(h, 0x76ff03), 0, 0.7, 0.63);
    if (level >= 4) part(h.torso, boxGeo(0.28, 2.3, 1.12), hm(0xc9a227), 0, 0.1, 0).rotation.z = 0.6;
  } else {
    if (level >= 1) part(h.head, boxGeo(0.08, 1.0, 0.08), hm(0x212121), 0.55, 1.5, -0.3);
    if (level >= 2) part(h.torso, boxGeo(2.15, 1.6, 1.15), hm(0x4e5b31), 0, 0.15, 0);
    if (level >= 3) part(gun, boxGeo(0.45, 0.7, 0.45), hm(0x424242), 0, -1.1, -0.35); // under-barrel launcher
    if (level >= 4) for (const x of [-0.85, 0.85]) cylPart(h.torso, 0.22, 0.22, 1.2, glow(h, 0xff6d00), x, 0.1, -0.9);
  }
  if (x5) {
    part(h.head, boxGeo(1.25, 0.3, 0.1), glow(h, accent), 0, 0.7, 0.63);
    for (const side of [-1, 1]) part(h.torso, boxGeo(2.4, 0.15, 1.0), hm(top ? 0xb0bec5 : 0x212121), side * 1.8, 0.4, -0.9).rotation.z = side * -0.25; // wings
  }
  h.leftLeg.rotation.x = 0.25; // legs dangle
  h.rightLeg.rotation.x = 0.1;
  const heli = new THREE.Group();
  const bank = new THREE.Group();
  heli.add(bank);
  h.root.position.y = -2.5;
  bank.add(h.root);
  const prop = new THREE.Object3D(); // nothing spins
  bank.add(prop);
  const bay = new THREE.Object3D();
  bay.position.set(0, -2.5, 0);
  bank.add(bay);
  heli.userData = { bank, prop, tail: null, bay, missiles: [] };
  u.plane = heli;
  u.heli = true;
  u.muzzles = h.muzzles;
  u.spin = null;
  u.flyHeight = 8;
  u.tracer = bottom && level >= 3 ? 0xff6d00 : 0xffd740;
  return u;
}
const makeJetTrooperBottom = (level) => makeJetTrooper(level, true);

/**
 * Combat Drone: a charging pad, plus a quadcopter the view hovers above it. Top path: a longer AR
 * barrel (Lv 1), an ammo box (Lv 2), a spinning gatling (Lv 3), rocket pods (Lv 4), then the black
 * X22 with red glow (Lv 5). Bottom path: a sensor camera (Lv 1), extra ammo (Lv 2), then the Reaper
 * Drone, a fixed-wing UAV with missiles (Lv 3), a spotter laser (Lv 4) and P.A.V.E missiles (Lv 5).
 */
export function makeCombatDrone(level, bottom = false) {
  const u = makeThing();
  const { M } = u;
  const top = !bottom;
  part(u.body, boxGeo(3.0, 0.4, 3.0), M(0x37474f), 0, 0.2, 0);
  part(u.body, boxGeo(2.0, 0.06, 2.0), glowThing(u, 0x00e5ff), 0, 0.42, 0);
  part(u.body, boxGeo(0.8, 1.2, 0.5), M(0x263238), 1.2, 0.9, -1.2); // charger
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
  const dark = M(0x212121);
  const prop = new THREE.Object3D();
  bank.add(prop);
  const spin = [];
  const reaper = bottom && level >= 3;
  if (reaper) {
    const grey = M(0x9e9e9e);
    part(bank, boxGeo(0.9, 0.8, 4.4), grey, 0, 0, 0); // fuselage
    part(bank, boxGeo(0.8, 0.6, 0.8), grey, 0, 0.2, 2.4); // bulbous nose
    part(bank, boxGeo(8.0, 0.12, 0.8), grey, 0, 0.2, 0.2); // long thin wings
    for (const side of [-1, 1]) part(bank, boxGeo(1.6, 0.1, 0.6), grey, side * 0.7, 0.5, -2.0).rotation.z = side * 0.6; // V tail
    blurDisc(u, bank, 0.8, 0, 0, -2.3).rotation.x = Math.PI / 2; // pusher prop
    part(bank, boxGeo(0.5, 0.5, 0.5), dark, 0, -0.55, 1.6); // sensor ball
    part(bank, boxGeo(0.25, 0.25, 0.06), glowThing(u, level >= 4 ? 0xff1744 : 0x00e5ff), 0, -0.55, 1.86);
    for (const x of [-1.6, 1.6, ...(level >= 5 ? [-2.6, 2.6] : [])]) {
      part(bank, boxGeo(0.25, 0.25, 1.4), M(level >= 5 ? 0x37474f : 0x546e7a), x, -0.15, 0.3);
      part(bank, boxGeo(0.2, 0.2, 0.06), glowThing(u, 0xff3d00), x, -0.15, 1.02);
      point(x, -0.15, 1.05, muzzles);
    }
    missiles.push(...muzzles);
  } else {
    const x22 = top && level >= 5;
    const body = M(x22 ? 0x1a1a1a : 0x546e7a);
    part(bank, boxGeo(1.4, 0.6, 1.8), body, 0, 0, 0);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      part(bank, boxGeo(0.15, 0.15, 1.5), dark, x * 0.55, 0.1, z * 0.55).rotation.y = x * z * -Math.PI / 4; // arms
      part(bank, boxGeo(0.3, 0.3, 0.3), dark, x * 1.1, 0.2, z * 1.1);
      blurDisc(u, bank, 0.75, x * 1.1, 0.4, z * 1.1);
    }
    if (x22) for (const x of [-0.71, 0.71]) part(bank, boxGeo(0.05, 0.2, 1.6), glowThing(u, 0xff1744), x, 0, 0);
    const gun = new THREE.Group();
    gun.position.set(0, -0.5, 0.6);
    bank.add(gun);
    part(gun, boxGeo(0.4, 0.4, 0.6), dark, 0, 0, 0);
    if (top && level >= 3) {
      const barrels = new THREE.Group();
      barrels.position.set(0, 0, 0.3);
      barrels.rotation.x = Math.PI / 2;
      gun.add(barrels);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        part(barrels, boxGeo(0.07, 1.3, 0.07), x22 ? glowThing(u, 0xff1744) : dark, Math.cos(a) * 0.13, 0.65, Math.sin(a) * 0.13);
      }
      spin.push(barrels);
      point(0, -0.5, 2.2, muzzles);
    } else {
      const len = top && level >= 1 ? 1.4 : 0.9;
      part(gun, boxGeo(0.14, 0.14, len), dark, 0, 0, 0.3 + len / 2);
      point(0, -0.5, 0.9 + len, muzzles);
    }
    if (level >= 2) part(bank, boxGeo(0.5, 0.4, 0.6), M(0x4e5b31), 0.6, -0.45, -0.3); // ammo box
    if (bottom && level >= 1) {
      part(bank, boxGeo(0.4, 0.4, 0.4), dark, 0, -0.5, -0.5);
      part(bank, boxGeo(0.2, 0.2, 0.06), glowThing(u, 0x00e5ff), 0, -0.5, -0.28);
    }
    if (top && level >= 4) for (const side of [-1, 1]) {
      part(bank, boxGeo(0.4, 0.4, 1.1), M(0x37474f), side * 0.95, -0.35, 0.2);
      part(bank, boxGeo(0.3, 0.3, 0.06), glowThing(u, 0xff3d00), side * 0.95, -0.35, 0.78);
      point(side * 0.95, -0.35, 0.8, missiles);
    }
    if (x22) bank.scale.setScalar(1.25);
  }
  const bay = new THREE.Object3D();
  bay.position.set(0, -0.6, 0);
  bank.add(bay);
  heli.userData = { bank, prop, tail: null, bay, missiles };
  u.plane = heli;
  u.heli = true;
  u.muzzles = muzzles;
  u.spin = spin.length ? spin : null;
  u.flyHeight = reaper ? 12 : 7;
  u.tracer = top && level >= 5 ? 0xff1744 : 0xffd740;
  if (top && level >= 5) u.tracerWidth = 0.3;
  u.projectile = { color: 0x9e9e9e, size: 0.5 };
  return u;
}
const makeCombatDroneBottom = (level) => makeCombatDrone(level, true);

/**
 * Void Traitor (event): a dark knight with a glowing void sword. Lv 1 a longer blade, Lv 2 the
 * blade glows, Lv 3 an All Seeing Eye on the helm and chest, Lv 4 Void Armor with spiked shoulders,
 * Lv 5 the full Void Traitor: bigger, with wings, floating void rocks and an aura ring.
 */
export function makeVoidTraitor(level) {
  const full = level >= 5;
  const h = makeHumanoid({ skin: 0x9575cd, shirt: 0x1a0033, pants: 0x0b0014, arms: 0x311b92, face: 'none' });
  const { M } = h;
  const voidC = full ? 0xd500f9 : 0xaa00ff;
  const rune = glow(h, voidC);
  const plate = M(level >= 4 ? 0x120020 : 0x2a1a40);
  part(h.head, boxGeo(1.45, 1.45, 1.45), plate, 0, 0.65, 0); // helm
  part(h.head, boxGeo(1.0, 0.15, 0.1), rune, 0, 0.75, 0.74); // visor slit
  part(h.torso, boxGeo(2.2, 3.2 + level * 0.15, 0.12), M(0x1a0033), 0, -0.6, -0.6); // cape
  if (level >= 3) {
    part(h.head, boxGeo(0.35, 0.35, 0.1), glow(h, 0xff1744), 0, 1.05, 0.75); // All Seeing Eye
    part(h.torso, boxGeo(0.5, 0.5, 0.1), rune, 0, 0.4, 0.55);
  }
  if (level >= 4) {
    part(h.torso, boxGeo(2.2, 1.7, 1.2), plate, 0, 0.2, 0);
    for (const side of [-1, 1]) {
      part(h.torso, boxGeo(0.9, 0.6, 1.3), plate, side * 1.35, 1.1, 0);
      part(h.torso, boxGeo(0.25, 0.8, 0.25), rune, side * 1.5, 1.7, 0).rotation.z = side * -0.4; // spikes
    }
  }
  if (full) {
    for (const side of [-1, 1]) part(h.torso, boxGeo(2.8, 2.0, 0.12), M(0x0b0014), side * 1.8, 0.9, -0.75).rotation.z = side * 0.45; // wings
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      part(h.root, boxGeo(0.5, 0.45, 0.5), M(0x311b92), Math.cos(a) * 2.4, 4 + (i % 2) * 1.2, Math.sin(a) * 2.4).rotation.set(a, a, 0); // void rocks
    }
    const ring = part(h.root, cylGeo(2.8, 2.8, 0.06, 20), clearMat(h, voidC, 0.3), 0, 0.05, 0);
    ring.castShadow = false;
  }
  const sword = inHand(h);
  const bl = [2.0, 2.4, 2.6, 2.9, 3.2, 4.2][level];
  const bw = full ? 0.6 : 0.3 + level * 0.05;
  part(sword, boxGeo(0.25, 0.5, 0.25), M(0x111111), 0, -0.2, 0);
  part(sword, boxGeo(1.0 + level * 0.1, 0.14, 0.25), M(0x4a148c), 0, -0.45, 0);
  part(sword, boxGeo(bw, bl, 0.12), level >= 2 ? rune : M(0x5e35b1), 0, -0.5 - bl / 2, 0);
  setMuzzle(h, sword, 0, -0.5 - bl, 0);
  h.rightArm.rotation.set(-2.4, 0, 0.2);
  h.leftArm.rotation.set(-0.3, 0, -0.2);
  h.pose = { right: -2.4, left: -0.3, leftRecoil: 0 };
  h.swing = 2;
  h.melee = true;
  h.tracer = voidC;
  if (full) h.body.scale.setScalar(1.2);
  return h;
}

/** Void Traitor summons: Neurons (small and fast), the Void Empress (tall, double-bladed sword). */
export function makeVoidSoldier(model) {
  const empress = model === 'voidempress';
  const h = makeHumanoid({ skin: 0x7e57c2, shirt: empress ? 0x1a0033 : 0x4a148c, pants: 0x0b0014, arms: empress ? 0x311b92 : 0x4a148c, face: 'none' });
  const { M } = h;
  const rune = glow(h, 0xd500f9);
  for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.22, 0.14, 0.05), rune, x, 0.7, 0.62); // glowing eyes
  const hand = inHand(h);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  if (empress) {
    for (let i = 0; i < 5; i++) part(h.head, boxGeo(0.18, 0.5 + (i === 2 ? 0.3 : 0), 0.18), rune, -0.5 + i * 0.25, 1.4, 0); // crown
    part(h.torso, boxGeo(2.3, 3.6, 0.12), M(0x311b92), 0, -0.8, -0.6); // gown/cape
    part(hand, boxGeo(0.2, 1.0, 0.2), M(0x111111), 0, 0, 0); // staff grip
    part(hand, boxGeo(0.25, 2.0, 0.12), rune, 0, 1.4, 0); // blade up
    part(hand, boxGeo(0.25, 2.0, 0.12), rune, 0, -1.4, 0); // blade down
    h.size = 1.5;
  } else {
    for (const side of [-1, 1]) part(h.head, boxGeo(0.15, 0.6, 0.15), rune, side * 0.45, 1.4, 0).rotation.z = side * -0.4; // antennae
    part(hand, boxGeo(0.2, 0.7, 0.2), rune, 0, -0.3, 0); // claw
    h.size = 0.7;
  }
  setMuzzle(h, hand, 0, -0.5, 0);
  h.tracer = 0xd500f9;
  return h;
}

/** Void Tank: a big dark purple armored tank with a glowing void cannon. */
export function makeVoidTank(u) {
  const { M } = u;
  const hull = M(0x2a1040);
  const rune = glowThing(u, 0xd500f9);
  const tire = M(0x111111);
  part(u.body, boxGeo(4.2, 1.6, 6.2), hull, 0, 1.4, 0);
  for (const x of [-2.2, 2.2]) part(u.body, boxGeo(1.0, 1.5, 6.6), tire, x, 0.8, 0); // tracks
  for (const x of [-2.75, 2.75]) part(u.body, boxGeo(0.06, 0.2, 5.6), rune, x, 1.0, 0);
  part(u.body, boxGeo(3.4, 0.4, 0.6), M(0x111111), 0, 1.0, 3.3); // ram plow
  const t = turret(u, 2.8);
  part(t, boxGeo(3.0, 1.2, 3.2), M(0x1a0033), 0, 0.6, -0.3);
  part(t, boxGeo(0.6, 0.6, 3.8), M(0x311b92), 0, 0.7, 2.8);
  part(t, boxGeo(0.7, 0.2, 3.0), rune, 0, 1.05, 2.6);
  for (const side of [-1, 1]) part(t, boxGeo(0.3, 0.9, 0.3), rune, side * 1.2, 1.5, -0.8).rotation.z = side * -0.4;
  gunMuzzle(u, t, 0, 0.7, 4.8);
  u.height = 4.6;
  u.tracer = 0xd500f9;
  return u;
}

// ---------------------------------------------------------------- event towers (wave 5)

/**
 * MLRS (event): a six-wheeled rocket truck with a launcher box on the back that tilts up. Lv 1 a
 * second pod (12 tubes), Lv 2 a radar dish, Lv 3 red-tipped Heavy Missiles, Lv 4 a second radar,
 * Lv 5 Freedom Time: navy paint with red and white stripes and a star.
 */
export function makeMLRS(level) {
  const u = makeThing();
  const { M } = u;
  const free = level >= 5;
  const paint = M(free ? 0x1a237e : 0x556b2f);
  const dark = M(0x212121);
  const steel = M(0x37474f);
  part(u.body, boxGeo(3.0, 0.7, 7.4), steel, 0, 1.2, 0); // chassis
  for (const z of [-2.4, -0.6, 2.4]) for (const x of [-1.55, 1.55]) part(u.body, boxGeo(0.6, 1.3, 1.3), dark, x, 0.65, z); // wheels
  part(u.body, boxGeo(2.9, 2.0, 2.0), paint, 0, 2.5, 2.6); // cab
  part(u.body, boxGeo(2.6, 0.8, 0.08), M(0x90caf9), 0, 2.9, 3.62); // windshield
  for (const x of [-0.9, 0.9]) part(u.body, boxGeo(0.4, 0.25, 0.08), glow(u, 0xfff59d), x, 1.9, 3.62); // headlights
  // The launcher: a box of tubes on a turntable, tilted up toward the sky.
  const pod = new THREE.Group();
  pod.position.set(0, 2.0, -1.4);
  pod.rotation.x = -0.6;
  u.body.add(pod);
  const pods = level >= 1 ? [-0.75, 0.75] : [0];
  const tip = level >= 3 ? glow(u, 0xff3d00) : M(0x111111);
  for (const x of pods) {
    part(pod, boxGeo(1.4, 1.1, 3.6), paint, x, 0.6, 0);
    for (let c = 0; c < 3; c++) for (let r = 0; r < 2; r++) part(pod, boxGeo(0.32, 0.32, 0.1), tip, x - 0.4 + c * 0.4, 0.35 + r * 0.5, 1.82);
  }
  if (free) {
    // Freedom Time: red and white stripes down the pods and a white star.
    for (const x of pods) for (let i = 0; i < 3; i++) part(pod, boxGeo(1.42, 0.12, 3.62), M(i % 2 ? 0xffffff : 0xd50000), x, 0.85 + i * 0.13, 0);
    part(u.body, boxGeo(0.7, 0.7, 0.08), M(0xffffff), 0, 3.0, 1.58);
  }
  const radar = (x) => {
    part(u.body, boxGeo(0.15, 1.4, 0.15), steel, x, 4.2, 2.2);
    const dish = part(u.body, boxGeo(1.1, 1.1, 0.12), M(0xcfd8dc), x, 5.0, 2.2);
    dish.rotation.x = -0.5;
    part(u.body, boxGeo(0.2, 0.2, 0.2), glow(u, 0xff1744), x, 5.0, 2.32);
  };
  if (level >= 2) radar(level >= 4 ? -0.8 : 0);
  if (level >= 4) radar(0.8);
  setMuzzle(u, pod, 0, 0.6, 2.0);
  u.height = level >= 2 ? 5.5 : 4;
  u.projectile = { color: free ? 0xff1744 : 0xeceff1, size: level >= 3 ? 0.55 : 0.4, arc: 8 };
  u.tracer = 0xff7043;
  return u;
}

/**
 * Psycho Slayer (alternate event Commando form): a huge armored warrior with a Bolter gun and a
 * spiked mace. Lv 1 a sealed helmet, Lv 2 heavy chest armor, Lv 3 railguns on its back, Lv 4 a
 * white space suit with rocket pods, Lv 5 Psycho Warrior: black and red armor with a mortar tube.
 * A purple Dimension Shard marks the form.
 */
export function makePsychoSlayer(level) {
  const space = level === 4;
  const psycho = level >= 5;
  const armor = psycho ? 0x212121 : space ? 0xeceff1 : level >= 2 ? 0x455a64 : 0x5d6b3a;
  const trim = psycho ? 0xd50000 : space ? 0x1565c0 : 0xffb300;
  const h = makeHumanoid({ skin: 0xc68642, shirt: armor, pants: psycho ? 0x111111 : 0x37474f, arms: armor, face: 'soldier' });
  const { M } = h;
  const plate = M(armor);
  const trimM = M(trim);
  const eye = glow(h, psycho ? 0xff1744 : 0x76ff03);
  // Bulky armor: wide pauldrons, chest plate and big boots.
  for (const side of [-1, 1]) {
    part(h.torso, boxGeo(1.2, 0.9, 1.5), plate, side * 1.45, 0.95, 0);
    part(h.torso, boxGeo(1.25, 0.15, 1.55), trimM, side * 1.45, 1.42, 0);
  }
  part(h.torso, boxGeo(2.25, 1.6, 1.25), plate, 0, 0.25, 0);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.5, 0.65); // Dimension Shard
  for (const leg of [h.leftLeg, h.rightLeg]) part(leg, boxGeo(1.2, 0.8, 1.35), plate, 0, -1.6, 0.1);
  if (level >= 1) {
    part(h.head, boxGeo(1.45, 1.4, 1.45), plate, 0, 0.65, 0); // sealed helmet
    part(h.head, boxGeo(1.1, 0.25, 0.1), eye, 0, 0.72, 0.74);
  } else helmet(h, 0x3e4a2a);
  if (level >= 3) {
    // Railguns over the shoulders.
    for (const side of [-1, 1]) {
      part(h.torso, boxGeo(0.4, 0.4, 2.6), M(0x263238), side * 0.7, 1.6, -0.6);
      part(h.torso, boxGeo(0.45, 0.45, 0.2), glow(h, 0x40c4ff), side * 0.7, 1.6, 0.75);
    }
    part(h.torso, boxGeo(1.8, 1.4, 0.7), M(0x263238), 0, 0.3, -0.85); // power pack
  }
  if (level >= 4) {
    // Rocket pods on the back.
    for (const side of [-1, 1]) {
      part(h.torso, boxGeo(0.9, 0.9, 0.9), trimM, side * 1.3, 0.2, -0.9);
      for (const y of [0.0, 0.4]) part(h.torso, boxGeo(0.25, 0.25, 0.1), M(0x111111), side * 1.3, y, -0.42);
    }
  }
  if (psycho) {
    part(h.torso, boxGeo(0.8, 2.6, 0.8), M(0x424242), 0, 1.6, -1.0).rotation.x = -0.3; // mortar tube
    part(h.torso, boxGeo(0.9, 0.2, 0.9), eye, 0, 2.85, -1.4);
    for (const x of [-0.45, 0, 0.45]) part(h.head, boxGeo(0.2, 0.6, 0.2), trimM, x, 1.55, 0); // crest
  }
  // Bolter in the right hand, spiked mace in the left.
  const gun = holdLongGun(h, 2.2, M(0x263238));
  part(gun, boxGeo(0.6, 1.0, 0.75), trimM, 0, -0.7, 0);
  part(gun, boxGeo(0.5, 0.3, 0.55), M(0x111111), 0, -2.2, 0);
  const mace = new THREE.Group();
  mace.position.set(0, -1.9, 0);
  h.leftArm.add(mace);
  part(mace, boxGeo(0.25, 1.6, 0.25), M(0x5d4037), 0, -0.6, 0);
  part(mace, boxGeo(0.9, 0.9, 0.9), M(psycho ? 0x424242 : 0x78909c), 0, -1.6, 0);
  for (const [x, y, z] of [[0.55, -1.6, 0], [-0.55, -1.6, 0], [0, -1.6, 0.55], [0, -1.6, -0.55], [0, -2.15, 0]]) part(mace, boxGeo(0.2, 0.2, 0.2), trimM, x, y, z);
  h.leftArm.rotation.set(-0.5, 0, -0.3);
  h.pose = { right: -Math.PI / 2, left: -0.5, leftRecoil: 0.25 };
  h.root.scale.setScalar(1.25); // a big warrior
  h.tracer = psycho ? 0xff5252 : 0xffd740;
  h.tracerWidth = 0.22;
  return h;
}

/**
 * Bubble Blower (alternate Cryomancer form): a cheerful kid with a bubble wand. Lv 1 gloves, Lv 2
 * a chunky bubble gun with a soap tank, Lv 3 big muscles, Lv 4 a second tank, Lv 5 Super Bubble
 * Man: a cape and a bubble helmet. A purple Dimension Shard marks the form.
 */
export function makeBubbleBlower(level) {
  const shirt = [0x4fc3f7, 0x4fc3f7, 0x29b6f6, 0x0288d1, 0x0277bd, 0xec407a][level];
  const h = makeHumanoid({ skin: 0xf1c27d, shirt, pants: 0x3949ab, arms: level >= 3 ? 0xf1c27d : shirt });
  const { M } = h;
  const soap = glow(h, 0xb3e5fc);
  const pink = M(0xf48fb1);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), glow(h, 0xb388ff), -0.55, 0.5, 0.52); // Dimension Shard
  part(h.head, boxGeo(1.3, 0.3, 1.3), M(0xffeb3b), 0, 1.25, 0); // cap
  part(h.head, boxGeo(1.3, 0.12, 0.6), M(0xffeb3b), 0, 1.15, 0.8); // cap brim
  if (level >= 1) for (const arm of [h.leftArm, h.rightArm]) part(arm, boxGeo(1.1, 0.6, 1.1), pink, 0, -1.8, 0); // gloves
  if (level >= 3) for (const arm of [h.leftArm, h.rightArm]) part(arm, boxGeo(1.25, 0.9, 1.25), M(0xf1c27d), 0, -0.6, 0); // big muscles
  const tanks = level >= 4 ? [-0.5, 0.5] : level >= 2 ? [0] : [];
  for (const x of tanks) {
    part(h.torso, boxGeo(0.75, 1.6, 0.75), M(0xe1f5fe), x, 0.1, -0.9);
    part(h.torso, boxGeo(0.6, 1.2, 0.1), soap, x, 0.1, -1.28);
  }
  let muzzle;
  if (level >= 2) {
    const gun = holdLongGun(h, 1.6 + (level >= 4 ? 0.4 : 0), pink);
    const len = 1.6 + (level >= 4 ? 0.4 : 0);
    part(gun, boxGeo(0.8, 0.8, 0.8), M(0x80deea), 0, -0.5, 0); // bubble chamber
    part(gun, boxGeo(0.6, 0.15, 0.6), soap, 0, -len, 0);
    muzzle = h.muzzles[0];
  } else {
    // A plain bubble wand: a stick with a ring on the end.
    const wand = new THREE.Group();
    wand.position.set(0, -1.9, 0);
    h.rightArm.add(wand);
    part(wand, boxGeo(0.15, 1.2, 0.15), pink, 0, -0.6, 0);
    for (const [x, y] of [[0.35, 0], [-0.35, 0], [0, 0.35], [0, -0.35]]) part(wand, boxGeo(0.2, 0.2, 0.12), soap, x, -1.55 + y, 0);
    h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-0.3, 0, -0.2);
    muzzle = setMuzzle(h, wand, 0, -1.6, 0);
    h.pose = { right: -Math.PI / 2, left: -0.3, leftRecoil: 0 };
  }
  if (level >= 5) {
    part(h.torso, boxGeo(2.0, 2.6, 0.12), M(0xf06292), 0, -0.3, -0.62); // cape
    const helm = part(h.head, new THREE.SphereGeometry(1.05, 12, 10), glow(h, 0xb3e5fc), 0, 0.6, 0); // bubble helmet
    helm.material.transparent = true;
    helm.material.opacity = 0.35;
    helm.castShadow = false;
  }
  h.muzzles = [muzzle];
  h.tracer = 0xb3e5fc;
  h.tracerWidth = 0.3;
  return h;
}

/** Bubble Companion (Bubble Blower unit): a round little bubble person with a smile. */
export function makeBubbleBuddy() {
  const h = makeHumanoid({ skin: 0xb3e5fc, shirt: 0x81d4fa, pants: 0x4fc3f7, arms: 0x81d4fa });
  const bub = part(h.body, new THREE.SphereGeometry(2.4, 12, 10), glow(h, 0xe1f5fe), 0, 3.2, 0);
  bub.material.transparent = true;
  bub.material.opacity = 0.3;
  bub.castShadow = false;
  h.rightArm.rotation.set(-0.3, 0, 0.3);
  h.leftArm.rotation.set(-0.3, 0, -0.3);
  h.muzzles = [];
  h.tracer = 0xb3e5fc;
  h.size = 0.8;
  return h;
}

/**
 * Scarecrow (event): a straw-stuffed scarecrow on a wooden post with a burlap face and a straw
 * hat. Every upgrade adds a patch, then a crow, a pumpkin lantern and finally a crown of straw.
 */
export function makeScarecrow(level) {
  const u = makeThing();
  const { M } = u;
  const wood = M(0x6d4c41);
  const straw = M(0xfdd835);
  const shirt = M([0x8d6e63, 0x8d6e63, 0x795548, 0x6d4c41, 0x5d4037, 0x4e342e][level]);
  part(u.body, boxGeo(0.4, 5.4, 0.4), wood, 0, 2.7, 0); // post
  part(u.body, boxGeo(5.0, 0.35, 0.35), wood, 0, 4.0, 0); // crossbar
  part(u.body, boxGeo(2.0, 2.2, 1.0), shirt, 0, 3.4, 0); // shirt
  for (const side of [-1, 1]) {
    part(u.body, boxGeo(1.4, 0.8, 0.8), shirt, side * 1.6, 4.0, 0); // sleeves
    part(u.body, boxGeo(0.5, 0.5, 0.5), straw, side * 2.5, 4.0, 0); // straw hands
  }
  part(u.body, boxGeo(0.5, 0.6, 0.4), straw, 0, 2.1, 0); // straw poking out the bottom
  part(u.body, boxGeo(1.3, 1.3, 1.3), M(0xd7ccc8), 0, 5.2, 0); // burlap head
  for (const x of [-0.3, 0.3]) part(u.body, boxGeo(0.22, 0.22, 0.05), M(0x212121), x, 5.35, 0.66); // button eyes
  part(u.body, boxGeo(0.7, 0.1, 0.05), M(0x212121), 0, 4.9, 0.66); // stitched mouth
  part(u.body, boxGeo(2.2, 0.15, 2.2), straw, 0, 5.9, 0); // hat brim
  part(u.body, boxGeo(1.2, 0.6, 1.2), M(0xf9a825), 0, 6.25, 0); // hat top
  const patches = [[0.5, 3.8], [-0.5, 3.0], [0.4, 2.7]];
  for (let i = 0; i < Math.min(level, 3); i++) part(u.body, boxGeo(0.5, 0.5, 0.06), M([0xc62828, 0x1565c0, 0x2e7d32][i]), patches[i][0], patches[i][1], 0.52);
  if (level >= 4) {
    // A crow sitting on the crossbar.
    part(u.body, boxGeo(0.5, 0.5, 0.8), M(0x111111), 2.0, 4.45, 0);
    part(u.body, boxGeo(0.15, 0.15, 0.3), M(0xffa000), 2.0, 4.5, 0.5);
  }
  if (level >= 5) {
    part(u.body, boxGeo(0.9, 0.8, 0.9), M(0xff6f00), -2.5, 3.4, 0); // pumpkin lantern
    part(u.body, boxGeo(0.4, 0.2, 0.05), glow(u, 0xffd740), -2.5, 3.45, 0.46);
    for (const x of [-0.4, 0, 0.4]) part(u.body, boxGeo(0.2, 0.5, 0.2), straw, x, 6.75, 0); // straw crown
  }
  u.height = 6.5;
  return u;
}

/**
 * Darter (free alternate Scout form): a kid in a hoodie throwing darts. Lv 1 dart quiver on the
 * hip, Lv 2 a headband, Lv 3 goggles and fire-tipped darts, Lv 4 a jacket with glowing blue
 * shock darts. A purple Dimension Shard emblem marks it as an alternate form.
 */
export function makeDarter(level) {
  const shock = level >= 4;
  const fire = level >= 3;
  const shirt = shock ? 0x1a237e : 0x00897b;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt, pants: 0x37474f, arms: shirt, face: 'soldier' });
  const { M } = h;
  const shard = glow(h, 0xb388ff);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, 0.55, 0.45, 0.52);
  part(h.torso, boxGeo(1.6, 0.6, 0.3), M(shock ? 0x283593 : 0x00796b), 0, 0.85, -0.6); // hood
  const tip = shock ? glow(h, 0x40c4ff) : fire ? glow(h, 0xff7043) : M(0x9e9e9e);
  if (level >= 1) {
    // Dart quiver on the hip
    part(h.torso, boxGeo(0.5, 1.0, 0.5), M(0x5d4037), -1.15, -0.6, 0);
    for (const z of [-0.12, 0.12]) part(h.torso, boxGeo(0.08, 0.5, 0.08), tip, -1.15, 0.1, z);
  }
  if (level >= 2) part(h.head, boxGeo(1.28, 0.22, 1.28), M(0xc62828), 0, 1.0, 0); // headband
  if (fire) {
    part(h.head, boxGeo(1.25, 0.28, 0.2), M(0x263238), 0, 0.72, 0.68);
    for (const x of [-0.27, 0.27]) part(h.head, boxGeo(0.34, 0.2, 0.05), shard, x, 0.72, 0.79);
  }
  if (shock) {
    part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x0d1450), 0, 0.05, 0); // jacket
    part(h.torso, boxGeo(0.12, 1.5, 0.05), glow(h, 0x40c4ff), 0, 0, 0.6); // glowing zip
  }
  // A dart held point-first in the raised right hand.
  const hand = new THREE.Group();
  hand.position.set(0, -2.1, 0);
  h.rightArm.add(hand);
  part(hand, boxGeo(0.12, 0.7, 0.12), M(0x8d6e63), 0, -0.2, 0); // shaft
  part(hand, boxGeo(0.3, 0.25, 0.05), M(shock ? 0x40c4ff : 0xffeb3b), 0, 0.15, 0); // flights
  part(hand, boxGeo(0.08, 0.3, 0.08), tip, 0, -0.65, 0); // point
  setMuzzle(h, hand, 0, -0.6, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -2.8, left: -1.0, leftRecoil: 0 };
  h.swing = 1.9;
  h.flight = { color: shock ? 0x40c4ff : fire ? 0xff7043 : 0xffeb3b, size: 0.25 };
  h.tracer = h.flight.color;
  return h;
}

/**
 * Firecracker (free alternate Grenadier form): a festive thrower with a red firecracker and a lit
 * fuse. Lv 1 a sash of firecrackers, Lv 2 a red cap, Lv 3 a second firecracker in the left hand,
 * Lv 4 goggles, Lv 5 a gold dragon-trim jacket and a bundle of three.
 */
export function makeFirecracker(level) {
  const finale = level >= 5;
  const shirt = finale ? 0xb71c1c : 0xe53935;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x212121, arms: shirt, face: 'soldier' });
  const { M } = h;
  const shard = glow(h, 0xb388ff);
  const red = M(0xd50000);
  const gold = M(0xffc107);
  const fuse = glow(h, 0xffeb3b);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, 0.55, 0.45, 0.52);
  const cracker = (parent, x, y) => {
    part(parent, boxGeo(0.28, 0.75, 0.28), red, x, y, 0);
    part(parent, boxGeo(0.3, 0.1, 0.3), gold, x, y + 0.3, 0);
    part(parent, boxGeo(0.05, 0.3, 0.05), fuse, x, y - 0.5, 0);
  };
  if (level >= 1) {
    const sash = part(h.torso, boxGeo(0.3, 2.5, 1.12), gold, 0, 0, 0);
    sash.rotation.z = -0.7;
    for (const t of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.22, 0.45, 0.22), red, t * 0.75, t * 0.8, 0.65);
  }
  if (level >= 2) {
    part(h.head, boxGeo(1.32, 0.45, 1.32), M(0xc62828), 0, 1.3, 0); // cap
    part(h.head, boxGeo(1.1, 0.12, 0.7), M(0xc62828), 0, 1.1, 0.85);
    part(h.head, boxGeo(0.3, 0.3, 0.06), shard, 0, 1.32, 0.67);
  }
  if (level >= 4) {
    part(h.head, boxGeo(1.25, 0.28, 0.2), M(0x263238), 0, 0.72, 0.68);
    for (const x of [-0.27, 0.27]) part(h.head, boxGeo(0.34, 0.2, 0.05), M(0xffb74d), x, 0.72, 0.79);
  }
  if (finale) {
    part(h.torso, boxGeo(2.15, 0.2, 1.15), gold, 0, 0.9, 0); // gold collar
    part(h.torso, boxGeo(2.15, 0.15, 1.15), gold, 0, -0.95, 0); // gold hem
    part(h.torso, boxGeo(0.5, 1.2, 0.05), gold, -0.45, 0.1, 0.58); // dragon trim
  }
  if (level >= 3) cracker(h.leftArm, 0, -2.3); // Double Pack: a second one ready
  const hand = new THREE.Group();
  hand.position.set(0, -2.1, 0);
  h.rightArm.add(hand);
  if (finale) for (const x of [-0.3, 0, 0.3]) cracker(hand, x, -0.2);
  else cracker(hand, 0, -0.2);
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -2.8, left: -1.0, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = { color: 0xd50000, size: 0.35, arc: 3 };
  return h;
}

/**
 * Quarterer (alternate Soldier form): a gunslinger with two pistols. Lv 1 fingerless gloves,
 * Lv 2 a bandana, Lv 3 shades and holsters, Lv 4 a long duster coat with drum-mag pistols,
 * Lv 5 a black coat with purple-trimmed guns.
 */
export function makeQuarterer(level) {
  const storm = level >= 5;
  const coat = level >= 4;
  const shirt = storm ? 0x1c1726 : coat ? 0x5d4037 : 0x546e7a;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: storm ? 0x14101c : 0x263238, arms: shirt, face: 'soldier' });
  const { M } = h;
  const shard = glow(h, 0xb388ff);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, 0.55, 0.45, 0.52);
  if (level >= 1) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.05, 0.45, 1.05), M(0x212121), 0, -1.75, 0); // gloves
  if (level >= 2) {
    part(h.head, boxGeo(1.32, 0.35, 1.32), M(storm ? 0x4a148c : 0xb71c1c), 0, 1.2, 0); // bandana
    part(h.head, boxGeo(0.3, 0.5, 0.2), M(storm ? 0x4a148c : 0xb71c1c), 0.3, 1.0, -0.72); // knot
  }
  if (level >= 3) {
    part(h.head, boxGeo(1.25, 0.1, 0.08), M(0x9e9e9e), 0, 0.8, 0.63);
    for (const x of [-0.27, 0.27]) part(h.head, boxGeo(0.42, 0.3, 0.07), M(0x111111), x, 0.66, 0.63);
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.85, 0); // gun belt
    for (const x of [-1.1, 1.1]) part(h.torso, boxGeo(0.35, 0.7, 0.5), M(0x3e2723), x, -1.2, 0.1); // holsters
  }
  if (coat) {
    part(h.torso, boxGeo(2.05, 1.8, 0.2), M(storm ? 0x14101c : 0x4e342e), 0, -1.6, -0.45); // duster tails
    part(h.torso, boxGeo(2.2, 0.35, 1.2), M(storm ? 0x14101c : 0x4e342e), 0, 0.85, 0); // collar
  }
  const gunOpts = { body: storm ? 0x37474f : 0x2b2b2b, trim: storm ? 0xb388ff : null, laser: level >= 3 };
  const muzzles = [addHandgun(h, h.rightArm, gunOpts), addHandgun(h, h.leftArm, gunOpts)];
  if (coat) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(0.45, 0.45, 0.45), M(0x424242), 0, -2.5, -0.35); // drum mags
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.08);
  h.leftArm.rotation.set(-Math.PI / 2, 0, -0.08);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
  h.muzzles = muzzles;
  h.tracer = storm ? 0xb388ff : 0xffe066;
  return h;
}

/**
 * Penetrator (alternate Sniper form): a crossbowman with a heavy bolt thrower. Lv 1 a quiver of
 * flaming bolts, Lv 2 a hood and bracers, Lv 3 a longer bow with steel limbs, Lv 4 a dark
 * siege crossbow with purple-glowing string.
 */
export function makePenetrator(level) {
  const siege = level >= 4;
  const shirt = siege ? 0x1c1726 : 0x33691e;
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: siege ? 0x14101c : 0x3e2723, arms: shirt, face: 'soldier' });
  const { M } = h;
  const shard = glow(h, 0xb388ff);
  const wood = M(siege ? 0x263238 : level >= 3 ? 0x5d4037 : 0x795548);
  part(h.torso, boxGeo(0.35, 0.35, 0.06), shard, 0.55, 0.45, 0.52);
  if (level >= 1) {
    // Quiver of flaming bolts on the back
    part(h.torso, boxGeo(0.6, 1.6, 0.5), M(0x4e342e), 0.5, 0.2, -0.85).rotation.z = 0.3;
    for (const x of [0.35, 0.6]) part(h.torso, boxGeo(0.1, 0.35, 0.1), glow(h, 0xff7043), x + 0.25, 1.1, -0.85);
  }
  if (level >= 2) {
    const hood = M(siege ? 0x14101c : 0x1b5e20);
    part(h.head, boxGeo(1.4, 1.35, 1.4), hood, 0, 0.65, -0.08);
    part(h.head, boxGeo(0.6, 0.4, 0.4), hood, 0, 1.3, -0.65);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.05, 0.6, 1.05), M(0x6d4c41), 0, -1.5, 0); // bracers
  } else {
    part(h.head, boxGeo(1.38, 0.45, 1.38), M(0x558b2f), 0, 1.3, 0); // cap
    part(h.head, boxGeo(0.3, 0.3, 0.06), shard, 0, 1.32, 0.7);
  }
  // The crossbow: a stock along the arm with limbs across its front end.
  const len = level >= 2 ? 3.2 : 2.8;
  const gun = holdLongGun(h, len, wood);
  const span = level >= 3 ? 3.4 : 2.8;
  const limb = M(level >= 3 ? 0x90a4ae : 0x6d4c41);
  for (const side of [-1, 1]) {
    const l = part(gun, boxGeo(span / 2, 0.2, 0.25), limb, (side * span) / 4, -len + 0.5, 0);
    l.rotation.z = side * 0.18;
  }
  part(gun, boxGeo(span * 0.95, 0.05, 0.05), siege ? glow(h, 0xb388ff) : M(0xeeeeee), 0, -len + 0.85, 0); // string
  part(gun, boxGeo(0.12, 1.4, 0.12), M(0xbdbdbd), 0, -len + 0.3, 0.25); // loaded bolt
  part(gun, boxGeo(0.3, 0.6, 0.4), wood, 0, 0.2, -0.05); // butt
  if (siege) part(gun, boxGeo(0.26, 1.2, 0.32), M(0x1a1a1a), 0, -1.2, 0.38); // scope
  h.tracer = siege ? 0xb388ff : 0xd7ccc8;
  return h;
}

export const TOWER_MODELS = {
  scout: makeScout,
  scoutClassic: makeScoutClassic,
  scoutDarter: makeDarter,
  paintballer: makePaintballer,
  tweeter: makeTweeter,
  cowboy: makeCowboy,
  soldier: makeSoldier,
  soldierClassic: makeSoldierClassic,
  soldierQuarterer: makeQuarterer,
  soldierRanger: makeSoldierRanger,
  soldierRangerBottom: makeSoldierRangerBottom,
  operator: makeOperatorTower,
  operatorBottom: makeOperatorBottom,
  marksman: makeMarksman,
  commando: makeCommando,
  goldScoutBase: makeGoldScout,
  goldCommando: makeGoldCommando,
  commandoMinigunner: makeMinigunner,
  aviator: makeAviator,
  phaser: makePhaser,
  railgunner: makeRailgunner,
  railgunnerRanger: makeRanger,
  sniper: makeSniper,
  sniperClassic: makeSniperClassic,
  sniperPenetrator: makePenetrator,
  sniperTactical: makeSniperTactical,
  sniperTacticalBottom: makeSniperTacticalBottom,
  enforcer: makeEnforcer,
  enforcerWarden: makeWarden,
  merc: makeMercenary,
  grenadier: makeGrenadier,
  grenadierDemo: makeGrenadierDemo,
  grenadierFirecracker: makeFirecracker,
  grenadierAssault: makeGrenadierAssault,
  grenadierAssaultBottom: makeGrenadierAssaultBottom,
  frost: makeFrost,
  frostFreezer: makeFrostFreezer,
  rocketeer: makeRocketeer,
  mortar: makeMortar,
  flamethrower: makeFlamethrower,
  shotgunner: makeShotgunner,
  plasma: makePlasma,
  plasmaPulse: makePlasmaPulse,
  boomerang: makeBoomerang,
  slime: makeSlime,
  assassin: makeAssassin,
  brawler: makeBrawler,
  patrol: makePatrol,
  patrolMilitary: makeMilitaryBase,
  patrolArmored: makeArmoredFactory,
  patrolArmoredBottom: makeArmoredFactoryBottom,
  barracks: makeBarracks,
  barracksField: makeFieldBarracks,
  barracksFieldBottom: makeFieldBarracksBottom,
  zed: makeZed,
  farm: makeFarm,
  commander: makeCommander,
  goldCommander: makeGoldCommander,
  commanderClassic: makeCommanderClassic,
  dj: makeDJ,
  djBooth: makeDJBooth,
  anarchist: makeAnarchist,
  mercMilitant: makeMilitant,
  mercLaser: makeLaserGunner,
  mercLaserBottom: makeLaserGunnerBottom,
  marksmanHunter: makeHunter,
  shotgunnerPump: makeShotgunnerPump,
  shotgunnerCombat: makeShotgunnerCombat,
  shotgunnerCombatBottom: makeShotgunnerCombatBottom,
  frostRanger: makeFrostRanger,
  frostRangerBottom: makeFrostRangerBottom,
  flamethrowerPyro: makePyromancer,
  aviatorAce: makeAviatorAce,
  rocketeerMissile: makeRocketeerMissile,
  rocketeerTrooper: makeRocketeerTrooper,
  rocketeerTrooperBottom: makeRocketeerTrooperBottom,
  farmFruit: makeFarmFruit,
  farmAirdrop: makeFarmAirdrop,
  farmAirdropBottom: makeFarmAirdropBottom,
  medic: makeMedic,
  medicBeam: makeMedicBeam,
  medicBeamBottom: makeMedicBeamBottom,
  djEdj: makeEDJ,
  djEdjBottom: makeEDJBottom,
  electro: makeElectro,
  trapper: makeTrapper,
  mineLayer: makeMineLayer,
  mineLayerBottom: makeMineLayerBottom,
  crookBoss: makeCrookBoss,
  pursuit: makePursuit,
  pursuitBottom: makePursuitBottom,
  pursuitHeli: makeHelicopter,
  pursuitHeliBottom: makeHelicopterBottom,
  mobster: makeMobster,
  mobsterBottom: makeMobsterBottom,
  zedBehemoth: makeBehemothFactory,
  zedBehemothBottom: makeBehemothFactoryBottom,
  warMachine: makeWarMachineFactory,
  warMachineBottom: makeWarMachineFactoryBottom,
  gatling: makeGatling,
  gatlingMachine: makeMachineGunner,
  gatlingMachineBottom: makeMachineGunnerBottom,
  turret: makeTurret,
  mortarClassic: makeMortarClassic,
  mortarArtillery: (level) => makeArtillery(level),
  mortarArtilleryBottom: (level) => makeArtillery(level, true),
  electroTrooper: makeShockTrooper,
  mercenary: makeMercBase,
  necromancer: makeNecromancer,
  engineer: makeEngineer,
  hacker: makeHacker,
  hackerBottom: makeHackerBottom,
  phaserAccel: makeAccelerator,
  john: makeJohn,
  johnBottom: makeJohnBottom,
  commandoJuggernaut: makeJuggernaut,
  commandoJuggernautBottom: makeJuggernautBottom,
  railgunnerLaser: makeLaserRailgunner,
  railgunnerLaserBottom: makeLaserRailgunnerBottom,
  enforcerSlammer: makeSlammer,
  enforcerSlammerBottom: makeSlammerBottom,
  turretXwm: makeXwm,
  turretXwmBottom: makeXwmBottom,
  sentry: makeSentryTower,
  sentryBottom: makeSentryTowerBottom,
  aaTurret: makeAATurret,
  aaTurretBottom: makeAATurretBottom,
  patrolBoat: makePatrolBoat,
  patrolBoatBottom: makePatrolBoatBottom,
  ghost: makeGhost,
  ghostBottom: makeGhostBottom,
  toxicnator: makeToxicnator,
  toxicnatorBottom: makeToxicnatorBottom,
  toxicnatorSaboteur: makeSaboteur,
  tesla: makeTesla,
  elf: makeElf,
  hallowboomer: makeHallowboomer,
  graveyard: makeGraveyard,
  sleeter: makeSleeter,
  snowballer: makeSnowballer,
  huntsman: makeHuntsman,
  archer: makeArcher,
  knifer: makeKnifer,
  stunner: makeStunner,
  harpoonHunter: makeHarpoonHunter,
  gladiator: makeGladiator,
  eventCommando: makeEventCommando,
  kniferSlasher: makeSlasher,
  sleeterBlaster: makeFrostBlaster,
  flameTrooper: makeFlameTrooper,
  gooGunner: makeGooGunner,
  frostBlaster: makeCryoBlaster,
  frostBlasterBottom: makeCryoBlasterBottom,
  cryoMortar: makeCryoMortar,
  archerBow: makeBowmaster,
  swarmer: makeSwarmer,
  toxicGunner: makeToxicGunner,
  sledger: makeSledger,
  sledgerIce: makeIceBreaker,
  cryoHeli: makeCryoHeli,
  executioner: makeExecutioner,
  elfCamp: makeElfCamp,
  relic: makeRelic,
  jester: makeJester,
  cryomancer: makeCryomancer,
  hallowboomerPunk: makeHallowPunk,
  harvester: makeHarvester,
  snowballerFrost: makeSnowballerFrost,
  elementalist: makeElementalist,
  fireworkTech: makeFireworkTech,
  biologist: makeBiologist,
  warlock: makeWarlock,
  spotlight: makeSpotlightTech,
  starCannon: makeStarCannon,
  evoOperator: makeOperator,
  evoBreacher: (level) => makeBreacher(level),
  evoBreacherBottom: (level) => makeBreacher(level, true),
  evoKingpin: (level) => makeKingpin(level),
  evoKingpinBottom: (level) => makeKingpin(level, true),
  evoTitan: (level) => makeTitan(level),
  evoTitanBottom: (level) => makeTitan(level, true),
  warship: makeWarship,
  warshipBottom: makeWarshipBottom,
  shieldTower: makeShieldTower,
  shieldTowerBottom: makeShieldTowerBottom,
  oilDerrick: makeOilDerrick,
  oilDerrickBottom: makeOilDerrickBottom,
  combatMedic: makeCombatMedic,
  combatMedicBottom: makeCombatMedicBottom,
  refractor: makeRefractor,
  refractorBottom: makeRefractorBottom,
  scoutHeli: makeScoutHeli,
  noobTuber: makeNoobTuber,
  stinger: makeStinger,
  jetTrooper: makeJetTrooper,
  jetTrooperBottom: makeJetTrooperBottom,
  combatDrone: makeCombatDrone,
  combatDroneBottom: makeCombatDroneBottom,
  voidTraitor: makeVoidTraitor,
  mlrs: makeMLRS,
  eventCommandoPsycho: makePsychoSlayer,
  cryomancerBubble: makeBubbleBlower,
  scarecrow: makeScarecrow,
  ...TOWER_MODELS_A,
  ...TOWER_MODELS_B,
  ...TOWER_MODELS_C,
  ...TOWER_MODELS_D,
  ...TOWER_MODELS_E,
  // Wave 9 hero towers (see herotowers.js).
  ...TOWER_MODELS_F,
  ...TOWER_MODELS_G,
  ...TOWER_MODELS_H,
  // Wave 10 (newmodels/i.js): last, so its scarecrow / barracks / knifer reworks win.
  ...TOWER_MODELS_I,
};

// Crosspath towers (wave 8): every Top / Bottom combo type draws its form's model for that combo.
for (const [type, def] of Object.entries(TOWERS)) {
  if (!def.cross) continue;
  const make = CROSS_MODELS[def.branchOf ?? type];
  if (!make) continue;
  TOWER_MODELS[type] = (level) => {
    const [a, b] = def.combos[Math.min(level, def.combos.length - 1)];
    return make(a, b);
  };
}

// Golden perk towers: the model of the tower they are the golden version of, in gold.
// goldFx (goldtowers.js): plus a golden mist, star particles and level tints (ruby, diamond...).
for (const [type, def] of Object.entries(TOWERS)) {
  if (def.goldOf && !TOWER_MODELS[type]) {
    const last = TOWERS[def.goldOf].levels.length - 1; // the Golden Pyromancer has one more level than the Pyromancer
    TOWER_MODELS[type] = (level) => goldify(TOWER_MODELS[def.goldOf](Math.min(level, last)));
  }
  if (def.goldFx && TOWER_MODELS[type]) {
    const make = TOWER_MODELS[type];
    TOWER_MODELS[type] = (level) => goldShine(make(level), def.goldFx, level);
  }
}
// Bottom paths of golden towers: the golden version of the normal form's Bottom path model.
for (const [type, def] of Object.entries(TOWERS)) {
  if (TOWER_MODELS[type] || !def.branchOf) continue;
  const base = TOWERS[TOWERS[def.branchOf]?.goldOf]; // the normal form the golden root is made from
  const make = base?.branch && TOWER_MODELS[base.branch];
  if (!make) continue;
  const last = TOWERS[base.branch].levels.length - 1;
  TOWER_MODELS[type] = (level) => goldify(make(Math.min(level, last)));
}

export function makeZombie(def) {
  const h = makeHumanoid({ skin: def.skin, shirt: def.shirt, pants: def.pants, face: def.face ?? 'zombie' });
  const { M } = h;
  if (def.helmet) {
    part(h.head, boxGeo(1.4, 0.7, 1.4), M(0x78909c), 0, 1.28, 0);
    part(h.torso, boxGeo(2.2, 1.2, 1.2), M(0x607d8b), 0, 0.3, 0); // chest plate
  }
  if (def.hood) {
    part(h.head, boxGeo(1.4, 1.35, 1.25), M(0x1a1f2e), 0, 0.68, -0.1);
  }
  if (def.robot) {
    // Android: metal visor with a glowing eye strip, antenna and a chest panel.
    const metal = M(0x78909c);
    part(h.head, boxGeo(1.3, 0.5, 0.12), metal, 0, 0.7, 0.62);
    part(h.head, boxGeo(1.0, 0.18, 0.08), glow(h, def.robot), 0, 0.72, 0.69);
    part(h.head, boxGeo(0.12, 0.7, 0.12), metal, 0.35, 1.5, 0);
    part(h.head, boxGeo(0.25, 0.25, 0.25), glow(h, def.robot), 0.35, 1.9, 0);
    part(h.torso, boxGeo(1.0, 0.8, 0.08), metal, 0, 0.2, 0.52);
    part(h.torso, boxGeo(0.25, 0.25, 0.06), glow(h, def.robot), -0.2, 0.3, 0.57);
  }
  if (def.lead) {
    // Lead Zombie: dull grey lead plates bolted over the head, chest and shins.
    const lead = M(0x607d8b);
    const rivet = M(0x37474f);
    part(h.head, boxGeo(1.4, 0.55, 1.4), lead, 0, 1.25, 0);
    part(h.head, boxGeo(1.4, 0.2, 0.1), lead, 0, 0.95, 0.66); // brow plate
    part(h.torso, boxGeo(2.2, 1.6, 1.25), lead, 0, 0.15, 0);
    for (const x of [-0.6, 0.6]) part(h.torso, boxGeo(0.15, 0.15, 0.08), rivet, x, 0.7, 0.66);
    part(h.rightLeg, boxGeo(1.1, 0.9, 1.1), lead, 0, -1.4, 0);
    part(h.leftLeg, boxGeo(1.1, 0.9, 1.1), lead, 0, -1.4, 0);
  }
  if (def.wings) {
    // Flyer: leathery bat wings on its back (flapped by the view).
    const wm = M(def.wings);
    h.wings = [];
    for (const side of [-1, 1]) {
      const w = new THREE.Group();
      w.position.set(side * 0.5, 0.6, -0.55);
      h.torso.add(w);
      part(w, boxGeo(2.4, 1.6, 0.12), wm, side * 1.2, 0, 0);
      part(w, boxGeo(0.6, 0.9, 0.12), wm, side * 2.2, -1.0, 0); // wing tip
      h.wings.push(w);
    }
  }
  if (def.boss && !def.look && !def.crystal && !def.insane && !def.vlook && !def.mlook && !def.flook && !def.xlook && !def.ilook && !def.blook) {
    const spikeM = M(0xb0bec5);
    part(h.torso, boxGeo(0.7, 0.5, 0.9), spikeM, -1.5, 1.2, 0);
    part(h.torso, boxGeo(0.7, 0.5, 0.9), spikeM, 1.5, 1.2, 0);
    part(h.head, boxGeo(0.25, 0.6, 0.25), spikeM, -0.45, 1.45, 0);
    part(h.head, boxGeo(0.25, 0.6, 0.25), spikeM, 0.45, 1.45, 0);
  }
  if (def.lava) moltenParts(h, def);
  if (def.look) hardParts(h, def);
  if (def.crystal) crystalParts(h, def);
  if (def.insane) insaneParts(h, def);
  if (def.vlook) voidParts(h, def);
  if (def.mlook) mediumParts(h, def);
  if (def.flook) fallenParts(h, def);
  if (def.xlook) expertParts(h, def);
  if (def.ilook) orionParts(h, def);
  if (def.blook) tbParts(h, def);
  h.rightArm.rotation.x = -Math.PI / 2;
  h.leftArm.rotation.x = -Math.PI / 2;
  if (def.hidden) setOpacity(h, 0.35);
  else if (def.mlook === 'mult') setOpacity(h, 0.55); // Multipliers are see-through
  return h;
}

/** Medium mode outfits (def.mlook): implants, plates, revived bosses, Multipliers, Grenadiers, the Predator, the Eradicator... */
export function mediumParts(h, def) {
  const { M } = h;
  const metal = M(0x8a8f94);
  const dark = M(0x2b2b2b);
  const black = M(0x111111);
  const plate = M(def.plate ?? 0x8a8f94);
  // Lumpy boils on a limb.
  const boils = (limb, color) => {
    const bm = M(color);
    for (const [x, y, z, s] of [[0.5, -0.6, 0.3, 0.3], [0.45, -1.2, -0.2, 0.22], [0.2, -1.6, 0.5, 0.26]]) part(limb, boxGeo(s, s, s), bm, x, y, z);
  };
  // Stitches across a body part.
  const stitches = (p, x, y, z, w, n = 4) => {
    const sm = M(0x1a1a1a);
    part(p, boxGeo(w, 0.06, 0.06), sm, x, y, z);
    for (let i = 0; i < n; i++) part(p, boxGeo(0.06, 0.24, 0.07), sm, x - w / 2 + (w / (n - 1)) * i, y, z);
  };
  const wire = (p, color, x, y, z, len) => part(p, boxGeo(0.08, len, 0.08), glow(h, color), x, y, z);
  switch (def.mlook) {
    case 'implants': {
      // Zombie+: metal implants in its arm and leg, angry, drooling green.
      part(h.rightArm, boxGeo(1.06, 0.5, 1.06), metal, 0, -0.9, 0);
      part(h.leftLeg, boxGeo(1.06, 0.4, 1.06), metal, 0, -0.7, 0);
      part(h.head, boxGeo(0.35, 0.25, 0.06), metal, -0.35, 1.0, 0.62);
      for (const side of [-1, 1]) {
        const brow = part(h.head, boxGeo(0.4, 0.1, 0.06), black, side * 0.28, 0.92, 0.63);
        brow.rotation.z = side * 0.35; // angry brows
      }
      part(h.head, boxGeo(0.12, 0.4, 0.06), glow(h, 0x76ff03), 0.15, 0.15, 0.62); // drool
      break;
    }
    case 'fast': {
      // Fast Zombie+: implants down every limb and a confused, crooked face.
      for (const limb of [h.rightArm, h.leftArm, h.rightLeg, h.leftLeg]) part(limb, boxGeo(1.06, 0.3, 1.06), metal, 0, -1.1, 0);
      part(h.head, boxGeo(0.4, 0.1, 0.06), black, -0.28, 0.98, 0.63);
      const b = part(h.head, boxGeo(0.4, 0.1, 0.06), black, 0.28, 1.05, 0.63);
      b.rotation.z = -0.4; // one raised brow
      break;
    }
    case 'heavy': {
      // Heavy Zombie+ / Armored Heavy Zombie+: a gray metal chest plate (armored ones get shoulder pads too).
      part(h.torso, boxGeo(2.2, 1.6, 1.22), plate, 0, 0.1, 0);
      for (const x of [-0.7, 0.7]) part(h.torso, boxGeo(0.14, 0.14, 0.06), dark, x, 0.75, 0.63);
      if (def.bulletResist) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.25, 0.6, 1.25), plate, 0, -0.1, 0);
      for (const side of [-1, 1]) part(h.head, boxGeo(0.4, 0.1, 0.06), black, side * 0.28, 0.95, 0.63); // annoyed
      break;
    }
    case 'revived': {
      // Revived Boss 1: black diamond-plated arm braces, a wire and boils on its arm.
      for (const arm of [h.rightArm, h.leftArm]) {
        part(arm, boxGeo(1.12, 0.9, 1.12), black, 0, -1.3, 0);
        const d = part(arm, boxGeo(0.4, 0.4, 0.06), M(0x3a3a3a), 0, -1.3, 0.6);
        d.rotation.z = Math.PI / 4; // diamond plate
      }
      wire(h.leftArm, 0xff5252, 0.55, -0.6, 0.2, 1.2);
      boils(h.leftArm, 0x9e9d24);
      break;
    }
    case 'mult': {
      // Multipliers: see-through, with a big glowing X on the chest.
      const x = glow(h, def.xColor);
      for (const s of [-1, 1]) {
        const bar = part(h.torso, boxGeo(0.28, 1.6, 0.08), x, 0, 0.1, 0.56);
        bar.rotation.z = s * 0.7;
      }
      for (const side of [-1, 1]) part(h.head, boxGeo(0.25, 0.2, 0.06), x, side * 0.28, 0.75, 0.63);
      break;
    }
    case 'grenadier':
    case 'eliteGrenadier':
    case 'shocker': {
      const elite = def.mlook === 'eliteGrenadier';
      if (def.mlook !== 'grenadier') {
        // A helmet (the Elite's is cracked).
        part(h.head, boxGeo(1.4, 0.6, 1.4), M(0x212121), 0, 1.25, 0);
        if (elite) part(h.head, boxGeo(0.08, 0.5, 0.08), M(0x9e9e9e), 0.3, 1.3, 0.71);
      }
      if (elite) for (const limb of [h.rightArm, h.leftArm]) part(limb, boxGeo(1.08, 0.25, 1.08), M(0xff6d00), 0, -1.8, 0); // orange cuffs
      if (def.mlook === 'shocker') {
        // A blue canister of lightning on its back.
        part(h.torso, boxGeo(1.0, 1.8, 0.9), M(0x1565c0), 0, 0.1, -1.0);
        part(h.torso, boxGeo(0.7, 1.4, 0.95), glow(h, 0x40c4ff), 0, 0.1, -1.0);
        for (const y of [0.6, -0.2]) part(h.torso, boxGeo(1.05, 0.1, 1.0), M(0x0d47a1), 0, y, -1.0);
        break;
      }
      // Bandolier across the chest with grenades.
      const band = part(h.torso, boxGeo(0.3, 2.5, 0.08), M(0x3e2723), 0, 0, 0.55);
      band.rotation.z = 0.7;
      const nade = glow(h, elite ? 0xff9100 : 0x40c4ff);
      const at = elite ? [[-0.35, 0.35], [0.35, -0.3]] : [[-0.5, 0.45], [0, 0], [0.5, -0.45]];
      for (const [x, y] of at) part(h.torso, boxGeo(0.32, 0.4, 0.3), nade, x, y, 0.65);
      break;
    }
    case 'superHeavy': {
      // Super Heavy Zombie: a metal brace, a shoulder guard and a gauntlet.
      part(h.torso, boxGeo(2.2, 0.5, 1.22), metal, 0, -0.4, 0);
      part(h.rightArm, boxGeo(1.4, 0.8, 1.4), metal, 0, 0, 0);
      part(h.leftArm, boxGeo(1.25, 1.0, 1.25), metal, 0, -1.6, 0);
      for (const side of [-1, 1]) {
        const b = part(h.head, boxGeo(0.4, 0.1, 0.06), black, side * 0.28, 0.95, 0.63);
        b.rotation.z = -side * 0.35; // pained
      }
      break;
    }
    case 'nuclear': {
      // Nuclear Zombie: glowing green skin, two red cores wired to a tank on its back.
      const g = glow(h, 0x76ff03);
      g.emissiveIntensity = 0.25;
      part(h.head, boxGeo(1.24, 1.24, 1.24), g, 0, 0.6, 0);
      part(h.torso, boxGeo(1.3, 1.7, 0.8), M(0x546e7a), 0, 0.1, -0.95);
      for (const x of [-0.45, 0.45]) {
        part(h.torso, boxGeo(0.4, 0.4, 0.2), glow(h, 0xff1744), x, 0.3, 0.6);
        wire(h.torso, 0xffd600, x, 0.95, 0, 0.9).rotation.x = Math.PI / 2;
      }
      break;
    }
    case 'titan': {
      // Revived Titan: a metal shoulder guard, braces and one armored boot.
      part(h.rightArm, boxGeo(1.45, 0.9, 1.45), metal, 0, 0, 0);
      part(h.leftArm, boxGeo(1.12, 0.8, 1.12), metal, 0, -1.4, 0);
      part(h.rightArm, boxGeo(1.12, 0.6, 1.12), metal, 0, -1.6, 0);
      part(h.leftLeg, boxGeo(1.2, 0.9, 1.3), metal, 0, -1.6, 0.05);
      break;
    }
    case 'monster':
    case 'abomination': {
      // Monster / Revived Abomination: stitched together, swollen arms, junk stuck in it.
      stitches(h.torso, 0, 0.3, 0.53, 1.6);
      stitches(h.head, 0, 0.95, 0.62, 0.9, 3);
      const swollen = M(0x9e9e9e);
      for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.6, 1.6, 1.6), swollen, 0, -1.1, 0);
      const junk = M(0x6d4c41);
      for (const [p, x, y, z] of [[h.torso, 0.6, -0.4, 0.6], [h.torso, -0.7, 0.6, -0.6], [h.rightArm, 0.8, -1.2, 0.2]]) {
        const s = part(p, boxGeo(0.12, 0.12, 0.6), M(0xbdbdbd), x, y, z); // screw
        s.rotation.y = 0.6;
        part(p, boxGeo(0.4, 0.3, 0.3), junk, x - 0.2, y - 0.3, z);
      }
      if (def.mlook === 'abomination') {
        // Gray patches, rusty pipes, spikes and a red core wired to a green vial.
        for (const [x, y] of [[-0.5, -0.5], [0.6, 0.6]]) part(h.torso, boxGeo(0.6, 0.5, 0.06), M(0x616161), x, y, 0.55);
        const rust = M(0x8d4f2a);
        for (const x of [-0.6, 0.6]) part(h.torso, boxGeo(0.25, 2.2, 0.25), rust, x, 0.4, -0.65);
        for (const x of [-0.5, 0, 0.5]) part(h.torso, boxGeo(0.18, 0.6, 0.18), M(0xbdbdbd), x, 1.2, -0.3);
        part(h.torso, boxGeo(0.5, 0.5, 0.2), glow(h, 0xff1744), 0, 0.2, 0.6);
        part(h.torso, boxGeo(0.3, 0.6, 0.3), glow(h, 0x76ff03), 0.9, -0.6, 0.6);
        wire(h.torso, 0xffd600, 0.45, -0.2, 0.62, 0.8).rotation.z = 1.1;
      }
      break;
    }
    case 'infiltrator': {
      // Infiltrator: a soldier in body armor and a helmet.
      part(h.torso, boxGeo(2.2, 1.7, 1.22), black, 0, 0.1, 0);
      for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.4, 0.4, 0.15), M(0x212121), x, -0.3, 0.65); // pouches
      part(h.head, boxGeo(1.4, 0.6, 1.4), M(0x757575), 0, 1.25, 0);
      part(h.head, boxGeo(1.5, 0.12, 1.5), M(0x616161), 0, 0.98, 0);
      break;
    }
    case 'charger': {
      // Charger Boss: boils and a blue wire on its arms.
      boils(h.rightArm, 0x5c6bc0);
      boils(h.leftArm, 0x5c6bc0);
      wire(h.rightArm, 0x40c4ff, -0.55, -1.0, 0, 1.6);
      wire(h.leftArm, 0x40c4ff, 0.55, -1.0, 0, 1.6);
      break;
    }
    case 'smasher': {
      // Smasher: stitched black body, dark red armor, one red eye and a huge metal fist.
      const armor = M(0x5d0f0f);
      part(h.torso, boxGeo(2.25, 1.7, 1.25), armor, 0, 0.1, 0);
      part(h.leftArm, boxGeo(1.3, 0.7, 1.3), armor, 0, -0.15, 0);
      stitches(h.head, 0, 1.0, 0.62, 0.9, 3);
      part(h.head, boxGeo(0.35, 0.3, 0.06), glow(h, 0xff1744), 0.25, 0.75, 0.63);
      part(h.rightArm, boxGeo(1.9, 1.6, 1.9), metal, 0, -2.0, 0);
      for (const x of [-0.6, 0, 0.6]) part(h.rightArm, boxGeo(0.4, 0.2, 0.4), dark, x, -2.85, 0.6);
      break;
    }
    case 'predator': {
      // Predator: black plating on his right side, a red helmet with a jagged jaw and one orange
      // eye, an orange core held by three yellow wires, and a red cyborg arm with a revolver.
      const red = M(0xc62828);
      part(h.torso, boxGeo(1.12, 2.05, 1.12), black, -0.55, 0, 0);
      part(h.rightLeg, boxGeo(1.06, 0.6, 1.1), black, 0, -1.75, 0.03); // boot
      part(h.leftLeg, boxGeo(1.06, 0.6, 1.1), black, 0, -1.75, 0.03);
      part(h.head, boxGeo(1.4, 0.9, 1.4), red, 0, 0.9, 0);
      for (const x of [-0.45, -0.15, 0.15, 0.45]) part(h.head, boxGeo(0.18, 0.3, 0.1), red, x, 0.1, 0.66); // jagged jaw
      part(h.head, boxGeo(0.35, 0.3, 0.06), glow(h, 0xff9100), 0.2, 0.75, 0.72);
      part(h.torso, boxGeo(0.5, 0.5, 0.15), glow(h, 0xff9100), 0.3, 0.4, 0.55);
      for (const [x, r] of [[0.0, 0.5], [0.3, 0], [0.6, -0.5]]) wire(h.torso, 0xffd600, x, 0.9, 0.56, 0.6).rotation.z = r;
      part(h.rightArm, boxGeo(1.15, 2.05, 1.15), red, 0, -1.0, 0);
      part(h.rightArm, boxGeo(0.9, 0.9, 0.9), M(0x424242), 0, -2.2, 0.2); // cylinder
      for (const x of [-0.2, 0.2]) part(h.rightArm, boxGeo(0.25, 0.25, 1.6), black, x, -2.2, 1.2); // two barrels
      break;
    }
    case 'eradicator': {
      // Eradicator: black armor with white markings, a pointed helmet and visor, red teeth,
      // a jetpack with a yellow tank, an orange-edged sword and a rocket launcher on his back.
      const white = M(0xeceff1);
      const orange = glow(h, 0xff6d00);
      part(h.torso, boxGeo(2.25, 1.8, 1.25), black, 0, 0.1, 0);
      for (const [x, y] of [[-0.6, 0.6], [0.6, 0.6], [0, -0.4]]) part(h.torso, boxGeo(0.5, 0.1, 0.06), white, x, y, 0.64);
      part(h.head, boxGeo(1.45, 1.4, 1.45), black, 0, 0.65, 0);
      part(h.head, boxGeo(0.9, 0.5, 0.9), black, 0, 1.5, 0);
      part(h.head, boxGeo(0.4, 0.4, 0.4), black, 0, 1.9, 0); // pointed top
      part(h.head, boxGeo(1.2, 0.35, 0.06), M(0x0a0a0a), 0, 0.85, 0.74); // visor
      for (const x of [-0.4, -0.2, 0, 0.2, 0.4]) part(h.head, boxGeo(0.12, 0.2, 0.06), M(0xd50000), x, 0.3, 0.74); // teeth
      part(h.head, boxGeo(1.46, 0.08, 1.46), orange, 0, 0.55, 0);
      // Shoulder plate with tally marks.
      part(h.rightArm, boxGeo(1.35, 0.7, 1.35), black, 0, -0.1, 0);
      for (const z of [-0.3, -0.1, 0.1, 0.3]) part(h.rightArm, boxGeo(0.06, 0.08, 0.1), white, -0.69, 0.05, z);
      // Jetpack and rocket launcher.
      part(h.torso, boxGeo(1.6, 1.6, 0.6), black, 0, 0.1, -0.85);
      part(h.torso, boxGeo(0.5, 1.2, 0.5), M(0xfdd835), 0.5, 0.0, -1.3);
      for (const x of [-0.45, 0, 0.45]) part(h.torso, boxGeo(0.35, 0.35, 2.4), M(0x212121), x - 0.4, 1.3, -0.9);
      // Sword: gray blade, glowing serrated orange edge.
      part(h.leftArm, boxGeo(0.3, 0.3, 1), dark, 0, -2.1, 0.3);
      part(h.leftArm, boxGeo(0.2, 0.5, 4), M(0x9e9e9e), 0, -2.1, 2.7);
      part(h.leftArm, boxGeo(0.22, 0.15, 4), orange, 0, -2.4, 2.7);
      // Electronic Rage: the visor breaks to show a red eye.
      const eye = part(h.head, boxGeo(0.35, 0.3, 0.08), glow(h, 0xff1744), -0.3, 0.85, 0.76);
      eye.visible = false;
      h.setEnraged = (on) => (eye.visible = on);
      break;
    }
  }
}

/** Medium mode zombie extras: lava cracks, horns, hazmat suits, armor, robes, mechs and axes. */
export function moltenParts(h, def) {
  const { M } = h;
  const lava = glow(h, def.lava);
  // Glowing cracks over the body and burning eyes.
  for (const [x, y, w, hh] of [[-0.5, 0.4, 0.12, 0.9], [0.3, -0.3, 0.7, 0.12], [0.55, 0.5, 0.12, 0.6], [-0.2, -0.6, 0.12, 0.5]]) {
    part(h.torso, boxGeo(w, hh, 0.06), lava, x, y, 0.53);
    part(h.torso, boxGeo(w, hh, 0.06), lava, -x, y, -0.53);
  }
  for (const limb of [h.rightArm, h.leftArm, h.rightLeg, h.leftLeg]) {
    part(limb, boxGeo(0.1, 0.8, 1.04), lava, 0.48, -1.1, 0);
    part(limb, boxGeo(1.04, 0.1, 0.6), lava, 0, -1.5, 0.1);
  }
  if (!def.knight && !def.mech) {
    for (const side of [-1, 1]) part(h.head, boxGeo(0.26, 0.18, 0.06), lava, side * 0.28, 0.7, 0.62);
    part(h.head, boxGeo(0.1, 0.5, 0.06), lava, 0.4, 0.9, 0.62);
  }
  if (def.horns) {
    const hm = M(def.horns);
    for (const side of [-1, 1]) {
      const a = part(h.head, boxGeo(0.25, 0.5, 0.25), hm, side * 0.5, 1.35, 0);
      a.rotation.z = -side * 0.4;
      const b = part(h.head, boxGeo(0.18, 0.4, 0.18), hm, side * 0.72, 1.7, 0);
      b.rotation.z = -side * 0.8;
    }
  }
  if (def.plate) {
    const plate = M(def.plate);
    const dark = M(0x263238);
    part(h.torso, boxGeo(2.25, 1.7, 1.25), plate, 0, 0.1, 0); // breastplate
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.3, 0.7, 1.3), plate, 0, -0.15, 0); // pauldrons
    if (def.knight || def.axes) {
      // Full helm with a glowing visor slit, greaves and a shield.
      part(h.head, boxGeo(1.4, 1.4, 1.4), plate, 0, 0.6, 0);
      part(h.head, boxGeo(1.0, 0.16, 0.06), lava, 0, 0.72, 0.72);
      part(h.head, boxGeo(0.2, 0.5, 1.2), dark, 0, 1.5, 0); // crest
      for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.15, 1.0, 1.15), plate, 0, -1.4, 0);
    } else part(h.head, boxGeo(1.35, 0.6, 1.35), plate, 0, 1.2, 0); // squire's open helmet
    if (def.knight) {
      part(h.leftArm, boxGeo(0.25, 1.8, 2.4), plate, 0.65, -1.5, 0.1); // shield
      part(h.leftArm, boxGeo(0.08, 0.9, 0.9), lava, 0.8, -1.5, 0.1);
      // Sword
      part(h.rightArm, boxGeo(0.3, 0.3, 1), dark, 0, -2.1, 0.3);
      part(h.rightArm, boxGeo(0.25, 0.25, 3.4), lava, 0, -2.1, 2.4);
    }
  }
  if (def.robe) {
    // Necromancer: a long robe and hood, and a staff topped with a glowing orb.
    const robe = M(def.robe);
    part(h.body, boxGeo(2.3, 2.1, 1.4), robe, 0, 1.0, 0);
    part(h.head, boxGeo(1.4, 1.35, 1.25), M(0x1a0f3a), 0, 0.68, -0.12);
    part(h.rightArm, boxGeo(0.25, 0.25, 6), M(0x3e2723), 0, -2.1, 0.6);
    part(h.rightArm, boxGeo(0.7, 0.7, 0.7), lava, 0, -2.1, 3.8);
    part(h.rightArm, boxGeo(0.12, 0.12, 0.8), lava, 0.4, -2.1, 3.2);
  }
  if (def.mech) {
    // Bulwark: a boxy lava-powered mech suit with arm cannons.
    const metal = M(def.shirt);
    const dark = M(def.pants);
    part(h.torso, boxGeo(2.9, 2.4, 1.8), metal, 0, 0.1, 0);
    part(h.torso, boxGeo(1, 1, 0.1), lava, 0, 0.2, 0.92); // reactor core
    for (const x of [-1.1, 1.1]) part(h.torso, boxGeo(0.4, 0.8, 0.4), dark, x, 1.5, -0.5); // exhaust stacks
    part(h.head, boxGeo(1.6, 1.1, 1.6), metal, 0, 0.55, 0);
    part(h.head, boxGeo(1.2, 0.25, 0.06), lava, 0, 0.65, 0.82);
    for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.4, 2.1, 1.4), dark, 0, -1.0, 0);
    for (const arm of [h.rightArm, h.leftArm]) {
      part(arm, boxGeo(1.35, 2.2, 1.35), metal, 0, -1.0, 0);
      part(arm, boxGeo(0.6, 1.4, 0.6), dark, 0, -2.6, 0); // cannon barrel
      part(arm, boxGeo(0.4, 0.06, 0.4), lava, 0, -3.32, 0);
    }
  }
  if (def.hazmat) hazmatSuit(h, def);
  if (def.axes) {
    // Molten Warlord: a giant battleaxe in each hand (handles point up along the arms' local z).
    const wood = M(0x3e2723);
    const steel = M(0x37474f);
    for (const [arm, side] of [[h.rightArm, -1], [h.leftArm, 1]]) {
      part(arm, boxGeo(0.35, 0.35, 5.5), wood, 0, -2.1, 1.2);
      part(arm, boxGeo(0.25, 1.8, 2.2), steel, side * 0.05, -3.0, 3.4); // axe head, blade forward
      part(arm, boxGeo(0.3, 0.16, 2.3), lava, side * 0.05, -3.95, 3.4); // red-hot edge
      part(arm, boxGeo(0.4, 0.4, 0.4), steel, 0, -2.1, 4.1);
    }
  }
}

/** Hard mode (Fallen) outfits (def.flook): skeletons, knights, Breakers, Necromancers, the Fallen King... */
export function fallenParts(h, def) {
  const { M } = h;
  const blue = glow(h, 0x29b6f6);
  const cyan = glow(h, 0x18ffff);
  const steel = M(0x90a4ae);
  const dark = M(0x263238);
  const black = M(0x111111);
  const grey = M(0x9e9e9e);
  const chain = M(0x757575);
  // Glowing blue cracks across the chest and limbs.
  const cracks = (c = blue) => {
    for (const [x, y, w, hh] of [[-0.5, 0.2, 0.12, 1.2], [0.3, -0.3, 0.8, 0.12], [0.6, 0.5, 0.12, 0.7]]) part(h.torso, boxGeo(w, hh, 0.06), c, x, y, 0.53);
    for (const limb of [h.leftArm, h.rightArm, h.leftLeg, h.rightLeg]) part(limb, boxGeo(0.1, 0.9, 1.04), c, 0.2, -1.1, 0);
  };
  const horns = (y = 1.2, m = steel, s = 1) => {
    for (const side of [-1, 1]) {
      const hn = part(h.head, boxGeo(0.2 * s, 0.7 * s, 0.2 * s), m, side * 0.55, y + 0.25 * s, 0);
      hn.rotation.z = -side * 0.5;
    }
  };
  const helmet = (m, spikes = 0) => {
    part(h.head, boxGeo(1.36, 0.55, 1.36), m, 0, 1.2, 0);
    for (let i = 0; i < spikes; i++) part(h.head, boxGeo(0.16, 0.5, 0.16), m, -0.45 + (0.9 / Math.max(1, spikes - 1)) * i, 1.65, 0);
  };
  const cape = (m, len = 2.6) => part(h.torso, boxGeo(1.9, len, 0.12), m, 0, 1 - len / 2, -0.6);
  const crown = (m, gem) => {
    for (const x of [-0.5, -0.17, 0.17, 0.5]) part(h.head, boxGeo(0.2, 0.45, 0.2), m, x, 1.45, 0.45);
    part(h.head, boxGeo(1.25, 0.2, 1.25), m, 0, 1.25, 0);
    if (gem) part(h.head, boxGeo(0.25, 0.25, 0.08), gem, 0, 1.3, 0.66);
  };
  const shoulders = (m, s = 1) => { for (const x of [-1.25, 1.25]) part(h.torso, boxGeo(0.9 * s, 0.5 * s, 1.2 * s), m, x, 1.05, 0); };
  const armorUp = (m) => {
    part(h.torso, boxGeo(2.15, 1.7, 1.15), m, 0, 0.1, 0);
    for (const limb of [h.leftArm, h.rightArm, h.leftLeg, h.rightLeg]) part(limb, boxGeo(1.1, 0.8, 1.1), m, 0, -1.4, 0);
  };
  const legless = (robe) => {
    h.leftLeg.visible = h.rightLeg.visible = false;
    if (robe) part(h.torso, boxGeo(1.9, 2.2, 1.0), robe, 0, -1.9, 0);
  };
  const sword = (arm, blade, len = 2.6) => {
    part(arm, boxGeo(0.25, 0.25, 0.7), dark, 0, -2.1, 0.3); // hilt
    part(arm, boxGeo(0.12, 0.3, len), blade, 0, -2.1, 0.35 + len / 2);
  };
  const shield = (arm, m, w = 1.8, hh = 2.2, gem = null) => {
    part(arm, boxGeo(0.2, hh, w), m, 0.65, -1.4, 0);
    if (gem) part(arm, boxGeo(0.06, 0.45, 0.45), gem, 0.77, -1.4, 0);
  };
  switch (def.flook) {
    case 'veins': {
      // Abnormal / Quick: pale skin with dark veins, dirty clothes.
      const v = M(def.vein);
      for (const limb of [h.leftArm, h.rightArm]) {
        part(limb, boxGeo(0.08, 1.2, 1.03), v, 0.25, -1.2, 0);
        part(limb, boxGeo(1.03, 0.08, 0.5), v, 0, -1.6, 0.2);
      }
      part(h.head, boxGeo(0.06, 0.5, 0.06), v, -0.4, 0.3, 0.61);
      part(h.torso, boxGeo(0.5, 0.4, 0.06), M(0x3e2723), 0.5, -0.5, 0.52); // dirt stain
      break;
    }
    case 'skeleton':
    case 'necrotic': {
      // Fallen Skeleton: a rib cage. Necrotic Skeleton: horns, big glowing eyes and a chestplate.
      const bone = M(0xe0cfa0);
      for (let i = 0; i < 4; i++) part(h.torso, boxGeo(1.8, 0.14, 0.08), M(0x5d4f37), 0, 0.6 - i * 0.35, 0.52);
      part(h.torso, boxGeo(0.25, 1.6, 0.1), bone, 0, 0.05, 0.53);
      if (def.flook === 'necrotic') {
        part(h.torso, boxGeo(2.15, 1.0, 1.15), M(0x78909c), 0, 0.5, 0);
        horns(1.1, bone, 1.3);
        for (const side of [-1, 1]) part(h.head, boxGeo(0.35, 0.3, 0.06), cyan, side * 0.3, 0.8, 0.63);
      }
      break;
    }
    case 'dreg': {
      // Fallen Dreg: a headless blue body in armour and a grey cape, blue fire where the skull sits.
      h.head.visible = false;
      armorUp(M(0x78909c));
      cape(M(0x9e9e9e));
      const fire = part(h.body, boxGeo(0.7, 0.9, 0.7), blue, 0, 4.5, 0);
      fire.rotation.y = 0.6;
      part(h.body, boxGeo(0.4, 0.5, 0.4), cyan, 0, 5.0, 0);
      break;
    }
    case 'squire': {
      // Fallen Squire: a big black knight in rusty light-blue armour, spiked helmet, sword and shield.
      const rust = M(0x6d9aa8);
      armorUp(rust);
      helmet(rust, 3);
      cape(M(0x3e4a4f), 3);
      sword(h.rightArm, M(0xb0bec5));
      shield(h.leftArm, rust);
      break;
    }
    case 'paper': {
      // Breakers: flat paper dolls held together with tape, a little figure stuck on the chest.
      const tape = M(0xfff8e1);
      part(h.torso, boxGeo(2.05, 0.25, 1.05), tape, 0, 0.6, 0);
      part(h.torso, boxGeo(0.25, 2.05, 1.05), tape, -0.6, 0, 0);
      const fig = M(def.figure);
      const n = def.name === 'Breaker3' || def.name === 'Breaker2' ? 1 : def.name === 'Breaker4' ? 3 : 0;
      if (def.name === 'Breaker') {
        // Triangle pattern.
        for (const [x, y] of [[-0.5, -0.4], [0.4, 0.3], [0.5, -0.5]]) part(h.torso, boxGeo(0.4, 0.4, 0.06), fig, x, y, 0.53).rotation.z = Math.PI / 4;
      }
      for (let i = 0; i < n; i++) {
        const x = n === 1 ? 0.2 : -0.5 + i * 0.5;
        part(h.torso, boxGeo(0.3, 0.3, 0.06), fig, x, -0.05, 0.53);
        part(h.torso, boxGeo(0.35, 0.5, 0.06), fig, x, -0.45, 0.53);
      }
      if (def.name === 'Breaker4') for (const [x, y] of [[-0.6, 0.6], [0.6, 0.6]]) part(h.torso, boxGeo(0.3, 0.3, 0.06), M(0xffeb3b), x, y, 0.53).rotation.z = Math.PI / 4; // stars
      break;
    }
    case 'soul': {
      // Fallen Soul: dark blue, a rib cage, a spiked grey helmet and chains on its arms.
      for (let i = 0; i < 4; i++) part(h.torso, boxGeo(1.8, 0.14, 0.08), M(0x0d1440), 0, 0.6 - i * 0.35, 0.52);
      helmet(grey, 3);
      for (const arm of [h.leftArm, h.rightArm]) for (const y of [-0.6, -1.1, -1.6]) part(arm, boxGeo(1.1, 0.14, 1.1), chain, 0, y, 0);
      break;
    }
    case 'fallen': {
      // The Fallen: a white bandana.
      part(h.head, boxGeo(1.3, 0.3, 1.3), M(0xffffff), 0, 0.95, 0);
      part(h.head, boxGeo(0.3, 0.5, 0.2), M(0xffffff), 0.3, 0.7, -0.7);
      break;
    }
    case 'giant': {
      // Fallen Giant: a huge cracked body, a torn white coat, tubes on its head and a knife on its back.
      cracks();
      part(h.torso, boxGeo(2.15, 2.0, 1.15), M(0xeceff1), 0, 0, -0.05); // coat
      part(h.torso, boxGeo(0.5, 2.05, 0.06), M(0x161616), 0, 0, 0.55); // open front
      for (const x of [-0.35, 0.35]) part(h.head, boxGeo(0.18, 0.18, 1.0), dark, x, 1.25, -0.2);
      part(h.torso, boxGeo(0.25, 2.2, 0.5), M(0xb0bec5), 0.6, 0.3, -0.65).rotation.z = 0.5; // knife
      break;
    }
    case 'hazmat': {
      // Fallen Hazmat: blue-grey armour with a lock on the chest and a horned helmet.
      armorUp(M(0x78909c));
      helmet(M(0x546e7a));
      horns(1.3, M(0x37474f));
      part(h.torso, boxGeo(0.5, 0.55, 0.1), M(0xffca28), 0, 0.3, 0.62);
      part(h.torso, boxGeo(0.3, 0.25, 0.1), dark, 0, 0.65, 0.62);
      break;
    }
    case 'possessed':
    case 'ghost': {
      // Possessed Armor: floating light-blue armour with blue gems and horns, a see-through ghost inside.
      legless(null);
      const haze = M(0x0d0d0d);
      haze.transparent = true;
      haze.opacity = 0.6;
      haze.userData.keepOpacity = 0.6;
      part(h.torso, boxGeo(1.6, 1.8, 0.8), haze, 0, -1.6, 0);
      cracks();
      if (def.flook === 'possessed') {
        const pl = M(0xb0bec5);
        armorUp(pl);
        helmet(pl);
        horns(1.3, pl);
        for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.3, 0.3, 0.08), cyan, x, 0.4, 0.62);
      }
      break;
    }
    case 'necro': {
      // Fallen Necromancer: legless, a silver horned crown, tiger-skull shoulder pads and a skull staff.
      legless(M(0x424242));
      crown(M(0xcfd8dc), blue);
      horns(1.4, M(0xcfd8dc));
      shoulders(M(0xe0cfa0));
      part(h.rightArm, boxGeo(0.2, 0.2, 4), M(0x5d4037), 0, -2.0, 0.6);
      part(h.rightArm, boxGeo(0.6, 0.6, 0.6), M(0xe0cfa0), 0, -2.0, 2.7);
      part(h.rightArm, boxGeo(0.2, 0.15, 0.1), cyan, 0, -1.9, 3.0);
      break;
    }
    case 'corrupted': {
      // Corrupted Fallen: a white blindfold, blue spikes and chained arm-bands.
      part(h.head, boxGeo(1.28, 0.3, 1.28), M(0xffffff), 0, 0.75, 0);
      for (const [x, y] of [[-0.7, 0.9], [0, 1.0], [0.7, 0.9]]) part(h.torso, boxGeo(0.2, 0.6, 0.2), blue, x, y, -0.4);
      for (const arm of [h.leftArm, h.rightArm]) part(arm, boxGeo(1.1, 0.25, 1.1), chain, 0, -1.4, 0);
      cracks();
      break;
    }
    case 'seraph':
    case 'angel': {
      // Fallen Seraph: a halo and chains. Fallen Angel: blue armour, a black halo and a hole in its chest.
      const halo = def.flook === 'angel' ? M(0x111111) : glow(h, 0xfff59d);
      for (const [x, z, w, d] of [[0, 0.55, 1.2, 0.15], [0, -0.55, 1.2, 0.15], [0.55, 0, 0.15, 1.2], [-0.55, 0, 0.15, 1.2]]) part(h.head, boxGeo(w, 0.12, d), halo, x, 1.7, z);
      if (def.flook === 'angel') {
        armorUp(M(0x1565c0));
        part(h.torso, boxGeo(0.6, 0.6, 1.2), black, 0, 0.2, 0); // the hole
        part(h.torso, boxGeo(0.4, 0.4, 1.22), M(0x000000), 0, 0.2, 0);
        cracks();
      } else for (const y of [0.4, -0.2]) part(h.torso, boxGeo(2.1, 0.14, 1.1), chain, 0, y, 0);
      break;
    }
    case 'jester': {
      // Fallen Jester: a black-and-blue jester suit, a comedy mask, horns on its shoulders, a present.
      part(h.torso, boxGeo(1.02, 2.02, 1.02), black, -0.5, 0, 0);
      part(h.head, boxGeo(1.0, 1.0, 0.1), M(0xffffff), 0, 0.6, 0.65);
      for (const side of [-1, 1]) part(h.head, boxGeo(0.25, 0.15, 0.05), black, side * 0.25, 0.75, 0.71);
      part(h.head, boxGeo(0.5, 0.12, 0.05), black, 0, 0.35, 0.71);
      for (const side of [-1, 1]) {
        const hat = part(h.head, boxGeo(0.35, 1.0, 0.35), side < 0 ? M(0x0d47a1) : black, side * 0.45, 1.5, 0);
        hat.rotation.z = -side * 0.6;
        part(h.torso, boxGeo(0.2, 0.7, 0.2), steel, side * 1.3, 1.5, 0).rotation.z = -side * 0.4;
      }
      part(h.leftArm, boxGeo(1.0, 1.0, 1.0), M(0x2979ff), 0, -2.2, 0.4); // present
      part(h.leftArm, boxGeo(1.05, 0.2, 1.05), M(0xffffff), 0, -2.2, 0.4);
      break;
    }
    case 'rusher':
    case 'rusherBroken': {
      // Fallen Rusher: spiked metal gloves and boots, a big shield with a blue gem.
      cracks();
      for (const limb of [h.leftArm, h.rightArm, h.leftLeg, h.rightLeg]) {
        part(limb, boxGeo(1.12, 0.6, 1.12), steel, 0, -1.7, 0);
        part(limb, boxGeo(0.15, 0.15, 0.4), steel, 0, -1.7, 0.7);
      }
      if (def.flook === 'rusher') shield(h.leftArm, M(0x546e7a), 2.2, 2.8, cyan);
      break;
    }
    case 'hero': {
      // Fallen Hero: blue-grey armour, a blue crystal crown and a grey cape.
      armorUp(M(0x78909c));
      cape(M(0x9e9e9e));
      for (const x of [-0.4, 0, 0.4]) part(h.head, boxGeo(0.22, x ? 0.5 : 0.75, 0.22), cyan, x, 1.45, 0.3);
      sword(h.rightArm, M(0xb0bec5), 2.2);
      break;
    }
    case 'shieldKnight':
    case 'shieldBroken': {
      // Fallen Shield: a huge knight in dark-teal and silver armour, a giant shield and a mace.
      const teal = M(0x26535a);
      armorUp(teal);
      shoulders(steel, 1.2);
      helmet(steel, 0);
      part(h.head, boxGeo(1.38, 0.15, 0.1), cyan, 0, 0.8, 0.68);
      part(h.rightArm, boxGeo(0.25, 0.25, 1.6), dark, 0, -2.1, 0.8);
      part(h.rightArm, boxGeo(0.8, 0.8, 0.8), steel, 0, -2.1, 1.8); // mace
      if (def.flook === 'shieldKnight') shield(h.leftArm, teal, 2.8, 3.4, cyan);
      break;
    }
    case 'summoner': {
      // Fallen Summoner: a black hooded robe with blue gems and horns, skull shoulder pads and a staff.
      legless(M(0x111111));
      part(h.head, boxGeo(1.45, 1.4, 1.35), M(0x1a1a1a), 0, 0.68, -0.1);
      horns(1.3, M(0x37474f), 1.2);
      shoulders(M(0xe0cfa0));
      for (const y of [0.4, -0.3, -1.2]) part(h.torso, boxGeo(0.3, 0.3, 0.08), cyan, 0, y, 0.56);
      part(h.rightArm, boxGeo(0.2, 0.2, 4.5), M(0x37474f), 0, -2.0, 0.6);
      part(h.rightArm, boxGeo(0.5, 0.5, 0.5), cyan, 0, -2.0, 2.9);
      break;
    }
    case 'honorGuard': {
      // Fallen Honor Guard: hulking, black with blue veins, teal/silver armour, a frog-mouth helmet and two spiked flails.
      cracks();
      const teal = M(0x26535a);
      part(h.torso, boxGeo(2.2, 1.4, 1.2), teal, 0, 0.3, 0);
      shoulders(steel, 1.4);
      part(h.head, boxGeo(1.5, 0.9, 1.5), steel, 0, 0.9, 0);
      part(h.head, boxGeo(1.3, 0.2, 0.1), black, 0, 0.55, 0.76); // frog mouth slit
      for (const arm of [h.leftArm, h.rightArm]) {
        part(arm, boxGeo(0.12, 0.12, 1.2), chain, 0, -2.1, 0.7);
        const ball = part(arm, boxGeo(0.9, 0.9, 0.9), dark, 0, -2.1, 1.6);
        for (const [x, y] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) part(ball, boxGeo(0.25, 0.25, 0.25), steel, x, y, 0);
      }
      break;
    }
    case 'tank': {
      // Fallen Tank: a knight fully covered in grey-blue armour with gems and chains.
      armorUp(M(0x78909c));
      shoulders(M(0x607d8b), 1.2);
      part(h.head, boxGeo(1.35, 1.35, 1.35), M(0x78909c), 0, 0.6, 0);
      part(h.head, boxGeo(1.0, 0.12, 0.1), black, 0, 0.75, 0.69);
      for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.3, 0.3, 0.08), cyan, x, 0.5, 0.62);
      part(h.torso, boxGeo(2.2, 0.15, 1.2), chain, 0, -0.4, 0);
      break;
    }
    case 'guardian': {
      // Fallen Guardian: blue armour, a yellow belt, a grey cape, blue crystals on its head and a purple sword.
      cracks();
      armorUp(M(0x1565c0));
      part(h.torso, boxGeo(2.2, 0.3, 1.2), M(0xfdd835), 0, -0.8, 0);
      cape(M(0x9e9e9e), 3);
      for (const x of [-0.35, 0.35]) part(h.head, boxGeo(0.25, 0.6, 0.25), cyan, x, 1.4, 0).rotation.z = x;
      sword(h.rightArm, glow(h, 0xb388ff), 3.2);
      break;
    }
    case 'king': {
      // The Fallen King: silver and dark-grey armour with cyan spikes and gems, a crowned helmet,
      // a cyan sword and a spiked shield.
      armorUp(M(0x9e9e9e));
      shoulders(M(0x616161), 1.3);
      for (const x of [-1.3, 1.3]) part(h.torso, boxGeo(0.2, 0.7, 0.2), cyan, x, 1.6, 0);
      part(h.head, boxGeo(1.38, 1.0, 1.38), M(0xbdbdbd), 0, 0.7, 0);
      crown(M(0xe0e0e0), cyan);
      part(h.torso, boxGeo(0.45, 0.45, 0.08), cyan, 0, -0.3, 0.62); // gem in its belly
      cape(M(0x37474f), 3.2);
      sword(h.rightArm, glow(h, 0x18ffff), 3.6);
      shield(h.leftArm, M(0x616161), 2.4, 2.8, cyan);
      for (const y of [-0.6, -2.2]) part(h.leftArm, boxGeo(0.4, 0.2, 0.2), steel, 0.85, y, 0);
      break;
    }
  }
}

/** Hard mode outfits (def.look): spores, skeletons, mages, knights, berserkers and the rest. */
export function hardParts(h, def) {
  const { M } = h;
  // Golden armor shines a little.
  const gold = (color) => {
    if (!def.gold) return M(color);
    const m = glow(h, color);
    m.emissiveIntensity = 0.3;
    return m;
  };
  const plate = def.plate != null ? gold(def.plate) : null;
  const dark = M(0x263238);
  const mushroom = (parent, x, y, z, size, cap) => {
    part(parent, boxGeo(size * 0.35, size * 0.6, size * 0.35), M(0xf5f0e1), x, y + size * 0.3, z);
    part(parent, boxGeo(size, size * 0.4, size), M(cap), x, y + size * 0.7, z);
    part(parent, boxGeo(size * 0.2, size * 0.06, size * 0.2), M(0xffffff), x + size * 0.2, y + size * 0.92, z + size * 0.15); // spot
  };
  switch (def.look) {
    case 'spores': {
      // Infected: lumpy spore clusters growing all over it.
      const spores = [glow(h, 0x9c27b0), M(0xc0ca33), M(0x7cb342)];
      spores[0].emissiveIntensity = 0.35;
      const at = [[h.torso, 0.5, 0.5, 0.55], [h.torso, -0.6, -0.3, 0.55], [h.torso, 0.1, 0.8, -0.55], [h.torso, -0.4, 0.1, -0.55],
        [h.head, 0.4, 1.25, 0.2], [h.head, -0.35, 1.2, -0.3], [h.rightArm, 0, -0.6, 0.55], [h.leftArm, 0.4, -1.3, 0.3], [h.rightLeg, 0.4, -0.8, 0.5]];
      at.forEach(([p, x, y, z], i) => {
        const s = 0.3 + (i % 3) * 0.12;
        part(p, boxGeo(s, s, s), spores[i % 3], x, y, z);
        part(p, boxGeo(s * 0.6, s * 0.6, s * 0.6), spores[(i + 1) % 3], x + s * 0.4, y + s * 0.3, z);
      });
      break;
    }
    case 'skeleton': {
      // Skeleton: ribs showing under a rusty chest plate, an iron helmet and shoulder guards.
      const bone = M(def.skin);
      for (const y of [-0.15, -0.45, -0.75]) part(h.torso, boxGeo(1.5, 0.14, 0.06), bone, 0, y, 0.53);
      part(h.torso, boxGeo(0.2, 1.0, 0.07), bone, 0, -0.45, 0.54); // breastbone
      part(h.torso, boxGeo(2.15, 0.9, 1.15), plate, 0, 0.55, 0);
      for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.25, 0.6, 1.25), plate, 0, -0.1, 0);
      part(h.torso, boxGeo(2.1, 0.25, 1.1), M(0x4e342e), 0, -0.9, 0); // belt
      part(h.head, boxGeo(1.35, 0.55, 1.35), plate, 0, 1.2, 0);
      part(h.head, boxGeo(0.18, 0.5, 0.1), plate, 0, 0.75, 0.66); // nose guard
      if (def.club) {
        // Giant Skeleton: horns on the helmet and a huge bone club.
        for (const side of [-1, 1]) {
          const horn = part(h.head, boxGeo(0.3, 0.9, 0.3), bone, side * 0.75, 1.65, 0);
          horn.rotation.z = -side * 0.5;
        }
        part(h.rightArm, boxGeo(0.45, 0.45, 4), bone, 0, -2.1, 1.4);
        part(h.rightArm, boxGeo(1.1, 1.1, 1.5), bone, 0, -2.1, 3.7);
      }
      break;
    }
    case 'multiplier': {
      // Multiplier: a glowing seam splits it down the middle, with two copies of its core floating above.
      const cyan = glow(h, 0x18ffff);
      part(h.torso, boxGeo(0.12, 2.02, 1.04), cyan, 0, 0, 0);
      part(h.torso, boxGeo(0.7, 0.7, 0.1), cyan, 0, 0.3, 0.53);
      part(h.head, boxGeo(0.12, 1.24, 1.24), cyan, 0, 0.6, 0);
      for (const side of [-1, 1]) part(h.head, boxGeo(0.4, 0.4, 0.4), cyan, side * 0.5, 1.8, 0);
      break;
    }
    case 'mage': {
      // Mage: a long robe, a tall pointed hat and a staff with a fireball on top.
      const robe = M(def.robe);
      const trim = M(0xffd54f);
      part(h.body, boxGeo(2.3, 2.1, 1.4), robe, 0, 1.0, 0);
      part(h.body, boxGeo(2.35, 0.2, 1.45), trim, 0, 0.1, 0);
      part(h.head, boxGeo(1.9, 0.15, 1.9), robe, 0, 1.25, 0);
      part(h.head, boxGeo(1.2, 0.55, 1.2), robe, 0, 1.6, 0);
      part(h.head, boxGeo(0.85, 0.5, 0.85), robe, 0.05, 2.1, -0.05);
      part(h.head, boxGeo(0.5, 0.5, 0.5), robe, 0.12, 2.55, -0.12);
      part(h.head, boxGeo(0.25, 0.4, 0.25), robe, 0.22, 2.95, -0.2);
      part(h.head, boxGeo(0.25, 0.25, 0.06), trim, 0.3, 1.7, 0.61); // star
      part(h.rightArm, boxGeo(0.25, 0.25, 5.5), M(0x5d4037), 0, -2.1, 0.8);
      part(h.rightArm, boxGeo(0.8, 0.8, 0.8), glow(h, 0xff6d00), 0, -2.1, 3.8);
      part(h.rightArm, boxGeo(0.5, 0.5, 0.5), glow(h, 0xffea00), 0, -2.1, 4.3);
      break;
    }
    case 'knight': {
      // Knight: full plate, a visored helm, a sword and a shield. Golden Knights get a red plume.
      part(h.torso, boxGeo(2.25, 2.1, 1.25), plate, 0, 0, 0);
      part(h.torso, boxGeo(0.3, 1.4, 0.06), dark, 0, 0.1, 0.64);
      for (const arm of [h.rightArm, h.leftArm]) {
        part(arm, boxGeo(1.35, 0.75, 1.35), plate, 0, -0.15, 0);
        part(arm, boxGeo(1.1, 0.7, 1.1), plate, 0, -1.6, 0); // gauntlet
      }
      for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.12, 1.4, 1.12), plate, 0, -1.2, 0);
      part(h.head, boxGeo(1.45, 1.45, 1.45), plate, 0, 0.62, 0);
      part(h.head, boxGeo(1.05, 0.14, 0.06), dark, 0, 0.75, 0.74); // visor slit
      for (const x of [-0.3, 0, 0.3]) part(h.head, boxGeo(0.1, 0.1, 0.06), dark, x, 0.4, 0.74);
      if (def.gold) for (let i = 0; i < 4; i++) part(h.head, boxGeo(0.3, 0.5, 0.4), M(0xc62828), 0, 1.45 + i * 0.15, -0.4 + i * 0.3);
      else part(h.head, boxGeo(0.2, 0.45, 1.3), dark, 0, 1.5, 0);
      part(h.leftArm, boxGeo(0.25, 2.0, 2.4), plate, 0.65, -1.5, 0.1); // shield
      part(h.leftArm, boxGeo(0.08, 1.2, 0.4), def.gold ? M(0xc62828) : dark, 0.8, -1.5, 0.1);
      part(h.leftArm, boxGeo(0.08, 0.4, 1.2), def.gold ? M(0xc62828) : dark, 0.8, -1.5, 0.1);
      part(h.rightArm, boxGeo(0.28, 0.28, 0.9), M(0x4e342e), 0, -2.1, 0.1); // grip
      part(h.rightArm, boxGeo(1.1, 0.28, 0.28), def.gold ? plate : dark, 0, -2.1, 0.65); // guard
      part(h.rightArm, boxGeo(0.14, 0.5, 3.4), def.gold ? plate : M(0xcfd8dc), 0, -2.1, 2.45); // blade
      break;
    }
    case 'berserker': {
      // Berserker: a hulking brute in heavy armor, its face hidden behind an iron mask.
      const wrap = M(0x3e2723);
      const red = glow(h, 0xff1744);
      part(h.head, boxGeo(1.36, 1.36, 1.36), wrap, 0, 0.62, 0);
      part(h.head, boxGeo(1.2, 1.0, 0.1), plate, 0, 0.6, 0.7);
      for (const side of [-1, 1]) part(h.head, boxGeo(0.3, 0.1, 0.06), red, side * 0.28, 0.8, 0.76);
      for (const y of [0.2, 0.4]) part(h.head, boxGeo(0.9, 0.06, 0.06), dark, 0, y, 0.76);
      part(h.torso, boxGeo(2.3, 2.1, 1.3), plate, 0, 0, 0);
      part(h.torso, boxGeo(2.35, 0.3, 1.35), wrap, 0, -0.85, 0); // belt
      for (const arm of [h.rightArm, h.leftArm]) {
        part(arm, boxGeo(1.5, 0.9, 1.5), plate, 0, -0.1, 0);
        for (const z of [-0.4, 0.4]) part(arm, boxGeo(0.25, 0.5, 0.25), dark, 0, 0.5, z); // pauldron spikes
        part(arm, boxGeo(1.2, 0.9, 1.2), plate, 0, -1.7, 0);
      }
      for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.12, 1.2, 1.12), plate, 0, -1.3, 0);
      // Chains across the chest.
      for (let i = 0; i < 5; i++) part(h.torso, boxGeo(0.3, 0.2, 0.08), dark, -0.8 + i * 0.4, 0.7 - i * 0.35, 0.67);
      break;
    }
    case 'archer': {
      // Archer: a green hood, a quiver of bolts and a crossbow held out in front.
      const hood = M(def.shirt);
      const wood = M(0x5d4037);
      part(h.head, boxGeo(1.4, 1.35, 1.3), hood, 0, 0.7, -0.08);
      part(h.torso, boxGeo(0.6, 1.6, 0.5), wood, 0.4, 0.2, -0.75); // quiver
      for (const x of [0.25, 0.45, 0.6]) part(h.torso, boxGeo(0.08, 0.5, 0.08), M(0xeeeeee), x, 1.2, -0.75);
      part(h.rightArm, boxGeo(0.3, 2.0, 0.3), wood, 0.7, -2.6, 0); // stock
      part(h.rightArm, boxGeo(2.4, 0.2, 0.25), wood, 0.7, -3.4, 0); // bow
      part(h.rightArm, boxGeo(2.3, 0.05, 0.05), M(0xeeeeee), 0.7, -3.1, 0); // string
      break;
    }
    case 'plague': {
      // Pestilence: a plague doctor's coat, wide hat and beaked mask, sprouting mushrooms everywhere.
      const coat = M(def.robe);
      part(h.body, boxGeo(2.3, 2.3, 1.4), coat, 0, 1.1, 0);
      part(h.torso, boxGeo(2.2, 2.1, 1.2), coat, 0, 0, 0);
      part(h.head, boxGeo(1.3, 1.3, 1.3), M(0x3e2723), 0, 0.62, 0);
      part(h.head, boxGeo(0.5, 0.5, 1.0), M(0xd7ccc8), 0, 0.42, 1.1); // beak
      part(h.head, boxGeo(0.3, 0.3, 0.6), M(0xd7ccc8), 0, 0.32, 1.85);
      for (const side of [-1, 1]) part(h.head, boxGeo(0.35, 0.35, 0.08), glow(h, 0x76ff03), side * 0.3, 0.85, 0.68); // goggles
      part(h.head, boxGeo(2.1, 0.15, 2.1), coat, 0, 1.3, 0); // hat brim
      part(h.head, boxGeo(1.25, 0.65, 1.25), coat, 0, 1.68, 0);
      part(h.rightArm, boxGeo(0.2, 0.2, 5.5), M(0x4e342e), 0, -2.1, 0.6); // cane
      for (const [p, x, y, z, s, c] of [[h.head, 0.5, 2.0, 0.1, 0.6, 0xc62828], [h.head, -0.4, 2.0, -0.2, 0.45, 0x8d6e63], [h.torso, 1.0, 1.0, 0, 0.7, 0x8e24aa],
        [h.torso, -1.0, 1.0, 0.1, 0.55, 0xc62828], [h.torso, 0.4, 0.3, -0.7, 0.6, 0x8d6e63], [h.body, 0.9, 0.3, 0.6, 0.5, 0x8e24aa], [h.body, -0.8, 0.6, -0.5, 0.6, 0xc62828]]) {
        mushroom(p, x, y, z, s, c);
      }
      break;
    }
    case 'predator': {
      // Predator: a huge red mechanical claw arm, a black-and-white body with yellow tubes and a glowing eye.
      const red = M(0xd32f2f);
      const white = M(0xd7d7cf);
      const yellow = glow(h, 0xffc400);
      part(h.torso, boxGeo(1.02, 2.02, 1.02), white, 0.5, 0, 0);
      part(h.torso, boxGeo(0.4, 0.4, 0.1), yellow, 0.4, 0.3, 0.55); // chest eye
      part(h.torso, boxGeo(0.2, 0.2, 0.1), dark, 0.4, 0.3, 0.6);
      for (const [x, y] of [[0.1, 0.8], [-0.2, 0.5], [-0.4, 0.1], [-0.3, -0.3]]) part(h.torso, boxGeo(0.25, 0.45, 0.3), yellow, x, y, 0.6); // tubes
      part(h.torso, boxGeo(0.3, 1.1, 0.06), red, -0.6, 0.2, 0.52);
      part(h.leftArm, boxGeo(1.05, 2.05, 1.05), white, 0, -1, 0);
      part(h.leftArm, boxGeo(1.1, 0.25, 1.1), red, 0, -1.3, 0);
      part(h.rightArm, boxGeo(1.9, 1.9, 1.9), red, 0, -0.6, 0); // giant arm
      part(h.rightArm, boxGeo(1.6, 1.4, 1.6), red, 0, -2.1, 0);
      part(h.rightArm, boxGeo(0.9, 0.4, 0.9), yellow, 0, -2.9, 0); // palm
      for (const [x, z] of [[-0.55, 0.5], [0.55, 0.5], [0, -0.55]]) part(h.rightArm, boxGeo(0.3, 1.3, 0.3), red, x, -3.5, z); // claws
      part(h.head, boxGeo(1.32, 1.32, 1.32), red, 0, 0.62, 0);
      part(h.head, boxGeo(0.5, 0.5, 0.08), yellow, 0, 0.62, 0.7); // eye
      part(h.head, boxGeo(0.6, 0.08, 0.06), dark, 0, 0.62, 0.75);
      for (const y of [0.3, 0.95]) part(h.head, boxGeo(1.0, 0.07, 0.06), dark, 0, y, 0.68);
      // Molten seams on the legs.
      const lava = glow(h, 0xff6d00);
      for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.04, 0.12, 1.04), lava, 0, -1.2, 0);
      break;
    }
    case 'eradicator': {
      // Eradicator: black power armor, an orange-rimmed visor, shoulder turrets, a jet pack and a
      // huge glowing sword.
      const metal = M(0x37474f);
      const black = M(0x1c1c1c);
      const orange = glow(h, 0xff6d00);
      const yellow = glow(h, 0xffd600);
      const white = M(0xeeeeee);
      part(h.head, boxGeo(1.5, 1.5, 1.5), metal, 0, 0.65, 0);
      part(h.head, boxGeo(1.2, 1.05, 0.06), orange, 0, 0.6, 0.76);
      part(h.head, boxGeo(1.0, 0.85, 0.08), black, 0, 0.6, 0.78);
      part(h.torso, boxGeo(2.6, 2.3, 1.5), metal, 0, 0.05, 0);
      part(h.torso, boxGeo(1.2, 1.2, 0.1), black, 0, -0.1, 0.76);
      for (const x of [-0.15, 0, 0.15]) part(h.torso, boxGeo(0.06, 0.8, 0.06), white, x, -0.1, 0.82);
      for (const [x, y] of [[0.75, 0.55], [0.85, 0.3]]) part(h.torso, boxGeo(0.18, 0.18, 0.08), orange, x, y, 0.78);
      part(h.torso, boxGeo(0.35, 0.12, 0.06), white, -0.75, 0.6, 0.78);
      // Shoulder turrets.
      for (const side of [-1, 1]) {
        part(h.torso, boxGeo(1.1, 0.9, 1.3), metal, side * 1.75, 1.5, 0);
        part(h.torso, boxGeo(0.25, 0.25, 1.2), black, side * 1.6, 1.55, 0.9);
        part(h.torso, boxGeo(0.25, 0.25, 1.2), black, side * 1.9, 1.55, 0.9);
      }
      // Jet pack.
      part(h.torso, boxGeo(1.5, 1.8, 0.8), black, 0, 0.2, -1.1);
      part(h.torso, boxGeo(1.5, 0.2, 0.82), yellow, 0, 0.9, -1.1);
      for (const x of [-0.45, 0.45]) part(h.torso, boxGeo(0.4, 0.3, 0.4), orange, x, -0.8, -1.1);
      for (const arm of [h.rightArm, h.leftArm]) {
        part(arm, boxGeo(1.4, 1.0, 1.4), metal, 0, -0.2, 0);
        part(arm, boxGeo(1.25, 1.0, 1.25), black, 0, -1.6, 0);
      }
      for (const leg of [h.rightLeg, h.leftLeg]) {
        part(leg, boxGeo(1.15, 1.6, 1.15), metal, 0, -1.1, 0);
        part(leg, boxGeo(0.5, 0.08, 0.06), white, 0, -1.0, 0.6);
      }
      // The sword.
      part(h.rightArm, boxGeo(0.35, 0.35, 1.2), black, 0, -2.1, 0.2);
      part(h.rightArm, boxGeo(1.6, 0.4, 0.4), metal, 0, -2.1, 0.9);
      part(h.rightArm, boxGeo(0.3, 1.1, 6.5), yellow, 0, -2.1, 4.3);
      break;
    }
  }
}

/**
 * Expert mode crystal creatures (def.crystal): faceless blue crystal bodies with glowing shards,
 * plus each one's gear. The Overlord is a giant white-armored king with a pink crown and scepter.
 */
export function crystalParts(h, def) {
  const { M } = h;
  const shard = glow(h, def.shard);
  const skin = M(def.skin);
  const deep = M(new THREE.Color(def.skin).multiplyScalar(0.6).getHex());
  // A crystal spike: a thin box tilted outward.
  const spike = (parent, mat, x, y, z, w, len, rz = 0, rx = 0) => {
    const m = part(parent, boxGeo(w, len, w), mat, x, y, z);
    m.rotation.set(rx, 0, rz);
    return m;
  };
  // The only "face": a cluster of glowing shards.
  const faceShards = (big = 1) => {
    spike(h.head, shard, 0, 0.75, 0.62, 0.22 * big, 0.7 * big, 0.15);
    spike(h.head, shard, -0.28, 0.6, 0.62, 0.14 * big, 0.45 * big, -0.35);
    spike(h.head, shard, 0.3, 0.55, 0.62, 0.12 * big, 0.35 * big, 0.5);
  };
  // Crystal growths on the shoulders, head and back.
  const growths = (mat = skin, n = 1) => {
    for (const side of [-1, 1]) {
      spike(h.torso, mat, side * 0.9, 1.2, -0.1, 0.35, 1.0 * n, -side * 0.5);
      spike(h.torso, mat, side * 0.5, 1.1, -0.45, 0.25, 0.7 * n, -side * 0.25, -0.4);
    }
    spike(h.head, mat, 0.25, 1.35, -0.1, 0.3, 0.8 * n, -0.3);
    spike(h.head, mat, -0.3, 1.3, 0.1, 0.22, 0.6 * n, 0.4);
    spike(h.torso, shard, 0, 0.6, -0.55, 0.3, 1.2 * n, 0, -0.5);
  };
  // The arms point forward, so in an arm's frame -y is forward and +z is up: the shield is a slab
  // in front of the left hand, `w` wide and `hh` tall, with a glowing cross on its face.
  const shieldOn = (w, hh, mat) => {
    const g = new THREE.Group();
    g.position.set(-0.5, -2.3, 0.2);
    h.leftArm.add(g);
    part(g, boxGeo(w, 0.3, hh), mat, 0, 0, 0);
    part(g, boxGeo(0.2, 0.12, hh * 0.85), shard, 0, -0.18, 0);
    part(g, boxGeo(w * 0.85, 0.12, 0.2), shard, 0, -0.18, 0);
    return g;
  };
  switch (def.crystal) {
    case 'invader':
      faceShards();
      growths();
      part(h.torso, boxGeo(0.4, 0.4, 0.08), shard, 0.4, 0.3, 0.52);
      break;
    case 'shielder':
    case 'rusher': {
      faceShards();
      growths(deep, def.crystal === 'rusher' ? 0.7 : 1);
      // A big crystal shield held out in front.
      const glass = M(def.shard);
      glass.transparent = true;
      glass.opacity = 0.75;
      shieldOn(def.crystal === 'rusher' ? 2.4 : 3.4, def.crystal === 'rusher' ? 2.4 : 3.6, glass);
      if (def.crystal === 'rusher') for (const leg of [h.rightLeg, h.leftLeg]) spike(leg, shard, 0, -1.2, -0.55, 0.2, 0.9, 0, -0.9); // speed fins
      break;
    }
    case 'shielderBroken':
    case 'rusherBroken': {
      faceShards();
      growths(deep, 0.7);
      // What's left of the shield, and crystal armor plates.
      const glass = M(def.shard);
      glass.transparent = true;
      glass.opacity = 0.75;
      const g = shieldOn(1.4, 1.2, glass);
      g.rotation.z = 0.4;
      part(h.torso, boxGeo(2.2, 1.6, 1.2), deep, 0, 0.1, 0);
      for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.25, 0.6, 1.25), deep, 0, -0.2, 0);
      if (def.crystal === 'rusherBroken') for (const leg of [h.rightLeg, h.leftLeg]) spike(leg, shard, 0, -1.2, -0.55, 0.2, 0.9, 0, -0.9);
      break;
    }
    case 'devotee':
    case 'reviver': {
      const big = def.crystal === 'reviver';
      const robe = M(def.robe);
      part(h.body, boxGeo(2.3, 2.1, 1.4), robe, 0, 1.0, 0);
      part(h.torso, boxGeo(2.15, 2.05, 1.15), robe, 0, 0, 0);
      part(h.head, boxGeo(1.4, 1.35, 1.25), robe, 0, 0.68, -0.12); // hood
      faceShards(big ? 1.2 : 1);
      part(h.torso, boxGeo(0.5, 0.7, 0.1), shard, 0, 0.3, 0.6); // glowing chest shard
      if (big) {
        // A crown of shards and a staff topped with a green crystal.
        for (let i = 0; i < 5; i++) spike(h.head, shard, -0.5 + i * 0.25, 1.5, 0.3, 0.14, 0.5 + (i === 2 ? 0.4 : 0), (i - 2) * -0.2);
        part(h.rightArm, boxGeo(0.25, 0.25, 6), M(0x0d1452), 0, -2.1, 0.6);
        spike(h.rightArm, shard, 0, -2.1, 3.9, 0.5, 1.2, 0, Math.PI / 2);
        growths(skin, 1.3);
      }
      break;
    }
    case 'pure':
      faceShards();
      growths(shard, 1.1);
      for (const [x, y] of [[-0.5, 0.5], [0.5, -0.2], [0, 0.9]]) spike(h.torso, shard, x, y, 0.52, 0.2, 0.5, x);
      break;
    case 'taint':
      faceShards();
      growths(skin, 1.3);
      for (const limb of [h.rightArm, h.leftArm, h.rightLeg, h.leftLeg]) spike(limb, shard, 0.45, -1.2, 0, 0.12, 0.8, -0.6);
      break;
    case 'jetpacker': {
      faceShards();
      growths(skin, 0.6);
      const metal = M(0x37474f);
      part(h.torso, boxGeo(1.6, 1.8, 0.8), metal, 0, 0.1, -0.9); // jetpack
      for (const x of [-0.5, 0.5]) {
        part(h.torso, boxGeo(0.5, 0.6, 0.5), metal, x, -0.9, -0.9);
        part(h.torso, boxGeo(0.4, 0.5, 0.4), glow(h, 0x40c4ff), x, -1.35, -0.9);
      }
      part(h.torso, boxGeo(2.1, 1.2, 1.15), M(0x455a64), 0, 0.4, 0); // armored vest
      break;
    }
    case 'engineer': {
      faceShards(1.1);
      growths(skin, 0.8);
      const yellow = M(0xfdd835);
      part(h.head, boxGeo(1.45, 0.45, 1.45), yellow, 0, 1.3, 0); // hard hat
      part(h.head, boxGeo(1.6, 0.12, 0.5), yellow, 0, 1.1, 0.6);
      part(h.body, boxGeo(2.15, 0.35, 1.15), M(0x5d4037), 0, 2.15, 0); // tool belt
      part(h.torso, boxGeo(1.6, 1.8, 1.0), M(0x455a64), 0, 0.1, -1.0); // backpack
      part(h.torso, boxGeo(0.12, 1.6, 0.12), M(0x212121), 0.5, 1.6, -1.1); // antenna
      part(h.torso, boxGeo(0.3, 0.3, 0.3), shard, 0.5, 2.4, -1.1);
      // Giant wrench.
      part(h.rightArm, boxGeo(0.3, 0.3, 3.5), M(0x90a4ae), 0, -2.1, 1.4);
      part(h.rightArm, boxGeo(0.9, 0.35, 0.6), M(0x90a4ae), 0, -2.1, 3.2);
      break;
    }
    case 'robot': {
      const metal = M(0x78909c);
      part(h.head, boxGeo(1.3, 1.3, 1.3), metal, 0, 0.62, 0);
      part(h.head, boxGeo(1.0, 0.22, 0.08), shard, 0, 0.75, 0.66); // visor
      part(h.head, boxGeo(0.12, 0.7, 0.12), metal, 0.35, 1.5, 0);
      part(h.head, boxGeo(0.25, 0.25, 0.25), shard, 0.35, 1.9, 0);
      part(h.torso, boxGeo(0.5, 0.5, 0.08), shard, 0, 0.3, 0.6);
      break;
    }
    case 'overlord':
      overlordParts(h, def, shard, spike);
      break;
  }
}

/** The Overlord (see the reference art): white armor, pink glows, a tall star crown and a scepter. */
export function overlordParts(h, def, pink, spike) {
  const { M } = h;
  const white = M(0xeceff1);
  const silver = M(0xb0bec5);
  const dark = M(0x263238);
  const black = M(0x111111);
  const crownM = glow(h, 0xff8a80);
  crownM.emissiveIntensity = 0.5;
  // Chest: layered white plates with black bands and a pink diamond.
  part(h.torso, boxGeo(2.4, 2.2, 1.4), white, 0, 0.05, 0);
  for (const y of [0.55, 0.2]) part(h.torso, boxGeo(2.45, 0.14, 1.45), black, 0, y, 0);
  part(h.torso, boxGeo(0.5, 0.5, 0.1), black, 0, -0.2, 0.72).rotation.z = Math.PI / 4;
  part(h.torso, boxGeo(0.3, 0.3, 0.12), pink, 0, -0.2, 0.74).rotation.z = Math.PI / 4;
  part(h.torso, boxGeo(1.2, 0.9, 0.1), silver, 0, -0.75, 0.71);
  // Huge shoulder pauldrons with hexagon gems.
  for (const [arm, side] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    part(arm, boxGeo(1.9, 1.3, 1.9), white, side * 0.15, 0.05, 0);
    for (const y of [-0.15, 0.25]) part(arm, boxGeo(1.95, 0.1, 1.95), silver, side * 0.15, y, 0);
    part(arm, boxGeo(0.45, 0.45, 0.1), pink, side * -0.2, -0.05, 1.0);
    part(arm, boxGeo(1.3, 1.3, 1.3), dark, 0, -1.3, 0); // gauntlet
    part(arm, boxGeo(0.25, 0.25, 0.1), pink, 0, -1.3, 0.67);
  }
  // Tassets and dark legs with pink knee gems.
  part(h.body, boxGeo(2.4, 1.0, 1.4), silver, 0, 1.7, 0);
  for (const leg of [h.rightLeg, h.leftLeg]) {
    part(leg, boxGeo(1.15, 1.8, 1.15), dark, 0, -1.0, 0);
    part(leg, boxGeo(1.2, 0.12, 1.2), silver, 0, -1.6, 0);
    part(leg, boxGeo(0.35, 0.35, 0.1), pink, 0, -1.3, 0.6).rotation.z = Math.PI / 4;
  }
  // Silver crystal spikes and pink crystals fanning out behind the shoulders.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) spike(h.torso, silver, side * (0.5 + i * 0.35), 1.5 + i * 0.15, -0.5, 0.3, 1.6 - i * 0.3, -side * (0.2 + i * 0.25));
    for (let i = 0; i < 3; i++) spike(h.torso, pink, side * (1.0 + i * 0.4), 1.0 + i * 0.5, -0.8, 0.45, 1.6, -side * (0.6 + i * 0.3), -0.3);
  }
  // The crown: a pink band with a tall spire and a star on top.
  part(h.head, boxGeo(1.35, 0.3, 1.35), crownM, 0, 1.25, 0);
  for (let i = 0; i < 5; i++) part(h.head, boxGeo(0.12, 0.12, 0.05), M(0xffffff), -0.5 + i * 0.25, 1.25, 0.69);
  spike(h.head, crownM, 0, 1.9, 0.1, 0.4, 1.2);
  spike(h.head, crownM, 0, 2.7, 0.1, 0.22, 1.0);
  spike(h.head, crownM, 0, 3.4, 0.1, 0.1, 0.8);
  part(h.head, boxGeo(0.3, 0.3, 0.1), pink, 0, 1.75, 0.32).rotation.z = Math.PI / 4;
  const star = part(h.head, boxGeo(0.35, 0.35, 0.1), glow(h, 0xffffff), 0, 3.95, 0.1);
  star.rotation.z = Math.PI / 4;
  for (const side of [-1, 1]) spike(h.head, crownM, side * 0.55, 1.6, 0.1, 0.18, 0.5, -side * 0.3);
  // Scepter in the right hand.
  part(h.rightArm, boxGeo(0.3, 0.3, 6.5), silver, 0, -2.1, 0.8);
  part(h.rightArm, boxGeo(0.7, 0.7, 0.7), white, 0, -2.1, 4.1);
  spike(h.rightArm, pink, 0, -2.1, 4.9, 0.45, 1.3, 0, Math.PI / 2);
}

/** Expert mode Drone: a low, fast crystal car with glowing shard fins. */
export function makeCrystalCarModel(def) {
  const h = creature();
  const { M } = h;
  const body = M(def.skin);
  const deep = M(0x0277bd);
  const shard = glow(h, def.shard);
  const car = new THREE.Group();
  h.body.add(car);
  part(car, boxGeo(2.4, 0.8, 4.2), body, 0, 0.9, 0);
  part(car, boxGeo(2.0, 0.7, 2.0), deep, 0, 1.6, -0.3); // cabin
  part(car, boxGeo(1.8, 0.4, 0.08), shard, 0, 1.6, 0.72); // glowing windshield strip
  for (const x of [-0.7, 0.7]) part(car, boxGeo(0.4, 0.2, 0.08), shard, x, 0.95, 2.12); // headlights
  for (const side of [-1, 1]) {
    const fin = part(car, boxGeo(0.15, 1.2, 1.4), shard, side * 0.9, 1.8, -1.6);
    fin.rotation.z = -side * 0.35;
  }
  h.wheels = [];
  for (const [x, z] of [[-1, -1.3], [1, -1.3], [-1, 1.3], [1, 1.3]]) {
    const w = part(h.body, cylGeo(0.5, 0.5, 0.35, 10), M(0x263238), x * 1.25, 0.5, z);
    w.rotation.z = Math.PI / 2;
    h.wheels.push(w);
  }
  h.anim = (phase, t) => {
    for (const w of h.wheels) w.rotation.x = phase * 3;
    car.position.y = Math.abs(Math.sin(t * 20)) * 0.05;
  };
  return h;
}

/** Expert mode UFO: a big saucer of blue crystal with a glowing underside and a laser cannon. */
export function makeCrystalUfoModel(def) {
  const h = creature();
  const { M } = h;
  const craft = new THREE.Group();
  craft.position.y = 0.6;
  h.body.add(craft);
  const crystal = M(def.skin);
  const deep = M(0x01579b);
  const shard = glow(h, def.shard);
  part(craft, cylGeo(2.4, 1.5, 0.6, 8), crystal, 0, 0.5, 0);
  part(craft, cylGeo(1.4, 2.4, 0.4, 8), deep, 0, 0.98, 0);
  part(craft, cylGeo(0.9, 0.6, 0.35, 8), shard, 0, 0.1, 0); // glowing underside
  const top = part(craft, cylGeo(0.2, 1.0, 1.2, 6), crystal, 0, 1.75, 0);
  top.castShadow = false;
  part(craft, boxGeo(0.25, 0.9, 0.25), shard, 0, 2.6, 0);
  part(craft, boxGeo(0.4, 0.4, 1.2), deep, 0, 0.2, 1.4); // laser cannon
  part(craft, boxGeo(0.2, 0.2, 0.3), glow(h, 0xff1744), 0, 0.2, 2.1);
  const ring = new THREE.Group();
  craft.add(ring);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const m = part(ring, boxGeo(0.25, 0.7, 0.25), shard, Math.sin(a) * 2.3, 0.75, Math.cos(a) * 2.3);
    m.rotation.z = 0.3;
  }
  h.anim = (phase, t) => {
    ring.rotation.y = t * 1.5;
    craft.rotation.z = Math.sin(t * 1.2) * 0.08;
    craft.position.y = 0.6 + Math.sin(t * 1.8) * 0.3;
  };
  return h;
}

/** Engineer teleporter: a ring of crystal pylons around a swirling purple portal. */
export function makeTeleporterModel(def) {
  const h = creature();
  const { M } = h;
  const base = M(0x37474f);
  const shard = glow(h, def.shard);
  part(h.body, cylGeo(2, 2.2, 0.4, 8), base, 0, 0.2, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    part(h.body, boxGeo(0.4, 2.6, 0.4), base, Math.sin(a) * 1.7, 1.5, Math.cos(a) * 1.7);
    part(h.body, boxGeo(0.3, 0.6, 0.3), shard, Math.sin(a) * 1.7, 3.0, Math.cos(a) * 1.7);
  }
  const portal = new THREE.Group();
  portal.position.y = 1.8;
  h.body.add(portal);
  const swirl = glow(h, def.skin);
  swirl.transparent = true;
  swirl.opacity = 0.7;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    part(portal, boxGeo(0.35, 0.35, 1.1), i % 2 ? shard : swirl, Math.sin(a) * 1.0, Math.cos(a) * 1.0, 0).rotation.z = -a;
  }
  part(portal, boxGeo(1.2, 1.2, 0.1), swirl, 0, 0, 0);
  h.anim = (phase, t) => {
    portal.rotation.z = t * 3;
    swirl.opacity = 0.55 + Math.sin(t * 5) * 0.2;
  };
  return h;
}

/** Overlord Amplifier: a floating pink crystal inside spinning white rings. */
export function makeAmplifierModel(def) {
  const h = creature();
  const { M } = h;
  const core = new THREE.Group();
  core.position.y = 2.2;
  h.body.add(core);
  const shard = glow(h, def.shard);
  const white = M(0xeceff1);
  part(core, boxGeo(0.9, 1.6, 0.9), shard, 0, 0, 0).rotation.y = Math.PI / 4;
  const rings = [];
  for (let r = 0; r < 2; r++) {
    const g = new THREE.Group();
    core.add(g);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(g, boxGeo(0.3, 0.3, 0.8), white, Math.sin(a) * 1.4, 0, Math.cos(a) * 1.4).rotation.y = a + Math.PI / 2;
    }
    g.rotation.x = r ? 0.6 : -0.6;
    rings.push(g);
  }
  h.anim = (phase, t) => {
    core.position.y = 2.2 + Math.sin(t * 2.5) * 0.3;
    rings[0].rotation.y = t * 2;
    rings[1].rotation.y = -t * 2.5;
    shard.emissiveIntensity = 0.6 + Math.sin(t * 6) * 0.3;
  };
  return h;
}

/** Hard mode Lava Golem: a golem of dark rock with lava running through it and fire on its back. */
export function makeLavaGolemModel() {
  const h = makeGolemModel();
  const [rock, dark, moss] = h.mats;
  rock.color.setHex(0x3e2723);
  dark.color.setHex(0x212121);
  moss.color.setHex(0xff6d00);
  moss.userData.glow = 0xff3d00;
  moss.emissive.setHex(0xff3d00);
  const torso = h.body.children[0];
  const lava = glow(h, 0xff6d00);
  for (const [x, y, w, hh] of [[-0.6, 0, 0.15, 1.6], [0.4, -0.5, 1.0, 0.15], [0.7, 0.4, 0.15, 0.9]]) {
    part(torso, boxGeo(w, hh, 0.06), lava, x, y, 0.96);
    part(torso, boxGeo(w, hh, 0.06), lava, -x, y, -0.96);
  }
  for (const limb of [h.leftArm, h.rightArm, h.leftLeg, h.rightLeg]) part(limb, boxGeo(1.24, 0.15, 1.24), lava, 0, -1.2, 0);
  const fire = flames(h, h.body, 5, 2.2, 6);
  const walk = h.anim;
  h.anim = (phase, t) => {
    walk(phase, t);
    fire(t);
    lava.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.25;
  };
  return h;
}

export function hazmatSuit(h, def) {
  const { M } = h;
  const suit = M(def.shirt);
  const rubber = M(0x212121);
  const glass = M(0x80deea);
  glass.userData.glow = 0x0b3b40; // keeps its tint after hit flashes
  glass.emissive.setHex(0x0b3b40);
  part(h.head, boxGeo(1.4, 1.4, 1.36), suit, 0, 0.62, 0); // hood
  part(h.head, boxGeo(1.0, 0.55, 0.06), glass, 0, 0.82, 0.7); // visor
  part(h.head, boxGeo(0.7, 0.4, 0.25), rubber, 0, 0.3, 0.75); // respirator
  part(h.head, cylGeo(0.22, 0.22, 0.3, 8), rubber, 0, 0.2, 0.95).rotation.x = Math.PI / 2;
  part(h.torso, boxGeo(0.9, 1.0, 0.5), M(0x9e9e9e), 0, 0.2, -0.75); // air tank
  part(h.torso, boxGeo(0.5, 0.5, 0.06), M(0x212121), 0.45, 0.45, 0.53); // ☢ badge
  part(h.torso, boxGeo(0.3, 0.3, 0.07), M(0xfdd835), 0.45, 0.45, 0.54);
  for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.05, 0.5, 1.05), rubber, 0, -1.8, 0); // gloves
  for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.05, 0.6, 1.1), rubber, 0, -1.75, 0.03); // boots
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

/** Flickering flame cubes on top of a model; returns an anim step. */
export function flames(h, parent, y, w, n, colors = [0xff3d00, 0xff9100, 0xffea00]) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const m = glow(h, colors[i % colors.length]);
    const sz = w * (0.22 + Math.random() * 0.14);
    const f = part(parent, boxGeo(sz, sz * 1.6, sz), m, (Math.random() - 0.5) * w * 0.8, y, (Math.random() - 0.5) * w * 0.8);
    f.castShadow = false;
    list.push({ f, y, off: Math.random() * 10 });
  }
  return (t) => {
    for (const { f, y: y0, off } of list) {
      const k = (t * 2.2 + off) % 1;
      f.position.y = y0 + k * w * 0.7;
      f.scale.setScalar(1 - k * 0.8);
      f.rotation.y = off + t * 3;
    }
  };
}

export function makeSlimeModel(def) {
  const h = creature();
  const { M } = h;
  const col = def.color ?? 0x66bb6a;
  const m = def.fire ? glow(h, col) : M(col);
  if (def.fire) m.emissiveIntensity = def.inferno ? 0.55 : 0.4;
  const blob = new THREE.Group();
  h.body.add(blob);
  part(blob, boxGeo(2.2, 1.4, 2.2), m, 0, 0.7, 0);
  part(blob, boxGeo(1.7, 0.6, 1.7), m, 0, 1.7, 0);
  part(blob, boxGeo(0.9, 0.3, 0.9), m, 0, 2.1, 0);
  const shade = M(new THREE.Color(col).multiplyScalar(0.6).getHex());
  part(blob, boxGeo(2.3, 0.25, 2.3), shade, 0, 0.12, 0); // darker goo at the bottom
  eyes(h, blob, 1.25, 1.12, { spread: 0.5, size: 0.42, white: def.inferno ? 0xffea00 : 0xffffff, glowing: !!def.inferno });
  if (def.inferno || (def.fire && def.boss)) {
    // Angry brows.
    for (const side of [-1, 1]) {
      const b = part(blob, boxGeo(0.6, 0.14, 0.1), M(0x111111), side * 0.5, 1.62, 1.14);
      b.rotation.z = side * -0.35;
    }
  }
  if (def.crown) crown(h, blob, 2.45, 1.0);
  const fire = def.fire ? flames(h, blob, 2.2, 1.6, def.inferno || def.boss ? 9 : 5) : null;
  h.anim = (phase, t) => {
    // Hop: squash on landing, stretch in the air.
    const s = Math.sin(phase * 1.3);
    blob.position.y = Math.max(0, s) * 0.6;
    blob.scale.set(1 - s * 0.08, 1 + s * 0.12, 1 - s * 0.08);
    fire?.(t);
  };
  return h;
}

/** A teardrop-shaped slime body (round bottom, pointed top), `r` wide at its fattest and `top` tall. */
const dropCache = new Map();
function dropGeo(r, top) {
  const k = `${r}|${top}`;
  let g = dropCache.get(k);
  if (!g) {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const a = i / 16; // 0 = bottom centre, 1 = tip
      const y = a * top;
      // A fat rounded base that narrows to a point at the top.
      const w = a < 0.35 ? Math.sqrt(1 - ((0.35 - a) / 0.35) ** 2) * 0.92 + 0.08 * (a / 0.35) : Math.pow(1 - (a - 0.35) / 0.65, 1.3);
      pts.push(new THREE.Vector2(Math.max(0.001, w * r), y));
    }
    pts[0].x = 0.001;
    g = new THREE.LatheGeometry(pts, 18);
    dropCache.set(k, g);
  }
  return g;
}

/** A simple mouth / brow strip on a creature's face. */
function strip(h, parent, w, x, y, z, rot = 0, color = 0x111111) {
  const s = part(parent, boxGeo(w, 0.12, 0.08), h.M(color), x, y, z);
  s.rotation.z = rot;
  s.castShadow = false;
  return s;
}

/** Hop animation shared by the slimes: squash on landing, stretch in the air. */
function slimeHop(blob, high = 0.6) {
  return (phase) => {
    const s = Math.sin(phase * 1.3);
    blob.position.y = Math.max(0, s) * high;
    blob.scale.set(1 - s * 0.08, 1 + s * 0.12, 1 - s * 0.08);
  };
}

/**
 * Easy mode slimes: a glossy teardrop with a pointed top. The plain Slime is purple with dot eyes
 * and a flat wavy mouth; Fire Slimes (orange) and Inferno Slimes (blue) have big black eyes and a smile.
 */
export function makeEasySlimeModel(def) {
  const h = creature();
  const { M } = h;
  const blob = new THREE.Group();
  h.body.add(blob);
  const body = M(def.color ?? 0x9c4dcc);
  body.emissive.setHex(def.color ?? 0x9c4dcc);
  body.emissiveIntensity = 0.12;
  part(blob, dropGeo(1.25, 2.6), body, 0, 0, 0);
  const black = M(0x111111);
  if (def.fireType) {
    // Big black eyes with a white shine, and a small smile.
    for (const side of [-1, 1]) {
      part(blob, boxGeo(0.34, 0.46, 0.1), black, side * 0.36, 0.95, 1.1);
      part(blob, boxGeo(0.12, 0.12, 0.06), M(0xffffff), side * 0.36 + 0.07, 1.06, 1.16);
    }
    strip(h, blob, 0.18, -0.16, 0.6, 1.16, 0.45);
    strip(h, blob, 0.18, 0.16, 0.6, 1.16, -0.45);
    strip(h, blob, 0.16, 0, 0.55, 1.17);
  } else {
    // Two dot eyes and a flat wavy mouth.
    for (const side of [-1, 1]) part(blob, boxGeo(0.18, 0.18, 0.08), black, side * 0.32, 0.95, 1.13);
    for (let i = 0; i < 4; i++) strip(h, blob, 0.18, -0.24 + i * 0.16, 0.62, 1.15, i % 2 ? -0.5 : 0.5);
  }
  h.anim = slimeHop(blob);
  return h;
}

/**
 * The King Slime: a round blue slime with angry slanted brows, a frown and pink blush, a gold
 * crown, a red cape trimmed with white fur, and a yellow scepter topped with a little blue slime drop.
 */
export function makeKingSlimeModel(def) {
  const h = creature();
  const { M } = h;
  const blob = new THREE.Group();
  h.body.add(blob);
  const col = def.color ?? 0x1e88e5;
  const body = M(col);
  body.emissive.setHex(col);
  body.emissiveIntensity = 0.12;
  const ball = part(blob, new THREE.SphereGeometry(1.3, 20, 14), body, 0, 1.2, 0);
  ball.scale.set(1, 0.9, 1);
  part(blob, cylGeo(1.15, 1.2, 0.3, 18), body, 0, 0.15, 0); // flat bottom
  const black = M(0x111111);
  for (const side of [-1, 1]) {
    part(blob, boxGeo(0.2, 0.26, 0.08), black, side * 0.4, 1.35, 1.24);
    strip(h, blob, 0.5, side * 0.42, 1.68, 1.18, side * -0.4); // angry slanted brows
    part(blob, boxGeo(0.34, 0.16, 0.06), M(0xf48fb1), side * 0.75, 1.05, 1.08).castShadow = false; // blush
  }
  // A frown.
  strip(h, blob, 0.3, -0.18, 0.8, 1.24, 0.35);
  strip(h, blob, 0.3, 0.18, 0.8, 1.24, -0.35);
  crown(h, blob, 2.45, 0.95);
  // Red cape with white fur trim along the top.
  const cape = part(blob, boxGeo(2.2, 1.9, 0.12), M(0xc62828), 0, 1.15, -1.15);
  cape.rotation.x = 0.2;
  part(blob, boxGeo(2.4, 0.3, 0.35), M(0xfafafa), 0, 2.0, -1.0);
  for (const x of [-0.8, 0, 0.8]) part(blob, boxGeo(0.12, 0.12, 0.06), black, x, 2.0, -0.82); // ermine spots
  // Yellow scepter with a little blue slime drop on top.
  const sc = new THREE.Group();
  sc.position.set(-1.45, 0.9, 0.4);
  sc.rotation.z = 0.15;
  blob.add(sc);
  part(sc, cylGeo(0.08, 0.08, 2.2, 8), glow(h, 0xffd600), 0, 0.6, 0).material.emissiveIntensity = 0.3;
  part(sc, new THREE.SphereGeometry(0.2, 10, 8), glow(h, 0xffd600), 0, 1.75, 0);
  part(sc, dropGeo(0.22, 0.5), body, 0, 1.9, 0);
  h.anim = slimeHop(blob, 0.35);
  return h;
}

/**
 * Goblin: a small red goblin with one pale horn, little fangs, a ragged green loincloth and a grey
 * frying pan on its head.
 */
export function makeGoblinModel(def) {
  const red = 0xd84343;
  const h = makeHumanoid({ skin: red, shirt: red, pants: red, face: 'goblin' });
  const { M } = h;
  const skin = M(red);
  for (const side of [-1, 1]) {
    const ear = part(h.head, boxGeo(0.8, 0.3, 0.2), skin, side * 0.9, 0.75, 0);
    ear.rotation.z = side * 0.35;
    part(h.head, boxGeo(0.12, 0.22, 0.1), M(0xfafafa), side * 0.22, 0.12, 0.62); // fangs
  }
  // One pale horn poking out from under the pan.
  const horn = part(h.head, boxGeo(0.22, 0.6, 0.22), M(0xefe6c8), 0.38, 1.35, 0.1);
  horn.rotation.z = -0.35;
  // The frying pan, worn upside down like a helmet, handle sticking out the back.
  const pan = M(0x757575);
  part(h.head, cylGeo(0.78, 0.7, 0.28, 14), pan, 0, 1.32, 0);
  part(h.head, boxGeo(0.2, 0.1, 1.1), M(0x424242), 0, 1.3, -1.2);
  // Ragged green loincloth.
  const cloth = M(0x2e7d32);
  part(h.torso, boxGeo(2.1, 0.45, 1.1), cloth, 0, -0.85, 0);
  for (const x of [-0.6, 0.1, 0.65]) part(h.torso, boxGeo(0.45, 0.6, 0.12), cloth, x, -1.3, 0.5);
  for (const x of [-0.4, 0.5]) part(h.torso, boxGeo(0.5, 0.5, 0.12), cloth, x, -1.25, -0.5);
  h.anim = (phase) => {
    const sw = Math.sin(phase) * 0.7;
    h.leftLeg.rotation.x = sw;
    h.rightLeg.rotation.x = -sw;
    h.leftArm.rotation.x = -sw * 0.8;
    h.rightArm.rotation.x = sw * 0.8;
    h.body.position.y = Math.abs(Math.cos(phase)) * 0.2;
    h.body.rotation.x = 0.15; // hunched over
  };
  return h;
}

/** Giant Goblin: a big green goblin with grey horns, pointy ears, an angry face, a grey vest and brown boots. */
export function makeGiantGoblinModel(def) {
  const green = 0x7cb342;
  const h = makeHumanoid({ skin: green, shirt: green, pants: 0x5d4037, face: 'goblin' });
  const { M } = h;
  const skin = M(green);
  for (const side of [-1, 1]) {
    const ear = part(h.head, boxGeo(0.95, 0.35, 0.2), skin, side * 0.95, 0.7, 0);
    ear.rotation.z = side * 0.4;
    const horn = part(h.head, boxGeo(0.25, 0.7, 0.25), M(0x9e9e9e), side * 0.45, 1.45, 0);
    horn.rotation.z = side * -0.35;
    strip(h, h.head, 0.5, side * 0.3, 1.0, 0.63, side * -0.4, 0x1b1b1b); // angry brows
  }
  // Grey vest open over the chest.
  const vest = M(0x616161);
  for (const side of [-1, 1]) part(h.torso, boxGeo(0.75, 2.05, 1.08), vest, side * 0.65, 0, 0);
  part(h.torso, boxGeo(2.05, 2.05, 0.3), vest, 0, 0, -0.42);
  // Brown boots.
  const boot = M(0x4e342e);
  for (const leg of [h.leftLeg, h.rightLeg]) part(leg, boxGeo(1.1, 0.7, 1.3), boot, 0, -1.7, 0.1);
  h.anim = (phase) => {
    const sw = Math.sin(phase * 0.8) * 0.55;
    h.leftLeg.rotation.x = sw;
    h.rightLeg.rotation.x = -sw;
    h.leftArm.rotation.x = -sw * 0.7;
    h.rightArm.rotation.x = sw * 0.7;
    h.body.position.y = Math.abs(Math.cos(phase * 0.8)) * 0.15;
    h.body.rotation.z = Math.sin(phase * 0.8) * 0.04; // heavy stomp
  };
  return h;
}

/** Spider: a round black spider with thin black legs, small fangs and red stripes on its face. */
export function makeSpiderModel(def) {
  const h = creature();
  const { M } = h;
  const black = M(0x1c1c1c);
  const ball = part(h.body, new THREE.SphereGeometry(1.0, 16, 12), black, 0, 1.25, -0.2);
  ball.scale.set(1, 0.9, 1.05);
  const red = M(0xe53935);
  for (const side of [-1, 1]) {
    // Red stripe markings and white eyes on the front.
    const st = part(h.body, boxGeo(0.12, 0.5, 0.08), red, side * 0.55, 1.35, 0.72);
    st.rotation.z = side * 0.4;
    st.castShadow = false;
    part(h.body, boxGeo(0.2, 0.2, 0.08), M(0xffffff), side * 0.25, 1.45, 0.86);
    part(h.body, boxGeo(0.1, 0.32, 0.1), M(0xeeeeee), side * 0.15, 0.82, 0.72); // fangs
  }
  part(h.body, boxGeo(0.12, 0.4, 0.08), red, 0, 1.75, 0.66).castShadow = false;
  h.legs = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.6, 1.2, 0.35 - i * 0.35);
      pivot.rotation.y = side * (0.5 - i * 0.33) * -1;
      h.body.add(pivot);
      const upper = new THREE.Group();
      upper.rotation.z = side * 0.6;
      pivot.add(upper);
      part(upper, boxGeo(1.2, 0.1, 0.1), black, side * 0.6, 0, 0);
      const knee = new THREE.Group();
      knee.position.x = side * 1.2;
      knee.rotation.z = side * -1.6;
      upper.add(knee);
      part(knee, boxGeo(1.8, 0.08, 0.08), black, side * 0.9, 0, 0);
      h.legs.push({ pivot, base: pivot.rotation.y, i, side });
    }
  }
  h.anim = (phase) => {
    for (const l of h.legs) l.pivot.rotation.y = l.base + Math.sin(phase * 2 + (l.i + (l.side > 0 ? 1 : 0)) * Math.PI) * 0.3;
    h.body.position.y = Math.abs(Math.sin(phase * 2)) * 0.08;
  };
  return h;
}

/** Ghost: a plain pale-grey sheet ghost with two black dot eyes and a small open mouth. */
export function makeGhostModel(def) {
  const h = creature();
  const { M } = h;
  const sheet = M(0xd6d9dc);
  const float = new THREE.Group();
  h.body.add(float);
  const head = part(float, new THREE.SphereGeometry(1.0, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), sheet, 0, 2.6, 0);
  head.castShadow = true;
  part(float, cylGeo(1.0, 1.25, 1.9, 16), sheet, 0, 1.65, 0);
  const tails = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    tails.push(part(float, boxGeo(0.5, 0.45, 0.5), sheet, Math.sin(a) * 1.0, 0.55, Math.cos(a) * 1.0));
  }
  const black = M(0x111111);
  for (const side of [-1, 1]) part(float, boxGeo(0.2, 0.24, 0.08), black, side * 0.33, 2.75, 0.96);
  part(float, boxGeo(0.22, 0.26, 0.08), black, 0, 2.25, 1.03); // small open mouth
  h.anim = (phase, t) => {
    float.position.y = 0.4 + Math.sin(t * 2.5 + phase * 0.1) * 0.3;
    float.rotation.z = Math.sin(t * 1.7) * 0.08;
    tails.forEach((tl, i) => (tl.position.y = 0.55 + Math.sin(t * 6 + i * 2) * 0.1));
  };
  return h;
}

/** Shroom: a purple white-spotted mushroom cap over a beige body with an angry frowning face. */
export function makeShroomModel(def) {
  const h = creature();
  const { M } = h;
  const beige = M(0xe8d5b0);
  const stem = new THREE.Group();
  h.body.add(stem);
  part(stem, cylGeo(0.75, 0.9, 1.9, 14), beige, 0, 1.1, 0);
  const cap = part(stem, new THREE.SphereGeometry(1.5, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(0x8e24aa), 0, 1.95, 0);
  cap.scale.y = 0.85;
  part(stem, cylGeo(1.5, 1.5, 0.15, 18), M(0x6a1b9a), 0, 1.95, 0); // underside rim
  const white = M(0xffffff);
  for (const [a, y, r] of [[0.3, 2.9, 1.0], [1.6, 2.5, 1.35], [2.8, 2.7, 1.2], [4.2, 2.5, 1.35], [5.3, 2.75, 1.15], [0, 3.2, 0.3]]) {
    const sp = part(stem, boxGeo(0.4, 0.15, 0.4), white, Math.sin(a) * r, y, Math.cos(a) * r);
    sp.lookAt(0, 1.95, 0);
    sp.castShadow = false;
  }
  const black = M(0x111111);
  for (const side of [-1, 1]) {
    part(stem, boxGeo(0.18, 0.2, 0.08), black, side * 0.3, 1.35, 0.8);
    strip(h, stem, 0.4, side * 0.3, 1.6, 0.8, side * -0.45); // angry brows
  }
  strip(h, stem, 0.24, -0.12, 0.9, 0.86, 0.4); // frown
  strip(h, stem, 0.24, 0.12, 0.9, 0.86, -0.4);
  h.feet = [];
  for (const side of [-1, 1]) h.feet.push(part(h.body, boxGeo(0.5, 0.3, 0.7), beige, side * 0.45, 0.15, 0.1));
  h.anim = (phase) => {
    const sw = Math.sin(phase);
    h.feet[0].position.z = 0.1 + sw * 0.3;
    h.feet[1].position.z = 0.1 - sw * 0.3;
    stem.rotation.z = sw * 0.07;
    stem.position.y = Math.abs(Math.cos(phase)) * 0.12;
  };
  return h;
}

/** Golem: a brown boulder with angry slanted eyes, two floating rock fists and an orange crystal on top. */
export function makeBoulderGolemModel(def) {
  const h = creature();
  const { M } = h;
  const rock = M(0x7b5e45);
  rock.flatShading = true;
  const boulder = new THREE.Group();
  h.body.add(boulder);
  const b = part(boulder, new THREE.IcosahedronGeometry(1.7, 1), rock, 0, 1.9, 0);
  b.scale.set(1, 0.95, 0.95);
  // Orange crystal sticking out of the top.
  const cry = glow(h, 0xff9100);
  cry.emissiveIntensity = 0.5;
  const c1 = part(boulder, new THREE.OctahedronGeometry(0.45), cry, 0.2, 3.65, 0);
  c1.scale.y = 1.8;
  const c2 = part(boulder, new THREE.OctahedronGeometry(0.28), cry, -0.35, 3.45, 0.15);
  c2.scale.y = 1.6;
  c2.rotation.z = 0.4;
  // Angry slanted eyes.
  const black = M(0x111111);
  for (const side of [-1, 1]) {
    const e = part(boulder, boxGeo(0.5, 0.2, 0.1), black, side * 0.45, 2.25, 1.55);
    e.rotation.z = side * -0.35;
  }
  strip(h, boulder, 0.5, 0, 1.6, 1.6);
  // Two floating rock fists.
  const fists = [];
  for (const side of [-1, 1]) {
    const f = part(h.body, new THREE.IcosahedronGeometry(0.6, 0), rock, side * 2.4, 1.6, 0.4);
    fists.push({ f, side });
  }
  h.anim = (phase, t) => {
    boulder.rotation.z = Math.sin(phase * 0.8) * 0.06;
    boulder.position.y = -Math.abs(Math.sin(phase * 0.8)) * 0.12;
    for (const { f, side } of fists) {
      f.position.y = 1.6 + Math.sin(t * 2 + side) * 0.25;
      f.position.z = 0.4 + Math.sin(phase * 0.8 * side) * 0.3;
    }
  };
  return h;
}

/** Reaper: a small black hooded figure with a dark face, two white eyes and a ragged grey cloak. */
export function makeReaperModel(def) {
  const h = creature();
  const { M } = h;
  const cloak = M(0x6e6e6e);
  const hood = M(0x151515);
  const float = new THREE.Group();
  h.body.add(float);
  part(float, cylGeo(0.75, 1.25, 2.6, 12), cloak, 0, 1.6, 0);
  // Ragged cloak hem.
  const rags = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    rags.push(part(float, boxGeo(0.45, 0.6 + (i % 3) * 0.15, 0.2), cloak, Math.sin(a) * 1.15, 0.35, Math.cos(a) * 1.15));
    rags[i].rotation.y = a;
  }
  part(float, new THREE.SphereGeometry(0.85, 14, 10), hood, 0, 3.35, 0); // hood
  part(float, boxGeo(1.0, 0.9, 0.3), M(0x050505), 0, 3.4, 0.62); // dark face
  const eye = glow(h, 0xffffff);
  for (const side of [-1, 1]) part(float, boxGeo(0.16, 0.16, 0.06), eye, side * 0.22, 3.45, 0.79);
  for (const side of [-1, 1]) part(float, boxGeo(0.4, 1.4, 0.45), cloak, side * 0.95, 2.1, 0.1).rotation.z = side * 0.25; // sleeves
  h.anim = (phase, t) => {
    float.position.y = 0.25 + Math.sin(t * 2.2) * 0.15;
    float.rotation.x = 0.08;
    rags.forEach((r, i) => (r.rotation.x = Math.sin(t * 5 + i) * 0.25));
  };
  return h;
}

export function makeGolemModel() {
  const h = creature();
  const { M } = h;
  const rock = M(0x9e9e9e);
  const dark = M(0x757575);
  const moss = M(0x689f38);
  const torso = part(h.body, boxGeo(2.9, 2.5, 1.9), rock, 0, 3.6, 0);
  part(torso, boxGeo(1.2, 0.8, 0.3), dark, -0.5, 0.5, 0.9);
  part(torso, boxGeo(1.4, 0.4, 2.0), moss, 0.3, 1.2, 0);
  const head = part(h.body, boxGeo(1.4, 1.2, 1.3), dark, 0, 5.4, 0.2);
  eyes(h, head, 0.1, 0.66, { spread: 0.33, size: 0.28, white: 0xff9100, glowing: true });
  part(head, boxGeo(1.5, 0.25, 0.4), rock, 0, 0.45, 0.5); // heavy brow
  const limb = (x, y, w, len, mat) => {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    h.body.add(p);
    part(p, boxGeo(w, len, w), mat, 0, -len / 2, 0);
    part(p, boxGeo(w * 1.15, w * 0.7, w * 1.15), dark, 0, -len + w * 0.3, 0);
    return p;
  };
  h.leftArm = limb(2.0, 4.6, 1.2, 3.2, rock);
  h.rightArm = limb(-2.0, 4.6, 1.2, 3.2, rock);
  h.leftLeg = limb(0.75, 2.35, 1.2, 2.2, dark);
  h.rightLeg = limb(-0.75, 2.35, 1.2, 2.2, dark);
  h.anim = (phase) => {
    const sw = Math.sin(phase * 0.8);
    h.leftLeg.rotation.x = sw * 0.45;
    h.rightLeg.rotation.x = -sw * 0.45;
    h.leftArm.rotation.x = -sw * 0.35;
    h.rightArm.rotation.x = sw * 0.35;
    h.body.rotation.z = sw * 0.05;
    h.body.position.y = -Math.abs(sw) * 0.15;
  };
  return h;
}

/** What a Molten (or a Bulwark) leaves behind: a smoldering heap that has to be broken. */
export function makeCorpseModel(def) {
  const h = creature();
  const { M } = h;
  const lava = glow(h, def.lava ?? 0xff6d00);
  const heap = new THREE.Group();
  h.body.add(heap);
  if (def.metal) {
    // Bulwark wreck: twisted armor plates around a still-glowing reactor.
    const metal = M(0x546e7a);
    const dark = M(0x37474f);
    part(heap, boxGeo(2.6, 1.0, 2), metal, 0, 0.5, 0).rotation.y = 0.3;
    part(heap, boxGeo(1.2, 0.8, 1.2), dark, 1.3, 0.4, 1.0).rotation.z = 0.5;
    part(heap, boxGeo(0.6, 0.6, 1.8), dark, -1.4, 0.3, -0.6).rotation.y = 0.8;
    part(heap, boxGeo(0.9, 0.9, 0.9), lava, 0, 1.1, 0);
  } else {
    const rock = M(0x3e2723);
    part(heap, boxGeo(2, 0.8, 1.2), rock, 0, 0.4, 0); // body, lying down
    part(heap, boxGeo(1, 0.8, 1), rock, 1.5, 0.4, 0.1); // head
    part(heap, boxGeo(0.8, 0.5, 1.6), rock, -0.3, 0.25, 1.2).rotation.y = 0.4; // arm
    part(heap, boxGeo(1.4, 0.5, 0.7), rock, -1.6, 0.25, -0.3); // leg
    for (const [x, z, w, d] of [[0, 0, 1.6, 0.12], [0.3, 0.2, 0.12, 0.9], [1.5, 0.1, 0.5, 0.12]]) part(heap, boxGeo(w, 0.08, d), lava, x, 0.82, z);
  }
  const fire = flames(h, heap, 1, def.metal ? 1.6 : 1.2, 4);
  h.anim = (phase, t) => {
    fire(t);
    lava.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.25;
  };
  return h;
}

/**
 * Insane mode outfits (def.insane): purple chains, scrap robots, time beings and the Beholder.
 * Arms point forward, so in an arm's frame -y runs along it toward the hand and +z is up.
 */
let warperRingGeo = null; // shared by every Warper

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

export function insaneParts(h, def) {
  const { M } = h;
  const glowC = glow(h, def.glowC ?? 0xb388ff);
  const metal = M(0x78909c);
  const dark = M(0x263238);
  // A chain of `n` links from a to b (local to `parent`); links alternate flat and upright.
  const chainMat = M(0x4a148c);
  const chain = (parent, [ax, ay, az], [bx, by, bz], n, size = 0.22) => {
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const m = part(parent, boxGeo(size * (i % 2 ? 0.5 : 1.6), size * (i % 2 ? 1.6 : 0.5), size * 0.7), i % 4 === 0 ? glowC : chainMat,
        ax + (bx - ax) * f, ay + (by - ay) * f, az + (bz - az) * f);
      m.rotation.z = Math.atan2(by - ay, bx - ax);
    }
  };
  const wrapChains = (big) => {
    const n = big ? 9 : 7;
    chain(h.torso, [-1.05, 1.0, 0.56], [1.05, -0.9, 0.56], n);
    chain(h.torso, [-1.05, -0.4, -0.56], [1.05, 0.9, -0.56], n);
    chain(h.torso, [-1.05, 0.2, 0.56], [1.05, 0.2, 0.56], n);
    for (const limb of [h.rightArm, h.leftArm, h.rightLeg, h.leftLeg]) chain(limb, [-0.55, -1.2, 0.55], [0.55, -1.0, 0.55], 4, 0.18);
    part(h.torso, boxGeo(0.5, 0.6, 0.25), glowC, 0.2, -0.5, 0.66); // padlock
    part(h.head, boxGeo(1.3, 0.2, 1.3), chainMat, 0, 0.35, 0); // chain around the jaw
    if (big) {
      for (const side of [-1, 1]) {
        part(h.torso, boxGeo(0.3, 0.8, 0.3), glowC, side * 1.2, 1.1, 0).rotation.z = -side * 0.5; // purple growths
        part(h.head, boxGeo(0.25, 0.6, 0.25), glowC, side * 0.45, 1.4, 0).rotation.z = -side * 0.3;
      }
      for (const [x, y] of [[-0.5, 0.6], [0.6, -0.2], [-0.2, -0.8]]) part(h.torso, boxGeo(0.12, 0.6, 0.06), glowC, x, y, 0.53); // veins
    }
  };
  // Robot head: a metal box with a glowing visor strip.
  const robotHead = (visorColor = def.glowC, w = 1.0) => {
    part(h.head, boxGeo(1.35, 1.35, 1.35), metal, 0, 0.6, 0);
    part(h.head, boxGeo(w, 0.22, 0.08), glow(h, visorColor), 0, 0.75, 0.7);
  };
  switch (def.insane) {
    case 'chained':
      wrapChains(false);
      break;
    case 'megaChained':
      wrapChains(true);
      break;
    case 'crawler': {
      wrapChains(false);
      // Crawls on its belly, arms reaching ahead, legs dragging behind.
      h.anim = (phase) => {
        h.body.rotation.x = Math.PI / 2;
        h.body.position.y = 0.6;
        const sw = Math.sin(phase * 1.4) * 0.5;
        h.rightArm.rotation.x = Math.PI + sw;
        h.leftArm.rotation.x = Math.PI - sw;
        h.rightLeg.rotation.x = sw * 0.4;
        h.leftLeg.rotation.x = -sw * 0.4;
        h.head.rotation.x = -0.9; // looking ahead
        h.body.rotation.z = sw * 0.12;
      };
      break;
    }
    case 'bioGunner': {
      // Gas mask, a goo tank on its back and a purple goo gun.
      part(h.head, boxGeo(1.0, 0.6, 0.3), dark, 0, 0.45, 0.7);
      for (const side of [-1, 1]) part(h.head, boxGeo(0.35, 0.35, 0.3), glow(h, 0xd500f9), side * 0.3, 0.8, 0.68);
      part(h.head, boxGeo(0.4, 0.4, 0.5), metal, 0, 0.25, 0.95); // filter
      part(h.torso, boxGeo(1.2, 1.8, 0.8), metal, 0, 0.1, -0.9);
      part(h.torso, boxGeo(0.9, 1.4, 0.1), glowC, 0, 0.1, -1.32); // goo window
      part(h.rightArm, boxGeo(0.7, 0.7, 2.6), dark, 0, -2.1, 0.4);
      part(h.rightArm, boxGeo(0.45, 0.45, 1.2), glowC, 0, -2.1, 0.4).position.y = -3.2; // nozzle
      part(h.rightArm, boxGeo(0.6, 0.9, 0.6), glowC, 0, -1.8, 1.2); // goo canister on top
      break;
    }
    case 'radiator': {
      // Lead armor (from def.lead) with glowing green radiation cracks and a hazard sign.
      part(h.torso, boxGeo(0.9, 0.9, 0.08), M(0xfdd835), 0, 0.3, 0.7);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        part(h.torso, boxGeo(0.22, 0.32, 0.06), M(0x111111), Math.sin(a) * 0.22, 0.3 + Math.cos(a) * 0.22, 0.75).rotation.z = -a;
      }
      for (const [x, y] of [[-0.8, -0.3], [0.8, 0.6], [0.6, -0.8]]) part(h.torso, boxGeo(0.12, 0.7, 0.06), glowC, x, y, 0.68);
      part(h.head, boxGeo(1.0, 0.18, 0.08), glowC, 0, 0.75, 0.72); // visor slit
      for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(0.12, 0.6, 1.15), glowC, 0.56, -1.4, 0);
      break;
    }
    case 'smoker': {
      // A robot with a smoking grill for a mouth and a big tank on its back.
      robotHead(0xff6d00);
      part(h.head, boxGeo(0.8, 0.35, 0.1), dark, 0, 0.3, 0.72); // mouth grill
      for (const x of [-0.25, 0, 0.25]) part(h.head, boxGeo(0.08, 0.3, 0.12), glow(h, 0xff6d00), x, 0.3, 0.74);
      part(h.torso, boxGeo(2.1, 2.0, 1.1), metal, 0, 0, 0);
      part(h.torso, cylGeo(0.75, 0.75, 2.6, 12), M(0x546e7a), 0, 0.4, -1.2);
      part(h.torso, cylGeo(0.25, 0.25, 0.8, 8), dark, 0.4, 2.0, -1.2); // chimney
      part(h.torso, boxGeo(0.3, 0.3, 0.3), glow(h, 0xff6d00), 0.4, 2.45, -1.2);
      break;
    }
    case 'sprinter': {
      // A sleek red robot runner: visor, red plates and fins.
      robotHead(0xff1744, 1.2);
      part(h.head, boxGeo(0.25, 0.6, 1.2), M(0xc62828), 0, 1.45, -0.1); // fin
      part(h.torso, boxGeo(2.05, 1.6, 1.08), M(0xb71c1c), 0, 0.2, 0);
      part(h.torso, boxGeo(0.12, 1.4, 0.06), glowC, 0, 0.2, 0.56);
      for (const leg of [h.rightLeg, h.leftLeg]) {
        part(leg, boxGeo(1.05, 1.0, 1.05), metal, 0, -1.4, 0);
        part(leg, boxGeo(0.2, 0.7, 0.6), glowC, 0, -1.2, -0.7); // heel thruster
      }
      break;
    }
    case 'mechanic': {
      // A big yellow work robot with a huge wrench.
      robotHead(0xffd740);
      part(h.head, boxGeo(1.5, 0.3, 1.5), M(0xf9a825), 0, 1.4, 0); // hard hat
      part(h.torso, boxGeo(2.3, 2.1, 1.3), M(0xf9a825), 0, 0, 0);
      part(h.torso, boxGeo(1.6, 0.25, 1.35), dark, 0, -0.75, 0); // tool belt
      for (const x of [-0.5, 0.1, 0.6]) part(h.torso, boxGeo(0.25, 0.45, 0.3), metal, x, -0.95, 0.7);
      part(h.rightArm, boxGeo(0.4, 0.4, 4.2), metal, 0, -2.1, 1.0); // wrench handle
      part(h.rightArm, boxGeo(1.3, 0.5, 0.5), metal, 0, -2.1, 3.2); // jaw
      part(h.rightArm, boxGeo(0.4, 0.5, 0.9), metal, -0.45, -2.1, 3.6);
      part(h.rightArm, boxGeo(0.4, 0.5, 0.9), metal, 0.45, -2.1, 3.6);
      break;
    }
    case 'battery': {
      // A slow robot with a giant battery on its back and crackling coils.
      robotHead(0x40c4ff, 1.2);
      part(h.torso, boxGeo(2.3, 2.1, 1.3), metal, 0, 0, 0);
      part(h.torso, cylGeo(1.0, 1.0, 3.2, 14), M(0x212121), 0, 0.6, -1.6);
      part(h.torso, cylGeo(1.02, 1.02, 0.8, 14), M(0x1565c0), 0, 1.6, -1.6);
      part(h.torso, cylGeo(0.35, 0.35, 0.4, 10), metal, 0, 2.4, -1.6); // terminal
      part(h.torso, boxGeo(0.6, 0.15, 0.1), glowC, 0, 0.6, -2.65); // + sign
      part(h.torso, boxGeo(0.15, 0.6, 0.1), glowC, 0, 0.6, -2.65);
      for (const side of [-1, 1]) {
        part(h.torso, cylGeo(0.2, 0.2, 1.2, 8), dark, side * 1.2, 1.5, 0);
        part(h.torso, boxGeo(0.45, 0.45, 0.45), glowC, side * 1.2, 2.2, 0); // coil tops
      }
      for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(0.5, 0.3, 0.5), glowC, 0, -2.1, 0);
      break;
    }
    case 'king': {
      // A robotic king: crown, a long purple cape and a spear.
      robotHead(0xd500f9, 1.1);
      crown(h, h.head, 1.3, 1.4);
      part(h.torso, boxGeo(2.1, 1.8, 1.1), M(0x9e9e9e), 0, 0.15, 0);
      part(h.torso, boxGeo(0.6, 0.6, 0.08), glowC, 0, 0.4, 0.58); // chest gem
      part(h.body, boxGeo(2.4, 3.6, 0.15), M(0x6a1b9a), 0, 2.4, -0.7); // cape
      part(h.body, boxGeo(2.6, 0.4, 0.4), M(0xeceff1), 0, 4.0, -0.55); // fur collar
      part(h.rightArm, boxGeo(0.25, 0.25, 6), M(0x5d4037), 0, -2.1, 0.8); // spear shaft
      part(h.rightArm, boxGeo(0.5, 0.15, 1.3), glowC, 0, -2.1, 4.4); // spearhead
      break;
    }
    case 'warper': {
      // A hooded violet being with a clock for a chest and floating gear rings.
      part(h.body, boxGeo(2.3, 2.6, 1.4), M(0x311b92), 0, 1.3, 0); // robe
      part(h.head, boxGeo(1.45, 1.4, 1.35), M(0x1a0f3a), 0, 0.7, -0.08); // hood
      part(h.torso, cylGeoX(0.75, 0.75, 0.1, 16), M(0xede7f6), 0, 0.3, 0.56);
      part(h.torso, boxGeo(0.08, 0.6, 0.05), dark, 0, 0.5, 0.63);
      part(h.torso, boxGeo(0.45, 0.08, 0.05), dark, 0.2, 0.3, 0.63);
      for (const side of [-1, 1]) {
        const ring = part(h.torso, (warperRingGeo ??= new THREE.TorusGeometry(0.5, 0.08, 4, 10)), glowC, side * 1.6, 1.6, 0);
        ring.rotation.y = Math.PI / 2;
      }
      break;
    }
    case 'glitch': {
      // A dark figure torn up by cyan static blocks.
      const cyan = glowC;
      const pink = glow(h, 0xff4081);
      for (const [p, x, y, z, w] of [[h.torso, 0.7, 0.6, 0.55, 0.7], [h.torso, -0.6, -0.4, 0.55, 0.9], [h.torso, 0.2, -0.8, -0.55, 0.6],
        [h.head, -0.3, 0.9, 0.62, 0.6], [h.head, 0.5, 0.4, 0.3, 0.4], [h.rightArm, 0.4, -1.4, 0.4, 0.5], [h.leftLeg, -0.3, -0.8, 0.5, 0.5]]) {
        part(p, boxGeo(w, 0.2, 0.08), cyan, x, y, z);
        part(p, boxGeo(w * 0.6, 0.12, 0.08), pink, x + 0.15, y - 0.2, z);
      }
      break;
    }
    case 'beholder':
    case 'beholderTime': {
      // The Beholder: a long grey coat, a dark hood around a black face with two glowing eyes.
      const coat = M(0x9e9e9e);
      const coatDark = M(0x757575);
      const hood = M(0x2b2b2b);
      part(h.torso, boxGeo(2.2, 2.15, 1.2), coat, 0, 0, 0);
      part(h.body, boxGeo(2.3, 1.8, 1.25), coat, 0, 1.4, 0); // coat skirt over the legs
      part(h.torso, boxGeo(0.1, 2.0, 0.05), coatDark, 0, -0.1, 0.62); // zip
      for (const side of [-1, 1]) {
        part(h.torso, boxGeo(0.6, 0.45, 0.06), coatDark, side * 0.6, -0.6, 0.62); // pockets
        part(h.body, boxGeo(0.6, 0.45, 0.06), coatDark, side * 0.6, 1.3, 0.64);
      }
      for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.15, 2.05, 1.15), coat, 0, -1.0, 0); // sleeves
      part(h.head, boxGeo(1.6, 1.6, 0.25), hood, 0, 0.65, -0.68); // hood back
      for (const side of [-1, 1]) part(h.head, boxGeo(0.22, 1.6, 1.45), hood, side * 0.75, 0.65, 0); // hood sides
      part(h.head, boxGeo(1.6, 0.25, 1.45), hood, 0, 1.38, 0); // hood top
      part(h.torso, boxGeo(2.3, 0.4, 1.3), coatDark, 0, 1.0, 0); // collar
      if (def.insane === 'beholderTime') {
        // Its sword, drawn: a long pale blade with a glowing gold edge and a clock on the guard.
        part(h.rightArm, boxGeo(0.35, 0.35, 1.2), dark, 0, -2.1, 0.3); // grip
        part(h.rightArm, boxGeo(1.6, 0.3, 0.3), M(0xffc400), 0, -2.1, 0.95); // guard
        part(h.rightArm, cylGeoZ(0.35, 0.35, 0.12, 12), M(0xede7f6), 0, -2.3, 0.95);
        part(h.rightArm, boxGeo(0.5, 0.12, 4.4), M(0xe0e0e0), 0, -2.1, 3.3); // blade
        part(h.rightArm, boxGeo(0.1, 0.16, 4.4), glow(h, 0xffd740), 0.27, -2.1, 3.3);
      } else {
        // A floating hourglass orbits its left hand.
        part(h.leftArm, boxGeo(0.7, 0.12, 0.7), M(0xffc400), 0, -2.6, 0.6);
        part(h.leftArm, boxGeo(0.7, 0.12, 0.7), M(0xffc400), 0, -2.6, 1.8);
        part(h.leftArm, boxGeo(0.45, 0.5, 0.45), glowC, 0, -2.6, 1.45);
        part(h.leftArm, boxGeo(0.45, 0.5, 0.45), glow(h, 0xffd740), 0, -2.6, 0.95);
      }
      break;
    }
  }
}

/** Insane mode Bulwark: a hulking golem of cogs, girders and scrap metal. */
export function makeScrapGolemModel() {
  const h = makeGolemModel();
  const [rock, dark, moss] = h.mats;
  rock.color.setHex(0x8d6e63); // rusty scrap
  dark.color.setHex(0x546e7a); // steel
  moss.color.setHex(0xff8f00); // warning stripe
  const { M } = h;
  const cog = M(0x9e9e9e);
  const torso = h.body.children[0];
  const gear = (parent, r, x, y, z, ry = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    parent.add(g);
    part(g, cylGeoX(r, r, 0.3, 12), cog, 0, 0, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      part(g, boxGeo(r * 0.35, r * 0.35, 0.3), cog, Math.cos(a) * r, Math.sin(a) * r, 0);
    }
    part(g, cylGeoX(r * 0.3, r * 0.3, 0.4, 8), M(0x37474f), 0, 0, 0);
    return g;
  };
  const gears = [gear(torso, 0.7, 0.6, 0.3, 1.0), gear(torso, 0.45, -0.7, -0.5, 1.0), gear(torso, 0.6, 0, 0.5, -1.0)];
  for (const [x, y, w, d] of [[1.2, 1.3, 0.3, 1.6], [-1.3, 1.1, 0.3, 1.2]]) part(torso, boxGeo(w, 0.3, d), M(0x5d4037), x, y, 0); // scrap plates
  part(torso, boxGeo(0.3, 1.8, 0.3), dark, 1.3, 0, 0.9).rotation.z = 0.4; // girder
  const walk = h.anim;
  h.anim = (phase, t) => {
    walk(phase, t);
    gears.forEach((g, i) => (g.rotation.z = t * (i % 2 ? -2 : 1.5)));
  };
  return h;
}

/** Insane mode Timeling: a walking clock with spindly legs and spinning hands. */
export function makeTimelingModel(def) {
  const h = creature();
  const { M } = h;
  const brass = M(def.skin);
  const face = M(0xfff8e1);
  const black = M(0x212121);
  const clockG = new THREE.Group();
  clockG.position.y = 2.6;
  h.body.add(clockG);
  part(clockG, cylGeoX(1.2, 1.2, 0.6, 20), brass, 0, 0, 0);
  part(clockG, cylGeoX(1.0, 1.0, 0.1, 20), face, 0, 0, 0.32);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    part(clockG, boxGeo(0.08, 0.18, 0.05), black, Math.sin(a) * 0.85, Math.cos(a) * 0.85, 0.38).rotation.z = -a;
  }
  const big = new THREE.Group();
  const small = new THREE.Group();
  big.position.z = small.position.z = 0.42;
  part(big, boxGeo(0.08, 0.8, 0.04), black, 0, 0.4, 0);
  part(small, boxGeo(0.12, 0.5, 0.04), black, 0, 0.25, 0);
  clockG.add(big, small);
  part(clockG, boxGeo(0.4, 0.4, 0.4), brass, 0, 1.35, 0); // winding knob
  eyes(h, clockG, 0.35, 0.4, { spread: 0.35, size: 0.22, white: 0xffd740, glowing: true });
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.5, 1.6, 0);
    h.body.add(leg);
    part(leg, boxGeo(0.2, 1.6, 0.2), black, 0, -0.8, 0);
    part(leg, boxGeo(0.4, 0.15, 0.6), brass, 0, -1.6, 0.15);
    legs.push(leg);
  }
  h.anim = (phase, t) => {
    big.rotation.z = -t * 6;
    small.rotation.z = -t * 0.5;
    const sw = Math.sin(phase * 1.2) * 0.6;
    legs[0].rotation.x = sw;
    legs[1].rotation.x = -sw;
    clockG.rotation.z = Math.sin(phase * 0.6) * 0.12;
    clockG.position.y = 2.6 + Math.abs(Math.sin(phase * 1.2)) * 0.15;
  };
  return h;
}

/** Insane mode Rewind: a cyan blur of a creature, a spinning reverse arrow with a trail. */
export function makeRewindModel(def) {
  const h = creature();
  const { M } = h;
  const core = glow(h, def.skin);
  const white = glow(h, 0xffffff);
  const g = new THREE.Group();
  g.position.y = 1.6;
  h.body.add(g);
  part(g, boxGeo(1.2, 1.2, 1.2), core, 0, 0, 0).rotation.set(0.6, 0.6, 0);
  const ring = new THREE.Group();
  g.add(ring);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    part(ring, boxGeo(0.25, 0.25, 0.5), i % 2 ? white : core, Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0).rotation.z = a;
  }
  // Reverse arrows (◀◀) on both sides.
  const arrows = M(0x006064);
  for (const side of [-1, 1]) {
    for (const k of [0, 0.5]) part(g, boxGeo(0.1, 0.6, 0.35), arrows, side * 0.62, 0, 0.2 - k).rotation.x = 0.6;
  }
  for (let i = 1; i <= 3; i++) {
    const m = glow(h, def.skin);
    m.transparent = true;
    m.opacity = 0.5 / i;
    part(h.body, boxGeo(1.1 - i * 0.2, 1.1 - i * 0.2, 0.8), m, 0, 1.6, -i * 1.1); // afterimages
  }
  h.anim = (phase, t) => {
    ring.rotation.z = t * 12;
    g.position.y = 1.6 + Math.sin(t * 9) * 0.15;
  };
  return h;
}

/**
 * Insane mode Time Titan: a towering clockwork giant with a pendulum belly. Its gold armor shows
 * only while it's up (setArmored).
 */
export function makeTimeTitanModel(def) {
  const h = makeGolemModel();
  const [rock, dark, moss] = h.mats;
  rock.color.setHex(0x37474f);
  dark.color.setHex(0x263238);
  moss.color.setHex(0x7c4dff);
  const { M } = h;
  const torso = h.body.children[0];
  const gold = glow(h, def.skin);
  gold.emissiveIntensity = 0.3;
  part(torso, cylGeoX(0.9, 0.9, 0.15, 16), M(0xfff8e1), 0, 0.3, 1.0); // clock chest
  const hand = new THREE.Group();
  hand.position.set(0, 0.3, 1.1);
  torso.add(hand);
  part(hand, boxGeo(0.1, 0.7, 0.05), M(0x111111), 0, 0.3, 0);
  const pend = new THREE.Group();
  pend.position.set(0, -0.8, 1.0);
  torso.add(pend);
  part(pend, boxGeo(0.1, 1.2, 0.1), gold, 0, -0.6, 0);
  part(pend, cylGeoX(0.35, 0.35, 0.15, 12), gold, 0, -1.25, 0);
  // Armor: gold plates on the chest, shoulders and head.
  const armor = new THREE.Group();
  h.body.add(armor);
  const plate = M(0xffc400);
  part(armor, boxGeo(3.2, 1.0, 2.2), plate, 0, 4.6, 0);
  for (const side of [-1, 1]) part(armor, boxGeo(1.6, 0.6, 1.6), plate, side * 2.0, 4.8, 0);
  part(armor, boxGeo(1.7, 0.5, 1.6), plate, 0, 6.1, 0.2);
  for (const side of [-1, 1]) part(armor, boxGeo(0.3, 0.9, 0.3), gold, side * 0.6, 6.6, 0.2);
  h.setArmored = (on) => (armor.visible = on);
  const walk = h.anim;
  h.anim = (phase, t) => {
    walk(phase, t);
    hand.rotation.z = -t * 2;
    pend.rotation.z = Math.sin(t * 3) * 0.5;
  };
  return h;
}

/** Insane mode Time Parasite: a flying violet insect of time with a stinger that fires lasers. */
export function makeTimeParasiteModel(def) {
  const h = creature();
  const { M } = h;
  const shell = M(def.skin);
  const dark = M(0x1a0f3a);
  const g = glow(h, 0xb388ff);
  const body = new THREE.Group();
  body.position.y = 1.8;
  h.body.add(body);
  part(body, boxGeo(1.4, 1.1, 2.6), shell, 0, 0, 0);
  part(body, boxGeo(1.0, 0.9, 1.0), dark, 0, 0.1, 1.6); // head
  eyes(h, body, 0.25, 2.12, { spread: 0.3, size: 0.25, white: 0xffd740, glowing: true });
  part(body, boxGeo(0.9, 0.8, 1.4), shell, 0, -0.2, -1.9); // abdomen
  part(body, boxGeo(0.25, 0.25, 0.9), g, 0, -0.3, -3.0); // stinger
  for (let i = 0; i < 3; i++) part(body, boxGeo(1.45, 0.12, 0.2), g, 0, 0.56, -0.8 + i * 0.6); // glowing bands
  const wings = [];
  for (const side of [-1, 1]) {
    const w = new THREE.Group();
    w.position.set(side * 0.7, 0.6, 0.2);
    body.add(w);
    const wm = M(0xd1c4e9, { transparent: true, opacity: 0.55 });
    part(w, boxGeo(2.6, 0.06, 1.2), wm, side * 1.3, 0, 0);
    wings.push(w);
  }
  for (const side of [-1, 1]) for (const z of [-0.6, 0.2, 0.9]) part(body, boxGeo(0.12, 0.9, 0.12), dark, side * 0.75, -0.8, z).rotation.z = side * 0.4;
  h.anim = (phase, t) => {
    const flap = Math.sin(t * 30) * 0.5;
    wings[0].rotation.z = flap;
    wings[1].rotation.z = -flap;
    body.position.y = 1.8 + Math.sin(t * 2) * 0.3;
  };
  return h;
}

const CREATURES = {
  iTruck: makeInsaneTruckModel,
  iCarrier: makeCarrierTankModel,
  iMK11: makeMk11Model,
  voidSpirit: makeVoidSpiritModel,
  scrapGolem: makeScrapGolemModel,
  timeling: makeTimelingModel,
  rewind: makeRewindModel,
  timeTitan: makeTimeTitanModel,
  timeParasite: makeTimeParasiteModel,
  corpse: makeCorpseModel,
  slime: makeSlimeModel,
  easySlime: makeEasySlimeModel,
  kingSlime: makeKingSlimeModel,
  goblin: makeGoblinModel,
  giantGoblin: makeGiantGoblinModel,
  spider: makeSpiderModel,
  ghost: makeGhostModel,
  shroom: makeShroomModel,
  boulder: makeBoulderGolemModel,
  reaper: makeReaperModel,
  golem: makeGolemModel,
  lavaGolem: makeLavaGolemModel,
  crystalCar: makeCrystalCarModel,
  crystalUfo: makeCrystalUfoModel,
  teleporter: makeTeleporterModel,
  amplifier: makeAmplifierModel,
  viorb: makeViorbModel,
  timeCrystal: makeTimeCrystalModel,
  timeFragment: makeTimeFragmentModel,
};

/**
 * Void mode outfits (def.vlook): near-black bodies split by glowing cracks, void shards and
 * crystals. VOID himself: crimson cracks all over, a pink crystal in his chest and a crown of shards.
 */
export function voidParts(h, def) {
  const { M } = h;
  const g = glow(h, def.vglow ?? 0xd500f9);
  const dark = M(0x0d0612);
  const shardM = M(0x1a0f24);
  // Glowing cracks: thin zig-zag lines on a face of a part. [x, y, len, angle] at depth z.
  const cracks = (parent, z, list, mat = g, w = 0.09) => {
    for (const [x, y, len, a] of list) part(parent, boxGeo(w, len, 0.05), mat, x, y, z).rotation.z = a;
  };
  const bodyCracks = (mat = g, w = 0.09) => {
    cracks(h.torso, 0.52, [[-0.5, 0.4, 0.9, 0.5], [-0.2, -0.1, 0.8, -0.6], [0.4, 0.5, 0.7, -0.3], [0.6, -0.4, 0.9, 0.7], [0.1, -0.7, 0.5, 0.2]], mat, w);
    cracks(h.torso, -0.52, [[0.4, 0.3, 1.0, 0.5], [-0.4, -0.3, 0.9, -0.4]], mat, w);
    for (const limb of [h.rightArm, h.leftArm, h.rightLeg, h.leftLeg]) cracks(limb, 0.52, [[0.1, -0.7, 0.7, 0.4], [-0.15, -1.4, 0.6, -0.5]], mat, w);
  };
  // A shard: a thin tilted block sticking out of `parent`, glowing at the tip.
  const shard = (parent, x, y, z, len, rz, rx = 0, tip = g) => {
    const s = new THREE.Group();
    s.position.set(x, y, z);
    s.rotation.set(rx, 0, rz);
    parent.add(s);
    part(s, boxGeo(0.3, len, 0.3), shardM, 0, len / 2, 0);
    part(s, boxGeo(0.22, len * 0.3, 0.22), tip, 0, len * 0.95, 0);
    return s;
  };
  const shardCrown = (n, len, tip = g) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      shard(h.head, Math.sin(a) * 0.5, 1.15, Math.cos(a) * 0.5, len * (0.7 + (i % 3) * 0.2), -Math.sin(a) * 0.35, Math.cos(a) * 0.35, tip);
    }
  };
  // A faint void haze around the body.
  const aura = (color = def.vglow, op = 0.16) => {
    const m = glow(h, color);
    m.transparent = true;
    m.opacity = op;
    m.depthWrite = false;
    m.userData.keepOpacity = op;
    part(h.torso, boxGeo(2.6, 2.6, 1.5), m, 0, 0, 0);
  };
  const plates = (color = def.plate ?? 0x263238) => {
    const pm = M(color);
    part(h.torso, boxGeo(2.25, 1.5, 1.2), pm, 0, 0.3, 0);
    for (const side of [-1, 1]) {
      part(h.torso, boxGeo(1.2, 0.45, 1.3), pm, side * 1.45, 0.95, 0); // pauldrons
      shard(h.torso, side * 1.6, 1.15, 0, 0.9, -side * 0.6);
    }
    for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.1, 0.9, 1.1), pm, 0, -1.3, 0);
    part(h.head, boxGeo(1.4, 0.6, 1.4), pm, 0, 1.2, 0); // helm
    part(h.head, boxGeo(1.0, 0.12, 0.06), g, 0, 0.75, 0.72); // visor slit
  };
  const sword = (arm, len = 3.6, blade = 0x37474f) => {
    part(arm, boxGeo(0.3, 0.3, 0.9), dark, 0, -2.1, 0.2);
    part(arm, boxGeo(1.1, 0.25, 0.25), shardM, 0, -2.1, 0.7);
    part(arm, boxGeo(0.4, 0.12, len), M(blade), 0, -2.1, 0.8 + len / 2);
    part(arm, boxGeo(0.1, 0.16, len), g, 0.21, -2.1, 0.8 + len / 2);
  };
  // A glowing "?" (for Mysteries), made of blocks, on `parent` at (x, y, z).
  const question = (parent, x, y, z, s, mat) => {
    for (const [px, py] of [[-1, 2], [0, 2.5], [1, 2], [1, 1], [0, 0.4], [0, -0.4], [0, -1.6]]) part(parent, boxGeo(0.8 * s, 0.8 * s, 0.2), mat, x + px * s, y + py * s, z);
  };
  switch (def.vlook) {
    case 'zombie':
      bodyCracks();
      aura();
      for (const side of [-1, 1]) shard(h.torso, side * 0.9, 1.0, -0.3, 0.6, -side * 0.5, -0.3);
      break;
    case 'speedy':
      bodyCracks();
      for (const [x, y, rz] of [[-0.6, 0.6, 0.6], [0, 0.8, 0], [0.6, 0.6, -0.6], [-0.3, 0, 0.9], [0.3, 0, -0.9]]) shard(h.torso, x, y, -0.5, 0.8, rz, -1.0);
      for (const arm of [h.rightArm, h.leftArm]) shard(arm, 0, -0.8, -0.5, 0.6, 0, -1.2);
      break;
    case 'crystal': {
      bodyCracks();
      const cm = glow(h, 0x7c4dff);
      cm.emissiveIntensity = 0.35;
      for (const [x, y, z, s, rz] of [[-1.2, 1.1, 0, 1.4, 0.5], [1.2, 1.2, 0, 1.6, -0.5], [0, 1.0, -0.6, 1.8, 0], [-0.6, 0.3, -0.6, 1.2, 0.4], [0.7, -0.2, -0.6, 1.1, -0.4]]) {
        part(h.torso, boxGeo(0.7, s, 0.7), cm, x, y + s / 2 - 0.3, z).rotation.z = rz;
      }
      part(h.head, boxGeo(1.45, 0.5, 1.45), cm, 0, 1.25, 0);
      for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.25, 1.0, 1.25), cm, 0, -0.6, 0);
      break;
    }
    case 'ninja':
    case 'shadow': {
      const big = def.vlook === 'shadow';
      part(h.head, boxGeo(1.3, 0.75, 1.3), dark, 0, 0.35, 0); // mask
      part(h.head, boxGeo(1.3, 0.35, 1.3), dark, 0, 1.15, 0); // hood top
      part(h.head, boxGeo(0.9, 0.14, 0.06), g, 0, 0.82, 0.66); // glowing eye slit
      part(h.head, boxGeo(1.35, 0.18, 1.35), glow(h, big ? 0xff1744 : 0xd500f9), 0, 1.0, 0); // headband
      for (const i of [0, 1]) part(h.head, boxGeo(0.15, 0.12, 1.2), glow(h, big ? 0xff1744 : 0xd500f9), 0.2 * i - 0.1, 1.0 - i * 0.2, -1.1).rotation.x = 0.4 + i * 0.3;
      part(h.torso, boxGeo(2.05, 0.3, 1.05), glow(h, big ? 0xff1744 : 0x4a148c), 0, -0.6, 0); // sash
      cracks(h.torso, 0.52, [[-0.4, 0.4, 0.8, 0.6], [0.4, 0.1, 0.8, -0.5]]);
      // Shuriken on the back.
      const star = new THREE.Group();
      star.position.set(0, 0.3, -0.6);
      h.torso.add(star);
      for (const a of [0, Math.PI / 2]) part(star, boxGeo(1.0, 0.2, 0.08), M(0x9e9e9e), 0, 0, 0).rotation.z = a + Math.PI / 4;
      if (big) {
        // Two katanas crossed on its back, and one in hand.
        for (const side of [-1, 1]) {
          const k = part(h.torso, boxGeo(0.12, 3.4, 0.2), M(0xb0bec5), side * 0.3, 0.4, -0.65);
          k.rotation.z = side * 0.6;
        }
        sword(h.rightArm, 3.0, 0xb0bec5);
        part(h.body, boxGeo(0.6, 1.8, 0.1), glow(h, 0xff1744), 0, 3.6, -0.8).rotation.x = 0.3; // scarf tail
      }
      break;
    }
    case 'voidkin':
    case 'voidkinBare': {
      bodyCracks(g, def.vlook === 'voidkinBare' ? 0.16 : 0.09);
      shardCrown(6, 0.9);
      if (def.vlook === 'voidkin') {
        plates(0x1a1a24);
        part(h.torso, boxGeo(0.6, 0.6, 0.08), g, 0, 0.4, 0.63);
      } else {
        aura(0xd500f9, 0.22);
        for (const side of [-1, 1]) shard(h.torso, side * 1.0, 1.0, 0, 1.2, -side * 0.7);
      }
      break;
    }
    case 'mystery':
    case 'mysteryPrime': {
      const prime = def.vlook === 'mysteryPrime';
      bodyCracks(glow(h, 0x7c4dff));
      question(h.torso, 0, -0.15, 0.53, 0.22, g);
      const q = new THREE.Group();
      q.position.set(0, 2.6, 0);
      h.head.add(q);
      question(q, 0, 0, 0, 0.28, g);
      if (prime) {
        crown(h, h.head, 1.35, 1.3);
        aura(0xffd740, 0.14);
      }
      break;
    }
    case 'necro':
    case 'lich': {
      const lich = def.vlook === 'lich';
      const bone = M(0xe8e4d0);
      // Robe and a wendigo skull with antlers (the Lich wears a crown of void shards too).
      part(h.body, boxGeo(2.3, 2.6, 1.4), M(def.robe ?? 0x1a0a24), 0, 1.3, 0);
      part(h.head, boxGeo(1.35, 1.1, 1.4), bone, 0, 0.75, 0.08); // skull
      part(h.head, boxGeo(0.9, 0.5, 0.6), bone, 0, 0.25, 0.65); // snout
      for (const side of [-1, 1]) {
        part(h.head, boxGeo(0.35, 0.3, 0.08), glow(h, def.vglow), side * 0.33, 0.9, 0.79); // eye sockets
        const ant = new THREE.Group();
        ant.position.set(side * 0.55, 1.2, 0);
        ant.rotation.z = -side * 0.5;
        h.head.add(ant);
        part(ant, boxGeo(0.2, 1.6, 0.2), bone, 0, 0.8, 0);
        part(ant, boxGeo(0.18, 0.8, 0.18), bone, side * 0.3, 1.2, 0).rotation.z = -side * 0.8;
        part(ant, boxGeo(0.18, 0.7, 0.18), bone, -side * 0.25, 1.4, 0).rotation.z = side * 0.6;
      }
      // Staff with a glowing orb.
      part(h.rightArm, boxGeo(0.22, 0.22, 5.5), M(0x3e2723), 0, -2.1, 0.8);
      part(h.rightArm, boxGeo(0.7, 0.7, 0.7), g, 0, -2.1, 3.7);
      if (lich) {
        shardCrown(5, 0.8);
        for (const side of [-1, 1]) part(h.torso, boxGeo(0.5, 0.5, 0.5), bone, side * 1.4, 1.2, 0); // skull pauldrons
        aura(def.vglow, 0.12);
      }
      break;
    }
    case 'skeleton':
    case 'skeletonLord': {
      // Void-touched bones: glowing ribs.
      for (const y of [0.5, 0.1, -0.3]) part(h.torso, boxGeo(1.4, 0.12, 0.06), g, 0, y, 0.53);
      if (def.vlook === 'skeletonLord') {
        plates(def.plate);
        for (const side of [-1, 1]) part(h.head, boxGeo(0.2, 0.9, 0.2), M(0xe8e4d0), side * 0.7, 1.6, 0).rotation.z = -side * 0.5; // horns
        // Battleaxe.
        part(h.rightArm, boxGeo(0.22, 0.22, 4), M(0x5d4037), 0, -2.1, 1.2);
        part(h.rightArm, boxGeo(0.2, 1.6, 1.2), M(0x90a4ae), 0, -2.1, 2.8);
        part(h.rightArm, boxGeo(0.22, 1.4, 0.1), g, 0, -2.1, 3.4);
      }
      break;
    }
    case 'colossus': {
      bodyCracks(g, 0.14);
      const rock = M(0x1a1220);
      for (const side of [-1, 1]) {
        part(h.torso, boxGeo(1.5, 1.2, 1.6), rock, side * 1.5, 1.0, 0); // boulder shoulders
        shard(h.torso, side * 1.6, 1.5, 0, 1.4, -side * 0.4);
        part(h.head, boxGeo(0.3, 1.2, 0.3), rock, side * 0.6, 1.4, 0).rotation.z = -side * 0.6; // horns
      }
      for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.4, 1.2, 1.4), rock, 0, -1.6, 0); // fists
      part(h.torso, boxGeo(0.5, 0.5, 0.08), glow(h, 0xff1744), 0, 0.3, 0.55);
      break;
    }
    case 'lava':
      cracks(h.torso, 0.52, [[-0.6, -0.3, 0.8, 0.3]], g);
      shardCrown(4, 0.6, glow(h, 0xff3d00));
      break;
    case 'toxic': {
      bodyCracks(glow(h, 0x76ff03));
      part(h.head, boxGeo(1.0, 0.6, 0.3), dark, 0, 0.45, 0.7); // gas mask
      for (const side of [-1, 1]) part(h.head, boxGeo(0.35, 0.35, 0.3), glow(h, 0x76ff03), side * 0.3, 0.8, 0.68);
      part(h.torso, boxGeo(1.1, 1.6, 0.7), M(0x33691e), 0, 0.1, -0.85); // acid tank
      part(h.torso, boxGeo(0.8, 1.2, 0.1), glow(h, 0x76ff03), 0, 0.1, -1.22);
      for (const [x, y] of [[-0.6, -0.9], [0.5, -1.0], [0, -0.8]]) part(h.torso, boxGeo(0.18, 0.5, 0.18), glow(h, 0x64dd17), x, y, 0.5); // drips
      break;
    }
    case 'bolt': {
      const b = glow(h, 0x40c4ff);
      bodyCracks(b, 0.12);
      // Lightning bolts zig-zagging off its head and back.
      for (const side of [-1, 1]) {
        const z = new THREE.Group();
        z.position.set(side * 0.5, 1.2, 0);
        h.head.add(z);
        part(z, boxGeo(0.18, 0.7, 0.18), b, 0, 0.3, 0).rotation.z = side * 0.6;
        part(z, boxGeo(0.18, 0.7, 0.18), b, side * 0.35, 0.8, 0).rotation.z = -side * 0.6;
      }
      for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.16, 1.4, 0.16), b, x, 0.2, -0.6).rotation.z = x;
      break;
    }
    case 'goo': {
      const goo = glow(h, def.vglow);
      goo.emissiveIntensity = 0.25;
      for (const [p, x, y, z, s] of [[h.torso, 0.6, 1.0, 0.4, 0.8], [h.torso, -0.7, -0.3, 0.4, 0.9], [h.torso, 0.3, -0.9, -0.4, 0.7], [h.head, 0.4, 1.3, 0.2, 0.7],
        [h.head, -0.5, 0.2, 0.5, 0.5], [h.rightArm, 0, -2.2, 0, 0.8], [h.leftArm, 0, -2.0, 0, 0.9], [h.rightLeg, 0, -1.9, 0.3, 0.7]]) {
        part(p, boxGeo(s, s, s), goo, x, y, z);
      }
      for (const [x, z] of [[-0.6, 0.5], [0.5, 0.5], [0, -0.5]]) part(h.torso, boxGeo(0.25, 0.9, 0.25), goo, x, -1.3, z); // drips
      break;
    }
    case 'golden': {
      const gold = glow(h, 0xffc400);
      gold.emissiveIntensity = 0.4;
      bodyCracks(gold);
      crown(h, h.head, 1.35, 1.4);
      for (const side of [-1, 1]) part(h.torso, boxGeo(1.1, 0.4, 1.2), gold, side * 1.45, 0.95, 0);
      part(h.torso, boxGeo(0.8, 0.8, 0.1), gold, 0, 0.2, 0.55); // coin
      part(h.torso, boxGeo(0.15, 0.5, 0.06), M(0x6d4c00), 0, 0.2, 0.62);
      break;
    }
    case 'mutant': {
      bodyCracks();
      // One giant limb: a huge right arm and fist; the left arm stays small and withered.
      part(h.rightArm, boxGeo(2.0, 3.4, 2.0), M(0x1c1024), 0, -1.6, 0);
      part(h.rightArm, boxGeo(2.6, 2.0, 2.6), M(0x24122e), 0, -3.8, 0);
      cracks(h.rightArm, 1.02, [[0.3, -1.4, 1.6, 0.4], [-0.4, -2.6, 1.4, -0.5], [0.2, -3.8, 1.2, 0.3]], g, 0.16);
      for (const z of [-0.6, 0, 0.6]) shard(h.rightArm, 1.0, -1.0, z, 0.9, -1.0);
      h.leftArm.scale.set(0.7, 0.8, 0.7);
      part(h.torso, boxGeo(0.7, 0.7, 0.08), g, -0.4, 0.5, 0.53); // glowing tumor
      break;
    }
    case 'guardian':
    case 'guardianFree': {
      bodyCracks();
      if (def.vlook === 'guardian') {
        plates(def.plate);
        // A tower shield on its left arm.
        part(h.leftArm, boxGeo(0.3, 3.2, 2.2), M(0x263238), 0.7, -1.4, 0.4);
        part(h.leftArm, boxGeo(0.06, 2.4, 0.2), g, 0.87, -1.4, 0.4);
        part(h.leftArm, boxGeo(0.06, 0.2, 1.6), g, 0.87, -1.1, 0.4);
      } else {
        shardCrown(5, 0.9);
        aura(0xff1744, 0.15);
        sword(h.rightArm, 3.8);
        sword(h.leftArm, 3.8);
      }
      break;
    }
    case 'king': {
      // VOID: crimson cracks all over his black body, a pink crystal heart and a crown of shards.
      const crimson = glow(h, def.vvein ?? 0xc2185b); // Void mode: violet / purple veins
      crimson.emissiveIntensity = 0.9;
      bodyCracks(crimson, 0.13);
      cracks(h.torso, 0.52, [[-0.75, 0.75, 0.6, 1.1], [0.75, 0.75, 0.6, -1.1], [-0.3, -0.75, 0.7, 0.9], [0.4, -0.8, 0.6, -0.8]], crimson, 0.11);
      for (const limb of [h.rightArm, h.leftArm, h.rightLeg, h.leftLeg]) {
        cracks(limb, 0.52, [[-0.2, -0.3, 0.6, -0.7], [0.25, -1.1, 0.8, 0.6], [0, -1.75, 0.5, 1.2]], crimson, 0.11);
        cracks(limb, -0.52, [[0, -1, 1.4, 0.3]], crimson, 0.11);
      }
      cracks(h.head, 0.62, [[-0.3, 0.6, 0.6, 0.4], [0.3, 0.5, 0.7, -0.5], [0, 0.2, 0.5, 0]], crimson, 0.1);
      const heart = glow(h, 0xff80ff);
      heart.emissiveIntensity = 1.2;
      const gem = part(h.torso, boxGeo(0.4, 0.75, 0.25), heart, 0, 0.25, 0.55);
      gem.rotation.z = Math.PI / 4;
      gem.scale.set(0.9, 0.9, 1);
      shardCrown(9, 1.4, glow(h, 0x9c27b0));
      for (const [x, z] of [[-0.3, 0.3], [0.3, -0.2], [0, 0]]) shard(h.head, x, 1.2, z, 1.8, x * 0.4); // tall center shards
      // Jagged shards breaking out of his left shoulder.
      for (const [x, y, len, rz] of [[1.0, 1.0, 1.6, -0.9], [1.2, 0.7, 1.2, -1.3], [0.7, 1.0, 1.0, -0.4]]) shard(h.torso, x, y, 0, len, rz, 0, glow(h, 0x9c27b0));
      h.voidHeart = gem;
      break;
    }
  }
}

/**
 * Void mode outfits (def.blook): the Tower Battles zombies (plain zombies with diamond-plate
 * clothes, headbands, capes, top hats, pipes, axes...), the False Void's Spawns, VOID's extras
 * (a Void Star, bodies sticking out of him, back spikes) and his Abyss Spawns.
 */
export function tbParts(h, def) {
  const { M } = h;
  const limbs = [h.leftArm, h.rightArm, h.leftLeg, h.rightLeg];
  const g = (c) => glow(h, c);
  const clear = (color, opacity) => {
    const m = glow(h, color);
    m.transparent = true;
    m.opacity = opacity;
    m.depthWrite = false;
    m.userData.keepOpacity = opacity;
    return m;
  };
  const headband = (m) => part(h.head, boxGeo(1.26, 0.25, 1.26), m, 0, 0.95, 0);
  const cape = (m, len = 3.2) => {
    part(h.torso, boxGeo(2.1, len, 0.12), m, 0, 0.95 - len / 2, -0.62).rotation.x = 0.12;
  };
  const bands = (m, y = -1.7) => {
    for (const a of [h.leftArm, h.rightArm]) part(a, boxGeo(1.08, 0.3, 1.08), m, 0, y, 0);
  };
  // A blocky "?" on the chest.
  const question = (m) => {
    for (const [px, py] of [[-1, 2], [0, 2.5], [1, 2], [1, 1], [0, 0.4], [0, -0.4], [0, -1.6]]) part(h.torso, boxGeo(0.22, 0.22, 0.06), m, px * 0.22, 0.25 + py * 0.22, 0.53);
  };
  const tophat = (m, band, tilt = 0) => {
    const hat = new THREE.Group();
    hat.position.set(0, 1.2, 0);
    hat.rotation.z = tilt;
    h.head.add(hat);
    part(hat, boxGeo(1.7, 0.12, 1.7), m, 0, 0.06, 0);
    part(hat, boxGeo(1.15, 1.2, 1.15), m, 0, 0.7, 0);
    if (band) part(hat, boxGeo(1.18, 0.2, 1.18), band, 0, 0.25, 0);
  };
  const staff = (arm, m, tip, len = 4.5) => {
    part(arm, boxGeo(0.22, 0.22, len), m, 0, -2.0, 0.6);
    if (tip) part(arm, boxGeo(0.55, 0.55, 0.55), tip, 0, -2.0, 0.6 + len / 2);
  };
  // Little floating squares around the body (the Spawns' particles).
  const squares = (m, n = 6) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      part(h.torso, boxGeo(0.28, 0.28, 0.28), m, Math.cos(a) * 1.6, -0.8 + (i % 3) * 0.9, Math.sin(a) * 0.9).rotation.set(a, a, 0);
    }
  };
  const veins = (m, list) => {
    for (const [p, x, y, len, a] of list) part(p, boxGeo(0.08, len, 0.05), m, x, y, 0.53).rotation.z = a;
  };
  switch (def.blook) {
    case 'boss1': {
      // Dark diamond-plate clothes and wristbands.
      const plate = M(0x546e7a);
      for (const [x, y] of [[-0.5, 0.5], [0.5, 0.5], [0, 0], [-0.5, -0.5], [0.5, -0.5]]) part(h.torso, boxGeo(0.35, 0.35, 0.06), plate, x, y, 0.52).rotation.z = Math.PI / 4;
      bands(M(0x263238));
      break;
    }
    case 'hidden':
      headband(M(0x000000));
      break;
    case 'hiddenBoss': {
      const black = M(0x000000);
      headband(black);
      bands(black, -0.6);
      cape(M(0x0d0d0d), 3.4);
      break;
    }
    case 'mystery':
    case 'mystery2':
      question(M(0x000000));
      break;
    case 'summon':
      bands(M(0x9e9e9e));
      break;
    case 'necro': {
      // Black robe and cape, skull shoulder pads, a horned staff.
      cape(M(0x111111), 3.6);
      const bone = M(0xe0e0e0);
      for (const side of [-1, 1]) {
        part(h.torso, boxGeo(0.9, 0.6, 0.9), bone, side * 1.45, 1.1, 0);
        part(h.torso, boxGeo(0.5, 0.15, 0.1), M(0x111111), side * 1.45, 1.05, 0.46);
      }
      staff(h.rightArm, M(0x4e342e), null);
      for (const side of [-1, 1]) part(h.rightArm, boxGeo(0.15, 0.6, 0.15), bone, side * 0.3, -2.0, 2.9).rotation.z = side * 0.5;
      break;
    }
    case 'boss2': {
      // Crooked head, rusty metal plates, green particles.
      h.head.rotation.z = 0.35;
      const rust = M(0x795548);
      part(h.torso, boxGeo(2.1, 0.8, 1.1), rust, 0, 0.4, 0);
      for (const l of limbs) part(l, boxGeo(1.08, 0.7, 1.08), rust, 0, -1.3, 0);
      squares(g(0x76ff03), 5);
      break;
    }
    case 'statue':
      // Petrified: all-black stone, arms frozen forward.
      break;
    case 'toxic': {
      h.torso.rotation.x = 0.25; // hunched
      const rust = M(0x795548);
      part(h.torso, boxGeo(2.1, 0.7, 1.1), rust, 0, -0.5, 0);
      const gas = clear(0x76ff03, 0.18);
      part(h.torso, boxGeo(3, 3, 2), gas, 0, 0, 0);
      veins(g(0xccff90), [[h.torso, -0.4, 0.3, 0.8, 0.4], [h.torso, 0.5, -0.2, 0.7, -0.5]]);
      break;
    }
    case 'lightning': {
      const spark = g(0x80d8ff);
      veins(spark, [[h.torso, -0.4, 0.4, 0.9, 0.6], [h.torso, 0.3, -0.1, 0.8, -0.7], [h.torso, 0, -0.6, 0.6, 0.3]]);
      for (const l of limbs) veins(spark, [[l, 0, -1, 0.9, 0.5]]);
      for (let i = 0; i < 4; i++) part(h.head, boxGeo(0.1, 0.6, 0.1), spark, -0.6 + i * 0.4, 1.4, 0).rotation.z = (i % 2 ? 1 : -1) * 0.6;
      break;
    }
    case 'boss3': {
      // Gold tuxedo, bow tie, tilted top hat.
      const gold = M(0xffb300);
      part(h.torso, boxGeo(0.6, 1.9, 0.06), M(0xfff8e1), 0, 0, 0.52); // shirt front
      part(h.torso, boxGeo(0.7, 0.3, 0.1), M(0x111111), 0, 0.8, 0.56); // bow tie
      part(h.torso, boxGeo(2.1, 0.8, 0.12), gold, 0, -1.3, -0.6).rotation.x = 0.15; // coat tails
      tophat(gold, M(0x111111), 0.3);
      break;
    }
    case 'boss4': {
      // Rusty pipes sticking out (one spraying water), one small arm and one huge chained arm.
      const rust = M(0x6d4c41);
      for (const [x, y, rz] of [[-0.6, 0.6, 0.8], [0.4, 0.9, -0.5], [0.1, -0.3, 1.2]]) part(h.torso, boxGeo(0.25, 1.4, 0.25), rust, x, y, -0.4).rotation.set(-0.6, 0, rz);
      part(h.torso, boxGeo(0.3, 0.3, 0.8), clear(0x4fc3f7, 0.6), 0.4, 1.5, -1.0);
      h.leftArm.scale.set(1.8, 1.4, 1.8);
      h.rightArm.scale.set(0.7, 0.8, 0.7);
      const chain = M(0x9e9e9e);
      for (let i = 0; i < 5; i++) part(h.leftArm, boxGeo(1.12, 0.12, 1.12), chain, 0, -0.4 - i * 0.35, 0).rotation.y = i * 0.4;
      break;
    }
    case 'necroBoss': {
      // Top hat, white mask, long cape, skull staff with violet sparks.
      part(h.head, boxGeo(1.0, 1.0, 0.08), M(0xfafafa), 0, 0.6, 0.62);
      for (const x of [-0.25, 0.25]) part(h.head, boxGeo(0.2, 0.12, 0.04), M(0x111111), x, 0.75, 0.67);
      tophat(M(0x111111), M(0x6a1b9a));
      cape(M(0x1a0a24), 3.8);
      staff(h.rightArm, M(0x212121), M(0xeeeeee));
      part(h.rightArm, boxGeo(0.7, 0.7, 0.7), clear(0xd500f9, 0.45), 0, -2.0, 2.85);
      break;
    }
    case 'fireSpirit': {
      // Black stone body, orange mask with red eyes, fire on the head.
      part(h.head, boxGeo(1.0, 0.8, 0.08), M(0xff6d00), 0, 0.6, 0.62);
      for (const x of [-0.25, 0.25]) part(h.head, boxGeo(0.2, 0.15, 0.04), g(0xff1744), x, 0.7, 0.67);
      for (const [x, s] of [[-0.3, 0.7], [0.1, 1.1], [0.35, 0.8]]) part(h.head, boxGeo(0.4, s, 0.4), clear(0xff9100, 0.8), x, 1.2 + s / 2, 0);
      break;
    }
    case 'guardian': {
      // Violet hood and armor, a glowing violet core, a big one-bladed axe.
      const violet = M(0x4a148c);
      const core = g(0xd500f9);
      part(h.head, boxGeo(1.45, 1.45, 1.35), violet, 0, 0.7, -0.12);
      for (const x of [-0.25, 0.25]) part(h.head, boxGeo(0.2, 0.12, 0.04), core, x, 0.7, 0.62);
      part(h.torso, boxGeo(0.6, 0.6, 0.1), core, 0, 0.3, 0.55).rotation.z = Math.PI / 4;
      for (const side of [-1, 1]) part(h.torso, boxGeo(1.0, 0.5, 1.2), M(0x311b92), side * 1.35, 1.0, 0);
      part(h.rightArm, boxGeo(0.25, 0.25, 5.5), M(0x37474f), 0, -2.0, 0.9);
      part(h.rightArm, boxGeo(0.15, 2.2, 1.8), M(0x5e35b1), 0, -2.6, 3.0);
      part(h.rightArm, boxGeo(0.17, 2.2, 0.15), core, 0, -2.6, 3.9);
      break;
    }
    case 'spawn': {
      squares(g(0xb388ff), 6);
      veins(g(0x7c4dff), [[h.torso, -0.3, 0.3, 0.8, 0.5], [h.torso, 0.4, -0.3, 0.7, -0.4]]);
      break;
    }
    case 'abyss':
    case 'abyssBig': {
      // VOID's Spawns: rusty black head and arms on a purple body (the big one is purple all over, with veins).
      const vein = g(0xd500f9);
      veins(vein, [[h.torso, -0.4, 0.4, 0.9, 0.5], [h.torso, 0.3, -0.2, 0.9, -0.6], [h.torso, 0, -0.7, 0.5, 0.2]]);
      for (const l of limbs) veins(vein, [[l, 0, -1.1, 0.8, 0.4]]);
      if (def.blook === 'abyssBig') squares(clear(0xea80fc, 0.7), 8);
      break;
    }
    case 'trueVoid': {
      // On top of VOID's cracked body (vlook 'king'): a purple-and-magenta Void Star, bodies sticking
      // out of him, big black back spikes and a purple haze.
      const star = g(0xff40ff);
      const starG = new THREE.Group();
      starG.position.set(0, 2.9, 0);
      h.head.add(starG);
      for (let i = 0; i < 4; i++) part(starG, boxGeo(0.25, 1.6, 0.25), i % 2 ? star : g(0x7c4dff), 0, 0, 0).rotation.z = (i * Math.PI) / 4;
      const black = M(0x0a0410);
      for (const [x, y, len, rz] of [[-0.6, 0.6, 2.2, 0.4], [0, 0.9, 2.8, 0], [0.6, 0.6, 2.2, -0.4], [-0.4, -0.2, 1.6, 0.6], [0.4, -0.2, 1.6, -0.6]]) {
        const s = part(h.torso, boxGeo(0.4, len, 0.4), black, x, y + len / 2 - 0.4, -0.7);
        s.rotation.set(-0.7, 0, rz);
      }
      // Humanoid shapes pushing out of his chest and sides.
      const husk = M(0x1a0a24);
      for (const [x, y, rz] of [[-0.85, -0.2, 0.5], [0.85, 0.3, -0.5]]) {
        const b = new THREE.Group();
        b.position.set(x, y, 0.45);
        b.rotation.set(0.3, 0, rz);
        h.torso.add(b);
        part(b, boxGeo(0.35, 0.35, 0.35), husk, 0, 0.45, 0.1);
        part(b, boxGeo(0.4, 0.6, 0.25), husk, 0, 0, 0.05);
        for (const s of [-1, 1]) part(b, boxGeo(0.12, 0.5, 0.12), husk, s * 0.25, 0.1, 0.25).rotation.x = -1.1;
      }
      const haze = clear(0x9c27b0, 0.12);
      part(h.torso, boxGeo(3.2, 4.2, 2.2), haze, 0, -0.5, 0);
      break;
    }
  }
  if (def.blook === 'mystery') setOpacity(h, 0.55);
  else if (def.blook === 'mystery2') setOpacity(h, 0.6);
  else if (def.blook === 'lightning') setOpacity(h, 0.75);
}

/** VOID (Spirit): a giant ghost of void energy with his crystal heart glowing inside it. */
export function makeVoidSpiritModel(def) {
  const h = creature();
  const { M } = h;
  const ghostM = glow(h, 0x7c4dff);
  ghostM.emissiveIntensity = 0.55;
  ghostM.transparent = true;
  ghostM.opacity = 0.55;
  ghostM.depthWrite = false;
  ghostM.userData.keepOpacity = 0.55;
  const edge = glow(h, 0xd500f9);
  const float = new THREE.Group();
  h.body.add(float);
  part(float, boxGeo(2.6, 2.2, 1.6), ghostM, 0, 3.2, 0); // chest
  part(float, boxGeo(2.0, 1.4, 1.3), ghostM, 0, 1.6, 0); // waist
  const tails = [];
  for (const [x, w] of [[-0.6, 0.7], [0.1, 0.8], [0.7, 0.6]]) tails.push(part(float, boxGeo(w, 1.4, 1.0), ghostM, x, 0.5, 0));
  const head = new THREE.Group();
  head.position.y = 4.9;
  float.add(head);
  part(head, boxGeo(1.4, 1.4, 1.4), ghostM, 0, 0, 0);
  for (const side of [-1, 1]) part(head, boxGeo(0.4, 0.16, 0.08), glow(h, 0xffffff), side * 0.32, 0.1, 0.72); // eye slits
  // Crown of shards over a hollow head.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const s = part(head, boxGeo(0.25, 1 + (i % 3) * 0.35, 0.25), M(0x1a0f24), Math.sin(a) * 0.55, 1.0, Math.cos(a) * 0.55);
    s.rotation.set(Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3);
  }
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 1.7, 4.0, 0);
    float.add(arm);
    part(arm, boxGeo(0.9, 2.4, 0.9), ghostM, 0, -1.2, 0);
    part(arm, boxGeo(0.12, 2.2, 0.06), edge, 0, -1.2, 0.47);
    arms.push(arm);
  }
  // The void heart: a bright pink crystal with a pulsing glow and orbiting shards.
  const heart = new THREE.Group();
  heart.position.set(0, 3.3, 0);
  float.add(heart);
  const heartM = glow(h, 0xff80ff);
  heartM.emissiveIntensity = 1.4;
  const gem = part(heart, boxGeo(0.7, 1.1, 0.7), heartM, 0, 0, 0);
  gem.rotation.z = Math.PI / 4;
  const haloM = glow(h, 0xff1744);
  haloM.transparent = true;
  haloM.opacity = 0.35;
  haloM.depthWrite = false;
  haloM.userData.keepOpacity = 0.35;
  const halo = part(heart, boxGeo(1.3, 1.3, 1.3), haloM, 0, 0, 0);
  const orbit = [];
  for (let i = 0; i < 4; i++) orbit.push(part(heart, boxGeo(0.18, 0.5, 0.18), edge, 0, 0, 0));
  h.anim = (phase, t) => {
    float.position.y = 0.8 + Math.sin(t * 1.6) * 0.4;
    float.rotation.z = Math.sin(t * 1.1) * 0.05;
    tails.forEach((tl, i) => (tl.rotation.x = Math.sin(t * 4 + i * 1.7) * 0.25));
    arms[0].rotation.x = -0.4 + Math.sin(t * 2) * 0.3;
    arms[1].rotation.x = -0.4 - Math.sin(t * 2) * 0.3;
    const beat = 1 + Math.max(0, Math.sin(t * 6)) * 0.25;
    gem.scale.setScalar(beat);
    halo.scale.setScalar(beat * (1 + Math.sin(t * 3) * 0.1));
    gem.rotation.y = t * 1.5;
    orbit.forEach((o, i) => {
      const a = t * 2 + (i / orbit.length) * Math.PI * 2;
      o.position.set(Math.cos(a) * 1.1, Math.sin(a * 1.3) * 0.4, Math.sin(a) * 1.1);
    });
  };
  // While attacking, both arms swing up and come down.
  h.swingArms = (f) => {
    const a = f < 0.6 ? -Math.PI * 0.9 * (f / 0.6) : -Math.PI * 0.9 + (Math.PI * 0.6 * (f - 0.6)) / 0.4;
    arms[0].rotation.x = arms[1].rotation.x = a;
  };
  return h;
}

/** Builds the model for an enemy definition (Easy mode creatures, or a zombie). */
export function makeEnemy(def) {
  const build = CREATURES[def.model];
  if (!build) return makeZombie(def);
  const h = build(def);
  if (def.hidden) setOpacity(h, 0.35);
  return h;
}

// ---------------------------------------------------------------- Expert mode (2026-11-09 spec)
const X_GEO = new Map();
const xGeo = (key, make) => {
  let g = X_GEO.get(key);
  if (!g) X_GEO.set(key, (g = make()));
  return g;
};

/**
 * Expert mode outfits (def.xlook): cracked grey figures with colored heads and arms, see-through
 * Vio ghosts, bots, Time beings, the Rebirther, Doomelist, Death Angel and the Beholder.
 */
export function expertParts(h, def) {
  const { M } = h;
  const crackM = M(0x3a3a3a);
  // See-through material (humanoid M only takes a color).
  const clear = (color, opacity) => {
    const m = M(color);
    m.transparent = true;
    m.opacity = opacity;
    m.depthWrite = false;
    m.userData.keepOpacity = opacity;
    return m;
  };
  const limbs = [h.leftArm, h.rightArm, h.leftLeg, h.rightLeg];
  // Dark cracks across the stone-grey body.
  const cracks = (m = crackM) => {
    for (const [x, y, w, hh] of [[-0.5, 0.3, 0.1, 1.1], [0.2, -0.2, 0.9, 0.1], [0.6, 0.5, 0.1, 0.6], [-0.2, -0.6, 0.6, 0.1]]) part(h.torso, boxGeo(w, hh, 0.06), m, x, y, 0.53);
    for (const leg of [h.leftLeg, h.rightLeg]) {
      part(leg, boxGeo(0.08, 0.8, 1.03), m, 0.25, -0.9, 0);
      part(leg, boxGeo(1.03, 0.08, 0.5), m, 0, -1.5, 0.2);
    }
  };
  // Hides an arm's own box and gives it a floating glowing hand instead.
  const floatHand = (arm, m, s = 0.8) => {
    arm.children[0].visible = false;
    part(arm, boxGeo(s, s, s), m, 0, -2.1, 0);
  };
  const bigArm = (arm, m, s = 1.6) => part(arm, boxGeo(s, 2.6, s), m, 0, -1.3, 0);
  const glowHead = (m, s = 1.3) => part(h.head, boxGeo(s, s, s), m, 0, 0.6, 0);
  const hood = (m) => {
    part(h.head, boxGeo(1.45, 1.45, 1.35), m, 0, 0.7, -0.12);
    part(h.head, boxGeo(1.6, 0.4, 1.5), m, 0, 0.02, -0.1); // hood rim on the shoulders
  };
  const robe = (m, len = 2.4) => {
    h.leftLeg.visible = h.rightLeg.visible = false;
    part(h.torso, boxGeo(2.0, len, 1.1), m, 0, -1 - len / 2 + 0.2, 0);
  };
  const scarf = (m) => {
    part(h.torso, boxGeo(2.1, 0.45, 1.15), m, 0, 0.85, 0);
    part(h.torso, boxGeo(0.45, 1.2, 0.1), m, 0.5, 0.1, 0.58);
  };
  const plates = (m, trim) => {
    part(h.torso, boxGeo(2.3, 1.8, 1.25), m, 0, 0.1, 0);
    for (const x of [-1.35, 1.35]) part(h.torso, boxGeo(1.0, 0.6, 1.3), m, x, 1.05, 0);
    for (const limb of limbs) part(limb, boxGeo(1.15, 0.9, 1.15), m, 0, -1.4, 0);
    if (trim) {
      for (const y of [0.6, -0.4]) part(h.torso, boxGeo(2.32, 0.08, 1.27), trim, 0, y, 0);
      for (const limb of limbs) part(limb, boxGeo(1.17, 0.08, 1.17), trim, 0, -1.1, 0);
    }
  };
  const antenna = (m, tip) => {
    part(h.head, boxGeo(0.12, 0.7, 0.12), m, 0.4, 1.5, 0);
    part(h.head, boxGeo(0.25, 0.25, 0.25), tip, 0.4, 1.9, 0);
  };
  const ring = (parent, r, tube, m, y, z = 0, rx = 0) => {
    const mesh = part(parent, xGeo(`torus${r}|${tube}`, () => new THREE.TorusGeometry(r, tube, 8, 24)), m, 0, y, z);
    mesh.rotation.x = rx;
    return mesh;
  };
  switch (def.xlook) {
    case 'cracked':
      cracks();
      break;
    case 'trampled':
      cracks();
      for (const x of [-1.3, 1.3]) part(h.torso, boxGeo(1.0, 0.7, 1.3), M(def.skin), x, 1.0, 0); // bulky shoulders
      part(h.torso, boxGeo(2.2, 1.4, 1.2), M(0x6e6e6e), 0, -0.2, 0);
      break;
    case 'noticeable': {
      // Almost invisible: a faint outline with a purple shimmer.
      const g = glow(h, 0xb388ff);
      g.emissiveIntensity = 0.5;
      for (const y of [-0.95, 0.95]) part(h.torso, boxGeo(2.04, 0.06, 1.04), g, 0, y, 0);
      for (const limb of limbs) part(limb, boxGeo(1.04, 0.06, 1.04), g, 0, -1.95, 0);
      break;
    }
    case 'limbed':
      cracks();
      bigArm(h.rightArm, M(def.skin));
      bigArm(h.leftArm, M(def.skin));
      break;
    case 'charger': {
      // Black body, a glowing head and floating glowing hands (Charger, Vio Rusher).
      const g = glow(h, def.glowC);
      glowHead(g);
      floatHand(h.rightArm, g);
      floatHand(h.leftArm, g);
      break;
    }
    case 'vio':
      break; // a see-through ghostly figure (see the end)
    case 'overcharged':
    case 'undercharged': {
      cracks();
      const g = glow(h, def.glowC);
      glowHead(g);
      if (def.xlook === 'overcharged') {
        bigArm(h.rightArm, g, 1.4);
        bigArm(h.leftArm, g, 1.4);
        const spark = glow(h, 0xaa00ff);
        for (const [x, y, z] of [[-1.3, 1.4, 0.6], [1.4, 0.2, -0.5], [0.3, 1.6, 0.7], [-0.9, -0.6, 0.7]]) part(h.torso, boxGeo(0.22, 0.22, 0.22), spark, x, y, z);
      } else {
        // One big glowing hand.
        part(h.rightArm, boxGeo(1.8, 1.8, 1.8), g, 0, -2.3, 0);
      }
      break;
    }
    case 'cloaker':
    case 'bot': {
      const metal = M(0x757575);
      antenna(metal, glow(h, def.glowC));
      part(h.torso, boxGeo(1.0, 0.8, 0.08), M(0x424242), 0, 0.2, 0.52);
      part(h.torso, boxGeo(0.25, 0.25, 0.06), glow(h, def.glowC), -0.2, 0.3, 0.57);
      if (def.xlook === 'cloaker') {
        const bubble = clear(0xb3e5fc, 0.25);
        part(h.body, xGeo('bubble', () => new THREE.SphereGeometry(3.6, 16, 12)), bubble, 0, 3, 0);
      }
      break;
    }
    case 'armoured':
    case 'shieldBot': {
      const purple = def.xlook === 'shieldBot';
      plates(M(def.shirt), glow(h, 0xff1744));
      part(h.head, boxGeo(1.4, 0.5, 1.4), M(def.shirt), 0, 1.3, 0);
      if (purple) {
        // A purple overlay and a big purple shield.
        const pg = glow(h, 0xb388ff);
        pg.emissiveIntensity = 0.5;
        part(h.leftArm, boxGeo(0.25, 3.2, 2.6), pg, 0.8, -1.5, 0);
        for (const y of [0.9, -0.9]) part(h.torso, boxGeo(2.4, 0.1, 1.35), pg, 0, y, 0);
      }
      break;
    }
    case 'flagBot': {
      const yellow = M(0xfdd835);
      plates(M(def.shirt), null);
      for (const y of [0.7, 0.1, -0.5]) part(h.torso, boxGeo(2.32, 0.18, 1.27), yellow, 0, y, 0);
      glowHead(glow(h, 0xff1744), 1.25);
      // The big red-and-white glowing ring on its back.
      ring(h.torso, 2.6, 0.25, glow(h, 0xff1744), 1.2, -1.1);
      ring(h.torso, 2.1, 0.15, glow(h, 0xffffff), 1.2, -1.15);
      break;
    }
    case 'vioGunner': {
      const armor = M(0x9e9e9e);
      part(h.torso, boxGeo(2.15, 0.9, 1.15), armor, 0, 0.4, 0);
      for (const x of [-1.25, 1.25]) part(h.torso, boxGeo(0.9, 0.5, 1.2), armor, x, 1.05, 0);
      part(h.head, boxGeo(1.3, 0.35, 1.3), M(0xd1b3ff), 0, 1.25, 0);
      // The purple arm cannon.
      const purple = M(0x7b1fa2);
      part(h.rightArm, boxGeo(1.3, 2.6, 1.3), purple, 0, -1.8, 0);
      part(h.rightArm, boxGeo(0.8, 0.3, 0.8), glow(h, 0xd500f9), 0, -3.2, 0);
      break;
    }
    case 'rusher':
      part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x1565c0), 0, 0.8, 0);
      break;
    case 'scarlet':
    case 'rebirther': {
      // Hooded cultists: a hood, a purple scarf and a robe (Scarlet: grey with a yellow stripe).
      const reb = def.xlook === 'rebirther';
      hood(M(reb ? 0x4a148c : 0x616161));
      scarf(M(reb ? 0x6a1b9a : 0x7b1fa2));
      robe(M(reb ? 0x1a1a1a : 0x757575));
      part(h.torso, boxGeo(0.3, 3.4, 0.08), M(reb ? 0x7b1fa2 : 0xfdd835), 0, -0.9, 0.62); // stripe down the robe
      if (reb) for (const arm of [h.leftArm, h.rightArm]) part(arm, boxGeo(1.08, 0.7, 1.08), M(0x8e24aa), 0, -1.75, 0); // purple gloves
      else for (const arm of [h.leftArm, h.rightArm]) part(arm, boxGeo(1.05, 1.0, 1.05), M(0x757575), 0, -0.6, 0); // grey sleeves
      break;
    }
    case 'timeRunner':
    case 'timeShard':
    case 'timeShardBare': {
      // Glowing pure-white figures with a faint purple aura (Time Shards: a thin purple collar).
      const white = glow(h, 0xffffff);
      white.emissiveIntensity = 0.6;
      part(h.torso, boxGeo(2.04, 2.04, 1.04), white, 0, 0, 0);
      if (def.xlook === 'timeRunner') {
        const aura = clear(def.glowC, 0.18);
        part(h.torso, boxGeo(2.8, 2.8, 1.8), aura, 0, 0, 0);
      } else {
        ring(h.head, 0.8, 0.08, glow(h, 0xb388ff), 0.05, 0, Math.PI / 2);
        if (def.xlook === 'timeShard') {
          const shield = clear(0xb388ff, 0.3);
          part(h.body, xGeo('shardBubble', () => new THREE.SphereGeometry(3.2, 14, 10)), shield, 0, 3, 0);
        }
      }
      break;
    }
    case 'timeTitan': {
      // Lightning lines over a huge dark navy body, and a bright white glow.
      const bolt = glow(h, def.glowC);
      for (const [x, y, w, hh, r] of [[-0.4, 0.4, 0.12, 1.3, 0.4], [0.4, -0.2, 0.12, 1.2, -0.5], [0.1, 0.7, 0.9, 0.12, 0.2]]) part(h.torso, boxGeo(w, hh, 0.06), bolt, x, y, 0.53).rotation.z = r;
      for (const limb of limbs) part(limb, boxGeo(0.12, 1.4, 1.03), bolt, 0.2, -1.0, 0).rotation.x = 0.3;
      const white = glow(h, 0xffffff);
      part(h.head, boxGeo(0.9, 0.2, 0.06), white, 0, 0.7, 0.62);
      break;
    }
    case 'doomelist': {
      // Stained red-and-white outfit, a big round red-rimmed rocket launcher on its shoulder.
      const red = M(0xc62828);
      for (const [x, y, w, hh] of [[-0.5, 0.4, 0.7, 0.5], [0.4, -0.4, 0.5, 0.7], [0.6, 0.6, 0.4, 0.3]]) part(h.torso, boxGeo(w, hh, 0.06), red, x, y, 0.53);
      part(h.torso, cylGeoX(0.9, 0.9, 4.2, 14), M(0x424242), -1.4, 1.6, 0); // along Z: pointing forward
      ring(h.torso, 0.95, 0.18, M(0xd50000), 1.6, 2.1).position.x = -1.4;
      part(h.torso, boxGeo(0.5, 0.5, 0.5), glow(h, 0xff3d00), -1.4, 1.6, 2.15); // the rocket tip
      break;
    }
    case 'deathAngel': {
      // White hair, a blood-stained pale outfit, dark red tendril wings dotted with red eye-rings.
      const blood = M(0x8e0000);
      part(h.head, boxGeo(1.35, 0.5, 1.35), M(0xfafafa), 0, 1.3, -0.05);
      part(h.head, boxGeo(1.35, 1.3, 0.3), M(0xfafafa), 0, 0.5, -0.6);
      for (const [x, y, w, hh] of [[-0.4, 0.2, 0.6, 0.8], [0.5, -0.5, 0.5, 0.5]]) part(h.torso, boxGeo(w, hh, 0.06), blood, x, y, 0.53);
      const eye = glow(h, 0xff1744);
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const t = part(h.torso, boxGeo(0.35, 3.4 - i * 0.6, 0.3), M(0x4a0000), side * (1.2 + i * 0.7), 1.6 - i * 0.2, -0.8);
          t.rotation.z = -side * (0.5 + i * 0.3);
          ring(h.torso, 0.25, 0.07, eye, 2.2 - i * 0.6, -0.95).position.x = side * (1.5 + i * 0.9);
        }
      }
      // Its staff (always carried; drawn = it attacks).
      part(h.rightArm, boxGeo(0.25, 0.25, 5), M(0x3e2723), 0, -2.0, 1.2);
      part(h.rightArm, boxGeo(0.6, 0.6, 0.6), eye, 0, -2.0, 3.8);
      break;
    }
    case 'beholder': {
      // Time itself: a tall hooded figure in a long grey coat, a black faceless hood.
      hood(M(0x111111));
      robe(M(0x757575), 3.2);
      part(h.torso, boxGeo(2.15, 2.1, 1.15), M(0x8a8a8a), 0, 0, 0);
      part(h.torso, boxGeo(0.12, 4.6, 0.08), M(0x424242), 0, -1.2, 0.62); // coat seam
      break;
    }
  }
  if (def.xlook === 'vio') setOpacity(h, 0.5);
}

/** Expert Viorb: a big glowing magenta-purple orb hovering in place. */
export function makeViorbModel(def) {
  const h = creature();
  const core = new THREE.Group();
  core.position.y = 2.6;
  h.body.add(core);
  const g = glow(h, 0xd500f9);
  const orb = part(core, xGeo('viorb', () => new THREE.IcosahedronGeometry(1.6, 1)), g, 0, 0, 0);
  const shell = h.M(0xea80fc, { transparent: true, opacity: 0.3, depthWrite: false });
  shell.userData.keepOpacity = 0.3;
  part(core, xGeo('viorbShell', () => new THREE.IcosahedronGeometry(2.1, 1)), shell, 0, 0, 0);
  h.anim = (phase, t) => {
    core.position.y = 2.6 + Math.sin(t * 2) * 0.3;
    orb.rotation.y = t * 0.8;
    g.emissiveIntensity = 0.7 + Math.sin(t * 5) * 0.25;
  };
  return h;
}

/** Expert Time Crystal: a tall, pointed white crystal floating upright with a soft glow. */
export function makeTimeCrystalModel() {
  const h = creature();
  const core = new THREE.Group();
  core.position.y = 3.2;
  h.body.add(core);
  const g = glow(h, 0xffffff);
  g.emissiveIntensity = 0.5;
  const c = part(core, xGeo('tCrystal', () => new THREE.OctahedronGeometry(1, 0)), g, 0, 0, 0);
  c.scale.set(1.1, 2.6, 1.1);
  h.anim = (phase, t) => {
    core.position.y = 3.2 + Math.sin(t * 1.5) * 0.25;
    core.rotation.y = t * 0.5;
  };
  return h;
}

/** Expert Time Fragment: a smaller white shard with a glowing pink edge and blue sparks. */
export function makeTimeFragmentModel() {
  const h = creature();
  const core = new THREE.Group();
  core.position.y = 1.8;
  h.body.add(core);
  const c = part(core, xGeo('tCrystal', () => new THREE.OctahedronGeometry(1, 0)), h.M(0xf5f5f5), 0, 0, 0);
  c.scale.set(0.6, 1.4, 0.6);
  const edge = part(core, xGeo('tCrystal', () => new THREE.OctahedronGeometry(1, 0)), glow(h, 0xff4fa3), 0, 0, 0);
  edge.scale.set(0.68, 1.2, 0.3);
  const spark = glow(h, 0x40c4ff);
  const sparks = [];
  for (let i = 0; i < 3; i++) sparks.push(part(core, boxGeo(0.15, 0.15, 0.15), spark, 0, 0, 0));
  h.anim = (phase, t) => {
    core.rotation.y = t * 1.2;
    sparks.forEach((s, i) => {
      const a = t * 3 + (i / 3) * Math.PI * 2;
      s.position.set(Math.sin(a) * 1, Math.sin(t * 4 + i), Math.cos(a) * 1);
    });
  };
  return h;
}

// ---------------------------------------------------------------- Insane mode (2026-11-09 spec)
const O_GEO = new Map();
const oGeo = (key, make) => {
  let g = O_GEO.get(key);
  if (!g) O_GEO.set(key, (g = make()));
  return g;
};

/**
 * Insane mode outfits (def.ilook): soldiers, robots and XCF troops, beings of light, corruption
 * and fire, and the Overlord. Arms point forward, so in an arm's frame -y runs along it toward the
 * hand and +z is up. The looks follow the wiki descriptions in the user's spec.
 */
export function orionParts(h, def) {
  const { M } = h;
  const g = (c = def.glowC ?? 0xffffff) => glow(h, c);
  const clear = (color, opacity, shine = false) => {
    const m = shine ? glow(h, color) : M(color);
    m.transparent = true;
    m.opacity = opacity;
    m.depthWrite = false;
    m.userData.keepOpacity = opacity;
    return m;
  };
  const limbs = [h.leftArm, h.rightArm, h.leftLeg, h.rightLeg];
  const arms = [h.leftArm, h.rightArm];
  const sphere = (r) => oGeo(`s${r}`, () => new THREE.SphereGeometry(r, 16, 12));
  const torus = (r, tube) => oGeo(`t${r}|${tube}`, () => new THREE.TorusGeometry(r, tube, 8, 24));
  const cape = (m, len = 3.2) => {
    const c = part(h.torso, boxGeo(2.1, len, 0.12), m, 0, 0.95 - len / 2, -0.62);
    c.rotation.x = 0.12;
  };
  const horns = (m, len = 0.9, out = 0.5, up = 0.4) => {
    for (const side of [-1, 1]) part(h.head, boxGeo(0.22, len, 0.22), m, side * out, 1.2 + len / 2 - 0.2, 0).rotation.z = -side * up;
  };
  const crown = (m, y = 1.3) => {
    part(h.head, boxGeo(1.3, 0.25, 1.3), m, 0, y, 0);
    for (const [x, z] of [[-0.5, 0.55], [0, 0.55], [0.5, 0.55], [-0.5, -0.55], [0.5, -0.55]]) part(h.head, boxGeo(0.2, 0.4, 0.2), m, x, y + 0.3, z);
  };
  const halo = (m, y = 1.7, r = 0.6) => {
    const hl = part(h.head, torus(r, 0.07), m, 0, y, 0);
    hl.rotation.x = Math.PI / 2;
  };
  const wings = (m, span = 2.6, tall = 2.2) => {
    for (const side of [-1, 1]) {
      const w = part(h.torso, boxGeo(span, tall, 0.12), m, side * (0.6 + span / 2), 0.6, -0.65);
      w.rotation.z = side * 0.35;
      part(h.torso, boxGeo(span * 0.4, tall * 0.5, 0.12), m, side * (0.6 + span * 0.95), -0.2, -0.65).rotation.z = side * 0.7;
    }
  };
  const blade = (arm, m, len = 2.6, w = 0.3) => part(arm, boxGeo(0.14, len, w), m, 0, -2.1 - len / 2, 0.1);
  const backSword = (m, hilt) => {
    const s = part(h.torso, boxGeo(0.25, 3.2, 0.45), m, 0.3, 0.3, -0.7);
    s.rotation.z = 0.6;
    if (hilt) part(h.torso, boxGeo(0.7, 0.2, 0.3), hilt, -0.55, 1.6, -0.7).rotation.z = 0.6;
  };
  const hammer = (arm, headM, handleM, big = 1) => {
    part(arm, boxGeo(0.25, 3 * big, 0.25), handleM, 0, -2 - 1.5 * big, 0);
    part(arm, boxGeo(1.6 * big, 1.1 * big, 1.1 * big), headM, 0, -2 - 3 * big, 0);
  };
  const staff = (arm, m, tip, len = 4.5) => {
    part(arm, boxGeo(0.22, 0.22, len), m, 0, -2.0, 0.6);
    if (tip) part(arm, boxGeo(0.55, 0.55, 0.55), tip, 0, -2.0, 0.6 + len / 2);
  };
  const helmet = (m, hgt = 0.5) => part(h.head, boxGeo(1.4, hgt, 1.4), m, 0, 1.2 + hgt / 2 - 0.1, 0);
  const valkyrie = (m, wingM) => {
    part(h.head, boxGeo(1.4, 1.4, 1.4), m, 0, 0.62, 0);
    for (const side of [-1, 1]) part(h.head, boxGeo(0.12, 0.9, 0.6), wingM, side * 0.78, 1.2, -0.1).rotation.z = -side * 0.4;
  };
  const plates = (m, trim) => {
    part(h.torso, boxGeo(2.25, 1.9, 1.2), m, 0, 0.1, 0);
    for (const x of [-1.3, 1.3]) part(h.torso, boxGeo(1.0, 0.55, 1.25), m, x, 1.0, 0);
    for (const l of limbs) part(l, boxGeo(1.12, 0.9, 1.12), m, 0, -1.4, 0);
    if (trim) for (const l of limbs) part(l, boxGeo(1.14, 0.1, 1.14), trim, 0, -1.0, 0);
  };
  const gem = (m, x = 0, y = 0.3, s = 0.45) => part(h.torso, boxGeo(s, s, 0.2), m, x, y, 0.55).rotation.z = Math.PI / 4;
  const backpack = (m, w = 1.4, hh = 1.5) => part(h.torso, boxGeo(w, hh, 0.7), m, 0, 0.1, -0.85);
  const robe = (m, len = 2.4) => {
    h.leftLeg.visible = h.rightLeg.visible = false;
    part(h.torso, boxGeo(2.05, len, 1.1), m, 0, -1 - len / 2 + 0.2, 0);
  };
  const hood = (m) => part(h.head, boxGeo(1.45, 1.45, 1.35), m, 0, 0.7, -0.12);
  const eyeHead = (r, iris, pupil = 0x111111) => {
    h.head.children[0].visible = false;
    part(h.head, sphere(r), M(0xfafafa), 0, r * 0.85, 0);
    const ir = part(h.head, oGeo(`c${r}`, () => new THREE.CircleGeometry(r * 0.45, 16)), glow(h, iris), 0, r * 0.85, r + 0.01);
    ir.renderOrder = 1;
    part(h.head, oGeo(`c${r}p`, () => new THREE.CircleGeometry(r * 0.2, 12)), M(pupil), 0, r * 0.85, r + 0.03);
  };
  const tentacles = (m, n = 6, len = 2) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const t = part(h.torso, boxGeo(0.25, len, 0.25), m, Math.sin(a) * 0.9, -1.1 - len / 2, Math.cos(a) * 0.45);
      t.rotation.z = Math.sin(a) * 0.3;
      t.rotation.x = Math.cos(a) * 0.3;
    }
  };
  const tie = (m) => part(h.torso, boxGeo(0.3, 1.4, 0.08), m, 0, 0.2, 0.53);
  const bubble = (color, r = 3.4, y = 3) => part(h.body, sphere(r), clear(color, 0.25), 0, y, 0);

  switch (def.ilook) {
    case 'swordsman':
      backSword(M(0xb0bec5), M(0x5d4037)); // a sword it never draws
      break;
    case 'ninja': {
      part(h.head, boxGeo(1.3, 0.55, 1.3), M(0x111111), 0, 0.28, 0); // mask over the mouth
      part(h.head, boxGeo(1.3, 0.35, 1.3), M(0x111111), 0, 1.1, 0);
      cape(M(0x111111), 2.6);
      const dagger = M(0xcfd8dc);
      blade(h.rightArm, dagger, 1.3, 0.35);
      for (let i = 0; i < 3; i++) part(h.rightArm, boxGeo(0.16, 0.18, 0.18), dagger, 0, -2.4 - i * 0.35, 0.3); // teeth
      break;
    }
    case 'worker': {
      const grey = M(0x424242);
      part(h.torso, boxGeo(2.05, 1.1, 1.05), grey, 0, -0.45, 0); // overall bib
      for (const x of [-0.6, 0.6]) part(h.torso, boxGeo(0.3, 0.95, 1.06), grey, x, 0.5, 0); // straps
      part(h.head, boxGeo(1.35, 0.3, 1.35), M(0xfdd835), 0, 1.25, 0); // hard hat
      break;
    }
    case 'soldier': {
      const beret = M(0x1b5e20);
      part(h.head, boxGeo(1.35, 0.3, 1.35), beret, 0.1, 1.28, 0).rotation.z = -0.15;
      backpack(M(0x558b2f));
      part(h.torso, boxGeo(2.05, 0.25, 1.05), M(0x3e2723), 0, -0.7, 0); // belt
      break;
    }
    case 'metallic': {
      const metal = M(0x424242);
      plates(metal, g());
      part(h.torso, boxGeo(0.5, 1.2, 0.5), M(0x616161), -1.4, 1.6, 0).rotation.z = 0.4; // spiky shoulder
      part(h.torso, boxGeo(0.4, 0.9, 0.4), M(0x616161), -1.0, 1.7, 0.2).rotation.z = 0.2;
      break;
    }
    case 'jetpacker': {
      plates(M(0x1c1c1c));
      const crystal = g();
      gem(crystal, 0, 0.4, 0.6);
      const pack = M(0x212121);
      for (const x of [-0.45, 0.45]) {
        part(h.torso, cylGeo(0.35, 0.35, 1.6, 10), pack, x, 0.1, -0.85);
        part(h.torso, cylGeo(0.25, 0.1, 0.5, 8), g(0xff6d00), x, -0.9, -0.85); // flames
      }
      break;
    }
    case 'berserker': {
      const bone = M(0xe0d6c2);
      // A black raptor skull worn as a helmet.
      part(h.head, boxGeo(1.4, 0.9, 1.6), M(0x111111), 0, 1.0, 0.1);
      part(h.head, boxGeo(0.9, 0.35, 1.0), M(0x111111), 0, 0.95, 1.1); // snout
      for (const x of [-0.3, 0, 0.3]) part(h.head, boxGeo(0.12, 0.25, 0.12), bone, x, 0.72, 1.5); // teeth
      gem(g(), 0, 0.4, 0.7);
      for (const x of [-1.35, 1.35]) part(h.torso, boxGeo(1.0, 0.7, 1.3), M(def.shirt), x, 1.0, 0);
      hammer(h.rightArm, M(0x37474f), M(0x5d4037), 1.2);
      break;
    }
    case 'teleporter': {
      for (const arm of arms) part(arm, boxGeo(1.12, 1.4, 1.12), M(0x78909c), 0, -1.2, 0);
      backpack(M(0x455a64), 1.3, 1.3);
      part(h.torso, boxGeo(0.12, 2.2, 0.12), M(0x90a4ae), 0.4, 1.6, -0.9); // antenna
      part(h.torso, cylGeo(0.7, 0.2, 0.3, 10), M(0xb0bec5), -0.3, 1.2, -1.0).rotation.x = -0.6; // radar dish
      part(h.torso, boxGeo(0.25, 0.25, 0.25), g(), 0.4, 2.8, -0.9);
      break;
    }
    case 'sprinterM5': {
      part(h.rightArm, boxGeo(1.08, 2.0, 1.08), M(0x90a4ae), 0, -1.0, 0); // robot arm
      part(h.rightLeg, boxGeo(1.08, 2.0, 1.08), M(0x90a4ae), 0, -1.0, 0);
      part(h.torso, boxGeo(2.05, 0.15, 1.05), g(), 0, -0.2, 0);
      break;
    }
    case 'eliteSoldier': {
      plates(M(0x9e9e9e), M(0x616161));
      helmet(M(0x9e9e9e), 0.4);
      blade(h.rightArm, g(), 2.8, 0.35);
      break;
    }
    case 'raygunner':
    case 'raygunnerBare': {
      const gun = M(0x37474f);
      part(h.rightArm, boxGeo(0.5, 1.4, 0.7), gun, 0, -2.4, 0.1);
      part(h.rightArm, boxGeo(0.3, 0.4, 0.3), g(), 0, -3.2, 0.1);
      part(h.torso, boxGeo(2.05, 0.25, 1.05), M(0x5d4037), 0, -0.7, 0);
      if (def.ilook === 'raygunner') bubble(0x40c4ff);
      break;
    }
    case 'eliteTeleporter': {
      part(h.head, boxGeo(1.25, 1.25, 1.25), g(), 0, 0.6, 0); // faceless neon head
      plates(M(0x263238));
      backpack(M(0x37474f), 1.4, 1.6);
      part(h.torso, torus(0.6, 0.12), g(), 0, 0.3, -1.25);
      break;
    }
    case 'medic': {
      const coat = M(0xfafafa);
      part(h.torso, boxGeo(2.1, 3.0, 1.1), coat, 0, -0.5, 0); // long lab coat
      part(h.head, cylGeo(0.35, 0.35, 0.08, 12), M(0xcfd8dc), 0, 1.15, 0.62).rotation.x = Math.PI / 2; // head mirror
      part(h.head, boxGeo(1.3, 0.12, 1.3), M(0x9e9e9e), 0, 1.05, 0); // its band
      const kit = M(0xd32f2f);
      part(h.leftArm, boxGeo(0.9, 0.9, 0.5), kit, 0.3, -2.4, -0.6);
      part(h.leftArm, boxGeo(0.5, 0.15, 0.52), M(0xffffff), 0.3, -2.4, -0.6);
      part(h.leftArm, boxGeo(0.15, 0.5, 0.52), M(0xffffff), 0.3, -2.4, -0.6);
      break;
    }
    case 'shielder':
    case 'shielderBare': {
      plates(M(0xfafafa), g());
      helmet(M(0xeceff1), 0.45);
      if (def.ilook === 'shielder') part(h.leftArm, boxGeo(0.2, 3.4, 2.8), clear(0x40c4ff, 0.45, true), 0.9, -1.6, 0); // plasma shield
      else part(h.leftArm, boxGeo(0.25, 0.6, 0.6), g(), 0.6, -1.6, 0); // the emitter, without its shield
      break;
    }
    case 'eliteSwordsman': {
      const diamond = g(0xffffff);
      gem(diamond, 0, 0.4, 0.6);
      blade(h.rightArm, M(0x9e9e9e), 2.6);
      blade(h.leftArm, M(0x9e9e9e), 2.6);
      break;
    }
    case 'cosmil': {
      plates(M(0x1c1c1c), M(0xb71c1c));
      const field = clear(0x80d8ff, 0.4, true);
      h.head.children[0].visible = false;
      part(h.head, boxGeo(1.25, 1.25, 1.25), field, 0, 0.6, 0);
      part(h.head, boxGeo(0.6, 0.6, 0.6), M(0x263238), 0, 0.6, 0); // the robot skull inside
      part(h.head, boxGeo(0.5, 0.12, 0.08), g(), 0, 0.7, 0.32);
      for (const arm of arms) {
        arm.children[0].visible = false;
        part(arm, boxGeo(1.0, 2.0, 1.0), field, 0, -1, 0);
        part(arm, boxGeo(0.4, 2.0, 0.4), M(0x263238), 0, -1, 0);
      }
      break;
    }
    case 'engineer': {
      part(h.torso, boxGeo(2.05, 0.6, 1.05), M(0x111111), 0, -0.3, 0);
      part(h.rightArm, boxGeo(0.25, 1.6, 0.25), M(0x9e9e9e), 0, -2.6, 0); // wrench
      part(h.rightArm, boxGeo(0.6, 0.4, 0.3), M(0x9e9e9e), 0, -3.4, 0);
      backpack(M(0x37474f), 1.6, 1.4);
      break;
    }
    case 'pureEnergy':
    case 'ravagerEnergy': {
      // A glowing body with a black horned head, crackling with lightning.
      const body = g();
      for (const l of limbs) part(l, boxGeo(1.04, 2.04, 1.04), body, 0, -1, 0);
      part(h.torso, boxGeo(2.04, 2.04, 1.04), body, 0, 0, 0);
      part(h.head, boxGeo(1.3, 1.3, 1.3), M(0x0a0a0a), 0, 0.6, 0);
      horns(M(0x0a0a0a), 1.0, 0.5, 0.5);
      if (def.ilook === 'ravagerEnergy') for (const side of [-1, 1]) part(h.head, boxGeo(0.15, 0.6, 0.15), M(0xfafafa), side * 0.4, 0.1, 0.7).rotation.x = -0.6; // tusks
      const spark = g(def.ilook === 'ravagerEnergy' ? 0x2979ff : 0xea80fc);
      for (const [x, y, z] of [[-1.3, 1.2, 0.6], [1.3, 0.2, -0.5], [0.3, 1.5, 0.7], [-0.9, -0.7, 0.6]]) part(h.torso, boxGeo(0.2, 0.6, 0.2), spark, x, y, z).rotation.z = 0.8;
      break;
    }
    case 'boltmaster': {
      plates(M(0x111111), g());
      helmet(M(0x111111), 0.5);
      cape(M(0x1a1a1a), 3.6);
      backSword(M(0x37474f), g());
      for (const x of [-1.3, 1.3]) part(h.torso, boxGeo(0.25, 0.25, 0.25), g(), x, 1.3, 0.6);
      break;
    }
    case 'sentinel': {
      const suit = M(0x212121);
      part(h.torso, boxGeo(2.1, 2.1, 1.1), suit, 0, 0, 0);
      part(h.torso, boxGeo(0.7, 1.2, 0.08), M(0xeceff1), 0, 0.4, 0.56); // shirt
      tie(g(0xaa00ff));
      for (const arm of arms) {
        part(arm, boxGeo(0.4, 1.2, 0.6), M(0x37474f), 0, -2.4, 0.15);
        part(arm, boxGeo(0.2, 0.2, 0.2), g(), 0, -3.0, 0.15);
      }
      break;
    }
    case 'overseer': {
      // A huge purple robot: space helmet, two four-barrel rocket launchers and a minigun on its back.
      plates(M(0x6a1b9a), g());
      part(h.head, sphere(0.95), clear(0x80d8ff, 0.35), 0, 0.6, 0);
      const launcher = M(0x4a148c);
      for (const side of [-1, 1]) {
        part(h.torso, boxGeo(1.0, 1.0, 1.8), launcher, side * 1.3, 1.6, -0.3);
        for (const [x, y] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) part(h.torso, cylGeoX(0.15, 0.15, 0.1, 8), M(0x111111), side * 1.3 + x, 1.6 + y, 0.62);
      }
      part(h.torso, cylGeoX(0.4, 0.4, 2.2, 10), M(0x37474f), 0, 1.2, -1.2); // minigun
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        part(h.torso, cylGeoX(0.08, 0.08, 1.0, 6), M(0x111111), Math.sin(a) * 0.25, 1.2 + Math.cos(a) * 0.25, -2.6);
      }
      break;
    }
    case 'vessel': {
      const body = g();
      body.emissiveIntensity = 0.6;
      for (const l of limbs) part(l, boxGeo(1.04, 2.04, 1.04), body, 0, -1, 0);
      part(h.head, boxGeo(1.25, 1.25, 1.25), body, 0, 0.6, 0);
      part(h.torso, boxGeo(2.1, 1.4, 1.1), M(0x37474f), 0, 0.3, 0); // XCF chestplate
      part(h.torso, boxGeo(0.8, 0.3, 0.06), M(0xfafafa), 0, 0.5, 0.56);
      part(h.torso, boxGeo(1.8, 2.2, 1.2), M(0x263238), 0, 0.2, -1.1); // the device on its back
      part(h.torso, cylGeo(0.4, 0.4, 2.0, 10), body, 0, 0.3, -1.75);
      break;
    }
    case 'kugelblitz': {
      // A humanoid black hole: neon orange glow and a spinning accretion disk around it.
      const orange = g();
      for (const l of limbs) part(l, boxGeo(1.08, 0.1, 1.08), orange, 0, -1.9, 0);
      part(h.torso, boxGeo(2.1, 0.1, 1.1), orange, 0, -0.9, 0);
      const disk = part(h.body, torus(2.8, 0.25), orange, 0, 3.2, 0);
      disk.rotation.x = Math.PI / 2 - 0.3;
      part(h.body, torus(3.4, 0.1), clear(0xffab40, 0.5, true), 0, 3.2, 0).rotation.x = Math.PI / 2 - 0.3;
      break;
    }
    case 'vengeful':
    case 'champion':
    case 'vengefulSpeed': {
      const dark = M(0x111111);
      if (def.ilook === 'champion') {
        // A horned top hat, a long coat and a sword.
        part(h.head, boxGeo(1.4, 0.15, 1.4), dark, 0, 1.25, 0);
        part(h.head, boxGeo(1.0, 1.1, 1.0), dark, 0, 1.85, 0);
        part(h.head, boxGeo(1.02, 0.18, 1.02), g(), 0, 1.45, 0);
        horns(dark, 1.1, 0.7, 0.8);
        part(h.torso, boxGeo(2.15, 3.2, 1.15), M(0x1a1a2e), 0, -0.6, 0);
        blade(h.rightArm, M(0x7c4dff), 3.2, 0.4);
        cape(M(0x0d0d1a), 3.8);
      } else if (def.ilook === 'vengeful') {
        crown(dark);
        horns(dark, 0.9, 0.5, 0.4);
      } else {
        plates(M(0x311b92), M(0x111111));
        wings(clear(0x424242, 0.6), 2.2, 2.0);
      }
      break;
    }
    case 'avantGuard':
    case 'avantGuardBare': {
      plates(M(0x757575), M(0x9e9e9e));
      valkyrie(M(0x9e9e9e), M(0xeceff1));
      part(h.rightArm, boxGeo(0.25, 3.2, 0.25), M(0x5d4037), 0, -3.2, 0); // axe
      part(h.rightArm, boxGeo(0.2, 1.4, 1.6), M(0xb0bec5), 0, -4.4, 0.5);
      if (def.ilook === 'avantGuard') bubble(0x80d8ff, 3.8, 3);
      break;
    }
    case 'vanguard': {
      plates(M(0x111111), g());
      valkyrie(M(0x111111), M(0x1b5e20));
      gem(g(), 0, 0.4, 0.7);
      hammer(h.rightArm, M(0x1b5e20), M(0x263238), 1.4);
      break;
    }
    case 'spirit': {
      const body = clear(0xffab40, 0.55, true);
      h.leftLeg.visible = h.rightLeg.visible = false;
      part(h.torso, boxGeo(1.6, 1.8, 0.8), body, 0, -1.6, 0); // a wispy tail
      halo(g(0xffe082));
      horns(g(0xffab40), 0.9, 0.55, 0.7); // antlers
      for (const side of [-1, 1]) part(h.head, boxGeo(0.15, 0.5, 0.15), g(0xffab40), side * 0.9, 1.6, 0).rotation.z = side * 0.6;
      break;
    }
    case 'divine':
    case 'archangel': {
      robe(M(0xfafafa), 2.6);
      part(h.torso, boxGeo(2.15, 2.1, 1.15), M(0xfafafa), 0, 0, 0);
      if (def.ilook === 'divine') {
        horns(g(0xffab40), 1.0, 0.55, 0.7); // antlers
        for (const side of [-1, 1]) part(h.head, boxGeo(0.15, 0.55, 0.15), g(0xffab40), side * 0.95, 1.7, 0).rotation.z = side * 0.6;
        staff(h.rightArm, M(0x8d6e63), g(0xffab40), 5);
        wings(M(0xfafafa), 2.6, 2.6);
      } else {
        part(h.torso, boxGeo(0.4, 3.2, 0.08), M(0xffd54f), 0, -0.8, 0.6); // priest's stole
        halo(g(0x18ffff), 1.8, 0.7);
        wings(g(0x18ffff), 3.2, 2.8);
      }
      break;
    }
    case 'corruption':
    case 'null':
    case 'corrupted': {
      if (def.ilook === 'corrupted') {
        eyeHead(1.5, 0xd500f9);
        part(h.torso, boxGeo(2.1, 2.1, 1.1), M(0x6a1b9a), 0, 0, 0); // purple shirt
        tie(M(0x8e24aa));
        for (const arm of arms) for (let i = 0; i < 3; i++) part(arm, boxGeo(0.2, 0.5, 0.2), M(0x4a148c), 0.6, -0.5 - i * 0.6, 0).rotation.z = -0.7; // spiky sleeves
      } else if (def.ilook === 'corruption') {
        eyeHead(1.3, 0x111111, 0x000000);
        tentacles(M(0x111111), 7, 2.2);
        for (const arm of arms) part(arm, boxGeo(0.3, 1.5, 0.3), M(0x111111), 0, -2.6, 0); // tentacle fingers
      } else {
        eyeHead(0.9, 0xaa00ff);
        const glass = clear(0x111111, 0.7);
        for (const l of limbs) part(l, boxGeo(1.04, 2.04, 1.04), glass, 0, -1, 0);
      }
      break;
    }
    case 'tranquil': {
      const vein = g(0xd50000);
      vein.emissiveIntensity = 0.5;
      for (const [y, x] of [[-0.4, 0.2], [-1.0, -0.25], [-1.6, 0.15]]) part(h.leftArm, boxGeo(1.04, 0.12, 0.12), vein, 0, y, 0.45).rotation.z = x;
      part(h.leftArm, boxGeo(0.12, 1.6, 1.04), vein, 0.45, -1.0, 0);
      for (const x of [-1.3, 1.3]) part(h.torso, boxGeo(1.0, 0.7, 1.2), M(0x111111), x, 1.0, 0);
      break;
    }
    case 'hardLight': {
      const white = g(0xffffff);
      white.emissiveIntensity = 1;
      for (const l of limbs) part(l, boxGeo(1.02, 2.02, 1.02), white, 0, -1, 0);
      part(h.torso, boxGeo(2.02, 2.02, 1.02), white, 0, 0, 0);
      part(h.head, boxGeo(1.22, 1.22, 1.22), white, 0, 0.6, 0);
      const edge = M(0x9e9e9e);
      for (const y of [-1.02, 1.02]) part(h.torso, boxGeo(2.08, 0.05, 1.08), edge, 0, y, 0);
      break;
    }
    case 'bolt': {
      part(h.torso, boxGeo(2.1, 1.6, 1.1), M(0x1565c0), 0, 0.2, 0); // blue metal vest
      const crystal = g();
      for (const [x, y] of [[-0.6, 0.6], [0.5, 0.2], [-0.1, -0.3]]) part(h.torso, boxGeo(0.3, 0.6, 0.3), crystal, x, y, 0.6).rotation.z = 0.4;
      for (const side of [-1, 1]) part(h.torso, boxGeo(0.3, 0.8, 0.3), crystal, side * 1.1, 1.3, 0).rotation.z = -side * 0.4;
      break;
    }
    case 'mage': {
      part(h.head, boxGeo(1.6, 0.15, 1.6), M(0x111111), 0, 1.25, 0); // hat brim
      part(h.head, cylGeo(0.05, 0.7, 1.6, 8), M(0x111111), 0, 2.1, 0);
      robe(M(0x111111), 2.4);
      cape(M(0x1a1a1a), 3.4);
      staff(h.rightArm, M(0x5d4037), g());
      break;
    }
    case 'lightningKing': {
      robe(M(0x0d1b4a), 2.4);
      cape(M(0x111111), 3.6);
      crown(M(0xffd54f));
      for (const y of [0.6, -0.2]) part(h.torso, boxGeo(2.12, 0.12, 1.12), g(), 0, y, 0);
      break;
    }
    case 'lightspeed': {
      plates(M(0x0a0a0a));
      for (const [x, y] of [[0, 0.4], [-1.3, 1.0], [1.3, 1.0]]) gem(g(0x2979ff), x, y, 0.4);
      wings(g(0x81d4fa), 2.8, 2.2);
      break;
    }
    case 'ravager': {
      plates(M(0x37474f), M(0x0288d1));
      cape(M(0x01579b), 3.6);
      crown(M(0x111111));
      const spike = M(0x4fc3f7);
      for (const [x, y, z] of [[-1.2, 1.5, 0], [1.2, 1.5, 0], [0, 1.0, -0.8], [-0.6, 0.2, -0.8], [0.6, 0.2, -0.8]]) part(h.torso, boxGeo(0.25, 0.9, 0.25), spike, x, y, z).rotation.z = x * 0.4;
      part(h.rightArm, oGeo('crystal', () => new THREE.OctahedronGeometry(0.6, 0)), g(), 0, -2.4, 0); // its throwing crystal
      break;
    }
    case 'reactor':
    case 'hellflame': {
      const hf = def.ilook === 'hellflame';
      if (hf) {
        const body = g(0xff6d00);
        body.emissiveIntensity = 0.6;
        for (const l of limbs) part(l, boxGeo(1.04, 2.04, 1.04), body, 0, -1, 0);
      }
      plates(M(0x1c1c1c), M(0x424242));
      if (hf) {
        cape(M(0x111111), 3.4);
        part(h.head, boxGeo(1.4, 1.4, 1.4), M(0x1c1c1c), 0, 0.62, 0); // barred helmet
        for (const x of [-0.35, 0, 0.35]) part(h.head, boxGeo(0.12, 0.9, 0.06), g(0xff6d00), x, 0.6, 0.71);
      } else {
        // Chains wrapped around the armor.
        const chain = M(0x757575);
        for (let i = 0; i < 7; i++) part(h.torso, boxGeo(0.35, 0.18, 0.15), chain, -1 + i * 0.33, 0.9 - i * 0.28, 0.66).rotation.z = -0.7;
      }
      break;
    }
    case 'unstable': {
      const body = clear(0xff8a80, 0.4);
      part(h.torso, boxGeo(2.04, 2.04, 1.04), body, 0, 0, 0);
      const red = g(0xff1744);
      part(h.head, boxGeo(1.24, 1.24, 1.24), red, 0, 0.6, 0);
      for (const arm of arms) part(arm, boxGeo(1.04, 2.04, 1.04), red, 0, -1, 0);
      for (const [x, y, z] of [[-1.2, 1.1, 0.5], [1.1, -0.3, 0.6], [0.2, 1.3, -0.6]]) part(h.torso, boxGeo(0.2, 0.2, 0.2), g(0xff5252), x, y, z);
      break;
    }
    case 'apparition': {
      const ghost = clear(0x212121, 0.55);
      h.leftLeg.visible = h.rightLeg.visible = false;
      part(h.torso, boxGeo(2.04, 2.04, 1.04), ghost, 0, 0, 0);
      part(h.torso, boxGeo(1.6, 2.2, 0.9), ghost, 0, -2.0, 0); // a trailing wisp, no legs
      horns(M(0x0a0a0a), 1.0, 0.5, 0.5);
      for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.25, 0.15, 0.06), g(0xeeeeee), x, 0.7, 0.62);
      break;
    }
    case 'hellspeed': {
      plates(M(0x111111), g());
      wings(M(0x1c1c1c), 2.8, 2.4);
      for (const [x, y] of [[-0.5, -0.4], [0.4, 0.5]]) part(h.torso, boxGeo(0.4, 0.4, 0.06), g(), x, y, 0.62); // embers
      break;
    }
    case 'prompter': {
      const lava = g();
      lava.emissiveIntensity = 0.5;
      for (const l of limbs) part(l, boxGeo(1.04, 2.04, 1.04), lava, 0, -1, 0);
      plates(M(0x1c1c1c));
      horns(M(0x1c1c1c), 1.0, 0.55, 0.5);
      break;
    }
    case 'overlord': {
      // A white-and-black king: rosy red gems, a crown, and a staff on his back.
      plates(M(0xfafafa), M(0x111111));
      part(h.torso, boxGeo(0.8, 2.0, 1.22), M(0x111111), 0, 0, 0);
      gem(g(0xff1744), 0, 0.5, 0.6);
      for (const x of [-1.3, 1.3]) part(h.torso, boxGeo(0.35, 0.35, 0.2), g(0xff1744), x, 1.05, 0.66);
      crown(M(0xfafafa));
      for (const z of [0.66, -0.66]) part(h.head, boxGeo(0.3, 0.3, 0.1), g(0xff1744), 0, 1.35, z);
      cape(M(0x111111), 4);
      const st = part(h.torso, boxGeo(0.25, 5, 0.25), M(0xeceff1), 0.5, 0.4, -0.9); // staff on his back
      st.rotation.z = 0.4;
      part(h.torso, boxGeo(0.6, 0.6, 0.6), g(0xff1744), -0.5, 2.7, -0.9);
      break;
    }
  }
}

/** Insane Truck M2: a dark green army truck with four Soldiers sitting in the back. */
export function makeInsaneTruckModel(def) {
  const h = creature();
  const { M } = h;
  const green = M(def.skin);
  const truck = new THREE.Group();
  h.body.add(truck);
  part(truck, boxGeo(2.6, 0.5, 5.2), M(0x263238), 0, 0.8, 0); // chassis
  part(truck, boxGeo(2.4, 1.5, 1.6), green, 0, 1.75, 1.6); // cab
  part(truck, boxGeo(2.0, 0.6, 0.08), M(0x90caf9), 0, 2.05, 2.42); // windshield
  part(truck, boxGeo(2.6, 0.8, 3.2), green, 0, 1.45, -0.9); // open bed
  part(truck, boxGeo(2.2, 0.2, 2.8), M(0x1b3d12), 0, 1.86, -0.9);
  // Four Soldiers in the back: green jackets and berets.
  for (const [x, z] of [[-0.6, -0.2], [0.6, -0.2], [-0.6, -1.6], [0.6, -1.6]]) {
    part(truck, boxGeo(0.7, 0.8, 0.6), M(0x2e7d32), x, 2.3, z);
    part(truck, boxGeo(0.5, 0.5, 0.5), M(0xa5d6a7), x, 2.95, z);
    part(truck, boxGeo(0.55, 0.15, 0.55), M(0x1b5e20), x, 3.25, z);
  }
  h.wheels = [];
  for (const [x, z] of [[-1, -1.8], [1, -1.8], [-1, 1.6], [1, 1.6]]) {
    const w = part(h.body, cylGeo(0.55, 0.55, 0.4, 10), M(0x111111), x * 1.3, 0.55, z);
    w.rotation.z = Math.PI / 2;
    h.wheels.push(w);
  }
  h.anim = (phase, t) => {
    for (const w of h.wheels) w.rotation.x = phase * 3;
    truck.position.y = Math.abs(Math.sin(t * 14)) * 0.06;
  };
  return h;
}

/** Insane Carrier Tank: a long, low dark-purple futuristic tank with glowing trim. */
export function makeCarrierTankModel(def) {
  const h = creature();
  const { M } = h;
  const hull = M(def.skin);
  const trim = glow(h, def.shard);
  part(h.body, boxGeo(3.4, 1.1, 6.4), hull, 0, 0.95, 0);
  part(h.body, boxGeo(2.6, 0.6, 5.0), M(0x1a0f3a), 0, 1.8, -0.3);
  part(h.body, boxGeo(3.42, 0.12, 6.42), trim, 0, 1.2, 0);
  for (const side of [-1, 1]) part(h.body, boxGeo(0.7, 0.9, 6.6), M(0x111111), side * 1.75, 0.5, 0); // treads
  const turret = new THREE.Group();
  turret.position.set(0, 2.2, 0.4);
  h.body.add(turret);
  part(turret, boxGeo(1.8, 0.6, 1.8), hull, 0, 0, 0);
  part(turret, cylGeoX(0.18, 0.18, 2.6, 8), M(0x111111), 0, 0.05, 2.0);
  part(turret, boxGeo(0.3, 0.3, 0.3), trim, 0, 0.05, 3.3);
  part(h.body, boxGeo(1.6, 0.2, 0.08), trim, 0, 1.4, 3.21); // headlight strip
  h.anim = (phase, t) => {
    turret.rotation.y = Math.sin(t * 0.6) * 0.4;
    trim.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.2;
  };
  return h;
}

/** Insane MK11-Device: a black machine with spinning prongs and a blue trail. */
export function makeMk11Model(def) {
  const h = creature();
  const { M } = h;
  const dark = M(def.skin);
  const blue = glow(h, def.shard);
  part(h.body, cylGeo(1.6, 1.9, 0.8, 10), dark, 0, 0.4, 0);
  part(h.body, cylGeo(1.0, 1.4, 1.6, 10), dark, 0, 1.6, 0);
  part(h.body, cylGeo(0.5, 0.5, 0.2, 10), blue, 0, 2.5, 0);
  const prongs = new THREE.Group();
  prongs.position.y = 2.6;
  h.body.add(prongs);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const p = part(prongs, boxGeo(0.2, 1.3, 0.2), M(0x37474f), Math.sin(a) * 0.9, 0.5, Math.cos(a) * 0.9);
    p.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5);
    part(prongs, boxGeo(0.25, 0.25, 0.25), blue, Math.sin(a) * 1.25, 1.15, Math.cos(a) * 1.25);
  }
  part(h.body, boxGeo(0.6, 0.06, 3), blue, 0, 0.05, -2.2); // its blue trail
  h.anim = (phase, t) => {
    prongs.rotation.y = t * 4;
    blue.emissiveIntensity = 0.6 + Math.sin(t * 8) * 0.3;
  };
  return h;
}
