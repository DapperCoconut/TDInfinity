// Enemy looks: crystal and overlord parts, and the creatures that are not shaped like a person
// (slimes, goblins, spiders, ghosts, golems, the reaper...).

import * as THREE from 'three';
import { boxGeo, makeHumanoid, part } from './kit.js';
import { creature, crown, cylGeo, eyes, glow } from './bits.js';

/**
 * Expert mode crystal creatures (def.crystal): faceless blue crystal bodies with glowing shards,
 * plus each one's gear. The Overlord is a giant white-armored king with a pink crown and scepter.
 */
export function crystalParts(h, def) {
  const { M } = h;
  const shard = glow(h, def.shard);
  const skin = M(def.skin);
  const deep = M(new THREE.Color(def.skin).multiplyScalar(0.6).getHex());
  // A crystal spike: a thin box tilted outward.
  const spike = (parent, mat, x, y, z, w, len, rz = 0, rx = 0) => {
    const m = part(parent, boxGeo(w, len, w), mat, x, y, z);
    m.rotation.set(rx, 0, rz);
    return m;
  };
  // The only "face": a cluster of glowing shards.
  const faceShards = (big = 1) => {
    spike(h.head, shard, 0, 0.75, 0.62, 0.22 * big, 0.7 * big, 0.15);
    spike(h.head, shard, -0.28, 0.6, 0.62, 0.14 * big, 0.45 * big, -0.35);
    spike(h.head, shard, 0.3, 0.55, 0.62, 0.12 * big, 0.35 * big, 0.5);
  };
  // Crystal growths on the shoulders, head and back.
  const growths = (mat = skin, n = 1) => {
    for (const side of [-1, 1]) {
      spike(h.torso, mat, side * 0.9, 1.2, -0.1, 0.35, 1.0 * n, -side * 0.5);
      spike(h.torso, mat, side * 0.5, 1.1, -0.45, 0.25, 0.7 * n, -side * 0.25, -0.4);
    }
    spike(h.head, mat, 0.25, 1.35, -0.1, 0.3, 0.8 * n, -0.3);
    spike(h.head, mat, -0.3, 1.3, 0.1, 0.22, 0.6 * n, 0.4);
    spike(h.torso, shard, 0, 0.6, -0.55, 0.3, 1.2 * n, 0, -0.5);
  };
  // The arms point forward, so in an arm's frame -y is forward and +z is up: the shield is a slab
  // in front of the left hand, `w` wide and `hh` tall, with a glowing cross on its face.
  const shieldOn = (w, hh, mat) => {
    const g = new THREE.Group();
    g.position.set(-0.5, -2.3, 0.2);
    h.leftArm.add(g);
    part(g, boxGeo(w, 0.3, hh), mat, 0, 0, 0);
    part(g, boxGeo(0.2, 0.12, hh * 0.85), shard, 0, -0.18, 0);
    part(g, boxGeo(w * 0.85, 0.12, 0.2), shard, 0, -0.18, 0);
    return g;
  };
  switch (def.crystal) {
    case 'invader':
      faceShards();
      growths();
      part(h.torso, boxGeo(0.4, 0.4, 0.08), shard, 0.4, 0.3, 0.52);
      break;
    case 'shielder':
    case 'rusher': {
      faceShards();
      growths(deep, def.crystal === 'rusher' ? 0.7 : 1);
      // A big crystal shield held out in front.
      const glass = M(def.shard);
      glass.transparent = true;
      glass.opacity = 0.75;
      shieldOn(def.crystal === 'rusher' ? 2.4 : 3.4, def.crystal === 'rusher' ? 2.4 : 3.6, glass);
      if (def.crystal === 'rusher') for (const leg of [h.rightLeg, h.leftLeg]) spike(leg, shard, 0, -1.2, -0.55, 0.2, 0.9, 0, -0.9); // speed fins
      break;
    }
    case 'shielderBroken':
    case 'rusherBroken': {
      faceShards();
      growths(deep, 0.7);
      // What's left of the shield, and crystal armor plates.
      const glass = M(def.shard);
      glass.transparent = true;
      glass.opacity = 0.75;
      const g = shieldOn(1.4, 1.2, glass);
      g.rotation.z = 0.4;
      part(h.torso, boxGeo(2.2, 1.6, 1.2), deep, 0, 0.1, 0);
      for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.25, 0.6, 1.25), deep, 0, -0.2, 0);
      if (def.crystal === 'rusherBroken') for (const leg of [h.rightLeg, h.leftLeg]) spike(leg, shard, 0, -1.2, -0.55, 0.2, 0.9, 0, -0.9);
      break;
    }
    case 'devotee':
    case 'reviver': {
      const big = def.crystal === 'reviver';
      const robe = M(def.robe);
      part(h.body, boxGeo(2.3, 2.1, 1.4), robe, 0, 1.0, 0);
      part(h.torso, boxGeo(2.15, 2.05, 1.15), robe, 0, 0, 0);
      part(h.head, boxGeo(1.4, 1.35, 1.25), robe, 0, 0.68, -0.12); // hood
      faceShards(big ? 1.2 : 1);
      part(h.torso, boxGeo(0.5, 0.7, 0.1), shard, 0, 0.3, 0.6); // glowing chest shard
      if (big) {
        // A crown of shards and a staff topped with a green crystal.
        for (let i = 0; i < 5; i++) spike(h.head, shard, -0.5 + i * 0.25, 1.5, 0.3, 0.14, 0.5 + (i === 2 ? 0.4 : 0), (i - 2) * -0.2);
        part(h.rightArm, boxGeo(0.25, 0.25, 6), M(0x0d1452), 0, -2.1, 0.6);
        spike(h.rightArm, shard, 0, -2.1, 3.9, 0.5, 1.2, 0, Math.PI / 2);
        growths(skin, 1.3);
      }
      break;
    }
    case 'pure':
      faceShards();
      growths(shard, 1.1);
      for (const [x, y] of [[-0.5, 0.5], [0.5, -0.2], [0, 0.9]]) spike(h.torso, shard, x, y, 0.52, 0.2, 0.5, x);
      break;
    case 'taint':
      faceShards();
      growths(skin, 1.3);
      for (const limb of [h.rightArm, h.leftArm, h.rightLeg, h.leftLeg]) spike(limb, shard, 0.45, -1.2, 0, 0.12, 0.8, -0.6);
      break;
    case 'jetpacker': {
      faceShards();
      growths(skin, 0.6);
      const metal = M(0x37474f);
      part(h.torso, boxGeo(1.6, 1.8, 0.8), metal, 0, 0.1, -0.9); // jetpack
      for (const x of [-0.5, 0.5]) {
        part(h.torso, boxGeo(0.5, 0.6, 0.5), metal, x, -0.9, -0.9);
        part(h.torso, boxGeo(0.4, 0.5, 0.4), glow(h, 0x40c4ff), x, -1.35, -0.9);
      }
      part(h.torso, boxGeo(2.1, 1.2, 1.15), M(0x455a64), 0, 0.4, 0); // armored vest
      break;
    }
    case 'engineer': {
      faceShards(1.1);
      growths(skin, 0.8);
      const yellow = M(0xfdd835);
      part(h.head, boxGeo(1.45, 0.45, 1.45), yellow, 0, 1.3, 0); // hard hat
      part(h.head, boxGeo(1.6, 0.12, 0.5), yellow, 0, 1.1, 0.6);
      part(h.body, boxGeo(2.15, 0.35, 1.15), M(0x5d4037), 0, 2.15, 0); // tool belt
      part(h.torso, boxGeo(1.6, 1.8, 1.0), M(0x455a64), 0, 0.1, -1.0); // backpack
      part(h.torso, boxGeo(0.12, 1.6, 0.12), M(0x212121), 0.5, 1.6, -1.1); // antenna
      part(h.torso, boxGeo(0.3, 0.3, 0.3), shard, 0.5, 2.4, -1.1);
      // Giant wrench.
      part(h.rightArm, boxGeo(0.3, 0.3, 3.5), M(0x90a4ae), 0, -2.1, 1.4);
      part(h.rightArm, boxGeo(0.9, 0.35, 0.6), M(0x90a4ae), 0, -2.1, 3.2);
      break;
    }
    case 'robot': {
      const metal = M(0x78909c);
      part(h.head, boxGeo(1.3, 1.3, 1.3), metal, 0, 0.62, 0);
      part(h.head, boxGeo(1.0, 0.22, 0.08), shard, 0, 0.75, 0.66); // visor
      part(h.head, boxGeo(0.12, 0.7, 0.12), metal, 0.35, 1.5, 0);
      part(h.head, boxGeo(0.25, 0.25, 0.25), shard, 0.35, 1.9, 0);
      part(h.torso, boxGeo(0.5, 0.5, 0.08), shard, 0, 0.3, 0.6);
      break;
    }
    case 'overlord':
      overlordParts(h, def, shard, spike);
      break;
  }
}

