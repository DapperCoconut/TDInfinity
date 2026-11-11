import * as THREE from 'three';
import { boxGeo, part, makeHumanoid, makeThing, glow, glowThing, helmet, holdLongGun, setMuzzle, gunMuzzle, cylPart } from '../models.js';

// New towers and units (batch B): Spark, Raider, Plunder, Spectre, Buccaneer, Broadcaster,
// Stasis, Glow Up (Trawler: models/machines4.js); Cutlass and Corsair pirate squads. Only call imported helpers inside functions
// (models.js imports this file).

const lv = (level, max = 5) => Math.max(0, Math.min(max, level | 0));

/** A see-through glowing material (nets, fields). */
function seeThrough(u, color, opacity, lit = false) {
  const m = lit ? glow(u, color) : u.M(color);
  m.transparent = true;
  m.opacity = opacity;
  m.depthWrite = false;
  m.userData.keepOpacity = opacity;
  return m;
}

/** A boat hull facing +Z: a box with a pointed bow, a waterline stripe and a deck. Returns the deck height. */
function hull(u, L, W, hh, hullM, stripeM, deckM) {
  part(u.body, boxGeo(W, hh, L), hullM, 0, hh / 2 - 0.4, -0.3);
  part(u.body, boxGeo(W + 0.04, 0.22, L + 0.02), stripeM, 0, -0.35, -0.3);
  for (const side of [-1, 1]) part(u.body, boxGeo(W * 0.72, hh, 1.6), hullM, side * W * 0.18, hh / 2 - 0.4, L / 2).rotation.y = side * 0.5;
  const dy = hh - 0.4;
  part(u.body, boxGeo(W - 0.3, 0.1, L - 0.3), deckM, 0, dy + 0.05, -0.3);
  return dy + 0.1;
}

// ---------------------------------------------------------------- Spark

/**
 * Spark: a spark engineer with a sparkle cannon whose tip fizzes yellow-white. Lv 1 goggles, Lv 2 a
 * signal antenna backpack (reveals hidden), Lv 3 a bigger coiled cannon, Lv 4 a glittering coat,
 * Lv 5 a huge crackling orb on the cannon.
 */
function spark(level) {
  level = lv(level);
  const top = level >= 4;
  const h = makeHumanoid({ skin: 0xf1c27d, shirt: top ? 0x311b92 : 0x4527a0, pants: 0x263238, arms: top ? 0x311b92 : 0x4527a0, face: 'smile' });
  const { M } = h;
  const sparkC = 0xfff59d;
  const white = glow(h, 0xfffde7);
  const yellow = glow(h, 0xffeb3b);
  // Hair tuft standing on end (static!) and a headband.
  part(h.head, boxGeo(1.3, 0.35, 1.3), M(0xffca28), 0, 1.35, 0);
  for (const [x, z] of [[-0.35, 0.2], [0.3, -0.1], [0, 0.4]]) part(h.head, boxGeo(0.25, 0.5, 0.25), M(0xffca28), x, 1.7, z).rotation.z = x;
  if (level >= 1) {
    part(h.head, boxGeo(1.3, 0.3, 1.3), M(0x3e2723), 0, 0.95, 0);
    for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.42, 0.34, 0.1), glow(h, 0xffe082), x, 0.95, 0.68);
  }
  // Spark pack on the back.
  part(h.torso, boxGeo(1.4, 1.5, 0.6), M(0x37474f), 0, 0.1, -0.8);
  part(h.torso, boxGeo(0.5, 0.5, 0.12), yellow, 0, 0.3, -1.12);
  if (level >= 2) {
    // Signal antenna: reveals hidden enemies.
    part(h.torso, boxGeo(0.12, 2.6, 0.12), M(0x9e9e9e), 0.5, 1.9, -0.85);
    for (const y of [1.2, 1.8, 2.4]) part(h.torso, boxGeo(0.6 - (y - 1.2) * 0.25, 0.06, 0.06), M(0x9e9e9e), 0.5, y, -0.85);
    part(h.torso, boxGeo(0.3, 0.3, 0.3), glow(h, 0xff5252), 0.5, 3.3, -0.85);
  }
  if (top) {
    // Glittering coat with sparkly studs.
    part(h.torso, boxGeo(2.15, 2.4, 0.2), M(0x1a237e), 0, -0.3, -0.58);
    for (const x of [-0.95, 0.95]) part(h.torso, boxGeo(0.22, 2.4, 1.1), M(0x1a237e), x, -0.3, 0);
    for (const [x, y] of [[-0.6, 0.5], [0.6, 0.2], [-0.4, -0.4], [0.5, -0.8]]) part(h.torso, boxGeo(0.15, 0.15, 0.06), white, x, y, 0.53);
  }
  // The sparkle cannon.
  const len = level >= 3 ? 2.1 : 1.6;
  const gun = holdLongGun(h, len, M(0x455a64));
  const coils = level >= 3 ? 3 : 1;
  for (let i = 0; i < coils; i++) part(gun, boxGeo(0.55, 0.18, 0.6), M(0xb87333), 0, -0.6 - i * 0.4, 0);
  const orb = new THREE.Group();
  orb.position.set(0, -len - (level >= 5 ? 0.7 : 0.3), 0);
  gun.add(orb);
  const s = [0.45, 0.5, 0.55, 0.65, 0.75, 1.3][level];
  part(orb, boxGeo(s, s, s), white, 0, 0, 0).rotation.set(0.6, 0.6, 0);
  part(orb, boxGeo(s * 0.8, s * 0.8, s * 0.8), yellow, 0, 0, 0).rotation.set(0, 0.785, 0.785);
  // Little sparkles around the tip (spikes out in every direction).
  const rays = level >= 5 ? 10 : 4 + level;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const r = s * 0.9;
    const ray = part(orb, boxGeo(0.08, s * (level >= 5 ? 1.1 : 0.7), 0.08), i % 2 ? white : yellow, Math.cos(a) * r, Math.sin(a * 2) * r * 0.4, Math.sin(a) * r);
    ray.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
  }
  if (level >= 5) {
    // Crackling: a cage of arcs around the orb and side prongs on the cannon.
    for (const sd of [-1, 1]) {
      part(gun, boxGeo(0.12, 1.0, 0.12), yellow, sd * 0.4, -len, 0);
      part(orb, boxGeo(0.06, 1.6, 0.06), white, sd * 0.9, 0, 0).rotation.z = sd * 0.5;
      part(orb, boxGeo(1.6, 0.06, 0.06), white, 0, sd * 0.9, 0).rotation.z = sd * 0.4;
    }
  }
  h.muzzles = [orb];
  h.tracer = sparkC;
  h.projectile = { color: sparkC, size: level >= 5 ? 0.9 : 0.5 };
  return h;
}

// ---------------------------------------------------------------- Raider

