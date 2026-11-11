import * as THREE from 'three';
import { boxGeo, part, makeHumanoid, makeThing, glow, glowThing, holdLongGun, setMuzzle, gunMuzzle } from '../models.js';

// New towers and units (set F). Tower makers take the level index (0-4, 0 = as placed).
// Helpers from models.js are only called inside functions (models.js imports this file, so
// the imports are not ready at module load time). Characters face +Z; the character's right is -X.

/* ------------------------------------------------------------------ helpers */

/** A group in the hand at the end of `arm`; things inside it extend along -Y (down the arm). */
function hand(arm, y = -1.9) {
  const g = new THREE.Group();
  g.position.set(0, y, 0);
  arm.add(g);
  return g;
}

/** An empty group added to `parent`. */
function grp(parent, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.set(rx, ry, rz);
  parent.add(g);
  return g;
}

/** Melee pose: weapon raised over the shoulder, a swing brings it down in front. */
function meleePose(h, right = -2.5, left = -0.8, swing = 2.0) {
  h.rightArm.rotation.set(right, 0, 0.2);
  h.leftArm.rotation.set(left, 0, -0.2);
  h.pose = { right, left, leftRecoil: 0 };
  h.swing = swing;
  h.melee = true;
}

/** Round glasses on the face (two frames with pale lenses and a bridge). */
function roundGlasses(h, frame = 0x4e342e, y = 0.8) {
  const f = h.M(frame);
  const lens = h.M(0xe1f5fe);
  for (const x of [-0.28, 0.28]) {
    part(h.head, boxGeo(0.44, 0.44, 0.05), f, x, y, 0.62);
    part(h.head, boxGeo(0.28, 0.28, 0.05), lens, x, y, 0.64);
  }
  part(h.head, boxGeo(0.16, 0.07, 0.05), f, 0, y + 0.05, 0.63);
}

/** Boxes in a flat ring (tangent segments), e.g. rune rings and halos. */
function ring(parent, n, r, geo, mat, y = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const s = part(parent, geo, mat, Math.cos(a) * r, y, Math.sin(a) * r);
    s.rotation.y = -a + Math.PI / 2;
    out.push(s);
  }
  return out;
}

/** Small glowing sparkles scattered around (fixed spots, so the model never changes between builds). */
function sparkles(o, parent, colors, n, r, y0, y1, size = 0.22) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.4;
    const y = y0 + ((i * 0.618) % 1) * (y1 - y0);
    const rr = r * (0.85 + ((i * 0.37) % 0.3));
    const s = part(parent, boxGeo(size, size, size), glow(o, colors[i % colors.length]), Math.cos(a) * rr, y, Math.sin(a) * rr);
    s.rotation.set(0.6, 0.6, 0.6);
  }
}

/** A see-through glowing material that stays see-through (setOpacity respects keepOpacity). */
function ghostGlow(o, color, op = 0.6) {
  const m = glow(o, color);
  m.transparent = true;
  m.opacity = op;
  m.depthWrite = false;
  m.userData.keepOpacity = op;
  return m;
}

/* ------------------------------------------------------------------ towers */

/**
 * Wizard: a short round wizard in a long lavender robe and a tall bent-tip hat, with round glasses
 * and a small wand. Lv 1 stars on the hat, Lv 2 an orb staff, Lv 3 a floating spell book and a rune
 * ring at its feet (spins, fast when it casts), Lv 4 a big glowing staff, a cape and sparkles.
 */
function scoutWizard(level) {
  const skin = 0xfff3b0;
  const lav = 0xb39ddb;
  const h = makeHumanoid({ skin, shirt: lav, pants: lav, arms: lav, face: 'soldier' });
  const { M } = h;
  h.body.scale.set(0.95, 0.82, 0.95); // short and round
  const robe = M(lav);
  const dark = M(0x7e57c2);
  const skinM = M(skin);
  // Long robe down to the ground, a round belly and a sash
  part(h.body, boxGeo(2.3, 2.1, 1.4), robe, 0, 1.05, 0);
  part(h.body, boxGeo(2.6, 0.4, 1.7), dark, 0, 0.2, 0);
  part(h.torso, boxGeo(2.3, 1.5, 1.3), robe, 0, -0.2, 0.05);
  part(h.torso, boxGeo(2.35, 0.25, 1.35), dark, 0, -0.75, 0.05);
  for (const arm of [h.rightArm, h.leftArm]) {
    part(arm, boxGeo(1.15, 0.45, 1.15), dark, 0, -1.4, 0); // wide sleeve cuff
    part(arm, boxGeo(0.85, 0.4, 0.85), skinM, 0, -1.85, 0); // hand
  }
  roundGlasses(h);
  // Tall pointed hat with a bent tip
  part(h.head, boxGeo(2.0, 0.15, 2.0), robe, 0, 1.25, 0);
  part(h.head, boxGeo(1.35, 0.6, 1.35), robe, 0, 1.6, 0);
  part(h.head, boxGeo(1.4, 0.18, 1.4), dark, 0, 1.4, 0);
  part(h.head, boxGeo(1.0, 0.6, 1.0), robe, 0, 2.15, 0);
  part(h.head, boxGeo(0.7, 0.55, 0.7), robe, 0, 2.7, 0);
  part(h.head, boxGeo(0.45, 0.55, 0.45), robe, 0.12, 3.12, 0).rotation.z = -0.5;
  part(h.head, boxGeo(0.3, 0.5, 0.3), robe, 0.5, 3.35, 0).rotation.z = -1.2;
  if (level >= 1) {
    const star = glow(h, 0xffeb3b);
    for (const [x, y, z] of [[-0.3, 1.65, 0.69], [0.22, 2.2, 0.52], [-0.1, 2.68, 0.37]]) part(h.head, boxGeo(0.24, 0.24, 0.05), star, x, y, z).rotation.z = Math.PI / 4;
    part(h.head, boxGeo(0.2, 0.2, 0.2), star, 0.75, 3.4, 0).rotation.set(0.6, 0.6, 0);
  }
  const wood = M(0x8d6e63);
  const orbC = level >= 4 ? 0xe040fb : 0xb388ff;
  h.leftArm.rotation.set(-0.35, 0, -0.15);
  if (level < 2) {
    // Small wooden wand, pointed at the target
    const g = hand(h.rightArm);
    part(g, boxGeo(0.14, 1.1, 0.14), wood, 0, -0.55, 0);
    part(g, boxGeo(0.18, 0.18, 0.18), level >= 1 ? glow(h, 0xffeb3b) : M(0xfff8e1), 0, -1.12, 0);
    setMuzzle(h, g, 0, -1.25, 0);
    h.rightArm.rotation.set(-1.45, 0, 0.1);
    h.pose = { right: -1.45, left: -0.35, leftRecoil: 0 };
  } else {
    // Staff held upright with a glowing orb on top
    const big = level >= 4;
    const len = big ? 4.8 : 3.8;
    const g = hand(h.rightArm);
    const staff = grp(g, 0, 0, 0, 0.6); // cancels the arm's tilt so the staff stands upright
    part(staff, boxGeo(big ? 0.26 : 0.2, len, big ? 0.26 : 0.2), big ? M(0x4a148c) : wood, 0, len / 2 - 1.2, 0);
    const top = len - 1.2;
    for (const s of [-1, 1]) part(staff, boxGeo(0.12, 0.7, 0.12), big ? M(0xffd54f) : wood, s * 0.3, top + 0.15, 0).rotation.z = -s * 0.35;
    const orb = big ? 0.85 : 0.6;
    part(staff, boxGeo(orb, orb, orb), glow(h, orbC), 0, top + 0.45, 0).rotation.set(0.5, 0.5, 0);
    if (big) {
      for (let i = 0; i < 3; i++) part(staff, boxGeo(0.4, 0.1, 0.4), glow(h, orbC), 0, top - 0.5 - i * 0.4, 0);
      part(staff, boxGeo(1.4, 0.08, 0.08), ghostGlow(h, 0xea80fc, 0.6), 0, top + 0.45, 0).rotation.y = 0.8;
      part(staff, boxGeo(0.08, 0.08, 1.4), ghostGlow(h, 0xea80fc, 0.6), 0, top + 0.45, 0).rotation.y = 0.8;
    }
    setMuzzle(h, staff, 0, top + 0.45, 0);
    h.rightArm.rotation.set(-0.6, 0, 0.15);
    h.pose = { right: -0.6, left: -0.35, leftRecoil: 0 };
  }
  if (level >= 3) {
    // Floating spell book beside him (open, a glowing rune on the pages)
    const book = grp(h.body, 2.0, 3.9, 0.6, 0.5, -0.5, 0);
    for (const s of [-1, 1]) {
      const half = grp(book, s * 0.3, 0, 0, 0, 0, -s * 0.25);
      part(half, boxGeo(0.62, 0.08, 0.95), M(0x6a1b9a), 0, 0, 0);
      part(half, boxGeo(0.56, 0.1, 0.88), M(0xfff8e1), 0, 0.06, 0);
    }
    part(book, boxGeo(0.25, 0.05, 0.25), glow(h, orbC), 0.3, 0.14, 0).rotation.y = Math.PI / 4;
    // Rune ring at his feet; it spins slowly, and fast when he casts
    const runes = grp(h.root, 0, 0.08, 0);
    ring(runes, 14, 2.1, boxGeo(0.9, 0.06, 0.16), ghostGlow(h, orbC, 0.75));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      part(runes, boxGeo(0.35, 0.06, 0.35), glow(h, orbC), Math.cos(a) * 1.65, 0, Math.sin(a) * 1.65).rotation.y = a + Math.PI / 4;
    }
    h.spin = [runes];
    h.idleSpin = 0.8;
  }
  if (level >= 4) {
    // A long cape and sparkles floating around him
    part(h.torso, boxGeo(2.3, 3.6, 0.12), M(0x4527a0), 0, -0.8, -0.72).rotation.x = 0.06;
    part(h.torso, boxGeo(2.4, 0.3, 0.4), M(0xffd54f), 0, 0.95, -0.55); // gold clasp line
    sparkles(h, h.body, [0xffeb3b, 0xea80fc, 0x80d8ff], 7, 2.6, 2.0, 6.5, 0.2);
  }
  h.tracer = orbC;
  return h;
}

/**
 * Chef (melee): a chunky chef with a tall hat, sunglasses and a red neckerchief. His weapon changes
 * every level: a giant spork, a frying pan, a cleaver, a huge whisk, then a meat tenderizer mallet.
 */
