// Enemy looks for Expert, and the big machines: Orion parts, the truck, the carrier tank and the MK-11.

import * as THREE from 'three';
import { boxGeo, part, setOpacity } from './kit.js';
import { creature, cylGeo, cylGeoX, glow } from './bits.js';

// ---------------------------------------------------------------- Expert mode (2026-11-09 spec)
const X_GEO = new Map();
const xGeo = (key, make) => {
  let g = X_GEO.get(key);
  if (!g) X_GEO.set(key, (g = make()));
  return g;
};

/**
 * Expert mode outfits (def.xlook): cracked grey figures with colored heads and arms, see-through
 * Vio ghosts, bots, Time beings, the Rebirther, Doomelist, Death Angel and the Beholder.
 */
export function expertParts(h, def) {
  const { M } = h;
  const crackM = M(0x3a3a3a);
  // See-through material (humanoid M only takes a color).
  const clear = (color, opacity) => {
    const m = M(color);
    m.transparent = true;
    m.opacity = opacity;
    m.depthWrite = false;
    m.userData.keepOpacity = opacity;
    return m;
  };
  const limbs = [h.leftArm, h.rightArm, h.leftLeg, h.rightLeg];
  // Dark cracks across the stone-grey body.
  const cracks = (m = crackM) => {
    for (const [x, y, w, hh] of [[-0.5, 0.3, 0.1, 1.1], [0.2, -0.2, 0.9, 0.1], [0.6, 0.5, 0.1, 0.6], [-0.2, -0.6, 0.6, 0.1]]) part(h.torso, boxGeo(w, hh, 0.06), m, x, y, 0.53);
    for (const leg of [h.leftLeg, h.rightLeg]) {
      part(leg, boxGeo(0.08, 0.8, 1.03), m, 0.25, -0.9, 0);
      part(leg, boxGeo(1.03, 0.08, 0.5), m, 0, -1.5, 0.2);
    }
  };
  // Hides an arm's own box and gives it a floating glowing hand instead.
  const floatHand = (arm, m, s = 0.8) => {
    arm.children[0].visible = false;
    part(arm, boxGeo(s, s, s), m, 0, -2.1, 0);
  };
  const bigArm = (arm, m, s = 1.6) => part(arm, boxGeo(s, 2.6, s), m, 0, -1.3, 0);
  const glowHead = (m, s = 1.3) => part(h.head, boxGeo(s, s, s), m, 0, 0.6, 0);
  const hood = (m) => {
    part(h.head, boxGeo(1.45, 1.45, 1.35), m, 0, 0.7, -0.12);
    part(h.head, boxGeo(1.6, 0.4, 1.5), m, 0, 0.02, -0.1); // hood rim on the shoulders
  };
  const robe = (m, len = 2.4) => {
    h.leftLeg.visible = h.rightLeg.visible = false;
    part(h.torso, boxGeo(2.0, len, 1.1), m, 0, -1 - len / 2 + 0.2, 0);
  };
  const scarf = (m) => {
    part(h.torso, boxGeo(2.1, 0.45, 1.15), m, 0, 0.85, 0);
    part(h.torso, boxGeo(0.45, 1.2, 0.1), m, 0.5, 0.1, 0.58);
  };
  const plates = (m, trim) => {
    part(h.torso, boxGeo(2.3, 1.8, 1.25), m, 0, 0.1, 0);
    for (const x of [-1.35, 1.35]) part(h.torso, boxGeo(1.0, 0.6, 1.3), m, x, 1.05, 0);
    for (const limb of limbs) part(limb, boxGeo(1.15, 0.9, 1.15), m, 0, -1.4, 0);
    if (trim) {
      for (const y of [0.6, -0.4]) part(h.torso, boxGeo(2.32, 0.08, 1.27), trim, 0, y, 0);
      for (const limb of limbs) part(limb, boxGeo(1.17, 0.08, 1.17), trim, 0, -1.1, 0);
    }
  };
  const antenna = (m, tip) => {
    part(h.head, boxGeo(0.12, 0.7, 0.12), m, 0.4, 1.5, 0);
    part(h.head, boxGeo(0.25, 0.25, 0.25), tip, 0.4, 1.9, 0);
  };
  const ring = (parent, r, tube, m, y, z = 0, rx = 0) => {
    const mesh = part(parent, xGeo(`torus${r}|${tube}`, () => new THREE.TorusGeometry(r, tube, 8, 24)), m, 0, y, z);
    mesh.rotation.x = rx;
    return mesh;
  };
  switch (def.xlook) {
    case 'cracked':
      cracks();
      break;
    case 'trampled':
      cracks();
      for (const x of [-1.3, 1.3]) part(h.torso, boxGeo(1.0, 0.7, 1.3), M(def.skin), x, 1.0, 0); // bulky shoulders
      part(h.torso, boxGeo(2.2, 1.4, 1.2), M(0x6e6e6e), 0, -0.2, 0);
      break;
    case 'noticeable': {
      // Almost invisible: a faint outline with a purple shimmer.
      const g = glow(h, 0xb388ff);
      g.emissiveIntensity = 0.5;
      for (const y of [-0.95, 0.95]) part(h.torso, boxGeo(2.04, 0.06, 1.04), g, 0, y, 0);
      for (const limb of limbs) part(limb, boxGeo(1.04, 0.06, 1.04), g, 0, -1.95, 0);
      break;
    }
    case 'limbed':
      cracks();
      bigArm(h.rightArm, M(def.skin));
      bigArm(h.leftArm, M(def.skin));
      break;
    case 'charger': {
      // Black body, a glowing head and floating glowing hands (Charger, Vio Rusher).
      const g = glow(h, def.glowC);
      glowHead(g);
      floatHand(h.rightArm, g);
      floatHand(h.leftArm, g);
      break;
    }
    case 'vio':
      break; // a see-through ghostly figure (see the end)
    case 'overcharged':
    case 'undercharged': {
      cracks();
      const g = glow(h, def.glowC);
      glowHead(g);
      if (def.xlook === 'overcharged') {
        bigArm(h.rightArm, g, 1.4);
        bigArm(h.leftArm, g, 1.4);
        const spark = glow(h, 0xaa00ff);
        for (const [x, y, z] of [[-1.3, 1.4, 0.6], [1.4, 0.2, -0.5], [0.3, 1.6, 0.7], [-0.9, -0.6, 0.7]]) part(h.torso, boxGeo(0.22, 0.22, 0.22), spark, x, y, z);
      } else {
        // One big glowing hand.
        part(h.rightArm, boxGeo(1.8, 1.8, 1.8), g, 0, -2.3, 0);
      }
      break;
    }
    case 'cloaker':
    case 'bot': {
      const metal = M(0x757575);
      antenna(metal, glow(h, def.glowC));
      part(h.torso, boxGeo(1.0, 0.8, 0.08), M(0x424242), 0, 0.2, 0.52);
      part(h.torso, boxGeo(0.25, 0.25, 0.06), glow(h, def.glowC), -0.2, 0.3, 0.57);
      if (def.xlook === 'cloaker') {
        const bubble = clear(0xb3e5fc, 0.25);
        part(h.body, xGeo('bubble', () => new THREE.SphereGeometry(3.6, 16, 12)), bubble, 0, 3, 0);
      }
      break;
    }
    case 'armoured':
    case 'shieldBot': {
      const purple = def.xlook === 'shieldBot';
      plates(M(def.shirt), glow(h, 0xff1744));
      part(h.head, boxGeo(1.4, 0.5, 1.4), M(def.shirt), 0, 1.3, 0);
      if (purple) {
        // A purple overlay and a big purple shield.
        const pg = glow(h, 0xb388ff);
        pg.emissiveIntensity = 0.5;
        part(h.leftArm, boxGeo(0.25, 3.2, 2.6), pg, 0.8, -1.5, 0);
        for (const y of [0.9, -0.9]) part(h.torso, boxGeo(2.4, 0.1, 1.35), pg, 0, y, 0);
      }
      break;
    }
    case 'flagBot': {
      const yellow = M(0xfdd835);
      plates(M(def.shirt), null);
      for (const y of [0.7, 0.1, -0.5]) part(h.torso, boxGeo(2.32, 0.18, 1.27), yellow, 0, y, 0);
      glowHead(glow(h, 0xff1744), 1.25);
      // The big red-and-white glowing ring on its back.
      ring(h.torso, 2.6, 0.25, glow(h, 0xff1744), 1.2, -1.1);
      ring(h.torso, 2.1, 0.15, glow(h, 0xffffff), 1.2, -1.15);
      break;
    }
    case 'vioGunner': {
      const armor = M(0x9e9e9e);
      part(h.torso, boxGeo(2.15, 0.9, 1.15), armor, 0, 0.4, 0);
      for (const x of [-1.25, 1.25]) part(h.torso, boxGeo(0.9, 0.5, 1.2), armor, x, 1.05, 0);
      part(h.head, boxGeo(1.3, 0.35, 1.3), M(0xd1b3ff), 0, 1.25, 0);
      // The purple arm cannon.
      const purple = M(0x7b1fa2);
      part(h.rightArm, boxGeo(1.3, 2.6, 1.3), purple, 0, -1.8, 0);
      part(h.rightArm, boxGeo(0.8, 0.3, 0.8), glow(h, 0xd500f9), 0, -3.2, 0);
      break;
    }
    case 'rusher':
      part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x1565c0), 0, 0.8, 0);
      break;
    case 'scarlet':
    case 'rebirther': {
      // Hooded cultists: a hood, a purple scarf and a robe (Scarlet: grey with a yellow stripe).
      const reb = def.xlook === 'rebirther';
      hood(M(reb ? 0x4a148c : 0x616161));
      scarf(M(reb ? 0x6a1b9a : 0x7b1fa2));
      robe(M(reb ? 0x1a1a1a : 0x757575));
      part(h.torso, boxGeo(0.3, 3.4, 0.08), M(reb ? 0x7b1fa2 : 0xfdd835), 0, -0.9, 0.62); // stripe down the robe
      if (reb) for (const arm of [h.leftArm, h.rightArm]) part(arm, boxGeo(1.08, 0.7, 1.08), M(0x8e24aa), 0, -1.75, 0); // purple gloves
      else for (const arm of [h.leftArm, h.rightArm]) part(arm, boxGeo(1.05, 1.0, 1.05), M(0x757575), 0, -0.6, 0); // grey sleeves
      break;
    }
    case 'timeRunner':
    case 'timeShard':
    case 'timeShardBare': {
      // Glowing pure-white figures with a faint purple aura (Time Shards: a thin purple collar).
      const white = glow(h, 0xffffff);
      white.emissiveIntensity = 0.6;
      part(h.torso, boxGeo(2.04, 2.04, 1.04), white, 0, 0, 0);
      if (def.xlook === 'timeRunner') {
        const aura = clear(def.glowC, 0.18);
        part(h.torso, boxGeo(2.8, 2.8, 1.8), aura, 0, 0, 0);
      } else {
        ring(h.head, 0.8, 0.08, glow(h, 0xb388ff), 0.05, 0, Math.PI / 2);
        if (def.xlook === 'timeShard') {
          const shield = clear(0xb388ff, 0.3);
          part(h.body, xGeo('shardBubble', () => new THREE.SphereGeometry(3.2, 14, 10)), shield, 0, 3, 0);
        }
      }
      break;
    }
    case 'timeTitan': {
      // Lightning lines over a huge dark navy body, and a bright white glow.
      const bolt = glow(h, def.glowC);
      for (const [x, y, w, hh, r] of [[-0.4, 0.4, 0.12, 1.3, 0.4], [0.4, -0.2, 0.12, 1.2, -0.5], [0.1, 0.7, 0.9, 0.12, 0.2]]) part(h.torso, boxGeo(w, hh, 0.06), bolt, x, y, 0.53).rotation.z = r;
      for (const limb of limbs) part(limb, boxGeo(0.12, 1.4, 1.03), bolt, 0.2, -1.0, 0).rotation.x = 0.3;
      const white = glow(h, 0xffffff);
      part(h.head, boxGeo(0.9, 0.2, 0.06), white, 0, 0.7, 0.62);
      break;
    }
    case 'doomelist': {
      // Stained red-and-white outfit, a big round red-rimmed rocket launcher on its shoulder.
      const red = M(0xc62828);
      for (const [x, y, w, hh] of [[-0.5, 0.4, 0.7, 0.5], [0.4, -0.4, 0.5, 0.7], [0.6, 0.6, 0.4, 0.3]]) part(h.torso, boxGeo(w, hh, 0.06), red, x, y, 0.53);
      part(h.torso, cylGeoX(0.9, 0.9, 4.2, 14), M(0x424242), -1.4, 1.6, 0); // along Z: pointing forward
      ring(h.torso, 0.95, 0.18, M(0xd50000), 1.6, 2.1).position.x = -1.4;
      part(h.torso, boxGeo(0.5, 0.5, 0.5), glow(h, 0xff3d00), -1.4, 1.6, 2.15); // the rocket tip
      break;
    }
    case 'deathAngel': {
      // White hair, a blood-stained pale outfit, dark red tendril wings dotted with red eye-rings.
      const blood = M(0x8e0000);
      part(h.head, boxGeo(1.35, 0.5, 1.35), M(0xfafafa), 0, 1.3, -0.05);
      part(h.head, boxGeo(1.35, 1.3, 0.3), M(0xfafafa), 0, 0.5, -0.6);
      for (const [x, y, w, hh] of [[-0.4, 0.2, 0.6, 0.8], [0.5, -0.5, 0.5, 0.5]]) part(h.torso, boxGeo(w, hh, 0.06), blood, x, y, 0.53);
      const eye = glow(h, 0xff1744);
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const t = part(h.torso, boxGeo(0.35, 3.4 - i * 0.6, 0.3), M(0x4a0000), side * (1.2 + i * 0.7), 1.6 - i * 0.2, -0.8);
          t.rotation.z = -side * (0.5 + i * 0.3);
          ring(h.torso, 0.25, 0.07, eye, 2.2 - i * 0.6, -0.95).position.x = side * (1.5 + i * 0.9);
        }
      }
      // Its staff (always carried; drawn = it attacks).
      part(h.rightArm, boxGeo(0.25, 0.25, 5), M(0x3e2723), 0, -2.0, 1.2);
      part(h.rightArm, boxGeo(0.6, 0.6, 0.6), eye, 0, -2.0, 3.8);
      break;
    }
    case 'beholder': {
      // Time itself: a tall hooded figure in a long grey coat, a black faceless hood.
      hood(M(0x111111));
      robe(M(0x757575), 3.2);
      part(h.torso, boxGeo(2.15, 2.1, 1.15), M(0x8a8a8a), 0, 0, 0);
      part(h.torso, boxGeo(0.12, 4.6, 0.08), M(0x424242), 0, -1.2, 0.62); // coat seam
      break;
    }
  }
  if (def.xlook === 'vio') setOpacity(h, 0.5);
}

