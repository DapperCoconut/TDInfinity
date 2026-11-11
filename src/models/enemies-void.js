// Enemy looks for Void: void parts, Tower Battles parts and the void spirit.

import * as THREE from 'three';
import { boxGeo, part, setOpacity } from './kit.js';
import { creature, crown, glow } from './bits.js';

/**
 * Void mode outfits (def.vlook): near-black bodies split by glowing cracks, void shards and
 * crystals. VOID himself: crimson cracks all over, a pink crystal in his chest and a crown of shards.
 */
export function voidParts(h, def) {
  const { M } = h;
  const g = glow(h, def.vglow ?? 0xd500f9);
  const dark = M(0x0d0612);
  const shardM = M(0x1a0f24);
  // Glowing cracks: thin zig-zag lines on a face of a part. [x, y, len, angle] at depth z.
  const cracks = (parent, z, list, mat = g, w = 0.09) => {
    for (const [x, y, len, a] of list) part(parent, boxGeo(w, len, 0.05), mat, x, y, z).rotation.z = a;
  };
  const bodyCracks = (mat = g, w = 0.09) => {
    cracks(h.torso, 0.52, [[-0.5, 0.4, 0.9, 0.5], [-0.2, -0.1, 0.8, -0.6], [0.4, 0.5, 0.7, -0.3], [0.6, -0.4, 0.9, 0.7], [0.1, -0.7, 0.5, 0.2]], mat, w);
    cracks(h.torso, -0.52, [[0.4, 0.3, 1.0, 0.5], [-0.4, -0.3, 0.9, -0.4]], mat, w);
    for (const limb of [h.rightArm, h.leftArm, h.rightLeg, h.leftLeg]) cracks(limb, 0.52, [[0.1, -0.7, 0.7, 0.4], [-0.15, -1.4, 0.6, -0.5]], mat, w);
  };
  // A shard: a thin tilted block sticking out of `parent`, glowing at the tip.
  const shard = (parent, x, y, z, len, rz, rx = 0, tip = g) => {
    const s = new THREE.Group();
    s.position.set(x, y, z);
    s.rotation.set(rx, 0, rz);
    parent.add(s);
    part(s, boxGeo(0.3, len, 0.3), shardM, 0, len / 2, 0);
    part(s, boxGeo(0.22, len * 0.3, 0.22), tip, 0, len * 0.95, 0);
    return s;
  };
  const shardCrown = (n, len, tip = g) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      shard(h.head, Math.sin(a) * 0.5, 1.15, Math.cos(a) * 0.5, len * (0.7 + (i % 3) * 0.2), -Math.sin(a) * 0.35, Math.cos(a) * 0.35, tip);
    }
  };
  // A faint void haze around the body.
  const aura = (color = def.vglow, op = 0.16) => {
    const m = glow(h, color);
    m.transparent = true;
    m.opacity = op;
    m.depthWrite = false;
    m.userData.keepOpacity = op;
    part(h.torso, boxGeo(2.6, 2.6, 1.5), m, 0, 0, 0);
  };
  const plates = (color = def.plate ?? 0x263238) => {
    const pm = M(color);
    part(h.torso, boxGeo(2.25, 1.5, 1.2), pm, 0, 0.3, 0);
    for (const side of [-1, 1]) {
      part(h.torso, boxGeo(1.2, 0.45, 1.3), pm, side * 1.45, 0.95, 0); // pauldrons
      shard(h.torso, side * 1.6, 1.15, 0, 0.9, -side * 0.6);
    }
    for (const leg of [h.rightLeg, h.leftLeg]) part(leg, boxGeo(1.1, 0.9, 1.1), pm, 0, -1.3, 0);
    part(h.head, boxGeo(1.4, 0.6, 1.4), pm, 0, 1.2, 0); // helm
    part(h.head, boxGeo(1.0, 0.12, 0.06), g, 0, 0.75, 0.72); // visor slit
  };
  const sword = (arm, len = 3.6, blade = 0x37474f) => {
    part(arm, boxGeo(0.3, 0.3, 0.9), dark, 0, -2.1, 0.2);
    part(arm, boxGeo(1.1, 0.25, 0.25), shardM, 0, -2.1, 0.7);
    part(arm, boxGeo(0.4, 0.12, len), M(blade), 0, -2.1, 0.8 + len / 2);
    part(arm, boxGeo(0.1, 0.16, len), g, 0.21, -2.1, 0.8 + len / 2);
  };
  // A glowing "?" (for Mysteries), made of blocks, on `parent` at (x, y, z).
  const question = (parent, x, y, z, s, mat) => {
    for (const [px, py] of [[-1, 2], [0, 2.5], [1, 2], [1, 1], [0, 0.4], [0, -0.4], [0, -1.6]]) part(parent, boxGeo(0.8 * s, 0.8 * s, 0.2), mat, x + px * s, y + py * s, z);
  };
  switch (def.vlook) {
    case 'zombie':
      bodyCracks();
      aura();
      for (const side of [-1, 1]) shard(h.torso, side * 0.9, 1.0, -0.3, 0.6, -side * 0.5, -0.3);
      break;
    case 'speedy':
      bodyCracks();
      for (const [x, y, rz] of [[-0.6, 0.6, 0.6], [0, 0.8, 0], [0.6, 0.6, -0.6], [-0.3, 0, 0.9], [0.3, 0, -0.9]]) shard(h.torso, x, y, -0.5, 0.8, rz, -1.0);
      for (const arm of [h.rightArm, h.leftArm]) shard(arm, 0, -0.8, -0.5, 0.6, 0, -1.2);
      break;
    case 'crystal': {
      bodyCracks();
      const cm = glow(h, 0x7c4dff);
      cm.emissiveIntensity = 0.35;
      for (const [x, y, z, s, rz] of [[-1.2, 1.1, 0, 1.4, 0.5], [1.2, 1.2, 0, 1.6, -0.5], [0, 1.0, -0.6, 1.8, 0], [-0.6, 0.3, -0.6, 1.2, 0.4], [0.7, -0.2, -0.6, 1.1, -0.4]]) {
        part(h.torso, boxGeo(0.7, s, 0.7), cm, x, y + s / 2 - 0.3, z).rotation.z = rz;
      }
      part(h.head, boxGeo(1.45, 0.5, 1.45), cm, 0, 1.25, 0);
      for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.25, 1.0, 1.25), cm, 0, -0.6, 0);
      break;
    }
    case 'ninja':
    case 'shadow': {
      const big = def.vlook === 'shadow';
      part(h.head, boxGeo(1.3, 0.75, 1.3), dark, 0, 0.35, 0); // mask
      part(h.head, boxGeo(1.3, 0.35, 1.3), dark, 0, 1.15, 0); // hood top
      part(h.head, boxGeo(0.9, 0.14, 0.06), g, 0, 0.82, 0.66); // glowing eye slit
      part(h.head, boxGeo(1.35, 0.18, 1.35), glow(h, big ? 0xff1744 : 0xd500f9), 0, 1.0, 0); // headband
      for (const i of [0, 1]) part(h.head, boxGeo(0.15, 0.12, 1.2), glow(h, big ? 0xff1744 : 0xd500f9), 0.2 * i - 0.1, 1.0 - i * 0.2, -1.1).rotation.x = 0.4 + i * 0.3;
      part(h.torso, boxGeo(2.05, 0.3, 1.05), glow(h, big ? 0xff1744 : 0x4a148c), 0, -0.6, 0); // sash
      cracks(h.torso, 0.52, [[-0.4, 0.4, 0.8, 0.6], [0.4, 0.1, 0.8, -0.5]]);
      // Shuriken on the back.
      const star = new THREE.Group();
      star.position.set(0, 0.3, -0.6);
      h.torso.add(star);
      for (const a of [0, Math.PI / 2]) part(star, boxGeo(1.0, 0.2, 0.08), M(0x9e9e9e), 0, 0, 0).rotation.z = a + Math.PI / 4;
      if (big) {
        // Two katanas crossed on its back, and one in hand.
        for (const side of [-1, 1]) {
          const k = part(h.torso, boxGeo(0.12, 3.4, 0.2), M(0xb0bec5), side * 0.3, 0.4, -0.65);
          k.rotation.z = side * 0.6;
        }
        sword(h.rightArm, 3.0, 0xb0bec5);
        part(h.body, boxGeo(0.6, 1.8, 0.1), glow(h, 0xff1744), 0, 3.6, -0.8).rotation.x = 0.3; // scarf tail
      }
      break;
    }
    case 'voidkin':
    case 'voidkinBare': {
      bodyCracks(g, def.vlook === 'voidkinBare' ? 0.16 : 0.09);
      shardCrown(6, 0.9);
      if (def.vlook === 'voidkin') {
        plates(0x1a1a24);
        part(h.torso, boxGeo(0.6, 0.6, 0.08), g, 0, 0.4, 0.63);
      } else {
        aura(0xd500f9, 0.22);
        for (const side of [-1, 1]) shard(h.torso, side * 1.0, 1.0, 0, 1.2, -side * 0.7);
      }
      break;
    }
    case 'mystery':
    case 'mysteryPrime': {
      const prime = def.vlook === 'mysteryPrime';
      bodyCracks(glow(h, 0x7c4dff));
      question(h.torso, 0, -0.15, 0.53, 0.22, g);
      const q = new THREE.Group();
      q.position.set(0, 2.6, 0);
      h.head.add(q);
      question(q, 0, 0, 0, 0.28, g);
      if (prime) {
        crown(h, h.head, 1.35, 1.3);
        aura(0xffd740, 0.14);
      }
      break;
    }
    case 'necro':
    case 'lich': {
      const lich = def.vlook === 'lich';
      const bone = M(0xe8e4d0);
      // Robe and a wendigo skull with antlers (the Lich wears a crown of void shards too).
      part(h.body, boxGeo(2.3, 2.6, 1.4), M(def.robe ?? 0x1a0a24), 0, 1.3, 0);
      part(h.head, boxGeo(1.35, 1.1, 1.4), bone, 0, 0.75, 0.08); // skull
      part(h.head, boxGeo(0.9, 0.5, 0.6), bone, 0, 0.25, 0.65); // snout
      for (const side of [-1, 1]) {
        part(h.head, boxGeo(0.35, 0.3, 0.08), glow(h, def.vglow), side * 0.33, 0.9, 0.79); // eye sockets
        const ant = new THREE.Group();
        ant.position.set(side * 0.55, 1.2, 0);
        ant.rotation.z = -side * 0.5;
        h.head.add(ant);
        part(ant, boxGeo(0.2, 1.6, 0.2), bone, 0, 0.8, 0);
        part(ant, boxGeo(0.18, 0.8, 0.18), bone, side * 0.3, 1.2, 0).rotation.z = -side * 0.8;
        part(ant, boxGeo(0.18, 0.7, 0.18), bone, -side * 0.25, 1.4, 0).rotation.z = side * 0.6;
      }
      // Staff with a glowing orb.
      part(h.rightArm, boxGeo(0.22, 0.22, 5.5), M(0x3e2723), 0, -2.1, 0.8);
      part(h.rightArm, boxGeo(0.7, 0.7, 0.7), g, 0, -2.1, 3.7);
      if (lich) {
        shardCrown(5, 0.8);
        for (const side of [-1, 1]) part(h.torso, boxGeo(0.5, 0.5, 0.5), bone, side * 1.4, 1.2, 0); // skull pauldrons
        aura(def.vglow, 0.12);
      }
      break;
    }
    case 'skeleton':
    case 'skeletonLord': {
      // Void-touched bones: glowing ribs.
      for (const y of [0.5, 0.1, -0.3]) part(h.torso, boxGeo(1.4, 0.12, 0.06), g, 0, y, 0.53);
      if (def.vlook === 'skeletonLord') {
        plates(def.plate);
        for (const side of [-1, 1]) part(h.head, boxGeo(0.2, 0.9, 0.2), M(0xe8e4d0), side * 0.7, 1.6, 0).rotation.z = -side * 0.5; // horns
        // Battleaxe.
        part(h.rightArm, boxGeo(0.22, 0.22, 4), M(0x5d4037), 0, -2.1, 1.2);
        part(h.rightArm, boxGeo(0.2, 1.6, 1.2), M(0x90a4ae), 0, -2.1, 2.8);
        part(h.rightArm, boxGeo(0.22, 1.4, 0.1), g, 0, -2.1, 3.4);
      }
      break;
    }
    case 'colossus': {
      bodyCracks(g, 0.14);
      const rock = M(0x1a1220);
      for (const side of [-1, 1]) {
        part(h.torso, boxGeo(1.5, 1.2, 1.6), rock, side * 1.5, 1.0, 0); // boulder shoulders
        shard(h.torso, side * 1.6, 1.5, 0, 1.4, -side * 0.4);
        part(h.head, boxGeo(0.3, 1.2, 0.3), rock, side * 0.6, 1.4, 0).rotation.z = -side * 0.6; // horns
      }
      for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.4, 1.2, 1.4), rock, 0, -1.6, 0); // fists
      part(h.torso, boxGeo(0.5, 0.5, 0.08), glow(h, 0xff1744), 0, 0.3, 0.55);
      break;
    }
    case 'lava':
      cracks(h.torso, 0.52, [[-0.6, -0.3, 0.8, 0.3]], g);
      shardCrown(4, 0.6, glow(h, 0xff3d00));
      break;
    case 'toxic': {
      bodyCracks(glow(h, 0x76ff03));
      part(h.head, boxGeo(1.0, 0.6, 0.3), dark, 0, 0.45, 0.7); // gas mask
      for (const side of [-1, 1]) part(h.head, boxGeo(0.35, 0.35, 0.3), glow(h, 0x76ff03), side * 0.3, 0.8, 0.68);
      part(h.torso, boxGeo(1.1, 1.6, 0.7), M(0x33691e), 0, 0.1, -0.85); // acid tank
      part(h.torso, boxGeo(0.8, 1.2, 0.1), glow(h, 0x76ff03), 0, 0.1, -1.22);
      for (const [x, y] of [[-0.6, -0.9], [0.5, -1.0], [0, -0.8]]) part(h.torso, boxGeo(0.18, 0.5, 0.18), glow(h, 0x64dd17), x, y, 0.5); // drips
      break;
    }
    case 'bolt': {
      const b = glow(h, 0x40c4ff);
      bodyCracks(b, 0.12);
      // Lightning bolts zig-zagging off its head and back.
      for (const side of [-1, 1]) {
        const z = new THREE.Group();
        z.position.set(side * 0.5, 1.2, 0);
        h.head.add(z);
        part(z, boxGeo(0.18, 0.7, 0.18), b, 0, 0.3, 0).rotation.z = side * 0.6;
        part(z, boxGeo(0.18, 0.7, 0.18), b, side * 0.35, 0.8, 0).rotation.z = -side * 0.6;
      }
      for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.16, 1.4, 0.16), b, x, 0.2, -0.6).rotation.z = x;
      break;
    }
    case 'goo': {
      const goo = glow(h, def.vglow);
      goo.emissiveIntensity = 0.25;
      for (const [p, x, y, z, s] of [[h.torso, 0.6, 1.0, 0.4, 0.8], [h.torso, -0.7, -0.3, 0.4, 0.9], [h.torso, 0.3, -0.9, -0.4, 0.7], [h.head, 0.4, 1.3, 0.2, 0.7],
        [h.head, -0.5, 0.2, 0.5, 0.5], [h.rightArm, 0, -2.2, 0, 0.8], [h.leftArm, 0, -2.0, 0, 0.9], [h.rightLeg, 0, -1.9, 0.3, 0.7]]) {
        part(p, boxGeo(s, s, s), goo, x, y, z);
      }
      for (const [x, z] of [[-0.6, 0.5], [0.5, 0.5], [0, -0.5]]) part(h.torso, boxGeo(0.25, 0.9, 0.25), goo, x, -1.3, z); // drips
      break;
    }
    case 'golden': {
      const gold = glow(h, 0xffc400);
      gold.emissiveIntensity = 0.4;
      bodyCracks(gold);
      crown(h, h.head, 1.35, 1.4);
      for (const side of [-1, 1]) part(h.torso, boxGeo(1.1, 0.4, 1.2), gold, side * 1.45, 0.95, 0);
      part(h.torso, boxGeo(0.8, 0.8, 0.1), gold, 0, 0.2, 0.55); // coin
      part(h.torso, boxGeo(0.15, 0.5, 0.06), M(0x6d4c00), 0, 0.2, 0.62);
      break;
    }
    case 'mutant': {
      bodyCracks();
      // One giant limb: a huge right arm and fist; the left arm stays small and withered.
      part(h.rightArm, boxGeo(2.0, 3.4, 2.0), M(0x1c1024), 0, -1.6, 0);
      part(h.rightArm, boxGeo(2.6, 2.0, 2.6), M(0x24122e), 0, -3.8, 0);
      cracks(h.rightArm, 1.02, [[0.3, -1.4, 1.6, 0.4], [-0.4, -2.6, 1.4, -0.5], [0.2, -3.8, 1.2, 0.3]], g, 0.16);
      for (const z of [-0.6, 0, 0.6]) shard(h.rightArm, 1.0, -1.0, z, 0.9, -1.0);
      h.leftArm.scale.set(0.7, 0.8, 0.7);
      part(h.torso, boxGeo(0.7, 0.7, 0.08), g, -0.4, 0.5, 0.53); // glowing tumor
      break;
    }
    case 'guardian':
    case 'guardianFree': {
      bodyCracks();
      if (def.vlook === 'guardian') {
        plates(def.plate);
        // A tower shield on its left arm.
        part(h.leftArm, boxGeo(0.3, 3.2, 2.2), M(0x263238), 0.7, -1.4, 0.4);
        part(h.leftArm, boxGeo(0.06, 2.4, 0.2), g, 0.87, -1.4, 0.4);
        part(h.leftArm, boxGeo(0.06, 0.2, 1.6), g, 0.87, -1.1, 0.4);
      } else {
        shardCrown(5, 0.9);
        aura(0xff1744, 0.15);
        sword(h.rightArm, 3.8);
        sword(h.leftArm, 3.8);
      }
      break;
    }
    case 'king': {
      // VOID: crimson cracks all over his black body, a pink crystal heart and a crown of shards.
      const crimson = glow(h, def.vvein ?? 0xc2185b); // Void mode: violet / purple veins
      crimson.emissiveIntensity = 0.9;
      bodyCracks(crimson, 0.13);
      cracks(h.torso, 0.52, [[-0.75, 0.75, 0.6, 1.1], [0.75, 0.75, 0.6, -1.1], [-0.3, -0.75, 0.7, 0.9], [0.4, -0.8, 0.6, -0.8]], crimson, 0.11);
      for (const limb of [h.rightArm, h.leftArm, h.rightLeg, h.leftLeg]) {
        cracks(limb, 0.52, [[-0.2, -0.3, 0.6, -0.7], [0.25, -1.1, 0.8, 0.6], [0, -1.75, 0.5, 1.2]], crimson, 0.11);
        cracks(limb, -0.52, [[0, -1, 1.4, 0.3]], crimson, 0.11);
      }
      cracks(h.head, 0.62, [[-0.3, 0.6, 0.6, 0.4], [0.3, 0.5, 0.7, -0.5], [0, 0.2, 0.5, 0]], crimson, 0.1);
      const heart = glow(h, 0xff80ff);
      heart.emissiveIntensity = 1.2;
      const gem = part(h.torso, boxGeo(0.4, 0.75, 0.25), heart, 0, 0.25, 0.55);
      gem.rotation.z = Math.PI / 4;
      gem.scale.set(0.9, 0.9, 1);
      shardCrown(9, 1.4, glow(h, 0x9c27b0));
      for (const [x, z] of [[-0.3, 0.3], [0.3, -0.2], [0, 0]]) shard(h.head, x, 1.2, z, 1.8, x * 0.4); // tall center shards
      // Jagged shards breaking out of his left shoulder.
      for (const [x, y, len, rz] of [[1.0, 1.0, 1.6, -0.9], [1.2, 0.7, 1.2, -1.3], [0.7, 1.0, 1.0, -0.4]]) shard(h.torso, x, y, 0, len, rz, 0, glow(h, 0x9c27b0));
      h.voidHeart = gem;
      break;
    }
  }
}

