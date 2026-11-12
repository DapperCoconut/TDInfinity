// Humanoid summons, batch 6 (see summons.js):
//   skel         Necromancer Skeleton: bare bones, a rag, a bone club
//   skelsword    Skeleton Swordsman: a chipped short sword and a wooden buckler
//   skelsword2   Skeleton Swordsman (iron): an iron cap, a shoulder plate, a belt with a scabbard
//   skelknight   Skeleton Knight: steel armour, a great helm with a red plume, kite shield, longsword
//   skelhallow   Hallow Guard: ghost-blue bones in dark armour with blue glow and a halberd
//   skelexec     Executioner: a pointed black hood, a leather apron and a huge red-edged axe
//   voidneuron   Void Neuron (Void Traitor): a small void bug-man with antennae and claws
//   voidempress  Void Empress (Void Traitor): crown, gown, cape and a double-bladed void glaive
//   vtsupport    Void Traitor Supporter: an armoured void soldier with a glowing void rifle
//
// The skeletons are real kit skeletons from undead.js (makeBones) dressed here; the bone space is
// feet y 0, hips y 2, shoulders y 4, head group at y 4.25, the hand at y -2.05 down each arm.
// The void units keep the blocky makeHumanoid body and wear kit gear (people1.js spaces).

import * as THREE from 'three';
import { glowMat, tone } from '../vehicles.js';
import { makeThing } from './bits.js';
import { makeHumanoid } from './kit.js';
import { makeBones, rag, sword, femurClub, wisp } from './undead.js';
import { INK, UP, dome, band, wear, pouch, belt, boots, kneePad, glove, fist, muzzle, rifle, aimLong, own } from './people1.js';

const PI = Math.PI;
const SOCKET = 0x15110c;
const LEATHER = 0x4e3420;
const IRON = 0x5f6670;
const WOODB = 0x5d4030;
const VOID = 0xd500f9;

// ------------------------------------------------------------------ squads