/** Expert Viorb: a big glowing magenta-purple orb hovering in place. */
export function makeViorbModel(def) {
  const h = creature();
  const core = new THREE.Group();
  core.position.y = 2.6;
  h.body.add(core);
  const g = glow(h, 0xd500f9);
  const orb = part(core, xGeo('viorb', () => new THREE.IcosahedronGeometry(1.6, 1)), g, 0, 0, 0);
  const shell = h.M(0xea80fc, { transparent: true, opacity: 0.3, depthWrite: false });
  shell.userData.keepOpacity = 0.3;
  part(core, xGeo('viorbShell', () => new THREE.IcosahedronGeometry(2.1, 1)), shell, 0, 0, 0);
  h.anim = (phase, t) => {
    core.position.y = 2.6 + Math.sin(t * 2) * 0.3;
    orb.rotation.y = t * 0.8;
    g.emissiveIntensity = 0.7 + Math.sin(t * 5) * 0.25;
  };
  return h;
}

/** Expert Time Crystal: a tall, pointed white crystal floating upright with a soft glow. */
export function makeTimeCrystalModel() {
  const h = creature();
  const core = new THREE.Group();
  core.position.y = 3.2;
  h.body.add(core);
  const g = glow(h, 0xffffff);
  g.emissiveIntensity = 0.5;
  const c = part(core, xGeo('tCrystal', () => new THREE.OctahedronGeometry(1, 0)), g, 0, 0, 0);
  c.scale.set(1.1, 2.6, 1.1);
  h.anim = (phase, t) => {
    core.position.y = 3.2 + Math.sin(t * 1.5) * 0.25;
    core.rotation.y = t * 0.5;
  };
  return h;
}