function enforcerChef(level) {
  const skin = 0xd7a17b;
  const h = makeHumanoid({ skin, shirt: 0xfafafa, pants: 0x424242, arms: 0xfafafa, face: 'agent' });
  const { M } = h;
  h.body.scale.setScalar(1.05);
  const white = M(0xfafafa);
  const skinM = M(skin);
  const red = M(0xd32f2f);
  // Bulky chest and big arms
  part(h.torso, boxGeo(2.4, 2.0, 1.3), white, 0, 0.05, 0);
  for (const arm of [h.rightArm, h.leftArm]) {
    part(arm, boxGeo(1.3, 1.2, 1.3), white, 0, -0.55, 0);
    part(arm, boxGeo(1.12, 0.8, 1.12), skinM, 0, -1.45, 0); // forearm
    part(arm, boxGeo(1.05, 0.45, 1.05), skinM, 0, -1.9, 0); // fist
    if (level >= 3) part(arm, boxGeo(1.18, 0.25, 1.18), red, 0, -1.15, 0); // wristband
  }
  // Double-breasted buttons
  const btn = M(0x212121);
  for (const y of [0.45, 0, -0.45]) for (const x of [-0.45, 0.45]) part(h.torso, boxGeo(0.16, 0.16, 0.06), btn, x, y, 0.67);
  // Red neckerchief
  part(h.torso, boxGeo(1.3, 0.35, 1.38), red, 0, 0.92, 0);
  part(h.torso, boxGeo(0.5, 0.5, 0.08), red, 0, 0.62, 0.68).rotation.z = Math.PI / 4;
  // Dark shoes
  for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.1, 0.45, 1.25), M(0x212121), 0, -1.78, 0.08);
  // Tall chef's hat
  part(h.head, boxGeo(1.3, 0.45, 1.3), white, 0, 1.38, 0);
  part(h.head, boxGeo(1.7, 1.2, 1.7), white, 0, 2.15, 0);
  for (const x of [-0.5, 0, 0.5]) part(h.head, boxGeo(0.4, 0.3, 1.5), white, x, 2.85, 0);
  if (level >= 2) {
    // Apron
    part(h.torso, boxGeo(1.8, 1.6, 0.08), M(0xcfd8dc), 0, -1.1, 0.7);
    part(h.torso, boxGeo(2.45, 0.2, 1.35), M(0x90a4ae), 0, -0.55, 0);
  }
  if (level >= 1) part(h.torso, boxGeo(0.5, 1.4, 0.1), M(0x90caf9), 0.95, 0.3, 0.68).rotation.z = 0.2; // towel over the shoulder
  if (level >= 4) {
    // Golden badge on the hat and a glowing tie pin
    part(h.head, boxGeo(0.45, 0.45, 0.06), glow(h, 0xffc400), 0, 1.95, 0.87).rotation.z = Math.PI / 4;
  }
  const steel = M(0xcfd8dc);
  const g = hand(h.rightArm);
  let tip = -2.6;
  if (level === 0) {
    // Giant spork
    part(g, boxGeo(0.22, 2.2, 0.22), steel, 0, -1.0, 0);
    part(g, boxGeo(0.95, 1.0, 0.22), steel, 0, -2.5, 0);
    for (const x of [-0.32, 0, 0.32]) part(g, boxGeo(0.15, 0.45, 0.15), steel, x, -3.2, 0);
    tip = -3.0;
  } else if (level === 1) {
    // Black frying pan
    const pan = M(0x212121);
    part(g, boxGeo(0.25, 1.4, 0.3), pan, 0, -0.6, 0);
    part(g, boxGeo(1.9, 1.9, 0.25), pan, 0, -2.2, 0);
    part(g, boxGeo(1.55, 1.55, 0.28), M(0x424242), 0, -2.2, 0);
    tip = -2.4;
  } else if (level === 2) {
    // Cleaver
    part(g, boxGeo(0.3, 0.9, 0.35), M(0x5d4037), 0, -0.35, 0);
    part(g, boxGeo(0.12, 1.9, 1.3), steel, 0, -1.7, 0.4);
    part(g, boxGeo(0.14, 1.9, 0.18), M(0xffffff), 0, -1.7, 1.05);
    part(g, boxGeo(0.16, 0.22, 0.22), btn, 0, -0.95, -0.05);
    tip = -2.4;
  } else if (level === 3) {
    // Huge whisk
    part(g, boxGeo(0.32, 1.3, 0.32), M(0x90a4ae), 0, -0.5, 0);
    for (let k = 0; k < 4; k++) {
      const w = grp(g, 0, 0, 0, 0, (k * Math.PI) / 4, 0);
      for (const s of [-1, 1]) {
        part(w, boxGeo(0.08, 1.4, 0.08), steel, s * 0.55, -2.1, 0).rotation.z = s * 0.25;
        part(w, boxGeo(0.08, 0.6, 0.08), steel, s * 0.45, -3.0, 0).rotation.z = -s * 0.5;
      }
    }
    part(g, boxGeo(0.25, 0.15, 0.25), steel, 0, -3.25, 0);
    tip = -2.8;
  } else {
    // Meat tenderizer mallet, studded, with a glowing band
    part(g, boxGeo(0.32, 2.4, 0.32), M(0x6d4c41), 0, -1.1, 0);
    part(g, boxGeo(1.9, 1.1, 1.1), steel, 0, -2.7, 0);
    for (const s of [-1, 1]) for (const y of [-0.3, 0.3]) for (const z of [-0.3, 0.3]) part(g, boxGeo(0.2, 0.22, 0.22), M(0x90a4ae), s * 1.0, -2.7 + y, z).rotation.x = Math.PI / 4;
    part(g, boxGeo(0.35, 1.15, 1.15), glow(h, 0xff6d00), 0, -2.7, 0);
    tip = -2.7;
  }
  setMuzzle(h, g, 0, tip, 0);
  meleePose(h, -2.5, -0.8, 2.0);
  h.tracer = level >= 4 ? 0xff6d00 : 0xffffff;
  return h;
}

/** A striped awning (alternating yellow / white strips) of width w. */
function awning(u, parent, w, d, x, y, z, tilt = 0.3) {
  const a = grp(parent, x, y, z, tilt);
  const n = Math.max(4, Math.round(w / 0.5));
  const sw = w / n;
  for (let i = 0; i < n; i++) part(a, boxGeo(sw, 0.12, d), i % 2 ? u.M(0xfafafa) : u.M(0xfdd835), -w / 2 + sw * (i + 0.5), 0, 0);
  for (let i = 0; i < n; i++) part(a, boxGeo(sw, 0.25, 0.06), i % 2 ? u.M(0xfafafa) : u.M(0xfdd835), -w / 2 + sw * (i + 0.5), -0.15, d / 2); // valance
  return a;
}

/** A lemonade jug (pale yellow, with a lid and handle). */
function jug(u, parent, x, y, z, s = 1) {
  const g = grp(parent, x, y, z);
  g.scale.setScalar(s);
  part(g, boxGeo(0.6, 0.8, 0.6), u.M(0xfff176), 0, 0.4, 0);
  part(g, boxGeo(0.5, 0.15, 0.5), u.M(0xfafafa), 0, 0.88, 0);
  part(g, boxGeo(0.12, 0.5, 0.15), u.M(0xfafafa), 0.36, 0.45, 0);
  part(g, boxGeo(0.25, 0.25, 0.05), u.M(0xfbc02d), 0, 0.45, 0.31); // lemon label
  return g;
}

/**
 * Yasuke (fast melee, half-dragon): a small fighter with pink horns and skin, a black top with a
 * white flame, pink leggings and tall boots. Lv 0 a wooden practice sword, Lv 1 a katana, Lv 2 a
 * second sword on the back and a scarf, Lv 3 dragon scales and small wings, Lv 4 big wings, a tail
 * and a glowing orange katana.
 */
