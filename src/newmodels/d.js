import * as THREE from 'three';
import {
  boxGeo,
  part,
  makeHumanoid,
  makeThing,
  glow,
  glowThing,
  holdLongGun,
  setMuzzle,
  gunMuzzle,
  wheels,
  present,
  pumpkin,
  boxRow,
} from '../models.js';

// New towers and units (set D). Every helper from models.js is only called inside functions
// (models.js imports this file, so the imports are not ready at module load time).

/* ------------------------------------------------------------------ helpers */

/** A see-through material that keeps its see-through look (setOpacity respects keepOpacity). */
function iceMat(u, color, op = 0.8) {
  const m = u.M(color);
  m.transparent = true;
  m.opacity = op;
  m.depthWrite = false;
  m.userData.keepOpacity = op;
  return m;
}

/** Humanoid units as a squad (same layout as makeUnit's squads). */
function squad(u, count, mk) {
  u.soldiers = [];
  for (let i = 0; i < count; i++) {
    const h = mk(i);
    h.root.scale.setScalar(0.6 * (h.size ?? 1));
    h.root.position.set(count === 1 ? 0 : (i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
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

function newUnit() {
  const u = makeThing();
  u.wheels = [];
  return u;
}

/* ------------------------------------------------------------------ towers */

/**
 * Ghostbuster (0-5): a ghost hunter in an orange jumpsuit with a chunky green plasma pack and a
 * beam wand. Lv 1 goggles, Lv 2 a bigger pack with an antenna, Lv 3 a ghost trap on the belt,
 * Lv 4 shoulder emitters and a yellow-hot beam, Lv 5 a gold pack with big glowing tanks.
 */
function ghostbuster(level) {
  const beam = [0x76ff03, 0x76ff03, 0x9cff57, 0xc6ff00, 0xeeff41, 0xffea00][level];
  const h = makeHumanoid({ skin: 0xd7a17b, shirt: 0xef6c00, pants: 0xe65100, arms: 0xef6c00 });
  const { M } = h;
  const plasma = glow(h, beam);
  const packC = level >= 5 ? M(0xffc107) : M(0x2e7d32);
  const metal = M(0x546e7a);
  // Jumpsuit details: belt, badge, boots
  part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.75, 0);
  part(h.torso, boxGeo(0.45, 0.45, 0.1), M(0xfafafa), 0.55, 0.45, 0.52);
  part(h.torso, boxGeo(0.3, 0.3, 0.12), plasma, 0.55, 0.45, 0.55);
  for (const leg of [h.leftLeg, h.rightLeg]) part(leg, boxGeo(1.1, 0.5, 1.15), M(0x212121), 0, -1.75, 0.05);
  // Short messy hair
  part(h.head, boxGeo(1.3, 0.35, 1.3), M(0x4e342e), 0, 1.3, -0.03);
  // Plasma pack
  const pw = 1.8 + (level >= 2 ? 0.3 : 0);
  const ph = 2.0 + (level >= 2 ? 0.4 : 0);
  part(h.torso, boxGeo(pw, ph, 1.0), packC, 0, 0.1, -1.0);
  part(h.torso, boxGeo(pw * 0.8, 0.3, 1.05), metal, 0, -0.6, -1.0);
  const cells = 2 + Math.min(level, 3);
  for (let i = 0; i < cells; i++) part(h.torso, boxGeo(0.22, ph * 0.5, 0.1), plasma, (i - (cells - 1) / 2) * 0.35, 0.3, -1.52);
  part(h.torso, boxGeo(0.6, 0.6, 0.6), metal, -pw / 2 + 0.2, -0.7, -1.0); // cyclotron cap
  part(h.torso, boxGeo(0.3, 0.3, 0.3), plasma, -pw / 2 + 0.2, -0.7, -0.68);
  // Hose from the pack to the wand
  part(h.torso, boxGeo(0.25, 0.25, 1.3), M(0x212121), -1.0, -0.7, -0.3);
  if (level >= 1) {
    // Goggles
    part(h.head, boxGeo(1.3, 0.15, 0.1), M(0x212121), 0, 0.85, 0.63);
    for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.38, 0.3, 0.1), glow(h, 0xffd740), x, 0.85, 0.68);
  }
  if (level >= 2) {
    // Antenna with a blinking tip
    part(h.torso, boxGeo(0.1, 1.6, 0.1), M(0x212121), pw / 2 - 0.2, 1.8, -1.0);
    part(h.torso, boxGeo(0.22, 0.22, 0.22), glow(h, 0xff1744), pw / 2 - 0.2, 2.65, -1.0);
  }
  if (level >= 3) {
    // Ghost trap on the belt
    part(h.torso, boxGeo(0.7, 0.4, 0.5), M(0x37474f), 1.2, -0.85, 0.3);
    part(h.torso, boxGeo(0.72, 0.08, 0.3), glow(h, 0xffd740), 1.2, -0.62, 0.3);
  }
  if (level >= 4) {
    // Shoulder emitters
    for (const x of [-1.3, 1.3]) {
      part(h.torso, boxGeo(0.7, 0.4, 1.2), metal, x, 1.05, 0);
      part(h.torso, boxGeo(0.3, 0.3, 0.1), plasma, x, 1.05, 0.62);
    }
  }
  if (level >= 5) {
    // Twin plasma tanks on top of the pack
    for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.55, 1.1, 0.55), plasma, x, ph / 2 + 0.6, -1.0);
    part(h.torso, boxGeo(1.6, 0.2, 0.7), M(0xffc107), 0, ph / 2 + 1.2, -1.0);
  }
  // Beam wand
  const len = 1.6 + level * 0.12;
  const gun = holdLongGun(h, len, M(0x37474f));
  part(gun, boxGeo(0.5, 0.6, 0.55), packC, 0, -0.3, 0);
  const rings = 1 + Math.ceil(level / 2);
  for (let i = 0; i < rings; i++) part(gun, boxGeo(0.5, 0.1, 0.55), plasma, 0, -0.8 - i * 0.3, 0);
  part(gun, boxGeo(0.4, 0.3, 0.45), plasma, 0, -len, 0);
  part(gun, boxGeo(0.15, 0.5, 0.3), M(0xfdd835), 0, -0.6, 0.35); // grip
  h.muzzles[0].position.y = -len - 0.15;
  h.beam = beam;
  h.tracer = beam;
  return h;
}

