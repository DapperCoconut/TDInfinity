// Tower models, file 3 of 12. Each makeX(level) builds one tower's look.
// In here:
// Commander, Gold Commander, Commander Classic, DJ, DJBooth, Anarchist. (Cowboy: people1.js.)
// (Armored Factory, Military Base, Barracks and Field Barracks moved to machines7.js.)
// The list of which tower uses which builder is TOWER_MODELS in ../models.js.

import * as THREE from 'three';
import { boxGeo, makeHumanoid, part } from './kit.js';
import { GOLD_SHEEN, glow, holdLongGun, hsl, makeThing, setMuzzle } from './bits.js';




/** Commander: officer with a cap and pistol. Medals at Lv 2, megaphone at Lv 3, radio at Lv 4, gold at Lv 5. */
export function makeCommander(level) {
  const gold = level >= 4;
  const coat = gold ? 0xfafafa : 0x33691e; // Airstrike: white dress uniform
  const h = makeHumanoid({ skin: 0xc68642, shirt: coat, pants: gold ? 0x1a237e : 0x263238, arms: coat, face: 'soldier' });
  const { M } = h;
  h.body.scale.setScalar(1.05);
  if (level >= 1) part(h.torso, boxGeo(2.05, 1.6, 0.2), M(gold ? 0xeeeeee : 0x2e5e18), 0, -1.6, -0.45); // Drilling: long coat tails
  // Peaked officer cap
  part(h.head, boxGeo(1.4, 0.45, 1.4), M(0x1b5e20), 0, 1.4, 0);
  part(h.head, boxGeo(1.4, 0.1, 0.5), M(0x111111), 0, 1.15, 0.7);
  part(h.head, boxGeo(0.4, 0.3, 0.06), gold ? glow(h, 0xffd54f) : M(0xffd54f), 0, 1.45, 0.72);
  part(h.torso, boxGeo(0.5, 0.15, 1.1), M(0xffd54f), -0.75, 0.95, 0); // epaulettes
  part(h.torso, boxGeo(0.5, 0.15, 1.1), M(0xffd54f), 0.75, 0.95, 0);
  if (level >= 1) for (const x of [0.4, 0.7]) part(h.torso, boxGeo(0.2, 0.3, 0.06), M(x > 0.5 ? 0xe53935 : 0x1e88e5), x, 0.4, 0.52);
  if (level >= 2) {
    // Call to Arms: megaphone held in the left hand
    const mega = new THREE.Group();
    mega.position.set(0, -1.9, 0);
    h.leftArm.add(mega);
    part(mega, boxGeo(0.5, 0.9, 0.5), M(0xfafafa), 0, -0.3, 0);
    part(mega, boxGeo(0.9, 0.3, 0.9), M(0xe53935), 0, -0.85, 0);
  }
  if (level >= 3) {
    // Organized Militia: radio pack with an antenna
    part(h.torso, boxGeo(1.3, 1.5, 0.6), M(0x4b5320), 0, 0, -0.85);
    part(h.torso, boxGeo(0.08, 2.0, 0.08), M(0x212121), 0.45, 1.6, -0.95);
  }
  if (gold) part(h.torso, boxGeo(2.1, 0.25, 1.1), M(0xffd54f), 0, -0.85, 0); // golden belt
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  h.rightArm.add(gun);
  part(gun, boxGeo(0.3, 0.7, 0.35), M(gold ? 0xffd54f : 0x212121), 0, -0.3, 0);
  setMuzzle(h, gun, 0, -0.7, 0);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
  h.leftArm.rotation.set(level >= 2 ? -2.4 : -0.2, 0, -0.1);
  h.pose = { right: -Math.PI / 2, left: level >= 2 ? -2.4 : -0.2, leftRecoil: 0 };
  h.tracer = gold ? 0xffd54f : 0xffe066;
  return h;
}

/**
 * Gold Commander: a general in golden plate armour with a red cape, a crowned helmet with a white
 * plume and a giant golden broadsword sheathed on his back. Lv 1 a bag of gold coins and a small
 * golden pickaxe on his belt; Lv 2 the broadsword comes out in his right hand during Call to Battle
 * (`goldSword`, shown by the view); Lv 3 a holo-radio on his left wrist; Lv 4 golden wings, a halo
 * and the sword is always out, bigger and glowing.
 */
