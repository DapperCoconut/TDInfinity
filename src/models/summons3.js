// Humanoid summons, batch 3 (see summons.js): the soldiers the Barracks and the Field Barracks
// send out, dressed with the kit like the people towers (gear helpers from people1.js and friends).
//   Barracks (Tower Blitz): tbsquad (green soldiers), tbtuber (bazooka soldiers), tbcommando.
//   Field Barracks: bscout (Scout), bscout2 (Rifleman), bscout3 (Assault Scout), bspec (Spec Ops),
//   brail (Rail Trooper), bm202 (M202 Trooper), briot (Rioter), bflame (Flamethrower).
// Every model is a squad of `count` soldiers laid out like makeUnit's squads, each scaled 0.6 * size.

import { glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { makeThing } from './bits.js';
import {
  INK, STEEL, aimLong, armPatch, belt, boots, canteen, collar, fist, glove, helmet, goggles, kneePad, muzzle, own, pack,
  pistol, pouch, pockets, radio, rifle, sash, vest, wear, UP,
} from './people1.js';
import { boonie, grenade, nvg, shoulderPads } from './people2.js';
import { balaclava } from './people3.js';
import { cellPack, chestPlate, railRifle } from './people4.js';
import { glassMat, riotHelmet, riotShield } from './people5.js';
import { flameWand, fuelTanks, gasMask, rocketPack, rocketPod, tubeLauncher, visor } from './people7.js';

const PI = Math.PI;

/** A squad of `count` soldiers from `mk` (the same layout as makeUnit's squads). */
function squad(count, mk) {
  const u = makeThing();
  u.wheels = [];
  u.soldiers = [];
  const n = Math.max(1, count || 1);
  for (let i = 0; i < n; i++) {
    const h = mk(i);
    h.root.scale.setScalar(0.6 * (h.size ?? 1));
    h.root.position.set(n === 1 ? 0 : (i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.soldiers.push(h);
    u.muzzles.push(h.muzzles[0]);
  }
  const h0 = u.soldiers[0];
  u.height = 3.5 * (h0.size ?? 1);
  u.tracer = h0.tracer;
  if (h0.projectile) u.projectile = h0.projectile;
  return u;
}

/** Sleeves, gloves and a patch on both arms; `extra(a, s)` adds more (s: -1 right, 1 left). */
function arms(h, key, sleeve, glov, patch, extra) {
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    a.box(1.04, 0.16, 1.04, sleeve, 0, -0.7, 0, { r: 0.03 });
    if (glov != null) glove(a, glov);
    if (patch != null) armPatch(a, s, tone(sleeve, 0.85), s > 0 ? patch : null);
    extra?.(a, s);
    a.done();
  }
}

/** Boots on both legs (and knee pads). */
function legs(h, key, col, pad, extra) {
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    boots(b, col);
    if (pad != null) kneePad(b, pad);
    extra?.(b);
    b.done();
  }
}

/** A gun group on the right fist, built by `build(k)` which returns the bore [y, z]; adds the muzzle. */
function gun(h, key, s, build) {
  const g = fist(h.rightArm, -1.9, s);
  const k = wear(h, g, `${key}:gun`);
  const [y, z] = build(k);
  k.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  return g;
}

// ------------------------------------------------------------------ Barracks (Tower Blitz)

/** A plain green soldier: helmet, pack with a bedroll, canteen and a rifle. */
function greenSoldier() {
  const shirt = 0x4caf50;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x2e7d32, arms: shirt, face: 'soldier' });
  const key = 's3:tbsquad';
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  helmet(hd, 0x33691e, { cover: 0x558b2f });
  collar(t, tone(shirt, 0.82));
  pockets(t, tone(shirt, 0.88));
  belt(t, 0x3e2723, 0x9e9e9e);
  canteen(t, 0.82, 0x33691e);
  pouch(t, -0.6, -0.95, 0.55, 0.36, 0.34, 0x3e2723, 0.18);
  pack(t, 0x558b2f, { w: 1.3, h: 1.3, d: 0.5, roll: 0x6d4c41 });
  hd.done();
  t.done();
  arms(h, key, tone(shirt, 0.8), null, 0xffd54f);
  legs(h, key, 0x3e2723);
  gun(h, key, 1.15, (k) => rifle(k, { len: 2.1, furn: 0x6d4c41, mag: 'curved' }));
  aimLong(h);
  h.tracer = 0xffc107;
  return own(h);
}