/**
 * Gift Elf (0-4): a Christmas elf in a red tunic with white fur trim, throwing presents. The gift
 * sack on its back grows every level. Lv 2 a candy cane, Lv 3 jingle bells, Lv 4 a golden glowing
 * present and a star on the hat.
 */
function giftElf(level) {
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: 0xc62828, pants: 0x1b5e20, arms: 0xc62828 });
  const { M } = h;
  const white = M(0xfafafa);
  const green = M(0x2e7d32);
  part(h.torso, boxGeo(2.1, 0.3, 1.1), white, 0, -0.85, 0); // fur hem
  part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x212121), 0, -0.45, 0); // belt
  part(h.torso, boxGeo(0.4, 0.35, 0.1), M(0xffd54f), 0, -0.45, 0.56);
  for (const leg of [h.leftLeg, h.rightLeg]) {
    part(leg, boxGeo(1.05, 0.5, 1.4), M(0x1b5e20), 0, -1.75, 0.2); // curly shoes
    part(leg, boxGeo(0.4, 0.4, 0.3), M(0xffd54f), 0, -1.45, 0.85);
  }
  for (const x of [-0.7, 0.7]) part(h.head, boxGeo(0.15, 0.5, 0.25), M(0xf1c27d), x, 0.7, 0).rotation.z = x > 0 ? -0.5 : 0.5;
  // Floppy hat: green cone with red bands and a white bobble
  part(h.head, boxGeo(1.35, 0.3, 1.35), white, 0, 1.25, 0);
  for (let i = 0; i < 4; i++) part(h.head, boxGeo(1.0 - i * 0.2, 0.42, 1.0 - i * 0.2), i % 2 ? M(0xc62828) : green, 0.1 * i, 1.6 + i * 0.38, -0.12 * i);
  part(h.head, boxGeo(0.38, 0.38, 0.38), level >= 4 ? glow(h, 0xffd740) : white, 0.45, 3.1, -0.5);
  // Gift sack, bigger every level
  const ss = 1.1 + level * 0.3;
  part(h.torso, boxGeo(ss * 1.2, ss * 1.3, ss * 0.85), M(0x8b1a1a), 0, 0.1 + ss * 0.15, -0.6 - ss * 0.45);
  part(h.torso, boxGeo(ss * 0.6, 0.2, ss * 0.5), M(0xffd54f), 0, 0.1 + ss * 0.8, -0.6 - ss * 0.45); // tie
  const gifts = [[0x1e88e5, 0xffeb3b], [0x43a047, 0xc62828], [0xffd54f, 0xc62828], [0x8e24aa, 0xfafafa], [0xfafafa, 0x43a047]];
  for (let i = 0; i <= level; i++) {
    const [c, r] = gifts[i];
    const g = present(h, h.torso, c, r, 0.45 + level * 0.04);
    g.position.set((i - level / 2) * 0.5, 0.35 + ss * 0.95 + (i % 2) * 0.2, -0.6 - ss * 0.45);
    g.rotation.y = i * 0.5;
  }
  if (level >= 2) {
    // Candy cane on the belt
    const red = M(0xd32f2f);
    for (let i = 0; i < 4; i++) part(h.torso, boxGeo(0.2, 0.3, 0.2), i % 2 ? red : white, 1.15, -0.5 - i * 0.3, 0.3);
    part(h.torso, boxGeo(0.4, 0.2, 0.2), red, 1.0, -0.3, 0.3);
  }
  if (level >= 3) {
    // Jingle bell collar
    part(h.torso, boxGeo(2.15, 0.3, 1.15), green, 0, 0.9, 0);
    for (const x of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.25, 0.25, 0.25), glow(h, 0xffd740), x, 0.65, 0.6);
  }
  // The present in the raised right hand
  const hand = new THREE.Group();
  hand.position.set(0, -2.2, 0);
  h.rightArm.add(hand);
  const top = level >= 4;
  const p = present(h, hand, top ? 0xffc107 : 0x43a047, top ? 0xc62828 : 0xfafafa, 0.6 + level * 0.1);
  if (top) part(p, boxGeo(0.7, 0.7, 0.7), glow(h, 0xffd740), 0, 0, 0);
  setMuzzle(h, hand, 0, -0.3, 0);
  h.rightArm.rotation.set(-2.8, 0, 0.2);
  h.leftArm.rotation.set(-0.6, 0, -0.3);
  h.pose = { right: -2.8, left: -0.6, leftRecoil: 0 };
  h.swing = 1.9;
  h.projectile = top ? { color: 0xffc107, size: 0.65, arc: 5, glowing: true } : { color: 0x43a047, size: 0.5 + level * 0.03, arc: 4.5 };
  h.tracer = 0xffd740;
  return h;
}

