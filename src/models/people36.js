// Tower models, batch 36 (built with the vehicle kit in ../vehicles.js).
// In here: Bowman (alternate Poacher: a hooded archer with a wooden longbow) and Ground Mortar
// (alternate Mortar: a big cannon built into the ground, no crew; its cannonballs change with
// the level).
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.

import * as THREE from 'three';
import { glowMat, kit, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { gunMuzzle, makeThing } from './bits.js';
import { LEATHER, WOOD, belt, fist, muzzle, own, wear } from './people1.js';
import { feet, hands, hood } from './people5.js';
import { cape } from './people18.js';

const PI = Math.PI;

// ------------------------------------------------------------------ Bowman

const SHIRT = 0x7a5534; // brown shirt
const PANTS = 0x5b3f26; // brown pants
const CLOAK = 0x7d8085; // grey hooded cloak
const BOOT = 0x1c1c1c; // black boots
const BOW = 0x8a5a2b;
const FEATHER = 0xeeeeee;

/**
 * A wooden longbow in the left fist (gun space: it stands along z, the arrow points along -y):
 * a leather grip, two long limbs, a string and a nocked arrow. `head` is the arrowhead colour,
 * `limb` the wood. Returns the arrow tip y.
 */
function longbow(k, head, limb, o = {}) {
  k.cyl(0.11, 0.6, LEATHER, 0, 0, 0, { axis: 'z', seg: 10 }); // grip wrap
  const e = 2.1;
  for (const s of [-1, 1]) {
    k.tube([[0, 0, s * 0.28], [0, -0.18, s * 0.9], [0, -0.12, s * 1.6], [0, 0.08, s * e]], 0.07, limb, { seg: 14, sides: 6 });
    k.ball(0.06, tone(limb, 0.6), 0, 0.08, s * e, { seg: 6, rows: 4 }); // horn nock
    k.tube([[0, 0.08, s * e], [0, 0.95, 0]], 0.016, 0xe8dcc0, { seg: 2, sides: 4, tension: 0 }); // string
  }
  if (o.horn) for (const s of [-1, 1]) k.box(0.1, 0.5, 0.06, 0x2a2a2a, 0, -0.17, s * 0.65, { rx: s * 0.1 }); // Warbow: dark horn bands
  const tip = -0.9;
  k.cyl(0.03, 0.95 - tip, o.dark ? 0x3e2a1a : 0xb08850, 0, (0.95 + tip) / 2, 0.12, { seg: 6 }); // shaft
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    k.box(0.02, 0.32, 0.12, FEATHER, Math.sin(a) * 0.06, 0.72, 0.12 + Math.cos(a) * 0.06, { ry: a }); // fletching
  }
  k.cyl(0.01, o.barbed ? 0.36 : 0.28, head, 0, tip + (o.barbed ? 0.18 : 0.14), 0.12, { r2: o.barbed ? 0.11 : 0.09, seg: 8 }); // head
  if (o.barbed) for (const s of [-1, 1]) k.box(0.02, 0.14, 0.12, head, 0, tip + 0.28, 0.12 + s * 0.08, { rx: s * 0.6 }); // serrated barbs
  return tip;
}

/**
 * Bowman (0-3): a hooded archer in a grey cloak, brown shirt and pants and black boots, with a
 * wooden longbow and a quiver of arrows at his waist.
 * Lv 1 Serrated Edges: red-tipped barbed arrows and a bracer. Lv 2 Steel Arrowheads: steel
 * arrowheads and leather gloves. Lv 3 Arrow In The Knee: a dark warbow with horn bands, a second
 * quiver and knee guards.
 */
