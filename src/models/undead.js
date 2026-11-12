// Graveyard (event tower) undead, built with the vehicle kit (../vehicles.js):
//   skelmini         Skeleton: small, bare bones, a rag round the hips, runs in with its arms out
//   skelcursed       Cursed Skeleton: purple bones, glowing cracks and eyes, a purple wisp
//   skelgiant        Giant Skeleton (the Necromancer raises it too): big, with a leather belt,
//                    a bone shoulder pad and a huge femur club
//   skelgiantcursed  Giant Cursed Skeleton: purple, horned skull, rags, a glowing spiked club
//   skelhaunted      Haunted Knight: rusty armour, green ghost-fire, sword and shield
//   skelhallowknight Hallow Knight: black and orange armour, horned helm, cape, flaming sword
//   skeljack         Jack: the Halloween boss himself (makeEnemy on ENEMIES.hwJack), smaller
//
// Each is a real skeleton (skull with sockets and jaw, spine, curved ribs, pelvis, two-bone arms
// and legs with round joints), not a humanoid block body. The rig has the same handles as a
// humanoid (root, body, upper, head, arms, legs) so units views can swing the legs.
// Spaces: feet at y 0, hips at y 2, shoulders at y 4, head group at y 4.25. Arms and legs hang
// from their pivots along -y. Faces +z.

import * as THREE from 'three';
import { ENEMIES } from '../enemies.js';
import { glowMat, kit, tone } from '../vehicles.js';
import { makeThing } from './bits.js';
import { makeEnemy } from './enemy.js';

const PI = Math.PI;
const SOCKET = 0x15110c;
const LEATHER = 0x4e3420;
const IRON = 0x5f6670;
const INK_STRAP = 0x2a1d12;

/** The look of each model: bone colour, eye glow, how big, what it carries. */
const LOOKS = {
  skelmini: { bone: 0xe8e2cc, size: 0.8, rag: 0x6d5a40 },
  skelcursed: { bone: 0xb9a6dc, size: 0.8, eye: 0xd500f9, cracks: true, rag: 0x2d1b4e, wisp: true },
  skelgiant: { bone: 0xe2dbc2, size: 1.9, club: 'bone', belt: true, pad: true },
  skelgiantcursed: { bone: 0xae9bd6, size: 1.9, eye: 0xd500f9, cracks: true, club: 'cursed', rag: 0x2d1b4e, horns: 0x2a1840, wisp: true },
  skelhaunted: { bone: 0xc8dcb4, size: 1.1, eye: 0x76ff03, knight: 'haunted' },
  skelhallowknight: { bone: 0xe6dcc4, size: 1.3, eye: 0xff9100, knight: 'hallow' },
};

export const UNDEAD_MODELS = ['skeljack', ...Object.keys(LOOKS)];

/** A Graveyard undead unit for `model` (one of UNDEAD_MODELS). */
export function makeUndeadUnit(model) {
  const h = model === 'skeljack' ? makeJack() : makeBones(model, LOOKS[model]);
  const u = makeThing();
  u.wheels = [];
  h.root.scale.setScalar(0.6 * h.size);
  u.body.add(h.root);
  u.mats.push(...h.mats);
  u.soldiers = [h];
  u.muzzles.push(h.muzzles[0]);
  u.height = 3.5 * h.size;
  u.tracer = h.tracer;
  return u;
}

/** Jack, built exactly like the boss, holding his skull axe out in front. */
function makeJack() {
  const h = makeEnemy(ENEMIES.hwJack);
  const m = new THREE.Object3D();
  m.position.set(0, -2.1, 3.4); // the axe head (newmodels/halloween.js)
  h.rightArm.add(m);
  h.muzzles = [m];
  h.size = 2.4;
  h.tracer = 0xff9100;
  return h;
}

// ------------------------------------------------------------------ the skeleton