/** The Overlord (see the reference art): white armor, pink glows, a tall star crown and a scepter. */
export function overlordParts(h, def, pink, spike) {
  const { M } = h;
  const white = M(0xeceff1);
  const silver = M(0xb0bec5);
  const dark = M(0x263238);
  const black = M(0x111111);
  const crownM = glow(h, 0xff8a80);
  crownM.emissiveIntensity = 0.5;
  // Chest: layered white plates with black bands and a pink diamond.
  part(h.torso, boxGeo(2.4, 2.2, 1.4), white, 0, 0.05, 0);
  for (const y of [0.55, 0.2]) part(h.torso, boxGeo(2.45, 0.14, 1.45), black, 0, y, 0);
  part(h.torso, boxGeo(0.5, 0.5, 0.1), black, 0, -0.2, 0.72).rotation.z = Math.PI / 4;
  part(h.torso, boxGeo(0.3, 0.3, 0.12), pink, 0, -0.2, 0.74).rotation.z = Math.PI / 4;
  part(h.torso, boxGeo(1.2, 0.9, 0.1), silver, 0, -0.75, 0.71);
  // Huge shoulder pauldrons with hexagon gems.
  for (const [arm, side] of [[h.rightArm, -1], [h.leftArm, 1]]) {
    part(arm, boxGeo(1.9, 1.3, 1.9), white, side * 0.15, 0.05, 0);
    for (const y of [-0.15, 0.25]) part(arm, boxGeo(1.95, 0.1, 1.95), silver, side * 0.15, y, 0);
    part(arm, boxGeo(0.45, 0.45, 0.1), pink, side * -0.2, -0.05, 1.0);
    part(arm, boxGeo(1.3, 1.3, 1.3), dark, 0, -1.3, 0); // gauntlet
    part(arm, boxGeo(0.25, 0.25, 0.1), pink, 0, -1.3, 0.67);
  }
  // Tassets and dark legs with pink knee gems.
  part(h.body, boxGeo(2.4, 1.0, 1.4), silver, 0, 1.7, 0);
  for (const leg of [h.rightLeg, h.leftLeg]) {
    part(leg, boxGeo(1.15, 1.8, 1.15), dark, 0, -1.0, 0);
    part(leg, boxGeo(1.2, 0.12, 1.2), silver, 0, -1.6, 0);
    part(leg, boxGeo(0.35, 0.35, 0.1), pink, 0, -1.3, 0.6).rotation.z = Math.PI / 4;
  }
  // Silver crystal spikes and pink crystals fanning out behind the shoulders.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) spike(h.torso, silver, side * (0.5 + i * 0.35), 1.5 + i * 0.15, -0.5, 0.3, 1.6 - i * 0.3, -side * (0.2 + i * 0.25));
    for (let i = 0; i < 3; i++) spike(h.torso, pink, side * (1.0 + i * 0.4), 1.0 + i * 0.5, -0.8, 0.45, 1.6, -side * (0.6 + i * 0.3), -0.3);
  }
  // The crown: a pink band with a tall spire and a star on top.
  part(h.head, boxGeo(1.35, 0.3, 1.35), crownM, 0, 1.25, 0);
  for (let i = 0; i < 5; i++) part(h.head, boxGeo(0.12, 0.12, 0.05), M(0xffffff), -0.5 + i * 0.25, 1.25, 0.69);
  spike(h.head, crownM, 0, 1.9, 0.1, 0.4, 1.2);
  spike(h.head, crownM, 0, 2.7, 0.1, 0.22, 1.0);
  spike(h.head, crownM, 0, 3.4, 0.1, 0.1, 0.8);
  part(h.head, boxGeo(0.3, 0.3, 0.1), pink, 0, 1.75, 0.32).rotation.z = Math.PI / 4;
  const star = part(h.head, boxGeo(0.35, 0.35, 0.1), glow(h, 0xffffff), 0, 3.95, 0.1);
  star.rotation.z = Math.PI / 4;
  for (const side of [-1, 1]) spike(h.head, crownM, side * 0.55, 1.6, 0.1, 0.18, 0.5, -side * 0.3);
  // Scepter in the right hand.
  part(h.rightArm, boxGeo(0.3, 0.3, 6.5), silver, 0, -2.1, 0.8);
  part(h.rightArm, boxGeo(0.7, 0.7, 0.7), white, 0, -2.1, 4.1);
  spike(h.rightArm, pink, 0, -2.1, 4.9, 0.45, 1.3, 0, Math.PI / 2);
}