export function makeBowman(level) {
  const h = makeHumanoid({ skin: 0xd2a679, shirt: SHIRT, pants: PANTS, arms: SHIRT, face: 'soldier' });
  const key = `bowman${level}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hood(hd, CLOAK);
  cape(t, CLOAK, 2.6, { clasp: 0x9e9e9e, tatter: true });
  t.box(0.08, 1.4, 0.05, tone(SHIRT, 0.7), 0, 0.15, 0.58); // shirt lacing
  belt(t, LEATHER, 0x9e9e9e);
  // the quiver hangs at the right hip, arrows sticking up
  const head = level >= 2 ? 0xb0bec5 : level >= 1 ? 0xc62828 : 0x6d6d6d;
  const quiver = (x, n) => {
    t.cyl(0.3, 1.1, LEATHER, x, -1.15, 0.2, { rz: 0.25, seg: 12 });
    t.torus(0.3, 0.04, tone(LEATHER, 0.6), x - 0.12, -0.7, 0.2, { rx: PI / 2, rz: 0.25, seg: 12 });
    for (let i = 0; i < n; i++) {
      const dx = ((i % 3) - 1) * 0.12;
      const dz = (Math.floor(i / 3) - 0.5) * 0.14;
      t.cyl(0.025, 0.5, 0xb08850, x - 0.2 + dx, -0.4, 0.2 + dz, { rz: 0.25, seg: 5 });
      t.box(0.03, 0.22, 0.12, FEATHER, x - 0.25 + dx, -0.2, 0.2 + dz, { rz: 0.25 }); // fletching
    }
  };
  quiver(-1.25, 6);
  if (level >= 3) quiver(1.25, 4);
  hd.done();
  t.done();
  hands(h, key, level >= 2 ? LEATHER : null, tone(SHIRT, 0.8), (a, s) => {
    if (level >= 1 && s === 1) {
      a.cyl(0.58, 0.7, LEATHER, 0, -1.25, 0, { seg: 12, r2: 0.6 }); // bracer on the bow arm
      for (const y of [-1.05, -1.45]) a.torus(0.6, 0.03, 0x9e9e9e, 0, y, 0, { rx: PI / 2, seg: 12 });
    }
  });
  feet(h, key, BOOT, (b) => {
    if (level >= 3) b.box(1.0, 0.6, 0.2, LEATHER, 0, -0.1, 0.55, { r: 0.08 }); // knee guard
  });
  h.muzzles = [];
  const g = fist(h.leftArm, -1.9, 1.1);
  const gk = wear(h, g, `${key}:bow`);
  const tip = longbow(gk, head, level >= 3 ? 0x4a2e1a : BOW, { barbed: level >= 1, horn: level >= 3, dark: level >= 3 });
  gk.done();
  muzzle(h, g, tip, 0.12);
  h.leftArm.rotation.set(-PI / 2, 0, 0.3);
  h.rightArm.rotation.set(-PI / 2, 0, -0.4);
  h.pose = { right: -PI / 2, left: -PI / 2, leftRecoil: 0 };
  h.tracer = 0xb08850;
  return own(h, 0);
}

// ------------------------------------------------------------------ Ground Mortar

/**
 * Ground Mortar (0-3): a big cannon sunk into a stone-lined pit, tilted up, with a pile of its
 * ammunition beside it. Lv 0 plain iron balls. Lv 1 More Gunpowder: black powder bombs with
 * fuses and powder kegs. Lv 2 Heavy Artillery: a bigger barrel with bands and big pointed
 * shells. Lv 3 The Bigger, The Better: a huge barrel and glowing orange fire shells.
 */
export function makeGroundMortar(level) {
  const u = makeThing();
  const fire = glowMat(u, 0xff6d00);
  const k = kit(u, u.body, `groundMortar${level}`);
  // the pit: a ring of stones round a dark hole, earth heaped round it
  k.cyl(2.5, 0.35, 0x6d5a40, 0, 0.17, 0, { r2: 2.8, seg: 22 }); // earth mound
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * PI * 2;
    k.box(0.7, 0.45, 0.5, i % 2 ? 0x8a8a8a : 0x9e9e9e, Math.cos(a) * 2.05, 0.4, Math.sin(a) * 2.05, { r: 0.12, ry: -a });
  }
  k.cyl(1.75, 0.06, 0x1e1a14, 0, 0.37, 0, { seg: 22 }); // the hole
  // iron mount: a heavy ring and two cheek plates holding the trunnions
  k.torus(1.25, 0.16, 0x37474f, 0, 0.45, 0, { rx: PI / 2, seg: 20 });
  for (const sx of [-0.95, 0.95]) {
    k.prism([[-0.7, 0], [-0.35, 1.2], [0.35, 1.2], [0.7, 0]], 0.18, 0x455a64, sx, 0.4, 0);
    k.cyl(0.14, 0.12, 0x263238, sx * 1.07, 1.45, 0, { axis: 'x', seg: 10 }); // bolt
  }
  // the ammunition pile (it changes with the level)
  const ammo = (x, y, z) => {
    if (level === 0) k.ball(0.26, 0x3a3a3a, x, y + 0.26, z, { seg: 10, rows: 7 });
    else if (level === 1) {
      k.ball(0.28, 0x151515, x, y + 0.28, z, { seg: 10, rows: 7 });
      k.cyl(0.05, 0.12, 0x5d4037, x, y + 0.6, z, { seg: 6 });
      k.cyl(0.015, 0.2, 0xd7ccc8, x + 0.05, y + 0.72, z, { seg: 3, rz: -0.5 }); // fuse
    } else {
      const col = level >= 3 ? fire : 0x5d6b3a;
      k.cyl(0.24, 0.55, 0x8d6e47, x, y + 0.28, z, { seg: 10 }); // brass case
      k.cyl(0.24, 0.4, col, x, y + 0.75, z, { r2: 0.05, seg: 10 }); // pointed head
    }
  };
  for (const [x, z] of [[2.9, 0.6], [3.3, 0.9], [3.05, 1.2]]) ammo(x, 0, z);
  ammo(3.1, level >= 2 ? 0.55 : 0.45, 0.9);
  if (level >= 1) {
    // powder kegs
    for (const [x, z] of [[-2.9, 1.1], [-3.1, 0.2]]) {
      k.cyl(0.4, 0.8, 0x8d6e63, x, 0.4, z, { seg: 12 });
      for (const y of [0.15, 0.65]) k.torus(0.41, 0.04, 0x37474f, x, y, z, { rx: PI / 2, seg: 12 });
      k.box(0.4, 0.2, 0.02, 0x212121, x, 0.45, z + 0.41); // "powder" mark
    }
  }
  if (level >= 2) {
    // sandbag wall behind it
    for (let i = 0; i < 6; i++) {
      const a = PI * 1.15 + (i / 5) * PI * 0.7;
      k.box(0.9, 0.42, 0.5, i % 2 ? 0xbcaaa4 : 0xa1887f, Math.cos(a) * 3.1, 0.25, Math.sin(a) * 3.1, { r: 0.15, ry: -a + PI / 2 });
    }
  }
  k.done();
  // the cannon, tilted up toward +z
  const big = [1, 1.1, 1.3, 1.5][level];
  const metal = level >= 3 ? 0x2b2b2b : 0x3e4a50;
  const band = level >= 3 ? 0xffab40 : level >= 2 ? 0x8d6e47 : 0x263238;
  const gun = new THREE.Group();
  gun.position.set(0, 1.45, 0);
  gun.rotation.x = -0.85;
  u.body.add(gun);
  const gk = kit(u, gun, `groundMortarGun${level}`);
  const r = 0.55 * big;
  const len = 2.4 * big;
  gk.cyl(0.16, 2.1, 0x263238, 0, 0, 0, { axis: 'x', seg: 10 }); // trunnions
  gk.ball(r * 1.25, metal, 0, 0, -0.2, { sz: 1.1, seg: 16, rows: 10 }); // breech
  gk.cyl(r, len, metal, 0, 0, len / 2, { axis: 'z', r2: r * 1.08, seg: 18 }); // barrel, widening a bit
  gk.cyl(r * 0.78, 0.08, 0x111111, 0, 0, len + 0.01, { axis: 'z', seg: 16 }); // bore
  gk.torus(r * 1.2, r * 0.16, band, 0, 0, len - 0.05, { seg: 18 }); // muzzle swell
  gk.torus(r * 1.12, r * 0.12, band, 0, 0, 0.35, { seg: 18 });
  if (level >= 2) for (const z of [len * 0.4, len * 0.65]) gk.torus(r * 1.1, r * 0.1, band, 0, 0, z, { seg: 18 });
  if (level >= 3) gk.torus(r * 1.32, 0.06, fire, 0, 0, len + 0.03, { seg: 18 }); // hot glowing rim
  gk.done();
  gunMuzzle(u, gun, 0, 0, len + 0.1);
  u.projectile = [
    { color: 0x3a3a3a, size: 0.7, arc: 22 },
    { color: 0x151515, size: 0.8, arc: 22 },
    { color: 0x5d6b3a, size: 0.95, arc: 24 },
    { color: 0xff6d00, size: 1.1, arc: 24, glowing: true },
  ][level];
  return u;
}

export const MODELS = {
  bowman: makeBowman,
  mortarGround: makeGroundMortar,
};
