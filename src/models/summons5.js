// Humanoid summons, batch 5 (see summons.js): the Relic tower's medieval units.
//   relicbandit / relicbandit1  hooded sword fighters with a face mask (Level 1: purple, a cloak)
//   reliczealot                 a white-and-gold knight with a great helm, a red cross and a kite shield
//   relicarcher                 a hooded archer with a longbow and a quiver
//   relicwarden                 a huge dark knight with a glowing blue visor and a greatsword
//   relicseraph                 a winged angel with a halo, gold armour and a glowing sword (flies)
//   relicoverseer               a huge faceless stone guardian with a glowing core (only rams)
//   relicphantom                the Overseer as a see-through ghost
//   relicprime                  Overseer Prime: a giant dark stone guardian with horns, claws, a fiery crown
// Bodies are makeHumanoid (kit.js); all they wear and hold is kit-built (people1.js helpers and spaces).

import { glowMat, tone } from '../vehicles.js';
import { makeHumanoid, setOpacity } from './kit.js';
import { makeThing } from './bits.js';
import { GOLD, INK, LEATHER, band, belt, boots, dome, fist, muzzle, own, pouch, sash, wear } from './people1.js';
import { feet, hands, hood } from './people5.js';
import { bow } from './people13.js';
import { cape, gauntlet } from './people18.js';
import { featherWings, sword } from './people24.js';

const PI = Math.PI;

// ------------------------------------------------------------------ the unit around one fighter

/** Wraps a builder into a unit: `count` fighters (the first on the spot), scaled 0.6 * size, as the old relic units were. */
const unit = (build, fly) => (count = 1) => {
  const u = makeThing();
  u.wheels = [];
  u.soldiers = [];
  for (let i = 0; i < count; i++) {
    const h = build();
    h.root.scale.setScalar(0.6 * (h.size ?? 1));
    h.root.position.set(i === 0 ? 0 : (i % 2 ? 1 : -1) * 1.1, 0, i === 0 ? 0 : -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.soldiers.push(h);
    u.muzzles.push(h.muzzles[0]);
  }
  const h = u.soldiers[0];
  u.height = 3.5 * (h.size ?? 1);
  u.tracer = h.tracer;
  if (fly) u.fly = fly;
  return u;
};

/** A blade in the right fist, held out in front and tipped up a little; the muzzle sits at its tip. */
function holdSword(h, key, s, tilt, build) {
  const g = fist(h.rightArm, -1.9, s);
  g.rotation.x = -tilt;
  const k = wear(h, g, `${key}:blade`);
  const tip = build(k);
  k.done();
  h.muzzles = [];
  muzzle(h, g, tip, 0);
  h.rightArm.rotation.set(-PI / 2, 0, 0.1);
  h.pose = { right: -PI / 2, left: h.leftArm.rotation.x, leftRecoil: 0 };
  h.melee = true;
}

// ------------------------------------------------------------------ armour pieces

/** A flat-topped great helm over the whole head (head space): eye slit, nose bar, breathing holes. */
function greatHelm(k, col, slit, o = {}) {
  const dk = tone(col, 0.78);
  k.cyl(0.8, 1.2, col, 0, 0.62, 0, { seg: 20 });
  dome(k, 0.8, 0.24, col, 0, 1.22, 0, { seg: 20 });
  k.torus(0.8, 0.05, dk, 0, 0.04, 0, { rx: PI / 2, seg: 22 }); // bottom rim
  band(k, 0.82, 0.06, 0.13, 2.1, slit, 0.76); // eye slit
  band(k, 0.83, 0.07, 0.08, 2.2, o.trim ?? dk, 0.9); // brow band
  k.box(0.14, 0.95, 0.1, o.trim ?? dk, 0, 0.42, 0.81, { r: 0.03 }); // nose bar, down the front
  for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) {
    const a = 0.35 + i * 0.18;
    k.cyl(0.035, 0.05, INK, Math.sin(a) * 0.81, 0.48 - r * 0.13, Math.cos(a) * 0.81, { axis: 'z', ry: a, seg: 6 }); // breathing holes
  }
  for (const s of [-1, 1]) k.cyl(0.08, 0.06, dk, s * 0.81, 0.62, 0, { axis: 'x', seg: 8 }); // rivets
}