function kniferYasuke(level) {
  const skin = 0xf8bbd0;
  const h = makeHumanoid({ skin, shirt: 0x212121, pants: 0xf48fb1, arms: skin, face: 'soldier' });
  const { M } = h;
  h.body.scale.setScalar(0.85);
  const black = M(0x1a1a1a);
  const hornM = M(0xff4081);
  // Dark hair with spiky bangs
  part(h.head, boxGeo(1.35, 0.4, 1.35), black, 0, 1.32, 0);
  part(h.head, boxGeo(1.35, 1.0, 0.3), black, 0, 0.75, -0.65);
  for (const x of [-0.4, 0, 0.4]) part(h.head, boxGeo(0.35, 0.35, 0.15), black, x, 1.1, 0.62).rotation.z = Math.PI / 4;
  for (const s of [-1, 1]) {
    part(h.head, boxGeo(0.15, 0.6, 0.5), black, s * 0.66, 0.85, 0.2);
    // Curved pink horns
    part(h.head, boxGeo(0.22, 0.5, 0.22), hornM, s * 0.45, 1.5, 0.05).rotation.z = -s * 0.4;
    part(h.head, boxGeo(0.18, 0.45, 0.18), hornM, s * 0.6, 1.85, -0.1).rotation.set(-0.7, 0, -s * 0.5);
    part(h.head, boxGeo(0.13, 0.3, 0.13), hornM, s * 0.66, 2.0, -0.38).rotation.x = -1.3;
  }
  // White flame emblem on the chest
  const white = M(0xfafafa);
  part(h.torso, boxGeo(0.6, 0.35, 0.05), white, 0, 0.0, 0.52);
  part(h.torso, boxGeo(0.42, 0.35, 0.05), white, 0.04, 0.3, 0.52);
  part(h.torso, boxGeo(0.2, 0.35, 0.05), white, -0.06, 0.6, 0.52);
  part(h.torso, boxGeo(0.14, 0.25, 0.05), white, 0.25, 0.48, 0.52);
  part(h.torso, boxGeo(2.1, 0.25, 1.08), M(0x880e4f), 0, -0.85, 0); // sash belt
  for (const arm of [h.rightArm, h.leftArm]) {
    part(arm, boxGeo(1.06, 0.6, 1.06), black, 0, -0.3, 0); // short sleeve
    part(arm, boxGeo(1.06, 0.6, 1.06), black, 0, -1.72, 0); // glove
  }
  for (const leg of [h.rightLeg, h.leftLeg]) {
    part(leg, boxGeo(1.08, 1.1, 1.1), M(0x2b1d16), 0, -1.45, 0.02); // tall boots
    part(leg, boxGeo(1.08, 0.3, 0.3), M(0x2b1d16), 0, -1.85, 0.6);
  }
  if (level >= 2) {
    // Second katana sheathed on the back, and a red scarf
    const sheath = part(h.torso, boxGeo(0.25, 2.8, 0.3), M(0x4a148c), 0, 0.2, -0.68);
    sheath.rotation.z = 0.7;
    part(h.torso, boxGeo(0.22, 0.7, 0.22), black, -1.13, 1.54, -0.68).rotation.z = 0.7;
    const scarf = M(0xc62828);
    part(h.torso, boxGeo(1.5, 0.4, 1.3), scarf, 0, 1.05, 0);
    part(h.torso, boxGeo(0.4, 1.2, 0.12), scarf, 0.4, 0.4, -0.68).rotation.z = -0.2;
    part(h.torso, boxGeo(0.35, 0.9, 0.12), scarf, 0.75, -0.2, -0.95).rotation.set(0.5, 0, -0.4);
  }
  if (level >= 3) {
    // Dragon scales on the arms
    const scaleM = M(0xad1457);
    for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
      for (const [y, z] of [[-0.75, 0.2], [-1.0, -0.15], [-1.25, 0.2], [-0.9, 0.48]]) part(arm, boxGeo(0.12, 0.28, 0.28), scaleM, s * 0.54, y, z).rotation.x = Math.PI / 4;
    }
  }
  if (level >= 3) {
    // Dragon wings: small at Lv 3, big at Lv 4
    const big = level >= 4;
    const W = big ? 2.6 : 1.4;
    const H = big ? 2.0 : 1.2;
    const bone = M(0x4a0e2b);
    const skinW = M(0x880e4f);
    for (const s of [-1, 1]) {
      const w = grp(h.torso, s * 0.4, 0.6, -0.6, 0, s * 0.5, s * 0.25);
      part(w, boxGeo(W, 0.15, 0.15), bone, s * W / 2, H / 2, 0);
      part(w, boxGeo(W * 0.9, H, 0.08), skinW, s * W * 0.48, 0, 0);
      for (let i = 0; i < 3; i++) part(w, boxGeo(0.1, H * (0.9 - i * 0.2), 0.12), bone, s * W * (0.3 + i * 0.3), H * (0.05 + i * 0.1), 0);
      part(w, boxGeo(0.2, 0.3, 0.2), hornM, s * W, H / 2 + 0.15, 0); // claw
    }
  }
  if (level >= 4) {
    // Dragon tail with a spade tip
    const tailM = M(0xf48fb1);
    part(h.torso, boxGeo(0.5, 0.5, 0.8), tailM, 0, -0.9, -0.85);
    part(h.torso, boxGeo(0.4, 0.4, 0.8), tailM, 0, -1.15, -1.5).rotation.x = 0.3;
    part(h.torso, boxGeo(0.3, 0.3, 0.7), tailM, 0, -1.2, -2.15).rotation.x = -0.3;
    part(h.torso, boxGeo(0.6, 0.12, 0.6), hornM, 0, -1.0, -2.6).rotation.y = Math.PI / 4;
    for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.25, 0.12, 0.05), glow(h, 0xff6d00), x, 0.82, 0.62); // glowing eyes
  }
  // Sword in the right hand
  const g = hand(h.rightArm);
  let tip;
  if (level === 0) {
    const wood = M(0xc8a165);
    part(g, boxGeo(0.25, 0.6, 0.25), M(0x6d4c41), 0, -0.2, 0);
    part(g, boxGeo(0.6, 0.12, 0.45), M(0x6d4c41), 0, -0.55, 0);
    part(g, boxGeo(0.18, 1.8, 0.32), wood, 0, -1.5, 0);
    tip = -2.4;
  } else {
    const blade = level >= 4 ? glow(h, 0xff6d00) : M(0xeceff1);
    part(g, boxGeo(0.22, 0.8, 0.22), black, 0, -0.25, 0);
    part(g, boxGeo(0.55, 0.1, 0.55), M(0xffc107), 0, -0.68, 0); // tsuba
    part(g, boxGeo(0.08, 1.3, 0.3), blade, 0, -1.38, 0);
    const curve = grp(g, 0, -2.0, 0, 0.18);
    part(curve, boxGeo(0.08, 1.0, 0.28), blade, 0, -0.5, 0);
    part(curve, boxGeo(0.08, 0.35, 0.16), blade, 0, -1.15, 0.05);
    tip = -3.2;
  }
  setMuzzle(h, g, 0, tip, 0);
  meleePose(h, -2.4, -0.9, 2.2);
  h.tracer = level >= 4 ? 0xff6d00 : 0xffffff;
  return h;
}

/**
 * Maitake (poison flask thrower, mushroom witch): pale blue skin, long straight black hair over her
 * face with one curl on top, a plum dress, a purple potion tube (thrown, muzzle there) and a blue
 * orb. Lv 1 a potion belt, Lv 2 a bubbling cauldron, Lv 3 floating flasks, Lv 4 a frilly mushroom
 * cap hat and glowing green spores.
 */
function toxicnatorMaitake(level) {
  const skin = 0xb3e5fc;
  const plum = 0x4a1942;
  const h = makeHumanoid({ skin, shirt: plum, pants: plum, arms: plum, face: 'smile' });
  const { M } = h;
  h.body.scale.setScalar(0.8);
  const dress = M(plum);
  const skinM = M(skin);
  part(h.body, boxGeo(2.4, 2.2, 1.5), dress, 0, 1.1, 0);
  part(h.body, boxGeo(2.7, 0.3, 1.8), M(0x38102f), 0, 0.15, 0);
  for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(0.95, 0.4, 0.95), skinM, 0, -1.85, 0);
  // Long straight black hair covering much of her face, with one curl on top
  const hair = M(0x111111);
  part(h.head, boxGeo(1.35, 0.35, 1.35), hair, 0, 1.33, 0);
  part(h.head, boxGeo(1.35, 2.6, 0.25), hair, 0, -0.1, -0.7);
  for (const s of [-1, 1]) part(h.head, boxGeo(0.2, 2.3, 1.25), hair, s * 0.7, 0.05, -0.05);
  part(h.head, boxGeo(1.3, 0.55, 0.12), hair, 0, 1.0, 0.65);
  part(h.head, boxGeo(0.4, 0.75, 0.12), hair, 0.38, 0.55, 0.66);
  part(h.head, boxGeo(0.15, 0.4, 0.15), hair, 0, 1.65, 0.1);
  part(h.head, boxGeo(0.15, 0.15, 0.4), hair, 0, 1.85, 0.25);
  part(h.head, boxGeo(0.15, 0.3, 0.15), hair, 0, 1.72, 0.42);
  part(h.head, boxGeo(0.18, 0.12, 0.04), glow(h, 0x40c4ff), -0.3, 0.66, 0.62); // one eye peeking out
  // Purple potion tube in the right hand (thrown), a glowing blue orb in the left
  const pot = hand(h.rightArm, -2.0);
  part(pot, boxGeo(0.3, 0.9, 0.3), glow(h, 0xaa00ff), 0, -0.45, 0);
  part(pot, boxGeo(0.34, 0.15, 0.34), M(0x8d6e63), 0, 0.05, 0);
  setMuzzle(h, pot, 0, -0.5, 0);
  const orbHand = hand(h.leftArm, -2.0);
  part(orbHand, boxGeo(0.6, 0.6, 0.6), glow(h, 0x40c4ff), 0, -0.2, 0).rotation.set(0.6, 0.6, 0);
  if (level >= 1) {
    // Potion belt
    part(h.torso, boxGeo(2.15, 0.3, 1.15), M(0x5d4037), 0, -0.9, 0);
    const cols = [0x76ff03, 0xaa00ff, 0x40c4ff, 0xff4081];
    [-0.75, -0.25, 0.25, 0.75].forEach((x, i) => part(h.torso, boxGeo(0.22, 0.45, 0.22), glow(h, cols[i]), x, -0.95, 0.62));
  }
  if (level >= 2) {
    // A small bubbling cauldron beside her
    const c = grp(h.root, 2.2, 0, 0.6);
    const iron = M(0x263238);
    for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [0, 0.5]]) part(c, boxGeo(0.2, 0.4, 0.2), iron, x, 0.2, z);
    part(c, boxGeo(1.5, 1.0, 1.5), iron, 0, 0.85, 0);
    part(c, boxGeo(1.7, 0.2, 1.7), M(0x37474f), 0, 1.4, 0);
    part(c, boxGeo(1.3, 0.1, 1.3), glow(h, 0x76ff03), 0, 1.42, 0);
    for (const [x, y, z, s] of [[0.2, 1.6, 0.1, 0.25], [-0.3, 1.75, -0.2, 0.2], [0.1, 1.95, -0.3, 0.15]]) part(c, boxGeo(s, s, s), glow(h, 0xb2ff59), x, y, z);
  }
  if (level >= 3) {
    // Floating flasks around her
    const cols = [0xaa00ff, 0x76ff03, 0x40c4ff, 0xff4081];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const f = grp(h.body, Math.cos(a) * 2.4, 3.2 + (i % 2) * 0.9, Math.sin(a) * 2.4, 0.2, a, 0.3);
      part(f, boxGeo(0.45, 0.55, 0.45), glow(h, cols[i]), 0, 0, 0);
      part(f, boxGeo(0.18, 0.3, 0.18), M(0xe0f7fa), 0, 0.42, 0);
      part(f, boxGeo(0.22, 0.12, 0.22), M(0x8d6e63), 0, 0.62, 0);
    }
  }
  if (level >= 4) {
    // Big frilly mushroom cap hat
    const cap = M(0x7b1fa2);
    part(h.head, boxGeo(1.45, 0.3, 1.45), M(0x4a148c), 0, 1.5, 0);
    part(h.head, boxGeo(2.9, 0.12, 2.9), M(0xce93d8), 0, 1.62, 0); // frill
    part(h.head, boxGeo(2.6, 0.55, 2.6), cap, 0, 1.92, 0);
    part(h.head, boxGeo(1.8, 0.45, 1.8), cap, 0, 2.4, 0);
    part(h.head, boxGeo(1.0, 0.3, 1.0), cap, 0, 2.75, 0);
    const spot = M(0xfafafa);
    for (const [x, z] of [[-0.8, 0.6], [0.7, 0.4], [0.2, -0.8], [-0.4, -0.3]]) part(h.head, boxGeo(0.35, 0.08, 0.35), spot, x, x * x < 0.5 && z * z < 0.5 ? 2.64 : 2.2, z);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      part(h.head, boxGeo(0.3, 0.3, 0.12), M(0xce93d8), Math.cos(a) * 1.4, 1.48, Math.sin(a) * 1.4).rotation.y = -a + Math.PI / 2;
    }
    sparkles(h, h.body, [0xb2ff59, 0x76ff03], 8, 2.2, 1.0, 6.0, 0.18);
  }
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-1.0, 0, -0.3);
  h.pose = { right: -2.8, left: -1.0, leftRecoil: 0 };
  h.swing = 1.9;
  h.tracer = 0xaa00ff;
  h.projectile = { color: 0xaa00ff, size: level >= 4 ? 0.6 : 0.5, arc: 3.5, glowing: true };
  return h;
}

