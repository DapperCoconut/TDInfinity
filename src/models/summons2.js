// Humanoid summons, batch 2 (see summons.js): the Mercenary Base soldiers.
// In here: mrifle, mrifle2, mrifle3 (Riflemen), mgren, mgren2 (Grenadiers), mriot, mriot2
// (Riot Guards), mmedic, mmedic2 (Field Medics).
// Same squad layout, scale, tracers and projectiles as the old makeMerc in units.js; the gear is
// built with the kit like the people towers (people1.js explains the spaces).

import { glowMat, kit, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { makeThing } from './bits.js';
import {
  INK, STEEL, aimLong, armPatch, belt, canteen, cap, collar, fist, glove, goggles, helmet, kneePad,
  muzzle, own, pack, pockets, pouch, rifle, sash, vest,
} from './people1.js';
import { grenade, shoulderPads } from './people2.js';
import { balaclava } from './people3.js';
import { baton, feet, glassMat, hands, riotHelmet, riotShield } from './people5.js';
import { launcher } from './people6.js';
import { stethoscope } from './people11.js';
import { crossPatch } from './people18.js';

const PI = Math.PI;
const SKIN = 0xd7a26b;
const RED = 0xd50000;

/** A kit on `parent` with a cached shape for this model and part. */
const wear = (h, parent, model, part) => kit(h, parent, `s2:${model}:${part}`);

/** See-through glass that stays see-through when the unit fades in or out (kit.js setOpacity). */
function glass(h, color, op) {
  const m = glassMat(h, color, op);
  m.userData.keepOpacity = op;
  return m;
}

// ------------------------------------------------------------------ the soldiers

/** Rifleman: tan, brown, then black. Lv 2 green goggles and a vest, Lv 3 cyan goggles, a red-dot rifle with glowing rails. */
function rifleman(model, tier) {
  const shirt = [0x8d7b5a, 0x5d4037, 0x263238][tier - 1];
  const h = makeHumanoid({ skin: SKIN, shirt, pants: 0x3e2723, arms: shirt, face: 'soldier' });
  const hd = wear(h, h.head, model, 'head');
  const t = wear(h, h.torso, model, 'torso');
  const helm = [0x6b5d3f, 0x3e2723, 0x212121][tier - 1];
  helmet(hd, helm, { cover: tone(helm, 0.7) });
  if (tier > 1) goggles(hd, 1.22, glowMat(h, tier > 2 ? 0x00e5ff : 0x76ff03), { r: 0.76, strap: tone(helm, 0.6) });
  if (tier > 2) balaclava(hd, 0x1a1a1a);
  if (tier > 1) {
    vest(t, tier > 2 ? 0x1c1f22 : 0x4e3b2a, { pouches: 3, patch: tier > 2 ? 0x00838f : 0x8d6e63 });
  } else {
    collar(t, tone(shirt, 0.85));
    pockets(t, tone(shirt, 0.9));
    sash(t, 0x4e342e, -1, 0.24);
  }
  belt(t, 0x3e2723, 0x9e9e9e);
  canteen(t, 0.8);
  pouch(t, -0.6, -0.95, 0.52, 0.36, 0.34, 0x4e342e);
  pack(t, tier > 2 ? 0x263238 : 0x5d4a33, { w: 1.3, h: 1.3, d: 0.5, roll: tier === 1 ? 0x8d7b5a : undefined });
  hd.done();
  t.done();
  feet(h, `s2:${model}`, 0x3e2723, tier > 1 ? (b) => kneePad(b, tone(shirt, 0.7)) : null);
  const a = wear(h, h.leftArm, model, 'larm');
  armPatch(a, 1, tone(shirt, 0.8), tier > 2 ? 0x00e5ff : 0xffc107);
  a.done();
  if (tier > 1) {
    const ga = wear(h, h.rightArm, model, 'glove');
    glove(ga, 0x212121);
    ga.done();
  }
  const g = fist(h.rightArm, -1.9, 1.25);
  const gk = wear(h, g, model, 'gun');
  const [y, z] = rifle(gk, tier > 2
    ? { len: 2.5, body: 0x263238, mag: 'box', optic: 'dot', lens: 0x00e5ff, can: true, glow: glowMat(h, 0x00e5ff) }
    : tier > 1
      ? { len: 2.25, furn: 0x5d4037, mag: 'curved', optic: 'dot', light: true }
      : { len: 2.1, furn: 0x6b4a2f, mag: 'curved', optic: 'iron' });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  return own(h);
}

/** Grenadier: brown with a grenade bandolier and a 40 mm launcher; Lv 2 darker, orange grenades and a drum launcher. */
function grenadier(model, tier) {
  const shirt = tier > 1 ? 0x3e2723 : 0x6d4c41;
  const nade = tier > 1 ? 0xff6d00 : 0x33691e;
  const h = makeHumanoid({ skin: SKIN, shirt, pants: 0x3e2723, arms: shirt, face: 'soldier' });
  const hd = wear(h, h.head, model, 'head');
  const t = wear(h, h.torso, model, 'torso');
  helmet(hd, 0x4e342e, { cover: 0x3e2723 });
  if (tier > 1) goggles(hd, 1.22, glowMat(h, 0xff9100), { r: 0.76, strap: 0x3e2723 });
  collar(t, tone(shirt, 0.85), { buttons: false });
  // a bandolier of grenades across the chest
  sash(t, 0x4e342e, 1, 0.3);
  for (const s of [-0.6, 0, 0.6]) grenade(t, s, -s * 0.72 + 0.05, 0.62, nade);
  belt(t, 0x3e2723, 0x9e9e9e);
  for (const x of [-0.7, -0.3, 0.3, 0.7]) pouch(t, x, -0.8, 0.54, 0.3, 0.38, 0x4e342e, 0.18);
  if (tier > 1) shoulderPads(t, 0x2e1f1a, 0.6);
  pack(t, 0x4e3b2a, { w: 1.3, h: 1.2, d: 0.5 });
  hd.done();
  t.done();
  feet(h, `s2:${model}`, 0x2e1f1a, tier > 1 ? (b) => kneePad(b, 0x2e1f1a) : null);
  hands(h, `s2:${model}`, 0x2e1f1a, tone(shirt, 0.8));
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, model, 'gun');
  const [y, z] = launcher(gk, tier > 1 ? { drum: true, heavy: true } : {});
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.projectile = { color: nade, size: 0.4, arc: 4 };
  return own(h);
}