/** Skeleton squads keep makeUnit's old layout (every soldier off to a side). */
function skelSquad(model, count, mk) {
  const u = makeThing();
  u.wheels = [];
  u.soldiers = [];
  for (let i = 0; i < count; i++) {
    const h = mk();
    h.root.scale.setScalar(0.6 * (h.size ?? 1));
    h.root.position.set((i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.soldiers.push(h);
    u.muzzles.push(h.muzzles[0]);
  }
  u.height = 3.5 * (u.soldiers[0].size ?? 1);
  u.tracer = u.soldiers[0].tracer;
  return u;
}

/** One soldier (or a squad) standing on the spot, as the newmodels squads do. */
function squad(count, mk) {
  const u = makeThing();
  u.wheels = [];
  u.soldiers = [];
  const n = Math.max(1, count || 1);
  for (let i = 0; i < n; i++) {
    const h = mk();
    h.root.scale.setScalar(0.6 * (h.size ?? 1));
    h.root.position.set(n === 1 ? 0 : (i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.soldiers.push(h);
    u.muzzles.push(h.muzzles[0]);
  }
  u.height = 3.5 * (u.soldiers[0].size ?? 1);
  u.tracer = u.soldiers[0].tracer;
  return u;
}

// ------------------------------------------------------------------ skeleton helpers

/** A group at the skeleton's right hand for what it holds (pointy end along -y). */
function hand(h, arm = h.rightArm) {
  const g = new THREE.Group();
  g.position.set(0, -2.05, 0);
  arm.add(g);
  return g;
}

/** Sets the skeleton's muzzle on `parent`. */
function tipAt(h, parent, x, y, z) {
  const m = new THREE.Object3D();
  m.position.set(x, y, z);
  parent.add(m);
  h.muzzles = [m];
}

/** Weapon raised in front, the other arm out a little. */
function pose(h, left = -0.5, leftZ = 0) {
  h.rightArm.rotation.set(-1.2, 0, 0.1);
  h.leftArm.rotation.set(left, 0, leftZ);
}

/** A kit on a skeleton part (keys are per model). */
const sk = (h, parent, key) => wear(h, parent, `s6:${key}`);

/** A round wooden buckler strapped to the left forearm (arm space). */
function buckler(k, wood, rim) {
  k.cyl(0.62, 0.1, wood, 0.3, -1.45, 0, { axis: 'x', seg: 16 });
  for (let i = -2; i <= 2; i++) k.box(0.03, 1.1 - Math.abs(i) * 0.15, 0.02, tone(wood, 0.75), 0.36, -1.45, i * 0.22, { rx: 0 }); // plank lines
  k.torus(0.62, 0.05, rim, 0.36, -1.45, 0, { ry: PI / 2, seg: 16 });
  k.ball(0.15, rim, 0.38, -1.45, 0, { sx: 0.5, seg: 10, rows: 6 }); // boss
  k.box(0.08, 0.2, 0.25, tone(wood, 0.6), 0.37, -1.2, 0.45, { rx: 0.4 }); // a chip out of the rim
}

/** A steel pauldron on a shoulder (upper space). */
function pauldron(k, side, plate, trim, y = 4.0) {
  k.ball(0.46, plate, side * 1.05, y, 0, { sy: 0.55, seg: 12, rows: 6 });
  k.ball(0.42, tone(plate, 0.85), side * 1.12, y - 0.18, 0, { sy: 0.45, seg: 12, rows: 6 });
  k.torus(0.43, 0.035, trim, side * 1.05, y - 0.08, 0, { rx: PI / 2, seg: 14 });
}

/** Breastplate, back plate and the straps over the shoulders (upper space). */
function cuirass(k, plate, trim) {
  k.slab(1.55, 1.25, 0.2, plate, 0, 3.5, 0.5, { tw: 1.08, bw: 0.85, r: 0.05 });
  k.box(0.08, 1.1, 0.06, trim, 0, 3.5, 0.62); // middle ridge
  k.slab(1.5, 1.1, 0.16, tone(plate, 0.85), 0, 3.5, -0.52, { tw: 1.05, bw: 0.9 });
  for (const s of [-1, 1]) k.box(0.12, 0.08, 1.0, INK, s * 0.7, 3.95, 0);
  for (const [x, y] of [[-0.6, 3.95], [0.6, 3.95], [-0.5, 2.95], [0.5, 2.95]]) k.ball(0.05, trim, x, y, 0.6, { seg: 6, rows: 4 }); // rivets
}

/** A belt with a cloth tabard hanging front and back (upper space). */
function tabard(k, cloth, trim, len = 1.1) {
  k.cyl(0.62, 0.25, LEATHER, 0, 2.4, 0, { seg: 16 });
  k.box(0.25, 0.22, 0.06, trim, 0, 2.4, 0.62);
  for (const z of [1, -1]) {
    k.slab(0.8, len, 0.05, cloth, 0, 2.3 - len / 2, z * 0.5, { bw: 0.8 });
    k.box(0.82, 0.06, 0.06, trim, 0, 2.3 - len + 0.05, z * 0.51);
  }
}

/** Arm plates: elbow cuff and a gauntlet over the bony hand (arm space). */
function armPlates(k, plate) {
  k.cyl(0.2, 0.35, plate, 0, -1.05, 0, { seg: 10, r2: 0.18 });
  k.cyl(0.18, 0.4, plate, 0, -1.85, 0, { seg: 10, r2: 0.22 });
  k.box(0.36, 0.08, 0.2, tone(plate, 1.25), 0, -1.68, 0, { r: 0.03 });
}

/** Leg plates: knee cop and a shin guard (leg space). */
function legPlates(k, plate) {
  k.ball(0.22, plate, 0, -1.05, 0.06, { sz: 0.8, seg: 10, rows: 6 });
  k.slab(0.36, 0.6, 0.12, plate, 0, -1.5, 0.12, { tw: 1.1, r: 0.03 });
  k.box(0.4, 0.08, 0.14, tone(plate, 0.75), 0, -1.22, 0.14);
}

/** Bone-style skeleton built by undead.js, then dressed by `dress(h)`. */
function bones(model, L, dress) {
  const h = makeBones(model, L);
  dress(h);
  return h;
}

// ------------------------------------------------------------------ the skeletons

const BONE = 0xe8e4d0;

function skel(count) {
  return skelSquad('skel', count, () =>
    bones('skel', { bone: BONE, size: 1, rag: 0x6d5a40 }, (h) => {
      const g = hand(h);
      g.scale.setScalar(0.7);
      const w = sk(h, g, 'skel:club');
      femurClub(w, BONE, tone(BONE, 0.78));
      w.done();
      tipAt(h, g, 0, -2.4, 0);
      pose(h);
      h.tracer = 0xe0e0e0;
    }),
  );
}

function skelsword(count, iron) {
  const model = iron ? 'skelsword2' : 'skelsword';
  return skelSquad(model, count, () =>
    bones(model, { bone: BONE, size: 1, rag: iron ? undefined : 0x5b4a36 }, (h) => {
      const steel = iron ? 0x90a4ae : 0x9e9e9e;
      if (iron) {
        // Iron cap with a brim and rivets, a shoulder plate and a belt with a scabbard.
        const c = sk(h, h.head, 'sw2:cap');
        dome(c, 0.66, 0.55, 0x546e7a, 0, 0.98, -0.02);
        c.torus(0.72, 0.06, tone(0x546e7a, 0.8), 0, 1.0, -0.02, { rx: PI / 2, seg: 20 });
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * PI * 2;
          c.ball(0.04, 0x37474f, Math.sin(a) * 0.62, 1.12, Math.cos(a) * 0.62 - 0.02, { seg: 6, rows: 4 });
        }
        c.box(0.06, 0.55, 1.0, 0x37474f, 0, 1.28, -0.02); // a ridge over the top
        c.done();
        const t = sk(h, h.upper, 'sw2:gear');
        pauldron(t, 1, 0x607d8b, 0x37474f);
        t.box(0.12, 2.0, 0.08, LEATHER, 0.1, 3.15, 0.55, { rz: 0.62 }); // strap across the ribs
        t.cyl(0.62, 0.22, LEATHER, 0, 2.35, 0, { seg: 16 });
        t.box(0.26, 0.24, 0.08, 0xb0a070, 0, 2.35, 0.62, { r: 0.03 });
        t.box(0.2, 1.6, 0.1, 0x3e2723, 0.66, 1.75, -0.2, { rx: -0.35, rz: 0.12 }); // scabbard
        t.box(0.26, 0.12, 0.14, 0x9e9e9e, 0.66, 1.0, -0.47, { rx: -0.35 }); // its tip
        pouch(t, -0.45, 2.1, 0.5, 0.32, 0.3, LEATHER, 0.16);
        t.done();
      }
      // Leather bracer on the sword arm.
      const a = sk(h, h.rightArm, `${model}:bracer`);
      a.cyl(0.17, 0.5, LEATHER, 0, -1.55, 0, { seg: 10, r2: 0.2 });
      for (const y of [-1.42, -1.68]) a.torus(0.19, 0.025, INK, 0, y, 0, { rx: PI / 2, seg: 10 });
      a.done();
      const l = sk(h, h.leftArm, `${model}:shield`);
      if (iron) buckler(l, 0x6d4c41, 0x78909c);
      else buckler(l, WOODB, 0x5d4a3a);
      l.done();
      const g = hand(h);
      const w = sk(h, g, `${model}:sword`);
      const tip = sword(w, iron ? 1.75 : 1.6, iron ? 0.3 : 0.28, steel, tone(steel, 0.7), 0x4e342e);
      if (!iron) w.box(0.12, 0.14, 0.08, 0x3a3a3a, 0.12, -1.0, 0); // a notch in the blade
      w.done();
      tipAt(h, g, 0, tip, 0);
      pose(h, -0.9, -0.25);
      h.tracer = 0xe0e0e0;
    }),
  );
}

function skelknight(count) {
  return skelSquad('skelknight', count, () =>
    bones('skelknight', { bone: BONE, size: 1 }, (h) => {
      const plate = 0x78909c;
      const trim = 0x37474f;
      const t = sk(h, h.upper, 'kn:body');
      cuirass(t, plate, trim);
      t.box(0.5, 0.5, 0.04, 0x1565c0, 0, 3.45, 0.64); // a blue shield badge on the chest
      t.box(0.08, 0.36, 0.05, 0xeceff1, 0, 3.45, 0.67);
      t.box(0.3, 0.08, 0.05, 0xeceff1, 0, 3.52, 0.67);
      for (const s of [-1, 1]) pauldron(t, s, plate, trim);
      tabard(t, 0x1e3a5f, 0xb0a070);
      t.done();
      // Great helm: a flat-topped bucket with a visor slit, breathing holes and a red plume.
      const c = sk(h, h.head, 'kn:helm');
      c.cyl(0.68, 1.0, plate, 0, 0.75, 0, { seg: 16, r2: 0.64 });
      c.cyl(0.64, 0.12, tone(plate, 0.85), 0, 1.31, 0, { seg: 16, r2: 0.5 });
      c.box(1.0, 0.11, 0.1, SOCKET, 0, 0.82, 0.66); // visor slit
      c.box(0.1, 0.7, 0.08, trim, 0, 0.62, 0.67); // the cross down the front
      c.box(0.9, 0.08, 0.06, trim, 0, 0.98, 0.66);
      for (let i = 0; i < 6; i++) c.cyl(0.025, 0.05, SOCKET, (i % 3 - 1) * 0.12 + 0.3, 0.45 - Math.floor(i / 3) * 0.1, 0.65, { axis: 'z', seg: 6 });
      c.torus(0.67, 0.04, trim, 0, 0.28, 0, { rx: PI / 2, seg: 16 });
      c.cyl(0.08, 0.15, trim, 0, 1.42, -0.05, { seg: 8 });
      for (let i = 0; i < 5; i++) c.ball(0.17 - i * 0.012, i % 2 ? 0xc62828 : 0xe53935, 0, 1.55 + Math.sin(i * 0.5) * 0.12, -0.05 - i * 0.2, { sy: 0.8, seg: 8, rows: 6 }); // plume
      c.done();
      for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
        const a = sk(h, arm, `kn:arm${s}`);
        armPlates(a, plate);
        if (s > 0) {
          // Kite shield on the left forearm, facing out.
          a.prism([[-0.6, 0.6], [0.6, 0.6], [0.65, -0.2], [0, -1.3], [-0.65, -0.2]], 0.12, 0x1565c0, 0.36, -1.2, 0);
          a.prism([[-0.66, 0.66], [0.66, 0.66], [0.72, -0.22], [0, -1.42], [-0.72, -0.22]], 0.06, trim, 0.27, -1.2, 0);
          a.box(0.04, 1.4, 0.16, 0xeceff1, 0.43, -1.45, 0);
          a.box(0.04, 0.16, 0.9, 0xeceff1, 0.43, -1.0, 0);
        }
        a.done();
      }
      for (const leg of [h.rightLeg, h.leftLeg]) {
        const k = sk(h, leg, 'kn:leg');
        legPlates(k, plate);
        k.done();
      }
      const g = hand(h);
      const w = sk(h, g, 'kn:sword');
      const tip = sword(w, 1.95, 0.34, 0xb0bec5, 0x8a979e, 0x3e2723);
      w.done();
      tipAt(h, g, 0, tip, 0);
      pose(h, -0.9, -0.3);
      h.tracer = 0xcfd8dc;
    }),
  );
}

function skelhallow(count) {
  return skelSquad('skelhallow', count, () =>
    bones('skelhallow', { bone: 0xb3e5fc, size: 1.2, eye: 0x40c4ff }, (h) => {
      const plate = 0x263238;
      const trim = 0x546e7a;
      const ghost = glowMat(h, 0x40c4ff, 1.0);
      const t = sk(h, h.upper, 'hg:body');
      cuirass(t, plate, trim);
      t.plan([[0, -0.3], [0.22, 0], [0, 0.3], [-0.22, 0]], 0.05, ghost, 0, 3.55, 0.62, { rx: PI / 2 }); // glowing rune
      for (const s of [-1, 1]) t.box(0.05, 0.5, 0.04, ghost, s * 0.35, 3.3, 0.63, { rz: s * 0.4 });
      for (const s of [-1, 1]) {
        pauldron(t, s, plate, trim);
        t.cyl(0.08, 0.45, trim, s * 1.15, 4.35, 0, { r2: 0.01, seg: 6, rz: -s * 0.4 }); // spike
      }
      tabard(t, 0x0d2a3a, trim, 1.25);
      t.box(0.06, 0.9, 0.04, ghost, 0, 1.75, 0.54);
      t.done();
      const c = sk(h, h.head, 'hg:helm');
      c.cyl(0.68, 0.9, plate, 0, 0.72, 0, { seg: 16, r2: 0.64 });
      c.ball(0.64, plate, 0, 1.17, 0, { sy: 0.7, seg: 16, rows: 6 });
      c.box(1.0, 0.12, 0.1, SOCKET, 0, 0.8, 0.66); // visor slit
      c.box(0.9, 0.06, 0.04, ghost, 0, 0.8, 0.71); // ghost-light behind it
      c.box(0.1, 0.5, 0.08, trim, 0, 0.52, 0.67);
      c.torus(0.67, 0.04, trim, 0, 0.3, 0, { rx: PI / 2, seg: 16 });
      for (const s of [-1, 1]) c.tube([[s * 0.6, 1.0, -0.1], [s * 0.85, 1.25, -0.3], [s * 0.8, 1.6, -0.55]], 0.06, trim, { r2: 0.02 }); // swept wings
      c.cyl(0.04, 0.35, ghost, 0, 1.75, 0, { r2: 0.0, seg: 6 }); // little ghost flame on top
      c.done();
      for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
        const a = sk(h, arm, `hg:arm${s}`);
        armPlates(a, plate);
        a.done();
      }
      for (const leg of [h.rightLeg, h.leftLeg]) {
        const k = sk(h, leg, 'hg:leg');
        legPlates(k, plate);
        k.done();
      }
      // Halberd: a long dark shaft, a glowing axe blade, a spike on top and a hook at the back.
      const g = hand(h);
      const w = sk(h, g, 'hg:halberd');
      w.cyl(0.07, 3.9, 0x3e2723, 0, -1.05, 0, { seg: 8 });
      for (const y of [0.0, -0.4]) w.torus(0.085, 0.025, trim, 0, y, 0, { rx: PI / 2, seg: 10 });
      w.cyl(0.1, 0.2, trim, 0, 0.92, 0, { seg: 8 }); // butt cap
      w.cyl(0.11, 0.35, trim, 0, -2.35, 0, { seg: 8 }); // socket
      w.prism([[0.05, 0.4], [0.75, 0.55], [0.9, 0.0], [0.75, -0.55], [0.05, -0.35]], 0.06, ghost, 0, -2.45, 0); // axe blade (toward +z)
      w.prism([[0.05, 0.4], [0.62, 0.48], [0.62, -0.42], [0.05, -0.35]], 0.1, trim, 0, -2.45, 0);
      w.prism([[-0.05, 0.15], [-0.55, -0.15], [-0.05, -0.1]], 0.06, trim, 0, -2.45, 0); // back hook
      w.cyl(0.0, 0.7, ghost, 0, -2.95, 0, { r2: 0.08, seg: 6 }); // spike
      w.done();
      tipAt(h, g, 0, -2.6, 0.6);
      wisp(h, 0x40c4ff);
      pose(h, -0.5);
      h.tracer = 0x40c4ff;
    }),
  );
}

function skelexec(count) {
  return skelSquad('skelexec', count, () =>
    bones('skelexec', { bone: BONE, size: 1.5, eye: 0xff1744 }, (h) => {
      const red = glowMat(h, 0xff1744, 1.0);
      const black = 0x15151a;
      // Pointed black hood over the skull, with eye holes the red eyes glow through.
      const c = sk(h, h.head, 'ex:hood');
      c.cyl(0.74, 1.15, black, 0, 0.78, -0.02, { seg: 14, r2: 0.5 });
      c.cyl(0.5, 0.6, black, 0, 1.63, -0.08, { seg: 14, r2: 0.04, rx: -0.12 });
      for (const s of [-1, 1]) {
        c.box(0.26, 0.16, 0.06, SOCKET, s * 0.24, 0.8, 0.72);
        c.box(0.16, 0.07, 0.04, red, s * 0.24, 0.8, 0.75);
      }
      c.slab(1.8, 0.6, 1.4, black, 0, 0.0, -0.02, { tw: 0.75, td: 0.85 }); // the hood's shoulder cape
      c.done();
      // Leather apron over the ribs, a wide belt with an iron buckle and a ring of keys.
      const t = sk(h, h.upper, 'ex:body');
      t.slab(1.5, 2.1, 0.12, 0x3b2a20, 0, 2.9, 0.55, { tw: 0.85, bw: 1.1 });
      for (const [x, y] of [[-0.3, 3.2], [0.35, 2.6], [0.1, 2.2]]) t.ball(0.08, 0x5a0f0f, x, y, 0.63, { sz: 0.35, seg: 6, rows: 4 }); // stains
      for (const s of [-1, 1]) t.box(0.1, 0.1, 1.05, INK, s * 0.55, 3.95, 0); // apron straps
      t.cyl(0.66, 0.32, LEATHER, 0, 2.35, 0, { seg: 16, r2: 0.64 });
      t.box(0.34, 0.3, 0.08, IRON, 0, 2.35, 0.66, { r: 0.03 });
      t.box(0.2, 0.14, 0.06, LEATHER, 0, 2.35, 0.7);
      t.torus(0.14, 0.025, IRON, -0.55, 2.1, 0.45, { ry: 0.7, seg: 12 });
      for (const r of [-0.3, 0, 0.3]) t.box(0.04, 0.24, 0.05, 0x9e9e9e, -0.55 + r * 0.3, 1.92, 0.5, { rz: r });
      t.done();
      for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
        const a = sk(h, arm, `ex:arm${s}`);
        a.cyl(0.19, 0.6, black, 0, -1.6, 0, { seg: 10, r2: 0.22 }); // black glove cuffs
        a.box(0.36, 0.28, 0.2, black, 0, -2.06, 0.02, { r: 0.05 });
        a.done();
      }
      // The huge axe: long shaft, a broad crescent head with a glowing red edge.
      const g = hand(h);
      const w = sk(h, g, 'ex:axe');
      w.cyl(0.08, 3.4, 0x3e2723, 0, -0.9, 0, { seg: 8 });
      for (const y of [0.1, -0.3]) w.torus(0.095, 0.03, IRON, 0, y, 0, { rx: PI / 2, seg: 10 });
      w.ball(0.12, IRON, 0, 0.82, 0, { seg: 8, rows: 6 });
      w.prism([[0.05, 0.55], [0.6, 0.9], [1.2, 0.85], [1.45, 0.0], [1.2, -0.85], [0.6, -0.9], [0.05, -0.55]], 0.1, 0x424242, 0, -2.25, 0); // blade
      w.prism([[1.2, 0.85], [1.35, 0.85], [1.6, 0.0], [1.35, -0.85], [1.2, -0.85], [1.45, 0.0]], 0.06, red, 0, -2.25, 0); // glowing edge
      w.cyl(0.13, 1.2, IRON, 0, -2.25, 0, { seg: 8 }); // the head's collar
      w.prism([[-0.05, 0.2], [-0.4, 0.05], [-0.05, -0.2]], 0.1, 0x424242, 0, -2.25, 0); // back spike
      w.done();
      tipAt(h, g, 0, -2.25, 1.4);
      h.leftArm.rotation.set(-1.1, 0, -0.35); // both hands near the axe
      h.rightArm.rotation.set(-1.3, 0, 0.1);
      h.tracer = 0xff5252;
    }),
  );
}