/** Expert Time Fragment: a smaller white shard with a glowing pink edge and blue sparks. */
export function makeTimeFragmentModel() {
  const h = creature();
  const core = new THREE.Group();
  core.position.y = 1.8;
  h.body.add(core);
  const c = part(core, xGeo('tCrystal', () => new THREE.OctahedronGeometry(1, 0)), h.M(0xf5f5f5), 0, 0, 0);
  c.scale.set(0.6, 1.4, 0.6);
  const edge = part(core, xGeo('tCrystal', () => new THREE.OctahedronGeometry(1, 0)), glow(h, 0xff4fa3), 0, 0, 0);
  edge.scale.set(0.68, 1.2, 0.3);
  const spark = glow(h, 0x40c4ff);
  const sparks = [];
  for (let i = 0; i < 3; i++) sparks.push(part(core, boxGeo(0.15, 0.15, 0.15), spark, 0, 0, 0));
  h.anim = (phase, t) => {
    core.rotation.y = t * 1.2;
    sparks.forEach((s, i) => {
      const a = t * 3 + (i / 3) * Math.PI * 2;
      s.position.set(Math.sin(a) * 1, Math.sin(t * 4 + i), Math.cos(a) * 1);
    });
  };
  return h;
}

// ---------------------------------------------------------------- Insane mode (2026-11-09 spec)
const O_GEO = new Map();
const oGeo = (key, make) => {
  let g = O_GEO.get(key);
  if (!g) O_GEO.set(key, (g = make()));
  return g;
};

/**
 * Insane mode outfits (def.ilook): soldiers, robots and XCF troops, beings of light, corruption
 * and fire, and the Overlord. Arms point forward, so in an arm's frame -y runs along it toward the
 * hand and +z is up. The looks follow the wiki descriptions in the user's spec.
 */
