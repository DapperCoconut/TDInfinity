// Humanoid summons, batch 1 (see summons.js), dressed with the vehicle kit like the people towers.
//   pistolgoon  Crook Boss goon: brown suit, flat cap, a pistol
//   tommygoon   Crook Boss goon: grey suit, fedora, a tommy gun
//   dongoon     Crook Boss made man: black suit, red tie, armored vest, fedora, shades, tommy gun
//   mgoon       Mobster thug: brown jacket, beanie, a pistol
//   mgoon2      Mobster thug: leather jacket, flat cap, a tommy gun
//   mgoon3      Mobster made man: red suit, fedora, cigar, a gold tommy gun
//   agent       Mobster agent: black suit, shades, an earpiece, a pistol
//   agent2      the same with a tommy gun
//   agent3      the same with a gold tommy gun and a glowing earpiece
//   gsMerc      Gunslinger's Mercenary: a wasteland soldier with a helmet, goggles and a rifle
// The gangster gear (suits, hats, shoes, tommy gun) comes from people10.js (the Crook Boss and
// Mobster towers); the soldier gear from people1.js. Spaces are explained at the top of people1.js.

import { glowMat, tone } from '../vehicles.js';
import { makeHumanoid } from './kit.js';
import { makeThing } from './bits.js';
import {
  GOLD, GUNMETAL, LEATHER, aimLong, belt, boots, dome, fist, glove, goggles, hair, helmet, kneePad, muzzle, pistol, pouch, rifle, shades, vest, wear,
} from './people1.js';
import { cigar, cuffs, fedora, flatCap, shoes, suitJacket, tommyGun } from './people10.js';

const PI = Math.PI;

// ------------------------------------------------------------------ small gear

/** A knitted beanie: a round crown, a rolled cuff and rib lines (head space). */
function beanie(k, col) {
  dome(k, 0.7, 0.62, col, 0, 0.88, 0, { seg: 18 });
  k.cyl(0.71, 0.26, tone(col, 0.85), 0, 0.92, 0, { seg: 20 }); // rolled cuff
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2;
    k.box(0.04, 0.24, 0.03, tone(col, 0.7), Math.sin(a) * 0.715, 0.92, Math.cos(a) * 0.715, { ry: a });
  }
  k.ball(0.09, tone(col, 0.8), 0, 1.5, 0, { seg: 8, rows: 5 }); // knot on top
}

/** An earpiece in the right ear with its curly wire down into the collar (head space). */
function earpiece(k, col) {
  k.cyl(0.1, 0.12, col, -0.66, 0.6, 0.05, { axis: 'x', seg: 10 });
  k.tube([[-0.68, 0.52, 0.02], [-0.7, 0.3, -0.12], [-0.62, 0.05, -0.3], [-0.5, -0.15, -0.35]], 0.025, 0xcfd8dc, { seg: 10, sides: 4 });
}

/** A leather jacket over a grey tee (torso space): front panels, a zip, a wide collar, zipped pockets. */
function leatherJacket(t, col, tee) {
  const dk = tone(col, 0.8);
  t.box(0.6, 1.5, 0.06, tee, 0, 0.2, 0.52); // the tee showing at the front
  for (const s of [-1, 1]) {
    t.box(0.72, 2.0, 0.08, col, s * 0.66, 0, 0.53); // front panel
    t.box(0.44, 0.5, 0.08, dk, s * 0.42, 0.78, 0.58, { rz: -s * 0.35 }); // collar
    t.box(0.04, 0.42, 0.04, 0xb0b0b0, s * 0.62, -0.4, 0.58, { rz: s * 0.25 }); // pocket zip
    t.box(0.04, 0.32, 0.04, 0xb0b0b0, s * 0.6, 0.38, 0.58); // chest zip
  }
  t.box(0.04, 1.6, 0.04, 0xb0b0b0, 0.3, 0, 0.58); // the main zip
  t.box(2.14, 0.4, 1.12, dk, 0, -1.0, 0, { r: 0.04 }); // waistband
  t.box(2.16, 0.4, 1.14, dk, 0, 0.9, 0, { r: 0.05 }); // shoulder yoke
}