/** Stormwing fighter: storm-grey jet with lightning stripes; bomb racks from Lv 1. */
function makeStormPlane(h, level) {
  const { M } = h;
  const plane = new THREE.Group();
  const bank = new THREE.Group();
  plane.add(bank);
  const muzzles = [];
  const missiles = [];
  const point = (x, y, z, list) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    bank.add(m);
    list.push(m);
  };
  bank.scale.setScalar(1 + level * 0.08);
  const body = M([0x78909c, 0x607d8b, 0x546e7a, 0x455a64, 0x263238][level]);
  const dark = M(0x263238);
  const bolt = glow(h, level >= 4 ? 0x80d8ff : 0xffeb3b);
  part(bank, boxGeo(1.1, 1.0, 5.8), body, 0, 0, 0);
  part(bank, boxGeo(0.6, 0.6, 1.1), dark, 0, -0.05, 3.4);
  part(bank, boxGeo(0.8, 0.45, 1.4), glow(h, 0x4fc3f7), 0, 0.6, 1.2);
  for (const side of [-1, 1]) {
    const w = part(bank, boxGeo(3.4, 0.15, 2.0), body, side * 2.0, -0.1, -0.4);
    w.rotation.y = side * 0.45;
    // Lightning zigzag along the wing
    for (let k = 0; k < 3; k++) part(bank, boxGeo(0.9, 0.05, 0.16), bolt, side * (1.0 + k * 0.8), 0.02, 0.15 - k * 0.45 + (k % 2) * 0.2).rotation.y = side * (k % 2 ? -0.7 : 0.7);
    part(bank, boxGeo(0.12, 1.2, 1.1), dark, side * 0.5, 0.8, -2.5).rotation.z = side * -0.3;
    part(bank, boxGeo(1.4, 0.12, 0.8), body, side * 1.0, 0, -2.7);
    if (level >= 1) {
      // Bomb racks
      const racks = level >= 3 ? 2 : 1;
      for (let r = 0; r < racks; r++) {
        part(bank, boxGeo(0.2, 0.15, 1.0), dark, side * (1.4 + r * 0.8), -0.25, -0.1 - r * 0.4);
        part(bank, boxGeo(0.4, 0.4, 1.0), M(0x37474f), side * (1.4 + r * 0.8), -0.55, -0.1 - r * 0.4);
        part(bank, boxGeo(0.42, 0.1, 0.2), bolt, side * (1.4 + r * 0.8), -0.55, -0.45 - r * 0.4);
      }
    }
    if (level >= 2) part(bank, boxGeo(0.2, 0.2, 1.0), glow(h, 0x80d8ff), side * 3.4, -0.1, -1.4); // tesla wingtips
    if (level >= 3) {
      part(bank, boxGeo(0.45, 0.45, 1.5), dark, side * 0.95, -0.35, 0.6); // missile pods
      part(bank, boxGeo(0.3, 0.3, 0.1), glow(h, 0xff3d00), side * 0.95, -0.35, 1.36);
      point(side * 0.95, -0.35, 1.4, missiles);
    }
  }
  // Nose lightning stripe
  part(bank, boxGeo(1.12, 0.12, 0.9), bolt, 0, 0.1, 2.2).rotation.y = 0.5;
  const engines = level >= 3 ? [-0.35, 0.35] : [0];
  for (const x of engines) part(bank, boxGeo(engines.length > 1 ? 0.5 : 0.75, 0.6, 0.3), glow(h, 0x40c4ff), x, 0, -3.0);
  if (level >= 4) {
    // Storm core on the spine with a crackling crown
    part(bank, boxGeo(0.7, 0.6, 1.6), glow(h, 0x80d8ff), 0, 0.75, -0.9);
    for (const z of [-1.4, -0.9, -0.4]) part(bank, boxGeo(0.08, 0.6, 0.08), bolt, 0, 1.25, z);
  }
  point(-0.6, -0.2, 2.6, muzzles);
  point(0.6, -0.2, 2.6, muzzles);
  const bay = new THREE.Object3D();
  bay.position.set(0, -0.8, 0);
  bank.add(bay);
  plane.userData = { bank, prop: null, bay, missiles };
  return { plane, muzzles };
}

