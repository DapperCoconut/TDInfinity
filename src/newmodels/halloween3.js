import * as THREE from 'three';
import { creature, part } from '../models.js';
import { B, C, K, S, carvedFace, grp, mats, pumpkin, torus } from './halloween2.js';

// Halloween Night 3 enemy looks (2026-11-11, see src/halloween3.js). makeZombie builds the humanoid
// body, then hw3Parts dresses it by `def.hw3`. The creatures (def.model 'n3...') are at the bottom.
// Same layout as halloween2.js: torso box 2 x 2 x 1 centred at y 3, head group at y 4 (head box
// 1.2, centre 0.6 up), arms hang from y 4 (right arm at x -1.5), legs from y 2, each limb 2 long
// down local -y. Characters face +Z. A thing held in the right hand (arm forward) sits near
// (0, -2.1, z) of the arm. Helpers from models.js are only called inside functions.

const shade = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();

/** Walk the legs and pose the arms with `arms(sw, t)`. */
function walker(h, arms, stride = 0.6) {
  h.anim = (phase, t) => {
    const sw = Math.sin(phase) * stride;
    h.leftLeg.rotation.x = sw;
    h.rightLeg.rotation.x = -sw;
    arms(sw, t);
    h.body.position.y = Math.abs(Math.cos(phase)) * 0.12;
    h.body.rotation.z = Math.sin(phase * 0.5) * 0.06;
  };
}

/** Lean the top half forward by `a` round the hips. */
function lean(h, a) {
  h.upper.rotation.x = a;
  h.upper.position.set(0, 2 - 2 * Math.cos(a), -2 * Math.sin(a));
}

/** A hunched runner: leans forward, arms swing low, head up. */
function hunch(h, a, stride = 0.7, more = null) {
  lean(h, a);
  h.head.rotation.x = -a * 0.85;
  h.anim = (phase, t) => {
    const sw = Math.sin(phase);
    h.leftLeg.rotation.x = sw * stride;
    h.rightLeg.rotation.x = -sw * stride;
    h.rightArm.rotation.x = -a + sw * 0.6;
    h.leftArm.rotation.x = -a - sw * 0.6;
    h.body.position.y = Math.abs(Math.cos(phase)) * 0.2;
    more?.(sw, t, phase);
  };
}

/** A floating robed thing: legs hidden, the body bobs, arms reach forward. */
function floater(h, height = 1.0, more = null) {
  for (const l of [h.rightLeg, h.leftLeg]) l.visible = false;
  h.anim = (phase, t) => {
    h.body.position.y = height + Math.sin(t * 2 + phase * 0.05) * 0.3;
    h.body.rotation.x = 0.1;
    h.rightArm.rotation.x = -1.3 + Math.sin(t * 2.2) * 0.15;
    h.leftArm.rotation.x = -1.3 + Math.sin(t * 2.2 + 1.4) * 0.15;
    more?.(t, phase);
  };
}

/** Long robe skirt hanging from the torso. */
const robe = (h, m, len = 2.4, wide = 1.35) => C(h.torso, 0.98, wide, len, m, 0, -0.75 - len / 2 + 0.4, 0, 12);
/** Sleeves over both arms. */
function sleeves(h, m, len = 1.5, w = 1.08) {
  for (const a of [h.rightArm, h.leftArm]) B(a, w, len, w, m, 0, -len / 2, 0);
}
/** Two glowing eyes on the head. */
function eyes(h, gm, y = 0.74, w = 0.22, hh = 0.14, gap = 0.27) {
  for (const s of [-1, 1]) B(h.head, w, hh, 0.06, gm, s * gap, y, 0.63);
}
/** A pointed hood over the head (eyes still show). */
function hood(h, m, tall = 0.7) {
  B(h.head, 1.45, 1.4, 1.4, m, 0, 0.66, -0.06);
  K(h.head, 0.7, tall, m, 0, 1.4 + tall / 2, -0.25, 4).rotation.set(-0.35, Math.PI / 4, 0);
  B(h.head, 1.0, 0.95, 0.1, P0(h, 0x050505), 0, 0.6, 0.63); // the dark inside of the hood
}
const P0 = (h, c) => (h._p0 ??= new Map()).get(c) ?? (h._p0.set(c, h.M(c)), h._p0.get(c));
/** Horns on the head. */
function horns(h, m, len = 0.9, curl = 0.5) {
  for (const s of [-1, 1]) {
    const g = grp(h.head, s * 0.5, 1.15, -0.05);
    g.rotation.z = -s * curl;
    K(g, 0.2, len, m, 0, len / 2, 0, 6);
  }
}
/** Glowing cracks over a part (a few thin bars at angles). */
function cracks(p, gm, list) {
  for (const [x, y, z, len, rot] of list) B(p, 0.07, len, 0.04, gm, x, y, z).rotation.z = rot;
}
/** A held weapon or tool along the right arm (forward): a handle and whatever `top` adds. */
function heldStick(R, m, len = 3.2) {
  const g = grp(R, 0, -2.05, 0.2);
  B(g, 0.18, 0.18, len, m, 0, 0, len / 2 - 0.6);
  return g;
}

