import * as THREE from 'three';
import { boxGeo, part, makeHumanoid, makeThing, glow, setMuzzle } from '../models.js';

// Wave 9 tower models (set G): a cartoon crew of ghosts, dogs, blobs and snack creatures.
// Tower makers take a level index 0-4; characters face +Z (their right side is -X).

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

/**
 * A humanoid-shaped rig with empty groups where makeHumanoid has meshes (torso, head, arms,
 * legs), so creatures can build their own shapes but still get the view's arm animation.
 */
function rig() {
  const u = makeThing();
  u.static = false;
  const g = (x, y, z) => {
    const o = new THREE.Group();
    o.position.set(x, y, z);
    u.body.add(o);
    return o;
  };
  u.torso = g(0, 3, 0);
  u.head = g(0, 4, 0);
  u.rightArm = g(-1.5, 4, 0);
  u.leftArm = g(1.5, 4, 0);
  u.rightLeg = g(-0.5, 2, 0);
  u.leftLeg = g(0.5, 2, 0);
  u.pose = { right: 0, left: 0, leftRecoil: 0 };
  u.muzzles = [];
  return u;
}

/** Sets both arms' rest rotation and the matching view pose. */
function pose(h, right, left, rz = 0.1, lz = -0.1, leftRecoil = 0) {
  h.rightArm.rotation.set(right, 0, rz);
  h.leftArm.rotation.set(left, 0, lz);
  h.pose = { right, left, leftRecoil };
}

/** A group at the end of an arm. With `upright` = the arm's x rotation, the group stays level. */
function hand(arm, y = -1.9, upright = null) {
  const g = new THREE.Group();
  g.position.set(0, y, 0);
  if (upright != null) g.rotation.x = -upright;
  arm.add(g);
  return g;
}

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

/** See-through glowing material that stays see-through when the tower fades. */
function ghostMat(h, color, op, intensity = 0.5) {
  const m = glow(h, color);
  m.emissiveIntensity = intensity;
  m.transparent = true;
  m.opacity = op;
  m.depthWrite = false;
  m.userData.keepOpacity = op;
  return m;
}

/** A "%" mark built from boxes, on the +Z face of `parent` at (x, y, z). */
function percent(parent, mat, x, y, z, s = 1) {
  part(parent, boxGeo(0.22 * s, 0.22 * s, 0.06), mat, x - 0.24 * s, y + 0.24 * s, z);
  part(parent, boxGeo(0.22 * s, 0.22 * s, 0.06), mat, x + 0.24 * s, y - 0.24 * s, z);
  part(parent, boxGeo(0.12 * s, 0.95 * s, 0.06), mat, x, y, z).rotation.z = -0.65;
}

/** A balloon on a string: the string runs from `from` up to the balloon's knot. */
function balloon(h, parent, color, from, at, size = 1) {
  const { M } = h;
  const [x, y, z] = at;
  const mat = M(color);
  blob(parent, 0.9 * size, 1.1 * size, 0.9 * size, mat, x, y, z, 0.22 * size);
  part(parent, boxGeo(0.2 * size, 0.18 * size, 0.2 * size), mat, x, y - 0.62 * size, z); // knot
  part(parent, boxGeo(0.14 * size, 0.3 * size, 0.06), M(0xffffff), x - 0.22 * size, y + 0.2 * size, z + 0.46 * size); // shine
  stick(parent, M(0xeeeeee), from, [x, y - 0.7 * size, z], 0.04);
}

/** Headphones over a head whose top is at `top`, cups at +-x. */
function headphones(h, parent, x, top, cupY, cupColor = 0x212121, cupSize = 0.7) {
  const band = h.M(0x212121);
  part(parent, boxGeo(x * 2 + 0.2, 0.2, 0.3), band, 0, top + 0.1, 0);
  for (const s of [-1, 1]) {
    part(parent, boxGeo(0.2, top - cupY, 0.3), band, s * x, (top + cupY) / 2, 0);
    part(parent, boxGeo(0.4, cupSize, cupSize), h.M(cupColor), s * (x + 0.05), cupY, 0);
  }
}

/** Replaces makeHumanoid's textured face with a plain head (for faces built from boxes). */
function plainHead(h, color) {
  h.head.children[0].material = h.M(color);
}

// ---------------------------------------------------------------------------------------------
// 1. Specter: a sheet ghost rocking out on an electric guitar (support).
// ---------------------------------------------------------------------------------------------

function commanderSpecter(level) {
  const h = rig();
  const { M } = h;
  const sheet = M(0xf7f7f7);
  const shade = M(0xdedede);
  const ink = M(0x1a1a1a);
  // Sheet body: one tall rounded lump (torso group at y 3)
  blob(h.torso, 2.4, 3.0, 2.0, sheet, 0, 0.6, 0, 0.35);
  // Jagged hem
  for (let i = 0; i < 5; i++) {
    const len = i % 2 ? 0.45 : 0.8;
    part(h.torso, boxGeo(0.46, len, 1.8 - (i % 2) * 0.2), i % 2 ? shade : sheet, -0.96 + i * 0.48, -0.9 - len / 2, 0);
  }
  // Squeezed-shut "> <" eyes, a little open mouth and blush
  for (const s of [-1, 1]) {
    // viewer's left (-X) gets ">", viewer's right (+X) gets "<"
    part(h.torso, boxGeo(0.45, 0.12, 0.06), ink, s * 0.45, 1.3, 1.01).rotation.z = 0.5 * s;
    part(h.torso, boxGeo(0.45, 0.12, 0.06), ink, s * 0.45, 1.1, 1.01).rotation.z = -0.5 * s;
    part(h.torso, boxGeo(0.35, 0.15, 0.05), M(0xffb3c6), s * 0.75, 0.85, 1.0);
  }
  part(h.torso, boxGeo(0.4, 0.28, 0.06), ink, 0, 0.75, 1.01);
  // Big black headphones
  headphones(h, h.torso, 1.25, 2.05, 1.25, 0x111111, 0.85);
  // Guitar held across the front, neck up to his left
  const guitar = new THREE.Group();
  guitar.position.set(-0.1, 2.75, 1.4);
  guitar.rotation.z = -0.6;
  h.body.add(guitar);
  const gBody = M(level >= 3 ? 0x111111 : 0xd32f2f);
  part(guitar, boxGeo(1.3, 0.9, 0.35), gBody, 0, -0.1, 0);
  part(guitar, boxGeo(1.55, 0.55, 0.35), gBody, 0.05, -0.55, 0);
  part(guitar, boxGeo(0.5, 0.35, 0.3), gBody, -0.45, 0.4, 0); // horn
  part(guitar, boxGeo(0.7, 0.14, 0.1), M(0xfafafa), 0, -0.2, 0.2); // pickguard bits
  part(guitar, boxGeo(0.7, 0.14, 0.1), M(0x9e9e9e), 0, -0.5, 0.2); // bridge
  part(guitar, boxGeo(0.26, 2.0, 0.2), M(0x6d4c41), 0, 1.25, 0); // neck
  part(guitar, boxGeo(0.42, 0.5, 0.2), M(0x3e2723), 0, 2.45, 0); // headstock
  const strings = level >= 3 ? glow(h, 0x40c4ff) : M(0xcfd8dc);
  for (const x of [-0.07, 0.07]) part(guitar, boxGeo(0.04, 2.6, 0.04), strings, x, 0.85, 0.2);
  if (level >= 3) {
    // Flame decals
    const fl = [M(0xff6d00), M(0xffd600)];
    for (let i = 0; i < 4; i++) {
      const f = part(guitar, boxGeo(0.18, 0.5 + (i % 2) * 0.2, 0.05), fl[i % 2], -0.55 + i * 0.25, -0.5 + (i % 2) * 0.1, 0.19);
      f.rotation.z = 0.25;
    }
    part(guitar, boxGeo(1.1, 0.16, 0.05), fl[0], 0, -0.82, 0.19);
  }
  // Round floating hands: strumming hand by the body, fretting hand up the neck
  h.rightArm.position.set(-0.45, 2.55, 1.75);
  h.leftArm.position.set(0.75, 3.95, 1.65);
  for (const arm of [h.rightArm, h.leftArm]) blob(arm, 0.6, 0.55, 0.55, sheet, 0, 0, 0, 0.15);
  pose(h, 0, 0, 0, 0);
  // Amps, then an amp stack, then a stage
  const cab = M(0x1c1c1c);
  const grille = M(0x424242);
  const knob = M(0xffd54f);
  if (level === 1) {
    part(h.root, boxGeo(1.1, 1.0, 0.8), cab, 1.85, 0.5, -0.2);
    part(h.root, boxGeo(0.85, 0.6, 0.05), grille, 1.85, 0.45, 0.22);
    part(h.root, boxGeo(0.8, 0.1, 0.05), knob, 1.85, 0.88, 0.22);
  } else if (level >= 2) {
    const sx = level >= 4 ? [-1, 1] : [1];
    const y0 = level >= 4 ? 0.4 : 0;
    for (const s of sx) {
      const x = s * 1.9;
      for (let i = 0; i < 2; i++) {
        part(h.root, boxGeo(1.3, 1.15, 0.9), cab, x, y0 + 0.58 + i * 1.18, -0.6);
        part(h.root, boxGeo(1.05, 0.9, 0.05), grille, x, y0 + 0.58 + i * 1.18, -0.13);
      }
      part(h.root, boxGeo(1.35, 0.5, 0.9), cab, x, y0 + 2.6, -0.6); // amp head
      part(h.root, boxGeo(1.0, 0.1, 0.05), level >= 4 ? glow(h, 0xffd54f) : knob, x, y0 + 2.65, -0.13);
    }
  }
  if (level >= 4) {
    // A little stage with spotlights
    part(h.root, boxGeo(4.4, 0.4, 3.6), M(0x4e342e), 0, 0.2, 0);
    part(h.root, boxGeo(4.45, 0.12, 0.2), glow(h, 0xe040fb), 0, 0.3, 1.72);
    for (const s of [-1, 1]) {
      const x = s * 1.9;
      stick(h.root, M(0x212121), [x, 0.4, 1.5], [x, 3.6, 1.5], 0.15);
      const lamp = new THREE.Group();
      lamp.position.set(x, 3.7, 1.5);
      lamp.rotation.set(0.5, 0, -s * 0.6);
      h.root.add(lamp);
      part(lamp, boxGeo(0.5, 0.6, 0.5), M(0x37474f), 0, 0, 0);
      part(lamp, boxGeo(0.4, 0.06, 0.4), glow(h, 0xfff59d), 0, -0.32, 0);
      part(lamp, boxGeo(0.7, 2.4, 0.7), ghostMat(h, 0xfff59d, 0.18), 0, -1.55, 0); // light beam
    }
  }
  h.lift = level >= 4 ? 0.8 : 0.4;
  h.bob = 0.2;
  h.body.scale.setScalar(0.95);
  return h;
}

