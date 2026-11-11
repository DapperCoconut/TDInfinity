// makeEnemy(type) builds any enemy. It reads the enemy from ENEMIES and picks its body:
// a zombie-shaped person with extra parts, or one of the CREATURES.

import * as THREE from 'three';
import { HC_CREATURES, hcParts } from '../newmodels/hc.js';
import { hwParts } from '../newmodels/halloween.js';
import { rigify } from '../rig.js';
import { gaitFor, shapeEnemy } from '../visuals.js';
import { boxGeo, makeHumanoid, part, setOpacity } from './kit.js';
import { glow } from './bits.js';
import { fallenParts, hardParts, mediumParts, moltenParts } from './enemies-medium.js';
import {
  crystalParts, makeAmplifierModel, makeBoulderGolemModel, makeCorpseModel, makeCrystalCarModel, makeCrystalUfoModel,
  makeEasySlimeModel, makeGhostModel, makeGiantGoblinModel, makeGoblinModel, makeGolemModel, makeKingSlimeModel,
  makeLavaGolemModel, makeReaperModel, makeShroomModel, makeSlimeModel, makeSpiderModel, makeTeleporterModel,
} from './enemies-creatures.js';
import {
  insaneParts, makeRewindModel, makeScrapGolemModel, makeTimeParasiteModel, makeTimeTitanModel, makeTimelingModel,
} from './enemies-insane.js';
import { makeVoidSpiritModel, tbParts, voidParts } from './enemies-void.js';
import {
  expertParts, makeCarrierTankModel, makeInsaneTruckModel, makeMk11Model, makeTimeCrystalModel, makeTimeFragmentModel,
  makeViorbModel, orionParts,
} from './enemies-expert.js';