/** Dresses a Halloween Night 3 humanoid by `def.hw3`. */
export function hw3Parts(h, def) {
  const X = mats(h);
  const { P, G, T } = X;
  const { torso, head } = h;
  const R = h.rightArm;
  const L = h.leftArm;
  const arms = [R, L];
  const legs = [h.rightLeg, h.leftLeg];
  const headBox = head.children[0];
  const black = P(0x111111);
  const steel = P(0x9aa0a6);
  const wood = P(0x5d4037);
  const bone = P(0xe8e0c8);
  const hex = G(0xd500f9, 0.9);
  const look = def.hw3;

  if (look === 'gourd') {
    // A walking pumpkin: a carved pumpkin head on a body of twisting vines, with a leaf collar.
    headBox.visible = false;
    const r = def.big ? 1.05 : 0.85;
    const pk = pumpkin(head, P(def.skin), r, 0.7, P(shade(def.skin, 0.8)));
    carvedFace(pk, G(0xffd54f, 1), r, 0, !!def.big);
    C(pk, 0.1, 0.14, 0.45, P(0x33691e), 0, r * 0.95, 0).rotation.z = 0.3;
    const vine = P(def.shirt);
    const dark = P(shade(def.shirt, 0.7));
    for (let i = 0; i < 6; i++) {
      const v = B(torso, 2.1, 0.22, 1.1, i % 2 ? vine : dark, 0, -0.85 + i * 0.34, 0);
      v.rotation.z = (i % 2 ? 1 : -1) * 0.25;
    }
    const leaf = P(0x7cb342);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const lf = B(torso, 0.6, 0.08, 0.45, leaf, Math.sin(a) * 0.9, 1.05, Math.cos(a) * 0.55);
      lf.rotation.set(0.5 * Math.cos(a), a, -0.5 * Math.sin(a));
    }
    for (const a of arms) {
      a.children[0].visible = false; // vine arms instead of pumpkin-colored ones
      B(a, 0.75, 2.0, 0.75, dark, 0, -1.0, 0);
      for (let i = 0; i < 4; i++) B(a, 0.95, 0.28, 0.95, i % 2 ? vine : dark, 0, -0.3 - i * 0.45, 0).rotation.y = i * 0.4;
      for (const s of [-1, 0, 1]) B(a, 0.12, 0.5, 0.12, dark, s * 0.3, -2.2, 0.2).rotation.x = 0.3; // twig fingers
    }
    if (def.big) for (const s of [-1, 1]) S(torso, 0.4, P(def.skin), s * 0.9, -0.95, 0.4); // little pumpkins on the hips
  }

  if (look === 'hexSpawn') {
    // A small imp: horns, big glowing eyes, a hex rune on its chest, claws and a pointy tail.
    horns(h, P(0x2a0a3c), 0.6, 0.7);
    eyes(h, G(0xea80fc, 1), 0.72, 0.32, 0.26, 0.28);
    B(head, 0.6, 0.08, 0.05, black, 0, 0.3, 0.62);
    for (const x of [-0.18, 0.18]) K(head, 0.06, 0.18, bone, x, 0.24, 0.63, 4).rotation.x = Math.PI;
    for (const s of [-1, 1]) K(head, 0.15, 0.6, P(def.skin), s * 0.75, 0.75, 0, 4).rotation.z = -s * 1.3; // pointy ears
    B(torso, 0.6, 0.6, 0.05, hex, 0, 0.2, 0.52).rotation.z = Math.PI / 4;
    for (const a of arms) for (const s of [-1, 0, 1]) K(a, 0.08, 0.4, bone, s * 0.3, -2.15, 0.3, 4).rotation.x = Math.PI * 0.8;
    const tail = grp(torso, 0, -0.9, -0.5);
    tail.rotation.x = -0.9;
    B(tail, 0.18, 0.18, 1.6, P(def.skin), 0, 0, -0.8);
    K(tail, 0.25, 0.5, P(0x2a0a3c), 0, 0, -1.8, 4).rotation.x = -Math.PI / 2;
  }

  if (look === 'hexMinion') {
    // A hooded cultist with glowing eyes, a rune sash and a curved dagger.
    hood(h, P(def.shirt), 0.5);
    eyes(h, G(0xe040fb, 1));
    robe(h, P(def.shirt), 1.8, 1.2);
    B(torso, 0.3, 2.4, 1.06, P(0x7b1fa2), 0, 0, 0).rotation.z = 0.6;
    for (const y of [0.5, -0.2]) B(torso, 0.2, 0.2, 0.05, hex, -0.15 + y * 0.5, y, 0.55).rotation.z = Math.PI / 4;
    sleeves(h, P(def.shirt));
    const g = grp(R, 0, -2.1, 0.3);
    B(g, 0.14, 0.14, 0.5, wood, 0, 0, 0);
    B(g, 0.06, 0.3, 1.0, steel, 0, 0.05, 0.7).rotation.x = -0.3;
  }

  if (look === 'hexWraith') {
    // A floating hooded spirit in rags: no legs, glowing eyes, see-through tatters.
    hood(h, P(def.shirt), 0.8);
    eyes(h, G(0xb388ff, 1), 0.7, 0.28, 0.1);
    const rag = T(def.skin, 0.55);
    C(torso, 0.95, 1.5, 3.0, P(def.shirt), 0, -1.3, 0, 12);
    const tatters = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const r = B(torso, 0.6, 1.0, 0.1, rag, Math.sin(a) * 1.4, -2.9, Math.cos(a) * 1.4);
      r.rotation.y = a;
      tatters.push(r);
    }
    for (const a of arms) {
      B(a, 1.0, 1.8, 1.0, P(def.shirt), 0, -0.9, 0);
      B(a, 0.9, 0.5, 0.2, rag, 0, -2.0, -0.3);
    }
    floater(h, 1.3, (t) => tatters.forEach((r, i) => (r.rotation.x = Math.sin(t * 5 + i) * 0.35)));
  }

  if (look === 'hexRevenant') {
    // An undead knight: closed helm with a glowing slit, rune breastplate, shoulder plates, sword.
    const plate = P(def.shirt);
    const trim = P(0x7e57c2);
    B(head, 1.35, 1.35, 1.35, plate, 0, 0.62, 0);
    B(head, 0.95, 0.12, 0.08, G(0xe040fb, 1), 0, 0.75, 0.69);
    B(head, 0.16, 0.7, 0.16, trim, 0, 1.4, -0.1);
    B(torso, 2.15, 1.7, 1.15, plate, 0, 0.2, 0);
    B(torso, 0.5, 0.5, 0.06, hex, 0, 0.35, 0.6).rotation.z = Math.PI / 4;
    for (const a of arms) {
      B(a, 1.4, 0.6, 1.4, plate, 0, -0.05, 0);
      B(a, 1.42, 0.12, 1.42, trim, 0, -0.38, 0);
      B(a, 1.12, 0.6, 1.12, plate, 0, -1.6, 0);
    }
    for (const l of legs) B(l, 1.12, 0.8, 1.15, plate, 0, -1.5, 0.05);
    const g = heldStick(R, P(0x3e2723), 1.0);
    B(g, 0.6, 0.15, 0.15, trim, 0, 0, 0.45);
    B(g, 0.1, 0.32, 3.0, steel, 0, 0, 2.0);
    B(g, 0.06, 0.1, 2.8, G(0xb388ff, 0.6), 0, 0.12, 2.0);
  }

  if (look === 'hexCorpse') {
    // A rotting body split by glowing purple hex cracks, in a torn robe, ribs showing.
    eyes(h, G(0xe040fb, 1), 0.72, 0.2, 0.2);
    B(head, 0.5, 0.2, 0.05, black, 0.05, 0.28, 0.61).rotation.z = -0.15;
    cracks(head, hex, [[-0.3, 0.95, 0.62, 0.4, 0.4], [0.35, 0.4, 0.62, 0.35, -0.5]]);
    for (let i = 0; i < 4; i++) B(torso, 1.0, 0.1, 0.05, bone, 0, 0.6 - i * 0.3, 0.52);
    B(torso, 0.1, 1.2, 0.05, bone, 0, 0.15, 0.53);
    for (const [x, y, z, w, hh] of [[-0.8, -0.7, 0.51, 0.5, 0.7], [0.75, 0.6, 0.51, 0.4, 0.6], [0.6, -0.6, 0.51, 0.6, 0.6]]) B(torso, w, hh, 0.05, P(def.shirt), x, y, z);
    cracks(torso, hex, [[-0.6, 0.3, 0.53, 0.8, 0.5], [0.5, -0.3, 0.53, 0.7, -0.6]]);
    for (const a of arms) cracks(a, hex, [[0, -1.1, 0.52, 0.8, 0.3]]);
    for (const l of legs) B(l, 1.05, 0.8, 1.05, P(def.shirt), 0, -0.4, 0);
  }

  if (look === 'corrupted' || look === 'corroded') {
    // Corrupted: pitch black with glowing purple cracks and spiky shoulders. Corroded: rusty
    // green with drips, rust patches, one big glowing eye and a pipe on its back.
    const cor = look === 'corroded';
    const glowC = cor ? 0xc6ff00 : 0xaa00ff;
    const gm = G(glowC, 1);
    if (cor) {
      B(head, 0.36, 0.36, 0.06, gm, -0.25, 0.75, 0.62);
      B(head, 0.24, 0.1, 0.06, P(0x33691e), 0.28, 0.75, 0.62);
      const rust = P(0x8d5524);
      for (const [p, x, y, w] of [[torso, -0.5, 0.4, 0.7], [torso, 0.6, -0.5, 0.6], [head, 0.3, 1.0, 0.5]]) B(p, w, w * 0.7, 0.05, rust, x, y, p === head ? 0.62 : 0.52);
      for (const [x, len] of [[-0.6, 0.5], [0.1, 0.8], [0.7, 0.4]]) B(torso, 0.12, len, 0.08, gm, x, -1.0 - len / 2, 0.45);
      const pipe = grp(torso, 0.5, 0.4, -0.6);
      C(pipe, 0.18, 0.18, 2.2, P(0x5d6b50), 0, 0.5, 0, 8);
      C(pipe, 0.26, 0.26, 0.3, P(0x37474f), 0, 1.6, 0, 8);
      S(pipe, 0.18, gm, 0, 1.85, 0);
    } else {
      eyes(h, gm, 0.74, 0.24, 0.16);
      cracks(head, gm, [[-0.35, 0.4, 0.62, 0.4, 0.5], [0.3, 1.0, 0.62, 0.35, -0.4]]);
      cracks(torso, gm, [[-0.5, 0.4, 0.52, 1.0, 0.6], [0.4, -0.1, 0.52, 1.2, -0.5], [0, -0.7, 0.52, 0.6, 0.2]]);
      for (const a of arms) {
        cracks(a, gm, [[0, -1.0, 0.52, 0.9, 0.2]]);
        for (const z of [-0.2, 0.25]) K(a, 0.18, 0.6, black, 0, 0.35, z, 5);
      }
    }
  }

  if (look === 'tombRaider') {
    // An explorer in a wide hat and bandana, with a satchel, bandaged arms and a burning torch.
    const hat = P(0x6d4c41);
    C(head, 1.05, 1.05, 0.1, hat, 0, 1.2, 0, 16);
    C(head, 0.62, 0.7, 0.55, hat, 0, 1.45, 0, 12);
    C(head, 0.71, 0.71, 0.15, P(0x3e2723), 0, 1.3, 0, 12);
    B(head, 1.26, 0.45, 0.2, P(0xc62828), 0, 0.3, 0.58);
    eyes(h, G(0xffab40, 0.9), 0.74, 0.2, 0.12);
    B(torso, 0.25, 2.5, 1.06, P(0x4e342e), 0, 0, 0).rotation.z = -0.65;
    B(torso, 0.8, 0.7, 0.4, P(0x8d6e63), 0.7, -0.75, 0.55);
    B(torso, 2.06, 0.25, 1.06, P(0x3e2723), 0, -0.85, 0);
    const band = [P(0xe0d6c0), P(0xd7ccc8), P(0xbcaaa4)];
    for (const a of arms) for (let i = 0; i < 4; i++) B(a, 1.05, 0.3, 1.05, band[i % 3], 0, -0.6 - i * 0.4, 0).rotation.y = (i % 2 ? 1 : -1) * 0.12;
    const g = heldStick(R, wood, 1.4);
    const fire = [];
    for (const [x, z, s] of [[0, 0.95, 0.4], [0.12, 1.05, 0.28], [-0.1, 1.0, 0.25]]) fire.push(B(g, s, s * 1.6, s, G(0xff9100, 1), x, s * 0.8, z));
    walker(h, (sw, t) => {
      R.rotation.x = -1.2 + sw * 0.15;
      L.rotation.x = -sw * 0.7;
      fire.forEach((f, i) => (f.scale.y = 1 + Math.sin(t * 10 + i * 2) * 0.25));
    });
  }

  if (look === 'chompski') {
    // A brute that is mostly mouth: a huge hinged jaw full of teeth, a round belly, stubby legs.
    headBox.visible = false;
    const skin = P(def.skin);
    const gum = P(0x8e0000);
    B(head, 1.9, 0.8, 1.7, skin, 0, 1.2, 0);
    for (const s of [-1, 1]) {
      S(head, 0.22, P(0xffffff), s * 0.45, 1.7, 0.6);
      S(head, 0.1, black, s * 0.45, 1.72, 0.8);
    }
    B(head, 1.7, 0.2, 1.5, gum, 0, 0.75, 0.05);
    for (let i = 0; i < 6; i++) K(head, 0.12, 0.35, bone, -0.7 + i * 0.28, 0.65, 0.78, 4).rotation.x = Math.PI;
    const jaw = grp(head, 0, 0.7, -0.6);
    B(jaw, 1.8, 0.6, 1.7, skin, 0, -0.35, 0.65);
    B(jaw, 1.6, 0.12, 1.5, gum, 0, -0.03, 0.65);
    for (let i = 0; i < 6; i++) K(jaw, 0.12, 0.35, bone, -0.7 + i * 0.28, 0.12, 1.38, 4);
    S(torso, 1.3, skin, 0, -0.2, 0.25).scale.set(1, 0.9, 0.8);
    B(torso, 2.3, 0.3, 1.2, P(def.shirt), 0, -0.9, 0);
    walker(h, (sw, t) => {
      R.rotation.x = -0.4 + sw * 0.4;
      L.rotation.x = -0.4 - sw * 0.4;
      jaw.rotation.x = 0.25 + Math.abs(Math.sin(t * 6)) * 0.4;
    }, 0.45);
  }

  if (look === 'blight') {
    // Dripping green ooze: glowing toxic sacs on its back, bubbles, slime feet.
    const ooze = P(def.skin);
    const tox = G(0x76ff03, 0.8);
    eyes(h, G(0xeeff41, 1), 0.74, 0.24, 0.16);
    for (const [x, y, r] of [[-0.3, 1.2, 0.35], [0.35, 1.15, 0.28]]) S(head, r, ooze, x, y, 0);
    for (const [x, y, z, r] of [[-0.55, 0.6, -0.65, 0.45], [0.5, 0.2, -0.7, 0.38], [0, -0.4, -0.7, 0.42]]) S(torso, r, tox, x, y, z);
    for (const [x, y, r] of [[-0.6, 0.3, 0.2], [0.5, -0.4, 0.15], [0.2, 0.7, 0.12]]) S(torso, r, P(0xccff90), x, y, 0.52);
    const drips = [];
    for (const [p, x, y] of [[torso, -0.7, -1.1], [torso, 0.3, -1.2], [R, 0.2, -2.2], [L, -0.2, -2.25], [head, 0.4, 0.05]]) drips.push(B(p, 0.14, 0.5, 0.14, tox, x, y, p === head ? 0.55 : 0.4));
    for (const l of legs) B(l, 1.3, 0.3, 1.5, ooze, 0, -1.95, 0.15);
    walker(h, (sw, t) => {
      R.rotation.x = -1.3 + sw * 0.2;
      L.rotation.x = -1.3 - sw * 0.2;
      drips.forEach((d, i) => (d.scale.y = 1 + Math.sin(t * 3 + i) * 0.4));
    }, 0.35);
  }

  if (look === 'rotting') {
    // A huge rotting zombie: bone spikes out of its back, an open rib cage, moss, flies.
    const rot = P(def.skin);
    eyes(h, G(0xffeb3b, 1), 0.74, 0.22, 0.16);
    B(head, 0.7, 0.25, 0.05, black, 0, 0.3, 0.61);
    S(torso, 1.2, rot, 0, -0.1, 0.1).scale.set(1.1, 1, 0.8);
    B(torso, 1.0, 1.0, 0.1, P(0x3a0d0d), 0, 0.0, 0.8);
    for (let i = 0; i < 4; i++) B(torso, 1.1, 0.1, 0.1, bone, 0, 0.35 - i * 0.24, 0.86);
    for (const [x, y] of [[-0.6, 1.0], [0, 1.2], [0.6, 1.0], [-0.3, 0.3], [0.4, 0.3]]) K(torso, 0.15, 0.8, bone, x, y, -0.7, 5).rotation.x = -0.9;
    const moss = P(0x33691e);
    for (const [x, y, r] of [[-0.8, 0.9, 0.35], [0.85, -0.5, 0.3], [0, 1.15, 0.3]]) S(torso, r, moss, x, y, 0.3);
    for (const a of arms) B(a, 1.3, 1.6, 1.3, rot, 0, -0.9, 0);
    const flies = grp(head, 0, 1.6, 0);
    for (let i = 0; i < 5; i++) B(flies, 0.1, 0.1, 0.1, black, Math.sin(i * 1.3) * 0.7, (i % 3) * 0.2, Math.cos(i * 1.3) * 0.7);
    walker(h, (sw, t) => {
      R.rotation.x = -1.4 + sw * 0.15;
      L.rotation.x = -1.2 - sw * 0.15;
      flies.rotation.y = t * 3;
    }, 0.35);
  }

  if (look === 'horror') {
    // Long-armed horror: a head full of glowing eyes, claws to the ground, a tattered shroud.
    const gm = G(0xff1744, 1);
    for (const [x, y, s] of [[-0.3, 0.8, 0.18], [0.3, 0.8, 0.18], [0, 1.0, 0.14], [-0.2, 0.5, 0.12], [0.25, 0.5, 0.12], [0, 0.65, 0.1]]) B(head, s, s, 0.06, gm, x, y, 0.63);
    B(head, 0.8, 0.12, 0.05, black, 0, 0.25, 0.61);
    const shroud = P(def.shirt);
    B(torso, 2.2, 2.2, 1.15, shroud, 0, 0, 0);
    for (let i = 0; i < 6; i++) B(torso, 0.35, 0.8 + (i % 3) * 0.3, 0.1, shroud, -0.9 + i * 0.36, -1.4, 0.55);
    for (const a of arms) {
      B(a, 0.7, 3.0, 0.7, P(def.skin), 0, -1.5, 0);
      for (const s of [-1, 0, 1]) K(a, 0.08, 0.8, bone, s * 0.22, -3.3, 0.1, 4).rotation.x = Math.PI;
    }
    hunch(h, 0.35, 0.6);
  }

  if (look === 'conjurer') {
    // A wizard: tall rune hat, long beard, star-sewn robe and a staff topped with a glowing orb;
    // runes float round him.
    const cloth = P(def.shirt);
    const hat = grp(head, 0, 1.2, 0);
    C(hat, 1.2, 1.2, 0.12, cloth, 0, 0, 0, 16);
    K(hat, 0.65, 2.2, cloth, 0, 1.1, 0, 12).rotation.z = -0.15;
    B(hat, 0.3, 0.3, 0.05, hex, 0, 0.6, 0.48).rotation.z = Math.PI / 4;
    eyes(h, G(0xea80fc, 1), 0.76, 0.2, 0.12);
    B(head, 1.0, 1.0, 0.3, P(0xeeeeee), 0, 0.05, 0.55);
    K(head, 0.4, 1.0, P(0xeeeeee), 0, -0.8, 0.6, 6).rotation.x = Math.PI;
    robe(h, cloth, 2.4, 1.4);
    for (const [x, y] of [[-0.6, 0.4], [0.5, -0.2], [-0.3, -0.9], [0.6, 0.7]]) B(torso, 0.18, 0.18, 0.05, G(0xfff59d, 0.8), x, y, 0.52).rotation.z = Math.PI / 4;
    sleeves(h, cloth, 1.8, 1.2);
    const staff = heldStick(R, wood, 4.5);
    staff.rotation.x = -0.9;
    S(staff, 0.45, G(0xd500f9, 1), 0, 0, 3.9);
    part(staff, torusGeo(0.6), P(0xffd54f), 0, 0, 3.9);
    const ring = grp(h.body, 0, 4.0, 0);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      B(ring, 0.4, 0.4, 0.05, hex, Math.sin(a) * 2.2, 0, Math.cos(a) * 2.2).rotation.set(0, a, Math.PI / 4);
    }
    floater(h, 0.4, (t) => {
      ring.rotation.y = t * 1.2;
      R.rotation.x = -0.6;
    });
    for (const l of legs) l.visible = false;
  }

  if (look === 'tormentor') {
    // A horned jailer: spiked helm, chains wrapped round him and hanging, a flail, red eyes.
    const iron = P(0x424242);
    B(head, 1.35, 1.0, 1.35, iron, 0, 0.9, 0);
    horns(h, bone, 1.2, 0.6);
    eyes(h, G(0xff1744, 1), 0.68, 0.24, 0.12);
    const chain = P(0x757575);
    for (let i = 0; i < 9; i++) B(torso, 0.28, 0.16, 0.12, chain, -1.0 + i * 0.25, 0.9 - i * 0.22, 0.56).rotation.z = 0.7;
    for (let i = 0; i < 9; i++) B(torso, 0.28, 0.16, 0.12, chain, 1.0 - i * 0.25, 0.9 - i * 0.22, -0.56).rotation.z = -0.7;
    B(torso, 2.1, 0.35, 1.1, P(0x3e2723), 0, -0.85, 0);
    for (const a of arms) {
      B(a, 1.35, 0.5, 1.35, iron, 0, -0.05, 0);
      for (const z of [-0.3, 0.3]) K(a, 0.15, 0.5, iron, 0, 0.4, z, 5);
      for (let i = 0; i < 4; i++) B(a, 0.2, 0.3, 0.12, chain, 0.5, -1.0 - i * 0.28, 0.5);
    }
    const g = heldStick(R, wood, 1.2);
    for (let i = 0; i < 4; i++) B(g, 0.12, 0.12, 0.22, chain, 0, -0.2 * i, 0.8 + i * 0.22).rotation.x = 0.6;
    const ball = S(g, 0.45, iron, 0, -0.9, 1.8);
    for (const [x, y, z] of [[0.5, 0, 0], [-0.5, 0, 0], [0, 0.5, 0], [0, 0, 0.5]]) K(ball, 0.1, 0.35, steel, x, y, z, 4).lookAt(x * 10, y * 10, z * 10);
  }

  if (look === 'bunnyMask' || look === 'plagueMask') {
    // Hazmat suits. Bunny: yellow suit, gas mask with bunny ears. Plague: dark suit, a beaked
    // plague mask, glowing green vials. Both carry an air tank.
    const plague = look === 'plagueMask';
    const suit = P(def.shirt);
    const mask = P(plague ? 0x212121 : 0x424242);
    B(head, 1.4, 1.4, 1.4, suit, 0, 0.62, 0);
    B(head, 1.0, 0.8, 0.2, mask, 0, 0.62, 0.7);
    for (const s of [-1, 1]) C(head, 0.24, 0.24, 0.12, G(plague ? 0xff1744 : 0x80deea, 0.8), s * 0.28, 0.78, 0.82, 10).rotation.x = Math.PI / 2;
    if (plague) {
      K(head, 0.3, 1.3, mask, 0, 0.45, 1.35, 6).rotation.x = Math.PI / 2;
      C(head, 1.0, 1.0, 0.1, black, 0, 1.38, 0, 14);
      C(head, 0.6, 0.65, 0.6, black, 0, 1.7, 0, 12);
    } else {
      C(head, 0.3, 0.35, 0.4, mask, 0, 0.3, 0.9, 10).rotation.x = Math.PI / 2;
      for (const s of [-1, 1]) {
        const ear = grp(head, s * 0.4, 1.3, 0);
        ear.rotation.z = -s * 0.2;
        B(ear, 0.38, 1.4, 0.2, P(def.skin), 0, 0.7, 0);
        B(ear, 0.2, 1.0, 0.05, P(0xf48fb1), 0, 0.7, 0.11);
      }
    }
    const tank = grp(torso, 0, 0.1, -0.85);
    C(tank, 0.45, 0.45, 1.8, P(plague ? 0x1b5e20 : 0xff6f00), 0, 0, 0, 10);
    C(tank, 0.2, 0.2, 0.3, steel, 0, 1.0, 0, 8);
    B(torso, 1.2, 0.08, 0.05, P(0x212121), 0, 0.85, 0.52);
    if (plague) for (const x of [-0.5, 0, 0.5]) C(torso, 0.12, 0.12, 0.4, G(0x76ff03, 0.8), x, -0.85, 0.6, 8);
    else B(torso, 0.5, 0.5, 0.05, P(0x212121), 0, 0.2, 0.52).rotation.z = Math.PI / 4; // the hazard sign
    for (const a of arms) B(a, 1.15, 0.4, 1.15, P(0x212121), 0, -1.8, 0);
    for (const l of legs) B(l, 1.15, 0.45, 1.3, P(0x212121), 0, -1.8, 0.1);
  }

  if (look === 'hulk') {
    // Bulging purple muscles with glowing veins, a tiny head between huge shoulders, torn trousers.
    const skin = P(def.skin);
    const vein = G(0xea80fc, 0.7);
    head.scale.setScalar(0.8);
    eyes(h, G(0xff1744, 1), 0.72, 0.24, 0.12);
    B(head, 0.8, 0.15, 0.05, black, 0, 0.3, 0.61);
    B(torso, 2.8, 2.2, 1.5, skin, 0, 0.3, 0);
    for (const s of [-1, 1]) S(torso, 0.85, skin, s * 1.1, 1.2, 0);
    B(torso, 1.8, 0.8, 0.1, P(shade(def.skin, 0.8)), 0, 0.55, 0.76);
    cracks(torso, vein, [[-0.8, 0.0, 0.77, 1.0, 0.4], [0.7, -0.2, 0.77, 1.0, -0.4]]);
    for (const a of arms) {
      a.position.x *= 1.25;
      S(a, 0.9, skin, 0, -0.6, 0);
      B(a, 1.4, 1.4, 1.4, skin, 0, -1.6, 0);
      cracks(a, vein, [[0, -0.9, 0.85, 0.9, 0.3]]);
    }
    for (const l of legs) for (const [x, y] of [[-0.3, -1.6], [0.3, -1.7]]) B(l, 0.35, 0.5, 1.06, P(def.pants), x, y, 0).rotation.z = x;
  }

  if (look === 'eclipsed') {
    // Shadow figure: a black eclipse disc with a burning rim behind its head, white eyes, and a
    // cloak of shadow. (It has 80% defense.)
    const halo = grp(head, 0, 0.8, -0.6);
    C(halo, 1.4, 1.4, 0.1, black, 0, 0, 0, 24).rotation.x = Math.PI / 2;
    part(halo, torusGeo(1.45, 0.12), G(0xff9100, 1), 0, 0, 0);
    for (const s of [-1, 1]) B(head, 0.3, 0.12, 0.06, G(0xffffff, 1), s * 0.27, 0.74, 0.63);
    B(torso, 2.4, 3.6, 0.15, P(0x050505), 0, -0.9, -0.62);
    for (const a of arms) B(a, 1.15, 1.6, 1.15, P(0x050505), 0, -0.8, 0);
    walker(h, (sw, t) => {
      R.rotation.x = -0.25 + sw * 0.3;
      L.rotation.x = -0.25 - sw * 0.3;
      halo.rotation.z = t * 0.6;
    }, 0.45);
  }

  if (look === 'ghoul') {
    // A pale, starving ghoul: bald, black eyes, long claws, a loincloth. Runs on all fours.
    for (const s of [-1, 1]) B(head, 0.3, 0.3, 0.06, black, s * 0.27, 0.74, 0.63);
    B(head, 0.7, 0.2, 0.05, P(0x3a0d0d), 0, 0.28, 0.61);
    for (let i = 0; i < 5; i++) K(head, 0.05, 0.16, bone, -0.24 + i * 0.12, 0.24, 0.63, 4).rotation.x = Math.PI;
    for (let i = 0; i < 4; i++) B(torso, 1.6, 0.08, 0.05, P(shade(def.skin, 0.75)), 0, 0.6 - i * 0.28, 0.52);
    B(torso, 1.6, 0.6, 1.1, P(def.pants), 0, -0.85, 0);
    for (const a of arms) for (const s of [-1, 0, 1]) K(a, 0.07, 0.6, bone, s * 0.25, -2.25, 0.15, 4).rotation.x = Math.PI * 0.85;
    hunch(h, 0.9, 1.0);
  }

  if (look === 'hexWeaver') {
    // A spider-like weaver: robe, many glowing eyes, and threads of light strung between its
    // hands, with a spool on its back.
    const cloth = P(def.shirt);
    hood(h, cloth, 0.4);
    for (const [x, y] of [[-0.3, 0.8], [0.3, 0.8], [-0.15, 0.55], [0.15, 0.55]]) B(head, 0.14, 0.14, 0.06, G(0xea80fc, 1), x, y, 0.68);
    robe(h, cloth, 2.2, 1.35);
    sleeves(h, cloth, 1.8, 1.15);
    const thread = G(0xe1bee7, 1);
    const web = grp(h.body, 0, 3.0, 1.9);
    for (let i = 0; i < 5; i++) B(web, 2.9, 0.04, 0.04, thread, 0, -0.5 + i * 0.25, 0).rotation.z = (i - 2) * 0.12;
    const spool = grp(torso, 0, 0.3, -0.8);
    C(spool, 0.5, 0.5, 1.4, P(0x7e57c2), 0, 0, 0, 12).rotation.z = Math.PI / 2;
    for (const s of [-1, 1]) C(spool, 0.7, 0.7, 0.12, wood, s * 0.75, 0, 0, 12).rotation.z = Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const leg = grp(torso, (i < 2 ? -1 : 1) * 0.9, -0.2 + (i % 2) * 0.5, -0.4);
      leg.rotation.z = (i < 2 ? 1 : -1) * 2.2;
      B(leg, 0.12, 1.4, 0.12, black, 0, 0.7, 0);
    }
    walker(h, (sw, t) => {
      R.rotation.x = -1.3;
      L.rotation.x = -1.3;
      R.rotation.z = -0.25;
      L.rotation.z = 0.25;
      web.position.y = 3.0 + Math.sin(t * 2) * 0.1;
      spool.rotation.x = t * 2;
    }, 0.4);
  }

  if (look === 'apostle') {
    // A pale robed priest with a golden halo, a hood and a lantern full of trapped souls.
    const cloth = P(def.shirt);
    hood(h, P(0xeceff1), 0.3);
    eyes(h, G(0x80deea, 1), 0.7, 0.24, 0.12);
    const halo = grp(head, 0, 2.0, -0.2);
    halo.rotation.x = Math.PI / 2 - 0.2;
    part(halo, torusGeo(0.7, 0.08), G(0xffd54f, 1), 0, 0, 0);
    robe(h, cloth, 2.6, 1.45);
    B(torso, 0.4, 3.4, 0.06, P(0xffd54f), 0, -0.6, 0.53);
    sleeves(h, cloth, 1.8, 1.2);
    const g = grp(R, 0, -2.2, 0.4);
    B(g, 0.06, 0.6, 0.06, steel, 0, -0.3, 0);
    const lamp = grp(g, 0, -0.95, 0);
    B(lamp, 0.6, 0.7, 0.6, T(0x80deea, 0.5), 0, 0, 0);
    S(lamp, 0.18, G(0x80deea, 1), 0, 0, 0);
    for (const y of [-0.4, 0.4]) B(lamp, 0.7, 0.1, 0.7, P(0xffd54f), 0, y, 0);
    floater(h, 0.3, (t) => {
      R.rotation.x = -1.0;
      lamp.rotation.y = t * 1.5;
    });
    for (const l of legs) l.visible = false;
  }

  if (look === 'withered') {
    // A thin, grey dead-tree person: cracked bark skin, bare branches growing from its back and
    // head, hunched, with twig fingers.
    const bark = P(def.skin);
    const dark = P(shade(def.skin, 0.6));
    for (const s of [-1, 1]) B(head, 0.2, 0.2, 0.06, G(0xffab40, 0.9), s * 0.26, 0.72, 0.62);
    cracks(head, dark, [[-0.2, 0.4, 0.62, 0.5, 0.2], [0.3, 1.0, 0.62, 0.4, -0.3]]);
    cracks(torso, dark, [[-0.5, 0.2, 0.52, 1.4, 0.15], [0.4, -0.3, 0.52, 1.2, -0.2], [0, 0.6, 0.52, 0.8, 0.5]]);
    const branch = (p, x, y, z, rz, rx, len) => {
      const g = grp(p, x, y, z);
      g.rotation.set(rx, 0, rz);
      B(g, 0.16, len, 0.16, dark, 0, len / 2, 0);
      const t2 = grp(g, 0, len * 0.65, 0);
      t2.rotation.z = rz > 0 ? -0.8 : 0.8;
      B(t2, 0.1, len * 0.5, 0.1, dark, 0, len * 0.25, 0);
    };
    branch(torso, -0.5, 0.8, -0.5, 0.5, -0.4, 2.0);
    branch(torso, 0.5, 0.9, -0.5, -0.6, -0.3, 2.2);
    branch(head, 0.3, 1.1, -0.2, -0.3, 0, 1.2);
    for (const a of arms) {
      B(a, 0.75, 2.0, 0.75, bark, 0, -1.0, 0);
      for (const s of [-1, 0, 1]) B(a, 0.08, 0.6, 0.08, dark, s * 0.2, -2.3, 0.1).rotation.z = s * 0.3;
    }
    hunch(h, 0.4, 0.45);
  }

  if (look === 'titus') {
    // A fallen giant knight: crested helm, armor split by purple cracks, a torn cape, a tower
    // shield and a long sword.
    const plate = P(def.skin);
    const gm = G(0xd500f9, 1);
    B(head, 1.4, 1.4, 1.4, plate, 0, 0.65, 0);
    B(head, 0.9, 0.12, 0.08, gm, 0, 0.72, 0.72);
    for (let i = 0; i < 5; i++) B(head, 0.18, 0.5 - Math.abs(i - 2) * 0.1, 0.3, P(0x6a1b9a), 0, 1.5, -0.6 + i * 0.3);
    B(torso, 2.3, 2.1, 1.3, plate, 0, 0.05, 0);
    cracks(torso, gm, [[-0.5, 0.3, 0.66, 1.0, 0.5], [0.4, -0.3, 0.66, 0.9, -0.4]]);
    B(torso, 2.4, 3.8, 0.12, P(def.shirt), 0, -1.0, -0.72);
    for (const a of arms) {
      B(a, 1.5, 0.7, 1.5, plate, 0, -0.05, 0);
      B(a, 1.2, 1.0, 1.2, plate, 0, -1.5, 0);
    }
    for (const l of legs) B(l, 1.2, 1.2, 1.2, plate, 0, -1.3, 0);
    const sh = grp(L, 0.3, -1.6, 0.8);
    B(sh, 0.2, 3.0, 2.0, plate, 0, 0, 0);
    B(sh, 0.24, 0.6, 0.6, gm, 0, 0.2, 0).rotation.x = Math.PI / 4;
    const g = heldStick(R, P(0x212121), 1.0);
    B(g, 0.9, 0.18, 0.2, plate, 0, 0, 0.45);
    B(g, 0.14, 0.5, 4.2, steel, 0, 0, 2.6);
    B(g, 0.08, 0.12, 4.0, gm, 0, 0.2, 2.6);
  }

  if (look === 'maw') {
    // A giant with a mouth across its chest, a small horned head and an enormous sword.
    const skin = P(def.skin);
    horns(h, bone, 1.0, 0.4);
    eyes(h, G(0xff1744, 1), 0.74, 0.26, 0.14);
    B(torso, 2.4, 2.3, 1.4, skin, 0, 0.1, 0);
    B(torso, 1.9, 1.0, 0.1, P(0x3a0010), 0, -0.1, 0.72);
    for (let i = 0; i < 7; i++) {
      K(torso, 0.12, 0.4, bone, -0.8 + i * 0.27, 0.3, 0.75, 4).rotation.x = Math.PI;
      K(torso, 0.12, 0.4, bone, -0.8 + i * 0.27, -0.5, 0.75, 4);
    }
    B(torso, 0.5, 0.25, 0.1, G(0xff1744, 0.8), 0, -0.1, 0.74); // a glowing tongue
    for (const a of arms) B(a, 1.4, 0.7, 1.4, P(def.shirt), 0, -0.1, 0);
    const g = heldStick(R, P(0x212121), 1.2);
    B(g, 1.2, 0.2, 0.3, P(0x4a148c), 0, 0, 0.6);
    B(g, 0.16, 0.8, 5.0, steel, 0, 0, 3.3);
    K(g, 0.4, 0.8, steel, 0, 0, 6.2, 4).rotation.x = Math.PI / 2;
    B(g, 0.1, 0.2, 4.8, hex, 0, 0.3, 3.3);
  }

  if (look === 'coffin') {
    // A coffin where its head should be (a cross on the lid, chains round it), a black suit.
    headBox.visible = false;
    const lid = grp(head, 0, 0.9, 0);
    const wd = P(0x4e342e);
    B(lid, 1.4, 2.2, 0.9, wd, 0, 0.3, 0);
    B(lid, 1.0, 0.6, 0.9, wd, 0, 1.6, 0);
    B(lid, 1.5, 0.1, 1.0, P(0x3e2723), 0, 1.2, 0);
    B(lid, 0.18, 1.0, 0.05, P(0xbdbdbd), 0, 0.6, 0.47);
    B(lid, 0.6, 0.18, 0.05, P(0xbdbdbd), 0, 0.8, 0.47);
    for (const s of [-1, 1]) B(lid, 0.14, 0.14, 0.05, G(0xff1744, 1), s * 0.3, 1.5, 0.47);
    for (const y of [-0.3, 0.9]) B(lid, 1.46, 0.12, 0.96, P(0x757575), 0, y, 0);
    B(torso, 0.5, 1.6, 0.06, P(0xeeeeee), 0, 0.2, 0.51);
    B(torso, 0.2, 0.6, 0.07, P(0x8e0000), 0, 0.5, 0.53);
    sleeves(h, P(def.shirt));
  }

  if (look === 'skeleton') {
    // A red skeleton: a skull, bare ribs, thin bones for arms and legs.
    const b = P(def.skin);
    const dark = P(shade(def.skin, 0.4));
    const none = h.M(0x000000);
    none.visible = false;
    torso.material = none; // bare bones: the torso box itself is hidden (its parts still show)
    for (const a of [...arms, ...legs]) a.children[0].visible = false;
    for (const s of [-1, 1]) B(head, 0.32, 0.32, 0.06, black, s * 0.26, 0.7, 0.62);
    B(head, 0.16, 0.2, 0.06, black, 0, 0.45, 0.62);
    for (let i = 0; i < 5; i++) B(head, 0.1, 0.18, 0.06, P(0xffffff), -0.24 + i * 0.12, 0.2, 0.62);
    B(torso, 0.3, 2.0, 0.3, b, 0, 0, -0.2);
    for (let i = 0; i < 4; i++) B(torso, 1.6 - i * 0.15, 0.16, 0.9, b, 0, 0.7 - i * 0.35, 0);
    B(torso, 1.5, 0.4, 0.8, b, 0, -0.9, 0);
    for (const a of [...arms, ...legs]) {
      B(a, 0.3, 1.9, 0.3, b, 0, -1.0, 0);
      S(a, 0.22, dark, 0, -1.0, 0);
    }
    for (const l of legs) B(l, 0.5, 0.2, 0.8, b, 0, -1.95, 0.2);
  }

  if (look === 'guardian') {
    // A stone guardian: mossy rock body, a stone helm with glowing eyes, a tombstone shield and
    // a stone club.
    const stone = P(def.skin);
    const dark = P(shade(def.skin, 0.7));
    B(head, 1.45, 1.1, 1.45, dark, 0, 0.9, 0);
    eyes(h, G(0x40c4ff, 1), 0.66, 0.26, 0.12);
    B(torso, 2.4, 2.2, 1.4, stone, 0, 0.1, 0);
    for (const [x, y, r] of [[-0.8, 1.0, 0.3], [0.7, -0.6, 0.35], [0, 1.15, 0.25]]) S(torso, r, P(0x33691e), x, y, 0.6);
    for (const a of arms) {
      B(a, 1.5, 0.8, 1.5, dark, 0, -0.1, 0);
      B(a, 1.3, 1.6, 1.3, stone, 0, -1.3, 0);
    }
    for (const l of legs) B(l, 1.3, 2.0, 1.3, stone, 0, -1.0, 0);
    const sh = grp(L, 0.3, -1.8, 1.0);
    B(sh, 0.4, 2.6, 2.0, P(0x90a4ae), 0, 0, 0);
    C(sh, 1.0, 1.0, 0.4, P(0x90a4ae), 0, 1.3, 0, 14).rotation.z = Math.PI / 2;
    B(sh, 0.1, 0.9, 0.2, dark, 0.22, 0.6, 0);
    B(sh, 0.1, 0.2, 0.6, dark, 0.22, 0.8, 0);
    const g = heldStick(R, dark, 1.4);
    B(g, 0.8, 0.8, 1.6, stone, 0, 0, 1.4);
  }

  if (look === 'jackTerror') {
    // A towering pumpkin-head in a black coat, his head on fire, with a giant war hammer.
    headBox.visible = false;
    const pk = pumpkin(head, P(def.skin), 1.0, 0.8, P(shade(def.skin, 0.75)));
    carvedFace(pk, G(0xffea00, 1), 1.0, 0, true);
    const flames = [];
    for (const [x, z, s] of [[0, 0, 0.5], [-0.35, 0.15, 0.35], [0.35, -0.1, 0.38], [0, -0.35, 0.3]]) flames.push(B(pk, s, s * 1.8, s, G(0xff3d00, 1), x, 1.1, z));
    const coat = P(def.shirt);
    B(torso, 2.3, 2.2, 1.25, coat, 0, 0, 0);
    B(torso, 2.4, 2.0, 1.3, coat, 0, -1.8, 0).scale.set(1, 1, 0.9);
    for (const y of [0.5, 0, -0.5]) B(torso, 0.18, 0.18, 0.06, P(0xffd54f), 0, y, 0.66);
    for (const a of arms) B(a, 1.3, 1.5, 1.3, coat, 0, -0.75, 0);
    const g = heldStick(R, wood, 4.2);
    const headM = P(0x37474f);
    B(g, 2.6, 1.4, 1.4, headM, 0, 0, 3.6); // the hammer head, across the end of the handle
    for (const x of [-1.0, 1.0]) B(g, 0.2, 1.55, 1.55, P(0xffd54f), x, 0, 3.6);
    for (const x of [-1.35, 1.35]) B(g, 0.15, 1.1, 1.1, P(0x263238), x, 0, 3.6);
    walker(h, (sw, t) => {
      R.rotation.x = -0.9 + Math.sin(t * 1.2) * 0.15;
      L.rotation.x = -sw * 0.5;
      flames.forEach((f, i) => (f.scale.y = 1 + Math.sin(t * 9 + i * 2) * 0.3));
    }, 0.4);
  }

  if (look === 'harvest') {
    // On top of the Night 2 witch look: a blood-red sickle, a bundle of corn on her back, and
    // a ring of red light.
    const g = grp(L, 0, -2.1, 0.3);
    B(g, 0.14, 0.14, 1.4, wood, 0, 0, 0.3);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI;
      B(g, 0.12, 0.12, 0.45, P(0xb71c1c), Math.cos(a) * 0.7, 0, 1.0 + Math.sin(a) * 0.7).rotation.y = a;
    }
    const corn = grp(torso, 0, 0.2, -0.8);
    for (let i = 0; i < 5; i++) {
      const c = C(corn, 0.12, 0.08, 2.4, P(0xc9a227), (i - 2) * 0.22, 0.3, 0, 6);
      c.rotation.z = (i - 2) * 0.12;
      K(corn, 0.18, 0.5, P(0xffb300), (i - 2) * 0.22 + (i - 2) * 0.15, 1.6, 0, 6);
    }
    part(torso, torusGeo(1.6, 0.08), G(0xd50000, 1), 0, -1.6, 0).rotation.x = Math.PI / 2;
  }

  if (look === 'conserver') {
    // A masked collector: a bone mask, a dark green robe, and skulls orbiting him (he throws them).
    const cloth = P(def.shirt);
    headBox.material = P(0x263238);
    hood(h, cloth, 0.3);
    B(head, 0.95, 1.0, 0.12, bone, 0, 0.6, 0.74); // a bone mask in the hood
    for (const s of [-1, 1]) B(head, 0.25, 0.2, 0.08, G(0x76ff03, 1), s * 0.24, 0.75, 0.81);
    for (let i = 0; i < 4; i++) B(head, 0.08, 0.2, 0.08, black, -0.18 + i * 0.12, 0.3, 0.81);
    robe(h, cloth, 2.6, 1.5);
    sleeves(h, cloth, 1.8, 1.2);
    const ring = grp(h.body, 0, 5.0, 0);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const sk = grp(ring, Math.sin(a) * 2.4, 0, Math.cos(a) * 2.4);
      B(sk, 0.7, 0.6, 0.7, bone, 0, 0, 0);
      for (const s of [-1, 1]) B(sk, 0.18, 0.18, 0.05, G(0x76ff03, 1), s * 0.17, 0.05, 0.36);
    }
    floater(h, 0.3, (t) => {
      ring.rotation.y = t * 1.5;
      ring.position.y = 5.0 + Math.sin(t * 2) * 0.2;
    });
    for (const l of legs) l.visible = false;
  }
}

