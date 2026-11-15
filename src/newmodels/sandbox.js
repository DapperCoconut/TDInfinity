// Sandbox mode enemy looks (2026-11-15, see src/sandbox.js). makeZombie builds the white humanoid
// body with the X face, then sbParts dresses it by `def.sb`: the Dummy, the broken Imperfect
// Dummy, and the Dummy King (crown, cape, giant sword, a nuke strapped to his back).
// Layout as in halloween2.js: torso box 2 x 2 x 1 centred at y 3, head group at y 4, arms hang
// from y 4 (right arm at x -1.5), legs from y 2. Characters face +Z. A thing held in a
// forward-swung arm sits near (0, -2.05, z) of the arm, pointing along local +Z (up).

import { B, C, K, S, grp, mats, torus } from './halloween2.js';
import { part } from '../models.js';

/** Walk the legs, and pose the arms with `arms(sw, t)`. */
function walker(h, arms, stride = 0.5) {
  h.anim = (phase, t) => {
    const sw = Math.sin(phase) * stride;
    h.leftLeg.rotation.x = sw;
    h.rightLeg.rotation.x = -sw;
    arms(sw, t);
    h.body.position.y = Math.abs(Math.cos(phase)) * 0.1;
  };
}

/** The black X where a face would be. */
function xFace(h, m) {
  for (const s of [-1, 1]) B(h.head, 1.15, 0.2, 0.06, m, 0, 0.62, 0.63).rotation.z = s * 0.72;
}