// ---------------------------------------------------------------------------------------------
// 2. Discount Dog: a floppy-eared dog with sale signs (support: cheaper upgrades).
// ---------------------------------------------------------------------------------------------

function saleSign(h, parent, color, x, y, z, w = 1.6, ht = 1.15) {
  const { M } = h;
  part(parent, boxGeo(w, ht, 0.12), M(color), x, y, z);
  part(parent, boxGeo(w + 0.1, 0.1, 0.14), M(0x5d4037), x, y + ht / 2, z);
  percent(parent, M(0x212121), x, y, z + 0.08, ht * 0.8);
}

function djDiscount(level) {
  const h = rig();
  const { M } = h;
  const fur = M(0x9c8a74);
  const light = M(0xd7c7ae);
  const dark = M(0x6d5d4b);
  const ink = M(0x1a1a1a);
  const col = [0, 0xfdd835, 0xff9800, 0xff9800, 0xe53935][level];
  const cloth = level >= 1 ? M(col) : null;
  // Body and limbs
  part(h.torso, boxGeo(1.8, 1.9, 1.1), fur, 0, -0.05, 0);
  part(h.torso, boxGeo(1.0, 1.1, 0.06), light, 0, -0.3, 0.56); // belly
  if (cloth) {
    part(h.torso, boxGeo(1.9, 1.45, 1.2), cloth, 0, -0.2, 0); // shirt / jacket
    if (level >= 4) {
      part(h.torso, boxGeo(0.1, 1.45, 0.06), M(0xcfd8dc), 0, -0.2, 0.62); // zipper
      part(h.torso, boxGeo(0.2, 0.25, 0.08), M(0xcfd8dc), 0, 0.4, 0.63);
    }
  }
  h.rightArm.position.x = -1.3;
  h.leftArm.position.x = 1.3;
  for (const arm of [h.rightArm, h.leftArm]) {
    part(arm, boxGeo(0.7, 1.75, 0.75), level >= 4 ? cloth : fur, 0, -0.85, 0);
    part(arm, boxGeo(0.75, 0.45, 0.8), light, 0, -1.8, 0);
  }
  for (const leg of [h.rightLeg, h.leftLeg]) {
    part(leg, boxGeo(0.8, 1.8, 0.85), fur, 0, -0.9, 0);
    part(leg, boxGeo(0.85, 0.4, 1.15), light, 0, -1.8, 0.12);
  }
  part(h.torso, boxGeo(0.25, 0.25, 0.8), fur, 0, -0.7, -0.85).rotation.x = -0.7; // tail
  // Head
  blob(h.head, 1.5, 1.3, 1.3, fur, 0, 0.7, 0, 0.2);
  part(h.head, boxGeo(0.85, 0.55, 0.5), light, 0, 0.42, 0.85); // snout
  part(h.head, boxGeo(0.38, 0.24, 0.15), ink, 0, 0.66, 1.12); // nose
  part(h.head, boxGeo(0.4, 0.08, 0.05), ink, 0, 0.25, 1.11); // mouth
  part(h.head, boxGeo(0.22, 0.14, 0.05), M(0xf48fb1), 0.08, 0.17, 1.1); // tongue
  for (const s of [-1, 1]) {
    part(h.head, boxGeo(0.22, 0.28, 0.05), ink, s * 0.36, 0.95, 0.66);
    part(h.head, boxGeo(0.08, 0.08, 0.05), M(0xffffff), s * 0.36 - 0.05, 1.03, 0.69);
    const ear = part(h.head, boxGeo(0.35, 1.15, 0.7), dark, s * 0.86, 0.55, -0.05); // floppy ears
    ear.rotation.z = s * 0.18;
  }
  // Lime bandana
  const lime = M(0xaeea00);
  part(h.torso, boxGeo(1.6, 0.3, 1.25), lime, 0, 0.92, 0);
  part(h.torso, boxGeo(0.62, 0.62, 0.08), lime, 0, 0.62, 0.63).rotation.z = Math.PI / 4;
  // Headwear: headband, then cap, then a hood
  if (level === 1) part(h.head, boxGeo(1.58, 0.22, 1.38), cloth, 0, 1.1, 0);
  if (level === 2 || level === 3) {
    part(h.head, boxGeo(1.58, 0.42, 1.4), cloth, 0, 1.42, 0);
    part(h.head, boxGeo(1.5, 0.1, 0.65), cloth, 0, 1.24, 0.92);
    part(h.head, boxGeo(0.25, 0.25, 0.05), M(0xffffff), 0, 1.45, 0.72);
  }
  if (level >= 4) {
    part(h.head, boxGeo(1.75, 0.3, 1.55), cloth, 0, 1.45, -0.05); // hood top
    part(h.head, boxGeo(1.75, 1.5, 0.3), cloth, 0, 0.75, -0.75); // hood back
    part(h.head, boxGeo(1.8, 0.2, 0.2), M(0xb71c1c), 0, 1.45, 0.7); // hood rim
  }
  // Signs and megaphones
  const signArm = -0.5;
  if (level >= 1) {
    const sh = hand(h.leftArm, -1.9, signArm);
    part(sh, boxGeo(0.14, 2.6, 0.14), M(0x8d6e63), 0, 1.0, 0.05);
    if (level >= 4) {
      // An arrow sign pointing down at the sign on the ground
      const arrow = new THREE.Group();
      arrow.position.set(0.3, 2.6, 0.1);
      arrow.rotation.z = -0.9;
      sh.add(arrow);
      part(arrow, boxGeo(1.5, 0.6, 0.12), cloth, 0, 0, 0);
      part(arrow, boxGeo(0.62, 0.62, 0.12), cloth, 0.75, 0, 0).rotation.z = Math.PI / 4;
      part(arrow, boxGeo(1.1, 0.12, 0.06), M(0xfafafa), -0.05, 0, 0.08);
    } else saleSign(h, sh, col, 0, 2.55, 0.1);
  }
  if (level >= 3) {
    // Second sign planted in the ground
    const x = 2.0;
    const z = level >= 4 ? 0.4 : -0.9;
    part(h.root, boxGeo(0.14, 1.6, 0.14), M(0x8d6e63), x, 0.8, z);
    saleSign(h, h.root, col, x, 1.9, z + 0.08, 1.3, 1.0);
  }
  const megaArm = -1.75;
  if (level >= 3) {
    const big = level >= 4;
    const mh = hand(h.rightArm, -1.7);
    part(mh, boxGeo(0.4, 0.5, 0.4), M(0x37474f), 0, 0, 0.35); // grip
    part(mh, boxGeo(0.5, 0.7, 0.5), M(big ? 0xc62828 : 0xfafafa), 0, -0.2, 0);
    part(mh, boxGeo(big ? 1.0 : 0.75, 0.6, big ? 1.0 : 0.75), M(big ? 0xe53935 : 0xeeeeee), 0, -0.75, 0);
    if (big) {
      part(mh, boxGeo(1.4, 0.4, 1.4), M(0xe53935), 0, -1.2, 0);
      part(mh, boxGeo(1.1, 0.06, 1.1), M(0x212121), 0, -1.42, 0);
    }
    pose(h, megaArm, signArm, 0.25, -0.15);
  } else if (level >= 1) pose(h, -0.25, signArm, 0.1, -0.15);
  else pose(h, -2.7, -0.2, 0.3, -0.1); // waving
  h.bob = 0.12;
  h.body.scale.setScalar(0.92);
  return h;
}

// ---------------------------------------------------------------------------------------------
// 3. Balloon Pal: machines8.js.
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// 4. Dumpster Child: a pink face in a trash can with a flaming lid (damage over time).
// ---------------------------------------------------------------------------------------------