/** A breastplate with a ridge, a back plate and a skirt of three overlapping faulds (torso space). */
function cuirass(k, col, trim) {
  k.box(2.2, 1.45, 0.3, col, 0, 0.25, 0.48, { r: 0.12 });
  k.box(2.2, 1.55, 0.26, tone(col, 0.88), 0, 0.2, -0.5, { r: 0.1 });
  k.slab(0.16, 1.3, 0.1, tone(col, 1.15), 0, 0.25, 0.66, { tw: 0.5 }); // centre ridge
  k.box(1.3, 0.12, 0.12, trim, 0, 0.94, 0.62, { r: 0.03 }); // neck edge
  for (const s of [-1, 1]) k.box(0.1, 1.2, 0.08, trim, s * 1.06, 0.25, 0.6); // side edges
  for (let i = 0; i < 3; i++) {
    const y = -0.55 - i * 0.24;
    k.box(2.22 + i * 0.04, 0.26, 1.2 + i * 0.04, i % 2 ? tone(col, 0.88) : col, 0, y, 0, { r: 0.05 });
    k.box(2.24 + i * 0.04, 0.05, 1.22 + i * 0.04, trim, 0, y - 0.12, 0);
  }
}

/** Shoulder guards: three stacked plates, the top one a dome, with a trim ring (torso space). */
function pauldrons(k, col, trim, r = 0.62) {
  for (const s of [-1, 1]) {
    dome(k, r, r * 0.6, col, s * 1.3, 0.92, 0, { rz: s * -0.35 });
    k.torus(r * 0.97, 0.05, trim, s * 1.3, 0.92, 0, { rx: PI / 2, rz: s * -0.35, seg: 18 });
    for (let i = 0; i < 2; i++) k.box(0.36, 0.22, 1.2 - i * 0.1, i ? tone(col, 0.85) : col, s * (1.5 + i * 0.08), 0.62 - i * 0.24, 0, { r: 0.06, rz: s * -0.35 });
  }
}

/** Plate legs (leg space): sabatons, a greave, a round knee cop. */
function greaves(h, key, col, trim) {
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    boots(b, tone(col, 0.75), { sole: INK });
    for (let i = 0; i < 2; i++) b.box(1.08, 0.08, 1.1, trim, 0, -1.48 + i * 0.18, 0.04); // sabaton lames
    b.box(1.0, 0.75, 0.24, col, 0, -1.0, 0.48, { r: 0.08 });
    b.box(0.96, 0.06, 0.12, trim, 0, -0.64, 0.58);
    b.ball(0.3, col, 0, -0.55, 0.5, { sz: 0.55, seg: 12, rows: 8 }); // knee cop
    b.ball(0.08, trim, 0, -0.55, 0.67, { seg: 6, rows: 4 });
    b.done();
  }
}

/** Plated arms (arm space): a rerebrace over the upper arm and a gauntlet. */
function plateArms(h, key, col, trim, extra) {
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    a.box(1.08, 0.6, 1.08, col, 0, -0.45, 0, { r: 0.08 });
    a.box(1.12, 0.07, 1.12, trim, 0, -0.76, 0);
    gauntlet(a, col, trim);
    extra?.(a, s);
    a.done();
  }
}

