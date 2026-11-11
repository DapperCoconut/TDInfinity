import * as THREE from 'three';
import { boxGeo, part, makeHumanoid, makeThing, glow, helmet, setMuzzle, gunMuzzle, addRevolver, turret } from '../models.js';
import { wheel } from '../vehicles.js';

// New towers and units (set A). Characters face +Z; see makeHumanoid in models.js for proportions.

/** See-through glowing material (ghost hands, auras): stays see-through when the tower fades. */
function ghostMat(h, color, op) {
  const m = glow(h, color);
  m.transparent = true;
  m.opacity = op;
  m.depthWrite = false;
  m.userData.keepOpacity = op;
  return m;
}

/** A gun group held in a hand, pointing along the arm (-Y local). */
function handGroup(arm) {
  const g = new THREE.Group();
  g.position.set(0, -1.9, 0);
  arm.add(g);
  return g;
}

/** An assault rifle in `arm`'s hand. Returns { gun, muzzle }. */
function rifle(h, arm, len, body, { stock = 0x3e2723, scope = false } = {}) {
  const { M } = h;
  const gun = handGroup(arm);
  part(gun, boxGeo(0.32, len, 0.42), body, 0, -len / 2, 0);
  part(gun, boxGeo(0.25, 0.45, 0.55), body, 0, -0.55, -0.42); // magazine
  part(gun, boxGeo(0.25, 0.5, 0.35), M(stock), 0, 0.15, -0.05); // stock
  part(gun, boxGeo(0.2, 0.3, 0.2), body, 0, -len + 0.25, 0.3); // front sight
  if (scope) part(gun, boxGeo(0.26, 0.7, 0.3), M(0x111111), 0, -0.7, 0.35);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -len, 0);
  gun.add(muzzle);
  return { gun, muzzle };
}

/** Both arms forward (standard aim), as holdLongGun sets up. */
function aimPose(h, leftRecoil = 0.25) {
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-Math.PI / 2 + 0.1, 0, -0.5);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2 + 0.1, leftRecoil };
}

// ---------------------------------------------------------------------------------------------
// Rockety: a retro rocket trooper with a shoulder launcher.
// ---------------------------------------------------------------------------------------------

/** Rockety (0-4): Lv1 bigger rocket, Lv2 helmet, Lv3 twin tubes, Lv4 a fuze bomb on his back. */
function makeRockety(level) {
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: 0x3f51b5, pants: 0x616161, arms: 0x3f51b5, face: 'soldier' });
  const { M } = h;
  const red = M(0xd32f2f);
  const grey = M(0x9e9e9e);
  const dark = M(0x37474f);
  // Boots and belt
  for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.05, 0.6, 1.15), M(0x263238), 0, -1.7, 0.05);
  part(h.torso, boxGeo(2.05, 0.3, 1.05), M(0x5d4037), 0, -0.85, 0);
  part(h.torso, boxGeo(0.4, 0.3, 0.1), M(0xffd54f), 0, -0.85, 0.53);
  if (level >= 2) {
    helmet(h, 0x78909c);
    part(h.head, boxGeo(1.47, 0.14, 1.47), red, 0, 1.15, 0); // red stripe
  } else {
    // Retro field cap
    part(h.head, boxGeo(1.3, 0.35, 1.3), M(0x757575), 0, 1.35, 0);
    part(h.head, boxGeo(1.3, 0.1, 0.5), M(0x424242), 0, 1.2, 0.85);
  }
  part(h.torso, boxGeo(0.35, 0.35, 0.06), red, 0.55, 0.5, 0.52); // patch
  // Shoulder launcher: sits on top of the right arm, sticking out behind the shoulder.
  const big = level >= 1;
  const w = big ? 0.95 : 0.8;
  const L = big ? 3.9 : 3.5;
  const tube = (z) => {
    const g = new THREE.Group();
    g.position.set(0, 0, z);
    h.rightArm.add(g);
    const cy = -0.9;
    part(g, boxGeo(w, L, w), grey, 0, cy, 0);
    part(g, boxGeo(w + 0.15, 0.3, w + 0.15), red, 0, cy - L / 2 + 0.2, 0); // front band
    part(g, boxGeo(w + 0.15, 0.25, w + 0.15), red, 0, cy + 0.3, 0); // middle band
    part(g, boxGeo(w + 0.3, 0.35, w + 0.3), dark, 0, cy + L / 2, 0); // flared back end
    // The rocket's warhead poking out of the front
    const rw = big ? 0.6 : 0.45;
    part(g, boxGeo(rw, 0.4, rw), M(0x607d8b), 0, cy - L / 2 - 0.2, 0);
    part(g, boxGeo(rw * 0.6, 0.3, rw * 0.6), red, 0, cy - L / 2 - 0.5, 0);
    const m = new THREE.Object3D();
    m.position.set(0, cy - L / 2 - 0.6, 0);
    g.add(m);
    return m;
  };
  const z0 = 0.5 + w / 2 + 0.02;
  const muzzles = [tube(z0)];
  if (level >= 3) muzzles.push(tube(z0 + w + 0.05)); // twin tube, stacked
  // Iron sights and grip
  const top = z0 + (level >= 3 ? w + 0.05 : 0) + w / 2;
  part(h.rightArm, boxGeo(0.15, 0.35, 0.3), dark, 0, -2.3, top + 0.12);
  part(h.rightArm, boxGeo(0.35, 0.3, 0.4), dark, w / 2 + 0.2, -0.6, top + 0.1); // sight box
  part(h.rightArm, boxGeo(0.3, 0.6, 0.3), dark, 0, -1.6, z0 - w / 2 - 0.2);
  if (level >= 4) {
    // A vintage round fuze bomb strapped to his back
    const bomb = M(0x212121);
    part(h.torso, boxGeo(1.3, 1.3, 1.3), bomb, 0, 0.0, -1.15);
    part(h.torso, boxGeo(1.0, 1.5, 1.0), bomb, 0, 0.0, -1.15);
    part(h.torso, boxGeo(1.5, 1.0, 1.0), bomb, 0, 0.0, -1.15);
    part(h.torso, boxGeo(0.45, 0.3, 0.45), grey, 0, 0.8, -1.15); // fuze cap
    part(h.torso, boxGeo(0.1, 0.5, 0.1), M(0xd7ccc8), 0, 1.15, -1.15); // fuze rope
    part(h.torso, boxGeo(0.25, 0.25, 0.25), glow(h, 0xff9100), 0, 1.45, -1.15); // spark
    for (const x of [-0.6, 0.6]) part(h.torso, boxGeo(0.2, 2.1, 0.08), M(0x5d4037), x, 0, 0.52); // straps
  }
  aimPose(h, 0.2);
  h.muzzles = muzzles;
  h.recoilScale = 1.3;
  h.projectile = { color: level >= 4 ? 0xd32f2f : 0x9e9e9e, size: big ? 1.2 : 1 };
  h.tracer = 0xff7043;
  return h;
}