/** Expert mode Drone: a low, fast crystal car with glowing shard fins. */
export function makeCrystalCarModel(def) {
  const h = creature();
  const { M } = h;
  const body = M(def.skin);
  const deep = M(0x0277bd);
  const shard = glow(h, def.shard);
  const car = new THREE.Group();
  h.body.add(car);
  part(car, boxGeo(2.4, 0.8, 4.2), body, 0, 0.9, 0);
  part(car, boxGeo(2.0, 0.7, 2.0), deep, 0, 1.6, -0.3); // cabin
  part(car, boxGeo(1.8, 0.4, 0.08), shard, 0, 1.6, 0.72); // glowing windshield strip
  for (const x of [-0.7, 0.7]) part(car, boxGeo(0.4, 0.2, 0.08), shard, x, 0.95, 2.12); // headlights
  for (const side of [-1, 1]) {
    const fin = part(car, boxGeo(0.15, 1.2, 1.4), shard, side * 0.9, 1.8, -1.6);
    fin.rotation.z = -side * 0.35;
  }
  h.wheels = [];
  for (const [x, z] of [[-1, -1.3], [1, -1.3], [-1, 1.3], [1, 1.3]]) {
    const w = part(h.body, cylGeo(0.5, 0.5, 0.35, 10), M(0x263238), x * 1.25, 0.5, z);
    w.rotation.z = Math.PI / 2;
    h.wheels.push(w);
  }
  h.anim = (phase, t) => {
    for (const w of h.wheels) w.rotation.x = phase * 3;
    car.position.y = Math.abs(Math.sin(t * 20)) * 0.05;
  };
  return h;
}

/** Expert mode UFO: a big saucer of blue crystal with a glowing underside and a laser cannon. */
export function makeCrystalUfoModel(def) {
  const h = creature();
  const { M } = h;
  const craft = new THREE.Group();
  craft.position.y = 0.6;
  h.body.add(craft);
  const crystal = M(def.skin);
  const deep = M(0x01579b);
  const shard = glow(h, def.shard);
  part(craft, cylGeo(2.4, 1.5, 0.6, 8), crystal, 0, 0.5, 0);
  part(craft, cylGeo(1.4, 2.4, 0.4, 8), deep, 0, 0.98, 0);
  part(craft, cylGeo(0.9, 0.6, 0.35, 8), shard, 0, 0.1, 0); // glowing underside
  const top = part(craft, cylGeo(0.2, 1.0, 1.2, 6), crystal, 0, 1.75, 0);
  top.castShadow = false;
  part(craft, boxGeo(0.25, 0.9, 0.25), shard, 0, 2.6, 0);
  part(craft, boxGeo(0.4, 0.4, 1.2), deep, 0, 0.2, 1.4); // laser cannon
  part(craft, boxGeo(0.2, 0.2, 0.3), glow(h, 0xff1744), 0, 0.2, 2.1);
  const ring = new THREE.Group();
  craft.add(ring);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const m = part(ring, boxGeo(0.25, 0.7, 0.25), shard, Math.sin(a) * 2.3, 0.75, Math.cos(a) * 2.3);
    m.rotation.z = 0.3;
  }
  h.anim = (phase, t) => {
    ring.rotation.y = t * 1.5;
    craft.rotation.z = Math.sin(t * 1.2) * 0.08;
    craft.position.y = 0.6 + Math.sin(t * 1.8) * 0.3;
  };
  return h;
}

/** Engineer teleporter: a ring of crystal pylons around a swirling purple portal. */
export function makeTeleporterModel(def) {
  const h = creature();
  const { M } = h;
  const base = M(0x37474f);
  const shard = glow(h, def.shard);
  part(h.body, cylGeo(2, 2.2, 0.4, 8), base, 0, 0.2, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    part(h.body, boxGeo(0.4, 2.6, 0.4), base, Math.sin(a) * 1.7, 1.5, Math.cos(a) * 1.7);
    part(h.body, boxGeo(0.3, 0.6, 0.3), shard, Math.sin(a) * 1.7, 3.0, Math.cos(a) * 1.7);
  }
  const portal = new THREE.Group();
  portal.position.y = 1.8;
  h.body.add(portal);
  const swirl = glow(h, def.skin);
  swirl.transparent = true;
  swirl.opacity = 0.7;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    part(portal, boxGeo(0.35, 0.35, 1.1), i % 2 ? shard : swirl, Math.sin(a) * 1.0, Math.cos(a) * 1.0, 0).rotation.z = -a;
  }
  part(portal, boxGeo(1.2, 1.2, 0.1), swirl, 0, 0, 0);
  h.anim = (phase, t) => {
    portal.rotation.z = t * 3;
    swirl.opacity = 0.55 + Math.sin(t * 5) * 0.2;
  };
  return h;
}