export function makeGoldCommander(level) {
  const h = makeHumanoid({ skin: 0xc68642, shirt: 0xd4a017, pants: 0x8d6e00, arms: 0xd4a017, face: 'soldier' });
  const { M } = h;
  const gold = M(0xffc107);
  const pale = M(0xffe082);
  const red = M(0xb71c1c);
  h.body.scale.setScalar(1.12);
  // Armour plates
  part(h.torso, boxGeo(2.15, 1.2, 1.15), gold, 0, 0.35, 0); // breastplate
  part(h.torso, boxGeo(0.3, 0.3, 0.08), glow(h, 0xff1744), 0, 0.45, 0.6); // ruby on the chest
  for (const x of [-1, 1]) part(h.torso, boxGeo(0.8, 0.35, 1.3), pale, x * 0.95, 0.95, 0); // pauldrons
  part(h.torso, boxGeo(2.1, 0.25, 1.1), M(0x5d4037), 0, -0.85, 0); // belt
  part(h.torso, boxGeo(0.45, 0.35, 0.1), gold, 0, -0.85, 0.56); // buckle
  // Cape
  part(h.torso, boxGeo(2.0, 3.0, 0.15), red, 0, -0.6, -0.62);
  // Crowned helmet with a plume
  part(h.head, boxGeo(1.35, 0.6, 1.35), gold, 0, 1.2, 0);
  for (const [x, z] of [[-0.5, 0.5], [0, 0.55], [0.5, 0.5], [-0.55, 0], [0.55, 0]]) part(h.head, boxGeo(0.2, 0.35, 0.2), gold, x, 1.65, z);
  part(h.head, boxGeo(0.25, 0.9, 1.1), M(0xfafafa), 0, 1.9, -0.2); // plume
  // The giant broadsword on his back (sheathed)
  const back = new THREE.Group();
  back.position.set(0, 0, -0.75);
  back.rotation.z = 0.5;
  h.torso.add(back);
  part(back, boxGeo(0.5, 4.2, 0.14), pale, 0, 0.2, 0);
  part(back, boxGeo(1.3, 0.25, 0.3), gold, 0, 2.35, 0);
  part(back, boxGeo(0.25, 0.8, 0.25), M(0x5d4037), 0, 2.85, 0);
  if (level >= 1) {
    // Gold Digging: a coin bag and a pickaxe on his belt
    part(h.torso, boxGeo(0.6, 0.6, 0.5), M(0x8d6e63), 0.85, -1.2, 0.35);
    part(h.torso, boxGeo(0.25, 0.12, 0.25), gold, 0.85, -0.85, 0.35);
    part(h.torso, boxGeo(0.12, 1.0, 0.12), M(0x6d4c41), -0.85, -1.3, 0.55);
    part(h.torso, boxGeo(0.8, 0.15, 0.15), gold, -0.85, -0.85, 0.55);
  }
  if (level >= 3) {
    // Holo-radio on his left wrist (calls in the cyber tank)
    part(h.leftArm, boxGeo(1.1, 0.4, 1.1), M(0x263238), 0, -1.6, 0);
    part(h.leftArm, boxGeo(0.7, 0.08, 0.7), glow(h, 0x00e5ff), 0, -1.38, 0);
  }
  // Call to Battle: the giant golden broadsword in his right hand (hidden until he pulls it out).
  const big = level >= 4;
  const sword = new THREE.Group();
  sword.position.set(0, -1.9, 0);
  h.rightArm.add(sword);
  const blade = big ? glow(h, 0xffe57f) : pale;
  part(sword, boxGeo(0.35, 0.8, 0.35), M(0x5d4037), 0, -0.1, 0); // grip
  part(sword, boxGeo(1.6, 0.3, 0.4), gold, 0, -0.55, 0); // crossguard
  part(sword, boxGeo(0.25, 0.25, 0.25), glow(h, 0xff1744), 0, -0.55, 0.22);
  part(sword, boxGeo(0.75, big ? 6.5 : 5, 0.18), blade, 0, big ? -3.95 : -3.2, 0);
  part(sword, boxGeo(0.12, big ? 6.2 : 4.7, 0.2), gold, 0, big ? -3.95 : -3.2, 0); // fuller
  sword.visible = big;
  if (level >= 2) h.goldSword = sword;
  else h.rightArm.remove(sword);
  back.visible = !big;
  if (big) {
    // Give them hell!: golden wings and a halo
    const wing = glow(h, 0xffd54f);
    for (const x of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const f = part(h.torso, boxGeo(0.25, 2.4 - i * 0.5, 0.6), wing, x * (1.1 + i * 0.55), 1.0 + i * 0.25, -0.9);
        f.rotation.z = x * (0.7 + i * 0.25);
      }
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      part(h.head, boxGeo(0.35, 0.1, 0.12), glow(h, 0xfff59d), Math.cos(a) * 0.9, 2.6, Math.sin(a) * 0.9).rotation.y = -a + Math.PI / 2;
    }
  }
  // A raised fist when the sword is away; the sword arm swings down when he attacks.
  h.rightArm.rotation.set(big ? -2.2 : -0.4, 0, 0.1);
  h.leftArm.rotation.set(-0.3, 0, -0.1);
  h.pose = { right: big ? -2.2 : -0.4, left: -0.3, leftRecoil: 0 };
  h.swing = level >= 2 ? 1.6 : 0;
  h.swordRest = -0.4; // arm pose with the sword put away
  h.swordUp = -2.2; // arm pose with the sword out
  setMuzzle(h, h.rightArm, 0, -2, 0);
  h.tracer = 0xffd54f;
  return h;
}

