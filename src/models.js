// Models: what every tower, enemy and summoned unit looks like.
// This file is the front door. The builders live in the models/ folder, and everything they
// export can still be imported from here. Other files should import from this file, not from
// models/ (the files there need this one loaded first).
//   models/kit.js        boxes, faces and the blocky person every model starts from
//   models/bits.js       small shared pieces (hand guns, glows, hats, turrets...)
//   models/towers01-12   the tower builders (each file lists its towers at the top)
//   models/units.js      summoned units (makeUnit)
//   models/enemy.js      makeEnemy, with the enemy parts in models/enemies-*.js
//   models/declip.js     stops flat faces from flickering
// What stays here: TOWER_MODELS, the list of which builder draws which tower.
import { TOWERS } from './config.js';
// Wave 7 tower and unit models live in their own files (they import helpers from here).
import { TOWER_MODELS_A } from './newmodels/a.js';
import { TOWER_MODELS_B } from './newmodels/b.js';
import { TOWER_MODELS_C } from './newmodels/c.js';
import { TOWER_MODELS_D } from './newmodels/d.js';
import { CROSS_MODELS, TOWER_MODELS_E } from './newmodels/e.js';
import { TOWER_MODELS_F } from './newmodels/f.js';
import { TOWER_MODELS_G } from './newmodels/g.js';
import { TOWER_MODELS_H } from './newmodels/h.js';
import { TOWER_MODELS_I } from './newmodels/i.js';
import { blitzUpgrades } from './newmodels/blitzup.js';
import { rigify } from './rig.js';
import { styleFor } from './visuals.js';
import { armWeapons } from './weapons.js';
export { boxGeo, faceTexture, makeHumanoid, part, setEmissive, setOpacity } from './models/kit.js';
import { goldify } from './models/bits.js';
export {
  addHalo, addHandgun, addPistol, addTommyGun, addWings, blurDisc, boxRow, clearMat, creature, crown, cylGeo, cylGeoX,
  cylGeoZ, cylPart, eyes, fedora, glow, glowThing, goldify, gunMuzzle, helmet, holdLongGun, inHand, makeThing,
  present, pumpkin, setMuzzle, suit, turret, usFlag,
} from './models/bits.js';
export {
  makeBubbleBuddy, makeCampUnit, makeFieldSoldier, makeGoon, makeHeavyUnit, makeMerc, makeMobGoon, makePlantUnit,
  makeRelicUnit, makeSkeleton, makeTrooper, makeUnit, makeVoidSoldier, makeVoidTank, wheels,
} from './models/units.js';
import {
  makeAviator, makeCommando, makeGoldCommando, makeGoldScout, makeMarksman, makePhaser, makeRailgunner, makeScout,
  makeScoutClassic, makeSoldier, makeTweeter,
} from './models/towers01.js';
export {
  addCannon, addMinigun, makeAviator, makeCommando, makeGoldCommando, makeGoldScout, makeMarksman, makePhaser,
  makePlane, makeRailgunner, makeScout, makeScoutClassic, makeSoldier, makeTweeter,
} from './models/towers01.js';
import {
  makeEnforcer, makeFlamethrower, makeFrost, makeGrenadier, makeGrenadierAssault, makeGrenadierAssaultBottom,
  makeGrenadierDemo, makeMercenary, makeMortar, makePlasma, makePlasmaPulse, makeRocketeer, makeShotgunner,
  makeSniper, makeSniperClassic, makeSniperTactical, makeSniperTacticalBottom, makeWarden,
} from './models/towers02.js';
export {
  makeEnforcer, makeFlamethrower, makeFrost, makeGrenadier, makeGrenadierAssault, makeGrenadierDemo, makeMercenary,
  makeMortar, makePlasma, makePlasmaPulse, makeRocketeer, makeShotgunner, makeSniper, makeSniperClassic,
  makeSniperTactical, makeWarden,
} from './models/towers02.js';
import {
  goldShine, makeAnarchist, makeArmoredFactory, makeArmoredFactoryBottom, makeBarracks, makeCommander,
  makeCommanderClassic, makeCowboy, makeDJ, makeDJBooth, makeFarm, makeFieldBarracks, makeFieldBarracksBottom,
  makeGoldCommander, makeMilitaryBase, makePatrol, makeZed,
} from './models/towers03.js';
export {
  addRevolver, goldShine, makeAnarchist, makeArmoredFactory, makeArmoredFactoryBottom, makeArmoredFactoryWith,
  makeBarracks, makeCommander, makeCommanderClassic, makeCowboy, makeDJ, makeDJBooth, makeFarm, makeFieldBarracks,
  makeFieldBarracksBottom, makeFieldBarracksWith, makeGoldCommander, makeMilitaryBase, makePatrol, makeZed,
} from './models/towers03.js';
import {
  makeAssassin, makeBoomerang, makeBrawler, makeFrostFreezer, makeFrostRanger, makeFrostRangerBottom, makeHunter,
  makeLaserGunner, makeLaserGunnerBottom, makeMachineGunner, makeMachineGunnerBottom, makeMilitant,
  makeOperatorBottom, makeOperatorTower, makeShotgunnerCombat, makeShotgunnerCombatBottom, makeShotgunnerPump,
  makeSlime, makeSoldierClassic, makeSoldierRanger, makeSoldierRangerBottom,
} from './models/towers04.js';
export {
  makeAssassin, makeBoomerang, makeBrawler, makeFrostFreezer, makeFrostRanger, makeHunter, makeLaserGunner,
  makeMachineGunner, makeMilitant, makeOperatorTower, makeShotgunnerCombat, makeShotgunnerPump, makeSlime,
  makeSoldierClassic, makeSoldierRanger,
} from './models/towers04.js';
import {
  makeAviatorAce, makeEDJ, makeEDJBottom, makeElectro, makeFarmAirdrop, makeFarmAirdropBottom, makeFarmFruit,
  makeMedic, makeMedicBeam, makeMedicBeamBottom, makeMineLayer, makeMineLayerBottom, makePyromancer,
  makeRocketeerMissile, makeRocketeerTrooper, makeRocketeerTrooperBottom, makeTrapper,
} from './models/towers05.js';
export {
  makeAcePlane, makeAviatorAce, makeEDJ, makeElectro, makeFarmAirdrop, makeFarmFruit, makeMedic, makeMedicBeam,
  makeMineLayer, makePyromancer, makeRocketeerMissile, makeRocketeerTrooper, makeRocketeerTrooperBottom, makeTrapper,
} from './models/towers05.js';
import {
  makeBehemothFactory, makeBehemothFactoryBottom, makeCrookBoss, makeCryoHeli, makeHelicopter,
  makeHelicopterBottom, makeMercBase, makeMinigunner, makeMobster, makeMobsterBottom, makeMortarClassic, makePursuit,
  makePursuitBottom, makeRanger, makeWarMachineFactory, makeWarMachineFactoryBottom,
} from './models/towers06.js';
export {
  makeBehemothFactory, makeBehemothFactoryBottom, makeCrookBoss, makeCryoHeli, makeHeavyFactory,
  makeHeli, makeHelicopter, makeHelicopterBottom, makeHelicopterModel, makeMercBase, makeMinigunner, makeMobster,
  makeMobsterBottom, makeMobsterModel, makeMortarClassic, makePursuit, makePursuitBottom, makePursuitModel,
  makeRanger, makeWarMachineFactory, makeWarMachineFactoryBottom,
} from './models/towers06.js';
import {
  makeAccelerator, makeEngineer, makeHacker, makeHackerBottom, makeJohn, makeJohnBottom, makeJuggernaut,
  makeJuggernautBottom, makeLaserRailgunner, makeLaserRailgunnerBottom, makeNecromancer, makeSlammer,
  makeSlammerBottom, makeXwm, makeXwmBottom,
} from './models/towers07.js';
export {
  makeAccelerator, makeEngineer, makeGrave, makeHacker, makeHackerBottom, makeHologram, makeJohn, makeJuggernaut,
  makeLaserRailgunner, makeNecromancer, makeSentry, makeSlammer, makeXwm,
} from './models/towers07.js';
import {
  makeGhost, makeGhostBottom, makePaintballer, makePatrolBoat, makePatrolBoatBottom,
  makeSaboteur, makeToxicnator, makeToxicnatorBottom,
} from './models/towers08.js';
import { makeAATurret, makeAATurretBottom, makeGatling, makeSentryTower, makeSentryTowerBottom, makeTesla, makeTurret } from './models/machines1.js';
export { makeAATurret, makeGatling, makeSentryTower, makeTesla, makeTurret } from './models/machines1.js';
export {
  makeGhost, makePaintballer, makePatrolBoat, makeSaboteur, makeToxicnator,
  miniBarrels,
} from './models/towers08.js';
import {
  makeArcher, makeBowmaster, makeBreacher, makeCryoBlaster, makeCryoBlasterBottom, makeCryoMortar, makeElf,
  makeEventCommando, makeExecutioner, makeFlameTrooper, makeFrostBlaster, makeGladiator, makeGooGunner, makeGraveyard,
  makeHallowboomer, makeHarpoonHunter, makeHuntsman, makeKingpin, makeKnifer, makeOperator, makeSlasher, makeSledger,
  makeSleeter, makeSnowballer, makeStunner, makeSwarmer, makeTitan, makeToxicGunner,
} from './models/towers09.js';
export {
  bladeIn, evoEmblem, iceGun, makeArcher, makeBowmaster, makeBreacher, makeCryoBlaster, makeCryoBlasterBottom,
  makeCryoMortar, makeElf, makeEventCommando, makeExecutioner, makeFlameTrooper, makeFrostBlaster, makeGladiator,
  makeGooGunner, makeGraveyard, makeHallowboomer, makeHarpoonHunter, makeHuntsman, makeKingpin, makeKnifer,
  makeOperator, makeSlasher, makeSledger, makeSleeter, makeSnowballer, makeStunner, makeSwarmer, makeTitan,
  makeToxicGunner, recolor,
} from './models/towers09.js';
import {
  makeArtillery, makeBiologist, makeCryomancer, makeElementalist, makeElfCamp, makeFireworkTech, makeHallowPunk,
  makeHarvester, makeIceBreaker, makeJester, makeRelic, makeShockTrooper, makeSnowballerFrost, makeSpotlightTech,
  makeStarCannon, makeWarlock,
} from './models/towers10.js';
export {
  makeArtillery, makeBiologist, makeCryomancer, makeElementalist, makeElfCamp, makeFireworkTech, makeHallowPunk,
  makeHarvester, makeIceBreaker, makeJester, makeRelic, makeShockTrooper, makeSnowballerFrost, makeSpotlightTech,
  makeStarCannon, makeWarlock,
} from './models/towers10.js';
import {
  makeCombatDrone, makeCombatDroneBottom, makeCombatMedic, makeCombatMedicBottom, makeJetTrooper,
  makeJetTrooperBottom, makeNoobTuber, makeOilDerrick, makeOilDerrickBottom, makeRefractor, makeRefractorBottom,
  makeScoutHeli, makeShieldTower, makeShieldTowerBottom, makeStinger, makeWarship, makeWarshipBottom,
} from './models/towers11.js';
export {
  makeCombatDrone, makeCombatMedic, makeJetTrooper, makeNoobTuber, makeOilDerrick, makeRefractor, makeScoutHeli,
  makeShieldTower, makeStinger, makeWarship,
} from './models/towers11.js';
import {
  makeBubbleBlower, makeDarter, makeFirecracker, makeMLRS, makePenetrator, makePsychoSlayer, makeQuarterer,
  makeScarecrow, makeVoidTraitor,
} from './models/towers12.js';
export {
  makeBubbleBlower, makeDarter, makeFirecracker, makeMLRS, makePenetrator, makePsychoSlayer, makeQuarterer,
  makeScarecrow, makeVoidTraitor,
} from './models/towers12.js';
import { declip } from './models/declip.js';
export { declip } from './models/declip.js';
export { fallenParts, hardParts, mediumParts, moltenParts } from './models/enemies-medium.js';
export {
  crystalParts, flames, hazmatSuit, makeAmplifierModel, makeBoulderGolemModel, makeCorpseModel, makeCrystalCarModel,
  makeCrystalUfoModel, makeEasySlimeModel, makeGhostModel, makeGiantGoblinModel, makeGoblinModel, makeGolemModel,
  makeKingSlimeModel, makeLavaGolemModel, makeReaperModel, makeShroomModel, makeSlimeModel, makeSpiderModel,
  makeTeleporterModel, overlordParts,
} from './models/enemies-creatures.js';
export {
  insaneParts, makeRewindModel, makeScrapGolemModel, makeTimeParasiteModel, makeTimeTitanModel, makeTimelingModel,
} from './models/enemies-insane.js';
export { makeVoidSpiritModel, tbParts, voidParts } from './models/enemies-void.js';
export {
  expertParts, makeCarrierTankModel, makeInsaneTruckModel, makeMk11Model, makeTimeCrystalModel, makeTimeFragmentModel,
  makeViorbModel, orionParts,
} from './models/enemies-expert.js';
export { makeEnemy, makeZombie } from './models/enemy.js';