export function orionParts(h, def) {
  const { M } = h;
  const g = (c = def.glowC ?? 0xffffff) => glow(h, c);
  const clear = (color, opacity, shine = false) => {
    const m = shine ? glow(h, color) : M(color);
    m.transparent = true;
    m.opacity = opacity;
    m.depthWrite = false;
    m.userData.keepOpacity = opacity;
    return m;
  };
  const limbs = [h.leftArm, h.rightArm, h.leftLeg, h.rightLeg];
  const arms = [h.leftArm, h.rightArm];
  const sphere = (r) => oGeo(`s${r}`, () => new THREE.SphereGeometry(r, 16, 12));
  const torus = (r, tube) => oGeo(`t${r}|${tube}`, () => new THREE.TorusGeometry(r, tube, 8, 24));
  const cape = (m, len = 3.2) => {
    const c = part(h.torso, boxGeo(2.1, len, 0.12), m, 0, 0.95 - len / 2, -0.62);
    c.rotation.x = 0.12;
  };
  const horns = (m, len = 0.9, out = 0.5, up = 0.4) => {
    for (const side of [-1, 1]) part(h.head, boxGeo(0.22, len, 0.22), m, side * out, 1.2 + len / 2 - 0.2, 0).rotation.z = -side * up;
  };
  const crown = (m, y = 1.3) => {
    part(h.head, boxGeo(1.3, 0.25, 1.3), m, 0, y, 0);
    for (const [x, z] of [[-0.5, 0.55], [0, 0.55], [0.5, 0.55], [-0.5, -0.55], [0.5, -0.55]]) part(h.head, boxGeo(0.2, 0.4, 0.2), m, x, y + 0.3, z);
  };
  const halo = (m, y = 1.7, r = 0.6) => {
    const hl = part(h.head, torus(r, 0.07), m, 0, y, 0);
    hl.rotation.x = Math.PI / 2;
  };
  const wings = (m, span = 2.6, tall = 2.2) => {
    for (const side of [-1, 1]) {
      const w = part(h.torso, boxGeo(span, tall, 0.12), m, side * (0.6 + span / 2), 0.6, -0.65);
      w.rotation.z = side * 0.35;
      part(h.torso, boxGeo(span * 0.4, tall * 0.5, 0.12), m, side * (0.6 + span * 0.95), -0.2, -0.65).rotation.z = side * 0.7;
    }
  };
  const blade = (arm, m, len = 2.6, w = 0.3) => part(arm, boxGeo(0.14, len, w), m, 0, -2.1 - len / 2, 0.1);
  const backSword = (m, hilt) => {
    const s = part(h.torso, boxGeo(0.25, 3.2, 0.45), m, 0.3, 0.3, -0.7);
    s.rotation.z = 0.6;
    if (hilt) part(h.torso, boxGeo(0.7, 0.2, 0.3), hilt, -0.55, 1.6, -0.7).rotation.z = 0.6;
  };
  const hammer = (arm, headM, handleM, big = 1) => {
    part(arm, boxGeo(0.25, 3 * big, 0.25), handleM, 0, -2 - 1.5 * big, 0);
    part(arm, boxGeo(1.6 * big, 1.1 * big, 1.1 * big), headM, 0, -2 - 3 * big, 0);
  };
  const staff = (arm, m, tip, len = 4.5) => {
    part(arm, boxGeo(0.22, 0.22, len), m, 0, -2.0, 0.6);
    if (tip) part(arm, boxGeo(0.55, 0.55, 0.55), tip, 0, -2.0, 0.6 + len / 2);
  };
  const helmet = (m, hgt = 0.5) => part(h.head, boxGeo(1.4, hgt, 1.4), m, 0, 1.2 + hgt / 2 - 0.1, 0);
  const valkyrie = (m, wingM) => {
    part(h.head, boxGeo(1.4, 1.4, 1.4), m, 0, 0.62, 0);
    for (const side of [-1, 1]) part(h.head, boxGeo(0.12, 0.9, 0.6), wingM, side * 0.78, 1.2, -0.1).rotation.z = -side * 0.4;
  };
  const plates = (m, trim) => {
    part(h.torso, boxGeo(2.25, 1.9, 1.2), m, 0, 0.1, 0);
    for (const x of [-1.3, 1.3]) part(h.torso, boxGeo(1.0, 0.55, 1.25), m, x, 1.0, 0);
    for (const l of limbs) part(l, boxGeo(1.12, 0.9, 1.12), m, 0, -1.4, 0);
    if (trim) for (const l of limbs) part(l, boxGeo(1.14, 0.1, 1.14), trim, 0, -1.0, 0);
  };
  const gem = (m, x = 0, y = 0.3, s = 0.45) => part(h.torso, boxGeo(s, s, 0.2), m, x, y, 0.55).rotation.z = Math.PI / 4;
  const backpack = (m, w = 1.4, hh = 1.5) => part(h.torso, boxGeo(w, hh, 0.7), m, 0, 0.1, -0.85);
  const robe = (m, len = 2.4) => {
    h.leftLeg.visible = h.rightLeg.visible = false;
    part(h.torso, boxGeo(2.05, len, 1.1), m, 0, -1 - len / 2 + 0.2, 0);
  };
  const hood = (m) => part(h.head, boxGeo(1.45, 1.45, 1.35), m, 0, 0.7, -0.12);
  const eyeHead = (r, iris, pupil = 0x111111) => {
    h.head.children[0].visible = false;
    part(h.head, sphere(r), M(0xfafafa), 0, r * 0.85, 0);
    const ir = part(h.head, oGeo(`c${r}`, () => new THREE.CircleGeometry(r * 0.45, 16)), glow(h, iris), 0, r * 0.85, r + 0.01);
    ir.renderOrder = 1;
    part(h.head, oGeo(`c${r}p`, () => new THREE.CircleGeometry(r * 0.2, 12)), M(pupil), 0, r * 0.85, r + 0.03);
  };
  const tentacles = (m, n = 6, len = 2) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const t = part(h.torso, boxGeo(0.25, len, 0.25), m, Math.sin(a) * 0.9, -1.1 - len / 2, Math.cos(a) * 0.45);
      t.rotation.z = Math.sin(a) * 0.3;
      t.rotation.x = Math.cos(a) * 0.3;
    }
  };
  const tie = (m) => part(h.torso, boxGeo(0.3, 1.4, 0.08), m, 0, 0.2, 0.53);
  const bubble = (color, r = 3.4, y = 3) => part(h.body, sphere(r), clear(color, 0.25), 0, y, 0);

  switch (def.ilook) {
    case 'swordsman':
      backSword(M(0xb0bec5), M(0x5d4037)); // a sword it never draws
      break;
    case 'ninja': {
      part(h.head, boxGeo(1.3, 0.55, 1.3), M(0x111111), 0, 0.28, 0); // mask over the mouth
      part(h.head, boxGeo(1.3, 0.35, 1.3), M(0x111111), 0, 1.1, 0);
      cape(M(0x111111), 2.6);
      const dagger = M(0xcfd8dc);
      blade(h.rightArm, dagger, 1.3, 0.35);
      for (let i = 0; i < 3; i++) part(h.rightArm, boxGeo(0.16, 0.18, 0.18), dagger, 0, -2.4 - i * 0.35, 0.3); // teeth
      break;
    }
    case 'worker': {
      const grey = M(0x424242);
      part(h.torso, boxGeo(2.05, 1.1, 1.05), grey, 0, -0.45, 0); // overall bib
      for (const x of [-0.6, 0.6]) part(h.torso, boxGeo(0.3, 0.95, 1.06), grey, x, 0.5, 0); // straps
      part(h.head, boxGeo(1.35, 0.3, 1.35), M(0xfdd835), 0, 1.25, 0); // hard hat
      break;
    }
    case 'soldier': {
      const beret = M(0x1b5e20);
      part(h.head, boxGeo(1.35, 0.3, 1.35), beret, 0.1, 1.28, 0).rotation.z = -0.15;
      backpack(M(0x558b2f));
      part(h.torso, boxGeo(2.05, 0.25, 1.05), M(0x3e2723), 0, -0.7, 0); // belt
      break;
    }
    case 'metallic': {
      const metal = M(0x424242);
      plates(metal, g());
      part(h.torso, boxGeo(0.5, 1.2, 0.5), M(0x616161), -1.4, 1.6, 0).rotation.z = 0.4; // spiky shoulder
      part(h.torso, boxGeo(0.4, 0.9, 0.4), M(0x616161), -1.0, 1.7, 0.2).rotation.z = 0.2;
      break;
    }
    case 'jetpacker': {
      plates(M(0x1c1c1c));
      const crystal = g();
      gem(crystal, 0, 0.4, 0.6);
      const pack = M(0x212121);
      for (const x of [-0.45, 0.45]) {
        part(h.torso, cylGeo(0.35, 0.35, 1.6, 10), pack, x, 0.1, -0.85);
        part(h.torso, cylGeo(0.25, 0.1, 0.5, 8), g(0xff6d00), x, -0.9, -0.85); // flames
      }
      break;
    }
    case 'berserker': {
      const bone = M(0xe0d6c2);
      // A black raptor skull worn as a helmet.
      part(h.head, boxGeo(1.4, 0.9, 1.6), M(0x111111), 0, 1.0, 0.1);
      part(h.head, boxGeo(0.9, 0.35, 1.0), M(0x111111), 0, 0.95, 1.1); // snout
      for (const x of [-0.3, 0, 0.3]) part(h.head, boxGeo(0.12, 0.25, 0.12), bone, x, 0.72, 1.5); // teeth
      gem(g(), 0, 0.4, 0.7);
      for (const x of [-1.35, 1.35]) part(h.torso, boxGeo(1.0, 0.7, 1.3), M(def.shirt), x, 1.0, 0);
      hammer(h.rightArm, M(0x37474f), M(0x5d4037), 1.2);
      break;
    }
    case 'teleporter': {
      for (const arm of arms) part(arm, boxGeo(1.12, 1.4, 1.12), M(0x78909c), 0, -1.2, 0);
      backpack(M(0x455a64), 1.3, 1.3);
      part(h.torso, boxGeo(0.12, 2.2, 0.12), M(0x90a4ae), 0.4, 1.6, -0.9); // antenna
      part(h.torso, cylGeo(0.7, 0.2, 0.3, 10), M(0xb0bec5), -0.3, 1.2, -1.0).rotation.x = -0.6; // radar dish
      part(h.torso, boxGeo(0.25, 0.25, 0.25), g(), 0.4, 2.8, -0.9);
      break;
    }
    case 'sprinterM5': {
      part(h.rightArm, boxGeo(1.08, 2.0, 1.08), M(0x90a4ae), 0, -1.0, 0); // robot arm
      part(h.rightLeg, boxGeo(1.08, 2.0, 1.08), M(0x90a4ae), 0, -1.0, 0);
      part(h.torso, boxGeo(2.05, 0.15, 1.05), g(), 0, -0.2, 0);
      break;
    }
    case 'eliteSoldier': {
      plates(M(0x9e9e9e), M(0x616161));
      helmet(M(0x9e9e9e), 0.4);
      blade(h.rightArm, g(), 2.8, 0.35);
      break;
    }
    case 'raygunner':
    case 'raygunnerBare': {
      const gun = M(0x37474f);
      part(h.rightArm, boxGeo(0.5, 1.4, 0.7), gun, 0, -2.4, 0.1);
      part(h.rightArm, boxGeo(0.3, 0.4, 0.3), g(), 0, -3.2, 0.1);
      part(h.torso, boxGeo(2.05, 0.25, 1.05), M(0x5d4037), 0, -0.7, 0);
      if (def.ilook === 'raygunner') bubble(0x40c4ff);
      break;
    }
    case 'eliteTeleporter': {
      part(h.head, boxGeo(1.25, 1.25, 1.25), g(), 0, 0.6, 0); // faceless neon head
      plates(M(0x263238));
      backpack(M(0x37474f), 1.4, 1.6);
      part(h.torso, torus(0.6, 0.12), g(), 0, 0.3, -1.25);
      break;
    }
    case 'medic': {
      const coat = M(0xfafafa);
      part(h.torso, boxGeo(2.1, 3.0, 1.1), coat, 0, -0.5, 0); // long lab coat
      part(h.head, cylGeo(0.35, 0.35, 0.08, 12), M(0xcfd8dc), 0, 1.15, 0.62).rotation.x = Math.PI / 2; // head mirror
      part(h.head, boxGeo(1.3, 0.12, 1.3), M(0x9e9e9e), 0, 1.05, 0); // its band
      const kit = M(0xd32f2f);
      part(h.leftArm, boxGeo(0.9, 0.9, 0.5), kit, 0.3, -2.4, -0.6);
      part(h.leftArm, boxGeo(0.5, 0.15, 0.52), M(0xffffff), 0.3, -2.4, -0.6);
      part(h.leftArm, boxGeo(0.15, 0.5, 0.52), M(0xffffff), 0.3, -2.4, -0.6);
      break;
    }
    case 'shielder':
    case 'shielderBare': {
      plates(M(0xfafafa), g());
      helmet(M(0xeceff1), 0.45);
      if (def.ilook === 'shielder') part(h.leftArm, boxGeo(0.2, 3.4, 2.8), clear(0x40c4ff, 0.45, true), 0.9, -1.6, 0); // plasma shield
      else part(h.leftArm, boxGeo(0.25, 0.6, 0.6), g(), 0.6, -1.6, 0); // the emitter, without its shield
      break;
    }
    case 'eliteSwordsman': {
      const diamond = g(0xffffff);
      gem(diamond, 0, 0.4, 0.6);
      blade(h.rightArm, M(0x9e9e9e), 2.6);
      blade(h.leftArm, M(0x9e9e9e), 2.6);
      break;
    }
    case 'cosmil': {
      plates(M(0x1c1c1c), M(0xb71c1c));
      const field = clear(0x80d8ff, 0.4, true);
      h.head.children[0].visible = false;
      part(h.head, boxGeo(1.25, 1.25, 1.25), field, 0, 0.6, 0);
      part(h.head, boxGeo(0.6, 0.6, 0.6), M(0x263238), 0, 0.6, 0); // the robot skull inside
      part(h.head, boxGeo(0.5, 0.12, 0.08), g(), 0, 0.7, 0.32);
      for (const arm of arms) {
        arm.children[0].visible = false;
        part(arm, boxGeo(1.0, 2.0, 1.0), field, 0, -1, 0);
        part(arm, boxGeo(0.4, 2.0, 0.4), M(0x263238), 0, -1, 0);
      }
      break;
    }
    case 'engineer': {
      part(h.torso, boxGeo(2.05, 0.6, 1.05), M(0x111111), 0, -0.3, 0);
      part(h.rightArm, boxGeo(0.25, 1.6, 0.25), M(0x9e9e9e), 0, -2.6, 0); // wrench
      part(h.rightArm, boxGeo(0.6, 0.4, 0.3), M(0x9e9e9e), 0, -3.4, 0);
      backpack(M(0x37474f), 1.6, 1.4);
      break;
    }
    case 'pureEnergy':
    case 'ravagerEnergy': {
      // A glowing body with a black horned head, crackling with lightning.
      const body = g();
      for (const l of limbs) part(l, boxGeo(1.04, 2.04, 1.04), body, 0, -1, 0);
      part(h.torso, boxGeo(2.04, 2.04, 1.04), body, 0, 0, 0);
      part(h.head, boxGeo(1.3, 1.3, 1.3), M(0x0a0a0a), 0, 0.6, 0);
      horns(M(0x0a0a0a), 1.0, 0.5, 0.5);
      if (def.ilook === 'ravagerEnergy') for (const side of [-1, 1]) part(h.head, boxGeo(0.15, 0.6, 0.15), M(0xfafafa), side * 0.4, 0.1, 0.7).rotation.x = -0.6; // tusks
      const spark = g(def.ilook === 'ravagerEnergy' ? 0x2979ff : 0xea80fc);
      for (const [x, y, z] of [[-1.3, 1.2, 0.6], [1.3, 0.2, -0.5], [0.3, 1.5, 0.7], [-0.9, -0.7, 0.6]]) part(h.torso, boxGeo(0.2, 0.6, 0.2), spark, x, y, z).rotation.z = 0.8;
      break;
    }
    case 'boltmaster': {
      plates(M(0x111111), g());
      helmet(M(0x111111), 0.5);
      cape(M(0x1a1a1a), 3.6);
      backSword(M(0x37474f), g());
      for (const x of [-1.3, 1.3]) part(h.torso, boxGeo(0.25, 0.25, 0.25), g(), x, 1.3, 0.6);
      break;
    }
    case 'sentinel': {
      const suit = M(0x212121);
      part(h.torso, boxGeo(2.1, 2.1, 1.1), suit, 0, 0, 0);
      part(h.torso, boxGeo(0.7, 1.2, 0.08), M(0xeceff1), 0, 0.4, 0.56); // shirt
      tie(g(0xaa00ff));
      for (const arm of arms) {
        part(arm, boxGeo(0.4, 1.2, 0.6), M(0x37474f), 0, -2.4, 0.15);
        part(arm, boxGeo(0.2, 0.2, 0.2), g(), 0, -3.0, 0.15);
      }
      break;
    }
    case 'overseer': {
      // A huge purple robot: space helmet, two four-barrel rocket launchers and a minigun on its back.
      plates(M(0x6a1b9a), g());
      part(h.head, sphere(0.95), clear(0x80d8ff, 0.35), 0, 0.6, 0);
      const launcher = M(0x4a148c);
      for (const side of [-1, 1]) {
        part(h.torso, boxGeo(1.0, 1.0, 1.8), launcher, side * 1.3, 1.6, -0.3);
        for (const [x, y] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) part(h.torso, cylGeoX(0.15, 0.15, 0.1, 8), M(0x111111), side * 1.3 + x, 1.6 + y, 0.62);
      }
      part(h.torso, cylGeoX(0.4, 0.4, 2.2, 10), M(0x37474f), 0, 1.2, -1.2); // minigun
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        part(h.torso, cylGeoX(0.08, 0.08, 1.0, 6), M(0x111111), Math.sin(a) * 0.25, 1.2 + Math.cos(a) * 0.25, -2.6);
      }
      break;
    }
    case 'vessel': {
      const body = g();
      body.emissiveIntensity = 0.6;
      for (const l of limbs) part(l, boxGeo(1.04, 2.04, 1.04), body, 0, -1, 0);
      part(h.head, boxGeo(1.25, 1.25, 1.25), body, 0, 0.6, 0);
      part(h.torso, boxGeo(2.1, 1.4, 1.1), M(0x37474f), 0, 0.3, 0); // XCF chestplate
      part(h.torso, boxGeo(0.8, 0.3, 0.06), M(0xfafafa), 0, 0.5, 0.56);
      part(h.torso, boxGeo(1.8, 2.2, 1.2), M(0x263238), 0, 0.2, -1.1); // the device on its back
      part(h.torso, cylGeo(0.4, 0.4, 2.0, 10), body, 0, 0.3, -1.75);
      break;
    }
    case 'kugelblitz': {
      // A humanoid black hole: neon orange glow and a spinning accretion disk around it.
      const orange = g();
      for (const l of limbs) part(l, boxGeo(1.08, 0.1, 1.08), orange, 0, -1.9, 0);
      part(h.torso, boxGeo(2.1, 0.1, 1.1), orange, 0, -0.9, 0);
      const disk = part(h.body, torus(2.8, 0.25), orange, 0, 3.2, 0);
      disk.rotation.x = Math.PI / 2 - 0.3;
      part(h.body, torus(3.4, 0.1), clear(0xffab40, 0.5, true), 0, 3.2, 0).rotation.x = Math.PI / 2 - 0.3;
      break;
    }
    case 'vengeful':
    case 'champion':
    case 'vengefulSpeed': {
      const dark = M(0x111111);
      if (def.ilook === 'champion') {
        // A horned top hat, a long coat and a sword.
        part(h.head, boxGeo(1.4, 0.15, 1.4), dark, 0, 1.25, 0);
        part(h.head, boxGeo(1.0, 1.1, 1.0), dark, 0, 1.85, 0);
        part(h.head, boxGeo(1.02, 0.18, 1.02), g(), 0, 1.45, 0);
        horns(dark, 1.1, 0.7, 0.8);
        part(h.torso, boxGeo(2.15, 3.2, 1.15), M(0x1a1a2e), 0, -0.6, 0);
        blade(h.rightArm, M(0x7c4dff), 3.2, 0.4);
        cape(M(0x0d0d1a), 3.8);
      } else if (def.ilook === 'vengeful') {
        crown(dark);
        horns(dark, 0.9, 0.5, 0.4);
      } else {
        plates(M(0x311b92), M(0x111111));
        wings(clear(0x424242, 0.6), 2.2, 2.0);
      }
      break;
    }
    case 'avantGuard':
    case 'avantGuardBare': {
      plates(M(0x757575), M(0x9e9e9e));
      valkyrie(M(0x9e9e9e), M(0xeceff1));
      part(h.rightArm, boxGeo(0.25, 3.2, 0.25), M(0x5d4037), 0, -3.2, 0); // axe
      part(h.rightArm, boxGeo(0.2, 1.4, 1.6), M(0xb0bec5), 0, -4.4, 0.5);
      if (def.ilook === 'avantGuard') bubble(0x80d8ff, 3.8, 3);
      break;
    }
    case 'vanguard': {
      plates(M(0x111111), g());
      valkyrie(M(0x111111), M(0x1b5e20));
      gem(g(), 0, 0.4, 0.7);
      hammer(h.rightArm, M(0x1b5e20), M(0x263238), 1.4);
      break;
    }
    case 'spirit': {
      const body = clear(0xffab40, 0.55, true);
      h.leftLeg.visible = h.rightLeg.visible = false;
      part(h.torso, boxGeo(1.6, 1.8, 0.8), body, 0, -1.6, 0); // a wispy tail
      halo(g(0xffe082));
      horns(g(0xffab40), 0.9, 0.55, 0.7); // antlers
      for (const side of [-1, 1]) part(h.head, boxGeo(0.15, 0.5, 0.15), g(0xffab40), side * 0.9, 1.6, 0).rotation.z = side * 0.6;
      break;
    }
    case 'divine':
    case 'archangel': {
      robe(M(0xfafafa), 2.6);
      part(h.torso, boxGeo(2.15, 2.1, 1.15), M(0xfafafa), 0, 0, 0);
      if (def.ilook === 'divine') {
        horns(g(0xffab40), 1.0, 0.55, 0.7); // antlers
        for (const side of [-1, 1]) part(h.head, boxGeo(0.15, 0.55, 0.15), g(0xffab40), side * 0.95, 1.7, 0).rotation.z = side * 0.6;
        staff(h.rightArm, M(0x8d6e63), g(0xffab40), 5);
        wings(M(0xfafafa), 2.6, 2.6);
      } else {
        part(h.torso, boxGeo(0.4, 3.2, 0.08), M(0xffd54f), 0, -0.8, 0.6); // priest's stole
        halo(g(0x18ffff), 1.8, 0.7);
        wings(g(0x18ffff), 3.2, 2.8);
      }
      break;
    }
    case 'corruption':
    case 'null':
    case 'corrupted': {
      if (def.ilook === 'corrupted') {
        eyeHead(1.5, 0xd500f9);
        part(h.torso, boxGeo(2.1, 2.1, 1.1), M(0x6a1b9a), 0, 0, 0); // purple shirt
        tie(M(0x8e24aa));
        for (const arm of arms) for (let i = 0; i < 3; i++) part(arm, boxGeo(0.2, 0.5, 0.2), M(0x4a148c), 0.6, -0.5 - i * 0.6, 0).rotation.z = -0.7; // spiky sleeves
      } else if (def.ilook === 'corruption') {
        eyeHead(1.3, 0x111111, 0x000000);
        tentacles(M(0x111111), 7, 2.2);
        for (const arm of arms) part(arm, boxGeo(0.3, 1.5, 0.3), M(0x111111), 0, -2.6, 0); // tentacle fingers
      } else {
        eyeHead(0.9, 0xaa00ff);
        const glass = clear(0x111111, 0.7);
        for (const l of limbs) part(l, boxGeo(1.04, 2.04, 1.04), glass, 0, -1, 0);
      }
      break;
    }
    case 'tranquil': {
      const vein = g(0xd50000);
      vein.emissiveIntensity = 0.5;
      for (const [y, x] of [[-0.4, 0.2], [-1.0, -0.25], [-1.6, 0.15]]) part(h.leftArm, boxGeo(1.04, 0.12, 0.12), vein, 0, y, 0.45).rotation.z = x;
      part(h.leftArm, boxGeo(0.12, 1.6, 1.04), vein, 0.45, -1.0, 0);
      for (const x of [-1.3, 1.3]) part(h.torso, boxGeo(1.0, 0.7, 1.2), M(0x111111), x, 1.0, 0);
      break;
    }
    case 'hardLight': {
      const white = g(0xffffff);
      white.emissiveIntensity = 1;
      for (const l of limbs) part(l, boxGeo(1.02, 2.02, 1.02), white, 0, -1, 0);
      part(h.torso, boxGeo(2.02, 2.02, 1.02), white, 0, 0, 0);
      part(h.head, boxGeo(1.22, 1.22, 1.22), white, 0, 0.6, 0);
      const edge = M(0x9e9e9e);
      for (const y of [-1.02, 1.02]) part(h.torso, boxGeo(2.08, 0.05, 1.08), edge, 0, y, 0);
      break;
    }
    case 'bolt': {
      part(h.torso, boxGeo(2.1, 1.6, 1.1), M(0x1565c0), 0, 0.2, 0); // blue metal vest
      const crystal = g();
      for (const [x, y] of [[-0.6, 0.6], [0.5, 0.2], [-0.1, -0.3]]) part(h.torso, boxGeo(0.3, 0.6, 0.3), crystal, x, y, 0.6).rotation.z = 0.4;
      for (const side of [-1, 1]) part(h.torso, boxGeo(0.3, 0.8, 0.3), crystal, side * 1.1, 1.3, 0).rotation.z = -side * 0.4;
      break;
    }
    case 'mage': {
      part(h.head, boxGeo(1.6, 0.15, 1.6), M(0x111111), 0, 1.25, 0); // hat brim
      part(h.head, cylGeo(0.05, 0.7, 1.6, 8), M(0x111111), 0, 2.1, 0);
      robe(M(0x111111), 2.4);
      cape(M(0x1a1a1a), 3.4);
      staff(h.rightArm, M(0x5d4037), g());
      break;
    }
    case 'lightningKing': {
      robe(M(0x0d1b4a), 2.4);
      cape(M(0x111111), 3.6);
      crown(M(0xffd54f));
      for (const y of [0.6, -0.2]) part(h.torso, boxGeo(2.12, 0.12, 1.12), g(), 0, y, 0);
      break;
    }
    case 'lightspeed': {
      plates(M(0x0a0a0a));
      for (const [x, y] of [[0, 0.4], [-1.3, 1.0], [1.3, 1.0]]) gem(g(0x2979ff), x, y, 0.4);
      wings(g(0x81d4fa), 2.8, 2.2);
      break;
    }
    case 'ravager': {
      plates(M(0x37474f), M(0x0288d1));
      cape(M(0x01579b), 3.6);
      crown(M(0x111111));
      const spike = M(0x4fc3f7);
      for (const [x, y, z] of [[-1.2, 1.5, 0], [1.2, 1.5, 0], [0, 1.0, -0.8], [-0.6, 0.2, -0.8], [0.6, 0.2, -0.8]]) part(h.torso, boxGeo(0.25, 0.9, 0.25), spike, x, y, z).rotation.z = x * 0.4;
      part(h.rightArm, oGeo('crystal', () => new THREE.OctahedronGeometry(0.6, 0)), g(), 0, -2.4, 0); // its throwing crystal
      break;
    }
    case 'reactor':
    case 'hellflame': {
      const hf = def.ilook === 'hellflame';
      if (hf) {
        const body = g(0xff6d00);
        body.emissiveIntensity = 0.6;
        for (const l of limbs) part(l, boxGeo(1.04, 2.04, 1.04), body, 0, -1, 0);
      }
      plates(M(0x1c1c1c), M(0x424242));
      if (hf) {
        cape(M(0x111111), 3.4);
        part(h.head, boxGeo(1.4, 1.4, 1.4), M(0x1c1c1c), 0, 0.62, 0); // barred helmet
        for (const x of [-0.35, 0, 0.35]) part(h.head, boxGeo(0.12, 0.9, 0.06), g(0xff6d00), x, 0.6, 0.71);
      } else {
        // Chains wrapped around the armor.
        const chain = M(0x757575);
        for (let i = 0; i < 7; i++) part(h.torso, boxGeo(0.35, 0.18, 0.15), chain, -1 + i * 0.33, 0.9 - i * 0.28, 0.66).rotation.z = -0.7;
      }
      break;
    }
    case 'unstable': {
      const body = clear(0xff8a80, 0.4);
      part(h.torso, boxGeo(2.04, 2.04, 1.04), body, 0, 0, 0);
      const red = g(0xff1744);
      part(h.head, boxGeo(1.24, 1.24, 1.24), red, 0, 0.6, 0);
      for (const arm of arms) part(arm, boxGeo(1.04, 2.04, 1.04), red, 0, -1, 0);
      for (const [x, y, z] of [[-1.2, 1.1, 0.5], [1.1, -0.3, 0.6], [0.2, 1.3, -0.6]]) part(h.torso, boxGeo(0.2, 0.2, 0.2), g(0xff5252), x, y, z);
      break;
    }
    case 'apparition': {
      const ghost = clear(0x212121, 0.55);
      h.leftLeg.visible = h.rightLeg.visible = false;
      part(h.torso, boxGeo(2.04, 2.04, 1.04), ghost, 0, 0, 0);
      part(h.torso, boxGeo(1.6, 2.2, 0.9), ghost, 0, -2.0, 0); // a trailing wisp, no legs
      horns(M(0x0a0a0a), 1.0, 0.5, 0.5);
      for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.25, 0.15, 0.06), g(0xeeeeee), x, 0.7, 0.62);
      break;
    }
    case 'hellspeed': {
      plates(M(0x111111), g());
      wings(M(0x1c1c1c), 2.8, 2.4);
      for (const [x, y] of [[-0.5, -0.4], [0.4, 0.5]]) part(h.torso, boxGeo(0.4, 0.4, 0.06), g(), x, y, 0.62); // embers
      break;
    }
    case 'prompter': {
      const lava = g();
      lava.emissiveIntensity = 0.5;
      for (const l of limbs) part(l, boxGeo(1.04, 2.04, 1.04), lava, 0, -1, 0);
      plates(M(0x1c1c1c));
      horns(M(0x1c1c1c), 1.0, 0.55, 0.5);
      break;
    }
    case 'overlord': {
      // A white-and-black king: rosy red gems, a crown, and a staff on his back.
      plates(M(0xfafafa), M(0x111111));
      part(h.torso, boxGeo(0.8, 2.0, 1.22), M(0x111111), 0, 0, 0);
      gem(g(0xff1744), 0, 0.5, 0.6);
      for (const x of [-1.3, 1.3]) part(h.torso, boxGeo(0.35, 0.35, 0.2), g(0xff1744), x, 1.05, 0.66);
      crown(M(0xfafafa));
      for (const z of [0.66, -0.66]) part(h.head, boxGeo(0.3, 0.3, 0.1), g(0xff1744), 0, 1.35, z);
      cape(M(0x111111), 4);
      const st = part(h.torso, boxGeo(0.25, 5, 0.25), M(0xeceff1), 0.5, 0.4, -0.9); // staff on his back
      st.rotation.z = 0.4;
      part(h.torso, boxGeo(0.6, 0.6, 0.6), g(0xff1744), -0.5, 2.7, -0.9);
      break;
    }
  }
}