// ---------------------------------------------------------------------------------------------
// Samurai
// ---------------------------------------------------------------------------------------------

function katana(h, arm, len, bladeMat, guardMat) {
  const { M } = h;
  const g = handGroup(arm);
  part(g, boxGeo(0.26, 0.9, 0.26), M(0x1a1a1a), 0, -0.05, 0); // wrapped grip
  part(g, boxGeo(0.65, 0.12, 0.65), guardMat, 0, -0.55, 0); // tsuba
  part(g, boxGeo(0.1, len, 0.3), bladeMat, 0, -0.6 - len / 2, 0);
  part(g, boxGeo(0.1, 0.3, 0.18), bladeMat, 0, -0.75 - len, -0.06); // tip
  return g;
}

/** Samurai (0-4): Lv1 kabuto helmet, Lv2 shurikens and a face mask, Lv3 gold trim, Lv4 a second sword. */
function makeSamurai(level) {
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: 0x8e1b1b, pants: 0x1a1a1a, arms: 0x1a1a1a, face: 'soldier' });
  const { M } = h;
  const gold = level >= 3;
  const red = M(0xb71c1c);
  const black = M(0x161616);
  const trim = gold ? glow(h, 0xffc400) : M(0x3e2723);
  // Do (chest plate) with lacing rows
  part(h.torso, boxGeo(2.2, 1.6, 1.2), red, 0, 0.2, 0);
  for (const y of [0.6, 0.2, -0.2]) part(h.torso, boxGeo(2.22, 0.08, 1.22), black, 0, y, 0);
  part(h.torso, boxGeo(2.25, 0.15, 1.25), trim, 0, 1.0, 0);
  // Sode (shoulder plates) and kusazuri (skirt plates)
  for (const s of [-1, 1]) {
    const sode = part(h.torso, boxGeo(0.9, 0.9, 1.25), red, s * 1.45, 0.75, 0);
    sode.rotation.z = s * 0.25;
    part(sode, boxGeo(0.92, 0.12, 1.27), trim, 0, -0.42, 0);
  }
  for (const x of [-0.7, 0, 0.7]) part(h.torso, boxGeo(0.62, 0.8, 0.15), red, x, -1.2, 0.55);
  part(h.torso, boxGeo(2.25, 0.25, 1.25), M(0x3e2723), 0, -0.75, 0); // obi
  // Scabbard at the left hip
  const saya = part(h.torso, boxGeo(0.22, 2.6, 0.3), black, 1.15, -0.9, -0.3);
  saya.rotation.x = 0.9;
  if (level >= 1) {
    // Kabuto: dome, flared neck guard, side flaps and a crest
    part(h.head, boxGeo(1.5, 0.5, 1.5), black, 0, 1.4, 0);
    part(h.head, boxGeo(1.8, 0.45, 1.3), red, 0, 1.0, -0.3);
    for (const s of [-1, 1]) {
      const flap = part(h.head, boxGeo(0.12, 0.5, 0.6), red, s * 0.9, 1.15, 0.45);
      flap.rotation.y = s * 0.5;
    }
    const crestM = gold ? trim : M(0xc9a227);
    for (const s of [-1, 1]) {
      const horn = part(h.head, boxGeo(0.12, 0.9, 0.08), crestM, s * 0.3, 1.85, 0.72);
      horn.rotation.z = -s * 0.45;
    }
    part(h.head, boxGeo(0.3, 0.3, 0.1), crestM, 0, 1.5, 0.76);
  } else {
    // White hachimaki headband and a topknot
    part(h.head, boxGeo(1.27, 0.2, 1.27), M(0xfafafa), 0, 1.0, 0);
    part(h.head, boxGeo(1.25, 0.2, 1.25), M(0x1a1a1a), 0, 1.25, 0);
    part(h.head, boxGeo(0.3, 0.4, 0.5), M(0x1a1a1a), 0, 1.5, -0.2);
  }
  if (level >= 2) {
    // Menpo face mask and shurikens tucked in the belt
    part(h.head, boxGeo(1.25, 0.45, 0.1), M(0x4a0e0e), 0, 0.25, 0.62);
    const steel = M(0xb0bec5);
    for (const x of [-0.75, -0.35]) {
      for (const r of [0, Math.PI / 2]) {
        const s = part(h.torso, boxGeo(0.42, 0.1, 0.06), steel, x, -0.75, 0.66);
        s.rotation.z = Math.PI / 4 + r;
      }
    }
  }
  const bladeMat = level >= 4 ? glow(h, 0xffe0b2) : M(0xe0e0e0);
  const guardMat = gold ? trim : M(0x8d6e63);
  const len = level >= 1 ? 2.9 : 2.6;
  setMuzzle(h, katana(h, h.rightArm, len, bladeMat, guardMat), 0, -0.6 - len, 0);
  h.rightArm.rotation.set(-2.6, 0, 0.15);
  if (level >= 4) {
    // Second sword in the left hand, held forward in guard
    katana(h, h.leftArm, 2.3, bladeMat, guardMat);
    h.leftArm.rotation.set(-1.3, 0, -0.3);
    h.pose = { right: -2.6, left: -1.3, leftRecoil: 0 };
  } else {
    h.leftArm.rotation.set(-0.4, 0, -0.15);
    h.pose = { right: -2.6, left: -0.4, leftRecoil: 0 };
  }
  h.swing = 1.9;
  h.melee = true;
  h.tracer = gold ? 0xffd54f : 0xffffff;
  return h;
}

