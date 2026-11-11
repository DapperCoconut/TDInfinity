// Enemy looks for Insane: its parts, the scrap golem and the time enemies.

import * as THREE from 'three';
import { boxGeo, part } from './kit.js';
import { creature, crown, cylGeo, cylGeoX, cylGeoZ, eyes, glow } from './bits.js';
import { makeGolemModel } from './enemies-creatures.js';

/**
 * Insane mode outfits (def.insane): purple chains, scrap robots, time beings and the Beholder.
 * Arms point forward, so in an arm's frame -y runs along it toward the hand and +z is up.
 */
let warperRingGeo = null; // shared by every Warper

export function insaneParts(h, def) {
  const { M } = h;
  const glowC = glow(h, def.glowC ?? 0xb388ff);
  const metal = M(0x78909c);
  const dark = M(0x263238);
  // A chain of `n` links from a to b (local to `parent`); links alternate flat and upright.
  const chainMat = M(0x4a148c);
  const chain = (parent, [ax, ay, az], [bx, by, bz], n, size = 0.22) => {
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const m = part(parent, boxGeo(size * (i % 2 ? 0.5 : 1.6), size * (i % 2 ? 1.6 : 0.5), size * 0.7), i % 4 === 0 ? glowC : chainMat,
        ax + (bx - ax) * f, ay + (by - ay) * f, az + (bz - az) * f);
      m.rotation.z = Math.atan2(by - ay, bx - ax);
    }
  };
  const wrapChains = (big) => {
    const n = big ? 9 : 7;
    chain(h.torso, [-1.05, 1.0, 0.56], [1.05, -0.9, 0.56], n);
    chain(h.torso, [-1.05, -0.4, -0.56], [1.05, 0.9, -0.56], n);
    chain(h.torso, [-1.05, 0.2, 0.56], [1.05, 0.2, 0.56], n);
    for (const limb of [h.rightArm, h.leftArm, h.rightLeg, h.leftLeg]) chain(limb, [-0.55, -1.2, 0.55], [0.55, -1.0, 0.55], 4, 0.18);
    part(h.torso, boxGeo(0.5, 0.6, 0.25), glowC, 0.2, -0.5, 0.66); // padlock
    part(h.head, boxGeo(1.3, 0.2, 1.3), chainMat, 0, 0.35, 0); // chain around the jaw
    if (big) {
      for (const side of [-1, 1]) {
        part(h.torso, boxGeo(0.3, 0.8, 0.3), glowC, side * 1.2, 1.1, 0).rotation.z = -side * 0.5; // purple growths
        part(h.head, boxGeo(0.25, 0.6, 0.25), glowC, side * 0.45, 1.4, 0).rotation.z = -side * 0.3;
      }
      for (const [x, y] of [[-0.5, 0.6], [0.6, -0.2], [-0.2, -0.8]]) part(h.torso, boxGeo(0.12, 0.6, 0.06), glowC, x, y, 0.53); // veins
    }
  };
  // Robot head: a metal box with a glowing visor strip.
  const robotHead = (visorColor = def.glowC, w = 1.0) => {
    part(h.head, boxGeo(1.35, 1.35, 1.35), metal, 0, 0.6, 0);
    part(h.head, boxGeo(w, 0.22, 0.08), glow(h, visorColor), 0, 0.75, 0.7);
  };
  switch (def.insane) {
    case 'chained':
      wrapChains(false);
      break;
    case 'megaChained':
      wrapChains(true);
      break;
    case 'crawler': {
      wrapChains(false);
      // Crawls on its belly, arms reaching ahead, legs dragging behind.
      h.anim = (phase) => {
        h.body.rotation.x = Math.PI / 2;
        h.body.position.y = 0.6;
        const sw = Math.sin(phase * 1.4) * 0.5;
        h.rightArm.rotation.x = Math.PI + sw;
        h.leftArm.rotation.x = Math.PI - sw;
        h.rightLeg.rotation.x = sw * 0.4;
        h.leftLeg.rotation.x = -sw * 0.4;
        h.head.rotation.x = -0.9; // looking ahead
        h.body.rotation.z = sw * 0.12;
      };
      break;
    }
    case 'bioGunner': {
      // Gas mask, a goo tank on its back and a purple goo gun.
      part(h.head, boxGeo(1.0, 0.6, 0.3), dark, 0, 0.45, 0.7);
      for (const side of [-1, 1]) part(h.head, boxGeo(0.35, 0.35, 0.3), glow(h, 0xd500f9), side * 0.3, 0.8, 0.68);
      part(h.head, boxGeo(0.4, 0.4, 0.5), metal, 0, 0.25, 0.95); // filter
      part(h.torso, boxGeo(1.2, 1.8, 0.8), metal, 0, 0.1, -0.9);
      part(h.torso, boxGeo(0.9, 1.4, 0.1), glowC, 0, 0.1, -1.32); // goo window
      part(h.rightArm, boxGeo(0.7, 0.7, 2.6), dark, 0, -2.1, 0.4);
      part(h.rightArm, boxGeo(0.45, 0.45, 1.2), glowC, 0, -2.1, 0.4).position.y = -3.2; // nozzle
      part(h.rightArm, boxGeo(0.6, 0.9, 0.6), glowC, 0, -1.8, 1.2); // goo canister on top
      break;
    }
    case 'radiator': {
      // Lead armor (from def.lead) with glowing green radiation cracks and a hazard sign.
      part(h.torso, boxGeo(0.9, 0.9, 0.08), M(0xfdd835), 0, 0.3, 0.7);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        part(h.torso, boxGeo(0.22, 0.32, 0.06), M(0x111111), Math.sin(a) * 0.22, 0.3 + Math.cos(a) * 0.22, 0.75).rotation.z = -a;
      }
      for (const [x, y] of [[-0.8, -0.3], [0.8, 0.6], [0.6, -0.8]]) part(h.torso, boxGeo(0.12, 0.7, 0.06), glowC, x, y, 0.68);
      part(h.head, boxGeo(1.0, 0.18, 0.08), glowC, 0, 0.75, 0.72); // visor slit
      for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(0.12, 0.6, 1.15), glowC, 0.56, -1.4, 0);
      break;
    }
    case 'smoker': {
      // A robot with a smoking grill for a mouth and a big tank on its back.
      robotHead(0xff6d00);
      part(h.head, boxGeo(0.8, 0.35, 0.1), dark, 0, 0.3, 0.72); // mouth grill
      for (const x of [-0.25, 0, 0.25]) part(h.head, boxGeo(0.08, 0.3, 0.12), glow(h, 0xff6d00), x, 0.3, 0.74);
      part(h.torso, boxGeo(2.1, 2.0, 1.1), metal, 0, 0, 0);
      part(h.torso, cylGeo(0.75, 0.75, 2.6, 12), M(0x546e7a), 0, 0.4, -1.2);
      part(h.torso, cylGeo(0.25, 0.25, 0.8, 8), dark, 0.4, 2.0, -1.2); // chimney
      part(h.torso, boxGeo(0.3, 0.3, 0.3), glow(h, 0xff6d00), 0.4, 2.45, -1.2);
      break;
    }
    case 'sprinter': {
      // A sleek red robot runner: visor, red plates and fins.
      robotHead(0xff1744, 1.2);
      part(h.head, boxGeo(0.25, 0.6, 1.2), M(0xc62828), 0, 1.45, -0.1); // fin
      part(h.torso, boxGeo(2.05, 1.6, 1.08), M(0xb71c1c), 0, 0.2, 0);
      part(h.torso, boxGeo(0.12, 1.4, 0.06), glowC, 0, 0.2, 0.56);
      for (const leg of [h.rightLeg, h.leftLeg]) {
        part(leg, boxGeo(1.05, 1.0, 1.05), metal, 0, -1.4, 0);
        part(leg, boxGeo(0.2, 0.7, 0.6), glowC, 0, -1.2, -0.7); // heel thruster
      }
      break;
    }
    case 'mechanic': {
      // A big yellow work robot with a huge wrench.
      robotHead(0xffd740);
      part(h.head, boxGeo(1.5, 0.3, 1.5), M(0xf9a825), 0, 1.4, 0); // hard hat
      part(h.torso, boxGeo(2.3, 2.1, 1.3), M(0xf9a825), 0, 0, 0);
      part(h.torso, boxGeo(1.6, 0.25, 1.35), dark, 0, -0.75, 0); // tool belt
      for (const x of [-0.5, 0.1, 0.6]) part(h.torso, boxGeo(0.25, 0.45, 0.3), metal, x, -0.95, 0.7);
      part(h.rightArm, boxGeo(0.4, 0.4, 4.2), metal, 0, -2.1, 1.0); // wrench handle
      part(h.rightArm, boxGeo(1.3, 0.5, 0.5), metal, 0, -2.1, 3.2); // jaw
      part(h.rightArm, boxGeo(0.4, 0.5, 0.9), metal, -0.45, -2.1, 3.6);
      part(h.rightArm, boxGeo(0.4, 0.5, 0.9), metal, 0.45, -2.1, 3.6);
      break;
    }
    case 'battery': {
      // A slow robot with a giant battery on its back and crackling coils.
      robotHead(0x40c4ff, 1.2);
      part(h.torso, boxGeo(2.3, 2.1, 1.3), metal, 0, 0, 0);
      part(h.torso, cylGeo(1.0, 1.0, 3.2, 14), M(0x212121), 0, 0.6, -1.6);
      part(h.torso, cylGeo(1.02, 1.02, 0.8, 14), M(0x1565c0), 0, 1.6, -1.6);
      part(h.torso, cylGeo(0.35, 0.35, 0.4, 10), metal, 0, 2.4, -1.6); // terminal
      part(h.torso, boxGeo(0.6, 0.15, 0.1), glowC, 0, 0.6, -2.65); // + sign
      part(h.torso, boxGeo(0.15, 0.6, 0.1), glowC, 0, 0.6, -2.65);
      for (const side of [-1, 1]) {
        part(h.torso, cylGeo(0.2, 0.2, 1.2, 8), dark, side * 1.2, 1.5, 0);
        part(h.torso, boxGeo(0.45, 0.45, 0.45), glowC, side * 1.2, 2.2, 0); // coil tops
      }
      for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(0.5, 0.3, 0.5), glowC, 0, -2.1, 0);
      break;
    }
    case 'king': {
      // A robotic king: crown, a long purple cape and a spear.
      robotHead(0xd500f9, 1.1);
      crown(h, h.head, 1.3, 1.4);
      part(h.torso, boxGeo(2.1, 1.8, 1.1), M(0x9e9e9e), 0, 0.15, 0);
      part(h.torso, boxGeo(0.6, 0.6, 0.08), glowC, 0, 0.4, 0.58); // chest gem
      part(h.body, boxGeo(2.4, 3.6, 0.15), M(0x6a1b9a), 0, 2.4, -0.7); // cape
      part(h.body, boxGeo(2.6, 0.4, 0.4), M(0xeceff1), 0, 4.0, -0.55); // fur collar
      part(h.rightArm, boxGeo(0.25, 0.25, 6), M(0x5d4037), 0, -2.1, 0.8); // spear shaft
      part(h.rightArm, boxGeo(0.5, 0.15, 1.3), glowC, 0, -2.1, 4.4); // spearhead
      break;
    }
    case 'warper': {
      // A hooded violet being with a clock for a chest and floating gear rings.
      part(h.body, boxGeo(2.3, 2.6, 1.4), M(0x311b92), 0, 1.3, 0); // robe
      part(h.head, boxGeo(1.45, 1.4, 1.35), M(0x1a0f3a), 0, 0.7, -0.08); // hood
      part(h.torso, cylGeoX(0.75, 0.75, 0.1, 16), M(0xede7f6), 0, 0.3, 0.56);
      part(h.torso, boxGeo(0.08, 0.6, 0.05), dark, 0, 0.5, 0.63);
      part(h.torso, boxGeo(0.45, 0.08, 0.05), dark, 0.2, 0.3, 0.63);
      for (const side of [-1, 1]) {
        const ring = part(h.torso, (warperRingGeo ??= new THREE.TorusGeometry(0.5, 0.08, 4, 10)), glowC, side * 1.6, 1.6, 0);
        ring.rotation.y = Math.PI / 2;
      }
      break;
    }
    case 'glitch': {
      // A dark figure torn up by cyan static blocks.
      const cyan = glowC;
      const pink = glow(h, 0xff4081);
      for (const [p, x, y, z, w] of [[h.torso, 0.7, 0.6, 0.55, 0.7], [h.torso, -0.6, -0.4, 0.55, 0.9], [h.torso, 0.2, -0.8, -0.55, 0.6],
        [h.head, -0.3, 0.9, 0.62, 0.6], [h.head, 0.5, 0.4, 0.3, 0.4], [h.rightArm, 0.4, -1.4, 0.4, 0.5], [h.leftLeg, -0.3, -0.8, 0.5, 0.5]]) {
        part(p, boxGeo(w, 0.2, 0.08), cyan, x, y, z);
        part(p, boxGeo(w * 0.6, 0.12, 0.08), pink, x + 0.15, y - 0.2, z);
      }
      break;
    }
    case 'beholder':
    case 'beholderTime': {
      // The Beholder: a long grey coat, a dark hood around a black face with two glowing eyes.
      const coat = M(0x9e9e9e);
      const coatDark = M(0x757575);
      const hood = M(0x2b2b2b);
      part(h.torso, boxGeo(2.2, 2.15, 1.2), coat, 0, 0, 0);
      part(h.body, boxGeo(2.3, 1.8, 1.25), coat, 0, 1.4, 0); // coat skirt over the legs
      part(h.torso, boxGeo(0.1, 2.0, 0.05), coatDark, 0, -0.1, 0.62); // zip
      for (const side of [-1, 1]) {
        part(h.torso, boxGeo(0.6, 0.45, 0.06), coatDark, side * 0.6, -0.6, 0.62); // pockets
        part(h.body, boxGeo(0.6, 0.45, 0.06), coatDark, side * 0.6, 1.3, 0.64);
      }
      for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.15, 2.05, 1.15), coat, 0, -1.0, 0); // sleeves
      part(h.head, boxGeo(1.6, 1.6, 0.25), hood, 0, 0.65, -0.68); // hood back
      for (const side of [-1, 1]) part(h.head, boxGeo(0.22, 1.6, 1.45), hood, side * 0.75, 0.65, 0); // hood sides
      part(h.head, boxGeo(1.6, 0.25, 1.45), hood, 0, 1.38, 0); // hood top
      part(h.torso, boxGeo(2.3, 0.4, 1.3), coatDark, 0, 1.0, 0); // collar
      if (def.insane === 'beholderTime') {
        // Its sword, drawn: a long pale blade with a glowing gold edge and a clock on the guard.
        part(h.rightArm, boxGeo(0.35, 0.35, 1.2), dark, 0, -2.1, 0.3); // grip
        part(h.rightArm, boxGeo(1.6, 0.3, 0.3), M(0xffc400), 0, -2.1, 0.95); // guard
        part(h.rightArm, cylGeoZ(0.35, 0.35, 0.12, 12), M(0xede7f6), 0, -2.3, 0.95);
        part(h.rightArm, boxGeo(0.5, 0.12, 4.4), M(0xe0e0e0), 0, -2.1, 3.3); // blade
        part(h.rightArm, boxGeo(0.1, 0.16, 4.4), glow(h, 0xffd740), 0.27, -2.1, 3.3);
      } else {
        // A floating hourglass orbits its left hand.
        part(h.leftArm, boxGeo(0.7, 0.12, 0.7), M(0xffc400), 0, -2.6, 0.6);
        part(h.leftArm, boxGeo(0.7, 0.12, 0.7), M(0xffc400), 0, -2.6, 1.8);
        part(h.leftArm, boxGeo(0.45, 0.5, 0.45), glowC, 0, -2.6, 1.45);
        part(h.leftArm, boxGeo(0.45, 0.5, 0.45), glow(h, 0xffd740), 0, -2.6, 0.95);
      }
      break;
    }
  }
}

