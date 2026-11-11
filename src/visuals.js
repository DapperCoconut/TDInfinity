import { TOWERS } from './config.js';
import { ARMS } from './anim.js';

// Visuals 2.0: how every tower stands, holds its weapon, rests and moves.
//
// A style is { stance, hold, rest, idle, fire } and is played by the pose engine in anim.js:
//   stance  where the feet are planted and how the hips sit
//   hold    how the weapon is held while firing (where the gun hand is, how the body is turned,
//           what the off hand does)
//   rest    how the weapon is carried between fights (null: never lowered)
//   idle    the idle animation, fire: the firing animation
//
// TABLE gives every tower its own combination; towers that are not listed get one derived from
// their name, different from their parent tower's.
//
// Model space: feet on y = 0, pelvis at y = 2, shoulders at y = 4 and x = -+1.5, facing +Z, the
// character's right is -X. Arms reach 1.66 from the shoulder to the wrist.

// ---------------------------------------------------------------- stances
// rf / lf: [out, forward, toe out, lift, heel up, free] for the right / left foot.
export const STANCES = {
  stand: { rf: [0.05, 0, 0.12], lf: [0.05, 0, 0.12] },
  wide: { rf: [0.5, 0, 0.3], lf: [0.5, 0, 0.3], drop: 0.08 },
  bladed: { lf: [0.1, 0.5, 0.05], rf: [0.25, -0.45, 0.55] },
  widebladed: { lf: [0.3, 0.75, 0.1], rf: [0.45, -0.6, 0.7], drop: 0.2 },
  stagger: { lf: [0.3, 0.3, 0.2], rf: [0.3, -0.3, 0.35], drop: 0.15 },
  crouch: { rf: [0.4, -0.15, 0.3], lf: [0.4, 0.25, 0.2], drop: 0.55, lean: 0.22, hp: -0.15 },
  squat: { rf: [0.55, 0, 0.5], lf: [0.55, 0, 0.5], drop: 0.95, lean: 0.3, hp: -0.25, rk: [-0.8, 0, 0.6], lk: [0.8, 0, 0.6] },
  kneel: { lf: [0.15, 0.7, 0], rf: [0.1, -0.75, 0, 0, 1.2], drop: 1.05, rk: [0, -0.6, 1], lean: 0.05 },
  lunge: { lf: [0.1, 1.0, 0], rf: [0.2, -0.85, 0.4, 0, 0.5], drop: 0.42, pz: 0.25, lean: 0.14 },
  march: { lf: [0, 0.5, 0], rf: [0, -0.4, 0, 0, 0.5], pz: 0.05 },
  power: { rf: [0.4, 0, 0.45], lf: [0.4, 0, 0.45], lean: -0.08, hp: -0.06 },
  hero: { lf: [0.35, 0.45, 0.3], rf: [0.3, -0.25, 0.5], lean: -0.1, hp: -0.1, drop: 0.05 },
  leanBack: { lf: [0.1, 0.6, 0.1], rf: [0.15, -0.2, 0.4], pz: -0.25, lean: -0.16, hp: 0.1 },
  contra: { rf: [0, 0, 0.15], lf: [0.4, 0.2, 0.5], px: -0.22, roll: 0.07, drop: 0.03 },
  slouch: { rf: [0.1, 0, 0.3], lf: [0.25, 0.25, 0.4], lean: -0.1, hp: 0.16, drop: 0.06, px: -0.1 },
  toe: { lf: [0.05, 0, 0.1], rf: [0.05, -0.35, 0.2, 0, 0.9], px: 0.15 },
  sumo: { rf: [0.75, 0, 0.6], lf: [0.75, 0, 0.6], drop: 0.6, rk: [-1, 0, 0.5], lk: [1, 0, 0.5], lean: 0.1 },
  attention: { rf: [-0.08, 0, 0.25], lf: [-0.08, 0, 0.25], lean: -0.03 },
  bowleg: { rf: [0.35, 0, 0.5], lf: [0.35, 0, 0.5], drop: 0.22, rk: [-1, 0, 0.45], lk: [1, 0, 0.45] },
  fencer: { rf: [0, 0.85, 0], lf: [0.25, -0.55, 1.1], drop: 0.3, pz: 0.1 },
  sprint: { lf: [0.05, 0.7, 0], rf: [0.1, -0.75, 0, 0, 0.75], drop: 0.3, lean: 0.3, pz: 0.2, hp: -0.25 },
  pigeon: { rf: [0.15, 0, -0.35], lf: [0.15, 0, -0.35], drop: 0.1 },
  crane: { lf: [0, 0, 0.1], rf: [0.1, 0.35, 0.2, 0.95, -0.5, 1], px: 0.3 },
  tall: { rf: [0, 0, 0.1, 0, 0.5], lf: [0, 0, 0.1, 0, 0.5], lean: -0.04 },
};