const STAR_GEO = new THREE.OctahedronGeometry(0.22, 0);
const MIST_GEO = new THREE.IcosahedronGeometry(1, 1);
const tint = new THREE.Color();
const hsl2 = { h: 0, s: 0, l: 0 };
/**
 * Golden perk looks (goldtowers.js `goldFx`): recolours the model at levels listed in `fx.tints`
 * (ruby, diamond...; two colours alternate between parts), then adds a golden mist around its
 * feet and star particles floating around it (`m.goldFx`, animated by the view).
 */
export function goldShine(m, fx, level) {
  const colors = fx.tints?.[level];
  if (colors) {
    let i = 0;
    for (const mat of m.mats) {
      if (mat.map || !mat.color) continue;
      if (mat.userData.glow && mat.userData.glow !== GOLD_SHEEN) continue; // its own glowing parts stay
      tint.setHex(colors[i++ % colors.length]).getHSL(hsl2);
      mat.color.getHSL(hsl);
      mat.color.setHSL(hsl2.h, Math.max(0.65, hsl2.s * 0.95), 0.2 + hsl.l * 0.55);
      const sheen = tint.multiplyScalar(0.16).getHex();
      mat.userData.glow = sheen;
      mat.emissive?.setHex(sheen);
    }
  }
  m.root.updateMatrixWorld(true);
  const top = Math.min(10, Math.max(3, new THREE.Box3().setFromObject(m.root).max.y)); // (Orbit: not up to its satellite)
  const fxg = new THREE.Group();
  const mistColor = colors ? colors[0] : 0xffe082;
  const mistMat = new THREE.MeshBasicMaterial({ color: mistColor, transparent: true, opacity: 0.16, depthWrite: false });
  mistMat.userData.keepOpacity = 0.16;
  mistMat.userData.glow = mistColor;
  m.mats.push(mistMat);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const puff = new THREE.Mesh(MIST_GEO, mistMat);
    puff.scale.set(1.3, 0.45, 1.3);
    puff.position.set(Math.cos(a) * 1.6, 0.5, Math.sin(a) * 1.6);
    puff.castShadow = false;
    fxg.add(puff);
  }
  const starMats = [0xfff59d, 0xffffff, colors ? colors[colors.length - 1] : 0xffd740].map((c) => {
    const sm = new THREE.MeshBasicMaterial({ color: c });
    sm.userData.glow = c;
    m.mats.push(sm);
    return sm;
  });
  const stars = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3;
    const st = new THREE.Mesh(STAR_GEO, starMats[i % 3]);
    const r = 1.8 + ((i * 0.37) % 0.6);
    st.userData.y = 1 + ((i * 0.618) % 1) * (top - 0.5);
    st.userData.p = i * 1.7;
    st.position.set(Math.cos(a) * r, st.userData.y, Math.sin(a) * r);
    st.scale.set(1, 1.8, 1);
    st.castShadow = false;
    stars.push(st);
    fxg.add(st);
  }
  fxg.userData.stars = stars;
  m.root.add(fxg);
  m.goldFx = fxg;
  return m;
}