/** A torus geometry (made when first needed). */
const TORI = new Map();
function torusGeo(r, t = 0.1) {
  const k = `${r}|${t}`;
  if (!TORI.has(k)) TORI.set(k, torus(r, t, 24));
  return TORI.get(k);
}

// ---------------------------------------------------------------- creatures

/** Pumpkin Spider: a carved pumpkin body on eight long legs, with a little head. */
export function makeN3PumpSpiderModel(def) {
  const h = creature();
  const { P, G } = mats(h);
  const bod = grp(h.body, 0, 1.4, 0);
  const pk = pumpkin(bod, P(def.skin), 0.9, 0, P(shade(def.skin, 0.8)));
  pk.position.z = -0.4;
  carvedFace(pk, G(0xffea00, 1), 0.9, 0, true);
  C(pk, 0.08, 0.12, 0.35, P(0x33691e), 0, 0.85, 0);
  const hd = S(bod, 0.4, P(0x212121), 0, -0.05, 0.75);
  for (const s of [-1, 1]) S(hd, 0.1, G(0xff1744, 1), s * 0.15, 0.1, 0.34);
  const legs = [];
  for (let i = 0; i < 8; i++) {
    const s = i < 4 ? -1 : 1;
    const k = i % 4;
    const g = grp(bod, s * 0.4, 0, 0.6 - k * 0.45);
    g.rotation.y = s * (0.6 - k * 0.35) + (s < 0 ? Math.PI : 0);
    const up = grp(g, 0, 0, 0);
    up.rotation.z = 0.7;
    B(up, 1.3, 0.13, 0.13, P(0x212121), 0.65, 0, 0);
    const lo = grp(up, 1.3, 0, 0);
    lo.rotation.z = -1.9;
    B(lo, 1.5, 0.1, 0.1, P(0x111111), 0.75, 0, 0);
    legs.push(up);
  }
  h.anim = (phase) => {
    legs.forEach((l, i) => (l.rotation.z = 0.7 + Math.sin(phase * 2 + i * 1.7) * 0.25));
    bod.position.y = 1.4 + Math.abs(Math.sin(phase * 2)) * 0.1;
  };
  return h;
}