// ---------------------------------------------------------------- firing holds
// c: T two hands on one gun, O one-handed gun (the off hand does `l`), D a gun in each hand,
//    M melee (the arm keeps its built pose, moved by raise / splay / tuck), A as built.
// r: the gun hand's wrist. yaw: how far the chest is turned (negative: right shoulder back).
export const HOLDS = {
  // two-handed
  shoulder: { c: 'T', yaw: -0.8, r: [-0.5, 3.8, 0.15], g: 0.9, hr: 0.1, lean: 0.06 },
  cheek: { c: 'T', yaw: -1.0, r: [-0.42, 3.92, 0.05], g: 1.1, rp: [-1, 0.35, -0.2], hr: 0.2, hp: 0.06, lean: 0.1 },
  chest: { c: 'T', yaw: -0.6, r: [-0.4, 3.45, 0.4], g: 0.6, lean: 0.04 },
  low: { c: 'T', yaw: -0.85, r: [-0.4, 3.15, 0.35], g: 0.8, lean: 0.2, drop: 0.1, hp: -0.1 },
  topgrip: { c: 'T', yaw: -0.7, r: [-0.55, 2.95, 0.3], l: 'top', g: 0.7, lean: 0.12 },
  launcher: { c: 'T', yaw: -1.1, r: [-0.8, 4.45, 0.3], g: 0.5, hr: -0.12, rp: [-1, -0.3, 0] },
  weaver: { c: 'T', yaw: -0.6, r: [-0.3, 3.9, 0.5], g: 0.12, lean: 0.05 },
  canted: { c: 'T', yaw: -0.75, r: [-0.45, 3.75, 0.2], g: 0.8, cant: -0.6, hr: 0.25 },
  tucked: { c: 'T', yaw: -0.5, r: [-0.25, 3.62, 0.3], g: 0.4, lean: 0.12, hp: -0.05 },
  // one-handed
  duelist: { c: 'O', yaw: 0.9, r: [-0.7, 4.05, 2.6], l: 'back' },
  underarm: { c: 'O', yaw: -0.35, r: [-1.15, 3.25, 0.55], l: 'hip', rp: [-1, 0, -0.6] },
  gangsta: { c: 'O', yaw: 0.5, r: [-0.9, 4.35, 2.0], cant: -1.3, l: 'pocket' },
  hipshot: { c: 'O', yaw: 0.15, r: [-1.35, 2.95, 0.7], l: 'hip', rp: [-0.6, 0, -1] },
  point: { c: 'O', yaw: 0.25, r: [-1.3, 4.0, 1.85], l: 'side' },
  highdown: { c: 'O', yaw: 0.4, r: [-1.2, 5.0, 1.3], pitch: 0.35, l: 'hip' },
  braced: { c: 'O', yaw: -0.2, r: [-1.05, 3.4, 0.95], l: 'guard' },
  // a gun in each hand (l2: the left wrist; mirrored from r when missing)
  akimbo: { c: 'D', r: [-1.1, 3.95, 1.35] },
  dwide: { c: 'D', r: [-2.2, 4.1, 1.1], rp: [-0.3, -1, -0.3], lp: [0.3, -1, -0.3] },
  dlow: { c: 'D', r: [-1.3, 3.0, 0.85], rp: [-0.6, 0, -1], lp: [0.6, 0, -1], lean: -0.06 },
  dstagger: { c: 'D', yaw: -0.5, r: [-0.9, 3.5, 0.5], l2: [0.9, 4.05, 1.9] },
  dclose: { c: 'D', r: [-0.45, 3.9, 1.2], lean: 0.08 },
  dgangsta: { c: 'D', r: [-1.0, 4.4, 1.25], cant: -1.3, hp: -0.08 },
  dhighlow: { c: 'D', r: [-1.25, 4.6, 1.0], pitch: 0.25, l2: [1.25, 3.1, 0.9], lpitch: 0 },
  dside: { c: 'D', yaw: 0.8, r: [-0.7, 4.05, 2.5], l2: [0.9, 3.5, 0.3] },
  // melee: the weapon arm as built
  overhead: { c: 'M' },
  cocked: { c: 'M', raise: 0.45, splay: 0.35 },
  guardM: { c: 'M', raise: 1.1, tuck: 0.3 },
  shoulderM: { c: 'M', raise: -0.45 },
  wind: { c: 'M', raise: 0.3, yaw: -0.5 },
  boxer: { c: 'M', tuck: 0.35, tuckL: 0.35, yaw: -0.4 },
  asbuilt: { c: 'A', l: 'built' },
};

// ---------------------------------------------------------------- resting holds
// pitch > 0 points the muzzle down, turn > 0 toward the character's left.
export const RESTS = {
  lowReady: { c: 'G', r: [-0.5, 3.15, 0.5], pitch: 0.75, yaw: -0.45, l: 'grip', g: 0.7 },
  highReady: { c: 'G', r: [-0.55, 3.55, 0.45], pitch: -0.95, yaw: -0.4, l: 'grip', g: 0.6 },
  port: { c: 'G', r: [-0.75, 3.1, 0.6], pitch: -0.75, turn: 0.85, yaw: 0, l: 'grip', g: 0.9 },
  shoulderRest: { c: 'G', r: [-1.3, 3.85, 0.5], pitch: -2.3, yaw: 0, l: 'hip', rp: [-1, -0.5, 0.3] },
  atSide: { c: 'G', r: [-1.62, 2.45, 0.15], pitch: 1.4, yaw: 0, l: 'side' },
  trail: { c: 'G', r: [-1.4, 2.75, 0.45], pitch: 0.3, turn: -0.15, yaw: 0.15, l: 'hip' },
  cradle: { c: 'G', r: [-0.95, 2.95, 0.6], turn: 1.15, pitch: 0.25, yaw: 0.1, l: 'grip', g: 0.8 },
  upright: { c: 'G', r: [-1.25, 3.75, 0.65], pitch: -1.5, yaw: 0, l: 'pocket' },
  leanOn: { c: 'G', r: [-0.5, 3.0, 0.8], pitch: 1.5, yaw: -0.2, lean: 0.1, l: 'grip', g: 0.3 },
  relax: { c: 'G', r: [-1.3, 2.6, 0.5], pitch: 0.9, turn: 0.5, yaw: 0, l: 'rest' },
  // two guns
  dDown: { c: 'D', r: [-1.65, 2.5, 0.2], pitch: 1.35 },
  dUp: { c: 'D', r: [-1.35, 3.8, 0.6], pitch: -1.45 },
  dCross: { c: 'D', r: [-0.5, 3.5, 0.75], pitch: -1.0, turn: 0.7 },
  dSplit: { c: 'D', r: [-1.3, 3.8, 0.6], pitch: -1.45, l2: [1.6, 2.5, 0.2], lpitch: 1.35 },
  dHolster: { c: 'D', r: [-1.3, 2.55, 0.35], pitch: 1.1 },
  dReady: { c: 'D', r: [-1.2, 3.2, 0.9], pitch: 0.4 },
  // melee
  lowered: { c: 'M', raise: 1.9, tuck: 0.15 },
  sideM: { c: 'M', raise: 2.3, splay: 0.12 },
  frontM: { c: 'M', raise: 1.25, tuck: 0.35 },
  highM: { c: 'M' },
};