/** Insane mode Bulwark: a hulking golem of cogs, girders and scrap metal. */
export function makeScrapGolemModel() {
  const h = makeGolemModel();
  const [rock, dark, moss] = h.mats;
  rock.color.setHex(0x8d6e63); // rusty scrap
  dark.color.setHex(0x546e7a); // steel
  moss.color.setHex(0xff8f00); // warning stripe
  const { M } = h;
  const cog = M(0x9e9e9e);
  const torso = h.body.children[0];
  const gear = (parent, r, x, y, z, ry = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    parent.add(g);
    part(g, cylGeoX(r, r, 0.3, 12), cog, 0, 0, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      part(g, boxGeo(r * 0.35, r * 0.35, 0.3), cog, Math.cos(a) * r, Math.sin(a) * r, 0);
    }
    part(g, cylGeoX(r * 0.3, r * 0.3, 0.4, 8), M(0x37474f), 0, 0, 0);
    return g;
  };
  const gears = [gear(torso, 0.7, 0.6, 0.3, 1.0), gear(torso, 0.45, -0.7, -0.5, 1.0), gear(torso, 0.6, 0, 0.5, -1.0)];
  for (const [x, y, w, d] of [[1.2, 1.3, 0.3, 1.6], [-1.3, 1.1, 0.3, 1.2]]) part(torso, boxGeo(w, 0.3, d), M(0x5d4037), x, y, 0); // scrap plates
  part(torso, boxGeo(0.3, 1.8, 0.3), dark, 1.3, 0, 0.9).rotation.z = 0.4; // girder
  const walk = h.anim;
  h.anim = (phase, t) => {
    walk(phase, t);
    gears.forEach((g, i) => (g.rotation.z = t * (i % 2 ? -2 : 1.5)));
  };
  return h;
}