/** A kite shield on the outer side of the left arm (arm space), its face along +x. */
function kiteShield(k, face, rim, mark) {
  const pts = [[-0.85, 0.75], [0.85, 0.75], [0.8, -0.35], [0, -1.65], [-0.8, -0.35]].map(([z, y]) => [z, y]);
  k.prism(pts, 0.16, face, 0.66, -1.3, 0.1, { bevel: 0.04 });
  k.prism(pts.map(([z, y]) => [z * 1.07, y * 1.05 + 0.02]), 0.1, rim, 0.6, -1.3, 0.1);
  k.box(0.04, 2.0, 0.34, mark, 0.75, -1.45, 0.1); // the cross
  k.box(0.04, 0.34, 1.3, mark, 0.75, -0.95, 0.1);
  k.ball(0.14, rim, 0.76, -0.95, 0.1, { sx: 0.5, seg: 10, rows: 6 }); // boss
}

// ------------------------------------------------------------------ Bandits

function makeBandit(lv1) {
  const shirt = lv1 ? 0x4a148c : 0x5d4037;
  const pants = lv1 ? 0x311b92 : 0x3e2723;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt, pants, arms: shirt, face: 'frown' });
  const key = `s5:bandit${lv1 ? 1 : 0}`;
  const hd = wear(h, h.head, `${key}:head`);
  hood(hd, lv1 ? 0x38006b : 0x4e342e);
  band(hd, 0.66, 0.06, 0.42, 2.5, 0x212121, 0.2); // cloth mask over the mouth and nose
  hd.box(0.5, 0.3, 0.05, 0x212121, 0, 0.0, 0.62, { r: 0.02 }); // where it hangs under the chin
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  // a leather jerkin with lacing, a strap with throwing knives, a belt with a pouch and a dagger
  t.box(2.14, 1.8, 1.14, tone(shirt, 0.9), 0, 0.05, 0, { r: 0.1 });
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) t.box(0.3, 0.03, 0.03, 0xd7ccc8, 0, 0.7 - i * 0.22, 0.6, { rz: s * 0.5 });
  sash(t, LEATHER, 1, 0.24);
  for (let i = 0; i < 3; i++) t.box(0.1, 0.32, 0.04, 0xb0bec5, -0.15 + i * 0.22, 0.25 - i * 0.14, 0.62, { rz: 0.62 }); // knives on the strap
  belt(t, LEATHER, 0x9e9e9e, -0.82);
  pouch(t, 0.6, -1.0, 0.56, 0.34, 0.32, LEATHER, 0.16);
  t.box(0.18, 0.7, 0.24, INK, -0.85, -1.2, 0.35, { r: 0.04, rz: 0.2 }); // dagger sheath
  t.cyl(0.05, 0.3, 0x8d6e63, -0.78, -0.72, 0.35, { rz: 0.2, seg: 6 });
  if (lv1) {
    cape(t, 0x38006b, 2.6, { w: 2.0, tatter: true, clasp: GOLD });
    dome(t, 0.6, 0.36, 0x546e7a, 1.3, 0.9, 0, { rz: -0.35 }); // a studded shoulder guard
    for (const z of [-0.3, 0, 0.3]) t.ball(0.06, GOLD, 1.42, 1.08, z, { seg: 6, rows: 4 });
  }
  t.done();
  hands(h, key, 0x3e2723, tone(shirt, 0.75), (a) => {
    a.cyl(0.57, 0.6, LEATHER, 0, -1.3, 0, { seg: 12 }); // bracers
    for (let i = 0; i < 2; i++) a.box(0.3, 0.03, 0.03, 0xd7ccc8, 0, -1.15 - i * 0.25, 0.58);
  });
  feet(h, key, 0x2b1d18, (b) => b.box(1.12, 0.5, 1.14, tone(pants, 0.8), 0, -1.25, 0.02, { r: 0.05 })); // leg wraps
  holdSword(h, key, 1.0, 0.5, (k) => sword(k, 1.6, 0.24, lv1 ? 0x9fa8da : 0xb0bec5, { guard: 0.6, grip: LEATHER, metal: 0x6d4c41, gem: lv1 ? 0xab47bc : 0x8d6e63 }));
  h.tracer = 0xeeeeee;
  h.size = 0.85;
  return own(h, 0);
}