/**
 * Void mode outfits (def.blook): the Tower Battles zombies (plain zombies with diamond-plate
 * clothes, headbands, capes, top hats, pipes, axes...), the False Void's Spawns, VOID's extras
 * (a Void Star, bodies sticking out of him, back spikes) and his Abyss Spawns.
 */
export function tbParts(h, def) {
  const { M } = h;
  const limbs = [h.leftArm, h.rightArm, h.leftLeg, h.rightLeg];
  const g = (c) => glow(h, c);
  const clear = (color, opacity) => {
    const m = glow(h, color);
    m.transparent = true;
    m.opacity = opacity;
    m.depthWrite = false;
    m.userData.keepOpacity = opacity;
    return m;
  };
  const headband = (m) => part(h.head, boxGeo(1.26, 0.25, 1.26), m, 0, 0.95, 0);
  const cape = (m, len = 3.2) => {
    part(h.torso, boxGeo(2.1, len, 0.12), m, 0, 0.95 - len / 2, -0.62).rotation.x = 0.12;
  };
  const bands = (m, y = -1.7) => {
    for (const a of [h.leftArm, h.rightArm]) part(a, boxGeo(1.08, 0.3, 1.08), m, 0, y, 0);
  };
  // A blocky "?" on the chest.
  const question = (m) => {
    for (const [px, py] of [[-1, 2], [0, 2.5], [1, 2], [1, 1], [0, 0.4], [0, -0.4], [0, -1.6]]) part(h.torso, boxGeo(0.22, 0.22, 0.06), m, px * 0.22, 0.25 + py * 0.22, 0.53);
  };
  const tophat = (m, band, tilt = 0) => {
    const hat = new THREE.Group();
    hat.position.set(0, 1.2, 0);
    hat.rotation.z = tilt;
    h.head.add(hat);
    part(hat, boxGeo(1.7, 0.12, 1.7), m, 0, 0.06, 0);
    part(hat, boxGeo(1.15, 1.2, 1.15), m, 0, 0.7, 0);
    if (band) part(hat, boxGeo(1.18, 0.2, 1.18), band, 0, 0.25, 0);
  };
  const staff = (arm, m, tip, len = 4.5) => {
    part(arm, boxGeo(0.22, 0.22, len), m, 0, -2.0, 0.6);
    if (tip) part(arm, boxGeo(0.55, 0.55, 0.55), tip, 0, -2.0, 0.6 + len / 2);
  };
  // Little floating squares around the body (the Spawns' particles).
  const squares = (m, n = 6) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      part(h.torso, boxGeo(0.28, 0.28, 0.28), m, Math.cos(a) * 1.6, -0.8 + (i % 3) * 0.9, Math.sin(a) * 0.9).rotation.set(a, a, 0);
    }
  };
  const veins = (m, list) => {
    for (const [p, x, y, len, a] of list) part(p, boxGeo(0.08, len, 0.05), m, x, y, 0.53).rotation.z = a;
  };
  switch (def.blook) {
    case 'boss1': {
      // Dark diamond-plate clothes and wristbands.
      const plate = M(0x546e7a);
      for (const [x, y] of [[-0.5, 0.5], [0.5, 0.5], [0, 0], [-0.5, -0.5], [0.5, -0.5]]) part(h.torso, boxGeo(0.35, 0.35, 0.06), plate, x, y, 0.52).rotation.z = Math.PI / 4;
      bands(M(0x263238));
      break;
    }
    case 'hidden':
      headband(M(0x000000));
      break;
    case 'hiddenBoss': {
      const black = M(0x000000);
      headband(black);
      bands(black, -0.6);
      cape(M(0x0d0d0d), 3.4);
      break;
    }
    case 'mystery':
    case 'mystery2':
      question(M(0x000000));
      break;
    case 'summon':
      bands(M(0x9e9e9e));
      break;
    case 'necro': {
      // Black robe and cape, skull shoulder pads, a horned staff.
      cape(M(0x111111), 3.6);
      const bone = M(0xe0e0e0);
      for (const side of [-1, 1]) {
        part(h.torso, boxGeo(0.9, 0.6, 0.9), bone, side * 1.45, 1.1, 0);
        part(h.torso, boxGeo(0.5, 0.15, 0.1), M(0x111111), side * 1.45, 1.05, 0.46);
      }
      staff(h.rightArm, M(0x4e342e), null);
      for (const side of [-1, 1]) part(h.rightArm, boxGeo(0.15, 0.6, 0.15), bone, side * 0.3, -2.0, 2.9).rotation.z = side * 0.5;
      break;
    }
    case 'boss2': {
      // Crooked head, rusty metal plates, green particles.
      h.head.rotation.z = 0.35;
      const rust = M(0x795548);
      part(h.torso, boxGeo(2.1, 0.8, 1.1), rust, 0, 0.4, 0);
      for (const l of limbs) part(l, boxGeo(1.08, 0.7, 1.08), rust, 0, -1.3, 0);
      squares(g(0x76ff03), 5);
      break;
    }
    case 'statue':
      // Petrified: all-black stone, arms frozen forward.
      break;
    case 'toxic': {
      h.torso.rotation.x = 0.25; // hunched
      const rust = M(0x795548);
      part(h.torso, boxGeo(2.1, 0.7, 1.1), rust, 0, -0.5, 0);
      const gas = clear(0x76ff03, 0.18);
      part(h.torso, boxGeo(3, 3, 2), gas, 0, 0, 0);
      veins(g(0xccff90), [[h.torso, -0.4, 0.3, 0.8, 0.4], [h.torso, 0.5, -0.2, 0.7, -0.5]]);
      break;
    }
    case 'lightning': {
      const spark = g(0x80d8ff);
      veins(spark, [[h.torso, -0.4, 0.4, 0.9, 0.6], [h.torso, 0.3, -0.1, 0.8, -0.7], [h.torso, 0, -0.6, 0.6, 0.3]]);
      for (const l of limbs) veins(spark, [[l, 0, -1, 0.9, 0.5]]);
      for (let i = 0; i < 4; i++) part(h.head, boxGeo(0.1, 0.6, 0.1), spark, -0.6 + i * 0.4, 1.4, 0).rotation.z = (i % 2 ? 1 : -1) * 0.6;
      break;
    }
    case 'boss3': {
      // Gold tuxedo, bow tie, tilted top hat.
      const gold = M(0xffb300);
      part(h.torso, boxGeo(0.6, 1.9, 0.06), M(0xfff8e1), 0, 0, 0.52); // shirt front
      part(h.torso, boxGeo(0.7, 0.3, 0.1), M(0x111111), 0, 0.8, 0.56); // bow tie
      part(h.torso, boxGeo(2.1, 0.8, 0.12), gold, 0, -1.3, -0.6).rotation.x = 0.15; // coat tails
      tophat(gold, M(0x111111), 0.3);
      break;
    }
    case 'boss4': {
      // Rusty pipes sticking out (one spraying water), one small arm and one huge chained arm.
      const rust = M(0x6d4c41);
      for (const [x, y, rz] of [[-0.6, 0.6, 0.8], [0.4, 0.9, -0.5], [0.1, -0.3, 1.2]]) part(h.torso, boxGeo(0.25, 1.4, 0.25), rust, x, y, -0.4).rotation.set(-0.6, 0, rz);
      part(h.torso, boxGeo(0.3, 0.3, 0.8), clear(0x4fc3f7, 0.6), 0.4, 1.5, -1.0);
      h.leftArm.scale.set(1.8, 1.4, 1.8);
      h.rightArm.scale.set(0.7, 0.8, 0.7);
      const chain = M(0x9e9e9e);
      for (let i = 0; i < 5; i++) part(h.leftArm, boxGeo(1.12, 0.12, 1.12), chain, 0, -0.4 - i * 0.35, 0).rotation.y = i * 0.4;
      break;
    }
    case 'necroBoss': {
      // Top hat, white mask, long cape, skull staff with violet sparks.
      part(h.head, boxGeo(1.0, 1.0, 0.08), M(0xfafafa), 0, 0.6, 0.62);
      for (const x of [-0.25, 0.25]) part(h.head, boxGeo(0.2, 0.12, 0.04), M(0x111111), x, 0.75, 0.67);
      tophat(M(0x111111), M(0x6a1b9a));
      cape(M(0x1a0a24), 3.8);
      staff(h.rightArm, M(0x212121), M(0xeeeeee));
      part(h.rightArm, boxGeo(0.7, 0.7, 0.7), clear(0xd500f9, 0.45), 0, -2.0, 2.85);
      break;
    }
    case 'fireSpirit': {
      // Black stone body, orange mask with red eyes, fire on the head.
      part(h.head, boxGeo(1.0, 0.8, 0.08), M(0xff6d00), 0, 0.6, 0.62);
      for (const x of [-0.25, 0.25]) part(h.head, boxGeo(0.2, 0.15, 0.04), g(0xff1744), x, 0.7, 0.67);
      for (const [x, s] of [[-0.3, 0.7], [0.1, 1.1], [0.35, 0.8]]) part(h.head, boxGeo(0.4, s, 0.4), clear(0xff9100, 0.8), x, 1.2 + s / 2, 0);
      break;
    }
    case 'guardian': {
      // Violet hood and armor, a glowing violet core, a big one-bladed axe.
      const violet = M(0x4a148c);
      const core = g(0xd500f9);
      part(h.head, boxGeo(1.45, 1.45, 1.35), violet, 0, 0.7, -0.12);
      for (const x of [-0.25, 0.25]) part(h.head, boxGeo(0.2, 0.12, 0.04), core, x, 0.7, 0.62);
      part(h.torso, boxGeo(0.6, 0.6, 0.1), core, 0, 0.3, 0.55).rotation.z = Math.PI / 4;
      for (const side of [-1, 1]) part(h.torso, boxGeo(1.0, 0.5, 1.2), M(0x311b92), side * 1.35, 1.0, 0);
      part(h.rightArm, boxGeo(0.25, 0.25, 5.5), M(0x37474f), 0, -2.0, 0.9);
      part(h.rightArm, boxGeo(0.15, 2.2, 1.8), M(0x5e35b1), 0, -2.6, 3.0);
      part(h.rightArm, boxGeo(0.17, 2.2, 0.15), core, 0, -2.6, 3.9);
      break;
    }
    case 'spawn': {
      squares(g(0xb388ff), 6);
      veins(g(0x7c4dff), [[h.torso, -0.3, 0.3, 0.8, 0.5], [h.torso, 0.4, -0.3, 0.7, -0.4]]);
      break;
    }
    case 'abyss':
    case 'abyssBig': {
      // VOID's Spawns: rusty black head and arms on a purple body (the big one is purple all over, with veins).
      const vein = g(0xd500f9);
      veins(vein, [[h.torso, -0.4, 0.4, 0.9, 0.5], [h.torso, 0.3, -0.2, 0.9, -0.6], [h.torso, 0, -0.7, 0.5, 0.2]]);
      for (const l of limbs) veins(vein, [[l, 0, -1.1, 0.8, 0.4]]);
      if (def.blook === 'abyssBig') squares(clear(0xea80fc, 0.7), 8);
      break;
    }
    case 'trueVoid': {
      // On top of VOID's cracked body (vlook 'king'): a purple-and-magenta Void Star, bodies sticking
      // out of him, big black back spikes and a purple haze.
      const star = g(0xff40ff);
      const starG = new THREE.Group();
      starG.position.set(0, 2.9, 0);
      h.head.add(starG);
      for (let i = 0; i < 4; i++) part(starG, boxGeo(0.25, 1.6, 0.25), i % 2 ? star : g(0x7c4dff), 0, 0, 0).rotation.z = (i * Math.PI) / 4;
      const black = M(0x0a0410);
      for (const [x, y, len, rz] of [[-0.6, 0.6, 2.2, 0.4], [0, 0.9, 2.8, 0], [0.6, 0.6, 2.2, -0.4], [-0.4, -0.2, 1.6, 0.6], [0.4, -0.2, 1.6, -0.6]]) {
        const s = part(h.torso, boxGeo(0.4, len, 0.4), black, x, y + len / 2 - 0.4, -0.7);
        s.rotation.set(-0.7, 0, rz);
      }
      // Humanoid shapes pushing out of his chest and sides.
      const husk = M(0x1a0a24);
      for (const [x, y, rz] of [[-0.85, -0.2, 0.5], [0.85, 0.3, -0.5]]) {
        const b = new THREE.Group();
        b.position.set(x, y, 0.45);
        b.rotation.set(0.3, 0, rz);
        h.torso.add(b);
        part(b, boxGeo(0.35, 0.35, 0.35), husk, 0, 0.45, 0.1);
        part(b, boxGeo(0.4, 0.6, 0.25), husk, 0, 0, 0.05);
        for (const s of [-1, 1]) part(b, boxGeo(0.12, 0.5, 0.12), husk, s * 0.25, 0.1, 0.25).rotation.x = -1.1;
      }
      const haze = clear(0x9c27b0, 0.12);
      part(h.torso, boxGeo(3.2, 4.2, 2.2), haze, 0, -0.5, 0);
      break;
    }
  }
  if (def.blook === 'mystery') setOpacity(h, 0.55);
  else if (def.blook === 'mystery2') setOpacity(h, 0.6);
  else if (def.blook === 'lightning') setOpacity(h, 0.75);
}