/** Classic Commander: a field officer in a beret. Binoculars from Lv 2, megaphone from Lv 3, medals at Lv 4, radio at Lv 5. */
export function makeCommanderClassic(level) {
  const coat = 0x7a6a45;
  const h = makeHumanoid({ skin: 0x8d5524, shirt: coat, pants: 0x4b4129, arms: coat, face: 'soldier' });
  const { M } = h;
  h.body.scale.setScalar(1.05);
  // Beret with a gold badge
  part(h.head, boxGeo(1.45, 0.35, 1.45), M(0x8e0000), 0, 1.3, -0.05);
  part(h.head, boxGeo(0.7, 0.3, 0.7), M(0x8e0000), -0.35, 1.45, 0);
  part(h.head, boxGeo(0.3, 0.3, 0.06), M(0xffd54f), 0.3, 1.3, 0.7);
  part(h.torso, boxGeo(2.1, 0.3, 1.1), M(0x3e2723), 0, -0.85, 0); // belt
  if (level >= 1) {
    // Leadership: binoculars around the neck
    part(h.torso, boxGeo(0.7, 0.35, 0.3), M(0x212121), 0, 0.6, 0.62);
  }
  if (level >= 2) {
    // Call to Arms: megaphone held in the left hand
    const mega = new THREE.Group();
    mega.position.set(0, -1.9, 0);
    h.leftArm.add(mega);
    part(mega, boxGeo(0.5, 0.9, 0.5), M(0xfdd835), 0, -0.3, 0);
    part(mega, boxGeo(0.9, 0.3, 0.9), M(0x212121), 0, -0.85, 0);
  }
  if (level >= 3) for (const [x, c] of [[0.35, 0xe53935], [0.6, 0x43a047], [0.85, 0xfdd835]]) part(h.torso, boxGeo(0.2, 0.3, 0.06), M(c), x, 0.35, 0.52); // medals
  if (level >= 4) {
    // Strength in Numbers: radio pack to call the caravan
    part(h.torso, boxGeo(1.3, 1.5, 0.6), M(0x4b5320), 0, 0, -0.85);
    part(h.torso, boxGeo(0.08, 2.0, 0.08), M(0x212121), -0.45, 1.6, -0.95);
    part(h.torso, boxGeo(0.2, 0.2, 0.2), glow(h, 0xff1744), -0.45, 2.6, -0.95);
  }
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  h.rightArm.add(gun);
  part(gun, boxGeo(0.3, 0.7, 0.35), M(0x212121), 0, -0.3, 0);
  setMuzzle(h, gun, 0, -0.7, 0);
  h.rightArm.rotation.set(-Math.PI / 2, 0, 0.05);
  h.leftArm.rotation.set(level >= 2 ? -2.4 : -0.2, 0, -0.1);
  h.pose = { right: -Math.PI / 2, left: level >= 2 ? -2.4 : -0.2, leftRecoil: 0 };
  h.tracer = 0xffe066;
  return h;
}

/** Six-shooter in the hand of `arm`. Returns the gun group (it twirls around x after a cash shot). */
export function addRevolver(h, arm, gold) {
  const gun = new THREE.Group();
  gun.position.set(0, -1.9, 0);
  arm.add(gun);
  const metal = h.M(gold ? 0xffc107 : 0x5d5d5d);
  part(gun, boxGeo(0.16, 1.1, 0.16), metal, 0, -0.6, 0.05); // barrel
  part(gun, boxGeo(0.34, 0.4, 0.34), metal, 0, -0.15, 0.05); // cylinder
  part(gun, boxGeo(0.24, 0.32, 0.55), h.M(gold ? 0xfff8e1 : 0x6d4c41), 0, 0.05, -0.3); // wooden (or ivory) grip
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, -1.15, 0.05);
  gun.add(muzzle);
  gun.userData.muzzle = muzzle;
  return gun;
}