/** Souls: a glowing see-through wisp with a face and a trailing tail. Ghost: a white sheet
 *  shape. Lost: a small blue wisp. Tormented: red, screaming, with broken chains. */
export function makeN3SoulModel(def) {
  const h = creature();
  const { P, G, T } = mats(h);
  const kind = def.soul;
  const core = grp(h.body, 0, 2.2, 0);
  const skin = T(def.skin, kind === 'ghost' ? 0.8 : 0.55);
  S(core, kind === 'lost' ? 0.7 : 0.9, skin, 0, 0, 0);
  S(core, 0.4, G(def.skin, 0.9), 0, 0, 0);
  const tail = [];
  for (let i = 0; i < 4; i++) tail.push(K(core, 0.7 - i * 0.12, 1.0, skin, 0, -0.6 - i * 0.55, -0.3 - i * 0.3, 8));
  tail.forEach((t) => (t.rotation.x = Math.PI + 0.5));
  const face = P(0x202428);
  const r = kind === 'lost' ? 0.7 : 0.9;
  for (const s of [-1, 1]) B(core, 0.2, kind === 'tormented' ? 0.14 : 0.3, 0.05, face, s * 0.25, 0.15, r - 0.05);
  B(core, kind === 'tormented' ? 0.3 : 0.2, kind === 'tormented' ? 0.45 : 0.2, 0.05, face, 0, -0.25, r - 0.08);
  if (kind === 'ghost') for (const s of [-1, 1]) K(core, 0.2, 0.7, skin, s * 0.85, -0.2, 0.2, 6).rotation.z = s * 2.2;
  if (kind === 'tormented') {
    for (const s of [-1, 1]) {
      const ch = grp(core, s * 0.8, -0.3, 0);
      for (let i = 0; i < 4; i++) B(ch, 0.12, 0.25, 0.12, P(0x616161), 0, -i * 0.25, 0).rotation.y = i * 0.8;
    }
  }
  h.anim = (phase, t) => {
    core.position.y = 2.2 + Math.sin(t * 3 + phase * 0.05) * 0.3;
    tail.forEach((k, i) => (k.rotation.z = Math.sin(t * 5 + i) * 0.25));
  };
  return h;
}