function flamethrowerDumpster(level) {
  const u = makeThing();
  const { M } = u;
  const can = M(0x1e1e1e);
  const rib = M(0x333333);
  const toxic = level >= 4 ? 0xd500f9 : 0x76ff03;
  const ribGlow = level >= 3 ? glow(u, toxic) : null;
  // Ribbed trash can
  part(u.body, boxGeo(2.2, 0.2, 2.2), can, 0, 0.1, 0);
  part(u.body, boxGeo(2.4, 2.4, 2.4), can, 0, 1.3, 0);
  part(u.body, boxGeo(2.65, 0.28, 2.65), rib, 0, 2.5, 0); // rim
  for (let i = -2; i <= 2; i++) {
    const m = ribGlow && i % 2 === 0 ? ribGlow : rib;
    part(u.body, boxGeo(0.18, 2.2, 0.08), m, i * 0.48, 1.25, 1.23);
    part(u.body, boxGeo(0.18, 2.2, 0.08), m, i * 0.48, 1.25, -1.23);
    part(u.body, boxGeo(0.08, 2.2, 0.18), m, 1.23, 1.25, i * 0.48);
    part(u.body, boxGeo(0.08, 2.2, 0.18), m, -1.23, 1.25, i * 0.48);
  }
  if (level >= 3) part(u.body, boxGeo(2.35, 0.1, 2.35), glow(u, toxic), 0, 2.66, 0); // glow from inside
  if (level >= 1) {
    // Dents
    const dent = M(0x4a4a4a);
    part(u.body, boxGeo(0.6, 0.5, 0.06), dent, -0.6, 0.7, 1.26).rotation.z = 0.4;
    part(u.body, boxGeo(0.06, 0.5, 0.7), dent, 1.26, 1.7, -0.4).rotation.x = 0.5;
    part(u.body, boxGeo(0.4, 0.06, 0.4), M(0x2a2a2a), 1.1, 2.66, -0.95).rotation.z = 0.3; // bent rim
  }
  // Round pink face poking out of the top
  const pink = M(0xf8bbd0);
  blob(u.body, 1.7, 1.45, 1.5, pink, 0, 3.15, 0, 0.3);
  const ink = M(0x1a1a1a);
  for (const s of [-1, 1]) {
    part(u.body, boxGeo(0.22, 0.3, 0.05), ink, s * 0.36, 3.35, 0.76);
    part(u.body, boxGeo(0.08, 0.08, 0.05), M(0xffffff), s * 0.36 - 0.04, 3.43, 0.79);
    part(u.body, boxGeo(0.25, 0.12, 0.05), M(0xf06292), s * 0.6, 3.05, 0.76);
  }
  part(u.body, boxGeo(0.45, 0.18, 0.05), M(0x4a148c), 0, 2.95, 0.76); // grin
  // Tipped lid on his head, on fire
  const lid = new THREE.Group();
  lid.position.set(0.2, 4.0, -0.1);
  lid.rotation.set(-0.15, 0, -0.35);
  u.body.add(lid);
  part(lid, boxGeo(2.6, 0.22, 2.6), can, 0, 0, 0);
  part(lid, boxGeo(2.4, 0.1, 2.4), rib, 0, 0.15, 0);
  part(lid, boxGeo(0.9, 0.2, 0.25), rib, 0, 0.3, 0); // handle
  const flame = new THREE.Group();
  flame.position.set(0, 0.2, 0);
  flame.rotation.set(0.15, 0, 0.35); // stays upright
  lid.add(flame);
  const fs = [1, 1.35, 1.45, 1.55, 1.7][level];
  flame.scale.setScalar(fs);
  part(flame, boxGeo(1.4, 0.5, 1.4), glow(u, 0xff6d00), 0, 0.3, 0);
  part(flame, boxGeo(1.0, 0.7, 1.0), glow(u, level >= 4 ? 0xe040fb : 0xffab00), 0.1, 0.85, -0.05);
  part(flame, boxGeo(0.5, 0.6, 0.5), glow(u, level >= 4 ? 0xea80fc : 0xffea00), -0.05, 1.45, 0.05);
  part(flame, boxGeo(0.35, 0.5, 0.35), glow(u, 0xff3d00), 0.5, 0.75, 0.4);
  part(flame, boxGeo(0.3, 0.4, 0.3), glow(u, 0xff3d00), -0.5, 0.65, -0.45);
  if (level >= 2) {
    // Garbage bags piled around
    const bag = [M(0x263238), M(0x2e3b2e)];
    for (const [x, z, s] of [[-1.85, 0.9, 1], [-1.75, -1.0, 0.9], [1.8, 1.0, 0.8]]) {
      blob(u.root, 1.1 * s, 1.0 * s, 1.0 * s, bag[(x > 0) | 0], x, 0.5 * s, z, 0.25);
      part(u.root, boxGeo(0.25, 0.3, 0.25), bag[(x > 0) | 0], x, 1.05 * s, z);
    }
  }
  if (level >= 3) {
    // Toxic drum
    const drum = new THREE.Group();
    drum.position.set(1.85, 0, -1.3);
    u.root.add(drum);
    part(drum, boxGeo(0.95, 1.4, 0.95), M(0xfbc02d), 0, 0.7, 0);
    for (const y of [0.35, 1.05]) part(drum, boxGeo(1.0, 0.1, 1.0), M(0x5d4037), 0, y, 0);
    part(drum, boxGeo(0.8, 0.08, 0.8), glow(u, toxic), 0, 1.44, 0);
    part(drum, boxGeo(0.35, 0.35, 0.05), M(0x212121), 0, 0.7, 0.49).rotation.z = Math.PI / 4;
  }
  if (level >= 4) {
    // The hidden eye on the can, and a sludge puddle
    part(u.body, boxGeo(0.95, 0.6, 0.06), M(0xf3e5f5), 0, 1.35, 1.3);
    part(u.body, boxGeo(0.4, 0.45, 0.06), glow(u, 0xd500f9), 0, 1.35, 1.33);
    part(u.body, boxGeo(0.16, 0.3, 0.05), M(0x000000), 0, 1.35, 1.37);
    const sludge = glow(u, 0x9c27b0);
    sludge.emissiveIntensity = 0.4;
    part(u.root, boxGeo(3.6, 0.06, 1.2), sludge, -0.2, 0.03, 1.6);
    part(u.root, boxGeo(1.4, 0.06, 1.6), sludge, -1.4, 0.03, 0.9);
    part(u.root, boxGeo(1.0, 0.06, 0.8), M(0x76ff03), 0.6, 0.05, 1.9);
  }
  u.muzzles = [];
  setMuzzle(u, u.body, 0, 3.1, 1.0);
  u.tracer = level >= 4 ? 0xe040fb : 0xff9100;
  u.bob = 0.05;
  return u;
}

// ---------------------------------------------------------------------------------------------
// 5. Wafer: a gingerbread fighter who throws ornaments (and bonks up close).
// ---------------------------------------------------------------------------------------------

const ORN = [0xe53935, 0x43a047, 0xfdd835, 0x1e88e5];

function ornament(h, parent, color, x, y, z, s = 0.5, glowing = false) {
  const m = glowing ? glow(h, color) : h.M(color);
  blob(parent, s, s, s, m, x, y, z, s * 0.2);
  part(parent, boxGeo(s * 0.35, s * 0.25, s * 0.35), h.M(0xffd54f), x, y + s * 0.6, z);
}

function warlockWafer(level) {
  const ginger = 0xe8a46a;
  const h = makeHumanoid({ skin: ginger, shirt: ginger, pants: ginger, arms: ginger });
  const { M } = h;
  plainHead(h, ginger);
  const skin = M(ginger);
  const icing = M(0xfffaf0);
  const ink = M(0x3e2723);
  // Rounded head, light swoop of hair, freckles, smile
  part(h.head, boxGeo(1.4, 0.95, 1.0), skin, 0, 0.6, 0);
  part(h.head, boxGeo(1.0, 1.4, 1.0), skin, 0, 0.6, 0);
  part(h.head, boxGeo(1.25, 0.28, 1.25), M(0xffcc80), 0, 1.28, 0);
  part(h.head, boxGeo(0.7, 0.22, 0.4), M(0xffcc80), 0.25, 1.33, 0.5).rotation.z = -0.3; // swoop
  for (const s of [-1, 1]) {
    part(h.head, boxGeo(0.18, 0.24, 0.05), ink, s * 0.27, 0.78, 0.62);
    for (const [fx, fy] of [[0.4, 0.55], [0.52, 0.47], [0.3, 0.45]]) part(h.head, boxGeo(0.07, 0.07, 0.04), M(0xa0522d), s * fx, fy, 0.62);
  }
  part(h.head, boxGeo(0.45, 0.08, 0.05), ink, 0, 0.32, 0.62);
  for (const s of [-1, 1]) part(h.head, boxGeo(0.1, 0.1, 0.05), ink, s * 0.26, 0.37, 0.62);
  // Icing trim and gumdrop buttons
  for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.04, 0.12, 1.04), icing, 0, -1.6, 0);
  for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.04, 0.12, 1.04), icing, 0, -1.6, 0);
  for (let i = 0; i < 5; i++) part(h.torso, boxGeo(0.35, 0.1, 0.05), icing, -0.7 + i * 0.35, 0.85 - (i % 2) * 0.12, 0.52).rotation.z = i % 2 ? -0.5 : 0.5;
  for (const [y, c] of [[0.3, 0xe53935], [-0.3, 0x43a047]]) part(h.torso, boxGeo(0.25, 0.25, 0.1), M(c), 0, y, 0.53);
  // Small red backpack
  part(h.torso, boxGeo(1.3, 1.3, 0.55), M(0xc62828), 0, 0, -0.75);
  part(h.torso, boxGeo(1.0, 0.3, 0.1), M(0xb71c1c), 0, -0.3, -1.05);
  if (level >= 1) {
    // Candy cane bat on the back
    const cane = new THREE.Group();
    cane.position.set(0.3, 0.3, -1.15);
    cane.rotation.z = -0.5;
    h.torso.add(cane);
    for (let i = 0; i < 6; i++) part(cane, boxGeo(0.3, 0.42, 0.3), M(i % 2 ? 0xfafafa : 0xe53935), 0, -1.0 + i * 0.4, 0);
    part(cane, boxGeo(0.6, 0.3, 0.3), M(0xe53935), -0.15, 1.35, 0);
    part(cane, boxGeo(0.3, 0.4, 0.3), M(0xfafafa), -0.45, 1.1, 0);
  }
  if (level >= 2) {
    // Ornament bandolier
    part(h.torso, boxGeo(0.3, 2.5, 1.12), M(0x6d4c41), 0, 0, 0).rotation.z = 0.7;
    for (let i = 0; i < 4; i++) {
      const t = -0.75 + i * 0.5;
      ornament(h, h.torso, ORN[i], t * 0.75, t * -0.8, 0.68, 0.32);
    }
  }
  if (level >= 3) {
    // Gumdrop shoulder armor
    for (const [arm, c] of [[h.rightArm, 0x43a047], [h.leftArm, 0xe53935]]) {
      part(arm, boxGeo(1.25, 0.45, 1.25), M(c), 0, 0.05, 0);
      part(arm, boxGeo(0.85, 0.3, 0.85), M(c), 0, 0.4, 0);
      part(arm, boxGeo(0.4, 0.15, 0.4), M(0xffffff), 0, 0.6, 0);
    }
  }
  if (level >= 4) {
    // Sack of glowing ornaments on the ground, peppermint shield
    const sack = M(0x8d6e63);
    blob(h.root, 1.4, 1.3, 1.2, sack, 1.95, 0.65, -0.8, 0.3);
    part(h.root, boxGeo(0.5, 0.35, 0.5), sack, 1.95, 1.45, -0.8);
    for (let i = 0; i < 4; i++) ornament(h, h.root, ORN[i], 1.6 + (i % 2) * 0.6, 1.5 + (i >> 1) * 0.25, -0.5 - (i >> 1) * 0.4, 0.38, true);
    const sh = hand(h.leftArm, -1.6, -0.9);
    sh.position.z = 0.4;
    const mint = new THREE.Group();
    mint.position.set(0, 0, 0.55);
    sh.add(mint);
    blob(mint, 1.7, 1.7, 0.2, M(0xfafafa), 0, 0, 0, 0.4);
    for (let i = 0; i < 4; i++) part(mint, boxGeo(0.32, 1.3, 0.06), M(0xe53935), 0, 0, 0.11).rotation.z = (i * Math.PI) / 4;
    part(mint, boxGeo(0.4, 0.4, 0.08), M(0xfafafa), 0, 0, 0.14);
  }
  // Ornament in the throwing hand
  const th = hand(h.rightArm, -2.1);
  ornament(h, th, level >= 4 ? 0xffd740 : 0xe53935, 0, -0.25, 0, 0.55, level >= 4);
  setMuzzle(h, th, 0, -0.3, 0);
  pose(h, -2.7, level >= 4 ? -0.9 : -0.8, 0.2, -0.3);
  h.swing = 1.9;
  h.projectile = { color: level >= 4 ? 0xffd740 : 0xe53935, size: 0.9 + level * 0.06 };
  h.tracer = 0xffd740;
  return h;
}

// ---------------------------------------------------------------------------------------------
// 6. Lure: a see-through ghost cat rising from a clay pot (long bursts).
// ---------------------------------------------------------------------------------------------

function wisp(h, parent, mat, x, y, z, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  parent.add(g);
  blob(g, 0.8, 0.8, 0.7, mat, 0, 0, 0, 0.2);
  part(g, boxGeo(0.4, 0.5, 0.4), mat, 0.1, -0.55, -0.1).rotation.z = 0.4;
  for (const sx of [-1, 1]) part(g, boxGeo(0.1, 0.15, 0.05), h.M(0x004d40), sx * 0.15, 0.08, 0.36);
  return g;
}