// ---------------------------------------------------------------------------------------------
// Hired Gun
// ---------------------------------------------------------------------------------------------

/** Hired Gun (0-5): Lv1 helmet and vest, Lv2 night-vision goggles, Lv3 scoped rifle, Lv4 heavy armor, Lv5 radio backpack. */
function makeHiredGun(level) {
  const tan = 0xc2a878;
  const h = makeHumanoid({ skin: 0xc68642, shirt: tan, pants: 0x3e3a2a, arms: tan, face: 'soldier' });
  const { M } = h;
  const black = M(0x1c1c1c);
  for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.05, 0.6, 1.15), black, 0, -1.7, 0.05);
  part(h.leftLeg, boxGeo(0.4, 0.6, 0.5), black, 0.55, -0.8, 0); // thigh pouch
  if (level >= 1) {
    helmet(h, 0x8d7b5a);
    part(h.head, boxGeo(1.47, 0.12, 1.47), black, 0, 1.15, 0); // helmet band
    part(h.torso, boxGeo(2.15, 1.7, 1.15), M(0x2b2b2b), 0, 0.05, 0); // plate carrier
    for (const x of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.45, 0.45, 0.2), M(0x4e4630), x, -0.3, 0.65); // mag pouches
  } else {
    // Ball cap and sunglasses
    part(h.head, boxGeo(1.3, 0.35, 1.3), black, 0, 1.35, 0);
    part(h.head, boxGeo(1.3, 0.1, 0.55), black, 0, 1.2, 0.85);
    part(h.head, boxGeo(1.2, 0.25, 0.08), M(0x0a0a0a), 0, 0.7, 0.63);
    part(h.torso, boxGeo(0.3, 2.4, 1.1), black, 0, 0, 0).rotation.z = 0.6; // sling
  }
  if (level >= 2) {
    // Night-vision goggles on a helmet mount
    part(h.head, boxGeo(0.5, 0.3, 0.3), black, 0, 1.3, 0.8);
    for (const x of [-0.25, 0.25]) {
      part(h.head, boxGeo(0.3, 0.3, 0.45), black, x, 1.05, 0.95);
      part(h.head, boxGeo(0.22, 0.22, 0.05), glow(h, 0x76ff03), x, 1.05, 1.2);
    }
  }
  if (level >= 4) {
    // Heavy armor: shoulder plates, groin plate and a bulkier carrier
    const plate = M(0x3b3f2a);
    part(h.torso, boxGeo(2.3, 1.8, 1.3), plate, 0, 0.1, 0);
    for (const s of [-1, 1]) part(h.torso, boxGeo(1.1, 0.45, 1.3), plate, s * 1.45, 0.95, 0);
    part(h.torso, boxGeo(1.0, 0.7, 0.2), plate, 0, -1.2, 0.55);
    part(h.head, boxGeo(1.3, 0.5, 0.1), black, 0, 0.3, 0.63); // face guard
  }
  if (level >= 5) {
    // Radio backpack with a whip antenna and a blinking light (calls the tank airdrop)
    part(h.torso, boxGeo(1.5, 1.7, 0.8), M(0x4b5320), 0, 0, -1.0);
    part(h.torso, boxGeo(1.2, 0.4, 0.1), M(0x263238), 0, 0.3, -1.42);
    part(h.torso, boxGeo(0.25, 0.25, 0.1), glow(h, 0xff1744), -0.4, 0.3, -1.46);
    part(h.torso, boxGeo(0.1, 2.6, 0.1), black, 0.5, 2.0, -1.1);
    part(h.torso, boxGeo(0.2, 0.2, 0.2), glow(h, 0xff1744), 0.5, 3.35, -1.1);
    part(h.head, boxGeo(0.15, 0.45, 0.45), black, -0.7, 0.65, 0); // headset
  }
  const len = level >= 3 ? 2.0 : 1.7;
  const { gun, muzzle } = rifle(h, h.rightArm, len, level >= 4 ? M(0x2b2b2b) : black, { stock: 0x4e4630, scope: level >= 3 });
  if (level >= 3) part(gun, boxGeo(0.24, 0.6, 0.24), black, 0, -len - 0.3, 0); // suppressor
  if (level >= 3) muzzle.position.y = -len - 0.6;
  aimPose(h);
  h.muzzles = [muzzle];
  h.tracer = 0xffc107;
  return h;
}

