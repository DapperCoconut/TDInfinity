import * as THREE from 'three';
import { part } from '../models.js';
import { B, C, K, S, grp, mats, torus } from './halloween2.js';

// Christmas Night 1 enemy looks (2026-11-11, see src/christmas.js). makeZombie builds the humanoid
// body, then xmParts dresses it by `def.xm`. Same layout as halloween2.js: torso box 2 x 2 x 1
// centred on the torso group, head group at y 4 (head box 1.2, centre 0.6 up), arms hang from the
// shoulders down local -y (2 long), legs the same from y 2. Characters face +Z. A thing held in a
// forward-swung arm sits near (0, -2.05, z) of the arm, pointing along local +Z (up).
// Helpers from models.js are only called inside functions (models.js imports this file).

const shade = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();

/** Walk the legs and pose the arms with `arms(sw, t)`. */
function walker(h, arms, stride = 0.6) {
  h.anim = (phase, t) => {
    const sw = Math.sin(phase) * stride;
    h.leftLeg.rotation.x = sw;
    h.rightLeg.rotation.x = -sw;
    arms(sw, t);
    h.body.position.y = Math.abs(Math.cos(phase)) * 0.12;
    h.body.rotation.z = Math.sin(phase * 0.5) * 0.05;
  };
}

/** A floating thing: legs hidden, the body bobs, arms reach out. `more(t)` adds its own moves. */
function floater(h, height, more = null) {
  for (const l of [h.rightLeg, h.leftLeg]) l.visible = false;
  h.anim = (phase, t) => {
    h.body.position.y = height + Math.sin(t * 2 + phase * 0.05) * 0.3;
    h.rightArm.rotation.x = -1.2 + Math.sin(t * 2.2) * 0.15;
    h.leftArm.rotation.x = -1.2 + Math.sin(t * 2.2 + 1.4) * 0.15;
    more?.(t, phase);
  };
}

/** Two glowing eyes on the front of the head. */
function eyes(h, gm, y = 0.74, w = 0.22, hh = 0.14, gap = 0.27) {
  for (const s of [-1, 1]) B(h.head, w, hh, 0.06, gm, s * gap, y, 0.63);
}

/** A stick held in the right hand (points up when the arm is forward). */
function held(R, m, len) {
  const g = grp(R, 0, -2.05, 0.2);
  B(g, 0.2, 0.2, len, m, 0, 0, len / 2 - 0.6);
  return g;
}

/** Ice spikes sticking out of `p` at the given spots ([x, y, z, tilt x, tilt z, length]). */
function spikes(p, m, list) {
  for (const [x, y, z, rx, rz, len] of list) K(p, 0.18, len, m, x, y, z, 5).rotation.set(rx, 0, rz);
}

/** A long robe hanging from the torso. */
const robe = (h, m, len = 2.4, wide = 1.35) => C(h.torso, 0.98, wide, len, m, 0, -0.75 - len / 2 + 0.4, 0, 12);

/** A halo ring floating over the head. */
function halo(h, m, r = 0.75, y = 1.75) {
  const ring = part(h.head, torus(r, 0.09, 24), m, 0, y, -0.1);
  ring.rotation.x = Math.PI / 2 - 0.25;
  return ring;
}