/** Insane mode Timeling: a walking clock with spindly legs and spinning hands. */
export function makeTimelingModel(def) {
  const h = creature();
  const { M } = h;
  const brass = M(def.skin);
  const face = M(0xfff8e1);
  const black = M(0x212121);
  const clockG = new THREE.Group();
  clockG.position.y = 2.6;
  h.body.add(clockG);
  part(clockG, cylGeoX(1.2, 1.2, 0.6, 20), brass, 0, 0, 0);
  part(clockG, cylGeoX(1.0, 1.0, 0.1, 20), face, 0, 0, 0.32);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    part(clockG, boxGeo(0.08, 0.18, 0.05), black, Math.sin(a) * 0.85, Math.cos(a) * 0.85, 0.38).rotation.z = -a;
  }
  const big = new THREE.Group();
  const small = new THREE.Group();
  big.position.z = small.position.z = 0.42;
  part(big, boxGeo(0.08, 0.8, 0.04), black, 0, 0.4, 0);
  part(small, boxGeo(0.12, 0.5, 0.04), black, 0, 0.25, 0);
  clockG.add(big, small);
  part(clockG, boxGeo(0.4, 0.4, 0.4), brass, 0, 1.35, 0); // winding knob
  eyes(h, clockG, 0.35, 0.4, { spread: 0.35, size: 0.22, white: 0xffd740, glowing: true });
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.5, 1.6, 0);
    h.body.add(leg);
    part(leg, boxGeo(0.2, 1.6, 0.2), black, 0, -0.8, 0);
    part(leg, boxGeo(0.4, 0.15, 0.6), brass, 0, -1.6, 0.15);
    legs.push(leg);
  }
  h.anim = (phase, t) => {
    big.rotation.z = -t * 6;
    small.rotation.z = -t * 0.5;
    const sw = Math.sin(phase * 1.2) * 0.6;
    legs[0].rotation.x = sw;
    legs[1].rotation.x = -sw;
    clockG.rotation.z = Math.sin(phase * 0.6) * 0.12;
    clockG.position.y = 2.6 + Math.abs(Math.sin(phase * 1.2)) * 0.15;
  };
  return h;
}