/** Stormwing (0-4): a storm pilot on a runway pad, plus the storm fighter flying circles. */
function stormwing(level) {
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: 0x455a64, pants: 0x37474f, arms: 0x455a64 });
  const { M } = h;
  const bolt = level >= 4 ? 0x80d8ff : 0xffeb3b;
  part(h.head, boxGeo(1.45, 1.4, 1.45), M(0x607d8b), 0, 0.65, -0.03); // flight helmet
  part(h.head, boxGeo(1.2, 0.45, 0.08), glow(h, bolt), 0, 0.7, 0.7); // visor
  part(h.head, boxGeo(0.2, 0.7, 0.2), glow(h, bolt), 0, 1.35, 0).rotation.z = 0.5; // bolt crest
  part(h.torso, boxGeo(0.25, 1.0, 0.1), glow(h, bolt), -0.5, 0.2, 0.52).rotation.z = 0.4; // bolt patch
  if (level >= 1) part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x212121), 0, -0.7, 0);
  if (level >= 2) part(h.head, boxGeo(0.08, 0.9, 0.08), M(0x212121), -0.7, 1.6, -0.2);
  if (level >= 3) for (const x of [-1.4, 1.4]) part(h.torso, boxGeo(0.8, 0.4, 1.2), M(0x263238), x, 1.0, 0);
  // Runway pad with stripes, and a bomb cart from Lv 1
  part(h.root, boxGeo(3.8, 0.08, 1.1), M(0x37474f), 0, 0.04, -1.6);
  for (const x of [-1.2, 0, 1.2]) part(h.root, boxGeo(0.6, 0.1, 0.2), glow(h, bolt), x, 0.06, -1.6);
  if (level >= 1) {
    part(h.root, boxGeo(1.6, 0.5, 1.0), M(0x455a64), 1.9, 0.25, 0.8);
    for (const z of [0.55, 1.05]) part(h.root, boxGeo(1.2, 0.45, 0.45), M(0x263238), 1.9, 0.7, z);
  }
  h.rightArm.rotation.set(Math.PI * 0.85, 0, 0.25);
  h.pose = { right: Math.PI * 0.85, left: 0, leftRecoil: 0 };
  const { plane, muzzles } = makeStormPlane(h, level);
  h.plane = plane;
  h.muzzles = muzzles;
  h.flyHeight = 13;
  h.tracer = bolt;
  return h;
}

/**
 * Punkbuster (0-4): a pumpkin-headed punk brawler on a little stage, purple mohawk, spiked black
 * jacket and a chunky launcher. Lv 1 speakers, Lv 2 spiked bracers and a chain, Lv 3 a glowing
 * launcher, Lv 4 an amp wall, green pumpkin flames and a spiked crown.
 */
