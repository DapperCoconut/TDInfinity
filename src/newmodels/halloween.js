import { boxGeo, part, glow } from '../models.js';

// Halloween Event enemy looks (2026-11-10 spec, see src/halloween.js). makeZombie builds the
// humanoid body (and Hardcore `hk` pieces), then hwParts dresses it by `def.hw`. Helpers from
// models.js are only called inside functions (models.js imports this file).
// Humanoid layout: torso box 2 x 2 x 1 centred at y 3, head group at y 4 (head box 1.2, centre
// 0.6 up), arm groups hang from y 4, leg groups from y 2 (each limb 2 long, down local -y).
// Characters face +Z. With an arm swung forward (rotation.x = -PI/2), its local +Z points up.

const B = (p, w, h, d, m, x = 0, y = 0, z = 0) => part(p, boxGeo(w, h, d), m, x, y, z);

/** Walk the legs (the views' usual humanoid walk) and pose the arms with `arms(sw, t)`. */
function walker(h, arms) {
  h.anim = (phase, t) => {
    const sw = Math.sin(phase) * 0.6;
    h.leftLeg.rotation.x = sw;
    h.rightLeg.rotation.x = -sw;
    arms(sw, t);
    h.body.position.y = Math.abs(Math.cos(phase)) * 0.12;
    h.body.rotation.z = Math.sin(phase * 0.5) * 0.06;
  };
}