/** Riot Guard: riot helmet, armour, a big shield on the left arm and a baton; Lv 2 navy with a glowing stun baton. */
function riotGuard(model, tier) {
  const shirt = tier > 1 ? 0x1a237e : 0x263238;
  const armor = tier > 1 ? 0x283593 : 0x37474f;
  const h = makeHumanoid({ skin: SKIN, shirt, pants: 0x1c2429, arms: shirt, face: 'soldier' });
  const hd = wear(h, h.head, model, 'head');
  const t = wear(h, h.torso, model, 'torso');
  riotHelmet(hd, 0x212121, glass(h, 0x80deea, 0.5));
  // a padded chest plate with ribs, a collar and a stripe
  t.box(2.24, 1.8, 1.2, armor, 0, 0.08, 0, { r: 0.14 });
  for (let i = 0; i < 3; i++) t.box(1.8, 0.05, 0.05, tone(armor, 0.7), 0, 0.55 - i * 0.35, 0.61);
  t.box(1.4, 0.3, 1.0, tone(armor, 0.8), 0, 0.98, 0, { r: 0.1 }); // neck collar
  t.box(1.7, 0.26, 0.05, tier > 1 ? 0xffd600 : 0xb0bec5, 0, -0.45, 0.62); // stripe
  shoulderPads(t, tone(armor, 0.85), 0.62);
  belt(t, 0x212121, 0xb0b0b0, -0.88);
  pouch(t, -0.6, -0.9, 0.6, 0.34, 0.32, 0x212121, 0.16);
  t.torus(0.16, 0.04, 0xbdbdbd, 0.75, -1.08, 0.64, { seg: 12 }); // cuffs ring
  hd.done();
  t.done();
  const shield = glass(h, 0xcfd8dc, 0.4);
  hands(h, `s2:${model}`, 0x1a1a1a, tone(armor, 0.8), (a, s) => {
    a.box(1.1, 0.5, 0.3, tone(armor, 0.8), 0, -1.0, -0.55, { r: 0.08 }); // elbow pad
    if (s === 1) riotShield(a, 0x90a4ae, shield, tier > 1 ? 0xffd600 : 0xfafafa, null);
  });
  feet(h, `s2:${model}`, 0x111111, (b) => {
    kneePad(b, tone(armor, 0.8));
    b.box(0.9, 0.7, 0.16, tone(armor, 0.8), 0, -1.35, 0.55, { r: 0.06 }); // shin guard
  });
  const g = fist(h.rightArm, -1.9, 1.1);
  const gk = wear(h, g, model, 'gun');
  const tipY = baton(gk, 1.6, tier > 1 ? 0x263238 : 0x212121, { r: 0.13 });
  if (tier > 1) {
    const blue = glowMat(h, 0x80d8ff);
    for (let i = 0; i < 2; i++) gk.torus(0.15, 0.035, blue, 0, -0.9 - i * 0.5, 0, { rx: PI / 2, seg: 12 });
    gk.ball(0.18, blue, 0, tipY, 0, { seg: 10, rows: 7 });
  }
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tipY, 0);
  h.rightArm.rotation.set(-1.2, 0, 0.1);
  h.leftArm.rotation.set(-1.3, 0, -0.2);
  return own(h, 0);
}