// ---------------------------------------------------------------- every tower's own style
// 'stance hold rest idle fire' (+ l:<off hand while firing> rl:<off hand at rest> ia: fa:
// animation strength, q: seconds before the weapon is lowered). a/b: the first that fits the
// weapons the model carries at that level.
const TABLE = {
  scout: 'bladed shoulder lowReady scan kick',
  goldScoutBase: 'hero weaver/dside upright/dUp proud snap',
  scoutClassic: 'stand weaver/akimbo upright/dDown bounce snap',
  goldScout: 'power point/dwide atSide/dCross proud akimbo',
  scoutDarter: 'lunge cocked lowered tap lob',
  scoutSlinger: 'toe point relax bounce lob l:guard',
  scoutWizard: 'tall asbuilt - conduct cast',
  paintballer: 'wide chest port groove kick',
  tweeter: 'stand tucked/dwide highReady/dUp float kick',
  cowboy: 'bowleg hipshot/dlow trail/dHolster flourish spin q:1.6',
  goldCowboy: 'leanBack gangsta/dgangsta upright/dSplit proud fan',
  cowboyBusinessman: 'contra point atSide proud snap',
  john: 'contra point/dstagger atSide/dDown wander snap',
  johnBottom: 'leanBack underarm shoulderRest nod rattle l:pocket',
  soldier: 'march shoulder highReady stoic kick',
  soldierClassic: 'attention cheek port stoic kick',
  goldSoldier: 'power chest shoulderRest proud kick',
  soldierRanger: 'kneel cheek lowReady scan bolt',
  soldierRangerBottom: 'crouch tucked port prowl rattle',
  goldRanger: 'widebladed shoulder highReady proud bolt',
  goldRangerBottom: 'sprint chest cradle twitch rattle',
  soldierQuarterer: 'wide dstagger dCross shift akimbo',
  soldierSparks: 'hero shoulder port bounce rattle',
  operator: 'bladed cheek lowReady servo kick',
  operatorBottom: 'stagger tucked highReady twitch rattle',
  evoOperator: 'stagger shoulder port servo kick',
  marksman: 'widebladed cheek highReady check bolt',
  marksmanHunter: 'kneel shoulder leanOn wander bolt',
  marksmanSharpshooter: 'stagger canted trail scan bolt',
  merc: 'slouch low shoulderRest tap rattle',
  mercMilitant: 'sprint shoulder port prowl rattle',
  mercLaser: 'wide low cradle servo beam',
  mercLaserBottom: 'power chest/dwide lowReady/dUp servo akimbo',
  commando: 'power low/dlow shoulderRest/dDown proud rattle',
  goldCommando: 'hero topgrip trail proud rattle',
  commandoMinigunner: 'sumo topgrip trail hunch rattle',
  goldMinigunner: 'wide low cradle proud rattle',
  commandoJuggernaut: 'squat low always hunch rattle',
  commandoJuggernautBottom: 'sumo topgrip/dlow trail/dReady hunch akimbo',
  goldJuggernaut: 'power topgrip leanOn proud rattle',
  goldJuggernautBottom: 'wide low/dwide cradle/dDown proud akimbo',
  eventCommando: 'power canted shoulderRest tap rattle',
  eventCommandoPsycho: 'sprint braced relax twitch rattle',
  shockCommando: 'wide asbuilt - twitch kick',
  goldShockCommando: 'power asbuilt - proud kick',
  phaser: 'stand chest highReady servo beam',
  phaserAccel: 'widebladed low always shiver beam',
  phaserElite: 'tall weaver upright tiptoe beam',
  railgunner: 'crouch shoulder always stoic heavy',
  railgunnerRanger: 'kneel cheek leanOn check heavy',
  railgunnerLaser: 'lunge shoulder port servo beam',
  railgunnerLaserBottom: 'stand chest always servo beam',
  railgunnerScientist: 'slouch chest/dclose cradle/dReady check heavy',
  sniper: 'kneel cheek highReady stoic bolt',
  sniperClassic: 'bladed cheek shoulderRest wander bolt',
  sniperTactical: 'crouch shoulder lowReady check bolt',
  sniperTacticalBottom: 'kneel canted port scan heavy',
  sniperPenetrator: 'lunge cheek leanOn stoic heavy',
  sniperX: 'widebladed shoulder upright stoic bolt',
  sniperQuinn: 'bladed asbuilt - wander bolt',
  enforcer: 'bladed overhead frontM stoic swing',
  enforcerWarden: 'wide cocked lowered proud chop',
  enforcerSlammer: 'sumo overhead frontM hunch chop',
  enforcerSlammerBottom: 'lunge shoulderM frontM rock chop',
  enforcerChef: 'toe cocked frontM nod chop',
  grenadier: 'march overhead lowered toss lob',
  grenadierDemo: 'wide launcher shoulderRest groove lob',
  goldDemoman: 'power chest port proud lob',
  grenadierAssault: 'sprint cocked lowered bounce lob',
  grenadierAssaultBottom: 'crouch overhead frontM twitch lob',
  grenadierFirecracker: 'toe cocked sideM groove hop',
  grenadierDemolitionist: 'wide asbuilt - nod lob',
  frost: 'stand shoulder lowReady shiver kick',
  frostFreezer: 'wide low cradle shiver beam',
  frostFreezerX: 'lunge topgrip port shiver beam',
  frostRanger: 'kneel cheek port shiver bolt',
  frostRangerBottom: 'bladed tucked highReady shiver rattle',
  frostBlaster: 'crouch chest highReady shiver kick',
  frostBlasterBottom: 'bladed shoulder leanOn shiver heavy',
  rocketeer: 'bladed launcher shoulderRest stoic lob',
  rocketeerMissile: 'kneel launcher trail check lob',
  rocketeerTrooper: 'power launcher port proud heavy',
  rocketeerTrooperBottom: 'crouch low lowReady prowl lob',
  rockety: 'toe launcher upright bounce hop',
  mortar: 'kneel asbuilt - check lob',
  mortarClassic: 'squat asbuilt - nod lob',
  mortarArtillery: 'wide asbuilt - stoic heavy',
  mortarArtilleryBottom: 'crouch asbuilt - scan heavy',
  cryoMortar: 'stagger asbuilt - shiver lob',
  mortarVoca: 'tall asbuilt - groove lob',
  flamethrower: 'wide low/dlow lowReady/dDown sway beam',
  flamethrowerPyro: 'lunge topgrip cradle rock beam',
  goldPyromancer: 'power low port proud beam',
  flameTrooper: 'march topgrip lowReady sway beam',
  shotgunner: 'bladed shoulder port tap pump',
  shotgunnerPump: 'crouch low lowReady prowl pump',
  shotgunnerCombat: 'sprint tucked highReady twitch pump',
  shotgunnerCombatBottom: 'wide canted shoulderRest tap pump',
  shotgunnerGunslinger: 'bowleg underarm trail flourish pump l:hip',
  plasma: 'power asbuilt - servo heavy',
  plasmaPulse: 'crouch asbuilt - twitch heavy',
  plasmaLightbeamer: 'widebladed low always servo beam',
  electro: 'bladed chest highReady twitch beam',
  electroTrooper: 'wide low port twitch beam',
  trapper: 'crouch cocked lowered prowl lob',
  trapperX: 'squat overhead highM check lob',
  mineLayer: 'kneel overhead frontM check lob',
  mineLayerBottom: 'crouch cocked lowered nod lob',
  goldMineLayer: 'power overhead sideM proud lob',
  goldMineLayerBottom: 'wide cocked frontM proud lob',
  boomerang: 'lunge cocked sideM bounce swing',
  boomerangKeith: 'toe overhead lowered groove swing',
  slime: 'pigeon chest cradle groove kick',
  assassin: 'crane cocked lowered prowl swing',
  brawler: 'bladed boxer - bounce punch',
  brawlerMako: 'sumo overhead sideM hunch chop',
  goldMako: 'power shoulderM frontM proud chop',
  crookBoss: 'contra underarm shoulderRest proud rattle l:pocket',
  goldCrookBoss: 'leanBack hipshot upright proud rattle',
  mobster: 'slouch braced trail tap rattle',
  mobsterBottom: 'stand point atSide nod snap',
  goldMobster: 'hero underarm upright proud rattle l:chin',
  goldMobsterBottom: 'contra gangsta trail proud snap',
  evoKingpin: 'leanBack hipshot/underarm upright wander rattle l:pocket',
  evoKingpinBottom: 'contra braced/chest trail nod rattle',
  ghost: 'crouch tucked lowReady prowl kick',
  ghostBottom: 'kneel cheek port stoic bolt',
  toxicnator: 'wide low cradle sway beam',
  toxicnatorBottom: 'lunge topgrip lowReady rock beam',
  toxicnatorSaboteur: 'sprint chest port twitch kick',
  toxicnatorMaitake: 'pigeon cocked lowered sway lob',
  toxicGunner: 'bladed tucked lowReady servo rattle',
  necromancer: 'leanBack highdown upright conduct cast l:wide',
  engineer: 'wide chest port check heavy',
  engineerMechanic: 'crouch weaver trail nod kick',
  engineerStella: 'hero cocked frontM bounce swing',
  sentryEngineer: 'stagger weaver relax nod kick',
  hacker: 'slouch asbuilt - nod none',
  hackerBottom: 'wide asbuilt - twitch none',
  medic: 'stand chest highReady nod kick',
  medicBeam: 'contra point atSide sway beam l:hip',
  medicBeamBottom: 'bladed shoulder cradle scan beam',
  combatMedic: 'march tucked lowReady scan kick',
  combatMedicBottom: 'crouch chest port check kick',
  doctor: 'attention point upright nod snap l:back',
  commander: 'attention point upright proud command l:back',
  commanderClassic: 'power highdown atSide stoic command l:hip',
  goldCommander: 'hero cocked highM proud chop',
  dj: 'wide asbuilt - groove none',
  djBooth: 'stand asbuilt - nod none',
  djEdj: 'toe asbuilt - bounce none',
  djEdjBottom: 'pigeon asbuilt - groove none ia:1.4',
  anarchist: 'slouch gangsta atSide tap snap l:pocket',
  gatlingMachine: 'sumo topgrip always hunch rattle',
  gatlingMachineBottom: 'kneel low always stoic rattle',
  elf: 'toe overhead lowered bounce lob',
  giftElf: 'pigeon cocked frontM groove lob',
  hallowboomer: 'stagger cocked sideM groove lob',
  hallowboomerPunk: 'wide asbuilt - groove hop',
  sleeter: 'bladed shoulder cradle shiver kick',
  sleeterBlaster: 'widebladed low port shiver heavy',
  snowballer: 'wide overhead frontM toss lob',
  snowballerFrost: 'march cocked/launcher lowered/trail shiver lob',
  huntsman: 'leanBack cheek shoulderRest wander bolt',
  hunter: 'stagger shoulder trail scan bolt',
  archer: 'bladed asbuilt - scan bolt',
  archerBow: 'widebladed asbuilt - check bolt',
  archerCrossbower: 'kneel shoulder port check bolt',
  stunner: 'fencer duelist upright twitch snap',
  harpoonHunter: 'lunge low leanOn rock heavy',
  gladiator: 'bladed cocked frontM proud swing',
  gladiatorCyberblade: 'widebladed guardM lowered servo swing',
  kniferSlasher: 'crouch cocked lowered twitch swing',
  knifer: 'stagger guardM lowered bounce swing',
  kniferYasuke: 'widebladed shoulderM sideM stoic swing',
  gooGunner: 'pigeon low cradle groove lob',
  swarmer: 'toe chest port twitch kick',
  sledger: 'wide overhead sideM hunch chop',
  sledgerIce: 'lunge shoulderM lowered rock chop',
  slugger: 'bladed wind sideM tap swing',
  executioner: 'power asbuilt - stoic chop',
  jester: 'crane overhead highM bounce hop',
  jesterChaos: 'tall cocked highM float hop',
  cryomancer: 'tall point upright conduct cast l:out',
  cryomancerBubble: 'pigeon point/weaver relax sway cast l:chin',
  iceApprentice: 'stand point upright conduct cast',
  harvester: 'slouch underarm/low shoulderRest wander heavy',
  elementalist: 'hero highdown upright conduct cast l:up',
  fireworkTech: 'toe gangsta atSide bounce lob l:ear',
  biologist: 'slouch point/chest relax check kick l:chin',
  warlock: 'power cocked frontM conduct chop',
  warlockWafer: 'toe overhead lowered bounce lob',
  goldWafer: 'hero cocked sideM proud lob',
  spotlight: 'stand asbuilt - scan none',
  evoBreacher: 'sprint low lowReady prowl pump',
  evoBreacherBottom: 'wide tucked highReady tap pump',
  evoTitan: 'sumo low always hunch rattle',
  evoTitanBottom: 'power topgrip/dlow trail/dDown proud akimbo',
  refractor: 'tall chest highReady servo beam',
  refractorBottom: 'widebladed shoulder always stoic beam',
  noobTuber: 'pigeon launcher relax bounce hop',
  stinger: 'bladed asbuilt - scan lob',
  voidTraitor: 'lunge overhead sideM hunch chop',
  traitor: 'widebladed cocked lowered prowl swing',
  voidKing: 'power overhead frontM proud chop',
  samurai: 'widebladed overhead frontM stoic swing',
  goldSamurai: 'hero shoulderM sideM proud swing',
  spiritAdvocate: 'tall cocked frontM conduct swing',
  hiredGun: 'slouch underarm shoulderRest tap kick l:pocket',
  goldHiredGun: 'hero canted trail proud kick',
  outlaw: 'leanBack hipshot trail flourish fan q:1.6',
  goldOutlaw: 'bowleg gangsta upright proud spin q:1.6',
  liberator: 'power dwide dUp proud akimbo',
  ruptor: 'kneel shoulder leanOn stoic heavy',
  spark: 'widebladed low cradle twitch beam',
  plunder: 'stagger underarm shoulderRest wander kick l:visor',
  spectre: 'crouch cheek lowReady stoic bolt',
  planeswalker: 'hero low always tiptoe beam',
  ghostbuster: 'stagger low cradle twitch beam',
  punkbuster: 'stand canted highReady float kick',
  paralyzer: 'stand asbuilt - servo beam',
  exterminator: 'wide asbuilt - sway beam',
};