/**
 * Branch (plant monster): a round pinkish-brown head with two leaves, a thick green scarf and a
 * skirt of leaf fronds. Shoots seeds from its mouth (muzzle). Lv 1 more leaves and thorns, Lv 2
 * vine arms (seed pods at the tips become extra muzzles), Lv 3 flowers, Lv 4 a bloom crown and
 * glowing seed pods.
 */
function sparkBranch(level) {
  const u = makeThing();
  const { M } = u;
  const greens = [M(0x2e7d32), M(0x388e3c), M(0x43a047)];
  // Leaf-frond skirt (3 rings of fronds round a dark core)
  part(u.body, boxGeo(2.0, 3.0, 2.0), M(0x1b5e20), 0, 1.6, 0);
  const rings = [[0.7, 1.35, 10], [1.6, 1.2, 9], [2.5, 1.0, 8]];
  const pivots = [];
  rings.forEach(([y, r, n], ri) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ri * 0.3;
      const p = grp(u.body, 0, y, 0, 0, a, 0);
      part(p, boxGeo(0.6, 1.5, 0.16), greens[(i + ri) % 3], 0, 0, r).rotation.x = -0.3;
      pivots.push({ p, r, y });
      if (level >= 1 && i % 2 === 0) part(p, boxGeo(0.1, 0.3, 0.1), M(0xbcaaa4), 0, 0.1, r + 0.3).rotation.x = 1.2; // thorns
    }
  });
  // Round head
  const head = M(0x7b4a52);
  const hy = 4.1;
  part(u.body, boxGeo(2.0, 1.5, 1.7), head, 0, hy, 0);
  part(u.body, boxGeo(1.7, 1.8, 1.7), head, 0, hy, 0);
  part(u.body, boxGeo(1.7, 1.5, 2.0), head, 0, hy, 0);
  const eye = M(0x111111);
  for (const x of [-0.42, 0.42]) part(u.body, boxGeo(0.22, 0.32, 0.06), eye, x, hy + 0.3, 1.01);
  part(u.body, boxGeo(0.55, 0.4, 0.06), M(0x3e1f24), 0, hy - 0.3, 1.01); // mouth
  part(u.body, boxGeo(0.7, 0.08, 0.06), M(0x9c6470), 0, hy - 0.08, 1.02); // lip
  const mouth = gunMuzzle(u, u.body, 0, hy - 0.3, 1.2);
  // Two leaves on top (more from Lv 1)
  part(u.body, boxGeo(0.12, 0.45, 0.12), M(0x33691e), 0, hy + 1.05, 0);
  const leafM = M(0x66bb6a);
  const leaves = level >= 1 ? 4 : 2;
  for (let i = 0; i < leaves; i++) {
    const a = (i / leaves) * Math.PI * 2;
    const l = grp(u.body, 0, hy + 1.2, 0, 0, a, 0);
    part(l, boxGeo(0.55, 0.1, 1.2), leafM, 0, 0.25, 0.55).rotation.x = -0.45;
  }
  // Thick dark-green scarf
  const scarf = M(0x1b5e20);
  part(u.body, boxGeo(2.3, 0.6, 2.1), scarf, 0, 3.2, 0);
  part(u.body, boxGeo(0.45, 1.1, 0.16), scarf, 0.6, 2.6, 1.1).rotation.z = 0.15;
  part(u.body, boxGeo(0.5, 0.4, 0.3), scarf, 0.55, 3.15, 1.05);
  const podC = level >= 4 ? null : 0x827717;
  if (level >= 2) {
    // Vine arms reaching forward, each with a seed pod
    const vine = M(0x558b2f);
    for (const s of [-1, 1]) {
      const v = grp(u.body, s * 1.05, 2.8, 0.2);
      for (const [x, y, z] of [[0.3, 0.1, 0.3], [0.55, 0.3, 0.8], [0.65, 0.6, 1.3], [0.62, 0.9, 1.8]]) part(v, boxGeo(0.32, 0.32, 0.6), vine, s * x, y, z).rotation.y = s * 0.3;
      part(v, boxGeo(0.55, 0.55, 0.55), podC ? M(podC) : glowThing(u, 0xc6ff00), s * 0.6, 1.0, 2.25).rotation.set(0.5, 0.5, 0);
      gunMuzzle(u, v, s * 0.6, 1.0, 2.6);
    }
  }
  if (level >= 3) {
    // Flowers bloom on the body
    const petal = M(0xf06292);
    const center = M(0xffeb3b);
    pivots.forEach(({ p, r }, i) => {
      if (i % 3) return;
      const f = grp(p, 0, 0.1, r + 0.25);
      part(f, boxGeo(0.22, 0.22, 0.08), center, 0, 0, 0.04);
      for (const [x, y] of [[0.22, 0], [-0.22, 0], [0, 0.22], [0, -0.22]]) part(f, boxGeo(0.22, 0.22, 0.06), petal, x, y, 0);
    });
  }
  if (level >= 4) {
    // Big bloom crown round the top of the head, and glowing seed pods on the skirt
    const bloom = glowThing(u, 0xff80ab);
    bloom.emissiveIntensity = 0.45;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const p = grp(u.body, 0, hy + 0.85, 0, 0, a, 0);
      part(p, boxGeo(0.65, 0.12, 1.0), bloom, 0, 0.2, 0.95).rotation.x = -0.6;
    }
    part(u.body, boxGeo(0.6, 0.3, 0.6), glowThing(u, 0xffeb3b), 0, hy + 1.0, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(u.body, boxGeo(0.35, 0.35, 0.35), glowThing(u, 0xc6ff00), Math.cos(a) * 1.55, 0.5, Math.sin(a) * 1.55).rotation.y = a;
    }
  }
  u.tracer = 0x9ccc65;
  u.projectile = { color: level >= 4 ? 0xc6ff00 : 0x827717, size: 0.4, glowing: level >= 4 };
  return u;
}

/**
 * Scientist: green skin, fluffy pink hair, round glasses, a lab coat over a dark tie, and a glowing
 * purple electric rod. Lv 1 goggles on her head, Lv 2 a backpack generator, Lv 3 tesla coils on the
 * pack and a bigger rod, Lv 4 a second rod in the other hand (two muzzles) and arcs over the pack.
 */
function railgunnerScientist(level) {
  const skin = 0x9ccc65;
  const h = makeHumanoid({ skin, shirt: 0xfafafa, pants: 0x37474f, arms: 0xfafafa, face: 'smile' });
  const { M } = h;
  const white = M(0xfafafa);
  const skinM = M(skin);
  const purple = glow(h, 0xb388ff);
  // Shirt, tie and lab-coat tails
  part(h.torso, boxGeo(0.7, 1.9, 0.06), M(0xb3e5fc), 0, 0, 0.51);
  part(h.torso, boxGeo(0.25, 1.4, 0.08), M(0x263238), 0, 0.1, 0.54);
  for (const s of [-1, 1]) part(h.torso, boxGeo(0.25, 1.6, 0.08), M(0xe0e0e0), s * 0.48, 0.1, 0.53).rotation.z = s * 0.15; // lapels
  part(h.torso, boxGeo(2.1, 1.3, 1.1), white, 0, -1.55, 0);
  part(h.torso, boxGeo(0.4, 0.5, 0.06), M(0x90caf9), 0.6, 0.3, 0.52); // pocket with pens
  for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.02, 0.4, 1.02), skinM, 0, -1.82, 0);
  // Fluffy pink hair
  const pink = M(0xf48fb1);
  part(h.head, boxGeo(1.45, 0.5, 1.45), pink, 0, 1.35, 0);
  part(h.head, boxGeo(1.4, 1.1, 0.4), pink, 0, 0.8, -0.7);
  for (const s of [-1, 1]) {
    part(h.head, boxGeo(0.35, 0.9, 1.1), pink, s * 0.72, 0.85, -0.1);
    part(h.head, boxGeo(0.55, 0.55, 0.55), pink, s * 0.75, 1.45, -0.45);
  }
  part(h.head, boxGeo(0.55, 0.45, 0.55), pink, -0.35, 1.7, 0.2);
  part(h.head, boxGeo(0.5, 0.45, 0.5), pink, 0.3, 1.75, -0.2);
  roundGlasses(h, 0x37474f);
  if (level >= 1) {
    // Goggles pushed up onto her head
    part(h.head, boxGeo(1.5, 0.18, 1.5), M(0x37474f), 0, 1.2, 0);
    for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.4, 0.35, 0.15), M(0xffb300), x, 1.3, 0.75);
  }
  if (level >= 2) {
    // Backpack generator with a glowing window and a cable to the rod
    part(h.torso, boxGeo(1.6, 1.8, 0.9), M(0x546e7a), 0, 0.1, -0.95);
    part(h.torso, boxGeo(0.9, 0.5, 0.06), purple, 0, 0.35, -1.42);
    for (const x of [-0.45, 0.45]) part(h.torso, boxGeo(0.25, 0.25, 0.06), M(0xffeb3b), x, -0.4, -1.42);
    part(h.torso, boxGeo(0.22, 0.22, 1.4), M(0x212121), -1.0, -0.6, -0.35);
  }
  if (level >= 3) {
    // Tesla coils on the pack
    for (const x of [-0.45, 0.45]) {
      part(h.torso, boxGeo(0.3, 1.3, 0.3), M(0xb87333), x, 1.6, -0.95);
      for (let i = 0; i < 3; i++) part(h.torso, boxGeo(0.42, 0.08, 0.42), M(0x8d4f1f), x, 1.2 + i * 0.35, -0.95);
      part(h.torso, boxGeo(0.45, 0.45, 0.45), purple, x, 2.4, -0.95);
    }
  }
  if (level >= 4) {
    // Arcs crackling between the coils
    const arc = glow(h, 0xea80fc);
    for (let i = 0; i < 3; i++) part(h.torso, boxGeo(0.35, 0.06, 0.06), arc, -0.3 + i * 0.3, 2.4 + (i % 2 ? 0.15 : -0.1), -0.95).rotation.z = i % 2 ? 0.5 : -0.5;
  }
  // The electric rod (or rods)
  const len = level >= 3 ? 2.4 : 1.8;
  const rodMat = M(0x37474f);
  const gun = holdLongGun(h, len, rodMat);
  const rings = level >= 3 ? 3 : 2;
  for (let i = 0; i < rings; i++) part(gun, boxGeo(0.45, 0.12, 0.55), purple, 0, -0.6 - i * 0.4, 0);
  const tipS = level >= 3 ? 0.55 : 0.4;
  part(gun, boxGeo(tipS, tipS, tipS), purple, 0, -len, 0).rotation.y = Math.PI / 4;
  if (level >= 3) for (const s of [-1, 1]) part(gun, boxGeo(0.08, 0.6, 0.08), glow(h, 0xea80fc), s * 0.35, -len + 0.15, 0).rotation.z = s * 0.4;
  h.muzzles[0].position.y = -len - 0.25;
  if (level >= 4) {
    // Second rod in the left hand; shots alternate between the two
    const g2 = hand(h.leftArm);
    part(g2, boxGeo(0.32, len, 0.42), rodMat, 0, -len / 2, 0);
    for (let i = 0; i < rings; i++) part(g2, boxGeo(0.45, 0.12, 0.55), purple, 0, -0.6 - i * 0.4, 0);
    part(g2, boxGeo(tipS, tipS, tipS), purple, 0, -len, 0).rotation.y = Math.PI / 4;
    const m2 = new THREE.Object3D();
    m2.position.set(0, -len - 0.25, 0);
    g2.add(m2);
    h.muzzles.push(m2);
    h.leftArm.rotation.set(-Math.PI / 2, 0, -0.1);
    h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
  }
  h.tracer = 0xb388ff;
  return h;
}