/** Insane mode Rewind: a cyan blur of a creature, a spinning reverse arrow with a trail. */
export function makeRewindModel(def) {
  const h = creature();
  const { M } = h;
  const core = glow(h, def.skin);
  const white = glow(h, 0xffffff);
  const g = new THREE.Group();
  g.position.y = 1.6;
  h.body.add(g);
  part(g, boxGeo(1.2, 1.2, 1.2), core, 0, 0, 0).rotation.set(0.6, 0.6, 0);
  const ring = new THREE.Group();
  g.add(ring);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    part(ring, boxGeo(0.25, 0.25, 0.5), i % 2 ? white : core, Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0).rotation.z = a;
  }
  // Reverse arrows (◀◀) on both sides.
  const arrows = M(0x006064);
  for (const side of [-1, 1]) {
    for (const k of [0, 0.5]) part(g, boxGeo(0.1, 0.6, 0.35), arrows, side * 0.62, 0, 0.2 - k).rotation.x = 0.6;
  }
  for (let i = 1; i <= 3; i++) {
    const m = glow(h, def.skin);
    m.transparent = true;
    m.opacity = 0.5 / i;
    part(h.body, boxGeo(1.1 - i * 0.2, 1.1 - i * 0.2, 0.8), m, 0, 1.6, -i * 1.1); // afterimages
  }
  h.anim = (phase, t) => {
    ring.rotation.z = t * 12;
    g.position.y = 1.6 + Math.sin(t * 9) * 0.15;
  };
  return h;
}