/** The Raider's attack plane: prop fighter (Lv 0-1), jet (Lv 2-3), bomber (Lv 4), stealth bomber with a nuke (Lv 5). */
function raiderPlane(h, level) {
  const { M } = h;
  const plane = new THREE.Group();
  const bank = new THREE.Group();
  plane.add(bank);
  const muzzles = [];
  const missiles = [];
  const muzzle = (x, y, z, list = muzzles) => {
    const m = new THREE.Object3D();
    m.position.set(x, y, z);
    bank.add(m);
    list.push(m);
  };
  let prop = null;
  const dark = M(0x263238);
  if (level <= 1) {
    // Prop fighter: olive drab with a shark mouth and invasion stripes.
    const body = M(0x556b2f);
    part(bank, boxGeo(1.2, 1.2, 5), body, 0, 0, 0);
    part(bank, boxGeo(7.2, 0.2, 1.5), body, 0, -0.25, 0.5);
    for (const x of [-2.4, 2.4]) part(bank, boxGeo(0.5, 0.22, 1.52), M(0xfafafa), x, -0.25, 0.5);
    part(bank, boxGeo(2.6, 0.15, 0.9), body, 0, 0.1, -2.2);
    part(bank, boxGeo(0.15, 1.1, 1.0), body, 0, 0.7, -2.2);
    part(bank, boxGeo(0.9, 0.5, 1.1), M(0x90caf9), 0, 0.75, 0.4);
    part(bank, boxGeo(1.22, 0.3, 0.8), M(0xc62828), 0, -0.3, 2.0); // shark mouth
    part(bank, boxGeo(1.24, 0.1, 0.6), M(0xfafafa), 0, -0.25, 2.0);
    part(bank, boxGeo(0.8, 0.8, 0.4), M(0xffd600), 0, 0, 2.6); // spinner
    prop = new THREE.Group();
    prop.position.set(0, 0, 2.85);
    bank.add(prop);
    part(prop, boxGeo(0.3, 2.8, 0.1), M(0x3e2723), 0, 0, 0);
    part(prop, boxGeo(2.8, 0.3, 0.1), M(0x3e2723), 0, 0, 0);
    if (level >= 1) for (const side of [-1, 1]) for (const x of [1.6, 2.4]) {
      // Rockets under the wings.
      part(bank, boxGeo(0.25, 0.25, 1.2), M(0x9e9e9e), side * x, -0.55, 0.6);
      part(bank, boxGeo(0.2, 0.2, 0.15), M(0xe53935), side * x, -0.55, 1.25);
      muzzle(side * x, -0.55, 1.3, missiles);
    }
    muzzle(-1.2, -0.25, 1.3);
    muzzle(1.2, -0.25, 1.3);
  } else if (level <= 3) {
    // Attack jet: two-tone grey, twin tails, missiles from Lv 3.
    const body = M(0x78909c);
    part(bank, boxGeo(1.2, 1.0, 6.2), body, 0, 0, 0);
    part(bank, boxGeo(0.6, 0.6, 1.3), dark, 0, -0.05, 3.7);
    part(bank, boxGeo(0.8, 0.5, 1.5), M(0xffb300), 0, 0.6, 1.5); // gold canopy
    for (const side of [-1, 1]) {
      part(bank, boxGeo(3.6, 0.16, 2.2), body, side * 2.1, -0.1, -0.3).rotation.y = side * 0.4;
      part(bank, boxGeo(0.12, 1.3, 1.2), dark, side * 0.55, 0.8, -2.6).rotation.z = side * -0.35;
      part(bank, boxGeo(1.5, 0.12, 0.9), body, side * 1.0, 0, -2.8);
      part(bank, boxGeo(0.5, 0.6, 1.6), dark, side * 0.85, -0.2, 0.6); // intake
      if (level >= 3) {
        part(bank, boxGeo(0.3, 0.3, 1.6), M(0xeceff1), side * 2.6, -0.4, -0.2);
        part(bank, boxGeo(0.22, 0.22, 0.15), M(0xe53935), side * 2.6, -0.4, 0.65);
        muzzle(side * 2.6, -0.4, 0.7, missiles);
      }
    }
    for (const x of [-0.35, 0.35]) part(bank, boxGeo(0.55, 0.55, 0.3), glow(h, 0xff9100), x, 0, -3.15);
    muzzle(-0.6, -0.2, 3.0);
    muzzle(0.6, -0.2, 3.0);
  } else if (level === 4) {
    // Bomber: long fuselage, wide straight wings, four engines and bomb racks.
    const body = M(0x8d9a5b);
    part(bank, boxGeo(1.6, 1.5, 7.5), body, 0, 0, 0);
    part(bank, boxGeo(1.3, 1.0, 1.0), M(0x90caf9), 0, 0.2, 4.0); // glazed nose
    part(bank, boxGeo(10, 0.25, 1.8), body, 0, 0.1, 0.4);
    part(bank, boxGeo(3.4, 0.18, 1.1), body, 0, 0.3, -3.3);
    part(bank, boxGeo(0.18, 1.8, 1.4), body, 0, 1.1, -3.3);
    for (const side of [-1, 1]) for (const x of [1.8, 3.4]) {
      part(bank, boxGeo(0.7, 0.7, 1.6), dark, side * x, 0, 1.1);
      part(bank, boxGeo(0.4, 0.4, 0.1), glow(h, 0xff9100), side * x, 0, 0.28);
    }
    // Bomb racks under the belly.
    for (const side of [-1, 1]) {
      part(bank, boxGeo(0.15, 0.2, 3.2), dark, side * 0.5, -0.85, -0.2);
      for (const z of [-1.2, 0, 1.2]) part(bank, boxGeo(0.45, 0.45, 0.9), M(0x37474f), side * 0.5, -1.15, z - 0.2);
    }
    muzzle(-0.5, -0.5, 4.2);
    muzzle(0.5, -0.5, 4.2);
    prop = null;
  } else {
    // Stealth bomber: a black flying wing with a nuke slung underneath.
    const black = M(0x15151c);
    const edge = M(0x2a2a35);
    part(bank, boxGeo(2.6, 0.9, 5.5), black, 0, 0, 0);
    for (const side of [-1, 1]) {
      part(bank, boxGeo(6, 0.3, 3.4), black, side * 3.4, -0.1, -0.5).rotation.y = side * 0.6;
      part(bank, boxGeo(6, 0.12, 0.2), edge, side * 3.8, 0.05, 0.9).rotation.y = side * 0.6;
      for (const z of [-2.6, -3.4]) part(bank, boxGeo(1.4, 0.25, 0.8), black, side * (1.6 + (z === -3.4 ? 1.0 : 0)), -0.05, z).rotation.y = -side * 0.6; // sawtooth trailing edge
      part(bank, boxGeo(0.9, 0.25, 0.2), glow(h, 0xff1744), side * 0.8, 0.1, -2.8); // exhaust slits
    }
    part(bank, boxGeo(1.6, 0.3, 1.4), M(0x37474f), 0, 0.55, 1.6); // dark canopy
    part(bank, boxGeo(0.8, 0.1, 0.3), glow(h, 0xff1744), 0, 0.72, 2.1);
    // The nuke: a fat bomb with fins and a yellow-black band.
    const nuke = new THREE.Group();
    nuke.position.set(0, -1.1, 0);
    bank.add(nuke);
    cylPart(nuke, 0.55, 0.55, 2.4, M(0x546e7a), 0, 0, 0, 12).rotation.x = Math.PI / 2;
    cylPart(nuke, 0.2, 0.55, 0.6, M(0x546e7a), 0, 0, 1.5, 12).rotation.x = Math.PI / 2;
    cylPart(nuke, 0.57, 0.57, 0.35, M(0xffd600), 0, 0, 0.3, 12).rotation.x = Math.PI / 2;
    part(nuke, boxGeo(0.4, 0.4, 0.08), glow(h, 0xffd600), 0, 0, 1.78);
    for (const r of [0, Math.PI / 2]) part(nuke, boxGeo(1.5, 0.08, 0.5), dark, 0, 0, -1.3).rotation.z = r;
    part(bank, boxGeo(0.2, 0.5, 1.0), dark, 0, -0.6, 0); // pylon
    muzzle(-0.9, -0.3, 2.6);
    muzzle(0.9, -0.3, 2.6);
    muzzle(0, -1.1, 0, missiles);
  }
  const bay = new THREE.Object3D();
  bay.position.set(0, -0.9, 0);
  bank.add(bay);
  plane.userData = { bank, prop, bay, missiles };
  return { plane, muzzles };
}