function makeBones(model, L) {
  const h = { mats: [], muzzles: [], size: L.size, tracer: L.eye ?? 0xe0e0e0 };
  h.root = new THREE.Group();
  h.body = new THREE.Group();
  h.root.add(h.body);
  h.upper = new THREE.Group();
  h.body.add(h.upper);
  h.head = new THREE.Group();
  h.head.position.set(0, 4.25, 0.05);
  h.upper.add(h.head);
  const pivot = (parent, x, y) => {
    const g = new THREE.Group();
    g.position.set(x, y, 0);
    parent.add(g);
    return g;
  };
  h.rightArm = pivot(h.upper, -1.0, 3.95);
  h.leftArm = pivot(h.upper, 1.0, 3.95);
  h.rightLeg = pivot(h.body, -0.4, 2.0);
  h.leftLeg = pivot(h.body, 0.4, 2.0);

  const B = L.bone;
  const dim = tone(B, 0.78);
  const eye = L.eye ? glowMat(h, L.eye, 1.0) : null;
  const key = (part) => `undead:${model}:${part}`;

  // Body: pelvis, spine, ribs, collarbones (and what it wears on them).
  const t = kit(h, h.upper, key('trunk'));
  pelvis(t, B, dim);
  spine(t, B, dim);
  ribs(t, B, dim);
  if (L.cracks) for (const [x, y, rz] of [[0.25, 3.55, 0.5], [-0.3, 3.05, -0.4], [0.05, 2.5, 0.2]]) t.box(0.05, 0.32, 0.05, eye, x, y, 0.5, { rz });
  if (L.rag) rag(t, L.rag);
  if (L.belt) belt(t);
  if (L.pad) bonePad(t, B, dim);
  if (L.knight) armour(t, h, L);
  t.done();

  // Skull, with a jaw that hangs a little open.
  const s = kit(h, h.head, key('skull'));
  skull(s, B, dim, eye);
  if (L.horns) for (const x of [-1, 1]) s.tube([[x * 0.4, 1.05, -0.05], [x * 0.75, 1.3, -0.1], [x * 0.85, 1.75, -0.25], [x * 0.7, 2.05, -0.4]], 0.09, L.horns, { r2: 0.02 });
  if (L.knight) helm(s, h, L);
  s.done();

  // Arms and legs.
  for (const [g, side] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const k = kit(h, g, key(`arm${side}`));
    arm(k, B, dim, side);
    if (L.knight) gauntlet(k, L, side);
    if (L.knight === 'haunted' && side > 0) shield(k, h);
    k.done();
  }
  for (const [g, side] of [[h.rightLeg, -1], [h.leftLeg, 1]]) {
    const k = kit(h, g, key(`leg${side}`));
    leg(k, B, dim, side);
    if (L.knight) greave(k, L);
    k.done();
  }

  // What it holds, in a group at the right hand (the weapon points along -y, down the arm).
  const hand = new THREE.Group();
  hand.position.set(0, -2.05, 0);
  h.rightArm.add(hand);
  const w = kit(h, hand, key('weapon'));
  let tip = -0.2;
  if (L.club === 'bone') tip = femurClub(w, B, dim);
  else if (L.club === 'cursed') tip = cursedClub(w, B, h);
  else if (L.knight === 'haunted') tip = sword(w, 1.9, 0.32, 0xa8b0a0, glowMat(h, 0x76ff03, 0.9), 0x3b4a2f);
  else if (L.knight === 'hallow') tip = sword(w, 2.4, 0.4, 0x2b2b2b, glowMat(h, 0xff9100, 1.0), 0x3a1a00);
  w.done();
  const m = new THREE.Object3D();
  m.position.set(0, tip, 0);
  hand.add(m);
  h.muzzles = [m];

  if (L.wisp) wisp(h, L.eye);
  if (L.knight === 'hallow') cape(h);

  // Poses: weapon raised in front; the small ones run in with both arms reaching out.
  if (L.club || L.knight) {
    h.rightArm.rotation.set(-1.2, 0, 0.1);
    h.leftArm.rotation.set(L.knight === 'haunted' ? -0.9 : -0.5, 0, L.knight === 'haunted' ? -0.25 : 0);
  } else {
    h.rightArm.rotation.set(-1.4, 0, 0.1);
    h.leftArm.rotation.set(-1.4, 0, -0.1);
  }
  h.upper.rotation.x = 0.08; // a little hunched
  return h;
}

/** Hip bowl, two hip wings and the hip joints. */
function pelvis(k, B, dim) {
  k.cyl(0.5, 0.45, B, 0, 2.15, -0.02, { r2: 0.62, seg: 12, open: true });
  k.cyl(0.42, 0.06, dim, 0, 1.93, 0, { seg: 12 });
  for (const s of [-1, 1]) {
    k.ball(0.42, B, s * 0.42, 2.3, -0.05, { sx: 0.55, sy: 0.75, sz: 0.9, seg: 10, rows: 7 });
    k.ball(0.17, dim, s * 0.4, 2.0, 0.05, { seg: 8, rows: 6 }); // hip socket
  }
  k.box(0.22, 0.22, 0.2, B, 0, 1.95, 0.32, { r: 0.06 }); // front of the hips
}