// ---------------------------------------------------------------------------------------------
// Ducks (the duck units; the Ducky Nest building is in models/machines4.js)
// ---------------------------------------------------------------------------------------------

/**
 * A blocky duck facing +Z, built onto `parent`. Returns { head, leftLeg, rightLeg, wing } handles.
 * About 3.5 tall at s = 1.
 */
function duckShape(parent, M, { body = 0xffd600, wing = 0xfbc02d, beak = 0xff8f00, legs = true } = {}, s = 1) {
  const bodyM = M(body);
  const beakM = M(beak);
  const g = new THREE.Group();
  g.scale.setScalar(s);
  parent.add(g);
  part(g, boxGeo(1.6, 1.3, 2.0), bodyM, 0, 1.55, -0.1);
  part(g, boxGeo(1.0, 0.6, 0.5), bodyM, 0, 2.0, -1.3); // tail
  const wingM = M(wing);
  for (const x of [-0.85, 0.85]) part(g, boxGeo(0.15, 0.8, 1.3), wingM, x, 1.6, -0.2);
  const head = new THREE.Group();
  head.position.set(0, 2.2, 0.55);
  g.add(head);
  part(head, boxGeo(1.1, 1.1, 1.1), bodyM, 0, 0.55, 0);
  part(head, boxGeo(0.7, 0.25, 0.6), beakM, 0, 0.4, 0.8);
  const eye = M(0x111111);
  for (const x of [-0.3, 0.3]) part(head, boxGeo(0.15, 0.2, 0.05), eye, x, 0.75, 0.56);
  let leftLeg = null;
  let rightLeg = null;
  if (legs) {
    const leg = (x) => {
      const p = new THREE.Group();
      p.position.set(x, 0.9, 0);
      g.add(p);
      part(p, boxGeo(0.2, 0.8, 0.2), beakM, 0, -0.4, 0);
      part(p, boxGeo(0.5, 0.1, 0.6), beakM, 0, -0.85, 0.15);
      return p;
    };
    rightLeg = leg(-0.4);
    leftLeg = leg(0.4);
  }
  return { g, head, leftLeg, rightLeg };
}

// ---------------------------------------------------------------------------------------------
// Outlaw: female gunslinger with ghostly hands
// ---------------------------------------------------------------------------------------------

/** A floating glowing hand (open palm, fingers up). */
function ghostHand(h, mat, x, y, z, s, tilt) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  g.rotation.z = tilt;
  h.body.add(g);
  part(g, boxGeo(0.8, 0.8, 0.25), mat, 0, 0, 0);
  for (let i = 0; i < 4; i++) part(g, boxGeo(0.16, 0.5, 0.2), mat, -0.3 + i * 0.2, 0.62, 0);
  part(g, boxGeo(0.35, 0.16, 0.2), mat, 0.52, 0.05, 0); // thumb
  return g;
}