/** Raider: an attack pilot on the runway pad; its plane circles the tower (like the Aviator). */
function raider(level) {
  level = lv(level);
  const jet = level >= 2;
  const stealth = level >= 5;
  const suitC = stealth ? 0x1c1c24 : jet ? 0x4b5a30 : 0x6b7d3a;
  const h = makeHumanoid({ skin: 0xe0ac69, shirt: suitC, pants: suitC, arms: suitC, face: 'soldier' });
  const { M } = h;
  if (jet) {
    part(h.head, boxGeo(1.45, 1.4, 1.45), M(stealth ? 0x263238 : 0x556b2f), 0, 0.65, -0.03);
    part(h.head, boxGeo(1.2, 0.45, 0.08), stealth ? glow(h, 0xff1744) : M(0xffb300), 0, 0.7, 0.7);
    part(h.head, boxGeo(0.4, 0.4, 0.4), M(0x37474f), 0, 0.25, 0.75); // oxygen mask
  } else {
    // Flight cap, goggles up, and a mae west vest.
    const cap = M(0x4e342e);
    part(h.head, boxGeo(1.35, 0.6, 1.35), cap, 0, 1.0, -0.02);
    part(h.head, boxGeo(1.3, 0.12, 0.1), M(0x3e2723), 0, 1.15, 0.66);
    for (const x of [-0.28, 0.28]) part(h.head, boxGeo(0.4, 0.3, 0.08), M(0xa5d6a7), x, 1.15, 0.7);
  }
  part(h.torso, boxGeo(2.1, 1.0, 1.1), M(stealth ? 0x37474f : 0xffb300), 0, 0.3, 0); // life vest
  for (const x of [-0.5, 0.5]) part(h.torso, boxGeo(0.3, 0.3, 0.1), M(0x9e9e9e), x, -0.3, 0.52); // pockets
  if (level >= 1) {
    // A cart of rockets / bombs on the runway, fuller at higher levels.
    part(h.root, boxGeo(1.8, 0.5, 1.1), M(0x455a64), 2.0, 0.25, 0.8);
    const n = level >= 4 ? 3 : 2;
    for (let i = 0; i < n; i++) part(h.root, boxGeo(0.4, 0.4, 1.0), M(level >= 4 ? 0x37474f : 0x9e9e9e), 1.5 + i * 0.5, 0.7, 0.8);
  }
  if (level >= 3) part(h.root, boxGeo(0.2, 1.8, 0.2), M(0xfafafa), -2.0, 0.9, 1.0); // windsock pole
  if (level >= 3) part(h.root, boxGeo(0.4, 0.4, 1.0), M(0xff6d00), -2.0, 1.6, 1.5);
  if (stealth) part(h.torso, boxGeo(0.4, 0.4, 0.06), glow(h, 0xffd600), 0.55, 0.45, 0.58); // radiation patch
  // Signalling the plane in with marshalling batons.
  h.rightArm.rotation.set(Math.PI * 0.85, 0, 0.25);
  part(h.rightArm, boxGeo(0.2, 0.9, 0.2), glow(h, 0xff6d00), 0, -2.3, 0);
  h.pose = { right: Math.PI * 0.85, left: 0, leftRecoil: 0 };
  const { plane, muzzles } = raiderPlane(h, level);
  h.plane = plane;
  h.muzzles = muzzles;
  h.flyHeight = level >= 4 ? 16 : 14;
  h.tracer = stealth ? 0xff1744 : 0xffd54f;
  return h;
}

// ---------------------------------------------------------------- Plunder

/**
 * Plunder: a treasure-digging pirate with a flared blunderbuss, tricorn hat and a shovel on his
 * back. Lv 1 an eyepatch, Lv 2 a treasure sack, Lv 3 a red captain's coat, Lv 4 gold trim.
 */