// ---------------------------------------------------------------- lookup
const hash = (s, salt = 0) => {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h ^ (h >>> 13)) >>> 0;
};
const NAMES = (lib, c) => Object.keys(lib).filter((k) => c.includes(lib[k].c));
const BY = {
  T: { hold: NAMES(HOLDS, 'T').concat(['underarm', 'braced']), rest: NAMES(RESTS, 'G') },
  O: { hold: NAMES(HOLDS, 'O'), rest: NAMES(RESTS, 'G').filter((n) => RESTS[n].l !== 'grip') },
  D: { hold: NAMES(HOLDS, 'D'), rest: NAMES(RESTS, 'D') },
  M: { hold: NAMES(HOLDS, 'M').filter((n) => n !== 'boxer'), rest: NAMES(RESTS, 'M') },
  P: { hold: ['boxer'], rest: [] },
  A: { hold: ['asbuilt'], rest: [] },
};
const fits = (c, cls) => (cls === 'T' ? c === 'T' || c === 'O' : cls === 'O' ? c === 'O' : cls === 'D' ? c === 'D' : cls === 'M' || cls === 'P' ? c === 'M' : c === 'A');
const fitsRest = (c, cls) => (cls === 'T' || cls === 'O' ? c === 'G' : cls === 'D' ? c === 'D' : cls === 'M' ? c === 'M' : false);
const STANCE_NAMES = Object.keys(STANCES);
const IDLE_NAMES = ['breathe', 'sway', 'scan', 'bounce', 'tap', 'stoic', 'twitch', 'check', 'shift', 'hunch', 'rock', 'wander', 'proud', 'prowl', 'servo', 'nod'];
const FIRE_BY = { T: ['kick', 'heavy', 'rattle', 'brace'], O: ['snap', 'kick', 'spin'], D: ['akimbo', 'kick', 'hop'], M: ['swing', 'chop'], P: ['punch'], A: ['kick'] };