/** Insane Truck M2: a dark green army truck with four Soldiers sitting in the back. */
export function makeInsaneTruckModel(def) {
  const h = creature();
  const { M } = h;
  const green = M(def.skin);
  const truck = new THREE.Group();
  h.body.add(truck);
  part(truck, boxGeo(2.6, 0.5, 5.2), M(0x263238), 0, 0.8, 0); // chassis
  part(truck, boxGeo(2.4, 1.5, 1.6), green, 0, 1.75, 1.6); // cab
  part(truck, boxGeo(2.0, 0.6, 0.08), M(0x90caf9), 0, 2.05, 2.42); // windshield
  part(truck, boxGeo(2.6, 0.8, 3.2), green, 0, 1.45, -0.9); // open bed
  part(truck, boxGeo(2.2, 0.2, 2.8), M(0x1b3d12), 0, 1.86, -0.9);
  // Four Soldiers in the back: green jackets and berets.
  for (const [x, z] of [[-0.6, -0.2], [0.6, -0.2], [-0.6, -1.6], [0.6, -1.6]]) {
    part(truck, boxGeo(0.7, 0.8, 0.6), M(0x2e7d32), x, 2.3, z);
    part(truck, boxGeo(0.5, 0.5, 0.5), M(0xa5d6a7), x, 2.95, z);
    part(truck, boxGeo(0.55, 0.15, 0.55), M(0x1b5e20), x, 3.25, z);
  }
  h.wheels = [];
  for (const [x, z] of [[-1, -1.8], [1, -1.8], [-1, 1.6], [1, 1.6]]) {
    const w = part(h.body, cylGeo(0.55, 0.55, 0.4, 10), M(0x111111), x * 1.3, 0.55, z);
    w.rotation.z = Math.PI / 2;
    h.wheels.push(w);
  }
  h.anim = (phase, t) => {
    for (const w of h.wheels) w.rotation.x = phase * 3;
    truck.position.y = Math.abs(Math.sin(t * 14)) * 0.06;
  };
  return h;
}