function ghostbusterLure(level) {
  const h = rig();
  const { M } = h;
  const mint = 0xa7ffeb;
  const bright = level >= 4;
  const cat = ghostMat(h, mint, bright ? 0.78 : 0.62, bright ? 0.85 : 0.5);
  const ink = M(0x00695c);
  // Clay pot (on the root, so it doesn't float)
  const pot = new THREE.Group();
  pot.scale.setScalar([1, 1.15, 1.15, 1.2, 1.25][level]);
  h.root.add(pot);
  const clay = M(0x1f4d33);
  const clayD = M(0x173a26);
  part(pot, boxGeo(1.6, 0.3, 1.6), clayD, 0, 0.15, 0);
  blob(pot, 2.2, 1.5, 2.2, clay, 0, 1.0, 0, 0.3);
  part(pot, boxGeo(2.5, 0.3, 2.5), clayD, 0, 1.85, 0);
  part(pot, boxGeo(2.1, 0.06, 2.1), glow(h, level >= 1 ? 0x64ffda : 0x1de9b6), 0, 2.0, 0);
  if (level >= 1) {
    // A glowing crack
    const crack = glow(h, 0x64ffda);
    part(pot, boxGeo(0.08, 0.5, 0.06), crack, -0.5, 1.4, 1.11).rotation.z = 0.4;
    part(pot, boxGeo(0.08, 0.45, 0.06), crack, -0.35, 1.0, 1.11).rotation.z = -0.5;
    part(pot, boxGeo(0.08, 0.35, 0.06), crack, -0.45, 0.65, 1.11).rotation.z = 0.3;
  }
  if (level >= 2) {
    // Runes around the pot
    const rune = glow(h, 0x1de9b6);
    for (const [rx, rz, ry] of [[0.45, 1.11, 0], [1.11, 0, Math.PI / 2], [-1.11, 0, Math.PI / 2], [0, -1.11, 0]]) {
      const g = new THREE.Group();
      g.position.set(rx, 1.05, rz);
      g.rotation.y = ry;
      pot.add(g);
      part(g, boxGeo(0.07, 0.5, 0.05), rune, 0, 0, 0);
      part(g, boxGeo(0.3, 0.07, 0.05), rune, 0.1, 0.12, 0).rotation.z = 0.5;
      part(g, boxGeo(0.25, 0.07, 0.05), rune, -0.08, -0.15, 0).rotation.z = -0.5;
    }
  }
  // The ghost cat: a wispy tail column, body, head with pointed ears
  const ps = pot.scale.x;
  const base = 1.9 * ps;
  part(h.body, boxGeo(1.0, 0.8, 0.9), cat, 0, base + 0.2, 0);
  part(h.body, boxGeo(1.4, 1.2, 1.15), cat, 0, base + 1.1, 0);
  blob(h.body, 1.75, 1.35, 1.4, cat, 0, base + 2.35, 0, 0.3);
  for (const s of [-1, 1]) {
    part(h.body, boxGeo(0.5, 0.6, 0.3), cat, s * 0.55, base + 3.15, -0.1).rotation.z = -s * 0.35;
    part(h.body, boxGeo(0.25, 0.3, 0.06), glow(h, 0xf8bbd0), s * 0.53, base + 3.1, 0.07).rotation.z = -s * 0.35;
    part(h.body, boxGeo(0.2, 0.32, 0.05), ink, s * 0.36, base + 2.5, 0.71);
    for (const wy of [0.05, -0.12]) part(h.body, boxGeo(0.65, 0.04, 0.04), ink, s * 0.8, base + 2.25 + wy, 0.66).rotation.z = s * wy * 2;
    part(h.body, boxGeo(0.22, 0.07, 0.05), ink, s * 0.11, base + 2.06, 0.71).rotation.z = -s * 0.45; // "w" smile
  }
  part(h.body, boxGeo(0.18, 0.12, 0.05), M(0xf48fb1), 0, base + 2.24, 0.72);
  // Curly tail
  part(h.body, boxGeo(0.3, 0.9, 0.3), cat, 0.6, base + 0.9, -0.75).rotation.z = -0.5;
  part(h.body, boxGeo(0.3, 0.6, 0.3), cat, 0.95, base + 1.5, -0.8).rotation.z = 0.4;
  // Paws: right one raised
  h.rightArm.position.set(-0.85, base + 1.5, 0.25);
  h.leftArm.position.set(0.85, base + 1.4, 0.25);
  for (const arm of [h.rightArm, h.leftArm]) blob(arm, 0.42, 0.75, 0.42, cat, 0, -0.35, 0, 0.1);
  pose(h, -2.3, -0.5, 0.15, -0.2);
  if (level >= 3) {
    const wm = ghostMat(h, 0xb9f6ca, 0.55, 0.7);
    wisp(h, h.body, wm, -1.9, base + 2.4, -0.4, 0.9);
    wisp(h, h.body, wm, 1.9, base + 2.0, -0.2, 0.8);
    if (level >= 4) wisp(h, h.body, wm, 1.4, base + 3.6, -1.0, 0.7);
  }
  if (level >= 4) {
    // A lantern on a little post
    part(h.root, boxGeo(0.15, 2.6, 0.15), M(0x3e2723), -1.9, 1.3, 1.3);
    part(h.root, boxGeo(0.7, 0.12, 0.15), M(0x3e2723), -1.65, 2.55, 1.3);
    part(h.root, boxGeo(0.55, 0.65, 0.55), M(0x263238), -1.4, 2.1, 1.3);
    part(h.root, boxGeo(0.4, 0.45, 0.6), glow(h, 0x64ffda), -1.4, 2.1, 1.3);
    part(h.root, boxGeo(0.6, 0.1, 0.6), M(0x263238), -1.4, 2.45, 1.3);
  }
  setMuzzle(h, h.body, 0, base + 2.15, 0.85);
  h.tracer = bright ? 0xa7ffeb : 0x64ffda;
  h.beam = h.tracer;
  h.bob = 0.2;
  return h;
}

// ---------------------------------------------------------------------------------------------
// 7. Sparks: a girl in a pink robo-suit with a plasma blaster (plasma bursts).
// ---------------------------------------------------------------------------------------------

function soldierSparks(level) {
  const h = makeHumanoid({ skin: 0xf8bbd0, shirt: 0xec407a, pants: 0xad1457, arms: 0xec407a, face: 'smile' });
  const { M } = h;
  const magenta = M(0xc2185b);
  const deep = M(0x880e4f);
  const bolt = M(0xb0bec5);
  const plasma = glow(h, 0xff4fd8);
  // Lilac hair with two puffy buns
  const hair = M(0xce93d8);
  part(h.head, boxGeo(1.35, 0.35, 1.35), hair, 0, 1.3, 0);
  part(h.head, boxGeo(1.35, 0.9, 0.3), hair, 0, 0.85, -0.55);
  part(h.head, boxGeo(1.3, 0.22, 0.15), hair, 0, 1.12, 0.62);
  for (const s of [-1, 1]) blob(h.head, 0.75, 0.75, 0.75, hair, s * 0.7, 1.55, -0.1, 0.18);
  // Big round red glasses
  const frame = M(0xe53935);
  for (const s of [-1, 1]) {
    blob(h.head, 0.5, 0.46, 0.08, frame, s * 0.29, 0.72, 0.63, 0.1);
    part(h.head, boxGeo(0.34, 0.3, 0.06), M(0xffebee), s * 0.29, 0.72, 0.66);
    part(h.head, boxGeo(0.1, 0.12, 0.05), M(0x1a1a1a), s * 0.29, 0.72, 0.69);
  }
  part(h.head, boxGeo(0.14, 0.08, 0.08), frame, 0, 0.76, 0.64);
  // Robo-suit: chest plate, bolts, shoulder pads, belt, chunky boots
  part(h.torso, boxGeo(1.6, 1.0, 0.15), magenta, 0, 0.3, 0.55);
  for (const [x, y] of [[-0.65, 0.7], [0.65, 0.7], [-0.65, -0.1], [0.65, -0.1]]) part(h.torso, boxGeo(0.14, 0.14, 0.06), bolt, x, y, 0.64);
  part(h.torso, boxGeo(2.1, 0.3, 1.1), deep, 0, -0.85, 0);
  part(h.torso, boxGeo(0.4, 0.25, 0.08), bolt, 0, -0.85, 0.56);
  for (const arm of [h.rightArm, h.leftArm]) {
    part(arm, boxGeo(1.2, 0.5, 1.2), magenta, 0, -0.15, 0);
    part(arm, boxGeo(0.14, 0.14, 0.06), bolt, 0, -0.15, 0.62);
    part(arm, boxGeo(1.1, 0.5, 1.1), deep, 0, -1.6, 0); // gauntlet
  }
  for (const leg of [h.rightLeg, h.leftLeg]) {
    part(leg, boxGeo(1.2, 0.8, 1.35), deep, 0, -1.65, 0.1);
    part(leg, boxGeo(1.25, 0.2, 1.4), bolt, 0, -1.95, 0.1);
    part(leg, boxGeo(0.14, 0.14, 0.06), bolt, 0, -1.45, 0.79);
  }
  if (level >= 2) {
    // Shoulder rocket pod
    part(h.torso, boxGeo(1.0, 0.9, 1.3), deep, 1.3, 1.45, -0.1);
    for (const [x, y] of [[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.2], [0.22, 0.2]]) part(h.torso, boxGeo(0.3, 0.3, 0.1), glow(h, 0xff9100), 1.3 + x, 1.45 + y, 0.58);
  }
  if (level >= 3) {
    // Jet pack
    part(h.torso, boxGeo(1.6, 1.6, 0.6), M(0x90a4ae), 0, 0.1, -0.8);
    for (const s of [-1, 1]) {
      part(h.torso, boxGeo(0.5, 1.6, 0.5), magenta, s * 0.55, 0, -1.25);
      part(h.torso, boxGeo(0.35, 0.3, 0.35), glow(h, 0x40c4ff), s * 0.55, -0.95, -1.25);
    }
  }
  if (level >= 4) {
    // Glowing suit lines
    part(h.torso, boxGeo(0.1, 1.9, 0.05), plasma, -0.85, 0, 0.53);
    part(h.torso, boxGeo(0.1, 1.9, 0.05), plasma, 0.85, 0, 0.53);
    part(h.torso, boxGeo(1.6, 0.1, 0.05), plasma, 0, -0.25, 0.64);
    for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(0.1, 1.2, 0.05), plasma, 0, -0.7, 0.52);
  }
  // Plasma blaster (heavy mech cannon at Lv 4)
  const mech = level >= 4;
  const len = [1.5, 1.9, 2.0, 2.2, 2.6][level];
  const w = [0.45, 0.6, 0.6, 0.65, 0.9][level];
  const gun = hand(h.rightArm, -1.9);
  if (mech) {
    part(h.rightArm, boxGeo(1.45, 1.6, 1.45), M(0x78909c), 0, -1.1, 0); // mech arm
    part(h.rightArm, boxGeo(0.14, 0.14, 0.06), bolt, 0, -0.6, 0.74);
  }
  part(gun, boxGeo(w, len, w + 0.1), M(mech ? 0x546e7a : 0xf3e5f5), 0, -len / 2 + 0.3, 0);
  part(gun, boxGeo(w * 0.6, 0.6, w * 0.6), M(0x37474f), 0, -len + 0.05, 0); // barrel
  const rings = 2 + Math.min(level, 2);
  for (let i = 0; i < rings; i++) part(gun, boxGeo(w + 0.08, 0.1, w + 0.18), plasma, 0, -0.2 - i * ((len - 0.8) / rings), 0);
  part(gun, boxGeo(w * 0.7, 0.18, w * 0.7), plasma, 0, -len - 0.25, 0);
  part(gun, boxGeo(0.25, 0.5, 0.3), M(0x37474f), 0, -0.3, -0.4); // grip
  if (level >= 1) part(gun, boxGeo(0.35, 0.9, 0.35), plasma, 0, -0.7, w / 2 + 0.25); // energy cell on top
  setMuzzle(h, gun, 0, -len - 0.35, 0);
  pose(h, -Math.PI / 2, -Math.PI / 2 + 0.1, 0.1, -0.5, 0.25);
  h.tracer = 0xff4fd8;
  h.projectile = { color: 0xff4fd8, size: 0.8 + level * 0.1 };
  return h;
}

