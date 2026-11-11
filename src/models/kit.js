// The basic building blocks every model is made of: boxes (boxGeo, part), faces, and the
// blocky person (makeHumanoid). Other files import these through ../models.js.

import * as THREE from 'three';
import { bevelGeo, headGeo } from '../rig.js';

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
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.scale(4, 4); // faces are drawn on a 64 x 64 grid
  g.fillStyle = '#' + new THREE.Color(skin).getHexString();
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#111';
  g.lineCap = 'round';
  // Rounded shapes for the friendlier faces.
  const oval = (x, y, rx, ry) => {
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
  };
  const line = (w, ...pts) => {
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.stroke();
  };
  const curve = (w, x0, y0, cx, cy, x1, y1) => {
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo(cx, cy, x1, y1);
    g.stroke();
  };
  const eyes = (ry = 5.5, rx = 3.6, y = 27) => {
    oval(22, y, rx, ry);
    oval(42, y, rx, ry);
  };
  g.strokeStyle = '#111';
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
    case 'soldier': // steady eyes under level brows, a straight mouth
      eyes(4.6, 3.4);
      line(2.6, 15, 19.5, 27, 20.5);
      line(2.6, 37, 20.5, 49, 19.5);
      line(2.6, 24, 45, 40, 45);
      break;
    case 'stern': // heavy angled brows and a tight frown
      eyes(4.2, 3.4, 28);
      line(3, 14, 18, 28, 22);
      line(3, 36, 22, 50, 18);
      curve(2.6, 23, 47, 32, 43, 41, 47);
      break;
    case 'smirk': // one brow up and a crooked grin
      eyes(4.8, 3.4);
      line(2.4, 15, 20, 27, 20);
      line(2.4, 37, 18, 49, 16);
      curve(2.8, 24, 44, 36, 49, 44, 41);
      break;
    case 'grin': // wide open grin with teeth
      eyes(5, 3.6, 25);
      g.fillStyle = '#3a1410';
      g.beginPath();
      g.moveTo(18, 39); g.quadraticCurveTo(32, 56, 46, 39); g.closePath(); g.fill();
      g.fillStyle = '#fafafa';
      g.fillRect(21, 39.5, 22, 4);
      break;
    case 'focus': // narrowed eyes, one squinting down the sights
      oval(22, 28, 4, 2.2);
      oval(42, 27, 3.6, 4.4);
      line(2.6, 15, 22, 28, 23);
      line(2.6, 37, 20, 49, 19);
      line(2.4, 26, 45, 39, 44);
      break;
    case 'calm': // closed, relaxed eyes and a small smile
      curve(2.6, 17, 27, 22, 31, 27, 27);
      curve(2.6, 37, 27, 42, 31, 47, 27);
      curve(2.4, 26, 43, 32, 47, 38, 43);
      break;
    case 'cocky': // half-lidded eyes and a big side smile
      eyes(4.4, 3.6, 28);
      g.fillStyle = '#' + new THREE.Color(skin).getHexString();
      g.fillRect(16, 21, 32, 5.5);
      g.fillStyle = '#111';
      line(2.4, 16, 25.5, 28, 25.5);
      line(2.4, 36, 25.5, 48, 25.5);
      curve(3, 22, 42, 34, 52, 46, 40);
      break;
    case 'grit': // gritted teeth and furious brows
      eyes(4, 3.4, 28);
      line(3.2, 13, 17, 28, 23);
      line(3.2, 36, 23, 51, 17);
      g.fillStyle = '#fafafa';
      g.fillRect(20, 41, 24, 8);
      g.strokeStyle = '#111';
      g.lineWidth = 1.6;
      g.strokeRect(20, 41, 24, 8);
      for (const x of [26, 32, 38]) line(1.4, x, 41, x, 49);
      break;
    case 'scar': // a scar through one eye, stubble and a flat mouth
      eyes(4.6, 3.4);
      line(2.6, 15, 20, 27, 20.5);
      line(2.6, 37, 20.5, 49, 20);
      g.strokeStyle = '#8d3b2f';
      line(2, 45, 14, 39, 38);
      g.strokeStyle = '#111';
      line(2.6, 25, 46, 39, 46);
      g.fillStyle = 'rgba(40,30,25,0.28)';
      g.fillRect(14, 40, 36, 16);
      break;
    case 'beard': // a full dark beard with a mouth line
      eyes(4.8, 3.4, 25);
      line(2.6, 15, 18.5, 27, 19);
      line(2.6, 37, 19, 49, 18.5);
      g.fillStyle = '#3b2a1e';
      g.beginPath();
      g.moveTo(8, 34); g.lineTo(56, 34); g.lineTo(56, 64); g.lineTo(8, 64); g.closePath(); g.fill();
      g.fillStyle = '#' + new THREE.Color(skin).getHexString();
      g.beginPath();
      g.ellipse(32, 36, 13, 5, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#1c120c';
      line(2.4, 26, 46, 38, 46);
      break;
    case 'stache': // a big moustache
      eyes(4.8, 3.4, 25);
      line(2.6, 15, 18.5, 27, 19);
      line(2.6, 37, 19, 49, 18.5);
      g.fillStyle = '#4e342e';
      g.beginPath();
      g.moveTo(32, 38); g.quadraticCurveTo(46, 36, 50, 46); g.quadraticCurveTo(40, 42, 32, 44);
      g.quadraticCurveTo(24, 42, 14, 46); g.quadraticCurveTo(18, 36, 32, 38); g.fill();
      break;
    case 'shades': // dark aviators and a smug mouth
      g.fillStyle = '#0b0b0d';
      g.beginPath();
      g.roundRect(11, 21, 19, 13, 4); g.roundRect(34, 21, 19, 13, 4); g.fill();
      g.fillRect(28, 23, 8, 3);
      g.fillStyle = 'rgba(255,255,255,0.28)';
      g.fillRect(14, 23, 6, 3);
      g.fillRect(37, 23, 6, 3);
      g.strokeStyle = '#111';
      curve(2.6, 24, 45, 33, 48, 41, 43);
      break;
    case 'wink':
      oval(22, 27, 3.6, 5.2);
      curve(2.8, 37, 28, 42, 24, 47, 28);
      curve(2.8, 22, 42, 32, 51, 43, 41);
      break;
    case 'mad': // wide wild eyes and a jagged grin
      g.fillStyle = '#fafafa';
      oval(21, 26, 7, 7);
      oval(43, 26, 6, 6);
      g.fillStyle = '#111';
      oval(22, 27, 2.6, 2.6);
      oval(42, 26, 2.2, 2.2);
      g.fillStyle = '#2a1010';
      g.beginPath();
      g.moveTo(16, 40);
      for (const [x, y] of [[21, 46], [26, 41], [32, 48], [38, 41], [43, 46], [48, 40], [44, 52], [20, 52]]) g.lineTo(x, y);
      g.closePath(); g.fill();
      break;
    case 'cyber': // a glowing visor line where the eyes would be, and a grille mouth
      g.fillStyle = '#10141a';
      g.beginPath(); g.roundRect(8, 20, 48, 14, 5); g.fill();
      g.fillStyle = '#4dd0e1';
      g.beginPath(); g.roundRect(12, 24.5, 40, 5, 2.5); g.fill();
      g.strokeStyle = '#222';
      for (const x of [25, 29.5, 34, 38.5]) line(1.8, x, 42, x, 50);
      break;
    case 'kid': // big shiny eyes and a tiny smile
      oval(21, 27, 5.4, 7);
      oval(43, 27, 5.4, 7);
      g.fillStyle = '#fff';
      oval(22.5, 24, 2, 2.6);
      oval(44.5, 24, 2, 2.6);
      g.strokeStyle = '#111';
      curve(2.4, 27, 43, 32, 47, 37, 43);
      break;
    case 'tired': // bags under the eyes and a flat mouth
      eyes(3.6, 3.6, 27);
      g.strokeStyle = 'rgba(60,40,60,0.55)';
      curve(2, 16, 33, 22, 36, 28, 33);
      curve(2, 36, 33, 42, 36, 48, 33);
      g.strokeStyle = '#111';
      line(2.4, 15, 21, 28, 22);
      line(2.4, 36, 22, 49, 21);
      line(2.4, 26, 46, 38, 46);
      break;
    case 'warpaint': // black stripes under hard eyes
      eyes(4.4, 3.4, 26);
      line(3, 14, 19, 28, 21.5);
      line(3, 36, 21.5, 50, 19);
      g.fillStyle = '#1b1b1b';
      g.fillRect(12, 34, 15, 4);
      g.fillRect(37, 34, 15, 4);
      g.strokeStyle = '#111';
      line(2.6, 25, 47, 39, 47);
      break;
    default: // the classic smile
      eyes(5.8, 3.6, 26);
      curve(3, 19, 40, 32, 53, 45, 40);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  faceCache.set(key, t);
  return t;
}