/** DJ: behind a turntable booth with speakers that grow each level. Neon party lights at Lv 5. */
export function makeDJ(level) {
  const rave = level >= 4;
  const h = makeHumanoid({ skin: 0x8d5524, shirt: rave ? 0x6a1b9a : 0xfafafa, pants: 0x212121, arms: 0x8d5524, face: 'smile' });
  const { M } = h;
  // Headphones and cap
  part(h.head, boxGeo(1.35, 0.15, 0.25), M(0x212121), 0, 1.38, 0);
  for (const x of [-0.7, 0.7]) part(h.head, boxGeo(0.25, 0.6, 0.6), M(rave ? 0xe040fb : 0x1e88e5), x, 0.6, 0);
  part(h.head, boxGeo(1.3, 0.3, 1.3), M(0xffeb3b), 0, 1.2, 0);
  // Booth in front with two turntables
  const booth = M(0x263238);
  part(h.root, boxGeo(3.6, 2.4, 1.2), booth, 0, 1.2, 1.6);
  for (const x of [-0.9, 0.9]) {
    part(h.root, boxGeo(1.1, 0.12, 1.0), M(0x111111), x, 2.46, 1.6);
    part(h.root, boxGeo(0.3, 0.14, 0.3), M(0xe53935), x, 2.52, 1.6);
  }
  part(h.root, boxGeo(3.4, 0.3, 0.06), glow(h, rave ? 0xe040fb : 0x00e5ff), 0, 1.6, 2.22);
  // Speakers on both sides
  const sp = [1.3, 1.7, 2.1, 2.5, 2.9][level];
  if (level >= 2) {
    // Thrifty: a glowing "$" sale sign on the booth
    part(h.root, boxGeo(1.2, 0.9, 0.1), M(0x1b5e20), 0, 3.0, 2.0);
    part(h.root, boxGeo(0.18, 0.7, 0.06), glow(h, 0xffd54f), 0, 3.0, 2.07);
    part(h.root, boxGeo(0.6, 0.14, 0.06), glow(h, 0xffd54f), 0, 3.15, 2.08);
    part(h.root, boxGeo(0.6, 0.14, 0.06), glow(h, 0xffd54f), 0, 2.85, 2.08);
  }
  for (const x of [-1, 1]) {
    part(h.root, boxGeo(1.1, sp, 1.0), M(0x111111), x * 2.4, sp / 2, 0.6);
    part(h.root, boxGeo(0.7, 0.7, 0.06), M(0x424242), x * 2.4, sp * 0.65, 1.12);
    if (level >= 2) part(h.root, boxGeo(0.4, 0.4, 0.06), glow(h, 0xffd54f), x * 2.4, sp * 0.25, 1.12); // Thrifty: gold tweeter
  }
  if (rave) for (const x of [-1.2, 0, 1.2]) part(h.root, boxGeo(0.35, 0.35, 0.35), glow(h, [0xff1744, 0x76ff03, 0x2979ff][x / 1.2 + 1]), x, 6.4, 0.6);
  h.rightArm.rotation.set(-1.3, 0, 0.2);
  h.leftArm.rotation.set(-1.3, 0, -0.2);
  h.pose = { right: -1.3, left: -1.3, leftRecoil: 0 };
  h.bob = 0.18; // grooving to the music
  h.muzzles = [];
  return h;
}

/**
 * DJ Booth (alternate DJ form): a DJ behind a wide booth and speaker stacks. The glowing strips
 * (h.trackMats) take the color of the track playing. Lv 2 a laptop, Lv 3 party lights, Lv 4 a
 * gold "$" sign, Lv 5 a visualizer screen, Lv 6 three laser poles (one per track).
 */