/** Field Medic: white cap and shirt with red crosses, a med bag and an injector; Lv 2 a green glowing visor and a bigger kit. */
function medic(model, tier) {
  const h = makeHumanoid({ skin: SKIN, shirt: 0xeceff1, pants: 0x546e7a, arms: 0xeceff1, face: 'soldier' });
  const green = glowMat(h, 0x69f0ae);
  const hd = wear(h, h.head, model, 'head');
  const t = wear(h, h.torso, model, 'torso');
  cap(hd, 0xfafafa, { peak: 0xe0e0e0 });
  crossPatch(hd, 0, 1.2, 0.66, 0.16, 0xfafafa, RED, { rx: -0.3 });
  if (tier > 1) goggles(hd, 0.72, green, { frame: 0x37474f });
  collar(t, 0xcfd8dc);
  crossPatch(t, 0.5, 0.4, 0.52, 0.24, 0xfafafa, RED);
  stethoscope(t);
  belt(t, 0x37474f, 0x9e9e9e);
  for (const x of [-0.7, 0.7]) pouch(t, x, -0.8, 0.54, 0.34, 0.36, 0xfafafa, 0.16);
  // a green med bag on the back with a red cross and straps
  t.box(1.3, 1.15, 0.6, 0x1b5e20, 0, -0.1, -0.82, { r: 0.1 });
  t.box(1.34, 0.3, 0.64, 0x2e7d32, 0, 0.4, -0.82, { r: 0.06 });
  crossPatch(t, 0, -0.15, -1.13, 0.3, 0xfafafa, RED, { ry: PI });
  for (const s of [-1, 1]) {
    t.box(0.24, 0.1, 1.2, INK, s * 0.5, 1.0, -0.05);
    t.box(0.24, 1.3, 0.06, INK, s * 0.5, 0.32, 0.53);
  }
  if (tier > 1) {
    vest(t, 0xb0bec5, { pouches: 2 });
    crossPatch(t, -0.45, 0.55, 0.68, 0.2, 0xfafafa, RED);
    t.cyl(0.18, 0.7, green, 0.6, 0.2, -1.15, { seg: 10 }); // a glowing vial on the bag
  }
  hd.done();
  t.done();
  hands(h, `s2:${model}`, 0x80cbc4, 0xcfd8dc, (a, s) => {
    if (s === 1) {
      a.box(1.06, 0.36, 1.06, 0xfafafa, 0, -0.5, 0); // armband
      crossPatch(a, 0.55, -0.5, 0, 0.14, 0xfafafa, RED, { ry: PI / 2 });
    }
  });
  feet(h, `s2:${model}`, 0x37474f);
  // a heal injector in the right hand: grip, glass tube, plunger and a needle
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, model, 'gun');
  gk.box(0.26, 0.4, 0.3, 0x37474f, 0, 0.05, 0, { r: 0.05 });
  gk.cyl(0.16, 0.7, tier > 1 ? green : glass(h, 0xb2ebf2, 0.6), 0, -0.45, 0, { seg: 12 });
  for (const y of [-0.12, -0.78]) gk.cyl(0.18, 0.06, STEEL, 0, y, 0, { seg: 12 });
  gk.cyl(0.04, 0.3, STEEL, 0, 0.35, 0, { seg: 6 }); // plunger
  gk.cyl(0.12, 0.04, STEEL, 0, 0.5, 0, { seg: 10 });
  gk.cyl(0.015, 0.35, 0xe0e0e0, 0, -0.98, 0, { seg: 5 }); // needle
  gk.done();
  h.muzzles = [];
  muzzle(h, g, -1.15, 0);
  h.rightArm.rotation.set(-0.6, 0, 0.1);
  return own(h, 0);
}

// ------------------------------------------------------------------ the squad

/** A squad of `count` soldiers laid out as the old merc squads were (units.js). */
function squad(model, count, build) {
  const u = makeThing();
  u.wheels = [];
  u.soldiers = [];
  const tier = Number(model.match(/\d+$/)?.[0] ?? 1);
  for (let i = 0; i < count; i++) {
    const h = build(model, tier);
    h.root.scale.setScalar(0.6 * (h.size ?? 1));
    h.root.position.set((i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.soldiers.push(h);
    u.muzzles.push(h.muzzles[0]);
  }
  u.height = 3.5 * (u.soldiers[0]?.size ?? 1);
  u.tracer = model === 'mrifle3' ? 0x00e5ff : model.startsWith('mriot') ? 0xb0bec5 : 0xffc107;
  u.projectile = u.soldiers[0]?.projectile;
  return u;
}

const S = (build) => (model) => (count = 1) => squad(model, count, build);
const rifle$ = S(rifleman);
const gren$ = S(grenadier);
const riot$ = S(riotGuard);
const medic$ = S(medic);

export const SUMMONS = {
  mrifle: rifle$('mrifle'),
  mrifle2: rifle$('mrifle2'),
  mrifle3: rifle$('mrifle3'),
  mgren: gren$('mgren'),
  mgren2: gren$('mgren2'),
  mriot: riot$('mriot'),
  mriot2: riot$('mriot2'),
  mmedic: medic$('mmedic'),
  mmedic2: medic$('mmedic2'),
};
