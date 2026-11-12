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
  makeGoldCommando, makeGoldScout,
} from './models/towers01.js';
export {
  addCannon, addMinigun, makeGoldCommando, makeGoldScout, makePlane,
} from './models/towers01.js';
import {
  makeCowboy, makeDarter, makePaintballer, makeScout, makeScoutClassic, makeSoldier, makeTweeter,
} from './models/people1.js';
export {
  makeCowboy, makeDarter, makePaintballer, makeScout, makeScoutClassic, makeSoldier, makeTweeter,
} from './models/people1.js';
import {
  makeHunter, makeJohn, makeJohnBottom, makeMarksman, makeOperatorBottom, makeOperatorTower, makeQuarterer,
  makeSoldierClassic, makeSoldierRanger, makeSoldierRangerBottom,
} from './models/people2.js';
export {
  makeHunter, makeJohn, makeMarksman, makeOperatorTower, makeQuarterer, makeSoldierClassic, makeSoldierRanger,
} from './models/people2.js';
import {
  makeCommando, makeJuggernaut, makeJuggernautBottom, makeLaserGunner, makeLaserGunnerBottom, makeMercenary, makeMilitant,
  makeMinigunner,
} from './models/people3.js';
export {
  makeCommando, makeJuggernaut, makeLaserGunner, makeMercenary, makeMilitant, makeMinigunner,
} from './models/people3.js';
import {
  makeAccelerator, makeAviator, makeAviatorAce, makeLaserRailgunner, makeLaserRailgunnerBottom, makePhaser, makeRailgunner,
  makeRanger,
} from './models/people4.js';
export {
  makeAccelerator, makeAviator, makeAviatorAce, makeLaserRailgunner, makePhaser, makeRailgunner, makeRanger,
} from './models/people4.js';
import {
  makeEnforcer, makePenetrator, makeSlammer, makeSlammerBottom, makeSniper, makeSniperClassic, makeSniperTactical,
  makeSniperTacticalBottom, makeWarden,
} from './models/people5.js';
export {
  makeEnforcer, makePenetrator, makeSlammer, makeSniper, makeSniperClassic, makeSniperTactical, makeWarden,
} from './models/people5.js';
import {
  makeFirecracker, makeFrost, makeFrostFreezer, makeFrostRanger, makeFrostRangerBottom, makeGrenadier, makeGrenadierAssault,
  makeGrenadierAssaultBottom, makeGrenadierDemo,
} from './models/people6.js';
export {
  makeFirecracker, makeFrost, makeFrostFreezer, makeFrostRanger, makeGrenadier, makeGrenadierAssault, makeGrenadierDemo,
} from './models/people6.js';
import {
  makeArtillery, makeFlamethrower, makeMortar, makeMortarClassic, makeRocketeer, makeRocketeerMissile,
  makeRocketeerTrooper, makeRocketeerTrooperBottom,
} from './models/people7.js';
export {
  makeArtillery, makeFlamethrower, makeMortar, makeMortarClassic, makeRocketeer, makeRocketeerMissile,
  makeRocketeerTrooper, makeRocketeerTrooperBottom,
} from './models/people7.js';
import {
  makeElectro, makePlasma, makePlasmaPulse, makePyromancer, makeShotgunner, makeShotgunnerCombat,
  makeShotgunnerCombatBottom, makeShotgunnerPump,
} from './models/people8.js';
export {
  makeElectro, makePlasma, makePlasmaPulse, makePyromancer, makeShotgunner, makeShotgunnerCombat, makeShotgunnerPump,
} from './models/people8.js';
import {
  goldShine, makeAnarchist, makeCommander, makeCommanderClassic, makeDJ, makeDJBooth, makeGoldCommander,
} from './models/towers03.js';
export {
  addRevolver, goldShine, makeAnarchist, makeCommander, makeCommanderClassic, makeDJ, makeDJBooth,
  makeGoldCommander,
} from './models/towers03.js';
import {
  makeAssassin, makeBoomerang, makeBrawler, makeMachineGunner, makeMachineGunnerBottom,
  makeSlime,
} from './models/towers04.js';
export {
  makeAssassin, makeBoomerang, makeBrawler, makeMachineGunner, makeSlime,
} from './models/towers04.js';
import {
  makeEDJ, makeEDJBottom,
  makeMedic, makeMedicBeam, makeMedicBeamBottom, makeMineLayer, makeMineLayerBottom,
  makeTrapper,
} from './models/towers05.js';
export {
  makeAcePlane, makeEDJ, makeMedic, makeMedicBeam,
  makeMineLayer, makeTrapper,
} from './models/towers05.js';
import {
  makeCrookBoss, makeMobster, makeMobsterBottom,
} from './models/towers06.js';
export {
  makeCrookBoss, makeMobster,
  makeMobsterBottom, makeMobsterModel,
} from './models/towers06.js';
import {
  makeBehemothFactory, makeBehemothFactoryBottom, makeFarm, makeMercBase, makePatrol, makePursuit, makePursuitBottom,
  makeWarMachineFactory, makeWarMachineFactoryBottom, makeZed,
} from './models/machines2.js';
export {
  makeBehemothFactory, makeBehemothFactoryBottom, makeFarm, makeHeavyFactory, makeHeli, makeMercBase, makePatrol,
  makePursuit, makePursuitBottom, makePursuitModel, makeWarMachineFactory, makeWarMachineFactoryBottom, makeZed,
} from './models/machines2.js';
import {
  makeCryoHeli, makeElfCamp, makeGraveyard, makeMLRS, makePatrolBoat, makePatrolBoatBottom, makeRelic, makeStarCannon,
  makeWarship, makeWarshipBottom,
} from './models/machines3.js';
export {
  makeCryoHeli, makeElfCamp, makeGraveyard, makeMLRS, makePatrolBoat, makeRelic, makeStarCannon, makeWarship,
} from './models/machines3.js';
import {
  makeEngineer, makeHacker, makeHackerBottom, makeNecromancer,
} from './models/towers07.js';
export {
  makeEngineer, makeGrave, makeHacker, makeHackerBottom, makeHologram, makeNecromancer, makeSentry,
} from './models/towers07.js';
import {
  makeGhost, makeGhostBottom,
  makeSaboteur, makeToxicnator, makeToxicnatorBottom,
} from './models/towers08.js';
import { makeAATurret, makeAATurretBottom, makeGatling, makeSentryTower, makeSentryTowerBottom, makeTesla, makeTurret } from './models/machines1.js';
export { makeAATurret, makeGatling, makeSentryTower, makeTesla, makeTurret } from './models/machines1.js';
export {
  makeGhost, makeSaboteur, makeToxicnator,
  miniBarrels,
} from './models/towers08.js';
import {
  makeArcher, makeBowmaster, makeBreacher, makeCryoBlaster, makeCryoBlasterBottom, makeCryoMortar, makeElf,
  makeEventCommando, makeExecutioner, makeFlameTrooper, makeFrostBlaster, makeGladiator, makeGooGunner,
  makeHallowboomer, makeHarpoonHunter, makeHuntsman, makeKingpin, makeKnifer, makeOperator, makeSlasher, makeSledger,
  makeSleeter, makeSnowballer, makeStunner, makeSwarmer, makeTitan, makeToxicGunner,
} from './models/towers09.js';
export {
  bladeIn, evoEmblem, iceGun, makeArcher, makeBowmaster, makeBreacher, makeCryoBlaster, makeCryoBlasterBottom,
  makeCryoMortar, makeElf, makeEventCommando, makeExecutioner, makeFlameTrooper, makeFrostBlaster, makeGladiator,
  makeGooGunner, makeHallowboomer, makeHarpoonHunter, makeHuntsman, makeKingpin, makeKnifer,
  makeOperator, makeSlasher, makeSledger, makeSleeter, makeSnowballer, makeStunner, makeSwarmer, makeTitan,
  makeToxicGunner, recolor,
} from './models/towers09.js';
import {
  makeBiologist, makeCryomancer, makeElementalist, makeFireworkTech, makeHallowPunk,
  makeHarvester, makeIceBreaker, makeJester, makeShockTrooper, makeSnowballerFrost, makeSpotlightTech,
  makeWarlock,
} from './models/towers10.js';
export {
  makeBiologist, makeCryomancer, makeElementalist, makeFireworkTech, makeHallowPunk,
  makeHarvester, makeIceBreaker, makeJester, makeShockTrooper, makeSnowballerFrost, makeSpotlightTech,
  makeWarlock,
} from './models/towers10.js';
import {
  makeCombatMedic, makeCombatMedicBottom, makeJetTrooper, makeJetTrooperBottom, makeNoobTuber, makeRefractor,
  makeRefractorBottom, makeStinger,
} from './models/towers11.js';
export { makeCombatMedic, makeJetTrooper, makeNoobTuber, makeRefractor, makeStinger } from './models/towers11.js';
import {
  makeCombatDrone, makeCombatDroneBottom, makeDuckyNest, makeFocus, makeOilDerrick, makeOilDerrickBottom,
  makePlantation, makeScoutHeli, makeShieldTower, makeShieldTowerBottom, makeTrawler,
} from './models/machines4.js';
export { makeCombatDrone, makeOilDerrick, makeScoutHeli, makeShieldTower } from './models/machines4.js';
import {
  makeBroadcaster, makeBuccaneer, makeEnforcementBase, makeGlacier, makeGlowup, makeMarauder, makeStasis, makeSubmerge,
} from './models/machines5.js';
import {
  makeBorealis, makeEldritch, makeLemonade, makeOrbit, makeSplash, makeSquadron, makeValkyr, makeVoidPort,
} from './models/machines6.js';
import {
  makeArmoredFactory, makeArmoredFactoryBottom, makeBarracks, makeFarmAirdrop, makeFarmAirdropBottom, makeFarmFruit,
  makeFieldBarracks, makeFieldBarracksBottom, makeHelicopter, makeHelicopterBottom, makeHelicopterPad, makeMilitaryBase,
  makeXwm, makeXwmBottom,
} from './models/machines7.js';
export {
  makeArmoredFactory, makeArmoredFactoryBottom, makeArmoredFactoryWith, makeBarracks, makeFarmAirdrop, makeFarmFruit,
  makeFieldBarracks, makeFieldBarracksBottom, makeFieldBarracksWith, makeHelicopter, makeHelicopterBottom,
  makeHelicopterModel, makeHelicopterPad, makeMilitaryBase, makeXwm,
} from './models/machines7.js';
import {
  makeBubbleBlower, makePsychoSlayer, makeVoidTraitor,
} from './models/towers12.js';
export {
  makeBubbleBlower, makePsychoSlayer, makeVoidTraitor,
} from './models/towers12.js';
import {
  makeBalloonPal, makeBuzzer, makeKartKid, makeNukiLauncher, makeScarecrow, makeTimeDilator,
} from './models/machines8.js';
export {
  makeBalloonPal, makeBuzzer, makeKartKid, makeNukiLauncher, makeScarecrow, makeTimeDilator,
} from './models/machines8.js';
// People batches 9-24 and the hero batches: each file has a MODELS map laid over TOWER_MODELS below.
import { MODELS as PEOPLE_9 } from './models/people9.js';
import { MODELS as PEOPLE_10 } from './models/people10.js';
import { MODELS as PEOPLE_11 } from './models/people11.js';
import { MODELS as PEOPLE_12 } from './models/people12.js';
import { MODELS as PEOPLE_13 } from './models/people13.js';
import { MODELS as PEOPLE_14 } from './models/people14.js';
import { MODELS as PEOPLE_15 } from './models/people15.js';
import { MODELS as PEOPLE_16 } from './models/people16.js';
import { MODELS as PEOPLE_17 } from './models/people17.js';
import { MODELS as PEOPLE_18 } from './models/people18.js';
import { MODELS as PEOPLE_19 } from './models/people19.js';
import { MODELS as PEOPLE_20 } from './models/people20.js';
import { MODELS as PEOPLE_21 } from './models/people21.js';
import { MODELS as PEOPLE_22 } from './models/people22.js';
import { MODELS as PEOPLE_23 } from './models/people23.js';
import { MODELS as PEOPLE_24 } from './models/people24.js';
import { MODELS as HEROES_1 } from './models/heroes1.js';
import { MODELS as HEROES_2 } from './models/heroes2.js';
import { MODELS as HEROES_3 } from './models/heroes3.js';
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
  helicopter: makeHelicopterPad,
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
  plantation: makePlantation,
  focus: makeFocus,
  duckyNest: makeDuckyNest,
  trawler: makeTrawler,
  buccaneer: makeBuccaneer,
  broadcaster: makeBroadcaster,
  stasis: makeStasis,
  glowup: makeGlowup,
  glacier: makeGlacier,
  enforcementBase: makeEnforcementBase,
  submerge: makeSubmerge,
  marauder: makeMarauder,
  orbit: makeOrbit,
  voidPort: makeVoidPort,
  eldritch: makeEldritch,
  valkyr: makeValkyr,
  squadron: makeSquadron,
  borealis: makeBorealis,
  splash: makeSplash,
  farmLemonade: makeLemonade,
  buzzer: makeBuzzer,
  nukiLauncher: makeNukiLauncher,
  zedKart: makeKartKid,
  balloonPal: makeBalloonPal,
  timeDilator: makeTimeDilator,
  ...TOWER_MODELS_A,
  ...TOWER_MODELS_B,
  ...TOWER_MODELS_C,
  ...TOWER_MODELS_D,
  ...TOWER_MODELS_E,
  // Wave 9 hero towers (see herotowers.js).
  ...TOWER_MODELS_F,
  ...TOWER_MODELS_G,
  ...TOWER_MODELS_H,
  // Wave 10 (newmodels/i.js): last, so its knifer rework wins.
  ...TOWER_MODELS_I,
};
// The rebuilt people and heroes (models/people9-24.js, models/heroes1-3.js) win over the older builders above.
for (const m of [PEOPLE_9, PEOPLE_10, PEOPLE_11, PEOPLE_12, PEOPLE_13, PEOPLE_14, PEOPLE_15, PEOPLE_16, PEOPLE_17, PEOPLE_18, PEOPLE_19, PEOPLE_20, PEOPLE_21, PEOPLE_22, PEOPLE_23, PEOPLE_24, HEROES_1, HEROES_2, HEROES_3]) Object.assign(TOWER_MODELS, m);
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