/** A Tuber: a green soldier with a bazooka on the shoulder and spare rockets on the back. */
function tuberSoldier() {
  const shirt = 0x558b2f;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants: 0x33691e, arms: shirt, face: 'soldier' });
  const key = 's3:tbtuber';
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  helmet(hd, 0x33691e, { cover: 0x4b5320 });
  goggles(hd, 1.08, 0xffab40, { r: 0.77 }); // pushed up on the helmet
  collar(t, tone(shirt, 0.82));
  belt(t, 0x3e2723);
  rocketPack(t, 2, 0x556b2f, 0xe65100);
  hd.done();
  t.done();
  arms(h, key, tone(shirt, 0.8), 0x3e2723, 0xe65100);
  legs(h, key, 0x3e2723, 0x33691e);
  gun(h, key, 1.1, (k) => tubeLauncher(k, { r: 0.4, len: 2.6, back: 0.8, col: 0x556b2f, venturi: true, warhead: 0xe65100, fat: true, grip: true }));
  aimLong(h);
  h.pose.leftRecoil = 0.2;
  h.projectile = { color: 0xff6d00, size: 0.4, arc: 1.2 };
  h.tracer = 0xff6d00;
  h.size = 1.05;
  return own(h);
}

/** A tough commando in dark gear: heavy vest, shoulder pads, orange goggles and a big twin-barrel gun. */
function commandoSoldier() {
  const shirt = 0x263238;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: 0x1c2429, arms: shirt, face: 'soldier' });
  const key = 's3:tbcommando';
  const orange = glowMat(h, 0xff3d00);
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  helmet(hd, 0x111111, { cover: 0x263238 });
  goggles(hd, 0.74, orange, { frame: 0x111111 });
  vest(t, 0x37474f, { pouches: 3, pouch: 0x4b5320, patch: 0xff3d00 });
  shoulderPads(t, 0x37474f, 0.6);
  for (const [x, y] of [[0.75, 0.55], [0.75, 0.1]]) grenade(t, x, y, 0.82, 0x4b5320);
  belt(t, INK, 0x757575);
  pack(t, 0x37474f, { w: 1.3, h: 1.2, d: 0.45 });
  radio(t, 0.45, 0.5, -1.0, 0x263238, 1.6);
  hd.done();
  t.done();
  arms(h, key, tone(shirt, 0.8), 0x111111, null, (a) => a.box(1.1, 0.5, 0.3, 0x37474f, 0, -1.0, -0.55, { r: 0.08 }));
  legs(h, key, 0x111111, 0x37474f);
  gun(h, key, 1.2, (k) => {
    const [y, z] = rifle(k, { len: 2.3, body: 0x212121, mag: 'drum', optic: 'dot', lens: 0xff3d00, light: true });
    k.cyl(0.06, 1.0, STEEL, 0, -1.8, UP - 0.16, { seg: 10 }); // second barrel under the first
    k.cyl(0.085, 0.16, INK, 0, -2.25, UP - 0.16, { seg: 8 });
    k.box(0.2, 0.12, 0.3, INK, 0, -1.4, UP - 0.08); // clamp
    return [y, z];
  });
  aimLong(h);
  h.tracer = 0xffab40;
  h.size = 1.25;
  return own(h);
}

// ------------------------------------------------------------------ Field Barracks

/**
 * One Field Barracks soldier. Scouts get lighter kit at Lv 1 (a boonie hat and a small pack),
 * Riflemen a helmet and webbing, Assault Scouts goggles and a plate carrier; Spec Ops wear black
 * with night-vision and a silenced rifle; Rail Troopers white helmets and a rail rifle; M202
 * Troopers carry a four-tube launcher; Rioters a riot helmet, shield and pistol; Flamethrowers a
 * gas mask and fuel tanks.
 */