export function hwParts(h, def) {
  const { M, torso, head } = h;
  const arms = [h.rightArm, h.leftArm];
  const legs = [h.rightLeg, h.leftLeg];
  const limbs = [...arms, ...legs];

  if (def.hw === 'zombie') {
    // Crooked head, both arms raised high, a torn navy shirt.
    head.rotation.z = 0.32;
    head.rotation.x = 0.12;
    head.position.x = -0.15;
    const rag = M(0x141c34);
    for (const [x, w] of [[-0.6, 0.4], [0.1, 0.3], [0.65, 0.35]]) B(torso, w, 0.35, 1.02, rag, x, -1.1, 0);
    walker(h, (sw, t) => {
      h.leftArm.rotation.x = -Math.PI * 0.78 + sw * 0.12;
      h.rightArm.rotation.x = -Math.PI * 0.72 - sw * 0.12;
      head.rotation.z = 0.32 + Math.sin(t * 2.3) * 0.05;
    });
  }

  if (def.hw === 'mummy') {
    // Body made of orange "cobblestone" bandages: rows of slightly offset wraps in three shades.
    const shades = [0xd9822b, 0xc06a1f, 0xe89a4a].map((c) => M(c));
    let n = 0;
    const wraps = (p, w, d, y0, y1, rows) => {
      for (let i = 0; i < rows; i++) {
        const y = y0 + ((y1 - y0) * (i + 0.5)) / rows;
        const seg = 3;
        for (let j = 0; j < seg; j++) {
          const m = shades[(n++ * 7 + j) % 3];
          const x = (j - 1) * (w / seg) + ((i % 2) * w) / (seg * 2) * (j === 1 ? 1 : 0);
          B(p, w / seg + 0.05, (y1 - y0) / rows - 0.03, d + 0.06, m, x, y, 0).rotation.z = ((i + j) % 2 ? 1 : -1) * 0.04;
        }
      }
    };
    wraps(torso, 2, 1, -1, 1, 5);
    for (const l of limbs) wraps(l, 1, 1, -2, 0, 4);
    wraps(head, 1.2, 1.2, 0, 1.2, 3);
    // Dark eye gap with two dim eyes.
    B(head, 0.9, 0.22, 0.08, M(0x2a1606), 0, 0.72, 0.65);
    for (const s of [-1, 1]) B(head, 0.14, 0.12, 0.06, glow(h, 0xffd180), s * 0.24, 0.72, 0.69);
    // A loose bandage end trailing from one arm.
    B(h.leftArm, 0.3, 1.2, 0.08, shades[2], 0.3, -2.2, -0.3).rotation.z = 0.3;
  }

  if (def.hw === 'ghost') {
    // Floats, arms slouched down, legs dangling up behind it (see-through: def.hidden).
    const face = M(0x202428);
    for (const s of [-1, 1]) B(head, 0.24, 0.3, 0.06, face, s * 0.27, 0.72, 0.62);
    B(head, 0.3, 0.32, 0.06, face, 0, 0.32, 0.62);
    h.anim = (phase, t) => {
      h.body.position.y = 1.4 + Math.sin(t * 2.2 + phase * 0.1) * 0.35;
      h.body.rotation.z = Math.sin(t * 1.6) * 0.06;
      h.body.rotation.x = 0.18; // leaning forward
      for (const [i, a] of arms.entries()) {
        a.rotation.x = -0.35 + Math.sin(t * 2 + i) * 0.08;
        a.rotation.z = (i ? 1 : -1) * 0.12;
      }
      for (const [i, l] of legs.entries()) l.rotation.x = 1.9 + Math.sin(t * 3 + i * 1.5) * 0.18;
      head.rotation.x = 0.3;
    };
  }

  if (def.hw === 'reaper') {
    // Long black robe (hk.robe), a grey stitched hood hiding the face, skull shoulder pads and a
    // long bone scythe.
    const hood = M(0x6a6a6a);
    const stitch = M(0x2a2a2a);
    const bone = M(0xe8e0c8);
    const dark = M(0x050505);
    B(head, 1.5, 1.55, 1.4, hood, 0, 0.72, -0.1);
    B(head, 1.0, 0.95, 0.1, dark, 0, 0.6, 0.62);
    for (const x of [-0.5, 0.5]) for (let i = 0; i < 4; i++) B(head, 0.06, 0.18, 0.05, stitch, x, 0.35 + i * 0.3, 0.62); // stitches down the hood
    for (let i = 0; i < 5; i++) B(head, 0.18, 0.06, 0.05, stitch, -0.6 + i * 0.3, 1.47, 0.3);
    for (const s of [-1, 1]) {
      // Skull pads on the shoulders.
      const sk = B(torso, 0.8, 0.7, 0.8, bone, s * 1.45, 1.15, 0);
      sk.rotation.z = -s * 0.15;
      for (const e of [-1, 1]) B(torso, 0.14, 0.14, 0.05, dark, s * 1.45 + e * 0.17, 1.2, 0.41);
      B(torso, 0.3, 0.1, 0.05, dark, s * 1.45, 0.95, 0.41);
    }
    for (const a of arms) B(a, 1.1, 1.2, 1.1, M(0x141414), 0, -0.6, 0); // wide robe sleeves
    // The scythe in the right hand: a long bone shaft and a curved bone blade.
    const R = h.rightArm;
    B(R, 0.16, 0.16, 5.2, bone, 0, -2.1, 1.4);
    B(R, 0.18, 0.4, 0.4, bone, 0, -2.1, 3.9); // knuckle
    const b1 = B(R, 0.1, 0.45, 1.6, bone, 0, -1.4, 3.75);
    b1.rotation.x = -1.3;
    const b2 = B(R, 0.1, 0.35, 1.0, bone, 0, -0.55, 3.35);
    b2.rotation.x = -0.5;
    walker(h, (sw) => {
      h.rightArm.rotation.x = -Math.PI / 2 + sw * 0.1;
      h.leftArm.rotation.x = -0.4 - sw * 0.15;
    });
  }

  if (def.hw === 'demon') {
    // Bright red skin, dark violet clothes, big black-and-blue wings (def.wings makes the bat wings).
    const blue = glow(h, 0x2a62ff);
    blue.emissiveIntensity = 0.45;
    (h.wings ?? []).forEach((w, i) => {
      const s = i ? 1 : -1;
      B(w, 2.6, 1.0, 0.05, blue, s * 1.6, -0.35, 0.04);
      w.scale.set(1.5, 1.4, 1);
    });
    B(torso, 2.04, 0.3, 1.04, M(0x1a0826), 0, -0.85, 0); // belt
  }

  if (def.hw === 'jack') {
    // Burning jack-o'-lantern head (hk.pumpkin) and cape (hk.cape); black marbled clothes, a tall
    // spiked collar and a double-headed skull battle axe.
    const marble = [M(0x3a3a3a), M(0x262626)];
    let n = 0;
    for (const [p, w, d, y0, y1] of [[torso, 2, 1, -1, 1], ...legs.map((l) => [l, 1, 1, -2, 0])]) {
      for (let i = 0; i < 5; i++) {
        const k = Math.abs(Math.sin(++n * 12.9898) * 43758.5453) % 1;
        const vein = B(p, w * (0.3 + k * 0.5), 0.08, d + 0.04, marble[n % 2], (k - 0.5) * w * 0.5, y0 + (y1 - y0) * ((i + 0.5) / 5), 0);
        vein.rotation.z = (k - 0.5) * 1.2;
      }
    }
    // The spiked collar: a ring of tall spikes standing up round the neck.
    const spike = M(0x1a1a1a);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const s = B(torso, 0.22, 1.2 + (i % 2) * 0.4, 0.22, spike, Math.sin(a) * 0.95, 1.4, Math.cos(a) * 0.62);
      s.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35);
    }
    B(torso, 2.1, 0.3, 1.2, spike, 0, 0.95, 0);
    // The axe: long dark handle, a blade on each side and a skull in the middle.
    const R = h.rightArm;
    const steel = M(0x9aa0a6);
    const bone = M(0xe8e0c8);
    B(R, 0.2, 0.2, 5, M(0x2a1a10), 0, -2.1, 1.3);
    for (const s of [-1, 1]) {
      B(R, 0.12, 1.6, 1.3, steel, 0, -2.1 + s * 0.95, 3.4);
      B(R, 0.12, 0.5, 1.7, steel, 0, -2.1 + s * 1.65, 3.4);
    }
    B(R, 0.55, 0.55, 0.5, bone, 0, -2.1, 3.4);
    for (const e of [-1, 1]) B(R, 0.06, 0.12, 0.12, M(0x111111), 0.28, -2.1 + e * 0.12, 3.5);
  }
}