/** What the model carries: T two-handed gun, O one-handed gun, D two guns, M melee, P fists, A other. */
export function classOf(m) {
  const r = m.rig;
  if (m.punch) return 'P';
  if (m.swing) return 'M';
  if (r.armsMoved || r.lockBody || !r.rFwd || !r.rHeld) return 'A';
  if (r.lFwd && (r.lHeld || r.lMuz)) return 'D';
  if (r.lFwd && !r.lHeld) return 'T';
  return 'O';
}

function parse(spec) {
  const [stance, hold, rest, idle, fire, ...opts] = spec.split(' ');
  const o = {};
  for (const t of opts) {
    const [k, v] = t.split(':');
    o[k] = Number.isNaN(+v) ? v : +v;
  }
  return { stance, hold: hold.split('/'), rest: rest.split('/'), idle, fire, o };
}

/** A style for a tower that is not in the table: derived from its name, unlike its parent's. */
function derive(base, cls) {
  const def = TOWERS[base];
  const parent = def && (def.branchOf ?? def.goldOf);
  const p = parent && TABLE[parent] ? parse(TABLE[parent]) : null;
  const pick = (list, salt, avoid) => {
    const l = list.filter((n) => !avoid?.includes(n));
    return (l.length ? l : list)[hash(base, salt) % (l.length || list.length)];
  };
  const by = BY[cls];
  return {
    stance: def?.goldOf ? pick(['power', 'hero', 'leanBack', 'contra', 'wide'], 1, p && [p.stance]) : pick(STANCE_NAMES, 1, p && [p.stance]),
    hold: [pick(by.hold, 2, p?.hold)],
    rest: by.rest.length ? [pick(by.rest, 3, p?.rest)] : ['-'],
    idle: def?.goldOf ? 'proud' : pick(IDLE_NAMES, 4, p && [p.idle]),
    fire: p && FIRE_BY[cls].includes(p.fire) ? p.fire : pick(FIRE_BY[cls], 5),
    o: {},
  };
}