/** Outlaw (0-5): poncho and hat; Lv1 bandana and gunbelt, Lv2+ ghost hands, Lv4 four of them, Lv5 gold revolver and a big purple glow. */
function makeOutlaw(level) {
  const h = makeHumanoid({ skin: 0xe8b38a, shirt: 0x5d2a36, pants: 0x3e2f2a, arms: 0x5d2a36 });
  const { M } = h;
  const big = level >= 5;
  const purple = big ? 0xd500f9 : 0xb388ff;
  // Long hair
  const hair = M(0x4a2511);
  part(h.head, boxGeo(1.3, 0.3, 1.3), hair, 0, 1.25, 0);
  part(h.head, boxGeo(1.3, 1.9, 0.3), hair, 0, 0.35, -0.6);
  for (const x of [-0.62, 0.62]) part(h.head, boxGeo(0.16, 1.0, 0.5), hair, x, 0.65, 0.2);
  // Wide-brim hat
  const hatM = M(big ? 0x1a1a1a : 0x5d4037);
  part(h.head, boxGeo(2.2, 0.12, 2.0), hatM, 0, 1.4, 0);
  part(h.head, boxGeo(1.2, 0.55, 1.1), hatM, 0, 1.7, 0);
  part(h.head, boxGeo(1.23, 0.15, 1.13), level >= 2 ? glow(h, purple) : M(0xb71c1c), 0, 1.5, 0); // hat band
  // Poncho with stripes
  const ponchoM = M(big ? 0x311b4f : 0xa1663a);
  part(h.torso, boxGeo(2.6, 1.4, 1.5), ponchoM, 0, 0.35, 0);
  const stripe = level >= 3 ? glow(h, purple) : M(0xffcc80);
  for (const y of [0.05, -0.25]) part(h.torso, boxGeo(2.62, 0.1, 1.52), stripe, 0, y, 0);
  // Boots
  for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.05, 0.8, 1.15), M(0x3e2723), 0, -1.6, 0.05);
  if (level >= 1) {
    // Bandana over the mouth and a gunbelt with bullets
    part(h.head, boxGeo(1.24, 0.45, 1.24), M(big ? 0x4a148c : 0xb71c1c), 0, 0.25, 0.01);
    part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.85, 0);
    for (let i = 0; i < 5; i++) part(h.torso, boxGeo(0.12, 0.22, 0.08), M(0xffc107), -0.6 + i * 0.3, -0.85, 0.57);
    part(h.torso, boxGeo(0.4, 0.6, 0.3), M(0x4e342e), -1.0, -1.05, 0.2); // holster
  }
  if (level >= 2) {
    // Ghostly purple hands floating at her shoulders
    const gm = ghostMat(h, purple, big ? 0.75 : 0.6);
    const s = big ? 1.4 : 1;
    ghostHand(h, gm, -2.4, 5.0, 0.6, s, 0.3);
    ghostHand(h, gm, 2.4, 5.0, 0.6, s, -0.3);
    if (level >= 4) {
      ghostHand(h, gm, -2.8, 3.1, -0.3, s, 0.6);
      ghostHand(h, gm, 2.8, 3.1, -0.3, s, -0.6);
    }
    // Glowing eyes
    for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.22, 0.12, 0.05), glow(h, purple), x, 0.7, 0.62);
  }
  if (big) {
    // Big purple aura and a glowing ring at her feet
    const aura = ghostMat(h, purple, 0.18);
    part(h.torso, boxGeo(3.2, 3.2, 2.0), aura, 0, 0, 0);
    const ring = ghostMat(h, purple, 0.5);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = part(h.body, boxGeo(1.1, 0.12, 0.3), ring, Math.cos(a) * 2.2, 0.15, Math.sin(a) * 2.2);
      r.rotation.y = -a + Math.PI / 2;
    }
  }
  const gun = addRevolver(h, h.rightArm, big);
  if (big) part(gun, boxGeo(0.4, 0.12, 0.4), glow(h, purple), 0, -1.0, 0.05); // glowing muzzle ring
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
  h.leftArm.rotation.set(-0.2, 0, -0.2);
  h.pose = { right: -Math.PI / 2, left: -0.2, leftRecoil: 0 };
  h.muzzles = [gun.userData.muzzle];
  h.twirl = [gun];
  h.tracer = big ? 0xe040fb : level >= 2 ? 0xce93d8 : 0xffe066;
  return h;
}

// ---------------------------------------------------------------------------------------------
// Liberator: dual assault rifles, red/white/blue
// ---------------------------------------------------------------------------------------------

/** Liberator (0-4): Lv1 star bandana, Lv2 striped vest, Lv3 bigger rifles and a cape, Lv4 an oil barrel on his back. */
function makeLiberator(level) {
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: 0x1a3a8a, pants: 0xc62828, arms: 0xfafafa, face: 'soldier' });
  const { M } = h;
  const white = M(0xfafafa);
  const red = M(0xc62828);
  const blue = M(0x1a3a8a);
  // Star on the chest, white leg stripes, boots
  const star = level >= 3 ? glow(h, 0xfff59d) : white;
  part(h.torso, boxGeo(0.6, 0.6, 0.06), star, 0, 0.3, 0.52).rotation.z = Math.PI / 4;
  part(h.torso, boxGeo(0.6, 0.6, 0.06), star, 0, 0.3, 0.53);
  for (const leg of [h.rightLeg, h.leftLeg]) {
    part(leg, boxGeo(1.04, 0.2, 1.04), white, 0, -0.6, 0);
    part(leg, boxGeo(1.04, 0.2, 1.04), white, 0, -1.0, 0);
    part(leg, boxGeo(1.05, 0.6, 1.15), M(0x3e2723), 0, -1.7, 0.05);
  }
  part(h.head, boxGeo(1.25, 0.2, 1.25), M(0x6d4c41), 0, 1.25, 0); // hair
  if (level >= 1) {
    // Blue bandana with white stars
    part(h.head, boxGeo(1.28, 0.25, 1.28), blue, 0, 1.0, 0);
    for (const x of [-0.35, 0.35]) part(h.head, boxGeo(0.15, 0.15, 0.05), white, x, 1.0, 0.65);
    part(h.head, boxGeo(0.25, 0.5, 0.15), blue, 0.3, 0.75, -0.7); // knot tail
  }
  if (level >= 2) {
    // Striped tactical vest
    part(h.torso, boxGeo(2.15, 1.7, 1.15), white, 0, 0.05, 0);
    for (const y of [-0.55, -0.05, 0.45]) part(h.torso, boxGeo(2.17, 0.25, 1.17), red, 0, y, 0);
    part(h.torso, boxGeo(0.9, 0.7, 1.18), blue, -0.6, 0.55, 0);
    for (const x of [-0.8, -0.4]) part(h.torso, boxGeo(0.15, 0.15, 0.04), white, x, 0.6, 0.6);
  }
  if (level >= 3) {
    // Cape and shoulder stars
    part(h.torso, boxGeo(2.2, 3.0, 0.15), red, 0, -0.4, -0.6);
    for (const s of [-1, 1]) part(h.torso, boxGeo(0.4, 0.4, 0.06), glow(h, 0xfff59d), s * 1.5, 0.6, 0.52);
  }
  if (level >= 4) {
    // Oil barrel strapped to his back
    const drum = M(0x1a237e);
    part(h.torso, boxGeo(1.4, 2.0, 1.3), drum, 0, 0.1, -1.4);
    for (const y of [-0.5, 0.2, 0.9]) part(h.torso, boxGeo(1.45, 0.12, 1.35), M(0x0d1440), 0, y, -1.4);
    part(h.torso, boxGeo(1.0, 0.5, 0.05), white, 0, -0.15, -2.06); // label
    part(h.torso, boxGeo(0.3, 0.2, 0.3), M(0x424242), 0.35, 1.2, -1.4); // cap
    part(h.torso, boxGeo(0.3, 0.3, 0.06), glow(h, 0xff6d00), 0, -0.15, -2.09); // flame mark
  }
  const len = level >= 3 ? 1.9 : 1.6;
  const gunM = M(0x262626);
  const r = rifle(h, h.rightArm, len, gunM, { scope: level >= 3 });
  const l = rifle(h, h.leftArm, len, gunM, { scope: level >= 3 });
  if (level >= 3) for (const g of [r.gun, l.gun]) part(g, boxGeo(0.34, 0.15, 0.44), red, 0, -len + 0.5, 0); // red barrel band
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.12);
  h.leftArm.rotation.set(-Math.PI / 2, 0, -0.12);
  h.pose = { right: -Math.PI / 2, left: -Math.PI / 2, leftRecoil: 0.35 };
  h.muzzles = [r.muzzle, l.muzzle];
  h.tracer = level >= 3 ? 0xff8a80 : 0xffc107;
  return h;
}