/** Hex Mimic: a treasure chest on stubby legs whose lid snaps open on a mouth full of teeth. */
export function makeN3MimicModel(def) {
  const h = creature();
  const { P, G } = mats(h);
  const wd = P(def.skin);
  const gold = P(0xffc107);
  const bone = P(0xf5f5f5);
  const box = grp(h.body, 0, 1.2, 0);
  B(box, 2.2, 1.2, 1.5, wd, 0, 0, 0);
  B(box, 2.0, 0.2, 1.3, P(0x8e0000), 0, 0.55, 0);
  for (const x of [-0.95, 0.95]) B(box, 0.15, 1.25, 1.55, gold, x, 0, 0);
  for (let i = 0; i < 7; i++) K(box, 0.1, 0.3, bone, -0.9 + i * 0.3, 0.7, 0.7, 4);
  const lid = grp(box, 0, 0.6, -0.75);
  B(lid, 2.2, 0.6, 1.5, wd, 0, 0.3, 0.75);
  for (const x of [-0.95, 0.95]) B(lid, 0.15, 0.65, 1.55, gold, x, 0.3, 0.75);
  B(lid, 0.3, 0.3, 0.1, gold, 0, 0.1, 1.52);
  for (let i = 0; i < 7; i++) K(lid, 0.1, 0.3, bone, -0.9 + i * 0.3, -0.05, 1.45, 4).rotation.x = Math.PI;
  for (const s of [-1, 1]) S(lid, 0.15, G(0xe040fb, 1), s * 0.5, 0.65, 1.3);
  const tongue = B(box, 0.5, 0.12, 1.4, P(0xd81b60), 0, 0.55, 0.8);
  const legs = [];
  for (const [x, z] of [[-0.8, 0.5], [0.8, 0.5], [-0.8, -0.5], [0.8, -0.5]]) {
    const g = grp(h.body, x, 0.6, z);
    B(g, 0.25, 0.7, 0.25, P(0x3e2723), 0, -0.3, 0);
    legs.push(g);
  }
  h.anim = (phase, t) => {
    lid.rotation.x = -0.15 - Math.abs(Math.sin(t * 4)) * 0.6;
    tongue.rotation.x = -Math.abs(Math.sin(t * 4)) * 0.4;
    legs.forEach((l, i) => (l.rotation.x = Math.sin(phase * 2 + i * Math.PI) * 0.5));
    box.position.y = 1.2 + Math.abs(Math.sin(phase * 2)) * 0.15;
  };
  return h;
}