function punkbuster(level) {
  const h = makeHumanoid({ skin: 0x4e342e, shirt: 0x1a1a1a, pants: 0x4a148c, arms: 0x1a1a1a });
  const { M } = h;
  const orange = M(0xff6d00);
  const purple = level >= 3 ? glow(h, 0xd500f9) : M(0x8e24aa);
  const silver = M(0xcfd8dc);
  const flame = level >= 4 ? 0x76ff03 : 0xffab00;
  // Stage
  part(h.root, boxGeo(4.2, 0.5, 3.0), M(0x212121), 0, 0.25, -0.2);
  part(h.root, boxGeo(4.25, 0.12, 0.1), glow(h, 0xff6d00), 0, 0.4, 1.31);
  for (const x of [-1.4, 0, 1.4]) part(h.root, boxGeo(0.3, 0.12, 0.12), glow(h, 0xd500f9), x, 0.25, 1.31);
  h.body.position.y = 0.5;
  h.lift = 0.5;
  h.bob = 0.04;
  // Pumpkin head with a mohawk
  const pk = pumpkin(h, h.head, 1.5, flame);
  pk.position.set(0, 0.6, 0);
  const spikes = 4 + level;
  for (let i = 0; i < spikes; i++) part(h.head, boxGeo(0.2, 0.5 + (i % 2) * 0.2 + level * 0.06, 0.3), purple, 0, 1.55, 0.55 - (i * 1.2) / spikes);
  // Spiked jacket
  part(h.torso, boxGeo(2.1, 2.05, 1.1), M(0x111111), 0, 0, 0);
  part(h.torso, boxGeo(0.7, 1.6, 0.1), M(0x6a1b9a), 0, -0.1, 0.56); // shirt underneath
  part(h.torso, boxGeo(0.4, 0.4, 0.06), orange, 0, 0.1, 0.62); // pumpkin patch
  for (const x of [-1, 1]) for (let k = 0; k < 3; k++) part(h.torso, boxGeo(0.15, 0.35, 0.15), silver, x * (0.65 + k * 0.2), 1.15, 0);
  part(h.torso, boxGeo(2.1, 0.25, 1.15), M(0x5d4037), 0, -0.8, 0); // studded belt
  for (const x of [-0.6, -0.2, 0.2, 0.6]) part(h.torso, boxGeo(0.12, 0.12, 0.06), silver, x, -0.8, 0.6);
  for (const leg of [h.leftLeg, h.rightLeg]) part(leg, boxGeo(1.1, 0.7, 1.2), M(0x212121), 0, -1.65, 0.05); // boots
  if (level >= 1) {
    // Speaker stacks
    for (const x of [-1.8, 1.8]) {
      part(h.root, boxGeo(0.9, 1.4, 0.8), M(0x1a1a1a), x, 1.2, -1.1);
      for (const y of [0.85, 1.55]) part(h.root, boxGeo(0.5, 0.5, 0.06), M(0x424242), x, y, -0.68);
    }
  }
  if (level >= 2) {
    // Spiked bracers and a wallet chain
    for (const arm of [h.leftArm, h.rightArm]) {
      part(arm, boxGeo(1.15, 0.6, 1.15), M(0x212121), 0, -1.4, 0);
      for (const x of [-0.6, 0.6]) part(arm, boxGeo(0.25, 0.15, 0.15), silver, x, -1.4, 0);
    }
    for (let k = 0; k < 4; k++) part(h.torso, boxGeo(0.12, 0.12, 0.12), silver, 0.9 - k * 0.12, -1.0 - (k % 2) * 0.1, 0.56);
  }
  if (level >= 4) {
    // Amp wall and a spiked crown of flames
    part(h.root, boxGeo(3.8, 1.8, 0.7), M(0x1a1a1a), 0, 1.4, -1.6);
    boxRow(h.root, 4, 0.9, boxGeo(0.6, 0.6, 0.06), glow(h, 0xd500f9), 1.4, -1.23);
    for (let i = 0; i < 5; i++) part(h.head, boxGeo(0.22, 0.45, 0.22), glow(h, flame), (i - 2) * 0.32, 1.45, 0.55);
  }
  // Launcher (fires summons)
  const len = 1.7 + level * 0.15;
  const gun = holdLongGun(h, len, M(0x37474f));
  part(gun, boxGeo(0.7, len * 0.7, 0.75), orange, 0, -len * 0.55, 0); // drum tube
  part(gun, boxGeo(0.8, 0.15, 0.85), purple, 0, -len + 0.1, 0);
  part(gun, boxGeo(0.25, 0.5, 0.3), M(0x212121), 0, -0.4, 0.45); // grip
  if (level >= 3) part(gun, boxGeo(0.5, 0.5, 0.5), glow(h, flame), 0, -len - 0.05, 0);
  h.muzzles[0].position.y = -len - 0.2;
  h.tracer = level >= 3 ? 0xd500f9 : 0xff6d00;
  h.projectile = { color: level >= 4 ? 0x76ff03 : 0xff6d00, size: 0.55 + level * 0.04, arc: 4, ...(level >= 3 ? { glowing: true } : {}) };
  return h;
}