/**
 * Voca (idol with fireworks, lobbed splash): a small girl with long light-pink hair, a yellow star
 * clip and a blue bowtie. Lv 0 a striped skirt and a handheld firework, Lv 1 a blue top hat, white
 * tights and a sparkler, Lv 2 a bigger hat with a sash, a pink puffy-collar shirt and a red firework
 * tube on her shoulder, Lv 3 a red shirt, spiky skirt and yellow shoulder pads, Lv 4 a stage with
 * firework racks (extra muzzles) - she is lifted onto it (h.lift).
 */
function mortarVoca(level) {
  const skin = 0xffe0bd;
  const shirt = level >= 3 ? 0xe53935 : level >= 2 ? 0xf06292 : 0xfafafa;
  const h = makeHumanoid({ skin, shirt, pants: level >= 1 ? 0xfafafa : skin, arms: skin, face: 'smile' });
  const { M } = h;
  h.body.scale.setScalar(0.85);
  const black = M(0x212121);
  const shirtM = M(shirt);
  // Short sleeves, shoes
  for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.06, 0.6, 1.06), shirtM, 0, -0.3, 0);
  for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.05, 0.4, 1.15), black, 0, -1.8, 0.05);
  // Long light-pink hair
  const hair = M(0xf8bbd0);
  part(h.head, boxGeo(1.4, 0.4, 1.4), hair, 0, 1.3, 0);
  part(h.head, boxGeo(1.4, 2.8, 0.35), hair, 0, -0.2, -0.72);
  for (const s of [-1, 1]) part(h.head, boxGeo(0.3, 2.2, 0.5), hair, s * 0.75, 0.1, -0.2);
  part(h.head, boxGeo(1.3, 0.3, 0.15), hair, 0, 1.08, 0.62);
  part(h.head, boxGeo(0.08, 0.35, 0.35), M(0xffeb3b), 0.78, 1.0, 0.3).rotation.x = Math.PI / 4; // star clip
  // Blue bowtie
  const blue = M(0x1e88e5);
  for (const s of [-1, 1]) part(h.torso, boxGeo(0.35, 0.3, 0.1), blue, s * 0.22, 0.8, 0.54);
  part(h.torso, boxGeo(0.15, 0.15, 0.12), blue, 0, 0.8, 0.55);
  // Skirt: pink stripes on white (Lv 0), red stripes (Lv 1-2), a spiky red skirt (Lv 3+)
  const skirtBase = M(level >= 3 ? 0xc62828 : level >= 1 ? 0xfafafa : 0xf48fb1);
  const stripe = M(level >= 1 ? 0xe53935 : 0xfafafa);
  part(h.body, boxGeo(2.4, 1.0, 1.4), skirtBase, 0, 1.75, 0);
  if (level < 3) for (let i = 0; i < 5; i++) part(h.body, boxGeo(0.15, 1.0, 1.42), stripe, -0.9 + i * 0.45, 1.75, 0);
  else {
    const spike = M(0x212121);
    for (let i = 0; i < 6; i++) part(h.body, boxGeo(0.4, 0.4, 0.08), spike, -1.0 + i * 0.4, 1.25, 0.72).rotation.z = Math.PI / 4;
    for (const s of [-1, 1]) for (const z of [-0.4, 0.2]) part(h.body, boxGeo(0.08, 0.4, 0.4), spike, s * 1.22, 1.25, z).rotation.x = Math.PI / 4;
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.3, 0.35, 1.3), M(0xffd54f), 0, -0.05, 0); // shoulder pads
  }
  if (level >= 2) {
    // Puffy white collar
    part(h.torso, boxGeo(2.3, 0.35, 1.3), M(0xfafafa), 0, 0.98, 0);
    for (const s of [-1, 1]) part(h.torso, boxGeo(0.6, 0.35, 0.3), M(0xfafafa), s * 0.55, 0.8, 0.6).rotation.z = s * 0.4;
  }
  if (level >= 1) {
    // Blue top hat with a star (bigger with a sash from Lv 2)
    const big = level >= 2;
    const hat = grp(h.head, 0.1, 1.3, 0, 0, 0, -0.12);
    const hatM = M(0x1565c0);
    part(hat, boxGeo(big ? 1.9 : 1.6, 0.12, big ? 1.9 : 1.6), hatM, 0, 0.06, 0);
    const ch = big ? 1.4 : 0.9;
    part(hat, boxGeo(big ? 1.25 : 1.0, ch, big ? 1.25 : 1.0), hatM, 0, 0.1 + ch / 2, 0);
    part(hat, boxGeo(0.32, 0.32, 0.05), glow(h, 0xffeb3b), 0, 0.15 + ch / 2, (big ? 0.63 : 0.51)).rotation.z = Math.PI / 4;
    if (big) {
      part(hat, boxGeo(1.3, 0.3, 1.3), M(0xe91e63), 0, 0.3, 0);
      part(hat, boxGeo(0.3, 1.0, 0.08), M(0xe91e63), 0.4, -0.3, -0.66).rotation.z = 0.2;
    }
  }
  // Fireworks
  let tube = null;
  if (level <= 1) {
    const g = hand(h.rightArm);
    if (level === 0) {
      // Handheld firework rocket
      part(g, boxGeo(0.08, 0.8, 0.08), M(0x8d6e63), 0, 0.1, 0);
      part(g, boxGeo(0.35, 0.7, 0.35), M(0xe53935), 0, -0.5, 0);
      part(g, boxGeo(0.2, 0.25, 0.2), M(0xffeb3b), 0, -0.95, 0);
      setMuzzle(h, g, 0, -1.1, 0);
    } else {
      // Sparkler
      part(g, boxGeo(0.08, 1.4, 0.08), M(0x9e9e9e), 0, -0.6, 0);
      part(g, boxGeo(0.25, 0.5, 0.25), glow(h, 0xffeb3b), 0, -1.2, 0);
      for (const [x, z] of [[0.3, 0], [-0.25, 0.2], [0, -0.3]]) part(g, boxGeo(0.1, 0.1, 0.1), glow(h, 0xfff59d), x, -1.5, z);
      setMuzzle(h, g, 0, -1.45, 0);
    }
    h.rightArm.rotation.set(-2.8, 0, 0.2);
    h.leftArm.rotation.set(-0.4, 0, -0.4);
    h.pose = { right: -2.8, left: -0.4, leftRecoil: 0 };
  } else {
    // Red firework launcher tube on her right shoulder, angled up and forward
    const big = level >= 3;
    const w = big ? 0.85 : 0.7;
    const len = big ? 2.8 : 2.4;
    tube = grp(h.torso, -1.5, 1.35, -0.1, 0.6);
    part(tube, boxGeo(w, len, w), M(0xd32f2f), 0, len / 2 - 0.6, 0);
    const band = level >= 4 ? glow(h, 0xffd740) : M(0xffc107);
    for (const y of [-0.3, len - 0.8]) part(tube, boxGeo(w + 0.12, 0.2, w + 0.12), band, 0, y, 0);
    part(tube, boxGeo(w + 0.15, 0.25, w + 0.15), M(0x212121), 0, len - 0.55, 0);
    setMuzzle(h, tube, 0, len - 0.3, 0);
    h.rightArm.rotation.set(-1.2, 0, 0.2);
    h.leftArm.rotation.set(-1.0, 0, -0.5);
    h.pose = { right: -1.2, left: -1.0, leftRecoil: 0 };
  }
  if (level >= 4) {
    // A small stage with lights and firework racks either side
    const stage = M(0x4a148c);
    part(h.root, boxGeo(4.6, 0.6, 3.6), stage, 0, 0.3, 0);
    part(h.root, boxGeo(4.7, 0.12, 3.7), M(0xffd54f), 0, 0.62, 0);
    const lights = [0xff4081, 0xffeb3b, 0x40c4ff];
    for (let i = 0; i < 7; i++) part(h.root, boxGeo(0.3, 0.25, 0.08), glow(h, lights[i % 3]), -1.8 + i * 0.6, 0.3, 1.82);
    for (const s of [-1, 1]) {
      const rack = grp(h.root, s * 1.85, 0.6, -1.1);
      part(rack, boxGeo(0.9, 0.8, 0.9), M(0x37474f), 0, 0.4, 0);
      for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) {
        const t = grp(rack, x, 0.8, z, 0.35);
        part(t, boxGeo(0.24, 1.0, 0.24), M(0xd32f2f), 0, 0.5, 0);
        part(t, boxGeo(0.26, 0.15, 0.26), glow(h, lights[(x > 0 ? 1 : 0) + (z > 0 ? 1 : 0)]), 0, 1.0, 0);
      }
      const m = new THREE.Object3D();
      m.position.set(0, 2.0, 0.4);
      rack.add(m);
      h.muzzles.push(m);
    }
    h.lift = 0.6;
    h.bob = 0.04;
  }
  h.recoilScale = 0.4;
  h.tracer = 0xff4081;
  h.projectile = { color: level >= 4 ? 0xffd740 : 0xff4081, size: 0.6 + level * 0.08, arc: 16, glowing: true };
  return h;
}

