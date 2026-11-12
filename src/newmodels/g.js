import * as THREE from 'three';
import { boxGeo, part, makeHumanoid, makeThing, glow, setMuzzle } from '../models.js';

// Wave 9 tower models (set G): a cartoon crew of ghosts, dogs, blobs and snack creatures.
// Tower makers take a level index 0-4; characters face +Z (their right side is -X).

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

/** A rounded (chamfered) box made of three crossing boxes. */
function blob(parent, w, h, d, mat, x = 0, y = 0, z = 0, r = 0.18) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  part(g, boxGeo(w, h - 2 * r, d - 2 * r), mat);
  part(g, boxGeo(w - 2 * r, h, d - 2 * r), mat);
  part(g, boxGeo(w - 2 * r, h - 2 * r, d), mat);
  return g;
}

const UP = new THREE.Vector3(0, 1, 0);
/** A thin box from point a to point b (strings, poles, hoses). */
function stick(parent, mat, a, b, w = 0.06) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const m = part(parent, boxGeo(w, d.length(), w), mat, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}

// ---------------------------------------------------------------------------------------------
// 1. Specter: a sheet ghost rocking out on an electric guitar (support).
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// 2. Discount Dog: a floppy-eared dog with sale signs (support: cheaper upgrades).
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// 3. Balloon Pal: machines8.js.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// 4. Dumpster Child: a pink face in a trash can with a flaming lid (damage over time).
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// 5. Wafer: a gingerbread fighter who throws ornaments (and bonks up close).
// ---------------------------------------------------------------------------------------------

const ORN = [0xe53935, 0x43a047, 0xfdd835, 0x1e88e5];

// ---------------------------------------------------------------------------------------------
// 6. Lure: a see-through ghost cat rising from a clay pot (long bursts).
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// 7. Sparks: a girl in a pink robo-suit with a plasma blaster (plasma bursts).
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// 8. Soda Pop: a worried mouse lobbing soda (splash).
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// 9. Hotdog Frank: a grinning hotdog with corndog clubs (melee area hits).
// ---------------------------------------------------------------------------------------------

function corndog(h, parent, s = 1, y0 = 0) {
  const { M } = h;
  part(parent, boxGeo(0.12, 0.7, 0.12), M(0xd7ccc8), 0, y0 - 0.2, 0);
  blob(parent, 0.5 * s, 1.3 * s, 0.5 * s, M(0xd4892a), 0, y0 - 0.5 - 0.65 * s, 0, 0.12 * s);
  part(parent, boxGeo(0.52 * s, 0.1, 0.52 * s), M(0xb3661a), 0, y0 - 0.5 - 0.4 * s, 0);
  part(parent, boxGeo(0.52 * s, 0.1, 0.52 * s), M(0xb3661a), 0, y0 - 0.5 - 0.9 * s, 0);
  return y0 - 0.5 - 1.3 * s;
}

// ---------------------------------------------------------------------------------------------
// 10. Keith: a deadpan cowboy kid with boomerangs.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// 11. Bunny: egg thrower -> slingshot -> catapult -> egg bazooka.
// ---------------------------------------------------------------------------------------------

const PASTEL = [0xb2ebf2, 0xf8bbd0, 0xfff59d, 0xc5e1a5, 0xd1c4e9];

function egg(h, parent, color, x, y, z, s = 1) {
  blob(parent, 0.5 * s, 0.68 * s, 0.5 * s, h.M(color), x, y, z, 0.12 * s);
  part(parent, boxGeo(0.52 * s, 0.1 * s, 0.52 * s), h.M(0xffffff), x, y, z);
}

// ---------------------------------------------------------------------------------------------
// 12. Beebo: a robot kid who drives a circle throwing ice creams (Aviator orbit view).
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// 13. Fracture: a living chunk of stone that throws crystal shards.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Unit: Bomb Float, a little blob floating a big bomb on three balloons.
// ---------------------------------------------------------------------------------------------

function bombFloat() {
  const u = makeThing();
  u.wheels = [];
  const { M } = u;
  const skin = M(0xb3e5fc);
  const ink = M(0x1a1a1a);
  // Blob
  blob(u.body, 1.0, 0.9, 0.9, skin, 0, 1.6, -0.1, 0.22);
  for (const s of [-1, 1]) {
    part(u.body, boxGeo(0.12, 0.18, 0.05), ink, s * 0.22, 1.72, 0.36);
    part(u.body, boxGeo(0.2, 0.35, 0.2), skin, s * 0.45, 1.25, 0.15).rotation.x = -0.5; // arms down to the bomb
  }
  part(u.body, boxGeo(0.45, 0.14, 0.05), M(0xfafafa), 0, 1.45, 0.36);
  for (let i = 0; i < 3; i++) part(u.body, boxGeo(0.08, 0.08, 0.05), ink, -0.13 + i * 0.13, 1.45 + (i % 2 ? 0.04 : -0.04), 0.37).rotation.z = Math.PI / 4;
  part(u.body, boxGeo(1.0, 0.14, 0.92), M(0x263238), 0, 1.22, -0.1); // neckerchief
  // Big round bomb
  blob(u.body, 1.2, 1.2, 1.2, M(0x212121), 0, 0.6, 0.35, 0.3);
  part(u.body, boxGeo(0.18, 0.3, 0.06), M(0x9e9e9e), -0.3, 0.85, 0.96);
  part(u.body, boxGeo(0.35, 0.2, 0.35), M(0x424242), 0.25, 1.25, 0.55);
  stick(u.body, M(0xa1887f), [0.25, 1.3, 0.55], [0.5, 1.6, 0.9], 0.07);
  part(u.body, boxGeo(0.2, 0.2, 0.2), glowThing(u, 0xffab00), 0.5, 1.65, 0.92);
  // Three balloons
  const from = [0, 2.0, -0.1];
  const bal = (c, x, y, z) => {
    const m = M(c);
    blob(u.body, 0.6, 0.72, 0.6, m, x, y, z, 0.15);
    stick(u.body, M(0xeeeeee), from, [x, y - 0.4, z], 0.03);
  };
  bal(0xe53935, -0.5, 2.75, 0);
  bal(0xf48fb1, 0.5, 2.8, -0.15);
  bal(0xfdd835, 0, 3.15, -0.45);
  u.height = 3.4;
  u.fly = 3;
  u.muzzles = [];
  return u;
}

function glowThing(u, color) {
  const m = u.M(color);
  m.userData.glow = color;
  m.emissive.setHex(color);
  m.emissiveIntensity = 0.8;
  return m;
}

export const TOWER_MODELS_G = {
};

export const UNIT_MODELS_G = {
  bombFloat,
};