// ---------------------------------------------------------------------------------------------
// Ruptor: heavy burst-cannon gunner
// ---------------------------------------------------------------------------------------------

/** Ruptor (0-5): a bigger cannon and brighter core every level; Lv1 helmet, Lv3 armor, Lv4 power pack, Lv5 glowing visor and prongs. */
function makeRuptor(level) {
  const h = makeHumanoid({ skin: 0xc68642, shirt: 0x212121, pants: 0x1a1a1a, arms: 0x2b2b2b, face: 'soldier' });
  const { M } = h;
  const orange = M(0xef6c00);
  const black = M(0x141414);
  const coreC = level >= 5 ? 0xffd180 : level >= 3 ? 0xffab40 : 0xff9100;
  const core = glow(h, coreC);
  core.emissiveIntensity = 0.6 + level * 0.08;
  h.body.scale.setScalar(1 + level * 0.02);
  for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.1, 0.7, 1.2), black, 0, -1.65, 0.05);
  part(h.torso, boxGeo(2.15, 0.3, 1.1), orange, 0, -0.85, 0); // belt
  part(h.torso, boxGeo(0.3, 2.4, 1.08), orange, 0, 0, 0).rotation.z = 0.6; // ammo strap
  if (level >= 1) {
    // Helmet with an orange visor (glowing at Lv5)
    helmet(h, 0x263238, false);
    part(h.head, boxGeo(1.3, 0.35, 0.1), level >= 5 ? core : orange, 0, 0.75, 0.66);
  } else {
    part(h.head, boxGeo(1.27, 0.2, 1.27), orange, 0, 1.05, 0); // headband
  }
  if (level >= 3) {
    // Heavy armor: chest plate with orange stripes and big pauldrons
    const plate = M(0x2b2b2b);
    part(h.torso, boxGeo(2.3, 1.8, 1.3), plate, 0, 0.1, 0);
    part(h.torso, boxGeo(2.32, 0.15, 1.32), orange, 0, 0.5, 0);
    for (const s of [-1, 1]) {
      part(h.torso, boxGeo(1.2, 0.5, 1.4), plate, s * 1.5, 1.0, 0);
      part(h.torso, boxGeo(1.22, 0.12, 1.42), orange, s * 1.5, 0.8, 0);
    }
  }
  if (level >= 4) {
    // Power pack on the back feeding the cannon
    part(h.torso, boxGeo(1.6, 1.8, 0.9), black, 0, 0.1, -1.05);
    part(h.torso, boxGeo(0.9, 1.0, 0.1), core, 0, 0.2, -1.52);
    part(h.torso, boxGeo(0.15, 0.15, 1.6), core, -1.0, -0.2, -0.3); // cable
  }
  // The burst cannon
  const L = 2.2 + level * 0.25;
  const W = 0.8 + level * 0.08;
  const gun = handGroup(h.rightArm);
  part(gun, boxGeo(W, L, W), M(0x37474f), 0, -L / 2 + 0.4, 0.1);
  part(gun, boxGeo(W + 0.1, 0.25, W + 0.1), orange, 0, -0.1, 0.1);
  part(gun, boxGeo(W + 0.1, 0.25, W + 0.1), orange, 0, -L + 0.8, 0.1);
  const cs = 0.3 + level * 0.07; // glowing core window grows each level
  part(gun, boxGeo(W + 0.06, cs * 2, cs), core, 0, -L / 2 + 0.3, 0.1 + W / 2 - cs / 2 + 0.04);
  part(gun, boxGeo(0.45 + level * 0.04, 0.6, 0.45 + level * 0.04), black, 0, -L + 0.1, 0.1); // barrel
  part(gun, boxGeo(0.55 + level * 0.05, 0.15, 0.55 + level * 0.05), core, 0, -L - 0.2, 0.1); // muzzle ring
  part(gun, boxGeo(0.3, 0.5, 0.35), black, 0, -0.3, -W / 2 - 0.1); // grip
  if (level >= 2) for (const s of [-1, 1]) part(gun, boxGeo(0.12, 0.12, 1.2), core, s * (W / 2 + 0.05), -L / 2 + 0.4, 0.1).rotation.x = Math.PI / 2; // side coils
  if (level >= 5) for (const s of [-1, 1]) part(gun, boxGeo(0.15, 0.9, 0.15), black, s * 0.4, -L - 0.4, 0.1); // prongs
  setMuzzle(h, gun, 0, -L - 0.4, 0.1);
  aimPose(h, 0.3);
  h.recoilScale = 1.5;
  h.projectile = { color: coreC, size: 0.55 + level * 0.07, glowing: true };
  h.tracer = 0xff9100;
  return h;
}