/** Overlord Amplifier: a floating pink crystal inside spinning white rings. */
export function makeAmplifierModel(def) {
  const h = creature();
  const { M } = h;
  const core = new THREE.Group();
  core.position.y = 2.2;
  h.body.add(core);
  const shard = glow(h, def.shard);
  const white = M(0xeceff1);
  part(core, boxGeo(0.9, 1.6, 0.9), shard, 0, 0, 0).rotation.y = Math.PI / 4;
  const rings = [];
  for (let r = 0; r < 2; r++) {
    const g = new THREE.Group();
    core.add(g);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(g, boxGeo(0.3, 0.3, 0.8), white, Math.sin(a) * 1.4, 0, Math.cos(a) * 1.4).rotation.y = a + Math.PI / 2;
    }
    g.rotation.x = r ? 0.6 : -0.6;
    rings.push(g);
  }
  h.anim = (phase, t) => {
    core.position.y = 2.2 + Math.sin(t * 2.5) * 0.3;
    rings[0].rotation.y = t * 2;
    rings[1].rotation.y = -t * 2.5;
    shard.emissiveIntensity = 0.6 + Math.sin(t * 6) * 0.3;
  };
  return h;
}

/** Hard mode Lava Golem: a golem of dark rock with lava running through it and fire on its back. */
export function makeLavaGolemModel() {
  const h = makeGolemModel();
  const [rock, dark, moss] = h.mats;
  rock.color.setHex(0x3e2723);
  dark.color.setHex(0x212121);
  moss.color.setHex(0xff6d00);
  moss.userData.glow = 0xff3d00;
  moss.emissive.setHex(0xff3d00);
  const torso = h.body.children[0];
  const lava = glow(h, 0xff6d00);
  for (const [x, y, w, hh] of [[-0.6, 0, 0.15, 1.6], [0.4, -0.5, 1.0, 0.15], [0.7, 0.4, 0.15, 0.9]]) {
    part(torso, boxGeo(w, hh, 0.06), lava, x, y, 0.96);
    part(torso, boxGeo(w, hh, 0.06), lava, -x, y, -0.96);
  }
  for (const limb of [h.leftArm, h.rightArm, h.leftLeg, h.rightLeg]) part(limb, boxGeo(1.24, 0.15, 1.24), lava, 0, -1.2, 0);
  const fire = flames(h, h.body, 5, 2.2, 6);
  const walk = h.anim;
  h.anim = (phase, t) => {
    walk(phase, t);
    fire(t);
    lava.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.25;
  };
  return h;
}

export function hazmatSuit(h, def) {
  const { M } = h;
  const suit = M(def.shirt);
  const rubber = M(0x212121);
  const glass = M(0x80deea);
  glass.userData.glow = 0x0b3b40; // keeps its tint after hit flashes
  glass.emissive.setHex(0x0b3b40);
  part(h.head, boxGeo(1.4, 1.4, 1.36), suit, 0, 0.62, 0); // hood
  part(h.head, boxGeo(1.0, 0.55, 0.06), glass, 0, 0.82, 0.7); // visor
  part(h.head, boxGeo(0.7, 0.4, 0.25), rubber, 0, 0.3, 0.75); // respirator
  part(h.head, cylGeo(0.22, 0.22, 0.3, 8), rubber, 0, 0.2, 0.95).rotation.x = Math.PI / 2;
  part(h.torso, boxGeo(0.9, 1.0, 0.5), M(0x9e9e9e), 0, 0.2, -0.75); // air tank
  part(h.torso, boxGeo(0.5, 0.5, 0.06), M(0x212121), 0.45, 0.45, 0.53); // ☢ badge
  part(h.torso, boxGeo(0.3, 0.3, 0.07), M(0xfdd835), 0.45, 0.45, 0.54);
  for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.05, 0.5, 1.05), rubber, 0, -1.8, 0); // gloves
  for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.05, 0.6, 1.1), rubber, 0, -1.75, 0.03); // boots
}

/** Flickering flame cubes on top of a model; returns an anim step. */
export function flames(h, parent, y, w, n, colors = [0xff3d00, 0xff9100, 0xffea00]) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const m = glow(h, colors[i % colors.length]);
    const sz = w * (0.22 + Math.random() * 0.14);
    const f = part(parent, boxGeo(sz, sz * 1.6, sz), m, (Math.random() - 0.5) * w * 0.8, y, (Math.random() - 0.5) * w * 0.8);
    f.castShadow = false;
    list.push({ f, y, off: Math.random() * 10 });
  }
  return (t) => {
    for (const { f, y: y0, off } of list) {
      const k = (t * 2.2 + off) % 1;
      f.position.y = y0 + k * w * 0.7;
      f.scale.setScalar(1 - k * 0.8);
      f.rotation.y = off + t * 3;
    }
  };
}

export function makeSlimeModel(def) {
  const h = creature();
  const { M } = h;
  const col = def.color ?? 0x66bb6a;
  const m = def.fire ? glow(h, col) : M(col);
  if (def.fire) m.emissiveIntensity = def.inferno ? 0.55 : 0.4;
  const blob = new THREE.Group();
  h.body.add(blob);
  part(blob, boxGeo(2.2, 1.4, 2.2), m, 0, 0.7, 0);
  part(blob, boxGeo(1.7, 0.6, 1.7), m, 0, 1.7, 0);
  part(blob, boxGeo(0.9, 0.3, 0.9), m, 0, 2.1, 0);
  const shade = M(new THREE.Color(col).multiplyScalar(0.6).getHex());
  part(blob, boxGeo(2.3, 0.25, 2.3), shade, 0, 0.12, 0); // darker goo at the bottom
  eyes(h, blob, 1.25, 1.12, { spread: 0.5, size: 0.42, white: def.inferno ? 0xffea00 : 0xffffff, glowing: !!def.inferno });
  if (def.inferno || (def.fire && def.boss)) {
    // Angry brows.
    for (const side of [-1, 1]) {
      const b = part(blob, boxGeo(0.6, 0.14, 0.1), M(0x111111), side * 0.5, 1.62, 1.14);
      b.rotation.z = side * -0.35;
    }
  }
  if (def.crown) crown(h, blob, 2.45, 1.0);
  const fire = def.fire ? flames(h, blob, 2.2, 1.6, def.inferno || def.boss ? 9 : 5) : null;
  h.anim = (phase, t) => {
    // Hop: squash on landing, stretch in the air.
    const s = Math.sin(phase * 1.3);
    blob.position.y = Math.max(0, s) * 0.6;
    blob.scale.set(1 - s * 0.08, 1 + s * 0.12, 1 - s * 0.08);
    fire?.(t);
  };
  return h;
}