/** A curved backbone of little vertebrae from the hips to the neck. */
function spine(k, B, dim) {
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = i / (n - 1);
    const y = 2.4 + a * 1.75;
    const z = -0.32 + Math.sin(a * PI) * -0.08;
    k.cyl(0.13, 0.13, i % 2 ? B : dim, 0, y, z, { seg: 8 });
    k.box(0.07, 0.1, 0.18, B, 0, y, z - 0.16, { rx: 0.5 }); // the bump at the back
  }
  k.tube([[0, 2.35, -0.3], [0, 3.2, -0.42], [0, 4.15, -0.3]], 0.07, dim, { seg: 10, sides: 6 });
}

/** Six pairs of ribs curving down round the chest, the breastbone and the collarbones. */
function ribs(k, B, dim) {
  for (let i = 0; i < 6; i++) {
    const y = 3.85 - i * 0.24;
    const w = 0.72 + Math.sin(((i + 1) / 7) * PI) * 0.18;
    for (const s of [-1, 1]) {
      k.tube([[s * 0.1, y, -0.38], [s * w, y - 0.08, -0.15], [s * w * 0.95, y - 0.2, 0.2], [s * 0.18, y - 0.32, 0.45]], 0.055, i % 2 ? B : tone(B, 0.92), { seg: 12, sides: 5, tension: 0.5 });
    }
  }
  k.box(0.22, 1.2, 0.1, B, 0, 3.35, 0.47, { r: 0.04, rx: -0.12 }); // breastbone
  k.box(0.14, 0.25, 0.08, dim, 0, 2.66, 0.43);
  for (const s of [-1, 1]) {
    k.tube([[s * 0.1, 3.98, 0.42], [s * 0.55, 4.08, 0.2], [s * 0.95, 4.0, -0.02]], 0.06, B, { seg: 8, sides: 5 }); // collarbone
    k.ball(0.32, B, s * 0.92, 3.85, -0.2, { sx: 0.6, sy: 0.9, sz: 0.25, rz: s * 0.2 }); // shoulder blade
    k.ball(0.17, B, s * 1.0, 3.95, 0, { seg: 8, rows: 6 }); // shoulder joint
  }
}

/** The skull: round top, deep sockets, cheekbones, nose hole, teeth and jaw. */
function skull(k, B, dim, eye) {
  k.cyl(0.11, 0.3, dim, 0, 0.05, -0.08, { seg: 8 }); // neck
  k.ball(0.58, B, 0, 0.82, -0.02, { sy: 0.95, sz: 1.08, seg: 16, rows: 12 }); // cranium
  k.box(0.85, 0.4, 0.5, B, 0, 0.5, 0.3, { r: 0.15 }); // face block
  k.box(0.9, 0.12, 0.2, dim, 0, 0.92, 0.5, { r: 0.05 }); // brow ridge
  for (const s of [-1, 1]) {
    k.ball(0.17, SOCKET, s * 0.22, 0.73, 0.47, { sz: 0.6, seg: 10, rows: 8 }); // eye socket
    if (eye) k.ball(0.07, eye, s * 0.22, 0.73, 0.53, { seg: 8, rows: 6 });
    k.box(0.22, 0.12, 0.3, B, s * 0.38, 0.52, 0.4, { r: 0.05, ry: s * 0.3 }); // cheekbone
    k.cyl(0.07, 0.12, dim, s * 0.55, 0.65, 0.05, { axis: 'x', seg: 8 }); // ear hole rim
  }
  k.box(0.13, 0.13, 0.08, SOCKET, 0, 0.57, 0.54, { rz: PI / 4, sy: 1.3 }); // nose hole
  for (let i = 0; i < 6; i++) k.box(0.075, 0.12, 0.06, 0xf4f0e2, -0.21 + i * 0.084, 0.33, 0.55); // top teeth
  k.box(0.7, 0.14, 0.42, B, 0, 0.12, 0.3, { r: 0.05, rx: 0.12 }); // jaw
  for (let i = 0; i < 6; i++) k.box(0.075, 0.1, 0.06, 0xf4f0e2, -0.21 + i * 0.084, 0.22, 0.5, { rx: 0.12 }); // bottom teeth
  for (const s of [-1, 1]) k.box(0.1, 0.4, 0.14, B, s * 0.36, 0.3, 0.12); // jaw hinges
  for (const [x, y, z, rz] of [[0.25, 1.2, 0.2, 0.6], [-0.15, 1.3, 0.05, -0.4]]) k.box(0.03, 0.22, 0.03, SOCKET, x, y, z + 0.32, { rz, rx: -0.6 }); // cracks
}