/* ------------------------------------------------------------------ flying units */

// The Jet Trooper's planes and the Borealis frost planes are built with the vehicle kit (airunits.js).

function jpara(count = 1) {
  // Paratroopers: soldiers in jump gear with a packed chute and a rifle.
  const u = newUnit();
  return squad(u, count, () => {
    const h = makeHumanoid({ skin: 0xe0ac69, shirt: 0x556b2f, pants: 0x4b5a30, arms: 0x556b2f, face: 'soldier' });
    const { M } = h;
    part(h.head, boxGeo(1.45, 0.6, 1.45), M(0x4b5320), 0, 1.3, 0);
    part(h.head, boxGeo(1.3, 0.1, 0.1), M(0x212121), 0, 1.0, 0.66); // chin strap line
    part(h.torso, boxGeo(1.7, 1.6, 0.8), M(0x8d7b5a), 0, 0.1, -0.9); // chute pack
    part(h.torso, boxGeo(1.75, 0.2, 0.85), M(0x3e2723), 0, 0.5, -0.9);
    for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.2, 2.0, 0.1), M(0x3e2723), x, 0, 0.52); // harness
    holdLongGun(h, 1.8, M(0x2b2b2b));
    h.tracer = 0xffc107;
    return h;
  });
}

/* ------------------------------------------------------------------ punk units */

function punk(shirt, hair) {
  const h = makeHumanoid({ skin: 0xf1c27d, shirt, pants: 0x263238, arms: shirt });
  const { M } = h;
  for (let i = 0; i < 4; i++) part(h.head, boxGeo(0.22, 0.6, 0.3), M(hair), 0, 1.45, 0.45 - i * 0.32); // mohawk
  for (const x of [-1, 1]) part(h.torso, boxGeo(0.15, 0.3, 0.15), M(0xcfd8dc), x * 0.8, 1.1, 0); // spikes
  for (const leg of [h.leftLeg, h.rightLeg]) part(leg, boxGeo(1.1, 0.6, 1.15), M(0x111111), 0, -1.7, 0.05);
  return h;
}

function pfragger(count = 1) {
  const u = newUnit();
  return squad(u, count, () => {
    const h = punk(0x1a1a1a, 0x76ff03);
    const { M } = h;
    part(h.torso, boxGeo(2.1, 0.25, 1.1), M(0x4e5b31), 0, 0.3, 0).rotation.z = 0.5; // grenade bandolier
    const hand = new THREE.Group();
    hand.position.set(0, -2.2, 0);
    h.rightArm.add(hand);
    part(hand, boxGeo(0.55, 0.65, 0.55), M(0x33691e), 0, -0.2, 0);
    part(hand, boxGeo(0.15, 0.2, 0.15), glow(h, 0xff3d00), 0, 0.2, 0);
    setMuzzle(h, hand, 0, -0.3, 0);
    h.rightArm.rotation.set(-2.6, 0, 0.2);
    h.tracer = 0xffab40;
    h.projectile = { color: 0x33691e, size: 0.45, arc: 4 };
    return h;
  });
}