/**
 * Insane mode Time Titan: a towering clockwork giant with a pendulum belly. Its gold armor shows
 * only while it's up (setArmored).
 */
export function makeTimeTitanModel(def) {
  const h = makeGolemModel();
  const [rock, dark, moss] = h.mats;
  rock.color.setHex(0x37474f);
  dark.color.setHex(0x263238);
  moss.color.setHex(0x7c4dff);
  const { M } = h;
  const torso = h.body.children[0];
  const gold = glow(h, def.skin);
  gold.emissiveIntensity = 0.3;
  part(torso, cylGeoX(0.9, 0.9, 0.15, 16), M(0xfff8e1), 0, 0.3, 1.0); // clock chest
  const hand = new THREE.Group();
  hand.position.set(0, 0.3, 1.1);
  torso.add(hand);
  part(hand, boxGeo(0.1, 0.7, 0.05), M(0x111111), 0, 0.3, 0);
  const pend = new THREE.Group();
  pend.position.set(0, -0.8, 1.0);
  torso.add(pend);
  part(pend, boxGeo(0.1, 1.2, 0.1), gold, 0, -0.6, 0);
  part(pend, cylGeoX(0.35, 0.35, 0.15, 12), gold, 0, -1.25, 0);
  // Armor: gold plates on the chest, shoulders and head.
  const armor = new THREE.Group();
  h.body.add(armor);
  const plate = M(0xffc400);
  part(armor, boxGeo(3.2, 1.0, 2.2), plate, 0, 4.6, 0);
  for (const side of [-1, 1]) part(armor, boxGeo(1.6, 0.6, 1.6), plate, side * 2.0, 4.8, 0);
  part(armor, boxGeo(1.7, 0.5, 1.6), plate, 0, 6.1, 0.2);
  for (const side of [-1, 1]) part(armor, boxGeo(0.3, 0.9, 0.3), gold, side * 0.6, 6.6, 0.2);
  h.setArmored = (on) => (armor.visible = on);
  const walk = h.anim;
  h.anim = (phase, t) => {
    walk(phase, t);
    hand.rotation.z = -t * 2;
    pend.rotation.z = Math.sin(t * 3) * 0.5;
  };
  return h;
}