// ------------------------------------------------------------------ Zealot

function makeZealot() {
  const h = makeHumanoid({ skin: 0xd7ccc8, shirt: 0xeceff1, pants: 0x90a4ae, arms: 0x90a4ae, face: 'none' });
  const key = 's5:zealot';
  const steel = 0xcfd8dc;
  const red = 0xc62828;
  const hd = wear(h, h.head, `${key}:head`);
  greatHelm(hd, steel, 0x1a1a1a, { trim: GOLD });
  hd.box(0.5, 0.12, 0.1, GOLD, 0, 1.0, 0.8); // a gold cross on the helm front
  hd.cyl(0.06, 0.6, GOLD, 0, 1.58, -0.05, { seg: 6 }); // crest spike with a red plume
  hd.ball(0.22, red, 0, 1.9, -0.15, { sy: 1.4, seg: 10, rows: 7 });
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  // mail under a white tabard with a red cross, gold-trimmed plate on the shoulders
  t.box(2.16, 1.9, 1.16, 0x9ea7ad, 0, 0, 0, { r: 0.1 });
  t.slab(1.7, 2.6, 0.08, 0xfafafa, 0, -0.3, 0.6, { bw: 1.15 }); // tabard front, longer than the chest
  t.slab(1.7, 2.6, 0.08, 0xfafafa, 0, -0.3, -0.6, { bw: 1.15 });
  t.box(0.36, 1.6, 0.04, red, 0, -0.1, 0.66);
  t.box(1.2, 0.34, 0.04, red, 0, 0.3, 0.66);
  t.box(1.72, 0.06, 0.04, GOLD, 0, -1.58, 0.66);
  belt(t, 0x6d4c41, GOLD, -0.7);
  pauldrons(t, steel, GOLD, 0.6);
  t.done();
  plateArms(h, key, steel, GOLD, (a, s) => {
    if (s > 0) kiteShield(a, 0xfafafa, GOLD, red);
  });
  greaves(h, key, steel, GOLD);
  h.leftArm.rotation.set(-0.5, 0, -0.15);
  holdSword(h, key, 1.1, 0.45, (k) => sword(k, 2.2, 0.28, 0xe0e0e0, { guard: 1.0, grip: 0x5d4037, metal: GOLD, gem: red }));
  h.tracer = 0xeeeeee;
  h.size = 1;
  return own(h, 0);
}

// ------------------------------------------------------------------ Archer