export function makeDJBooth(level) {
  const h = makeHumanoid({ skin: 0xc68642, shirt: level >= 5 ? 0x311b92 : 0x212121, pants: 0x37474f, arms: 0xc68642, face: 'smile' });
  const { M } = h;
  const track = (color = 0xb388ff) => {
    const m = glow(h, color);
    (h.trackMats ||= []).push(m);
    return m;
  };
  // Big headphones and a backwards cap with the purple shard emblem.
  part(h.head, boxGeo(1.35, 0.15, 0.25), M(0x212121), 0, 1.38, 0);
  for (const x of [-0.7, 0.7]) part(h.head, boxGeo(0.25, 0.65, 0.65), track(), x, 0.6, 0);
  part(h.head, boxGeo(1.3, 0.3, 1.3), M(0x7e57c2), 0, 1.2, 0);
  part(h.head, boxGeo(0.4, 0.3, 0.7), M(0x7e57c2), 0, 1.15, -0.9);
  part(h.head, boxGeo(0.3, 0.2, 0.05), glow(h, 0xb388ff), 0, 1.25, 0.66);
  // The booth: wide, with a mixer between two turntables.
  part(h.root, boxGeo(5.2, 2.4, 1.4), M(0x1c1c24), 0, 1.2, 1.7);
  part(h.root, boxGeo(5.0, 0.25, 0.06), track(), 0, 1.7, 2.42);
  part(h.root, boxGeo(5.0, 0.25, 0.06), track(), 0, 0.6, 2.42);
  for (const x of [-1.6, 1.6]) {
    part(h.root, boxGeo(1.2, 0.12, 1.1), M(0x111111), x, 2.46, 1.7);
    part(h.root, boxGeo(0.35, 0.14, 0.35), track(), x, 2.53, 1.7);
  }
  part(h.root, boxGeo(1.0, 0.18, 0.9), M(0x424242), 0, 2.5, 1.7);
  if (level >= 1) {
    // Laptop Studio: an open laptop on the mixer
    part(h.root, boxGeo(1.0, 0.06, 0.7), M(0xb0bec5), 0, 2.62, 1.6);
    const lid = part(h.root, boxGeo(1.0, 0.7, 0.05), M(0xb0bec5), 0, 2.95, 1.25);
    lid.rotation.x = -0.25;
    part(lid, boxGeo(0.85, 0.55, 0.02), track(), 0, 0, 0.03);
  }
  // Speaker stacks on both sides, taller every level.
  const sp = [1.5, 2.0, 2.4, 2.8, 3.2, 3.6][level];
  for (const x of [-1, 1]) {
    part(h.root, boxGeo(1.3, sp, 1.2), M(0x111111), x * 3.3, sp / 2, 0.9);
    part(h.root, boxGeo(0.8, 0.8, 0.06), M(0x424242), x * 3.3, sp * 0.68, 1.52);
    part(h.root, boxGeo(0.45, 0.45, 0.07), track(), x * 3.3, sp * 0.25, 1.52);
  }
  if (level >= 2) {
    // Party Mode: a truss with party lights over the booth
    const truss = M(0x9e9e9e);
    for (const x of [-2.6, 2.6]) part(h.root, boxGeo(0.2, 6, 0.2), truss, x, 3, 2.2);
    part(h.root, boxGeo(5.4, 0.2, 0.2), truss, 0, 6, 2.2);
    [0xb388ff, 0x69f0ae, 0xff5252].forEach((c, i) => part(h.root, boxGeo(0.4, 0.4, 0.4), glow(h, c), (i - 1) * 1.6, 5.7, 2.2));
  }
  if (level >= 3) {
    // Thrifty Music: a gold "$" sign on the front
    part(h.root, boxGeo(0.18, 0.75, 0.06), glow(h, 0xffd54f), 0, 1.15, 2.45);
    for (const y of [0.9, 1.15, 1.4]) part(h.root, boxGeo(0.55, 0.12, 0.06), glow(h, 0xffd54f), 0, y, 2.46);
  }
  if (level >= 4) {
    // Audio Visualizer: a screen behind the DJ with bouncing bars
    part(h.root, boxGeo(4.4, 2.4, 0.2), M(0x111111), 0, 6.4, -1.4);
    for (let i = 0; i < 7; i++) {
      const bh = [0.6, 1.2, 1.8, 1.0, 1.6, 0.8, 1.3][i];
      part(h.root, boxGeo(0.4, bh, 0.06), track(), (i - 3) * 0.55, 5.4 + bh / 2, -1.28);
    }
  }
  if (level >= 5) {
    // Apocalypse Rave: a laser pole for every track
    [0xb388ff, 0x69f0ae, 0xff5252].forEach((c, i) => {
      const x = (i - 1) * 2.2;
      part(h.root, boxGeo(0.25, 8.5, 0.25), glow(h, c), x, 4.25, -2.4);
      part(h.root, boxGeo(0.6, 0.6, 0.6), glow(h, c), x, 8.8, -2.4);
    });
  }
  h.rightArm.rotation.set(-1.3, 0, 0.2);
  h.leftArm.rotation.set(-1.3, 0, -0.2);
  h.pose = { right: -1.3, left: -1.3, leftRecoil: 0 };
  h.bob = 0.2;
  h.muzzles = [];
  return h;
}

/**
 * Anarchist (Versus): hoodie, red bandana and a compact SMG. Lv 3 adds smoke grenades on the belt,
 * Lv 4 a little robot buddy on its shoulder, Lv 5 a red jacket with a rack of fireworks on its back.
 */