/** Dresses a Christmas Night 1 humanoid by `def.xm`. */
export function xmParts(h, def) {
  const { P, G, T } = mats(h);
  const { torso, head } = h;
  const R = h.rightArm;
  const L = h.leftArm;
  const arms = [R, L];
  const legs = [h.rightLeg, h.leftLeg];
  const headBox = head.children[0];
  const skin = P(def.skin);
  const ice = P(0xb3e5fc);
  const iceDeep = P(0x4fc3f7);
  const white = P(0xf5f7fa);
  const black = P(0x111111);
  const chain = P(0x78909c);
  const glowBlue = G(0x40c4ff, 1);
  const none = h.M(0x000000);
  none.visible = false; // hides a box but keeps its children
  const look = def.xm;

  if (look === 'snowy' || look === 'frozen') {
    // Faceless snow people: a light-blue head on a lumpy, powdery body (Frozen: icier and sharper).
    const frozen = look === 'frozen';
    const powder = P(frozen ? 0xa5d8f0 : 0xe8f4fb);
    headBox.visible = false;
    S(head, 0.72, skin, 0, 0.62, 0);
    torso.material = none;
    S(torso, 1.15, powder, 0, -0.3, 0);
    S(torso, 0.85, powder, 0, 0.75, 0);
    for (const [x, y, z] of [[0.7, -0.6, 0.6], [-0.6, 0.1, 0.65], [0.2, 0.6, 0.6], [-0.4, -1.0, 0.5]]) S(torso, 0.3, P(0xffffff), x, y, z);
    for (const a of arms) {
      a.children[0].visible = false;
      C(a, 0.32, 0.26, 2, powder, 0, -1, 0);
      S(a, 0.36, powder, 0, -2.0, 0);
    }
    for (const l of legs) {
      l.children[0].visible = false;
      C(l, 0.4, 0.45, 2, powder, 0, -1, 0);
    }
    if (frozen) spikes(torso, ice, [[0.6, 1.0, -0.3, -0.4, -0.5, 0.7], [-0.6, 1.0, -0.3, -0.4, 0.5, 0.7], [0, 0.4, -0.9, -1.2, 0, 0.6]]);
    walker(h, (sw) => {
      R.rotation.x = -sw * 0.8;
      L.rotation.x = sw * 0.8;
    }, frozen ? 0.8 : 0.6);
  }

  if (look === 'mist') {
    // Cold Mist: a see-through black ghost trailing blue smoke.
    const dark = T(0x101018, 0.6);
    const smoke = T(0x4fc3f7, 0.35);
    headBox.material = dark;
    torso.material = dark;
    robe(h, dark, 2.6, 1.4);
    eyes(h, glowBlue);
    for (const a of arms) a.children[0].material = dark;
    const puffs = [];
    for (let i = 0; i < 6; i++) puffs.push(S(h.body, 0.5 + (i % 3) * 0.15, smoke, Math.sin(i * 2) * 0.7, 0.6 + i * 0.25, -0.8 - i * 0.35));
    floater(h, 1.0, (t) => {
      puffs.forEach((p, i) => {
        p.position.y = 0.6 + i * 0.25 + Math.sin(t * 2 + i) * 0.2;
        p.scale.setScalar(0.8 + 0.3 * Math.sin(t * 3 + i));
      });
    });
  }

  if (look === 'packed') {
    // Packed Ice: a figure of ice blocks with a hole in the chest showing a dark-blue heart.
    const block = P(0xcff4fb);
    const blockD = P(0x9be0ef);
    torso.material = none;
    for (const [x, y, w, hh] of [[-0.65, 0, 0.7, 2], [0.65, 0, 0.7, 2], [0, 0.75, 0.6, 0.5], [0, -0.75, 0.6, 0.5]]) B(torso, w, hh, 1.1, x ? block : blockD, x, y, 0);
    B(torso, 0.6, 1.0, 0.15, P(0x0a1a33), 0, 0, -0.3); // the dark inside of the hole
    const heart = S(torso, 0.3, G(0x1a237e, 0.7), 0, 0, 0.05);
    headBox.material = block;
    B(head, 1.3, 0.3, 1.3, blockD, 0, 1.15, 0);
    eyes(h, G(0x1565c0, 0.8));
    for (const a of arms) {
      a.children[0].material = block;
      B(a, 0.9, 0.7, 0.9, blockD, 0, -1.9, 0);
    }
    for (const l of legs) l.children[0].material = blockD;
    walker(h, (sw, t) => {
      R.rotation.x = -sw * 0.5;
      L.rotation.x = sw * 0.5;
      heart.scale.setScalar(1 + 0.2 * Math.max(0, Math.sin(t * 6)));
    }, 0.45);
  }

  if (look === 'mystery') {
    // Frost Mystery: a see-through blue shell with a tiny figure curled up inside.
    const shell = T(0x4fc3f7, 0.35);
    headBox.material = shell;
    torso.material = shell;
    for (const a of [...arms, ...legs]) a.children[0].material = shell;
    const tiny = grp(torso, 0, -0.2, 0);
    B(tiny, 0.45, 0.6, 0.35, P(0x263238), 0, 0, 0);
    B(tiny, 0.35, 0.35, 0.35, P(0x37474f), 0, 0.5, 0);
    S(torso, 0.22, G(0xe1f5fe, 1), 0, 0.95, 0.4);
    B(head, 0.5, 0.5, 0.06, G(0xffffff, 0.9), 0, 0.6, 0.62).rotation.z = Math.PI / 4; // a "?" glint
    walker(h, (sw, t) => {
      R.rotation.x = -sw;
      L.rotation.x = sw;
      tiny.rotation.y = t * 2;
    }, 0.9);
  }

  if (look === 'golem') {
    // Snow Golem (and its little Snow Minion): a big snow giant with blocks of ice on its arms.
    headBox.visible = false;
    torso.material = none;
    S(torso, 1.3, white, 0, -0.2, 0);
    S(torso, 0.95, white, 0, 0.9, 0.1);
    S(head, 0.75, white, 0, 0.55, 0.1);
    for (const s of [-1, 1]) B(head, 0.18, 0.18, 0.08, black, s * 0.25, 0.7, 0.8); // coal eyes
    K(head, 0.14, 0.6, P(0x5d4037), 0, 0.45, 0.95, 6).rotation.x = Math.PI / 2; // a stick nose
    for (let i = 0; i < 3; i++) S(torso, 0.12, black, 0, 0.9 - i * 0.45, 1.2 - i * 0.05);
    for (const a of arms) {
      a.children[0].visible = false;
      C(a, 0.38, 0.32, 1.6, white, 0, -0.8, 0);
      B(a, 1.1, 1.1, 1.1, ice, 0, -1.9, 0).rotation.y = 0.4;
      B(a, 0.7, 0.7, 0.7, iceDeep, 0.2, -1.3, 0.3).rotation.z = 0.5;
    }
    for (const l of legs) {
      l.children[0].visible = false;
      C(l, 0.55, 0.65, 2, white, 0, -1, 0);
    }
    walker(h, (sw) => {
      R.rotation.x = -0.4 - sw * 0.5;
      L.rotation.x = -0.4 + sw * 0.5;
    }, 0.5);
  }

  if (look === 'unstable') {
    // Unstable Ice: a glowing neon-blue core inside a cracked dark ice shell with spikes.
    const shell = P(0x0d3a4f);
    const neon = G(0x00e5ff, 1);
    torso.material = shell;
    headBox.material = shell;
    for (const [x, y] of [[-0.5, 0.4], [0.4, -0.3], [0, 0.8], [0.3, 0.5], [-0.3, -0.6]]) B(torso, 0.5, 0.12, 0.05, neon, x, y, 0.52).rotation.z = x * 2; // cracks
    const core = S(torso, 0.45, neon, 0, 0, 0.35);
    eyes(h, neon);
    spikes(torso, P(0x1a4a60), [[0.7, 0.9, 0, 0, -0.6, 0.9], [-0.7, 0.9, 0, 0, 0.6, 0.9], [0, 0.6, -0.6, -1.2, 0, 1.0], [0.5, -0.5, -0.6, -1.4, -0.3, 0.8]]);
    spikes(head, neon, [[0, 1.3, 0, 0, 0, 0.7], [0.4, 1.2, 0, 0, -0.5, 0.5], [-0.4, 1.2, 0, 0, 0.5, 0.5]]);
    for (const a of [...arms, ...legs]) a.children[0].material = shell;
    walker(h, (sw, t) => {
      R.rotation.x = -sw;
      L.rotation.x = sw;
      core.scale.setScalar(1 + 0.25 * Math.sin(t * 10)); // it flickers: about to blow
    }, 0.8);
  }

  if (look === 'deep') {
    // Deep Freeze: a hulking ice brute covered in white spikes.
    const body = P(0xd6effa);
    const spk = P(0xffffff);
    torso.material = body;
    torso.scale.set(1.3, 1.1, 1.2);
    headBox.material = body;
    head.position.z += 0.3;
    eyes(h, G(0x0091ea, 1), 0.6, 0.26, 0.12);
    B(head, 1.0, 0.3, 0.2, P(0x90caf9), 0, 0.25, 0.65); // a heavy jaw
    spikes(torso, spk, [[0.9, 1.1, -0.2, -0.3, -0.5, 1.2], [-0.9, 1.1, -0.2, -0.3, 0.5, 1.2], [0, 1.0, -0.6, -0.9, 0, 1.3], [0.5, 0.3, -0.7, -1.3, -0.3, 1.0], [-0.5, 0.3, -0.7, -1.3, 0.3, 1.0], [0, -0.5, -0.7, -1.4, 0, 0.9]]);
    for (const a of arms) {
      a.children[0].material = body;
      a.children[0].scale.set(1.4, 1, 1.4);
      B(a, 1.2, 0.9, 1.2, P(0xb3e5fc), 0, -2.0, 0);
      spikes(a, spk, [[0, -0.2, -0.4, -1.2, 0, 0.7], [0, -1.0, -0.5, -1.3, 0, 0.6]]);
    }
    for (const l of legs) {
      l.children[0].material = body;
      l.children[0].scale.set(1.3, 1, 1.3);
    }
    walker(h, (sw) => {
      R.rotation.x = -0.3 - sw * 0.4;
      L.rotation.x = -0.3 + sw * 0.4;
    }, 0.4);
  }

  if (look === 'invader') {
    // Frost Invader: pale face, black body, three blue crystals on the back and glowing eyes.
    torso.material = black;
    headBox.material = P(0xe8eef2);
    eyes(h, G(0x00b0ff, 1.2), 0.7, 0.26, 0.16);
    B(head, 0.7, 0.1, 0.05, black, 0, 0.35, 0.63); // a thin mouth
    for (const [x, y, len] of [[-0.45, 0.6, 1.1], [0.45, 0.6, 1.1], [0, 0.9, 1.4]]) {
      const c = K(torso, 0.26, len, glowBlue, x, y, -0.55, 6);
      c.rotation.x = -0.5;
    }
    for (const a of arms) a.children[0].material = black;
    for (const l of legs) l.children[0].material = P(0x1a1a1a);
    walker(h, (sw) => {
      R.rotation.x = -sw * 1.1;
      L.rotation.x = sw * 1.1;
    }, 0.9);
  }

  if (look === 'ravager') {
    // Frost Ravager: an ice-blue brute holding up a big white shield of ice.
    torso.material = skin;
    torso.scale.set(1.3, 1.1, 1.25);
    headBox.material = skin;
    eyes(h, G(0xffffff, 1), 0.65, 0.24, 0.12);
    for (const s of [-1, 1]) K(head, 0.15, 0.6, white, s * 0.55, 1.2, 0, 5).rotation.z = -s * 0.5; // ice horns
    for (const s of [-1, 1]) B(torso, 0.8, 0.5, 1.0, P(0xe1f5fe), s * 1.45, 1.0, 0); // shoulder ice
    for (const a of arms) a.children[0].material = skin;
    for (const l of legs) l.children[0].material = P(shade(def.skin, 0.7));
    // The shield: a thick slab of white ice on the left arm, held in front.
    const sh = grp(L, 0, -1.6, 0.6);
    B(sh, 2.6, 0.35, 3.2, white, 0, 0, 0.6);
    B(sh, 2.0, 0.4, 2.6, P(0xe1f5fe), 0, 0.1, 0.6);
    S(sh, 0.35, glowBlue, 0, 0.25, 0.6);
    walker(h, (sw) => {
      L.rotation.x = -1.3; // shield up
      R.rotation.x = -0.3 - sw * 0.6;
    }, 0.45);
  }

  if (look === 'angel') {
    // Crying Angel: a dark-grey stone angel with chained wings and a blue halo, flying.
    const stone = P(0x616161);
    const stoneD = P(0x424242);
    torso.material = stone;
    headBox.material = stone;
    robe(h, stoneD, 2.2, 1.25);
    for (const s of [-1, 1]) {
      B(head, 0.18, 0.08, 0.06, black, s * 0.27, 0.78, 0.63);
      B(head, 0.07, 0.45, 0.04, G(0x40c4ff, 0.7), s * 0.27, 0.5, 0.64); // tears
    }
    halo(h, glowBlue);
    for (const a of arms) a.children[0].material = stone;
    const wings = [];
    for (const s of [-1, 1]) {
      const w = grp(torso, s * 0.5, 0.6, -0.6);
      for (let i = 0; i < 4; i++) B(w, 0.9 - i * 0.12, 2.4 - i * 0.4, 0.15, i % 2 ? stone : stoneD, s * (0.5 + i * 0.6), -0.2 * i, 0);
      for (let i = 0; i < 3; i++) B(w, 0.12, 0.12, 0.5, chain, s * (0.6 + i * 0.6), 0.4 - i * 0.3, 0.15).rotation.z = 0.6; // chains across the wings
      wings.push(w);
    }
    floater(h, 0.5, (t) => {
      R.rotation.x = -0.4;
      L.rotation.x = -0.4;
      head.rotation.x = 0.35; // head bowed, crying
      wings.forEach((w, i) => (w.rotation.y = (i ? -1 : 1) * (0.25 + Math.sin(t * 4) * 0.25)));
    });
  }

  if (look === 'hero') {
    // Frost Hero: a black-armoured knight with a crested galea helmet, blue crystals and a sword.
    const armor = P(0x1c1c1c);
    const trim = P(0x546e7a);
    torso.material = armor;
    headBox.material = armor;
    B(head, 0.9, 0.18, 0.06, glowBlue, 0, 0.72, 0.63); // the visor slit
    B(head, 1.3, 0.18, 1.3, trim, 0, 0.05, 0); // helmet rim
    B(head, 0.25, 0.7, 1.6, P(0x0277bd), 0, 1.5, -0.1); // the galea crest
    for (const s of [-1, 1]) {
      B(torso, 0.9, 0.55, 1.2, armor, s * 1.4, 1.0, 0); // pauldrons
      K(torso, 0.2, 0.8, glowBlue, s * 1.4, 1.55, 0, 6);
    }
    B(torso, 0.6, 0.6, 0.1, glowBlue, 0, 0.4, 0.52).rotation.z = Math.PI / 4;
    B(torso, 2.1, 0.25, 1.1, trim, 0, -0.85, 0); // belt
    for (const a of arms) a.children[0].material = armor;
    for (const l of legs) l.children[0].material = armor;
    const cape = B(torso, 1.9, 3.2, 0.1, P(0x0d1b2a), 0, -0.6, -0.6);
    const sword = held(R, P(0xcfd8dc), 3.6);
    B(sword, 0.8, 0.25, 0.25, trim, 0, 0, -0.1); // cross guard
    S(L, 0.35, G(0x80d8ff, 1.2), 0, -2.1, 0.1); // the Frost Hand glows
    walker(h, (sw, t) => {
      R.rotation.x = -1.1 - sw * 0.2;
      L.rotation.x = -0.6 + sw * 0.4;
      cape.rotation.x = 0.1 + Math.sin(t * 3) * 0.05;
    }, 0.45);
  }

  if (look === 'necro') {
    // Frost Necromancer: a black hooded cloak, skull pauldrons, chains and a staff.
    const cloak = P(0x111111);
    const bone = P(0xe8e0c8);
    torso.material = cloak;
    headBox.material = P(0x050505);
    B(head, 1.45, 1.4, 1.4, cloak, 0, 0.66, -0.06); // the hood
    K(head, 0.7, 0.8, cloak, 0, 1.75, -0.25, 4).rotation.set(-0.35, Math.PI / 4, 0);
    B(head, 1.0, 0.95, 0.1, P(0x050505), 0, 0.6, 0.63);
    eyes(h, glowBlue, 0.7);
    robe(h, cloak, 2.5, 1.45);
    for (const s of [-1, 1]) {
      B(torso, 0.9, 0.85, 0.9, bone, s * 1.4, 1.1, 0); // skull pauldrons
      for (const e of [-1, 1]) B(torso, 0.18, 0.18, 0.05, black, s * 1.4 + e * 0.2, 1.2, 0.46);
    }
    for (let i = 0; i < 5; i++) B(torso, 0.25, 0.12, 0.12, chain, -0.8 + i * 0.4, 0.7 - i * 0.35, 0.55).rotation.z = 0.6;
    for (const a of arms) a.children[0].material = cloak;
    const staff = held(R, P(0x3e2723), 4.6);
    staff.rotation.x = -0.9;
    S(staff, 0.35, bone, 0, 0, 3.9); // a skull on top
    S(staff, 0.2, glowBlue, 0, 0.2, 4.1);
    floater(h, 0.3, (t) => {
      R.rotation.x = -0.6 + Math.max(0, Math.sin(t * 0.5)) * -0.9; // raises the staff now and then
      L.rotation.x = -0.4;
    });
  }

  if (look === 'spirit') {
    // The Frost Spirit: black reflective skin, a blue-grey robe and hood with a fur collar, light-blue
    // wings, neon-blue shoulder spikes and halo, chains on its limbs and wings, and a scythe.
    const skinM = h.M(0x0d0d0d);
    skinM.metalness = 0.6;
    skinM.roughness = 0.15;
    const robeM = P(0x546e7a);
    const fur = P(0xeceff1);
    const neon = G(0x00e5ff, 1.2);
    torso.material = robeM;
    headBox.material = skinM;
    B(head, 1.5, 1.45, 1.45, robeM, 0, 0.66, -0.08); // the hood
    B(head, 1.0, 0.95, 0.1, skinM, 0, 0.6, 0.63);
    eyes(h, neon, 0.72);
    C(torso, 1.2, 1.3, 0.5, fur, 0, 1.05, 0, 12); // fur collar
    robe(h, robeM, 2.8, 1.5);
    for (const s of [-1, 1]) spikes(torso, neon, [[s * 1.3, 1.2, 0, 0, -s * 0.7, 1.0], [s * 1.0, 1.3, -0.2, -0.3, -s * 0.4, 0.8]]);
    halo(h, neon, 0.8, 1.95);
    for (const a of arms) {
      a.children[0].material = skinM;
      for (let i = 0; i < 2; i++) B(a, 0.75, 0.15, 0.75, chain, 0, -0.6 - i * 0.8, 0);
    }
    const wings = [];
    for (const s of [-1, 1]) {
      const w = grp(torso, s * 0.5, 0.7, -0.6);
      for (let i = 0; i < 5; i++) B(w, 0.8, 3.2 - i * 0.5, 0.12, i % 2 ? P(0x81d4fa) : P(0xb3e5fc), s * (0.5 + i * 0.7), 0.3 - i * 0.25, 0);
      B(w, 3.4, 0.14, 0.14, chain, s * 1.8, 0.2, 0.12);
      wings.push(w);
    }
    // The scythe: a long handle with a curved blade of ice.
    const sc = held(R, P(0x263238), 6.5);
    sc.rotation.x = -0.6;
    const blade = grp(sc, 0, 0, 5.6);
    for (let i = 0; i < 5; i++) {
      const seg = B(blade, 0.12, 0.5, 0.9, P(0xe1f5fe), 0, -0.3 - i * 0.45 + i * i * 0.05, 0.2 + i * 0.1);
      seg.rotation.x = -0.3 * i;
    }
    floater(h, 0.6, (t) => {
      R.rotation.x = -0.5;
      L.rotation.x = -0.9 + Math.sin(t * 1.5) * 0.2;
      wings.forEach((w, i) => (w.rotation.y = (i ? -1 : 1) * (0.3 + Math.sin(t * 2.5) * 0.3)));
    });
  }
}