/**
 * Quinn (plant archer, very long range): a light-green spotted plant girl with bulb hair, leaves
 * and flower-bulb buns, pale rags, a pendant and a small bow (muzzle at the arrow tip). Lv 1 a
 * bandana, hunter outfit, boots, gloves and a yellow flower, Lv 2 a green hoodie with yellow
 * flowers, a belt and a bigger pink-tipped bow, Lv 3 a mask and glowing yellow eyes, Lv 4 a huge
 * bow and mushrooms / spores around her.
 */
function sniperQuinn(level) {
  const skin = 0xc5e1a5;
  const shirt = [0xdcedc8, 0x689f38, 0x388e3c, 0x2e7d32, 0x1b5e20][level];
  const pants = [0xaed581, 0x558b2f, 0x33691e, 0x33691e, 0x263238][level];
  const h = makeHumanoid({ skin, shirt, pants, arms: level >= 2 ? shirt : skin, face: 'smile' });
  const { M } = h;
  h.body.scale.setScalar(0.92);
  const shirtM = M(shirt);
  const spot = M(0x9ccc65);
  // Spots on the skin
  for (const [x, y, z] of [[0.61, 0.4, 0.2], [-0.61, 0.7, -0.2], [0.42, 0.32, 0.61]]) part(h.head, boxGeo(x === 0.42 ? 0.14 : 0.04, 0.14, x === 0.42 ? 0.04 : 0.14), spot, x, y, z);
  if (level < 2) for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.02, 0.18, 0.3), spot, 0, -0.8, 0.2);
  // Bulb hair, two leaves and flower-bulb buns
  const bulb = M(0x7cb342);
  part(h.head, boxGeo(1.4, 0.7, 1.4), bulb, 0, 1.45, 0);
  part(h.head, boxGeo(1.0, 0.4, 1.0), bulb, 0, 1.95, 0);
  part(h.head, boxGeo(0.3, 0.3, 0.3), bulb, 0, 2.25, 0);
  for (const s of [-1, 1]) {
    part(h.head, boxGeo(0.35, 0.08, 0.9), M(0x558b2f), s * 0.3, 2.45, 0).rotation.set(0, s * 0.5, -s * 0.5);
    part(h.head, boxGeo(0.25, 0.25, 0.25), M(0x558b2f), s * 0.78, 1.0, -0.2);
    part(h.head, boxGeo(0.55, 0.55, 0.55), M(0xf48fb1), s * 0.85, 1.3, -0.25);
  }
  part(h.head, boxGeo(1.35, 1.0, 0.3), bulb, 0, 0.8, -0.62); // back of the hair
  // Pendant
  part(h.torso, boxGeo(0.06, 0.5, 0.06), M(0x5d4037), 0, 0.75, 0.52);
  part(h.torso, boxGeo(0.25, 0.25, 0.06), glow(h, 0x4fc3f7), 0, 0.45, 0.53).rotation.z = Math.PI / 4;
  // Ragged hem
  [-0.75, -0.25, 0.25, 0.75].forEach((x, i) => part(h.torso, boxGeo(0.45, 0.3 + (i % 2) * 0.2, 1.05), shirtM, x, -1.1 - (i % 2) * 0.1, 0));
  if (level >= 1) {
    // Bandana, boots, gloves and a yellow flower on the head
    part(h.head, boxGeo(1.3, 0.22, 1.3), M(0x2e7d32), 0, 1.05, 0);
    part(h.head, boxGeo(0.2, 0.5, 0.1), M(0x2e7d32), 0.2, 0.75, -0.7).rotation.z = 0.3;
    const brown = M(0x5d4037);
    for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.06, 0.8, 1.12), brown, 0, -1.6, 0.03);
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.06, 0.5, 1.06), brown, 0, -1.75, 0);
    const fl = grp(h.head, 0.5, 1.75, 0.5, 0, 0.6, 0);
    part(fl, boxGeo(0.18, 0.18, 0.08), M(0xff8f00), 0, 0, 0.03);
    for (const [x, y] of [[0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2]]) part(fl, boxGeo(0.2, 0.2, 0.06), M(0xffeb3b), x, y, 0);
  }
  if (level >= 2) {
    // Hoodie with yellow flowers, a hood behind the head, brown belt
    part(h.head, boxGeo(1.45, 0.9, 0.35), shirtM, 0, 0.35, -0.85);
    const yellow = M(0xffeb3b);
    for (const [x, y] of [[-0.55, 0.5], [0.6, -0.1], [-0.3, -0.45], [0.75, 0.6]]) part(h.torso, boxGeo(0.2, 0.2, 0.05), yellow, x, y, 0.52).rotation.z = Math.PI / 4;
    part(h.torso, boxGeo(2.1, 0.25, 1.1), M(0x6d4c41), 0, -0.8, 0);
    part(h.torso, boxGeo(0.35, 0.3, 0.06), M(0xffc107), 0, -0.8, 0.56);
    // Quiver
    part(h.torso, boxGeo(0.5, 1.6, 0.5), M(0x6d4c41), 0.4, 0.4, -0.75).rotation.z = -0.3;
    for (const x of [0.6, 0.8]) part(h.torso, boxGeo(0.08, 0.5, 0.08), M(0xf06292), x, 1.35, -0.75).rotation.z = -0.3;
  }
  if (level >= 3) {
    // Lower face covered, glowing yellow eyes
    part(h.head, boxGeo(1.25, 0.55, 0.1), M(0x1b5e20), 0, 0.3, 0.63);
    for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.25, 0.14, 0.05), glow(h, 0xffeb3b), x, 0.8, 0.64);
  }
  if (level >= 4) {
    // Mushrooms round her feet and glowing spores
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.6;
      const s = 0.7 + (i % 2) * 0.35;
      const m = grp(h.root, Math.cos(a) * 2.3, 0, Math.sin(a) * 2.3);
      m.scale.setScalar(s);
      part(m, boxGeo(0.3, 0.7, 0.3), M(0xf5f5dc), 0, 0.35, 0);
      part(m, boxGeo(0.9, 0.35, 0.9), i % 2 ? M(0xd84315) : glowThing(h, 0x69f0ae), 0, 0.85, 0);
    }
    sparkles(h, h.body, [0xc6ff00, 0x69f0ae], 7, 2.3, 1.5, 6.0, 0.16);
  }
  // Bow in the left hand. In the hand group: -Y is forward, +Z is up, +Y is back toward her.
  const L = [1.0, 1.0, 1.3, 1.4, 1.9][level];
  const bg = hand(h.leftArm);
  const wood = level >= 4 ? M(0x3e2723) : M(0x8d6e63);
  part(bg, boxGeo(0.25, 0.25, 0.6), wood, 0, 0, 0);
  for (const s of [-1, 1]) {
    part(bg, boxGeo(0.18, 0.2, L * 0.7), wood, 0, 0.08, s * (0.3 + L * 0.35));
    const tip = part(bg, boxGeo(0.16, 0.18, L * 0.5), wood, 0, 0.3, s * (0.3 + L * 0.85));
    tip.rotation.x = -s * 0.5;
    if (level >= 2) part(bg, boxGeo(0.22, 0.22, 0.22), M(0xf06292), 0, 0.45, s * (0.3 + L * 1.05)); // pink tips
    if (level >= 4) part(bg, boxGeo(0.2, 0.08, L * 0.6), glow(h, 0xc6ff00), 0, -0.05, s * (0.3 + L * 0.35));
  }
  part(bg, boxGeo(0.04, 0.04, 2 * (0.3 + L * 1.0)), M(0xeeeeee), 0, 0.5, 0); // string
  part(bg, boxGeo(0.08, 1.6, 0.08), M(0xa1887f), 0, -0.1, 0); // nocked arrow
  part(bg, boxGeo(0.18, 0.25, 0.18), level >= 3 ? glow(h, 0xffeb3b) : M(0x9e9e9e), 0, -0.95, 0);
  setMuzzle(h, bg, 0, -1.1, 0);
  h.leftArm.rotation.set(-Math.PI / 2, 0, -0.1);
  h.rightArm.rotation.set(-1.45, 0, 0.35);
  h.pose = { right: -1.45, left: -Math.PI / 2, leftRecoil: 0.1 };
  h.tracer = level >= 3 ? 0xffeb3b : 0xc6ff00;
  return h;
}

/** The baby shark's head peeking out (for the bucket levels). */
function babyShark(u, parent, y, potHelmet) {
  const { M } = u;
  const shark = M(0x78909c);
  const white = M(0xeceff1);
  const g = grp(parent, 0, y, 0);
  part(g, boxGeo(1.5, 1.4, 1.4), shark, 0, 0.7, 0);
  part(g, boxGeo(1.2, 0.55, 0.1), white, 0, 0.35, 0.72); // white belly / jaw
  for (const x of [-0.42, 0.42]) {
    part(g, boxGeo(0.22, 0.26, 0.06), M(0x111111), x, 0.95, 0.72);
    part(g, boxGeo(0.08, 0.08, 0.04), white, x + 0.05, 1.02, 0.76);
  }
  // Happy smile
  const mouth = M(0x37474f);
  part(g, boxGeo(0.5, 0.08, 0.04), mouth, 0, 0.6, 0.78);
  for (const s of [-1, 1]) part(g, boxGeo(0.08, 0.16, 0.04), mouth, s * 0.27, 0.66, 0.78);
  // Top fin and upturned tail
  part(g, boxGeo(0.22, 0.75, 0.7), shark, 0, 1.55, -0.2).rotation.x = -0.5;
  part(g, boxGeo(0.25, 0.9, 0.5), shark, 0, 0.9, -1.2).rotation.x = -0.6;
  part(g, boxGeo(0.2, 0.6, 0.4), shark, 0, 1.4, -1.45).rotation.x = -0.2;
  for (const s of [-1, 1]) part(g, boxGeo(0.5, 0.15, 0.4), shark, s * 0.85, 0.3, 0.1).rotation.z = s * 0.4; // side fins
  if (potHelmet) {
    // A dented pot worn as a helmet
    const pot = M(0x9e9e9e);
    const p = grp(g, 0, 1.55, 0, 0, 0, 0.12);
    part(p, boxGeo(1.6, 0.6, 1.5), pot, 0, 0, 0);
    part(p, boxGeo(1.7, 0.12, 1.6), M(0x757575), 0, -0.3, 0);
    part(p, boxGeo(0.5, 0.15, 0.2), M(0x424242), 0.95, 0.05, 0); // handle
    part(p, boxGeo(0.4, 0.25, 0.1), M(0xbdbdbd), -0.3, 0.1, 0.72).rotation.z = 0.5; // dent
  }
  return g;
}