function plunder(level) {
  level = lv(level, 4);
  const captain = level >= 3;
  const gilded = level >= 4;
  const h = makeHumanoid({
    skin: 0xd2a679,
    shirt: captain ? 0x8e1b1b : 0xeeeeee,
    pants: 0x3e2723,
    arms: captain ? 0x8e1b1b : 0xd2a679,
    face: 'soldier',
  });
  const { M } = h;
  const gold = gilded ? glow(h, 0xffc400) : M(0xc9a227);
  // Striped shirt (deckhand) / captain's coat with tails.
  if (!captain) for (const y of [-0.6, 0, 0.6]) part(h.torso, boxGeo(2.04, 0.2, 1.04), M(0xc62828), 0, y, 0);
  else {
    const coat = M(0x8e1b1b);
    part(h.torso, boxGeo(2.1, 2.6, 0.2), coat, 0, -0.4, -0.58);
    for (const x of [-0.95, 0.95]) part(h.torso, boxGeo(0.22, 2.6, 1.1), coat, x, -0.4, 0);
    part(h.torso, boxGeo(0.6, 1.8, 0.06), M(0xfafafa), 0, 0.05, 0.52); // shirt front
    for (const y of [0.5, 0, -0.5]) for (const x of [-0.45, 0.45]) part(h.torso, boxGeo(0.14, 0.14, 0.08), gold, x, y, 0.53); // buttons
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.1, 0.35, 1.1), gilded ? gold : M(0xfafafa), 0, -1.8, 0); // cuffs
    if (gilded) {
      for (const x of [-0.95, 0.95]) part(h.torso, boxGeo(0.25, 0.25, 1.12), gold, x, 0.9, 0); // epaulettes
      part(h.torso, boxGeo(2.12, 0.12, 0.22), gold, 0, -1.65, -0.58);
    }
  }
  part(h.torso, boxGeo(2.05, 0.3, 1.05), M(0x4e342e), 0, -0.8, 0); // belt
  part(h.torso, boxGeo(0.35, 0.32, 0.1), gold, 0, -0.8, 0.53); // buckle
  // Tricorn hat: a crown and three upturned brims forming a triangle with the point forward.
  const hatM = M(0x1a1a1a);
  part(h.head, boxGeo(1.3, 0.55, 1.3), hatM, 0, 1.45, 0);
  part(h.head, boxGeo(1.9, 0.4, 0.2), hatM, 0, 1.4, -0.7);
  for (const side of [-1, 1]) part(h.head, boxGeo(0.2, 0.4, 1.86), hatM, side * 0.475, 1.4, 0.1).rotation.y = -side * 0.536;
  if (captain) part(h.head, boxGeo(1.92, 0.08, 0.22), gold, 0, 1.6, -0.7); // trim
  if (captain) part(h.head, boxGeo(0.35, 0.35, 0.06), M(0xfafafa), 0, 1.5, 0.66); // skull badge
  if (level >= 1) {
    part(h.head, boxGeo(0.36, 0.32, 0.08), M(0x111111), -0.28, 0.72, 0.64); // eyepatch
    part(h.head, boxGeo(1.25, 0.06, 1.25), M(0x111111), 0, 0.9, 0);
  }
  part(h.head, boxGeo(1.0, 0.35, 0.1), M(0x3e2723), 0, 0.15, 0.62); // beard
  // Shovel strapped across the back.
  const shovel = new THREE.Group();
  shovel.position.set(0, 0.1, -0.65);
  shovel.rotation.z = 0.5;
  h.torso.add(shovel);
  part(shovel, boxGeo(0.15, 2.8, 0.15), M(0x6d4c41), 0, 0, 0);
  part(shovel, boxGeo(0.7, 0.85, 0.08), M(gilded ? 0xffc400 : 0x9e9e9e), 0, -1.75, 0);
  part(shovel, boxGeo(0.5, 0.15, 0.15), M(0x4e342e), 0, 1.45, 0);
  if (level >= 2) {
    // A sack of loot on the hip with coins spilling.
    part(h.torso, boxGeo(0.8, 0.9, 0.7), M(0x8d6e63), 1.15, -1.2, 0.2);
    part(h.torso, boxGeo(0.35, 0.15, 0.35), glow(h, 0xffc400), 1.15, -0.7, 0.2);
  }
  // Blunderbuss: wooden stock, brass barrel and a flared bell muzzle.
  const len = level >= 3 ? 2.0 : 1.7;
  const gun = holdLongGun(h, len, M(0x6d4c41));
  const brass = gilded ? gold : M(0xb8860b);
  part(gun, boxGeo(0.34, len * 0.65, 0.34), brass, 0, -len * 0.62, 0.05);
  const bell = level >= 2 ? 0.8 : 0.65;
  part(gun, boxGeo(bell * 0.7, 0.2, bell * 0.7), brass, 0, -len + 0.05, 0.05);
  part(gun, boxGeo(bell, 0.2, bell), brass, 0, -len - 0.12, 0.05);
  part(gun, boxGeo(bell * 0.6, 0.06, bell * 0.6), M(0x111111), 0, -len - 0.22, 0.05);
  part(gun, boxGeo(0.3, 0.55, 0.45), M(0x4e342e), 0, 0.25, -0.05); // stock
  h.muzzles[0].position.y = -len - 0.25;
  h.recoilScale = 1.6;
  h.tracer = gilded ? 0xffd740 : 0xffab40;
  return h;
}

// ---------------------------------------------------------------- Spectre

/**
 * Spectre: a black-ops soldier with a burst rifle. Lv 1 a quad-rotor drone (out while the ability
 * is on), Lv 2 NVG goggles, Lv 3 a suppressor and plate carrier, Lv 4 a darker suit with a cyan
 * visor and an armed drone, Lv 5 a glowing red visor.
 */
function spectre(level) {
  level = lv(level);
  const dark = level >= 4;
  const suitC = dark ? 0x111316 : 0x263238;
  const h = makeHumanoid({ skin: 0xc68642, shirt: suitC, pants: dark ? 0x0b0c0e : 0x1c2429, arms: suitC, face: 'soldier' });
  const { M } = h;
  const black = M(0x111111);
  const eye = level >= 5 ? 0xff1744 : dark ? 0x00e5ff : 0x76ff03;
  const eyeM = glow(h, eye);
  helmet(h, dark ? 0x1a1a1a : 0x37474f, false);
  part(h.head, boxGeo(1.3, 0.8, 0.12), M(0x212121), 0, 0.4, 0.63); // balaclava
  if (level >= 4) part(h.head, boxGeo(1.3, 0.32, 0.1), eyeM, 0, 0.85, 0.72); // visor
  else if (level >= 2) {
    // Quad-tube night vision goggles.
    part(h.head, boxGeo(1.0, 0.3, 0.2), black, 0, 0.95, 0.7);
    for (const x of [-0.36, -0.12, 0.12, 0.36]) part(h.head, boxGeo(0.18, 0.18, 0.15), eyeM, x, 0.95, 0.85);
  } else part(h.head, boxGeo(1.1, 0.25, 0.08), M(0x37474f), 0, 0.85, 0.66);
  if (level >= 3) {
    // Plate carrier with pouches.
    part(h.torso, boxGeo(2.15, 1.7, 1.2), M(dark ? 0x1c1f24 : 0x37474f), 0, 0.05, 0);
    for (const x of [-0.6, 0, 0.6]) part(h.torso, boxGeo(0.45, 0.5, 0.2), black, x, -0.4, 0.65);
  }
  if (level >= 5) {
    part(h.torso, boxGeo(0.3, 0.3, 0.06), eyeM, -0.6, 0.5, level >= 3 ? 0.62 : 0.52); // IR strobe
    for (const arm of [h.rightArm, h.leftArm]) part(arm, boxGeo(1.05, 0.12, 1.05), eyeM, 0, -0.6, 0);
  }
  // Burst rifle.
  const len = level >= 3 ? 2.4 : 2.0;
  const gun = holdLongGun(h, len, M(0x1c1c1c));
  part(gun, boxGeo(0.28, 0.5, 0.5), M(0x2b2b2b), 0, -0.7, -0.4); // magazine
  part(gun, boxGeo(0.3, 0.55, 0.38), M(0x2b2b2b), 0, 0.25, -0.05); // stock
  part(gun, boxGeo(0.22, 0.6, 0.3), black, 0, -0.9, 0.36); // optic
  if (level >= 1) part(gun, boxGeo(0.1, 0.12, 0.08), eyeM, 0, -1.15, 0.52);
  if (level >= 3) {
    part(gun, boxGeo(0.34, 0.9, 0.34), black, 0, -len - 0.45, 0); // suppressor
    h.muzzles[0].position.y = -len - 0.9;
  }
  if (level >= 1) {
    // Quad-rotor drone (the tower view flies it around while the ability is on).
    const drone = new THREE.Group();
    const s = level >= 4 ? 1.2 : 1;
    part(drone, boxGeo(0.9 * s, 0.35, 0.9 * s), M(dark ? 0x1a1a1a : 0x37474f), 0, 0, 0);
    part(drone, boxGeo(0.3, 0.2, 0.15), eyeM, 0, -0.1, 0.5 * s);
    const rotors = [];
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      part(drone, boxGeo(0.6 * s, 0.1, 0.1), black, x * 0.4 * s, 0.05, z * 0.4 * s).rotation.y = x * z > 0 ? -0.785 : 0.785;
      const r = new THREE.Group();
      r.position.set(x * 0.7 * s, 0.25, z * 0.7 * s);
      part(r, boxGeo(0.85 * s, 0.04, 0.14), M(0x424242), 0, 0, 0);
      drone.add(r);
      rotors.push(r);
    }
    if (level >= 4) part(drone, boxGeo(0.25, 0.25, 0.8), black, 0, -0.35, 0.2); // gun pod
    drone.userData.rotors = rotors;
    drone.visible = false;
    h.root.add(drone);
    h.drone = drone;
  }
  h.tracer = level >= 5 ? 0xff5252 : 0xffe066;
  return h;
}