/** Insane Carrier Tank: a long, low dark-purple futuristic tank with glowing trim. */
export function makeCarrierTankModel(def) {
  const h = creature();
  const { M } = h;
  const hull = M(def.skin);
  const trim = glow(h, def.shard);
  part(h.body, boxGeo(3.4, 1.1, 6.4), hull, 0, 0.95, 0);
  part(h.body, boxGeo(2.6, 0.6, 5.0), M(0x1a0f3a), 0, 1.8, -0.3);
  part(h.body, boxGeo(3.42, 0.12, 6.42), trim, 0, 1.2, 0);
  for (const side of [-1, 1]) part(h.body, boxGeo(0.7, 0.9, 6.6), M(0x111111), side * 1.75, 0.5, 0); // treads
  const turret = new THREE.Group();
  turret.position.set(0, 2.2, 0.4);
  h.body.add(turret);
  part(turret, boxGeo(1.8, 0.6, 1.8), hull, 0, 0, 0);
  part(turret, cylGeoX(0.18, 0.18, 2.6, 8), M(0x111111), 0, 0.05, 2.0);
  part(turret, boxGeo(0.3, 0.3, 0.3), trim, 0, 0.05, 3.3);
  part(h.body, boxGeo(1.6, 0.2, 0.08), trim, 0, 1.4, 3.21); // headlight strip
  h.anim = (phase, t) => {
    turret.rotation.y = Math.sin(t * 0.6) * 0.4;
    trim.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.2;
  };
  return h;
}