function makeRelicArcher() {
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: 0x33691e, pants: 0x5d4037, arms: 0x33691e, face: 'smile' });
  const key = 's5:archer';
  const hd = wear(h, h.head, `${key}:head`);
  hood(hd, 0x2e5d18);
  hd.cyl(0.03, 0.5, 0xfafafa, 0.3, 1.5, -0.4, { rz: -0.5, rx: -0.4, seg: 5 }); // a feather in the hood
  hd.box(0.03, 0.4, 0.12, 0xc62828, 0.42, 1.68, -0.52, { rz: -0.5, rx: -0.4 });
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  // a green tunic with a leaf-cut hem, laced neck, belt, and a quiver on the back
  t.box(2.16, 1.9, 1.16, 0x33691e, 0, 0, 0, { r: 0.12 });
  t.box(0.26, 0.6, 0.04, INK, 0, 0.62, 0.59);
  for (let i = 0; i < 2; i++) for (const s of [-1, 1]) t.box(0.34, 0.03, 0.03, 0xd7ccc8, 0, 0.82 - i * 0.24, 0.62, { rz: s * 0.5 });
  for (let i = 0; i < 7; i++) t.plan([[-0.15, 0], [0.15, 0], [0, 0.22]], 0.05, 0x33691e, -0.9 + i * 0.3, -1.12, 0.56, { rx: -PI / 2 });
  belt(t, LEATHER, 0x9e9e9e, -0.82);
  pouch(t, -0.6, -1.0, 0.56, 0.36, 0.34, LEATHER, 0.16);
  t.box(0.22, 2.5, 1.12, LEATHER, 0, 0, 0, { rz: -0.62 }); // quiver strap
  t.cyl(0.3, 1.7, 0x6d4c41, 0.5, 0.25, -0.88, { rz: 0.3, seg: 12 });
  for (const yy of [-0.45, 0.85]) t.torus(0.3, 0.04, tone(0x6d4c41, 0.6), 0.5 - yy * 0.3, 0.25 + yy, -0.88, { rx: PI / 2, rz: 0.3, seg: 12 });
  for (const [dx, dz, i] of [[-0.1, 0.06, 0], [0.08, -0.06, 1], [0.0, -0.14, 2], [0.12, 0.08, 3]]) {
    const x = 0.24 + dx;
    t.cyl(0.03, 0.55, 0xd7ccc8, x - 0.06, 1.3, -0.88 + dz, { rz: 0.3, seg: 5 });
    t.box(0.03, 0.26, 0.14, i % 2 ? 0xfafafa : 0xc62828, x - 0.12, 1.5, -0.88 + dz, { rz: 0.3 }); // fletching
  }
  t.done();
  hands(h, key, 0x5d4037, tone(0x33691e, 0.75), (a, s) => {
    if (s === 1) {
      a.cyl(0.58, 0.7, 0x6d4c41, 0, -1.25, 0, { seg: 12, r2: 0.6 }); // bracer on the bow arm
      for (let i = 0; i < 3; i++) a.box(0.3, 0.03, 0.03, 0xd7ccc8, 0, -1.05 - i * 0.2, 0.6);
    }
  });
  feet(h, key, 0x4e342e, (b) => b.box(1.12, 0.12, 1.14, 0x6d4c41, 0, -1.3, 0.02)); // boot turn-downs
  const g = fist(h.leftArm, -1.9, 1.1);
  const gk = wear(h, g, `${key}:bow`);
  const tip = bow(gk, { wood: 0x795548, tips: 0x5d4037, wrap: 0x2e7d32 });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, tip, 0.12);
  h.leftArm.rotation.set(-PI / 2, 0, 0.3);
  h.rightArm.rotation.set(-PI / 2, 0, -0.4);
  h.pose = { right: -PI / 2, left: -PI / 2, leftRecoil: 0 };
  h.projectile = { color: 0x8d6e63, size: 0.25, arc: 1 };
  h.tracer = 0xbcaaa4;
  h.size = 0.9;
  return own(h, 0);
}

// ------------------------------------------------------------------ Warden

function makeWarden() {
  const h = makeHumanoid({ skin: 0x9e9e9e, shirt: 0x546e7a, pants: 0x37474f, arms: 0x37474f, face: 'none' });
  const key = 's5:warden';
  const plate = 0x455a64;
  const trim = 0x263238;
  const blue = glowMat(h, 0x40c4ff);
  const hd = wear(h, h.head, `${key}:head`);
  greatHelm(hd, plate, blue, { trim });
  for (const s of [-1, 1]) hd.cyl(0.12, 0.7, trim, s * 0.62, 1.4, 0, { r2: 0.02, rz: s * -0.6, seg: 8 }); // short horns
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  t.box(2.16, 1.9, 1.16, 0x37474f, 0, 0, 0, { r: 0.1 }); // mail under the plate
  cuirass(t, plate, trim);
  t.cyl(0.24, 0.06, trim, 0, 0.35, 0.66, { axis: 'z', seg: 14 }); // a glowing rune on the chest
  t.cyl(0.14, 0.04, blue, 0, 0.35, 0.7, { axis: 'z', seg: 12 });
  // big layered pauldrons with spikes, and a dark cape
  pauldrons(t, plate, trim, 0.82);
  for (const s of [-1, 1]) for (const z of [-0.3, 0.3]) t.cyl(0.1, 0.4, 0x90a4ae, s * 1.42, 1.38, z, { r2: 0.01, rz: s * -0.5, seg: 6 });
  cape(t, 0x1c262b, 3.0, { w: 2.2, tatter: true, clasp: blue });
  // a chain-mail skirt between the legs
  t.box(1.9, 0.6, 1.1, 0x607d8b, 0, -1.25, 0, { r: 0.05 });
  t.done();
  plateArms(h, key, plate, trim);
  greaves(h, key, plate, trim);
  h.leftArm.rotation.set(-1.2, 0, -0.35); // both hands on the big sword
  holdSword(h, key, 1.2, 0.55, (k) => {
    const tip = sword(k, 3.2, 0.42, 0x90a4ae, { guard: 1.5, grip: 0x263238, metal: 0x37474f, gem: blue });
    k.box(0.14, 2.4, 0.08, blue, 0, -1.7, 0); // a glowing line down the blade
    return tip;
  });
  h.pose.left = -1.2;
  h.tracer = 0x40c4ff;
  h.size = 1.5;
  return own(h, 0);
}