// ---------------------------------------------------------------- Buccaneer

/**
 * Buccaneer (water): a pirate ship with broadside cannons (muzzles at the cannon mouths) and a mast.
 * Bigger ship and more cannons each level, Lv 3 a crow's nest, Lv 4 a powder barrel on deck,
 * Lv 5 a big dark galleon with gold trim, three masts and lanterns.
 */
function buccaneer(level) {
  level = lv(level);
  const u = makeThing();
  const { M } = u;
  const gal = level >= 5;
  const L = [4.6, 5.2, 5.8, 6.4, 7.0, 8.4][level];
  const W = [2.0, 2.2, 2.4, 2.6, 2.8, 3.3][level];
  const hh = [1.0, 1.1, 1.2, 1.3, 1.4, 1.8][level];
  const wood = M(gal ? 0x2b1d14 : 0x6d4c41);
  const plank = M(gal ? 0x3e2a1c : 0x8d6e63);
  const trim = gal ? glowThing(u, 0xffc400) : M(0xa1887f);
  const iron = M(0x212121);
  const dy = hull(u, L, W, hh, wood, trim, plank);
  // Gunwales.
  for (const side of [-1, 1]) part(u.body, boxGeo(0.15, 0.4, L - 0.4), wood, side * (W / 2 - 0.07), dy + 0.2, -0.3);
  // Raised sterncastle with windows, and a bowsprit.
  const sh = [0.8, 0.9, 1.0, 1.1, 1.2, 1.6][level];
  part(u.body, boxGeo(W, sh, 1.6), wood, 0, dy + sh / 2, -L / 2 + 0.5);
  part(u.body, boxGeo(W + 0.04, 0.12, 1.64), trim, 0, dy + sh, -L / 2 + 0.5);
  for (const x of [-0.5, 0, 0.5]) part(u.body, boxGeo(0.3, 0.3, 0.06), gal ? glowThing(u, 0xffb300) : M(0xffe082), x * W * 0.6, dy + sh * 0.4, -L / 2 - 0.32);
  part(u.body, boxGeo(0.15, 0.15, 1.8), wood, 0, dy + 0.4, L / 2 + 1.0).rotation.x = -0.35;
  if (level >= 2) part(u.body, boxGeo(0.45, 0.5, 0.3), trim, 0, dy - 0.2, L / 2 + 0.35); // figurehead
  // Masts with square sails.
  const sailM = M(gal ? 0x1c1c1c : 0xf5f0e1);
  const mastH = [3.4, 3.8, 4.2, 4.6, 5.0, 6.4][level];
  const masts = gal ? [L * 0.22, -L * 0.05, -L * 0.3] : level >= 3 ? [L * 0.15, -L * 0.2] : [0];
  masts.forEach((z, i) => {
    const mh = mastH * (i === 1 && masts.length === 3 ? 1.1 : i === 0 ? 1 : 0.9);
    part(u.body, boxGeo(0.2, mh, 0.2), wood, 0, dy + mh / 2, z);
    for (const [y, w] of [[0.45, 1.0], [0.8, 0.8]]) {
      part(u.body, boxGeo(W * w + 0.4, 0.12, 0.12), wood, 0, dy + mh * y + mh * 0.18, z);
      const sail = part(u.body, boxGeo(W * w, mh * 0.3, 0.08), sailM, 0, dy + mh * y, z + 0.12);
      sail.rotation.x = -0.12;
    }
    if (gal) part(u.body, boxGeo(0.5, 0.5, 0.1), trim, 0, dy + mh * 0.5, z + 0.2); // gold skull emblem
  });
  // Jolly roger at the top of the main mast.
  const topZ = masts[0];
  const topY = dy + mastH;
  part(u.body, boxGeo(0.05, 0.6, 1.0), M(0x111111), 0, topY - 0.2, topZ - 0.55);
  part(u.body, boxGeo(0.07, 0.22, 0.22), M(0xfafafa), 0, topY - 0.2, topZ - 0.55);
  if (level >= 3) {
    // Crow's nest.
    part(u.body, boxGeo(0.9, 0.4, 0.9), wood, 0, dy + mastH * 0.88, topZ);
    part(u.body, boxGeo(0.94, 0.08, 0.94), trim, 0, dy + mastH * 0.88 + 0.2, topZ);
  }
  if (level >= 4) {
    // Powder barrel(s) on deck.
    for (const [x, z] of gal ? [[0.6, -L * 0.15], [-0.6, -L * 0.18], [0.6, -L * 0.18 - 0.6]] : [[0.5, -L * 0.12]]) {
      cylPart(u.body, 0.32, 0.32, 0.7, M(0x8d6e63), x, dy + 0.35, z);
      for (const y of [0.15, 0.55]) cylPart(u.body, 0.34, 0.34, 0.06, iron, x, dy + y, z);
    }
  }
  if (gal) for (const z of [L / 2 - 0.4, -L / 2 + 1.2]) {
    // Lanterns.
    part(u.body, boxGeo(0.08, 0.6, 0.08), iron, W / 2 - 0.2, dy + sh + 0.3, z);
    part(u.body, boxGeo(0.3, 0.35, 0.3), glowThing(u, 0xffab00), W / 2 - 0.2, dy + sh + 0.7, z);
  }
  // Broadside cannons, poking out of gun ports on both sides.
  const n = [1, 2, 2, 3, 3, 4][level];
  const span = L * 0.6;
  const big = gal ? 1.3 : 1;
  for (let i = 0; i < n; i++) {
    const z = n === 1 ? 0.2 : L * 0.25 - (i / (n - 1)) * span;
    for (const side of [-1, 1]) {
      part(u.body, boxGeo(0.06, 0.5 * big, 0.55 * big), M(0x111111), side * (W / 2 + 0.01), dy - 0.15, z); // gun port
      part(u.body, boxGeo(0.9 * big, 0.28 * big, 0.28 * big), iron, side * (W / 2 + 0.25), dy - 0.15, z);
      part(u.body, boxGeo(0.12, 0.36 * big, 0.36 * big), gal ? trim : iron, side * (W / 2 + 0.7 * big), dy - 0.15, z); // muzzle ring
      gunMuzzle(u, u.body, side * (W / 2 + 0.8 * big), dy - 0.15, z);
    }
  }
  if (level >= 2) {
    // Bow chaser on the forecastle.
    part(u.body, boxGeo(0.5, 0.35, 0.5), wood, 0, dy + 0.18, L / 2 - 0.6);
    part(u.body, boxGeo(0.25, 0.25, 1.0), iron, 0, dy + 0.4, L / 2 - 0.3);
  }
  if (level >= 5) u.body.position.z = -0.4;
  u.tracer = 0xffab40;
  u.projectile = { color: 0x212121, size: gal ? 0.7 : 0.55 };
  u.static = true;
  u.bob = 0.08;
  return u;
}