// ------------------------------------------------------------------ Void Traitor units

/** Void Neuron: a small hunched void bug-man with glowing antennae, a shell and claws. */
function voidNeuron() {
  const h = makeHumanoid({ skin: 0x7e57c2, shirt: 0x4a148c, pants: 0x0b0014, arms: 0x4a148c, face: 'void' });
  const rune = glowMat(h, VOID, 1.0);
  const shell = 0x2a0a4a;
  const hd = wear(h, h.head, 'vn:head');
  for (const s of [-1, 1]) {
    hd.tube([[s * 0.3, 1.1, 0], [s * 0.5, 1.5, -0.05], [s * 0.75, 1.75, 0.15], [s * 0.85, 1.8, 0.4]], 0.05, shell, { r2: 0.02 });
    hd.ball(0.1, rune, s * 0.86, 1.8, 0.45, { seg: 8, rows: 6 });
  }
  for (let i = 0; i < 4; i++) hd.cyl(0.1, 0.3, shell, 0, 1.1 - i * 0.22, -0.55 - i * 0.04, { r2: 0.0, seg: 6, rx: -1.2 }); // spines down the back of the head
  for (const s of [-1, 1]) hd.box(0.06, 0.06, 0.04, rune, s * 0.48, 0.35, 0.58, { rz: s * 0.5 }); // mandible glints
  hd.done();
  const t = wear(h, h.torso, 'vn:torso');
  for (let i = 0; i < 3; i++) t.slab(1.9 - i * 0.15, 0.55, 0.2, i % 2 ? shell : tone(shell, 1.3), 0, 0.65 - i * 0.6, 0.56, { tw: 1.05, bw: 0.92, r: 0.03 }); // chest shell plates
  for (let i = 0; i < 3; i++) t.slab(1.95, 0.6, 0.18, tone(shell, 0.9), 0, 0.65 - i * 0.6, -0.56, { tw: 1.05, bw: 0.92 }); // back plates
  for (const [x, y, rz] of [[-0.45, 0.4, 0.6], [0.4, -0.2, -0.5], [0.0, 0.95, 0]]) t.box(0.05, 0.4, 0.04, rune, x, y, 0.67, { rz }); // glowing veins
  t.ball(0.18, rune, 0, 0.1, 0.68, { sz: 0.5, seg: 10, rows: 6 }); // the neuron core
  for (const s of [-1, 1]) t.cyl(0.12, 0.6, shell, s * 0.5, 0.6, -0.75, { r2: 0.0, seg: 6, rx: -0.9 }); // back spikes
  t.done();
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const k = wear(h, leg, 'vn:leg');
    k.box(1.06, 0.6, 1.06, shell, 0, -1.68, 0.02, { r: 0.05 });
    for (const x of [-0.3, 0, 0.3]) k.cyl(0.08, 0.35, tone(shell, 1.4), x, -1.85, 0.62, { r2: 0.0, seg: 6, axis: 'z' }); // toe claws
    k.box(0.9, 0.3, 0.2, tone(shell, 1.2), 0, -0.95, 0.52, { r: 0.05 }); // knee shell
    k.done();
  }
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `vn:arm${s}`);
    a.box(1.1, 0.5, 1.1, shell, 0, -0.2, 0, { r: 0.08 }); // shoulder shell
    a.box(0.06, 0.6, 0.04, rune, s * 0.53, -0.9, 0.2);
    a.done();
  }
  // Claws: three long hooked blades from each fist, glowing at the tips.
  const g = fist(h.rightArm, -1.9);
  const c = wear(h, g, 'vn:claw');
  for (const x of [-0.3, 0, 0.3]) {
    c.cyl(0.08, 0.9, shell, x, -0.55, 0.15, { r2: 0.03, seg: 6, rx: 0.15 });
    c.cyl(0.03, 0.25, rune, x, -1.1, 0.25, { r2: 0.0, seg: 6, rx: 0.3 });
  }
  c.done();
  const lg = fist(h.leftArm, -1.9);
  const lc = wear(h, lg, 'vn:clawL');
  for (const x of [-0.25, 0.25]) lc.cyl(0.07, 0.6, shell, x, -0.4, 0.1, { r2: 0.03, seg: 6, rx: 0.2 });
  lc.done();
  h.muzzles = [];
  muzzle(h, g, -1.2, 0.25);
  h.rightArm.rotation.set(-PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-0.9, 0, -0.3);
  h.upper.rotation.x = 0.15; // hunched
  h.tracer = VOID;
  h.size = 0.7;
  return h;
}