export const TOWER_MODELS = {
  scout: makeScout,
  scoutClassic: makeScoutClassic,
  scoutDarter: makeDarter,
  paintballer: makePaintballer,
  tweeter: makeTweeter,
  cowboy: makeCowboy,
  soldier: makeSoldier,
  soldierClassic: makeSoldierClassic,
  soldierQuarterer: makeQuarterer,
  soldierRanger: makeSoldierRanger,
  soldierRangerBottom: makeSoldierRangerBottom,
  operator: makeOperatorTower,
  operatorBottom: makeOperatorBottom,
  marksman: makeMarksman,
  commando: makeCommando,
  goldScoutBase: makeGoldScout,
  goldCommando: makeGoldCommando,
  commandoMinigunner: makeMinigunner,
  aviator: makeAviator,
  phaser: makePhaser,
  railgunner: makeRailgunner,
  railgunnerRanger: makeRanger,
  sniper: makeSniper,
  sniperClassic: makeSniperClassic,
  sniperPenetrator: makePenetrator,
  sniperTactical: makeSniperTactical,
  sniperTacticalBottom: makeSniperTacticalBottom,
  enforcer: makeEnforcer,
  enforcerWarden: makeWarden,
  merc: makeMercenary,
  grenadier: makeGrenadier,
  grenadierDemo: makeGrenadierDemo,
  grenadierFirecracker: makeFirecracker,
  grenadierAssault: makeGrenadierAssault,
  grenadierAssaultBottom: makeGrenadierAssaultBottom,
  frost: makeFrost,
  frostFreezer: makeFrostFreezer,
  rocketeer: makeRocketeer,
  mortar: makeMortar,
  flamethrower: makeFlamethrower,
  shotgunner: makeShotgunner,
  plasma: makePlasma,
  plasmaPulse: makePlasmaPulse,
  boomerang: makeBoomerang,
  slime: makeSlime,
  assassin: makeAssassin,
  brawler: makeBrawler,
  patrol: makePatrol,
  patrolMilitary: makeMilitaryBase,
  patrolArmored: makeArmoredFactory,
  patrolArmoredBottom: makeArmoredFactoryBottom,
  barracks: makeBarracks,
  barracksField: makeFieldBarracks,
  barracksFieldBottom: makeFieldBarracksBottom,
  zed: makeZed,
  farm: makeFarm,
  commander: makeCommander,
  goldCommander: makeGoldCommander,
  commanderClassic: makeCommanderClassic,
  dj: makeDJ,
  djBooth: makeDJBooth,
  anarchist: makeAnarchist,
  mercMilitant: makeMilitant,
  mercLaser: makeLaserGunner,
  mercLaserBottom: makeLaserGunnerBottom,
  marksmanHunter: makeHunter,
  shotgunnerPump: makeShotgunnerPump,
  shotgunnerCombat: makeShotgunnerCombat,
  shotgunnerCombatBottom: makeShotgunnerCombatBottom,
  frostRanger: makeFrostRanger,
  frostRangerBottom: makeFrostRangerBottom,
  flamethrowerPyro: makePyromancer,
  aviatorAce: makeAviatorAce,
  rocketeerMissile: makeRocketeerMissile,
  rocketeerTrooper: makeRocketeerTrooper,
  rocketeerTrooperBottom: makeRocketeerTrooperBottom,
  farmFruit: makeFarmFruit,
  farmAirdrop: makeFarmAirdrop,
  farmAirdropBottom: makeFarmAirdropBottom,
  medic: makeMedic,
  medicBeam: makeMedicBeam,
  medicBeamBottom: makeMedicBeamBottom,
  djEdj: makeEDJ,
  djEdjBottom: makeEDJBottom,
  electro: makeElectro,
  trapper: makeTrapper,
  mineLayer: makeMineLayer,
  mineLayerBottom: makeMineLayerBottom,
  crookBoss: makeCrookBoss,
  pursuit: makePursuit,
  pursuitBottom: makePursuitBottom,
  pursuitHeli: makeHelicopter,
  pursuitHeliBottom: makeHelicopterBottom,
  mobster: makeMobster,
  mobsterBottom: makeMobsterBottom,
  zedBehemoth: makeBehemothFactory,
  zedBehemothBottom: makeBehemothFactoryBottom,
  warMachine: makeWarMachineFactory,
  warMachineBottom: makeWarMachineFactoryBottom,
  gatling: makeGatling,
  gatlingMachine: makeMachineGunner,
  gatlingMachineBottom: makeMachineGunnerBottom,
  turret: makeTurret,
  mortarClassic: makeMortarClassic,
  mortarArtillery: (level) => makeArtillery(level),
  mortarArtilleryBottom: (level) => makeArtillery(level, true),
  electroTrooper: makeShockTrooper,
  mercenary: makeMercBase,
  necromancer: makeNecromancer,
  engineer: makeEngineer,
  hacker: makeHacker,
  hackerBottom: makeHackerBottom,
  phaserAccel: makeAccelerator,
  john: makeJohn,
  johnBottom: makeJohnBottom,
  commandoJuggernaut: makeJuggernaut,
  commandoJuggernautBottom: makeJuggernautBottom,
  railgunnerLaser: makeLaserRailgunner,
  railgunnerLaserBottom: makeLaserRailgunnerBottom,
  enforcerSlammer: makeSlammer,
  enforcerSlammerBottom: makeSlammerBottom,
  turretXwm: makeXwm,
  turretXwmBottom: makeXwmBottom,
  sentry: makeSentryTower,
  sentryBottom: makeSentryTowerBottom,
  aaTurret: makeAATurret,
  aaTurretBottom: makeAATurretBottom,
  patrolBoat: makePatrolBoat,
  patrolBoatBottom: makePatrolBoatBottom,
  ghost: makeGhost,
  ghostBottom: makeGhostBottom,
  toxicnator: makeToxicnator,
  toxicnatorBottom: makeToxicnatorBottom,
  toxicnatorSaboteur: makeSaboteur,
  tesla: makeTesla,
  elf: makeElf,
  hallowboomer: makeHallowboomer,
  graveyard: makeGraveyard,
  sleeter: makeSleeter,
  snowballer: makeSnowballer,
  huntsman: makeHuntsman,
  archer: makeArcher,
  knifer: makeKnifer,
  stunner: makeStunner,
  harpoonHunter: makeHarpoonHunter,
  gladiator: makeGladiator,
  eventCommando: makeEventCommando,
  kniferSlasher: makeSlasher,
  sleeterBlaster: makeFrostBlaster,
  flameTrooper: makeFlameTrooper,
  gooGunner: makeGooGunner,
  frostBlaster: makeCryoBlaster,
  frostBlasterBottom: makeCryoBlasterBottom,
  cryoMortar: makeCryoMortar,
  archerBow: makeBowmaster,
  swarmer: makeSwarmer,
  toxicGunner: makeToxicGunner,
  sledger: makeSledger,
  sledgerIce: makeIceBreaker,
  cryoHeli: makeCryoHeli,
  executioner: makeExecutioner,
  elfCamp: makeElfCamp,
  relic: makeRelic,
  jester: makeJester,
  cryomancer: makeCryomancer,
  hallowboomerPunk: makeHallowPunk,
  harvester: makeHarvester,
  snowballerFrost: makeSnowballerFrost,
  elementalist: makeElementalist,
  fireworkTech: makeFireworkTech,
  biologist: makeBiologist,
  warlock: makeWarlock,
  spotlight: makeSpotlightTech,
  starCannon: makeStarCannon,
  evoOperator: makeOperator,
  evoBreacher: (level) => makeBreacher(level),
  evoBreacherBottom: (level) => makeBreacher(level, true),
  evoKingpin: (level) => makeKingpin(level),
  evoKingpinBottom: (level) => makeKingpin(level, true),
  evoTitan: (level) => makeTitan(level),
  evoTitanBottom: (level) => makeTitan(level, true),
  warship: makeWarship,
  warshipBottom: makeWarshipBottom,
  shieldTower: makeShieldTower,
  shieldTowerBottom: makeShieldTowerBottom,
  oilDerrick: makeOilDerrick,
  oilDerrickBottom: makeOilDerrickBottom,
  combatMedic: makeCombatMedic,
  combatMedicBottom: makeCombatMedicBottom,
  refractor: makeRefractor,
  refractorBottom: makeRefractorBottom,
  scoutHeli: makeScoutHeli,
  noobTuber: makeNoobTuber,
  stinger: makeStinger,
  jetTrooper: makeJetTrooper,
  jetTrooperBottom: makeJetTrooperBottom,
  combatDrone: makeCombatDrone,
  combatDroneBottom: makeCombatDroneBottom,
  voidTraitor: makeVoidTraitor,
  mlrs: makeMLRS,
  eventCommandoPsycho: makePsychoSlayer,
  cryomancerBubble: makeBubbleBlower,
  scarecrow: makeScarecrow,
  ...TOWER_MODELS_A,
  ...TOWER_MODELS_B,
  ...TOWER_MODELS_C,
  ...TOWER_MODELS_D,
  ...TOWER_MODELS_E,
  // Wave 9 hero towers (see herotowers.js).
  ...TOWER_MODELS_F,
  ...TOWER_MODELS_G,
  ...TOWER_MODELS_H,
  // Wave 10 (newmodels/i.js): last, so its scarecrow / barracks / knifer reworks win.
  ...TOWER_MODELS_I,
};
// Hero towers (wave 9): per-level outfits, signature pieces and max-level effects (see blitzup.js).
blitzUpgrades(TOWER_MODELS);