// ------------------------------------------------------------------ Seraph

function makeSeraph() {
  const h = makeHumanoid({ skin: 0xffe0b2, shirt: 0xfffde7, pants: 0xfff9c4, arms: 0xfffde7, face: 'smile' });
  const key = 's5:seraph';
  const light = glowMat(h, 0xfff176);
  const halo = glowMat(h, 0xffeb3b);
  const hd = wear(h, h.head, `${key}:head`);
  dome(hd, 0.72, 0.5, 0xffe082, 0, 0.9, -0.04); // golden hair
  band(hd, 0.66, 0.06, 0.8, 3.2, 0xffe082, 0.55, { ry: PI });
  hd.torus(0.68, 0.04, GOLD, 0, 0.98, 0, { rx: PI / 2, seg: 22 }); // circlet
  hd.cyl(0.08, 0.05, 0x4fc3f7, 0, 1.0, 0.7, { axis: 'z', seg: 8 });
  hd.torus(0.6, 0.07, halo, 0, 1.75, -0.1, { rx: PI / 2 - 0.2, seg: 26 }); // the halo
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  // a white robe falling to the knees, a gold breastplate and gold trim
  t.box(2.14, 1.9, 1.14, 0xfffde7, 0, 0, 0, { r: 0.12 });
  t.slab(2.16, 1.3, 1.16, 0xfffde7, 0, -1.35, 0, { bw: 1.15, bd: 1.2 });
  t.box(2.5, 0.07, 1.4, GOLD, 0, -2.0, 0);
  cuirass(t, 0xffd54f, 0xfff8e1);
  t.cyl(0.2, 0.06, 0xfff8e1, 0, 0.35, 0.66, { axis: 'z', seg: 14 });
  t.cyl(0.12, 0.04, light, 0, 0.35, 0.7, { axis: 'z', seg: 12 }); // a glowing gem on the chest
  for (const s of [-1, 1]) dome(t, 0.5, 0.3, 0xffd54f, s * 1.3, 0.9, 0, { rz: s * -0.35 });
  t.done();
  featherWings(h, key, glowMat(h, 0xffffff, 0.35), 0xffe082, { size: 0.95 });
  hands(h, key, null, GOLD, (a) => {
    a.cyl(0.58, 0.5, 0xffd54f, 0, -1.3, 0, { seg: 12 }); // gold bracers
    a.torus(0.58, 0.04, 0xfff8e1, 0, -1.05, 0, { rx: PI / 2, seg: 14 });
  });
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    b.box(1.06, 0.14, 1.12, 0xc8a24a, 0, -1.93, 0.05, { r: 0.04 }); // sandals
    for (let i = 0; i < 3; i++) b.box(1.08, 0.06, 1.1, 0xc8a24a, 0, -1.7 + i * 0.22, 0.02);
    b.done();
  }
  holdSword(h, key, 1.1, 0.5, (k) => sword(k, 2.6, 0.32, light, { guard: 1.1, grip: 0xfff8e1, metal: GOLD, gem: 0x4fc3f7 }));
  h.tracer = 0xfff176;
  h.size = 1.1;
  return own(h, 0);
}