// ---------------------------------------------------------------- Broadcaster

/**
 * Broadcaster: a lattice radio mast on a transmitter hut, red aviation lights and dishes. Taller
 * with another dish each level, Lv 5 a huge mast with a glowing broadcast beacon.
 */
function broadcaster(level) {
  level = lv(level);
  const u = makeThing();
  const { M } = u;
  const H = [6, 7.5, 9, 10.5, 12, 16][level];
  const steel = M(level >= 5 ? 0xb0bec5 : 0xd32f2f);
  const white = M(0xeceff1);
  const red = glowThing(u, 0xff1744);
  const signal = glowThing(u, level >= 5 ? 0x40c4ff : 0x69f0ae);
  // Transmitter hut.
  part(u.body, boxGeo(3.0, 1.6, 2.4), M(0x90a4ae), 0, 0.8, -0.6);
  part(u.body, boxGeo(3.2, 0.2, 2.6), M(0x546e7a), 0, 1.7, -0.6);
  part(u.body, boxGeo(0.8, 1.2, 0.08), M(0x37474f), -0.7, 0.6, 0.62);
  part(u.body, boxGeo(0.6, 0.2, 0.06), signal, 0.7, 1.1, 0.62); // on-air sign
  // Lattice mast: stacked segments, narrower toward the top, alternating red and white.
  const segs = Math.round(H / 2);
  const sh = H / segs;
  for (let i = 0; i < segs; i++) {
    const w = 1.4 - (i / segs) * 0.9;
    const y = 1.8 + i * sh;
    const m = i % 2 ? white : steel;
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(u.body, boxGeo(0.12, sh, 0.12), m, (x * w) / 2, y + sh / 2, (z * w) / 2 + 0.4);
    for (const side of [-1, 1]) {
      part(u.body, boxGeo(w, 0.08, 0.08), m, 0, y + sh, (side * w) / 2 + 0.4);
      const brace = part(u.body, boxGeo(0.06, Math.hypot(w, sh), 0.06), m, 0, y + sh / 2, (side * w) / 2 + 0.4);
      brace.rotation.z = side * Math.atan2(w, sh);
    }
  }
  const topY = 1.8 + H;
  // Aviation lights: top and every third segment.
  for (let i = 2; i < segs; i += 2) part(u.body, boxGeo(0.25, 0.25, 0.25), red, 0, 1.8 + i * sh, 0.4);
  part(u.body, boxGeo(0.08, 1.4, 0.08), white, 0, topY + 0.7, 0.4); // whip antenna
  const beacon = part(u.body, boxGeo(0.35, 0.35, 0.35), red, 0, topY + 1.5, 0.4);
  // Dishes: one more per level, spiralling up the mast.
  const dishM = M(0xfafafa);
  for (let i = 0; i <= level; i++) {
    const a = i * 2.1;
    const y = 1.8 + H * (0.35 + (0.5 * i) / Math.max(1, level));
    const r = 0.55 + (i % 2) * 0.15 + (level >= 5 ? 0.25 : 0);
    const g = new THREE.Group();
    g.position.set(0, y, 0.4);
    g.rotation.y = a;
    u.body.add(g);
    part(g, boxGeo(0.12, 0.12, 0.7), M(0x616161), 0, 0, 0.5);
    const dish = cylPart(g, r, r * 0.35, 0.3, dishM, 0, 0, 0.95, 12);
    dish.rotation.x = Math.PI / 2;
    part(g, boxGeo(0.08, 0.08, 0.5), M(0x616161), 0, 0, 1.3);
  }
  // Panel antennas from Lv 2.
  if (level >= 2) for (const side of [-1, 1]) part(u.body, boxGeo(0.25, 1.2, 0.5), white, side * 0.55, topY - 1.0, 0.4);
  if (level >= 3) {
    // Guy wires to the ground.
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const len = Math.hypot(H * 0.6, 2.8);
      const wire = part(u.body, boxGeo(0.04, len, 0.04), M(0x424242), x * 1.4, 1.8 + H * 0.3, z * 1.4 + 0.4);
      wire.rotation.set(-z * Math.atan2(2.0, H * 0.6), 0, x * Math.atan2(2.0, H * 0.6));
      part(u.body, boxGeo(0.3, 0.3, 0.3), M(0x616161), x * 2.4, 0.15, z * 2.4 + 0.4);
    }
  }
  if (level >= 4) {
    // Signal rings round the upper mast.
    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0 + i * 0.4, 0.06, 6, 20), signal);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, topY - 0.5 - i * 1.4, 0.4);
      u.body.add(ring);
    }
  }
  if (level >= 5) {
    // Broadcast beacon: a big glowing orb with a halo on top.
    beacon.scale.setScalar(0.6);
    part(u.body, boxGeo(0.9, 0.9, 0.9), signal, 0, topY + 2.4, 0.4).rotation.set(0.785, 0.785, 0);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.08, 6, 24), signal);
    halo.position.set(0, topY + 2.4, 0.4);
    halo.rotation.x = Math.PI / 2;
    u.body.add(halo);
    // A second hut with a generator.
    part(u.body, boxGeo(1.6, 1.2, 1.6), M(0x607d8b), 2.4, 0.6, -0.6);
    part(u.body, boxGeo(0.4, 0.4, 0.06), red, 2.4, 0.8, 0.22);
  }
  const mz = new THREE.Object3D();
  mz.position.set(0, topY + (level >= 5 ? 2.4 : 1.5), 0.4);
  u.body.add(mz);
  u.muzzles.push(mz);
  u.tracer = level >= 5 ? 0x40c4ff : 0x69f0ae;
  return u;
}

// ---------------------------------------------------------------- Stasis

/**
 * Stasis: a freeze-field projector on a pedestal. A crystal core with cyan rings that wobble round
 * it (spinning up when it fires); one more ring each level, Lv 5 a big floating core and a field dome.
 */