/** Shark head on a humanoid: a big head box that encloses the normal head. */
function sharkHead(h, helmetC, visor) {
  const { M } = h;
  const shark = M(0x78909c);
  const white = M(0xeceff1);
  part(h.head, boxGeo(1.5, 1.4, 1.65), shark, 0, 0.6, 0.15);
  part(h.head, boxGeo(1.3, 0.5, 0.1), white, 0, 0.2, 0.98);
  for (const x of [-0.45, 0.45]) {
    part(h.head, boxGeo(0.22, 0.24, 0.05), M(0x111111), x, 0.85, 0.99);
    part(h.head, boxGeo(0.08, 0.08, 0.04), white, x + 0.05, 0.92, 1.02);
  }
  part(h.head, boxGeo(0.7, 0.08, 0.05), M(0x37474f), 0, 0.5, 1.04);
  for (const x of [-0.24, 0, 0.24]) part(h.head, boxGeo(0.12, 0.12, 0.05), white, x, 0.42, 1.04);
  if (helmetC != null) {
    const hm = M(helmetC);
    part(h.head, boxGeo(1.65, 0.55, 1.8), hm, 0, 1.3, 0.15);
    for (const s of [-1, 1]) part(h.head, boxGeo(0.12, 0.9, 1.4), hm, s * 0.8, 0.85, 0.05); // cheek guards
    if (visor) part(h.head, boxGeo(1.4, 0.16, 0.06), glow(h, 0x18ffff), 0, 1.08, 1.06);
  }
  part(h.head, boxGeo(0.22, 0.8, 0.7), shark, 0, 1.85, -0.1).rotation.x = -0.5; // fin through the helmet
}

/**
 * Mako (shark that becomes a knight; slow, huge splash hits, melee). Lv 0 a happy baby shark in a
 * metal bucket, Lv 1 the bucket on legs and a dented pot helmet (both non-humanoid, static), Lv 2 a
 * small shark knight with a helmet and sword, Lv 3 armored with a shield, Lv 4 big with a
 * greatsword, cape and glowing visor.
 */
function brawlerMako(level) {
  if (level <= 1) {
    const u = makeThing();
    const { M } = u;
    const metal = M(0x455a64);
    const lift = level >= 1 ? 1.0 : 0;
    if (lift) {
      for (const x of [-0.55, 0.55]) {
        part(u.body, boxGeo(0.55, 1.1, 0.6), M(0x37474f), x, 0.55, 0);
        part(u.body, boxGeo(0.7, 0.3, 0.9), M(0x212121), x, 0.15, 0.15);
      }
    }
    part(u.body, boxGeo(2.2, 1.8, 2.2), metal, 0, lift + 0.9, 0);
    part(u.body, boxGeo(2.35, 0.2, 2.35), M(0x37474f), 0, lift + 1.8, 0);
    part(u.body, boxGeo(2.25, 0.15, 2.25), M(0x37474f), 0, lift + 0.4, 0);
    // Handle arcing over
    const handle = M(0x263238);
    for (const s of [-1, 1]) part(u.body, boxGeo(0.1, 1.2, 0.1), handle, s * 1.15, lift + 2.3, 0).rotation.z = s * 0.3;
    part(u.body, boxGeo(1.7, 0.1, 0.1), handle, 0, lift + 2.85, -0.4).rotation.x = -0.5;
    babyShark(u, u.body, lift + 1.2, level >= 1);
    gunMuzzle(u, u.body, 0, lift + 1.9, 1.6);
    u.melee = true;
    u.tracer = 0x80d8ff;
    return u;
  }
  const armored = level >= 3;
  const big = level >= 4;
  const plate = big ? 0x546e7a : armored ? 0x90a4ae : 0x8d6e63;
  const h = makeHumanoid({ skin: 0x78909c, shirt: plate, pants: 0x455a64, arms: armored ? plate : 0x78909c, face: 'smile' });
  const { M } = h;
  h.body.scale.setScalar([0, 0, 0.85, 1.0, 1.15][level]);
  sharkHead(h, big ? 0x37474f : 0xb0bec5, big);
  // Tail
  const shark = M(0x78909c);
  part(h.torso, boxGeo(0.5, 0.5, 0.9), shark, 0, -0.9, -0.9);
  part(h.torso, boxGeo(0.25, 1.1, 0.6), shark, 0, -0.5, -1.5).rotation.x = 0.6;
  const steel = M(big ? 0x78909c : 0xb0bec5);
  const gold = M(0xffc107);
  if (armored) {
    part(h.torso, boxGeo(2.2, 1.6, 1.2), steel, 0, 0.1, 0);
    part(h.torso, boxGeo(0.4, 1.0, 0.06), M(0xeceff1), 0, 0.15, 0.62); // white fin emblem
    for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) part(arm, boxGeo(1.35, 0.6, 1.35), steel, s * 0.1, -0.2, 0); // pauldrons
    for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.1, 0.9, 1.1), steel, 0, -1.4, 0);
  } else {
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x5d4037), 0, -0.8, 0); // belt
  }
  if (big) {
    part(h.torso, boxGeo(2.3, 3.4, 0.12), M(0x0d47a1), 0, -0.6, -0.7); // cape
    part(h.torso, boxGeo(2.25, 0.2, 1.25), gold, 0, 0.9, 0);
  }
  if (armored) {
    // Shield on the left arm
    const sh = part(h.leftArm, boxGeo(0.3, big ? 2.4 : 2.0, big ? 2.2 : 1.8), M(0x1565c0), 0.62, -1.3, 0);
    part(sh, boxGeo(0.1, big ? 2.5 : 2.1, 0.15), big ? gold : steel, 0.12, 0, 0);
    part(sh, boxGeo(0.1, 0.6, 0.5), M(0xeceff1), 0.16, 0.2, 0).rotation.x = -0.5; // fin emblem
  }
  // Sword: short (Lv 2), longer (Lv 3), greatsword (Lv 4)
  const len = [0, 0, 1.6, 2.2, 3.4][level];
  const wide = big ? 0.7 : 0.45;
  const g = hand(h.rightArm);
  part(g, boxGeo(0.25, big ? 0.9 : 0.6, 0.25), M(0x3e2723), 0, -0.2, 0);
  part(g, boxGeo(big ? 1.3 : 0.8, 0.18, 0.35), big ? gold : M(0x8d6e63), 0, -0.6, 0);
  part(g, boxGeo(0.14, len, wide), M(0xe0e0e0), 0, -0.7 - len / 2, 0);
  if (big) part(g, boxGeo(0.16, len * 0.85, 0.14), glow(h, 0x18ffff), 0, -0.7 - len / 2, 0);
  setMuzzle(h, g, 0, -0.7 - len, 0);
  meleePose(h, big ? -2.7 : -2.5, armored ? -0.9 : -0.6, 2.2);
  h.tracer = big ? 0x18ffff : 0x80d8ff;
  return h;
}

/**
 * Volt (chain lightning lamp): a glowing light bulb with a hollow-eyed face in a dark lamp base with
 * a screw plate and a brown cord. Lv 1 bigger bulb and a small coil, Lv 2 two coil rods, Lv 3 a ring
 * of coils and a brighter glow, Lv 4 a heavy base and a crown of arcs (spins, fast when it zaps).
 */
function teslaVolt(level) {
  const u = makeThing();
  const { M } = u;
  const heavy = level >= 4;
  const dark = M(0x424242);
  const copper = M(0xb87333);
  const bulbC = level >= 3 ? 0xfff59d : 0xffee58;
  let by = 0;
  if (heavy) {
    part(u.body, boxGeo(3.6, 0.6, 3.2), M(0x263238), 0, 0.3, 0);
    for (const [x, z] of [[-1.6, 1.4], [1.6, 1.4], [-1.6, -1.4], [1.6, -1.4]]) part(u.body, boxGeo(0.4, 0.3, 0.4), M(0x9e9e9e), x, 0.7, z); // bolts
    by = 0.6;
  }
  const bw = heavy ? 2.8 : 2.2;
  const bh = heavy ? 1.8 : 1.4;
  const bd = heavy ? 2.3 : 1.8;
  part(u.body, boxGeo(bw, bh, bd), dark, 0, by + bh / 2, 0);
  part(u.body, boxGeo(bw + 0.1, 0.2, bd + 0.1), M(0x212121), 0, by + bh, 0);
  // Screw plate on the front
  const plate = M(0x9e9e9e);
  part(u.body, boxGeo(1.0, 0.9, 0.08), plate, 0, by + bh / 2, bd / 2 + 0.03);
  for (const [x, y] of [[-0.35, 0.3], [0.35, 0.3], [-0.35, -0.3], [0.35, -0.3]]) part(u.body, boxGeo(0.14, 0.14, 0.06), M(0x616161), x, by + bh / 2 + y, bd / 2 + 0.08);
  part(u.body, boxGeo(0.3, 0.06, 0.04), M(0x424242), 0, by + bh / 2, bd / 2 + 0.08);
  // Curved brown cord at the back, ending in a plug on the ground
  const cord = M(0x5d4037);
  const cz = -bd / 2;
  part(u.body, boxGeo(0.22, 0.6, 0.22), cord, 0, by + 0.5, cz - 0.1);
  part(u.body, boxGeo(0.22, 0.22, 0.7), cord, 0, by + 0.85, cz - 0.4);
  part(u.body, boxGeo(0.22, 0.7, 0.22), cord, 0, by + 0.6, cz - 0.85).rotation.x = 0.4;
  part(u.body, boxGeo(0.22, 0.22, 0.9), cord, 0.2, 0.15, cz - 1.3).rotation.y = 0.4;
  part(u.body, boxGeo(0.35, 0.3, 0.4), M(0x212121), 0.45, 0.18, cz - 1.8);
  // Socket rings, then the bulb
  const sy = by + bh + 0.1;
  for (let i = 0; i < 3; i++) part(u.body, boxGeo(1.1 - i * 0.05, 0.22, 1.1 - i * 0.05), i % 2 ? M(0x9e9e9e) : M(0xbdbdbd), 0, sy + 0.11 + i * 0.24, 0);
  if (level >= 1) for (let i = 0; i < 2; i++) part(u.body, boxGeo(1.25, 0.08, 1.25), copper, 0, sy + 0.24 + i * 0.24, 0); // coil windings
  const s = [1, 1.2, 1.25, 1.3, 1.4][level];
  const bulb = grp(u.body, 0, sy + 0.72, 0);
  bulb.scale.setScalar(s);
  const glass = glowThing(u, bulbC);
  if (level >= 3) glass.emissiveIntensity = 1.15;
  part(bulb, boxGeo(1.0, 0.5, 1.0), glass, 0, 0.25, 0);
  part(bulb, boxGeo(1.6, 0.6, 1.6), glass, 0, 0.75, 0);
  part(bulb, boxGeo(2.0, 1.2, 2.0), glass, 0, 1.6, 0);
  part(bulb, boxGeo(1.6, 0.5, 1.6), glass, 0, 2.45, 0);
  part(bulb, boxGeo(1.0, 0.3, 1.0), glass, 0, 2.85, 0);
  // Hollow-eyed face
  const hole = M(0x3e2723);
  for (const x of [-0.42, 0.42]) part(bulb, boxGeo(0.4, 0.5, 0.06), hole, x, 1.8, 1.01);
  part(bulb, boxGeo(0.45, 0.14, 0.06), hole, 0, 1.2, 1.01);
  part(bulb, boxGeo(0.08, 0.6, 0.08), M(0xff8f00), 0, 0.9, 0); // filament post (inside)
  const top = sy + 0.72 + 3.0 * s;
  gunMuzzle(u, u.body, 0, top + 0.1, 0);
  const spark = glowThing(u, 0x80d8ff);
  /** A small coil: copper windings on a post with a glowing tip. */
  const coil = (x, y, z, hgt) => {
    part(u.body, boxGeo(0.22, hgt, 0.22), M(0x616161), x, y + hgt / 2, z);
    const n = Math.max(2, Math.round(hgt / 0.35));
    for (let i = 0; i < n; i++) part(u.body, boxGeo(0.4, 0.1, 0.4), copper, x, y + 0.2 + (i * (hgt - 0.4)) / Math.max(1, n - 1), z);
    part(u.body, boxGeo(0.32, 0.32, 0.32), spark, x, y + hgt + 0.1, z);
  };
  if (level === 1) coil(bw / 2 + 0.25, 0, 0.4, 1.4);
  if (level >= 2) for (const sx of [-1, 1]) coil(sx * (bw / 2 + 0.3), by, 0, 2.8);
  if (level >= 3) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      coil(Math.cos(a) * 1.85, by, Math.sin(a) * 1.85, 1.3);
    }
  }
  if (heavy) {
    // Crown of arcs over the bulb
    const crown = grp(u.body, 0, top - 0.6, 0);
    const arc = glowThing(u, 0xe1f5fe);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const p = grp(crown, Math.cos(a) * 1.1, 0, Math.sin(a) * 1.1, 0, -a, 0);
      part(p, boxGeo(0.1, 0.6, 0.1), arc, 0, 0.3, 0).rotation.z = 0.5;
      part(p, boxGeo(0.1, 0.6, 0.1), arc, 0.15, 0.8, 0).rotation.z = -0.5;
      part(p, boxGeo(0.1, 0.5, 0.1), arc, 0.05, 1.25, 0).rotation.z = 0.4;
    }
    u.spin = [crown];
    u.idleSpin = 1.0;
  }
  u.tracer = level >= 3 ? 0xfff9c4 : 0xffee58;
  return u;
}