/** Insane MK11-Device: a black machine with spinning prongs and a blue trail. */
export function makeMk11Model(def) {
  const h = creature();
  const { M } = h;
  const dark = M(def.skin);
  const blue = glow(h, def.shard);
  part(h.body, cylGeo(1.6, 1.9, 0.8, 10), dark, 0, 0.4, 0);
  part(h.body, cylGeo(1.0, 1.4, 1.6, 10), dark, 0, 1.6, 0);
  part(h.body, cylGeo(0.5, 0.5, 0.2, 10), blue, 0, 2.5, 0);
  const prongs = new THREE.Group();
  prongs.position.y = 2.6;
  h.body.add(prongs);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const p = part(prongs, boxGeo(0.2, 1.3, 0.2), M(0x37474f), Math.sin(a) * 0.9, 0.5, Math.cos(a) * 0.9);
    p.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5);
    part(prongs, boxGeo(0.25, 0.25, 0.25), blue, Math.sin(a) * 1.25, 1.15, Math.cos(a) * 1.25);
  }
  part(h.body, boxGeo(0.6, 0.06, 3), blue, 0, 0.05, -2.2); // its blue trail
  h.anim = (phase, t) => {
    prongs.rotation.y = t * 4;
    blue.emissiveIntensity = 0.6 + Math.sin(t * 8) * 0.3;
  };
  return h;
}