/** Curse Vine: a knot of thick writhing vines with thorns, crowned by a snapping flower bud. */
export function makeN3VineModel(def) {
  const h = creature();
  const { P, G } = mats(h);
  const vine = P(def.skin);
  const dark = P(shade(def.skin, 0.65));
  const thorn = P(0x3e2723);
  const trunk = grp(h.body);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const t = C(trunk, 0.35, 0.55, 4.0, i % 2 ? vine : dark, Math.sin(a) * 0.35, 2.0, Math.cos(a) * 0.35, 8);
    t.rotation.set(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12);
  }
  for (let i = 0; i < 10; i++) K(trunk, 0.08, 0.4, thorn, Math.sin(i * 2.4) * 0.7, 0.6 + i * 0.32, Math.cos(i * 2.4) * 0.7, 4).rotation.set(Math.cos(i * 2.4) * 1.4, 0, -Math.sin(i * 2.4) * 1.4);
  const tents = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const g = grp(trunk, Math.sin(a) * 0.5, 1.0 + (i % 2) * 1.2, Math.cos(a) * 0.5);
    g.rotation.y = a;
    let p = g;
    const segs = [];
    for (let j = 0; j < 4; j++) {
      const s = grp(p, 0, 0, j ? 0.7 : 0);
      C(s, 0.2 - j * 0.04, 0.24 - j * 0.04, 0.8, j % 2 ? vine : dark, 0, 0, 0.35, 6).rotation.x = Math.PI / 2;
      segs.push(s);
      p = s;
    }
    K(p, 0.1, 0.4, thorn, 0, 0, 0.9, 4).rotation.x = Math.PI / 2;
    tents.push(segs);
  }
  // Leaves on the base, and the bud on top with glowing teeth inside.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    B(trunk, 1.0, 0.08, 0.6, P(0x558b2f), Math.sin(a) * 0.9, 0.15, Math.cos(a) * 0.9).rotation.y = a;
  }
  const bud = grp(trunk, 0, 4.3, 0);
  S(bud, 0.75, P(0x6a1b9a), 0, 0, 0);
  S(bud, 0.45, G(0xc6ff00, 0.9), 0, 0, 0.4);
  const petals = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const g = grp(bud, 0, 0, 0);
    g.rotation.y = a;
    const pt = B(g, 0.5, 1.3, 0.12, P(0x8e24aa), 0, 0.5, 0.6);
    pt.rotation.x = -0.4;
    petals.push(g);
  }
  h.anim = (phase, t) => {
    tents.forEach((segs, i) => segs.forEach((s, j) => {
      s.rotation.x = Math.sin(t * 2 + i + j * 0.6) * 0.35 - 0.2;
      s.rotation.y = Math.cos(t * 1.7 + i * 2 + j) * 0.25;
    }));
    bud.rotation.y = Math.sin(t * 0.8) * 0.4;
    petals.forEach((g) => (g.children[0].rotation.x = -0.4 - Math.abs(Math.sin(t * 3)) * 0.5));
    trunk.rotation.z = Math.sin(t * 1.3) * 0.05;
  };
  return h;
}

