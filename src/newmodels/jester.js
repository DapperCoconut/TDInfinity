// The Last Laugh contract's JESTER (lastlaugh.js): a much bigger, darker Chaos Jester. Built from
// the Chaos Jester tower's model (all its juggling, dice and wheel), with the colors turned dark
// and purple and its eyes glowing red. The enemy's `scale` makes it big.
import * as THREE from 'three';
import { TOWER_MODELS_H } from './h.js';

const PURPLE = new THREE.Color(0x4a148c);

export function makeLlJesterModel() {
  const h = TOWER_MODELS_H.jesterChaos(4);
  for (const m of h.mats) {
    if (!m.color) continue;
    // Glowing bits (coins, cubes) stay bright; everything else goes dark purple.
    if (m.emissive && m.emissive.getHex()) continue;
    m.color.multiplyScalar(0.32).lerp(PURPLE, 0.3);
  }
  // Red glowing eyes over the slanted ones.
  const eye = new THREE.MeshBasicMaterial({ color: 0xff1744 });
  h.mats.push(eye);
  for (const sd of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.06), eye);
    e.position.set(sd * 0.38, 1.15, 0.82);
    e.rotation.z = sd * 0.35;
    h.head.add(e);
  }
  return h;
}

export const LL_CREATURES = { llJester: makeLlJesterModel };