/** A teardrop-shaped slime body (round bottom, pointed top), `r` wide at its fattest and `top` tall. */
const dropCache = new Map();
function dropGeo(r, top) {
  const k = `${r}|${top}`;
  let g = dropCache.get(k);
  if (!g) {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const a = i / 16; // 0 = bottom centre, 1 = tip
      const y = a * top;
      // A fat rounded base that narrows to a point at the top.
      const w = a < 0.35 ? Math.sqrt(1 - ((0.35 - a) / 0.35) ** 2) * 0.92 + 0.08 * (a / 0.35) : Math.pow(1 - (a - 0.35) / 0.65, 1.3);
      pts.push(new THREE.Vector2(Math.max(0.001, w * r), y));
    }
    pts[0].x = 0.001;
    g = new THREE.LatheGeometry(pts, 18);
    dropCache.set(k, g);
  }
  return g;
}

/** A simple mouth / brow strip on a creature's face. */
function strip(h, parent, w, x, y, z, rot = 0, color = 0x111111) {
  const s = part(parent, boxGeo(w, 0.12, 0.08), h.M(color), x, y, z);
  s.rotation.z = rot;
  s.castShadow = false;
  return s;
}

/** Hop animation shared by the slimes: squash on landing, stretch in the air. */
function slimeHop(blob, high = 0.6) {
  return (phase) => {
    const s = Math.sin(phase * 1.3);
    blob.position.y = Math.max(0, s) * high;
    blob.scale.set(1 - s * 0.08, 1 + s * 0.12, 1 - s * 0.08);
  };
}

/**
 * Easy mode slimes: a glossy teardrop with a pointed top. The plain Slime is purple with dot eyes
 * and a flat wavy mouth; Fire Slimes (orange) and Inferno Slimes (blue) have big black eyes and a smile.
 */
export function makeEasySlimeModel(def) {
  const h = creature();
  const { M } = h;
  const blob = new THREE.Group();
  h.body.add(blob);
  const body = M(def.color ?? 0x9c4dcc);
  body.emissive.setHex(def.color ?? 0x9c4dcc);
  body.emissiveIntensity = 0.12;
  part(blob, dropGeo(1.25, 2.6), body, 0, 0, 0);
  const black = M(0x111111);
  if (def.fireType) {
    // Big black eyes with a white shine, and a small smile.
    for (const side of [-1, 1]) {
      part(blob, boxGeo(0.34, 0.46, 0.1), black, side * 0.36, 0.95, 1.1);
      part(blob, boxGeo(0.12, 0.12, 0.06), M(0xffffff), side * 0.36 + 0.07, 1.06, 1.16);
    }
    strip(h, blob, 0.18, -0.16, 0.6, 1.16, 0.45);
    strip(h, blob, 0.18, 0.16, 0.6, 1.16, -0.45);
    strip(h, blob, 0.16, 0, 0.55, 1.17);
  } else {
    // Two dot eyes and a flat wavy mouth.
    for (const side of [-1, 1]) part(blob, boxGeo(0.18, 0.18, 0.08), black, side * 0.32, 0.95, 1.13);
    for (let i = 0; i < 4; i++) strip(h, blob, 0.18, -0.24 + i * 0.16, 0.62, 1.15, i % 2 ? -0.5 : 0.5);
  }
  h.anim = slimeHop(blob);
  return h;
}

/**
 * The King Slime: a round blue slime with angry slanted brows, a frown and pink blush, a gold
 * crown, a red cape trimmed with white fur, and a yellow scepter topped with a little blue slime drop.
 */
export function makeKingSlimeModel(def) {
  const h = creature();
  const { M } = h;
  const blob = new THREE.Group();
  h.body.add(blob);
  const col = def.color ?? 0x1e88e5;
  const body = M(col);
  body.emissive.setHex(col);
  body.emissiveIntensity = 0.12;
  const ball = part(blob, new THREE.SphereGeometry(1.3, 20, 14), body, 0, 1.2, 0);
  ball.scale.set(1, 0.9, 1);
  part(blob, cylGeo(1.15, 1.2, 0.3, 18), body, 0, 0.15, 0); // flat bottom
  const black = M(0x111111);
  for (const side of [-1, 1]) {
    part(blob, boxGeo(0.2, 0.26, 0.08), black, side * 0.4, 1.35, 1.24);
    strip(h, blob, 0.5, side * 0.42, 1.68, 1.18, side * -0.4); // angry slanted brows
    part(blob, boxGeo(0.34, 0.16, 0.06), M(0xf48fb1), side * 0.75, 1.05, 1.08).castShadow = false; // blush
  }
  // A frown.
  strip(h, blob, 0.3, -0.18, 0.8, 1.24, 0.35);
  strip(h, blob, 0.3, 0.18, 0.8, 1.24, -0.35);
  crown(h, blob, 2.45, 0.95);
  // Red cape with white fur trim along the top.
  const cape = part(blob, boxGeo(2.2, 1.9, 0.12), M(0xc62828), 0, 1.15, -1.15);
  cape.rotation.x = 0.2;
  part(blob, boxGeo(2.4, 0.3, 0.35), M(0xfafafa), 0, 2.0, -1.0);
  for (const x of [-0.8, 0, 0.8]) part(blob, boxGeo(0.12, 0.12, 0.06), black, x, 2.0, -0.82); // ermine spots
  // Yellow scepter with a little blue slime drop on top.
  const sc = new THREE.Group();
  sc.position.set(-1.45, 0.9, 0.4);
  sc.rotation.z = 0.15;
  blob.add(sc);
  part(sc, cylGeo(0.08, 0.08, 2.2, 8), glow(h, 0xffd600), 0, 0.6, 0).material.emissiveIntensity = 0.3;
  part(sc, new THREE.SphereGeometry(0.2, 10, 8), glow(h, 0xffd600), 0, 1.75, 0);
  part(sc, dropGeo(0.22, 0.5), body, 0, 1.9, 0);
  h.anim = slimeHop(blob, 0.35);
  return h;
}