export function makeAnarchist(level) {
  const jacket = level >= 4 ? 0xb71c1c : 0x212121;
  const h = makeHumanoid({ skin: 0xd9a066, shirt: jacket, pants: 0x263238, arms: jacket, face: 'soldier' });
  const { M } = h;
  const dark = M(0x1a1a1a);
  const red = M(0xd32f2f);
  part(h.head, boxGeo(1.3, 0.5, 1.3), M(0x37474f), 0, 1.25, 0); // beanie
  part(h.head, boxGeo(1.28, 0.5, 0.1), red, 0, 0.3, 0.62); // bandana over the mouth
  part(h.head, boxGeo(0.5, 0.35, 0.1), red, 0, 0.0, 0.6);
  part(h.torso, boxGeo(1.7, 0.6, 0.6), M(level >= 4 ? 0x8e0000 : 0x2b2b2b), 0, 1.0, -0.7); // hood
  // Anarchy "A" patch on the chest.
  part(h.torso, boxGeo(0.6, 0.6, 0.06), red, 0.45, 0.3, 0.53);
  if (level >= 1) {
    // Attrition: a red armband and a spray can on the belt.
    part(h.leftArm, boxGeo(1.05, 0.35, 1.05), red, 0, -0.6, 0);
    part(h.torso, boxGeo(0.28, 0.55, 0.28), M(0x76ff03), -0.85, -0.7, 0.45);
    part(h.torso, boxGeo(0.18, 0.12, 0.18), dark, -0.85, -0.38, 0.45);
    if (level < 4) part(h.torso, boxGeo(1.4, 1.5, 0.6), M(0x37474f), 0, -0.1, -0.85); // backpack of android parts
  }
  if (level >= 2) {
    // Smoke grenades on the belt.
    for (const x of [-0.6, -0.15, 0.3]) part(h.torso, boxGeo(0.3, 0.45, 0.3), M(0x9e9e9e), x, -0.85, 0.6);
    // ...a strap of smoke bombs across the chest, and a gas mask
    part(h.torso, boxGeo(0.35, 2.6, 1.14), M(0x5d4037), 0, 0, 0).rotation.z = -0.7;
    for (const t of [-0.5, 0, 0.5]) part(h.torso, boxGeo(0.35, 0.35, 0.3), M(0x9e9e9e), -t * 0.75, t * -0.8, 0.65);
    part(h.head, boxGeo(1.32, 0.8, 0.2), M(0x424242), 0, 0.5, 0.62);
    for (const x of [-0.3, 0.3]) part(h.head, boxGeo(0.35, 0.3, 0.08), M(0xffa000), x, 0.7, 0.74);
    part(h.head, boxGeo(0.5, 0.5, 0.45), M(0x212121), 0, 0.25, 0.85);
  }
  if (level >= 3) {
    // Robot buddy on the left shoulder.
    const bot = new THREE.Group();
    bot.position.set(1.5, 1.4, 0);
    h.torso.add(bot);
    bot.scale.setScalar(1.4);
    part(bot, boxGeo(0.7, 0.7, 0.7), M(0xb0bec5), 0, 0, 0);
    part(bot, boxGeo(0.5, 0.15, 0.08), glow(h, 0x00e5ff), 0, 0.08, 0.36);
    part(bot, boxGeo(0.08, 0.4, 0.08), dark, 0, 0.55, 0);
  }
  if (level >= 4) {
    // Fireworks rack on the back.
    part(h.torso, boxGeo(1.6, 1.4, 0.4), dark, 0, 0.2, -0.75);
    const colors = [0xffeb3b, 0x00e5ff, 0xff4081, 0x76ff03];
    for (let i = 0; i < 4; i++) {
      part(h.torso, boxGeo(0.28, 1.2, 0.28), M(0xeeeeee), -0.55 + i * 0.37, 1.3, -0.8);
      part(h.torso, boxGeo(0.3, 0.3, 0.3), glow(h, colors[i]), -0.55 + i * 0.37, 2.0, -0.8);
    }
  }
  const gun = holdLongGun(h, 1.1, dark);
  part(gun, boxGeo(0.22, 0.5, 0.3), dark, 0, -0.4, -0.35); // mag
  if (level >= 4) part(gun, boxGeo(0.36, 0.25, 0.46), red, 0, -0.9, 0); // red-taped barrel
  h.tracer = level >= 4 ? 0xff5252 : 0xffd54f;
  return h;
}