function stasis(level) {
  level = lv(level);
  const u = makeThing();
  const { M } = u;
  const cyan = glowThing(u, 0x18ffff);
  const pale = glowThing(u, 0xb2ebf2);
  const metal = M(level >= 4 ? 0x263238 : 0x546e7a);
  const trim = M(0xcfd8dc);
  // Pedestal with glowing vents.
  cylPart(u.body, 1.8, 2.1, 0.6, metal, 0, 0.3, 0, 8);
  cylPart(u.body, 1.3, 1.6, 0.6, trim, 0, 0.9, 0, 8);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    part(u.body, boxGeo(0.4, 0.2, 0.1), cyan, Math.cos(a) * 1.95, 0.35, Math.sin(a) * 1.95).rotation.y = -a + Math.PI / 2;
  }
  // Emitter column and prongs.
  const colH = 1.6 + level * 0.25;
  part(u.body, boxGeo(0.7, colH, 0.7), metal, 0, 1.2 + colH / 2, 0);
  const coreY = 1.2 + colH + (level >= 5 ? 1.6 : 0.9);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const p = part(u.body, boxGeo(0.2, 1.4, 0.2), trim, Math.cos(a) * 0.55, 1.2 + colH + 0.4, Math.sin(a) * 0.55);
    p.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4);
  }
  // Crystal core.
  const cs = level >= 5 ? 1.2 : 0.7 + level * 0.06;
  part(u.body, boxGeo(cs, cs * 1.4, cs), cyan, 0, coreY, 0).rotation.y = 0.785;
  part(u.body, boxGeo(cs * 0.6, cs * 0.6, cs * 0.6), pale, 0, coreY, 0).rotation.set(0.785, 0, 0.785);
  // Rings: each on its own spinner, tilted differently so they gyrate round the core.
  const spin = [];
  const n = level + 1;
  for (let i = 0; i < n; i++) {
    const spinner = new THREE.Group();
    spinner.position.y = coreY;
    spinner.rotation.y = i * 1.1;
    u.body.add(spinner);
    const r = 1.1 + i * 0.32;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.07 + (level >= 5 ? 0.03 : 0), 6, 24), i % 2 ? pale : cyan);
    ring.rotation.x = Math.PI / 2 + (i % 2 ? -1 : 1) * (0.3 + i * 0.12);
    spinner.add(ring);
    // Nodes on the ring so the spin shows.
    for (const s of [-1, 1]) part(ring, boxGeo(0.2, 0.2, 0.2), trim, s * r, 0, 0);
    spin.push(spinner);
  }
  if (level >= 3) {
    // Capacitor towers round the pedestal.
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
      part(u.body, boxGeo(0.4, 1.6, 0.4), metal, Math.cos(a) * 1.5, 1.6, Math.sin(a) * 1.5);
      part(u.body, boxGeo(0.3, 0.3, 0.3), cyan, Math.cos(a) * 1.5, 2.55, Math.sin(a) * 1.5);
    }
  }
  if (level >= 5) {
    // Faint stasis dome.
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3.0, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), u.M(0x84ffff));
    dome.material.transparent = true;
    dome.material.opacity = 0.15;
    dome.material.depthWrite = false;
    dome.material.userData.keepOpacity = 0.15;
    dome.material.userData.glow = 0x006064;
    dome.material.emissive.setHex(0x006064);
    dome.position.y = 1.2;
    u.body.add(dome);
  }
  const mz = new THREE.Object3D();
  mz.position.set(0, coreY, 0);
  u.body.add(mz);
  u.muzzles.push(mz);
  u.spin = spin;
  u.idleSpin = 1.2 + level * 0.2;
  u.tracer = 0x18ffff;
  u.projectile = { color: 0x84ffff, size: 0.6 };
  return u;
}

// ---------------------------------------------------------------- Glow Up

/**
 * Glow Up: speakers, neon bars and a spinning disco orb. Lv 2 a little platform, Lv 3 a neon arch,
 * Lv 4 a stage with truss and spotlights ("Live Show"), Lv 5 the biggest neon stage with a screen.
 */
function glowup(level) {
  level = lv(level);
  const u = makeThing();
  const { M } = u;
  const NEON = [0xff4081, 0x18ffff, 0x76ff03, 0xffea00, 0xe040fb, 0xff6e40];
  const neon = NEON.map((c) => glowThing(u, c));
  const black = M(0x15151c);
  const grey = M(0x424242);
  const stage = level >= 2;
  const SW = [0, 0, 4.2, 4.8, 5.8, 7.0][level]; // stage width
  const SD = [0, 0, 3.0, 3.4, 4.0, 4.8][level];
  const sy = stage ? (level >= 4 ? 0.9 : 0.6) : 0; // stage top
  if (stage) {
    part(u.body, boxGeo(SW, sy, SD), black, 0, sy / 2, 0);
    part(u.body, boxGeo(SW + 0.04, 0.12, 0.06), neon[level % 6], 0, sy - 0.1, SD / 2 + 0.01);
    if (level >= 4) for (let i = 0; i < 5; i++) part(u.body, boxGeo(SW / 6, 0.06, SD / 6), neon[i], -SW / 2 + SW / 6 * (i + 0.75), sy + 0.02, 0); // light-up floor tiles
  }
  // Speaker stacks.
  const spH = [1.6, 1.8, 2.0, 2.4, 2.8, 3.4][level];
  const spX = stage ? SW / 2 - 0.6 : 1.3;
  for (const side of level >= 1 ? [-1, 1] : [-1]) {
    const x = side * spX;
    part(u.body, boxGeo(1.1, spH, 1.0), black, x, sy + spH / 2, 0);
    part(u.body, boxGeo(0.7, 0.7, 0.06), grey, x, sy + spH * 0.65, 0.52);
    part(u.body, boxGeo(0.4, 0.4, 0.07), neon[(side + 2) % 6], x, sy + spH * 0.25, 0.52);
    part(u.body, boxGeo(1.12, 0.08, 1.02), neon[side > 0 ? 4 : 1], x, sy + spH, 0);
  }
  // Neon tube bars: more each level.
  const bars = [1, 2, 3, 4, 5, 6][level];
  for (let i = 0; i < bars; i++) {
    const x = (i - (bars - 1) / 2) * (stage ? SW / (bars + 1) : 0.6);
    const bh = 1.2 + ((i * 7) % 3) * 0.4 + level * 0.15;
    part(u.body, boxGeo(0.14, bh, 0.14), neon[i % 6], x, sy + bh / 2, stage ? -SD / 2 + 0.3 : -0.8);
  }
  // Disco orb on a pole (faceted, spinning).
  const poleH = [2.4, 2.8, 3.2, 3.6, 4.6, 5.6][level];
  const orbS = [0.8, 0.9, 1.0, 1.2, 1.4, 2.0][level];
  const orbX = level === 0 ? 0.3 : 0;
  part(u.body, boxGeo(0.12, poleH - orbS / 2, 0.12), grey, orbX, sy + (poleH - orbS / 2) / 2, 0);
  const orb = new THREE.Group();
  orb.position.set(orbX, sy + poleH, 0);
  u.body.add(orb);
  part(orb, boxGeo(orbS, orbS, orbS), M(0xcfd8dc), 0, 0, 0);
  part(orb, boxGeo(orbS * 0.95, orbS * 0.95, orbS * 0.95), M(0xeceff1), 0, 0, 0).rotation.set(0.785, 0.785, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    part(orb, boxGeo(orbS * 0.18, orbS * 0.18, orbS * 0.18), neon[i % 6], Math.cos(a) * orbS * 0.58, ((i % 3) - 1) * orbS * 0.3, Math.sin(a) * orbS * 0.58);
  }
  if (level >= 3) {
    // Neon arch over the stage.
    const archH = poleH + 0.8;
    for (const side of [-1, 1]) part(u.body, boxGeo(0.18, archH, 0.18), neon[side > 0 ? 0 : 1], side * (SW / 2 - 0.15), sy + archH / 2, -SD / 2 + 0.15);
    part(u.body, boxGeo(SW, 0.18, 0.18), neon[4], 0, sy + archH, -SD / 2 + 0.15);
  }
  if (level >= 4) {
    // Live Show: a truss across the front with angled spotlights.
    const tH = poleH + 1.2;
    for (const side of [-1, 1]) part(u.body, boxGeo(0.25, tH, 0.25), grey, side * (SW / 2 - 0.15), sy + tH / 2, SD / 2 - 0.2);
    part(u.body, boxGeo(SW, 0.25, 0.25), grey, 0, sy + tH, SD / 2 - 0.2);
    const lamps = level >= 5 ? 5 : 3;
    for (let i = 0; i < lamps; i++) {
      const x = (i - (lamps - 1) / 2) * (SW / (lamps + 0.5));
      const lamp = new THREE.Group();
      lamp.position.set(x, sy + tH - 0.35, SD / 2 - 0.2);
      lamp.rotation.x = 0.7;
      lamp.rotation.z = -x * 0.08;
      u.body.add(lamp);
      part(lamp, boxGeo(0.45, 0.45, 0.6), black, 0, 0, 0);
      part(lamp, boxGeo(0.36, 0.36, 0.06), neon[(i + 1) % 6], 0, 0, 0.32);
    }
  }
  if (level >= 5) {
    // The biggest stage: a big screen with a neon pattern and towering pillars.
    part(u.body, boxGeo(SW * 0.6, 2.6, 0.2), black, 0, sy + poleH + 0.2, -SD / 2 - 0.1);
    for (let i = 0; i < 7; i++) {
      const bh = [0.6, 1.3, 2.0, 1.1, 1.7, 0.9, 1.4][i];
      part(u.body, boxGeo(0.35, bh, 0.06), neon[i % 6], (i - 3) * 0.5, sy + poleH - 1.0 + bh / 2, -SD / 2 + 0.02);
    }
    for (const side of [-1, 1]) {
      part(u.body, boxGeo(0.3, poleH + 3, 0.3), neon[side > 0 ? 4 : 1], side * (SW / 2 + 0.4), (sy + poleH + 3) / 2, -SD / 2);
      part(u.body, boxGeo(0.7, 0.7, 0.7), neon[side > 0 ? 3 : 0], side * (SW / 2 + 0.4), sy + poleH + 3, -SD / 2).rotation.y = 0.785;
    }
  }
  const mz = new THREE.Object3D();
  orb.add(mz);
  u.muzzles.push(mz);
  u.spin = [orb];
  u.idleSpin = 1.5;
  u.tracer = 0xff4081;
  return u;
}