/** Arm: upper bone, elbow, two forearm bones, a bony hand with fingers. */
function arm(k, B, dim, side) {
  k.cyl(0.1, 0.9, B, 0, -0.55, 0, { r2: 0.11, seg: 8 });
  k.ball(0.15, B, 0, -0.12, 0, { seg: 8, rows: 6 });
  k.ball(0.15, dim, 0, -1.05, 0, { seg: 8, rows: 6 }); // elbow
  for (const x of [-0.07, 0.07]) k.cyl(0.055, 0.8, B, x, -1.5, 0, { r2: 0.07, seg: 6 });
  k.box(0.3, 0.2, 0.14, dim, 0, -1.95, 0, { r: 0.05 }); // wrist
  k.box(0.32, 0.22, 0.1, B, 0, -2.08, 0.02, { r: 0.04 }); // palm
  for (let i = 0; i < 4; i++) k.cyl(0.035, 0.26, B, -0.11 + i * 0.075, -2.3, 0.05, { seg: 5, rx: 0.3 });
  k.cyl(0.04, 0.22, B, side * -0.19, -2.05, 0.1, { seg: 5, rz: side * 0.6 }); // thumb
}

/** Leg: thigh bone, knee cap, two shin bones and a long bony foot. */
function leg(k, B, dim, side) {
  k.cyl(0.13, 0.95, B, 0, -0.55, 0, { r2: 0.12, seg: 8 });
  k.ball(0.17, B, 0, -0.08, 0, { seg: 8, rows: 6 });
  k.ball(0.17, dim, 0, -1.05, 0, { seg: 8, rows: 6 }); // knee
  k.ball(0.11, B, 0, -1.05, 0.14, { sz: 0.6, seg: 8, rows: 6 }); // knee cap
  k.cyl(0.08, 0.75, B, -side * 0.04, -1.5, 0, { r2: 0.09, seg: 6 });
  k.cyl(0.045, 0.75, dim, side * 0.1, -1.5, -0.02, { seg: 5 });
  k.ball(0.12, dim, 0, -1.88, 0, { seg: 8, rows: 6 }); // ankle
  k.slab(0.36, 0.14, 0.7, B, 0, -1.95, 0.22, { tw: 0.85, r: 0.03 }); // foot
  for (let i = 0; i < 4; i++) k.cyl(0.04, 0.2, B, -0.12 + i * 0.08, -1.97, 0.62, { axis: 'z', seg: 5 });
}

// ------------------------------------------------------------------ what they wear and hold

/** A torn cloth hanging from a rope round the hips. */
function rag(k, col) {
  k.torus(0.6, 0.05, LEATHER, 0, 2.35, 0, { rx: PI / 2, seg: 16 });
  const strips = [[-0.4, 0.5, 0.15], [0, 0.65, 0], [0.42, 0.45, -0.12], [-0.25, 0.55, -0.1], [0.3, 0.7, 0.1]];
  strips.forEach(([x, len, rz], i) => {
    const z = i < 3 ? 0.48 : -0.5;
    k.box(0.32, len, 0.05, i % 2 ? col : tone(col, 0.8), x, 2.35 - len / 2, z, { rz, rx: z > 0 ? -0.15 : 0.15 });
  });
}

/** Giant's wide leather belt with a skull buckle and a pouch. */
function belt(k) {
  k.cyl(0.66, 0.32, LEATHER, 0, 2.3, 0, { seg: 16, r2: 0.62 });
  k.box(0.36, 0.34, 0.1, 0xb08d57, 0, 2.3, 0.66, { r: 0.04 });
  k.ball(0.11, 0xe8e2cc, 0, 2.32, 0.72, { seg: 8, rows: 6 });
  k.box(0.32, 0.36, 0.2, tone(LEATHER, 1.2), 0.5, 2.05, 0.45, { r: 0.05, ry: 0.6 });
  for (const s of [-1, 1]) k.box(0.42, 0.7, 0.06, tone(LEATHER, 0.9), s * 0.35, 1.85, 0.55, { rz: s * 0.08 });
}