// ---------------------------------------------------------------------------------------------
// 8. Soda Pop: a worried mouse lobbing soda (splash).
// ---------------------------------------------------------------------------------------------

function sodaCan(h, parent, x, y, z, s = 1) {
  const { M } = h;
  part(parent, boxGeo(0.5 * s, 0.75 * s, 0.5 * s), M(0x8e24aa), x, y, z);
  part(parent, boxGeo(0.52 * s, 0.2 * s, 0.52 * s), M(0xe1bee7), x, y, z);
  part(parent, boxGeo(0.4 * s, 0.08 * s, 0.4 * s), M(0xcfd8dc), x, y + 0.41 * s, z);
}

function grenadierSoda(level) {
  const h = rig();
  const { M } = h;
  const fur = M(0xb7a9c9);
  const furD = M(0x9a8cae);
  const pink = M(0xf8a5c2);
  const ink = M(0x1a1a1a);
  const fizz = glow(h, 0xea80fc);
  part(h.torso, boxGeo(1.7, 1.85, 1.0), fur, 0, 0, 0);
  part(h.torso, boxGeo(1.0, 1.1, 0.06), M(0xd8cfe4), 0, -0.2, 0.51);
  h.rightArm.position.x = -1.2;
  h.leftArm.position.x = 1.2;
  for (const arm of [h.rightArm, h.leftArm]) {
    part(arm, boxGeo(0.6, 1.8, 0.6), fur, 0, -0.9, 0);
    part(arm, boxGeo(0.62, 0.35, 0.62), pink, 0, -1.8, 0);
  }
  for (const leg of [h.rightLeg, h.leftLeg]) {
    part(leg, boxGeo(0.7, 1.85, 0.8), furD, 0, -0.9, 0);
    part(leg, boxGeo(0.75, 0.3, 1.1), pink, 0, -1.85, 0.15);
  }
  // Thin tail
  for (let i = 0; i < 4; i++) part(h.body, boxGeo(0.12, 0.12, 0.6), pink, 0.1 * i, 2.0 + i * 0.12, -0.75 - i * 0.5).rotation.x = -0.2 * i;
  // Head
  blob(h.head, 1.4, 1.25, 1.25, fur, 0, 0.62, 0, 0.22);
  part(h.head, boxGeo(0.75, 0.45, 0.5), M(0xd8cfe4), 0, 0.38, 0.8); // snout
  part(h.head, boxGeo(0.28, 0.2, 0.15), M(0xf06292), 0, 0.5, 1.08); // nose
  part(h.head, boxGeo(0.3, 0.07, 0.05), ink, 0, 0.22, 1.06); // worried mouth
  for (const s of [-1, 1]) {
    part(h.head, boxGeo(0.08, 0.1, 0.05), ink, s * 0.17, 0.18, 1.06);
    part(h.head, boxGeo(0.2, 0.3, 0.05), ink, s * 0.3, 0.82, 0.63);
    part(h.head, boxGeo(0.08, 0.08, 0.05), M(0xffffff), s * 0.3 - 0.04, 0.9, 0.66);
    part(h.head, boxGeo(0.3, 0.07, 0.05), ink, s * 0.3, 1.08, 0.63).rotation.z = s * 0.4; // worried brows
    for (const wy of [0.48, 0.36]) part(h.head, boxGeo(0.5, 0.03, 0.03), ink, s * 0.58, wy, 0.95);
    // Big round ears, pink inside
    blob(h.head, 1.1, 1.1, 0.2, fur, s * 0.85, 1.45, -0.1, 0.25);
    blob(h.head, 0.75, 0.75, 0.08, pink, s * 0.85, 1.45, 0.02, 0.17);
  }
  for (const [x, r] of [[-0.12, 0.4], [0.05, 0], [0.2, -0.4]]) part(h.head, boxGeo(0.14, 0.4, 0.14), furD, x, 1.35, 0.15).rotation.z = r; // tuft
  if (level >= 1) {
    // Six-pack belt
    part(h.torso, boxGeo(1.8, 0.25, 1.1), M(0x6a1b9a), 0, -0.8, 0);
    for (let i = 0; i < 3; i++) for (const z of [0.68, -0.68]) sodaCan(h, h.torso, -0.5 + i * 0.5, -0.75, z, 0.65);
  }
  if (level >= 3) {
    // Fizz tank backpack with a hose
    blob(h.torso, 1.2, 1.7, 0.8, M(0x7b1fa2), 0, 0.2, -0.95, 0.25);
    part(h.torso, boxGeo(0.5, 1.2, 0.1), ghostMat(h, 0xf3e5f5, 0.6), 0, 0.2, -1.37);
    for (const y of [-0.1, 0.25, 0.6]) part(h.torso, boxGeo(0.14, 0.14, 0.06), fizz, (y - 0.25) * 0.4, y, -1.42);
    part(h.torso, boxGeo(0.2, 0.2, 1.2), M(0x4a148c), -0.95, -0.5, -0.4);
  }
  if (level >= 2) {
    // Soda launcher (a big soda cannon at Lv 4)
    const big = level >= 4;
    const len = big ? 3.0 : 2.2;
    const w = big ? 1.0 : 0.65;
    const gun = hand(h.rightArm, -1.8);
    part(gun, boxGeo(w, len, w), M(0x8e24aa), 0, -len / 2 + 0.5, 0);
    part(gun, boxGeo(w + 0.08, 0.35, w + 0.08), M(0xe1bee7), 0, -len / 2 + 0.3, 0);
    part(gun, boxGeo(w + 0.15, 0.25, w + 0.15), M(0xcfd8dc), 0, -len + 0.5, 0);
    part(gun, boxGeo(w * 0.7, 0.08, w * 0.7), fizz, 0, -len + 0.36, 0);
    part(gun, boxGeo(0.25, 0.5, 0.3), M(0x4a148c), 0, -0.2, -w / 2 - 0.1);
    sodaCan(h, gun, 0, -0.5, w / 2 + 0.3, 0.8); // loaded can on top
    setMuzzle(h, gun, 0, -len + 0.3, 0);
    pose(h, -Math.PI / 2, -Math.PI / 2 + 0.15, 0.1, -0.5, 0.2);
    if (big) {
      const bub = ghostMat(h, 0xf3e5f5, 0.5, 0.6);
      for (const [x, y, z, s] of [[-1.6, 4.2, 1.6, 0.35], [-0.6, 5.2, 2.6, 0.25], [-1.9, 5.4, 0.8, 0.3], [0.4, 4.6, 3.0, 0.2], [-1.2, 6.0, 2.0, 0.22]]) blob(h.body, s, s, s, bub, x, y, z, s * 0.25);
    }
  } else {
    const th = hand(h.rightArm, -2.0);
    sodaCan(h, th, 0, -0.35, 0, 1.1);
    setMuzzle(h, th, 0, -0.4, 0);
    pose(h, -2.8, -1.0, 0.2, -0.3);
    h.swing = 1.9;
  }
  h.projectile = { color: 0x8e24aa, size: 0.8 + level * 0.1, arc: level >= 2 ? 3 : 4 };
  h.tracer = 0xea80fc;
  h.body.scale.setScalar(0.88);
  return h;
}

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