// Crosspath towers (wave 8): every Top / Bottom combo type draws its form's model for that combo.
for (const [type, def] of Object.entries(TOWERS)) {
  if (!def.cross) continue;
  const make = CROSS_MODELS[def.branchOf ?? type];
  if (!make) continue;
  TOWER_MODELS[type] = (level) => {
    const [a, b] = def.combos[Math.min(level, def.combos.length - 1)];
    return make(a, b);
  };
}

// Golden perk towers: the model of the tower they are the golden version of, in gold.
// goldFx (goldtowers.js): plus a golden mist, star particles and level tints (ruby, diamond...).
for (const [type, def] of Object.entries(TOWERS)) {
  if (def.goldOf && !TOWER_MODELS[type]) {
    const last = TOWERS[def.goldOf].levels.length - 1; // the Golden Pyromancer has one more level than the Pyromancer
    TOWER_MODELS[type] = (level) => goldify(TOWER_MODELS[def.goldOf](Math.min(level, last)));
  }
  if (def.goldFx && TOWER_MODELS[type]) {
    const make = TOWER_MODELS[type];
    TOWER_MODELS[type] = (level) => goldShine(make(level), def.goldFx, level);
  }
}
// Bottom paths of golden towers: the golden version of the normal form's Bottom path model.
for (const [type, def] of Object.entries(TOWERS)) {
  if (TOWER_MODELS[type] || !def.branchOf) continue;
  const base = TOWERS[TOWERS[def.branchOf]?.goldOf]; // the normal form the golden root is made from
  const make = base?.branch && TOWER_MODELS[base.branch];
  if (!make) continue;
  const last = TOWERS[base.branch].levels.length - 1;
  TOWER_MODELS[type] = (level) => goldify(make(Math.min(level, last)));
}

// Every tower model is de-clipped once it's built (see models/declip.js). Lookups between models
// (golden forms...) go through this table too, so mark finished models to skip a second pass.
for (const [type, make] of Object.entries(TOWER_MODELS)) {
  TOWER_MODELS[type] = (level) => {
    const model = make(level);
    if (model?.root && !model.root.userData.declipped) {
      rigify(model); // elbows, knees and a round head (rig.js)
      armWeapons(model, type, level); // bigger, more detailed weapons (weapons.js)
      declip(model.root);
      model.root.userData.declipped = true;
    }
    if (model) model.vis = styleFor(type, level, model); // how this tower stands, holds its weapon and moves
    return model;
  };
}