/** Insane mode Time Parasite: a flying violet insect of time with a stinger that fires lasers. */
export function makeTimeParasiteModel(def) {
  const h = creature();
  const { M } = h;
  const shell = M(def.skin);
  const dark = M(0x1a0f3a);
  const g = glow(h, 0xb388ff);
  const body = new THREE.Group();
  body.position.y = 1.8;
  h.body.add(body);
  part(body, boxGeo(1.4, 1.1, 2.6), shell, 0, 0, 0);
  part(body, boxGeo(1.0, 0.9, 1.0), dark, 0, 0.1, 1.6); // head
  eyes(h, body, 0.25, 2.12, { spread: 0.3, size: 0.25, white: 0xffd740, glowing: true });
  part(body, boxGeo(0.9, 0.8, 1.4), shell, 0, -0.2, -1.9); // abdomen
  part(body, boxGeo(0.25, 0.25, 0.9), g, 0, -0.3, -3.0); // stinger
  for (let i = 0; i < 3; i++) part(body, boxGeo(1.45, 0.12, 0.2), g, 0, 0.56, -0.8 + i * 0.6); // glowing bands
  const wings = [];
  for (const side of [-1, 1]) {
    const w = new THREE.Group();
    w.position.set(side * 0.7, 0.6, 0.2);
    body.add(w);
    const wm = M(0xd1c4e9, { transparent: true, opacity: 0.55 });
    part(w, boxGeo(2.6, 0.06, 1.2), wm, side * 1.3, 0, 0);
    wings.push(w);
  }
  for (const side of [-1, 1]) for (const z of [-0.6, 0.2, 0.9]) part(body, boxGeo(0.12, 0.9, 0.12), dark, side * 0.75, -0.8, z).rotation.z = side * 0.4;
  h.anim = (phase, t) => {
    const flap = Math.sin(t * 30) * 0.5;
    wings[0].rotation.z = flap;
    wings[1].rotation.z = -flap;
    body.position.y = 1.8 + Math.sin(t * 2) * 0.3;
  };
  return h;
}