const CACHE = new Map();

/** The style of tower `type` for the model `m` just built at `level` (null: not a posable figure). */
export function styleFor(type, level, m) {
  if (!m?.rig || m.static || m.plane) return null;
  const base = type.replace(/_\d\d$/, '');
  const cls = classOf(m);
  const key = `${base}|${cls}`;
  let v = CACHE.get(key);
  if (v === undefined) {
    v = build(base, cls);
    CACHE.set(key, v);
  }
  return v;
}

function build(base, cls) {
  const s = TABLE[base] ? parse(TABLE[base]) : derive(base, cls);
  const by = BY[cls];
  let hn = s.hold.find((n) => HOLDS[n] && fits(HOLDS[n].c, cls));
  if (!hn) hn = by.hold[hash(base, 2) % by.hold.length];
  let rest;
  let rn = s.rest.find((n) => n === 'always' || (RESTS[n] && fitsRest(RESTS[n].c, cls)));
  if (!rn && by.rest.length && s.rest[0] !== '-') rn = by.rest[hash(base, 3) % by.rest.length];
  if (rn === 'always') rest = null;
  else if (rn) rest = s.o.rl ? { ...RESTS[rn], l: s.o.rl } : RESTS[rn];
  let hold = HOLDS[hn];
  if (s.o.l || s.o.g != null) hold = { ...hold, ...(s.o.l ? { l: s.o.l } : null), ...(s.o.g != null ? { g: s.o.g } : null) };
  // A one-handed hold on a model whose left hand is free keeps that hand busy at rest too.
  const fire = cls === 'D' && !['akimbo', 'hop', 'snap', 'spin', 'kick'].includes(s.fire) ? 'akimbo' : s.fire;
  return {
    name: `${s.stance} ${hn} ${rn ?? '-'} ${s.idle} ${fire}`,
    stance: STANCES[s.stance] ?? STANCES.stand,
    hold,
    rest,
    idle: [s.idle, s.o.ia ?? 1],
    fire: [fire, s.o.fa ?? 1],
    quick: s.o.q,
  };
}