/** Void Empress: a tall void queen with a crown, a gown and cape, and a double-bladed glaive. */
function voidEmpress() {
  const h = makeHumanoid({ skin: 0x7e57c2, shirt: 0x1a0033, pants: 0x0b0014, arms: 0x311b92, face: 'void' });
  const rune = glowMat(h, VOID, 1.0);
  const gown = 0x311b92;
  const dark = 0x12001f;
  const gold = 0xb39ddb;
  const hd = wear(h, h.head, 've:head');
  dome(hd, 0.7, 0.42, dark, 0, 0.95, -0.03); // dark hair
  band(hd, 0.64, 0.08, 0.9, 2.6, dark, 0.55, { ry: PI }); // long hair at the back
  hd.box(1.1, 1.3, 0.2, dark, 0, -0.2, -0.55, { r: 0.08 });
  hd.cyl(0.69, 0.16, gold, 0, 1.12, 0, { seg: 20, open: true }); // crown band
  hd.cyl(0.66, 0.16, gold, 0, 1.12, 0, { seg: 20 });
  for (let i = 0; i < 7; i++) {
    const a = ((i - 3) / 3) * 1.25;
    const tall = i === 3 ? 0.75 : i % 2 ? 0.4 : 0.55;
    hd.cyl(0.09, tall, i % 2 ? gold : rune, Math.sin(a) * 0.66, 1.2 + tall / 2, Math.cos(a) * 0.66, { r2: 0.0, seg: 6 });
  }
  hd.ball(0.11, rune, 0, 1.15, 0.7, { sz: 0.5, seg: 10, rows: 6 }); // crown gem
  hd.done();
  const t = wear(h, h.torso, 've:torso');
  // Bodice, a high spiked collar, a glowing chest gem and the shoulder pieces.
  t.slab(2.08, 1.3, 1.08, gown, 0, 0.35, 0, { tw: 1.0, bw: 0.85, r: 0.04 });
  t.box(0.12, 1.2, 0.05, gold, 0, 0.3, 0.55);
  t.plan([[0, -0.28], [0.2, 0], [0, 0.28], [-0.2, 0]], 0.06, rune, 0, 0.5, 0.56, { rx: PI / 2 });
  for (let i = 0; i < 5; i++) {
    const a = ((i - 2) / 2) * 1.6 + PI;
    t.cyl(0.1, 0.55, dark, Math.sin(a) * 0.55, 1.2, Math.cos(a) * 0.4, { r2: 0.0, seg: 6, rx: Math.cos(a) * -0.4, rz: Math.sin(a) * 0.4 }); // collar spikes
  }
  for (const s of [-1, 1]) {
    t.ball(0.58, dark, s * 1.1, 0.85, 0, { sy: 0.55, seg: 12, rows: 6 });
    t.torus(0.55, 0.04, gold, s * 1.1, 0.78, 0, { rx: PI / 2, seg: 16 });
    t.cyl(0.1, 0.6, rune, s * 1.25, 1.25, 0, { r2: 0.0, seg: 6, rz: -s * 0.45 });
  }
  // Belt and a long flared gown skirt.
  t.box(2.1, 0.22, 1.1, gold, 0, -0.75, 0, { r: 0.04 });
  t.ball(0.12, rune, 0, -0.75, 0.57, { seg: 8, rows: 6 });
  t.slab(2.1, 2.05, 1.1, gown, 0, -1.9, 0, { bw: 1.4, bd: 1.5 });
  t.slab(0.5, 2.0, 0.05, dark, 0, -1.9, 0.62, { bw: 1.6, bz: 0.24 }); // front panel
  t.slab(2.98, 0.1, 1.7, rune, 0, -2.88, 0); // glowing hem
  // Cape from the shoulders, lined with void glow.
  t.slab(2.3, 3.9, 0.1, dark, 0, -0.98, -0.7, { bw: 1.35, bz: -0.4 });
  t.slab(2.2, 3.8, 0.04, 0x4a148c, 0, -0.96, -0.64, { bw: 1.35, bz: -0.4 });
  for (const s of [-1, 1]) t.box(0.06, 3.85, 0.06, rune, s * 1.3, -0.98, -0.92, { rz: s * -0.1, rx: 0.1 });
  t.done();
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `ve:arm${s}`);
    a.cyl(0.6, 0.5, dark, 0, -1.45, 0, { seg: 12, r2: 0.7, open: true }); // flared cuff
    a.torus(0.62, 0.04, gold, 0, -1.6, 0, { rx: PI / 2, seg: 14 });
    glove(a, 0x1a0033);
    a.done();
  }
  // Glaive: held across the fist, one blade up and one down (fist +z is up while aiming).
  const g = fist(h.rightArm, -1.9);
  g.rotation.y = -0.7; // leaned out to the side, off her face
  const w = wear(h, g, 've:glaive');
  w.cyl(0.1, 2.2, 0x111111, 0, 0, 0, { axis: 'z', seg: 8 });
  for (const z of [-0.95, 0.95]) w.cyl(0.15, 0.2, gold, 0, 0, z, { axis: 'z', seg: 8 });
  w.ball(0.18, rune, 0, 0, 0.55, { seg: 8, rows: 6 });
  for (const d of [1, -1]) {
    w.cyl(0.14, 0.25, gold, 0, 0, d * 1.2, { axis: 'z', seg: 8 });
    w.prism([[-0.22, 0], [0.22, 0], [0.12, 1.4], [0, 2.0], [-0.3, 1.0]], 0.08, rune, 0, 0, d * 1.3, { rx: d > 0 ? PI / 2 : -PI / 2, ry: PI / 2 });
  }
  w.done();
  h.muzzles = [];
  muzzle(h, g, 0, 2.8);
  h.rightArm.rotation.set(-PI / 2, 0, 0.1);
  h.leftArm.rotation.set(-0.3, 0, -0.35);
  h.tracer = VOID;
  h.size = 1.5;
  return h;
}