/** VOID (Spirit): a giant ghost of void energy with his crystal heart glowing inside it. */
export function makeVoidSpiritModel(def) {
  const h = creature();
  const { M } = h;
  const ghostM = glow(h, 0x7c4dff);
  ghostM.emissiveIntensity = 0.55;
  ghostM.transparent = true;
  ghostM.opacity = 0.55;
  ghostM.depthWrite = false;
  ghostM.userData.keepOpacity = 0.55;
  const edge = glow(h, 0xd500f9);
  const float = new THREE.Group();
  h.body.add(float);
  part(float, boxGeo(2.6, 2.2, 1.6), ghostM, 0, 3.2, 0); // chest
  part(float, boxGeo(2.0, 1.4, 1.3), ghostM, 0, 1.6, 0); // waist
  const tails = [];
  for (const [x, w] of [[-0.6, 0.7], [0.1, 0.8], [0.7, 0.6]]) tails.push(part(float, boxGeo(w, 1.4, 1.0), ghostM, x, 0.5, 0));
  const head = new THREE.Group();
  head.position.y = 4.9;
  float.add(head);
  part(head, boxGeo(1.4, 1.4, 1.4), ghostM, 0, 0, 0);
  for (const side of [-1, 1]) part(head, boxGeo(0.4, 0.16, 0.08), glow(h, 0xffffff), side * 0.32, 0.1, 0.72); // eye slits
  // Crown of shards over a hollow head.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const s = part(head, boxGeo(0.25, 1 + (i % 3) * 0.35, 0.25), M(0x1a0f24), Math.sin(a) * 0.55, 1.0, Math.cos(a) * 0.55);
    s.rotation.set(Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3);
  }
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 1.7, 4.0, 0);
    float.add(arm);
    part(arm, boxGeo(0.9, 2.4, 0.9), ghostM, 0, -1.2, 0);
    part(arm, boxGeo(0.12, 2.2, 0.06), edge, 0, -1.2, 0.47);
    arms.push(arm);
  }
  // The void heart: a bright pink crystal with a pulsing glow and orbiting shards.
  const heart = new THREE.Group();
  heart.position.set(0, 3.3, 0);
  float.add(heart);
  const heartM = glow(h, 0xff80ff);
  heartM.emissiveIntensity = 1.4;
  const gem = part(heart, boxGeo(0.7, 1.1, 0.7), heartM, 0, 0, 0);
  gem.rotation.z = Math.PI / 4;
  const haloM = glow(h, 0xff1744);
  haloM.transparent = true;
  haloM.opacity = 0.35;
  haloM.depthWrite = false;
  haloM.userData.keepOpacity = 0.35;
  const halo = part(heart, boxGeo(1.3, 1.3, 1.3), haloM, 0, 0, 0);
  const orbit = [];
  for (let i = 0; i < 4; i++) orbit.push(part(heart, boxGeo(0.18, 0.5, 0.18), edge, 0, 0, 0));
  h.anim = (phase, t) => {
    float.position.y = 0.8 + Math.sin(t * 1.6) * 0.4;
    float.rotation.z = Math.sin(t * 1.1) * 0.05;
    tails.forEach((tl, i) => (tl.rotation.x = Math.sin(t * 4 + i * 1.7) * 0.25));
    arms[0].rotation.x = -0.4 + Math.sin(t * 2) * 0.3;
    arms[1].rotation.x = -0.4 - Math.sin(t * 2) * 0.3;
    const beat = 1 + Math.max(0, Math.sin(t * 6)) * 0.25;
    gem.scale.setScalar(beat);
    halo.scale.setScalar(beat * (1 + Math.sin(t * 3) * 0.1));
    gem.rotation.y = t * 1.5;
    orbit.forEach((o, i) => {
      const a = t * 2 + (i / orbit.length) * Math.PI * 2;
      o.position.set(Math.cos(a) * 1.1, Math.sin(a * 1.3) * 0.4, Math.sin(a) * 1.1);
    });
  };
  // While attacking, both arms swing up and come down.
  h.swingArms = (f) => {
    const a = f < 0.6 ? -Math.PI * 0.9 * (f / 0.6) : -Math.PI * 0.9 + (Math.PI * 0.6 * (f - 0.6)) / 0.4;
    arms[0].rotation.x = arms[1].rotation.x = a;
  };
  return h;
}