function assassinFrank(level) {
  const h = rig();
  const { M } = h;
  const bun = M(0xd9a35f);
  const bunD = M(0xc08743);
  const dog = M(0xe57368);
  const ink = M(0x2a1010);
  h.torso.position.y = 2.6;
  // Bun with the sausage poking out both sides
  blob(h.torso, 2.5, 1.15, 1.5, bun, 0, 0.6, 0, 0.3);
  blob(h.torso, 2.5, 0.95, 1.5, bunD, 0, -0.55, 0, 0.25);
  part(h.torso, boxGeo(3.0, 0.65, 0.95), dog, 0, 0.0, 0);
  for (const s of [-1, 1]) blob(h.torso, 0.5, 0.6, 0.8, dog, s * 1.6, 0.0, 0, 0.15);
  // Mustard squiggle on top
  const mustard = M(0xffd600);
  for (let i = 0; i < 5; i++) part(h.torso, boxGeo(0.5, 0.08, 0.14), mustard, -0.9 + i * 0.45, 1.2, 0).rotation.y = i % 2 ? 0.7 : -0.7;
  // Big open-mouthed smile
  if (level < 4) {
    for (const s of [-1, 1]) {
      part(h.torso, boxGeo(0.22, 0.3, 0.05), ink, s * 0.45, 0.9, 0.76);
      part(h.torso, boxGeo(0.08, 0.08, 0.05), M(0xffffff), s * 0.45 - 0.04, 0.98, 0.79);
    }
    part(h.torso, boxGeo(1.0, 0.45, 0.05), M(0x5d1414), 0, 0.42, 0.76);
    part(h.torso, boxGeo(0.9, 0.1, 0.05), M(0xffffff), 0, 0.6, 0.78);
    part(h.torso, boxGeo(0.55, 0.16, 0.05), M(0xf06292), 0, 0.29, 0.78);
  } else {
    // Dark ninja hood with an eye slit
    const cloth = M(0x1c1c22);
    blob(h.torso, 2.6, 1.3, 1.62, cloth, 0, 0.62, 0, 0.3);
    part(h.torso, boxGeo(1.5, 0.3, 0.05), M(0xd9a35f), 0, 0.85, 0.82);
    for (const s of [-1, 1]) part(h.torso, boxGeo(0.25, 0.14, 0.05), ink, s * 0.4, 0.83, 0.84).rotation.z = s * -0.25;
    for (const [x, r] of [[-0.15, 0.4], [0.15, 0.7]]) part(h.torso, boxGeo(0.25, 1.1, 0.08), cloth, x, 0.6, -0.95).rotation.x = r; // hood tails
  }
  // Stubby legs and arms
  h.rightLeg.position.set(-0.6, 1.6, 0);
  h.leftLeg.position.set(0.6, 1.6, 0);
  for (const leg of [h.rightLeg, h.leftLeg]) {
    part(leg, boxGeo(0.55, 1.1, 0.6), bunD, 0, -0.55, 0);
    part(leg, boxGeo(0.7, 0.35, 0.85), M(level >= 4 ? 0x1c1c22 : 0x5d4037), 0, -1.38, 0.1);
  }
  h.rightArm.position.set(-1.45, 2.85, 0.1);
  h.leftArm.position.set(1.45, 2.85, 0.1);
  for (const arm of [h.rightArm, h.leftArm]) {
    part(arm, boxGeo(0.45, 0.9, 0.45), bunD, 0, -0.45, 0);
    blob(arm, 0.6, 0.5, 0.6, M(0xfafafa), 0, -1.0, 0, 0.12); // cartoon gloves
  }
  if (level >= 2) {
    // Condiment belt
    part(h.torso, boxGeo(2.6, 0.22, 1.6), M(0x4e342e), 0, -0.55, 0);
    for (const [x, c] of [[-0.8, 0xffd600], [0.8, 0xe53935]]) {
      part(h.torso, boxGeo(0.35, 0.65, 0.35), M(c), x, -0.45, 0.85);
      part(h.torso, boxGeo(0.12, 0.3, 0.12), M(c), x, 0.0, 0.85);
    }
  }
  if (level === 3) {
    // Chef bandana
    const red = M(0xd32f2f);
    part(h.torso, boxGeo(2.55, 0.28, 1.58), red, 0, 1.2, 0);
    for (const x of [-0.8, -0.2, 0.4, 1.0]) part(h.torso, boxGeo(0.1, 0.1, 0.05), M(0xffffff), x, 1.2, 0.8);
    part(h.torso, boxGeo(0.35, 0.35, 0.3), red, 0.6, 1.15, -0.85);
    part(h.torso, boxGeo(0.2, 0.6, 0.1), red, 0.75, 0.85, -0.95).rotation.z = 0.3;
  }
  // Weapon: fists, then a corndog club (one in each hand at Lv 4)
  const rh = hand(h.rightArm, -1.0);
  let tip = -0.4;
  if (level >= 1) tip = corndog(h, rh, level >= 3 ? 1.4 : 1.0, -0.1);
  if (level >= 4) corndog(h, hand(h.leftArm, -1.0), 1.4, -0.1);
  setMuzzle(h, rh, 0, tip, 0);
  pose(h, -2.3, level >= 4 ? -1.3 : -0.5, 0.2, -0.3);
  h.swing = 1.8;
  h.melee = true;
  h.tracer = 0xffd600;
  return h;
}

// ---------------------------------------------------------------------------------------------
// 10. Keith: a deadpan cowboy kid with boomerangs.
// ---------------------------------------------------------------------------------------------

function boomerangKeith(level) {
  const skinC = 0xfff59d;
  const h = makeHumanoid({ skin: skinC, shirt: 0xeceff1, pants: 0x1e88e5, arms: 0xeceff1 });
  const { M } = h;
  plainHead(h, skinC);
  const skin = M(skinC);
  const ink = M(0x1a1a1a);
  const denim = M(0x1e88e5);
  h.body.scale.setScalar(0.88);
  // Flat expression
  for (const s of [-1, 1]) part(h.head, boxGeo(0.14, 0.18, 0.05), ink, s * 0.27, 0.72, 0.61);
  part(h.head, boxGeo(0.4, 0.07, 0.05), ink, 0, 0.35, 0.61);
  // Hands
  for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.02, 0.5, 1.02), skin, 0, -1.75, 0);
  // Overalls
  part(h.torso, boxGeo(2.05, 0.8, 1.05), denim, 0, -0.6, 0);
  part(h.torso, boxGeo(1.4, 0.9, 0.08), denim, 0, 0.1, 0.52);
  for (const s of [-1, 1]) {
    part(h.torso, boxGeo(0.3, 0.6, 0.08), denim, s * 0.55, 0.7, 0.52);
    part(h.torso, boxGeo(0.3, 2.0, 0.08), denim, s * 0.55, 0.0, -0.52);
    part(h.torso, boxGeo(0.14, 0.14, 0.06), M(0xffd54f), s * 0.55, 0.45, 0.58);
  }
  part(h.torso, boxGeo(2.1, 0.22, 1.1), M(0x5d4037), 0, -0.85, 0); // belt
  // Apple-juice box on the belt
  part(h.torso, boxGeo(0.42, 0.55, 0.3), M(0xffca28), 0.75, -0.75, 0.66);
  part(h.torso, boxGeo(0.3, 0.2, 0.05), M(0x7cb342), 0.75, -0.75, 0.82);
  part(h.torso, boxGeo(0.06, 0.4, 0.06), M(0xfafafa), 0.85, -0.3, 0.66).rotation.z = -0.3;
  // Spiky blond hair under the hat
  const hair = M(0xffe082);
  for (const [x, z, rz, rx] of [[-0.62, 0.2, 0.6, 0], [0.62, 0.2, -0.6, 0], [-0.62, -0.3, 0.6, 0], [0.62, -0.3, -0.6, 0], [0, -0.65, 0, -0.6], [-0.35, -0.6, 0.3, -0.6], [0.35, -0.6, -0.3, -0.6], [0.25, 0.62, 0, 0.5]]) {
    const sp = part(h.head, boxGeo(0.3, 0.45, 0.3), hair, x, 1.05, z);
    sp.rotation.set(rx, 0, rz);
  }
  // Big brown cowboy hat
  const hat = M(0x795548);
  part(h.head, boxGeo(2.3, 0.14, 2.1), hat, 0, 1.3, 0);
  for (const s of [-1, 1]) part(h.head, boxGeo(0.25, 0.45, 2.1), hat, s * 1.2, 1.48, 0).rotation.z = s * 0.45;
  part(h.head, boxGeo(1.3, 0.75, 1.3), hat, 0, 1.72, 0);
  part(h.head, boxGeo(0.3, 0.12, 1.32), M(0x5d4037), 0, 2.1, 0); // crease
  part(h.head, boxGeo(1.34, 0.18, 1.34), M(level >= 4 ? 0xffc107 : 0x3e2723), 0, 1.45, 0);
  if (level >= 3) {
    // Bandana and a holster of boomerangs
    const red = M(0xd32f2f);
    part(h.torso, boxGeo(1.6, 0.3, 1.15), red, 0, 0.92, 0);
    part(h.torso, boxGeo(0.55, 0.55, 0.08), red, 0, 0.65, 0.58).rotation.z = Math.PI / 4;
    part(h.torso, boxGeo(0.45, 0.8, 0.6), M(0x6d4c41), -1.15, -0.9, 0);
    for (const z of [-0.15, 0.15]) part(h.torso, boxGeo(0.12, 0.6, 0.3), M(0x8d6e63), -1.15, -0.35, z).rotation.z = 0.5;
  }
  if (level >= 4) {
    // Poncho
    const pon = M(0x8d4b2a);
    part(h.torso, boxGeo(2.3, 1.3, 1.25), pon, 0, 0.35, 0);
    for (const [y, c] of [[0.0, 0xffca28], [0.35, 0x2e7d32], [-0.2, 0xffca28]]) part(h.torso, boxGeo(2.32, 0.1, 1.27), M(c), 0, y, 0);
  }
  const gold = level >= 4;
  const wood = gold ? glow(h, 0xffc107) : M(0x8d6e63);
  const edge = M(0xb0bec5);
  const makeRang = (parent, y) => {
    const g = new THREE.Group();
    g.position.set(0, y, 0);
    parent.add(g);
    for (const a of [0.6, -0.6]) {
      const arm = part(g, boxGeo(0.25, 1.2, 0.4), wood, Math.sin(a) * 0.4, -Math.cos(a) * 0.4, 0);
      arm.rotation.z = a;
      if (level >= 1 && !gold) {
        const e = part(g, boxGeo(0.08, 1.2, 0.42), edge, Math.sin(a) * 0.4 + Math.cos(a) * 0.15 * Math.sign(a), -Math.cos(a) * 0.4 + Math.sin(a) * 0.15 * Math.sign(a), 0);
        e.rotation.z = a;
      }
    }
    part(g, boxGeo(0.35, 0.35, 0.45), M(0xc62828), 0, 0, 0); // grip wrap
    return g;
  };
  const rang = makeRang(h.rightArm, -2.2);
  if (level >= 2) makeRang(h.leftArm, -2.2);
  setMuzzle(h, rang, 0, -0.4, 0);
  pose(h, -2.6, level >= 2 ? -1.2 : -0.6, 0.3, -0.3);
  h.swing = 1.9;
  h.projectile = { color: gold ? 0xffc107 : 0x8d6e63, size: gold ? 1.25 : 1 };
  h.tracer = gold ? 0xffc107 : 0xffe082;
  return h;
}

// ---------------------------------------------------------------------------------------------
// 11. Bunny: egg thrower -> slingshot -> catapult -> egg bazooka.
// ---------------------------------------------------------------------------------------------

const PASTEL = [0xb2ebf2, 0xf8bbd0, 0xfff59d, 0xc5e1a5, 0xd1c4e9];

function egg(h, parent, color, x, y, z, s = 1) {
  blob(parent, 0.5 * s, 0.68 * s, 0.5 * s, h.M(color), x, y, z, 0.12 * s);
  part(parent, boxGeo(0.52 * s, 0.1 * s, 0.52 * s), h.M(0xffffff), x, y, z);
}