/** A neck scarf tied at the throat, its ends hanging down the chest (torso space). */
function scarf(t, col) {
  t.cyl(0.62, 0.3, col, 0, 1.0, 0, { seg: 16, sx: 1.4 });
  t.box(0.24, 0.2, 0.2, tone(col, 0.85), 0.15, 0.85, 0.6, { r: 0.05 });
  for (const s of [-1, 1]) t.box(0.18, 0.5, 0.06, col, 0.15 + s * 0.1, 0.55, 0.62, { rz: s * 0.25 });
}

// ------------------------------------------------------------------ the gangsters

/**
 * A gangster on foot. o: coat, pants, shirt, tie, hat ('flat' | 'fedora' | 'beanie' | 'hair'),
 * hatCol, band, stripe, square, armor (a vest over the jacket), leather (a leather jacket instead
 * of a suit), shades, ear (earpiece colour or material), cigar, watch, gun ('pistol' | 'tommy'), gold.
 */
function gangster(key, o) {
  const h = makeHumanoid({ skin: 0xd7a26b, shirt: o.coat, pants: o.pants, arms: o.coat, face: 'soldier' });
  const hd = wear(h, h.head, `s1:${key}:head`);
  const t = wear(h, h.torso, `s1:${key}:torso`);
  hd.box(0.9, 0.18, 0.04, tone(0xd7a26b, 0.75), 0, 0.2, 0.6); // stubble along the jaw
  if (o.hat === 'fedora') fedora(hd, o.hatCol, o.band);
  else if (o.hat === 'flat') flatCap(hd, o.hatCol);
  else if (o.hat === 'beanie') beanie(hd, o.hatCol);
  else hair(hd, o.hatCol, { h: 0.44 });
  if (o.shades) shades(hd, 0x0a0a0a, 0x111111);
  if (o.ear != null) earpiece(hd, o.ear === 'glow' ? glowMat(h, 0x40c4ff) : o.ear);
  if (o.cigar) cigar(hd, glowMat(h, 0xff6d00));
  if (o.leather) leatherJacket(t, o.coat, o.shirt);
  else suitJacket(t, o.coat, { shirt: o.shirt, tie: o.tie, square: o.square, stripe: o.stripe });
  belt(t, 0x111111, o.gold ? GOLD : 0xb0b0b0);
  if (o.armor) vest(t, 0x424242, { pouches: 3, pouch: 0x303030 });
  hd.done();
  t.done();
  cuffs(h, `s1:${key}`, o.leather ? tone(o.coat, 0.8) : o.shirt, tone(o.coat, 0.85), o.watch ? GOLD : null);
  shoes(h, `s1:${key}`, 0x151515, { pants: o.pants });
  h.muzzles = [];
  if (o.gun === 'tommy') {
    const g = fist(h.rightArm, -1.9, 1.2);
    const gk = wear(h, g, `s1:${key}:gun`);
    const [y, z] = tommyGun(gk, o.gold ? { metal: GOLD, wood: 0x4e342e } : {});
    gk.done();
    muzzle(h, g, y, z);
    aimLong(h);
  } else {
    const g = fist(h.rightArm, -1.9, 1.3);
    const gk = wear(h, g, `s1:${key}:gun`);
    const [y, z] = pistol(gk, { len: 1.0, body: 0x37474f, grip: 0x4e342e });
    gk.done();
    muzzle(h, g, y, z);
    h.rightArm.rotation.set(-PI / 2, 0, 0.05);
    h.leftArm.rotation.set(-0.3, 0, -0.15);
  }
  return h;
}

const GANGSTERS = {
  pistolgoon: { coat: 0x5d4037, pants: 0x212121, shirt: 0xeeeeee, tie: 0x3e2723, hat: 'flat', hatCol: 0x795548, gun: 'pistol' },
  tommygoon: { coat: 0x37474f, pants: 0x212121, shirt: 0xeeeeee, tie: 0x1a237e, hat: 'fedora', hatCol: 0x455a64, band: 0x212121, stripe: 0x546e7a, gun: 'tommy' },
  dongoon: { coat: 0x1a1a1a, pants: 0x212121, shirt: 0xeeeeee, tie: 0xd50000, hat: 'fedora', hatCol: 0x111111, band: 0xd50000, armor: true, shades: true, watch: true, gun: 'tommy' },
  mgoon: { coat: 0x4e342e, pants: 0x263238, shirt: 0x9e9e9e, tie: 0x3e2723, hat: 'beanie', hatCol: 0x424242, gun: 'pistol' },
  mgoon2: { coat: 0x3e2723, pants: 0x263238, shirt: 0x9e9e9e, hat: 'flat', hatCol: 0x212121, leather: true, gun: 'tommy' },
  mgoon3: { coat: 0x8e0000, pants: 0x263238, shirt: 0x111111, tie: 0xd4af37, hat: 'fedora', hatCol: 0x111111, band: 0xd4af37, square: 0xfafafa, cigar: true, watch: true, gun: 'tommy', gold: true },
  agent: { coat: 0x111111, pants: 0x111111, shirt: 0xfafafa, tie: 0x111111, hat: 'hair', hatCol: 0x1a1209, shades: true, ear: 0x212121, gun: 'pistol' },
  agent2: { coat: 0x111111, pants: 0x111111, shirt: 0xfafafa, tie: 0x111111, hat: 'hair', hatCol: 0x1a1209, shades: true, ear: 0x212121, gun: 'tommy' },
  agent3: { coat: 0x111111, pants: 0x111111, shirt: 0xfafafa, tie: 0x111111, hat: 'hair', hatCol: 0x1a1209, shades: true, ear: 'glow', square: 0xfafafa, gun: 'tommy', gold: true },
};