// ---------------------------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------------------------

/** One duck soldier (squad member). Returns a humanoid-like handle with root, legs, mats, muzzles. */
function makeDuck(model) {
  const d = makeThing();
  const { M } = d;
  const shape = duckShape(d.body, M);
  const { head } = shape;
  d.leftLeg = shape.leftLeg;
  d.rightLeg = shape.rightLeg;
  d.muzzles = [];
  const dark = M(0x262626);
  // Weapon group held under the right wing, pointing forward (+Z)
  const w = new THREE.Group();
  w.position.set(-0.95, 1.5, 0.4);
  shape.g.add(w);
  const muzzleAt = (x, y, z) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    w.add(m);
    d.muzzles.push(m);
  };
  d.size = 1;
  if (model === 'duckscout') {
    part(head, boxGeo(1.15, 0.3, 1.15), M(0x558b2f), 0, 1.2, 0); // scout cap
    part(head, boxGeo(1.0, 0.1, 0.5), M(0x33691e), 0, 1.1, 0.75);
    part(w, boxGeo(0.2, 0.3, 0.7), dark, 0, 0, 0.3); // pistol
    muzzleAt(0, 0, 0.7);
    d.tracer = 0xffe066;
  } else if (model === 'ducksoldier') {
    const hm = M(0x556b2f);
    part(head, boxGeo(1.25, 0.45, 1.25), hm, 0, 1.25, 0);
    part(head, boxGeo(1.3, 0.1, 0.4), hm, 0, 1.05, 0.65);
    part(shape.g, boxGeo(1.65, 0.8, 0.6), M(0x4b5320), 0, 1.7, -1.1); // tiny backpack
    part(w, boxGeo(0.2, 0.25, 1.4), dark, 0, 0, 0.5); // tiny rifle
    part(w, boxGeo(0.15, 0.3, 0.2), dark, 0, -0.25, 0.4);
    muzzleAt(0, 0, 1.2);
    d.tracer = 0xffc107;
  } else if (model === 'duckrail') {
    const cyan = glow(d, 0x18ffff);
    part(head, boxGeo(1.15, 0.25, 0.1), cyan, 0, 0.75, 0.58); // visor
    part(head, boxGeo(1.15, 0.3, 1.15), M(0x263238), 0, 1.2, 0);
    part(w, boxGeo(0.35, 0.35, 2.8), M(0x263238), 0, 0.1, 0.9);
    for (const x of [-0.2, 0.2]) part(w, boxGeo(0.08, 0.08, 2.4), cyan, x, 0.1, 1.0);
    part(w, boxGeo(0.45, 0.45, 0.15), cyan, 0, 0.1, 2.3);
    muzzleAt(0, 0.1, 2.4);
    d.tracer = 0x18ffff;
    d.size = 1.1;
  } else if (model === 'duckglad') {
    const bronze = M(0xc9a227);
    part(head, boxGeo(1.25, 0.6, 1.25), bronze, 0, 1.2, 0); // helmet
    part(head, boxGeo(0.2, 0.5, 1.1), M(0xc62828), 0, 1.7, -0.1); // crest
    part(shape.g, boxGeo(0.15, 1.1, 1.1), bronze, 0.95, 1.6, 0.2); // round-ish shield
    part(shape.g, boxGeo(0.18, 0.3, 0.3), M(0x8d6e63), 1.03, 1.6, 0.2);
    w.rotation.x = -0.5; // sword tilted up
    part(w, boxGeo(0.2, 0.2, 0.35), M(0x5d4037), 0, 0, 0); // hilt
    part(w, boxGeo(0.5, 0.1, 0.1), bronze, 0, 0, 0.2); // guard
    part(w, boxGeo(0.12, 0.25, 1.4), M(0xe0e0e0), 0, 0, 0.95); // blade
    muzzleAt(0, 0, 1.65);
    d.tracer = 0xffffff;
    d.size = 1.1;
  } else if (model === 'duckeng') {
    const hat = M(0xff8f00);
    part(head, boxGeo(1.2, 0.4, 1.2), hat, 0, 1.2, 0); // hard hat
    part(head, boxGeo(1.35, 0.1, 1.35), hat, 0, 1.02, 0.05);
    part(shape.g, boxGeo(1.7, 0.25, 2.1), M(0x5d4037), 0, 1.2, -0.1); // tool belt
    const steel = M(0x9e9e9e);
    part(w, boxGeo(0.15, 0.15, 1.0), steel, 0, 0, 0.4); // wrench handle
    part(w, boxGeo(0.15, 0.4, 0.2), steel, 0, 0.1, 0.95);
    part(w, boxGeo(0.15, 0.15, 0.2), steel, 0, 0.25, 1.05);
    muzzleAt(0, 0.1, 1.1);
    d.tracer = 0xffd54f;
  } else {
    muzzleAt(0, 0, 0.5);
    d.tracer = 0xffe066;
  }
  return d;
}