// ---------------------------------------------------------------- enemies: gaits
// How an enemy walks. stride / knee: how far the legs swing and fold; crouch: bent knees;
// width: legs apart; lean, sway, twist, roll: the body; limp: one leg drags; arms: what the free
// arms may do (each enemy gets its own pair); held: how arms that carry something are held.
// body: [chest width, arm thickness, arm length, head size, leg thickness] to reshape the figure.
const GAITS = {
  shamble: { stride: 0.42, knee: 0.5, crouch: 0.08, lean: 0.14, sway: 0.07, twist: 0.08, limp: 0.45, headP: 0.12, headR: 0.2, headLoll: 0.08, wob: 0.07, arms: ['reach', 'reachLow', 'hang', 'claw', 'reachHigh', 'drag'] },
  lurch: { stride: 0.5, knee: 0.4, crouch: 0.05, lean: 0.24, sway: 0.1, twist: 0.14, roll: 0.1, limp: 0.9, headP: 0.2, headR: -0.25, headLoll: 0.1, wob: 0.09, arms: ['reach', 'drag', 'hang', 'reachLow'] },
  walk: { stride: 0.5, knee: 0.75, lean: 0.04, sway: 0.03, twist: 0.12, hips: 0.06, headBob: 0.03, arms: ['swing', 'swing', 'hang'] },
  run: { stride: 0.82, knee: 1.3, crouch: 0.14, lean: 0.34, twist: 0.22, hips: 0.1, bounce: 0.12, headP: -0.1, arms: ['pump'], body: [0.95, 0.92, 1, 1, 0.94] },
  sprint: { stride: 0.95, knee: 1.5, crouch: 0.16, lean: 0.46, twist: 0.1, bounce: 0.1, headP: -0.35, arms: ['trail'], body: [0.9, 0.85, 1, 0.96, 0.9] },
  stomp: { stride: 0.4, knee: 0.65, crouch: 0.12, width: 0.2, toeOut: 0.25, lean: 0.07, sway: 0.13, twist: 0.1, nod: 0.05, headP: 0.08, arms: ['wide', 'ape', 'hang'], body: [1.16, 1.22, 1.06, 0.92, 1.18] },
  march: { stride: 0.62, knee: 0.22, lean: -0.03, twist: 0.08, headBob: 0.02, arms: ['stiff'], armSwing: 1.1 },
  sneak: { stride: 0.5, knee: 1.05, crouch: 0.42, lean: 0.32, tip: 0.3, twist: 0.06, look: 0.5, lookRate: 2.1, headP: -0.2, arms: ['claw', 'chest', 'reachLow'], body: [0.94, 0.9, 1, 1, 0.92] },
  float: { float: 1, trail: 0.3, lean: 0.12, sway: 0, headP: -0.05, headLoll: 0.06, wob: 0.12, arms: ['hang', 'reachLow', 'wide', 'drag'] },
  strut: { stride: 0.46, knee: 0.55, width: 0.1, toeOut: 0.2, lean: -0.1, sway: 0.05, twist: 0.17, hips: 0.08, headP: -0.12, arms: ['hip', 'back', 'wide', 'swing'], body: [1.12, 1.12, 1, 0.95, 1.1] },
  hunch: { stride: 0.5, knee: 0.7, crouch: 0.3, width: 0.14, lean: 0.52, sway: 0.14, twist: 0.12, headP: -0.45, arms: ['ape'], armSwing: 1.4, body: [1.1, 1.2, 1.22, 0.95, 1.05] },
  skip: { stride: 0.7, knee: 1.2, lean: -0.05, bounce: 0.5, sway: 0.1, roll: 0.06, twist: 0.2, headR: 0.2, headLoll: 0.15, arms: ['wide', 'high', 'swing'], armSwing: 1.5 },
  hop: { hop: 1, stride: 0.35, knee: 1.0, crouch: 0.2, bounce: 0.7, lean: 0.1, arms: ['claw', 'wide'] },
  robot: { snap: 1, stride: 0.42, knee: 0.5, lean: 0, twist: 0, look: 0.4, lookRate: 0.7, arms: ['bot', 'stiff'], armSwing: 0.8, body: [1.04, 1, 1, 1, 1] },
  jitter: { stride: 0.48, knee: 0.7, lean: 0.1, sway: 0.05, twist: 0.1, jitter: 1, headR: 0.15, wob: 0.05, arms: ['hang', 'claw', 'reachLow', 'swing'] },
  rattle: { stride: 0.6, knee: 0.9, lean: 0.06, sway: 0.09, twist: 0.2, hips: 0.12, bounce: 0.12, headLoll: 0.2, headBob: 0.08, arms: ['swing', 'hang'], armSwing: 1.5, body: [0.88, 0.72, 1, 1, 0.74] },
  caster: { stride: 0.4, knee: 0.5, lean: -0.04, sway: 0.03, twist: 0.05, headP: -0.08, arms: ['high', 'back', 'chest', 'reachHigh'], wob: 0.06 },
  brute: { stride: 0.55, knee: 0.8, crouch: 0.16, width: 0.16, lean: 0.26, sway: 0.1, twist: 0.2, bounce: 0.06, headP: -0.2, arms: ['wide', 'claw', 'pump'], body: [1.14, 1.18, 1.08, 0.94, 1.1] },
  drift: { stride: 0.3, knee: 0.3, lean: -0.06, sway: 0.02, tip: 0.35, headP: -0.1, headLoll: 0.05, wob: 0.1, arms: ['wide', 'hang', 'back'] },
};
const GAIT_DEF = { stride: 0.45, knee: 0.5, crouch: 0, width: 0.02, toeOut: 0.04, tip: 0, lean: 0, sway: 0, twist: 0, hips: 0, roll: 0, nod: 0, bounce: 0, limp: 0, headP: 0, headR: 0, headLoll: 0, headBob: 0, look: 0, lookRate: 1, wob: 0, armSwing: 1, trail: 0.3, jitter: 0, float: 0, hop: 0, snap: 0 };
// Which gait a name asks for (first match wins).
const GAIT_WORDS = [
  ['float', /ghost|soul|spirit|angel|phantom|appar|wraith|seraph|energy|shard|balloon|floater|divine|spectr|jetpack|buzzard|aerial|pilot|kugel|banished/],
  ['sprint', /ninja|lightspeed|hellspeed|speed|sprinter|runner|swift|bolt\b|time runner/],
  ['run', /quick|fast|rusher|charger|jumper|hunter|tracker|maniac|rogue|jager|chariot/],
  ['sneak', /hidden|shadow|stealth|cloak|infiltr|assassin|mystery|trickster|teleport/],
  ['hunch', /limbed|monster|lurch|mandragora|ravager|predator|reaver|demon|abomination|hellrisen|grumble/],
  ['stomp', /tank|giant|titan|heavy|hefty|golem|jugger|gargantuan|smasher|thumper|slow|lead|armou?red|petrified|metallic|vessel/],
  ['skip', /jester|jack|multiplier|chaotic|nader|grenadier/],
  ['caster', /necro|summon|mage|caster|cultist|warlock|prompter|medic|overseer|corpsman|elemental|dispenser|jammer/],
  ['robot', /bot\b|droid|android|mech|engineer|reactor|clone|e02|sentinel|superbot|jx/],
  ['jitter', /error|glitch|virus|issue|unstable|corrupt|null|abnormal|odd|unknown|shocker|lightning|bounded/],
  ['rattle', /skelet|bone|dreg|patient/],
  ['brute', /berserk|breaker|breacher|brute|champion|vindicator|apex|nuclear|toxic|hazmat|blighted/],
  ['march', /soldier|guard|knight|squire|sword|officer|commando|trooper|vanguard|hero|shield|flag|honor|raygun|gunner/],
  ['drift', /void|abyss|tranquil|cosmil|chronos|time|hard ?light|vio/],
];
const BOSS_GAITS = ['strut', 'stomp', 'brute', 'hunch'];
const PLAIN_GAITS = ['shamble', 'lurch', 'shamble', 'walk', 'jitter', 'lurch'];
const HELD = ['carry', 'carryHigh', 'carryLow', 'thrust', 'tuck'];
const GAIT_CACHE = new Map();