/** Skeleton Airbarrel: a skeleton riding a barrel under a patched balloon. */
export function makeN3AirbarrelModel(def) {
  const h = creature();
  const { P, G } = mats(h);
  const rig = grp(h.body, 0, 0.5, 0);
  const wd = P(def.skin);
  const hoop = P(0x616161);
  C(rig, 0.9, 0.9, 1.4, wd, 0, 0, 0, 12);
  for (const y of [-0.5, 0, 0.5]) C(rig, 0.94, 0.94, 0.12, hoop, 0, y, 0, 12);
  // The skeleton: skull, ribs and arms over the rim.
  const bone = P(0xeeeeee);
  B(rig, 0.8, 0.7, 0.6, bone, 0, 1.1, 0);
  B(rig, 0.85, 0.75, 0.65, bone, 0, 1.75, 0);
  for (const s of [-1, 1]) {
    B(rig, 0.2, 0.2, 0.05, G(0xff6d00, 1), s * 0.2, 1.8, 0.33);
    const a = B(rig, 0.18, 1.0, 0.18, bone, s * 0.75, 1.0, 0.2);
    a.rotation.z = s * 0.6;
  }
  // Ropes up to the balloon.
  for (const [x, z] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) B(rig, 0.05, 2.4, 0.05, P(0x8d6e63), x, 1.9, z);
  const bal = grp(rig, 0, 4.2, 0);
  S(bal, 1.7, P(0x6d4c41), 0, 0, 0).scale.set(1, 1.1, 1);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    B(bal, 0.12, 3.6, 0.12, P(0x3e2723), Math.sin(a) * 1.6, 0, Math.cos(a) * 1.6).rotation.set(Math.cos(a) * 0.2, 0, -Math.sin(a) * 0.2);
  }
  for (const [x, y, z] of [[0.8, 0.5, 1.4], [-1.2, -0.3, 1.0]]) B(bal, 0.7, 0.6, 0.1, P(0x8d6e63), x, y, z).lookAt(x * 10, y * 10, z * 10);
  h.anim = (phase, t) => {
    rig.rotation.z = Math.sin(t * 1.5 + phase * 0.05) * 0.08;
    rig.position.y = 0.5 + Math.sin(t * 2) * 0.2;
  };
  return h;
}

/** Pumpkin Spirit: a floating burning pumpkin with a trail of flame. `wings`: bat wings
 *  (Flying Pumpkin). `big`: a crown of fire. */