// ---------------------------------------------------------------- Units

function pirate(shirt, bandana) {
  const h = makeHumanoid({ skin: 0xd2a679, shirt, pants: 0x3e2723, arms: 0xd2a679, face: 'soldier' });
  for (const y of [-0.6, 0.2]) part(h.torso, boxGeo(2.04, 0.25, 1.04), h.M(0x1a237e), 0, y, 0);
  part(h.torso, boxGeo(2.05, 0.3, 1.05), h.M(0x4e342e), 0, -0.85, 0); // belt
  if (bandana) {
    part(h.head, boxGeo(1.3, 0.45, 1.3), h.M(bandana), 0, 1.15, 0);
    part(h.head, boxGeo(0.3, 0.5, 0.3), h.M(bandana), 0.3, 0.9, -0.75);
  }
  return h;
}

/** Cutlass pirate (melee squad member): red bandana, a curved sword raised to swing. */
function makeCutlassPirate() {
  const h = pirate(0xfafafa, 0xc62828);
  const { M } = h;
  part(h.head, boxGeo(0.36, 0.32, 0.08), M(0x111111), 0.28, 0.72, 0.64); // eyepatch
  const sword = new THREE.Group();
  sword.position.set(0, -1.9, 0);
  h.rightArm.add(sword);
  part(sword, boxGeo(0.5, 0.15, 0.5), M(0xc9a227), 0, 0, 0); // guard
  part(sword, boxGeo(0.12, 1.4, 0.3), M(0xcfd8dc), 0, -0.75, 0.05);
  const tip = part(sword, boxGeo(0.12, 0.6, 0.3), M(0xcfd8dc), 0, -1.65, 0.2);
  tip.rotation.x = 0.4;
  setMuzzle(h, sword, 0, -1.9, 0.3);
  h.rightArm.rotation.set(-2.4, 0, 0.1);
  h.pose = { right: -2.4, left: 0, leftRecoil: 0 };
  h.swing = 2;
  h.melee = true;
  return h;
}

/** Corsair (shooting squad member): tricorn hat and a long musket. */
function makeCorsairPirate() {
  const h = pirate(0x8e1b1b, null);
  const { M } = h;
  const hat = M(0x1a1a1a);
  part(h.head, boxGeo(1.3, 0.5, 1.3), hat, 0, 1.4, 0);
  part(h.head, boxGeo(1.9, 0.38, 0.2), hat, 0, 1.35, -0.7);
  for (const side of [-1, 1]) part(h.head, boxGeo(0.2, 0.38, 1.86), hat, side * 0.475, 1.35, 0.1).rotation.y = -side * 0.536;
  const gun = holdLongGun(h, 2.4, M(0x5d4037));
  part(gun, boxGeo(0.2, 1.6, 0.2), M(0x616161), 0, -1.6, 0.12); // barrel
  part(gun, boxGeo(0.3, 0.6, 0.45), M(0x4e342e), 0, 0.25, -0.05); // stock
  h.muzzles[0].position.z = 0.12;
  return h;
}

/** A squad of pirates, shaped like makeUnit's squads. */
function pirateSquad(make, count, tracer) {
  const u = makeThing();
  u.wheels = [];
  u.soldiers = [];
  for (let i = 0; i < count; i++) {
    const h = make();
    h.root.scale.setScalar(0.6);
    h.root.position.set(count === 1 ? 0 : (i % 2 ? 1 : -1) * 1.1, 0, -Math.floor(i / 2) * 2 + (i % 2) * 0.6);
    u.body.add(h.root);
    u.mats.push(...h.mats);
    u.soldiers.push(h);
    u.muzzles.push(h.muzzles[0]);
  }
  u.height = 3.5;
  u.tracer = tracer;
  return u;
}

const cutlass = (count = 1) => pirateSquad(makeCutlassPirate, count, 0xeceff1);
const corsair = (count = 1) => {
  const u = pirateSquad(makeCorsairPirate, count, 0xffab40);
  u.projectile = { color: 0x424242, size: 0.35 };
  return u;
};

export const TOWER_MODELS_B = { spark, raider, plunder, spectre, buccaneer, broadcaster, stasis, glowup };
export const UNIT_MODELS_B = { cutlass, corsair };