function rocketeerBunny(level) {
  const h = rig();
  const { M } = h;
  const fur = M(0xfafafa);
  const pink = M(0xf8bbd0);
  const ink = M(0x111111);
  part(h.torso, boxGeo(1.7, 1.8, 1.0), fur, 0, 0, 0);
  part(h.torso, boxGeo(1.0, 1.1, 0.06), pink, 0, -0.2, 0.51); // belly patch
  h.rightArm.position.x = -1.2;
  h.leftArm.position.x = 1.2;
  for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(0.6, 1.8, 0.6), fur, 0, -0.9, 0);
  for (const leg of [h.rightLeg, h.leftLeg]) {
    part(leg, boxGeo(0.75, 1.8, 0.85), fur, 0, -0.9, 0);
    part(leg, boxGeo(0.85, 0.35, 1.35), fur, 0, -1.83, 0.25);
    part(leg, boxGeo(0.4, 0.05, 0.4), pink, 0, -1.65, 0.6);
  }
  blob(h.torso, 0.55, 0.55, 0.45, fur, 0, -0.7, -0.6, 0.15); // tail puff
  // Head
  blob(h.head, 1.5, 1.3, 1.3, fur, 0, 0.65, 0, 0.25);
  for (const s of [-1, 1]) {
    blob(h.head, 0.42, 0.48, 0.08, ink, s * 0.36, 0.78, 0.66, 0.1); // big round eyes
    part(h.head, boxGeo(0.12, 0.12, 0.05), M(0xffffff), s * 0.36 - 0.07, 0.88, 0.71);
    part(h.head, boxGeo(0.3, 0.14, 0.05), pink, s * 0.52, 0.45, 0.66); // blush
    const ear = new THREE.Group();
    ear.position.set(s * 0.35, 1.2, -0.1);
    ear.rotation.z = -s * 0.12;
    h.head.add(ear);
    blob(ear, 0.42, 1.9, 0.26, fur, 0, 0.9, 0, 0.1);
    part(ear, boxGeo(0.22, 1.45, 0.06), pink, 0, 0.9, 0.14);
  }
  part(h.head, boxGeo(0.2, 0.14, 0.06), pink, 0, 0.55, 0.67); // nose
  part(h.head, boxGeo(0.06, 0.15, 0.05), ink, 0, 0.42, 0.66);
  part(h.head, boxGeo(0.25, 0.06, 0.05), ink, 0, 0.34, 0.66);
  if (level === 1) {
    // Basket of eggs in the left hand
    const b = hand(h.leftArm, -1.6, -0.6);
    part(b, boxGeo(1.0, 0.6, 0.8), M(0xbc8f5a), 0, -0.4, 0.2);
    stick(b, M(0x8d6e63), [-0.45, -0.1, 0.2], [0, 0.5, 0.2], 0.08);
    stick(b, M(0x8d6e63), [0.45, -0.1, 0.2], [0, 0.5, 0.2], 0.08);
    for (let i = 0; i < 3; i++) egg(h, b, PASTEL[i], -0.3 + i * 0.3, -0.05, 0.2, 0.6);
  }
  if (level >= 2) {
    // Basket now on the ground
    part(h.root, boxGeo(1.0, 0.6, 0.8), M(0xbc8f5a), -1.9, 0.3, -0.9);
    for (let i = 0; i < 3; i++) egg(h, h.root, PASTEL[i + 1], -2.2 + i * 0.3, 0.65, -0.9, 0.6);
  }
  let muzzleSet = false;
  if (level >= 3) {
    // A small catapult beside him
    const cat = new THREE.Group();
    cat.position.set(1.9, 0, 0.2);
    h.root.add(cat);
    const wood = M(0x8d6e63);
    for (const x of [-0.5, 0.5]) part(cat, boxGeo(0.2, 0.25, 1.8), wood, x, 0.25, 0);
    for (const z of [-0.6, 0.6]) part(cat, boxGeo(1.2, 0.2, 0.2), wood, 0, 0.25, z);
    for (const x of [-0.5, 0.5]) part(cat, boxGeo(0.2, 1.2, 0.2), wood, x, 0.85, -0.2);
    part(cat, boxGeo(1.2, 0.2, 0.2), wood, 0, 1.4, -0.2);
    const arm = part(cat, boxGeo(0.2, 0.2, 1.9), M(0x6d4c41), 0, 1.0, 0.05);
    arm.rotation.x = 0.6;
    part(cat, boxGeo(0.6, 0.25, 0.6), M(0xbc8f5a), 0, 1.6, -0.75);
    egg(h, cat, PASTEL[level === 3 ? 0 : 3], 0, 1.95, -0.75, 0.8);
    if (level === 3) {
      setMuzzle(h, cat, 0, 2.0, -0.75);
      muzzleSet = true;
    }
  }
  if (level >= 4) {
    // Pastel egg-shaped bazooka on the shoulder
    const gun = hand(h.rightArm, -1.9);
    part(gun, boxGeo(0.75, 2.6, 0.75), M(0xd1c4e9), 0, -0.9, 0);
    for (let i = 0; i < 3; i++) part(gun, boxGeo(0.8, 0.18, 0.8), M(PASTEL[i]), 0, -0.2 - i * 0.6, 0);
    blob(gun, 1.25, 1.5, 1.25, M(0xf8bbd0), 0, -2.6, 0, 0.35);
    part(gun, boxGeo(1.27, 0.18, 1.27), M(0xfff59d), 0, -2.5, 0);
    part(gun, boxGeo(0.7, 0.1, 0.7), M(0x4a148c), 0, -3.36, 0);
    part(gun, boxGeo(0.25, 0.5, 0.3), M(0x7e57c2), 0, -0.6, -0.5);
    setMuzzle(h, gun, 0, -3.45, 0);
    pose(h, -Math.PI / 2, -Math.PI / 2 + 0.1, 0.1, -0.5, 0.2);
  } else if (level >= 2) {
    // Slingshot in the left hand, right hand pulling back an egg
    const s = hand(h.leftArm, -1.9);
    const wood = M(0x8d6e63);
    part(s, boxGeo(0.18, 0.7, 0.18), wood, 0, -0.3, 0);
    for (const x of [-0.25, 0.25]) part(s, boxGeo(0.14, 0.14, 0.6), wood, x, -0.65, 0.3);
    part(s, boxGeo(0.64, 0.14, 0.14), wood, 0, -0.65, 0);
    for (const x of [-0.25, 0.25]) stick(s, M(0xe53935), [x, -0.65, 0.6], [0, 0.3, 0.6], 0.06);
    egg(h, s, PASTEL[1], 0, 0.35, 0.6, 0.65);
    if (!muzzleSet) setMuzzle(h, s, 0, -0.7, 0.6);
    pose(h, -1.3, -Math.PI / 2, 0.35, -0.25, 0.15);
  } else {
    // Egg in the throwing hand
    const th = hand(h.rightArm, -2.0);
    egg(h, th, PASTEL[level === 1 ? 2 : 0], 0, -0.3, 0, 1.0);
    setMuzzle(h, th, 0, -0.35, 0);
    pose(h, -2.8, level === 1 ? -0.6 : -0.8, 0.2, -0.3);
    h.swing = 1.9;
  }
  h.projectile = { color: PASTEL[level], size: [0.8, 0.85, 0.9, 1.1, 1.3][level], arc: level === 3 ? 6 : 3.5 };
  h.tracer = 0xf8bbd0;
  h.body.scale.setScalar(0.88);
  return h;
}

// ---------------------------------------------------------------------------------------------
// 12. Beebo: a robot kid who drives a circle throwing ice creams (Aviator orbit view).
// ---------------------------------------------------------------------------------------------

function makeBeeboRider(u, level, parent) {
  const { M } = u;
  const suit = M(0x1a237e);
  const green = M(0x66bb6a);
  const blue = M(0x42a5f5);
  const seated = level >= 1;
  const c = new THREE.Group();
  c.scale.setScalar(0.72);
  parent.add(c);
  const hip = seated ? 0 : 1.2;
  // Legs and green shoes
  for (const s of [-1, 1]) {
    if (seated) {
      part(c, boxGeo(0.55, 0.5, 1.2), suit, s * 0.38, hip + 0.25, 0.5);
      blob(c, 0.65, 0.6, 0.6, green, s * 0.38, hip + 0.1, 1.2, 0.15);
    } else {
      part(c, boxGeo(0.55, 1.1, 0.6), suit, s * 0.38, 0.75, 0);
      blob(c, 0.65, 0.35, 0.85, green, s * 0.38, 0.18, 0.1, 0.1);
    }
  }
  // Jumpsuit body with a green badge
  part(c, boxGeo(1.5, 1.6, 1.0), suit, 0, hip + 0.8, 0);
  part(c, boxGeo(1.55, 0.2, 1.05), M(0x283593), 0, hip + 0.15, 0);
  part(c, boxGeo(0.35, 0.35, 0.06), glow(u, 0x00e676), 0.4, hip + 1.15, 0.52);
  // Round blue robot head, smiling face, antenna with a green diamond
  const hy = hip + 2.5;
  blob(c, 1.8, 1.6, 1.6, blue, 0, hy, 0, 0.4);
  part(c, boxGeo(1.25, 0.9, 0.06), M(0xe3f2fd), 0, hy - 0.05, 0.8);
  const ink = M(0x0d1b2a);
  for (const s of [-1, 1]) {
    part(c, boxGeo(0.2, 0.3, 0.05), ink, s * 0.3, hy + 0.1, 0.84);
    part(c, boxGeo(0.2, 0.08, 0.05), ink, s * 0.25, hy - 0.25, 0.84).rotation.z = s * 0.4;
  }
  part(c, boxGeo(0.3, 0.08, 0.05), ink, 0, hy - 0.31, 0.84);
  for (const s of [-1, 1]) part(c, boxGeo(0.2, 0.4, 0.4), M(0x1e88e5), s * 0.92, hy, 0); // ear bolts
  part(c, boxGeo(0.1, 0.7, 0.1), M(0x90a4ae), 0, hy + 1.1, 0);
  const gem = part(c, boxGeo(0.38, 0.38, 0.38), glow(u, 0x00e676), 0, hy + 1.6, 0);
  gem.rotation.set(Math.PI / 4, 0, Math.PI / 4);
  // Arms: right arm holding up an ice-cream cone, left on the wheel (or at the side)
  const shoulder = hip + 1.45;
  const ra = new THREE.Group();
  ra.position.set(-0.95, shoulder, 0);
  ra.rotation.set(Math.PI * 0.85, 0, 0.2);
  c.add(ra);
  part(ra, boxGeo(0.45, 1.1, 0.45), suit, 0, -0.55, 0);
  blob(ra, 0.55, 0.45, 0.55, green, 0, -1.2, 0, 0.1);
  const cone = new THREE.Group();
  cone.position.set(0, -1.4, 0);
  cone.rotation.set(-Math.PI * 0.85, 0, -0.2); // upright
  ra.add(cone);
  part(cone, boxGeo(0.4, 0.55, 0.4), M(0xd7a86e), 0, 0.15, 0);
  part(cone, boxGeo(0.22, 0.3, 0.22), M(0xd7a86e), 0, -0.2, 0);
  blob(cone, 0.7, 0.6, 0.7, M(0xf48fb1), 0, 0.65, 0, 0.18);
  part(cone, boxGeo(0.15, 0.15, 0.15), M(0xe53935), 0, 1.02, 0); // cherry
  const la = new THREE.Group();
  la.position.set(0.95, shoulder, 0);
  la.rotation.set(seated ? -1.1 : -0.15, 0, -0.15);
  c.add(la);
  part(la, boxGeo(0.45, 1.1, 0.45), suit, 0, -0.55, 0);
  blob(la, 0.55, 0.45, 0.55, green, 0, -1.2, 0, 0.1);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.8, 0);
  cone.add(muzzle);
  return muzzle;
}