export function makeZombie(def) {
  const h = makeHumanoid({ skin: def.skin, shirt: def.shirt, pants: def.pants, face: def.face ?? 'zombie' });
  const { M } = h;
  if (def.helmet) {
    part(h.head, boxGeo(1.4, 0.7, 1.4), M(0x78909c), 0, 1.28, 0);
    part(h.torso, boxGeo(2.2, 1.2, 1.2), M(0x607d8b), 0, 0.3, 0); // chest plate
  }
  if (def.hood) {
    part(h.head, boxGeo(1.4, 1.35, 1.25), M(0x1a1f2e), 0, 0.68, -0.1);
  }
  if (def.robot) {
    // Android: metal visor with a glowing eye strip, antenna and a chest panel.
    const metal = M(0x78909c);
    part(h.head, boxGeo(1.3, 0.5, 0.12), metal, 0, 0.7, 0.62);
    part(h.head, boxGeo(1.0, 0.18, 0.08), glow(h, def.robot), 0, 0.72, 0.69);
    part(h.head, boxGeo(0.12, 0.7, 0.12), metal, 0.35, 1.5, 0);
    part(h.head, boxGeo(0.25, 0.25, 0.25), glow(h, def.robot), 0.35, 1.9, 0);
    part(h.torso, boxGeo(1.0, 0.8, 0.08), metal, 0, 0.2, 0.52);
    part(h.torso, boxGeo(0.25, 0.25, 0.06), glow(h, def.robot), -0.2, 0.3, 0.57);
  }
  if (def.lead) {
    // Lead Zombie: dull grey lead plates bolted over the head, chest and shins.
    const lead = M(0x607d8b);
    const rivet = M(0x37474f);
    part(h.head, boxGeo(1.4, 0.55, 1.4), lead, 0, 1.25, 0);
    part(h.head, boxGeo(1.4, 0.2, 0.1), lead, 0, 0.95, 0.66); // brow plate
    part(h.torso, boxGeo(2.2, 1.6, 1.25), lead, 0, 0.15, 0);
    for (const x of [-0.6, 0.6]) part(h.torso, boxGeo(0.15, 0.15, 0.08), rivet, x, 0.7, 0.66);
    part(h.rightLeg, boxGeo(1.1, 0.9, 1.1), lead, 0, -1.4, 0);
    part(h.leftLeg, boxGeo(1.1, 0.9, 1.1), lead, 0, -1.4, 0);
  }
  if (def.wings) {
    // Flyer: leathery bat wings on its back (flapped by the view).
    const wm = M(def.wings);
    h.wings = [];
    for (const side of [-1, 1]) {
      const w = new THREE.Group();
      w.position.set(side * 0.5, 0.6, -0.55);
      h.torso.add(w);
      part(w, boxGeo(2.4, 1.6, 0.12), wm, side * 1.2, 0, 0);
      part(w, boxGeo(0.6, 0.9, 0.12), wm, side * 2.2, -1.0, 0); // wing tip
      h.wings.push(w);
    }
  }
  if (def.boss && !def.look && !def.crystal && !def.insane && !def.vlook && !def.mlook && !def.flook && !def.xlook && !def.ilook && !def.blook && !def.hk) {
    const spikeM = M(0xb0bec5);
    part(h.torso, boxGeo(0.7, 0.5, 0.9), spikeM, -1.5, 1.2, 0);
    part(h.torso, boxGeo(0.7, 0.5, 0.9), spikeM, 1.5, 1.2, 0);
    part(h.head, boxGeo(0.25, 0.6, 0.25), spikeM, -0.45, 1.45, 0);
    part(h.head, boxGeo(0.25, 0.6, 0.25), spikeM, 0.45, 1.45, 0);
  }
  if (def.lava) moltenParts(h, def);
  if (def.look) hardParts(h, def);
  if (def.crystal) crystalParts(h, def);
  if (def.insane) insaneParts(h, def);
  if (def.vlook) voidParts(h, def);
  if (def.mlook) mediumParts(h, def);
  if (def.flook) fallenParts(h, def);
  if (def.xlook) expertParts(h, def);
  if (def.ilook) orionParts(h, def);
  if (def.blook) tbParts(h, def);
  if (def.hk) hcParts(h, def); // Hardcore outfits
  h.rightArm.rotation.x = -Math.PI / 2;
  h.leftArm.rotation.x = -Math.PI / 2;
  if (def.hw) hwParts(h, def); // Halloween Event looks (they may pose themselves with h.anim)
  if (!h.anim && rigify(h)) {
    // Elbows, knees and a round head, and its own way of walking (visuals.js, anim.js).
    h.gait = gaitFor(def, h);
    shapeEnemy(h);
  }
  if (def.hidden) setOpacity(h, 0.35);
  else if (def.mlook === 'mult') setOpacity(h, 0.55); // Multipliers are see-through
  return h;
}

const CREATURES = {
  iTruck: makeInsaneTruckModel,
  iCarrier: makeCarrierTankModel,
  iMK11: makeMk11Model,
  voidSpirit: makeVoidSpiritModel,
  scrapGolem: makeScrapGolemModel,
  timeling: makeTimelingModel,
  rewind: makeRewindModel,
  timeTitan: makeTimeTitanModel,
  timeParasite: makeTimeParasiteModel,
  corpse: makeCorpseModel,
  slime: makeSlimeModel,
  easySlime: makeEasySlimeModel,
  kingSlime: makeKingSlimeModel,
  goblin: makeGoblinModel,
  giantGoblin: makeGiantGoblinModel,
  spider: makeSpiderModel,
  ghost: makeGhostModel,
  shroom: makeShroomModel,
  boulder: makeBoulderGolemModel,
  reaper: makeReaperModel,
  golem: makeGolemModel,
  lavaGolem: makeLavaGolemModel,
  crystalCar: makeCrystalCarModel,
  crystalUfo: makeCrystalUfoModel,
  teleporter: makeTeleporterModel,
  amplifier: makeAmplifierModel,
  viorb: makeViorbModel,
  timeCrystal: makeTimeCrystalModel,
  timeFragment: makeTimeFragmentModel,
  ...HC_CREATURES, // Hardcore creatures (newmodels/hc.js)
};

/** Builds the model for an enemy definition (Easy mode creatures, or a zombie). */
export function makeEnemy(def) {
  const build = CREATURES[def.model];
  if (!build) return makeZombie(def);
  const h = build(def);
  if (def.hidden) setOpacity(h, 0.35);
  return h;
}