/**
 * Goblin: a small red goblin with one pale horn, little fangs, a ragged green loincloth and a grey
 * frying pan on its head.
 */
export function makeGoblinModel(def) {
  const red = 0xd84343;
  const h = makeHumanoid({ skin: red, shirt: red, pants: red, face: 'goblin' });
  const { M } = h;
  const skin = M(red);
  for (const side of [-1, 1]) {
    const ear = part(h.head, boxGeo(0.8, 0.3, 0.2), skin, side * 0.9, 0.75, 0);
    ear.rotation.z = side * 0.35;
    part(h.head, boxGeo(0.12, 0.22, 0.1), M(0xfafafa), side * 0.22, 0.12, 0.62); // fangs
  }
  // One pale horn poking out from under the pan.
  const horn = part(h.head, boxGeo(0.22, 0.6, 0.22), M(0xefe6c8), 0.38, 1.35, 0.1);
  horn.rotation.z = -0.35;
  // The frying pan, worn upside down like a helmet, handle sticking out the back.
  const pan = M(0x757575);
  part(h.head, cylGeo(0.78, 0.7, 0.28, 14), pan, 0, 1.32, 0);
  part(h.head, boxGeo(0.2, 0.1, 1.1), M(0x424242), 0, 1.3, -1.2);
  // Ragged green loincloth.
  const cloth = M(0x2e7d32);
  part(h.torso, boxGeo(2.1, 0.45, 1.1), cloth, 0, -0.85, 0);
  for (const x of [-0.6, 0.1, 0.65]) part(h.torso, boxGeo(0.45, 0.6, 0.12), cloth, x, -1.3, 0.5);
  for (const x of [-0.4, 0.5]) part(h.torso, boxGeo(0.5, 0.5, 0.12), cloth, x, -1.25, -0.5);
  h.anim = (phase) => {
    const sw = Math.sin(phase) * 0.7;
    h.leftLeg.rotation.x = sw;
    h.rightLeg.rotation.x = -sw;
    h.leftArm.rotation.x = -sw * 0.8;
    h.rightArm.rotation.x = sw * 0.8;
    h.body.position.y = Math.abs(Math.cos(phase)) * 0.2;
    h.body.rotation.x = 0.15; // hunched over
  };
  return h;
}

/** Giant Goblin: a big green goblin with grey horns, pointy ears, an angry face, a grey vest and brown boots. */
export function makeGiantGoblinModel(def) {
  const green = 0x7cb342;
  const h = makeHumanoid({ skin: green, shirt: green, pants: 0x5d4037, face: 'goblin' });
  const { M } = h;
  const skin = M(green);
  for (const side of [-1, 1]) {
    const ear = part(h.head, boxGeo(0.95, 0.35, 0.2), skin, side * 0.95, 0.7, 0);
    ear.rotation.z = side * 0.4;
    const horn = part(h.head, boxGeo(0.25, 0.7, 0.25), M(0x9e9e9e), side * 0.45, 1.45, 0);
    horn.rotation.z = side * -0.35;
    strip(h, h.head, 0.5, side * 0.3, 1.0, 0.63, side * -0.4, 0x1b1b1b); // angry brows
  }
  // Grey vest open over the chest.
  const vest = M(0x616161);
  for (const side of [-1, 1]) part(h.torso, boxGeo(0.75, 2.05, 1.08), vest, side * 0.65, 0, 0);
  part(h.torso, boxGeo(2.05, 2.05, 0.3), vest, 0, 0, -0.42);
  // Brown boots.
  const boot = M(0x4e342e);
  for (const leg of [h.leftLeg, h.rightLeg]) part(leg, boxGeo(1.1, 0.7, 1.3), boot, 0, -1.7, 0.1);
  h.anim = (phase) => {
    const sw = Math.sin(phase * 0.8) * 0.55;
    h.leftLeg.rotation.x = sw;
    h.rightLeg.rotation.x = -sw;
    h.leftArm.rotation.x = -sw * 0.7;
    h.rightArm.rotation.x = sw * 0.7;
    h.body.position.y = Math.abs(Math.cos(phase * 0.8)) * 0.15;
    h.body.rotation.z = Math.sin(phase * 0.8) * 0.04; // heavy stomp
  };
  return h;
}

/** Spider: a round black spider with thin black legs, small fangs and red stripes on its face. */
export function makeSpiderModel(def) {
  const h = creature();
  const { M } = h;
  const black = M(0x1c1c1c);
  const ball = part(h.body, new THREE.SphereGeometry(1.0, 16, 12), black, 0, 1.25, -0.2);
  ball.scale.set(1, 0.9, 1.05);
  const red = M(0xe53935);
  for (const side of [-1, 1]) {
    // Red stripe markings and white eyes on the front.
    const st = part(h.body, boxGeo(0.12, 0.5, 0.08), red, side * 0.55, 1.35, 0.72);
    st.rotation.z = side * 0.4;
    st.castShadow = false;
    part(h.body, boxGeo(0.2, 0.2, 0.08), M(0xffffff), side * 0.25, 1.45, 0.86);
    part(h.body, boxGeo(0.1, 0.32, 0.1), M(0xeeeeee), side * 0.15, 0.82, 0.72); // fangs
  }
  part(h.body, boxGeo(0.12, 0.4, 0.08), red, 0, 1.75, 0.66).castShadow = false;
  h.legs = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.6, 1.2, 0.35 - i * 0.35);
      pivot.rotation.y = side * (0.5 - i * 0.33) * -1;
      h.body.add(pivot);
      const upper = new THREE.Group();
      upper.rotation.z = side * 0.6;
      pivot.add(upper);
      part(upper, boxGeo(1.2, 0.1, 0.1), black, side * 0.6, 0, 0);
      const knee = new THREE.Group();
      knee.position.x = side * 1.2;
      knee.rotation.z = side * -1.6;
      upper.add(knee);
      part(knee, boxGeo(1.8, 0.08, 0.08), black, side * 0.9, 0, 0);
      h.legs.push({ pivot, base: pivot.rotation.y, i, side });
    }
  }
  h.anim = (phase) => {
    for (const l of h.legs) l.pivot.rotation.y = l.base + Math.sin(phase * 2 + (l.i + (l.side > 0 ? 1 : 0)) * Math.PI) * 0.3;
    h.body.position.y = Math.abs(Math.sin(phase * 2)) * 0.08;
  };
  return h;
}