function pboogie(count = 1) {
  // Boogeyman: a tall shadowy figure in a ragged cloak with long claws and glowing eyes.
  const u = newUnit();
  return squad(u, count, () => {
    const h = makeHumanoid({ skin: 0x1a1a24, shirt: 0x12121a, pants: 0x12121a, arms: 0x12121a, face: 'void' });
    const { M } = h;
    h.size = 1.25;
    part(h.torso, boxGeo(2.3, 3.4, 1.3), M(0x1c1028), 0, -0.6, -0.05); // cloak
    for (const x of [-0.9, -0.3, 0.3, 0.9]) part(h.torso, boxGeo(0.4, 0.5, 1.3), M(0x1c1028), x, -2.5 + (x > 0 ? 0.2 : 0), -0.05); // ragged hem
    part(h.head, boxGeo(1.5, 1.5, 1.5), M(0x1c1028), 0, 0.75, -0.15); // hood
    for (const x of [-0.25, 0.25]) part(h.head, boxGeo(0.25, 0.15, 0.08), glow(h, 0xd500f9), x, 0.7, 0.62);
    for (const arm of [h.leftArm, h.rightArm]) for (const x of [-0.3, 0, 0.3]) part(arm, boxGeo(0.12, 0.8, 0.12), M(0x9e9e9e), x, -2.3, 0.3); // claws
    const m = new THREE.Object3D();
    m.position.set(0, -2.5, 0.3);
    h.rightArm.add(m);
    h.muzzles = [m];
    h.rightArm.rotation.set(-1.2, 0, 0.2);
    h.leftArm.rotation.set(-1.0, 0, -0.2);
    h.tracer = 0xd500f9;
    return h;
  });
}

function procketeer(count = 1) {
  const u = newUnit();
  return squad(u, count, () => {
    const h = punk(0x4a148c, 0xff4081);
    const { M } = h;
    // Shoulder rocket launcher
    const tube = new THREE.Group();
    tube.position.set(-1.5, 1.3, 0);
    h.torso.add(tube);
    part(tube, boxGeo(0.6, 0.6, 2.6), M(0x33691e), 0, 0, 0.2);
    part(tube, boxGeo(0.7, 0.7, 0.2), M(0x212121), 0, 0, 1.5);
    part(tube, boxGeo(0.35, 0.35, 0.1), glow(h, 0xff3d00), 0, 0, 1.6);
    part(tube, boxGeo(0.3, 0.4, 0.3), M(0x212121), 0, -0.45, 0.3);
    const m = new THREE.Object3D();
    m.position.set(0, 0, 1.7);
    tube.add(m);
    h.muzzles = [m];
    h.rightArm.rotation.set(-1.4, 0, 0);
    h.tracer = 0xff6d00;
    h.projectile = { color: 0x33691e, size: 0.4 };
    return h;
  });
}

function pnucleus(count = 1) {
  // Nucleus: a huge brute in a cracked hazmat suit with a glowing reactor in his chest.
  const u = newUnit();
  return squad(u, count, () => {
    const h = makeHumanoid({ skin: 0x9ccc65, shirt: 0xfdd835, pants: 0x827717, arms: 0x9ccc65, face: 'zombie' });
    const { M } = h;
    h.size = 1.8;
    const nuke = glow(h, 0x76ff03);
    part(h.torso, boxGeo(2.5, 2.3, 1.4), M(0xfbc02d), 0, 0.1, 0); // bulky suit
    part(h.torso, boxGeo(1.0, 1.0, 0.2), nuke, 0, 0.3, 0.75); // reactor core
    part(h.torso, boxGeo(0.4, 0.4, 0.1), M(0x212121), 0, 0.3, 0.87);
    for (const x of [-1, 1]) part(h.torso, boxGeo(0.9, 0.6, 1.5), M(0x424242), x * 1.4, 1.0, 0); // shoulder plates
    for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.5, 1.4, 0.5), nuke, x, 0.4, -0.95); // fuel rods
    part(h.head, boxGeo(0.9, 0.3, 0.1), nuke, 0, 0.75, 0.62); // glowing eyes band
    for (const arm of [h.leftArm, h.rightArm]) part(arm, boxGeo(1.3, 0.9, 1.3), M(0x424242), 0, -1.7, 0); // huge fists
    const m = new THREE.Object3D();
    m.position.set(0, -2.3, 0.2);
    h.rightArm.add(m);
    h.muzzles = [m];
    h.rightArm.rotation.set(-0.8, 0, 0.1);
    h.tracer = 0x76ff03;
    return h;
  });
}

/* ------------------------------------------------------------------ Borealis units */