export function makeN3PumpSpiritModel(def) {
  const h = creature();
  const { P, G, T } = mats(h);
  const core = grp(h.body, 0, 2.0, 0);
  const pk = pumpkin(core, P(def.skin), 0.95, 0, P(shade(def.skin, 0.75)));
  carvedFace(pk, G(def.wings ? 0xffea00 : 0x18ffff, 1), 0.95, 0, true);
  C(pk, 0.1, 0.14, 0.4, P(0x33691e), 0, 0.9, 0);
  const fl = [];
  const fm = G(def.wings ? 0xff6d00 : 0x00e5ff, 0.9);
  for (let i = 0; i < 4; i++) fl.push(K(core, 0.6 - i * 0.12, 1.0, T(def.wings ? 0xff9100 : 0x18ffff, 0.6), 0, -0.2 - i * 0.2, -0.8 - i * 0.5, 8));
  fl.forEach((k) => (k.rotation.x = -Math.PI / 2 - 0.3));
  if (def.big) for (const [x, z, s] of [[0, 0, 0.45], [-0.4, 0.1, 0.3], [0.4, -0.1, 0.32]]) fl.push(B(pk, s, s * 1.8, s, fm, x, 1.1, z));
  const wings = [];
  if (def.wings) {
    for (const s of [-1, 1]) {
      const w = grp(core, s * 0.8, 0.2, -0.2);
      B(w, 1.8, 0.08, 1.0, P(0x212121), s * 0.9, 0, 0);
      for (let i = 0; i < 3; i++) B(w, 0.1, 0.1, 1.0, P(0x111111), s * (0.4 + i * 0.6), 0.02, -0.1);
      wings.push(w);
    }
  }
  h.anim = (phase, t) => {
    core.position.y = 2.0 + Math.sin(t * 3 + phase * 0.05) * 0.25;
    fl.forEach((k, i) => (k.scale.y = 1 + Math.sin(t * 9 + i * 2) * 0.25));
    wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * Math.sin(t * 10) * 0.5));
  };
  return h;
}

/** Pumpkin Balloon: a huge pumpkin-shaped balloon with a grinning face and a basket. */
export function makeN3PumpBalloonModel(def) {
  const h = creature();
  const { P, G } = mats(h);
  const rig = grp(h.body, 0, 0.6, 0);
  const pk = pumpkin(rig, P(def.skin), 2.0, 4.3, P(shade(def.skin, 0.8)));
  carvedFace(pk, G(0xffea00, 1), 2.0, 0, false);
  C(pk, 0.25, 0.35, 0.8, P(0x33691e), 0, 2.0, 0);
  for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) B(rig, 0.05, 2.0, 0.05, P(0x5d4037), x, 1.6, z);
  B(rig, 1.4, 0.9, 1.4, P(0x8d6e63), 0, 0.1, 0);
  for (const y of [-0.2, 0.3]) B(rig, 1.44, 0.1, 1.44, P(0x5d4037), 0, y, 0);
  h.anim = (phase, t) => {
    rig.rotation.z = Math.sin(t * 1.2 + phase * 0.05) * 0.06;
    rig.position.y = 0.6 + Math.sin(t * 1.6) * 0.25;
  };
  return h;
}

/** Hex Drako: a small purple dragon (four legs, wings, a tail). With `primordial` it is the
 *  Primordial Drakobloxxer: black and purple, glowing cracks, four eyes, a crown of horns and
 *  spikes all down its back. */
export function makeN3DrakoModel(def) {
  const h = creature();
  const { P, G } = mats(h);
  const big = !!def.primordial;
  const skin = P(def.skin);
  const belly = P(big ? 0x4a148c : 0xce93d8);
  const horn = P(big ? 0x9e9e9e : 0xe0d6c0);
  const gm = G(big ? 0xd500f9 : 0xffea00, 1);
  const bod = grp(h.body, 0, 1.6, 0);
  B(bod, 1.6, 1.3, 3.0, skin, 0, 0, 0);
  B(bod, 1.3, 0.2, 2.6, belly, 0, -0.65, 0.1);
  // Neck and head.
  const neck = grp(bod, 0, 0.4, 1.4);
  neck.rotation.x = -0.6;
  B(neck, 0.8, 0.8, 1.6, skin, 0, 0, 0.7);
  const hd = grp(neck, 0, 0.1, 1.5);
  hd.rotation.x = 0.6;
  B(hd, 1.0, 0.8, 1.2, skin, 0, 0, 0.4);
  B(hd, 0.8, 0.45, 0.9, skin, 0, -0.1, 1.3);
  const jaw = grp(hd, 0, -0.3, 0.6);
  B(jaw, 0.75, 0.2, 1.0, belly, 0, -0.1, 0.6);
  for (let i = 0; i < 4; i++) K(hd, 0.06, 0.2, P(0xffffff), -0.25 + i * 0.17, -0.35, 1.6, 4).rotation.x = Math.PI;
  const eyeList = big ? [[-0.35, 0.2, 0.9], [0.35, 0.2, 0.9], [-0.25, 0.32, 0.6], [0.25, 0.32, 0.6]] : [[-0.35, 0.2, 0.8], [0.35, 0.2, 0.8]];
  for (const [x, y, z] of eyeList) B(hd, 0.2, 0.12, 0.2, gm, x, y, z);
  for (const s of [-1, 1]) {
    const g = grp(hd, s * 0.35, 0.4, 0);
    g.rotation.set(-0.8, 0, -s * 0.3);
    K(g, 0.15, big ? 1.4 : 0.8, horn, 0, big ? 0.7 : 0.4, 0, 6);
    if (big) {
      const g2 = grp(hd, s * 0.5, 0.2, 0.3);
      g2.rotation.set(-0.5, 0, -s * 1.0);
      K(g2, 0.1, 0.8, horn, 0, 0.4, 0, 6);
    }
  }
  // Legs.
  const legs = [];
  for (const [x, z] of [[-0.75, 1.0], [0.75, 1.0], [-0.75, -1.0], [0.75, -1.0]]) {
    const g = grp(bod, x, -0.5, z);
    B(g, 0.45, 1.2, 0.5, skin, 0, -0.5, 0);
    B(g, 0.55, 0.2, 0.7, P(0x212121), 0, -1.1, 0.1);
    legs.push(g);
  }
  // Tail: a chain of shrinking pieces.
  const tail = [];
  let p = grp(bod, 0, 0.1, -1.4);
  for (let i = 0; i < 5; i++) {
    const s = grp(p, 0, 0, i ? -0.75 : 0);
    B(s, 0.7 - i * 0.11, 0.6 - i * 0.09, 0.8, skin, 0, 0, -0.35);
    tail.push(s);
    p = s;
  }
  K(p, 0.3, 0.6, horn, 0, 0, -1.0, 4).rotation.x = -Math.PI / 2;
  // Wings.
  const wings = [];
  for (const s of [-1, 1]) {
    const w = grp(bod, s * 0.7, 0.6, 0.3);
    B(w, 0.15, 0.15, 2.2, skin, s * 1.2, 0, 0).rotation.y = s * 0.8;
    B(w, 2.6, 0.06, 1.8, big ? P(0x311b92) : P(0x9575cd), s * 1.4, 0, -0.6);
    for (let i = 0; i < 3; i++) B(w, 0.08, 0.1, 1.8, skin, s * (0.6 + i * 0.8), 0.02, -0.6).rotation.y = s * (0.3 - i * 0.2);
    wings.push(w);
  }
  if (big) {
    for (let i = 0; i < 6; i++) K(bod, 0.22, 0.7, horn, 0, 0.9, 1.2 - i * 0.5, 5);
    for (const t of tail) K(t, 0.15, 0.4, horn, 0, 0.4, -0.3, 4);
    cracks(bod, gm, [[0.82, 0.1, 0.5, 1.0, 0.5], [-0.82, -0.1, -0.4, 1.0, -0.4]]);
    for (const [x, y, z, len, rot] of [[0.81, 0, -0.6, 0.8, -0.6], [-0.81, 0.2, 0.7, 0.7, 0.4]]) B(bod, 0.04, len, 0.07, gm, x, y, z).rotation.x = rot;
    S(bod, 0.4, gm, 0, -0.3, 1.45); // a glowing core in its chest
  }
  h.anim = (phase, t) => {
    const fly = !!def.flying;
    legs.forEach((l, i) => (l.rotation.x = fly ? 0.6 : Math.sin(phase + (i % 3 ? Math.PI : 0)) * 0.5));
    wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * (fly ? Math.sin(t * 8) * 0.6 : 0.3 + Math.sin(t * 2) * 0.15)));
    tail.forEach((s, i) => (s.rotation.y = Math.sin(t * 2.5 - i * 0.6) * 0.18));
    jaw.rotation.x = Math.abs(Math.sin(t * 1.5)) * 0.35;
    bod.position.y = 1.6 + (fly ? Math.sin(t * 4) * 0.25 : Math.abs(Math.sin(phase)) * 0.08);
  };
  return h;
}

export const N3_CREATURES = {
  n3PumpSpider: makeN3PumpSpiderModel,
  n3Soul: makeN3SoulModel,
  n3Mimic: makeN3MimicModel,
  n3Vine: makeN3VineModel,
  n3Airbarrel: makeN3AirbarrelModel,
  n3PumpSpirit: makeN3PumpSpiritModel,
  n3PumpBalloon: makeN3PumpBalloonModel,
  n3Drako: makeN3DrakoModel,
};