/**
 * Byte (shocks / paralyzes): a cream boxy retro computer robot on stubby legs, a green striped
 * screen with a ":D" face, red and green buttons and a black cable with a plug (muzzle at the plug).
 * Lv 1 antenna, Lv 2 a longer coiled cable, Lv 3 a second cable (second muzzle) and a keyboard
 * tray, Lv 4 a purple glowing screen and sparks.
 */
function electroByte(level) {
  const u = makeThing();
  const { M } = u;
  const cream = M(0xf5ecd0);
  const creamDark = M(0xe0d4b0);
  const purple = level >= 4;
  // Stubby legs
  for (const x of [-0.7, 0.7]) {
    part(u.body, boxGeo(0.6, 0.8, 0.7), M(0x616161), x, 0.45, 0);
    part(u.body, boxGeo(0.8, 0.25, 1.0), M(0x424242), x, 0.12, 0.15);
  }
  // Base unit with floppy slot and buttons
  part(u.body, boxGeo(2.8, 0.9, 2.4), cream, 0, 1.25, 0);
  part(u.body, boxGeo(0.9, 0.08, 0.05), M(0x212121), 0.6, 1.35, 1.21);
  part(u.body, boxGeo(0.25, 0.25, 0.1), glowThing(u, 0xff1744), -0.95, 1.25, 1.22);
  part(u.body, boxGeo(0.25, 0.25, 0.1), glowThing(u, 0x00e676), -0.55, 1.25, 1.22);
  // Monitor
  part(u.body, boxGeo(2.6, 2.2, 2.2), cream, 0, 2.8, 0);
  part(u.body, boxGeo(2.0, 1.6, 0.8), creamDark, 0, 2.8, -1.4);
  const screen = purple ? glowThing(u, 0x4a148c) : M(0x1b5e20);
  if (purple) screen.emissiveIntensity = 0.6;
  part(u.body, boxGeo(2.0, 1.5, 0.06), screen, 0, 2.85, 1.12);
  const stripe = purple ? glowThing(u, 0x7c4dff) : M(0x2e7d32);
  if (purple) stripe.emissiveIntensity = 0.5;
  for (let i = 0; i < 5; i++) part(u.body, boxGeo(2.0, 0.1, 0.07), stripe, 0, 2.25 + i * 0.3, 1.13);
  // ":D" face from small boxes
  const face = glowThing(u, purple ? 0xf3e5f5 : 0x76ff03);
  const fz = 1.17;
  for (const y of [3.1, 2.65]) part(u.body, boxGeo(0.18, 0.18, 0.05), face, -0.6, y, fz);
  part(u.body, boxGeo(0.15, 0.9, 0.05), face, -0.15, 2.85, fz);
  part(u.body, boxGeo(0.45, 0.15, 0.05), face, 0.07, 3.22, fz);
  part(u.body, boxGeo(0.45, 0.15, 0.05), face, 0.07, 2.48, fz);
  part(u.body, boxGeo(0.15, 0.55, 0.05), face, 0.42, 2.85, fz);
  for (const y of [3.1, 2.6]) part(u.body, boxGeo(0.15, 0.15, 0.05), face, 0.32, y, fz);
  const cable = M(0x212121);
  const plugM = M(0x9e9e9e);
  /** A black cable from the side (sx = -1 right side, +1 left side) to a plug pointing forward. */
  const cableTo = (sx, coiled) => {
    const x0 = sx * 1.45;
    const x1 = sx * (coiled ? 2.0 : 1.85);
    part(u.body, boxGeo(0.2, 0.8, 0.2), cable, x0, 1.0, 0);
    part(u.body, boxGeo(0.2, 0.2, 0.6), cable, (x0 + x1) / 2, 0.55, 0.2).rotation.y = sx * 0.6;
    if (coiled) {
      // Coiled loops on the ground beside it
      for (let k = 0; k < 2; k++) {
        const c = grp(u.body, sx * 2.3, 0.15 + k * 0.2, -0.4);
        ring(c, 8, 0.55, boxGeo(0.45, 0.18, 0.18), cable);
      }
    }
    const zEnd = coiled ? 2.6 : 2.1;
    const yEnd = coiled ? 1.2 : 0.9;
    part(u.body, boxGeo(0.2, 0.2, zEnd - 0.4), cable, x1, 0.25, (zEnd - 0.4) / 2 + 0.2);
    part(u.body, boxGeo(0.2, yEnd, 0.2), cable, x1, 0.25 + yEnd / 2 - 0.1, zEnd - 0.2);
    part(u.body, boxGeo(0.45, 0.45, 0.6), plugM, x1, yEnd + 0.1, zEnd);
    for (const px of [-0.12, 0.12]) part(u.body, boxGeo(0.08, 0.08, 0.3), M(0xffd54f), x1 + px, yEnd + 0.1, zEnd + 0.42);
    gunMuzzle(u, u.body, x1, yEnd + 0.1, zEnd + 0.65);
  };
  cableTo(-1, level >= 2);
  if (level >= 3) cableTo(1, level >= 2);
  if (level >= 1) {
    // Antenna
    part(u.body, boxGeo(0.1, 1.4, 0.1), M(0x757575), 0.8, 4.6, -0.3);
    part(u.body, boxGeo(0.25, 0.25, 0.25), glowThing(u, 0xff1744), 0.8, 5.35, -0.3);
  }
  if (level >= 3) {
    // Keyboard tray in front
    part(u.body, boxGeo(0.3, 0.3, 0.6), creamDark, 0, 1.5, 1.45);
    part(u.body, boxGeo(2.4, 0.25, 1.0), cream, 0, 1.6, 2.1);
    const key = M(0x5d5d5d);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) part(u.body, boxGeo(0.22, 0.08, 0.2), key, -0.9 + c * 0.3, 1.76, 1.8 + r * 0.28);
  }
  if (purple) sparkles(u, u.body, [0xffeb3b, 0xe040fb, 0x80d8ff], 7, 1.9, 1.5, 4.6, 0.2);
  u.tracer = purple ? 0xb388ff : 0x76ff03;
  return u;
}

/* ------------------------------------------------------------------ units */

/** Volt Point: a small glowing electric pylon placed on the path (doesn't move). */
function voltPoint() {
  const u = makeThing();
  u.wheels = [];
  const { M } = u;
  part(u.body, boxGeo(1.1, 0.35, 1.1), M(0x757575), 0, 0.18, 0);
  part(u.body, boxGeo(0.7, 0.25, 0.7), M(0x616161), 0, 0.47, 0);
  part(u.body, boxGeo(0.3, 1.0, 0.3), M(0x424242), 0, 1.05, 0);
  for (let i = 0; i < 3; i++) part(u.body, boxGeo(0.5, 0.08, 0.5), M(0xb87333), 0, 0.75 + i * 0.25, 0);
  part(u.body, boxGeo(0.45, 0.45, 0.45), glowThing(u, 0xffee58), 0, 1.75, 0).rotation.set(0.6, 0.6, 0);
  const arc = glowThing(u, 0xfff9c4);
  for (const s of [-1, 1]) part(u.body, boxGeo(0.06, 0.4, 0.06), arc, s * 0.3, 1.85, 0).rotation.z = s * 0.6;
  gunMuzzle(u, u.body, 0, 1.8, 0);
  u.height = 2.0;
  u.tracer = 0xffee58;
  return u;
}

/* ------------------------------------------------------------------ exports */

export const TOWER_MODELS_F = {
  scoutWizard,
  enforcerChef,
  kniferYasuke,
  toxicnatorMaitake,
  sparkBranch,
  railgunnerScientist,
  mortarVoca,
  sniperQuinn,
  brawlerMako,
  teslaVolt,
  electroByte,
};

export const UNIT_MODELS_F = {
  voltPoint,
};