/** Ghost: a plain pale-grey sheet ghost with two black dot eyes and a small open mouth. */
export function makeGhostModel(def) {
  const h = creature();
  const { M } = h;
  const sheet = M(0xd6d9dc);
  const float = new THREE.Group();
  h.body.add(float);
  const head = part(float, new THREE.SphereGeometry(1.0, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), sheet, 0, 2.6, 0);
  head.castShadow = true;
  part(float, cylGeo(1.0, 1.25, 1.9, 16), sheet, 0, 1.65, 0);
  const tails = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    tails.push(part(float, boxGeo(0.5, 0.45, 0.5), sheet, Math.sin(a) * 1.0, 0.55, Math.cos(a) * 1.0));
  }
  const black = M(0x111111);
  for (const side of [-1, 1]) part(float, boxGeo(0.2, 0.24, 0.08), black, side * 0.33, 2.75, 0.96);
  part(float, boxGeo(0.22, 0.26, 0.08), black, 0, 2.25, 1.03); // small open mouth
  h.anim = (phase, t) => {
    float.position.y = 0.4 + Math.sin(t * 2.5 + phase * 0.1) * 0.3;
    float.rotation.z = Math.sin(t * 1.7) * 0.08;
    tails.forEach((tl, i) => (tl.position.y = 0.55 + Math.sin(t * 6 + i * 2) * 0.1));
  };
  return h;
}

/** Shroom: a purple white-spotted mushroom cap over a beige body with an angry frowning face. */
export function makeShroomModel(def) {
  const h = creature();
  const { M } = h;
  const beige = M(0xe8d5b0);
  const stem = new THREE.Group();
  h.body.add(stem);
  part(stem, cylGeo(0.75, 0.9, 1.9, 14), beige, 0, 1.1, 0);
  const cap = part(stem, new THREE.SphereGeometry(1.5, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(0x8e24aa), 0, 1.95, 0);
  cap.scale.y = 0.85;
  part(stem, cylGeo(1.5, 1.5, 0.15, 18), M(0x6a1b9a), 0, 1.95, 0); // underside rim
  const white = M(0xffffff);
  for (const [a, y, r] of [[0.3, 2.9, 1.0], [1.6, 2.5, 1.35], [2.8, 2.7, 1.2], [4.2, 2.5, 1.35], [5.3, 2.75, 1.15], [0, 3.2, 0.3]]) {
    const sp = part(stem, boxGeo(0.4, 0.15, 0.4), white, Math.sin(a) * r, y, Math.cos(a) * r);
    sp.lookAt(0, 1.95, 0);
    sp.castShadow = false;
  }
  const black = M(0x111111);
  for (const side of [-1, 1]) {
    part(stem, boxGeo(0.18, 0.2, 0.08), black, side * 0.3, 1.35, 0.8);
    strip(h, stem, 0.4, side * 0.3, 1.6, 0.8, side * -0.45); // angry brows
  }
  strip(h, stem, 0.24, -0.12, 0.9, 0.86, 0.4); // frown
  strip(h, stem, 0.24, 0.12, 0.9, 0.86, -0.4);
  h.feet = [];
  for (const side of [-1, 1]) h.feet.push(part(h.body, boxGeo(0.5, 0.3, 0.7), beige, side * 0.45, 0.15, 0.1));
  h.anim = (phase) => {
    const sw = Math.sin(phase);
    h.feet[0].position.z = 0.1 + sw * 0.3;
    h.feet[1].position.z = 0.1 - sw * 0.3;
    stem.rotation.z = sw * 0.07;
    stem.position.y = Math.abs(Math.cos(phase)) * 0.12;
  };
  return h;
}

/** Golem: a brown boulder with angry slanted eyes, two floating rock fists and an orange crystal on top. */
export function makeBoulderGolemModel(def) {
  const h = creature();
  const { M } = h;
  const rock = M(0x7b5e45);
  rock.flatShading = true;
  const boulder = new THREE.Group();
  h.body.add(boulder);
  const b = part(boulder, new THREE.IcosahedronGeometry(1.7, 1), rock, 0, 1.9, 0);
  b.scale.set(1, 0.95, 0.95);
  // Orange crystal sticking out of the top.
  const cry = glow(h, 0xff9100);
  cry.emissiveIntensity = 0.5;
  const c1 = part(boulder, new THREE.OctahedronGeometry(0.45), cry, 0.2, 3.65, 0);
  c1.scale.y = 1.8;
  const c2 = part(boulder, new THREE.OctahedronGeometry(0.28), cry, -0.35, 3.45, 0.15);
  c2.scale.y = 1.6;
  c2.rotation.z = 0.4;
  // Angry slanted eyes.
  const black = M(0x111111);
  for (const side of [-1, 1]) {
    const e = part(boulder, boxGeo(0.5, 0.2, 0.1), black, side * 0.45, 2.25, 1.55);
    e.rotation.z = side * -0.35;
  }
  strip(h, boulder, 0.5, 0, 1.6, 1.6);
  // Two floating rock fists.
  const fists = [];
  for (const side of [-1, 1]) {
    const f = part(h.body, new THREE.IcosahedronGeometry(0.6, 0), rock, side * 2.4, 1.6, 0.4);
    fists.push({ f, side });
  }
  h.anim = (phase, t) => {
    boulder.rotation.z = Math.sin(phase * 0.8) * 0.06;
    boulder.position.y = -Math.abs(Math.sin(phase * 0.8)) * 0.12;
    for (const { f, side } of fists) {
      f.position.y = 1.6 + Math.sin(t * 2 + side) * 0.25;
      f.position.z = 0.4 + Math.sin(phase * 0.8 * side) * 0.3;
    }
  };
  return h;
}

/** Reaper: a small black hooded figure with a dark face, two white eyes and a ragged grey cloak. */
export function makeReaperModel(def) {
  const h = creature();
  const { M } = h;
  const cloak = M(0x6e6e6e);
  const hood = M(0x151515);
  const float = new THREE.Group();
  h.body.add(float);
  part(float, cylGeo(0.75, 1.25, 2.6, 12), cloak, 0, 1.6, 0);
  // Ragged cloak hem.
  const rags = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    rags.push(part(float, boxGeo(0.45, 0.6 + (i % 3) * 0.15, 0.2), cloak, Math.sin(a) * 1.15, 0.35, Math.cos(a) * 1.15));
    rags[i].rotation.y = a;
  }
  part(float, new THREE.SphereGeometry(0.85, 14, 10), hood, 0, 3.35, 0); // hood
  part(float, boxGeo(1.0, 0.9, 0.3), M(0x050505), 0, 3.4, 0.62); // dark face
  const eye = glow(h, 0xffffff);
  for (const side of [-1, 1]) part(float, boxGeo(0.16, 0.16, 0.06), eye, side * 0.22, 3.45, 0.79);
  for (const side of [-1, 1]) part(float, boxGeo(0.4, 1.4, 0.45), cloak, side * 0.95, 2.1, 0.1).rotation.z = side * 0.25; // sleeves
  h.anim = (phase, t) => {
    float.position.y = 0.25 + Math.sin(t * 2.2) * 0.15;
    float.rotation.x = 0.08;
    rags.forEach((r, i) => (r.rotation.x = Math.sin(t * 5 + i) * 0.25));
  };
  return h;
}