/** A bone-plated leather shoulder pad on the club arm, with a strap across the chest. */
function bonePad(k, B, dim) {
  k.ball(0.45, LEATHER, -1.0, 4.08, 0, { sy: 0.5, seg: 12, rows: 6 });
  for (let i = 0; i < 3; i++) k.box(0.55, 0.08, 0.16, i % 2 ? B : dim, -1.0, 4.25 - i * 0.13, 0.25 - i * 0.22, { rz: -0.3 });
  k.tube([[-0.9, 4.1, 0.35], [0, 3.2, 0.58], [0.8, 2.45, 0.45]], 0.06, LEATHER, { seg: 10, sides: 5 });
}

/** Knight armour over the ribs: breastplate, belt with a tabard, shoulder plates. */
function armour(k, h, L) {
  const hallow = L.knight === 'hallow';
  const plate = hallow ? 0x24262a : 0x6b6a58;
  const trim = hallow ? 0xb36a10 : 0x4a4f42;
  const cloth = hallow ? 0x3a1608 : 0x24361e;
  const fire = glowMat(h, L.eye, 0.9);
  k.slab(1.55, 1.25, 0.2, plate, 0, 3.5, 0.5, { tw: 1.08, bw: 0.85, r: 0.05 }); // breastplate
  k.box(0.08, 1.1, 0.06, trim, 0, 3.5, 0.62);
  k.slab(1.5, 1.1, 0.16, tone(plate, 0.85), 0, 3.5, -0.52, { tw: 1.05, bw: 0.9 }); // back plate
  for (const s of [-1, 1]) k.box(0.12, 0.08, 1.0, INK_STRAP, s * 0.7, 3.95, 0); // straps over the shoulders
  if (hallow) {
    // A carved pumpkin badge glowing on the chest.
    k.ball(0.24, 0xd96a00, 0, 3.55, 0.64, { sy: 0.85, sz: 0.4, seg: 10, rows: 7 });
    for (const x of [-0.08, 0.08]) k.box(0.06, 0.05, 0.04, fire, x, 3.6, 0.73);
    k.box(0.16, 0.04, 0.04, fire, 0, 3.48, 0.73);
    k.box(0.05, 0.1, 0.05, 0x33691e, 0, 3.78, 0.62);
  } else {
    k.box(0.28, 0.28, 0.05, fire, 0, 3.6, 0.63, { rz: PI / 4 }); // ghost-fire through a hole in the plate
    for (const [x, y] of [[-0.45, 3.2], [0.4, 3.9], [0.3, 3.05]]) k.ball(0.07, 0x7a4a24, x, y, 0.62, { sz: 0.4, seg: 6, rows: 4 }); // rust
  }
  for (const s of [-1, 1]) {
    k.ball(0.45, plate, s * 1.05, 4.0, 0, { sy: 0.55, seg: 12, rows: 6 }); // pauldron
    k.torus(0.42, 0.04, trim, s * 1.05, 3.92, 0, { rx: PI / 2, seg: 14 });
    if (hallow) k.cyl(0.08, 0.5, plate, s * 1.15, 4.35, 0, { r2: 0.01, seg: 6, rz: -s * 0.4 }); // spike
  }
  k.cyl(0.62, 0.25, LEATHER, 0, 2.4, 0, { seg: 16 }); // belt
  k.box(0.25, 0.22, 0.06, trim, 0, 2.4, 0.62);
  for (const z of [1, -1]) {
    const len = hallow ? 1.3 : 1.1;
    k.slab(0.8, len, 0.05, cloth, 0, 2.3 - len / 2, z * 0.5, { bw: 0.8 }); // tabard
    for (const x of [-0.22, 0.12]) k.box(0.12, 0.18, 0.06, cloth, x, 2.3 - len - 0.05, z * 0.5, { rz: x }); // torn hem
  }
}