/**
 * Builds a humanoid: a round head, a block torso and jointed block limbs (arm = sleeve + hand,
 * leg = thigh + shin + shoe). Limbs are pivot groups at the shoulder / hip, so `rotation.x` swings
 * them; they are built straight, and rigify() (rig.js) adds working elbows and knees afterwards.
 * Returns handles to every part plus the list of materials (for tinting, fading and disposal).
 * Characters face +Z; `upper` holds the torso, head and arms so the chest can lean and twist.
 */
export function makeHumanoid({ skin = 0xf5cd30, shirt = 0x1e88e5, pants = 0x43a047, arms = null, face = 'smile', hands = null, shoes = null } = {}) {
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
  const handM = hands == null ? skinM : M(hands);
  const shoeM = M(shoes ?? new THREE.Color(pants).multiplyScalar(0.5).getHex());

  const root = new THREE.Group();
  const body = new THREE.Group(); // pivot at the feet; used for bobbing / falling over
  root.add(body);
  const upper = new THREE.Group(); // everything above the waist
  body.add(upper);

  const torso = part(upper, bevelGeo(2, 2, 1, 0.09), shirtM, 0, 3, 0);
  const head = new THREE.Group();
  head.position.y = 4;
  upper.add(head);
  const skull = part(head, headGeo(), [faceM, skinM], 0, 0, 0);
  skull.userData.roundHead = true;

  // A limb's own meshes live in its first child, so hiding children[0] still hides the bare limb.
  const limb = (parent, x, y, build) => {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    parent.add(p);
    const own = new THREE.Group();
    p.add(own);
    own.userData.lower = build(own);
    return p;
  };
  // Block limbs, Tower Defense Simulator style: one straight block with the hand / shoe flush at
  // the end (no elbow or knee balls). STIFF_LIMBS in rig.js keeps them from bending.
  const arm = (own) => {
    part(own, bevelGeo(1, 1.64, 1, 0.07), armM, 0, -0.82, 0);
    own.userData.end = [];
    return [part(own, bevelGeo(1, 0.36, 1, 0.07), handM, 0, -1.82, 0)];
  };
  const leg = (own) => {
    part(own, bevelGeo(1, 1.7, 1, 0.07), pantsM, 0, -0.85, 0);
    own.userData.end = [];
    return [part(own, bevelGeo(1.02, 0.3, 1.06, 0.07), shoeM, 0, -1.85, 0.03)];
  };
  // Facing +Z, the character's right side is -X.
  const rightArm = limb(upper, -1.5, 4, arm);
  const leftArm = limb(upper, 1.5, 4, arm);
  const rightLeg = limb(body, -0.5, 2, leg);
  const leftLeg = limb(body, 0.5, 2, leg);

  return { root, body, upper, torso, head, rightArm, leftArm, rightLeg, leftLeg, mats, M };
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
  for (const m of h.mats) m.emissive?.setHex(hex || m.userData.glow || 0); // golden mist and stars have no glow colour to set
}