function bsleigh() {
  // Sleigh: a flying red-and-gold sleigh pulled by two blocky reindeer, gift pile on the back.
  const u = newUnit();
  const { M } = u;
  const g = u.body;
  const red = M(0xc62828);
  const gold = M(0xffc107);
  part(g, boxGeo(2.2, 1.2, 3.2), red, 0, 0.6, -1.0);
  part(g, boxGeo(2.2, 1.0, 0.6), red, 0, 1.0, 0.7); // curled front
  part(g, boxGeo(2.3, 0.15, 3.3), gold, 0, 1.25, -1.0);
  for (const x of [-1.0, 1.0]) {
    part(g, boxGeo(0.15, 0.15, 4.0), glowThing(u, 0x80d8ff), x, -0.2, -0.6); // glowing runners
    part(g, boxGeo(0.15, 0.5, 0.15), gold, x, 0.1, 1.2);
  }
  part(g, boxGeo(1.6, 0.8, 1.2), M(0x1b5e20), 0, 1.6, -1.6); // gift pile
  part(g, boxGeo(0.7, 0.7, 0.7), M(0x1e88e5), -0.4, 2.2, -1.4);
  part(g, boxGeo(0.6, 0.6, 0.6), M(0xffd740), 0.45, 2.1, -1.8);
  // Reindeer
  for (const x of [-0.7, 0.7]) {
    const b = M(0x795548);
    part(g, boxGeo(0.7, 0.8, 1.8), b, x, 0.8, 3.0);
    for (const dz of [-0.6, 0.6]) part(g, boxGeo(0.2, 0.7, 0.2), b, x, 0.1, 3.0 + dz);
    part(g, boxGeo(0.5, 0.5, 0.7), b, x, 1.4, 4.0);
    part(g, boxGeo(0.18, 0.18, 0.1), glowThing(u, 0xff1744), x, 1.35, 4.38); // red nose
    part(g, boxGeo(0.6, 0.5, 0.08), M(0xd7ccc8), x, 1.9, 3.9); // antlers
    part(g, boxGeo(0.06, 0.06, 1.6), gold, x, 0.9, 1.6); // reins
  }
  gunMuzzle(u, g, 0, 1.0, 1.1);
  u.height = 2.6;
  u.fly = 9;
  u.noTurn = true; // aircraft fly straight on; they don't swing round to shoot (views.js)
  u.tracer = 0xffd740;
  u.projectile = { color: 0xc62828, size: 0.5 };
  return u;
}

function bfortress() {
  // Ice Fortress: a floating castle of ice on a hover base, with crystal cannons.
  const u = newUnit();
  const { M } = u;
  const g = u.body;
  const ice = iceMat(u, 0x81d4fa, 0.9);
  const wall = M(0xb3e5fc);
  const aurora = glowThing(u, 0x69f0ae);
  const violet = glowThing(u, 0xb388ff);
  part(g, boxGeo(5, 1.2, 5), ice, 0, 0, 0); // floating base
  part(g, boxGeo(3.4, 1.0, 3.4), ice, 0, -1.0, 0);
  part(g, boxGeo(1.6, 1.0, 1.6), violet, 0, -1.8, 0); // hover crystal
  part(g, boxGeo(4.4, 1.6, 4.4), wall, 0, 1.4, 0);
  for (const [x, z] of [[-2.1, -2.1], [2.1, -2.1], [-2.1, 2.1], [2.1, 2.1]]) {
    part(g, boxGeo(1.1, 3.2, 1.1), wall, x, 2.0, z);
    part(g, boxGeo(1.3, 0.3, 1.3), M(0xe1f5fe), x, 3.7, z);
    part(g, boxGeo(0.4, 0.4, 0.4), aurora, x, 4.1, z);
  }
  part(g, boxGeo(2.2, 2.6, 2.2), wall, 0, 3.4, 0); // keep
  part(g, boxGeo(0.8, 2.4, 0.8), violet, 0, 5.8, 0).rotation.y = Math.PI / 4;
  part(g, boxGeo(4.5, 0.2, 0.1), aurora, 0, 1.6, 2.21);
  // Crystal cannons on the front
  for (const x of [-1.1, 1.1]) {
    part(g, boxGeo(0.5, 0.5, 1.8), M(0x0288d1), x, 1.4, 2.8);
    part(g, boxGeo(0.35, 0.35, 0.2), aurora, x, 1.4, 3.75);
    gunMuzzle(u, g, x, 1.4, 3.9);
  }
  u.height = 6;
  u.fly = 12;
  u.noTurn = true; // aircraft fly straight on; they don't swing round to shoot (views.js)
  u.tracer = 0x69f0ae;
  u.tracerWidth = 0.35;
  return u;
}

/* ------------------------------------------------------------------ exports */

export const TOWER_MODELS_D = { ghostbuster, giftElf, stormwing, punkbuster };

export const UNIT_MODELS_D = {
  jpara,
  pfragger,
  pboogie,
  procketeer,
  pnucleus,
  bsleigh,
  bfortress,
};