function aviatorBeebo(level) {
  const u = makeThing();
  const { M } = u;
  const plane = new THREE.Group();
  const bank = new THREE.Group();
  plane.add(bank);
  // Kart: scooter-kart (1-2), racer with a spoiler (3), hover kart (4)
  let seatY = 0;
  if (level >= 1) {
    const hover = level >= 4;
    const fast = level >= 3;
    const body = M(hover ? 0x5e35b1 : fast ? 0xec407a : 0xffca28);
    const trim = hover ? glow(u, 0x00e5ff) : M(fast ? 0xfafafa : 0x1e88e5);
    const len = fast ? 3.8 : 3.2;
    const y = hover ? 0.9 : 0.55;
    part(bank, boxGeo(2.0, 0.5, len), body, 0, y, 0);
    part(bank, boxGeo(2.05, 0.12, len + 0.05), trim, 0, y + 0.15, 0);
    part(bank, boxGeo(1.6, 0.4, 0.8), body, 0, y + 0.1, len / 2 + (fast ? 0.3 : 0.1)); // nose
    if (fast) part(bank, boxGeo(1.2, 0.3, 0.6), trim, 0, y + 0.05, len / 2 + 0.75);
    part(bank, boxGeo(1.3, 0.9, 0.25), M(0x263238), 0, y + 0.6, -0.55); // seat back
    // Steering wheel
    stick(bank, M(0x424242), [0, y + 0.25, 1.3], [0, y + 1.0, 0.95], 0.1);
    part(bank, boxGeo(0.7, 0.7, 0.1), M(0x212121), 0, y + 1.05, 0.92).rotation.x = -0.45;
    if (hover) {
      for (const x of [-0.8, 0.8]) for (const z of [-1.2, 1.2]) {
        part(bank, boxGeo(0.6, 0.35, 0.6), M(0x311b92), x, y - 0.4, z);
        part(bank, boxGeo(0.45, 0.1, 0.45), glow(u, 0x00e5ff), x, y - 0.6, z);
      }
      part(bank, boxGeo(1.2, 0.4, 0.1), glow(u, 0xff4081), 0, y, -len / 2 - 0.05); // thruster
    } else {
      const tire = M(0x1a1a1a);
      const wz = len / 2 - 0.5;
      for (const x of [-1.15, 1.15]) for (const z of [-wz, wz]) {
        part(bank, boxGeo(0.4, 0.85, 0.85), tire, x, 0.43, z);
        part(bank, boxGeo(0.42, 0.35, 0.35), M(0xbdbdbd), x, 0.43, z);
      }
    }
    if (fast) {
      // Spoiler and exhaust
      for (const x of [-0.7, 0.7]) part(bank, boxGeo(0.12, 0.9, 0.12), M(0x212121), x, y + 0.7, -len / 2 + 0.2);
      part(bank, boxGeo(2.3, 0.12, 0.6), body, 0, y + 1.15, -len / 2 + 0.2);
      for (const x of [-1.2, 1.2]) part(bank, boxGeo(0.1, 0.4, 0.65), trim, x, y + 1.15, -len / 2 + 0.2);
      if (!hover) for (const x of [-0.45, 0.45]) part(bank, boxGeo(0.25, 0.25, 0.3), glow(u, 0xff9100), x, y, -len / 2 - 0.1);
    }
    if (level >= 2) {
      // Ice-cream cooler behind the seat
      const cz = -len / 2 + (fast ? 0.95 : 0.6);
      part(bank, boxGeo(1.2, 0.75, 0.75), M(0xeceff1), 0, y + 0.6, cz);
      part(bank, boxGeo(1.25, 0.18, 0.8), M(0x29b6f6), 0, y + 1.05, cz);
      part(bank, boxGeo(0.4, 0.3, 0.06), glow(u, 0xf48fb1), 0, y + 0.6, cz + 0.39);
      if (fast) cone(u, bank, 0.4, y + 1.35, cz);
    }
    seatY = y + 0.25;
  }
  const seat = new THREE.Group();
  seat.position.set(0, seatY, level >= 1 ? -0.2 : 0);
  bank.add(seat);
  const muzzle = makeBeeboRider(u, level, seat);
  // A parking spot on the pad
  part(u.root, boxGeo(3.4, 0.06, 3.4), M(0x37474f), 0, 0.03, 0);
  for (const x of [-1.6, 1.6]) part(u.root, boxGeo(0.15, 0.08, 3.0), M(0xfafafa), x, 0.05, 0);
  part(u.root, boxGeo(0.12, 1.6, 0.12), M(0x90a4ae), 1.9, 0.8, -1.9);
  cone(u, u.root, 1.9, 1.75, -1.9, 1.2);
  const bay = new THREE.Object3D();
  bay.position.set(0, 1.5, 0);
  bank.add(bay);
  plane.userData = { bank, prop: null, bay, missiles: [] };
  u.static = true;
  u.plane = plane;
  u.muzzles = [muzzle];
  u.flyHeight = 0.45;
  u.tracer = 0xf48fb1;
  u.projectile = { color: 0xf48fb1, size: 0.9 + level * 0.08 };
  return u;
}

/** A little ice-cream cone prop (cooler topper, sign). */
function cone(u, parent, x, y, z, s = 0.6) {
  part(parent, boxGeo(0.4 * s, 0.6 * s, 0.4 * s), u.M(0xd7a86e), x, y, z);
  blob(parent, 0.7 * s, 0.55 * s, 0.7 * s, u.M(0xf48fb1), x, y + 0.5 * s, z, 0.15 * s);
}

// ---------------------------------------------------------------------------------------------
// 13. Fracture: a living chunk of stone that throws crystal shards.
// ---------------------------------------------------------------------------------------------

function shard(parent, mat, x, y, z, w = 0.3, len = 0.9, rz = 0, rx = 0) {
  const m = part(parent, boxGeo(w, len, w), mat, x, y, z);
  m.rotation.set(rx, Math.PI / 4, rz);
  return m;
}

function marksmanFracture(level) {
  const h = rig();
  const { M } = h;
  const rock = M(0xe8dcc0);
  const rockD = M(0xcfc3a5);
  const ink = M(0x1a1410);
  const crystal = level >= 3 ? glow(h, 0xff9100) : M(0xff9800);
  h.torso.position.y = 2.7;
  h.head = h.torso;
  // Rocky blob body
  blob(h.torso, 2.4, 2.4, 2.0, rock, 0, 0, 0, 0.3);
  part(h.torso, boxGeo(1.0, 0.7, 0.9), rockD, 0.85, 1.05, -0.25).rotation.set(0.2, 0.4, 0.3);
  part(h.torso, boxGeo(0.8, 0.7, 0.8), rockD, -1.05, 0.6, 0.15).rotation.set(0.3, 0.2, -0.2);
  part(h.torso, boxGeo(1.2, 0.5, 1.0), rock, -0.1, 1.25, 0.05).rotation.y = 0.5;
  part(h.torso, boxGeo(0.7, 0.6, 0.7), rockD, 0.6, -0.9, 0.7).rotation.set(0.3, 0.4, 0);
  // Two dark angular eye holes
  for (const s of [-1, 1]) {
    part(h.torso, boxGeo(0.55, 0.32, 0.06), ink, s * 0.45, 0.4, 1.01).rotation.z = s * 0.35;
    part(h.torso, boxGeo(0.25, 0.2, 0.06), ink, s * 0.58, 0.25, 1.01).rotation.z = s * -0.3;
  }
  // Round feet (separate from the body)
  for (const s of [-1, 1]) blob(h.body, 0.85, 0.6, 1.1, rockD, s * 0.65, 0.3, 0.1, 0.2);
  // Floating stubby arms
  h.rightArm.position.set(-1.75, 3.2, 0.2);
  h.leftArm.position.set(1.75, 3.2, 0.2);
  for (const arm of [h.rightArm, h.leftArm]) blob(arm, 0.6, 0.85, 0.6, rock, 0, -0.65, 0, 0.15);
  if (level >= 1) {
    // Small orange crystals on the back
    for (const [x, y, rz] of [[-0.5, 0.6, 0.3], [0.2, 0.9, -0.2], [0.6, 0.3, -0.5], [-0.1, 0.1, 0.1]]) shard(h.torso, crystal, x, y, -1.05, 0.3, 0.8, rz, -0.4);
  }
  if (level >= 2) {
    // Shards floating at both hands
    for (const arm of [h.rightArm, h.leftArm]) shard(arm, glow(h, 0xffab40), 0, -1.45, 0, 0.28, 0.75, 0.2);
  }
  if (level >= 3) {
    // Glowing magma cracks
    const magma = glow(h, 0xff6d00);
    for (const [x, y, rz] of [[-0.6, -0.2, 0.6], [-0.35, -0.55, -0.4], [0.5, 0.95, 0.5], [0.75, 0.6, -0.6], [0.3, -0.7, 0.2]]) part(h.torso, boxGeo(0.07, 0.5, 0.05), magma, x, y, 1.02).rotation.z = rz;
    for (const s of [-1, 1]) part(h.torso, boxGeo(0.05, 0.6, 0.07), magma, s * 1.21, -0.3, 0.2).rotation.x = 0.5;
  }
  if (level >= 4) {
    // Crystal crown and an orbiting ring of shards
    const crown = glow(h, 0xffab40);
    for (const [x, len, rz] of [[-0.75, 0.9, 0.35], [-0.35, 1.3, 0.15], [0, 1.7, 0], [0.4, 1.3, -0.15], [0.8, 0.9, -0.35]]) shard(h.torso, crown, x, 1.4 + len / 2, 0.1, 0.38, len, rz);
    const ring = new THREE.Group();
    ring.position.y = 2.6;
    h.body.add(ring);
    const oc = glow(h, 0xff9100);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      shard(ring, oc, Math.cos(a) * 2.2, Math.sin(i * 2) * 0.4, Math.sin(a) * 2.2, 0.3, 0.8, 0.4, 0.3);
    }
    h.spin = [ring];
    h.idleSpin = 2.5;
  }
  const th = hand(h.rightArm, -0.65);
  setMuzzle(h, th, 0, level >= 2 ? -0.9 : -0.5, 0);
  pose(h, -2.6, -0.6, 0.2, -0.3);
  h.swing = 1.9;
  h.bob = 0.15;
  h.projectile = { color: 0xffab40, size: 0.9 + level * 0.1 };
  h.tracer = 0xffab40;
  return h;
}

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
  commanderSpecter,
  djDiscount,
  flamethrowerDumpster,
  warlockWafer,
  ghostbusterLure,
  soldierSparks,
  grenadierSoda,
  assassinFrank,
  boomerangKeith,
  rocketeerBunny,
  aviatorBeebo,
  marksmanFracture,
};

export const UNIT_MODELS_G = {
  bombFloat,
};