export function sbParts(h, def) {
  const { P, G } = mats(h);
  const ink = P(0x111111);
  const white = P(0xfafafa);
  if (def.sb === 'dummy') {
    xFace(h, ink);
    // A red-and-white target on its chest, and stitches down the sides.
    const red = P(0xe53935);
    C(h.torso, 0.62, 0.62, 0.06, red, 0, 0.1, 0.52, 18).rotation.x = Math.PI / 2;
    C(h.torso, 0.42, 0.42, 0.07, white, 0, 0.1, 0.53, 18).rotation.x = Math.PI / 2;
    C(h.torso, 0.2, 0.2, 0.08, red, 0, 0.1, 0.54, 14).rotation.x = Math.PI / 2;
    for (const x of [-1.01, 1.01]) for (let i = 0; i < 4; i++) B(h.torso, 0.04, 0.12, 0.5, ink, x, -0.7 + i * 0.45, 0);
    // Arms held out stiff, like a scarecrow.
    walker(h, () => {
      h.rightArm.rotation.z = -1.2;
      h.leftArm.rotation.z = 1.2;
    }, 0.35);
    return;
  }
  if (def.sb === 'imperfect') {
    xFace(h, ink);
    // Broken: one arm torn off, cracks all over, stuffing poking out, the head knocked crooked.
    h.leftArm.visible = false;
    B(h.torso, 0.5, 0.5, 0.5, P(0xbdbdbd), 1.05, 0.75, 0); // the stump
    const crack = P(0x3a3a3a);
    for (const [x, y, rz] of [[-0.4, 0.5, 0.6], [0.3, -0.2, -0.8], [-0.1, -0.6, 0.3], [0.6, 0.6, 1.2]]) B(h.torso, 0.7, 0.07, 0.05, crack, x, y, 0.52).rotation.z = rz;
    for (const [x, y, rz] of [[-0.3, 0.9, 0.9], [0.35, 0.3, -0.5]]) B(h.head, 0.5, 0.06, 0.05, crack, x, y, 0.63).rotation.z = rz;
    const fluff = P(0xfff8e1);
    S(h.torso, 0.25, fluff, 1.1, 0.95, 0.1);
    S(h.torso, 0.18, fluff, -0.7, -0.8, 0.5);
    h.head.rotation.z = 0.35;
    // A red glow in the cracks: something is very wrong with it.
    B(h.torso, 0.3, 0.3, 0.05, G(0xff1744, 1.2), 0.15, 0.15, 0.53).rotation.z = 0.8;
    walker(h, (sw, t) => {
      h.rightArm.rotation.x = -1.2 + Math.sin(t * 9) * 0.25; // twitching
      h.head.rotation.z = 0.35 + Math.sin(t * 13) * 0.08;
    }, 0.7);
    return;
  }
  if (def.sb === 'king') {
    xFace(h, ink);
    const gold = P(0xffc107);
    const gem = G(0xff1744, 1);
    // Crown.
    C(h.head, 0.8, 0.75, 0.35, gold, 0, 1.38, 0, 16);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      K(h.head, 0.13, 0.45, gold, Math.sin(a) * 0.72, 1.75, Math.cos(a) * 0.72, 4);
    }
    S(h.head, 0.13, gem, 0, 1.4, 0.78);
    // Royal cape, shoulder plates and a belt.
    const cape = P(0x6a1b9a);
    B(h.torso, 2.3, 3.6, 0.12, cape, 0, -0.9, -0.62).rotation.x = 0.08;
    B(h.torso, 2.4, 0.3, 1.25, P(0xeeeeee), 0, 0.95, 0); // ermine collar
    for (const x of [-1.25, 1.25]) {
      const pad = S(h.torso, 0.6, gold, x, 0.85, 0);
      pad.scale.set(1, 0.6, 1);
    }
    B(h.torso, 2.08, 0.28, 1.08, gold, 0, -0.75, 0);
    // The nuke on his back: a big bomb with fins and a radiation band.
    const nuke = grp(h.torso, 0, 0.4, -1.4);
    nuke.rotation.x = -0.15;
    C(nuke, 0.7, 0.7, 2.6, P(0x546e7a), 0, 0, 0, 16);
    K(nuke, 0.7, 1.1, P(0x455a64), 0, 1.85, 0, 16);
    C(nuke, 0.72, 0.72, 0.45, P(0xffd600), 0, 0.3, 0, 16);
    for (let i = 0; i < 3; i++) {
      const tri = B(nuke, 0.12, 0.4, 0.06, ink, 0, 0.3, 0.73);
      tri.position.x = (i - 1) * 0.3;
      tri.rotation.z = (i - 1) * 0.5;
    }
    for (let i = 0; i < 4; i++) {
      const fin = B(nuke, 0.08, 0.8, 0.7, P(0x37474f), 0, -1.35, 0);
      fin.rotation.y = (i * Math.PI) / 2;
      fin.translateZ(0.6);
    }
    part(nuke, torus(0.3, 0.06, 12), G(0x76ff03, 1.1), 0, 2.3, 0).rotation.x = Math.PI / 2; // a green glow at the tip
    // The giant sword in his right hand.
    const sword = grp(h.rightArm, 0, -2.05, 0.1);
    B(sword, 0.18, 0.18, 1.0, P(0x4e342e), 0, 0, 0.1); // grip
    B(sword, 1.4, 0.25, 0.25, gold, 0, 0, 0.65); // guard
    B(sword, 0.5, 0.12, 4.6, P(0xe0e0e0), 0, 0, 3.05); // blade
    K(sword, 0.26, 0.6, P(0xe0e0e0), 0, 0, 5.65, 4).rotation.x = Math.PI / 2;
    B(sword, 0.08, 0.14, 4.3, G(0xff1744, 0.8), 0, 0, 2.95); // a red line down the blade
    // Walk heavily with the sword held up; on an attack it comes down hard.
    walker(h, (sw) => {
      h.rightArm.rotation.x = -1.9 + sw * 0.1;
      h.leftArm.rotation.x = -0.4 - sw * 0.3;
    }, 0.35);
    h.swingArms = (f) => {
      h.rightArm.rotation.x = f < 0.4 ? -1.9 - 1.0 * (f / 0.4) : -2.9 + 2.6 * ((f - 0.4) / 0.6);
    };
  }
}