function fieldSoldier(model) {
  const look = {
    bscout: { shirt: 0x8d9a5b, pants: 0x5d6b3a, helm: 0x6b7d3a },
    bscout2: { shirt: 0x6b7d3a, pants: 0x4b5320, helm: 0x556b2f },
    bscout3: { shirt: 0x7a6a4f, pants: 0x4e4231, helm: 0x5d4f3a },
    bspec: { shirt: 0x263238, pants: 0x1c2429, helm: 0x111111, skin: 0xc68642 },
    brail: { shirt: 0x37474f, pants: 0x263238, helm: 0xeceff1 },
    bm202: { shirt: 0x6d5d3f, pants: 0x4e4231, helm: 0x5d4f3a },
    briot: { shirt: 0x1c2429, pants: 0x111111, helm: 0x212121 },
    bflame: { shirt: 0x5d4037, pants: 0x3e2723, helm: 0x424242 },
  }[model];
  const { shirt } = look;
  const h = makeHumanoid({ skin: look.skin ?? 0xe0ac69, shirt, pants: look.pants, arms: shirt, face: 'soldier' });
  const key = `s3:${model}`;
  const hd = wear(h, h.head, `${key}:head`);
  const t = wear(h, h.torso, `${key}:torso`);
  const sleeve = tone(shirt, 0.8);
  h.tracer = 0xffc107;
  if (model === 'briot') {
    // Rioter: riot helmet with a visor, body armor, a big shield on the left arm and a pistol
    riotHelmet(hd, look.helm, glassMat(h, 0x80deea, 0.5));
    t.box(2.24, 1.85, 1.18, 0x37474f, 0, 0.1, 0, { r: 0.14 });
    for (let i = 0; i < 3; i++) t.box(2.18, 0.12, 1.2, tone(0x37474f, 0.8), 0, -0.3 - i * 0.24, 0);
    t.box(1.6, 0.26, 0.05, 0xfdd835, 0, 0.45, 0.6); // stripe
    t.box(1.6, 0.26, 0.05, 0xfdd835, 0, 0.45, -0.6);
    shoulderPads(t, 0x263238, 0.62);
    belt(t, INK, 0xb0b0b0, -0.88);
    pouch(t, 0.6, -0.92, 0.6, 0.34, 0.32, INK, 0.18);
    hd.done();
    t.done();
    arms(h, key, sleeve, 0x1a1a1a, null, (a, s) => {
      a.box(1.1, 0.5, 0.3, 0x263238, 0, -1.0, -0.55, { r: 0.08 }); // elbow pad
      if (s === 1) riotShield(a, 0x90a4ae, glassMat(h, 0xcfd8dc, 0.4), 0xfafafa, null);
    });
    legs(h, key, 0x111111, 0x263238, (b) => b.box(0.9, 0.7, 0.16, 0x263238, 0, -1.35, 0.55, { r: 0.06 }));
    gun(h, key, 1.2, (k) => pistol(k, { len: 1.05, laser: glowMat(h, 0xff1744) }));
    h.rightArm.rotation.set(-PI / 2, 0, 0.06);
    h.leftArm.rotation.set(-1.3, 0, -0.25);
    h.pose = { right: -PI / 2, left: -1.3, leftRecoil: 0 };
    h.size = 1.15;
    return own(h);
  }
  if (model === 'bflame') {
    // Flamethrower: helmet and gas mask, a quilted vest, red fuel tanks and a wand with a pilot light
    const pilot = glowMat(h, 0xff9100);
    helmet(hd, look.helm, { band: false });
    gasMask(hd, 0x424242, glowMat(h, 0xff6d00));
    collar(t, tone(shirt, 0.85), { buttons: false });
    t.box(2.2, 1.5, 1.18, 0x6d4c41, 0, 0.1, 0, { r: 0.12 }); // leather apron vest
    for (const y of [0.45, 0.0, -0.45]) t.box(2.22, 0.08, 1.2, 0x8d6e63, 0, y, 0); // quilting
    belt(t, 0x212121);
    pouch(t, 0.6, -0.95, 0.6, 0.4, 0.4, 0x212121, 0.2);
    fuelTanks(t, [-0.38, 0.38], 0.32, 1.7, 0xc62828, { stripe: 0xfdd835 });
    hd.done();
    t.done();
    arms(h, key, sleeve, 0x3e2723, null);
    legs(h, key, 0x212121);
    gun(h, key, 1.15, (k) => [flameWand(k, pilot, { len: 2.0 }), UP]);
    h.rightArm.rotation.set(-PI / 2, 0, 0.1);
    h.leftArm.rotation.set(-PI / 2 + 0.15, 0, -0.5);
    h.pose = { right: -PI / 2, left: -PI / 2 + 0.15, leftRecoil: 0.05 };
    h.recoilScale = 0.1;
    h.size = 1.1;
    return own(h);
  }
  if (model === 'brail') {
    // Rail Trooper: white helmet with a cyan visor, chest plate, a pack of glowing cells, rail rifle
    const cyan = glowMat(h, 0x00e5ff);
    helmet(hd, look.helm, { cover: 0xb0bec5 });
    visor(hd, cyan);
    chestPlate(t, 0x546e7a, cyan, { r: 0.26 });
    shoulderPads(t, 0x546e7a, 0.55);
    belt(t, INK, cyan);
    cellPack(t, 0x37474f, cyan, 3, { w: 1.4 });
    hd.done();
    t.done();
    arms(h, key, sleeve, 0x263238, null);
    legs(h, key, 0x263238, 0x546e7a);
    gun(h, key, 1.1, (k) => railRifle(k, { len: 2.9, glow: cyan, coils: 4, cell: true }));
    aimLong(h);
    h.tracer = 0x00e5ff;
    h.size = 1.15;
    return own(h);
  }
  if (model === 'bm202') {
    // M202 Trooper: a boxy four-tube rocket launcher and a pack of spare rockets
    helmet(hd, look.helm, { cover: tone(shirt, 0.85) });
    goggles(hd, 1.08, 0x4fc3f7, { r: 0.77 });
    collar(t, tone(shirt, 0.85));
    vest(t, 0x5d4f3a, { pouches: 2 });
    belt(t, 0x3e2723);
    rocketPack(t, 3, 0x9e9e9e, 0xe65100);
    hd.done();
    t.done();
    arms(h, key, sleeve, 0x3e2723, 0xe65100);
    legs(h, key, 0x3e2723, 0x5d4f3a);
    gun(h, key, 1.1, (k) => rocketPod(k, 2, 2, 0x4b5320, 0xe65100, { len: 2.3, pitch: 0.4, sight: 0x76ff03 }));
    aimLong(h);
    h.pose.leftRecoil = 0.2;
    h.projectile = { color: 0xff6d00, size: 0.35, arc: 1.5 };
    return own(h);
  }
  // Riflemen: Scout, Rifleman, Assault Scout and Spec Ops
  const spec = model === 'bspec';
  if (model === 'bscout') {
    boonie(hd, look.helm);
    collar(t, tone(shirt, 0.85));
    pockets(t, tone(shirt, 0.9));
    sash(t, 0x4e342e, 1, 0.24);
    belt(t, 0x4e342e, 0x9e9e9e);
    canteen(t, 0.82, 0x4b5320);
    pack(t, 0x6b7d3a, { w: 1.2, h: 1.1, d: 0.45 });
  } else if (spec) {
    balaclava(hd, 0x111111);
    helmet(hd, look.helm, { cover: 0x1c1c1c, y: 1.0 });
    nvg(hd, glowMat(h, 0x76ff03));
    vest(t, 0x1c1c1c, { pouches: 3, pouch: 0x263238 });
    belt(t, INK, 0x424242);
    radio(t, 0.45, 0.4, -0.75, 0x212121, 1.4);
  } else {
    const assault = model === 'bscout3';
    helmet(hd, look.helm, { cover: tone(shirt, 0.85) });
    if (assault) goggles(hd, 0.74, glowMat(h, 0xffab40));
    collar(t, tone(shirt, 0.85));
    if (assault) vest(t, 0x5d4f3a, { pouches: 3, pouch: 0x4e4231 });
    else for (const s of [-1, 1]) sash(t, 0x3e2723, s, 0.24); // webbing straps
    belt(t, 0x3e2723, 0x9e9e9e);
    canteen(t, 0.82, 0x4b5320);
    if (assault) for (const x of [-0.75, 0.75]) grenade(t, x, 0.55, 0.82, 0x4b5320);
    pack(t, tone(shirt, 0.9), { w: 1.3, h: 1.3, d: 0.5, roll: assault ? null : 0x5d4037 });
  }
  hd.done();
  t.done();
  arms(h, key, sleeve, spec || model === 'bscout3' ? 0x1a1a1a : null, spec ? null : 0xffd54f);
  legs(h, key, spec ? 0x111111 : 0x3e2723, model === 'bscout' ? null : spec ? 0x1c1c1c : tone(shirt, 0.7));
  gun(h, key, spec ? 1.25 : 1.15, (k) => rifle(k, spec
    ? { len: 2.3, body: 0x111111, mag: 'box', optic: 'dot', lens: 0x76ff03, can: true }
    : { len: model === 'bscout' ? 1.9 : 2.1, furn: model === 'bscout3' ? INK : 0x6d4c41, optic: model === 'bscout' ? 'iron' : 'dot', light: model === 'bscout3' }));
  aimLong(h);
  return own(h);
}

const field = (model) => (count) => squad(count, () => fieldSoldier(model));

export const SUMMONS = {
  tbsquad: (count) => squad(count, greenSoldier),
  tbtuber: (count) => squad(count, tuberSoldier),
  tbcommando: (count) => squad(count, commandoSoldier),
  bscout: field('bscout'),
  bscout2: field('bscout2'),
  bscout3: field('bscout3'),
  bspec: field('bspec'),
  brail: field('brail'),
  bm202: field('bm202'),
  briot: field('briot'),
  bflame: field('bflame'),
};