/** A goon squad, laid out as makeUnit lays out its goons (always off to the side, two by two). */
function goons(model, count) {
  const u = makeThing();
  u.wheels = [];
  u.soldiers = [];
  const o = GANGSTERS[model];
  for (let i = 0; i < count; i++) {
    const h = gangster(model, o);
    h.root.scale.setScalar(0.6);
    h.root.position.set((i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.soldiers.push(h);
    u.muzzles.push(h.muzzles[0]);
  }
  u.height = 3.5;
  u.tracer = 0xffc107;
  return u;
}

// ------------------------------------------------------------------ Gunslinger's Mercenary

/** A wasteland mercenary: a brown helmet with goggles on it, a scarf, a plate carrier, gloves, boots and a rifle. */
function merc() {
  const shirt = 0x6d4c41;
  const h = makeHumanoid({ skin: 0xc68642, shirt, pants: 0x263238, arms: shirt, face: 'soldier' });
  const hd = wear(h, h.head, 's1:gsMerc:head');
  helmet(hd, 0x3e2723, { cover: 0x5d4037 });
  goggles(hd, 1.2, 0xffb300, { r: 0.78, strap: 0x3e2723 }); // pushed up on the helmet
  hd.box(0.9, 0.18, 0.04, tone(0xc68642, 0.75), 0, 0.2, 0.6); // stubble
  hd.done();
  const t = wear(h, h.torso, 's1:gsMerc:torso');
  scarf(t, 0xa1887f);
  vest(t, 0x8d6e63, { pouches: 3, pouch: 0x6d4c41, patch: 0x3e2723 });
  belt(t, LEATHER, 0x9e9e9e);
  pouch(t, 0.8, -1.05, 0.5, 0.32, 0.4, 0x5d4037);
  t.done();
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `s1:gsMerc:arm${s}`);
    glove(a, 0x3e2723);
    a.box(1.04, 0.14, 1.04, tone(shirt, 0.8), 0, -1.3, 0); // rolled sleeve
    a.done();
  }
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const l = wear(h, leg, 's1:gsMerc:leg');
    boots(l, 0x4e342e);
    kneePad(l, 0x3e2723);
    l.done();
  }
  h.muzzles = [];
  const g = fist(h.rightArm, -1.9, 1.15);
  const gk = wear(h, g, 's1:gsMerc:gun');
  const [y, z] = rifle(gk, { len: 2.2, body: GUNMETAL, furn: 0x6b4a2f, mag: 'curved' });
  gk.done();
  muzzle(h, g, y, z);
  aimLong(h);
  return h;
}

/** Gunslinger's Mercenaries: one stands in the middle, more go two by two (as the old squad did). */
function mercs(count) {
  const u = makeThing();
  u.static = false;
  u.wheels = [];
  u.soldiers = [];
  for (let i = 0; i < count; i++) {
    const h = merc();
    h.root.scale.setScalar(0.6);
    h.root.position.set(count === 1 ? 0 : (i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.soldiers.push(h);
    u.muzzles.push(h.muzzles[0]);
  }
  u.height = 3.4;
  u.tracer = 0xffe082;
  return u;
}

export const SUMMONS = {
  ...Object.fromEntries(Object.keys(GANGSTERS).map((m) => [m, (n = 1) => goons(m, n)])),
  gsMerc: (n = 1) => mercs(n),
};