/** The gait of the enemy `def`, shaped for the model `m` (null: the model has no rig). */
export function gaitFor(def, m) {
  const rig = m.rig;
  if (!rig) return null;
  const id = def.name ?? '';
  const key = `${id}|${rig.rHeld ? 1 : 0}${rig.lHeld ? 1 : 0}|${def.boss ? 1 : 0}`;
  let g = GAIT_CACHE.get(key);
  if (!g) {
    const name = id.toLowerCase();
    let kind = GAIT_WORDS.find(([, re]) => re.test(name))?.[0];
    if (def.flying || def.wings) kind = 'float';
    else if (def.hidden && !kind) kind = 'sneak';
    else if (def.robot && !kind) kind = 'robot';
    if (def.boss && (!kind || kind === 'march' || kind === 'run' || kind === 'drift')) kind = BOSS_GAITS[hash(id, 7) % BOSS_GAITS.length];
    if (name === 'zombie') kind = 'shamble';
    kind ??= (def.scale ?? 1) >= 1.6 ? 'stomp' : PLAIN_GAITS[hash(id, 8) % PLAIN_GAITS.length];
    const base = GAITS[kind];
    const r = (salt, lo, hi) => lo + ((hash(id, salt) % 1000) / 999) * (hi - lo);
    g = { ...GAIT_DEF, ...base, kind };
    // Every enemy walks a little differently from the others of its kind.
    g.stride *= r(11, 0.85, 1.15);
    g.knee *= r(12, 0.8, 1.2);
    g.lean += r(13, -0.05, 0.07);
    g.sway *= r(14, 0.7, 1.4);
    g.twist *= r(15, 0.7, 1.4);
    g.headR = (g.headR || r(16, -0.06, 0.06)) * (hash(id, 17) & 1 ? 1 : -1);
    g.roll *= hash(id, 18) & 1 ? 1 : -1;
    g.limpRight = !!(hash(id, 19) & 1);
    g.cad = Math.min(2.2, Math.max(0.8, 0.714 / Math.sin(Math.max(0.25, g.stride)))) * (g.hop ? 1.6 : 1);
    const pool = base.arms;
    const pick = (salt) => ARMS[pool[hash(id, salt) % pool.length]];
    const held = (salt) => ARMS[HELD[hash(id, salt) % HELD.length]];
    g.armR = rig.rHeld ? held(21) : pick(22);
    g.armL = rig.lHeld ? held(23) : pick(24);
    // Two free arms doing the very same thing look stiff: zombies let one of them drop.
    if (!rig.rHeld && !rig.lHeld && g.armR === g.armL && pool.length > 1) g.armL = ARMS[pool[(pool.indexOf(Object.keys(ARMS).find((k) => ARMS[k] === g.armR)) + 1) % pool.length]];
    GAIT_CACHE.set(key, g);
  }
  return g;
}

/** Reshapes a freshly built enemy for its gait: broad brutes, thin skeletons, long-armed hunchers. */
export function shapeEnemy(m) {
  const b = m.gait?.body;
  const rig = m.rig;
  if (!b || !rig || rig.torsoCustom || rig.armsMoved) return;
  m.torso.scale.x *= b[0];
  for (const arm of [m.rightArm, m.leftArm]) {
    arm.scale.set(arm.scale.x * b[1], arm.scale.y * b[2], arm.scale.z * b[1]);
    arm.position.x = Math.sign(arm.position.x) * (Math.abs(arm.position.x) - 1.5 + b[0] + 0.5 * b[1]);
  }
  if (!rig.headCustom) m.head.scale.multiplyScalar(b[3]);
  if (!rig.legsCustom) for (const leg of [m.rightLeg, m.leftLeg]) leg.scale.set(leg.scale.x * b[4], leg.scale.y, leg.scale.z * b[4]);
}
