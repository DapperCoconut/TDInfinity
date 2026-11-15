// Tower models: people, batch 33 (dressed with the vehicle kit in ../vehicles.js).
// In here: Technomancer.
// Like batches 26-32 these are plain faceless figures: only their gear tells them apart, with
// accents in one neon colour per tower.
// MODELS maps tower keys to builders; ../models.js lays it over TOWER_MODELS, so these win.

import { glowMat } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { UP, aimLong, fist, muzzle, own, rifle, wear } from './people1.js';
import { shoulderPads } from './people2.js';
import { feet, hands, hood } from './people5.js';
import { cape } from './people18.js';

const W = 0xffffff;
const W2 = 0xf2f2f2;
const W3 = 0xe4e4e4;

/** A plain white figure with no face. */
const blank = () => makeHumanoid({ skin: W, shirt: W, pants: W2, arms: W, face: 'none' });

// ------------------------------------------------------------------ Technomancer (neon aquamarine)

export const TECHNO_NEON = 0x00ffc8;

/**
 * Technomancer (alternate Hacker): a white hooded hacker with a visor and a smart rifle with glowing
 * rails. Lv 1 Improved Kit: a wrist computer and a sensor on the hood. Lv 2 Hologram: a backpack
 * projector with an emitter dish. Lv 3 Hijack: floating holo screens over the shoulders and cable
 * spines. Lv 4 Technological Wonder: a data halo, shoulder plates and a long coat.
 */
export function makeTechnomancer(level) {
  const h = blank();
  const key = `hackerTechnomancer${level}`;
  const neon = glowMat(h, TECHNO_NEON);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  hood(hd, W2);
  hd.box(1.2, 0.16, 0.1, neon, 0, 0.62, 0.72, { r: 0.04 }); // visor
  if (level >= 1) {
    hd.box(0.22, 0.3, 0.22, W3, 0.62, 0.95, 0.1, { r: 0.04 }); // sensor
    hd.ball(0.07, neon, 0.62, 1.12, 0.1, { seg: 8, rows: 5 });
  }
  if (level >= 4) hd.torus(0.85, 0.045, neon, 0, 1.55, 0, { seg: 24 }); // data halo
  t.box(2.1, 1.8, 1.15, W, 0, 0.1, 0, { r: 0.12 }); // jacket
  t.box(0.08, 1.7, 0.05, neon, 0.35, 0.1, 0.6); // zip line
  t.box(2.15, 0.24, 1.2, W3, 0, -0.84, 0, { r: 0.04 }); // belt
  for (let i = 0; i < 3; i++) t.box(0.3, 0.06, 0.05, neon, -0.55, 0.55 - i * 0.18, 0.6); // code lines
  if (level >= 2) {
    // the hologram projector pack with an emitter dish on top
    t.box(1.5, 1.5, 0.6, W2, 0, 0.15, -0.85, { r: 0.1 });
    for (let i = 0; i < 4; i++) t.box(0.12, 0.12, 0.05, neon, -0.45 + i * 0.3, 0.6, -1.17);
    t.cyl(0.08, 0.6, W3, 0, 1.15, -0.85, { seg: 8 });
    t.cyl(0.45, 0.08, W, 0, 1.5, -0.85, { seg: 16, r2: 0.2 });
    t.ball(0.12, neon, 0, 1.6, -0.85, { seg: 10, rows: 6 });
  }
  if (level >= 3) {
    // holo screens floating over the shoulders, and cables from the pack
    for (const sx of [-1, 1]) {
      t.slab(0.75, 0.5, 0.03, neon, sx * 1.35, 1.25, 0.15, { ry: -sx * 0.5 });
      t.box(0.82, 0.04, 0.05, W, sx * 1.35, 1.52, 0.15, { ry: -sx * 0.5 });
      t.tube([[sx * 0.5, 0.0, -1.1], [sx * 0.9, -0.5, -0.9], [sx * 1.0, -0.8, -0.3]], 0.05, W3, { seg: 8, sides: 6 });
    }
  }
  if (level >= 4) {
    shoulderPads(t, W2, 0.6);
    cape(t, W2, 2.5, { w: 2.0, clasp: TECHNO_NEON });
  }
  hd.done();
  t.done();
  hands(h, key, W3, W2, (a, s) => {
    if (level >= 1 && s > 0) {
      a.box(0.65, 0.5, 0.65, W3, 0, -1.1, 0, { r: 0.06 }); // wrist computer
      a.box(0.5, 0.06, 0.4, neon, 0, -1.1, 0.34);
    }
  });
  feet(h, key, W2, null);
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, `${key}:gun`);
  const [y, z] = rifle(gk, { len: level >= 4 ? 2.6 : 2.2, body: W, furn: W2, mag: false, optic: level >= 1 ? 'dot' : 'iron', lens: TECHNO_NEON, glow: neon });
  gk.done();
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = TECHNO_NEON;
  return own(h, UP);
}

export const MODELS = {
  hackerTechnomancer: makeTechnomancer,
};