// ------------------------------------------------------------------ Overseers

const OVERSEER = {
  relicoverseer: { skin: 0x8d8d7a, shirt: 0x6d6a55, pants: 0x4e4b3c, core: 0xffd740, size: 2.4 },
  relicphantom: { skin: 0x80deea, shirt: 0x4dd0e1, pants: 0x26c6da, core: 0xe0f7fa, size: 2.4, ghost: true },
  relicprime: { skin: 0x5d5a48, shirt: 0x3e3b2e, pants: 0x2b281f, core: 0xff6d00, size: 3.6, prime: true },
};

/** A crack across a stone face: a few short glowing strokes that zig-zag (any space, facing +z). */
function crack(k, mat, x, y, z, s = 1, o = {}) {
  const pts = [[0, 0, 0.5], [0.16, -0.22, -0.4], [0.3, -0.4, 0.6], [0.44, -0.62, -0.3]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay) * s;
    k.box(0.07, len, 0.05, mat, x + ((ax + bx) / 2) * s, y + ((ay + by) / 2) * s, z, { rz: Math.atan2(bx - ax, by - ay) * -1, ry: o.ry ?? 0 });
  }
}

function makeOverseer(model) {
  const L = OVERSEER[model];
  const h = makeHumanoid({ skin: L.skin, shirt: L.shirt, pants: L.pants, arms: L.shirt, face: 'none' });
  const key = `s5:${model}`;
  const core = glowMat(h, L.core);
  const stone = L.shirt;
  const dark = L.pants;
  const light = L.skin;
  // the head: a faceless stone block with a brow, one glowing eye slit and a crack
  const hd = wear(h, h.head, `${key}:head`);
  hd.box(1.5, 1.4, 1.45, light, 0, 0.62, 0, { r: 0.16 });
  hd.box(1.6, 0.26, 0.4, stone, 0, 0.98, 0.58, { r: 0.08 }); // brow
  hd.box(1.0, 0.18, 0.06, INK, 0, 0.72, 0.73);
  hd.box(0.9, 0.12, 0.06, core, 0, 0.72, 0.75); // the eye slit
  hd.box(0.5, 0.4, 0.3, stone, 0, 0.3, 0.62, { r: 0.08 }); // jaw stone
  crack(hd, core, -0.5, 0.55, 0.74, 0.7);
  if (L.prime) {
    // horns, and a ring of fire spikes as a crown
    for (const s of [-1, 1]) hd.tube([[s * 0.6, 1.2, 0], [s * 0.95, 1.7, -0.05], [s * 0.85, 2.25, -0.2], [s * 0.6, 2.5, -0.3]], 0.13, 0x212121, { seg: 14, sides: 7 });
    for (const s of [-1, 1]) hd.cyl(0.15, 0.4, 0x212121, s * 0.66, 1.3, 0, { seg: 8 });
    for (let i = 0; i < 7; i++) {
      const a = -PI / 2 + ((i - 3) / 3) * 1.1;
      hd.cyl(0.11, 0.42 + (i % 2) * 0.18, core, Math.cos(a) * 0.55, 1.5 + (i % 2) * 0.09, -Math.sin(a) * 0.55, { r2: 0.01, seg: 6 });
    }
    hd.cyl(0.62, 0.14, 0x212121, 0, 1.36, 0, { seg: 16 }); // crown band
  } else {
    dome(hd, 0.62, 0.22, stone, 0, 1.32, 0, { seg: 10, rows: 3 }); // a worn stone cap
  }
  hd.done();
  const t = wear(h, h.torso, `${key}:torso`);
  // a chest of stacked stone blocks round a glowing core, boulder shoulders, cracks
  t.box(2.3, 1.2, 1.3, stone, 0, 0.45, 0, { r: 0.12 });
  t.box(2.1, 0.8, 1.2, tone(stone, 0.88), 0, -0.55, 0, { r: 0.1 });
  t.box(2.2, 0.3, 1.25, dark, 0, -0.95, 0, { r: 0.06 });
  t.cyl(0.52, 0.16, dark, 0, 0.35, 0.66, { axis: 'z', seg: 18 }); // the core's stone ring
  t.cyl(0.38, 0.12, core, 0, 0.35, 0.72, { axis: 'z', seg: 16 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * PI * 2 + PI / 4;
    t.box(0.1, 0.22, 0.06, core, Math.cos(a) * 0.62, 0.35 + Math.sin(a) * 0.62, 0.68, { rz: a }); // rune marks round it
  }
  crack(t, core, 0.55, -0.25, 0.62, 0.8);
  crack(t, core, -0.85, 0.85, 0.66, 0.6);
  for (const s of [-1, 1]) {
    t.ball(0.82, light, s * 1.35, 0.95, 0, { sy: 0.75, seg: 8, rows: 6 }); // boulder shoulders
    t.ball(0.42, stone, s * 1.55, 1.35, -0.2, { seg: 7, rows: 5 });
  }
  if (!L.prime && !L.ghost) for (const [x, z] of [[-1.5, 0.3], [1.2, -0.4]]) dome(t, 0.32, 0.12, 0x6b8e23, x, 1.45, z, { seg: 8, rows: 3 }); // moss
  t.done();
  // arms: stone bracers with a glowing rune band, and huge boulder fists (claws for Prime)
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `${key}:arm${s}`);
    a.box(1.12, 0.7, 1.12, stone, 0, -0.5, 0, { r: 0.1 });
    a.box(1.18, 0.8, 1.18, light, 0, -1.25, 0, { r: 0.1 });
    a.box(1.2, 0.1, 1.2, core, 0, -1.25, 0);
    a.box(1.45, 1.0, 1.45, dark, 0, -2.05, 0.05, { r: 0.18 }); // fist
    for (let i = 0; i < 3; i++) a.box(0.36, 0.3, 0.3, light, -0.4 + i * 0.4, -2.45, 0.6, { r: 0.08 }); // knuckles
    if (L.prime) for (const x of [-0.42, 0, 0.42]) a.cyl(0.13, 0.85, core, x, -2.9, 0.55, { r2: 0.01, rx: -0.4, seg: 6 });
    a.done();
  }
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const b = wear(h, leg, `${key}:leg`);
    b.box(1.2, 0.75, 1.3, dark, 0, -1.65, 0.08, { r: 0.12 }); // stone feet
    b.box(1.12, 0.6, 1.12, stone, 0, -0.85, 0, { r: 0.1 });
    b.box(0.6, 0.4, 0.2, light, 0, -0.55, 0.58, { r: 0.06 }); // knee stone
    b.done();
  }
  h.muzzles = [];
  const g = fist(h.rightArm, -2.0);
  muzzle(h, g, -0.6, 0);
  h.rightArm.rotation.set(-0.3, 0, 0.1);
  h.tracer = L.prime ? 0xff6d00 : 0xeeeeee;
  h.size = L.size;
  if (L.ghost) setOpacity(h, 0.55);
  return own(h, 0);
}

export const SUMMONS = {
  relicbandit: unit(() => makeBandit(false)),
  relicbandit1: unit(() => makeBandit(true)),
  reliczealot: unit(makeZealot),
  relicarcher: unit(makeRelicArcher),
  relicwarden: unit(makeWarden),
  relicseraph: unit(makeSeraph, 5), // Seraphs float over the zombies
  relicoverseer: unit(() => makeOverseer('relicoverseer')),
  relicphantom: unit(() => makeOverseer('relicphantom')),
  relicprime: unit(() => makeOverseer('relicprime')),
};