/** A squad of `count` ducks, laid out like makeUnit lays out soldiers. */
function duckSquad(model, count) {
  const u = makeThing();
  u.static = false;
  u.wheels = [];
  u.soldiers = [];
  for (let i = 0; i < count; i++) {
    const d = makeDuck(model);
    d.root.scale.setScalar(0.75 * d.size);
    d.root.position.set(count === 1 ? 0 : (i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
    u.body.add(d.root);
    u.mats.push(...d.mats);
    u.soldiers.push(d);
    u.muzzles.push(d.muzzles[0]);
  }
  u.height = 2.8 * (u.soldiers[0]?.size ?? 1);
  u.tracer = u.soldiers[0]?.tracer ?? 0xffe066;
  return u;
}

/** A big wooden duck on wheels. */
function ducktrojan() {
  const u = makeThing();
  u.static = false;
  u.wheels = [];
  const { M } = u;
  const wood = M(0xa1887f);
  const plank = M(0x795548);
  part(u.body, boxGeo(3.0, 0.4, 4.4), plank, 0, 0.95, 0); // cart
  // Round wooden cart wheels on two axles (vehicle kit)
  for (const z of [-1.5, 1.5]) {
    part(u.body, boxGeo(3.3, 0.16, 0.16), M(0x3e2723), 0, 0.65, z);
    for (const x of [-1.72, 1.72]) wheel(u, u.body, x, 0.65, z, 0.65, 0.34, { tyre: 0x4e342e, rim: 0x8d6e63, lugs: false });
  }
  part(u.body, boxGeo(2.6, 2.2, 3.4), wood, 0, 2.25, -0.2); // body
  for (const y of [1.6, 2.3, 3.0]) part(u.body, boxGeo(2.62, 0.08, 3.42), plank, 0, y, -0.2); // plank seams
  part(u.body, boxGeo(1.6, 1.0, 0.8), wood, 0, 3.0, -2.2); // tail
  for (const x of [-1.35, 1.35]) part(u.body, boxGeo(0.15, 1.3, 2.2), plank, x, 2.4, -0.3); // wings
  part(u.body, boxGeo(1.0, 1.6, 1.0), wood, 0, 3.9, 1.1); // neck
  part(u.body, boxGeo(1.7, 1.7, 1.7), wood, 0, 5.2, 1.3); // head
  part(u.body, boxGeo(1.1, 0.4, 1.0), M(0xbf6a2b), 0, 4.95, 2.6); // beak
  for (const x of [-0.5, 0.5]) part(u.body, boxGeo(0.25, 0.3, 0.05), M(0x111111), x, 5.5, 2.17);
  part(u.body, boxGeo(0.7, 0.6, 0.06), M(0x3e2723), 0, 2.3, 1.52); // hatch
  gunMuzzle(u, u.body, 0, 4.95, 3.15);
  u.height = 6.2;
  u.tracer = 0xffd54f;
  return u;
}

/** A stationary duck-themed gun sentry: tripod, yellow housing with a duck face and a barrel. */
function ducksentry() {
  const u = makeThing();
  u.static = false;
  u.wheels = [];
  const { M } = u;
  const dark = M(0x37474f);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = part(u.body, boxGeo(0.2, 1.4, 0.2), dark, Math.sin(a) * 0.6, 0.6, Math.cos(a) * 0.6);
    leg.rotation.set(Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4);
  }
  part(u.body, boxGeo(0.6, 0.4, 0.6), dark, 0, 1.4, 0);
  const t = turret(u, 1.6);
  const yellow = M(0xffd600);
  part(t, boxGeo(1.4, 1.1, 1.4), yellow, 0, 0.55, 0);
  part(t, boxGeo(0.8, 0.25, 0.5), M(0xff8f00), 0, 0.45, 0.9); // beak
  for (const x of [-0.3, 0.3]) part(t, boxGeo(0.18, 0.22, 0.05), M(0x111111), x, 0.8, 0.71);
  part(t, boxGeo(1.0, 0.3, 0.3), yellow, 0, 0.9, -0.85); // tail
  part(t, boxGeo(0.25, 0.25, 1.4), M(0x212121), 0, 0.2, 1.2); // barrel under the beak
  gunMuzzle(u, t, 0, 0.2, 1.9);
  u.height = 3.0;
  u.tracer = 0xffc107;
  return u;
}

export const TOWER_MODELS_A = {
  rockety: makeRockety,
  samurai: makeSamurai,
  hiredGun: makeHiredGun,
  outlaw: makeOutlaw,
  liberator: makeLiberator,
  ruptor: makeRuptor,
};

export const UNIT_MODELS_A = {
  duckscout: (count = 1) => duckSquad('duckscout', count),
  ducksoldier: (count = 1) => duckSquad('ducksoldier', count),
  duckrail: (count = 1) => duckSquad('duckrail', count),
  ducktrojan: () => ducktrojan(),
  duckglad: (count = 1) => duckSquad('duckglad', count),
  duckeng: (count = 1) => duckSquad('duckeng', count),
  ducksentry: () => ducksentry(),
};