/** Knight helm: round helmet with a visor slit (horns and a crest for the Hallow Knight). */
function helm(k, h, L) {
  const hallow = L.knight === 'hallow';
  const plate = hallow ? 0x24262a : 0x6b6a58;
  const trim = hallow ? 0xb36a10 : 0x4a4f42;
  const fire = glowMat(h, L.eye, 1.0);
  k.cyl(0.68, 0.9, plate, 0, 0.72, 0, { seg: 16, r2: 0.64 });
  k.ball(0.64, plate, 0, 1.17, 0, { sy: 0.7, seg: 16, rows: 6 });
  k.box(1.0, 0.12, 0.1, SOCKET, 0, 0.78, 0.66); // visor slit
  for (const s of [-1, 1]) k.box(0.24, 0.07, 0.04, fire, s * 0.22, 0.78, 0.71);
  k.box(0.1, 0.55, 0.08, trim, 0, 0.5, 0.67); // nose guard
  for (let i = 0; i < 4; i++) k.cyl(0.03, 0.05, SOCKET, -0.3 + i * 0.2, 0.35, 0.66, { axis: 'z', seg: 6 }); // breathing holes
  k.torus(0.67, 0.04, trim, 0, 0.3, 0, { rx: PI / 2, seg: 16 });
  if (hallow) {
    for (const s of [-1, 1]) k.tube([[s * 0.55, 1.1, 0], [s * 0.95, 1.3, 0.05], [s * 1.1, 1.75, 0.15], [s * 0.95, 2.05, 0.3]], 0.1, 0x1a1a1a, { r2: 0.02 });
    k.cyl(0.05, 0.4, fire, 0, 1.75, 0, { r2: 0.0, seg: 6 }); // little flame on top
    k.ball(0.09, fire, 0, 1.6, 0, { seg: 6, rows: 4 });
  } else {
    k.box(0.1, 0.25, 1.1, trim, 0, 1.55, -0.05, { r: 0.04 }); // crest
    for (const [x, y] of [[0.4, 1.0], [-0.35, 0.6]]) k.ball(0.08, 0x7a4a24, x, y, 0.55, { sz: 0.4, seg: 6, rows: 4 }); // rust
  }
}

/** Armour on the arm: a cuff at the elbow and a gauntlet over the hand. */
function gauntlet(k, L, side) {
  const plate = L.knight === 'hallow' ? 0x24262a : 0x6b6a58;
  k.cyl(0.2, 0.35, plate, 0, -1.05, 0, { seg: 10, r2: 0.18 });
  k.cyl(0.18, 0.4, plate, 0, -1.85, 0, { seg: 10, r2: 0.22 });
  k.box(0.36, 0.08, 0.2, tone(plate, 1.3), side * 0.0, -1.68, 0, { r: 0.03 });
}

/** Armour on the leg: a knee plate and a shin guard. */
function greave(k, L) {
  const plate = L.knight === 'hallow' ? 0x24262a : 0x6b6a58;
  k.ball(0.22, plate, 0, -1.05, 0.06, { sz: 0.8, seg: 10, rows: 6 });
  k.slab(0.36, 0.6, 0.12, plate, 0, -1.5, 0.12, { tw: 1.1, r: 0.03 });
}

/** The Haunted Knight's dented round shield, strapped to the forearm. */
function shield(k, h) {
  k.cyl(0.85, 0.12, 0x5a4a32, 0.32, -1.45, 0, { axis: 'x', seg: 18 });
  k.torus(0.85, 0.06, IRON, 0.39, -1.45, 0, { ry: PI / 2, seg: 18 });
  k.ball(0.18, IRON, 0.42, -1.45, 0, { sx: 0.5, seg: 10, rows: 6 }); // boss
  for (const a of [0.3, 1.9, 3.6, 5.0]) k.cyl(0.04, 0.05, IRON, 0.4, -1.45 + Math.sin(a) * 0.65, Math.cos(a) * 0.65, { axis: 'x', seg: 6 }); // rivets
  k.box(0.05, 0.7, 0.07, glowMat(h, 0x76ff03, 0.6), 0.4, -1.3, 0.2, { rx: 0.5 }); // a glowing claw mark
}

/** A sword pointing down the arm (along -y). Returns the y of its tip. */
function sword(k, len, w, steel, edge, grip) {
  k.cyl(0.07, 0.4, grip, 0, 0.02, 0, { seg: 8 }); // grip
  k.ball(0.1, IRON, 0, 0.26, 0, { seg: 8, rows: 6 }); // pommel
  k.box(0.8, 0.1, 0.16, IRON, 0, -0.22, 0, { r: 0.03 }); // crossguard
  for (const s of [-1, 1]) k.ball(0.07, IRON, s * 0.42, -0.22, 0, { seg: 6, rows: 4 });
  const y0 = -0.28;
  k.prism([[-w / 2, 0], [w / 2, 0], [w / 2, -len + w], [0, -len], [-w / 2, -len + w]], 0.06, steel, 0, y0, 0, { ry: PI / 2 }); // blade (flat across z)
  k.box(0.06, len - w, 0.08, edge, 0, y0 - (len - w) / 2, 0); // glowing fuller down the middle
  return y0 - len;
}