/** Void Traitor Supporter: a void soldier in dark armour with a glowing visor and a void rifle. */
function vtSupporter() {
  const h = makeHumanoid({ skin: 0x311b92, shirt: 0x4a148c, pants: 0x1a0033, arms: 0x4a148c, face: 'void' });
  const rune = glowMat(h, VOID, 1.0);
  const armor = 0x2a1040;
  const hd = wear(h, h.head, 'vt:head');
  dome(hd, 0.76, 0.62, 0x1a0033, 0, 0.88, 0);
  hd.torus(0.75, 0.05, tone(armor, 0.8), 0, 0.88, 0, { rx: PI / 2, seg: 20 });
  band(hd, 0.66, 0.1, 0.62, 2.6, 0x1a0033, 0.55); // face guard
  band(hd, 0.72, 0.05, 0.14, 1.8, rune, 0.72); // glowing visor
  hd.box(0.14, 0.45, 0.9, armor, 0, 1.45, -0.05, { r: 0.04 }); // crest
  for (const s of [-1, 1]) hd.cyl(0.14, 0.2, armor, s * 0.74, 0.65, 0, { axis: 'x', seg: 10 });
  hd.done();
  const t = wear(h, h.torso, 'vt:torso');
  t.box(1.7, 1.3, 0.24, armor, 0, 0.2, 0.58, { r: 0.06 });
  t.box(1.7, 1.4, 0.22, tone(armor, 0.85), 0, 0.12, -0.58, { r: 0.06 });
  t.box(2.12, 0.62, 1.16, tone(armor, 0.8), 0, -0.4, 0, { r: 0.05 });
  t.cyl(0.22, 0.1, rune, 0, 0.42, 0.72, { axis: 'z', seg: 12 }); // void core
  t.torus(0.26, 0.04, 0x1a0033, 0, 0.42, 0.72, { seg: 14 });
  for (const s of [-1, 1]) t.box(0.05, 0.6, 0.04, rune, s * 0.55, 0.25, 0.71);
  for (let i = 0; i < 3; i++) pouch(t, (i - 1) * 0.5, -0.35, 0.66, 0.4, 0.42, 0x1a0033, 0.2);
  for (const s of [-1, 1]) {
    t.box(0.9, 0.5, 1.3, armor, s * 1.35, 1.0, 0, { r: 0.08 }); // shoulder plates
    t.box(0.92, 0.06, 1.32, rune, s * 1.35, 0.8, 0);
  }
  t.box(1.2, 1.3, 0.45, 0x1a0033, 0, 0.1, -0.9, { r: 0.08 }); // void pack
  for (const s of [-1, 1]) t.cyl(0.13, 0.9, rune, s * 0.4, 0.15, -1.15, { seg: 10 }); // its glowing cells
  belt(t, INK, 0x6a1b9a);
  t.done();
  for (const leg of [h.rightLeg, h.leftLeg]) {
    const k = wear(h, leg, 'vt:leg');
    boots(k, 0x12001f, { sole: 0x050505 });
    kneePad(k, armor);
    k.done();
  }
  for (const [arm, s] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    const a = wear(h, arm, `vt:arm${s}`);
    glove(a, 0x12001f);
    a.box(1.06, 0.5, 1.06, armor, 0, -1.25, 0, { r: 0.05 }); // forearm guard
    a.box(0.05, 0.36, 0.2, rune, s * 0.54, -1.25, 0);
    a.done();
  }
  const g = fist(h.rightArm, -1.9, 1.2);
  const gk = wear(h, g, 'vt:gun');
  const [y, z] = rifle(gk, { len: 2.1, body: 0x1a0033, furn: 0x311b92, mag: false, optic: 'dot', lens: 0xff80ff, glow: rune });
  gk.cyl(0.18, 0.5, 0x311b92, 0, -0.6, UP - 0.45, { seg: 10 }); // void cell under the gun
  gk.cyl(0.12, 0.52, rune, 0, -0.6, UP - 0.45, { seg: 10 });
  gk.done();
  h.muzzles = [];
  muzzle(h, g, y, z);
  aimLong(h);
  h.tracer = VOID;
  h.size = 0.85;
  return own(h);
}

export const SUMMONS = {
  skel,
  skelsword: (count) => skelsword(count, false),
  skelsword2: (count) => skelsword(count, true),
  skelknight,
  skelhallow,
  skelexec,
  voidneuron: () => squad(1, voidNeuron),
  voidempress: () => squad(1, voidEmpress),
  vtsupport: (count) => squad(count, vtSupporter),
};