export function makeGolemModel() {
  const h = creature();
  const { M } = h;
  const rock = M(0x9e9e9e);
  const dark = M(0x757575);
  const moss = M(0x689f38);
  const torso = part(h.body, boxGeo(2.9, 2.5, 1.9), rock, 0, 3.6, 0);
  part(torso, boxGeo(1.2, 0.8, 0.3), dark, -0.5, 0.5, 0.9);
  part(torso, boxGeo(1.4, 0.4, 2.0), moss, 0.3, 1.2, 0);
  const head = part(h.body, boxGeo(1.4, 1.2, 1.3), dark, 0, 5.4, 0.2);
  eyes(h, head, 0.1, 0.66, { spread: 0.33, size: 0.28, white: 0xff9100, glowing: true });
  part(head, boxGeo(1.5, 0.25, 0.4), rock, 0, 0.45, 0.5); // heavy brow
  const limb = (x, y, w, len, mat) => {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    h.body.add(p);
    part(p, boxGeo(w, len, w), mat, 0, -len / 2, 0);
    part(p, boxGeo(w * 1.15, w * 0.7, w * 1.15), dark, 0, -len + w * 0.3, 0);
    return p;
  };
  h.leftArm = limb(2.0, 4.6, 1.2, 3.2, rock);
  h.rightArm = limb(-2.0, 4.6, 1.2, 3.2, rock);
  h.leftLeg = limb(0.75, 2.35, 1.2, 2.2, dark);
  h.rightLeg = limb(-0.75, 2.35, 1.2, 2.2, dark);
  h.anim = (phase) => {
    const sw = Math.sin(phase * 0.8);
    h.leftLeg.rotation.x = sw * 0.45;
    h.rightLeg.rotation.x = -sw * 0.45;
    h.leftArm.rotation.x = -sw * 0.35;
    h.rightArm.rotation.x = sw * 0.35;
    h.body.rotation.z = sw * 0.05;
    h.body.position.y = -Math.abs(sw) * 0.15;
  };
  return h;
}

/** What a Molten (or a Bulwark) leaves behind: a smoldering heap that has to be broken. */
export function makeCorpseModel(def) {
  const h = creature();
  const { M } = h;
  const lava = glow(h, def.lava ?? 0xff6d00);
  const heap = new THREE.Group();
  h.body.add(heap);
  if (def.metal) {
    // Bulwark wreck: twisted armor plates around a still-glowing reactor.
    const metal = M(0x546e7a);
    const dark = M(0x37474f);
    part(heap, boxGeo(2.6, 1.0, 2), metal, 0, 0.5, 0).rotation.y = 0.3;
    part(heap, boxGeo(1.2, 0.8, 1.2), dark, 1.3, 0.4, 1.0).rotation.z = 0.5;
    part(heap, boxGeo(0.6, 0.6, 1.8), dark, -1.4, 0.3, -0.6).rotation.y = 0.8;
    part(heap, boxGeo(0.9, 0.9, 0.9), lava, 0, 1.1, 0);
  } else {
    const rock = M(0x3e2723);
    part(heap, boxGeo(2, 0.8, 1.2), rock, 0, 0.4, 0); // body, lying down
    part(heap, boxGeo(1, 0.8, 1), rock, 1.5, 0.4, 0.1); // head
    part(heap, boxGeo(0.8, 0.5, 1.6), rock, -0.3, 0.25, 1.2).rotation.y = 0.4; // arm
    part(heap, boxGeo(1.4, 0.5, 0.7), rock, -1.6, 0.25, -0.3); // leg
    for (const [x, z, w, d] of [[0, 0, 1.6, 0.12], [0.3, 0.2, 0.12, 0.9], [1.5, 0.1, 0.5, 0.12]]) part(heap, boxGeo(w, 0.08, d), lava, x, 0.82, z);
  }
  const fire = flames(h, heap, 1, def.metal ? 1.6 : 1.2, 4);
  h.anim = (phase, t) => {
    fire(t);
    lava.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.25;
  };
  return h;
}