/** A huge femur used as a club. Returns the y of its far end. */
function femurClub(k, B, dim) {
  k.cyl(0.18, 2.2, B, 0, -1.05, 0, { r2: 0.15, seg: 10 });
  for (const s of [-1, 1]) k.ball(0.28, B, s * 0.16, -2.25, 0, { seg: 10, rows: 7 });
  k.ball(0.22, dim, 0, 0.1, 0, { seg: 8, rows: 6 });
  k.cyl(0.2, 0.3, LEATHER, 0, -0.15, 0, { seg: 10 }); // grip wrap
  for (const [y, rz] of [[-0.9, 0.5], [-1.5, -0.4]]) k.box(0.03, 0.3, 0.03, SOCKET, 0.17, y, 0.05, { rz }); // cracks
  return -2.4;
}

/** The Giant Cursed Skeleton's club: dark wood, iron bands, spikes and purple glow. */
function cursedClub(k, B, h) {
  const glowP = glowMat(h, 0x7c4dff, 0.9);
  k.cyl(0.14, 2.3, 0x2b1d33, 0, -1.1, 0, { r2: 0.34, seg: 10 });
  k.cyl(0.18, 0.35, LEATHER, 0, -0.1, 0, { seg: 10 });
  for (const y of [-1.3, -1.95]) k.torus(0.3 - y * 0.02, 0.05, IRON, 0, y, 0, { rx: PI / 2, seg: 14 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2;
    k.cyl(0.08, 0.35, B, Math.cos(a) * 0.3, -1.65 - (i % 2) * 0.45, Math.sin(a) * 0.3, { r2: 0.0, seg: 5, rz: -Math.cos(a) * 1.4, rx: Math.sin(a) * 1.4 });
  }
  for (const [y, a] of [[-1.0, 0.4], [-1.6, 2.5], [-2.05, 4.4]]) k.box(0.06, 0.4, 0.06, glowP, Math.cos(a) * 0.28, y, Math.sin(a) * 0.28); // glowing runes
  k.ball(0.22, glowP, 0, -2.3, 0, { seg: 10, rows: 7 });
  return -2.4;
}

/** A purple ghost-wisp floating over the shoulder (a see-through glowing flame). */
function wisp(h, color) {
  const m = glowMat(h, color, 1.0);
  m.transparent = true;
  m.opacity = 0.6;
  m.depthWrite = false;
  m.userData.keepOpacity = 0.6;
  const k = kit(h, h.upper, `undead:wisp:${color}`);
  k.cyl(0.18, 0.6, m, 0.85, 4.65, -0.2, { r2: 0.0, seg: 8 });
  k.ball(0.2, m, 0.85, 4.35, -0.2, { seg: 8, rows: 6 });
  k.cyl(0.12, 0.4, m, -0.75, 4.5, -0.3, { r2: 0.0, seg: 8 });
  k.ball(0.13, m, -0.75, 4.3, -0.3, { seg: 8, rows: 6 });
  k.done();
}

/** The Hallow Knight's tattered black cape with an orange lining, from the shoulders. */
function cape(h) {
  const k = kit(h, h.upper, 'undead:hallowcape');
  k.slab(2.0, 3.0, 0.08, 0x141414, 0, 2.6, -0.72, { bw: 1.25, bz: -0.25 });
  k.slab(1.9, 2.9, 0.04, 0x8a3d00, 0, 2.62, -0.66, { bw: 1.25, bz: -0.25 });
  for (let i = 0; i < 5; i++) k.box(0.4, 0.35, 0.08, 0x141414, -1.0 + i * 0.5, 0.98 + (i % 2) * 0.12, -0.98, { rz: (i - 2) * 0.15 }); // torn hem
  for (const s of [-1, 1]) k.cyl(0.14, 0.1, 0xb36a10, s * 0.8, 4.0, 0.15, { axis: 'z', seg: 10 }); // clasps
  k.done();
}
